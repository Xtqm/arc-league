/**
 * humanoid_rig.test.js
 * Unit and integration tests for Magnetic Hard-Light Construct rigs,
 * role-differentiated construct archetypes, Hover-Palm disc carrying, and 4-state kinematics.
 */

import assert from 'assert';
import * as THREE from '../../vendor/three.module.js';
import { makeProgram, animateProgramKinematics } from '../../src/graphics/materials.js';

console.log('--- Running Magnetic Construct Rig & Kinematics Test Suite ---');

// =========================================================================
// Group 1: Hierarchical Joint Tree, Part Tagging & Base Wingless Constraint
// =========================================================================
console.log('\n[Group 1] Testing Hierarchical Joint Tree & Part Tagging...');

const playerRig = makeProgram(0x00f3ff, { archetype: 'player' });
assert.strictEqual(playerRig.userData.part, 'chassis_root');
assert.strictEqual(playerRig.userData.archetype, 'player');
assert.ok(playerRig.userData.suitMaterial instanceof THREE.MeshStandardMaterial);
assert.strictEqual(playerRig.userData.suitMaterial.flatShading, true, 'Construct plates must use flatShading');
assert.ok(playerRig.userData.litMaterial instanceof THREE.MeshStandardMaterial, 'litMaterial must support HDR emissive bloom');
assert.ok(playerRig.userData.litMaterial.emissiveIntensity >= 1.5, 'litMaterial must emit HDR radiance');
assert.strictEqual(playerRig.userData.backDisc.userData.part, 'chassis_back_disc');
assert.strictEqual(playerRig.userData.backDisc.parent, playerRig.userData.joints.rightHand, 'Hover-Palm disc must be attached to right hand');
assert.strictEqual(playerRig.userData.halo.userData.part, 'chassis_halo');

// Base player rig must reserve dorsalWingPivot with zero wing meshes by default
assert.ok(playerRig.userData.dorsalWingPivot instanceof THREE.Group, 'dorsalWingPivot must exist for future cosmetics');
assert.strictEqual(playerRig.userData.dorsalWingPivot.children.length, 0, 'Base player rig must have no wings by default');

// Verify joint references exist
const joints = playerRig.userData.joints;
assert.ok(joints, 'Rig must expose userData.joints dictionary');
assert.ok(joints.pelvis instanceof THREE.Group, 'pelvis joint must exist');
assert.ok(joints.abdomen instanceof THREE.Group, 'abdomen joint must exist');
assert.ok(joints.torso instanceof THREE.Group, 'torso joint must exist');
assert.ok(joints.neck instanceof THREE.Group, 'neck pivot must exist');
assert.strictEqual(joints.neck.children.filter(c => c.isMesh).length, 0, 'neck pivot must stay empty for floating head gap');
assert.ok(joints.head instanceof THREE.Group, 'head joint must exist');
assert.ok(joints.leftShoulder instanceof THREE.Group, 'leftShoulder joint must exist');
assert.ok(joints.rightShoulder instanceof THREE.Group, 'rightShoulder joint must exist');
assert.ok(joints.leftElbow instanceof THREE.Group, 'leftElbow joint must exist');
assert.ok(joints.rightElbow instanceof THREE.Group, 'rightElbow joint must exist');
assert.ok(joints.leftHand instanceof THREE.Group, 'leftHand joint must exist');
assert.ok(joints.rightHand instanceof THREE.Group, 'rightHand joint must exist');
assert.ok(joints.leftHip instanceof THREE.Group, 'leftHip joint must exist');
assert.ok(joints.rightHip instanceof THREE.Group, 'rightHip joint must exist');
assert.ok(joints.leftKnee instanceof THREE.Group, 'leftKnee joint must exist');
assert.ok(joints.rightKnee instanceof THREE.Group, 'rightKnee joint must exist');

// Verify parent-child hierarchy
assert.strictEqual(joints.leftShoulder.parent, joints.torso, 'leftShoulder must be child of torso');
assert.strictEqual(joints.rightShoulder.parent, joints.torso, 'rightShoulder must be child of torso');
assert.strictEqual(joints.neck.parent, joints.torso, 'neck must be child of torso');
assert.strictEqual(joints.head.parent, joints.neck, 'head must be child of neck');
assert.strictEqual(joints.leftHip.parent, joints.pelvis, 'leftHip must be child of pelvis');
assert.strictEqual(joints.rightHip.parent, joints.pelvis, 'rightHip must be child of pelvis');

// Check sub-mesh semantic tagging (faceted plates, glowing edge trims, core, single visor)
let suitCount = 0, trimCount = 0, visorCount = 0, edgeTrimCount = 0;
playerRig.traverse((c) => {
  if (c.userData.part === 'chassis_suit') suitCount++;
  if (c.userData.part === 'chassis_trim') trimCount++;
  if (c.userData.part === 'chassis_visor') visorCount++;
  if (c.userData.isEdgeTrim) edgeTrimCount++;
});
assert.ok(suitCount >= 10, `Expected at least 10 faceted suit meshes, found ${suitCount}`);
assert.ok(trimCount >= 6, `Expected at least 6 trim/edge meshes, found ${trimCount}`);
assert.ok(edgeTrimCount >= 6, `Expected EdgesGeometry hairline trim lines, found ${edgeTrimCount}`);
assert.strictEqual(visorCount, 1, 'Player rig must contain exactly 1 visor mesh');
assert.ok(playerRig.userData.coreMesh, 'Player rig must expose glowing chest coreMesh');
assert.ok(playerRig.userData.headHalo, 'Player rig must include tilted headHalo');

