import { state } from '../core/state.js';
import { tryLock, focusGame, setCursor, resetTouchInputs } from '../input/InputManager.js';
import { resetHintVisibility, clearArenaNameplates, clearSeriesIntermission, updateHUD } from './hud.js';
import { requestFullScreen, toggleFullScreen, isFullScreen, bindPauseAndModalEvents } from './modals.js';
import { showJoinInputModal, onClickCreateRoom, onClickConfirmJoin, copyRoomCode, teardownMultiplayer, startMatchmakingWithWarmup } from '../network/roomManager.js';
import { updateIdentityHeader, showAuthTerminal } from './authTerminal.js';
import { gridSelectorModal, levelSelectView, campaignHUD, trialDebriefModal } from './campaign/index.js';
import { armoryModal } from './modals/ArmoryModal.js';
import { achievementsModal } from './modals/AchievementsModal.js';
import { settingsModal } from './modals/SettingsModal.js';
import { updateSteamRichPresence, syncGameStateRichPresence } from '../core/steamTelemetry.js';
import { lobbyCoresManager } from './lobbyCores.js';
import { storageManager } from '../core/storage/StorageManager.js';

// Setup Campaign UI navigation transitions
gridSelectorModal.setOnSelectGrid((gridId) => levelSelectView.show(gridId));
gridSelectorModal.setOnBackToMenu(() => showModeSelectMenu());
levelSelectView.setOnSelectLevel((levelId) => campaignHUD.showMissionBrief(levelId));
levelSelectView.setOnBackToGridSelector(() => gridSelectorModal.show());
campaignHUD.setOnCancelBrief(() => levelSelectView.show());
trialDebriefModal.setOnReturnToGrid((gridId) => levelSelectView.show(gridId));
armoryModal.setOnBackToMenu(() => showModeSelectMenu());
achievementsModal.setOnBackToMenu(() => showModeSelectMenu());

export { armoryModal, achievementsModal, settingsModal };

export {
  ARENA_MAP_METADATA,
  getGridIdForMap,
  getUnlockedArenaMaps,
  selectArenaMap,
  updateArenaSelectControls
} from './arenaSelector.js';
import { rebuildArenaTiles } from '../entities/Arena.js';
import {
  selectArenaMap,
  updateArenaSelectControls,
  applySectorArena,
  getUnlockedArenaMaps
} from './arenaSelector.js';

function teardownSectorArena() {
  if (typeof window !== 'undefined' && typeof window.__tronTeardownSectorArena === 'function') {
    return window.__tronTeardownSectorArena();
  }
  state.activeGridId = null;
}

export function startMode(mode) {
  lobbyCoresManager.despawnCores();
  state.gameMode = (mode === 'duel' || mode === 'duel_ai') ? 'duel_ai' : mode;
  if (state.gameMode === 'swarm') {
    teardownSectorArena();
  } else if (state.gameMode === 'duel_ai' && state.activeGridId) {
    applySectorArena(state.activeGridId);
  }
  if (typeof document !== 'undefined') {
    const overlay = document.getElementById('overlay');
    if (overlay) overlay.style.display = 'none';
    const hm = document.getElementById('hostModal');
    if (hm) hm.style.display = 'none';
    const rm = document.getElementById('roomModal');
    if (rm) rm.style.display = 'none';
    const am = document.getElementById('authModal');
    if (am) am.style.display = 'none';
  }
  armoryModal.hide();
  achievementsModal.hide();
  state.authModalOpen = false;
  state.armoryModalOpen = false;
  state.achievementsModalOpen = false;
  if (typeof window !== 'undefined' && window.__tronResetGame) {
    window.__tronResetGame();
  }
  state.paused = false;
  state.justResumed = true;
  syncGameStateRichPresence();
  tryLock();
  focusGame();
}

if (typeof window !== 'undefined') {
  window.__tronStartMode = startMode;
}

export function startGame() {
  if (state.isTouchDevice) {
    requestFullScreen();
  }
  startMode(state.gameMode || 'swarm');
}

