/**
 * ApexTrialManager.js
 * Authoritative Apex Trials Event Engine for Tron Disc Arena.
 * Handles sporadic 3-7 day active/intermission window resolution,
 * 1 Free Entry Ticket vs. 2-Spark re-entry via EconomyManager.spendSparks,
 * Apex Rating (AR) calculation, hybrid online/offline leaderboard classification,
 * and idempotent end-of-cycle Spark/Credit/XP/Title payout claiming.
 */

import {
  FREE_TICKETS_PER_CYCLE,
  REENTRY_SPARK_COST,
  TRIAL_WINDOW_STATES,
  AR_SCORING_WEIGHTS,
  APEX_BRACKET_TIERS,
  APEX_TRIAL_TEMPLATES,
  getTrialTemplate,
  resolveTrialScheduleWindow
} from './ApexTrialRegistry.js';
import { storageManager as defaultStorageManager } from '../core/storage/StorageManager.js';
import { deepClone, normalizeApexTrialsState } from '../core/storage/schema.js';
import { economyManager as defaultEconomyManager } from '../core/economy/EconomyManager.js';

export const ApexTrialEvents = Object.freeze({
  TRIAL_ENTERED: 'APEX_TRIAL_ENTERED',
  RUN_RECORDED: 'APEX_TRIAL_RUN_RECORDED',
  REWARDS_CLAIMED: 'APEX_TRIAL_REWARDS_CLAIMED'
});

const DEFAULT_BENCHMARKS = Object.freeze({
  top1: 3800,
  top10: 2500,
  top25: 1600,
  participant: 1
});

export class ApexTrialManager {
  /**
   * @param {object} [options]
   * @param {import('../core/storage/StorageManager.js').StorageManager} [options.storage]
   * @param {import('../core/economy/EconomyManager.js').EconomyManager} [options.economy]
   * @param {() => number} [options.nowFn]
   * @param {Array<object>|null} [options.customSchedule]
   * @param {object|null} [options.supabaseClient]
   */
  constructor(options = {}) {
    this.storage = options.storage || defaultStorageManager;
    this.economy = options.economy || defaultEconomyManager;
    this.nowFn = typeof options.nowFn === 'function' ? options.nowFn : () => Date.now();
    this.customSchedule = Array.isArray(options.customSchedule) ? options.customSchedule : null;
    this.supabaseClient = options.supabaseClient || null;

    this._listeners = new Map();
    this._cycleCache = new Map();
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
    if (!this._listeners.has(event)) return;
    for (const handler of this._listeners.get(event)) {
      try {
        handler(payload);
      } catch (err) {
        console.error(`[ApexTrialManager] Listener error for ${event}:`, err);
      }
    }
  }

  // ==========================================
  // Storage Helpers
  // ==========================================

  _ensureStorageReady() {
    if (this.storage && !this.storage.isInitialized && typeof this.storage.load === 'function') {
      this.storage.load();
    }
  }

  _getApexTrialsState() {
    this._ensureStorageReady();
    const raw = this.storage.get('apexTrials');
    return normalizeApexTrialsState(raw);
  }

  /**
   * Returns a player's persisted record for a specific cycle ID.
   * @param {string} cycleId
   * @returns {{ freeTicketUsed: boolean, attempts: number, bestAR: number, claimed: boolean }}
   */
  getCycleRecord(cycleId) {
    if (!cycleId) {
      return { freeTicketUsed: false, attempts: 0, bestAR: 0, claimed: false };
    }
    const state = this._getApexTrialsState();
    const existing = state.cycles[cycleId];
    if (!existing) {
      return { freeTicketUsed: false, attempts: 0, bestAR: 0, claimed: false };
    }
    return { ...existing };
  }

