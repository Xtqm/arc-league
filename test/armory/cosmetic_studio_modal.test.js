/**
 * cosmetic_studio_modal.test.js
 * Comprehensive unit and integration test suite for:
 * In-Browser Developer Cosmetic Studio Interface (SPEC-ARMORY-001 Cosmetic Studio Dev GUI).
 */

import assert from 'assert';
import fs from 'fs';
import {
  ARMORY_CATEGORIES,
  UNLOCK_TYPES
} from '../../src/armory/ArmoryCatalog.js';
import {
  CosmeticStudioModal,
  STUDIO_CATEGORIES,
  getDefaultConfig,
  formatCatalogCode
} from '../../src/ui/modals/CosmeticStudioModal.js';
import { state } from '../../src/core/state.js';

console.log('--- Running Cosmetic Studio Dev GUI Test Suite (SPEC-ARMORY-001) ---');

// Mock Preview Scene
class MockPreviewScene {
  constructor(options = {}) {
    this.options = options;
    this.stagedType = null;
    this.stagedConfig = null;
    this.stagedMesh = {
      userData: {},
      material: { color: { set: () => {} } }
    };
    this.disposed = false;
  }

  previewDisc(config) {
    this.stagedType = 'disc';
    this.stagedConfig = config;
    this.stagedMesh = {
      isDisc: true,
      userData: { part: 'disc_outer' },
      material: { color: { set: () => {} } }
    };
  }

  previewChassis(config) {
    this.stagedType = 'chassis';
    this.stagedConfig = config;
    this.stagedMesh = {
      isChassis: true,
      userData: { part: 'chassis_suit' },
      material: { color: { set: () => {} } }
    };
  }

  dispose() {
    this.disposed = true;
    this.stagedMesh = null;
  }
}

// Mock Cosmetic Engine
function createMockCosmetics() {
  const appliedDiscCalls = [];
  const appliedChassisCalls = [];

  const mockPlayerDisc = {
    userData: { part: 'player_disc' },
    material: {}
  };

  const mockPlayerObj = {
    userData: {
      part: 'player_rig',
      backDisc: { userData: { part: 'back_disc' } }
    },
    material: {}
  };

  return {
    playerDiscMesh: mockPlayerDisc,
    playerObj: mockPlayerObj,
    appliedDiscCalls,
    appliedChassisCalls,
    applyDiscSkin: (mesh, skinOrConfig) => {
      appliedDiscCalls.push({ mesh, skinOrConfig });
      return true;
    },
    applyChassisSkin: (rig, skinOrConfig) => {
      appliedChassisCalls.push({ rig, skinOrConfig });
      return true;
    }
  };
}

// =========================================================================
// [Group 1] Modal Instantiation & Category Baseline Configurations
// =========================================================================
console.log('\n[Group 1] Testing Modal Instantiation & Baseline Configurations...');

const mockCosmetics = createMockCosmetics();
const modal = new CosmeticStudioModal({
  cosmetics: mockCosmetics,
  PreviewSceneClass: MockPreviewScene
});

assert.strictEqual(modal.activeCategory, ARMORY_CATEGORIES.DISC_SKINS, 'Defaults to DISC_SKINS category');
assert.strictEqual(STUDIO_CATEGORIES.length, 2, 'Must define 2 developer studio categories');
assert.strictEqual(STUDIO_CATEGORIES[0].id, ARMORY_CATEGORIES.DISC_SKINS);
assert.strictEqual(STUDIO_CATEGORIES[1].id, ARMORY_CATEGORIES.CHASSIS_SKINS);

const discDefault = getDefaultConfig(ARMORY_CATEGORIES.DISC_SKINS);
assert.strictEqual(discDefault.category, ARMORY_CATEGORIES.DISC_SKINS);
assert.strictEqual(typeof discDefault.id, 'string');
assert.strictEqual(typeof discDefault.shader.primaryHex, 'string');
assert.strictEqual(typeof discDefault.shader.secondaryEmissiveHex, 'string');
assert.strictEqual(typeof discDefault.shader.glowIntensity, 'number');
assert.strictEqual(typeof discDefault.shader.trailOpacity, 'number');
assert.strictEqual(typeof discDefault.shader.wireframeToggle, 'boolean');

