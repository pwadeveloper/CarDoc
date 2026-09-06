// Explicit offline preparation task: never runs automatically during build or chat.
import fs from "node:fs/promises";
import path from "node:path";
import { loadEnv } from "vite";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";
import { createCanvas } from "@napi-rs/canvas";
import {
  digest,
  validCachedPage,
  buildRequest,
  parseCompletion,
} from "./translation-core.mjs";
const root = path.resolve(import.meta.dirname, "..");
const manifest = JSON.parse(
  await fs.readFile(path.join(root, "knowledge/manuals.json"), "utf8"),
)[0];
const bytes = await fs.readFile(
  path.join(root, "knowledge/sources/is250-jp-early.pdf"),
);
if (digest(bytes) !== manifest.sha256)
  throw new Error("Uploaded PDF hash does not match the selected edition.");
const corpus = JSON.parse(
  await fs.readFile(
    path.join(root, "server/generated/manual-pages.json"),
    "utf8",
  ),
);
const source = corpus.documents.find(
  (d) => d.id === manifest.id && d.sha256 === manifest.sha256,
);
if (!source || source.pages.length !== manifest.pages)
  throw new Error("Run npm run prebuild to prepare the source index.");
const output = path.join(root, "knowledge/translations/jp-early.en.json");
const document = JSON.parse(await fs.readFile(output, "utf8"));
if (document.sourceSha256 !== manifest.sha256)
  throw new Error("Translation source mismatch.");
const remaining = source.pages.filter(
  (p) =>
    !validCachedPage(
      document.pages.find((t) => t.page === p.page),
      p,
    ),
);
console.log(
  `${manifest.code}: ${manifest.pages - remaining.length}/${manifest.pages} translated; ${remaining.length} remaining.`,
);
if (process.argv.includes("--check") || !remaining.length) process.exit(0);
const env = { ...loadEnv("development", root, ""), ...process.env };
const model = env.CARDOC_TRANSLATION_MODEL || env.CARDOC_AI_MODEL;
if (!env.OPENAI_API_KEY || !model)
  throw new Error(
    "Configure OPENAI_API_KEY and CARDOC_TRANSLATION_MODEL (or CARDOC_AI_MODEL) in .env. No API call made.",
  );
const limitIndex = process.argv.indexOf("--limit");
const limit =
  limitIndex < 0 ? remaining.length : Number(process.argv[limitIndex + 1]);
if (!Number.isInteger(limit) || limit < 1)
  throw new Error("--limit must be a positive integer.");
// Prevent concurrent writers from losing completed pages.
const lockPath = output + ".lock";
const lock = await fs.open(lockPath, "wx");
let task;
try {
  task = getDocument({
    data: new Uint8Array(bytes),
    cMapUrl: path.join(root, "node_modules/pdfjs-dist/cmaps/"),
    cMapPacked: true,
    standardFontDataUrl: path.join(
      root,
      "node_modules/pdfjs-dist/standard_fonts/",
    ),
  });
  const pdf = await task.promise;
  if (pdf.numPages !== manifest.pages)
    throw new Error("Unexpected PDF page count.");
  for (const page of remaining.slice(0, limit)) {
    const pdfPage = await pdf.getPage(page.page);
    const viewport = pdfPage.getViewport({ scale: 2 });
    const canvas = createCanvas(viewport.width, viewport.height);
    await pdfPage.render({ canvasContext: canvas.getContext("2d"), viewport })
      .promise;
    const imageUrl =
      "data:image/png;base64," +
      canvas.toBuffer("image/png").toString("base64");
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      signal: AbortSignal.timeout(180000),
      headers: {
        Authorization: `Bearer ${env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(buildRequest(model, page, imageUrl)),
    });
    if (!response.ok)
      throw new Error(
        `OpenAI returned HTTP ${response.status}; completed pages are saved. Re-run to resume.`,
      );
    const data = await response.json();
    const translation = parseCompletion(data);
    const entry = {
      page: page.page,
      sourceTextSha256: digest(page.text),
      ...translation,
      method: "openai",
      model,
      translatedAt: new Date().toISOString(),
      reviewStatus: "unreviewed",
      usage: data.usage || null,
    };
    document.pages = [
      ...document.pages.filter((p) => p.page !== page.page),
      entry,
    ].sort((a, b) => a.page - b.page);
    await fs.writeFile(
      output + ".tmp",
      JSON.stringify(document, null, 2) + "\n",
    );
    await fs.rename(output + ".tmp", output);
    console.log(
      `Saved PDF page ${page.page}; ${document.pages.length}/${manifest.pages}.`,
    );
    pdfPage.cleanup();
  }
} finally {
  await task?.destroy();
  await lock.close();
  await fs.unlink(lockPath);
}
