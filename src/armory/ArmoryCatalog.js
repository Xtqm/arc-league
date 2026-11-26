/**
 * ArmoryCatalog.js
 * Authoritative cosmetic, arena, and loadout catalog registry for Tron Disc Arena (SPEC-ARMORY-001).
 * Defines structured metadata, Three.js-compatible shader parameters, and unlock criteria
 * across discSkins, chassisSkins, unlockedMaps, and discTypes.
 */

export const ARMORY_CATEGORIES = Object.freeze({
  DISC_SKINS: 'discSkins',
  CHASSIS_SKINS: 'chassisSkins',
  UNLOCKED_MAPS: 'unlockedMaps',
  DISC_TYPES: 'discTypes'
});

export const ARMORY_CATEGORY_LABELS = Object.freeze({
  [ARMORY_CATEGORIES.DISC_SKINS]: 'KINETIC DISCS',
  [ARMORY_CATEGORIES.CHASSIS_SKINS]: 'ATHLETE RIGS',
  [ARMORY_CATEGORIES.UNLOCKED_MAPS]: 'STADIUM ARENAS',
  [ARMORY_CATEGORIES.DISC_TYPES]: 'DISC PROTOCOLS'
});

export const UNLOCK_TYPES = Object.freeze({
  FREE: 'free',
  BITS: 'bits',
  CREDITS: 'credits',
  SPARKS: 'sparks',
  ACHIEVEMENT: 'achievement'
});

/**
 * Structured Armory Catalog Definition
 */
