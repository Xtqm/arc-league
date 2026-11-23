import { state } from '../core/state.js';
import { setLastInputDevice } from '../ui/hud.js';
import { isLocked } from './mouse.js';

export function isFullScreen() {
  if (typeof window !== 'undefined' && typeof window.__tronIsFullScreen === 'function') {
    return window.__tronIsFullScreen();
  }
  return typeof document !== 'undefined' && !!(
    document.fullscreenElement ||
    document.webkitFullscreenElement ||
    document.webkitCurrentFullScreenElement ||
    document.mozFullScreenElement ||
    document.msFullscreenElement
  );
}

export function exitFullScreen() {
  if (typeof window !== 'undefined' && typeof window.__tronExitFullScreen === 'function') {
    return window.__tronExitFullScreen();
  }
  if (typeof document !== 'undefined') {
    try {
      if (document.exitFullscreen) document.exitFullscreen();
      else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
    } catch (_) {}
  }
}

function triggerPauseGame() {
  if (typeof window !== 'undefined' && typeof window.__tronPauseGame === 'function') {
    window.__tronPauseGame();
  } else if (typeof document !== 'undefined' && document.exitPointerLock) {
    document.exitPointerLock();
  }
}

function triggerResumeGame() {
  if (typeof window !== 'undefined' && typeof window.__tronResumeGame === 'function') {
    window.__tronResumeGame();
  }
}

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

function isModalVisible(el) {
  if (!el || !el.style) return false;
  return el.style.display !== 'none' && el.style.display !== '';
}

