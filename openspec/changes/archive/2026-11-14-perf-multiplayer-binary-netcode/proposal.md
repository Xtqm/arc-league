# Proposal: Multiplayer Binary Netcode & Snapshot Jitter Buffer

## Why

Online 1v1 and 2v2 multiplayer currently broadcasts player kinematics across WebRTC DataChannels at 50 Hz using serialized JSON strings (`JSON.stringify` / `JSON.parse`) containing human-readable floating point keys. This wastes network bandwidth (~220 bytes per packet), incurs serialization CPU overhead 100 times per second, and creates continuous garbage collection pressure. Furthermore, incoming positions are smoothed with a raw linear lerp without a jitter buffer, causing remote opponents to jitter or slide whenever UDP packets arrive irregularly.

By switching to a 32-byte binary `ArrayBuffer` transport, implementing a 30–50ms snapshot jitter buffer, and providing live ping/RTT telemetry, multiplayer duels will feel responsive, physically coherent, and competitive even over variable residential internet connections.

## What Changes

- **Compact Binary Kinematic Packets**: Replace JSON serialization on the fast WebRTC DataChannel with a fixed 32-byte `ArrayBuffer` struct packing position ($x, y, z$), orientation ($yaw, pitch$), health, and bitmasked combat flags (blocking, hasDisc, charging).
- **Snapshot Jitter Buffer & Hermite Interpolation**: Implement an interpolation queue buffering 2–3 historical snapshots with client-synchronized timestamps, smoothly interpolating opponent positions and animation kinematics rather than abruptly lerping to raw packet arrivals.
- **RTT / Ping Telemetry**: Implement periodic lightweight WebRTC ping-pong packets to calculate round-trip latency and display a compact ping indicator (e.g. `24 ms`) in the multiplayer HUD.
- **Graceful Fallback**: Maintain JSON document compatibility when falling back to legacy database room synchronization.

## Capabilities

### New Capabilities
<!-- None -->

### Modified Capabilities
- `multiplayer-networking`: Update requirement for fast binary state synchronization, snapshot interpolation buffering, and live network latency telemetry.

## Impact

- **Affected Files**: `src/network/sync.js`, `src/network/webrtcPeer.js`, `src/network/roomManager.js`, `src/ui/hud.js`.
- **Aesthetic**: Zero visual changes to character models or arena; significantly enhances animation smoothness of remote combatants.
- **Performance**: Cuts network bandwidth by 75%, eliminates JSON GC overhead at 50 Hz, and eliminates visual rubber-banding under jitter.
