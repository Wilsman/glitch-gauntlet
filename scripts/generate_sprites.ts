import fs from 'fs';
import path from 'path';

const API_KEY = process.env.PIXELLAB_API_KEY;
const BASE_URL = "https://api.pixellab.ai/v1";

interface SpriteTask {
    name: string;
    description: string;
    type: 'static' | 'animated';
    action?: string;
    view?: 'side' | 'low top-down' | 'high top-down';
    direction?: 'north' | 'east' | 'south' | 'west' | 'north-east' | 'north-west' | 'south-east' | 'south-west';
}

async function generateStaticSprite(description: string, filename: string) {
    console.log(`Generating static sprite for: ${filename}...`);

    const response = await fetch(`${BASE_URL}/generate-image-pixflux`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${API_KEY}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            description,
            image_size: { width: 64, height: 64 },
            no_background: true,
        }),
    });

    if (!response.ok) {
        const error = await response.text();
        console.error(`Failed to generate sprite: ${response.status} ${response.statusText}`, error);
        return null;
    }

    const data = await response.json();
    const base64Data = data.image.base64.replace(/^data:image\/\w+;base64,/, "");
    return Buffer.from(base64Data, 'base64');
}

async function generateAnimatedSprite(task: SpriteTask) {
    // First, generate a static reference image
    console.log(`Generating reference image for: ${task.name}...`);
    const refBuffer = await generateStaticSprite(task.description + ", standing still, neutral pose", `${task.name}_ref.png`);
    if (!refBuffer) return;

    const refBase64 = refBuffer.toString('base64');

    console.log(`Generating animation frames for: ${task.name}...`);
    const response = await fetch(`${BASE_URL}/animate-with-text`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${API_KEY}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            description: task.description,
            action: task.action || "walk",
            view: task.view || "high top-down",
            direction: task.direction || "south",
            image_size: { width: 64, height: 64 },
            n_frames: 4,
            reference_image: { base64: refBase64 }
        }),
    });

    if (!response.ok) {
        const error = await response.text();
        console.error(`Failed to generate animation for ${task.name}: ${response.status} ${response.statusText}`, error);
        return;
    }

    const data = await response.json();
    const frames = data.images;

    const outputDir = path.resolve(process.cwd(), 'public/assets/sprites', task.name);
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    frames.forEach((frame: any, i: number) => {
        const base64Data = frame.base64.replace(/^data:image\/\w+;base64,/, "");
        const buffer = Buffer.from(base64Data, 'base64');
        fs.writeFileSync(path.join(outputDir, `${i}.png`), buffer);
    });

    console.log(`Animation frames saved to: ${outputDir}`);
}

async function main() {
    const tasks: SpriteTask[] = [
        // Characters
        {
            name: "spray-n-pray",
            description: "Futuristic pixel art soldier, rapid-fire specialist, cyberpunk soldier with a neon rifle, top-down view",
            type: 'animated'
        },
        {
            name: "boom-bringer",
            description: "Heavy armor pixel art demolitions expert, carrying grenade launcher, explosive specialist, top-down",
            type: 'animated'
        },
        {
            name: "glass-cannon-carl",
            description: "Lean pixel art sniper, long range rifle, precision marksman, fragile but deadly, top-down",
            type: 'animated'
        },
        {
            name: "pet-pal-percy",
            description: "Pixel art survivor with a trusty dachshund companion, adventurer, top-down",
            type: 'animated'
        },
        {
            name: "vampire-vex",
            description: "Gothic pixel art vampire, glowing red eyes, levitating, dark cloak, top-down",
            type: 'animated'
        },
        {
            name: "turret-tina",
            description: "Engineer pixel art woman, mechanical parts, carrying blueprints and tools, top-down",
            type: 'animated'
        },
        {
            name: "dash-dynamo",
            description: "Speedster pixel art monk, glowing blue trail, athletic build, top-down",
            type: 'animated'
        },
        // Enemies
        {
            name: "slugger",
            description: "Glowing orange biological slug mutant, leaving radioactive trail, pixel art, top-down",
            type: 'animated'
        },
        {
            name: "hellhound",
            description: "Demonic robotic dog, glowing red eyes, mechanical parts, pixel art, top-down",
            type: 'animated'
        },
        {
            name: "grunt",
            description: "Cybernetic grunt soldier, glowing green visor, standard infantry, pixel art, top-down",
            type: 'animated'
        }
    ];

    for (const task of tasks) {
        // Check if already generated to save credits/time
        const checkFile = path.resolve(process.cwd(), 'public/assets/sprites', task.name, '0.png');
        if (fs.existsSync(checkFile)) {
            console.log(`Sprite for ${task.name} already exists, skipping...`);
            continue;
        }

        await generateAnimatedSprite(task);
    }
}

main().catch(console.error);
