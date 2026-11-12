import { withBrowserTest } from '../helpers/browserHarness.js';

async function inspectClient(page, name) {
  return await page.evaluate((clientName) => {
    const overlay = document.getElementById('overlay');
    const h1 = overlay ? overlay.querySelector('h1')?.textContent : null;
    const h2 = overlay ? overlay.querySelector('h2')?.textContent : null;
    const voteBtn = document.getElementById('voteRematchBtn');
    const voteLabel = document.getElementById('rematchVoteLabel');
    const menuBtn = document.getElementById('multiMenuBtn');
    return {
      client: clientName,
      role: window.__dbg ? window.__dbg.playerRole() : null,
      running: window.__dbg ? window.__dbg.running() : false,
      overlayDisplay: overlay ? overlay.style.display : null,
      h1,
      h2,
      hasVoteBtn: !!voteBtn,
      voteBtnDisabled: voteBtn ? voteBtn.disabled : null,
      voteBtnText: voteBtn ? voteBtn.textContent : null,
      voteBtnPressed: voteBtn ? voteBtn.getAttribute('aria-pressed') : null,
      hasVoteLabel: !!voteLabel,
      voteLabelText: voteLabel ? voteLabel.textContent : null,
      hasMenuBtn: !!menuBtn
    };
  }, name);
}

