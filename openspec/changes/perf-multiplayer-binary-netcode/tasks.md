# Tasks: Multiplayer Binary Netcode & Snapshot Jitter Buffer

## 1. Binary Protocol Encoder & Decoder

- [ ] 1.1 Implement binary kinematic packer `encodeKinematicsBinary(state)` and unpacker `decodeKinematicsBinary(buffer)` in `src/network/sync.js`; verify round-trip precision with unit tests in `test/network/`.
- [ ] 1.2 Update `WebRTCPeer` in `src/network/webrtcPeer.js` to support binary `ArrayBuffer` payloads on the fast DataChannel.
- [ ] 1.3 Maintain JSON serialization path as fallback for database room document synchronization.

## 2. Snapshot Jitter Buffer & Smoothing

- [ ] 2.1 Implement fixed 3-snapshot circular buffer in `src/network/sync.js` recording timestamps and kinematic positions.
- [ ] 2.2 Update `updateRemotePlayers()` to sample the interpolation buffer with a smooth 40ms interpolation delay; verify remote combatant locomotion with `npm run test:network`.

## 3. RTT Ping Telemetry & HUD Display

- [ ] 3.1 Implement lightweight ping-pong echo packet exchange in `src/network/webrtcPeer.js` firing every 1.5 seconds.
- [ ] 3.2 Add live ping latency indicator to the multiplayer top-right status panel in `src/ui/hud.js`.

## 4. Verification & Testing

- [ ] 4.1 Run multiplayer network test suite (`npm run test:network`) to verify connection negotiation, packet exchange, and state synchronization.
- [ ] 4.2 Verify binary packet bandwidth reduction (from ~220 bytes to 32 bytes) and zero garbage collection spikes during 50 Hz transmission.