const chassisDefault = getDefaultConfig(ARMORY_CATEGORIES.CHASSIS_SKINS);
assert.strictEqual(chassisDefault.category, ARMORY_CATEGORIES.CHASSIS_SKINS);
assert.strictEqual(typeof chassisDefault.shader.suitHex, 'string');
assert.strictEqual(typeof chassisDefault.shader.roughness, 'number');
assert.strictEqual(typeof chassisDefault.shader.metalness, 'number');
console.log('✓ Modal instantiation and baseline configurations verified.');

// =========================================================================
// [Group 2] Category Switching & Markup Generation
// =========================================================================
console.log('\n[Group 2] Testing Category Switching & Markup Generation...');

const initialMarkup = modal.render();
assert(initialMarkup.includes('COSMETIC STUDIO'), 'Must render COSMETIC STUDIO title');
assert(initialMarkup.includes('[DEV GUI]'), 'Must render [DEV GUI] tag');
assert(initialMarkup.includes('KINETIC DISCS'), 'Must render KINETIC DISCS tab');
assert(initialMarkup.includes('ATHLETE RIGS'), 'Must render ATHLETE RIGS tab');
assert(initialMarkup.includes('studioPreviewMount'), 'Must include 3D turntable preview mount');
assert(initialMarkup.includes('studioBtnTest'), 'Must include Test on Player action button');
assert(initialMarkup.includes('studioBtnCopy'), 'Must include Copy Catalog Code action button');
assert(initialMarkup.includes('studioColorPrimary'), 'Must render primary emissive color picker');
assert(initialMarkup.includes('studioColorSecondary'), 'Must render secondary emissive color picker');
assert(initialMarkup.includes('studioSliderGlow'), 'Must render glow slider');
assert(initialMarkup.includes('studioSliderTrail'), 'Must render flight trail opacity slider');
assert(initialMarkup.includes('studioCheckWireframe'), 'Must render wireframe overlay toggle');
assert(initialMarkup.includes('studioSelectShape'), 'Must render procedural shape selector');
assert(initialMarkup.includes('studioCheckParticles'), 'Must render ricochet particles toggle');
assert(initialMarkup.includes('studioColorSpark'), 'Must render spark color picker');
assert(initialMarkup.includes('studioSliderSparkCount'), 'Must render spark count slider');

// Switch to Athlete Rigs
modal.switchCategory(ARMORY_CATEGORIES.CHASSIS_SKINS);
assert.strictEqual(modal.activeCategory, ARMORY_CATEGORIES.CHASSIS_SKINS, 'Category must update to CHASSIS_SKINS');
assert.strictEqual(modal.currentConfig.category, ARMORY_CATEGORIES.CHASSIS_SKINS);

const chassisControls = modal.renderControls();
assert(chassisControls.includes('studioColorSuit'), 'Chassis controls must render suit armor color picker');
assert(chassisControls.includes('studioSliderRoughness'), 'Chassis controls must render micro-roughness slider');
assert(chassisControls.includes('studioSliderMetalness'), 'Chassis controls must render metallic plating slider');

// Switch back to Discs
modal.switchCategory(ARMORY_CATEGORIES.DISC_SKINS);
assert.strictEqual(modal.activeCategory, ARMORY_CATEGORIES.DISC_SKINS);
const discControls = modal.renderControls();
assert(!discControls.includes('studioColorSuit'), 'Disc controls must omit chassis-specific suit color picker');
console.log('✓ Category switching and reactive markup generation verified.');

// =========================================================================
// [Group 3] Parameter Serialization & Catalog Code Generation
// =========================================================================
console.log('\n[Group 3] Testing Parameter Serialization & Catalog Code Generation...');

