import * as THREE from '../../vendor/three.module.js';
import { state } from '../core/state.js';
import { config } from '../core/config.js';
import { scene } from '../graphics/scene.js';
import { wallMat, trimMat, glowMat, tileMatIntact, tileEdgeMatIntact } from '../graphics/materials.js';
export { tileMatIntact, tileEdgeMatIntact };
import { burst } from '../graphics/particles.js';
import { playWarningSound, playTileDropSound } from '../audio/sfx.js';
import { sectorHazardBuilder } from '../arena/hazards/SectorHazardBuilder.js';
export { sectorHazardBuilder };
import { loadArenaAsset, canLoadExternalModels } from '../graphics/ArenaAssetLoader.js';

function shake(v) {
  state.shakeAmt = Math.min((state.shakeAmt || 0) + v, 0.8);
}

/**
 * Generates synchronous beveled dark-slab geometry matching exact tile dimensions
 * with clean planar top UVs so procedural PBR maps render before or without `.glb` hydration.
 *
 * @param {number} width
 * @param {number} height
 * @returns {THREE.BufferGeometry}
 */
export function createProceduralBeveledTileGeometry(width = config.TILE_W - 0.08, height = 0.35) {
  const hw = width * 0.5;
  const hh = height * 0.5;
  const topInset = Math.min(0.08, width * 0.03);
  const botInset = Math.min(0.11, width * 0.04);
  const zTop = hh;
  const zMidTop = hh - 0.055;
  const zMidBot = -hh + 0.06;
  const zBot = -hh;

  const positions = [];
  const uvs = [];

  const pushTri = (a, b, c) => {
    positions.push(a[0], a[1], a[2], b[0], b[1], b[2], c[0], c[1], c[2]);
    uvs.push(
      (a[0] + hw) / width, (a[2] + hw) / width,
      (b[0] + hw) / width, (b[2] + hw) / width,
      (c[0] + hw) / width, (c[2] + hw) / width
    );
  };

  const pushQuad = (a, b, c, d) => {
    pushTri(a, b, c);
    pushTri(a, c, d);
  };

  const ring = (extent, y) => [
    [-extent, y, -extent],
    [extent, y, -extent],
    [extent, y, extent],
    [-extent, y, extent]
  ];

  const rTop = ring(hw - topInset, zTop);
  const rMidT = ring(hw, zMidTop);
  const rMidB = ring(hw, zMidBot);
  const rBot = ring(hw - botInset, zBot);

  // Top & bottom caps
  pushQuad(rTop[0], rTop[3], rTop[2], rTop[1]);
  pushQuad(rBot[0], rBot[1], rBot[2], rBot[3]);

  // Chamfered perimeter bevel & vertical skirt bands
  for (let i = 0; i < 4; i++) {
    const j = (i + 1) % 4;
    pushQuad(rTop[i], rMidT[i], rMidT[j], rTop[j]);
    pushQuad(rMidT[i], rMidB[i], rMidB[j], rMidT[j]);
    pushQuad(rMidB[i], rBot[i], rBot[j], rMidB[j]);
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.computeVertexNormals();
  geo.computeBoundingBox();
  geo.computeBoundingSphere();
  return geo;
}

// Map: key `${ix}_${iz}` -> { tileIndex, mesh, slabMesh, edgeMesh, state, timer, origY, ix, iz, center, regenTimer, warningColor, delegate }
export const tiles = new Map();

export const TOTAL_TILES = config.TILE_N * config.TILE_N; // 576

export let tileGeo = createProceduralBeveledTileGeometry(config.TILE_W - 0.08, 0.35);
export const tileEdgeGeo = new THREE.EdgesGeometry(new THREE.BoxGeometry(config.TILE_W - 0.08, 0.35, config.TILE_W - 0.08));

export const tileGroup = new THREE.Group();
scene.add(tileGroup);

// 1. Instanced Meshes for Floor Slabs and Edge Lines
export const instancedSlabs = new THREE.InstancedMesh(tileGeo, tileMatIntact, TOTAL_TILES);
instancedSlabs.receiveShadow = true;
instancedSlabs.frustumCulled = false;

export const instancedEdges = new THREE.InstancedMesh(tileEdgeGeo, tileEdgeMatIntact, TOTAL_TILES);
instancedEdges.isMesh = false;
instancedEdges.isLine = true;
instancedEdges.isLineSegments = true;
instancedEdges.frustumCulled = false;

tileGroup.add(instancedSlabs, instancedEdges);

// Precomputed instance matrices for identity placement & zero-scale hiding
const _hiddenMatrix = new THREE.Matrix4().makeScale(0, 0, 0);
export const defaultTileMatrices = [];
for (let i = 0; i < TOTAL_TILES; i++) {
  const ix = Math.floor(i / config.TILE_N);
  const iz = i % config.TILE_N;
  const cx = -config.ARENA + (ix + 0.5) * config.TILE_W;
  const cz = -config.ARENA + (iz + 0.5) * config.TILE_W;
  const mat = new THREE.Matrix4();
  mat.setPosition(cx, -0.175, cz);
  defaultTileMatrices.push(mat);
}

export function hideInstance(tileIndex) {
  if (tileIndex < 0 || tileIndex >= TOTAL_TILES) return;
  instancedSlabs.setMatrixAt(tileIndex, _hiddenMatrix);
  instancedEdges.setMatrixAt(tileIndex, _hiddenMatrix);
  instancedSlabs.instanceMatrix.needsUpdate = true;
  instancedEdges.instanceMatrix.needsUpdate = true;
}

export function showInstance(tileIndex) {
  if (tileIndex < 0 || tileIndex >= TOTAL_TILES) return;
  const mat = defaultTileMatrices[tileIndex];
  instancedSlabs.setMatrixAt(tileIndex, mat);
  instancedEdges.setMatrixAt(tileIndex, mat);
  instancedSlabs.instanceMatrix.needsUpdate = true;
  instancedEdges.instanceMatrix.needsUpdate = true;
}

// 2. Dynamic Warning Delegate Pool (32 reusable meshes)
export const DELEGATE_POOL_SIZE = 32;
export const delegatePool = [];

function createDelegateItem() {
  const group = new THREE.Group();
  group.visible = false;

  const warningSlabMat = new THREE.MeshStandardMaterial({
    color: 0x07202c,
    roughness: 0.28,
    metalness: 0.8,
    normalMap: tileMatIntact.normalMap || null,
    normalScale: tileMatIntact.normalScale ? tileMatIntact.normalScale.clone() : new THREE.Vector2(1, 1),
    roughnessMap: tileMatIntact.roughnessMap || null,
    emissive: config.CYAN,
    emissiveIntensity: 1.0,
    transparent: true
  });
  warningSlabMat.dispose = () => {};

  const warningEdgeMat = new THREE.LineBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 1.0
  });
  warningEdgeMat.dispose = () => {};

  const slabMesh = new THREE.Mesh(tileGeo, warningSlabMat);
  slabMesh.position.y = -0.175;
  slabMesh.receiveShadow = true;

  const edgeMesh = new THREE.LineSegments(tileEdgeGeo, warningEdgeMat);
  edgeMesh.position.y = -0.175;

  group.add(slabMesh, edgeMesh);
  tileGroup.add(group);

  return {
    group,
    slabMesh,
    edgeMesh,
    warningSlabMat,
    warningEdgeMat,
    tiltDirX: 1,
    tiltDirZ: 1,
    tumbleVelX: 1.5,
    tumbleVelZ: 1.2,
    inUse: false,
    tile: null
  };
}

