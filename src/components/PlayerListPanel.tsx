import React from "react";
import type { Player } from "@shared/types";
import { Skull } from "lucide-react";

interface PlayerListPanelProps {
  players: Player[];
  localPlayerId: string;
}

export default function PlayerListPanel({
  players,
  localPlayerId,
}: PlayerListPanelProps) {
  return (
    <div className="fixed left-4 top-1/2 z-50 flex w-44 -translate-y-1/2 flex-col gap-1.5">
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
              className={`rounded-md border border-white/10 bg-slate-950/70 px-2 py-1.5 backdrop-blur-sm transition-all duration-300 ${
                isDead ? "opacity-60" : ""
              }`}
            >
              {/* Player Name & Level */}
              <div className="flex items-center justify-between font-press-start text-[8px]">
                <span
                  className={`truncate ${
                    isDead
                      ? "text-slate-500"
                      : isLocalPlayer
                      ? "text-cyan-300"
                      : "text-white"
                  }`}
                >
                  {player.name || `P${player.id.substring(0, 2).toUpperCase()}`}{" "}
                  {isLocalPlayer && "(YOU)"}
                </span>
                {isDead ? (
                  <div className="flex items-center gap-1 text-red-500">
                    <Skull className="w-3 h-3" />
                    <span className="text-[7px]">DOWN</span>
                  </div>
                ) : (
                  <span className="shrink-0 text-[7px] text-yellow-300">
                    LV {player.level}
                  </span>
                )}
              </div>

              {/* Health Bar */}
              <div className="mt-1.5">
                <div className="flex justify-between items-center">
                  <span className="font-press-start text-[6px] tracking-widest text-slate-400">
                    HP
                  </span>
                  <span className="font-press-start text-[6px] text-white">
                    {Math.ceil(player.health)}/{player.maxHealth}
                  </span>
                </div>
                <div className="mt-0.5 h-1 rounded-sm bg-white/10">
                  <div
                    className="h-full rounded-sm bg-red-500 transition-all duration-300"
                    style={{ width: `${healthPercentage}%` }}
                  />
                </div>
              </div>

              {/* XP Bar */}
              <div className="mt-1">
                <div className="flex justify-between items-center">
                  <span className="font-press-start text-[6px] tracking-widest text-slate-400">
                    XP
                  </span>
                  <span className="font-press-start text-[6px] text-white">
                    {Math.floor(player.xp)}/{player.xpToNextLevel}
                  </span>
                </div>
                <div className="mt-0.5 h-0.5 rounded-sm bg-white/10">
                  <div
                    className="h-full rounded-sm bg-violet-500 transition-all duration-300"
                    style={{ width: `${xpPercentage}%` }}
                  />
                </div>
                <div className="mt-0.5 text-right font-press-start text-[6px] text-yellow-300">
                  {Math.floor(player.coins || 0)} COINS
                </div>
              </div>
            </div>
          );
        })}
    </div>
  );
}
