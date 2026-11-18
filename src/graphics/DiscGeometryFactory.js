import * as THREE from '../../vendor/three.module.js';
import { config } from '../core/config.js';

/**
 * Procedural Disc Shape Enumeration
 */
export const DISC_SHAPES = Object.freeze({
  CIRCLE: 'circle',
  TRIANGLE: 'triangle',
  SQUARE: 'square',
  HEXAGON: 'hexagon',
  SHURIKEN_3: 'shuriken_3',
  SHURIKEN_4: 'shuriken_4'
});

export const SUPPORTED_DISC_SHAPES = Object.freeze(Object.values(DISC_SHAPES));
export const DEFAULT_DISC_SHAPE = DISC_SHAPES.CIRCLE;

/**
 * Normalizes input shape string to a valid supported shape or defaults to 'circle'.
 * @param {string} [shape]
 * @returns {string}
 */
export function normalizeShapeName(shape) {
  if (typeof shape === 'string') {
    const lower = shape.toLowerCase().trim();
    if (SUPPORTED_DISC_SHAPES.includes(lower)) {
      return lower;
    }
  }
  return DEFAULT_DISC_SHAPE;
}

/**
 * Generates an array of 2D points (THREE.Vector2) in the XY plane representing the
 * outer contour of the specified procedural cyber-shape with N-fold rotational symmetry.
 * @param {string} shape
 * @param {number} radius
 * @returns {THREE.Vector2[]}
 */
export function getShape2DPoints(shape, radius = config.DISC_R || 0.6) {
  const normShape = normalizeShapeName(shape);
  const R = radius > 0 ? radius : (config.DISC_R || 0.6);

  switch (normShape) {
    case DISC_SHAPES.TRIANGLE: {
      // 3-blade Delta tri-blade with equilateral symmetry (apex pointing along +Y)
      return [0, 1, 2].map((i) => {
        const angle = (i * 2 * Math.PI) / 3 + Math.PI / 2;
        return new THREE.Vector2(Math.cos(angle) * R, Math.sin(angle) * R);
      });
    }

    case DISC_SHAPES.SQUARE: {
      // 4-blade Quantum Quad diamond plate (rotated by 45 degrees for diamond rotor balance)
      return [0, 1, 2, 3].map((i) => {
        const angle = (i * 2 * Math.PI) / 4 + Math.PI / 4;
        return new THREE.Vector2(Math.cos(angle) * R, Math.sin(angle) * R);
      });
    }

    case DISC_SHAPES.HEXAGON: {
      // 6-sided Nanite Hex-Grid cellular disc
      return [0, 1, 2, 3, 4, 5].map((i) => {
        const angle = (i * 2 * Math.PI) / 6;
        return new THREE.Vector2(Math.cos(angle) * R, Math.sin(angle) * R);
      });
    }

    case DISC_SHAPES.SHURIKEN_3:
    case DISC_SHAPES.SHURIKEN_4: {
      // Multi-bladed energy stars with perimeter notches and exact N-fold rotational symmetry
      const blades = normShape === DISC_SHAPES.SHURIKEN_3 ? 3 : 4;
      const startAngle = normShape === DISC_SHAPES.SHURIKEN_3 ? Math.PI / 2 : Math.PI / 4;
      const pts = [];
      const step = (2 * Math.PI) / blades;

      for (let k = 0; k < blades; k++) {
        const base = startAngle + k * step;
        // Blade tip (circumradius R)
        pts.push(new THREE.Vector2(Math.cos(base) * R, Math.sin(base) * R));
        // Trailing notch shoulder
        const a1 = base + step * 0.28;
        pts.push(new THREE.Vector2(Math.cos(a1) * R * 0.62, Math.sin(a1) * R * 0.62));
        // Inner valley waist
        const a2 = base + step * 0.50;
        pts.push(new THREE.Vector2(Math.cos(a2) * R * 0.38, Math.sin(a2) * R * 0.38));
        // Leading notch shoulder
        const a3 = base + step * 0.72;
        pts.push(new THREE.Vector2(Math.cos(a3) * R * 0.62, Math.sin(a3) * R * 0.62));
      }
      return pts;
    }

    case DISC_SHAPES.CIRCLE:
    default: {
      // Circle sampled at 32 points
      const segments = 32;
      const pts = [];
      for (let i = 0; i < segments; i++) {
        const angle = (i * 2 * Math.PI) / segments;
        pts.push(new THREE.Vector2(Math.cos(angle) * R, Math.sin(angle) * R));
      }
      return pts;
    }
  }
}

