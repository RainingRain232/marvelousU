// ============================================================================
// ArthurianRPGMovement.ts – Player movement: walk, sprint, jump, swim, ride
// ============================================================================

import { TerrainType } from "./ArthurianRPGConfig";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const WALK_SPEED = 5.0;
const SPRINT_SPEED = 9.0;
const CROUCH_SPEED = 2.5;
const HORSE_WALK_SPEED = 10.0;
const HORSE_SPRINT_SPEED = 18.0;
const SWIM_SPEED = 3.0;

const ACCELERATION = 25.0;
const DECELERATION = 18.0;
const AIR_CONTROL = 0.3; // fraction of ground acceleration while airborne

const JUMP_VELOCITY = 7.0;
const GRAVITY = -20.0;
const TERMINAL_VELOCITY = -40.0;

const SPRINT_STAMINA_COST = 10; // per second
const DODGE_ROLL_SPEED = 12.0;
const DODGE_ROLL_DURATION = 0.35;

const SLOPE_WALK_LIMIT = 0.7; // cos(angle) – above this is walkable
const SLOPE_SLIDE_LIMIT = 0.5; // below this the player slides
const SLIDE_FORCE = 15.0;

const HORSE_MOUNT_DISTANCE = 3.0;
const COMPANION_TELEPORT_DISTANCE = 30.0;

const SWIM_SURFACE_Y = 0.0; // Y level of water surface (simplification)

const STEALTH_DETECTION_MULTIPLIER = 0.4; // detection range multiplied by this

// ---------------------------------------------------------------------------
// Input state (fed from the input handler each frame)
// ---------------------------------------------------------------------------

export interface MovementInput {
  forward: number; // -1..1  (W/S)
  right: number;   // -1..1  (A/D)
  jump: boolean;
  sprint: boolean;
  crouch: boolean;
  dodgeRoll: boolean;
  mount: boolean;  // toggle mount/dismount
}

// ---------------------------------------------------------------------------
// Internal velocity / physics state
// ---------------------------------------------------------------------------

interface PhysicsBody {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
}

// ---------------------------------------------------------------------------
// Terrain query helpers (stubs – to be backed by real world data)
// ---------------------------------------------------------------------------

export interface TerrainProvider {
  /** Return height at world (x,z). */
  getHeight(x: number, z: number): number;
  /** Return surface normal (for slope). */
  getNormal(x: number, z: number): { nx: number; ny: number; nz: number };
  /** Return terrain type at position. */
  getTerrainType(x: number, z: number): TerrainType;
  /** Return true if the AABB from (x-r,z-r) to (x+r,z+r) is blocked. */
  isBlocked(x: number, z: number, radius: number): boolean;
}

// ---------------------------------------------------------------------------
// HeightmapTerrainProvider – wires the 3D renderer's terrain to this interface
// ---------------------------------------------------------------------------

/** Small epsilon for finite-difference normal computation. */
const NORMAL_EPSILON = 0.5;

/** Maximum walkable slope expressed as cos(angle). Steeper = blocked. */
const BLOCKED_SLOPE_LIMIT = 0.45;

/**
 * Concrete TerrainProvider backed by the renderer's heightmap.
 *
 * Constructor takes three callbacks so this module stays decoupled from
 * ArthurianRPGRenderer (the game orchestrator wires them together).
 *
 *  - `heightFn`    – renderer.getTerrainHeight(x, z)
 *  - `terrainSize` – renderer.getTerrainSize()          (side length)
 *  - `waterLevel`  – renderer.getWaterLevel()
 */
export class HeightmapTerrainProvider implements TerrainProvider {
  constructor(
    private readonly heightFn: (x: number, z: number) => number,
    private readonly terrainSize: number,
    private readonly waterLevel: number,
  ) {}

  // ---- TerrainProvider implementation -----------------------------------

  getHeight(x: number, z: number): number {
    return this.heightFn(x, z);
  }

  getNormal(x: number, z: number): { nx: number; ny: number; nz: number } {
    // Central-difference approximation of the surface normal.
    const e = NORMAL_EPSILON;
    const hL = this.heightFn(x - e, z);
    const hR = this.heightFn(x + e, z);
    const hD = this.heightFn(x, z - e);
    const hU = this.heightFn(x, z + e);

    // Tangent vectors along X and Z, then cross product.
    // T_x = (2e, hR - hL, 0),  T_z = (0, hU - hD, 2e)
    // N = T_z x T_x = (-(hR-hL)*2e, (2e)*(2e), -(hU-hD)*2e)
    // Simplified (factor out 2e):
    let nx = -(hR - hL);
    let ny = 2 * e;
    let nz = -(hU - hD);

    const len = Math.sqrt(nx * nx + ny * ny + nz * nz);
    if (len > 0) { nx /= len; ny /= len; nz /= len; }
    return { nx, ny, nz };
  }