  _saveCycleRecord(cycleId, record, immediate = true) {
    this._ensureStorageReady();
    const state = this._getApexTrialsState();
    state.cycles[cycleId] = {
      freeTicketUsed: Boolean(record.freeTicketUsed),
      attempts: Math.max(0, Math.floor(Number(record.attempts) || 0)),
      bestAR: Math.max(0, Number(record.bestAR) || 0),
      claimed: Boolean(record.claimed)
    };
    this.storage.set('apexTrials', state, { immediate });
    return { ...state.cycles[cycleId] };
  }

  // ==========================================
  // Schedule & Window Resolution
  // ==========================================

  /**
   * Resolves the current sporadic Apex Trial window (active vs. intermission).
   * @param {number} [nowMs]
   */
  getScheduleStatus(nowMs = this.nowFn()) {
    const win = resolveTrialScheduleWindow(nowMs, this.customSchedule);
    if (win.activeCycle) this._cycleCache.set(win.activeCycle.cycleId, win.activeCycle);
    if (win.previousCycle) this._cycleCache.set(win.previousCycle.cycleId, win.previousCycle);
    if (win.nextCycle) this._cycleCache.set(win.nextCycle.cycleId, win.nextCycle);
    return win;
  }

  isTrialActive(nowMs = this.nowFn()) {
    const win = this.getScheduleStatus(nowMs);
    return win.state === TRIAL_WINDOW_STATES.ACTIVE && Boolean(win.activeCycle);
  }

  getActiveTrial(nowMs = this.nowFn()) {
    const win = this.getScheduleStatus(nowMs);
    return win.activeCycle;
  }

  getTimeRemainingMs(nowMs = this.nowFn()) {
    const win = this.getScheduleStatus(nowMs);
    if (win.activeCycle) {
      return Math.max(0, win.activeCycle.endsAt - win.nowMs);
    }
    if (win.nextCycle) {
      return Math.max(0, win.nextCycle.startsAt - win.nowMs);
    }
    return 0;
  }

  _resolveCycleMetadata(cycleId) {
    if (!cycleId) return null;
    if (this._cycleCache.has(cycleId)) {
      return this._cycleCache.get(cycleId);
    }
    const win = this.getScheduleStatus();
    if (win.activeCycle?.cycleId === cycleId) return win.activeCycle;
    if (win.previousCycle?.cycleId === cycleId) return win.previousCycle;
    if (win.nextCycle?.cycleId === cycleId) return win.nextCycle;

    // Fallback: match template suffix embedded in cycleId (e.g. apex_cycle_001_trial_zero_g_nexus)
    for (const tpl of APEX_TRIAL_TEMPLATES) {
      if (cycleId.includes(tpl.id)) {
        return {
          cycleId,
          templateId: tpl.id,
          title: tpl.title,
          exclusiveTitle: tpl.exclusiveTitle,
          mutators: tpl.mutators,
          benchmarkThresholds: tpl.benchmarkThresholds,
          endsAt: 0
        };
      }
    }
    const fallbackTpl = getTrialTemplate(APEX_TRIAL_TEMPLATES[0].id);
    return {
      cycleId,
      templateId: fallbackTpl.id,
      title: fallbackTpl.title,
      exclusiveTitle: fallbackTpl.exclusiveTitle,
      mutators: fallbackTpl.mutators,
      benchmarkThresholds: fallbackTpl.benchmarkThresholds,
      endsAt: 0
    };
  }

  // ==========================================
  // Entry Economy (1 Free Ticket -> 2 Sparks)
  // ==========================================