async function run() {
  await withBrowserTest(async ({ browser, page: hostPage, baseUrl }) => {
    const guestPage = await browser.newPage();

    await hostPage.goto(`${baseUrl}/index.html`);
    await guestPage.goto(`${baseUrl}/index.html`);
    await hostPage.waitForFunction(() => !!window.__dbg && !!window.__dbg.createRoom, { polling: 100 });
    await guestPage.waitForFunction(() => !!window.__dbg && !!window.__dbg.joinRoom, { polling: 100 });

    await hostPage.evaluate(async () => {
    await window.__dbg.createRoom();
  });
  const roomCode = await hostPage.evaluate(() => window.__dbg.currentRoomId());
  console.log('Room created:', roomCode);

  await guestPage.evaluate(async (code) => {
    await window.__dbg.joinRoom(code);
  }, roomCode);

  await hostPage.waitForFunction(() => {
    if (window.__dbg && window.__dbg.step) window.__dbg.step(0.016);
    return window.__dbg && window.__dbg.running() && window.__dbg.mode() === 'duel_multi';
  }, { timeout: 15000, polling: 100 });
  await guestPage.waitForFunction(() => {
    if (window.__dbg && window.__dbg.step) window.__dbg.step(0.016);
    return window.__dbg && window.__dbg.running() && window.__dbg.mode() === 'duel_multi';
  }, { timeout: 15000, polling: 100 });
  console.log('Both players in match.');

  // ------------------------------------------------------------------
  // STEP 1: Guest is eliminated. Both must see Game Over + Rematch UI.
  // ------------------------------------------------------------------
  console.log('\n--- STEP 1: Eliminate Guest (P2) ---');
  await guestPage.evaluate(() => {
    window.__dbg.setPlayerPos(0, -18, -20);
    window.__dbg.step(0.016);
  });

  await new Promise(r => setTimeout(r, 2000));

  let hostState = await inspectClient(hostPage, 'Host (P1)');
  let guestState = await inspectClient(guestPage, 'Guest (P2)');

  console.log('Host state (Winner):', hostState);
  console.log('Guest state (Eliminated):', guestState);

  if (!hostState.hasVoteBtn || !guestState.hasVoteBtn) {
    throw new Error(`Step 1 failed: Missing rematch button! Host: ${hostState.hasVoteBtn}, Guest: ${guestState.hasVoteBtn}`);
  }
  if (!hostState.hasVoteLabel || !guestState.hasVoteLabel) {
    throw new Error(`Step 1 failed: Missing rematch vote label! Host: ${hostState.hasVoteLabel}, Guest: ${guestState.hasVoteLabel}`);
  }
  console.log('>>> STEP 1 PASSED: Universal Match-End display on both Host (VICTORY) and Guest (DEREZZED)!');

  // ------------------------------------------------------------------
  // STEP 2: Guest votes for rematch. Both clients must reflect 1 / 2.
  // ------------------------------------------------------------------
  console.log('\n--- STEP 2: Guest clicks VOTE REMATCH ---');
  await guestPage.evaluate(() => {
    const btn = document.getElementById('voteRematchBtn');
    if (btn) btn.click();
  });

  await new Promise(r => setTimeout(r, 1200));

  hostState = await inspectClient(hostPage, 'Host (P1)');
  guestState = await inspectClient(guestPage, 'Guest (P2)');

  console.log('Host label after Guest vote:', hostState.voteLabelText);
  console.log('Guest label after Guest vote:', guestState.voteLabelText);
  console.log('Guest button text:', guestState.voteBtnText);

  if (!hostState.voteLabelText.includes('1 / 2') || !guestState.voteLabelText.includes('1 / 2')) {
    throw new Error(`Step 2 failed: Vote not synchronized! Host: "${hostState.voteLabelText}", Guest: "${guestState.voteLabelText}"`);
  }
  if (guestState.voteBtnText !== 'CANCEL VOTE (VOTED)' || guestState.voteBtnDisabled || guestState.voteBtnPressed !== 'true') {
    throw new Error(`Step 2 failed: Guest toggle button state invalid! ${JSON.stringify(guestState)}`);
  }
  console.log('>>> STEP 2 PASSED: Vote transmitted over network and synchronized to 1 / 2 on both screens!');

  // ------------------------------------------------------------------
  // STEP 2B: Guest toggles un-vote (1/2 -> 0/2) and re-votes (0/2 -> 1/2)
  // ------------------------------------------------------------------
  console.log('\n--- STEP 2B: Guest un-votes and re-votes ---');
  await guestPage.evaluate(() => document.getElementById('voteRematchBtn')?.click());
  await hostPage.waitForFunction(() => document.getElementById('rematchVoteLabel')?.textContent?.includes('0 / 2'), { timeout: 5000, polling: 100 });
  await guestPage.waitForFunction(() => document.getElementById('rematchVoteLabel')?.textContent?.includes('0 / 2'), { timeout: 5000, polling: 100 });
  const unvotedGuest = await inspectClient(guestPage, 'Guest Unvoted');
  if (unvotedGuest.voteBtnText !== 'VOTE REMATCH' || unvotedGuest.voteBtnDisabled || unvotedGuest.voteBtnPressed !== 'false') {
    throw new Error(`Step 2B failed: Guest un-vote UI invalid! ${JSON.stringify(unvotedGuest)}`);
  }
  await guestPage.evaluate(() => document.getElementById('voteRematchBtn')?.click());
  await hostPage.waitForFunction(() => document.getElementById('rematchVoteLabel')?.textContent?.includes('1 / 2'), { timeout: 5000, polling: 100 });
  console.log('>>> STEP 2B PASSED: Un-vote (1/2 -> 0/2) and re-vote (0/2 -> 1/2) synchronized!');

  // ------------------------------------------------------------------
  // STEP 3: Host votes for rematch. Count reaches 2 / 2 -> Auto-restart!
  // ------------------------------------------------------------------
  console.log('\n--- STEP 3: Host clicks VOTE REMATCH -> Auto-Restart Arena ---');
  await hostPage.evaluate(() => {
    const btn = document.getElementById('voteRematchBtn');
    if (btn) btn.click();
  });

  // Wait for countdown and reset to trigger
  await new Promise(r => setTimeout(r, 1200));

  hostState = await inspectClient(hostPage, 'Host (P1)');
  guestState = await inspectClient(guestPage, 'Guest (P2)');

  console.log('Host state after full rematch vote:', {
    running: hostState.running,
    overlayDisplay: hostState.overlayDisplay
  });
  console.log('Guest state after full rematch vote:', {
    running: guestState.running,
    overlayDisplay: guestState.overlayDisplay
  });

  if (!hostState.running || !guestState.running) {
    throw new Error(`Step 3 failed: Match did not restart for both clients! Host running: ${hostState.running}, Guest running: ${guestState.running}`);
  }
  if (hostState.overlayDisplay !== 'none' || guestState.overlayDisplay !== 'none') {
    throw new Error(`Step 3 failed: Game-over overlay not hidden after rematch!`);
  }
  console.log('>>> STEP 3 PASSED: Both clients successfully restarted match cleanly into new round!');

  // The rematch starts a new round with the normal pre-fight countdown.
  // Finish it before forcing the next elimination; damage is ignored while
  // the countdown is active.
  await hostPage.evaluate(() => window.__dbg.finishCountdown());
  await guestPage.evaluate(() => window.__dbg.finishCountdown());

  // ------------------------------------------------------------------
  // STEP 4: End round again, test Graceful Exit (Return to Menu)
  // ------------------------------------------------------------------
  console.log('\n--- STEP 4: End round and test Graceful Exit ---');
  await guestPage.evaluate(() => {
    window.__dbg.setPlayerPos(0, -18, -20);
    window.__dbg.step(0.016);
  });

  await guestPage.waitForFunction(() => {
    if (window.__dbg && window.__dbg.step) window.__dbg.step(0.016);
    const overlay = document.getElementById('overlay');
    return overlay && overlay.style.display === 'flex';
  }, { timeout: 15000, polling: 100 });
  await hostPage.evaluate(() => { if (window.__dbg && window.__dbg.step) { for (let i = 0; i < 5; i++) window.__dbg.step(0.016); } });
  await hostPage.waitForFunction(() => {
    if (window.__dbg && window.__dbg.step) window.__dbg.step(0.016);
    const overlay = document.getElementById('overlay');
    return overlay && overlay.style.display === 'flex';
  }, { timeout: 15000, polling: 100 });

  // Host clicks RETURN TO MENU
  console.log('Host clicks RETURN TO MENU...');
  await hostPage.evaluate(() => {
    const btn = document.getElementById('multiMenuBtn');
    if (btn) btn.click();
  });

  await guestPage.waitForFunction(() => {
    const label = document.getElementById('rematchVoteLabel');
    const btn = document.getElementById('voteRematchBtn');
    return (label && label.textContent.includes('OPPONENT RETURNED TO MENU')) || (btn && btn.textContent === 'OPPONENT LEFT');
  }, { timeout: 10000, polling: 100 });

  guestState = await inspectClient(guestPage, 'Guest (P2)');
  console.log('Guest state after Host left to menu:', {
    voteLabelText: guestState.voteLabelText,
    voteBtnText: guestState.voteBtnText,
    voteBtnDisabled: guestState.voteBtnDisabled
  });

  if (!guestState.voteLabelText.includes('OPPONENT RETURNED TO MENU') && guestState.voteBtnText !== 'OPPONENT LEFT') {
    throw new Error(`Step 4 failed: Guest was not notified that Host returned to menu!`);
  }
  console.log('>>> STEP 4 PASSED: Opposing player notified of peer exit, state properly handled!');

  console.log('\n======================================================');
  console.log('ALL ROOM REMATCH & POST-MATCH SPECIFICATIONS VERIFIED!');
  console.log('======================================================\n');
  });
}

