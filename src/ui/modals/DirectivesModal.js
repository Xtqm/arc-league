import { state } from '../../core/state.js';
import { setCursor } from '../../input/InputManager.js';

export class DirectivesModal {
  constructor() {
    this._containerId = 'directivesModal';
    this._activeTab = 'desktop';
    this._onClose = null;

    if (typeof window !== 'undefined') {
      window.__tronOpenDirectives = (tab) => this.show(tab);
      window.__tronCloseDirectives = () => this.hide();
      window.__tronToggleDirectives = (tab) => this.toggle(tab);
    }
  }

  get container() {
    if (typeof document === 'undefined') return null;
    let el = document.getElementById(this._containerId);
    if (!el && typeof document.createElement === 'function') {
      el = document.createElement('div');
      el.id = this._containerId;
      el.className = 'modal-overlay directives-modal';
      el.style.display = 'none';
      el.style.position = 'fixed';
      el.style.inset = '0';
      el.style.zIndex = '1000';
      el.style.background = 'rgba(0, 10, 16, 0.88)';
      el.style.backdropFilter = 'blur(6px)';
      el.style.alignItems = 'center';
      el.style.justifyContent = 'center';
      if (document.body && typeof document.body.appendChild === 'function') document.body.appendChild(el);
    }
    return el;
  }

  isOpen() {
    const el = this.container;
    return Boolean(el && el.style && el.style.display !== 'none');
  }

  setOnClose(callback) {
    this._onClose = callback;
  }

  toggle(tab) {
    if (this.isOpen()) {
      this.hide();
    } else {
      this.show(tab);
    }
  }

  show(tab = null) {
    const el = this.container;
    if (!el) return;

    if (tab) {
      this._activeTab = tab;
    } else {
      this._activeTab = state.isTouchDevice ? 'mobile' : 'desktop';
    }

    this.render();
    el.style.display = 'flex';
    setCursor(true);
  }

  hide() {
    const el = this.container;
    if (el && el.style) {
      el.style.display = 'none';
    }
    if (typeof this._onClose === 'function') {
      this._onClose();
    }
    if (typeof document !== 'undefined') {
      const rail = document.getElementById('mainMenu') || document.getElementById('directivesBtn');
      if (rail && typeof rail.focus === 'function') {
        rail.focus();
      }
    }
  }

