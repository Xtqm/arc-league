/**
 * BotCombatBrain.js
 * Unified Autonomous Bot Combat Brain & 10-Level Capability Ladder.
 *
 * Implements:
 * - 10-level capability matrix gating bot combat abilities (AIM_LEAD, COVER_SEEK,
 *   JUMP_EVADE, LATERAL_DASH, CURVE_THROW, PARRY_DEFENSE, CHARGED_THROW,
 *   BANK_RICOCHET, AERIAL_COMBAT, ADAPTIVE_COUNTER).
 * - Player-parity capability queries (canParry, canCharge, canBank, canCurve, etc.).
 * - Allocation-free 2D geometric specular wall-bank reflection solver off arena boundaries.
 */

import * as THREE from '../../vendor/three.module.js';
import { config } from '../core/config.js';
import { pillars } from '../entities/Arena.js';

export const BOT_CAPABILITIES = Object.freeze({
  AIM_LEAD: 'AIM_LEAD',
  COVER_SEEK: 'COVER_SEEK',
  JUMP_EVADE: 'JUMP_EVADE',
  LATERAL_DASH: 'LATERAL_DASH',
  CURVE_THROW: 'CURVE_THROW',
  PARRY_DEFENSE: 'PARRY_DEFENSE',
  CHARGED_THROW: 'CHARGED_THROW',
  BANK_RICOCHET: 'BANK_RICOCHET',
  AERIAL_COMBAT: 'AERIAL_COMBAT',
  ADAPTIVE_COUNTER: 'ADAPTIVE_COUNTER'
});

export const CAPABILITY_MIN_LEVELS = Object.freeze({
  [BOT_CAPABILITIES.AIM_LEAD]: 1,
  [BOT_CAPABILITIES.COVER_SEEK]: 2,
  [BOT_CAPABILITIES.JUMP_EVADE]: 3,
  [BOT_CAPABILITIES.LATERAL_DASH]: 4,
  [BOT_CAPABILITIES.CURVE_THROW]: 5,
  [BOT_CAPABILITIES.PARRY_DEFENSE]: 5,
  [BOT_CAPABILITIES.CHARGED_THROW]: 5,
  [BOT_CAPABILITIES.BANK_RICOCHET]: 6,
  [BOT_CAPABILITIES.AERIAL_COMBAT]: 7,
  [BOT_CAPABILITIES.ADAPTIVE_COUNTER]: 10
});

// Authoritative capability set mapped per level (1 through 10)
export const CAPABILITY_MATRIX = Object.freeze({
  1: Object.freeze([BOT_CAPABILITIES.AIM_LEAD]),
  2: Object.freeze([BOT_CAPABILITIES.AIM_LEAD, BOT_CAPABILITIES.COVER_SEEK]),
  3: Object.freeze([BOT_CAPABILITIES.AIM_LEAD, BOT_CAPABILITIES.COVER_SEEK, BOT_CAPABILITIES.JUMP_EVADE]),
  4: Object.freeze([
    BOT_CAPABILITIES.AIM_LEAD,
    BOT_CAPABILITIES.COVER_SEEK,
    BOT_CAPABILITIES.JUMP_EVADE,
    BOT_CAPABILITIES.LATERAL_DASH
  ]),
  5: Object.freeze([
    BOT_CAPABILITIES.AIM_LEAD,
    BOT_CAPABILITIES.COVER_SEEK,
    BOT_CAPABILITIES.JUMP_EVADE,
    BOT_CAPABILITIES.LATERAL_DASH,
    BOT_CAPABILITIES.CURVE_THROW,
    BOT_CAPABILITIES.PARRY_DEFENSE,
    BOT_CAPABILITIES.CHARGED_THROW
  ]),
  6: Object.freeze([
    BOT_CAPABILITIES.AIM_LEAD,
    BOT_CAPABILITIES.COVER_SEEK,
    BOT_CAPABILITIES.JUMP_EVADE,
    BOT_CAPABILITIES.LATERAL_DASH,
    BOT_CAPABILITIES.CURVE_THROW,
    BOT_CAPABILITIES.PARRY_DEFENSE,
    BOT_CAPABILITIES.CHARGED_THROW,
    BOT_CAPABILITIES.BANK_RICOCHET
  ]),
  7: Object.freeze([
    BOT_CAPABILITIES.AIM_LEAD,
    BOT_CAPABILITIES.COVER_SEEK,
    BOT_CAPABILITIES.JUMP_EVADE,
    BOT_CAPABILITIES.LATERAL_DASH,
    BOT_CAPABILITIES.CURVE_THROW,
    BOT_CAPABILITIES.PARRY_DEFENSE,
    BOT_CAPABILITIES.CHARGED_THROW,
    BOT_CAPABILITIES.BANK_RICOCHET,
    BOT_CAPABILITIES.AERIAL_COMBAT
  ]),
  8: Object.freeze([
    BOT_CAPABILITIES.AIM_LEAD,
    BOT_CAPABILITIES.COVER_SEEK,
    BOT_CAPABILITIES.JUMP_EVADE,
    BOT_CAPABILITIES.LATERAL_DASH,
    BOT_CAPABILITIES.CURVE_THROW,
    BOT_CAPABILITIES.PARRY_DEFENSE,
    BOT_CAPABILITIES.CHARGED_THROW,
    BOT_CAPABILITIES.BANK_RICOCHET,
    BOT_CAPABILITIES.AERIAL_COMBAT
  ]),
  9: Object.freeze([
    BOT_CAPABILITIES.AIM_LEAD,
    BOT_CAPABILITIES.COVER_SEEK,
    BOT_CAPABILITIES.JUMP_EVADE,
    BOT_CAPABILITIES.LATERAL_DASH,
    BOT_CAPABILITIES.CURVE_THROW,
    BOT_CAPABILITIES.PARRY_DEFENSE,
    BOT_CAPABILITIES.CHARGED_THROW,
    BOT_CAPABILITIES.BANK_RICOCHET,
    BOT_CAPABILITIES.AERIAL_COMBAT
  ]),
  10: Object.freeze([
    BOT_CAPABILITIES.AIM_LEAD,
    BOT_CAPABILITIES.COVER_SEEK,
    BOT_CAPABILITIES.JUMP_EVADE,
    BOT_CAPABILITIES.LATERAL_DASH,
    BOT_CAPABILITIES.CURVE_THROW,
    BOT_CAPABILITIES.PARRY_DEFENSE,
    BOT_CAPABILITIES.CHARGED_THROW,
    BOT_CAPABILITIES.BANK_RICOCHET,
    BOT_CAPABILITIES.AERIAL_COMBAT,
    BOT_CAPABILITIES.ADAPTIVE_COUNTER
  ])
});