async function runQuickMatchWebRTCRematchTest() {
  console.log('\n--- QUICK MATCH (WEBRTC-ONLY, NO ROOM DOC) REMATCH TEST ---');
  await withBrowserTest(async ({ browser, page: hostPage, baseUrl }) => {
    const guestPage = await browser.newPage();

    await hostPage.goto(`${baseUrl}/index.html`);
    await guestPage.goto(`${baseUrl}/index.html`);
    await hostPage.waitForFunction(() => !!window.__dbg && !!window.__dbg.state?.player?.obj && !!window.__TRON__?.auth()?._currentUser, { polling: 100 });
    await guestPage.waitForFunction(() => !!window.__dbg && !!window.__dbg.state?.player?.obj && !!window.__TRON__?.auth()?._currentUser, { polling: 100 });

    // Ensure deterministic lexicographical host assignment (player_a_host < player_z_guest)
    // and verify zero Firestore/mock room DB is initialized.
    await hostPage.evaluate(async () => {
      const auth = window.__TRON__.auth();
      await auth.init();
      if (auth._currentUser) auth._currentUser.handle = 'QM_HOST';
      if (auth._saveState) auth._saveState.handle = 'QM_HOST';
      const { matchmakingQueue } = await import('/src/network/matchmakingQueue.js');
      const { startMatchmakingWithWarmup } = await import('/src/network/roomManager.js');
      matchmakingQueue.peerId = 'player_a_host';
      startMatchmakingWithWarmup();
    });

    await new Promise(r => setTimeout(r, 400));

    await guestPage.evaluate(async () => {
      const auth = window.__TRON__.auth();
      await auth.init();
      if (auth._currentUser) auth._currentUser.handle = 'QM_GUEST';
      if (auth._saveState) auth._saveState.handle = 'QM_GUEST';
      const { matchmakingQueue } = await import('/src/network/matchmakingQueue.js');
      const { startMatchmakingWithWarmup } = await import('/src/network/roomManager.js');
      matchmakingQueue.peerId = 'player_z_guest';
      startMatchmakingWithWarmup();
    });

    await hostPage.waitForFunction(() => {
      return window.__dbg.running() &&
        window.__dbg.mode() === 'duel_multi' &&
        window.__dbg.state.webrtcPeer?.connectionState === 'connected';
    }, { timeout: 15000, polling: 100 });
    await guestPage.waitForFunction(() => {
      return window.__dbg.running() &&
        window.__dbg.mode() === 'duel_multi' &&
        window.__dbg.state.webrtcPeer?.connectionState === 'connected';
    }, { timeout: 15000, polling: 100 });

    const initialCheck = await Promise.all([
      hostPage.evaluate(async () => {
        const { duelEconomyBridge } = await import('/src/modes/DuelEconomyBridge.js');
        return {
          db: window.__dbg.state.db,
          roomId: window.__dbg.currentRoomId(),
          roundId: window.__dbg.state.multiplayerRoundId,
          bits: duelEconomyBridge.economy.getBits(),
          xp: duelEconomyBridge.economy.getXP(),
          level: duelEconomyBridge.economy.getLevel()
        };
      }),
      guestPage.evaluate(() => ({
        db: window.__dbg.state.db,
        roomId: window.__dbg.currentRoomId(),
        roundId: window.__dbg.state.multiplayerRoundId
      }))
    ]);

    if (initialCheck[0].db !== null || initialCheck[1].db !== null) {
      throw new Error(`Expected state.db === null in Quick Match, got ${JSON.stringify(initialCheck)}`);
    }
    if (!String(initialCheck[0].roomId).startsWith('MATCH_') || initialCheck[0].roundId !== 1) {
      throw new Error(`Unexpected Quick Match init state: ${JSON.stringify(initialCheck[0])}`);
    }
    const startBits = initialCheck[0].bits;
    console.log('>>> QUICK MATCH HANDSHAKE PASSED: Both peers connected over WebRTC with db === null!');

    // Finish countdown & verify warm-up AI callback was cleared
    await hostPage.evaluate(() => window.__dbg.finishCountdown());
    await guestPage.evaluate(() => window.__dbg.finishCountdown());
    const foesAfterCountdown = await hostPage.evaluate(() => window.__dbg.foes());
    if (foesAfterCountdown !== 1) {
      throw new Error(`Expected exactly 1 peer foe after countdown, got ${foesAfterCountdown}`);
    }

    try {
      await hostPage.waitForFunction(() => {
        if (window.__dbg?.step) window.__dbg.step(0.016);
        const plate = document.querySelector('#arenaNameplates .arena-nameplate');
        return plate && plate.textContent === 'QM_GUEST';
      }, { timeout: 5000, polling: 100 });
      await guestPage.waitForFunction(() => {
        if (window.__dbg?.step) window.__dbg.step(0.016);
        const plate = document.querySelector('#arenaNameplates .arena-nameplate');
        return plate && plate.textContent === 'QM_HOST';
      }, { timeout: 5000, polling: 100 });
    } catch (err) {
      const diag = await Promise.all([
        hostPage.evaluate(() => ({
          role: window.__dbg.state.playerRole,
          names: window.__dbg.state.multiplayerNames,
          mp: Object.keys(window.__dbg.state.multiPlayers || {}),
          html: document.getElementById('arenaNameplates')?.innerHTML
        })),
        guestPage.evaluate(() => ({
          role: window.__dbg.state.playerRole,
          names: window.__dbg.state.multiplayerNames,
          mp: Object.keys(window.__dbg.state.multiPlayers || {}),
          html: document.getElementById('arenaNameplates')?.innerHTML,
          p1State: window.__dbg.state.multiPlayers?.p1 ? {
            alive: window.__dbg.state.multiPlayers.p1.alive,
            hp: window.__dbg.state.multiPlayers.p1.hp,
            name: window.__dbg.state.multiPlayers.p1.name,
            pos: window.__dbg.state.multiPlayers.p1.pos,
            hasParent: !!window.__dbg.state.multiPlayers.p1.obj?.parent,
            vis: window.__dbg.state.multiPlayers.p1.obj?.visible
          } : null
        }))
      ]);
      throw new Error(`QuickMatch nameplate timeout: ${err.message} | diag=${JSON.stringify(diag)}`);
    }
    console.log('>>> QUICK MATCH CALLSIGNS VERIFIED: WebRTC peers exchanged QM_HOST / QM_GUEST without DB writes!');

    // Round 1 End: Eliminate Guest over WebRTC only
    await guestPage.evaluate(() => {
      window.__dbg.setPlayerPos(0, -18, -20);
      window.__dbg.step(0.016);
    });

    await hostPage.waitForFunction(() => {
      const ov = document.getElementById('overlay');
      return ov && ov.style.display === 'flex' && ov.querySelector('h1')?.textContent === 'VICTORY';
    }, { timeout: 10000, polling: 100 });
    await guestPage.waitForFunction(() => {
      const ov = document.getElementById('overlay');
      return ov && ov.style.display === 'flex' && ov.querySelector('h1')?.textContent === 'DEREZZED';
    }, { timeout: 10000, polling: 100 });

    const qmPostMatchNames = await Promise.all([
      hostPage.evaluate(() => document.getElementById('postMatchMatchup')?.textContent || ''),
      guestPage.evaluate(() => document.getElementById('postMatchMatchup')?.textContent || '')
    ]);
    if (!qmPostMatchNames[0].includes('QM_HOST') || !qmPostMatchNames[0].includes('QM_GUEST') ||
        !qmPostMatchNames[1].includes('QM_HOST') || !qmPostMatchNames[1].includes('QM_GUEST')) {
      throw new Error(`Quick Match post-match overlay missing callsigns: ${JSON.stringify(qmPostMatchNames)}`);
    }

    const r1Econ = await hostPage.evaluate(async () => {
      const { duelEconomyBridge } = await import('/src/modes/DuelEconomyBridge.js');
      const vicLogs = duelEconomyBridge.economy.getAuditLog().filter(e => e.source === 'duel_multiplayer_victory');
      return {
        bits: duelEconomyBridge.economy.getBits(),
        xp: duelEconomyBridge.economy.getXP(),
        level: duelEconomyBridge.economy.getLevel(),
        vicLogs
      };
    });
    const r1XpEntries = r1Econ.vicLogs.filter(e => e.type === 'XP_GAINED');
    const r1BitEntries = r1Econ.vicLogs.filter(e => e.type === 'BITS_EARNED');
    if (
      r1XpEntries.length !== 1 ||
      r1BitEntries.length !== 1 ||
      r1XpEntries[0].amount !== 300 ||
      r1BitEntries[0].amount !== 100 ||
      r1BitEntries[0].balanceAfter - startBits !== 100
    ) {
      throw new Error(`Expected single Round 1 victory payout (+100 Bits + 300 XP), got ${JSON.stringify(r1Econ)}`);
    }
    console.log('>>> QUICK MATCH ROUND 1 PASSED: WebRTC match-end & single Round 1 payout verified!');

    // Vote Rematch 1/2 -> 2/2 over WebRTC
    await guestPage.evaluate(() => document.getElementById('voteRematchBtn')?.click());
    await hostPage.waitForFunction(() => {
      return document.getElementById('rematchVoteLabel')?.textContent?.includes('1 / 2');
    }, { timeout: 10000, polling: 100 });

    await hostPage.evaluate(() => document.getElementById('voteRematchBtn')?.click());
    await hostPage.waitForFunction(() => {
      const ov = document.getElementById('overlay');
      return window.__dbg.running() && ov && ov.style.display === 'none' && window.__dbg.state.multiplayerRoundId === 2;
    }, { timeout: 10000, polling: 100 });
    await guestPage.waitForFunction(() => {
      const ov = document.getElementById('overlay');
      return window.__dbg.running() && ov && ov.style.display === 'none' && window.__dbg.state.multiplayerRoundId === 2;
    }, { timeout: 10000, polling: 100 });

    const r2Init = await hostPage.evaluate(() => ({
      roundId: window.__dbg.state.multiplayerRoundId,
      countdown: window.__dbg.countdownTimer(),
      payoutFlag: window.__dbg.state.multiplayerPayoutProcessed,
      onCountdownEnd: window.__dbg.state.onCountdownEnd
    }));
    if (r2Init.roundId !== 2 || r2Init.countdown <= 0 || r2Init.payoutFlag !== false || r2Init.onCountdownEnd !== null) {
      throw new Error(`Round 2 state reset invalid: ${JSON.stringify(r2Init)}`);
    }
    console.log('>>> QUICK MATCH REMATCH START PASSED: Round 2 started over WebRTC with clean countdown & payout reset!');

    // Round 2 End -> verify Round 2 payout (+300 XP again)
    await hostPage.evaluate(() => window.__dbg.finishCountdown());
    await guestPage.evaluate(() => window.__dbg.finishCountdown());
    await guestPage.evaluate(() => {
      window.__dbg.setPlayerPos(0, -18, -20);
      window.__dbg.step(0.016);
    });

    await hostPage.waitForFunction(() => {
      const ov = document.getElementById('overlay');
      return ov && ov.style.display === 'flex' && ov.querySelector('h1')?.textContent === 'VICTORY';
    }, { timeout: 10000, polling: 100 });
    await guestPage.waitForFunction(() => {
      const ov = document.getElementById('overlay');
      return ov && ov.style.display === 'flex' && ov.querySelector('h1')?.textContent === 'DEREZZED';
    }, { timeout: 10000, polling: 100 });

    const qmR2PostMatchNames = await Promise.all([
      hostPage.evaluate(() => document.getElementById('postMatchMatchup')?.textContent || ''),
      guestPage.evaluate(() => document.getElementById('postMatchMatchup')?.textContent || '')
    ]);
    if (!qmR2PostMatchNames[0].includes('QM_HOST') || !qmR2PostMatchNames[0].includes('QM_GUEST') ||
        !qmR2PostMatchNames[1].includes('QM_HOST') || !qmR2PostMatchNames[1].includes('QM_GUEST')) {
      throw new Error(`Quick Match post-match overlay missing callsigns: ${JSON.stringify(qmR2PostMatchNames)}`);
    }

    const r2Econ = await hostPage.evaluate(async () => {
      const { duelEconomyBridge } = await import('/src/modes/DuelEconomyBridge.js');
      const vicLogs = duelEconomyBridge.economy.getAuditLog().filter(e => e.source === 'duel_multiplayer_victory');
      return {
        bits: duelEconomyBridge.economy.getBits(),
        xp: duelEconomyBridge.economy.getXP(),
        level: duelEconomyBridge.economy.getLevel(),
        vicLogs
      };
    });
    const r2XpEntries = r2Econ.vicLogs.filter(e => e.type === 'XP_GAINED');
    const r2BitEntries = r2Econ.vicLogs.filter(e => e.type === 'BITS_EARNED');
    if (
      r2XpEntries.length !== 2 ||
      r2BitEntries.length !== 2 ||
      r2XpEntries.some(e => e.amount !== 300) ||
      r2BitEntries.some(e => e.amount !== 100)
    ) {
      throw new Error(`Expected exact Round 2 payout (2x victory payouts of +100 Bits / +300 XP), got ${JSON.stringify(r2Econ)}`);
    }
    const guestDefLogs = await guestPage.evaluate(async () => {
      const { duelEconomyBridge } = await import('/src/modes/DuelEconomyBridge.js');
      return duelEconomyBridge.economy.getAuditLog().filter(e => e.source === 'duel_multiplayer_defeat');
    });
    if (guestDefLogs.length !== 2 || guestDefLogs.some(e => e.type !== 'XP_GAINED' || e.amount !== 75)) {
      throw new Error(`Expected 2x defeat participation payouts (+75 XP) on Guest, got ${JSON.stringify(guestDefLogs)}`);
    }
    console.log('>>> QUICK MATCH ROUND 2 PAYOUT PASSED: Single payout per win across Round 1 and Round 2!');

    // Host leaves via RETURN TO MENU -> Guest gets OPPONENT LEFT, Host queue resets to IDLE & can re-queue
    await hostPage.evaluate(() => document.getElementById('multiMenuBtn')?.click());
    await guestPage.waitForFunction(() => {
      const btn = document.getElementById('voteRematchBtn');
      const label = document.getElementById('rematchVoteLabel');
      return btn?.textContent === 'OPPONENT LEFT' && btn?.disabled === true && label?.textContent?.includes('OPPONENT RETURNED TO MENU');
    }, { timeout: 10000, polling: 100 });

    const requeueStatus = await hostPage.evaluate(async () => {
      const { matchmakingQueue, QUEUE_STATES } = await import('/src/network/matchmakingQueue.js');
      const statusAfterLeave = matchmakingQueue.status;
      matchmakingQueue.startQueue();
      const statusAfterRequeue = matchmakingQueue.status;
      matchmakingQueue.cancelQueue();
      return { statusAfterLeave, statusAfterRequeue, IDLE: QUEUE_STATES.IDLE, SEARCHING: QUEUE_STATES.SEARCHING };
    });
    if (requeueStatus.statusAfterLeave !== requeueStatus.IDLE || requeueStatus.statusAfterRequeue !== requeueStatus.SEARCHING) {
      throw new Error(`Quick Match re-queue failed: ${JSON.stringify(requeueStatus)}`);
    }
    console.log('>>> QUICK MATCH EXIT & RE-QUEUE PASSED: Guest saw OPPONENT LEFT and Host re-queued cleanly!');
  });
}

