# Tasks

## 1. Build and Packaging Configuration

- [x] 1.1 Configure GitHub Releases publish provider in `electron-builder.json` targeting repository `Xtqm/disc-battle` and verify valid JSON structure.
- [x] 1.2 Verify `electron-updater` dependency in `package.json` and verify `package-lock.json` is clean and synchronized.

## 2. Main Process Update Lifecycle

- [x] 2.1 Implement `electron-updater` lifecycle handlers in `desktop/main.cjs` with production packaging checks (`app.isPackaged`) and automated test bypass (`ELECTRON_TEST_MODE=1`).
- [x] 2.2 Expose update status events and install triggers through `desktop/preload.cjs` IPC bridge (`desktop:update-available`, `desktop:update-downloaded`, `desktop:install-update`).
- [x] 2.3 Verify desktop application initialization and automated test execution with `ELECTRON_TEST_MODE=1 npm run desktop:dev`.

## 3. In-Game Update Notification

- [x] 3.1 Add non-intrusive update notification banner or lobby toast in the renderer client displaying when an update is downloaded and ready for next restart.
- [x] 3.2 Verify update event reception and display behavior in the client UI without obstructing combat controls or canvas rendering.

## 4. CI/CD Release Manifest Workflow

- [x] 4.1 Update `.github/workflows/release.yml` artifact upload and release consolidation steps to include generated `*.yml` update manifests (`latest.yml`, `latest-linux.yml`, `latest-mac.yml`).
- [x] 4.2 Validate workflow configuration syntax and artifact glob patterns across Windows, Linux, and macOS jobs.
