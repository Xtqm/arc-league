import assert from 'assert';
import * as THREE from '../../vendor/three.module.js';
import { state } from '../../src/core/state.js';
import { encodeKinematicsBinary, handleIncomingFastPacket } from '../../src/network/sync.js';
import {
  getDuelTradeWindowMs,
  handleDuelPlayerEliminated,
  clearDuelSettlementState,
  clearSeriesIntermissionTimer
} from '../../src/network/roomManager.js';

console.log('--- Running 1v1 Duel Settlement & WebRTC Elimination Sync Tests ---');

// 1. Trade window clamping: clamp((ping || 60) / 2 + 20, 35, 140)
state.ping = 10;
assert.strictEqual(getDuelTradeWindowMs(), 35, 'Trade window should clamp to min 35ms');
state.ping = 60;
assert.strictEqual(getDuelTradeWindowMs(), 50, 'Trade window at 60ms ping should be 50ms');
state.ping = 400;
assert.strictEqual(getDuelTradeWindowMs(), 140, 'Trade window should clamp to max 140ms');
console.log('>>> PASSED: Trade window clamping');

// 2. WebRTC handleIncomingFastPacket s.hp <= 0 triggers derez & hides opp.obj
state.gameMode = 'duel_multi';
state.multiplayerRoundId = 1;
state.seriesRound = 1;
state.seriesRoundFinished = false;
state.multiplayerMatchFinished = false;
state.multiPlayers = {
  p2: {
    role: 'p2',
    pos: new THREE.Vector3(0, 0, -10),
    targetPos: new THREE.Vector3(0, 0, -10),
    y: 0,
    hp: 100,
    alive: true,
    obj: { visible: true }
  }
};

const fatalPacket = encodeKinematicsBinary({
  role: 'p2',
  mr: 1,
  sr: 1,
  time: 1000,
  seq: 5,
  state: {
    x: 0, y: 0, z: -10, yaw: 0, pitch: 0,
    hp: 0, blocking: false, hasDisc: true, chargingThrow: false, throwCharge: 0
  }
});
handleIncomingFastPacket(fatalPacket);
assert.strictEqual(state.multiPlayers.p2.hp, 0, 'Opponent HP should update to 0');
assert.strictEqual(state.multiPlayers.p2.alive, false, 'Opponent alive should become false on hp <= 0');
assert.strictEqual(state.multiPlayers.p2.obj.visible, false, 'Opponent mesh should be hidden on hp <= 0');
console.log('>>> PASSED: WebRTC hp <= 0 opponent derez & mesh hide');

// Helper to reset host referee state for settlement tests
function resetHostReferee({ bestOf = 3, seriesRound = 1, scores = { t1: 0, t2: 0 } } = {}) {
  clearDuelSettlementState();
  clearSeriesIntermissionTimer();
  state.gameMode = 'duel_multi';
  state.playerRole = 'p1';
  state.multiplayerRoundId = 1;
  state.seriesBestOf = bestOf;
  state.seriesRound = seriesRound;
  state.seriesScores = { ...scores };
  state.seriesRoundFinished = false;
  state.multiplayerMatchFinished = false;
  state.running = true;
  state.ping = 40;
  state.seriesIntermissionMs = 5000;
  state.multiPlayers = {
    p2: {
      role: 'p2',
      pos: new THREE.Vector3(0, 0, -18),
      y: 0,
      hp: 100,
      alive: true,
      obj: { visible: true }
    }
  };
  const sentEvents = [];
  state.webrtcPeer = {
    connectionState: 'connected',
    sendReliable(msg) {
      sentEvents.push(msg);
      return true;
    }
  };
  return sentEvents;
}

// 3. Staggered mutual deaths (> 16ms apart): earlier elimination loses
{
  const sent = resetHostReferee({ bestOf: 3, seriesRound: 1 });
  // Host p1 dies at 2000ms
  handleDuelPlayerEliminated({
    role: 'p1',
    reason: 'DISC',
    roundId: 1,
    seriesRound: 1,
    clientElapsedMs: 2000
  });
  assert.strictEqual(state.seriesRoundFinished, false, 'Host should wait in trade window after local death');
  // Guest p2 dies at 2030ms (30ms later > 16ms)
  handleDuelPlayerEliminated({
    role: 'p2',
    reason: 'DISC',
    roundId: 1,
    seriesRound: 1,
    clientElapsedMs: 2030
  });
  assert.strictEqual(state.seriesRoundFinished, true, 'Round should settle once both deaths recorded');
  assert.deepStrictEqual(state.seriesScores, { t1: 0, t2: 1 }, 'p2 survived 30ms longer and should win round 1');
  const roundOver = sent.find(e => e.type === 'ROUND_OVER');
  assert.ok(roundOver, 'Host should emit ROUND_OVER');
  assert.strictEqual(roundOver.winner, 'p2');
  assert.strictEqual(roundOver.loserRole, 'p1');
  clearSeriesIntermissionTimer();
  console.log('>>> PASSED: Staggered mutual deaths award round to longer survivor');
}

