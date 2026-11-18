/**
 * desktop_auth_ipc.test.js
 * Unit test verifying atomic auth session file creation, backup rotation,
 * corrupted file fault isolation, and cleanup in desktop saves directory.
 */

import assert from 'assert';
import fs from 'fs';
import fsPromises from 'fs/promises';
import path from 'path';
import os from 'os';

console.log('--- Running Desktop Auth Session IPC File Handler Tests ---');

const tempDir = path.join(os.tmpdir(), `tron_test_desktop_auth_${Date.now()}`);
fs.mkdirSync(tempDir, { recursive: true });

const sessionPath = path.join(tempDir, 'auth_session.json');
const backupPath = path.join(tempDir, 'auth_session.backup.json');

// Replicate main.cjs handlers with the isolated temp test directory
async function saveAuthSession(payload) {
  const jsonStr = typeof payload === 'string' ? payload : JSON.stringify(payload, null, 2);
  if (fs.existsSync(sessionPath)) {
    try {
      await fsPromises.copyFile(sessionPath, backupPath);
    } catch (_) {}
  }
  const tempPath = `${sessionPath}.tmp`;
  await fsPromises.writeFile(tempPath, jsonStr, 'utf8');
  await fsPromises.rename(tempPath, sessionPath);
  return { success: true };
}

async function loadAuthSession() {
  if (fs.existsSync(sessionPath)) {
    const data = await fsPromises.readFile(sessionPath, 'utf8');
    try {
      const parsed = JSON.parse(data);
      return { success: true, data: parsed };
    } catch (parseErr) {
      try {
        await fsPromises.rename(sessionPath, backupPath);
      } catch (_) {}
      return { success: true, data: null };
    }
  }
  return { success: true, data: null };
}

async function clearAuthSession() {
  if (fs.existsSync(sessionPath)) {
    await fsPromises.unlink(sessionPath);
  }
  if (fs.existsSync(backupPath)) {
    try {
      await fsPromises.unlink(backupPath);
    } catch (_) {}
  }
  return { success: true };
}

// Test 1: Load non-existent session
const load1 = await loadAuthSession();
assert.strictEqual(load1.success, true);
assert.strictEqual(load1.data, null);
console.log('✓ Loading non-existent session file safely returns null');

// Test 2: Atomic save
const testSession = {
  uid: 'usr_grid_master_001',
  handle: 'GRID_RUNNER',
  isAnonymous: false,
  providerId: 'password',
  token: 'mock_atomic_jwt_token_123'
};
const save1 = await saveAuthSession(testSession);
assert.strictEqual(save1.success, true);
assert.ok(fs.existsSync(sessionPath));
console.log('✓ Atomic save created auth_session.json');

// Test 3: Load existing session
const load2 = await loadAuthSession();
assert.strictEqual(load2.success, true);
assert.strictEqual(load2.data.uid, testSession.uid);
assert.strictEqual(load2.data.handle, testSession.handle);
assert.strictEqual(load2.data.isAnonymous, false);
console.log('✓ Loaded session correctly parses saved payload');

// Test 4: Overwrite rotates existing to backup
const updatedSession = { ...testSession, handle: 'GRID_RUNNER_V2' };
await saveAuthSession(updatedSession);
assert.ok(fs.existsSync(backupPath), 'Backup file must exist after overwrite');
const backupContent = JSON.parse(await fsPromises.readFile(backupPath, 'utf8'));
assert.strictEqual(backupContent.handle, 'GRID_RUNNER', 'Backup file must contain prior session state');
console.log('✓ Overwriting session creates backup of previous session');

// Test 5: Corrupted file recovery
await fsPromises.writeFile(sessionPath, '{ corrupted json payload !@#$', 'utf8');
const loadCorrupt = await loadAuthSession();
assert.strictEqual(loadCorrupt.success, true);
assert.strictEqual(loadCorrupt.data, null, 'Corrupted JSON must safely return null without throwing');
assert.ok(!fs.existsSync(sessionPath), 'Corrupted file must be moved out of primary slot');
assert.ok(fs.existsSync(backupPath), 'Corrupted file must be rotated to backup slot');
console.log('✓ Corrupted file safely rotated to backup without throwing');

// Test 6: Clear session
await clearAuthSession();
assert.ok(!fs.existsSync(sessionPath), 'Primary session file must be removed');
assert.ok(!fs.existsSync(backupPath), 'Backup session file must be removed');
console.log('✓ clearAuthSession cleanly unlinked session and backup files');

// Cleanup temp dir
try {
  fs.rmSync(tempDir, { recursive: true, force: true });
} catch (_) {}

console.log('--- Desktop Auth Session IPC File Handler Tests PASSED ---\n');
