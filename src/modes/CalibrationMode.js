import * as THREE from '../../vendor/three.module.js';
import { state } from '../core/state.js';
import { config } from '../core/config.js';
import { scene } from '../graphics/scene.js';
import { makeProgram } from '../graphics/materials.js';
import { burst } from '../graphics/particles.js';
import { message, formatAdaptivePrompt, updateAdaptiveHUDPrompts } from '../ui/hud.js';
import { spawnDisc } from '../entities/Disc.js';
import { rebuildArenaTiles } from '../entities/Arena.js';
import { SFX, playDeRezSound } from '../audio/sfx.js';
import { storageManager } from '../core/storage/StorageManager.js';
import { economyManager } from '../economy/EconomyManager.js';

export class CalibrationMode {
  constructor() {
    this.beat = 0; // 0: inactive, 1: strike, 2: parry, 3: curve/ricochet, 'completed'
    this.drone = null;
    this.volleyTimer = 0;
    this.volleyFired = false;
    this.beat3Spawned = false;
    this.slowMoTriggered = false;
    this._bypassEl = null;
  }

  getBypassElement() {
    if (!this._bypassEl && typeof document !== 'undefined') {
      this._bypassEl = document.getElementById('calibrationBypass');
    }
    return this._bypassEl;
  }

  showBypassPrompt(show = true) {
    const el = this.getBypassElement();
    if (el) {
      el.style.display = show ? 'block' : 'none';
      if (show) {
        updateAdaptiveHUDPrompts();
      }
    }
  }

  start() {
    state.gameMode = 'calibration';
    state.running = true;
    state.paused = false;
    state.timeScale = 1.0;
    state.slowMoActive = false;

    // Reset player position & combat state
    state.player.pos.set(0, 0, 14);
    state.player.vel.set(0, 0, 0);
    state.player.yaw = 0;
    state.player.pitch = 0;
    state.player.hp = 100;
    state.player.energy = 100;
    state.player.alive = true;
    state.player.hasDisc = true;

    // Clear existing entities
    this.cleanupEntities();
    rebuildArenaTiles();

    this.showBypassPrompt(true);
    this.startBeat1();
  }

  cleanupEntities() {
    for (const f of state.foes) {
      if (f.obj) scene.remove(f.obj);
    }
    state.foes = [];

    for (const d of state.discs) {
      if (d.mesh) scene.remove(d.mesh);
    }
    state.discs = [];
    this.drone = null;
  }

  createDrone(pos, color = config.ORANGE) {
    const obj = makeProgram(color, { archetype: 'drone' });
    obj.scale.setScalar(0.9);
    obj.position.copy(pos);
    scene.add(obj);

    const foe = {
      obj,
      pos: pos.clone(),
      vel: new THREE.Vector3(),
      hp: 50,
      maxHp: 50,
      hasDisc: true,
      hurt: 0,
      y: 0,
      vy: 0,
      grounded: true,
      isBoss: false,
      isCalibrationTarget: true,
      beat: this.beat
    };
    state.foes.push(foe);
    return foe;
  }

  startBeat1() {
    this.beat = 1;
    this.cleanupEntities();
    // 15m directly ahead of player (player at z=14, drone at z=-1)
    this.drone = this.createDrone(new THREE.Vector3(0, 0, -1));
    message(formatAdaptivePrompt('CALIBRATION // BEAT 1: KINETIC STRIKE — THROW DISC {throw} AT TARGET'));
  }

  startBeat2() {
    this.beat = 2;
    this.cleanupEntities();
    this.volleyFired = false;
    this.slowMoTriggered = false;
    this.volleyTimer = 0.8;
    // Stationary drone at z=-12
    this.drone = this.createDrone(new THREE.Vector3(0, 0, -12));
    message(formatAdaptivePrompt('CALIBRATION // BEAT 2: PARRY DEFLECTION — PREPARE SHIELD {block}'));
  }

  startBeat3() {
    this.beat = 3;
    this.cleanupEntities();
    this.beat3Spawned = true;
    // Behind an energy pillar (e.g. at x=7, z=-6)
    this.drone = this.createDrone(new THREE.Vector3(7, 0, -6));
    message(formatAdaptivePrompt('CALIBRATION // BEAT 3: CURVE & RICOCHET — HOOK DISC {curve} AROUND PILLAR'));
  }

  update(dt) {
    if (state.gameMode !== 'calibration' || this.beat === 0 || this.beat === 'completed') {
      return;
    }

    // Beat 2 incoming volley & slow-mo logic
    if (this.beat === 2) {
      if (!this.volleyFired) {
        this.volleyTimer -= dt;
        if (this.volleyTimer <= 0 && this.drone) {
          this.volleyFired = true;
          // Spawn disc aimed toward player
          const startPos = this.drone.pos.clone().setY(1.7);
          const targetPos = state.player.pos.clone().setY(1.7 + state.player.y);
          const dir = targetPos.clone().sub(startPos).normalize();
          const speed = 22;
          spawnDisc(startPos, dir.multiplyScalar(speed), 'foe', config.ORANGE);
        }
      } else {
        // Find foe disc approaching player
        const foeDisc = state.discs.find(d => d.owner === 'foe');
        if (foeDisc) {
          const dist = foeDisc.pos.distanceTo(state.player.pos);
          if (dist < 8.5 && !this.slowMoTriggered) {
            this.slowMoTriggered = true;
            state.timeScale = 0.25;
            state.slowMoActive = true;
            message(formatAdaptivePrompt('{block} PARRY INCOMING DISC!'));
          }
        }
      }
    }
  }