  render() {
    const el = this.container;
    if (!el) return;

    const isDesktop = this._activeTab === 'desktop';

    el.innerHTML = `
      <div class="card directives-card" style="max-width:620px; width:92%; text-align:left; padding:24px 28px; border:1px solid rgba(79,242,255,0.6); box-shadow:0 0 35px rgba(79,242,255,0.25); background:linear-gradient(135deg, rgba(8, 16, 28, 0.96), rgba(4, 8, 16, 0.94)); color:var(--cyan); border-radius:8px; max-height:88vh; display:flex; flex-direction:column;">
        <!-- Header -->
        <div class="directives-header" style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid rgba(79,242,255,0.3); padding-bottom:12px; margin-bottom:16px;">
          <div>
            <div style="font-size:18px; letter-spacing:4px; font-weight:bold; color:#fff; text-transform:uppercase;">DIRECTIVES &amp; CONTROLS</div>
            <div style="font-size:10px; letter-spacing:2px; color:rgba(79,242,255,0.6); margin-top:2px;">TACTICAL INPUT SYSTEM // ARC LEAGUE SPEC</div>
          </div>
          <button id="closeDirectivesX" class="btn" style="padding:4px 10px; font-size:14px; min-width:32px; border-color:rgba(79,242,255,0.4); cursor:pointer;" aria-label="Close Directives">✕</button>
        </div>

        <!-- Scheme Switcher Tabs -->
        <div style="display:flex; gap:8px; margin-bottom:18px; border-bottom:1px solid rgba(79,242,255,0.15); padding-bottom:10px;">
          <button id="tabDesktopDirectives" class="btn ${isDesktop ? 'hot active' : ''}" style="flex:1; padding:6px 12px; font-size:11px; letter-spacing:2px; cursor:pointer;">
            DESKTOP [KEYBOARD &amp; MOUSE]
          </button>
          <button id="tabMobileDirectives" class="btn ${!isDesktop ? 'hot active' : ''}" style="flex:1; padding:6px 12px; font-size:11px; letter-spacing:2px; cursor:pointer;">
            MOBILE [TOUCH GESTURES]
          </button>
        </div>

        <!-- Content Area -->
        <div class="directives-body" style="overflow-y:auto; flex:1; padding-right:6px;">
          <!-- Desktop Controls Panel -->
          <div id="desktopDirectivesPanel" style="display:${isDesktop ? 'block' : 'none'};">
            <div style="display:grid; grid-template-columns:auto 1fr; gap:10px 18px; align-items:center; font-size:12px;">
              <span style="background:rgba(79,242,255,0.15); border:1px solid var(--cyan); color:#fff; padding:3px 8px; border-radius:4px; font-weight:bold; letter-spacing:1px; text-align:center;">W A S D</span>
              <span style="color:#bff4fb;">Locomotion // Sprint and strafe across the arena floor</span>

              <span style="background:rgba(79,242,255,0.15); border:1px solid var(--cyan); color:#fff; padding:3px 8px; border-radius:4px; font-weight:bold; letter-spacing:1px; text-align:center;">MOUSE</span>
              <span style="color:#bff4fb;">Camera Aim // Direct crosshair tracking and target elevation</span>

              <span style="background:rgba(79,242,255,0.15); border:1px solid var(--cyan); color:#fff; padding:3px 8px; border-radius:4px; font-weight:bold; letter-spacing:1px; text-align:center;">LEFT CLICK</span>
              <span style="color:#bff4fb;">Throw Kinetic Disc // Hold to charge impulse velocity</span>

              <span style="background:rgba(79,242,255,0.15); border:1px solid var(--cyan); color:#fff; padding:3px 8px; border-radius:4px; font-weight:bold; letter-spacing:1px; text-align:center;">RIGHT CLICK</span>
              <span style="color:#bff4fb;">Raise Energy Shield // Deflect incoming kinetic projectiles</span>

              <span style="background:rgba(79,242,255,0.15); border:1px solid var(--cyan); color:#fff; padding:3px 8px; border-radius:4px; font-weight:bold; letter-spacing:1px; text-align:center;">Q / E</span>
              <span style="color:#bff4fb;">Curve Spin // Apply hook spin around pillars &amp; defensive walls</span>

              <span style="background:rgba(79,242,255,0.15); border:1px solid var(--cyan); color:#fff; padding:3px 8px; border-radius:4px; font-weight:bold; letter-spacing:1px; text-align:center;">SPACE</span>
              <span style="color:#bff4fb;">Vertical Jump // Tap twice for mid-air thruster boost</span>

              <span style="background:rgba(79,242,255,0.15); border:1px solid var(--cyan); color:#fff; padding:3px 8px; border-radius:4px; font-weight:bold; letter-spacing:1px; text-align:center;">SHIFT</span>
              <span style="color:#bff4fb;">Dash Impulse // Instant directional boost (consumes energy)</span>

              <span style="background:rgba(79,242,255,0.15); border:1px solid var(--cyan); color:#fff; padding:3px 8px; border-radius:4px; font-weight:bold; letter-spacing:1px; text-align:center;">T</span>
              <span style="color:#bff4fb;">Cinematic Slow-Mo // Tactical bullet-time (Circuit &amp; Survival)</span>

              <span style="background:rgba(79,242,255,0.15); border:1px solid var(--cyan); color:#fff; padding:3px 8px; border-radius:4px; font-weight:bold; letter-spacing:1px; text-align:center;">P / ESC</span>
              <span style="color:#bff4fb;">Pause Simulation // Release cursor and access pause menu</span>

              <span style="background:rgba(79,242,255,0.15); border:1px solid var(--cyan); color:#fff; padding:3px 8px; border-radius:4px; font-weight:bold; letter-spacing:1px; text-align:center;">?</span>
              <span style="color:#bff4fb;">Directives // Toggle this tactical keybinding matrix</span>
            </div>
          </div>

          <!-- Mobile Controls Panel -->
          <div id="mobileDirectivesPanel" style="display:${!isDesktop ? 'block' : 'none'};">
            <div style="display:grid; grid-template-columns:auto 1fr; gap:10px 18px; align-items:center; font-size:12px;">
              <span style="background:rgba(255,123,26,0.18); border:1px solid var(--orange); color:#ff9f4d; padding:3px 8px; border-radius:4px; font-weight:bold; letter-spacing:1px; text-align:center;">LEFT ZONE</span>
              <span style="color:#ffe0cc;">Virtual Joystick // Drag anywhere on left side to move &amp; strafe</span>

              <span style="background:rgba(255,123,26,0.18); border:1px solid var(--orange); color:#ff9f4d; padding:3px 8px; border-radius:4px; font-weight:bold; letter-spacing:1px; text-align:center;">RIGHT ZONE</span>
              <span style="color:#ffe0cc;">Touch Look // Swipe anywhere on right side to turn &amp; aim crosshair</span>

              <span style="background:rgba(255,123,26,0.18); border:1px solid var(--orange); color:#ff9f4d; padding:3px 8px; border-radius:4px; font-weight:bold; letter-spacing:1px; text-align:center;">THROW</span>
              <span style="color:#ffe0cc;">Tap Throw button to launch disc; hold to aim &amp; charge velocity</span>

              <span style="background:rgba(255,123,26,0.18); border:1px solid var(--orange); color:#ff9f4d; padding:3px 8px; border-radius:4px; font-weight:bold; letter-spacing:1px; text-align:center;">SHIELD</span>
              <span style="color:#ffe0cc;">Tap/Hold Shield button to raise barrier and parry enemy discs</span>

              <span style="background:rgba(255,123,26,0.18); border:1px solid var(--orange); color:#ff9f4d; padding:3px 8px; border-radius:4px; font-weight:bold; letter-spacing:1px; text-align:center;">L / R</span>
              <span style="color:#ffe0cc;">Curve Spin // Tap L or R button to curve trajectory around pillars</span>

              <span style="background:rgba(255,123,26,0.18); border:1px solid var(--orange); color:#ff9f4d; padding:3px 8px; border-radius:4px; font-weight:bold; letter-spacing:1px; text-align:center;">JUMP</span>
              <span style="color:#ffe0cc;">Tap Jump button for vertical elevation; double tap for air-boost</span>

              <span style="background:rgba(255,123,26,0.18); border:1px solid var(--orange); color:#ff9f4d; padding:3px 8px; border-radius:4px; font-weight:bold; letter-spacing:1px; text-align:center;">DASH</span>
              <span style="color:#ffe0cc;">Instant directional sprint escape (consumes energy reserves)</span>

              <span style="background:rgba(255,123,26,0.18); border:1px solid var(--orange); color:#ff9f4d; padding:3px 8px; border-radius:4px; font-weight:bold; letter-spacing:1px; text-align:center;">II PAUSE</span>
              <span style="color:#ffe0cc;">Tap top-right pause indicator to freeze simulation</span>
            </div>
          </div>
        </div>

        <!-- Footer -->
        <div style="display:flex; justify-content:flex-end; border-top:1px solid rgba(79,242,255,0.3); padding-top:14px; margin-top:16px;">
          <button id="closeDirectivesBtn" class="btn" style="padding:8px 24px; font-size:12px; letter-spacing:2px; cursor:pointer;">
            RETURN TO MENU
          </button>
        </div>
      </div>
    `;

    this._bindEvents();
  }

