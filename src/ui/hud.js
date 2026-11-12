import * as THREE from '../../vendor/three.module.js';
import { state, player } from '../core/state.js';
import { camera } from '../graphics/scene.js';
import { isLocked } from '../input/mouse.js';
import { getPlayerCurveIntent } from '../input/keyboard.js';

export const el = id => (typeof document !== 'undefined' ? document.getElementById(id) : null);
export const msgEl = el('msg');
const _projVec = new THREE.Vector3();

export function message(t) {
  const msg = msgEl || el('msg');
  if (!msg) return;
  msg.textContent = t;
  msg.style.opacity = 1;
  state.msgT = 2;
  if (t === 'SURFACE COLLAPSE — JUMP / DASH!') {
    msg.style.color = 'var(--orange)';
    msg.style.textShadow = '0 0 28px var(--orange), 0 0 10px #ffffff';
  } else if (t === 'RIVAL CAUGHT DISC!' || t === 'RIVAL COUNTER-CATCH!') {
    msg.style.color = 'var(--orange)';
    msg.style.textShadow = '0 0 28px var(--orange), 0 0 10px #ffffff';
  } else if (t === 'DEFLECTED!') {
    msg.style.color = '#ffffff';
    msg.style.textShadow = '0 0 24px var(--cyan), 0 0 8px #ffffff';
  } else {
    msg.style.color = 'var(--cyan)';
    msg.style.textShadow = '0 0 22px var(--cyan)';
  }
}

export function updateHUD() {
  const hpb = el('hpbar');
  if (hpb && hpb.firstElementChild) hpb.firstElementChild.style.width = state.player.hp + '%';
  const db = el('discbar');
  if (db && db.firstElementChild) db.firstElementChild.style.width = (state.player.hasDisc ? 100 : 0) + '%';
  const eb = el('energybar');
  if (eb && eb.firstElementChild) eb.firstElementChild.style.width = state.player.energy + '%';

  const rl = el('roundLabel');
  const sl = el('subLabel');
  const sr = el('scoreRow');
  const trHeader = el('trHeaderRow');
  const bbw = el('bossBarWrap');
  const bbl = el('bossBarLabel');
  const bb = el('bossbar');

  if (state.gameMode === 'duel' || state.gameMode === 'duel_ai') {
    if (trHeader) trHeader.style.marginBottom = '4px';
    if (rl) {
      rl.style.display = '';
      rl.innerHTML = `TIER: <span id="wave" class="big">${state.tier || state.duelTier || 1}</span>`;
    }
    if (sr) sr.style.display = '';
    const boss = state.foes[0];
    const hpPct = boss ? Math.max(0, Math.round((boss.hp / boss.maxHp) * 100)) : 0;
    if (sl) {
      sl.style.display = '';
      sl.innerHTML = `RIVAL INTEGRITY <span id="rivalHp">${hpPct}%</span>`;
    }
    if (bbw) bbw.style.display = 'block';
    if (bbl) bbl.textContent = 'RIVAL SHIELD';
    if (bb && bb.firstElementChild) bb.firstElementChild.style.width = hpPct + '%';
  } else if (state.gameMode === 'duel_multi' || state.gameMode === 'duos_multi') {
    if (trHeader) trHeader.style.marginBottom = '0';
    if (rl) rl.style.display = 'none';
    if (sr) sr.style.display = 'none';
    if (sl) sl.style.display = 'none';
    let oppHp = 0;
    for (const f of state.foes) {
      if (f.alive) oppHp += Math.max(0, Math.ceil(f.hp));
    }
    if (bbw) bbw.style.display = 'block';
    if (bbl) bbl.textContent = state.gameMode === 'duos_multi' ? 'RIVALS' : 'RIVAL';
    const maxHp = (state.gameMode === 'duos_multi' ? 200 : 100);
    const pct = Math.max(0, Math.min(100, (oppHp / maxHp) * 100));
    if (bb && bb.firstElementChild) bb.firstElementChild.style.width = pct + '%';
  } else {
    if (trHeader) trHeader.style.marginBottom = '4px';
    if (rl) {
      rl.style.display = '';
      rl.innerHTML = `CYCLE <span id="wave" class="big">${state.wave}</span>`;
    }
    if (sr) sr.style.display = '';
    if (sl) {
      sl.style.display = '';
      sl.innerHTML = `HOSTILES <span id="foes">${state.foes.length}</span>`;
    }
    if (bbw) bbw.style.display = 'none';
  }

  const sc = el('score');
  if (sc) sc.textContent = state.score;
}

