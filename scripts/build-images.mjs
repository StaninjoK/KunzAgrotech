// Erzeugt alle Web-Bilder aus den Originalen in source/.
// Aufruf:  SHARP_PATH=<pfad zu sharp> node scripts/build-images.mjs
// Neues Hero-Foto: Datei als source/foto-stanley-t100.jpg ablegen, Ausschnitte unten in CROPS anpassen, Skript erneut starten.
import { createRequire } from "node:module";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const sharp = require(process.env.SHARP_PATH || "sharp");
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const src = (f) => path.join(root, "source", f);
const out = (f) => path.join(root, "assets", "img", f);

const PHOTO = src("foto-stanley-t100.jpg"); // Stanley mit T100 am Boden (Nosotros)
const FLIGHT = src("foto-stanley-t100-vuelo.jpg"); // Stanley steuert die fliegende T100 (Hero, OG)
const DRONE = src("t100-drone.jpg"); // nur Drohne (Tecnología)
const CARD = src("tarjeta-hidrosensible.jpg"); // Wassersensitives Papier nach Applikation

// Sanfte Aufbereitung: etwas Kontrast und vorsichtige Schärfe nach dem Verkleinern. Keine Retusche.
const TUNE = { contrast: 1.04, saturation: 1.02, sharpen: 0.5 };
// Hero-Foto (Handyfoto, eher weich): erst etwas Mikrokontrast in voller Auflösung (breiter, schwacher Radius),
// nach dem Verkleinern feine Schärfe mit Obergrenze x1 gegen helle Säume. Bewusst moderat, damit es natürlich bleibt.
const HERO_TUNE = { contrast: 1.03, saturation: 1.02, clarity: { sigma: 2, m1: 0.22, m2: 0.22 }, sharpen: 0.75, m1: 0.8, m2: 1.6, x1: 2.5 };

// Ausschnitte: foto-stanley-t100.jpg und foto-stanley-t100-vuelo.jpg (1200 × 1600), t100-drone.jpg (1600 × 747), tarjeta-hidrosensible.jpg (956 × 2048)
const CROPS = {
  hero: { file: FLIGHT, left: 0, top: 0, width: 1200, height: 1600, widths: [1200, 900, 640], tune: HERO_TUNE, quality: 84 },
  about: { file: PHOTO, left: 480, top: 400, width: 700, height: 875, widths: [700, 480], tune: { ...HERO_TUNE, sharpen: 0.7, m2: 1.5 }, quality: 84 },
  t100: { file: DRONE, left: 190, top: 40, width: 1200, height: 707, widths: [1200, 800] },
  // Karte liegt hochkant im Foto; für das Layout um 90° gedreht (nur Ausrichtung, Inhalt unverändert).
  card: { file: CARD, left: 150, top: 300, width: 680, height: 1500, rotate: -90, widths: [1100, 700], tune: TUNE },
};

async function photo(name, crop) {
  for (const w of crop.widths) {
    let img = sharp(crop.file)
      .rotate()
      .extract({ left: crop.left, top: crop.top, width: crop.width, height: crop.height });
    if (crop.rotate) img = sharp(await img.rotate(crop.rotate).toBuffer());
    const t = crop.tune;
    if (t?.clarity) img = sharp(await img.sharpen(t.clarity).toBuffer());
    const fullWidth = crop.rotate ? crop.height : crop.width;
    img = img.resize({ width: Math.min(w, fullWidth) });
    if (t) {
      img = img.linear(t.contrast, -128 * (t.contrast - 1)).modulate({ saturation: t.saturation }).sharpen({ sigma: t.sharpen, m1: t.m1 ?? 0.6, m2: t.m2 ?? 1.2, ...(t.x1 ? { x1: t.x1 } : {}) });
    }
    const q = crop.quality || 72;
    await img.clone().webp({ quality: q, effort: 6 }).toFile(out(`${name}-${w}.webp`));
    await img.clone().jpeg({ quality: q + 8, mozjpeg: true }).toFile(out(`${name}-${w}.jpg`));
  }
}

