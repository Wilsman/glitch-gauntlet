import type { UpgradeOption } from '@shared/types';

// Massive list of upgrades with rarities and funny names
export const ALL_UPGRADES: Omit<UpgradeOption, 'id'>[] = [
  // ========== COMMON (White) ==========
  { type: 'attackSpeed', title: 'Caffeinated Hamster Wheel', description: 'Your trigger finger discovers espresso. +20% pew speed.', rarity: 'common', emoji: '☕' },
  { type: 'projectileDamage', title: 'Angry Spicy Bullets', description: 'Infused with hot sauce. +5 damage and mild regret.', rarity: 'common', emoji: '🌶️' },
  { type: 'playerSpeed', title: 'Greased Lightning Shoes', description: 'Slick soles, quick goals. +15% zoom-zoom.', rarity: 'common', emoji: '⚡' },
  { type: 'maxHealth', title: 'Vitamin Gummies (Probably Safe)', description: 'Chewy HP gummies. +20 max HP and heal 20.', rarity: 'common', emoji: '🍬' },
  { type: 'pickupRadius', title: 'Industrial Shop-Vac', description: 'Vroom vroom loot vacuum. +20% XP suck radius.', rarity: 'common', emoji: '🌀' },
  { type: 'critChance', title: 'Lucky Rabbit\'s Foot (Unlucky Rabbit)', description: '+10% crit chance. The rabbit disagrees.', rarity: 'common', emoji: '🐰' },
  { type: 'regeneration', title: 'Sketchy Energy Drink', description: 'Regen 1 HP/sec. Tastes like battery acid.', rarity: 'common', emoji: '🥤' },
  { type: 'armor', title: 'Cardboard Box Armor', description: 'Reduce damage by 5%. Surprisingly effective!', rarity: 'common', emoji: '📦' },
  { type: 'dodge', title: 'Banana Peel Shoes', description: '5% chance to slip away from damage.', rarity: 'common', emoji: '🍌' },
  { type: 'magnetic', title: 'Suspiciously Strong Magnet', description: 'XP orbs pulled from further away. Don\'t ask where we got it.', rarity: 'common', emoji: '🧲' },
  
  // ========== UNCOMMON (Green) ==========
  { type: 'multiShot', title: 'Two-For-One Tuesdays', description: 'Buy one bullet, get one free. +1 projectile per shot.', rarity: 'uncommon', emoji: '🎯' },
  { type: 'lifeSteal', title: 'Thirsty Bullets', description: 'Hydration via violence. Heal 5% of damage dealt.', rarity: 'uncommon', emoji: '🩸' },
  { type: 'critDamage', title: 'Oversized Novelty Hammer', description: 'Crits hit 50% harder. BONK intensifies.', rarity: 'uncommon', emoji: '🔨' },
  { type: 'pierce', title: 'Armor-Piercing Toothpicks', description: 'Bullets pierce 1 extra enemy. Dental approved!', rarity: 'uncommon', emoji: '🦷' },
  { type: 'chain', title: 'Sketchy Extension Cord', description: 'Attacks chain to 2 nearby enemies. Fire hazard!', rarity: 'uncommon', emoji: '⚡' },
  { type: 'thorns', title: 'Porcupine Onesie', description: 'Reflect 20% damage back. Comfy AND spiky!', rarity: 'uncommon', emoji: '🦔' },
  { type: 'vampiric', title: 'Discount Dracula Fangs', description: 'Heal 10% of damage. Made in Transylvania (probably).', rarity: 'uncommon', emoji: '🧛' },
  { type: 'knockback', title: 'Leaf Blower 9000', description: 'Push enemies back. Also good for autumn cleanup.', rarity: 'uncommon', emoji: '🍃' },
  { type: 'shield', title: 'Bubble Wrap Force Field', description: 'Absorb 50 damage before popping. Very satisfying.', rarity: 'uncommon', emoji: '🫧' },
  { type: 'homingShots', title: 'GPS-Guided Freedom Seeds', description: 'Bullets slightly home toward enemies. Satellite subscription required.', rarity: 'uncommon', emoji: '📡' },
  
  // ========== LEGENDARY (Red) ==========
  { type: 'bananarang', title: 'Bananarang', description: 'Add a returning banana to your attack. Picks add more bananas.', rarity: 'legendary', emoji: '🍌' },
  { type: 'explosion', title: 'Pocket Nuke (Totally Safe)', description: 'Attacks explode for 200% damage. What could go wrong?', rarity: 'legendary', emoji: '💣' },
  { type: 'berserker', title: 'Unhinged Gamer Rage', description: 'Deal 50% more damage below 30% HP. CAPSLOCK ENGAGED!', rarity: 'legendary', emoji: '😡' },
  { type: 'lucky', title: 'Suspiciously Lucky Coin', description: 'Double all drops. Found in a leprechaun\'s pocket.', rarity: 'legendary', emoji: '🍀' },
  { type: 'timeWarp', title: 'Microwave Time Machine', description: 'Slow enemies by 30%. Side effects: burnt popcorn smell.', rarity: 'legendary', emoji: '⏰' },
  { type: 'clone', title: 'Sketchy Cloning Device', description: 'Summon a clone that fights with you. Shares your fashion sense.', rarity: 'legendary', emoji: '👯' },
  { type: 'orbital', title: 'Flaming Skull Halo', description: 'Summon flaming skulls that orbit you, leaving fire trails. Metal AF!', rarity: 'legendary', emoji: '💀' },
  { type: 'ricochet', title: 'Pinball Wizard Certification', description: 'Bullets bounce 3 times. TILT! TILT!', rarity: 'legendary', emoji: '🎱' },
  { type: 'executioner', title: 'Guillotine Enthusiast Badge', description: 'Instant kill enemies below 15% HP. Très magnifique!', rarity: 'legendary', emoji: '⚔️' },
  { type: 'invincibility', title: 'Plot Armor (Legendary)', description: 'Survive lethal damage once per wave. Protagonist powers!', rarity: 'legendary', emoji: '🛡️' },
  
  // ========== BOSS (Yellow) ==========
  { type: 'aura', title: 'Intimidating Boss Music', description: 'Enemies near you deal 30% less damage. *Epic orchestra intensifies*', rarity: 'boss', emoji: '🎵' },
  { type: 'pet', title: 'Angry Chihuahua Familiar', description: 'Summons a tiny rage demon that attacks enemies. Yappy but effective.', rarity: 'boss', emoji: '🐕' },
  { type: 'turret', title: 'Sentient Toaster Turret', description: 'Deploy a turret that shoots toast. Breakfast AND death!', rarity: 'boss', emoji: '🍞' },
  { type: 'reflect', title: 'Uno Reverse Card (Laminated)', description: 'Reflect 50% of projectiles. No u!', rarity: 'boss', emoji: '🔄' },
  { type: 'dash', title: 'Anime Protagonist Dash', description: 'Dash through enemies. Leaves speed lines.', rarity: 'boss', emoji: '💨' },
  
  // ========== LUNAR (Blue) - Powerful but with drawbacks ==========
  { type: 'ghostBullets', title: 'Spectral Ammunition', description: 'Bullets phase through walls. You take 20% more damage. Spooky!', rarity: 'lunar', emoji: '👻' },
  { type: 'berserker', title: 'Glass Cannon Syndrome', description: '+100% damage, -50% max HP. Live fast, die young.', rarity: 'lunar', emoji: '💎' },
  { type: 'timeWarp', title: 'Broken Stopwatch', description: 'You move 50% faster, enemies move 25% faster. Time is weird.', rarity: 'lunar', emoji: '⌚' },
  { type: 'lucky', title: 'Cursed Lottery Ticket', description: 'Triple XP, but enemies have 50% more HP. Monkey\'s paw vibes.', rarity: 'lunar', emoji: '🎫' },
  { type: 'vampiric', title: 'Vampire\'s Curse', description: 'Heal 25% of damage, but regeneration stops. Embrace the darkness.', rarity: 'lunar', emoji: '🌙' },
  
  // ========== VOID (Purple) - Corrupted versions ==========
  { type: 'poisonDamage', title: 'Void-Touched Venom', description: 'Attacks poison enemies for 50% damage over 3s. Smells like regret.', rarity: 'void', emoji: '☠️' },
  { type: 'fireDamage', title: 'Corrupted Flamethrower', description: 'Set enemies on fire. Burns for 100% damage over 2s. Toasty!', rarity: 'void', emoji: '🔥' },
  { type: 'iceSlow', title: 'Absolute Zero Brain Freeze', description: 'Attacks slow enemies by 40%. Also makes slushies.', rarity: 'void', emoji: '❄️' },
  { type: 'explosion', title: 'Void Implosion', description: 'Kills create black holes that pull enemies in. Physics? Never heard of her.', rarity: 'void', emoji: '🌑' },
  { type: 'chain', title: 'Corrupted Lightning', description: 'Chains to 5 enemies but deals 50% damage. Quantity over quality!', rarity: 'void', emoji: '⚡' },
  
  // ========== MORE COMMONS ==========
  { type: 'attackSpeed', title: 'Twitchy Trigger Finger', description: 'Too much coffee. +20% attack speed.', rarity: 'common', emoji: '👆' },
  { type: 'projectileDamage', title: 'Pointier Bullets', description: 'They\'re just... pointier. +5 damage.', rarity: 'common', emoji: '📌' },
  { type: 'playerSpeed', title: 'Roller Skates', description: 'Wheee! +15% movement speed.', rarity: 'common', emoji: '🛼' },
  { type: 'maxHealth', title: 'Suspicious Mushroom', description: '+20 max HP. Tastes like adventure!', rarity: 'common', emoji: '🍄' },
  { type: 'regeneration', title: 'Band-Aid Collection', description: 'Regen 1 HP/sec. Covered in cartoon characters.', rarity: 'common', emoji: '🩹' },
  { type: 'armor', title: 'Thick Skin (Metaphorically)', description: 'Reduce damage by 5%. Emotionally resilient!', rarity: 'common', emoji: '🦏' },
  { type: 'dodge', title: 'Slippery When Wet', description: '5% dodge chance. Don\'t ask why you\'re wet.', rarity: 'common', emoji: '💧' },
  { type: 'critChance', title: 'Four-Leaf Clover', description: '+10% crit chance. Picked from a golf course.', rarity: 'common', emoji: '☘️' },
  
  // ========== MORE UNCOMMONS ==========
  { type: 'multiShot', title: 'Shotgun Surgery', description: '+1 projectile. Not FDA approved.', rarity: 'uncommon', emoji: '💉' },
  { type: 'pierce', title: 'Kebab Skewer', description: 'Pierce 1 enemy. Also good for BBQ.', rarity: 'uncommon', emoji: '�串' },
  { type: 'knockback', title: 'Sneeze Cannon', description: 'Achoo! Enemies fly back.', rarity: 'uncommon', emoji: '🤧' },
  { type: 'shield', title: 'Inflatable Pool Toy', description: 'Absorb 50 damage. Squeaky!', rarity: 'uncommon', emoji: '🦆' },
  { type: 'thorns', title: 'Cactus Costume', description: 'Reflect 20% damage. Prickly!', rarity: 'uncommon', emoji: '🌵' },
  { type: 'vampiric', title: 'Mosquito Swarm', description: 'Heal 10% of damage. Bzzzz!', rarity: 'uncommon', emoji: '🦟' },
  { type: 'homingShots', title: 'Bloodhound Bullets', description: 'Bullets track enemies. Good boy!', rarity: 'uncommon', emoji: '🐶' },
  { type: 'chain', title: 'Social Butterfly Effect', description: 'Chain to 2 enemies. Spread the love!', rarity: 'uncommon', emoji: '🦋' },
  
  // ========== MORE LEGENDARIES ==========
  { type: 'explosion', title: 'Michael Bay Director\'s Cut', description: 'EXPLOSIONS! 200% AoE damage.', rarity: 'legendary', emoji: '🎬' },
  { type: 'ricochet', title: 'Boomerang Physics Degree', description: 'Bullets bounce 3 times. Science!', rarity: 'legendary', emoji: '🪃' },
  { type: 'clone', title: 'Mirror Dimension Portal', description: 'Summon your evil twin. Or good twin?', rarity: 'legendary', emoji: '🪞' },
  { type: 'orbital', title: 'Infernal Skull Ring', description: 'Flaming skulls orbit and burn everything. Very metal.', rarity: 'legendary', emoji: '☠️' },
  { type: 'executioner', title: 'Finish Him! Achievement', description: 'Execute low HP enemies. FATALITY!', rarity: 'legendary', emoji: '🎮' },
  { type: 'timeWarp', title: 'Lag Switch (Legal)', description: 'Slow enemies by 30%. Totally not cheating.', rarity: 'legendary', emoji: '📶' },
  { type: 'lucky', title: 'Horseshoe Up Your...', description: 'Double drops. Lucky you!', rarity: 'legendary', emoji: '🐴' },
  { type: 'berserker', title: 'Hulk Smash Mode', description: '+50% damage at low HP. You won\'t like me when I\'m angry.', rarity: 'legendary', emoji: '💪' },
];

