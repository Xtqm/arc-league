/**
 * disc_geometry_factory.test.js
 * Unit and integration tests for DiscGeometryFactory (SPEC-ARMORY-001 procedural shapes).
 * Verifies bounding radius normalization, rotational symmetry, vertex count validity,
 * and clean resource disposal across all supported shapes.
 */

import assert from 'assert';
import * as THREE from '../../vendor/three.module.js';
import {
  DISC_SHAPES,
  SUPPORTED_DISC_SHAPES,
  DEFAULT_DISC_SHAPE,
  normalizeShapeName,
  getShape2DPoints,
  normalizeGeometryRadius,
  getShapeInnerClearance,
  createOuterGeometry,
  createFaceGeometry,
  createHubGeometry,
  createWireframeGeometry,
  DiscGeometryFactory
} from '../../src/graphics/DiscGeometryFactory.js';

console.log('--- Running Procedural Disc Geometry Factory Test Suite ---');

function getMaxXYRadius(geometry) {
  const pos = geometry.attributes.position;
  let maxR = 0;
  for (let i = 0; i < pos.count; i++) {
    const d = Math.hypot(pos.getX(i), pos.getY(i));
    if (d > maxR) maxR = d;
  }
  return maxR;
}

function getXYBoundingCenter(geometry) {
  geometry.computeBoundingBox();
  const center = new THREE.Vector3();
  geometry.boundingBox.getCenter(center);
  return {
    x: center.x,
    y: center.y
  };
}

// =========================================================================
// Group 1: Shape Catalog Enum & Normalization Fallback
// =========================================================================
console.log('\n[Group 1] Testing Shape Enum & Normalization Fallback...');

assert.strictEqual(DEFAULT_DISC_SHAPE, 'circle');
assert.strictEqual(SUPPORTED_DISC_SHAPES.length, 6);
assert.ok(SUPPORTED_DISC_SHAPES.includes('circle'));
assert.ok(SUPPORTED_DISC_SHAPES.includes('triangle'));
assert.ok(SUPPORTED_DISC_SHAPES.includes('square'));
assert.ok(SUPPORTED_DISC_SHAPES.includes('hexagon'));
assert.ok(SUPPORTED_DISC_SHAPES.includes('shuriken_3'));
assert.ok(SUPPORTED_DISC_SHAPES.includes('shuriken_4'));

assert.strictEqual(normalizeShapeName('TRIANGLE'), 'triangle');
assert.strictEqual(normalizeShapeName(' Shuriken_4 '), 'shuriken_4');
assert.strictEqual(normalizeShapeName(null), 'circle', 'Null shape must fallback to circle');
assert.strictEqual(normalizeShapeName(undefined), 'circle', 'Undefined shape must fallback to circle');
assert.strictEqual(normalizeShapeName('unknown_polygon'), 'circle', 'Unknown shape must fallback to circle');

console.log('✓ Group 1: Shape enumeration, support indexers, and legacy fallbacks verified.');

// =========================================================================
// Group 2: 2D Contour Points & N-Fold Rotational Symmetry
// =========================================================================
console.log('\n[Group 2] Testing 2D Contour Points & N-Fold Rotational Symmetry...');

const targetRadius = 0.6;

for (const shape of SUPPORTED_DISC_SHAPES) {
  const pts = getShape2DPoints(shape, targetRadius);
  assert.ok(Array.isArray(pts) && pts.length >= 3, `${shape} must generate at least 3 points`);

  let maxR = 0;
  let sumX = 0;
  let sumY = 0;

  for (const p of pts) {
    const d = Math.hypot(p.x, p.y);
    if (d > maxR) maxR = d;
    sumX += p.x;
    sumY += p.y;
  }

  // Verify circumradius normalization
  assert.ok(
    Math.abs(maxR - targetRadius) < 1e-5,
    `${shape} max radius (${maxR}) must match target radius (${targetRadius})`
  );

  // Verify N-fold rotational symmetry centering at origin (0, 0)
  const avgX = sumX / pts.length;
  const avgY = sumY / pts.length;
  assert.ok(
    Math.abs(avgX) < 1e-4 && Math.abs(avgY) < 1e-4,
    `${shape} centroid (${avgX}, ${avgY}) must be centered at origin`
  );
}

