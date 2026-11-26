/**
 * ContractsModal.js
 * Diegetic Daily & Career Contracts Modal for Tron Disc Arena.
 * Uses native <dialog> with showModal() when supported (graceful fallback for
 * lightweight DOM test harnesses) and manages live UTC reset countdowns,
 * 500 AC 3/3 Sweep claims, locked prerequisite tracking, and Career deck deals.
 */

import { contractManager as defaultContractManager, ContractEvents } from '../../contracts/ContractManager.js';
import { state } from '../../core/state.js';
import { setCursor } from '../../input/InputManager.js';
import { playTerminalKeySound } from '../../audio/sfx.js';

export function formatUtcCountdown(ms) {
  const totalSec = Math.max(0, Math.floor(Number(ms || 0) / 1000));
  const hours = String(Math.floor(totalSec / 3600)).padStart(2, '0');
  const minutes = String(Math.floor((totalSec % 3600) / 60)).padStart(2, '0');
  const seconds = String(totalSec % 60).padStart(2, '0');
  return `${hours}:${minutes}:${seconds} UTC`;
}

export class ContractsModal {
  /**
   * @param {object} [options]
   * @param {import('../../contracts/ContractManager.js').ContractManager} [options.contracts]
   */
  constructor(options = {}) {
    this.contracts = options.contracts || defaultContractManager;
    this._containerId = 'contractsModal';
    this._onBackToMenu = null;
    this._countdownTimer = null;
    this._managerUnsub = null;
    this._skipMenuCallbackOnClose = false;
    this._customContainer = options.container || null;

    if (typeof window !== 'undefined') {
      window.__tronOpenContracts = () => this.show();
      window.__tronCloseContracts = () => this.hide();
    }
  }

