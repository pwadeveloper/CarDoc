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
