import { storageManager } from './storage/StorageManager.js';
import { setMasterVolume, setSFXVolume } from '../audio/synth.js';
import { state } from './state.js';

export const DEFAULT_SETTINGS = Object.freeze({
  displayMode: 'fullscreen', // 'fullscreen' | 'windowed'
  fpsCap: 60,                // 60, 120, 144, 0 (uncapped)
  masterVolume: 1.0,         // 0.0 - 1.0
  sfxVolume: 1.0,            // 0.0 - 1.0
  muteOnBlur: true,
  bloom: true,
  particles: true,
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
    }
    this.settings[key] = normalized;
    try {
      storageManager.set(`settings.${key}`, normalized);
    } catch (_) {}
    this.apply(key, normalized);
    this.emitChange(key, normalized);
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
