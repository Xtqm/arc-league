# Spec Delta: Desktop Shell

## MODIFIED Requirements

### Requirement: Native Desktop Window Initialization
The system SHALL launch the game within a dedicated Electron native desktop window with hardware acceleration enabled, dedicated high-performance GPU switches enforced, default application menus hidden, window title set to "ARC LEAGUE", and native window icon set to the official Arc League brand icon.

#### Scenario: Application startup
- **WHEN** the desktop application executable is launched
- **THEN** an Electron window opens, loads the local game client, and renders the 3D canvas with window title "ARC LEAGUE" and official application window icon without browser navigation bars or dev tools.

#### Scenario: Dedicated GPU enforcement on dual-GPU laptops
- **WHEN** the desktop shell initializes on a multi-GPU host system
- **THEN** command-line switches (`force_high_performance_gpu`) instruct the underlying Chromium engine to bind rendering to dedicated discrete graphics hardware.