const sampleDiscConfig = {
  id: 'disc_cyber_nova',
  displayName: 'Cyber Nova',
  category: ARMORY_CATEGORIES.DISC_SKINS,
  description: 'Ultra-hot cyan plasma disc with pulsed secondary ionization.',
  unlockType: UNLOCK_TYPES.BITS,
  cost: 750,
  achievementId: null,
  shader: {
    primaryHex: '#00ffff',
    secondaryEmissiveHex: '#0033aa',
    trailOpacity: 0.9,
    wireframeToggle: true,
    glowIntensity: 2.4
  }
};

const discCode = formatCatalogCode(sampleDiscConfig);
assert(discCode.includes("id: 'disc_cyber_nova'"), 'Must serialize item ID');
assert(discCode.includes("displayName: 'Cyber Nova'"), 'Must serialize display name');
assert(discCode.includes("category: ARMORY_CATEGORIES.DISC_SKINS"), 'Must serialize ARMORY_CATEGORIES constant');
assert(discCode.includes("unlockType: UNLOCK_TYPES.BITS"), 'Must serialize UNLOCK_TYPES constant');
assert(discCode.includes("cost: 750"), 'Must serialize numeric credit cost');
assert(discCode.includes("primaryHex: '#00ffff'"), 'Must serialize primary hex');
assert(discCode.includes("secondaryEmissiveHex: '#0033aa'"), 'Must serialize secondary hex');
assert(discCode.includes("glowIntensity: 2.4"), 'Must serialize glow intensity');
assert(discCode.includes("wireframeToggle: true"), 'Must serialize wireframe boolean');
assert(discCode.includes("Object.freeze("), 'Must wrap with Object.freeze');

const shapedDiscConfig = {
  id: 'disc_custom_triangle',
  displayName: 'Delta Triad Custom',
  category: ARMORY_CATEGORIES.DISC_SKINS,
  description: 'Custom tri-blade prototype.',
  shape: 'triangle',
  unlockType: UNLOCK_TYPES.BITS,
  cost: 950,
  achievementId: null,
  shader: {
    primaryHex: '#00f3ff',
    secondaryEmissiveHex: '#0066ff',
    trailOpacity: 0.9,
    wireframeToggle: true,
    glowIntensity: 2.2
  },
  particles: {
    ricochetSparks: true,
    sparkColorHex: '#ff0055',
    sparkCount: 24
  }
};
const shapedCode = formatCatalogCode(shapedDiscConfig);
assert(shapedCode.includes("shape: 'triangle'"), 'Must serialize shape property');
assert(shapedCode.includes("particles: Object.freeze("), 'Must serialize particles object');
assert(shapedCode.includes("ricochetSparks: true"), 'Must serialize ricochetSparks boolean');
assert(shapedCode.includes("sparkColorHex: '#ff0055'"), 'Must serialize spark color hex');
assert(shapedCode.includes("sparkCount: 24"), 'Must serialize spark count');

const sampleChassisConfig = {
  id: 'chassis_stealth_ninja',
  displayName: 'Stealth Infiltrator',
  category: ARMORY_CATEGORIES.CHASSIS_SKINS,
  description: 'Matte composite plating designed for minimal radar profile.',
  unlockType: UNLOCK_TYPES.FREE,
  cost: 0,
  achievementId: null,
  shader: {
    primaryHex: '#00e5ff',
    secondaryEmissiveHex: '#001133',
    trailOpacity: 0.7,
    wireframeToggle: false,
    glowIntensity: 1.0,
    suitHex: '#05070a',
    roughness: 0.9,
    metalness: 0.15
  }
};

const chassisCode = formatCatalogCode(sampleChassisConfig);
assert(chassisCode.includes("category: ARMORY_CATEGORIES.CHASSIS_SKINS"), 'Must serialize CHASSIS_SKINS constant');
assert(chassisCode.includes("suitHex: '#05070a'"), 'Must serialize suit armor hex');
assert(chassisCode.includes("roughness: 0.9"), 'Must serialize roughness');
assert(chassisCode.includes("metalness: 0.15"), 'Must serialize metalness');

