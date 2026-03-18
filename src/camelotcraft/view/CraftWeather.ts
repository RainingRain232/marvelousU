import * as THREE from "three";

export enum WeatherType {
  CLEAR = "clear",
  RAIN = "rain",
  SNOW = "snow",
  STORM = "storm",
}

interface LightningState {
  active: boolean;
  timer: number;
  nextStrike: number;
  flashRemaining: number;
  thunderPending: boolean;
  thunderDelay: number;
}

const RAIN_COUNT = 600;
const SNOW_COUNT = 400;
const STORM_RAIN_COUNT = 800;
const RAIN_AREA = 40;
const SNOW_AREA = 60;
const RAIN_HEIGHT = 30;
const SNOW_HEIGHT = 25;
const TRANSITION_DURATION = 2.0;

const WEATHER_WEIGHTS: [WeatherType, number][] = [
  [WeatherType.CLEAR, 0.50],
  [WeatherType.RAIN, 0.25],
  [WeatherType.SNOW, 0.15],
  [WeatherType.STORM, 0.10],
];

const FOG_MULTIPLIERS: Record<WeatherType, number> = {
  [WeatherType.CLEAR]: 1.0,
  [WeatherType.RAIN]: 1.5,
  [WeatherType.SNOW]: 1.2,
  [WeatherType.STORM]: 2.5,
};

const AMBIENT_DIMMING: Record<WeatherType, number> = {
  [WeatherType.CLEAR]: 1.0,
  [WeatherType.RAIN]: 0.7,
  [WeatherType.SNOW]: 0.85,
  [WeatherType.STORM]: 0.4,
};

export class CraftWeather {
  public readonly group: THREE.Group;

  private currentWeather: WeatherType = WeatherType.CLEAR;
  private targetWeather: WeatherType = WeatherType.CLEAR;
  private transitionProgress: number = 1.0; // 1.0 = fully transitioned
  private transitionTimer: number = 0;

  // Rain system
  private rainGeometry!: THREE.BufferGeometry;
  private rainMaterial!: THREE.LineBasicMaterial;
  private rainPositions!: Float32Array;
  private rainVelocities!: Float32Array;

  // Storm rain (separate, denser set)
  private stormGeometry!: THREE.BufferGeometry;
  private stormMaterial!: THREE.LineBasicMaterial;
  private stormPositions!: Float32Array;
  private stormVelocities!: Float32Array;

  // Snow system
  private snowGeometry!: THREE.BufferGeometry;
  private snowMaterial!: THREE.PointsMaterial;
  private snowPositions!: Float32Array;
  private snowDriftPhases!: Float32Array;

  // Lightning
  private lightningLight!: THREE.DirectionalLight;
  private lightning: LightningState = {
    active: false,
    timer: 0,
    nextStrike: this.randomRange(5, 15),
    flashRemaining: 0,
    thunderPending: false,
    thunderDelay: 0,
  };

  // Splash particles
  private splashGeometry!: THREE.BufferGeometry;
  private splashMaterial!: THREE.PointsMaterial;
  private splashPositions!: Float32Array;
  private splashLifetimes!: Float32Array;
  private splashIndex: number = 0;
  private static readonly SPLASH_COUNT = 50;

  // Audio
  private audioCtx: AudioContext | null = null;

  // Wind
  private windAngle: number = 0.3; // slight diagonal

  // Auto-change timer
  private weatherChangeTimer: number = this.randomRange(180, 480);

  constructor() {
    this.group = new THREE.Group();
    this.group.name = "CraftWeather";
  }

  /** Initialize all geometry and add particle systems to the group. */
  public build(): void {
    this.buildRain(RAIN_COUNT, false);
    this.buildRain(STORM_RAIN_COUNT, true);
    this.buildSnow();
    this.buildSplashes();
    this.buildLightning();
    this.applyVisibility();
  }

  /** Transition to a new weather type over ~2 seconds. */
  public setWeather(type: WeatherType): void {
    if (type === this.targetWeather) return;
    this.targetWeather = type;
    this.transitionProgress = 0;
    this.transitionTimer = 0;
  }

  /** Returns the current (or transitioning-to) weather type. */
  public getCurrentWeather(): WeatherType {
    return this.transitionProgress >= 1.0
      ? this.currentWeather
      : this.targetWeather;
  }

