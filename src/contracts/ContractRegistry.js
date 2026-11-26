/**
 * ContractRegistry.js
 * Authoritative Daily & Career Contract Templates, Tier Gates, Focus Buckets,
 * and Reward Payloads for Tron Disc Arena.
 */

export const CONTRACT_FOCUSES = Object.freeze({
  COMBAT: 'combat',
  ENDURANCE: 'endurance',
  DUEL: 'duel'
});

export const CAREER_SLOT_FOCUSES = Object.freeze([
  CONTRACT_FOCUSES.COMBAT,
  CONTRACT_FOCUSES.ENDURANCE,
  CONTRACT_FOCUSES.DUEL
]);

export const CAREER_FOCUS_META = Object.freeze({
  [CONTRACT_FOCUSES.COMBAT]: Object.freeze({
    id: CONTRACT_FOCUSES.COMBAT,
    slotIndex: 0,
    label: 'Combat Precision',
    subtitle: 'Parries, Ricochets & Curve Fractures',
    icon: '⚡'
  }),
  [CONTRACT_FOCUSES.ENDURANCE]: Object.freeze({
    id: CONTRACT_FOCUSES.ENDURANCE,
    slotIndex: 1,
    label: 'Swarm & Tour',
    subtitle: 'Swarm Waves, Hardcore & Federation Tour',
    icon: '🛡️'
  }),
  [CONTRACT_FOCUSES.DUEL]: Object.freeze({
    id: CONTRACT_FOCUSES.DUEL,
    slotIndex: 2,
    label: 'Duel Competitive',
    subtitle: 'AI Practice Tiers, Ranked & Duel Wins',
    icon: '🏆'
  })
});

export const DAILY_SLOTS_COUNT = 3;

export const DAILY_CONTRACT_REWARD = Object.freeze({
  credits: 0,
  bits: 0,
  sparks: 0,
  xp: 250
});

export const DAILY_SWEEP_REWARD = Object.freeze({
  credits: 500,
  bits: 500,
  sparks: 0,
  xp: 0
});

export const CAREER_UNLOCK_REQUIREMENTS = Object.freeze({
  minLevel: 5,
  minSwarmWave: 5
});

export const CAREER_TIER_REWARDS = Object.freeze({
  1: Object.freeze({ credits: 300, bits: 300, sparks: 1, xp: 300 }),
  2: Object.freeze({ credits: 600, bits: 600, sparks: 2, xp: 500 }),
  3: Object.freeze({ credits: 1000, bits: 1000, sparks: 3, xp: 800 }),
  4: Object.freeze({ credits: 1600, bits: 1600, sparks: 4, xp: 1200 }),
  5: Object.freeze({ credits: 2500, bits: 2500, sparks: 5, xp: 1800 })
});

export const CAREER_TIERS = Object.freeze([
  Object.freeze({
    tier: 1,
    name: 'Rookie',
    reward: CAREER_TIER_REWARDS[1],
    promotionGate: Object.freeze({
      nextTier: 2,
      requiredCompletions: 6,
      requiredLevel: 10
    })
  }),
  Object.freeze({
    tier: 2,
    name: 'Contender',
    reward: CAREER_TIER_REWARDS[2],
    promotionGate: Object.freeze({
      nextTier: 3,
      requiredCompletions: 9,
      requiredLevel: 18
    })
  }),
  Object.freeze({
    tier: 3,
    name: 'Pro',
    reward: CAREER_TIER_REWARDS[3],
    promotionGate: Object.freeze({
      nextTier: 4,
      requiredCompletions: 12,
      requiredLevel: 28
    })
  }),
  Object.freeze({
    tier: 4,
    name: 'Elite',
    reward: CAREER_TIER_REWARDS[4],
    promotionGate: Object.freeze({
      nextTier: 5,
      requiredCompletions: 15,
      requiredLevel: 40
    })
  }),
  Object.freeze({
    tier: 5,
    name: 'Apex',
    reward: CAREER_TIER_REWARDS[5],
    promotionGate: null
  })
]);

export const CAREER_TIER_MAP = Object.freeze(
  Object.fromEntries(CAREER_TIERS.map((t) => [t.tier, t]))
);

/**
 * Standardized telemetry metric keys consumed by ContractManager.
 */
