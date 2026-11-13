# Design

## Context

The game uses Electron (`v45.2.1`) and `electron-builder` (`v26.18.0`) to produce desktop executables for Windows, Linux, and macOS. Releases are built via GitHub Actions (`.github/workflows/release.yml`) targeting repository `Xtqm/disc-battle`. `electron-updater` has been added to `package.json` (`^6.8.11`).

See `proposal.md` for motivation and `specs/desktop-shell/spec.md` for behavioral requirements.

## Goals / Non-Goals

**Goals:**
- Provide automatic discovery of new GitHub Releases in packaged desktop builds.
- Download verified update payloads silently in the background without frame drops or match interruption.
- Dispatch IPC events to inform the renderer/HUD when an update is staged for next launch.
- Enable automatic update installation upon application exit.
- Automate publishing of update manifests (`latest.yml`, `latest-mac.yml`, `latest-linux.yml`) in GitHub Actions.

**Non-Goals:**
- In-place auto-updating of standalone portable `.exe` binaries (which cannot self-overwrite while executing on Windows).
- Replacing Steamworks depot management for Steam builds (handled separately via `build-steam.cjs`).
- Implementing custom delta-compression servers (relies entirely on GitHub Releases static asset hosting).

## Decisions

### Decision 1: Use `electron-updater` with GitHub Releases provider
- **Rationale**: `electron-updater` is the official, battle-tested updater for `electron-builder`. GitHub Releases provides free static asset and manifest hosting with HTTPS, release tagging, and SHA512 hash validation.
- **Alternatives Considered**:
  - *Custom update server (Hazel / Nuts)*: Requires running and paying for server infrastructure.
  - *In-game HTTP polling of GitHub Releases API*: Would require writing custom binary download, file replacement, and UAC elevation logic from scratch.

### Decision 2: Guard update checks by environment (`app.isPackaged` and test flags)
- **Rationale**: Development runs (`npm run desktop:dev`) and automated test suites (`ELECTRON_TEST_MODE=1` in CI/puppeteer) must never attempt to fetch or apply production updates.
- **Alternatives Considered**: Checking updates in all environments, which throws noisy dev-mode errors when `app-update.yml` is missing.

### Decision 3: Background auto-download with non-blocking UI notification
- **Rationale**: ARC LEAGUE is an intense real-time arcade combat game. Forcing an immediate app restart or showing modal blocking dialogs during combat would ruin player sessions. Background download + notification on the title screen / HUD allows the player to finish their match and restart when convenient.
- **Alternatives Considered**:
  - *Aggressive restart on download complete*: Disruptive to active matches.
  - *Manual download prompt*: Extra friction for players; background fetch is smoother.

### Decision 4: Update CI Release workflow to publish manifest files
- **Rationale**: `electron-updater` requires `latest.yml` (Windows), `latest-linux.yml` (Linux), and `latest-mac.yml` (macOS) in the release assets alongside the executables. The current workflow glob (`dist/*.exe`) excluded `.yml` manifests.
- **Alternatives Considered**: Uploading manifests as separate manual assets.

## Risks / Trade-offs

- **[Risk] Unsigned Windows executables trigger SmartScreen**: Without an EV code-signing certificate, Windows SmartScreen may flag installer updates on first download until reputation builds.
  - *Mitigation*: Provide clear documentation and release notes; compute and publish SHA-256 checksums in `SHA256SUMS.txt`.
- **[Risk] Portable build execution cannot auto-update**: Players running `portable.exe` cannot be updated in-place by NSIS delta diffs.
  - *Mitigation*: NSIS is designated as the primary installer format with shortcut creation; portable builds run smoothly but do not perform in-place replacement.
- **[Risk] GitHub API rate limiting on public update checks**: Repeated unauthenticated calls from many players could encounter GitHub rate limits if misconfigured.
  - *Mitigation*: `electron-updater` fetches release metadata via static asset URLs (`/releases/download/.../latest.yml`) rather than hitting the REST API rate limits.
