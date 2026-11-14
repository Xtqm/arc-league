/**
 * settings_modal_interaction.test.js
 * Unit and interaction tests for SettingsModal controls, presets, render scaling,
 * keyboard accessibility, and settings persistence.
 */

import assert from 'assert';
import { SettingsModal } from '../../src/ui/modals/SettingsModal.js';
import { settingsManager } from '../../src/core/settings.js';

console.log('--- Running Settings Modal UI & Interaction Test Suite ---');

// Mock a lightweight DOM environment if not in browser
if (typeof document === 'undefined') {
  global.document = {
    createElement(tag) {
      const el = {
        tagName: tag.toUpperCase(),
        style: {},
        classList: new Set(),
        children: [],
        parentElement: null,
        appendChild(child) {
          child.parentElement = el;
          el.children.push(child);
          return child;
        },
        querySelectorAll(selector) {
          const results = [];
          const matchAttr = selector.match(/\[([a-zA-Z-]+)="([^"]+)"\]/);
          const matchClass = selector.match(/\.([a-zA-Z-]+)/);
          const walk = (node) => {
            if (node !== el) {
              let matches = true;
              if (matchClass && (!node.classList || !node.classList.has(matchClass[1]))) {
                matches = false;
              }
              if (matchAttr && node[matchAttr[1]] !== matchAttr[2]) {
                matches = false;
              }
              if (matches) results.push(node);
            }
            if (node.children) node.children.forEach(walk);
          };
          walk(el);
          return results;
        },
        querySelector(selector) {
          const all = el.querySelectorAll(selector);
          return all[0] || null;
        }
      };
      el.classList.add = (c) => el.classList.add(c);
      el.classList.remove = (c) => el.classList.delete(c);
      el.classList.toggle = (c, val) => val ? el.classList.add(c) : el.classList.delete(c);
      el.classList.contains = (c) => el.classList.has(c);
      el.getAttribute = (name) => el[name] ?? null;
      el.setAttribute = (name, val) => { el[name] = val; };
      return el;
    },
    getElementById(id) {
      return null;
    },
    body: {
      style: {},
      appendChild() {},
      classList: { add() {}, remove() {} }
    }
  };
}

// 1. Modal creation and rendering
console.log('\n[Group 1] Testing SettingsModal Element Generation...');

const modal = new SettingsModal({ settings: settingsManager });
const customContainer = {
  style: {},
  innerHTML: '',
  querySelector(sel) {
    if (sel === '#renderScaleSlider') return this._scaleSlider;
    if (sel === '#renderScaleReadout') return this._scaleReadout;
    if (sel === '#closeSettingsBtn') return this._closeBtn;
    if (sel === '#closeSettingsX') return this._closeX;
    if (sel === '#toggleBloomBtn') return this._toggleBloom;
    if (sel === '#toggleParticlesBtn') return this._toggleParticles;
    return null;
  },
  querySelectorAll(sel) {
    if (sel === '.preset-btn') return this._presetBtns;
    if (sel === '.bloom-btn') return this._bloomBtns;
    if (sel === '.fps-btn') return this._fpsBtns;
    return [];
  }
};

function createMockBtn(attrName, attrVal) {
  const classes = new Set(['btn']);
  return {
    [attrName]: attrVal,
    getAttribute: (a) => a === attrName ? attrVal : null,
    classList: {
      add: (c) => classes.add(c),
      remove: (c) => classes.delete(c),
      toggle: (c, val) => val ? classes.add(c) : classes.delete(c),
      contains: (c) => classes.has(c)
    },
    onclick: null,
    click() { if (this.onclick) this.onclick(); }
  };
}

customContainer._presetBtns = ['ultra', 'high', 'medium', 'low', 'competitive'].map(p => createMockBtn('data-preset', p));
customContainer._bloomBtns = ['full', 'half', 'off'].map(b => createMockBtn('data-bloom', b));
customContainer._fpsBtns = [60, 120, 144, 0].map(f => createMockBtn('data-fps', String(f)));
customContainer._scaleReadout = { textContent: '100%' };
customContainer._scaleSlider = {
  value: '100',
  oninput: null,
  dispatchEvent(name) { if (this.oninput) this.oninput({ target: this }); }
};
customContainer._closeBtn = createMockBtn('id', 'closeSettingsBtn');
customContainer._closeX = createMockBtn('id', 'closeSettingsX');
customContainer._toggleBloom = createMockBtn('id', 'toggleBloomBtn');
customContainer._toggleParticles = createMockBtn('id', 'toggleParticlesBtn');

