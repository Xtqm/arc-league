/**
 * cinematic_pipeline.test.js
 * Unit tests for procedural PMREM environment baking, HDR bloom composer fallback/resizing,
 * continuous RibbonTrail lifecycles/disposal, hover-dash streaks, and graphics settings toggles.
 */

import assert from 'assert';
import * as THREE from '../../vendor/three.module.js';
import { createProceduralEnvironment, buildProceduralEnvironmentScene } from '../../src/graphics/Environment.js';
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
import { settingsManager, GRAPHICS_PRESETS } from '../../src/core/settings.js';
import { tileMatIntact } from '../../src/graphics/materials.js';
import { scene, setBloomEnabled, setShadowQuality, composer, camera, key, rimLightCool, rimLightWarm, chasmUpLight, onResize } from '../../src/graphics/scene.js';

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

const { envScene, panels, geometries, materials } = buildProceduralEnvironmentScene();
assert.ok(envScene instanceof THREE.Scene, 'Procedural environment builder must create a THREE.Scene');
const cyanPanel = panels.find(p => p.userData.panelRole === 'rim_cyan');
const amberPanel = panels.find(p => p.userData.panelRole === 'rim_amber');
assert.ok(cyanPanel && amberPanel, 'Environment must contain opposing cyan and amber rim strips');
assert.ok(cyanPanel.position.x * amberPanel.position.x < 0, 'Cyan and amber rim panels must sit on opposite horizon sides');
assert.ok(rimLightCool instanceof THREE.DirectionalLight && rimLightCool.castShadow === false, 'Cool stadium rim light must be non-shadow-casting');
assert.ok(rimLightWarm instanceof THREE.DirectionalLight && rimLightWarm.castShadow === false, 'Warm stadium rim light must be non-shadow-casting');
assert.ok(chasmUpLight instanceof THREE.DirectionalLight && chasmUpLight.position.y < 0 && chasmUpLight.castShadow === false, 'Chasm up-light must illuminate from below without shadows');
assert.ok(scene.children.includes(rimLightCool) && scene.children.includes(rimLightWarm) && scene.children.includes(chasmUpLight), 'Scene must attach stadium rim and chasm lights');
for (const g of geometries) g.dispose();
for (const m of materials) m.dispose();

console.log('✓ Group 1: Procedural environment headless guards, dual-temperature rim strips & chasm up-lighting verified.');

// =========================================================================
// Group 2: CinematicComposer Fallback, State Toggles & Resize
// =========================================================================
console.log('\n[Group 2] Testing CinematicComposer Direct Fallback & Controls...');

const headlessComposer = new CinematicComposer(null, { enabled: true });
assert.strictEqual(headlessComposer.isSupported, false, 'Headless composer must report unsupported without WebGL context');
assert.ok(headlessComposer.threshold >= 1.15 && headlessComposer.threshold <= 1.25, 'Calibrated HDR bloom threshold must prevent floor sparkle');
assert.ok(headlessComposer.knee <= 0.25, 'Calibrated HDR bloom knee must stay tight');
assert.ok(headlessComposer.strength >= 0.35 && headlessComposer.strength <= 0.42, 'Calibrated HDR bloom strength must avoid blowout');
assert.ok(tileMatIntact.roughness >= 0.35 && tileMatIntact.roughness <= 0.42, 'Intact floor tile roughness must stay calibrated');
assert.ok(tileMatIntact.emissiveIntensity <= 0.35, 'Intact floor tile seam emissiveIntensity must stay below bloom blowout');
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

// Quality controls
fallbackComposer.setQuality('half');
assert.strictEqual(fallbackComposer.bloomQuality, 'half');
assert.strictEqual(fallbackComposer.enabled, true);
fallbackComposer.setQuality('off');
assert.strictEqual(fallbackComposer.bloomQuality, 'off');
assert.strictEqual(fallbackComposer.enabled, false);
fallbackComposer.dispose();

// WebGL Mock Composer for Bloom Capture Downsampling & Scaling
const mockGlRenderer = {
  getContext: () => ({ getExtension: () => ({}) }),
  getSize: () => ({ x: 1920, y: 1080 }),
  getPixelRatio: () => 1,
  render: () => {}
};
const mockComposer = new CinematicComposer(mockGlRenderer, {
  bloomQuality: 'full',
  renderScale: 1.0
});
assert.strictEqual(mockComposer.isSupported, true);

// 1. Full-res Bloom: Base mip is half screen dimensions (w/2, h/2)
mockComposer.setSize(1920, 1080, 1.0, 1.0);
assert.strictEqual(mockComposer.sceneTarget.width, 1920);
assert.strictEqual(mockComposer.sceneTarget.height, 1080);
assert.strictEqual(mockComposer.mipTargets[0].width, 960);
assert.strictEqual(mockComposer.mipTargets[0].height, 540);

// 2. Half-res Bloom: Initial capture pass downsamples by 50% extra (w/4, h/4) -> 75% fill-rate reduction
mockComposer.setQuality('half');
assert.strictEqual(mockComposer.bloomQuality, 'half');
assert.strictEqual(mockComposer.mipTargets[0].width, 480, 'Half-res bloom mip0 must be 1/4 screen width');
assert.strictEqual(mockComposer.mipTargets[0].height, 270, 'Half-res bloom mip0 must be 1/4 screen height');
const fullPixels = 960 * 540;
const halfPixels = 480 * 270;
assert.strictEqual(halfPixels / fullPixels, 0.25, 'Half-resolution bloom capture must consume exactly 25% of full-resolution fill rate');

