# Proposal: Universal Neon Scrollbars

## Why

Currently, custom neon glow scrollbar styling is scoped exclusively to elements with the `.card` CSS class, causing inner scroll containers (such as the Trophy Matrix achievement list, Armory catalog/inspection panes, Campaign sector cards, and Duel map selectors) to display default OS/browser scrollbars with light grey tracks, white thumbs, and stepper buttons. Converting scrollbar styling to universal rules ensures consistent cyberpunk grid aesthetics across all current and future scrollable views in the web and desktop clients.

## What Changes

- Replace the scoped `.card::-webkit-scrollbar*` selectors in `index.html` with universal selectors (`*::-webkit-scrollbar*` and root pseudo-elements).
- Add modern standard CSS `scrollbar-width: thin` and `scrollbar-color: var(--cyan) rgba(0, 15, 20, 0.6)` on all elements (`*`).
- Configure universal scrollbar dimensions (6px width and 6px height for horizontal scrollbars).
- Add track styling with dark cyan-tinted translucency (`rgba(0, 15, 20, 0.6)`) and rounded track borders.
- Add thumb styling with cyan core (`var(--cyan)`), neon glow (`box-shadow: 0 0 8px var(--cyan)`), and interactive hover state.
- Suppress native operating system stepper button arrows (`::-webkit-scrollbar-button { display: none; }`).
- Style scrollbar corners for two-axis scroll areas (`::-webkit-scrollbar-corner`).

## Capabilities

### New Capabilities
- `ui-theme`: Defines global user interface theme styling, cyberpunk design tokens, universal scrollbar behaviors, and surface aesthetics across all HUD, modal, and terminal views.

### Modified Capabilities
*(None)*

## Impact

- **Affected Files**: `index.html` (global `<style>` block).
- **Target Views Benefiting Immediately**:
  - Grid Identity Terminal: Trophy Matrix (`#trophyCardsList`)
  - Campaign Mode: Sector & Grid Selector (`.campaign-card`)
  - Outfitting / Armory Modal: Catalog list (`.armory-catalog-pane`), Inspector (`.armory-inspection-pane`), and responsive split layout (`.armory-split-pane`)
  - Duel Mode: Map Selection List (`.duel-map-selector-wrapper`)
  - Simple modal overlays and system settings cards
- **APIs & Runtime**: Fully compatible with both the Electron desktop shell and modern Chromium/WebKit/Firefox web browsers with no runtime performance impact or external dependencies.