  get container() {
    if (typeof document === 'undefined') return null;
    if (this._customContainer) return this._customContainer;
    let el = document.getElementById(this._containerId);
    if (!el && typeof document.createElement === 'function') {
      el = document.createElement('dialog');
      el.id = this._containerId;
      el.className = 'contracts-dialog';
      if (typeof el.setAttribute === 'function') {
        el.setAttribute('aria-labelledby', 'contractsModalTitle');
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

  show() {
    if (typeof document !== 'undefined' && document.pointerLockElement) {
      try {
        document.exitPointerLock();
      } catch (_) {}
    }
    setCursor(true);
    state.contractsModalOpen = true;

    if (this.contracts && typeof this.contracts.reconcile === 'function') {
      try {
        this.contracts.reconcile({ silent: true });
      } catch (_) {}
    }

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
    this._subscribeManager();
  }

  refresh() {
    const el = this.container;
    if (!el || !this.isOpen()) return;
    el.innerHTML = this.render();
    this.bindEvents(el);
  }

  hide(options = {}) {
    const wasOpen = this.isOpen() || Boolean(state.contractsModalOpen);
    this._stopCountdownTimer();
    this._unsubscribeManager();
    state.contractsModalOpen = false;

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
    this._unsubscribeManager();
    state.contractsModalOpen = false;

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
      const timerEl = el && typeof el.querySelector === 'function'
        ? el.querySelector('#contractsUtcCountdown')
        : null;
      if (timerEl && typeof this.contracts.getMsUntilNextUtcReset === 'function') {
        const ms = this.contracts.getMsUntilNextUtcReset();
        timerEl.textContent = `RESETS IN ${formatUtcCountdown(ms)}`;
        if (ms === 0) {
          this.refresh();
        }
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

  _subscribeManager() {
    this._unsubscribeManager();
    if (this.contracts && typeof this.contracts.on === 'function') {
      this._managerUnsub = this.contracts.on(ContractEvents.CONTRACTS_UPDATED, () => {
        if (this.isOpen()) {
          this.refresh();
        }
      });
    }
  }

  _unsubscribeManager() {
    if (typeof this._managerUnsub === 'function') {
      this._managerUnsub();
      this._managerUnsub = null;
    }
  }

  render() {
    const snapshot = this.contracts.getSnapshot();
    const { daily, career } = snapshot;
    const countdownText = `RESETS IN ${formatUtcCountdown(daily.msUntilReset)}`;

    const dailyCardsHtml = (daily.slots || [])
      .map((slot) => this._renderDailyCard(slot))
      .join('');

    const sweepBannerHtml = this._renderSweepBanner(daily);
    const careerSectionHtml = career.unlocked
      ? this._renderCareerUnlocked(career)
      : this._renderCareerLocked(career);

    return `
      <div class="contracts-modal-card" style="
        width: min(94vw, 960px);
        max-height: 88vh;
        background: rgba(2, 12, 22, 0.96);
        border: 2px solid #00f3ff;
        border-radius: 10px;
        box-shadow: 0 0 40px rgba(0, 243, 255, 0.35), inset 0 0 24px rgba(0, 243, 255, 0.12);
        display: flex;
        flex-direction: column;
        overflow: hidden;
        color: #ffffff;
        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      ">
        <!-- Header -->
        <div style="
          padding: 16px 24px;
          border-bottom: 1px solid rgba(0, 243, 255, 0.3);
          background: rgba(0, 243, 255, 0.06);
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
        ">
          <div>
            <h1 id="contractsModalTitle" style="margin: 0; font-size: 20px; font-weight: 700; letter-spacing: 2px; color: #00f3ff; text-shadow: 0 0 10px rgba(0, 243, 255, 0.55);">
              FEDERATION CONTRACTS
            </h1>
            <div style="font-size: 11px; color: #8ec5d6; letter-spacing: 1px; margin-top: 3px;">
              DAILY ROTATION &amp; TIERED CAREER DECK
            </div>
          </div>
          <button id="contractsCloseBtn" type="button" autofocus style="
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
          ">
            [ ESC // CLOSE ]
          </button>
        </div>

        <!-- Scrollable Body -->
        <div style="flex: 1; overflow-y: auto; padding: 18px 24px; display: flex; flex-direction: column; gap: 22px;">
          <!-- Daily Contracts Section -->
          <section aria-labelledby="dailyContractsHeading" style="display: flex; flex-direction: column; gap: 12px;">
            <div style="display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 8px;">
              <h2 id="dailyContractsHeading" style="margin: 0; font-size: 15px; letter-spacing: 1.5px; color: #00f3ff;">
                DAILY CONTRACTS (3 SLOTS // 24H UTC)
              </h2>
              <span id="contractsUtcCountdown" style="
                font-size: 12px;
                font-weight: 700;
                letter-spacing: 1px;
                color: #ffaa00;
                background: rgba(255, 170, 0, 0.12);
                border: 1px solid rgba(255, 170, 0, 0.45);
                padding: 4px 10px;
                border-radius: 4px;
              ">${countdownText}</span>
            </div>

            ${sweepBannerHtml}

            <div class="contracts-daily-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 12px;">
              ${dailyCardsHtml}
            </div>
          </section>

          <!-- Career Contracts Section -->
          <section aria-labelledby="careerContractsHeading" style="display: flex; flex-direction: column; gap: 12px;">
            <h2 id="careerContractsHeading" style="margin: 0; font-size: 15px; letter-spacing: 1.5px; color: #bd66ff;">
              CAREER CONTRACTS (3 FOCUSED SLOTS)
            </h2>
            ${careerSectionHtml}
          </section>
        </div>

        <!-- Footer -->
        <div style="
          padding: 12px 24px;
          border-top: 1px solid rgba(0, 243, 255, 0.25);
          background: rgba(0, 14, 26, 0.9);
          display: flex;
          justify-content: flex-end;
        ">
          <button id="contractsReturnBtn" type="button" style="
            min-height: 36px;
            background: rgba(0, 243, 255, 0.12);
            border: 1px solid #00f3ff;
            color: #00f3ff;
            padding: 8px 20px;
            border-radius: 4px;
            font-size: 12px;
            font-weight: 700;
            letter-spacing: 1.5px;
            cursor: pointer;
          ">
            [ RETURN TO MENU ]
          </button>
        </div>
      </div>
    `;
  }

  _renderSweepBanner(daily) {
    const completed = daily.completedCount || 0;
    const total = daily.totalCount || 3;
    const pct = Math.round((Math.min(completed, total) / total) * 100);

    let actionHtml = `<span style="font-size: 11px; color: #8ec5d6; letter-spacing: 1px;">COMPLETE ALL 3 FOR 500 AC</span>`;
    if (daily.sweepClaimed) {
      actionHtml = `<span style="font-size: 12px; font-weight: 700; color: #00ff88; letter-spacing: 1px;">✓ SWEEP CLAIMED (+500 AC)</span>`;
    } else if (daily.sweepClaimable) {
      actionHtml = `
        <button id="claimDailySweepBtn" type="button" style="
          min-height: 32px;
          background: rgba(255, 170, 0, 0.22);
          border: 1px solid #ffaa00;
          color: #ffcc00;
          padding: 6px 14px;
          border-radius: 4px;
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 1px;
          cursor: pointer;
          box-shadow: 0 0 12px rgba(255, 170, 0, 0.4);
        ">[ CLAIM 500 AC SWEEP ]</button>
      `;
    }

    return `
      <div id="contractsSweepBanner" style="
        padding: 12px 16px;
        border-radius: 6px;
        background: rgba(255, 170, 0, 0.08);
        border: 1px solid ${daily.sweepClaimable ? '#ffaa00' : 'rgba(255, 170, 0, 0.35)'};
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        justify-content: space-between;
        gap: 10px;
      ">
        <div style="flex: 1; min-width: 220px;">
          <div style="font-size: 12px; font-weight: 700; color: #ffcc55; letter-spacing: 1px;">
            DAILY SWEEP BONUS // 500 AC (${completed} / ${total})
          </div>
          <div style="margin-top: 6px; width: 100%; height: 6px; background: rgba(255, 170, 0, 0.15); border-radius: 3px; overflow: hidden;">
            <div style="width: ${pct}%; height: 100%; background: #ffaa00;"></div>
          </div>
        </div>
        <div>${actionHtml}</div>
      </div>
    `;
  }

  _renderDailyCard(slot) {
    const pct = Math.round((slot.progress / Math.max(1, slot.target)) * 100);
    const borderColor = slot.claimed
      ? 'rgba(0, 255, 136, 0.45)'
      : (slot.claimable ? '#ffaa00' : 'rgba(0, 243, 255, 0.3)');

    let actionHtml = `<span style="font-size: 11px; color: #7fa8b8; font-weight: 700;">ACTIVE</span>`;
    if (slot.claimed) {
      actionHtml = `<span style="font-size: 11px; color: #00ff88; font-weight: 700;">✓ CLAIMED</span>`;
    } else if (slot.claimable) {
      actionHtml = `
        <button type="button" class="contract-claim-btn" data-contract-type="daily" data-slot-index="${slot.slotIndex}" aria-label="Claim ${slot.title} reward" style="
          min-height: 30px;
          background: rgba(255, 170, 0, 0.24);
          border: 1px solid #ffaa00;
          color: #ffcc00;
          padding: 4px 12px;
          border-radius: 4px;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 1px;
          cursor: pointer;
        ">[ CLAIM ]</button>
      `;
    }

    return `
      <div class="contract-card contract-daily-card" data-slot-index="${slot.slotIndex}" style="
        padding: 14px;
        border-radius: 6px;
        background: rgba(0, 22, 38, 0.8);
        border: 1px solid ${borderColor};
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        gap: 10px;
      ">
        <div>
          <div style="display: flex; align-items: center; justify-content: space-between; gap: 6px;">
            <span style="font-size: 13px; font-weight: 700; color: #ffffff;">${slot.icon || '⚡'} ${slot.title}</span>
            <span style="
              font-size: 11px;
              font-weight: 700;
              color: #00f3ff;
              background: rgba(0, 243, 255, 0.14);
              border: 1px solid rgba(0, 243, 255, 0.4);
              padding: 2px 7px;
              border-radius: 4px;
            ">250 XP</span>
          </div>
          <div style="font-size: 12px; color: #9fc2d0; margin-top: 6px;">${slot.description}</div>
        </div>

        <div>
          <div style="display: flex; justify-content: space-between; font-size: 11px; color: #9fc2d0; margin-bottom: 4px;">
            <span>PROGRESS</span>
            <span>${slot.progress} / ${slot.target}</span>
          </div>
          <div style="width: 100%; height: 6px; background: rgba(0, 243, 255, 0.15); border-radius: 3px; overflow: hidden;">
            <div style="width: ${pct}%; height: 100%; background: ${slot.claimable ? '#ffaa00' : '#00f3ff'};"></div>
          </div>
          <div style="margin-top: 10px; display: flex; justify-content: flex-end;">
            ${actionHtml}
          </div>
        </div>
      </div>
    `;
  }

  _renderCareerLocked(career) {
    const u = career.unlockStatus;
    const lvOk = u.level >= u.requiredLevel;
    const waveOk = u.swarmWave >= u.requiredSwarmWave;

    return `
      <div id="contractsCareerLocked" style="
        padding: 18px;
        border-radius: 8px;
        background: rgba(24, 12, 36, 0.72);
        border: 1px solid rgba(189, 102, 255, 0.45);
        display: flex;
        flex-direction: column;
        gap: 10px;
      ">
        <div style="font-size: 14px; font-weight: 700; color: #d89eff; letter-spacing: 1px;">
          🔒 CAREER DECK LOCKED // CLEARANCE PREREQUISITES
        </div>
        <div style="font-size: 12px; color: #c4b5d6;">
          Satisfy both Federation milestones to unlock Tier 1 (Rookie) Career Contracts and Spark payouts:
        </div>
        <div style="display: flex; flex-wrap: wrap; gap: 14px; margin-top: 4px;">
          <div style="padding: 8px 12px; border-radius: 4px; background: rgba(0, 0, 0, 0.35); border: 1px solid ${lvOk ? '#00ff88' : 'rgba(255,255,255,0.2)'}; font-size: 12px;">
            ${lvOk ? '✓' : '○'} Player Level ${u.level} / ${u.requiredLevel}
          </div>
          <div style="padding: 8px 12px; border-radius: 4px; background: rgba(0, 0, 0, 0.35); border: 1px solid ${waveOk ? '#00ff88' : 'rgba(255,255,255,0.2)'}; font-size: 12px;">
            ${waveOk ? '✓' : '○'} Swarm Wave ${u.swarmWave} / ${u.requiredSwarmWave}
          </div>
        </div>
      </div>
    `;
  }

  _renderCareerUnlocked(career) {
    const gate = career.promotionGate;
    let gateHtml = `<span>APEX TIER REACHED — ENDLESS SHUFFLE-BAG ROTATION</span>`;
    let gatePct = 100;

    if (gate) {
      gatePct = Math.min(100, Math.round((career.tierCompletions / gate.requiredCompletions) * 100));
      gateHtml = `
        <span>PROMOTION TO TIER ${gate.nextTier}: ${career.tierCompletions} / ${gate.requiredCompletions} CONTRACTS • LV ${career.unlockStatus.level} / ${gate.requiredLevel}</span>
        ${career.awaitingLevelGate
          ? `<span style="color: #ffaa00; font-weight: 700;">QUOTA MET — REACH LV ${gate.requiredLevel} TO PROMOTE</span>`
          : ''}
      `;
    }

    const slotsHtml = (career.slots || [])
      .map((slot, idx) => (slot ? this._renderCareerCard(slot) : `<div class="contract-card">SLOT ${idx + 1} STANDING BY</div>`))
      .join('');

    return `
      <div id="contractsCareerHeader" style="
        padding: 12px 16px;
        border-radius: 6px;
        background: rgba(119, 0, 255, 0.12);
        border: 1px solid rgba(189, 102, 255, 0.45);
        display: flex;
        flex-direction: column;
        gap: 8px;
      ">
        <div style="display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 8px;">
          <span style="font-size: 13px; font-weight: 700; color: #e2b8ff; letter-spacing: 1px;">
            TIER ${career.tier}: ${career.tierName.toUpperCase()}
          </span>
          <span style="font-size: 11px; color: #ffaa00; font-weight: 700;">
            REWARD: ${career.tierReward.credits} AC + ${career.tierReward.sparks} SPARK${career.tierReward.sparks > 1 ? 'S' : ''} + ${career.tierReward.xp} XP
          </span>
        </div>
        <div style="display: flex; flex-wrap: wrap; justify-content: space-between; gap: 8px; font-size: 11px; color: #cbb6e6;">
          ${gateHtml}
        </div>
        <div style="width: 100%; height: 7px; background: rgba(189, 102, 255, 0.16); border-radius: 4px; overflow: hidden;">
          <div style="width: ${gatePct}%; height: 100%; background: linear-gradient(90deg, #bd66ff, #00f3ff);"></div>
        </div>
      </div>

      <div class="contracts-career-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 12px;">
        ${slotsHtml}
      </div>
    `;
  }

  _renderCareerCard(slot) {
    const pct = Math.round((slot.progress / Math.max(1, slot.target)) * 100);
    const focusLabel = slot.focusMeta?.label || slot.focus.toUpperCase();
    const borderColor = slot.claimable ? '#ffaa00' : 'rgba(189, 102, 255, 0.4)';

    const actionHtml = slot.claimable
      ? `
        <button type="button" class="contract-claim-btn" data-contract-type="career" data-slot-index="${slot.slotIndex}" aria-label="Claim ${slot.title} reward" style="
          min-height: 30px;
          background: rgba(255, 170, 0, 0.24);
          border: 1px solid #ffaa00;
          color: #ffcc00;
          padding: 4px 12px;
          border-radius: 4px;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 1px;
          cursor: pointer;
        ">[ CLAIM ]</button>
      `
      : `<span style="font-size: 11px; color: #b59fd4; font-weight: 700;">IN PROGRESS</span>`;

    return `
      <div class="contract-card contract-career-card" data-slot-index="${slot.slotIndex}" data-focus="${slot.focus}" style="
        padding: 14px;
        border-radius: 6px;
        background: rgba(18, 10, 32, 0.86);
        border: 1px solid ${borderColor};
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        gap: 10px;
      ">
        <div>
          <div style="display: flex; align-items: center; justify-content: space-between; gap: 6px;">
            <span style="font-size: 10px; font-weight: 700; letter-spacing: 1px; color: #d89eff; text-transform: uppercase;">
              ${slot.focusMeta?.icon || '◈'} ${focusLabel}
            </span>
            <span style="font-size: 10px; font-weight: 700; color: #00f3ff;">TIER ${slot.tier}</span>
          </div>
          <div style="font-size: 14px; font-weight: 700; color: #ffffff; margin-top: 6px;">${slot.title}</div>
          <div style="font-size: 12px; color: #b8a8d0; margin-top: 4px;">${slot.description}</div>
        </div>

        <div>
          <div style="font-size: 11px; color: #ffaa00; font-weight: 700; margin-bottom: 8px;">
            ${slot.reward.credits} AC • ${slot.reward.sparks} SPARK${slot.reward.sparks > 1 ? 'S' : ''} • ${slot.reward.xp} XP
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 11px; color: #c7b8de; margin-bottom: 4px;">
            <span>PROGRESS</span>
            <span>${slot.progress} / ${slot.target}</span>
          </div>
          <div style="width: 100%; height: 6px; background: rgba(189, 102, 255, 0.16); border-radius: 3px; overflow: hidden;">
            <div style="width: ${pct}%; height: 100%; background: ${slot.claimable ? '#ffaa00' : '#bd66ff'};"></div>
          </div>
          <div style="margin-top: 10px; display: flex; justify-content: flex-end;">
            ${actionHtml}
          </div>
        </div>
      </div>
    `;
  }

  bindEvents(el) {
    if (!el || typeof el.querySelector !== 'function') return;

    const closeBtn = el.querySelector('#contractsCloseBtn');
    if (closeBtn) {
      closeBtn.onclick = (e) => {
        if (e && typeof e.stopPropagation === 'function') e.stopPropagation();
        try { playTerminalKeySound(); } catch (_) {}
        this.hide();
      };
    }

    const returnBtn = el.querySelector('#contractsReturnBtn');
    if (returnBtn) {
      returnBtn.onclick = (e) => {
        if (e && typeof e.stopPropagation === 'function') e.stopPropagation();
        try { playTerminalKeySound(); } catch (_) {}
        this.hide();
      };
    }

    const sweepBtn = el.querySelector('#claimDailySweepBtn');
    if (sweepBtn) {
      sweepBtn.onclick = (e) => {
        if (e && typeof e.stopPropagation === 'function') e.stopPropagation();
        const res = this.contracts.claimDailySweep();
        if (res && res.success) {
          this.refresh();
        }
      };
    }

    if (typeof el.querySelectorAll === 'function') {
      const claimBtns = el.querySelectorAll('.contract-claim-btn');
      claimBtns.forEach((btn) => {
        btn.onclick = (e) => {
          if (e && typeof e.stopPropagation === 'function') e.stopPropagation();
          const type = btn.getAttribute('data-contract-type');
          const slotIndex = Number(btn.getAttribute('data-slot-index'));
          const res = type === 'daily'
            ? this.contracts.claimDailyContract(slotIndex)
            : this.contracts.claimCareerContract(slotIndex);
          if (res && res.success) {
            this.refresh();
          }
        };
      });
    }
  }
}

export const contractsModal = new ContractsModal();
