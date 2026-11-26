import assert from 'assert';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { withBrowserTest } from '../helpers/browserHarness.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..', '..');

console.log('--- Running Tactical XP HUD (#tl Flexbox Log) Test Suite ---');

// 1. Static CSS & HTML verification in index.html
const indexHtml = fs.readFileSync(path.join(rootDir, 'index.html'), 'utf8');
assert.ok(indexHtml.includes('flex-direction: column;'), 'index.html #tl must use flex-direction: column');
assert.ok(indexHtml.includes('gap: 6px;'), 'index.html #tl must use gap: 6px');
assert.ok(indexHtml.includes('pointer-events: none;'), 'index.html #tl must use pointer-events: none');
assert.ok(indexHtml.includes('.tactical-xp-entry'), 'index.html must define .tactical-xp-entry styles');
assert.ok(indexHtml.includes('id="tl"'), 'index.html must contain #tl container');
console.log('✓ Group 1: Static index.html Flexbox #tl markup and CSS verified');

// 2. Headless browser verification for non-overlap, max 4 cap, deprecation, and 2.0s auto-decay
await withBrowserTest(async ({ page, baseUrl }) => {
  await page.setViewport({ width: 1280, height: 720 });
  await page.goto(`${baseUrl}/index.html`);
  await page.waitForFunction(() => !!document.getElementById('tl'));

  const results = await page.evaluate(async () => {
    const hud = await import('/src/ui/hud.js');
    const tl = document.getElementById('tl');
    const cs = getComputedStyle(tl);

    // Push 5 rapid maneuver entries
    hud.showTacticalXP(40, 'PARRY', { color: '#ffffff', glow: '#00f3ff' });
    hud.showTacticalXP(30, 'DOUBLE BANK', { color: '#ffaa00', glow: '#ff5500' });
    hud.showTacticalXP(25, 'CURVE FRACTURE', { color: '#bd00ff', glow: '#7700ff' });
    hud.showTacticalXP(50, '4x BANK SHOT', { color: '#ffaa00', glow: '#ff5500' });
    hud.showFloatingNeonCredits(40, 'PARRY', { color: '#ffffff', glow: '#00f3ff' }); // deprecated wrapper

    const entries = Array.from(tl.querySelectorAll('.tactical-xp-entry'));
    const rects = entries.map((el) => {
      const r = el.getBoundingClientRect();
      return { top: r.top, bottom: r.bottom, left: r.left, right: r.right, text: el.textContent };
    });

    const floatingLayer = document.getElementById('floatingEconomyLayer');

    // Wait 2.15s for 2.0s auto-decay
    await new Promise((r) => setTimeout(r, 2150));
    const remainingAfterDecay = tl.querySelectorAll('.tactical-xp-entry').length;

    return {
      display: cs.display,
      flexDirection: cs.flexDirection,
      rowGap: cs.rowGap,
      pointerEvents: cs.pointerEvents,
      count: entries.length,
      rects,
      hasFloatingLayer: !!floatingLayer,
      remainingAfterDecay
    };
  });

  assert.strictEqual(results.display, 'flex', '#tl computed display must be flex');
  assert.strictEqual(results.flexDirection, 'column', '#tl computed flexDirection must be column');
  assert.strictEqual(results.rowGap, '6px', '#tl computed rowGap must be 6px');
  assert.strictEqual(results.pointerEvents, 'none', '#tl computed pointerEvents must be none');
  assert.strictEqual(results.count, 4, '#tl must cap visible entries at 4');
  assert.strictEqual(results.hasFloatingLayer, false, 'Deprecated showFloatingNeonCredits must NOT spawn #floatingEconomyLayer');

  // Verify the oldest entry was pruned and deprecated wrapper rendered XP
  assert.strictEqual(results.rects[0].text, '+30 XP // DOUBLE BANK');
  assert.strictEqual(results.rects[3].text, '+40 XP // PARRY');

  // Verify zero bounding-box overlap and >= 5.5px gap between consecutive rows
  for (let i = 1; i < results.rects.length; i++) {
    const prev = results.rects[i - 1];
    const curr = results.rects[i];
    assert.ok(
      curr.top >= prev.bottom + 5.5,
      `Row ${i} top (${curr.top}) must be >= Row ${i - 1} bottom (${prev.bottom}) + 6px gap`
    );
  }

  assert.strictEqual(results.remainingAfterDecay, 0, 'All entries must auto-expire and be removed after 2.0s');
  console.log('✓ Group 2: Headless browser #tl Flexbox stacking, 6px gap, max 4 cap, deprecation, and 2.0s auto-decay verified');
});

console.log('\n======================================================');
console.log('ALL TACTICAL XP HUD TESTS PASSED (100% SUCCESS)');
console.log('======================================================\n');
