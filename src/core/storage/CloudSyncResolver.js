/**
 * CloudSyncResolver.js
 * Implements the "Master Grid Protocol" for strictly monotonic cloud save synchronization.
 * Guarantees that progress (bits, levels, star mastery, campaign, inventory, loadout, achievements, telemetry)
 * is non-decreasing across all devices and sessions.
 */

import { deepClone, normalizeContractsState } from './schema.js';

export const DEFAULT_LOADOUT = Object.freeze({
  activeDisc: 'disc_identity_default',
  activeTrail: 'trail_cyan_default',
  activeVisor: 'visor_classic',
  activeArenaSkin: 'grid_default',
  audioTheme: 'synthwave_82'
});

/**
 * Normalizes an inventory payload into standard structured format.
 * Supports backward-compatible translation of legacy string arrays.
 * @param {object|string[]|null} inv
 * @returns {{ discs: string[], cosmetics: string[], consumables: Record<string, number>, unlockedMaps: string[] }}
 */
export function normalizeInventory(inv) {
  if (Array.isArray(inv)) {
    const discs = inv.filter(i => String(i).startsWith('disc_'));
    const maps = inv.filter(i => String(i).startsWith('arena_'));
    const cosmetics = inv.filter(i => !String(i).startsWith('disc_') && !String(i).startsWith('arena_'));
    return {
      discs: discs.length > 0 ? Array.from(new Set(discs)) : ['disc_default'],
      cosmetics: Array.from(new Set(cosmetics)),
      consumables: {},
      unlockedMaps: Array.from(new Set(['arena_grid_01', ...maps]))
    };
  }

  const obj = (inv && typeof inv === 'object') ? inv : {};
  const discs = Array.isArray(obj.discs) && obj.discs.length > 0
    ? Array.from(new Set(obj.discs))
    : ['disc_default'];
  const cosmetics = Array.isArray(obj.cosmetics) ? Array.from(new Set(obj.cosmetics)) : [];
  const consumables = {};
  if (obj.consumables && typeof obj.consumables === 'object') {
    for (const [k, v] of Object.entries(obj.consumables)) {
      consumables[k] = Math.max(0, Number(v || 0));
    }
  }
  const unlockedMaps = Array.isArray(obj.unlockedMaps)
    ? Array.from(new Set(['arena_grid_01', ...obj.unlockedMaps]))
    : ['arena_grid_01'];

  const result = {
    discs,
    cosmetics,
    consumables,
    unlockedMaps
  };

  // Preserve any additional category arrays (e.g. discSkins, chassisSkins, discTypes)
  for (const [key, val] of Object.entries(obj)) {
    if (!['discs', 'cosmetics', 'consumables', 'unlockedMaps'].includes(key)) {
      if (Array.isArray(val)) {
        result[key] = Array.from(new Set(val));
      } else if (val && typeof val === 'object') {
        result[key] = { ...val };
      } else {
        result[key] = val;
      }
    }
  }

  return result;
}

/**
 * Normalizes campaign state and ensures levelRecords consistency.
 * @param {object|null} campaign
 * @param {object} [starMastery={}]
 * @returns {object}
 */
export function normalizeCampaign(campaign, starMastery = {}) {
  const c = (campaign && typeof campaign === 'object') ? campaign : {};
  const completedNodes = Array.isArray(c.completedNodes) ? Array.from(new Set(c.completedNodes)) : [];
  const unlockedNodes = Array.isArray(c.unlockedNodes) && c.unlockedNodes.length > 0
    ? Array.from(new Set(c.unlockedNodes))
    : ['level_01_01'];
  const unlockedGrids = Array.isArray(c.unlockedGrids)
    ? Array.from(new Set(['grid_01', ...c.unlockedGrids]))
    : ['grid_01'];

  const levelRecords = {};
  if (c.levelRecords && typeof c.levelRecords === 'object') {
    for (const [lvlId, rec] of Object.entries(c.levelRecords)) {
      if (rec && typeof rec === 'object') {
        levelRecords[lvlId] = {
          levelId: rec.levelId || lvlId,
          gridId: rec.gridId || '',
          stars: Math.max(0, Number(rec.stars || 0)),
          bestTime: (typeof rec.bestTime === 'number' && rec.bestTime > 0) ? rec.bestTime : null,
          bestIntegrity: (typeof rec.bestIntegrity === 'number') ? rec.bestIntegrity : null,
          completed: Boolean(rec.completed),
          clears: Math.max(0, Number(rec.clears || 0)),
          lastClearedAt: rec.lastClearedAt || null,
          highScore: Math.max(0, Number(rec.highScore || 0))
        };
      }
    }
  }

  // Populate from starMastery if levelRecords is missing entries
  if (starMastery && typeof starMastery === 'object') {
    for (const [lvlId, stars] of Object.entries(starMastery)) {
      if (!levelRecords[lvlId] && Number(stars) > 0) {
        levelRecords[lvlId] = {
          levelId: String(lvlId),
          gridId: '',
          stars: Number(stars),
          bestTime: null,
          bestIntegrity: null,
          completed: true,
          clears: 1,
          lastClearedAt: null,
          highScore: 0
        };
      }
    }
  }

  let computedStars = 0;
  for (const rec of Object.values(levelRecords)) {
    computedStars += rec.stars || 0;
  }
  const starsEarned = Math.max(computedStars, Number(c.starsEarned || 0));

  return {
    completedNodes,
    unlockedNodes,
    unlockedGrids,
    starsEarned,
    levelRecords
  };
}

/**
 * Normalizes loadout selections with fallback defaults.
 * @param {object|null} loadout
 * @returns {object}
 */
