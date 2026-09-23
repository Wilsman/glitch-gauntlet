import fs from "node:fs";
import { chromium } from "playwright";

const OUT = "output/verify-endscreen";
fs.mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });

await page.goto("http://localhost:5173/", { waitUntil: "domcontentloaded" });
await page.evaluate(() => {
  localStorage.setItem(
    "glitch-gauntlet-progression",
    JSON.stringify({
      version: 2,
      progression: {
        playerName: "Reviewer",
        unlockedCharacters: ["spray-n-pray", "null-ronin"],
        lastRunStats: {
          characterType: "spray-n-pray",
          waveReached: 7,
          enemiesKilled: 142,
          survivalTimeMs: 372000,
          isVictory: false,
          timestamp: Date.now(),
        },
      },
    }),
  );
});

for (const route of ["gameover", "gamewon"]) {
  await page.goto(`http://localhost:5173/${route}/local`, {
    waitUntil: "domcontentloaded",
  });
  await page.waitForTimeout(2500);
  const text = await page.locator("body").innerText();
  const hasWave = /WAVE/i.test(text) && /7/.test(text);
  const hasStats = /FINAL STATS/i.test(text) && /142/.test(text);
  console.log(`${route}: wave=${hasWave} stats=${hasStats}`);
  await page.screenshot({ path: `${OUT}/${route}.png` });
}
await browser.close();
