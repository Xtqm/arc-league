/**
 * update_notification.test.js
 * Unit test suite for the desktop auto-update notification banner
 * (desktop-shell auto-update: event reception, display, non-obstruction).
 */

import assert from 'assert';
import { UpdateNotification } from '../../src/ui/components/UpdateNotification.js';

console.log('--- Running Update Notification Test Suite (desktop-shell auto-update) ---');

// Mock DOM container and elements
class MockElement {
  constructor(tag = 'div') {
    this.tagName = tag.toUpperCase();
    this.style = {};
    this.children = [];
    this.parentNode = null;
    this.className = '';
    this.innerHTML = '';
    this.onclick = null;
    this._mockButtons = {};
  }
  appendChild(child) {
    this.children.push(child);
    child.parentNode = this;
    return child;
  }
  removeChild(child) {
    const idx = this.children.indexOf(child);
    if (idx !== -1) {
      this.children.splice(idx, 1);
      child.parentNode = null;
    }
    return child;
  }
  // Minimal stub: supports button[data-action="restart"|"later"]
  querySelector(selector) {
    const match = /data-action="(restart|later)"/.exec(selector);
    if (!match) return null;
    if (!this._mockButtons[match[1]]) {
      this._mockButtons[match[1]] = new MockElement('button');
    }
    return this._mockButtons[match[1]];
  }
}

// Mock globals if running in headless node
const originalDoc = global.document;
const originalRAF = global.requestAnimationFrame;

const mockDom = { byId: {} };
const mockBody = new MockElement('body');
const mockBodyAppend = mockBody.appendChild.bind(mockBody);
mockBody.appendChild = (child) => {
  if (child.id) mockDom.byId[child.id] = child;
  return mockBodyAppend(child);
};

global.document = {
  createElement: (tag) => new MockElement(tag),
  getElementById: (id) => mockDom.byId[id] || null,
  body: mockBody
};
global.requestAnimationFrame = (fn) => setTimeout(fn, 1);

try {
  // =========================================================================
  // Test Group 1: Web Build Safety & Idempotent Subscription
  // =========================================================================
  console.log('\n[Group 1] Testing web-build no-op and idempotent init...');

  const webBuild = new UpdateNotification({ desktopBridge: null });
  webBuild.init();
  webBuild.init(); // double call must stay harmless
  assert.strictEqual(webBuild.bannerEl, null, 'No banner may render without desktop bridge');
  assert.strictEqual(webBuild.container.children.length, 0, 'No DOM output without desktop bridge');

  const listeners = { available: 0, downloaded: 0 };
  let installsTriggered = 0;
  const bridge = {
    isDesktop: true,
    onUpdateAvailable: (cb) => { listeners.available++; bridge._availableCb = cb; },
    onUpdateDownloaded: (cb) => { listeners.downloaded++; bridge._downloadedCb = cb; },
    installUpdate: () => { installsTriggered++; }
  };

  const notify = new UpdateNotification({ desktopBridge: bridge });
  notify.init();
  notify.init(); // idempotent: must not double-subscribe
  assert.strictEqual(listeners.available, 1, 'onUpdateAvailable subscribed exactly once');
  assert.strictEqual(listeners.downloaded, 1, 'onUpdateDownloaded subscribed exactly once');

  console.log('✓ Group 1: Web-build no-op + single subscription verified.');

  // =========================================================================
  // Test Group 2: Update Available Event Reception (Transient Toast)
  // =========================================================================
  console.log('\n[Group 2] Testing update-available event reception & toast display...');

  bridge._availableCb({ version: '1.0.2' });

  assert.strictEqual(notify.container.children.length, 1, 'Transient toast must be appended');
  const toastEl = notify.container.children[0];
  assert.strictEqual(toastEl.className, 'tron-update-toast');
  assert.ok(toastEl.innerHTML.includes('1.0.2'), 'Toast must display the incoming version');
  assert.ok(toastEl.innerHTML.includes('downloading in background'), 'Toast must communicate background download');
  assert.ok(
    toastEl.style.cssText.includes('pointer-events: none'),
    'Transient toast must never intercept combat inputs'
  );

  console.log('✓ Group 2: Update-available reception and non-blocking toast verified.');

  // =========================================================================
  // Test Group 3: Update Downloaded Event Reception (Ready Banner)
  // =========================================================================
  console.log('\n[Group 3] Testing update-downloaded reception & ready banner...');

  bridge._downloadedCb({ version: '1.0.2' });

  assert.strictEqual(notify.bannerEl, notify.container.children[0], 'Ready banner must be appended');
  const bannerEl = notify.bannerEl;
  assert.strictEqual(bannerEl.className, 'tron-update-banner');
  assert.ok(bannerEl.innerHTML.includes('1.0.2'), 'Banner must display the staged version');
  assert.ok(bannerEl.innerHTML.includes('next restart'), 'Banner must explain install-on-restart behavior');
  assert.ok(bannerEl.innerHTML.includes('RESTART'), 'Banner must offer explicit restart action');

  // Explicit install trigger through IPC bridge
  bannerEl.querySelector('button[data-action="restart"]').onclick();
  assert.strictEqual(installsTriggered, 1, 'Restart button must trigger installUpdate over IPC');

  // Dismiss action removes the banner
  bannerEl.querySelector('button[data-action="later"]').onclick();
  assert.strictEqual(notify.bannerEl, null, 'Later button must dismiss the banner');

  console.log('✓ Group 3: Update-downloaded reception, install trigger, and dismissal verified.');

  // =========================================================================
  // Test Group 4: Non-Obstruction of Combat Controls & Canvas Rendering
  // =========================================================================
  console.log('\n[Group 4] Testing corner placement and input passthrough...');

  const containerCss = notify.container.style.cssText;
  assert.ok(containerCss.includes('position: fixed'), 'Container must be fixed-position overlay');
  assert.ok(containerCss.includes('bottom: 24px'), 'Container must sit in the bottom corner');
  assert.ok(containerCss.includes('right: 24px'), 'Container must sit in the right corner (clear of crosshair)');
  assert.ok(
    containerCss.includes('pointer-events: none'),
    'Container must never intercept gameplay mouse input'
  );
  assert.ok(containerCss.includes('z-index: 9998'), 'Banner layer must stay below HUD/toast overlays');

  const readyBanner = new UpdateNotification({ desktopBridge: bridge });
  readyBanner.init();
  bridge._downloadedCb({ version: '2.0.0' });
  assert.ok(
    readyBanner.bannerEl.style.cssText.includes('pointer-events: auto'),
    'Only the banner itself may accept clicks (action buttons)'
  );

  console.log('✓ Group 4: Bottom-right corner placement and canvas input passthrough verified.');

  console.log('\n======================================================');
  console.log('ALL UPDATE NOTIFICATION TESTS PASSED CLEANLY (100%)');
  console.log('======================================================');
} finally {
  // Restore globals after assertions complete
  global.document = originalDoc;
  global.requestAnimationFrame = originalRAF;
}
