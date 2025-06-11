import { System } from './System';
import { Entity } from './Entity';
import { UIOverlay } from './UIOverlay';
import { Quadtree, Rectangle as QuadtreeBounds } from './Quadtree';
import { sound } from '@pixi/sound';
import { Sprite, Texture, Spritesheet, Graphics, Container } from 'pixi.js';
import { World } from './World';
import type { ActiveEffect } from './BuffDebuffSystem';
import { CameraSystem } from './CameraSystem';
import { Logger } from '../Logger';


export function checkCollision(
  a: { x: number; y: number },
  b: { x: number; y: number },
  radiusA: number,
  radiusB: number
): boolean {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const distance = Math.sqrt(dx * dx + dy * dy);
  return distance < radiusA + radiusB;
}

export class CollisionSystem extends System {
  private uiOverlay: UIOverlay;
  private worldBounds = new QuadtreeBounds(512, 384, 512, 384);
  private onGameOver: () => void;
  private sheet: Spritesheet;
  private world: World;
  private gameContainer: Container;
  private cameraSystem: CameraSystem;

  private playerRadius = 25;
  private enemyRadius = 25;
  private projectileRadius = 5;

  constructor(
    uiOverlay: UIOverlay,
    onGameOver: () => void,
    sheet: Spritesheet,
    world: World,
    gameContainer: Container,
    cameraSystem: CameraSystem
  ) {
    super();
    this.uiOverlay = uiOverlay;
    this.onGameOver = onGameOver;
    this.sheet = sheet;
    this.world = world;
    this.gameContainer = gameContainer;
    this.cameraSystem = cameraSystem;
  }
  
  private _createExplosion(x: number, y: number) {
    const count = 20;
    const speed = 3;
    for (let i = 0; i < count; i++) {
      const particle = this.world.createEntity();
      const angle = Math.random() * Math.PI * 2;
      const randomSpeed = Math.random() * speed;
      particle.addComponent("position", { x, y });
      particle.addComponent("velocity", {
        x: Math.cos(angle) * randomSpeed,
        y: Math.sin(angle) * randomSpeed,
      });
      const lifetime = 20 + Math.random() * 20;
      particle.addComponent("particle", { lifetime, maxLifetime: lifetime });
      const gfx = new Graphics();
      gfx.circle(0, 0, 1 + Math.random() * 2).fill(0xffd352);
      particle.addComponent("graphics", gfx);
      this.gameContainer.addChild(gfx);
    }
  }

  private removeEntity(entity: Entity, allEntities: Entity[]) {

     Logger.destroy(entity, 'Collision');
    
    if (entity.hasComponent('aoeOnDeath')) {
      const aoeData = entity.getComponent<{ radius: number, damage: number }>('aoeOnDeath');
      const position = entity.getComponent<{ x: number, y: number }>('position');
      
      if (aoeData && position) {
        this._createExplosion(position.x, position.y); 
        if (sound.exists("explosionSound")) sound.play("explosionSound");
        this.cameraSystem.triggerShake(25, 25);
        
        const targets = allEntities.filter(e => e.hasComponent('enemy') || e.hasComponent('player'));
        for (const target of targets) {
          if (target.id === entity.id) continue;

          const targetPos = target.getComponent<{ x: number, y: number }>('position');
          if (targetPos) {
            const distance = Math.sqrt(Math.pow(position.x - targetPos.x, 2) + Math.pow(position.y - targetPos.y, 2));

            if (distance <= aoeData.radius) {
              const targetHealth = target.getComponent<{ value: number }>('health');
              if (targetHealth) {
                targetHealth.value -= aoeData.damage;

                if (target.hasComponent('player')) {
                    this.uiOverlay.setHealth(targetHealth.value);
                    this.flashDamage(target, 'player');
                    if (targetHealth.value <= 0) this.onGameOver();
                } else if (target.hasComponent('enemy')) {
                    this.flashDamage(target, 'enemy');
                    if (targetHealth.value <= 0) {
                        this._createExplosion(targetPos.x, targetPos.y);
                        
                        const playerScore = allEntities.find(e => e.hasComponent('score'))?.getComponent<{value: number}>('score');
                        if (playerScore) {
                            playerScore.value += 10;
                            this.uiOverlay.setScore(playerScore.value);
                        }
                        
                        this.removeEntity(target, allEntities);
                    }
                }
              }
            }
          }
        }
      }
    }

    if (entity.hasComponent("sprite")) {
      const sprite = entity.getComponent<any>("sprite");
      if (sprite.parent) {
        sprite.parent.removeChild(sprite);
      }
      sprite.destroy();
    }
    if (entity.hasComponent("graphics")) {
      const gfx = entity.getComponent<any>("graphics");
      if (gfx.parent) {
        gfx.parent.removeChild(gfx);
      }
      gfx.destroy();
    }
    const index = allEntities.findIndex((e) => e.id === entity.id);
    if (index !== -1) {
      allEntities.splice(index, 1);
    }
  }


