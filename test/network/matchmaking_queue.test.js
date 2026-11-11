import assert from 'assert';
import {
  MatchmakingQueue,
  QUEUE_STATES,
  registerMatchmakingSessionHandlers
} from '../../src/network/matchmakingQueue.js';
import { WebRTCPeer } from '../../src/network/webrtcPeer.js';
import { state } from '../../src/core/state.js';

console.log('--- Running MatchmakingQueue Unit Tests ---');

// Test 1: Initial State
const mmQueue = new MatchmakingQueue();
assert.strictEqual(mmQueue.status, QUEUE_STATES.IDLE, 'Initial queue status must be IDLE');
console.log('✓ Initial queue state verified');

// Test 2: Starting Queue Transitions to SEARCHING
let observedStatus = null;
mmQueue.startQueue({
  onStatusChange: (s) => { observedStatus = s; }
});

assert.strictEqual(mmQueue.status, QUEUE_STATES.SEARCHING, 'Queue status must transition to SEARCHING');
assert.strictEqual(state.matchmakingQueueState, QUEUE_STATES.SEARCHING, 'Global state must reflect SEARCHING');
assert.notStrictEqual(mmQueue.bridge, null, 'Signaling bridge must be initialized');
console.log('✓ Queue start and signaling bridge initialization verified');

// Test 3: Deterministic Peer Handshake (Lexicographical Host Assignment)
const hostId = 'player_1111';
const guestId = 'player_9999';

mmQueue.peerId = hostId;
await mmQueue._handleDiscoveredPeer(guestId);

assert.strictEqual(mmQueue.status, QUEUE_STATES.CONNECTING, 'Queue must transition to CONNECTING on peer discovery');
assert.strictEqual(mmQueue.assignedRole, 'p1', 'Lexicographically smaller peerId must be assigned host (p1)');
assert.strictEqual(mmQueue.matchedPeerId, guestId, 'Matched peer ID must record guestId');
console.log('✓ Deterministic host pairing and role assignment verified');

// Test 4: Cancel Queue Teardown
mmQueue.cancelQueue();
assert.strictEqual(mmQueue.status, QUEUE_STATES.IDLE, 'Status must return to IDLE after cancel');
assert.strictEqual(mmQueue.bridge, null, 'Signaling bridge must be disconnected');
assert.strictEqual(state.matchmakingQueueState, QUEUE_STATES.IDLE, 'Global state must return to IDLE');
console.log('✓ Queue cancellation and resource teardown verified');

// Test 5: Match-Lifecycle Routing & Connection State Forwarding When Matched
const mmMatchTest = new MatchmakingQueue();
mmMatchTest.peerId = 'player_1111';
mmMatchTest._setStatus(QUEUE_STATES.CONNECTING);
mmMatchTest.matchedPeerId = 'player_9999';
mmMatchTest.assignedRole = 'p1';
mmMatchTest._initPeerConnection(true, 'player_9999');

const receivedMatchEvents = [];
const receivedConnStates = [];
registerMatchmakingSessionHandlers({
  onMatchMessage: (msg) => receivedMatchEvents.push(msg),
  onConnectionChange: (s) => receivedConnStates.push(s)
});

const remoteMockPeer = new WebRTCPeer({ isHost: false, isMock: true });
mmMatchTest.peer.connectMockPeer(remoteMockPeer);

assert.strictEqual(mmMatchTest.status, QUEUE_STATES.MATCHED, 'Status must enter MATCHED on peer connection');
assert.ok(receivedConnStates.includes('connected'), 'Connection change handler must receive connected');

remoteMockPeer.sendReliable({ type: 'GAME_OVER_EVENT', roundId: 1, winner: 'p1' });
remoteMockPeer.sendReliable({ type: 'REMATCH_VOTE', roundId: 1, role: 'p2', voted: true });
remoteMockPeer.sendReliable({ type: 'REMATCH_START', roundId: 2, mode: '1v1' });
remoteMockPeer.sendReliable({ type: 'PEER_LEFT', role: 'p2', reason: 'RETURN_TO_MENU' });

assert.deepStrictEqual(
  receivedMatchEvents.map(e => e.type),
  ['GAME_OVER_EVENT', 'REMATCH_VOTE', 'REMATCH_START', 'PEER_LEFT'],
  'All canonical match-lifecycle reliable messages must route through registered handler'
);

remoteMockPeer._updateState('disconnected');
mmMatchTest.peer._updateState('disconnected');
assert.ok(receivedConnStates.includes('disconnected'), 'Disconnected state must propagate after MATCHED');

mmMatchTest.resetAfterMatch();
assert.strictEqual(mmMatchTest.status, QUEUE_STATES.IDLE, 'resetAfterMatch must reset queue to IDLE');
assert.strictEqual(mmMatchTest.peer, null, 'resetAfterMatch must clear peer reference');
assert.strictEqual(state.matchmakingQueueState, QUEUE_STATES.IDLE, 'Global state must return to IDLE');
console.log('✓ Reliable match-lifecycle routing, disconnect forwarding, and post-match queue reset verified');

console.log('======================================================');
console.log('ALL MATCHMAKING QUEUE TESTS PASSED (100% SUCCESS)');
console.log('======================================================');