  /**
   * Checks whether the player can enter the active Apex Trial.
   * @param {string|null} [cycleId]
   * @param {number} [nowMs]
   */
  canEnterTrial(cycleId = null, nowMs = this.nowFn()) {
    const win = this.getScheduleStatus(nowMs);
    const active = win.activeCycle;

    if (!active || (cycleId && active.cycleId !== cycleId)) {
      return {
        allowed: false,
        reason: 'NO_ACTIVE_TRIAL',
        usesFreeTicket: false,
        costSparks: 0,
        cycle: active || null
      };
    }

    const record = this.getCycleRecord(active.cycleId);
    const hasFreeTicket = !record.freeTicketUsed && FREE_TICKETS_PER_CYCLE > 0;

    if (hasFreeTicket) {
      return {
        allowed: true,
        reason: null,
        usesFreeTicket: true,
        costSparks: 0,
        cycle: active,
        record
      };
    }

    const canAfford = this.economy.canAffordSparks(REENTRY_SPARK_COST);
    if (!canAfford) {
      return {
        allowed: false,
        reason: 'INSUFFICIENT_SPARKS',
        usesFreeTicket: false,
        costSparks: REENTRY_SPARK_COST,
        currentSparks: this.economy.getSparks(),
        cycle: active,
        record
      };
    }

    return {
      allowed: true,
      reason: null,
      usesFreeTicket: false,
      costSparks: REENTRY_SPARK_COST,
      cycle: active,
      record
    };
  }

  /**
   * Consumes the 1 Free Entry Ticket or deducts 2 Sparks atomically for re-entry.
   * @param {string|null} [cycleId]
   * @param {number} [nowMs]
   */
  enterTrial(cycleId = null, nowMs = this.nowFn()) {
    const check = this.canEnterTrial(cycleId, nowMs);
    if (!check.allowed) {
      return {
        success: false,
        ...check
      };
    }

    const { cycle, usesFreeTicket, costSparks, record } = check;

    if (!usesFreeTicket) {
      const spent = this.economy.spendSparks(
        costSparks,
        'apex_trial_reentry',
        cycle.cycleId
      );
      if (!spent) {
        return {
          success: false,
          reason: 'INSUFFICIENT_SPARKS',
          error: 'Failed to deduct Sparks',
          usesFreeTicket: false,
          costSparks,
          cycle
        };
      }
    }

    const updatedRecord = this._saveCycleRecord(cycle.cycleId, {
      ...record,
      freeTicketUsed: true,
      attempts: (record.attempts || 0) + 1
    });

    const payload = {
      success: true,
      cycle,
      usesFreeTicket,
      sparksSpent: usesFreeTicket ? 0 : costSparks,
      record: updatedRecord
    };

    this.emit(ApexTrialEvents.TRIAL_ENTERED, payload);
    return payload;
  }

  // ==========================================
  // Apex Rating (AR) Scoring & Leaderboards
  // ==========================================

  /**
   * Computes an Apex Trial run's Apex Rating (AR) from combat metrics.
   * @param {object} [metrics]
   * @returns {{ ar: number, breakdown: object }}
   */
  calculateApexRating(metrics = {}) {
    const wavesCleared = Math.max(0, Math.floor(Number(metrics.wavesCleared ?? metrics.waves ?? 0) || 0));
    const survivalSeconds = Math.max(0, Number(metrics.survivalSeconds ?? metrics.durationSec ?? 0) || 0);
    const fractures = Math.max(0, Math.floor(Number(metrics.fractures ?? metrics.kills ?? 0) || 0));
    const parries = Math.max(0, Math.floor(Number(metrics.parries ?? 0) || 0));
    const ricochetFractures = Math.max(0, Math.floor(Number(metrics.ricochetFractures ?? 0) || 0));

    let efficiencyRatio = 0.5;
    if (Number.isFinite(Number(metrics.hpRemainingRatio))) {
      efficiencyRatio = Math.min(1, Math.max(0, Number(metrics.hpRemainingRatio)));
    } else {
      const dealt = Math.max(0, Number(metrics.damageDealt ?? 0) || 0);
      const taken = Math.max(0, Number(metrics.damageTaken ?? 0) || 0);
      if (dealt + taken > 0) {
        efficiencyRatio = Math.min(1, Math.max(0, dealt / (dealt + taken)));
      }
    }

    const victory = Boolean(metrics.victory);

    const breakdown = {
      waveScore: wavesCleared * AR_SCORING_WEIGHTS.waveCleared,
      survivalScore: Math.floor(survivalSeconds) * AR_SCORING_WEIGHTS.survivalSecond,
      fractureScore: fractures * AR_SCORING_WEIGHTS.fracture,
      parryScore: parries * AR_SCORING_WEIGHTS.parry,
      ricochetScore: ricochetFractures * AR_SCORING_WEIGHTS.ricochetFracture,
      efficiencyScore: Math.round(efficiencyRatio * AR_SCORING_WEIGHTS.damageEfficiencyMax),
      victoryScore: victory ? AR_SCORING_WEIGHTS.victoryBonus : 0
    };

    const ar = Math.max(
      0,
      Math.round(
        breakdown.waveScore +
        breakdown.survivalScore +
        breakdown.fractureScore +
        breakdown.parryScore +
        breakdown.ricochetScore +
        breakdown.efficiencyScore +
        breakdown.victoryScore
      )
    );

    return { ar, breakdown };
  }

