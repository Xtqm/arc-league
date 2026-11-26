import * as THREE from '../../vendor/three.module.js';
import { state } from '../core/state.js';
import { config } from '../core/config.js';
import { burst } from '../graphics/particles.js';
import { animateProgramKinematics } from '../graphics/materials.js';
import { getRoomRef, roomUpdateDoc } from './firebaseSetup.js';

export const PACKET_HEADER = 0xAA55;
export const PACKET_SIZE = 32;
const ROLE_TO_ID = { p1: 0, p2: 1, p3: 2, p4: 3 };
const ID_TO_ROLE = ['p1', 'p2', 'p3', 'p4'];

/**
 * Encodes kinematic state into a compact 32-byte ArrayBuffer struct.
 * Layout:
 * [0..1]   Uint16 Header (0xAA55)
 * [2..5]   Uint32 Timestamp ms
 * [6..7]   Int16  Position X (0.01m)
 * [8..9]   Int16  Position Y (0.01m)
 * [10..11] Int16  Position Z (0.01m)
 * [12..13] Int16  Rotation Yaw (0.001 rad)
 * [14..15] Int16  Rotation Pitch (0.001 rad)
 * [16]     Uint8  Health (0-100)
 * [17]     Uint8  Bitflags (0: blocking, 1: hasDisc, 2: chargingThrow, 3..4: role)
 * [18..19] Uint16 Throw Charge (0-1000)
 * [20]     Uint8  Match Round ID
 * [21]     Uint8  Series Round ID
 * [22..23] Uint16 Sequence Number
 * [24..31] 8 bytes Reserved
 * 
 * @param {Object} input 
 * @param {ArrayBuffer|ArrayBufferView} [targetBuffer] Optional destination buffer
 * @returns {ArrayBuffer}
 */
export function encodeKinematicsBinary(input, targetBuffer = null) {
  let buf;
  let byteOffset = 0;
  if (targetBuffer instanceof ArrayBuffer) {
    buf = targetBuffer;
  } else if (targetBuffer && targetBuffer.buffer instanceof ArrayBuffer) {
    buf = targetBuffer.buffer;
    byteOffset = targetBuffer.byteOffset || 0;
  } else {
    buf = new ArrayBuffer(PACKET_SIZE);
  }
  const view = new DataView(buf, byteOffset, PACKET_SIZE);

  const s = input.state || input;
  const role = input.role || s.role || 'p1';
  const mr = input.mr !== undefined ? input.mr : (s.mr !== undefined ? s.mr : 1);
  const sr = input.sr !== undefined ? input.sr : (s.sr !== undefined ? s.sr : 1);
  const time = input.time !== undefined ? input.time : (s.time !== undefined ? s.time : (typeof performance !== 'undefined' ? performance.now() : Date.now()));
  const seq = input.seq !== undefined ? input.seq : (s.seq !== undefined ? s.seq : 0);

  const x = s.x || 0;
  const y = s.y || 0;
  const z = s.z || 0;
  const yaw = s.yaw || 0;
  const pitch = s.pitch || 0;
  const hp = s.hp !== undefined ? s.hp : 100;
  const blocking = !!s.blocking;
  const hasDisc = s.hasDisc !== undefined ? !!s.hasDisc : true;
  const chargingThrow = !!s.chargingThrow;
  const throwCharge = s.throwCharge || 0;

  // [0..1] Header
  view.setUint16(0, PACKET_HEADER, true);

  // [2..5] Timestamp
  view.setUint32(2, (time >>> 0), true);

  // [6..11] Position X, Y, Z (normalized to 0.01m)
  view.setInt16(6, Math.max(-32768, Math.min(32767, Math.round(x * 100))), true);
  view.setInt16(8, Math.max(-32768, Math.min(32767, Math.round(y * 100))), true);
  view.setInt16(10, Math.max(-32768, Math.min(32767, Math.round(z * 100))), true);

  // [12..15] Rotation Yaw, Pitch (normalized to 1000 rad)
  view.setInt16(12, Math.max(-32768, Math.min(32767, Math.round(yaw * 1000))), true);
  view.setInt16(14, Math.max(-32768, Math.min(32767, Math.round(pitch * 1000))), true);

  // [16] Health
  view.setUint8(16, Math.max(0, Math.min(255, Math.round(hp))));

  // [17] Bitflags: bit 0 = blocking, bit 1 = hasDisc, bit 2 = chargingThrow, bits 3..4 = role
  const roleId = ROLE_TO_ID[role] !== undefined ? ROLE_TO_ID[role] : 1;
  let flags = 0;
  if (blocking) flags |= 1;
  if (hasDisc) flags |= 2;
  if (chargingThrow) flags |= 4;
  flags |= (roleId & 0x03) << 3;
  view.setUint8(17, flags);

  // [18..19] Throw Charge (0-1000)
  view.setUint16(18, Math.max(0, Math.min(65535, Math.round(throwCharge * 1000))), true);

  // [20..21] Round IDs
  view.setUint8(20, mr & 0xFF);
  view.setUint8(21, sr & 0xFF);

  // [22..23] Sequence number
  view.setUint16(22, seq & 0xFFFF, true);

  // [24..31] Reserved
  view.setUint32(24, 0, true);
  view.setUint32(28, 0, true);

  return buf;
}

