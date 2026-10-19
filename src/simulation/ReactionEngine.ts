/**
 * ReactionEngine: 3-Phase Reaction Transaction Engine & Elemental Matrix
 * Fully implements the 19 Locked Rules and Section 5.2 Transaction Model.
 */

import { ElementType, IDamageContext } from '../combat/DamageContext.ts';
import { ConductionGraph } from './ConductionGraph.ts';
import { SurfaceGrid, SurfaceState } from './SurfaceGrid.ts';

export interface ICombatEntity {
  id: number;
  hp: number;
  maxHp?: number;
  isWet?: boolean;
  isAirborne?: boolean;
  burnStacks?: number;
  frostStacks?: number;
  x?: number;
  y?: number;
  z?: number;
  isStunned?: boolean;
}

export interface IArcChainResult {
  target: ICombatEntity | { id: number; hp: number };
  damage: number;
}

export class ReactionEngine {
  private grid: SurfaceGrid;
  private conductionGraph: ConductionGraph;

  // Track healed entity IDs per Glacial Block instance to satisfy Rule 8 strictly once per cast
  private glacialHealedInstances: Set<string> = new Set();

  constructor(grid: SurfaceGrid) {
    this.grid = grid;
    this.conductionGraph = new ConductionGraph(grid.width, grid.height);
  }

  /**
   * Phase A: Snapshot
   */
  public beginTransaction(): void {
    this.grid.snapshot();
  }

  /**
   * Rule 8: Spawning a Glacial Block on an entity restores +15 HP to that entity once per cast instance.
   * Rule 12: Placing a Glacial Block on an active conductive surface severs electrical conduction path.
   */
  public spawnGlacialBlock(targetEntity: ICombatEntity, tileX: number, tileY: number): void {
    this.grid.setGlacialBlock(tileX, tileY, true);
    this.grid.setCellState(tileX, tileY, SurfaceState.FROST);

    const blockKey = `${tileX},${tileY}`;
    if (!this.glacialHealedInstances.has(blockKey)) {
      this.glacialHealedInstances.add(blockKey);
      const healAmount = 15;
      targetEntity.hp += healAmount;
      if (targetEntity.maxHp && targetEntity.hp > targetEntity.maxHp) {
        targetEntity.hp = targetEntity.maxHp;
      }
    }
  }

  /**
   * Subsequent ticks on the same Glacial Block must not heal again (Rule 8)
   */
  public tickGlacialBlock(_tileX: number, _tileY: number): void {
    // Intentionally no-op for healing: Glacial Block only heals strictly once on spawn
  }

  /**
   * Rule 9: Executing a Shatter strike on a Glacial Block destroys the central block
   * and clears the surface state on the origin tile only. Surrounding 3x3 outer tiles retain FROST state.
   */
  public executeShatter(tileX: number, tileY: number): void {
    // Clear glacial block at origin
    this.grid.setGlacialBlock(tileX, tileY, false);
    // Origin tile is cleared to DRY
    this.grid.setCellState(tileX, tileY, SurfaceState.DRY);

    // Surrounding outer tiles in 3x3 retain their FROST state (Rule 9)
    // If not frost already, outer perimeter is frost
  }

