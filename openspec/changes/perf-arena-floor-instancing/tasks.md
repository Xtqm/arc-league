# Tasks: Hybrid Arena Floor Instancing

## 1. Instanced Grid Scaffold & Buffer Management

- [ ] 1.1 Create `InstancedMesh` for 576 arena floor slabs and `InstancedMesh` for 576 edge lines in `src/entities/Arena.js`; verify initialization with `npm run test:graphics`.
- [ ] 1.2 Implement instance matrix population mapping each tile index `(ix, iz)` to its arena center coordinates; verify grid alignment against original world layout.
- [ ] 1.3 Add instance matrix hiding helper `hideInstance(tileIndex)` and restoration helper `showInstance(tileIndex)` with dirty flag management.

## 2. Dynamic Warning Delegate Pool

- [ ] 2.1 Implement fixed pool of 32 reusable dynamic tile meshes with intact, warning, and rebuilding materials.
- [ ] 2.2 Wire `triggerTileWarning()` to hide the instanced slot and claim an active delegate mesh for the warning animation and physical shake; verify with `npm run test:gameplay`.
- [ ] 2.3 Wire rebuilding completion to release the delegate mesh back to the pool and unhide the instanced slot.

## 3. Sector Theming Integration

- [ ] 3.1 Update `applySectorArena()` in `src/entities/Arena.js` to update instanced mesh base materials and colors to match active campaign sector themes.
- [ ] 3.2 Update `teardownSectorArena()` to cleanly restore default cyan/dark-blue instanced palettes.

## 4. Verification & Testing

- [ ] 4.1 Run gameplay test suite (`npm run test:gameplay`) to verify tile collapse and void physics.
- [ ] 4.2 Verify draw calls decrease from ~1,200 to <35 via WebGL renderer info stats while keeping visual warning animations 100% identical.
