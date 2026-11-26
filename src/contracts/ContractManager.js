/**
 * ContractManager.js
 * Authoritative Daily & Career Contracts Engine for Tron Disc Arena.
 * Handles UTC 24-hour Daily rotation, 500 AC 3/3 Sweep bonus, Career unlock gate
 * (Lv 5 + Swarm Wave 5), per-tier/focus shuffle-bag drawing, dual-gate promotions,
 * reactive telemetry listeners, and atomic payouts via EconomyManager.
 */

import {
  CONTRACT_FOCUSES,
  CAREER_SLOT_FOCUSES,
  CAREER_FOCUS_META,
  CONTRACT_METRICS,
  DAILY_SLOTS_COUNT,
  DAILY_CONTRACT_REWARD,
  DAILY_SWEEP_REWARD,
  CAREER_TIER_REWARDS,
  getDailyTemplates,
  getDailyTemplate,
  getCareerTierConfig,
  getPromotionGate,
  getCareerBucket,
  getCareerTemplate,
  evaluateCareerUnlock
} from './ContractRegistry.js';
import { storageManager as defaultStorageManager } from '../core/storage/StorageManager.js';
import { StorageEvents, deepClone, normalizeContractsState } from '../core/storage/schema.js';
import { economyManager as defaultEconomyManager, EconomyEvents } from '../core/economy/EconomyManager.js';
import { duelEconomyBridge as defaultDuelBridge, DuelEconomyEvents } from '../modes/DuelEconomyBridge.js';
import { swarmEconomyBridge as defaultSwarmBridge, SwarmEconomyEvents } from '../modes/SwarmEconomyBridge.js';
import { campaignManager as defaultCampaignManager, CampaignEvents } from '../campaign/CampaignManager.js';
import { playAchievementFanfare } from '../audio/sfx.js';

export const ContractStatus = Object.freeze({
  ACTIVE: 'active',
  CLAIMABLE: 'claimable',
  CLAIMED: 'claimed'
});

export const ContractEvents = Object.freeze({
  DAILY_ROTATED: 'CONTRACTS_DAILY_ROTATED',
  DAILY_SWEEP_CLAIMABLE: 'CONTRACTS_DAILY_SWEEP_CLAIMABLE',
  DAILY_SWEEP_CLAIMED: 'CONTRACTS_DAILY_SWEEP_CLAIMED',
  CAREER_UNLOCKED: 'CONTRACTS_CAREER_UNLOCKED',
  CAREER_TIER_PROMOTED: 'CONTRACTS_CAREER_TIER_PROMOTED',
  CONTRACT_PROGRESS: 'CONTRACTS_CONTRACT_PROGRESS',
  CONTRACT_CLAIMABLE: 'CONTRACTS_CONTRACT_CLAIMABLE',
  CONTRACT_CLAIMED: 'CONTRACTS_CONTRACT_CLAIMED',
  CONTRACTS_UPDATED: 'CONTRACTS_UPDATED'
});

export class ContractManager {
  /**
   * @param {object} [options]
   * @param {import('../core/storage/StorageManager.js').StorageManager} [options.storage]
   * @param {import('../core/economy/EconomyManager.js').EconomyManager} [options.economy]
   * @param {import('../modes/DuelEconomyBridge.js').DuelEconomyBridge} [options.duelBridge]
   * @param {import('../modes/SwarmEconomyBridge.js').SwarmEconomyBridge} [options.swarmBridge]
   * @param {import('../campaign/CampaignManager.js').CampaignManager} [options.campaignManager]
   * @param {Function} [options.playFanfareFn]
   * @param {() => number} [options.nowFn]
   * @param {() => number} [options.rngFn]
   */
  constructor(options = {}) {
    this.storage = options.storage || defaultStorageManager;
    this.economy = options.economy || defaultEconomyManager;
    this.duelBridge = options.duelBridge !== undefined ? options.duelBridge : defaultDuelBridge;
    this.swarmBridge = options.swarmBridge !== undefined ? options.swarmBridge : defaultSwarmBridge;
    this.campaignManager = options.campaignManager !== undefined ? options.campaignManager : defaultCampaignManager;
    this.playFanfareFn = options.playFanfareFn || playAchievementFanfare;
    this.nowFn = typeof options.nowFn === 'function' ? options.nowFn : () => Date.now();
    this.rngFn = typeof options.rngFn === 'function' ? options.rngFn : () => Math.random();

    this.isInitialized = false;
    this._listeners = new Map();
    this._unsubs = [];
    this._isInternalWrite = false;
  }

  // ==========================================
  // Lifecycle & Event Subscriptions
  // ==========================================

  /**
   * Initializes ContractManager, reconciles daily/career state, and subscribes
   * to storage, economy, combat bridges, and campaign telemetry.
   */
  init() {
    if (this.isInitialized) return;

    if (this.storage && !this.storage.isInitialized && typeof this.storage.load === 'function') {
      this.storage.load();
    }

    this._subscribeSources();
    this.reconcile({ silent: true });
    this.isInitialized = true;
  }

  teardown() {
    for (const unsub of this._unsubs) {
      try {
        if (typeof unsub === 'function') unsub();
      } catch (_) {}
    }
    this._unsubs = [];
    this._listeners.clear();
    this.isInitialized = false;
  }

