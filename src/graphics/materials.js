import * as THREE from '../../vendor/three.module.js';
import { config } from '../core/config.js';

// Shared environment materials
export const wallMat = new THREE.MeshStandardMaterial({ color: 0x04141c, roughness: .4, metalness: .9 });
export const glowMat = new THREE.MeshBasicMaterial({ color: config.CYAN });
export const tileMatIntact = new THREE.MeshStandardMaterial({ color: 0x07202c, roughness: .28, metalness: .8 });
export const tileEdgeMatIntact = new THREE.LineBasicMaterial({ color: 0x187588, transparent: true, opacity: .75, depthWrite: false });

export function discGeo(radius = config.DISC_R, tube = 0.085) {
  return new THREE.TorusGeometry(radius, tube, 8, 40);
}

export function makeDisc(color) {
  const g = new THREE.Group();
  g.userData.part = 'disc_root';

  const baseColor = new THREE.Color(color);
  const outerMat = new THREE.MeshStandardMaterial({
    color: baseColor.clone(),
    emissive: baseColor.clone(),
    emissiveIntensity: 2.4,
    roughness: 0.16,
    metalness: 0.1
  });
  const outer = new THREE.Mesh(discGeo(), outerMat);
  outer.userData.part = 'disc_outer';

  const face = new THREE.Mesh(
    new THREE.CircleGeometry(config.DISC_R - .06, 32),
    new THREE.MeshBasicMaterial({ color: baseColor.clone(), transparent: true, opacity: .24, side: THREE.DoubleSide })
  );
  face.userData.part = 'disc_face';

  const hubColor = new THREE.Color(config.WHITE);
  const hub = new THREE.Mesh(
    new THREE.TorusGeometry(.2, .05, 6, 20),
    new THREE.MeshStandardMaterial({
      color: hubColor,
      emissive: hubColor.clone(),
      emissiveIntensity: 2.2,
      roughness: 0.15,
      metalness: 0.1
    })
  );
  hub.userData.part = 'disc_hub';

  g.add(outer, face, hub);
  const light = new THREE.PointLight(color, 2.4, 10);
  light.userData.part = 'disc_light';
  g.add(light);
  g.userData.outerMesh = outer;
  g.userData.faceMesh = face;
  g.userData.hubMesh = hub;
  g.userData.pointLight = light;
  return g;
}

/**
 * Resolves the Magnetic Construct archetype from explicit or legacy caller options.
 * @param {object} options
 * @returns {'player'|'drone'|'sentinel'}
 */
export function resolveConstructArchetype(options = {}) {
  const explicit = options.archetype;
  if (explicit === 'player' || explicit === 'drone' || explicit === 'sentinel') {
    return explicit;
  }
  if (options.isBoss || options.isArbiter) {
    return 'sentinel';
  }
  if (options.isPlayer || options.helmetType === 'flynn') {
    return 'player';
  }
  return 'drone';
}

/**
 * Adds a flat-shaded faceted armor shard with hairline glowing edge trim and optional float metadata.
 */
function addFacetedShard(parent, geometry, suitMat, edgeMat, opts = {}) {
  const mesh = new THREE.Mesh(geometry, suitMat);
  mesh.castShadow = opts.castShadow !== false;
  mesh.userData.part = opts.part || 'chassis_suit';

  if (opts.pos) mesh.position.set(opts.pos[0], opts.pos[1], opts.pos[2]);
  if (opts.rot) mesh.rotation.set(opts.rot[0], opts.rot[1], opts.rot[2]);
  if (opts.scale) mesh.scale.set(opts.scale[0], opts.scale[1], opts.scale[2]);

  if (opts.floatPhase !== undefined) {
    mesh.userData.floatBasePos = mesh.position.clone();
    mesh.userData.floatPhase = opts.floatPhase;
    mesh.userData.floatAmp = opts.floatAmp ?? 0.014;
    mesh.userData.floatAxis = opts.floatAxis || 'y';
  }

  if (opts.withEdges !== false && edgeMat) {
    const edges = new THREE.LineSegments(new THREE.EdgesGeometry(geometry, opts.edgeThreshold ?? 22), edgeMat);
    edges.userData.part = 'chassis_trim';
    edges.userData.isEdgeTrim = true;
    mesh.add(edges);
  }

  parent.add(mesh);
  return mesh;
}

/**
 * Builds shared detached construct limbs (shoulders, arms, hands, hips, knees, hover points).
 */
