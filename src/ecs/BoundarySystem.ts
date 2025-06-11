import { System } from './System';
import { Entity } from './Entity';
import { Rectangle } from 'pixi.js';
import { Logger } from '../Logger';

export class BoundarySystem extends System {
  private worldBounds: Rectangle;

  constructor(screenBounds: Rectangle) {
    super();
    this.worldBounds = new Rectangle(
      screenBounds.x - 100,
      screenBounds.y - 100,
      screenBounds.width + 200,
      screenBounds.height + 200
    );
  }

  private removeEntity(entity: Entity, allEntities: Entity[]) {

     Logger.destroy(entity, 'Went out of bounds');

    if (entity.hasComponent('sprite')) {
        const sprite = entity.getComponent<any>('sprite');
        if (sprite.parent) { sprite.parent.removeChild(sprite); }
        sprite.destroy();
    }
    if (entity.hasComponent('graphics')) {
        const gfx = entity.getComponent<any>('graphics');
        if (gfx.parent) { gfx.parent.removeChild(gfx); }
        gfx.destroy();
    }
    const index = allEntities.findIndex(e => e.id === entity.id);
    if (index !== -1) { allEntities.splice(index, 1); }
  }

  update(entities: Entity[]) {
    const entitiesToCheck = [...entities]; 

    for (const entity of entitiesToCheck) {
      if (entity.hasComponent('enemy') || entity.hasComponent('projectile')) {
        const pos = entity.getComponent<{ x: number, y: number }>('position');
        if (pos) {
          if (pos.x < this.worldBounds.x || 
              pos.x > this.worldBounds.x + this.worldBounds.width ||
              pos.y < this.worldBounds.y ||
              pos.y > this.worldBounds.y + this.worldBounds.height) 
          {
            this.removeEntity(entity, entities);
          }
        }
      }
    }
  }
}