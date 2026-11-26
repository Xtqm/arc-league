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
let _lastNpdHtml = null;
let _lastNpdDisplay = null;
let _lastHazardActive = null;

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
  _lastNpdHtml = null;
  _lastNpdDisplay = null;
  _lastHazardActive = null;
}

export function setCombatHUDVisibility(visible) {
  if (typeof document === 'undefined') return;
  const ids = ['tl', 'tr', 'bottomDock', 'reticle', 'crosshair', 'lockPrompt', 'lockstate', 'keymon'];
  for (const id of ids) {
    const element = getCachedElement(id);
    if (element) {
      element.style.display = visible ? '' : 'none';
    }
  }
}

if (typeof window !== 'undefined') {
  window.__tronSetCombatHUDVisibility = setCombatHUDVisibility;
}

export function message(t) {
  const msg = msgEl || el('msg');
  if (!msg) return;
  msg.textContent = t;
  msg.style.opacity = 1;
  state.msgT = 1.5;
  msg.style.color = 'var(--cyan)';
  msg.style.textShadow = '0 0 16px var(--cyan)';
}

export function getOrCreateNetPingDisplay() {
  if (typeof document === 'undefined') return null;
  let element = getCachedElement('netPingDisplay');
  if (!element) {
    const tr = getCachedElement('tr');
    if (tr && typeof document.createElement === 'function') {
      element = document.createElement('div');
      element.id = 'netPingDisplay';
      element.className = 'net-ping-display';
      element.style.display = 'none';
      element.style.marginTop = '4px';
      element.style.fontSize = '10px';
      element.style.letterSpacing = '1px';
      element.style.color = 'var(--cyan)';
      element.style.textAlign = 'right';
      tr.appendChild(element);
      _domCache['netPingDisplay'] = element;
    }
  }
  return element;
}

