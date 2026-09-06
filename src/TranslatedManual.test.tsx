// @vitest-environment jsdom
import React from "react";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { afterEach, it, expect, vi } from "vitest";
import { TranslatedManual } from "./TranslatedManual";
// Keep a partial-corpus fixture even after the production translation is complete.
vi.mock(
  "../knowledge/translations/jp-early.en.json",
  async (importOriginal) => {
    const module = await importOriginal<{
      default: typeof import("../knowledge/translations/jp-early.en.json");
    }>();
    return {
      default: {
        ...module.default,
        pages: module.default.pages.filter((p) =>
          [238, 239, 240].includes(p.page),
        ),
      },
    };
  },
);
afterEach(cleanup);
it("shows translated text, source link and an honest pending state", async () => {
  render(<TranslatedManual />);
  expect(
    await screen.findByRole("heading", { name: "Positioning a floor jack" }),
  ).toBeTruthy();
  expect(screen.getByText("3 / 336 pages translated")).toBeTruthy();
  expect(
    screen
      .getByRole("link", { name: /Original Japanese/ })
      .getAttribute("href"),
  ).toContain("#page=239");
  fireEvent.change(screen.getByLabelText("English translation page"), {
    target: { value: "1" },
  });
  expect(screen.getByRole("status").textContent).toContain(
    "not been translated",
  );
  expect(
    (screen.getByRole("button", { name: "Previous page" }) as HTMLButtonElement)
      .disabled,
  ).toBe(true);
  fireEvent.change(screen.getByLabelText("Search translated pages"), {
    target: { value: "damper" },
  });
  fireEvent.click(screen.getByRole("button", { name: /Preventing damage/ }));
  expect(
    screen.getByRole("article", { name: "English page translation" })
      .textContent,
  ).toContain("work gloves");
});