// Weighted rarity chances
export const RARITY_WEIGHTS = {
  common: 50,
  uncommon: 30,
  legendary: 10,
  boss: 5,
  lunar: 3,
  void: 2,
};

export function getRandomUpgrades(count: number = 3, forceRarity?: 'legendary'): Omit<UpgradeOption, 'id'>[] {
  const selected: Omit<UpgradeOption, 'id'>[] = [];
  
  if (forceRarity) {
    // Force specific rarity (for hellhound rounds)
    const upgradesOfRarity = ALL_UPGRADES.filter(u => u.rarity === forceRarity);
    for (let i = 0; i < count && upgradesOfRarity.length > 0; i++) {
      const randomUpgrade = upgradesOfRarity[Math.floor(Math.random() * upgradesOfRarity.length)];
      selected.push(randomUpgrade);
    }
    return selected;
  }
  
  const totalWeight = Object.values(RARITY_WEIGHTS).reduce((a, b) => a + b, 0);
  
  for (let i = 0; i < count; i++) {
    // Pick a rarity based on weights
    let roll = Math.random() * totalWeight;
    let selectedRarity: keyof typeof RARITY_WEIGHTS = 'common';
    
    for (const [rarity, weight] of Object.entries(RARITY_WEIGHTS)) {
      roll -= weight;
      if (roll <= 0) {
        selectedRarity = rarity as keyof typeof RARITY_WEIGHTS;
        break;
      }
    }
    
    // Get all upgrades of that rarity
    const upgradesOfRarity = ALL_UPGRADES.filter(u => u.rarity === selectedRarity);
    if (upgradesOfRarity.length > 0) {
      const randomUpgrade = upgradesOfRarity[Math.floor(Math.random() * upgradesOfRarity.length)];
      selected.push(randomUpgrade);
    }
  }
  
  return selected;
}
