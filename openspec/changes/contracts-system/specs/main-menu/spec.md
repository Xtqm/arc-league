# Spec Delta

## ADDED Requirements

### Requirement: Contracts Modal Navigation and Notification Pip
The system SHALL bind the `CONTRACTS` utility dock button (`#contractsBtn`) to open the Contracts modal from the main menu and display a neon pulsing notification pip whenever any Daily Contract, Daily Sweep bonus, or Career Contract is ready to claim.

#### Scenario: Opening Contracts modal from utility dock
- **WHEN** the player clicks `#contractsBtn` (`CONTRACTS`) on the main menu dock
- **THEN** the Contracts modal opens displaying Daily Contracts (with UTC reset timer) and Career Contracts (with tier badge and dual-gate promotion bar).

#### Scenario: Displaying claimable Contracts notification pip
- **WHEN** one or more Daily or Career Contracts (or the 3/3 Daily Sweep bonus) are completed and unclaimed
- **THEN** `#contractsBtn` displays a pulsing neon indicator pip until all pending contract rewards are claimed.