  onDiscDeflected() {
    if (this.beat === 2) {
      state.timeScale = 1.0;
      state.slowMoActive = false;
      message('DEFLECTION CONFIRMED!');
      // Eliminate drone and advance to Beat 3
      if (this.drone) {
        this.destroyTarget(this.drone);
      }
    }
  }

  destroyTarget(foe) {
    burst(foe.pos.x, foe.pos.y + 1.2, foe.pos.z, 28, config.ORANGE);
    playDeRezSound();
    if (foe.obj) scene.remove(foe.obj);
    state.foes = state.foes.filter(f => f !== foe);
    if (this.drone === foe) this.drone = null;

    if (this.beat === 1) {
      SFX.accessGranted();
      setTimeout(() => {
        if (state.gameMode === 'calibration') this.startBeat2();
      }, 500);
    } else if (this.beat === 2) {
      SFX.accessGranted();
      setTimeout(() => {
        if (state.gameMode === 'calibration') this.startBeat3();
      }, 500);
    } else if (this.beat === 3) {
      SFX.accessGranted();
      this.complete();
    }
  }

  bypass() {
    state.timeScale = 1.0;
    state.slowMoActive = false;
    this.cleanupEntities();
    this.showBypassPrompt(false);
    this.beat = 0;

    if (typeof window !== 'undefined' && window.__tronEnterLobby) {
      window.__tronEnterLobby();
    } else if (typeof window !== 'undefined' && window.__tronShowModeSelect) {
      window.__tronShowModeSelect();
    } else {
      state.gameMode = 'lobby';
    }
  }

  complete() {
    this.beat = 'completed';
    state.timeScale = 1.0;
    state.slowMoActive = false;
    this.showBypassPrompt(false);

    // 1. Award 100 Arc Bits
    try {
      economyManager.awardBits(100, 'calibration_complete');
    } catch (_) {
      const currentBits = storageManager.get('player.currency.bits', 0);
      storageManager.set('player.currency.bits', currentBits + 100);
    }

    // 2. Award Grid 01 Star 1 in campaign storage
    try {
      const existing = storageManager.get('campaign.levelRecords.level_01_01', null) || {};
      const stars = Math.max(existing.stars || 0, 1);
      const record = {
        ...existing,
        levelId: 'level_01_01',
        gridId: 'grid_01',
        stars,
        completed: true,
        clears: (existing.clears || 0) + 1,
        lastClearedAt: Date.now()
      };
      storageManager.set('campaign.levelRecords.level_01_01', record);

      const completed = new Set(storageManager.get('campaign.completedNodes', []));
      completed.add('level_01_01');
      completed.add('node_01');
      storageManager.set('campaign.completedNodes', Array.from(completed));

      const unlockedNodes = new Set(storageManager.get('campaign.unlockedNodes', []));
      unlockedNodes.add('level_01_01');
      unlockedNodes.add('level_01_02');
      unlockedNodes.add('node_01');
      unlockedNodes.add('node_02');
      storageManager.set('campaign.unlockedNodes', Array.from(unlockedNodes));

      const unlockedGrids = new Set(storageManager.get('campaign.unlockedGrids', ['grid_01']));
      unlockedGrids.add('grid_01');
      storageManager.set('campaign.unlockedGrids', Array.from(unlockedGrids));

      const totalStars = storageManager.get('campaign.starsEarned', 0);
      if ((existing.stars || 0) < 1) {
        storageManager.set('campaign.starsEarned', totalStars + 1);
      }
      storageManager.set('starMastery.level_01_01', Math.max(storageManager.get('starMastery.level_01_01', 0), 1));
    } catch (e) {
      console.warn('Calibration campaign award error:', e);
    }

    // 3. Mark calibration completed in persistent storage
    storageManager.set('calibration_completed', true, { immediate: true });

    message('CALIBRATION COMPLETE // 100 ARC BITS ACCRUED // GRID 01 STAR 1 SECURED');
    SFX.achievementFanfare();

    setTimeout(() => {
      this.cleanupEntities();
      if (typeof window !== 'undefined' && window.__tronEnterLobby) {
        window.__tronEnterLobby();
      } else if (typeof window !== 'undefined' && window.__tronShowModeSelect) {
        window.__tronShowModeSelect();
      } else {
        state.gameMode = 'lobby';
      }
    }, 1200);
  }
}

export const calibrationMode = new CalibrationMode();
if (typeof window !== 'undefined') {
  window.__tronCalibrationMode = calibrationMode;
  window.__tronStartCalibration = () => calibrationMode.start();
  window.__tronBypassCalibration = () => calibrationMode.bypass();
}