/**
 * Decodes a 32-byte binary kinematics packet into standard object.
 * Returns null if buffer is invalid or corrupt.
 * @param {ArrayBuffer|ArrayBufferView} buffer
 * @returns {Object|null}
 */
export function decodeKinematicsBinary(buffer) {
  if (!buffer) return null;
  let view;
  if (buffer instanceof DataView) {
    view = buffer;
  } else if (buffer instanceof ArrayBuffer) {
    view = new DataView(buffer);
  } else if (buffer && buffer.buffer instanceof ArrayBuffer) {
    view = new DataView(buffer.buffer, buffer.byteOffset || 0, buffer.byteLength || PACKET_SIZE);
  } else {
    return null;
  }

  if (view.byteLength < PACKET_SIZE) return null;
  const header = view.getUint16(0, true);
  if (header !== PACKET_HEADER) return null;

  const time = view.getUint32(2, true);
  const x = view.getInt16(6, true) / 100;
  const y = view.getInt16(8, true) / 100;
  const z = view.getInt16(10, true) / 100;
  const yaw = view.getInt16(12, true) / 1000;
  const pitch = view.getInt16(14, true) / 1000;
  const hp = view.getUint8(16);
  const flags = view.getUint8(17);
  const throwCharge = view.getUint16(18, true) / 1000;
  const mr = view.getUint8(20);
  const sr = view.getUint8(21);
  const seq = view.getUint16(22, true);

  const blocking = (flags & 1) !== 0;
  const hasDisc = (flags & 2) !== 0;
  const chargingThrow = (flags & 4) !== 0;
  const roleId = (flags >> 3) & 0x03;
  const role = ID_TO_ROLE[roleId] || 'p2';

  return {
    role,
    mr,
    sr,
    time,
    seq,
    state: {
      x,
      y,
      z,
      yaw,
      pitch,
      hp,
      blocking,
      hasDisc,
      chargingThrow,
      throwCharge
    }
  };
}

let _cachedSendBuffer = null;
let _localSeq = 0;

export const INTERPOLATION_DELAY_MS = 40;

/**
 * Spherical / shortest-angle interpolation between two angles in radians.
 */
export function interpolateAngle(a, b, t) {
  let diff = (b - a) % (Math.PI * 2);
  if (diff < -Math.PI) diff += Math.PI * 2;
  if (diff > Math.PI) diff -= Math.PI * 2;
  return a + diff * t;
}

/**
 * Linearly/spherically interpolates between two historical snapshots.
 */
