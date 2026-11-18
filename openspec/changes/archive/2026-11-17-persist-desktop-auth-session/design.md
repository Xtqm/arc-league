# Design

## Context

In the Arc League architecture, state persistence is split between two separate subsystems:
1. **Game State Engine (`StorageManager`)**: Persists inventory, bits, campaign progression, loadout, and combat statistics. On desktop, it utilizes native Electron IPC (`desktop:save-profile` / `desktop:load-profile`) to persist to `%APPDATA%/arc-league/saves/profile.json`.
2. **Identity & Auth Engine (`AuthManager`, `SupabaseAuthProvider`, `MockAuthProvider`)**: Manages identity tokens, session states, callsigns, and provider linkages. Currently, this system relies exclusively on browser `localStorage` (or in-memory fallback).

Under Electron, `index.html` is loaded via the `file://` protocol. In modern Chromium/Electron, `file://` origins have opaque or ephemeral local storage buckets. Furthermore:
- `MockAuthProvider.init()` hardcodes `isAnonymous: true` when reading stored credentials on line 100.
- `SupabaseAuthProvider.init()` automatically triggers `signInGuest()` when a web session is not detected in `localStorage`.
- `AuthManager._applyUser(guest)` unconditionally overwrites `this._storage.state.player.id` and `this._storage.state.player.handle` with newly minted guest values, overwriting the desktop `profile.json` on disk.

See `proposal.md` for background and problem motivation.

## Goals / Non-Goals

**Goals:**
- Provide a persistent native auth session store on desktop via Electron IPC (`userData/saves/auth_session.json`).
- Ensure authenticated accounts (from Quick Sync/Google or passkey credentials) remain recognized across desktop application restarts.
- Correct `MockAuthProvider.init()` to re-hydrate `isAnonymous: false` and `providerId`.
- Coordinate `AuthManager.init()` and `StorageManager` on boot so that existing desktop user identities and callsigns are never overwritten by unprompted guest provisioning.
- Cleanly clear desktop session files upon explicit player sign-out.

**Non-Goals:**
- Implementing deep-link URI protocol registration (`arcleague://`) or a loopback HTTP OAuth callback server for system browsers in this change (out-of-scope for desktop session persistence).
- Modifying Supabase remote database schemas, RLS policies, or cloud migration scripts.

## Decisions

### 1. Dedicated Native Desktop Auth Session File (`saves/auth_session.json`)
We will add three IPC handlers to `desktop/main.cjs` and expose them through `desktop/preload.cjs`:
- `desktop:load-auth-session` -> reads `saves/auth_session.json`
- `desktop:save-auth-session` -> writes `saves/auth_session.json`
- `desktop:clear-auth-session` -> deletes `saves/auth_session.json`

*Rationale*: Decoupling the auth session file from `saves/profile.json` avoids polluting the versioned `TronSaveState` game schema with authentication tokens and provider metadata. It also allows explicit sign-out to clear the session without touching local gameplay progression and settings.

*Alternative Considered*: Storing auth session metadata inside `profile.json`. Rejected because mixing auth tokens with game state complicates schema migrations and risk wiping player save data on sign-out.

### 2. Correcting Session Rehydration in `MockAuthProvider`
Update `MockAuthProvider.init()` to restore `isAnonymous: parsed.isAnonymous ?? true` and `providerId: parsed.providerId || this.providerId`. When running in desktop mode, `MockAuthProvider` will read from and write to `window.electronDesktop.loadAuthSession()` / `saveAuthSession()`.

*Rationale*: Directly resolves the bug on line 100 where `isAnonymous: true` was hardcoded, preserving the authenticated state across sessions.

### 3. Desktop Session Awareness in `SupabaseAuthProvider` & `InMemorySupabaseAuth`
Enhance `SupabaseAuthProvider.init()`:
- Check for existing native desktop auth session via `window.electronDesktop.loadAuthSession()` before falling back to guest provisioning.
- If a desktop session exists with an authenticated user (`isAnonymous === false`), hydrate `_currentUser` from this session and suppress `signInGuest()`.
- On auth state changes, persist the session payload through `window.electronDesktop.saveAuthSession()`.

*Rationale*: Prevents the provider from treating an opaque `localStorage` as an empty state and generating unwanted guest accounts.

### 4. Coordinated Startup in `AuthManager`
In `AuthManager.init()`:
- Check whether an existing session exists in the desktop shell before initializing default guest providers.
- In `_applyUser()`, do not overwrite an existing non-default handle in `StorageManager` if the incoming user is an anonymous guest and `StorageManager` already contains an authenticated player handle.

*Rationale*: Prevents guest generation from clobbering the player's saved callsign in `profile.json`.

## Risks / Trade-offs

- **[Risk] Stale or Corrupted `auth_session.json` prevents game boot**
  -> *Mitigation*: Wrap JSON parsing and file reads in try/catch blocks; if invalid, rotate to `auth_session.backup.json` and fall back to guest provisioning without crashing.
- **[Risk] Web environment regression where `window.electronDesktop` is undefined**
  -> *Mitigation*: Guard all desktop calls with `typeof window !== 'undefined' && window.electronDesktop?.isDesktop`, falling back to standard `localStorage` wrapper in browser runtimes.
- **[Risk] Identity and Save State Callsign Divergence**
  -> *Mitigation*: On session rehydration, ensure `user.handle` and `storageManager.get('player.handle')` are aligned.
