import * as THREE from '../../vendor/three.module.js';
import { config } from '../core/config.js';
import { wallMat, trimMat, glowMat } from './materials.js';
import { isCanvasAvailable } from './ArenaTextures.js';
import { loadArenaAsset, canLoadExternalModels } from './ArenaAssetLoader.js';

const SEGMENT_COUNT = 16;
const PYLON_COUNT = 16;
const STADIUM_RADIUS = 86;
const PYLON_RADIUS = 82;
const CHASM_FLOOR_Y = -21;

function buildRadialChasmTexture(size = 256) {
  if (!isCanvasAvailable()) return null;
  try {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    const half = size * 0.5;
    const grad = ctx.createRadialGradient(half, half, size * 0.05, half, half, half);
    grad.addColorStop(0.0, '#10546e');
    grad.addColorStop(0.35, '#072a3b');
    grad.addColorStop(0.7, '#020e17');
    grad.addColorStop(1.0, '#010408');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.needsUpdate = true;
    return tex;
  } catch (_) {
    return null;
  }
}

function buildChasmMistTexture(size = 256) {
  if (!isCanvasAvailable()) return null;
  try {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    const img = ctx.createImageData(size, size);
    const data = img.data;
    const twoPi = Math.PI * 2;
    for (let y = 0; y < size; y++) {
      const ny = y / size;
      for (let x = 0; x < size; x++) {
        const nx = x / size;
        // Seamless multi-frequency periodic mist waves
        const w1 = Math.sin(nx * twoPi * 2 + Math.cos(ny * twoPi * 2));
        const w2 = Math.cos(ny * twoPi * 3 - Math.sin(nx * twoPi * 3));
        const w3 = Math.sin((nx + ny) * twoPi * 5) * 0.5;
        const n = Math.max(0, Math.min(1, 0.5 + (w1 + w2 + w3) * 0.22));
        const alpha = Math.round(Math.pow(n, 1.35) * 185);
        const idx = (y * size + x) * 4;
        data[idx] = 175;
        data[idx + 1] = 235;
        data[idx + 2] = 255;
        data[idx + 3] = alpha;
      }
    }
    ctx.putImageData(img, 0, 0);

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(3, 3);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.needsUpdate = true;
    return tex;
  } catch (_) {
    return null;
  }
}

function computeRadialTransformMatrix(index, count, radius, yOffset = 0) {
  const angle = (index / count) * Math.PI * 2;
  const mat = new THREE.Matrix4();
  const pos = new THREE.Vector3(Math.sin(angle) * radius, yOffset, Math.cos(angle) * radius);
  const quat = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, angle, 0));
  const scale = new THREE.Vector3(1, 1, 1);
  mat.compose(pos, quat, scale);
  return mat;
}

/**
 * Renders the 360-degree Magnetic Colosseum stadium backdrop, illuminated Null Void chasm floor,
 * and quality-gated scrolling chasm mist layers around the Arcfield perimeter.
 */
export class ArenaBackdrop {
  /**
   * @param {object} [options]
   * @param {THREE.Scene|null} [options.scene=null]
   * @param {number} [options.segmentCount=16]
   * @param {number} [options.pylonCount=16]
   */
  constructor(options = {}) {
    this.scene = options.scene || null;
    this.segmentCount = options.segmentCount || SEGMENT_COUNT;
    this.pylonCount = options.pylonCount || PYLON_COUNT;
    this.isHydrated = false;
    this.isDisposed = false;

    this.group = new THREE.Group();
    this.group.name = 'ArenaBackdrop';

    this.stadiumGroup = new THREE.Group();
    this.stadiumGroup.name = 'StadiumColosseumRing';
    this.group.add(this.stadiumGroup);

    this.mistGroup = new THREE.Group();
    this.mistGroup.name = 'ChasmMistLayers';
    this.group.add(this.mistGroup);

    this._segmentMatrices = [];
    for (let i = 0; i < this.segmentCount; i++) {
      this._segmentMatrices.push(computeRadialTransformMatrix(i, this.segmentCount, STADIUM_RADIUS, 0));
    }

    this._pylonMatrices = [];
    for (let i = 0; i < this.pylonCount; i++) {
      this._pylonMatrices.push(computeRadialTransformMatrix(i + 0.5, this.pylonCount, PYLON_RADIUS, 0));
    }

    this._ownedGeometries = [];
    this._ownedMaterials = [];
    this._ownedTextures = [];
    this._hydrationMeshes = [];

    this.chasmFloorMesh = null;
    this.chasmFloorMat = null;
    this.mistPlanes = [];
    this.mistMaterials = [];
    this.mistEnabled = true;
    this.mistOpacityScale = 1.0;

    this._buildChasmFloor();
    this._buildMistPlanes();
    this._buildProceduralBackdrop();

    if (this.scene && typeof this.scene.add === 'function') {
      this.scene.add(this.group);
    }
  }

