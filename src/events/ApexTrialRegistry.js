/**
 * ApexTrialRegistry.js
 * Authoritative Apex Trials Event Templates, Sporadic 3-7 Day Calendar,
 * Mutator Presets, AR Scoring Weights, Percentile Bracket Payouts,
 * and Weekly Spark Vault Catalog Metadata for Tron Disc Arena.
 */

import {
  ARMORY_CATEGORIES,
  UNLOCK_TYPES,
  getCatalogByCategory
} from '../armory/ArmoryCatalog.js';

export const DAY_MS = 24 * 60 * 60 * 1000;
export const WEEK_MS = 7 * DAY_MS;

export const MIN_TRIAL_DURATION_DAYS = 3;
export const MAX_TRIAL_DURATION_DAYS = 7;

export const FREE_TICKETS_PER_CYCLE = 1;
export const REENTRY_SPARK_COST = 2;

export const TRIAL_WINDOW_STATES = Object.freeze({
  ACTIVE: 'active',
  INTERMISSION: 'intermission'
});

/**
 * Mutator presets injected into gameplay via state.activeTrialMutators.
 */
export const MUTATOR_PRESETS = Object.freeze({
  LOW_GRAVITY: Object.freeze({
    id: 'low_gravity',
    label: 'Low Gravity',
    description: 'Arena gravity is reduced to 55%, extending air-time and aerial disc arcs.',
    gravityScale: 0.55,
    discSpeedMult: 1.0,
    hazardIntervalMult: 1.0,
    hazardDensity: 1.0,
    startingTier: 1,
    bossEveryWave: false,
    botSpeedMult: 1.05
  }),
  HYPER_VELOCITY: Object.freeze({
    id: 'hyper_velocity',
    label: 'Hyper Velocity',
    description: 'Kinetic discs fly 45% faster with heightened bot aggression.',
    gravityScale: 1.0,
    discSpeedMult: 1.45,
    hazardIntervalMult: 1.0,
    hazardDensity: 1.0,
    startingTier: 2,
    bossEveryWave: false,
    botSpeedMult: 1.15
  }),
  HAZARD_STORM: Object.freeze({
    id: 'hazard_storm',
    label: 'Hazard Storm',
    description: 'Sector tile hazards trigger twice as often with denser grid instability.',
    gravityScale: 1.0,
    discSpeedMult: 1.1,
    hazardIntervalMult: 0.5,
    hazardDensity: 1.6,
    startingTier: 1,
    bossEveryWave: false,
    botSpeedMult: 1.05
  }),
  BOSS_GAUNTLET: Object.freeze({
    id: 'boss_gauntlet',
    label: 'Arbiter Gauntlet',
    description: 'Elite Arbiter bosses command every wave starting at Tier 3 escalation.',
    gravityScale: 1.0,
    discSpeedMult: 1.2,
    hazardIntervalMult: 0.85,
    hazardDensity: 1.2,
    startingTier: 3,
    bossEveryWave: true,
    botSpeedMult: 1.2
  })
});

/**
 * Weights used to compute an Apex Trial run's Apex Rating (AR).
 */
export const AR_SCORING_WEIGHTS = Object.freeze({
  waveCleared: 250,
  survivalSecond: 4,
  fracture: 120,
  parry: 90,
  ricochetFracture: 150,
  damageEfficiencyMax: 400,
  victoryBonus: 500
});

/**
 * Percentile bracket payout tiers (ordered highest to lowest).
 */
export const APEX_BRACKET_TIERS = Object.freeze({
  APEX_PRIME: Object.freeze({
    id: 'apex_prime',
    label: 'Apex Prime',
    percentileLabel: 'Top 1%',
    maxPercentile: 1,
    sparks: 25,
    credits: 3000,
    bits: 3000,
    xp: 0,
    grantsTitle: true,
    emblem: 'emblem_apex_prime'
  }),
  MASTER: Object.freeze({
    id: 'master',
    label: 'Master',
    percentileLabel: 'Top 10%',
    maxPercentile: 10,
    sparks: 12,
    credits: 1500,
    bits: 1500,
    xp: 0,
    grantsTitle: false,
    emblem: 'emblem_master'
  }),
  CONTENDER: Object.freeze({
    id: 'contender',
    label: 'Contender',
    percentileLabel: 'Top 25%',
    maxPercentile: 25,
    sparks: 6,
    credits: 750,
    bits: 750,
    xp: 0,
    grantsTitle: false,
    emblem: null
  }),
  PARTICIPANT: Object.freeze({
    id: 'participant',
    label: 'Participant',
    percentileLabel: 'Participant',
    maxPercentile: 100,
    sparks: 1,
    credits: 250,
    bits: 250,
    xp: 500,
    grantsTitle: false,
    emblem: null
  })
});