export const CONTRACT_METRICS = Object.freeze({
  PARRY: 'maneuver_parry',
  RICOCHET: 'maneuver_ricochet',
  CURVE_KILL: 'maneuver_curve_kill',
  DEALLOCATIONS: 'deallocations',
  DISCS_DEFLECTED: 'discs_deflected',
  SWARM_WAVE: 'swarm_wave',
  HARDCORE_SWARM_WAVE: 'hardcore_swarm_wave',
  TOUR_CLEAR: 'tour_clear',
  TOUR_THREE_STAR: 'tour_three_star',
  DUEL_WIN: 'duel_win',
  DUEL_AI_HIGH_TIER_WIN: 'duel_ai_high_tier_win',
  DUEL_MULTIPLAYER_WIN: 'duel_multiplayer_win',
  MATCH_PLAYED: 'match_played'
});

/**
 * Pool of short-session Daily Contract templates.
 * Three distinct templates are drawn per UTC day.
 */
export const DAILY_CONTRACTS = Object.freeze([
  Object.freeze({
    id: 'daily_parry_3',
    title: 'Kinetic Counter',
    description: 'Execute 3 disc parries in combat',
    metricKey: CONTRACT_METRICS.PARRY,
    target: 3,
    reward: DAILY_CONTRACT_REWARD,
    icon: '🛡️'
  }),
  Object.freeze({
    id: 'daily_ricochet_2',
    title: 'Bank Vector',
    description: 'Land 2 multi-ricochet disc hits (2+ bounces)',
    metricKey: CONTRACT_METRICS.RICOCHET,
    target: 2,
    reward: DAILY_CONTRACT_REWARD,
    icon: '💠'
  }),
  Object.freeze({
    id: 'daily_curve_2',
    title: 'Arc Trajectory',
    description: 'Score 2 curve-shot fractures',
    metricKey: CONTRACT_METRICS.CURVE_KILL,
    target: 2,
    reward: DAILY_CONTRACT_REWARD,
    icon: '🌀'
  }),
  Object.freeze({
    id: 'daily_derez_8',
    title: 'Grid Purge',
    description: 'Deallocate 8 hostiles across any mode',
    metricKey: CONTRACT_METRICS.DEALLOCATIONS,
    target: 8,
    reward: DAILY_CONTRACT_REWARD,
    icon: '⚡'
  }),
  Object.freeze({
    id: 'daily_swarm_waves_4',
    title: 'Swarm Holdout',
    description: 'Clear 4 Swarm Protocol waves',
    metricKey: CONTRACT_METRICS.SWARM_WAVE,
    target: 4,
    reward: DAILY_CONTRACT_REWARD,
    icon: '🐝'
  }),
  Object.freeze({
    id: 'daily_tour_clear_1',
    title: 'Sector Sweep',
    description: 'Clear 1 Federation Tour trial',
    metricKey: CONTRACT_METRICS.TOUR_CLEAR,
    target: 1,
    reward: DAILY_CONTRACT_REWARD,
    icon: '🌐'
  }),
  Object.freeze({
    id: 'daily_duel_win_2',
    title: 'Arena Victor',
    description: 'Win 2 Duel matches (AI or Multiplayer)',
    metricKey: CONTRACT_METRICS.DUEL_WIN,
    target: 2,
    reward: DAILY_CONTRACT_REWARD,
    icon: '🏆'
  }),
  Object.freeze({
    id: 'daily_deflect_5',
    title: 'Disc Guard',
    description: 'Deflect 5 incoming enemy discs',
    metricKey: CONTRACT_METRICS.DISCS_DEFLECTED,
    target: 5,
    reward: DAILY_CONTRACT_REWARD,
    icon: '🔷'
  }),
  Object.freeze({
    id: 'daily_matches_3',
    title: 'Active Subroutine',
    description: 'Complete 3 matches in any Arena mode',
    metricKey: CONTRACT_METRICS.MATCH_PLAYED,
    target: 3,
    reward: DAILY_CONTRACT_REWARD,
    icon: '🎮'
  })
]);

function makeCareerTemplate(id, tier, focus, title, description, metricKey, target, params = null) {
  const reward = CAREER_TIER_REWARDS[tier];
  if (!reward) {
    throw new Error(`Invalid Career Contract tier: ${tier}`);
  }
  return Object.freeze({
    id,
    tier,
    focus,
    title,
    description,
    metricKey,
    target,
    params: params ? Object.freeze({ ...params }) : null,
    reward
  });
}

/**
 * Career Contract templates organized by Tier (1..5) and Focus ('combat' | 'endurance' | 'duel').
 */
