import { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { validatePlayerName } from '@shared/nameValidation';

interface PlayerNameDialogProps {
  open: boolean;
  onNameSubmit: (name: string) => void;
  initialName?: string;
}

export function PlayerNameDialog({ open, onNameSubmit, initialName = '' }: PlayerNameDialogProps) {
  const [name, setName] = useState(initialName);
  const [error, setError] = useState('');

  useEffect(() => {
    setName(initialName);
  }, [initialName]);

  const handleSubmit = useCallback(() => {
    const { error: validationError, normalizedName } = validatePlayerName(name);
    
    if (validationError) {
      setError(validationError);
      return;
    }
    
    onNameSubmit(normalizedName);
  }, [name, onNameSubmit]);

  const handleNameChange = useCallback((value: string) => {
    setName(value);
    if (error) {
      setError('');
    }
  }, [error]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSubmit();
    }
  }, [handleSubmit]);

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-md bg-black border-2 border-neon-cyan" onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="font-press-start text-xl text-neon-yellow">
            Choose Your Name
          </DialogTitle>
          <DialogDescription className="font-vt323 text-lg text-neon-cyan">
            This name will be used for the leaderboard. Choose wisely!
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="player-name" className="font-press-start text-sm text-neon-pink">
              Player Name
            </Label>
            <Input
              id="player-name"
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Enter your name"
              maxLength={20}
              className="font-vt323 text-lg bg-black border-2 border-neon-cyan text-neon-cyan placeholder:text-neon-cyan/50 focus:ring-neon-cyan"
              autoFocus
            />
            {error && (
              <p className="font-vt323 text-sm text-red-500 animate-pulse">
                {error}
              </p>
            )}
          </div>
          
          <div className="font-vt323 text-sm text-neon-cyan/70 space-y-1">
            <p>- 2-20 characters</p>
            <p>- Letters, numbers, spaces, hyphens, underscores only</p>
            <p>- Keep it clean!</p>
          </div>
        </div>
        
        <DialogFooter>
          <Button
            onClick={handleSubmit}
            className="w-full font-press-start bg-transparent border-2 border-neon-yellow text-neon-yellow hover:bg-neon-yellow hover:text-black transition-all duration-300"
          >
            Continue
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