export const ORDERED_BRACKET_TIERS = Object.freeze([
  APEX_BRACKET_TIERS.APEX_PRIME,
  APEX_BRACKET_TIERS.MASTER,
  APEX_BRACKET_TIERS.CONTENDER,
  APEX_BRACKET_TIERS.PARTICIPANT
]);

/**
 * Sporadic 3-7 day Apex Trial event templates.
 */
export const APEX_TRIAL_TEMPLATES = Object.freeze([
  Object.freeze({
    id: 'trial_zero_g_nexus',
    title: 'ZERO-G NEXUS',
    subtitle: 'Low-Gravity Kinetic Convergence',
    description: 'Reduced arena gravity amplifies aerial disc arcs and jump evasion.',
    durationDays: 4,
    mutatorPresetId: 'LOW_GRAVITY',
    mutators: MUTATOR_PRESETS.LOW_GRAVITY,
    exclusiveTitle: 'APEX PRIME: ZERO-G',
    themeColor: '#00f3ff',
    benchmarkThresholds: Object.freeze({
      top1: 3600,
      top10: 2400,
      top25: 1500,
      participant: 1
    })
  }),
  Object.freeze({
    id: 'trial_hyper_velocity',
    title: 'HYPER-VELOCITY PROTOCOL',
    subtitle: 'Overclocked Disc Ballistics',
    description: 'Discs accelerate to 1.45x velocity; parries and reflexes decide survival.',
    durationDays: 5,
    mutatorPresetId: 'HYPER_VELOCITY',
    mutators: MUTATOR_PRESETS.HYPER_VELOCITY,
    exclusiveTitle: 'APEX PRIME: HYPERION',
    themeColor: '#ffaa00',
    benchmarkThresholds: Object.freeze({
      top1: 4000,
      top10: 2700,
      top25: 1700,
      participant: 1
    })
  }),
  Object.freeze({
    id: 'trial_hazard_storm',
    title: 'SECTOR HAZARD STORM',
    subtitle: 'Unstable Grid Lockdown',
    description: 'Tile hazards erupt at double cadence across a destabilized grid.',
    durationDays: 3,
    mutatorPresetId: 'HAZARD_STORM',
    mutators: MUTATOR_PRESETS.HAZARD_STORM,
    exclusiveTitle: 'APEX PRIME: TEMPEST',
    themeColor: '#ff3366',
    benchmarkThresholds: Object.freeze({
      top1: 3400,
      top10: 2200,
      top25: 1400,
      participant: 1
    })
  }),
  Object.freeze({
    id: 'trial_arbiter_gauntlet',
    title: 'ARBITER GAUNTLET',
    subtitle: '7-Day Apex Championship',
    description: 'Elite Arbiter commanders deploy every wave in a week-long trial.',
    durationDays: 7,
    mutatorPresetId: 'BOSS_GAUNTLET',
    mutators: MUTATOR_PRESETS.BOSS_GAUNTLET,
    exclusiveTitle: 'APEX PRIME: ARBITER',
    themeColor: '#cc66ff',
    benchmarkThresholds: Object.freeze({
      top1: 4500,
      top10: 3000,
      top25: 1900,
      participant: 1
    })
  })
]);

/**
 * Deterministic sporadic macro-calendar configuration.
 * Each slot spans 10 UTC days: [0, durationDays) is active, [durationDays, 10) is intermission.
 */
export const SPORADIC_SCHEDULE_CONFIG = Object.freeze({
  epochMs: Date.UTC(2026, 0, 1, 0, 0, 0),
  slotDurationDays: 10
});

/**
 * Spark Vault rotation configuration & scarce pricing tier metadata.
 */
