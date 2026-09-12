import fs from "node:fs";
import { chromium } from "playwright";

const OUT = "test-output/verify-autoplay";
const BASE = process.env.BASE_URL || "http://localhost:3001";
fs.mkdirSync(OUT, { recursive: true });

const SEED = {
  version: 2,
  progression: {
    playerName: "AutoTester",
    unlockedCharacters: ["spray-n-pray", "null-ronin"],
    totalGamesPlayed: 3,
    highestWaveReached: 7,
    totalEnemiesKilled: 142,
    totalBossesDefeated: 1,
    successfulExtractions: 0,
    bestSurvivalTimeMs: 372000,
    noHitAfterWave5Wins: 0,
    timesReachedLevel10: 1,
    lastRunStats: {
      characterType: "spray-n-pray",
      waveReached: 7,
      enemiesKilled: 142,
      survivalTimeMs: 372000,
      isVictory: false,
      timestamp: 1700000000000,
    },
  },
};

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
const errors = [];
page.on("console", (m) => {
  if (m.type() === "error") errors.push(m.text());
});
page.on("pageerror", (e) => errors.push(String(e)));

await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
await page.evaluate((seed) => {
  localStorage.setItem("glitch-gauntlet-progression", JSON.stringify(seed));
}, SEED);
await page.reload({ waitUntil: "domcontentloaded" });
await page.waitForTimeout(3500);
await page.screenshot({ path: `${OUT}/01-menu.png` });

const autoplayBtn = page.getByRole("button", { name: /^autoplay$/i });
await autoplayBtn.click();
await page.waitForTimeout(1200);
await page.screenshot({ path: `${OUT}/02-character-select.png` });

await page.getByRole("button", { name: /start game/i }).click();
await page.waitForTimeout(1500);
console.log("url after select:", page.url());
await page.screenshot({ path: `${OUT}/03-map-selection.png` });

const readState = () =>
  page.evaluate(() =>
    typeof window.render_game_to_text === "function"
      ? window.render_game_to_text()
      : "no-hook",
  );

// Let the autopilot play until the run ends (or the cap is hit)
let lastMode = "";
let sawCombat = false;
let sawLevelUp = false;
let sawShop = false;
let sawBoss = false;
let endUrl = "";
const MAX_ITER = 400;
for (let i = 0; i < MAX_ITER; i++) {
  await page.evaluate(
    (ms) =>
      typeof window.advanceTime === "function" ? window.advanceTime(ms) : null,
    3000,
  );
  await page.waitForTimeout(60);
  const raw = await readState();
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    parsed = { mode: raw };
  }
  const mode = parsed.mode;
  if (mode !== lastMode || i % 20 === 0) {
    console.log(
      `iter ${i} mode=${mode} depth=${parsed.mapDepth} threat=${parsed.threatTier} enemies=${parsed.enemies?.length} hp=${parsed.player?.health} lvl=${parsed.player?.level}`,
    );
    lastMode = mode;
  }
  if (mode === "playing" && (parsed.enemies?.length || 0) > 0) sawCombat = true;
  if ((parsed.player?.level || 1) > 1) sawLevelUp = true;
  if (parsed.isShopRound) sawShop = true;
  if (mode === "bossFight" || mode === "bossDefeated") sawBoss = true;
  if (mode === "gameOver" || mode === "won") break;
  if (!page.url().includes("/game/")) break;
}

await page.screenshot({ path: `${OUT}/04-gameplay.png` });
endUrl = page.url();
console.log("final url:", endUrl);

// Verify pause menu still opens during autoplay (user can exit)
if (endUrl.includes("/game/")) {
  await page.keyboard.press("Escape");
  await page.waitForTimeout(800);
  await page.screenshot({ path: `${OUT}/05-pause.png` });
  const pauseText = await page.locator("body").innerText();
  console.log("pause menu visible:", /resume|exit/i.test(pauseText));
  await page.keyboard.press("Escape");
  await page.waitForTimeout(400);
}

// If the run ended, check the end screen shows no stats panel
if (!endUrl.includes("/game/")) {
  await page.waitForTimeout(2500);
  await page.screenshot({ path: `${OUT}/05-endscreen.png` });
  const endText = await page.locator("body").innerText();
  console.log(
    "endscreen suppresses stats:",
    !/FINAL STATS/i.test(endText),
  );
}

const after = await page.evaluate(() =>
  JSON.parse(localStorage.getItem("glitch-gauntlet-progression") || "{}"),
);
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const checks = {
  unlockedSame: same(
    after.progression?.unlockedCharacters,
    SEED.progression.unlockedCharacters,
  ),
  gamesPlayedSame: after.progression?.totalGamesPlayed === 3,
  waveSame: after.progression?.highestWaveReached === 7,
  killsSame: after.progression?.totalEnemiesKilled === 142,
  bossSame: after.progression?.totalBossesDefeated === 1,
  extractionsSame: after.progression?.successfulExtractions === 0,
  lastRunSame: same(
    after.progression?.lastRunStats,
    SEED.progression.lastRunStats,
  ),
  level10Same: after.progression?.timesReachedLevel10 === 1,
};
console.log("sawCombat:", sawCombat, "sawLevelUp:", sawLevelUp, "sawShop:", sawShop, "sawBoss:", sawBoss);
console.log("progression unchanged:", JSON.stringify(checks));
console.log("console errors:", errors.slice(0, 5));
await browser.close();

const pass =
  sawCombat &&
  Object.values(checks).every(Boolean) &&
  errors.length === 0;
console.log(pass ? "PASS" : "FAIL");
process.exit(pass ? 0 : 1);
