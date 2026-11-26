import { state } from '../core/state.js';
import { tryLock, focusGame, setCursor, resetTouchInputs } from '../input/InputManager.js';
import { resetHintVisibility, clearArenaNameplates, clearSeriesIntermission, updateHUD, setCombatHUDVisibility } from './hud.js';
import { requestFullScreen, toggleFullScreen, isFullScreen, bindPauseAndModalEvents } from './modals.js';
import { showJoinInputModal, onClickCreateRoom, onClickConfirmJoin, copyRoomCode, teardownMultiplayer, startMatchmakingWithWarmup } from '../network/roomManager.js';
import { updateIdentityHeader, showAuthTerminal } from './authTerminal.js';
import { gridSelectorModal, levelSelectView, campaignHUD, trialDebriefModal } from './campaign/index.js';
import { armoryModal } from './modals/ArmoryModal.js';
import { achievementsModal } from './modals/AchievementsModal.js';
import { contractsModal } from './modals/ContractsModal.js';
import { settingsModal } from './modals/SettingsModal.js';
import { directivesModal } from './modals/DirectivesModal.js';
import { swarmModeModal } from './modals/SwarmModeModal.js';
import { apexTrialsModal } from './modals/ApexTrialsModal.js';
import { contractManager, ContractEvents } from '../contracts/ContractManager.js';
import { apexTrialManager } from '../events/ApexTrialManager.js';
import { spawnStagingDisc, despawnStagingDisc, spawnDiorama, despawnDiorama, refreshDioramaCosmetics, resetMatchCamera } from '../graphics/ambientLobby.js';
import { updateSteamRichPresence, syncGameStateRichPresence } from '../core/steamTelemetry.js';
import { storageManager } from '../core/storage/StorageManager.js';
import { duelEconomyBridge } from '../modes/DuelEconomyBridge.js';
import { scene } from '../graphics/scene.js';
import { disposeDiscEntity } from '../entities/Disc.js';
import { disposeHierarchy } from '../armory/CosmeticMaterialEngine.js';
import { playTerminalKeySound, playEquipSound } from '../audio/sfx.js';

// Setup Campaign UI navigation transitions
gridSelectorModal.setOnSelectGrid((gridId) => levelSelectView.show(gridId));
gridSelectorModal.setOnBackToMenu(() => showModeSelectMenu());
levelSelectView.setOnSelectLevel((levelId) => campaignHUD.showMissionBrief(levelId));
levelSelectView.setOnBackToGridSelector(() => gridSelectorModal.show());
campaignHUD.setOnCancelBrief(() => levelSelectView.show());
trialDebriefModal.setOnReturnToGrid((gridId) => levelSelectView.show(gridId));
armoryModal.setOnBackToMenu(() => showModeSelectMenu());
achievementsModal.setOnBackToMenu(() => showModeSelectMenu());
contractsModal.setOnBackToMenu(() => showModeSelectMenu());
apexTrialsModal.setOnBackToMenu(() => showModeSelectMenu());
apexTrialsModal.setOnLaunchTrial(() => startMode('apex_trial'));
directivesModal.setOnClose(() => {
  if (typeof document !== 'undefined') {
    const rail = document.getElementById('mainMenu') || document.getElementById('directivesBtn');
    if (rail && typeof rail.focus === 'function') rail.focus();
  }
});

export { armoryModal, achievementsModal, contractsModal, apexTrialsModal, settingsModal, directivesModal, swarmModeModal };

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

