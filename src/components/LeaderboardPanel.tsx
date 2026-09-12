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
    <div className="flex items-center gap-3 p-3 bg-white/[0.025] border border-white/5 rounded-lg hover:border-white/15 transition-colors">
      {/* Rank */}
      <div className={`font-sans text-base w-6 shrink-0 text-center ${getRankColor(rank)}`}>
        {rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `#${rank}`}
      </div>

      {/* Character Emoji */}
      <div className="text-2xl">
        {character.emoji}
      </div>

      {/* Player Info */}
      <div className="flex-1 min-w-0">
        <p className="font-sans text-sm font-semibold text-white truncate">
          {entry.playerName}
        </p>
        <p className="font-sans text-xs text-slate-400">
          {formatTimeAgo(entry.createdAt)}
        </p>
      </div>

      {/* Primary Stat */}
      <div className="font-sans text-sm font-semibold tabular-nums text-yellow-200 text-right shrink-0">
        {getPrimaryValue()}
      </div>
    </div>
  );
}

export function LeaderboardPanel() {
  const [expanded, setExpanded] = useState(false);
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
    <div className="bg-[#090b16]/95 border border-white/15 p-5 rounded-xl flex flex-col">
      <div className="flex items-center justify-between mb-2">
        <h2 className="font-press-start text-xs leading-6 text-slate-100">
          🏆 LEADERBOARDS
        </h2>
        <Button
          aria-label="Refresh leaderboard"
          title="Refresh leaderboard"
          onClick={handleRefresh}
          disabled={cooldownRemaining > 0 || loading[activeCategory]}
          size="sm"
          className="font-press-start text-xs bg-transparent border border-neon-cyan text-neon-cyan hover:bg-neon-cyan hover:text-black disabled:opacity-50 disabled:cursor-not-allowed h-8 w-8 p-0"
        >
          <RefreshCw className={`h-3 w-3 ${loading[activeCategory] ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      <div className="mb-4 pb-3 border-b border-white/10">
        <LeaderboardResetCountdown />
        <p className="font-sans text-xs leading-5 text-slate-400 mt-1">
          Weekly reset · Monday, 08:00 UTC
        </p>
      </div>

      <Tabs 
        value={activeCategory} 
        onValueChange={(value) => { setActiveCategory(value as LeaderboardCategory); setExpanded(false); }}
        className="flex-1 flex flex-col min-h-0"
      >
        <TabsList className="grid h-auto grid-cols-2 gap-1 bg-white/5 p-1 mb-3">
          <TabsTrigger 
            value="highest-wave"
            className="min-h-9 font-sans text-sm font-medium data-[state=active]:bg-neon-cyan/15 data-[state=active]:text-neon-cyan bg-transparent text-slate-300"
          >
            🏆 Wave
          </TabsTrigger>
          <TabsTrigger 
            value="most-kills"
            className="min-h-9 font-sans text-sm font-medium data-[state=active]:bg-neon-cyan/15 data-[state=active]:text-neon-cyan bg-transparent text-slate-300"
          >
            💀 Kills
          </TabsTrigger>
          <TabsTrigger 
            value="longest-survival"
            className="min-h-9 font-sans text-sm font-medium data-[state=active]:bg-neon-cyan/15 data-[state=active]:text-neon-cyan bg-transparent text-slate-300"
          >
            ⏱️ Time
          </TabsTrigger>
          <TabsTrigger 
            value="fastest-victory"
            className="min-h-9 font-sans text-sm font-medium data-[state=active]:bg-neon-cyan/15 data-[state=active]:text-neon-cyan bg-transparent text-slate-300"
          >
            ⚡ Speed
          </TabsTrigger>
        </TabsList>

        <div className="overflow-y-auto min-h-0 max-h-[360px]">
          {(['highest-wave', 'most-kills', 'longest-survival', 'fastest-victory'] as LeaderboardCategory[]).map(category => (
            <TabsContent key={category} value={category} className="mt-0 space-y-2">
              {loading[category] ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-neon-cyan" />
                </div>
              ) : error ? (
                <p className="font-sans text-sm text-red-300 text-center py-6">
                  {error}
                </p>
              ) : entries[category].length > 0 ? (
                entries[category].slice(0, expanded ? undefined : 3).map((entry, index) => (
                  <LeaderboardEntryRow
                    key={entry.id}
                    entry={entry}
                    rank={index + 1}
                    category={category}
                  />
                ))
              ) : (
                <p className="font-sans text-sm leading-6 text-slate-400 text-center py-6">
                  No entries yet!
                  <br />
                  Be the first to set a record!
                </p>
              )}
            </TabsContent>
          ))}
        </div>
      </Tabs>
      {entries[activeCategory].length > 3 && !loading[activeCategory] && !error && (
        <Button variant="ghost" onClick={() => setExpanded(value => !value)} aria-expanded={expanded}
          className="mt-3 font-sans text-sm text-neon-cyan hover:bg-white/5 hover:text-cyan-100">
          {expanded ? 'Show top 3' : `View top ${entries[activeCategory].length}`}
        </Button>
      )}
    </div>
  );
}
