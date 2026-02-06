import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { ALL_UPGRADES } from "@shared/upgrades";
import type {
  CollectedUpgrade,
  UpgradeRarity,
  UpgradeType,
} from "@shared/types";

interface CollectedUpgradesPanelProps {
  upgrades: CollectedUpgrade[];
}

interface UpgradeSummary extends CollectedUpgrade {
  displayTitle: string;
  typeLabel: string;
  description: string;
  perPickEffect: string;
  totalEffect: string;
}

const RARITY_COLORS: Record<UpgradeRarity, string> = {
  common: "text-white border-white/70 bg-white/5",
  uncommon: "text-green-300 border-green-400/80 bg-green-500/10",
  legendary: "text-red-300 border-red-400/80 bg-red-500/10",
  boss: "text-yellow-300 border-yellow-400/80 bg-yellow-500/10",
  lunar: "text-cyan-300 border-cyan-400/80 bg-cyan-500/10",
  void: "text-purple-300 border-purple-400/80 bg-purple-500/10",
};

const RARITY_SORT_VALUE: Record<UpgradeRarity, number> = {
  common: 1,
  uncommon: 2,
  legendary: 3,
  boss: 4,
  lunar: 5,
  void: 6,
};

function clampPercent(value: number, cap: number): number {
  return Math.round(Math.min(cap, Math.max(0, value)) * 100);
}

function hasConnectedGamepad(): boolean {
  if (typeof navigator === "undefined" || typeof navigator.getGamepads !== "function") {
    return false;
  }
  const gamepads = navigator.getGamepads();
  for (let i = 0; i < gamepads.length; i++) {
    if (gamepads[i]) return true;
  }
  return false;
}

