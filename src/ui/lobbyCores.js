import * as THREE from '../../vendor/three.module.js';
import { state } from '../core/state.js';
import { config } from '../core/config.js';
import { scene, camera } from '../graphics/scene.js';
import { burst } from '../graphics/particles.js';
import { SFX } from '../audio/sfx.js';
import { settingsManager } from '../core/settings.js';
import { storageManager } from '../core/storage/StorageManager.js';
import { settingsModal } from './modals/SettingsModal.js';

export const ENERGY_CORES_CONFIG = [
  {
    id: 'circuit',
    name: 'LEAGUE CIRCUIT',
    subtext: 'CAMPAIGN CIRCUIT',
    mode: 'campaign',
    pos: new THREE.Vector3(-1.8, 1.8, -4.1),
    color: 0x4ff2ff,
    secondaryColor: 0xffd700,
    radius: 1.2,
    geomType: 'octahedron'
  },
  {
    id: 'survival',
    name: 'SURVIVAL (SWARM)',
    subtext: 'WAVE DEFENSE',
    mode: 'swarm',
    pos: new THREE.Vector3(1.8, 1.8, -4.1),
    color: 0xff7b1a,
    secondaryColor: 0xff3b00,
    radius: 1.2,
    geomType: 'icosahedron'
  },
  {
    id: 'duels',
    name: 'ONLINE DUELS',
    subtext: '1v1 & 2v2 PVP',
    mode: 'duels',
    pos: new THREE.Vector3(-3.4, 1.9, -3.0),
    color: 0xbc13fe,
    secondaryColor: 0x4ff2ff,
    radius: 1.2,
    geomType: 'torus'
  },
  {
    id: 'armory',
    name: 'OUTFITTING & ARMORY',
    subtext: 'GEAR & VISORS',
    mode: 'armory',
    pos: new THREE.Vector3(3.4, 1.9, -3.0),
    color: 0x00ff88,
    secondaryColor: 0x4ff2ff,
    radius: 1.2,
    geomType: 'box'
  },
  {
    id: 'settings',
    name: 'SYSTEM SETTINGS',
    subtext: 'CONFIG & AUDIO',
    mode: 'settings',
    pos: new THREE.Vector3(0, 1.0, -3.8),
    color: 0x38bdf8,
    secondaryColor: 0xffffff,
    radius: 1.1,
    geomType: 'octahedron'
  }
];

export function createCoreTextSprite(title, subtext, colorHex) {
  if (typeof document === 'undefined' || typeof document.createElement !== 'function') return null;
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 160;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, 512, 160);

  // Outer glow & title
  ctx.font = 'bold 36px "Segoe UI", system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillStyle = colorHex;
  ctx.shadowColor = colorHex;
  ctx.shadowBlur = 18;
  ctx.fillText(title, 256, 56);

  // Subtext badge
  if (subtext) {
    ctx.font = '600 20px "Segoe UI", system-ui, sans-serif';
    ctx.fillStyle = '#bff4fb';
    ctx.shadowColor = '#4ff2ff';
    ctx.shadowBlur = 10;
    ctx.fillText(`[ ${subtext} ]`, 256, 100);
  }

  const texture = new THREE.CanvasTexture(canvas);
  const mat = new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false });
  const sprite = new THREE.Sprite(mat);
  sprite.scale.set(3.2, 1.0, 1);
  sprite.position.set(0, 1.35, 0);
  return sprite;
}

export class LobbyCoresManager {
  constructor() {
    this.cores = [];
    this.activeModalCore = null;
    this.initialized = false;
    this.duelLaunchMode = 'quick';
    this.flyingDisc = null;
    this.shatteredCore = null;
    this.reassemblyAnim = null;
  }

  init() {
    if (this.initialized) return;
    this.bindModalEvents();
    this.initialized = true;
  }

