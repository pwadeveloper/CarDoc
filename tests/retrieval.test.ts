import { describe, it, expect } from "vitest";
import { retrievePages } from "../server/retrieval";
import { manualTopics, manuals, topicPage, findTopics } from "../src/manuals";
import corpus from "../server/generated/manual-pages.json";
describe("official manual retrieval", () => {
  it("indexes both complete PDFs with readable Japanese", () => {
    expect(corpus.documents.map((d) => d.pages.length)).toEqual([336, 340]);
    for (const d of corpus.documents)
      expect(d.pages.some((p) => p.text.includes("ヒューズ"))).toBe(true);
  });
  it("retrieves fuse pages from both editions with correct page offsets", () => {
    const pages = retrievePages("Where are the fuse boxes?");
    expect(new Set(pages.map((p) => p.citation.manualId)).size).toBe(2);
    expect(
      pages.some(
        (p) =>
          p.citation.page === 250 &&
          p.citation.manualId === "jp-early" &&
          p.text.includes("ヒューズ"),
      ),
    ).toBe(true);
    expect(
      pages.some(
        (p) => p.citation.page === 253 && p.citation.manualId === "jp-late",
      ),
    ).toBe(true);
  });
  it("respects a selected production edition", () =>
    expect(
      retrievePages("oil capacity", "jp-late").every(
        (p) => p.citation.manualId === "jp-late",
      ),
    ).toBe(true));
  it("does not retrieve arbitrary pages for unsupported questions", () =>
    expect(retrievePages("quantum entanglement")).toEqual([]));
  it("keeps every topic within its source document", () => {
    for (const t of manualTopics)
      for (const m of manuals)
        expect(
          topicPage(t, m.id as "jp-early" | "jp-late") + t.length - 1,
        ).toBeLessThanOrEqual(m.pages);
  });
  it("ranks tire pressure and hood questions correctly", () => {
    expect(findTopics("What tire pressure?")[0].id).toBe("tires");
    expect(findTopics("Where is the hood release?")[0].id).toBe("hood");
  });
});
