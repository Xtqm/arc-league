import * as THREE from '../../vendor/three.module.js';
import { config } from '../core/config.js';
import {
  DISC_SHAPES,
  normalizeShapeName,
  createOuterGeometry,
  createFaceGeometry,
  createHubGeometry
} from './DiscGeometryFactory.js';
import { getArenaTextures } from './ArenaTextures.js';
import { getCachedConstructAsset } from './ConstructLoader.js';

const arenaTextures = getArenaTextures();

// Shared environment materials (augmented with procedural PBR maps when 2D canvas is available)
export const wallMat = new THREE.MeshStandardMaterial({
  color: 0x04141c,
  roughness: 0.4,
  metalness: 0.9,
  normalMap: arenaTextures ? arenaTextures.normalMap : null,
  normalScale: new THREE.Vector2(0.65, 0.65),
  roughnessMap: arenaTextures ? arenaTextures.roughnessMap : null
});
export const trimMat = new THREE.MeshStandardMaterial({
  color: 0x263544,
  roughness: 0.26,
  metalness: 0.9,
  normalMap: arenaTextures ? arenaTextures.normalMap : null,
  normalScale: new THREE.Vector2(0.45, 0.45),
  roughnessMap: arenaTextures ? arenaTextures.roughnessMap : null
});
export const glowMat = new THREE.MeshBasicMaterial({ color: config.CYAN });
export const tileMatIntact = new THREE.MeshStandardMaterial({
  color: 0x07202c,
  roughness: 0.42,
  metalness: 0.38,
  normalMap: arenaTextures ? arenaTextures.normalMap : null,
  normalScale: new THREE.Vector2(0.32, 0.32),
  roughnessMap: arenaTextures ? arenaTextures.roughnessMap : null,
  emissive: new THREE.Color(0x0b4f62),
  emissiveMap: arenaTextures ? arenaTextures.emissiveMap : null,
  emissiveIntensity: arenaTextures ? 0.24 : 0.0
});
export const tileEdgeMatIntact = new THREE.LineBasicMaterial({ color: 0x187588, transparent: true, opacity: .75, depthWrite: false });

/**
 * Parses and sanitizes cosmetic hex colors into Three.js Color instances.
 * Strips alpha channels (supporting 8-digit #rrggbbaa -> #rrggbb and 4-digit #rgba -> #rrggbb),
 * handles 3-digit and 6-digit hexes, number hexes, and guarantees graceful fallback without defaulting to white.
 * @param {string|number|THREE.Color} hex
 * @param {string|number|THREE.Color} [fallback=0x00f3ff]
 * @returns {THREE.Color}
 */
export function parseCosmeticColor(hex, fallback = 0x00f3ff) {
  const resolveFallback = () => {
    if (fallback instanceof THREE.Color) return fallback.clone();
    if (typeof fallback === 'number' && !Number.isNaN(fallback)) {
      return new THREE.Color(fallback);
    }
    if (typeof fallback === 'string') {
      const s = fallback.trim();
      let hp = s.startsWith('#') ? s.slice(1) : (s.startsWith('0x') || s.startsWith('0X') ? s.slice(2) : s);
      if (/^[0-9a-fA-F]+$/.test(hp)) {
        if (hp.length === 8) return new THREE.Color('#' + hp.slice(0, 6));
        if (hp.length === 6) return new THREE.Color('#' + hp);
        if (hp.length === 4) return new THREE.Color('#' + hp[0] + hp[0] + hp[1] + hp[1] + hp[2] + hp[2]);
        if (hp.length === 3) return new THREE.Color('#' + hp[0] + hp[0] + hp[1] + hp[1] + hp[2] + hp[2]);
      }
    }
    return new THREE.Color(0x00f3ff);
  };

  if (hex === null || hex === undefined) {
    return resolveFallback();
  }

  if (hex instanceof THREE.Color) {
    return hex.clone();
  }

  if (typeof hex === 'number' && !Number.isNaN(hex)) {
    return new THREE.Color(hex);
  }

  if (typeof hex === 'string') {
    const trimmed = hex.trim();
    if (!trimmed) {
      return resolveFallback();
    }

    let hexPart = trimmed;
    if (hexPart.startsWith('#')) {
      hexPart = hexPart.slice(1);
    } else if (hexPart.startsWith('0x') || hexPart.startsWith('0X')) {
      hexPart = hexPart.slice(2);
    }

    if (/^[0-9a-fA-F]+$/.test(hexPart)) {
      if (hexPart.length === 8) {
        return new THREE.Color('#' + hexPart.slice(0, 6));
      }
      if (hexPart.length === 6) {
        return new THREE.Color('#' + hexPart);
      }
      if (hexPart.length === 4) {
        const r = hexPart[0];
        const g = hexPart[1];
        const b = hexPart[2];
        return new THREE.Color('#' + r + r + g + g + b + b);
      }
      if (hexPart.length === 3) {
        const r = hexPart[0];
        const g = hexPart[1];
        const b = hexPart[2];
        return new THREE.Color('#' + r + r + g + g + b + b);
      }
    }

    return resolveFallback();
  }

  return resolveFallback();
}

