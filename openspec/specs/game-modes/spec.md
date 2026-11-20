# Game Modes Specification

## Purpose

Defines game mode rules, round progression, win and loss conditions, and match termination lifecycles.

## Requirements

### Requirement: Swarm Survival Wave Progression
The system SHALL provide an infinite wave survival mode where eliminating all active foes or neutralizing the Squad Commander during collapse-eligible waves increments the cycle index and spawns an expanded enemy cohort.

#### Scenario: All foes eliminated in Swarm mode
- **WHEN** the last remaining hostile bot in a wave is destroyed in Swarm mode
- **THEN** the cycle counter increments, a wave completion banner appears, and the next wave spawns with scaled foe count.

#### Scenario: Commander collapse clears wave early
- **WHEN** the active Squad Commander is eliminated during an early Commander wave (Waves 4 to 7)
- **THEN** peripheral drones immediately de-rez, the cycle counter increments, and the next wave spawns.

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

### Requirement: Swarm Defense Wave Economy and Streak Payouts
The system SHALL award Bits and XP upon the completion of each Swarm wave, scaling the baseline 15 Bits yield by a compound survival streak bonus, and granting milestone wave bonus chests every 5 waves (Wave 5, 10, 15, 20+).

#### Scenario: Standard wave completion payout
- **WHEN** a player eliminates the final foe of a Swarm wave
- **THEN** the system awards a base yield of 15 Bits scaled by the active compound survival streak multiplier, credits corresponding XP to progression, and emits an economy payout event.

#### Scenario: Milestone wave bonus chest award
- **WHEN** a player completes wave 5, 10, 15, or any multiple of 5 in Swarm mode
- **THEN** the system dispenses a milestone bonus chest with substantial supplementary Bits and XP rewards alongside standard wave earnings.

### Requirement: Duel Match Outcome Payouts and Defeat Participation
The system SHALL award 50 Bits and XP for 1v1 or 2v2 victories against AI opponents, 100 Bits and XP for online Best-of-N multiplayer series victories (credited once upon series clinch), and grant participation XP upon series defeat.

#### Scenario: Solo or practice AI duel victory
- **WHEN** the player destroys the opponent bot and achieves victory in an AI duel
- **THEN** the system credits 50 Bits plus victory XP to the player profile and persists the update.

#### Scenario: Multiplayer duel match victory
- **WHEN** a player or team clinches a Best-of-N series in an online `1v1` or `2v2` room or Quick Match
- **THEN** the system credits 100 Bits plus multiplayer victory XP to the victor's profile once for the completed series and persists the update.

#### Scenario: Match defeat participation credit
- **WHEN** a player suffers de-rez in Solo AI Duel or loses a completed Best-of-N online series
- **THEN** the system awards a bounded participation XP payout without Bits to honor player investment while preventing defeat-farming exploits.

### Requirement: Online Series Round Length Configuration in Host Lobby
The system SHALL display a series length selector (`BO1`, `BO3`, `BO5`, `BO7`, defaulting to `BO3`) inside the Host Match lobby, applying the chosen Best-of-N win target strictly to hosted online `1v1` and `2v2` matches while leaving Solo AI Duel, Swarm, and Campaign round flows untouched.

#### Scenario: Selecting Best-of-N format when hosting online 1v1 or 2v2
- **WHEN** a host opens `#hostModal`, selects a series length (`1`, `3`, `5`, or `7` rounds), and creates a `1v1` or `2v2` room
- **THEN** the created room initializes with `bestOf` equal to the chosen series count (defaulting to `3` when unchanged) and plays to `ceil(bestOf / 2)` round wins before showing rematch/leave controls.

#### Scenario: Single-player modes ignore online series settings
- **WHEN** a player starts Solo AI Duel (`duel_ai`), Swarm, or Campaign from the Main Menu or Host Modal
- **THEN** single-player tier progression, wave progression, and AI Game Over handling remain completely unaffected by the online series selector.

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

### Requirement: Interactive Playable Arena Lobby
The system SHALL operate a persistent 3D Parallax Holo-Deck lobby environment upon main menu activation, anchoring the player in a stationary first-person perspective with unlocked mouse parallax camera damping, while rendering an interactive holographic arc of Energy Cores for League Circuit, Survival, Online Duels, Armory Outfitting, and System Settings.

#### Scenario: Entering the playable arena lobby
- **WHEN** the player launches the application after initial calibration or returns to the menu from an active match
- **THEN** the camera anchors at the central Holo-Deck terminal in first-person view, pointer lock is disengaged, and the mouse cursor is free to navigate both DOM controls and 3D holographic cores.

#### Scenario: Striking an Energy Core with a kinetic disc
- **WHEN** a player clicks or taps on an Energy Core in the Holo-Deck lobby
- **THEN** the system launches an Identity Disc projectile from off-screen into the targeted core, locks further canvas click input during flight, and shatters the core into glowing neon voxel particles on impact.