// Sektion „Trabajos en campo“: echte Einsatzfotos und Video-Standbilder aus source/campo.
// `blur` macht Kennzeichen unkenntlich (Koordinaten im Original, vor dem Zuschnitt).
const FIELD = {
  "campo-operacion": { file: "operacion-lote.jpg", left: 150, top: 0, width: 3320, height: 1868, widths: [1600, 1000], blur: [{ left: 2030, top: 560, width: 140, height: 50 }] },
  "campo-base": { file: "base-apoyo.jpg", left: 0, top: 560, width: 1536, height: 1024, widths: [900, 600], blur: [{ left: 855, top: 898, width: 105, height: 44 }] },
  "campo-t100": { file: "t100-surcos.jpg", left: 0, top: 480, width: 1080, height: 720, widths: [900, 600] },
  "campo-video-poster": { file: "aplicacion-poster.jpg", left: 0, top: 0, width: 1080, height: 2320, widths: [720, 480] },
};

async function field(name, c) {
  let buf = await sharp(src(`campo/${c.file}`)).rotate().toBuffer();
  for (const b of c.blur || []) {
    const patch = await sharp(buf).extract(b).blur(14).toBuffer();
    buf = await sharp(buf).composite([{ input: patch, left: b.left, top: b.top }]).toBuffer();
  }
  for (const w of c.widths) {
    const img = sharp(buf).extract({ left: c.left, top: c.top, width: c.width, height: c.height }).resize({ width: w })
      .linear(TUNE.contrast, -128 * (TUNE.contrast - 1)).sharpen({ sigma: 0.5, m1: 0.6, m2: 1.2 });
    await img.clone().webp({ quality: 76, effort: 6 }).toFile(out(`${name}-${w}.webp`));
    await img.clone().jpeg({ quality: 82, mozjpeg: true }).toFile(out(`${name}-${w}.jpg`));
  }
}

// Agralon-Produktbild: offizielles Dashboard-Motiv von agralon.com (je Sprache, 2x aufgenommen). Enthält Beispieldaten.
async function agralonMock() {
  for (const lang of ["es", "en", "de", "pt"]) {
    for (const w of [1400, 900]) {
      const img = sharp(src(`agralon/plataforma-${lang}.png`)).resize({ width: w });
      await img.clone().webp({ quality: 82, effort: 6 }).toFile(out(`agralon-plataforma-${lang}-${w}.webp`));
      await img.clone().jpeg({ quality: 84, mozjpeg: true }).toFile(out(`agralon-plataforma-${lang}-${w}.jpg`));
    }
  }
}

// Rundes Logo: das Original hat weißen Grund; der Kreis wird freigestellt, das Siegel selbst bleibt unverändert.
async function badge() {
  const img = sharp(src("logo-kunz-agrotech.jpg"));
  const { data, info } = await img.clone().greyscale().raw().toBuffer({ resolveWithObject: true });
  let minX = info.width, minY = info.height, maxX = 0, maxY = 0;
  for (let y = 0; y < info.height; y++)
    for (let x = 0; x < info.width; x++)
      if (data[y * info.width + x] < 110) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
  const cx = (minX + maxX) / 2, cy = (minY + maxY) / 2;
  const r = Math.min(maxX - minX, maxY - minY) / 2 - 3;
  const size = Math.floor(r * 2);
  const left = Math.round(cx - r), top = Math.round(cy - r);
  const mask = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}"><circle cx="${size / 2}" cy="${size / 2}" r="${size / 2 - 1}" fill="#fff"/></svg>`,
  );
  const round = await img
    .extract({ left, top, width: size, height: size })
    .ensureAlpha()
    .composite([{ input: mask, blend: "dest-in" }])
    .png()
    .toBuffer();
  for (const w of [512, 192, 180, 96, 32]) {
    await sharp(round).resize(w, w).png({ compressionLevel: 9 }).toFile(out(`logo-${w}.png`));
  }
  await sharp(round).resize(192, 192).webp({ quality: 90 }).toFile(out("logo-192.webp"));
  return round;
}