  /**
   * Classifies an AR score into Apex Prime (Top 1%), Master (Top 10%),
   * Contender (Top 25%), or Participant (AR > 0).
   * Uses online standings when provided, otherwise deterministic benchmark curves.
   *
   * @param {number} ar
   * @param {string|object|null} [cycleOrId]
   * @param {Array<{ ar?: number, bestAR?: number }>|null} [onlineStandings]
   * @returns {{ tier: object|null, percentile: number, source: 'online'|'benchmark' }}
   */
  classifyBracket(ar, cycleOrId = null, onlineStandings = null) {
    const score = Number(ar) || 0;
    if (score <= 0) {
      return { tier: null, percentile: 100, source: 'benchmark' };
    }

    if (Array.isArray(onlineStandings) && onlineStandings.length > 0) {
      const scores = onlineStandings
        .map((e) => Number(e.bestAR ?? e.ar ?? 0))
        .filter((v) => Number.isFinite(v) && v > 0)
        .sort((a, b) => b - a);

      if (scores.length > 0) {
        const higherCount = scores.filter((v) => v > score).length;
        const rank = higherCount + 1;
        const percentile = Math.min(100, Math.max(0.1, (rank / scores.length) * 100));

        if (percentile <= APEX_BRACKET_TIERS.APEX_PRIME.maxPercentile) {
          return { tier: APEX_BRACKET_TIERS.APEX_PRIME, percentile, source: 'online' };
        }
        if (percentile <= APEX_BRACKET_TIERS.MASTER.maxPercentile) {
          return { tier: APEX_BRACKET_TIERS.MASTER, percentile, source: 'online' };
        }
        if (percentile <= APEX_BRACKET_TIERS.CONTENDER.maxPercentile) {
          return { tier: APEX_BRACKET_TIERS.CONTENDER, percentile, source: 'online' };
        }
        return { tier: APEX_BRACKET_TIERS.PARTICIPANT, percentile, source: 'online' };
      }
    }

    const cycleMeta = typeof cycleOrId === 'string'
      ? this._resolveCycleMetadata(cycleOrId)
      : cycleOrId;
    const thresholds = cycleMeta?.benchmarkThresholds || DEFAULT_BENCHMARKS;

    if (score >= thresholds.top1) {
      return { tier: APEX_BRACKET_TIERS.APEX_PRIME, percentile: 1, source: 'benchmark' };
    }
    if (score >= thresholds.top10) {
      return { tier: APEX_BRACKET_TIERS.MASTER, percentile: 10, source: 'benchmark' };
    }
    if (score >= thresholds.top25) {
      return { tier: APEX_BRACKET_TIERS.CONTENDER, percentile: 25, source: 'benchmark' };
    }
    return { tier: APEX_BRACKET_TIERS.PARTICIPANT, percentile: 50, source: 'benchmark' };
  }

