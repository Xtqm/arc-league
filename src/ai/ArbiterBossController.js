/**
 * ArbiterBossController.js
 * Authoritative Rival Arbiter Boss AI Engine for Tron Disc Arena (SPEC-CAMP-001 Phase 3 & Dynamic Combat AI).
 *
 * Implements:
 * - 4 Distinct Sector Personalities:
 *   - Grid 01: Sentinel Arbiter (The Heavy Bulwark: high shields, center dominance, charged guard-crush throws)
 *   - Grid 02: Sailmaster Arbiter (The Agile Aerialist: high speed 14 m/s, frequent jump-evades, steep hook curves)
 *   - Grid 03: Leviathan Arbiter (The Geometric Tactician: perimeter zoner, bank-shot ricochet specialist)
 *   - Grid 04: Master Control Arbiter (Level 10 Apex AI: charged curve volleys, frame-perfect parrying, wall-bank traps)
 * - Multi-layer Rival Shield absorption, damage isolation, and timed recharge mechanics.
 * - Reactive predictive dash-evasion routines with invulnerability frame windows.
 * - Decoupled autonomous kinematics and locomotion (resolves duplicate execution loop).
 */

import * as THREE from '../../vendor/three.module.js';
import { state } from '../core/state.js';
import { config } from '../core/config.js';
import { animateProgramKinematics } from '../graphics/materials.js';
import { BotCombatBrain } from './BotCombatBrain.js';
import { pillars } from '../entities/Arena.js';

export const ARBITER_CONFIGS = Object.freeze({
  level_01_06: Object.freeze({
    id: 'level_01_06',
    gridId: 'grid_01',
    name: 'SENTINEL ARBITER',
    title: 'OUTLANDS RECOVERY ARBITER',
    personality: 'SENTINEL',
    difficultyLevel: 6,
    chargeWeight: 0.75,
    aerialWeight: 0.15,
    bankWeight: 0.20,
    speed: 9.5,
    strafeRate: 0.8,
    maxHp: 250,
    maxShields: 2,
    shieldRechargeDelay: 6.0,
    discSpeed: 30,
    curvePower: 0.55,
    volleyCount: 2,
    volleyInterval: 0.32,
    volleyCooldown: 4.5,
    dashCooldown: 3.5,
    dashSpeed: 22.0,
    skill: 0.88,
    primaryColor: 0x00e5ff
  }),
  level_02_07: Object.freeze({
    id: 'level_02_07',
    gridId: 'grid_02',
    name: 'SAILMASTER ARBITER',
    title: 'SOLAR LATTICE ARBITER',
    personality: 'SAILMASTER',
    difficultyLevel: 7,
    chargeWeight: 0.25,
    aerialWeight: 0.85,
    bankWeight: 0.30,
    speed: 14.0,
    strafeRate: 1.6,
    jumpChance: 0.75,
    maxHp: 300,
    maxShields: 3,
    shieldRechargeDelay: 5.5,
    discSpeed: 33,
    curvePower: 0.65,
    volleyCount: 3,
    volleyInterval: 0.28,
    volleyCooldown: 4.0,
    dashCooldown: 3.0,
    dashSpeed: 24.0,
    skill: 0.92,
    primaryColor: 0xffaa00
  }),
  level_03_07: Object.freeze({
    id: 'level_03_07',
    gridId: 'grid_03',
    name: 'LEVIATHAN ARBITER',
    title: 'SIMULATION OVERSEER',
    personality: 'LEVIATHAN',
    difficultyLevel: 8,
    chargeWeight: 0.35,
    aerialWeight: 0.25,
    bankWeight: 0.85,
    speed: 11.5,
    strafeRate: 1.2,
    maxHp: 350,
    maxShields: 3,
    shieldRechargeDelay: 5.0,
    discSpeed: 36,
    curvePower: 0.72,
    volleyCount: 3,
    volleyInterval: 0.25,
    volleyCooldown: 3.8,
    dashCooldown: 2.8,
    dashSpeed: 25.0,
    skill: 0.95,
    primaryColor: 0x7b2cbf
  }),
  level_04_08: Object.freeze({
    id: 'level_04_08',
    gridId: 'grid_04',
    name: 'MASTER CONTROL ARBITER',
    title: 'CORE APEX ARBITER',
    personality: 'MASTER_CONTROL',
    difficultyLevel: 10,
    chargeWeight: 0.95,
    aerialWeight: 0.95,
    bankWeight: 0.95,
    speed: 13.5,
    strafeRate: 1.5,
    maxHp: 450,
    maxShields: 4,
    shieldRechargeDelay: 4.5,
    discSpeed: 40,
    curvePower: 0.85,
    volleyCount: 4,
    volleyInterval: 0.22,
    volleyCooldown: 3.2,
    dashCooldown: 2.4,
    dashSpeed: 28.0,
    skill: 0.98,
    primaryColor: 0xff0055
  })
});