export function interpolateSnapshots(s0, s1, alpha) {
  return {
    x: THREE.MathUtils.lerp(s0.x, s1.x, alpha),
    y: THREE.MathUtils.lerp(s0.y, s1.y, alpha),
    z: THREE.MathUtils.lerp(s0.z, s1.z, alpha),
    yaw: interpolateAngle(s0.yaw, s1.yaw, alpha),
    pitch: THREE.MathUtils.lerp(s0.pitch, s1.pitch, alpha),
    hp: alpha < 0.5 ? s0.hp : s1.hp,
    blocking: alpha < 0.5 ? s0.blocking : s1.blocking,
    hasDisc: alpha < 0.5 ? s0.hasDisc : s1.hasDisc,
    chargingThrow: alpha < 0.5 ? s0.chargingThrow : s1.chargingThrow,
    throwCharge: THREE.MathUtils.lerp(s0.throwCharge || 0, s1.throwCharge || 0, alpha)
  };
}

/**
 * Fixed 3-snapshot circular jitter buffer for high-fidelity remote entity interpolation.
 */
export class SnapshotCircularBuffer {
  constructor(capacity = 3) {
    this.capacity = capacity;
    this.buffer = new Array(capacity);
    this.head = 0;
    this.count = 0;
  }

  push(snapshot) {
    this.buffer[this.head] = snapshot;
    this.head = (this.head + 1) % this.capacity;
    if (this.count < this.capacity) {
      this.count++;
    }
  }

  get(index) {
    if (index < 0 || index >= this.count) return null;
    const oldestIndex = (this.head - this.count + this.capacity) % this.capacity;
    return this.buffer[(oldestIndex + index) % this.capacity];
  }

  get size() {
    return this.count;
  }

  clear() {
    this.head = 0;
    this.count = 0;
    this.buffer.fill(null);
  }

  sample(renderTime) {
    if (this.count === 0) return null;
    if (this.count === 1) return this.get(0);

    const oldest = this.get(0);
    if (renderTime <= oldest.time) {
      return oldest;
    }

    const newest = this.get(this.count - 1);
    if (renderTime >= newest.time) {
      return newest;
    }

    for (let i = 0; i < this.count - 1; i++) {
      const s0 = this.get(i);
      const s1 = this.get(i + 1);
      if (renderTime >= s0.time && renderTime <= s1.time) {
        const span = s1.time - s0.time;
        const alpha = span > 0 ? (renderTime - s0.time) / span : 0;
        return interpolateSnapshots(s0, s1, alpha);
      }
    }
    return newest;
  }
}

/**
 * Ingests incoming fast kinematics packet from WebRTC DataChannel (binary or JSON)
 * @param {Object|ArrayBuffer|ArrayBufferView} data 
 */
export function handleIncomingFastPacket(data) {
  if (data instanceof ArrayBuffer || ArrayBuffer.isView(data)) {
    data = decodeKinematicsBinary(data);
  }
  if (!data || !data.role) return;
  if (state.multiplayerMatchFinished || state.seriesRoundFinished) return;
  if (data.mr && state.multiplayerRoundId && data.mr !== state.multiplayerRoundId) return;
  if (data.sr && state.seriesRound && data.sr !== state.seriesRound) return;
  const oppRole = data.role;
  const opp = state.multiPlayers[oppRole];
  if (!opp) return;
  const s = data.state;
  if (!s) return;

  if (!opp.snapshotBuffer) {
    opp.snapshotBuffer = new SnapshotCircularBuffer(3);
  }

  const now = (typeof performance !== 'undefined' ? performance.now() : Date.now());
  let synchronizedTime = now;
  if (data.time !== undefined && data.time !== null) {
    if (opp._timeOffset === undefined) {
      opp._timeOffset = now - data.time;
    } else {
      opp._timeOffset = opp._timeOffset * 0.95 + (now - data.time) * 0.05;
    }
    synchronizedTime = data.time + opp._timeOffset;
  }

  opp.snapshotBuffer.push({
    time: synchronizedTime,
    x: s.x,
    y: s.y,
    z: s.z,
    yaw: s.yaw,
    pitch: s.pitch,
    hp: s.hp,
    blocking: s.blocking,
    hasDisc: s.hasDisc,
    chargingThrow: s.chargingThrow,
    throwCharge: s.throwCharge
  });

  if (opp.targetPos) {
    opp.targetPos.set(s.x, 0, s.z);
  }
  opp.targetY = s.y;
  opp.targetYaw = s.yaw;
  opp.targetPitch = s.pitch;
  opp.hp = s.hp;
  opp.blocking = s.blocking;
  opp.hasDisc = s.hasDisc;
  opp.chargingThrow = s.chargingThrow;
  opp.throwCharge = s.throwCharge;

  if (s.hp <= 0 && opp.alive) {
    opp.alive = false;
    opp.hp = 0;
    if (opp.pos) {
      burst(opp.pos.clone().setY((opp.y || 0) + 1.4), config.PURPLE, 80, 15);
    }
    if (opp.obj) opp.obj.visible = false;
  }
}

