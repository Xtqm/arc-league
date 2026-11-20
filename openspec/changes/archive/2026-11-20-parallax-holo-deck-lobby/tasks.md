# Tasks: Parallax Holo-Deck Lobby Implementation

## 1. Scene & Holo-Deck Camera Layout

- [x] 1.1 Update `src/ui/lobbyCores.js` to anchor the player camera at the central Holo-Deck terminal in 1st-person view and position 5 Energy Cores (Circuit, Survival, Online Duels, Armory, and Settings) in a tight 120-degree panoramic arc (4-5m distance) directly in front of the player.
- [x] 1.2 Implement exponential damped camera parallax in `src/graphics/scene.js` / `src/ui/lobbyCores.js` tracking mouse cursor screen coordinates with $\pm 8^\circ$ yaw and $\pm 5^\circ$ pitch clamping, active only when `menuParallax` is enabled.
- [x] 1.3 Add `menuParallax` preference setting (default: true) in `src/core/settings.js` and expose a toggle control in the System Settings modal.

## 2. Kinetic Disc Launch & Pixel Shatter Animation

- [x] 2.1 Implement kinetic disc launch projectile animation in `src/ui/lobbyCores.js` spawning an Identity Disc that travels from the bottom screen edge into the targeted core over ~0.25s with whoosh audio and an atomic `state.lobbyLaunching` input lock.
- [x] 2.2 Implement neon voxel pixel shatter on impact using the pooled particle system in `src/graphics/particles.js`, emitting 120-150 radial voxel particles, hiding the core mesh and text badge, and triggering screen pulse feedback.
- [x] 2.3 Implement cinematic reverse-particle glitch re-assembly in `src/ui/lobbyCores.js` that restores the shattered core mesh, text badge, and idle state when launch is canceled or dismissed.

## 3. UI, Header Gear Icon & Mode Confirmation Drawer

- [x] 3.1 Add a persistent `[ ⚙ ]` gear icon button in `#identityHeader` (`src/ui/authTerminal.js` and `index.html`) wired to open the System Settings modal directly.
- [x] 3.2 Implement the slide-in mode confirmation drawer in `src/ui/lobbyCores.js` / `src/ui/menus.js` displaying mode title, description, `[ CONFIRM ]`, and `[ CANCEL ]` buttons, ensuring click events register cleanly.
- [x] 3.3 Add DOM element occlusion detection in `src/input/mouse.js` using `document.elementFromPoint` to suppress 3D raycasting whenever the cursor is over `#identityHeader` or any open modal overlay.

## 4. Input & Key Isolation (`ESC`, `P`, `WASD`, Pointer Lock)

- [x] 4.1 Update `src/input/mouse.js` to ensure pointer lock is completely bypassed in lobby mode (`gameMode === 'lobby'`), leaving the mouse cursor visible and interactive at all times.
- [x] 4.2 Update `src/input/keyboard.js` to disable locomotion keys (`WASD`, Arrow keys, Spacebar) and `KeyP` pause triggers while in lobby mode.
- [x] 4.3 Update `src/input/keyboard.js` to handle `Escape` contextually in lobby mode: dismiss active mode drawer or modal (triggering core re-assembly), prompt native exit confirmation dialog if in Electron desktop shell, and remain inert in web browsers when at root lobby.

## 5. Verification & Automated Test Suite

- [x] 5.1 Update `test/modes/lobby_cores.test.js` to verify Holo-Deck core layout, parallax camera damping, disc throw animation, pixel shatter and re-assembly lifecycle, and header occlusion suppression.
- [x] 5.2 Execute the complete test runner (`node test/runner.js`) and verify all test suites pass with zero regressions.