/**
 * Normalizes a BufferGeometry so that its maximum vertex distance from origin in the XY plane
 * strictly matches targetRadius, and computes vertex normals.
 * @param {THREE.BufferGeometry} geometry
 * @param {number} targetRadius
 * @returns {THREE.BufferGeometry}
 */
export function normalizeGeometryRadius(geometry, targetRadius) {
  if (!geometry || !geometry.attributes || !geometry.attributes.position) {
    return geometry;
  }
  const pos = geometry.attributes.position;
  let maxR = 0;
  for (let i = 0; i < pos.count; i++) {
    const d = Math.hypot(pos.getX(i), pos.getY(i));
    if (d > maxR) maxR = d;
  }
  if (maxR > 0 && Math.abs(maxR - targetRadius) > 1e-5) {
    const scale = targetRadius / maxR;
    geometry.scale(scale, scale, 1);
  }
  if (typeof geometry.computeVertexNormals === 'function') {
    geometry.computeVertexNormals();
  }
  return geometry;
}

/**
 * Creates outer rim geometry for the specified procedural shape.
 * @param {string} [shape='circle']
 * @param {object} [options={}]
 * @returns {THREE.BufferGeometry}
 */
export function createOuterGeometry(shape = DISC_SHAPES.CIRCLE, options = {}) {
  const normShape = normalizeShapeName(shape);
  const radius = options.radius ?? (config.DISC_R || 0.6);
  const tube = options.tube ?? 0.085;

  if (normShape === DISC_SHAPES.CIRCLE) {
    // Classic circular torus
    const torusR = Math.max(0.1, radius - tube);
    const geo = new THREE.TorusGeometry(
      torusR,
      tube,
      options.radialSegments ?? 8,
      options.tubularSegments ?? 40
    );
    if (options.normalize !== false) {
      normalizeGeometryRadius(geo, radius);
    }
    return geo;
  }

  // Procedural cyber-shape with beveled extrusion and hollow core
  const outerPts = getShape2DPoints(normShape, radius);
  const innerRatio = normShape.startsWith('shuriken') ? 0.22 : 0.68;
  const innerPts = getShape2DPoints(normShape, radius * innerRatio).reverse();

  const shape2D = new THREE.Shape(outerPts);
  shape2D.holes.push(new THREE.Path(innerPts));

  const depth = options.depth ?? 0.04;
  const bevelThickness = options.bevelThickness ?? 0.014;
  const bevelSize = options.bevelSize ?? 0.014;
  const bevelSegments = options.bevelSegments ?? 2;

  const geo = new THREE.ExtrudeGeometry(shape2D, {
    depth,
    bevelEnabled: options.bevelEnabled !== false,
    bevelThickness,
    bevelSize,
    bevelSegments
  });

  geo.center();

  if (options.normalize !== false) {
    normalizeGeometryRadius(geo, radius);
  } else {
    geo.computeVertexNormals();
  }

  return geo;
}

/**
 * Creates translucent inner face geometry for the specified procedural shape.
 * @param {string} [shape='circle']
 * @param {object} [options={}]
 * @returns {THREE.BufferGeometry}
 */
