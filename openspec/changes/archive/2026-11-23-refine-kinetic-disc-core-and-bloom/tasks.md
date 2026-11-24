# Tasks

## 1. Dynamic Shape Clearance & Faceted Hardlight Core Geometry

- [x] 1.1 Implement `getShapeInnerClearance(shape, baseRadius)` in `src/graphics/DiscGeometryFactory.js` to compute minimum inner clearance radius for circles, hexagons, squares, triangles, and shurikens.
- [x] 1.2 Refactor `createHubGeometry` in `src/graphics/DiscGeometryFactory.js` to build a floating faceted energy crystal (`OctahedronGeometry`) framed by a micro-containment ring, dynamically sized to `Math.min(0.12, clearance * 0.48)` so it never touches the outer hull.
- [x] 1.3 Update unit tests in `test/graphics/disc_geometry_factory.test.js` to verify dynamic core sizing and non-overlap across all procedural shapes (`circle`, `hexagon`, `square`, `triangle`, `shuriken_4`).

## 2. Disc Emissive & Luminance Calibration

- [x] 2.1 Calibrate outer rim `emissiveIntensity` in `src/graphics/materials.js` (`makeDisc`) and `src/armory/CosmeticMaterialEngine.js` (`applyDiscSkin`) to $1.3 \times (\text{glowScale} / 1.5)$ to prevent color desaturation and blown-out white glare.
- [x] 2.2 Style the faceted hardlight energy core with `secondaryColor` at calibrated emissive intensity ($1.5 \times (\text{glowScale} / 1.5)$) and PBR specular reflectivity.
- [x] 2.3 Verify cosmetic material engine application and test assertions via `test/armory/cosmetic_material_engine.test.js`.

## 3. Armory Preview Scene Lighting & Bloom Tuning

- [x] 3.1 Lower the turntable preview disc PointLight radiance from 2.4 to 0.8 in `src/armory/ArmoryPreviewScene.js` to eliminate point-blank self-illumination glare on beveled facets.
- [x] 3.2 Configure `CinematicComposer` in `ArmoryPreviewScene.js` with tuned turntable parameters (`threshold: 1.15`, `strength: 0.32`) to ensure crisp beveled geometry with soft atmospheric bloom rather than blinding haze.
- [x] 3.3 Verify Armory preview turntable staging and resize handlers via `test/armory/cosmetic_studio_modal.test.js`.

## 4. Athlete Rig Palm-Held Disc Synchronization

- [x] 4.1 Update `makeProgram` in `src/graphics/materials.js` and `applyChassisSkin` in `src/armory/CosmeticMaterialEngine.js` to ensure the palm-mounted hover disc reflects the faceted energy crystal core and dynamic clearance sizing.
- [x] 4.2 Verify palm disc shape conforming and wireframe lifecycle via `npm run test:armory`.

## 5. Full Test Suite & Visual Verification

- [x] 5.1 Run full test suite `npm test` across all 77 suites to guarantee zero regressions.
- [x] 5.2 Validate that the square disc in Armory view renders with a floating, non-overlapping faceted energy core, crisp beveled edges, and non-blinding atmospheric bloom.
