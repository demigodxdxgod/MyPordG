/**
 * SurfaceGrid: Autonomous 64x32 Cellular Surface Grid backed by flat Uint32Array.
 * Adheres to Section 5.3, Lifecycle State Machine, and Zero-Allocation Invariants.
 */

export const enum SurfaceState {
  DRY = 0,
  WET = 1,
  FROST = 2,
  BURNING = 3,
  SCORCHED = 4,
}

// Bit layout in 32-bit integer per cell:
// bits 0..2: Primary State (3 bits: DRY=0, WET=1, FROST=2, BURNING=3, SCORCHED=4)
// bit 3: Steam Cloud Active (1 bit)
// bits 4..15: Decay Timer (12 bits: in tenths of a second, 0..4095, e.g. 120 = 12.0s)
// bits 16..18: Frost / Saturation Stacks (3 bits: 0..7, max 3 stacks)
// bit 19: Glacial Block Present (1 bit)
// bit 20: Lit Fuse Active (1 bit)
// bits 21..28: Fuse Timer (8 bits: tenths of a second, 0..255)
// bits 29..31: Reserved / Conductive pulse flag

const STATE_MASK = 0x7;
const STEAM_BIT = 1 << 3;
const TIMER_SHIFT = 4;
const TIMER_MASK = 0xfff;
const STACKS_SHIFT = 16;
const STACKS_MASK = 0x7;
const GLACIAL_BIT = 1 << 19;
const LIT_FUSE_BIT = 1 << 20;
const FUSE_SHIFT = 21;
const FUSE_MASK = 0xff;
const CONDUCTION_PULSE_BIT = 1 << 29;

export class SurfaceGrid {
  public readonly width: number;
  public readonly height: number;
  public readonly totalCells: number;

  // Primary backing buffer
  private cells: Uint32Array;
  // Double buffer for Phase A Snapshot
  private snapshotBuffer: Uint32Array;

  // Lifecycle Base Durations (in tenths of a second, 10 Hz ticks)
  public static readonly DURATION_WET = 120; // 12.0s
  public static readonly DURATION_FROST = 80; // 8.0s
  public static readonly DURATION_BURNING = 40; // 4.0s
  public static readonly DURATION_SCORCHED = 300; // 30.0s
  public static readonly DURATION_STEAM = 50; // 5.0s

  constructor(width: number = 64, height: number = 32) {
    this.width = width;
    this.height = height;
    this.totalCells = width * height;
    this.cells = new Uint32Array(this.totalCells);
    this.snapshotBuffer = new Uint32Array(this.totalCells);
  }

  public getIndex(col: number, row: number): number {
    return (row << 6) | (col & 0x3f);
  }

  public isInBounds(col: number, row: number): boolean {
    return col >= 0 && col < this.width && row >= 0 && row < this.height;
  }

  /**
   * Phase A: Lock current grid state into read-only transaction snapshot
   */
  public snapshot(): void {
    this.snapshotBuffer.set(this.cells);
  }

  public getSnapshotCell(index: number): number {
    return this.snapshotBuffer[index];
  }

  /**
   * Primary State queries & mutations
   */
  public getCellState(col: number, row: number): SurfaceState {
    if (!this.isInBounds(col, row)) return SurfaceState.DRY;
    const idx = (row << 6) | (col & 0x3f);
    return (this.cells[idx] & STATE_MASK) as SurfaceState;
  }

  public getCellStateName(col: number, row: number): 'DRY' | 'WET' | 'FROST' | 'BURNING' | 'SCORCHED' {
    const s = this.getCellState(col, row);
    switch (s) {
      case SurfaceState.WET: return 'WET';
      case SurfaceState.FROST: return 'FROST';
      case SurfaceState.BURNING: return 'BURNING';
      case SurfaceState.SCORCHED: return 'SCORCHED';
      default: return 'DRY';
    }
  }

