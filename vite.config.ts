import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import askHandler from "./api/ask";
import journalHandler from "./api/journal";
import { manifest } from "./src/manifest";
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  for (const key of [
    "GEMINI_API_KEY",
    "OPENAI_API_KEY",
    "CARDOC_AI_MODEL",
    "BLOB_READ_WRITE_TOKEN",
    "BLOB_STORE_ID",
  ])
    if (env[key]) process.env[key] = env[key];
  return {
    plugins: [
      react(),
      VitePWA({
        registerType: "autoUpdate",
        // Registration is injected into index.html rather than imported by the
        // app, so the unit tests never have to resolve a virtual module.
        injectRegister: "script-defer",
        manifest,
        // The dev server has no service worker; test offline behaviour against
        // `npm run preview`, which serves the real build.
        devOptions: { enabled: false },
        workbox: {
          // Everything the app shell needs. The manuals are deliberately absent
          // — see the runtime rule below.
          globPatterns: ["**/*.{js,css,html,woff2,png,svg,ico,webmanifest}"],
          globIgnores: ["**/manuals/**"],
          navigateFallback: "/index.html",
          // API calls must reach the network or fail honestly; serving a cached
          // shell for them would hand the app HTML where it expects JSON.
          navigateFallbackDenylist: [/^\/api\//],
          cleanupOutdatedCaches: true,
          clientsClaim: true,
          skipWaiting: true,
          runtimeCaching: [
            {
              // The factory PDFs are ~5 MB each, so they are cached only once
              // actually opened rather than forced onto every install.
              urlPattern: ({ url }) => url.pathname.startsWith("/manuals/"),
              handler: "CacheFirst",
              options: {
                cacheName: "cardoc-manuals",
                expiration: {
                  maxEntries: 4,
                  maxAgeSeconds: 60 * 60 * 24 * 365,
                },
                cacheableResponse: { statuses: [0, 200] },
                rangeRequests: true,
              },
            },
            {
              urlPattern: ({ url }) =>
                url.origin === "https://fonts.googleapis.com",
              handler: "StaleWhileRevalidate",
              options: { cacheName: "cardoc-font-css" },
            },
            {
              urlPattern: ({ url }) =>
                url.origin === "https://fonts.gstatic.com",
              handler: "CacheFirst",
              options: {
                cacheName: "cardoc-fonts",
                expiration: {
                  maxEntries: 24,
                  maxAgeSeconds: 60 * 60 * 24 * 365,
                },
                cacheableResponse: { statuses: [0, 200] },
              },
            },
          ],
        },
      }),
      {
        name: "cardoc-local-api",
        configureServer(server) {
          server.middlewares.use("/api/ask", async (req, res) => {
            let body = "";
            try {
              for await (const chunk of req) {
                body += chunk;
                if (Buffer.byteLength(body) > 60000) {
                  res.statusCode = 413;
                  res.end("Request too large");
                  return;
                }
              }
              const request = Object.assign(req, {
                body: body ? JSON.parse(body) : undefined,
              });
              await askHandler(request, res);
            } catch {
              res.statusCode = 400;
              res.end("Invalid request");
            }
          });

          server.middlewares.use("/api/journal", async (req, res) => {
            let body = "";
            try {
              for await (const chunk of req) {
                body += chunk;
                if (Buffer.byteLength(body) > 500000) {
                  res.statusCode = 413;
                  res.end("Request too large");
                  return;
                }
              }
              const request = Object.assign(req, {
                body: body ? JSON.parse(body) : undefined,
              });
              await journalHandler(request, res);
            } catch {
              res.statusCode = 400;
              res.end("Invalid request");
            }
          });
        },
      },
    ],
  };
});