// Test copyCatalogCode method execution
modal.currentConfig = sampleDiscConfig;
const copiedCode = modal.copyCatalogCode();
assert.strictEqual(copiedCode, discCode, 'copyCatalogCode must return formatted code string');

// Test clipboard write integration
let writtenClipboardText = '';
const hadNavigator = typeof globalThis.navigator !== 'undefined';
const navigatorObject = hadNavigator ? globalThis.navigator : {};
if (!hadNavigator) {
  Object.defineProperty(globalThis, 'navigator', {
    value: navigatorObject,
    configurable: true,
    writable: true
  });
}
const origClipboardDesc = Object.getOwnPropertyDescriptor(navigatorObject, 'clipboard');
Object.defineProperty(navigatorObject, 'clipboard', {
  value: {
    writeText: async (txt) => {
      writtenClipboardText = txt;
      return Promise.resolve();
    }
  },
  configurable: true
});

modal.copyCatalogCode();
assert.strictEqual(writtenClipboardText, discCode, 'Must write formatted catalog code to system clipboard');

if (origClipboardDesc) {
  Object.defineProperty(navigatorObject, 'clipboard', origClipboardDesc);
} else {
  delete navigatorObject.clipboard;
}
if (!hadNavigator) {
  delete globalThis.navigator;
}

// Test 8-digit and 4-digit hex sanitization on catalog export
const unnormalizedConfig = {
  id: 'disc_unnormalized',
  displayName: 'Unnormalized Disc',
  category: ARMORY_CATEGORIES.DISC_SKINS,
  shader: {
    primaryHex: '#000000ff',
    secondaryEmissiveHex: '#ff0055aa'
  },
  particles: {
    ricochetSparks: true,
    sparkColorHex: '#000f'
  }
};
const unnormalizedExport = formatCatalogCode(unnormalizedConfig);
assert(unnormalizedExport.includes("primaryHex: '#000000'"), 'formatCatalogCode must strip alpha to 6-digit primary hex');
assert(unnormalizedExport.includes("secondaryEmissiveHex: '#ff0055'"), 'formatCatalogCode must strip alpha to 6-digit secondary hex');
assert(unnormalizedExport.includes("sparkColorHex: '#000000'"), 'formatCatalogCode must expand 4-digit spark hex to 6-digit hex');

console.log('✓ Schema-compliant ArmoryCatalog code generator formatting verified.');

// =========================================================================
// [Group 4] 3D Turntable Preview Bay & In-Place Material Mutation
// =========================================================================
console.log('\n[Group 4] Testing 3D Turntable Preview Bay & In-Place Mutation...');

const testPreview = new MockPreviewScene();
modal.previewScene = testPreview;

// Staging Disc
modal.activeCategory = ARMORY_CATEGORIES.DISC_SKINS;
modal.currentConfig = getDefaultConfig(ARMORY_CATEGORIES.DISC_SKINS);
modal._updatePreviewSceneModel();
assert.strictEqual(testPreview.stagedType, 'disc', 'Turntable must stage disc for DISC_SKINS');
assert.strictEqual(testPreview.stagedConfig, modal.currentConfig);

// Staging Chassis
modal.activeCategory = ARMORY_CATEGORIES.CHASSIS_SKINS;
modal.currentConfig = getDefaultConfig(ARMORY_CATEGORIES.CHASSIS_SKINS);
modal._updatePreviewSceneModel();
assert.strictEqual(testPreview.stagedType, 'chassis', 'Turntable must stage chassis for CHASSIS_SKINS');
assert.strictEqual(testPreview.stagedConfig, modal.currentConfig);

// In-place material updates
modal.updateMaterial();
assert.ok(mockCosmetics.appliedChassisCalls.length > 0, 'updateMaterial must invoke applyChassisSkin on staged mesh');

modal.activeCategory = ARMORY_CATEGORIES.DISC_SKINS;
modal.updateMaterial();
assert.ok(mockCosmetics.appliedDiscCalls.length > 0, 'updateMaterial must invoke applyDiscSkin on staged mesh');

