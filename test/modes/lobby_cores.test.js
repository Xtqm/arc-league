import assert from 'assert';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { state } from '../../src/core/state.js';
import { activate3DLobbyView, deactivate3DLobbyView, getMainMenuHtml } from '../../src/ui/menus.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../../');

console.log('--- Running 3D Lobby Cores Decommission Verification Suite ---');

// Test 1: src/ui/lobbyCores.js is decommissioned and moved to archive
console.log('\n[Test 1] Verifying src/ui/lobbyCores.js has been removed and archived...');
const activePath = path.join(rootDir, 'src/ui/lobbyCores.js');
const archivePath = path.join(rootDir, 'archive/lobbyCores.js');

assert.strictEqual(fs.existsSync(activePath), false, 'src/ui/lobbyCores.js must be removed from src/ui/');
assert.strictEqual(fs.existsSync(archivePath), true, 'archive/lobbyCores.js must exist in archive/');
console.log('✓ 3D Lobby Cores source cleanly decommissioned and preserved in archive');

// Test 2: Deprecation stubs in src/ui/menus.js operate safely without errors
console.log('\n[Test 2] Verifying activate3DLobbyView and deactivate3DLobbyView deprecation stubs...');
assert.strictEqual(typeof activate3DLobbyView, 'function', 'activate3DLobbyView stub must exist for backward compatibility');
assert.strictEqual(typeof deactivate3DLobbyView, 'function', 'deactivate3DLobbyView stub must exist for backward compatibility');

// Calling them should not throw
assert.doesNotThrow(() => activate3DLobbyView());
assert.doesNotThrow(() => deactivate3DLobbyView());
console.log('✓ Deprecation stubs execute safely without throwing or mutating DOM illegally');

// Test 3: index.html no longer contains #overlay.lobby-3d or #coreConfirmModal
console.log('\n[Test 3] Verifying index.html has purged #overlay.lobby-3d and #coreConfirmModal...');
const indexHtml = fs.readFileSync(path.join(rootDir, 'index.html'), 'utf-8');
assert.strictEqual(indexHtml.includes('#overlay.lobby-3d'), false, 'index.html must not contain #overlay.lobby-3d');
assert.strictEqual(indexHtml.includes('id="coreConfirmModal"'), false, 'index.html must not contain #coreConfirmModal');
console.log('✓ Obsolete 3D lobby CSS and confirmation modal purged from index.html');

// Test 4: getMainMenuHtml renders Left-Aligned Tactical Rail instead of 3D floating cores
console.log('\n[Test 4] Verifying main menu HTML produces tactical rail...');
const menuHtml = getMainMenuHtml();
assert.ok(menuHtml.includes('tactical-rail'), 'Main menu must include tactical-rail class');
assert.strictEqual(menuHtml.includes('core-confirm'), false, 'Main menu must not reference core-confirm');
assert.ok(menuHtml.includes('id="quickMatchBtn"'), 'Must retain quickMatchBtn');
assert.ok(menuHtml.includes('id="practiceBtn"'), 'Must retain practiceBtn');
assert.ok(menuHtml.includes('id="hostMatchBtn"'), 'Must retain hostMatchBtn');
assert.ok(menuHtml.includes('id="joinOnlineBtn"'), 'Must retain joinOnlineBtn');
assert.ok(menuHtml.includes('id="directivesBtn"'), 'Must include directivesBtn in tactical rail');
console.log('✓ Tactical Rail replaces obsolete 3D lobby core controls');

// Test 5: Global state does not have lobbyCoresManager
console.log('\n[Test 5] Verifying global state cleanliness...');
assert.strictEqual(state.lobbyCoresManager, undefined, 'state.lobbyCoresManager must be undefined');
assert.strictEqual(typeof globalThis.__tronLobbyCores, 'undefined', '__tronLobbyCores must not be attached to globalThis');
console.log('✓ Global state cleanly purged of 3D lobby cores');

console.log('\n======================================================');
console.log('ALL 3D LOBBY CORES DECOMMISSION TESTS PASSED (100% SUCCESS) 🎉');
console.log('======================================================');
