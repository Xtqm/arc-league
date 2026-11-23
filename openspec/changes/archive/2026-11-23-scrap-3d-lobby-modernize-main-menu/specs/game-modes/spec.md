# Spec Delta

## REMOVED Requirements

### Requirement: Interactive Playable Arena Lobby
**Reason**: Replaced by the Left-Aligned Tactical Rail main menu to eliminate high interface friction, 3D raycasting overhead, and navigational fragmentation.
**Migration**: Navigate and launch game modes directly through the primary Tactical Rail buttons defined in `specs/main-menu/spec.md`.

### Requirement: Energy Core Launch Confirmation
**Reason**: 3D geometric Energy Cores and spatial confirmation drawers are decommissioned.
**Migration**: Mode selections launch immediately upon button activation from the main menu tactical rail without intermediate confirmation drawers.

## MODIFIED Requirements

### Requirement: Decoupled Duel Entry Modalities
The system SHALL provide distinct, non-conflated user entry paths for Solo AI Practice, automated Quick Match, and Friendly Custom Rooms on the Tactical Rail menu, ensuring each mode initializes strictly within its own gameplay and networking lifecycle.

#### Scenario: Direct activation of Solo AI Practice from Main Menu
- **WHEN** a player clicks the `PRACTICE (SOLO AI)` button (`#practiceBtn`) on the primary tactical rail menu
- **THEN** the system immediately starts offline endless tiered bot combat (`duel_ai`) starting at Tier 1 (250 HP) without opening a multiplayer modal or initializing network signaling.

#### Scenario: Direct activation of Quick Match from Main Menu
- **WHEN** a player clicks the `QUICK MATCH` button (`#quickMatchBtn`) on the primary tactical rail menu
- **THEN** the system immediately initiates automated matchmaking with the interactive warm-up sparring bot and active search HUD banner.

#### Scenario: Activation of Friendly Room Host Modal
- **WHEN** a player clicks the `HOST ARCFIELD MATCH` button (`#hostMatchBtn`) on the primary tactical rail menu
- **THEN** the system opens `#hostModal` configured specifically for custom friendly room creation (arena sector and series length selection for 1v1 / 2v2 friend invites) without starting an automated matchmaking queue or spawning a warm-up bot.
