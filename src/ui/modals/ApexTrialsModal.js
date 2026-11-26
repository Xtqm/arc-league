/**
 * ApexTrialsModal.js
 * Diegetic Apex Trials & Weekly Spark Vault Modal for Tron Disc Arena.
 * Provides:
 * - Event Overview / Leaderboard tab: active/intermission status, countdown,
 *   mutator breakdown, Free Ticket / 2-Spark launch button, AR standings,
 *   and idempotent cycle payout claiming.
 * - Spark Vault tab: 1-3 weekly rotating UNLOCK_TYPES.SPARKS items,
 *   rotation countdown, and atomic Spark purchase pipeline.
 */

import { apexTrialManager as defaultTrialManager, ApexTrialEvents } from '../../events/ApexTrialManager.js';
import { sparkVaultManager as defaultVaultManager, SparkVaultEvents } from '../../events/SparkVaultManager.js';
import { economyManager as defaultEconomyManager } from '../../core/economy/EconomyManager.js';
import { ORDERED_BRACKET_TIERS, TRIAL_WINDOW_STATES, DAY_MS } from '../../events/ApexTrialRegistry.js';
import { state } from '../../core/state.js';
import { setCursor } from '../../input/InputManager.js';
import { playTerminalKeySound, playEquipSound } from '../../audio/sfx.js';

export function formatEventCountdown(ms) {
  const totalSec = Math.max(0, Math.floor(Number(ms || 0) / 1000));
  const days = Math.floor(totalSec / 86400);
  const hours = String(Math.floor((totalSec % 86400) / 3600)).padStart(2, '0');
  const minutes = String(Math.floor((totalSec % 3600) / 60)).padStart(2, '0');
  const seconds = String(totalSec % 60).padStart(2, '0');
  if (days > 0) {
    return `${days}D ${hours}:${minutes}:${seconds}`;
  }
  return `${hours}:${minutes}:${seconds}`;
}

export class ApexTrialsModal {
  /**
   * @param {object} [options]
   * @param {import('../../events/ApexTrialManager.js').ApexTrialManager} [options.trials]
   * @param {import('../../events/SparkVaultManager.js').SparkVaultManager} [options.vault]
   * @param {import('../../core/economy/EconomyManager.js').EconomyManager} [options.economy]
   */
  constructor(options = {}) {
    this.trials = options.trials || defaultTrialManager;
    this.vault = options.vault || defaultVaultManager;
    this.economy = options.economy || defaultEconomyManager;
    this._containerId = 'apexTrialsModal';
    this._activeTab = 'overview'; // 'overview' | 'vault'
    this._onBackToMenu = null;
    this._onLaunchTrial = null;
    this._countdownTimer = null;
    this._unsubs = [];
    this._skipMenuCallbackOnClose = false;
    this._customContainer = options.container || null;
    this._statusMessage = null;
    this._leaderboardData = null;

    if (typeof window !== 'undefined') {
      window.__tronOpenApexTrials = (opts) => this.show(opts);
      window.__tronCloseApexTrials = () => this.hide();
    }
  }

  get container() {
    if (typeof document === 'undefined') return null;
    if (this._customContainer) return this._customContainer;
    let el = document.getElementById(this._containerId);
    if (!el && typeof document.createElement === 'function') {
      el = document.createElement('dialog');
      el.id = this._containerId;
      el.className = 'apex-trials-dialog';
      if (typeof el.setAttribute === 'function') {
        el.setAttribute('aria-labelledby', 'apexTrialsModalTitle');
      }
      if (typeof el.addEventListener === 'function') {
        el.addEventListener('close', () => this._handleNativeClose());
      }
      if (document.body && typeof document.body.appendChild === 'function') {
        document.body.appendChild(el);
      }
    }
    return el;
  }

  _getExistingContainer() {
    if (this._customContainer) return this._customContainer;
    if (typeof document === 'undefined') return null;
    return document.getElementById(this._containerId);
  }

  isOpen() {
    const el = this._getExistingContainer();
    if (!el) return false;
    if (typeof el.showModal === 'function') {
      return Boolean(el.open);
    }
    return Boolean(el.open || (el.style && el.style.display !== 'none'));
  }

  setOnBackToMenu(callback) {
    this._onBackToMenu = callback;
  }

  setOnLaunchTrial(callback) {
    this._onLaunchTrial = callback;
  }