export const SPARK_VAULT_CONFIG = Object.freeze({
  minWeeklyItems: 1,
  maxWeeklyItems: 3,
  weekMs: WEEK_MS,
  allowRepeatRotations: true,
  pricingTiers: Object.freeze({
    STANDARD_PRESTIGE: Object.freeze({
      id: 'standard_prestige',
      label: 'Standard Prestige',
      minSparks: 40,
      maxSparks: 50
    }),
    DARK_MATTER: Object.freeze({
      id: 'dark_matter',
      label: 'Dark Matter Tier',
      itemId: 'disc_hex_dark_matter',
      sparks: 75
    }),
    VOID_SHURIKEN: Object.freeze({
      id: 'void_shuriken',
      label: 'Void Shuriken Tier',
      itemId: 'disc_shuriken_void',
      sparks: 100
    })
  })
});

/**
 * Explicit Vault metadata keyed by Armory catalog ID for flagship Spark cosmetics.
 */
export const SPARK_VAULT_CATALOG_META = Object.freeze({
  disc_hex_dark_matter: Object.freeze({
    itemId: 'disc_hex_dark_matter',
    tierId: 'dark_matter',
    tierLabel: 'Dark Matter Tier',
    sparksCost: 75,
    rarity: 'LEGENDARY'
  }),
  disc_shuriken_void: Object.freeze({
    itemId: 'disc_shuriken_void',
    tierId: 'void_shuriken',
    tierLabel: 'Void Shuriken Tier',
    sparksCost: 100,
    rarity: 'MYTHIC'
  })
});

/**
 * Returns all registered Apex Trial templates.
 * @returns {ReadonlyArray<object>}
 */
export function getAllTrialTemplates() {
  return APEX_TRIAL_TEMPLATES;
}

/**
 * Finds an Apex Trial template by ID.
 * @param {string} templateId
 * @returns {object|null}
 */
export function getTrialTemplate(templateId) {
  if (!templateId || typeof templateId !== 'string') return null;
  return APEX_TRIAL_TEMPLATES.find((t) => t.id === templateId) || null;
}

/**
 * Finds a bracket tier definition by ID.
 * @param {string} tierId
 * @returns {object|null}
 */
export function getBracketTier(tierId) {
  if (!tierId || typeof tierId !== 'string') return null;
  return ORDERED_BRACKET_TIERS.find((t) => t.id === tierId) || null;
}

/**
 * Builds a normalized cycle descriptor for a deterministic macro-slot index.
 * @param {number} slotIndex
 * @param {object} [scheduleConfig]
 * @returns {object}
 */
export function buildScheduledCycle(slotIndex, scheduleConfig = SPORADIC_SCHEDULE_CONFIG) {
  const templates = APEX_TRIAL_TEMPLATES;
  const safeIndex = Math.max(0, Math.floor(slotIndex));
  const template = templates[safeIndex % templates.length];
  const slotMs = (scheduleConfig.slotDurationDays || 10) * DAY_MS;
  const startsAt = (scheduleConfig.epochMs || 0) + safeIndex * slotMs;
  const durationDays = Math.min(
    MAX_TRIAL_DURATION_DAYS,
    Math.max(MIN_TRIAL_DURATION_DAYS, template.durationDays)
  );
  const endsAt = startsAt + durationDays * DAY_MS;

  return Object.freeze({
    cycleId: `apex_cycle_${String(safeIndex + 1).padStart(3, '0')}_${template.id}`,
    slotIndex: safeIndex,
    templateId: template.id,
    title: template.title,
    subtitle: template.subtitle,
    description: template.description,
    durationDays,
    startsAt,
    endsAt,
    mutators: template.mutators,
    exclusiveTitle: template.exclusiveTitle,
    themeColor: template.themeColor,
    benchmarkThresholds: template.benchmarkThresholds
  });
}

/**
 * Resolves the sporadic Apex Trial window state for a given UTC timestamp.
 * Supports optional custom schedule entries (`[{ cycleId, templateId, startsAt, endsAt }]`)
 * for testing or server-pushed overrides.
 *
 * @param {number} [nowMs]
 * @param {Array<object>|null} [customSchedule]
 * @returns {{ state: string, nowMs: number, activeCycle: object|null, previousCycle: object|null, nextCycle: object|null }}
 */