export function teardownActiveMatch() {
  if ((state.gameMode === 'duel' || state.gameMode === 'duel_ai') && !state.aiPracticeSettled && (state.running || state.sessionTiersCleared > 0)) {
    duelEconomyBridge.settleAIPracticeFromState(state, 'exit');
  }
  if (state.gameMode === 'apex_trial') {
    if (typeof window !== 'undefined' && typeof window.__tronSettleApexTrialRun === 'function' && state.trialRunStats && !state.trialRunStats.settled) {
      const hasProgress = (state.trialRunStats.fractures || 0) > 0 || (state.trialRunStats.wavesCleared || 0) > 0;
      if (hasProgress) {
        window.__tronSettleApexTrialRun(false);
      }
    }
    state.activeTrialMutators = null;
    state.activeTrialCycleId = null;
    state.trialHazardTimer = 0;
  }

  if (Array.isArray(state.discs)) {
    for (const d of state.discs) {
      try {
        disposeDiscEntity(d);
      } catch (err) {
        console.warn('Error disposing disc entity in teardownActiveMatch:', err);
      }
    }
    state.discs.length = 0;
  }

  if (Array.isArray(state.foes)) {
    for (const f of state.foes) {
      try {
        if (f && f.obj) {
          if (typeof scene !== 'undefined' && scene) {
            scene.remove(f.obj);
          }
          disposeHierarchy(f.obj);
        }
      } catch (err) {
        console.warn('Error disposing foe entity in teardownActiveMatch:', err);
      }
    }
    state.foes.length = 0;
  }

  state.spawnTimer = 0;
  state.countdownTimer = 0;
  state.timeScale = 1.0;
  state.slowMoActive = false;

  try {
    rebuildArenaTiles();
  } catch (err) {
    console.warn('Error rebuilding arena tiles in teardownActiveMatch:', err);
  }

  try {
    setCombatHUDVisibility(false);
  } catch (err) {
    console.warn('Error hiding combat HUD in teardownActiveMatch:', err);
  }
}

if (typeof window !== 'undefined') {
  window.__tronTeardownActiveMatch = teardownActiveMatch;
}