  setTab(tab) {
    this._activeTab = tab === 'vault' ? 'vault' : 'overview';
    this._statusMessage = null;
    if (this.isOpen()) {
      this.refresh();
    }
  }

  show(options = {}) {
    if (options && (options.tab === 'vault' || options.tab === 'overview')) {
      this._activeTab = options.tab;
    }
    this._statusMessage = null;

    if (typeof document !== 'undefined' && document.pointerLockElement) {
      try {
        document.exitPointerLock();
      } catch (_) {}
    }
    setCursor(true);
    state.apexTrialsModalOpen = true;

    const el = this.container;
    if (!el) return;

    el.innerHTML = this.render();
    this._skipMenuCallbackOnClose = false;

    if (typeof el.showModal === 'function') {
      if (!el.open) {
        el.showModal();
      }
    } else {
      el.open = true;
      if (el.style) el.style.display = 'flex';
    }

    this.bindEvents(el);
    this._startCountdownTimer();
    this._subscribeManagers();
    this._loadLeaderboardAsync();
  }

  refresh() {
    const el = this.container;
    if (!el || !this.isOpen()) return;
    el.innerHTML = this.render();
    this.bindEvents(el);
  }

  hide(options = {}) {
    const wasOpen = this.isOpen() || Boolean(state.apexTrialsModalOpen);
    this._stopCountdownTimer();
    this._unsubscribeManagers();
    state.apexTrialsModalOpen = false;

    const el = this._getExistingContainer();
    if (el) {
      this._skipMenuCallbackOnClose = Boolean(options.skipMenuCallback);
      if (typeof el.close === 'function' && el.open) {
        el.close();
      } else {
        el.open = false;
        if (el.style) el.style.display = 'none';
        if (wasOpen && !options.skipMenuCallback && typeof this._onBackToMenu === 'function') {
          this._onBackToMenu();
        }
      }
    }
  }

  _handleNativeClose() {
    const el = this.container;
    if (el && 'returnValue' in el) {
      el.returnValue = '';
    }
    const skipMenu = this._skipMenuCallbackOnClose;
    this._skipMenuCallbackOnClose = false;
    this._stopCountdownTimer();
    this._unsubscribeManagers();
    state.apexTrialsModalOpen = false;

    if (!skipMenu && typeof this._onBackToMenu === 'function') {
      this._onBackToMenu();
    }
  }

  _startCountdownTimer() {
    this._stopCountdownTimer();
    if (typeof setInterval !== 'function') return;
    this._countdownTimer = setInterval(() => {
      if (!this.isOpen()) {
        this._stopCountdownTimer();
        return;
      }
      const el = this.container;
      if (!el || typeof el.querySelector !== 'function') return;

      const trialTimerEl = el.querySelector('#apexTrialsCountdown');
      if (trialTimerEl && this.trials) {
        const ms = this.trials.getTimeRemainingMs();
        const win = this.trials.getScheduleStatus();
        const prefix = win.state === TRIAL_WINDOW_STATES.ACTIVE ? 'ENDS IN ' : 'NEXT TRIAL IN ';
        trialTimerEl.textContent = `${prefix}${formatEventCountdown(ms)}`;
      }

      const vaultTimerEl = el.querySelector('#apexVaultCountdown');
      if (vaultTimerEl && this.vault) {
        const ms = this.vault.getMsUntilNextRotation();
        vaultTimerEl.textContent = `ROTATES IN ${formatEventCountdown(ms)}`;
      }
    }, 1000);
    if (typeof this._countdownTimer?.unref === 'function') {
      this._countdownTimer.unref();
    }
  }

  _stopCountdownTimer() {
    if (this._countdownTimer) {
      clearInterval(this._countdownTimer);
      this._countdownTimer = null;
    }
  }

  _subscribeManagers() {
    this._unsubscribeManagers();
    const onUpdate = () => {
      if (this.isOpen()) this.refresh();
    };
    if (this.trials && typeof this.trials.on === 'function') {
      this._unsubs.push(this.trials.on(ApexTrialEvents.TRIAL_ENTERED, onUpdate));
      this._unsubs.push(this.trials.on(ApexTrialEvents.RUN_RECORDED, onUpdate));
      this._unsubs.push(this.trials.on(ApexTrialEvents.REWARDS_CLAIMED, onUpdate));
    }
    if (this.vault && typeof this.vault.on === 'function') {
      this._unsubs.push(this.vault.on(SparkVaultEvents.VAULT_PURCHASED, onUpdate));
    }
  }