export function discGeo(radius = config.DISC_R, tube = 0.085, shape = DISC_SHAPES.CIRCLE) {
  return createOuterGeometry(shape, { radius, tube });
}

export function makeDisc(color, options = {}) {
  const opts = typeof options === 'string' ? { shape: options } : (options || {});
  const shape = normalizeShapeName(opts.shape || DISC_SHAPES.CIRCLE);
  const radius = opts.radius ?? (config.DISC_R || 0.6);

  const g = new THREE.Group();
  g.userData.part = 'disc_root';
  g.userData.currentShape = shape;

  const baseColor = parseCosmeticColor(color);
  const secondaryColor = opts.secondaryColor
    ? parseCosmeticColor(opts.secondaryColor, 0x0066ff)
    : (opts.secondaryHex
      ? parseCosmeticColor(opts.secondaryHex, 0x0066ff)
      : (opts.secondaryEmissiveHex
        ? parseCosmeticColor(opts.secondaryEmissiveHex, 0x0066ff)
        : new THREE.Color(0x0066ff)));

  // Tactile beveled composite PBR airframe (kinetic strike rim)
  const outerMat = new THREE.MeshStandardMaterial({
    color: baseColor.clone(),
    emissive: baseColor.clone(),
    emissiveIntensity: 1.3,
    roughness: 0.32,
    metalness: 0.82
  });
  const outer = new THREE.Mesh(createOuterGeometry(shape, { radius, ...opts }), outerMat);
  outer.userData.part = 'disc_outer';

  // Smoked hardlight stabilizer face
  const faceMat = new THREE.MeshStandardMaterial({
    color: 0x04080e,
    opacity: 0.32,
    transparent: true,
    roughness: 0.1,
    metalness: 0.9,
    side: THREE.DoubleSide
  });
  const face = new THREE.Mesh(
    createFaceGeometry(shape, { radius, ...opts }),
    faceMat
  );
  face.userData.part = 'disc_face';

  // Faceted hardlight energy core (faceted prism + containment halo)
  const hubMat = new THREE.MeshStandardMaterial({
    color: secondaryColor.clone(),
    emissive: secondaryColor.clone(),
    emissiveIntensity: 1.5,
    roughness: 0.2,
    metalness: 0.85
  });
  const hub = new THREE.Mesh(
    createHubGeometry(shape, { radius, ...opts }),
    hubMat
  );
  hub.userData.part = 'disc_hub';

  g.add(outer, face, hub);
  const light = new THREE.PointLight(baseColor.clone(), 2.4, 10);
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
 * Creates a tapered box (trapezoidal prism) geometry.
 * @param {number} topWidth Width at +Y (top)
 * @param {number} bottomWidth Width at -Y (bottom)
 * @param {number} height Total height along Y
 * @param {number} topDepth Depth at +Y (top)
 * @param {number} bottomDepth Depth at -Y (bottom)
 */
function createTrapezoidBoxGeometry(topWidth, bottomWidth, height, topDepth, bottomDepth) {
  const geo = new THREE.BoxGeometry(1, 1, 1);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i);
    const sx = Math.sign(pos.getX(i));
    const sz = Math.sign(pos.getZ(i));
    if (y > 0) {
      pos.setXYZ(i, sx * topWidth * 0.5, height * 0.5, sz * topDepth * 0.5);
    } else {
      pos.setXYZ(i, sx * bottomWidth * 0.5, -height * 0.5, sz * bottomDepth * 0.5);
    }
  }
  pos.needsUpdate = true;
  geo.computeVertexNormals();
  return geo;
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

    if (archetype === 'player') {
      // Articulated 5-finger humanoid hand for player athlete rig
      // 1. Faceted Palm Chassis (compact tapered trapezoidal prism)
      // width: 0.044m at wrist base expanding to 0.072m at knuckle line, height: 0.048m, depth: 0.022m tapering to 0.015m
      const palmGeo = createTrapezoidBoxGeometry(0.044, 0.072, 0.048, 0.022, 0.015);
      const palmMesh = addFacetedShard(hand, palmGeo, suit, edgeMat, {
        pos: [0, -0.024, 0],
        part: 'chassis_suit'
      });
      palmMesh.userData.handPart = 'palm';

      // 2. Opposable Thumb (lateral abduction ~45° (0.78 rad), forward elevation ~24° (0.42 rad))
      const thumbProx = addFacetedShard(hand, new THREE.BoxGeometry(0.015, 0.034, 0.015), suit, edgeMat, {
        pos: [s * 0.038, -0.018, 0.012],
        rot: [0.42, 0, -s * 0.78],
        part: 'chassis_suit'
      });
      thumbProx.userData.handPart = 'thumb_proximal';

      const thumbDist = addFacetedShard(hand, createTrapezoidBoxGeometry(0.013, 0.010, 0.026, 0.013, 0.010), suit, edgeMat, {
        pos: [s * 0.052, -0.036, 0.022],
        rot: [0.55, 0, -s * 0.88],
        part: 'chassis_suit'
      });
      thumbDist.userData.handPart = 'thumb_distal';

      // 3. Arched Knuckle Bridge & Four 3-Segment Articulated Slender Digits
      // Middle: ~0.070m, Index: ~0.063m, Ring: ~0.066m, Pinky: ~0.053m
      // Radial splay angles: Index: ~+22° (0.38 rad), Middle: ~+6° (0.10 rad), Ring: ~-14° (-0.24 rad), Pinky: ~-30° (-0.52 rad)
      const fingerDefs = [
        { name: 'index',  xOffset: 0.025,  yOffset: -0.048, zOffset: 0.002,  splay: 0.38,  scale: 0.90 },
        { name: 'middle', xOffset: 0.008,  yOffset: -0.052, zOffset: 0.004,  splay: 0.10,  scale: 1.00 },
        { name: 'ring',   xOffset: -0.008, yOffset: -0.050, zOffset: 0.001,  splay: -0.24, scale: 0.94 },
        { name: 'pinky',  xOffset: -0.025, yOffset: -0.046, zOffset: -0.002, splay: -0.52, scale: 0.76 }
      ];

      const fingerShards = [];
      for (const f of fingerDefs) {
        const xBase = s * f.xOffset;
        const yKnuckle = f.yOffset;
        const zKnuckle = f.zOffset;
        const splaySin = Math.sin(f.splay);

        const pLen = 0.028 * f.scale;
        const iLen = 0.023 * f.scale;
        const dLen = 0.019 * f.scale;

        const pWidth = 0.011 * f.scale;
        const iWidth = 0.009 * f.scale;
        const dWidth = 0.007 * f.scale;

        // 1. Proximal phalanx (slight forward tilt ~0.14 rad)
        const proxGeo = createTrapezoidBoxGeometry(pWidth, iWidth, pLen, pWidth, iWidth);
        const prox = addFacetedShard(hand, proxGeo, suit, edgeMat, {
          pos: [
            xBase + s * splaySin * (pLen * 0.45),
            yKnuckle - (pLen * 0.5),
            zKnuckle + 0.005 + 0.003 * f.scale
          ],
          rot: [0.14, 0, -s * f.splay],
          part: 'chassis_suit'
        });
        prox.userData.handPart = `${f.name}_proximal`;
        fingerShards.push(prox);

        // 2. Intermediate phalanx (curled forward ~0.26 rad)
        const interGeo = createTrapezoidBoxGeometry(iWidth, dWidth, iLen, iWidth, dWidth);
        const inter = addFacetedShard(hand, interGeo, suit, edgeMat, {
          pos: [
            xBase + s * splaySin * (pLen + iLen * 0.45),
            yKnuckle - pLen - (iLen * 0.5),
            zKnuckle + 0.013 + 0.005 * f.scale
          ],
          rot: [0.26, 0, -s * f.splay],
          part: 'chassis_suit'
        });
        inter.userData.handPart = `${f.name}_intermediate`;
        fingerShards.push(inter);

        // 3. Distal phalanx (curled further forward ~0.38 rad, tapering to slender tip)
        const distGeo = createTrapezoidBoxGeometry(dWidth, dWidth * 0.72, dLen, dWidth, dWidth * 0.72);
        const dist = addFacetedShard(hand, distGeo, suit, edgeMat, {
          pos: [
            xBase + s * splaySin * (pLen + iLen + dLen * 0.45),
            yKnuckle - pLen - iLen - (dLen * 0.5),
            zKnuckle + 0.022 + 0.007 * f.scale
          ],
          rot: [0.38, 0, -s * f.splay],
          part: 'chassis_suit'
        });
        dist.userData.handPart = `${f.name}_distal`;
        fingerShards.push(dist);
      }

      hand.userData.palmMesh = palmMesh;
      hand.userData.thumbShards = [thumbProx, thumbDist];
      hand.userData.fingerShards = fingerShards;
      hand.userData.hasHumanoidFingers = true;
    } else {
      addFacetedShard(hand, new THREE.BoxGeometry(0.085, 0.09, 0.036), suit, edgeMat, {
        pos: [0, -0.02, 0]
      });
    }

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

