import React, { useState, useMemo } from "react";
import {
  X,
  Trash2,
  Zap,
  Skull,
  Shield,
  Maximize2,
  Play,
  Pause,
  Search,
  Sword,
  TrendingUp,
  Ghost,
} from "lucide-react";
import { ALL_UPGRADES } from "@shared/upgrades";
import { ENEMY_CONFIGS } from "@shared/enemyConfig";
import { BOSS_CONFIGS } from "@shared/bossConfig";
import type { EnemyType, BossType, UpgradeType } from "@shared/types";
import { Button } from "@/components/ui/button";

interface TestingArenaPanelProps {
  onClose: () => void;
  engine: any; // LocalGameEngine instance
  isSandbox: boolean;
  isInvulnerable: boolean;
}

export default function TestingArenaPanel({
  onClose,
  engine,
  isSandbox,
  isInvulnerable,
}: TestingArenaPanelProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState<
    "enemies" | "bosses" | "upgrades" | "player"
  >("enemies");

  const filteredUpgrades = useMemo(() => {
    return ALL_UPGRADES.filter(
      (u) =>
        u.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.type.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [searchTerm]);

  const enemyTypes = Object.keys(ENEMY_CONFIGS) as EnemyType[];
  const bossTypes = Object.keys(BOSS_CONFIGS) as BossType[];

  const renderTabButton = (
    tab: typeof activeTab,
    icon: React.ReactNode,
    label: string
  ) => (
    <button
      onClick={() => setActiveTab(tab)}
      className={`flex items-center gap-2 px-4 py-2 border-b-2 transition-all ${
        activeTab === tab
          ? "border-neon-cyan text-neon-cyan bg-neon-cyan/10"
          : "border-transparent text-gray-500 hover:text-gray-300"
      }`}
    >
      {icon}
      <span className="font-press-start text-[10px] uppercase">{label}</span>
    </button>
  );

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-8 bg-black/60 backdrop-blur-sm pointer-events-auto">
      <div className="relative w-full max-w-4xl h-[80vh] bg-gray-900/90 border-2 border-neon-cyan rounded-xl shadow-[0_0_50px_rgba(0,255,255,0.3)] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 bg-black/40 border-b border-white/10">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-neon-cyan/20 rounded-lg">
              <Maximize2 className="w-6 h-6 text-neon-cyan" />
            </div>
            <div>
              <h2 className="text-xl text-white font-press-start flex items-center gap-3">
                TESTING ARENA{" "}
                <span className="text-xs text-neon-pink">
                  [SANDBOX_PROTO_V1]
                </span>
              </h2>
              <p className="text-sm text-neon-cyan/60 font-vt323 mt-1 tracking-widest uppercase">
                Direct Engine Manipulation Interface
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-full transition-colors group"
          >
            <X className="w-8 h-8 text-gray-400 group-hover:text-neon-pink" />
          </button>
        </div>

        {/* Global Controls Bar */}
        <div className="flex items-center gap-4 p-4 bg-black/20 border-b border-white/10 overflow-x-auto no-scrollbar">
          <Button
            onClick={() => engine.debugToggleSandbox(!isSandbox)}
            className={`flex items-center gap-2 font-press-start text-[10px] py-4 h-auto ${
              isSandbox
                ? "bg-neon-yellow text-black"
                : "bg-gray-800 text-gray-400"
            }`}
          >
            {isSandbox ? (
              <Play className="w-4 h-4 fill-current" />
            ) : (
              <Pause className="w-4 h-4 fill-current" />
            )}
            SANDBOX MODE: {isSandbox ? "ACTIVE" : "DISABLED"}
          </Button>

          <Button
            variant="destructive"
            onClick={() => engine.debugClearEnemies()}
            className="flex items-center gap-2 font-press-start text-[10px] py-4 h-auto"
          >
            <Trash2 className="w-4 h-4" />
            CLEAR ARENA
          </Button>

          <div className="h-8 w-[1px] bg-white/10 mx-2" />

          <Button
            onClick={() => engine.debugTriggerBossRound()}
            className="flex items-center gap-2 bg-neon-pink hover:bg-neon-pink/80 font-press-start text-[10px] py-4 h-auto text-white shadow-[0_0_15px_rgba(255,0,255,0.3)]"
          >
            <Skull className="w-4 h-4" />
            FORCE BOSS ROUND
          </Button>
        </div>

        {/* Tabs */}
        <div className="flex bg-black/40 border-b border-white/10">
          {renderTabButton("enemies", <Ghost className="w-4 h-4" />, "Enemies")}
          {renderTabButton("bosses", <Skull className="w-4 h-4" />, "Bosses")}
          {renderTabButton("upgrades", <Zap className="w-4 h-4" />, "Upgrades")}
          {renderTabButton(
            "player",
            <TrendingUp className="w-4 h-4" />,
            "Stats"
          )}
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6 bg-black/20 custom-scrollbar">
          {activeTab === "enemies" && (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {enemyTypes.map((type) => (
                <button
                  key={type}
                  onClick={() => engine.debugSpawnEnemy(type)}
                  className="group flex items-center justify-between p-4 bg-gray-800/50 border border-white/5 hover:border-neon-cyan/50 rounded-lg transition-all"
                >
                  <div className="flex flex-col items-start">
                    <span className="text-[10px] font-press-start text-white group-hover:text-neon-cyan uppercase">
                      {type}
                    </span>
                    <span className="text-xs text-gray-500 font-vt323 mt-1">
                      HP: {ENEMY_CONFIGS[type].baseHealth} | SPD:{" "}
                      {ENEMY_CONFIGS[type].baseSpeed}
                    </span>
                  </div>
                  <Play className="w-4 h-4 text-neon-cyan opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
              ))}
            </div>
          )}

          {activeTab === "bosses" && (
            <div className="grid grid-cols-2 gap-4">
              {bossTypes.map((type) => (
                <button
                  key={type}
                  onClick={() => engine.debugSpawnBoss(type)}
                  className="group flex items-center justify-between p-5 bg-red-950/20 border border-red-500/20 hover:border-red-500 rounded-lg transition-all"
                >
                  <div className="flex flex-col items-start">
                    <span className="text-xs font-press-start text-red-500 uppercase">
                      {type.replace("-", " ")}
                    </span>
                    <span className="text-sm text-gray-400 font-vt323 mt-1">
                      HP: {BOSS_CONFIGS[type].baseHealth} | ATTACK CD:{" "}
                      {BOSS_CONFIGS[type].attackCooldown}ms
                    </span>
                  </div>
                  <Skull className="w-6 h-6 text-red-500 shadow-glow-red" />
                </button>
              ))}
            </div>
          )}

          {activeTab === "upgrades" && (
            <div className="flex flex-col gap-6">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input
                  type="text"
                  placeholder="SEARCH UPGRADES..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-black/40 border border-white/10 rounded-lg py-3 pl-10 pr-4 text-white font-press-start text-[10px] focus:border-neon-cyan outline-none transition-colors"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {filteredUpgrades.map((upgrade, idx) => (
                  <button
                    key={`${upgrade.type}-${idx}`}
                    onClick={() =>
                      engine.debugGiveUpgrade(upgrade.type as UpgradeType)
                    }
                    className={`
                      flex items-center gap-4 p-3 bg-gray-800/40 border border-white/5 hover:border-white/20 rounded-lg group transition-all
                      ${
                        upgrade.rarity === "legendary"
                          ? "hover:border-neon-pink/50 bg-neon-pink/5"
                          : ""
                      }
                      ${
                        upgrade.rarity === "boss"
                          ? "hover:border-neon-yellow/50 bg-neon-yellow/5"
                          : ""
                      }
                    `}
                  >
                    <div
                      className={`
                      w-10 h-10 rounded-lg flex items-center justify-center text-xl
                      ${upgrade.rarity === "common" ? "bg-gray-700" : ""}
                      ${upgrade.rarity === "uncommon" ? "bg-green-900/50" : ""}
                      ${upgrade.rarity === "legendary" ? "bg-neon-pink/20" : ""}
                      ${upgrade.rarity === "boss" ? "bg-neon-yellow/20" : ""}
                      ${upgrade.rarity === "void" ? "bg-purple-950/50" : ""}
                      ${upgrade.rarity === "lunar" ? "bg-neon-cyan/20" : ""}
                    `}
                    >
                      {upgrade.emoji}
                    </div>
                    <div className="flex-1 text-left min-w-0">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-press-start text-white truncate uppercase">
                          {upgrade.title}
                        </span>
                        <span
                          className={`text-[8px] font-press-start px-2 py-0.5 rounded uppercase ${
                            upgrade.rarity === "legendary"
                              ? "bg-neon-pink text-white"
                              : "text-gray-500"
                          }`}
                        >
                          {upgrade.rarity}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 font-vt323 truncate mt-0.5">
                        {upgrade.description}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {activeTab === "player" && (
            <div className="flex flex-col gap-6">
              <div className="grid grid-cols-2 gap-4">
                <Button
                  onClick={() =>
                    engine.debugSetInvulnerability(!isInvulnerable)
                  }
                  className={`flex flex-col items-center gap-3 py-10 h-auto border-2 transition-all ${
                    isInvulnerable
                      ? "bg-neon-cyan/20 border-neon-cyan text-neon-cyan"
                      : "bg-gray-800/40 border-white/10 text-gray-400"
                  }`}
                >
                  <Shield
                    className={`w-12 h-12 ${
                      isInvulnerable ? "animate-pulse" : ""
                    }`}
                  />
                  <span className="font-press-start text-[10px]">
                    GOD MODE: {isInvulnerable ? "ON" : "OFF"}
                  </span>
                </Button>

                <Button
                  onClick={() => engine.debugLevelUp()}
                  className="flex flex-col items-center gap-3 py-10 h-auto bg-purple-900/20 border-2 border-purple-500/20 text-purple-400 hover:border-purple-500 hover:bg-purple-900/30 transition-all shadow-[0_0_20px_rgba(168,85,247,0.1)]"
                >
                  <TrendingUp className="w-12 h-12" />
                  <span className="font-press-start text-[10px]">
                    INSTANT LEVEL UP
                  </span>
                </Button>
              </div>

              <div className="p-6 bg-black/40 rounded-xl border border-white/5">
                <h3 className="text-xs font-press-start text-neon-cyan flex items-center gap-2 mb-4 uppercase">
                  <Sword className="w-4 h-4" /> RE-EQUIP WEAPONRY
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {[
                    "rapid-fire",
                    "grenade-launcher",
                    "sniper-shot",
                    "burst-fire",
                    "heavy-cannon",
                    "shotgun",
                  ].map((w) => (
                    <button
                      key={w}
                      onClick={() => {
                        const player = engine.getGameState().players[0];
                        if (player) {
                          player.weaponType = w;
                          engine.triggerScreenShake(5, 200);
                        }
                      }}
                      className="px-3 py-2 bg-gray-800/40 hover:bg-neon-cyan/20 border border-white/5 hover:border-neon-cyan/50 rounded font-vt323 text-lg text-gray-400 hover:text-neon-cyan transition-all uppercase"
                    >
                      {w.replace("-", " ")}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-black/60 border-t border-white/10 flex justify-between items-center text-[10px] font-vt323 tracking-widest text-gray-600">
          <div className="flex gap-4 uppercase">
            <span>ENGINE_VER: LOCAL_LATEST</span>
            <span>BUILD: 2025.12.22</span>
          </div>
          <p className="uppercase">
            Warning: Debug actions may affect stability
          </p>
        </div>
      </div>
    </div>
  );
}