  update(entities: Entity[], _delta: number) {
    const player = entities.find((e) => e.hasComponent("player"));
    const enemies = entities.filter((e) => e.hasComponent("enemy"));
    const projectiles = entities.filter((e) => e.hasComponent("projectile"));
    if (!player) return;

    const playerPos = player.getComponent<{ x: number; y: number }>("position");
    const playerHealth = player.getComponent<{ value: number }>("health");
    const playerScore = player.getComponent<{ value: number }>("score");

    const enemyQuadtree = new Quadtree(this.worldBounds, 4);
    for (const enemy of enemies) {
      const pos = enemy.getComponent<{ x: number; y: number }>("position");
      if (pos) {
        enemyQuadtree.insert({ x: pos.x, y: pos.y, entity: enemy });
      }
    }

    if (playerPos) {
      const searchArea = new QuadtreeBounds(playerPos.x, playerPos.y, 40, 40);
      const nearbyEnemies = enemyQuadtree.query(searchArea);
      for (const point of nearbyEnemies) {
        if (checkCollision(playerPos, point, this.playerRadius, this.enemyRadius)) {
          if (playerHealth && playerHealth.value > 0) {
            playerHealth.value--;
            this.uiOverlay.setHealth(playerHealth.value);
            this.flashDamage(player, "player");
            this.cameraSystem.triggerShake(15, 20);
            this._createExplosion(point.x, point.y);
            if (sound.exists("explosionSound")) sound.play("explosionSound");
            this.removeEntity(point.entity, entities);

            if (playerHealth.value <= 0) {
                this.onGameOver();
            }
          }
          continue; 
        }
      }
    }
    
    for (const proj of projectiles) {
        const projPos = proj.getComponent<{ x: number; y: number }>("position");
        const projTeam = proj.getComponent<{ id: string }>("team");
        if (!projPos || !projTeam) continue;
  
        if (projTeam.id === "player") {
          const currentEnemies = [...enemies];
          for (const enemy of currentEnemies) {
            const enemyPos = enemy.getComponent<{ x: number; y: number }>("position");
            if (enemyPos && checkCollision(projPos, enemyPos, this.projectileRadius, this.enemyRadius)) {
              const enemyHealth = enemy.getComponent<{ value: number }>("health");
              const projDamage = proj.getComponent<{ value: number }>("damage");
              if (enemyHealth && projDamage) {
                enemyHealth.value -= projDamage.value;
                this.flashDamage(enemy, "enemy");
              }
              this.removeEntity(proj, entities);
              if (enemyHealth && enemyHealth.value <= 0) {
                if (playerScore) {
                  playerScore.value += 10;
                  this.uiOverlay.setScore(playerScore.value);
                }
                 if (!proj.hasComponent('aoeOnDeath')) {
                    this._createExplosion(enemyPos.x, enemyPos.y);
                    if (sound.exists("explosionSound")) sound.play("explosionSound");
                }
                this.removeEntity(enemy, entities);
              }
              break; 
            }
          }
        } 
        else if (projTeam.id === "enemy" && player && playerPos) {
          if (checkCollision(projPos, playerPos, this.projectileRadius, this.playerRadius)) {
            if(playerHealth) {
              const projDamage = proj.getComponent<{ value: number }>("damage");
              if(projDamage) playerHealth.value -= projDamage.value;

              this.flashDamage(player, "player");
              this.uiOverlay.setHealth(playerHealth.value);
              
              const effectData = proj.getComponent<{name: 'poison' | 'slow', duration: number, options: any}>('appliesEffectOnHit');
              if (effectData) {
                  if (!player.hasComponent('effects')) player.addComponent('effects', []);
                  const effects = player.getComponent<ActiveEffect[]>('effects');
                  if (effects) {
                      const existingEffect = effects.find(e => e.name === effectData.name);
                      if (existingEffect) {
                          existingEffect.duration = effectData.duration;
                      } else {
                          effects.push({
                              name: effectData.name,
                              duration: effectData.duration,
                              maxDuration: effectData.duration,
                              data: effectData.options
                          });
                      }
                  }
              }

              if (playerHealth.value <= 0) this.onGameOver();
            }
            this.removeEntity(proj, entities);
          }
        }
      }
  }

  flashDamage(entity: Entity, type: "player" | "enemy") {
    const sprite = entity.getComponent<Sprite>("sprite");
    if (!sprite || sprite.destroyed) return;

    const sheet = this.sheet;
    let originalTexture: Texture | undefined;
    let damageTexture: Texture | undefined;

    if (type === "player") {
      originalTexture = sheet.textures["playerShip1_orange.png"];
      damageTexture = sheet.textures["playerShip1_damage2.png"];
    } else {
      const textureNameComp = entity.getComponent<{ original: string }>("textureName");
      if (textureNameComp) {
        const originalName = textureNameComp.original;
        const damageName = originalName.replace(".png", "_damage1.png");
        originalTexture = sheet.textures[originalName];
        damageTexture = sheet.textures[damageName];
      }
    }

    if (damageTexture && originalTexture) {
      sprite.texture = damageTexture;
      setTimeout(() => {
        if (sprite && !sprite.destroyed) {
          sprite.texture = originalTexture!;
        }
      }, 100);
    }
  }
}