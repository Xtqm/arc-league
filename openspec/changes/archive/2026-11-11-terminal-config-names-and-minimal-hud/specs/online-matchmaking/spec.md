# Spec Delta: Online Matchmaking

## ADDED Requirements

### Requirement: Quick Match Peer Callsign Exchange
The system SHALL exchange participant callsigns directly over the reliable WebRTC DataChannel when paired Quick Match peers connect and on rematch transitions, enabling arena nameplates and post-match player names without requiring a room database record.

#### Scenario: Quick Match peers exchange callsigns upon connection
- **WHEN** two players in Quick Match complete the WebRTC handshake and enter the live `1v1` duel
- **THEN** each client transmits its active callsign over the reliable DataChannel and renders the opponent's name on their arena nameplate and post-match screen without writing to a cloud room document.
