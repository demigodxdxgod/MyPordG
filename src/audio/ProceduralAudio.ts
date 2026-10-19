/**
 * ProceduralAudio: Zero-Asset Web Audio API Synthesizer
 * Generates combat impacts, elemental reactions, and posture breaks without external audio files.
 */

export class ProceduralAudio {
  private static ctx: AudioContext | null = null;
  private static isMuted: boolean = false;

  private static getContext(): AudioContext | null {
    if (this.isMuted) return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  public static toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    return this.isMuted;
  }

  public static getMuted(): boolean {
    return this.isMuted;
  }

  /**
   * Kinetic Punch / Kick Strike
   */
  public static playPunch(): void {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(140, now);
    osc.frequency.exponentialRampToValueAtTime(35, now + 0.12);

    gain.gain.setValueAtTime(0.4, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.12);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.13);
  }

  /**
   * Pyro Fireball & Ignition
   */
  public static playPyro(): void {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    // Sub rumble + noise crackle
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(180, now);
    osc.frequency.exponentialRampToValueAtTime(45, now + 0.28);

    gain.gain.setValueAtTime(0.35, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.3);
  }

  /**
   * Cryo Glacial Crystallization / Ice Shatter
   */
  public static playCryoShatter(): void {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    // High frequency crystalline chime
    const freqs = [880, 1320, 1760];
    freqs.forEach((f, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(f, now + idx * 0.02);
      osc.frequency.exponentialRampToValueAtTime(f * 1.5, now + 0.18);

      gain.gain.setValueAtTime(0.18, now + idx * 0.02);
      gain.gain.exponentialRampToValueAtTime(0.005, now + 0.2);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + idx * 0.02);
      osc.stop(now + 0.22);
    });
  }

  /**
   * Electro Arc Discharge Zap
   */
  public static playElectroArc(jumpIndex: number = 0): void {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sawtooth';
    const baseFreq = 520 + jumpIndex * 140;
    osc.frequency.setValueAtTime(baseFreq, now);
    osc.frequency.linearRampToValueAtTime(baseFreq * 2.2, now + 0.06);
    osc.frequency.linearRampToValueAtTime(baseFreq * 0.8, now + 0.12);

    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.12);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.13);
  }

  /**
   * Hydro Splash / Liquid Flow
   */
  public static playHydro(): void {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(320, now);
    osc.frequency.exponentialRampToValueAtTime(120, now + 0.2);

    gain.gain.setValueAtTime(0.28, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.22);
  }

  /**
   * Steam Cloud Hiss
   */
  public static playSteamHiss(): void {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(750, now);
    osc.frequency.linearRampToValueAtTime(600, now + 0.25);

    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.26);
  }

  /**
   * Posture Break Gong (Resonant Stagger)
   */
  public static playPostureBreak(): void {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'square';
    osc.frequency.setValueAtTime(110, now);
    osc.frequency.exponentialRampToValueAtTime(55, now + 0.6);

    gain.gain.setValueAtTime(0.4, now);
    gain.gain.exponentialRampToValueAtTime(0.005, now + 0.65);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.66);
  }
}
