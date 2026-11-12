import * as THREE from '../../vendor/three.module.js';
import { state } from '../core/state.js';
import { config } from '../core/config.js';
import { scene, camera } from '../graphics/scene.js';
import { makeProgram } from '../graphics/materials.js';
import { disposeDiscEntity } from '../entities/Disc.js';
import { burst } from '../graphics/particles.js';
import { tiles, tileMatIntact, tileEdgeMatIntact, triggerTileWarning, applySectorArena, teardownSectorArena } from '../entities/Arena.js';
import { getGridIdForMap } from '../ui/arenaSelector.js';
import { spawnDisc } from '../entities/Disc.js';
import { initNetwork, getRoomRef, roomSetDoc, roomGetDoc, roomUpdateDoc, roomOnSnapshot } from './firebaseSetup.js';
import { tryLock, focusGame, setCursor, resetTouchInputs } from '../input/InputManager.js';
import { shake } from '../ui/UIManager.js';
import { updateHUD, message, el, resetHintVisibility, clearArenaNameplates, updateArenaNameplates } from '../ui/hud.js';
import { requestFullScreen } from '../ui/modals.js';
import { duelEconomyBridge } from '../modes/DuelEconomyBridge.js';
import { WebRTCPeer } from './webrtcPeer.js';
import { SignalingBridge } from './signalingBridge.js';
import { handleIncomingFastPacket } from './sync.js';
import { matchmakingQueue, registerMatchmakingSessionHandlers } from './matchmakingQueue.js';
import { authManager } from '../auth/AuthManager.js';

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function getLocalCallsign() {
  const handle =
    authManager?.currentUser?.handle ||
    authManager?.saveState?.handle ||
    state.currentUser?.handle ||
    'PROGRAM';
  const clean = String(handle).trim().toUpperCase();
  return clean || 'PROGRAM';
}

export function applyPlayerName(role, name) {
  if (!role || !name) return;
  const clean = String(name).trim().toUpperCase();
  if (!clean) return;
  if (!state.multiplayerNames) {
    state.multiplayerNames = { p1: null, p2: null, p3: null, p4: null };
  }
  state.multiplayerNames[role] = clean;
  if (state.multiPlayers && state.multiPlayers[role]) {
    state.multiPlayers[role].name = clean;
  }
  if (typeof document !== 'undefined') {
    const matchupEl = document.getElementById('postMatchMatchup');
    if (matchupEl) {
      matchupEl.innerHTML = renderPostMatchMatchupInner();
    }
    updateArenaNameplates();
  }
}

export function getDisplayNameForRole(role, fallback = null) {
  if (!role) return fallback || 'PROGRAM';
  if (role === state.playerRole) return getLocalCallsign();
  return (
    state.multiPlayers?.[role]?.name ||
    state.multiplayerNames?.[role] ||
    fallback ||
    role.toUpperCase()
  );
}

function renderPostMatchMatchupInner() {
  const myRole = state.playerRole || 'p1';
  if (state.gameMode === 'duos_multi') {
    const myTeam = (myRole === 'p1' || myRole === 'p3') ? 1 : 2;
    const team1Roles = ['p1', 'p3'];
    const team2Roles = ['p2', 'p4'];
    const allyRoles = myTeam === 1 ? team1Roles : team2Roles;
    const foeRoles = myTeam === 1 ? team2Roles : team1Roles;
    const allyText = allyRoles.map(r => escapeHtml(getDisplayNameForRole(r))).join(' &amp; ');
    const foeText = foeRoles.map(r => escapeHtml(getDisplayNameForRole(r))).join(' &amp; ');
    return `<b style="color:var(--cyan)">${allyText}</b> <span style="opacity:.6;margin:0 8px;">VS</span> <b style="color:#d896ff">${foeText}</b>`;
  }
  const oppRole = myRole === 'p1' ? 'p2' : 'p1';
  const myName = escapeHtml(getDisplayNameForRole(myRole));
  const oppName = escapeHtml(getDisplayNameForRole(oppRole));
  return `<b style="color:var(--cyan)">${myName}</b> <span style="opacity:.6;margin:0 8px;">VS</span> <b style="color:#d896ff">${oppName}</b>`;
}

export function generateRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export function copyRoomCode(code) {
  try {
    const textarea = document.createElement('textarea');
    textarea.value = code;
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
    message('ROOM CODE COPIED');
  } catch (err) {
    message('CODE: ' + code);
  }
}

export function showHostWaitingModal(code, mode) {
  const overlay = document.getElementById('overlay');
  if (overlay) overlay.style.display = 'none';
  const rm = document.getElementById('roomModal');
  if (rm) rm.style.display = 'flex';
  const rt = document.getElementById('roomTitle');
  if (rt) rt.textContent = mode === '2v2' ? 'DUOS ROOM' : 'DUEL ROOM';
  const rs = document.getElementById('roomSubtitle');
  if (rs) rs.textContent = 'SHARE THIS CODE WITH YOUR FRIENDS';
  const rcd = document.getElementById('roomCodeDisplay');
  if (rcd) {
    rcd.style.display = 'block';
    rcd.textContent = code;
  }
  const hwb = document.getElementById('hostWaitBlock');
  if (hwb) hwb.style.display = 'block';
  const ind = hwb.querySelector('.waiting-indicator');
  if (ind) {
    const required = mode === '2v2' ? 4 : 2;
    ind.textContent = `WAITING FOR PLAYERS (1/${required})...`;
  }
  const jib = document.getElementById('joinInputBlock');
  if (jib) jib.style.display = 'none';
}

export function showJoinInputModal() {
  const overlay = document.getElementById('overlay');
  if (overlay) overlay.style.display = 'none';
  const rm = document.getElementById('roomModal');
  if (rm) rm.style.display = 'flex';
  const rt = document.getElementById('roomTitle');
  if (rt) rt.textContent = 'JOIN DUEL';
  const rs = document.getElementById('roomSubtitle');
  if (rs) {
    rs.textContent = 'ENTER 4-DIGIT CODE';
    rs.style.color = '#a5f0fa';
  }
  const rcd = document.getElementById('roomCodeDisplay');
  if (rcd) rcd.style.display = 'none';
  const hwb = document.getElementById('hostWaitBlock');
  if (hwb) hwb.style.display = 'none';
  const jib = document.getElementById('joinInputBlock');
  if (jib) jib.style.display = 'block';
  const inp = document.getElementById('joinRoomInput');
  if (inp) {
    inp.value = '';
    setTimeout(() => inp.focus(), 50);
  }
}

export function handleRemoteThrow(t) {
  if (!t || t.id === state.lastProcessedThrowId || t.sender === state.playerRole) return;
  state.lastProcessedThrowId = t.id;
  const opp = state.multiPlayers[t.sender];
  if (opp) {
    const origin = new THREE.Vector3(t.x, t.y, t.z);
    const vel = new THREE.Vector3(t.vx, t.vy, t.vz);
    const oppDisc = spawnDisc(origin, vel, opp, opp.team === (state.multiPlayers[state.playerRole]?.team || 1) ? config.CYAN : config.PURPLE, t.curve || 0, t.charge || 0);
    oppDisc.remoteThrowId = t.id;
    opp.hasDisc = false;
    if (opp.obj && opp.obj.userData && opp.obj.userData.backDisc) {
      opp.obj.userData.backDisc.visible = false;
    }
    shake(0.08);
  }
}

