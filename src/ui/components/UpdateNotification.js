/**
 * UpdateNotification.js
 * Non-Intrusive Desktop Auto-Update Notification Banner & Lobby Toast
 * for ARC LEAGUE desktop shell (electron-updater / GitHub Releases).
 *
 * Listens to update lifecycle events bridged over IPC by desktop/preload.cjs
 * and surfaces a subtle bottom-right banner once an update is staged for the
 * next restart. Never blocks combat inputs: the container is pointer-events:
 * none and the canvas keeps rendering underneath.
 */

const CONTAINER_ID = 'desktopUpdateContainer';
const AVAILABLE_TOAST_CLASS = 'tron-update-toast';
const READY_BANNER_CLASS = 'tron-update-banner';
const AVAILABLE_DISPLAY_MS = 5200;

export class UpdateNotification {
  /**
   * @param {object} [options]
   * @param {HTMLElement} [options.container] Fixed corner container override
   * @param {object} [options.desktopBridge] window.electronDesktop override (testing)
   */
  constructor(options = {}) {
    this._container = options.container || null;
    this._desktopBridge = options.desktopBridge !== undefined
      ? options.desktopBridge
      : (typeof window !== 'undefined' ? window.electronDesktop : null);
    this._initialized = false;
    this.bannerEl = null;
    this.toastEl = null;
    this._toastTimeout = null;
  }

  get container() {
    if (this._container) return this._container;
    if (typeof document === 'undefined') return null;

    let el = document.getElementById(CONTAINER_ID);
    if (!el) {
      el = document.createElement('div');
      el.id = CONTAINER_ID;
      // Bottom-right corner: clear of the center crosshair, top HUD bars and
      // achievement toasts (top-center). Container never intercepts input.
      el.style.cssText = `
        position: fixed;
        bottom: 24px;
        right: 24px;
        z-index: 9998;
        pointer-events: none;
        max-width: 320px;
      `;
      document.body.appendChild(el);
    }
    return el;
  }

  /**
   * Subscribes to desktop IPC update channels. Idempotent and a safe no-op on
   * web/browser builds where no electronDesktop bridge exists.
   * @returns {UpdateNotification}
   */
  init() {
    if (this._initialized) return this;
    const desktop = this._desktopBridge;
    if (!desktop || !desktop.isDesktop) return this;
    if (typeof desktop.onUpdateAvailable !== 'function' ||
        typeof desktop.onUpdateDownloaded !== 'function') {
      return this;
    }

    this._initialized = true;
    try {
      desktop.onUpdateAvailable((info) => this.showAvailable(info));
      desktop.onUpdateDownloaded((info) => this.showReady(info));
    } catch (err) {
      console.warn('[UpdateNotification] Failed to subscribe to update channels:', err);
    }
    return this;
  }

  /**
   * Transient toast: an update was found and is downloading in the background.
   * Purely informational, dismisses itself, never steals focus or input.
   * @param {object} [info] { version }
   */
  showAvailable(info = {}) {
    const parent = this.container;
    if (!parent) return;

    const version = info.version || 'a new version';
    this._clearToast();

    const toast = document.createElement('div');
    toast.className = AVAILABLE_TOAST_CLASS;
    toast.style.cssText = `
      position: relative;
      background: rgba(0, 14, 26, 0.92);
      border: 1px solid #00f3ff;
      border-radius: 6px;
      padding: 10px 14px;
      box-shadow: 0 0 16px rgba(0, 243, 255, 0.35);
      backdrop-filter: blur(8px);
      pointer-events: none;
      opacity: 0;
      transform: translateY(14px);
      transition: transform 0.3s ease, opacity 0.3s ease;
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    `;
    toast.innerHTML = `
      <div style="font-size:10px; color:#00f3ff; letter-spacing:1.5px; font-weight:bold; text-transform:uppercase; margin-bottom:2px;">
        [ SYSTEM UPDATE // DOWNLOADING ]
      </div>
      <div style="font-size:13px; color:#d9fbff; letter-spacing:0.4px;">
        Version ${version} found — downloading in background.
      </div>
    `;

    parent.appendChild(toast);
    this.toastEl = toast;

    requestAnimationFrame(() => {
      toast.style.transform = 'translateY(0)';
      toast.style.opacity = '1';
    });

    this._toastTimeout = setTimeout(() => {
      this._clearToast();
    }, AVAILABLE_DISPLAY_MS);
  }

