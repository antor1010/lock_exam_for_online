import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { createRequire } from "module";

// npm run dev চালালেও /api/api কাজ করার জন্য লোকাল API সার্ভার
function localApi(env) {
  return {
    name: "local-api",
    configureServer(server) {
      Object.assign(process.env, env);
      const require = createRequire(import.meta.url);
      server.middlewares.use("/api/api", async (req, res) => {
        let raw = "";
        for await (const c of req) raw += c;
        const url = new URL(req.url, "http://localhost");
        req.query = Object.fromEntries(url.searchParams);
        try { req.body = raw ? JSON.parse(raw) : {}; } catch (e) { req.body = {}; }
        res.status = (c) => { res.statusCode = c; return res; };
        res.json = (o) => { res.setHeader("Content-Type", "application/json"); res.end(JSON.stringify(o)); };
        delete require.cache[require.resolve("./api/api.js")];
        await require("./api/api.js")(req, res);
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  return { plugins: [react(), localApi(env)] };
});
