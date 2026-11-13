# Tasks

## 1. Cleanup Helper

- [x] 1.1 Create `desktop/clean-dist.cjs` removing the `dist` directory via `fs.rmSync` (recursive, force, path resolved from project root), logging the removed path, and verify `node --check` passes and running it with no `dist` present exits 0 as a no-op.

## 2. Script Wiring

- [x] 2.1 Prefix `desktop:build` and `desktop:build:all` in `package.json` with `node desktop/clean-dist.cjs &&` and verify valid JSON structure.
- [x] 2.2 Run `ELECTRON_TEST_MODE=1` unaffected sanity: confirm `desktop:dev` script remains unchanged and verify `npm run desktop:build` performs a clean wipe-and-rebuild by running it on Windows and confirming `dist` contains only artifacts from the current run.

## 3. Failure Semantics

- [x] 3.1 Verify the cleanup-failure path: with a locked file inside `dist` (simulated on Windows), `npm run desktop:build` exits non-zero before electron-builder starts and prints a clear error.

## Workflow follow-up

- Archive the change after the project's review requirements are satisfied.
- Verify the archived result.
