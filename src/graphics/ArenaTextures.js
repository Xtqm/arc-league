import * as THREE from '../../vendor/three.module.js';

const DEFAULT_TEXTURE_SIZE = 256;

let cachedTextures = null;

/**
 * Deterministic wrap-safe 2D hash in [0, 1] for periodic noise grids.
 * @param {number} ix
 * @param {number} iy
 * @param {number} period
 * @returns {number}
 */
function wrappedHash(ix, iy, period) {
  const x = ((ix % period) + period) % period;
  const y = ((iy % period) + period) % period;
  const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453123;
  return n - Math.floor(n);
}

/**
 * Tileable bilinear value noise sampled with integer grid periodicity.
 * @param {number} u Normalized [0, 1)
 * @param {number} v Normalized [0, 1)
 * @param {number} freq Integer frequency for seamless tiling
 * @returns {number} Value in [0, 1]
 */
function periodicNoise(u, v, freq) {
  const fx = u * freq;
  const fy = v * freq;
  const x0 = Math.floor(fx);
  const y0 = Math.floor(fy);
  const tx = fx - x0;
  const ty = fy - y0;
  const sx = tx * tx * (3 - 2 * tx);
  const sy = ty * ty * (3 - 2 * ty);

  const n00 = wrappedHash(x0, y0, freq);
  const n10 = wrappedHash(x0 + 1, y0, freq);
  const n01 = wrappedHash(x0, y0 + 1, freq);
  const n11 = wrappedHash(x0 + 1, y0 + 1, freq);

  const nx0 = n00 + (n10 - n00) * sx;
  const nx1 = n01 + (n11 - n01) * sx;
  return nx0 + (nx1 - nx0) * sy;
}