console.log('✓ Group 1: Hierarchical joint tree, faceted plates, and part tagging verified.');

// =========================================================================
// Group 2: Role-Differentiated Construct Archetypes
// =========================================================================
console.log('\n[Group 2] Testing Role-Differentiated Construct Archetypes...');

const droneRig = makeProgram(0xff6a10, { archetype: 'drone' });
assert.strictEqual(droneRig.userData.part, 'chassis_root');
assert.strictEqual(droneRig.userData.archetype, 'drone');
assert.ok(droneRig.userData.coreMesh, 'Chevron Drone must retain glowing chest coreMesh');
assert.strictEqual(droneRig.userData.headHalo, undefined, 'Chevron Drone must not render a head halo');

let droneVisorCount = 0, droneVisorMesh = null;
droneRig.traverse((c) => {
  if (c.userData.part === 'chassis_visor') {
    droneVisorCount++;
    droneVisorMesh = c;
  }
});
assert.strictEqual(droneVisorCount, 1, 'Chevron Drone must contain exactly 1 V-core visor mesh');

const sentinelRig = makeProgram(0xff0055, { archetype: 'sentinel' });
assert.strictEqual(sentinelRig.userData.archetype, 'sentinel');
assert.ok(sentinelRig.userData.coreMesh, 'Sentinel Boss must expose blazing coreMesh');

let sentinelVisorCount = 0, sentinelVisorMesh = null, sentinelBackRings = 0;
sentinelRig.traverse((c) => {
  if (c.userData.part === 'chassis_visor') {
    sentinelVisorCount++;
    sentinelVisorMesh = c;
  }
  if (c.isMesh && c.geometry?.type === 'TorusGeometry' && c.parent === sentinelRig.userData.torso) {
    sentinelBackRings++;
  }
});
assert.strictEqual(sentinelVisorCount, 1, 'Sentinel Boss must contain exactly 1 vertical Monolith visor mesh');
assert.strictEqual(sentinelBackRings, 0, 'Sentinel Boss must have ZERO concentric rings on torso back');

let playerVisorMesh = null;
playerRig.traverse((c) => {
  if (c.userData.part === 'chassis_visor') playerVisorMesh = c;
});
assert.notStrictEqual(playerVisorMesh.geometry, droneVisorMesh.geometry, 'Player and drone visors must use distinct geometries');
assert.notStrictEqual(playerVisorMesh.geometry, sentinelVisorMesh.geometry, 'Player and sentinel visors must use distinct geometries');

// Ensure Hover-Palm single-disc setup (no disc on leftHand)
let leftHandDiscs = 0;
joints.leftHand.traverse((c) => {
  if (c.userData.part === 'chassis_back_disc') leftHandDiscs++;
});
assert.strictEqual(leftHandDiscs, 0, 'Left hand must remain bare with zero discs');

console.log('✓ Group 2: Role-differentiated construct archetypes verified.');

// =========================================================================
// Group 3: 4-State Hover-Palm & Locomotion Procedural Kinematics
// =========================================================================
console.log('\n[Group 3] Testing 4-State Hover-Palm & Procedural Kinematics...');

// 3.1 Running Stride & Floating Shard Micro-Hover
const initialLHipX = playerRig.userData.leftHip.rotation.x;
const initialRHipX = playerRig.userData.rightHip.rotation.x;
const shard0 = playerRig.userData.floatingShards[0];
const shardBaseY = shard0.userData.floatBasePos.y;

animateProgramKinematics(playerRig, 0.05, {
  speed: 10,
  grounded: true,
  vy: 0,
  blocking: false,
  hurt: 0,
  time: 0.5,
  hasDisc: true
});

assert.notStrictEqual(playerRig.userData.leftHip.rotation.x, initialLHipX, 'Left hip must rotate during run');
assert.notStrictEqual(playerRig.userData.rightHip.rotation.x, initialRHipX, 'Right hip must rotate during run');
assert.ok(
  Math.sign(playerRig.userData.leftHip.rotation.x) !== Math.sign(playerRig.userData.rightHip.rotation.x) ||
  Math.abs(playerRig.userData.leftHip.rotation.x - playerRig.userData.rightHip.rotation.x) > 0.01,
  'Hips must swing in opposite phase during run'
);
assert.notStrictEqual(shard0.position.y, shardBaseY, 'Floating armor shards must micro-hover over time');

