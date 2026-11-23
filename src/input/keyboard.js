import { state } from '../core/state.js';
import { setLastInputDevice } from '../ui/hud.js';

export const EAT = ['Space','KeyW','KeyA','KeyS','KeyD','KeyQ','KeyE','KeyP','KeyT','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','F1'];

export const CURVE_RAMP_RATE = 2.5; // Ramps 1.0 magnitude over 0.40s (1.0 / 0.40s)

export function resetPlayerCurveIntent() {
  state.playerCurveIntent = 0.0;
  state.curveNeutralizedOnPress = false;
}

export function setPlayerCurveIntent(val) {
  const num = typeof val === 'number' ? val : 0.0;
  state.playerCurveIntent = Math.max(-1.0, Math.min(1.0, num));
  state.curveNeutralizedOnPress = false;
}

export function updateCurveAccumulator(dt) {
  if (!dt || dt <= 0) return;
  state.curveNeutralizedOnPress = false;
  const q = !!state.keys.KeyQ || !!state.gamepadCurveL;
  const e = !!state.keys.KeyE || !!state.gamepadCurveR;

  const current = typeof state.playerCurveIntent === 'number' ? state.playerCurveIntent : 0.0;
  if (q && !e) {
    state.playerCurveIntent = Math.max(-1.0, current - CURVE_RAMP_RATE * dt);
  } else if (e && !q) {
    state.playerCurveIntent = Math.min(1.0, current + CURVE_RAMP_RATE * dt);
  }
}

export function getPlayerCurveIntent() {
  if (state.curveNeutralizedOnPress) {
    return 0.0;
  }
  if (typeof state.playerCurveIntent === 'number' && Number.isFinite(state.playerCurveIntent) && state.playerCurveIntent !== 0) {
    return state.playerCurveIntent;
  }
  // Fallback if keys/bumpers are held directly in tests without ticking accumulator
  const q = !!state.keys.KeyQ || !!state.gamepadCurveL;
  const e = !!state.keys.KeyE || !!state.gamepadCurveR;
  if (q && !e) return -1.0;
  if (e && !q) return 1.0;
  return typeof state.playerCurveIntent === 'number' ? state.playerCurveIntent : 0.0;
}

export function codeOf(e) {
  if (e.code) return e.code;
  const k = (e.key || '').toLowerCase();
  if (k === ' ' || k === 'spacebar' || k === 'space') return 'Space';
  if (k === 'escape' || k === 'esc') return 'Escape';
  if (k.length === 1 && k >= 'a' && k <= 'z') return 'Key' + k.toUpperCase();
  if (k === 'shift') return 'ShiftLeft';
  return '';
}

