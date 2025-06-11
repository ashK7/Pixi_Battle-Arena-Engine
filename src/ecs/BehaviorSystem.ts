import { System } from './System';
import { Entity } from './Entity';
import { World } from './World';
import { Sprite } from 'pixi.js';
import { PlayerSystem } from './PlayerSystem';
import { Logger } from '../Logger';

function getDistance(pos1: { x: number; y: number }, pos2: { x: number; y: number }): number {
  const dx = pos1.x - pos2.x;
  const dy = pos1.y - pos2.y;
  return Math.sqrt(dx * dx + dy * dy);
}

export class BehaviorSystem extends System {
  world: World;

  constructor(world: World) {
    super();
    this.world = world;
  }

  update(entities: Entity[], delta: number) {
    const player = entities.find(e => e.hasComponent('player'));
    const projectiles = entities.filter(e => e.getComponent<{id: string}>('team')?.id === 'player');

    if (!player) return;
    const playerPos = player.getComponent<{ x: number, y: number }>('position');
    if (!playerPos) return;

    for (const entity of entities) {
      if (entity.hasComponent('behavior')) {
        const behavior = entity.getComponent<{
          state: string;
          patrolPath?: { x: number, y: number }[];
          patrolIndex?: number;
          detectionRange: number;
          attackRange: number;
          fireRate: number;
          shootCooldown: number;
          dodgeCooldown?: number;
          dodgeDirection?: { x: number, y: number };
        }>('behavior');
        const pos = entity.getComponent<{ x: number, y: number }>('position');
        const vel = entity.getComponent<{ x: number, y: number }>('velocity');
        const health = entity.getComponent<{ value: number }>('health');

        if (!behavior || !pos || !vel) continue;

        const stateBeforeUpdate = behavior.state;

        behavior.shootCooldown -= delta;
        if (typeof behavior.dodgeCooldown !== 'undefined') {
            behavior.dodgeCooldown -= delta;
        }

        let closestThreat: Entity | null = null;
        let minThreatDistance = 150; 

        if ((behavior.dodgeCooldown ?? 0) <= 0) {
            for (const proj of projectiles) {
                const projPos = proj.getComponent<{x: number, y: number}>('position');
                if (projPos) {
                    const distance = getDistance(pos, projPos);
                    if (distance < minThreatDistance) {
                        minThreatDistance = distance;
                        closestThreat = proj;
                    }
                }
            }
        }
        
        if (health && health.value <= 1) {
          behavior.state = 'FLEEING';
        } else if (closestThreat) {
            behavior.state = 'DODGING';
            behavior.dodgeCooldown = 60;
            
            const threatVel = closestThreat.getComponent<{x: number, y: number}>('velocity');
            if (threatVel) {
                const perpendicular = { x: -threatVel.y, y: threatVel.x };
                const dodgeDirection = Math.random() < 0.5 ? 1 : -1;
                behavior.dodgeDirection = { 
                    x: perpendicular.x * dodgeDirection, 
                    y: perpendicular.y * dodgeDirection 
                };
            }
        } else if (getDistance(pos, playerPos) < behavior.detectionRange && behavior.state !== 'ATTACKING') {
          behavior.state = 'SEEKING';
        }

        switch (behavior.state) {
          case 'PATROLLING':
            if (behavior.patrolPath && typeof behavior.patrolIndex !== 'undefined') {
              const patrolTarget = behavior.patrolPath[behavior.patrolIndex];
              const distanceToTarget = getDistance(pos, patrolTarget);
              
              if (distanceToTarget < 5) {
                behavior.patrolIndex = (behavior.patrolIndex + 1) % behavior.patrolPath.length;
              } else {
                const angle = Math.atan2(patrolTarget.y - pos.y, patrolTarget.x - pos.x);
                const speed = 1.5;
                vel.x = Math.cos(angle) * speed;
                vel.y = Math.sin(angle) * speed;
              }
            }
            break;
          case 'SEEKING':
            if (getDistance(pos, playerPos) < behavior.attackRange) {
              behavior.state = 'ATTACKING';
            } else if (getDistance(pos, playerPos) > behavior.detectionRange) {
              behavior.state = 'PATROLLING';
            } else {
              const angle = Math.atan2(playerPos.y - pos.y, playerPos.x - pos.x);
              const speed = 2;
              vel.x = Math.cos(angle) * speed;
              vel.y = Math.sin(angle) * speed;
            }
            break;
          case 'ATTACKING':
            if (getDistance(pos, playerPos) > behavior.attackRange) {
              behavior.state = 'SEEKING';
            } else {
              vel.x = 0;
              vel.y = 0;
              if (behavior.shootCooldown <= 0) {
                this.shoot(pos, playerPos);
                behavior.shootCooldown = 60 / behavior.fireRate;
              }
            }
            break;
          case 'FLEEING':
            const fleeAngle = Math.atan2(pos.y - playerPos.y, pos.x - playerPos.x);
            const fleeSpeed = 2.5;
            vel.x = Math.cos(fleeAngle) * fleeSpeed;
            vel.y = Math.sin(fleeAngle) * fleeSpeed;
            break;

          case 'DODGING':
              if (behavior.dodgeDirection) {
                  const dodgeSpeed = 4;
                  const magnitude = Math.sqrt(behavior.dodgeDirection.x**2 + behavior.dodgeDirection.y**2);
                  if (magnitude > 0) {
                    vel.x = (behavior.dodgeDirection.x / magnitude) * dodgeSpeed;
                    vel.y = (behavior.dodgeDirection.y / magnitude) * dodgeSpeed;
                  }
              }
              behavior.state = 'PATROLLING';
              break;
        }

        // --- NEW --- After all logic, compare the current state to the original state
        if (behavior.state !== stateBeforeUpdate) {
            Logger.stateChange(entity, stateBeforeUpdate, behavior.state);
        }
      }
    }
  }

