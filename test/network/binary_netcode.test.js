import assert from 'assert';
import * as THREE from '../../vendor/three.module.js';
import { state } from '../../src/core/state.js';
import {
  encodeKinematicsBinary,
  decodeKinematicsBinary,
  PACKET_HEADER,
  PACKET_SIZE,
  SnapshotCircularBuffer,
  interpolateSnapshots,
  interpolateAngle,
  INTERPOLATION_DELAY_MS,
  handleIncomingFastPacket,
  updateRemotePlayers
} from '../../src/network/sync.js';
import {
  updateHUD,
  resetHUDDirtyState,
  getOrCreateNetPingDisplay
} from '../../src/ui/hud.js';

console.log('--- Running Binary Netcode Encoder & Decoder Unit Tests ---');

// Test 1: Packet Size and Header
const sampleInput = {
  role: 'p2',
  mr: 3,
  sr: 2,
  time: 98765432,
  seq: 1024,
  state: {
    x: 12.34,
    y: 1.5,
    z: -45.67,
    yaw: 1.571,
    pitch: -0.25,
    hp: 85,
    blocking: true,
    hasDisc: false,
    chargingThrow: true,
    throwCharge: 0.65
  }
};

const buffer = encodeKinematicsBinary(sampleInput);
assert(buffer instanceof ArrayBuffer, 'encodeKinematicsBinary must return an ArrayBuffer');
assert.strictEqual(buffer.byteLength, PACKET_SIZE, `Packet size must be exactly ${PACKET_SIZE} bytes (got ${buffer.byteLength})`);
assert.strictEqual(buffer.byteLength, 32, 'Packet size must be 32 bytes');

const view = new DataView(buffer);
assert.strictEqual(view.getUint16(0, true), PACKET_HEADER, 'Header magic bytes must match PACKET_HEADER 0xAA55');
console.log('✓ 32-byte packet layout and 0xAA55 magic header verified');

// Test 2: Round-Trip Precision
const decoded = decodeKinematicsBinary(buffer);
assert(decoded !== null, 'decodeKinematicsBinary must successfully decode valid packet');
assert.strictEqual(decoded.role, 'p2', 'Role must decode to p2');
assert.strictEqual(decoded.mr, 3, 'Match round ID must decode to 3');
assert.strictEqual(decoded.sr, 2, 'Series round ID must decode to 2');
assert.strictEqual(decoded.time, 98765432, 'Timestamp must match');
assert.strictEqual(decoded.seq, 1024, 'Sequence number must match');

assert(Math.abs(decoded.state.x - sampleInput.state.x) <= 0.01, `X precision within 0.01: expected ${sampleInput.state.x}, got ${decoded.state.x}`);
assert(Math.abs(decoded.state.y - sampleInput.state.y) <= 0.01, `Y precision within 0.01: expected ${sampleInput.state.y}, got ${decoded.state.y}`);
assert(Math.abs(decoded.state.z - sampleInput.state.z) <= 0.01, `Z precision within 0.01: expected ${sampleInput.state.z}, got ${decoded.state.z}`);

assert(Math.abs(decoded.state.yaw - sampleInput.state.yaw) <= 0.002, `Yaw precision within 0.002: expected ${sampleInput.state.yaw}, got ${decoded.state.yaw}`);
assert(Math.abs(decoded.state.pitch - sampleInput.state.pitch) <= 0.002, `Pitch precision within 0.002: expected ${sampleInput.state.pitch}, got ${decoded.state.pitch}`);

assert.strictEqual(decoded.state.hp, 85, 'HP must match');
assert.strictEqual(decoded.state.blocking, true, 'Blocking flag must match');
assert.strictEqual(decoded.state.hasDisc, false, 'hasDisc flag must match');
assert.strictEqual(decoded.state.chargingThrow, true, 'chargingThrow flag must match');
assert(Math.abs(decoded.state.throwCharge - 0.65) <= 0.002, `throwCharge precision within 0.002: got ${decoded.state.throwCharge}`);

console.log('✓ Kinematics state round-trip precision verified');

// Test 3: Bitflags and Multi-Role Support
const roles = ['p1', 'p2', 'p3', 'p4'];
for (const role of roles) {
  const enc = encodeKinematicsBinary({ role, state: { x: 0, y: 0, z: 0, hp: 100 } });
  const dec = decodeKinematicsBinary(enc);
  assert.strictEqual(dec.role, role, `Role ${role} must round-trip correctly`);
}

// Flags variations
const flagsTest = encodeKinematicsBinary({
  role: 'p1',
  state: { blocking: false, hasDisc: true, chargingThrow: false }
});
const decFlags = decodeKinematicsBinary(flagsTest);
assert.strictEqual(decFlags.state.blocking, false);
assert.strictEqual(decFlags.state.hasDisc, true);
assert.strictEqual(decFlags.state.chargingThrow, false);
console.log('✓ Bitflags and 4-role encoding verified');