export function onDown(e) {
  const c = codeOf(e);

  const isInputTarget = typeof document !== 'undefined' && document.activeElement && 
     (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA');

  if (isInputTarget) {
    return;
  }

  // Priority-driven Escape state machine across all game lifecycle states
  if (c === 'Escape') {
    // 1. Grid Authorization Terminal isolation (dismissal restricted exclusively to [X] button)
    if (state.authModalOpen) {
      e.preventDefault();
      return;
    }

    // 2. Universal Modal Interception: dismiss open sub-modals before root actions
    // Armory Modal
    const armoryModalEl = typeof document !== 'undefined' ? document.getElementById('armoryModal') : null;
    if (state.armoryModalOpen || isModalVisible(armoryModalEl)) {
      e.preventDefault();
      if (typeof window !== 'undefined' && typeof window.__tronCloseArmory === 'function') {
        window.__tronCloseArmory();
      } else {
        if (armoryModalEl) armoryModalEl.style.display = 'none';
        state.armoryModalOpen = false;
        const overlay = typeof document !== 'undefined' ? document.getElementById('overlay') : null;
        if (overlay) overlay.style.display = 'flex';
      }
      return;
    }

    // Achievements Modal
    const achievementsModalEl = typeof document !== 'undefined' ? document.getElementById('achievementsModal') : null;
    if (state.achievementsModalOpen || isModalVisible(achievementsModalEl)) {
      e.preventDefault();
      if (typeof window !== 'undefined' && typeof window.__tronCloseAchievements === 'function') {
        window.__tronCloseAchievements();
      } else {
        if (achievementsModalEl) achievementsModalEl.style.display = 'none';
        state.achievementsModalOpen = false;
      }
      return;
    }

    // Trial Debrief Modal
    const trialDebriefModalEl = typeof document !== 'undefined' ? document.getElementById('trialDebriefModal') : null;
    if (isModalVisible(trialDebriefModalEl)) {
      e.preventDefault();
      if (typeof window !== 'undefined' && typeof window.__tronCloseTrialDebrief === 'function') {
        window.__tronCloseTrialDebrief();
      } else if (typeof window !== 'undefined' && window.__tronTrialDebriefModal && typeof window.__tronTrialDebriefModal.hide === 'function') {
        window.__tronTrialDebriefModal.hide();
      } else {
        trialDebriefModalEl.style.display = 'none';
      }
      return;
    }

    // Directives Modal
    const directivesModalEl = typeof document !== 'undefined' ? document.getElementById('directivesModal') : null;
    if (isModalVisible(directivesModalEl)) {
      e.preventDefault();
      if (typeof window !== 'undefined' && typeof window.__tronCloseDirectives === 'function') {
        window.__tronCloseDirectives();
      } else {
        directivesModalEl.style.display = 'none';
      }
      return;
    }

    // Settings Modal
    const settingsModalEl = typeof document !== 'undefined' ? document.getElementById('settingsModal') : null;
    if (isModalVisible(settingsModalEl)) {
      e.preventDefault();
      if (typeof window !== 'undefined' && typeof window.__tronCloseSettings === 'function') {
        window.__tronCloseSettings();
      } else {
        settingsModalEl.style.display = 'none';
      }
      return;
    }

    // Cosmetic Studio Modal
    const cosmeticStudioModalEl = typeof document !== 'undefined' ? document.getElementById('cosmeticStudioModal') : null;
    if (isModalVisible(cosmeticStudioModalEl)) {
      e.preventDefault();
      if (typeof window !== 'undefined' && typeof window.__tronCloseStudio === 'function') {
        window.__tronCloseStudio();
      } else {
        cosmeticStudioModalEl.style.display = 'none';
      }
      return;
    }

    // Host Modal
    const hostModalEl = typeof document !== 'undefined' ? document.getElementById('hostModal') : null;
    if (isModalVisible(hostModalEl)) {
      e.preventDefault();
      hostModalEl.style.display = 'none';
      return;
    }

    // Room Modal
    const roomModalEl = typeof document !== 'undefined' ? document.getElementById('roomModal') : null;
    if (isModalVisible(roomModalEl)) {
      e.preventDefault();
      roomModalEl.style.display = 'none';
      return;
    }

    // Calibration Mode Bypass Hatch (when cold-open calibration without level ID)
    if (state.gameMode === 'calibration' && !state.campaignLevelId) {
      e.preventDefault();
      if (typeof window !== 'undefined' && window.__tronBypassCalibration) {
        window.__tronBypassCalibration();
      }
      return;
    }

    // 3. Pointer Lock Evaluation (Tier 1 vs Tier 2)
    const pointerLocked = typeof document !== 'undefined' && (!!document.pointerLockElement || isLocked());

    if (pointerLocked) {
      // Tier 1: Pointer locked during match
      // Release pointer lock, pause match if running, keep fullscreen
      e.preventDefault();
      if (typeof document !== 'undefined' && document.exitPointerLock) {
        try { document.exitPointerLock(); } catch (_) {}
      }
      if (state.running && !state.paused) {
        const now = performance.now();
        if (now - state.lastPauseToggle > 180) {
          state.lastPauseToggle = now;
          if (state.gameMode !== 'duel_multi' && state.gameMode !== 'duos_multi') {
            triggerPauseGame();
          }
        }
      }
      return;
    }

    // Tier 2: Pointer is NOT locked (Pause Menu, Game Over / Defeat, Lobby, etc.)
    if (isFullScreen()) {
      e.preventDefault();
      exitFullScreen();
      return;
    }

    // Windowed fallback (not fullscreen, pointer unlocked):
    if (state.gameMode === 'lobby') {
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

    if (state.running) {
      const now = performance.now();
      if (now - state.lastPauseToggle > 180) {
        state.lastPauseToggle = now;
        if (state.gameMode !== 'duel_multi' && state.gameMode !== 'duos_multi') {
          if (state.paused) {
            triggerResumeGame();
          } else {
            triggerPauseGame();
          }
        }
      }
      return;
    }

    return;
  }

  if (state.authModalOpen || state.armoryModalOpen) {
    return;
  }

  // Handle lobby mode input isolation: disable locomotion keys & KeyP
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
    if (e.key === '?' || (c === 'Slash' && e.shiftKey)) {
      e.preventDefault();
      if (typeof window !== 'undefined' && typeof window.__tronToggleDirectives === 'function') {
        window.__tronToggleDirectives();
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
  if (c === 'KeyP') {
    if (state.running) {
      const now = performance.now();
      if (now - state.lastPauseToggle > 180) {
        state.lastPauseToggle = now;
        if (state.gameMode !== 'duel_multi' && state.gameMode !== 'duos_multi') {
          if (state.paused) {
            triggerResumeGame();
          } else {
            triggerPauseGame();
          }
        }
      }
    }
    return;
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
