# Cloudflare Leaderboard Implementation Plan

## Overview
Implement a multi-category leaderboard system using Cloudflare D1 (SQLite) to track and display player achievements across different metrics.

## Leaderboard Categories

### 1. **Highest Wave Reached**
- **Metric**: Maximum wave number survived
- **Display**: Player name, wave number, character used, date
- **Sort**: Descending by wave

### 2. **Most Kills in a Run**
- **Metric**: Total enemies killed in a single game
- **Display**: Player name, kill count, wave reached, character used, date
- **Sort**: Descending by kills

### 3. **Longest Survival Time**
- **Metric**: Total time survived in milliseconds
- **Display**: Player name, formatted time (MM:SS), wave reached, character used, date
- **Sort**: Descending by time

### 4. **Fastest Victory**
- **Metric**: Time to complete wave 5 (win condition)
- **Display**: Player name, formatted time (MM:SS), character used, date
- **Sort**: Ascending by time (fastest first)
- **Note**: Only records where `isVictory = true`

---

## Database Schema

### Table: `leaderboard_entries`

```sql
CREATE TABLE IF NOT EXISTS leaderboard_entries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  player_name TEXT NOT NULL,
  character_type TEXT NOT NULL,
  wave_reached INTEGER NOT NULL,
  enemies_killed INTEGER NOT NULL,
  survival_time_ms INTEGER NOT NULL,
  is_victory INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  
  -- Indexes for efficient queries
  INDEX idx_wave (wave_reached DESC),
  INDEX idx_kills (enemies_killed DESC),
  INDEX idx_time (survival_time_ms DESC),
  INDEX idx_victory (is_victory, survival_time_ms ASC)
);
```

### Migration Strategy
- Add D1 database binding to `wrangler.jsonc`
- Create migration file for schema
- Run migration on deployment

---

## TypeScript Types

### Shared Types (`shared/types.ts`)

```typescript
export interface LeaderboardEntry {
  id: number;
  playerName: string;
  characterType: CharacterType;
  waveReached: number;
  enemiesKilled: number;
  survivalTimeMs: number;
  isVictory: boolean;
  createdAt: number;
}

export interface LeaderboardSubmission {
  playerName: string;
  characterType: CharacterType;
  waveReached: number;
  enemiesKilled: number;
  survivalTimeMs: number;
  isVictory: boolean;
}

export type LeaderboardCategory = 
  | 'highest-wave' 
  | 'most-kills' 
  | 'longest-survival' 
  | 'fastest-victory';

export interface LeaderboardResponse {
  category: LeaderboardCategory;
  entries: LeaderboardEntry[];
  playerRank?: number; // Optional: player's rank in this category
}
```

---

## Backend API Endpoints

### 1. Submit Score
**POST** `/api/leaderboard/submit`

**Request Body:**
```json
{
  "playerName": "PlayerName",
  "characterType": "spray-n-pray",
  "waveReached": 10,
  "enemiesKilled": 245,
  "survivalTimeMs": 180000,
  "isVictory": false
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "entryId": 123,
    "ranks": {
      "highest-wave": 15,
      "most-kills": 8,
      "longest-survival": 12,
      "fastest-victory": null
    }
  }
}
```

### 2. Get Leaderboard
**GET** `/api/leaderboard/:category?limit=10&offset=0`

**Parameters:**
- `category`: One of the LeaderboardCategory types
- `limit`: Number of entries to return (default: 10, max: 100)
- `offset`: Pagination offset (default: 0)

**Response:**
```json
{
  "success": true,
  "data": {
    "category": "highest-wave",
    "entries": [
      {
        "id": 1,
        "playerName": "ProGamer",
        "characterType": "glass-cannon-carl",
        "waveReached": 25,
        "enemiesKilled": 500,
        "survivalTimeMs": 450000,
        "isVictory": false,
        "createdAt": 1735581600000
      }
    ],
    "total": 150
  }
}
```

### 3. Get Player Stats
**GET** `/api/leaderboard/player/:playerName`

**Response:**
```json
{
  "success": true,
  "data": {
    "playerName": "ProGamer",
    "bestScores": {
      "highest-wave": { "wave": 25, "rank": 5 },
      "most-kills": { "kills": 500, "rank": 3 },
      "longest-survival": { "time": 450000, "rank": 8 },
      "fastest-victory": { "time": 120000, "rank": 12 }
    },
    "totalGames": 45
  }
}
```

---

## Frontend Implementation

### 1. Track Game Stats

**Update `LocalGameEngine.ts`:**
- Add `gameStartTime: number` property
- Add `enemiesKilledCount: number` property
- Track enemy kills in `handleEnemyDeath()`
- Calculate survival time on game end

**Update `PlayerProgression` interface:**
```typescript
export interface GameStats {
  waveReached: number;
  enemiesKilled: number;
  survivalTimeMs: number;
  isVictory: boolean;
  characterType: CharacterType;
}
```

### 2. Submit Scores

**Create `src/lib/leaderboardApi.ts`:**
```typescript
export async function submitLeaderboardScore(stats: GameStats): Promise<void>
export async function getLeaderboard(category: LeaderboardCategory, limit?: number): Promise<LeaderboardEntry[]>
export async function getPlayerStats(playerName: string): Promise<PlayerStats>
```

