import fs from "node:fs";
import { chromium } from "playwright";

const OUT = `output/review-boss-${Date.now()}`;
fs.mkdirSync(OUT, { recursive: true });

const BASE = process.env.REVIEW_URL || "http://localhost:3000";
const errors = [];

const browser = await chromium.launch({
  headless: true,
  args: ["--use-gl=angle", "--use-angle=swiftshader"],
});
const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
page.on("console", (m) => {
  if (m.type() === "error") errors.push(`[console.error] ${m.text()}`);
});
page.on("pageerror", (e) => errors.push(`[pageerror] ${String(e)}`));

const shot = async (name) => {
  try {
    await page.screenshot({ path: `${OUT}/${name}.png`, timeout: 15000 });
    console.log("shot:", name);
  } catch (e) {
    console.log("shot FAILED:", name, String(e).slice(0, 120));
  }
};
const getState = async () => {
  const s = await page.evaluate(() =>
    typeof window.render_game_to_text === "function"
      ? window.render_game_to_text()
      : null,
  );
  return s ? JSON.parse(s) : null;
};
const saveState = async (name) => {
  const s = await page.evaluate(() =>
    typeof window.render_game_to_text === "function"
      ? window.render_game_to_text()
      : null,
  );
  if (s) fs.writeFileSync(`${OUT}/${name}.json`, s);
};
const advance = (ms) =>
  page.evaluate(
    (t) => (typeof window.advanceTime === "function" ? window.advanceTime(t) : null),
    ms,
  );
const vis = (sel) => page.locator(sel).first().isVisible().catch(() => false);
const dismissLevelUp = async () => {
  if (await vis("text=LEVEL UP!")) {
    const card = page.locator("button", { hasText: "SELECT" }).first();
    if (await card.count()) await card.click();
    await page.waitForTimeout(600);
    return true;
  }
  return false;
};

try {
  // jump straight into a local game with name pre-set
  await page.goto(BASE + "/", { waitUntil: "domcontentloaded" });
  await page.evaluate(() => {
    localStorage.setItem(
      "glitch-gauntlet-progression",
      JSON.stringify({ playerName: "Reviewer", unlockedCharacters: [], stats: {} }),
    );
  });
  await page.goto(
    BASE + "/game/local?playerId=local-review2&character=spray-n-pray",
    { waitUntil: "domcontentloaded" },
  );
  await page.waitForTimeout(3500);
  await shot("00-load");

  // pick start node -> BEGIN RUN
  await page
    .locator('button[data-map-node-selectable="true"]')
    .first()
    .waitFor({ timeout: 15000 })
    .catch(() => {});
  const startNode = page.locator('button[data-map-node-selectable="true"]').first();
  if (await startNode.count()) {
    await startNode.click();
    await page.waitForTimeout(800);
    const begin = page.locator("button", { hasText: "BEGIN RUN" });
    if (await begin.count()) await begin.click();
    await page.waitForTimeout(1500);
  }
  await shot("01-run-start");

  // open testing arena, force boss round
  await page.keyboard.press("\\");
  await page.waitForTimeout(700);
  const bossBtn = page.locator("button", { hasText: "FORCE BOSS ROUND" });
  if (await bossBtn.count()) {
    await bossBtn.click();
    await page.waitForTimeout(400);
    await page.keyboard.press("\\");
    await page.waitForTimeout(2000);
  }
  await shot("02-boss-intro");
  await saveState("02-boss-intro");

  // fight the boss for a while
  const dirs = ["w", "d", "s", "a"];
  for (let i = 0; i < 12; i++) {
    if (await dismissLevelUp()) { await shot(`03-levelup-${i}`); continue; }
    const st = await getState();
    console.log(`boss iter ${i}:`, st ? `mode=${st.mode} hp=${st.player?.health} boss=${st.enemies?.filter(e=>e.health>50).length} enemies=${st.enemies?.length}` : "none");
    if (st && (st.mode === "bossDefeated" || st.mode === "gameOver")) break;
    const k = dirs[i % dirs.length];
    await page.keyboard.down(k);
    await advance(3000);
    await page.keyboard.up(k);
    if (i % 3 === 0) await shot(`04-boss-fight-${i}`);
    if (i === 5) { await page.keyboard.press("q"); await page.keyboard.press("Shift"); }
  }
  await shot("05-boss-late");
  await saveState("05-boss-late");

  // ---- death flow: stand still, let boss kill us ----
  for (let i = 0; i < 25; i++) {
    if (await dismissLevelUp()) continue;
    const st = await getState();
    if (!st || st.mode === "gameOver" || st.mode === "won") break;
    if (st.player && st.player.health <= 0) break;
    await advance(6000);
    await page.waitForTimeout(150);
    if (i % 5 === 0) console.log("dying...", st?.player?.health, st?.mode);
  }
  await page.waitForTimeout(1500);
  await shot("06-death");
  await saveState("06-death");
  await page.waitForTimeout(3000);
  await shot("07-after-death");
  console.log("URL now:", page.url());

  // ---- restart/new run: check game over page buttons ----
  const again = page.locator("button", { hasText: /again|retry|menu|home|play/i });
  const n = await again.count();
  console.log("end-page buttons:", n);
  for (let i = 0; i < n; i++) console.log(" -", (await again.nth(i).innerText()).trim().slice(0, 60));

  fs.writeFileSync(`${OUT}/errors.json`, JSON.stringify(errors, null, 2));
  console.log("ERRORS:", errors.length ? errors : "none");
  console.log("OUT:", OUT);
} catch (e) {
  fs.writeFileSync(`${OUT}/errors.json`, JSON.stringify(errors, null, 2));
  await shot("99-failure").catch(() => {});
  console.error("FAILED:", String(e).slice(0, 500));
} finally {
  await browser.close();
}