// Verify real-time DOM input event handlers mutate config and materials
const mockElements = {
  '#studioColorPrimary': { value: '#ff3300' },
  '#studioHexPrimary': { textContent: '' },
  '#studioSliderGlow': { value: '3.5' },
  '#studioValGlow': { textContent: '' },
  '#studioCheckWireframe': { checked: true },
  '#studioSelectShape': { value: 'shuriken_4' },
  '#studioCheckParticles': { checked: true },
  '#studioColorSpark': { value: '#ff00aa' },
  '#studioHexSpark': { textContent: '' },
  '#studioSliderSparkCount': { value: '28' },
  '#studioValSparkCount': { textContent: '' }
};
const mockRoot = {
  querySelector: (sel) => mockElements[sel] || null,
  querySelectorAll: () => []
};
modal._bindControlInputs(mockRoot);

const prevDiscCalls = mockCosmetics.appliedDiscCalls.length;
mockElements['#studioColorPrimary'].oninput({ target: { value: '#ff3300' } });
assert.strictEqual(modal.currentConfig.shader.primaryHex, '#ff3300');
assert.strictEqual(mockElements['#studioHexPrimary'].textContent, '#FF3300');
assert.ok(mockCosmetics.appliedDiscCalls.length > prevDiscCalls, 'Color input event must immediately mutate material');

mockElements['#studioSliderGlow'].oninput({ target: { value: '3.5' } });
assert.strictEqual(modal.currentConfig.shader.glowIntensity, 3.5);
assert.strictEqual(mockElements['#studioValGlow'].textContent, '3.5');

mockElements['#studioCheckWireframe'].onchange({ target: { checked: true } });
assert.strictEqual(modal.currentConfig.shader.wireframeToggle, true);

mockElements['#studioSelectShape'].onchange({ target: { value: 'shuriken_4' } });
assert.strictEqual(modal.currentConfig.shape, 'shuriken_4', 'Shape change must update currentConfig.shape');

mockElements['#studioCheckParticles'].onchange({ target: { checked: true } });
assert.strictEqual(modal.currentConfig.particles.ricochetSparks, true, 'Particle checkbox must update ricochetSparks');

mockElements['#studioColorSpark'].oninput({ target: { value: '#ff00aa' } });
assert.strictEqual(modal.currentConfig.particles.sparkColorHex, '#ff00aa', 'Spark color input must update sparkColorHex');
assert.strictEqual(mockElements['#studioHexSpark'].textContent, '#FF00AA');

mockElements['#studioSliderSparkCount'].oninput({ target: { value: '28' } });
assert.strictEqual(modal.currentConfig.particles.sparkCount, 28, 'Spark count slider must update sparkCount');
assert.strictEqual(mockElements['#studioValSparkCount'].textContent, '28');
console.log('✓ 3D turntable preview staging and zero-delay in-place mutation verified.');

// =========================================================================
// [Group 5] Live In-Game Player Testing Action
// =========================================================================
console.log('\n[Group 5] Testing Live In-Game Player Testing Action...');

const initialDiscCalls = mockCosmetics.appliedDiscCalls.length;
const initialChassisCalls = mockCosmetics.appliedChassisCalls.length;

// Test applying disc to player
modal.activeCategory = ARMORY_CATEGORIES.DISC_SKINS;
const discTestResult = modal.testOnPlayer();
assert.strictEqual(discTestResult, true, 'testOnPlayer must succeed');
assert.ok(mockCosmetics.appliedDiscCalls.length > initialDiscCalls, 'Must apply skin to live player disc meshes');

// Test applying chassis to player
modal.activeCategory = ARMORY_CATEGORIES.CHASSIS_SKINS;
const chassisTestResult = modal.testOnPlayer();
assert.strictEqual(chassisTestResult, true, 'testOnPlayer must succeed');
assert.ok(mockCosmetics.appliedChassisCalls.length > initialChassisCalls, 'Must apply skin to live player chassis rig');