export class ArbiterBossController {
  /**
   * @param {object} foe The bot entity instance in state.foes
   * @param {string} [levelId='level_01_06'] The Arbiter level ID
   */
  constructor(foe, levelId = 'level_01_06') {
    this.foe = foe;
    this.levelId = levelId;
    this.config = ARBITER_CONFIGS[levelId] || ARBITER_CONFIGS.level_01_06;

    this.name = this.config.name;
    this.title = this.config.title;
    this.gridId = this.config.gridId;
    this.primaryColor = this.config.primaryColor;

    // Tactical personality profile
    this.personality = this.config.personality || 'SENTINEL';
    this.chargeWeight = this.config.chargeWeight || 0.5;
    this.aerialWeight = this.config.aerialWeight || 0.5;
    this.bankWeight = this.config.bankWeight || 0.5;
    this.difficultyLevel = this.config.difficultyLevel || 6;

    // Multi-layer shield mechanics
    this.maxShields = this.config.maxShields;
    this.currentShields = this.maxShields;
    this.shieldRechargeDelay = this.config.shieldRechargeDelay;
    this.shieldRechargeTimer = 0;

    // Offensive curve-disc volleys
    this.volleyCount = this.config.volleyCount;
    this.volleyInterval = this.config.volleyInterval;
    this.volleyCooldown = this.config.volleyCooldown;
    this.volleyTimer = 0;
    this.isFiringVolley = false;
    this.volleyRemaining = 0;
    this.nextVolleyDiscTimer = 0;
    this.volleySign = 1;

    // Reactive dash-evasion
    this.dashCooldown = this.config.dashCooldown;
    this.dashTimer = 0;
    this.isDashing = false;
    this.dashDuration = 0.22;
    this.dashTimeLeft = 0;
    this.dashDir = new THREE.Vector3();
    this.invulnerableTimer = 0;

    // State machine & subroutines
    this.state = 'ENGAGE'; // ENGAGE, VOLLEY, EVADE, RECOVER
    this.listeners = new Map();
    this.summonedMinions = false;
    this.strafeT = 0;
    this.strafeDir = 1;

    // Attach to foe
    if (this.foe) {
      this.foe.isArbiter = true;
      this.foe.isBoss = true;
      this.foe.bossController = this;
      this.foe.personality = this.personality;
      this.foe.difficultyLevel = this.difficultyLevel;
      this.foe.hp = this.config.maxHp;
      this.foe.maxHp = this.config.maxHp;
      this.foe.skill = this.config.skill;
      this.foe.speed = this.config.speed || 11.5;
      this.foe.shieldCd = 0;
      this.foe.blocking = false;
      this.foe.isChargingThrow = false;
      this.foe.throwCharge = 0;
      this.foe.chargeDuration = 0;
    }
  }

