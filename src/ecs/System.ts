import { Entity } from './Entity';

export abstract class System {
  abstract update(entities: Entity[], delta: number): void;
}
