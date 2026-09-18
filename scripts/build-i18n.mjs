// Erzeugt /en/, /de/ und /pt/ aus der spanischen Quelle index.html (Standardsprache, bleibt unter /).
// Übersetzungen stehen in i18n/<lang>.json: Schlüssel = spanischer Text, Wert = Übersetzung.
//
//   node scripts/build-i18n.mjs            → baut en/index.html, de/index.html, pt/index.html
//   node scripts/build-i18n.mjs --check    → listet fehlende und überflüssige Übersetzungen, Exit 1 bei Lücken
//   node scripts/build-i18n.mjs --extract  → gibt alle übersetzbaren spanischen Texte aus
//
// Nach jeder Textänderung in index.html: --check, Wörterbücher ergänzen, bauen. Erzeugte Dateien nie von Hand ändern.
import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SITE = "https://kunzagrotech.com/";
export const LANGS = {
  en: { html: "en", og: "en_US", url: `${SITE}en/`, agralon: "https://agralon.com/en" },
  de: { html: "de", og: "de_DE", url: `${SITE}de/`, agralon: "https://agralon.com/de" },
  pt: { html: "pt-BR", og: "pt_BR", url: `${SITE}pt/`, agralon: "https://agralon.com/pt" },
};
const OG_ALL = ["es_UY", "en_US", "de_DE", "pt_BR"];

// Texte, die in allen Sprachen gleich bleiben (Namen, Marken, Zahlen, Kontaktangaben).
const KEEP = new Set([
  "Kunz Agrotech", "Kunz Global", "Agralon", "DJI Agras T100", "WhatsApp", "Instagram", "@kunzagrotech",
  "092 800 358", "stanley@kunzagrotech.com", "Stanley Kunz", "ES", "EN", "DE", "PT", "Español", "English", "Deutsch", "Português",
  "San José · Uruguay", "© 2026 Kunz Agrotech.", "L", "kg", "100", "150", "01", "02", "03", "04", "1", "2", "3", "San José", "Uruguay", "LiDAR",
]);
const keep = (s) => KEEP.has(s) || !/[a-záéíóúñü]/i.test(s) || /^[\w.+-]+@[\w.-]+$/.test(s);

// Schlüssel in den strukturierten Daten, deren Werte keine Sprache sind.
const LD_SKIP = ["@type", "@id", "@context", "url", "logo", "image", "telephone", "email", "addressCountry", "inLanguage", "sameAs", "contactType", "availableLanguage"];
const TRANSLATABLE_ATTRS = ["alt", "aria-label", "placeholder"];
const META_CONTENT = /<meta\s+(?:name="description"|property="og:(?:title|description|image:alt)")\s+content="([^"]*)"/g;
const URL_ATTRS = /\s(src|href|srcset|imagesrcset|data-src|poster)="([^"]*)"/g;

// Zerlegt HTML in Tags/Kommentare/Skripte und Textknoten.
function tokens(html) {
  return html.split(/(<!--[\s\S]*?-->|<script\b[\s\S]*?<\/script>|<style\b[\s\S]*?<\/style>|<[^>]+>)/);
}
const isTag = (t) => t.startsWith("<");

function collect(html) {
  const out = new Set();
  const add = (s) => { const v = s.trim(); if (v && !keep(v)) out.add(v); };
  for (const t of tokens(html)) {
    if (!t) continue;
    if (!isTag(t)) { add(t); continue; }
    if (t.startsWith("<!--") || t.startsWith("<script") || t.startsWith("<style")) continue;
    for (const a of TRANSLATABLE_ATTRS) for (const m of t.matchAll(new RegExp(`\\s${a}="([^"]*)"`, "g"))) add(m[1]);
    for (const m of t.matchAll(/href="https:\/\/wa\.me\/\d+\?text=([^"]*)"/g)) add(decodeURIComponent(m[1]));
  }
  for (const m of html.matchAll(META_CONTENT)) add(m[1]);
  for (const m of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
    (function walk(v, key) {
      if (typeof v === "string") { if (!LD_SKIP.includes(key)) add(v); }
      else if (Array.isArray(v)) v.forEach((x) => walk(x, key));
      else if (v && typeof v === "object") for (const [k, x] of Object.entries(v)) walk(x, k);
    })(JSON.parse(m[1]), "");
  }
  return out;
}

function translator(dict, missing) {
  return (s) => {
    const v = s.trim();
    if (!v || keep(v)) return s;
    if (!(v in dict)) { missing.add(v); return s; }
    const lead = s.match(/^\s*/)[0], trail = s.match(/\s*$/)[0];
    return lead + dict[v] + trail;
  };
}

