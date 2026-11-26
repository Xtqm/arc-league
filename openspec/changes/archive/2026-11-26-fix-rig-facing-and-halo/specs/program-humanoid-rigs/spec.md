## MODIFIED Requirements

### Requirement: Role-Differentiated Construct Archetypes
The system SHALL build distinct floating construct visual silhouettes per combat role (`player`, `drone`, `sentinel`) while enforcing a unified, purely skill-driven competitive baseline across all Player Athlete Rigs with zero gameplay stat, hitbox, or physics differences between cosmetic rig variants.

#### Scenario: Player and athlete construct assembly
- **WHEN** a player, teammate, or multiplayer athlete rig is instantiated
- **THEN** the rig renders faceted dark obsidian/ceramic floating torso and limb shards around a radiant spherical chest core, a faceted head encircled above by a slightly tilted horizontal glowing halo, tapered hover-point legs, and no back wings on the base frame.

#### Scenario: Athlete halo ring floats horizontally tilted above head
- **WHEN** a Player Athlete Rig (`archetype: 'player'`) is instantiated from either an authored GLB model or procedural fallback
- **THEN** the halo ring floats clearly above the head crown with a subtle horizontal tilt (within ~25 degrees of the horizontal XZ plane) rather than standing upright around the head and neck.

#### Scenario: Purely cosmetic parity across player rig variants
- **WHEN** a player equips any unlocked Athlete Rig skin or visual chassis variant
- **THEN** collision radius, movement velocity, jump impulse, dash speed, and parry window remain identical to the default baseline rig.

#### Scenario: Standard combat bot Chevron Drone assembly
- **WHEN** a standard AI bot rig is instantiated
- **THEN** the rig renders a sharp inverted-triangle upper torso/shoulder monolith with no separate spherical head, a glowing amber V-core with inner rib vents, and detached floating arms and tapered legs.

#### Scenario: Duel Boss and Arbiter Boss Sentinel assembly
- **WHEN** a Duel Boss or Arbiter Boss is spawned
- **THEN** the rig scales to 1.15x or 1.22x with sharp triangular-prism shoulder and chest shards framing a blazing tier-colored core, a sleek hornless Monolith Prism head with a single vertical glowing visor slit, and a clean back silhouette without concentric orbital rings behind the shoulders.
