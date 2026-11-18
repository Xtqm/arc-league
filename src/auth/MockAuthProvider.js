import { IAuthProvider } from './IAuthProvider.js';

const STORAGE_KEY = 'tron_auth_guest';

/**
 * Safe local storage wrapper with in-memory fallback for private browsing / blocked storage.
 */
class SafeStorage {
  constructor() {
    this._memory = new Map();
  }

  getItem(key) {
    try {
      if (typeof localStorage !== 'undefined') {
        return localStorage.getItem(key);
      }
    } catch (_) {}
    return this._memory.get(key) || null;
  }

  setItem(key, value) {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(key, value);
        return;
      }
    } catch (_) {}
    this._memory.set(key, String(value));
  }

  removeItem(key) {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem(key);
        return;
      }
    } catch (_) {}
    this._memory.delete(key);
  }
}

const storage = new SafeStorage();

/**
 * Generates an RFC4122 v4 UUID with crypto.randomUUID or pseudo-random fallback.
 * @returns {string}
 */
export function generateUUID() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Generates a themed Tron guest handle from a UID.
 * @param {string} uid
 * @returns {string}
 */
export function generateGuestHandle(uid) {
  const shortId = (uid || '').replace(/[^a-zA-Z0-9]/g, '').substring(0, 4).toUpperCase() || 'GRID';
  return `GUEST_SUBROUTINE_${shortId}`;
}

/**
 * MockAuthProvider - Zero-barrier guest authentication provider for offline-first boot.
 */
export class MockAuthProvider extends IAuthProvider {
  constructor() {
    super();
    this._currentUser = null;
    this._listeners = new Set();
    this._initialized = false;
  }

  get providerId() {
    return 'mock';
  }

  _isDesktop() {
    return typeof window !== 'undefined' && !!(window.electronDesktop?.isDesktop);
  }

  async _loadSessionPayload() {
    if (this._isDesktop() && typeof window.electronDesktop.loadAuthSession === 'function') {
      try {
        const res = await window.electronDesktop.loadAuthSession();
        if (res && res.success && res.data) {
          return res.data.user || res.data;
        }
      } catch (desktopErr) {
        console.warn('MockAuthProvider: Failed reading desktop auth session:', desktopErr);
      }
    }

    try {
      const raw = storage.getItem(STORAGE_KEY);
      if (raw) {
        return JSON.parse(raw);
      }
    } catch (err) {
      console.warn('MockAuthProvider: Failed reading local storage auth session:', err);
    }
    return null;
  }

  async _persistSession(identity) {
    try {
      if (identity) {
        storage.setItem(STORAGE_KEY, JSON.stringify(identity));
      } else {
        storage.removeItem(STORAGE_KEY);
      }
    } catch (err) {
      console.warn('MockAuthProvider: Failed persisting identity to storage:', err);
    }

    if (this._isDesktop()) {
      try {
        if (identity && !identity.isAnonymous && typeof window.electronDesktop.saveAuthSession === 'function') {
          await window.electronDesktop.saveAuthSession(identity);
        } else if ((!identity || identity.isAnonymous) && typeof window.electronDesktop.clearAuthSession === 'function') {
          await window.electronDesktop.clearAuthSession();
        }
      } catch (err) {
        console.warn('MockAuthProvider: Failed updating desktop auth session:', err);
      }
    }
  }