  getTerrainType(x: number, z: number): TerrainType {
    const h = this.heightFn(x, z);

    // Under / at water level -> Water
    if (h <= this.waterLevel + 0.5) return TerrainType.Water;

    // Beach / sand band just above water
    if (h < 3.5) return TerrainType.Sand;

    // Low grassy areas
    if (h < 6) return TerrainType.Grass;

    // Forest / dirt band
    if (h < 9) return TerrainType.Dirt;

    // Rocky highlands
    if (h < 14) return TerrainType.Stone;

    // Mountain snow caps
    return TerrainType.Snow;
  }

  isBlocked(x: number, z: number, _radius?: number): boolean {
    const halfSize = this.terrainSize / 2;

    // Out of terrain bounds
    if (x < -halfSize || x > halfSize || z < -halfSize || z > halfSize) {
      return true;
    }

    // Steep slope check
    const normal = this.getNormal(x, z);
    if (normal.ny < BLOCKED_SLOPE_LIMIT) {
      return true;
    }

    return false;
  }
}

// ---------------------------------------------------------------------------
// Horse state
// ---------------------------------------------------------------------------

export interface HorseState {
  available: boolean;
  position: { x: number; y: number; z: number };
  isMounted: boolean;
}

// ---------------------------------------------------------------------------
// Main movement system
// ---------------------------------------------------------------------------

export class ArthurianRPGMovementSystem {
  private body: PhysicsBody = { x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0 };
  private onGround = true;
  private isSwimming = false;
  private isCrouching = false;
  private isSprinting = false;
  private isDodgeRolling = false;
  private dodgeTimer = 0;
  private dodgeDirX = 0;
  private dodgeDirZ = 0;
  private yaw = 0; // camera yaw in radians

  private horse: HorseState = { available: false, position: { x: 0, y: 0, z: 0 }, isMounted: false };
  private playerRadius = 0.4;

  constructor(private terrain: TerrainProvider) {}

  // -----------------------------------------------------------------------
  // Setters
  // -----------------------------------------------------------------------

  setPosition(x: number, y: number, z: number): void {
    this.body.x = x;
    this.body.y = y;
    this.body.z = z;
  }

  setYaw(yaw: number): void {
    this.yaw = yaw;
  }

  setHorse(h: HorseState): void {
    this.horse = h;
  }

  // -----------------------------------------------------------------------
  // Getters
  // -----------------------------------------------------------------------

  getPosition(): { x: number; y: number; z: number } {
    return { x: this.body.x, y: this.body.y, z: this.body.z };
  }

  getVelocity(): { x: number; y: number; z: number } {
    return { x: this.body.vx, y: this.body.vy, z: this.body.vz };
  }

  getIsCrouching(): boolean { return this.isCrouching; }
  getIsSprinting(): boolean { return this.isSprinting; }
  getIsSwimming(): boolean { return this.isSwimming; }
  getIsMounted(): boolean { return this.horse.isMounted; }
  getIsOnGround(): boolean { return this.onGround; }

  /** Detection radius multiplier for stealth system. */
  getDetectionMultiplier(): number {
    return this.isCrouching ? STEALTH_DETECTION_MULTIPLIER : 1.0;
  }

  // -----------------------------------------------------------------------
  // Main update
  // -----------------------------------------------------------------------

