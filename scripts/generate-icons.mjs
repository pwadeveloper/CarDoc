// Render the CarDoc mark to the PNG sizes an installed app needs. Re-run with
// `npm run icons` after changing the palette; the output is committed.
import fs from "node:fs/promises";
import path from "node:path";
import { createCanvas, Path2D } from "@napi-rs/canvas";
const root = path.resolve(import.meta.dirname, "..");
const output = path.join(root, "public/icons");
// The lucide "Activity" pulse, on the same 24x24 grid the sidebar brand uses.
const PULSE =
  "M22 12h-2.48a2 2 0 0 0-1.93 1.46l-2.35 8.36a.25.25 0 0 1-.48 0L9.24 2.18a.25.25 0 0 0-.48 0l-2.35 8.36A2 2 0 0 1 4.49 12H2";
const GREEN_900 = "#1a3a2e";
const GREEN_600 = "#2e5038";
const LIME = "#b9d36a";

// `inset` is the share of the canvas left empty around the mark. Maskable
// icons need a wide margin because launchers crop to a circle.
function render(size, { maskable = false } = {}) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext("2d");
  const gradient = ctx.createLinearGradient(0, 0, size, size);
  gradient.addColorStop(0, GREEN_900);
  gradient.addColorStop(1, GREEN_600);
  ctx.fillStyle = gradient;
  if (maskable) {
    ctx.fillRect(0, 0, size, size);
  } else {
    ctx.beginPath();
    ctx.roundRect(0, 0, size, size, size * 0.22);
    ctx.fill();
  }
  // Scale the 24-unit grid into the safe area and centre it.
  const inset = maskable ? 0.3 : 0.2;
  const scale = (size * (1 - inset * 2)) / 24;
  ctx.save();
  ctx.translate(size * inset, size * inset);
  ctx.scale(scale, scale);
  ctx.strokeStyle = LIME;
  ctx.lineWidth = 2.1;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.stroke(new Path2D(PULSE));
  ctx.restore();
  return canvas.encode("png");
}

await fs.mkdir(output, { recursive: true });
const targets = [
  ["icon-192.png", 192, {}],
  ["icon-512.png", 512, {}],
  ["icon-maskable-192.png", 192, { maskable: true }],
  ["icon-maskable-512.png", 512, { maskable: true }],
  // iOS ignores the manifest icons and crops its own corners, so this one is
  // square-edged and fully opaque.
  ["apple-touch-icon.png", 180, { maskable: true }],
  ["favicon-32.png", 32, {}],
];
for (const [file, size, options] of targets) {
  await fs.writeFile(path.join(output, file), await render(size, options));
}
console.log(`Wrote ${targets.length} icons to public/icons.`);