function buildConstructLimbs(torso, pelvis, suit, lit, edgeMat, archetype, floatingShards) {
  const isSentinel = archetype === 'sentinel';
  const isDrone = archetype === 'drone';
  const limbScale = isSentinel ? 1.08 : (isDrone ? 0.92 : 1.0);

  let leftShoulder, rightShoulder, leftElbow, rightElbow, leftHand, rightHand;
  for (const s of [-1, 1]) {
    const isLeft = s === -1;
    const shoulder = new THREE.Group();
    shoulder.position.set(s * (isSentinel ? 0.44 : 0.40), isSentinel ? 0.16 : 0.13, 0);
    shoulder.userData.name = isLeft ? 'leftShoulder' : 'rightShoulder';
    torso.add(shoulder);

    if (isLeft) leftShoulder = shoulder;
    else rightShoulder = shoulder;

    // Floating angular shoulder pauldron shard
    const pauldronGeo = isSentinel
      ? new THREE.ConeGeometry(0.20, 0.34, 4)
      : new THREE.OctahedronGeometry(0.15 * limbScale, 0);
    const pauldron = addFacetedShard(shoulder, pauldronGeo, suit, edgeMat, {
      pos: [s * (isSentinel ? 0.05 : 0.03), 0.04, 0],
      rot: [0, isSentinel ? Math.PI * 0.25 : 0.2 * s, -s * (isSentinel ? 0.62 : 0.42)],
      scale: isSentinel ? [1.0, 1.0, 0.78] : [1.15, 0.82, 0.9],
      floatPhase: isLeft ? 0.8 : 2.3,
      floatAmp: 0.012
    });
    floatingShards.push(pauldron);

    // Detached faceted bicep shard
    const upperGeo = new THREE.CylinderGeometry(0.085 * limbScale, 0.062 * limbScale, 0.23, 5);
    const upperArm = addFacetedShard(shoulder, upperGeo, suit, edgeMat, {
      pos: [0, -0.17, 0],
      rot: [0, s * 0.3, 0],
      floatPhase: isLeft ? 1.4 : 2.9,
      floatAmp: 0.009
    });
    floatingShards.push(upperArm);

    // Elbow joint pivot
    const elbow = new THREE.Group();
    elbow.position.set(0, -0.32, 0);
    elbow.userData.name = isLeft ? 'leftElbow' : 'rightElbow';
    shoulder.add(elbow);

    if (isLeft) leftElbow = elbow;
    else rightElbow = elbow;

    // Subtle glowing elbow magnetic node
    const elbowNode = new THREE.Mesh(new THREE.OctahedronGeometry(0.045 * limbScale, 0), lit);
    elbowNode.userData.part = 'chassis_trim';
    elbow.add(elbowNode);

    // Detached faceted forearm shard
    const forearmGeo = new THREE.CylinderGeometry(0.08 * limbScale, 0.052 * limbScale, 0.24, 5);
    const forearm = addFacetedShard(elbow, forearmGeo, suit, edgeMat, {
      pos: [0, -0.15, 0],
      rot: [0, s * 0.25, 0],
      floatPhase: isLeft ? 1.9 : 3.4,
      floatAmp: 0.008
    });
    floatingShards.push(forearm);

    // Right wrist magnetic anchor cuff (strictly right arm only, bare left wrist)
    if (!isLeft) {
      const wristCuff = new THREE.Mesh(new THREE.TorusGeometry(0.072 * limbScale, 0.013, 6, 18), lit);
      wristCuff.rotation.x = Math.PI / 2;
      wristCuff.position.set(0, -0.25, 0);
      wristCuff.userData.part = 'chassis_trim';
      elbow.add(wristCuff);
    }

    // Hand joint pivot with open sculpted palm shard
    const hand = new THREE.Group();
    hand.position.set(0, -0.30, 0);
    hand.userData.name = isLeft ? 'leftHand' : 'rightHand';
    elbow.add(hand);

    addFacetedShard(hand, new THREE.BoxGeometry(0.085, 0.09, 0.036), suit, edgeMat, {
      pos: [0, -0.02, 0]
    });

    if (isLeft) leftHand = hand;
    else rightHand = hand;
  }

  let leftHip, rightHip, leftKnee, rightKnee;
  for (const s of [-1, 1]) {
    const isLeft = s === -1;
    const hip = new THREE.Group();
    hip.position.set(s * (isSentinel ? 0.19 : 0.17), -0.08, 0);
    hip.userData.name = isLeft ? 'leftHip' : 'rightHip';
    pelvis.add(hip);

    if (isLeft) leftHip = hip;
    else rightHip = hip;

    // Detached faceted thigh shard
    const thighGeo = new THREE.CylinderGeometry(0.12 * limbScale, 0.075 * limbScale, 0.30, 5);
    const thigh = addFacetedShard(hip, thighGeo, suit, edgeMat, {
      pos: [0, -0.18, 0],
      rot: [0, s * 0.2, 0],
      floatPhase: isLeft ? 0.4 : 2.1,
      floatAmp: 0.010
    });
    floatingShards.push(thigh);

    // Knee joint pivot
    const knee = new THREE.Group();
    knee.position.set(0, -0.38, 0);
    knee.userData.name = isLeft ? 'leftKnee' : 'rightKnee';
    hip.add(knee);

    if (isLeft) leftKnee = knee;
    else rightKnee = knee;

    // Faceted knee prism shard
    addFacetedShard(knee, new THREE.OctahedronGeometry(0.072 * limbScale, 0), suit, edgeMat, {
      pos: [0, 0.01, 0.04],
      scale: [0.95, 1.2, 0.9]
    });

    // Tapered floating shin shard
    const shinGeo = new THREE.CylinderGeometry(0.095 * limbScale, 0.036 * limbScale, 0.30, 5);
    addFacetedShard(knee, shinGeo, suit, edgeMat, {
      pos: [0, -0.19, 0],
      rot: [0, s * 0.25, 0]
    });

    // Glowing tapered hover-point tip (replaces traditional boots)
    const hoverTip = new THREE.Mesh(new THREE.ConeGeometry(0.046 * limbScale, 0.15, 5), lit);
    hoverTip.position.set(0, -0.43, 0);
    hoverTip.rotation.x = Math.PI;
    hoverTip.userData.part = 'chassis_trim';
    hoverTip.userData.isHoverTip = true;
    knee.add(hoverTip);
  }

  return {
    leftShoulder,
    rightShoulder,
    leftElbow,
    rightElbow,
    leftHand,
    rightHand,
    leftHip,
    rightHip,
    leftKnee,
    rightKnee
  };
}

