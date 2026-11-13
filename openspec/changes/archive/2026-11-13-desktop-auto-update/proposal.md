# Proposal

## Why

Standalone desktop players currently have no mechanism to detect or download updates when new versions of ARC LEAGUE are released. Players must manually check the GitHub repository and re-download installer packages. Adding auto-update capabilities via `electron-updater` and GitHub Releases ensures that desktop clients automatically check for new releases on startup, download update artifacts in the background, and seamlessly prompt the player to restart without disrupting active gameplay.

## What Changes

- Add GitHub Releases provider configuration to `electron-builder.json` to generate and publish update metadata manifests (`latest.yml`).
- Integrate `electron-updater` into the Electron main process lifecycle (`desktop/main.cjs`), with update checks gated to packaged production builds.
- Add desktop IPC channels and UI notifications for update discovery, download progress, and installation readiness without interrupting active matches.
- Update GitHub Actions release workflow (`.github/workflows/release.yml`) to automatically generate and publish update metadata along with signed or checksummed distribution binaries.

## Capabilities

### New Capabilities
<!-- None -->

### Modified Capabilities
- `desktop-shell`: Add requirements for desktop client update checking, background delta/binary download, non-disruptive player notification, and automated post-match installation lifecycle.

## Impact

- **Dependencies**: `electron-updater` integrated as an application dependency (already installed in `package.json`).
- **Configuration**: `electron-builder.json` updated with GitHub `publish` configuration targeting `Xtqm/disc-battle`.
- **Runtime Shell**: `desktop/main.cjs` hooks into `autoUpdater` events; `desktop/preload.cjs` exposes update status events to the renderer.
- **CI/CD**: `.github/workflows/release.yml` adjusted to ensure update manifests (`latest.yml`, `latest-mac.yml`, `latest-linux.yml`) are published alongside installer artifacts.
