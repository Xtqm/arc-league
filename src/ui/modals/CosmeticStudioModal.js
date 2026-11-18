/**
 * CosmeticStudioModal.js
 * In-Browser Developer Cosmetic Studio Interface for Tron Disc Arena (SPEC-ARMORY-001).
 * Provides real-time parameter tuning, 3D turntable preview, live in-game player testing,
 * and one-click schema-compliant ArmoryCatalog JavaScript code export.
 */

import {
  ARMORY_CATEGORIES,
  UNLOCK_TYPES
} from '../../armory/ArmoryCatalog.js';
import {
  armoryManager as defaultArmoryManager
} from '../../armory/ArmoryManager.js';
import {
  cosmeticMaterialEngine as defaultCosmeticEngine
} from '../../armory/CosmeticMaterialEngine.js';
import { ArmoryPreviewScene } from '../../armory/ArmoryPreviewScene.js';
import { state } from '../../core/state.js';
import { setCursor } from '../../input/InputManager.js';

export const STUDIO_CATEGORIES = Object.freeze([
  { id: ARMORY_CATEGORIES.DISC_SKINS, label: 'KINETIC DISCS' },
  { id: ARMORY_CATEGORIES.CHASSIS_SKINS, label: 'ATHLETE RIGS' }
]);

/**
 * Returns default configuration baseline for a selected studio category.
 * @param {string} category
 * @returns {object}
 */
export function getDefaultConfig(category) {
  if (category === ARMORY_CATEGORIES.CHASSIS_SKINS) {
    return {
      id: 'chassis_custom_01',
      displayName: 'Custom Athlete Rig',
      category: ARMORY_CATEGORIES.CHASSIS_SKINS,
      description: 'Custom prototype athlete rig chassis created in developer studio.',
      unlockType: UNLOCK_TYPES.FREE,
      cost: 0,
      achievementId: null,
      shader: {
        primaryHex: '#00f3ff',
        secondaryEmissiveHex: '#0066ff',
        trailOpacity: 0.8,
        wireframeToggle: false,
        glowIntensity: 1.2,
        suitHex: '#1e2631',
        roughness: 0.38,
        metalness: 0.78
      }
    };
  }

  return {
    id: 'disc_custom_01',
    displayName: 'Custom Kinetic Disc',
    category: ARMORY_CATEGORIES.DISC_SKINS,
    description: 'Custom prototype kinetic disc created in developer studio.',
    unlockType: UNLOCK_TYPES.FREE,
    cost: 0,
    achievementId: null,
    shader: {
      primaryHex: '#00f3ff',
      secondaryEmissiveHex: '#0066ff',
      trailOpacity: 0.85,
      wireframeToggle: false,
      glowIntensity: 1.5
    }
  };
}

/**
 * Formats a studio cosmetic configuration into an immutable, schema-compliant JavaScript definition
 * matching src/armory/ArmoryCatalog.js.
 * @param {object} config
 * @returns {string}
 */