  _unsubscribeManagers() {
    for (const unsub of this._unsubs) {
      if (typeof unsub === 'function') unsub();
    }
    this._unsubs = [];
  }

  async _loadLeaderboardAsync() {
    if (!this.trials || typeof this.trials.getLeaderboardStandings !== 'function') return;
    const win = this.trials.getScheduleStatus();
    const targetCycle = win.activeCycle || win.previousCycle;
    if (!targetCycle) return;

    try {
      const res = await this.trials.getLeaderboardStandings(targetCycle.cycleId);
      this._leaderboardData = { cycleId: targetCycle.cycleId, ...res };
      if (this.isOpen() && this._activeTab === 'overview') {
        const el = this.container;
        const lbEl = el && typeof el.querySelector === 'function'
          ? el.querySelector('#apexLeaderboardContainer')
          : null;
        if (lbEl) {
          lbEl.innerHTML = this._renderLeaderboardRows(this._leaderboardData);
        }
      }
    } catch (_) {}
  }

  render() {
    const currentSparks = this.economy && typeof this.economy.getSparks === 'function'
      ? this.economy.getSparks()
      : 0;
    const isOverview = this._activeTab === 'overview';
    const claimableCount = this.trials && typeof this.trials.getClaimableCycles === 'function'
      ? this.trials.getClaimableCycles().length
      : 0;

    const statusBannerHtml = this._statusMessage
      ? `<div id="apexTrialsStatusBanner" style="
          padding: 10px 14px;
          border-radius: 6px;
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 0.8px;
          background: ${this._statusMessage.type === 'error' ? 'rgba(255, 51, 102, 0.16)' : 'rgba(0, 255, 170, 0.14)'};
          border: 1px solid ${this._statusMessage.type === 'error' ? '#ff3366' : '#00ffaa'};
          color: ${this._statusMessage.type === 'error' ? '#ff80a0' : '#00ffaa'};
        ">${this._statusMessage.text}</div>`
      : '';

    return `
      <div class="apex-trials-modal-card" style="
        width: min(94vw, 980px);
        max-height: 88vh;
        background: rgba(2, 10, 22, 0.97);
        border: 2px solid #bd00ff;
        border-radius: 10px;
        box-shadow: 0 0 42px rgba(189, 0, 255, 0.32), inset 0 0 24px rgba(0, 243, 255, 0.1);
        display: flex;
        flex-direction: column;
        overflow: hidden;
        color: #ffffff;
        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      ">
        <!-- Header -->
        <div style="
          padding: 16px 24px;
          border-bottom: 1px solid rgba(189, 0, 255, 0.35);
          background: linear-gradient(90deg, rgba(189, 0, 255, 0.12), rgba(0, 243, 255, 0.06));
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
        ">
          <div>
            <h1 id="apexTrialsModalTitle" style="margin: 0; font-size: 20px; font-weight: 700; letter-spacing: 2px; color: #e08cff; text-shadow: 0 0 12px rgba(189, 0, 255, 0.6);">
              APEX TRIALS &amp; SPARK VAULT
            </h1>
            <div style="font-size: 11px; color: #b5cbe0; letter-spacing: 1px; margin-top: 3px;">
              SPORADIC COMPETITIVE EVENTS // WEEKLY PRESTIGE ARMORY
            </div>
          </div>
          <div style="display: flex; align-items: center; gap: 14px;">
            <div id="apexTrialsSparksBalance" style="
              padding: 6px 12px;
              border-radius: 4px;
              background: rgba(189, 0, 255, 0.18);
              border: 1px solid rgba(189, 0, 255, 0.6);
              font-size: 12px;
              font-weight: 700;
              letter-spacing: 1px;
              color: #e9a8ff;
            ">⚡ ${currentSparks.toLocaleString()} SPARKS</div>
            <button id="apexTrialsCloseBtn" type="button" autofocus style="
              min-height: 36px;
              background: rgba(255, 0, 85, 0.16);
              border: 1px solid #ff0055;
              color: #ff4d88;
              padding: 6px 14px;
              border-radius: 4px;
              font-size: 12px;
              font-weight: 700;
              letter-spacing: 1px;
              cursor: pointer;
            ">[ ESC // CLOSE ]</button>
          </div>
        </div>

        <!-- Tabs -->
        <div style="
          display: flex;
          gap: 8px;
          padding: 10px 24px;
          border-bottom: 1px solid rgba(0, 243, 255, 0.2);
          background: rgba(0, 14, 28, 0.85);
        ">
          <button id="apexTabOverviewBtn" type="button" data-tab="overview" style="
            padding: 8px 16px;
            border-radius: 4px;
            font-size: 12px;
            font-weight: 700;
            letter-spacing: 1.2px;
            cursor: pointer;
            border: 1px solid ${isOverview ? '#00f3ff' : 'rgba(255,255,255,0.18)'};
            background: ${isOverview ? 'rgba(0, 243, 255, 0.16)' : 'transparent'};
            color: ${isOverview ? '#00f3ff' : '#9bb3c7'};
          ">EVENT &amp; LEADERBOARD${claimableCount > 0 ? ` (${claimableCount} READY)` : ''}</button>
          <button id="apexTabVaultBtn" type="button" data-tab="vault" style="
            padding: 8px 16px;
            border-radius: 4px;
            font-size: 12px;
            font-weight: 700;
            letter-spacing: 1.2px;
            cursor: pointer;
            border: 1px solid ${!isOverview ? '#bd00ff' : 'rgba(255,255,255,0.18)'};
            background: ${!isOverview ? 'rgba(189, 0, 255, 0.2)' : 'transparent'};
            color: ${!isOverview ? '#e9a8ff' : '#9bb3c7'};
          ">SPARK VAULT (WEEKLY)</button>
        </div>

        <!-- Body -->
        <div style="flex: 1; overflow-y: auto; padding: 18px 24px; display: flex; flex-direction: column; gap: 18px;">
          ${statusBannerHtml}
          ${isOverview ? this._renderOverviewTab() : this._renderVaultTab()}
        </div>

        <!-- Footer -->
        <div style="
          padding: 12px 24px;
          border-top: 1px solid rgba(0, 243, 255, 0.2);
          background: rgba(0, 12, 24, 0.92);
          display: flex;
          justify-content: flex-end;
        ">
          <button id="apexTrialsReturnBtn" type="button" style="
            min-height: 36px;
            background: rgba(0, 243, 255, 0.12);
            border: 1px solid #00f3ff;
            color: #00f3ff;
            padding: 6px 16px;
            border-radius: 4px;
            font-size: 12px;
            font-weight: 700;
            letter-spacing: 1px;
            cursor: pointer;
          ">RETURN TO MAIN RAIL</button>
        </div>
      </div>
    `;
  }

