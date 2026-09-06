import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import askHandler from "./api/ask";
import journalHandler from "./api/journal";
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
