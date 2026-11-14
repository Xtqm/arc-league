# Design: Multiplayer Binary Netcode & Snapshot Jitter Buffer

## Context

See `proposal.md` for motivation. In `src/network/sync.js`, `syncNetworkState()` creates a JavaScript object with 10 fields and stringifies it to JSON at 50 Hz. In `webrtcPeer.js`, `sendFast()` broadcasts this JSON string over the unreliable DataChannel, where the receiver calls `JSON.parse()`. `updateRemotePlayers()` then applies a simple `opp.pos.lerp(opp.targetPos, dt * 16)`.

## Goals / Non-Goals

**Goals:**
- Replace JSON kinematic packets with a fixed 32-byte `ArrayBuffer` struct.
- Implement an interpolation jitter buffer that holds 3 snapshots and smoothly plays back remote positions with 30–50ms interpolation delay.
- Introduce periodic WebRTC heartbeat ping/pong packets to measure RTT and display ping in the HUD.
- Retain JSON document synchronization when falling back to legacy Supabase database room mode.

**Non-Goals:**
- Client-side prediction with full physics rollback (rollback netcode is unnecessary given high-velocity ricocheting disc deterministic parity requirements).
- Changing matchmaking room signaling or authentication handshakes.

## Decisions

### Decision 1: 32-Byte Packed Binary Struct Layout
- **Layout**:
  - `[0..1]`: Packet Header (`0xAA55`) & Packet Sequence Number (`Uint16`)
  - `[2..5]`: Timestamp (`Uint32` ms)
  - `[6..11]`: Position $X, Y, Z$ (`Int16` normalized to 0.01m resolution: $\pm 327.67\text{m}$)
  - `[12..15]`: Rotation $Yaw, Pitch$ (`Int16` normalized to $1000\text{ rad}$)
  - `[16]`: Player Health (`Uint8`: 0–100)
  - `[17]`: Bitflags (`Uint8`: bit 0 = blocking, bit 1 = hasDisc, bit 2 = chargingThrow, bit 3 = role)
  - `[18..19]`: Throw Charge (`Uint16` normalized: 0–1000)
  - `[20..21]`: Match Round & Series Round ID (`Uint8`, `Uint8`)
  - `[22..31]`: Reserved for future expansion / checksum
- **Rationale**: 32 bytes fits into a single cache line, uses a single typed `ArrayBuffer`, and avoids all floating point string formatting.
- **Alternatives Considered**:
  - *Protobuf or MessagePack*: Adds external runtime libraries and still produces variable-length binary overhead; fixed `DataView` has zero dependencies and executes in microseconds.

### Decision 2: 3-Snapshot Interpolation Queue
- **Rationale**: When packets travel over real networks, jitter causes packets to arrive in bunches (e.g., 5ms, 35ms, 12ms). Reading from an interpolation buffer that renders remote state delayed by a fixed interval ($\approx 40\text{ms}$) guarantees smooth linear/spline transitions between snapshots.
- **Alternatives Considered**:
  - *Extrapolation (dead reckoning)*: Causes snapping when the remote player suddenly changes direction or jumps; interpolation provides silky smooth animation matching the visual standard of Arc League.

### Decision 3: Periodic WebRTC Ping/Pong
- **Rationale**: Sending a tiny 4-byte ping packet every 1.5 seconds and measuring return time gives an accurate peer-to-peer round-trip time (RTT).
- **Alternatives Considered**:
  - *Relying on WebRTC getStats()*: Browser implementations of `RTCPeerConnection.getStats()` have variable API support across browsers and can hitch when polled every frame. Direct DataChannel echo packets are universal and fast.

## Risks / Trade-offs

- **[40ms interpolation visual delay]** → Mitigation: 40ms is less than 3 frames at 60 FPS and 5 frames at 120 FPS. Because disc throw trajectories are broadcast with origin and velocity immediately, the actual disc flight physics remain responsive and predictable.
- **[Endianness mismatch across architectures]** → Mitigation: All binary read/write operations use standard Little-Endian methods (`DataView.getInt16(offset, true)`).