  _renderOverviewTab() {
    const win = this.trials.getScheduleStatus();
    const isActive = win.state === TRIAL_WINDOW_STATES.ACTIVE && Boolean(win.activeCycle);
    const active = win.activeCycle;
    const displayCycle = active || win.nextCycle || win.previousCycle;
    const remainingMs = this.trials.getTimeRemainingMs();
    const countdownLabel = isActive
      ? `ENDS IN ${formatEventCountdown(remainingMs)}`
      : `NEXT TRIAL IN ${formatEventCountdown(remainingMs)}`;

    const entryCheck = isActive ? this.trials.canEnterTrial(active.cycleId) : null;
    const record = displayCycle ? this.trials.getCycleRecord(displayCycle.cycleId) : { bestAR: 0, attempts: 0, freeTicketUsed: false };
    const bracket = record.bestAR > 0 ? this.trials.classifyBracket(record.bestAR, displayCycle) : null;
    const claimableCycles = this.trials.getClaimableCycles();

    // Mutators pills
    const mutators = displayCycle?.mutators || {};
    const mutatorTags = [
      mutators.gravityScale && mutators.gravityScale !== 1 ? `GRAVITY ${(mutators.gravityScale * 100).toFixed(0)}%` : null,
      mutators.discSpeedMult && mutators.discSpeedMult !== 1 ? `DISC SPEED ${mutators.discSpeedMult}x` : null,
      mutators.hazardDensity && mutators.hazardDensity > 1 ? `HAZARD DENSITY ${mutators.hazardDensity}x` : null,
      mutators.startingTier && mutators.startingTier > 1 ? `START TIER ${mutators.startingTier}` : null,
      mutators.bossEveryWave ? 'ARBITER BOSS EVERY WAVE' : null
    ].filter(Boolean);

    let launchBtnHtml = '';
    if (!isActive) {
      launchBtnHtml = `
        <button id="apexTrialLaunchBtn" type="button" disabled style="
          padding: 12px 20px; border-radius: 5px; border: 1px solid rgba(255,255,255,0.2);
          background: rgba(255,255,255,0.06); color: #8da2b5; font-weight: 700; letter-spacing: 1.2px; cursor: not-allowed;
        ">[ INTERMISSION // DEPLOYMENT STANDBY ]</button>
      `;
    } else if (entryCheck && entryCheck.allowed) {
      const btnText = entryCheck.usesFreeTicket
        ? '[ DEPLOY // FREE ENTRY TICKET ]'
        : `[ DEPLOY // ${entryCheck.costSparks} SPARKS ]`;
      const btnColor = entryCheck.usesFreeTicket ? '#00ffaa' : '#bd00ff';
      launchBtnHtml = `
        <button id="apexTrialLaunchBtn" type="button" data-action="launch-trial" data-cycle-id="${active.cycleId}" style="
          padding: 12px 20px; border-radius: 5px; border: 1px solid ${btnColor};
          background: ${entryCheck.usesFreeTicket ? 'rgba(0,255,170,0.16)' : 'rgba(189,0,255,0.22)'};
          color: ${entryCheck.usesFreeTicket ? '#00ffaa' : '#f0b8ff'};
          font-weight: 700; letter-spacing: 1.2px; cursor: pointer;
        ">${btnText}</button>
      `;
    } else {
      launchBtnHtml = `
        <button id="apexTrialLaunchBtn" type="button" disabled style="
          padding: 12px 20px; border-radius: 5px; border: 1px solid #ff3366;
          background: rgba(255,51,102,0.12); color: #ff80a0;
          font-weight: 700; letter-spacing: 1.2px; cursor: not-allowed;
        ">[ INSUFFICIENT SPARKS // NEED 2 ]</button>
      `;
    }

    const claimSectionHtml = claimableCycles.length > 0
      ? `<div style="
          padding: 14px 16px; border-radius: 8px;
          background: rgba(0, 255, 170, 0.08); border: 1px solid rgba(0, 255, 170, 0.45);
          display: flex; flex-direction: column; gap: 10px;
        ">
          <div style="font-size: 13px; font-weight: 700; letter-spacing: 1.2px; color: #00ffaa;">
            COMPLETED TRIAL PAYOUTS READY TO CLAIM
          </div>
          ${claimableCycles.map((c) => `
            <div style="display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap;">
              <div style="font-size: 12px; color: #d8f5ea;">
                <strong>${c.meta?.title || c.cycleId}</strong> — ${c.tier.label} (${c.tier.percentileLabel}) · Best AR: ${c.record.bestAR.toLocaleString()}
                <span style="color: #ffd166; margin-left: 6px;">+${c.tier.sparks} Sparks, +${c.tier.credits.toLocaleString()} AC${c.tier.grantsTitle ? `, Title: ${c.meta?.exclusiveTitle}` : ''}</span>
              </div>
              <button type="button" id="claimCycleBtn_${c.cycleId}" class="apex-claim-btn" data-action="claim-cycle" data-cycle-id="${c.cycleId}" style="
                padding: 7px 14px; border-radius: 4px; border: 1px solid #00ffaa;
                background: rgba(0,255,170,0.2); color: #00ffaa; font-weight: 700; font-size: 11px; cursor: pointer;
              ">[ CLAIM PAYOUT ]</button>
            </div>
          `).join('')}
        </div>`
      : '';

    const tiersHtml = ORDERED_BRACKET_TIERS.map((t) => `
      <div style="
        padding: 10px 12px; border-radius: 6px;
        background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.12);
      ">
        <div style="font-size: 12px; font-weight: 700; color: #00f3ff;">${t.label} (${t.percentileLabel})</div>
        <div style="font-size: 11px; color: #d8e6f2; margin-top: 4px;">
          ⚡ ${t.sparks} Sparks · ${t.credits.toLocaleString()} AC${t.xp > 0 ? ` · ${t.xp} XP` : ''}${t.grantsTitle ? ' · Exclusive Title' : ''}${t.emblem && !t.grantsTitle ? ' · Tier Emblem' : ''}
        </div>
      </div>
    `).join('');

    return `
      ${claimSectionHtml}

      <!-- Active / Next Event Card -->
      <div style="
        padding: 16px 18px; border-radius: 8px;
        background: rgba(0, 243, 255, 0.05);
        border: 1px solid ${isActive ? (displayCycle?.themeColor || '#00f3ff') : 'rgba(255,255,255,0.18)'};
        display: flex; flex-direction: column; gap: 12px;
      ">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 10px;">
          <div>
            <div style="font-size: 11px; font-weight: 700; letter-spacing: 1.5px; color: ${isActive ? '#00ffaa' : '#ffaa00'};">
              ${isActive ? '● ACTIVE APEX TRIAL' : '○ INTERMISSION // UPCOMING TRIAL'}
            </div>
            <h2 style="margin: 4px 0 2px; font-size: 18px; letter-spacing: 1.5px; color: #ffffff;">
              ${displayCycle ? displayCycle.title : 'TRIAL STANDBY'}
            </h2>
            <div style="font-size: 12px; color: #9ec4d8;">${displayCycle ? displayCycle.description : 'Awaiting next scheduled Federation Apex Trial.'}</div>
          </div>
          <span id="apexTrialsCountdown" style="
            font-size: 12px; font-weight: 700; letter-spacing: 1px;
            color: #ffaa00; background: rgba(255, 170, 0, 0.12);
            border: 1px solid rgba(255, 170, 0, 0.45); padding: 5px 10px; border-radius: 4px;
          ">${countdownLabel}</span>
        </div>

        <div style="display: flex; flex-wrap: wrap; gap: 8px;">
          ${mutatorTags.map((tag) => `<span style="
            font-size: 11px; font-weight: 700; padding: 3px 9px; border-radius: 4px;
            background: rgba(189,0,255,0.14); border: 1px solid rgba(189,0,255,0.4); color: #e2a4ff;
          ">${tag}</span>`).join('')}
        </div>

        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px; padding-top: 6px; border-top: 1px solid rgba(255,255,255,0.08);">
          <div style="font-size: 12px; color: #c7dceb;">
            PERSONAL BEST AR: <strong style="color: #00f3ff;">${(record.bestAR || 0).toLocaleString()}</strong>
            ${bracket?.tier ? ` · STANDING: <strong style="color: #ffd166;">${bracket.tier.label} (${bracket.tier.percentileLabel})</strong>` : ''}
            · ATTEMPTS: <strong>${record.attempts || 0}</strong>
          </div>
          ${launchBtnHtml}
        </div>
      </div>

      <!-- Payout Tiers -->
      <div>
        <div style="font-size: 12px; font-weight: 700; letter-spacing: 1.3px; color: #9ec4d8; margin-bottom: 8px;">
          END-OF-CYCLE BRACKET PAYOUTS
        </div>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(190px, 1fr)); gap: 10px;">
          ${tiersHtml}
        </div>
      </div>