export function formatCatalogCode(config) {
  const isChassis = config.category === ARMORY_CATEGORIES.CHASSIS_SKINS;
  const shader = config.shader || {};

  const lines = [
    `    Object.freeze({`,
    `      id: '${config.id || (isChassis ? 'chassis_custom' : 'disc_custom')}',`,
    `      displayName: '${(config.displayName || '').replace(/'/g, "\\'")}',`,
    `      category: ${isChassis ? 'ARMORY_CATEGORIES.CHASSIS_SKINS' : 'ARMORY_CATEGORIES.DISC_SKINS'},`,
    `      description: '${(config.description || '').replace(/'/g, "\\'")}',`,
    `      unlockType: ${config.unlockType === UNLOCK_TYPES.BITS ? 'UNLOCK_TYPES.BITS' : config.unlockType === UNLOCK_TYPES.ACHIEVEMENT ? 'UNLOCK_TYPES.ACHIEVEMENT' : 'UNLOCK_TYPES.FREE'},`,
    `      cost: ${typeof config.cost === 'number' ? config.cost : 0},`,
    `      achievementId: ${config.achievementId ? `'${config.achievementId}'` : 'null'},`,
    `      shader: Object.freeze({`,
    `        primaryHex: '${shader.primaryHex || '#00f3ff'}',`,
    `        secondaryEmissiveHex: '${shader.secondaryEmissiveHex || '#0066ff'}',`,
    `        trailOpacity: ${typeof shader.trailOpacity === 'number' ? shader.trailOpacity : 0.85},`,
    `        wireframeToggle: ${Boolean(shader.wireframeToggle)},`,
    `        glowIntensity: ${typeof shader.glowIntensity === 'number' ? shader.glowIntensity : 1.5}${isChassis ? ',' : ''}`
  ];

  if (isChassis) {
    lines.push(`        suitHex: '${shader.suitHex || '#1e2631'}',`);
    lines.push(`        roughness: ${typeof shader.roughness === 'number' ? shader.roughness : 0.38},`);
    lines.push(`        metalness: ${typeof shader.metalness === 'number' ? shader.metalness : 0.78}`);
  }

  lines.push(`      })`);
  lines.push(`    })`);

  return lines.join('\n');
}

export class CosmeticStudioModal {
  /**
   * @param {object} [options]
   * @param {import('../../armory/ArmoryManager.js').ArmoryManager} [options.armory]
   * @param {import('../../armory/CosmeticMaterialEngine.js').CosmeticMaterialEngine} [options.cosmetics]
   * @param {typeof ArmoryPreviewScene} [options.PreviewSceneClass]
   * @param {HTMLElement} [options.container] Custom mount element (for testing)
   * @param {function} [options.onClose]
   */
  constructor(options = {}) {
    this._armory = options.armory || null;
    this._cosmetics = options.cosmetics || null;
    this.PreviewSceneClass = options.PreviewSceneClass || ArmoryPreviewScene;
    this._containerId = 'cosmeticStudioModal';
    this._customContainer = options.container || null;

    this.activeCategory = ARMORY_CATEGORIES.DISC_SKINS;
    this.currentConfig = getDefaultConfig(this.activeCategory);
    this.previewScene = null;
    this._isOpen = false;
    this._onClose = options.onClose || null;
    this._feedbackTimer = null;

    if (typeof window !== 'undefined') {
      window.__tronCloseStudio = () => this.hide();
    }
  }

  get armory() {
    return this._armory || defaultArmoryManager;
  }

  set armory(val) {
    this._armory = val;
  }

  get cosmetics() {
    return this._cosmetics || defaultCosmeticEngine;
  }

  set cosmetics(val) {
    this._cosmetics = val;
  }

  get container() {
    return this._customContainer || (typeof document !== 'undefined' ? document.getElementById(this._containerId) : null);
  }

  isOpen() {
    const el = this.container;
    return Boolean(this._isOpen && el && el.style.display !== 'none');
  }

  setOnClose(fn) {
    this._onClose = fn;
  }

  /**
   * Shows the developer studio modal.
   * @param {string} [initialCategory=ARMORY_CATEGORIES.DISC_SKINS]
   */
  show(initialCategory = ARMORY_CATEGORIES.DISC_SKINS) {
    if (typeof document !== 'undefined' && document.pointerLockElement) {
      try {
        document.exitPointerLock();
      } catch (_) {}
    }
    setCursor();
    state.armoryModalOpen = true;
    this._isOpen = true;

    this.activeCategory = initialCategory;
    this.currentConfig = getDefaultConfig(this.activeCategory);

    const el = this.container;
    if (el) {
      el.innerHTML = this.render();
      el.style.display = 'flex';
      this._initPreviewScene();
      this.bindEvents(el);
    }
  }

