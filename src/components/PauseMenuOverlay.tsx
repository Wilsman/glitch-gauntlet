import { AudioSettingsPanel } from "@/components/AudioSettingsPanel";
import { MusicSelectionPanel } from "@/components/MusicSelectionPanel";
import { Button } from "@/components/ui/button";
import { Play, RotateCcw, Home, Volume2 } from "lucide-react";

interface PauseMenuOverlayProps {
  open: boolean;
  onResume: () => void;
  onRestartRun: () => void;
  onExitToMenu: () => void;
}

export function PauseMenuOverlay({
  open,
  onResume,
  onRestartRun,
  onExitToMenu,
}: PauseMenuOverlayProps) {
  if (!open) {
    return null;
  }

  return (
    <div
      className="absolute inset-0 z-[90] flex items-center justify-center bg-black/70 px-4 py-6 backdrop-blur-md transition-all duration-200"
      aria-hidden={false}
    >
      <div
        className="pointer-events-auto grid w-full max-w-5xl translate-y-0 scale-100 gap-5 rounded-[28px] border border-neon-cyan/40 bg-[radial-gradient(circle_at_top,rgba(20,40,55,0.95),rgba(3,7,18,0.98))] p-5 shadow-[0_0_45px_rgba(34,211,238,0.18)] transition-all duration-200 md:grid-cols-[minmax(280px,360px)_1fr]"
        role="dialog"
        aria-modal="true"
        aria-label="Pause menu"
      >
        <section className="rounded-[22px] border border-neon-pink/25 bg-black/35 p-5">
          <p className="font-press-start text-[10px] uppercase tracking-[0.35em] text-neon-cyan/70">
            Run Paused
          </p>
          <h2 className="mt-3 font-press-start text-2xl text-white md:text-3xl">
            Tactical Menu
          </h2>
          <p className="mt-3 font-vt323 text-2xl leading-6 text-white/70">
            Tweak the mix, restart this run, or bail back to operator select.
          </p>

          <div className="mt-6 grid gap-3">
            <Button
              onClick={onResume}
              className="h-12 justify-start border border-neon-cyan/60 bg-neon-cyan/12 font-press-start text-[10px] uppercase tracking-[0.2em] text-neon-cyan hover:bg-neon-cyan hover:text-black"
            >
              <Play className="h-4 w-4" />
              Resume Run
            </Button>
            <Button
              onClick={onRestartRun}
              variant="outline"
              className="h-12 justify-start border-neon-yellow/55 bg-neon-yellow/10 font-press-start text-[10px] uppercase tracking-[0.2em] text-neon-yellow hover:bg-neon-yellow hover:text-black"
            >
              <RotateCcw className="h-4 w-4" />
              Restart Run
            </Button>
            <Button
              onClick={onExitToMenu}
              variant="outline"
              className="h-12 justify-start border-neon-pink/55 bg-neon-pink/10 font-press-start text-[10px] uppercase tracking-[0.2em] text-neon-pink hover:bg-neon-pink hover:text-black"
            >
              <Home className="h-4 w-4" />
              Exit To Menu
            </Button>
          </div>

          <div className="mt-5 rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
            <div className="flex items-center gap-2 text-neon-cyan">
              <Volume2 className="h-4 w-4" />
              <span className="font-press-start text-[9px] uppercase tracking-[0.25em]">
                Quick Resume
              </span>
            </div>
            <p className="mt-2 font-vt323 text-xl text-white/70">
              Press <span className="text-neon-yellow">Esc</span> again to drop
              back into the fight.
            </p>
          </div>
        </section>

        <section className="grid gap-5">
          <div className="rounded-[22px] border border-neon-cyan/25 bg-black/35 p-5">
            <div className="mb-4 flex items-center gap-3 border-b border-neon-cyan/20 pb-3">
              <Volume2 className="h-5 w-5 text-neon-cyan" />
              <div>
                <p className="font-press-start text-[10px] uppercase tracking-[0.25em] text-neon-cyan">
                  Audio Routing
                </p>
                <p className="font-vt323 text-xl text-white/60">
                  Master, music, and SFX without leaving the run.
                </p>
              </div>
            </div>
            <AudioSettingsPanel embedded />
          </div>

          <div className="rounded-[22px] border border-neon-yellow/20 bg-black/35 p-5">
            <MusicSelectionPanel />
          </div>
        </section>
      </div>
    </div>
  );
}
