import { chromium } from 'playwright';
import fs from 'node:fs';
const out = 'output/upgrade-modal';
fs.mkdirSync(out, { recursive: true });
const BASE = process.env.BASE_URL || 'http://localhost:5174';
const browser = await chromium.launch({ headless: true });
const errors = [];
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
page.on('pageerror', e => errors.push(String(e)));
page.on('console', e => { if (e.type() === 'error') errors.push(e.text()); });
const state = () => page.evaluate(() => JSON.parse(window.render_game_to_text()));
const advance = ms => page.evaluate(t => window.advanceTime(t), ms);
const shot = name => page.screenshot({ path: `${out}/${name}.png` });
const store = (fn, arg) => page.evaluate(async ([f, a]) => {
  const m = await import('/src/hooks/useGameStore.ts');
  return eval(`(${f})`)(m.useGameStore, a);
}, [fn.toString(), arg]);
const modalOpen = () => store(s => s.getState().isUpgradeModalOpen);
const setRarities = r => store((s, rar) => s.getState().openUpgradeModal(
  s.getState().upgradeOptions.map((o, i) => ({ ...o, rarity: rar[i % rar.length] })),
), r);
const measureFrames = () => page.evaluate(() => new Promise(res => {
  const deltas = [];
  let last = performance.now(), n = 0;
  const cb = t => { deltas.push(t - last); last = t; if (++n < 120) requestAnimationFrame(cb); else res(deltas.reduce((a, b) => a + b, 0) / deltas.length); };
  requestAnimationFrame(cb);
}));
try {
  await page.goto(`${BASE}/game/local?playerId=hud-check&character=spray-n-pray`);
  await page.locator('[data-map-node-selectable="true"]').first().click();
  const dirs = ['ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp'];
  for (let i = 0; i < 90 && !(await modalOpen()); i++) {
    await page.keyboard.down(dirs[i % 4]); await advance(700); await page.waitForTimeout(30); await page.keyboard.up(dirs[i % 4]);
  }
  if (!(await modalOpen())) throw new Error('level-up modal never opened');
  const before = await state();
  const savedOpts = await store(s => s.getState().upgradeOptions);

  // mid-deal (card backs)
  await page.waitForTimeout(250);
  await shot('01-mid-deal');

  // skip reveal by clicking directly on a face-down card
  const card1 = page.locator('[data-testid="upgrade-card-1"]');
  const box1 = await card1.boundingBox();
  await page.mouse.click(box1.x + box1.width / 2, box1.y + box1.height / 2);
  await page.waitForTimeout(700); // phases flip instantly; the rotateY flip needs ~500ms to show the face
  const selectVisible = await page.getByText('SELECT', { exact: true }).count();
  console.log('card-click skip worked (SELECT x3, modal open):',
    selectVisible >= 3 && (await modalOpen()));
  await shot('02-skip-reveal');

  // mixed-rarity reveal: common / void / legendary
  await setRarities(['common', 'void', 'legendary']);
  await page.waitForTimeout(1050);
  await shot('03-mid-reveal-legendary');
  const frameMs = await measureFrames();
  await page.waitForTimeout(800);
  await shot('04-revealed-mixed');

  // DOM check: card backs hidden, and elementFromPoint at each title hits the face
  const domCheck = await page.evaluate(() => {
    const results = [];
    for (let i = 0; i < 3; i++) {
      const card = document.querySelector(`[data-testid="upgrade-card-${i}"]`);
      if (!card) { results.push(`card ${i} missing`); continue; }
      const back = card.querySelector(`[data-testid="upgrade-card-back-${i}"]`);
      const title = card.querySelector('h3');
      const r = title.getBoundingClientRect();
      const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
      const backHidden = getComputedStyle(back).visibility === 'hidden';
      const onFace = hit && card.contains(hit) && !back.contains(hit);
      results.push(`card ${i}: backHidden=${backHidden} hitFace=${!!onFace} hit=${hit?.tagName}.${hit?.className?.slice?.(0, 30)}`);
    }
    return results;
  });
  console.log('DOM checks:', JSON.stringify(domCheck));

  // hover the legendary card (rightmost)
  const card = page.locator('[data-testid="upgrade-card-2"]');
  const box = await card.boundingBox();
  await page.mouse.move(box.x + box.width * 0.7, box.y + box.height * 0.4);
  await page.waitForTimeout(500);
  await shot('05-hover-legendary');
  await page.mouse.move(640, 60);

  // ember density: all-common vs legendary line-up
  await setRarities(['common', 'common', 'common']);
  await page.waitForTimeout(2600);
  await shot('06-embers-common');
  await setRarities(['legendary', 'legendary', 'legendary']);
  await page.waitForTimeout(2600);
  await shot('07-embers-legendary');

  // shop-round visual (test-only: clone saved options with source=shop)
  await store((s, opts) => s.getState().openUpgradeModal([
    ...opts.map((o, i) => ({ ...o, source: 'shop', cost: 25 + i * 15 })),
    { id: 'skip-test', type: 'skip', title: 'Leave', description: 'Head back out.', rarity: 'common', emoji: '🚪', source: 'shop', isSkipOption: true, cost: 0 },
  ]), savedOpts);
  await page.waitForTimeout(1900);
  await shot('08-shop-round');

  // lock in (restore the mixed set first so the pick is a real option)
  await store((s, opts) => s.getState().openUpgradeModal(opts), savedOpts);
  await page.waitForTimeout(1600);
  const pick = page.locator('[data-testid="upgrade-card-0"]');
  const pbox = await pick.boundingBox();
  await page.mouse.move(pbox.x + pbox.width / 2, pbox.y + pbox.height / 2);
  await pick.click({ force: true });
  await page.waitForTimeout(150);
  await shot('09-lock-in');
  await page.waitForTimeout(900);
  const after = await state();
  console.log('modal closed after select:', !(await modalOpen()),
    '| levelingUp:', after.levelingUp,
    '| level:', before.player?.level, '->', after.player?.level);
  console.log('avg rAF frame ms during reveal:', frameMs.toFixed(2));
} finally {
  console.log('CONSOLE ERRORS:', errors.length ? JSON.stringify(errors.slice(0, 10), null, 2) : 'none');
  await browser.close();
}