export function initDelegatePool() {
  if (delegatePool.length === 0) {
    for (let i = 0; i < DELEGATE_POOL_SIZE; i++) {
      delegatePool.push(createDelegateItem());
    }
  } else {
    for (const d of delegatePool) {
      d.inUse = false;
      d.tile = null;
      d.group.visible = false;
      d.group.rotation.set(0, 0, 0);
      if (!tileGroup.children.includes(d.group)) {
        tileGroup.add(d.group);
      }
    }
  }
}

export function claimDelegate(tile) {
  if (tile.delegate) return tile.delegate;
  let delegate = delegatePool.find(d => !d.inUse);
  if (!delegate) {
    delegate = createDelegateItem();
    delegatePool.push(delegate);
  }
  delegate.inUse = true;
  delegate.tile = tile;
  delegate.group.position.set(tile.center.x, (tile.mesh && tile.mesh.position) ? tile.mesh.position.y : tile.origY, tile.center.z);
  delegate.group.rotation.set(0, 0, 0);
  delegate.group.visible = tile.mesh ? (tile.mesh.visible !== false) : true;

  // Deterministic per-tile destabilization tilt/tumble axes for Vectorfall
  delegate.tiltDirX = ((tile.ix * 7 + tile.iz * 13) % 2 === 0) ? 1 : -1;
  delegate.tiltDirZ = ((tile.ix * 11 + tile.iz * 5) % 2 === 0) ? 1 : -1;
  delegate.tumbleVelX = delegate.tiltDirX * (1.35 + (tile.tileIndex % 5) * 0.25);
  delegate.tumbleVelZ = delegate.tiltDirZ * (1.15 + (tile.tileIndex % 7) * 0.22);

  // Initialize delegate materials with active theme colors and emissive warning
  delegate.warningSlabMat.color.copy(tileMatIntact.color);
  delegate.warningSlabMat.roughness = tileMatIntact.roughness;
  delegate.warningSlabMat.metalness = tileMatIntact.metalness;
  delegate.warningSlabMat.emissive.setHex(tile.warningColor || config.CYAN);
  delegate.warningSlabMat.emissiveIntensity = 1.0;
  delegate.warningEdgeMat.color.setHex(0xffffff);
  delegate.warningEdgeMat.opacity = 1.0;

  delegate.slabMesh.material = delegate.warningSlabMat;
  delegate.edgeMesh.material = delegate.warningEdgeMat;

  tile.delegate = delegate;
  tile.mesh = delegate.group;
  tile.slabMesh = delegate.slabMesh;
  tile.edgeMesh = delegate.edgeMesh;

  hideInstance(tile.tileIndex);
  return delegate;
}

