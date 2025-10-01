import { useState } from 'react';
import { Settings, User, Edit2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PlayerNameDialog } from '@/components/PlayerNameDialog';
import { AudioSettingsPanel } from '@/components/AudioSettingsPanel';
import { getPlayerName, setPlayerName as savePlayerName } from '@/lib/progressionStorage';
import { toast } from '@/components/ui/sonner';
import { cn } from '@/lib/utils';

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
    toast.success('Name updated!', {
      description: `Your name has been changed to ${name}`,
    });
  }

  return (
    <>
      <PlayerNameDialog
        open={showNameDialog}
        onNameSubmit={handleNameChange}
        initialName={playerName || ''}
      />

      <div
        className={cn(
          'pointer-events-auto w-72 rounded-lg border border-neon-cyan/40 bg-black/90 p-4 text-white shadow-[0_0_15px_rgba(0,255,255,0.25)] backdrop-blur transition-all duration-300',
          isExpanded ? 'translate-y-0' : '-translate-y-[calc(100%-3rem)]',
          'group',
          className
        )}
        onMouseEnter={() => setIsExpanded(true)}
        onMouseLeave={() => setIsExpanded(false)}
      >
        {/* Hover Tab */}
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-full w-28 h-8 bg-neon-cyan/20 border-2 border-t-0 border-neon-cyan flex items-center justify-center group-hover:bg-neon-cyan/40 transition-colors rounded-b-lg">
          <Settings className="h-3 w-3 text-neon-cyan mr-1" />
          <span className="font-press-start text-[8px] text-neon-cyan">SETTINGS</span>
        </div>

        <div className="space-y-6">
          {/* Player Name Section */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 border-b border-neon-cyan/30 pb-2">
              <User className="h-4 w-4 text-neon-cyan" />
              <span className="font-press-start text-xs tracking-wide text-neon-cyan">Player</span>
            </div>
            
            <div className="flex items-center justify-between gap-2">
              <div className="flex-1 min-w-0">
                <p className="font-press-start text-[10px] text-neon-pink/70 mb-1">Name</p>
                <p className="font-vt323 text-lg text-neon-yellow truncate">
                  {playerName || 'Not Set'}
                </p>
              </div>
              <Button
                onClick={() => setShowNameDialog(true)}
                size="sm"
                className="font-press-start text-[10px] bg-transparent border border-neon-yellow text-neon-yellow hover:bg-neon-yellow hover:text-black transition-all duration-300 h-8 px-3"
              >
                <Edit2 className="h-3 w-3 mr-1" />
                Edit
              </Button>
            </div>
          </div>

          {/* Audio Settings Section */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 border-b border-neon-cyan/30 pb-2">
              <span className="font-press-start text-xs tracking-wide text-neon-cyan">Audio</span>
            </div>
            <AudioSettingsPanel embedded />
          </div>
        </div>
      </div>
    </>
  );
}
