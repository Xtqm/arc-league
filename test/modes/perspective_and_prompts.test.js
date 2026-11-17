import assert from 'assert';

// Setup minimal DOM and window mocks for Node test environment
globalThis.window = globalThis.window || {};
window.addEventListener = window.addEventListener || (() => {});
window.removeEventListener = window.removeEventListener || (() => {});

globalThis._mockElements = {};
globalThis.document = {
  getElementById: (id) => {
    if (!globalThis._mockElements[id]) {
      globalThis._mockElements[id] = {
        id,
        style: {},
        innerHTML: '',
        textContent: '',
        classList: {
          contains: () => false,
          add: () => {},
          remove: () => {},
          toggle: () => {}
        },
        querySelectorAll: () => [],
        querySelector: () => null,
        addEventListener: () => {}
      };
    }
    return globalThis._mockElements[id];
  },
  createElement: (tag) => ({
    tagName: tag.toUpperCase(),
    style: {},
    innerHTML: '',
    textContent: '',
    classList: {
      contains: () => false,
      add: () => {},
      remove: () => {},
      toggle: () => {}
    },
    querySelectorAll: () => [],
    querySelector: () => null,
    addEventListener: () => {}
  }),
  addEventListener: () => {},
  removeEventListener: () => {}
};

async function runTests() {
  console.log('--- Running Dual Perspective, Settings & Adaptive Prompts Test Suite ---');

  const { state } = await import('../../src/core/state.js');
  const { toggleCameraPerspective, updateCamera } = await import('../../src/graphics/scene.js');
  const { updatePlayer } = await import('../../src/entities/Player.js');
  const { makeProgram } = await import('../../src/graphics/materials.js');
  const { settingsManager, DEFAULT_SETTINGS } = await import('../../src/core/settings.js');
  const {
    INPUT_GLYPHS,
    getInputGlyph,
    formatAdaptivePrompt,
    setLastInputDevice,
    updateAdaptiveHUDPrompts
  } = await import('../../src/ui/hud.js');

  // Test Group 1: Perspective Switching
  console.log('\n[Test 1] Testing Perspective Toggling & Camera Lerp...');
  state.cameraPerspective = 'third_person';
  state.cameraPerspectiveBlend = 1.0;

  const newPerspective = toggleCameraPerspective();
  assert.strictEqual(newPerspective, 'first_person');
  assert.strictEqual(state.cameraPerspective, 'first_person');

  // Smooth lerp test
  state.cameraPerspective = 'first_person';
  state.cameraPerspectiveBlend = 1.0;
  updateCamera(0.1);
  assert(state.cameraPerspectiveBlend < 1.0, 'Blend should decrease towards 0.0');
  assert(Math.abs(state.cameraPerspectiveBlend - 0.5) < 0.01, `Blend should be ~0.5, got ${state.cameraPerspectiveBlend}`);

  updateCamera(0.1);
  assert.strictEqual(state.cameraPerspectiveBlend, 0.0, 'Blend should reach 0.0 after 0.2s');
  console.log('✓ Camera perspective smoothly toggles and lerps over 0.2s');

  // Test Group 2: Athlete Mesh Culling
  console.log('\n[Test 2] Testing First-Person Athlete Mesh Culling...');
  const playerRig = makeProgram(0x00f3ff, { isPlayer: true, archetype: 'player' });
  state.player.obj = playerRig;
  state.player.alive = true;

  // In third-person (blend = 1.0): head and torso are visible
  state.cameraPerspectiveBlend = 1.0;
  updatePlayer(0.016);
  assert.strictEqual(playerRig.userData.head.visible, true, 'Head must be visible in 3P');
  assert.strictEqual(playerRig.userData.leftShoulder.visible, true, 'Shoulders must be visible in 3P');
  assert.strictEqual(playerRig.userData.rightShoulder.visible, true, 'Shoulders must be visible in 3P');
  assert.strictEqual(playerRig.userData.backDisc.visible, true, 'Hand disc must be visible in 3P');

  // In first-person (blend = 0.0 < 0.2): head is hidden, arms and disc remain visible
  state.cameraPerspectiveBlend = 0.0;
  updatePlayer(0.016);
  assert.strictEqual(playerRig.userData.head.visible, false, 'Head must be culled in 1P');
  assert.strictEqual(playerRig.userData.leftShoulder.visible, true, 'Left arm must remain visible in 1P');
  assert.strictEqual(playerRig.userData.rightShoulder.visible, true, 'Right arm must remain visible in 1P');
  assert.strictEqual(playerRig.userData.backDisc.visible, true, 'Hand disc must remain visible in 1P');

  // Restoring to third-person
  state.cameraPerspectiveBlend = 1.0;
  updatePlayer(0.016);
  assert.strictEqual(playerRig.userData.head.visible, true, 'Head must restore visibility when returning to 3P');
  console.log('✓ Athlete mesh culling correctly hides head/torso in 1P while keeping arms & disc visible');

  // Test Group 3: Settings Persistence & Relocation
  console.log('\n[Test 3] Testing Settings Persistence & Sensitivity Relocation...');
  assert.strictEqual(DEFAULT_SETTINGS.mouseSensitivity, 1.0);
  assert.strictEqual(DEFAULT_SETTINGS.coreLaunchConfirmation, true);
  assert.strictEqual(DEFAULT_SETTINGS.defaultCameraPerspective, 'third_person');

  settingsManager.set('mouseSensitivity', 1.5);
  assert.strictEqual(settingsManager.get('mouseSensitivity'), 1.5);
  assert.strictEqual(state.sens, 0.0022 * 1.5, 'state.sens must scale with mouseSensitivity setting');

  settingsManager.set('coreLaunchConfirmation', false);
  assert.strictEqual(settingsManager.get('coreLaunchConfirmation'), false);

  settingsManager.set('defaultCameraPerspective', 'first_person');
  assert.strictEqual(settingsManager.get('defaultCameraPerspective'), 'first_person');
  assert.strictEqual(state.cameraPerspective, 'first_person');

  // Reset defaults
  settingsManager.set('mouseSensitivity', 1.0);
  settingsManager.set('coreLaunchConfirmation', true);
  settingsManager.set('defaultCameraPerspective', 'third_person');
  console.log('✓ Settings controls correctly persist, restore, and map to simulation state');

  // Test Group 4: Device-Adaptive Prompts
  console.log('\n[Test 4] Testing Device-Adaptive HUD Prompts & Glyphs...');
  assert.strictEqual(getInputGlyph('throw', 'kbm'), '[LMB]');
  assert.strictEqual(getInputGlyph('throw', 'gamepad'), '[RT]');
  assert.strictEqual(getInputGlyph('throw', 'touch'), '[THROW]');

  assert.strictEqual(getInputGlyph('block', 'kbm'), '[RMB]');
  assert.strictEqual(getInputGlyph('block', 'gamepad'), '[LT]');
  assert.strictEqual(getInputGlyph('block', 'touch'), '[SHIELD]');

  assert.strictEqual(getInputGlyph('curve', 'kbm'), '[Q/E]');
  assert.strictEqual(getInputGlyph('curve', 'gamepad'), '[LB/RB]');
  assert.strictEqual(getInputGlyph('curve', 'touch'), '[L/R]');

  setLastInputDevice('kbm');
  assert.strictEqual(
    formatAdaptivePrompt('KINETIC STRIKE {throw} TO DISINTEGRATE TARGET'),
    'KINETIC STRIKE [LMB] TO DISINTEGRATE TARGET'
  );

  setLastInputDevice('gamepad');
  assert.strictEqual(
    formatAdaptivePrompt('KINETIC STRIKE {throw} TO DISINTEGRATE TARGET'),
    'KINETIC STRIKE [RT] TO DISINTEGRATE TARGET'
  );

  setLastInputDevice('touch');
  assert.strictEqual(
    formatAdaptivePrompt('KINETIC STRIKE {throw} TO DISINTEGRATE TARGET'),
    'KINETIC STRIKE [THROW] TO DISINTEGRATE TARGET'
  );

  const hint = globalThis.document.getElementById('hint');
  const bypass = globalThis.document.getElementById('calibrationBypass');

  setLastInputDevice('kbm');
  assert(hint.textContent.includes('WASD'), 'Hint should have WASD on KBM');
  assert.strictEqual(bypass.textContent, '[ESC] BYPASS TO LOBBY');

  setLastInputDevice('gamepad');
  assert(hint.textContent.includes('LEFT STICK'), 'Hint should have LEFT STICK on Gamepad');
  assert.strictEqual(bypass.textContent, '[START] BYPASS TO LOBBY');

  setLastInputDevice('touch');
  assert(hint.textContent.includes('DRAG LEFT'), 'Hint should have DRAG LEFT on Touch');
  assert.strictEqual(bypass.textContent, '[TAP] BYPASS TO LOBBY');

  console.log('✓ Device-adaptive HUD prompts dynamically update glyphs across KBM, Gamepad, and Touch');

  console.log('\n🎉 ALL PERSPECTIVE, SETTINGS & ADAPTIVE PROMPT TESTS PASSED!');
}

runTests().catch(err => {
  console.error('\n❌ Test failure:', err);
  process.exit(1);
});
