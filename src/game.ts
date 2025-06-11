import { Application, Container, Ticker, Assets, Text, Graphics, Spritesheet, Texture, Rectangle } from 'pixi.js';
import { World } from './ecs/World';
import { PlayerSystem } from './ecs/PlayerSystem';
import { EnemySystem } from './ecs/EnemySystem';
import { CollisionSystem } from './ecs/CollisionSystem';
import { UIOverlay } from './ecs/UIOverlay';
import { MovementSystem } from './ecs/MovementSystem';
import { ProjectileSystem } from './ecs/ProjectileSystem';
import { BehaviorSystem } from './ecs/BehaviorSystem';
import { BoundarySystem } from './ecs/BoundarySystem';
import { ParticleSystem } from './ecs/ParticleSystem';
import { TrailSystem } from './ecs/TrailSystem';
import { DebugRenderSystem } from './ecs/DebugRenderSystem';
import { ParallaxBackground } from './ParallaxBackground';
import { CameraSystem } from './ecs/CameraSystem';
import { BuffDebuffSystem } from './ecs/BuffDebuffSystem';
import { sound } from '@pixi/sound';


import { playerActions } from './playerActions';

const GameState = {
  SPLASH: 'SPLASH',
  RUNNING: 'RUNNING',
  GAME_OVER: 'GAME_OVER',
} as const;
type GameState = typeof GameState[keyof typeof GameState];

let gameState: GameState;
let sheet: Spritesheet | undefined;

const assetPaths = {
  spaceSheetXML: 'assets/sheet.xml',
  spaceSheetImage: 'assets/sheet.png',
  buttonClickSound: 'sounds/button-click.wav',
  bg_purple: 'assets/darkPurple.png',
  enemyLaserSound: 'sounds/enemy-laser.wav',
  explosionSound: 'sounds/explosion1.wav',
  playerLaserSound: 'sounds/laser1.wav',
  playerHitSound: 'sounds/player-hit.wav',
  backgroundMusic: 'sounds/music.mp3',
};

async function parseXmlSpritesheet(xmlText: string, texture: Texture): Promise<Spritesheet> {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlText, "text/xml");
    const atlas = xmlDoc.getElementsByTagName('TextureAtlas')[0];
    if (!atlas) { throw new Error("Could not find TextureAtlas in XML file."); }
    const subTextures = atlas.getElementsByTagName('SubTexture');
    const sheetData: any = { frames: {}, meta: {} };
    for (const subTexture of subTextures) {
        const name = subTexture.getAttribute('name')!;
        const x = parseInt(subTexture.getAttribute('x')!, 10);
        const y = parseInt(subTexture.getAttribute('y')!, 10);
        const width = parseInt(subTexture.getAttribute('width')!, 10);
        const height = parseInt(subTexture.getAttribute('height')!, 10);
        sheetData.frames[name] = {
            frame: { x, y, w: width, h: height },
            spriteSourceSize: { x: 0, y: 0, w: width, h: height },
            sourceSize: { w: width, h: height },
        };
    }
    const spritesheet = new Spritesheet(texture.baseTexture, sheetData);
    await spritesheet.parse();
    return spritesheet;
}

function createStarfieldTexture(app: Application): Texture {
    const starGraphics = new Graphics();
    for (let i = 0; i < 1000; i++) {
        const x = Math.random() * app.screen.width;
        const y = Math.random() * app.screen.height;
        const radius = Math.random() * 1.5;
        const alpha = 0.5 + Math.random() * 0.5;
        starGraphics.circle(x, y, radius).fill({ color: 0xffffff, alpha: alpha });
    }
    return app.renderer.generateTexture({target: starGraphics});
}

