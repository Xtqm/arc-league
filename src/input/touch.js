import * as THREE from '../../vendor/three.module.js';
import { state, player, touchState } from '../core/state.js';
import { settingsManager } from '../core/settings.js';
import { sens } from './mouse.js';

export const MAX_TOUCH_DELTA = 240;
export const MAX_FLICK_SPEED = 2200;
export const VEL_EMA_ALPHA = 0.45;
export const STALE_RELEASE_MS = 80;
export const THROW_DRAG_SLOP = 4;
export const PITCH_TOUCH_SCALE = 0.75;
export const INERTIA_DAMPING = Object.freeze({
  smooth: 10.5,
  light: 18.0,
  off: Infinity
});

export const moveStartPos = { x: 0, y: 0 };
export const touchMove = { x: 0, y: 0 };

export const lookLastPos = {
  get x() { return touchState.lastLookX; },
  set x(v) { touchState.lastLookX = v; },
  get y() { return touchState.lastLookY; },
  set y(v) { touchState.lastLookY = v; }
};

export let joyBase = null;
export let joyThumb = null;
export const R_STICK = 52; // radius in px

export function showJoystick(x, y) {
  if (!joyBase) joyBase = document.getElementById('joystickBase');
  if (!joyThumb) joyThumb = document.getElementById('joystickThumb');
  if (!joyBase) return;
  joyBase.style.left = `${x}px`;
  joyBase.style.top = `${y}px`;
  joyBase.style.opacity = '1';
  joyBase.style.transform = 'scale(1)';
  if (joyThumb) joyThumb.style.transform = 'translate3d(0, 0, 0)';
}

export function updateJoystick(x, y) {
  if (!joyThumb) joyThumb = document.getElementById('joystickThumb');
  const dx = x - moveStartPos.x;
  const dy = y - moveStartPos.y;
  const dist = Math.hypot(dx, dy);
  let cx = dx, cy = dy;
  if (dist > R_STICK) {
    cx = (dx / dist) * R_STICK;
    cy = (dy / dist) * R_STICK;
  }
  touchMove.x = cx / R_STICK;
  touchMove.y = cy / R_STICK;
  if (joyThumb) {
    joyThumb.style.transform = `translate3d(${cx}px, ${cy}px, 0)`;
  }
}

export function hideJoystick() {
  if (!joyBase) joyBase = document.getElementById('joystickBase');
  if (!joyThumb) joyThumb = document.getElementById('joystickThumb');
  if (joyBase) {
    joyBase.style.opacity = '0';
    joyBase.style.transform = 'scale(0.85)';
  }
  if (joyThumb) {
    joyThumb.style.transform = 'translate3d(0, 0, 0)';
  }
  touchMove.x = 0;
  touchMove.y = 0;
}

export function updateCurveButtons() {
  const btnCurveL = document.getElementById('btnCurveL');
  const btnCurveR = document.getElementById('btnCurveR');
  if (btnCurveL) btnCurveL.classList.toggle('active', state.touchCurveL);
  if (btnCurveR) btnCurveR.classList.toggle('active', state.touchCurveR);
}

