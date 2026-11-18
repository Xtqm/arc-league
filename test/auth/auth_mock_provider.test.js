import assert from 'assert';
import { MockAuthProvider, generateUUID, generateGuestHandle } from '../../src/auth/MockAuthProvider.js';

console.log('--- Running MockAuthProvider Test Suite ---');

// Test 1: UUID format
const uuid = generateUUID();
console.log('Generated UUID:', uuid);
assert.strictEqual(typeof uuid, 'string');
assert.strictEqual(uuid.length, 36);
assert.match(uuid, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
console.log('✓ UUID generation complies with RFC4122 v4');

// Test 2: Guest handle format
const handle = generateGuestHandle(uuid);
console.log('Generated Guest Handle:', handle);
assert.match(handle, /^GUEST_SUBROUTINE_[A-Z0-9]{4}$/);
console.log('✓ Guest handle adheres to Tron subroutine format');

// Test 3: MockAuthProvider initialization & provisioning
const provider1 = new MockAuthProvider();
assert.strictEqual(provider1.providerId, 'mock');
assert.strictEqual(provider1.getCurrentUser(), null);

let stateChangedUser = null;
const unsub = provider1.onAuthStateChanged((user) => {
  stateChangedUser = user;
});

await provider1.init();
const user1 = provider1.getCurrentUser();
assert.notStrictEqual(user1, null);
assert.strictEqual(typeof user1.uid, 'string');
assert.strictEqual(user1.isAnonymous, true);
assert.strictEqual(user1.providerId, 'mock');
assert.strictEqual(typeof user1.token, 'string');
assert.strictEqual(user1.handle, generateGuestHandle(user1.uid));
console.log('✓ Initial zero-barrier provisioning succeeded for user:', user1.handle);

// Wait for microtask / callback
await new Promise(r => setTimeout(r, 10));
assert.strictEqual(stateChangedUser.uid, user1.uid);
console.log('✓ onAuthStateChanged listener triggered with authenticated identity');

// Test 4: Re-hydration in a second provider instance
const provider2 = new MockAuthProvider();
await provider2.init();
const user2 = provider2.getCurrentUser();
assert.strictEqual(user2.uid, user1.uid, 'Re-hydrated UID must match persisted UID');
assert.strictEqual(user2.handle, user1.handle, 'Re-hydrated handle must match persisted handle');
console.log('✓ Session re-hydration preserved guest identity across instances');

// Test 5: Force new guest creation
const forcedUser = await provider1.signInGuest(true);
assert.notStrictEqual(forcedUser.uid, user1.uid, 'Forced new guest should generate distinct UID');
console.log('✓ Forced guest creation yielded fresh identity:', forcedUser.handle);

// Test 6: Sign out
await provider1.signOut();
assert.strictEqual(provider1.getCurrentUser(), null);
console.log('✓ Sign out successfully cleared current user session');

// Test 7: Credential sign-in and re-hydration preserving isAnonymous: false
const credProvider = new MockAuthProvider();
const credUser = await credProvider.signInWithCredentials('flynn@encom.grid', 'TronLegacy1982', 'FLYNN');
assert.strictEqual(credUser.isAnonymous, false);
assert.strictEqual(credUser.providerId, 'password');
assert.strictEqual(credUser.handle, 'FLYNN');

const rehydratedCred = new MockAuthProvider();
await rehydratedCred.init();
const rehydratedUser = rehydratedCred.getCurrentUser();
assert.strictEqual(rehydratedUser.uid, credUser.uid);
assert.strictEqual(rehydratedUser.isAnonymous, false, 'Re-hydrated credential session must preserve isAnonymous: false');
assert.strictEqual(rehydratedUser.providerId, 'password', 'Re-hydrated session must preserve providerId');
assert.strictEqual(rehydratedUser.handle, 'FLYNN');
console.log('✓ Credential authentication successfully preserved isAnonymous: false on restart');

// Test 8: Federated sign-in and re-hydration
const fedProvider = new MockAuthProvider();
const fedUser = await fedProvider.signInWithFederated('google', { handle: 'GRID_RUNNER', email: 'runner@google.com' });
assert.strictEqual(fedUser.isAnonymous, false);
assert.strictEqual(fedUser.providerId, 'google');

const rehydratedFed = new MockAuthProvider();
await rehydratedFed.init();
assert.strictEqual(rehydratedFed.getCurrentUser().isAnonymous, false);
assert.strictEqual(rehydratedFed.getCurrentUser().providerId, 'google');
assert.strictEqual(rehydratedFed.getCurrentUser().handle, 'GRID_RUNNER');
console.log('✓ Federated authentication preserved isAnonymous: false and providerId across rehydration');

// Test 9: Desktop IPC session persistence and re-hydration
let savedDesktopSession = null;
let clearDesktopCalled = false;
global.window = {
  electronDesktop: {
    isDesktop: true,
    loadAuthSession: async () => ({ success: true, data: savedDesktopSession }),
    saveAuthSession: async (payload) => {
      savedDesktopSession = payload;
      return { success: true };
    },
    clearAuthSession: async () => {
      savedDesktopSession = null;
      clearDesktopCalled = true;
      return { success: true };
    }
  }
};

const desktopProvider1 = new MockAuthProvider();
await desktopProvider1.signInWithCredentials('clu@encom.sys', 'SystemOverride89', 'CLU_SYSTEM');
assert.notStrictEqual(savedDesktopSession, null);
assert.strictEqual(savedDesktopSession.handle, 'CLU_SYSTEM');
assert.strictEqual(savedDesktopSession.isAnonymous, false);
console.log('✓ Desktop IPC bridge received persisted auth session on credential sign-in');

// Clear local safe storage by signing out a non-desktop dummy or passing fresh state
const desktopProvider2 = new MockAuthProvider();
await desktopProvider2.init();
const desktopUser2 = desktopProvider2.getCurrentUser();
assert.strictEqual(desktopUser2.handle, 'CLU_SYSTEM');
assert.strictEqual(desktopUser2.isAnonymous, false);
assert.strictEqual(desktopUser2.providerId, 'password');
console.log('✓ Desktop shell re-hydrated authenticated identity directly via loadAuthSession');

// Test 10: Desktop sign out clears desktop session file
await desktopProvider2.signOut();
assert.strictEqual(desktopProvider2.getCurrentUser(), null);
assert.strictEqual(savedDesktopSession, null);
assert.strictEqual(clearDesktopCalled, true);
console.log('✓ Desktop sign out successfully cleared native auth session payload via clearAuthSession');

delete global.window;

unsub();
console.log('--- MockAuthProvider Test Suite PASSED ---\n');