export function handleRemoteTileDestabilized(tileData) {
  if (!tileData || state.playerRole === 'p1') return;
  const fallenList = tileData.fallen || [tileData.tile];
  for (const item of fallenList) {
    const [ix, iz] = Array.isArray(item) ? item : item.split('_').map(Number);
    const tileKey = `${ix}_${iz}`;
    const t = tiles.get(tileKey);
    if (t && t.state === config.TILE_INTACT) {
      triggerTileWarning(t, config.PURPLE);
    }
  }
}

export function isWebRTCConnected() {
  return !!(state.webrtcPeer && state.webrtcPeer.connectionState === 'connected');
}

export function dispatchReliableMatchEvent(msg) {
  if (state.gameMode === 'duel_multi' && state.webrtcPeer && typeof state.webrtcPeer.sendReliable === 'function') {
    return state.webrtcPeer.sendReliable(msg);
  }
  return false;
}

export function clearMultiplayerEntities() {
  for (const f of state.foes) {
    if (f && f.obj) scene.remove(f.obj);
  }
  for (const t of state.teammates) {
    if (t && t.obj) scene.remove(t.obj);
  }
  for (const key in state.multiPlayers) {
    if (state.multiPlayers[key] && state.multiPlayers[key].obj) {
      scene.remove(state.multiPlayers[key].obj);
    }
  }
  for (const d of state.discs) disposeDiscEntity(d);
  state.foes = [];
  state.teammates = [];
  state.multiPlayers = {};
  state.discs = [];
  state.duelOpponent = null;
  clearArenaNameplates();
}

export function getSpawnCoords(mode = '1v1') {
  const spawns = {
    p1: { x: -8, z: 18, yaw: 0, team: 1 },
    p2: { x: -8, z: -18, yaw: Math.PI, team: 2 },
    p3: { x: 8, z: 18, yaw: 0, team: 1 },
    p4: { x: 8, z: -18, yaw: Math.PI, team: 2 }
  };
  if (mode === '1v1') {
    spawns.p1.x = 0;
    spawns.p2.x = 0;
  }
  return spawns;
}

export function getActivePlayerRoles(data = null) {
  if (data && data.players) {
    const roles = Object.keys(data.players).filter(k => !!data.players[k]);
    if (roles.length > 0) return roles;
  }
  const mpKeys = Object.keys(state.multiPlayers || {});
  if (mpKeys.length > 0 && state.playerRole) {
    return Array.from(new Set([state.playerRole, ...mpKeys])).sort();
  }
  return state.gameMode === 'duos_multi' ? ['p1', 'p2', 'p3', 'p4'] : ['p1', 'p2'];
}

export function getRematchTally(data = null) {
  const rv = Object.assign(
    { p1: false, p2: false, p3: false, p4: false },
    state.rematchVotes || {},
    (data && data.rematchVotes) ? data.rematchVotes : {}
  );
  const roles = getActivePlayerRoles(data);
  let vCount = 0;
  for (const r of roles) {
    if (rv[r]) vCount++;
  }
  return {
    rv,
    vCount,
    pCount: roles.length,
    hasVoted: !!(state.playerRole && rv[state.playerRole])
  };
}

export function getRematchUIState(data = null) {
  if (state.peerDeparted || (data && data.status === 'closed')) {
    return {
      buttonText: 'OPPONENT LEFT',
      disabled: true,
      ariaPressed: 'false',
      labelText: 'OPPONENT RETURNED TO MENU'
    };
  }
  if (state.rematchTimedOut) {
    return {
      buttonText: 'REMATCH TIMED OUT',
      disabled: true,
      ariaPressed: 'false',
      labelText: 'HOST / OPPONENT UNRESPONSIVE — RETURN TO MENU'
    };
  }
  const { vCount, pCount, hasVoted } = getRematchTally(data);
  if (state._launchingRematchRoundId) {
    return {
      buttonText: 'STARTING REMATCH...',
      disabled: true,
      ariaPressed: 'true',
      labelText: `REMATCH VOTES: ${pCount} / ${pCount}`
    };
  }
  return {
    buttonText: hasVoted ? 'CANCEL VOTE (VOTED)' : 'VOTE REMATCH',
    disabled: false,
    ariaPressed: hasVoted ? 'true' : 'false',
    labelText: `REMATCH VOTES: ${vCount} / ${pCount}`
  };
}

export function updateRematchUI(data = null) {
  syncRematchTimeout(data);
  if (typeof document === 'undefined') return;
  const voteBtn = document.getElementById('voteRematchBtn');
  const voteLabel = document.getElementById('rematchVoteLabel');
  const ui = getRematchUIState(data);
  if (voteBtn) {
    voteBtn.textContent = ui.buttonText;
    voteBtn.disabled = ui.disabled;
    voteBtn.setAttribute('aria-pressed', ui.ariaPressed);
  }
  if (voteLabel) {
    voteLabel.textContent = ui.labelText;
  }
}

export function evaluateHostRematchConsensus(data = null) {
  if (state.playerRole !== 'p1' || state.peerDeparted || state.rematchTimedOut) return;
  const { vCount, pCount } = getRematchTally(data);
  if (vCount < pCount || pCount <= 0) return;

  const dataRoundId = (data && typeof data.roundId === 'number') ? data.roundId : 0;
  const nextRoundId = Math.max((state.multiplayerRoundId || 1) + 1, dataRoundId + 1);
  if (state._launchingRematchRoundId === nextRoundId) return;
  state._launchingRematchRoundId = nextRoundId;
  clearRematchVoteTimeout();
  updateRematchUI(data);

  const mode = (data && data.mode) ? data.mode : (state.gameMode === 'duos_multi' ? '2v2' : '1v1');
  const mapId = (data && data.mapId !== undefined) ? data.mapId : (state.multiplayerMapId || null);
  if (dispatchReliableMatchEvent({
    type: 'REMATCH_START',
    roundId: nextRoundId,
    mode,
    mapId,
    playerNames: { ...(state.multiplayerNames || {}) }
  })) {
    startMultiplayerDuel(state.playerRole, state.currentRoomId, mode, { roundId: nextRoundId, mapId });
    message('REMATCH — FIGHT!');
    return;
  }

  if (state.db && state.currentRoomId && state.roomUnsubscribe) {
    const roomRef = getRoomRef(state.currentRoomId);
    const spawns = getSpawnCoords(mode);
    const resetPatch = {
      status: 'active',
      roundId: nextRoundId,
      winner: null,
      winnerTeam: null,
      lastThrow: null,
      fallen: [],
      rematchVotes: { p1: false, p2: false, p3: false, p4: false }
    };
    if (mapId) {
      resetPatch.mapId = mapId;
      resetPatch.gridId = getGridIdForMap(mapId);
    }
    const roles = getActivePlayerRoles(data);
    for (const k of roles) {
      const sp = spawns[k] || spawns.p1;
      resetPatch[`state.${k}`] = {
        x: sp.x, y: 0, z: sp.z, yaw: sp.yaw, pitch: -0.1,
        hp: 100, blocking: false, hasDisc: true
      };
      resetPatch[k] = null;
    }
    roomUpdateDoc(roomRef, resetPatch).catch(err => console.warn("Reset rematch err:", err));
  }
}