  _buildChasmFloor() {
    const chasmTex = buildRadialChasmTexture(256);
    if (chasmTex) this._ownedTextures.push(chasmTex);

    const chasmGeo = new THREE.CircleGeometry(155, 48);
    this._ownedGeometries.push(chasmGeo);

    this.chasmFloorMat = new THREE.MeshBasicMaterial({
      color: chasmTex ? 0xffffff : 0x052433,
      map: chasmTex,
      fog: true
    });
    this._ownedMaterials.push(this.chasmFloorMat);

    this.chasmFloorMesh = new THREE.Mesh(chasmGeo, this.chasmFloorMat);
    this.chasmFloorMesh.name = 'NullVoidChasmFloor';
    this.chasmFloorMesh.rotation.x = -Math.PI / 2;
    this.chasmFloorMesh.position.y = CHASM_FLOOR_Y;
    this.chasmFloorMesh.receiveShadow = false;
    this.group.add(this.chasmFloorMesh);
  }

  _buildMistPlanes() {
    const mistTex = buildChasmMistTexture(256);
    if (mistTex) this._ownedTextures.push(mistTex);

    const layerDefs = [
      { y: -3.2, baseOpacity: 0.14, speedX: 0.012, speedY: 0.008, color: 0x1e88a8 },
      { y: -9.0, baseOpacity: 0.11, speedX: -0.009, speedY: 0.013, color: 0x0e5d7a }
    ];

    for (let i = 0; i < layerDefs.length; i++) {
      const def = layerDefs[i];
      const geo = new THREE.PlaneGeometry(210, 210);
      this._ownedGeometries.push(geo);

      const mat = new THREE.MeshBasicMaterial({
        color: def.color,
        map: mistTex,
        transparent: true,
        opacity: def.baseOpacity,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide
      });
      this._ownedMaterials.push(mat);

      const plane = new THREE.Mesh(geo, mat);
      plane.name = `ChasmMistPlane_${i}`;
      plane.rotation.x = -Math.PI / 2;
      plane.position.y = def.y;
      plane.userData.baseOpacity = def.baseOpacity;
      plane.userData.scrollSpeedX = def.speedX;
      plane.userData.scrollSpeedY = def.speedY;
      plane.renderOrder = -1;

      this.mistPlanes.push(plane);
      this.mistMaterials.push(mat);
      this.mistGroup.add(plane);
    }
  }

