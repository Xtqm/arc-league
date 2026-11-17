# Design: Playable 3D Lobby & Onboarding Calibration

## Context

Arc League currently initializes directly into a 2D HTML card overlay (`#mainMenu` in `index.html`), presenting players with keybinding lists and menu buttons prior to any 3D gameplay interaction. Browsers enforce user-gesture constraints on Pointer Lock and Web Audio autoplay, requiring deliberate interaction to enable immersive controls and audio. Additionally, camera distance is statically locked to third-person with mouse-wheel event listeners directly mutating look sensitivity during live combat.

See `proposal.md` for motivation and background.

## Goals / Non-Goals

**Goals:**
- Provide a zero-friction, browser-compliant cold open terminal that establishes pointer lock and Web Audio in a single click.
- Implement an in-media-res continuous 3-beat calibration sequence that teaches Strike, Slow-Mo Parry, and Curve/Ricochet targeting in under 25 seconds.
- Deliver an interactive 3D Playable Arena Lobby replacing static 2D menu overlays with physical holographic Energy Cores.
- Support seamless dual-perspective camera toggling (1P / 3P) across all game modes with smooth lerp interpolation.
- Relocate mouse sensitivity strictly into System Settings to prevent accidental DPI changes from mouse-wheel scrolling.
- Maintain full backward compatibility for automated headless puppeteer tests by preserving DOM button IDs.

**Non-Goals:**
- Multiplayer tutorial / co-op training (calibration is strictly single-player client-side).
- Rebuilding the campaign circuit structure (calibration simply registers as the prerequisite clear for Grid 01 Star 1).
- Overhauling the existing disc flight physics engine (calibration uses existing Magnus and Euler collision calculations).

## Decisions

### 1. Unified Browser Gesture Cold Open via Cyberpunk Boot Terminal
- **Choice**: Display a fullscreen minimalist terminal (`#bootTerminal`) on first visit: "SUB-STRATA RIG DETECTED - CLICK TO SYNCHRONIZE".
- **Rationale**: Browsers strictly forbid pointer lock and audio autoplay without a direct user gesture. Wrapping this constraint in diegetic cyberpunk styling transforms a browser limitation into an atmospheric narrative beat.
- **Alternatives Considered**: 
  - *Standard browser dialog/button*: Felt generic and broke immersion.
  - *Auto-locking without gesture*: Fails silently across Chrome, Edge, Safari, and Firefox.

### 2. Continuous Single-Sector Calibration Without Interstitial Modals
- **Choice**: Execute Beats 1, 2, and 3 in a continuous loop within a dedicated calibration sub-mode (`state.gameMode = 'calibration'`).
- **Rationale**: Interstitial victory modals or "Click Next" buttons destroy arcade momentum. Spawning progressive targets seamlessly within the live arena keeps the adrenaline flowing.
- **Alternatives Considered**:
  - *Multi-stage mini levels with loading screens*: Breaks flow and adds unnecessary state transitions.
  - *Static target shooting range*: Fails to teach active parry deflection or curve trajectory mechanics.

### 3. Holographic Energy Cores with Bounded Collision & Confirmation
- **Choice**: Render 3D geometric constructs (octahedral, icosahedral, toroid, hexagonal) for `CIRCUIT`, `SURVIVAL`, `DUELS`, and `ARMORY` around the lobby perimeter. When struck by a disc or clicked, open a holographic confirmation modal (toggleable in settings, default ON).
- **Rationale**: Throwing a disc to select a mode reinforces the core disc fantasy. The confirmation modal prevents accidental throws from abruptly starting matches, while advanced players can disable it for instant speed-running.
- **Alternatives Considered**:
  - *Immediate launch on disc contact without confirmation*: Too easy to trigger unintentionally while practicing throws in the lobby.
  - *2D floating HTML buttons mapped to 3D positions*: Lacks depth and physical kinetic feel.

### 4. Dual-Perspective Interpolation via Camera Controller
- **Choice**: Manage camera distance and height using a normalized blend factor (`0.0` for 1P, `1.0` for 3P) in `updateCamera(dt)`:
  - 3P: `DIST = 9.0`, `HEIGHT = 4.3`, `SHOULDER = 1.7`
  - 1P: `DIST = 0.0`, `HEIGHT = 1.8`, `SHOULDER = 0.0`
- **Mesh Handling**: In 1P, hide the athlete head and chest meshes from the active render pass while keeping arm bones and the kinetic disc in view.
- **Alternatives Considered**:
  - *Instant camera teleport*: Disorienting and jarring to player spatial awareness.
  - *Lobby-only first person*: Arbitrarily restricts player agency in competitive modes.

### 5. Centralizing Sensitivity to System Settings
- **Choice**: Eliminate the `wheel` event listener in `src/input/mouse.js` that previously multiplied `state.sens`. Add a precision slider in `SYSTEM CONFIG`.
- **Rationale**: Competitive players frequently scroll the mouse wheel accidentally during intense mouse flicking or parrying. Accidental sensitivity shifts destroy muscle memory.
- **Alternatives Considered**:
  - *Retaining wheel sensitivity behind a modifier key (e.g., Ctrl+Wheel)*: Still prone to misclicks and adds unnecessary cognitive load.

## Risks / Trade-offs

- **[Risk] First-time players invited by friends get trapped in calibration** → *Mitigation*: Render a persistent `[ESC / START] BYPASS TO LOBBY` HUD prompt throughout all calibration beats, allowing instant skip directly to the online duels core.
- **[Risk] Puppeteer automated test runner expects static `#mainMenu` DOM buttons** → *Mitigation*: Keep `#campaignBtn`, `#swarmBtn`, `#hostMatchBtn`, etc., present in the DOM tree in an invisible/accessible container so existing tests execute without modification.
- **[Risk] First-person view clips through character geometry during backwards dashing** → *Mitigation*: Automatically disable head/torso meshes when the camera blend factor is under 0.2.
