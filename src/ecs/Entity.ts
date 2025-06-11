let nextId = 0;

export class Entity {
  id: number;
  components: Map<string, any> = new Map();

  constructor() {
    this.id = nextId++;
  }

  addComponent(name: string, data: any) {
    this.components.set(name, data);
  }

  getComponent<T>(name: string): T | undefined {
    return this.components.get(name);
  }

  hasComponent(name: string): boolean {
    return this.components.has(name);
  }
}
