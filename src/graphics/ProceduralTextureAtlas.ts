/**
 * ProceduralTextureAtlas: Offscreen HTML5 Canvas Texture Synthesizer for Phaser 3
 * Generates all isometric terrain diamond tiles, props, characters, and VFX directly
 * in code to eliminate broken external assets and ensure instant loading.
 */

import Phaser from 'phaser';

export class ProceduralTextureAtlas {
  /**
   * Generates all required textures into the Phaser scene's TextureManager
   */
  public static generateAll(scene: Phaser.Scene): void {
    const tm = scene.textures;

    this.createDiamondTile(tm, 'tile_stone_upper', '#283144', '#38455e', '#1c2230');
    this.createDiamondTile(tm, 'tile_stone_sunken', '#181e2b', '#222b3d', '#11151f');
    this.createDiamondTile(tm, 'tile_ramp', '#222a3a', '#303b52', '#171d28', true);

    this.createOverlayTile(tm, 'tile_wet', 'rgba(56, 189, 248, 0.25)', 'rgba(255, 255, 255, 0.35)');
    this.createOverlayTile(tm, 'tile_frost', 'rgba(186, 230, 253, 0.55)', 'rgba(255, 255, 255, 0.8)');
    this.createOverlayTile(tm, 'tile_burning', 'rgba(239, 68, 68, 0.45)', 'rgba(251, 191, 36, 0.6)');
    this.createOverlayTile(tm, 'tile_scorch', 'rgba(15, 17, 23, 0.75)', 'rgba(30, 41, 59, 0.5)');

    this.createWoodenCrate(tm, 'prop_crate');
    this.createExplosiveBarrel(tm, 'prop_barrel');
    this.createGlacialBlock(tm, 'prop_glacial_block');
    this.createStonePillar(tm, 'prop_pillar');

    this.createHeroSprite(tm, 'entity_hero');
    this.createHuskSprite(tm, 'entity_husk');

    this.createVfxTextures(tm);
  }

  /**
   * Generates a 64x32 Diamond Isometric Tile
   */
  private static createDiamondTile(
    tm: Phaser.Textures.TextureManager,
    key: string,
    baseColor: string,
    lightColor: string,
    darkColor: string,
    isRamp: boolean = false
  ): void {
    if (tm.exists(key)) return;

    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 32;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Diamond polygon: Top (32, 0), Right (64, 16), Bottom (32, 32), Left (0, 16)
    ctx.beginPath();
    ctx.moveTo(32, 0);
    ctx.lineTo(64, 16);
    ctx.lineTo(32, 32);
    ctx.lineTo(0, 16);
    ctx.closePath();

    ctx.fillStyle = baseColor;
    ctx.fill();

    // Internal cobblestone / flagstone grid
    ctx.strokeStyle = darkColor;
    ctx.lineWidth = 1;
    ctx.beginPath();
    // Inner diagonal cuts
    ctx.moveTo(16, 8);
    ctx.lineTo(48, 24);
    ctx.moveTo(48, 8);
    ctx.lineTo(16, 24);
    ctx.stroke();

    if (isRamp) {
      // Draw horizontal step grooves
      ctx.strokeStyle = lightColor;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(20, 10);
      ctx.lineTo(44, 22);
      ctx.moveTo(26, 7);
      ctx.lineTo(50, 19);
      ctx.stroke();
    }

    // Diamond perimeter edge highlight
    ctx.strokeStyle = lightColor;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, 16);
    ctx.lineTo(32, 0);
    ctx.lineTo(64, 16);
    ctx.stroke();

    ctx.strokeStyle = darkColor;
    ctx.beginPath();
    ctx.moveTo(64, 16);
    ctx.lineTo(32, 32);
    ctx.lineTo(0, 16);
    ctx.stroke();

