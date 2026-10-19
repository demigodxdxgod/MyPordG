/**
 * IsoMath: Mathematical & Spatial Foundations for Courtyard of Shadows
 * Based on 2:1 diamond isometric projection (64x32 px tile footprint, 32x32 px logical cell).
 */

export class IsoMath {
  public static readonly TILE_WIDTH = 64;
  public static readonly TILE_HEIGHT = 32;
  public static readonly HALF_TILE_WIDTH = 32;
  public static readonly HALF_TILE_HEIGHT = 16;
  public static readonly LOGICAL_CELL_SIZE = 32;

  // Elevation steps (Rule 2)
  public static readonly ELEVATION_UPPER_PLAZA = 0;
  public static readonly ELEVATION_SUNKEN_WING = -72;
  public static readonly RAMP_STEP_DELTA_Z = 12; // 12 px per step across 6 transitional steps = 72 px total

  // Layer depth constants (Rule 4.2)
  public static readonly LAYER_TERRAIN = 0;
  public static readonly LAYER_DECALS = 1000;
  public static readonly LAYER_PROPS_ENTITIES = 2000;
  public static readonly LAYER_OVERHEAD_VFX = 9000;

  /**
   * World Space to Screen Space Projection
   * Continuous world coords (x, y, z) -> Screen coords (X, Y)
   */
  public static worldToScreen(
    worldX: number,
    worldY: number,
    worldZ: number,
    originX: number = 0,
    originY: number = 0,
    out: { x: number; y: number } = { x: 0, y: 0 }
  ): { x: number; y: number } {
    out.x = (worldX - worldY) * this.HALF_TILE_WIDTH / this.LOGICAL_CELL_SIZE + originX;
    out.y = (worldX + worldY) * this.HALF_TILE_HEIGHT / this.LOGICAL_CELL_SIZE - worldZ + originY;
    return out;
  }

  /**
   * Screen Space to World Space Inversion
   * Screen coords (screenX, screenY) and known entity elevation z -> continuous world coords (x, y)
   */
  public static screenToWorld(
    screenX: number,
    screenY: number,
    elevationZ: number,
    originX: number = 0,
    originY: number = 0,
    out: { x: number; y: number } = { x: 0, y: 0 }
  ): { x: number; y: number } {
    const dx = (screenX - originX) / this.HALF_TILE_WIDTH;
    const dy = (screenY - originY + elevationZ) / this.HALF_TILE_HEIGHT;
    out.x = 0.5 * (dx + dy) * this.LOGICAL_CELL_SIZE;
    out.y = 0.5 * (dy - dx) * this.LOGICAL_CELL_SIZE;
    return out;
  }

  /**
   * World coordinate to discrete tile cell index (Column, Row)
   */
  public static worldToTile(worldX: number, worldY: number): { col: number; row: number } {
    return {
      col: Math.max(0, Math.min(63, Math.floor(worldX / this.LOGICAL_CELL_SIZE))),
      row: Math.max(0, Math.min(31, Math.floor(worldY / this.LOGICAL_CELL_SIZE))),
    };
  }

  /**
   * Discrete tile index to logical world coordinates
   */
  public static tileToWorld(col: number, row: number): { x: number; y: number } {
    return {
      x: col * this.LOGICAL_CELL_SIZE,
      y: row * this.LOGICAL_CELL_SIZE,
    };
  }

  /**
   * Bit-packed single 16-bit integer for tile coordinates (y << 6 | x)
   */
  public static packTileIndex(col: number, row: number): number {
    return (row << 6) | (col & 0x3f);
  }

  public static unpackTileIndex(index: number): { col: number; row: number } {
    return {
      col: index & 0x3f,
      row: (index >> 6) & 0x1f,
    };
  }

  /**
   * Deterministic Continuous Depth Sorting Formula (Section 4.2 / Part 1)
   * Formula: DepthKey(x, y, z) = Math.floor(Y_screen * 10) + LayerOffset
   */
  public static computeDepthKey(
    screenY: number,
    layerOffset: number = IsoMath.LAYER_PROPS_ENTITIES
  ): number {
    return Math.floor(screenY * 10) + layerOffset;
  }

  /**
   * Terrain Elevation function:
   * Upper Plaza: rows 0..14 (z = 0)
   * Dynamic Ramp: rows 15..20 (6 transitional steps, -12 px per row)
   * Sunken Wing: rows 21..31 (z = -72)
   */
  public static getTerrainElevation(col: number, row: number): number {
    // Upper Plaza
    if (row < 15) {
      return this.ELEVATION_UPPER_PLAZA; // 0
    }
    // Dynamic transition ramp (6 steps: rows 15, 16, 17, 18, 19, 20)
    if (row >= 15 && row <= 20) {
      const rampStep = row - 14; // 1 to 6
      return -rampStep * this.RAMP_STEP_DELTA_Z; // -12, -24, -36, -48, -60, -72
    }
    // Sunken Wing
    return this.ELEVATION_SUNKEN_WING; // -72
  }

  /**
   * Continuous elevation at world coordinates (interpolated across ramp)
   */
  public static getInterpolatedElevation(worldX: number, worldY: number): number {
    const rowFloat = worldY / this.LOGICAL_CELL_SIZE;
    if (rowFloat < 15) return this.ELEVATION_UPPER_PLAZA;
    if (rowFloat >= 21) return this.ELEVATION_SUNKEN_WING;
    // Ramp interpolation
    const t = (rowFloat - 15) / 6;
    return this.ELEVATION_UPPER_PLAZA + t * (this.ELEVATION_SUNKEN_WING - this.ELEVATION_UPPER_PLAZA);
  }
}