function nowMs() {
  return (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
}

export function getEffectiveTouchSensitivity() {
  const raw = Number(settingsManager.get('touchSensitivity', 1.0));
  const mult = Number.isFinite(raw) ? THREE.MathUtils.clamp(raw, 0.5, 2.0) : 1.0;
  return state.sens * 2.5 * mult;
}

export function getInertiaDamping() {
  const mode = String(settingsManager.get('touchInertia', 'smooth')).toLowerCase();
  return Object.prototype.hasOwnProperty.call(INERTIA_DAMPING, mode)
    ? INERTIA_DAMPING[mode]
    : INERTIA_DAMPING.smooth;
}

function clearLookVelocity() {
  touchState.lookMomentumX = 0;
  touchState.lookMomentumY = 0;
  touchState.hasLookVelocity = false;
  touchState.lastLookMoveTime = 0;
}

function applyTouchLookDelta(dX, dY) {
  const touchYawSens = getEffectiveTouchSensitivity();
  const touchPitchSens = touchYawSens * PITCH_TOUCH_SCALE;
  const ySign = state.invertY ? -1 : 1;
  player.yaw -= dX * touchYawSens;
  player.pitch = THREE.MathUtils.clamp(
    player.pitch - dY * touchPitchSens * ySign,
    -0.6,
    0.55
  );
  if (player.yaw > Math.PI) player.yaw -= Math.PI * 2;
  if (player.yaw < -Math.PI) player.yaw += Math.PI * 2;
}

export function resetTouchInputs({ cancelThrow = true } = {}) {
  state.moveTouchId = null;
  state.lookTouchId = null;
  state.throwTouchId = null;
  touchState.lastLookX = 0;
  touchState.lastLookY = 0;
  touchState.lastLookTime = 0;
  touchState.throwStartX = 0;
  touchState.throwStartY = 0;
  touchState.lastThrowX = 0;
  touchState.lastThrowY = 0;
  touchState.throwDragActive = false;
  clearLookVelocity();
  state.touchJumpHeld = false;
  state.touchDashRequested = false;
  state.touchBlocking = false;
  if (state.player && !state.keys?.KeyShift && !state.gamepadBlocking) {
    state.player.blocking = false;
  }
  state.touchCurveL = false;
  state.touchCurveR = false;
  hideJoystick();
  updateCurveButtons();
  if (cancelThrow && typeof window !== 'undefined' && window.__tronCancelChargingThrow) {
    window.__tronCancelChargingThrow();
  }
  if (typeof document !== 'undefined' && document.querySelectorAll) {
    document.querySelectorAll('.touch-btn.pressed').forEach((el) => el.classList.remove('pressed'));
  }
}

export function onTouchStart(e) {
  if (e.target && e.target.closest && e.target.closest('.card')) {
    return;
  }

  for (let i = 0; i < e.changedTouches.length; i++) {
    const t = e.changedTouches[i];
    if (t.target && t.target.closest && t.target.closest('.card')) continue;
    if (t.target && t.target.closest && t.target.closest('.touch-btn, .hud-btn, .btn, .mode-btn')) continue;
    if (!state.running || state.paused) continue;

    if (t.clientX < window.innerWidth * 0.45 && state.moveTouchId === null) {
      state.moveTouchId = t.identifier;
      moveStartPos.x = t.clientX;
      moveStartPos.y = t.clientY;
      touchMove.x = 0;
      touchMove.y = 0;
      showJoystick(t.clientX, t.clientY);
      e.preventDefault();
    } else if (t.clientX >= window.innerWidth * 0.45) {
      clearLookVelocity();
      if (state.lookTouchId === null) {
        state.lookTouchId = t.identifier;
        touchState.lastLookX = t.clientX;
        touchState.lastLookY = t.clientY;
        touchState.lastLookTime = nowMs();
        e.preventDefault();
      }
    }
  }
}

export function onTouchMove(e) {
  if (e.target && e.target.closest && e.target.closest('.card')) {
    return;
  }
  if (!state.running || state.paused) return;

  for (let i = 0; i < e.changedTouches.length; i++) {
    const t = e.changedTouches[i];
    if (t.target && t.target.closest && t.target.closest('.card')) continue;
    if (t.identifier === state.moveTouchId) {
      e.preventDefault();
      updateJoystick(t.clientX, t.clientY);
    } else if (t.identifier === state.lookTouchId) {
      e.preventDefault();
      const rawDx = t.clientX - touchState.lastLookX;
      const rawDy = t.clientY - touchState.lastLookY;
      const dX = THREE.MathUtils.clamp(rawDx, -MAX_TOUCH_DELTA, MAX_TOUCH_DELTA);
      const dY = THREE.MathUtils.clamp(rawDy, -MAX_TOUCH_DELTA, MAX_TOUCH_DELTA);
      const now = nowMs();

      touchState.lastLookX = t.clientX;
      touchState.lastLookY = t.clientY;

      applyTouchLookDelta(dX, dY);

      const rawElapsedMs = touchState.lastLookTime > 0 ? (now - touchState.lastLookTime) : 16;
      const sampleDt = rawElapsedMs < 2
        ? 0.016
        : THREE.MathUtils.clamp(rawElapsedMs / 1000, 0.008, 0.05);
      const instVx = THREE.MathUtils.clamp(dX / sampleDt, -MAX_FLICK_SPEED, MAX_FLICK_SPEED);
      const instVy = THREE.MathUtils.clamp(dY / sampleDt, -MAX_FLICK_SPEED, MAX_FLICK_SPEED);

      if (!touchState.hasLookVelocity) {
        touchState.lookMomentumX = instVx;
        touchState.lookMomentumY = instVy;
        touchState.hasLookVelocity = true;
      } else {
        touchState.lookMomentumX += (instVx - touchState.lookMomentumX) * VEL_EMA_ALPHA;
        touchState.lookMomentumY += (instVy - touchState.lookMomentumY) * VEL_EMA_ALPHA;
      }
      touchState.lastLookTime = now;
      touchState.lastLookMoveTime = now;
    } else if (t.identifier === state.throwTouchId) {
      e.preventDefault();
      if (state.lookTouchId !== null) {
        touchState.lastThrowX = t.clientX;
        touchState.lastThrowY = t.clientY;
        continue;
      }
      if (!touchState.throwDragActive) {
        const totalDist = Math.hypot(t.clientX - touchState.throwStartX, t.clientY - touchState.throwStartY);
        if (totalDist <= THROW_DRAG_SLOP) continue;
        touchState.throwDragActive = true;
        const scale = (totalDist - THROW_DRAG_SLOP) / totalDist;
        const dX = THREE.MathUtils.clamp((t.clientX - touchState.lastThrowX) * scale, -MAX_TOUCH_DELTA, MAX_TOUCH_DELTA);
        const dY = THREE.MathUtils.clamp((t.clientY - touchState.lastThrowY) * scale, -MAX_TOUCH_DELTA, MAX_TOUCH_DELTA);
        touchState.lastThrowX = t.clientX;
        touchState.lastThrowY = t.clientY;
        applyTouchLookDelta(dX, dY);
      } else {
        const dX = THREE.MathUtils.clamp(t.clientX - touchState.lastThrowX, -MAX_TOUCH_DELTA, MAX_TOUCH_DELTA);
        const dY = THREE.MathUtils.clamp(t.clientY - touchState.lastThrowY, -MAX_TOUCH_DELTA, MAX_TOUCH_DELTA);
        touchState.lastThrowX = t.clientX;
        touchState.lastThrowY = t.clientY;
        applyTouchLookDelta(dX, dY);
      }
    }
  }
}

export function onTouchEnd(e) {
  if (e.target && e.target.closest && e.target.closest('.card')) {
    return;
  }
  for (let i = 0; i < e.changedTouches.length; i++) {
    const t = e.changedTouches[i];
    if (t.target && t.target.closest && t.target.closest('.card')) continue;
    if (t.identifier === state.moveTouchId) {
      state.moveTouchId = null;
      hideJoystick();
    } else if (t.identifier === state.lookTouchId) {
      const now = nowMs();
      const damping = getInertiaDamping();
      const stale = !touchState.hasLookVelocity ||
        touchState.lastLookMoveTime <= 0 ||
        (now - touchState.lastLookMoveTime) > STALE_RELEASE_MS;
      if (!Number.isFinite(damping) || stale) {
        clearLookVelocity();
      }
      state.lookTouchId = null;
    } else if (t.identifier === state.throwTouchId) {
      state.throwTouchId = null;
      touchState.throwDragActive = false;
      clearLookVelocity();
      if (typeof window !== 'undefined' && window.__tronReleaseChargingThrow) {
        window.__tronReleaseChargingThrow();
      }
      const btnThrow = typeof document !== 'undefined' ? document.getElementById('btnThrow') : null;
      if (btnThrow) btnThrow.classList.remove('pressed');
    }
  }
}

export function updateTouchMomentum(dt) {
  if (!state.isTouchDevice || !state.running || state.paused || !state.player.alive) {
    if (!state.isTouchDevice && (touchState.lookMomentumX !== 0 || touchState.lookMomentumY !== 0)) {
      clearLookVelocity();
    }
    return;
  }
  const damping = getInertiaDamping();
  if (!Number.isFinite(damping)) {
    clearLookVelocity();
    return;
  }
  if (touchState.lookId === null && (Math.abs(touchState.lookMomentumX) > 1.0 || Math.abs(touchState.lookMomentumY) > 1.0)) {
    const decay = Math.exp(-damping * dt);
    const effectiveDt = damping > 0 ? (1 - decay) / damping : dt;

    applyTouchLookDelta(
      touchState.lookMomentumX * effectiveDt,
      touchState.lookMomentumY * effectiveDt
    );

    touchState.lookMomentumX *= decay;
    touchState.lookMomentumY *= decay;

    if (Math.hypot(touchState.lookMomentumX, touchState.lookMomentumY) <= 1.5) {
      clearLookVelocity();
    }
  }
}

export function bindMobileButtons() {
  const btnThrow = document.getElementById('btnThrow');
  const btnJump = document.getElementById('btnJump');
  const btnDash = document.getElementById('btnDash');
  const btnBlock = document.getElementById('btnBlock');
  const btnCurveL = document.getElementById('btnCurveL');
  const btnCurveR = document.getElementById('btnCurveR');

  if (btnThrow) {
    const startThrow = (e) => {
      e.preventDefault(); e.stopPropagation();
      if (!state.running || state.paused) return;
      const t = e.changedTouches && e.changedTouches[0];
      if (t) {
        if (state.throwTouchId !== null && t.identifier !== state.throwTouchId) return;
        state.throwTouchId = t.identifier;
        touchState.throwStartX = t.clientX;
        touchState.throwStartY = t.clientY;
        touchState.lastThrowX = t.clientX;
        touchState.lastThrowY = t.clientY;
        touchState.throwDragActive = false;
      }
      clearLookVelocity();
      if (typeof window !== 'undefined' && window.__tronStartChargingThrow) {
        window.__tronStartChargingThrow();
      } else if (typeof window !== 'undefined' && window.__tronThrowDisc) {
        window.__tronThrowDisc();
      }
      btnThrow.classList.add('pressed');
    };
    const endThrow = (e) => {
      e.preventDefault(); e.stopPropagation();
      const touches = e.changedTouches;
      if (state.throwTouchId !== null && touches && touches.length > 0) {
        let matched = false;
        for (let i = 0; i < touches.length; i++) {
          if (touches[i].identifier === state.throwTouchId) {
            matched = true;
            break;
          }
        }
        if (!matched) return;
      }
      state.throwTouchId = null;
      touchState.throwDragActive = false;
      clearLookVelocity();
      if (typeof window !== 'undefined' && window.__tronReleaseChargingThrow) {
        window.__tronReleaseChargingThrow();
      }
      btnThrow.classList.remove('pressed');
    };
    btnThrow.addEventListener('touchstart', startThrow, { passive: false });
    btnThrow.addEventListener('touchend', endThrow, { passive: false });
    btnThrow.addEventListener('touchcancel', endThrow, { passive: false });
  }

  if (btnJump) {
    const startJump = (e) => {
      e.preventDefault(); e.stopPropagation();
      state.touchJumpHeld = true;
      state.player.jumpBuf = 0.15;
      btnJump.classList.add('pressed');
    };
    const endJump = (e) => {
      e.preventDefault(); e.stopPropagation();
      state.touchJumpHeld = false;
      btnJump.classList.remove('pressed');
    };
    btnJump.addEventListener('touchstart', startJump, { passive: false });
    btnJump.addEventListener('touchend', endJump, { passive: false });
    btnJump.addEventListener('touchcancel', endJump, { passive: false });
  }

  if (btnDash) {
    const doDash = (e) => {
      e.preventDefault(); e.stopPropagation();
      state.touchDashRequested = true;
      btnDash.classList.add('pressed');
      setTimeout(() => btnDash.classList.remove('pressed'), 140);
    };
    btnDash.addEventListener('touchstart', doDash, { passive: false });
    btnDash.addEventListener('click', doDash);
  }

  if (btnBlock) {
    const startBlock = (e) => {
      e.preventDefault(); e.stopPropagation();
      state.touchBlocking = true;
      state.player.blocking = true;
      btnBlock.classList.add('pressed');
    };
    const endBlock = (e) => {
      e.preventDefault(); e.stopPropagation();
      state.touchBlocking = false;
      state.player.blocking = false;
      btnBlock.classList.remove('pressed');
    };
    btnBlock.addEventListener('touchstart', startBlock, { passive: false });
    btnBlock.addEventListener('touchend', endBlock, { passive: false });
    btnBlock.addEventListener('touchcancel', endBlock, { passive: false });
  }

  if (btnCurveL) {
    const doCurveL = (e) => {
      e.preventDefault(); e.stopPropagation();
      state.touchCurveL = !state.touchCurveL;
      if (state.touchCurveL) state.touchCurveR = false;
      updateCurveButtons();
    };
    btnCurveL.addEventListener('touchstart', doCurveL, { passive: false });
    btnCurveL.addEventListener('click', doCurveL);
  }

  if (btnCurveR) {
    const doCurveR = (e) => {
      e.preventDefault(); e.stopPropagation();
      state.touchCurveR = !state.touchCurveR;
      if (state.touchCurveR) state.touchCurveL = false;
      updateCurveButtons();
    };
    btnCurveR.addEventListener('touchstart', doCurveR, { passive: false });
    btnCurveR.addEventListener('click', doCurveR);
  }
}

export function initTouch(targetWindow = window) {
  joyBase = document.getElementById('joystickBase');
  joyThumb = document.getElementById('joystickThumb');
  targetWindow.addEventListener('touchstart', onTouchStart, { passive: false });
  targetWindow.addEventListener('touchmove', onTouchMove, { passive: false });
  targetWindow.addEventListener('touchend', onTouchEnd, { passive: false });
  targetWindow.addEventListener('touchcancel', onTouchEnd, { passive: false });
  targetWindow.addEventListener('blur', () => resetTouchInputs());
  bindMobileButtons();
}