  _subscribeSources() {
    if (this.storage && typeof this.storage.on === 'function') {
      this._unsubs.push(
        this.storage.on(StorageEvents.MUTATED, (evt) => this._onStorageMutated(evt)),
        this.storage.on(StorageEvents.INITIALIZED, () => this.reconcile({ silent: true }))
      );
    }

    if (this.economy && typeof this.economy.on === 'function') {
      this._unsubs.push(
        this.economy.on(EconomyEvents.LEVEL_UP, () => {
          this.checkCareerUnlock();
          this.checkCareerPromotion();
        })
      );
    }

    if (this.duelBridge && typeof this.duelBridge.on === 'function') {
      this._unsubs.push(
        this.duelBridge.on(DuelEconomyEvents.MANEUVER_REWARD, (payload) => this._onDuelManeuver(payload)),
        this.duelBridge.on(DuelEconomyEvents.MATCH_PAYOUT, (payload) => this._onDuelMatchPayout(payload))
      );
    }

    if (this.swarmBridge && typeof this.swarmBridge.on === 'function') {
      this._unsubs.push(
        this.swarmBridge.on(SwarmEconomyEvents.WAVE_PAYOUT, (payload) => this._onSwarmWavePayout(payload)),
        this.swarmBridge.on(SwarmEconomyEvents.SURVIVAL_RECORD_UPDATED, () => this.checkCareerUnlock())
      );
    }

    if (this.campaignManager && typeof this.campaignManager.on === 'function') {
      this._unsubs.push(
        this.campaignManager.on(CampaignEvents.TRIAL_COMPLETED, (payload) => this._onCampaignTrialCompleted(payload))
      );
    }
  }

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
          console.error(`[ContractManager] Error in ${event} handler:`, err);
        }
      }
    }
  }

  // ==========================================
  // Storage & Clock Helpers
  // ==========================================

  _ensureStorageReady() {
    if (this.storage && !this.storage.isInitialized && typeof this.storage.load === 'function') {
      this.storage.load();
    }
  }

  _readContracts() {
    this._ensureStorageReady();
    return normalizeContractsState(this.storage.get('contracts', {}));
  }

  _writeContracts(contracts, options = { immediate: true }) {
    this._ensureStorageReady();
    this._isInternalWrite = true;
    try {
      this.storage.set('contracts', normalizeContractsState(contracts), options);
    } finally {
      this._isInternalWrite = false;
    }
  }

  /**
   * Returns current UTC day key (YYYY-MM-DD).
   * @param {number} [ms]
   * @returns {string}
   */
  getUtcDateKey(ms = this.nowFn()) {
    return new Date(ms).toISOString().slice(0, 10);
  }

  /**
   * Returns milliseconds remaining until next 00:00:00.000 UTC boundary.
   * @param {number} [ms]
   * @returns {number}
   */
  getMsUntilNextUtcReset(ms = this.nowFn()) {
    const d = new Date(ms);
    const nextMidnight = Date.UTC(
      d.getUTCFullYear(),
      d.getUTCMonth(),
      d.getUTCDate() + 1,
      0,
      0,
      0,
      0
    );
    return Math.max(0, nextMidnight - ms);
  }

  _pickRandomSubset(pool, count) {
    const copy = [...pool];
    for (let i = copy.length - 1; i > 0; i--) {
      const rand = Math.max(0, Math.min(0.9999999, Number(this.rngFn()) || 0));
      const j = Math.floor(rand * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy.slice(0, count);
  }

  _createDailySlot(template, slotIndex) {
    return {
      id: template.id,
      templateId: template.id,
      type: 'daily',
      slotIndex,
      metricKey: template.metricKey,
      progress: 0,
      target: template.target,
      status: ContractStatus.ACTIVE,
      claimed: false
    };
  }

  _createCareerSlot(template, slotIndex) {
    return {
      id: template.id,
      templateId: template.id,
      type: 'career',
      slotIndex,
      focus: template.focus,
      tier: template.tier,
      metricKey: template.metricKey,
      params: template.params ? { ...template.params } : null,
      progress: 0,
      target: template.target,
      status: ContractStatus.ACTIVE,
      claimed: false
    };
  }

  /**
   * Reconciles UTC daily rotation, career unlock prerequisites, and dual-gate promotions.
   * @param {object} [options]
   * @param {boolean} [options.silent=false]
   */
  reconcile(options = {}) {
    this.ensureDailyRotation(options);
    this.checkCareerUnlock(options);
    this.checkCareerPromotion(options);
  }

  // ==========================================
  // Daily Contracts Engine (UTC 24h + Sweep)
  // ==========================================

  /**
   * Checks whether the UTC day boundary has rolled and generates 3 fresh Daily Contracts.
   * @param {object} [options]
   * @param {boolean} [options.silent=false]
   * @returns {boolean} True if a new daily rotation occurred
   */
  ensureDailyRotation(options = {}) {
    const contracts = this._readContracts();
    const todayKey = this.getUtcDateKey();
    const daily = contracts.daily;

    const needsReset =
      daily.dateKey !== todayKey ||
      !Array.isArray(daily.slots) ||
      daily.slots.length < DAILY_SLOTS_COUNT;

    if (!needsReset) {
      return false;
    }

    const picked = this._pickRandomSubset(getDailyTemplates(), DAILY_SLOTS_COUNT);
    contracts.daily = {
      dateKey: todayKey,
      slots: picked.map((tpl, idx) => this._createDailySlot(tpl, idx)),
      sweepClaimed: false
    };

    this._writeContracts(contracts, { immediate: true });

    if (!options.silent) {
      this.emit(ContractEvents.DAILY_ROTATED, {
        dateKey: todayKey,
        slots: deepClone(contracts.daily.slots)
      });
      this.emit(ContractEvents.CONTRACTS_UPDATED, { reason: 'daily_rotated' });
    }

    return true;
  }

  _isSlotCompleted(slot) {
    if (!slot) return false;
    return Boolean(
      slot.claimed ||
      slot.status === ContractStatus.CLAIMED ||
      slot.status === ContractStatus.CLAIMABLE ||
      (Number(slot.target || 0) > 0 && Number(slot.progress || 0) >= Number(slot.target || 0))
    );
  }

  _isSlotClaimable(slot) {
    if (!slot || slot.claimed || slot.status === ContractStatus.CLAIMED) return false;
    if (slot.status === ContractStatus.CLAIMABLE) return true;
    const target = Number(slot.target || 0);
    return target > 0 && Number(slot.progress || 0) >= target;
  }

  /**
   * Returns true if all 3 Daily Contracts are completed for the active UTC day
   * and the 500 AC Daily Sweep bonus has not yet been claimed.
   * @returns {boolean}
   */
  isDailySweepClaimable() {
    this.ensureDailyRotation({ silent: true });
    const { daily } = this._readContracts();
    if (daily.sweepClaimed) return false;
    if (!Array.isArray(daily.slots) || daily.slots.length < DAILY_SLOTS_COUNT) return false;
    return daily.slots.every((slot) => this._isSlotCompleted(slot));
  }

  /**
   * Claims an individual completed Daily Contract (awards 250 XP, 0 AC, 0 Sparks).
   * @param {number|string} slotIndexOrId
   * @param {object} [options]
   * @param {boolean} [options.silentAudio=false]
   * @returns {{ success: boolean, reason?: string, slot?: object, reward?: object, sweepReady?: boolean }}
   */
  claimDailyContract(slotIndexOrId, options = {}) {
    this.ensureDailyRotation();
    const contracts = this._readContracts();
    const slots = contracts.daily.slots;

    const index = typeof slotIndexOrId === 'number'
      ? slotIndexOrId
      : slots.findIndex((s) => s && (s.id === slotIndexOrId || s.templateId === slotIndexOrId));

    if (index < 0 || index >= slots.length || !slots[index]) {
      return { success: false, reason: 'invalid_slot' };
    }

    const slot = slots[index];
    if (slot.claimed || slot.status === ContractStatus.CLAIMED) {
      return { success: false, reason: 'already_claimed' };
    }
    if (!this._isSlotClaimable(slot)) {
      return { success: false, reason: 'not_completed' };
    }

    const template = getDailyTemplate(slot.id || slot.templateId);
    const reward = template?.reward ? { ...template.reward } : { ...DAILY_CONTRACT_REWARD };

    // Mark claimed before dispatching payouts to guard against re-entrancy
    slot.claimed = true;
    slot.status = ContractStatus.CLAIMED;
    slot.progress = Math.max(Number(slot.progress || 0), Number(slot.target || 0));

    this._writeContracts(contracts, { immediate: true });

    this._distributeReward(reward, `contract_daily_${slot.id}`);

    if (!options.silentAudio) {
      this._playFanfare();
    }

    const sweepReady = !contracts.daily.sweepClaimed && slots.every((s) => this._isSlotCompleted(s));
    const claimedEnriched = this._enrichDailySlot(slot, index);

    this.emit(ContractEvents.CONTRACT_CLAIMED, {
      type: 'daily',
      slotIndex: index,
      slot: claimedEnriched,
      reward
    });

    if (sweepReady) {
      this.emit(ContractEvents.DAILY_SWEEP_CLAIMABLE, {
        dateKey: contracts.daily.dateKey,
        reward: { ...DAILY_SWEEP_REWARD }
      });
    }

    this.emit(ContractEvents.CONTRACTS_UPDATED, { reason: 'daily_claimed' });

    return {
      success: true,
      slot: claimedEnriched,
      reward,
      sweepReady
    };
  }

  /**
   * Claims the 500 AC Daily Sweep bonus once all 3 Daily Contracts are completed.
   * @param {object} [options]
   * @param {boolean} [options.silentAudio=false]
   * @returns {{ success: boolean, reason?: string, reward?: object }}
   */
  claimDailySweep(options = {}) {
    this.ensureDailyRotation();
    const contracts = this._readContracts();
    const { daily } = contracts;

    if (daily.sweepClaimed) {
      return { success: false, reason: 'already_claimed' };
    }
    if (!Array.isArray(daily.slots) || daily.slots.length < DAILY_SLOTS_COUNT || !daily.slots.every((s) => this._isSlotCompleted(s))) {
      return { success: false, reason: 'daily_incomplete' };
    }

    daily.sweepClaimed = true;
    this._writeContracts(contracts, { immediate: true });

    const reward = { ...DAILY_SWEEP_REWARD };
    this._distributeReward(reward, `contract_daily_sweep_${daily.dateKey}`);

    if (!options.silentAudio) {
      this._playFanfare();
    }

    this.emit(ContractEvents.DAILY_SWEEP_CLAIMED, {
      dateKey: daily.dateKey,
      reward
    });
    this.emit(ContractEvents.CONTRACTS_UPDATED, { reason: 'daily_sweep_claimed' });

    return {
      success: true,
      reward
    };
  }

  // ==========================================
  // Career Contracts Engine (Unlock, Shuffle-Bag, Dual-Gate)
  // ==========================================

  /**
   * Evaluates Career unlock prerequisites (Level >= 5 && Swarm Wave >= 5)
   * and populates the 3 focused Career slots upon unlock.
   * @param {object} [options]
   * @param {boolean} [options.silent=false]
   * @returns {boolean} True if Career Contracts transitioned to unlocked or populated missing slots
   */
  checkCareerUnlock(options = {}) {
    this._ensureStorageReady();
    const fullState = this.storage.get('', {}) || this.storage.state || {};
    const contracts = this._readContracts();
    const career = contracts.career;
    const unlockEval = evaluateCareerUnlock(fullState);

    const wasUnlocked = Boolean(career.unlocked);
    if (!wasUnlocked && !unlockEval.unlocked) {
      return false;
    }

    let changed = false;
    if (!wasUnlocked && unlockEval.unlocked) {
      career.unlocked = true;
      career.tier = Math.max(1, career.tier || 1);
      changed = true;
    }

    // Ensure all 3 focused Career slots are populated when unlocked
    for (let i = 0; i < CAREER_SLOT_FOCUSES.length; i++) {
      if (!career.slots[i]) {
        const focus = CAREER_SLOT_FOCUSES[i];
        const drawn = this._drawFromShuffleBag(career.tier, focus, career);
        if (drawn) {
          career.slots[i] = this._createCareerSlot(drawn, i);
          changed = true;
        }
      }
    }

    if (!changed) {
      return false;
    }

    this._writeContracts(contracts, { immediate: true });

    if (!wasUnlocked && !options.silent) {
      this.emit(ContractEvents.CAREER_UNLOCKED, {
        tier: career.tier,
        slots: deepClone(career.slots)
      });
    }
    if (!options.silent) {
      this.emit(ContractEvents.CONTRACTS_UPDATED, { reason: 'career_unlocked' });
    }

    return true;
  }

  /**
   * Draws an unseen template from the given tier & focus shuffle-bag bucket,
   * reshuffling only that bucket once all templates in it have been seen.
   * @private
   */
  _drawFromShuffleBag(tier, focus, career, avoidRepeatId = null) {
    const bucket = getCareerBucket(tier, focus);
    if (!bucket || bucket.length === 0) return null;

    const tierKey = String(tier);
    if (!career.seenIds || typeof career.seenIds !== 'object') {
      career.seenIds = {};
    }
    if (!career.seenIds[tierKey] || typeof career.seenIds[tierKey] !== 'object') {
      career.seenIds[tierKey] = {};
    }
    if (!Array.isArray(career.seenIds[tierKey][focus])) {
      career.seenIds[tierKey][focus] = [];
    }

    const seenSet = new Set(career.seenIds[tierKey][focus]);
    let unseen = bucket.filter((tpl) => !seenSet.has(tpl.id));

    if (unseen.length === 0) {
      // Bucket exhausted: reset only this tier-focus shuffle bag
      career.seenIds[tierKey][focus] = [];
      unseen = bucket.length > 1 && avoidRepeatId
        ? bucket.filter((tpl) => tpl.id !== avoidRepeatId)
        : [...bucket];
    }

    const rand = Math.max(0, Math.min(0.9999999, Number(this.rngFn()) || 0));
    const chosen = unseen[Math.floor(rand * unseen.length)] || unseen[0];

    if (chosen) {
      career.seenIds[tierKey][focus].push(chosen.id);
    }

    return chosen;
  }

  /**
   * Evaluates dual-gate promotion on a mutable career object.
   * Returns promotion metadata if promoted, or null otherwise.
   * @private
   */
  _evaluateAndApplyPromotion(career) {
    if (!career || !career.unlocked) return null;

    const gate = getPromotionGate(career.tier);
    if (!gate) return null;

    const playerLevel = Math.max(1, Number(this.storage.get('player.level', 1) || 1));
    if (career.tierCompletions >= gate.requiredCompletions && playerLevel >= gate.requiredLevel) {
      const previousTier = career.tier;
      career.tier = gate.nextTier;
      career.tierCompletions = 0;
      return {
        previousTier,
        newTier: gate.nextTier,
        tierName: getCareerTierConfig(gate.nextTier)?.name || `Tier ${gate.nextTier}`
      };
    }

    return null;
  }

  /**
   * Checks whether the current Career tier qualifies for dual-gate promotion
   * (e.g., when Player Level reaches the gate after quota was already satisfied).
   * @param {object} [options]
   * @param {boolean} [options.silent=false]
   * @returns {object|null} Promotion info if promoted, else null
   */
  checkCareerPromotion(options = {}) {
    const contracts = this._readContracts();
    const promotion = this._evaluateAndApplyPromotion(contracts.career);
    if (!promotion) return null;

    this._writeContracts(contracts, { immediate: true });

    if (!options.silent) {
      this.emit(ContractEvents.CAREER_TIER_PROMOTED, promotion);
      this.emit(ContractEvents.CONTRACTS_UPDATED, { reason: 'career_promoted' });
    }

    return promotion;
  }

  /**
   * Claims a completed Career Contract slot, pays its tier reward atomically,
   * evaluates dual-gate tier promotion, and immediately deals the replacement
   * contract from the active tier's focus shuffle-bag.
   * @param {number|string} slotIndexOrIdOrFocus Slot index (0-2), template ID, or focus name
   * @param {object} [options]
   * @param {boolean} [options.silentAudio=false]
   * @returns {{ success: boolean, reason?: string, claimedSlot?: object, nextSlot?: object, reward?: object, promoted?: object|null }}
   */
  claimCareerContract(slotIndexOrIdOrFocus, options = {}) {
    this.checkCareerUnlock({ silent: true });
    const contracts = this._readContracts();
    const { career } = contracts;

    if (!career.unlocked) {
      return { success: false, reason: 'career_locked' };
    }

    let slotIndex = -1;
    if (typeof slotIndexOrIdOrFocus === 'number') {
      slotIndex = slotIndexOrIdOrFocus;
    } else if (typeof slotIndexOrIdOrFocus === 'string') {
      const focusIdx = CAREER_SLOT_FOCUSES.indexOf(slotIndexOrIdOrFocus);
      if (focusIdx !== -1) {
        slotIndex = focusIdx;
      } else {
        slotIndex = career.slots.findIndex(
          (s) => s && (s.id === slotIndexOrIdOrFocus || s.templateId === slotIndexOrIdOrFocus)
        );
      }
    }

    if (slotIndex < 0 || slotIndex >= CAREER_SLOT_FOCUSES.length) {
      return { success: false, reason: 'invalid_slot' };
    }

    const slot = career.slots[slotIndex];
    if (!slot) {
      return { success: false, reason: 'empty_slot' };
    }
    if (slot.claimed || slot.status === ContractStatus.CLAIMED) {
      return { success: false, reason: 'already_claimed' };
    }
    if (!this._isSlotClaimable(slot)) {
      return { success: false, reason: 'not_completed' };
    }

    const template = getCareerTemplate(slot.id || slot.templateId);
    const slotTier = Number(slot.tier || template?.tier || career.tier || 1);
    const reward = CAREER_TIER_REWARDS[slotTier]
      ? { ...CAREER_TIER_REWARDS[slotTier] }
      : { ...(template?.reward || CAREER_TIER_REWARDS[1]) };

    const claimedSnapshot = this._enrichCareerSlot({
      ...slot,
      claimed: true,
      status: ContractStatus.CLAIMED,
      progress: Math.max(Number(slot.progress || 0), Number(slot.target || 0))
    }, slotIndex);

    // 1. Advance tier completions and evaluate dual-gate promotion BEFORE dealing replacement
    career.tierCompletions += 1;
    const promoted = this._evaluateAndApplyPromotion(career);

    // 2. Immediately draw replacement from current (possibly promoted) tier & focus shuffle-bag
    const focus = CAREER_SLOT_FOCUSES[slotIndex];
    const nextTemplate = this._drawFromShuffleBag(career.tier, focus, career, slot.id || slot.templateId);
    career.slots[slotIndex] = nextTemplate ? this._createCareerSlot(nextTemplate, slotIndex) : null;

    // 3. Persist before distributing economy rewards to prevent double-claim via re-entrant listeners
    this._writeContracts(contracts, { immediate: true });

    // 4. Atomic reward distribution via EconomyManager
    this._distributeReward(reward, `contract_career_t${slotTier}_${slot.id}`);

    // Note: XP gain above may have caused LEVEL_UP -> _onLevelUp -> checkCareerPromotion()
    // Re-read current career state if XP leveled the player into meeting a pending level gate
    const postPayoutPromotion = this.checkCareerPromotion({ silent: true });
    const finalPromotion = promoted || postPayoutPromotion;

    if (!options.silentAudio) {
      this._playFanfare();
    }

    const nextEnriched = career.slots[slotIndex]
      ? this._enrichCareerSlot(career.slots[slotIndex], slotIndex)
      : null;

    this.emit(ContractEvents.CONTRACT_CLAIMED, {
      type: 'career',
      slotIndex,
      focus,
      slot: claimedSnapshot,
      nextSlot: nextEnriched,
      reward,
      promoted: finalPromotion
    });

    if (finalPromotion) {
      this.emit(ContractEvents.CAREER_TIER_PROMOTED, finalPromotion);
    }

    this.emit(ContractEvents.CONTRACTS_UPDATED, { reason: 'career_claimed' });

    return {
      success: true,
      claimedSlot: claimedSnapshot,
      nextSlot: nextEnriched,
      reward,
      promoted: finalPromotion
    };
  }

  _distributeReward(reward, source) {
    if (!reward || !this.economy) return;

    const credits = Number(reward.credits ?? reward.bits ?? 0);
    const sparks = Number(reward.sparks ?? 0);
    const xp = Number(reward.xp ?? 0);

    if (credits > 0) {
      if (typeof this.economy.awardCredits === 'function') {
        this.economy.awardCredits(credits, source);
      } else if (typeof this.economy.awardBits === 'function') {
        this.economy.awardBits(credits, source);
      }
    }
    if (sparks > 0 && typeof this.economy.awardSparks === 'function') {
      this.economy.awardSparks(sparks, source);
    }
    if (xp > 0 && typeof this.economy.awardXP === 'function') {
      this.economy.awardXP(xp, source);
    }
  }

  _playFanfare() {
    if (typeof this.playFanfareFn === 'function') {
      try {
        this.playFanfareFn();
      } catch (_) {}
    }
  }

  // ==========================================
  // Telemetry Evaluation & Bridge Listeners
  // ==========================================

  _matchesContext(template, context = {}) {
    if (!template?.params) return true;
    if (template.params.minAiTier != null) {
      const tier = Number(context?.aiTier ?? context?.tier ?? 0);
      if (tier < template.params.minAiTier) {
        return false;
      }
    }
    return true;
  }

  /**
   * Increments all matching active Daily and Career Contracts for a telemetry metric.
   * @param {string} metricKey
   * @param {number} [delta=1]
   * @param {object} [context={}]
   * @returns {number} Number of contract slots updated
   */
  recordMetric(metricKey, delta = 1, context = {}) {
    if (!metricKey || typeof metricKey !== 'string') return 0;
    const inc = Number(delta);
    if (!Number.isFinite(inc) || inc <= 0) return 0;

    this.ensureDailyRotation({ silent: true });
    this.checkCareerUnlock({ silent: true });

    const contracts = this._readContracts();
    let updatedCount = 0;
    const progressEvents = [];
    const claimableEvents = [];

    const prevAllDailyComplete =
      Array.isArray(contracts.daily.slots) &&
      contracts.daily.slots.length === DAILY_SLOTS_COUNT &&
      contracts.daily.slots.every((s) => this._isSlotCompleted(s));

    // 1. Update matching Daily slots
    for (let i = 0; i < contracts.daily.slots.length; i++) {
      const slot = contracts.daily.slots[i];
      if (!slot || slot.claimed || slot.status === ContractStatus.CLAIMED || slot.status === ContractStatus.CLAIMABLE) {
        continue;
      }
      const tpl = getDailyTemplate(slot.id || slot.templateId);
      const slotMetric = tpl?.metricKey || slot.metricKey;
      if (slotMetric !== metricKey || !this._matchesContext(tpl, context)) {
        continue;
      }

      const target = Math.max(1, Number(slot.target || tpl?.target || 1));
      const prev = Math.max(0, Number(slot.progress || 0));
      const next = Math.min(target, prev + inc);
      if (next !== prev) {
        slot.progress = next;
        slot.target = target;
        updatedCount++;
        if (next >= target) {
          slot.status = ContractStatus.CLAIMABLE;
          claimableEvents.push({ type: 'daily', slotIndex: i, slot: this._enrichDailySlot(slot, i) });
        }
        progressEvents.push({ type: 'daily', slotIndex: i, slot: this._enrichDailySlot(slot, i) });
      }
    }

    // 2. Update matching Career slots (when unlocked)
    if (contracts.career.unlocked) {
      for (let i = 0; i < contracts.career.slots.length; i++) {
        const slot = contracts.career.slots[i];
        if (!slot || slot.claimed || slot.status === ContractStatus.CLAIMED || slot.status === ContractStatus.CLAIMABLE) {
          continue;
        }
        const tpl = getCareerTemplate(slot.id || slot.templateId);
        const slotMetric = tpl?.metricKey || slot.metricKey;
        if (slotMetric !== metricKey || !this._matchesContext(tpl, context)) {
          continue;
        }

        const target = Math.max(1, Number(slot.target || tpl?.target || 1));
        const prev = Math.max(0, Number(slot.progress || 0));
        const next = Math.min(target, prev + inc);
        if (next !== prev) {
          slot.progress = next;
          slot.target = target;
          updatedCount++;
          if (next >= target) {
            slot.status = ContractStatus.CLAIMABLE;
            claimableEvents.push({ type: 'career', slotIndex: i, slot: this._enrichCareerSlot(slot, i) });
          }
          progressEvents.push({ type: 'career', slotIndex: i, slot: this._enrichCareerSlot(slot, i) });
        }
      }
    }

    if (updatedCount === 0) {
      return 0;
    }

    this._writeContracts(contracts, { immediate: true });

    for (const evt of progressEvents) {
      this.emit(ContractEvents.CONTRACT_PROGRESS, evt);
    }
    for (const evt of claimableEvents) {
      this.emit(ContractEvents.CONTRACT_CLAIMABLE, evt);
    }

    const nowAllDailyComplete =
      !contracts.daily.sweepClaimed &&
      Array.isArray(contracts.daily.slots) &&
      contracts.daily.slots.length === DAILY_SLOTS_COUNT &&
      contracts.daily.slots.every((s) => this._isSlotCompleted(s));

    if (!prevAllDailyComplete && nowAllDailyComplete) {
      this.emit(ContractEvents.DAILY_SWEEP_CLAIMABLE, {
        dateKey: contracts.daily.dateKey,
        reward: { ...DAILY_SWEEP_REWARD }
      });
    }

    this.emit(ContractEvents.CONTRACTS_UPDATED, { reason: 'metric_updated', metricKey });
    return updatedCount;
  }

  _onDuelManeuver(payload = {}) {
    const maneuver = payload.maneuver;
    if (maneuver === 'parry') {
      this.recordMetric(CONTRACT_METRICS.PARRY, 1, payload);
      this.recordMetric(CONTRACT_METRICS.DISCS_DEFLECTED, 1, payload);
    } else if (maneuver === 'ricochet_hit') {
      this.recordMetric(CONTRACT_METRICS.RICOCHET, 1, payload);
    } else if (maneuver === 'curve_elimination') {
      this.recordMetric(CONTRACT_METRICS.CURVE_KILL, 1, payload);
    }
  }

  _onDuelMatchPayout(payload = {}) {
    this.recordMetric(CONTRACT_METRICS.MATCH_PLAYED, 1, payload);

    if (payload.mode === 'multiplayer') {
      if (payload.isVictory || payload.outcome === 'victory') {
        this.recordMetric(CONTRACT_METRICS.DUEL_WIN, 1, payload);
        this.recordMetric(CONTRACT_METRICS.DUEL_MULTIPLAYER_WIN, 1, payload);
      }
      return;
    }

    const cleared = Math.max(0, Math.floor(Number(payload.sessionTiersCleared ?? (payload.isVictory ? 1 : 0)) || 0));
    if (cleared > 0) {
      this.recordMetric(CONTRACT_METRICS.DUEL_WIN, cleared, payload);
      const startTier = Math.max(1, Math.floor(Number(payload.startTier ?? payload.context?.startTier ?? 1) || 1));
      for (let t = startTier; t < startTier + cleared; t++) {
        this.recordMetric(CONTRACT_METRICS.DUEL_AI_HIGH_TIER_WIN, 1, { aiTier: t });
      }
    }
  }

  _onSwarmWavePayout(payload = {}) {
    this.recordMetric(CONTRACT_METRICS.SWARM_WAVE, 1, payload);
    if (payload.isHardcore) {
      this.recordMetric(CONTRACT_METRICS.HARDCORE_SWARM_WAVE, 1, payload);
    }
    this.checkCareerUnlock();
  }

  _onCampaignTrialCompleted(payload = {}) {
    if (payload && payload.success === false) return;
    this.recordMetric(CONTRACT_METRICS.TOUR_CLEAR, 1, payload);
    if (Number(payload?.stars || 0) >= 3) {
      this.recordMetric(CONTRACT_METRICS.TOUR_THREE_STAR, 1, payload);
    }
  }

  _onStorageMutated(evt = {}) {
    if (this._isInternalWrite) return;
    const { path, value, previousValue, isExternal } = evt;
    if (!path || typeof path !== 'string') return;
    if (path === 'contracts' || path.startsWith('contracts.')) return;

    if (path === '*' || isExternal) {
      this.reconcile({ silent: false });
      return;
    }

    if (
      path === 'player.level' ||
      path === 'stats.swarmHighestWave' ||
      path === 'stats.swarmMaxWave' ||
      path === 'stats.highestWave'
    ) {
      this.checkCareerUnlock();
      this.checkCareerPromotion();
      return;
    }

    if (path === 'stats.totalDerezzes' || path === 'stats.totalDeallocations') {
      const delta = Math.max(0, Number(value || 0) - Number(previousValue || 0));
      if (delta > 0) {
        this.recordMetric(CONTRACT_METRICS.DEALLOCATIONS, delta);
      }
    } else if (path === 'stats.discsDeflected') {
      const delta = Math.max(0, Number(value || 0) - Number(previousValue || 0));
      if (delta > 0) {
        this.recordMetric(CONTRACT_METRICS.DISCS_DEFLECTED, delta);
      }
    }
  }

  // ==========================================
  // Query & UI Snapshot Helpers
  // ==========================================

  _enrichDailySlot(slot, slotIndex) {
    if (!slot) return null;
    const tpl = getDailyTemplate(slot.id || slot.templateId);
    const target = Math.max(1, Number(slot.target || tpl?.target || 1));
    const progress = Math.min(target, Math.max(0, Number(slot.progress || 0)));
    const claimed = Boolean(slot.claimed || slot.status === ContractStatus.CLAIMED);
    const claimable = !claimed && (slot.status === ContractStatus.CLAIMABLE || progress >= target);
    const status = claimed ? ContractStatus.CLAIMED : (claimable ? ContractStatus.CLAIMABLE : ContractStatus.ACTIVE);

    return {
      ...slot,
      slotIndex,
      type: 'daily',
      title: tpl?.title || slot.title || slot.id,
      description: tpl?.description || slot.description || '',
      metricKey: tpl?.metricKey || slot.metricKey || '',
      icon: tpl?.icon || slot.icon || '⚡',
      progress,
      target,
      claimed,
      claimable,
      status,
      reward: tpl?.reward ? { ...tpl.reward } : { ...DAILY_CONTRACT_REWARD }
    };
  }

  _enrichCareerSlot(slot, slotIndex) {
    if (!slot) return null;
    const tpl = getCareerTemplate(slot.id || slot.templateId);
    const focus = slot.focus || tpl?.focus || CAREER_SLOT_FOCUSES[slotIndex] || CONTRACT_FOCUSES.COMBAT;
    const tier = Number(slot.tier || tpl?.tier || 1);
    const target = Math.max(1, Number(slot.target || tpl?.target || 1));
    const progress = Math.min(target, Math.max(0, Number(slot.progress || 0)));
    const claimed = Boolean(slot.claimed || slot.status === ContractStatus.CLAIMED);
    const claimable = !claimed && (slot.status === ContractStatus.CLAIMABLE || progress >= target);
    const status = claimed ? ContractStatus.CLAIMED : (claimable ? ContractStatus.CLAIMABLE : ContractStatus.ACTIVE);
    const reward = CAREER_TIER_REWARDS[tier]
      ? { ...CAREER_TIER_REWARDS[tier] }
      : { ...(tpl?.reward || CAREER_TIER_REWARDS[1]) };

    return {
      ...slot,
      slotIndex,
      type: 'career',
      focus,
      focusMeta: CAREER_FOCUS_META[focus] || null,
      tier,
      title: tpl?.title || slot.title || slot.id,
      description: tpl?.description || slot.description || '',
      metricKey: tpl?.metricKey || slot.metricKey || '',
      progress,
      target,
      claimed,
      claimable,
      status,
      reward
    };
  }

  /**
   * Returns enriched Daily Contracts state for UI rendering.
   * Automatically triggers UTC rotation if the active day has expired.
   * @returns {object}
   */
  getDailyState() {
    this.ensureDailyRotation();
    const { daily } = this._readContracts();
    const slots = (daily.slots || []).map((slot, i) => this._enrichDailySlot(slot, i));
    const completedCount = slots.filter((s) => this._isSlotCompleted(s)).length;
    const sweepClaimable = !daily.sweepClaimed && slots.length >= DAILY_SLOTS_COUNT && completedCount >= DAILY_SLOTS_COUNT;

    return {
      dateKey: daily.dateKey,
      slots,
      completedCount,
      totalCount: DAILY_SLOTS_COUNT,
      sweepClaimable,
      sweepClaimed: Boolean(daily.sweepClaimed),
      sweepReward: { ...DAILY_SWEEP_REWARD },
      msUntilReset: this.getMsUntilNextUtcReset()
    };
  }

  /**
   * Returns enriched Career Contracts state for UI rendering.
   * @returns {object}
   */
  getCareerState() {
    this.checkCareerUnlock();
    this.checkCareerPromotion();

    const fullState = this.storage.get('', {}) || this.storage.state || {};
    const unlockStatus = evaluateCareerUnlock(fullState);
    const { career } = this._readContracts();
    const tierConfig = getCareerTierConfig(career.tier);
    const promotionGate = getPromotionGate(career.tier);
    const slots = CAREER_SLOT_FOCUSES.map((_, i) =>
      career.slots[i] ? this._enrichCareerSlot(career.slots[i], i) : null
    );

    const quotaMet = promotionGate ? career.tierCompletions >= promotionGate.requiredCompletions : false;
    const levelMet = promotionGate ? unlockStatus.level >= promotionGate.requiredLevel : false;

    return {
      unlocked: Boolean(career.unlocked),
      unlockStatus,
      tier: career.tier,
      tierName: tierConfig?.name || 'Rookie',
      tierReward: tierConfig?.reward ? { ...tierConfig.reward } : { ...CAREER_TIER_REWARDS[1] },
      tierCompletions: career.tierCompletions,
      promotionGate,
      quotaMet,
      levelMet,
      awaitingLevelGate: Boolean(promotionGate && quotaMet && !levelMet),
      slots
    };
  }

  /**
   * Returns the total count of claimable Daily, Sweep, and Career rewards.
   * @returns {number}
   */
  getPendingClaimCount() {
    this.ensureDailyRotation({ silent: true });
    this.checkCareerUnlock({ silent: true });

    const { daily, career } = this._readContracts();
    let count = 0;

    for (const slot of (daily.slots || [])) {
      if (this._isSlotClaimable(slot)) count++;
    }

    if (
      !daily.sweepClaimed &&
      Array.isArray(daily.slots) &&
      daily.slots.length >= DAILY_SLOTS_COUNT &&
      daily.slots.every((s) => this._isSlotCompleted(s))
    ) {
      count++;
    }

    if (career.unlocked) {
      for (const slot of (career.slots || [])) {
        if (this._isSlotClaimable(slot)) count++;
      }
    }

    return count;
  }

  /**
   * Returns true if any Daily Contract, Daily Sweep bonus, or Career Contract is ready to claim.
   * @returns {boolean}
   */
  hasClaimableRewards() {
    return this.getPendingClaimCount() > 0;
  }

  /**
   * Returns a complete snapshot of Daily and Career contract state.
   * @returns {object}
   */
  getSnapshot() {
    const daily = this.getDailyState();
    const career = this.getCareerState();
    const pendingClaimCount = this.getPendingClaimCount();
    return {
      daily,
      career,
      pendingClaimCount
    };
  }
}

export const contractManager = new ContractManager();