export function resetHintVisibility(duration = 4.5) {
  state.hintTimer = duration;
  if (typeof document === 'undefined') return;
  const h = document.getElementById('hint');
  const mh = document.getElementById('mobileHint');
  if (h) {
    h.style.display = '';
    h.style.opacity = '';
  }
  if (mh) {
    mh.style.display = '';
    mh.style.opacity = '';
  }
}

export function updateControlHintTimer(dt) {
  if (typeof document === 'undefined') return;
  if (state.hintTimer === undefined || state.hintTimer <= 0) return;

  state.hintTimer = Math.max(0, state.hintTimer - dt);
  const h = document.getElementById('hint');
  const mh = document.getElementById('mobileHint');

  if (state.hintTimer <= 0) {
    if (h) {
      h.style.opacity = '0';
      h.style.display = 'none';
    }
    if (mh) {
      mh.style.opacity = '0';
      mh.style.display = 'none';
    }
  } else if (state.hintTimer < 0.7) {
    const fadeOp = (state.hintTimer / 0.7).toFixed(2);
    if (h && !state.isTouchDevice) h.style.opacity = fadeOp;
    if (mh && state.isTouchDevice) mh.style.opacity = fadeOp;
  }
}

export function clearArenaNameplates() {
  if (typeof document === 'undefined') return;
  const container = document.getElementById('arenaNameplates');
  if (container) {
    container.innerHTML = '';
    container.style.display = 'none';
  }
}

export function updateArenaNameplates() {
  if (typeof document === 'undefined') return;
  const container = document.getElementById('arenaNameplates');
  if (!container) return;

  const isOnline = state.gameMode === 'duel_multi' || state.gameMode === 'duos_multi';
  if (!isOnline || !state.running || !state.multiPlayers) {
    container.style.display = 'none';
    return;
  }
  container.style.display = 'block';

  if (camera && typeof camera.updateMatrixWorld === 'function') {
    camera.updateMatrixWorld();
  }

  const w = (typeof window !== 'undefined' && window.innerWidth) ? window.innerWidth : 800;
  const h = (typeof window !== 'undefined' && window.innerHeight) ? window.innerHeight : 600;
  const myRole = state.playerRole || 'p1';
  const myTeam = (myRole === 'p1' || myRole === 'p3') ? 1 : 2;
  const activeRoles = new Set();

  for (const r in state.multiPlayers) {
    if (r === myRole) continue;
    const opp = state.multiPlayers[r];
    activeRoles.add(r);

    let tag = container.querySelector(`.arena-nameplate[data-role="${r}"]`);
    if (!tag && typeof document.createElement === 'function') {
      tag = document.createElement('div');
      tag.className = 'arena-nameplate';
      tag.setAttribute('data-role', r);
      container.appendChild(tag);
    }
    if (!tag) continue;

    if (!opp || !opp.alive || (opp.hp !== undefined && opp.hp <= 0) || (opp.obj && (opp.obj.visible === false || !opp.obj.parent)) || !opp.pos || !camera) {
      tag.style.display = 'none';
      continue;
    }

    const displayName = opp.name || (state.multiplayerNames && state.multiplayerNames[r]) || r.toUpperCase();
    if (tag.textContent !== displayName) {
      tag.textContent = displayName;
    }

    const isAlly = opp.team === myTeam;
    const desiredClass = `arena-nameplate ${isAlly ? 'team-ally' : 'team-foe'}`;
    if (tag.className !== desiredClass) {
      tag.className = desiredClass;
    }

    _projVec.set(opp.pos.x, (opp.y || 0) + 2.45, opp.pos.z);
    _projVec.project(camera);

    if (!Number.isFinite(_projVec.x) || !Number.isFinite(_projVec.y) || _projVec.z < -1 || _projVec.z > 1) {
      tag.style.display = 'none';
      continue;
    }

    const sx = (_projVec.x * 0.5 + 0.5) * w;
    const sy = (-_projVec.y * 0.5 + 0.5) * h;

    if (sx < -60 || sx > w + 60 || sy < -30 || sy > h + 30) {
      tag.style.display = 'none';
      continue;
    }

    tag.style.display = 'block';
    tag.style.transform = `translate3d(${sx.toFixed(1)}px, ${sy.toFixed(1)}px, 0) translate(-50%, -100%)`;
  }

  const existing = container.querySelectorAll('.arena-nameplate');
  for (let i = 0; i < existing.length; i++) {
    const roleAttr = existing[i].getAttribute('data-role');
    if (!activeRoles.has(roleAttr)) {
      existing[i].style.display = 'none';
    }
  }
}