  /**
   * Persistent banner: verified update is staged for the next restart.
   * Offers an explicit "Restart & Update" action (quitAndInstall) plus dismiss.
   * @param {object} [info] { version }
   */
  showReady(info = {}) {
    const parent = this.container;
    if (!parent) return;

    const version = info.version || '';
    this._clearToast();
    if (this.bannerEl && this.bannerEl.parentNode) {
      this._dismissBanner();
    }

    const banner = document.createElement('div');
    banner.className = READY_BANNER_CLASS;
    banner.style.cssText = `
      position: relative;
      background: rgba(0, 14, 26, 0.94);
      border: 1px solid #00f3ff;
      border-radius: 6px;
      padding: 12px 14px;
      box-shadow: 0 0 20px rgba(0, 243, 255, 0.4), inset 0 0 10px rgba(0, 243, 255, 0.15);
      backdrop-filter: blur(8px);
      pointer-events: auto;
      opacity: 0;
      transform: translateY(14px);
      transition: transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275), opacity 0.3s ease;
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    `;
    banner.innerHTML = `
      <div style="font-size:10px; color:#00f3ff; letter-spacing:1.5px; font-weight:bold; text-transform:uppercase; margin-bottom:3px;">
        [ SYSTEM UPDATE // READY ]
      </div>
      <div style="font-size:13px; color:#d9fbff; letter-spacing:0.4px; margin-bottom:9px;">
        Version ${version || 'new'} is installed and ready. It applies on your next restart.
      </div>
      <div style="display:flex; gap:8px;">
        <button data-action="restart" style="
          flex:1; cursor:pointer; background:rgba(0,243,255,0.14); border:1px solid #00f3ff; color:#00f3ff;
          border-radius:4px; padding:7px 10px; font-size:11px; font-weight:bold; letter-spacing:1px; text-transform:uppercase;
        ">RESTART &amp; UPDATE</button>
        <button data-action="later" style="
          cursor:pointer; background:transparent; border:1px solid rgba(0,243,255,0.35); color:rgba(217,251,255,0.75);
          border-radius:4px; padding:7px 10px; font-size:11px; letter-spacing:1px; text-transform:uppercase;
        ">LATER</button>
      </div>
    `;

    const restartBtn = banner.querySelector('button[data-action="restart"]');
    const laterBtn = banner.querySelector('button[data-action="later"]');
    if (restartBtn) restartBtn.onclick = () => this._triggerInstall();
    if (laterBtn) laterBtn.onclick = () => this._dismissBanner();

    parent.appendChild(banner);
    this.bannerEl = banner;

    requestAnimationFrame(() => {
      banner.style.transform = 'translateY(0)';
      banner.style.opacity = '1';
    });
  }

  /**
   * Removes any banner or toast currently on screen.
   */
  dismiss() {
    this._clearToast();
    this._dismissBanner();
  }

  _triggerInstall() {
    const desktop = this._desktopBridge;
    if (desktop && typeof desktop.installUpdate === 'function') {
      try {
        desktop.installUpdate();
      } catch (err) {
        console.warn('[UpdateNotification] Failed to trigger update install:', err);
      }
    }
  }

  _clearToast() {
    if (this._toastTimeout) {
      clearTimeout(this._toastTimeout);
      this._toastTimeout = null;
    }
    if (this.toastEl && this.toastEl.parentNode) {
      this.toastEl.parentNode.removeChild(this.toastEl);
    }
    this.toastEl = null;
  }

  _dismissBanner() {
    if (!this.bannerEl) return;
    if (this.bannerEl.parentNode) {
      this.bannerEl.parentNode.removeChild(this.bannerEl);
    }
    this.bannerEl = null;
  }
}

export const updateNotification = new UpdateNotification();
