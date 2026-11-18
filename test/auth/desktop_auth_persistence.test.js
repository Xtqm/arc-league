/**
 * desktop_auth_persistence.test.js
 * Integration test verifying native desktop auth session persistence,
 * re-hydration across simulated app restarts, callsign protection,
 * and safe sign out transitions.
 */

import assert from 'assert';
import { AuthManager } from '../../src/auth/AuthManager.js';
import { StorageManager } from '../../src/core/storage/StorageManager.js';
import { MockAuthProvider } from '../../src/auth/MockAuthProvider.js';
import { SupabaseAuthProvider } from '../../src/auth/SupabaseAuthProvider.js';
import { calculateLevel } from '../../src/ui/authTerminal.js';

console.log('--- Running Desktop Auth Session Persistence Integration Test Suite ---');

// Mock in-memory desktop filesystem state
let mockDiskAuthSession = null;
let mockDiskProfile = null;
let clearAuthSessionCount = 0;
let saveAuthSessionCount = 0;

function setupMockDesktop() {
  clearAuthSessionCount = 0;
  saveAuthSessionCount = 0;
  mockDiskAuthSession = null;
  mockDiskProfile = null;

  global.window = {
    isDesktop: true,
    addEventListener: () => {},
    removeEventListener: () => {},
    electronDesktop: {
      isDesktop: true,
      platform: 'win32',
      loadAuthSession: async () => ({
        success: true,
        data: mockDiskAuthSession ? JSON.parse(JSON.stringify(mockDiskAuthSession)) : null
      }),
      saveAuthSession: async (payload) => {
        saveAuthSessionCount++;
        mockDiskAuthSession = JSON.parse(JSON.stringify(payload));
        return { success: true };
      },
      clearAuthSession: async () => {
        clearAuthSessionCount++;
        mockDiskAuthSession = null;
        return { success: true };
      },
      loadProfile: async () => ({
        success: true,
        data: mockDiskProfile ? JSON.parse(JSON.stringify(mockDiskProfile)) : null
      }),
      saveProfile: async (payload) => {
        mockDiskProfile = JSON.parse(JSON.stringify(payload));
        return { success: true };
      }
    }
  };
}

function teardownMockDesktop() {
  delete global.window;
}

// ============================================================================
// TEST 1: MockAuthProvider desktop session flow
// ============================================================================
console.log('\n--- 1. Testing MockAuthProvider desktop auth persistence & reboot ---');
setupMockDesktop();

const storage1 = new StorageManager({ storageKey: 'test_tron_storage_mock' });
storage1.load();
const auth1 = new AuthManager({ storage: storage1 });
await auth1.init(new MockAuthProvider());

// Verify initial boot provisions guest
assert.strictEqual(auth1.currentUser.isAnonymous, true);
assert.match(auth1.currentUser.handle, /^GUEST_SUBROUTINE_/);
console.log('✓ Initial boot cleanly provisioned guest subroutine:', auth1.currentUser.handle);

// User authenticates via credentials
await auth1.signInWithCredentials('kevin.flynn@encom.grid', 'TronSystem82', 'FLYNN_DEV');
assert.strictEqual(auth1.currentUser.isAnonymous, false);
assert.strictEqual(auth1.currentUser.handle, 'FLYNN_DEV');
assert.strictEqual(auth1.currentUser.providerId, 'password');

// Mutate progression stats & level
auth1.storage.set('player.level', 5, { immediate: true });
auth1.storage.set('player.currency.bits', 1250, { immediate: true });
auth1.recordStats({ matchesPlayed: 14, wins: 11, totalScore: 42000 });
assert.strictEqual(auth1.storage.get('player.level'), 5);
assert.strictEqual(auth1.storage.get('player.handle'), 'FLYNN_DEV');
console.log('✓ Player authenticated as FLYNN_DEV and reached level 5 with 1250 bits');

// Verify native session file on disk was created
assert.notStrictEqual(mockDiskAuthSession, null);
assert.strictEqual(mockDiskAuthSession.handle, 'FLYNN_DEV');
assert.strictEqual(mockDiskAuthSession.isAnonymous, false);
console.log('✓ Native desktop auth session written to disk via saveAuthSession');

// --- SIMULATE APPLICATION REBOOT (Session 2) ---
console.log('\n--- Simulating Application Restart (Session 2) ---');
const storage2 = new StorageManager({ storageKey: 'test_tron_storage_mock' });
storage2.load();
const auth2 = new AuthManager({ storage: storage2 });
await auth2.init(new MockAuthProvider());

const restoredUser = auth2.currentUser;
assert.notStrictEqual(restoredUser, null);
assert.strictEqual(restoredUser.isAnonymous, false, 'Restored user MUST remain authenticated (not demoted to guest)');
assert.strictEqual(restoredUser.handle, 'FLYNN_DEV', 'Restored user handle MUST be FLYNN_DEV');
assert.strictEqual(restoredUser.providerId, 'password');
assert.strictEqual(auth2.storage.get('player.handle'), 'FLYNN_DEV', 'StorageManager callsign must not be overwritten');
assert.strictEqual(auth2.storage.get('player.level'), 5, 'StorageManager level tier must be retained');
console.log('✓ Session 2 restored authenticated state (isAnonymous: false) and callsign (FLYNN_DEV) without guest reset');

