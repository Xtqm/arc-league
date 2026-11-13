# Design

## Context

Packaging output goes to `dist/` (configured in `electron-builder.json` as `directories.output`). electron-builder overwrites files with identical names but never prunes artifacts from earlier versions, so the directory accumulates leftovers from retired product names and removed targets (observed: `TRON DISC ARENA 1.0.0` installers alongside current `ARC LEAGUE` builds). Local packaging entry points are npm scripts (`desktop:build` = `electron-builder --win`, `desktop:build:all` = `electron-builder -mwl`); `desktop:steam` runs its own `electron-builder --win --dir` inside `desktop/build-steam.cjs` and consumes `dist/win-unpacked` immediately.

See `proposal.md` for motivation and `specs/desktop-shell/spec.md` for behavioral requirements.

## Goals / Non-Goals

**Goals:**
- Deterministic local packaging output: `dist/` contains only artifacts from the current build.
- Fail fast when stale output cannot be removed, instead of packaging into a polluted directory.
- Cross-platform execution (Windows/macOS/Linux dev machines) with zero new dependencies.

**Non-Goals:**
- GitHub Releases retention or deletion (separate decision: keep all releases indefinitely).
- Changes to `desktop:steam` and `desktop/build-steam.cjs` (its unpacked output is rebuilt wholesale by electron-builder and consumed immediately).
- Any change to CI workflow behavior (runners start from clean checkouts; the wipe is a no-op there).

## Decisions

### Decision 1: Standalone Node script (`desktop/clean-dist.cjs`) wired into npm scripts
- **Rationale**: Matches the existing `desktop/` pattern (`build-steam.cjs`); plain `fs.rmSync(path, { recursive: true, force: true })` is synchronous, dependency-free, and behaves identically on all platforms. `force: true` gives the safe no-op when `dist` does not exist.
- **Alternatives Considered**:
  - *Shell `rm -rf dist &&` prefix in package.json*: Not portable to Windows `cmd.exe` without shims.
  - *`rimraf` dependency*: Extra dependency for a two-line operation.
  - *electron-builder `beforeBuild` hook*: Would centralize the wipe inside electron-builder config, but it would also fire for `desktop:steam`'s `--dir` build (out of scope) and hides the behavior from the scripts developers invoke.

### Decision 2: Wipe runs before electron-builder, failing the script on error
- **Rationale**: The spec's cleanup-failure scenario requires the build to fail *before* generating anything. A synchronous `fs.rmSync` that throws exits the npm script with a non-zero code before electron-builder starts (npm `&&` chaining). The script prints the removed directory so the failure is self-explanatory (e.g., an installer locked by a running app).

### Decision 3: Only wipe the configured `dist` directory, resolved from the project root
- **Rationale**: The script deletes exactly `dist/` (path resolved relative to the repo root via `__dirname`, not the CWD) and nothing else. No glob patterns or allow-lists — a fixed, single-directory target minimizes blast radius.

## Risks / Trade-offs

- **[Risk] Wiping removes `dist/win-unpacked` that `desktop:steam` expects**: Only if someone runs `desktop:steam` immediately after a manual wipe without letting it rebuild — but `desktop:steam` runs its own electron-builder pass first, so it is self-sufficient. No mitigation needed beyond keeping `desktop:steam` untouched.
- **[Risk] A running game or installer holds a lock on `dist` files on Windows**: → By design this fails the build early with a clear message; the developer closes the process and re-runs. This is the spec's cleanup-failure scenario.
- **[Trade-off] Local convenience rollback copies are gone**: Old installers are reproducible from git tags (`npm ci && npx electron-builder --win` at that tag), and player-facing rollback relies on GitHub Releases, which keep all versions.

## Migration Plan

None required — behavior change is local to packaging scripts. Rollback is reverting the two `package.json` script lines and deleting the helper.

## Open Questions

None.
