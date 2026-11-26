import assert from 'assert';
import {
  CloudSyncResolver,
  normalizeSaveState,
  mergeStarMastery,
  mergeSetUnion,
  mergeInventory,
  mergeCampaign,
  mergeContracts,
  resolveLoadout,
  mergeTelemetry,
  evaluateMonotonicInvariants,
  saveStateToRow,
  rowToSaveState
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
assert.strictEqual(defaultState.stats.hardcoreSwarmHighestWave, 0);
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
  stats: { matchesPlayed: 12, wins: 8, highestWave: 6, hardcoreSwarmHighestWave: 14, totalScore: 9200, totalDerezzes: 15, parriesExecuted: 4 },
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
  stats: { matchesPlayed: 20, wins: 6, highestWave: 7, hardcoreSwarmHighestWave: 9, totalScore: 8500, totalDerezzes: 22, parriesExecuted: 7 },
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
assert.strictEqual(resolvedFull.stats.hardcoreSwarmHighestWave, 14);
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

// Test 8: Monotonic calibration_bypassed and calibration_completed merge
const localCal = { calibration_bypassed: true, calibration_completed: false, userId: 'u1' };
const cloudCal = { calibration_bypassed: false, calibration_completed: true, userId: 'u1' };
const mergedCal = CloudSyncResolver.resolve(localCal, cloudCal);
assert.strictEqual(mergedCal.calibration_bypassed, true, 'calibration_bypassed must merge monotonically via OR');
assert.strictEqual(mergedCal.calibration_completed, true, 'calibration_completed must merge monotonically via OR');

const uncal = CloudSyncResolver.resolve({ calibration_bypassed: false }, { calibration_bypassed: false });
assert.strictEqual(uncal.calibration_bypassed, false);
console.log('✓ Monotonic calibration_bypassed and calibration_completed resolution verified');

// Test 9: Bidirectional serialization and round-trip restoration of calibration flags
const stateWithFlags = {
  userId: 'user_cal_test',
  calibration_completed: true,
  calibration_bypassed: false
};
const rowFromState = saveStateToRow(stateWithFlags);
assert.strictEqual(rowFromState.calibration_completed, true, 'saveStateToRow must serialize calibration_completed');
assert.strictEqual(rowFromState.calibration_bypassed, false, 'saveStateToRow must serialize calibration_bypassed');

const restoredState = rowToSaveState(rowFromState);
assert.strictEqual(restoredState.calibration_completed, true, 'rowToSaveState must restore calibration_completed');
assert.strictEqual(restoredState.calibration_bypassed, false, 'rowToSaveState must restore calibration_bypassed');

const stateBypassedOnly = {
  userId: 'user_cal_bypass',
  calibration_completed: false,
  calibration_bypassed: true
};
const rowBypassed = saveStateToRow(stateBypassedOnly);
assert.strictEqual(rowBypassed.calibration_completed, false);
assert.strictEqual(rowBypassed.calibration_bypassed, true);

const restoredBypassed = rowToSaveState(rowBypassed);
assert.strictEqual(restoredBypassed.calibration_completed, false);
assert.strictEqual(restoredBypassed.calibration_bypassed, true);

const stateBothTrue = {
  userId: 'user_cal_both',
  calibration_completed: true,
  calibration_bypassed: true
};
const rowBoth = saveStateToRow(stateBothTrue);
assert.strictEqual(rowBoth.calibration_completed, true);
assert.strictEqual(rowBoth.calibration_bypassed, true);
const restoredBoth = rowToSaveState(rowBoth);
assert.strictEqual(restoredBoth.calibration_completed, true);
assert.strictEqual(restoredBoth.calibration_bypassed, true);
console.log('✓ Bidirectional serialization and round-trip restoration of calibration flags verified');

// Test 10: Date-aware Daily & Monotonic Career Contracts Merging
const localContractsState = {
  userId: 'user_contracts_sync',
  lastActiveAt: 1000,
  contracts: {
    daily: {
      dateKey: '2026-11-26',
      slots: [
        { id: 'd_parry', progress: 3, target: 3, claimed: false, status: 'claimable' },
        { id: 'd_wins', progress: 1, target: 2, claimed: false, status: 'active' },
        { id: 'd_waves', progress: 0, target: 5, claimed: false, status: 'active' }
      ],
      sweepClaimed: false
    },
    career: {
      unlocked: true,
      tier: 2,
      tierCompletions: 3,
      seenIds: { '1': { combat: ['c1_a'] }, '2': { combat: ['c2_a'] } },
      slots: [
        { id: 'c2_a', focus: 'combat', progress: 4, target: 4, claimed: false, status: 'claimable' },
        { id: 'c2_b', focus: 'endurance', progress: 2, target: 10, claimed: false, status: 'active' },
        null
      ]
    }
  }
};

const cloudContractsState = {
  userId: 'user_contracts_sync',
  lastActiveAt: 2000,
  contracts: {
    daily: {
      dateKey: '2026-11-26',
      slots: [
        { id: 'd_parry', progress: 1, target: 3, claimed: true, status: 'claimed' },
        { id: 'd_wins', progress: 2, target: 2, claimed: false, status: 'claimable' },
        { id: 'd_waves', progress: 4, target: 5, claimed: false, status: 'active' }
      ],
      sweepClaimed: false
    },
    career: {
      unlocked: false,
      tier: 2,
      tierCompletions: 3,
      seenIds: { '2': { combat: ['c2_x'], duel: ['c2_d1'] } },
      slots: [
        { id: 'c2_a', focus: 'combat', progress: 1, target: 4, claimed: false, status: 'active' },
        { id: 'c2_b', focus: 'endurance', progress: 5, target: 10, claimed: false, status: 'active' },
        { id: 'c2_d1', focus: 'duel', progress: 1, target: 3, claimed: false, status: 'active' }
      ]
    }
  }
};

const resolvedContractsFull = CloudSyncResolver.resolve(localContractsState, cloudContractsState);
assert.strictEqual(resolvedContractsFull.contracts.daily.dateKey, '2026-11-26');
assert.strictEqual(resolvedContractsFull.contracts.daily.slots[0].claimed, true);
assert.strictEqual(resolvedContractsFull.contracts.daily.slots[0].progress, 3);
assert.strictEqual(resolvedContractsFull.contracts.daily.slots[1].status, 'claimable');
assert.strictEqual(resolvedContractsFull.contracts.daily.slots[2].progress, 4);
assert.strictEqual(resolvedContractsFull.contracts.career.unlocked, true, 'Career unlock must merge via logical OR');
assert.strictEqual(resolvedContractsFull.contracts.career.tier, 2);
assert.strictEqual(resolvedContractsFull.contracts.career.slots[0].status, 'claimable', 'Higher progress claimable slot preserved');
assert.strictEqual(resolvedContractsFull.contracts.career.slots[1].progress, 5);
assert.strictEqual(resolvedContractsFull.contracts.career.slots[2].id, 'c2_d1');
assert.ok(resolvedContractsFull.contracts.career.seenIds['2'].combat.includes('c2_a'));
assert.ok(resolvedContractsFull.contracts.career.seenIds['2'].combat.includes('c2_x'));

// Newer UTC dateKey supersedes older daily slots, while higher Career tier supersedes lower tier
const newerDayAndTier = mergeContracts(
  localContractsState.contracts,
  {
    daily: {
      dateKey: '2026-11-27',
      slots: [{ id: 'd_new', progress: 0, target: 3, claimed: false, status: 'active' }],
      sweepClaimed: false
    },
    career: {
      unlocked: true,
      tier: 3,
      tierCompletions: 1,
      seenIds: { '3': { combat: ['c3_a'] } },
      slots: [{ id: 'c3_a', focus: 'combat', progress: 0, target: 8, claimed: false, status: 'active' }, null, null]
    }
  },
  true
);
assert.strictEqual(newerDayAndTier.daily.dateKey, '2026-11-27');
assert.strictEqual(newerDayAndTier.daily.slots[0].id, 'd_new');
assert.strictEqual(newerDayAndTier.career.tier, 3);
assert.strictEqual(newerDayAndTier.career.tierCompletions, 1, 'Higher tier keeps its own tierCompletions');

// Row round-trip preserves contracts
const rowWithContracts = saveStateToRow(resolvedContractsFull);
const restoredContractsState = rowToSaveState(rowWithContracts);
assert.deepStrictEqual(restoredContractsState.contracts, resolvedContractsFull.contracts);
console.log('✓ Date-aware Daily & monotonic Career contracts sync and row serialization verified');

// Test 11: Apex Trials & Titles Monotonic Sync
const localApexState = {
  userId: 'user_apex_sync',
  lastActiveAt: 1000,
  titles: ['APEX PRIME // S1'],
  equippedTitle: 'APEX PRIME // S1',
  apexTrials: {
    cycles: {
      cycle_01: { freeTicketUsed: true, attempts: 3, bestAR: 5400, claimed: false },
      cycle_02: { freeTicketUsed: false, attempts: 0, bestAR: 0, claimed: false }
    }
  }
};

const cloudApexState = {
  userId: 'user_apex_sync',
  lastActiveAt: 2000,
  titles: ['APEX PRIME // S2'],
  equippedTitle: 'APEX PRIME // S2',
  apexTrials: {
    cycles: {
      cycle_01: { freeTicketUsed: false, attempts: 2, bestAR: 4900, claimed: true },
      cycle_02: { freeTicketUsed: true, attempts: 1, bestAR: 3100, claimed: false }
    }
  }
};

const resolvedApex = CloudSyncResolver.resolve(localApexState, cloudApexState);
assert.deepStrictEqual(resolvedApex.titles.sort(), ['APEX PRIME // S1', 'APEX PRIME // S2']);
assert.strictEqual(resolvedApex.equippedTitle, 'APEX PRIME // S2');
assert.strictEqual(resolvedApex.apexTrials.cycles.cycle_01.freeTicketUsed, true);
assert.strictEqual(resolvedApex.apexTrials.cycles.cycle_01.attempts, 3);
assert.strictEqual(resolvedApex.apexTrials.cycles.cycle_01.bestAR, 5400);
assert.strictEqual(resolvedApex.apexTrials.cycles.cycle_01.claimed, true);
assert.strictEqual(resolvedApex.apexTrials.cycles.cycle_02.freeTicketUsed, true);
assert.strictEqual(resolvedApex.apexTrials.cycles.cycle_02.bestAR, 3100);

const rowWithApex = saveStateToRow(resolvedApex);
const restoredApexState = rowToSaveState(rowWithApex);
assert.deepStrictEqual(restoredApexState.titles, resolvedApex.titles);
assert.strictEqual(restoredApexState.equippedTitle, resolvedApex.equippedTitle);
assert.deepStrictEqual(restoredApexState.apexTrials, resolvedApex.apexTrials);
console.log('✓ Apex Trials & Titles monotonic cloud sync and row serialization verified');

console.log('--- CloudSyncResolver Test Suite PASSED ---\n');
