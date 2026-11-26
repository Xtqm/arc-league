import { withBrowserTest } from '../helpers/browserHarness.js';

async function runDuos2v2VictoryTests() {
  await withBrowserTest(async ({ browser, page: p1Page, baseUrl }) => {
    console.log('Launching 4-player 2v2 test pages (p1, p2, p3, p4)...');
    const p2Page = await browser.newPage();
    const p3Page = await browser.newPage();
    const p4Page = await browser.newPage();
    const pages = [p1Page, p2Page, p3Page, p4Page];

    await Promise.all(pages.map(p => p.goto(`${baseUrl}/index.html`)));
    await new Promise(r => setTimeout(r, 800));

    await Promise.all(pages.map(p => p.waitForFunction(
      () => !!window.__dbg && !!window.__dbg.createRoom && !!window.__dbg.joinRoom && !!window.__TRON__?.auth()?.currentUser,
      { polling: 100 }
    )));

    const callsigns = ['ALPHA_1', 'BRAVO_2', 'ALPHA_3', 'BRAVO_4'];
    await Promise.all(pages.map((p, idx) => p.evaluate(async (name) => {
      const auth = window.__TRON__.auth();
      await auth.init();
      await auth.updateCallsign(name);
      window.__dbg.state.seriesIntermissionMs = 250;
    }, callsigns[idx])));

    // -------------------------------------------------------------
    // TEST 1: 4-player 2v2 room join without 1-to-1 WebRTC miswiring
    // -------------------------------------------------------------
    console.log('\n--- TEST 1: 4-Player 2v2 Room Join (No 1v1 WebRTC Miswiring) ---');
    const roomCode = await p1Page.evaluate(async () => {
      await window.__dbg.createRoom({ mode: '2v2', bestOf: 3 });
      return window.__dbg.currentRoomId();
    });
    if (!roomCode || roomCode.length !== 4) {
      throw new Error(`Expected 4-char 2v2 room code, got: ${roomCode}`);
    }
    await new Promise(r => setTimeout(r, 300));

    await p2Page.evaluate((code) => window.__dbg.joinRoom(code), roomCode);
    await new Promise(r => setTimeout(r, 150));
    await p3Page.evaluate((code) => window.__dbg.joinRoom(code), roomCode);
    await new Promise(r => setTimeout(r, 150));
    await p4Page.evaluate((code) => window.__dbg.joinRoom(code), roomCode);

    try {
      await Promise.all(pages.map(p => p.waitForFunction(
        () => window.__dbg.running() && window.__dbg.mode() === 'duos_multi' && window.__dbg.state.multiplayerRoundId >= 1,
        { timeout: 10000, polling: 100 }
      )));
    } catch (err) {
      const diag = await Promise.all(pages.map(p => p.evaluate(() => ({
        role: window.__dbg.playerRole(),
        mode: window.__dbg.mode(),
        running: window.__dbg.running(),
        roundId: window.__dbg.state.multiplayerRoundId,
        roomId: window.__dbg.currentRoomId(),
        lastMsg: window.__dbg.lastMessage(),
        subtitle: document.getElementById('roomSubtitle')?.textContent || ''
      }))));
      throw new Error(`Join timeout diag: ${JSON.stringify(diag)} :: ${err.message}`);
    }

    const joinStates = await Promise.all(pages.map(p => p.evaluate(() => ({
      role: window.__dbg.playerRole(),
      mode: window.__dbg.mode(),
      running: window.__dbg.running(),
      hasWebRTC: !!window.__dbg.state.webrtcPeer,
      hasBridge: !!window.__dbg.state.signalingBridge,
      peerDeparted: !!window.__dbg.state.peerDeparted,
      lastMsg: window.__dbg.lastMessage(),
      foesCount: window.__dbg.state.foes.length,
      teammatesCount: window.__dbg.state.teammates.length
    }))));

    for (let i = 0; i < 4; i++) {
      const js = joinStates[i];
      if (
        js.role !== `p${i + 1}` ||
        js.hasWebRTC ||
        js.hasBridge ||
        js.peerDeparted ||
        String(js.lastMsg || '').includes('OPPONENT LEFT') ||
        js.foesCount !== 2 ||
        js.teammatesCount !== 1
      ) {
        throw new Error(`Test 1 FAILED for p${i + 1}: ${JSON.stringify(js)}`);
      }
    }
    console.log('>>> TEST 1 PASSED: All 4 players joined 2v2 room via room-doc sync without 1v1 WebRTC or spurious PEER_LEFT!');

    // Clear countdowns on all 4 clients for deterministic combat steps
    await Promise.all(pages.map(p => p.evaluate(() => {
      window.__dbg.state.countdownTimer = 0;
    })));

    // -------------------------------------------------------------
    // TEST 2: Victim-authoritative 2v2 hit suppression
    // -------------------------------------------------------------
    console.log('\n--- TEST 2: Victim-Authoritative 2v2 Hit Suppression ---');
    const hitCheck = await p1Page.evaluate(async () => {
      const { spawnDisc } = await import('/src/entities/Disc.js');
      const THREE = await import('/vendor/three.module.js');
      const dbg = window.__dbg;
      const foe = dbg.state.foes[0];
      const beforeCount = dbg.state.foes.length;
      const beforeHp = foe.hp;
      spawnDisc(
        foe.pos.clone().setY(1.5).add(new THREE.Vector3(0, 0, 0.4)),
        new THREE.Vector3(0, 0, -40),
        'player',
        0x00ffff,
        0,
        1.0
      );
      dbg.step(0.016);
      return {
        beforeCount,
        afterCount: dbg.state.foes.length,
        beforeHp,
        afterHp: foe.hp,
        roundFinished: dbg.state.seriesRoundFinished,
        running: dbg.running()
      };
    });
    if (
      hitCheck.afterCount !== 2 ||
      hitCheck.afterHp !== hitCheck.beforeHp ||
      hitCheck.roundFinished ||
      !hitCheck.running
    ) {
      throw new Error(`Test 2 FAILED: ${JSON.stringify(hitCheck)}`);
    }
    console.log('>>> TEST 2 PASSED: Single thrower-side hit does not kill/remove foes or end round in duos_multi!');

    // -------------------------------------------------------------
    // TEST 3: First teammate elimination enters spectator view
    // -------------------------------------------------------------
    console.log('\n--- TEST 3: First Teammate Elimination -> Spectator View ---');
    await p3Page.evaluate(async () => {
      const { damagePlayer } = await import('/src/entities/Player.js');
      window.__dbg.state.player.invuln = 0;
      damagePlayer(100);
    });

    await p1Page.waitForFunction(
      () => window.__dbg.state.multiPlayers.p3 && window.__dbg.state.multiPlayers.p3.alive === false,
      { timeout: 8000, polling: 100 }
    );

    // Move p1 and verify p3's spectator camera tracks p1's position
    await p1Page.evaluate(() => {
      window.__dbg.state.player.pos.set(4.5, 0, 10.5);
      window.__dbg.state.player.yaw = 0.4;
      window.__dbg.step(0.05);
    });
    await new Promise(r => setTimeout(r, 200));

    const spectateCheck = await p3Page.evaluate(async () => {
      const { camera } = await import('/src/graphics/scene.js');
      window.__dbg.step(0.05);
      window.__dbg.step(0.05);
      const t1 = window.__dbg.state.teammates[0];
      return {
        alive: window.__dbg.state.player.alive,
        hp: window.__dbg.state.player.hp,
        isSpectating: window.__dbg.state.isSpectating,
        running: window.__dbg.running(),
        roundFinished: window.__dbg.state.seriesRoundFinished,
        teammatePos: t1 ? { x: t1.pos.x, z: t1.pos.z } : null,
        camPos: { x: camera.position.x, z: camera.position.z }
      };
    });

    if (
      spectateCheck.alive !== false ||
      spectateCheck.hp !== 0 ||
      !spectateCheck.isSpectating ||
      !spectateCheck.running ||
      spectateCheck.roundFinished ||
      !spectateCheck.teammatePos ||
      Math.hypot(spectateCheck.camPos.x - spectateCheck.teammatePos.x, spectateCheck.camPos.z - spectateCheck.teammatePos.z) > 15
    ) {
      throw new Error(`Test 3 FAILED: ${JSON.stringify(spectateCheck)}`);
    }
    console.log('>>> TEST 3 PASSED: Eliminated p3 entered live spectator mode following p1 while round stayed active!');

    // -------------------------------------------------------------
    // TEST 4: Sequential Team 2 wipe -> Round 1 -> Round 2 (clean reset)
    // -------------------------------------------------------------
    console.log('\n--- TEST 4: Sequential Team 2 Wipe -> Round 2 ---');
    await p2Page.evaluate(async () => {
      const { damagePlayer } = await import('/src/entities/Player.js');
      window.__dbg.state.player.invuln = 0;
      damagePlayer(100);
    });
    await new Promise(r => setTimeout(r, 120));
    await p4Page.evaluate(async () => {
      const { damagePlayer } = await import('/src/entities/Player.js');
      window.__dbg.state.player.invuln = 0;
      damagePlayer(100);
    });

    await Promise.all(pages.map(p => p.waitForFunction(
      () => window.__dbg.state.seriesRound === 2 && window.__dbg.running() && !window.__dbg.state.isSpectating && window.__dbg.state.player.alive,
      { timeout: 10000, polling: 100 }
    )));

    const r2State = await Promise.all(pages.map(p => p.evaluate(() => ({
      seriesRound: window.__dbg.state.seriesRound,
      scores: window.__dbg.state.seriesScores,
      alive: window.__dbg.state.player.alive,
      hp: window.__dbg.state.player.hp,
      isSpectating: window.__dbg.state.isSpectating
    }))));
    for (const s of r2State) {
      if (s.seriesRound !== 2 || s.scores.t1 !== 1 || s.scores.t2 !== 0 || !s.alive || s.hp !== 100 || s.isSpectating) {
        throw new Error(`Test 4 FAILED: ${JSON.stringify(r2State)}`);
      }
    }
    console.log('>>> TEST 4 PASSED: Team 1 won Round 1 (1 - 0) and all 4 clients reset cleanly into Round 2!');

    // -------------------------------------------------------------
    // TEST 5: Simultaneous 4-player wipe -> round_draw replay
    // -------------------------------------------------------------
    console.log('\n--- TEST 5: Simultaneous 4-Player Wipe -> Round Draw Replay ---');
    await Promise.all(pages.map(p => p.evaluate(async () => {
      const { damagePlayer } = await import('/src/entities/Player.js');
      window.__dbg.state.countdownTimer = 0;
      window.__dbg.state.player.invuln = 0;
      damagePlayer(100);
    })));

    // Wait for round_draw intermission to replay Round 2 with all 4 alive again
    await Promise.all(pages.map(p => p.waitForFunction(
      () => window.__dbg.state.seriesRound === 2 && window.__dbg.running() && window.__dbg.state.player.alive && window.__dbg.state.player.hp === 100,
      { timeout: 10000, polling: 100 }
    )));
    const drawScores = await p1Page.evaluate(() => window.__dbg.state.seriesScores);
    if (drawScores.t1 !== 1 || drawScores.t2 !== 0) {
      throw new Error(`Test 5 FAILED (scores changed on draw): ${JSON.stringify(drawScores)}`);
    }
    console.log('>>> TEST 5 PASSED: Simultaneous wipe settled as round_draw and replayed Round 2 cleanly!');

    // -------------------------------------------------------------
    // TEST 6: Simultaneous Team 1 wipe (p1 + p3) -> Team 2 wins Round 2 -> Round 3
    // -------------------------------------------------------------
    console.log('\n--- TEST 6: Simultaneous Team 1 Wipe -> Team 2 Wins Round 2 (1 - 1) ---');
    await Promise.all([
      p1Page.evaluate(async () => {
        const { damagePlayer } = await import('/src/entities/Player.js');
        window.__dbg.state.countdownTimer = 0;
        window.__dbg.state.player.invuln = 0;
        damagePlayer(100);
      }),
      p3Page.evaluate(async () => {
        const { damagePlayer } = await import('/src/entities/Player.js');
        window.__dbg.state.countdownTimer = 0;
        window.__dbg.state.player.invuln = 0;
        damagePlayer(100);
      })
    ]);

    await Promise.all(pages.map(p => p.waitForFunction(
      () => window.__dbg.state.seriesRound === 3 && window.__dbg.running() && window.__dbg.state.player.alive,
      { timeout: 10000, polling: 100 }
    )));
    const r3Scores = await p1Page.evaluate(() => window.__dbg.state.seriesScores);
    if (r3Scores.t1 !== 1 || r3Scores.t2 !== 1) {
      throw new Error(`Test 6 FAILED (expected 1-1 entering Round 3): ${JSON.stringify(r3Scores)}`);
    }
    console.log('>>> TEST 6 PASSED: Simultaneous Team 1 wipe settled cleanly (1 - 1) and advanced to Round 3!');

    // -------------------------------------------------------------
    // TEST 7: Round 3 Team 2 wipe -> Best-of-3 Clinch (2 - 1) & VICTORY/DEREZZED parity
    // -------------------------------------------------------------
    console.log('\n--- TEST 7: Round 3 Clinch (2 - 1) & VICTORY/DEREZZED Parity ---');
    await Promise.all([
      p2Page.evaluate(async () => {
        const { damagePlayer } = await import('/src/entities/Player.js');
        window.__dbg.state.countdownTimer = 0;
        window.__dbg.state.player.invuln = 0;
        damagePlayer(100);
      }),
      p4Page.evaluate(async () => {
        const { damagePlayer } = await import('/src/entities/Player.js');
        window.__dbg.state.countdownTimer = 0;
        window.__dbg.state.player.invuln = 0;
        damagePlayer(100);
      })
    ]);

    await Promise.all([
      p1Page.waitForFunction(() => document.getElementById('overlay')?.style.display === 'flex' && document.getElementById('overlay')?.querySelector('h1')?.textContent === 'VICTORY', { timeout: 10000, polling: 100 }),
      p3Page.waitForFunction(() => document.getElementById('overlay')?.style.display === 'flex' && document.getElementById('overlay')?.querySelector('h1')?.textContent === 'VICTORY', { timeout: 10000, polling: 100 }),
      p2Page.waitForFunction(() => document.getElementById('overlay')?.style.display === 'flex' && document.getElementById('overlay')?.querySelector('h1')?.textContent === 'DEREZZED', { timeout: 10000, polling: 100 }),
      p4Page.waitForFunction(() => document.getElementById('overlay')?.style.display === 'flex' && document.getElementById('overlay')?.querySelector('h1')?.textContent === 'DEREZZED', { timeout: 10000, polling: 100 })
    ]);

    const finalOverlays = await Promise.all(pages.map(p => p.evaluate(() => ({
      role: window.__dbg.playerRole(),
      header: document.getElementById('overlay')?.querySelector('h1')?.textContent,
      seriesText: document.getElementById('postMatchSeriesScore')?.textContent || '',
      isSpectating: window.__dbg.state.isSpectating,
      running: window.__dbg.running()
    }))));

    for (const o of finalOverlays) {
      const expectedHeader = (o.role === 'p1' || o.role === 'p3') ? 'VICTORY' : 'DEREZZED';
      const expectedScore = (o.role === 'p1' || o.role === 'p3') ? '2 - 1' : '1 - 2';
      if (o.header !== expectedHeader || !o.seriesText.includes(expectedScore) || o.isSpectating || o.running) {
        throw new Error(`Test 7 FAILED: ${JSON.stringify(finalOverlays)}`);
      }
    }
    console.log('>>> TEST 7 PASSED: All 4 clients displayed accurate VICTORY/DEREZZED and 2 - 1 / 1 - 2 series scores!');

    await Promise.all(pages.map(p => p.evaluate(() => {
      window.__dbg.teardownMultiplayer();
      window.__dbg.showModeSelect();
    })));
    await Promise.all([p2Page.close(), p3Page.close(), p4Page.close()]);

    console.log('\n========================================================');
    console.log('ALL 2v2 FRIENDLY ROOM VICTORY & SPECTATOR TESTS PASSED!');
    console.log('========================================================\n');
  });
}

runDuos2v2VictoryTests().catch(err => {
  console.error('2v2 victory test execution failed:', err);
  process.exit(1);
});
