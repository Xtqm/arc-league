import * as THREE from '../../vendor/three.module.js';
import { state } from '../core/state.js';
import { config } from '../core/config.js';
import { scene, camera } from '../graphics/scene.js';
import { getTileAt, pillars, sectorHazardBuilder } from '../entities/Arena.js';
import { tmp } from '../graphics/materials.js';
import { getPlayerCurveIntent } from '../input/keyboard.js';

const _trajCamDir = new THREE.Vector3();
const _trajChest = new THREE.Vector3();
const _trajToAim = new THREE.Vector3();
const _trajDir = new THREE.Vector3();
const _trajOrigin = new THREE.Vector3();
const _trajSimVel = new THREE.Vector3();
const _threatPos = new THREE.Vector3();
const _threatVel = new THREE.Vector3();
const _threatToMe = new THREE.Vector3();

const MAX_SIM_POINTS = 1500;
const POOL_CAPACITY = 16384;
const _defaultSimPositions = new Float32Array(MAX_SIM_POINTS * 3);
const _simPos = new THREE.Vector3();
const _simVel = new THREE.Vector3();
const _ptsPool = [];
for (let i = 0; i < POOL_CAPACITY; i++) {
  _ptsPool.push(new THREE.Vector3());
}
let _poolHead = 0;

const _bouncePool = [];
for (let i = 0; i < 128; i++) {
  _bouncePool.push(new THREE.Vector3());
}
let _bounceHead = 0;

const _hitFoePool = [];
for (let i = 0; i < 16; i++) {
  _hitFoePool.push({ foe: null, point: new THREE.Vector3(), bounces: 0 });
}
let _hitFoeHead = 0;
let _lastTrajLength = -1;

