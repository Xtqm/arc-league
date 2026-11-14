import assert from 'assert';
import {
  CloudSyncResolver,
  normalizeSaveState,
  mergeStarMastery,
  mergeSetUnion,
  mergeInventory,
  mergeCampaign,
  resolveLoadout,
  mergeTelemetry,
  evaluateMonotonicInvariants
} from '../../src/storage/CloudSyncResolver.js';

console.log('--- Running CloudSyncResolver (Master Grid Protocol) Test Suite ---');

// Test 1: Normalization produces valid structured schema
const defaultState = normalizeSaveState(null);
assert.strictEqual(defaultState.bits, 0);
assert.strictEqual(defaultState.level, 1);
assert.deepStrictEqual(defaultState.inventory, {
  discs: ['disc_default'],
  cosmetics: [],
  consumables: {},
  unlockedMaps: ['arena_grid_01']
});
assert.deepStrictEqual(defaultState.campaign, {
  completedNodes: [],
  unlockedNodes: ['level_01_01'],
  unlockedGrids: ['grid_01'],
  starsEarned: 0,
  levelRecords: {}
});
assert.strictEqual(defaultState.loadout.activeDisc, 'disc_identity_default');
assert.strictEqual(defaultState.loadout.activeArenaSkin, 'grid_default');
assert.deepStrictEqual(defaultState.achievements, []);
console.log('✓ Normalization produces valid default save state schema with structured campaign, inventory, and loadout');

// Test 2: Monotonic Numerical Max (Bits & Level)
const local1 = { bits: 500, level: 3, userId: 'user-001' };
const cloud1 = { bits: 1200, level: 2, userId: 'user-001' };
const resolved1 = CloudSyncResolver.resolve(local1, cloud1);

assert.strictEqual(resolved1.bits, 1200, 'Bits must be max(500, 1200) = 1200');
assert.strictEqual(resolved1.level, 3, 'Level must be max(3, 2) = 3');
console.log('✓ Numerical attributes (Bits & Level) resolved via monotonic max: Bits 1200, Level 3');

// Test 3: StarMastery & Campaign Level Records Per-Level Union & Maximization
const localCamp = {
  completedNodes: ['level_01_01'],
  unlockedNodes: ['level_01_01', 'level_01_02'],
  unlockedGrids: ['grid_01'],
  starsEarned: 3,
  levelRecords: {
    level_01_01: { levelId: 'level_01_01', gridId: 'grid_01', stars: 3, bestTime: 14.2, highScore: 1500, completed: true }
  }
};
const cloudCamp = {
  completedNodes: ['level_01_01', 'level_01_02'],
  unlockedNodes: ['level_01_01', 'level_01_02', 'level_02_01'],
  unlockedGrids: ['grid_01', 'grid_02'],
  starsEarned: 5,
  levelRecords: {
    level_01_01: { levelId: 'level_01_01', gridId: 'grid_01', stars: 2, bestTime: 12.0, highScore: 1800, completed: true },
    level_01_02: { levelId: 'level_01_02', gridId: 'grid_01', stars: 3, bestTime: 22.5, highScore: 2100, completed: true }
  }
};

const mergedCamp = mergeCampaign(localCamp, cloudCamp);
assert.strictEqual(mergedCamp.starsEarned, 6, 'Total stars must be 3 (lvl 1) + 3 (lvl 2) = 6');
assert.strictEqual(mergedCamp.levelRecords.level_01_01.stars, 3, 'Lvl 1 stars = max(3, 2) = 3');
assert.strictEqual(mergedCamp.levelRecords.level_01_01.highScore, 1800, 'Lvl 1 highScore = max(1500, 1800) = 1800');
assert.strictEqual(mergedCamp.levelRecords.level_01_01.bestTime, 12.0, 'Lvl 1 bestTime = min(14.2, 12.0) = 12.0');
assert.ok(mergedCamp.completedNodes.includes('level_01_01'));
assert.ok(mergedCamp.completedNodes.includes('level_01_02'));
assert.ok(mergedCamp.unlockedGrids.includes('grid_01'));
assert.ok(mergedCamp.unlockedGrids.includes('grid_02'));
console.log('✓ Campaign level records, stars, and node/grid unions resolved monotonically');