export function handleRemoteGameOver(msg) {
  if (!msg) return;
  const ev = msg.payload ? { ...msg.payload, roundId: msg.roundId ?? msg.payload.roundId } : msg;
  if (typeof ev.roundId === 'number' && state.multiplayerRoundId && ev.roundId !== state.multiplayerRoundId) {
    return;
  }
  if (state.multiplayerMatchFinished) return;

  let isWin = false;
  if (state.gameMode === 'duos_multi') {
    const myTeam = (state.playerRole === 'p1' || state.playerRole === 'p3') ? 1 : 2;
    isWin = ev.winnerTeam === myTeam;
  } else if (ev.winner) {
    isWin = ev.winner === state.playerRole;
  } else if (ev.loserRole) {
    isWin = ev.loserRole !== state.playerRole;
  }

  state.multiplayerMatchFinished = true;
  state.running = false;
  clearMatchEndOverlayTimer();

  if (isWin) {
    const loser = ev.loserRole ? state.multiPlayers[ev.loserRole] : state.foes[0];
    if (loser && loser.alive) {
      loser.alive = false;
      loser.hp = 0;
      if (loser.pos) {
        burst(loser.pos.clone().setY((loser.y || 0) + 1.4), config.PURPLE, 80, 15);
      }
      if (loser.obj) loser.obj.visible = false;
    }
    showMultiplayerVictory(ev);
  } else {
    state.player.alive = false;
    state.player.hp = 0;
    if (state.player.obj) state.player.obj.visible = false;
    if (ev.reason) state.gameOverReason = ev.reason;
    showMultiplayerDefeat(ev);
  }
}

export function handleRemoteRematchVote(msg) {
  if (!msg || state.peerDeparted || state.rematchTimedOut || state._launchingRematchRoundId) return;
  if (typeof msg.roundId === 'number' && state.multiplayerRoundId && msg.roundId !== state.multiplayerRoundId) {
    return;
  }
  if (!state.rematchVotes) {
    state.rematchVotes = { p1: false, p2: false, p3: false, p4: false };
  }
  if (msg.role) {
    state.rematchVotes[msg.role] = !!msg.voted;
  }
  updateRematchUI();
  if (state.playerRole === 'p1') {
    evaluateHostRematchConsensus();
  }
}

export function handleRemoteRematchStart(msg) {
  if (!msg || state.peerDeparted) return;
  const nextRoundId = typeof msg.roundId === 'number' ? msg.roundId : (state.multiplayerRoundId || 1) + 1;
  if (nextRoundId <= (state.multiplayerRoundId || 0)) return;

  if (msg.playerNames && typeof msg.playerNames === 'object') {
    for (const [r, n] of Object.entries(msg.playerNames)) {
      applyPlayerName(r, n);
    }
  }

  const rm = typeof document !== 'undefined' ? document.getElementById('roomModal') : null;
  if (rm) rm.style.display = 'none';
  const jm = typeof document !== 'undefined' ? document.getElementById('joinModal') : null;
  if (jm) jm.style.display = 'none';

  const mode = msg.mode || (state.gameMode === 'duos_multi' ? '2v2' : '1v1');
  const mapId = msg.mapId !== undefined ? msg.mapId : (state.multiplayerMapId || null);
  startMultiplayerDuel(state.playerRole, state.currentRoomId, mode, { roundId: nextRoundId, mapId });
  message('REMATCH — FIGHT!');
}

export function handleRemotePeerLeft() {
  if (state.isTearingDownMultiplayer) return;
  if (state.gameMode !== 'duel_multi' && state.gameMode !== 'duos_multi') return;
  if (state.peerDeparted) {
    updateRematchUI({ status: 'closed' });
    return;
  }
  state.peerDeparted = true;
  clearMatchEndOverlayTimer();
  clearRematchVoteTimeout();

  const overlay = typeof document !== 'undefined' ? document.getElementById('overlay') : null;
  const hasVoteBtn = typeof document !== 'undefined' && !!document.getElementById('voteRematchBtn');
  const isOverlayVisible = !!(overlay && overlay.style.display === 'flex');

  if (state.running) {
    state.running = false;
    state.multiplayerMatchFinished = true;
    showMultiplayerVictory({ status: 'closed' });
  } else if (!isOverlayVisible || !hasVoteBtn) {
    if (state.player && state.player.alive === false) {
      showMultiplayerDefeat({ status: 'closed' });
    } else {
      showMultiplayerVictory({ status: 'closed' });
    }
  }
  if (overlay) overlay.style.display = 'flex';
  updateRematchUI({ status: 'closed' });
  message('OPPONENT LEFT THE MATCH');
}

export function handleReliableMatchMessage(msg) {
  if (!msg || !msg.type) return;
  switch (msg.type) {
    case 'DISC_THROW':
    case 'DISC_PARRY':
      handleRemoteThrow(msg.lastThrow);
      break;
    case 'TILE_DESTABILIZED':
      handleRemoteTileDestabilized(msg);
      break;
    case 'GAME_OVER_EVENT':
      handleRemoteGameOver(msg);
      break;
    case 'REMATCH_VOTE':
      handleRemoteRematchVote(msg);
      break;
    case 'REMATCH_START':
      handleRemoteRematchStart(msg);
      break;
    case 'PEER_LEFT':
      handleRemotePeerLeft(msg);
      break;
    case 'PLAYER_INFO':
      if (msg.role && msg.name) {
        applyPlayerName(msg.role, msg.name);
      }
      break;
    default:
      break;
  }
}

export function handlePeerConnectionStateChange(connState, { hasRoomFallback = false, hadConnected = true } = {}) {
  if (state.isTearingDownMultiplayer) return;
  if (connState === 'connected') {
    message('P2P WEBRTC CONNECTED');
    return;
  }
  if (connState === 'disconnected' || connState === 'closed' || connState === 'failed') {
    if (!hasRoomFallback || hadConnected) {
      handleRemotePeerLeft({ reason: 'CONNECTION_LOST' });
    }
  }
}