export function simulatePath(origin, vel, maxBounces = 3, tMax = 1.5, step = 1 / 90, curve = 0, charge = 0, outBuffer = null) {
  const p = _simPos.copy(origin);
  const v = _simVel.copy(vel);
  const buf = outBuffer || _defaultSimPositions;
  const startPoolIdx = _poolHead;
  _poolHead = (_poolHead + 1) % POOL_CAPACITY;

  buf[0] = p.x; buf[1] = p.y; buf[2] = p.z;
  _ptsPool[startPoolIdx].set(p.x, p.y, p.z);
  const pts = [_ptsPool[startPoolIdx]];

  const bounceAt = [];
  let bounces = 0, t = 0, hitFoe = null;
  let k = curve * (1.0 - 0.65 * THREE.MathUtils.clamp(charge || 0, 0, 1));
  let cruiseY = origin.y !== undefined ? origin.y : 1.7;
  const lim = config.ARENA - 1.5;

  while (t < tMax && bounces < maxBounces) {
    t += step;

    if (k) {
      const vx = v.x, vz = v.z;
      // 2D horizontal Magnus normalization
      const hSpeed = Math.hypot(vx, vz);
      if (hSpeed > 1e-4) {
        const nx = -vz / hSpeed;
        const nz = vx / hSpeed;
        const latAcc = k * config.CURVE_ACCEL * step;
        let nvx = vx + nx * latAcc;
        let nvz = vz + nz * latAcc;
        const newHSpeed = Math.hypot(nvx, nvz);
        if (newHSpeed > 1e-4) {
          const s = hSpeed / newHSpeed;
          v.x = nvx * s;
          // vy preserved in horizontal Magnus normalization
          v.z = nvz * s;
        }
      }
      k *= Math.exp(-config.CURVE_LAMBDA * step);
    }

    p.addScaledVector(v, step);
    if (p.y > config.DISC_R) {
      const isDownwardFlight = bounces === 0 && v.y < -0.2;
      if (!isDownwardFlight) {
        p.y += (cruiseY - p.y) * Math.min(1, step * 2.2);
      }
    }

    // Floor collision & void check
    const yFloor = config.DISC_R;
    if (p.y <= yFloor) {
      const tile = getTileAt(p.x, p.z);
      const isSolid = tile && tile.state !== config.TILE_FALLEN && tile.state !== config.TILE_REBUILDING;
      if (isSolid) {
        p.y = yFloor + 0.05;
        if (v.y < 0) {
          const sig = Math.abs(v.y) >= 1.0;
          v.y = 3.5;
          k = (k || 0) * 0.65;
          cruiseY = 1.7;
          v.x *= 0.98;
          v.z *= 0.98;
          // Rebound upward away from floor into stabilized cruise elevation
          if (sig) {
            bounces++;
            const bSlot = _bounceHead;
            _bounceHead = (_bounceHead + 1) % _bouncePool.length;
            const bVec = _bouncePool[bSlot].set(p.x, p.y, p.z);
            bounceAt.push(bVec);
            if (bounces >= maxBounces) {
              const ptIdx = pts.length;
              if (ptIdx < MAX_SIM_POINTS) {
                buf[ptIdx * 3] = p.x; buf[ptIdx * 3 + 1] = p.y; buf[ptIdx * 3 + 2] = p.z;
                const poolSlot = _poolHead;
                _poolHead = (_poolHead + 1) % POOL_CAPACITY;
                _ptsPool[poolSlot].set(p.x, p.y, p.z);
                pts.push(_ptsPool[poolSlot]);
              }
              return { pts, bounceAt, hitFoe, count: pts.length, positions: buf };
            }
          }
        }
      } else {
        v.y -= 25 * step;
      }
    }

    let hit = false;
    if (p.x >  lim) { p.x =  lim; v.x *= -1; hit = true; }
    if (p.x < -lim) { p.x = -lim; v.x *= -1; hit = true; }
    if (p.z >  lim) { p.z =  lim; v.z *= -1; hit = true; }
    if (p.z < -lim) { p.z = -lim; v.z *= -1; hit = true; }
    for (const pl of pillars) {
      const dx = p.x - pl.x, dz = p.z - pl.z;
      const dd = Math.hypot(dx, dz), min = pl.r + config.DISC_R;
      if (dd < min && dd > 1e-4) {
        const nx = dx / dd, nz = dz / dd;
        p.x = pl.x + nx * min; p.z = pl.z + nz * min;
        const dot = v.x * nx + v.z * nz;
        v.x -= 2 * dot * nx; v.z -= 2 * dot * nz;
        hit = true;
      }
    }
    if (sectorHazardBuilder && sectorHazardBuilder.checkDiscCollision({ pos: p, vel: v })) {
      hit = true;
    }
    if (hit) {
      bounces++;
      const bSlot = _bounceHead;
      _bounceHead = (_bounceHead + 1) % _bouncePool.length;
      const bVec = _bouncePool[bSlot].set(p.x, p.y, p.z);
      bounceAt.push(bVec);
      k = -k * 0.5;
      if (bounces >= maxBounces) {
        const ptIdx = pts.length;
        if (ptIdx < MAX_SIM_POINTS) {
          buf[ptIdx * 3] = p.x; buf[ptIdx * 3 + 1] = p.y; buf[ptIdx * 3 + 2] = p.z;
          const poolSlot = _poolHead;
          _poolHead = (_poolHead + 1) % POOL_CAPACITY;
          _ptsPool[poolSlot].set(p.x, p.y, p.z);
          pts.push(_ptsPool[poolSlot]);
        }
        return { pts, bounceAt, hitFoe, count: pts.length, positions: buf };
      }
    }

    // Intercepts a foe program?
    const simFoes = state.foes;
    for (const f of simFoes) {
      if (p.distanceTo(tmp.copy(f.pos).setY(1.5 + (f.y || 0))) < config.FOE_R + config.DISC_R + .35) {
        const foeSlot = _hitFoeHead;
        _hitFoeHead = (_hitFoeHead + 1) % _hitFoePool.length;
        const hObj = _hitFoePool[foeSlot];
        hObj.point.set(p.x, p.y, p.z);
        hObj.foe = f;
        hObj.bounces = bounces;
        hitFoe = hObj;
        const ptIdx = pts.length;
        if (ptIdx < MAX_SIM_POINTS) {
          buf[ptIdx * 3] = p.x; buf[ptIdx * 3 + 1] = p.y; buf[ptIdx * 3 + 2] = p.z;
          const poolSlot = _poolHead;
          _poolHead = (_poolHead + 1) % POOL_CAPACITY;
          _ptsPool[poolSlot].set(p.x, p.y, p.z);
          pts.push(_ptsPool[poolSlot]);
        }
        return { pts, bounceAt, hitFoe, count: pts.length, positions: buf };
      }
    }
    const ptIdx = pts.length;
    if (ptIdx < MAX_SIM_POINTS) {
      buf[ptIdx * 3] = p.x; buf[ptIdx * 3 + 1] = p.y; buf[ptIdx * 3 + 2] = p.z;
      const poolSlot = _poolHead;
      _poolHead = (_poolHead + 1) % POOL_CAPACITY;
      _ptsPool[poolSlot].set(p.x, p.y, p.z);
      pts.push(_ptsPool[poolSlot]);
    }
  }
  return { pts, bounceAt, hitFoe, count: pts.length, positions: buf };
}

