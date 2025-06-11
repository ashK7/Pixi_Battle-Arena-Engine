import { System } from './System';
import { Entity } from './Entity';
import { Container, Sprite, Rectangle, Spritesheet } from 'pixi.js';
import { World } from './World';
import { sound } from '@pixi/sound';
import type { ActiveEffect } from './BuffDebuffSystem';
import { playerActions } from '../playerActions';

const keys: Record<string, boolean> = {};
const mouse = { x: 0, y: 0, isDown: false };

window.addEventListener('keydown', (e) => {
    keys[e.key.toLowerCase()] = true;
});
window.addEventListener('keyup', (e) => {
    keys[e.key.toLowerCase()] = false;
});
window.addEventListener('mousemove', (e) => { 
    mouse.x = e.clientX; 
    mouse.y = e.clientY; 
});
window.addEventListener('mousedown', (e) => {
    e.preventDefault(); 
    mouse.isDown = true;
});
window.addEventListener('mouseup', (e) => {
    e.preventDefault();
    mouse.isDown = false;
});


export class PlayerSystem extends System {
  container: Container;
  world: World;
  screen: Rectangle;
  sheet: Spritesheet;
  worldBounds: Rectangle;

  private shootCooldown = 0;
  private fireRate = 5;
  private bombCooldown = 0;
  private bombFireRate = 1;

  constructor(container: Container, world: World, screen: Rectangle, sheet: Spritesheet, worldBounds: Rectangle) {
    super();
    this.container = container;
    this.world = world;
    this.screen = screen;
    this.sheet = sheet;
    this.worldBounds = worldBounds;
  }

  update(entities: Entity[], delta: number) {
    this.shootCooldown -= delta;
    this.bombCooldown -= delta;

    for (const entity of entities) {
      if (entity.hasComponent("player")) {
        let sprite = entity.getComponent<Sprite>("sprite");
        let thrustSprite = entity.getComponent<Sprite>('thrustSprite');
        if (!sprite) {
          sprite = new Sprite(this.sheet.textures['playerShip1_orange.png']);
          sprite.anchor.set(0.5);
          sprite.scale.set(0.75);
          this.container.addChild(sprite);
          entity.addComponent("sprite", sprite);
          
          thrustSprite = new Sprite(this.sheet.textures['fire08.png']);
          thrustSprite.anchor.set(0.5, 0);
          thrustSprite.position.set(0, sprite.height / 2 - 10);
          sprite.addChild(thrustSprite);
          entity.addComponent('thrustSprite', thrustSprite);
        }

        const pos = entity.getComponent<{ x: number; y: number }>("position");
        const vel = entity.getComponent<{ x: number; y: number }>("velocity");

        if (pos && vel && sprite && thrustSprite) {
          
          let moveSpeed = 5; 
          const effects = entity.getComponent<ActiveEffect[]>('effects');
          if (effects) {
            const slowEffect = effects.find(e => e.name === 'slow');
            if (slowEffect && slowEffect.data?.slowFactor) {
              moveSpeed *= slowEffect.data.slowFactor;
            }
          }

          let dx = 0;
          let dy = 0;
          if (keys['a']) dx -= 1;
          if (keys['d']) dx += 1;
          if (keys['w']) dy -= 1;
          if (keys['s']) dy += 1;
          
          vel.x = dx * moveSpeed;
          vel.y = dy * moveSpeed;
          
          const halfWidth = sprite.width / 2;
          const halfHeight = sprite.height / 2;
          if (pos.x < this.worldBounds.x + halfWidth) pos.x = this.worldBounds.x + halfWidth;
          if (pos.x > this.worldBounds.width - halfWidth) pos.x = this.worldBounds.width - halfWidth;
          if (pos.y < this.worldBounds.y + halfHeight) pos.y = this.worldBounds.y + halfHeight;
          if (pos.y > this.worldBounds.height - halfHeight) pos.y = this.worldBounds.height - halfHeight;

          sprite.x = pos.x;
          sprite.y = pos.y;
          sprite.rotation = dx * 0.1;
          
          thrustSprite.visible = (dx !== 0 || dy !== 0);

          if (this.shootCooldown <= 0) {
            let fireVector: { x: number; y: number } | null = null;
            const bulletSpeed = 12;
            if (keys['arrowup']) { fireVector = { x: 0, y: -bulletSpeed }; }
            else if (keys['arrowdown']) { fireVector = { x: 0, y: bulletSpeed }; }
            else if (keys['arrowleft']) { fireVector = { x: -bulletSpeed, y: 0 }; }
            else if (keys['arrowright']) { fireVector = { x: bulletSpeed, y: 0 }; }
            else if (mouse.isDown) {
              const angle = Math.atan2(mouse.y - this.container.y - pos.y, mouse.x - this.container.x - pos.x);
              fireVector = { x: Math.cos(angle) * bulletSpeed, y: Math.sin(angle) * bulletSpeed };
            }
            if (fireVector) {
              this.createBullet(pos, fireVector);
              this.shootCooldown = 60 / this.fireRate; 
            }
          }

          if (playerActions.wantsToFireBomb && this.bombCooldown <= 0) {
            const bulletSpeed = 8;
            const angle = Math.atan2(mouse.y - this.container.y - pos.y, mouse.x - this.container.x - pos.x);
            const fireVector = { x: Math.cos(angle) * bulletSpeed, y: Math.sin(angle) * bulletSpeed };
            this.createBomb(pos, fireVector);
            this.bombCooldown = 60 / this.bombFireRate;
            
            
            playerActions.wantsToFireBomb = false;
          }
        }
      }
    }
  }

