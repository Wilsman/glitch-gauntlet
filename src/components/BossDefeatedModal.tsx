import { Button } from '@/components/ui/button';

interface BossDefeatedModalProps {
  onExtract: () => void;
  onContinue: () => void;
}

export default function BossDefeatedModal({ onExtract, onContinue }: BossDefeatedModalProps) {
  return (
    <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-50">
      <div className="bg-gray-900 border-4 border-neon-pink p-8 max-w-2xl mx-4 shadow-glow-pink">
        <h1 className="font-press-start text-3xl text-neon-pink text-center mb-6">
          BOSS DEFEATED!
        </h1>
        
        <p className="font-vt323 text-2xl text-neon-cyan text-center mb-8">
          The Berserker has fallen. Choose your fate:
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Extract Option */}
          <div className="border-2 border-neon-cyan p-6 hover:bg-neon-cyan/10 transition-colors">
            <h2 className="font-press-start text-xl text-neon-cyan mb-4">
              EXTRACT
            </h2>
            <p className="font-vt323 text-lg text-white mb-6">
              Claim victory and escape with your rewards. The teleporter awaits.
            </p>
            <Button
              onClick={onExtract}
              className="w-full font-press-start bg-neon-cyan text-black hover:bg-neon-cyan/80"
            >
              Extract Now
            </Button>
          </div>
          
          {/* Continue Option */}
          <div className="border-2 border-neon-yellow p-6 hover:bg-neon-yellow/10 transition-colors">
            <h2 className="font-press-start text-xl text-neon-yellow mb-4">
              CONTINUE
            </h2>
            <p className="font-vt323 text-lg text-white mb-2">
              Push deeper into the gauntlet. Receive:
            </p>
            <ul className="font-vt323 text-base text-neon-yellow mb-4 list-disc list-inside">
              <li>3 Legendary Upgrades</li>
              <li>+10% All Stats</li>
              <li>Greater Challenges</li>
            </ul>
            <Button
              onClick={onContinue}
              className="w-full font-press-start bg-neon-yellow text-black hover:bg-neon-yellow/80"
            >
              Fight On
            </Button>
          </div>
        </div>
        
        <p className="font-vt323 text-sm text-gray-400 text-center mt-6">
          Take your time. The choice is yours.
        </p>
      </div>
    </div>
  );
}
