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

const PHOTO = src("foto-stanley-t100.jpg");

// Ausschnitte im Originalfoto (1200 × 1600)
const CROPS = {
  hero: { left: 0, top: 150, width: 1200, height: 1450, widths: [1200, 900, 640] },
  about: { left: 480, top: 400, width: 700, height: 875, widths: [700, 480] },
  t100: { left: 0, top: 670, width: 672, height: 440, widths: [672] },
};

async function photo(name, crop) {
  for (const w of crop.widths) {
    const base = sharp(PHOTO)
      .rotate()
      .extract({ left: crop.left, top: crop.top, width: crop.width, height: crop.height })
      .resize({ width: Math.min(w, crop.width) });
    await base.clone().webp({ quality: 72, effort: 6 }).toFile(out(`${name}-${w}.webp`));
    await base.clone().jpeg({ quality: 80, mozjpeg: true }).toFile(out(`${name}-${w}.jpg`));
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
}

// Vorschaubild für WhatsApp, Instagram & Co. (1200 × 630)
async function og(round) {
  const W = 1200, H = 630;
  const pic = await sharp(PHOTO).extract({ left: 0, top: 430, width: 1200, height: 900 }).resize(560, H, { fit: "cover", position: "right" }).toBuffer();
  const logo = await sharp(round).resize(96, 96).toBuffer();
  const text = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
    <defs><linearGradient id="g" x1="0" x2="1"><stop offset="0" stop-color="#0c131d"/><stop offset="1" stop-color="#0c131d" stop-opacity="0"/></linearGradient></defs>
    <rect x="640" width="120" height="${H}" fill="url(#g)"/>
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
      { input: pic, left: 640, top: 0 },
      { input: text, left: 0, top: 0 },
      { input: logo, left: 72, top: 64 },
    ])
    .jpeg({ quality: 88, mozjpeg: true })
    .toFile(out("og-kunz-agrotech.jpg"));
}

await mkdir(out(""), { recursive: true });
for (const [name, crop] of Object.entries(CROPS)) await photo(name, crop);
const round = await badge();
await brands();
await og(round);
await sharp(round).resize(48, 48).png().toFile(path.join(root, "favicon.png"));
await writeFile(path.join(root, "assets", "img", "LEEME.txt"), "Generado por scripts/build-images.mjs a partir de source/. No editar a mano.\n");
console.log("ok");