export function makeProgram(color, options = {}) {
  const archetype = resolveConstructArchetype(options);
  const isPlayer = archetype === 'player';

  const g = new THREE.Group();
  g.userData.part = 'chassis_root';
  g.userData.isPlayer = isPlayer;
  g.userData.archetype = archetype;
  g.userData.helmetType = options.helmetType || archetype;

  const baseColor = new THREE.Color(color);
  const suitBaseHex = archetype === 'player' ? 0x1e2631 : 0x1a1e26;
  const trimBase = archetype === 'player'
    ? baseColor.clone().multiplyScalar(0.55)
    : new THREE.Color(archetype === 'sentinel' ? color : 0xffb347).multiplyScalar(0.6);

  // Dedicated PBR + HDR emissive materials isolated per rig
  const suit = new THREE.MeshStandardMaterial({
    color: suitBaseHex,
    roughness: 0.38,
    metalness: 0.78,
    envMapIntensity: 1.45,
    flatShading: true
  });
  const lit = new THREE.MeshStandardMaterial({
    color: baseColor.clone(),
    emissive: baseColor.clone(),
    emissiveIntensity: archetype === 'sentinel' ? 2.5 : 2.1,
    roughness: 0.18,
    metalness: 0.05
  });
  const edgeMat = new THREE.LineBasicMaterial({
    color: trimBase,
    transparent: true,
    opacity: 0.55
  });

  g.userData.suitMaterial = suit;
  g.userData.litMaterial = lit;
  g.userData.edgeMaterial = edgeMat;

  const floatingShards = [];

  // 1. Pelvis Base (world y = 1.05)
  const pelvis = new THREE.Group();
  pelvis.position.y = 1.05;
  pelvis.userData.name = 'pelvis';
  g.add(pelvis);

  const pelvisGeo = archetype === 'sentinel'
    ? new THREE.OctahedronGeometry(0.24, 0)
    : new THREE.CylinderGeometry(0.21, 0.12, 0.22, 6);
  addFacetedShard(pelvis, pelvisGeo, suit, edgeMat, {
    scale: archetype === 'sentinel' ? [1.05, 0.9, 0.82] : [1.05, 1.0, 0.85]
  });

  // Subtle glowing hip core accent
  const pelvisGlow = new THREE.Mesh(new THREE.OctahedronGeometry(0.08, 0), lit);
  pelvisGlow.position.set(0, 0.05, 0.11);
  pelvisGlow.scale.set(1.3, 0.45, 0.5);
  pelvisGlow.userData.part = 'chassis_trim';
  pelvis.add(pelvisGlow);

  // 2. Abdomen / Magnetic Waist Gap
  const abdomen = new THREE.Group();
  abdomen.position.y = 0.21;
  abdomen.userData.name = 'abdomen';
  pelvis.add(abdomen);

  const abdomenShard = addFacetedShard(abdomen, new THREE.CylinderGeometry(0.16, 0.12, 0.16, 6), suit, edgeMat, {
    scale: [1.1, 1.0, 0.8],
    floatPhase: 0.5,
    floatAmp: 0.010
  });
  floatingShards.push(abdomenShard);

  // 3. Upper Torso & Glowing Central Core
  const torso = new THREE.Group();
  torso.position.y = 0.26;
  torso.userData.name = 'torso';
  abdomen.add(torso);

  let coreMesh;
  if (archetype === 'player') {
    // Radiant cyan spherical gyro-core visible from front and rear gaps
    coreMesh = new THREE.Mesh(new THREE.IcosahedronGeometry(0.175, 1), lit);
    coreMesh.position.set(0, 0.03, 0.01);
    coreMesh.userData.part = 'chassis_trim';
    torso.add(coreMesh);

    // 4 floating faceted chest & dorsal armor shards around core
    for (const s of [-1, 1]) {
      const chestShard = addFacetedShard(torso, new THREE.OctahedronGeometry(0.16, 0), suit, edgeMat, {
        pos: [s * 0.17, 0.08, 0.13],
        rot: [0.22, s * 0.35, s * 0.25],
        scale: [1.1, 1.15, 0.58],
        floatPhase: s < 0 ? 0.2 : 1.7,
        floatAmp: 0.014
      });
      floatingShards.push(chestShard);

      const backShard = addFacetedShard(torso, new THREE.OctahedronGeometry(0.15, 0), suit, edgeMat, {
        pos: [s * 0.16, 0.09, -0.14],
        rot: [-0.24, -s * 0.3, -s * 0.2],
        scale: [1.0, 1.2, 0.52],
        floatPhase: s < 0 ? 1.1 : 2.6,
        floatAmp: 0.014
      });
      floatingShards.push(backShard);
    }

    // Clavicle upper bridge shards
    const upperCollar = addFacetedShard(torso, new THREE.CylinderGeometry(0.20, 0.14, 0.10, 6), suit, edgeMat, {
      pos: [0, 0.22, -0.02],
      scale: [1.2, 1.0, 0.85],
      floatPhase: 0.9,
      floatAmp: 0.008
    });
    floatingShards.push(upperCollar);
  } else if (archetype === 'drone') {
    // Chevron Drone: sharp inverted-triangle obsidian torso with amber core & rib slits
    const chevronChest = addFacetedShard(torso, new THREE.CylinderGeometry(0.38, 0.14, 0.44, 3), suit, edgeMat, {
      pos: [0, 0.08, 0],
      rot: [0, Math.PI, 0],
      scale: [1.15, 1.0, 0.65],
      floatPhase: 0.3,
      floatAmp: 0.012
    });
    floatingShards.push(chevronChest);

    // Inner glowing chest core sphere
    coreMesh = new THREE.Mesh(new THREE.OctahedronGeometry(0.14, 0), lit);
    coreMesh.position.set(0, 0.08, 0.04);
    coreMesh.userData.part = 'chassis_trim';
    torso.add(coreMesh);

    // 2 stepped horizontal rib-glow vents below the V-core
    for (let r = 0; r < 2; r++) {
      const rib = new THREE.Mesh(new THREE.BoxGeometry(0.18 - r * 0.04, 0.025, 0.04), lit);
      rib.position.set(0, -0.02 - r * 0.055, 0.14 - r * 0.02);
      rib.userData.part = 'chassis_trim';
      torso.add(rib);
    }
  } else {
    // Sentinel Boss: blazing core framed by sharp triangular-prism shards (NO concentric rings!)
    coreMesh = new THREE.Mesh(new THREE.OctahedronGeometry(0.22, 1), lit);
    coreMesh.position.set(0, 0.05, 0.02);
    coreMesh.userData.part = 'chassis_trim';
    torso.add(coreMesh);

    const coreHalo = new THREE.Mesh(new THREE.OctahedronGeometry(0.27, 0), lit);
    coreHalo.position.set(0, 0.05, 0.02);
    coreHalo.rotation.set(0.4, 0.7, 0.2);
    coreHalo.userData.part = 'chassis_trim';
    torso.add(coreHalo);

    for (const s of [-1, 1]) {
      // Front upper & lower triangular prism armor wedges
      const upperTri = addFacetedShard(torso, new THREE.ConeGeometry(0.17, 0.30, 4), suit, edgeMat, {
        pos: [s * 0.21, 0.14, 0.14],
        rot: [0.3, s * 0.4, s * 2.3],
        floatPhase: s < 0 ? 0.5 : 2.0,
        floatAmp: 0.016
      });
      floatingShards.push(upperTri);

      const lowerTri = addFacetedShard(torso, new THREE.ConeGeometry(0.15, 0.26, 4), suit, edgeMat, {
        pos: [s * 0.17, -0.09, 0.13],
        rot: [-0.3, s * 0.35, s * 0.6],
        floatPhase: s < 0 ? 1.3 : 2.8,
        floatAmp: 0.014
      });
      floatingShards.push(lowerTri);

      // Clean sculpted back armor shards (strictly NO concentric rings behind boss)
      const dorsalTri = addFacetedShard(torso, new THREE.ConeGeometry(0.16, 0.32, 4), suit, edgeMat, {
        pos: [s * 0.17, 0.09, -0.17],
        rot: [-0.35, -s * 0.3, -s * 2.4],
        floatPhase: s < 0 ? 0.8 : 2.4,
        floatAmp: 0.015
      });
      floatingShards.push(dorsalTri);
    }
  }

  g.userData.coreMesh = coreMesh;

  // Reserved empty dorsal wing pivot for future Armory wing cosmetics (wingless by default)
  const dorsalWingPivot = new THREE.Group();
  dorsalWingPivot.position.set(0, 0.12, -0.18);
  dorsalWingPivot.userData.name = 'dorsalWingPivot';
  torso.add(dorsalWingPivot);
  g.userData.dorsalWingPivot = dorsalWingPivot;

  // 4. Invisible Neck Pivot (preserves hierarchy while letting head float over magnetic gap)
  const neck = new THREE.Group();
  neck.position.y = 0.29;
  neck.userData.name = 'neck';
  torso.add(neck);

  // 5. Head & Role-Differentiated Optics (exactly 1 mesh tagged 'chassis_visor')
  const head = new THREE.Group();
  head.position.y = archetype === 'drone' ? 0.02 : 0.18;
  head.userData.name = 'head';
  neck.add(head);

  if (archetype === 'player') {
    const headPrism = addFacetedShard(head, new THREE.IcosahedronGeometry(0.22, 0), suit, edgeMat, {
      scale: [0.92, 1.08, 0.96],
      floatPhase: 0.6,
      floatAmp: 0.012
    });
    floatingShards.push(headPrism);

    // Forward-facing prism optic brow (single chassis_visor mesh)
    const visor = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.042, 0.06), lit);
    visor.position.set(0, 0.03, 0.20);
    visor.userData.part = 'chassis_visor';
    head.add(visor);

    // Tilted glowing halo ring encircling the floating head
    const headHalo = new THREE.Mesh(new THREE.TorusGeometry(0.35, 0.022, 8, 28), lit);
    headHalo.position.set(0, 0.09, 0);
    headHalo.rotation.set(Math.PI / 2 - 0.34, 0.14, 0.22);
    headHalo.userData.part = 'chassis_trim';
    head.add(headHalo);
    g.userData.headHalo = headHalo;
  } else if (archetype === 'drone') {
    // Headless Chevron Drone: glowing V-core visor sits at upper chest front
    const vShape = new THREE.Shape();
    vShape.moveTo(-0.14, 0.09);
    vShape.lineTo(0.14, 0.09);
    vShape.lineTo(0.0, -0.10);
    vShape.closePath();
    const vVisor = new THREE.Mesh(new THREE.ShapeGeometry(vShape), lit);
    vVisor.position.set(0, -0.14, 0.20);
    vVisor.userData.part = 'chassis_visor';
    head.add(vVisor);
  } else {
    // Sentinel Boss: sleek hornless Monolith Prism Head + single vertical glowing visor slit
    const monolithHead = addFacetedShard(head, new THREE.CylinderGeometry(0.12, 0.20, 0.48, 6), suit, edgeMat, {
      pos: [0, 0.07, 0],
      scale: [0.95, 1.0, 0.88],
      floatPhase: 0.4,
      floatAmp: 0.012
    });
    floatingShards.push(monolithHead);

    const visorSlit = new THREE.Mesh(new THREE.BoxGeometry(0.048, 0.24, 0.05), lit);
    visorSlit.position.set(0, 0.05, 0.175);
    visorSlit.userData.part = 'chassis_visor';
    head.add(visorSlit);
  }

  // 6 & 7. Detached Construct Limbs & Tapered Hover Points
  const limbs = buildConstructLimbs(torso, pelvis, suit, lit, edgeMat, archetype, floatingShards);

  // Initialize resting Hover-Palm arm posture on frame 0
  limbs.rightShoulder.rotation.set(-0.46, -0.06, 0.36);
  limbs.rightElbow.rotation.set(-1.16, 0, 0);
  limbs.rightHand.rotation.set(0.05, 0, 0);

  // 8. Hover-Palm Telekinetic Kinetic Disc (parented to rightHand, floating above upturned open palm)
  const palmDiscRadius = config.DISC_R * 0.46;
  const disc = new THREE.Mesh(discGeo(palmDiscRadius, 0.042), lit.clone());
  disc.position.set(0, -0.06, 0.18);
  disc.rotation.set(-0.04, 0, 0);
  disc.userData.part = 'chassis_back_disc';

  const discFace = new THREE.Mesh(
    new THREE.CircleGeometry(palmDiscRadius - 0.035, 24),
    new THREE.MeshBasicMaterial({ color: baseColor.clone(), transparent: true, opacity: 0.28, side: THREE.DoubleSide })
  );
  discFace.userData.part = 'chassis_back_disc_face';
  disc.add(discFace);

  limbs.rightHand.add(disc);
  g.userData.backDisc = disc;

  // 9. Halo PointLight
  const halo = new THREE.PointLight(color, isPlayer ? 1.6 : 1.9, 9);
  halo.position.y = 1.5;
  halo.userData.part = 'chassis_halo';
  g.add(halo);
  g.userData.halo = halo;

  // 10. Cache joint handles & animation state on rig userData
  g.userData.floatingShards = floatingShards;
  g.userData.joints = {
    pelvis,
    abdomen,
    torso,
    neck,
    head,
    ...limbs
  };
  g.userData.pelvis = pelvis;
  g.userData.abdomen = abdomen;
  g.userData.torso = torso;
  g.userData.neck = neck;
  g.userData.head = head;
  g.userData.leftShoulder = limbs.leftShoulder;
  g.userData.rightShoulder = limbs.rightShoulder;
  g.userData.leftElbow = limbs.leftElbow;
  g.userData.rightElbow = limbs.rightElbow;
  g.userData.leftHand = limbs.leftHand;
  g.userData.rightHand = limbs.rightHand;
  g.userData.leftHip = limbs.leftHip;
  g.userData.rightHip = limbs.rightHip;
  g.userData.leftKnee = limbs.leftKnee;
  g.userData.rightKnee = limbs.rightKnee;

  return g;
}