  shoot(enemyPos: { x: number, y: number }, playerPos: { x: number, y: number }) {
    const angle = Math.atan2(playerPos.y - enemyPos.y, playerPos.x - enemyPos.x);
    const bulletSpeed = 5;
    const velocity = { x: Math.cos(angle) * bulletSpeed, y: Math.sin(angle) * bulletSpeed };
    const playerSystem = this.world.getSystem(PlayerSystem) as PlayerSystem;
    
    const createMuzzleFlash = () => {
        if (playerSystem) {
            const muzzleFlash = new Sprite(playerSystem.sheet.textures['fire02.png']);
            muzzleFlash.anchor.set(0.5);
            muzzleFlash.scale.set(0.6);
            muzzleFlash.x = enemyPos.x + velocity.x * 0.2;
            muzzleFlash.y = enemyPos.y + velocity.y * 0.2;
            muzzleFlash.rotation = Math.atan2(velocity.y, velocity.x) + Math.PI / 2;
            playerSystem.container.addChild(muzzleFlash);
            setTimeout(() => {
                if (!muzzleFlash.destroyed) {
                    muzzleFlash.destroy();
                }
            }, 50);
        }
    };
    
    createMuzzleFlash();

    const bullet = this.world.createEntity();
    bullet.addComponent('projectile', true);
    bullet.addComponent('team', { id: 'enemy' });
    bullet.addComponent('position', { x: enemyPos.x, y: enemyPos.y });
    bullet.addComponent('velocity', velocity);
    bullet.addComponent('trail', { rate: 3, cooldown: 0 });

    if (Math.random() < 0.25) {
        bullet.addComponent('damage', { value: 0 });
        bullet.addComponent('appliesEffectOnHit', {
            name: 'poison',
            duration: 300,
            options: {
                damagePerTick: 1,
                tickRate: 60,
            }
        });
        bullet.addComponent('tint', 0x00ff00);
    } else {
        bullet.addComponent('damage', { value: 1 });
    }
  }
}





