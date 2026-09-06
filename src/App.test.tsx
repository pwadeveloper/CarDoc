// @vitest-environment jsdom
import React from "react";
import {
  render,
  screen,
  cleanup,
  fireEvent,
  waitFor,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, it, expect, vi } from "vitest";
import { App } from "./main";
import { PENDING_KEY, type Entry } from "./sync";
beforeEach(() => window.localStorage.clear());
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});
describe("owner workflows", () => {
  it("looks up multiple codes and highlights related systems", async () => {
    const u = userEvent.setup();
    render(<App />);
    await u.type(screen.getByLabelText("Scanner code"), "P0301 P0455");
    await u.click(screen.getByLabelText("Look up scanner code"));
    expect(screen.getByText("Cylinder 1 misfire detected")).toBeTruthy();
    expect(screen.getByText("EVAP system · large leak detected")).toBeTruthy();
    expect(document.querySelectorAll(".hotspot.affected")).toHaveLength(3);
    await u.clear(screen.getByLabelText("Diagnostic codes"));
    await u.type(screen.getByLabelText("Diagnostic codes"), "P1999");
    await u.click(screen.getByText("Explain codes"));
    expect(document.querySelectorAll(".hotspot.affected")).toHaveLength(0);
    expect(screen.getByText("Manufacturer or unsupported code")).toBeTruthy();
  });
  it("saves profile and keeps original record unit after a profile change", async () => {
    const u = userEvent.setup();
    render(<App />);
    await u.click(screen.getByText("Vehicle details"));
    await u.selectOptions(screen.getByLabelText("Unit"), "km");
    await u.click(screen.getByText("Save vehicle details"));
    await u.click(screen.getByRole("button", { name: "Service journal" }));
    await u.type(
      screen.getByLabelText("Work performed"),
      "Oil filter replaced",
    );
    fireEvent.change(screen.getByLabelText("Date"), {
      target: { value: "2026-09-06" },
    });
    await u.type(screen.getByLabelText("Odometer (km)"), "171713");
    await u.click(screen.getByText("Save entry"));
    expect(screen.getByText("Oil filter replaced")).toBeTruthy();
    expect(
      JSON.parse(window.localStorage.getItem("cardoc-journal")!)[0].unit,
    ).toBe("km");
    cleanup();
    render(<App />);
    await u.click(screen.getByRole("button", { name: "Service journal" }));
    expect(screen.getByText("Oil filter replaced")).toBeTruthy();
  });
  it("answers questions and falls back when optional AI is unavailable", async () => {
    const u = userEvent.setup();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false }));
    render(<App />);
    await u.click(screen.getByRole("button", { name: "Ask a question" }));
    await u.click(screen.getByText("What does P0301 mean?"));
    expect(
      await screen.findByText(
        /These are possible causes, not confirmed repairs/,
      ),
    ).toBeTruthy();
    await u.click(screen.getByLabelText("Use optional AI connection"));
    await u.type(screen.getByLabelText("Your question"), "tire pressure");
    await u.click(screen.getByLabelText("Send question"));
    await waitFor(() =>
      expect(
        screen.getByText(/optional AI connection is unavailable/),
      ).toBeTruthy(),
    );
    vi.unstubAllGlobals();
  });
  it("searches and expands manual guides", async () => {
    const u = userEvent.setup();
    render(<App />);
    await u.click(screen.getByRole("button", { name: "Owner’s manual" }));
    await u.type(screen.getByLabelText("Search manual"), "tire");
    await u.click(
      screen.getByRole("button", {
        name: "Tire pressure starts at the door label",
      }),
    );
    expect(screen.getByText(/Use the cold tire pressures/)).toBeTruthy();
  });
});
describe("persistent knowledge workflows", () => {
  it("restores chat after remount and sends previous turns with follow-ups", async () => {
    const u = userEvent.setup();
    const mock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ answer: "Follow-up answer", citations: [] }),
    });
    vi.stubGlobal("fetch", mock);
    render(<App />);
    await u.click(screen.getByRole("button", { name: "Ask a question" }));
    await u.click(screen.getByText("What does P0301 mean?"));
    await screen.findByText(/These are possible causes/);
    cleanup();
    render(<App />);
    await u.click(screen.getByRole("button", { name: "Ask a question" }));
    expect(screen.getByText(/These are possible causes/)).toBeTruthy();
    await u.click(screen.getByLabelText("Use optional AI connection"));
    await u.type(
      screen.getByLabelText("Your question"),
      "What should I do about it?",
    );
    await u.click(screen.getByLabelText("Send question"));
    await screen.findByText("Follow-up answer");
    const askCall =
      mock.mock.calls.find((c) => c[0] === "/api/ask") ?? mock.mock.calls[0];
    const payload = JSON.parse(askCall[1].body);
    expect(payload.history).toHaveLength(2);
    expect(payload.history[0].content).toBe("What does P0301 mean?");
    expect(payload.vehicle.unit).toBe("mi");
    vi.unstubAllGlobals();
  });
  it("opens the correct factory diagram page for each edition", async () => {
    const u = userEvent.setup();
    render(<App />);
    await u.click(screen.getByRole("button", { name: "Owner’s manual" }));
    await u.click(screen.getByRole("button", { name: "Fuse boxes p. 246" }));
    expect(document.querySelector("object")?.getAttribute("data")).toContain(
      "is250-jp-early.pdf#page=250",
    );
    await u.selectOptions(screen.getByLabelText("Manual edition"), "jp-late");
    expect(document.querySelector("object")?.getAttribute("data")).toContain(
      "is250-jp-late.pdf#page=253",
    );
  });
  it("adds an approximate service report once without inventing work", async () => {
    const u = userEvent.setup();
    render(<App />);
    await u.click(screen.getByRole("button", { name: "Service journal" }));
    expect(screen.getAllByText("Service — owner reported")).toHaveLength(1);
    expect(
      screen.getByText(
        /Work performed, parts replaced and odometer at service were not specified/,
      ),
    ).toBeTruthy();
    cleanup();
    render(<App />);
    await u.click(screen.getByRole("button", { name: "Service journal" }));
    expect(screen.getAllByText("Service — owner reported")).toHaveLength(1);
  });
});

