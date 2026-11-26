/**
 * schema.js
 * Core state schema definitions, constants, validation guards,
 * and immutable default state factory for Tron Disc Arena (SPEC-ECON-001 v1.0.0).
 */

export const SAVE_STATE_VERSION = '1.0.0';
export const STORAGE_KEY = 'tron_save_state';
export const STORAGE_BACKUP_KEY = 'tron_save_state.bak';
export const STORAGE_CHANNEL = 'tron_grid_storage_sync';

export const StorageEvents = Object.freeze({
  INITIALIZED: 'STORAGE_INITIALIZED',
  SAVED: 'STORAGE_SAVED',
  CORRUPTED: 'STORAGE_CORRUPTED',
  MUTATED: 'STORAGE_MUTATED'
});

/**
 * Deep clones an object safely across Node.js and browser environments.
 * @template T
 * @param {T} obj
 * @returns {T}
 */
export function deepClone(obj) {
  if (typeof structuredClone === 'function') {
    try {
      return structuredClone(obj);
    } catch (_) {}
  }
  return JSON.parse(JSON.stringify(obj));
}

function normalizeSeenIdsMap(rawSeenIds) {
  if (!rawSeenIds || typeof rawSeenIds !== 'object' || Array.isArray(rawSeenIds)) {
    return {};
  }
  const normalized = {};
  for (const [tierKey, bucket] of Object.entries(rawSeenIds)) {
    if (Array.isArray(bucket)) {
      normalized[tierKey] = Array.from(new Set(bucket.map(String)));
    } else if (bucket && typeof bucket === 'object') {
      normalized[tierKey] = {};
      for (const [focus, ids] of Object.entries(bucket)) {
        normalized[tierKey][focus] = Array.isArray(ids) ? Array.from(new Set(ids.map(String))) : [];
      }
    }
  }
  return normalized;
}

function normalizeCareerSlotsArray(rawSlots) {
  const result = [null, null, null];
  if (!Array.isArray(rawSlots)) {
    return result;
  }
  for (let i = 0; i < 3; i++) {
    const slot = rawSlots[i];
    result[i] = slot && typeof slot === 'object' ? deepClone(slot) : null;
  }
  return result;
}

/**
 * Creates a fresh default contracts state branch.
 * @returns {{ daily: { dateKey: string, slots: Array, sweepClaimed: boolean }, career: { unlocked: boolean, tier: number, tierCompletions: number, seenIds: object, slots: Array } }}
 */
export function createDefaultContractsState() {
  return {
    daily: {
      dateKey: '',
      slots: [],
      sweepClaimed: false
    },
    career: {
      unlocked: false,
      tier: 1,
      tierCompletions: 0,
      seenIds: {},
      slots: [null, null, null]
    }
  };
}

/**
 * Normalizes a partial or legacy contracts object into the canonical structure.
 * @param {any} raw
 * @returns {{ daily: { dateKey: string, slots: Array, sweepClaimed: boolean }, career: { unlocked: boolean, tier: number, tierCompletions: number, seenIds: object, slots: Array } }}
 */
export function normalizeContractsState(raw = {}) {
  const obj = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
  const rawDaily = obj.daily && typeof obj.daily === 'object' && !Array.isArray(obj.daily) ? obj.daily : {};
  const rawCareer = obj.career && typeof obj.career === 'object' && !Array.isArray(obj.career) ? obj.career : {};

  const parsedTier = Number(rawCareer.tier);
  const tier = Number.isFinite(parsedTier) && parsedTier >= 1 ? Math.floor(parsedTier) : 1;

  const parsedCompletions = Number(rawCareer.tierCompletions);
  const tierCompletions = Number.isFinite(parsedCompletions) && parsedCompletions >= 0 ? Math.floor(parsedCompletions) : 0;

  return {
    daily: {
      dateKey: typeof rawDaily.dateKey === 'string' ? rawDaily.dateKey : '',
      slots: Array.isArray(rawDaily.slots)
        ? deepClone(rawDaily.slots.slice(0, 3)).filter((s) => s && typeof s === 'object')
        : [],
      sweepClaimed: Boolean(rawDaily.sweepClaimed)
    },
    career: {
      unlocked: Boolean(rawCareer.unlocked),
      tier,
      tierCompletions,
      seenIds: normalizeSeenIdsMap(rawCareer.seenIds),
      slots: normalizeCareerSlotsArray(rawCareer.slots)
    }
  };
}

