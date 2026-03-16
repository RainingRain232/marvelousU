// ---------------------------------------------------------------------------
// Grail Ball -- Enhanced Ball Physics
// Realistic ball bounce, spin, curve, drag, surface friction, and
// ball-player collision with momentum transfer. Headers and volleys.
// ---------------------------------------------------------------------------

import {
  GB_PHYSICS, GB_FIELD,
} from "./GrailBallConfig";
import {
  type GBMatchState, type GBPlayer, type Vec3,
  v3, v3Dist3D, v3Sub, v3Normalize, v3Len,
  getFatigueAccuracyMultiplier,
  getWeatherWindForce, getWeatherBallFriction,
} from "./GrailBallState";

// ---------------------------------------------------------------------------
// Surface friction map
// ---------------------------------------------------------------------------
const SURFACE_FRICTION: Record<string, number> = {
  grass: GB_PHYSICS.ORB_SURFACE_FRICTION,
  mud: GB_PHYSICS.ORB_SURFACE_FRICTION * 0.85,
  stone: GB_PHYSICS.ORB_SURFACE_FRICTION * 1.05,
};

// ---------------------------------------------------------------------------
// Enhanced orb physics tick
// ---------------------------------------------------------------------------
export function tickOrbPhysics(state: GBMatchState, dt: number): void {
  const orb = state.orb;

  if (orb.carrier != null) return; // carried orb handled elsewhere

  // Gravity
  orb.vel.y += GB_PHYSICS.GRAVITY * dt;

  // Weather: apply wind force to ball in flight
  const wind = getWeatherWindForce(state);
  if (wind.x !== 0 || wind.z !== 0) {
    orb.vel.x += wind.x * dt;
    orb.vel.z += wind.z * dt;
  }

  // Weather: random trajectory drift (rain/storm make ball unpredictable)
  const drift = state.weatherEffect.ballTrajectoryDrift;
  if (drift > 0 && orb.inFlight) {
    orb.vel.x += (Math.random() - 0.5) * drift * dt * 60;
    orb.vel.z += (Math.random() - 0.5) * drift * dt * 60;
  }

  // Air drag
  const drag = GB_PHYSICS.ORB_DRAG;
  orb.vel.x *= drag;
  orb.vel.z *= drag;
  // Less drag on y (gravity dominates)
  orb.vel.y *= 0.999;

  // Magnus effect (spin -> curve)
  // Spin around Y axis causes lateral deflection
  if (Math.abs(orb.spin.y) > 0.01) {
    const magnusForce = orb.spin.y * GB_PHYSICS.ORB_MAGNUS_FORCE;
    // Perpendicular to velocity in xz plane
    const speed = Math.sqrt(orb.vel.x * orb.vel.x + orb.vel.z * orb.vel.z);
    if (speed > 0.5) {
      const perpX = -orb.vel.z / speed;
      const perpZ = orb.vel.x / speed;
      orb.vel.x += perpX * magnusForce * dt * 60;
      orb.vel.z += perpZ * magnusForce * dt * 60;
      orb.curve = magnusForce;
    }
  }

  // Top spin / back spin (spin.x) affects vertical trajectory
  if (Math.abs(orb.spin.x) > 0.01) {
    // Top spin makes ball dip faster, back spin makes it float
    orb.vel.y -= orb.spin.x * 0.03 * dt * 60;
  }

  // Spin decay
  orb.spin.x *= GB_PHYSICS.ORB_SPIN_DECAY;
  orb.spin.y *= GB_PHYSICS.ORB_SPIN_DECAY;
  orb.spin.z *= GB_PHYSICS.ORB_SPIN_DECAY;

  // Move
  orb.pos.x += orb.vel.x * dt;
  orb.pos.y += orb.vel.y * dt;
  orb.pos.z += orb.vel.z * dt;

  // Surface friction (get friction for current surface type, modified by weather)
  const weatherFrictionMult = getWeatherBallFriction(state);
  const friction = (SURFACE_FRICTION[orb.surfaceType] ?? GB_PHYSICS.ORB_SURFACE_FRICTION) * weatherFrictionMult;

  // Ground bounce with enhanced physics
  if (orb.pos.y < GB_PHYSICS.ORB_RADIUS) {
    orb.pos.y = GB_PHYSICS.ORB_RADIUS;

    // Bounce coefficient decreases with each bounce
    const bounceFactor = GB_PHYSICS.ORB_BOUNCE * Math.pow(0.85, orb.bounceCount);
    orb.vel.y = Math.abs(orb.vel.y) * bounceFactor;

    // Surface friction on horizontal velocity
    orb.vel.x *= friction;
    orb.vel.z *= friction;

    // Spin transfer on bounce: spin affects bounce direction
    if (Math.abs(orb.spin.x) > 0.05) {
      // Top/back spin changes horizontal speed on bounce
      orb.vel.x += orb.spin.x * 0.5;
      orb.spin.x *= 0.5; // lose some spin on bounce
    }

    orb.bounceCount++;
    orb.lastBounceTime = state.matchClock;

    if (Math.abs(orb.vel.y) < 0.5) {
      orb.vel.y = 0;
      orb.inFlight = false;
    }
  }

  // Wall bounce (sidelines) with spin
  if (orb.pos.z < -GB_FIELD.HALF_WIDTH || orb.pos.z > GB_FIELD.HALF_WIDTH) {
    orb.pos.z = Math.max(-GB_FIELD.HALF_WIDTH, Math.min(GB_FIELD.HALF_WIDTH, orb.pos.z));
    orb.vel.z *= -GB_PHYSICS.ORB_BOUNCE;
    // Wall contact adds spin
    orb.spin.y += orb.vel.x * 0.02;
  }

  // Goal posts bounce
  for (const xBound of [-GB_FIELD.HALF_LENGTH - 1, GB_FIELD.HALF_LENGTH + 1]) {
    if (Math.abs(orb.pos.x - xBound) < 1) {
      if (Math.abs(orb.pos.z) > GB_FIELD.GATE_WIDTH / 2) {
        orb.vel.x *= -GB_PHYSICS.ORB_BOUNCE;
        orb.pos.x = xBound + (xBound < 0 ? 1 : -1);
        // Post hit adds spin
        orb.spin.y += orb.vel.z * 0.03;
      }
    }
  }

  // End wall bounce (behind gates)
  if (orb.pos.x < -GB_FIELD.HALF_LENGTH - 3 || orb.pos.x > GB_FIELD.HALF_LENGTH + 3) {
    orb.vel.x *= -0.5;
    orb.pos.x = Math.max(-GB_FIELD.HALF_LENGTH - 3, Math.min(GB_FIELD.HALF_LENGTH + 3, orb.pos.x));
  }

  // Ground rolling friction
  if (orb.pos.y <= GB_PHYSICS.ORB_RADIUS + 0.1) {
    orb.vel.x *= friction;
    orb.vel.z *= friction;
  }

  // Speed check: if very slow, mark as not in flight
  const speed = v3Len(orb.vel);
  if (speed < 0.5 && orb.pos.y < 0.5) {
    orb.inFlight = false;
  }
}