  /**
   * Initializes the mock provider, loading an existing session or provisioning a new one.
   * @returns {Promise<void>}
   */
  async init() {
    if (this._initialized) return;

    try {
      const parsed = await this._loadSessionPayload();
      if (parsed && parsed.uid) {
        const isAnon = typeof parsed.isAnonymous === 'boolean'
          ? parsed.isAnonymous
          : (typeof parsed.is_anonymous === 'boolean' ? parsed.is_anonymous : true);
        const provId = parsed.providerId || (isAnon ? this.providerId : 'password');
        const defaultHandle = isAnon ? generateGuestHandle(parsed.uid) : 'PROGRAM';

        this._currentUser = {
          uid: parsed.uid,
          handle: parsed.handle || defaultHandle,
          isAnonymous: isAnon,
          providerId: provId,
          email: parsed.email || null,
          token: parsed.token || `mock_token_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
          createdAt: parsed.createdAt || Date.now(),
          lastLoginAt: Date.now()
        };
        // Update lastLoginAt
        await this._persistSession(this._currentUser);
      }
    } catch (err) {
      console.warn('MockAuthProvider: Failed reading existing identity, re-provisioning:', err);
    }

    if (!this._currentUser) {
      await this.signInGuest();
    }

    this._initialized = true;
    this._notify();
  }

  getCurrentUser() {
    return this._currentUser;
  }

  /**
   * Signs in or provisions a guest identity.
   * @param {boolean} [forceNew=false] If true, generates a fresh guest identity regardless of existing storage.
   * @returns {Promise<{ uid: string, handle: string, isAnonymous: boolean, token: string, providerId: string }>}
   */
  async signInGuest(forceNew = false) {
    if (!forceNew && this._currentUser) {
      return this._currentUser;
    }

    const uid = generateUUID();
    const handle = generateGuestHandle(uid);
    const token = `mock_token_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const now = Date.now();

    const identity = {
      uid,
      handle,
      isAnonymous: true,
      providerId: this.providerId,
      token,
      createdAt: now,
      lastLoginAt: now
    };

    try {
      await this._persistSession(identity);
    } catch (err) {
      console.warn('MockAuthProvider: Failed persisting guest identity:', err);
    }

    this._currentUser = identity;
    this._notify();
    return identity;
  }

  async signInWithCredentials(email, password, handle = '') {
    if (!email || !password) throw new Error('Email and password required');
    const uid = this._currentUser?.uid || generateUUID();
    const finalHandle = handle || (email.split('@')[0] || 'USER').toUpperCase();
    const identity = {
      uid,
      handle: finalHandle,
      email,
      isAnonymous: false,
      providerId: 'password',
      token: `mock_cred_token_${Date.now()}`,
      createdAt: this._currentUser?.createdAt || Date.now(),
      lastLoginAt: Date.now()
    };
    await this._persistSession(identity);
    this._currentUser = identity;
    this._notify();
    return identity;
  }

  async signInWithFederated(providerName = 'google', profile = null) {
    const provId = providerName || 'google';
    const uid = this._currentUser?.uid || generateUUID();
    const finalHandle = profile?.handle || `${provId.toUpperCase()}_USER_${uid.slice(0, 4).toUpperCase()}`;
    const identity = {
      uid,
      handle: finalHandle,
      email: profile?.email || `${finalHandle.toLowerCase()}@${provId}.mock`,
      isAnonymous: false,
      providerId: provId,
      token: `mock_fed_token_${provId}_${Date.now()}`,
      createdAt: this._currentUser?.createdAt || Date.now(),
      lastLoginAt: Date.now()
    };
    await this._persistSession(identity);
    this._currentUser = identity;
    this._notify();
    return identity;
  }

  async updateHandle(newHandle) {
    if (!newHandle) throw new Error('Handle cannot be empty');
    if (!this._currentUser) {
      await this.signInGuest();
    }
    this._currentUser.handle = newHandle;
    await this._persistSession(this._currentUser);
    this._notify();
    return this._currentUser;
  }

  async signOut() {
    this._currentUser = null;
    await this._persistSession(null);
    this._notify();
  }


  onAuthStateChanged(callback) {
    if (typeof callback !== 'function') {
      throw new TypeError('MockAuthProvider.onAuthStateChanged: callback must be a function');
    }
    this._listeners.add(callback);

    // Immediately notify caller of current state via microtask
    queueMicrotask(() => {
      try {
        callback(this._currentUser);
      } catch (err) {
        console.error('MockAuthProvider auth listener callback error:', err);
      }
    });

    return () => {
      this._listeners.delete(callback);
    };
  }

  _notify() {
    const user = this._currentUser;
    for (const listener of Array.from(this._listeners)) {
      try {
        listener(user);
      } catch (err) {
        console.error('MockAuthProvider listener error:', err);
      }
    }
  }
}
