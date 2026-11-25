import * as THREE from '../../vendor/three.module.js';
import { state } from '../core/state.js';
import { config } from '../core/config.js';
import { scene, camera, snapCamera } from './scene.js';
import { makeDisc, makeProgram, animateProgramKinematics } from './materials.js';
import { canLoadExternalConstructs, loadConstructAsset } from './ConstructLoader.js';
import { settingsManager } from '../core/settings.js';
import { cosmeticMaterialEngine, disposeHierarchy } from '../armory/CosmeticMaterialEngine.js';
import { burst } from './particles.js';

let dioramaGroup = null;
let dioramaRig = null;
let dioramaFlightDisc = null;
let dioramaPedestalRing = null;
let dioramaState = 'IDLE';
let stateTimer = 0;
let dioramaTime = 0;
let nextSpecialAction = 'JUMP';
let jumpSecondaryTriggered = false;

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

  if (canLoadExternalConstructs() && dioramaRig && !dioramaRig.userData?.isGLB) {
    loadConstructAsset('player', { silent: true }).then((record) => {
      if (record && dioramaGroup && dioramaRig && !dioramaRig.userData?.isGLB) {
        const prev = dioramaRig;
        const upgraded = makeProgram(config.CYAN, { archetype: 'player' });
        upgraded.position.copy(prev.position);
        upgraded.rotation.copy(prev.rotation);
        upgraded.visible = prev.visible;
        disposeHierarchy(prev);
        dioramaRig = upgraded;
        dioramaGroup.add(upgraded);
        refreshDioramaCosmetics();
      }
    });
  }

  dioramaGroup.visible = true;
  refreshDioramaCosmetics();
  return dioramaGroup;
}

function setDioramaBackDiscVisible(visible) {
  if (dioramaRig && dioramaRig.userData?.backDisc) {
    dioramaRig.userData.backDisc.visible = !!visible;
    if (dioramaRig.userData.backDisc.userData?.wireframeOverlay) {
      dioramaRig.userData.backDisc.userData.wireframeOverlay.visible = !!visible;
    }
  }
}

export function despawnDiorama() {
  if (dioramaGroup) {
    dioramaGroup.visible = false;
  }
  if (dioramaFlightDisc) {
    dioramaFlightDisc.visible = false;
  }
  setDioramaBackDiscVisible(true);
  dioramaState = 'IDLE';
  stateTimer = 0;
  jumpSecondaryTriggered = false;
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
      setDioramaBackDiscVisible(true);
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
          jumpSecondaryTriggered = false;
          nextSpecialAction = 'THROW';
        } else {
          dioramaState = 'THROW_WINDUP';
          nextSpecialAction = 'JUMP';
        }
      }
      break;
    }

    case 'JUMP': {
      setDioramaBackDiscVisible(true);
      if (dioramaFlightDisc) dioramaFlightDisc.visible = false;

      // 2.3s multi-phase double-jump trajectory:
      // 0.0s - 0.65s: Primary launch rising from y = 0 to y = 1.05m
      // 0.65s - 1.45s: Secondary impulse kick & particle burst boosting y to 1.95m
      // 1.45s - 2.0s: Aerodynamic hang-time with floating limb kinematics descending toward pedestal
      // 2.0s - 2.3s: Knee-compression landing cushion returning cleanly to y = 0
      let y = 0;
      let vy = 0;
      let grounded = false;

      if (stateTimer < 0.65) {
        const p = stateTimer / 0.65;
        y = Math.sin(p * (Math.PI / 2)) * 1.05;
        vy = Math.cos(p * (Math.PI / 2)) * 2.53;
        grounded = false;
      } else if (stateTimer < 1.45) {
        if (!jumpSecondaryTriggered) {
          jumpSecondaryTriggered = true;
          try {
            if (dioramaRig) {
              const worldPos = new THREE.Vector3();
              dioramaRig.getWorldPosition(worldPos);
              worldPos.y += 0.3;
              burst(worldPos, config.CYAN || 0x00f3ff, 18, 8);
            }
          } catch (e) {
            // Safe guard in test / headless environments
          }
        }
        const p = (stateTimer - 0.65) / 0.80;
        y = 1.05 + Math.sin(p * (Math.PI / 2)) * 0.90;
        vy = Math.cos(p * (Math.PI / 2)) * 1.77;
        grounded = false;
      } else if (stateTimer < 2.0) {
        const p = (stateTimer - 1.45) / 0.55;
        y = 1.95 - (1.90 * (p * p));
        vy = - (2 * 1.90 * p) / 0.55;
        grounded = false;
      } else {
        const p = Math.min(1.0, (stateTimer - 2.0) / 0.30);
        y = 0.05 * (1.0 - p);
        vy = 0;
        grounded = true;
      }

      dioramaRig.position.y = y;

      animateProgramKinematics(dioramaRig, delta, {
        speed: 0,
        vy,
        grounded,
        hasDisc: true,
        time: dioramaTime
      });

      if (stateTimer >= 2.3) {
        dioramaRig.position.y = 0;
        dioramaState = 'IDLE';
        stateTimer = 0;
        jumpSecondaryTriggered = false;
      }
      break;
    }

    case 'THROW_WINDUP': {
      setDioramaBackDiscVisible(true);
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
      setDioramaBackDiscVisible(false);
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
      setDioramaBackDiscVisible(false);
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
      setDioramaBackDiscVisible(true);
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