  bindModalEvents() {
    if (typeof document === 'undefined') return;
    const confirmBtn = document.getElementById('btnCoreConfirmLaunch');
    const cancelBtn = document.getElementById('btnCoreConfirmCancel');
    const modal = document.getElementById('coreConfirmModal');

    if (confirmBtn) {
      confirmBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (this.activeModalCore) {
          const core = this.activeModalCore;
          this.activeModalCore = null;
          this.shatteredCore = null;
          state.lobbyLaunching = false;
          if (modal) modal.style.display = 'none';
          this.executeLaunch(core);
        }
      });
    }

    if (cancelBtn) {
      cancelBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.cancelLaunch();
      });
    }
  }

  cancelLaunch() {
    this.hideConfirmModal();
  }

  showConfirmModal(core) {
    this.activeModalCore = core;
    const modal = document.getElementById('coreConfirmModal');
    const title = document.getElementById('coreConfirmTitle');
    const desc = document.getElementById('coreConfirmDesc');
    if (!modal) return;

    if (title) title.textContent = `INITIALIZE ${core.name}?`;
    if (desc) desc.textContent = `ENGAGE ARCFIELD MODE: ${core.id.toUpperCase()}`;

    let variantContainer = document.getElementById('coreVariantSelector');
    if (!variantContainer && typeof document !== 'undefined') {
      variantContainer = document.createElement('div');
      variantContainer.id = 'coreVariantSelector';
      variantContainer.className = 'core-variant-selector';
      variantContainer.style.cssText = 'display:flex; justify-content:center; gap:12px; margin: 12px 0 18px;';
      const card = modal.querySelector('.card');
      const actions = card ? card.querySelector('div[style*="display:flex"]') : null;
      if (card && actions) {
        card.insertBefore(variantContainer, actions);
      }
    }

    const isUnlocked = Math.max(
      Number(storageManager?.get?.('stats.swarmMaxWave', 0)) || 0,
      Number(storageManager?.get?.('stats.swarmHighestWave', 0)) || 0,
      Number(storageManager?.get?.('stats.highestWave', 0)) || 0
    ) >= 10;

    if (variantContainer) {
      if (core.id === 'survival' && isUnlocked) {
        variantContainer.style.display = 'flex';
        variantContainer.innerHTML = `
          <button id="btnCoreSurvivalStandard" class="btn ${!state.isHardcoreSurvival ? 'hot' : ''}" style="font-size:12px; padding:6px 14px; min-width:100px;">STANDARD</button>
          <button id="btnCoreSurvivalHardcore" class="btn ${state.isHardcoreSurvival ? 'hot' : ''}" style="font-size:12px; padding:6px 14px; min-width:100px; border-color:var(--orange); color:#ff7b1a;">HARDCORE [LVL 5+]</button>
        `;
        const btnStd = document.getElementById('btnCoreSurvivalStandard');
        const btnHc = document.getElementById('btnCoreSurvivalHardcore');
        if (btnStd) {
          btnStd.onclick = (e) => {
            e.stopPropagation();
            state.isHardcoreSurvival = false;
            btnStd.classList.add('hot');
            if (btnHc) btnHc.classList.remove('hot');
            if (desc) desc.textContent = 'ENGAGE ARCFIELD MODE: SURVIVAL (STANDARD)';
          };
        }
        if (btnHc) {
          btnHc.onclick = (e) => {
            e.stopPropagation();
            state.isHardcoreSurvival = true;
            btnHc.classList.add('hot');
            if (btnStd) btnStd.classList.remove('hot');
            if (desc) desc.textContent = 'ENGAGE ARCFIELD MODE: SURVIVAL (HARDCORE)';
          };
        }
        if (desc) {
          desc.textContent = state.isHardcoreSurvival ? 'ENGAGE ARCFIELD MODE: SURVIVAL (HARDCORE)' : 'ENGAGE ARCFIELD MODE: SURVIVAL (STANDARD)';
        }
      } else if (core.id === 'duels') {
        this.duelLaunchMode = 'quick';
        variantContainer.style.display = 'flex';
        variantContainer.innerHTML = `
          <button id="btnCoreDuelQuick" class="btn hot" style="font-size:12px; padding:6px 14px; min-width:110px; border-color:var(--cyan); color:#fff; background:rgba(79,242,255,0.25);">QUICK MATCH</button>
          <button id="btnCoreDuelFriendly" class="btn" style="font-size:12px; padding:6px 14px; min-width:110px; border-color:#d896ff; color:#d896ff;">FRIENDLY ROOM</button>
        `;
        const btnQuick = document.getElementById('btnCoreDuelQuick');
        const btnFriendly = document.getElementById('btnCoreDuelFriendly');
        if (btnQuick) {
          btnQuick.onclick = (e) => {
            e.stopPropagation();
            this.duelLaunchMode = 'quick';
            btnQuick.classList.add('hot');
            btnQuick.style.background = 'rgba(79,242,255,0.25)';
            if (btnFriendly) {
              btnFriendly.classList.remove('hot');
              btnFriendly.style.background = '';
            }
            if (desc) desc.textContent = 'ENGAGE AUTOMATED QUICK MATCH WITH WARM-UP';
          };
        }
        if (btnFriendly) {
          btnFriendly.onclick = (e) => {
            e.stopPropagation();
            this.duelLaunchMode = 'friendly';
            btnFriendly.classList.add('hot');
            btnFriendly.style.background = 'rgba(216,150,255,0.25)';
            if (btnQuick) {
              btnQuick.classList.remove('hot');
              btnQuick.style.background = '';
            }
            if (desc) desc.textContent = 'HOST CUSTOM FRIENDLY DUEL (ROOM CODE)';
          };
        }
        if (desc) {
          desc.textContent = 'ENGAGE AUTOMATED QUICK MATCH WITH WARM-UP';
        }
      } else {
        variantContainer.style.display = 'none';
      }
    }

    modal.style.display = 'flex';
  }

  hideConfirmModal() {
    this.activeModalCore = null;
    const modal = document.getElementById('coreConfirmModal');
    if (modal) modal.style.display = 'none';
    this.restoreShatteredCore();
  }

  anchorLobbyPlayer() {
    state.player.pos.set(0, 0, 0);
    state.player.y = 0;
    state.player.yaw = 0;
    state.player.pitch = 0;
    state.cameraPerspective = 'first_person';
    state.cameraPerspectiveBlend = 0.0;
    if (camera) {
      camera.position.set(0, 1.8, 0);
      camera.rotation.set(0, 0, 0, 'YXZ');
    }
  }

  spawnCores() {
    this.anchorLobbyPlayer();
    this.despawnCores();
    for (const cfg of ENERGY_CORES_CONFIG) {
      const group = new THREE.Group();
      group.position.copy(cfg.pos);

      // Core Geometry
      let geo;
      if (cfg.geomType === 'octahedron') {
        geo = new THREE.OctahedronGeometry(0.75, 0);
      } else if (cfg.geomType === 'icosahedron') {
        geo = new THREE.IcosahedronGeometry(0.7, 0);
      } else if (cfg.geomType === 'torus') {
        geo = new THREE.TorusGeometry(0.65, 0.22, 8, 24);
      } else {
        geo = new THREE.BoxGeometry(0.9, 0.9, 0.9);
      }

      // Outer Faceted Pulsing Shell
      const mat = new THREE.MeshStandardMaterial({
        color: cfg.color,
        emissive: cfg.color,
        emissiveIntensity: 1.8,
        roughness: 0.2,
        metalness: 0.8,
        wireframe: false,
        transparent: true,
        opacity: 0.85
      });
      const mesh = new THREE.Mesh(geo, mat);

      // Inner Wireframe Pulse
      const wireMat = new THREE.MeshBasicMaterial({
        color: cfg.secondaryColor,
        wireframe: true,
        transparent: true,
        opacity: 0.7
      });
      const wireMesh = new THREE.Mesh(geo.clone(), wireMat);
      wireMesh.scale.setScalar(1.15);

      // PointLight
      const light = new THREE.PointLight(cfg.color, 1.8, 6);
      light.position.set(0, 0, 0);

      // Floating Holographic Title & Subtitle Badge
      const hexStr = '#' + cfg.color.toString(16).padStart(6, '0');
      const textSprite = createCoreTextSprite(cfg.name, cfg.subtext, hexStr);
      if (textSprite) {
        group.add(textSprite);
      }

      group.add(mesh, wireMesh, light);
      scene.add(group);

      this.cores.push({
        ...cfg,
        group,
        mesh,
        wireMesh,
        light,
        textSprite
      });
    }
  }

  despawnFlyingDisc() {
    if (this.flyingDisc) {
      if (this.flyingDisc.mesh) {
        scene.remove(this.flyingDisc.mesh);
        if (this.flyingDisc.mesh.geometry) this.flyingDisc.mesh.geometry.dispose();
        if (this.flyingDisc.mesh.material) this.flyingDisc.mesh.material.dispose();
      }
      this.flyingDisc = null;
    }
  }

  despawnCores() {
    this.despawnFlyingDisc();
    this.reassemblyAnim = null;
    this.shatteredCore = null;
    state.lobbyLaunching = false;

    for (const core of this.cores) {
      if (core.textSprite) {
        if (core.textSprite.material && core.textSprite.material.map) {
          core.textSprite.material.map.dispose();
        }
        if (core.textSprite.material) {
          core.textSprite.material.dispose();
        }
      }
      if (core.mesh && core.mesh.material) {
        core.mesh.material.dispose();
      }
      if (core.wireMesh && core.wireMesh.material) {
        core.wireMesh.material.dispose();
      }
      if (core.group) {
        scene.remove(core.group);
      }
    }
    this.cores = [];
  }

  launchKineticDisc(core, onImpact = null) {
    state.lobbyLaunching = true;
    this.despawnFlyingDisc();

    const startPos = camera ? camera.position.clone() : new THREE.Vector3(0, 1.8, 0);
    if (camera) {
      const fwd = new THREE.Vector3();
      camera.getWorldDirection(fwd);
      const right = new THREE.Vector3().crossVectors(fwd, camera.up).normalize();
      startPos.addScaledVector(fwd, 0.7);
      startPos.addScaledVector(camera.up, -0.45);
      startPos.addScaledVector(right, 0.22);
    } else {
      startPos.set(0.2, 0.8, -1.0);
    }

    const targetPos = core.group ? core.group.position.clone() : core.pos.clone();

    // Create Identity Disc projectile mesh
    const discGeo = new THREE.CylinderGeometry(0.28, 0.28, 0.04, 32);
    const discMat = new THREE.MeshStandardMaterial({
      color: 0x4ff2ff,
      emissive: 0x4ff2ff,
      emissiveIntensity: 2.2,
      roughness: 0.2,
      metalness: 0.8
    });
    const discMesh = new THREE.Mesh(discGeo, discMat);
    discMesh.rotation.x = Math.PI / 2;
    discMesh.position.copy(startPos);
    scene.add(discMesh);

    try {
      if (SFX && typeof SFX.discThrow === 'function') {
        SFX.discThrow();
      }
    } catch (_) {}

    this.flyingDisc = {
      mesh: discMesh,
      startPos,
      targetPos,
      progress: 0,
      duration: 0.25,
      core,
      onImpact
    };
  }

  impactCore(core) {
    const pos = core.group ? core.group.position : core.pos;
    burst(pos, core.color, 140, 14);
    state.shakeAmt = 0.22;

    try {
      if (SFX && typeof SFX.discHit === 'function') {
        SFX.discHit(1.0);
      } else if (SFX && typeof SFX.accessGranted === 'function') {
        SFX.accessGranted();
      }
    } catch (_) {}

    if (core.mesh) core.mesh.visible = false;
    if (core.wireMesh) core.wireMesh.visible = false;
    if (core.textSprite) core.textSprite.visible = false;
    if (core.light) core.light.intensity = 0;

    this.shatteredCore = core;

    const requireConfirm = settingsManager.get('coreLaunchConfirmation', true);
    if (requireConfirm) {
      this.showConfirmModal(core);
    } else {
      state.lobbyLaunching = false;
      this.executeLaunch(core);
    }
  }

  restoreShatteredCore(onComplete = null) {
    const core = this.shatteredCore;
    if (!core) {
      state.lobbyLaunching = false;
      if (onComplete) onComplete();
      return;
    }

    const pos = core.group ? core.group.position : core.pos;
    burst(pos, core.color, 40, 6);
    try {
      if (SFX && typeof SFX.accessGranted === 'function') {
        SFX.accessGranted();
      }
    } catch (_) {}

    this.reassemblyAnim = {
      core,
      progress: 0,
      duration: 0.22,
      onComplete: () => {
        if (core.mesh) {
          core.mesh.visible = true;
          if (core.mesh.material) core.mesh.material.opacity = 0.85;
        }
        if (core.wireMesh) {
          core.wireMesh.visible = true;
          if (core.wireMesh.material) core.wireMesh.material.opacity = 0.7;
        }
        if (core.textSprite) core.textSprite.visible = true;
        if (core.light) core.light.intensity = 1.8;
        this.shatteredCore = null;
        state.lobbyLaunching = false;
        if (onComplete) onComplete();
      }
    };
  }

  update(dt) {
    if (state.gameMode !== 'lobby' || this.cores.length === 0) return;
    const time = state.time;

    // Update kinetic flying disc animation
    if (this.flyingDisc) {
      const fd = this.flyingDisc;
      fd.progress += dt / fd.duration;
      if (fd.progress < 1.0) {
        fd.mesh.position.lerpVectors(fd.startPos, fd.targetPos, fd.progress);
        fd.mesh.rotation.z += dt * 25.0;
      } else {
        const core = fd.core;
        const cb = fd.onImpact;
        this.despawnFlyingDisc();
        this.impactCore(core);
        if (cb) cb();
      }
    }

    // Update cinematic reverse-particle glitch re-assembly
    if (this.reassemblyAnim) {
      const ra = this.reassemblyAnim;
      ra.progress += dt / ra.duration;
      if (ra.core.mesh) {
        ra.core.mesh.visible = Math.random() > 0.35;
      }
      if (ra.progress >= 1.0) {
        const cb = ra.onComplete;
        this.reassemblyAnim = null;
        if (cb) cb();
      }
    }

    for (let i = 0; i < this.cores.length; i++) {
      const core = this.cores[i];
      if (!core.group) continue;

      // Continuous Idle Rotation
      core.group.rotation.y += dt * 0.75;
      core.group.rotation.x = Math.sin(time * 1.5 + i) * 0.2;
      core.group.position.y = core.pos.y + Math.sin(time * 2.0 + i) * 0.25;

      // Wireframe Counter-Rotation
      if (core.wireMesh) {
        core.wireMesh.rotation.y -= dt * 1.2;
        core.wireMesh.rotation.z += dt * 0.5;
      }

      // Pulse Glow Intensity
      const pulse = 1.6 + Math.sin(time * 3.0 + i) * 0.5;
      if (core.mesh && core.mesh.material) {
        core.mesh.material.emissiveIntensity = pulse;
      }
      if (core.light) {
        core.light.intensity = pulse * 1.4;
      }
    }
  }

  checkDiscIntersection(disc) {
    if (state.gameMode !== 'lobby' || !disc || disc.returning) return null;

    for (const core of this.cores) {
      const dist = disc.pos.distanceTo(core.group ? core.group.position : core.pos);
      if (dist < core.radius + config.DISC_R + 0.3) {
        this.triggerCore(core, disc);
        return core;
      }
    }
    return null;
  }

  checkPointerIntersection(clientX, clientY, camera) {
    if (state.gameMode !== 'lobby' || this.cores.length === 0 || !camera) return null;
    if (state.lobbyLaunching) return null;

    if (typeof document !== 'undefined' && document.elementFromPoint) {
      const el = document.elementFromPoint(clientX, clientY);
      if (el && el.closest && el.closest('#identityHeader, .modal, .modal-overlay, #authModal, #armoryModal, #achievementsModal, #settingsModal, #cosmeticStudioModal, .card')) {
        return null;
      }
    }

    if (typeof window === 'undefined' || !window.innerWidth || !window.innerHeight) return null;
    const mouse = new THREE.Vector2(
      (clientX / window.innerWidth) * 2 - 1,
      -(clientY / window.innerHeight) * 2 + 1
    );
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, camera);

    for (const core of this.cores) {
      if (!core.mesh || !core.mesh.visible) continue;
      const targets = [core.mesh, core.wireMesh, core.textSprite].filter(Boolean);
      const intersects = raycaster.intersectObjects(targets);
      if (intersects && intersects.length > 0) {
        this.triggerCore(core);
        return core;
      }
    }
    return null;
  }

  triggerCore(core, triggeringDisc = null) {
    if (triggeringDisc) {
      triggeringDisc.returning = true;
      triggeringDisc.vel.multiplyScalar(-0.4);
      this.impactCore(core);
      return;
    }
    if (state.lobbyLaunching) return;
    this.launchKineticDisc(core);
  }

  executeLaunch(core) {
    this.despawnCores();
    const mode = core.id;
    if (typeof document !== 'undefined') {
      if (mode === 'circuit') {
        const btn = document.getElementById('campaignBtn');
        if (btn) { btn.click(); return; }
      } else if (mode === 'survival') {
        const btn = document.getElementById('swarmBtn');
        if (btn) { btn.click(); return; }
      } else if (mode === 'duels') {
        if (this.duelLaunchMode === 'friendly') {
          const btn = document.getElementById('hostMatchBtn');
          if (btn) { btn.click(); return; }
        } else {
          const quickBtn = document.getElementById('quickMatchBtn');
          if (quickBtn) { quickBtn.click(); return; }
          const hostBtn = document.getElementById('hostMatchBtn');
          if (hostBtn) { hostBtn.click(); return; }
        }
      } else if (mode === 'armory') {
        const btn = document.getElementById('armoryBtn');
        if (btn) { btn.click(); return; }
      } else if (mode === 'settings') {
        if (typeof window !== 'undefined' && window.__tronOpenSettings) {
          window.__tronOpenSettings();
        } else if (settingsModal) {
          settingsModal._customContainer = null;
          settingsModal._inHub = false;
          settingsModal.show();
        }
        return;
      }
    }
  }
}

export const lobbyCoresManager = new LobbyCoresManager();
if (typeof window !== 'undefined') {
  window.__tronLobbyCores = lobbyCoresManager;
}