export function releaseDelegate(tile) {
  if (!tile.delegate) return;
  const delegate = tile.delegate;
  delegate.group.visible = false;
  delegate.group.rotation.set(0, 0, 0);
  delegate.inUse = false;
  delegate.tile = null;
  tile.delegate = null;
  tile.fallSpeed = 0;

  tile.mesh = tile._dummyMesh;
  tile.slabMesh = tile._dummySlab;
  tile.edgeMesh = tile._dummyEdge;
  tile._dummyMesh.position.set(tile.center.x, tile.origY, tile.center.z);
  tile._dummyMesh.rotation.set(0, 0, 0);
  tile._dummyMesh.visible = true;

  showInstance(tile.tileIndex);
}

export function initTiles() {
  tiles.clear();
  while (tileGroup.children.length > 0) {
    tileGroup.remove(tileGroup.children[0]);
  }
  tileGroup.add(instancedSlabs, instancedEdges);
  initDelegatePool();

  for (let ix = 0; ix < config.TILE_N; ix++) {
    for (let iz = 0; iz < config.TILE_N; iz++) {
      const tileIndex = ix * config.TILE_N + iz;
      const cx = -config.ARENA + (ix + 0.5) * config.TILE_W;
      const cz = -config.ARENA + (iz + 0.5) * config.TILE_W;

      // Populate instanced matrix
      instancedSlabs.setMatrixAt(tileIndex, defaultTileMatrices[tileIndex]);
      instancedEdges.setMatrixAt(tileIndex, defaultTileMatrices[tileIndex]);

      // Standalone dummy group for property access when intact
      const dummyMesh = new THREE.Group();
      dummyMesh.position.set(cx, 0, cz);

      const dummySlab = new THREE.Mesh(tileGeo, tileMatIntact);
      dummySlab.position.y = -0.175;
      dummySlab.receiveShadow = true;

      const dummyEdge = new THREE.LineSegments(tileEdgeGeo, tileEdgeMatIntact);
      dummyEdge.position.y = -0.175;

      dummyMesh.add(dummySlab, dummyEdge);

      let _state = config.TILE_INTACT;

      const tile = {
        tileIndex,
        _dummyMesh: dummyMesh,
        _dummySlab: dummySlab,
        _dummyEdge: dummyEdge,
        mesh: dummyMesh,
        slabMesh: dummySlab,
        edgeMesh: dummyEdge,
        delegate: null,
        timer: 0,
        origY: 0,
        ix,
        iz,
        center: new THREE.Vector3(cx, 0, cz),
        regenTimer: 0,
        warningColor: config.CYAN
      };

      Object.defineProperty(tile, 'state', {
        get() {
          return _state;
        },
        set(val) {
          _state = val;
          if (val === config.TILE_INTACT) {
            if (tile.delegate) {
              releaseDelegate(tile);
            } else {
              showInstance(tileIndex);
            }
          } else {
            hideInstance(tileIndex);
          }
        },
        enumerable: true,
        configurable: true
      });

      tiles.set(`${ix}_${iz}`, tile);
    }
  }
  instancedSlabs.instanceMatrix.needsUpdate = true;
  instancedEdges.instanceMatrix.needsUpdate = true;
}
initTiles();

