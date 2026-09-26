import type { CSSProperties, MouseEvent } from "react";
import type { UpgradeOption } from "@shared/types";
import { rarityFx } from "./rarityFx";
import { BACK_H, BACK_W } from "./cardBack";
import { shade } from "./pixelFx";

export type CardFate = "none" | "lock" | "drop";

interface PixelUpgradeCardProps {
  option: UpgradeOption;
  index: number;
  scale: number;
  revealed: boolean;
  hot: boolean;
  fate: CardFate;
  isShopPrompt: boolean;
  playerCoins: number;
  dealDelayMs: number;
  onActivate: () => void;
  onHover: (hovering: boolean) => void;
  buttonRef: (el: HTMLButtonElement | null) => void;
  innerRef: (el: HTMLDivElement | null) => void;
  backRef: (el: HTMLCanvasElement | null) => void;
}

// One level-up card: a canvas-painted back (cracked by the modal's frame loop) that shatters into a
// stepped flip onto a pixel face; the flip gets longer and spinnier with rarity.
export function PixelUpgradeCard({
  option, index, scale, revealed, hot, fate, isShopPrompt, playerCoins, dealDelayMs,
  onActivate, onHover, buttonRef, innerRef, backRef,
}: PixelUpgradeCardProps) {
  const fx = rarityFx(option.rarity);
  const cost = option.cost || 0;
  const unaffordable = isShopPrompt && !option.isSkipOption && cost > playerCoins;
  const style = { "--s": scale, "--deal": `${dealDelayMs}ms`, "--c": fx.color, "--a": fx.accent, "--deep": shade(fx.color, 0.45) } as CSSProperties;
  const moveGlare = (e: MouseEvent<HTMLButtonElement>) => {
    if (!revealed) return;
    const rect = e.currentTarget.getBoundingClientRect();
    e.currentTarget.style.setProperty("--gx", `${Math.round((e.clientX - rect.left) / 4) * 4 - 4}px`);
  };
  return (
    <button
      ref={buttonRef}
      type="button"
      data-testid={`upgrade-card-${index}`}
      aria-label={revealed ? `${fx.label} ${option.title}. ${option.description}` : `Face-down card ${index + 1}. Press ${index + 1} to pick.`}
      className={`pxu-card pxu-deal ${hot ? "hot" : ""} ${revealed ? "revealed" : ""} ${fate === "lock" ? "pxu-lock" : fate === "drop" ? "pxu-drop" : ""} ${fx.tier >= 3 ? "pxu-tier3" : ""}`}
      style={style}
      onPointerEnter={() => onHover(true)}
      onPointerLeave={() => onHover(false)}
      onPointerDown={() => onHover(true)}
      onMouseMove={moveGlare}
      onClick={(e) => { e.stopPropagation(); onActivate(); }}
    >
      {revealed && (
        <div className="pxu-rarity">
          <div className={`px-banded ${fx.tier >= 3 ? "pxu-rainbow" : fx.tier <= 1 ? "pxu-quick" : ""}`} style={{ "--c": fx.color, "--a": fx.accent, "--deep": shade(fx.color, 0.45) } as CSSProperties}>
            {`${fx.label}!`.split("").map((ch, i) => <span key={i} style={{ "--i": i } as CSSProperties}>{ch}</span>)}
          </div>
        </div>
      )}
      {fate === "lock" && <div className="pxu-stamp">LOCKED IN!</div>}
      <div className="pxu-lift">
        <div ref={innerRef} className="pxu-inner">
          <canvas
            ref={backRef}
            data-testid={`upgrade-card-back-${index}`}
            width={BACK_W}
            height={BACK_H}
            className="pxu-back"
            style={{ visibility: revealed ? "hidden" : "visible" }}
          />
          {/* Face stays mounted so its title is always in the DOM; it is only shown once revealed. */}
          <div className={`pxu-face ${revealed ? `pxu-flip-${fx.tier}` : ""}`} style={{ visibility: revealed ? "visible" : "hidden", filter: unaffordable ? "grayscale(0.7)" : undefined }}>
            <div className="px-card" style={{ "--c": fx.color, "--a": fx.accent } as CSSProperties}>
              <div className="px-frame px-notch">
                <div className="px-frame-color px-notch">
                  <div className="px-frame-inner px-notch flex h-full flex-col p-3 text-left">
                    <div className="flex items-center justify-between gap-2">
                      <span className="px-chip text-[8px] leading-none tracking-wider">{fx.label}</span>
                      <span className="flex gap-1.5">
                        {Array.from({ length: fx.tier + 1 }, (_, i) => <i key={i} className="pxu-pip" style={{ animationDelay: `${520 + i * 110}ms` }} />)}
                      </span>
                    </div>
                    <div className="px-window relative mt-3 flex min-h-0 flex-1 items-center justify-center">
                      <span className="px-emoji leading-none" style={{ fontSize: `${scale * 13}px` }}>{option.emoji || "🎁"}</span>
                      <i className="px-shine" />
                    </div>
                    <h3 className="px-plate mt-3 text-center text-[11px] leading-[15px]">{option.title}</h3>
                    <p className="px-body mt-2 text-center" style={{ fontSize: scale >= 5 ? 20 : 17, lineHeight: scale >= 5 ? "19px" : "16px" }}>{option.description}</p>
                    <div className="mt-auto pt-3">
                      {isShopPrompt && (
                        <div className={`pxu-cost mb-2 text-center ${unaffordable ? "broke" : ""}`}>{option.isSkipOption ? "NO COST" : `$${cost}`}</div>
                      )}
                      <span className={`pxu-select ${unaffordable ? "off" : ""}`}>
                        {fate === "lock" ? "LOCKED IN!" : unaffordable ? "NEED COINS" : option.isSkipOption ? "LEAVE SHOP" : "SELECT"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            {revealed && <div className="pxu-whiteout" />}
            {revealed && hot && <i className="pxu-glare" />}
          </div>
        </div>
      </div>
    </button>
  );
}
