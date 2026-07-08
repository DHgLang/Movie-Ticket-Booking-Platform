import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { mockApiMiddleware } from "./src/server/mockApi.ts";
import { configureTmdbServer } from "./src/server/tmdbServer.ts";

const rootDir = path.dirname(fileURLToPath(import.meta.url));
const monorepoRoot = path.resolve(rootDir, "..");

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, ".", "");
  const tmdbKey = env.TMDB_API_KEY ?? "";

  return {
    resolve: {
      alias: {
        "aws-rum-web": path.resolve(monorepoRoot, "node_modules/aws-rum-web"),
      },
    },
    optimizeDeps: {
      include: ["aws-rum-web"],
    },
    plugins: [
      react(),
      {
        name: "mock-api",
        configureServer(server) {
          configureTmdbServer(tmdbKey);
          server.middlewares.use(mockApiMiddleware());
        },
      },
      {
        name: "tmdb-proxy",
        configureServer(server) {
          server.middlewares.use(async (req, res, next) => {
            if (!req.url?.startsWith("/tmdb/")) return next();
            if (!tmdbKey) {
              res.statusCode = 500;
              res.end(JSON.stringify({ error: "TMDB_API_KEY missing in .env.local" }));
              return;
            }
            const apiPath = req.url.replace(/^\/tmdb/, "");
            const target = new URL(`https://api.themoviedb.org/3${apiPath}`);
            target.searchParams.set("api_key", tmdbKey);
            try {
              const upstream = await fetch(target.toString());
              const body = await upstream.text();
              res.statusCode = upstream.status;
              res.setHeader("Content-Type", "application/json");
              res.end(body);
            } catch (e) {
              res.statusCode = 502;
              res.end(JSON.stringify({ error: String(e) }));
            }
          });
        },
      },
    ],
    server: { port: 5173 },
  };
});