export function worldToTile(x, z) {
  const ix = Math.min(config.TILE_N - 1, Math.max(0, Math.floor((x + config.ARENA) / config.TILE_W)));
  const iz = Math.min(config.TILE_N - 1, Math.max(0, Math.floor((z + config.ARENA) / config.TILE_W)));
  return { ix, iz };
}

export function tileToWorld(ix, iz) {
  return {
    x: -config.ARENA + (ix + 0.5) * config.TILE_W,
    z: -config.ARENA + (iz + 0.5) * config.TILE_W
  };
}

export function getTileAt(x, z) {
  if (Math.abs(x) > config.ARENA || Math.abs(z) > config.ARENA) return null;
  const { ix, iz } = worldToTile(x, z);
  return tiles.get(`${ix}_${iz}`) || null;
}

export function findNearestIntactTile(x, z) {
  const { ix: cix, iz: ciz } = worldToTile(x, z);
  let best = null;
  let bestDistSq = Infinity;
  for (let r = 1; r <= 8; r++) {
    for (let dx = -r; dx <= r; dx++) {
      for (let dz = -r; dz <= r; dz++) {
        if (Math.abs(dx) !== r && Math.abs(dz) !== r) continue;
        const nx = cix + dx, nz = ciz + dz;
        if (nx < 0 || nx >= config.TILE_N || nz < 0 || nz >= config.TILE_N) continue;
        const t = tiles.get(`${nx}_${nz}`);
        if (t && t.state === config.TILE_INTACT) {
          const w = tileToWorld(nx, nz);
          const d2 = (w.x - x) ** 2 + (w.z - z) ** 2;
          if (d2 < bestDistSq) {
            bestDistSq = d2;
            best = w;
          }
        }
      }
    }
    if (best) return best;
  }
  return { x: 0, z: 0 };
}

// Perimeter walls (synchronous procedural fallback anchored for async .glb hydration)
export const walls = [];
for (let i = 0; i < 4; i++) {
  const a = i * Math.PI / 2;
  const anchor = new THREE.Group();
  anchor.name = `wallAnchor_${i}`;
  anchor.position.set(Math.sin(a) * config.ARENA, 0, Math.cos(a) * config.ARENA);
  anchor.rotation.y = a;

  const fallbackGroup = new THREE.Group();
  const w = new THREE.Mesh(new THREE.BoxGeometry(config.ARENA * 2 + 2, 9, 1.4), wallMat);
  w.position.set(0, 4.5, 0);
  w.receiveShadow = true;
  const g = new THREE.Mesh(new THREE.BoxGeometry(config.ARENA * 2 + 2, 0.22, 1.7), glowMat);
  g.position.set(0, 9.1, 0);
  fallbackGroup.add(w, g);

  for (let k = -config.ARENA + 6; k < config.ARENA; k += 11) {
    const s = new THREE.Mesh(new THREE.BoxGeometry(0.18, 8.4, 0.1), glowMat);
    s.position.set(k, 4.4, 0);
    fallbackGroup.add(s);
  }

  anchor.add(fallbackGroup);
  scene.add(anchor);
  walls.push({ mesh: w, glow: g, anchor, fallbackGroup, hydratedGroup: null, index: i, angle: a });
}

// Pillars = cover + ricochet cylinders (strictly aligned to r = 2.1m collision envelope)
export const pillars = [];
export const pillarSpots = [[-20, -20], [20, -20], [-20, 20], [20, 20], [0, -30], [0, 30], [-31, 0], [31, 0]];
pillarSpots.forEach(([x, z], idx) => {
  const r = 2.1;
  const h = 6.5;
  const anchor = new THREE.Group();
  anchor.name = `pillarAnchor_${idx}`;
  anchor.position.set(x, 0, z);

  const fallbackGroup = new THREE.Group();
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, 6), wallMat);
  m.position.set(0, h / 2, 0);
  m.castShadow = true;
  m.receiveShadow = true;
  const e = new THREE.Mesh(new THREE.CylinderGeometry(r + 0.05, r + 0.05, 0.2, 6), glowMat);
  e.position.set(0, h, 0);
  fallbackGroup.add(m, e);

  anchor.add(fallbackGroup);
  scene.add(anchor);
  pillars.push({ x, z, r, anchor, fallbackGroup, hydratedGroup: null });
});