  /** Fog multiplier for the renderer. */
  public getWeatherFogMultiplier(): number {
    if (this.transitionProgress >= 1.0) {
      return FOG_MULTIPLIERS[this.currentWeather];
    }
    const from = FOG_MULTIPLIERS[this.currentWeather];
    const to = FOG_MULTIPLIERS[this.targetWeather];
    return THREE.MathUtils.lerp(from, to, this.transitionProgress);
  }

  /** Ambient light dimming factor. */
  public getAmbientDimming(): number {
    if (this.transitionProgress >= 1.0) {
      return AMBIENT_DIMMING[this.currentWeather];
    }
    const from = AMBIENT_DIMMING[this.currentWeather];
    const to = AMBIENT_DIMMING[this.targetWeather];
    return THREE.MathUtils.lerp(from, to, this.transitionProgress);
  }

  /** Main update loop. Call every frame. */
  public update(
    dt: number,
    playerPos: THREE.Vector3,
    _timeOfDay: number,
  ): void {
    this.updateTransition(dt);
    this.updateAutoChange(dt);

    const effective = this.transitionProgress >= 1.0
      ? this.currentWeather
      : this.targetWeather;

    if (
      effective === WeatherType.RAIN ||
      effective === WeatherType.STORM
    ) {
      this.updateRainParticles(
        dt,
        playerPos,
        this.rainPositions,
        this.rainVelocities,
        this.rainGeometry,
        RAIN_COUNT,
        RAIN_AREA,
        15,
      );
    }

    if (effective === WeatherType.STORM) {
      this.updateRainParticles(
        dt,
        playerPos,
        this.stormPositions,
        this.stormVelocities,
        this.stormGeometry,
        STORM_RAIN_COUNT,
        RAIN_AREA,
        20,
      );
      this.updateLightning(dt);
    } else {
      if (this.lightningLight.intensity > 0) {
        this.lightningLight.intensity = 0;
      }
    }

    if (effective === WeatherType.SNOW) {
      this.updateSnowParticles(dt, playerPos);
    }

    // Update rain splashes (decays even after rain stops)
    this.updateSplashes(dt);
  }

  /** Dispose of all GPU resources. */
  public destroy(): void {
    this.rainGeometry.dispose();
    this.rainMaterial.dispose();
    this.stormGeometry.dispose();
    this.stormMaterial.dispose();
    this.snowGeometry.dispose();
    this.snowMaterial.dispose();
    this.splashGeometry.dispose();
    this.splashMaterial.dispose();

    this.group.clear();

    if (this.audioCtx) {
      this.audioCtx.close().catch(() => {});
      this.audioCtx = null;
    }
  }

  // ─── Private: Build ────────────────────────────────────────────────

  private buildRain(count: number, isStorm: boolean): void {
    // Each line segment needs 2 vertices (start, end) = 6 floats per drop
    const vertexCount = count * 2;
    const positions = new Float32Array(vertexCount * 3);
    const velocities = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      const x = (Math.random() - 0.5) * RAIN_AREA;
      const y = Math.random() * RAIN_HEIGHT;
      const z = (Math.random() - 0.5) * RAIN_AREA;
      const dropLen = 0.4 + Math.random() * 0.3;

      // Top vertex
      const vi = i * 6;
      positions[vi] = x;
      positions[vi + 1] = y;
      positions[vi + 2] = z;
      // Bottom vertex
      positions[vi + 3] = x + this.windAngle * dropLen;
      positions[vi + 4] = y - dropLen;
      positions[vi + 5] = z;

      velocities[i] = 0.9 + Math.random() * 0.2; // speed multiplier
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute(
      "position",
      new THREE.BufferAttribute(positions, 3),
    );

    const material = new THREE.LineBasicMaterial({
      color: isStorm ? 0x8899cc : 0x99aadd,
      transparent: true,
      opacity: 0,
      depthWrite: false,
    });

    const lines = new THREE.LineSegments(geometry, material);
    lines.frustumCulled = false;

    if (isStorm) {
      this.stormGeometry = geometry;
      this.stormMaterial = material;
      // lines stored in group
      this.stormPositions = positions;
      this.stormVelocities = velocities;
    } else {
      this.rainGeometry = geometry;
      this.rainMaterial = material;
      // lines stored in group
      this.rainPositions = positions;
      this.rainVelocities = velocities;
    }

    this.group.add(lines);
  }

