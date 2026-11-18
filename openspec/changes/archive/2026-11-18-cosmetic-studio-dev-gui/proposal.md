# Proposal: Cosmetic Studio Dev GUI

## Why

Creating and fine-tuning new cosmetics currently requires manual file editing, guessing hex colors and PBR numbers, and repeatedly reloading the browser to inspect the result in 3D. 

A dedicated in-browser developer studio—accessible via `window.gameDebug.openStudio()` or `window.gameDebug.armory.openStudio()`—provides real-time parameter tweaking, live 3D turntable previewing, instant in-game testing, and one-click code generation for `ArmoryCatalog.js`. This dramatically accelerates cosmetic creation for local development.

## What Changes

- **Console Entry Point**: Expose `window.gameDebug.openStudio()` and `window.gameDebug.armory.openStudio()` in the browser developer console to mount and toggle the Cosmetic Studio overlay.
- **Interactive Studio UI (`src/ui/modals/CosmeticStudioModal.js`)**:
  - Split-pane interface featuring a 3D turntable preview bay on the left and visual design controls on the right.
  - Category selector supporting Kinetic Discs and Athlete Rigs.
  - Live color pickers (`<input type="color">`) for `primaryHex`, `secondaryEmissiveHex`, and `suitHex`.
  - Numeric range sliders with real-time feedback for `glowIntensity`, `trailOpacity`, `roughness`, and `metalness`.
  - Checkbox toggle for retro wireframe overlays.
  - Form fields for metadata: `id`, `displayName`, `description`, `unlockType` (Free, Bits, Achievement), and `cost`.
- **Live Reactive 3D Feedback**: Instantaneous material mutation on the turntable mesh via `CosmeticMaterialEngine` as inputs change, eliminating refresh cycles.
- **In-Game Testing**: "Test on Player" action that immediately applies the live studio cosmetic to the active player model in the background arena using `CosmeticMaterialEngine`.
- **One-Click Code Generator**: "Copy Catalog Code" button that formats a schema-compliant, frozen JavaScript definition ready to paste directly into `src/armory/ArmoryCatalog.js`.
- **Zero Production Pollution**: The studio assets, DOM container, and event listeners exist purely as developer tools and do not alter regular player storefront flows or release performance.

## Capabilities

### Modified Capabilities
- `armory-catalog`: Extends the Armory capability with requirements for the developer cosmetic studio interface, real-time shader/PBR parameter previewing, live test application, and formatted catalog code generation.

## Impact

- **Affected Systems**:
  - `src/armory/ArmoryManager.js` (debug suite expansion)
  - `src/ui/modals/CosmeticStudioModal.js` (new developer modal controller)
  - `index.html` (mount container `#cosmeticStudioModal` and cyber-styled CSS)
  - `test/armory/cosmetic_studio_modal.test.js` (unit and integration tests)
- **Dependencies**: No external npm dependencies; leverages existing Three.js turntable (`ArmoryPreviewScene`), `CosmeticMaterialEngine`, and `ArmoryCatalog`.