export const CAREER_CONTRACT_BUCKETS = Object.freeze({
  1: Object.freeze({
    [CONTRACT_FOCUSES.COMBAT]: Object.freeze([
      makeCareerTemplate('c1_combat_parry', 1, CONTRACT_FOCUSES.COMBAT, 'Rookie Counter', 'Execute 6 disc parries', CONTRACT_METRICS.PARRY, 6),
      makeCareerTemplate('c1_combat_ricochet', 1, CONTRACT_FOCUSES.COMBAT, 'Rookie Angles', 'Land 5 multi-ricochet disc hits', CONTRACT_METRICS.RICOCHET, 5),
      makeCareerTemplate('c1_combat_curve', 1, CONTRACT_FOCUSES.COMBAT, 'Rookie Curve', 'Score 4 curve-shot fractures', CONTRACT_METRICS.CURVE_KILL, 4),
      makeCareerTemplate('c1_combat_derez', 1, CONTRACT_FOCUSES.COMBAT, 'Rookie Derezz', 'Deallocate 15 hostiles in combat', CONTRACT_METRICS.DEALLOCATIONS, 15)
    ]),
    [CONTRACT_FOCUSES.ENDURANCE]: Object.freeze([
      makeCareerTemplate('c1_endurance_swarm', 1, CONTRACT_FOCUSES.ENDURANCE, 'Swarm Watch', 'Clear 8 Swarm Protocol waves', CONTRACT_METRICS.SWARM_WAVE, 8),
      makeCareerTemplate('c1_endurance_tour', 1, CONTRACT_FOCUSES.ENDURANCE, 'Tour Initiate', 'Clear 2 Federation Tour trials', CONTRACT_METRICS.TOUR_CLEAR, 2),
      makeCareerTemplate('c1_endurance_stars', 1, CONTRACT_FOCUSES.ENDURANCE, 'Clean Execution', 'Earn a 3-star clear in Federation Tour', CONTRACT_METRICS.TOUR_THREE_STAR, 1)
    ]),
    [CONTRACT_FOCUSES.DUEL]: Object.freeze([
      makeCareerTemplate('c1_duel_wins', 1, CONTRACT_FOCUSES.DUEL, 'Rookie Duelist', 'Win 3 Duel matches', CONTRACT_METRICS.DUEL_WIN, 3),
      makeCareerTemplate('c1_duel_matches', 1, CONTRACT_FOCUSES.DUEL, 'Grid Sparring', 'Complete 5 Arena matches', CONTRACT_METRICS.MATCH_PLAYED, 5),
      makeCareerTemplate('c1_duel_deflect', 1, CONTRACT_FOCUSES.DUEL, 'Rookie Ward', 'Deflect 10 discs in combat', CONTRACT_METRICS.DISCS_DEFLECTED, 10)
    ])
  }),

  2: Object.freeze({
    [CONTRACT_FOCUSES.COMBAT]: Object.freeze([
      makeCareerTemplate('c2_combat_parry', 2, CONTRACT_FOCUSES.COMBAT, 'Contender Parry', 'Execute 12 disc parries', CONTRACT_METRICS.PARRY, 12),
      makeCareerTemplate('c2_combat_ricochet', 2, CONTRACT_FOCUSES.COMBAT, 'Contender Ricochet', 'Land 10 multi-ricochet disc hits', CONTRACT_METRICS.RICOCHET, 10),
      makeCareerTemplate('c2_combat_curve', 2, CONTRACT_FOCUSES.COMBAT, 'Contender Arc', 'Score 8 curve-shot fractures', CONTRACT_METRICS.CURVE_KILL, 8),
      makeCareerTemplate('c2_combat_derez', 2, CONTRACT_FOCUSES.COMBAT, 'Contender Sweep', 'Deallocate 30 hostiles in combat', CONTRACT_METRICS.DEALLOCATIONS, 30)
    ]),
    [CONTRACT_FOCUSES.ENDURANCE]: Object.freeze([
      makeCareerTemplate('c2_endurance_swarm', 2, CONTRACT_FOCUSES.ENDURANCE, 'Swarm Bastion', 'Clear 15 Swarm Protocol waves', CONTRACT_METRICS.SWARM_WAVE, 15),
      makeCareerTemplate('c2_endurance_tour', 2, CONTRACT_FOCUSES.ENDURANCE, 'Tour Runner', 'Clear 4 Federation Tour trials', CONTRACT_METRICS.TOUR_CLEAR, 4),
      makeCareerTemplate('c2_endurance_hardcore', 2, CONTRACT_FOCUSES.ENDURANCE, 'Hardcore Surge', 'Clear 5 Hardcore Swarm waves', CONTRACT_METRICS.HARDCORE_SWARM_WAVE, 5)
    ]),
    [CONTRACT_FOCUSES.DUEL]: Object.freeze([
      makeCareerTemplate('c2_duel_wins', 2, CONTRACT_FOCUSES.DUEL, 'Contender Victor', 'Win 6 Duel matches', CONTRACT_METRICS.DUEL_WIN, 6),
      makeCareerTemplate('c2_duel_ai_tier', 2, CONTRACT_FOCUSES.DUEL, 'AI Escalation', 'Win 3 AI Practice duels at Tier 3+', CONTRACT_METRICS.DUEL_AI_HIGH_TIER_WIN, 3, { minAiTier: 3 }),
      makeCareerTemplate('c2_duel_mp', 2, CONTRACT_FOCUSES.DUEL, 'Network Challenger', 'Win 2 Multiplayer duels', CONTRACT_METRICS.DUEL_MULTIPLAYER_WIN, 2)
    ])
  }),

  3: Object.freeze({
    [CONTRACT_FOCUSES.COMBAT]: Object.freeze([
      makeCareerTemplate('c3_combat_parry', 3, CONTRACT_FOCUSES.COMBAT, 'Pro Deflector', 'Execute 20 disc parries', CONTRACT_METRICS.PARRY, 20),
      makeCareerTemplate('c3_combat_ricochet', 3, CONTRACT_FOCUSES.COMBAT, 'Pro Geometry', 'Land 16 multi-ricochet disc hits', CONTRACT_METRICS.RICOCHET, 16),
      makeCareerTemplate('c3_combat_curve', 3, CONTRACT_FOCUSES.COMBAT, 'Pro Trajectory', 'Score 14 curve-shot fractures', CONTRACT_METRICS.CURVE_KILL, 14),
      makeCareerTemplate('c3_combat_derez', 3, CONTRACT_FOCUSES.COMBAT, 'Pro Deallocator', 'Deallocate 50 hostiles in combat', CONTRACT_METRICS.DEALLOCATIONS, 50)
    ]),
    [CONTRACT_FOCUSES.ENDURANCE]: Object.freeze([
      makeCareerTemplate('c3_endurance_swarm', 3, CONTRACT_FOCUSES.ENDURANCE, 'Swarm Veteran', 'Clear 25 Swarm Protocol waves', CONTRACT_METRICS.SWARM_WAVE, 25),
      makeCareerTemplate('c3_endurance_hardcore', 3, CONTRACT_FOCUSES.ENDURANCE, 'Hardcore Vanguard', 'Clear 10 Hardcore Swarm waves', CONTRACT_METRICS.HARDCORE_SWARM_WAVE, 10),
      makeCareerTemplate('c3_endurance_stars', 3, CONTRACT_FOCUSES.ENDURANCE, 'Tour Perfectionist', 'Earn 3 three-star clears in Federation Tour', CONTRACT_METRICS.TOUR_THREE_STAR, 3)
    ]),
    [CONTRACT_FOCUSES.DUEL]: Object.freeze([
      makeCareerTemplate('c3_duel_wins', 3, CONTRACT_FOCUSES.DUEL, 'Pro Duelist', 'Win 10 Duel matches', CONTRACT_METRICS.DUEL_WIN, 10),
      makeCareerTemplate('c3_duel_ai_tier', 3, CONTRACT_FOCUSES.DUEL, 'Tier 5 Dominance', 'Win 5 AI Practice duels at Tier 5+', CONTRACT_METRICS.DUEL_AI_HIGH_TIER_WIN, 5, { minAiTier: 5 }),
      makeCareerTemplate('c3_duel_mp', 3, CONTRACT_FOCUSES.DUEL, 'Ranked Contender', 'Win 4 Multiplayer duels', CONTRACT_METRICS.DUEL_MULTIPLAYER_WIN, 4)
    ])
  }),

  4: Object.freeze({
    [CONTRACT_FOCUSES.COMBAT]: Object.freeze([
      makeCareerTemplate('c4_combat_parry', 4, CONTRACT_FOCUSES.COMBAT, 'Elite Reflex', 'Execute 30 disc parries', CONTRACT_METRICS.PARRY, 30),
      makeCareerTemplate('c4_combat_ricochet', 4, CONTRACT_FOCUSES.COMBAT, 'Elite Vector', 'Land 24 multi-ricochet disc hits', CONTRACT_METRICS.RICOCHET, 24),
      makeCareerTemplate('c4_combat_curve', 4, CONTRACT_FOCUSES.COMBAT, 'Elite Curve', 'Score 20 curve-shot fractures', CONTRACT_METRICS.CURVE_KILL, 20),
      makeCareerTemplate('c4_combat_derez', 4, CONTRACT_FOCUSES.COMBAT, 'Elite Purge', 'Deallocate 75 hostiles in combat', CONTRACT_METRICS.DEALLOCATIONS, 75)
    ]),
    [CONTRACT_FOCUSES.ENDURANCE]: Object.freeze([
      makeCareerTemplate('c4_endurance_swarm', 4, CONTRACT_FOCUSES.ENDURANCE, 'Swarm Bulwark', 'Clear 35 Swarm Protocol waves', CONTRACT_METRICS.SWARM_WAVE, 35),
      makeCareerTemplate('c4_endurance_hardcore', 4, CONTRACT_FOCUSES.ENDURANCE, 'Hardcore Sentinel', 'Clear 18 Hardcore Swarm waves', CONTRACT_METRICS.HARDCORE_SWARM_WAVE, 18),
      makeCareerTemplate('c4_endurance_tour', 4, CONTRACT_FOCUSES.ENDURANCE, 'Tour Master', 'Clear 8 Federation Tour trials', CONTRACT_METRICS.TOUR_CLEAR, 8)
    ]),
    [CONTRACT_FOCUSES.DUEL]: Object.freeze([
      makeCareerTemplate('c4_duel_wins', 4, CONTRACT_FOCUSES.DUEL, 'Elite Champion', 'Win 15 Duel matches', CONTRACT_METRICS.DUEL_WIN, 15),
      makeCareerTemplate('c4_duel_ai_tier', 4, CONTRACT_FOCUSES.DUEL, 'Arbiter Hunter', 'Win 8 AI Practice duels at Tier 6+', CONTRACT_METRICS.DUEL_AI_HIGH_TIER_WIN, 8, { minAiTier: 6 }),
      makeCareerTemplate('c4_duel_mp', 4, CONTRACT_FOCUSES.DUEL, 'Grid Enforcer', 'Win 7 Multiplayer duels', CONTRACT_METRICS.DUEL_MULTIPLAYER_WIN, 7)
    ])
  }),

  5: Object.freeze({
    [CONTRACT_FOCUSES.COMBAT]: Object.freeze([
      makeCareerTemplate('c5_combat_parry', 5, CONTRACT_FOCUSES.COMBAT, 'Apex Aegis', 'Execute 45 disc parries', CONTRACT_METRICS.PARRY, 45),
      makeCareerTemplate('c5_combat_ricochet', 5, CONTRACT_FOCUSES.COMBAT, 'Apex Prism', 'Land 35 multi-ricochet disc hits', CONTRACT_METRICS.RICOCHET, 35),
      makeCareerTemplate('c5_combat_curve', 5, CONTRACT_FOCUSES.COMBAT, 'Apex Singularity', 'Score 30 curve-shot fractures', CONTRACT_METRICS.CURVE_KILL, 30),
      makeCareerTemplate('c5_combat_derez', 5, CONTRACT_FOCUSES.COMBAT, 'Apex Erasure', 'Deallocate 100 hostiles in combat', CONTRACT_METRICS.DEALLOCATIONS, 100)
    ]),
    [CONTRACT_FOCUSES.ENDURANCE]: Object.freeze([
      makeCareerTemplate('c5_endurance_swarm', 5, CONTRACT_FOCUSES.ENDURANCE, 'Apex Swarm', 'Clear 50 Swarm Protocol waves', CONTRACT_METRICS.SWARM_WAVE, 50),
      makeCareerTemplate('c5_endurance_hardcore', 5, CONTRACT_FOCUSES.ENDURANCE, 'Apex Hardcore', 'Clear 25 Hardcore Swarm waves', CONTRACT_METRICS.HARDCORE_SWARM_WAVE, 25),
      makeCareerTemplate('c5_endurance_stars', 5, CONTRACT_FOCUSES.ENDURANCE, 'Apex Tour Mastery', 'Earn 6 three-star clears in Federation Tour', CONTRACT_METRICS.TOUR_THREE_STAR, 6)
    ]),
    [CONTRACT_FOCUSES.DUEL]: Object.freeze([
      makeCareerTemplate('c5_duel_wins', 5, CONTRACT_FOCUSES.DUEL, 'Apex Sovereign', 'Win 20 Duel matches', CONTRACT_METRICS.DUEL_WIN, 20),
      makeCareerTemplate('c5_duel_ai_tier', 5, CONTRACT_FOCUSES.DUEL, 'Apex AI Mastery', 'Win 12 AI Practice duels at Tier 7+', CONTRACT_METRICS.DUEL_AI_HIGH_TIER_WIN, 12, { minAiTier: 7 }),
      makeCareerTemplate('c5_duel_mp', 5, CONTRACT_FOCUSES.DUEL, 'Apex Ranked', 'Win 10 Multiplayer duels', CONTRACT_METRICS.DUEL_MULTIPLAYER_WIN, 10)
    ])
  })
});