  /**
   * Hides the studio modal and cleanly disposes WebGL resources.
   */
  hide() {
    this._isOpen = false;
    state.armoryModalOpen = false;

    if (this._feedbackTimer) {
      clearTimeout(this._feedbackTimer);
      this._feedbackTimer = null;
    }

    if (this.previewScene) {
      try {
        this.previewScene.dispose();
      } catch (err) {
        console.warn('[CosmeticStudio] Error disposing preview scene:', err);
      }
      this.previewScene = null;
    }

    const el = this.container;
    if (el) {
      el.style.display = 'none';
      el.innerHTML = '';
    }

    if (typeof this._onClose === 'function') {
      this._onClose();
    }
  }

  /**
   * Full cleanup alias for lifecycle teardown.
   */
  dispose() {
    this.hide();
  }

  /**
   * Switches cosmetic category between Kinetic Discs and Athlete Rigs.
   * @param {string} category
   */
  switchCategory(category) {
    if (category !== ARMORY_CATEGORIES.DISC_SKINS && category !== ARMORY_CATEGORIES.CHASSIS_SKINS) {
      return;
    }

    this.activeCategory = category;
    this.currentConfig = getDefaultConfig(category);

    const el = this.container;
    if (el) {
      // Update tab buttons
      const tabs = el.querySelectorAll('.studio-tab-btn');
      tabs.forEach((tab) => {
        if (tab.getAttribute('data-category') === category) {
          tab.classList.add('active');
        } else {
          tab.classList.remove('active');
        }
      });

      // Re-render controls pane
      const controlsPane = el.querySelector('#studioControlsPane');
      if (controlsPane) {
        controlsPane.innerHTML = this.renderControls();
        this._bindControlInputs(el);
      }
    }

    this._updatePreviewSceneModel();
  }

  /**
   * Initializes or updates the 3D turntable preview bay.
   * @private
   */
  _initPreviewScene() {
    if (typeof document === 'undefined') return;

    const mount = this.container?.querySelector('#studioPreviewMount');
    if (!mount) return;

    if (this.previewScene) {
      try {
        this.previewScene.dispose();
      } catch (_) {}
      this.previewScene = null;
    }

    try {
      this.previewScene = new this.PreviewSceneClass({
        container: mount,
        width: 420,
        height: 420,
        autoRotate: true,
        autoRotateSpeed: 0.8
      });
    } catch (err) {
      console.warn('[CosmeticStudio] Failed to instantiate preview scene:', err);
    }

    this._updatePreviewSceneModel();
  }

  /**
   * Updates turntable staged model to reflect active category and parameters.
   * @private
   */
  _updatePreviewSceneModel() {
    if (!this.previewScene) return;

    try {
      if (this.activeCategory === ARMORY_CATEGORIES.DISC_SKINS) {
        this.previewScene.previewDisc(this.currentConfig);
      } else if (this.activeCategory === ARMORY_CATEGORIES.CHASSIS_SKINS) {
        this.previewScene.previewChassis(this.currentConfig);
      }
    } catch (err) {
      console.warn('[CosmeticStudio] Error updating staged preview model:', err);
    }
  }

  /**
   * Mutates the active turntable mesh materials in-place via CosmeticMaterialEngine.
   */
  updateMaterial() {
    if (!this.previewScene || !this.previewScene.stagedMesh) return;

    try {
      if (this.activeCategory === ARMORY_CATEGORIES.DISC_SKINS) {
        this.cosmetics.applyDiscSkin(this.previewScene.stagedMesh, this.currentConfig);
      } else if (this.activeCategory === ARMORY_CATEGORIES.CHASSIS_SKINS) {
        this.cosmetics.applyChassisSkin(this.previewScene.stagedMesh, this.currentConfig);
      }
    } catch (err) {
      console.warn('[CosmeticStudio] Error updating material in-place:', err);
    }
  }

