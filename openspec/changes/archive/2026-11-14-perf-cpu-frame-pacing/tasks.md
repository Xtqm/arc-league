# Tasks: CPU Simulation & GC Frame Pacing

## 1. Trajectory Engine Vector Pooling

- [x] 1.1 Refactor `simulatePath()` in `src/physics/trajectory.js` to eliminate vector cloning and write simulated coordinates directly into reusable typed array buffers; verify with `npm run test:gameplay`.
- [x] 1.2 Refactor `updateTrajectory()` and `updateThreatPaths()` to reuse static module-scoped scratch vectors for aim calculations; verify with `npm run test:gameplay`.
- [x] 1.3 Remove redundant per-frame `computeLineDistances()` calls when trajectory lengths remain steady; verify visual dashed trajectory line rendering.

## 2. Particle & Spark Ring-Buffer Pooling

- [x] 2.1 Implement fixed-capacity `BufferGeometry` particle pool in `src/graphics/particles.js` with position, velocity, and lifespan attributes; verify particle spawning with `npm run test:graphics`.
- [x] 2.2 Refactor `burst()` to activate pre-allocated particle slices without allocating new `Points` meshes; verify visual spark emission during floor breaks and ricochets.
- [x] 2.3 Verify particle cleanup and slot recycling when particle lifespan reaches zero.

## 3. Combat HUD Dirty Checking & Desktop Configuration

- [x] 3.1 Cache all HUD DOM element handles during initialization in `src/ui/hud.js`.
- [x] 3.2 Add state dirty checking for player integrity, disc status, energy, and rival health to skip redundant DOM mutations; verify HUD responsiveness with `npm run test:gameplay`.
- [x] 3.3 Replace per-frame `Vector3` instantiations in `src/entities/Player.js` with reusable scratch vectors; verify with `npm run test:gameplay`.
- [x] 3.4 Update `publish.repo` in `electron-builder.json` from `disc-battle` to `arc-league`; verify JSON syntax and target mapping.

## 4. Verification & Regression Testing

- [x] 4.1 Run gameplay and graphics test suites (`npm run test:gameplay` and `npm run test:graphics`) to ensure 100% test pass rate.
- [x] 4.2 Verify zero memory growth and smooth 60/120 FPS frame-pacing during intensive multi-disc combat in browser.