  // ==========================================
  // Event Emitter
  // ==========================================
  on(event, handler) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event).add(handler);
    return () => this.off(event, handler);
  }

  off(event, handler) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).delete(handler);
    }
  }

  emit(event, payload) {
    if (this.listeners.has(event)) {
      for (const handler of this.listeners.get(event)) {
        try {
          handler(payload);
        } catch (_) {}
      }
    }
  }

  // ==========================================
  // Damage & Shield Mechanics
  // ==========================================
  onHit(dmg, disc = null) {
    // If during i-frame evasion window, ignore
    if (this.invulnerableTimer > 0) {
      return { absorbed: true, remainingShields: this.currentShields, coreDamage: 0, invulnerable: true };
    }

    // Reset shield recharge timer on any confirmed hit
    this.shieldRechargeTimer = 0;

    // If multi-layer shield is active, absorb hit completely
    if (this.currentShields > 0) {
      this.currentShields--;
      this.emit('shield_hit', {
        remainingShields: this.currentShields,
        maxShields: this.maxShields,
        depleted: this.currentShields === 0
      });
      return {
        absorbed: true,
        remainingShields: this.currentShields,
        coreDamage: 0,
        invulnerable: false
      };
    }

    // Shields depleted -> core takes damage
    const coreDamage = Math.max(0, dmg);
    if (this.foe) {
      this.foe.hp -= coreDamage;
      this.foe.hurt = 0.5;
    }

    this.emit('core_hit', {
      hp: this.foe ? this.foe.hp : 0,
      maxHp: this.config.maxHp,
      damage: coreDamage
    });

    return {
      absorbed: false,
      remainingShields: 0,
      coreDamage,
      invulnerable: false
    };
  }

  // ==========================================
  // Authoritative Update Loop (Decoupled)
  // ==========================================
  update(dt, player = null, incomingDiscs = [], spawnDiscFn = null) {
    if (!this.foe || this.foe.hp <= 0) return;

    // 1. Tick Invulnerability, Evasion & Shield Frames
    if (this.invulnerableTimer > 0) {
      this.invulnerableTimer -= dt;
    }
    if (this.dashTimer > 0) {
      this.dashTimer -= dt;
    }
    if (this.foe.shieldCd > 0) {
      this.foe.shieldCd -= dt;
    }
    if (this.foe.shieldCd <= 0) {
      this.foe.blocking = false;
      this.foe.parryActive = false;
    }
    if (this.foe.hurt > 0) {
      this.foe.hurt -= dt;
    }

    // 2. Physics & Grounding
    if (this.foe.y === undefined) { this.foe.y = 0; this.foe.vy = 0; this.foe.grounded = true; }
    const prevY = this.foe.y;
    this.foe.vy = (this.foe.vy || 0) - 30 * dt;
    this.foe.y += this.foe.vy * dt;
    if (this.foe.y <= 0 && prevY >= -0.15) {
      this.foe.y = 0;
      this.foe.vy = 0;
      this.foe.grounded = true;
      this.foe.jumps = 0;
    }

    // 3. Process Active Dash Impulse
    if (this.isDashing) {
      this.dashTimeLeft -= dt;
      if (this.dashTimeLeft <= 0) {
        this.isDashing = false;
        this.state = 'ENGAGE';
      } else {
        this.foe.pos.x += this.dashDir.x * this.config.dashSpeed * dt;
        this.foe.pos.z += this.dashDir.z * this.config.dashSpeed * dt;
        if (this.foe.obj) {
          this.foe.obj.position.copy(this.foe.pos);
          this.foe.obj.position.y = this.foe.y || 0;
        }
        return; // Dash overrides other movement
      }
    }

    // 4. Update Multi-Layer Shield Recharge
    if (this.currentShields < this.maxShields) {
      this.shieldRechargeTimer += dt;
      if (this.shieldRechargeTimer >= this.shieldRechargeDelay) {
        this.currentShields++;
        this.shieldRechargeTimer = 0;
        this.emit('shield_recharged', {
          currentShields: this.currentShields,
          maxShields: this.maxShields
        });
      }
    }

    // 5. Threat Detection & Adaptive Parry / Evasion
    if (!this.isDashing && player) {
      this._checkIncomingProjectiles(incomingDiscs);
    }

    // 6. Personality-Driven Locomotion
    if (player && player.pos && this.foe.pos) {
      const pX = player.pos.x;
      const pZ = player.pos.z;
      const dx = pX - this.foe.pos.x;
      const dz = pZ - this.foe.pos.z;
      const dist = Math.hypot(dx, dz) || 1;

      // Facing orientation toward target
      const targetYaw = Math.atan2(dx, dz);
      if (this.foe.obj && this.foe.obj.rotation) {
        this.foe.obj.rotation.y = targetYaw;
      }

      this.strafeT = (this.strafeT || 0) - dt * (this.config.strafeRate || 1.2);
      if (this.strafeT <= 0) {
        this.strafeDir = (this.strafeDir || 1) * -1;
        this.strafeT = 0.6 + Math.random() * 0.8;
      }

      let targetX = 0;
      let targetZ = 0;

      switch (this.personality) {
        case 'SENTINEL': {
          // Central arena dominance
          const centerDist = Math.hypot(this.foe.pos.x, this.foe.pos.z + 10);
          if (centerDist > 6.0) {
            targetX = -this.foe.pos.x / centerDist;
            targetZ = (-10 - this.foe.pos.z) / centerDist;
          } else {
            const sideX = -dz / dist * (this.strafeDir || 1);
            const sideZ = dx / dist * (this.strafeDir || 1);
            targetX = sideX * 0.6;
            targetZ = sideZ * 0.6;
          }
          break;
        }
        case 'SAILMASTER': {
          // Agile Aerialist: high mobility & apex jumps
          const sideX = -dz / dist * (this.strafeDir || 1);
          const sideZ = dx / dist * (this.strafeDir || 1);
          targetX = sideX * 1.2;
          targetZ = sideZ * 1.2;
          if (dist < 10) { targetX -= dx / dist; targetZ -= dz / dist; }
          else if (dist > 22) { targetX += dx / dist; targetZ += dz / dist; }

          if (this.foe.grounded && Math.random() < (this.config.aerialWeight || 0.85) * 0.04) {
            this.foe.vy = 12.5;
            this.foe.grounded = false;
            this.foe.jumps = 1;
            this.emit('aerial_jump', { vy: 12.5 });
          }
          break;
        }
        case 'LEVIATHAN': {
          // Geometric Banker: seeks perimeter sightlines
          const sideX = -dz / dist * (this.strafeDir || 1);
          const sideZ = dx / dist * (this.strafeDir || 1);
          targetX = sideX * 0.8;
          targetZ = sideZ * 0.8;
          if (dist < 18) { targetX -= dx / dist * 0.8; targetZ -= dz / dist * 0.8; }
          break;
        }
        case 'MASTER_CONTROL':
        default: {
          // Apex AI: adaptive spacing
          const sideX = -dz / dist * (this.strafeDir || 1);
          const sideZ = dx / dist * (this.strafeDir || 1);
          targetX = sideX * 1.1;
          targetZ = sideZ * 1.1;
          if (dist < 12) { targetX -= dx / dist; targetZ -= dz / dist; }
          else if (dist > 24) { targetX += dx / dist; targetZ += dz / dist; }

          if (this.foe.grounded && Math.random() < 0.035) {
            this.foe.vy = 12.0;
            this.foe.grounded = false;
            this.foe.jumps = 1;
          }
          break;
        }
      }

      const moveLen = Math.hypot(targetX, targetZ);
      if (moveLen > 0.01) {
        const moveSpeed = this.config.speed || 11.5;
        if (!this.foe.vel) this.foe.vel = new THREE.Vector3();
        this.foe.vel.x = (targetX / moveLen) * moveSpeed;
        this.foe.vel.z = (targetZ / moveLen) * moveSpeed;
        this.foe.pos.x += this.foe.vel.x * dt;
        this.foe.pos.z += this.foe.vel.z * dt;
      }
    }

    // 7. Kinematic Rig Animation
    if (this.foe.obj) {
      this.foe.obj.position.copy(this.foe.pos);
      this.foe.obj.position.y = this.foe.y || 0;
      if (this.foe.obj.userData && this.foe.obj.userData.backDisc) {
        this.foe.obj.userData.backDisc.visible = this.foe.hasDisc !== false;
      }
      animateProgramKinematics(this.foe.obj, dt, {
        speed: this.foe.vel ? Math.hypot(this.foe.vel.x, this.foe.vel.z) : 0,
        vy: this.foe.vy || 0,
        grounded: this.foe.grounded !== false,
        blocking: !!(this.foe.blocking && (this.foe.shieldCd || 0) > 0.2),
        hurt: this.foe.hurt || 0,
        time: (state && state.time) ? state.time : 0,
        hasDisc: this.foe.hasDisc !== false,
        chargingThrow: !!this.foe.isChargingThrow,
        throwCharge: this.foe.throwCharge || 0
      });
    }

    // 8. Master Control Minion Subroutines
    if (this.personality === 'MASTER_CONTROL' && this.currentShields === 0 && !this.summonedMinions) {
      this.summonedMinions = true;
      this.emit('summon_minions', {
        count: 2,
        gridId: this.gridId,
        levelId: this.levelId
      });
    }

    // 9. Aggressive Curve-Disc Volleys
    this.volleyTimer += dt;
    if (this.isFiringVolley) {
      this.nextVolleyDiscTimer -= dt;
      if (this.nextVolleyDiscTimer <= 0) {
        this._fireVolleyDisc(player, spawnDiscFn);
      }
    } else if (this.volleyTimer >= this.volleyCooldown && player) {
      this._startVolley();
    }
  }

  // ==========================================
  // Threat Detection & Adaptive Evasion
  // ==========================================
  _checkIncomingProjectiles(discs) {
    if (!Array.isArray(discs) || !this.foe) return;

    for (const d of discs) {
      if (!d || d.owner === this.foe || !d.vel) continue;

      const dx = this.foe.pos.x - d.pos.x;
      const dz = this.foe.pos.z - d.pos.z;
      const dist = Math.hypot(dx, dz);

      if (dist < 7.0 && dist > 0.5) {
        const velLen = Math.hypot(d.vel.x, d.vel.z);
        if (velLen > 0.1) {
          const vNormX = d.vel.x / velLen;
          const vNormZ = d.vel.z / velLen;
          const toFoeX = dx / dist;
          const toFoeZ = dz / dist;
          const dot = vNormX * toFoeX + vNormZ * toFoeZ;

          if (dot > 0.75) {
            const isGuardCrush = (d.charge || 0) >= 0.85;

            // Master Control Level 10 Adaptive Counter
            if (this.personality === 'MASTER_CONTROL') {
              if (isGuardCrush) {
                // Adaptive read: NEVER attempt parry on guard crush -> dash immediately!
                if (this.dashTimer <= 0) {
                  this._triggerReactiveDash(vNormX, vNormZ);
                  break;
                }
              } else if (dist <= 2.5 && (this.foe.shieldCd || 0) <= 0) {
                // Frame-perfect parry raise
                this.foe.blocking = true;
                this.foe.shieldCd = 0.8;
                this.emit('parry_raised', { disc: d });
                break;
              }
            }

            if (this.dashTimer <= 0) {
              this._triggerReactiveDash(vNormX, vNormZ);
              break;
            }
          }
        }
      }
    }
  }

  _triggerReactiveDash(inX, inZ) {
    this.isDashing = true;
    this.dashTimeLeft = this.dashDuration;
    this.dashTimer = this.dashCooldown;
    this.invulnerableTimer = 0.25;
    this.state = 'EVADE';

    const sign = Math.random() < 0.5 ? 1 : -1;
    this.dashDir.set(-inZ * sign, 0, inX * sign).normalize();

    this.emit('evaded', {
      dir: this.dashDir.clone(),
      invulnerableDuration: 0.25
    });
  }

  // ==========================================
  // Attack Volleys
  // ==========================================
  _startVolley() {
    this.isFiringVolley = true;
    this.volleyRemaining = this.volleyCount;
    this.nextVolleyDiscTimer = 0;
    this.volleyTimer = 0;
    this.volleySign = Math.random() < 0.5 ? 1 : -1;
    this.state = 'VOLLEY';
  }

  _fireVolleyDisc(player, spawnDiscFn) {
    if (this.volleyRemaining <= 0) {
      this.isFiringVolley = false;
      this.state = 'ENGAGE';
      return;
    }

    this.volleyRemaining--;
    this.nextVolleyDiscTimer = this.volleyInterval;

    if (player && typeof spawnDiscFn === 'function') {
      const pPos = player.pos || { x: 0, y: 0, z: 0 };
      const fPos = this.foe.pos;

      const dx = pPos.x - fPos.x;
      const dz = pPos.z - fPos.z;
      const dist = Math.hypot(dx, dz) || 1;

      const origin = new THREE.Vector3(fPos.x, 1.7 + (this.foe.y || 0), fPos.z);
      let aimDir = new THREE.Vector3(dx / dist, 0, dz / dist);

      let curve = this.config.curvePower * this.volleySign;
      this.volleySign *= -1;

      let charge = 0;

      // Personality volleys
      if (this.personality === 'SENTINEL') {
        // High-charge guard-crush throw on first disc of volley
        if (this.volleyRemaining === this.volleyCount - 1) {
          charge = 0.90;
        }
      } else if (this.personality === 'LEVIATHAN') {
        // Calculate specular bank-shot off perimeter wall
        const bankOut = {};
        BotCombatBrain.calculateBankShot(fPos, pPos, bankOut, { obstacles: pillars });
        if (bankOut.valid) {
          aimDir.copy(bankOut.aimDir);
          curve = 0; // Bank shots use pure specular trajectories
        }
      } else if (this.personality === 'SAILMASTER') {
        // Steep hook curves
        curve = this.config.curvePower * 1.25 * this.volleySign;
      } else if (this.personality === 'MASTER_CONTROL') {
        // Master Control combines charged curve shots
        if (Math.random() < 0.5) charge = 0.90;
        curve = this.config.curvePower * 1.1 * this.volleySign;
      }

      origin.addScaledVector(aimDir, 1.2);
      const vel = aimDir.clone().multiplyScalar(this.config.discSpeed * (1 + charge * 0.25));
      spawnDiscFn(origin, vel, this.foe, this.primaryColor, curve, charge);

      this.emit('volley_disc_fired', {
        remaining: this.volleyRemaining,
        curve,
        charge
      });
    }

    if (this.volleyRemaining <= 0) {
      this.isFiringVolley = false;
      this.state = 'ENGAGE';
    }
  }

  // ==========================================
  // Telemetry Snapshot
  // ==========================================
  getTelemetry() {
    return {
      name: this.name,
      title: this.title,
      gridId: this.gridId,
      levelId: this.levelId,
      personality: this.personality,
      hp: Math.max(0, this.foe ? this.foe.hp : 0),
      maxHp: this.config.maxHp,
      shields: this.currentShields,
      maxShields: this.maxShields,
      rechargeProgress: this.currentShields < this.maxShields ? this.shieldRechargeTimer / this.shieldRechargeDelay : 1.0,
      state: this.state,
      primaryColor: this.primaryColor
    };
  }
}
