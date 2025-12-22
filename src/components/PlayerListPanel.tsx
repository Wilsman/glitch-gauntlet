import React from "react";
import type { Player } from "@shared/types";
import { Star, Skull } from "lucide-react";

interface PlayerListPanelProps {
  players: Player[];
  localPlayerId: string;
}

export default function PlayerListPanel({
  players,
  localPlayerId,
}: PlayerListPanelProps) {
  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 flex flex-row gap-2 z-50">
      {players
        .filter((p) => p.id !== localPlayerId)
        .map((player) => {
          const isLocalPlayer = player.id === localPlayerId;
          const isDead = player.status === "dead";
          const xpPercentage = (player.xp / player.xpToNextLevel) * 100;
          const healthPercentage = (player.health / player.maxHealth) * 100;

          return (
            <div
              key={player.id}
              className={`w-48 p-2 border-2 bg-black/80 backdrop-blur-sm transition-all duration-300 ${
                isDead
                  ? "border-gray-600 opacity-60"
                  : isLocalPlayer
                  ? "border-neon-cyan"
                  : "border-neon-pink"
              }`}
              style={{
                boxShadow: isDead
                  ? "none"
                  : isLocalPlayer
                  ? "0 0 10px #00FFFF"
                  : "0 0 10px #FF00FF",
              }}
            >
              {/* Player Name & Level */}
              <div className="flex items-center justify-between font-press-start text-xs mb-2">
                <span
                  className={
                    isDead
                      ? "text-gray-400"
                      : isLocalPlayer
                      ? "text-neon-cyan"
                      : "text-neon-pink"
                  }
                >
                  {player.name || `P${player.id.substring(0, 2).toUpperCase()}`}{" "}
                  {isLocalPlayer && "(YOU)"}
                </span>
                {isDead ? (
                  <div className="flex items-center gap-1 text-red-500">
                    <Skull className="w-3 h-3" />
                    <span className="text-[10px]">DOWN</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1 text-neon-yellow">
                    <Star className="w-3 h-3" fill="#FFFF00" />
                    <span className="text-[10px]">LVL {player.level}</span>
                  </div>
                )}
              </div>

              {/* Health Bar */}
              <div className="mb-1">
                <div className="flex justify-between items-center mb-1">
                  <span className="font-vt323 text-[10px] text-red-400">
                    HP
                  </span>
                  <span className="font-vt323 text-[10px] text-white">
                    {Math.ceil(player.health)}/{player.maxHealth}
                  </span>
                </div>
                <div className="w-full h-3 bg-red-900/50 border border-red-500">
                  <div
                    className="h-full bg-red-500 transition-all duration-300"
                    style={{ width: `${healthPercentage}%` }}
                  />
                </div>
              </div>

              {/* XP Bar */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <span className="font-vt323 text-[10px] text-purple-400">
                    XP
                  </span>
                  <span className="font-vt323 text-[10px] text-white">
                    {player.xp}/{player.xpToNextLevel}
                  </span>
                </div>
                <div className="w-full h-2 bg-purple-900/50 border border-purple-500">
                  <div
                    className="h-full bg-purple-500 transition-all duration-300"
                    style={{ width: `${xpPercentage}%` }}
                  />
                </div>
              </div>
            </div>
          );
        })}
    </div>
  );
}
