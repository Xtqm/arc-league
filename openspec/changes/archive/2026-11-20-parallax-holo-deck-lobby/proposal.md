# Proposal: Parallax Holo-Deck Lobby with Kinetic Disc Throw & Pixel Shatter

## Why

The current 3D lobby places players inside a vast, dark, empty arena where pointer lock traps the mouse cursor, locomotive walking creates unnecessary friction before match launch, settings are buried inside pause/identity sub-menus, and pressing ESC or P unintentionally triggers the in-game pause menu. This change re-envisions the lobby as an intimate, 1st-person "Parallax Holo-Deck" cockpit where all mode options are right in the player's face, the mouse cursor remains permanently unlocked with subtle camera parallax, clicking a core launches a kinetic disc throw that shatters the node into neon pixels, and canceling cinematically re-assembles the core.

## What Changes

- **Stationary 1st-Person Holo-Deck Cockpit**: Anchors the player camera at a central console platform in 1st-person view only (disabling 3rd-person toggle in lobby), arranging interactive holographic cores in a tight panoramic arc directly in front of the player (3-5m distance).
- **Free-Cursor Parallax Camera**: Removes pointer lock requirements in the lobby. Moving the mouse cursor smoothly parallaxes the 3D camera with damped tilt (lerped $\pm 8^\circ$ yaw, $\pm 5^\circ$ pitch) while keeping the system neon mouse cursor free to interact with header controls and settings.
- **Kinetic Disc Launch & Pixel Shatter**: Clicking or tapping an Energy Core launches an Identity Disc from off-screen into the targeted node (~0.25s flight time), accompanied by a kinetic whoosh sound. Upon impact, the core mesh and floating badge shatter outward into 100-150 glowing neon voxel particles, triggering a screen pulse and sliding open the mode drawer.
- **Cinematic Re-Assembly on Cancel / Dismiss**: Clicking `[ CANCEL ]` on the mode drawer, pressing `ESC`, or closing an armory/settings modal plays a cinematic reverse-particle glitch re-assembly effect that reconstructs the shattered core and restores full interactive state.
- **Input Concurrency Lockout & Debounce**: Once a core is clicked and disc launch begins, further clicks on 3D canvas cores are ignored until the action resolves into a launch or is cancelled, preventing duplicate spawns or conflicting state transitions.
- **DOM Header Occlusion Protection**: 3D raycasting is suppressed when the cursor is positioned over the top navigation header (`#identityHeader`) or any open modal overlay.
- **Direct Settings Access**: Replaces hidden settings access with a dedicated top-header gear icon button (`[ ⚙ ]`) alongside `[ SECURE IDENTITY ]` and introduces a physical `[ SETTINGS ]` holographic core in the Holo-Deck arc.
- **Contextual Key Isolation (`ESC`, `P`, `WASD`)**:
  - `WASD`, Arrow keys, and Spacebar are disabled in the lobby to keep the player anchored at the Holo-Deck station.
  - `KeyP` is inert in the lobby.
  - `Escape` cancels open drawers/modals and triggers core re-assembly. At root lobby, `Escape` prompts an exit confirmation dialog in the desktop Electron shell, while remaining inert in web browsers.

## Capabilities

### New Capabilities
None.

### Modified Capabilities
- `game-modes`: Refines `Interactive Playable Arena Lobby` and `Energy Core Launch Confirmation` to replace free-roaming pointer-locked arena locomotion with the stationary 1st-person Parallax Holo-Deck, kinetic disc throw animation, pixel shatter on impact, cinematic re-assembly on cancel/ESC, and click concurrency lockout.
- `system-settings`: Updates `In-Game Settings Modal Interface` to introduce direct access via top header gear icon and 3D Settings Core, and updates `Lobby Core Confirmation and Perspective Preferences` to enforce 1st-person lobby perspective and add a `menuParallax` toggle.
- `desktop-shell`: Extends native desktop shortcut suppression and lifecycle management to handle `Escape` key at root lobby as an application exit confirmation dialog on desktop builds while keeping browser sessions unaffected.

## Impact

- **3D Graphics & Scene**: `src/ui/lobbyCores.js`, `src/graphics/scene.js`, `src/graphics/particles.js` for camera parallax damping, tight core arc positioning, disc throw projectile animation, voxel shatter particles, and reverse re-assembly animation.
- **Input & Controls**: `src/input/mouse.js`, `src/input/keyboard.js` for free-cursor raycasting, header occlusion detection, pointer lock bypass in lobby, and `ESC`/`P`/`WASD` lobby isolation.
- **User Interface & Modals**: `src/ui/menus.js`, `src/ui/authTerminal.js`, `index.html` for top header gear icon button, mode drawer slide transitions, cancel/confirm handlers, and desktop exit prompt.
- **Settings Store**: `src/core/settings.js` for `menuParallax` preference setting.