// Scratch structures for allocation-free specular bank solver
const _scratchCandidateWalls = [
  { name: 'RIGHT', isX: true, sign: 1 },
  { name: 'LEFT', isX: true, sign: -1 },
  { name: 'TOP', isX: false, sign: 1 },
  { name: 'BOTTOM', isX: false, sign: -1 }
];

function segmentIntersectsCircle(x1, z1, x2, z2, cx, cz, radius) {
  const dx = x2 - x1;
  const dz = z2 - z1;
  const lenSq = dx * dx + dz * dz;
  if (lenSq < 1e-6) {
    const dcx = x1 - cx;
    const dcz = z1 - cz;
    return (dcx * dcx + dcz * dcz) < radius * radius;
  }
  const t = Math.max(0, Math.min(1, -((x1 - cx) * dx + (z1 - cz) * dz) / lenSq));
  const nx = x1 + t * dx - cx;
  const nz = z1 + t * dz - cz;
  return (nx * nx + nz * nz) < (radius * radius);
}

export class BotCombatBrain {
  /**
   * Resolves an effective difficulty integer (1 to 10) from an arbitrary entity or input.
   * @param {number|object} input
   * @returns {number} Integer between 1 and 10
   */
  static resolveDifficulty(input) {
    if (typeof input === 'number') {
      if (isNaN(input)) return 1;
      return Math.max(1, Math.min(10, Math.floor(input)));
    }
    if (!input || typeof input !== 'object') {
      return 1;
    }
    if (typeof input.difficultyLevel === 'number') {
      return Math.max(1, Math.min(10, Math.floor(input.difficultyLevel)));
    }
    if (input.isArbiter) {
      if (input.gridId === 'grid_04' || input.levelId === 'level_04_08') return 10;
      if (input.gridId === 'grid_03' || input.levelId === 'level_03_07') return 8;
      if (input.gridId === 'grid_02' || input.levelId === 'level_02_07') return 7;
      return 6;
    }
    if (typeof input.tier === 'number') {
      // Map Solo Duel Tiers (1 to 4+)
      return Math.max(1, Math.min(10, Math.floor(3 + input.tier * 1.5)));
    }
    if (typeof input.skill === 'number') {
      // Map skill float 0.0 - 1.0 to 1 - 10
      return Math.max(1, Math.min(10, Math.floor(1 + input.skill * 9)));
    }
    return 1;
  }

  /**
   * Checks whether a given difficulty level or bot entity possesses a capability.
   * @param {number|object} target
   * @param {string} capability
   * @returns {boolean}
   */
  static hasCapability(target, capability) {
    const level = BotCombatBrain.resolveDifficulty(target);
    const minLevel = CAPABILITY_MIN_LEVELS[capability];
    if (minLevel === undefined) return false;
    return level >= minLevel;
  }

