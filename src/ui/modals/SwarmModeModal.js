import { storageManager } from '../../core/storage/StorageManager.js';
import { setCursor } from '../../input/InputManager.js';
import { playEquipSound, playTerminalKeySound } from '../../audio/sfx.js';

export class SwarmModeModal {
  constructor(options = {}) {
    this.storage = options.storage || storageManager;
    this._containerId = 'swarmModeModal';
    this._onLaunch = options.onLaunch || null;
    this._onClose = options.onClose || null;
    this._keydownHandler = null;

    if (typeof window !== 'undefined') {
      window.__tronOpenSwarmModal = () => this.show();
      window.__tronCloseSwarmModal = () => this.hide();
    }
  }

  get container() {
    if (typeof document === 'undefined') return null;
    let el = document.getElementById(this._containerId);
    if (!el && typeof document.createElement === 'function') {
      el = document.createElement('div');
      el.id = this._containerId;
      el.className = 'modal-overlay swarm-mode-modal';
      el.style.display = 'none';
      el.style.position = 'fixed';
      el.style.inset = '0';
      el.style.zIndex = '1000';
      el.style.background = 'rgba(0, 10, 16, 0.88)';
      el.style.backdropFilter = 'blur(6px)';
      el.style.alignItems = 'center';
      el.style.justifyContent = 'center';
      if (document.body && typeof document.body.appendChild === 'function') {
        document.body.appendChild(el);
      }
    }
    return el;
  }

  isOpen() {
    const el = this.container;
    return Boolean(el && el.style && el.style.display !== 'none');
  }

  setOnLaunch(callback) {
    this._onLaunch = callback;
  }

  setOnClose(callback) {
    this._onClose = callback;
  }

  getHighestStandardWave() {
    if (!this.storage || typeof this.storage.get !== 'function') return 0;
    return Math.max(
      Number(this.storage.get('stats.swarmHighestWave', 0)) || 0,
      Number(this.storage.get('stats.swarmMaxWave', 0)) || 0,
      Number(this.storage.get('stats.highestWave', 0)) || 0
    );
  }

  isHardcoreUnlocked() {
    return this.getHighestStandardWave() >= 10;
  }

  show() {
    const el = this.container;
    if (!el) return;

    this.render();
    el.style.display = 'flex';
    setCursor(true);
    this._attachKeyListener();
  }

  hide(options = {}) {
    const el = this.container;
    if (el && el.style) {
      el.style.display = 'none';
    }
    this._detachKeyListener();

    if (!options.skipCloseCallback && typeof this._onClose === 'function') {
      this._onClose();
    }
    if (!options.skipFocusRestore && typeof document !== 'undefined') {
      const target = document.getElementById('swarmBtn') || document.getElementById('mainMenu');
      if (target && typeof target.focus === 'function') {
        target.focus();
      }
    }
  }

  launch(hardcore = false) {
    const isHardcore = Boolean(hardcore);
    if (isHardcore && !this.isHardcoreUnlocked()) {
      return false;
    }

    this.hide({ skipCloseCallback: true, skipFocusRestore: true });

    if (typeof this._onLaunch === 'function') {
      this._onLaunch({ hardcore: isHardcore });
      return true;
    }
    if (typeof window !== 'undefined' && typeof window.__tronStartSoloSwarm === 'function') {
      window.__tronStartSoloSwarm({ hardcore: isHardcore });
      return true;
    }
    return false;
  }

  _attachKeyListener() {
    if (typeof document === 'undefined' || typeof document.addEventListener !== 'function') return;
    this._detachKeyListener();
    this._keydownHandler = (e) => {
      if (e && e.key === 'Escape' && this.isOpen()) {
        if (typeof e.preventDefault === 'function') e.preventDefault();
        if (typeof e.stopPropagation === 'function') e.stopPropagation();
        this.hide();
      }
    };
    document.addEventListener('keydown', this._keydownHandler);
  }

  _detachKeyListener() {
    if (typeof document === 'undefined' || typeof document.removeEventListener !== 'function') return;
    if (this._keydownHandler) {
      document.removeEventListener('keydown', this._keydownHandler);
      this._keydownHandler = null;
    }
  }

