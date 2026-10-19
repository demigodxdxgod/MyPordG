/**
 * KineticPropPool: 100-slot static pre-allocated pool for kinetic physics props.
 * Adheres to Rules 3, 4, 5, 6, 7, 13 and zero-allocation game loop invariants.
 */

import { VolumetricAABB } from './VolumetricAABB.ts';

export const enum PropType {
  WOODEN_CRATE = 0,
  OIL_BARREL = 1,
  GLACIAL_BLOCK = 2,
  STONE_PILLAR = 3, // immovable, solid obstacle
}

export class KineticProp {
  public id: number = 0;
  public active: boolean = false;
  public type: PropType = PropType.WOODEN_CRATE;
  public isMovable: boolean = true; // Rule 3: IS_PROP_MOVABLE

  // Continuous world position (x, y, z)
  public x: number = 0;
  public y: number = 0;
  public z: number = 0;

  // Velocity (px/s)
  public vx: number = 0;
  public vy: number = 0;
  public vz: number = 0;

  // Volumetric dimensions
  public width: number = 24;
  public length: number = 24;
  public height: number = 24;

  // Rule 4: Discrete single hit registration per launch vector
  // Using Set or fixed array of hit entity IDs for the current trajectory
  public hitEntityIds: number[] = [];
  public launchAngle: number = 0; // In radians
  public isLaunched: boolean = false;
  public launcherEntityId: number = -1;

  // Rule 13: Burning duration tracking (4.0s before ash)
  public isBurning: boolean = false;
  public burnDurationRemaining: number = 0;
  public isAsh: boolean = false;

  // Visual sprite references in scene
  public visualSprite: any = null;
  public shadowSprite: any = null;

  public reset(
    id: number,
    type: PropType,
    worldX: number,
    worldY: number,
    worldZ: number
  ): void {
    this.id = id;
    this.active = true;
    this.type = type;
    this.isMovable = type === PropType.WOODEN_CRATE || type === PropType.OIL_BARREL;
    this.x = worldX;
    this.y = worldY;
    this.z = worldZ;
    this.vx = 0;
    this.vy = 0;
    this.vz = 0;
    this.width = type === PropType.STONE_PILLAR ? 28 : 24;
    this.length = type === PropType.STONE_PILLAR ? 28 : 24;
    this.height = type === PropType.STONE_PILLAR ? 64 : 24;
    this.hitEntityIds.length = 0;
    this.launchAngle = 0;
    this.isLaunched = false;
    this.launcherEntityId = -1;
    this.isBurning = false;
    this.burnDurationRemaining = 0;
    this.isAsh = false;
  }

  /**
   * Rule 3: Prop kinetic limits. Max velocity capped at 400.0 px/s
   */
  public applyImpulse(impulseX: number, impulseY: number, launcherId: number): void {
    if (!this.isMovable || this.isAsh) return;

    this.vx += impulseX;
    this.vy += impulseY;

    // Cap velocity at 400.0 px/s (Rule 3)
    const speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
    const MAX_VELOCITY = 400.0;
    if (speed > MAX_VELOCITY) {
      const factor = MAX_VELOCITY / speed;
      this.vx *= factor;
      this.vy *= factor;
    }

    this.isLaunched = true;
    this.launcherEntityId = launcherId;
    this.launchAngle = Math.atan2(this.vy, this.vx);
    // Reset hit registration list for this new launch vector (Rule 4)
    this.hitEntityIds.length = 0;
  }

  /**
   * Rule 5: Re-arm velocity threshold.
   * A bouncing prop re-arms hit check only if rebound velocity > 200 px/s
   * relative to a new trajectory angle (> 45 deg).
   */
  public handleRebound(normalX: number, normalY: number): void {
    if (!this.isLaunched) return;

    // Dot product with normal
    const dot = this.vx * normalX + this.vy * normalY;
    this.vx -= 2 * dot * normalX;
    this.vy -= 2 * dot * normalY;

    // Trajectory angle change check
    const newAngle = Math.atan2(this.vy, this.vx);
    let angleDiff = Math.abs(newAngle - this.launchAngle);
    if (angleDiff > Math.PI) angleDiff = 2 * Math.PI - angleDiff;

    const speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
    const DEG_45_RAD = Math.PI / 4; // 45 degrees

    if (speed > 200.0 && angleDiff > DEG_45_RAD) {
      // Re-arm hit check!
      this.hitEntityIds.length = 0;
      this.launchAngle = newAngle;
    }
  }

  /**
   * Rule 4 & 6: Prop hit registration check.
   * Deals damage to a given entity target only once per launch vector.
   * Player has self-launch immunity while standing still (Rule 6).
   */
  public canHitEntity(targetId: number, isPlayer: boolean, playerSpeed: number): boolean {
    if (!this.isLaunched || this.isAsh) return false;

    // Check if moving fast enough to inflict damage
    const speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
    if (speed < 50.0) return false;

    // Rule 6: Absolute hit-immunity against props launched by own ability while standing still
    if (isPlayer && this.launcherEntityId === targetId && playerSpeed < 5.0) {
      return false;
    }

    // Rule 4: Discrete hit registration window - target can be hit only once per launch
    if (this.hitEntityIds.includes(targetId)) {
      return false;
    }

    return true;
  }

  public registerHit(targetId: number): void {
    this.hitEntityIds.push(targetId);
  }

  /**
   * Update kinetic motion & burn duration
   */
  public update(dt: number, groundZ: number): void {
    if (!this.active || this.isAsh) return;

    // Update burning lifecycle (Rule 13)
    if (this.isBurning) {
      this.burnDurationRemaining -= dt;
      if (this.burnDurationRemaining <= 0) {
        // Collapses into non-colliding ash
        this.isAsh = true;
        this.isMovable = false;
        this.active = false;
        return;
      }
    }

    // Position integration
    if (Math.abs(this.vx) > 0.1 || Math.abs(this.vy) > 0.1) {
      this.x += this.vx * dt;
      this.y += this.vy * dt;

      // Friction decay
      const friction = Math.exp(-2.5 * dt);
      this.vx *= friction;
      this.vy *= friction;

      if (Math.abs(this.vx) < 2.0 && Math.abs(this.vy) < 2.0) {
        this.vx = 0;
        this.vy = 0;
        this.isLaunched = false;
      }
    }

    // Height ground tracking
    this.z = groundZ;
  }
}

/**
 * Static Pre-Allocated Pool of 100 Kinetic Props
 */
export class KineticPropPool {
  private static readonly MAX_PROPS = 100;
  private props: KineticProp[] = [];

  constructor() {
    for (let i = 0; i < KineticPropPool.MAX_PROPS; i++) {
      this.props.push(new KineticProp());
    }
  }

  public spawn(type: PropType, worldX: number, worldY: number, worldZ: number): KineticProp | null {
    for (let i = 0; i < KineticPropPool.MAX_PROPS; i++) {
      if (!this.props[i].active) {
        this.props[i].reset(i + 1, type, worldX, worldY, worldZ);
        return this.props[i];
      }
    }
    return null;
  }

  public getActiveProps(): KineticProp[] {
    return this.props.filter(p => p.active);
  }

  public getRawPool(): KineticProp[] {
    return this.props;
  }

  public resetAll(): void {
    for (let i = 0; i < KineticPropPool.MAX_PROPS; i++) {
      this.props[i].active = false;
      this.props[i].isAsh = false;
      this.props[i].vx = 0;
      this.props[i].vy = 0;
    }
  }
}