/**
 * Populates missing contracts subfields on a parsed save state without masking invalid types.
 * @param {any} raw
 * @returns {any}
 */
export function ensureContractsDefaults(raw) {
  if (raw === undefined) {
    return createDefaultContractsState();
  }
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return raw;
  }

  const next = deepClone(raw);
  const defaults = createDefaultContractsState();

  if (next.daily === undefined) {
    next.daily = defaults.daily;
  } else if (next.daily && typeof next.daily === 'object' && !Array.isArray(next.daily)) {
    if (next.daily.dateKey === undefined) next.daily.dateKey = defaults.daily.dateKey;
    if (next.daily.slots === undefined) next.daily.slots = defaults.daily.slots;
    if (next.daily.sweepClaimed === undefined) next.daily.sweepClaimed = defaults.daily.sweepClaimed;
  }

  if (next.career === undefined) {
    next.career = defaults.career;
  } else if (next.career && typeof next.career === 'object' && !Array.isArray(next.career)) {
    if (next.career.unlocked === undefined) next.career.unlocked = defaults.career.unlocked;
    if (next.career.tier === undefined) next.career.tier = defaults.career.tier;
    if (next.career.tierCompletions === undefined) next.career.tierCompletions = defaults.career.tierCompletions;
    if (next.career.seenIds === undefined) next.career.seenIds = defaults.career.seenIds;
    if (next.career.slots === undefined) {
      next.career.slots = defaults.career.slots;
    } else if (Array.isArray(next.career.slots)) {
      while (next.career.slots.length < 3) {
        next.career.slots.push(null);
      }
    }
  }

  return next;
}

/**
 * Creates a fresh default apexTrials state branch.
 * @returns {{ cycles: Record<string, { freeTicketUsed: boolean, attempts: number, bestAR: number, claimed: boolean }> }}
 */
export function createDefaultApexTrialsState() {
  return {
    cycles: {}
  };
}

/**
 * Normalizes a partial or legacy apexTrials object into the canonical structure.
 * @param {any} raw
 * @returns {{ cycles: Record<string, { freeTicketUsed: boolean, attempts: number, bestAR: number, claimed: boolean }> }}
 */
export function normalizeApexTrialsState(raw = {}) {
  const obj = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
  const rawCycles = obj.cycles && typeof obj.cycles === 'object' && !Array.isArray(obj.cycles) ? obj.cycles : {};
  const cycles = {};

  for (const [cycleId, entry] of Object.entries(rawCycles)) {
    if (!cycleId || !entry || typeof entry !== 'object' || Array.isArray(entry)) continue;
    const parsedAttempts = Number(entry.attempts);
    const parsedBestAR = Number(entry.bestAR);
    cycles[String(cycleId)] = {
      freeTicketUsed: Boolean(entry.freeTicketUsed),
      attempts: Number.isFinite(parsedAttempts) && parsedAttempts >= 0 ? Math.floor(parsedAttempts) : 0,
      bestAR: Number.isFinite(parsedBestAR) && parsedBestAR >= 0 ? parsedBestAR : 0,
      claimed: Boolean(entry.claimed)
    };
  }

  return { cycles };
}

/**
 * Populates missing apexTrials subfields on a parsed save state without masking invalid types.
 * @param {any} raw
 * @returns {any}
 */