export function showModeSelect() {
  const pm = document.getElementById('pauseMenu');
  if (pm) pm.style.display = 'none';
  const hm = document.getElementById('hostModal');
  if (hm) hm.style.display = 'none';
  const rm = document.getElementById('roomModal');
  if (rm) rm.style.display = 'none';
  const am = document.getElementById('authModal');
  if (am) am.style.display = 'none';
  gridSelectorModal.hide();
  levelSelectView.hide();
  campaignHUD.hideMissionBrief();
  campaignHUD.hideObjectiveHeader();
  trialDebriefModal.hide();
  armoryModal.hide();
  state.authModalOpen = false;
  state.armoryModalOpen = false;
  state.paused = false;
  state.running = true;
  state.gameMode = 'lobby';
  state.slowMoActive = false;
  state.timeScale = 1.0;
  state.player.hp = 100;
  state.player.alive = true;
  state.player.hasDisc = true;
  resetTouchInputs();
  updateSteamRichPresence('In Main Menu');
  teardownMultiplayer();
  setCursor();
  showModeSelectMenu();
}

export function isHardcoreUnlocked(storage = storageManager) {
  if (!storage || typeof storage.get !== 'function') return false;
  const maxWave = Math.max(
    Number(storage.get('stats.swarmMaxWave', 0)) || 0,
    Number(storage.get('stats.swarmHighestWave', 0)) || 0,
    Number(storage.get('stats.highestWave', 0)) || 0
  );
  return maxWave >= 10;
}

export function getMainMenuHtml() {
  const isUnlocked = isHardcoreUnlocked();
  return `<div id="identityHeader" class="identity-header"></div>
<div class="card" id="mainMenu">
  <h1>ARC</h1><h2>L E A G U E</h2>
  <div class="keys desktop-keys">
    <b>W A S D</b><span>Move &amp; strafe across the Arcfield</span>
    <b>Q / E</b><span>Apply curve spin — hook discs around pillars &amp; obstacles</span>
    <b>Mouse</b><span>Turn the camera freely — the crosshair is your aim point</span>
    <b>Wheel</b><span>Adjust look sensitivity</span>
    <b>Arc</b><span>A live dotted trajectory shows every bounce before you throw</span>
    <b>Left Click</b><span>Throw kinetic disc (it ricochets &amp; returns)</span>
    <b>Right Click</b><span>Raise disc shield — deflects incoming</span>
    <b>Space</b><span>Jump — tap twice to air-jump, hold for height</span>
    <b>Shift</b><span>Dash (costs energy)</span>
    <b>P / ESC</b><span>Pause simulation &amp; release cursor</span>
  </div>
  <div class="keys mobile-keys" style="display:none">
    <b>DRAG LEFT</b><span>Virtual Analog Stick — Move &amp; strafe</span>
    <b>DRAG RIGHT</b><span>Swipe anywhere to turn &amp; aim camera</span>
    <b>THROW</b><span>Tap to throw, or hold &amp; drag to aim/charge disc</span>
    <b>L / R</b><span>Curve spin — hook disc around obstacles</span>
    <b>SHIELD</b><span>Raise disc shield — deflect incoming attacks</span>
    <b>JUMP</b><span>Tap to air-jump, hold for maximum height</span>
    <b>DASH</b><span>Instant directional sprint impulse</span>
    <b>PAUSE</b><span>Tap top right II button to suspend simulation</span>
  </div>
  <div class="mode-select" id="mainMenuButtons">
    <button id="btnEnter3DLobby" class="mode-btn" style="width:100%;margin-bottom:14px;border-color:var(--cyan);color:#fff;background:rgba(79,242,255,0.22);box-shadow:0 0 16px rgba(79,242,255,0.4);letter-spacing:3px;">[ ENTER 3D PLAYABLE LOBBY ]</button>
    <button id="campaignBtn" class="mode-btn campaign-btn">LEAGUE CIRCUIT</button>
    <div id="survivalModeContainer" class="survival-mode-container" style="display:flex;flex-direction:column;gap:6px;width:100%;">
      <button id="swarmBtn" class="mode-btn swarm-btn">${state.isHardcoreSurvival ? 'ENTER ARCFIELD (HARDCORE)' : 'ENTER ARCFIELD (SURVIVAL)'}</button>
      <div id="survivalVariantToggle" class="survival-variant-toggle" style="display:${isUnlocked ? 'flex' : 'none'};gap:8px;justify-content:center;margin-top:2px;">
        <button id="btnSurvivalStandard" class="btn variant-btn ${!state.isHardcoreSurvival ? 'hot active' : ''}" data-variant="standard" style="padding:4px 10px;font-size:11px;min-width:90px;letter-spacing:1px;">STANDARD</button>
        <button id="btnSurvivalHardcore" class="btn variant-btn ${state.isHardcoreSurvival ? 'hot active' : ''}" data-variant="hardcore" style="padding:4px 10px;font-size:11px;min-width:90px;letter-spacing:1px;border-color:var(--orange);color:#ff7b1a;">HARDCORE [LVL 5+]</button>
      </div>
    </div>
    <button id="practiceBtn" class="mode-btn duel-btn" style="width:100%;">PRACTICE (SOLO AI)</button>
    <button id="quickMatchBtn" class="mode-btn multi-btn quick-match-primary" style="width:100%;border-color:#00ffff;color:#00ffff;box-shadow:0 0 10px rgba(0,255,255,0.3);letter-spacing:2px;">[ QUICK MATCH // PLAY NOW ]</button>
    <div class="friendly-duels-row" style="display:flex;gap:8px;width:100%;">
      <button id="hostMatchBtn" class="mode-btn multi-btn" style="flex:1;">HOST FRIENDLY MATCH</button>
      <button id="joinOnlineBtn" class="mode-btn multi-btn" style="flex:1;">JOIN FRIENDLY MATCH</button>
    </div>
    <!-- Legacy compatibility elements for tests & programmatic navigation -->
    <button id="armoryBtn" class="mode-btn armory-btn" style="display:none;min-width:44px;min-height:44px;" aria-hidden="true">OUTFITTING</button>
    <button id="achievementsBtn" class="mode-btn achievements-btn" style="display:none;min-width:44px;min-height:44px;" aria-hidden="true">TROPHY MATRIX</button>
    <button id="duelBtn" style="display:none;min-width:44px;min-height:44px;" aria-hidden="true"></button>
    <button id="btnSwarmSolo" style="display:none;min-width:44px;min-height:44px;" aria-hidden="true"></button>
    <button id="btnDuelSolo" style="display:none;min-width:44px;min-height:44px;" aria-hidden="true"></button>
    <button id="joinRoomBtn" style="display:none;min-width:44px;min-height:44px;" aria-hidden="true"></button>
  </div>
</div>`;
}