const MIXER_SNAP_CLIPS = new Set(['throw_release', 'catch_recoil', 'parry_brace', 'dash_burst', 'eliminated']);
const MIXER_ONESHOT_CLIPS = new Set(['throw_release', 'catch_recoil', 'dash_burst', 'eliminated']);

function createConstructMaterials(color, archetype) {
  const baseColor = parseCosmeticColor(color);
  const suitBaseHex = archetype === 'player' ? 0x1e2631 : 0x1a1e26;
  const trimBase = archetype === 'player'
    ? baseColor.clone().multiplyScalar(0.55)
    : new THREE.Color(archetype === 'sentinel' ? color : 0xffb347).multiplyScalar(0.6);

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
  return { suit, lit, edgeMat };
}

function createHoverPalmDisc(lit, options = {}) {
  const palmDiscRadius = config.DISC_R * 0.46;
  const palmShape = normalizeShapeName(options.discShape || DISC_SHAPES.CIRCLE);
  const palmOuterMat = lit.clone();
  palmOuterMat.roughness = 0.32;
  palmOuterMat.metalness = 0.82;
  palmOuterMat.emissiveIntensity = 1.3;
  const disc = new THREE.Mesh(createOuterGeometry(palmShape, { radius: palmDiscRadius, tube: 0.042 }), palmOuterMat);
  disc.position.set(0, -0.06, 0.18);
  disc.rotation.set(-0.04, 0, 0);
  disc.userData.part = 'chassis_back_disc';
  disc.userData.currentShape = palmShape;

  const discFace = new THREE.Mesh(
    createFaceGeometry(palmShape, { radius: palmDiscRadius, margin: 0.035 }),
    new THREE.MeshStandardMaterial({
      color: 0x04080e,
      opacity: 0.32,
      transparent: true,
      roughness: 0.1,
      metalness: 0.9,
      side: THREE.DoubleSide
    })
  );
  discFace.userData.part = 'chassis_back_disc_face';
  disc.add(discFace);
  disc.userData.faceMesh = discFace;

  const palmHub = new THREE.Mesh(
    createHubGeometry(palmShape, { radius: palmDiscRadius }),
    new THREE.MeshStandardMaterial({
      color: 0x0066ff,
      emissive: 0x0066ff,
      emissiveIntensity: 1.5,
      roughness: 0.2,
      metalness: 0.85
    })
  );
  palmHub.userData.part = 'chassis_back_disc_hub';
  disc.add(palmHub);
  disc.userData.hubMesh = palmHub;

  return disc;
}