// ============================================================================
// TEST 2: Desktop sign out clears session and initializes fresh guest
// ============================================================================
console.log('\n--- 2. Testing Desktop Sign Out Lifecycle ---');
await auth2.signOut();

assert.ok(clearAuthSessionCount >= 1, 'clearAuthSession MUST be called on desktop sign out');
assert.strictEqual(mockDiskAuthSession, null, 'Native desktop auth session on disk MUST be purged');
assert.notStrictEqual(auth2.currentUser, null, 'Sign out on desktop must immediately transition to fresh guest');
assert.strictEqual(auth2.currentUser.isAnonymous, true, 'Transitioned user must be anonymous guest');
assert.match(auth2.currentUser.handle, /^GUEST_SUBROUTINE_/, 'Transitioned user must have guest handle');
console.log('✓ Sign out purged desktop session and smoothly transitioned to fresh guest:', auth2.currentUser.handle);

// --- SIMULATE APPLICATION REBOOT AFTER SIGN OUT (Session 3) ---
console.log('\n--- Simulating Application Restart After Sign Out (Session 3) ---');
const storage3 = new StorageManager({ storageKey: 'test_tron_storage_mock' });
storage3.load();
const auth3 = new AuthManager({ storage: storage3 });
await auth3.init(new MockAuthProvider());

assert.strictEqual(auth3.currentUser.isAnonymous, true);
assert.match(auth3.currentUser.handle, /^GUEST_SUBROUTINE_/);
console.log('✓ Restart after sign out correctly boots into guest subroutine without errors');

// ============================================================================
// TEST 3: SupabaseAuthProvider desktop session flow
// ============================================================================
console.log('\n--- 3. Testing SupabaseAuthProvider desktop auth persistence & reboot ---');
setupMockDesktop();

const storageSup1 = new StorageManager({ storageKey: 'test_tron_storage_supabase' });
storageSup1.load();
const authSup1 = new AuthManager({ storage: storageSup1 });
await authSup1.init(new SupabaseAuthProvider());

assert.strictEqual(authSup1.currentUser.isAnonymous, true);
console.log('✓ Supabase provider initial guest boot provisioned successfully');

// Sign in with credentials in Supabase
await authSup1.signInWithCredentials('alan.bradley@encom.sys', 'Tron1982Sys', 'TRON_SECURITY');
assert.strictEqual(authSup1.currentUser.isAnonymous, false);
assert.strictEqual(authSup1.currentUser.handle, 'TRON_SECURITY');
authSup1.storage.set('player.level', 8, { immediate: true });
console.log('✓ Supabase signed in as TRON_SECURITY (Level 8)');

// Verify desktop session was saved
assert.notStrictEqual(mockDiskAuthSession, null);
assert.strictEqual(mockDiskAuthSession.handle, 'TRON_SECURITY');
assert.strictEqual(mockDiskAuthSession.isAnonymous, false);

// Restart application with simulated empty web storage (e.g. Electron file:// launch)
console.log('\n--- Simulating Desktop Restart with Ephemeral Web Storage ---');
const emptyWebClient = {
  auth: {
    onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
    getSession: async () => ({ data: { session: null } }),
    signInAnonymously: async () => { throw new Error('Unwanted guest sign-in: desktop session was ignored!'); },
    signOut: async () => ({ error: null })
  }
};

const storageSup2 = new StorageManager({ storageKey: 'test_tron_storage_supabase' });
storageSup2.load();
const authSup2 = new AuthManager({ storage: storageSup2 });
await authSup2.init(new SupabaseAuthProvider({ client: emptyWebClient }));

assert.notStrictEqual(authSup2.currentUser, null);
assert.strictEqual(authSup2.currentUser.isAnonymous, false, 'Supabase session must restore authenticated status');
assert.strictEqual(authSup2.currentUser.handle, 'TRON_SECURITY', 'Supabase session must restore handle');
assert.strictEqual(authSup2.storage.get('player.level'), 8, 'Storage level must be retained');
console.log('✓ Supabase rehydration prevented guest fallback and restored authenticated state');

// Clean sign out
await authSup2.signOut();
assert.ok(clearAuthSessionCount >= 1);
assert.strictEqual(mockDiskAuthSession, null);
assert.strictEqual(authSup2.currentUser.isAnonymous, true);
console.log('✓ Supabase desktop sign-out cleanly cleared session');

// ============================================================================
// TEST 4: Corrupted session file recovery
// ============================================================================
console.log('\n--- 4. Testing Corrupted Session File Fault Recovery ---');
// Inject malformed JSON or corrupted data into desktop loader
global.window.electronDesktop.loadAuthSession = async () => {
  // Simulate main process catching JSON parse error and rotating to backup
  return { success: true, data: null };
};

const storageFailover = new StorageManager({ storageKey: 'test_tron_storage_corrupt' });
storageFailover.load();
const authFailover = new AuthManager({ storage: storageFailover });
await authFailover.init(new MockAuthProvider());

assert.notStrictEqual(authFailover.currentUser, null);
assert.strictEqual(authFailover.currentUser.isAnonymous, true);
console.log('✓ Corrupted auth session file gracefully fell back to fresh guest identity without crashing');

teardownMockDesktop();
console.log('\n--- Desktop Auth Session Persistence Integration Test Suite PASSED ---\n');
