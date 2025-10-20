import { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';

interface TimeRemaining {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

function calculateTimeRemaining(nextResetTimestamp: number): TimeRemaining {
  const now = Date.now();
  const diff = Math.max(0, nextResetTimestamp - now);
  
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);
  
  return { days, hours, minutes, seconds };
}

function getNextMondayReset(): number {
  const now = new Date();
  const currentDay = now.getUTCDay();
  const currentHour = now.getUTCHours();
  
  let daysUntilReset: number;
  if (currentDay === 0) {
    daysUntilReset = 1;
  } else if (currentDay === 1 && currentHour < 8) {
    daysUntilReset = 0;
  } else {
    daysUntilReset = 8 - currentDay;
  }
  
  const nextResetDate = new Date(now);
  nextResetDate.setUTCDate(now.getUTCDate() + daysUntilReset);
  nextResetDate.setUTCHours(8, 0, 0, 0);
  
  return nextResetDate.getTime();
}

export function LeaderboardResetCountdown() {
  const [nextResetTimestamp] = useState(() => getNextMondayReset());
  const [timeRemaining, setTimeRemaining] = useState<TimeRemaining>(() => 
    calculateTimeRemaining(nextResetTimestamp)
  );

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeRemaining(calculateTimeRemaining(nextResetTimestamp));
    }, 1000);

    return () => clearInterval(interval);
  }, [nextResetTimestamp]);

  const formatTimeUnit = (value: number, unit: string) => {
    if (value === 0) return null;
    return (
      <span className="text-neon-cyan">
        {value}
        <span className="text-neon-cyan/60 text-[10px] ml-0.5">{unit}</span>
      </span>
    );
  };

  return (
    <div className="flex items-center gap-2 text-xs font-press-start">
      <Clock className="h-3 w-3 text-neon-yellow" />
      <div className="flex items-center gap-1">
        <span className="text-neon-yellow/80">Reset:</span>
        <div className="flex items-center gap-1">
          {timeRemaining.days > 0 && formatTimeUnit(timeRemaining.days, 'd')}
          {formatTimeUnit(timeRemaining.hours, 'h')}
          {formatTimeUnit(timeRemaining.minutes, 'm')}
          {formatTimeUnit(timeRemaining.seconds, 's')}
        </div>
      </div>
    </div>
  );
}
