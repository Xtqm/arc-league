# Spec Delta: ui-theme

## Purpose

Defines global user interface theme styling, cyberpunk design tokens, universal scrollbar presentation, and surface aesthetics across all HUD, modal, and terminal views.

## ADDED Requirements

### Requirement: Universal Neon Scrollbar Styling
The system SHALL apply custom neon cyan scrollbars to all scrollable elements and viewports across both web and desktop runtimes, overriding default operating system and browser scrollbar controls.

#### Scenario: Scrollbar track and thumb rendering
- **WHEN** any container in the client overflows and displays a vertical or horizontal scrollbar
- **THEN** the scrollbar renders with a 6px width or height, a dark translucent track, a cyan core thumb, and a cyan neon box-shadow glow.

#### Scenario: Native stepper button suppression
- **WHEN** a scrollable view renders in Chromium, Electron, or desktop window environments
- **THEN** native operating system scrollbar arrow buttons and steppers are hidden.

### Requirement: Universal Container Inheritance
The system SHALL apply custom scrollbar styling universally without requiring individual container elements or sub-views to declare specific container wrapper classes.

#### Scenario: Nested scrollable modal list
- **WHEN** a player scrolls an inner container such as the Trophy Matrix card list, Armory catalog pane, Campaign card, or Duel map selector
- **THEN** the inner scrollbar automatically displays the neon cyan scrollbar styling instead of native system scrollbars.

### Requirement: Interactive Scrollbar Feedback
The system SHALL provide dynamic visual feedback when the user hovers over or interacts with a scrollbar thumb.

#### Scenario: Scrollbar thumb hover
- **WHEN** the user moves the cursor over a scrollbar thumb
- **THEN** the thumb transitions to a heightened luminance and expanded cyan glow.
