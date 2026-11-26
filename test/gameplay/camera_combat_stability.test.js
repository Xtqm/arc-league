import assert from 'assert';
import * as THREE from '../../vendor/three.module.js';
import { state } from '../../src/core/state.js';
import { config } from '../../src/core/config.js';
import { camera, updateCamera, snapCamera } from '../../src/graphics/scene.js';
import { updatePlayer, resetRound } from '../../src/entities/Player.js';
import { makeProgram } from '../../src/graphics/materials.js';

function computeAimDir() {
  return new THREE.Vector3(
    -Math.sin(state.player.yaw) * Math.cos(state.player.pitch),
    Math.sin(state.player.pitch),
    -Math.cos(state.player.yaw) * Math.cos(state.player.pitch)
  ).normalize();
}

console.log('--- Running Camera Combat Viewport Stability Test Suite ---');

// Setup player
state.player.pos.set(0, 0, 0);
state.player.y = 0;
state.player.yaw = 0;
state.player.pitch = 0;
snapCamera();

// 1. Instantaneous Euler Orientation Alignment
console.log('Testing 1:1 camera aim alignment across 360-degree rotation...');
for (let angle = -Math.PI; angle <= Math.PI; angle += Math.PI / 8) {
  state.player.yaw = angle;
  state.player.pitch = 0.15;
  updateCamera(0.016);

  const camDir = new THREE.Vector3();
  camera.getWorldDirection(camDir);

  const expectedDir = computeAimDir();
  const diff = camDir.distanceTo(expectedDir);
  assert(
    diff < 1e-4,
    `Camera direction deviates from aimDir at yaw ${angle.toFixed(2)}: diff=${diff}`
  );
}
console.log('✓ Camera view orientation exactly matches player aim direction (diff < 1e-4) across 360°');

// 2. Rapid 180° flick test
console.log('Testing rapid 180-degree flick...');
state.player.yaw = 0;
state.player.pitch = 0;
updateCamera(0.016);
const forwardBefore = new THREE.Vector3();
camera.getWorldDirection(forwardBefore);

state.player.yaw = Math.PI;
state.player.pitch = 0;
updateCamera(0.016);
const forwardAfter = new THREE.Vector3();
camera.getWorldDirection(forwardAfter);

// Dot product should be -1 (exactly reversed direction)
const flickDot = forwardBefore.dot(forwardAfter);
assert(
  Math.abs(flickDot - (-1)) < 1e-4,
  `180-degree flick did not reverse cleanly, dot=${flickDot}`
);
console.log('✓ Rapid 180-degree flick transitions instantly without gimbal snap');

// 3. Backward Dash Maneuver Test
console.log('Testing backward dash maneuver...');
state.player.pos.set(0, 0, 0);
state.player.yaw = 0;
state.player.pitch = 0;
snapCamera();

// Player dashes backward at 38 m/s towards the trailing camera over multiple frames
for (let step = 0; step < 10; step++) {
  // Move backwards by 1.0m per frame
  state.player.pos.z += 1.0;
  updateCamera(0.016);

  const camDistToPlayer = camera.position.distanceTo(state.player.pos);
  assert(
    camDistToPlayer >= 2.0,
    `Camera collapsed into player during dash: dist=${camDistToPlayer}`
  );

  const camDir = new THREE.Vector3();
  camera.getWorldDirection(camDir);
  assert(
    camDir.z < -0.9,
    `Camera orientation inverted during backward dash: dir=${camDir.z}`
  );
}
console.log('✓ Camera maintains safe separation and orientation during backward dashes');

// 4. Perimeter Wall Pushback Test
console.log('Testing perimeter boundary compression...');
const maxArena = config.ARENA - 2;

// Place player at perimeter wall facing inward
state.player.pos.set(0, 0, maxArena - 2);
state.player.yaw = 0; // facing -Z, boom wants to extend to +Z outside arena
updateCamera(0.016);

assert(
  camera.position.z <= maxArena + 0.01,
  `Camera breached positive arena perimeter: z=${camera.position.z}`
);

// Spin 360 at corner
state.player.pos.set(maxArena - 2, 0, maxArena - 2);
for (let a = 0; a < Math.PI * 2; a += 0.2) {
  state.player.yaw = a;
  updateCamera(0.016);
  assert(
    Math.abs(camera.position.x) <= maxArena + 0.01 &&
    Math.abs(camera.position.z) <= maxArena + 0.01,
    `Camera breached boundary at corner spin: pos=(${camera.position.x}, ${camera.position.z})`
  );
}
console.log('✓ Camera safely compresses within arena bounds without clipping walls');

// 5. Aim Direction and Crosshair ray parity
console.log('Testing aim direction consistency...');
state.player.pos.set(0, 0, 0);
state.player.yaw = 0.5;
state.player.pitch = -0.2;
updateCamera(0.016);

const camDir = new THREE.Vector3();
camera.getWorldDirection(camDir);
const expectedAim = computeAimDir();
const rayDot = camDir.dot(expectedAim);
assert(
  rayDot > 0.9999,
  `Camera direction diverged from player aim vector: dot=${rayDot}`
);
console.log('✓ Camera view vector matches player aim vector perfectly (dot > 0.9999)');

// 6. Player Rig Forward Alignment (local +Z faces -Z away from trailing camera at yaw = 0)
console.log('Testing player Construct rig forward alignment...');
const rig = makeProgram(0x00f3ff, { archetype: 'player', forceProcedural: true });
state.player.obj = rig;
resetRound(0, 14, 0);
state.player.alive = true;
state.player.yaw = 0;
state.player.vy = 0;
updatePlayer(0.016);
rig.updateMatrixWorld(true);

const rigWorldForward = new THREE.Vector3(0, 0, 1).applyQuaternion(rig.quaternion).normalize();
assert(
  rigWorldForward.distanceTo(new THREE.Vector3(0, 0, -1)) < 1e-4,
  `At yaw=0, player rig local +Z must face -Z away from camera, got (${rigWorldForward.x.toFixed(3)}, ${rigWorldForward.y.toFixed(3)}, ${rigWorldForward.z.toFixed(3)})`
);

// Verify airborne pitch tilts nose upward when jumping (vy > 0) regardless of yaw
state.player.yaw = Math.PI / 2;
state.player.grounded = false;
state.player.vy = 10;
updatePlayer(0.016);
rig.updateMatrixWorld(true);
const airborneForward = new THREE.Vector3(0, 0, 1).applyQuaternion(rig.quaternion).normalize();
assert(
  airborneForward.x < -0.9 && airborneForward.y > 0.05,
  `Airborne upward velocity must pitch rig nose up along -X aim direction, got (${airborneForward.x.toFixed(3)}, ${airborneForward.y.toFixed(3)}, ${airborneForward.z.toFixed(3)})`
);
state.player.obj = null;
console.log('✓ Player rig forward alignment and airborne pitch verified');

console.log('--- Camera Combat Viewport Stability Test Suite PASSED ---');
