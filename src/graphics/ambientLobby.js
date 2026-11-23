import * as THREE from '../../vendor/three.module.js';
import { state } from '../core/state.js';
import { config } from '../core/config.js';
import { scene, camera, snapCamera } from './scene.js';
import { makeDisc, makeProgram, animateProgramKinematics } from './materials.js';
import { settingsManager } from '../core/settings.js';
import { cosmeticMaterialEngine } from '../armory/CosmeticMaterialEngine.js';

let dioramaGroup = null;
let dioramaRig = null;
let dioramaFlightDisc = null;
let dioramaPedestalRing = null;
let dioramaState = 'IDLE';
let stateTimer = 0;
let dioramaTime = 0;
let nextSpecialAction = 'JUMP';

export function getStagingDisc() {
  return dioramaGroup;
}

export function getDioramaRig() {
  return dioramaRig;
}

export function getDioramaState() {
  return dioramaState;
}

export function refreshDioramaCosmetics() {
  if (!dioramaRig) return;
  const activeChassis = cosmeticMaterialEngine.activeChassisSkinId || 'chassis_classic_cyan';
  const activeDisc = cosmeticMaterialEngine.activeDiscSkinId || 'disc_identity_default';

  try {
    cosmeticMaterialEngine.applyChassisSkin(dioramaRig, activeChassis);
  } catch (err) {
    console.warn('Failed to apply diorama chassis skin:', err);
  }

  try {
    if (dioramaRig.userData?.backDisc) {
      cosmeticMaterialEngine.applyDiscSkin(dioramaRig.userData.backDisc, activeDisc);
    }
  } catch (err) {
    console.warn('Failed to apply diorama palm disc skin:', err);
  }

  try {
    if (dioramaFlightDisc) {
      cosmeticMaterialEngine.applyDiscSkin(dioramaFlightDisc, activeDisc);
    }
  } catch (err) {
    console.warn('Failed to apply diorama flight disc skin:', err);
  }
}

export function spawnDiorama() {
  if (typeof scene === 'undefined' || !scene) return null;

  if (!dioramaGroup) {
    dioramaGroup = new THREE.Group();
    dioramaGroup.userData.part = 'ambient_staging_disc';

    // Pedestal halo ring on arena floor
    const haloGeo = new THREE.RingGeometry(0.85, 1.25, 32);
    haloGeo.rotateX(-Math.PI / 2);
    const haloMat = new THREE.MeshBasicMaterial({
      color: 0x4ff2ff,
      transparent: true,
      opacity: 0.45,
      side: THREE.DoubleSide,
      depthWrite: false
    });
    dioramaPedestalRing = new THREE.Mesh(haloGeo, haloMat);
    dioramaPedestalRing.position.set(0, 0.05, 0);
    dioramaGroup.add(dioramaPedestalRing);

    // Humanoid Athlete Rig for Player Archetype
    dioramaRig = makeProgram(config.CYAN, { archetype: 'player' });
    dioramaRig.position.set(0, 0, 0);
    dioramaGroup.add(dioramaRig);

    // Dedicated showcase flight disc for boomerang throw/catch cycle
    const activeDisc = cosmeticMaterialEngine.activeDiscSkinId || 'disc_identity_default';
    dioramaFlightDisc = makeDisc(config.CYAN, { shape: 'classic', radius: 0.85 });
    dioramaFlightDisc.visible = false;
    scene.add(dioramaFlightDisc);

    // Apply equipped cosmetics
    refreshDioramaCosmetics();

    // Position staging rig in the right 65% quadrant of the viewport
    dioramaGroup.position.set(1.4, 0, -3.8);
    dioramaGroup.rotation.y = -0.35;
    scene.add(dioramaGroup);

    dioramaState = 'IDLE';
    stateTimer = 0;
    dioramaTime = 0;
    nextSpecialAction = 'JUMP';
  }

  dioramaGroup.visible = true;
  refreshDioramaCosmetics();
  return dioramaGroup;
}

