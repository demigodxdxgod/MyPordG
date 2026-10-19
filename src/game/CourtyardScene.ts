/**
 * CourtyardScene: Phaser 3 Isometric 2.5D Arena Scene
 * Renders the reactive courtyard, kinetic props, elemental simulation, and player combat loop.
 */

import Phaser from 'phaser';
import { ProceduralAudio } from '../audio/ProceduralAudio.ts';
import { ElementType } from '../combat/DamageContext.ts';
import { EnemyController, EnemyState } from '../entities/EnemyController.ts';
import { PlayerController } from '../entities/PlayerController.ts';
import { ProceduralTextureAtlas } from '../graphics/ProceduralTextureAtlas.ts';
import { KineticProp, KineticPropPool, PropType } from '../physics/KineticPropPool.ts';
import { VolumetricAABB } from '../physics/VolumetricAABB.ts';
import { IsoMath } from '../simulation/IsoMath.ts';
import { ReactionEngine } from '../simulation/ReactionEngine.ts';
import { SurfaceGrid, SurfaceState } from '../simulation/SurfaceGrid.ts';

export interface ITelemetryData {
  fps: number;
  frameTimeMs: number;
  activeProps: number;
  wetCells: number;
  frostCells: number;
  burningCells: number;
  steamClouds: number;
  activeEnemies: number;
  playerHp: number;
  playerPosture: number;
}

export class CourtyardScene extends Phaser.Scene {
  public static readonly KEY = 'CourtyardScene';

  public player!: PlayerController;
  public grid!: SurfaceGrid;
  public reactionEngine!: ReactionEngine;
  public propPool!: KineticPropPool;
  public enemies: EnemyController[] = [];

  // Input mapping
  private keys: Record<string, boolean> = {};

  // Display objects
  private tileSprites: Phaser.GameObjects.Image[][] = [];
  private surfaceOverlaySprites: (Phaser.GameObjects.Image | null)[][] = [];
  private steamVfxSprites: (Phaser.GameObjects.Image | null)[][] = [];
  private glacialSprites: (Phaser.GameObjects.Image | null)[][] = [];

  private playerSprite!: Phaser.GameObjects.Image;
  private playerShadow!: Phaser.GameObjects.Image;

  // Matrix debug overlay graphics
  private matrixGraphics!: Phaser.GameObjects.Graphics;
  public isMatrixModeActive: boolean = false;

  // Autonomous 10 Hz decay accumulator
  private decayAccumulator: number = 0;
  private readonly DECAY_INTERVAL: number = 0.1; // 10 Hz

  // Telemetry callback
  public onTelemetryUpdate?: (data: ITelemetryData) => void;
  private telemetryTimer: number = 0;

  // Frame timing
  private lastFrameTimestamp: number = 0;
  private frameTimeHistory: number[] = [];

  // Active projectiles pool
  private projectiles: Array<{
    active: boolean;
    sprite: Phaser.GameObjects.Image;
    x: number;
    y: number;
    z: number;
    vx: number;
    vy: number;
    element: ElementType;
    rawDamage: number;
    damage: number;
    lifespan: number;
  }> = [];

  constructor() {
    super(CourtyardScene.KEY);
  }

  public create(): void {
    // Generate procedural textures directly in texture manager
    ProceduralTextureAtlas.generateAll(this);

    // Initialize core simulation systems
    this.grid = new SurfaceGrid(64, 32);
    this.reactionEngine = new ReactionEngine(this.grid);
    this.propPool = new KineticPropPool();
    this.player = new PlayerController();

    // Setup input listeners
    this.setupInput();

    // Create 64x32 Tilemap display list
    this.createIsometricTilemap();

    // Spawn player sprites
    this.playerShadow = this.add.image(0, 0, 'entity_hero');
    this.playerShadow.setTint(0x000000);
    this.playerShadow.setAlpha(0.35);

    this.playerSprite = this.add.image(0, 0, 'entity_hero');
    this.playerSprite.setOrigin(0.5, 0.9);

    // Spawn initial props across Upper Plaza and Sunken Wing
    this.spawnInitialProps();

    // Spawn initial shadow husk enemies
    this.spawnInitialEnemies();

    // Setup matrix debug graphics
    this.matrixGraphics = this.add.graphics();
    this.matrixGraphics.setDepth(IsoMath.LAYER_OVERHEAD_VFX + 100);

    // Setup projectile visual pool
    this.setupProjectilePool();

    // Setup camera
    this.cameras.main.setRoundPixels(true);
    this.cameras.main.setZoom(1.1);

    this.lastFrameTimestamp = performance.now();
  }

