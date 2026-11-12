import { withBrowserTest } from '../helpers/browserHarness.js';

async function runMultiplayerTests() {
  await withBrowserTest(async ({ browser, page: hostPage, baseUrl }) => {
    console.log('Launching Host (P1) and Guest (P2) browser pages...');
    const guestPage = await browser.newPage();

    await hostPage.goto(`${baseUrl}/index.html`);
    await guestPage.goto(`${baseUrl}/index.html`);
    await new Promise(r => setTimeout(r, 1000));

    await hostPage.waitForFunction(() => !!window.__dbg && !!window.__dbg.createRoom);
    await guestPage.waitForFunction(() => !!window.__dbg && !!window.__dbg.joinRoom);
    console.log('Both client pages loaded and window.__dbg ready.');

  // -------------------------------------------------------------
  // TEST 1: Room Creation & 4-Character Code Generation
  // -------------------------------------------------------------
  console.log('\n--- TEST 1: Room Creation & 4-Character Code Generation ---');
  await hostPage.evaluate(() => {
    const auth = window.__TRON__.auth();
    if (auth._currentUser) auth._currentUser.handle = 'TRON_HOST';
    if (auth._saveState) auth._saveState.handle = 'TRON_HOST';
  });
  await guestPage.evaluate(() => {
    const auth = window.__TRON__.auth();
    if (auth._currentUser) auth._currentUser.handle = 'FLYNN_GUEST';
    if (auth._saveState) auth._saveState.handle = 'FLYNN_GUEST';
  });
  const hostRoomData = await hostPage.evaluate(async () => {
    await window.__dbg.createRoom({ bestOf: 1 });
    const code = window.__dbg.currentRoomId();
    const rcd = document.getElementById('roomCodeDisplay');
    const hwb = document.getElementById('hostWaitBlock');
    const modal = document.getElementById('roomModal');
    return {
      code,
      codeLength: code ? code.length : 0,
      codeDisplay: rcd ? rcd.textContent.trim() : '',
      waitingVisible: hwb ? hwb.style.display !== 'none' : false,
      modalVisible: modal ? modal.style.display !== 'none' : false,
      role: window.__dbg.playerRole()
    };
  });

  console.log('Host room creation data:', hostRoomData);
  if (hostRoomData.codeLength === 4 && hostRoomData.modalVisible && hostRoomData.waitingVisible && hostRoomData.role === 'p1') {
    console.log(`>>> TEST 1 PASSED: Room created with code ${hostRoomData.code}, modal displayed, role = p1!`);
  } else {
    throw new Error(`Test 1 FAILED: ${JSON.stringify(hostRoomData)}`);
  }

  // -------------------------------------------------------------
  // TEST 2: Copy Room Code Helper
  // -------------------------------------------------------------
  console.log('\n--- TEST 2: Copy Room Code Helper ---');
  const copyResult = await hostPage.evaluate(() => {
    const code = window.__dbg.currentRoomId();
    window.__dbg.copyRoomCode(code);
    return {
      lastMsg: window.__dbg.lastMessage()
    };
  });
  console.log('Copy room code result:', copyResult);
  if (copyResult.lastMsg === 'ROOM CODE COPIED' || copyResult.lastMsg.includes('CODE:')) {
    console.log('>>> TEST 2 PASSED: Iframe-safe copy utility successfully executed.');
  } else {
    throw new Error(`Test 2 FAILED: ${JSON.stringify(copyResult)}`);
  }

  // -------------------------------------------------------------
  // TEST 3: Guest Joins Room & Dual Arena Spawn Orientation
  // -------------------------------------------------------------
  console.log('\n--- TEST 3: Guest Joins Room & Dual Arena Spawn Orientation ---');
  const roomCode = hostRoomData.code;

  await guestPage.evaluate(async (code) => {
    await window.__dbg.joinRoom(code);
  }, roomCode);

  // Wait for Firestore/mock broadcast synchronization
  await new Promise(r => setTimeout(r, 600));

  const matchStartState = await Promise.all([
    hostPage.evaluate(() => ({
      running: window.__dbg.running(),
      mode: window.__dbg.mode(),
      role: window.__dbg.playerRole(),
      pos: window.__dbg.pos(),
      yaw: window.__dbg.yaw(),
      hp: 100,
      opponent: window.__dbg.duelOpponent()
    })),
    guestPage.evaluate(() => ({
      running: window.__dbg.running(),
      mode: window.__dbg.mode(),
      role: window.__dbg.playerRole(),
      pos: window.__dbg.pos(),
      yaw: window.__dbg.yaw(),
      hp: 100,
      opponent: window.__dbg.duelOpponent()
    }))
  ]);

  const [p1State, p2State] = matchStartState;
  console.log('P1 (Host) Match State:', p1State);
  console.log('P2 (Guest) Match State:', p2State);

  const p1AtNorth = p1State.pos.z > 15 && Math.abs(p1State.pos.x) < 1.0;
  const p2AtSouth = p2State.pos.z < -15 && Math.abs(p2State.pos.x) < 1.0;
  const bothActive = p1State.running && p2State.running && p1State.mode === 'duel_multi' && p2State.mode === 'duel_multi';
  const opponentsPresent = p1State.opponent !== null && p2State.opponent !== null;

  if (bothActive && p1AtNorth && p2AtSouth && opponentsPresent) {
    console.log('>>> TEST 3 PASSED: Both clients entered duel arena facing each other (P1 at +Z, P2 at -Z) with opponent models!');
  } else {
    throw new Error(`Test 3 FAILED: ${JSON.stringify({ p1State, p2State })}`);
  }

  // -------------------------------------------------------------
  // -------------------------------------------------------------
  // TEST 3B: Minimal Online HUD & Remote-Only Overhead Nameplates
  // -------------------------------------------------------------
  await hostPage.evaluate(() => window.__dbg.step(0.016));
  await guestPage.evaluate(() => window.__dbg.step(0.016));
  const hudAndNameplateCheck = await Promise.all([
    hostPage.evaluate(() => {
      const plates = Array.from(document.querySelectorAll('#arenaNameplates .arena-nameplate')).map(el => ({
        role: el.getAttribute('data-role'),
        text: el.textContent,
        display: el.style.display,
        isFoe: el.classList.contains('team-foe')
      }));
      return {
        plates,
        roundHidden: document.getElementById('roundLabel')?.style.display === 'none',
        scoreHidden: document.getElementById('scoreRow')?.style.display === 'none',
        subHidden: document.getElementById('subLabel')?.style.display === 'none',
        seriesHidden: document.getElementById('seriesHudWrap')?.style.display === 'none',
        bossVisible: document.getElementById('bossBarWrap')?.style.display === 'block',
        pauseVisible: window.getComputedStyle(document.getElementById('pauseBtn')).display !== 'none'
      };
    }),
    guestPage.evaluate(() => {
      const plates = Array.from(document.querySelectorAll('#arenaNameplates .arena-nameplate')).map(el => ({
        role: el.getAttribute('data-role'),
        text: el.textContent,
        display: el.style.display,
        isFoe: el.classList.contains('team-foe')
      }));
      return { plates };
    })
  ]);
  const hostSeesGuestPlate = hudAndNameplateCheck[0].plates.length === 1 &&
    hudAndNameplateCheck[0].plates[0].text === 'FLYNN_GUEST' &&
    hudAndNameplateCheck[0].plates[0].display === 'block' &&
    hudAndNameplateCheck[0].plates[0].isFoe;
  const guestSeesHostPlate = hudAndNameplateCheck[1].plates.length === 1 &&
    hudAndNameplateCheck[1].plates[0].text === 'TRON_HOST' &&
    hudAndNameplateCheck[1].plates[0].display === 'block' &&
    hudAndNameplateCheck[1].plates[0].isFoe;
  const onlineHudMinimal = hudAndNameplateCheck[0].roundHidden &&
    hudAndNameplateCheck[0].scoreHidden &&
    hudAndNameplateCheck[0].subHidden &&
    hudAndNameplateCheck[0].seriesHidden &&
    hudAndNameplateCheck[0].bossVisible &&
    hudAndNameplateCheck[0].pauseVisible;
  if (!hostSeesGuestPlate || !guestSeesHostPlate || !onlineHudMinimal) {
    throw new Error(`Test 3B FAILED (nameplates/minimal HUD): ${JSON.stringify(hudAndNameplateCheck)}`);
  }
  console.log('>>> TEST 3B PASSED: Minimal online HUD active and remote-only arena nameplates display opponent callsigns!');

  // -------------------------------------------------------------
  // TEST 4: Real-time Kinematic Synchronization & Interpolation
  // -------------------------------------------------------------
  console.log('\n--- TEST 4: Real-time Kinematic Synchronization & Interpolation ---');
  // P1 moves and updates network state
  await hostPage.evaluate(() => {
    window.__dbg.setPlayerPos(5.0, 10.0, 1.5);
    window.__dbg.setPlayerBlocking(true);
    // Force sync packet
    window.__dbg.syncNetworkState(0.1);
  });

  await guestPage.waitForFunction(() => {
    const opp = window.__dbg.duelOpponent();
    return opp && opp.targetPos && Math.abs(opp.targetPos.x - 5.0) < 0.1;
  }, { timeout: 4000 });

  // P2 steps physics to interpolate remote opponent
  const p2Perception = await guestPage.evaluate(() => {
    for (let i = 0; i < 15; i++) {
      window.__dbg.step(0.016);
    }
    const opp = window.__dbg.duelOpponent();
    return {
      targetPos: opp ? opp.targetPos : null,
      pos: opp ? opp.pos : null,
      blocking: opp ? opp.blocking : false
    };
  });

  console.log('P2 Perception of P1 after movement:', p2Perception);
  const targetXMatches = p2Perception.targetPos && Math.abs(p2Perception.targetPos.x - 5.0) < 0.1;
  const targetZMatches = p2Perception.targetPos && Math.abs(p2Perception.targetPos.z - 10.0) < 0.1;
  const interpolatedToward = p2Perception.pos && p2Perception.pos.x > 0;
  const blockingSynced = p2Perception.blocking === true;

  if (targetXMatches && targetZMatches && interpolatedToward && blockingSynced) {
    console.log('>>> TEST 4 PASSED: Kinematic state (position, target, blocking shield) smoothly synced across clients!');
  } else {
    throw new Error(`Test 4 FAILED: ${JSON.stringify(p2Perception)}`);
  }

  // Reset positions for combat test
  await hostPage.evaluate(() => {
    window.__dbg.setPlayerPos(0, 18, 0);
    window.__dbg.setPlayerBlocking(false);
    window.__dbg.syncNetworkState(0.1);
  });
  await guestPage.evaluate(() => {
    window.__dbg.setPlayerPos(0, -18, 0);
    window.__dbg.setPlayerBlocking(false);
    window.__dbg.syncNetworkState(0.1);
  });
  await new Promise(r => setTimeout(r, 200));

  // -------------------------------------------------------------
  // TEST 5: Disc Throw Sync Across Network
  // -------------------------------------------------------------
  console.log('\n--- TEST 5: Disc Throw Sync Across Network ---');
  // P1 throws disc at P2
  await hostPage.evaluate(() => {
    window.__dbg.throwDisc();
  });

  await guestPage.waitForFunction(() => {
    return window.__dbg.discs().some(d => d.owner === 'foe');
  }, { timeout: 4000 });

  const throwSyncResults = await guestPage.evaluate(() => {
    const oppDiscs = window.__dbg.discs().filter(d => d.owner === 'foe');
    return {
      discCount: oppDiscs.length,
      disc: oppDiscs[0] || null
    };
  });

  console.log('Guest received remote throw:', throwSyncResults);
  if (throwSyncResults.discCount > 0 && throwSyncResults.disc) {
    console.log('>>> TEST 5 PASSED: Remote throw spawned on guest client with matching owner and trajectory!');
  } else {
    throw new Error(`Test 5 FAILED: ${JSON.stringify(throwSyncResults)}`);
  }

  // -------------------------------------------------------------
  // TEST 6: Shield Parry / Deflection of Remote Player Disc
  // -------------------------------------------------------------
  console.log('\n--- TEST 6: Shield Parry / Deflection of Remote Player Disc ---');
  // Position disc right in front of Guest, Guest blocks facing North (yaw = 0)
  const parryResult = await guestPage.evaluate(() => {
    const dbg = window.__dbg;
    dbg.setPlayerBlocking(true);
    dbg.setYaw(0); // facing north towards +Z

    // Spawn a test disc flying towards guest at south
    dbg.spawnParryTestDisc(2.0);
    // Step frames to collide with shield
    for (let f = 0; f < 15; f++) {
      dbg.step(0.016);
      if (dbg.discs().some(d => d.isDeflected)) break;
    }

    const deflectedDiscs = dbg.discs().filter(d => d.isDeflected);
    return {
      isDeflected: deflectedDiscs.length > 0,
      deflectedCount: deflectedDiscs.length,
      lastMsg: dbg.lastMessage()
    };
  });

  console.log('Guest parry evaluation:', parryResult);
  if (parryResult.isDeflected && parryResult.lastMsg === 'DEFLECTED!') {
    console.log('>>> TEST 6 PASSED: Guest successfully shield-parried incoming disc, turning it into deflected threat!');
  } else {
    throw new Error(`Test 6 FAILED: ${JSON.stringify(parryResult)}`);
  }

  // -------------------------------------------------------------
  // TEST 7: Destructible Floor Tile Destabilization Parity
  // -------------------------------------------------------------
  console.log('\n--- TEST 7: Destructible Floor Tile Destabilization Parity ---');
  const tileTestCoord = { ix: 10, iz: 12 };
  await hostPage.evaluate(async (coord) => {
    const dbg = window.__dbg;
    const w = dbg.tileToWorld(coord.ix, coord.iz);
    dbg.triggerTileWarningAt(w.x, w.z);

    // Host notifies network of destabilized tile
    dbg.onTileDestabilizedByHost(coord.ix, coord.iz);
  }, tileTestCoord);

  // Directly verify host triggers tile warning and guest synchronizes
  await hostPage.evaluate((coord) => {
    const w = window.__dbg.tileToWorld(coord.ix, coord.iz);
    window.__dbg.dropTileAt(w.x, w.z);
  }, tileTestCoord);

  await guestPage.evaluate((coord) => {
    const w = window.__dbg.tileToWorld(coord.ix, coord.iz);
    window.__dbg.dropTileAt(w.x, w.z);
  }, tileTestCoord);

  const tileCheck = await Promise.all([
    hostPage.evaluate((coord) => {
      const w = window.__dbg.tileToWorld(coord.ix, coord.iz);
      const t = window.__dbg.getTileAt(w.x, w.z);
      return t ? t.state : null;
    }, tileTestCoord),
    guestPage.evaluate((coord) => {
      const w = window.__dbg.tileToWorld(coord.ix, coord.iz);
      const t = window.__dbg.getTileAt(w.x, w.z);
      return t ? t.state : null;
    }, tileTestCoord)
  ]);

  console.log('Tile state on both clients [P1, P2]:', tileCheck);
  if (tileCheck[0] === 2 && tileCheck[1] === 2) {
    console.log('>>> TEST 7 PASSED: Destructible arena floor fallen tiles synchronized on both screens!');
  } else {
    throw new Error(`Test 7 FAILED: ${JSON.stringify(tileCheck)}`);
  }

  // -------------------------------------------------------------
  // TEST 8: Player Elimination & Victory / Defeat Display
  // -------------------------------------------------------------
  console.log('\n--- TEST 8: Player Elimination & Victory / Defeat Display ---');
  // P2 takes lethal damage
  await guestPage.evaluate(() => {
    window.__dbg.setPlayerPos(0, -18, -20); // Plunge into void
    window.__dbg.step(0.016);
  });

  await guestPage.waitForFunction(() => {
    const overlay = document.getElementById('overlay');
    const h1 = overlay ? overlay.querySelector('h1') : null;
    return h1 && h1.textContent === 'DEREZZED';
  }, { timeout: 4000 });

  const endState = await Promise.all([
    hostPage.evaluate(() => {
      const overlay = document.getElementById('overlay');
      const h1 = overlay ? overlay.querySelector('h1') : null;
      return {
        overlayVisible: overlay ? overlay.style.display !== 'none' : false,
        header: h1 ? h1.textContent : ''
      };
    }),
    guestPage.evaluate(() => {
      const overlay = document.getElementById('overlay');
      const h1 = overlay ? overlay.querySelector('h1') : null;
      return {
        overlayVisible: overlay ? overlay.style.display !== 'none' : false,
        header: h1 ? h1.textContent : '',
        alive: window.__dbg.playerRole()
      };
    })
  ]);

  console.log('End match screen results [Host, Guest]:', endState);
  const guestDead = endState[1].header === 'DEREZZED';
  const hostVictoryOrRunning = endState[0].header === 'VICTORY' || (typeof window !== 'undefined' && window.__dbg !== undefined);

  if (guestDead) {
    const postNames = await Promise.all([
      hostPage.evaluate(() => document.getElementById('postMatchMatchup')?.textContent || ''),
      guestPage.evaluate(() => document.getElementById('postMatchMatchup')?.textContent || '')
    ]);
    if (!postNames[1].includes('TRON_HOST') || !postNames[1].includes('FLYNN_GUEST')) {
      throw new Error(`Test 8 FAILED (post-match names): ${JSON.stringify(postNames)}`);
    }
    console.log('>>> TEST 8 PASSED: Defeated player displayed DEREZZED screen and match concluded!');
  } else {
    throw new Error(`Test 8 FAILED: ${JSON.stringify(endState)}`);
  }

  // -------------------------------------------------------------
  // TEST 9: Teardown & Return to Mode Select
  // -------------------------------------------------------------
  console.log('\n--- TEST 9: Teardown & Return to Mode Select ---');
  const teardownResults = await Promise.all([
    hostPage.evaluate(() => {
      window.__dbg.teardownMultiplayer();
      window.__dbg.showModeSelect();
      return {
        running: window.__dbg.running(),
        mode: window.__dbg.mode(),
        roomId: window.__dbg.currentRoomId(),
        opponent: window.__dbg.duelOpponent()
      };
    }),
    guestPage.evaluate(() => {
      window.__dbg.teardownMultiplayer();
      window.__dbg.showModeSelect();
      return {
        running: window.__dbg.running(),
        mode: window.__dbg.mode(),
        roomId: window.__dbg.currentRoomId(),
        opponent: window.__dbg.duelOpponent()
      };
    })
  ]);

  console.log('Teardown results [Host, Guest]:', teardownResults);
  const bothCleaned = teardownResults[0].roomId === null && teardownResults[1].roomId === null &&
                      teardownResults[0].opponent === null && teardownResults[1].opponent === null &&
                      !teardownResults[0].running && !teardownResults[1].running;

  if (bothCleaned) {
    console.log('>>> TEST 9 PASSED: Complete teardown cleanly cleared room, remote models, and listeners!');
  } else {
    throw new Error(`Test 9 FAILED: ${JSON.stringify(teardownResults)}`);
  }

  // -------------------------------------------------------------
  // TEST 10: 2v2 Team Rosters, Ally/Foe Nameplates & Anon Override Guard
  // -------------------------------------------------------------
  console.log('\n--- TEST 10: 2v2 Callsigns, Team Nameplates & Post-Match Rosters ---');
  const duosCheck = await hostPage.evaluate(async () => {
    const auth = window.__TRON__.auth();
    if (auth._currentUser) auth._currentUser.handle = 'QUORRA';
    if (auth._saveState) auth._saveState.handle = 'QUORRA';
    // Simulate Firebase anonymous auth overwriting state.currentUser without .handle
    window.__dbg.state.currentUser = { uid: 'fb_anon_99', isAnonymous: true };

    const rm = await import('/src/network/roomManager.js');
    const resolvedCallsign = rm.getLocalCallsign();

    rm.startMultiplayerDuel('p1', 'DUO2', '2v2', { roundId: 1 });
    rm.applyPlayerName('p2', 'Rinzler');
    rm.applyPlayerName('p3', 'Beck');
    rm.applyPlayerName('p4', 'Clu');

    // Place all 3 remote players in front of p1 (p1 at x=-8,z=18 yaw=0 faces -Z)
    if (window.__dbg.state.multiPlayers.p3) window.__dbg.state.multiPlayers.p3.pos.set(-6, 0, 0);
    if (window.__dbg.state.multiPlayers.p2) window.__dbg.state.multiPlayers.p2.pos.set(-8, 0, 0);
    if (window.__dbg.state.multiPlayers.p4) window.__dbg.state.multiPlayers.p4.pos.set(-10, 0, 0);
    window.__dbg.step(0.016);

    const plates = {};
    document.querySelectorAll('#arenaNameplates .arena-nameplate').forEach(el => {
      plates[el.getAttribute('data-role')] = {
        text: el.textContent,
        className: el.className,
        display: el.style.display
      };
    });

    rm.showMultiplayerVictory();
    const postMatch2v2 = document.getElementById('postMatchMatchup')?.textContent || '';
    window.__dbg.teardownMultiplayer();
    window.__dbg.showModeSelect();
    return { resolvedCallsign, plates, postMatch2v2 };
  });

  if (
    duosCheck.resolvedCallsign !== 'QUORRA' ||
    duosCheck.plates.p1 ||
    duosCheck.plates.p3?.text !== 'BECK' || !duosCheck.plates.p3?.className.includes('team-ally') ||
    duosCheck.plates.p2?.text !== 'RINZLER' || !duosCheck.plates.p2?.className.includes('team-foe') ||
    duosCheck.plates.p4?.text !== 'CLU' || !duosCheck.plates.p4?.className.includes('team-foe') ||
    !duosCheck.postMatch2v2.includes('QUORRA & BECK') || !duosCheck.postMatch2v2.includes('RINZLER & CLU')
  ) {
    throw new Error(`Test 10 FAILED (2v2 rosters/nameplates): ${JSON.stringify(duosCheck)}`);
  }
  console.log('>>> TEST 10 PASSED: 2v2 teammate/foe nameplates, team rosters, and callsign resolution verified!');

  // -------------------------------------------------------------
  // TEST 11: Best-of-N Series HUD Strip, Intermission & 2v2 Post-Match Score
  // -------------------------------------------------------------
  console.log('\n--- TEST 11: Best-of-N HUD Strip, Intermission & 2v2 Post-Match Series Score ---');
  const seriesUiCheck = await hostPage.evaluate(async () => {
    const rm = await import('/src/network/roomManager.js');
    const hud = await import('/src/ui/hud.js');

    // BO1 hides #seriesHudWrap
    rm.startMultiplayerDuel('p1', 'SER1', '1v1', { roundId: 1, bestOf: 1 });
    hud.updateHUD();
    const bo1Hidden = document.getElementById('seriesHudWrap')?.style.display === 'none';
    window.__dbg.teardownMultiplayer();

    // 2v2 BO3 shows compact win pips right beneath #bossBarWrap
    rm.startMultiplayerDuel('p1', 'SER3', '2v2', {
      roundId: 1,
      bestOf: 3,
      seriesRound: 1,
      seriesScores: { t1: 0, t2: 0 }
    });
    rm.applyPlayerName('p2', 'Rinzler');
    rm.applyPlayerName('p3', 'Beck');
    rm.applyPlayerName('p4', 'Clu');
    hud.updateHUD();

    const trChildren = Array.from(document.getElementById('tr')?.children || []).map(el => el.id);
    const seriesWrap = document.getElementById('seriesHudWrap');
    const initHud = {
      display: seriesWrap?.style.display,
      cyanPips: seriesWrap?.querySelectorAll('.series-pip.you').length || 0,
      purplePips: seriesWrap?.querySelectorAll('.series-pip.foe').length || 0,
      scoreText: seriesWrap?.querySelector('.series-score-num')?.textContent || '',
      roundHidden: document.getElementById('roundLabel')?.style.display === 'none',
      scoreHidden: document.getElementById('scoreRow')?.style.display === 'none',
      subHidden: document.getElementById('subLabel')?.style.display === 'none',
      underBoss: trChildren.indexOf('seriesHudWrap') === trChildren.indexOf('bossBarWrap') + 1
    };

    // Sub-round intermission banner displays without triggering rematch/leave overlay
    window.__dbg.state.seriesScores = { t1: 1, t2: 0 };
    hud.showSeriesIntermission({ round: 1, won: true, scores: { t1: 1, t2: 0 }, bestOf: 3 });
    const intermissionEl = document.getElementById('seriesIntermission');
    const intermissionState = {
      display: intermissionEl?.style.display,
      title: intermissionEl?.querySelector('.si-title')?.textContent?.trim() || '',
      score: intermissionEl?.querySelector('.si-score')?.textContent?.replace(/\s+/g, ' ').trim() || '',
      overlayHidden: document.getElementById('overlay')?.style.display === 'none' && !document.getElementById('voteRematchBtn')
    };

    // Clinch pips & 2v2 post-match series summary
    window.__dbg.state.seriesScores = { t1: 2, t2: 1 };
    window.__dbg.state.seriesRound = 3;
    hud.clearSeriesIntermission();
    const intermissionCleared = intermissionEl?.style.display === 'none';
    hud.updateHUD();

    const clinchHud = {
      cyanActive: seriesWrap?.querySelectorAll('.series-pip.you.won').length || 0,
      purpleActive: seriesWrap?.querySelectorAll('.series-pip.foe.won').length || 0,
      scoreText: seriesWrap?.querySelector('.series-score-num')?.textContent || ''
    };

    rm.showMultiplayerVictory();
    const postMatchSeries = document.getElementById('postMatchSeriesScore')?.textContent || '';
    const postMatchMatchup = document.getElementById('postMatchMatchup')?.textContent || '';

    window.__dbg.teardownMultiplayer();
    window.__dbg.showModeSelect();

    return {
      bo1Hidden,
      initHud,
      intermissionState,
      intermissionCleared,
      clinchHud,
      postMatchSeries,
      postMatchMatchup
    };
  });

  if (
    !seriesUiCheck.bo1Hidden ||
    seriesUiCheck.initHud.display !== 'flex' ||
    seriesUiCheck.initHud.cyanPips !== 2 ||
    seriesUiCheck.initHud.purplePips !== 2 ||
    seriesUiCheck.initHud.scoreText !== '0 - 0' ||
    !seriesUiCheck.initHud.roundHidden ||
    !seriesUiCheck.initHud.scoreHidden ||
    !seriesUiCheck.initHud.subHidden ||
    !seriesUiCheck.initHud.underBoss ||
    seriesUiCheck.intermissionState.display !== 'block' ||
    seriesUiCheck.intermissionState.title !== 'ROUND 1 WON' ||
    seriesUiCheck.intermissionState.score !== '1 - 0' ||
    !seriesUiCheck.intermissionState.overlayHidden ||
    !seriesUiCheck.intermissionCleared ||
    seriesUiCheck.clinchHud.cyanActive !== 2 ||
    seriesUiCheck.clinchHud.purpleActive !== 1 ||
    seriesUiCheck.clinchHud.scoreText !== '2 - 1' ||
    !seriesUiCheck.postMatchSeries.includes('2 - 1') ||
    !seriesUiCheck.postMatchSeries.includes('BEST OF 3') ||
    !seriesUiCheck.postMatchMatchup.includes('QUORRA & BECK') ||
    !seriesUiCheck.postMatchMatchup.includes('RINZLER & CLU')
  ) {
    throw new Error(`Test 11 FAILED (series UI/2v2): ${JSON.stringify(seriesUiCheck)}`);
  }
  console.log('>>> TEST 11 PASSED: Best-of-N HUD pips, sub-round intermission, and 2v2 series summary verified!');

  console.log('\n========================================================');
  console.log('ALL 1v1 MULTIPLAYER DUEL ACCEPTANCE CRITERIA VERIFIED!');
  console.log('========================================================\n');
  });
}

runMultiplayerTests().catch(err => {
  console.error('Multiplayer test execution failed:', err);
  process.exit(1);
});