export const ARMORY_CATALOG = Object.freeze({
  discSkins: Object.freeze([
    Object.freeze({
      id: 'disc_default',
      displayName: 'Arc Standard',
      category: ARMORY_CATEGORIES.DISC_SKINS,
      description: 'Standard issuance kinetic disc with balanced resonance for Arcfield matches.',
      unlockType: UNLOCK_TYPES.FREE,
      cost: 0,
      achievementId: null,
      shader: Object.freeze({
        primaryHex: '#00f3ff',
        secondaryEmissiveHex: '#0066ff',
        trailOpacity: 0.85,
        wireframeToggle: false,
        glowIntensity: 1.5
      })
    }),
    Object.freeze({
      id: 'disc_neon_amber',
      displayName: 'Neon Amber',
      category: ARMORY_CATEGORIES.DISC_SKINS,
      description: 'High-energy amber photon stream disc with golden ionization.',
      unlockType: UNLOCK_TYPES.BITS,
      cost: 1200,
      achievementId: null,
      shader: Object.freeze({
        primaryHex: '#ffaa00',
        secondaryEmissiveHex: '#ff4400',
        trailOpacity: 0.9,
        wireframeToggle: false,
        glowIntensity: 1.8
      })
    }),
    Object.freeze({
      id: 'disc_retro_green',
      displayName: 'Phosphor Green',
      category: ARMORY_CATEGORIES.DISC_SKINS,
      description: 'Vintage phosphor green terminal glow recalling early Sub-Strata origins.',
      unlockType: UNLOCK_TYPES.BITS,
      cost: 2000,
      achievementId: null,
      shader: Object.freeze({
        primaryHex: '#00ff66',
        secondaryEmissiveHex: '#00aa33',
        trailOpacity: 0.85,
        wireframeToggle: false,
        glowIntensity: 1.6
      })
    }),
    Object.freeze({
      id: 'disc_plasma_violet',
      displayName: 'Plasma Violet',
      category: ARMORY_CATEGORIES.DISC_SKINS,
      description: 'Deep ultraviolet plasma weave radiating synthwave harmonics.',
      unlockType: UNLOCK_TYPES.BITS,
      cost: 3500,
      achievementId: null,
      shader: Object.freeze({
        primaryHex: '#bd00ff',
        secondaryEmissiveHex: '#7700ff',
        trailOpacity: 0.95,
        wireframeToggle: false,
        glowIntensity: 2.0
      })
    }),
    Object.freeze({
      id: 'disc_corrupted_void',
      displayName: 'Void Core',
      category: ARMORY_CATEGORIES.DISC_SKINS,
      description: 'Obsidian frame forged from unallocated sectors of the deep void.',
      shape: 'circle',
      unlockType: UNLOCK_TYPES.ACHIEVEMENT,
      cost: 0,
      achievementId: 'corrupted_void_mastery',
      shader: Object.freeze({
        primaryHex: '#ff0033',
        secondaryEmissiveHex: '#660011',
        trailOpacity: 0.9,
        wireframeToggle: true,
        glowIntensity: 2.2
      }),
      particles: null
    }),
    Object.freeze({
      id: 'disc_delta_triad',
      displayName: 'Delta Triad',
      category: ARMORY_CATEGORIES.DISC_SKINS,
      description: 'Aerodynamic tri-blade kinetic disc with high-frequency particle emission.',
      shape: 'triangle',
      unlockType: UNLOCK_TYPES.BITS,
      cost: 5500,
      achievementId: null,
      shader: Object.freeze({
        primaryHex: '#00f3ff',
        secondaryEmissiveHex: '#0066ff',
        trailOpacity: 0.9,
        wireframeToggle: false,
        glowIntensity: 2.2
      }),
      particles: Object.freeze({
        ricochetSparks: true,
        sparkColorHex: '#00f3ff',
        sparkCount: 16
      })
    }),
    Object.freeze({
      id: 'disc_quantum_quad',
      displayName: 'Quantum Quad',
      category: ARMORY_CATEGORIES.DISC_SKINS,
      description: 'Diamond rotor disc generating balanced 4-pole quantum ionization fields.',
      shape: 'square',
      unlockType: UNLOCK_TYPES.BITS,
      cost: 8000,
      achievementId: null,
      shader: Object.freeze({
        primaryHex: '#00ffcc',
        secondaryEmissiveHex: '#0088aa',
        trailOpacity: 0.9,
        wireframeToggle: false,
        glowIntensity: 2.0
      }),
      particles: Object.freeze({
        ricochetSparks: true,
        sparkColorHex: '#00ffcc',
        sparkCount: 20
      })
    }),
    Object.freeze({
      id: 'disc_shuriken_void',
      displayName: 'Void Shuriken',
      category: ARMORY_CATEGORIES.DISC_SKINS,
      description: 'Aggressive multi-bladed energy star forging intense crimson ricochet sparks.',
      shape: 'shuriken_4',
      unlockType: UNLOCK_TYPES.SPARKS,
      cost: 100,
      achievementId: null,
      shader: Object.freeze({
        primaryHex: '#ff0055',
        secondaryEmissiveHex: '#660022',
        trailOpacity: 0.95,
        wireframeToggle: true,
        glowIntensity: 2.4
      }),
      particles: Object.freeze({
        ricochetSparks: true,
        sparkColorHex: '#ff0055',
        sparkCount: 24
      })
    }),
    Object.freeze({
      id: 'disc_hex_dark_matter',
      displayName: 'Dark Matter',
      category: ARMORY_CATEGORIES.DISC_SKINS,
      description: 'Found in the lake of dark matter',
      shape: 'hexagon',
      unlockType: UNLOCK_TYPES.SPARKS,
      cost: 75,
      achievementId: null,
      shader: Object.freeze({
        primaryHex: '#000000',
        secondaryEmissiveHex: '#ffffff',
        trailOpacity: 0.7,
        wireframeToggle: true,
        glowIntensity: 2.1
      }),
      particles: Object.freeze({
        ricochetSparks: true,
        sparkColorHex: '#ffffff',
        sparkCount: 20
      })
    })
  ]),

  chassisSkins: Object.freeze([
    Object.freeze({
      id: 'chassis_default',
      displayName: 'Striker Rig Default',
      category: ARMORY_CATEGORIES.CHASSIS_SKINS,
      description: 'Standard Arc League athlete chassis with balanced aerodynamic plating.',
      unlockType: UNLOCK_TYPES.FREE,
      cost: 0,
      achievementId: null,
      shader: Object.freeze({
        primaryHex: '#00f3ff',
        secondaryEmissiveHex: '#0066ff',
        trailOpacity: 0.8,
        wireframeToggle: false,
        glowIntensity: 1.2,
        suitHex: '#1e2631',
        roughness: 0.38,
        metalness: 0.78
      })
    }),
    Object.freeze({
      id: 'chassis_infiltrator',
      displayName: 'Vanguard Scout',
      category: ARMORY_CATEGORIES.CHASSIS_SKINS,
      description: 'Sleek stealth athlete frame minimizing radar cross-section with matte finish.',
      unlockType: UNLOCK_TYPES.BITS,
      cost: 2500,
      achievementId: null,
      shader: Object.freeze({
        primaryHex: '#00d4ff',
        secondaryEmissiveHex: '#002244',
        trailOpacity: 0.6,
        wireframeToggle: false,
        glowIntensity: 1.0,
        suitHex: '#040608',
        roughness: 0.85,
        metalness: 0.2
      })
    }),
    Object.freeze({
      id: 'chassis_iso_guardian',
      displayName: 'Aegis Guardian',
      category: ARMORY_CATEGORIES.CHASSIS_SKINS,
      description: 'Reinforced kinetic frame with radiant solar circuit highlights.',
      unlockType: UNLOCK_TYPES.BITS,
      cost: 5000,
      achievementId: null,
      shader: Object.freeze({
        primaryHex: '#ffea00',
        secondaryEmissiveHex: '#ff8800',
        trailOpacity: 0.85,
        wireframeToggle: false,
        glowIntensity: 1.6,
        suitHex: '#121210',
        roughness: 0.2,
        metalness: 0.95
      })
    }),
    Object.freeze({
      id: 'chassis_black_guard',
      displayName: 'Obsidian Enforcer',
      category: ARMORY_CATEGORIES.CHASSIS_SKINS,
      description: 'Intimidating pro-circuit plating with aggressive thermal flares.',
      unlockType: UNLOCK_TYPES.BITS,
      cost: 9500,
      achievementId: null,
      shader: Object.freeze({
        primaryHex: '#ff2200',
        secondaryEmissiveHex: '#550000',
        trailOpacity: 0.9,
        wireframeToggle: false,
        glowIntensity: 1.8,
        suitHex: '#0a0404',
        roughness: 0.3,
        metalness: 0.9
      })
    }),
    Object.freeze({
      id: 'chassis_arbiter',
      displayName: 'Sovereign Arbiter',
      category: ARMORY_CATEGORIES.CHASSIS_SKINS,
      description: 'Opulent ivory and gold champion frame awarded for mastering Circuit 01.',
      unlockType: UNLOCK_TYPES.ACHIEVEMENT,
      cost: 0,
      achievementId: 'grid_01_mastery',
      shader: Object.freeze({
        primaryHex: '#ffffff',
        secondaryEmissiveHex: '#ddaa00',
        trailOpacity: 1.0,
        wireframeToggle: true,
        glowIntensity: 2.5,
        suitHex: '#e0e0e0',
        roughness: 0.15,
        metalness: 0.85
      })
    })
  ]),

  unlockedMaps: Object.freeze([
    Object.freeze({
      id: 'arena_grid_01',
      displayName: 'Arcfield 01: Prime Stadium',
      category: ARMORY_CATEGORIES.UNLOCKED_MAPS,
      description: 'The canonical 92m x 92m premier digital sport arena.',
      unlockType: UNLOCK_TYPES.FREE,
      cost: 0,
      achievementId: null,
      shader: Object.freeze({
        primaryHex: '#00e5ff',
        secondaryEmissiveHex: '#003366',
        trailOpacity: 0.8,
        wireframeToggle: false,
        glowIntensity: 1.0
      })
    }),
    Object.freeze({
      id: 'arena_zero_g_nexus',
      displayName: 'Zero-G Nexus',
      category: ARMORY_CATEGORIES.UNLOCKED_MAPS,
      description: 'Floating hexagonal platforms with low-gravity trajectory dynamics.',
      unlockType: UNLOCK_TYPES.BITS,
      cost: 10000,
      achievementId: null,
      shader: Object.freeze({
        primaryHex: '#00ffcc',
        secondaryEmissiveHex: '#0044ff',
        trailOpacity: 0.85,
        wireframeToggle: false,
        glowIntensity: 1.5
      })
    }),
    Object.freeze({
      id: 'arena_derez_chasm',
      displayName: 'Vectorfall Abyss',
      category: ARMORY_CATEGORIES.UNLOCKED_MAPS,
      description: 'Narrow high-velocity bridges suspended over an endless null void.',
      unlockType: UNLOCK_TYPES.BITS,
      cost: 15000,
      achievementId: null,
      shader: Object.freeze({
        primaryHex: '#ff3366',
        secondaryEmissiveHex: '#880022',
        trailOpacity: 0.9,
        wireframeToggle: true,
        glowIntensity: 1.8
      })
    })
  ]),

  discTypes: Object.freeze([
    Object.freeze({
      id: 'disc_standard',
      displayName: 'Standard Balancer',
      category: ARMORY_CATEGORIES.DISC_TYPES,
      description: 'Standard tournament disc offering perfectly balanced speed, curve, and mass.',
      unlockType: UNLOCK_TYPES.FREE,
      cost: 0,
      achievementId: null,
      shader: Object.freeze({
        primaryHex: '#00f3ff',
        secondaryEmissiveHex: '#0066ff',
        trailOpacity: 0.85,
        wireframeToggle: false,
        glowIntensity: 1.5
      }),
      statModifiers: Object.freeze({
        speed: 1.0,
        damage: 1.0,
        curveRate: 1.0
      })
    })
  ])
});

