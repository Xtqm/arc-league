/**
 * SwarmEconomyBridge.js
 * Swarm Defense Endurance Payout Pipeline for Tron Disc Arena (SPEC-ACHIEVE-001).
 *
 * Awards Bits and XP at the completion of each Swarm wave:
 * - Base yield of 15 Bits/wave scaled by a compound survival streak bonus.
 * - Milestone wave bonus chests every 5 waves (Wave 5, 10, 15, 20+).
 * - Monotonically updates `stats.swarmHighestWave` in StorageManager when a player sets a new record.
 */

import { economyManager as defaultEconomyManager } from '../core/economy/EconomyManager.js';
import { storageManager as defaultStorageManager } from '../core/storage/StorageManager.js';
import { state as defaultGameState } from '../core/state.js';

export const SWARM_ECONOMY_CONFIG = Object.freeze({
  BASE_CREDITS_PER_WAVE: 5,
  BASE_BITS_PER_WAVE: 5,
  BASE_XP_PER_WAVE: 20,
  HARDCORE_BASE_XP_PER_WAVE: 65,
  STREAK_SCALING: 0.10, // +10% per consecutive wave in streak
  STREAK_BITS_SCALING: 0.10,
  STREAK_XP_SCALING: 0.10,
  MAX_STREAK_MULTIPLIER: 2.5,
  MILESTONE_INTERVAL: 5,
  MILESTONE_BASE_CREDITS: 50,
  MILESTONE_BASE_BITS: 50,
  MILESTONE_BASE_XP: 150
});

export const SwarmEconomyEvents = Object.freeze({
  WAVE_PAYOUT: 'SWARM_WAVE_PAYOUT',
  MILESTONE_CHEST_UNLOCKED: 'SWARM_MILESTONE_CHEST_UNLOCKED',
  SURVIVAL_RECORD_UPDATED: 'SWARM_SURVIVAL_RECORD_UPDATED'
});

export class SwarmEconomyBridge {
  /**
   * @param {object} [options]
   * @param {import('../core/economy/EconomyManager.js').EconomyManager} [options.economy]
   * @param {import('../core/storage/StorageManager.js').StorageManager} [options.storage]
   */
  constructor(options = {}) {
    this.economy = options.economy || defaultEconomyManager;
    this.storage = options.storage || defaultStorageManager;
    this.streak = 0;
    this._listeners = new Map();
  }

  // ==========================================
  // Event Emitter
  // ==========================================

  on(event, handler) {
    if (!this._listeners.has(event)) {
      this._listeners.set(event, new Set());
    }
    this._listeners.get(event).add(handler);
    return () => this.off(event, handler);
  }

  off(event, handler) {
    if (this._listeners.has(event)) {
      this._listeners.get(event).delete(handler);
    }
  }

  emit(event, payload) {
    if (this._listeners.has(event)) {
      for (const handler of this._listeners.get(event)) {
        try {
          handler(payload);
        } catch (err) {
          console.error(`[SwarmEconomyBridge] Error in event listener for ${event}:`, err);
        }
      }
    }
  }

  // ==========================================
  // Calculations
  // ==========================================

  /**
   * Calculates wave payout math deterministically for Standard or Hardcore Swarm.
   * @param {number} wave Wave number
   * @param {number} [streak] Optional streak count (defaults to wave)
   * @param {object} [options]
   * @param {boolean} [options.isHardcore=false]
   * @returns {object} Payout breakdown
   */
  calculateWavePayout(wave, streak = wave, options = {}) {
    const w = Math.max(1, Math.floor(Number(wave) || 1));
    const s = Math.max(1, Math.floor(Number(streak) || 1));
    const isHardcore = Boolean(options && options.isHardcore);

    const streakMultiplier = Math.min(
      SWARM_ECONOMY_CONFIG.MAX_STREAK_MULTIPLIER,
      1 + (s - 1) * SWARM_ECONOMY_CONFIG.STREAK_SCALING
    );

    if (isHardcore) {
      const waveXP = Math.floor(SWARM_ECONOMY_CONFIG.HARDCORE_BASE_XP_PER_WAVE * streakMultiplier);
      let milestoneSparks = 0;
      let milestoneXP = 0;
      let isMilestone = false;

      if (w === 5) {
        isMilestone = true;
        milestoneSparks = 1;
        milestoneXP = 200;
      } else if (w === 10) {
        isMilestone = true;
        milestoneSparks = 2;
        milestoneXP = 400;
      } else if (w === 15) {
        isMilestone = true;
        milestoneSparks = 3;
        milestoneXP = 600;
      } else if (w >= 20 && w % 10 === 0) {
        isMilestone = true;
        const factor = (w / 10) - 1;
        milestoneSparks = 5 * factor;
        milestoneXP = 1000 * factor;
      }

      const tier = isMilestone ? Math.floor(w / SWARM_ECONOMY_CONFIG.MILESTONE_INTERVAL) : 0;
      return {
        wave: w,
        streak: s,
        isHardcore: true,
        streakMultiplier,
        waveCredits: 0,
        waveBits: 0,
        waveXP,
        isMilestone,
        tier,
        milestoneCredits: 0,
        milestoneBits: 0,
        milestoneSparks,
        milestoneXP,
        totalCredits: 0,
        totalBits: 0,
        totalSparks: milestoneSparks,
        totalXP: waveXP + milestoneXP
      };
    }

    // Standard Swarm
    const waveCredits = Math.floor(SWARM_ECONOMY_CONFIG.BASE_CREDITS_PER_WAVE * streakMultiplier);
    const waveXP = Math.floor(SWARM_ECONOMY_CONFIG.BASE_XP_PER_WAVE * streakMultiplier);

    const isMilestone = (w % SWARM_ECONOMY_CONFIG.MILESTONE_INTERVAL === 0);
    const tier = isMilestone ? Math.floor(w / SWARM_ECONOMY_CONFIG.MILESTONE_INTERVAL) : 0;
    const milestoneCredits = isMilestone ? tier * SWARM_ECONOMY_CONFIG.MILESTONE_BASE_CREDITS : 0;
    const milestoneXP = isMilestone ? tier * SWARM_ECONOMY_CONFIG.MILESTONE_BASE_XP : 0;

    return {
      wave: w,
      streak: s,
      isHardcore: false,
      streakMultiplier,
      waveCredits,
      waveBits: waveCredits,
      waveXP,
      isMilestone,
      tier,
      milestoneCredits,
      milestoneBits: milestoneCredits,
      milestoneSparks: 0,
      milestoneXP,
      totalCredits: waveCredits + milestoneCredits,
      totalBits: waveCredits + milestoneCredits,
      totalSparks: 0,
      totalXP: waveXP + milestoneXP
    };
  }

