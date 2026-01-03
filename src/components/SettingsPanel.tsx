import { useState } from "react";
import { Settings, User, Edit2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PlayerNameDialog } from "@/components/PlayerNameDialog";
import { AudioSettingsPanel } from "@/components/AudioSettingsPanel";
import { MusicSelectionPanel } from "@/components/MusicSelectionPanel";
import {
  getPlayerName,
  setPlayerName as savePlayerName,
} from "@/lib/progressionStorage";
import { toast } from "@/components/ui/sonner";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";

interface SettingsPanelProps {
  className?: string;
}

export function SettingsPanel({ className }: SettingsPanelProps) {
  const [showNameDialog, setShowNameDialog] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [playerName, setPlayerNameState] = useState(() => getPlayerName());

  function handleNameChange(name: string) {
    savePlayerName(name);
    setPlayerNameState(name);
    setShowNameDialog(false);
    toast.success("Name updated!", {
      description: `Your name has been changed to ${name}`,
    });
  }

  return (
    <>
      <PlayerNameDialog
        open={showNameDialog}
        onNameSubmit={handleNameChange}
        initialName={playerName || ""}
      />

      <div
        className={cn(
          "pointer-events-none fixed right-4 top-0 z-50 w-80 rounded-b-lg border border-neon-cyan/40 bg-black/95 text-white shadow-[0_0_20px_rgba(0,255,255,0.3)] backdrop-blur-xl transition-all duration-500 ease-out",
          isExpanded
            ? "translate-y-0 opacity-100 ring-2 ring-neon-cyan/20 pointer-events-auto"
            : "-translate-y-full opacity-90",
          "group",
          className
        )}
        onMouseEnter={() => setIsExpanded(true)}
        onMouseLeave={() => setIsExpanded(false)}
      >
        {/* Hover Tab */}
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-full w-32 h-10 bg-black/90 border-2 border-t-0 border-neon-cyan flex items-center justify-center group-hover:bg-neon-cyan/20 transition-all duration-300 rounded-b-xl shadow-[0_4px_10px_rgba(0,255,255,0.2)] pointer-events-auto">
          <Settings
            className={cn(
              "h-4 w-4 text-neon-cyan mr-2 transition-transform duration-500",
              isExpanded && "rotate-180"
            )}
          />
          <span className="font-press-start text-[10px] text-neon-cyan tracking-tighter">
            SETTINGS
          </span>
        </div>

        <ScrollArea className="h-[500px] w-full pr-4">
          <div className="p-5 space-y-8">
            {/* Player Name Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-3 border-b border-neon-cyan/30 pb-2">
                <User className="h-5 w-5 text-neon-cyan drop-shadow-glow-cyan" />
                <span className="font-press-start text-xs tracking-wider text-neon-cyan">
                  Identity
                </span>
              </div>

              <div className="flex items-center justify-between gap-2 bg-white/5 p-3 rounded-lg border border-white/10 hover:border-neon-yellow/30 transition-colors group/item">
                <div className="flex-1 min-w-0">
                  <p className="font-press-start text-[8px] text-neon-pink/70 mb-1.5 uppercase tracking-widest">
                    Operator Name
                  </p>
                  <p className="font-vt323 text-xl text-neon-yellow truncate leading-none">
                    {playerName || "ANONYMOUS"}
                  </p>
                </div>
                <Button
                  onClick={() => setShowNameDialog(true)}
                  size="sm"
                  className="font-press-start text-[8px] bg-transparent border border-neon-yellow text-neon-yellow hover:bg-neon-yellow hover:text-black transition-all duration-300 h-8 px-3 shrink-0 shadow-[0_0_10px_rgba(255,255,0,0.1)]"
                >
                  <Edit2 className="h-3 w-3 mr-1" />
                  EDIT
                </Button>
              </div>
            </div>

            {/* Audio Settings Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-3 border-b border-neon-cyan/30 pb-2">
                <Settings className="h-5 w-5 text-neon-cyan rotate-90" />
                <span className="font-press-start text-xs tracking-wider text-neon-cyan">
                  Frequencies
                </span>
              </div>
              <div className="bg-white/5 p-4 rounded-lg border border-white/10">
                <AudioSettingsPanel embedded />
              </div>
            </div>

            {/* Music Library Section */}
            <div className="space-y-4 pb-4">
              <MusicSelectionPanel />
            </div>
          </div>
        </ScrollArea>
      </div>
    </>
  );
}