export function updateHUD() {
  if (typeof document === 'undefined') return;

  if (state.gameMode === 'lobby') {
    setCombatHUDVisibility(false);
  }

  const hazardActive = !!(state.player && state.player.hazardActive && state.player.alive);
  if (hazardActive !== _lastHazardActive) {
    const vignette = getCachedElement('hazardVignette');
    const alert = getCachedElement('hazardAlert');
    if (vignette) {
      if (hazardActive) vignette.classList.add('active');
      else vignette.classList.remove('active');
    }
    if (alert) {
      if (hazardActive) alert.classList.add('active');
      else alert.classList.remove('active');
    }
    _lastHazardActive = hazardActive;
  }

  if (state.player.hp !== _lastPlayerHp) {
    const hpbFill = getCachedFill('hpbar', 'hpbFill');
    if (hpbFill) {
      hpbFill.style.width = state.player.hp + '%';
      _lastPlayerHp = state.player.hp;
    }
  }

  if (state.player.hasDisc !== _lastPlayerHasDisc) {
    const discEmblem = getCachedElement('discEmblem');
    if (discEmblem) {
      if (state.player.hasDisc) {
        discEmblem.classList.remove('in-flight');
        discEmblem.classList.add('ready');
        if (_lastPlayerHasDisc === false) {
          discEmblem.classList.remove('catch-pulse');
          void discEmblem.offsetWidth;
          discEmblem.classList.add('catch-pulse');
          discEmblem.addEventListener('animationend', () => {
            discEmblem.classList.remove('catch-pulse');
          }, { once: true });
        }
      } else {
        discEmblem.classList.remove('ready', 'catch-pulse');
        discEmblem.classList.add('in-flight');
      }
    }
    const dbFill = getCachedFill('discbar', 'dbFill');
    if (dbFill) {
      dbFill.style.width = (state.player.hasDisc ? 100 : 0) + '%';
    }
    _lastPlayerHasDisc = state.player.hasDisc;
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

  const npd = getOrCreateNetPingDisplay();
  if (npd) {
    const isOnline = state.gameMode === 'duel_multi' || state.gameMode === 'duos_multi';
    const isWebRTC = !!(state.webrtcPeer && state.webrtcPeer.connectionState === 'connected');
    const pingVal = state.ping !== undefined && state.ping !== null ? state.ping : (state.webrtcPeer?.ping !== undefined && state.webrtcPeer?.ping !== null ? state.webrtcPeer.ping : null);

    if (isOnline && isWebRTC && pingVal !== null) {
      const color = pingVal < 60 ? '#00ff66' : (pingVal < 120 ? '#ffff00' : 'var(--orange)');
      const npdHtml = `<span style="opacity:.65;">PING</span> <b style="color:${color}">${pingVal} ms</b>`;
      if (_lastNpdDisplay !== 'block') {
        npd.style.display = 'block';
        _lastNpdDisplay = 'block';
      }
      if (_lastNpdHtml !== npdHtml) {
        npd.innerHTML = npdHtml;
        _lastNpdHtml = npdHtml;
      }
    } else {
      if (_lastNpdDisplay !== 'none') {
        npd.style.display = 'none';
        _lastNpdDisplay = 'none';
      }
    }
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
  const ch = getCachedElement('crosshair') || getCachedElement('reticle');
  if (ch) {
    if (state.gameMode === 'lobby') {
      ch.style.display = 'none';
    } else {
      ch.style.display = '';
    }
    const reticleEl = getCachedElement('reticle');
    if (reticleEl && reticleEl !== ch) {
      reticleEl.style.display = state.gameMode === 'lobby' ? 'none' : '';
    }
    const onFoe = !!aim.foe || !!(traj && traj.willHit);
    ch.classList.toggle('hot', onFoe);
    ch.classList.toggle('bank', !!(traj && traj.willHit && traj.bounces > 0));
    ch.classList.toggle('empty', !state.player.hasDisc);
    ch.classList.toggle('parry-active', (state.player.parryTimer || 0) > 0);
    ch.classList.toggle('parry-cooldown', (state.player.shieldCd || 0) > 0);
    const curve = getPlayerCurveIntent();
    const qHeld = ((!!state.keys.KeyQ || state.touchCurveL || state.gamepadCurveL) && !(!!state.keys.KeyE || state.touchCurveR || state.gamepadCurveR)) || curve < -0.01;
    const eHeld = ((!!state.keys.KeyE || state.touchCurveR || state.gamepadCurveR) && !(!!state.keys.KeyQ || state.touchCurveL || state.gamepadCurveL)) || curve > 0.01;

    let curveMagL = curve < -0.01 ? Math.min(1.0, Math.abs(curve)) : (qHeld ? 1.0 : 0.0);
    let curveMagR = curve > 0.01 ? Math.min(1.0, Math.abs(curve)) : (eHeld ? 1.0 : 0.0);

    ch.classList.toggle('curve-l', curveMagL > 0);
    ch.classList.toggle('curve-r', curveMagR > 0);
    ch.style.setProperty('--curve-mag-l', curveMagL.toFixed(3));
    ch.style.setProperty('--curve-mag-r', curveMagR.toFixed(3));

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

    const btnBlock = getCachedElement('btnBlock');
    if (btnBlock) {
      btnBlock.classList.toggle('cooling', (state.player.shieldCd || 0) > 0);
    }
  }
}

export function updateKeyMonitor() {
  const km = getCachedElement('keymon');
  if (km) {
    if (state.gameMode === 'lobby') {
      km.style.display = 'none';
      return;
    }
    if (km.style.display === 'block') {
      const on = k => state.keys[k] ? 'style="color:#fff;text-shadow:0 0 8px #fff"' : 'style="opacity:.3"';
      km.innerHTML = `<b ${on('KeyW')}>W</b> <b ${on('KeyA')}>A</b> <b ${on('KeyS')}>S</b> <b ${on('KeyD')}>D</b>
        <b ${on('KeyQ')}>Q</b> <b ${on('KeyE')}>E</b>
        <b ${on('Space')}>SPACE</b> <b ${on('ShiftLeft')}>SHIFT</b><br>
        curve ${getPlayerCurveIntent().toFixed(2)} · y ${player.y.toFixed(2)} · jumps ${player.jumps} · grounded ${player.grounded}<br>
        pointerlock ${isLocked()} · focus ${document.hasFocus()}`;
    }
  }
}

export function updateLockStateBanner() {
  const lb = getCachedElement('lockstate') || getCachedElement('lockPrompt');
  if (lb) {
    if (state.gameMode === 'lobby') {
      lb.style.display = 'none';
      return;
    }
    lb.style.display = (state.isTouchDevice || isLocked()) ? 'none' : 'block';
  }
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

export const MAX_TACTICAL_XP_ENTRIES = 4;
export const TACTICAL_XP_DURATION_MS = 2000;

/**
 * Pushes a non-overlapping tactical XP maneuver entry into the top-left `#tl` Flexbox queue.
 * Caps visible entries at 4 and fades/removes each entry after 2.0s.
 * @param {number} xp
 * @param {string} [label=''] e.g. "PARRY", "DOUBLE BANK", "CURVE FRACTURE"
 * @param {object} [options]
 * @returns {object|null}
 */
export function showTacticalXP(xp, label = '', options = {}) {
  if (typeof document === 'undefined') return null;

  let container = document.getElementById('tl');
  if (!container) {
    container = document.createElement('div');
    container.id = 'tl';
    container.style.cssText = 'position:fixed;top:12px;left:12px;display:flex;flex-direction:column;align-items:flex-start;gap:6px;pointer-events:none;z-index:50;';
    if (document.body) {
      document.body.appendChild(container);
    }
  } else {
    container.style.display = 'flex';
    if (!container.style.flexDirection) container.style.flexDirection = 'column';
    if (!container.style.gap) container.style.gap = '6px';
    container.style.pointerEvents = 'none';
  }

  // Enforce bounded capacity of 4 visible entries
  const existing = container.querySelectorAll('.tactical-xp-entry');
  if (existing.length >= MAX_TACTICAL_XP_ENTRIES) {
    const excess = existing.length - MAX_TACTICAL_XP_ENTRIES + 1;
    for (let i = 0; i < excess; i++) {
      const oldest = existing[i];
      if (oldest._cleanup) {
        oldest._cleanup();
      } else if (oldest.parentNode) {
        oldest.parentNode.removeChild(oldest);
      }
    }
  }

  const entry = document.createElement('div');
  entry.className = 'tactical-xp-entry';
  const labelText = label ? ` // ${label}` : '';
  entry.textContent = `+${xp} XP${labelText}`;

  const accentColor = options.color || '#00f3ff';
  const glowColor = options.glow || '#0066ff';
  entry.style.setProperty('--xp-accent', accentColor);
  entry.style.color = accentColor;
  entry.style.textShadow = `0 0 8px ${glowColor}`;

  container.appendChild(entry);

  const durationMs = typeof options.durationMs === 'number' && options.durationMs > 0
    ? options.durationMs
    : TACTICAL_XP_DURATION_MS;
  const fadeLeadMs = Math.min(250, Math.floor(durationMs * 0.25));

  const fadeTimer = setTimeout(() => {
    entry.classList.add('fading');
    entry.style.opacity = '0';
  }, Math.max(0, durationMs - fadeLeadMs));

  const removeTimer = setTimeout(() => {
    if (entry.parentNode) {
      entry.parentNode.removeChild(entry);
    }
  }, durationMs);

  const cleanup = () => {
    clearTimeout(fadeTimer);
    clearTimeout(removeTimer);
    if (entry.parentNode) {
      entry.parentNode.removeChild(entry);
    }
  };
  entry._cleanup = cleanup;

  return {
    element: entry,
    container,
    cleanup
  };
}

/**
 * Deprecated wrapper: redirects legacy floating +Credits maneuver calls
 * into the top-left `#tl` tactical XP log.
 * @deprecated Use showTacticalXP instead.
 */
export function showFloatingNeonCredits(amount, label = '', options = {}) {
  return showTacticalXP(amount, label, options);
}

export const showFloatingNeonBits = showFloatingNeonCredits;

export const INPUT_GLYPHS = Object.freeze({
  kbm: Object.freeze({
    throw: '[LMB]',
    block: '[RMB]',
    curve: '[Q/E]',
    jump: '[SPACE]',
    dash: '[SHIFT]',
    pause: '[ESC]',
    bypass: '[ESC]',
    look: '[MOUSE]',
    move: '[WASD]'
  }),
  gamepad: Object.freeze({
    throw: '[RT]',
    block: '[LT]',
    curve: '[LB/RB]',
    jump: '[A]',
    dash: '[B/X]',
    pause: '[START]',
    bypass: '[START]',
    look: '[R-STICK]',
    move: '[L-STICK]'
  }),
  touch: Object.freeze({
    throw: '[THROW]',
    block: '[SHIELD]',
    curve: '[L/R]',
    jump: '[JUMP]',
    dash: '[DASH]',
    pause: '[PAUSE]',
    bypass: '[TAP]',
    look: '[DRAG]',
    move: '[JOYSTICK]'
  })
});

export function setLastInputDevice(device) {
  if (device !== 'kbm' && device !== 'gamepad' && device !== 'touch') return;
  if (state.lastInputDevice === device) return;
  state.lastInputDevice = device;
  updateAdaptiveHUDPrompts();
  if (typeof window !== 'undefined' && window.__tronOnInputDeviceChanged) {
    window.__tronOnInputDeviceChanged(device);
  }
}

export function getInputGlyph(action, device = null) {
  const d = device || state.lastInputDevice || (state.isTouchDevice ? 'touch' : 'kbm');
  const glyphMap = INPUT_GLYPHS[d] || INPUT_GLYPHS.kbm;
  return glyphMap[action] || '';
}

export function formatAdaptivePrompt(template, device = null) {
  const d = device || state.lastInputDevice || (state.isTouchDevice ? 'touch' : 'kbm');
  const glyphMap = INPUT_GLYPHS[d] || INPUT_GLYPHS.kbm;
  return template.replace(/\{(\w+)\}/g, (match, action) => glyphMap[action] || match);
}

export function updateAdaptiveHUDPrompts() {
  if (typeof document === 'undefined') return;
  const device = state.lastInputDevice || (state.isTouchDevice ? 'touch' : 'kbm');
  const hintEl = getCachedElement('hint');
  if (hintEl) {
    if (device === 'gamepad') {
      hintEl.textContent = 'LEFT STICK move · LB / RB curve disc · RIGHT STICK look/aim · RT throw disc · LT block · A jump / double-jump · B / X dash · START pause';
    } else if (device === 'touch') {
      hintEl.textContent = 'DRAG LEFT TO MOVE · DRAG RIGHT OR THROW TO AIM · HOLD THROW TO CHARGE · TAP SHIELD TO PARRY · TAP JUMP / DASH';
    } else {
      hintEl.textContent = 'WASD move / strafe · Q / E hook / curve disc · MOUSE look/aim · ARC previews ricochets · LMB throw disc · RMB block · SPACE jump / double-jump · SHIFT dash · P / ESC pause · F1 input monitor';
    }
  }

  const bypassEl = getCachedElement('calibrationBypass');
  if (bypassEl) {
    if (device === 'gamepad') {
      bypassEl.textContent = '[START] BYPASS TO LOBBY';
    } else if (device === 'touch') {
      bypassEl.textContent = '[TAP] BYPASS TO LOBBY';
    } else {
      bypassEl.textContent = '[ESC] BYPASS TO LOBBY';
    }
  }
}

if (typeof window !== 'undefined') {
  window.__tronSetLastInputDevice = setLastInputDevice;
  window.__tronGetInputGlyph = getInputGlyph;
  window.__tronFormatAdaptivePrompt = formatAdaptivePrompt;
  window.__tronUpdateAdaptiveHUDPrompts = updateAdaptiveHUDPrompts;
}


