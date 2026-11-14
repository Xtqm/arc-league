/**
 * cinematic_pipeline.test.js
 * Unit tests for procedural PMREM environment baking, HDR bloom composer fallback/resizing,
 * continuous RibbonTrail lifecycles/disposal, hover-dash streaks, and graphics settings toggles.
 */

import assert from 'assert';
import * as THREE from '../../vendor/three.module.js';
import { createProceduralEnvironment } from '../../src/graphics/Environment.js';
import { CinematicComposer } from '../../src/graphics/PostProcessing.js';
import { RibbonTrail } from '../../src/graphics/RibbonTrail.js';
import {
  sparks,
  fadingRibbons,
  hoverStreaks,
  particleMesh,
  burst,
  getActiveParticleCount,
  isParticlesEnabled,
  trackFadingRibbon,
  emitHoverDashStreak,
  updateSparks,
  clearAllEffects
} from '../../src/graphics/particles.js';
import { settingsManager } from '../../src/core/settings.js';
import { scene, setBloomEnabled, composer } from '../../src/graphics/scene.js';

console.log('--- Running Cinematic Rendering Pipeline Test Suite ---');

// =========================================================================
// Group 1: Procedural Environment Reflections (Headless Guards)
// =========================================================================
console.log('\n[Group 1] Testing Procedural Environment Reflections...');

assert.strictEqual(createProceduralEnvironment(null), null, 'Null renderer must return null cleanly');
assert.strictEqual(createProceduralEnvironment({}), null, 'Mock renderer without getContext must return null cleanly');
assert.strictEqual(
  createProceduralEnvironment({ getContext: () => null }),
  null,
  'Renderer with null WebGL context must return null cleanly'
);

console.log('✓ Group 1: Procedural environment headless guards verified.');

// =========================================================================
// Group 2: CinematicComposer Fallback, State Toggles & Resize
// =========================================================================
console.log('\n[Group 2] Testing CinematicComposer Direct Fallback & Controls...');

const headlessComposer = new CinematicComposer(null, { enabled: true });
assert.strictEqual(headlessComposer.isSupported, false, 'Headless composer must report unsupported without WebGL context');
headlessComposer.render(new THREE.Scene(), new THREE.PerspectiveCamera());
headlessComposer.setSize(1920, 1080, 2);
headlessComposer.setEnabled(false);
assert.strictEqual(headlessComposer.enabled, false);
headlessComposer.dispose();
assert.strictEqual(headlessComposer.isDisposed, true);

let directRenderCalls = 0;
const mockRenderer = {
  getContext: () => null,
  render: () => { directRenderCalls++; }
};
const fallbackComposer = new CinematicComposer(mockRenderer, { enabled: false });
fallbackComposer.render(new THREE.Scene(), new THREE.PerspectiveCamera());
assert.strictEqual(directRenderCalls, 1, 'Disabled/unsupported composer must delegate directly to renderer.render');
fallbackComposer.dispose();

console.log('✓ Group 2: CinematicComposer direct fallback & controls verified.');

// =========================================================================
// Group 3: Continuous RibbonTrail Geometry, Fade & GPU Disposal
// =========================================================================
console.log('\n[Group 3] Testing RibbonTrail Geometry & Disposal...');

const trailScene = new THREE.Scene();
const trail = new RibbonTrail({
  primaryColor: 0x00f3ff,
  secondaryColor: 0x0066ff,
  opacity: 0.9,
  width: 0.45,
  maxPoints: 10,
  minDistance: 0.2
});
trailScene.add(trail.mesh);

assert.strictEqual(trail.geometry.drawRange.count, 0, 'Empty trail drawRange starts at 0');
trail.pushPoint(new THREE.Vector3(0, 1.5, 0), new THREE.Vector3(0, 0, -10));
trail.pushPoint(new THREE.Vector3(0, 1.5, -1), new THREE.Vector3(0, 0, -10));
trail.pushPoint(new THREE.Vector3(0, 1.5, -2), new THREE.Vector3(0, 0, -10));
assert.strictEqual(trail.points.length, 3);
assert.strictEqual(trail.geometry.drawRange.count, 12, '3 points yield 2 quads (12 indices)');

trail.setColors(0xffffff, 0x4ff2ff);
assert.strictEqual('#' + trail.primaryColor.getHexString(), '#ffffff');

let geoDisposed = false;
let matDisposed = false;
trail.geometry.dispose = () => { geoDisposed = true; };
trail.material.dispose = () => { matDisposed = true; };

trackFadingRibbon(trail, 0.2);
assert.strictEqual(fadingRibbons.length, 1);
updateSparks(0.1, trailScene);
assert.strictEqual(fadingRibbons.length, 1, 'Fading ribbon remains alive mid-fade');
assert.ok(trail.material.opacity < 0.9, 'Fading ribbon opacity must decrease');

updateSparks(0.15, trailScene);
assert.strictEqual(fadingRibbons.length, 0, 'Completed ribbon must be removed from fade pool');
assert.strictEqual(geoDisposed, true, 'Completed ribbon must dispose BufferGeometry');
assert.strictEqual(matDisposed, true, 'Completed ribbon must dispose material');
assert.strictEqual(trailScene.children.includes(trail.mesh), false, 'Completed ribbon must detach from scene');

console.log('✓ Group 3: RibbonTrail geometry, fade & GPU disposal verified.');

