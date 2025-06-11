import { System } from './System';
import { Entity } from './Entity';
import { Container, Text } from 'pixi.js';

export interface ActiveEffect {
  name: 'slow' | 'poison';
  duration: number;
  maxDuration: number;
  data?: { [key: string]: any; tickRate?: number; tickCooldown?: number; damagePerTick?: number; };
  uiElement?: Text;
}

export class BuffDebuffSystem extends System {
  private uiContainer: Container;

  constructor() {
    super();
    this.uiContainer = new Container();
  }
  
  public getUIContainer(): Container {
    return this.uiContainer;
  }

  update(entities: Entity[], delta: number): void {
    for (const entity of entities) {
      if (!entity.hasComponent('effects')) continue;
      
      const effects = entity.getComponent<ActiveEffect[]>('effects');
      const sprite = entity.getComponent<Container>('sprite');
      const health = entity.getComponent<{ value: number }>('health');

      if (!effects || !sprite) continue;

      for (let i = effects.length - 1; i >= 0; i--) {
        const effect = effects[i];
        effect.duration -= delta;

        if (effect.name === 'poison' && effect.data) {
            if (typeof effect.data.tickCooldown === 'undefined') {
                effect.data.tickCooldown = effect.data.tickRate;
            }

            if (typeof effect.data.tickCooldown === 'number') {
                effect.data.tickCooldown -= delta;

                if (effect.data.tickCooldown <= 0) {
                    if (health && typeof effect.data.damagePerTick === 'number') {
                        health.value -= effect.data.damagePerTick;
                    }
                    effect.data.tickCooldown = effect.data.tickRate;
                }
            }
        }

        if (!effect.uiElement) {
            const text = new Text({
                text: `${effect.name.toUpperCase()}`,
                style: { fill: effect.name === 'poison' ? 0x00ff00 : 0xff0000, fontSize: 18, stroke: { color: 0x000000, width: 2 } }
            });
            text.anchor.set(0.5);
            effect.uiElement = text;
            this.uiContainer.addChild(text);
        }
        
        effect.uiElement.position.set(sprite.x, sprite.y + 45 + (i * 20));

        if (effect.duration <= 0) {
          if (effect.uiElement) {
            effect.uiElement.destroy();
          }
          effects.splice(i, 1);
        }
      }
    }
  }
}