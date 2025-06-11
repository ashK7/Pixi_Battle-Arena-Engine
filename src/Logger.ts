import { Entity } from './ecs/Entity';

export class Logger {
  public static enabled = true;

  private static getTimestamp(): string {
    const now = new Date();
    return `[${now.getHours()}:${now.getMinutes()}:${now.getSeconds()}.${now.getMilliseconds()}]`;
  }

  public static spawn(entity: Entity, type: string) {
    if (!this.enabled) return;
    console.log(`%c${this.getTimestamp()} SPAWN: ${type} (ID: ${entity.id})`, 'color: #8eff8e');
  }

  public static destroy(entity: Entity, reason: string) {
    if (!this.enabled) return;
    let type = 'Entity';
    if(entity.hasComponent('player')) type = 'Player';
    else if(entity.hasComponent('enemy')) type = 'Enemy';
    else if(entity.hasComponent('projectile')) type = 'Projectile';

    console.log(`%c${this.getTimestamp()} DESTROY: ${type} (ID: ${entity.id}) - Reason: ${reason}`, 'color: #ff9e9e');
  }

  public static stateChange(entity: Entity, from: string, to: string) {
    if (!this.enabled) return;
    console.log(`%c${this.getTimestamp()} AI_STATE_CHANGE: Enemy (ID: ${entity.id}) changed from ${from} to ${to}`, 'color: #9eacff');
  }
}