    tm.addCanvas(key, canvas);
  }

  /**
   * Generates Surface Overlays (Wet, Frost, Burning, Scorched)
   */
  private static createOverlayTile(
    tm: Phaser.Textures.TextureManager,
    key: string,
    fillColor: string,
    highlightColor: string
  ): void {
    if (tm.exists(key)) return;

    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 32;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.beginPath();
    ctx.moveTo(32, 2);
    ctx.lineTo(62, 16);
    ctx.lineTo(32, 30);
    ctx.lineTo(2, 16);
    ctx.closePath();

    ctx.fillStyle = fillColor;
    ctx.fill();

    // Specular highlight / crystal sparkle
    ctx.fillStyle = highlightColor;
    ctx.fillRect(30, 12, 4, 3);
    ctx.fillRect(24, 17, 3, 2);
    ctx.fillRect(38, 18, 3, 2);

    tm.addCanvas(key, canvas);
  }

  /**
   * Isometric Wooden Crate (32x32)
   */
  private static createWoodenCrate(tm: Phaser.Textures.TextureManager, key: string): void {
    if (tm.exists(key)) return;

    const canvas = document.createElement('canvas');
    canvas.width = 32;
    canvas.height = 32;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Isometric Cube Faces
    // Top Face: (16, 2) -> (30, 9) -> (16, 16) -> (2, 9)
    ctx.beginPath();
    ctx.moveTo(16, 2);
    ctx.lineTo(30, 9);
    ctx.lineTo(16, 16);
    ctx.lineTo(2, 9);
    ctx.closePath();
    ctx.fillStyle = '#8B5A2B';
    ctx.fill();
    ctx.strokeStyle = '#4A2E12';
    ctx.stroke();

    // Left Face: (2, 9) -> (16, 16) -> (16, 30) -> (2, 23)
    ctx.beginPath();
    ctx.moveTo(2, 9);
    ctx.lineTo(16, 16);
    ctx.lineTo(16, 30);
    ctx.lineTo(2, 23);
    ctx.closePath();
    ctx.fillStyle = '#6E451F';
    ctx.fill();
    ctx.strokeStyle = '#38220B';
    ctx.stroke();

    // Right Face: (16, 16) -> (30, 9) -> (30, 23) -> (16, 30)
    ctx.beginPath();
    ctx.moveTo(16, 16);
    ctx.lineTo(30, 9);
    ctx.lineTo(30, 23);
    ctx.lineTo(16, 30);
    ctx.closePath();
    ctx.fillStyle = '#5A3716';
    ctx.fill();
    ctx.strokeStyle = '#2B1906';
    ctx.stroke();

    // Iron reinforcement band
    ctx.strokeStyle = '#94A3B8';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(6, 14, 20, 10);

    tm.addCanvas(key, canvas);
  }

  /**
   * Explosive Barrel (32x36)
   */
  private static createExplosiveBarrel(tm: Phaser.Textures.TextureManager, key: string): void {
    if (tm.exists(key)) return;

    const canvas = document.createElement('canvas');
    canvas.width = 32;
    canvas.height = 36;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Red Cylinder Body
    ctx.fillStyle = '#DC2626';
    ctx.beginPath();
    ctx.ellipse(16, 8, 12, 6, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillRect(4, 8, 24, 20);

    ctx.beginPath();
    ctx.ellipse(16, 28, 12, 6, 0, 0, Math.PI * 2);
    ctx.fill();

    // Metal rings
    ctx.strokeStyle = '#FBBF24';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(16, 14, 12, 5, 0, 0, Math.PI * 2);
    ctx.ellipse(16, 22, 12, 5, 0, 0, Math.PI * 2);
    ctx.stroke();

    // Skull / Alchemical Danger mark
    ctx.fillStyle = '#000000';
    ctx.fillRect(14, 17, 4, 4);

    // Fuse on top
    ctx.strokeStyle = '#F97316';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(16, 6);
    ctx.lineTo(18, 1);
    ctx.stroke();

    tm.addCanvas(key, canvas);
  }

  /**
   * Glacial Crystal Block (36x44)
   */
  private static createGlacialBlock(tm: Phaser.Textures.TextureManager, key: string): void {
    if (tm.exists(key)) return;

    const canvas = document.createElement('canvas');
    canvas.width = 36;
    canvas.height = 44;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Translucent Ice Spire & Cube
    ctx.fillStyle = '#38BDF8';
    ctx.beginPath();
    ctx.moveTo(18, 2);
    ctx.lineTo(34, 14);
    ctx.lineTo(34, 34);
    ctx.lineTo(18, 42);
    ctx.lineTo(2, 34);
    ctx.lineTo(2, 14);
    ctx.closePath();
    ctx.fill();

    // Crystal Facets
    ctx.strokeStyle = '#E0F2FE';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(18, 2);
    ctx.lineTo(18, 42);
    ctx.moveTo(18, 18);
    ctx.lineTo(34, 14);
    ctx.moveTo(18, 18);
    ctx.lineTo(2, 14);
    ctx.stroke();

    // Specular shine
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.moveTo(18, 5);
    ctx.lineTo(26, 12);
    ctx.lineTo(18, 16);
    ctx.lineTo(12, 10);
    ctx.closePath();
    ctx.fill();

    tm.addCanvas(key, canvas);
  }

  /**
   * Stone Pillar (32x72)
   */
  private static createStonePillar(tm: Phaser.Textures.TextureManager, key: string): void {
    if (tm.exists(key)) return;

    const canvas = document.createElement('canvas');
    canvas.width = 32;
    canvas.height = 72;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Pillar Column
    ctx.fillStyle = '#475569';
    ctx.fillRect(6, 14, 20, 50);

    // Capital & Base
    ctx.fillStyle = '#64748B';
    ctx.fillRect(4, 8, 24, 6);
    ctx.fillRect(4, 64, 24, 6);

    // Fluting grooves
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(11, 14);
    ctx.lineTo(11, 64);
    ctx.moveTo(16, 14);
    ctx.lineTo(16, 64);
    ctx.moveTo(21, 14);
    ctx.lineTo(21, 64);
    ctx.stroke();

    tm.addCanvas(key, canvas);
  }

  /**
   * Alchemist Hero Sprite (32x40)
   */
  private static createHeroSprite(tm: Phaser.Textures.TextureManager, key: string): void {
    if (tm.exists(key)) return;

    const canvas = document.createElement('canvas');
    canvas.width = 32;
    canvas.height = 40;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Shadow on ground
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath();
    ctx.ellipse(16, 37, 10, 3, 0, 0, Math.PI * 2);
    ctx.fill();

    // Indigo Alchemical Robe
    ctx.fillStyle = '#312E81';
    ctx.beginPath();
    ctx.moveTo(12, 14);
    ctx.lineTo(20, 14);
    ctx.lineTo(24, 34);
    ctx.lineTo(8, 34);
    ctx.closePath();
    ctx.fill();

    // Golden Rune Trim
    ctx.strokeStyle = '#F59E0B';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Hood & Mask
    ctx.fillStyle = '#4338CA';
    ctx.beginPath();
    ctx.arc(16, 12, 6, 0, Math.PI * 2);
    ctx.fill();

    // Glowing Alchemical Visor / Eyes
    ctx.fillStyle = '#38BDF8';
    ctx.fillRect(14, 11, 4, 2);

    // Elemental Gauntlet (Right hand)
    ctx.fillStyle = '#F97316';
    ctx.beginPath();
    ctx.arc(24, 22, 4, 0, Math.PI * 2);
    ctx.fill();

    tm.addCanvas(key, canvas);
  }

  /**
   * Shadow Husk Enemy (32x36)
   */
  private static createHuskSprite(tm: Phaser.Textures.TextureManager, key: string): void {
    if (tm.exists(key)) return;

    const canvas = document.createElement('canvas');
    canvas.width = 32;
    canvas.height = 36;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Shadow on ground
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath();
    ctx.ellipse(16, 33, 9, 3, 0, 0, Math.PI * 2);
    ctx.fill();

    // Ghostly body
    ctx.fillStyle = '#1E1B4B';
    ctx.beginPath();
    ctx.arc(16, 14, 8, 0, Math.PI * 2);
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(8, 14);
    ctx.lineTo(24, 14);
    ctx.lineTo(26, 30);
    ctx.lineTo(16, 26);
    ctx.lineTo(6, 30);
    ctx.closePath();
    ctx.fill();

    // Void Core (Violet)
    ctx.fillStyle = '#C084FC';
    ctx.beginPath();
    ctx.arc(16, 16, 3.5, 0, Math.PI * 2);
    ctx.fill();

    // Red menacing eyes
    ctx.fillStyle = '#EF4444';
    ctx.fillRect(13, 12, 2, 2);
    ctx.fillRect(17, 12, 2, 2);

    tm.addCanvas(key, canvas);
  }

  /**
   * VFX Textures (Fireball, Steam, Arc Bolt)
   */
  private static createVfxTextures(tm: Phaser.Textures.TextureManager): void {
    // Fireball
    if (!tm.exists('vfx_fireball')) {
      const c = document.createElement('canvas');
      c.width = 16;
      c.height = 16;
      const ctx = c.getContext('2d');
      if (ctx) {
        const grad = ctx.createRadialGradient(8, 8, 2, 8, 8, 8);
        grad.addColorStop(0, '#FFFFFF');
        grad.addColorStop(0.4, '#FBBF24');
        grad.addColorStop(0.8, '#EA580C');
        grad.addColorStop(1, 'rgba(234, 88, 12, 0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(8, 8, 8, 0, Math.PI * 2);
        ctx.fill();
        tm.addCanvas('vfx_fireball', c);
      }
    }

    // Steam Cloud
    if (!tm.exists('vfx_steam')) {
      const c = document.createElement('canvas');
      c.width = 32;
      c.height = 32;
      const ctx = c.getContext('2d');
      if (ctx) {
        ctx.fillStyle = 'rgba(241, 245, 249, 0.45)';
        ctx.beginPath();
        ctx.arc(16, 16, 12, 0, Math.PI * 2);
        ctx.arc(11, 13, 8, 0, Math.PI * 2);
        ctx.arc(21, 14, 9, 0, Math.PI * 2);
        ctx.fill();
        tm.addCanvas('vfx_steam', c);
      }
    }

    // Electro Spark
    if (!tm.exists('vfx_arc')) {
      const c = document.createElement('canvas');
      c.width = 24;
      c.height = 24;
      const ctx = c.getContext('2d');
      if (ctx) {
        ctx.strokeStyle = '#A855F7';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(4, 12);
        ctx.lineTo(10, 4);
        ctx.lineTo(14, 20);
        ctx.lineTo(20, 10);
        ctx.stroke();

        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 1;
        ctx.stroke();
        tm.addCanvas('vfx_arc', c);
      }
    }
  }
}