  /**
   * Records a completed Apex Trial run, updates personal best AR, and returns classification.
   * @param {string} cycleId
   * @param {object} metrics
   * @param {object} [options]
   */
  async recordRunResult(cycleId, metrics = {}, options = {}) {
    if (!cycleId) {
      throw new Error('recordRunResult requires a valid cycleId');
    }

    const { ar, breakdown } = this.calculateApexRating(metrics);
    const prevRecord = this.getCycleRecord(cycleId);
    const isNewBest = ar > prevRecord.bestAR;
    const bestAR = Math.max(prevRecord.bestAR, ar);

    const updatedRecord = this._saveCycleRecord(cycleId, {
      ...prevRecord,
      bestAR
    }, true);

    if (this.supabaseClient && typeof this.supabaseClient.from === 'function' && options.playerId) {
      try {
        await this.supabaseClient
          .from('apex_trial_scores')
          .upsert({
            cycle_id: cycleId,
            player_id: options.playerId,
            handle: options.handle || this.storage.get('player.handle', 'USER_PROGRAM'),
            best_ar: bestAR
          });
      } catch (err) {
        // Offline-first resilience: local bestAR is already persisted
        console.warn('[ApexTrialManager] Online leaderboard submit failed, using offline fallback:', err?.message || err);
      }
    }

    const classification = this.classifyBracket(bestAR, cycleId, options.onlineStandings || null);
    const result = {
      cycleId,
      ar,
      bestAR,
      isNewBest,
      breakdown,
      bracket: classification.tier,
      percentile: classification.percentile,
      classificationSource: classification.source,
      record: updatedRecord
    };

    this.emit(ApexTrialEvents.RUN_RECORDED, result);
    return result;
  }

  /**
   * Returns hybrid online/offline leaderboard standings for a cycle.
   * @param {string} cycleId
   * @returns {Promise<{ source: 'online'|'benchmark', entries: Array<object> }>}
   */
  async getLeaderboardStandings(cycleId) {
    const cycleMeta = this._resolveCycleMetadata(cycleId);
    const thresholds = cycleMeta?.benchmarkThresholds || DEFAULT_BENCHMARKS;
    const playerRecord = this.getCycleRecord(cycleId);
    const playerHandle = this.storage.get('player.handle', 'USER_PROGRAM');

    if (this.supabaseClient && typeof this.supabaseClient.from === 'function') {
      try {
        const { data, error } = await this.supabaseClient
          .from('apex_trial_scores')
          .select('player_id, handle, best_ar')
          .eq('cycle_id', cycleId)
          .order('best_ar', { ascending: false })
          .limit(50);

        if (!error && Array.isArray(data) && data.length > 0) {
          const entries = data.map((row, idx) => ({
            rank: idx + 1,
            handle: row.handle || 'PROGRAM',
            bestAR: Number(row.best_ar) || 0,
            isPlayer: row.handle === playerHandle
          }));
          return { source: 'online', entries };
        }
      } catch (_) {
        // Fall through to deterministic offline benchmark standings
      }
    }

    const benchmarkRows = [
      { handle: 'APEX_PRIME_BENCHMARK', bestAR: thresholds.top1, tierLabel: 'Top 1%', isBenchmark: true },
      { handle: 'MASTER_BENCHMARK', bestAR: thresholds.top10, tierLabel: 'Top 10%', isBenchmark: true },
      { handle: 'CONTENDER_BENCHMARK', bestAR: thresholds.top25, tierLabel: 'Top 25%', isBenchmark: true }
    ];

    if (playerRecord.bestAR > 0) {
      benchmarkRows.push({
        handle: playerHandle,
        bestAR: playerRecord.bestAR,
        tierLabel: this.classifyBracket(playerRecord.bestAR, cycleMeta).tier?.percentileLabel || 'Participant',
        isPlayer: true,
        isBenchmark: false
      });
    }

    benchmarkRows.sort((a, b) => b.bestAR - a.bestAR);
    const entries = benchmarkRows.map((row, idx) => ({
      rank: idx + 1,
      ...row
    }));

    return { source: 'benchmark', entries };
  }

  // ==========================================
  // Idempotent End-of-Cycle Payout Claiming
  // ==========================================

