/**
 * EnemyController: Shadow Husk AI with Posture Meter and Airborne Juggle States
 * FSM: IDLE -> PATROL -> CHASE -> ATTACK -> HITSTUN -> AIRBORNE_JUGGLE -> STAGGERED
 */

export const enum EnemyState {
  IDLE = 0,
  PATROL = 1,
  CHASE = 2,
  ATTACK = 3,
  HITSTUN = 4,
  AIRBORNE_JUGGLE = 5,
  STAGGERED = 6,
}

export class EnemyController {
  public id: number;
  public active: boolean = true;
  public state: EnemyState = EnemyState.IDLE;

  public x: number = 0;
  public y: number = 0;
  public z: number = 0;
  public vz: number = 0; // vertical velocity for juggles

  public vx: number = 0;
  public vy: number = 0;

  public hp: number = 100;
  public maxHp: number = 100;
  public posture: number = 0;
  public maxPosture: number = 100;

  public isWet: boolean = false;
  public isAirborne: boolean = false;
  public isStunned: boolean = false;
  public burnStacks: number = 0;
  public frostStacks: number = 0;

  public stateTimer: number = 0;
  public attackCooldown: number = 0;

  // Visual sprite references in Phaser
  public sprite: any = null;
  public shadow: any = null;

  constructor(id: number, spawnX: number, spawnY: number, spawnZ: number) {
    this.id = id;
    this.reset(id, spawnX, spawnY, spawnZ);
  }

  public reset(id: number, spawnX: number, spawnY: number, spawnZ: number): void {
    this.id = id;
    this.active = true;
    this.state = EnemyState.IDLE;
    this.x = spawnX;
    this.y = spawnY;
    this.z = spawnZ;
    this.vz = 0;
    this.vx = 0;
    this.vy = 0;
    this.hp = 100;
    this.maxHp = 100;
    this.posture = 0;
    this.maxPosture = 100;
    this.isWet = false;
    this.isAirborne = false;
    this.isStunned = false;
    this.burnStacks = 0;
    this.frostStacks = 0;
    this.stateTimer = 0;
    this.attackCooldown = 0;
  }

  public takeDamage(
    amount: number,
    postureDamage: number,
    knockbackX: number = 0,
    knockbackY: number = 0,
    launchUpward: boolean = false
  ): void {
    this.hp = Math.max(0, this.hp - amount);
    this.vx += knockbackX;
    this.vy += knockbackY;

    // Posture increase
    this.posture += postureDamage;
    if (this.posture >= this.maxPosture) {
      // Posture break -> Staggered execution state (Section Phase 5)
      this.state = EnemyState.STAGGERED;
      this.stateTimer = 2.5; // 2.5 second staggered window
      this.posture = 0;
      return;
    }

    if (launchUpward) {
      this.state = EnemyState.AIRBORNE_JUGGLE;
      this.isAirborne = true;
      this.vz = 240; // upward impulse
      this.stateTimer = 1.0;
    } else if (this.state !== EnemyState.STAGGERED) {
      this.state = EnemyState.HITSTUN;
      this.stateTimer = 0.25;
    }
  }

  public update(dt: number, playerX: number, playerY: number, groundZ: number): void {
    if (!this.active || this.hp <= 0) {
      this.active = false;
      return;
    }

    // Tick timers
    if (this.attackCooldown > 0) this.attackCooldown -= dt;
    if (this.stateTimer > 0) this.stateTimer -= dt;

    // Airborne juggle gravity physics
    if (this.isAirborne) {
      this.vz -= 600 * dt; // gravity
      this.z += this.vz * dt;

      if (this.z <= groundZ) {
        this.z = groundZ;
        this.vz = 0;
        this.isAirborne = false;
        if (this.state === EnemyState.AIRBORNE_JUGGLE) {
          this.state = EnemyState.IDLE;
        }
      }
    } else {
      this.z = groundZ;
    }

    // AI FSM Logic
    const dx = playerX - this.x;
    const dy = playerY - this.y;
    const distToPlayer = Math.sqrt(dx * dx + dy * dy);

    switch (this.state) {
      case EnemyState.IDLE:
        if (distToPlayer < 240) {
          this.state = EnemyState.CHASE;
        }
        break;

      case EnemyState.CHASE:
        if (distToPlayer > 320) {
          this.state = EnemyState.IDLE;
          this.vx = 0;
          this.vy = 0;
        } else if (distToPlayer < 36 && this.attackCooldown <= 0) {
          this.state = EnemyState.ATTACK;
          this.stateTimer = 0.5;
          this.attackCooldown = 1.8;
          this.vx = 0;
          this.vy = 0;
        } else {
          // Move towards player
          const speed = 75;
          this.vx = (dx / distToPlayer) * speed;
          this.vy = (dy / distToPlayer) * speed;
        }
        break;

      case EnemyState.ATTACK:
        if (this.stateTimer <= 0) {
          this.state = EnemyState.CHASE;
        }
        break;

      case EnemyState.HITSTUN:
        if (this.stateTimer <= 0) {
          this.state = EnemyState.CHASE;
        }
        break;

      case EnemyState.STAGGERED:
        // Stunned & immobile in execution window
        this.vx = 0;
        this.vy = 0;
        if (this.stateTimer <= 0) {
          this.state = EnemyState.IDLE;
        }
        break;
    }

    // Movement integration
    this.x += this.vx * dt;
    this.y += this.vy * dt;

    // Friction decay
    this.vx *= 0.85;
    this.vy *= 0.85;
  }
}