function getEffectSummary(
  type: UpgradeType,
  count: number,
): {
  perPickEffect: string;
  totalEffect: string;
} {
  switch (type) {
    case "attackSpeed": {
      const totalReduction = Math.round((1 - Math.pow(0.8, count)) * 100);
      const totalMultiplier = (Math.pow(0.8, count)).toFixed(2);
      return {
        perPickEffect: "Per pick: -20% attack interval",
        totalEffect: `Total: -${totalReduction}% interval (x${totalMultiplier})`,
      };
    }
    case "projectileDamage":
      return {
        perPickEffect: "Per pick: +5 projectile damage",
        totalEffect: `Total: +${count * 5} projectile damage`,
      };
    case "playerSpeed": {
      const multiplier = Math.pow(1.15, count);
      const total = Math.round((multiplier - 1) * 100);
      return {
        perPickEffect: "Per pick: +15% move speed",
        totalEffect: `Total: +${total}% move speed (x${multiplier.toFixed(2)})`,
      };
    }
    case "maxHealth":
      return {
        perPickEffect: "Per pick: +20 max HP (+20 heal)",
        totalEffect: `Total: +${count * 20} max HP`,
      };
    case "critChance": {
      const total = clampPercent(count * 0.1, 0.75);
      return {
        perPickEffect: "Per pick: +10% crit chance",
        totalEffect: `Total: ${total}% / 75% crit cap`,
      };
    }
    case "multiShot":
      return {
        perPickEffect: "Per pick: +1 projectile",
        totalEffect: `Total: +${Math.min(count, 10)} projectile(s)`,
      };
    case "armor": {
      const total = clampPercent(count * 0.05, 0.5);
      return {
        perPickEffect: "Per pick: +5% damage reduction",
        totalEffect: `Total: ${total}% / 50% armor cap`,
      };
    }
    case "dodge": {
      const total = clampPercent(count * 0.05, 0.3);
      return {
        perPickEffect: "Per pick: +5% dodge",
        totalEffect: `Total: ${total}% / 30% dodge cap`,
      };
    }
    case "regeneration":
      return {
        perPickEffect: "Per pick: +1 HP/sec regen",
        totalEffect: `Total: +${count} HP/sec`,
      };
    case "shield":
      return {
        perPickEffect: "Per pick: +50 shield",
        totalEffect: `Total: +${count * 50} max shield`,
      };
    case "pierce":
      return {
        perPickEffect: "Per pick: +1 pierce",
        totalEffect: `Total: +${count} pierce`,
      };
    case "chain":
      return {
        perPickEffect: "Per pick: +2 chain targets",
        totalEffect: `Total: +${count * 2} chain targets`,
      };
    case "ricochet":
      return {
        perPickEffect: "Per pick: +3 bounces",
        totalEffect: `Total: +${count * 3} bounces`,
      };
    case "homingShots": {
      const total = Math.round(Math.min(count * 0.3, 1) * 100);
      return {
        perPickEffect: "Per pick: +30% homing strength",
        totalEffect: `Total: ${total}% / 100% homing cap`,
      };
    }
    case "knockback":
      return {
        perPickEffect: "Per pick: +30 knockback",
        totalEffect: `Total: +${count * 30} knockback`,
      };
    case "thorns": {
      const total = clampPercent(count * 0.2, 0.5);
      return {
        perPickEffect: "Per pick: +20% reflect",
        totalEffect: `Total: ${total}% / 50% reflect cap`,
      };
    }
    case "lifeSteal": {
      const total = clampPercent(count * 0.05, 0.5);
      return {
        perPickEffect: "Per pick: +5% lifesteal",
        totalEffect: `Total: ${total}% / 50% lifesteal cap`,
      };
    }
    case "vampiric": {
      const total = clampPercent(count * 0.1, 0.5);
      return {
        perPickEffect: "Per pick: +10% lifesteal",
        totalEffect: `Total: ${total}% / 50% lifesteal cap`,
      };
    }
    case "pickupRadius": {
      const multiplier = Math.pow(1.3, count);
      const total = Math.round((multiplier - 1) * 100);
      return {
        perPickEffect: "Per pick: +30% pickup radius",
        totalEffect: `Total: +${total}% pickup radius (x${multiplier.toFixed(2)})`,
      };
    }
    case "magnetic": {
      const multiplier = Math.pow(1.6, count);
      const total = Math.round((multiplier - 1) * 100);
      return {
        perPickEffect: "Per pick: +60% pickup radius",
        totalEffect: `Total: +${total}% pickup radius (x${multiplier.toFixed(2)})`,
      };
    }
    case "orbital":
      return {
        perPickEffect: "Per pick: +1 orbital skull",
        totalEffect: `Total: ${count} orbital skull(s) active`,
      };
    case "timeWarp":
      return {
        perPickEffect: "Per pick: enables Time Warp",
        totalEffect: "Total: enemies slowed by 30%",
      };
    case "aura":
      return {
        perPickEffect: "Per pick: enables boss aura",
        totalEffect: "Total: nearby enemies deal -30% damage",
      };
    case "turret":
      return {
        perPickEffect: "Per pick: +1 turret deploy",
        totalEffect: `Total: ${count} turret stack(s)`,
      };
    case "fireDamage":
      return {
        perPickEffect: "Per pick: +100% burn over 2s",
        totalEffect: `Total: +${count * 100}% burn-over-time`,
      };
    case "poisonDamage":
      return {
        perPickEffect: "Per pick: +50% poison over 3s",
        totalEffect: `Total: +${count * 50}% poison-over-time`,
      };
    case "iceSlow": {
      const total = clampPercent(count * 0.4, 0.7);
      return {
        perPickEffect: "Per pick: +40% slow",
        totalEffect: `Total: ${total}% / 70% slow cap`,
      };
    }
    case "glitchPatch":
      return {
        perPickEffect: "Per pick: enables recovery passive",
        totalEffect: "Total: 20% chance to heal 1 HP on hit",
      };
    case "satelliteRing":
      return {
        perPickEffect: "Per pick: enables satellite ring",
        totalEffect: "Total: 4 orbiting energy orbs active",
      };
    case "echoShots":
      return {
        perPickEffect: "Per pick: enables echo bullets",
        totalEffect: "Total: each shot spawns a delayed echo round",
      };
    case "gravityBullets":
      return {
        perPickEffect: "Per pick: enables gravity pull",
        totalEffect: "Total: bullets pull enemies inward",
      };
    case "prismShards":
      return {
        perPickEffect: "Per pick: enables shard split",
        totalEffect: "Total: impacts split into extra prism shards",
      };
    case "neonTrail":
      return {
        perPickEffect: "Per pick: enables damaging trail",
        totalEffect: "Total: movement leaves a harmful neon trail",
      };
    case "staticField":
      return {
        perPickEffect: "Per pick: enables periodic zaps",
        totalEffect: "Total: passive nearby lightning bursts",
      };
    case "growthRay":
      return {
        perPickEffect: "Per pick: enables growth bullets",
        totalEffect: "Total: bullets grow larger/stronger in flight",
      };
    case "binaryRain":
      return {
        perPickEffect: "Per pick: enables binary drops",
        totalEffect: "Total: enemies can drop 0/1 buffs",
      };
    case "pet":
      return {
        perPickEffect: "Per pick: enables pet companion",
        totalEffect: "Total: companion actively assists in combat",
      };
    case "clone":
      return {
        perPickEffect: "Per pick: +1 clone",
        totalEffect: `Total: ${count} clone(s)`,
      };
    case "lucky":
      return {
        perPickEffect: "Per pick: enables lucky effect",
        totalEffect: "Total: increased drop/loot outcomes active",
      };
    case "berserker":
      return {
        perPickEffect: "Per pick: enables berserker bonus",
        totalEffect: "Total: bonus damage while low HP",
      };
    case "explosion":
      return {
        perPickEffect: "Per pick: +200% explosion scale",
        totalEffect: `Total: +${count * 200}% explosion scaling`,
      };
    case "bananarang":
      return {
        perPickEffect: "Per pick: +1 returning banana",
        totalEffect: `Total: ${count} bananarang(s)`,
      };
    case "executioner":
      return {
        perPickEffect: "Per pick: enables execution threshold",
        totalEffect: "Total: instant-kill at low enemy HP",
      };
    case "invincibility":
      return {
        perPickEffect: "Per pick: enables lethal-save",
        totalEffect: "Total: survive lethal damage once per wave",
      };
    case "omniGlitch":
      return {
        perPickEffect: "Per pick: enables omni glitch",
        totalEffect: "Total: infinite piercing + glitch trails",
      };
    case "systemOverload":
      return {
        perPickEffect: "Per pick: enables overload trigger",
        totalEffect: "Total: active ability wipes non-boss enemies",
      };
    case "godMode":
      return {
        perPickEffect: "Per pick: enables god mode fail-safe",
        totalEffect: "Total: invulnerability burst at 1 HP",
      };
    case "reflect":
      return {
        perPickEffect: "Per pick: enables projectile reflect",
        totalEffect: "Total: reflects incoming projectiles",
      };
    case "dash":
      return {
        perPickEffect: "Per pick: enables dash",
        totalEffect: "Total: dash movement ability active",
      };
    case "screenWrap":
      return {
        perPickEffect: "Per pick: enables wrap movement",
        totalEffect: "Total: screen edge teleportation active",
      };
    default:
      return {
        perPickEffect: "Per pick: unique effect",
        totalEffect: count > 1 ? `Total: stacked x${count}` : "Total: active",
      };
  }
}