  /**
   * Lists concluded cycles with unclaimed participation rewards.
   * @param {number} [nowMs]
   * @returns {Array<object>}
   */
  getClaimableCycles(nowMs = this.nowFn()) {
    const win = this.getScheduleStatus(nowMs);
    const activeId = win.activeCycle?.cycleId || null;
    const state = this._getApexTrialsState();
    const claimable = [];

    for (const [cycleId, record] of Object.entries(state.cycles)) {
      if (!record || record.claimed || (record.bestAR || 0) <= 0) continue;
      if (activeId && cycleId === activeId) continue;

      const meta = this._resolveCycleMetadata(cycleId);
      if (meta && meta.endsAt && nowMs < meta.endsAt) continue;

      const classification = this.classifyBracket(record.bestAR, meta);
      if (classification.tier) {
        claimable.push({
          cycleId,
          meta,
          record: { ...record },
          tier: classification.tier
        });
      }
    }

    return claimable;
  }

  /**
   * Claims end-of-cycle rewards once per cycleId (idempotent).
   * Awards Sparks, Arc Credits, XP, and exclusive Title for Top 1% Apex Prime.
   *
   * @param {string} cycleId
   * @param {object} [options]
   * @param {boolean} [options.force] - Allows claiming in unit tests without waiting for cycle end
   * @param {Array<object>|null} [options.onlineStandings]
   */
  claimCycleRewards(cycleId, options = {}) {
    if (!cycleId) {
      return { success: false, reason: 'INVALID_CYCLE_ID' };
    }

    const record = this.getCycleRecord(cycleId);
    if (record.claimed) {
      return { success: false, reason: 'ALREADY_CLAIMED', cycleId };
    }

    if ((record.bestAR || 0) <= 0) {
      return { success: false, reason: 'NO_PARTICIPATION', cycleId };
    }

    const nowMs = options.nowMs ?? this.nowFn();
    const win = this.getScheduleStatus(nowMs);
    if (!options.force && win.activeCycle && win.activeCycle.cycleId === cycleId) {
      return { success: false, reason: 'CYCLE_STILL_ACTIVE', cycleId };
    }

    const cycleMeta = this._resolveCycleMetadata(cycleId);
    const classification = this.classifyBracket(record.bestAR, cycleMeta, options.onlineStandings || null);
    const tier = classification.tier;
    if (!tier) {
      return { success: false, reason: 'NO_BRACKET_TIER', cycleId };
    }

    // Mark claimed first to guarantee idempotency
    const updatedRecord = this._saveCycleRecord(cycleId, {
      ...record,
      claimed: true
    }, true);

    if (tier.sparks > 0) {
      this.economy.awardSparks(tier.sparks, 'apex_trial_payout');
    }
    if (tier.credits > 0) {
      this.economy.awardCredits(tier.credits, 'apex_trial_payout');
    }
    if (tier.xp > 0) {
      this.economy.awardXP(tier.xp, 'apex_trial_payout');
    }

    let titleUnlocked = null;
    if (tier.grantsTitle && cycleMeta?.exclusiveTitle) {
      const existingTitles = this.storage.get('player.titles', []);
      const nextTitles = Array.from(new Set([
        ...(Array.isArray(existingTitles) ? existingTitles : []),
        cycleMeta.exclusiveTitle
      ]));
      this.storage.set('player.titles', nextTitles, { immediate: true });
      titleUnlocked = cycleMeta.exclusiveTitle;
    }

    const result = {
      success: true,
      cycleId,
      tier,
      rewards: {
        sparks: tier.sparks,
        credits: tier.credits,
        xp: tier.xp,
        emblem: tier.emblem || null,
        titleUnlocked
      },
      record: updatedRecord
    };

    this.emit(ApexTrialEvents.REWARDS_CLAIMED, result);
    return result;
  }
}

export const apexTrialManager = new ApexTrialManager();
export default apexTrialManager;
