import * as THREE from '../../vendor/three.module.js';
import { state } from '../core/state.js';
import { settingsManager } from '../core/settings.js';
import { RibbonTrail } from './RibbonTrail.js';

export const sparks = [];
export const fadingRibbons = [];
export const hoverStreaks = [];

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
  for (let i = sparks.length - 1; i >= 0; i--) {
    const s = sparks[i];
    if (s.pts?.parent) s.pts.parent.remove(s.pts);
    s.pts?.geometry?.dispose();
    s.pts?.material?.dispose();
    sparks.splice(i, 1);
  }
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
  const geo = new THREE.BufferGeometry();
  const p = new Float32Array(n * 3), v = [];
  for (let i = 0; i < n; i++) {
    p[i * 3] = pos.x; p[i * 3 + 1] = pos.y; p[i * 3 + 2] = pos.z;
    v.push(new THREE.Vector3(Math.random() - .5, Math.random() * .9, Math.random() - .5).normalize().multiplyScalar(power * (.4 + Math.random())));
  }
  geo.setAttribute('position', new THREE.BufferAttribute(p, 3));
  const pts = new THREE.Points(geo, new THREE.PointsMaterial({ color, size: .3, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));

  if (targetScene) {
    targetScene.add(pts);
  } else if (typeof window !== 'undefined' && window.__tronScene) {
    window.__tronScene.add(pts);
  }
  sparks.push({ pts, v, life: 0.85, max: 0.85 });
}

export function updateSparks(dt, targetScene) {
  for (let i = sparks.length - 1; i >= 0; i--) {
    const s = sparks[i];
    s.life -= dt;
    const a = s.pts.geometry.attributes.position;
    for (let j = 0; j < s.v.length; j++) {
      s.v[j].y -= 16 * dt;
      a.array[j * 3] += s.v[j].x * dt;
      a.array[j * 3 + 1] += s.v[j].y * dt;
      a.array[j * 3 + 2] += s.v[j].z * dt;
      if (a.array[j * 3 + 1] < .05) {
        a.array[j * 3 + 1] = .05;
        s.v[j].y *= -.35;
        s.v[j].x *= .7;
        s.v[j].z *= .7;
      }
    }
    a.needsUpdate = true;
    s.pts.material.opacity = Math.max(0, s.life / s.max);
    if (s.life <= 0) {
      if (targetScene) targetScene.remove(s.pts);
      else if (s.pts.parent) s.pts.parent.remove(s.pts);
      s.pts.geometry.dispose();
      s.pts.material?.dispose();
      sparks.splice(i, 1);
    }
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
