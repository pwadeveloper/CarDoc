import corpus from "./generated/manual-pages.json";
import translation from "../knowledge/translations/jp-early.en.json";
import { createHash } from "node:crypto";
import {
  findTopics,
  manuals,
  topicPage,
  type ManualId,
  type Citation,
} from "../src/manuals";
export function retrievePages(query: string, edition?: string) {
  const topics = findTopics(query);
  const docs = corpus.documents.filter(
    (d) => !edition || edition === "unknown" || d.id === edition,
  );
  const candidates = docs
    .flatMap((doc) =>
      doc.pages.map((p) => {
        const boost = topics.reduce((n, t, i) => {
          const start = topicPage(t, doc.id as ManualId);
          return (
            n +
            (p.page >= start && p.page < start + t.length
              ? (10 - i * 2) / (1 + (p.page - start) * 0.2)
              : 0)
          );
        }, 0);
        const japanese = query.match(/[\u3040-\u30ff\u4e00-\u9fff]{2,}/g) || [];
        const direct = japanese.filter((x) => p.text.includes(x)).length * 4;
        return { doc, p, score: boost + direct };
      }),
    )
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score);
  // Keep both editions visible when build date is unknown. At most six pages enter the prompt.
  const chosen = candidates.slice(0, 6);
  return chosen.map((x, i) => {
    const m = manuals.find((m) => m.id === x.doc.id)!;
    const citation: Citation = {
      id: `S${i + 1}`,
      manualId: m.id as ManualId,
      page: x.p.page,
      title: `${m.code} · ${m.edition} · printed p. ${x.p.page - 4}`,
      url: `${m.url}#page=${x.p.page}`,
    };
    const english =
      x.doc.id === translation.manualId &&
      x.doc.sha256 === translation.sourceSha256
        ? translation.pages.find(
            (p) =>
              p.page === x.p.page &&
              p.complete &&
              p.sourceTextSha256 ===
                createHash("sha256").update(x.p.text).digest("hex"),
          )
        : undefined;
    return {
      citation,
      text: x.p.text.slice(0, 5500),
      ...(english
        ? {
            englishTranslation: {
              text: english.text.slice(0, 5500),
              notes: english.notes,
              status:
                "Unofficial AI translation; unreviewed. Japanese source takes precedence.",
            },
          }
        : {}),
    };
  });
}