export function animateProgramKinematics(rig, dt, params = {}) {
  if (!rig || !rig.userData || !rig.userData.joints) return;
  const {
    speed = 0,
    vy = 0,
    grounded = true,
    blocking = false,
    hurt = 0,
    time = 0,
    hasDisc = undefined,
    chargingThrow = false,
    throwCharge = 0,
    throwTrigger = false,
    catchTrigger = false
  } = params;

  const {
    pelvis,
    torso,
    head,
    leftShoulder,
    rightShoulder,
    leftElbow,
    rightElbow,
    leftHand,
    rightHand,
    leftHip,
    rightHip,
    leftKnee,
    rightKnee
  } = rig.userData.joints;

  const disc = rig.userData.backDisc;
  const effectiveHasDisc = hasDisc !== undefined ? !!hasDisc : (disc ? disc.visible : true);

  // Track transient telekinetic throw & catch state transitions automatically
  if (!rig.userData._anim) {
    rig.userData._anim = {
      prevHasDisc: effectiveHasDisc,
      throwTimer: 0,
      catchTimer: 0
    };
  }
  const animState = rig.userData._anim;
  if (throwTrigger || (animState.prevHasDisc && !effectiveHasDisc)) {
    animState.throwTimer = 0.28;
    animState.catchTimer = 0;
  } else if (catchTrigger || (!animState.prevHasDisc && effectiveHasDisc)) {
    animState.catchTimer = 0.25;
  }
  animState.prevHasDisc = effectiveHasDisc;
  animState.throwTimer = Math.max(0, animState.throwTimer - dt);
  animState.catchTimer = Math.max(0, animState.catchTimer - dt);

  const charge = THREE.MathUtils.clamp(throwCharge || 0, 0, 1);
  const spinRate = chargingThrow ? (6.5 + charge * 12.0) : 4.2;
  rig.userData._discSpin = ((rig.userData._discSpin || 0) + dt * spinRate) % (Math.PI * 2);
  const spin = rig.userData._discSpin;

  // 0. Floating Shard Micro-Hover & Central Core Pulse
  const shards = rig.userData.floatingShards;
  if (shards && shards.length > 0) {
    const hoverSpeed = 2.6;
    for (let i = 0; i < shards.length; i++) {
      const shard = shards[i];
      if (shard.userData.floatBasePos) {
        const amp = shard.userData.floatAmp || 0.012;
        shard.position.y = shard.userData.floatBasePos.y + Math.sin(time * hoverSpeed + (shard.userData.floatPhase || 0)) * amp;
      }
    }
  }
  if (rig.userData.coreMesh) {
    const corePulse = 1.0 + Math.sin(time * (chargingThrow ? 10 : 3.2)) * (chargingThrow ? 0.12 : 0.045) + charge * 0.16;
    rig.userData.coreMesh.scale.setScalar(corePulse);
  }
  if (rig.userData.litMaterial && 'emissiveIntensity' in rig.userData.litMaterial) {
    const baseEmissive = rig.userData.archetype === 'sentinel' ? 2.7 : 2.3;
    rig.userData.litMaterial.emissiveIntensity = baseEmissive + (chargingThrow ? charge * 1.4 : Math.sin(time * 3.2) * 0.2);
  }
  if (rig.userData.headHalo) {
    rig.userData.headHalo.rotation.z = 0.22 + Math.sin(time * 1.4) * 0.06;
  }

  let targetTorsoY = 0;
  let targetTorsoX = 0;
  let targetRightHandX = 0.15;
  let targetRightHandZ = 0;

  // 1. Locomotion strides (walking vs running)
  if (grounded && speed > 0.4) {
    const isRunning = speed > 6.0;
    const isWalking = !isRunning;

    const strideRate = isWalking
      ? Math.max(4.2, speed * 1.35)
      : Math.min(speed * 1.15 + 2.5, 13.5);
    rig.userData._runCycle = (rig.userData._runCycle || 0) + dt * strideRate;
    const cycle = rig.userData._runCycle;

    const strideAmp = isWalking
      ? (0.28 + 0.12 * Math.min(speed / 6.0, 1.0))
      : Math.min(speed / 9.0, 1.0) * 0.65;

    const phiL = cycle;
    const phiR = cycle + Math.PI;

    leftHip.rotation.x = Math.cos(phiL) * strideAmp;
    rightHip.rotation.x = Math.cos(phiR) * strideAmp;
    leftHip.rotation.y = -Math.sin(phiL) * (isWalking ? 0.03 : 0.05);
    rightHip.rotation.y = -Math.sin(phiR) * (isWalking ? 0.03 : 0.05);
    leftHip.rotation.z = -0.03;
    rightHip.rotation.z = 0.03;

    const swingFlexL = Math.max(0, -Math.sin(phiL - 0.25));
    const swingFlexR = Math.max(0, -Math.sin(phiR - 0.25));
    leftKnee.rotation.x = swingFlexL * (isWalking ? 0.85 : 1.35) * strideAmp + 0.05;
    rightKnee.rotation.x = swingFlexR * (isWalking ? 0.85 : 1.35) * strideAmp + 0.05;

    pelvis.position.y = 1.08 - Math.abs(Math.sin(cycle)) * (isWalking ? 0.025 : 0.05);
    pelvis.rotation.z = Math.sin(cycle) * (isWalking ? 0.03 : 0.055);
    pelvis.rotation.y = -Math.cos(cycle) * (isWalking ? 0.04 : 0.07);

    targetTorsoY = Math.cos(cycle) * (isWalking ? 0.06 : 0.11);
    targetTorsoX = isWalking ? 0.03 : (0.04 + 0.09 * Math.min(speed / 10, 1));
    torso.rotation.z = -Math.sin(cycle) * (isWalking ? 0.02 : 0.035);

    head.rotation.x = isWalking ? 0 : -0.04;
    head.rotation.y = -targetTorsoY * 0.6;

    if (!blocking) {
      leftShoulder.rotation.x = -Math.cos(cycle) * (isWalking ? 0.42 : 0.82) * strideAmp;
      leftShoulder.rotation.y = THREE.MathUtils.lerp(leftShoulder.rotation.y, 0, dt * 10);
      leftShoulder.rotation.z = -0.12 - Math.sin(cycle) * 0.03;
      leftElbow.rotation.x = -0.28 - Math.max(0, -Math.cos(cycle)) * (isWalking ? 0.35 : 0.65) * strideAmp;

      if (effectiveHasDisc) {
        // Athletic Hover-Palm forward poise while moving
        rightShoulder.rotation.x = THREE.MathUtils.lerp(rightShoulder.rotation.x, -0.46 + Math.cos(cycle) * 0.08, dt * 10);
        rightShoulder.rotation.y = THREE.MathUtils.lerp(rightShoulder.rotation.y, -0.06, dt * 10);
        rightShoulder.rotation.z = THREE.MathUtils.lerp(rightShoulder.rotation.z, 0.36, dt * 10);
        rightElbow.rotation.x = THREE.MathUtils.lerp(rightElbow.rotation.x, -1.16 + Math.cos(cycle) * 0.06, dt * 10);
        targetRightHandX = 0.05;
      } else {
        rightShoulder.rotation.x = Math.cos(cycle) * (isWalking ? 0.36 : 0.72) * strideAmp;
        rightShoulder.rotation.y = THREE.MathUtils.lerp(rightShoulder.rotation.y, 0, dt * 10);
        rightShoulder.rotation.z = 0.12 + Math.sin(cycle) * 0.03;
        rightElbow.rotation.x = -0.28 - Math.max(0, Math.cos(cycle)) * (isWalking ? 0.25 : 0.50) * strideAmp;
      }
    }
  } else if (grounded) {
    // 2. Idle magnetic hover breathing stance
    const idleCycle = time * 2.3;
    const idleBreath = Math.sin(idleCycle);
    const idleSlow = Math.sin(idleCycle * 0.5);

    leftHip.rotation.x = THREE.MathUtils.lerp(leftHip.rotation.x, 0.06 + idleBreath * 0.008, dt * 6);
    rightHip.rotation.x = THREE.MathUtils.lerp(rightHip.rotation.x, -0.05 - idleBreath * 0.008, dt * 6);
    leftHip.rotation.y = THREE.MathUtils.lerp(leftHip.rotation.y, -0.04, dt * 6);
    rightHip.rotation.y = THREE.MathUtils.lerp(rightHip.rotation.y, 0.04, dt * 6);
    leftHip.rotation.z = THREE.MathUtils.lerp(leftHip.rotation.z, -0.04, dt * 6);
    rightHip.rotation.z = THREE.MathUtils.lerp(rightHip.rotation.z, 0.04, dt * 6);

    leftKnee.rotation.x = THREE.MathUtils.lerp(leftKnee.rotation.x, 0.08 - idleBreath * 0.006, dt * 6);
    rightKnee.rotation.x = THREE.MathUtils.lerp(rightKnee.rotation.x, 0.06 + idleBreath * 0.006, dt * 6);

    pelvis.position.y = THREE.MathUtils.lerp(pelvis.position.y, 1.09 + idleBreath * 0.025, dt * 8);
    pelvis.rotation.z = THREE.MathUtils.lerp(pelvis.rotation.z, idleSlow * 0.015, dt * 4);
    pelvis.rotation.y = THREE.MathUtils.lerp(pelvis.rotation.y, 0.04, dt * 4);

    targetTorsoX = idleBreath * 0.022;
    targetTorsoY = -0.04 + idleSlow * 0.015;
    torso.rotation.z = THREE.MathUtils.lerp(torso.rotation.z, -idleSlow * 0.015, dt * 4);

    head.rotation.x = THREE.MathUtils.lerp(head.rotation.x, -idleBreath * 0.015, dt * 6);
    head.rotation.y = THREE.MathUtils.lerp(head.rotation.y, Math.sin(time * 0.4) * 0.03, dt * 4);

    if (!blocking) {
      leftShoulder.rotation.x = THREE.MathUtils.lerp(leftShoulder.rotation.x, 0.04 + idleBreath * 0.02, dt * 6);
      leftShoulder.rotation.y = THREE.MathUtils.lerp(leftShoulder.rotation.y, 0, dt * 6);
      leftShoulder.rotation.z = THREE.MathUtils.lerp(leftShoulder.rotation.z, -0.14, dt * 6);
      leftElbow.rotation.x = THREE.MathUtils.lerp(leftElbow.rotation.x, -0.32 + idleBreath * 0.015, dt * 6);

      if (effectiveHasDisc) {
        // Hover-Palm Ready Stance: upturned open right palm presenting horizontal spinning disc
        rightShoulder.rotation.x = THREE.MathUtils.lerp(rightShoulder.rotation.x, -0.46 + idleBreath * 0.02, dt * 8);
        rightShoulder.rotation.y = THREE.MathUtils.lerp(rightShoulder.rotation.y, -0.06, dt * 8);
        rightShoulder.rotation.z = THREE.MathUtils.lerp(rightShoulder.rotation.z, 0.36, dt * 8);
        rightElbow.rotation.x = THREE.MathUtils.lerp(rightElbow.rotation.x, -1.16 + idleBreath * 0.015, dt * 8);
        targetRightHandX = 0.05;
      } else {
        rightShoulder.rotation.x = THREE.MathUtils.lerp(rightShoulder.rotation.x, -0.02 + idleBreath * 0.02, dt * 6);
        rightShoulder.rotation.y = THREE.MathUtils.lerp(rightShoulder.rotation.y, 0, dt * 6);
        rightShoulder.rotation.z = THREE.MathUtils.lerp(rightShoulder.rotation.z, 0.14, dt * 6);
        rightElbow.rotation.x = THREE.MathUtils.lerp(rightElbow.rotation.x, -0.28 + idleBreath * 0.015, dt * 6);
      }
    }
  } else {
    // 3. Airborne / Jump: hover-legs trail aerodynamically backwards
    leftHip.rotation.x = THREE.MathUtils.lerp(leftHip.rotation.x, 0.28, dt * 8);
    rightHip.rotation.x = THREE.MathUtils.lerp(rightHip.rotation.x, 0.22, dt * 8);
    leftKnee.rotation.x = THREE.MathUtils.lerp(leftKnee.rotation.x, 0.35, dt * 8);
    rightKnee.rotation.x = THREE.MathUtils.lerp(rightKnee.rotation.x, 0.45, dt * 8);

    pelvis.position.y = THREE.MathUtils.lerp(pelvis.position.y, 1.09, dt * 8);
    pelvis.rotation.set(0, 0, 0);
    targetTorsoX = THREE.MathUtils.clamp(-vy * 0.015, -0.18, 0.18);
    torso.rotation.z = THREE.MathUtils.lerp(torso.rotation.z, 0, dt * 8);

    if (!blocking) {
      leftShoulder.rotation.x = THREE.MathUtils.lerp(leftShoulder.rotation.x, -0.32, dt * 8);
      leftShoulder.rotation.z = THREE.MathUtils.lerp(leftShoulder.rotation.z, -0.32, dt * 8);
      leftElbow.rotation.x = THREE.MathUtils.lerp(leftElbow.rotation.x, -0.35, dt * 8);

      if (effectiveHasDisc) {
        rightShoulder.rotation.x = THREE.MathUtils.lerp(rightShoulder.rotation.x, -0.46, dt * 8);
        rightShoulder.rotation.z = THREE.MathUtils.lerp(rightShoulder.rotation.z, 0.36, dt * 8);
        rightElbow.rotation.x = THREE.MathUtils.lerp(rightElbow.rotation.x, -1.16, dt * 8);
        targetRightHandX = 0.05;
      } else {
        rightShoulder.rotation.x = THREE.MathUtils.lerp(rightShoulder.rotation.x, -0.32, dt * 8);
        rightShoulder.rotation.z = THREE.MathUtils.lerp(rightShoulder.rotation.z, 0.32, dt * 8);
        rightElbow.rotation.x = THREE.MathUtils.lerp(rightElbow.rotation.x, -0.35, dt * 8);
      }
    }
  }

  // 4. Telekinetic Throw Wind-Up, Open-Palm Release, Catch & Parry Brace Overrides
  if (blocking) {
    // Shield Defense Stance: open right palm projects disc forward as energy shield
    leftShoulder.rotation.x = THREE.MathUtils.lerp(leftShoulder.rotation.x, -0.75, dt * 18);
    rightShoulder.rotation.x = THREE.MathUtils.lerp(rightShoulder.rotation.x, -0.88, dt * 18);
    leftShoulder.rotation.y = THREE.MathUtils.lerp(leftShoulder.rotation.y, 0.32, dt * 18);
    rightShoulder.rotation.y = THREE.MathUtils.lerp(rightShoulder.rotation.y, -0.36, dt * 18);
    leftShoulder.rotation.z = THREE.MathUtils.lerp(leftShoulder.rotation.z, 0.18, dt * 18);
    rightShoulder.rotation.z = THREE.MathUtils.lerp(rightShoulder.rotation.z, -0.18, dt * 18);

    leftElbow.rotation.x = THREE.MathUtils.lerp(leftElbow.rotation.x, -0.65, dt * 18);
    rightElbow.rotation.x = THREE.MathUtils.lerp(rightElbow.rotation.x, -0.62, dt * 18);
    targetRightHandX = 0.0;
  } else if (chargingThrow) {
    // Coiled Telekinetic Wind-Up: draw open right palm back while torso coils
    targetTorsoY = THREE.MathUtils.lerp(torso.rotation.y, -0.45 * (0.35 + charge * 0.65), dt * 12);
    rightShoulder.rotation.x = THREE.MathUtils.lerp(rightShoulder.rotation.x, 0.38 * (0.4 + charge * 0.6), dt * 14);
    rightShoulder.rotation.z = THREE.MathUtils.lerp(rightShoulder.rotation.z, 0.45 + charge * 0.15, dt * 14);
    rightElbow.rotation.x = THREE.MathUtils.lerp(rightElbow.rotation.x, -1.35, dt * 14);
    targetRightHandX = 0.25;
  } else if (animState.throwTimer > 0) {
    // No-Contact Open-Palm Forward Thrust
    const tNorm = animState.throwTimer / 0.28;
    const thrust = Math.sin(tNorm * Math.PI * 0.7);
    targetTorsoY = 0.32 * thrust;
    rightShoulder.rotation.x = THREE.MathUtils.lerp(rightShoulder.rotation.x, -1.18, dt * 24);
    rightShoulder.rotation.y = THREE.MathUtils.lerp(rightShoulder.rotation.y, -0.12, dt * 24);
    rightShoulder.rotation.z = THREE.MathUtils.lerp(rightShoulder.rotation.z, 0.18, dt * 24);
    rightElbow.rotation.x = THREE.MathUtils.lerp(rightElbow.rotation.x, -0.22, dt * 24);
    targetRightHandX = -0.35;
  } else if (animState.catchTimer > 0) {
    // Magnetic Catch Cushion Recoil
    const cNorm = animState.catchTimer / 0.25;
    rightShoulder.rotation.x = THREE.MathUtils.lerp(rightShoulder.rotation.x, -0.78 + (1 - cNorm) * 0.35, dt * 20);
    rightShoulder.rotation.z = THREE.MathUtils.lerp(rightShoulder.rotation.z, 0.24, dt * 20);
    rightElbow.rotation.x = THREE.MathUtils.lerp(rightElbow.rotation.x, -0.72 - (1 - cNorm) * 0.32, dt * 20);
    targetRightHandX = 0.15;
  }

  torso.rotation.x = THREE.MathUtils.lerp(torso.rotation.x, targetTorsoX, dt * 10);
  torso.rotation.y = THREE.MathUtils.lerp(torso.rotation.y, targetTorsoY, dt * 10);
  rightHand.rotation.x = THREE.MathUtils.lerp(rightHand.rotation.x, targetRightHandX, dt * 16);
  rightHand.rotation.z = THREE.MathUtils.lerp(rightHand.rotation.z, targetRightHandZ, dt * 16);
  leftHand.rotation.x = THREE.MathUtils.lerp(leftHand.rotation.x, 0, dt * 10);

  // 5. Hover-Palm Disc Position & Orientation on Right Hand
  if (disc) {
    if (blocking) {
      // Braced forward in front of chest as a vertical holographic parry shield
      disc.position.set(-0.04, -0.02, 0.26);
      disc.rotation.set(Math.PI / 2 - 0.15, 0.22, spin);
    } else {
      // Hovering & spinning horizontally in mid-air above upturned open palm
      const magneticBob = Math.sin(time * 3.8) * 0.022;
      disc.position.set(0, -0.06, 0.18 + magneticBob);
      const tiltX = chargingThrow ? 0.28 * charge : -0.04;
      disc.rotation.set(tiltX, 0, spin);
    }
  }

  // 6. Hurt Reaction: high-frequency twitch/tremor
  if (hurt > 0) {
    torso.rotation.z = Math.sin(time * 55) * 0.08;
    head.rotation.y = Math.sin(time * 45) * 0.06;
  } else if (!(grounded && speed > 0.4)) {
    torso.rotation.z = THREE.MathUtils.lerp(torso.rotation.z, 0, dt * 12);
    head.rotation.y = THREE.MathUtils.lerp(head.rotation.y, 0, dt * 12);
  }
}

// Scratch vector / matrix pool for zero garbage collection overhead
export const tmp = new THREE.Vector3();
export const _discMat = new THREE.Matrix4();
export const _fwd = new THREE.Vector3();
export const _r0 = new THREE.Vector3();
export const _u0 = new THREE.Vector3();
export const _uBank = new THREE.Vector3();
export const _rBank = new THREE.Vector3();
export const _localX = new THREE.Vector3();
export const _localY = new THREE.Vector3();

// Duel AI reusable scratch vectors
export const _duelToP = new THREE.Vector3();
export const _duelSide = new THREE.Vector3();
export const _duelWant = new THREE.Vector3();
export const _duelSafe = new THREE.Vector3();
export const _duelCoverDir = new THREE.Vector3();
export const _duelLead = new THREE.Vector3();
export const _duelAimDir = new THREE.Vector3();
export const _duelOrigin = new THREE.Vector3();
export const _duelEvade = new THREE.Vector3();
