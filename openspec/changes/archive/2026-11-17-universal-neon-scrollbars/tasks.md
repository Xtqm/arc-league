# Tasks: Universal Neon Scrollbars

## 1. Branch Setup

- [x] 1.1 Verify git working tree is clean and switch to or create branch `change/universal-neon-scrollbars` using `git checkout -b change/universal-neon-scrollbars`

## 2. Global Scrollbar Styling Implementation

- [x] 2.1 Update `index.html` `<style>` to replace scoped `.card::-webkit-scrollbar*` rules with universal standard CSS (`scrollbar-width: thin`, `scrollbar-color`) and WebKit pseudo-elements (`::-webkit-scrollbar`, `::-webkit-scrollbar-track`, `::-webkit-scrollbar-thumb`, `::-webkit-scrollbar-button`, `::-webkit-scrollbar-corner`) with cyan glow and hover feedback
- [x] 2.2 Verify `.card` retain its touch-scrolling and momentum properties (`touch-action: pan-y`, `overscroll-behavior: contain`, `-webkit-overflow-scrolling: touch`) while inheriting the universal scrollbar rules

## 3. Verification & Cross-View Testing

- [x] 3.1 Run test suite via `npm test` and verify all unit and integration tests pass cleanly
- [x] 3.2 Validate visual presentation of custom scrollbars in scrollable views including the Trophy Matrix list (`#trophyCardsList`), Armory catalog pane (`.armory-catalog-pane`), Campaign card (`.campaign-card`), and Duel map selector (`.duel-map-selector-wrapper`)
