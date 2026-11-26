# Spec Delta

## ADDED Requirements

### Requirement: Top-Left Non-Overlapping Tactical XP Log
The system SHALL render combat maneuver XP notifications inside a dedicated top-left HUD container (`#tl`) laid out as a vertically stacked CSS Flexbox column with explicit spacing (`gap`) and bounded visible capacity (maximum 4 entries), automatically fading and removing entries after a 2.0-second display window so rapid consecutive maneuvers never overlap.

#### Scenario: Stacking rapid consecutive maneuver XP entries without overlap
- **WHEN** two or more combat maneuvers (such as a parry followed immediately by a multi-ricochet strike or curve fracture) occur within fractions of a second
- **THEN** each entry renders as a separate stacked row inside `#tl` separated by non-zero flex gap with zero overlapping text, rather than spawning center-screen floating `+Credits` badges.

#### Scenario: Bounding maximum visible entries in the tactical XP log
- **WHEN** a rapid combo generates more than 4 active maneuver XP entries simultaneously
- **THEN** the oldest entry is collapsed and pruned so the log remains compact in the top-left corner without encroaching on the central reticle.

#### Scenario: Auto-expiring tactical XP entries
- **WHEN** a tactical XP entry has been displayed for 2.0 seconds
- **THEN** the entry fades out cleanly and removes itself from `#tl`, returning `#tl` to an unobtrusive state when idle.