  update(input: MovementInput, stamina: number, dt: number): { staminaCost: number } {
    let staminaCost = 0;

    // Mount / dismount toggle
    if (input.mount) {
      staminaCost += this.handleMountToggle();
    }

    // Swimming check
    const terrainType = this.terrain.getTerrainType(this.body.x, this.body.z);
    this.isSwimming = terrainType === TerrainType.Water;

    if (this.isSwimming) {
      staminaCost += this.updateSwimming(input, dt);
      return { staminaCost };
    }

    // Dodge roll
    if (this.isDodgeRolling) {
      this.updateDodgeRoll(dt);
      return { staminaCost: 0 };
    }
    if (input.dodgeRoll && this.onGround && stamina >= 25) {
      this.beginDodgeRoll(input);
      return { staminaCost: 25 };
    }

    // Crouch
    this.isCrouching = input.crouch && this.onGround && !this.horse.isMounted;

    // Determine target speed
    let targetSpeed: number;
    this.isSprinting = false;
    if (this.horse.isMounted) {
      targetSpeed = input.sprint && stamina > 0 ? HORSE_SPRINT_SPEED : HORSE_WALK_SPEED;
      if (input.sprint && stamina > 0) {
        staminaCost += SPRINT_STAMINA_COST * dt * 0.5; // less stamina on horse
        this.isSprinting = true;
      }
    } else if (this.isCrouching) {
      targetSpeed = CROUCH_SPEED;
    } else if (input.sprint && stamina > 0 && this.onGround) {
      targetSpeed = SPRINT_SPEED;
      staminaCost += SPRINT_STAMINA_COST * dt;
      this.isSprinting = true;
    } else {
      targetSpeed = WALK_SPEED;
    }

    // Build desired direction in world space from input + yaw
    const { dx, dz } = this.inputToWorld(input.forward, input.right);
    const inputMag = Math.sqrt(dx * dx + dz * dz);
    const hasMoveInput = inputMag > 0.01;

    // Acceleration / deceleration
    const accel = this.onGround ? ACCELERATION : ACCELERATION * AIR_CONTROL;
    if (hasMoveInput) {
      const normX = dx / inputMag;
      const normZ = dz / inputMag;
      const desiredVx = normX * targetSpeed;
      const desiredVz = normZ * targetSpeed;
      this.body.vx = this.approach(this.body.vx, desiredVx, accel * dt);
      this.body.vz = this.approach(this.body.vz, desiredVz, accel * dt);
    } else {
      this.body.vx = this.approach(this.body.vx, 0, DECELERATION * dt);
      this.body.vz = this.approach(this.body.vz, 0, DECELERATION * dt);
    }

    // Jump
    if (input.jump && this.onGround && !this.horse.isMounted) {
      this.body.vy = JUMP_VELOCITY;
      this.onGround = false;
    }

    // Gravity
    if (!this.onGround) {
      this.body.vy += GRAVITY * dt;
      if (this.body.vy < TERMINAL_VELOCITY) this.body.vy = TERMINAL_VELOCITY;
    }

    // Slope handling
    staminaCost += this.handleSlope(dt);

    // Integrate position
    let newX = this.body.x + this.body.vx * dt;
    let newZ = this.body.z + this.body.vz * dt;
    this.body.y += this.body.vy * dt;

    // Collision with buildings / world
    if (this.terrain.isBlocked(newX, newZ, this.playerRadius)) {
      // Slide along axis
      if (!this.terrain.isBlocked(newX, this.body.z, this.playerRadius)) {
        newZ = this.body.z;
        this.body.vz = 0;
      } else if (!this.terrain.isBlocked(this.body.x, newZ, this.playerRadius)) {
        newX = this.body.x;
        this.body.vx = 0;
      } else {
        newX = this.body.x;
        newZ = this.body.z;
        this.body.vx = 0;
        this.body.vz = 0;
      }
    }

    this.body.x = newX;
    this.body.z = newZ;

    // Ground clamp
    const groundY = this.terrain.getHeight(this.body.x, this.body.z);
    if (this.body.y <= groundY) {
      this.body.y = groundY;
      this.body.vy = 0;
      this.onGround = true;
    }

    // Sync horse position when mounted
    if (this.horse.isMounted) {
      this.horse.position.x = this.body.x;
      this.horse.position.y = this.body.y;
      this.horse.position.z = this.body.z;
    }

    return { staminaCost };
  }

  // -----------------------------------------------------------------------
  // Swimming
  // -----------------------------------------------------------------------

  private updateSwimming(input: MovementInput, dt: number): number {
    const { dx, dz } = this.inputToWorld(input.forward, input.right);
    const inputMag = Math.sqrt(dx * dx + dz * dz);

    if (inputMag > 0.01) {
      this.body.vx = (dx / inputMag) * SWIM_SPEED;
      this.body.vz = (dz / inputMag) * SWIM_SPEED;
    } else {
      this.body.vx *= 0.9;
      this.body.vz *= 0.9;
    }

    // Vertical: hold jump to surface, otherwise slowly sink
    if (input.jump) {
      this.body.vy = SWIM_SPEED * 0.5;
    } else {
      this.body.vy = -1.0;
    }

    this.body.x += this.body.vx * dt;
    this.body.z += this.body.vz * dt;
    this.body.y += this.body.vy * dt;

    // Don't go below terrain floor even under water
    const groundY = this.terrain.getHeight(this.body.x, this.body.z);
    if (this.body.y < groundY) this.body.y = groundY;

    // Clamp at surface
    if (this.body.y > SWIM_SURFACE_Y) {
      this.body.y = SWIM_SURFACE_Y;
      this.body.vy = 0;
    }

    // Swimming costs stamina slowly
    return 3 * dt;
  }

