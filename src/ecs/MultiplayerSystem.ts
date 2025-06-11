import { System }     from './System';
import { Entity }     from './Entity';
import { World }      from './World';


export class MultiplayerSystem extends System {
  private socket: WebSocket;
  private world: World;
  private localId: string = '';
  private peers: Map<string, Entity> = new Map();

  constructor(world: World, serverUrl: string) {
    super();
    this.world = world;
    this.socket = new WebSocket(serverUrl);

    this.socket.addEventListener('open', () => {

      this.socket.send(JSON.stringify({ type: 'join' }));
    });

    this.socket.addEventListener('message', (evt) => {
      const msg = JSON.parse(evt.data);
      switch (msg.type) {
        case 'assign-id':
          this.localId = msg.id;
          break;

        case 'player-join': {
          const id: string = msg.id;
          if (id === this.localId || this.peers.has(id)) break;
          this.peers.set(id, this.createPeerEntity(id));
          break;
        }

        case 'player-leave': {
          const id: string = msg.id;
          const ent = this.peers.get(id);
          if (ent) {
            this.world.entities.splice(this.world.entities.indexOf(ent), 1);
            this.peers.delete(id);
          }
          break;
        }

        case 'player-update': {
          const { id, x, y, health } = msg;
          if (id === this.localId) break;
          let peer = this.peers.get(id);
          if (!peer) {
            peer = this.createPeerEntity(id);
            this.peers.set(id, peer);
          }

          const pos = peer.getComponent<{ x: number; y: number }>('position');
          const hp  = peer.getComponent<{ value: number }>('health');
          if (pos) { pos.x = x; pos.y = y; }
          if (hp)  { hp.value = health; }
          break;
        }
      }
    });

    this.socket.addEventListener('error', (err) => console.error('WebSocket error', err));
  }


  private createPeerEntity(id: string): Entity {
    const e = this.world.createEntity();
    e.addComponent('player', true);
    e.addComponent('playerId', id);
    e.addComponent('position', { x: 0, y: 0 });
    e.addComponent('velocity', { x: 0, y: 0 });
    e.addComponent('health', { value: 100 });
    return e;
  }

 update(entities: Entity[], _delta: number): void {

  const local = entities.find(e =>
      e.hasComponent('playerId') &&
      e.getComponent<string>('playerId') === this.localId
    );
    if (local) {
      const pos = local.getComponent<{ x: number; y: number }>('position');
      const hp  = local.getComponent<{ value: number }>('health');
      if (pos && hp) {
        this.socket.send(JSON.stringify({
          type: 'player-update',
          id: this.localId,
          x: pos.x,
          y: pos.y,
          health: hp.value
        }));
      }
    }
  }
}
