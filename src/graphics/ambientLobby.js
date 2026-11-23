import * as THREE from '../../vendor/three.module.js';
import { state } from '../core/state.js';
import { config } from '../core/config.js';
import { scene, camera, snapCamera } from './scene.js';
import { makeDisc } from './materials.js';
import { settingsManager } from '../core/settings.js';

let stagingDiscGroup = null;
let turntableBaseRing = null;

export function getStagingDisc() {
  return stagingDiscGroup;
}

export function spawnStagingDisc() {
  if (typeof scene === 'undefined' || !scene) return null;

  if (!stagingDiscGroup) {
    stagingDiscGroup = new THREE.Group();
    stagingDiscGroup.userData.part = 'ambient_staging_disc';

    // Turntable Identity Disc
    const discMesh = makeDisc(config.CYAN, { shape: 'classic', radius: 0.85 });
    stagingDiscGroup.add(discMesh);

    // Subtle turntable pedestal halo on the arena floor
    const haloGeo = new THREE.RingGeometry(0.7, 0.95, 32);
    haloGeo.rotateX(-Math.PI / 2);
    const haloMat = new THREE.MeshBasicMaterial({
      color: 0x4ff2ff,
      transparent: true,
      opacity: 0.45,
      side: THREE.DoubleSide,
      depthWrite: false
    });
    turntableBaseRing = new THREE.Mesh(haloGeo, haloMat);
    turntableBaseRing.position.set(0, 0.06, 0);
    stagingDiscGroup.add(turntableBaseRing);

    // Position in right 65% staging area in front of camera
    stagingDiscGroup.position.set(1.4, 1.45, -3.8);
    scene.add(stagingDiscGroup);
  }

  stagingDiscGroup.visible = true;
  return stagingDiscGroup;
}

export function despawnStagingDisc() {
  if (stagingDiscGroup) {
    stagingDiscGroup.visible = false;
  }
}

export function updateAmbientLobby(dt) {
  if (state.gameMode !== 'lobby') {
    if (stagingDiscGroup && stagingDiscGroup.visible) {
      stagingDiscGroup.visible = false;
    }
    return;
  }

  if (!stagingDiscGroup || !stagingDiscGroup.visible) {
    spawnStagingDisc();
  }

  if (stagingDiscGroup && stagingDiscGroup.visible) {
    // Gentle floating hover & tilt showcase
    const hoverY = 1.45 + Math.sin((state.time || 0) * 1.8) * 0.07;
    stagingDiscGroup.position.y = hoverY;

    // Turntable rotation
    stagingDiscGroup.rotation.y += dt * 0.9;
    stagingDiscGroup.rotation.x = 0.24 + Math.sin((state.time || 0) * 0.9) * 0.05;

    // Pulse turntable halo
    if (turntableBaseRing && turntableBaseRing.material) {
      turntableBaseRing.material.opacity = 0.35 + Math.sin((state.time || 0) * 2.5) * 0.15;
    }
  }
}

export function resetMatchCamera() {
  const preferred = settingsManager.get('defaultCameraPerspective', 'third_person');
  state.cameraPerspective = preferred;
  state.cameraPerspectiveBlend = preferred === 'first_person' ? 0.0 : 1.0;
  snapCamera();
}

if (typeof window !== 'undefined') {
  window.__tronSpawnStagingDisc = spawnStagingDisc;
  window.__tronDespawnStagingDisc = despawnStagingDisc;
  window.__tronGetStagingDisc = getStagingDisc;
}