export function reportMultiplayerMatchEnd({
  winner = null,
  winnerTeam = null,
  loserRole = null,
  reason = '',
  playerState = null,
  isLocalWin = false
} = {}) {
  const allFinished = isLocalWin || state.gameMode !== 'duos_multi' || state.teammates.every(t => t.hp <= 0);
  if (allFinished) {
    state.multiplayerMatchFinished = true;
  }

  const eventPayload = {
    type: 'GAME_OVER_EVENT',
    roundId: state.multiplayerRoundId || 1,
    winner,
    winnerTeam,
    loserRole,
    reason
  };

  let sentOverWebRTC = false;
  if (allFinished) {
    sentOverWebRTC = dispatchReliableMatchEvent(eventPayload);
  }

  if (!sentOverWebRTC && state.db && state.currentRoomId && state.currentUser && state.roomUnsubscribe) {
    const roomRef = getRoomRef(state.currentRoomId);
    const patch = {};
    if (playerState && state.playerRole) {
      patch[`state.${state.playerRole}`] = playerState;
    }
    if (allFinished) {
      patch.status = 'finished';
      patch.roundId = state.multiplayerRoundId || 1;
      patch.winnerTeam = winnerTeam;
      if (state.gameMode === 'duel_multi') {
        patch.winner = winner;
      }
    }
    if (Object.keys(patch).length > 0) {
      roomUpdateDoc(roomRef, patch).catch(err => console.warn("Game over sync err:", err));
    }
  }

  if (allFinished) {
    clearMatchEndOverlayTimer();
    state.matchEndOverlayTimer = setTimeout(() => {
      state.matchEndOverlayTimer = null;
      if (isLocalWin) showMultiplayerVictory();
      else showMultiplayerDefeat();
    }, 900);
  }
}

registerMatchmakingSessionHandlers({
  onThrow: handleRemoteThrow,
  onTile: handleRemoteTileDestabilized,
  onMatchMessage: handleReliableMatchMessage,
  onConnectionChange: (connState) => {
    handlePeerConnectionStateChange(connState, { hasRoomFallback: false, hadConnected: true });
  }
});

export function transitionFromWarmupToPeerMatch(role, opponentId) {
  if (typeof document !== 'undefined') {
    const banner = document.getElementById('matchmakingQueueHUD');
    if (banner) banner.style.display = 'none';
  }
  state.multiplayerMapId = null;
  applyPlayerName(role, getLocalCallsign());
  const roomCode = 'MATCH_' + Math.random().toString(36).substring(2, 6).toUpperCase();
  startMultiplayerDuel(role, roomCode, '1v1', { roundId: 1, mapId: null });
  message('CHALLENGER CONNECTED — FIGHT!');
}

export function startMatchmakingWithWarmup() {
  if (state.isTouchDevice) {
    requestFullScreen();
  }
  state.multiplayerNames = { p1: null, p2: null, p3: null, p4: null };
  state.multiplayerMapId = null;
  teardownSectorArena();
  if (typeof window !== 'undefined' && window.__tronStartMode) {
    window.__tronStartMode('duel_ai');
  }

  let banner = typeof document !== 'undefined' ? document.getElementById('matchmakingQueueHUD') : null;
  if (!banner && typeof document !== 'undefined') {
    banner = document.createElement('div');
    banner.id = 'matchmakingQueueHUD';
    banner.style.position = 'fixed';
    banner.style.top = '20px';
    banner.style.left = '50%';
    banner.style.transform = 'translateX(-50%)';
    banner.style.zIndex = '9999';
    banner.style.background = 'rgba(10, 15, 25, 0.85)';
    banner.style.border = '1px solid #00ffff';
    banner.style.boxShadow = '0 0 15px rgba(0, 255, 255, 0.4)';
    banner.style.padding = '8px 18px';
    banner.style.borderRadius = '4px';
    banner.style.pointerEvents = 'auto';
    document.body.appendChild(banner);
  }
  if (banner) banner.style.display = 'block';

  matchmakingQueue.startQueue({
    onMatchSuccess: ({ role, opponentId }) => {
      transitionFromWarmupToPeerMatch(role, opponentId);
    }
  });

  message('SEARCHING FOR OPPONENT // WARM-UP SPARRING ACTIVE');
}

export function initWebRTCPeerSession(isHost, roomCode) {
  if (state.webrtcPeer) {
    try { state.webrtcPeer.close(); } catch (_) {}
    state.webrtcPeer = null;
  }
  if (state.signalingBridge) {
    try { state.signalingBridge.disconnect(); } catch (_) {}
    state.signalingBridge = null;
  }

  const role = isHost ? 'p1' : (state.playerRole || 'p2');
  let hadConnected = false;
  const peer = new WebRTCPeer({
    isHost,
    onFastMessage: (data) => {
      handleIncomingFastPacket(data);
    },
    onReliableMessage: (msg) => {
      handleReliableMatchMessage(msg);
    },
    onConnectionChange: (connState) => {
      console.log(`WebRTC Peer connection state: ${connState}`);
      if (connState === 'connected') {
        hadConnected = true;
        try {
          peer.sendReliable({
            type: 'PLAYER_INFO',
            role: state.playerRole || role,
            name: getLocalCallsign()
          });
        } catch (_) {}
      }
      handlePeerConnectionStateChange(connState, {
        hasRoomFallback: !!state.roomUnsubscribe,
        hadConnected
      });
    }
  });

  const bridge = new SignalingBridge({
    peerId: role,
    roomCode
  });

  peer.onLocalCandidate = (candidate) => {
    bridge.sendCandidate(candidate);
  };

  bridge.onOffer = async (offer, senderId) => {
    if (!isHost) {
      const answer = await peer.createAnswer(offer);
      bridge.sendAnswer(answer, senderId);
    }
  };

  bridge.onAnswer = async (answer) => {
    if (isHost) {
      await peer.setAnswer(answer);
    }
  };

  bridge.onCandidate = async (candidate) => {
    await peer.addIceCandidate(candidate);
  };

  bridge.onPeerJoined = async (peerId) => {
    if (isHost && peer.connectionState !== 'connected') {
      try {
        const offer = await peer.createOffer();
        bridge.sendOffer(offer, peerId);
      } catch (err) {
        console.warn('Error creating WebRTC offer:', err);
      }
    }
  };

  bridge.onPeerLeft = () => {
    if (hadConnected || !state.roomUnsubscribe) {
      handleRemotePeerLeft({ reason: 'SIGNALING_LEFT' });
    }
  };

  bridge.connect(roomCode);

  state.webrtcPeer = peer;
  state.signalingBridge = bridge;
  return { peer, bridge };
}

export function clearMatchEndOverlayTimer() {
  if (state.matchEndOverlayTimer) {
    clearTimeout(state.matchEndOverlayTimer);
    state.matchEndOverlayTimer = null;
  }
}

export function clearRematchVoteTimeout() {
  if (state.rematchVoteTimeoutId) {
    clearTimeout(state.rematchVoteTimeoutId);
    state.rematchVoteTimeoutId = null;
  }
  state._rematchTimeoutMode = null;
}

