import { System } from './System';
import { Entity } from './Entity';
import { Container, Sprite, Spritesheet } from 'pixi.js';

export class EnemySystem extends System {
  container: Container;
  sheet: Spritesheet;
  enemyTextures = [ 'enemyBlack1.png', 'enemyBlue2.png', 'enemyGreen3.png', 'enemyRed2.png', 'ufoBlue.png', 'ufoGreen.png' ];

  constructor(container: Container, sheet: Spritesheet) {
    super();
    this.container = container;
    this.sheet = sheet;
  }

  update(entities: Entity[], _delta: number) {
    for (const entity of entities) {
      if (entity.hasComponent('enemy')) {
        let sprite = entity.getComponent<Sprite>('sprite');
        let thrustSprite = entity.getComponent<Sprite>('thrustSprite');

        if (!sprite) {
          const textureName = this.enemyTextures[Math.floor(Math.random() * this.enemyTextures.length)];
          const texture = this.sheet.textures[textureName];
          
          if (!texture) {
            console.warn(`Texture not found in spritesheet: ${textureName}`);
            continue;
          }

          sprite = new Sprite(texture);
          sprite.anchor.set(0.5);
          sprite.scale.set(0.75);
          this.container.addChild(sprite);
          entity.addComponent('sprite', sprite);
          entity.addComponent('textureName', { original: textureName });

          thrustSprite = new Sprite(this.sheet.textures['fire08.png']);
          thrustSprite.anchor.set(0.5, 0);
          thrustSprite.position.set(0, sprite.height / 2 - 15);
          thrustSprite.scale.set(0.8);
          thrustSprite.tint = 0xFFFF00;
          sprite.addChild(thrustSprite);
          entity.addComponent('thrustSprite', thrustSprite);
        }
        
        const pos = entity.getComponent<{ x: number; y: number }>('position');
        const vel = entity.getComponent<{ x: number; y: number }>('velocity');

        if (pos && vel && sprite && thrustSprite) {
          sprite.x = pos.x;
          sprite.y = pos.y;
          sprite.rotation = Math.atan2(vel.y, vel.x) + Math.PI / 2;

          thrustSprite.visible = vel.x !== 0 || vel.y !== 0;
        }
      }
    }
  }
}