export function updateCrosshair(aim, traj) {
  const ch = document.getElementById('crosshair');
  if (ch) {
    const onFoe = !!aim.foe || !!(traj && traj.willHit);
    ch.classList.toggle('hot', onFoe);
    ch.classList.toggle('bank', !!(traj && traj.willHit && traj.bounces > 0));
    ch.classList.toggle('empty', !state.player.hasDisc);
    const qHeld = (!!state.keys.KeyQ || state.touchCurveL || state.gamepadCurveL) && !(!!state.keys.KeyE || state.touchCurveR || state.gamepadCurveR);
    const eHeld = (!!state.keys.KeyE || state.touchCurveR || state.gamepadCurveR) && !(!!state.keys.KeyQ || state.touchCurveL || state.gamepadCurveL);
    ch.classList.toggle('curve-l', qHeld);
    ch.classList.toggle('curve-r', eHeld);

    const charge = state.player.throwCharge || 0;
    const isCharging = state.player.chargingThrow && charge > 0;
    const arcSvg = document.getElementById('chargeArc');
    if (arcSvg) {
      if (isCharging) {
        arcSvg.style.display = 'block';
        const circle = arcSvg.querySelector('circle');
        if (circle) {
          const circumference = 113.1;
          const offset = circumference * (1 - charge);
          circle.style.strokeDashoffset = offset.toFixed(1);
          if (charge >= 0.85) {
            circle.setAttribute('stroke', '#ffffff');
            circle.style.filter = 'drop-shadow(0 0 8px #ffffff) drop-shadow(0 0 4px var(--orange))';
            circle.setAttribute('stroke-width', '3.5');
          } else {
            circle.setAttribute('stroke', 'var(--cyan)');
            circle.style.filter = 'drop-shadow(0 0 6px var(--cyan))';
            circle.setAttribute('stroke-width', '2.5');
          }
        }
      } else {
        arcSvg.style.display = 'none';
      }
    }
    ch.classList.toggle('guard-crush-ready', charge >= 0.85);

    const range = document.getElementById('range');
    if (range) range.textContent = aim.dist < 300 ? Math.round(aim.dist) + 'M' : '';
  }
}

export function updateKeyMonitor() {
  const km = document.getElementById('keymon');
  if (km && km.style.display === 'block') {
    const on = k => state.keys[k] ? 'style="color:#fff;text-shadow:0 0 8px #fff"' : 'style="opacity:.3"';
    km.innerHTML = `<b ${on('KeyW')}>W</b> <b ${on('KeyA')}>A</b> <b ${on('KeyS')}>S</b> <b ${on('KeyD')}>D</b>
      <b ${on('KeyQ')}>Q</b> <b ${on('KeyE')}>E</b>
      <b ${on('Space')}>SPACE</b> <b ${on('ShiftLeft')}>SHIFT</b><br>
      curve ${getPlayerCurveIntent().toFixed(2)} · y ${player.y.toFixed(2)} · jumps ${player.jumps} · grounded ${player.grounded}<br>
      pointerlock ${isLocked()} · focus ${document.hasFocus()}`;
  }
}

