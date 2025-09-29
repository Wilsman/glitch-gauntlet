import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { Pet } from '@shared/types';

interface PetStatsPanelProps {
  pet: Pet | null;
}

function StatRow({ label, value, color = 'text-gray-300' }: { label: string; value: string | number; color?: string }) {
  return (
    <div className="flex justify-between items-center py-1 border-b border-gray-700/50">
      <span className="text-xs font-medium text-gray-400">{label}</span>
      <span className={`text-sm font-bold ${color}`}>{value}</span>
    </div>
  );
}

export default function PetStatsPanel({ pet }: PetStatsPanelProps) {
  if (!pet) return null;

  const dps = (pet.damage / (pet.attackSpeed / 1000)).toFixed(1);

  return (
    <Card className="bg-gray-800/95 border-pink-500 shadow-glow-pink backdrop-blur-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-bold text-pink-400 flex items-center gap-2">
          <span className="text-2xl">{pet.emoji}</span>
          <span>Pet Companion</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-1">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-3xl">{pet.emoji}</span>
          <div className="flex-1">
            <div className="text-xs text-gray-400 mb-1">Level {pet.level}</div>
            <div className="w-full bg-gray-700 rounded-full h-2">
              <div 
                className="bg-pink-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${(pet.health / pet.maxHealth) * 100}%` }}
              />
            </div>
          </div>
        </div>
        
        <div className="space-y-0.5">
          <StatRow label="Health" value={`${Math.round(pet.health)}/${pet.maxHealth}`} color="text-pink-400" />
          <StatRow label="DPS" value={dps} color="text-red-400" />
          <StatRow label="Damage" value={pet.damage} color="text-orange-400" />
          <StatRow label="Attack Speed" value={`${(1000 / pet.attackSpeed).toFixed(2)}/s`} color="text-purple-400" />
        </div>
      </CardContent>
    </Card>
  );
}