export function normalizeLoadout(loadout) {
  const l = (loadout && typeof loadout === 'object') ? loadout : {};
  return {
    activeDisc: l.activeDisc || DEFAULT_LOADOUT.activeDisc,
    activeTrail: l.activeTrail || DEFAULT_LOADOUT.activeTrail,
    activeVisor: l.activeVisor || DEFAULT_LOADOUT.activeVisor,
    activeArenaSkin: l.activeArenaSkin || DEFAULT_LOADOUT.activeArenaSkin,
    audioTheme: l.audioTheme || DEFAULT_LOADOUT.audioTheme
  };
}

/**
 * Normalizes state object into standard save schema with default values.
 * Handles both flat representations and StorageManager.state.
 * @param {object|null} state
 * @returns {object}
 */
export function normalizeSaveState(state = {}) {
  const s = state || {};
  const stats = s.stats || {};
  const settings = s.settings || {};

  const userId = s.userId || s.player?.id || '';
  const handle = s.handle || s.player?.handle || 'PROGRAM';
  const bits = Math.max(
    0,
    Number(s.bits !== undefined ? s.bits : (s.player?.currency?.bits ?? s.player?.currency?.credits ?? 0))
  );
  const level = Math.max(
    1,
    Number(s.level !== undefined ? s.level : (s.player?.level ?? 1))
  );

  const starMastery = { ...(s.starMastery || {}) };
  const campaign = normalizeCampaign(s.campaign, starMastery);
  // Keep starMastery populated from campaign levelRecords as well
  for (const [lvlId, rec] of Object.entries(campaign.levelRecords)) {
    if (rec.stars > (starMastery[lvlId] || 0)) {
      starMastery[lvlId] = rec.stars;
    }
  }

  const inventory = normalizeInventory(s.inventory);
  const loadout = normalizeLoadout(s.loadout);
  const calibrationCompleted = Boolean(s.calibration_completed || s.calibrationCompleted || s.player?.calibration_completed);
  const calibrationBypassed = Boolean(s.calibration_bypassed || s.calibrationBypassed || s.player?.calibration_bypassed);

  return {
    version: typeof s.version === 'number' ? s.version : (Number.parseInt(s.version, 10) || 1),
    userId,
    handle,
    calibration_completed: calibrationCompleted,
    calibration_bypassed: calibrationBypassed,
    createdAt: s.createdAt || Date.now(),
    lastActiveAt: s.lastActiveAt || s.updatedAt || Date.now(),
    bits,
    level,
    starMastery,
    campaign,
    inventory,
    loadout,
    contracts: normalizeContracts(s.contracts),
    achievements: Array.isArray(s.achievements)
      ? Array.from(new Set(s.achievements.map(a => (typeof a === 'string' ? a : a.id))))
      : [],
    stats: {
      matchesPlayed: Math.max(0, Number(stats.matchesPlayed || 0)),
      wins: Math.max(0, Number(stats.wins || 0)),
      losses: Math.max(0, Number(stats.losses || 0)),
      discsThrown: Math.max(0, Number(stats.discsThrown || 0)),
      discsDeflected: Math.max(0, Number(stats.discsDeflected || 0)),
      tilesDestroyed: Math.max(0, Number(stats.tilesDestroyed || 0)),
      highestWave: Math.max(1, Number(stats.highestWave || 1)),
      swarmHighestWave: Math.max(1, Number(stats.swarmHighestWave || stats.highestWave || 1)),
      hardcoreSwarmHighestWave: Math.max(0, Number(stats.hardcoreSwarmHighestWave || 0)),
      highestTier: Math.max(1, Number(stats.highestTier || 1)),
      highestScore: Math.max(0, Number(stats.highestScore || 0)),
      totalScore: Math.max(0, Number(stats.totalScore || 0)),
      totalPlaytimeSec: Math.max(0, Number(stats.totalPlaytimeSec || 0)),
      totalDerezzes: Math.max(0, Number(stats.totalDerezzes ?? stats.totalDeallocations ?? 0)),
      totalDeallocations: Math.max(0, Number(stats.totalDeallocations ?? stats.totalDerezzes ?? 0)),
      parriesExecuted: Math.max(0, Number(stats.parriesExecuted || 0)),
      curveEliminations: Math.max(0, Number(stats.curveEliminations || 0))
    },
    settings: {
      sens: typeof settings.sens === 'number' ? settings.sens : 0.0022,
      invertY: typeof settings.invertY === 'boolean' ? settings.invertY : false
    }
  };
}

/**
 * Merges StarMastery dictionaries by taking the maximum star count per level.
 * @param {Record<string|number, number>} localStars
 * @param {Record<string|number, number>} cloudStars
 * @returns {Record<string|number, number>}
 */
export function mergeStarMastery(localStars = {}, cloudStars = {}) {
  const merged = {};
  const allKeys = new Set([
    ...Object.keys(localStars || {}),
    ...Object.keys(cloudStars || {})
  ]);

  for (const key of allKeys) {
    const localVal = Number((localStars && localStars[key]) || 0);
    const cloudVal = Number((cloudStars && cloudStars[key]) || 0);
    merged[key] = Math.max(localVal, cloudVal);
  }

  return merged;
}

/**
 * Merges array collections via mathematical set union.
 * @param {string[]} localList
 * @param {string[]} cloudList
 * @returns {string[]}
 */
export function mergeSetUnion(localList = [], cloudList = []) {
  const set = new Set([
    ...(Array.isArray(localList) ? localList : []),
    ...(Array.isArray(cloudList) ? cloudList : [])
  ]);
  return Array.from(set);
}

/**
 * Merges structured inventory collections.
 * @param {object} localInv
 * @param {object} cloudInv
 * @returns {object}
 */
