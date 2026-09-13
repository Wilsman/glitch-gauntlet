import ts from "typescript";
import fs from "node:fs";

const src = fs.readFileSync("shared/upgrades.ts", "utf8");
const out = ts.transpileModule(src, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 },
}).outputText;
fs.mkdirSync("output", { recursive: true });
fs.writeFileSync("output/up.mjs", out);
const m = await import("file:///F:/tmp/glitch-gauntlet/output/up.mjs");

let dupRolls = 0;
let shortRolls = 0;
for (let i = 0; i < 5000; i++) {
  const r = m.getRandomUpgrades(3);
  const keys = r.map((u) => `${u.type}:${u.rarity}`);
  if (new Set(keys).size !== keys.length) dupRolls++;
  if (r.length !== 3) shortRolls++;
}
for (let i = 0; i < 5000; i++) {
  const r = m.getRandomUpgrades(3, "legendary");
  const keys = r.map((u) => `${u.type}:${u.rarity}`);
  if (new Set(keys).size !== keys.length) dupRolls++;
  if (r.length !== 3) shortRolls++;
}
console.log("duplicate rolls:", dupRolls, "| short rolls:", shortRolls);
