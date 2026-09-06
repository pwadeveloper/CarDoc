// Download original Lexus PDFs and build a server-only page index. Never guess font encodings.
import fs from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";
const root = path.resolve(import.meta.dirname, "..");
const manuals = JSON.parse(
  await fs.readFile(path.join(root, "knowledge/manuals.json"), "utf8"),
);
const output = path.join(root, "server/generated/manual-pages.json");
await fs.mkdir(path.dirname(output), { recursive: true });
await fs.mkdir(path.join(root, "public/manuals"), { recursive: true });
let old;
try {
  old = JSON.parse(await fs.readFile(output, "utf8"));
} catch {}
const documents = [];
for (const manual of manuals) {
  const file = path.join(root, "public/manuals", manual.file);
  let bytes;
  try {
    bytes = await fs.readFile(file);
  } catch {
    try {
      bytes = await fs.readFile(
        path.join(root, "knowledge/sources", manual.file),
      );
    } catch {
      const response = await fetch(manual.url, {
        signal: AbortSignal.timeout(60000),
      });
      if (!response.ok)
        throw new Error(`Manual download failed: ${response.status}`);
      bytes = Buffer.from(await response.arrayBuffer());
      if (bytes.subarray(0, 5).toString() !== "%PDF-")
        throw new Error("Expected PDF");
    }
    await fs.writeFile(file, bytes);
  }
  const sha256 = createHash("sha256").update(bytes).digest("hex");
  if (sha256 !== manual.sha256)
    throw new Error(
      `Source PDF changed: ${manual.id}. Verify the new edition before updating its hash.`,
    );
  const cached = old?.documents?.find(
    (d) =>
      d.id === manual.id &&
      d.sha256 === sha256 &&
      d.pages.length === manual.pages,
  );
  if (cached) {
    documents.push(cached);
    continue;
  }
  const task = getDocument({
    data: new Uint8Array(bytes),
    cMapUrl: path.join(root, "node_modules/pdfjs-dist/cmaps/"),
    cMapPacked: true,
    standardFontDataUrl: path.join(
      root,
      "node_modules/pdfjs-dist/standard_fonts/",
    ),
  });
  const pdf = await task.promise;
  if (pdf.numPages !== manual.pages)
    throw new Error(`Unexpected page count for ${manual.id}`);
  const pages = [];
  for (let page = 1; page <= pdf.numPages; page++) {
    const content = await (await pdf.getPage(page)).getTextContent();
    pages.push({
      page,
      text: content.items
        .map((i) => ("str" in i ? i.str : ""))
        .join(" ")
        .replace(/\s+/g, " ")
        .trim(),
    });
  }
  if (
    !pages.some((p) => p.text.includes("ヒューズ")) ||
    !pages.some((p) => p.text.includes("エンジン"))
  )
    throw new Error("Japanese extraction failed; check PDF CMaps");
  documents.push({ ...manual, sha256, pages });
  await task.destroy();
  console.log(`Indexed ${manual.code}: ${pages.length} pages`);
}
await fs.writeFile(output, JSON.stringify({ schemaVersion: 1, documents }));
console.log("Official manuals ready. Full text stays in the server index.");
