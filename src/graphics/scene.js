import * as THREE from '../../vendor/three.module.js';
import { state } from '../core/state.js';
import { config } from '../core/config.js';
import { settingsManager } from '../core/settings.js';
import { makeProgram } from './materials.js';
import { createProceduralEnvironment } from './Environment.js';
import { ArenaBackdrop } from './ArenaBackdrop.js';
import { canLoadExternalModels } from './ArenaAssetLoader.js';
import { canLoadExternalConstructs, loadAllConstructAssets } from './ConstructLoader.js';
import { CinematicComposer } from './PostProcessing.js';
import { cosmeticMaterialEngine, disposeHierarchy, setRigFirstPersonVisibility } from '../armory/CosmeticMaterialEngine.js';

function initRenderer() {
  if (typeof document === 'undefined') return null;
  try {
    return new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  } catch (_) {
    try {
      return new THREE.WebGLRenderer({ antialias: true });
    } catch (e) {
      return null;
    }
  }
}

export const renderer = initRenderer();
export let composer = null;
if (renderer) {
  const scale = THREE.MathUtils.clamp(Number(settingsManager.get('renderScale', 1.0)), 0.5, 1.0);
  const pr = Math.min(typeof window !== 'undefined' ? window.devicePixelRatio : 1, state.isTouchDevice ? 1.5 : 2);
  const w = typeof innerWidth !== 'undefined' ? innerWidth : 800;
  const h = typeof innerHeight !== 'undefined' ? innerHeight : 600;
  renderer.setPixelRatio(pr);
  renderer.setSize(Math.floor(w * scale), Math.floor(h * scale), false);
  if (renderer.domElement && renderer.domElement.style) {
    renderer.domElement.style.width = `${w}px`;
    renderer.domElement.style.height = `${h}px`;
  }
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  composer = new CinematicComposer(renderer, {
    enabled: settingsManager.get('bloom', true),
    bloomQuality: settingsManager.get('bloomQuality', 'full')
  });

  if (typeof document !== 'undefined' && document.body && !renderer.domElement.parentElement) {
    document.body.appendChild(renderer.domElement);
  }
}

export function setBloomEnabled(enabled) {
  if (composer) {
    composer.setEnabled(!!enabled);
  }
}

export function setShadowQuality(value) {
  const enabled = value !== false && value !== 0 && value !== 'off';
  if (renderer && renderer.shadowMap) {
    renderer.shadowMap.enabled = enabled;
  }
  if (key) {
    key.castShadow = enabled;
    if (enabled) {
      const res = (typeof value === 'number' && value > 0) ? value : 1024;
      key.shadow.mapSize.set(res, res);
      if (key.shadow.map) {
        key.shadow.map.dispose();
        key.shadow.map = null;
      }
    }
  }
}

let _lastBackdropTick = 0;
export function renderScene() {
  const now = (typeof performance !== 'undefined' && typeof performance.now === 'function')
    ? performance.now()
    : Date.now();
  const dt = _lastBackdropTick > 0 ? Math.min(0.05, Math.max(0, (now - _lastBackdropTick) * 0.001)) : 0.016;
  _lastBackdropTick = now;
  if (arenaBackdrop) {
    arenaBackdrop.update(dt);
  }
  if (composer) {
    composer.render(scene, camera);
  } else if (renderer) {
    renderer.render(scene, camera);
  }
}

settingsManager.onChange((keyName, value, all) => {
  if (keyName === 'bloom' || keyName === 'bloomQuality') {
    const q = settingsManager.get('bloomQuality', 'full');
    const enabled = settingsManager.get('bloom', true) && q !== 'off';
    setBloomEnabled(enabled);
    if (composer && typeof composer.setQuality === 'function') {
      composer.setQuality(q);
    }
  } else if (keyName === 'renderScale') {
    onResize();
  } else if (keyName === 'shadows') {
    setShadowQuality(value);
  } else if (keyName === 'graphicsPreset' || keyName === 'particles' || keyName === 'particleBudget' || keyName === 'chasmMist') {
    if (arenaBackdrop) {
      arenaBackdrop.applyQualitySettings(all || settingsManager.settings);
    }
  } else if (keyName === '*' && all) {
    const q = all.bloomQuality || (all.bloom === false ? 'off' : 'full');
    setBloomEnabled(all.bloom !== false && q !== 'off');
    if (composer && typeof composer.setQuality === 'function') {
      composer.setQuality(q);
    }
    if (all.shadows !== undefined) {
      setShadowQuality(all.shadows);
    }
    if (arenaBackdrop) {
      arenaBackdrop.applyQualitySettings(all);
    }
    onResize();
  }
});