// Visuals
export const trajLine = new THREE.Line(
  new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(new Float32Array(1500 * 3), 3)),
  new THREE.LineDashedMaterial({ color: config.CYAN, dashSize: .45, gapSize: .35, transparent: true, opacity: .55,
                                 blending: THREE.AdditiveBlending, depthWrite: false })
);
trajLine.frustumCulled = false;

export const bouncePips = [];
for (let i = 0; i < 4; i++) {
  const m = new THREE.Mesh(
    new THREE.RingGeometry(.35, .5, 20),
    new THREE.MeshBasicMaterial({ color: config.CYAN, transparent: true, opacity: .8, side: THREE.DoubleSide,
                                  blending: THREE.AdditiveBlending, depthWrite: false })
  );
  m.visible = false; bouncePips.push(m);
}

export const impactMark = new THREE.Mesh(
  new THREE.RingGeometry(.55, .75, 24),
  new THREE.MeshBasicMaterial({ color: config.WHITE, transparent: true, opacity: .9, side: THREE.DoubleSide,
                                blending: THREE.AdditiveBlending, depthWrite: false })
);
impactMark.visible = false;

export const threatLines = [];
for (let i = 0; i < 6; i++) {
  const l = new THREE.Line(
    new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(new Float32Array(400 * 3), 3)),
    new THREE.LineDashedMaterial({ color: config.ORANGE, dashSize: .3, gapSize: .5, transparent: true, opacity: .3,
                                   blending: THREE.AdditiveBlending, depthWrite: false })
  );
  l.frustumCulled = false; l.visible = false; threatLines.push(l);
}

export function initPhysicsVisuals(targetScene = scene) {
  if (!targetScene) return;
  if (!trajLine.parent) targetScene.add(trajLine);
  bouncePips.forEach(m => { if (!m.parent) targetScene.add(m); });
  if (!impactMark.parent) targetScene.add(impactMark);
  threatLines.forEach(l => { if (!l.parent) targetScene.add(l); });
}

if (typeof window !== 'undefined') {
  window.__tronInitPhysicsVisuals = initPhysicsVisuals;
}

export function updateThreatPaths() {
  if (!trajLine.parent && scene) initPhysicsVisuals(scene);
  let n = 0;
  for (const D of state.discs) {
    if (D.owner === 'player' || D.returning || n >= threatLines.length) continue;
    const L = threatLines[n++];
    const arr = L.geometry.attributes.position.array;
    _threatPos.copy(D.pos);
    _threatVel.copy(D.vel);
    const sim = simulatePath(_threatPos, _threatVel, 2, 0.8, 1 / 90, D.curve || 0, 0, arr);
    const c = Math.min(sim.count, 400);
    L.geometry.setDrawRange(0, c);
    L.geometry.attributes.position.needsUpdate = true;
    L.geometry.computeBoundingSphere();
    L.computeLineDistances();
    _threatToMe.copy(state.player.pos).setY(1.7).sub(D.pos).normalize();
    _threatVel.copy(D.vel).normalize();
    L.material.opacity = 0.18 + Math.max(0, _threatVel.dot(_threatToMe)) * 0.5;
    L.visible = true;
  }
  for (let i = n; i < threatLines.length; i++) threatLines[i].visible = false;
}

