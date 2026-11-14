# Proposal: Integrate Arc League Brand Identity Assets

## Why

The game has successfully evolved its in-universe lore and competitive identity into **ARC LEAGUE**, but the codebase still relies on legacy temporary assets, plain text headers, and minimal inline SVG icons. With four official community-approved visual identity art pieces established—an iconic circular monogram, a high-velocity 3D logotype, an esports championship crest, and authentic in-universe Pure Construct key art—the game requires a cohesive integration across its web client, desktop shell, in-game menus, and packaging manifests.

## What Changes

- **Brand Asset Integration**: Ingest and standardize the four official Arc League visual assets into `assets/branding/` in optimized formats:
  - `arc_league_icon_monogram.png` (Circular "A" targeting emblem)
  - `arc_league_title_logo.png` (3D kinetic metallic title lockup)
  - `arc_league_championship_crest.png` (Hexagonal carbon-fiber esports federation shield)
  - `arc_league_key_art_capsule.png` (Authentic in-game Pure Construct key art with icosahedron head, tilted halo, hover points, and telekinetic palm disc)
- **Desktop Shell & OS Packaging**:
  - Convert the circular monogram into native Windows multi-resolution icon (`desktop/icon.ico`) and Linux PNG (`desktop/icon.png`).
  - Wire `electron-builder.json` and Electron main process to display the new native window icon and executable file icon.
- **Web Client & PWA Favicon**:
  - Update `index.html` favicon links to point to the official brand icon with high-DPI apple-touch-icon and web manifests.
- **In-Game Menus & UI Surfaces**:
  - Integrate `arc_league_title_logo.png` into the Pause menu and System Modals, replacing plain text placeholders with glowing branded title lockups.
  - Surface `arc_league_championship_crest.png` within the Host / Mode Select and Armory Dossier interfaces as the official league federation emblem.
  - Set `arc_league_key_art_capsule.png` as the hero backdrop for match loading and campaign sector intermissions.

## Capabilities

### New Capabilities
- `brand-identity`: Defines the canonical Arc League brand asset catalog, format standards, UI mount locations, and responsive display guidelines across web and native runtime targets.

### Modified Capabilities
- `desktop-shell`: Updates native window creation and packaging manifests in `electron-builder.json` to require and link official brand icon assets (`icon.ico`, `icon.png`).

## Impact

- `assets/branding/`: New directory containing production visual assets.
- `desktop/`: New `icon.ico` and `icon.png` referenced by `desktop/main.js`.
- `electron-builder.json`: Configured with explicit `win.icon` and platform icon paths.
- `index.html`: Favicon links and in-game pause/modal headers updated with branded visual elements.
- `README.md`: Updated with official brand hero badges and key art showcase.