  /**
   * Applies the current studio cosmetic configuration directly to the active in-game player.
   * @returns {boolean}
   */
  testOnPlayer() {
    if (!this.cosmetics) return false;

    let applied = false;
    try {
      if (this.activeCategory === ARMORY_CATEGORIES.DISC_SKINS) {
        if (this.cosmetics.playerDiscMesh) {
          this.cosmetics.applyDiscSkin(this.cosmetics.playerDiscMesh, this.currentConfig);
          applied = true;
        }
        if (this.cosmetics.playerObj?.userData?.backDisc) {
          this.cosmetics.applyDiscSkin(this.cosmetics.playerObj.userData.backDisc, this.currentConfig);
          applied = true;
        }
      } else if (this.activeCategory === ARMORY_CATEGORIES.CHASSIS_SKINS) {
        if (this.cosmetics.playerObj) {
          this.cosmetics.applyChassisSkin(this.cosmetics.playerObj, this.currentConfig);
          applied = true;
        }
      }
    } catch (err) {
      console.warn('[CosmeticStudio] Error testing on player:', err);
    }

    this.showFeedback(applied ? 'APPLIED TO ACTIVE IN-GAME PLAYER!' : 'TEST APPLIED (NO ACTIVE PLAYER MESH FOUND)');
    return true;
  }

  /**
   * Formats active parameters into schema-compliant code and copies to clipboard with console fallback.
   * @returns {string}
   */
  copyCatalogCode() {
    const code = formatCatalogCode(this.currentConfig);
    console.log('[CosmeticStudio] Formatted Catalog Code:\n' + code);

    let copied = false;
    if (typeof navigator !== 'undefined' && navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
      try {
        navigator.clipboard.writeText(code)
          .then(() => {
            this.showFeedback('CATALOG CODE COPIED TO CLIPBOARD!');
          })
          .catch((err) => {
            console.warn('[CosmeticStudio] Clipboard writeText failed:', err);
            this.showFeedback('CODE LOGGED TO DEV CONSOLE (CLIPBOARD BLOCKED)');
          });
        copied = true;
      } catch (err) {
        console.warn('[CosmeticStudio] Clipboard write exception:', err);
      }
    }

    if (!copied) {
      this.showFeedback('CODE LOGGED TO DEVELOPER CONSOLE!');
    }

    return code;
  }

  /**
   * Displays temporary feedback status text.
   * @param {string} msg
   */
  showFeedback(msg) {
    const feedbackEl = this.container?.querySelector('#studioFeedback');
    if (feedbackEl) {
      feedbackEl.textContent = msg;
      if (this._feedbackTimer) clearTimeout(this._feedbackTimer);
      this._feedbackTimer = setTimeout(() => {
        if (feedbackEl) feedbackEl.textContent = '';
        this._feedbackTimer = null;
      }, 3500);
    }
  }

  /**
   * Binds UI event listeners to DOM controls.
   * @param {HTMLElement} root
   */
  bindEvents(root) {
    if (!root) return;

    // Close button
    const closeBtn = root.querySelector('#studioCloseBtn');
    if (closeBtn) {
      closeBtn.onclick = () => this.hide();
    }

    // Category tabs
    const tabs = root.querySelectorAll('.studio-tab-btn');
    tabs.forEach((tab) => {
      tab.onclick = () => {
        const cat = tab.getAttribute('data-category');
        if (cat) this.switchCategory(cat);
      };
    });

    // Action buttons
    const testBtn = root.querySelector('#studioBtnTest');
    if (testBtn) {
      testBtn.onclick = () => this.testOnPlayer();
    }

    const copyBtn = root.querySelector('#studioBtnCopy');
    if (copyBtn) {
      copyBtn.onclick = () => this.copyCatalogCode();
    }

    this._bindControlInputs(root);
  }