  _buildProceduralBackdrop() {
    this._clearStadiumChildren();

    // Procedural tiered colosseum segment silhouette
    const segGeo = new THREE.BoxGeometry(34.5, 48, 12);
    const segBandGeo = new THREE.BoxGeometry(34.5, 1.4, 12.6);
    const pylonGeo = new THREE.BoxGeometry(4.4, 68, 4.8);
    const pylonStripGeo = new THREE.BoxGeometry(0.8, 62, 5.1);

    this._proceduralGeos = [segGeo, segBandGeo, pylonGeo, pylonStripGeo];

    const segMesh = new THREE.InstancedMesh(segGeo, wallMat, this.segmentCount);
    const segBandMesh = new THREE.InstancedMesh(segBandGeo, glowMat, this.segmentCount);
    const pylonMesh = new THREE.InstancedMesh(pylonGeo, wallMat, this.pylonCount);
    const pylonStripMesh = new THREE.InstancedMesh(pylonStripGeo, glowMat, this.pylonCount);

    const bandOffset = new THREE.Matrix4().makeTranslation(0, 14.5, 0);
    const segOffset = new THREE.Matrix4().makeTranslation(0, 6, 0);
    const pylonOffset = new THREE.Matrix4().makeTranslation(0, 16, 0);
    const tmp = new THREE.Matrix4();

    for (let i = 0; i < this.segmentCount; i++) {
      tmp.multiplyMatrices(this._segmentMatrices[i], segOffset);
      segMesh.setMatrixAt(i, tmp);
      tmp.multiplyMatrices(this._segmentMatrices[i], bandOffset);
      segBandMesh.setMatrixAt(i, tmp);
    }
    for (let i = 0; i < this.pylonCount; i++) {
      tmp.multiplyMatrices(this._pylonMatrices[i], pylonOffset);
      pylonMesh.setMatrixAt(i, tmp);
      pylonStripMesh.setMatrixAt(i, tmp);
    }

    for (const m of [segMesh, segBandMesh, pylonMesh, pylonStripMesh]) {
      m.frustumCulled = false;
      m.instanceMatrix.needsUpdate = true;
      this.stadiumGroup.add(m);
    }
    this.isHydrated = false;
  }

  _clearStadiumChildren() {
    while (this.stadiumGroup.children.length > 0) {
      this.stadiumGroup.remove(this.stadiumGroup.children[0]);
    }
    if (this._proceduralGeos) {
      for (const g of this._proceduralGeos) g.dispose();
      this._proceduralGeos = null;
    }
    this._hydrationMeshes.length = 0;
  }

  _buildInstancedFromAsset(asset, matrices, namePrefix) {
    if (!asset || !asset.scene) return [];
    const created = [];
    asset.scene.traverse((child) => {
      if (!child.isMesh || !child.geometry) return;
      const inst = new THREE.InstancedMesh(child.geometry, child.material, matrices.length);
      inst.name = `${namePrefix}_${child.userData.foundrySlot || 'mesh'}`;
      inst.userData.foundrySlot = child.userData.foundrySlot || 'Foundry_Armor';
      inst.frustumCulled = false;
      for (let i = 0; i < matrices.length; i++) {
        inst.setMatrixAt(i, matrices[i]);
      }
      inst.instanceMatrix.needsUpdate = true;
      created.push(inst);
    });
    return created;
  }

  /**
   * Asynchronously hydrates `stadium_segment.glb` and `stadium_pylon.glb` around the arena
   * using radial `InstancedMesh` batches while retaining procedural silhouettes on fallback.
   *
   * @param {object} [options]
   * @returns {Promise<boolean>}
   */
  async hydrate(options = {}) {
    if (this.isDisposed) return false;
    if (!options.loader && !options.arrayBuffer && !canLoadExternalModels()) {
      return false;
    }

    const foundryMaterials = {
      Foundry_Armor: wallMat,
      Foundry_Trim: trimMat,
      Foundry_Conduit: glowMat
    };

    const [segAsset, pylonAsset] = await Promise.all([
      loadArenaAsset('stadium_segment', { ...options, materials: foundryMaterials }),
      loadArenaAsset('stadium_pylon', { ...options, materials: foundryMaterials })
    ]);

    if ((!segAsset && !pylonAsset) || this.isDisposed) {
      return false;
    }

    this._clearStadiumChildren();

    if (segAsset) {
      const segMeshes = this._buildInstancedFromAsset(segAsset, this._segmentMatrices, 'StadiumSegment');
      for (const m of segMeshes) {
        this.stadiumGroup.add(m);
        this._hydrationMeshes.push(m);
      }
    }
    if (pylonAsset) {
      const pylonMeshes = this._buildInstancedFromAsset(pylonAsset, this._pylonMatrices, 'StadiumPylon');
      for (const m of pylonMeshes) {
        this.stadiumGroup.add(m);
        this._hydrationMeshes.push(m);
      }
    }

    this.isHydrated = true;
    return true;
  }

