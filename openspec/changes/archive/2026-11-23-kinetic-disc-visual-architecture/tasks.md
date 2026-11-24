# Tasks

## 1. Centralized Hex Sanitization & Normalization

- [x] 1.1 Implement `parseCosmeticColor(hex, fallback)` in `src/graphics/materials.js` and re-export in `src/armory/CosmeticMaterialEngine.js`, supporting 3-, 4-, 6-, and 8-digit hexes with alpha stripping (`#rrggbbaa` -> `#rrggbb`) and safe fallback without defaulting to white.
- [x] 1.2 Add dedicated unit tests for `parseCosmeticColor` covering 8-digit, 4-digit, 6-digit, 3-digit, number hex, and invalid input strings in `test/armory/cosmetic_material_engine.test.js`, verifying all tests pass.

## 2. Concentric Induction Rotor Geometry & Ballistic Implement Anatomy

- [x] 2.1 Update `createHubGeometry` in `src/graphics/DiscGeometryFactory.js` to construct an intricate concentric induction rotor (stator collar, induction coil vents, and magnetic eye) rather than echoing the outer polygon silhouette, maintaining `normalizeGeometryRadius` parity.
- [x] 2.2 Update `makeDisc` in `src/graphics/materials.js` to configure the ballistic implement architecture: tactile beveled composite PBR airframe (`disc_outer`), smoked hardlight stabilizer face (`disc_face`), and concentric induction rotor (`disc_hub`).
- [x] 2.3 Verify geometry generation and WebGL resource disposal across all procedural shapes (`circle`, `triangle`, `square`, `hexagon`, `shuriken_4`) via `test/graphics/disc_geometry_factory.test.js`.

## 3. Cosmetic Material Engine & Multi-Tone Routing

- [x] 3.1 Refactor `CosmeticMaterialEngine.applyDiscSkin` to sanitize all colors with `parseCosmeticColor`, route `primaryColor` to the kinetic strike blade / PointLight radiance, route `secondaryColor` with HDR emissive boost to `disc_hub`, and style `disc_face` as a smoked hardlight lens.
- [x] 3.2 Refactor `CosmeticMaterialEngine.applyChassisSkin` to sanitize `primaryHex`, `secondaryEmissiveHex`, and `suitHex`, synchronizing the palm-held hover disc (`chassis_back_disc`) and hairline armor edge trim with the active multi-tone architecture.
- [x] 3.3 Verify cosmetic material application, shape swapping, palm disc synchronization, and zero WebGL memory leaks via `npm run test:armory`.

## 4. Catalog & Cosmetic Studio Normalization

- [x] 4.1 Sanitize catalog definitions in `src/armory/ArmoryCatalog.js` (normalizing `disc_custom_01` and any 8-digit hex strings to standard 6-digit hex format).
- [x] 4.2 Update `CosmeticStudioModal.js` input listeners and `formatCatalogCode` to validate inputs and enforce 6-digit hex output format on catalog export.
- [x] 4.3 Verify `CosmeticStudioModal` live turntable updates, input handlers, and code formatting via `test/armory/cosmetic_studio_modal.test.js`.

## 5. End-to-End Visual & Test Verification

- [x] 5.1 Run full suite `npm test` across all 77 test suites to confirm zero regressions across auth, storage, economy, armory, graphics, combat, and gameplay.
- [x] 5.2 Validate that the custom disc with `#000000` primary and `#ffffff` secondary renders as a stealth obsidian composite hull with a piercing white induction core and white telemetry wireframe in preview bay and active matches.
