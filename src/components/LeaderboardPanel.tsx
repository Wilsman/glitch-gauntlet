import { useState, useEffect, useCallback, useRef } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { getCharacter } from '@shared/characterConfig';
import { LEADERBOARD_CATEGORIES, type GameMode, type LeaderboardCategory, type LeaderboardEntry } from '@shared/types';
import { getLeaderboard } from '@/lib/leaderboardApi';
import { Loader2, RefreshCw } from 'lucide-react';
import { LeaderboardResetCountdown } from './LeaderboardResetCountdown';
import { GAME_MODES } from '@/lib/gameModes';

const TAB_LABELS: Record<LeaderboardCategory, string> = {
  'highest-wave': '🏆 Wave',
  'most-kills': '💀 Kills',
  'longest-survival': '⏱️ Time',
  'fastest-victory': '⚡ Speed',
  'most-stages': '🌀 Stages',
  'best-combo': '🔥 Combo',
  'fastest-stage3': '⚡ Stage 3',
};

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

function primaryValue(entry: LeaderboardEntry, category: LeaderboardCategory) {
  switch (category) {
    case 'highest-wave': return `Wave ${entry.waveReached}`;
    case 'most-kills': return `${entry.enemiesKilled} kills`;
    case 'longest-survival':
    case 'fastest-victory': return formatTime(entry.survivalTimeMs);
    case 'most-stages': return `${entry.stagesCleared ?? 0} ${entry.stagesCleared === 1 ? 'stage' : 'stages'}`;
    case 'best-combo': return `x${entry.bestCombo ?? 0}`;
    case 'fastest-stage3': return entry.stage3TimeMs != null ? formatTime(entry.stage3TimeMs) : '—';
  }
}

function LeaderboardEntryRow({ entry, rank, category }: { entry: LeaderboardEntry; rank: number; category: LeaderboardCategory }) {
  const character = getCharacter(entry.characterType);
  const rankColor = rank === 1 ? 'text-neon-yellow' : rank === 2 ? 'text-gray-300' : rank === 3 ? 'text-orange-400' : 'text-neon-cyan';
  return (
    <div className="flex items-center gap-3 p-3 bg-white/[0.025] border border-white/5 rounded-lg hover:border-white/15 transition-colors">
      <div className={`font-sans text-base w-6 shrink-0 text-center ${rankColor}`}>
        {rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `#${rank}`}
      </div>
      <div className="text-2xl">{character.emoji}</div>
      <div className="flex-1 min-w-0">
        <p className="font-sans text-sm font-semibold text-white truncate">{entry.playerName}</p>
        <p className="font-sans text-xs text-slate-400">{formatTimeAgo(entry.createdAt)}</p>
      </div>
      <div className="font-sans text-sm font-semibold tabular-nums text-yellow-200 text-right shrink-0">
        {primaryValue(entry, category)}
      </div>
    </div>
  );
}

const key = (mode: GameMode, category: LeaderboardCategory) => `${mode}:${category}`;