  _bindEvents() {
    const el = this.container;
    if (!el) return;

    const closeBtn = el.querySelector('#closeDirectivesBtn');
    if (closeBtn) closeBtn.onclick = () => this.hide();

    const closeX = el.querySelector('#closeDirectivesX');
    if (closeX) closeX.onclick = () => this.hide();

    // Click outside modal card to dismiss
    el.onclick = (e) => {
      if (e.target === el) {
        this.hide();
      }
    };

    // Tab switcher events
    const tabDesktop = el.querySelector('#tabDesktopDirectives');
    const tabMobile = el.querySelector('#tabMobileDirectives');
    const panelDesktop = el.querySelector('#desktopDirectivesPanel');
    const panelMobile = el.querySelector('#mobileDirectivesPanel');

    if (tabDesktop) {
      tabDesktop.onclick = () => {
        this._activeTab = 'desktop';
        if (panelDesktop) panelDesktop.style.display = 'block';
        if (panelMobile) panelMobile.style.display = 'none';
        tabDesktop.classList.add('hot', 'active');
        if (tabMobile) tabMobile.classList.remove('hot', 'active');
      };
    }

    if (tabMobile) {
      tabMobile.onclick = () => {
        this._activeTab = 'mobile';
        if (panelDesktop) panelDesktop.style.display = 'none';
        if (panelMobile) panelMobile.style.display = 'block';
        tabMobile.classList.add('hot', 'active');
        if (tabDesktop) tabDesktop.classList.remove('hot', 'active');
      };
    }
  }
}

export const directivesModal = new DirectivesModal();
