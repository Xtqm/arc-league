# Proposal: Minimal Combat Notifications

## Why

During active gameplay, excessive text banners (such as "AIR JUMP", "DEFLECTED!", and "RECOVERY JUMP") flash continuously in the center of the screen at `top: 24%` with a fixed 38px font size and a 2.0-second display duration. This directly occludes the crosshair, incoming discs, and opponent models during intense combat exchanges. Furthermore, surface collapse alerts are displayed as obstructing center text rather than intuitive hazard cues, and the fixed typography does not scale adaptively across mobile, tablet, and desktop viewports.

This change streamlines in-game HUD feedback to a distraction-free, minimal standard by default: eliminating routine locomotion and combat text popups, making major match announcements responsively sized and elevated out of sightlines, providing visceral peripheral hazard signaling for surface collapse, and decoupling gameplay test suites from UI text assertions.

## What Changes

- **Silence Routine Locomotion Popups**: Completely eliminate "AIR JUMP", "RECOVERY JUMP", and "RECOVERY DASH" text messages; locomotion feedback is conveyed exclusively through existing audio chimes, particle bursts, and player animations.
- **Silence Routine In-Combat Banners**: Suppress routine combat feedback ("DEFLECTED!", "DEFLECTION HIT!", "GUARD CRUSH // SHIELD BROKEN!", "SHIELD HIT", "REAR STRIKE x2", "RIVAL CAUGHT DISC!") from the center-screen `#msg` HUD overlay so combat sightlines remain 100% unobstructed.
- **Major Match Announcement Sizing & Elevation**: Reserve `#msg` strictly for major match flow milestones (round starts, countdowns, wave/cycle advances, tier updates, and lobby status). Modernize `#msg` with responsive fluid typography (`clamp(...)`) positioned elevated at `top: 15%` to prevent screen crowding on mobile devices and crosshair occlusion on desktop.
- **Evident Surface Collapse Hazard Feedback**: Replace the obstructive center text alert with an amber peripheral screen vignette pulse, warning audio cue, and a compact dock-adjacent warning badge when the player enters the void recovery zone (`y < 0 && y > -3.5`).
- **Decoupled Combat Test Assertions**: Refactor `test/gameplay/physics_and_combat.test.js` to assert directly on disc reflection and shield cooldown state rather than relying on ephemeral HUD DOM text strings.

## Capabilities

### New Capabilities
<!-- None: all requirements belong to existing combat-hud capability -->

### Modified Capabilities
- `combat-hud`: Add requirements for minimal in-game notification filtering, responsive announcement typography scaling, and non-occluding surface collapse hazard indicators.

## Impact

- **UI & Styles (`index.html`, `src/ui/hud.js`)**: Styling of `#msg` updated to use `clamp(...)` sizing and elevated `top: 15%`; addition of a non-blocking peripheral amber hazard vignette and low-profile hazard status element; elimination of routine text triggers in `message()`.
- **Entities (`src/entities/Player.js`, `src/entities/Disc.js`, `src/entities/Bot.js`)**: Removal of direct `message('AIR JUMP')`, `message('RECOVERY JUMP')`, `message('RECOVERY DASH')`, and routing of combat text away from center `#msg`.
- **Tests (`test/gameplay/physics_and_combat.test.js`)**: Test assertions updated to verify combat mechanics directly without inspecting DOM text content.
