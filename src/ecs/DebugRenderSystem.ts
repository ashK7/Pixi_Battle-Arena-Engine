import { System } from './System';
import { Entity } from './Entity';
import { Container, Graphics } from 'pixi.js';

export class DebugRenderSystem extends System {
  private debugContainer: Container;
  private hitboxGraphics: Graphics;

  constructor(gameContainer: Container) {
    super();
    this.debugContainer = gameContainer;
    
    this.hitboxGraphics = new Graphics();
    this.hitboxGraphics.zIndex = 999;
    this.debugContainer.addChild(this.hitboxGraphics);
  }

  toggle(visible: boolean) {
    this.hitboxGraphics.visible = visible;
  }

  update(entities: Entity[]) {
    if (!this.hitboxGraphics.visible) {
      this.hitboxGraphics.clear();
      return;
    }

    this.hitboxGraphics.clear();

    for (const entity of entities) {
      const pos = entity.getComponent<{ x: number, y: number }>('position');
      if (!pos) continue;

      if (entity.hasComponent('player') || entity.hasComponent('enemy')) {
        const radius = 25; 
        const color = entity.hasComponent('player') ? 0x00ff00 : 0xff0000;
        
        this.hitboxGraphics
            .stroke({ width: 2, color: color, alpha: 0.8 })
            .circle(pos.x, pos.y, radius);
      }
    }
  }
}