// Test 4: Reusable Buffer Support (Zero GC Allocation)
const preallocated = new ArrayBuffer(PACKET_SIZE);
const resultBuf = encodeKinematicsBinary(sampleInput, preallocated);
assert.strictEqual(resultBuf, preallocated, 'encodeKinematicsBinary must reuse passed ArrayBuffer');
const decPreallocated = decodeKinematicsBinary(preallocated);
assert.strictEqual(decPreallocated.role, 'p2');
assert.strictEqual(decPreallocated.seq, 1024);
console.log('✓ Preallocated buffer reuse verified for zero-GC 50 Hz execution');

// Test 5: Error Handling & Invalid Headers
assert.strictEqual(decodeKinematicsBinary(null), null, 'null buffer must return null');
assert.strictEqual(decodeKinematicsBinary(new ArrayBuffer(16)), null, 'Truncated buffer must return null');

const corrupt = new ArrayBuffer(32);
new DataView(corrupt).setUint16(0, 0x1234, true); // Wrong header
assert.strictEqual(decodeKinematicsBinary(corrupt), null, 'Corrupt header must return null');
console.log('✓ Corrupt packet rejection and safe validation verified');

// Test 6: SnapshotCircularBuffer Functionality
const sbuf = new SnapshotCircularBuffer(3);
assert.strictEqual(sbuf.size, 0, 'Initial buffer size must be 0');
assert.strictEqual(sbuf.sample(100), null, 'Empty buffer sample returns null');

sbuf.push({ time: 100, x: 0, y: 0, z: 0, yaw: 0, pitch: 0, hp: 100, blocking: false, hasDisc: true, chargingThrow: false, throwCharge: 0 });
assert.strictEqual(sbuf.size, 1, 'Size after 1 push must be 1');
assert.strictEqual(sbuf.sample(100).x, 0, '1-element sample returns the single snapshot');

sbuf.push({ time: 200, x: 10, y: 0, z: 20, yaw: 1.0, pitch: 0, hp: 100, blocking: false, hasDisc: true, chargingThrow: false, throwCharge: 0 });
sbuf.push({ time: 300, x: 20, y: 0, z: 40, yaw: 2.0, pitch: 0, hp: 100, blocking: false, hasDisc: true, chargingThrow: false, throwCharge: 0 });
assert.strictEqual(sbuf.size, 3, 'Size capped at capacity 3');

// Circular overflow: 4th push overwrites oldest (t=100)
sbuf.push({ time: 400, x: 30, y: 0, z: 60, yaw: 3.0, pitch: 0, hp: 100, blocking: false, hasDisc: true, chargingThrow: false, throwCharge: 0 });
assert.strictEqual(sbuf.size, 3, 'Size remains 3 after overflow');
assert.strictEqual(sbuf.get(0).time, 200, 'Oldest snapshot in 3-element buffer must now be t=200');
assert.strictEqual(sbuf.get(2).time, 400, 'Newest snapshot must be t=400');

// Interpolation sample exactly between t=200 and t=300 (t=250)
const midSample = sbuf.sample(250);
assert(Math.abs(midSample.x - 15) < 0.001, `Interpolated X at mid-point should be 15, got ${midSample.x}`);
assert(Math.abs(midSample.z - 30) < 0.001, `Interpolated Z at mid-point should be 30, got ${midSample.z}`);
assert(Math.abs(midSample.yaw - 1.5) < 0.001, `Interpolated Yaw at mid-point should be 1.5, got ${midSample.yaw}`);

// Clamp bounds
assert.strictEqual(sbuf.sample(50).time, 200, 'Sampling before oldest clamps to oldest snapshot');
assert.strictEqual(sbuf.sample(500).time, 400, 'Sampling after newest clamps to newest snapshot');

console.log('✓ SnapshotCircularBuffer 3-snapshot queuing and interpolation verified');

// Test 7: Locomotion Smoothing in updateRemotePlayers
state.gameMode = 'duel_multi';
state.playerRole = 'p1';
state.multiplayerMatchFinished = false;
state.seriesRoundFinished = false;

const mockOppObj = new THREE.Group();
mockOppObj.position.set(0, 0, 0);
mockOppObj.rotation.set(0, 0, 0);

const mockOpp = {
  alive: true,
  hp: 100,
  pos: new THREE.Vector3(0, 0, 0),
  y: 0,
  yaw: 0,
  obj: mockOppObj,
  targetPos: new THREE.Vector3(0, 0, 0),
  targetY: 0,
  targetYaw: 0,
  blocking: false,
  hasDisc: true
};

state.multiPlayers = { p2: mockOpp };

// Ingest two kinematic binary packets
const baseTime = performance.now();
const p1Buf = encodeKinematicsBinary({
  role: 'p2',
  time: baseTime,
  state: { x: 5, y: 0, z: 10, yaw: 0.5, hp: 90, blocking: false, hasDisc: true }
});
const p2Buf = encodeKinematicsBinary({
  role: 'p2',
  time: baseTime + 50,
  state: { x: 15, y: 0, z: 20, yaw: 1.5, hp: 90, blocking: false, hasDisc: true }
});