export function syncRematchTimeout(data = null) {
  if (
    !state.multiplayerMatchFinished ||
    state.isTearingDownMultiplayer ||
    state.peerDeparted ||
    state.rematchTimedOut ||
    state._launchingRematchRoundId ||
    (state.gameMode !== 'duel_multi' && state.gameMode !== 'duos_multi')
  ) {
    clearRematchVoteTimeout();
    return;
  }

  const { vCount, pCount, hasVoted } = getRematchTally(data);
  const isGuestFirestoreStall = (
    state.playerRole !== 'p1' &&
    !!state.roomUnsubscribe &&
    pCount > 0 &&
    vCount >= pCount
  );
  if (!hasVoted && !isGuestFirestoreStall) {
    clearRematchVoteTimeout();
    return;
  }

  const desiredMode = isGuestFirestoreStall ? 'grace' : 'vote';
  if (state.rematchVoteTimeoutId && state._rematchTimeoutMode === desiredMode) {
    return;
  }

  clearRematchVoteTimeout();
  state._rematchTimeoutMode = desiredMode;
  const timeoutMs = desiredMode === 'grace'
    ? (Number(state.rematchGraceMs) > 0 ? Number(state.rematchGraceMs) : 8000)
    : (Number(state.rematchTimeoutMs) > 0 ? Number(state.rematchTimeoutMs) : 45000);

  state.rematchVoteTimeoutId = setTimeout(() => {
    state.rematchVoteTimeoutId = null;
    state._rematchTimeoutMode = null;
    if (
      !state.multiplayerMatchFinished ||
      state.isTearingDownMultiplayer ||
      state.peerDeparted ||
      state._launchingRematchRoundId
    ) {
      return;
    }
    state.rematchTimedOut = true;
    updateRematchUI(data);
    message('REMATCH TIMED OUT — RETURN TO MENU');
  }, timeoutMs);
}

export function resetMultiplayerSessionTracking(roundId = 0) {
  clearMatchEndOverlayTimer();
  clearRematchVoteTimeout();
  state.multiplayerRoundId = roundId;
  state.multiplayerMatchFinished = false;
  state.multiplayerPayoutProcessed = false;
  state.rematchVotes = { p1: false, p2: false, p3: false, p4: false };
  state.peerDeparted = false;
  state.rematchTimedOut = false;
  state.isTearingDownMultiplayer = false;
  state._launchingRematchRoundId = null;
}

export async function onClickCreateRoom(e, mode = '1v1', mapId = null) {
  if (state.isTouchDevice) {
    requestFullScreen();
  }
  if (e) {
    e.stopPropagation();
    if (e.cancelable) e.preventDefault();
  }
  try {
    await initNetwork();
    if (!state.currentUser) {
      message('MULTIPLAYER OFFLINE');
      return;
    }
    const code = generateRoomCode();
    const resolvedMapId = mapId !== null && mapId !== undefined
      ? mapId
      : (state.selectedArenaMap || null);
    const resolvedGridId = resolvedMapId ? getGridIdForMap(resolvedMapId) : null;
    resetMultiplayerSessionTracking(0);
    const myName = getLocalCallsign();
    state.multiplayerNames = { p1: myName, p2: null, p3: null, p4: null };
    state.currentRoomId = code;
    state.playerRole = 'p1';
    state.roomFallenTiles = [];
    state.multiplayerMapId = resolvedMapId;
    initWebRTCPeerSession(true, code);

    const roomRef = getRoomRef(code);
    await roomSetDoc(roomRef, {
      code,
      mode,
      mapId: resolvedMapId,
      gridId: resolvedGridId,
      createdAt: Date.now(),
      status: 'waiting',
      roundId: 1,
      players: {
        p1: state.currentUser.uid,
        p2: null,
        p3: null,
        p4: null
      },
      playerNames: {
        p1: myName,
        p2: null,
        p3: null,
        p4: null
      },
      state: {
        p1: { x: -8, y: 0, z: 18, yaw: 0, pitch: -0.1, hp: 100, blocking: false, hasDisc: true },
        p2: { x: -8, y: 0, z: -18, yaw: 3.14, pitch: -0.1, hp: 100, blocking: false, hasDisc: true },
        p3: { x: 8, y: 0, z: 18, yaw: 0, pitch: -0.1, hp: 100, blocking: false, hasDisc: true },
        p4: { x: 8, y: 0, z: -18, yaw: 3.14, pitch: -0.1, hp: 100, blocking: false, hasDisc: true }
      },
      lastThrow: null,
      fallen: [],
      rematchVotes: { p1: false, p2: false, p3: false, p4: false }
    });

    showHostWaitingModal(code, mode);

    if (state.roomUnsubscribe) { state.roomUnsubscribe(); state.roomUnsubscribe = null; }
    state.roomUnsubscribe = roomOnSnapshot(roomRef, (snap) => {
      onRoomSnapshot(snap);
    }, (err) => {
      console.warn("Room snapshot error:", err);
      message("CONNECTION ERROR");
    });
  } catch (err) {
    console.error("Create room error:", err);
    message('FAILED TO CREATE ROOM');
  }
}

export async function onClickConfirmJoin(e) {
  if (state.isTouchDevice) {
    requestFullScreen();
  }
  if (e) {
    e.stopPropagation();
    if (e.cancelable) e.preventDefault();
  }
  const inp = document.getElementById('joinRoomInput');
  const code = (inp ? inp.value.trim().toUpperCase() : '');
  if (code.length !== 4) {
    message('ENTER 4-CHAR CODE');
    return;
  }

  const btn = document.getElementById('btnConfirmJoin');
  const originalText = btn ? btn.textContent : '';
  if (btn) {
    btn.textContent = 'CONNECTING...';
    btn.disabled = true;
  }
  if (inp) inp.disabled = true;

  try {
    await initNetwork();
    if (!state.currentUser) {
      throw new Error('OFFLINE - MULTIPLAYER REQUIRES DATA CONNECTION');
    }
    const roomRef = getRoomRef(code);
    const snap = await roomGetDoc(roomRef);
    if (!snap.exists()) {
      throw new Error('ROOM CODE NOT FOUND');
    }
    const data = snap.data();
    if (data.status !== 'waiting') {
      throw new Error('ROOM IN SESSION OR FULL');
    }
    
    const maxPlayers = data.mode === '2v2' ? 4 : 2;
    let assignedRole = null;
    let currentPlayers = 0;
    
    const players = data.players || { p1: data.hostId, p2: null, p3: null, p4: null };
    
    for (let i = 1; i <= maxPlayers; i++) {
      const role = 'p' + i;
      if (players[role]) {
        currentPlayers++;
      } else if (!assignedRole) {
        assignedRole = role;
      }
    }
    
    if (!assignedRole) {
      throw new Error('ROOM FULL');
    }

    resetMultiplayerSessionTracking(0);
    const myName = getLocalCallsign();
    state.multiplayerNames = Object.assign({ p1: null, p2: null, p3: null, p4: null }, data.playerNames || {});
    state.multiplayerNames[assignedRole] = myName;
    state.currentRoomId = code;
    state.playerRole = assignedRole;
    state.roomFallenTiles = data.fallen || [];
    state.multiplayerMapId = data.mapId || null;
    state.gameMode = data.mode === '2v2' ? 'duos_multi' : 'duel_multi';
    initWebRTCPeerSession(false, code);

    const patch = {
      [`players.${assignedRole}`]: state.currentUser.uid,
      [`playerNames.${assignedRole}`]: myName
    };
    
    if (currentPlayers + 1 === maxPlayers) {
      patch.status = 'active';
    }

    await roomUpdateDoc(roomRef, patch);

    const rm = document.getElementById('roomModal');
    if (rm) rm.style.display = 'none';

    if (state.roomUnsubscribe) { state.roomUnsubscribe(); state.roomUnsubscribe = null; }
    state.roomUnsubscribe = roomOnSnapshot(roomRef, (snap) => {
      onRoomSnapshot(snap);
    }, (err) => {
      console.warn("Room snapshot error:", err);
      message("CONNECTION ERROR");
    });

    if (patch.status === 'active') {
      startMultiplayerDuel(assignedRole, code, data.mode, {
        roundId: data.roundId || 1,
        mapId: data.mapId || null
      });
      message('CONNECTED TO ARENA — FIGHT!');
    } else {
      showHostWaitingModal(code, data.mode);
      message('WAITING FOR PLAYERS...');
    }
  } catch (err) {
    console.error("Join room error:", err);
    message('COULD NOT CONNECT');
    const rs = document.getElementById('roomSubtitle');
    if (rs) {
      rs.textContent = err.message || "CONNECTION FAILED";
      rs.style.color = '#ff3838';
    }
  } finally {
    if (btn) {
      btn.textContent = originalText;
      btn.disabled = false;
    }
    if (inp) inp.disabled = false;
  }
}