export const DAILY_CONTRACT_MAP = Object.freeze(
  Object.fromEntries(DAILY_CONTRACTS.map((c) => [c.id, c]))
);

const ALL_CAREER_LIST = Object.freeze(
  Object.values(CAREER_CONTRACT_BUCKETS).flatMap((tierBuckets) =>
    Object.values(tierBuckets).flat()
  )
);

export const CAREER_CONTRACT_MAP = Object.freeze(
  Object.fromEntries(ALL_CAREER_LIST.map((c) => [c.id, c]))
);

/**
 * Returns all Daily Contract templates.
 * @returns {readonly object[]}
 */
export function getDailyTemplates() {
  return DAILY_CONTRACTS;
}

/**
 * Looks up a Daily Contract template by ID.
 * @param {string} id
 * @returns {object|null}
 */
export function getDailyTemplate(id) {
  return DAILY_CONTRACT_MAP[id] || null;
}

/**
 * Returns configuration metadata for a Career tier (1..5).
 * @param {number} tier
 * @returns {object|null}
 */
export function getCareerTierConfig(tier) {
  const num = Number(tier);
  return CAREER_TIER_MAP[num] || null;
}

/**
 * Returns the promotion gate for a Career tier, or null for Tier 5 (Apex).
 * @param {number} tier
 * @returns {{ nextTier: number, requiredCompletions: number, requiredLevel: number }|null}
 */
