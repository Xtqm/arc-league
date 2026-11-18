# Tasks

## 1. Studio Layout & UI Modal Controller

- [x] 1.1 Add `#cosmeticStudioModal` container and cyber-grid styling to `index.html`, verifying DOM presence in test harness.
- [x] 1.2 Implement `CosmeticStudioModal` in `src/ui/modals/CosmeticStudioModal.js` supporting category switching, color pickers, sliders, and action buttons, and verify modal instantiation with unit test.
- [x] 1.3 Expose `window.gameDebug.openStudio` and `window.gameDebug.armory.openStudio` in `src/armory/ArmoryManager.js` and verify browser console invocation hooks.

## 2. Interactive 3D Turntable & Live Parameter Tuning

- [x] 2.1 Integrate `ArmoryPreviewScene` into `CosmeticStudioModal`, verifying turntable rendering and clean camera framing for both Discs and Athlete Rigs.
- [x] 2.2 Bind real-time `input` event listeners to mutate Three.js materials in-place via `CosmeticMaterialEngine`, verifying zero-delay visual updates.
- [x] 2.3 Implement the "Test on Player" action button to apply current studio configurations directly to active gameplay character meshes via `cosmeticMaterialEngine`.

## 3. Code Generation, Clipboard Export & Verification

- [x] 3.1 Implement "Copy Catalog Code" export utility in `CosmeticStudioModal.js` generating schema-compliant `ArmoryCatalog.js` code blocks with clipboard and console output.
- [x] 3.2 Create unit test suite `test/armory/cosmetic_studio_modal.test.js` verifying UI mounting, live parameter serialization, code generator formatting, and WebGL resource teardown.
- [x] 3.3 Run `npm run test:armory` to verify that all armory unit tests and preview scene integration checks pass with 100% success.
