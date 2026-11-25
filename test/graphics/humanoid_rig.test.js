/**
 * humanoid_rig.test.js
 * Unit and integration tests for Magnetic Hard-Light Construct rigs,
 * role-differentiated construct archetypes, Hover-Palm disc carrying, and 4-state kinematics.
 */

import assert from 'assert';
import * as THREE from '../../vendor/three.module.js';
import { makeProgram, animateProgramKinematics } from '../../src/graphics/materials.js';
import {
  REQUIRED_CONSTRUCT_CLIPS,
  loadConstructAsset,
  clearConstructAssetCache
} from '../../src/graphics/ConstructLoader.js';

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

// Verify 5-finger articulated humanoid hands on Player Athlete Rig
for (const handKey of ['leftHand', 'rightHand']) {
  const handJoint = joints[handKey];
  assert.strictEqual(handJoint.userData.hasHumanoidFingers, true, `${handKey} must have humanoid fingers on player rig`);
  assert.ok(handJoint.userData.palmMesh, `${handKey} must possess palmMesh`);
  assert.strictEqual(handJoint.userData.palmMesh.userData.part, 'chassis_suit', 'Palm mesh must have chassis_suit part tag');
  const palmEdge = handJoint.userData.palmMesh.children.find(c => c.userData.part === 'chassis_trim');
  assert.ok(palmEdge, 'Palm mesh must contain chassis_trim edge lines');

  assert.strictEqual(handJoint.userData.thumbShards.length, 2, `${handKey} must have 2 thumb phalanges`);
  assert.strictEqual(handJoint.userData.fingerShards.length, 12, `${handKey} must have 12 finger phalanges (4 digits x 3 segments)`);

  for (const thumbShard of handJoint.userData.thumbShards) {
    assert.strictEqual(thumbShard.userData.part, 'chassis_suit');
    const edgeChild = thumbShard.children.find(c => c.userData.part === 'chassis_trim');
    assert.ok(edgeChild, 'Thumb shard must contain chassis_trim edge lines');
  }

  // Verify 3 distinct phalanges per digit
  const expectedParts = [
    'index_proximal', 'index_intermediate', 'index_distal',
    'middle_proximal', 'middle_intermediate', 'middle_distal',
    'ring_proximal', 'ring_intermediate', 'ring_distal',
    'pinky_proximal', 'pinky_intermediate', 'pinky_distal'
  ];
  const actualParts = handJoint.userData.fingerShards.map(f => f.userData.handPart);
  assert.deepStrictEqual(actualParts, expectedParts, `${handKey} must feature correct 3-segment anatomical phalanx tags`);

  for (const fingerShard of handJoint.userData.fingerShards) {
    assert.strictEqual(fingerShard.userData.part, 'chassis_suit');
    const edgeChild = fingerShard.children.find(c => c.userData.part === 'chassis_trim');
    assert.ok(edgeChild, 'Finger shard must contain chassis_trim edge lines');
  }
}

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

// =========================================================================
// Group 5: Cached GLB Construct Rig & AnimationMixer Blending Path
// =========================================================================
console.log('\n[Group 5] Testing Cached GLB Construct Rig & AnimationMixer Path...');