export function activate3DLobbyView() {
  const overlay = document.getElementById('overlay');
  if (overlay) {
    overlay.classList.add('lobby-3d');
  }
  const hint = document.getElementById('hint');
  if (hint) {
    hint.innerHTML = 'WASD Move & Strafe &nbsp;·&nbsp; Mouse Look &nbsp;·&nbsp; LMB Throw Disc at Energy Core &nbsp;·&nbsp; MMB 1P/3P &nbsp;·&nbsp; ESC 2D Menu';
    hint.style.display = 'block';
    hint.style.opacity = '1';
  }
  const btn2D = document.getElementById('btnToggle2DMenu');
  if (btn2D) btn2D.style.display = 'inline-block';
}

export function deactivate3DLobbyView() {
  const overlay = document.getElementById('overlay');
  if (overlay) {
    overlay.classList.remove('lobby-3d');
  }
  const btn2D = document.getElementById('btnToggle2DMenu');
  if (btn2D) btn2D.style.display = 'none';
}

export function showModeSelectMenu(options = {}) {
  updateSteamRichPresence('In Main Menu');
  state.gameMode = 'lobby';
  state.running = true;
  state.paused = false;
  state.player.hp = 100;
  state.player.alive = true;
  state.player.hasDisc = true;
  state.player.pos.set(0, 0, 0);
  state.player.vel.set(0, 0, 0);
  state.player.yaw = 0;
  state.player.pitch = 0;
  state.cameraPerspective = 'first_person';
  state.cameraPerspectiveBlend = 0.0;
  rebuildArenaTiles();

  lobbyCoresManager.init();
  lobbyCoresManager.spawnCores();

  const hm = document.getElementById('hostModal');
  if (hm) hm.style.display = 'none';
  const rm = document.getElementById('roomModal');
  if (rm) rm.style.display = 'none';
  const am = document.getElementById('authModal');
  if (am) am.style.display = 'none';
  gridSelectorModal.hide();
  levelSelectView.hide();
  campaignHUD.hideMissionBrief();
  campaignHUD.hideObjectiveHeader();
  trialDebriefModal.hide();
  armoryModal.hide();
  achievementsModal.hide();
  state.authModalOpen = false;
  state.armoryModalOpen = false;
  state.achievementsModalOpen = false;
  clearArenaNameplates();
  clearSeriesIntermission();
  updateHUD();
  resetHintVisibility(0);
  const overlay = document.getElementById('overlay');
  if (!overlay) return;
  overlay.style.display = 'flex';
  overlay.innerHTML = getMainMenuHtml();
  const card = overlay.querySelector('.card');
  if (card) card.scrollTop = 0;
  bindMainMenuEvents();

  const isHeadless = typeof window !== 'undefined' && (
    window.__TRON_HEADLESS__ ||
    (typeof navigator !== 'undefined' && navigator.webdriver && !window.__tronEnforcePlayableLobby)
  );

  const should3D = options.force3D || (!state.isTouchDevice && !isHeadless && !options.force2D);
  if (should3D) {
    activate3DLobbyView();
  } else {
    deactivate3DLobbyView();
  }
}