export function ensureApexTrialsDefaults(raw) {
  if (raw === undefined) {
    return createDefaultApexTrialsState();
  }
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return raw;
  }

  const next = deepClone(raw);
  if (next.cycles === undefined) {
    next.cycles = {};
  } else if (next.cycles && typeof next.cycles === 'object' && !Array.isArray(next.cycles)) {
    for (const [cycleId, entry] of Object.entries(next.cycles)) {
      if (entry && typeof entry === 'object' && !Array.isArray(entry)) {
        if (entry.freeTicketUsed === undefined) entry.freeTicketUsed = false;
        if (entry.attempts === undefined) entry.attempts = 0;
        if (entry.bestAR === undefined) entry.bestAR = 0;
        if (entry.claimed === undefined) entry.claimed = false;
      }
    }
  }
  return next;
}

/**
 * Default frozen reference baseline for TronSaveState v1.0.0
 */
export const DEFAULT_SAVE_STATE = Object.freeze({
  version: SAVE_STATE_VERSION,
  createdAt: 0,
  updatedAt: 0,
  calibration_completed: false,
  calibration_bypassed: false,
  player: Object.freeze({
    id: 'user_anonymous',
    handle: 'USER_PROGRAM',
    level: 1,
    xp: 0,
    titles: Object.freeze([]),
    equippedTitle: null,
    currency: Object.freeze({
      bits: 0,
      credits: 0,
      sparks: 0
    })
  }),
  loadout: Object.freeze({
    activeDisc: 'disc_identity_default',
    activeTrail: 'trail_cyan_default',
    activeVisor: 'visor_classic',
    activeArenaSkin: 'grid_default',
    audioTheme: 'synthwave_82'
  }),
  campaign: Object.freeze({
    completedNodes: Object.freeze([]),
    unlockedNodes: Object.freeze(['node_01']),
    currentNode: 'node_01',
    starsEarned: 0,
    chapter: 1
  }),
  inventory: Object.freeze({
    discs: Object.freeze(['disc_identity_default']),
    cosmetics: Object.freeze(['trail_cyan_default', 'visor_classic']),
    consumables: Object.freeze({}),
    unlockedMaps: Object.freeze(['arena_grid_01'])
  }),
  achievements: Object.freeze([]),
  apexTrials: Object.freeze({
    cycles: Object.freeze({})
  }),
  contracts: Object.freeze({
    daily: Object.freeze({
      dateKey: '',
      slots: Object.freeze([]),
      sweepClaimed: false
    }),
    career: Object.freeze({
      unlocked: false,
      tier: 1,
      tierCompletions: 0,
      seenIds: Object.freeze({}),
      slots: Object.freeze([null, null, null])
    })
  }),
  stats: Object.freeze({
    matchesPlayed: 0,
    wins: 0,
    losses: 0,
    discsThrown: 0,
    discsDeflected: 0,
    tilesDestroyed: 0,
    highestWave: 1,
    swarmHighestWave: 1,
    swarmMaxWave: 1,
    hardcoreSwarmHighestWave: 0,
    highestScore: 0,
    totalPlaytimeSec: 0,
    totalDerezzes: 0,
    totalDeallocations: 0,
    parriesExecuted: 0,
    curveEliminations: 0
  })
});

/**
 * Creates an immutable, deep-cloned default TronSaveState instance.
 * @param {object} [overrides={}] Optional partial state overrides
 * @returns {object} A completely decoupled TronSaveState v1.0.0 object
 */