#### Scenario: Direct pointer interaction with Energy Cores
- **WHEN** a player hovers or clicks directly on an Energy Core or its floating nameplate without locking the pointer
- **THEN** the system triggers the kinetic disc throw sequence toward the targeted core.

#### Scenario: Mouse parallax camera movement
- **WHEN** the player moves the mouse cursor across the Holo-Deck lobby screen
- **THEN** the camera smoothly parallaxes with exponentially damped tilt up to 8 degrees yaw and 5 degrees pitch without locking the pointer or triggering mouse look warps.

#### Scenario: Suppressing 3D raycasting behind UI headers
- **WHEN** the player clicks or hovers on the top identity header, settings gear icon, or an active modal overlay
- **THEN** 3D core raycasting is suppressed and the underlying Energy Core is not targeted or activated.

#### Scenario: Disabling locomotion inputs in the lobby
- **WHEN** the player presses locomotion keys (W, A, S, D, Arrow keys, Spacebar) while in the Holo-Deck lobby
- **THEN** locomotion movement is ignored and the player remains anchored at the Holo-Deck terminal.

### Requirement: Energy Core Launch Confirmation
The system SHALL present a holographic launch confirmation drawer when an Energy Core is activated if `coreLaunchConfirmation` is enabled, initiating immediate mode transition when `coreLaunchConfirmation` is disabled, and cinematically re-assembling the shattered Energy Core whenever launch is canceled or dismissed.

#### Scenario: Launching mode with confirmation modal enabled
- **WHEN** an Energy Core is shattered by a kinetic disc while `coreLaunchConfirmation` is enabled in system settings
- **THEN** the mode drawer slides onto the screen displaying game mode details, confirm action, and cancel action, while releasing input debounce locks.

#### Scenario: Launching mode with confirmation modal disabled
- **WHEN** an Energy Core is shattered by a kinetic disc while `coreLaunchConfirmation` is disabled in system settings
- **THEN** the system skips the confirmation drawer and immediately initiates the 3-second match countdown for the selected mode.

#### Scenario: Canceling or dismissing mode launch
- **WHEN** the player clicks Cancel or presses Escape while the mode confirmation drawer is displayed
- **THEN** the drawer dismisses, a reverse-particle glitch re-assembly effect restores the shattered Energy Core to pristine condition, and lobby interaction resets to idle.

#### Scenario: Debouncing rapid click input during launch flight
- **WHEN** the player rapidly clicks multiple times or targets another core while a disc projectile is in flight
- **THEN** secondary clicks are ignored until the current throw resolves into a drawer opening or match transition.

### Requirement: Survival Hardcore Mode and Dynamic Director
The system SHALL provide an optional Survival: Hardcore mode unlocked after clearing Wave 10 in Standard Survival, initializing at baseline difficulty Level 5 and utilizing a Dynamic Director AI to actively counter player combat patterns.

#### Scenario: Unlocking Hardcore survival mode
- **WHEN** a player successfully completes Wave 10 in Standard Survival mode
- **THEN** the system persists the Hardcore survival unlock in storage and reveals the Hardcore mode option in the Survival lobby.

#### Scenario: Initializing Hardcore survival match
- **WHEN** the player launches Survival: Hardcore mode
- **THEN** the match initializes at baseline difficulty Level 5, enabling squad commanders, charged throws, and dynamic tactical counters from Wave 1.

#### Scenario: Dynamic Director countering turtling player
- **WHEN** the Dynamic Director detects the player maintaining defensive parry blocks for extended intervals
- **THEN** the Director elevates bot charged throw frequency to enforce guard crush attempts.

### Requirement: Decoupled Duel Entry Modalities
The system SHALL provide distinct, non-conflated user entry paths for Solo AI Practice, automated Quick Match, and Friendly Custom Rooms, ensuring each mode initializes strictly within its own gameplay and networking lifecycle.

#### Scenario: Direct activation of Solo AI Practice from Main Menu
- **WHEN** a player clicks the `PRACTICE (SOLO AI)` button (`#practiceBtn`) on the primary main menu
- **THEN** the system immediately starts offline endless tiered bot combat (`duel_ai`) starting at Tier 1 (250 HP) without opening a multiplayer modal or initializing network signaling.

#### Scenario: Direct activation of Quick Match from Main Menu
- **WHEN** a player clicks the `QUICK MATCH` button (`#quickMatchBtn`) on the primary main menu
- **THEN** the system immediately initiates automated matchmaking with the interactive warm-up sparring bot and active search HUD banner.

#### Scenario: Activation of Friendly Room Host Modal
- **WHEN** a player clicks the `HOST ARCFIELD MATCH` button (`#hostMatchBtn`) on the primary main menu
- **THEN** the system opens `#hostModal` configured specifically for custom friendly room creation (arena sector and series length selection for 1v1 / 2v2 friend invites) without starting an automated matchmaking queue or spawning a warm-up bot.
