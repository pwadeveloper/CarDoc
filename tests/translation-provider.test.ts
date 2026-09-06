import { describe, it, expect, vi } from "vitest";
import {
  translationConfig,
  translatePage,
  parseGeminiCompletion,
} from "../scripts/translation-provider.mjs";
const page = { page: 239, text: "ガレージジャッキ" };
const image = "data:image/png;base64,dGVzdA==";
const translated = {
  title: "Floor jack",
  text: "Use the correct lifting point.",
  notes: [],
  complete: true,
};
describe("translation provider compatibility", () => {
  it("prefers Gemini like chat and permits a separate explicit OpenAI model", () => {
    const env = {
      GEMINI_API_KEY: "gemini-test",
      OPENAI_API_KEY: "openai-test",
      CARDOC_AI_MODEL: "gemini-3.8-flash",
    };
    expect(translationConfig(env).provider).toBe("gemini");
    expect(
      translationConfig({
        ...env,
        CARDOC_TRANSLATION_PROVIDER: "openai",
        CARDOC_TRANSLATION_MODEL: "gpt-test",
      }).model,
    ).toBe("gpt-test");
    expect(() =>
      translationConfig({ ...env, CARDOC_TRANSLATION_PROVIDER: "openai" }),
    ).toThrow(/different provider/);
    expect(() => translationConfig({})).toThrow(/No API call/);
  });
  it("sends Gemini images and schema, preserving multipart output and provenance", async () => {
    const text = JSON.stringify(translated);
    const mock = vi
      .fn()
      .mockResolvedValue({
        ok: true,
        json: async () => ({
          candidates: [
            {
              finishReason: "STOP",
              content: {
                parts: [
                  { thought: true, text: "internal" },
                  { text: text.slice(0, 25) },
                  { text: text.slice(25) },
                ],
              },
            },
          ],
          usageMetadata: { totalTokenCount: 42 },
        }),
      });
    const result = await translatePage(
      translationConfig({
        GEMINI_API_KEY: "secret",
        CARDOC_AI_MODEL: "gemini-3.8-flash",
      }),
      page,
      image,
      mock,
    );
    expect(result.translation).toEqual(translated);
    expect(result.usage.totalTokenCount).toBe(42);
    const [url, request] = mock.mock.calls[0];
    expect(url).toContain("gemini-3.8-flash:generateContent");
    expect(url).not.toContain("secret");
    expect(request.headers["x-goog-api-key"]).toBe("secret");
    const payload = JSON.parse(request.body);
    expect(payload.contents[0].parts[1].inlineData.data).toBe("dGVzdA==");
    expect(payload.generationConfig.responseJsonSchema.required).toContain(
      "complete",
    );
    expect(payload.tools).toBeUndefined();
  });
  it("rejects Gemini truncation, blocked output and incomplete translations", () => {
    for (const finishReason of ["MAX_TOKENS", "SAFETY"])
      expect(() =>
        parseGeminiCompletion({ candidates: [{ finishReason }] }),
      ).toThrow();
    expect(() =>
      parseGeminiCompletion({ promptFeedback: { blockReason: "SAFETY" } }),
    ).toThrow();
    expect(() =>
      parseGeminiCompletion({
        candidates: [
          {
            finishReason: "STOP",
            content: {
              parts: [
                { text: JSON.stringify({ ...translated, complete: false }) },
              ],
            },
          },
        ],
      }),
    ).toThrow();
  });
  it("retains OpenAI translation support", async () => {
    const mock = vi
      .fn()
      .mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [
            {
              finish_reason: "stop",
              message: { content: JSON.stringify(translated) },
            },
          ],
        }),
      });
    expect(
      (
        await translatePage(
          translationConfig({
            OPENAI_API_KEY: "secret",
            CARDOC_AI_MODEL: "gpt-test",
          }),
          page,
          image,
          mock,
        )
      ).translation,
    ).toEqual(translated);
    expect(mock.mock.calls[0][0]).toBe(
      "https://api.openai.com/v1/chat/completions",
    );
  });
  it("stops on quota failure instead of silently switching providers", async () => {
    const mock = vi.fn().mockResolvedValue({ ok: false, status: 429 });
    await expect(
      translatePage(
        translationConfig({ GEMINI_API_KEY: "secret" }),
        page,
        image,
        mock,
      ),
    ).rejects.toThrow("HTTP 429");
    expect(mock).toHaveBeenCalledTimes(1);
  });
});
