# Proposal

## Why

When players download and run the desktop application, securing their identity (e.g., continuing with Google or creating an account) successfully logs them in for their active session, but closing and reopening the application immediately signs them out and demotes them back to an anonymous guest (`[GUEST] SUB-ROUTINE`). This happens because authentication state is stored only in volatile browser `localStorage` (which is ephemeral or origin-isolated under Electron's `file://` scheme) rather than the native desktop filesystem, `MockAuthProvider.init()` hardcodes `isAnonymous: true` on restart, and `SupabaseAuthProvider.init()` automatically re-provisions a fresh guest session whenever a cached web session is absent.

## What Changes

- **Desktop Native Auth Session Persistence**: Add IPC channels (`desktop:load-auth-session`, `desktop:save-auth-session`, `desktop:clear-auth-session`) in `desktop/main.cjs` and expose them via `preload.cjs` to persist authentication session metadata (`userData/saves/auth_session.json`) safely on the host filesystem alongside `profile.json`.
- **Persistent Auth Hydration in Auth Providers**:
  - Update `MockAuthProvider.init()` to respect persisted `isAnonymous` and `providerId` fields rather than hardcoding `isAnonymous: true` and reverting authenticated players to guests upon app restart.
  - Update `SupabaseAuthProvider.init()` and `InMemorySupabaseAuth` to check desktop filesystem storage and preserve active authenticated sessions before falling back to guest provisioning.
- **Pre-Boot Identity Resolution in `AuthManager`**:
  - Ensure `AuthManager.init()` loads any desktop-persisted auth session on startup before triggering guest sub-routine generation.
  - Guard `_applyUser()` so that guest initialization does not overwrite an existing authenticated profile or callsign saved in `StorageManager`.
- **Safe Sign-Out & Session Clearing**:
  - Ensure `signOut()` cleanly flushes both browser storage and desktop filesystem auth sessions while preserving local non-identifying game settings.

## Capabilities

### New Capabilities
<!-- None -->

### Modified Capabilities
- `user-identity`: Update session verification and guest provisioning requirements to ensure authenticated user sessions persist across application restarts, preventing unprompted demotion to guest sub-routines.
- `desktop-shell`: Add native authentication session persistence requirements to Electron's IPC layer for storing and retrieving authenticated session records from the application user data directory.

## Impact

- **Affected Code**:
  - `desktop/main.cjs`: Handlers for `desktop:load-auth-session`, `desktop:save-auth-session`, `desktop:clear-auth-session`.
  - `desktop/preload.cjs`: Bridge methods on `window.electronDesktop`.
  - `src/auth/MockAuthProvider.js`: Fix `init()` session rehydration to retain `isAnonymous: false` and provider identity.
  - `src/auth/SupabaseAuthProvider.js`: Desktop session awareness, preventing unwanted fallback to `signInGuest()`.
  - `src/auth/AuthManager.js`: Hydrate desktop session on startup and prevent guest overwrite of authenticated profile.
  - `src/core/storage/StorageManager.js`: Coordinate with `AuthManager` to ensure save state callsign coherence.
- **APIs & Storage**:
  - Creates `%APPDATA%/arc-league/saves/auth_session.json` on desktop.
- **Dependencies & Compatibility**:
  - Zero new npm dependencies; uses built-in Electron IPC and Node `fs.promises`.
  - Fully backward compatible with existing web browser `localStorage` workflows.