**Update `GameOverPage.tsx`:**
- Call `submitLeaderboardScore()` on mount
- Show submission confirmation
- Display player's ranks

### 3. Leaderboard UI Component

**Create `src/components/LeaderboardPanel.tsx`:**
- Tabbed interface for 4 categories
- Top 10 display by default
- "Load More" pagination
- Highlight current player's entry
- Retro arcade styling
- Auto-refresh every 30 seconds
- Loading states
- Empty states

**Component Structure:**
```tsx
<LeaderboardPanel>
  <Tabs>
    <Tab name="🏆 Highest Wave" />
    <Tab name="💀 Most Kills" />
    <Tab name="⏱️ Longest Survival" />
    <Tab name="⚡ Fastest Victory" />
  </Tabs>
  <LeaderboardList>
    <LeaderboardEntry rank={1} ... />
    <LeaderboardEntry rank={2} ... />
    ...
  </LeaderboardList>
  <LoadMoreButton />
</LeaderboardPanel>
```

### 4. HomePage Integration

**Update `HomePage.tsx`:**
- Add `<LeaderboardPanel />` component
- Position in bottom-left or as collapsible sidebar
- Compact view showing top 3 per category
- Click to expand full view

**Layout Options:**
1. **Sidebar**: Fixed right panel with scrollable leaderboards
2. **Bottom Panel**: Horizontal scrollable cards for each category
3. **Modal**: Button to open full-screen leaderboard view

---

## Implementation Steps

### Phase 1: Backend Setup
1. ✅ Add D1 database binding to `wrangler.jsonc`
2. ✅ Create database migration SQL file
3. ✅ Add leaderboard types to `shared/types.ts`
4. ✅ Create `worker/leaderboardRoutes.ts`
5. ✅ Implement submit endpoint with validation
6. ✅ Implement get leaderboard endpoint with queries
7. ✅ Implement player stats endpoint
8. ✅ Add rate limiting to prevent spam

### Phase 2: Game Tracking
1. ✅ Update `LocalGameEngine` to track stats
2. ✅ Add `gameStartTime` initialization
3. ✅ Add `enemiesKilledCount` tracking
4. ✅ Calculate `survivalTimeMs` on game end
5. ✅ Pass stats to `GameOverPage`

### Phase 3: API Integration
1. ✅ Create `src/lib/leaderboardApi.ts`
2. ✅ Implement `submitLeaderboardScore()`
3. ✅ Implement `getLeaderboard()`
4. ✅ Implement `getPlayerStats()`
5. ✅ Add error handling and retries

### Phase 4: UI Components
1. ✅ Create `LeaderboardPanel.tsx`
2. ✅ Create `LeaderboardEntry.tsx`
3. ✅ Add tab navigation
4. ✅ Add loading/error states
5. ✅ Add pagination
6. ✅ Style with retro theme

### Phase 5: Integration
1. ✅ Update `GameOverPage` to submit scores
2. ✅ Add `LeaderboardPanel` to `HomePage`
3. ✅ Add player rank display on game over
4. ✅ Test all categories
5. ✅ Add animations and polish

---

## Security Considerations

1. **Rate Limiting**: Limit submissions per player (1 per minute)
2. **Validation**: Validate all inputs server-side
3. **Sanitization**: Sanitize player names (already done with profanity filter)
4. **Max Values**: Set reasonable max values for stats to prevent cheating
5. **Duplicate Prevention**: Only store best score per player per category

---

## Performance Optimizations

1. **Indexes**: Add database indexes on frequently queried columns
2. **Caching**: Cache top 10 for each category (1 minute TTL)
3. **Pagination**: Limit results to prevent large queries
4. **Debouncing**: Debounce leaderboard refreshes on frontend
5. **Lazy Loading**: Load leaderboard data only when tab is visible

---

## Testing Checklist

- [ ] Submit score with all stat combinations
- [ ] Retrieve each leaderboard category
- [ ] Test pagination (offset/limit)
- [ ] Test with no entries (empty state)
- [ ] Test with duplicate player names
- [ ] Test victory vs non-victory filtering
- [ ] Test rate limiting
- [ ] Test invalid inputs
- [ ] Test concurrent submissions
- [ ] Test UI responsiveness on mobile

---

## Future Enhancements

1. **Weekly/Monthly Leaderboards**: Time-based leaderboards that reset
2. **Character-Specific Leaderboards**: Filter by character type
3. **Friends Leaderboard**: Compare with friends only
4. **Achievements**: Award badges for leaderboard positions
5. **Replay System**: Store and replay top runs
6. **Global Stats**: Show total players, games played, etc.
7. **Seasonal Events**: Special leaderboards for limited-time events

---

## Estimated Timeline

- **Phase 1 (Backend)**: 2-3 hours
- **Phase 2 (Tracking)**: 1 hour
- **Phase 3 (API)**: 1 hour
- **Phase 4 (UI)**: 3-4 hours
- **Phase 5 (Integration)**: 1-2 hours
- **Testing & Polish**: 2 hours

**Total**: ~10-13 hours

---

## Notes

- Use Cloudflare D1 (SQLite) for persistence
- Leaderboards are global (not per-session)
- Player names come from the name selection dialog
- All times stored in milliseconds for precision
- Character type stored for filtering/display
- Created timestamp for sorting by recency if needed
