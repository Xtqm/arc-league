# Design: Universal Neon Scrollbars

## Context

Current UI styles in `index.html` define scrollbar aesthetics exclusively for `.card::-webkit-scrollbar*`. Because web standards treat scrollbar pseudo-elements as non-inheritable, nested scrollable containers (`#trophyCardsList`, `.armory-catalog-pane`, `.campaign-card`, `.duel-map-selector-wrapper`) default to the host platform's native GUI scrollbars. See `proposal.md` for background and affected areas.

## Goals / Non-Goals

**Goals:**
- Provide a universal, automated scrollbar presentation for all scrollable views in `index.html` and dynamic UI modals.
- Implement both standard W3C CSS (`scrollbar-width`, `scrollbar-color`) and WebKit pseudo-elements (`::-webkit-scrollbar*`) to guarantee compatibility across Electron (Chromium) and external browsers.
- Eliminate native OS stepper arrows and clunky scrollbar track backgrounds.
- Provide interactive hover feedback on the scrollbar thumb.

**Non-Goals:**
- In-game customizable theme palette picker (deferred to a future release per user confirmation).
- Heavy JavaScript-driven virtual scrollbar libraries (e.g., SimpleBar, PerfectScrollbar); pure CSS delivers 60 FPS hardware acceleration, zero dependency overhead, and native touch compatibility.

## Decisions

### 1. Pure CSS over JavaScript Scrollbar Libraries
- **Choice**: Implement native CSS scrollbar customization using standard CSS (`scrollbar-width`, `scrollbar-color`) combined with WebKit vendor pseudo-elements.
- **Rationale**: The game runs on Electron and modern web browsers. CSS scrollbars introduce 0 KB of script bundle overhead, execute on the browser compositor thread without JS event lag, and do not break native touch-scrolling or keyboard navigation.
- **Alternatives Considered**: JavaScript overlay libraries (SimpleBar, OverlayScrollbars). Rejected because they require DOM wrapping, extra bundle payload, and can desync during dynamic modal re-rendering.

### 2. Universal Scoping via Root and Wildcard Selectors
- **Choice**:
  ```css
  * {
    scrollbar-width: thin;
    scrollbar-color: var(--cyan) rgba(0, 15, 20, 0.6);
  }
  ::-webkit-scrollbar {
    width: 6px;
    height: 6px;
  }
  ::-webkit-scrollbar-track {
    background: rgba(0, 15, 20, 0.6);
    border-radius: 4px;
  }
  ::-webkit-scrollbar-thumb {
    background: var(--cyan);
    border-radius: 4px;
    box-shadow: 0 0 8px var(--cyan);
  }
  ::-webkit-scrollbar-thumb:hover {
    background: #a6f9ff;
    box-shadow: 0 0 12px #a6f9ff;
  }
  ::-webkit-scrollbar-button {
    display: none;
    width: 0;
    height: 0;
  }
  ::-webkit-scrollbar-corner {
    background: rgba(0, 15, 20, 0.6);
  }
  ```
- **Rationale**: Attaching to `::-webkit-scrollbar` globally targets the document root as well as all descendant scroll containers without having to add utility classes to every component file.

### 3. Explicit Stepper Suppression and Corner Masking
- **Choice**: Explicitly declare `display: none` and `width: 0; height: 0` on `::-webkit-scrollbar-button`.
- **Rationale**: On Windows desktop environments, Chromium can render default triangle up/down stepper buttons unless explicitly hidden. Setting the corner background ensures containers with simultaneous X and Y overflow don't reveal a white junction square.

## Risks / Trade-offs

- **[Touch Device Inertia & Overlays]** → On mobile iOS/Android touch devices, browsers often render ephemeral overlay scrollbars. Existing styles in `index.html` already declare `-webkit-overflow-scrolling: touch` and `touch-action: pan-y`, ensuring native swipe momentum is preserved.
- **[Horizontal Overflow Sizing]** → If an element overflows horizontally, omitting `height` can lead to disproportionate default bar heights. Setting `height: 6px` alongside `width: 6px` mitigates this risk.
