# Design: CPU Simulation & GC Frame Pacing

## Context

See `proposal.md` for motivation. The physics and rendering update loop runs at the display refresh rate (60–144 Hz). Currently, `simulatePath()` allocates an array of cloned `Vector3` points on every frame for both player aim and enemy discs. `particles.js` allocates fresh `BufferGeometry` and `Points` objects for every spark burst, while `updateHUD()` polls DOM elements and writes to `style` and `innerHTML` regardless of whether values changed.

Additionally, the Electron packaging configuration in `electron-builder.json` specifies `"repo": "disc-battle"`, relying on GitHub HTTP redirects rather than pointing to the canonical `arc-league` repository.

## Goals / Non-Goals

**Goals:**
- Eliminate per-frame heap allocations in `simulatePath()`, `updateTrajectory()`, and `updateThreatPaths()`.
- Replace dynamic geometry/material creation in `burst()` with a persistent particle pool.
- Eliminate DOM layout thrashing in `updateHUD()` via cached handles and dirty-state checking.
- Preserve 100% mathematical and visual equivalence with current gameplay.
- Update `electron-builder.json` to target the canonical `arc-league` repository directly.

**Non-Goals:**
- Altering trajectory aerodynamics, ricochet mechanics, or curve rates.
- Altering spark colors, physics, or visual lifespans.
- Changing HUD CSS styling or component architecture.

## Decisions

### Decision 1: Fixed Float32Array and In-Place Vertex Buffer Updates
- **Rationale**: Trajectory lines in Three.js only need vertex positions in a `THREE.BufferAttribute`. Rather than building an intermediate array of `Vector3` objects and copying them, `simulatePath()` writes directly to a reusable Float32Array buffer.
- **Alternatives Considered**:
  - *Instantiating an array of reusable Vector3 objects*: Still incurs array iteration overhead and bounds checks. Writing directly to Float32Array eliminates all object wrappers.

### Decision 2: Fixed-Capacity Ring-Buffer Particle Pool
- **Rationale**: A persistent `THREE.Points` mesh with a 600-particle `BufferGeometry` (positions, velocities, colors, and lifespans) can be added to the scene once. New bursts simply activate slices of this buffer via a write head cursor.
- **Alternatives Considered**:
  - *Object pool of individual Points meshes*: Better than recreation, but multiple Points meshes increase scene graph traversal overhead. A single batched Points mesh performs all updates in one draw call.

### Decision 3: Cached Elements and Value-State Dirty Checking in HUD
- **Rationale**: Checking `if (state.player.hp !== lastRenderedHp)` before touching `style.width` avoids forced browser style recalculations and reflows.
- **Alternatives Considered**:
  - *Virtual DOM or reactive framework*: Adds heavy external dependencies; simple scalar comparison variables (`lastHp`, `lastEnergy`, `lastDisc`) achieve maximum performance with zero dependencies.

### Decision 4: Update Canonical Electron Builder Publish Repository
- **Rationale**: The project was officially renamed from `disc-battle` to `arc-league`. While GitHub currently forwards requests via HTTP redirects, relying on redirects introduces unnecessary network hops and risks silent update discovery failures. Setting `"repo": "arc-league"` under `publish` ensures direct manifest resolution.
- **Alternatives Considered**:
  - *Retain redirect*: Vulnerable to future repository transfer or redirect expiration. Direct canonical configuration is clean and deterministic.

## Risks / Trade-offs

- **[Scratch vector re-entrancy / state pollution]** → Mitigation: Use distinct, explicitly named module-scoped scratch vectors (`_trajOrigin`, `_trajDir`, `_simPos`, `_simVel`) that are never shared across asynchronous boundaries or nested function calls.
- **[Particle pool exhaustion during massive explosions]** → Mitigation: Size the pool to 600 particles and use round-robin overwriting of the oldest active particles if the pool is full, avoiding visual drops while preventing out-of-memory errors.
