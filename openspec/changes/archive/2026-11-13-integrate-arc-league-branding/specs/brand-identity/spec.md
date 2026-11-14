# Spec Delta: Brand Identity

## Purpose

Defines the official Arc League brand asset catalog, format standards, mount points, and visual presentation requirements across web and native runtime targets.

## ADDED Requirements

### Requirement: Canonical Brand Asset Catalog
The system SHALL maintain a centralized branding asset catalog containing the four canonical Arc League visual assets: the circular monogram icon, the 3D kinetic title lockup, the hexagonal championship crest, and the authentic Pure Construct key art.

#### Scenario: Asset catalog presence
- **WHEN** the game client or packaging pipeline resolves branding assets
- **THEN** high-resolution source images exist under `assets/branding/` for `arc_league_icon_monogram.png`, `arc_league_title_logo.png`, `arc_league_championship_crest.png`, and `arc_league_key_art_capsule.png`.

### Requirement: High-DPI Web Favicon and App Icons
The web client SHALL provide crisp, high-DPI browser favicons and Apple touch icons sourced from the circular monogram asset, deprecating legacy low-resolution inline SVG icons.

#### Scenario: Browser tab icon loading
- **WHEN** a player loads `index.html` in any web browser
- **THEN** the document head references the official brand icon with appropriate MIME types and high-DPI scaling support.

### Requirement: In-Game UI Header and Modal Branding
The game client SHALL render official branded visual elements across primary menu modals and HUD screens instead of unstyled plain text placeholders.

#### Scenario: Pause menu header presentation
- **WHEN** the player pauses an active match
- **THEN** the pause modal displays the official `arc_league_title_logo.png` with glowing ambient drop-shadow.

#### Scenario: Tournament mode select emblem
- **WHEN** the player opens the Host Match or Mode Select modal
- **THEN** the header displays the `arc_league_championship_crest.png` as the official league federation emblem.

### Requirement: Loading and Match Splash Key Art
The game client SHALL render the authentic Pure Construct key art asset during match loading states and intermissions with responsive letterboxing.

#### Scenario: Match loading screen display
- **WHEN** a match or campaign sector begins loading
- **THEN** the loading screen displays `arc_league_key_art_capsule.png` with a dark radial gradient vignette behind telemetry status text.