function smoothstep(edge0, edge1, x) {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

/**
 * Computes signed distance to a chamfered square ring centered at (0.5, 0.5).
 * @param {number} u
 * @param {number} v
 * @param {number} halfExtent
 * @param {number} chamfer
 * @returns {number}
 */
function chamferSquareDistance(u, v, halfExtent, chamfer) {
  const dx = Math.abs(u - 0.5);
  const dy = Math.abs(v - 0.5);
  const ortho = Math.max(dx, dy) - halfExtent;
  const diag = (dx + dy) * 0.70710678 - (halfExtent * 1.41421356 - chamfer);
  return Math.max(ortho, diag);
}

/**
 * Evaluates procedural foundry surface height, roughness, and recessed seam mask
 * for normalized tile coordinates (u, v) in [0, 1).
 *
 * @param {number} size
 * @returns {{ heights: Float32Array, roughness: Float32Array, seamMask: Float32Array }}
 */
export function buildFoundrySurfaceBuffers(size = DEFAULT_TEXTURE_SIZE) {
  const count = size * size;
  const heights = new Float32Array(count);
  const roughness = new Float32Array(count);
  const seamMask = new Float32Array(count);

  for (let y = 0; y < size; y++) {
    const v = y / size;
    for (let x = 0; x < size; x++) {
      const u = x / size;
      const idx = y * size + x;

      // Multi-octave tileable basalt + brushed metal micro-grain
      const coarse = periodicNoise(u, v, 8);
      const medium = periodicNoise(u, v, 24);
      const fine = periodicNoise(u, v, 64);
      const brushed = periodicNoise(u * 0.5, v * 2.0, 32);
      const grain = coarse * 0.45 + medium * 0.35 + fine * 0.2;

      // Outer tile chamfer bevel & perimeter seam
      const edgeDist = Math.min(u, 1 - u, v, 1 - v);
      const perimeterBevel = smoothstep(0.012, 0.055, edgeDist);
      const perimeterRimHighlight = smoothstep(0.04, 0.075, edgeDist) * (1 - smoothstep(0.075, 0.13, edgeDist));

      // Recessed chamfered-octagon magnetic circuit channel inside slab
      const ringDist = Math.abs(chamferSquareDistance(u, v, 0.31, 0.085));
      const innerSeam = 1 - smoothstep(0.008, 0.022, ringDist);

      // Cardinal magnetic conduit bridges connecting inner circuit to perimeter
      const cx = Math.abs(u - 0.5);
      const cy = Math.abs(v - 0.5);
      const outerSpan = Math.max(cx, cy);
      const bridgeMask =
        outerSpan > 0.31 && outerSpan < 0.48
          ? Math.max(1 - smoothstep(0.008, 0.02, cx), 1 - smoothstep(0.008, 0.02, cy))
          : 0;

      // Corner anchor socket notches
      const cornerDist = Math.hypot(Math.abs(u - 0.5) - 0.36, Math.abs(v - 0.5) - 0.36);
      const cornerNode = 1 - smoothstep(0.018, 0.036, cornerDist);

      const recessedChannel = Math.max(innerSeam, bridgeMask * 0.85, cornerNode * 0.9);
      const perimeterSeam = (1 - smoothstep(0.004, 0.016, edgeDist)) * 0.65;

      // Height combines raised slab bevel, subtle plate relief, and carved channels
      let h = 0.68 + (grain - 0.5) * 0.12 + (brushed - 0.5) * 0.04;
      h *= 0.45 + 0.55 * perimeterBevel;
      h += perimeterRimHighlight * 0.1;
      h -= recessedChannel * 0.46;

      // Roughness: polished chamfer ribs (~0.24), matte basalt interior (~0.56), rough grooves (~0.82)
      let r = 0.52 + (grain - 0.5) * 0.18 + (brushed - 0.5) * 0.08;
      r -= perimeterRimHighlight * 0.24;
      r += recessedChannel * 0.28 + (1 - perimeterBevel) * 0.18;

      // Emissive mask concentrated strictly inside recessed seams & corner nodes
      const seam = Math.max(recessedChannel, perimeterSeam);

      heights[idx] = Math.max(0, Math.min(1, h));
      roughness[idx] = Math.max(0.12, Math.min(0.95, r));
      seamMask[idx] = Math.max(0, Math.min(1, seam));
    }
  }

  return { heights, roughness, seamMask };
}

/**
 * Converts a periodic scalar heightfield to a tangent-space normal RGBA buffer
 * using a wrap-around 3x3 Sobel filter so tile edges remain seamless.
 *
 * @param {Float32Array} heights
 * @param {number} size
 * @param {number} [strength=2.6]
 * @returns {Uint8ClampedArray}
 */
export function heightfieldToNormalRGBA(heights, size, strength = 2.6) {
  const rgba = new Uint8ClampedArray(size * size * 4);
  const sample = (x, y) => {
    const wx = ((x % size) + size) % size;
    const wy = ((y % size) + size) % size;
    return heights[wy * size + wx];
  };

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const tl = sample(x - 1, y - 1);
      const t = sample(x, y - 1);
      const tr = sample(x + 1, y - 1);
      const l = sample(x - 1, y);
      const r = sample(x + 1, y);
      const bl = sample(x - 1, y + 1);
      const b = sample(x, y + 1);
      const br = sample(x + 1, y + 1);

      const dx = (tr + 2 * r + br) - (tl + 2 * l + bl);
      const dy = (bl + 2 * b + br) - (tl + 2 * t + tr);

      let nx = -dx * strength;
      let ny = -dy * strength;
      let nz = 1.0;
      const invLen = 1.0 / Math.hypot(nx, ny, nz);
      nx *= invLen;
      ny *= invLen;
      nz *= invLen;

      const out = (y * size + x) * 4;
      rgba[out] = Math.round((nx * 0.5 + 0.5) * 255);
      rgba[out + 1] = Math.round((ny * 0.5 + 0.5) * 255);
      rgba[out + 2] = Math.round((nz * 0.5 + 0.5) * 255);
      rgba[out + 3] = 255;
    }
  }

  return rgba;
}

/**
 * Checks whether a 2D HTMLCanvasElement context can be created in the current runtime.
 * @returns {boolean}
 */
export function isCanvasAvailable() {
  if (typeof document === 'undefined' || typeof document.createElement !== 'function') {
    return false;
  }
  try {
    const probe = document.createElement('canvas');
    if (!probe || typeof probe.getContext !== 'function') return false;
    const ctx = probe.getContext('2d');
    return !!(ctx && typeof ctx.createImageData === 'function' && typeof ctx.putImageData === 'function');
  } catch (_) {
    return false;
  }
}

