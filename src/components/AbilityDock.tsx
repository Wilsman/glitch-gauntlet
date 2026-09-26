import type { CSSProperties, ReactNode } from "react";
import type { Player } from "@shared/types";
import type { ExplorationState } from "@shared/exploration";
import { Zap } from "lucide-react";
import { getCharacter } from "@shared/characterConfig";

interface AbilityDockProps {
  player: Player;
  exploration?: ExplorationState | null;
}

const TILE =
  "relative flex h-11 w-11 items-center justify-center overflow-hidden rounded-md border border-white/10 bg-slate-950/85";

function KeyChip({ label }: { label: string }) {
  return (
    <div className="mt-1 text-center font-press-start text-[7px] tracking-widest text-slate-400">
      {label}
    </div>
  );
}

function Tile({
  title,
  caption,
  children,
  className = "",
  style,
}: {
  title?: string;
  caption?: string;
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <div className="flex flex-col items-center">
      <div className={`${TILE} ${className}`} title={title} style={style}>
        {children}
      </div>
      <KeyChip label={caption || " "} />
    </div>
  );
}

export function AbilityDock({ player, exploration = null }: AbilityDockProps) {
  const characterType = player.characterType || "spray-n-pray";
  const character = getCharacter(characterType);
  const cooldownMs = player.abilityCooldown || 0;
  const onCooldown = cooldownMs > 0;
  const isActive = !!player.isAbilityActive;
  const abilityLabel = exploration && characterType === "dash-dynamo"
    ? "Overdrive"
    : character.abilityName;

  const ultimateClasses = isActive
    ? "border-pink-400 animate-pulse"
    : onCooldown
      ? ""
      : "border-white/60";

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="font-press-start text-[7px] uppercase tracking-widest text-slate-400">
        {abilityLabel}
      </div>
      <div className="flex items-start gap-2">
        {characterType === "dash-dynamo" && (
          <Tile
            caption="SPACE"
            title="Blink dash"
            className={player.blinkReady ? "border-cyan-300/50" : ""}
          >
            {player.blinkReady ? (
              <span className="font-press-start text-[7px] text-cyan-200">READY</span>
            ) : (
              <span className="font-press-start text-[9px] text-white">
                {((player.blinkCooldown || 0) / 1000).toFixed(1)}s
              </span>
            )}
          </Tile>
        )}
        {characterType === "null-ronin" && (
          <Tile caption="" title="Combo finisher">
            <span
              className={`font-press-start text-[8px] ${
                (player.meleeComboStep || 0) >= 2 ? "text-yellow-300" : "text-cyan-200"
              }`}
            >
              {(player.meleeComboStep || 0) >= 2
                ? "READY"
                : `${(player.meleeComboStep || 0) + 1}/3`}
            </span>
          </Tile>
        )}
        {characterType === "vampire-vex" && (
          <Tile caption="" title="Drain radius">
            <span className="font-press-start text-[9px] text-red-300">
              {(player.vampireDrainRadius || 0).toFixed(0)}
            </span>
          </Tile>
        )}
        {characterType === "turret-tina" && !exploration && (
          <Tile caption="E" title="Place turret">
            <span className="font-press-start text-[7px] text-orange-300">READY</span>
          </Tile>
        )}
        {exploration && characterType === "dash-dynamo" && (
          <>
            <Tile caption="" title="Momentum">
              <div className="flex gap-[2px]">
                {Array.from({ length: 10 }, (_, i) => (
                  <div
                    key={i}
                    className="h-3 w-1 -skew-x-12"
                    style={{
                      backgroundColor:
                        i < Math.round(exploration.momentum * 10)
                          ? i > 6
                            ? "#f0abfc"
                            : "#22d3ee"
                          : "#1e293b",
                    }}
                  />
                ))}
              </div>
            </Tile>
            <Tile caption="SHIFT" title="Slide">
              <span
                className={`font-press-start text-[7px] ${
                  exploration.slideCooldownMs > 0 ? "text-white" : "text-cyan-200"
                }`}
              >
                {exploration.slideCooldownMs > 0
                  ? `${(exploration.slideCooldownMs / 1000).toFixed(1)}s`
                  : "READY"}
              </span>
            </Tile>
          </>
        )}
        {exploration && characterType === "turret-tina" && (
          <Tile
            caption="Q/X"
            title={
              exploration.established
                ? "Established · nearby turrets fire 30% faster"
                : "Hold still to establish"
            }
            className={exploration.established ? "border-orange-300/60" : ""}
          >
            <span
              className={`font-press-start text-[7px] ${
                exploration.established ? "text-orange-200" : "text-slate-400"
              }`}
            >
              {exploration.established ? "EST." : "HOLD"}
            </span>
          </Tile>
        )}
        <Tile
          caption="Q"
          title={character.abilityName}
          className={ultimateClasses}
        >
          <Zap
            className={`h-4 w-4 ${
              isActive ? "text-pink-300" : onCooldown ? "text-slate-500" : "text-white"
            }`}
          />
          {onCooldown && (
            <div className="absolute inset-0 flex items-end justify-center bg-gradient-to-t from-black/85 via-black/40 to-transparent">
              <span className="mb-0.5 font-press-start text-[8px] text-white">
                {(cooldownMs / 1000).toFixed(1)}
              </span>
            </div>
          )}
          {isActive && (
            <div className="absolute inset-x-0 bottom-0 flex justify-center bg-black/60">
              <span className="font-press-start text-[8px] text-pink-200">
                {((player.abilityDuration || 0) / 1000).toFixed(1)}s
              </span>
            </div>
          )}
        </Tile>
      </div>
    </div>
  );
}