  /**
   * Resets active survival streak (e.g. on player death or new run).
   */
  resetStreak() {
    this.streak = 0;
  }

  /**
   * Processes completion of a Swarm wave, dispensing economy payouts and checking record milestones.
   * @param {number} wave Completed wave number
   * @param {object} [options]
   * @param {boolean} [options.isHardcore]
   * @returns {object} Execution report
   */
  processWaveCompletion(wave, options = {}) {
    const w = Math.max(1, Math.floor(Number(wave) || 1));
    const isHardcore = options && options.isHardcore !== undefined
      ? Boolean(options.isHardcore)
      : Boolean(defaultGameState?.isHardcoreSurvival);

    this.streak += 1;

    const payout = this.calculateWavePayout(w, this.streak, { isHardcore });

    const source = isHardcore ? `swarm_hardcore_wave_${w}` : `swarm_wave_${w}`;
    if (payout.totalCredits > 0 && this.economy) {
      if (typeof this.economy.awardCredits === 'function') {
        this.economy.awardCredits(payout.totalCredits, source);
      } else if (typeof this.economy.awardBits === 'function') {
        this.economy.awardBits(payout.totalCredits, source);
      }
    }
    if (payout.totalSparks > 0 && this.economy && typeof this.economy.awardSparks === 'function') {
      this.economy.awardSparks(payout.totalSparks, source);
    }
    if (payout.totalXP > 0 && this.economy && typeof this.economy.awardXP === 'function') {
      this.economy.awardXP(payout.totalXP, source);
    }

    let newRecord = false;
    let previousRecord = isHardcore ? 0 : 1;
    if (this.storage && typeof this.storage.get === 'function' && typeof this.storage.set === 'function') {
      if (isHardcore) {
        previousRecord = Number(this.storage.get('stats.hardcoreSwarmHighestWave', 0) || 0);
        if (w > previousRecord) {
          this.storage.set('stats.hardcoreSwarmHighestWave', w);
          newRecord = true;
          this.emit(SwarmEconomyEvents.SURVIVAL_RECORD_UPDATED, {
            previousRecord,
            newRecord: w,
            isHardcore: true
          });
        }
      } else {
        previousRecord = Math.max(
          this.storage.get('stats.swarmMaxWave', 1) || 1,
          this.storage.get('stats.swarmHighestWave', 1) || 1
        );
        if (w > previousRecord) {
          this.storage.set('stats.swarmHighestWave', w);
          this.storage.set('stats.swarmMaxWave', w);
          this.storage.set('stats.highestWave', w);
          newRecord = true;
          this.emit(SwarmEconomyEvents.SURVIVAL_RECORD_UPDATED, {
            previousRecord,
            newRecord: w,
            isHardcore: false
          });
        }
      }
    }

    // Emit wave payout event
    this.emit(SwarmEconomyEvents.WAVE_PAYOUT, {
      wave: w,
      streak: this.streak,
      isHardcore,
      payout,
      newRecord,
      previousRecord
    });

    if (payout.isMilestone) {
      this.emit(SwarmEconomyEvents.MILESTONE_CHEST_UNLOCKED, {
        wave: w,
        tier: payout.tier,
        isHardcore,
        milestoneCredits: payout.milestoneCredits,
        milestoneBits: payout.milestoneBits,
        milestoneSparks: payout.milestoneSparks,
        milestoneXP: payout.milestoneXP
      });
    }

    return {
      success: true,
      wave: w,
      streak: this.streak,
      isHardcore,
      payout,
      newRecord
    };
  }
}

export const swarmEconomyBridge = new SwarmEconomyBridge();