  private buildSnow(): void {
    const positions = new Float32Array(SNOW_COUNT * 3);
    const driftPhases = new Float32Array(SNOW_COUNT);

    for (let i = 0; i < SNOW_COUNT; i++) {
      const i3 = i * 3;
      positions[i3] = (Math.random() - 0.5) * SNOW_AREA;
      positions[i3 + 1] = Math.random() * SNOW_HEIGHT;
      positions[i3 + 2] = (Math.random() - 0.5) * SNOW_AREA;
      driftPhases[i] = Math.random() * Math.PI * 2;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute(
      "position",
      new THREE.BufferAttribute(positions, 3),
    );

    const material = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.15,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      sizeAttenuation: true,
    });

    const points = new THREE.Points(geometry, material);
    points.frustumCulled = false;

    this.snowGeometry = geometry;
    this.snowMaterial = material;
    // points stored in group
    this.snowPositions = positions;
    this.snowDriftPhases = driftPhases;

    this.group.add(points);
  }

  private buildSplashes(): void {
    const count = CraftWeather.SPLASH_COUNT;
    const positions = new Float32Array(count * 3);
    const lifetimes = new Float32Array(count);

    // Initialize all splashes offscreen / inactive
    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      positions[i3] = 0;
      positions[i3 + 1] = -999; // hidden below ground
      positions[i3 + 2] = 0;
      lifetimes[i] = 0;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute(
      "position",
      new THREE.BufferAttribute(positions, 3),
    );

    const material = new THREE.PointsMaterial({
      color: 0xccddee,
      size: 0.2,
      transparent: true,
      opacity: 0.6,
      depthWrite: false,
      sizeAttenuation: true,
    });

    const points = new THREE.Points(geometry, material);
    points.frustumCulled = false;

    this.splashGeometry = geometry;
    this.splashMaterial = material;
    this.splashPositions = positions;
    this.splashLifetimes = lifetimes;

    this.group.add(points);
  }

  private buildLightning(): void {
    this.lightningLight = new THREE.DirectionalLight(0xccccff, 0);
    this.lightningLight.position.set(50, 80, 30);
    this.group.add(this.lightningLight);
  }

  // ─── Private: Update ───────────────────────────────────────────────

  private updateTransition(dt: number): void {
    if (this.transitionProgress >= 1.0) return;

    this.transitionTimer += dt;
    this.transitionProgress = Math.min(
      this.transitionTimer / TRANSITION_DURATION,
      1.0,
    );

    if (this.transitionProgress >= 1.0) {
      this.currentWeather = this.targetWeather;
    }

    this.applyVisibility();
  }

  private applyVisibility(): void {
    const target = this.transitionProgress >= 1.0
      ? this.currentWeather
      : this.targetWeather;
    const t = this.transitionProgress;

    // Rain opacity
    const wantsRain =
      target === WeatherType.RAIN || target === WeatherType.STORM;
    const rainTarget = wantsRain ? 0.4 : 0;
    this.rainMaterial.opacity = THREE.MathUtils.lerp(
      wantsRain ? 0 : this.rainMaterial.opacity,
      rainTarget,
      t,
    );

    // Storm extra rain
    const stormTarget = target === WeatherType.STORM ? 0.35 : 0;
    this.stormMaterial.opacity = THREE.MathUtils.lerp(
      target === WeatherType.STORM ? 0 : this.stormMaterial.opacity,
      stormTarget,
      t,
    );

    // Snow opacity
    const snowTarget = target === WeatherType.SNOW ? 0.8 : 0;
    this.snowMaterial.opacity = THREE.MathUtils.lerp(
      target === WeatherType.SNOW ? 0 : this.snowMaterial.opacity,
      snowTarget,
      t,
    );
  }

  private updateRainParticles(
    dt: number,
    playerPos: THREE.Vector3,
    positions: Float32Array,
    velocities: Float32Array,
    geometry: THREE.BufferGeometry,
    count: number,
    area: number,
    speed: number,
  ): void {
    const halfArea = area / 2;

    for (let i = 0; i < count; i++) {
      const vi = i * 6;
      const fall = speed * velocities[i] * dt;
      const windDrift = this.windAngle * fall;

      // Move both vertices of the line segment
      positions[vi] += windDrift * 0.3;
      positions[vi + 1] -= fall;
      positions[vi + 3] += windDrift * 0.3;
      positions[vi + 4] -= fall;

      // Reset when below ground
      if (positions[vi + 1] < -1) {
        // Emit splash at impact position
        this.emitSplash(positions[vi], 0.05, positions[vi + 2]);

        const x =
          playerPos.x + (Math.random() - 0.5) * area;
        const z =
          playerPos.z + (Math.random() - 0.5) * area;
        const y = RAIN_HEIGHT + Math.random() * 5;
        const dropLen = 0.4 + Math.random() * 0.3;

        positions[vi] = x;
        positions[vi + 1] = y;
        positions[vi + 2] = z;
        positions[vi + 3] = x + this.windAngle * dropLen;
        positions[vi + 4] = y - dropLen;
        positions[vi + 5] = z;
      }

      // Keep particles roughly centered on player (wrap around)
      for (const offset of [vi, vi + 3]) {
        const dx = positions[offset] - playerPos.x;
        if (dx > halfArea) positions[offset] -= area;
        else if (dx < -halfArea) positions[offset] += area;
      }
      for (const offset of [vi + 2, vi + 5]) {
        const dz = positions[offset] - playerPos.z;
        if (dz > halfArea) positions[offset] -= area;
        else if (dz < -halfArea) positions[offset] += area;
      }
    }

    const attr = geometry.getAttribute("position") as THREE.BufferAttribute;
    attr.needsUpdate = true;
  }

  private updateSnowParticles(dt: number, playerPos: THREE.Vector3): void {
    const halfArea = SNOW_AREA / 2;
    const time = performance.now() * 0.001;

    for (let i = 0; i < SNOW_COUNT; i++) {
      const i3 = i * 3;
      const phase = this.snowDriftPhases[i];

      // Gentle fall + sine drift
      this.snowPositions[i3] +=
        Math.sin(time * 0.5 + phase) * 0.3 * dt;
      this.snowPositions[i3 + 1] -= 1.5 * dt;
      this.snowPositions[i3 + 2] +=
        Math.cos(time * 0.4 + phase * 1.3) * 0.2 * dt;

      // Reset above when fallen below ground
      if (this.snowPositions[i3 + 1] < -1) {
        this.snowPositions[i3] =
          playerPos.x + (Math.random() - 0.5) * SNOW_AREA;
        this.snowPositions[i3 + 1] =
          SNOW_HEIGHT + Math.random() * 3;
        this.snowPositions[i3 + 2] =
          playerPos.z + (Math.random() - 0.5) * SNOW_AREA;
      }

      // Wrap around player
      const dx = this.snowPositions[i3] - playerPos.x;
      if (dx > halfArea) this.snowPositions[i3] -= SNOW_AREA;
      else if (dx < -halfArea) this.snowPositions[i3] += SNOW_AREA;

      const dz = this.snowPositions[i3 + 2] - playerPos.z;
      if (dz > halfArea) this.snowPositions[i3 + 2] -= SNOW_AREA;
      else if (dz < -halfArea) this.snowPositions[i3 + 2] += SNOW_AREA;
    }

    const attr = this.snowGeometry.getAttribute(
      "position",
    ) as THREE.BufferAttribute;
    attr.needsUpdate = true;
  }

  private updateLightning(dt: number): void {
    const ls = this.lightning;

    // Flash decay
    if (ls.flashRemaining > 0) {
      ls.flashRemaining -= dt;
      if (ls.flashRemaining <= 0) {
        this.lightningLight.intensity = 0;
        ls.flashRemaining = 0;
      }
    }

    // Thunder after delay
    if (ls.thunderPending) {
      ls.thunderDelay -= dt;
      if (ls.thunderDelay <= 0) {
        ls.thunderPending = false;
        this.playThunder();
      }
    }

    // Countdown to next strike
    ls.timer += dt;
    if (ls.timer >= ls.nextStrike) {
      ls.timer = 0;
      ls.nextStrike = this.randomRange(5, 15);
      ls.flashRemaining = 0.1;
      ls.thunderPending = true;
      ls.thunderDelay = this.randomRange(0.5, 2.0);

      this.lightningLight.intensity = 3;
      // Randomize direction slightly
      this.lightningLight.position.set(
        this.randomRange(-40, 40),
        80,
        this.randomRange(-40, 40),
      );
    }
  }

  private updateAutoChange(dt: number): void {
    this.weatherChangeTimer -= dt;
    if (this.weatherChangeTimer <= 0) {
      this.weatherChangeTimer = this.randomRange(180, 480);
      const next = this.pickRandomWeather();
      this.setWeather(next);
    }
  }

  // ─── Splash helpers ──────────────────────────────────────────────

  private emitSplash(x: number, y: number, z: number): void {
    const idx = this.splashIndex;
    const i3 = idx * 3;
    this.splashPositions[i3] = x + (Math.random() - 0.5) * 0.3;
    this.splashPositions[i3 + 1] = y;
    this.splashPositions[i3 + 2] = z + (Math.random() - 0.5) * 0.3;
    this.splashLifetimes[idx] = 0.15 + Math.random() * 0.1; // short-lived
    this.splashIndex = (this.splashIndex + 1) % CraftWeather.SPLASH_COUNT;
  }

  private updateSplashes(dt: number): void {
    let anyActive = false;
    for (let i = 0; i < CraftWeather.SPLASH_COUNT; i++) {
      if (this.splashLifetimes[i] > 0) {
        this.splashLifetimes[i] -= dt;
        if (this.splashLifetimes[i] <= 0) {
          // Hide expired splash
          this.splashPositions[i * 3 + 1] = -999;
        } else {
          // Move splash slightly upward to simulate bounce
          this.splashPositions[i * 3 + 1] += 1.5 * dt;
          anyActive = true;
        }
      }
    }
    if (anyActive) {
      const attr = this.splashGeometry.getAttribute(
        "position",
      ) as THREE.BufferAttribute;
      attr.needsUpdate = true;
    }
  }

  // ─── Public: Wetness ──────────────────────────────────────────────

  /** Returns 0-1 wetness factor based on current weather (for terrain wet darkening). */
  public getWetness(): number {
    const effective = this.transitionProgress >= 1.0
      ? this.currentWeather
      : this.targetWeather;

    let targetWetness: number;
    switch (effective) {
      case WeatherType.RAIN:
        targetWetness = 0.3;
        break;
      case WeatherType.STORM:
        targetWetness = 0.5;
        break;
      default:
        targetWetness = 0;
        break;
    }

    // Smooth based on transition progress
    if (this.transitionProgress < 1.0) {
      const fromWetness =
        this.currentWeather === WeatherType.RAIN ? 0.3 :
        this.currentWeather === WeatherType.STORM ? 0.5 : 0;
      return THREE.MathUtils.lerp(fromWetness, targetWetness, this.transitionProgress);
    }
    return targetWetness;
  }

  // ─── Private: Audio ────────────────────────────────────────────────

  private playThunder(): void {
    try {
      if (!this.audioCtx) {
        this.audioCtx = new AudioContext();
      }
      const ctx = this.audioCtx;
      const duration = 1.5;
      const sampleRate = ctx.sampleRate;
      const length = Math.floor(sampleRate * duration);
      const buffer = ctx.createBuffer(1, length, sampleRate);
      const data = buffer.getChannelData(0);

      // Low rumble: filtered noise with exponential decay
      for (let i = 0; i < length; i++) {
        const t = i / sampleRate;
        const envelope = Math.exp(-t * 2.5) * (1 + 0.3 * Math.sin(t * 20));
        data[i] = (Math.random() * 2 - 1) * envelope * 0.4;
      }

      // Simple low-pass by averaging neighbors
      for (let pass = 0; pass < 3; pass++) {
        for (let i = 1; i < length - 1; i++) {
          data[i] = (data[i - 1] + data[i] + data[i + 1]) / 3;
        }
      }

      const source = ctx.createBufferSource();
      source.buffer = buffer;
      const gain = ctx.createGain();
      gain.gain.value = 0.6;
      source.connect(gain);
      gain.connect(ctx.destination);
      source.start();
    } catch {
      // Audio may not be available in all environments
    }
  }

  // ─── Private: Helpers ──────────────────────────────────────────────

  private pickRandomWeather(): WeatherType {
    const roll = Math.random();
    let cumulative = 0;
    for (const [type, weight] of WEATHER_WEIGHTS) {
      cumulative += weight;
      if (roll < cumulative) return type;
    }
    return WeatherType.CLEAR;
  }

  private randomRange(min: number, max: number): number {
    return min + Math.random() * (max - min);
  }
}