export function startMultiplayerDuel(role, roomCode, mode = '1v1', options = {}) {
  const nextRoundId = typeof options.roundId === 'number'
    ? options.roundId
    : Math.max(1, state.multiplayerRoundId || 1);
  const isQuickMatch = !!(roomCode && String(roomCode).startsWith('MATCH_'));
  const resolvedMapId = options.mapId !== undefined
    ? options.mapId
    : (isQuickMatch ? null : (state.multiplayerMapId || null));
  resetMultiplayerSessionTracking(nextRoundId);
  state.multiplayerMapId = resolvedMapId;
  state.onCountdownEnd = null;
  state.spawnTimer = 0;
  if (state.activeGridId) {
    teardownSectorArena();
  }

  state.gameMode = mode === '2v2' ? 'duos_multi' : 'duel_multi';
  state.playerRole = role;
  state.currentRoomId = roomCode;
  applyPlayerName(role, getLocalCallsign());
  state.lastProcessedThrowId = null;
  state.netSyncTimer = 0;
  state.roomFallenTiles = [];
  state.hintTimer = 4.5;
  const overlay = document.getElementById('overlay');
  if (overlay) overlay.style.display = 'none';

  clearMultiplayerEntities();

  for (const tile of tiles.values()) {
    tile.state = config.TILE_INTACT;
    tile.timer = 0;
    tile.regenTimer = 0;
    tile.mesh.position.y = tile.origY;
    tile.mesh.visible = true;
    if (tile.slabMesh.material !== tileMatIntact) {
      tile.slabMesh.material.dispose();
      tile.edgeMesh.material.dispose();
      tile.slabMesh.material = tileMatIntact;
      tile.edgeMesh.material = tileEdgeMatIntact;
    }
  }

  if (resolvedMapId) {
    applySectorArena(getGridIdForMap(resolvedMapId));
  }

  const spawns = getSpawnCoords(mode);

  const mySpawn = spawns[role];
  state.player.pos.set(mySpawn.x, 0, mySpawn.z);
  state.player.yaw = mySpawn.yaw;
  state.player.pitch = -0.1;
  state.player.vel.set(0, 0, 0);
  state.player.y = 0;
  state.player.vy = 0;
  state.player.grounded = true;
  state.player.jumps = 0;
  state.player.hp = 100;
  state.player.energy = 100;
  state.player.hasDisc = true;
  state.player.alive = true;
  state.player.blocking = false;
  state.player.invuln = 0;
  state.player.hurtFlash = 0;
  state.player.chargingThrow = false;
  state.player.throwCharge = 0;
  state.player.throwChargeTime = 0;
  state.player.noDiscTimer = 0;
  state.player.obj.visible = true;
  state.player.obj.position.copy(state.player.pos);
  state.player.obj.rotation.y = state.player.yaw;
  state.player.obj.userData.backDisc.visible = true;

  const maxPlayers = mode === '2v2' ? 4 : 2;
  for (let i = 1; i <= maxPlayers; i++) {
    const r = 'p' + i;
    if (r === role) continue;
    
    const isTeammate = spawns[r].team === mySpawn.team;
    const color = isTeammate ? config.CYAN : config.PURPLE;
    const oppObj = makeProgram(color, { archetype: 'player', isPlayer: isTeammate });
    scene.add(oppObj);
    
    const s = spawns[r];
    oppObj.position.set(s.x, 0, s.z);
    oppObj.rotation.y = s.yaw;
    
    const mp = {
      role: r,
      name: (state.multiplayerNames && state.multiplayerNames[r]) ? state.multiplayerNames[r] : r.toUpperCase(),
      obj: oppObj,
      pos: new THREE.Vector3(s.x, 0, s.z),
      targetPos: new THREE.Vector3(s.x, 0, s.z),
      y: 0,
      targetY: 0,
      yaw: s.yaw,
      targetYaw: s.yaw,
      hp: 100,
      blocking: false,
      hasDisc: true,
      alive: true,
      team: s.team
    };
    
    state.multiPlayers[r] = mp;
    if (isTeammate) state.teammates.push(mp);
    else state.foes.push(mp);
  }

  if (isWebRTCConnected() && role) {
    try {
      state.webrtcPeer.sendReliable({
        type: 'PLAYER_INFO',
        role,
        name: getLocalCallsign()
      });
    } catch (_) {}
  }
  
  if (mode === '1v1') {
    state.duelOpponent = state.foes[0];
  } else {
    state.duelOpponent = null;
  }

  state.running = true;
  state.paused = false;
  state.justResumed = true;
  resetTouchInputs();
  state.gameOverT = 0;
  state.gameOverReason = '';

  const fwd = new THREE.Vector3(-Math.sin(state.player.yaw), 0, -Math.cos(state.player.yaw));
  const right = new THREE.Vector3(-fwd.z, 0, fwd.x);
  const back = new THREE.Vector3(-fwd.x, 0, -fwd.z);
  const camOff = back.multiplyScalar(9.0)
    .addScaledVector(right, 1.7)
    .setY(4.3 - state.player.pitch * 5.0);
  camera.position.copy(state.player.pos).add(camOff);
  camera.rotation.set(state.player.pitch, state.player.yaw, 0, 'YXZ');

  updateHUD();
  resetHintVisibility(4.5);
  updateArenaNameplates();
  if (typeof window !== 'undefined' && window.__tronStartCountdown) {
    window.__tronStartCountdown(3.0);
  }
  tryLock();
  focusGame();
}