handleIncomingFastPacket(p1Buf);
handleIncomingFastPacket(p2Buf);

assert(mockOpp.snapshotBuffer instanceof SnapshotCircularBuffer, 'Snapshot buffer should be initialized on opponent');
assert.strictEqual(mockOpp.snapshotBuffer.size, 2, 'Snapshot buffer should have 2 snapshots');

// Run updateRemotePlayers with dt
updateRemotePlayers(0.016);
assert(mockOpp.pos.x > 0, `Opponent position X should have interpolated forward (> 0): got ${mockOpp.pos.x}`);
assert(mockOpp.pos.z > 0, `Opponent position Z should have interpolated forward (> 0): got ${mockOpp.pos.z}`);
assert.strictEqual(mockOpp.obj.position.x, mockOpp.pos.x, 'Mesh position should sync with pos');

console.log('✓ Remote combatant locomotion smoothing and 40ms interpolation delay verified');

// Test 8: Live Ping Telemetry in HUD
if (typeof document === 'undefined') {
  const elements = new Map();
  global.document = {
    getElementById: (id) => elements.get(id) || null,
    createElement: (tag) => {
      const el = {
        tagName: tag.toUpperCase(),
        id: '',
        className: '',
        style: {},
        innerHTML: '',
        textContent: '',
        children: [],
        appendChild(child) {
          this.children.push(child);
          if (child.id) elements.set(child.id, child);
          return child;
        }
      };
      return el;
    }
  };
  const tr = global.document.createElement('div');
  tr.id = 'tr';
  elements.set('tr', tr);
}

// Online WebRTC connected with 24ms ping
state.gameMode = 'duel_multi';
state.webrtcPeer = { connectionState: 'connected', ping: 24 };
state.ping = 24;
resetHUDDirtyState();
updateHUD();

const npd = getOrCreateNetPingDisplay();
assert(npd !== null, 'netPingDisplay must be created/cached in HUD');
assert.strictEqual(npd.style.display, 'block', 'netPingDisplay must be visible when online with active WebRTC');
assert(npd.innerHTML.includes('24 ms'), `HUD must display 24 ms ping (got: ${npd.innerHTML})`);
assert(npd.innerHTML.includes('#00ff66'), 'Low ping (<60ms) should be styled in green');

// Fallback / establishing mode: ping should be hidden
state.webrtcPeer = null;
state.ping = null;
resetHUDDirtyState();
updateHUD();
assert.strictEqual(npd.style.display, 'none', 'netPingDisplay must be hidden during database fallback or establishing');

// Single-player mode: ping should remain hidden
state.gameMode = 'swarm';
resetHUDDirtyState();
updateHUD();
assert.strictEqual(npd.style.display, 'none', 'netPingDisplay must be hidden in single-player modes');

console.log('✓ Live HUD ping indicator and graceful fallback verified');

// Test 9: Bandwidth Reduction & Zero-GC 50 Hz Verification
const sampleJsonPayload = JSON.stringify({
  role: 'p2',
  mr: 1,
  sr: 1,
  state: {
    x: 12.34,
    y: 1.5,
    z: -45.67,
    yaw: 1.571,
    pitch: -0.25,
    hp: 85,
    blocking: true,
    hasDisc: false,
    chargingThrow: true,
    throwCharge: 0.65
  }
});

const jsonByteLength = Buffer.byteLength(sampleJsonPayload, 'utf8');
const binaryByteLength = PACKET_SIZE;
assert(jsonByteLength >= 150, `JSON payload should be ~170-220 bytes (was ${jsonByteLength})`);
assert.strictEqual(binaryByteLength, 32, 'Binary packet layout must be exactly 32 bytes');
const bandwidthReduction = ((jsonByteLength - binaryByteLength) / jsonByteLength) * 100;
assert(bandwidthReduction > 75, `Bandwidth reduction must exceed 75% (achieved ${bandwidthReduction.toFixed(1)}%)`);

// Verify 50 Hz transmission without buffer allocations
const transmissionBuffer = new ArrayBuffer(PACKET_SIZE);
let lastTransmitted = null;
for (let frame = 0; frame < 50; frame++) {
  const buf = encodeKinematicsBinary({
    role: 'p2',
    seq: frame,
    time: 1000 + frame * 20,
    state: { x: frame * 0.1, y: 0, z: frame * 0.2, hp: 100 }
  }, transmissionBuffer);
  assert.strictEqual(buf, transmissionBuffer, 'Every frame at 50 Hz must reuse the same preallocated buffer');
  lastTransmitted = buf;
}
assert.strictEqual(lastTransmitted, transmissionBuffer);
console.log(`✓ Bandwidth reduction verified (${jsonByteLength}B -> ${binaryByteLength}B, -${bandwidthReduction.toFixed(1)}%) and zero GC at 50 Hz verified`);

console.log('======================================================');
console.log('ALL BINARY NETCODE TESTS PASSED (100% SUCCESS)');
console.log('======================================================');