  render() {
    const el = this.container;
    if (!el) return;

    const highestWave = this.getHighestStandardWave();
    const unlocked = highestWave >= 10;

    el.innerHTML = `
      <div class="card swarm-mode-card" style="max-width:680px; width:92%; text-align:left; padding:24px 28px; border:1px solid rgba(255,123,26,0.65); box-shadow:0 0 38px rgba(255,123,26,0.22), inset 0 0 20px rgba(79,242,255,0.06); background:linear-gradient(135deg, rgba(8, 16, 28, 0.97), rgba(4, 8, 16, 0.95)); color:var(--cyan); border-radius:8px; max-height:90vh; display:flex; flex-direction:column;">
        <!-- Header -->
        <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid rgba(79,242,255,0.28); padding-bottom:12px; margin-bottom:18px;">
          <div>
            <div style="font-size:18px; letter-spacing:4px; font-weight:bold; color:#fff; text-transform:uppercase;">SWARM PROTOCOL</div>
            <div style="font-size:10px; letter-spacing:2px; color:rgba(255,159,77,0.85); margin-top:2px;">ARCFIELD DEPLOYMENT // SELECT COMBAT INTENSITY</div>
          </div>
          <button id="closeSwarmModeX" class="btn" style="padding:4px 10px; font-size:14px; min-width:32px; border-color:rgba(79,242,255,0.4); cursor:pointer;" aria-label="Close Swarm Protocol">✕</button>
        </div>

        <!-- Variant Cards -->
        <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(240px, 1fr)); gap:16px; margin-bottom:18px;">
          <!-- Standard Card -->
          <div id="swarmStandardCard" style="display:flex; flex-direction:column; justify-content:space-between; padding:18px; border:1px solid rgba(79,242,255,0.55); border-radius:6px; background:rgba(0, 22, 34, 0.72); box-shadow:inset 0 0 14px rgba(79,242,255,0.08);">
            <div>
              <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
                <span style="font-size:16px; font-weight:bold; letter-spacing:3px; color:#fff;">STANDARD</span>
                <span style="font-size:10px; letter-spacing:1.2px; padding:3px 7px; border-radius:3px; background:rgba(79,242,255,0.16); border:1px solid rgba(79,242,255,0.5); color:var(--cyan); font-weight:bold;">ARC CREDITS + XP</span>
              </div>
              <div style="font-size:11px; letter-spacing:1px; color:rgba(191,244,251,0.75); margin-bottom:10px;">BASELINE LVL 1 // ENDLESS WAVE ESCALATION</div>
              <p style="font-size:12px; line-height:1.5; color:#bff4fb; margin:0 0 16px;">
                Deploy into standard Arcfield wave combat. Earn Arc Credits and XP on every wave cleared. Clear Wave 10 to unlock Hardcore Protocol.
              </p>
            </div>
            <button id="btnLaunchSwarmStandard" class="mode-btn swarm-standard-btn" data-hardcore="false" style="width:100%; min-height:44px; padding:10px 14px; font-size:12px; letter-spacing:2px; font-weight:bold; cursor:pointer; background:rgba(79,242,255,0.16); border:1px solid var(--cyan); color:#fff; border-radius:4px;">
              DEPLOY STANDARD
            </button>
          </div>

          <!-- Hardcore Card -->
          <div id="swarmHardcoreCard" class="${unlocked ? '' : 'locked'}" style="display:flex; flex-direction:column; justify-content:space-between; padding:18px; border:1px solid ${unlocked ? 'rgba(255,123,26,0.75)' : 'rgba(255,255,255,0.18)'}; border-radius:6px; background:${unlocked ? 'rgba(30, 12, 4, 0.72)' : 'rgba(12, 16, 22, 0.72)'}; box-shadow:${unlocked ? 'inset 0 0 16px rgba(255,123,26,0.12)' : 'none'}; opacity:${unlocked ? '1' : '0.78'};">
            <div>
              <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
                <span style="font-size:16px; font-weight:bold; letter-spacing:3px; color:${unlocked ? '#ff9f4d' : 'rgba(255,255,255,0.7)'};">HARDCORE</span>
                <span style="font-size:10px; letter-spacing:1.2px; padding:3px 7px; border-radius:3px; background:rgba(255,123,26,0.18); border:1px solid rgba(255,123,26,0.55); color:#ff9f4d; font-weight:bold;">SPARKS + XP</span>
              </div>
              <div style="font-size:11px; letter-spacing:1px; color:${unlocked ? 'rgba(255,190,140,0.85)' : 'rgba(255,150,120,0.85)'}; margin-bottom:10px;">
                ${unlocked ? 'BASELINE LVL 5+ // DYNAMIC DIRECTOR' : `LOCKED // CLEAR WAVE 10 IN STANDARD (${highestWave}/10)`}
              </div>
              <p style="font-size:12px; line-height:1.5; color:${unlocked ? '#ffe0cc' : 'rgba(220,230,240,0.72)'}; margin:0 0 16px;">
                ${unlocked
                  ? 'Deploy at Level 5 intensity against the Dynamic Director counter-play engine. Earn rare Sparks milestones and bonus XP.'
                  : 'Reach and clear Wave 10 in Standard Swarm Protocol to unlock Hardcore deployment and Sparks milestone rewards.'}
              </p>
            </div>
            <button id="btnLaunchSwarmHardcore" class="mode-btn swarm-hardcore-btn ${unlocked ? '' : 'locked'}" data-hardcore="true" ${unlocked ? '' : 'disabled aria-disabled="true"'} style="width:100%; min-height:44px; padding:10px 14px; font-size:12px; letter-spacing:2px; font-weight:bold; cursor:${unlocked ? 'pointer' : 'not-allowed'}; background:${unlocked ? 'rgba(255,123,26,0.24)' : 'rgba(255,255,255,0.06)'}; border:1px solid ${unlocked ? 'var(--orange)' : 'rgba(255,255,255,0.22)'}; color:${unlocked ? '#ffb370' : 'rgba(255,255,255,0.45)'}; border-radius:4px;">
              ${unlocked ? 'DEPLOY HARDCORE' : 'LOCKED (WAVE 10 REQUIRED)'}
            </button>
          </div>
        </div>

        <!-- Footer -->
        <div style="display:flex; justify-content:flex-end; border-top:1px solid rgba(79,242,255,0.25); padding-top:12px;">
          <button id="closeSwarmModeBtn" class="btn" style="padding:8px 22px; font-size:12px; letter-spacing:2px; cursor:pointer;">
            CANCEL
          </button>
        </div>
      </div>
    `;

    this._bindEvents();
  }

  _bindEvents() {
    const el = this.container;
    if (!el) return;

    const closeBtn = el.querySelector('#closeSwarmModeBtn');
    if (closeBtn) closeBtn.onclick = () => this.hide();

    const closeX = el.querySelector('#closeSwarmModeX');
    if (closeX) closeX.onclick = () => this.hide();

    // Backdrop click to dismiss
    el.onclick = (e) => {
      if (e.target === el) {
        this.hide();
      }
    };

    const btnStandard = el.querySelector('#btnLaunchSwarmStandard');
    if (btnStandard) {
      btnStandard.onmouseenter = () => { try { playTerminalKeySound(); } catch (_) {} };
      btnStandard.onclick = (e) => {
        if (e && typeof e.stopPropagation === 'function') e.stopPropagation();
        try { playEquipSound(); } catch (_) {}
        this.launch(false);
      };
    }

    const btnHardcore = el.querySelector('#btnLaunchSwarmHardcore');
    if (btnHardcore) {
      btnHardcore.onmouseenter = () => { try { playTerminalKeySound(); } catch (_) {} };
      btnHardcore.onclick = (e) => {
        if (e && typeof e.stopPropagation === 'function') e.stopPropagation();
        if (!this.isHardcoreUnlocked()) return;
        try { playEquipSound(); } catch (_) {}
        this.launch(true);
      };
    }
  }
}

export const swarmModeModal = new SwarmModeModal();
