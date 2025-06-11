import { System } from './System';
import { Entity } from './Entity';
import { Graphics, Container } from 'pixi.js';

export class ProjectileSystem extends System {
  container: Container;

  constructor(container: Container) {
    super();
    this.container = container;
  }

  update(entities: Entity[]) {
    for (const entity of entities) {
      if (entity.hasComponent('projectile')) {
        let gfx = entity.getComponent<Graphics>('graphics');
        const team = entity.getComponent<{id: string}>('team');

        if (!gfx) {
          gfx = new Graphics();
          const bulletColor = team?.id === 'player' ? 0x00ffff : 0xff0000;
          gfx.beginFill(bulletColor);
          gfx.drawRect(0, 0, 4, 10); 
          gfx.endFill();
          this.container.addChild(gfx);
          entity.addComponent('graphics', gfx);
        }

        const pos = entity.getComponent<{ x: number; y: number }>('position');
        const vel = entity.getComponent<{ x: number; y: number }>('velocity');

        if (pos && vel && gfx) {
          gfx.x = pos.x;
          gfx.y = pos.y;
          gfx.rotation = Math.atan2(vel.y, vel.x) + Math.PI / 2;
        }
      }
    }
  }
}