function disposeReplacedMaterial(mat, keptSet) {
  if (!mat) return;
  if (Array.isArray(mat)) {
    for (const m of mat) disposeReplacedMaterial(m, keptSet);
    return;
  }
  if (!keptSet.has(mat) && typeof mat.dispose === 'function') {
    mat.dispose();
  }
}

function buildCachedConstructRig(cachedAsset, color, options, archetype, isPlayer, mats) {
  const { suit, lit, edgeMat } = mats;
  const keptMats = new Set([suit, lit, edgeMat]);
  const g = cachedAsset.clone();

  g.userData.part = 'chassis_root';
  g.userData.isPlayer = isPlayer;
  g.userData.archetype = archetype;
  g.userData.helmetType = options.helmetType || archetype;
  g.userData.isGLB = true;
  g.userData.constructAssetKey = cachedAsset.key;
  g.userData.suitMaterial = suit;
  g.userData.litMaterial = lit;
  g.userData.edgeMaterial = edgeMat;

  g.traverse((child) => {
    if (child.isLine || child.isLineSegments) {
      const oldMat = child.material;
      child.material = edgeMat;
      disposeReplacedMaterial(oldMat, keptMats);
      return;
    }
    if (!child.isMesh) return;
    const part = child.userData?.part;
    const oldMat = child.material;
    if (part === 'chassis_suit') {
      if (!oldMat?.map && !oldMat?.normalMap) {
        child.material = suit;
        disposeReplacedMaterial(oldMat, keptMats);
      } else {
        if (oldMat.color) oldMat.color.copy(suit.color);
        if ('roughness' in oldMat) oldMat.roughness = suit.roughness;
        if ('metalness' in oldMat) oldMat.metalness = suit.metalness;
        if ('flatShading' in oldMat) oldMat.flatShading = true;
      }
    } else if (part === 'chassis_trim' || part === 'chassis_visor' || part === 'chassis_halo') {
      if (!oldMat?.map && !oldMat?.emissiveMap) {
        child.material = lit;
        disposeReplacedMaterial(oldMat, keptMats);
      } else {
        if (oldMat.color) oldMat.color.copy(lit.color);
        if ('emissive' in oldMat && oldMat.emissive) {
          oldMat.emissive.copy(lit.emissive);
          oldMat.emissiveIntensity = lit.emissiveIntensity;
        }
      }
    }
  });

  const rightHand = g.userData.joints.rightHand;
  let disc = g.userData.backDisc;
  if (!disc) {
    disc = createHoverPalmDisc(lit, options);
    const socket = g.userData.palmSocket;
    if (socket && socket.parent === rightHand && socket.position.lengthSq() > 0) {
      disc.position.copy(socket.position);
      disc.quaternion.copy(socket.quaternion);
    }
    rightHand.add(disc);
    g.userData.backDisc = disc;
  } else if (disc.parent !== rightHand) {
    rightHand.add(disc);
  }

  let haloLight = null;
  g.traverse((child) => {
    if (child.isPointLight && !haloLight) haloLight = child;
  });
  if (!haloLight) {
    haloLight = new THREE.PointLight(color, isPlayer ? 1.6 : 1.9, 9);
    haloLight.position.y = 1.5;
    haloLight.userData.part = 'chassis_halo';
    g.add(haloLight);
  }
  g.userData.halo = haloLight;

  const animations = g.userData.animations || cachedAsset.animations || [];
  const clips = g.userData.clips || cachedAsset.clips || {};
  if (animations.length > 0 && Object.keys(clips).length > 0) {
    const mixer = new THREE.AnimationMixer(g);
    const actions = {};
    for (const [clipName, clip] of Object.entries(clips)) {
      actions[clipName] = mixer.clipAction(clip);
    }
    g.userData.mixer = mixer;
    g.userData.actions = actions;
    g.userData.activeActionName = null;
    if (actions.idle_hover) {
      actions.idle_hover.reset().setEffectiveTimeScale(1).setEffectiveWeight(1).play();
      g.userData.activeActionName = 'idle_hover';
      mixer.update(0);
    }
  } else {
    const { rightShoulder, rightElbow } = g.userData.joints;
    rightShoulder.rotation.set(-0.46, -0.06, 0.36);
    rightElbow.rotation.set(-1.16, 0, 0);
    rightHand.rotation.set(0.05, 0, 0);
  }

  return g;
}

