# Tasks: Integrate Arc League Brand Identity Assets

## 1. Asset Ingestion and Icon Generation

- [x] 1.1 Ingest the 4 approved image assets from upload cache into `assets/branding/` (`arc_league_icon_monogram.png`, `arc_league_title_logo.png`, `arc_league_championship_crest.png`, `arc_league_key_art_capsule.png`) and verify file existence and PNG formatting.
- [x] 1.2 Generate multi-resolution Windows icon `desktop/icon.ico` (256x256, 128x128, 64x64, 48x48, 32x32, 16x16) and `desktop/icon.png` (512x512) from the circular monogram and verify file sizes and headers.

## 2. Desktop Shell and Packaging Integration

- [x] 2.1 Update `desktop/main.js` to set native `BrowserWindow` icon options referencing `desktop/icon.ico` (Windows) and `desktop/icon.png` (Linux/macOS), and verify Electron window launch behavior.
- [x] 2.2 Update `electron-builder.json` to explicitly define `win.icon: "desktop/icon.ico"` and ensure `assets/branding/**/*` is included in packaged distribution bundles.

## 3. Web Client Favicon and Brand Metadata

- [x] 3.1 Update `index.html` `<head>` icon links, replacing inline SVG with high-DPI `assets/branding/arc_league_icon_monogram.png` and apple-touch-icon links, and verify favicon loads.
- [x] 3.2 Update `README.md` and repository headers to showcase the new official Arc League branding lockup.

## 4. In-Game UI Header and Modal Upgrades

- [x] 4.1 Update `#pauseMenu` modal in `index.html` to display `arc_league_title_logo.png` with cyan glow styling, and verify modal responsiveness across desktop and mobile screens.
- [x] 4.2 Update `#hostModal` in `index.html` to display `arc_league_championship_crest.png` as the league tournament emblem, and verify layout alignment.
- [x] 4.3 Add responsive key art background styling using `arc_league_key_art_capsule.png` to match loading and intermission states, verifying proper letterboxing and dark vignette overlay.

## 5. End-to-End Verification

- [x] 5.1 Run all automated test suites (`npm run test:storage`, `npm run test:armory`, `npm run test:campaign`, `npm run test:economy`) to confirm zero regressions across game systems.
- [x] 5.2 Validate that all asset paths resolve cleanly under both web HTTP serving (`http://localhost:3000`) and Electron file protocols.
