/**
 * arena_textures.test.js
 * Unit tests for procedural PBR texture generation (ArenaTextures.js).
 * Verifies headless Node null fallback without DOM, wrap-safe heightfield & Sobel normal math,
 * and CanvasTexture creation/disposal when a 2D canvas context is available.
 */

import assert from 'assert';
import * as THREE from '../../vendor/three.module.js';
import {
  isCanvasAvailable,
  buildFoundrySurfaceBuffers,
  heightfieldToNormalRGBA,
  createArenaTextures,
  getArenaTextures,
  disposeArenaTextures
} from '../../src/graphics/ArenaTextures.js';

console.log('--- Running Procedural Arena Textures Test Suite ---');

// =========================================================================
// Group 1: Headless Node Fallback (No DOM / Canvas)
// =========================================================================
console.log('\n[Group 1] Testing Headless Node Fallback...');

assert.strictEqual(isCanvasAvailable(), false, 'Headless Node without document must report no canvas');
assert.strictEqual(createArenaTextures(), null, 'createArenaTextures() must return null safely without DOM');
assert.strictEqual(getArenaTextures(), null, 'getArenaTextures() must return null safely without DOM');
disposeArenaTextures(); // Must not throw

console.log('✓ Group 1: Headless Node fallback verified.');

// =========================================================================
// Group 2: Procedural Heightfield, Roughness, Seam Mask & Sobel Normals
// =========================================================================
console.log('\n[Group 2] Testing Procedural Heightfield & Sobel Normal Math...');

const size = 64;
const { heights, roughness, seamMask } = buildFoundrySurfaceBuffers(size);
assert.strictEqual(heights.length, size * size);
assert.strictEqual(roughness.length, size * size);
assert.strictEqual(seamMask.length, size * size);

for (let i = 0; i < size * size; i++) {
  assert.ok(heights[i] >= 0 && heights[i] <= 1, 'Height sample must stay normalized in [0, 1]');
  assert.ok(roughness[i] >= 0.12 && roughness[i] <= 0.95, 'Roughness sample must stay in physical range');
  assert.ok(seamMask[i] >= 0 && seamMask[i] <= 1, 'Seam mask must stay normalized in [0, 1]');
}

// Center slab pixel should have low seamMask and higher height than recessed seam channel
const centerIdx = (size / 2) * size + (size / 2);
assert.ok(seamMask[centerIdx] < 0.05, 'Center of slab should not emit seam glow');

const normalRGBA = heightfieldToNormalRGBA(heights, size, 2.6);
assert.strictEqual(normalRGBA.length, size * size * 4);
for (let i = 0; i < size * size; i++) {
  const b = normalRGBA[i * 4 + 2];
  const a = normalRGBA[i * 4 + 3];
  assert.ok(b > 128, 'Tangent-space normal Z component must point outward (+Z)');
  assert.strictEqual(a, 255, 'Normal alpha channel must be opaque 255');
}

console.log('✓ Group 2: Heightfield, roughness, seam mask, and Sobel normal math verified.');

// =========================================================================
// Group 3: CanvasTexture Synthesis & Caching with Mock 2D Canvas
// =========================================================================
console.log('\n[Group 3] Testing CanvasTexture Synthesis & Cache Lifecycle...');

const prevDocument = global.document;
const createdCanvases = [];
global.document = {
  createElement(tag) {
    if (tag !== 'canvas') return null;
    const canvas = {
      width: 0,
      height: 0,
      lastPutData: null,
      getContext(kind) {
        if (kind !== '2d') return null;
        return {
          createImageData: (w, h) => ({ width: w, height: h, data: new Uint8ClampedArray(w * h * 4) }),
          putImageData: (imgData) => {
            canvas.lastPutData = imgData;
          }
        };
      }
    };
    createdCanvases.push(canvas);
    return canvas;
  }
};

try {
  disposeArenaTextures();
  assert.strictEqual(isCanvasAvailable(), true, 'Mock 2D canvas should be detected');

  const texSet = getArenaTextures({ size: 64, repeat: 2 });
  assert.ok(texSet, 'getArenaTextures() should synthesize texture set when 2D canvas is available');
  assert.strictEqual(texSet.size, 64);
  assert.ok(texSet.normalMap instanceof THREE.CanvasTexture);
  assert.ok(texSet.roughnessMap instanceof THREE.CanvasTexture);
  assert.ok(texSet.emissiveMap instanceof THREE.CanvasTexture);

  for (const tex of [texSet.normalMap, texSet.roughnessMap, texSet.emissiveMap]) {
    assert.strictEqual(tex.wrapS, THREE.RepeatWrapping);
    assert.strictEqual(tex.wrapT, THREE.RepeatWrapping);
    assert.strictEqual(tex.repeat.x, 2);
    assert.strictEqual(tex.repeat.y, 2);
  }
  assert.strictEqual(texSet.normalMap.colorSpace, THREE.NoColorSpace);
  assert.strictEqual(texSet.roughnessMap.colorSpace, THREE.NoColorSpace);
  assert.strictEqual(texSet.emissiveMap.colorSpace, THREE.SRGBColorSpace);

  // Singleton cache check
  assert.strictEqual(getArenaTextures({ size: 64 }), texSet, 'Repeated getArenaTextures() must return cached instance');
  disposeArenaTextures();
  assert.notStrictEqual(getArenaTextures({ size: 64 }), texSet, 'disposeArenaTextures() must clear cache');
  disposeArenaTextures();
} finally {
  if (prevDocument === undefined) {
    delete global.document;
  } else {
    global.document = prevDocument;
  }
}

console.log('✓ Group 3: CanvasTexture synthesis, wrapping, colorSpace, and cache lifecycle verified.');

console.log('\n=============================================================');
console.log('ALL PROCEDURAL ARENA TEXTURES TESTS PASSED (100%)');
console.log('=============================================================');
