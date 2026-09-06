import type { ManifestOptions } from "vite-plugin-pwa";

/**
 * The workspace pages, in sidebar order. Shared so the installed app's
 * shortcuts cannot drift from the navigation they point at.
 */
export const PAGES = [
  "Overview",
  "Explore your car",
  "Diagnostics",
  "Owner’s manual",
  "Service journal",
] as const;
export type Page = (typeof PAGES)[number];

/**
 * Resolve the page an app-shortcut launch asked for. Falls back to Overview
 * for a normal launch or an unknown value.
 */
export function pageFromUrl(search: string): Page {
  try {
    const view = new URLSearchParams(search).get("view");
    return PAGES.find((p) => p === view) ?? "Overview";
  } catch {
    return "Overview";
  }
}

function shortcut(page: Page, description: string) {
  return {
    name: page,
    url: `/?view=${encodeURIComponent(page)}`,
    description,
    icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }],
  };
}

export const manifest: Partial<ManifestOptions> = {
  id: "/",
  name: "CarDoc — Your Lexus, understood.",
  short_name: "CarDoc",
  description:
    "An interactive companion for your 2012 Lexus IS 250 RWD. Explore systems, understand scanner codes, and keep a service journal — with or without a signal.",
  start_url: "/",
  scope: "/",
  display: "standalone",
  display_override: ["standalone", "minimal-ui"],
  orientation: "any",
  lang: "en",
  dir: "ltr",
  categories: ["utilities", "productivity"],
  // Matches the <meta name="theme-color"> already in index.html and the --bg
  // token, so the splash screen does not flash a different colour.
  theme_color: "#173e36",
  background_color: "#f6f7f3",
  icons: [
    { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
    { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    {
      src: "/icons/icon-maskable-192.png",
      sizes: "192x192",
      type: "image/png",
      purpose: "maskable",
    },
    {
      src: "/icons/icon-maskable-512.png",
      sizes: "512x512",
      type: "image/png",
      purpose: "maskable",
    },
  ],
  shortcuts: [
    shortcut("Diagnostics", "Look up a scanner code"),
    shortcut("Service journal", "Log or review service history"),
    shortcut("Owner’s manual", "Open the factory manuals"),
  ],
};
