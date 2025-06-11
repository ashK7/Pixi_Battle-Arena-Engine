import { System } from './System';
import { Entity } from './Entity';

export class MovementSystem extends System {
  update(entities: Entity[], delta: number) {
    for (const entity of entities) {

      const pos = entity.getComponent<{ x: number; y: number }>('position');
      const vel = entity.getComponent<{ x: number; y: number }>('velocity');

      if (pos && vel) {
        pos.x += vel.x * delta;
        pos.y += vel.y * delta;
      }
    }
  }
}