export const arenaHydrationState = {
  tileHydrated: false,
  pylonsHydrated: false,
  wallsHydrated: false
};

/**
 * Asynchronously loads Blender-authored `.glb` foundry kit assets and hot-swaps
 * floor slab geometry, perimeter wall buttress bays, and deflector pylons without
 * altering `TOTAL_TILES`, `defaultTileMatrices`, `instancedEdges`, or collision bounds.
 *
 * @param {object} [options]
 * @returns {Promise<typeof arenaHydrationState>}
 */
export async function hydrateArenaModels(options = {}) {
  const foundryMaterials = {
    Foundry_Armor: wallMat,
    Foundry_Trim: trimMat,
    Foundry_Conduit: glowMat
  };

  const [tileAsset, pylonAsset, wallAsset] = await Promise.all([
    loadArenaAsset('arcfield_tile', {
      ...options,
      targetSize: [config.TILE_W - 0.08, 0.35, config.TILE_W - 0.08],
      anchor: 'center',
      materials: { ...foundryMaterials, Foundry_Armor: tileMatIntact }
    }),
    loadArenaAsset('deflector_pylon', {
      ...options,
      anchor: 'preserve',
      materials: foundryMaterials
    }),
    loadArenaAsset('wall_buttress', {
      ...options,
      anchor: 'preserve',
      materials: foundryMaterials
    })
  ]);

  if (tileAsset && tileAsset.mergedGeometry) {
    const prevGeo = tileGeo;
    const nextGeo = tileAsset.mergedGeometry;
    tileGeo = nextGeo;
    instancedSlabs.geometry = nextGeo;
    for (const d of delegatePool) {
      d.slabMesh.geometry = nextGeo;
    }
    for (const t of tiles.values()) {
      if (t._dummySlab) t._dummySlab.geometry = nextGeo;
    }
    if (prevGeo && prevGeo !== nextGeo && typeof prevGeo.dispose === 'function') {
      prevGeo.dispose();
    }
    arenaHydrationState.tileHydrated = true;
  }

  if (pylonAsset) {
    for (const p of pillars) {
      if (p.hydratedGroup && p.anchor) {
        p.anchor.remove(p.hydratedGroup);
      }
      const cloned = pylonAsset.clone();
      cloned.traverse((child) => {
        if (child.isMesh) {
          child.castShadow = true;
          child.receiveShadow = true;
        }
      });
      p.hydratedGroup = cloned;
      if (p.anchor) p.anchor.add(cloned);
      if (p.fallbackGroup) p.fallbackGroup.visible = false;
    }
    arenaHydrationState.pylonsHydrated = true;
  }

  if (wallAsset) {
    const bayCount = 8;
    const totalWidth = config.ARENA * 2;
    const bayWidth = totalWidth / bayCount;
    const scaleX = bayWidth / 11.5;

    for (const w of walls) {
      if (w.hydratedGroup && w.anchor) {
        w.anchor.remove(w.hydratedGroup);
      }
      const hydratedGroup = new THREE.Group();
      for (let b = 0; b < bayCount; b++) {
        const bay = wallAsset.clone();
        bay.position.set(-config.ARENA + (b + 0.5) * bayWidth, 0, 0);
        bay.scale.set(scaleX, 1, 1);
        bay.traverse((child) => {
          if (child.isMesh) {
            child.receiveShadow = true;
          }
        });
        hydratedGroup.add(bay);
      }
      w.hydratedGroup = hydratedGroup;
      if (w.anchor) w.anchor.add(hydratedGroup);
      if (w.fallbackGroup) w.fallbackGroup.visible = false;
    }
    arenaHydrationState.wallsHydrated = true;
  }

  return arenaHydrationState;
}

if (canLoadExternalModels()) {
  hydrateArenaModels({ silent: true });
}

export function triggerTileWarning(tile, color = config.CYAN) {
  if (!tile || tile.state !== config.TILE_INTACT) return;
  tile.warningColor = color;
  claimDelegate(tile);
  tile.state = config.TILE_WARNING;
  tile.timer = config.TILE_WARN_DURATION;
  playWarningSound();
}

