import { useState, useEffect, useCallback } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { getCharacter } from '@shared/characterConfig';
import type { LeaderboardCategory, LeaderboardEntry } from '@shared/types';
import { getLeaderboard } from '@/lib/leaderboardApi';
import { Loader2, RefreshCw } from 'lucide-react';
import { LeaderboardResetCountdown } from './LeaderboardResetCountdown';


function formatTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

function formatTimeAgo(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(hours / 24);
  
  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  return 'Just now';
}

interface LeaderboardEntryRowProps {
  entry: LeaderboardEntry;
  rank: number;
  category: LeaderboardCategory;
}

function LeaderboardEntryRow({ entry, rank, category }: LeaderboardEntryRowProps) {
  const character = getCharacter(entry.characterType);
  
  const getRankColor = (rank: number) => {
    if (rank === 1) return 'text-neon-yellow';
    if (rank === 2) return 'text-gray-300';
    if (rank === 3) return 'text-orange-400';
    return 'text-neon-cyan';
  };

  const getPrimaryValue = () => {
    switch (category) {
      case 'highest-wave':
        return `Wave ${entry.waveReached}`;
      case 'most-kills':
        return `${entry.enemiesKilled} kills`;
      case 'longest-survival':
        return formatTime(entry.survivalTimeMs);
      case 'fastest-victory':
        return formatTime(entry.survivalTimeMs);
    }
  };

  return (
    <div className="flex items-center gap-3 p-3 bg-black/40 border border-neon-cyan/20 rounded hover:border-neon-cyan/50 transition-colors">
      {/* Rank */}
      <div className={`font-press-start text-lg w-8 text-center ${getRankColor(rank)}`}>
        {rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `#${rank}`}
      </div>

      {/* Character Emoji */}
      <div className="text-2xl">
        {character.emoji}
      </div>

      {/* Player Info */}
      <div className="flex-1 min-w-0">
        <p className="font-press-start text-sm text-white truncate">
          {entry.playerName}
        </p>
        <p className="font-vt323 text-base text-neon-cyan/70">
          {formatTimeAgo(entry.createdAt)}
        </p>
      </div>

      {/* Primary Stat */}
      <div className="font-press-start text-base text-neon-yellow text-right">
        {getPrimaryValue()}
      </div>
    </div>
  );
}

export function LeaderboardPanel() {
  const [activeCategory, setActiveCategory] = useState<LeaderboardCategory>('highest-wave');
  const [entries, setEntries] = useState<Record<LeaderboardCategory, LeaderboardEntry[]>>({
    'highest-wave': [],
    'most-kills': [],
    'longest-survival': [],
    'fastest-victory': [],
  });
  const [loading, setLoading] = useState<Record<LeaderboardCategory, boolean>>({
    'highest-wave': false,
    'most-kills': false,
    'longest-survival': false,
    'fastest-victory': false,
  });
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<number>(0);
  const [cooldownRemaining, setCooldownRemaining] = useState<number>(0);

  const fetchLeaderboard = useCallback(async (category: LeaderboardCategory, updateRefreshTime = false) => {
    setLoading(prev => ({ ...prev, [category]: true }));
    setError(null);
    try {
      const response = await getLeaderboard(category, 10);
      setEntries(prev => ({ ...prev, [category]: response.entries }));
      if (updateRefreshTime) {
        setLastRefresh(Date.now());
      }
    } catch (err) {
      console.error('Failed to fetch leaderboard:', err);
      setError('Failed to load leaderboard');
    } finally {
      setLoading(prev => ({ ...prev, [category]: false }));
    }
  }, []);

  useEffect(() => {
    void fetchLeaderboard(activeCategory, true);
  }, [activeCategory, fetchLeaderboard]);

  useEffect(() => {
    if (cooldownRemaining <= 0) return;
    const timer = setInterval(() => {
      setCooldownRemaining(prev => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldownRemaining]);

  const handleRefresh = () => {
    const now = Date.now();
    const timeSinceLastRefresh = now - lastRefresh;
    const cooldownMs = 30000;
    
    if (timeSinceLastRefresh < cooldownMs) {
      const remainingSeconds = Math.ceil((cooldownMs - timeSinceLastRefresh) / 1000);
      setCooldownRemaining(remainingSeconds);
      return;
    }
    
    void fetchLeaderboard(activeCategory, true);
  };

  return (
    <div className="bg-black border-2 border-neon-pink p-6 rounded-lg shadow-glow-pink h-full flex flex-col">
      <div className="flex items-center justify-between mb-2">
        <h2 className="font-press-start text-lg text-neon-yellow">
          🏆 LEADERBOARDS
        </h2>
        <Button
          onClick={handleRefresh}
          disabled={cooldownRemaining > 0 || loading[activeCategory]}
          size="sm"
          className="font-press-start text-xs bg-transparent border border-neon-cyan text-neon-cyan hover:bg-neon-cyan hover:text-black disabled:opacity-50 disabled:cursor-not-allowed h-8 w-8 p-0"
        >
          <RefreshCw className={`h-3 w-3 ${loading[activeCategory] ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      <div className="mb-4 pb-3 border-b border-neon-pink/30">
        <LeaderboardResetCountdown />
        <p className="font-vt323 text-sm text-neon-cyan/60 mt-1">
          Weekly leaderboards reset every Monday at 08:00 UTC
        </p>
      </div>

      <Tabs 
        value={activeCategory} 
        onValueChange={(value) => setActiveCategory(value as LeaderboardCategory)}
        className="flex-1 flex flex-col min-h-0"
      >
        <TabsList className="grid grid-cols-2 gap-2 bg-transparent mb-4">
          <TabsTrigger 
            value="highest-wave"
            className="font-press-start text-xs data-[state=active]:bg-neon-cyan data-[state=active]:text-black bg-black border border-neon-cyan text-neon-cyan"
          >
            🏆 Wave
          </TabsTrigger>
          <TabsTrigger 
            value="most-kills"
            className="font-press-start text-xs data-[state=active]:bg-neon-pink data-[state=active]:text-black bg-black border border-neon-pink text-neon-pink"
          >
            💀 Kills
          </TabsTrigger>
          <TabsTrigger 
            value="longest-survival"
            className="font-press-start text-xs data-[state=active]:bg-neon-yellow data-[state=active]:text-black bg-black border border-neon-yellow text-neon-yellow"
          >
            ⏱️ Time
          </TabsTrigger>
          <TabsTrigger 
            value="fastest-victory"
            className="font-press-start text-xs data-[state=active]:bg-green-500 data-[state=active]:text-black bg-black border border-green-500 text-green-500"
          >
            ⚡ Speed
          </TabsTrigger>
        </TabsList>

        <div className="flex-1 overflow-y-auto mt-4 min-h-0">
          {(['highest-wave', 'most-kills', 'longest-survival', 'fastest-victory'] as LeaderboardCategory[]).map(category => (
            <TabsContent key={category} value={category} className="mt-0 space-y-2">
              {loading[category] ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-neon-cyan" />
                </div>
              ) : error ? (
                <p className="font-vt323 text-xl text-red-500 text-center py-8">
                  {error}
                </p>
              ) : entries[category].length > 0 ? (
                entries[category].map((entry, index) => (
                  <LeaderboardEntryRow
                    key={entry.id}
                    entry={entry}
                    rank={index + 1}
                    category={category}
                  />
                ))
              ) : (
                <p className="font-vt323 text-xl text-neon-cyan/50 text-center py-8">
                  No entries yet!
                  <br />
                  Be the first to set a record!
                </p>
              )}
            </TabsContent>
          ))}
        </div>
      </Tabs>
    </div>
  );
}