// 3.2 Hover-Palm Shield Block Stance
animateProgramKinematics(playerRig, 0.1, {
  speed: 0,
  grounded: true,
  vy: 0,
  blocking: true,
  hurt: 0,
  time: 1.0,
  hasDisc: true
});
assert.ok(playerRig.userData.leftShoulder.rotation.x < -0.3, 'Shoulders must raise forward when blocking');
assert.ok(playerRig.userData.rightShoulder.rotation.x < -0.3, 'Shoulders must raise forward when blocking');
assert.ok(playerRig.userData.backDisc.rotation.x > 1.0, 'Blocking stance must tilt Hover-Palm disc forward as barrier');

// 3.3 Airborne Jump
animateProgramKinematics(playerRig, 0.1, {
  speed: 5,
  grounded: false,
  vy: 8,
  blocking: false,
  hurt: 0,
  time: 1.5,
  hasDisc: true
});
assert.ok(playerRig.userData.leftHip.rotation.x > 0.1, 'Legs must trail backward when airborne');

// 3.4 Idle Hover-Palm Carry Breathing
animateProgramKinematics(playerRig, 0.1, {
  speed: 0,
  grounded: true,
  vy: 0,
  blocking: false,
  hurt: 0,
  time: 2.0,
  hasDisc: true
});
const idleTorsoX = playerRig.userData.torso.rotation.x;
animateProgramKinematics(playerRig, 0.5, {
  speed: 0,
  grounded: true,
  vy: 0,
  blocking: false,
  hurt: 0,
  time: 2.5,
  hasDisc: true
});
assert.notStrictEqual(playerRig.userData.torso.rotation.x, idleTorsoX, 'Torso must breathe during idle hover stance');
assert.strictEqual(playerRig.userData.backDisc.parent, playerRig.userData.joints.rightHand, 'Disc must remain parented to rightHand');
assert.ok(playerRig.userData.backDisc.position.z > 0.12, 'Hover-Palm disc must float cleanly above upturned palm');

// 3.5 Telekinetic Charge Wind-Up -> Open-Palm Throw -> Magnetic Catch
animateProgramKinematics(playerRig, 0.1, {
  speed: 0,
  grounded: true,
  vy: 0,
  blocking: false,
  chargingThrow: true,
  throwCharge: 0.9,
  time: 3.0,
  hasDisc: true
});
assert.ok(playerRig.userData.torso.rotation.y < -0.1, 'Charge wind-up must coil torso back');
assert.ok(playerRig.userData.rightShoulder.rotation.x > -0.1, 'Charge wind-up must pull right arm back');

// Transition hasDisc true -> false triggers throw thrust
animateProgramKinematics(playerRig, 0.05, {
  speed: 0,
  grounded: true,
  vy: 0,
  blocking: false,
  chargingThrow: false,
  throwCharge: 0,
  time: 3.1,
  hasDisc: false
});
assert.ok(playerRig.userData._anim.throwTimer > 0, 'Losing disc must trigger telekinetic palm throw timer');
assert.ok(playerRig.userData.rightShoulder.rotation.x < -0.5, 'Throw release must thrust open right palm forward');

// Transition hasDisc false -> true triggers magnetic catch cushion
animateProgramKinematics(playerRig, 0.05, {
  speed: 0,
  grounded: true,
  vy: 0,
  blocking: false,
  time: 3.6,
  hasDisc: true
});
assert.ok(playerRig.userData._anim.catchTimer > 0, 'Re-arming disc must trigger magnetic catch timer');

// 3.6 Walking Locomotion Stride
animateProgramKinematics(playerRig, 0.05, {
  speed: 3.5,
  grounded: true,
  vy: 0,
  blocking: false,
  hurt: 0,
  time: 4.0,
  hasDisc: true
});
assert.ok(playerRig.userData.leftKnee.rotation.x > 0, 'Knee must flex during walking stride');

console.log('✓ Group 3: 4-state Hover-Palm & procedural kinematics verified.');

// =========================================================================
// Group 4: Boss Scaling & Legacy Caller Compatibility
// =========================================================================
console.log('\n[Group 4] Testing Boss Scaling & Legacy Compatibility...');

const duelBossRig = makeProgram(0xff6a10, { archetype: 'sentinel' });
duelBossRig.scale.setScalar(1.15);
assert.strictEqual(duelBossRig.scale.x, 1.15);
assert.strictEqual(duelBossRig.userData.halo.userData.part, 'chassis_halo');

const arbiterBossRig = makeProgram(0x7b2cbf, { archetype: 'sentinel' });
arbiterBossRig.scale.setScalar(1.22);
assert.strictEqual(arbiterBossRig.scale.x, 1.22);

// Legacy option mapping fallback
const legacyPlayer = makeProgram(0x00f3ff, { isPlayer: true, helmetType: 'flynn' });
const legacyBot = makeProgram(0xb026ff, { isPlayer: false, helmetType: 'rinzler' });
assert.strictEqual(legacyPlayer.userData.archetype, 'player');
assert.strictEqual(legacyBot.userData.archetype, 'drone');

console.log('✓ Group 4: Boss scaling and legacy option mapping verified.');

console.log('\n=============================================================');
console.log('ALL MAGNETIC CONSTRUCT RIG & KINEMATICS TESTS PASSED (100%)');
console.log('=============================================================');