export function onRoomSnapshot(snap) {
  try {
    if (!snap.exists()) return;
    const data = snap.data();
    if (!data) return;

  if (data.playerNames && typeof data.playerNames === 'object') {
    for (const [r, n] of Object.entries(data.playerNames)) {
      applyPlayerName(r, n);
    }
  }

  const docRoundId = typeof data.roundId === 'number' ? data.roundId : 1;
  const isInitialStart = data.status === 'active' && (state.multiplayerRoundId || 0) === 0;
  const isRematchStart = data.status === 'active' && docRoundId > (state.multiplayerRoundId || 0);
  if (isInitialStart || isRematchStart) {
    const rm = document.getElementById('roomModal');
    if (rm) rm.style.display = 'none';
    const jm = document.getElementById('joinModal');
    if (jm) jm.style.display = 'none';

    const resolvedMapId = data.mapId !== undefined ? data.mapId : (state.multiplayerMapId || null);
    startMultiplayerDuel(state.playerRole, state.currentRoomId, data.mode || '1v1', {
      roundId: docRoundId,
      mapId: resolvedMapId
    });
    message(isInitialStart ? 'CHALLENGERS DETECTED — FIGHT!' : 'REMATCH — FIGHT!');
    return;
  }

  if (state.gameMode !== 'duel_multi' && state.gameMode !== 'duos_multi') return;

  if (data.status === 'closed') {
    handleRemotePeerLeft({ reason: data.closedReason || 'RETURN_TO_MENU' });
    return;
  }

  if (state.multiplayerMatchFinished && data.status === 'active') return;

  if (data.state) {
    for (const r in state.multiPlayers) {
      const oppData = data.state[r];
      const opp = state.multiPlayers[r];
      if (oppData && opp) {
        opp.targetPos.set(oppData.x, 0, oppData.z);
        opp.targetY = oppData.y || 0;
        opp.targetYaw = oppData.yaw;
        if (oppData.hp !== undefined) opp.hp = oppData.hp;
        opp.blocking = !!oppData.blocking;
        if (oppData.hasDisc !== undefined) opp.hasDisc = oppData.hasDisc;

        if (oppData.hp <= 0 && opp.alive) {
          opp.alive = false;
          burst(opp.pos.clone().setY(opp.y + 1.4), opp.team === state.multiPlayers[state.playerRole]?.team ? config.CYAN : config.PURPLE, 80, 15);
          opp.obj.visible = false;
        }
      }
    }
  }

  for (const r in state.multiPlayers) {
    if (data.state && data.state[r]) continue;
    const oppData = data[r];
    const opp = state.multiPlayers[r];
    if (oppData && opp) {
      opp.targetPos.set(oppData.x, 0, oppData.z);
      opp.targetY = oppData.y || 0;
      opp.targetYaw = oppData.yaw;
      if (oppData.hp !== undefined) opp.hp = oppData.hp;
      opp.blocking = !!oppData.blocking;
      if (oppData.hasDisc !== undefined) opp.hasDisc = oppData.hasDisc;

      if (oppData.hp <= 0 && opp.alive) {
        opp.alive = false;
        burst(opp.pos.clone().setY(opp.y + 1.4), config.PURPLE, 80, 15);
        opp.obj.visible = false;
      }
    }
  }

  if (data.lastThrow && data.lastThrow.id !== state.lastProcessedThrowId && data.lastThrow.sender !== state.playerRole) {
    state.lastProcessedThrowId = data.lastThrow.id;
    const t = data.lastThrow;
    const opp = state.multiPlayers[t.sender];
    if (opp) {
      const origin = new THREE.Vector3(t.x, t.y, t.z);
      const vel = new THREE.Vector3(t.vx, t.vy, t.vz);
      const oppDisc = spawnDisc(origin, vel, opp, opp.team === (state.multiPlayers[state.playerRole]?.team || 1) ? config.CYAN : config.PURPLE, t.curve || 0, t.charge || 0);
      oppDisc.remoteThrowId = t.id;
      opp.hasDisc = false;
      if (opp.obj && opp.obj.userData && opp.obj.userData.backDisc) {
        opp.obj.userData.backDisc.visible = false;
      }
      shake(0.08);
    }
  }

  if (state.playerRole !== 'p1' && Array.isArray(data.fallen)) {
    for (const item of data.fallen) {
      const [ix, iz] = Array.isArray(item) ? item : item.split('_').map(Number);
      const tileKey = `${ix}_${iz}`;
      const t = tiles.get(tileKey);
      if (t && t.state === config.TILE_INTACT) {
        triggerTileWarning(t, config.PURPLE);
      }
    }
  }

  if (data.status === 'finished') {
    if (typeof data.roundId === 'number' && state.multiplayerRoundId && data.roundId < state.multiplayerRoundId) {
      return;
    }
    state.multiplayerMatchFinished = true;
    clearMatchEndOverlayTimer();
    if (data.rematchVotes) {
      state.rematchVotes = Object.assign(
        { p1: false, p2: false, p3: false, p4: false },
        state.rematchVotes || {},
        data.rematchVotes
      );
    }

    let isWin = false;
    if (data.mode === '2v2' || state.gameMode === 'duos_multi') {
      const myTeam = (state.playerRole === 'p1' || state.playerRole === 'p3') ? 1 : 2;
      isWin = data.winnerTeam === myTeam;
    } else {
      isWin = data.winner === state.playerRole;
    }

    const overlay = document.getElementById('overlay');
    const hasRematchBtn = document.getElementById('voteRematchBtn');
    const isOverlayVisible = overlay && overlay.style.display === 'flex';

    if (!isOverlayVisible || !hasRematchBtn) {
      if (isWin) {
        showMultiplayerVictory(data);
      } else {
        showMultiplayerDefeat(data);
      }
    }

    updateRematchUI(data);
    if (state.playerRole === 'p1') {
      evaluateHostRematchConsensus(data);
    }
  }
  } catch (err) {
    console.error("onRoomSnapshot error:", err);
  }
}

export function renderGameOverActions(data = null) {
  const ui = getRematchUIState(data);
  const disabledAttr = ui.disabled ? 'disabled' : '';
  return `
    <button id="voteRematchBtn" class="btn" style="border-color:var(--cyan);color:var(--cyan);margin-bottom:12px;" aria-pressed="${ui.ariaPressed}" ${disabledAttr}>${ui.buttonText}</button>
    <div id="rematchVoteLabel" style="font-size:12px;letter-spacing:2px;margin-bottom:20px;">${ui.labelText}</div>
    <button id="multiMenuBtn" class="btn purple">RETURN TO MENU</button>
  `;
}

export function handleMultiplayerPageUnload() {
  if (state.isTearingDownMultiplayer) return;
  if (state.gameMode !== 'duel_multi' && state.gameMode !== 'duos_multi') return;
  dispatchReliableMatchEvent({
    type: 'PEER_LEFT',
    roundId: state.multiplayerRoundId || 1,
    role: state.playerRole,
    reason: 'TAB_CLOSED'
  });
}

if (typeof window !== 'undefined' && typeof window.addEventListener === 'function' && !window.__tronMultiplayerUnloadBound) {
  window.__tronMultiplayerUnloadBound = true;
  window.addEventListener('pagehide', handleMultiplayerPageUnload);
  window.addEventListener('beforeunload', handleMultiplayerPageUnload);
}