  private setupInput(): void {
    if (!this.input.keyboard) return;

    this.input.keyboard.on('keydown', (event: KeyboardEvent) => {
      this.keys[event.code] = true;

      // Matrix debug toggle (` or ~)
      if (event.code === 'Backquote') {
        this.toggleMatrixMode();
      }

      // Keyboard Combat Verbs (Confirmed Twin-Key Directional Scheme):
      // J: Kinetic Strike / Kick
      if (event.code === 'KeyJ') {
        this.performKineticStrike();
      }
      // K: Pyro Fireball
      if (event.code === 'KeyK') {
        this.castPyroFireball();
      }
      // L: Cryo Glacial Block / Shatter
      if (event.code === 'KeyL') {
        this.castCryoAbility();
      }
      // U: Electro Arc Chain
      if (event.code === 'KeyU') {
        this.castElectroArc();
      }
      // I: Hydro Splash
      if (event.code === 'KeyI') {
        this.castHydroSplash();
      }
      // Space: Dash / Animation Cancel
      if (event.code === 'Space') {
        if (this.player.triggerDash()) {
          ProceduralAudio.playPunch();
        }
      }
    });

    this.input.keyboard.on('keyup', (event: KeyboardEvent) => {
      this.keys[event.code] = false;
    });
  }

  public toggleMatrixMode(): boolean {
    this.isMatrixModeActive = !this.isMatrixModeActive;
    if (!this.isMatrixModeActive) {
      this.matrixGraphics.clear();
    }
    return this.isMatrixModeActive;
  }

  private createIsometricTilemap(): void {
    const originX = 1000;
    const originY = 200;

    for (let row = 0; row < 32; row++) {
      this.tileSprites[row] = [];
      this.surfaceOverlaySprites[row] = [];
      this.steamVfxSprites[row] = [];
      this.glacialSprites[row] = [];

      for (let col = 0; col < 64; col++) {
        const worldCoords = IsoMath.tileToWorld(col, row);
        const elevation = IsoMath.getTerrainElevation(col, row);
        const screenPos = IsoMath.worldToScreen(worldCoords.x, worldCoords.y, elevation, originX, originY);

        // Select tile texture based on zone
        let tileKey = 'tile_stone_upper';
        if (row >= 15 && row <= 20) {
          tileKey = 'tile_ramp';
        } else if (row > 20) {
          tileKey = 'tile_stone_sunken';
        }

        const tileImg = this.add.image(screenPos.x, screenPos.y, tileKey);
        tileImg.setOrigin(0.5, 0.5);
        tileImg.setDepth(IsoMath.computeDepthKey(screenPos.y, IsoMath.LAYER_TERRAIN));
        this.tileSprites[row][col] = tileImg;

        // Overlay sprite for WET / FROST / BURNING / SCORCHED
        const overlayImg = this.add.image(screenPos.x, screenPos.y, 'tile_wet');
        overlayImg.setOrigin(0.5, 0.5);
        overlayImg.setVisible(false);
        overlayImg.setDepth(IsoMath.computeDepthKey(screenPos.y, IsoMath.LAYER_DECALS));
        this.surfaceOverlaySprites[row][col] = overlayImg;

        // Glacial Block sprite
        const glacialImg = this.add.image(screenPos.x, screenPos.y - 12, 'prop_glacial_block');
        glacialImg.setOrigin(0.5, 0.85);
        glacialImg.setVisible(false);
        glacialImg.setDepth(IsoMath.computeDepthKey(screenPos.y, IsoMath.LAYER_PROPS_ENTITIES));
        this.glacialSprites[row][col] = glacialImg;

        // Steam Cloud sprite
        const steamImg = this.add.image(screenPos.x, screenPos.y - 16, 'vfx_steam');
        steamImg.setOrigin(0.5, 0.5);
        steamImg.setVisible(false);
        steamImg.setDepth(IsoMath.computeDepthKey(screenPos.y, IsoMath.LAYER_OVERHEAD_VFX));
        this.steamVfxSprites[row][col] = steamImg;
      }
    }
  }