      <!-- Leaderboard Standings -->
      <div>
        <div style="font-size: 12px; font-weight: 700; letter-spacing: 1.3px; color: #9ec4d8; margin-bottom: 8px;">
          APEX RATING (AR) STANDINGS
        </div>
        <div id="apexLeaderboardContainer" style="
          padding: 12px; border-radius: 6px;
          background: rgba(0,0,0,0.28); border: 1px solid rgba(0,243,255,0.2);
          font-size: 12px; color: #b9d4e8;
        ">
          ${this._leaderboardData ? this._renderLeaderboardRows(this._leaderboardData) : 'SYNCHRONIZING FEDERATION STANDINGS...'}
        </div>
      </div>
    `;
  }

  _renderLeaderboardRows(data) {
    if (!data || !Array.isArray(data.entries) || data.entries.length === 0) {
      return '<div>No standings recorded yet for this cycle.</div>';
    }
    const sourceBadge = data.source === 'online' ? 'LIVE GRID' : 'FEDERATION BENCHMARK';
    return `
      <div style="font-size: 10px; color: #7fa7c4; letter-spacing: 1px; margin-bottom: 8px;">SOURCE: ${sourceBadge}</div>
      <div style="display: flex; flex-direction: column; gap: 6px;">
        ${data.entries.slice(0, 10).map((row) => `
          <div style="
            display: flex; justify-content: space-between; padding: 6px 10px; border-radius: 4px;
            background: ${row.isPlayer ? 'rgba(0, 243, 255, 0.14)' : 'rgba(255,255,255,0.03)'};
            border: 1px solid ${row.isPlayer ? 'rgba(0, 243, 255, 0.45)' : 'transparent'};
          ">
            <span>#${row.rank} <strong>${row.handle}</strong>${row.tierLabel ? ` <span style="color:#8cb2cc;">(${row.tierLabel})</span>` : ''}</span>
            <span style="color: #00f3ff; font-weight: 700;">${Number(row.bestAR || 0).toLocaleString()} AR</span>
          </div>
        `).join('')}
      </div>
    `;
  }

  _renderVaultTab() {
    const snap = this.vault.getSnapshot();
    const countdownText = `ROTATES IN ${formatEventCountdown(snap.msUntilRotation)}`;

    const itemsHtml = snap.items.map((item) => {
      const check = this.vault.canPurchase(item.id);
      const primaryHex = item.shader?.primaryHex || '#bd00ff';
      const secondaryHex = item.shader?.secondaryEmissiveHex || '#00f3ff';
      const rarityLabel = item.vaultMeta?.rarity || 'PRESTIGE';
      const tierLabel = item.vaultMeta?.tierLabel || 'Spark Vault Cosmetic';

      let btnHtml = '';
      if (item.owned) {
        btnHtml = `
          <button type="button" id="vaultBuyBtn_${item.id}" disabled style="
            width: 100%; padding: 10px 14px; border-radius: 4px;
            border: 1px solid #00ffaa; background: rgba(0,255,170,0.12);
            color: #00ffaa; font-weight: 700; font-size: 12px; cursor: default;
          ">[ OWNED // EQUIP IN LOADOUT ]</button>
        `;
      } else if (check.allowed) {
        btnHtml = `
          <button type="button" id="vaultBuyBtn_${item.id}" class="vault-buy-btn" data-action="buy-vault" data-item-id="${item.id}" style="
            width: 100%; padding: 10px 14px; border-radius: 4px;
            border: 1px solid #bd00ff; background: rgba(189,0,255,0.22);
            color: #f2c4ff; font-weight: 700; font-size: 12px; cursor: pointer;
          ">[ UNLOCK // ${item.sparksCost} SPARKS ]</button>
        `;
      } else {
        btnHtml = `
          <button type="button" id="vaultBuyBtn_${item.id}" disabled style="
            width: 100%; padding: 10px 14px; border-radius: 4px;
            border: 1px solid rgba(255,51,102,0.5); background: rgba(255,51,102,0.1);
            color: #ff80a0; font-weight: 700; font-size: 12px; cursor: not-allowed;
          ">[ UNLOCK // ${item.sparksCost} SPARKS ]</button>
          <div style="font-size: 10px; color: #ff80a0; text-align: center; margin-top: 4px;">
            INSUFFICIENT SPARKS (HAVE ${snap.currentSparks})
          </div>
        `;
      }

      return `
        <div style="
          padding: 16px; border-radius: 8px;
          background: rgba(18, 8, 32, 0.72);
          border: 1px solid rgba(189, 0, 255, 0.45);
          display: flex; flex-direction: column; justify-content: space-between; gap: 12px;
        ">
          <div>
            <div style="display: flex; justify-content: space-between; align-items: center; gap: 8px;">
              <span style="font-size: 10px; font-weight: 700; letter-spacing: 1.2px; color: #e9a8ff;">${rarityLabel} // ${tierLabel}</span>
              <span style="width: 18px; height: 18px; border-radius: 50%; background: ${primaryHex}; border: 2px solid ${secondaryHex}; display: inline-block;"></span>
            </div>
            <h3 style="margin: 8px 0 4px; font-size: 16px; color: #ffffff;">${item.displayName}</h3>
            <p style="margin: 0; font-size: 12px; color: #b5cbe0; line-height: 1.4;">${item.description || 'Prestige Spark Vault cosmetic.'}</p>
          </div>
          <div>${btnHtml}</div>
        </div>
      `;
    }).join('');

    return `
      <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px;">
        <div>
          <h2 style="margin: 0; font-size: 15px; letter-spacing: 1.5px; color: #e9a8ff;">
            WEEKLY SPARK VAULT (ROTATION #${snap.weekIndex})
          </h2>
          <div style="font-size: 11px; color: #9ec4d8; margin-top: 2px;">
            1–3 ROTATING PRESTIGE ITEMS PER UTC WEEK // ITEMS REAPPEAR IN FUTURE ROTATIONS
          </div>
        </div>
        <span id="apexVaultCountdown" style="
          font-size: 12px; font-weight: 700; letter-spacing: 1px;
          color: #ffaa00; background: rgba(255, 170, 0, 0.12);
          border: 1px solid rgba(255, 170, 0, 0.45); padding: 5px 10px; border-radius: 4px;
        ">${countdownText}</span>
      </div>

      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 14px;">
        ${itemsHtml}
      </div>
    `;
  }

  bindEvents(root) {
    if (!root) return;

    const closeBtn = root.querySelector('#apexTrialsCloseBtn');
    if (closeBtn) {
      closeBtn.onclick = (e) => {
        e?.stopPropagation?.();
        try { playEquipSound(); } catch (_) {}
        this.hide();
      };
    }

    const returnBtn = root.querySelector('#apexTrialsReturnBtn');
    if (returnBtn) {
      returnBtn.onclick = (e) => {
        e?.stopPropagation?.();
        try { playEquipSound(); } catch (_) {}
        this.hide();
      };
    }

    const overviewTabBtn = root.querySelector('#apexTabOverviewBtn');
    if (overviewTabBtn) {
      overviewTabBtn.onclick = (e) => {
        e?.stopPropagation?.();
        try { playTerminalKeySound(); } catch (_) {}
        this.setTab('overview');
      };
    }

    const vaultTabBtn = root.querySelector('#apexTabVaultBtn');
    if (vaultTabBtn) {
      vaultTabBtn.onclick = (e) => {
        e?.stopPropagation?.();
        try { playTerminalKeySound(); } catch (_) {}
        this.setTab('vault');
      };
    }

    const launchBtn = root.querySelector('#apexTrialLaunchBtn');
    if (launchBtn && !launchBtn.disabled) {
      launchBtn.onclick = (e) => {
        e?.stopPropagation?.();
        const cycleId = launchBtn.getAttribute('data-cycle-id');
        const res = this.trials.enterTrial(cycleId);
        if (!res.success) {
          this._statusMessage = { type: 'error', text: res.reason === 'INSUFFICIENT_SPARKS' ? 'INSUFFICIENT SPARKS FOR RE-ENTRY (NEED 2)' : 'TRIAL UNAVAILABLE' };
          this.refresh();
          return;
        }
        try { playEquipSound(); } catch (_) {}
        state.activeTrialMutators = res.cycle.mutators;
        state.activeTrialCycleId = res.cycle.cycleId;
        this.hide({ skipMenuCallback: true });
        if (typeof this._onLaunchTrial === 'function') {
          this._onLaunchTrial(res);
        } else if (typeof window !== 'undefined' && typeof window.__tronStartMode === 'function') {
          window.__tronStartMode('apex_trial');
        }
      };
    }

    if (typeof root.querySelectorAll === 'function') {
      const claimBtns = root.querySelectorAll('[data-action="claim-cycle"]');
      for (const btn of claimBtns) {
        btn.onclick = (e) => {
          e?.stopPropagation?.();
          const cycleId = btn.getAttribute('data-cycle-id');
          const res = this.trials.claimCycleRewards(cycleId);
          if (res.success) {
            try { playEquipSound(); } catch (_) {}
            this._statusMessage = {
              type: 'success',
              text: `CLAIMED ${res.tier.label.toUpperCase()}: +${res.rewards.sparks} SPARKS, +${res.rewards.credits} AC${res.rewards.titleUnlocked ? `, TITLE: ${res.rewards.titleUnlocked}` : ''}`
            };
          } else {
            this._statusMessage = { type: 'error', text: `CLAIM FAILED: ${res.reason}` };
          }
          this.refresh();
        };
      }

      const buyBtns = root.querySelectorAll('[data-action="buy-vault"]');
      for (const btn of buyBtns) {
        btn.onclick = (e) => {
          e?.stopPropagation?.();
          const itemId = btn.getAttribute('data-item-id');
          const res = this.vault.purchaseItem(itemId);
          if (res.success) {
            try { playEquipSound(); } catch (_) {}
            this._statusMessage = {
              type: 'success',
              text: `UNLOCKED ${res.item.displayName.toUpperCase()} FOR ${res.sparksSpent} SPARKS`
            };
          } else {
            this._statusMessage = { type: 'error', text: `PURCHASE FAILED: ${res.reason}` };
          }
          this.refresh();
        };
      }
    }
  }
}

export const apexTrialsModal = new ApexTrialsModal();
export default apexTrialsModal;