// Test 4: Structured Inventory & Arena Map Unlock Set Union
const localInv = {
  discs: ['disc_default', 'disc_neon_cyan'],
  cosmetics: ['trail_grid'],
  consumables: { overcharge_core: 2 },
  unlockedMaps: ['arena_grid_01', 'arena_solar_sail']
};
const cloudInv = {
  discs: ['disc_default', 'disc_solar_orange'],
  cosmetics: ['skin_infiltrator'],
  consumables: { overcharge_core: 5, bit_booster: 1 },
  unlockedMaps: ['arena_grid_01', 'arena_sea_sim']
};
const mergedInv = mergeInventory(localInv, cloudInv);

assert.strictEqual(mergedInv.discs.length, 3);
assert.ok(mergedInv.discs.includes('disc_default'));
assert.ok(mergedInv.discs.includes('disc_neon_cyan'));
assert.ok(mergedInv.discs.includes('disc_solar_orange'));

assert.strictEqual(mergedInv.unlockedMaps.length, 3);
assert.ok(mergedInv.unlockedMaps.includes('arena_grid_01'));
assert.ok(mergedInv.unlockedMaps.includes('arena_solar_sail'));
assert.ok(mergedInv.unlockedMaps.includes('arena_sea_sim'));

assert.strictEqual(mergedInv.consumables.overcharge_core, 5, 'Consumables must take max(2, 5) = 5');
assert.strictEqual(mergedInv.consumables.bit_booster, 1);
console.log('✓ Structured inventory & arena maps resolved as pure set unions and element-wise max');

// Test 5: Full Master Grid Protocol State Resolution
const localFull = {
  userId: 'tron_pilot_88',
  handle: 'LOCAL_PILOT',
  bits: 2400,
  level: 5,
  campaign: {
    completedNodes: ['level_01_01'],
    unlockedNodes: ['level_01_01', 'level_01_02'],
    unlockedGrids: ['grid_01'],
    starsEarned: 3,
    levelRecords: {
      level_01_01: { levelId: 'level_01_01', stars: 3, highScore: 1000, bestTime: 15.0, completed: true }
    }
  },
  inventory: {
    discs: ['disc_default', 'disc_neon'],
    cosmetics: ['trail_amber'],
    consumables: {},
    unlockedMaps: ['arena_grid_01', 'arena_solar_sail']
  },
  loadout: {
    activeDisc: 'disc_neon',
    activeTrail: 'trail_amber',
    activeVisor: 'visor_classic',
    activeArenaSkin: 'arena_solar_sail',
    audioTheme: 'synthwave_82'
  },
  achievements: ['ACH_FIRST_WIN'],
  stats: { matchesPlayed: 12, wins: 8, highestWave: 6, totalScore: 9200, totalDerezzes: 15, parriesExecuted: 4 },
  settings: { sens: 0.003, invertY: true },
  lastActiveAt: 1000
};

const cloudFull = {
  userId: 'tron_pilot_88',
  handle: 'CLOUD_PILOT',
  bits: 1800,
  level: 7,
  campaign: {
    completedNodes: ['level_01_01', 'level_01_02'],
    unlockedNodes: ['level_01_01', 'level_01_02', 'level_02_01'],
    unlockedGrids: ['grid_01', 'grid_02'],
    starsEarned: 5,
    levelRecords: {
      level_01_01: { levelId: 'level_01_01', stars: 2, highScore: 1200, bestTime: 12.0, completed: true },
      level_01_02: { levelId: 'level_01_02', stars: 3, highScore: 2000, bestTime: 20.0, completed: true }
    }
  },
  inventory: {
    discs: ['disc_default', 'disc_plasma'],
    cosmetics: ['skin_recognizer'],
    consumables: {},
    unlockedMaps: ['arena_grid_01', 'arena_core_pinnacle']
  },
  loadout: {
    activeDisc: 'disc_plasma',
    activeTrail: 'trail_cyan_default',
    activeVisor: 'visor_classic',
    activeArenaSkin: 'arena_core_pinnacle',
    audioTheme: 'synthwave_82'
  },
  achievements: ['ACH_FIRST_WIN', 'ACH_WAVE_5'],
  stats: { matchesPlayed: 20, wins: 6, highestWave: 7, totalScore: 8500, totalDerezzes: 22, parriesExecuted: 7 },
  settings: { sens: 0.0022, invertY: false },
  lastActiveAt: 2000
};