  private spawnInitialProps(): void {
    // Upper Plaza props (crates & barrels)
    this.createPropInstance(PropType.WOODEN_CRATE, 380, 220, 0);
    this.createPropInstance(PropType.WOODEN_CRATE, 460, 260, 0);
    this.createPropInstance(PropType.OIL_BARREL, 520, 200, 0);
    this.createPropInstance(PropType.STONE_PILLAR, 600, 300, 0);

    // Ramp transition pillars
    this.createPropInstance(PropType.STONE_PILLAR, 300, 520, -36);
    this.createPropInstance(PropType.STONE_PILLAR, 700, 520, -36);

    // Sunken Wing props (z = -72)
    this.createPropInstance(PropType.WOODEN_CRATE, 420, 750, -72);
    this.createPropInstance(PropType.WOODEN_CRATE, 500, 800, -72);
    this.createPropInstance(PropType.OIL_BARREL, 580, 720, -72);
    this.createPropInstance(PropType.STONE_PILLAR, 650, 780, -72);
  }

  public createPropInstance(type: PropType, worldX: number, worldY: number, worldZ: number): KineticProp | null {
    const prop = this.propPool.spawn(type, worldX, worldY, worldZ);
    if (!prop) return null;

    let textureKey = 'prop_crate';
    if (type === PropType.OIL_BARREL) textureKey = 'prop_barrel';
    else if (type === PropType.STONE_PILLAR) textureKey = 'prop_pillar';
    else if (type === PropType.GLACIAL_BLOCK) textureKey = 'prop_glacial_block';

    const sprite = this.add.image(0, 0, textureKey);
    sprite.setOrigin(0.5, 0.9);
    prop.visualSprite = sprite;

    return prop;
  }

  private spawnInitialEnemies(): void {
    // Upper Plaza enemies
    this.spawnEnemy(1, 480, 280, 0);
    this.spawnEnemy(2, 640, 240, 0);

    // Sunken Wing enemies (z = -72)
    this.spawnEnemy(3, 460, 820, -72);
    this.spawnEnemy(4, 620, 760, -72);
  }

  public spawnEnemy(id: number, worldX: number, worldY: number, worldZ: number): EnemyController {
    const enemy = new EnemyController(id, worldX, worldY, worldZ);
    const sprite = this.add.image(0, 0, 'entity_husk');
    sprite.setOrigin(0.5, 0.9);
    enemy.sprite = sprite;
    this.enemies.push(enemy);
    return enemy;
  }

  private setupProjectilePool(): void {
    for (let i = 0; i < 20; i++) {
      const img = this.add.image(0, 0, 'vfx_fireball');
      img.setVisible(false);
      this.projectiles.push({
        active: false,
        sprite: img,
        x: 0,
        y: 0,
        z: 0,
        vx: 0,
        vy: 0,
        element: ElementType.PYRO,
        rawDamage: 35,
        damage: 35,
        lifespan: 0,
      });
    }
  }

  /**
   * Keyboard Ability: Kinetic Strike / Kick (J)
   * Kicks nearby wooden crates / barrels or strikes enemies
   */
  public performKineticStrike(): void {
    if (!this.player.canUseAbility('kinetic')) return;
    this.player.setAbilityActive('kinetic', 0.35);
    ProceduralAudio.playPunch();

    const strikeRange = 48;
    const strikeX = this.player.x + this.player.facingX * strikeRange;
    const strikeY = this.player.y + this.player.facingY * strikeRange;
    const playerZ = this.player.z;

    // Check collision with movable props (Rule 3 & 7)
    const activeProps = this.propPool.getActiveProps();
    for (const prop of activeProps) {
      if (!prop.isMovable || prop.isAsh) continue;

      // Volumetric vertical threshold check: |deltaZ| <= 24 px (Rule 7)
      if (!VolumetricAABB.checkKineticVerticalDelta(prop.z, playerZ)) {
        continue;
      }

      const dx = prop.x - strikeX;
      const dy = prop.y - strikeY;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < 42) {
        // Apply kinetic impulse capped at 400 px/s (Rule 3)
        const impulseMagnitude = 380;
        prop.applyImpulse(
          this.player.facingX * impulseMagnitude,
          this.player.facingY * impulseMagnitude,
          this.player.id
        );
        this.cameras.main.shake(120, 0.005);
        break;
      }
    }

