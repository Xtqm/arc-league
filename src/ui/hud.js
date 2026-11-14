import * as THREE from '../../vendor/three.module.js';
import { state, player } from '../core/state.js';
import { camera } from '../graphics/scene.js';
import { isLocked } from '../input/mouse.js';
import { getPlayerCurveIntent } from '../input/keyboard.js';

export const el = id => (typeof document !== 'undefined' ? document.getElementById(id) : null);
export const msgEl = el('msg');
const _projVec = new THREE.Vector3();

const _domCache = Object.create(null);

export function getCachedElement(id) {
  if (typeof document === 'undefined') return null;
  let element = _domCache[id];
  if (!element || !element.isConnected) {
    element = document.getElementById(id);
    if (element) _domCache[id] = element;
  }
  return element;
}

export function getCachedFill(parentId, fillKey) {
  if (typeof document === 'undefined') return null;
  let fill = _domCache[fillKey];
  if (!fill || !fill.isConnected) {
    const parent = getCachedElement(parentId);
    fill = parent ? parent.firstElementChild : null;
    if (fill) _domCache[fillKey] = fill;
  }
  return fill;
}

let _lastPlayerHp = -1;
let _lastPlayerHasDisc = null;
let _lastPlayerEnergy = -1;
let _lastScore = null;
let _lastTrMargin = null;
let _lastRoundLabelHtml = null;
let _lastRoundLabelDisplay = null;
let _lastSubLabelHtml = null;
let _lastSubLabelDisplay = null;
let _lastScoreRowDisplay = null;
let _lastBbwDisplay = null;
let _lastBblText = null;
let _lastRivalHpPct = -1;
let _lastSwHtml = null;
let _lastSwDisplay = null;

