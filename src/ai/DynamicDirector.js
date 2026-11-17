import { state } from '../core/state.js';
import { pillars } from '../entities/Arena.js';

/**
 * DynamicDirector.js
 * Real-time adaptive combat director for Survival: Hardcore mode.
 * Evaluates rolling player behavior across 5.0s sliding windows to eliminate
 * passive turtling and reward dynamic movement.
 */
export class DynamicDirector {
  constructor() {
    this.parryTimestamps = [];
    this.pillarCampingTime = 0;
    this.blockingDuration = 0;
    this.flawlessHealth = true;
    this.counterParry = false;
    this.counterCamping = false;
    this.difficultyModifier = 0;
    this.windowDuration = 5.0; // 5-second sliding window
  }

  /**
   * Records a successful player parry/deflection.
   * @param {number} [timestamp]
   */
  recordParry(timestamp = (state.time || 0)) {
    this.parryTimestamps.push(timestamp);
  }

  /**
   * Resets all rolling metrics and state tracking.
   */
  reset() {
    this.parryTimestamps = [];
    this.pillarCampingTime = 0;
    this.blockingDuration = 0;
    this.flawlessHealth = true;
    this.counterParry = false;
    this.counterCamping = false;
    this.difficultyModifier = 0;
  }

  /**
   * Updates rolling telemetry metrics and determines tactical directives.
   * @param {number} dt Delta time in seconds
   * @param {object} [player] Player entity reference
   * @param {Array} [foes] Active foes array
   */
  update(dt, player = state.player, foes = state.foes) {
    if (!player) return;
    const currentTime = state.time || 0;

    // 1. Sliding window for parry frequency (> 2 parries / 5s triggers charge throw counter)
    const threshold = currentTime - this.windowDuration;
    let validIdx = 0;
    for (let i = 0; i < this.parryTimestamps.length; i++) {
      if (this.parryTimestamps[i] >= threshold) {
        this.parryTimestamps[validIdx++] = this.parryTimestamps[i];
      }
    }
    this.parryTimestamps.length = validIdx;
    const parryFrequency = this.parryTimestamps.length;

    // Track sustained defensive blocking
    const isBlocking = !!(player.blocking || state.touchBlocking || (player.parryTimer || 0) > 0);
    if (isBlocking) {
      this.blockingDuration += dt;
    } else {
      this.blockingDuration = Math.max(0, this.blockingDuration - dt * 2.0);
    }

    this.counterParry = (parryFrequency > 2) || (this.blockingDuration > 2.0);

    // 2. Pillar camping detection (> 3.0s in cover triggers bank-shot ricochets)
    let inPillarCover = false;
    const pPos = player.pos;
    const speed = player.vel ? player.vel.length() : 0;

    if (pPos && pillars && pillars.length > 0) {
      for (let i = 0; i < pillars.length; i++) {
        const p = pillars[i];
        const dx = pPos.x - p.x;
        const dz = pPos.z - p.z;
        const distSq = dx * dx + dz * dz;
        const coverRadius = (p.r || 1.6) + 3.2;
        if (distSq <= coverRadius * coverRadius) {
          // Inside pillar perimeter and stationary / slow moving
          if (speed < 2.0) {
            inPillarCover = true;
            break;
          }
        }
      }
    }

    if (inPillarCover) {
      this.pillarCampingTime += dt;
    } else {
      this.pillarCampingTime = Math.max(0, this.pillarCampingTime - dt * 1.5);
    }

    this.counterCamping = (this.pillarCampingTime > 3.0);

    // 3. Flawless health tracking (100% HP -> elevate effective difficulty level by +1)
    if (player.hp < 100) {
      this.flawlessHealth = false;
      this.difficultyModifier = 0;
    } else {
      this.flawlessHealth = true;
      this.difficultyModifier = 1;
    }
  }

  isCounteringParry() {
    return this.counterParry;
  }

  isCounteringCamping() {
    return this.counterCamping;
  }

  getDifficultyModifier() {
    return this.difficultyModifier;
  }

  getMetrics() {
    return {
      parryFrequency: this.parryTimestamps.length,
      blockingDuration: this.blockingDuration,
      pillarCampingTime: this.pillarCampingTime,
      flawlessHealth: this.flawlessHealth,
      difficultyModifier: this.difficultyModifier,
      counterParry: this.counterParry,
      counterCamping: this.counterCamping
    };
  }
}

export const dynamicDirector = new DynamicDirector();

if (typeof window !== 'undefined') {
  window.__tronDynamicDirector = dynamicDirector;
}