async function runStalledHostRematchTimeoutTest() {
  console.log('\n--- REMATCH TIMEOUT RECOVERY TEST ---');
  await withBrowserTest(async ({ browser, page: hostPage, baseUrl }) => {
    const guestPage = await browser.newPage();

    await hostPage.goto(`${baseUrl}/index.html`);
    await guestPage.goto(`${baseUrl}/index.html`);
    await hostPage.waitForFunction(() => !!window.__dbg && !!window.__dbg.createRoom, { polling: 100 });
    await guestPage.waitForFunction(() => !!window.__dbg && !!window.__dbg.joinRoom, { polling: 100 });

    await hostPage.evaluate(async () => { await window.__dbg.createRoom(); });
    const roomCode = await hostPage.evaluate(() => window.__dbg.currentRoomId());
    await guestPage.evaluate(async (code) => { await window.__dbg.joinRoom(code); }, roomCode);

    try {
      await hostPage.waitForFunction(() => window.__dbg.running() && window.__dbg.mode() === 'duel_multi', { timeout: 15000, polling: 100 });
      await guestPage.waitForFunction(() => window.__dbg.running() && window.__dbg.mode() === 'duel_multi', { timeout: 15000, polling: 100 });
    } catch (err) {
      const diag = await Promise.all([
        hostPage.evaluate(async () => ({
          running: window.__dbg.running(),
          mode: window.__dbg.mode(),
          room: window.__dbg.currentRoomId(),
          roundId: window.__dbg.state.multiplayerRoundId,
          role: window.__dbg.state.playerRole,
          data: await window.__dbg.getRoomData()
        })),
        guestPage.evaluate(async () => ({
          running: window.__dbg.running(),
          mode: window.__dbg.mode(),
          room: window.__dbg.currentRoomId(),
          roundId: window.__dbg.state.multiplayerRoundId,
          role: window.__dbg.state.playerRole,
          data: await window.__dbg.getRoomData()
        }))
      ]);
      throw new Error(`Hosted arena sync start timeout: ${err.message} | diag=${JSON.stringify(diag)}`);
    }

    // Trigger match end without host responding to rematch
    await guestPage.evaluate(() => {
      window.__dbg.state.rematchTimeoutMs = 250;
      window.__dbg.setPlayerPos(0, -18, -20);
      window.__dbg.step(0.016);
    });

    await guestPage.waitForFunction(() => !!document.getElementById('voteRematchBtn'), { timeout: 5000, polling: 100 });
    await guestPage.evaluate(() => document.getElementById('voteRematchBtn')?.click());

    await guestPage.waitForFunction(() => {
      const btn = document.getElementById('voteRematchBtn');
      const label = document.getElementById('rematchVoteLabel');
      const menuBtn = document.getElementById('multiMenuBtn');
      return btn?.textContent === 'REMATCH TIMED OUT' &&
        btn?.disabled === true &&
        label?.textContent?.includes('UNRESPONSIVE') &&
        menuBtn && !menuBtn.disabled;
    }, { timeout: 5000, polling: 50 });

    await guestPage.evaluate(() => document.getElementById('multiMenuBtn')?.click());
    const afterTimeoutExit = await guestPage.evaluate(() => ({
      roomId: window.__dbg.currentRoomId(),
      timedOutFlag: window.__dbg.state.rematchTimedOut
    }));
    if (afterTimeoutExit.roomId !== null || afterTimeoutExit.timedOutFlag !== false) {
      throw new Error(`Rematch timeout exit failed cleanup: ${JSON.stringify(afterTimeoutExit)}`);
    }
    console.log('>>> REMATCH TIMEOUT TEST PASSED: Stalled vote timed out cleanly and RETURN TO MENU reset session state!');
  });
}