export function mergeInventory(localInv = {}, cloudInv = {}) {
  const local = normalizeInventory(localInv);
  const cloud = normalizeInventory(cloudInv);

  const merged = {
    discs: mergeSetUnion(local.discs, cloud.discs),
    cosmetics: mergeSetUnion(local.cosmetics, cloud.cosmetics),
    unlockedMaps: mergeSetUnion(local.unlockedMaps, cloud.unlockedMaps),
    consumables: {}
  };

  if (!merged.unlockedMaps.includes('arena_grid_01')) {
    merged.unlockedMaps.unshift('arena_grid_01');
  }

  const allConsumableKeys = new Set([
    ...Object.keys(local.consumables || {}),
    ...Object.keys(cloud.consumables || {})
  ]);
  for (const key of allConsumableKeys) {
    merged.consumables[key] = Math.max(
      Number(local.consumables?.[key] || 0),
      Number(cloud.consumables?.[key] || 0)
    );
  }

  const allExtraKeys = new Set([
    ...Object.keys(local),
    ...Object.keys(cloud)
  ]);
  for (const key of allExtraKeys) {
    if (!['discs', 'cosmetics', 'consumables', 'unlockedMaps'].includes(key)) {
      if (Array.isArray(local[key]) || Array.isArray(cloud[key])) {
        merged[key] = mergeSetUnion(local[key] || [], cloud[key] || []);
      }
    }
  }

  return merged;
}

/**
 * Monotonically merges campaign progression.
 * @param {object} localCamp
 * @param {object} cloudCamp
 * @returns {object}
 */
export function mergeCampaign(localCamp = {}, cloudCamp = {}) {
  const local = normalizeCampaign(localCamp);
  const cloud = normalizeCampaign(cloudCamp);

  const completedNodes = mergeSetUnion(local.completedNodes, cloud.completedNodes);
  const unlockedNodes = mergeSetUnion(local.unlockedNodes, cloud.unlockedNodes);
  const unlockedGrids = mergeSetUnion(local.unlockedGrids, cloud.unlockedGrids);

  if (!unlockedGrids.includes('grid_01')) {
    unlockedGrids.unshift('grid_01');
  }
  if (!unlockedNodes.includes('level_01_01')) {
    unlockedNodes.unshift('level_01_01');
  }

  const mergedLevelRecords = {};
  const allLevelIds = new Set([
    ...Object.keys(local.levelRecords || {}),
    ...Object.keys(cloud.levelRecords || {})
  ]);

  for (const lvlId of allLevelIds) {
    const loc = local.levelRecords?.[lvlId];
    const cld = cloud.levelRecords?.[lvlId];

    if (loc && cld) {
      let bestTime = null;
      if (loc.bestTime && cld.bestTime) {
        bestTime = Math.min(loc.bestTime, cld.bestTime);
      } else {
        bestTime = loc.bestTime || cld.bestTime || null;
      }

      let bestIntegrity = null;
      if (typeof loc.bestIntegrity === 'number' && typeof cld.bestIntegrity === 'number') {
        bestIntegrity = Math.max(loc.bestIntegrity, cld.bestIntegrity);
      } else if (typeof loc.bestIntegrity === 'number') {
        bestIntegrity = loc.bestIntegrity;
      } else if (typeof cld.bestIntegrity === 'number') {
        bestIntegrity = cld.bestIntegrity;
      }

      mergedLevelRecords[lvlId] = {
        levelId: lvlId,
        gridId: loc.gridId || cld.gridId || '',
        stars: Math.max(loc.stars || 0, cld.stars || 0),
        bestTime,
        bestIntegrity,
        completed: Boolean(loc.completed || cld.completed),
        clears: Math.max(loc.clears || 0, cld.clears || 0),
        lastClearedAt: Math.max(loc.lastClearedAt || 0, cld.lastClearedAt || 0) || null,
        highScore: Math.max(loc.highScore || 0, cld.highScore || 0)
      };
    } else {
      const rec = loc || cld;
      mergedLevelRecords[lvlId] = { ...rec };
    }
  }

  let totalStars = 0;
  for (const rec of Object.values(mergedLevelRecords)) {
    totalStars += rec.stars || 0;
  }
  totalStars = Math.max(totalStars, local.starsEarned, cloud.starsEarned);

  return {
    completedNodes,
    unlockedNodes,
    unlockedGrids,
    starsEarned: totalStars,
    levelRecords: mergedLevelRecords
  };
}

/**
 * Resolves loadout selections using recency with fallback verification against merged inventory.
 * @param {object} localLoadout
 * @param {object} cloudLoadout
 * @param {boolean} preferCloud
 * @param {object} mergedInventory
 * @returns {object}
 */
export function resolveLoadout(localLoadout = {}, cloudLoadout = {}, preferCloud = false, mergedInventory = {}) {
  const chosen = preferCloud ? normalizeLoadout(cloudLoadout) : normalizeLoadout(localLoadout);
  const fallback = preferCloud ? normalizeLoadout(localLoadout) : normalizeLoadout(cloudLoadout);

  const inventory = normalizeInventory(mergedInventory);

  // Validate activeDisc
  let activeDisc = chosen.activeDisc;
  const validDiscs = new Set([...(inventory.discs || []), 'disc_default', 'disc_identity_default']);
  if (!validDiscs.has(activeDisc)) {
    activeDisc = validDiscs.has(fallback.activeDisc)
      ? fallback.activeDisc
      : (inventory.discs[0] || DEFAULT_LOADOUT.activeDisc);
  }

  // Validate activeTrail
  let activeTrail = chosen.activeTrail;
  const validCosmetics = new Set([...(inventory.cosmetics || []), DEFAULT_LOADOUT.activeTrail, DEFAULT_LOADOUT.activeVisor]);
  if (!validCosmetics.has(activeTrail)) {
    activeTrail = validCosmetics.has(fallback.activeTrail)
      ? fallback.activeTrail
      : DEFAULT_LOADOUT.activeTrail;
  }

  // Validate activeVisor
  let activeVisor = chosen.activeVisor;
  if (!validCosmetics.has(activeVisor)) {
    activeVisor = validCosmetics.has(fallback.activeVisor)
      ? fallback.activeVisor
      : DEFAULT_LOADOUT.activeVisor;
  }

  // Validate activeArenaSkin
  let activeArenaSkin = chosen.activeArenaSkin;
  const validMaps = new Set([...(inventory.unlockedMaps || []), ...(inventory.cosmetics || []), DEFAULT_LOADOUT.activeArenaSkin]);
  if (!validMaps.has(activeArenaSkin)) {
    activeArenaSkin = validMaps.has(fallback.activeArenaSkin)
      ? fallback.activeArenaSkin
      : DEFAULT_LOADOUT.activeArenaSkin;
  }

  return {
    activeDisc,
    activeTrail,
    activeVisor,
    activeArenaSkin,
    audioTheme: chosen.audioTheme || DEFAULT_LOADOUT.audioTheme
  };
}

