# Spec Delta: game-modes

## MODIFIED Requirements

### Requirement: Duel AI Match Flow
The system SHALL operate an endless tiered 1v1 AI duel mode starting with a 250 HP opponent on Tier 1 and scaling opponent health (`250 + tier * 50` HP) and aggression per victory, automatically resetting the round and initiating a 3-second countdown for the next tier.

#### Scenario: Elite bot eliminated in Duel AI
- **WHEN** the elite AI opponent's health reaches zero in Solo AI Duel mode
- **THEN** the system credits the AI duel victory payout, increments the tier counter, announces tier advancement, restores player health, disc, spawn position, and arena tiles, and starts a 3-second countdown to spawn the next scaled tier opponent

#### Scenario: Tier 1 elite bot initialization
- **WHEN** the player enters Solo AI Duel (`duel` or `duel_ai`) and the initial 3-second countdown finishes
- **THEN** the Tier 1 elite AI opponent spawns with 250 HP and the HUD displays `TIER: 1`

### Requirement: Player Defeat Lifecycle
The system SHALL conclude active gameplay and display the defeat overlay whenever the local player is de-rezzed, providing mode-appropriate retry, tier rematch, and menu exit actions.

#### Scenario: Player de-rez by combat or void
- **WHEN** the player's health drops to zero or the player plunges past the terminal void threshold in Swarm or Campaign modes
- **THEN** gameplay simulation suspends player control and the Game Over modal is displayed with retry and menu options

#### Scenario: Player de-rez in Solo AI Duel offers same-tier rematch and Tier 1 restart
- **WHEN** the player is de-rezzed during Solo AI Duel (`duel` or `duel_ai`) at Tier N
- **THEN** gameplay simulation suspends player control, defeat participation credit is processed, and the Game Over modal displays both a `REMATCH TIER N` action (preserving Tier N and accumulated tiers cleared) and a `RESTART TIER 1` action alongside `MODE SELECT`

#### Scenario: Rematching the current AI Duel tier
- **WHEN** the defeated player selects `REMATCH TIER N` on the Solo AI Duel Game Over modal
- **THEN** the arena tiles, player health, disc possession, and spawn position reset cleanly and a 3-second countdown spawns the Tier N AI opponent

#### Scenario: Restarting Solo AI Duel from Tier 1
- **WHEN** the defeated player selects `RESTART TIER 1` on the Solo AI Duel Game Over modal
- **THEN** `tier` and score reset to Tier 1 baseline and a 3-second countdown spawns the Tier 1 AI opponent

### Requirement: Dynamic Duel Arena Map Selection Lobby
The system SHALL render an interactive map selector in Duel, Practice, and Host lobbies displaying unlocked Campaign Sector and Armory Exotic arenas from storage, marking locked arenas with unlock directives, and propagating the selected map to Practice and hosted multiplayer rooms.

#### Scenario: Populating map selector with unlocked arenas
- **WHEN** a player opens the Host Match or Practice configuration lobby
- **THEN** the selector renders interactive cards for all arenas present in `inventory.unlockedMaps`

#### Scenario: Displaying locked arena unlock directives
- **WHEN** an arena in the catalog is not present in `inventory.unlockedMaps`
- **THEN** the card renders in a locked state displaying the required unlock directive such as `DEFEAT GRID 02 ARBITER` or `UNLOCK IN ARMORY`

#### Scenario: Selecting an unlocked arena map
- **WHEN** the player clicks an unlocked arena card in the selector
- **THEN** the lobby updates the active arena selection, synchronizing the chosen map ID for subsequent match instantiation

#### Scenario: Hosted online rooms inherit selected arena while Quick Match stays symmetric
- **WHEN** a host creates an online `1v1` or `2v2` room from the Host Match modal, or starts Quick Match instead
- **THEN** the hosted room persists and instantiates the selected arena map for room participants, while Quick Match tears down any previewed sector hazards so paired peers compete on the symmetric default arena