function getStackBadgeClass(count: number): string {
  if (count >= 4) {
    return "text-fuchsia-200 border-fuchsia-400/80 bg-fuchsia-500/20 animate-pulse";
  }
  if (count >= 2) {
    return "text-cyan-200 border-cyan-400/80 bg-cyan-500/20";
  }
  return "text-neon-yellow border-neon-yellow/70 bg-neon-yellow/10";
}

function stripEffectPrefix(text: string, prefix: "Per pick:" | "Total:"): string {
  const normalized = text.trim();
  if (normalized.toLowerCase().startsWith(prefix.toLowerCase())) {
    return normalized.slice(prefix.length).trim();
  }
  return normalized;
}

function humanizeToken(token: string): string {
  return token
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (ch) => ch.toUpperCase())
    .trim();
}

function formatDisplayTitle(title: string, type: UpgradeType): string {
  const trimmed = (title || "").trim();
  if (!trimmed) return humanizeToken(type);
  if (/\s/.test(trimmed)) return trimmed;
  return humanizeToken(trimmed);
}

export default function CollectedUpgradesPanel({
  upgrades,
}: CollectedUpgradesPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const previousCountsRef = useRef<Map<UpgradeType, number>>(new Map());
  const gamepadNavRef = useRef({ up: false, down: false });
  const [selectedType, setSelectedType] = useState<UpgradeType | null>(null);
  const [recentlyUpdated, setRecentlyUpdated] = useState<Set<UpgradeType>>(
    new Set(),
  );
  const [detailsFlash, setDetailsFlash] = useState(false);
  const [isHoveringPanel, setIsHoveringPanel] = useState(false);
  const [isFocusWithin, setIsFocusWithin] = useState(false);
  const [isPinnedExpanded, setIsPinnedExpanded] = useState(false);

  const isExpanded = isPinnedExpanded || isHoveringPanel || isFocusWithin;

  const summaries = useMemo<UpgradeSummary[]>(() => {
    const byType = new Map<
      UpgradeType,
      CollectedUpgrade & { lastSeenIndex: number }
    >();

    upgrades.forEach((upgrade, index) => {
      const existing = byType.get(upgrade.type);
      if (!existing) {
        byType.set(upgrade.type, { ...upgrade, lastSeenIndex: index });
      } else {
        existing.count += upgrade.count;
        if (index >= existing.lastSeenIndex) {
          existing.title = upgrade.title;
          existing.emoji = upgrade.emoji;
          existing.rarity = upgrade.rarity;
          existing.lastSeenIndex = index;
        }
      }
    });

    return Array.from(byType.values())
      .map((upgrade) => {
        const details =
          ALL_UPGRADES.find(
            (u) => u.type === upgrade.type && u.title === upgrade.title,
          ) || ALL_UPGRADES.find((u) => u.type === upgrade.type);
        const effects = getEffectSummary(upgrade.type, upgrade.count);
        return {
          ...upgrade,
          displayTitle: formatDisplayTitle(upgrade.title, upgrade.type),
          typeLabel: humanizeToken(upgrade.type),
          description: details?.description || "No extra details available.",
          perPickEffect: effects.perPickEffect,
          totalEffect: effects.totalEffect,
        };
      })
      .sort((a, b) => {
        if (b.count !== a.count) return b.count - a.count;
        if (RARITY_SORT_VALUE[b.rarity] !== RARITY_SORT_VALUE[a.rarity]) {
          return RARITY_SORT_VALUE[b.rarity] - RARITY_SORT_VALUE[a.rarity];
        }
        return a.displayTitle.localeCompare(b.displayTitle);
      });
  }, [upgrades]);

  useEffect(() => {
    if (summaries.length === 0) {
      setSelectedType(null);
      return;
    }
    if (!selectedType || !summaries.some((u) => u.type === selectedType)) {
      setSelectedType(summaries[0].type);
    }
  }, [summaries, selectedType]);

  useEffect(() => {
    const prevCounts = previousCountsRef.current;
    const increasedTypes: UpgradeType[] = [];

    for (const upgrade of summaries) {
      const prev = prevCounts.get(upgrade.type) || 0;
      if (upgrade.count > prev) {
        increasedTypes.push(upgrade.type);
      }
    }

    previousCountsRef.current = new Map(
      summaries.map((upgrade) => [upgrade.type, upgrade.count]),
    );

    if (increasedTypes.length === 0) return;

    setRecentlyUpdated((prev) => {
      const next = new Set(prev);
      increasedTypes.forEach((type) => next.add(type));
      return next;
    });

    const timers = increasedTypes.map((type) =>
      window.setTimeout(() => {
        setRecentlyUpdated((prev) => {
          const next = new Set(prev);
          next.delete(type);
          return next;
        });
      }, 900),
    );

    return () => {
      timers.forEach((timer) => window.clearTimeout(timer));
    };
  }, [summaries]);

  useEffect(() => {
    if (!selectedType) return;
    setDetailsFlash(true);
    const timer = window.setTimeout(() => setDetailsFlash(false), 200);
    return () => window.clearTimeout(timer);
  }, [selectedType]);

  const moveSelection = useCallback(
    (delta: number) => {
      if (summaries.length === 0) return;
      const currentIndex = summaries.findIndex(
        (upgrade) => upgrade.type === selectedType,
      );
      const base = currentIndex >= 0 ? currentIndex : 0;
      const nextIndex =
        (base + delta + summaries.length) % summaries.length;
      setSelectedType(summaries[nextIndex].type);
    },
    [summaries, selectedType],
  );

  useEffect(() => {
    if (!isExpanded || summaries.length === 0) return;
    let rafId = 0;

    const tick = () => {
      const padConnected = hasConnectedGamepad();
      if (!padConnected) {
        gamepadNavRef.current = { up: false, down: false };
      } else {
        const gamepads = navigator.getGamepads();
        const gp = Array.from(gamepads).find((p) => !!p);
        if (gp) {
          const upPressed = !!gp.buttons[12]?.pressed || (gp.axes[1] ?? 0) < -0.65;
          const downPressed = !!gp.buttons[13]?.pressed || (gp.axes[1] ?? 0) > 0.65;

          if (upPressed && !gamepadNavRef.current.up) {
            moveSelection(-1);
          }
          if (downPressed && !gamepadNavRef.current.down) {
            moveSelection(1);
          }

          gamepadNavRef.current = { up: upPressed, down: downPressed };
        }
      }
      rafId = window.requestAnimationFrame(tick);
    };

    rafId = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(rafId);
  }, [summaries.length, isExpanded, moveSelection]);

  if (summaries.length === 0) return null;

  const totalPicks = summaries.reduce((acc, upgrade) => acc + upgrade.count, 0);
  const selectedUpgrade =
    summaries.find((upgrade) => upgrade.type === selectedType) || null;

  return (
    <div
      ref={panelRef}
      tabIndex={0}
      onMouseEnter={() => setIsHoveringPanel(true)}
      onMouseLeave={() => setIsHoveringPanel(false)}
      onFocusCapture={() => setIsFocusWithin(true)}
      onBlurCapture={(event) => {
        const next = event.relatedTarget as Node | null;
        if (!panelRef.current?.contains(next)) {
          setIsFocusWithin(false);
        }
      }}
      onKeyDown={(event) => {
        if (event.key === "ArrowDown") {
          event.preventDefault();
          moveSelection(1);
        } else if (event.key === "ArrowUp") {
          event.preventDefault();
          moveSelection(-1);
        }
      }}
      className={`fixed left-0 top-1/2 -translate-y-1/2 w-72 bg-black/90 border-2 border-neon-yellow backdrop-blur-sm z-30 transition-transform duration-300 outline-none ${
        isExpanded ? "translate-x-0" : "-translate-x-[calc(100%-2rem)]"
      }`}
    >
      <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-full w-8 h-16 bg-neon-yellow/20 border-2 border-l-0 border-neon-yellow flex items-center justify-center transition-colors">
        <span className="font-press-start text-[8px] text-neon-yellow -rotate-90">
          ITEMS
        </span>
      </div>

      <div className="p-2">
        <div className="flex items-center justify-between border-b border-neon-yellow pb-2 mb-1">
          <h2 className="font-press-start text-[10px] text-neon-yellow">
            COLLECTED
          </h2>
          <button
            type="button"
            onClick={() => setIsPinnedExpanded((prev) => !prev)}
            className="font-vt323 text-[11px] px-1.5 py-0.5 border border-neon-yellow/70 text-neon-yellow hover:bg-neon-yellow/20 transition-colors"
          >
            {isPinnedExpanded ? "COMPACT" : "EXPAND"}
          </button>
        </div>

        <div className="flex items-center justify-between text-[10px] font-vt323 text-gray-300 px-1 mb-2">
          <span>{summaries.length} types</span>
          <span>{totalPicks} total picks</span>
        </div>

        <div
          className={`space-y-1 overflow-y-auto pr-1 ${
            isExpanded ? "max-h-[39vh]" : "max-h-[62vh]"
          }`}
        >
          {summaries.map((upgrade) => {
            const isSelected = selectedType === upgrade.type;
            const isUpdated = recentlyUpdated.has(upgrade.type);
            const stackClass = getStackBadgeClass(upgrade.count);

            return (
              <button
                type="button"
                key={upgrade.type}
                onMouseEnter={() => setSelectedType(upgrade.type)}
                onFocus={() => setSelectedType(upgrade.type)}
                className={`w-full text-left flex items-center gap-2 py-1 px-1.5 border transition-all duration-150 ${
                  RARITY_COLORS[upgrade.rarity]
                } ${isSelected ? "ring-1 ring-neon-cyan/80" : ""} ${
                  isUpdated ? "shadow-[0_0_12px_rgba(255,255,0,0.35)]" : ""
                }`}
              >
                <div className="w-7 flex items-center justify-center text-lg">
                  {upgrade.emoji}
                </div>
                <div className="flex-1 min-w-0">
                  <p
                    className={`font-press-start text-[9px] truncate ${
                      RARITY_COLORS[upgrade.rarity].split(" ")[0]
                    }`}
                  >
                    {upgrade.displayTitle}
                  </p>
                  <p className="font-vt323 text-[10px] text-gray-400 truncate">
                    {upgrade.typeLabel}
                  </p>
                </div>
                {upgrade.count > 1 ? (
                  <div
                    className={`font-press-start text-[8px] px-1.5 py-0.5 border ${stackClass} ${
                      isUpdated ? "scale-110" : ""
                    } transition-transform`}
                  >
                    x{upgrade.count}
                  </div>
                ) : (
                  <div className="w-2 h-2 rounded-full bg-neon-yellow/70" />
                )}
                {upgrade.count >= 4 && (
                  <div className="w-2 h-2 rounded-full bg-fuchsia-400 animate-pulse" />
                )}
              </button>
            );
          })}
        </div>

        {isExpanded && (
          <div
            className={`mt-2 border border-neon-cyan/70 p-2 h-44 transition-colors ${
              detailsFlash ? "bg-cyan-800/30" : "bg-cyan-950/20"
            }`}
          >
            {selectedUpgrade ? (
              <>
                <div className="flex items-center justify-between gap-2 mb-1">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-lg">{selectedUpgrade.emoji}</span>
                    <p className="font-press-start text-[8px] text-neon-cyan truncate">
                      {selectedUpgrade.displayTitle}
                    </p>
                  </div>
                  <span className="font-press-start text-[7px] text-neon-yellow border border-neon-yellow/70 px-1 py-0.5">
                    INFO
                  </span>
                </div>
                <div className="min-h-[104px] space-y-1">
                  <div className="border border-white/20 bg-black/40 px-2 py-1">
                    <p className="font-vt323 text-[11px] leading-tight text-gray-100">
                      {selectedUpgrade.description}
                    </p>
                  </div>
                  <div className="grid grid-cols-[62px_1fr] gap-1 items-start border border-neon-cyan/40 bg-cyan-950/35 px-2 py-1">
                    <span className="font-press-start text-[6px] text-neon-cyan mt-0.5">
                      PER PICK
                    </span>
                    <p className="font-vt323 text-[11px] leading-tight text-neon-cyan">
                      {stripEffectPrefix(selectedUpgrade.perPickEffect, "Per pick:")}
                    </p>
                  </div>
                  <div className="grid grid-cols-[62px_1fr] gap-1 items-start border border-neon-yellow/40 bg-yellow-950/20 px-2 py-1">
                    <span className="font-press-start text-[6px] text-neon-yellow mt-0.5">
                      TOTAL
                    </span>
                    <p className="font-vt323 text-[11px] leading-tight text-neon-yellow">
                      {stripEffectPrefix(selectedUpgrade.totalEffect, "Total:")}
                    </p>
                  </div>
                </div>
              </>
            ) : (
              <div className="font-vt323 text-[12px] text-gray-400">
                Hover an upgrade to inspect details.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