export function spawnTileDeRezSparks(cx, cz) {
  const hw = (config.TILE_W - 0.08) * 0.5;
  const pts = [
    new THREE.Vector3(cx - hw, 0.1, cz - hw),
    new THREE.Vector3(cx + hw, 0.1, cz - hw),
    new THREE.Vector3(cx + hw, 0.1, cz + hw),
    new THREE.Vector3(cx - hw, 0.1, cz + hw),
    new THREE.Vector3(cx, 0.1, cz)
  ];
  for (const p of pts) burst(p, config.CYAN, 12, 8);
  // Extra chasm de-rez sparks erupting beneath the collapsing slab
  burst(new THREE.Vector3(cx, -0.35, cz), 0xff7b1a, 18, 11);
  burst(new THREE.Vector3(cx, -0.65, cz), 0xff2244, 14, 9);
  playTileDropSound();
  shake(0.14);
}

const _warnBaseColor = new THREE.Color();
const _amberOverloadColor = new THREE.Color(0xff7b1a);
const _crimsonOverloadColor = new THREE.Color(0xff2244);
const _mixedWarnColor = new THREE.Color();

export function updateTiles(dt) {
  const warnDuration = config.TILE_WARN_DURATION || 0.75;
  for (const tile of tiles.values()) {
    if (tile.state === config.TILE_INTACT) continue;

    if (!tile.delegate) {
      claimDelegate(tile);
    }

    const d = tile.delegate;

    if (tile.state === config.TILE_WARNING) {
      tile.timer -= dt;
      const progress = THREE.MathUtils.clamp(1 - tile.timer / warnDuration, 0, 1);
      const strobe = 0.5 + 0.5 * Math.sin(state.time * 42);
      const isFlash = Math.sin(state.time * 42) > 0.55;

      // Transition warning glow from sector primary -> amber (#ff7b1a) -> crimson (#ff2244)
      _warnBaseColor.setHex(tile.warningColor || config.CYAN);
      if (progress < 0.5) {
        _mixedWarnColor.copy(_warnBaseColor).lerp(_amberOverloadColor, progress * 2.0);
      } else {
        _mixedWarnColor.copy(_amberOverloadColor).lerp(_crimsonOverloadColor, (progress - 0.5) * 2.0);
      }

      if (isFlash) {
        tile.slabMesh.material.emissive.setHex(0xffffff);
        tile.edgeMesh.material.color.setHex(0xffffff);
      } else {
        tile.slabMesh.material.emissive.copy(_mixedWarnColor);
        tile.edgeMesh.material.color.copy(_mixedWarnColor);
      }
      tile.slabMesh.material.emissiveIntensity = 0.8 + strobe * (1.5 + progress * 1.1);
      tile.edgeMesh.material.opacity = 0.35 + strobe * 0.65;

      // Destabilizing pitch/roll tilt (+-0.06 rad) synced with vertical jitter
      const tiltAmp = 0.02 + progress * 0.04;
      const dirX = d ? d.tiltDirX : 1;
      const dirZ = d ? d.tiltDirZ : 1;
      tile.mesh.rotation.x = Math.sin(state.time * 38 + tile.tileIndex) * tiltAmp * dirX;
      tile.mesh.rotation.z = Math.cos(state.time * 34 + tile.tileIndex * 0.7) * tiltAmp * dirZ;
      tile.mesh.position.y = tile.origY + Math.sin(state.time * 60 + tile.tileIndex) * (0.04 + progress * 0.025);

      if (tile.timer <= 0) {
        tile.state = config.TILE_FALLEN;
        tile.regenTimer = 0;
        tile.fallSpeed = 18;
        tile.mesh.position.y = tile.origY;
        spawnTileDeRezSparks(tile.center.x, tile.center.z);
      }
    } else if (tile.state === config.TILE_FALLEN) {
      tile.fallSpeed = (tile.fallSpeed || 18) + 28 * dt;
      tile.mesh.position.y -= tile.fallSpeed * dt;
      const tumbleX = d ? d.tumbleVelX : 1.4;
      const tumbleZ = d ? d.tumbleVelZ : 1.2;
      tile.mesh.rotation.x += tumbleX * dt;
      tile.mesh.rotation.z += tumbleZ * dt;

      if (tile.mesh.position.y <= tile.origY - 18) {
        tile.mesh.visible = false;
      }

      tile.regenTimer = (tile.regenTimer || 0) + dt;
      if (tile.regenTimer >= config.TILE_REGEN_DELAY) {
        tile.state = config.TILE_REBUILDING;
        tile.fallSpeed = 0;
        tile.mesh.visible = true;
        tile.mesh.position.y = tile.origY - 18;
        tile.mesh.rotation.x *= 0.25;
        tile.mesh.rotation.z *= 0.25;
        tile.slabMesh.material.emissive.setHex(config.CYAN);
        tile.slabMesh.material.emissiveIntensity = 0.5;
        tile.edgeMesh.material.color.setHex(config.CYAN);
        playWarningSound();
      }
    } else if (tile.state === config.TILE_REBUILDING) {
      tile.mesh.position.y += 9.6 * dt;
      const levelFactor = Math.max(0, 1 - dt * 6);
      tile.mesh.rotation.x *= levelFactor;
      tile.mesh.rotation.z *= levelFactor;
      const holoPulse = 0.5 + 0.5 * Math.sin(state.time * 12);
      tile.slabMesh.material.emissiveIntensity = holoPulse;
      tile.edgeMesh.material.opacity = holoPulse;

      if (tile.mesh.position.y >= tile.origY) {
        tile.mesh.position.y = tile.origY;
        tile.mesh.rotation.set(0, 0, 0);
        tile.state = config.TILE_INTACT;
        tile.timer = 0;
        tile.regenTimer = 0;
        burst(new THREE.Vector3(tile.center.x, 0.1, tile.center.z), config.CYAN, 16, 6);
      }
    }
  }
  sectorHazardBuilder.update(dt, { player: state.player, foes: state.foes });
}

