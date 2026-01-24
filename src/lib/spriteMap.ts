export interface SpriteInfo {
    url?: string;
    frames?: number;
    framePath?: string;
    frameWidth: number;
    frameHeight: number;
    animationSpeed: number;
}

export const SPRITE_MAP = {
    characters: {
        'spray-n-pray': {
            framePath: '/assets/sprites/spray-n-pray/{i}.png',
            frames: 4,
            frameWidth: 64,
            frameHeight: 64,
            animationSpeed: 100
        },
        'boom-bringer': {
            framePath: '/assets/sprites/boom-bringer/{i}.png',
            frames: 4,
            frameWidth: 64,
            frameHeight: 64,
            animationSpeed: 100
        },
        'glass-cannon-carl': {
            framePath: '/assets/sprites/glass-cannon-carl/{i}.png',
            frames: 4,
            frameWidth: 64,
            frameHeight: 64,
            animationSpeed: 100
        },
        'pet-pal-percy': {
            framePath: '/assets/sprites/pet-pal-percy/{i}.png',
            frames: 4,
            frameWidth: 64,
            frameHeight: 64,
            animationSpeed: 120
        },
        'vampire-vex': {
            framePath: '/assets/sprites/vampire-vex/{i}.png',
            frames: 4,
            frameWidth: 64,
            frameHeight: 64,
            animationSpeed: 150
        },
        'turret-tina': {
            framePath: '/assets/sprites/turret-tina/{i}.png',
            frames: 4,
            frameWidth: 64,
            frameHeight: 64,
            animationSpeed: 100
        },
        'dash-dynamo': {
            framePath: '/assets/sprites/dash-dynamo/{i}.png',
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

export type CharacterType = keyof typeof SPRITE_MAP.characters;
export type EnemyType = keyof typeof SPRITE_MAP.enemies;
