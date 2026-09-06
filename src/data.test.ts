import { describe, it, expect } from "vitest";
import { extractCodes, answerQuestion, diagnostics, parts } from "./data";
describe("diagnostic integrity", () => {
  it("extracts mixed case codes without duplicates or partial matches", () =>
    expect(extractCodes("p0301, P0171 P0301 XP0420 P03012")).toEqual([
      "P0301",
      "P0171",
    ]));
  it("never recommends a component for an unsupported code", () => {
    expect(answerQuestion("P1999")).toContain(
      "No component has been identified",
    );
    expect(answerQuestion("P1999")).not.toContain("replace");
  });
  it("maps each supported code to valid systems", () => {
    expect(new Set(diagnostics.map((d) => d.code)).size).toBe(
      diagnostics.length,
    );
    for (const d of diagnostics)
      for (const p of d.parts) expect(parts.some((x) => x.id === p)).toBe(true);
  });
  it("prioritizes misfire stop guidance and avoids confirmed repairs", () => {
    const a = answerQuestion("What does P0301 mean?");
    expect(a).toContain("stop safely");
    expect(a).toContain("not confirmed repairs");
  });
  it("provides a bounded fallback for unknown questions", () =>
    expect(answerQuestion("quantum entanglement")).toContain(
      "don’t have a reliable",
    ));
  it("retrieves tire guidance without inventing a pressure", () => {
    const a = answerQuestion("What tire pressure?");
    expect(a).toContain("tire-information label");
    expect(a).not.toMatch(/\d+ psi/i);
  });
});