export function onDown(e) {
  const c = codeOf(e);

  // Handle Escape isolation for Grid Authorization Terminal (dismissal restricted to [X] button)
  if (c === 'Escape' && state.authModalOpen) {
    e.preventDefault();
    return;
  }

  // Handle Escape dismissal for Armory Modal
  if (c === 'Escape' && state.armoryModalOpen) {
    e.preventDefault();
    if (typeof window !== 'undefined' && typeof window.__tronCloseArmory === 'function') {
      window.__tronCloseArmory();
    } else {
      const arm = document.getElementById('armoryModal');
      if (arm) arm.style.display = 'none';
      state.armoryModalOpen = false;
      const overlay = document.getElementById('overlay');
      if (overlay) overlay.style.display = 'flex';
    }
    return;
  }

  const isInputTarget = typeof document !== 'undefined' && document.activeElement && 
     (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA');

  if (isInputTarget || state.authModalOpen || state.armoryModalOpen) {
    return;
  }

  // Handle lobby mode input isolation: disable locomotion keys & KeyP, contextually route Escape
  if (state.gameMode === 'lobby') {
    const LOCOMOTION_KEYS = ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'];
    if (LOCOMOTION_KEYS.includes(c)) {
      if (EAT.includes(c)) e.preventDefault();
      return;
    }
    if (c === 'KeyP') {
      e.preventDefault();
      return;
    }
    if (c === 'Escape') {
      e.preventDefault();
      const coreModal = typeof document !== 'undefined' ? document.getElementById('coreConfirmModal') : null;
      if (coreModal && coreModal.style && coreModal.style.display !== 'none') {
        if (typeof window !== 'undefined' && window.__tronLobbyCores) {
          window.__tronLobbyCores.cancelLaunch();
        } else {
          coreModal.style.display = 'none';
        }
        return;
      }

      const settingsModalEl = typeof document !== 'undefined' ? document.getElementById('settingsModal') : null;
      if (settingsModalEl && settingsModalEl.style && settingsModalEl.style.display !== 'none') {
        if (typeof window !== 'undefined' && window.__tronCloseSettings) {
          window.__tronCloseSettings();
        } else {
          settingsModalEl.style.display = 'none';
        }
        return;
      }

      const hostModal = typeof document !== 'undefined' ? document.getElementById('hostModal') : null;
      if (hostModal && hostModal.style && hostModal.style.display !== 'none') {
        hostModal.style.display = 'none';
        return;
      }

      const roomModal = typeof document !== 'undefined' ? document.getElementById('roomModal') : null;
      if (roomModal && roomModal.style && roomModal.style.display !== 'none') {
        roomModal.style.display = 'none';
        return;
      }

      // Root lobby Escape handling: Electron shell exit confirmation vs browser inertness
      const isDesktop = typeof window !== 'undefined' && (
        !!window.electronDesktop?.isDesktop ||
        !!window.__electronBridge ||
        (typeof process !== 'undefined' && !!process?.versions?.electron)
      );

      if (isDesktop) {
        const shouldExit = typeof window !== 'undefined' && typeof window.confirm === 'function'
          ? window.confirm('TERMINATE PROCESS // EXIT TO DESKTOP?')
          : true;
        if (shouldExit) {
          if (typeof window !== 'undefined' && window.electronDesktop && typeof window.electronDesktop.quitApp === 'function') {
            window.electronDesktop.quitApp();
          } else if (typeof window !== 'undefined' && typeof window.close === 'function') {
            window.close();
          }
        }
      }
      return;
    }
  }

  if (!c) return;
  setLastInputDevice('kbm');
  state.keys[c] = true;

  // Opposite-key curve neutralization
  if (c === 'KeyQ') {
    if ((state.playerCurveIntent || 0) > 0) {
      state.playerCurveIntent = 0.0;
      state.curveNeutralizedOnPress = true;
    }
  } else if (c === 'KeyE') {
    if ((state.playerCurveIntent || 0) < 0) {
      state.playerCurveIntent = 0.0;
      state.curveNeutralizedOnPress = true;
    }
  }

  if (EAT.includes(c)) e.preventDefault();
  if (c === 'F1') {
    const m = document.getElementById('keymon');
    if (m) m.style.display = m.style.display === 'block' ? 'none' : 'block';
  }
  if (c === 'KeyT') {
    // Cinematic Slow-Motion: only active in League Circuit (campaign) and Survival (swarm)
    if (!state.running) return;

    if (state.slowMoEnabled === false) {
      if (typeof window !== 'undefined' && typeof window.__arcMessage === 'function') {
        window.__arcMessage('SLOW-MO DISABLED IN SETTINGS');
      }
      return;
    }

    const isAllowedMode = (state.gameMode === 'campaign' || state.gameMode === 'swarm');
    if (!isAllowedMode) {
      if (typeof window !== 'undefined' && typeof window.__arcMessage === 'function') {
        window.__arcMessage('SLOW-MO UNAVAILABLE IN THIS MODE');
      }
      return;
    }

    state.slowMoActive = !state.slowMoActive;
    state.timeScale = state.slowMoActive ? 0.2 : 1.0;
    if (typeof window !== 'undefined' && typeof window.__arcMessage === 'function') {
      window.__arcMessage(state.slowMoActive ? 'CINEMATIC SLOW-MO: 0.2x' : 'NORMAL SPEED: 1.0x');
    }
  }
  if (c === 'KeyP' || c === 'Escape') {
    if (state.running) {
      if (state.gameMode === 'calibration' && c === 'Escape' && !state.campaignLevelId) {
        e.preventDefault();
        if (typeof window !== 'undefined' && window.__tronBypassCalibration) {
          window.__tronBypassCalibration();
        }
        return;
      }
      const now = performance.now();
      if (now - state.lastPauseToggle > 180) {
        state.lastPauseToggle = now;
        if (state.gameMode === 'duel_multi' || state.gameMode === 'duos_multi') {
          e.preventDefault();
          if (typeof document !== 'undefined' && document.pointerLockElement) {
            document.exitPointerLock();
          }
        } else {
          if (state.paused) {
            if (typeof window !== 'undefined' && window.__tronResumeGame) window.__tronResumeGame();
          } else {
            if (typeof window !== 'undefined' && window.__tronPauseGame) window.__tronPauseGame();
          }
        }
      }
    }
  }
}

export function onUp(e) {
  const c = codeOf(e);
  if (c) {
    state.keys[c] = false;
    if (c === 'KeyQ' || c === 'KeyE') {
      state.curveNeutralizedOnPress = false;
    }
  }
}

export function initKeyboard(target = window) {
  if (typeof window === 'undefined') return;
  target.addEventListener('keydown', onDown, { passive: false, capture: true });
  target.addEventListener('keyup', onUp, { capture: true });
  target.addEventListener('blur', () => {
    for (const k in state.keys) state.keys[k] = false;
    if (!state.touchBlocking) state.player.blocking = false;
  });
}