  /**
   * Binds real-time input event listeners to controls pane.
   * @private
   */
  _bindControlInputs(root) {
    if (!root) return;

    // Metadata fields
    const inputId = root.querySelector('#studioInputId');
    if (inputId) {
      inputId.oninput = (e) => {
        this.currentConfig.id = e.target.value.trim();
      };
    }

    const inputName = root.querySelector('#studioInputName');
    if (inputName) {
      inputName.oninput = (e) => {
        this.currentConfig.displayName = e.target.value;
      };
    }

    const inputDesc = root.querySelector('#studioInputDesc');
    if (inputDesc) {
      inputDesc.oninput = (e) => {
        this.currentConfig.description = e.target.value;
      };
    }

    const selectUnlock = root.querySelector('#studioSelectUnlock');
    if (selectUnlock) {
      selectUnlock.onchange = (e) => {
        this.currentConfig.unlockType = e.target.value;
      };
    }

    const inputCost = root.querySelector('#studioInputCost');
    if (inputCost) {
      inputCost.oninput = (e) => {
        this.currentConfig.cost = parseInt(e.target.value, 10) || 0;
      };
    }

    // Primary Color
    const colorPrimary = root.querySelector('#studioColorPrimary');
    const hexPrimary = root.querySelector('#studioHexPrimary');
    if (colorPrimary) {
      colorPrimary.oninput = (e) => {
        this.currentConfig.shader.primaryHex = e.target.value;
        if (hexPrimary) hexPrimary.textContent = e.target.value.toUpperCase();
        this.updateMaterial();
      };
    }

    // Secondary Emissive Color
    const colorSecondary = root.querySelector('#studioColorSecondary');
    const hexSecondary = root.querySelector('#studioHexSecondary');
    if (colorSecondary) {
      colorSecondary.oninput = (e) => {
        this.currentConfig.shader.secondaryEmissiveHex = e.target.value;
        if (hexSecondary) hexSecondary.textContent = e.target.value.toUpperCase();
        this.updateMaterial();
      };
    }

    // Glow Intensity Slider
    const sliderGlow = root.querySelector('#studioSliderGlow');
    const valGlow = root.querySelector('#studioValGlow');
    if (sliderGlow) {
      sliderGlow.oninput = (e) => {
        const val = parseFloat(e.target.value);
        this.currentConfig.shader.glowIntensity = val;
        if (valGlow) valGlow.textContent = val.toFixed(1);
        this.updateMaterial();
      };
    }

    // Flight Trail Opacity Slider
    const sliderTrail = root.querySelector('#studioSliderTrail');
    const valTrail = root.querySelector('#studioValTrail');
    if (sliderTrail) {
      sliderTrail.oninput = (e) => {
        const val = parseFloat(e.target.value);
        this.currentConfig.shader.trailOpacity = val;
        if (valTrail) valTrail.textContent = val.toFixed(2);
        this.updateMaterial();
      };
    }

    // Retro Wireframe Checkbox
    const checkWireframe = root.querySelector('#studioCheckWireframe');
    if (checkWireframe) {
      checkWireframe.onchange = (e) => {
        this.currentConfig.shader.wireframeToggle = e.target.checked;
        this.updateMaterial();
      };
    }

    // Chassis Specific: Suit Plating Color
    const colorSuit = root.querySelector('#studioColorSuit');
    const hexSuit = root.querySelector('#studioHexSuit');
    if (colorSuit) {
      colorSuit.oninput = (e) => {
        this.currentConfig.shader.suitHex = e.target.value;
        if (hexSuit) hexSuit.textContent = e.target.value.toUpperCase();
        this.updateMaterial();
      };
    }

    // Chassis Specific: Roughness Slider
    const sliderRoughness = root.querySelector('#studioSliderRoughness');
    const valRoughness = root.querySelector('#studioValRoughness');
    if (sliderRoughness) {
      sliderRoughness.oninput = (e) => {
        const val = parseFloat(e.target.value);
        this.currentConfig.shader.roughness = val;
        if (valRoughness) valRoughness.textContent = val.toFixed(2);
        this.updateMaterial();
      };
    }

    // Chassis Specific: Metalness Slider
    const sliderMetalness = root.querySelector('#studioSliderMetalness');
    const valMetalness = root.querySelector('#studioValMetalness');
    if (sliderMetalness) {
      sliderMetalness.oninput = (e) => {
        const val = parseFloat(e.target.value);
        this.currentConfig.shader.metalness = val;
        if (valMetalness) valMetalness.textContent = val.toFixed(2);
        this.updateMaterial();
      };
    }
  }