export function createDefaultSaveState(overrides = {}) {
  const now = Date.now();
  const base = {
    version: SAVE_STATE_VERSION,
    createdAt: now,
    updatedAt: now,
    calibration_completed: overrides?.calibration_completed ?? false,
    calibration_bypassed: overrides?.calibration_bypassed ?? false,
    player: {
      id: overrides?.player?.id || (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `usr_${Math.random().toString(36).substring(2, 9)}`),
      handle: overrides?.player?.handle || 'USER_PROGRAM',
      level: overrides?.player?.level ?? 1,
      xp: overrides?.player?.xp ?? 0,
      titles: Array.isArray(overrides?.player?.titles)
        ? Array.from(new Set(overrides.player.titles.map(String).filter(Boolean)))
        : [],
      equippedTitle: typeof overrides?.player?.equippedTitle === 'string' && overrides.player.equippedTitle
        ? overrides.player.equippedTitle
        : null,
      currency: {
        bits: overrides?.player?.currency?.credits ?? overrides?.player?.currency?.bits ?? 0,
        credits: overrides?.player?.currency?.credits ?? overrides?.player?.currency?.bits ?? 0,
        sparks: overrides?.player?.currency?.sparks ?? 0
      }
    },
    loadout: {
      activeDisc: overrides?.loadout?.activeDisc || 'disc_identity_default',
      activeTrail: overrides?.loadout?.activeTrail || 'trail_cyan_default',
      activeVisor: overrides?.loadout?.activeVisor || 'visor_classic',
      activeArenaSkin: overrides?.loadout?.activeArenaSkin || 'grid_default',
      audioTheme: overrides?.loadout?.audioTheme || 'synthwave_82'
    },
    campaign: {
      completedNodes: Array.isArray(overrides?.campaign?.completedNodes) ? [...overrides.campaign.completedNodes] : [],
      unlockedNodes: Array.isArray(overrides?.campaign?.unlockedNodes) ? [...overrides.campaign.unlockedNodes] : ['node_01'],
      currentNode: overrides?.campaign?.currentNode || 'node_01',
      starsEarned: overrides?.campaign?.starsEarned ?? 0,
      chapter: overrides?.campaign?.chapter ?? 1
    },
    inventory: {
      discs: Array.isArray(overrides?.inventory?.discs) ? [...overrides.inventory.discs] : ['disc_identity_default'],
      cosmetics: Array.isArray(overrides?.inventory?.cosmetics) ? [...overrides.inventory.cosmetics] : ['trail_cyan_default', 'visor_classic'],
      consumables: overrides?.inventory?.consumables ? { ...overrides.inventory.consumables } : {},
      unlockedMaps: Array.isArray(overrides?.inventory?.unlockedMaps) ? [...overrides.inventory.unlockedMaps] : ['arena_grid_01']
    },
    achievements: Array.isArray(overrides?.achievements) ? deepClone(overrides.achievements) : [],
    apexTrials: normalizeApexTrialsState(overrides?.apexTrials),
    contracts: normalizeContractsState(overrides?.contracts),
    stats: {
      matchesPlayed: overrides?.stats?.matchesPlayed ?? 0,
      wins: overrides?.stats?.wins ?? 0,
      losses: overrides?.stats?.losses ?? 0,
      discsThrown: overrides?.stats?.discsThrown ?? 0,
      discsDeflected: overrides?.stats?.discsDeflected ?? 0,
      tilesDestroyed: overrides?.stats?.tilesDestroyed ?? 0,
      highestWave: overrides?.stats?.highestWave ?? overrides?.stats?.swarmHighestWave ?? overrides?.stats?.swarmMaxWave ?? 1,
      swarmHighestWave: overrides?.stats?.swarmHighestWave ?? overrides?.stats?.highestWave ?? overrides?.stats?.swarmMaxWave ?? 1,
      swarmMaxWave: overrides?.stats?.swarmMaxWave ?? overrides?.stats?.swarmHighestWave ?? overrides?.stats?.highestWave ?? 1,
      hardcoreSwarmHighestWave: overrides?.stats?.hardcoreSwarmHighestWave ?? 0,
      highestScore: overrides?.stats?.highestScore ?? 0,
      totalPlaytimeSec: overrides?.stats?.totalPlaytimeSec ?? 0,
      totalDerezzes: overrides?.stats?.totalDeallocations ?? overrides?.stats?.totalDerezzes ?? 0,
      totalDeallocations: overrides?.stats?.totalDeallocations ?? overrides?.stats?.totalDerezzes ?? 0,
      parriesExecuted: overrides?.stats?.parriesExecuted ?? 0,
      curveEliminations: overrides?.stats?.curveEliminations ?? 0
    }
  };

  return deepClone(base);
}

/**
 * Fast boolean validation check for TronSaveState structure.
 * @param {any} data
 * @returns {boolean}
 */