    // Strike nearby enemies directly
    for (const enemy of this.enemies) {
      if (!enemy.active) continue;
      if (!VolumetricAABB.checkKineticVerticalDelta(enemy.z, playerZ)) continue;

      const dx = enemy.x - strikeX;
      const dy = enemy.y - strikeY;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < 40) {
        // Consecutive hit fills posture
        enemy.takeDamage(20, 30, this.player.facingX * 90, this.player.facingY * 90);
        if (enemy.state === EnemyState.STAGGERED) {
          ProceduralAudio.playPostureBreak();
        }
      }
    }
  }

  /**
   * Keyboard Ability: Pyro Fireball (K)
   * Tests Rule 16 (damage drops from 35 to 25 over WET + emits Steam Cloud)
   */
  public castPyroFireball(): void {
    if (!this.player.canUseAbility('pyro')) return;
    this.player.setAbilityActive('pyro', 0.5);
    ProceduralAudio.playPyro();

    // Spawn projectile from pool
    for (const p of this.projectiles) {
      if (!p.active) {
        p.active = true;
        p.element = ElementType.PYRO;
        p.rawDamage = 35; // Base damage (Rule 16)
        p.damage = 35;
        p.x = this.player.x + this.player.facingX * 16;
        p.y = this.player.y + this.player.facingY * 16;
        p.z = this.player.z + 12;
        const speed = 280;
        p.vx = this.player.facingX * speed;
        p.vy = this.player.facingY * speed;
        p.lifespan = 1.4;
        p.sprite.setTexture('vfx_fireball');
        p.sprite.setVisible(true);
        break;
      }
    }
  }

  /**
   * Keyboard Ability: Cryo Glacial Block / Shatter (L)
   * Tests Rule 8 (+15 HP heal once per cast) and Rule 9 (Shatter clears origin only)
   */
  public castCryoAbility(): void {
    if (!this.player.canUseAbility('cryo')) return;
    this.player.setAbilityActive('cryo', 0.6);

    const targetTile = IsoMath.worldToTile(
      this.player.x + this.player.facingX * 36,
      this.player.y + this.player.facingY * 36
    );

    // If Glacial Block already exists at target tile, execute Shatter (Rule 9)
    if (this.grid.hasGlacialBlock(targetTile.col, targetTile.row)) {
      this.reactionEngine.executeShatter(targetTile.col, targetTile.row);
      ProceduralAudio.playCryoShatter();
      this.cameras.main.shake(150, 0.008);
      return;
    }

    // Otherwise spawn Glacial Block: heals entity +15 HP once (Rule 8) and converts WET to FROST (Rule 10)
    ProceduralAudio.playCryoShatter();
    this.reactionEngine.spawnGlacialBlock(this.player, targetTile.col, targetTile.row);
    // Cryo footprint converts 3x3 WET to FROST (Rule 10)
    this.reactionEngine.applyCryoFootprint(targetTile.col, targetTile.row);
  }

  /**
   * Keyboard Ability: Electro Arc Chain (U)
   * Tests Rule 18 (max 4 targets, 0.8 damage decay) and Rule 19 (line of sight)
   */
  public castElectroArc(): void {
    if (!this.player.canUseAbility('electro')) return;
    this.player.setAbilityActive('electro', 0.7);

    // Find in-range enemies
    const eligibleTargets: EnemyController[] = [];
    for (const enemy of this.enemies) {
      if (!enemy.active || enemy.hp <= 0) continue;
      const dx = enemy.x - this.player.x;
      const dy = enemy.y - this.player.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 320) {
        eligibleTargets.push(enemy);
      }
    }

    if (eligibleTargets.length === 0) {
      ProceduralAudio.playElectroArc(0);
      return;
    }

    // Execute Arc Chain (Rule 18: max 4 targets with 0.8 falloff)
    const chainResults = this.reactionEngine.executeArcChain(eligibleTargets, 40);

    chainResults.forEach((res, idx) => {
      ProceduralAudio.playElectroArc(idx);
      const enemy = res.target as EnemyController;
      enemy.takeDamage(res.damage, 25);

      // Flash electro visual
      if (enemy.sprite) {
        enemy.sprite.setTint(0xA855F7);
        this.time.delayedCall(120, () => {
          if (enemy.sprite) enemy.sprite.clearTint();
        });
      }
    });

    // Also conduct through WET surface tiles (Rule 5.4 ConductionGraph)
    const playerTile = IsoMath.worldToTile(this.player.x, this.player.y);
    this.reactionEngine.applyElementToTile(ElementType.ELECTRO, playerTile.col, playerTile.row);
  }

  /**
   * Keyboard Ability: Hydro Splash (I)
   * Spawns WET puddle, extinguishes lit fuses (Rule 14), neutralizes fire
   */
  public castHydroSplash(): void {
    if (!this.player.canUseAbility('hydro')) return;
    this.player.setAbilityActive('hydro', 0.4);
    ProceduralAudio.playHydro();

    const targetTile = IsoMath.worldToTile(
      this.player.x + this.player.facingX * 32,
      this.player.y + this.player.facingY * 32
    );

    // Apply Hydro across 3x3 footprint
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        this.reactionEngine.applyElementToTile(
          ElementType.HYDRO,
          targetTile.col + dx,
          targetTile.row + dy
        );
      }
    }
  }

  /**
   * Core 60 Hz Game Loop with Zero GC Invariant
   */
  public update(time: number, delta: number): void {
    const dt = Math.min(delta / 1000, 0.1); // Fixed-step clamping

    // p99 frame time calculation
    const currentTimestamp = performance.now();
    const frameExecutionTime = currentTimestamp - this.lastFrameTimestamp;
    this.lastFrameTimestamp = currentTimestamp;

    this.frameTimeHistory.push(frameExecutionTime);
    if (this.frameTimeHistory.length > 60) this.frameTimeHistory.shift();

    // 1. Autonomous 10 Hz Surface Decay Simulation Tick
    this.decayAccumulator += dt;
    if (this.decayAccumulator >= this.DECAY_INTERVAL) {
      this.decayAccumulator -= this.DECAY_INTERVAL;
      const { detonatedFuses } = this.grid.tickDecay();

      // Trigger explosions for detonated fuses
      if (detonatedFuses.length > 0) {
        ProceduralAudio.playPyro();
        this.cameras.main.shake(200, 0.015);
      }
    }

    // 2. Player Update
    const currentGroundZ = IsoMath.getInterpolatedElevation(this.player.x, this.player.y);
    const currentTile = IsoMath.worldToTile(this.player.x, this.player.y);
    const currentSurface = this.grid.getCellState(currentTile.col, currentTile.row);

    // FROST friction coefficient drops by 60% (increases slide)
    const friction = currentSurface === SurfaceState.FROST ? 1.4 : 1.0;
    this.player.update(dt, this.keys, currentGroundZ, friction);

    // Update Player Visuals
    const originX = 1000;
    const originY = 200;
    const playerScreenPos = IsoMath.worldToScreen(this.player.x, this.player.y, this.player.z, originX, originY);
    this.playerSprite.setPosition(playerScreenPos.x, playerScreenPos.y);
    this.playerSprite.setDepth(IsoMath.computeDepthKey(playerScreenPos.y, IsoMath.LAYER_PROPS_ENTITIES));

    const shadowScreenPos = IsoMath.worldToScreen(this.player.x, this.player.y, currentGroundZ, originX, originY);
    this.playerShadow.setPosition(shadowScreenPos.x, shadowScreenPos.y);
    this.playerShadow.setDepth(IsoMath.computeDepthKey(shadowScreenPos.y, IsoMath.LAYER_DECALS));

    // Camera follow player
    this.cameras.main.scrollX = playerScreenPos.x - this.cameras.main.width / 2;
    this.cameras.main.scrollY = playerScreenPos.y - this.cameras.main.height / 2;

    // 3. Kinetic Props Update & Wall Collisions
    const activeProps = this.propPool.getActiveProps();
    for (const prop of activeProps) {
      const propGroundZ = IsoMath.getInterpolatedElevation(prop.x, prop.y);
      prop.update(dt, propGroundZ);

      // Arena wall bounce & re-arm check (Rule 5: > 200 px/s at > 45 deg)
      if (prop.x <= 70) {
        prop.x = 70;
        prop.handleRebound(1, 0);
        ProceduralAudio.playPunch();
      } else if (prop.x >= 1970) {
        prop.x = 1970;
        prop.handleRebound(-1, 0);
        ProceduralAudio.playPunch();
      }
      if (prop.y <= 70) {
        prop.y = 70;
        prop.handleRebound(0, 1);
        ProceduralAudio.playPunch();
      } else if (prop.y >= 950) {
        prop.y = 950;
        prop.handleRebound(0, -1);
        ProceduralAudio.playPunch();
      }

      // Prop collision with enemies (Rules 4, 7)
      if (prop.isLaunched && !prop.isAsh) {
        for (const enemy of this.enemies) {
          if (!enemy.active) continue;

          // Volumetric vertical threshold |deltaZ| <= 24 px (Rule 7)
          if (!VolumetricAABB.checkKineticVerticalDelta(prop.z, enemy.z)) continue;

          const dx = enemy.x - prop.x;
          const dy = enemy.y - prop.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < 32 && prop.canHitEntity(enemy.id, false, 0)) {
            prop.registerHit(enemy.id);
            // Kinetic impact deals heavy damage and fills posture meter
            enemy.takeDamage(35, 45, prop.vx * 0.4, prop.vy * 0.4, true);
            ProceduralAudio.playPunch();
            this.cameras.main.shake(100, 0.006);
          }
        }
      }

      // Update prop visual position
      if (prop.visualSprite) {
        const propScreenPos = IsoMath.worldToScreen(prop.x, prop.y, prop.z, originX, originY);
        prop.visualSprite.setPosition(propScreenPos.x, propScreenPos.y);
        prop.visualSprite.setDepth(IsoMath.computeDepthKey(propScreenPos.y, IsoMath.LAYER_PROPS_ENTITIES));
        prop.visualSprite.setVisible(prop.active && !prop.isAsh);
      }
    }

    // 4. Enemy Update
    for (const enemy of this.enemies) {
      if (!enemy.active) {
        if (enemy.sprite) enemy.sprite.setVisible(false);
        continue;
      }

      const enemyGroundZ = IsoMath.getInterpolatedElevation(enemy.x, enemy.y);
      enemy.update(dt, this.player.x, this.player.y, enemyGroundZ);

      if (enemy.sprite) {
        const enemyScreenPos = IsoMath.worldToScreen(enemy.x, enemy.y, enemy.z, originX, originY);
        enemy.sprite.setPosition(enemyScreenPos.x, enemyScreenPos.y);
        enemy.sprite.setDepth(IsoMath.computeDepthKey(enemyScreenPos.y, IsoMath.LAYER_PROPS_ENTITIES));
        enemy.sprite.setVisible(true);

        // Visual cue for staggered state
        if (enemy.state === EnemyState.STAGGERED) {
          enemy.sprite.setTint(0xFBBF24);
        } else if (enemy.state === EnemyState.AIRBORNE_JUGGLE) {
          enemy.sprite.setTint(0x38BDF8);
        } else {
          enemy.sprite.clearTint();
        }
      }
    }

    // 5. Projectiles Update
    for (const p of this.projectiles) {
      if (!p.active) continue;

      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.lifespan -= dt;

      // Check tile beneath projectile for Rule 16 (Fireball over WET attenuates damage to 25 + steam)
      const pTile = IsoMath.worldToTile(p.x, p.y);
      this.reactionEngine.processProjectileTilePass(p, pTile.col, pTile.row);

      // Hit enemy check
      for (const enemy of this.enemies) {
        if (!enemy.active) continue;
        const dx = enemy.x - p.x;
        const dy = enemy.y - p.y;
        if (Math.sqrt(dx * dx + dy * dy) < 28) {
          // Pyro on WET target single-step neutralization (Rule 17)
          this.reactionEngine.applyPyroToTarget(enemy, pTile.col, pTile.row);
          enemy.takeDamage(p.rawDamage, 20);
          p.active = false;
          p.sprite.setVisible(false);
          break;
        }
      }

      if (p.lifespan <= 0) {
        p.active = false;
        p.sprite.setVisible(false);
      } else if (p.active) {
        const pScreenPos = IsoMath.worldToScreen(p.x, p.y, p.z, originX, originY);
        p.sprite.setPosition(pScreenPos.x, pScreenPos.y);
        p.sprite.setDepth(IsoMath.computeDepthKey(pScreenPos.y, IsoMath.LAYER_OVERHEAD_VFX));
      }
    }

    // 6. Update Surface Grid Tile Visuals (Sync with viewport bounds)
    this.updateSurfaceVisuals();

    // 7. Matrix Mode Rendering
    if (this.isMatrixModeActive) {
      this.renderMatrixOverlay();
    }

    // 8. Telemetry updates to React HUD
    this.telemetryTimer += dt;
    if (this.telemetryTimer >= 0.15) {
      this.telemetryTimer = 0;
      this.emitTelemetry();
    }
  }

  private updateSurfaceVisuals(): void {
    let wetCount = 0;
    let frostCount = 0;
    let burningCount = 0;
    let steamCount = 0;

    for (let row = 0; row < 32; row++) {
      for (let col = 0; col < 64; col++) {
        const state = this.grid.getCellState(col, row);
        const overlay = this.surfaceOverlaySprites[row][col];
        const glacial = this.glacialSprites[row][col];
        const steam = this.steamVfxSprites[row][col];

        if (overlay) {
          if (state === SurfaceState.WET) {
            overlay.setTexture('tile_wet');
            overlay.setVisible(true);
            wetCount++;
          } else if (state === SurfaceState.FROST) {
            overlay.setTexture('tile_frost');
            overlay.setVisible(true);
            frostCount++;
          } else if (state === SurfaceState.BURNING) {
            overlay.setTexture('tile_burning');
            overlay.setVisible(true);
            burningCount++;
          } else if (state === SurfaceState.SCORCHED) {
            overlay.setTexture('tile_scorch');
            overlay.setVisible(true);
          } else {
            overlay.setVisible(false);
          }
        }

        // Glacial Block
        if (glacial) {
          glacial.setVisible(this.grid.hasGlacialBlock(col, row));
        }

        // Steam Cloud
        if (steam) {
          const hasSteam = this.grid.hasSteamCloud(col, row);
          steam.setVisible(hasSteam);
          if (hasSteam) steamCount++;
        }
      }
    }
  }

  private renderMatrixOverlay(): void {
    this.matrixGraphics.clear();
    const originX = 1000;
    const originY = 200;

    // Draw player AABB and vertical Z indicator
    const playerScreen = IsoMath.worldToScreen(this.player.x, this.player.y, this.player.z, originX, originY);
    this.matrixGraphics.lineStyle(2, 0x38BDF8, 0.9);
    this.matrixGraphics.strokeRect(playerScreen.x - 16, playerScreen.y - 32, 32, 32);

    // Draw vertical delta line (|deltaZ| <= 24 px)
    this.matrixGraphics.lineStyle(1.5, 0xEF4444, 0.8);
    this.matrixGraphics.lineBetween(playerScreen.x, playerScreen.y - 24, playerScreen.x, playerScreen.y + 24);

    // Draw active props AABBs
    this.matrixGraphics.lineStyle(1.5, 0xF59E0B, 0.8);
    for (const prop of this.propPool.getActiveProps()) {
      if (!prop.active || prop.isAsh) continue;
      const s = IsoMath.worldToScreen(prop.x, prop.y, prop.z, originX, originY);
      this.matrixGraphics.strokeRect(s.x - 12, s.y - 24, 24, 24);
    }
  }

  private emitTelemetry(): void {
    if (!this.onTelemetryUpdate) return;

    // Calculate p99 frame time
    const sorted = [...this.frameTimeHistory].sort((a, b) => a - b);
    const p99Index = Math.floor(sorted.length * 0.99);
    const p99FrameTime = sorted[p99Index] || 0;

    this.onTelemetryUpdate({
      fps: Math.round(this.game.loop.actualFps),
      frameTimeMs: Number(p99FrameTime.toFixed(2)),
      activeProps: this.propPool.getActiveProps().length,
      wetCells: 0,
      frostCells: 0,
      burningCells: 0,
      steamClouds: 0,
      activeEnemies: this.enemies.filter(e => e.active).length,
      playerHp: this.player.hp,
      playerPosture: Math.round(this.player.posture),
    });
  }

  /**
   * Reset arena state for Acceptance Scenario A
   */
  public resetArena(): void {
    this.grid.reset();
    this.propPool.resetAll();
    this.spawnInitialProps();
    this.player.hp = this.player.maxHp;
    this.player.posture = 0;
    this.player.x = 320;
    this.player.y = 240;
    this.player.z = 0;
  }
}