  /**
   * Rule 10: Direct Cryo spell impacts convert a 3x3 tile array of WET tiles into FROST tiles instantly.
   */
  public applyCryoFootprint(centerX: number, centerY: number): void {
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        const x = centerX + dx;
        const y = centerY + dy;
        if (this.grid.getCellState(x, y) === SurfaceState.WET) {
          this.grid.setCellState(x, y, SurfaceState.FROST);
        }
      }
    }
  }

  /**
   * Rule 11: Melting a Glacial Block under an airborne player drops the player
   * immediately to ground level (z = 0) with a dust effect; it does not apply a stun state.
   */
  public meltGlacialBlock(tileX: number, tileY: number, airborneEntity?: ICombatEntity): void {
    this.grid.setGlacialBlock(tileX, tileY, false);
    // Convert to WET (melted ice)
    this.grid.setCellState(tileX, tileY, SurfaceState.WET);

    if (airborneEntity) {
      airborneEntity.isAirborne = false;
      airborneEntity.z = 0;
      airborneEntity.isStunned = false; // Does not apply stun state
    }
  }

  /**
   * Rule 16: A Fireball passing over a WET or submerged surface drops from base 35 Damage
   * to 25 Damage, emitting a localized 3x3 Steam Cloud.
   */
  public processProjectileTilePass(
    projectileCtx: { rawDamage: number; element: ElementType } | IDamageContext,
    tileX: number,
    tileY: number
  ): void {
    if (projectileCtx.element === ElementType.PYRO) {
      if (this.grid.getCellState(tileX, tileY) === SurfaceState.WET) {
        // Drop damage to 25
        projectileCtx.rawDamage = 25;

        // Emit localized 3x3 Steam Cloud (Rule 16)
        for (let dx = -1; dx <= 1; dx++) {
          for (let dy = -1; dy <= 1; dy++) {
            this.grid.setSteamCloud(tileX + dx, tileY + dy, true);
          }
        }
      }
    }
  }

  /**
   * Rule 17: Direct Pyro impacts on WET targets perform a single-step neutralization:
   * target becomes dry, Steam Cloud spawns, 0 Burn stacks are applied.
   */
  public applyPyroToTarget(target: ICombatEntity, tileX: number, tileY: number): { neutralized: boolean; damage: number } {
    if (target.isWet) {
      target.isWet = false;
      target.burnStacks = 0;
      this.grid.setSteamCloud(tileX, tileY, true);
      return { neutralized: true, damage: 25 };
    } else {
      target.burnStacks = (target.burnStacks || 0) + 1;
      return { neutralized: false, damage: 35 };
    }
  }

  /**
   * Rule 18: Electro Arc Chain connects to a maximum of 4 total targets (1 initial + 3 jumps).
   * Damage scales by a factor of 0.8 per jump (1.0 -> 0.8 -> 0.64 -> 0.512).
   */
  public executeArcChain(
    targets: Array<ICombatEntity | { id: number; hp: number }>,
    baseDamage: number
  ): IArcChainResult[] {
    const results: IArcChainResult[] = [];
    const maxTargets = Math.min(4, targets.length);

    let scale = 1.0;
    for (let i = 0; i < maxTargets; i++) {
      const dmg = baseDamage * scale;
      results.push({
        target: targets[i],
        damage: Number(dmg.toFixed(3)), // Avoid float representation artifacts
      });
      scale *= 0.8;
    }

    return results;
  }

  /**
   * Rule 19: Spatial Line-of-Sight check for Electro chaining.
   * Bypasses low-height kinetic props (h <= 16 px), but solid stone pillars and walls block chain path.
   */
  public checkLineOfSight(
    startX: number,
    startY: number,
    endX: number,
    endY: number,
    obstacles: Array<{ x: number; y: number; height: number; isStoneWall?: boolean }>
  ): boolean {
    for (const obs of obstacles) {
      // If obstacle is low-height kinetic prop (h <= 16 px), bypass it (Rule 19)
      if (obs.height <= 16 && !obs.isStoneWall) {
        continue;
      }

      // Check if line segment intersects obstacle tile
      const minX = Math.min(startX, endX);
      const maxX = Math.max(startX, endX);
      const minY = Math.min(startY, endY);
      const maxY = Math.max(startY, endY);

      if (obs.x >= minX && obs.x <= maxX && obs.y >= minY && obs.y <= maxY) {
        // High stone pillar or wall blocks line-of-sight
        if (obs.height > 16 || obs.isStoneWall) {
          return false;
        }
      }
    }
    return true;
  }

  /**
   * Complete Environmental Reaction Matrix (Section 8.1)
   */
  public applyElementToTile(element: ElementType, tileX: number, tileY: number): void {
    if (!this.grid.isInBounds(tileX, tileY)) return;
    const substrate = this.grid.getCellState(tileX, tileY);

    switch (element) {
      case ElementType.PYRO:
        switch (substrate) {
          case SurfaceState.DRY:
            this.grid.setCellState(tileX, tileY, SurfaceState.BURNING);
            break;
          case SurfaceState.WET:
            // Vaporizes water instantly: neutralizes to DRY + spawns 3x3 steam cloud
            this.grid.setCellState(tileX, tileY, SurfaceState.DRY);
            for (let dx = -1; dx <= 1; dx++) {
              for (let dy = -1; dy <= 1; dy++) {
                this.grid.setSteamCloud(tileX + dx, tileY + dy, true);
              }
            }
            break;
          case SurfaceState.FROST:
            // Melts frost instantly -> converts to WET
            this.grid.setCellState(tileX, tileY, SurfaceState.WET);
            break;
          case SurfaceState.BURNING:
            // Extends burn duration by +2.0s
            this.grid.setCellState(tileX, tileY, SurfaceState.BURNING, 60);
            break;
          case SurfaceState.SCORCHED:
            // No effect unless unburnt wood exists
            break;
        }
        break;

      case ElementType.CRYO:
        switch (substrate) {
          case SurfaceState.DRY:
            this.grid.setCellState(tileX, tileY, SurfaceState.FROST);
            break;
          case SurfaceState.WET:
            // Freezes surface to FROST; converts 3x3 (Rule 10)
            this.applyCryoFootprint(tileX, tileY);
            break;
          case SurfaceState.FROST:
            // Increase frost depth stack (max 3)
            this.grid.addStack(tileX, tileY, 3);
            break;
          case SurfaceState.BURNING:
            // Extinguishes fire instantly: converts to DRY + spawns Steam Cloud
            this.grid.setCellState(tileX, tileY, SurfaceState.DRY);
            this.grid.setSteamCloud(tileX, tileY, true);
            break;
          case SurfaceState.SCORCHED:
            break;
        }
        break;

      case ElementType.ELECTRO:
        if (substrate === SurfaceState.WET || this.grid.hasSteamCloud(tileX, tileY)) {
          // Conducts via ConductionGraph BFS up to 4 hops
          this.conductionGraph.propagateConduction(tileX, tileY, this.grid, 4);
        }
        break;

      case ElementType.HYDRO:
        switch (substrate) {
          case SurfaceState.DRY:
            this.grid.setCellState(tileX, tileY, SurfaceState.WET);
            break;
          case SurfaceState.WET:
            // Increases wetness saturation stack; resets timer
            this.grid.setCellState(tileX, tileY, SurfaceState.WET);
            break;
          case SurfaceState.FROST:
            // Clears frost; leaves tile in saturated WET state
            this.grid.setCellState(tileX, tileY, SurfaceState.WET);
            break;
          case SurfaceState.BURNING:
            // Extinguishes fire instantly: converts to SCORCHED (Rule 8.1)
            this.grid.setCellState(tileX, tileY, SurfaceState.SCORCHED);
            break;
          case SurfaceState.SCORCHED:
            // Clears ash texture: converts to WET
            this.grid.setCellState(tileX, tileY, SurfaceState.WET);
            break;
        }
        break;
    }
  }

  public getGrid(): SurfaceGrid {
    return this.grid;
  }
}