// =========================================================================
// Group 4: Hover Dash Streaks & Fade Pool Lifecycle
// =========================================================================
console.log('\n[Group 4] Testing Hover Dash Streaks & Fade Pool Lifecycle...');

clearAllEffects();
settingsManager.set('particles', true);
assert.strictEqual(isParticlesEnabled(), true);

emitHoverDashStreak(new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, -1), 0x4ff2ff, trailScene);
assert.strictEqual(hoverStreaks.length, 2, 'Hover dash must emit 2 additive leg streaks');
updateSparks(0.3, trailScene);
assert.strictEqual(hoverStreaks.length, 0, 'Expired dash streaks must auto-dispose');

// Fade-pool disposal via trackFadingRibbon
const discTrail = new RibbonTrail({ primaryColor: 0xffaa00, secondaryColor: 0xff4400 });
trailScene.add(discTrail.mesh);
discTrail.pushPoint(new THREE.Vector3(0, 1.7, 0), new THREE.Vector3(0, 0, -38));
discTrail.pushPoint(new THREE.Vector3(0, 1.7, -2), new THREE.Vector3(0, 0, -38));
trackFadingRibbon(discTrail, 0.2);
assert.strictEqual(fadingRibbons.length, 1, 'Detached ribbon must enter fade pool');
updateSparks(0.3, trailScene);
assert.strictEqual(fadingRibbons.length, 0);
assert.strictEqual(discTrail.isDisposed, true);

console.log('✓ Group 4: Hover dash streaks & fade pool lifecycle verified.');

// =========================================================================
// Group 5: Runtime Settings Enforcement (Bloom & Particles)
// =========================================================================
console.log('\n[Group 5] Testing Settings Runtime Enforcement...');

settingsManager.set('bloom', false);
assert.strictEqual(settingsManager.get('bloom'), false);
setBloomEnabled(false);
setBloomEnabled(true);
assert.strictEqual(composer, null, 'Headless Node scene must leave composer null safely');
assert.ok(scene instanceof THREE.Scene);

settingsManager.set('particles', false);
assert.strictEqual(isParticlesEnabled(), false);
emitHoverDashStreak(new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, -1), 0x4ff2ff, trailScene);
assert.strictEqual(hoverStreaks.length, 0, 'Disabled particles must suppress hover dash streaks');
assert.strictEqual(sparks.length, 0);

settingsManager.set('bloom', true);
settingsManager.set('particles', true);

console.log('✓ Group 5: Runtime settings enforcement verified.');

// =========================================================================
// Group 6: Fixed-Capacity Ring-Buffer Particle Pool & Slot Recycling
// =========================================================================
console.log('\n[Group 6] Testing Fixed-Capacity Particle Pool & Slot Recycling...');

clearAllEffects();
assert.strictEqual(getActiveParticleCount(), 0, 'Initial active particle count must be 0');
assert.strictEqual(particleMesh.visible, false, 'Initial particle mesh must be hidden');

// Emit burst of 22 particles
burst(new THREE.Vector3(0, 1.7, 0), 0x00f3ff, 22, 10, trailScene);
assert.strictEqual(getActiveParticleCount(), 22, 'Burst of 22 particles must activate 22 slots');
assert.strictEqual(particleMesh.visible, true, 'Particle mesh must become visible on burst');
assert.strictEqual(trailScene.children.includes(particleMesh), true, 'Particle mesh must be attached to host scene');

// Verify initial positions
const posArr = particleMesh.geometry.attributes.position.array;
assert.ok(Math.abs(posArr[0] - 0) < 1e-4);
assert.ok(Math.abs(posArr[1] - 1.7) < 1e-4);
assert.ok(Math.abs(posArr[2] - 0) < 1e-4);

// Advance physics by 0.2s - particles should still be alive and have moved
updateSparks(0.2, trailScene);
assert.strictEqual(getActiveParticleCount(), 22, 'Particles must remain active at 0.2s');
assert.notStrictEqual(posArr[1], 1.7, 'Particle Y must have moved due to velocity and gravity');

// Advance past lifespan (0.85s total)
updateSparks(0.7, trailScene);
assert.strictEqual(getActiveParticleCount(), 0, 'All particles must expire and be recycled after 0.9s');
assert.strictEqual(particleMesh.visible, false, 'Particle mesh must hide when all particles expire');
assert.strictEqual(posArr[1], -9999, 'Expired particle slot Y must be reset off-screen');

// Test ring-buffer wraparound without buffer reallocation
clearAllEffects();
burst(new THREE.Vector3(0, 0, 0), 0xffaa00, 400, 10, trailScene);
assert.strictEqual(getActiveParticleCount(), 400);
burst(new THREE.Vector3(0, 0, 0), 0xff0044, 300, 10, trailScene);
// Total capacity is 600, so older slots were overwritten cleanly without exceeding capacity
assert.strictEqual(getActiveParticleCount(), 600, 'Pool capacity must clamp cleanly to 600 slots');

clearAllEffects();
assert.strictEqual(getActiveParticleCount(), 0, 'clearAllEffects must reset all active slots');

console.log('✓ Group 6: Fixed-capacity particle pool & slot recycling verified.');

console.log('\n=============================================================');
console.log('ALL CINEMATIC PIPELINE TESTS PASSED (100%)');
console.log('=============================================================');