// Weekly boards for one game mode. The home screen drives `mode` from the hovered/selected mode
// button; the Rift/Arena switch lets players flip it manually too.
export function LeaderboardPanel({ mode, onModeChange }: { mode: GameMode; onModeChange: (mode: GameMode) => void }) {
  const categories = LEADERBOARD_CATEGORIES[mode];
  const [expanded, setExpanded] = useState(false);
  const [activeByMode, setActiveByMode] = useState<Record<GameMode, LeaderboardCategory>>({ rift: 'most-stages', arena: 'highest-wave' });
  const activeCategory = activeByMode[mode];
  const [entries, setEntries] = useState<Record<string, LeaderboardEntry[]>>({});
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<number>(0);
  const [cooldownRemaining, setCooldownRemaining] = useState<number>(0);
  const fetchedAt = useRef<Record<string, number>>({});

  const fetchLeaderboard = useCallback(async (m: GameMode, category: LeaderboardCategory, force = false) => {
    const k = key(m, category);
    // Hovering between modes re-shows cached boards; refetch only when stale (or on manual refresh).
    if (!force && Date.now() - (fetchedAt.current[k] || 0) < 60000) return;
    fetchedAt.current[k] = Date.now();
    setLoading(prev => ({ ...prev, [k]: true }));
    setError(null);
    try {
      const response = await getLeaderboard(category, 10, 0, m);
      setEntries(prev => ({ ...prev, [k]: response.entries }));
      if (force) setLastRefresh(Date.now());
    } catch (err) {
      console.error('Failed to fetch leaderboard:', err);
      fetchedAt.current[k] = 0;
      setError('Failed to load leaderboard');
    } finally {
      setLoading(prev => ({ ...prev, [k]: false }));
    }
  }, []);

  useEffect(() => {
    setExpanded(false);
    void fetchLeaderboard(mode, activeCategory);
  }, [mode, activeCategory, fetchLeaderboard]);

  useEffect(() => {
    if (cooldownRemaining <= 0) return;
    const timer = setInterval(() => setCooldownRemaining(prev => Math.max(0, prev - 1)), 1000);
    return () => clearInterval(timer);
  }, [cooldownRemaining]);

  const handleRefresh = () => {
    const timeSinceLastRefresh = Date.now() - lastRefresh;
    const cooldownMs = 30000;
    if (timeSinceLastRefresh < cooldownMs) {
      setCooldownRemaining(Math.ceil((cooldownMs - timeSinceLastRefresh) / 1000));
      return;
    }
    void fetchLeaderboard(mode, activeCategory, true);
  };

  const info = GAME_MODES[mode];
  const activeKey = key(mode, activeCategory);
  const activeEntries = entries[activeKey] || [];
  return (
    <div className="bg-[#090b16]/95 border p-5 rounded-xl flex flex-col transition-colors duration-300" style={{ borderColor: `${info.accent}55` }}>
      <div className="flex items-center justify-between mb-2">
        <h2 className="font-press-start text-xs leading-6 text-slate-100">🏆 LEADERBOARDS</h2>
        <Button
          aria-label="Refresh leaderboard"
          title="Refresh leaderboard"
          onClick={handleRefresh}
          disabled={cooldownRemaining > 0 || loading[activeKey]}
          size="sm"
          className="font-press-start text-xs bg-transparent border border-neon-cyan text-neon-cyan hover:bg-neon-cyan hover:text-black disabled:opacity-50 disabled:cursor-not-allowed h-8 w-8 p-0"
        >
          <RefreshCw className={`h-3 w-3 ${loading[activeKey] ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {/* Mode switch: follows the hovered mode button, but can be flipped by hand. */}
      <div className="mb-3 grid grid-cols-2 gap-1 rounded-md bg-white/5 p-1" role="tablist" aria-label="Game mode">
        {(Object.keys(GAME_MODES) as GameMode[]).map(m => (
          <button
            key={m}
            role="tab"
            aria-selected={m === mode}
            onClick={() => onModeChange(m)}
            className="min-h-9 rounded font-press-start text-[10px] tracking-wider transition-colors"
            style={m === mode ? { backgroundColor: `${GAME_MODES[m].accent}26`, color: GAME_MODES[m].accent } : { color: '#94a3b8' }}
          >
            {GAME_MODES[m].short}
          </button>
        ))}
      </div>

      <div className="mb-4 pb-3 border-b border-white/10">
        <LeaderboardResetCountdown />
        <p className="font-sans text-xs leading-5 text-slate-400 mt-1">Weekly reset · Monday, 08:00 UTC</p>
      </div>

      <Tabs
        value={activeCategory}
        onValueChange={(value) => { setActiveByMode(prev => ({ ...prev, [mode]: value as LeaderboardCategory })); setExpanded(false); }}
        className="flex-1 flex flex-col min-h-0"
      >
        <TabsList className="grid h-auto grid-cols-2 gap-1 bg-white/5 p-1 mb-3">
          {categories.map(category => (
            <TabsTrigger
              key={category}
              value={category}
              className="min-h-9 font-sans text-sm font-medium data-[state=active]:bg-neon-cyan/15 data-[state=active]:text-neon-cyan bg-transparent text-slate-300"
            >
              {TAB_LABELS[category]}
            </TabsTrigger>
          ))}
        </TabsList>

        <div className="overflow-y-auto min-h-0 max-h-[360px]">
          {categories.map(category => {
            const k = key(mode, category), list = entries[k] || [];
            return (
              <TabsContent key={category} value={category} className="mt-0 space-y-2">
                {loading[k] && list.length === 0 ? (
                  <div className="flex justify-center py-8"><Loader2 className="h-8 w-8 animate-spin text-neon-cyan" /></div>
                ) : error ? (
                  <p className="font-sans text-sm text-red-300 text-center py-6">{error}</p>
                ) : list.length > 0 ? (
                  list.slice(0, expanded ? undefined : 3).map((entry, index) => (
                    <LeaderboardEntryRow key={entry.id} entry={entry} rank={index + 1} category={category} />
                  ))
                ) : (
                  <p className="font-sans text-sm leading-6 text-slate-400 text-center py-6">
                    No {info.short.toLowerCase()} entries yet!
                    <br />
                    Be the first to set a record!
                  </p>
                )}
              </TabsContent>
            );
          })}
        </div>
      </Tabs>
      {activeEntries.length > 3 && !error && (
        <Button variant="ghost" onClick={() => setExpanded(value => !value)} aria-expanded={expanded}
          className="mt-3 font-sans text-sm text-neon-cyan hover:bg-white/5 hover:text-cyan-100">
          {expanded ? 'Show top 3' : `View top ${activeEntries.length}`}
        </Button>
      )}
    </div>
  );
}
