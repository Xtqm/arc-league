import * as THREE from '../../vendor/three.module.js';
import { state } from '../core/state.js';
import { config } from '../core/config.js';
import { scene } from '../graphics/scene.js';
import { wallMat, glowMat, tileMatIntact, tileEdgeMatIntact } from '../graphics/materials.js';
export { tileMatIntact, tileEdgeMatIntact };
import { burst } from '../graphics/particles.js';
import { playWarningSound, playTileDropSound } from '../audio/sfx.js';
import { sectorHazardBuilder } from '../arena/hazards/SectorHazardBuilder.js';
export { sectorHazardBuilder };

function shake(v) {
  state.shakeAmt = Math.min((state.shakeAmt || 0) + v, 0.8);
}

// Map: key `${ix}_${iz}` -> { tileIndex, mesh, slabMesh, edgeMesh, state, timer, origY, ix, iz, center, regenTimer, warningColor, delegate }
export const tiles = new Map();

export const TOTAL_TILES = config.TILE_N * config.TILE_N; // 576

export const tileGeo = new THREE.BoxGeometry(config.TILE_W - 0.08, 0.35, config.TILE_W - 0.08);
export const tileEdgeGeo = new THREE.EdgesGeometry(tileGeo);

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
  delegate.group.visible = tile.mesh ? (tile.mesh.visible !== false) : true;

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
  delegate.inUse = false;
  delegate.tile = null;
  tile.delegate = null;

  tile.mesh = tile._dummyMesh;
  tile.slabMesh = tile._dummySlab;
  tile.edgeMesh = tile._dummyEdge;
  tile._dummyMesh.position.set(tile.center.x, tile.origY, tile.center.z);
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

// Perimeter walls
export const walls = [];
for (let i = 0; i < 4; i++) {
  const w = new THREE.Mesh(new THREE.BoxGeometry(config.ARENA * 2 + 2, 9, 1.4), wallMat);
  const g = new THREE.Mesh(new THREE.BoxGeometry(config.ARENA * 2 + 2, .22, 1.7), glowMat);
  const a = i * Math.PI / 2;
  const p = new THREE.Vector3(Math.sin(a) * config.ARENA, 4.5, Math.cos(a) * config.ARENA);
  w.position.copy(p); w.rotation.y = a; w.receiveShadow = true;
  g.position.set(p.x, 9.1, p.z); g.rotation.y = a;
  scene.add(w, g);
  walls.push({ mesh: w, glow: g });
  for (let k = -config.ARENA + 6; k < config.ARENA; k += 11) {
    const s = new THREE.Mesh(new THREE.BoxGeometry(.18, 8.4, .1), glowMat);
    s.position.set(p.x + Math.cos(a) * k, 4.4, p.z - Math.sin(a) * k);
    s.rotation.y = a; scene.add(s);
  }
}

// Pillars = cover + ricochet cylinders
export const pillars = [];
export const pillarSpots = [[-20,-20],[20,-20],[-20,20],[20,20],[0,-30],[0,30],[-31,0],[31,0]];
for (const [x, z] of pillarSpots) {
  const r = 2.1, h = 6.5;
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, 6), wallMat);
  m.position.set(x, h / 2, z); m.castShadow = true; m.receiveShadow = true; scene.add(m);
  const e = new THREE.Mesh(new THREE.CylinderGeometry(r + .05, r + .05, .2, 6), glowMat);
  e.position.set(x, h, z); scene.add(e);
  pillars.push({ x, z, r });
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
  playTileDropSound();
  shake(0.12);
}

export function updateTiles(dt) {
  for (const tile of tiles.values()) {
    if (tile.state === config.TILE_INTACT) continue;

    if (!tile.delegate) {
      claimDelegate(tile);
    }

    if (tile.state === config.TILE_WARNING) {
      tile.timer -= dt;
      const strobe = 0.5 + 0.5 * Math.sin(state.time * 40);
      const isWhite = Math.sin(state.time * 40) > 0;
      const col = isWhite ? 0xffffff : (tile.warningColor || config.CYAN);

      tile.slabMesh.material.emissive.setHex(col);
      tile.slabMesh.material.emissiveIntensity = 0.5 + strobe * 1.5;
      tile.edgeMesh.material.color.setHex(col);
      tile.edgeMesh.material.opacity = strobe;

      // Shake tile vertically by +-0.05m
      tile.mesh.position.y = tile.origY + Math.sin(state.time * 60) * 0.05;

      if (tile.timer <= 0) {
        tile.state = config.TILE_FALLEN;
        tile.regenTimer = 0;
        tile.mesh.position.y = tile.origY;
        spawnTileDeRezSparks(tile.center.x, tile.center.z);
      }
    } else if (tile.state === config.TILE_FALLEN) {
      tile.mesh.position.y -= 25 * dt;

      if (tile.mesh.position.y <= tile.origY - 15) {
        tile.mesh.visible = false;
      }

      tile.regenTimer = (tile.regenTimer || 0) + dt;
      if (tile.regenTimer >= config.TILE_REGEN_DELAY) {
        tile.state = config.TILE_REBUILDING;
        tile.mesh.visible = true;
        tile.mesh.position.y = tile.origY - 15;
        tile.slabMesh.material.emissive.setHex(config.CYAN);
        tile.slabMesh.material.emissiveIntensity = 0.5;
        tile.edgeMesh.material.color.setHex(config.CYAN);
        playWarningSound();
      }
    } else if (tile.state === config.TILE_REBUILDING) {
      tile.mesh.position.y += 8.0 * dt;
      const holoPulse = 0.5 + 0.5 * Math.sin(state.time * 12);
      tile.slabMesh.material.emissiveIntensity = holoPulse;
      tile.edgeMesh.material.opacity = holoPulse;

      if (tile.mesh.position.y >= tile.origY) {
        tile.mesh.position.y = tile.origY;
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
    tile.mesh.position.y = tile.origY;
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