/**
 * Synchronizes local player kinematics across WebRTC DataChannel (up to 50 Hz, 32-byte binary)
 * with graceful fallback to legacy document polling if WebRTC is not active.
 * @param {number} dt 
 */
export function syncNetworkState(dt) {
  if (state.gameMode !== 'duel_multi' && state.gameMode !== 'duos_multi') return;
  if (!state.currentRoomId || !state.playerRole || state.multiplayerMatchFinished || state.seriesRoundFinished) return;
  if (!state.player.alive || state.isSpectating) return;

  state.netSyncTimer -= dt;
  if (state.netSyncTimer > 0) return;

  const isWebRTC = !!(state.webrtcPeer && state.webrtcPeer.connectionState === 'connected');
  // 50 Hz for direct WebRTC peer channel, ~18 Hz for legacy database polling
  state.netSyncTimer = isWebRTC ? 0.02 : 0.055;

  const myState = {
    x: +state.player.pos.x.toFixed(2),
    y: +state.player.y.toFixed(2),
    z: +state.player.pos.z.toFixed(2),
    yaw: +state.player.yaw.toFixed(2),
    pitch: +state.player.pitch.toFixed(2),
    hp: state.player.hp,
    blocking: state.player.blocking,
    hasDisc: state.player.hasDisc,
    chargingThrow: !!state.player.chargingThrow,
    throwCharge: +(state.player.throwCharge || 0).toFixed(2)
  };

  // 1. Direct WebRTC DataChannel (Zero cloud database writes, 32-byte binary packet)
  if (isWebRTC) {
    if (!_cachedSendBuffer) {
      _cachedSendBuffer = new ArrayBuffer(PACKET_SIZE);
    }
    const binaryPacket = encodeKinematicsBinary({
      role: state.playerRole,
      mr: state.multiplayerRoundId || 1,
      sr: state.seriesRound || 1,
      time: typeof performance !== 'undefined' ? performance.now() : Date.now(),
      seq: (_localSeq = (_localSeq + 1) & 0xFFFF),
      state: myState
    }, _cachedSendBuffer);
    state.webrtcPeer.sendFast(binaryPacket);
    return;
  }

  // 2. Legacy database / mock channel fallback (JSON serialization)
  if (state.db && state.currentUser && state.roomUnsubscribe) {
    const roomRef = getRoomRef(state.currentRoomId);
    const payload = {};
    payload[`state.${state.playerRole}`] = myState;
    payload[state.playerRole] = myState;
    roomUpdateDoc(roomRef, payload).catch(err => console.warn("Sync err:", err));
  }
}

/**
 * Broadcasts tile drop event from host to all peers
 * @param {number} ix 
 * @param {number} iz 
 */
