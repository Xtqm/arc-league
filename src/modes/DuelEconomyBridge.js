/**
 * DuelEconomyBridge.js
 * Duel Arena Match Payouts & Tactical Maneuver Economy Bridge for Tron Disc Arena (SPEC-ACHIEVE-001).
 *
 * Deliverables:
 * - 50 Bits + XP for 1v1/2v2 AI duel victories.
 * - 100 Bits + XP for multiplayer duel victories.
 * - Bounded participation XP on defeat (0 Bits) to prevent anti-farming while respecting player time.
 * - Kinetic floating neon +Bits HUD indicators for high-skill maneuvers:
 *   * Confirmed disc parries (+10 Bits)
 *   * Multi-ricochet hits with 2+ bounces (+15+ Bits)
 *   * Curve eliminations (+25 Bits)
 */

import { economyManager as defaultEconomyManager } from '../core/economy/EconomyManager.js';
import { storageManager as defaultStorageManager } from '../core/storage/StorageManager.js';
import { showTacticalXP } from '../ui/hud.js';

export const DUEL_PAYOUT_CONFIG = Object.freeze({
  AI_VICTORY_BITS: 0,
  AI_VICTORY_XP: 0,
  AI_ZERO_TIERS_CREDITS: 0,
  AI_ZERO_TIERS_XP: 25,
  AI_TIER_1_5_CREDITS: 25,
  AI_TIER_1_5_XP: 80,
  AI_TIER_6_PLUS_CREDITS: 35,
  AI_TIER_6_PLUS_XP: 100,
  MULTIPLAYER_VICTORY_CREDITS: 120,
  MULTIPLAYER_VICTORY_BITS: 120,
  MULTIPLAYER_VICTORY_XP: 300,
  MULTIPLAYER_DEFEAT_CREDITS: 15,
  MULTIPLAYER_DEFEAT_BITS: 15,
  MULTIPLAYER_DEFEAT_XP: 80,
  AI_DEFEAT_XP: 25,
  PARRY_CREDITS: 0,
  PARRY_BITS: 0,
  PARRY_XP: 40,
  RICOCHET_BASE_CREDITS: 0,
  RICOCHET_BASE_BITS: 0,
  RICOCHET_BASE_XP: 30,
  RICOCHET_EXTRA_XP_PER_BOUNCE: 10,
  RICOCHET_XP: 30,
  CURVE_KILL_CREDITS: 0,
  CURVE_KILL_BITS: 0,
  CURVE_KILL_XP: 25
});

export const DuelEconomyEvents = Object.freeze({
  MATCH_PAYOUT: 'DUEL_MATCH_PAYOUT',
  MANEUVER_REWARD: 'DUEL_MANEUVER_REWARD'
});