  /**
   * Generates markup for the controls pane.
   * @returns {string}
   */
  renderControls() {
    const isChassis = this.activeCategory === ARMORY_CATEGORIES.CHASSIS_SKINS;
    const shader = this.currentConfig.shader || {};

    return `
      <!-- Metadata Group -->
      <div class="studio-control-group">
        <h3>Catalog Metadata</h3>
        <div class="studio-field-row">
          <label for="studioInputId">Catalog ID:</label>
          <input type="text" id="studioInputId" class="studio-input-text" value="${this.currentConfig.id || ''}" placeholder="e.g. disc_custom_01" />
        </div>
        <div class="studio-field-row">
          <label for="studioInputName">Display Name:</label>
          <input type="text" id="studioInputName" class="studio-input-text" value="${this.currentConfig.displayName || ''}" placeholder="e.g. Cyber Pulse" />
        </div>
        <div class="studio-field-row">
          <label for="studioInputDesc">Description:</label>
          <input type="text" id="studioInputDesc" class="studio-input-text" value="${this.currentConfig.description || ''}" placeholder="Item lore / description" />
        </div>
        <div class="studio-field-row">
          <label for="studioSelectUnlock">Unlock Type:</label>
          <select id="studioSelectUnlock" class="studio-select">
            <option value="${UNLOCK_TYPES.FREE}" ${this.currentConfig.unlockType === UNLOCK_TYPES.FREE ? 'selected' : ''}>Free Issuance</option>
            <option value="${UNLOCK_TYPES.BITS}" ${this.currentConfig.unlockType === UNLOCK_TYPES.BITS ? 'selected' : ''}>Bits (Arc Credits)</option>
            <option value="${UNLOCK_TYPES.ACHIEVEMENT}" ${this.currentConfig.unlockType === UNLOCK_TYPES.ACHIEVEMENT ? 'selected' : ''}>Achievement Protocol</option>
          </select>
        </div>
        <div class="studio-field-row">
          <label for="studioInputCost">Credit Cost:</label>
          <input type="number" id="studioInputCost" class="studio-input-text" value="${this.currentConfig.cost || 0}" min="0" step="50" />
        </div>
      </div>

      <!-- Shader & Lighting Parameters Group -->
      <div class="studio-control-group">
        <h3>Shader & Lighting Parameters</h3>
        <div class="studio-field-row">
          <label for="studioColorPrimary">Primary Emissive:</label>
          <div class="studio-input-color-wrap">
            <input type="color" id="studioColorPrimary" class="studio-input-color" value="${shader.primaryHex || '#00f3ff'}" />
            <span id="studioHexPrimary" class="studio-hex-code">${(shader.primaryHex || '#00f3ff').toUpperCase()}</span>
          </div>
        </div>
        <div class="studio-field-row">
          <label for="studioColorSecondary">Secondary Emissive:</label>
          <div class="studio-input-color-wrap">
            <input type="color" id="studioColorSecondary" class="studio-input-color" value="${shader.secondaryEmissiveHex || '#0066ff'}" />
            <span id="studioHexSecondary" class="studio-hex-code">${(shader.secondaryEmissiveHex || '#0066ff').toUpperCase()}</span>
          </div>
        </div>
        <div class="studio-field-row">
          <label for="studioSliderGlow">Glow Radiance:</label>
          <div class="studio-slider-wrapper">
            <input type="range" id="studioSliderGlow" class="studio-slider" min="0.5" max="4.0" step="0.1" value="${shader.glowIntensity ?? 1.5}" />
            <span id="studioValGlow" class="studio-slider-val">${Number(shader.glowIntensity ?? 1.5).toFixed(1)}</span>
          </div>
        </div>
        <div class="studio-field-row">
          <label for="studioSliderTrail">Flight Trail Opacity:</label>
          <div class="studio-slider-wrapper">
            <input type="range" id="studioSliderTrail" class="studio-slider" min="0.1" max="1.0" step="0.05" value="${shader.trailOpacity ?? 0.85}" />
            <span id="studioValTrail" class="studio-slider-val">${Number(shader.trailOpacity ?? 0.85).toFixed(2)}</span>
          </div>
        </div>
        <div class="studio-field-row">
          <label for="studioCheckWireframe">Wireframe Overlay:</label>
          <input type="checkbox" id="studioCheckWireframe" ${shader.wireframeToggle ? 'checked' : ''} style="cursor:pointer;" />
        </div>
      </div>

      ${isChassis ? `
      <!-- PBR Armor Plating Group (Athlete Rigs) -->
      <div class="studio-control-group">
        <h3>PBR Armor Plating (Athlete Rig)</h3>
        <div class="studio-field-row">
          <label for="studioColorSuit">Suit Armor Color:</label>
          <div class="studio-input-color-wrap">
            <input type="color" id="studioColorSuit" class="studio-input-color" value="${shader.suitHex || '#1e2631'}" />
            <span id="studioHexSuit" class="studio-hex-code">${(shader.suitHex || '#1e2631').toUpperCase()}</span>
          </div>
        </div>
        <div class="studio-field-row">
          <label for="studioSliderRoughness">Micro-Roughness:</label>
          <div class="studio-slider-wrapper">
            <input type="range" id="studioSliderRoughness" class="studio-slider" min="0.0" max="1.0" step="0.05" value="${shader.roughness ?? 0.38}" />
            <span id="studioValRoughness" class="studio-slider-val">${Number(shader.roughness ?? 0.38).toFixed(2)}</span>
          </div>
        </div>
        <div class="studio-field-row">
          <label for="studioSliderMetalness">Metallic Plating:</label>
          <div class="studio-slider-wrapper">
            <input type="range" id="studioSliderMetalness" class="studio-slider" min="0.0" max="1.0" step="0.05" value="${shader.metalness ?? 0.78}" />
            <span id="studioValMetalness" class="studio-slider-val">${Number(shader.metalness ?? 0.78).toFixed(2)}</span>
          </div>
        </div>
      </div>
      ` : ''}
    `;
  }