export function getPromotionGate(tier) {
  return getCareerTierConfig(tier)?.promotionGate || null;
}

/**
 * Returns the Career Contract template bucket for a given tier and focus.
 * @param {number} tier
 * @param {string} focus
 * @returns {readonly object[]}
 */
export function getCareerBucket(tier, focus) {
  const tierBuckets = CAREER_CONTRACT_BUCKETS[Number(tier)];
  if (!tierBuckets) return Object.freeze([]);
  return tierBuckets[focus] || Object.freeze([]);
}

/**
 * Looks up a Career Contract template by ID.
 * @param {string} id
 * @returns {object|null}
 */
export function getCareerTemplate(id) {
  return CAREER_CONTRACT_MAP[id] || null;
}

/**
 * Returns all Career Contract templates across all tiers and focuses.
 * @returns {readonly object[]}
 */
export function getAllCareerTemplates() {
  return ALL_CAREER_LIST;
}

/**
 * Looks up either a Daily or Career Contract template by ID.
 * @param {string} id
 * @returns {object|null}
 */
export function getContractTemplate(id) {
  return DAILY_CONTRACT_MAP[id] || CAREER_CONTRACT_MAP[id] || null;
}

/**
 * Evaluates whether Career Contracts unlock prerequisites are satisfied.
 * Requires Player Level >= 5 AND Swarm Highest Wave >= 5.
 * @param {object} saveState
 * @returns {{ unlocked: boolean, level: number, requiredLevel: number, swarmWave: number, requiredSwarmWave: number }}
 */
export function evaluateCareerUnlock(saveState) {
  const level = Math.max(1, Number(saveState?.player?.level ?? saveState?.level ?? 1));
  const swarmWave = Math.max(
    1,
    Number(
      saveState?.stats?.swarmHighestWave ??
      saveState?.stats?.swarmMaxWave ??
      saveState?.stats?.highestWave ??
      1
    )
  );

  return {
    unlocked: level >= CAREER_UNLOCK_REQUIREMENTS.minLevel && swarmWave >= CAREER_UNLOCK_REQUIREMENTS.minSwarmWave,
    level,
    requiredLevel: CAREER_UNLOCK_REQUIREMENTS.minLevel,
    swarmWave,
    requiredSwarmWave: CAREER_UNLOCK_REQUIREMENTS.minSwarmWave
  };
}
