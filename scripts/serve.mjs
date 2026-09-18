// Vorschau: node scripts/serve.mjs  →  http://127.0.0.1:8095
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const types = { ".html": "text/html; charset=utf-8", ".css": "text/css", ".js": "text/javascript", ".png": "image/png", ".jpg": "image/jpeg", ".webp": "image/webp", ".svg": "image/svg+xml", ".xml": "application/xml", ".txt": "text/plain", ".webmanifest": "application/manifest+json" };
const port = Number(process.env.PORT || 8095);

createServer(async (req, res) => {
  let p = decodeURIComponent(new URL(req.url, "http://x").pathname);
  if (p.endsWith("/")) p += "index.html";
  const file = path.join(root, p);
  if (!file.startsWith(root)) { res.writeHead(403).end(); return; }
  try {
    const body = await readFile(file);
    res.writeHead(200, { "Content-Type": types[path.extname(file)] || "application/octet-stream", "Cache-Control": "no-store" }).end(body);
  } catch {
    res.writeHead(404, { "Content-Type": types[".html"] }).end(await readFile(path.join(root, "404.html")));
  }
}).listen(port, "127.0.0.1", () => console.log(`http://127.0.0.1:${port}`));