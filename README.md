# Kunz Agrotech — kunzagrotech.com

Statische Website (GitHub Pages, Branch `main`, Root, Domain über `CNAME`). Keine Abhängigkeiten, kein Build für HTML/CSS/JS.

| Pfad | Inhalt |
| --- | --- |
| `index.html` | Die Seite (Spanisch, es-UY) |
| `assets/css/site.css` | Designsystem: Farben, Typografie, Komponenten |
| `assets/js/site.js` | Menü, Einblendungen, Formular (öffnet WhatsApp bzw. E-Mail; `data-endpoint` am Formular für einen späteren echten Endpunkt) |
| `assets/img/` | Generierte Bilder – nicht von Hand ändern |
| `source/` | Originale (Foto, Logos von Kunz Agrotech, Kunz Global, Agralon) |
| `scripts/build-images.mjs` | Erzeugt `assets/img` aus `source/` (braucht `sharp`, Pfad über `SHARP_PATH`) |
| `scripts/serve.mjs` | Lokale Vorschau auf http://127.0.0.1:8095 |
| `scripts/check.mjs` | Prüft Verweise, Anker, Alt-Texte, JSON-LD und verbotene Inhalte (alte Preise, Gmail-Adresse …) |
| `logo.jpg`, `sobre-mi.jpg` | Dateien der alten Seite, bleiben für bestehende Links erhalten |

**Neues Foto einsetzen:** Datei als `source/foto-stanley-t100.jpg` speichern, Ausschnitte in `CROPS` (build-images.mjs) anpassen, Skript starten.

**Alter Stand:** Tag und Branch `backup-before-premium-relaunch-2026-09-18`.

**Regeln:** keine erfundenen Zahlen, Referenzen oder Qualifikationen; keine festen Preise; T100-Daten nur laut DJI (ag.dji.com/t100/specs).