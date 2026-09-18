// Prüft die Seite vor dem Livegang: lokale Verweise, Anker, Alt-Texte, verbotene Inhalte.
// Aufruf: node scripts/check.mjs
import { readFile, access } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const problems = [];
const pages = ["index.html", "404.html"];

for (const page of pages) {
  const html = await readFile(path.join(root, page), "utf8");
  const visible = html.replace(/<!--[\s\S]*?-->/g, "");

  const refs = [...visible.matchAll(/(?:src|href)="([^"#][^"]*)"/g)].map((m) => m[1]);
  refs.push(...[...visible.matchAll(/data-src="([^"]+)"/g)].map((m) => m[1]));
  const srcsets = [...visible.matchAll(/(?:srcset|imagesrcset)="([^"]+)"/g)].flatMap((m) => m[1].split(",").map((s) => s.trim().split(/\s+/)[0]));
  for (const ref of new Set([...refs, ...srcsets])) {
    if (/^(https?:|mailto:|tel:|data:)/.test(ref)) continue;
    try { await access(path.join(root, ref.replace(/^\//, "").split("?")[0])); } catch { problems.push(`${page}: fehlt → ${ref}`); }
  }

  const ids = new Set([...visible.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]));
  for (const m of visible.matchAll(/href="#([^"]+)"/g)) if (!ids.has(m[1])) problems.push(`${page}: Anker ohne Ziel → #${m[1]}`);

  for (const m of visible.matchAll(/<img\b[^>]*>/g)) {
    if (!/\salt="/.test(m[0])) problems.push(`${page}: Bild ohne alt → ${m[0].slice(0, 80)}`);
    if (!/\swidth="/.test(m[0]) || !/\sheight="/.test(m[0])) problems.push(`${page}: Bild ohne Maße → ${m[0].slice(0, 80)}`);
  }
  for (const m of visible.matchAll(/<a\b[^>]*target="_blank"[^>]*>/g)) if (!/rel="[^"]*noopener/.test(m[0])) problems.push(`${page}: target=_blank ohne noopener`);

  const banned = [/gmail\.com/i, /USD\s*\/?\s*ha/i, /\b39\s*USD/i, /cero\s+da[ñn]o/i, /20\s+d[ií]as/i, /piloto\s+licenciado/i, /font-?awesome/i, /unsplash/i, /lorem/i];
  for (const re of banned) if (re.test(html)) problems.push(`${page}: unerwünschter Inhalt → ${re}`);

  if (page === "index.html") {
    for (const must of ["stanley@kunzagrotech.com", "https://wa.me/59892800358", "https://instagram.com/kunzagrotech", "https://kunzglobal.com/", "https://agralon.com/", 'property="og:image"', 'rel="canonical"', "application/ld+json"])
      if (!html.includes(must)) problems.push(`index.html: fehlt → ${must}`);
    for (const m of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
      try { JSON.parse(m[1]); } catch (e) { problems.push(`JSON-LD ungültig: ${e.message}`); }
    }
  }
}

// Datenschutz und Gewicht: keine Kamera-Metadaten (EXIF, oft mit GPS) im öffentlichen Repository, keine Riesendateien.
const { readdir, stat } = await import("node:fs/promises");
async function walk(dir) {
  for (const e of await readdir(dir, { withFileTypes: true })) {
    if (e.name === ".git") continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) { await walk(p); continue; }
    const rel = path.relative(root, p);
    const size = (await stat(p)).size;
    if (size > 8 * 1024 * 1024) problems.push(`zu groß (${(size / 1048576).toFixed(1)} MB) → ${rel}`);
    if (/^assets[\\/]video[\\/]/.test(rel) && size > 4 * 1024 * 1024) problems.push(`Video über 4 MB → ${rel}`);
    if (/\.jpe?g$/i.test(e.name)) {
      const head = (await readFile(p)).subarray(0, 65536);
      if (head.includes(Buffer.from("Exif\0\0", "latin1"))) problems.push(`EXIF-Metadaten im Bild → ${rel}`);
    }
  }
}
await walk(root);

if (problems.length) { console.error(problems.join("\n")); process.exit(1); }
console.log("check ok");