export function createFaceGeometry(shape = DISC_SHAPES.CIRCLE, options = {}) {
  const normShape = normalizeShapeName(shape);
  const radius = options.radius ?? (config.DISC_R || 0.6);
  const margin = options.margin ?? 0.06;
  const faceRadius = Math.max(0.05, radius - margin);

  if (normShape === DISC_SHAPES.CIRCLE) {
    return new THREE.CircleGeometry(faceRadius, options.segments ?? 32);
  }

  // Procedural 2D cyber-face planar geometry
  const facePts = getShape2DPoints(normShape, faceRadius);
  const faceShape = new THREE.Shape(facePts);
  const geo = new THREE.ShapeGeometry(faceShape);
  geo.center();
  normalizeGeometryRadius(geo, faceRadius);
  return geo;
}

/**
 * Creates central hub geometry for the specified procedural shape.
 * @param {string} [shape='circle']
 * @param {object} [options={}]
 * @returns {THREE.BufferGeometry}
 */
export function createHubGeometry(shape = DISC_SHAPES.CIRCLE, options = {}) {
  const normShape = normalizeShapeName(shape);
  const baseRadius = options.radius ?? (config.DISC_R || 0.6);
  const hubRadius = options.hubRadius ?? Math.min(0.2, baseRadius * 0.35);
  const hubTube = options.hubTube ?? Math.min(0.05, hubRadius * 0.25);

  if (normShape === DISC_SHAPES.CIRCLE) {
    return new THREE.TorusGeometry(
      Math.max(0.05, hubRadius - hubTube),
      hubTube,
      options.radialSegments ?? 6,
      options.tubularSegments ?? 20
    );
  }

  // Miniature procedural cyber-hub matching the shape
  const outerPts = getShape2DPoints(normShape, hubRadius);
  const innerRatio = normShape.startsWith('shuriken') ? 0.25 : 0.52;
  const innerPts = getShape2DPoints(normShape, hubRadius * innerRatio).reverse();

  const hubShape = new THREE.Shape(outerPts);
  hubShape.holes.push(new THREE.Path(innerPts));

  const geo = new THREE.ExtrudeGeometry(hubShape, {
    depth: options.depth ?? 0.024,
    bevelEnabled: options.bevelEnabled !== false,
    bevelThickness: options.bevelThickness ?? 0.008,
    bevelSize: options.bevelSize ?? 0.008,
    bevelSegments: 1
  });

  geo.center();
  normalizeGeometryRadius(geo, hubRadius);
  return geo;
}

/**
 * Creates retro wireframe geometry conforming to the exact polygon silhouette.
 * @param {string} [shape='circle']
 * @param {object} [options={}]
 * @returns {THREE.BufferGeometry}
 */
export function createWireframeGeometry(shape = DISC_SHAPES.CIRCLE, options = {}) {
  const normShape = normalizeShapeName(shape);
  const radius = options.radius ?? (config.DISC_R || 0.6);
  const wireframeScale = options.wireframeScale ?? 1.04;
  const targetRadius = radius * wireframeScale;

  if (normShape === DISC_SHAPES.CIRCLE) {
    const tube = options.tube ?? 0.088;
    const torusR = Math.max(0.1, targetRadius - tube);
    const geo = new THREE.TorusGeometry(
      torusR,
      tube,
      options.radialSegments ?? 8,
      options.tubularSegments ?? 20
    );
    normalizeGeometryRadius(geo, targetRadius);
    return geo;
  }

  // Conforming extruded geometry scaled to wireframe target
  return createOuterGeometry(normShape, {
    ...options,
    radius: targetRadius,
    depth: (options.depth ?? 0.04) * 1.02,
    normalize: true
  });
}

export const DiscGeometryFactory = Object.freeze({
  DISC_SHAPES,
  SUPPORTED_DISC_SHAPES,
  DEFAULT_DISC_SHAPE,
  normalizeShapeName,
  getShape2DPoints,
  normalizeGeometryRadius,
  createOuterGeometry,
  createFaceGeometry,
  createHubGeometry,
  createWireframeGeometry
});