export const scene = new THREE.Scene();
scene.background = new THREE.Color(0x01060a);
scene.fog = new THREE.Fog(0x02090f, 65, 220);

if (typeof window !== 'undefined') {
  window.__tronScene = scene;
}

export const camera = new THREE.PerspectiveCamera(
  70,
  typeof innerWidth !== 'undefined' && innerHeight ? innerWidth / innerHeight : 1,
  0.1,
  400
);

// Lights
export const hemiLight = new THREE.HemisphereLight(0x3f9ab5, 0x061820, 0.95);
scene.add(hemiLight);

export const key = new THREE.DirectionalLight(0x9ff0ff, 0.8);
key.position.set(30, 60, 20);
key.castShadow = true;
key.shadow.mapSize.set(1024, 1024);
export const d = config.ARENA + 10;
key.shadow.camera.left = -d;
key.shadow.camera.right = d;
key.shadow.camera.top = d;
key.shadow.camera.bottom = -d;
scene.add(key);

// Dual-temperature stadium directional rim lights (non-shadow-casting)
export const rimLightCool = new THREE.DirectionalLight(0x00d8ff, 0.48);
rimLightCool.name = 'stadiumRimCool';
rimLightCool.position.set(-48, 36, -36);
rimLightCool.castShadow = false;
scene.add(rimLightCool);

export const rimLightWarm = new THREE.DirectionalLight(0xff7b1a, 0.42);
rimLightWarm.name = 'stadiumRimWarm';
rimLightWarm.position.set(48, 34, 36);
rimLightWarm.castShadow = false;
scene.add(rimLightWarm);

// Subtle Null Void chasm up-lighting illuminating tile undersides and perimeter buttress bases
export const chasmUpLight = new THREE.DirectionalLight(0x0b7fa0, 0.42);
chasmUpLight.name = 'chasmUpLight';
chasmUpLight.position.set(0, -24, 0);
chasmUpLight.castShadow = false;
scene.add(chasmUpLight);

// 360-degree Magnetic Colosseum backdrop, Null Void chasm floor & scrolling mist
export const arenaBackdrop = new ArenaBackdrop({ scene });
arenaBackdrop.applyQualitySettings(settingsManager.settings);
scene.userData.arenaBackdrop = arenaBackdrop;

// Floor plane & decorative grid/rings
export const floor = new THREE.Mesh(
  new THREE.PlaneGeometry(config.ARENA * 2, config.ARENA * 2),
  new THREE.MeshStandardMaterial({ color: 0x07202c, roughness: .28, metalness: .8 })
);
floor.rotation.x = -Math.PI / 2;
floor.receiveShadow = true;
floor.visible = false;
scene.add(floor);

export const grid = new THREE.GridHelper(config.ARENA * 2, 46, config.CYAN, 0x1f9fb8);
grid.material.transparent = true;
grid.material.opacity = .8;
grid.material.blending = THREE.AdditiveBlending;
grid.material.depthWrite = false;
grid.position.y = 0.03;
grid.renderOrder = 1;
grid.visible = false;
scene.add(grid);

export const ring = new THREE.Mesh(
  new THREE.RingGeometry(9, 9.5, 96),
  new THREE.MeshBasicMaterial({ color: config.CYAN, side: THREE.DoubleSide, transparent: true, opacity: .5 })
);
ring.rotation.x = -Math.PI / 2;
ring.position.y = .03;
scene.add(ring);

export function onResize() {
  if (typeof innerWidth === 'undefined' || typeof innerHeight === 'undefined') return;
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  if (renderer) {
    const scale = THREE.MathUtils.clamp(Number(settingsManager.get('renderScale', 1.0)), 0.5, 1.0);
    const pr = Math.min(typeof window !== 'undefined' ? window.devicePixelRatio : 1, state.isTouchDevice ? 1.5 : 2);
    renderer.setPixelRatio(pr);
    renderer.setSize(Math.floor(innerWidth * scale), Math.floor(innerHeight * scale), false);
    if (renderer.domElement && renderer.domElement.style) {
      renderer.domElement.style.width = `${innerWidth}px`;
      renderer.domElement.style.height = `${innerHeight}px`;
    }
    if (composer) {
      composer.setSize(innerWidth, innerHeight, pr, scale);
    }
  }
  if (typeof window !== 'undefined' && window.__tronCheckOrientation) {
    window.__tronCheckOrientation();
  }
}

