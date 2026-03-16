// ============================================================================
// ArthurianRPGAudio.ts – Procedural Audio System (Web Audio API, no files)
// ============================================================================
//
// All sounds are generated procedurally using OscillatorNode, GainNode,
// BiquadFilterNode, and noise buffers. No external audio files are needed.
// ============================================================================

import { TerrainType } from "./ArthurianRPGConfig";
import type { Vec3 } from "./ArthurianRPGState";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type WeatherKind = "clear" | "rain" | "storm" | "fog" | "snow" | "overcast";

// ---------------------------------------------------------------------------
// ArthurianAudioManager
// ---------------------------------------------------------------------------

export class ArthurianAudioManager {
  private _ctx: AudioContext | null = null;

  // Volume buses --------------------------------------------------------
  private _master!: GainNode;
  private _sfxBus!: GainNode;
  private _musicBus!: GainNode;
  private _ambientBus!: GainNode;

  masterVolume = 0.6;
  sfxVolume = 0.8;
  musicVolume = 0.5;
  ambientVolume = 0.45;

  // Sound pooling – timestamp of last play per sound-id -----------------
  private _pool: Map<string, number> = new Map();
  private readonly _poolCooldown = 0.06; // seconds between identical sounds

  // Ambient layers (persistent nodes) -----------------------------------
  private _windGain: GainNode | null = null;
  private _windFilter: BiquadFilterNode | null = null;
  private _windNoise: AudioBufferSourceNode | null = null;

  private _rainGain: GainNode | null = null;
  private _rainFilter: BiquadFilterNode | null = null;
  private _rainNoise: AudioBufferSourceNode | null = null;

  private _thunderTimer = 0;

  private _dayAmbientGain: GainNode | null = null;
  private _nightAmbientGain: GainNode | null = null;
  private _dayOsc: OscillatorNode | null = null;
  private _nightOsc: OscillatorNode | null = null;
  private _cricketOsc: OscillatorNode | null = null;

  private _fireGain: GainNode | null = null;
  private _fireNoise: AudioBufferSourceNode | null = null;

  // Noise buffer cache --------------------------------------------------
  private _whiteNoiseBuf: AudioBuffer | null = null;

  // Footstep state ------------------------------------------------------
  private _footstepAcc = 0;
  private _footstepAlt = false;

  // Ambient state -------------------------------------------------------
  private _ambientStarted = false;
  private _isDay = true;

  // =====================================================================
  // Init / Destroy
  // =====================================================================

  init(): void {
    try {
      this._ctx = new AudioContext();
    } catch {
      return; // Web Audio not available
    }
    const c = this._ctx;
    this._master = c.createGain();
    this._master.gain.value = this.masterVolume;
    this._master.connect(c.destination);

    this._sfxBus = c.createGain();
    this._sfxBus.gain.value = this.sfxVolume;
    this._sfxBus.connect(this._master);

    this._musicBus = c.createGain();
    this._musicBus.gain.value = this.musicVolume;
    this._musicBus.connect(this._master);

    this._ambientBus = c.createGain();
    this._ambientBus.gain.value = this.ambientVolume;
    this._ambientBus.connect(this._master);

    this._whiteNoiseBuf = this._createNoiseBuffer(2);
  }

  destroy(): void {
    this._stopAllAmbient();
    if (this._ctx && this._ctx.state !== "closed") {
      this._ctx.close().catch(() => {});
    }
    this._ctx = null;
    this._ambientStarted = false;
    this._pool.clear();
  }

  /** Must be called from a user gesture to unlock the AudioContext. */
  resume(): void {
    if (this._ctx && this._ctx.state === "suspended") {
      this._ctx.resume().catch(() => {});
    }
  }

  // =====================================================================
  // Volume controls
  // =====================================================================

  setMasterVolume(v: number): void {
    this.masterVolume = v;
    if (this._master) this._master.gain.setTargetAtTime(v, this._now(), 0.05);
  }

  setSfxVolume(v: number): void {
    this.sfxVolume = v;
    if (this._sfxBus) this._sfxBus.gain.setTargetAtTime(v, this._now(), 0.05);
  }