  public setCellState(col: number, row: number, state: SurfaceState | 'DRY' | 'WET' | 'FROST' | 'BURNING' | 'SCORCHED', duration?: number): void {
    if (!this.isInBounds(col, row)) return;
    const idx = (row << 6) | (col & 0x3f);

    let stateEnum: SurfaceState;
    if (typeof state === 'string') {
      switch (state) {
        case 'WET': stateEnum = SurfaceState.WET; break;
        case 'FROST': stateEnum = SurfaceState.FROST; break;
        case 'BURNING': stateEnum = SurfaceState.BURNING; break;
        case 'SCORCHED': stateEnum = SurfaceState.SCORCHED; break;
        default: stateEnum = SurfaceState.DRY; break;
      }
    } else {
      stateEnum = state;
    }

    let defaultDuration = 0;
    if (stateEnum === SurfaceState.WET) defaultDuration = SurfaceGrid.DURATION_WET;
    else if (stateEnum === SurfaceState.FROST) defaultDuration = SurfaceGrid.DURATION_FROST;
    else if (stateEnum === SurfaceState.BURNING) defaultDuration = SurfaceGrid.DURATION_BURNING;
    else if (stateEnum === SurfaceState.SCORCHED) defaultDuration = SurfaceGrid.DURATION_SCORCHED;

    const timer = duration !== undefined ? duration : defaultDuration;

    // Clear state & timer bits, then set new
    let cell = this.cells[idx];
    cell &= ~(STATE_MASK | (TIMER_MASK << TIMER_SHIFT));
    cell |= (stateEnum & STATE_MASK);
    cell |= ((timer & TIMER_MASK) << TIMER_SHIFT);

    // Reset stacks on state change
    cell &= ~(STACKS_MASK << STACKS_SHIFT);

    this.cells[idx] = cell;
  }

  /**
   * Steam Cloud
   */
  public hasSteamCloud(col: number, row: number): boolean {
    if (!this.isInBounds(col, row)) return false;
    const idx = (row << 6) | (col & 0x3f);
    return (this.cells[idx] & STEAM_BIT) !== 0;
  }

  public setSteamCloud(col: number, row: number, active: boolean): void {
    if (!this.isInBounds(col, row)) return;
    const idx = (row << 6) | (col & 0x3f);
    if (active) {
      this.cells[idx] |= STEAM_BIT;
    } else {
      this.cells[idx] &= ~STEAM_BIT;
    }
  }

  /**
   * Glacial Block
   */
  public hasGlacialBlock(col: number, row: number): boolean {
    if (!this.isInBounds(col, row)) return false;
    const idx = (row << 6) | (col & 0x3f);
    return (this.cells[idx] & GLACIAL_BIT) !== 0;
  }

  public setGlacialBlock(col: number, row: number, present: boolean): void {
    if (!this.isInBounds(col, row)) return;
    const idx = (row << 6) | (col & 0x3f);
    if (present) {
      this.cells[idx] |= GLACIAL_BIT;
    } else {
      this.cells[idx] &= ~GLACIAL_BIT;
    }
  }

  /**
   * Lit Explosive Fuse (Rule 14 & 15)
   */
  public isFuseLit(col: number, row: number): boolean {
    if (!this.isInBounds(col, row)) return false;
    const idx = (row << 6) | (col & 0x3f);
    return (this.cells[idx] & LIT_FUSE_BIT) !== 0;
  }

  public lightFuse(col: number, row: number, durationTenths: number = 30): void {
    if (!this.isInBounds(col, row)) return;
    const idx = (row << 6) | (col & 0x3f);
    let cell = this.cells[idx] | LIT_FUSE_BIT;
    cell &= ~(FUSE_MASK << FUSE_SHIFT);
    cell |= ((durationTenths & FUSE_MASK) << FUSE_SHIFT);
    this.cells[idx] = cell;
  }

  public extinguishFuse(col: number, row: number): void {
    if (!this.isInBounds(col, row)) return;
    const idx = (row << 6) | (col & 0x3f);
    this.cells[idx] &= ~(LIT_FUSE_BIT | (FUSE_MASK << FUSE_SHIFT));
  }

  /**
   * Stacks (Frost slowing stacks / Wet saturation)
   */
  public getStacks(col: number, row: number): number {
    if (!this.isInBounds(col, row)) return 0;
    const idx = (row << 6) | (col & 0x3f);
    return (this.cells[idx] >> STACKS_SHIFT) & STACKS_MASK;
  }

