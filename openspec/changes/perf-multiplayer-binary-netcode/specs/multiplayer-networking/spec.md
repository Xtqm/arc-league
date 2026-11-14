# Spec Delta: Multiplayer Networking

## MODIFIED Requirements

### Requirement: Throttled State Synchronization and Interpolation
The system SHALL broadcast player kinematics directly across low-latency WebRTC DataChannels at up to 60 Hz using a compact binary packet layout, queue incoming packets in a snapshot jitter buffer, and smoothly interpolate peer positions and animations using timestamped spline or linear interpolation without database write overhead.

#### Scenario: Remote entity position interpolation
- **WHEN** incoming binary state packets arrive across the WebRTC DataChannel from remote peers
- **THEN** remote player models interpolate smoothly through historical snapshot buffers toward target positions and orientations without hitching or sliding during packet jitter.

#### Scenario: Direct kinetic disc synchronization
- **WHEN** a player executes a kinetic disc throw or curve strike
- **THEN** the disc launch parameters (origin, velocity vector, curve spin) are transmitted immediately over the reliable or unbuffered DataChannel to the remote peer.

## ADDED Requirements

### Requirement: Live Network Latency and Ping Telemetry
The system SHALL periodically measure peer-to-peer round-trip time (RTT) across the WebRTC connection and display a live network latency indicator (ping in milliseconds) in the multiplayer combat HUD.

#### Scenario: Live latency display
- **WHEN** an online match is in progress across an active WebRTC peer connection
- **THEN** periodic ping-pong packets compute the round-trip latency and render the measured ping in the top-right multiplayer status panel.

#### Scenario: Graceful latency fallback
- **WHEN** peer-to-peer connection is establishing or operating in database fallback mode
- **THEN** the HUD hides the latency readout or indicates standby status without throwing runtime errors.