function buildCachedPlayerGlbFixture() {
  const root = new THREE.Group();
  root.name = 'AthleteConstructGLB';

  const suitMat = new THREE.MeshStandardMaterial({ color: 0x1e2631 });
  const trimMat = new THREE.MeshStandardMaterial({ color: 0x00f3ff, emissive: 0x00f3ff });

  const pelvis = new THREE.Group();
  pelvis.name = 'pelvis';
  pelvis.position.set(0, 1.05, 0);
  root.add(pelvis);

  const abdomen = new THREE.Group();
  abdomen.name = 'abdomen';
  abdomen.position.set(0, 0.21, 0);
  pelvis.add(abdomen);

  const torso = new THREE.Group();
  torso.name = 'torso';
  torso.position.set(0, 0.26, 0);
  abdomen.add(torso);

  const dorsalSocket = new THREE.Group();
  dorsalSocket.name = 'dorsal_socket';
  dorsalSocket.position.set(0, 0.12, -0.18);
  torso.add(dorsalSocket);

  const neck = new THREE.Group();
  neck.name = 'neck';
  neck.position.set(0, 0.29, 0);
  torso.add(neck);

  const head = new THREE.Group();
  head.name = 'head';
  head.position.set(0, 0.18, 0);
  neck.add(head);

  const leftShoulder = new THREE.Group();
  leftShoulder.name = 'leftShoulder';
  leftShoulder.position.set(-0.4, 0.13, 0);
  torso.add(leftShoulder);

  const leftElbow = new THREE.Group();
  leftElbow.name = 'leftElbow';
  leftElbow.position.set(0, -0.32, 0);
  leftShoulder.add(leftElbow);

  const leftHand = new THREE.Group();
  leftHand.name = 'leftHand';
  leftHand.position.set(0, -0.3, 0);
  leftElbow.add(leftHand);

  const rightShoulder = new THREE.Group();
  rightShoulder.name = 'rightShoulder';
  rightShoulder.position.set(0.4, 0.13, 0);
  torso.add(rightShoulder);

  const rightElbow = new THREE.Group();
  rightElbow.name = 'rightElbow';
  rightElbow.position.set(0, -0.32, 0);
  rightShoulder.add(rightElbow);

  const rightHand = new THREE.Group();
  rightHand.name = 'rightHand';
  rightHand.position.set(0, -0.3, 0);
  rightElbow.add(rightHand);

  const palmSocket = new THREE.Group();
  palmSocket.name = 'palm_socket_r';
  palmSocket.position.set(0, -0.06, 0.18);
  rightHand.add(palmSocket);

  const leftHip = new THREE.Group();
  leftHip.name = 'leftHip';
  leftHip.position.set(-0.17, -0.08, 0);
  pelvis.add(leftHip);

  const leftKnee = new THREE.Group();
  leftKnee.name = 'leftKnee';
  leftKnee.position.set(0, -0.38, 0);
  leftHip.add(leftKnee);

  const rightHip = new THREE.Group();
  rightHip.name = 'rightHip';
  rightHip.position.set(0.17, -0.08, 0);
  pelvis.add(rightHip);

  const rightKnee = new THREE.Group();
  rightKnee.name = 'rightKnee';
  rightKnee.position.set(0, -0.38, 0);
  rightHip.add(rightKnee);

  const chestShard = new THREE.Mesh(new THREE.OctahedronGeometry(0.16, 0), suitMat);
  chestShard.name = 'suit_chest';
  chestShard.position.set(0, 0.08, 0.13);
  torso.add(chestShard);

  const coreMesh = new THREE.Mesh(new THREE.IcosahedronGeometry(0.175, 1), trimMat);
  coreMesh.name = 'core_gyro';
  torso.add(coreMesh);

  const visor = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.04, 0.06), trimMat);
  visor.name = 'visor_brow';
  head.add(visor);

  const headHalo = new THREE.Mesh(new THREE.TorusGeometry(0.35, 0.02, 8, 24), trimMat);
  headHalo.name = 'halo_crown';
  head.add(headHalo);

  const makeQuatTrack = (nodeName, rx0, rx1, ry0 = 0, ry1 = 0) => {
    const q0 = new THREE.Quaternion().setFromEuler(new THREE.Euler(rx0, ry0, 0));
    const q1 = new THREE.Quaternion().setFromEuler(new THREE.Euler(rx1, ry1, 0));
    return new THREE.QuaternionKeyframeTrack(
      `${nodeName}.quaternion`,
      [0, 0.4],
      [q0.x, q0.y, q0.z, q0.w, q1.x, q1.y, q1.z, q1.w]
    );
  };

  const clipTracks = {
    idle_hover: [makeQuatTrack('torso', 0.01, 0.04)],
    sprint_lean: [
      makeQuatTrack('leftHip', 0.45, -0.45),
      makeQuatTrack('rightHip', -0.45, 0.45),
      makeQuatTrack('leftKnee', 0.35, 0.65)
    ],
    throw_windup: [
      makeQuatTrack('torso', 0, 0, -0.35, -0.45),
      makeQuatTrack('rightShoulder', 0.3, 0.45)
    ],
    throw_release: [makeQuatTrack('rightShoulder', -1.0, -1.2)],
    catch_recoil: [makeQuatTrack('rightShoulder', -0.7, -0.5)],
    parry_brace: [
      makeQuatTrack('leftShoulder', -0.75, -0.75),
      makeQuatTrack('rightShoulder', -0.85, -0.85)
    ],
    dash_burst: [makeQuatTrack('torso', 0.28, 0.35)],
    aerial_tuck: [makeQuatTrack('leftHip', 0.32, 0.38)]
  };

  const animations = REQUIRED_CONSTRUCT_CLIPS.map(
    (clipName) => new THREE.AnimationClip(clipName, 0.4, clipTracks[clipName])
  );

  return { scene: root, animations };
}

clearConstructAssetCache();
await loadConstructAsset('player', {
  loader: {
    async loadAsync() {
      return buildCachedPlayerGlbFixture();
    }
  }
});