export function updateTrajectory(aim, dt) {
  if (!trajLine.parent && scene) initPhysicsVisuals(scene);
  const show = state.player.alive && state.player.hasDisc;
  trajLine.visible = show;
  impactMark.visible = false;
  for (const p of bouncePips) p.visible = false;
  if (!show) return null;

  const chest = _trajChest.copy(state.player.pos).setY(1.7 + state.player.y);
  const toAim = _trajToAim.copy(aim.point).sub(chest);
  const horizontalDist = Math.hypot(toAim.x, toAim.z);
  const dir = _trajDir.copy(toAim).normalize();
  camera.getWorldDirection(_trajCamDir);
  if (horizontalDist < 2.5 && _trajCamDir.y >= -0.35 && dir.y < -0.04) {
    dir.y = Math.max(-0.04, _trajCamDir.y);
    dir.normalize();
  }
  const origin = _trajOrigin.copy(chest).addScaledVector(dir, 1.1);
  const charge = state.player.throwCharge || 0;
  const curve = getPlayerCurveIntent();
  const speed = 38.0 + 17.0 * charge;
  const simVel = _trajSimVel.copy(dir).multiplyScalar(speed);
  const arr = trajLine.geometry.attributes.position.array;
  const sim = simulatePath(origin, simVel, 3, 1.5, 1 / 90, curve, charge, arr);

  const willHit = !!sim.hitFoe;
  
  let rearKill = false;
  if (willHit && sim.hitFoe.foe) {
    const f = sim.hitFoe.foe;
    const rotY = f.obj ? f.obj.rotation.y : (f.yaw || 0);
    const fwdX = Math.sin(rotY);
    const fwdZ = Math.cos(rotY);
    const dx = sim.hitFoe.point.x - f.pos.x;
    const dz = sim.hitFoe.point.z - f.pos.z;
    const len = Math.hypot(dx, dz);
    if (len > 0.001) {
      const dot = (dx / len) * fwdX + (dz / len) * fwdZ;
      rearKill = (dot < 0.1 && sim.hitFoe.bounces > 0);
    }
  }

  const isCurving = Math.abs(curve) > 0.05;
  const isGuardCrush = charge >= 0.85;
  const trajColor = rearKill ? config.WHITE : willHit ? config.ORANGE : isGuardCrush ? 0xffeedd : isCurving ? 0x7cf6ff : config.CYAN;
  trajLine.material.color.setHex(trajColor);
  trajLine.material.opacity = willHit ? .95 : isGuardCrush ? .90 : isCurving ? .75 : .45;
  trajLine.material.dashSize = isCurving ? 0.28 : (isGuardCrush ? 0.6 : 0.45);
  trajLine.material.gapSize = isCurving ? 0.20 : (isGuardCrush ? 0.15 : 0.35);

  const n = Math.min(sim.count, 1500);
  trajLine.geometry.setDrawRange(0, n);
  trajLine.geometry.attributes.position.needsUpdate = true;
  trajLine.geometry.computeBoundingSphere();
  if (n !== _lastTrajLength) {
    trajLine.computeLineDistances();
    _lastTrajLength = n;
  }

  sim.bounceAt.slice(0, 4).forEach((b, i) => {
    const pip = bouncePips[i];
    pip.visible = true; pip.position.copy(b);
    pip.lookAt(camera.position);
    pip.material.color.setHex(willHit ? config.ORANGE : isCurving ? 0x7cf6ff : config.CYAN);
    pip.scale.setScalar(1 + Math.sin(state.time * 7 + i) * .12);
  });

  const end = sim.hitFoe ? sim.hitFoe.point : sim.pts[sim.pts.length - 1];
  impactMark.visible = true;
  impactMark.position.copy(end);
  impactMark.lookAt(camera.position);
  impactMark.material.color.setHex(rearKill ? config.WHITE : willHit ? config.ORANGE : isCurving ? 0x7cf6ff : config.CYAN);
  impactMark.scale.setScalar((willHit ? 1.3 : .9) + Math.sin(state.time * 9) * .1);

  return { willHit, rearKill, bounces: sim.bounceAt.length };
}