/**
 * Normalizes contracts state into canonical daily and career branches.
 * @param {object|null} contracts
 * @returns {object}
 */
export function normalizeContracts(contracts) {
  return normalizeContractsState(contracts);
}

function getContractSlotId(slot) {
  if (!slot || typeof slot !== 'object') return null;
  return slot.id || slot.templateId || null;
}

function isContractSlotClaimed(slot) {
  return Boolean(slot?.claimed || slot?.status === 'claimed');
}

function isContractSlotClaimable(slot) {
  if (!slot || isContractSlotClaimed(slot)) return false;
  if (slot.status === 'claimable') return true;
  const target = Number(slot.target || 0);
  const progress = Number(slot.progress || 0);
  return target > 0 && progress >= target;
}

function getContractSlotScore(slot) {
  if (!slot) return 0;
  if (isContractSlotClaimable(slot)) return 3;
  if (isContractSlotClaimed(slot)) return 2;
  const target = Number(slot.target || 0);
  const progress = Math.max(0, Number(slot.progress || 0));
  const ratio = target > 0 ? Math.min(0.999, progress / target) : 0;
  return 1 + ratio;
}

function mergeMatchingContractSlot(locSlot, cldSlot, preferCloud = false) {
  const claimed = isContractSlotClaimed(locSlot) || isContractSlotClaimed(cldSlot);
  const progress = Math.max(Number(locSlot.progress || 0), Number(cldSlot.progress || 0));
  const target = Math.max(Number(locSlot.target || 0), Number(cldSlot.target || 0));
  const claimable = !claimed && (
    isContractSlotClaimable(locSlot) ||
    isContractSlotClaimable(cldSlot) ||
    (target > 0 && progress >= target)
  );
  const status = claimed ? 'claimed' : (claimable ? 'claimable' : 'active');
  const base = preferCloud ? cldSlot : locSlot;

  return {
    ...deepClone(base),
    progress,
    target,
    claimed,
    status
  };
}

function pickPreferredContractSlot(locSlot, cldSlot, preferCloud = false) {
  const locScore = getContractSlotScore(locSlot);
  const cldScore = getContractSlotScore(cldSlot);
  if (locScore !== cldScore) {
    return deepClone(cldScore > locScore ? cldSlot : locSlot);
  }
  return deepClone(preferCloud ? cldSlot : locSlot);
}

function mergeSeenIds(localSeen = {}, cloudSeen = {}) {
  const merged = {};
  const allTiers = new Set([
    ...Object.keys(localSeen || {}),
    ...Object.keys(cloudSeen || {})
  ]);

  for (const tierKey of allTiers) {
    const locBucket = localSeen?.[tierKey];
    const cldBucket = cloudSeen?.[tierKey];
    if (Array.isArray(locBucket) || Array.isArray(cldBucket)) {
      merged[tierKey] = mergeSetUnion(
        Array.isArray(locBucket) ? locBucket : [],
        Array.isArray(cldBucket) ? cldBucket : []
      );
      continue;
    }

    const locObj = locBucket && typeof locBucket === 'object' ? locBucket : {};
    const cldObj = cldBucket && typeof cldBucket === 'object' ? cldBucket : {};
    const allFocuses = new Set([...Object.keys(locObj), ...Object.keys(cldObj)]);
    merged[tierKey] = {};
    for (const focus of allFocuses) {
      merged[tierKey][focus] = mergeSetUnion(
        Array.isArray(locObj[focus]) ? locObj[focus] : [],
        Array.isArray(cldObj[focus]) ? cldObj[focus] : []
      );
    }
  }

  return merged;
}

/**
 * Merges Daily and Career contract state monotonically and date-aware.
 * @param {object} localContracts
 * @param {object} cloudContracts
 * @param {boolean} [preferCloud=false]
 * @returns {object}
 */