export function resetHUDDirtyState() {
  _lastPlayerHp = -1;
  _lastPlayerHasDisc = null;
  _lastPlayerEnergy = -1;
  _lastScore = null;
  _lastTrMargin = null;
  _lastRoundLabelHtml = null;
  _lastRoundLabelDisplay = null;
  _lastSubLabelHtml = null;
  _lastSubLabelDisplay = null;
  _lastScoreRowDisplay = null;
  _lastBbwDisplay = null;
  _lastBblText = null;
  _lastRivalHpPct = -1;
  _lastSwHtml = null;
  _lastSwDisplay = null;
}

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
  if (typeof document === 'undefined') return;

  if (state.player.hp !== _lastPlayerHp) {
    const hpbFill = getCachedFill('hpbar', 'hpbFill');
    if (hpbFill) {
      hpbFill.style.width = state.player.hp + '%';
      _lastPlayerHp = state.player.hp;
    }
  }

  if (state.player.hasDisc !== _lastPlayerHasDisc) {
    const dbFill = getCachedFill('discbar', 'dbFill');
    if (dbFill) {
      dbFill.style.width = (state.player.hasDisc ? 100 : 0) + '%';
      _lastPlayerHasDisc = state.player.hasDisc;
    }
  }

  if (state.player.energy !== _lastPlayerEnergy) {
    const ebFill = getCachedFill('energybar', 'ebFill');
    if (ebFill) {
      ebFill.style.width = state.player.energy + '%';
      _lastPlayerEnergy = state.player.energy;
    }
  }

  const rl = getCachedElement('roundLabel');
  const sl = getCachedElement('subLabel');
  const sr = getCachedElement('scoreRow');
  const trHeader = getCachedElement('trHeaderRow');
  const bbw = getCachedElement('bossBarWrap');
  const bbl = getCachedElement('bossBarLabel');
  const bbFill = getCachedFill('bossbar', 'bbFill');
  const sw = getCachedElement('seriesHudWrap');

  if (state.gameMode === 'duel' || state.gameMode === 'duel_ai') {
    if (trHeader && _lastTrMargin !== '4px') {
      trHeader.style.marginBottom = '4px';
      _lastTrMargin = '4px';
    }
    const tierVal = state.tier || state.duelTier || 1;
    const rlHtml = `TIER: <span id="wave" class="big">${tierVal}</span>`;
    if (rl) {
      if (_lastRoundLabelDisplay !== '') {
        rl.style.display = '';
        _lastRoundLabelDisplay = '';
      }
      if (_lastRoundLabelHtml !== rlHtml) {
        rl.innerHTML = rlHtml;
        _lastRoundLabelHtml = rlHtml;
      }
    }
    if (sr && _lastScoreRowDisplay !== '') {
      sr.style.display = '';
      _lastScoreRowDisplay = '';
    }

    const boss = state.foes[0];
    const hpPct = boss ? Math.max(0, Math.round((boss.hp / boss.maxHp) * 100)) : 0;
    const slHtml = `RIVAL INTEGRITY <span id="rivalHp">${hpPct}%</span>`;
    if (sl) {
      if (_lastSubLabelDisplay !== '') {
        sl.style.display = '';
        _lastSubLabelDisplay = '';
      }
      if (_lastSubLabelHtml !== slHtml) {
        sl.innerHTML = slHtml;
        _lastSubLabelHtml = slHtml;
      }
    }
    if (bbw && _lastBbwDisplay !== 'block') {
      bbw.style.display = 'block';
      _lastBbwDisplay = 'block';
    }
    if (bbl && _lastBblText !== 'RIVAL SHIELD') {
      bbl.textContent = 'RIVAL SHIELD';
      _lastBblText = 'RIVAL SHIELD';
    }
    if (bbFill && _lastRivalHpPct !== hpPct) {
      bbFill.style.width = hpPct + '%';
      _lastRivalHpPct = hpPct;
    }
    if (sw && _lastSwDisplay !== 'none') {
      sw.style.display = 'none';
      _lastSwDisplay = 'none';
    }
  } else if (state.gameMode === 'duel_multi' || state.gameMode === 'duos_multi') {
    if (trHeader && _lastTrMargin !== '0') {
      trHeader.style.marginBottom = '0';
      _lastTrMargin = '0';
    }
    if (rl && _lastRoundLabelDisplay !== 'none') {
      rl.style.display = 'none';
      _lastRoundLabelDisplay = 'none';
    }
    if (sr && _lastScoreRowDisplay !== 'none') {
      sr.style.display = 'none';
      _lastScoreRowDisplay = 'none';
    }
    if (sl && _lastSubLabelDisplay !== 'none') {
      sl.style.display = 'none';
      _lastSubLabelDisplay = 'none';
    }

    let oppHp = 0;
    for (const f of state.foes) {
      if (f.alive) oppHp += Math.max(0, Math.ceil(f.hp));
    }
    if (bbw && _lastBbwDisplay !== 'block') {
      bbw.style.display = 'block';
      _lastBbwDisplay = 'block';
    }
    const bblText = state.gameMode === 'duos_multi' ? 'RIVALS' : 'RIVAL';
    if (bbl && _lastBblText !== bblText) {
      bbl.textContent = bblText;
      _lastBblText = bblText;
    }
    const maxHp = (state.gameMode === 'duos_multi' ? 200 : 100);
    const pct = Math.max(0, Math.min(100, (oppHp / maxHp) * 100));
    if (bbFill && _lastRivalHpPct !== pct) {
      bbFill.style.width = pct + '%';
      _lastRivalHpPct = pct;
    }
    if (sw) {
      const bestOf = Number(state.seriesBestOf) || 1;
      if (bestOf > 1) {
        const myTeam = (state.playerRole === 'p2' || state.playerRole === 'p4') ? 2 : 1;
        const foeTeam = myTeam === 1 ? 2 : 1;
        const winsNeeded = Math.ceil(bestOf / 2);
        const scores = state.seriesScores || { t1: 0, t2: 0 };
        const myWins = Number(scores[`t${myTeam}`]) || 0;
        const foeWins = Number(scores[`t${foeTeam}`]) || 0;
        const renderPips = (count, cls) => Array.from({ length: winsNeeded }, (_, i) =>
          `<span class="series-pip ${cls}${i < count ? ' won' : ''}"></span>`
        ).join('');
        const swHtml = `<span class="series-pips">${renderPips(myWins, 'you')}</span><span class="series-score-num">${myWins} - ${foeWins}</span><span class="series-pips">${renderPips(foeWins, 'foe')}</span>`;
        if (_lastSwDisplay !== 'flex') {
          sw.style.display = 'flex';
          _lastSwDisplay = 'flex';
        }
        if (_lastSwHtml !== swHtml) {
          sw.innerHTML = swHtml;
          _lastSwHtml = swHtml;
        }
      } else {
        if (_lastSwDisplay !== 'none') {
          sw.style.display = 'none';
          _lastSwDisplay = 'none';
        }
      }
    }
  } else {
    if (trHeader && _lastTrMargin !== '4px') {
      trHeader.style.marginBottom = '4px';
      _lastTrMargin = '4px';
    }
    const waveHtml = `CYCLE <span id="wave" class="big">${state.wave}</span>`;
    if (rl) {
      if (_lastRoundLabelDisplay !== '') {
        rl.style.display = '';
        _lastRoundLabelDisplay = '';
      }
      if (_lastRoundLabelHtml !== waveHtml) {
        rl.innerHTML = waveHtml;
        _lastRoundLabelHtml = waveHtml;
      }
    }
    if (sr && _lastScoreRowDisplay !== '') {
      sr.style.display = '';
      _lastScoreRowDisplay = '';
    }
    const foesHtml = `HOSTILES <span id="foes">${state.foes.length}</span>`;
    if (sl) {
      if (_lastSubLabelDisplay !== '') {
        sl.style.display = '';
        _lastSubLabelDisplay = '';
      }
      if (_lastSubLabelHtml !== foesHtml) {
        sl.innerHTML = foesHtml;
        _lastSubLabelHtml = foesHtml;
      }
    }
    if (bbw && _lastBbwDisplay !== 'none') {
      bbw.style.display = 'none';
      _lastBbwDisplay = 'none';
    }
    if (sw && _lastSwDisplay !== 'none') {
      sw.style.display = 'none';
      _lastSwDisplay = 'none';
    }
  }

  const sc = getCachedElement('score');
  if (sc && _lastScore !== state.score) {
    sc.textContent = state.score;
    _lastScore = state.score;
  }
}