/**
 * Checks whether the category name is recognized by the Armory.
 * @param {string} category
 * @returns {boolean}
 */
export function isValidCategory(category) {
  return Object.values(ARMORY_CATEGORIES).includes(category);
}

/**
 * Dynamic registry map for runtime / developer custom catalog items.
 * @type {Map<string, object>}
 */
const _dynamicItems = new Map();

/**
 * Registers an item dynamically into the catalog at runtime.
 * Useful for dev experimentation, live modding, and dev tools without editing source files.
 * @param {object} item
 * @returns {boolean} True if successfully registered
 */
export function registerCatalogItem(item) {
  if (!item || typeof item !== 'object' || !item.id || !isValidCategory(item.category)) {
    return false;
  }
  _dynamicItems.set(item.id, Object.freeze({ ...item }));
  return true;
}

/**
 * Unregisters a dynamically added catalog item by ID.
 * @param {string} itemId
 * @returns {boolean} True if removed, false if not found
 */
export function unregisterCatalogItem(itemId) {
  return _dynamicItems.delete(itemId);
}

/**
 * Clears all dynamically registered items.
 */
export function clearDynamicCatalog() {
  _dynamicItems.clear();
}

/**
 * Retrieves all catalog items for a given category (including runtime additions).
 * @param {string} category e.g. 'discSkins', 'chassisSkins', 'unlockedMaps', 'discTypes'
 * @returns {Array<object>} Array of item definitions, or empty array if category is invalid
 */