if (typeof window !== 'undefined') {
  window.addEventListener('resize', onResize);
  window.addEventListener('orientationchange', onResize);
  document.addEventListener('fullscreenchange', onResize);
  document.addEventListener('webkitfullscreenchange', onResize);
  document.addEventListener('mozfullscreenchange', onResize);
  document.addEventListener('MSFullscreenChange', onResize);
}

export function toggleCameraPerspective() {
  if (state.gameMode === 'lobby') {
    state.cameraPerspective = 'first_person';
    state.cameraPerspectiveBlend = 0.0;
    return 'first_person';
  }
  state.cameraPerspective = state.cameraPerspective === 'first_person' ? 'third_person' : 'first_person';
  if (typeof document !== 'undefined') {
    const btn = document.getElementById('btnPerspectiveToggle');
    if (btn) {
      const isFirst = state.cameraPerspective === 'first_person';
      btn.innerHTML = `👁<span class="hud-btn-label"> ${isFirst ? '1P' : '3P'}</span>`;
    }
  }
  if (typeof window !== 'undefined' && window.__tronOnPerspectiveChanged) {
    window.__tronOnPerspectiveChanged(state.cameraPerspective);
  }
  return state.cameraPerspective;
}

if (typeof window !== 'undefined') {
  window.__tronTogglePerspective = toggleCameraPerspective;
}

export function updateCamera(dt, snap = false) {
  if (state.gameMode === 'lobby') {
    state.cameraPerspective = 'first_person';
    state.cameraPerspectiveBlend = 0.0;
    const parallaxEnabled = settingsManager.get('menuParallax', true);
    let targetYaw = 0;
    let targetPitch = 0;
    if (parallaxEnabled && typeof window !== 'undefined' && window.innerWidth && window.innerHeight) {
      const curX = state.cursorX !== undefined ? state.cursorX : window.innerWidth / 2;
      const curY = state.cursorY !== undefined ? state.cursorY : window.innerHeight / 2;
      const ndcX = THREE.MathUtils.clamp((curX / window.innerWidth) * 2 - 1, -1, 1);
      const ndcY = THREE.MathUtils.clamp((curY / window.innerHeight) * 2 - 1, -1, 1);
      const maxYaw = 8 * (Math.PI / 180);
      const maxPitch = 5 * (Math.PI / 180);
      targetYaw = -ndcX * maxYaw;
      targetPitch = -ndcY * maxPitch;
    }
    const lerpFactor = snap || dt <= 0 ? 1.0 : (1 - Math.pow(1 - 0.06, dt * 60));
    state.player.yaw = THREE.MathUtils.lerp(state.player.yaw || 0, targetYaw, lerpFactor);
    state.player.pitch = THREE.MathUtils.lerp(state.player.pitch || 0, targetPitch, lerpFactor);
  }

  const targetBlend = state.cameraPerspective === 'first_person' ? 0.0 : 1.0;
  if (snap || dt <= 0) {
    state.cameraPerspectiveBlend = targetBlend;
  } else {
    // 0.2 second smooth transition: rate = dt / 0.2 = dt * 5.0
    const step = dt * 5.0;
    if (state.cameraPerspectiveBlend < targetBlend) {
      state.cameraPerspectiveBlend = Math.min(targetBlend, state.cameraPerspectiveBlend + step);
    } else if (state.cameraPerspectiveBlend > targetBlend) {
      state.cameraPerspectiveBlend = Math.max(targetBlend, state.cameraPerspectiveBlend - step);
    }
  }

  const blend = state.cameraPerspectiveBlend !== undefined ? state.cameraPerspectiveBlend : 1.0;
  const DIST = THREE.MathUtils.lerp(0.0, 9.0, blend);
  const HEIGHT = THREE.MathUtils.lerp(1.8, 4.3, blend);
  const SHOULDER = THREE.MathUtils.lerp(0.0, 1.7, blend);
  const PITCH_DROP = THREE.MathUtils.lerp(0.0, 5.0, blend);

  const fwd = new THREE.Vector3(-Math.sin(state.player.yaw), 0, -Math.cos(state.player.yaw));
  const right = new THREE.Vector3(-fwd.z, 0, fwd.x);
  const back = new THREE.Vector3(-fwd.x, 0, -fwd.z);

  const pivot = state.player.pos.clone();
  pivot.y += 1.8 + state.player.y * 0.85;

  const camOff = back.clone().multiplyScalar(DIST)
    .addScaledVector(right, SHOULDER)
    .setY(HEIGHT - 1.8 - state.player.pitch * PITCH_DROP);

  // Soft boundary compression along boom to prevent wall clipping and player pass-through
  const maxArena = config.ARENA - 2;
  let scale = 1.0;
  for (const axis of ['x', 'z']) {
    const rawVal = pivot[axis] + camOff[axis];
    if (rawVal > maxArena && camOff[axis] > 1e-4) {
      const s = (maxArena - pivot[axis]) / camOff[axis];
      if (s < scale) scale = s;
    } else if (rawVal < -maxArena && camOff[axis] < -1e-4) {
      const s = (-maxArena - pivot[axis]) / camOff[axis];
      if (s < scale) scale = s;
    }
  }
  scale = THREE.MathUtils.clamp(scale, 0.3, 1.0);

  const desired = pivot.clone().add(camOff.clone().multiplyScalar(scale));
  desired.y = Math.max(1.4, desired.y);
  desired.x = THREE.MathUtils.clamp(desired.x, -maxArena, maxArena);
  desired.z = THREE.MathUtils.clamp(desired.z, -maxArena, maxArena);

  if (snap || blend === 0.0) {
    camera.position.copy(desired);
  } else {
    camera.position.lerp(desired, 1 - Math.pow(.000000015, dt));
  }

  // Set rotation directly from pitch/yaw using Euler YXZ to eliminate gimbal lock and lookAt singularities
  camera.rotation.set(state.player.pitch, state.player.yaw, 0, 'YXZ');

  if (state.shakeAmt > 0) {
    camera.position.x += (Math.random() - .5) * state.shakeAmt;
    camera.position.y += (Math.random() - .5) * state.shakeAmt;
    camera.position.z += (Math.random() - .5) * state.shakeAmt;
    state.shakeAmt = Math.max(0, state.shakeAmt - dt * 2.2);
  }
}