// 3. Render Scaling with Half-res Bloom: sceneTarget and mips scale proportionally
mockComposer.setSize(1920, 1080, 1.0, 0.75);
assert.strictEqual(mockComposer.sceneTarget.width, 1440, 'Scene target must scale to 75% (1440px)');
assert.strictEqual(mockComposer.sceneTarget.height, 810, 'Scene target must scale to 75% (810px)');
assert.strictEqual(mockComposer.mipTargets[0].width, 360, 'Half bloom mip0 at 75% render scale must be 360px');
assert.strictEqual(mockComposer.mipTargets[0].height, 202, 'Half bloom mip0 at 75% render scale must be 202px');

mockComposer.dispose();
assert.strictEqual(mockComposer.isDisposed, true);

console.log('✓ Group 2: CinematicComposer direct fallback, half-resolution downsampling & render scaling verified.');

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
// Group 5: Runtime Settings Enforcement (Bloom, Presets, Shadows & Render Scaling)
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

// 1. Viewport aspect ratio decoupling with renderScale
global.innerWidth = 2560;
global.innerHeight = 1440;
settingsManager.set('renderScale', 0.75);
onResize();
const expectedAspect = 2560 / 1440;
assert.ok(Math.abs(camera.aspect - expectedAspect) < 1e-4, 'Camera aspect ratio must match viewport dimensions (2560/1440) regardless of renderScale');

settingsManager.set('renderScale', 0.50);
onResize();
assert.ok(Math.abs(camera.aspect - expectedAspect) < 1e-4, 'Camera aspect ratio must remain identical at 50% render scale');

// 2. Preset profiles application & emissions
let presetChangeEmitted = null;
const unsubPreset = settingsManager.onChange((k, v) => {
  if (k === 'graphicsPreset') presetChangeEmitted = v;
});

// Ultra Preset
settingsManager.applyPreset('ultra');
assert.strictEqual(settingsManager.get('graphicsPreset'), 'ultra');
assert.strictEqual(settingsManager.get('renderScale'), 1.0);
assert.strictEqual(settingsManager.get('bloomQuality'), 'full');
assert.strictEqual(settingsManager.get('bloom'), true);
assert.strictEqual(settingsManager.get('shadows'), 2048);
assert.strictEqual(settingsManager.get('fpsCap'), 0);
assert.strictEqual(settingsManager.get('particleBudget'), 1.0);
assert.strictEqual(presetChangeEmitted, 'ultra');

// High Preset (Default)
settingsManager.applyPreset('high');
assert.strictEqual(settingsManager.get('graphicsPreset'), 'high');
assert.strictEqual(settingsManager.get('renderScale'), 1.0);
assert.strictEqual(settingsManager.get('bloomQuality'), 'full');
assert.strictEqual(settingsManager.get('shadows'), 1024);
assert.strictEqual(settingsManager.get('fpsCap'), 0);

// Medium Preset
settingsManager.applyPreset('medium');
assert.strictEqual(settingsManager.get('graphicsPreset'), 'medium');
assert.strictEqual(settingsManager.get('renderScale'), 0.85);
assert.strictEqual(settingsManager.get('bloomQuality'), 'half');
assert.strictEqual(settingsManager.get('shadows'), 512);
assert.strictEqual(settingsManager.get('particleBudget'), 0.75);

// Low Preset
settingsManager.applyPreset('low');
assert.strictEqual(settingsManager.get('graphicsPreset'), 'low');
assert.strictEqual(settingsManager.get('renderScale'), 0.70);
assert.strictEqual(settingsManager.get('bloomQuality'), 'half');
assert.strictEqual(settingsManager.get('shadows'), 0);
assert.strictEqual(settingsManager.get('particleBudget'), 0.50);

// Competitive Preset
settingsManager.applyPreset('competitive');
assert.strictEqual(settingsManager.get('graphicsPreset'), 'competitive');
assert.strictEqual(settingsManager.get('renderScale'), 0.75);
assert.strictEqual(settingsManager.get('bloomQuality'), 'off');
assert.strictEqual(settingsManager.get('bloom'), false);
assert.strictEqual(settingsManager.get('shadows'), 0);
assert.strictEqual(settingsManager.get('fpsCap'), 0);
assert.strictEqual(settingsManager.get('particleBudget'), 0.25);

// Custom override resets preset label to 'custom'
settingsManager.set('renderScale', 0.90);
assert.strictEqual(settingsManager.get('graphicsPreset'), 'custom');
assert.strictEqual(settingsManager.get('renderScale'), 0.90);

unsubPreset();

// 3. Dynamic shadow map toggling & resolution adjustments
setShadowQuality(0);
assert.strictEqual(key.castShadow, false, 'Shadows at 0 must disable light shadow casting');

setShadowQuality(512);
assert.strictEqual(key.castShadow, true, 'Shadows at 512 must enable shadow casting');
assert.strictEqual(key.shadow.mapSize.x, 512);
assert.strictEqual(key.shadow.mapSize.y, 512);

setShadowQuality(2048);
assert.strictEqual(key.castShadow, true);
assert.strictEqual(key.shadow.mapSize.x, 2048);
assert.strictEqual(key.shadow.mapSize.y, 2048);

// Restore clean defaults
settingsManager.applyPreset('high');

console.log('✓ Group 5: Runtime settings enforcement, aspect ratio decoupling, presets & shadow adjustment verified.');

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
