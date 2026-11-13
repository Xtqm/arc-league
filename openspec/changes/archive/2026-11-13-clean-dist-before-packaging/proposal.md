# Proposal

## Why

The electron-builder output directory (`dist`) accumulates stale artifacts across versions: prior installers, orphaned `.blockmap` files, and manifests from old product names (e.g., `TRON DISC ARENA 1.0.0`) linger because electron-builder overwrites same-named files but never removes old ones. Stale output risks developers opening a previous build believing it is fresh, SHA256SUMS/manifest mismatches if a partially-cleaned `dist` is uploaded manually, and general packaging confusion. Wiping the output directory at the start of local packaging builds makes every build's output deterministic and trustworthy.

## What Changes

- Add a small cross-platform cleanup helper (`desktop/clean-dist.cjs`) that recursively removes the configured packaging output directory (`dist`) and logs what it removed; safe no-op when the directory does not exist.
- Wire the helper into the local distribution packaging scripts (`desktop:build`, `desktop:build:all`) so it runs before `electron-builder` on every invocation.
- Explicitly out of scope: `desktop:steam` (produces and immediately consumes its own `--dir` unpacked output), `desktop:dev` (does not use `dist`), and any GitHub Releases retention policy (releases are kept indefinitely per separate decision).

## Capabilities

### New Capabilities
<!-- None -->

### Modified Capabilities
- `desktop-shell`: Add a packaging output hygiene requirement — local distribution packaging SHALL remove stale `dist` output before generating new packages.

## Impact

- **Scripts**: `package.json` `desktop:build` and `desktop:build:all` gain a cleanup prefix step.
- **New file**: `desktop/clean-dist.cjs` (Node `fs.rmSync`, no new dependencies).
- **No runtime impact**: packaging-time only; the game client and CI behavior are unchanged (CI runners start from clean checkouts where the wipe is a safe no-op).