export function mergeContracts(localContracts = {}, cloudContracts = {}, preferCloud = false) {
  const local = normalizeContracts(localContracts);
  const cloud = normalizeContracts(cloudContracts);

  // 1. Daily Contracts: keep latest UTC dateKey, or merge slots on matching dateKey
  let mergedDaily;
  const locDate = local.daily.dateKey || '';
  const cldDate = cloud.daily.dateKey || '';

  if (cldDate > locDate) {
    mergedDaily = deepClone(cloud.daily);
  } else if (locDate > cldDate) {
    mergedDaily = deepClone(local.daily);
  } else {
    const sweepClaimed = Boolean(local.daily.sweepClaimed || cloud.daily.sweepClaimed);
    let slots = [];
    if (local.daily.slots.length === 0) {
      slots = deepClone(cloud.daily.slots);
    } else if (cloud.daily.slots.length === 0) {
      slots = deepClone(local.daily.slots);
    } else {
      const count = Math.min(3, Math.max(local.daily.slots.length, cloud.daily.slots.length));
      for (let i = 0; i < count; i++) {
        const locSlot = local.daily.slots[i];
        const cldSlot = cloud.daily.slots[i];
        if (!locSlot && cldSlot) {
          slots.push(deepClone(cldSlot));
        } else if (locSlot && !cldSlot) {
          slots.push(deepClone(locSlot));
        } else if (locSlot && cldSlot) {
          const locId = getContractSlotId(locSlot);
          const cldId = getContractSlotId(cldSlot);
          if (locId && locId === cldId) {
            slots.push(mergeMatchingContractSlot(locSlot, cldSlot, preferCloud));
          } else {
            slots.push(pickPreferredContractSlot(locSlot, cldSlot, preferCloud));
          }
        }
      }
    }
    mergedDaily = {
      dateKey: locDate,
      slots,
      sweepClaimed
    };
  }

  // 2. Career Contracts: monotonic unlock & tier, lexicographic tierCompletions, and non-regressive slots
  const unlocked = Boolean(local.career.unlocked || cloud.career.unlocked);
  const seenIds = mergeSeenIds(local.career.seenIds, cloud.career.seenIds);

  let tier;
  let tierCompletions;
  let careerSlots;

  if (local.career.tier > cloud.career.tier) {
    tier = local.career.tier;
    tierCompletions = local.career.tierCompletions;
    careerSlots = deepClone(local.career.slots);
  } else if (cloud.career.tier > local.career.tier) {
    tier = cloud.career.tier;
    tierCompletions = cloud.career.tierCompletions;
    careerSlots = deepClone(cloud.career.slots);
  } else {
    tier = local.career.tier;
    tierCompletions = Math.max(local.career.tierCompletions, cloud.career.tierCompletions);
    careerSlots = [null, null, null];

    for (let i = 0; i < 3; i++) {
      const locSlot = local.career.slots[i];
      const cldSlot = cloud.career.slots[i];
      if (!locSlot && !cldSlot) {
        careerSlots[i] = null;
      } else if (!locSlot) {
        careerSlots[i] = deepClone(cldSlot);
      } else if (!cldSlot) {
        careerSlots[i] = deepClone(locSlot);
      } else {
        const locId = getContractSlotId(locSlot);
        const cldId = getContractSlotId(cldSlot);
        if (locId && locId === cldId) {
          careerSlots[i] = mergeMatchingContractSlot(locSlot, cldSlot, preferCloud);
        } else if (local.career.tierCompletions !== cloud.career.tierCompletions) {
          careerSlots[i] = deepClone(
            cloud.career.tierCompletions > local.career.tierCompletions ? cldSlot : locSlot
          );
        } else {
          careerSlots[i] = pickPreferredContractSlot(locSlot, cldSlot, preferCloud);
        }
      }
    }
  }

  return {
    daily: mergedDaily,
    career: {
      unlocked,
      tier,
      tierCompletions,
      seenIds,
      slots: careerSlots
    }
  };
}

/**
 * Monotonically merges combat telemetry statistics.
 * @param {object} localStats
 * @param {object} cloudStats
 * @returns {object}
 */
export function mergeTelemetry(localStats = {}, cloudStats = {}) {
  const loc = localStats || {};
  const cld = cloudStats || {};

  return {
    matchesPlayed: Math.max(Number(loc.matchesPlayed || 0), Number(cld.matchesPlayed || 0)),
    wins: Math.max(Number(loc.wins || 0), Number(cld.wins || 0)),
    losses: Math.max(Number(loc.losses || 0), Number(cld.losses || 0)),
    discsThrown: Math.max(Number(loc.discsThrown || 0), Number(cld.discsThrown || 0)),
    discsDeflected: Math.max(Number(loc.discsDeflected || 0), Number(cld.discsDeflected || 0)),
    tilesDestroyed: Math.max(Number(loc.tilesDestroyed || 0), Number(cld.tilesDestroyed || 0)),
    highestWave: Math.max(Number(loc.highestWave || 1), Number(cld.highestWave || 1)),
    swarmHighestWave: Math.max(
      Number(loc.swarmHighestWave || loc.highestWave || 1),
      Number(cld.swarmHighestWave || cld.highestWave || 1)
    ),
    hardcoreSwarmHighestWave: Math.max(
      Number(loc.hardcoreSwarmHighestWave || 0),
      Number(cld.hardcoreSwarmHighestWave || 0)
    ),
    highestScore: Math.max(Number(loc.highestScore || 0), Number(cld.highestScore || 0)),
    highestTier: Math.max(Number(loc.highestTier || 1), Number(cld.highestTier || 1)),
    totalScore: Math.max(Number(loc.totalScore || 0), Number(cld.totalScore || 0)),
    totalPlaytimeSec: Math.max(Number(loc.totalPlaytimeSec || 0), Number(cld.totalPlaytimeSec || 0)),
    totalDerezzes: Math.max(
      Number(loc.totalDerezzes ?? loc.totalDeallocations ?? 0),
      Number(cld.totalDerezzes ?? cld.totalDeallocations ?? 0)
    ),
    totalDeallocations: Math.max(
      Number(loc.totalDeallocations ?? loc.totalDerezzes ?? 0),
      Number(cld.totalDeallocations ?? cld.totalDerezzes ?? 0)
    ),
    parriesExecuted: Math.max(Number(loc.parriesExecuted || 0), Number(cld.parriesExecuted || 0)),
    curveEliminations: Math.max(Number(loc.curveEliminations || 0), Number(cld.curveEliminations || 0))
  };
}

/**
 * Validates that candidateState is strictly monotonic relative to baselineState.
 * Returns an array of violations (empty array if valid).
 * @param {object} candidate
 * @param {object} baseline
 * @param {string} baselineName ('Local' | 'Cloud')
 * @returns {string[]}
 */