function updateRigAnimationMixer(rig, dt, state) {
  const mixer = rig.userData.mixer;
  const actions = rig.userData.actions;
  if (!mixer || !actions) return false;

  const actionKeys = Object.keys(actions);
  if (actionKeys.length === 0) return false;

  let targetName = null;
  if (state.eliminated && actions.eliminated) targetName = 'eliminated';
  else if (state.blocking && actions.parry_brace) targetName = 'parry_brace';
  else if (state.chargingThrow && actions.throw_windup) targetName = 'throw_windup';
  else if (state.throwTimer > 0 && actions.throw_release) targetName = 'throw_release';
  else if (state.dashing && actions.dash_burst) targetName = 'dash_burst';
  else if (state.catchTimer > 0 && actions.catch_recoil) targetName = 'catch_recoil';
  else if (!state.grounded && actions.aerial_tuck) targetName = 'aerial_tuck';
  else if (state.grounded && state.speed > 0.4 && actions.sprint_lean) targetName = 'sprint_lean';
  else if (actions.idle_hover) targetName = 'idle_hover';
  else targetName = actionKeys[0];

  const nextAction = actions[targetName];
  if (!nextAction) return false;

  const prevName = rig.userData.activeActionName;
  const prevAction = prevName ? actions[prevName] : null;
  const isRetriggeredOneShot =
    (targetName === 'throw_release' && state.throwTrigger) ||
    (targetName === 'catch_recoil' && state.catchTrigger);

  if (targetName === 'sprint_lean') {
    nextAction.setEffectiveTimeScale(THREE.MathUtils.clamp(state.speed / 7.5, 0.45, 1.55));
  } else {
    nextAction.setEffectiveTimeScale(1);
  }

  if (targetName !== prevName || isRetriggeredOneShot) {
    const fadeSec = MIXER_SNAP_CLIPS.has(targetName) ? 0.06 : 0.12;
    const isOneShot = MIXER_ONESHOT_CLIPS.has(targetName);
    nextAction.reset();
    nextAction.enabled = true;
    nextAction.setEffectiveWeight(1);
    nextAction.setLoop(isOneShot ? THREE.LoopOnce : THREE.LoopRepeat, isOneShot ? 1 : Infinity);
    nextAction.clampWhenFinished = isOneShot;
    if (prevAction && prevAction !== nextAction) {
      prevAction.crossFadeTo(nextAction, fadeSec, true);
    }
    nextAction.play();
    rig.userData.activeActionName = targetName;
  }

  mixer.update(Math.max(dt, 0));
  return true;
}