export function updateLockStateBanner() {
  const lb = document.getElementById('lockstate');
  if (lb) lb.style.display = (state.isTouchDevice || isLocked()) ? 'none' : 'block';
}

export function updateOfflineBanner(isOnline, pendingCount = 0) {
  if (typeof document === 'undefined') return;
  const banner = document.getElementById('offlineSyncBanner');
  if (!banner) return;
  if (!isOnline) {
    banner.style.display = 'flex';
    const textEl = document.getElementById('offlineBannerText');
    if (textEl) {
      textEl.textContent = pendingCount > 0
        ? `[GRID OFFLINE] ${pendingCount} MUTATIONS QUEUED // PROGRESS SAFEGUARDED`
        : `[GRID OFFLINE] SYNC BUFFER ACTIVE // PROGRESS SAFEGUARDED`;
    }
  } else {
    banner.style.display = 'none';
  }
}

/**
 * Spawns an animated kinetic floating neon +Credits indicator on the HUD.
 * @param {number} amount
 * @param {string} [label=''] e.g. "PARRY", "BANK SHOT", "CURVE KILL"
 * @param {object} [options]
 * @returns {object|null}
 */
export function showFloatingNeonCredits(amount, label = '', options = {}) {
  if (typeof document === 'undefined') return null;

  let container = document.getElementById('floatingEconomyLayer');
  if (!container) {
    container = document.createElement('div');
    container.id = 'floatingEconomyLayer';
    container.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:9999;overflow:hidden;';
    if (document.body) {
      document.body.appendChild(container);
    }

    if (document.head && !document.getElementById('floatingNeonBitsStyle')) {
      const style = document.createElement('style');
      style.id = 'floatingNeonBitsStyle';
      style.textContent = `
        @keyframes neonFloatRise {
          0% {
            opacity: 0;
            transform: translate(-50%, 0) scale(0.85);
          }
          18% {
            opacity: 1;
            transform: translate(-50%, -16px) scale(1.12);
          }
          75% {
            opacity: 1;
            transform: translate(-50%, -46px) scale(1.0);
          }
          100% {
            opacity: 0;
            transform: translate(-50%, -70px) scale(0.9);
          }
        }
      `;
      document.head.appendChild(style);
    }
  }

  const badge = document.createElement('div');
  badge.className = 'floating-neon-bits';
  const labelText = label ? ` // ${label}` : '';
  badge.textContent = `+${amount} CREDITS${labelText}`;

  const jitterX = (Math.random() - 0.5) * 80;
  const posX = options.x !== undefined ? options.x : (typeof window !== 'undefined' && window.innerWidth ? window.innerWidth / 2 + jitterX : 200);
  const posY = options.y !== undefined ? options.y : (typeof window !== 'undefined' && window.innerHeight ? window.innerHeight * 0.38 : 150);

  const accentColor = options.color || '#00f3ff';
  const glowColor = options.glow || '#0066ff';

  badge.style.cssText = `
    position: absolute;
    left: ${posX}px;
    top: ${posY}px;
    color: ${accentColor};
    font-family: inherit;
    font-size: 14px;
    font-weight: 800;
    letter-spacing: 2.5px;
    text-shadow: 0 0 10px ${accentColor}, 0 0 20px ${glowColor}, 0 0 35px #ffffff;
    pointer-events: none;
    user-select: none;
    animation: neonFloatRise 0.9s cubic-bezier(0.18, 0.89, 0.32, 1.28) forwards;
    white-space: nowrap;
    z-index: 10000;
  `;

  container.appendChild(badge);

  const timer = setTimeout(() => {
    if (badge.parentNode) {
      badge.parentNode.removeChild(badge);
    }
  }, 950);

  return {
    element: badge,
    container,
    cleanup: () => {
      clearTimeout(timer);
      if (badge.parentNode) {
        badge.parentNode.removeChild(badge);
      }
    }
  };
}

export const showFloatingNeonBits = showFloatingNeonCredits;