  /**
   * Updates chasm mist scrolling UV offsets.
   * @param {number} dt
   */
  update(dt) {
    if (!this.mistEnabled || !this.mistGroup.visible || !Number.isFinite(dt) || dt <= 0) return;

    for (const plane of this.mistPlanes) {
      if (!plane.visible) continue;
      const mat = plane.material;
      if (mat && mat.map && mat.map.offset) {
        mat.map.offset.x = (mat.map.offset.x + plane.userData.scrollSpeedX * dt) % 1;
        mat.map.offset.y = (mat.map.offset.y + plane.userData.scrollSpeedY * dt) % 1;
      }
    }
  }

  /**
   * Scales or hides chasm mist planes cleanly based on active graphics preset & particle toggles.
   * @param {object} [settings]
   */
  applyQualitySettings(settings = {}) {
    const preset = String(settings.graphicsPreset || settings.preset || 'high').toLowerCase();
    const particlesOn = settings.particles !== false;
    const explicitMist = settings.chasmMist;
    const budget = Number.isFinite(Number(settings.particleBudget)) ? Number(settings.particleBudget) : 1.0;

    if (!particlesOn || preset === 'competitive' || explicitMist === false) {
      this.mistEnabled = false;
      this.mistOpacityScale = 0;
      this.mistGroup.visible = false;
      for (const plane of this.mistPlanes) {
        plane.visible = false;
      }
      return;
    }

    let scale = 1.0;
    let maxLayers = this.mistPlanes.length;
    if (preset === 'ultra') {
      scale = 1.0;
    } else if (preset === 'high') {
      scale = 0.85;
    } else if (preset === 'medium') {
      scale = 0.6;
    } else if (preset === 'low') {
      scale = 0.4;
      maxLayers = 1;
    } else {
      scale = THREE.MathUtils.clamp(budget, 0.1, 1.0);
      if (scale < 0.45) maxLayers = 1;
    }

    this.mistEnabled = true;
    this.mistOpacityScale = scale;
    this.mistGroup.visible = true;

    for (let i = 0; i < this.mistPlanes.length; i++) {
      const plane = this.mistPlanes[i];
      const active = i < maxLayers;
      plane.visible = active;
      if (plane.material && plane.userData.baseOpacity !== undefined) {
        plane.material.opacity = plane.userData.baseOpacity * scale;
      }
    }
  }

  /**
   * Updates chasm floor and mist accents to match an active campaign sector palette.
   * @param {number} chasmHex
   * @param {number} [mistHex]
   */
  setChasmColor(chasmHex, mistHex = chasmHex) {
    if (this.chasmFloorMat && this.chasmFloorMat.color) {
      this.chasmFloorMat.color.setHex(this.chasmFloorMat.map ? 0xffffff : chasmHex);
    }
    for (const mat of this.mistMaterials) {
      if (mat && mat.color && mistHex !== undefined) {
        mat.color.setHex(mistHex);
      }
    }
  }

  dispose() {
    this.isDisposed = true;
    this._clearStadiumChildren();
    for (const g of this._ownedGeometries) g.dispose();
    for (const m of this._ownedMaterials) m.dispose();
    for (const t of this._ownedTextures) t.dispose();
    this._ownedGeometries.length = 0;
    this._ownedMaterials.length = 0;
    this._ownedTextures.length = 0;
    if (this.group.parent) {
      this.group.parent.remove(this.group);
    }
  }
}

export { CHASM_FLOOR_Y, STADIUM_RADIUS, PYLON_RADIUS };