  setMusicVolume(v: number): void {
    this.musicVolume = v;
    if (this._musicBus) this._musicBus.gain.setTargetAtTime(v, this._now(), 0.05);
  }

  setAmbientVolume(v: number): void {
    this.ambientVolume = v;
    if (this._ambientBus) this._ambientBus.gain.setTargetAtTime(v, this._now(), 0.05);
  }

  // =====================================================================
  // Internal helpers
  // =====================================================================

  private _createNoiseBuffer(sec: number): AudioBuffer {
    const c = this._ctx!;
    const sr = c.sampleRate;
    const len = sr * sec;
    const buf = c.createBuffer(1, len, sr);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    return buf;
  }

  private _noiseSource(): AudioBufferSourceNode {
    const s = this._ctx!.createBufferSource();
    s.buffer = this._whiteNoiseBuf!;
    s.loop = true;
    return s;
  }

  private _canPlay(id: string): boolean {
    const n = this._now();
    const l = this._pool.get(id) ?? 0;
    if (n - l < this._poolCooldown) return false;
    this._pool.set(id, n);
    return true;
  }

  private _now(): number {
    return this._ctx ? this._ctx.currentTime : 0;
  }

  // =====================================================================
  // Spatial audio helper
  // =====================================================================

  /**
   * Returns a 0-1 volume multiplier based on distance between player and
   * the sound source. Sounds beyond maxDist are silent.
   */
  spatialGain(playerPos: Vec3, soundPos: Vec3, maxDist = 40): number {
    const dx = playerPos.x - soundPos.x;
    const dy = playerPos.y - soundPos.y;
    const dz = playerPos.z - soundPos.z;
    const d = Math.sqrt(dx * dx + dy * dy + dz * dz);
    return d >= maxDist ? 0 : 1 - d / maxDist;
  }

  // =====================================================================
  // COMBAT SOUNDS
  // =====================================================================

  /** Sword swing whoosh – filtered noise burst */
  playSwordSwing(): void {
    if (!this._ctx || !this._canPlay("swordSwing")) return;
    const c = this._ctx, t = c.currentTime;
    const noise = this._noiseSource();
    const bp = c.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = 800;
    bp.Q.value = 1.5;
    const g = c.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.35, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
    noise.connect(bp).connect(g).connect(this._sfxBus);
    noise.start(t);
    noise.stop(t + 0.2);
  }

