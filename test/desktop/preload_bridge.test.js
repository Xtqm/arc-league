/**
 * preload_bridge.test.js
 * Verifies that desktop/preload.cjs exposes loadAuthSession(), saveAuthSession(),
 * and clearAuthSession() onto window.electronDesktop with appropriate IPC mappings.
 */

import assert from 'assert';
import { createRequire } from 'module';

console.log('--- Running Preload Bridge API Availability Tests ---');

// Set up mock electron contextBridge and ipcRenderer
const exposed = {};
const invokedIpc = [];

const mockElectron = {
  contextBridge: {
    exposeInMainWorld: (key, api) => {
      exposed[key] = api;
    }
  },
  ipcRenderer: {
    invoke: async (channel, ...args) => {
      invokedIpc.push({ type: 'invoke', channel, args });
      return { success: true, channel };
    },
    send: (channel, ...args) => {
      invokedIpc.push({ type: 'send', channel, args });
    },
    on: () => {}
  }
};

// Intercept require('electron') using Module override
import Module from 'module';
const origRequire = Module.prototype.require;
Module.prototype.require = function (id) {
  if (id === 'electron') {
    return mockElectron;
  }
  return origRequire.apply(this, arguments);
};

// Provide minimal window object
global.window = {
  addEventListener: () => {}
};

// Require preload.cjs
const require = createRequire(import.meta.url);
require('../../desktop/preload.cjs');

// Restore require
Module.prototype.require = origRequire;

// Assertions
assert.strictEqual(exposed.isDesktop, true, 'isDesktop must be exposed as true');
assert.ok(exposed.electronDesktop, 'electronDesktop bridge must be exposed');
assert.strictEqual(typeof exposed.electronDesktop.loadAuthSession, 'function', 'loadAuthSession must be a function');
assert.strictEqual(typeof exposed.electronDesktop.saveAuthSession, 'function', 'saveAuthSession must be a function');
assert.strictEqual(typeof exposed.electronDesktop.clearAuthSession, 'function', 'clearAuthSession must be a function');
console.log('✓ Bridge API functions exposed on window.electronDesktop');

// Test IPC channel invocation mappings
await exposed.electronDesktop.loadAuthSession();
assert.deepStrictEqual(invokedIpc[invokedIpc.length - 1], {
  type: 'invoke',
  channel: 'desktop:load-auth-session',
  args: []
});
console.log('✓ loadAuthSession() triggers desktop:load-auth-session');

await exposed.electronDesktop.saveAuthSession({ uid: 'usr_test_1', isAnonymous: false });
assert.deepStrictEqual(invokedIpc[invokedIpc.length - 1], {
  type: 'invoke',
  channel: 'desktop:save-auth-session',
  args: [{ uid: 'usr_test_1', isAnonymous: false }]
});
console.log('✓ saveAuthSession() triggers desktop:save-auth-session with payload');

await exposed.electronDesktop.clearAuthSession();
assert.deepStrictEqual(invokedIpc[invokedIpc.length - 1], {
  type: 'invoke',
  channel: 'desktop:clear-auth-session',
  args: []
});
console.log('✓ clearAuthSession() triggers desktop:clear-auth-session');

delete global.window;
console.log('--- Preload Bridge API Availability Tests PASSED ---\n');