export function showSeriesIntermission({ round = 1, won = false, scores = null, bestOf = 3 } = {}) {
  if (typeof document === 'undefined') return;
  const box = el('seriesIntermission');
  if (!box) return;
  const myTeam = (state.playerRole === 'p2' || state.playerRole === 'p4') ? 2 : 1;
  const foeTeam = myTeam === 1 ? 2 : 1;
  const s = scores || state.seriesScores || { t1: 0, t2: 0 };
  const myWins = Number(s[`t${myTeam}`]) || 0;
  const foeWins = Number(s[`t${foeTeam}`]) || 0;
  const winsNeeded = Math.ceil((Number(bestOf) || 3) / 2);
  box.className = won ? '' : 'lost';
  box.innerHTML = `
    <div class="si-title">ROUND ${round} ${won ? 'WON' : 'LOST'}</div>
    <div class="si-score"><span style="color:var(--cyan)">${myWins}</span> <span style="opacity:.5">-</span> <span style="color:#d896ff">${foeWins}</span></div>
    <div class="si-sub">FIRST TO ${winsNeeded} WINS · NEXT ROUND INCOMING</div>
  `;
  box.style.display = 'block';
}

export function clearSeriesIntermission() {
  if (typeof document === 'undefined') return;
  const box = el('seriesIntermission');
  if (box) {
    box.style.display = 'none';
    box.innerHTML = '';
  }
}

export function resetHintVisibility(duration = 4.5) {
  state.hintTimer = duration;
  if (typeof document === 'undefined') return;
  const h = getCachedElement('hint');
  const mh = getCachedElement('mobileHint');
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
  const h = getCachedElement('hint');
  const mh = getCachedElement('mobileHint');

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
  const container = getCachedElement('arenaNameplates');
  if (container) {
    container.innerHTML = '';
    container.style.display = 'none';
  }
}

export function updateArenaNameplates() {
  if (typeof document === 'undefined') return;
  const container = getCachedElement('arenaNameplates');
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
  const ch = getCachedElement('crosshair');
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
    const arcSvg = getCachedElement('chargeArc');
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

    const range = getCachedElement('range');
    if (range) {
      const rangeText = aim.dist < 300 ? Math.round(aim.dist) + 'M' : '';
      if (range.textContent !== rangeText) {
        range.textContent = rangeText;
      }
    }
  }
}

export function updateKeyMonitor() {
  const km = getCachedElement('keymon');
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
  const lb = getCachedElement('lockstate');
  if (lb) lb.style.display = (state.isTouchDevice || isLocked()) ? 'none' : 'block';
}

export function updateOfflineBanner(isOnline, pendingCount = 0) {
  if (typeof document === 'undefined') return;
  const banner = getCachedElement('offlineSyncBanner');
  if (!banner) return;
  if (!isOnline) {
    banner.style.display = 'flex';
    const textEl = getCachedElement('offlineBannerText');
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

