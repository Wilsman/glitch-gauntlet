import fs from "node:fs";
import { chromium } from "playwright";

const OUT = process.env.REVIEW_OUT || `output/review-${Date.now()}`;
fs.mkdirSync(OUT, { recursive: true });

const BASE = process.env.REVIEW_URL || "http://localhost:5173";
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
  await page.screenshot({ path: `${OUT}/${name}.png` });
  console.log("shot:", name);
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

try {
  // ---- 1. Home ----
  await page.goto(BASE + "/", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2800);
  const nameInput = page.locator("#player-name");
  if (await nameInput.isVisible().catch(() => false)) {
    await shot("01-name-dialog");
    await nameInput.fill("Reviewer");
    await page.locator("button", { hasText: "Continue" }).click();
    await page.waitForTimeout(800);
  }
  await shot("02-home");

  // ---- 2. Character select ----
  await page.locator("button", { hasText: "Play Local" }).click();
  await page.waitForTimeout(1400);
  await shot("03-charselect");
  await page.keyboard.press("ArrowRight");
  await page.waitForTimeout(700);
  await shot("04-charselect-right1");
  await page.keyboard.press("ArrowRight");
  await page.waitForTimeout(700);
  await shot("05-charselect-right2");
  // back to first unlocked card
  await page.keyboard.press("ArrowLeft");
  await page.waitForTimeout(500);
  await page.keyboard.press("ArrowLeft");
  await page.waitForTimeout(700);
  await page.keyboard.press("Enter");
  await page.waitForTimeout(3000);
  await shot("06-after-deploy");

  // ---- 3. Route map ----
  await page
    .locator("button[data-map-node-id]")
    .first()
    .waitFor({ timeout: 15000 })
    .catch(() => {});
  await page.waitForTimeout(1200);
  await shot("07-map");
  await saveState("07-map");

  const startNode = page
    .locator('button[data-map-node-selectable="true"]')
    .first();
  if (await startNode.count()) {
    await startNode.click();
    await page.waitForTimeout(1000);
    await shot("08-node-popover");
    const begin = page.locator("button", { hasText: "BEGIN RUN" });
    if (await begin.count()) await begin.click();
    await page.waitForTimeout(1800);
  }
  await shot("09-run-start");
  await saveState("09-run-start");

  // ---- 4. Gameplay loop ----
  const dirs = ["w", "d", "s", "a"];
  let dirIdx = 0;
  let leveled = 0;
  let sawShop = false;
  for (let i = 0; i < 30; i++) {
    // modal handling
    if (await vis("text=LEVEL UP!")) {
      await shot(`20-levelup-${leveled}`);
      const card = page
        .locator("button", { hasText: "SELECT" })
        .first();
      if (await card.count()) await card.click();
      leveled++;
      await page.waitForTimeout(900);
      await shot(`21-after-pick-${leveled}`);
      continue;
    }
    if (await vis("text=SHOP ROUND")) {
      await shot("30-shop-modal");
      sawShop = true;
      const leave = page.locator("button", { hasText: /leave|skip/i }).first();
      if (await leave.count()) await leave.click();
      await page.waitForTimeout(800);
      continue;
    }
    if (await vis("text=/GAME OVER|VICTORY|EXTRACTED/i")) {
      await shot("40-end-screen");
      break;
    }

    // move + fast-forward
    const k = dirs[dirIdx++ % dirs.length];
    await page.keyboard.down(k);
    await advance(2500);
    await page.keyboard.up(k);
    await page.waitForTimeout(150);

    if (i % 4 === 0) {
      await shot(`10-game-${i}`);
      await saveState(`10-game-${i}`);
      const st = await getState();
      console.log(
        `iter ${i}:`,
        st
          ? `mode=${st.mode} wave=${st.threatTier} hp=${st.player?.health} lvl=${st.player?.level} coins=${st.player?.coins} enemies=${st.enemies?.length} shop=${st.isShopRound} encounter=${JSON.stringify(st.combatEncounter)}`
          : "no-state",
      );
    }
  }

  // ---- 5. Pause menu ----
  await page.keyboard.press("Escape");
  await page.waitForTimeout(800);
  await shot("50-pause");
  await page.keyboard.press("Escape");
  await page.waitForTimeout(500);

  // ---- 6. Testing arena -> force shop round ----
  await page.keyboard.press("\\");
  await page.waitForTimeout(800);
  await shot("51-testing-arena");
  const shopBtn = page.locator("button", { hasText: "FORCE SHOP ROUND" });
  if (await shopBtn.count()) {
    await shopBtn.click();
    await page.waitForTimeout(500);
    await page.keyboard.press("\\"); // close panel
    await page.waitForTimeout(1500);
    await shot("52-shop-round");
    await saveState("52-shop-round");
    // walk to a stand and press E
    for (const k of ["w", "a", "s", "d", "w", "d"]) {
      await page.keyboard.down(k);
      await advance(1200);
      await page.keyboard.up(k);
      if (await vis("text=/PRESS E/i")) {
        await shot("53-shop-prompt");
        await page.keyboard.press("e");
        await page.waitForTimeout(900);
        await shot("54-shop-bought");
        break;
      }
    }
  }

  // ---- 7. Boss round ----
  await page.keyboard.press("\\");
  await page.waitForTimeout(700);
  const bossBtn = page.locator("button", { hasText: "FORCE BOSS ROUND" });
  if (await bossBtn.count()) {
    await bossBtn.click();
    await page.keyboard.press("\\");
    await page.waitForTimeout(2000);
    await shot("60-boss");
    await saveState("60-boss");
    // fight a bit
    await page.keyboard.down("a");
    await advance(5000);
    await page.keyboard.up("a");
    await shot("61-boss-fight");
    await saveState("61-boss-fight");
  } else {
    await page.keyboard.press("\\");
  }

  // ---- 8. Death / game over ----
  // stand still in the boss fight without invulnerability until dead (cap 90s sim)
  for (let i = 0; i < 20; i++) {
    const st = await getState();
    if (!st) break;
    if (st.mode === "gameOver" || st.mode === "won" || st.mode === "bossDefeated") break;
    if (st.player && st.player.health <= 0) break;
    await advance(6000);
    await page.waitForTimeout(200);
    if (await vis("text=LEVEL UP!")) {
      const card = page.locator("button", { hasText: "SELECT" }).first();
      if (await card.count()) await card.click();
      await page.waitForTimeout(500);
    }
  }
  await page.waitForTimeout(1200);
  await shot("70-endstate");
  await saveState("70-endstate");
  await page.waitForTimeout(2500);
  await shot("71-endstate-nav");

  fs.writeFileSync(`${OUT}/errors.json`, JSON.stringify(errors, null, 2));
  console.log("ERRORS:", errors.length ? errors : "none");
  console.log("OUT:", OUT);
} catch (e) {
  fs.writeFileSync(`${OUT}/errors.json`, JSON.stringify(errors, null, 2));
  await shot("99-failure").catch(() => {});
  console.error("FAILED:", e);
} finally {
  await browser.close();
}
