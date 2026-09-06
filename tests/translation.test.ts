import { describe, expect, it } from "vitest";
import {
  digest,
  parseCompletion,
  validCachedPage,
  buildRequest,
} from "../scripts/translation-core.mjs";
import { retrievePages } from "../server/retrieval";
const translated = {
  title: "Test",
  text: "A complete translation.",
  notes: [],
  complete: true,
};
describe("manual translation integrity", () => {
  it("rejects truncated, refused and incomplete responses", () => {
    expect(() =>
      parseCompletion({
        choices: [
          {
            finish_reason: "length",
            message: { content: JSON.stringify(translated) },
          },
        ],
      }),
    ).toThrow();
    expect(() =>
      parseCompletion({
        choices: [{ finish_reason: "stop", message: { refusal: "refused" } }],
      }),
    ).toThrow();
    expect(() =>
      parseCompletion({
        choices: [
          {
            finish_reason: "stop",
            message: {
              content: JSON.stringify({ ...translated, complete: false }),
            },
          },
        ],
      }),
    ).toThrow();
    expect(
      parseCompletion({
        choices: [
          {
            finish_reason: "stop",
            message: { content: JSON.stringify(translated) },
          },
        ],
      }),
    ).toEqual(translated);
  });
  it("invalidates a checkpoint when the source page changes", () => {
    const source = { page: 1, text: "source" };
    const cached = {
      ...translated,
      page: 1,
      sourceTextSha256: digest("source"),
    };
    expect(validCachedPage(cached, source)).toBe(true);
    expect(validCachedPage(cached, { ...source, text: "changed" })).toBe(false);
    expect(validCachedPage(cached, { ...source, page: 2 })).toBe(false);
  });
  it("sends both the rendered page and extracted text with a strict schema", () => {
    const request = buildRequest(
      "configured-model",
      { page: 239, text: "Japanese page" },
      "data:image/png;base64,test",
    );
    expect(request.model).toBe("configured-model");
    expect(request.response_format.json_schema.strict).toBe(true);
    expect(request.messages[1].content[1].image_url.detail).toBe("high");
    expect(request.messages[1].content[0].text).toContain("239");
  });
  it("attaches English only to the matching early-edition source page", () => {
    const early = retrievePages("jacking", "jp-early");
    expect(
      early.some((p) => p.englishTranslation?.text.includes("FLOOR JACK")),
    ).toBe(true);
    expect(
      retrievePages("jacking", "jp-late").every((p) => !p.englishTranslation),
    ).toBe(true);
  });
});