export function despawnDiorama() {
  if (dioramaGroup) {
    dioramaGroup.visible = false;
  }
  if (dioramaFlightDisc) {
    dioramaFlightDisc.visible = false;
  }
  if (dioramaRig && dioramaRig.userData?.backDisc) {
    dioramaRig.userData.backDisc.visible = true;
  }
  dioramaState = 'IDLE';
  stateTimer = 0;
}

export function spawnStagingDisc() {
  return spawnDiorama();
}

export function despawnStagingDisc() {
  despawnDiorama();
}

export function updateAmbientLobby(dt) {
  if (state.gameMode !== 'lobby') {
    if (dioramaGroup && dioramaGroup.visible) {
      despawnDiorama();
    }
    return;
  }

  if (!dioramaGroup || !dioramaGroup.visible) {
    spawnDiorama();
  }

  if (!dioramaGroup || !dioramaGroup.visible || !dioramaRig) return;

  const delta = dt !== undefined ? Math.max(0, dt) : 0.016;
  dioramaTime += delta;
  stateTimer += delta;

  // Gentle turntable breathing yaw sway in staging zone
  dioramaGroup.rotation.y = -0.35 + Math.sin(dioramaTime * 0.9) * 0.08;

  // Pulse pedestal halo ring
  if (dioramaPedestalRing && dioramaPedestalRing.material) {
    dioramaPedestalRing.material.opacity = 0.35 + Math.sin(dioramaTime * 2.5) * 0.15;
  }

  switch (dioramaState) {
    case 'IDLE': {
      if (dioramaRig.userData?.backDisc) dioramaRig.userData.backDisc.visible = true;
      if (dioramaFlightDisc) dioramaFlightDisc.visible = false;
      dioramaRig.position.y = 0;

      animateProgramKinematics(dioramaRig, delta, {
        speed: 0,
        vy: 0,
        grounded: true,
        hasDisc: true,
        time: dioramaTime
      });

      if (stateTimer >= 5.5) {
        stateTimer = 0;
        if (nextSpecialAction === 'JUMP') {
          dioramaState = 'JUMP';
          nextSpecialAction = 'THROW';
        } else {
          dioramaState = 'THROW_WINDUP';
          nextSpecialAction = 'JUMP';
        }
      }
      break;
    }

    case 'JUMP': {
      if (dioramaRig.userData?.backDisc) dioramaRig.userData.backDisc.visible = true;
      if (dioramaFlightDisc) dioramaFlightDisc.visible = false;

      // 1.8s jump duration: 0 - 1.5s parabolic flight, 1.5 - 1.8s landing cushion
      let vy = 0;
      let grounded = false;
      if (stateTimer < 1.5) {
        const jumpProg = stateTimer / 1.5;
        dioramaRig.position.y = Math.sin(jumpProg * Math.PI) * 1.25;
        vy = Math.cos(jumpProg * Math.PI) * 4.0;
        grounded = false;
      } else {
        dioramaRig.position.y = 0;
        vy = 0;
        grounded = true;
      }

      animateProgramKinematics(dioramaRig, delta, {
        speed: 0,
        vy,
        grounded,
        hasDisc: true,
        time: dioramaTime
      });

      if (stateTimer >= 1.8) {
        dioramaRig.position.y = 0;
        dioramaState = 'IDLE';
        stateTimer = 0;
      }
      break;
    }

    case 'THROW_WINDUP': {
      if (dioramaRig.userData?.backDisc) dioramaRig.userData.backDisc.visible = true;
      if (dioramaFlightDisc) dioramaFlightDisc.visible = false;
      dioramaRig.position.y = 0;

      const charge = Math.min(1.0, stateTimer / 0.4);
      animateProgramKinematics(dioramaRig, delta, {
        speed: 0,
        grounded: true,
        hasDisc: true,
        chargingThrow: true,
        throwCharge: charge,
        time: dioramaTime
      });

      if (stateTimer >= 0.4) {
        dioramaState = 'THROW_RELEASE';
        stateTimer = 0;
      }
      break;
    }

    case 'THROW_RELEASE': {
      if (dioramaRig.userData?.backDisc) dioramaRig.userData.backDisc.visible = false;
      if (dioramaFlightDisc) {
        dioramaFlightDisc.visible = true;
        dioramaFlightDisc.position.set(1.55, 1.15, -3.5);
      }
      dioramaRig.position.y = 0;

      animateProgramKinematics(dioramaRig, delta, {
        speed: 0,
        grounded: true,
        hasDisc: false,
        throwTrigger: stateTimer < delta * 1.5,
        time: dioramaTime
      });

      if (stateTimer >= 0.3) {
        dioramaState = 'BOOMERANG_ARC';
        stateTimer = 0;
      }
      break;
    }

    case 'BOOMERANG_ARC': {
      if (dioramaRig.userData?.backDisc) dioramaRig.userData.backDisc.visible = false;
      dioramaRig.position.y = 0;

      animateProgramKinematics(dioramaRig, delta, {
        speed: 0,
        grounded: true,
        hasDisc: false,
        time: dioramaTime
      });

      // Boomerang Bezier / Trigonometric trajectory across arena floor
      const t = Math.min(1.0, stateTimer / 1.8);
      const arcX = 1.55 - Math.sin(t * Math.PI) * 2.8 + Math.sin(t * Math.PI * 2) * 0.4;
      const arcZ = -3.5 + Math.sin(t * Math.PI) * 4.2;
      const arcY = 1.15 + Math.sin(t * Math.PI) * 0.45;

      if (dioramaFlightDisc) {
        dioramaFlightDisc.visible = true;
        dioramaFlightDisc.position.set(arcX, arcY, arcZ);
        dioramaFlightDisc.rotation.y += delta * 24;
        dioramaFlightDisc.rotation.x = Math.sin(t * Math.PI) * 0.35;
        dioramaFlightDisc.rotation.z = Math.cos(t * Math.PI) * 0.25;
      }

      if (stateTimer >= 1.8) {
        dioramaState = 'MAGNETIC_CATCH';
        stateTimer = 0;
      }
      break;
    }

    case 'MAGNETIC_CATCH': {
      if (dioramaFlightDisc) dioramaFlightDisc.visible = false;
      if (dioramaRig.userData?.backDisc) dioramaRig.userData.backDisc.visible = true;
      dioramaRig.position.y = 0;

      animateProgramKinematics(dioramaRig, delta, {
        speed: 0,
        grounded: true,
        hasDisc: true,
        catchTrigger: stateTimer < delta * 1.5,
        time: dioramaTime
      });

      if (stateTimer >= 0.6) {
        dioramaState = 'IDLE';
        stateTimer = 0;
      }
      break;
    }

    default:
      dioramaState = 'IDLE';
      stateTimer = 0;
      break;
  }
}

export function resetMatchCamera() {
  const preferred = settingsManager.get('defaultCameraPerspective', 'third_person');
  state.cameraPerspective = preferred;
  state.cameraPerspectiveBlend = preferred === 'first_person' ? 0.0 : 1.0;
  snapCamera();
}

if (typeof window !== 'undefined') {
  window.__tronSpawnDiorama = spawnDiorama;
  window.__tronDespawnDiorama = despawnDiorama;
  window.__tronGetDioramaRig = getDioramaRig;
  window.__tronGetDioramaState = getDioramaState;
  window.__tronRefreshDioramaCosmetics = refreshDioramaCosmetics;
  window.__tronSpawnStagingDisc = spawnStagingDisc;
  window.__tronDespawnStagingDisc = despawnStagingDisc;
  window.__tronGetStagingDisc = getStagingDisc;
}
