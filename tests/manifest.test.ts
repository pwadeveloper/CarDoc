import { describe, it, expect } from "vitest";
import { manifest, pageFromUrl, PAGES } from "../src/manifest";

describe("web app manifest", () => {
  it("carries the fields a browser requires before offering installation", () => {
    expect(manifest.name).toBeTruthy();
    expect(manifest.short_name).toBeTruthy();
    expect(manifest.start_url).toBe("/");
    expect(manifest.display).toBe("standalone");
    expect(manifest.theme_color).toMatch(/^#[0-9a-f]{6}$/i);
    expect(manifest.background_color).toMatch(/^#[0-9a-f]{6}$/i);
  });

  it("ships both an any-purpose and a maskable icon at 192 and 512", () => {
    const icons = manifest.icons ?? [];
    for (const size of ["192x192", "512x512"]) {
      expect(icons.some((i) => i.sizes === size && !i.purpose)).toBe(true);
      expect(
        icons.some((i) => i.sizes === size && i.purpose === "maskable"),
      ).toBe(true);
    }
  });

  it("keeps the theme colour in step with the document meta tag", async () => {
    const html = await import("node:fs/promises").then((fs) =>
      fs.readFile(new URL("../index.html", import.meta.url), "utf8"),
    );
    expect(html).toContain(`content="${manifest.theme_color}"`);
  });

  // A shortcut naming a page the sidebar does not render would open the app on
  // Overview with no explanation.
  it("points every shortcut at a real workspace page", () => {
    for (const shortcut of manifest.shortcuts ?? []) {
      const view = new URL(
        shortcut.url,
        "https://cardoc.test",
      ).searchParams.get("view");
      expect(PAGES).toContain(view);
      expect(pageFromUrl(`?view=${encodeURIComponent(view!)}`)).toBe(view);
    }
  });
});

describe("pageFromUrl", () => {
  it("opens the requested page on a shortcut launch", () => {
    expect(pageFromUrl("?view=Diagnostics")).toBe("Diagnostics");
    expect(pageFromUrl("?view=Service%20journal")).toBe("Service journal");
  });

  it("falls back to Overview for a plain, unknown or hostile launch", () => {
    expect(pageFromUrl("")).toBe("Overview");
    expect(pageFromUrl("?view=Nonexistent")).toBe("Overview");
    expect(pageFromUrl("?view=__proto__")).toBe("Overview");
    expect(pageFromUrl("?other=1")).toBe("Overview");
  });
});
