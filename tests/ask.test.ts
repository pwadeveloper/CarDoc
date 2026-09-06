import { describe, it, expect, vi, afterEach } from "vitest";
import handler from "../api/ask";
function response() {
  return { statusCode: 0, setHeader: vi.fn(), end: vi.fn() };
}
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});
describe("optional AI endpoint", () => {
  it("rejects non-POST", async () => {
    const res = response();
    await handler({ method: "GET" } as never, res as never);
    expect(res.statusCode).toBe(405);
  });
  it("returns unavailable without credentials", async () => {
    vi.stubEnv("OPENAI_API_KEY", "");
    const res = response();
    await handler({ method: "POST" } as never, res as never);
    expect(res.statusCode).toBe(503);
  });
  it("rejects oversized inputs", async () => {
    vi.stubEnv("OPENAI_API_KEY", "test");
    vi.stubEnv("CARDOC_AI_MODEL", "test");
    const res = response();
    await handler(
      {
        method: "POST",
        headers: {},
        body: { question: "x".repeat(2001), context: "" },
      } as never,
      res as never,
    );
    expect(res.statusCode).toBe(400);
  });
  it("returns provider response without exposing credentials", async () => {
    vi.stubEnv("OPENAI_API_KEY", "test-secret");
    vi.stubEnv("CARDOC_AI_MODEL", "test");
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue({
          ok: true,
          json: async () => ({
            choices: [{ message: { content: "Check the manual." } }],
          }),
        }),
    );
    const res = response();
    await handler(
      {
        method: "POST",
        headers: {},
        body: { question: "oil?", context: "guide" },
      } as never,
      res as never,
    );
    expect(res.statusCode).toBe(200);
    expect(res.end).toHaveBeenCalledWith(
      JSON.stringify({ answer: "Check the manual." }),
    );
  });
});
