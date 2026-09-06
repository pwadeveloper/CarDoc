import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import handler from "./api/ask";
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  for (const key of ["GEMINI_API_KEY", "OPENAI_API_KEY", "CARDOC_AI_MODEL"])
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
              await handler(request, res);
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
