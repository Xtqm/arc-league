# Tasks: Refine Humanoid Hand Rig

## 1. Branch Setup & Baseline Verification

- [x] 1.1 Switch to or create isolated git branch `change/refine-humanoid-hand-rig` from `main` and verify `git status` reports the active branch.
- [x] 1.2 Run baseline graphics test suite (`node test/runner.js graphics`) to verify test suite passes prior to modifications.

## 2. Hand Rig Implementation

- [x] 2.1 In `src/graphics/materials.js` (`buildConstructLimbs`), construct the compact tapered trapezoidal palm chassis (`width: 0.044m` at wrist base expanding to `0.072m` at knuckle line, `height: 0.048m`, `depth: 0.022m` tapering to `0.015m`).
- [x] 2.2 Implement the arched knuckle bridge and 3 slender articulated phalanges per finger (proximal, intermediate, distal) with natural anatomical length ratios (Middle: `~0.070m`, Index: `~0.063m`, Ring: `~0.066m`, Pinky: `~0.053m`) tapering to slender fingertips.
- [x] 2.3 Implement expressive radial splay angles (Index: `~+22°`, Middle: `~+6°`, Ring: `~-14°`, Pinky: `~-30°`) and articulate the opposable thumb with lateral abduction (`~45°`) and forward elevation (`~24°`).
- [x] 2.4 Tag all palm and finger shards with `chassis_suit` and `chassis_trim`, register `hand.userData.fingerShards` and `thumbShards`, and verify symmetric lateral mirroring across left and right hands (`s = -1, 1`).

## 3. Verification & Regression Testing

- [x] 3.1 Update and run graphics unit test assertions in `test/graphics/` to validate the 3-segment phalanx hierarchy, shard counts, and part tags with `node test/runner.js graphics`.
- [x] 3.2 Verify Hover-Palm disc carry clearance and Armory cosmetic skin compatibility with `node test/runner.js armory`.
- [x] 3.3 Execute full project test suite (`npm test`) and verify 100% pass rate without regression.