// ---------------------------------------------------------------------------
// Ball-player collision with momentum transfer
// ---------------------------------------------------------------------------
export function checkBallPlayerCollisions(state: GBMatchState): void {
  const orb = state.orb;
  if (orb.carrier != null) return;

  for (const p of state.players) {
    if (p.stunTimer > 0 || p.foulTimer > 0) continue;

    const dist = v3Dist3D(p.pos, orb.pos);
    const collisionDist = p.size + GB_PHYSICS.ORB_RADIUS;

    if (dist < collisionDist && dist > 0.01) {
      // Direction from player to orb
      const collisionNormal = v3Normalize(v3Sub(orb.pos, p.pos));

      // Relative velocity
      const relVelX = orb.vel.x - p.vel.x;
      const relVelZ = orb.vel.z - p.vel.z;
      const relVelDot = relVelX * collisionNormal.x + relVelZ * collisionNormal.z;

      // Only resolve if objects are approaching
      if (relVelDot < 0) {
        const restitution = GB_PHYSICS.ORB_PLAYER_RESTITUTION;
        const impulse = -(1 + restitution) * relVelDot;

        // Apply impulse to orb (player is much heavier)
        orb.vel.x += impulse * collisionNormal.x;
        orb.vel.z += impulse * collisionNormal.z;
        orb.vel.y += Math.abs(impulse) * 0.2; // slight upward bounce

        // Transfer some spin from the collision
        orb.spin.y += (p.vel.z * collisionNormal.x - p.vel.x * collisionNormal.z) * 0.1;

        // Slight knockback to player
        p.vel.x -= collisionNormal.x * impulse * 0.1;
        p.vel.z -= collisionNormal.z * impulse * 0.1;

        // Separate objects
        const overlap = collisionDist - dist;
        orb.pos.x += collisionNormal.x * overlap;
        orb.pos.z += collisionNormal.z * overlap;
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Header attempt
// ---------------------------------------------------------------------------
export function attemptHeader(
  state: GBMatchState,
  player: GBPlayer,
  targetPos: Vec3,
): boolean {
  const orb = state.orb;
  if (orb.carrier != null) return false;

  // Ball must be in the air at head height
  if (orb.pos.y < 1.5 || orb.pos.y > 3.5) return false;

  const dist = v3Dist3D(player.pos, orb.pos);
  if (dist > GB_PHYSICS.ORB_HEADER_RANGE) return false;

  const accuracyMult = getFatigueAccuracyMultiplier(player);

  // Direction toward target with fatigue-based accuracy scatter
  const dir = v3Normalize(v3Sub(targetPos, orb.pos));
  const scatter = (1 - accuracyMult) * 0.3;
  dir.x += (Math.random() - 0.5) * scatter;
  dir.z += (Math.random() - 0.5) * scatter;

  const headerSpeed = GB_PHYSICS.ORB_HEADER_POWER * accuracyMult;

  orb.vel = v3(dir.x * headerSpeed, headerSpeed * 0.15, dir.z * headerSpeed);
  orb.lastThrownBy = player.id;
  orb.lastTeam = player.teamIndex;
  orb.inFlight = true;

  // Add top spin for headers
  orb.spin.x = 0.3;
  orb.spin.y = (Math.random() - 0.5) * 0.2;
  orb.bounceCount = 0;

  return true;
}

// ---------------------------------------------------------------------------
// Volley attempt
// ---------------------------------------------------------------------------
export function attemptVolley(
  state: GBMatchState,
  player: GBPlayer,
  targetPos: Vec3,
): boolean {
  const orb = state.orb;
  if (orb.carrier != null) return false;

  // Ball must be in the air at kick height
  if (orb.pos.y < 0.3 || orb.pos.y > 2.0) return false;

  const dist = v3Dist3D(player.pos, orb.pos);
  if (dist > GB_PHYSICS.ORB_VOLLEY_RANGE) return false;

  const accuracyMult = getFatigueAccuracyMultiplier(player);

  const dir = v3Normalize(v3Sub(targetPos, orb.pos));
  const scatter = (1 - accuracyMult) * 0.4;
  dir.x += (Math.random() - 0.5) * scatter;
  dir.z += (Math.random() - 0.5) * scatter;

  const volleySpeed = GB_PHYSICS.ORB_VOLLEY_POWER * accuracyMult;

  orb.vel = v3(dir.x * volleySpeed, volleySpeed * 0.2, dir.z * volleySpeed);
  orb.lastThrownBy = player.id;
  orb.lastTeam = player.teamIndex;
  orb.inFlight = true;

  // Volleys can have significant spin
  orb.spin.y = (Math.random() - 0.5) * 0.5;
  orb.spin.x = -0.2; // slight backspin on volleys
  orb.bounceCount = 0;

  return true;
}

// ---------------------------------------------------------------------------
// Launch orb with spin (enhanced version)
// ---------------------------------------------------------------------------
export function launchOrbWithSpin(
  state: GBMatchState,
  player: GBPlayer,
  target: Vec3,
  speed: number,
  upAngle: number,
  spinY = 0,
  spinX = 0,
): void {
  const orb = state.orb;
  player.hasOrb = false;
  orb.carrier = null;
  orb.lastThrownBy = player.id;
  orb.lastTeam = player.teamIndex;
  orb.inFlight = true;

  const accuracyMult = getFatigueAccuracyMultiplier(player);
  const scatter = (1 - accuracyMult) * 0.15;

  const dir = v3Normalize(v3Sub(target, player.pos));
  dir.x += (Math.random() - 0.5) * scatter;
  dir.z += (Math.random() - 0.5) * scatter;

  orb.pos = v3(
    player.pos.x + dir.x * 0.8,
    player.pos.y + 1.5,
    player.pos.z + dir.z * 0.8,
  );
  orb.vel = v3(dir.x * speed, speed * upAngle, dir.z * speed);

  // Set spin
  orb.spin = v3(spinX, spinY, 0);
  orb.curve = 0;
  orb.bounceCount = 0;

  orb.glowIntensity = 2;
}
