/**
 * PlayerController: Alchemical Combatant with Keyboard-Only Directional Combat
 * Controls: WASD / Arrows to move, J = Kinetic Strike/Kick, K = Pyro, L = Cryo/Shatter,
 * U = Electro, I = Hydro, Space = Dash/Cancel.
 */

import { ElementType } from '../combat/DamageContext.ts';
import { IsoMath } from '../simulation/IsoMath.ts';

export class PlayerController {
  public readonly id: number = 1000;
  public x: number = 320; // world x
  public y: number = 240; // world y
  public z: number = 0;   // world z (elevation)

  public vx: number = 0;
  public vy: number = 0;
  public facingX: number = 1;
  public facingY: number = 0;

  public hp: number = 100;
  public maxHp: number = 100;
  public posture: number = 0;
  public maxPosture: number = 100;
  public isAirborne: boolean = false;
  public isStunned: boolean = false;
  public isDashing: boolean = false;
  public dashTimer: number = 0;

  // Animation phase state machine
  // STARTUP -> ACTIVE -> RECOVERY -> CANCEL_WINDOW
  public actionPhase: 'IDLE' | 'STARTUP' | 'ACTIVE' | 'RECOVERY' = 'IDLE';
  public phaseTimer: number = 0;
  public currentAbility: string = 'none';

  // Cooldown timers in seconds
  public cooldowns = {
    kinetic: 0,
    pyro: 0,
    cryo: 0,
    electro: 0,
    hydro: 0,
  };

  public update(dt: number, keys: Record<string, boolean>, groundZ: number, friction: number = 1.0): void {
    // Tick cooldowns
    for (const key in this.cooldowns) {
      const k = key as keyof typeof this.cooldowns;
      if (this.cooldowns[k] > 0) {
        this.cooldowns[k] = Math.max(0, this.cooldowns[k] - dt);
      }
    }

    // Tick dash
    if (this.isDashing) {
      this.dashTimer -= dt;
      if (this.dashTimer <= 0) {
        this.isDashing = false;
      }
    }

    // Tick action phases
    if (this.actionPhase !== 'IDLE') {
      this.phaseTimer -= dt;
      if (this.phaseTimer <= 0) {
        if (this.actionPhase === 'STARTUP') {
          this.actionPhase = 'ACTIVE';
          this.phaseTimer = 0.08;
        } else if (this.actionPhase === 'ACTIVE') {
          this.actionPhase = 'RECOVERY';
          this.phaseTimer = 0.15;
        } else if (this.actionPhase === 'RECOVERY') {
          this.actionPhase = 'IDLE';
          this.currentAbility = 'none';
        }
      }
    }

    // Movement calculation
    let moveX = 0;
    let moveY = 0;

    if (keys['KeyW'] || keys['ArrowUp']) moveY -= 1;
    if (keys['KeyS'] || keys['ArrowDown']) moveY += 1;
    if (keys['KeyA'] || keys['ArrowLeft']) moveX -= 1;
    if (keys['KeyD'] || keys['ArrowRight']) moveX += 1;

    // Normalizing movement vector
    const len = Math.sqrt(moveX * moveX + moveY * moveY);
    if (len > 0) {
      moveX /= len;
      moveY /= len;
      this.facingX = moveX;
      this.facingY = moveY;
    }

    const baseSpeed = this.isDashing ? 320 : 150;
    const effectiveSpeed = baseSpeed * friction;

    if (len > 0 && (this.actionPhase === 'IDLE' || this.isDashing || this.actionPhase === 'RECOVERY')) {
      this.vx = moveX * effectiveSpeed;
      this.vy = moveY * effectiveSpeed;
    } else {
      // Friction slowdown
      this.vx *= 0.7;
      this.vy *= 0.7;
    }

    this.x += this.vx * dt;
    this.y += this.vy * dt;

    // Arena bounds (64x32 grid * 32px cell size = 2048 x 1024)
    this.x = Math.max(64, Math.min(1984, this.x));
    this.y = Math.max(64, Math.min(960, this.y));

    // Dynamic ground elevation tracking (Ramps and Plaza/Wing)
    if (!this.isAirborne) {
      this.z = groundZ;
    }

    // Posture decay if not attacked
    if (this.posture > 0) {
      this.posture = Math.max(0, this.posture - 8 * dt);
    }
  }

  public triggerDash(): boolean {
    if (this.isDashing) return false;
    // Animation cancel: dash cancels any recovery window immediately!
    this.isDashing = true;
    this.dashTimer = 0.22;
    this.actionPhase = 'IDLE';
    this.currentAbility = 'dash';
    return true;
  }

  public canUseAbility(name: keyof typeof this.cooldowns): boolean {
    return this.cooldowns[name] <= 0 && (this.actionPhase === 'IDLE' || this.actionPhase === 'RECOVERY');
  }

  public setAbilityActive(name: keyof typeof this.cooldowns, cooldownSec: number): void {
    this.cooldowns[name] = cooldownSec;
    this.actionPhase = 'STARTUP';
    this.phaseTimer = 0.06;
    this.currentAbility = name;
  }

  public getSpeed(): number {
    return Math.sqrt(this.vx * this.vx + this.vy * this.vy);
  }
}
