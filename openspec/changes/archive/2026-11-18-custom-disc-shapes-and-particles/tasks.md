# Tasks

## 1. Procedural Geometry Factory & Shape Generation

- [x] 1.1 Implement `src/graphics/DiscGeometryFactory.js` generating procedural 2D cyber-shapes (`circle`, `triangle`, `square`, `hexagon`, `shuriken_3`, `shuriken_4`) with circumradius normalization ($0.6\text{m}$) and $N$-fold rotational symmetry.
- [x] 1.2 Implement outer rim, translucent face, central hub, and shape-conforming wireframe geometry generation in `DiscGeometryFactory.js`.
- [x] 1.3 Create unit test `test/graphics/disc_geometry_factory.test.js` verifying bounding radius normalization, vertex count validity, and clean resource creation across all supported shapes.

## 2. Cosmetic Material Engine & Mesh Synchronization

- [x] 2.1 Refactor `makeDisc()` in `src/graphics/materials.js` to accept shape options and delegate to `DiscGeometryFactory`.
- [x] 2.2 Update `applyDiscSkin()` in `src/armory/CosmeticMaterialEngine.js` to swap outer rim, face, and wireframe geometries with clean disposal when `item.shape` changes.
- [x] 2.3 Synchronize the player rig's Hover-Palm disc (`chassis_back_disc`) in `CosmeticMaterialEngine.js` to dynamically scale and mirror the equipped disc's shape.
- [x] 2.4 Add unit tests in `test/armory/cosmetic_material_engine.test.js` verifying geometry swapping, wireframe shape matching, palm disc sync, and zero WebGL memory leaks.

## 3. Catalog Definitions, Entity Ricochet Particles & Studio GUI

- [x] 3.1 Update `src/armory/ArmoryCatalog.js` schema to support `shape` and `particles` properties, and add showcase launch skins (`disc_delta_triad`, `disc_quantum_quad`, `disc_shuriken_void`).
- [x] 3.2 Update surface ricochet handling in `src/entities/Disc.js` to trigger catalog-defined spark particle bursts via `burst()` upon wall and obstacle impacts.
- [x] 3.3 Add a `Shape` dropdown selector and particle configuration controls to `src/ui/modals/CosmeticStudioModal.js` to enable real-time shape previewing on the turntable.
- [x] 3.4 Run `npm run test:armory` and `npm run test:graphics` to verify that all armory, geometry, and preview tests pass cleanly with 100% success.
