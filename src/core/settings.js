import { storageManager } from './storage/StorageManager.js';
import { setMasterVolume, setSFXVolume } from '../audio/synth.js';
import { state } from './state.js';

export const GRAPHICS_PRESETS = Object.freeze({
  ultra: Object.freeze({
    preset: 'ultra',
    renderScale: 1.0,
    bloomQuality: 'full',
    bloom: true,
    shadows: 2048,
    particles: true,
    particleBudget: 1.0,
    fpsCap: 0
  }),
  high: Object.freeze({
    preset: 'high',
    renderScale: 1.0,
    bloomQuality: 'full',
    bloom: true,
    shadows: 1024,
    particles: true,
    particleBudget: 1.0,
    fpsCap: 0
  }),
  medium: Object.freeze({
    preset: 'medium',
    renderScale: 0.85,
    bloomQuality: 'half',
    bloom: true,
    shadows: 512,
    particles: true,
    particleBudget: 0.75,
    fpsCap: 60
  }),
  low: Object.freeze({
    preset: 'low',
    renderScale: 0.70,
    bloomQuality: 'half',
    bloom: true,
    shadows: 0,
    particles: true,
    particleBudget: 0.50,
    fpsCap: 60
  }),
  competitive: Object.freeze({
    preset: 'competitive',
    renderScale: 0.75,
    bloomQuality: 'off',
    bloom: false,
    shadows: 0,
    particles: true,
    particleBudget: 0.25,
    fpsCap: 0
  })
});

export const DEFAULT_SETTINGS = Object.freeze({
  displayMode: 'fullscreen', // 'fullscreen' | 'windowed'
  fpsCap: 0,                 // 60, 120, 144, 0 (uncapped)
  masterVolume: 1.0,         // 0.0 - 1.0
  sfxVolume: 1.0,            // 0.0 - 1.0
  muteOnBlur: true,
  bloom: true,
  bloomQuality: 'full',      // 'full' | 'half' | 'off'
  renderScale: 1.0,          // 0.50 - 1.00
  graphicsPreset: 'high',    // 'ultra' | 'high' | 'medium' | 'low' | 'competitive' | 'custom'
  shadows: 1024,             // 2048 | 1024 | 512 | 0
  particles: true,
  particleBudget: 1.0,       // 0.25 - 1.00
  touchSensitivity: 1.0,     // 0.5 - 2.0
  touchInertia: 'smooth',    // 'smooth' | 'light' | 'off'
  invertY: false
});

export class SettingsManager {
  constructor() {
    this.settings = { ...DEFAULT_SETTINGS };
    this._listeners = new Set();
  }

  /**
   * Initializes and restores persistent user settings.
   * @returns {object}
   */
  load() {
    try {
      const stored = storageManager.get('settings', null);
      if (stored && typeof stored === 'object') {
        this.settings = { ...DEFAULT_SETTINGS, ...stored };
        if (stored.bloom !== undefined && stored.bloomQuality === undefined) {
          this.settings.bloomQuality = stored.bloom ? 'full' : 'off';
        }
      }
    } catch (_) {}
    this.applyAll();
    this.emitChange('*', this.settings);
    return this.settings;
  }

  get(key, fallback = null) {
    return this.settings[key] ?? fallback;
  }

  set(key, value) {
    let normalized = value;
    if (key === 'touchSensitivity') {
      const n = Number(value);
      normalized = Number.isFinite(n) ? Math.max(0.5, Math.min(2.0, n)) : DEFAULT_SETTINGS.touchSensitivity;
    } else if (key === 'touchInertia') {
      const s = String(value).toLowerCase();
      normalized = (s === 'smooth' || s === 'light' || s === 'off') ? s : DEFAULT_SETTINGS.touchInertia;
    } else if (key === 'invertY') {
      normalized = Boolean(value);
    } else if (key === 'renderScale') {
      const n = Number(value);
      normalized = Number.isFinite(n) ? Math.max(0.5, Math.min(1.0, Math.round(n * 100) / 100)) : DEFAULT_SETTINGS.renderScale;
      this.settings.graphicsPreset = 'custom';
    } else if (key === 'bloomQuality') {
      const s = String(value).toLowerCase();
      normalized = (s === 'full' || s === 'half' || s === 'off') ? s : DEFAULT_SETTINGS.bloomQuality;
      this.settings.bloom = normalized !== 'off';
      this.settings.graphicsPreset = 'custom';
    } else if (key === 'bloom') {
      normalized = Boolean(value);
      if (!normalized) {
        this.settings.bloomQuality = 'off';
      } else if (this.settings.bloomQuality === 'off') {
        this.settings.bloomQuality = 'full';
      }
      this.settings.graphicsPreset = 'custom';
    } else if (key === 'shadows') {
      if (value === false || value === 0 || value === 'off' || value === 'none') {
        normalized = 0;
      } else {
        const n = Number(value);
        normalized = Number.isFinite(n) && n > 0 ? n : 1024;
      }
      this.settings.graphicsPreset = 'custom';
    } else if (key === 'particleBudget') {
      const n = Number(value);
      normalized = Number.isFinite(n) ? Math.max(0.1, Math.min(1.0, n)) : 1.0;
      this.settings.graphicsPreset = 'custom';
    } else if (key === 'particles') {
      normalized = Boolean(value);
      this.settings.graphicsPreset = 'custom';
    } else if (key === 'graphicsPreset') {
      return this.applyPreset(value);
    }

    this.settings[key] = normalized;
    try {
      storageManager.set(`settings.${key}`, normalized);
      if (key === 'bloomQuality') {
        storageManager.set('settings.bloom', this.settings.bloom);
      } else if (key === 'bloom') {
        storageManager.set('settings.bloomQuality', this.settings.bloomQuality);
      }
    } catch (_) {}
    this.apply(key, normalized);
    this.emitChange(key, normalized);
  }

  applyPreset(presetName) {
    const key = String(presetName || '').toLowerCase();
    const preset = GRAPHICS_PRESETS[key];
    if (!preset) return false;

    this.settings.graphicsPreset = key;
    this.settings.renderScale = preset.renderScale;
    this.settings.bloomQuality = preset.bloomQuality;
    this.settings.bloom = preset.bloom;
    this.settings.shadows = preset.shadows;
    this.settings.particles = preset.particles;
    this.settings.particleBudget = preset.particleBudget;
    if (preset.fpsCap !== undefined) {
      this.settings.fpsCap = preset.fpsCap;
    }

    try {
      storageManager.set('settings', this.settings);
    } catch (_) {}

    this.applyAll();
    this.emitChange('graphicsPreset', key);
    this.emitChange('*', this.settings);
    return true;
  }

  setAll(newSettings) {
    this.settings = { ...this.settings, ...newSettings };
    try {
      storageManager.set('settings', this.settings);
    } catch (_) {}
    this.applyAll();
    this.emitChange('*', this.settings);
  }

  apply(key, value) {
    if (key === 'masterVolume') {
      setMasterVolume(value);
    } else if (key === 'sfxVolume') {
      setSFXVolume(value);
    } else if (key === 'invertY') {
      state.invertY = Boolean(value);
    }
  }

  applyAll() {
    setMasterVolume(this.settings.masterVolume);
    setSFXVolume(this.settings.sfxVolume);
    state.invertY = Boolean(this.settings.invertY);
  }

  onChange(fn) {
    this._listeners.add(fn);
    return () => this._listeners.delete(fn);
  }

  emitChange(key, value) {
    for (const fn of this._listeners) {
      try { fn(key, value, this.settings); } catch (_) {}
    }
  }
}

export const settingsManager = new SettingsManager();