  /**
   * Generates full HTML markup for the modal.
   * @returns {string}
   */
  render() {
    return `
      <div class="cosmetic-studio-card">
        <!-- Top Nav Bar -->
        <div class="studio-top-nav">
          <div class="studio-title-badge">
            <h1>COSMETIC STUDIO</h1>
            <span class="studio-dev-tag">[DEV GUI]</span>
          </div>
          <div class="studio-category-tabs">
            ${STUDIO_CATEGORIES.map((cat) => `
              <button type="button" class="studio-tab-btn ${this.activeCategory === cat.id ? 'active' : ''}" data-category="${cat.id}">
                ${cat.label}
              </button>
            `).join('')}
          </div>
          <button type="button" id="studioCloseBtn" class="studio-close-btn" aria-label="Close Studio">✕ CLOSE</button>
        </div>

        <!-- Split Pane Body -->
        <div class="studio-split-pane">
          <!-- 3D Turntable Preview Bay (Left) -->
          <div id="studioPreviewMount" class="studio-preview-bay">
            <span class="studio-preview-hint">DRAG TO ROTATE TURNTABLE</span>
          </div>

          <!-- Interactive Parameter Controls (Right) -->
          <div id="studioControlsPane" class="studio-controls-pane">
            ${this.renderControls()}
          </div>
        </div>

        <!-- Action Bar Footer -->
        <div class="studio-actions-footer">
          <button type="button" id="studioBtnTest" class="studio-action-btn btn-test">
            ⚡ TEST ON PLAYER
          </button>
          <button type="button" id="studioBtnCopy" class="studio-action-btn btn-copy">
            📋 COPY CATALOG CODE
          </button>
        </div>
        <div id="studioFeedback" class="studio-feedback-msg"></div>
      </div>
    `;
  }
}