  // -----------------------------------------------------------------------
  // Dodge roll
  // -----------------------------------------------------------------------

  private beginDodgeRoll(input: MovementInput): void {
    const { dx, dz } = this.inputToWorld(input.forward, input.right);
    const mag = Math.sqrt(dx * dx + dz * dz) || 1;
    this.dodgeDirX = dx / mag;
    this.dodgeDirZ = dz / mag;
    this.isDodgeRolling = true;
    this.dodgeTimer = DODGE_ROLL_DURATION;
  }

  private updateDodgeRoll(dt: number): void {
    this.body.vx = this.dodgeDirX * DODGE_ROLL_SPEED;
    this.body.vz = this.dodgeDirZ * DODGE_ROLL_SPEED;
    this.body.x += this.body.vx * dt;
    this.body.z += this.body.vz * dt;

    const groundY = this.terrain.getHeight(this.body.x, this.body.z);
    this.body.y = groundY;

    this.dodgeTimer -= dt;
    if (this.dodgeTimer <= 0) {
      this.isDodgeRolling = false;
      this.body.vx = 0;
      this.body.vz = 0;
    }
  }

  // -----------------------------------------------------------------------
  // Mount / dismount
  // -----------------------------------------------------------------------

  private handleMountToggle(): number {
    if (this.horse.isMounted) {
      this.horse.isMounted = false;
      return 0;
    }

    if (!this.horse.available) return 0;

    const dx = this.horse.position.x - this.body.x;
    const dz = this.horse.position.z - this.body.z;
    const dist = Math.sqrt(dx * dx + dz * dz);
    if (dist <= HORSE_MOUNT_DISTANCE) {
      this.horse.isMounted = true;
    }
    return 0;
  }

  // -----------------------------------------------------------------------
  // Slope
  // -----------------------------------------------------------------------

  private handleSlope(dt: number): number {
    if (!this.onGround) return 0;

    const normal = this.terrain.getNormal(this.body.x, this.body.z);
    const steepness = normal.ny; // 1 = flat, 0 = vertical

    if (steepness < SLOPE_SLIDE_LIMIT) {
      // Slide down
      this.body.vx += normal.nx * SLIDE_FORCE * dt;
      this.body.vz += normal.nz * SLIDE_FORCE * dt;
      return 0;
    }

    if (steepness < SLOPE_WALK_LIMIT) {
      // Slow movement on moderate slopes
      const factor = steepness / SLOPE_WALK_LIMIT;
      this.body.vx *= factor;
      this.body.vz *= factor;
      return 2 * dt; // extra stamina cost for climbing
    }

    return 0;
  }

  // -----------------------------------------------------------------------
  // Companion follow helper (call from AI system)
  // -----------------------------------------------------------------------

  getCompanionTargetPosition(): { x: number; y: number; z: number; shouldTeleport: boolean } {
    const offset = 2.0;
    const behindX = this.body.x - Math.sin(this.yaw) * offset;
    const behindZ = this.body.z - Math.cos(this.yaw) * offset;
    const targetY = this.terrain.getHeight(behindX, behindZ);
    return {
      x: behindX,
      y: targetY,
      z: behindZ,
      shouldTeleport: false, // caller checks distance
    };
  }

  shouldCompanionTeleport(companionX: number, companionZ: number): boolean {
    const dx = this.body.x - companionX;
    const dz = this.body.z - companionZ;
    return Math.sqrt(dx * dx + dz * dz) > COMPANION_TELEPORT_DISTANCE;
  }

  // -----------------------------------------------------------------------
  // Utility
  // -----------------------------------------------------------------------

  private inputToWorld(forward: number, right: number): { dx: number; dz: number } {
    const sinY = Math.sin(this.yaw);
    const cosY = Math.cos(this.yaw);
    return {
      dx: forward * sinY + right * cosY,
      dz: forward * cosY - right * sinY,
    };
  }

  private approach(current: number, target: number, step: number): number {
    if (current < target) return Math.min(current + step, target);
    if (current > target) return Math.max(current - step, target);
    return target;
  }
}
