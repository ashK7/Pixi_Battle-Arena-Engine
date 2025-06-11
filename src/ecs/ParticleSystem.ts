import { System } from './System';
import { Entity } from './Entity';
import { Graphics } from 'pixi.js';

export class ParticleSystem extends System {
  update(entities: Entity[], delta: number) {

    for (let i = entities.length - 1; i >= 0; i--) {
      const entity = entities[i];

      if (entity.hasComponent('particle')) {
        const particle = entity.getComponent<{ lifetime: number, maxLifetime: number }>('particle');
        const gfx = entity.getComponent<Graphics>('graphics');

        if (!particle || !gfx) continue;

        particle.lifetime -= delta;

        if (particle.lifetime <= 0) {

          gfx.parent.removeChild(gfx);
          gfx.destroy();
          entities.splice(i, 1);
          continue;
        }

        const pos = entity.getComponent<{ x: number, y: number }>('position');
        if (pos) {
            gfx.x = pos.x;
            gfx.y = pos.y;
        }

        gfx.alpha = particle.lifetime / particle.maxLifetime;
      }
    }
  }
}