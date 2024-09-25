/**
 * Spatial hash class to divide 2d space into a grid to store references to nodes
 */

import type { CoreNode } from '../CoreNode.js';

export class SpatialHash {
  private cellSize: number;
  private grid: Map<string, Array<CoreNode>>;
  private dirty: Set<CoreNode>;
  private locations: WeakMap<CoreNode, { x: number; y: number }>;

  constructor(cellSize: number) {
    this.cellSize = cellSize;
    this.grid = new Map();
    this.dirty = new Set();
    this.locations = new WeakMap();
  }

  /**
   * Map world coordinates to grid coordinates
   */
  private getHash(x: number, y: number): string {
    const gridXLocation = Math.floor(x / this.cellSize);
    const gridYLocation = Math.floor(y / this.cellSize);

    return `${gridXLocation},${gridYLocation}`;
  }

  /**
   * Add Node to spatial Grid
   * @param node
   */
  public insert(node: CoreNode): void {
    const point = this.getCenter(node);
    const hash = this.getHash(point.x, point.x);
    console.log(point);
    if (this.grid.has(hash) === false) {
      this.grid.set(hash, []);
    }

    this.grid.get(hash)?.push(node);
    this.locations.set(node, { x: point.x, y: point.y });
  }

  /**
   * Remove node from gridcell
   * @param node
   */
  public remove(
    node: CoreNode,
    x: number | undefined = undefined,
    y: number | undefined = undefined,
  ): void {
    const hash = this.getHash(x || node.absX, y || node.absY);
    const cell = this.grid.get(hash);

    if (cell !== undefined) {
      const index = cell.indexOf(node);
      if (index > -1) {
        cell.splice(index, 1);
      }
    }
  }

  /**
   * Flag nodes as dirty that have a changed local transformation
   * @param node
   */
  public flagDirty(node: CoreNode): void {
    this.dirty.add(node);
  }

  /**
   * Lazy update new nodes
   * @param node
   */
  public syncDirtyNodes(): void {
    this.dirty.forEach((node) => {
      const location = this.locations.get(node);
      if (location) {
        const { x, y } = location;
        this.update(node, x, y);
      }
    });
    this.dirty.clear();
  }

  public update(node: CoreNode, oldX: number, oldY: number): void {
    // Remove node from old cell
    this.remove(node, oldX, oldY);
    // insert intro new cell
    this.insert(node);
  }

  public query(x: number, y: number): Array<CoreNode> {
    if (this.dirty.size > 0) {
      this.syncDirtyNodes();
    }

    const hash = this.getHash(x, y);
    return this.grid.get(hash) || [];
  }

  private getCenter(node: CoreNode): { x: number; y: number } {
    const { absX, absY, width, height } = node;
    return {
      x: absX + ~~(width / 2),
      y: absY + ~~(height / 2),
    };
  }
}