export function evaluateMonotonicInvariants(candidate, baseline, baselineName = 'Baseline') {
  const violations = [];

  if (candidate.bits < baseline.bits) {
    violations.push(`Bits decreased: ${candidate.bits} < ${baselineName}.bits (${baseline.bits})`);
  }

  if (candidate.level < baseline.level) {
    violations.push(`Level decreased: ${candidate.level} < ${baselineName}.level (${baseline.level})`);
  }

  // Star mastery checks
  for (const [lvl, stars] of Object.entries(baseline.starMastery || {})) {
    const candidateStars = candidate.starMastery?.[lvl] || 0;
    if (candidateStars < stars) {
      violations.push(`StarMastery decreased on level ${lvl}: ${candidateStars} < ${baselineName}.stars (${stars})`);
    }
  }

  // Campaign progression checks
  if (baseline.campaign) {
    const baseStars = baseline.campaign.starsEarned || 0;
    const candStars = candidate.campaign?.starsEarned || 0;
    if (candStars < baseStars) {
      violations.push(`Campaign starsEarned decreased: ${candStars} < ${baselineName} (${baseStars})`);
    }

    // Campaign level records check
    for (const [lvl, rec] of Object.entries(baseline.campaign.levelRecords || {})) {
      const candRecStars = candidate.campaign?.levelRecords?.[lvl]?.stars || 0;
      if (candRecStars < rec.stars) {
        violations.push(`Campaign stars decreased on level ${lvl}: ${candRecStars} < ${baselineName} (${rec.stars})`);
      }
    }

    // Completed nodes check
    const candCompleted = new Set(candidate.campaign?.completedNodes || []);
    for (const node of (baseline.campaign.completedNodes || [])) {
      if (!candCompleted.has(node)) {
        violations.push(`Campaign completedNode missing: "${node}" was revoked from ${baselineName}`);
      }
    }

    // Unlocked nodes check
    const candUnlocked = new Set(candidate.campaign?.unlockedNodes || []);
    for (const node of (baseline.campaign.unlockedNodes || [])) {
      if (!candUnlocked.has(node)) {
        violations.push(`Campaign unlockedNode missing: "${node}" was revoked from ${baselineName}`);
      }
    }

    // Unlocked grids check
    const candGrids = new Set(candidate.campaign?.unlockedGrids || []);
    for (const grid of (baseline.campaign.unlockedGrids || [])) {
      if (!candGrids.has(grid)) {
        violations.push(`Campaign unlockedGrid missing: "${grid}" was revoked from ${baselineName}`);
      }
    }
  }

  // Inventory map unlocks check
  const candMaps = new Set(candidate.inventory?.unlockedMaps || []);
  for (const map of (baseline.inventory?.unlockedMaps || [])) {
    if (!candMaps.has(map)) {
      violations.push(`Arena map missing: "${map}" was revoked from ${baselineName}`);
    }
  }

  // Inventory discs check
  const candDiscs = new Set(candidate.inventory?.discs || (Array.isArray(candidate.inventory) ? candidate.inventory : []));
  const baseDiscs = baseline.inventory?.discs || (Array.isArray(baseline.inventory) ? baseline.inventory.filter(i => String(i).startsWith('disc_')) : []);
  for (const disc of baseDiscs) {
    if (!candDiscs.has(disc)) {
      violations.push(`Inventory disc missing: "${disc}" was revoked from ${baselineName}`);
    }
  }

  // Inventory cosmetics check
  const candCosmetics = new Set(candidate.inventory?.cosmetics || []);
  for (const cosmetic of (baseline.inventory?.cosmetics || [])) {
    if (!candCosmetics.has(cosmetic)) {
      violations.push(`Cosmetic item missing: "${cosmetic}" was revoked from ${baselineName}`);
    }
  }

  // Achievements set inclusion checks
  const candidateAchievements = new Set(candidate.achievements || []);
  for (const ach of (baseline.achievements || [])) {
    if (!candidateAchievements.has(ach)) {
      violations.push(`Achievement missing: "${ach}" was revoked from ${baselineName}`);
    }
  }

  // Cumulative stats checks
  if (candidate.stats.matchesPlayed < baseline.stats.matchesPlayed) {
    violations.push(`Matches played decreased: ${candidate.stats.matchesPlayed} < ${baselineName} (${baseline.stats.matchesPlayed})`);
  }
  if (candidate.stats.wins < baseline.stats.wins) {
    violations.push(`Wins decreased: ${candidate.stats.wins} < ${baselineName} (${baseline.stats.wins})`);
  }
  if (candidate.stats.highestWave < baseline.stats.highestWave) {
    violations.push(`Highest wave decreased: ${candidate.stats.highestWave} < ${baselineName} (${baseline.stats.highestWave})`);
  }
  if ((candidate.stats.hardcoreSwarmHighestWave || 0) < (baseline.stats.hardcoreSwarmHighestWave || 0)) {
    violations.push(`Hardcore swarm highest wave decreased: ${candidate.stats.hardcoreSwarmHighestWave || 0} < ${baselineName} (${baseline.stats.hardcoreSwarmHighestWave || 0})`);
  }
  if (candidate.stats.highestTier < baseline.stats.highestTier) {
    violations.push(`Highest tier decreased: ${candidate.stats.highestTier} < ${baselineName} (${baseline.stats.highestTier})`);
  }
  if (candidate.stats.totalScore < baseline.stats.totalScore) {
    violations.push(`Total score decreased: ${candidate.stats.totalScore} < ${baselineName} (${baseline.stats.totalScore})`);
  }
  if (candidate.stats.totalDerezzes < baseline.stats.totalDerezzes) {
    violations.push(`Total derezzes decreased: ${candidate.stats.totalDerezzes} < ${baselineName} (${baseline.stats.totalDerezzes})`);
  }
  if (candidate.stats.parriesExecuted < baseline.stats.parriesExecuted) {
    violations.push(`Parries executed decreased: ${candidate.stats.parriesExecuted} < ${baselineName} (${baseline.stats.parriesExecuted})`);
  }
  if (candidate.stats.curveEliminations < baseline.stats.curveEliminations) {
    violations.push(`Curve eliminations decreased: ${candidate.stats.curveEliminations} < ${baselineName} (${baseline.stats.curveEliminations})`);
  }

  // Contracts monotonic checks
  if (baseline.contracts?.career) {
    const baseCareer = baseline.contracts.career;
    const candCareer = candidate.contracts?.career || {};
    if (baseCareer.unlocked && !candCareer.unlocked) {
      violations.push(`Career contracts unlocked flag was revoked from ${baselineName}`);
    }
    const baseTier = baseCareer.tier || 1;
    const candTier = candCareer.tier || 1;
    if (candTier < baseTier) {
      violations.push(`Career contract tier decreased: ${candTier} < ${baselineName} (${baseTier})`);
    } else if (candTier === baseTier && (candCareer.tierCompletions || 0) < (baseCareer.tierCompletions || 0)) {
      violations.push(`Career tierCompletions decreased: ${candCareer.tierCompletions || 0} < ${baselineName} (${baseCareer.tierCompletions || 0})`);
    }
  }

  if (baseline.contracts?.daily && candidate.contracts?.daily) {
    const baseDaily = baseline.contracts.daily;
    const candDaily = candidate.contracts.daily;
    if (baseDaily.dateKey && candDaily.dateKey && candDaily.dateKey < baseDaily.dateKey) {
      violations.push(`Daily contracts dateKey regressed: ${candDaily.dateKey} < ${baselineName} (${baseDaily.dateKey})`);
    } else if (baseDaily.dateKey === candDaily.dateKey) {
      if (baseDaily.sweepClaimed && !candDaily.sweepClaimed) {
        violations.push(`Daily sweepClaimed was revoked from ${baselineName}`);
      }
      const candById = new Map(
        (candDaily.slots || [])
          .filter(Boolean)
          .map((slot) => [getContractSlotId(slot), slot])
      );
      for (const baseSlot of (baseDaily.slots || [])) {
        const id = getContractSlotId(baseSlot);
        const candSlot = id ? candById.get(id) : null;
        if (candSlot && Number(candSlot.progress || 0) < Number(baseSlot.progress || 0)) {
          violations.push(`Daily contract progress decreased for "${id}": ${candSlot.progress} < ${baselineName} (${baseSlot.progress})`);
        }
      }
    }
  }

  return violations;
}