export function resolveTrialScheduleWindow(nowMs = Date.now(), customSchedule = null) {
  const ts = Number.isFinite(Number(nowMs)) ? Number(nowMs) : Date.now();

  if (Array.isArray(customSchedule) && customSchedule.length > 0) {
    const normalized = customSchedule
      .map((entry) => {
        const tpl = getTrialTemplate(entry.templateId) || APEX_TRIAL_TEMPLATES[0];
        return Object.freeze({
          cycleId: String(entry.cycleId || `${tpl.id}_${entry.startsAt}`),
          slotIndex: Number(entry.slotIndex || 0),
          templateId: tpl.id,
          title: entry.title || tpl.title,
          subtitle: entry.subtitle || tpl.subtitle,
          description: entry.description || tpl.description,
          durationDays: Math.max(
            MIN_TRIAL_DURATION_DAYS,
            Math.min(MAX_TRIAL_DURATION_DAYS, Math.round((entry.endsAt - entry.startsAt) / DAY_MS) || tpl.durationDays)
          ),
          startsAt: Number(entry.startsAt),
          endsAt: Number(entry.endsAt),
          mutators: entry.mutators || tpl.mutators,
          exclusiveTitle: entry.exclusiveTitle || tpl.exclusiveTitle,
          themeColor: entry.themeColor || tpl.themeColor,
          benchmarkThresholds: entry.benchmarkThresholds || tpl.benchmarkThresholds
        });
      })
      .sort((a, b) => a.startsAt - b.startsAt);

    const activeCycle = normalized.find((c) => ts >= c.startsAt && ts < c.endsAt) || null;
    const past = normalized.filter((c) => c.endsAt <= ts);
    const future = normalized.filter((c) => c.startsAt > ts);

    return {
      state: activeCycle ? TRIAL_WINDOW_STATES.ACTIVE : TRIAL_WINDOW_STATES.INTERMISSION,
      nowMs: ts,
      activeCycle,
      previousCycle: past.length > 0 ? past[past.length - 1] : null,
      nextCycle: future.length > 0 ? future[0] : null
    };
  }

  const slotMs = SPORADIC_SCHEDULE_CONFIG.slotDurationDays * DAY_MS;
  const epochMs = SPORADIC_SCHEDULE_CONFIG.epochMs;
  const rawSlot = Math.floor((ts - epochMs) / slotMs);
  const slotIndex = Math.max(0, rawSlot);

  const currentSlotCycle = buildScheduledCycle(slotIndex);

  if (ts >= currentSlotCycle.startsAt && ts < currentSlotCycle.endsAt) {
    return {
      state: TRIAL_WINDOW_STATES.ACTIVE,
      nowMs: ts,
      activeCycle: currentSlotCycle,
      previousCycle: slotIndex > 0 ? buildScheduledCycle(slotIndex - 1) : null,
      nextCycle: buildScheduledCycle(slotIndex + 1)
    };
  }

  return {
    state: TRIAL_WINDOW_STATES.INTERMISSION,
    nowMs: ts,
    activeCycle: null,
    previousCycle: ts >= currentSlotCycle.endsAt ? currentSlotCycle : (slotIndex > 0 ? buildScheduledCycle(slotIndex - 1) : null),
    nextCycle: ts < currentSlotCycle.startsAt ? currentSlotCycle : buildScheduledCycle(slotIndex + 1)
  };
}

/**
 * Computes the UTC week index for Spark Vault deterministic rotation.
 * @param {number} [nowMs]
 * @returns {number}
 */
export function getUtcWeekIndex(nowMs = Date.now()) {
  const ts = Number.isFinite(Number(nowMs)) ? Number(nowMs) : Date.now();
  return Math.max(0, Math.floor(ts / WEEK_MS));
}

/**
 * Returns all Armory catalog items eligible for the Spark Vault (`unlockType === 'sparks'`)
 * enriched with Vault tier metadata.
 * @returns {Array<object>}
 */
export function getSparkVaultEligibleItems() {
  const eligible = [];
  for (const category of Object.values(ARMORY_CATEGORIES)) {
    const items = getCatalogByCategory(category);
    for (const item of items) {
      if (item && item.unlockType === UNLOCK_TYPES.SPARKS) {
        const meta = SPARK_VAULT_CATALOG_META[item.id] || {
          itemId: item.id,
          tierId: 'standard_prestige',
          tierLabel: 'Standard Prestige',
          sparksCost: Number(item.cost) || 40,
          rarity: 'PRESTIGE'
        };
        eligible.push(Object.freeze({
          ...item,
          vaultMeta: meta
        }));
      }
    }
  }
  return eligible;
}