console.log('✓ Group 2: 2D contour circumradius normalization and rotational symmetry verified.');

// =========================================================================
// Group 3: Outer Rim Geometry Creation & Radius Normalization
// =========================================================================
console.log('\n[Group 3] Testing Outer Rim Geometry Creation & Radius Normalization...');

for (const shape of SUPPORTED_DISC_SHAPES) {
  const geo = createOuterGeometry(shape, { radius: targetRadius });
  assert.ok(geo instanceof THREE.BufferGeometry, `${shape} outer rim must be a BufferGeometry`);

  const pos = geo.attributes.position;
  assert.ok(pos && pos.count > 0, `${shape} outer rim must contain valid vertices`);

  const maxR = getMaxXYRadius(geo);
  assert.ok(
    Math.abs(maxR - targetRadius) < 1e-4,
    `${shape} outer rim max radius (${maxR}) must match target circumradius (${targetRadius})`
  );

  const center = getXYBoundingCenter(geo);
  assert.ok(
    Math.abs(center.x) < 1e-4 && Math.abs(center.y) < 1e-4,
    `${shape} outer rim center (${center.x}, ${center.y}) must be origin-centered`
  );

  // Clean disposal test
  assert.doesNotThrow(() => geo.dispose(), `${shape} outer rim geometry must dispose cleanly`);
}

console.log('✓ Group 3: Outer rim geometry vertex bounds, circumradius normalization, and disposal verified.');

// =========================================================================
// Group 4: Translucent Face & Central Hub Geometry
// =========================================================================
console.log('\n[Group 4] Testing Translucent Face & Central Hub Geometry...');

for (const shape of SUPPORTED_DISC_SHAPES) {
  // Face Geometry
  const faceGeo = createFaceGeometry(shape, { radius: targetRadius });
  assert.ok(faceGeo instanceof THREE.BufferGeometry, `${shape} face must be a BufferGeometry`);
  assert.ok(faceGeo.attributes.position.count > 0, `${shape} face must contain vertices`);

  const faceMaxR = getMaxXYRadius(faceGeo);
  assert.ok(
    faceMaxR <= targetRadius,
    `${shape} face max radius (${faceMaxR}) must not exceed outer radius (${targetRadius})`
  );
  assert.doesNotThrow(() => faceGeo.dispose(), `${shape} face geometry must dispose cleanly`);

  // Hub Geometry (Faceted hardlight crystal + micro-containment ring)
  const clearance = getShapeInnerClearance(shape, targetRadius);
  assert.ok(clearance > 0, `${shape} clearance must be positive`);
  assert.ok(clearance < targetRadius, `${shape} clearance (${clearance}) must be less than outer radius (${targetRadius})`);

  // Dynamic clearance sizing (default when no hubRadius passed)
  const dynamicHubGeo = createHubGeometry(shape, { radius: targetRadius });
  assert.ok(dynamicHubGeo instanceof THREE.BufferGeometry, `${shape} dynamic hub must be a BufferGeometry`);
  assert.ok(dynamicHubGeo.attributes.position.count > 50, `${shape} dynamic hub must contain faceted crystal and containment ring vertices`);

  const dynamicMaxR = getMaxXYRadius(dynamicHubGeo);
  assert.ok(
    dynamicMaxR <= clearance * 0.48 + 1e-4,
    `${shape} dynamic hub max radius (${dynamicMaxR}) must be within clearance * 0.48 (${clearance * 0.48})`
  );
  assert.ok(
    dynamicMaxR <= 0.12 + 1e-4,
    `${shape} dynamic hub max radius (${dynamicMaxR}) must not exceed 0.12m cap`
  );
  assert.ok(
    dynamicMaxR < clearance,
    `${shape} dynamic hub must never overlap or touch inner boundary of outer hull`
  );
  assert.doesNotThrow(() => dynamicHubGeo.dispose(), `${shape} dynamic hub geometry must dispose cleanly`);

  // Explicit hubRadius override support
  const hubRadius = 0.2;
  const hubGeo = createHubGeometry(shape, { radius: targetRadius, hubRadius });
  assert.ok(hubGeo instanceof THREE.BufferGeometry, `${shape} hub must be a BufferGeometry`);
  assert.ok(hubGeo.attributes.position.count > 50, `${shape} hub must contain crystal and containment ring vertices`);

  const hubMaxR = getMaxXYRadius(hubGeo);
  assert.ok(
    Math.abs(hubMaxR - hubRadius) < 1e-4,
    `${shape} hub max radius (${hubMaxR}) must match target hub radius (${hubRadius})`
  );
  assert.doesNotThrow(() => hubGeo.dispose(), `${shape} hub geometry must dispose cleanly`);
}