  /** Hit impact thud – low sine + noise punch */
  playHitImpact(isCritical = false): void {
    if (!this._ctx || !this._canPlay("hitImpact")) return;
    const c = this._ctx, t = c.currentTime;
    // Low thud
    const osc = c.createOscillator();
    osc.type = "sine";
    osc.frequency.setValueAtTime(isCritical ? 100 : 80, t);
    osc.frequency.exponentialRampToValueAtTime(30, t + 0.15);
    const g = c.createGain();
    g.gain.setValueAtTime(isCritical ? 0.6 : 0.4, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
    osc.connect(g).connect(this._sfxBus);
    osc.start(t);
    osc.stop(t + 0.25);
    // Noise punch
    const noise = this._noiseSource();
    const lp = c.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = isCritical ? 600 : 400;
    const gn = c.createGain();
    gn.gain.setValueAtTime(isCritical ? 0.3 : 0.2, t);
    gn.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
    noise.connect(lp).connect(gn).connect(this._sfxBus);
    noise.start(t);
    noise.stop(t + 0.15);
  }

  /** Block clang – metallic ring from two detuned square oscillators */
  playBlock(): void {
    if (!this._ctx || !this._canPlay("block")) return;
    const c = this._ctx, t = c.currentTime;
    for (const freq of [1200, 2400]) {
      const osc = c.createOscillator();
      osc.type = "square";
      osc.frequency.setValueAtTime(freq, t);
      osc.frequency.exponentialRampToValueAtTime(freq * 0.5, t + 0.15);
      const g = c.createGain();
      g.gain.setValueAtTime(0.15, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
      const hp = c.createBiquadFilter();
      hp.type = "highpass";
      hp.frequency.value = 800;
      osc.connect(hp).connect(g).connect(this._sfxBus);
      osc.start(t);
      osc.stop(t + 0.3);
    }
  }

  /** Arrow fire twang – descending sawtooth + string vibration */
  playArrowFire(): void {
    if (!this._ctx || !this._canPlay("arrowFire")) return;
    const c = this._ctx, t = c.currentTime;
    const osc = c.createOscillator();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(600, t);
    osc.frequency.exponentialRampToValueAtTime(150, t + 0.08);
    const g = c.createGain();
    g.gain.setValueAtTime(0.2, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
    osc.connect(g).connect(this._sfxBus);
    osc.start(t);
    osc.stop(t + 0.18);
    // String vibration tail
    const osc2 = c.createOscillator();
    osc2.type = "sine";
    osc2.frequency.setValueAtTime(220, t);
    const g2 = c.createGain();
    g2.gain.setValueAtTime(0.08, t + 0.03);
    g2.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
    osc2.connect(g2).connect(this._sfxBus);
    osc2.start(t + 0.03);
    osc2.stop(t + 0.4);
  }

  /** Spell cast shimmer – rising sine partials + high-freq sparkle noise */
  playSpellCast(): void {
    if (!this._ctx || !this._canPlay("spellCast")) return;
    const c = this._ctx, t = c.currentTime;
    for (let i = 0; i < 4; i++) {
      const osc = c.createOscillator();
      osc.type = "sine";
      const baseF = 400 + i * 300;
      osc.frequency.setValueAtTime(baseF, t + i * 0.05);
      osc.frequency.linearRampToValueAtTime(baseF * 1.5, t + 0.3 + i * 0.05);
      const g = c.createGain();
      g.gain.setValueAtTime(0, t + i * 0.05);
      g.gain.linearRampToValueAtTime(0.1, t + 0.05 + i * 0.05);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.45);
      osc.connect(g).connect(this._sfxBus);
      osc.start(t + i * 0.05);
      osc.stop(t + 0.5);
    }
    // Sparkle noise
    const n = this._noiseSource();
    const hp = c.createBiquadFilter();
    hp.type = "highpass";
    hp.frequency.value = 4000;
    const gn = c.createGain();
    gn.gain.setValueAtTime(0.06, t);
    gn.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
    n.connect(hp).connect(gn).connect(this._sfxBus);
    n.start(t);
    n.stop(t + 0.45);
  }

  // =====================================================================
  // MOVEMENT SOUNDS
  // =====================================================================

  /**
   * Called each simulation tick. Generates footstep sounds at intervals
   * based on movement speed and terrain type.
   */
  updateFootsteps(dt: number, isMoving: boolean, speed: number, terrain: TerrainType): void {
    if (!isMoving || !this._ctx) {
      this._footstepAcc = 0;
      return;
    }
    const interval = speed > 6 ? 0.28 : 0.42;
    this._footstepAcc += dt;
    if (this._footstepAcc >= interval) {
      this._footstepAcc -= interval;
      this._playFootstep(terrain);
    }
  }

  private _playFootstep(terrain: TerrainType): void {
    if (!this._ctx || !this._canPlay("foot")) return;
    const c = this._ctx, t = c.currentTime;
    this._footstepAlt = !this._footstepAlt;
    const pv = this._footstepAlt ? 1.0 : 0.9; // alternating pitch

    switch (terrain) {
      // -- Soft terrain: filtered noise --
      case TerrainType.Grass:
      case TerrainType.Dirt:
      case TerrainType.Swamp: {
        const n = this._noiseSource();
        const lp = c.createBiquadFilter();
        lp.type = "lowpass";
        lp.frequency.value =
          terrain === TerrainType.Swamp ? 300 :
          terrain === TerrainType.Grass ? 500 : 600;
        const g = c.createGain();
        g.gain.setValueAtTime(terrain === TerrainType.Swamp ? 0.12 : 0.08, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
        n.connect(lp).connect(g).connect(this._sfxBus);
        n.start(t);
        n.stop(t + 0.12);
        break;
      }
      // -- Hard terrain: triangle osc + high-freq tap --
      case TerrainType.Stone:
      case TerrainType.Snow: {
        const osc = c.createOscillator();
        osc.type = "triangle";
        osc.frequency.setValueAtTime(200 * pv, t);
        osc.frequency.exponentialRampToValueAtTime(80, t + 0.06);
        const g = c.createGain();
        g.gain.setValueAtTime(terrain === TerrainType.Snow ? 0.06 : 0.12, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
        osc.connect(g).connect(this._sfxBus);
        osc.start(t);
        osc.stop(t + 0.1);
        if (terrain === TerrainType.Stone) {
          const n = this._noiseSource();
          const hp = c.createBiquadFilter();
          hp.type = "highpass";
          hp.frequency.value = 2000;
          const gn = c.createGain();
          gn.gain.setValueAtTime(0.04, t);
          gn.gain.exponentialRampToValueAtTime(0.001, t + 0.04);
          n.connect(hp).connect(gn).connect(this._sfxBus);
          n.start(t);
          n.stop(t + 0.05);
        }
        break;
      }
      // -- Water: splash via bandpass noise --
      case TerrainType.Water: {
        const n = this._noiseSource();
        const bp = c.createBiquadFilter();
        bp.type = "bandpass";
        bp.frequency.value = 700 * pv;
        bp.Q.value = 0.8;
        const g = c.createGain();
        g.gain.setValueAtTime(0.14, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
        n.connect(bp).connect(g).connect(this._sfxBus);
        n.start(t);
        n.stop(t + 0.22);
        break;
      }
      // -- Sand: soft swish --
      case TerrainType.Sand: {
        const n = this._noiseSource();
        const lp = c.createBiquadFilter();
        lp.type = "lowpass";
        lp.frequency.value = 900;
        const g = c.createGain();
        g.gain.setValueAtTime(0.06, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
        n.connect(lp).connect(g).connect(this._sfxBus);
        n.start(t);
        n.stop(t + 0.14);
        break;
      }
    }
  }

  /** Horse gallop – four rapid low thuds */
  playHorseGallop(): void {
    if (!this._ctx || !this._canPlay("gallop")) return;
    const c = this._ctx, t = c.currentTime;
    for (let i = 0; i < 4; i++) {
      const off = i * 0.12;
      const osc = c.createOscillator();
      osc.type = "sine";
      osc.frequency.setValueAtTime(90 + i * 15, t + off);
      osc.frequency.exponentialRampToValueAtTime(40, t + off + 0.06);
      const g = c.createGain();
      g.gain.setValueAtTime(0.2 - i * 0.03, t + off);
      g.gain.exponentialRampToValueAtTime(0.001, t + off + 0.08);
      osc.connect(g).connect(this._sfxBus);
      osc.start(t + off);
      osc.stop(t + off + 0.1);
    }
  }

  /** Dodge roll whoosh – sweeping bandpass noise */
  playDodgeRoll(): void {
    if (!this._ctx || !this._canPlay("dodgeRoll")) return;
    const c = this._ctx, t = c.currentTime;
    const n = this._noiseSource();
    const bp = c.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = 500;
    bp.Q.value = 2;
    bp.frequency.linearRampToValueAtTime(1500, t + 0.15);
    bp.frequency.linearRampToValueAtTime(400, t + 0.3);
    const g = c.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.25, t + 0.05);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
    n.connect(bp).connect(g).connect(this._sfxBus);
    n.start(t);
    n.stop(t + 0.35);
  }

  // =====================================================================
  // UI SOUNDS
  // =====================================================================

  /** Menu open / close click */
  playMenuToggle(opening: boolean): void {
    if (!this._ctx || !this._canPlay("menuToggle")) return;
    const c = this._ctx, t = c.currentTime;
    const osc = c.createOscillator();
    osc.type = "sine";
    osc.frequency.setValueAtTime(opening ? 600 : 400, t);
    osc.frequency.exponentialRampToValueAtTime(opening ? 900 : 300, t + 0.06);
    const g = c.createGain();
    g.gain.setValueAtTime(0.12, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
    osc.connect(g).connect(this._sfxBus);
    osc.start(t);
    osc.stop(t + 0.12);
  }

  /** Item pickup – quick rising tone */
  playItemPickup(): void {
    if (!this._ctx || !this._canPlay("itemPickup")) return;
    const c = this._ctx, t = c.currentTime;
    const osc = c.createOscillator();
    osc.type = "sine";
    osc.frequency.setValueAtTime(500, t);
    osc.frequency.linearRampToValueAtTime(900, t + 0.08);
    const g = c.createGain();
    g.gain.setValueAtTime(0.15, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
    osc.connect(g).connect(this._sfxBus);
    osc.start(t);
    osc.stop(t + 0.18);
  }

  /** Quest complete fanfare – C major arpeggio */
  playQuestComplete(): void {
    if (!this._ctx || !this._canPlay("questComplete")) return;
    const c = this._ctx, t = c.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.5];
    for (let i = 0; i < notes.length; i++) {
      const off = i * 0.12;
      const osc = c.createOscillator();
      osc.type = "sine";
      osc.frequency.value = notes[i];
      const g = c.createGain();
      g.gain.setValueAtTime(0, t + off);
      g.gain.linearRampToValueAtTime(0.15, t + off + 0.03);
      g.gain.setValueAtTime(0.15, t + off + 0.2);
      g.gain.exponentialRampToValueAtTime(0.001, t + off + 0.6);
      osc.connect(g).connect(this._sfxBus);
      osc.start(t + off);
      osc.stop(t + off + 0.65);
    }
  }

  /** Level up chime – A major arpeggio with harmonics */
  playLevelUp(): void {
    if (!this._ctx || !this._canPlay("levelUp")) return;
    const c = this._ctx, t = c.currentTime;
    const notes = [440, 554.37, 659.25, 880];
    for (let i = 0; i < notes.length; i++) {
      const off = i * 0.1;
      for (const type of ["sine", "triangle"] as OscillatorType[]) {
        const osc = c.createOscillator();
        osc.type = type;
        osc.frequency.value = notes[i];
        const g = c.createGain();
        g.gain.setValueAtTime(0, t + off);
        g.gain.linearRampToValueAtTime(type === "sine" ? 0.15 : 0.06, t + off + 0.03);
        g.gain.exponentialRampToValueAtTime(0.001, t + off + 0.8);
        osc.connect(g).connect(this._sfxBus);
        osc.start(t + off);
        osc.stop(t + off + 0.85);
      }
    }
  }

  /** Gold received clink – two quick high pings */
  playGoldReceived(): void {
    if (!this._ctx || !this._canPlay("gold")) return;
    const c = this._ctx, t = c.currentTime;
    for (let i = 0; i < 2; i++) {
      const off = i * 0.07;
      const osc = c.createOscillator();
      osc.type = "sine";
      osc.frequency.value = 2500 + i * 400;
      const g = c.createGain();
      g.gain.setValueAtTime(0.1, t + off);
      g.gain.exponentialRampToValueAtTime(0.001, t + off + 0.12);
      osc.connect(g).connect(this._sfxBus);
      osc.start(t + off);
      osc.stop(t + off + 0.15);
    }
  }

  /** Subtle notification blip */
  playNotification(): void {
    if (!this._ctx || !this._canPlay("notif")) return;
    const c = this._ctx, t = c.currentTime;
    const osc = c.createOscillator();
    osc.type = "sine";
    osc.frequency.value = 700;
    const g = c.createGain();
    g.gain.setValueAtTime(0.06, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
    osc.connect(g).connect(this._sfxBus);
    osc.start(t);
    osc.stop(t + 0.12);
  }

  /** Death sound – descending sawtooth with low-pass */
  playDeath(): void {
    if (!this._ctx || !this._canPlay("death")) return;
    const c = this._ctx, t = c.currentTime;
    const osc = c.createOscillator();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(200, t);
    osc.frequency.exponentialRampToValueAtTime(40, t + 1.0);
    const lp = c.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 500;
    const g = c.createGain();
    g.gain.setValueAtTime(0.25, t);
    g.gain.linearRampToValueAtTime(0.15, t + 0.5);
    g.gain.exponentialRampToValueAtTime(0.001, t + 1.2);
    osc.connect(lp).connect(g).connect(this._sfxBus);
    osc.start(t);
    osc.stop(t + 1.3);
  }

  /** Region enter – subtle horn tone */
  playRegionEnter(): void {
    if (!this._ctx || !this._canPlay("regionEnter")) return;
    const c = this._ctx, t = c.currentTime;
    const osc = c.createOscillator();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(220, t);
    osc.frequency.linearRampToValueAtTime(330, t + 0.3);
    const g = c.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.1, t + 0.1);
    g.gain.setValueAtTime(0.1, t + 0.4);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.8);
    osc.connect(g).connect(this._sfxBus);
    osc.start(t);
    osc.stop(t + 0.85);
  }

  // =====================================================================
  // AMBIENT SYSTEM
  // =====================================================================

  /**
   * Called each simulation tick. Updates all ambient layers based on
   * current weather, time of day, and player position.
   */
  updateAmbient(dt: number, weather: WeatherKind, hour: number, playerPos: Vec3): void {
    if (!this._ctx) return;
    this.resume();
    const wasDay = this._isDay;
    this._isDay = hour >= 6 && hour < 20;

    if (!this._ambientStarted) {
      this._startAmbientLayers();
      this._ambientStarted = true;
    }

    this._updateWind(weather);
    this._updateRain(weather);
    this._updateThunder(dt, weather);
    this._updateDayNight(hour);
    this._updateFire(playerPos);

    // Trigger wolf howl when night begins
    if (wasDay && !this._isDay) {
      this._scheduleWolfHowl();
    }
  }

  // -------------------------------------------------------------------
  // Ambient layer creation
  // -------------------------------------------------------------------

  private _startAmbientLayers(): void {
    if (!this._ctx) return;
    const c = this._ctx;

    // -- Wind (always present, intensity varies with weather) --
    this._windGain = c.createGain();
    this._windGain.gain.value = 0.02;
    this._windFilter = c.createBiquadFilter();
    this._windFilter.type = "bandpass";
    this._windFilter.frequency.value = 300;
    this._windFilter.Q.value = 0.5;
    this._windNoise = this._noiseSource();
    this._windNoise.connect(this._windFilter).connect(this._windGain).connect(this._ambientBus);
    this._windNoise.start();

    // -- Rain (off by default, fades in with rain/storm weather) --
    this._rainGain = c.createGain();
    this._rainGain.gain.value = 0;
    this._rainFilter = c.createBiquadFilter();
    this._rainFilter.type = "lowpass";
    this._rainFilter.frequency.value = 6000;
    this._rainNoise = this._noiseSource();
    this._rainNoise.connect(this._rainFilter).connect(this._rainGain).connect(this._ambientBus);
    this._rainNoise.start();

    // -- Birds (daytime) – AM-modulated sine for chirp rhythm --
    this._dayAmbientGain = c.createGain();
    this._dayAmbientGain.gain.value = 0;
    this._dayOsc = c.createOscillator();
    this._dayOsc.type = "sine";
    this._dayOsc.frequency.value = 3200;
    const birdMod = c.createOscillator();
    birdMod.type = "square";
    birdMod.frequency.value = 4; // chirps per second
    const birdModGain = c.createGain();
    birdModGain.gain.value = 0.015;
    birdMod.connect(birdModGain);
    birdModGain.connect(this._dayAmbientGain.gain);
    this._dayOsc.connect(this._dayAmbientGain).connect(this._ambientBus);
    this._dayOsc.start();
    birdMod.start();

    // -- Crickets (nighttime) – rapidly pulsed high sine --
    this._nightAmbientGain = c.createGain();
    this._nightAmbientGain.gain.value = 0;
    this._nightOsc = c.createOscillator();
    this._nightOsc.type = "sine";
    this._nightOsc.frequency.value = 4800;
    this._cricketOsc = c.createOscillator();
    this._cricketOsc.type = "square";
    this._cricketOsc.frequency.value = 12;
    const cricketMod = c.createGain();
    cricketMod.gain.value = 0.012;
    this._cricketOsc.connect(cricketMod);
    cricketMod.connect(this._nightAmbientGain.gain);
    this._nightOsc.connect(this._nightAmbientGain).connect(this._ambientBus);
    this._nightOsc.start();
    this._cricketOsc.start();

    // -- Fire crackle (near torches / Camelot center) --
    this._fireGain = c.createGain();
    this._fireGain.gain.value = 0;
    const fireBP = c.createBiquadFilter();
    fireBP.type = "bandpass";
    fireBP.frequency.value = 1000;
    fireBP.Q.value = 2;
    this._fireNoise = this._noiseSource();
    const crackleModOsc = c.createOscillator();
    crackleModOsc.type = "sawtooth";
    crackleModOsc.frequency.value = 15;
    const crackleMod = c.createGain();
    crackleMod.gain.value = 0.5;
    crackleModOsc.connect(crackleMod).connect(this._fireGain.gain);
    this._fireNoise.connect(fireBP).connect(this._fireGain).connect(this._ambientBus);
    this._fireNoise.start();
    crackleModOsc.start();
  }

  // -------------------------------------------------------------------
  // Ambient layer updates
  // -------------------------------------------------------------------

  private _updateWind(weather: WeatherKind): void {
    if (!this._windGain || !this._windFilter || !this._ctx) return;
    const t = this._ctx.currentTime;
    let vol = 0.02;
    let freq = 300;
    switch (weather) {
      case "storm":   vol = 0.12; freq = 200; break;
      case "rain":    vol = 0.06; freq = 250; break;
      case "snow":    vol = 0.04; freq = 350; break;
      case "fog":     vol = 0.015; freq = 280; break;
      case "overcast": vol = 0.035; freq = 320; break;
      default:        vol = 0.02; freq = 300;
    }
    this._windGain.gain.setTargetAtTime(vol, t, 1.0);
    this._windFilter.frequency.setTargetAtTime(freq, t, 1.0);
  }

  private _updateRain(weather: WeatherKind): void {
    if (!this._rainGain || !this._ctx) return;
    const vol = weather === "storm" ? 0.14 : weather === "rain" ? 0.08 : 0;
    this._rainGain.gain.setTargetAtTime(vol, this._ctx.currentTime, 0.8);
  }

  private _updateThunder(dt: number, weather: WeatherKind): void {
    if (weather !== "storm") {
      this._thunderTimer = 0;
      return;
    }
    this._thunderTimer += dt;
    const interval = 8 + Math.random() * 12;
    if (this._thunderTimer >= interval) {
      this._thunderTimer = 0;
      this._playThunder();
    }
  }

  private _playThunder(): void {
    if (!this._ctx) return;
    const c = this._ctx, t = c.currentTime;
    const delay = Math.random() * 0.5;
    // Low rumble
    const osc = c.createOscillator();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(60, t + delay);
    osc.frequency.exponentialRampToValueAtTime(25, t + delay + 1.5);
    const lp = c.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 200;
    const g = c.createGain();
    g.gain.setValueAtTime(0, t + delay);
    g.gain.linearRampToValueAtTime(0.3, t + delay + 0.05);
    g.gain.setValueAtTime(0.3, t + delay + 0.15);
    g.gain.exponentialRampToValueAtTime(0.001, t + delay + 2.0);
    osc.connect(lp).connect(g).connect(this._ambientBus);
    osc.start(t + delay);
    osc.stop(t + delay + 2.2);
    // Crackle burst
    const n = this._noiseSource();
    const hp = c.createBiquadFilter();
    hp.type = "highpass";
    hp.frequency.value = 1500;
    const gn = c.createGain();
    gn.gain.setValueAtTime(0, t + delay);
    gn.gain.linearRampToValueAtTime(0.15, t + delay + 0.02);
    gn.gain.exponentialRampToValueAtTime(0.001, t + delay + 0.3);
    n.connect(hp).connect(gn).connect(this._ambientBus);
    n.start(t + delay);
    n.stop(t + delay + 0.35);
  }

  private _updateDayNight(hour: number): void {
    if (!this._dayAmbientGain || !this._nightAmbientGain || !this._ctx) return;
    const t = this._ctx.currentTime;

    // Birds: fade in at dawn, fade out at dusk
    let dayVol = 0;
    if (hour >= 6 && hour < 8) dayVol = (hour - 6) / 2 * 0.03;
    else if (hour >= 8 && hour < 17) dayVol = 0.03;
    else if (hour >= 17 && hour < 20) dayVol = (20 - hour) / 3 * 0.03;
    this._dayAmbientGain.gain.setTargetAtTime(dayVol, t, 2.0);

    // Crickets: fade in at dusk, fade out at dawn
    let nightVol = 0;
    if (hour >= 20 || hour < 4) nightVol = 0.02;
    else if (hour >= 4 && hour < 6) nightVol = (6 - hour) / 2 * 0.02;
    else if (hour >= 18 && hour < 20) nightVol = (hour - 18) / 2 * 0.02;
    this._nightAmbientGain.gain.setTargetAtTime(nightVol, t, 2.0);
  }

  private _updateFire(playerPos: Vec3): void {
    if (!this._fireGain || !this._ctx) return;
    // Fire crackle audible near center of Camelot (0,0,0)
    const dist = Math.sqrt(playerPos.x * playerPos.x + playerPos.z * playerPos.z);
    const vol = dist < 15 ? 0.04 * (1 - dist / 15) : 0;
    this._fireGain.gain.setTargetAtTime(vol, this._ctx.currentTime, 0.5);
  }

  // -------------------------------------------------------------------
  // Wolf howl (one-shot at nightfall in wilderness)
  // -------------------------------------------------------------------

  private _scheduleWolfHowl(): void {
    const delay = 2 + Math.random() * 6;
    setTimeout(() => this._playWolfHowl(), delay * 1000);
  }

  private _playWolfHowl(): void {
    if (!this._ctx) return;
    const c = this._ctx, t = c.currentTime;
    const osc = c.createOscillator();
    osc.type = "sine";
    // Rising howl
    osc.frequency.setValueAtTime(250, t);
    osc.frequency.linearRampToValueAtTime(500, t + 0.6);
    osc.frequency.linearRampToValueAtTime(480, t + 1.5);
    osc.frequency.linearRampToValueAtTime(300, t + 2.2);
    // Vibrato
    const vibrato = c.createOscillator();
    vibrato.type = "sine";
    vibrato.frequency.value = 5;
    const vGain = c.createGain();
    vGain.gain.value = 8;
    vibrato.connect(vGain).connect(osc.frequency);
    vibrato.start(t);
    vibrato.stop(t + 2.5);
    // Envelope
    const g = c.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.08, t + 0.3);
    g.gain.setValueAtTime(0.08, t + 1.5);
    g.gain.exponentialRampToValueAtTime(0.001, t + 2.3);
    osc.connect(g).connect(this._ambientBus);
    osc.start(t);
    osc.stop(t + 2.5);
  }

  // -------------------------------------------------------------------
  // Cleanup
  // -------------------------------------------------------------------

  private _stopAllAmbient(): void {
    const stop = (n: AudioBufferSourceNode | OscillatorNode | null) => {
      try { n?.stop(); } catch { /* already stopped */ }
    };
    stop(this._windNoise);
    stop(this._rainNoise);
    stop(this._dayOsc);
    stop(this._nightOsc);
    stop(this._cricketOsc);
    stop(this._fireNoise);
    this._windNoise = null;
    this._rainNoise = null;
    this._dayOsc = null;
    this._nightOsc = null;
    this._cricketOsc = null;
    this._fireNoise = null;
  }
}

// ---------------------------------------------------------------------------
// Singleton export
// ---------------------------------------------------------------------------

export const rpgAudio = new ArthurianAudioManager();