/**
 * CloudSyncResolver - Executes the Master Grid Protocol merge.
 */
export class CloudSyncResolver {
  /**
   * Merges local and cloud save states using monotonic rules.
   * @param {object|null} localInput
   * @param {object|null} cloudInput
   * @returns {object} The resolved merged state
   */
  static resolve(localInput, cloudInput) {
    if (!localInput && !cloudInput) {
      return normalizeSaveState({});
    }
    if (!localInput) return normalizeSaveState(cloudInput);
    if (!cloudInput) return normalizeSaveState(localInput);

    const local = normalizeSaveState(localInput);
    const cloud = normalizeSaveState(cloudInput);

    // Master Grid Protocol:
    // Bits = max(Local, Cloud)
    const mergedBits = Math.max(local.bits, cloud.bits);

    // Level = max(Local, Cloud)
    const mergedLevel = Math.max(local.level, cloud.level);

    // Campaign = Monotonic Level Records, Stars, Grids & Nodes Set Unions
    const mergedCampaign = mergeCampaign(local.campaign, cloud.campaign);

    // StarMastery = max(Local, Cloud) per level, updated with Campaign level records
    const mergedStarMastery = mergeStarMastery(local.starMastery, cloud.starMastery);
    for (const [lvlId, rec] of Object.entries(mergedCampaign.levelRecords)) {
      if (rec.stars > (mergedStarMastery[lvlId] || 0)) {
        mergedStarMastery[lvlId] = rec.stars;
      }
    }

    // Inventory = Structured Set Unions for Discs, Cosmetics, Maps, Consumables Max
    const mergedInventory = mergeInventory(local.inventory, cloud.inventory);

    // Achievements = Local ∪ Cloud
    const mergedAchievements = mergeSetUnion(local.achievements, cloud.achievements);

    // Stats = max across all cumulative combat and match fields
    const mergedStats = mergeTelemetry(local.stats, cloud.stats);

    // Settings, Loadout & Handle: Most recent active tab/session takes precedence
    const preferCloudMeta = (cloud.lastActiveAt || 0) > (local.lastActiveAt || 0);
    const resolvedHandle = preferCloudMeta && cloud.handle && cloud.handle !== 'PROGRAM'
      ? cloud.handle
      : (local.handle || cloud.handle || 'PROGRAM');

    const resolvedSettings = preferCloudMeta
      ? { ...local.settings, ...cloud.settings }
      : { ...cloud.settings, ...local.settings };

    const resolvedLoadout = resolveLoadout(local.loadout, cloud.loadout, preferCloudMeta, mergedInventory);

    // Contracts = Date-aware Daily + Monotonic Career merge
    const mergedContracts = mergeContracts(local.contracts, cloud.contracts, preferCloudMeta);

    const resolved = {
      version: Math.max(local.version, cloud.version),
      userId: local.userId || cloud.userId,
      handle: resolvedHandle,
      calibration_completed: Boolean(local.calibration_completed || cloud.calibration_completed),
      calibration_bypassed: Boolean(local.calibration_bypassed || cloud.calibration_bypassed),
      createdAt: Math.min(local.createdAt || Date.now(), cloud.createdAt || Date.now()),
      lastActiveAt: Math.max(local.lastActiveAt || 0, cloud.lastActiveAt || 0, Date.now()),
      bits: mergedBits,
      level: mergedLevel,
      starMastery: mergedStarMastery,
      campaign: mergedCampaign,
      inventory: mergedInventory,
      loadout: resolvedLoadout,
      contracts: mergedContracts,
      achievements: mergedAchievements,
      stats: mergedStats,
      settings: resolvedSettings
    };

    // Strictly enforce non-decreasing invariant verification
    const localViolations = evaluateMonotonicInvariants(resolved, local, 'Local');
    const cloudViolations = evaluateMonotonicInvariants(resolved, cloud, 'Cloud');
    const allViolations = [...localViolations, ...cloudViolations];

    if (allViolations.length > 0) {
      throw new Error(`Master Grid Protocol Invariant Violation: ${allViolations.join('; ')}`);
    }

    return resolved;
  }
}

