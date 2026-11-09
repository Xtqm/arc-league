import assert from 'assert';
import { state } from '../../src/core/state.js';
import { look, MAX_MOUSE_DELTA, sens } from '../../src/input/mouse.js';

console.log('--- Running Mouse Input Delta Spike Rejection Unit Tests ---');

// Reset state
state.player.yaw = 0;
state.player.pitch = 0;
state.invertY = false;

// 1. Normal mouse movements within threshold
look(50, -30);
assert.strictEqual(
  state.player.yaw.toFixed(4),
  (-50 * sens).toFixed(4),
  'Normal horizontal delta applies directly'
);
assert.strictEqual(
  state.player.pitch.toFixed(4),
  (30 * sens).toFixed(4),
  'Normal vertical delta applies directly'
);
console.log('✓ Normal mouse movements apply proportionally without clamping');

// 2. Synthetic pointer lock warp spike (+1500px)
const yawBefore = state.player.yaw;
look(1500, 0);
const actualDelta = state.player.yaw - yawBefore;
assert.strictEqual(
  actualDelta,
  0,
  'Synthetic spike is discarded with zero change to yaw'
);
console.log('✓ Massive positive mouse movement spike is safely discarded');

// 3. Negative synthetic spike (-1200px)
const yawBeforeNeg = state.player.yaw;
look(-1200, 0);
const actualDeltaNeg = state.player.yaw - yawBeforeNeg;
assert.strictEqual(
  actualDeltaNeg,
  0,
  'Negative synthetic spike is discarded with zero change to yaw'
);
console.log('✓ Massive negative mouse movement spike is safely discarded');

// 4. Vertical synthetic spike (+1920px)
const pitchBefore = state.player.pitch;
look(0, 1920);
assert.strictEqual(
  state.player.pitch,
  pitchBefore,
  'Vertical synthetic spike is discarded with zero change to pitch'
);
console.log('✓ Vertical spike is discarded without affecting pitch');

console.log('--- Mouse Input Delta Spike Rejection Unit Tests PASSED ---');