// Test button click binding for #studioBtnTest
const testBtnMock = { onclick: null };
modal.bindEvents({
  querySelector: (sel) => (sel === '#studioBtnTest' ? testBtnMock : null),
  querySelectorAll: () => []
});
assert.strictEqual(typeof testBtnMock.onclick, 'function', 'bindEvents must wire onclick handler to #studioBtnTest');
const preBtnCalls = mockCosmetics.appliedChassisCalls.length;
testBtnMock.onclick();
assert.ok(mockCosmetics.appliedChassisCalls.length > preBtnCalls, 'Clicking #studioBtnTest must execute testOnPlayer');
console.log('✓ Direct application of prototype designs to active gameplay meshes verified.');

// =========================================================================
// [Group 6] Lifecycle Teardown & WebGL Resource Management
// =========================================================================
console.log('\n[Group 6] Testing Lifecycle Teardown & WebGL Disposal...');

let closeCallbackFired = false;
modal.setOnClose(() => { closeCallbackFired = true; });

state.armoryModalOpen = true;
modal._isOpen = true;
modal.previewScene = testPreview;

modal.hide();
assert.strictEqual(modal._isOpen, false, 'Modal open state must be false');
assert.strictEqual(state.armoryModalOpen, false, 'Global armoryModalOpen flag must be reset');
assert.strictEqual(testPreview.disposed, true, 'Preview scene dispose must be invoked to release WebGL memory');
assert.strictEqual(modal.previewScene, null, 'Preview scene reference must be cleared');
assert.strictEqual(closeCallbackFired, true, 'onClose callback must be triggered on modal hide');

// dispose() alias check
modal.previewScene = new MockPreviewScene();
modal.dispose();
assert.strictEqual(modal.previewScene, null, 'dispose() must cleanly execute teardown');

// Verify DOM container mounting, visibility toggling and unmounting
const mockContainer = {
  style: { display: 'none' },
  innerHTML: '',
  querySelector: () => null,
  querySelectorAll: () => []
};
const mountTestModal = new CosmeticStudioModal({
  container: mockContainer,
  cosmetics: mockCosmetics,
  PreviewSceneClass: MockPreviewScene
});

mountTestModal.show();
assert.strictEqual(mountTestModal.isOpen(), true, 'isOpen() must return true when mounted');
assert.strictEqual(mockContainer.style.display, 'flex', 'Container display must be flex');
assert.ok(mockContainer.innerHTML.includes('cosmetic-studio-card'), 'Container must receive modal card HTML');

mountTestModal.hide();
assert.strictEqual(mountTestModal.isOpen(), false, 'isOpen() must return false after hide');
assert.strictEqual(mockContainer.style.display, 'none', 'Container display must be set to none');
assert.strictEqual(mockContainer.innerHTML, '', 'Container HTML must be cleared on hide');
console.log('✓ Studio lifecycle teardown and WebGL resource disposal verified.');

// =========================================================================
// [Group 7] HTML Template & CSS Integration Checks
// =========================================================================
console.log('\n[Group 7] Testing index.html Static DOM Container & Stylesheet...');

const indexHtml = fs.readFileSync(new URL('../../index.html', import.meta.url), 'utf8');
assert(indexHtml.includes('id="cosmeticStudioModal"'), 'index.html must declare #cosmeticStudioModal container');
assert(indexHtml.includes('.cosmetic-studio-modal'), 'index.html must define .cosmetic-studio-modal CSS');
assert(indexHtml.includes('.cosmetic-studio-card'), 'index.html must define .cosmetic-studio-card CSS');
assert(indexHtml.includes('.studio-preview-bay'), 'index.html must define .studio-preview-bay CSS');
assert(indexHtml.includes('.studio-action-btn'), 'index.html must define .studio-action-btn CSS');
console.log('✓ index.html DOM container and cyber-grid stylesheet rules verified.');

console.log('\n=================================================================');
console.log('ALL COSMETIC STUDIO DEV GUI TESTS PASSED (100% SUCCESS)');
console.log('=================================================================');