  createBomb(playerPos: { x: number; y: number }, velocity: { x: number, y: number }) {
    if (sound.exists('playerLaserSound')) {
      sound.play('playerLaserSound');
    }

    const muzzleFlash = new Sprite(this.sheet.textures['fire01.png']);
    muzzleFlash.anchor.set(0.5);
    muzzleFlash.scale.set(0.6);
    muzzleFlash.x = playerPos.x;
    muzzleFlash.y = playerPos.y;
    muzzleFlash.rotation = Math.atan2(velocity.y, velocity.x) + Math.PI / 2;
    this.container.addChild(muzzleFlash);
    setTimeout(() => { if (!muzzleFlash.destroyed) { muzzleFlash.destroy(); } }, 50);

    const bomb = this.world.createEntity();
    bomb.addComponent('projectile', true);
    bomb.addComponent('team', { id: 'player' });
    bomb.addComponent('damage', { value: 3 });
    bomb.addComponent('position', { x: playerPos.x, y: playerPos.y });
    bomb.addComponent('velocity', velocity);
    bomb.addComponent('trail', { rate: 1, cooldown: 0 });
    bomb.addComponent('aoeOnDeath', { radius: 150, damage: 5 });

    const bombGfx = new Sprite(this.sheet.textures['fire02.png']);
    bombGfx.anchor.set(0.5);
    bombGfx.rotation = Math.atan2(velocity.y, velocity.x) + Math.PI / 2;
    bomb.addComponent('sprite', bombGfx);
    this.container.addChild(bombGfx);
  }

  createBullet(playerPos: { x: number; y: number }, velocity: { x: number, y: number }) {
    if (sound.exists('playerLaserSound')) {
      sound.play('playerLaserSound');
    }
    const muzzleFlash = new Sprite(this.sheet.textures['fire01.png']);
    muzzleFlash.anchor.set(0.5);
    muzzleFlash.scale.set(0.6);
    muzzleFlash.x = playerPos.x;
    muzzleFlash.y = playerPos.y;
    muzzleFlash.rotation = Math.atan2(velocity.y, velocity.x) + Math.PI / 2;
    this.container.addChild(muzzleFlash);
    setTimeout(() => { if (!muzzleFlash.destroyed) { muzzleFlash.destroy(); } }, 50);
    const bullet = this.world.createEntity();
    bullet.addComponent('projectile', true);
    bullet.addComponent('team', { id: 'player' });
    bullet.addComponent('damage', { value: 1 });
    bullet.addComponent('position', { x: playerPos.x, y: playerPos.y });
    bullet.addComponent('velocity', velocity);
    bullet.addComponent('trail', { rate: 3, cooldown: 0 });
  }
}