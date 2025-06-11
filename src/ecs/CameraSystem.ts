import { System } from './System';
import { Entity } from './Entity';
import { Container, Rectangle } from 'pixi.js';
import { ParallaxBackground } from '../ParallaxBackground';

export class CameraSystem extends System {
    private gameContainer: Container;
    private screen: Rectangle;
    private background: ParallaxBackground;
    private worldBounds: Rectangle;
    private smoothingFactor = 0.05;

    private shakeDuration = 0;
    private shakeMagnitude = 0;
    private shakeTargetX = 0;
    private shakeTargetY = 0;

    constructor(gameContainer: Container, screen: Rectangle, background: ParallaxBackground, worldBounds: Rectangle) {
        super();
        this.gameContainer = gameContainer;
        this.screen = screen;
        this.background = background;
        this.worldBounds = worldBounds;
    }

    public triggerShake(magnitude: number, duration: number) {
        this.shakeMagnitude = magnitude;
        this.shakeDuration = duration;
    }

    update(entities: Entity[], delta: number): void {
        const player = entities.find(e => e.hasComponent('player'));
        if (!player) return;

        const playerPos = player.getComponent<{ x: number, y: number }>('position');
        if (!playerPos) return;

        this.shakeTargetX = this.screen.width / 2 - playerPos.x;
        this.shakeTargetY = this.screen.height / 2 - playerPos.y;

        this.shakeTargetX = Math.min(this.shakeTargetX, -this.worldBounds.x); 
        this.shakeTargetX = Math.max(this.shakeTargetX, -(this.worldBounds.width - this.screen.width));
        this.shakeTargetY = Math.min(this.shakeTargetY, -this.worldBounds.y);
        this.shakeTargetY = Math.max(this.shakeTargetY, -(this.worldBounds.height - this.screen.height));

        if (this.shakeDuration > 0) {
            this.shakeDuration -= delta;
            const shakeX = (Math.random() - 0.5) * this.shakeMagnitude;
            const shakeY = (Math.random() - 0.5) * this.shakeMagnitude;
            this.gameContainer.x = this.shakeTargetX + shakeX;
            this.gameContainer.y = this.shakeTargetY + shakeY;
        } else {
            this.gameContainer.x += (this.shakeTargetX - this.gameContainer.x) * this.smoothingFactor * delta;
            this.gameContainer.y += (this.shakeTargetY - this.gameContainer.y) * this.smoothingFactor * delta;
        }

        this.background.update(this.gameContainer.x, this.gameContainer.y);
    }
}