  /**
   * Retrieves array of capabilities for a given difficulty level or bot entity.
   * @param {number|object} target
   * @returns {Array<string>}
   */
  static getCapabilities(target) {
    const level = BotCombatBrain.resolveDifficulty(target);
    return CAPABILITY_MATRIX[level] || CAPABILITY_MATRIX[1];
  }

  // Capability query predicates
  static canLeadAim(target) {
    return BotCombatBrain.hasCapability(target, BOT_CAPABILITIES.AIM_LEAD);
  }

  static canSeekCover(target) {
    return BotCombatBrain.hasCapability(target, BOT_CAPABILITIES.COVER_SEEK);
  }

  static canJumpEvade(target) {
    return BotCombatBrain.hasCapability(target, BOT_CAPABILITIES.JUMP_EVADE);
  }

  static canDash(target) {
    return BotCombatBrain.hasCapability(target, BOT_CAPABILITIES.LATERAL_DASH);
  }

  static canCurve(target) {
    return BotCombatBrain.hasCapability(target, BOT_CAPABILITIES.CURVE_THROW);
  }

  static canParry(target) {
    return BotCombatBrain.hasCapability(target, BOT_CAPABILITIES.PARRY_DEFENSE);
  }

  static canCharge(target) {
    return BotCombatBrain.hasCapability(target, BOT_CAPABILITIES.CHARGED_THROW);
  }

  static canBank(target) {
    return BotCombatBrain.hasCapability(target, BOT_CAPABILITIES.BANK_RICOCHET);
  }

  static canAerialCombat(target) {
    return BotCombatBrain.hasCapability(target, BOT_CAPABILITIES.AERIAL_COMBAT);
  }

  static canAdaptiveCounter(target) {
    return BotCombatBrain.hasCapability(target, BOT_CAPABILITIES.ADAPTIVE_COUNTER);
  }

