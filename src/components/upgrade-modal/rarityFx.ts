import type { UpgradeRarity } from "@shared/types";

export interface RarityFx {
  color: string;
  accent: string;
  tier: 0 | 1 | 2 | 3;
  label: string;
}

export const RARITY_FX: Record<UpgradeRarity, RarityFx> = {
  common: { color: "#e2e8f0", accent: "#94a3b8", tier: 0, label: "COMMON" },
  uncommon: { color: "#4ade80", accent: "#22d3ee", tier: 1, label: "UNCOMMON" },
  lunar: { color: "#60a5fa", accent: "#e0f2fe", tier: 2, label: "LUNAR" },
  void: { color: "#c084fc", accent: "#f0abfc", tier: 2, label: "VOID" },
  legendary: { color: "#f87171", accent: "#facc15", tier: 3, label: "LEGENDARY" },
  boss: { color: "#facc15", accent: "#fb923c", tier: 3, label: "BOSS" },
};

export function rarityFx(rarity: UpgradeRarity | undefined): RarityFx {
  return RARITY_FX[rarity || "common"];
}
