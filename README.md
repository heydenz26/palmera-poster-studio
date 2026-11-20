# Palmera Poster Studio

Turn any photo and a caption into GTA 6-style multi-panel cover art — fully
offline, in your browser, exported as a ready-to-post PNG.

Made for the make.fun competition **gta6-cover-art-01** ("Make GTA 6 Cover Art").

[![make.fun gta6-cover-art-01](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/c/gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/heydenz26/palmera-poster-studio/rank.svg)](https://make.fun/c/gta6-cover-art-01)
[![reward](https://make.fun/badge/gta6-cover-art-01/heydenz26/palmera-poster-studio/reward.svg)](https://make.fun/c/gta6-cover-art-01)

## What it does

- **Four layouts** — Hero Trio, Triple Strip, Duo Poster and Quad Grid, each
  adapting to square, portrait and wide frames with white gutters between panels.
- **Any photo, up to three** — load your own photos, pick one per panel, drag to
  position it, zoom with the slider or the mouse wheel, and reset a panel's crop.
- **Six colour grades** — Vice Sunset, Neon Nights, Gold Hour, Noir Red, Acid
  Arcade and Frostbite, all drawn on canvas (no files, no network). A cover-wide
  grade tints every panel, and a **per-panel grade dropdown** lets one panel
  stand out with a different grade.
- **Face-safe framing** — when the switch is on, drag-panning is clamped so heads
  and chins near the top of a portrait photo are never cropped at a panel edge.
- **Undo** — every layout, grade, caption, photo and pan change is undoable with
  the Undo button or Ctrl/Cmd+Z (Shift+Z redoes).
- **Editable lettering** — title, subtitle and corner tag, plus a caption-size
  slider to scale the title within a safe band.
- **One-click PNG export** — three sizes: 1080 × 1080, 1080 × 1350 and
  1920 × 1080.

Everything is original: no Rockstar Games logo, artwork or font, and no real GTA
branding. The two sample photos ship with the kit and are free to use.

## Run it

```sh
node serve.ts        # then open http://localhost:8080 in desktop Chrome
```

Or open `app/index.html` directly — the app is plain static files and works
offline.

## Screenshots

The four screenshots in `screenshots/` are taken by the app itself from fixed
scenes (`app/src/shots.js`, see `shots.json`): a wide hero-trio cover, the
editor on the Quad Grid layout, a portrait triple-strip cover with a per-panel
grade, and the square Duo Poster cover that confirms the face-safe framing keeps
the subject's chin inside the frame.

## Entry program

`main.ts` (Node 22, standard library only) validates the screenshots and app
sizes, copies `app/` and `screenshots/` to the output directory, and writes
`dossier.json` with the vendored make.fun library:

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

Every screenshot is checked by its leading magic bytes (a real PNG or JPEG, not
just a file name) and sized against the gate caps before anything is copied, and
the finished dossier is measured against its 1.5 MiB cap before it is written —
a bad build fails loudly here, not on the server.

## Checks

Run from the build directory one level above the repo: `node take-shots.mjs`
re-shoots the four screenshots from the fixed scenes in `shots.json`, and
`node export-test.mjs` clicks Export PNG in headless Chrome and confirms a real
PNG file lands in the download folder.

## License

MIT — see `LICENSE`.