async function brands() {
  await sharp(src("kunz-global-logo.png")).resize({ width: 560 }).png({ compressionLevel: 9 }).toFile(out("kunz-global.png"));
  // Weißes Kunz-Global-Zeichen (von der Kunz-Global-Website) für die Markenleiste auf dunklem Grund.
  await sharp(src("kunz-global-mark-white.png")).resize({ height: 96 }).png({ compressionLevel: 9 }).toFile(out("kunz-global-mark.png"));
  // Agralon-App-Icon: Ecken des Originals sind weichgezeichnet, daher leicht nach innen beschneiden und abrunden.
  const s = 400;
  const mask = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${s}" height="${s}"><rect width="${s}" height="${s}" rx="${s * 0.225}" fill="#fff"/></svg>`,
  );
  const meta = await sharp(src("agralon-icon.png")).metadata();
  const inset = Math.round(meta.width * 0.035);
  const square = await sharp(src("agralon-icon.png"))
    .extract({ left: inset, top: inset, width: meta.width - inset * 2, height: meta.height - inset * 2 })
    .resize(s, s)
    .png()
    .toBuffer();
  const rounded = await sharp(square)
    .ensureAlpha()
    .composite([{ input: mask, blend: "dest-in" }])
    .png()
    .toBuffer();
  await sharp(rounded).resize(192, 192).png({ compressionLevel: 9 }).toFile(out("agralon-icon.png"));
  await sharp(src("agralon-wordmark-white.png")).resize({ width: 400 }).png({ compressionLevel: 9 }).toFile(out("agralon-wordmark.png"));
  // Dunkle Fassung für helle Flächen: gleiche Form, Farbe des Schriftzugs aus dem Original-Logo (Agralon_Logo.png ≈ #03190f).
  const alpha = await sharp(src("agralon-wordmark-white.png")).resize({ width: 400 }).ensureAlpha().extractChannel("alpha").toBuffer();
  const meta2 = await sharp(alpha).metadata();
  await sharp({ create: { width: meta2.width, height: meta2.height, channels: 3, background: "#03190f" } })
    .joinChannel(alpha)
    .png({ compressionLevel: 9 })
    .toFile(out("agralon-wordmark-dark.png"));
}

// Vorschaubild für WhatsApp, Instagram & Co. (1200 × 630)
async function og(round) {
  const W = 1200, H = 630;
  // Ganzes Hochformat (Drohne oben, Stanley unten) auf volle Höhe, rechts angesetzt.
  const pic = await sharp(FLIGHT).rotate().resize({ height: H }).linear(TUNE.contrast, -128 * (TUNE.contrast - 1)).sharpen({ sigma: 0.5 }).toBuffer();
  const picW = (await sharp(pic).metadata()).width;
  const picX = W - picW;
  const logo = await sharp(round).resize(96, 96).toBuffer();
  const text = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
    <defs><linearGradient id="g" x1="0" x2="1"><stop offset="0" stop-color="#0c131d"/><stop offset="1" stop-color="#0c131d" stop-opacity="0"/></linearGradient></defs>
    <rect x="${picX}" width="90" height="${H}" fill="url(#g)"/>
    <g font-family="Segoe UI, Arial, sans-serif" fill="#f4f1ea">
      <text x="186" y="112" font-size="26" font-weight="700" letter-spacing="3">KUNZ AGROTECH</text>
      <text x="186" y="146" font-size="19" fill="#9fb48f" letter-spacing="1">Tecnología agrícola aplicada al campo</text>
      <text x="72" y="300" font-size="58" font-weight="600">Precisión desde el aire.</text>
      <text x="72" y="372" font-size="58" font-weight="600">Resultados en el campo.</text>
      <text x="72" y="452" font-size="25" fill="#c9cfd6">Servicios agrícolas con DJI Agras T100</text>
      <text x="72" y="490" font-size="25" fill="#c9cfd6">Base en San José · Uruguay</text>
      <rect x="72" y="540" width="56" height="3" fill="#7fa063"/>
    </g></svg>`);
  await sharp({ create: { width: W, height: H, channels: 3, background: "#0c131d" } })
    .composite([
      { input: pic, left: picX, top: 0 },
      { input: text, left: 0, top: 0 },
      { input: logo, left: 72, top: 64 },
    ])
    .jpeg({ quality: 88, mozjpeg: true })
    .toFile(out("og-kunz-agrotech.jpg"));
}

await mkdir(out(""), { recursive: true });
for (const [name, crop] of Object.entries(CROPS)) await photo(name, crop);
for (const [name, c] of Object.entries(FIELD)) await field(name, c);
await agralonMock();
const round = await badge();
await brands();
await og(round);
await sharp(round).resize(48, 48).png().toFile(path.join(root, "favicon.png"));
await writeFile(path.join(root, "assets", "img", "LEEME.txt"), "Generado por scripts/build-images.mjs a partir de source/. No editar a mano.\n");
console.log("ok");