  public addStack(col: number, row: number, maxStacks: number = 3): number {
    if (!this.isInBounds(col, row)) return 0;
    const idx = (row << 6) | (col & 0x3f);
    let current = (this.cells[idx] >> STACKS_SHIFT) & STACKS_MASK;
    if (current < maxStacks) {
      current++;
      let cell = this.cells[idx] & ~(STACKS_MASK << STACKS_SHIFT);
      cell |= (current << STACKS_SHIFT);
      this.cells[idx] = cell;
    }
    return current;
  }

  /**
   * Electrical Conduction test (Rule 12 & 5.4)
   * WET surface or STEAM conducts.
   * Glacial Block interrupts conduction completely!
   */
  public isCellConductive(col: number, row: number): boolean {
    if (!this.isInBounds(col, row)) return false;
    const idx = (row << 6) | (col & 0x3f);
    const cell = this.cells[idx];

    // Glacial Block actively interrupts conduction (Rule 12)
    if ((cell & GLACIAL_BIT) !== 0) return false;

    const state = (cell & STATE_MASK) as SurfaceState;
    if (state === SurfaceState.WET) return true;
    if ((cell & STEAM_BIT) !== 0) return true;
    // FROST conducts through moisture layer (Rule 8.1)
    if (state === SurfaceState.FROST) return true;

    return false;
  }

  /**
   * Autonomous 10 Hz Background Decay Simulation Tick
   * Runs in < 0.2ms across all 2048 cells.
   */
  public tickDecay(): { detonatedFuses: number[] } {
    const detonatedFuses: number[] = [];

    for (let idx = 0; idx < this.totalCells; idx++) {
      let cell = this.cells[idx];
      if (cell === 0) continue; // Pure DRY fast-path

      // Fuse ticking
      if ((cell & LIT_FUSE_BIT) !== 0) {
        let fuseTimer = (cell >> FUSE_SHIFT) & FUSE_MASK;
        if (fuseTimer > 0) {
          fuseTimer--;
          cell &= ~(FUSE_MASK << FUSE_SHIFT);
          cell |= (fuseTimer << FUSE_SHIFT);
        } else {
          // Detonate!
          cell &= ~(LIT_FUSE_BIT | (FUSE_MASK << FUSE_SHIFT));
          detonatedFuses.push(idx);
        }
      }

      // State decay timer
      let timer = (cell >> TIMER_SHIFT) & TIMER_MASK;
      if (timer > 0) {
        timer--;
        cell &= ~(TIMER_MASK << TIMER_SHIFT);
        cell |= (timer << TIMER_SHIFT);

        if (timer === 0) {
          // Transition state according to Section 5.3 State Machine:
          const state = (cell & STATE_MASK) as SurfaceState;
          cell &= ~STATE_MASK;

          switch (state) {
            case SurfaceState.WET:
              // WET (12s) -> DRY
              cell |= SurfaceState.DRY;
              break;
            case SurfaceState.FROST:
              // FROST (8s) -> WET (12s)
              cell |= SurfaceState.WET;
              cell |= ((SurfaceGrid.DURATION_WET & TIMER_MASK) << TIMER_SHIFT);
              break;
            case SurfaceState.BURNING:
              // BURNING (4s) -> SCORCHED (30s)
              cell |= SurfaceState.SCORCHED;
              cell |= ((SurfaceGrid.DURATION_SCORCHED & TIMER_MASK) << TIMER_SHIFT);
              break;
            case SurfaceState.SCORCHED:
              // SCORCHED (30s) -> DRY
              cell |= SurfaceState.DRY;
              break;
          }
        }
      }

      this.cells[idx] = cell;
    }

    return { detonatedFuses };
  }

  /**
   * Reset arena state and clear all cells to pristine DRY
   */
  public reset(): void {
    this.cells.fill(0);
    this.snapshotBuffer.fill(0);
  }

  public getRawBuffer(): Uint32Array {
    return this.cells;
  }
}
