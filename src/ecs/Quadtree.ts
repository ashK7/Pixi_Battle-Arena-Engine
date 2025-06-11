import { Entity } from './Entity';

export interface QuadtreePoint {
  x: number;
  y: number;
  entity: Entity;
}

export class Rectangle {
  x: number;
  y: number;
  width: number;
  height: number;

  constructor(x: number, y: number, width: number, height: number) {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
  }

  contains(point: QuadtreePoint): boolean {
    return (
      point.x >= this.x - this.width &&
      point.x <= this.x + this.width &&
      point.y >= this.y - this.height &&
      point.y <= this.y + this.height
    );
  }

  intersects(range: Rectangle): boolean {
    return !(
      range.x - range.width > this.x + this.width ||
      range.x + range.width < this.x - this.width ||
      range.y - range.height > this.y + this.height ||
      range.y + range.height < this.y - this.height
    );
  }
}

export class Quadtree {
  boundary: Rectangle;
  capacity: number;
  points: QuadtreePoint[] = [];
  divided = false;

  
  northeast: Quadtree | null = null;
  northwest: Quadtree | null = null;
  southeast: Quadtree | null = null;
  southwest: Quadtree | null = null;

  constructor(boundary: Rectangle, capacity: number) {
    this.boundary = boundary;
    this.capacity = capacity;
  }

  subdivide() {
    const { x, y, width, height } = this.boundary;
    const hw = width / 2;
    const hh = height / 2;

    const ne = new Rectangle(x + hw, y - hh, hw, hh);
    const nw = new Rectangle(x - hw, y - hh, hw, hh);
    const se = new Rectangle(x + hw, y + hh, hw, hh);
    const sw = new Rectangle(x - hw, y + hh, hw, hh);

    this.northeast = new Quadtree(ne, this.capacity);
    this.northwest = new Quadtree(nw, this.capacity);
    this.southeast = new Quadtree(se, this.capacity);
    this.southwest = new Quadtree(sw, this.capacity);

    this.divided = true;
  }

  insert(point: QuadtreePoint): boolean {
    if (!this.boundary.contains(point)) {
      return false;
    }

    if (this.points.length < this.capacity) {
      this.points.push(point);
      return true;
    }

    if (!this.divided) {
      this.subdivide();
    }

    if (this.northeast?.insert(point)) return true;
    if (this.northwest?.insert(point)) return true;
    if (this.southeast?.insert(point)) return true;
    if (this.southwest?.insert(point)) return true;
    
    return false;
  }

  query(range: Rectangle, found: QuadtreePoint[] = []): QuadtreePoint[] {
    if (!this.boundary.intersects(range)) {
      return found;
    }

    for (const p of this.points) {
      if (range.contains(p)) {
        found.push(p);
      }
    }

    if (this.divided) {
      this.northwest?.query(range, found);
      this.northeast?.query(range, found);
      this.southwest?.query(range, found);
      this.southeast?.query(range, found);
    }

    return found;
  }
}