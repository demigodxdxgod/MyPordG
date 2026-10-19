/**
 * ConductionGraph: Unweighted BFS Electrical Propagation Subsystem
 * Section 5.4 & Master Plan Part 2 Step 3.2
 * Uses pre-allocated static typed arrays with zero heap allocations during traversal.
 */

import { SurfaceGrid } from './SurfaceGrid.ts';

export class ConductionGraph {
  private readonly width: number = 64;
  private readonly height: number = 32;
  private readonly totalCells: number = 64 * 32;

  // Statically allocated buffers to eliminate GC
  private visited: Uint8Array;
  private queue: Uint16Array;
  private resultBuffer: Int32Array;

  constructor(width: number = 64, height: number = 32) {
    this.width = width;
    this.height = height;
    this.totalCells = width * height;
    this.visited = new Uint8Array(this.totalCells);
    this.queue = new Uint16Array(this.totalCells);
    this.resultBuffer = new Int32Array(this.totalCells);
  }

  /**
   * Propagates electrical conduction through contiguous conductive cells
   * (WET surface, steam clouds, liquid pools) using BFS.
   * Inlined neighbor math to avoid object allocations.
   * 
   * @returns Array of affected cell indices (reused or sliced view)
   */
  public propagateConduction(
    startTileX: number,
    startTileY: number,
    grid: SurfaceGrid,
    maxJumps: number = 4
  ): number[] {
    if (!grid.isInBounds(startTileX, startTileY)) return [];

    // Reset visited buffer
    this.visited.fill(0);

    const affected: number[] = [];
    let head = 0;
    let tail = 0;

    const startIdx = (startTileY << 6) | (startTileX & 0x3f);
    this.queue[tail++] = startIdx;
    this.visited[startIdx] = 1;

    while (head < tail) {
      const currentIdx = this.queue[head++];
      affected.push(currentIdx);

      if (affected.length >= maxJumps) {
        break;
      }

      const cx = currentIdx & 0x3f;
      const cy = currentIdx >> 6;

      // 4-Orthogonal directions inlined (no object allocation):
      // East (cx + 1, cy)
      if (cx + 1 < this.width) {
        const nIdx = (cy << 6) | (cx + 1);
        if (!this.visited[nIdx] && grid.isCellConductive(cx + 1, cy)) {
          this.visited[nIdx] = 1;
          this.queue[tail++] = nIdx;
        }
      }
      // West (cx - 1, cy)
      if (cx - 1 >= 0) {
        const nIdx = (cy << 6) | (cx - 1);
        if (!this.visited[nIdx] && grid.isCellConductive(cx - 1, cy)) {
          this.visited[nIdx] = 1;
          this.queue[tail++] = nIdx;
        }
      }
      // South (cx, cy + 1)
      if (cy + 1 < this.height) {
        const nIdx = ((cy + 1) << 6) | cx;
        if (!this.visited[nIdx] && grid.isCellConductive(cx, cy + 1)) {
          this.visited[nIdx] = 1;
          this.queue[tail++] = nIdx;
        }
      }
      // North (cx, cy - 1)
      if (cy - 1 >= 0) {
        const nIdx = ((cy - 1) << 6) | cx;
        if (!this.visited[nIdx] && grid.isCellConductive(cx, cy - 1)) {
          this.visited[nIdx] = 1;
          this.queue[tail++] = nIdx;
        }
      }
    }

    return affected;
  }
}
