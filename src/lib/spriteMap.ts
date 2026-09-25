export interface SpriteInfo {
    url?: string;
    frames?: number;
    framePath?: string;
    frameWidth: number;
    frameHeight: number;
    animationSpeed: number;
}

/**
 * Characters are drawn by the code-only pixel sprite engine
 * (src/lib/pixelSprites). The original painted PNGs are archived under
 * /assets/sprites/_archive/characters; flip this flag to render them again.
 */
export const USE_LEGACY_CHARACTER_SPRITES = false;

export const SPRITE_MAP = {
    legacyCharacters: {
        'spray-n-pray': {
            framePath: '/assets/sprites/_archive/characters/spray-n-pray/{i}.png',
            frames: 4,
            frameWidth: 64,
            frameHeight: 64,
            animationSpeed: 100
        },
        'boom-bringer': {
            framePath: '/assets/sprites/_archive/characters/boom-bringer/{i}.png',
            frames: 4,
            frameWidth: 64,
            frameHeight: 64,
            animationSpeed: 100
        },
        'glass-cannon-carl': {
            framePath: '/assets/sprites/_archive/characters/glass-cannon-carl/{i}.png',
            frames: 4,
            frameWidth: 64,
            frameHeight: 64,
            animationSpeed: 100
        },
        'pet-pal-percy': {
            framePath: '/assets/sprites/_archive/characters/pet-pal-percy/{i}.png',
            frames: 4,
            frameWidth: 64,
            frameHeight: 64,
            animationSpeed: 120
        },
        'vampire-vex': {
            framePath: '/assets/sprites/_archive/characters/vampire-vex/{i}.png',
            frames: 4,
            frameWidth: 64,
            frameHeight: 64,
            animationSpeed: 150
        },
        'turret-tina': {
            framePath: '/assets/sprites/_archive/characters/turret-tina/{i}.png',
            frames: 4,
            frameWidth: 64,
            frameHeight: 64,
            animationSpeed: 100
        },
        'dash-dynamo': {
            framePath: '/assets/sprites/_archive/characters/dash-dynamo/{i}.png',
            frames: 4,
            frameWidth: 64,
            frameHeight: 64,
            animationSpeed: 80
        }
    },
    enemies: {
        'slugger': {
            framePath: '/assets/sprites/slugger/{i}.png',
            frames: 4,
            frameWidth: 64,
            frameHeight: 64,
            animationSpeed: 150
        },
        'hellhound': {
            framePath: '/assets/sprites/hellhound/{i}.png',
            frames: 4,
            frameWidth: 64,
            frameHeight: 64,
            animationSpeed: 120
        },
        'grunt': {
            framePath: '/assets/sprites/grunt/{i}.png',
            frames: 4,
            frameWidth: 64,
            frameHeight: 64,
            animationSpeed: 100
        }
    }
} as const;

export type LegacyCharacterSpriteType = keyof typeof SPRITE_MAP.legacyCharacters;
export type EnemyType = keyof typeof SPRITE_MAP.enemies;