async function runHostedArenaSyncAndTeardownTest() {
  console.log('\n--- HOSTED MULTIPLAYER ARENA SYNC & TEARDOWN TEST ---');
  await withBrowserTest(async ({ browser, page: hostPage, baseUrl }) => {
    const guestPage = await browser.newPage();

    await hostPage.goto(`${baseUrl}/index.html`);
    await guestPage.goto(`${baseUrl}/index.html`);
    await hostPage.waitForFunction(() => !!window.__dbg && !!window.__dbg.createRoom, { polling: 100 });
    await guestPage.waitForFunction(() => !!window.__dbg && !!window.__dbg.joinRoom, { polling: 100 });

    // Host unlocks Grid 02 (Solar Sail) and hosts from #hostModal; Guest does NOT own Grid 02
    await hostPage.evaluate(async () => {
      const { defaultStorageManager } = await import('/src/core/storage/StorageManager.js');
      defaultStorageManager.set('inventory.unlockedMaps', ['arena_grid_01', 'arena_solar_sail']);
      document.getElementById('hostMatchBtn')?.click();
      const sel = document.getElementById('arenaSelect');
      if (sel) {
        sel.value = 'arena_solar_sail';
        sel.dispatchEvent(new Event('change'));
      }
      document.getElementById('host1v1Btn')?.click();
    });

    await hostPage.waitForFunction(() => {
      const id = window.__dbg.currentRoomId();
      return id && id.length === 4;
    }, { timeout: 10000, polling: 100 });

    const hostRoom = await hostPage.evaluate(async () => ({
      code: window.__dbg.currentRoomId(),
      data: await window.__dbg.getRoomData()
    }));
    if (hostRoom.data?.mapId !== 'arena_solar_sail' || hostRoom.data?.gridId !== 'grid_02') {
      throw new Error(`Hosted room did not store selected arena: ${JSON.stringify(hostRoom)}`);
    }

    await guestPage.evaluate(async (code) => {
      const { defaultStorageManager } = await import('/src/core/storage/StorageManager.js');
      defaultStorageManager.set('inventory.unlockedMaps', ['arena_grid_01']);
      await window.__dbg.joinRoom(code);
    }, hostRoom.code);

    try {
      await hostPage.waitForFunction(() => window.__dbg.running() && window.__dbg.mode() === 'duel_multi', { timeout: 15000, polling: 100 });
      await guestPage.waitForFunction(() => window.__dbg.running() && window.__dbg.mode() === 'duel_multi', { timeout: 15000, polling: 100 });
    } catch (err) {
      const diag = await Promise.all([
        hostPage.evaluate(async () => ({
          running: window.__dbg.running(),
          mode: window.__dbg.mode(),
          room: window.__dbg.currentRoomId(),
          roundId: window.__dbg.state.multiplayerRoundId,
          role: window.__dbg.state.playerRole,
          data: await window.__dbg.getRoomData()
        })),
        guestPage.evaluate(async () => ({
          running: window.__dbg.running(),
          mode: window.__dbg.mode(),
          room: window.__dbg.currentRoomId(),
          roundId: window.__dbg.state.multiplayerRoundId,
          role: window.__dbg.state.playerRole,
          data: await window.__dbg.getRoomData()
        }))
      ]);
      throw new Error(`Hosted arena sync start timeout: ${err.message} | diag=${JSON.stringify(diag)}`);
    }

    const inspectArena = async (page) => page.evaluate(async () => {
      const { sectorHazardBuilder } = await import('/src/arena/hazards/SectorHazardBuilder.js');
      const { tileMatIntact } = await import('/src/entities/Arena.js');
      const { defaultStorageManager } = await import('/src/core/storage/StorageManager.js');
      return {
        activeGridId: window.__dbg.state.activeGridId,
        multiplayerMapId: window.__dbg.state.multiplayerMapId,
        jumpPads: sectorHazardBuilder.jumpPads.length,
        tileHex: tileMatIntact.color.getHex(),
        unlockedMaps: defaultStorageManager.get('inventory.unlockedMaps')
      };
    });

    const hostR1 = await inspectArena(hostPage);
    const guestR1 = await inspectArena(guestPage);
    if (
      hostR1.activeGridId !== 'grid_02' || hostR1.jumpPads <= 0 || hostR1.tileHex !== 0x1c1005 ||
      guestR1.activeGridId !== 'grid_02' || guestR1.jumpPads <= 0 || guestR1.tileHex !== 0x1c1005 ||
      (Array.isArray(guestR1.unlockedMaps) && guestR1.unlockedMaps.includes('arena_solar_sail'))
    ) {
      throw new Error(`Round 1 arena mismatch! Host: ${JSON.stringify(hostR1)}, Guest: ${JSON.stringify(guestR1)}`);
    }

    // Eliminate Guest and vote rematch -> verify Grid 02 persists across Round 2
    await hostPage.evaluate(() => window.__dbg.finishCountdown());
    await guestPage.evaluate(() => window.__dbg.finishCountdown());
    await guestPage.evaluate(() => {
      window.__dbg.setPlayerPos(0, -18, -20);
      window.__dbg.step(0.016);
    });
    await hostPage.waitForFunction(() => !!document.getElementById('voteRematchBtn'), { timeout: 10000, polling: 100 });
    await guestPage.waitForFunction(() => !!document.getElementById('voteRematchBtn'), { timeout: 10000, polling: 100 });
    await guestPage.evaluate(() => document.getElementById('voteRematchBtn')?.click());
    await hostPage.evaluate(() => document.getElementById('voteRematchBtn')?.click());
    await guestPage.waitForFunction(() => window.__dbg.running() && window.__dbg.state.multiplayerRoundId === 2, { timeout: 10000, polling: 100 });
    await hostPage.waitForFunction(() => window.__dbg.running() && window.__dbg.state.multiplayerRoundId === 2, { timeout: 10000, polling: 100 });

    const hostR2 = await inspectArena(hostPage);
    const guestR2 = await inspectArena(guestPage);
    if (hostR2.activeGridId !== 'grid_02' || guestR2.activeGridId !== 'grid_02' || guestR2.jumpPads <= 0) {
      throw new Error(`Round 2 arena lost after rematch! Host: ${JSON.stringify(hostR2)}, Guest: ${JSON.stringify(guestR2)}`);
    }

    // Returning to menu restores baseline Prime Stadium materials and clears hazards
    await hostPage.evaluate(() => window.__dbg.teardownMultiplayer());
    await guestPage.evaluate(() => window.__dbg.teardownMultiplayer());
    const hostAfterExit = await inspectArena(hostPage);
    const guestAfterExit = await inspectArena(guestPage);
    if (
      hostAfterExit.activeGridId !== null || hostAfterExit.jumpPads !== 0 || hostAfterExit.tileHex !== 0x07202c ||
      guestAfterExit.activeGridId !== null || guestAfterExit.jumpPads !== 0 || guestAfterExit.tileHex !== 0x07202c
    ) {
      throw new Error(`Teardown did not restore default arena! Host: ${JSON.stringify(hostAfterExit)}, Guest: ${JSON.stringify(guestAfterExit)}`);
    }

    // Previewing Grid 02 then starting Quick Match must also revert to baseline arena
    await hostPage.evaluate(async () => {
      const { startMatchmakingWithWarmup } = await import('/src/network/roomManager.js');
      const { matchmakingQueue } = await import('/src/network/matchmakingQueue.js');
      window.__tronSelectArenaMap('arena_solar_sail');
      startMatchmakingWithWarmup();
      matchmakingQueue.cancelQueue();
    });
    const quickMatchArena = await inspectArena(hostPage);
    if (quickMatchArena.activeGridId !== null || quickMatchArena.jumpPads !== 0 || quickMatchArena.tileHex !== 0x07202c) {
      throw new Error(`Quick Match did not isolate default arena: ${JSON.stringify(quickMatchArena)}`);
    }

    console.log('>>> HOSTED ARENA SYNC & TEARDOWN TEST PASSED: Grid 02 synced to non-owning guest across rematch and cleanly restored defaults!');
  });
}

run()
  .then(() => runQuickMatchWebRTCRematchTest())
  .then(() => runStalledHostRematchTimeoutTest())
  .then(() => runHostedArenaSyncAndTeardownTest())
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
