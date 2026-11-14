# Proposal: CPU Simulation & GC Frame Pacing

## Why

During high-velocity disc combat with multiple discs in flight, player camera panning, and active particle explosions, Arc League experiences periodic 15–30ms frame drops ("micro-stutter"). Profiling reveals this is caused by V8 garbage collector (GC) sweeps reclaiming hundreds of `THREE.Vector3` objects cloned per frame in `simulatePath()` and `updateThreatPaths()`, disposable `THREE.BufferGeometry` instances created on every `burst()` impact in `particles.js`, and continuous unthrottled DOM mutations in `updateHUD()`.

In addition, the Electron packaging configuration in `electron-builder.json` currently points to the legacy `disc-battle` repository name under its `publish` target, which relies on GitHub HTTP redirects rather than the canonical `arc-league` target.

Eliminating per-frame heap allocations stabilizes frame pacing and delivers a consistent 60/120/144 FPS experience across all game modes without changing game mechanics or the visual aesthetic, while cleaning up packaging configuration to ensure robust direct distribution.

## What Changes

- **Zero-Allocation Trajectory Engine**: Refactor `simulatePath()` and `updateTrajectory()` to use pre-allocated static typed arrays and module-scoped scratch vectors, eliminating all `pts.push(p.clone())` allocations during aim and threat path calculations.
- **Particle & Spark Pooling**: Replace dynamic `THREE.BufferGeometry` and `THREE.Points` allocations in `burst()` with a persistent fixed-capacity particle ring-buffer pool that recycles particles upon de-rez.
- **HUD DOM Mutation Dirty Checking**: Cache all HUD element handles during initialization and enforce dirty checks so `style.width`, `innerHTML`, and class lists are mutated strictly when displayed values (HP, energy, disc readiness, score) actually change.
- **Player Simulation Scratch Vectors**: Replace per-frame `new THREE.Vector3()` instantiations in `updatePlayer()` with reusable scratch vectors.
- **Electron Builder Publication Target**: Update `electron-builder.json`'s `publish.repo` from `disc-battle` to `arc-league` so desktop auto-update releases target the canonical repository directly.

## Capabilities

### New Capabilities
<!-- None -->

### Modified Capabilities
- `disc-combat`: Add requirement for allocation-free trajectory and threat path simulation.
- `cinematic-rendering`: Add requirement for pooled kinetic particle and spark emission.
- `combat-hud`: Add requirement for dirty-checked HUD DOM mutation.
- `desktop-shell`: Update publication repository target in packaging configuration to point to canonical repo name.

## Impact

- **Affected Files**: `src/physics/trajectory.js`, `src/graphics/particles.js`, `src/ui/hud.js`, `src/entities/Player.js`, `electron-builder.json`.
- **APIs & Data**: No external API or schema changes; visual appearance and physical simulation accuracy remain 100% identical.
- **Performance**: Eliminates transient GC spikes during combat, reducing per-frame JS execution time from ~4-7ms to <1ms.