export function isValidSaveState(data) {
  if (!data || typeof data !== 'object') return false;
  if (typeof data.version !== 'string') return false;
  if (!data.player || typeof data.player !== 'object') return false;
  if (typeof data.player.id !== 'string') return false;
  if (typeof data.player.handle !== 'string') return false;
  if (!data.loadout || typeof data.loadout !== 'object') return false;
  if (!data.campaign || typeof data.campaign !== 'object') return false;
  if (!data.inventory || typeof data.inventory !== 'object') return false;
  if (!Array.isArray(data.achievements)) return false;
  if (data.player.titles !== undefined && !Array.isArray(data.player.titles)) return false;
  if (data.apexTrials !== undefined && (!data.apexTrials || typeof data.apexTrials !== 'object' || Array.isArray(data.apexTrials))) {
    return false;
  }
  if (data.contracts !== undefined && (!data.contracts || typeof data.contracts !== 'object' || Array.isArray(data.contracts))) {
    return false;
  }
  if (!data.stats || typeof data.stats !== 'object') return false;
  return true;
}

/**
 * Detailed validation report for debugging and data integrity enforcement.
 * @param {any} data
 * @returns {{ valid: boolean, errors: string[] }}
 */
export function validateSaveState(data) {
  const errors = [];
  if (!data || typeof data !== 'object') {
    return { valid: false, errors: ['Save state must be a non-null object'] };
  }
  if (!data.version || typeof data.version !== 'string') {
    errors.push('Missing or invalid "version" string');
  }
  if (!data.player || typeof data.player !== 'object') {
    errors.push('Missing or invalid "player" object');
  } else {
    if (typeof data.player.id !== 'string') errors.push('"player.id" must be a string');
    if (typeof data.player.handle !== 'string') errors.push('"player.handle" must be a string');
    if (typeof data.player.level !== 'number') errors.push('"player.level" must be a number');
    if (data.player.titles !== undefined && !Array.isArray(data.player.titles)) {
      errors.push('"player.titles" must be an array');
    }
    if (data.player.equippedTitle !== undefined && data.player.equippedTitle !== null && typeof data.player.equippedTitle !== 'string') {
      errors.push('"player.equippedTitle" must be a string or null');
    }
    if (data.player.currency && typeof data.player.currency !== 'object') {
      errors.push('"player.currency" must be an object');
    }
  }
  if (!data.loadout || typeof data.loadout !== 'object') errors.push('Missing or invalid "loadout" object');
  if (!data.campaign || typeof data.campaign !== 'object') errors.push('Missing or invalid "campaign" object');
  if (!data.inventory || typeof data.inventory !== 'object') {
    errors.push('Missing or invalid "inventory" object');
  } else if (data.inventory.unlockedMaps && !Array.isArray(data.inventory.unlockedMaps)) {
    errors.push('"inventory.unlockedMaps" must be an array');
  }
  if (!Array.isArray(data.achievements)) errors.push('Missing or invalid "achievements" array');
  if (data.apexTrials !== undefined) {
    if (!data.apexTrials || typeof data.apexTrials !== 'object' || Array.isArray(data.apexTrials)) {
      errors.push('"apexTrials" must be a non-null object');
    } else if (data.apexTrials.cycles !== undefined) {
      if (!data.apexTrials.cycles || typeof data.apexTrials.cycles !== 'object' || Array.isArray(data.apexTrials.cycles)) {
        errors.push('"apexTrials.cycles" must be an object');
      } else {
        for (const [cycleId, entry] of Object.entries(data.apexTrials.cycles)) {
          if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
            errors.push(`"apexTrials.cycles.${cycleId}" must be an object`);
          } else {
            if (entry.freeTicketUsed !== undefined && typeof entry.freeTicketUsed !== 'boolean') {
              errors.push(`"apexTrials.cycles.${cycleId}.freeTicketUsed" must be a boolean`);
            }
            if (entry.attempts !== undefined && (typeof entry.attempts !== 'number' || !Number.isFinite(entry.attempts) || entry.attempts < 0)) {
              errors.push(`"apexTrials.cycles.${cycleId}.attempts" must be a number >= 0`);
            }
            if (entry.bestAR !== undefined && (typeof entry.bestAR !== 'number' || !Number.isFinite(entry.bestAR) || entry.bestAR < 0)) {
              errors.push(`"apexTrials.cycles.${cycleId}.bestAR" must be a number >= 0`);
            }
            if (entry.claimed !== undefined && typeof entry.claimed !== 'boolean') {
              errors.push(`"apexTrials.cycles.${cycleId}.claimed" must be a boolean`);
            }
          }
        }
      }
    }
  }
  if (data.contracts !== undefined) {
    if (!data.contracts || typeof data.contracts !== 'object' || Array.isArray(data.contracts)) {
      errors.push('"contracts" must be a non-null object');
    } else {
      const { daily, career } = data.contracts;
      if (daily !== undefined) {
        if (!daily || typeof daily !== 'object' || Array.isArray(daily)) {
          errors.push('"contracts.daily" must be an object');
        } else {
          if (daily.dateKey !== undefined && typeof daily.dateKey !== 'string') {
            errors.push('"contracts.daily.dateKey" must be a string');
          }
          if (daily.slots !== undefined && !Array.isArray(daily.slots)) {
            errors.push('"contracts.daily.slots" must be an array');
          }
          if (daily.sweepClaimed !== undefined && typeof daily.sweepClaimed !== 'boolean') {
            errors.push('"contracts.daily.sweepClaimed" must be a boolean');
          }
        }
      }
      if (career !== undefined) {
        if (!career || typeof career !== 'object' || Array.isArray(career)) {
          errors.push('"contracts.career" must be an object');
        } else {
          if (career.unlocked !== undefined && typeof career.unlocked !== 'boolean') {
            errors.push('"contracts.career.unlocked" must be a boolean');
          }
          if (career.tier !== undefined && (typeof career.tier !== 'number' || !Number.isFinite(career.tier) || career.tier < 1)) {
            errors.push('"contracts.career.tier" must be a number >= 1');
          }
          if (career.tierCompletions !== undefined && (typeof career.tierCompletions !== 'number' || !Number.isFinite(career.tierCompletions) || career.tierCompletions < 0)) {
            errors.push('"contracts.career.tierCompletions" must be a number >= 0');
          }
          if (career.seenIds !== undefined && (!career.seenIds || typeof career.seenIds !== 'object' || Array.isArray(career.seenIds))) {
            errors.push('"contracts.career.seenIds" must be an object');
          }
          if (career.slots !== undefined && (!Array.isArray(career.slots) || career.slots.length > 3)) {
            errors.push('"contracts.career.slots" must be an array of at most 3 slots');
          }
        }
      }
    }
  }
  if (!data.stats || typeof data.stats !== 'object') {
    errors.push('Missing or invalid "stats" object');
  } else {
    if (data.stats.swarmHighestWave !== undefined && typeof data.stats.swarmHighestWave !== 'number') {
      errors.push('"stats.swarmHighestWave" must be a number');
    }
    if (data.stats.hardcoreSwarmHighestWave !== undefined && typeof data.stats.hardcoreSwarmHighestWave !== 'number') {
      errors.push('"stats.hardcoreSwarmHighestWave" must be a number');
    }
    if (data.stats.totalDerezzes !== undefined && typeof data.stats.totalDerezzes !== 'number') {
      errors.push('"stats.totalDerezzes" must be a number');
    }
    if (data.stats.totalDeallocations !== undefined && typeof data.stats.totalDeallocations !== 'number') {
      errors.push('"stats.totalDeallocations" must be a number');
    }
    if (data.stats.parriesExecuted !== undefined && typeof data.stats.parriesExecuted !== 'number') {
      errors.push('"stats.parriesExecuted" must be a number');
    }
    if (data.stats.curveEliminations !== undefined && typeof data.stats.curveEliminations !== 'number') {
      errors.push('"stats.curveEliminations" must be a number');
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}