export function rebuildArenaTiles() {
  for (const tile of tiles.values()) {
    tile.state = config.TILE_INTACT;
    tile.timer = 0;
    tile.regenTimer = 0;
    tile.fallSpeed = 0;
    tile.mesh.position.y = tile.origY;
    tile.mesh.rotation.set(0, 0, 0);
    tile.mesh.visible = true;
    if (tile.delegate) {
      releaseDelegate(tile);
    }
  }
  instancedSlabs.instanceMatrix.needsUpdate = true;
  instancedEdges.instanceMatrix.needsUpdate = true;
  if (state.activeGridId) {
    applySectorArena(state.activeGridId);
  }
}

export function applySectorArena(gridId) {
  state.activeGridId = gridId;
  const theme = sectorHazardBuilder.getTheme(gridId);
  if (theme) {
    tileMatIntact.color.setHex(theme.floorColor);
    tileMatIntact.roughness = theme.roughness;
    tileMatIntact.metalness = theme.metalness;
    tileEdgeMatIntact.color.setHex(theme.edgeColor);
    tileMatIntact.needsUpdate = true;
    tileEdgeMatIntact.needsUpdate = true;

    for (const d of delegatePool) {
      if (!d.inUse) {
        d.warningSlabMat.color.setHex(theme.floorColor);
        d.warningSlabMat.roughness = theme.roughness;
        d.warningSlabMat.metalness = theme.metalness;
        d.warningEdgeMat.color.setHex(theme.edgeColor);
      }
    }
  }
  sectorHazardBuilder.applySectorTheme(gridId, tiles, walls);
  sectorHazardBuilder.buildSectorHazards(gridId, scene, tiles);
}

export function teardownSectorArena() {
  state.activeGridId = null;
  sectorHazardBuilder.teardown(scene);
  wallMat.color.setHex(0x04141c);
  glowMat.color.setHex(config.CYAN);
  tileMatIntact.color.setHex(0x07202c);
  tileMatIntact.roughness = 0.28;
  tileMatIntact.metalness = 0.8;
  tileEdgeMatIntact.color.setHex(0x187588);
  tileMatIntact.needsUpdate = true;
  tileEdgeMatIntact.needsUpdate = true;

  for (const d of delegatePool) {
    d.warningSlabMat.color.setHex(0x07202c);
    d.warningSlabMat.roughness = 0.28;
    d.warningSlabMat.metalness = 0.8;
    d.warningEdgeMat.color.setHex(0x187588);
  }

  for (const tile of tiles.values()) {
    tile.warningColor = config.CYAN;
  }
  rebuildArenaTiles();
}

if (typeof window !== 'undefined') {
  window.__tronApplySectorArena = applySectorArena;
  window.__tronTeardownSectorArena = teardownSectorArena;
}
