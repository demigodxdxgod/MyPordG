/**
 * DamageContext: Zero-Allocation Combat & Damage Attribution Architecture
 * Adheres to Section 5.1 & Nawia_ARPG patterns
 */

export const enum ElementType {
  PHYSICAL = 0,
  PYRO = 1,
  CRYO = 2,
  ELECTRO = 3,
  HYDRO = 4,
}

export const enum HitFlags {
  NONE = 0,
  CRITICAL = 1 << 0,
  AIRBORNE_JUGGLE = 1 << 1,
  PROP_IMPACT = 1 << 2,
  REACTION_TRIGGER = 1 << 3,
}

export interface IDamageContext {
  // Attribution
  sourceEntityId: number;
  targetEntityId: number;
  inflictorTypeId: number;

  // Base Quantities
  rawDamage: number;
  element: ElementType;
  knockbackVector: { x: number; y: number; z: number };

  // Attributes & Tracking
  hitFlags: number;
  conductionChainDepth: number;
  originTileX: number;
  originTileY: number;

  // Execution Control
  isCancelled: boolean;

  // Ring Buffer / Pool Allocation Tracker
  poolIndex: number;
}

/**
 * Static Object Pool for IDamageContext
 * Pre-allocates 64 reusable slots to eliminate GC during high-density combat.
 */
export class DamageContextPool {
  private static readonly POOL_SIZE = 64;
  private static pool: IDamageContext[] = [];
  private static head: number = 0;

  static {
    for (let i = 0; i < DamageContextPool.POOL_SIZE; i++) {
      DamageContextPool.pool.push({
        sourceEntityId: 0,
        targetEntityId: 0,
        inflictorTypeId: 0,
        rawDamage: 0,
        element: ElementType.PHYSICAL,
        knockbackVector: { x: 0, y: 0, z: 0 },
        hitFlags: HitFlags.NONE,
        conductionChainDepth: 0,
        originTileX: 0,
        originTileY: 0,
        isCancelled: false,
        poolIndex: i,
      });
    }
  }

  public static acquire(): IDamageContext {
    const ctx = DamageContextPool.pool[DamageContextPool.head];
    DamageContextPool.head = (DamageContextPool.head + 1) % DamageContextPool.POOL_SIZE;

    // Reset fields in-place without creating new objects
    ctx.sourceEntityId = 0;
    ctx.targetEntityId = 0;
    ctx.inflictorTypeId = 0;
    ctx.rawDamage = 0;
    ctx.element = ElementType.PHYSICAL;
    ctx.knockbackVector.x = 0;
    ctx.knockbackVector.y = 0;
    ctx.knockbackVector.z = 0;
    ctx.hitFlags = HitFlags.NONE;
    ctx.conductionChainDepth = 0;
    ctx.originTileX = 0;
    ctx.originTileY = 0;
    ctx.isCancelled = false;

    return ctx;
  }

  public static getPoolCapacity(): number {
    return DamageContextPool.POOL_SIZE;
  }
}
