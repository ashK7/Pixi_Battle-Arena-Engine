import { Entity } from './Entity';
import { System } from './System';
import { Logger } from '../Logger';

export class World {
  entities: Entity[] = [];
  systems: System[] = [];

  createEntity(): Entity {
    const entity = new Entity();
    this.entities.push(entity);
     Logger.spawn(entity, 'Generic Entity'); 
    return entity;
  }

  addSystem(system: System) {
    this.systems.push(system);
  }

   getSystem(systemClass: any) {
    return this.systems.find(s => s instanceof systemClass);
  }

  update(delta: number) {
    for (const system of this.systems) {
      system.update(this.entities, delta);
    }
  }

  clear() {
    for (const entity of this.entities) {
      if (entity.hasComponent('sprite')) {
        const sprite = entity.getComponent<any>('sprite');
        if (sprite.parent) {
          sprite.parent.removeChild(sprite);
        }
        sprite.destroy();
      }
      if (entity.hasComponent('graphics')) {
        const gfx = entity.getComponent<any>('graphics');
        if (gfx.parent) {
          gfx.parent.removeChild(gfx);
        }
        gfx.destroy();
      }
    }
    this.entities = [];
  }
}