# V12 Neon Heist — GTA VI Cover Art Maker

[![Bounty: Make GTA 6 Cover Art](https://img.shields.io/badge/bounty-Make%20GTA%206%20Cover%20Art-ff2e88)](https://make.fun/bounty/gta6-cover-art-01)
[![Prize: $250](https://img.shields.io/badge/prize-%2450%20places-29b6f6)](https://make.fun/bounty/gta6-cover-art-01)
[![Status: Open](https://img.shields.io/badge/status-open-22c55e)](https://make.fun/bounty/gta6-cover-art-01)

An offline web app that turns any photo and caption into GTA VI-style cover art, exported as a PNG to share. Entry for the [make.fun “Make GTA 6 Cover Art” bounty](https://make.fun/bounty/gta6-cover-art-01) (referral code `1ae1r9cj`).

## The cover

**V12 Neon Heist** — one giant flat electric-blue numeral **6** over a neon sunset, a red sports car in front three-quarter view (visible grille, headlight and beam, foreshortened body, short coupe roof), spoked wheels with a contact shadow, wet-road reflection, huge flat block **GTA VI** type and the tagline *“1 CAR. 1 LIGHT. 6 WAYS OUT.”* All art is drawn procedurally on canvas in your browser — no Rockstar logo, artwork or font.

## The maker

- **Any photo:** load up to 4 photos from your machine (never uploaded), crop and position each panel with zoom / X / Y sliders, or fill every panel with one photo.
- **3 layouts:** full-bleed hero, hero + three photos, four-panel grid.
- **3 grades:** Neon (magenta + cyan), Sunset (orange + pink), Vice (purple + teal).
- **3 post sizes:** 1080 × 1080, 1080 × 1350, 1920 × 1080 — exact-pixel PNG export.
- **Lettering:** editable title, tagline and badge; live preview the whole time.

## Run it

Serve `app/` with any static server and open `index.html` — it works with no network request:

```sh
cd app && python3 -m http.server 8080
```

## Hand in

`main.ts` (Node 22, standard library only) copies `app/` and `screenshots/` to `/output` and writes `/output/dossier.json` with `buildDossier` from `vendor/makefun-app.ts`:

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

## License

MIT — see [LICENSE](LICENSE).
