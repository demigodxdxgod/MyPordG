/**
 * VolumetricAABB: 3D Volumetric Prisms for Isometric Space
 * Section 4.3 & Rule 7 (Volumetric Vertical Threshold |deltaZ| <= 24 px)
 */

export interface IVolumetricPos {
  x: number;
  y: number;
  z: number;
}

export interface IVolumetricDim {
  w: number; // width along world X
  l: number; // length along world Y
  h: number; // height along vertical Z
}

export class VolumetricAABB {
  public static readonly KINETIC_VERTICAL_DELTA_LIMIT = 24; // Rule 7

  /**
   * Section 4.3 Volumetric Prism Collision Logic
   */
  public static checkVolumetricOverlap(
    aPos: IVolumetricPos,
    aDim: IVolumetricDim,
    bPos: IVolumetricPos,
    bDim: IVolumetricDim
  ): boolean {
    const overlapX = Math.abs(aPos.x - bPos.x) * 2 < (aDim.w + bDim.w);
    const overlapY = Math.abs(aPos.y - bPos.y) * 2 < (aDim.l + bDim.l);
    const overlapZ = Math.abs(aPos.z - bPos.z) * 2 < (aDim.h + bDim.h);
    return overlapX && overlapY && overlapZ;
  }

  /**
   * Rule 7: Kinetic Prop Vertical Threshold Check
   * Returns true if absolute vertical delta between prop and target is <= 24 px
   */
  public static checkKineticVerticalDelta(zProp: number, zTarget: number): boolean {
    return Math.abs(zProp - zTarget) <= VolumetricAABB.KINETIC_VERTICAL_DELTA_LIMIT;
  }
}