export function startMode(mode) {
  despawnDiorama();
  setCombatHUDVisibility(true);
  state.gameMode = (mode === 'duel' || mode === 'duel_ai') ? 'duel_ai' : mode;
  if (state.gameMode === 'duel_ai') {
    state.sessionTiersCleared = 0;
    state.aiPracticeSettled = false;
  }
  if (state.gameMode === 'swarm' || state.gameMode === 'apex_trial') {
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
  contractsModal.hide({ skipMenuCallback: true });
  apexTrialsModal.hide({ skipMenuCallback: true });
  directivesModal.hide();
  settingsModal.hide();
  swarmModeModal.hide({ skipCloseCallback: true, skipFocusRestore: true });
  state.authModalOpen = false;
  state.armoryModalOpen = false;
  state.achievementsModalOpen = false;
  state.contractsModalOpen = false;
  state.apexTrialsModalOpen = false;
  if (typeof window !== 'undefined' && window.__tronResetGame) {
    window.__tronResetGame();
  }
  resetMatchCamera();
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
  teardownActiveMatch();
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
  return `<div class="card tactical-rail" id="mainMenu" tabindex="-1">
  <div class="rail-header">
    <div class="rail-brand">
      <img src="assets/branding/arc_league_title_logo.png" alt="ARC LEAGUE" class="rail-logo">
      <div class="rail-fallback-title" style="display:none;">
        <h1>ARC</h1><h2>L E A G U E</h2>
      </div>
      <div class="rail-tagline">PURE CONSTRUCT // ARCFIELD ARENA</div>
    </div>
    <div id="identityHeader" class="identity-header rail-identity"></div>
  </div>
  <div class="mode-directives mode-select" id="mainMenuButtons">
    <button id="campaignBtn" class="mode-btn campaign-btn">FEDERATION TOUR</button>
    <button id="swarmBtn" class="mode-btn swarm-btn">SWARM PROTOCOL</button>
    <button id="apexTrialsBtn" class="mode-btn apex-btn" style="width:100%;">APEX TRIALS</button>
    <button id="practiceBtn" class="mode-btn duel-btn" style="width:100%;">AI PRACTICE</button>
    <button id="quickMatchBtn" class="mode-btn multi-btn quick-match-primary" style="width:100%;letter-spacing:2px;">ARC LEAGUE RANKED</button>
    <div class="friendly-duels-row" style="display:flex;gap:8px;width:100%;">
      <button id="hostMatchBtn" class="mode-btn multi-btn" style="flex:1;">HOST FRIENDLY MATCH</button>
      <button id="joinOnlineBtn" class="mode-btn multi-btn" style="flex:1;">JOIN FRIENDLY MATCH</button>
    </div>
  </div>
  <div id="railProtocolStatus" class="rail-status-toast" style="display:none;" aria-live="polite"></div>

  <div class="utility-dock" id="utilityDock">
    <button id="armoryBtn" class="dock-btn armory-btn" title="Athlete Loadout &amp; Cosmetics">
      <span class="dock-icon">🛡</span>
      <span class="dock-label">ATHLETE LOADOUT</span>
    </button>
    <button id="contractsBtn" class="dock-btn contracts-btn" title="Federation Contracts">
      <span class="dock-icon">📋</span>
      <span class="dock-label">CONTRACTS</span>
    </button>
    <button id="achievementsBtn" class="dock-btn achievements-btn" title="Achievements">
      <span class="dock-icon">🏆</span>
      <span class="dock-label">ACHIEVEMENTS</span>
    </button>
    <button id="directivesBtn" class="dock-btn directives-btn" title="Controls [?]">
      <span class="dock-icon">?</span>
      <span class="dock-label">CONTROLS</span>
    </button>
    <button id="settingsBtn" class="dock-btn settings-btn" title="System Settings">
      <span class="dock-icon">⚙</span>
      <span class="dock-label">SETTINGS</span>
    </button>
  </div>

  <!-- Legacy compatibility elements for tests & programmatic navigation -->
  <div style="display:none;" aria-hidden="true">
    <button id="btnEnter3DLobby" style="min-width:44px;min-height:44px;"></button>
    <button id="duelBtn" style="min-width:44px;min-height:44px;"></button>
    <button id="btnSwarmSolo" style="min-width:44px;min-height:44px;"></button>
    <button id="btnDuelSolo" style="min-width:44px;min-height:44px;"></button>
    <button id="joinRoomBtn" style="min-width:44px;min-height:44px;"></button>
  </div>
</div>`;
}

export function activate3DLobbyView() {
  // Deprecated: 3D playable lobby scrapped in favor of Left-Aligned Tactical Rail
}

export function deactivate3DLobbyView() {
  // Deprecated: 3D playable lobby scrapped in favor of Left-Aligned Tactical Rail
}

export function showModeSelectMenu(options = {}) {
  teardownActiveMatch();
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
  refreshDioramaCosmetics();
  spawnDiorama();

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
  contractsModal.hide({ skipMenuCallback: true });
  apexTrialsModal.hide({ skipMenuCallback: true });
  directivesModal.hide();
  settingsModal.hide();
  swarmModeModal.hide({ skipCloseCallback: true, skipFocusRestore: true });
  state.authModalOpen = false;
  state.armoryModalOpen = false;
  state.achievementsModalOpen = false;
  state.contractsModalOpen = false;
  state.apexTrialsModalOpen = false;
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
  ensureContractsPipSubscription();
  updateContractsPip();
  updateApexTrialsPip();
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
      b.addEventListener('click', (e) => {
        try { playEquipSound(); } catch (_) {}
        fn(e);
      });
      b.addEventListener('mouseenter', () => {
        try { playTerminalKeySound(); } catch (_) {}
      });
    } else {
      console.warn(`UI Binding Warning: Button #${id} not found.`);
    }
  };

  if (typeof document !== 'undefined') {
    const rail = document.getElementById('mainMenu');
    if (rail && typeof rail.querySelectorAll === 'function') {
      const railButtons = rail.querySelectorAll('.mode-btn, .dock-btn, .variant-btn');
      for (const btn of railButtons) {
        if (btn && btn.addEventListener) {
          btn.addEventListener('mouseenter', () => {
            try { playTerminalKeySound(); } catch (_) {}
          });
          btn.addEventListener('click', () => {
            try { playEquipSound(); } catch (_) {}
          });
        }
      }
    }
  }

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
    armoryModal.show();
  };

  const openAchievements = (e) => {
    e.stopPropagation();
    if (e.cancelable) e.preventDefault();
    achievementsModal.show();
  };

  const openDirectives = (e) => {
    e.stopPropagation();
    if (e.cancelable) e.preventDefault();
    directivesModal.show();
  };

  const openSettings = (e) => {
    e.stopPropagation();
    if (e.cancelable) e.preventDefault();
    settingsModal.show();
  };

  const showProtocolStandingBy = (label) => {
    const statusEl = typeof document !== 'undefined' ? document.getElementById('railProtocolStatus') : null;
    if (!statusEl) return;
    statusEl.textContent = `${label} // PROTOCOL STANDING BY`;
    statusEl.style.display = 'block';
    clearTimeout(showProtocolStandingBy._timer);
    showProtocolStandingBy._timer = setTimeout(() => {
      statusEl.style.display = 'none';
    }, 2400);
  };

  const openApexTrials = (e) => {
    e.stopPropagation();
    if (e.cancelable) e.preventDefault();
    apexTrialsModal.show();
  };

  const openContracts = (e) => {
    e.stopPropagation();
    if (e.cancelable) e.preventDefault();
    contractsModal.show();
  };

  const openSwarmModal = (e) => {
    e.stopPropagation();
    if (e.cancelable) e.preventDefault();
    swarmModeModal.setOnLaunch(({ hardcore }) => {
      if (state.isTouchDevice) {
        if (!isFullScreen()) toggleFullScreen();
        else requestFullScreen();
      }
      startSoloSwarm({ hardcore });
    });
    swarmModeModal.show();
  };

  bind('campaignBtn', openCampaign);
  bind('apexTrialsBtn', openApexTrials);
  bind('armoryBtn', openArmory);
  bind('contractsBtn', openContracts);
  bind('achievementsBtn', openAchievements);
  bind('directivesBtn', openDirectives);
  bind('settingsBtn', openSettings);
  bind('swarmBtn', openSwarmModal);
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