const resolvedFull = CloudSyncResolver.resolve(localFull, cloudFull);
assert.strictEqual(resolvedFull.bits, 2400);
assert.strictEqual(resolvedFull.level, 7);
assert.strictEqual(resolvedFull.campaign.starsEarned, 6);
assert.strictEqual(resolvedFull.campaign.levelRecords.level_01_01.stars, 3);
assert.strictEqual(resolvedFull.campaign.levelRecords.level_01_01.highScore, 1200);
assert.strictEqual(resolvedFull.campaign.levelRecords.level_01_01.bestTime, 12.0);
assert.strictEqual(resolvedFull.inventory.discs.length, 3);
assert.strictEqual(resolvedFull.inventory.unlockedMaps.length, 3);
assert.ok(resolvedFull.inventory.unlockedMaps.includes('arena_solar_sail'));
assert.ok(resolvedFull.inventory.unlockedMaps.includes('arena_core_pinnacle'));
assert.strictEqual(resolvedFull.loadout.activeDisc, 'disc_plasma', 'Newer cloud active session loadout takes precedence');
assert.strictEqual(resolvedFull.stats.matchesPlayed, 20);
assert.strictEqual(resolvedFull.stats.wins, 8);
assert.strictEqual(resolvedFull.stats.highestWave, 7);
assert.strictEqual(resolvedFull.stats.totalScore, 9200);
assert.strictEqual(resolvedFull.stats.totalDerezzes, 22);
assert.strictEqual(resolvedFull.stats.parriesExecuted, 7);
assert.strictEqual(resolvedFull.handle, 'CLOUD_PILOT'); // newer active time
console.log('✓ Full asymmetric state sync adheres to all Master Grid Protocol rules');

// Test 6: Non-decreasing invariant verification (detecting regressions)
const badCandidateBits = { ...resolvedFull, bits: 100 };
const violationsBits = evaluateMonotonicInvariants(badCandidateBits, localFull, 'Local');
assert.ok(violationsBits.length > 0);
assert.match(violationsBits[0], /Bits decreased/);

const badCandidateStars = {
  ...resolvedFull,
  campaign: {
    ...resolvedFull.campaign,
    starsEarned: 1
  }
};
const violationsStars = evaluateMonotonicInvariants(badCandidateStars, localFull, 'Local');
assert.ok(violationsStars.some(v => v.includes('starsEarned decreased')));

const badCandidateMap = {
  ...resolvedFull,
  inventory: {
    ...resolvedFull.inventory,
    unlockedMaps: ['arena_grid_01'] // revoked arena_solar_sail
  }
};
const violationsMap = evaluateMonotonicInvariants(badCandidateMap, localFull, 'Local');
assert.ok(violationsMap.some(v => v.includes('Arena map missing')));

const badCandidateNode = {
  ...resolvedFull,
  campaign: {
    ...resolvedFull.campaign,
    completedNodes: [] // revoked completed level_01_01
  }
};
const violationsNode = evaluateMonotonicInvariants(badCandidateNode, localFull, 'Local');
assert.ok(violationsNode.some(v => v.includes('Campaign completedNode missing')));

console.log('✓ Invariant verification successfully catches drops in bits, stars, maps, and completed nodes');

// Test 7: Backward-compatible translation of legacy flat array inventory
const legacyState = {
  userId: 'legacy_user',
  bits: 100,
  level: 1,
  inventory: ['disc_default', 'disc_heavy', 'trail_amber', 'arena_grid_01']
};
const normalizedLegacy = normalizeSaveState(legacyState);
assert.ok(Array.isArray(normalizedLegacy.inventory.discs));
assert.ok(normalizedLegacy.inventory.discs.includes('disc_heavy'));
assert.ok(normalizedLegacy.inventory.cosmetics.includes('trail_amber'));
assert.ok(normalizedLegacy.inventory.unlockedMaps.includes('arena_grid_01'));
console.log('✓ Legacy flat inventory arrays translated into structured inventory cleanly');

console.log('--- CloudSyncResolver Test Suite PASSED ---\n');