export const createGameApp = async () => {
    const app = new Application();
    await app.init({
        width: 1920,
        height: 1080,
        backgroundColor: 0x1c0f29,
    });

    try {
        if (!sheet) {
            if (!Assets.resolver.hasBundle('game-assets')) {
                await Assets.init();
                await Assets.addBundle('game-assets', assetPaths);
                await Assets.loadBundle('game-assets');
            }
            const xmlText = await Assets.load('spaceSheetXML');
            const sheetTexture = await Assets.load('spaceSheetImage');
            if (!xmlText || !sheetTexture) {
                throw new Error('Essential assets (XML or Image) not found in cache.');
            }
            sheet = await parseXmlSpritesheet(xmlText, sheetTexture);
        }
    } catch (e) {
        console.error("CRITICAL ASSET LOADING FAILED:", e);
        const errorText = new Text({ text: 'Error: Could not load game assets.\nCheck console (F12) for details.', style: { fill: 'red', fontSize: 20, align: 'center', wordWrap: true, wordWrapWidth: app.screen.width - 40 }});
        errorText.anchor.set(0.5);
        errorText.position.set(app.screen.width / 2, app.screen.height / 2);
        app.stage.addChild(errorText);
        return app;
    }

    const starTexture = createStarfieldTexture(app);
    const background = new ParallaxBackground(
        [
            { texture: await Assets.load('bg_purple'), speed: 0.2 },
            { texture: starTexture, speed: 0.5 },
        ],
        app.screen.width,
        app.screen.height
    );
    app.stage.addChildAt(background.container, 0);

    const splashContainer = new Container();
    const gameContainer = new Container();
    const gameOverContainer = new Container();
    
    gameContainer.sortableChildren = true;
    
    app.stage.addChild(gameContainer, splashContainer, gameOverContainer);

    const world = new World();
    const uiOverlay = new UIOverlay(app.screen);
    const worldBounds = new Rectangle(0, 0, app.screen.width * 2, app.screen.height * 2);
    
    const boundarySystem = new BoundarySystem(worldBounds);
    const cameraSystem = new CameraSystem(gameContainer, app.screen, background, worldBounds);
    const debugSystem = new DebugRenderSystem(gameContainer);
    debugSystem.toggle(false);

    app.stage.addChild(uiOverlay.view);
    
    const collisionSystem = new CollisionSystem(
        uiOverlay, 
        () => changeGameState(GameState.GAME_OVER), 
        sheet, 
        world, 
        gameContainer,
        cameraSystem
    );

    world.addSystem(new BehaviorSystem(world));
    world.addSystem(new PlayerSystem(gameContainer, world, app.screen, sheet, worldBounds));
    world.addSystem(new MovementSystem());
    world.addSystem(collisionSystem);
    world.addSystem(new BuffDebuffSystem());
    world.addSystem(new TrailSystem(world, gameContainer));
    world.addSystem(new ParticleSystem());
    world.addSystem(new EnemySystem(gameContainer, sheet));
    world.addSystem(new ProjectileSystem(gameContainer));
    world.addSystem(cameraSystem);
    world.addSystem(boundarySystem);
    world.addSystem(debugSystem);

    const fpsText = new Text({ text: 'FPS: 0', style: { fill: 0x00ff00, fontSize: 24 } });
    fpsText.position.set(10, app.screen.height - 40);
    app.stage.addChild(fpsText);
    fpsText.visible = false;

    const createButton = (text: string, width: number, height: number, onClick: () => void) => {
        const buttonContainer = new Container();
        const buttonText = new Text({ text, style: { fill: 0x000000, fontSize: 32 } });
        const background = new Graphics().rect(0, 0, width, height).fill(0x00ff00);
        buttonText.anchor.set(0.5);
        buttonText.position.set(width / 2, height / 2);
        buttonContainer.addChild(background, buttonText);
        buttonContainer.eventMode = 'static';
        buttonContainer.cursor = 'pointer';
        buttonContainer.on('pointerdown', onClick);
        return buttonContainer;
    };
    
    let isDebugVisible = false;
    const debugButton = createButton('Debug', 120, 50, () => {
        isDebugVisible = !isDebugVisible;
        debugSystem.toggle(isDebugVisible);
        fpsText.visible = isDebugVisible;
    });
    debugButton.position.set(app.screen.width - debugButton.width - 15, app.screen.height - 65);
    app.stage.addChild(debugButton);

    const bombButton = createButton('Fire Rocket', 220, 50, () => {
        playerActions.wantsToFireBomb = true;
    });
    bombButton.position.set(app.screen.width - bombButton.width - 15, app.screen.height - 130);
    bombButton.visible = false;
    app.stage.addChild(bombButton);


    const setupSplashScreen = () => {
        const title = new Text({ text: 'Space Combat', style: { fill: 0xffffff, fontSize: 64, align: 'center' } });
        title.anchor.set(0.5);
        title.position.set(app.screen.width / 2, app.screen.height / 3);
        const playButton = createButton('Play', 200, 60, () => changeGameState(GameState.RUNNING));
        playButton.position.set(app.screen.width / 2 - 100, app.screen.height / 2);
        splashContainer.addChild(title, playButton);
    };

    const setupGameOverScreen = () => {
        const title = new Text({ text: 'Game Over', style: { fill: 0xff0000, fontSize: 64, align: 'center' } });
        title.anchor.set(0.5);
        title.position.set(app.screen.width / 2, app.screen.height / 3);
        const playAgainButton = createButton('Play Again', 280, 60, () => changeGameState(GameState.SPLASH));
        playAgainButton.position.set(app.screen.width / 2 - 140, app.screen.height / 2);
        gameOverContainer.addChild(title, playAgainButton);
    };
    
    const resetGame = () => {
        world.clear();
        const player = world.createEntity();
        player.addComponent('player', true);
        player.addComponent('position', { x: worldBounds.width / 2, y: worldBounds.height - 200 });
        player.addComponent('velocity', { x: 0, y: 0 });
        player.addComponent('health', { value: 30 });
        player.addComponent('score', { value: 0 });
        player.addComponent('team', { id: 'player' });
        uiOverlay.setHealth(30);
        uiOverlay.setScore(0);
    };

    const changeGameState = (newState: GameState) => {
        gameState = newState;
        splashContainer.visible = gameState === GameState.SPLASH;
        gameContainer.visible = gameState === GameState.RUNNING;
        gameOverContainer.visible = gameState === GameState.GAME_OVER;
        bombButton.visible = gameState === GameState.RUNNING;

        if (sound.exists('backgroundMusic')) {
            sound.stop('backgroundMusic');
        }

        if (gameState === GameState.SPLASH) {
            world.clear();
            gameContainer.removeChildren();
            const debugGfx = (debugSystem as any).hitboxGraphics;
            if (debugGfx) gameContainer.addChild(debugGfx);
        }
        if (gameState === GameState.RUNNING) {
            resetGame();
            if (sound.exists('backgroundMusic')) {
                sound.play('backgroundMusic', { loop: true, volume: 0.3 });
            }
        }
    };

    const fixedDeltaTime = 1 / 60;
    let accumulator = 0;
    let lastSpawn = 0;

    app.ticker.add((ticker: Ticker) => {
        fpsText.text = `FPS: ${Math.round(ticker.FPS)}`;

        if (gameState !== GameState.RUNNING) return;
        
        accumulator += ticker.deltaMS / 1000;
        while (accumulator >= fixedDeltaTime) {
            world.update(1.0);
            accumulator -= fixedDeltaTime;
        }
        
        const now = performance.now();
        if (now - lastSpawn > 2000) {
            const enemy = world.createEntity();
            enemy.addComponent('enemy', true);
            
            const cameraX = -gameContainer.x;
            const cameraY = -gameContainer.y;
            const spawnEdge = Math.floor(Math.random() * 4);
            let spawnX = cameraX + Math.random() * app.screen.width;
            let spawnY = cameraY + Math.random() * app.screen.height;

            if(spawnEdge === 0) { // Top
                spawnY = cameraY - 100;
            } else if(spawnEdge === 1) { // Bottom
                spawnY = cameraY + app.screen.height + 100;
            } else if(spawnEdge === 2) { // Left
                spawnX = cameraX - 100;
            } else { // Right
                spawnX = cameraX + app.screen.width + 100;
            }

            enemy.addComponent('position', { x: spawnX, y: spawnY });
            enemy.addComponent('velocity', { x: 0, y: 0 });
            enemy.addComponent('health', { value: 3 });
            enemy.addComponent('team', { id: 'enemy' });
            enemy.addComponent('behavior', {
                state: 'SEEKING',
                detectionRange: 9999,
                attackRange: 600,
                fireRate: 1,
                shootCooldown: 0,
            });
            lastSpawn = now;
        }
    });

    setupSplashScreen();
    setupGameOverScreen();
    changeGameState(GameState.SPLASH);

    return app;
};