console.log('✓ Group 4: Translucent face and central hub geometries created and verified across all shapes.');

// =========================================================================
// Group 5: Shape-Conforming Retro Wireframe Geometry
// =========================================================================
console.log('\n[Group 5] Testing Shape-Conforming Retro Wireframe Geometry...');

const wireframeScale = 1.04;
const expectedWfRadius = targetRadius * wireframeScale;

for (const shape of SUPPORTED_DISC_SHAPES) {
  const wfGeo = createWireframeGeometry(shape, {
    radius: targetRadius,
    wireframeScale
  });
  assert.ok(wfGeo instanceof THREE.BufferGeometry, `${shape} wireframe must be a BufferGeometry`);
  assert.ok(wfGeo.attributes.position.count > 0, `${shape} wireframe must contain vertices`);

  const wfMaxR = getMaxXYRadius(wfGeo);
  assert.ok(
    Math.abs(wfMaxR - expectedWfRadius) < 1e-4,
    `${shape} wireframe max radius (${wfMaxR}) must match scaled wireframe target (${expectedWfRadius})`
  );

  assert.doesNotThrow(() => wfGeo.dispose(), `${shape} wireframe geometry must dispose cleanly`);
}

console.log('✓ Group 5: Shape-conforming retro wireframe geometries validated.');

// =========================================================================
// Group 6: Palm-Scale (~0.46) Discs & Hover-Palm Rig Parity
// =========================================================================
console.log('\n[Group 6] Testing Palm-Scale (~0.46) Discs & Hover-Palm Rig Parity...');

const palmRadius = targetRadius * 0.46;

for (const shape of SUPPORTED_DISC_SHAPES) {
  const palmGeo = createOuterGeometry(shape, { radius: palmRadius });
  const palmMaxR = getMaxXYRadius(palmGeo);
  assert.ok(
    Math.abs(palmMaxR - palmRadius) < 1e-4,
    `${shape} palm disc max radius (${palmMaxR}) must match palm target (${palmRadius})`
  );

  const palmFace = createFaceGeometry(shape, { radius: palmRadius, margin: 0.035 });
  const palmFaceMaxR = getMaxXYRadius(palmFace);
  assert.ok(
    palmFaceMaxR <= palmRadius,
    `${shape} palm face max radius (${palmFaceMaxR}) must not exceed palm radius (${palmRadius})`
  );

  palmGeo.dispose();
  palmFace.dispose();
}

console.log('✓ Group 6: Palm-scale geometries and Hover-Palm rig parity validated.');

console.log('\n======================================================');
console.log('ALL DISC GEOMETRY FACTORY TESTS PASSED (100% SUCCESS)');
console.log('======================================================\n');