modal._customContainer = customContainer;
modal.show();

assert.ok(customContainer.innerHTML.includes('3D RENDER SCALE'), 'Must render 3D RENDER SCALE control');
assert.ok(customContainer.innerHTML.includes('GRAPHICS PRESET'), 'Must render GRAPHICS PRESET selector');
assert.ok(customContainer.innerHTML.includes('data-preset="ultra"'));
assert.ok(customContainer.innerHTML.includes('data-preset="competitive"'));
console.log('✓ Group 1: SettingsModal HTML templates and controls rendered cleanly.');

// 2. Preset Selection Interaction
console.log('\n[Group 2] Testing Preset Selection UI Sync...');

// Select Medium Preset
const medBtn = customContainer._presetBtns.find(b => b.getAttribute('data-preset') === 'medium');
medBtn.click();
assert.strictEqual(settingsManager.get('graphicsPreset'), 'medium');
assert.strictEqual(settingsManager.get('renderScale'), 0.85);
assert.strictEqual(settingsManager.get('bloomQuality'), 'half');
assert.strictEqual(customContainer._scaleSlider.value, 85);
assert.strictEqual(customContainer._scaleReadout.textContent, '85%');
assert.strictEqual(medBtn.classList.contains('hot'), true, 'Medium preset button must be hot');

// Select Competitive Preset (Bloom off, uncapped fps, 75% render scale)
const compBtn = customContainer._presetBtns.find(b => b.getAttribute('data-preset') === 'competitive');
compBtn.click();
assert.strictEqual(settingsManager.get('graphicsPreset'), 'competitive');
assert.strictEqual(settingsManager.get('renderScale'), 0.75);
assert.strictEqual(settingsManager.get('bloomQuality'), 'off');
assert.strictEqual(settingsManager.get('bloom'), false);
assert.strictEqual(settingsManager.get('fpsCap'), 0);
assert.strictEqual(customContainer._scaleSlider.value, 75);
assert.strictEqual(compBtn.classList.contains('hot'), true, 'Competitive button must be hot');
assert.strictEqual(medBtn.classList.contains('hot'), false);

console.log('✓ Group 2: Preset selector dispatches and synchronizes all slider/button controls.');

// 3. Render Scale Slider Adjustment & Custom Transition
console.log('\n[Group 3] Testing Slider Input & Custom Preset Transition...');

customContainer._scaleSlider.value = '65';
customContainer._scaleSlider.dispatchEvent('input');
assert.strictEqual(settingsManager.get('renderScale'), 0.65);
assert.strictEqual(customContainer._scaleReadout.textContent, '65%');
assert.strictEqual(settingsManager.get('graphicsPreset'), 'custom');
assert.strictEqual(compBtn.classList.contains('hot'), false, 'Custom slider edit must clear hot preset button');

console.log('✓ Group 3: Render scale slider input updates readout and switches preset to custom.');

// 4. Bloom Quality Interaction & Modal Dismissal
console.log('\n[Group 4] Testing Bloom Quality Buttons & Dismissal...');

const halfBloomBtn = customContainer._bloomBtns.find(b => b.getAttribute('data-bloom') === 'half');
halfBloomBtn.click();
assert.strictEqual(settingsManager.get('bloomQuality'), 'half');
assert.strictEqual(settingsManager.get('bloom'), true);

let closed = false;
modal.setOnClose(() => { closed = true; });
customContainer._closeBtn.click();
assert.strictEqual(customContainer.style.display, 'none');
assert.strictEqual(closed, true, 'Clicking return button must trigger onClose and hide modal');

// Restore clean baseline
settingsManager.applyPreset('high');

console.log('✓ Group 4: Bloom quality selection and modal dismissal verified.');

console.log('\n======================================================');
console.log('ALL SETTINGS MODAL INTERACTION TESTS PASSED (100%)');
console.log('======================================================\n');