export function makeProgram(color, options = {}) {
  const archetype = resolveConstructArchetype(options);
  const isPlayer = archetype === 'player';
  const mats = createConstructMaterials(color, archetype);

  if (!options.forceProcedural) {
    const assetKey = options.modelKey || options.constructKey || archetype;
    const cachedAsset = getCachedConstructAsset(assetKey);
    if (cachedAsset) {
      return buildCachedConstructRig(cachedAsset, color, options, archetype, isPlayer, mats);
    }
  }

  const g = new THREE.Group();
  g.userData.part = 'chassis_root';
  g.userData.isPlayer = isPlayer;
  g.userData.archetype = archetype;
  g.userData.helmetType = options.helmetType || archetype;

  const { suit, lit, edgeMat } = mats;

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
  const disc = createHoverPalmDisc(lit, options);
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
    animState.throwTimer = 0;
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
    const halo = rig.userData.headHalo;
    if (halo.userData._baseHaloRotZ === undefined) {
      halo.userData._baseHaloRotZ = halo.rotation.z;
    }
    halo.rotation.z = halo.userData._baseHaloRotZ + Math.sin(time * 1.4) * 0.06;
  }

  const usingMixer = updateRigAnimationMixer(rig, dt, {
    speed,
    grounded,
    blocking,
    chargingThrow,
    throwTimer: animState.throwTimer,
    catchTimer: animState.catchTimer,
    dashing: !!params.dashing,
    eliminated: !!params.eliminated,
    throwTrigger,
    catchTrigger
  });

  if (!usingMixer) {
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
  }

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
  } else if (!usingMixer && !(grounded && speed > 0.4)) {
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
