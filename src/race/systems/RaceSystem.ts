// ---------------------------------------------------------------------------
// Race mode — movement, AI, collision, lap tracking
// ---------------------------------------------------------------------------

import type { RaceState, Racer } from "../state/RaceState";
import { RacePhase } from "../state/RaceState";
import { RaceConfig } from "../config/RaceConfig";

export function updateRace(state: RaceState, dt: number): void {
  // Update announcements & particles
  for (let i = state.announcements.length - 1; i >= 0; i--) {
    state.announcements[i].timer -= dt;
    if (state.announcements[i].timer <= 0) state.announcements.splice(i, 1);
  }
  for (let i = state.particles.length - 1; i >= 0; i--) {
    const p = state.particles[i];
    p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt;
    if (p.life <= 0) state.particles.splice(i, 1);
  }

  if (state.phase === RacePhase.COUNTDOWN) {
    state.countdown -= dt;
    if (state.countdown <= 0) {
      state.phase = RacePhase.RACING;
      state.announcements.push({ text: "GO!", color: 0x44ff44, timer: 1.5 });
    }
    return;
  }

  if (state.phase !== RacePhase.RACING) return;
  state.elapsedTime += dt;
  if (state.playerShield > 0) state.playerShield -= dt;

  const track = state.track;
  const wpCount = track.waypoints.length;

  for (const racer of state.racers) {
    if (racer.finished) continue;

    // Target waypoint
    const targetWP = track.waypoints[(racer.waypointIndex + 1) % wpCount];
    const dx = targetWP.x - racer.x;
    const dy = targetWP.y - racer.y;
    const distToWP = Math.sqrt(dx * dx + dy * dy);
    const targetAngle = Math.atan2(dy, dx);

    // Steering
    let angleDiff = targetAngle - racer.angle;
    while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
    while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

    const turnRate = 3.0 * racer.horse.handling;
    if (racer.isPlayer) {
      // Player steering: auto-steer + manual override
      if (state.playerSteerInput !== 0) {
        // Manual steer overrides (but auto-steer still pulls toward waypoint)
        racer.angle += state.playerSteerInput * turnRate * dt * 0.7;
        racer.angle += Math.sign(angleDiff) * Math.min(Math.abs(angleDiff), turnRate * dt * 0.3);
      } else {
        racer.angle += Math.sign(angleDiff) * Math.min(Math.abs(angleDiff), turnRate * dt);
      }
    } else {
      // AI steering with noise
      racer.angle += Math.sign(angleDiff + racer.aiSteerNoise) * Math.min(Math.abs(angleDiff), turnRate * dt * 0.9);
      if (Math.random() < 0.02) racer.aiSteerNoise = (Math.random() - 0.5) * 0.3;
    }

    // Speed
    let targetSpeed: number;
    if (racer.isPlayer) {
      targetSpeed = racer.galloping && racer.stamina > 0
        ? racer.horse.maxSpeed * RaceConfig.SPRINT_SPEED_MULT
        : racer.horse.maxSpeed * 0.7;
    } else {
      // AI speed variation
      targetSpeed = racer.aiTargetSpeed;
      if (racer.stamina > racer.horse.stamina * 0.5 && Math.random() < 0.01) {
        targetSpeed = racer.horse.maxSpeed * RaceConfig.SPRINT_SPEED_MULT * 0.9;
      }
    }

    // Acceleration
    if (racer.speed < targetSpeed) {
      racer.speed = Math.min(targetSpeed, racer.speed + racer.horse.acceleration * dt);
    } else {
      racer.speed = Math.max(targetSpeed * 0.5, racer.speed - racer.horse.acceleration * 0.5 * dt);
    }

    // Stamina
    if (racer.isPlayer && racer.galloping) {
      racer.stamina -= RaceConfig.GALLOP_STAMINA_COST * dt;
      if (racer.stamina <= 0) { racer.stamina = 0; racer.galloping = false; }
    } else {
      racer.stamina = Math.min(racer.horse.stamina, racer.stamina + racer.horse.staminaRegen * dt);
    }

    // Move
    racer.x += Math.cos(racer.angle) * racer.speed * dt;
    racer.y += Math.sin(racer.angle) * racer.speed * dt;

    // Dust particles when galloping
    if (racer.speed > racer.horse.maxSpeed * 0.8 && Math.random() < 0.3) {
      state.particles.push({
        x: racer.x - Math.cos(racer.angle) * 8, y: racer.y - Math.sin(racer.angle) * 8,
        vx: (Math.random() - 0.5) * 20, vy: (Math.random() - 0.5) * 20,
        life: 0.3, maxLife: 0.3, color: 0xaa9977, size: 2,
      });
    }

    // Obstacle collision (shield protects player)
    for (const obs of track.obstacles) {
      const odx = racer.x - obs.x, ody = racer.y - obs.y;
      if (odx * odx + ody * ody < obs.r * obs.r * 4) {
        if (racer.isPlayer && state.playerShield > 0) {
          // Shield absorbs obstacle hit
        } else {
          racer.speed *= RaceConfig.OBSTACLE_SLOWDOWN;
        }
        const dist = Math.sqrt(odx * odx + ody * ody);
        if (dist > 0) { racer.x += (odx / dist) * 3; racer.y += (ody / dist) * 3; }
      }
    }

    // Racer-to-racer bumping
    for (const other of state.racers) {
      if (other === racer || other.finished || !other.isPlayer && !racer.isPlayer) continue;
      const rdx = racer.x - other.x, rdy = racer.y - other.y;
      const rdist = Math.sqrt(rdx * rdx + rdy * rdy);
      if (rdist < 15 && rdist > 0) {
        // Push apart
        const push = (15 - rdist) * 0.5;
        racer.x += (rdx / rdist) * push;
        racer.y += (rdy / rdist) * push;
        // Speed transfer (lighter horse bounces more)
        racer.speed *= 0.9;
      }
    }

    // Power-up collection (player only)
    if (racer.isPlayer) {
      for (const pup of state.powerUps) {
        if (pup.collected) continue;
        const pdx = racer.x - pup.x, pdy = racer.y - pup.y;
        if (pdx * pdx + pdy * pdy < 20 * 20) {
          pup.collected = true;
          if (pup.type === "speed") {
            racer.speed = racer.horse.maxSpeed * RaceConfig.SPRINT_SPEED_MULT * 1.2;
            state.announcements.push({ text: "SPEED BOOST!", color: 0xff6644, timer: 1.5 });
          } else if (pup.type === "stamina") {
            racer.stamina = racer.horse.stamina;
            state.announcements.push({ text: "STAMINA REFILL!", color: 0x44ccff, timer: 1.5 });
          } else if (pup.type === "shield") {
            state.playerShield = 5;
            state.announcements.push({ text: "SHIELD! (5s)", color: 0xffd700, timer: 1.5 });
          }
          // Pickup particles
          for (let pi = 0; pi < 5; pi++) {
            state.particles.push({
              x: pup.x, y: pup.y,
              vx: (Math.random() - 0.5) * 40, vy: (Math.random() - 0.5) * 40,
              life: 0.3, maxLife: 0.3,
              color: pup.type === "speed" ? 0xff6644 : pup.type === "stamina" ? 0x44ccff : 0xffd700,
              size: 2,
            });
          }
        }
      }
    }

    // Waypoint check
    if (distToWP < 30) {
      racer.waypointIndex++;
      if (racer.waypointIndex >= wpCount) {
        racer.waypointIndex = 0;
        racer.lap++;
        if (racer.lap >= track.laps) {
          racer.finished = true;
          racer.finishTime = state.elapsedTime;
          state.finishOrder.push(racer.id);
          if (racer.isPlayer) {
            const place = state.finishOrder.length;
            state.announcements.push({ text: place === 1 ? "1ST PLACE!" : place === 2 ? "2ND PLACE!" : `${place}TH PLACE`, color: place === 1 ? 0xffd700 : 0xcccccc, timer: 3 });
          }
        } else if (racer.isPlayer) {
          state.announcements.push({ text: `Lap ${racer.lap + 1}/${track.laps}`, color: 0xffaa44, timer: 1.5 });
        }
      }
    }

    // Bounds
    racer.x = Math.max(5, Math.min(RaceConfig.FIELD_WIDTH - 5, racer.x));
    racer.y = Math.max(5, Math.min(RaceConfig.FIELD_HEIGHT - 5, racer.y));
  }

  // Check if all finished
  if (state.racers.every(r => r.finished)) {
    state.phase = RacePhase.FINISHED;
    const playerPlace = state.finishOrder.indexOf("player") + 1;
    if (playerPlace === 1) {
      state.gold += Math.floor(state.currentBet * RaceConfig.WIN_PAYOUT);
      state.announcements.push({ text: `+${Math.floor(state.currentBet * RaceConfig.WIN_PAYOUT)}g WINNER!`, color: 0xffd700, timer: 3 });
    } else if (playerPlace === 2) {
      state.gold += Math.floor(state.currentBet * RaceConfig.PLACE_PAYOUT);
      state.announcements.push({ text: `+${Math.floor(state.currentBet * RaceConfig.PLACE_PAYOUT)}g 2nd place`, color: 0xcccccc, timer: 3 });
    } else {
      state.announcements.push({ text: `-${state.currentBet}g`, color: 0xff4444, timer: 3 });
    }
    state.gold -= state.currentBet;
  }
}