export function updateContractsPip(manager = contractManager) {
  if (typeof document === 'undefined') return false;
  const btn = document.getElementById('contractsBtn');
  if (!btn) return false;

  const hasClaimable = Boolean(
    manager && (
      (typeof manager.hasClaimableRewards === 'function' && manager.hasClaimableRewards()) ||
      (typeof manager.getPendingClaimCount === 'function' && manager.getPendingClaimCount() > 0)
    )
  );

  let pip = typeof btn.querySelector === 'function' ? btn.querySelector('.neon-pip-dot') : null;
  if (hasClaimable) {
    if (!pip && typeof document.createElement === 'function') {
      pip = document.createElement('span');
      pip.className = 'neon-pip-dot';
      pip.textContent = '●';
      pip.title = 'Claimable Contract Rewards Ready';
      if (typeof btn.appendChild === 'function') {
        btn.appendChild(pip);
      }
    }
    return true;
  }

  if (pip) {
    if (typeof pip.remove === 'function') {
      pip.remove();
    } else if (pip.parentNode && typeof pip.parentNode.removeChild === 'function') {
      pip.parentNode.removeChild(pip);
    }
  }
  return false;
}

let _contractsPipSubscribed = false;
function ensureContractsPipSubscription() {
  if (_contractsPipSubscribed) return;
  if (contractManager && typeof contractManager.on === 'function') {
    _contractsPipSubscribed = true;
    const refreshPip = () => updateContractsPip(contractManager);
    contractManager.on(ContractEvents.CONTRACTS_UPDATED, refreshPip);
    contractManager.on(ContractEvents.CONTRACT_CLAIMABLE, refreshPip);
    contractManager.on(ContractEvents.CONTRACT_CLAIMED, refreshPip);
    contractManager.on(ContractEvents.DAILY_SWEEP_CLAIMABLE, refreshPip);
    contractManager.on(ContractEvents.DAILY_SWEEP_CLAIMED, refreshPip);
    contractManager.on(ContractEvents.DAILY_ROTATED, refreshPip);
  }
}

export function updateApexTrialsPip(manager = apexTrialManager) {
  if (typeof document === 'undefined') return false;
  const btn = document.getElementById('apexTrialsBtn');
  if (!btn) return false;

  const isActive = Boolean(manager && typeof manager.isTrialActive === 'function' && manager.isTrialActive());
  const hasClaimable = Boolean(manager && typeof manager.getClaimableCycles === 'function' && manager.getClaimableCycles().length > 0);
  const showPip = isActive || hasClaimable;

  let pip = typeof btn.querySelector === 'function' ? btn.querySelector('.neon-pip-dot') : null;
  if (showPip) {
    if (!pip && typeof document.createElement === 'function') {
      pip = document.createElement('span');
      pip.className = 'neon-pip-dot';
      pip.textContent = '●';
      pip.title = hasClaimable ? 'Apex Trial Rewards Ready' : 'Active Apex Trial Live';
      if (typeof btn.appendChild === 'function') {
        btn.appendChild(pip);
      }
    }
    return true;
  }

  if (pip) {
    if (typeof pip.remove === 'function') {
      pip.remove();
    } else if (pip.parentNode && typeof pip.parentNode.removeChild === 'function') {
      pip.parentNode.removeChild(pip);
    }
  }
  return false;
}

export function bindMenuButtons() {
  bindMainMenuEvents();
  bindPauseAndModalEvents();
  ensureContractsPipSubscription();
  updateContractsPip();
  updateApexTrialsPip();
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