export function getCatalogByCategory(category) {
  if (!isValidCategory(category)) {
    return [];
  }
  const baseItems = ARMORY_CATALOG[category] || [];
  const dynamicItems = Array.from(_dynamicItems.values()).filter((item) => item.category === category);
  return [...baseItems, ...dynamicItems];
}

/**
 * Finds a specific catalog item by its unique ID across all categories and dynamic entries.
 * @param {string} itemId e.g. 'disc_neon_amber'
 * @returns {object|null} Catalog item object or null if not found
 */
export function getCatalogItem(itemId) {
  if (!itemId || typeof itemId !== 'string') {
    return null;
  }
  if (_dynamicItems.has(itemId)) {
    return _dynamicItems.get(itemId);
  }
  for (const categoryKey of Object.values(ARMORY_CATEGORIES)) {
    const items = ARMORY_CATALOG[categoryKey] || [];
    const found = items.find((item) => item.id === itemId);
    if (found) {
      return found;
    }
  }
  return null;
}

/**
 * Returns a flat array of all catalog items across all categories and dynamic entries.
 * @returns {Array<object>}
 */
export function getAllCatalogItems() {
  const allItems = [];
  for (const categoryKey of Object.values(ARMORY_CATEGORIES)) {
    allItems.push(...(ARMORY_CATALOG[categoryKey] || []));
  }
  allItems.push(...Array.from(_dynamicItems.values()));
  return allItems;
}