const rel = (u) => (!u || /^(https?:|\/|#|mailto:|tel:|data:)/.test(u) ? u : "../" + u);

function build(html, lang, dict) {
  const L = LANGS[lang];
  const missing = new Set();
  const tr = translator(dict, missing);
  const esc = (s) => s.replace(/&(?!amp;|lt;|gt;|quot;|#)/g, "&amp;").replace(/"/g, "&quot;");

  let out = tokens(html).map((t) => {
    if (!t) return t;
    if (!isTag(t)) return tr(t);
    if (t.startsWith("<!--") || t.startsWith("<style")) return t;
    if (t.startsWith("<script")) {
      if (!t.includes("application/ld+json")) return t.replace(/^<script\b[^>]*>/, (open) => open.replace(/\ssrc="([^"]*)"/, (_, v) => ` src="${rel(v)}"`));
      const body = t.replace(/^<script[^>]*>/, "").replace(/<\/script>$/, "");
      const data = JSON.parse(body);
      (function walk(o, parent) {
        for (const [k, v] of Object.entries(o)) {
          const key = Array.isArray(o) ? parent : k;
          if (typeof v === "string") {
            if (key === "inLanguage") o[k] = L.html;
            else if (!LD_SKIP.includes(key)) o[k] = tr(v);
          } else if (v && typeof v === "object") walk(v, key);
        }
      })(data, "");
      return t.replace(body, "\n  " + JSON.stringify(data, null, 2).replace(/\n/g, "\n  ") + "\n  ");
    }
    let tag = t;
    for (const a of TRANSLATABLE_ATTRS) tag = tag.replace(new RegExp(`(\\s${a}=")([^"]*)(")`, "g"), (_, p, v, q) => p + esc(tr(v)) + q);
    tag = tag.replace(/href="https:\/\/wa\.me\/(\d+)\?text=([^"]*)"/g, (_, n, q) => `href="https://wa.me/${n}?text=${encodeURIComponent(tr(decodeURIComponent(q)))}"`);
    tag = tag.replace(URL_ATTRS, (_, a, v) => {
      if (a === "srcset" || a === "imagesrcset") return ` ${a}="${v.split(",").map((p) => { const [u, ...rest] = p.trim().split(/\s+/); return [rel(u), ...rest].join(" "); }).join(", ")}"`;
      return ` ${a}="${rel(v)}"`;
    });
    tag = tag.replace(/agralon-plataforma-es-/g, `agralon-plataforma-${lang}-`);
    tag = tag.replace('href="https://agralon.com/#features"', `href="${L.agralon}#features"`).replace('href="https://agralon.com/"', `href="${L.agralon}"`);
    // Sprachumschalter: aktuelle Sprache markieren
    if (/\sdata-lang="/.test(tag)) {
      tag = tag.replace(/\saria-current="page"/, "");
      if (tag.includes(`data-lang="${lang}"`)) tag = tag.replace(/>$/, ' aria-current="page">');
    }
    return tag;
  }).join("");

  out = out.replace(/<meta\s+(name="description"|property="og:(?:title|description|image:alt)")\s+content="([^"]*)"/g, (_, k, v) => `<meta ${k} content="${esc(tr(v))}"`);
  out = out.replace('<html lang="es-UY">', `<html lang="${L.html}">`);
  out = out.replace('<link rel="canonical" href="https://kunzagrotech.com/">', `<link rel="canonical" href="${L.url}">`);
  out = out.replace('<meta property="og:url" content="https://kunzagrotech.com/">', `<meta property="og:url" content="${L.url}">`);
  out = out.replace(/  <meta property="og:locale" content="es_UY">\n(?:  <meta property="og:locale:alternate" content="[^"]+">\n)+/, () =>
    `  <meta property="og:locale" content="${L.og}">\n` + OG_ALL.filter((o) => o !== L.og).map((o) => `  <meta property="og:locale:alternate" content="${o}">\n`).join(""));
  out = out.replace("<!doctype html>", `<!doctype html>\n<!-- GENERADO por scripts/build-i18n.mjs desde index.html + i18n/${lang}.json. No editar a mano. -->`);
  return { out, missing };
}

const args = process.argv.slice(2);
const source = (await readFile(path.join(root, "index.html"), "utf8")).replace(/\r\n/g, "\n");

if (args.includes("--extract")) {
  console.log(JSON.stringify([...collect(source)], null, 2));
  process.exit(0);
}

let failed = false;
for (const lang of Object.keys(LANGS)) {
  const dict = JSON.parse(await readFile(path.join(root, "i18n", `${lang}.json`), "utf8"));
  const { out, missing } = build(source, lang, dict);
  const needed = collect(source);
  const unused = Object.keys(dict).filter((k) => !needed.has(k));
  if (missing.size) { failed = true; console.error(`[${lang}] fehlende Übersetzungen (${missing.size}):\n  ` + [...missing].join("\n  ")); }
  if (unused.length) console.warn(`[${lang}] nicht mehr benutzt (${unused.length}):\n  ` + unused.join("\n  "));
  if (!args.includes("--check")) {
    await mkdir(path.join(root, lang), { recursive: true });
    await writeFile(path.join(root, lang, "index.html"), out);
  }
}
if (failed) process.exit(1);
console.log(args.includes("--check") ? "i18n check ok" : "i18n build ok");
