/**
 * webrtcPeer.js - Peer-to-Peer WebRTC DataChannel Manager for Arc League
 * 
 * Provides low-latency, zero-server UDP-like data transport between peers:
 * - Unreliable / unordered DataChannel for 30-60 Hz player kinematics
 * - Reliable / ordered DataChannel for discrete combat events (throws, parries, damage)
 * - Automatic STUN candidate gathering and ICE lifecycle management
 * - Headless mock adapter for automated test runners
 */

export const DEFAULT_RTC_CONFIG = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' }
  ]
};

export class WebRTCPeer {
  /**
   * @param {Object} options
   * @param {boolean} options.isHost - Whether this peer acts as host (offer creator)
   * @param {Function} [options.onFastMessage] - Callback for kinematic packets (x, y, z, yaw, pitch)
   * @param {Function} [options.onReliableMessage] - Callback for discrete match events (throw, hit, tiles)
   * @param {Function} [options.onConnectionChange] - Callback when connection status changes ('connecting', 'connected', 'disconnected', 'failed')
   * @param {Function} [options.onLocalCandidate] - Callback when a local ICE candidate is gathered
   * @param {Object} [options.rtcConfig] - Optional RTCPeerConnection configuration
   * @param {boolean} [options.isMock] - Force mock mode for Node.js unit tests
   */
  constructor(options = {}) {
    this.isHost = !!options.isHost;
    this.onFastMessage = options.onFastMessage || (() => {});
    this.onReliableMessage = options.onReliableMessage || (() => {});
    this.onConnectionChange = options.onConnectionChange || (() => {});
    this.onLocalCandidate = options.onLocalCandidate || (() => {});
    this.onPingUpdate = options.onPingUpdate || (() => {});
    this.rtcConfig = options.rtcConfig || DEFAULT_RTC_CONFIG;

    this.connectionState = 'idle'; // 'idle' | 'connecting' | 'connected' | 'closed' | 'failed'
    this.peerConnection = null;
    this.fastChannel = null;
    this.reliableChannel = null;
    this.pendingCandidates = [];

    this.rtt = null;
    this.ping = null;
    this._pingIdCounter = 0;
    this._pingSentTimes = new Map();
    this._pingIntervalId = null;
    this._cachedPingBuffer = new ArrayBuffer(4);
    this._cachedPongBuffer = new ArrayBuffer(4);

    this.isMock = options.isMock || (typeof RTCPeerConnection === 'undefined');
    if (this.isMock) {
      this._initMock();
    } else {
      this._initReal();
    }
  }

  _initReal() {
    try {
      this.peerConnection = new RTCPeerConnection(this.rtcConfig);

      this.peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
          this.onLocalCandidate(event.candidate.toJSON ? event.candidate.toJSON() : event.candidate);
        }
      };

      this.peerConnection.onconnectionstatechange = () => {
        const state = this.peerConnection.connectionState;
        if (state !== 'connected' || this._bothChannelsOpen()) {
          this._updateState(state);
        }
      };

      this.peerConnection.oniceconnectionstatechange = () => {
        const state = this.peerConnection.iceConnectionState;
        if (state === 'failed' || state === 'disconnected') {
          this._updateState(state);
        }
      };

