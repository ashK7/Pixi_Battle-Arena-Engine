import { System } from './System';
import { Entity } from './Entity';
import { World } from './World';
import { Container, Graphics } from 'pixi.js';

export class TrailSystem extends System {
  private world: World;
  private gameContainer: Container;

  constructor(world: World, gameContainer: Container) {
    super();
    this.world = world;
    this.gameContainer = gameContainer;
  }

  update(entities: Entity[], delta: number): void {
    for (const entity of entities) {
      const trail = entity.getComponent<{ rate: number, cooldown: number }>('trail');

      if (trail) {
        trail.cooldown -= delta;

        if (trail.cooldown <= 0) {
          trail.cooldown = trail.rate; 

          const pos = entity.getComponent<{ x: number, y: number }>('position');
          if (pos) {
            this.createSmokeParticle(pos.x, pos.y);
          }
        }
      }
    }
  }

  private createSmokeParticle(x: number, y: number) {
    const particle = this.world.createEntity();
    
    particle.addComponent('position', { x, y });
    particle.addComponent('velocity', { x: 0, y: 0 });

    const lifetime = 30 + Math.random() * 20;
    particle.addComponent('particle', { lifetime, maxLifetime: lifetime });

    const gfx = new Graphics();
    gfx.circle(0, 0, 1 + Math.random() * 2).fill({ color: 0xffffff, alpha: 0.5 });
    particle.addComponent('graphics', gfx);
    
    this.gameContainer.addChild(gfx);
  }
}