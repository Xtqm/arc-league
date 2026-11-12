import { withBrowserTest } from '../helpers/browserHarness.js';

async function runMobileTests() {
  await withBrowserTest(async ({ page, baseUrl }) => {
    // Set mobile landscape viewport and touch support
    await page.setViewport({
      width: 844,
      height: 390,
      isMobile: true,
      hasTouch: true,
      deviceScaleFactor: 3
    });

    await page.goto(`${baseUrl}/index.html`);
    await new Promise(r => setTimeout(r, 1000));

  await page.waitForFunction(() => !!window.__dbg && !!window.__dbg.duelBoss);
  console.log('Game initialized, window.__dbg ready.');

  // -------------------------------------------------------------
  // TEST 1: Viewport & Touch Event Hygiene & Tap Targets
  // -------------------------------------------------------------
  console.log('\n--- TEST 1: Viewport, CSS Hygiene & Tap Target Sizing ---');
  const test1 = await page.evaluate(() => {
    const metaViewport = document.querySelector('meta[name="viewport"]');
    const viewportContent = metaViewport ? metaViewport.getAttribute('content') : '';
    const hasCorrectViewport = viewportContent.includes('user-scalable=no') && viewportContent.includes('viewport-fit=cover');

    const bodyStyle = window.getComputedStyle(document.body);
    const canvas = document.querySelector('canvas');
    const canvasStyle = canvas ? window.getComputedStyle(canvas) : null;
    const touchActionNone = bodyStyle.touchAction === 'none' && canvasStyle && canvasStyle.touchAction === 'none';

    // Verify touch action buttons min 44x44px
    const buttons = [
      document.getElementById('pauseBtn'),
      document.getElementById('fullscreenBtn'),
      document.getElementById('btnThrow'),
      document.getElementById('btnJump'),
      document.getElementById('btnDash'),
      document.getElementById('btnBlock'),
      document.getElementById('btnCurveL'),
      document.getElementById('btnCurveR'),
      document.getElementById('duelBtn'),
      document.getElementById('swarmBtn'),
      document.getElementById('resumeBtn')
    ];

    const buttonSizes = buttons.map(b => {
      if (!b) return { id: 'missing', width: 0, height: 0, valid: false };
      const rect = b.getBoundingClientRect();
      // On hidden elements (like resumeBtn in modal), check computed min-width/min-height or rect
      const comp = window.getComputedStyle(b);
      const minW = parseFloat(comp.minWidth) || 0;
      const minH = parseFloat(comp.minHeight) || 0;
      const w = Math.max(rect.width, minW);
      const h = Math.max(rect.height, minH);
      return {
        id: b.id,
        width: Math.round(w),
        height: Math.round(h),
        valid: w >= 44 && h >= 44
      };
    });

    const allButtonsValid = buttonSizes.every(b => b.valid);

    return {
      hasCorrectViewport,
      touchActionNone,
      allButtonsValid,
      buttonSizes
    };
  });

  console.log('Test 1 results:', test1);
  if (test1.hasCorrectViewport && test1.touchActionNone && test1.allButtonsValid) {
    console.log('>>> TEST 1 PASSED: Viewport meta, touch hygiene resets, and 44px tap targets verified!');
  } else {
    throw new Error(`Test 1 FAILED: ${JSON.stringify(test1)}`);
  }

  // -------------------------------------------------------------
  // TEST 2: Touch Environment Detection & Pointer Lock Bypass
  // -------------------------------------------------------------
  console.log('\n--- TEST 2: Touch Environment Detection & Pointer Lock Bypass ---');
  const test2 = await page.evaluate(() => {
    const dbg = window.__dbg;
    const isTouch = dbg.isTouchDevice();
    const isBodyTouch = document.body.classList.contains('touch-device');

    // Start game to check HUD and pointer lock
    dbg.startMode('duel');

    const lockBanner = document.getElementById('lockstate');
    const lockBannerHidden = !lockBanner || window.getComputedStyle(lockBanner).display === 'none';

    const hint = document.getElementById('hint');
    const mobileHint = document.getElementById('mobileHint');
    const hintHidden = !hint || window.getComputedStyle(hint).display === 'none';
    const mobileHintVisible = mobileHint && window.getComputedStyle(mobileHint).display === 'block';

    const mobileControls = document.getElementById('mobileControls');
    const mobileControlsVisible = mobileControls && window.getComputedStyle(mobileControls).display === 'block';

    const tlRect = document.getElementById('tl')?.getBoundingClientRect();
    const labelSpan = document.querySelector('#pauseBtn .hud-btn-label');
    const btnLabelHidden = !labelSpan || window.getComputedStyle(labelSpan).display === 'none';

    return {
      isTouch,
      isBodyTouch,
      lockBannerHidden,
      hintHidden,
      mobileHintVisible,
      mobileControlsVisible,
      compactTl: !!tlRect && tlRect.width <= 190,
      btnLabelHidden
    };
  });

  console.log('Test 2 results:', test2);
  if (test2.isTouch && test2.isBodyTouch && test2.lockBannerHidden && test2.hintHidden &&
      test2.mobileHintVisible && test2.mobileControlsVisible && test2.compactTl && test2.btnLabelHidden) {
    console.log('>>> TEST 2 PASSED: Touch environment detected, pointer lock bypassed, compact mobile HUD active!');
  } else {
    throw new Error(`Test 2 FAILED: ${JSON.stringify(test2)}`);
  }

  // Test 2B: Mobile control hint auto-hides after ~4.5s of active play and resets on restart
  const hintAutoHideCheck = await page.evaluate(() => {
    const dbg = window.__dbg;
    dbg.finishCountdown();
    for (let i = 0; i < 100; i++) dbg.step(0.05);
    const hiddenAfterDelay = window.getComputedStyle(document.getElementById('mobileHint')).display === 'none';
    dbg.startMode('duel');
    const visibleAfterRestart = window.getComputedStyle(document.getElementById('mobileHint')).display === 'block';
    return { hiddenAfterDelay, visibleAfterRestart };
  });
  if (!hintAutoHideCheck.hiddenAfterDelay || !hintAutoHideCheck.visibleAfterRestart) {
    throw new Error(`Test 2B FAILED (mobileHint auto-hide): ${JSON.stringify(hintAutoHideCheck)}`);
  }
  console.log('>>> TEST 2B PASSED: Mobile hint auto-hides after active gameplay starts and resets cleanly!');

  // -------------------------------------------------------------
  // TEST 3: Orientation Helper (Portrait Detection & Pause/Resume)
  // -------------------------------------------------------------
  console.log('\n--- TEST 3: Orientation Helper Overlay & Game Pause/Resume ---');
  // Switch to portrait: 390x844
  await page.setViewport({
    width: 390,
    height: 844,
    isMobile: true,
    hasTouch: true
  });
  await new Promise(r => setTimeout(r, 400));

  const test3Portrait = await page.evaluate(() => {
    window.__dbg.checkOrientation();
    const overlay = document.getElementById('orientationOverlay');
    const overlayVisible = overlay && window.getComputedStyle(overlay).display === 'flex';
    return {
      overlayVisible
    };
  });

  console.log('Test 3 Portrait results:', test3Portrait);

  // Switch back to landscape: 844x390
  await page.setViewport({
    width: 844,
    height: 390,
    isMobile: true,
    hasTouch: true
  });
  await new Promise(r => setTimeout(r, 400));

  const test3Landscape = await page.evaluate(() => {
    window.__dbg.checkOrientation();
    const overlay = document.getElementById('orientationOverlay');
    const overlayHidden = overlay && window.getComputedStyle(overlay).display === 'none';
    return {
      overlayHidden
    };
  });

  console.log('Test 3 Landscape results:', test3Landscape);
  if (test3Portrait.overlayVisible && test3Landscape.overlayHidden) {
    console.log('>>> TEST 3 PASSED: Portrait orientation shows rotation helper and landscape resumes smoothly!');
  } else {
    throw new Error(`Test 3 FAILED: Portrait: ${JSON.stringify(test3Portrait)}, Landscape: ${JSON.stringify(test3Landscape)}`);
  }

  // -------------------------------------------------------------
  // TEST 4: Left Zone: Virtual Floating Joystick (Movement)
  // -------------------------------------------------------------
  console.log('\n--- TEST 4: Dynamic Floating Joystick Movement ---');
  const test4 = await page.evaluate(() => {
    const dbg = window.__dbg;
    dbg.resetTiles();
    dbg.setPlayerPos(0, 0, 0);

    // 1. Simulate Touch Start in Left 45% (e.g. x=150, y=250)
    const touchStart = new Touch({
      identifier: 101,
      target: document.body,
      clientX: 150,
      clientY: 250,
      screenX: 150,
      screenY: 250,
      pageX: 150,
      pageY: 250
    });
    window.dispatchEvent(new TouchEvent('touchstart', {
      changedTouches: [touchStart],
      touches: [touchStart],
      cancelable: true
    }));

    const joyBase = document.getElementById('joystickBase');
    const joyThumb = document.getElementById('joystickThumb');
    const joyBaseVisible = joyBase && (joyBase.style.opacity === '1' || parseFloat(window.getComputedStyle(joyBase).opacity) > 0);

    // 2. Drag thumb UP (dy = -50, simulating forward movement)
    const touchMoveUp = new Touch({
      identifier: 101,
      target: document.body,
      clientX: 150,
      clientY: 200,
      screenX: 150,
      screenY: 200,
      pageX: 150,
      pageY: 200
    });
    window.dispatchEvent(new TouchEvent('touchmove', {
      changedTouches: [touchMoveUp],
      touches: [touchMoveUp],
      cancelable: true
    }));

    const moveUp = dbg.touchMove();
    const startZ = dbg.pos().z;
    // Step 20 frames to simulate moving forward
    for (let f = 0; f < 20; f++) dbg.step(0.016);
    const endZ = dbg.pos().z;
    const movedForward = Math.abs(endZ - startZ) > 0.5;

    // 3. Drag thumb RIGHT (dx = +50, dy = 0)
    const touchMoveRight = new Touch({
      identifier: 101,
      target: document.body,
      clientX: 200,
      clientY: 250,
      screenX: 200,
      screenY: 250,
      pageX: 200,
      pageY: 250
    });
    window.dispatchEvent(new TouchEvent('touchmove', {
      changedTouches: [touchMoveRight],
      touches: [touchMoveRight],
      cancelable: true
    }));

    const moveRight = dbg.touchMove();
    const startX = dbg.pos().x;
    for (let f = 0; f < 20; f++) dbg.step(0.016);
    const endX = dbg.pos().x;
    const movedRight = Math.abs(endX - startX) > 0.5;

    // 4. Release touch
    const touchEnd = new Touch({
      identifier: 101,
      target: document.body,
      clientX: 200,
      clientY: 250,
      screenX: 200,
      screenY: 250,
      pageX: 200,
      pageY: 250
    });
    window.dispatchEvent(new TouchEvent('touchend', {
      changedTouches: [touchEnd],
      touches: [],
      cancelable: true
    }));

    const moveAfterEnd = dbg.touchMove();
    const joyBaseHidden = joyBase && (window.getComputedStyle(joyBase).opacity === '0' || joyBase.style.opacity === '0');

    return {
      joyBaseVisible,
      moveUp,
      movedForward,
      moveRight,
      movedRight,
      moveAfterEnd,
      joyBaseHidden
    };
  });

  console.log('Test 4 results:', test4);
  if (test4.joyBaseVisible && test4.movedForward && test4.movedRight && test4.moveAfterEnd.x === 0 && test4.moveAfterEnd.y === 0) {
    console.log('>>> TEST 4 PASSED: Dynamic floating joystick moves player forward/strafe accurately and resets on release!');
  } else {
    throw new Error(`Test 4 FAILED: ${JSON.stringify(test4)}`);
  }

  // -------------------------------------------------------------
  // TEST 5: Right Zone: Camera Look / Touch Swipe (Aiming)
  // -------------------------------------------------------------
  console.log('\n--- TEST 5: Camera Look / Touch Swipe Aiming ---');
  const test5 = await page.evaluate(() => {
    const dbg = window.__dbg;
    const initialYaw = dbg.yaw();
    const initialPitch = dbg.pitch();

    // 1. Touch start on right half (e.g. x=600, y=200)
    const touchStart = new Touch({
      identifier: 202,
      target: document.body,
      clientX: 600,
      clientY: 200,
      screenX: 600,
      screenY: 200,
      pageX: 600,
      pageY: 200
    });
    window.dispatchEvent(new TouchEvent('touchstart', {
      changedTouches: [touchStart],
      touches: [touchStart],
      cancelable: true
    }));

    // 2. Swipe left and up (dx = -80, dy = -40)
    const touchMoveSwipe = new Touch({
      identifier: 202,
      target: document.body,
      clientX: 520,
      clientY: 160,
      screenX: 520,
      screenY: 160,
      pageX: 520,
      pageY: 160
    });
    window.dispatchEvent(new TouchEvent('touchmove', {
      changedTouches: [touchMoveSwipe],
      touches: [touchMoveSwipe],
      cancelable: true
    }));

    const yawAfterSwipe = dbg.yaw();
    const pitchAfterSwipe = dbg.pitch();
    // Swiping left (dx < 0) increases yaw (player turns right/yaw += |dx|*sens)
    const yawChanged = yawAfterSwipe !== initialYaw;
    const pitchChanged = pitchAfterSwipe !== initialPitch;

    // 3. Test pitch clamping with extreme swipe down
    const extremeSwipeDown = new Touch({
      identifier: 202,
      target: document.body,
      clientX: 520,
      clientY: 800,
      screenX: 520,
      screenY: 800,
      pageX: 520,
      pageY: 800
    });
    window.dispatchEvent(new TouchEvent('touchmove', {
      changedTouches: [extremeSwipeDown],
      touches: [extremeSwipeDown],
      cancelable: true
    }));
    const clampedPitch = dbg.pitch();
    const pitchClamped = clampedPitch >= -0.6 && clampedPitch <= 0.55;

    // 4. Release look touch
    const touchEnd = new Touch({
      identifier: 202,
      target: document.body,
      clientX: 520,
      clientY: 800,
      screenX: 520,
      screenY: 800,
      pageX: 520,
      pageY: 800
    });
    window.dispatchEvent(new TouchEvent('touchend', {
      changedTouches: [touchEnd],
      touches: [],
      cancelable: true
    }));

    const lookCleared = dbg.touchState().lookTouchId === null;

    return {
      yawChanged,
      pitchChanged,
      clampedPitch,
      pitchClamped,
      lookCleared
    };
  });

  console.log('Test 5 results:', test5);
  if (test5.yawChanged && test5.pitchChanged && test5.pitchClamped && test5.lookCleared) {
    console.log('>>> TEST 5 PASSED: Right zone camera swipe rotates yaw, modifies pitch, and enforces clamps!');
  } else {
    throw new Error(`Test 5 FAILED: ${JSON.stringify(test5)}`);
  }

  // -------------------------------------------------------------
  // TEST 6: Combat Action Buttons: Throw, Jump, Dash, Block, Curve
  // -------------------------------------------------------------
  console.log('\n--- TEST 6: Combat Action Buttons (Throw, Jump, Dash, Block, Curve) ---');
  const test6 = await page.evaluate(async () => {
    const dbg = window.__dbg;
    dbg.resetTiles();
    dbg.setPlayerPos(0, 0, 0);

    // 1. Test CURVE buttons
    const btnCurveL = document.getElementById('btnCurveL');
    const ch = document.getElementById('crosshair');

    // Trigger touch on curve L
    btnCurveL.dispatchEvent(new TouchEvent('touchstart', { cancelable: true, bubbles: true }));
    const curveIntentL = dbg.curve();
    dbg.step(0.016);
    const chHasCurveL = ch.classList.contains('curve-l');

    // 2. Test THROW button
    const initialDiscs = dbg.discs().length;
    const btnThrow = document.getElementById('btnThrow');
    btnThrow.dispatchEvent(new TouchEvent('touchstart', { cancelable: true, bubbles: true }));
    btnThrow.dispatchEvent(new TouchEvent('touchend', { cancelable: true, bubbles: true }));
    dbg.step(0.016);
    const discThrown = dbg.discs().length === initialDiscs + 1;
    // Check curve reset after throw
    const curveResetAfterThrow = dbg.curve() === 0;

    // 3. Test JUMP button (air-jump & hold)
    const btnJump = document.getElementById('btnJump');
    btnJump.dispatchEvent(new TouchEvent('touchstart', { cancelable: true, bubbles: true }));
    dbg.step(0.016);
    const jumped = !dbg.playerGrounded() && dbg.playerY() > 0;
    btnJump.dispatchEvent(new TouchEvent('touchend', { cancelable: true, bubbles: true }));

    // Air jump
    dbg.step(0.1);
    btnJump.dispatchEvent(new TouchEvent('touchstart', { cancelable: true, bubbles: true }));
    dbg.step(0.016);
    const doubleJumped = dbg.playerJumps() === 2;
    btnJump.dispatchEvent(new TouchEvent('touchend', { cancelable: true, bubbles: true }));

    // 4. Test BLOCK button
    const btnBlock = document.getElementById('btnBlock');
    btnBlock.dispatchEvent(new TouchEvent('touchstart', { cancelable: true, bubbles: true }));
    const isBlocking = dbg.touchState().touchBlocking;
    btnBlock.dispatchEvent(new TouchEvent('touchend', { cancelable: true, bubbles: true }));
    const releasedBlock = !dbg.touchState().touchBlocking;

    // 5. Test DASH button
    // Land player first
    dbg.setPlayerPos(0, 0, 0);
    dbg.step(0.016);
    const btnDash = document.getElementById('btnDash');
    const startPos = dbg.pos();
    btnDash.dispatchEvent(new TouchEvent('touchstart', { cancelable: true, bubbles: true }));
    dbg.step(0.016);
    for (let f = 0; f < 10; f++) dbg.step(0.016);
    const endPos = dbg.pos();
    const dashed = Math.hypot(endPos.x - startPos.x, endPos.z - startPos.z) > 1.5;

    return {
      curveIntentL,
      chHasCurveL,
      discThrown,
      curveResetAfterThrow,
      jumped,
      doubleJumped,
      isBlocking,
      releasedBlock,
      dashed
    };
  });

  console.log('Test 6 results:', test6);
  if (test6.curveIntentL === -1.0 && test6.chHasCurveL && test6.discThrown && test6.curveResetAfterThrow &&
      test6.jumped && test6.doubleJumped && test6.isBlocking && test6.releasedBlock && test6.dashed) {
    console.log('>>> TEST 6 PASSED: All combat action buttons (Throw, Jump, Double-Jump, Dash, Block, Curve) respond seamlessly!');
  } else {
    throw new Error(`Test 6 FAILED: ${JSON.stringify(test6)}`);
  }

  // -------------------------------------------------------------
  // TEST 7: Multi-Touch & Mobile Performance (DPR & Particle Pruning)
  // -------------------------------------------------------------
  console.log('\n--- TEST 7: Multi-Touch & Mobile Optimization ---');
  const test7 = await page.evaluate(() => {
    const dbg = window.__dbg;
    // Mobile DPR should be clamped to max 1.5
    // Halved particle burst count: default 22 -> 11
    const defaultSparks = dbg.particleBurstCount(22);
    const smallSparks = dbg.particleBurstCount(14);

    return {
      defaultSparks,
      smallSparks,
      sparksHalved: defaultSparks === 11 && smallSparks === 7
    };
  });

  console.log('Test 7 results:', test7);
  if (test7.sparksHalved) {
    console.log('>>> TEST 7 PASSED: Mobile WebGL particle pruning active (counts halved for 60 FPS)!');
  } else {
    throw new Error(`Test 7 FAILED: ${JSON.stringify(test7)}`);
  }

  // -------------------------------------------------------------
  // TEST 8: Camera Inertia (Momentum), Tap-to-Stop & Dynamic Sens
  // -------------------------------------------------------------
  console.log('\n--- TEST 8: Camera Inertia (Momentum), Tap-to-Stop & Dynamic Sens ---');
  const test8 = await page.evaluate(async () => {
    const dbg = window.__dbg;
    dbg.setPlayerPos(0, 0, 0);
    dbg.state.player.hp = 100;
    dbg.state.player.invuln = 999;
    dbg.state.player.alive = true;
    dbg.setYaw(0);

    // Part A: Dynamic sensitivity check (sens * 2.5)
    const baseSens = dbg.sens(); // Should be 0.0022
    const isDefaultSens = Math.abs(baseSens - 0.0022) < 0.0001;

    // Test swipe 1: at default sensitivity
    const touchStart1 = new Touch({
      identifier: 301,
      target: document.body,
      clientX: 600,
      clientY: 200,
      screenX: 600,
      screenY: 200,
      pageX: 600,
      pageY: 200
    });
    window.dispatchEvent(new TouchEvent('touchstart', {
      changedTouches: [touchStart1],
      touches: [touchStart1],
      cancelable: true
    }));

    const yawBeforeSwipe = dbg.yaw();
    const touchMove1 = new Touch({
      identifier: 301,
      target: document.body,
      clientX: 560, // dX = -40
      clientY: 200, // dY = 0
      screenX: 560,
      screenY: 200,
      pageX: 560,
      pageY: 200
    });
    window.dispatchEvent(new TouchEvent('touchmove', {
      changedTouches: [touchMove1],
      touches: [touchMove1],
      cancelable: true
    }));

    const deltaYaw1 = Math.abs(dbg.yaw() - yawBeforeSwipe);
    // Expected immediate rotation: -dX * sens * 2.5 = 40 * 0.0022 * 2.5 = 0.22
    const expectedDelta1 = 40 * baseSens * 2.5;
    const dynamicSensAccurate = Math.abs(deltaYaw1 - expectedDelta1) < 0.005;

    // End touch 1
    window.dispatchEvent(new TouchEvent('touchend', {
      changedTouches: [touchMove1],
      touches: [],
      cancelable: true
    }));

    // Part B: Smoothed frame-rate-independent velocity inertia test
    dbg.setYaw(0);
    const touchStart2 = new Touch({
      identifier: 302,
      target: document.body,
      clientX: 600,
      clientY: 200,
      screenX: 600,
      screenY: 200,
      pageX: 600,
      pageY: 200
    });
    window.dispatchEvent(new TouchEvent('touchstart', {
      changedTouches: [touchStart2],
      touches: [touchStart2],
      cancelable: true
    }));

    const touchMove2 = new Touch({
      identifier: 302,
      target: document.body,
      clientX: 500, // dX = -100 -> clamped -2200 px/s
      clientY: 180, // dY = -20  -> -1250 px/s
      screenX: 500,
      screenY: 180,
      pageX: 500,
      pageY: 180
    });
    window.dispatchEvent(new TouchEvent('touchmove', {
      changedTouches: [touchMove2],
      touches: [touchMove2],
      cancelable: true
    }));

    const tStateAfterMove = dbg.touchState();
    const momentumCaptured = tStateAfterMove.lookMomentumX === -2200 && tStateAfterMove.lookMomentumY === -1250;
    const yawAtRelease = dbg.yaw();

    // Release finger -> lookId becomes null, velocity remains
    window.dispatchEvent(new TouchEvent('touchend', {
      changedTouches: [touchMove2],
      touches: [],
      cancelable: true
    }));

    const lookClearedOnRelease = dbg.touchState().lookId === null;

    // Step 5 frames at 60Hz (0.016s) to observe smooth inertia drift
    for (let f = 0; f < 5; f++) dbg.step(0.016);
    const yawAfterDrift = dbg.yaw();
    const hasDrifted = Math.abs(yawAfterDrift - yawAtRelease) > 0.01;
    const driftedInCorrectDirection = yawAfterDrift > yawAtRelease;

    // Step remaining frames (~1s total) until exponential damping hits 0
    for (let f = 0; f < 65; f++) dbg.step(0.016);
    const momentumFinal = dbg.touchState();
    const momentumDecayedToZero = momentumFinal.lookMomentumX === 0 && momentumFinal.lookMomentumY === 0;
    const totalDrift60Hz = dbg.yaw() - yawAtRelease;

    // Compare total drift over same duration at 120Hz (0.008s steps)
    dbg.setYaw(0);
    const start120 = new Touch({ identifier: 312, target: document.body, clientX: 600, clientY: 200 });
    window.dispatchEvent(new TouchEvent('touchstart', { changedTouches: [start120], touches: [start120], cancelable: true }));
    const move120 = new Touch({ identifier: 312, target: document.body, clientX: 500, clientY: 180 });
    window.dispatchEvent(new TouchEvent('touchmove', { changedTouches: [move120], touches: [move120], cancelable: true }));
    const yawAtRelease120 = dbg.yaw();
    window.dispatchEvent(new TouchEvent('touchend', { changedTouches: [move120], touches: [], cancelable: true }));
    for (let f = 0; f < 140; f++) dbg.step(0.008);
    const totalDrift120Hz = dbg.yaw() - yawAtRelease120;
    const frameRateInvariant = Math.abs(totalDrift60Hz - totalDrift120Hz) < 0.005;

    // Part C: Tapping screen stops momentum instantly
    const touchStart3 = new Touch({
      identifier: 303,
      target: document.body,
      clientX: 600,
      clientY: 200
    });
    window.dispatchEvent(new TouchEvent('touchstart', {
      changedTouches: [touchStart3],
      touches: [touchStart3],
      cancelable: true
    }));

    const touchMove3 = new Touch({
      identifier: 303,
      target: document.body,
      clientX: 450,
      clientY: 200
    });
    window.dispatchEvent(new TouchEvent('touchmove', {
      changedTouches: [touchMove3],
      touches: [touchMove3],
      cancelable: true
    }));

    window.dispatchEvent(new TouchEvent('touchend', {
      changedTouches: [touchMove3],
      touches: [],
      cancelable: true
    }));

    dbg.step(0.016);
    dbg.step(0.016);
    const momentumActiveBeforeTap = Math.abs(dbg.touchState().lookMomentumX) > 10.0;

    const tapTouch = new Touch({
      identifier: 304,
      target: document.body,
      clientX: 620,
      clientY: 210
    });
    window.dispatchEvent(new TouchEvent('touchstart', {
      changedTouches: [tapTouch],
      touches: [tapTouch],
      cancelable: true
    }));

    const momentumStoppedOnTap = dbg.touchState().lookMomentumX === 0 && dbg.touchState().lookMomentumY === 0;
    const yawAtTap = dbg.yaw();
    for (let f = 0; f < 5; f++) dbg.step(0.016);
    const noDriftAfterTap = dbg.yaw() === yawAtTap;

    window.dispatchEvent(new TouchEvent('touchend', {
      changedTouches: [tapTouch],
      touches: [],
      cancelable: true
    }));

    // Part D: Spike clamp check + pause-before-lift staleness cutoff
    dbg.setYaw(0);
    const startSpike = new Touch({ identifier: 305, target: document.body, clientX: 600, clientY: 200 });
    window.dispatchEvent(new TouchEvent('touchstart', { changedTouches: [startSpike], touches: [startSpike], cancelable: true }));
    const moveSpike = new Touch({ identifier: 305, target: document.body, clientX: 50, clientY: 200 }); // dX = -550 -> clamped 240
    window.dispatchEvent(new TouchEvent('touchmove', { changedTouches: [moveSpike], touches: [moveSpike], cancelable: true }));
    const yawSpikeDelta = Math.abs(dbg.yaw());
    const spikeClamped = Math.abs(yawSpikeDelta - 240 * baseSens * 2.5) < 0.005;
    // Wait past STALE_RELEASE_MS (80ms) before releasing -> velocity should zero cleanly
    await new Promise(r => setTimeout(r, 110));
    window.dispatchEvent(new TouchEvent('touchend', { changedTouches: [moveSpike], touches: [], cancelable: true }));
    const staleCutoffZeroed = dbg.touchState().lookMomentumX === 0 && dbg.touchState().lookMomentumY === 0;

    // Part E: Desktop mouse look check
    dbg.setTouchDevice(false);
    dbg.step(0.016);
    const desktopLookMomentum = dbg.touchState().lookMomentumX === 0 && dbg.touchState().lookMomentumY === 0;
    dbg.setTouchDevice(true);

    return {
      isDefaultSens,
      dynamicSensAccurate,
      momentumCaptured,
      lookClearedOnRelease,
      hasDrifted,
      driftedInCorrectDirection,
      momentumDecayedToZero,
      frameRateInvariant,
      momentumActiveBeforeTap,
      momentumStoppedOnTap,
      noDriftAfterTap,
      spikeClamped,
      staleCutoffZeroed,
      desktopLookMomentum
    };
  });

  console.log('Test 8 results:', test8);
  if (test8.isDefaultSens && test8.dynamicSensAccurate && test8.momentumCaptured &&
      test8.lookClearedOnRelease && test8.hasDrifted && test8.driftedInCorrectDirection &&
      test8.momentumDecayedToZero && test8.frameRateInvariant && test8.momentumActiveBeforeTap &&
      test8.momentumStoppedOnTap && test8.noDriftAfterTap && test8.spikeClamped &&
      test8.staleCutoffZeroed && test8.desktopLookMomentum) {
    console.log('>>> TEST 8 PASSED: Smooth velocity inertia is dt-invariant, clamps spikes, cancels when paused, and stops on tap!');
  } else {
    throw new Error(`Test 8 FAILED: ${JSON.stringify(test8)}`);
  }

  // -------------------------------------------------------------
  // TEST 9: Throw Button Aim-Drag Steering & Lifecycle Reset
  // -------------------------------------------------------------
  console.log('\n--- TEST 9: Throw Aim-Drag Steering & Lifecycle Reset ---');
  const test9 = await page.evaluate(() => {
    const dbg = window.__dbg;
    const btnThrow = document.getElementById('btnThrow');
    const btnJump = document.getElementById('btnJump');
    dbg.setPlayerPos(0, 0, 0);
    dbg.state.player.hp = 100;
    dbg.state.player.invuln = 999;
    dbg.state.player.alive = true;
    dbg.setYaw(0);
    dbg.state.player.hasDisc = true;
    dbg.state.player.noDiscTimer = 0;

    // 1. Quick tap within 4px slop throws without moving camera
    const startTap = new Touch({ identifier: 401, target: btnThrow, clientX: 800, clientY: 500 });
    btnThrow.dispatchEvent(new TouchEvent('touchstart', { changedTouches: [startTap], touches: [startTap], cancelable: true, bubbles: true }));
    const moveSlop = new Touch({ identifier: 401, target: btnThrow, clientX: 802, clientY: 501 }); // ~2.2px <= 4px slop
    window.dispatchEvent(new TouchEvent('touchmove', { changedTouches: [moveSlop], touches: [moveSlop], cancelable: true, bubbles: true }));
    const yawAfterSlop = dbg.yaw();
    const quickTapSteady = Math.abs(yawAfterSlop) < 1e-6 && !dbg.touchState().throwDragActive;
    const discBeforeTap = dbg.discs().length;
    btnThrow.dispatchEvent(new TouchEvent('touchend', { changedTouches: [moveSlop], touches: [], cancelable: true, bubbles: true }));
    const quickTapThrew = dbg.discs().length === discBeforeTap + 1;

    // 2. Hold throw + secondary unrelated Jump finger + drag > 4px -> aims & charges cleanly
    dbg.state.player.hasDisc = true;
    dbg.state.player.noDiscTimer = 0;
    dbg.setYaw(0);
    dbg.state.player.pitch = 0;
    const startAim = new Touch({ identifier: 402, target: btnThrow, clientX: 800, clientY: 500 });
    btnThrow.dispatchEvent(new TouchEvent('touchstart', { changedTouches: [startAim], touches: [startAim], cancelable: true, bubbles: true }));
    const chargingStarted = dbg.state.player.chargingThrow === true && dbg.touchState().throwTouchId === 402;
    dbg.step(0.3);

    // Secondary unrelated touch on Jump button must NOT end Throw hold
    const jumpTouch = new Touch({ identifier: 499, target: btnJump, clientX: 740, clientY: 550 });
    btnJump.dispatchEvent(new TouchEvent('touchstart', { changedTouches: [jumpTouch], touches: [startAim, jumpTouch], cancelable: true, bubbles: true }));
    btnJump.dispatchEvent(new TouchEvent('touchend', { changedTouches: [jumpTouch], touches: [startAim], cancelable: true, bubbles: true }));
    const throwHeldAcrossSecondary = dbg.state.player.chargingThrow === true && dbg.touchState().throwTouchId === 402;

    const pitchBeforeThrowDrag = dbg.pitch();
    const moveAim = new Touch({ identifier: 402, target: btnThrow, clientX: 700, clientY: 460 });
    btnThrow.dispatchEvent(new TouchEvent('touchmove', { changedTouches: [moveAim], touches: [moveAim], cancelable: true, bubbles: true }));
    const dragSteeredAim = dbg.yaw() > 0.4 && dbg.pitch() > pitchBeforeThrowDrag && dbg.touchState().throwDragActive === true;

    const discBeforeCharged = dbg.discs().length;
    const yawAtThrowRelease = dbg.yaw();
    btnThrow.dispatchEvent(new TouchEvent('touchend', { changedTouches: [moveAim], touches: [], cancelable: true, bubbles: true }));
    const chargedThrew = dbg.discs().length === discBeforeCharged + 1 && dbg.touchState().throwTouchId === null;
    for (let f = 0; f < 5; f++) dbg.step(0.016);
    const zeroPostThrowDrift = dbg.yaw() === yawAtThrowRelease;

    // 3. Pause lifecycle reset clears stuck touches
    const stuckMove = new Touch({ identifier: 501, target: document.body, clientX: 120, clientY: 300 });
    const stuckLook = new Touch({ identifier: 502, target: document.body, clientX: 600, clientY: 220 });
    window.dispatchEvent(new TouchEvent('touchstart', { changedTouches: [stuckMove, stuckLook], touches: [stuckMove, stuckLook], cancelable: true }));
    dbg.pauseGame();
    const tPaused = dbg.touchState();
    const resetOnPause = tPaused.moveTouchId === null && tPaused.lookTouchId === null &&
      dbg.touchMove().x === 0 && dbg.touchMove().y === 0 && tPaused.lookMomentumX === 0;
    document.getElementById('resumeBtn')?.click();

    return {
      quickTapSteady,
      quickTapThrew,
      chargingStarted,
      throwHeldAcrossSecondary,
      dragSteeredAim,
      chargedThrew,
      zeroPostThrowDrift,
      resetOnPause
    };
  });

  console.log('Test 9 results:', test9);
  if (test9.quickTapSteady && test9.quickTapThrew && test9.chargingStarted &&
      test9.throwHeldAcrossSecondary && test9.dragSteeredAim && test9.chargedThrew &&
      test9.zeroPostThrowDrift && test9.resetOnPause) {
    console.log('>>> TEST 9 PASSED: Throw-hold aim-drag, quick-tap slop protection, multi-touch hold, and pause cleanup verified!');
  } else {
    throw new Error(`Test 9 FAILED: ${JSON.stringify(test9)}`);
  }

  // -------------------------------------------------------------
  // TEST 10: Touch Camera Settings (Sensitivity, Inertia & Invert Y)
  // -------------------------------------------------------------
  console.log('\n--- TEST 10: Touch & Camera Preferences in SettingsModal ---');
  const test10 = await page.evaluate(async () => {
    const dbg = window.__dbg;
    const { settingsManager } = await import('/src/core/settings.js');
    dbg.pauseGame();
    document.getElementById('pauseSettingsBtn')?.click();

    const slider = document.getElementById('touchSensSlider');
    const offBtn = document.querySelector('.inertia-btn[data-inertia="off"]');
    const lightBtn = document.querySelector('.inertia-btn[data-inertia="light"]');
    const invertBtn = document.getElementById('toggleInvertYBtn');
    const controlsPresent = !!(slider && offBtn && lightBtn && invertBtn);

    // Mutate to 150% sens, OFF inertia (1:1), and invertY = true
    slider.value = '150';
    slider.oninput({ target: slider });
    offBtn.click();
    invertBtn.click();

    const storedAfterEdit = {
      touchSensitivity: settingsManager.get('touchSensitivity'),
      touchInertia: settingsManager.get('touchInertia'),
      invertY: settingsManager.get('invertY'),
      stateInvertY: dbg.state.invertY
    };

    document.getElementById('closeSettingsBtn')?.click();
    document.getElementById('resumeBtn')?.click();

    dbg.setYaw(0);
    dbg.state.player.pitch = 0;
    const sTouch = new Touch({ identifier: 601, target: document.body, clientX: 600, clientY: 200 });
    window.dispatchEvent(new TouchEvent('touchstart', { changedTouches: [sTouch], touches: [sTouch], cancelable: true }));
    const mTouch = new Touch({ identifier: 601, target: document.body, clientX: 560, clientY: 180 }); // dX=-40, dY=-20
    window.dispatchEvent(new TouchEvent('touchmove', { changedTouches: [mTouch], touches: [mTouch], cancelable: true }));
    const yawAt150 = dbg.yaw();
    const pitchInverted = dbg.pitch();
    window.dispatchEvent(new TouchEvent('touchend', { changedTouches: [mTouch], touches: [], cancelable: true }));
    const offInertiaZeroed = dbg.touchState().lookMomentumX === 0 && dbg.touchState().lookMomentumY === 0;

    const expectedYaw150 = 40 * dbg.sens() * 2.5 * 1.5;
    const sensScaled = Math.abs(yawAt150 - expectedYaw150) < 0.005;
    // With dY=-20 and invertY=true, pitch decreases (-20 * -1 => subtracting positive) -> pitch < 0
    const yInvertedApplied = pitchInverted < -0.05;

    // Restore clean defaults
    settingsManager.set('touchSensitivity', 1.0);
    settingsManager.set('touchInertia', 'smooth');
    settingsManager.set('invertY', false);

    return {
      controlsPresent,
      storedAfterEdit,
      offInertiaZeroed,
      sensScaled,
      yInvertedApplied
    };
  });

  console.log('Test 10 results:', test10);
  if (test10.controlsPresent &&
      test10.storedAfterEdit.touchSensitivity === 1.5 &&
      test10.storedAfterEdit.touchInertia === 'off' &&
      test10.storedAfterEdit.invertY === true &&
      test10.storedAfterEdit.stateInvertY === true &&
      test10.offInertiaZeroed && test10.sensScaled && test10.yInvertedApplied) {
    console.log('>>> TEST 10 PASSED: Touch sensitivity, inertia presets, and invertY controls persisted and applied!');
  } else {
    throw new Error(`Test 10 FAILED: ${JSON.stringify(test10)}`);
  }

  console.log('\n======================================================');
  console.log('ALL MOBILE ACCEPTANCE CRITERIA VERIFIED SUCCESSFULLY!');
  console.log('======================================================\n');
  });
}

runMobileTests().catch(err => {
  console.error('Mobile test execution failed:', err);
  process.exit(1);
});