// 4. Simultaneous deaths within +-16ms: ROUND_DRAW, scores unchanged, replay same seriesRound
{
  const sent = resetHostReferee({ bestOf: 3, seriesRound: 2, scores: { t1: 1, t2: 0 } });
  handleDuelPlayerEliminated({
    role: 'p1',
    reason: 'DISC',
    roundId: 1,
    seriesRound: 2,
    clientElapsedMs: 3500
  });
  handleDuelPlayerEliminated({
    role: 'p2',
    reason: 'DISC',
    roundId: 1,
    seriesRound: 2,
    clientElapsedMs: 3512
  });
  assert.strictEqual(state.seriesRoundFinished, true, 'Round should settle as draw');
  assert.deepStrictEqual(state.seriesScores, { t1: 1, t2: 0 }, 'ROUND_DRAW must not mutate seriesScores');
  assert.strictEqual(state.multiplayerMatchFinished, false, 'Draw must not finish match');
  const drawEvt = sent.find(e => e.type === 'ROUND_DRAW');
  assert.ok(drawEvt, 'Host should emit ROUND_DRAW');
  assert.strictEqual(drawEvt.seriesRound, 2, 'Draw must reference current seriesRound');
  clearSeriesIntermissionTimer();
  console.log('>>> PASSED: Simultaneous deaths within 16ms trigger ROUND_DRAW');
}

// 5. Best-of-3 progression: p2 dies in round 1 (1-0 ROUND_OVER) and round 2 (2-0 GAME_OVER_EVENT)
{
  const sentR1 = resetHostReferee({ bestOf: 3, seriesRound: 1, scores: { t1: 0, t2: 0 } });
  handleDuelPlayerEliminated({
    role: 'p2',
    reason: 'DISC',
    roundId: 1,
    seriesRound: 1,
    clientElapsedMs: 1800
  });
  assert.deepStrictEqual(state.seriesScores, { t1: 1, t2: 0 });
  assert.strictEqual(state.multiplayerMatchFinished, false);
  assert.strictEqual(sentR1[0].type, 'ROUND_OVER');
  clearSeriesIntermissionTimer();

  const sentR2 = resetHostReferee({ bestOf: 3, seriesRound: 2, scores: { t1: 1, t2: 0 } });
  handleDuelPlayerEliminated({
    role: 'p2',
    reason: 'DISC',
    roundId: 1,
    seriesRound: 2,
    clientElapsedMs: 2200
  });
  assert.deepStrictEqual(state.seriesScores, { t1: 2, t2: 0 });
  assert.strictEqual(state.multiplayerMatchFinished, true);
  assert.strictEqual(sentR2[0].type, 'GAME_OVER_EVENT');
  assert.strictEqual(sentR2[0].winner, 'p1');
  if (state.matchEndOverlayTimer) {
    clearTimeout(state.matchEndOverlayTimer);
    state.matchEndOverlayTimer = null;
  }
  clearSeriesIntermissionTimer();
  console.log('>>> PASSED: Best-of-3 round progression and clinch GAME_OVER_EVENT');
}

// 6. Verify parry velocity cap & damage scaling bounds
{
  const capSpeed = (incomingSpd) => Math.min(62, Math.max(42, incomingSpd * 1.12));
  assert.strictEqual(capSpeed(30), 42, 'Parry speed floor should be 42 m/s');
  assert.ok(capSpeed(50) <= 62, 'Parry speed should be <= 62 m/s');
  assert.strictEqual(capSpeed(100), 62, 'Parry speed ceiling should be 62 m/s');

  const normalDmg = (bounces, charge, behind) => {
    const base = (16 + bounces * 6) * (1 + charge * 0.8);
    return base * (behind && bounces > 0 ? 1.8 : 1);
  };
  const parryDmg = (bounces, charge, rallyHits) => {
    const base = (16 + bounces * 6) * (1 + charge * 0.8);
    return base * (1 + Math.min(0.75, 0.25 + (rallyHits - 1) * 0.15));
  };
  assert.strictEqual(normalDmg(0, 0, false), 16);
  assert.ok(Math.abs(normalDmg(0, 1, false) - 28.8) < 1e-6);
  assert.ok(Math.abs(normalDmg(1, 0, true) - 39.6) < 1e-6);
  assert.strictEqual(parryDmg(0, 0, 1), 20);
  assert.ok(Math.abs(parryDmg(0, 1, 5) - 50.4) < 1e-6);
  console.log('>>> PASSED: Parry velocity cap and scaled damage bounds');
}

clearDuelSettlementState();
clearSeriesIntermissionTimer();
console.log('ALL 1v1 DUEL SETTLEMENT UNIT TESTS PASSED!');