export function onTileDestabilizedByHost(ix, iz) {
  if ((state.gameMode !== 'duel_multi' && state.gameMode !== 'duos_multi') || state.playerRole !== 'p1') return;
  if (!state.currentRoomId) return;

  const tileStr = `${ix}_${iz}`;
  const alreadyAdded = state.roomFallenTiles.some(item => Array.isArray(item) ? (item[0] === ix && item[1] === iz) : item === tileStr);
  if (!alreadyAdded) {
    state.roomFallenTiles.push(tileStr);

    if (state.webrtcPeer && state.webrtcPeer.connectionState === 'connected') {
      state.webrtcPeer.sendReliable({
        type: 'TILE_DESTABILIZED',
        tile: tileStr,
        fallen: state.roomFallenTiles
      });
      return;
    }

    if (state.db && state.currentUser) {
      const roomRef = getRoomRef(state.currentRoomId);
      roomUpdateDoc(roomRef, {
        fallen: state.roomFallenTiles
      }).catch(err => console.warn("Fallen tiles sync err:", err));
    }
  }
}

/**
 * Updates remote player positions with snapshot jitter buffer interpolation (40ms delay)
 * or falls back to linear lerp if buffer is empty.
 * @param {number} dt 
 */
export function updateRemotePlayers(dt) {
  if (state.gameMode !== 'duel_multi' && state.gameMode !== 'duos_multi') return;
  const now = (typeof performance !== 'undefined' ? performance.now() : Date.now());

  for (const key in state.multiPlayers) {
    const opp = state.multiPlayers[key];
    if (!opp || !opp.obj || !opp.alive) continue;

    const prevPos = opp.pos ? opp.pos.clone() : null;

    if (opp.snapshotBuffer && opp.snapshotBuffer.size >= 2) {
      const newest = opp.snapshotBuffer.get(opp.snapshotBuffer.size - 1);
      const targetTime = newest.time - INTERPOLATION_DELAY_MS;

      if (opp._renderTime === undefined || opp._renderTime < newest.time - 500 || opp._renderTime > newest.time + 100) {
        opp._renderTime = targetTime;
      } else {
        opp._renderTime += dt * 1000;
        if (opp._renderTime > newest.time) {
          opp._renderTime = newest.time;
        }
      }

      const sampled = opp.snapshotBuffer.sample(opp._renderTime);
      if (sampled) {
        opp.pos.set(sampled.x, 0, sampled.z);
        opp.y = sampled.y;
        opp.yaw = sampled.yaw;
        opp.obj.position.copy(opp.pos);
        opp.obj.position.y = opp.y;
        opp.obj.rotation.y = opp.yaw;
        if (sampled.hp !== undefined) opp.hp = sampled.hp;
        opp.blocking = sampled.blocking;
        opp.hasDisc = sampled.hasDisc;
        opp.chargingThrow = sampled.chargingThrow;
        opp.throwCharge = sampled.throwCharge;
      }
    } else {
      if (opp.targetPos) {
        opp.pos.lerp(opp.targetPos, dt * 16);
      }
      opp.y = THREE.MathUtils.lerp(opp.y || 0, opp.targetY || 0, dt * 16);
      opp.obj.position.copy(opp.pos);
      opp.obj.position.y = opp.y;
      opp.yaw = THREE.MathUtils.lerp(
        opp.yaw !== undefined ? opp.yaw : opp.obj.rotation.y,
        opp.targetYaw,
        dt * 14
      );
      opp.obj.rotation.y = opp.yaw;
    }

    if (opp.obj.userData && opp.obj.userData.backDisc) {
      opp.obj.userData.backDisc.visible = !!opp.hasDisc;
    }

    const speedEst = prevPos && opp.pos && dt > 0 ? (prevPos.distanceTo(opp.pos) / Math.max(0.001, dt)) : (opp.targetPos ? opp.pos.distanceTo(opp.targetPos) * 16 : 0);

    animateProgramKinematics(opp.obj, dt, {
      speed: speedEst,
      vy: 0,
      grounded: (opp.y || 0) <= 0.05,
      blocking: !!opp.blocking,
      hurt: 0,
      time: state.time,
      hasDisc: !!opp.hasDisc,
      chargingThrow: !!opp.chargingThrow,
      throwCharge: opp.throwCharge || 0
    });
  }
}