  /**
   * 2D Geometric Specular Wall-Bank Reflection Solver.
   * Computes a 1-bounce specular reflection ray connecting fromPos -> arena wall -> toPos.
   * Completely allocation-free when using scratch outputs.
   *
   * @param {object} fromPos Starting point { x, z }
   * @param {object} toPos Target point { x, z }
   * @param {object} [outResult={}] Output object to populate
   * @param {object} [options={}] Additional calculation parameters
   * @returns {object} outResult with { valid, wall, bouncePoint, aimDir, reflectedDir, totalDist, isRearStrike }
   */
  static calculateBankShot(fromPos, toPos, outResult = {}, options = {}) {
    const arenaLim = options.arenaLim || (config && config.ARENA ? config.ARENA - 1.5 : 44.5);
    const checkObstacles = options.checkObstacles !== false;
    const obstacleList = options.obstacles || pillars || [];
    const targetFacing = options.targetFacing || null;
    const clearanceMargin = options.clearanceMargin !== undefined ? options.clearanceMargin : 0.45;
    const preferredWall = options.preferredWall || null;

    const x1 = fromPos.x || 0;
    const z1 = fromPos.z || 0;
    const x2 = toPos.x || 0;
    const z2 = toPos.z || 0;

    let bestWall = null;
    let bestDist = Infinity;
    let bestXw = 0;
    let bestZw = 0;
    let bestAimX = 0;
    let bestAimZ = 0;
    let bestReflX = 0;
    let bestReflZ = 0;
    let bestIsRear = false;

    for (let i = 0; i < 4; i++) {
      const w = _scratchCandidateWalls[i];
      if (preferredWall && w.name !== preferredWall) continue;
      let xw = 0;
      let zw = 0;
      let valid = false;

      if (w.isX) {
        // Vertical boundary wall (X = sign * arenaLim)
        const wallX = w.sign * arenaLim;
        // Target virtual reflection image across line X = wallX
        const x2Virtual = 2 * wallX - x2;
        const dxVirtual = x2Virtual - x1;
        if (Math.abs(dxVirtual) > 1e-4) {
          const t = (wallX - x1) / dxVirtual;
          if (t > 0.02 && t < 0.98) {
            zw = z1 + t * (z2 - z1);
            xw = wallX;
            if (Math.abs(zw) <= arenaLim) {
              valid = true;
            }
          }
        }
      } else {
        // Horizontal boundary wall (Z = sign * arenaLim)
        const wallZ = w.sign * arenaLim;
        // Target virtual reflection image across line Z = wallZ
        const z2Virtual = 2 * wallZ - z2;
        const dzVirtual = z2Virtual - z1;
        if (Math.abs(dzVirtual) > 1e-4) {
          const t = (wallZ - z1) / dzVirtual;
          if (t > 0.02 && t < 0.98) {
            xw = x1 + t * (x2 - x1);
            zw = wallZ;
            if (Math.abs(xw) <= arenaLim) {
              valid = true;
            }
          }
        }
      }

      if (!valid) continue;

      // Check obstacle occlusion for segment 1 (fromPos -> bouncePoint) and segment 2 (bouncePoint -> toPos)
      let obstructed = false;
      if (checkObstacles && obstacleList.length > 0) {
        for (let j = 0; j < obstacleList.length; j++) {
          const p = obstacleList[j];
          const pr = (p.r || 1.2) + clearanceMargin;
          if (segmentIntersectsCircle(x1, z1, xw, zw, p.x, p.z, pr) ||
              segmentIntersectsCircle(xw, zw, x2, z2, p.x, p.z, pr)) {
            obstructed = true;
            break;
          }
        }
      }
      if (obstructed) continue;

      const d1 = Math.hypot(xw - x1, zw - z1);
      const d2 = Math.hypot(x2 - xw, z2 - zw);
      const totalDist = d1 + d2;

      // Check rear hemisphere strike
      let isRear = false;
      if (targetFacing && (targetFacing.x !== 0 || targetFacing.z !== 0)) {
        const arrivalDirX = (x2 - xw) / (d2 || 1);
        const arrivalDirZ = (z2 - zw) / (d2 || 1);
        // Arrival vector into target dot target's facing direction:
        // If moving in the same direction target faces, strikes from rear hemisphere
        const tfLen = Math.hypot(targetFacing.x, targetFacing.z) || 1;
        const dot = (arrivalDirX * targetFacing.x + arrivalDirZ * targetFacing.z) / tfLen;
        if (dot > 0.05) {
          isRear = true;
        }
      }

      // Prioritize rear strikes or shortest path
      const score = totalDist - (isRear ? 15 : 0);
      const bestScore = bestDist - (bestIsRear ? 15 : 0);

      if (score < bestScore) {
        bestWall = w.name;
        bestDist = totalDist;
        bestXw = xw;
        bestZw = zw;
        bestAimX = (xw - x1) / (d1 || 1);
        bestAimZ = (zw - z1) / (d1 || 1);
        bestReflX = (x2 - xw) / (d2 || 1);
        bestReflZ = (z2 - zw) / (d2 || 1);
        bestIsRear = isRear;
      }
    }

    if (!bestWall) {
      outResult.valid = false;
      return outResult;
    }

    outResult.valid = true;
    outResult.wall = bestWall;
    if (!outResult.bouncePoint) {
      outResult.bouncePoint = new THREE.Vector3();
    }
    outResult.bouncePoint.set(bestXw, 0, bestZw);

    if (!outResult.aimDir) {
      outResult.aimDir = new THREE.Vector3();
    }
    outResult.aimDir.set(bestAimX, 0, bestAimZ);

    if (!outResult.reflectedDir) {
      outResult.reflectedDir = new THREE.Vector3();
    }
    outResult.reflectedDir.set(bestReflX, 0, bestReflZ);

    outResult.totalDist = bestDist;
    outResult.isRearStrike = bestIsRear;

    return outResult;
  }

  /**
   * Instance constructor wrapping difficulty and helper methods.
   * @param {number|object} difficulty
   */
  constructor(difficulty = 1) {
    this.difficultyLevel = BotCombatBrain.resolveDifficulty(difficulty);
  }

  hasCapability(cap) {
    return BotCombatBrain.hasCapability(this.difficultyLevel, cap);
  }

  getCapabilities() {
    return BotCombatBrain.getCapabilities(this.difficultyLevel);
  }

  canLeadAim() { return BotCombatBrain.canLeadAim(this.difficultyLevel); }
  canSeekCover() { return BotCombatBrain.canSeekCover(this.difficultyLevel); }
  canJumpEvade() { return BotCombatBrain.canJumpEvade(this.difficultyLevel); }
  canDash() { return BotCombatBrain.canDash(this.difficultyLevel); }
  canCurve() { return BotCombatBrain.canCurve(this.difficultyLevel); }
  canParry() { return BotCombatBrain.canParry(this.difficultyLevel); }
  canCharge() { return BotCombatBrain.canCharge(this.difficultyLevel); }
  canBank() { return BotCombatBrain.canBank(this.difficultyLevel); }
  canAerialCombat() { return BotCombatBrain.canAerialCombat(this.difficultyLevel); }
  canAdaptiveCounter() { return BotCombatBrain.canAdaptiveCounter(this.difficultyLevel); }

  calculateBankShot(fromPos, toPos, outResult = {}, options = {}) {
    return BotCombatBrain.calculateBankShot(fromPos, toPos, outResult, options);
  }
}