function createCanvasTextureFromRGBA(rgba, size, colorSpace = THREE.NoColorSpace, repeat = 1) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx || typeof ctx.createImageData !== 'function' || typeof ctx.putImageData !== 'function') {
    return null;
  }

  const imageData = ctx.createImageData(size, size);
  if (imageData && imageData.data && typeof imageData.data.set === 'function') {
    imageData.data.set(rgba);
  }
  ctx.putImageData(imageData, 0, 0);

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(repeat, repeat);
  texture.colorSpace = colorSpace;
  texture.anisotropy = 4;
  texture.needsUpdate = true;
  return texture;
}

function scalarToGrayscaleRGBA(buffer, size, gain = 1.0) {
  const rgba = new Uint8ClampedArray(size * size * 4);
  for (let i = 0; i < size * size; i++) {
    const v = Math.round(Math.max(0, Math.min(1, buffer[i] * gain)) * 255);
    const out = i * 4;
    rgba[out] = v;
    rgba[out + 1] = v;
    rgba[out + 2] = v;
    rgba[out + 3] = 255;
  }
  return rgba;
}

/**
 * Synthesizes tileable procedural PBR maps (`normalMap`, `roughnessMap`, `emissiveMap`)
 * for Arcfield floor slabs, containment walls, and foundry structures.
 * Returns `null` safely in headless Node environments without a 2D canvas.
 *
 * @param {object} [options]
 * @param {number} [options.size=256]
 * @param {number} [options.normalStrength=2.6]
 * @param {number} [options.repeat=1]
 * @returns {{
 *   size: number,
 *   normalMap: THREE.CanvasTexture,
 *   roughnessMap: THREE.CanvasTexture,
 *   emissiveMap: THREE.CanvasTexture,
 *   dispose: () => void
 * } | null}
 */
export function createArenaTextures(options = {}) {
  if (!isCanvasAvailable()) {
    return null;
  }

  const size = Number.isFinite(options.size) && options.size >= 32
    ? Math.floor(options.size)
    : DEFAULT_TEXTURE_SIZE;
  const normalStrength = Number.isFinite(options.normalStrength) ? options.normalStrength : 2.6;
  const repeat = Number.isFinite(options.repeat) ? options.repeat : 1;

  try {
    const { heights, roughness, seamMask } = buildFoundrySurfaceBuffers(size);
    const normalRGBA = heightfieldToNormalRGBA(heights, size, normalStrength);
    const roughnessRGBA = scalarToGrayscaleRGBA(roughness, size, 1.0);
    const emissiveRGBA = scalarToGrayscaleRGBA(seamMask, size, 1.0);

    const normalMap = createCanvasTextureFromRGBA(normalRGBA, size, THREE.NoColorSpace, repeat);
    const roughnessMap = createCanvasTextureFromRGBA(roughnessRGBA, size, THREE.NoColorSpace, repeat);
    const emissiveMap = createCanvasTextureFromRGBA(emissiveRGBA, size, THREE.SRGBColorSpace, repeat);

    if (!normalMap || !roughnessMap || !emissiveMap) {
      if (normalMap) normalMap.dispose();
      if (roughnessMap) roughnessMap.dispose();
      if (emissiveMap) emissiveMap.dispose();
      return null;
    }

    return {
      size,
      normalMap,
      roughnessMap,
      emissiveMap,
      dispose() {
        normalMap.dispose();
        roughnessMap.dispose();
        emissiveMap.dispose();
      }
    };
  } catch (err) {
    console.warn('[ArenaTextures] Procedural texture generation unavailable:', err);
    return null;
  }
}

/**
 * Returns a cached singleton instance of procedural arena PBR maps (or `null` in headless Node).
 * @param {object} [options]
 * @returns {ReturnType<typeof createArenaTextures>}
 */
export function getArenaTextures(options = {}) {
  if (cachedTextures) return cachedTextures;
  cachedTextures = createArenaTextures(options);
  return cachedTextures;
}

/**
 * Disposes cached procedural arena textures and clears the singleton cache.
 */
export function disposeArenaTextures() {
  if (cachedTextures) {
    cachedTextures.dispose();
    cachedTextures = null;
  }
}