// Synchronous makeProgram() must pick up cached GLB construct bundle
const glbPlayerRig = makeProgram(0x00f3ff, { archetype: 'player' });
assert.strictEqual(glbPlayerRig.userData.isGLB, true, 'Cached construct must instantiate GLB rig');
assert.strictEqual(glbPlayerRig.userData.part, 'chassis_root');
assert.strictEqual(glbPlayerRig.userData.suitMaterial.flatShading, true);
assert.ok(glbPlayerRig.userData.litMaterial.emissiveIntensity >= 1.5);
assert.ok(glbPlayerRig.userData.coreMesh, 'GLB rig must expose coreMesh');
assert.ok(glbPlayerRig.userData.headHalo, 'GLB rig must expose headHalo');
assert.ok(glbPlayerRig.userData.dorsalWingPivot instanceof THREE.Group);
assert.strictEqual(glbPlayerRig.userData.backDisc.userData.part, 'chassis_back_disc');
assert.strictEqual(glbPlayerRig.userData.backDisc.parent, glbPlayerRig.userData.joints.rightHand);
assert.ok(glbPlayerRig.userData.mixer instanceof THREE.AnimationMixer, 'GLB rig must attach AnimationMixer');
assert.strictEqual(glbPlayerRig.userData.activeActionName, 'idle_hover', 'Initial clip must start on idle_hover');

// forceProcedural bypasses cached GLB cleanly
const forcedProcRig = makeProgram(0x00f3ff, { archetype: 'player', forceProcedural: true });
assert.strictEqual(forcedProcRig.userData.isGLB, undefined, 'forceProcedural must return procedural rig');

// Drive AnimationMixer through locomotion, parry, aerial, windup, release, catch, and dash
const glbShard = glbPlayerRig.userData.floatingShards[0];
const glbShardBaseY = glbShard.userData.floatBasePos.y;

animateProgramKinematics(glbPlayerRig, 0.14, {
  speed: 9.5,
  grounded: true,
  vy: 0,
  blocking: false,
  time: 0.4,
  hasDisc: true
});
assert.strictEqual(glbPlayerRig.userData.activeActionName, 'sprint_lean');
assert.notStrictEqual(glbPlayerRig.userData.leftHip.rotation.x, 0, 'AnimationMixer sprint_lean must drive leftHip');
assert.notStrictEqual(glbPlayerRig.userData.rightHip.rotation.x, 0, 'AnimationMixer sprint_lean must drive rightHip');
assert.notStrictEqual(glbShard.position.y, glbShardBaseY, 'Layered shard micro-hover must continue on GLB rig');
assert.notStrictEqual(glbPlayerRig.userData.coreMesh.scale.x, 1, 'Layered coreMesh pulse must continue on GLB rig');

animateProgramKinematics(glbPlayerRig, 0.1, {
  speed: 0,
  grounded: true,
  vy: 0,
  blocking: true,
  time: 0.7,
  hasDisc: true
});
assert.strictEqual(glbPlayerRig.userData.activeActionName, 'parry_brace');
assert.ok(glbPlayerRig.userData.backDisc.rotation.x > 1.0, 'Hover-Palm disc must tilt into shield parry barrier');

animateProgramKinematics(glbPlayerRig, 0.15, {
  speed: 2,
  grounded: false,
  vy: 5,
  blocking: false,
  time: 1.0,
  hasDisc: true
});
assert.strictEqual(glbPlayerRig.userData.activeActionName, 'aerial_tuck');

animateProgramKinematics(glbPlayerRig, 0.15, {
  speed: 0,
  grounded: true,
  vy: 0,
  blocking: false,
  chargingThrow: true,
  throwCharge: 0.85,
  time: 1.3,
  hasDisc: true
});
assert.strictEqual(glbPlayerRig.userData.activeActionName, 'throw_windup');

animateProgramKinematics(glbPlayerRig, 0.05, {
  speed: 0,
  grounded: true,
  vy: 0,
  blocking: false,
  chargingThrow: false,
  throwCharge: 0,
  time: 1.4,
  hasDisc: false
});
assert.strictEqual(glbPlayerRig.userData.activeActionName, 'throw_release');

animateProgramKinematics(glbPlayerRig, 0.05, {
  speed: 0,
  grounded: true,
  vy: 0,
  blocking: false,
  time: 1.8,
  hasDisc: true
});
assert.strictEqual(glbPlayerRig.userData.activeActionName, 'catch_recoil');

animateProgramKinematics(glbPlayerRig, 0.3, {
  speed: 12,
  grounded: true,
  dashing: true,
  time: 2.2,
  hasDisc: true
});
assert.strictEqual(glbPlayerRig.userData.activeActionName, 'dash_burst');

clearConstructAssetCache();
console.log('✓ Group 5: Cached GLB rig instantiation and AnimationMixer combat blending verified.');

console.log('\n=============================================================');
console.log('ALL MAGNETIC CONSTRUCT RIG & KINEMATICS TESTS PASSED (100%)');
console.log('=============================================================');