export function snapCamera() {
  updateCamera(0, true);
}

export function initGraphics() {
  if (renderer && renderer.domElement && typeof document !== 'undefined' && document.body && !renderer.domElement.parentElement) {
    document.body.appendChild(renderer.domElement);
  }
  if (renderer && typeof innerWidth !== 'undefined' && typeof innerHeight !== 'undefined') {
    onResize();
  }
  if (renderer && !scene.environment) {
    const envHandle = createProceduralEnvironment(renderer);
    if (envHandle) {
      scene.environment = envHandle.texture;
      scene.userData.envHandle = envHandle;
    }
  }
  setBloomEnabled(settingsManager.get('bloom', true) && settingsManager.get('bloomQuality', 'full') !== 'off');
  if (composer && typeof composer.setQuality === 'function') {
    composer.setQuality(settingsManager.get('bloomQuality', 'full'));
  }
  setShadowQuality(settingsManager.get('shadows', 1024));
  if (arenaBackdrop) {
    arenaBackdrop.applyQualitySettings(settingsManager.settings);
    if (canLoadExternalModels()) {
      arenaBackdrop.hydrate({ silent: true });
    }
  }
  if (!state.player.obj) {
    state.player.obj = makeProgram(config.CYAN, { archetype: 'player' });
    scene.add(state.player.obj);
    cosmeticMaterialEngine.init({ playerObj: state.player.obj });
  } else {
    cosmeticMaterialEngine.setPlayerRig(state.player.obj);
  }
  if (canLoadExternalConstructs()) {
    loadAllConstructAssets({ silent: true }).then((loaded) => {
      if (loaded?.player && state.player.obj && !state.player.obj.userData?.isGLB && state.player.obj.parent === scene) {
        const prev = state.player.obj;
        const upgraded = makeProgram(config.CYAN, { archetype: 'player' });
        upgraded.position.copy(prev.position);
        upgraded.rotation.copy(prev.rotation);
        upgraded.visible = prev.visible;
        disposeHierarchy(prev);
        state.player.obj = upgraded;
        scene.add(upgraded);
        cosmeticMaterialEngine.setPlayerRig(upgraded);
        const blend = state.cameraPerspectiveBlend !== undefined ? state.cameraPerspectiveBlend : 1.0;
        setRigFirstPersonVisibility(upgraded, blend < 0.2);
      }
    });
  }
  if (typeof window !== 'undefined' && window.__tronInitPhysicsVisuals) {
    window.__tronInitPhysicsVisuals(scene);
  }
  return renderer;
}