export class DuelEconomyBridge {
  /**
   * @param {object} [options]
   * @param {import('../core/economy/EconomyManager.js').EconomyManager} [options.economy]
   * @param {import('../core/storage/StorageManager.js').StorageManager} [options.storage]
   * @param {Function} [options.floatingIndicatorFn]
   */
  constructor(options = {}) {
    this.economy = options.economy || defaultEconomyManager;
    this.storage = options.storage || defaultStorageManager;
    this.floatingIndicatorFn = typeof options.floatingIndicatorFn === 'function'
      ? options.floatingIndicatorFn
      : (...args) => showTacticalXP(...args);
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
          console.error(`[DuelEconomyBridge] Error in event listener for ${event}:`, err);
        }
      }
    }
  }

  // ==========================================
  // In-Combat Skill Maneuver Rewards
  // ==========================================

  /**
   * Awards XP (and 0 Arc Credits) for a confirmed incoming disc parry.
   * Emits a top-left tactical XP HUD event.
   * @param {object} [details]
   * @returns {object} Reward payload
   */
  rewardParry(details = {}) {
    const bits = 0;
    const credits = 0;
    const xp = DUEL_PAYOUT_CONFIG.PARRY_XP;

    if (this.economy && typeof this.economy.awardXP === 'function') {
      this.economy.awardXP(xp, 'maneuver_parry');
    }

    if (this.storage && typeof this.storage.get === 'function') {
      try {
        const curParries = Number(this.storage.get('stats.parriesExecuted', 0));
        this.storage.set('stats.parriesExecuted', curParries + 1);
      } catch (_) {}
    }

    if (typeof this.floatingIndicatorFn === 'function') {
      try {
        this.floatingIndicatorFn(xp, 'PARRY', {
          color: '#ffffff',
          glow: '#00f3ff',
          isXP: true,
          ...details
        });
      } catch (_) {}
    }

    const payload = { maneuver: 'parry', credits, bits, xp, label: 'PARRY', details };
    this.emit(DuelEconomyEvents.MANEUVER_REWARD, payload);
    return payload;
  }

  /**
   * Awards XP (and 0 Arc Credits) for a disc strike executing 2 or more ricochet bounces.
   * Emits a top-left tactical XP HUD event.
   * @param {number} bounces
   * @param {object} [details]
   * @returns {object|null} Reward payload or null if bounces < 2
   */
  rewardRicochetHit(bounces, details = {}) {
    const b = Math.max(0, Math.floor(Number(bounces) || 0));
    if (b < 2) return null;

    const extraBounces = b - 2;
    const bits = 0;
    const credits = 0;
    const xp = DUEL_PAYOUT_CONFIG.RICOCHET_BASE_XP + (extraBounces * DUEL_PAYOUT_CONFIG.RICOCHET_EXTRA_XP_PER_BOUNCE);

    if (this.economy && typeof this.economy.awardXP === 'function') {
      this.economy.awardXP(xp, `maneuver_ricochet_${b}`);
    }

    const label = b === 2 ? 'DOUBLE BANK' : `${b}x BANK SHOT`;
    if (typeof this.floatingIndicatorFn === 'function') {
      try {
        this.floatingIndicatorFn(xp, label, {
          color: '#ffaa00',
          glow: '#ff5500',
          isXP: true,
          ...details
        });
      } catch (_) {}
    }

    const payload = { maneuver: 'ricochet_hit', bounces: b, credits, bits, xp, label, details };
    this.emit(DuelEconomyEvents.MANEUVER_REWARD, payload);
    return payload;
  }

  /**
   * Awards XP (and 0 Arc Credits) for eliminating a foe using a curved disc throw.
   * Emits a top-left tactical XP HUD event.
   * @param {number} [curveIntensity=0]
   * @param {object} [details]
   * @returns {object} Reward payload
   */
  rewardCurveElimination(curveIntensity = 0, details = {}) {
    const bits = 0;
    const credits = 0;
    const xp = DUEL_PAYOUT_CONFIG.CURVE_KILL_XP;

    if (this.economy && typeof this.economy.awardXP === 'function') {
      this.economy.awardXP(xp, 'maneuver_curve_kill');
    }

    if (this.storage && typeof this.storage.get === 'function') {
      try {
        const curCurves = Number(this.storage.get('stats.curveEliminations', 0));
        this.storage.set('stats.curveEliminations', curCurves + 1);
      } catch (_) {}
    }

    if (typeof this.floatingIndicatorFn === 'function') {
      try {
        this.floatingIndicatorFn(xp, 'CURVE FRACTURE', {
          color: '#bd00ff',
          glow: '#7700ff',
          isXP: true,
          ...details
        });
      } catch (_) {}
    }

    const payload = { maneuver: 'curve_elimination', curveIntensity, credits, bits, xp, label: 'CURVE FRACTURE', details };
    this.emit(DuelEconomyEvents.MANEUVER_REWARD, payload);
    return payload;
  }

  // ==========================================
  // Match Termination & Session-End Payouts
  // ==========================================

  /**
   * Settles an AI Practice (duel_ai) run based on tiers cleared during the session.
   * - 0 tiers cleared: 0 AC + 25 XP
   * - Tiers 1-5 beaten: 25 AC + 80 XP per tier
   * - Tier 6+ beaten: 35 AC + 100 XP per tier
   * @param {number} tiersCleared
   * @param {object} [context={}]
   * @returns {object} Payout summary
   */
  settleAIPracticeSession(tiersCleared, context = {}) {
    const cleared = Math.max(0, Math.floor(Number(tiersCleared) || 0));
    const startTier = context.startTier != null
      ? Math.max(1, Math.floor(Number(context.startTier) || 1))
      : (context.currentTier != null
        ? Math.max(1, Math.floor(Number(context.currentTier) || 1) - cleared)
        : 1);

    let credits = 0;
    let xp = 0;

    if (cleared === 0) {
      credits = DUEL_PAYOUT_CONFIG.AI_ZERO_TIERS_CREDITS;
      xp = DUEL_PAYOUT_CONFIG.AI_ZERO_TIERS_XP;
    } else {
      for (let t = startTier; t < startTier + cleared; t++) {
        if (t <= 5) {
          credits += DUEL_PAYOUT_CONFIG.AI_TIER_1_5_CREDITS;
          xp += DUEL_PAYOUT_CONFIG.AI_TIER_1_5_XP;
        } else {
          credits += DUEL_PAYOUT_CONFIG.AI_TIER_6_PLUS_CREDITS;
          xp += DUEL_PAYOUT_CONFIG.AI_TIER_6_PLUS_XP;
        }
      }
    }

    const source = 'duel_ai_session';
    if (credits > 0 && this.economy) {
      if (typeof this.economy.awardCredits === 'function') {
        this.economy.awardCredits(credits, source);
      } else if (typeof this.economy.awardBits === 'function') {
        this.economy.awardBits(credits, source);
      }
    }
    if (xp > 0 && this.economy && typeof this.economy.awardXP === 'function') {
      this.economy.awardXP(xp, source);
    }

    const payload = {
      outcome: context.outcome || 'session_end',
      mode: 'ai',
      sessionTiersCleared: cleared,
      startTier,
      credits,
      bits: credits,
      xp,
      isVictory: cleared > 0,
      context
    };

    this.emit(DuelEconomyEvents.MATCH_PAYOUT, payload);
    return payload;
  }

  /**
   * Atomically settles an AI Practice session from live state once per run.
   * Resets sessionTiersCleared to 0 and sets aiPracticeSettled = true immediately.
   * @param {object} targetState
   * @param {'defeat'|'exit'} [outcome='defeat']
   * @returns {object|null}
   */
  settleAIPracticeFromState(targetState, outcome = 'defeat') {
    if (!targetState) return null;
    const isDuelAi = targetState.gameMode === 'duel' || targetState.gameMode === 'duel_ai';
    if (!isDuelAi || targetState.aiPracticeSettled) {
      return null;
    }
    if (targetState.matchmakingQueueState && targetState.matchmakingQueueState !== 'idle') {
      targetState.sessionTiersCleared = 0;
      targetState.aiPracticeSettled = true;
      return null;
    }

    const cleared = Math.max(0, Math.floor(Number(targetState.sessionTiersCleared) || 0));
    const currentTier = Math.max(1, Math.floor(Number(targetState.duelTier || targetState.tier || 1)));
    targetState.aiPracticeSettled = true;
    targetState.sessionTiersCleared = 0;

    return this.settleAIPracticeSession(cleared, {
      currentTier,
      outcome
    });
  }

  /**
   * Processes final match economy payouts based on victory/defeat and match mode.
   * Ranked PvP ('multiplayer') awards 120 AC + 300 XP on victory and 15 AC + 80 XP on defeat.
   * AI Practice ('ai') suppresses mid-run victory payouts and settles via sessionTiersCleared.
   * @param {'victory'|'defeat'} outcome
   * @param {'ai'|'multiplayer'} [mode='ai']
   * @param {object} [context={}]
   * @returns {object} Payout summary
   */
  processMatchOutcome(outcome, mode = 'ai', context = {}) {
    const isVictory = outcome === 'victory';
    const isMultiplayer = mode === 'multiplayer';

    if (!isMultiplayer) {
      if (isVictory) {
        return {
          outcome,
          mode,
          credits: 0,
          bits: 0,
          xp: 0,
          isVictory: true,
          deferred: true,
          context
        };
      }
      return this.settleAIPracticeSession(context.sessionTiersCleared ?? 0, {
        ...context,
        outcome
      });
    }

    const credits = isVictory
      ? DUEL_PAYOUT_CONFIG.MULTIPLAYER_VICTORY_CREDITS
      : DUEL_PAYOUT_CONFIG.MULTIPLAYER_DEFEAT_CREDITS;
    const xp = isVictory
      ? DUEL_PAYOUT_CONFIG.MULTIPLAYER_VICTORY_XP
      : DUEL_PAYOUT_CONFIG.MULTIPLAYER_DEFEAT_XP;

    const source = `duel_${mode}_${outcome}`;
    if (credits > 0 && this.economy) {
      if (typeof this.economy.awardCredits === 'function') {
        this.economy.awardCredits(credits, source);
      } else if (typeof this.economy.awardBits === 'function') {
        this.economy.awardBits(credits, source);
      }
    }
    if (xp > 0 && this.economy && typeof this.economy.awardXP === 'function') {
      this.economy.awardXP(xp, source);
    }

    const payload = {
      outcome,
      mode,
      credits,
      bits: credits,
      xp,
      isVictory,
      context
    };

    this.emit(DuelEconomyEvents.MATCH_PAYOUT, payload);
    return payload;
  }
}

export const duelEconomyBridge = new DuelEconomyBridge();
