import * as THREE from '../../vendor/three.module.js';
import { state } from '../core/state.js';
import { settingsManager } from '../core/settings.js';
import { RibbonTrail } from './RibbonTrail.js';

export const sparks = [];
export const fadingRibbons = [];
export const hoverStreaks = [];

const PARTICLE_CAPACITY = 600;
const _particlePositions = new Float32Array(PARTICLE_CAPACITY * 3);
const _particleColors = new Float32Array(PARTICLE_CAPACITY * 3);
const _particleBaseColors = new Float32Array(PARTICLE_CAPACITY * 3);
const _particleVelocities = new Float32Array(PARTICLE_CAPACITY * 3);
const _particleLifespans = new Float32Array(PARTICLE_CAPACITY);
const _particleMaxLifespans = new Float32Array(PARTICLE_CAPACITY);

for (let i = 0; i < PARTICLE_CAPACITY; i++) {
  _particlePositions[i * 3 + 1] = -9999;
}

const _particleGeometry = new THREE.BufferGeometry();
const _posAttr = new THREE.BufferAttribute(_particlePositions, 3);
const _colAttr = new THREE.BufferAttribute(_particleColors, 3);
_posAttr.setUsage(THREE.DynamicDrawUsage);
_colAttr.setUsage(THREE.DynamicDrawUsage);
_particleGeometry.setAttribute('position', _posAttr);
_particleGeometry.setAttribute('color', _colAttr);

const _particleMaterial = new THREE.PointsMaterial({
  size: 0.3,
  transparent: true,
  vertexColors: true,
  blending: THREE.AdditiveBlending,
  depthWrite: false
});

export const particleMesh = new THREE.Points(_particleGeometry, _particleMaterial);
particleMesh.frustumCulled = false;
particleMesh.visible = false;

let _poolHead = 0;
const _tempColor = new THREE.Color();

export function ensureParticleMesh(targetScene = null) {
  const host = targetScene || (typeof window !== 'undefined' ? window.__tronScene : null);
  if (host && particleMesh.parent !== host) {
    if (particleMesh.parent) particleMesh.parent.remove(particleMesh);
    host.add(particleMesh);
  }
}

export function getActiveParticleCount() {
  let count = 0;
  for (let i = 0; i < PARTICLE_CAPACITY; i++) {
    if (_particleLifespans[i] > 0) count++;
  }
  return count;
}

let particlesEnabled = settingsManager.get('particles', true);

export function isParticlesEnabled() {
  return particlesEnabled !== false;
}

export function setParticlesEnabled(enabled) {
  particlesEnabled = !!enabled;
  if (!particlesEnabled) {
    clearAllEffects();
  }
}

export function clearAllEffects() {
  _poolHead = 0;
  for (let i = 0; i < PARTICLE_CAPACITY; i++) {
    _particleLifespans[i] = 0;
    _particlePositions[i * 3 + 1] = -9999;
    _particleColors[i * 3] = 0;
    _particleColors[i * 3 + 1] = 0;
    _particleColors[i * 3 + 2] = 0;
  }
  _posAttr.needsUpdate = true;
  _colAttr.needsUpdate = true;
  particleMesh.visible = false;
  if (particleMesh.parent) {
    particleMesh.parent.remove(particleMesh);
  }
  sparks.length = 0;

  for (let i = fadingRibbons.length - 1; i >= 0; i--) {
    fadingRibbons[i].dispose();
    fadingRibbons.splice(i, 1);
  }
  for (let i = hoverStreaks.length - 1; i >= 0; i--) {
    hoverStreaks[i].trail.dispose();
    hoverStreaks.splice(i, 1);
  }
}

settingsManager.onChange((key, value, all) => {
  if (key === 'particles') {
    setParticlesEnabled(value);
  } else if (key === '*' && all) {
    setParticlesEnabled(all.particles !== false);
  }
});

/**
 * Registers a detached RibbonTrail for smooth fade-out and GPU disposal.
 * @param {RibbonTrail} trail
 * @param {number} [duration=0.26]
 */
export function trackFadingRibbon(trail, duration = 0.26) {
  if (!trail || trail.isDisposed) return;
  if (!isParticlesEnabled()) {
    trail.dispose();
    return;
  }
  trail.beginFade(duration);
  fadingRibbons.push(trail);
}

/**
 * Emits additive hover-tip dash streaks opposite the movement burst direction.
 * @param {THREE.Vector3} originPos
 * @param {THREE.Vector3} moveDir
 * @param {number|string|THREE.Color} color
 * @param {THREE.Scene|null} [targetScene]
 */
export function emitHoverDashStreak(originPos, moveDir, color = 0x00f3ff, targetScene = null) {
  if (!isParticlesEnabled() || !originPos) return;
  const hostScene = targetScene || (typeof window !== 'undefined' ? window.__tronScene : null);
  if (!hostScene) return;

  const dir = (moveDir && moveDir.lengthSq() > 1e-6)
    ? moveDir.clone().normalize()
    : new THREE.Vector3(0, 0, -1);
  const lateral = new THREE.Vector3(-dir.z, 0, dir.x).normalize();

  for (const side of [-0.22, 0.22]) {
    const start = originPos.clone().addScaledVector(lateral, side);
    start.y += 0.14;
    const trail = new RibbonTrail({
      primaryColor: color,
      secondaryColor: color,
      width: 0.18,
      opacity: 0.78,
      maxPoints: 12,
      minDistance: 0.08,
      hdrBoost: 1.9
    });
    trail.pushPoint(start, dir);
    hostScene.add(trail.mesh);
    hoverStreaks.push({
      trail,
      pos: start,
      vel: dir.clone().multiplyScalar(-18),
      life: 0.22,
      max: 0.22
    });
  }
}