describe("offline-first behaviour", () => {
  it("tells the owner the app still works when the browser goes offline", async () => {
    render(<App />);
    expect(screen.queryByRole("status")).toBeNull();
    fireEvent(window, new Event("offline"));
    expect((await screen.findByRole("status")).textContent).toMatch(
      /^Offline\./,
    );
    fireEvent(window, new Event("online"));
    await waitFor(() => expect(screen.queryByRole("status")).toBeNull());
  });

  it("pushes a journal written offline as soon as the connection returns", async () => {
    const u = userEvent.setup();
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("offline")));
    render(<App />);
    await u.click(screen.getByRole("button", { name: "Service journal" }));
    await u.type(screen.getByLabelText("Work performed"), "Coolant flush");
    fireEvent.change(screen.getByLabelText("Date"), {
      target: { value: "2026-09-06" },
    });
    await u.click(screen.getByText("Save entry"));
    // The entry is on the device and the badge admits it has not left yet.
    expect(await screen.findByText(/syncs when online/)).toBeTruthy();
    expect(window.localStorage.getItem(PENDING_KEY)).toContain("Coolant flush");

    const online = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ ok: true, updatedAt: "2026-09-06T00:00:00Z" }),
    });
    vi.stubGlobal("fetch", online);
    fireEvent(window, new Event("online"));

    await waitFor(() =>
      expect(window.localStorage.getItem(PENDING_KEY)).toBeNull(),
    );
    const body = JSON.parse(
      online.mock.calls.find((c) => c[0] === "/api/journal")![1].body,
    );
    expect(body.entries.some((e: Entry) => e.title === "Coolant flush")).toBe(
      true,
    );
    expect(await screen.findByText("Vercel Blob synced")).toBeTruthy();
  });
});
