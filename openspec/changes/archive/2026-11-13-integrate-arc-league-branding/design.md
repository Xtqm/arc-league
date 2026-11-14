# Technical Design: Arc League Brand Identity Integration

## Context

See `proposal.md` for background and motivation. The game currently operates with an inline SVG circle as its favicon, has no explicit icon configuration in `electron-builder.json` or `desktop/main.js`, and uses plain text headers in in-game modal dialogs. Four high-quality visual identity pieces have been generated and approved:
1. `arc_league_icon_monogram.png` (Circular 1:1 monogram targeting mark)
2. `arc_league_title_logo.png` (3D kinetic typography title lockup)
3. `arc_league_championship_crest.png` (Hexagonal esports championship shield)
4. `arc_league_key_art_capsule.png` (Key art with authentic in-game Pure Construct rig)

## Goals / Non-Goals

**Goals:**
- Centralize all official brand art under `assets/branding/` in clean, web-optimized PNG formats.
- Generate standard multi-resolution desktop icons (`desktop/icon.ico` and `desktop/icon.png`) and wire them into Electron runtime and packaging manifests.
- Modernize the web client favicon, apple-touch-icon, and PWA metadata in `index.html`.
- Upgrade in-game pause and mode-select modals with official brand graphics while preserving high frame rate performance and DOM simplicity.
- Ensure all asset paths are compatible with both web HTTP serving and Electron file protocols.

**Non-Goals:**
- Completely redesigning all HUD telemetry or in-game shaders (the 3D WebGL rendering pipeline remains unchanged).
- Modifying player rig or arena procedural materials (they already match the lore).

## Decisions

### Decision 1: Asset Directory Organization (`assets/branding/`)
- **Choice**: Place the 4 canonical assets in `assets/branding/` with standardized kebab/snake naming:
  - `arc_league_icon_monogram.png`
  - `arc_league_title_logo.png`
  - `arc_league_championship_crest.png`
  - `arc_league_key_art_capsule.png`
- **Alternatives Considered**: Storing them loosely in `assets/` or as inline base64 strings. Centralizing in `assets/branding/` keeps raw branding separated from gameplay textures and avoids inflating HTML bundle size.

### Decision 2: Multi-Resolution Desktop Icon Generation
- **Choice**: Generate a true multi-resolution Windows icon (`desktop/icon.ico`) incorporating standard mip sizes (256x256 down to 16x16) from the 1:1 circular monogram, alongside a 512x512 `desktop/icon.png` for Linux/macOS and Electron window runtime.
- **Alternatives Considered**: Using a raw PNG on Windows. Windows taskbars, Alt+Tab switchers, and desktop shortcuts require an `.ico` container with multiple bit depths to avoid ugly nearest-neighbor downscaling.

### Decision 3: Desktop Shell Configuration
- **Choice**: Configure `electron-builder.json` with explicit `win.icon: "desktop/icon.ico"` and pass `icon: path.join(__dirname, 'icon.png')` to `BrowserWindow` in `desktop/main.js`.
- **Alternatives Considered**: Relying on default Electron icon fallback, which shows the default blue Electron atom.

### Decision 4: In-Game UI Component Integration
- **Choice**:
  - In `pauseMenu`, inject an emissive `<img>` tag referencing `assets/branding/arc_league_title_logo.png` with CSS drop-shadow filters.
  - In `hostModal`, display `assets/branding/arc_league_championship_crest.png` as the tournament banner above mode selection buttons.
  - In the loading/intermission overlay, use `assets/branding/arc_league_key_art_capsule.png` as an ambient backdrop with a dark vignette overlay (`rgba(0,5,10,0.85)`).
- **Alternatives Considered**: Pure CSS styling without images. Image lockups provide much higher visual fidelity and professional esports polish.

## Risks / Trade-offs

- **[Risk] High-resolution asset load latency on slow network connections**  
  → **Mitigation**: Optimize image compression, utilize PNG/WebP standards, and preload key UI graphics in `index.html`.
- **[Risk] Electron file:// vs HTTP path resolution discrepancies**  
  → **Mitigation**: Use relative paths (`assets/branding/...`) that resolve cleanly in both web browser root servers (`http://localhost:3000`) and Electron local directory packaging (`file:///`).

## Migration Plan

1. Ingest the 4 approved image source files into `assets/branding/`.
2. Generate `desktop/icon.ico` and `desktop/icon.png`.
3. Update `electron-builder.json` and `desktop/main.js`.
4. Update `index.html` favicon tags and modal markup with CSS styling.
5. Run test packaging and preview in both browser and Electron dev modes.
