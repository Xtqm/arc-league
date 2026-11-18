# Design: Cosmetic Studio Dev GUI

## Context

Tron Disc Arena possesses a high-fidelity Three.js turntable preview renderer ([ArmoryPreviewScene.js](file:///c:/Users/caleb/Documents/Coding/Games/Tron-Game/src/armory/ArmoryPreviewScene.js)) and a centralized cosmetic material engine ([CosmeticMaterialEngine.js](file:///c:/Users/caleb/Documents/Coding/Games/Tron-Game/src/armory/CosmeticMaterialEngine.js)). Recent modularization unified chassis PBR properties into catalog shader parameters and added dynamic catalog registration.

However, designing new cosmetics still requires guessing color hex codes and numeric ranges, manually editing source files, and reloading the application. See `proposal.md` for motivation.

## Goals / Non-Goals

**Goals:**
- Provide a responsive in-browser developer studio overlay accessible via `window.gameDebug.openStudio()`.
- Render an isolated, interactive 3D turntable preview showing changes in real time as sliders and color pickers are adjusted.
- Support both Kinetic Discs and Athlete Rigs with appropriate controls (trims, halos, visor, suit plating, roughness, metalness, glow, wireframe).
- Provide a "Test on Player" button to inject the active design directly onto the live in-game player character.
- Provide a "Copy Catalog Code" button that outputs ready-to-paste, formatted JavaScript for [ArmoryCatalog.js](file:///c:/Users/caleb/Documents/Coding/Games/Tron-Game/src/armory/ArmoryCatalog.js).

**Non-Goals:**
- Direct file system writes from the browser client (browsers restrict arbitrary local filesystem writes; clipboard copying is reliable and transparent).
- Public end-user access (this is strictly a local development and modding acceleration tool).

## Architecture & Data Flow

```
+-------------------------------------------------------------+
| Browser Console: window.gameDebug.openStudio()              |
+------------------------------+------------------------------+
                               | mounts
                               v
+-------------------------------------------------------------+
| CosmeticStudioModal (src/ui/modals/CosmeticStudioModal.js)  |
+------------------------------+------------------------------+
         |                                    |
         | uses                               | updates in real-time
         v                                    v
+-----------------------+            +-----------------------+
| ArmoryPreviewScene    |            | Form Controls:        |
| (3D Turntable Bay)    |<-----------| - Color Pickers       |
+-----------------------+  onInput   | - Sliders / Toggles   |
                                     +-----------------------+
                                                  |
              +-----------------------------------+-----------------------------------+
              |                                                                       |
              v                                                                       v
   [ Test on Player ]                                                     [ Copy Catalog Code ]
              |                                                                       |
              v                                                                       v
  CosmeticMaterialEngine                                                    Formatted JS Object
  mutates active playerObj & disc                                           copied to Clipboard
```

## Decisions

### 1. Reuse `ArmoryPreviewScene` for the 3D Preview Bay
- **Decision**: Instantiate an `ArmoryPreviewScene` instance inside the studio modal container rather than writing custom WebGL rendering logic.
- **Rationale**: `ArmoryPreviewScene` already provides three-point studio lighting, touch/mouse turntable dragging, camera framing presets for both Discs and Programs, and zero-leak WebGL resource disposal.
- **Alternatives Considered**: Creating a bespoke canvas renderer. Rejected as redundant maintenance overhead.

### 2. In-Place Material Mutation on Input Events
- **Decision**: Mutate existing Three.js materials in-place on standard DOM `input` events using `CosmeticMaterialEngine.applyDiscSkin` and `applyChassisSkin`.
- **Rationale**: Provides buttery 60 FPS real-time feedback without garbage collection thrashing or mesh reconstruction latency.
- **Alternatives Considered**: Re-instantiating the 3D meshes on every slider movement. Rejected due to stutter and memory fragmentation.

### 3. Developer Console Lifecycle Hooks
- **Decision**: Expose `window.gameDebug.openStudio()` and `window.gameDebug.armory.openStudio()` on the global debug namespace, auto-initialized on game boot.
- **Rationale**: Keeps the player-facing HUD and menus clean while granting instant access during development and testing.
- **Alternatives Considered**: Adding permanent dev buttons to the main menu. Rejected to maintain production UI purity.

### 4. Clipboard Code Generator with Console Fallback
- **Decision**: Format output using `JSON.stringify` or template literal syntax formatted as canonical `Object.freeze({...})` code, written via `navigator.clipboard.writeText()` with a fallback to `console.log()`.
- **Rationale**: Allows developers to tweak a skin visually, click copy, and paste directly into `ArmoryCatalog.js` in seconds.

## Risks / Trade-offs

- **[Risk] Turntable render loop consuming GPU cycles when modal is hidden.**
  → *Mitigation*: Pause the render loop (`previewScene.pause()`) and freeze turntable RAF whenever the studio modal is closed or hidden.
- **[Risk] Clipboard API permission denied in non-secure or iframe contexts.**
  → *Mitigation*: Catch clipboard rejection, log the formatted code to the developer console, and show a temporary inline fallback textarea with focus/select.
- **[Risk] Interaction conflicts with game pointer lock or gameplay input.**
  → *Mitigation*: Explicitly invoke `document.exitPointerLock()` and set `state.armoryModalOpen = true` upon modal display to isolate input.
