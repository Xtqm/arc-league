/**
 * SparkVaultManager.js
 * Weekly Rotating Spark Vault Storefront Engine for Tron Disc Arena.
 * Provides deterministic weekly UTC rotation of 1-3 UNLOCK_TYPES.SPARKS items
 * (allowing repeat appearances across weeks) and atomic Spark purchases via
 * EconomyManager.spendSparks + ArmoryManager.unlockRewardItem.
 */

import {
  WEEK_MS,
  SPARK_VAULT_CONFIG,
  SPARK_VAULT_CATALOG_META,
  getUtcWeekIndex,
  getSparkVaultEligibleItems
} from './ApexTrialRegistry.js';
import { UNLOCK_TYPES } from '../armory/ArmoryCatalog.js';
import { economyManager as defaultEconomyManager } from '../core/economy/EconomyManager.js';
import { armoryManager as defaultArmoryManager } from '../armory/ArmoryManager.js';

export const SparkVaultEvents = Object.freeze({
  VAULT_PURCHASED: 'SPARK_VAULT_PURCHASED'
});

/**
 * Deterministic 32-bit hash/PRNG for weekly rotation seeding.
 * @param {number} seed
 * @returns {() => number}
 */
function createSeededRng(seed) {
  let state = (Number(seed) ^ 0x9e3779b9) >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export class SparkVaultManager {
  /**
   * @param {object} [options]
   * @param {import('../core/economy/EconomyManager.js').EconomyManager} [options.economy]
   * @param {import('../armory/ArmoryManager.js').ArmoryManager} [options.armory]
   * @param {() => number} [options.nowFn]
   * @param {() => Array<object>} [options.getEligibleItemsFn]
   */
  constructor(options = {}) {
    this.economy = options.economy || defaultEconomyManager;
    this.armory = options.armory || defaultArmoryManager;
    this.nowFn = typeof options.nowFn === 'function' ? options.nowFn : () => Date.now();
    this.getEligibleItemsFn = typeof options.getEligibleItemsFn === 'function'
      ? options.getEligibleItemsFn
      : null;

    this._listeners = new Map();
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
    if (!this._listeners.has(event)) return;
    for (const handler of this._listeners.get(event)) {
      try {
        handler(payload);
      } catch (err) {
        console.error(`[SparkVaultManager] Listener error for ${event}:`, err);
      }
    }
  }

  /**
   * Returns all eligible UNLOCK_TYPES.SPARKS items for Vault rotation.
   * @returns {Array<object>}
   */
  getEligiblePool() {
    if (this.getEligibleItemsFn) {
      return this.getEligibleItemsFn();
    }
    const items = getSparkVaultEligibleItems();
    if (items.length > 0) {
      return items;
    }
    // Fallback to armory catalog if dynamic catalog was used
    if (this.armory && this.armory.catalog) {
      const collected = [];
      for (const list of Object.values(this.armory.catalog)) {
        if (!Array.isArray(list)) continue;
        for (const item of list) {
          if (item && item.unlockType === UNLOCK_TYPES.SPARKS) {
            const meta = SPARK_VAULT_CATALOG_META[item.id] || {
              itemId: item.id,
              tierId: 'standard_prestige',
              tierLabel: 'Standard Prestige',
              sparksCost: Number(item.cost) || 40,
              rarity: 'PRESTIGE'
            };
            collected.push({ ...item, vaultMeta: meta });
          }
        }
      }
      return collected;
    }
    return [];
  }

  /**
   * Returns the current UTC week index.
   * @param {number} [nowMs]
   * @returns {number}
   */
  getWeekIndex(nowMs = this.nowFn()) {
    return getUtcWeekIndex(nowMs);
  }

  /**
   * Returns milliseconds remaining until the next UTC weekly Vault rotation.
   * @param {number} [nowMs]
   * @returns {number}
   */
  getMsUntilNextRotation(nowMs = this.nowFn()) {
    const ts = Number.isFinite(Number(nowMs)) ? Number(nowMs) : Date.now();
    const weekIndex = this.getWeekIndex(ts);
    const nextResetMs = (weekIndex + 1) * WEEK_MS;
    return Math.max(0, nextResetMs - ts);
  }

  /**
   * Deterministically resolves 1-3 prestige items for the given UTC timestamp/week.
   * Repeat appearances across weeks are explicitly allowed.
   * @param {number} [nowMs]
   * @returns {Array<object>}
   */
  getActiveRotation(nowMs = this.nowFn()) {
    const pool = [...this.getEligiblePool()];
    if (pool.length === 0) return [];

    const weekIndex = this.getWeekIndex(nowMs);
    const rng = createSeededRng(weekIndex + 1337);

    const minCount = Math.min(SPARK_VAULT_CONFIG.minWeeklyItems, pool.length);
    const maxCount = Math.min(SPARK_VAULT_CONFIG.maxWeeklyItems, pool.length);
    const span = Math.max(1, maxCount - minCount + 1);
    const count = minCount + Math.floor(rng() * span);

    // Deterministic Fisher-Yates shuffle on copy of pool
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      const tmp = pool[i];
      pool[i] = pool[j];
      pool[j] = tmp;
    }

    return pool.slice(0, count).map((item) => {
      const cost = Number(item.cost ?? item.vaultMeta?.sparksCost ?? 0);
      const owned = Boolean(this.armory && this.armory.isUnlocked(item.category, item.id));
      return {
        ...item,
        sparksCost: cost,
        owned
      };
    });
  }

  /**
   * Returns complete Vault snapshot including rotation window & items.
   * @param {number} [nowMs]
   */
  getSnapshot(nowMs = this.nowFn()) {
    const ts = Number.isFinite(Number(nowMs)) ? Number(nowMs) : Date.now();
    const weekIndex = this.getWeekIndex(ts);
    const startsAt = weekIndex * WEEK_MS;
    const endsAt = (weekIndex + 1) * WEEK_MS;
    const items = this.getActiveRotation(ts);
    const currentSparks = this.economy && typeof this.economy.getSparks === 'function'
      ? this.economy.getSparks()
      : 0;

    return {
      weekIndex,
      startsAt,
      endsAt,
      msUntilRotation: Math.max(0, endsAt - ts),
      currentSparks,
      items
    };
  }

  /**
   * Checks whether an item is present in the current weekly Vault rotation.
   * @param {string} itemId
   * @param {number} [nowMs]
   * @returns {boolean}
   */
  isItemInRotation(itemId, nowMs = this.nowFn()) {
    if (!itemId || typeof itemId !== 'string') return false;
    return this.getActiveRotation(nowMs).some((item) => item.id === itemId);
  }

  /**
   * Checks purchase eligibility for a Vault item.
   * Rejects items outside the active rotation, already owned items, or insufficient Sparks.
   * @param {string} itemId
   * @param {number} [nowMs]
   * @returns {{ allowed: boolean, reason: string|null, item: object|null, cost: number }}
   */
  canPurchase(itemId, nowMs = this.nowFn()) {
    if (!itemId || typeof itemId !== 'string') {
      return { allowed: false, reason: 'INVALID_ITEM', item: null, cost: 0 };
    }

    const activeItems = this.getActiveRotation(nowMs);
    const item = activeItems.find((entry) => entry.id === itemId) || null;
    if (!item) {
      return { allowed: false, reason: 'NOT_IN_ACTIVE_ROTATION', item: null, cost: 0 };
    }

    if (item.unlockType !== UNLOCK_TYPES.SPARKS) {
      return { allowed: false, reason: 'NOT_SPARK_VAULT_ITEM', item, cost: 0 };
    }

    if (this.armory && this.armory.isUnlocked(item.category, item.id)) {
      return { allowed: false, reason: 'ALREADY_OWNED', item, cost: item.sparksCost };
    }

    const cost = Number(item.sparksCost ?? item.cost ?? 0);
    if (!Number.isFinite(cost) || cost <= 0) {
      return { allowed: false, reason: 'INVALID_COST', item, cost: 0 };
    }

    const canAfford = this.economy && typeof this.economy.canAffordSparks === 'function'
      ? this.economy.canAffordSparks(cost)
      : false;
    if (!canAfford) {
      return { allowed: false, reason: 'INSUFFICIENT_SPARKS', item, cost };
    }

    return { allowed: true, reason: null, item, cost };
  }

  /**
   * Atomically purchases an active weekly Vault item via EconomyManager.spendSparks
   * and ArmoryManager.unlockRewardItem.
   * @param {string} itemId
   * @param {number} [nowMs]
   * @returns {{ success: boolean, reason: string|null, item: object|null, sparksSpent: number }}
   */
  purchaseItem(itemId, nowMs = this.nowFn()) {
    const check = this.canPurchase(itemId, nowMs);
    if (!check.allowed) {
      return {
        success: false,
        reason: check.reason,
        item: check.item,
        sparksSpent: 0
      };
    }

    const { item, cost } = check;
    const spent = this.economy.spendSparks(cost, 'spark_vault', item.id);
    if (!spent) {
      return {
        success: false,
        reason: 'INSUFFICIENT_SPARKS',
        item,
        sparksSpent: 0
      };
    }

    const unlocked = this.armory.unlockRewardItem(item.category, item.id);
    if (!unlocked) {
      // Defensive refund if unlockRewardItem ever fails
      if (typeof this.economy.awardSparks === 'function') {
        this.economy.awardSparks(cost, 'spark_vault_refund');
      }
      return {
        success: false,
        reason: 'UNLOCK_FAILED',
        item,
        sparksSpent: 0
      };
    }

    const payload = {
      success: true,
      reason: null,
      item: { ...item, owned: true },
      sparksSpent: cost,
      weekIndex: this.getWeekIndex(nowMs),
      timestamp: Date.now()
    };

    this.emit(SparkVaultEvents.VAULT_PURCHASED, payload);
    return payload;
  }
}

export const sparkVaultManager = new SparkVaultManager();
export default sparkVaultManager;