/**
 * Maps camelCase TronSaveState to Postgres snake_case save_states table row.
 * Handles campaign, loadout, and structured inventory.
 * @param {object} saveState
 * @returns {object}
 */
export function saveStateToRow(saveState) {
  if (!saveState) return null;
  const normalized = normalizeSaveState(saveState);
  return {
    user_id: normalized.userId,
    handle: normalized.handle,
    calibration_completed: normalized.calibration_completed,
    calibration_bypassed: normalized.calibration_bypassed,
    bits: normalized.bits,
    level: normalized.level,
    star_mastery: normalized.starMastery,
    inventory: normalized.inventory,
    achievements: normalized.achievements,
    stats: normalized.stats,
    settings: normalized.settings,
    campaign: normalized.campaign,
    loadout: normalized.loadout,
    contracts: normalized.contracts,
    created_at: new Date(normalized.createdAt || Date.now()).toISOString(),
    last_active_at: new Date(normalized.lastActiveAt || Date.now()).toISOString(),
    version: normalized.version
  };
}

/**
 * Maps Postgres snake_case save_states table row to camelCase TronSaveState.
 * Translates legacy rows (string-array inventory, missing campaign, missing loadout) safely.
 * @param {object} row
 * @returns {object}
 */
export function rowToSaveState(row) {
  if (!row) return null;

  let inventory = row.inventory;
  if (Array.isArray(inventory)) {
    inventory = {
      discs: inventory.filter(i => String(i).startsWith('disc_')),
      cosmetics: inventory.filter(i => !String(i).startsWith('disc_')),
      consumables: {},
      unlockedMaps: ['arena_grid_01']
    };
    if (inventory.discs.length === 0) {
      inventory.discs = ['disc_default'];
    }
  }

  let campaign = row.campaign;
  if (!campaign || typeof campaign !== 'object' || Object.keys(campaign).length === 0) {
    campaign = {
      completedNodes: [],
      unlockedNodes: ['level_01_01'],
      unlockedGrids: ['grid_01'],
      starsEarned: 0,
      levelRecords: {}
    };
  }

  let loadout = row.loadout;
  if (!loadout || typeof loadout !== 'object' || Object.keys(loadout).length === 0) {
    loadout = { ...DEFAULT_LOADOUT };
  }

  return normalizeSaveState({
    userId: row.user_id,
    handle: row.handle || 'PROGRAM',
    calibration_completed: Boolean(row.calibration_completed),
    calibration_bypassed: Boolean(row.calibration_bypassed),
    bits: Number(row.bits || 0),
    level: Number(row.level || 1),
    starMastery: typeof row.star_mastery === 'object' && row.star_mastery !== null ? row.star_mastery : {},
    inventory,
    campaign,
    loadout,
    contracts: typeof row.contracts === 'object' && row.contracts !== null ? row.contracts : undefined,
    achievements: Array.isArray(row.achievements) ? row.achievements : [],
    stats: typeof row.stats === 'object' && row.stats !== null ? row.stats : {},
    settings: typeof row.settings === 'object' && row.settings !== null ? row.settings : {},
    createdAt: row.created_at ? new Date(row.created_at).getTime() : Date.now(),
    lastActiveAt: row.last_active_at ? new Date(row.last_active_at).getTime() : Date.now(),
    version: Number(row.version || 1)
  });
}

/**
 * Fetches remote save state for a user from Supabase save_states table.
 * @param {string} userId
 * @param {object} client Supabase client instance
 * @returns {Promise<object|null>}
 */
export async function fetchRemoteSaveState(userId, client) {
  if (!client || typeof client.from !== 'function' || !userId) return null;
  try {
    const { data, error } = await client
      .from('save_states')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      console.warn('CloudSyncResolver: fetchRemoteSaveState error:', error);
      return null;
    }
    if (!data) return null;
    return rowToSaveState(data);
  } catch (err) {
    console.warn('CloudSyncResolver: fetchRemoteSaveState exception:', err);
    return null;
  }
}

/**
 * Upserts a save state into Supabase save_states table.
 * @param {object} saveState
 * @param {object} client Supabase client instance
 * @returns {Promise<object|null>}
 */
export async function upsertRemoteSaveState(saveState, client) {
  if (!client || typeof client.from !== 'function' || !saveState) return null;
  const row = saveStateToRow(saveState);
  if (!row || !row.user_id) return null;
  const { data, error } = await client
    .from('save_states')
    .upsert(row, { onConflict: 'user_id' })
    .select()
    .maybeSingle();

  if (error) {
    console.warn('CloudSyncResolver: upsertRemoteSaveState error:', error);
    throw error;
  }
  return data ? rowToSaveState(data) : rowToSaveState(row);
}

CloudSyncResolver.saveStateToRow = saveStateToRow;
CloudSyncResolver.rowToSaveState = rowToSaveState;
CloudSyncResolver.fetchRemote = fetchRemoteSaveState;
CloudSyncResolver.upsertRemote = upsertRemoteSaveState;
CloudSyncResolver.normalizeInventory = normalizeInventory;
CloudSyncResolver.normalizeCampaign = normalizeCampaign;
CloudSyncResolver.normalizeLoadout = normalizeLoadout;
CloudSyncResolver.normalizeContracts = normalizeContracts;
CloudSyncResolver.mergeInventory = mergeInventory;
CloudSyncResolver.mergeCampaign = mergeCampaign;
CloudSyncResolver.mergeContracts = mergeContracts;
CloudSyncResolver.resolveLoadout = resolveLoadout;
CloudSyncResolver.mergeTelemetry = mergeTelemetry;
