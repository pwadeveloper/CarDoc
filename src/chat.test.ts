// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from "vitest";
import {
  newConversation,
  parseConversation,
  message,
  historyForAI,
  loadConversation,
  CHAT_KEY,
  validCitations,
} from "./chat";
import { loadProfile } from "./profile";
beforeEach(() => window.localStorage.clear());
describe("conversation JSON", () => {
  it("round-trips a versioned transcript without losing previous messages", () => {
    const c = newConversation();
    c.messages = [
      message("user", "P0301"),
      message("assistant", "A misfire is a symptom."),
    ];
    window.localStorage.setItem(CHAT_KEY, JSON.stringify(c));
    expect(loadConversation()).toEqual(parseConversation(c));
  });
  it("rejects imported system-role instructions", () => {
    const c = newConversation();
    c.messages = [{ ...message("user", "hello"), role: "system" } as never];
    expect(() => parseConversation(c)).toThrow();
  });
  it("rejects oversized or malformed transcripts", () => {
    expect(() => parseConversation({ schemaVersion: 3 })).toThrow();
    const c = newConversation();
    c.messages = [message("user", "x".repeat(12001))];
    expect(() => parseConversation(c)).toThrow();
  });
  it("bounds API context while retaining the full stored transcript", () => {
    const c = newConversation();
    c.messages = Array.from({ length: 30 }, (_, i) =>
      message(i % 2 ? "assistant" : "user", String(i) + "x".repeat(3000)),
    );
    const h = historyForAI(c.messages);
    expect(h.length).toBeLessThanOrEqual(12);
    expect(h.reduce((n, m) => n + m.content.length, 0)).toBeLessThanOrEqual(
      24000,
    );
    expect(c.messages).toHaveLength(30);
    expect(h.at(-1)?.content).toContain("29");
  });
  it("drops injected external citation links", () =>
    expect(
      validCitations([
        {
          id: "S1",
          manualId: "jp-early",
          page: 250,
          title: "test",
          url: "javascript:alert(1)",
        },
      ]),
    ).toEqual([]));
  it("recovers safely from corrupt saved JSON", () => {
    window.localStorage.setItem(CHAT_KEY, "{bad");
    expect(loadConversation().messages).toEqual([]);
  });
});
describe("owner profile migration", () => {
  it("updates old unknown defaults without losing current mileage", () => {
    window.localStorage.setItem(
      "cardoc-profile",
      JSON.stringify({
        market: "Unconfirmed",
        unit: "Unconfirmed",
        mileage: "171800",
      }),
    );
    const p = loadProfile();
    expect(p.market).toBe("Japan");
    expect(p.unit).toBe("mi");
    expect(p.mileage).toBe("171800");
    expect(p.lastServiceDate).toBe("2026-08-23");
  });
  it("does not overwrite later owner edits", () => {
    const p = { ...loadProfile(), unit: "km" };
    window.localStorage.setItem("cardoc-profile", JSON.stringify(p));
    expect(loadProfile().unit).toBe("km");
  });
});