      if (this.isHost) {
        // Host creates both channels
        this.fastChannel = this.peerConnection.createDataChannel('arc_kinematics', {
          ordered: false,
          maxRetransmits: 0
        });
        this._setupChannel(this.fastChannel, 'fast');

        this.reliableChannel = this.peerConnection.createDataChannel('arc_events', {
          ordered: true
        });
        this._setupChannel(this.reliableChannel, 'reliable');
      } else {
        // Guest receives channels from host
        this.peerConnection.ondatachannel = (event) => {
          const ch = event.channel;
          if (ch.label === 'arc_kinematics') {
            this.fastChannel = ch;
            this._setupChannel(ch, 'fast');
          } else if (ch.label === 'arc_events') {
            this.reliableChannel = ch;
            this._setupChannel(ch, 'reliable');
          }
          if (this._bothChannelsOpen()) {
            this._updateState('connected');
          }
        };
      }
    } catch (err) {
      console.warn('WebRTCPeer real initialization failed, falling back to mock:', err);
      this._initMock();
    }
  }

  _setupChannel(channel, type) {
    if (type === 'fast') {
      try { channel.binaryType = 'arraybuffer'; } catch (_) {}
    }

    channel.onopen = () => {
      if (this._bothChannelsOpen()) {
        this._updateState('connected');
      }
    };

    channel.onclose = () => {
      this._updateState('disconnected');
    };

    channel.onerror = (err) => {
      console.warn(`WebRTCPeer channel [${type}] error:`, err);
    };

    channel.onmessage = (event) => {
      try {
        let parsed;
        if (typeof event.data === 'string') {
          parsed = JSON.parse(event.data);
        } else {
          parsed = event.data;
        }
        if (type === 'fast') {
          this._handleFastPacket(parsed);
        } else {
          this.onReliableMessage(parsed);
        }
      } catch (err) {
        console.warn(`Error parsing WebRTC [${type}] payload:`, err);
      }
    };

    if (channel.readyState === 'open' && this._bothChannelsOpen()) {
      this._updateState('connected');
    }
  }

  _bothChannelsOpen() {
    return (
      this.fastChannel &&
      this.fastChannel.readyState === 'open' &&
      this.reliableChannel &&
      this.reliableChannel.readyState === 'open'
    );
  }

  _updateState(state) {
    if (this.connectionState !== state) {
      this.connectionState = state;
      try {
        this.onConnectionChange(state);
      } catch (err) {
        console.warn('WebRTCPeer onConnectionChange handler error:', err);
      }
      if (state === 'connected') {
        try {
          this._startPingInterval();
        } catch (err) {
          console.warn('WebRTCPeer startPingInterval error:', err);
        }
      } else {
        this._stopPingInterval();
      }
    }
  }

  sendPing() {
    if (this.connectionState !== 'connected') return false;
    const pingId = (this._pingIdCounter++) & 0xFF;
    const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
    this._pingSentTimes.set(pingId, now);
    if (this._pingSentTimes.size > 20) {
      const oldest = this._pingSentTimes.keys().next().value;
      this._pingSentTimes.delete(oldest);
    }
    const view = new DataView(this._cachedPingBuffer);
    view.setUint8(0, 0xFE);
    view.setUint8(1, pingId);
    view.setUint16(2, 0, true);
    return this.sendFast(this._cachedPingBuffer);
  }

  _startPingInterval() {
    this._stopPingInterval();
    setTimeout(() => {
      if (this.connectionState === 'connected') {
        this.sendPing();
      }
    }, 100);
    this._pingIntervalId = setInterval(() => {
      if (this.connectionState === 'connected') {
        this.sendPing();
      } else {
        this._stopPingInterval();
      }
    }, 1500);
    if (this._pingIntervalId && typeof this._pingIntervalId.unref === 'function') {
      this._pingIntervalId.unref();
    }
  }

  _stopPingInterval() {
    if (this._pingIntervalId) {
      clearInterval(this._pingIntervalId);
      this._pingIntervalId = null;
    }
  }

  _isPingOrPong(data) {
    if (!data) return false;
    if ((data instanceof ArrayBuffer || ArrayBuffer.isView(data)) && data.byteLength === 4) {
      const b0 = new Uint8Array(data.buffer || data, data.byteOffset || 0, 4)[0];
      return b0 === 0xFE || b0 === 0xFF;
    }
    if (typeof data === 'object' && (data.type === 'RTC_PING' || data.type === 'RTC_PONG')) {
      return true;
    }
    return false;
  }

  _processPingPongPacket(data) {
    let opcode, pingId;
    if (data instanceof ArrayBuffer || ArrayBuffer.isView(data)) {
      const bytes = new Uint8Array(data.buffer || data, data.byteOffset || 0, 4);
      opcode = bytes[0];
      pingId = bytes[1];
    } else {
      opcode = data.type === 'RTC_PING' ? 0xFE : 0xFF;
      pingId = data.id;
    }

    if (opcode === 0xFE) {
      const view = new DataView(this._cachedPongBuffer);
      view.setUint8(0, 0xFF);
      view.setUint8(1, pingId);
      view.setUint16(2, 0, true);
      this.sendFast(this._cachedPongBuffer);
    } else if (opcode === 0xFF) {
      const sentTime = this._pingSentTimes.get(pingId);
      if (sentTime !== undefined) {
        const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
        const rtt = Math.max(0, Math.round(now - sentTime));
        this.rtt = rtt;
        this.ping = rtt;
        this._pingSentTimes.delete(pingId);
        this.onPingUpdate(rtt);
      }
    }
  }

  _handleFastPacket(data) {
    if (this._isPingOrPong(data)) {
      this._processPingPongPacket(data);
      return;
    }
    this.onFastMessage(data);
  }

  /**
   * Generates a local SDP offer (Host only)
   * @returns {Promise<Object>} SDP offer object
   */
  async createOffer() {
    if (this.isMock) {
      return this._mockCreateOffer();
    }
    const offer = await this.peerConnection.createOffer();
    await this.peerConnection.setLocalDescription(offer);
    const desc = this.peerConnection.localDescription;
    return desc && desc.toJSON ? desc.toJSON() : { type: desc.type, sdp: desc.sdp };
  }

  async createAnswer(offer) {
    if (this.isMock) {
      return this._mockCreateAnswer(offer);
    }
    await this.peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
    this._flushPendingCandidates();
    const answer = await this.peerConnection.createAnswer();
    await this.peerConnection.setLocalDescription(answer);
    const desc = this.peerConnection.localDescription;
    return desc && desc.toJSON ? desc.toJSON() : { type: desc.type, sdp: desc.sdp };
  }

  async setAnswer(answer) {
    if (this.isMock) {
      return this._mockSetAnswer(answer);
    }
    await this.peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
    this._flushPendingCandidates();
  }

  /**
   * Adds a gathered ICE candidate from the remote peer
   * @param {Object} candidate - RTCIceCandidate descriptor
   */
  async addIceCandidate(candidate) {
    if (!candidate) return;
    if (this.isMock) {
      return;
    }
    if (!this.peerConnection || !this.peerConnection.remoteDescription) {
      this.pendingCandidates.push(candidate);
      return;
    }
    try {
      await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
    } catch (err) {
      console.warn('Failed to add remote ICE candidate:', err);
    }
  }

  _flushPendingCandidates() {
    while (this.pendingCandidates.length > 0) {
      const c = this.pendingCandidates.shift();
      this.addIceCandidate(c);
    }
  }

  /**
   * Transmits high-frequency kinematics data over the fast unordered channel
   * @param {Object} data 
   * @returns {boolean} Whether transmission was queued
   */
  sendFast(data) {
    if (this.isMock) {
      return this._mockSend('fast', data);
    }
    if (this.fastChannel && this.fastChannel.readyState === 'open') {
      try {
        if (data instanceof ArrayBuffer || ArrayBuffer.isView(data)) {
          this.fastChannel.send(data);
        } else if (typeof data === 'string') {
          this.fastChannel.send(data);
        } else {
          this.fastChannel.send(JSON.stringify(data));
        }
        return true;
      } catch (err) {
        console.warn('sendFast transmission error:', err);
        return false;
      }
    }
    return false;
  }

  /**
   * Transmits discrete, ordered match events over the reliable channel
   * @param {Object} data 
   * @returns {boolean} Whether transmission was dispatched
   */
  sendReliable(data) {
    if (this.isMock) {
      return this._mockSend('reliable', data);
    }
    if (this.reliableChannel && this.reliableChannel.readyState === 'open') {
      this.reliableChannel.send(typeof data === 'string' ? data : JSON.stringify(data));
      return true;
    }
    return false;
  }

  close() {
    this._stopPingInterval();
    this._pingSentTimes.clear();
    this._updateState('closed');
    if (this.fastChannel) {
      try { this.fastChannel.close(); } catch (_) {}
      this.fastChannel = null;
    }
    if (this.reliableChannel) {
      try { this.reliableChannel.close(); } catch (_) {}
      this.reliableChannel = null;
    }
    if (this.peerConnection) {
      try { this.peerConnection.close(); } catch (_) {}
      this.peerConnection = null;
    }
    if (this._mockChannel) {
      try { this._mockChannel.close(); } catch (_) {}
      this._mockChannel = null;
    }
  }

  // --------------------------------------------------------------------------
  // Headless Mock Mode (For Node.js Unit Testing & Offline Emulation)
  // --------------------------------------------------------------------------
  _initMock() {
    this._mockPeer = null;
    this.connectionState = 'connecting';
  }

  connectMockPeer(otherPeer) {
    this._mockPeer = otherPeer;
    otherPeer._mockPeer = this;
    this._updateState('connected');
    otherPeer._updateState('connected');
  }

  _mockCreateOffer() {
    return Promise.resolve({ type: 'offer', sdp: 'mock_offer_sdp' });
  }

  _mockCreateAnswer(offer) {
    return Promise.resolve({ type: 'answer', sdp: 'mock_answer_sdp' });
  }

  _mockSetAnswer(answer) {
    return Promise.resolve();
  }

  _mockSend(type, data) {
    if (this.connectionState !== 'connected') {
      return false;
    }
    if (this._mockPeer && this._mockPeer.connectionState === 'connected') {
      let copy;
      if (data instanceof ArrayBuffer) {
        copy = data.slice(0);
      } else if (ArrayBuffer.isView(data)) {
        copy = data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength);
      } else {
        copy = JSON.parse(JSON.stringify(data));
      }
      if (type === 'fast') {
        this._mockPeer._handleFastPacket(copy);
      } else {
        this._mockPeer.onReliableMessage(copy);
      }
      return true;
    }
    return false;
  }
}