export function startSoloSwarm(options = {}) {
  if (options && options.hardcore !== undefined) {
    state.isHardcoreSurvival = Boolean(options.hardcore);
  }
  teardownSectorArena();
  startMode('swarm');
}

function resolveModalArenaMap(mapId = null) {
  const selectElem = typeof document !== 'undefined' ? document.getElementById('arenaSelect') : null;
  return mapId || (selectElem && selectElem.value) || state.selectedArenaMap || 'arena_grid_01';
}

export function startSoloDuel(mapId = null) {
  selectArenaMap(resolveModalArenaMap(mapId));
  startMode('duel_ai');
}

export function bindMainMenuEvents() {
  updateIdentityHeader();
  const bind = (id, fn) => {
    const b = document.getElementById(id);
    if (b) {
      b.addEventListener('click', fn);
    } else {
      console.warn(`UI Binding Warning: Button #${id} not found.`);
    }
  };

  const btnEnter3D = document.getElementById('btnEnter3DLobby');
  if (btnEnter3D) {
    btnEnter3D.onclick = (e) => {
      e.stopPropagation();
      if (e.cancelable) e.preventDefault();
      activate3DLobbyView();
      tryLock();
    };
  }

  const startSwarm = (e) => {
    e.stopPropagation();
    if (e.cancelable) e.preventDefault();
    if (state.isTouchDevice) {
      if (!isFullScreen()) toggleFullScreen();
      else requestFullScreen();
    }
    startSoloSwarm();
  };
  const openHostModal = (e) => {
    e.stopPropagation(); if (e.cancelable) e.preventDefault();
    const overlay = document.getElementById('overlay');
    if (overlay) overlay.style.display = 'none';
    const hm = document.getElementById('hostModal');
    if (hm) {
      hm.style.display = 'flex';
      const card = hm.querySelector('.card');
      if (card) card.scrollTop = 0;
      updateArenaSelectControls(hm);
      const selectedBestOf = Number(state.selectedSeriesBestOf) || 3;
      hm.querySelectorAll('.series-opt-btn').forEach(btn => {
        btn.classList.toggle('hot', Number(btn.getAttribute('data-best-of')) === selectedBestOf);
      });
    }
  };
  const openJoinModal = (e) => {
    e.stopPropagation(); if (e.cancelable) e.preventDefault();
    const overlay = document.getElementById('overlay');
    if (overlay) overlay.style.display = 'none';
    showJoinInputModal();
  };
  const startDuelAi = (e) => {
    e.stopPropagation();
    if (e.cancelable) e.preventDefault();
    if (state.isTouchDevice) {
      if (!isFullScreen()) toggleFullScreen();
      else requestFullScreen();
    }
    startSoloDuel();
  };

  const openCampaign = (e) => {
    e.stopPropagation();
    if (e.cancelable) e.preventDefault();
    const overlay = document.getElementById('overlay');
    if (overlay) overlay.style.display = 'none';
    gridSelectorModal.show();
  };

  const openArmory = (e) => {
    e.stopPropagation();
    if (e.cancelable) e.preventDefault();
    showAuthTerminal('loadout');
  };

  const openAchievements = (e) => {
    e.stopPropagation();
    if (e.cancelable) e.preventDefault();
    showAuthTerminal('directives');
  };

  bind('campaignBtn', openCampaign);
  bind('armoryBtn', openArmory);
  bind('achievementsBtn', openAchievements);
  bind('swarmBtn', startSwarm);
  bind('hostMatchBtn', openHostModal);
  bind('joinOnlineBtn', openJoinModal);
  bind('duelBtn', startDuelAi);
  bind('btnSwarmSolo', startSwarm);
  bind('btnDuelSolo', (e) => {
    e.stopPropagation();
    if (e.cancelable) e.preventDefault();
    if (state.isTouchDevice) {
      toggleFullScreen();
    }
    startSoloDuel();
  });
  bind('joinRoomBtn', openJoinModal);

  const btnStandard = document.getElementById('btnSurvivalStandard');
  const btnHardcore = document.getElementById('btnSurvivalHardcore');
  if (btnStandard) {
    btnStandard.addEventListener('click', (e) => {
      e.stopPropagation();
      if (e.cancelable) e.preventDefault();
      state.isHardcoreSurvival = false;
      btnStandard.classList.add('hot', 'active');
      if (btnHardcore) btnHardcore.classList.remove('hot', 'active');
      const swarmBtn = document.getElementById('swarmBtn');
      if (swarmBtn) swarmBtn.textContent = 'ENTER ARCFIELD (SURVIVAL)';
    });
  }
  if (btnHardcore) {
    btnHardcore.addEventListener('click', (e) => {
      e.stopPropagation();
      if (e.cancelable) e.preventDefault();
      state.isHardcoreSurvival = true;
      btnHardcore.classList.add('hot', 'active');
      if (btnStandard) btnStandard.classList.remove('hot', 'active');
      const swarmBtn = document.getElementById('swarmBtn');
      if (swarmBtn) swarmBtn.textContent = 'ENTER ARCFIELD (HARDCORE)';
    });
  }

  // Match entry and modal bindings
  const hm = document.getElementById('hostModal');
  const quickMatchBtn = document.getElementById('quickMatchBtn');
  if (quickMatchBtn) {
    quickMatchBtn.onclick = (e) => {
      e.stopPropagation(); if (e.cancelable) e.preventDefault();
      if (state.isTouchDevice) {
        requestFullScreen();
      }
      if (hm) hm.style.display = 'none';
      const overlay = document.getElementById('overlay');
      if (overlay) overlay.style.display = 'none';
      teardownSectorArena();
      startMatchmakingWithWarmup();
    };
  }

  const practiceBtn = document.getElementById('practiceBtn');
  if (practiceBtn) {
    practiceBtn.onclick = (e) => {
      e.stopPropagation(); if (e.cancelable) e.preventDefault();
      if (state.isTouchDevice) {
        if (!isFullScreen()) toggleFullScreen();
        else requestFullScreen();
      }
      if (hm) hm.style.display = 'none';
      startSoloDuel();
    };
  }

  const modalPracticeBtn = document.getElementById('modalPracticeBtn');
  if (modalPracticeBtn) {
    modalPracticeBtn.onclick = (e) => {
      e.stopPropagation(); if (e.cancelable) e.preventDefault();
      if (state.isTouchDevice) {
        if (!isFullScreen()) toggleFullScreen();
        else requestFullScreen();
      }
      if (hm) hm.style.display = 'none';
      startSoloDuel();
    };
  }

  if (hm) {
    const seriesBtns = hm.querySelectorAll('.series-opt-btn');
    seriesBtns.forEach(btn => {
      btn.onclick = (e) => {
        e.stopPropagation();
        const chosen = Number(btn.getAttribute('data-best-of')) || 3;
        state.selectedSeriesBestOf = chosen;
        seriesBtns.forEach(b => b.classList.toggle('hot', b === btn));
      };
    });
  }

  const startHostedRoom = (mode) => (e) => {
    e.stopPropagation(); if (e.cancelable) e.preventDefault();
    if (state.isTouchDevice) {
      requestFullScreen();
    }
    if (hm) hm.style.display = 'none';
    const chosenMap = resolveModalArenaMap();
    selectArenaMap(chosenMap);
    onClickCreateRoom(e, mode, chosenMap, state.selectedSeriesBestOf || 3);
  };

  const host1v1Btn = document.getElementById('host1v1Btn');
  if (host1v1Btn) host1v1Btn.onclick = startHostedRoom('1v1');

  const host2v2Btn = document.getElementById('host2v2Btn');
  if (host2v2Btn) host2v2Btn.onclick = startHostedRoom('2v2');

  const cancelHostBtn = document.getElementById('cancelHostBtn');
  if (cancelHostBtn) {
    cancelHostBtn.onclick = (e) => {
      e.stopPropagation(); if (e.cancelable) e.preventDefault();
      if (hm) hm.style.display = 'none';
      teardownSectorArena();
      showModeSelectMenu();
    };
  }

  const btnCopyCode = document.getElementById('btnCopyCode');
  if (btnCopyCode) {
    btnCopyCode.onclick = (e) => {
      e.stopPropagation();
      if (state.currentRoomId) copyRoomCode(state.currentRoomId);
    };
  }

  const btnConfirmJoin = document.getElementById('btnConfirmJoin');
  if (btnConfirmJoin) {
    btnConfirmJoin.onclick = (e) => {
      e.stopPropagation();
      onClickConfirmJoin(e);
    };
  }

  const btnCancelRoom = document.getElementById('btnCancelRoom');
  if (btnCancelRoom) {
    btnCancelRoom.onclick = (e) => {
      e.stopPropagation();
      teardownMultiplayer();
      const rm = document.getElementById('roomModal');
      if (rm) rm.style.display = 'none';
      if (hm) hm.style.display = 'none';
      showModeSelectMenu();
    };
  }

  const joinRoomInput = document.getElementById('joinRoomInput');
  if (joinRoomInput) {
    joinRoomInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        onClickConfirmJoin(e);
      }
    });
    joinRoomInput.addEventListener('input', () => {
      joinRoomInput.value = joinRoomInput.value.toUpperCase();
    });
  }
}

export function enterLobby(options = {}) {
  showModeSelectMenu({ ...options, force3D: true });
}

export function bindMenuButtons() {
  bindMainMenuEvents();
  bindPauseAndModalEvents();
}

if (typeof window !== 'undefined') {
  window.__tronEnterLobby = enterLobby;
  window.__tronShowModeSelect = showModeSelect;
  window.__tronShowModeSelectMenu = showModeSelectMenu;
  window.__tronActivate3DLobbyView = activate3DLobbyView;
  window.__tronDeactivate3DLobbyView = deactivate3DLobbyView;
  window.__tronTeardownMultiplayer = teardownMultiplayer;
  window.__tronShowCampaignSectors = () => gridSelectorModal.show();
  window.__tronShowLevelSelectView = (gridId) => levelSelectView.show(gridId);
  window.__tronShowMissionBrief = (levelId) => campaignHUD.showMissionBrief(levelId);
  window.__tronShowTrialDebrief = (result) => trialDebriefModal.show(result);
  window.__tronUpdateArenaSelectControls = updateArenaSelectControls;
  window.__tronSelectArenaMap = selectArenaMap;
  window.__tronGetUnlockedArenaMaps = getUnlockedArenaMaps;
}
