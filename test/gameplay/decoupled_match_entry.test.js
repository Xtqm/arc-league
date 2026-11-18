import assert from 'assert';
import { withBrowserTest } from '../helpers/browserHarness.js';

async function runDecoupledMatchEntryTests() {
  await withBrowserTest(async ({ page, baseUrl }) => {
    await page.goto(`${baseUrl}/index.html`);
    await new Promise(r => setTimeout(r, 1000));

    await page.waitForFunction(() => !!window.__dbg && !!window.__dbg.startMode);
    console.log('Game initialized, window.__dbg ready.');

    // =============================================================
    // TEST 1: Main Menu Decoupled Button Layout Presence
    // =============================================================
    console.log('\n--- TEST 1: Main Menu Decoupled Entry Buttons ---');
    const menuButtons = await page.evaluate(() => {
      const overlay = document.getElementById('overlay');
      const quickMatchBtn = document.getElementById('quickMatchBtn');
      const practiceBtn = document.getElementById('practiceBtn');
      const hostMatchBtn = document.getElementById('hostMatchBtn');
      const joinOnlineBtn = document.getElementById('joinOnlineBtn');

      return {
        overlayVisible: overlay && overlay.style.display !== 'none',
        hasQuickMatch: !!quickMatchBtn,
        quickMatchText: quickMatchBtn ? quickMatchBtn.textContent.trim() : '',
        hasPractice: !!practiceBtn,
        practiceText: practiceBtn ? practiceBtn.textContent.trim() : '',
        hasHost: !!hostMatchBtn,
        hostText: hostMatchBtn ? hostMatchBtn.textContent.trim() : '',
        hasJoin: !!joinOnlineBtn,
        joinText: joinOnlineBtn ? joinOnlineBtn.textContent.trim() : ''
      };
    });

    console.log('Menu Buttons:', menuButtons);
    assert.strictEqual(menuButtons.overlayVisible, true, 'Overlay must be visible initially');
    assert.strictEqual(menuButtons.hasQuickMatch, true, '#quickMatchBtn must exist on main menu');
    assert.ok(menuButtons.quickMatchText.includes('QUICK MATCH'), 'Quick Match button must have QUICK MATCH label');
    assert.strictEqual(menuButtons.hasPractice, true, '#practiceBtn must exist on main menu');
    assert.ok(menuButtons.practiceText.includes('PRACTICE'), 'Practice button must have PRACTICE label');
    assert.strictEqual(menuButtons.hasHost, true, '#hostMatchBtn must exist on main menu');
    assert.ok(menuButtons.hostText.includes('HOST'), 'Host Match button must have HOST label');
    assert.strictEqual(menuButtons.hasJoin, true, '#joinOnlineBtn must exist on main menu');
    assert.ok(menuButtons.joinText.includes('JOIN'), 'Join button must have JOIN label');
    console.log('>>> TEST 1 PASSED: All 4 decoupled entry buttons verified on primary main menu!');

    // =============================================================
    // TEST 2: Quick Match Launch -> Warm-Up Queue & Queue HUD
    // =============================================================
    console.log('\n--- TEST 2: Quick Match Launch & Warm-Up Arena HUD ---');
    const quickMatchResult = await page.evaluate(async () => {
      const quickMatchBtn = document.getElementById('quickMatchBtn');
      quickMatchBtn.click();

      // Wait a moment for mode to initialize and HUD to mount
      await new Promise(r => setTimeout(r, 100));

      const mode = window.__dbg.mode();
      const overlay = document.getElementById('overlay');
      const hostModal = document.getElementById('hostModal');
      const queueHUD = document.getElementById('matchmakingQueueHUD');
      const cancelBtn = queueHUD ? (queueHUD.querySelector('#btnCancelQueueHud') || queueHUD.querySelector('#btnCancelQueue') || queueHUD.querySelector('button')) : null;

      return {
        mode,
        overlayHidden: overlay && overlay.style.display === 'none',
        hostModalHidden: !hostModal || hostModal.style.display === 'none',
        hudExists: !!queueHUD,
        hudVisible: queueHUD && queueHUD.style.display !== 'none',
        hudText: queueHUD ? queueHUD.textContent : '',
        hasCancelBtn: !!cancelBtn
      };
    });

    console.log('Quick Match Result:', quickMatchResult);
    assert.strictEqual(quickMatchResult.mode, 'duel_ai', 'Quick Match must start warm-up arena in duel_ai mode');
    assert.strictEqual(quickMatchResult.overlayHidden, true, 'Main menu overlay must be hidden');
    assert.strictEqual(quickMatchResult.hostModalHidden, true, 'Host modal must remain hidden');
    assert.strictEqual(quickMatchResult.hudExists, true, '#matchmakingQueueHUD banner must be created');
    assert.strictEqual(quickMatchResult.hudVisible, true, '#matchmakingQueueHUD banner must be visible');
    assert.ok(quickMatchResult.hudText.includes('SEARCHING'), 'Queue HUD must indicate active search');
    assert.strictEqual(quickMatchResult.hasCancelBtn, true, 'Queue HUD must provide a cancel button');
    console.log('>>> TEST 2 PASSED: Quick Match launches warm-up arena with active queue HUD!');

    // =============================================================
    // TEST 2B: Cancel Quick Match Queue -> Clean Return to Menu
    // =============================================================
    console.log('\n--- TEST 2B: Cancel Queue -> Teardown & Menu Return ---');
    const cancelQueueResult = await page.evaluate(async () => {
      const queueHUD = document.getElementById('matchmakingQueueHUD');
      const cancelBtn = queueHUD ? (queueHUD.querySelector('#btnCancelQueueHud') || queueHUD.querySelector('#btnCancelQueue') || queueHUD.querySelector('button')) : null;
      if (cancelBtn) cancelBtn.click();

      await new Promise(r => setTimeout(r, 150));

      const overlay = document.getElementById('overlay');
      const hudAfter = document.getElementById('matchmakingQueueHUD');

      return {
        overlayVisible: overlay && overlay.style.display !== 'none',
        hudGone: !hudAfter || hudAfter.style.display === 'none'
      };
    });

    console.log('Cancel Queue Result:', cancelQueueResult);
    assert.strictEqual(cancelQueueResult.overlayVisible, true, 'Cancelling queue must return to main menu overlay');
    assert.strictEqual(cancelQueueResult.hudGone, true, 'Queue HUD must be removed/hidden upon cancellation');
    console.log('>>> TEST 2B PASSED: Cancelling queue teardown cleanly restores main menu!');

    // =============================================================
    // TEST 3: Solo AI Practice Launch -> No Queue HUD or Signaling
    // =============================================================
    console.log('\n--- TEST 3: Solo AI Practice -> Offline Duel without Queue ---');
    const practiceResult = await page.evaluate(async () => {
      window.__dbg.showModeSelect();
      const practiceBtn = document.getElementById('practiceBtn');
      practiceBtn.click();

      await new Promise(r => setTimeout(r, 100));

      const mode = window.__dbg.mode();
      const cdTimer = window.__dbg.countdownTimer();
      const overlay = document.getElementById('overlay');
      const hostModal = document.getElementById('hostModal');
      const queueHUD = document.getElementById('matchmakingQueueHUD');

      return {
        mode,
        cdTimer,
        overlayHidden: overlay && overlay.style.display === 'none',
        hostModalHidden: !hostModal || hostModal.style.display === 'none',
        hudExists: !!queueHUD && queueHUD.style.display !== 'none'
      };
    });

    console.log('Practice Result:', practiceResult);
    assert.strictEqual(practiceResult.mode, 'duel_ai', 'Practice must start duel_ai mode');
    assert.ok(practiceResult.cdTimer > 0, 'Countdown timer must be active');
    assert.strictEqual(practiceResult.overlayHidden, true, 'Overlay must be hidden');
    assert.strictEqual(practiceResult.hostModalHidden, true, 'Host modal must be hidden');
    assert.strictEqual(practiceResult.hudExists, false, 'Queue HUD must NOT exist in offline practice mode');
    console.log('>>> TEST 3 PASSED: Solo AI Practice starts offline duel with zero matchmaking HUD or queue signaling!');

    // =============================================================
    // TEST 4: Friendly Room Hosting -> Room Code without Warm-Up Bot
    // =============================================================
    console.log('\n--- TEST 4: Friendly Room Hosting -> Room Code Waiting Screen ---');
    const hostResult = await page.evaluate(async () => {
      window.__dbg.showModeSelect();
      const hostMatchBtn = document.getElementById('hostMatchBtn');
      hostMatchBtn.click();

      const hostModal = document.getElementById('hostModal');
      const hostModalVisible = hostModal && hostModal.style.display === 'flex';
      const host1v1Btn = document.getElementById('host1v1Btn');

      if (host1v1Btn) host1v1Btn.click();

      await new Promise(r => setTimeout(r, 150));

      const roomModal = document.getElementById('roomModal');
      const roomCodeEl = document.getElementById('roomCodeDisplay');
      const roomCode = roomCodeEl ? roomCodeEl.textContent.trim() : '';
      const hostWaitBlock = document.getElementById('hostWaitBlock');
      const queueHUD = document.getElementById('matchmakingQueueHUD');
      const mode = window.__dbg.mode();

      return {
        hostModalVisible,
        hostModalClosed: hostModal && hostModal.style.display === 'none',
        roomModalVisible: roomModal && roomModal.style.display === 'flex',
        roomCode,
        roomCodeValid: /^[A-Z0-9]{4}$/.test(roomCode),
        hostWaitVisible: hostWaitBlock && hostWaitBlock.style.display !== 'none',
        queueHudExists: !!queueHUD && queueHUD.style.display !== 'none',
        mode
      };
    });

    console.log('Host Result:', hostResult);
    assert.strictEqual(hostResult.hostModalVisible, true, 'Host modal must open when clicking #hostMatchBtn');
    assert.strictEqual(hostResult.hostModalClosed, true, 'Host modal must close after creating room');
    assert.strictEqual(hostResult.roomModalVisible, true, 'Room modal must open after creating room');
    assert.strictEqual(hostResult.roomCodeValid, true, `Room code must be a 4-character code (got "${hostResult.roomCode}")`);
    assert.strictEqual(hostResult.hostWaitVisible, true, 'Waiting for challenger block must be visible');
    assert.strictEqual(hostResult.queueHudExists, false, 'Queue HUD must NOT exist for friendly room hosting');
    assert.notStrictEqual(hostResult.mode, 'duel_ai', 'Warm-up bot duel must NOT be active while waiting in room modal');
    console.log('>>> TEST 4 PASSED: Friendly room hosting displays 4-character code with no warm-up bot or queue HUD!');

    // =============================================================
    // TEST 5: 3D Lobby Energy Core Duels Decoupling
    // =============================================================
    console.log('\n--- TEST 5: 3D Lobby Energy Core Duels Decoupling ---');
    const lobbyCoreResult = await page.evaluate(async () => {
      window.__dbg.showModeSelect();
      const lobbyManager = window.__tronLobbyCores;
      if (!lobbyManager) return { hasLobbyManager: false };

      // Trigger duels core confirmation modal
      const duelsCore = { id: 'duels', name: 'DUEL ARENA', color: 0x00ffff };
      lobbyManager.showConfirmModal(duelsCore);

      const confirmModal = document.getElementById('coreConfirmModal');
      const quickBtn = document.getElementById('btnCoreDuelQuick');
      const friendlyBtn = document.getElementById('btnCoreDuelFriendly');

      const modalVisible = confirmModal && confirmModal.style.display === 'flex';
      const defaultMode = lobbyManager.duelLaunchMode;

      // Select friendly room mode
      if (friendlyBtn) friendlyBtn.click();
      const friendlySelectedMode = lobbyManager.duelLaunchMode;

      // Select quick match mode
      if (quickBtn) quickBtn.click();
      const quickSelectedMode = lobbyManager.duelLaunchMode;

      lobbyManager.hideConfirmModal();

      return {
        hasLobbyManager: true,
        modalVisible,
        hasQuickBtn: !!quickBtn,
        hasFriendlyBtn: !!friendlyBtn,
        defaultMode,
        friendlySelectedMode,
        quickSelectedMode
      };
    });

    console.log('Lobby Core Result:', lobbyCoreResult);
    assert.strictEqual(lobbyCoreResult.hasLobbyManager, true, 'Lobby cores manager must be available');
    assert.strictEqual(lobbyCoreResult.modalVisible, true, 'Confirm modal must display when duels core triggered');
    assert.strictEqual(lobbyCoreResult.hasQuickBtn, true, 'Duels core confirmation must provide QUICK MATCH choice');
    assert.strictEqual(lobbyCoreResult.hasFriendlyBtn, true, 'Duels core confirmation must provide FRIENDLY ROOM choice');
    assert.strictEqual(lobbyCoreResult.defaultMode, 'quick', 'Default duel mode must be quick match');
    assert.strictEqual(lobbyCoreResult.friendlySelectedMode, 'friendly', 'Clicking friendly button must select friendly mode');
    assert.strictEqual(lobbyCoreResult.quickSelectedMode, 'quick', 'Clicking quick button must select quick mode');
    console.log('>>> TEST 5 PASSED: 3D Lobby Energy Core supports decoupled quick match & friendly room choices!');

    console.log('\n======================================================');
    console.log('ALL DECOUPLED MATCH ENTRY TESTS PASSED (100% SUCCESS) 🎉');
    console.log('======================================================');
  });
}

runDecoupledMatchEntryTests().catch((err) => {
  console.error('\n❌ Decoupled match entry test failed:', err);
  process.exit(1);
});