export function leaveMultiplayerAndReturnToMenu() {
  state.isTearingDownMultiplayer = true;
  clearRematchVoteTimeout();
  if (state.webrtcPeer && typeof state.webrtcPeer.sendReliable === 'function') {
    try {
      state.webrtcPeer.sendReliable({
        type: 'PEER_LEFT',
        roundId: state.multiplayerRoundId || 1,
        role: state.playerRole,
        reason: 'RETURN_TO_MENU'
      });
    } catch (_) {}
  }
  if (state.db && state.currentRoomId && state.playerRole && state.roomUnsubscribe) {
    const roomRef = getRoomRef(state.currentRoomId);
    const patch = {
      status: 'closed',
      closedBy: state.playerRole,
      closedReason: 'RETURN_TO_MENU'
    };
    patch[`players.${state.playerRole}`] = null;
    roomUpdateDoc(roomRef, patch).catch(() => {});
  }
  teardownMultiplayer({ flushPeerMs: 50 });
  if (typeof window !== 'undefined' && window.__tronShowModeSelectMenu) {
    window.__tronShowModeSelectMenu();
  }
}

if (typeof window !== 'undefined') {
  window.__tronLeaveMultiplayerAndReturnToMenu = leaveMultiplayerAndReturnToMenu;
}

export function bindGameOverActions(data = null) {
  const btn = el('multiMenuBtn');
  if (btn) btn.onclick = (e) => {
    e.stopPropagation();
    leaveMultiplayerAndReturnToMenu();
  };

  const voteBtn = el('voteRematchBtn');
  if (voteBtn) {
    voteBtn.onclick = (e) => {
      e.stopPropagation();
      if (state.peerDeparted || state.rematchTimedOut || state._launchingRematchRoundId) return;
      if (!state.rematchVotes) {
        state.rematchVotes = { p1: false, p2: false, p3: false, p4: false };
      }
      const currentVote = !!(state.playerRole && state.rematchVotes[state.playerRole]);
      const nextVote = !currentVote;
      if (state.playerRole) {
        state.rematchVotes[state.playerRole] = nextVote;
      }
      updateRematchUI();

      const sentOverWebRTC = dispatchReliableMatchEvent({
        type: 'REMATCH_VOTE',
        roundId: state.multiplayerRoundId || 1,
        role: state.playerRole,
        voted: nextVote
      });
      if (sentOverWebRTC) {
        if (state.playerRole === 'p1' && nextVote) {
          evaluateHostRematchConsensus();
        }
        return;
      }

      if (state.db && state.currentRoomId && state.playerRole && state.roomUnsubscribe) {
        const roomRef = getRoomRef(state.currentRoomId);
        const patch = {};
        patch[`rematchVotes.${state.playerRole}`] = nextVote;
        roomUpdateDoc(roomRef, patch).catch(err => console.warn("Vote err:", err));
      }
    };
  }
  syncRematchTimeout(data);
}

export function showMultiplayerVictory(data = null) {
  state.running = false;
  state.multiplayerMatchFinished = true;
  if (!state.multiplayerPayoutProcessed) {
    state.multiplayerPayoutProcessed = true;
    duelEconomyBridge.processMatchOutcome('victory', 'multiplayer');
  }
  const overlay = document.getElementById('overlay');
  if (overlay) overlay.style.display = 'flex';

  const existingVoteLabel = document.getElementById('rematchVoteLabel');
  if (existingVoteLabel && overlay && overlay.querySelector('.card:not(.dead)')) {
    updateRematchUI(data);
    return;
  }

  if (overlay) overlay.innerHTML = `<div class="card" style="border-color:#b026ff;box-shadow:0 0 60px rgba(176,38,255,.3);">
    <h1 style="color:#d896ff;text-shadow:0 0 30px #b026ff">VICTORY</h1>
    <h2>GRID SECURED</h2>
    <div id="postMatchMatchup" style="font-size:14px;letter-spacing:3px;margin-bottom:10px;color:#fff;">
      ${renderPostMatchMatchupInner()}
    </div>
    <div style="font-size:12px;letter-spacing:3px;opacity:0.75;margin-bottom:22px">
      ROOM <b style="color:#fff">${state.currentRoomId || '----'}</b>
    </div>
    <div class="menu-actions" style="max-width:320px;margin:0 auto">
      ${renderGameOverActions(data)}
    </div>
  </div>`;
  bindGameOverActions(data);
}

export function showMultiplayerDefeat(data = null) {
  state.running = false;
  state.multiplayerMatchFinished = true;
  if (!state.multiplayerPayoutProcessed) {
    state.multiplayerPayoutProcessed = true;
    duelEconomyBridge.processMatchOutcome('defeat', 'multiplayer');
  }
  const overlay = document.getElementById('overlay');
  if (overlay) overlay.style.display = 'flex';
  const subtitle = state.gameOverReason || 'YOU WERE ELIMINATED IN THE ARENA';

  const existingVoteLabel = document.getElementById('rematchVoteLabel');
  if (existingVoteLabel && overlay && overlay.querySelector('.card.dead')) {
    updateRematchUI(data);
    return;
  }

  if (overlay) overlay.innerHTML = `<div class="card dead">
    <h1>DEREZZED</h1>
    <h2>${subtitle}</h2>
    <div id="postMatchMatchup" style="font-size:14px;letter-spacing:3px;margin-bottom:10px;color:#fff;">
      ${renderPostMatchMatchupInner()}
    </div>
    <div style="font-size:12px;letter-spacing:3px;opacity:0.75;margin-bottom:22px">
      ROOM <b style="color:#fff">${state.currentRoomId || '----'}</b>
    </div>
    <div class="menu-actions" style="max-width:320px;margin:0 auto">
      ${renderGameOverActions(data)}
    </div>
  </div>`;
  bindGameOverActions(data);
}

export function teardownMultiplayer({ flushPeerMs = 0 } = {}) {
  state.isTearingDownMultiplayer = true;

  const peerToClose = state.webrtcPeer;
  const bridgeToClose = state.signalingBridge;
  state.webrtcPeer = null;
  state.signalingBridge = null;

  if (peerToClose) {
    peerToClose.onFastMessage = () => {};
    peerToClose.onReliableMessage = () => {};
    peerToClose.onConnectionChange = () => {};
    if (flushPeerMs > 0) {
      setTimeout(() => {
        try { peerToClose.close(); } catch (_) {}
      }, flushPeerMs);
    } else {
      try { peerToClose.close(); } catch (_) {}
    }
  }
  if (bridgeToClose) {
    try { bridgeToClose.disconnect(); } catch (_) {}
  }
  if (typeof matchmakingQueue.resetAfterMatch === 'function') {
    matchmakingQueue.resetAfterMatch();
  }
  if (state.roomUnsubscribe) {
    state.roomUnsubscribe();
    state.roomUnsubscribe = null;
  }
  clearMultiplayerEntities();
  resetMultiplayerSessionTracking(0);
  state.multiplayerMapId = null;
  if (state.activeGridId) {
    teardownSectorArena();
  }
  state.currentRoomId = null;
  state.playerRole = null;
  state.multiplayerNames = { p1: null, p2: null, p3: null, p4: null };
  state.lastProcessedThrowId = null;
  state.roomFallenTiles = [];
  state.gameMode = 'swarm';
  state.running = false;
  state.paused = false;
  resetTouchInputs();
  if (typeof document !== 'undefined' && document.pointerLockElement) {
    document.exitPointerLock();
  }
  setCursor();
}