export function burst(pos, color, n = 22, power = 10, targetScene = null) {
  if (!isParticlesEnabled()) return;
  if (state.isTouchDevice) n = Math.max(1, Math.round(n * 0.5));
  ensureParticleMesh(targetScene);
  particleMesh.visible = true;

  if (color instanceof THREE.Color) {
    _tempColor.copy(color);
  } else if (typeof color === 'number' || typeof color === 'string') {
    _tempColor.set(color);
  } else {
    _tempColor.setHex(0x00f3ff);
  }

  const r = _tempColor.r, g = _tempColor.g, b = _tempColor.b;
  const pX = pos.x, pY = pos.y, pZ = pos.z;

  const startSlot = _poolHead;
  for (let i = 0; i < n; i++) {
    const slot = _poolHead;
    _poolHead = (_poolHead + 1) % PARTICLE_CAPACITY;

    const idx3 = slot * 3;
    _particlePositions[idx3] = pX;
    _particlePositions[idx3 + 1] = pY;
    _particlePositions[idx3 + 2] = pZ;

    _particleBaseColors[idx3] = r;
    _particleBaseColors[idx3 + 1] = g;
    _particleBaseColors[idx3 + 2] = b;
    _particleColors[idx3] = r;
    _particleColors[idx3 + 1] = g;
    _particleColors[idx3 + 2] = b;

    const rx = Math.random() - 0.5;
    const ry = Math.random() * 0.9;
    const rz = Math.random() - 0.5;
    const len = Math.hypot(rx, ry, rz) || 1;
    const spd = (power * (0.4 + Math.random())) / len;

    _particleVelocities[idx3] = rx * spd;
    _particleVelocities[idx3 + 1] = ry * spd;
    _particleVelocities[idx3 + 2] = rz * spd;

    _particleLifespans[slot] = 0.85;
    _particleMaxLifespans[slot] = 0.85;
  }

  _posAttr.needsUpdate = true;
  _colAttr.needsUpdate = true;
  sparks.push({ start: startSlot, count: n, life: 0.85, max: 0.85 });
}

export function updateSparks(dt, targetScene) {
  ensureParticleMesh(targetScene);
  let activeCount = 0;
  let posDirty = false;
  let colDirty = false;

  for (let i = 0; i < PARTICLE_CAPACITY; i++) {
    if (_particleLifespans[i] > 0) {
      _particleLifespans[i] -= dt;
      const idx3 = i * 3;
      if (_particleLifespans[i] <= 0) {
        _particleLifespans[i] = 0;
        _particlePositions[idx3 + 1] = -9999;
        _particleColors[idx3] = 0;
        _particleColors[idx3 + 1] = 0;
        _particleColors[idx3 + 2] = 0;
        posDirty = true;
        colDirty = true;
      } else {
        activeCount++;
        _particleVelocities[idx3 + 1] -= 16 * dt;
        _particlePositions[idx3] += _particleVelocities[idx3] * dt;
        _particlePositions[idx3 + 1] += _particleVelocities[idx3 + 1] * dt;
        _particlePositions[idx3 + 2] += _particleVelocities[idx3 + 2] * dt;

        if (_particlePositions[idx3 + 1] < 0.05) {
          _particlePositions[idx3 + 1] = 0.05;
          _particleVelocities[idx3 + 1] *= -0.35;
          _particleVelocities[idx3] *= 0.7;
          _particleVelocities[idx3 + 2] *= 0.7;
        }

        const alpha = Math.max(0, _particleLifespans[i] / _particleMaxLifespans[i]);
        _particleColors[idx3] = _particleBaseColors[idx3] * alpha;
        _particleColors[idx3 + 1] = _particleBaseColors[idx3 + 1] * alpha;
        _particleColors[idx3 + 2] = _particleBaseColors[idx3 + 2] * alpha;
        posDirty = true;
        colDirty = true;
      }
    }
  }

  if (posDirty) _posAttr.needsUpdate = true;
  if (colDirty) _colAttr.needsUpdate = true;
  particleMesh.visible = activeCount > 0;

  for (let i = sparks.length - 1; i >= 0; i--) {
    sparks[i].life -= dt;
    if (sparks[i].life <= 0) sparks.splice(i, 1);
  }

  for (let i = hoverStreaks.length - 1; i >= 0; i--) {
    const st = hoverStreaks[i];
    st.life -= dt;
    st.pos.addScaledVector(st.vel, dt);
    st.trail.pushPoint(st.pos, st.vel);
    st.trail.material.opacity = st.trail.baseOpacity * Math.max(0, st.life / st.max);
    if (st.life <= 0) {
      st.trail.dispose();
      hoverStreaks.splice(i, 1);
    }
  }

  for (let i = fadingRibbons.length - 1; i >= 0; i--) {
    const r = fadingRibbons[i];
    if (!r.updateFade(dt)) {
      r.dispose();
      fadingRibbons.splice(i, 1);
    }
  }
}
