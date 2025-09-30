import { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import * as LeoProfanity from 'leo-profanity';

interface PlayerNameDialogProps {
  open: boolean;
  onNameSubmit: (name: string) => void;
  initialName?: string;
}

export function PlayerNameDialog({ open, onNameSubmit, initialName = '' }: PlayerNameDialogProps) {
  const [name, setName] = useState(initialName);
  const [error, setError] = useState('');

  useEffect(() => {
    // Initialize profanity filter
    LeoProfanity.loadDictionary('en');
  }, []);

  function validateName(value: string): string | null {
    const trimmed = value.trim();
    
    if (trimmed.length === 0) {
      return 'Please enter a name';
    }
    
    if (trimmed.length < 2) {
      return 'Name must be at least 2 characters';
    }
    
    if (trimmed.length > 20) {
      return 'Name must be 20 characters or less';
    }
    
    if (!/^[a-zA-Z0-9_\s-]+$/.test(trimmed)) {
      return 'Name can only contain letters, numbers, spaces, hyphens, and underscores';
    }
    
    if (LeoProfanity.check(trimmed)) {
      return 'Please choose a more appropriate name';
    }
    
    return null;
  }

  const handleSubmit = useCallback(() => {
    const validationError = validateName(name);
    
    if (validationError) {
      setError(validationError);
      return;
    }
    
    onNameSubmit(name.trim());
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
            <p>• 2-20 characters</p>
            <p>• Letters, numbers, spaces, hyphens, underscores only</p>
            <p>• Keep it clean!</p>
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
