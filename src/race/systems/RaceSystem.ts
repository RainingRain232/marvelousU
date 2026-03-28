// ---------------------------------------------------------------------------
// Race mode — movement, AI, collision, lap tracking
// ---------------------------------------------------------------------------

import type { RaceState } from "../state/RaceState";
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

    // Weather & terrain modifiers
    const weatherGrip = RaceConfig.WEATHER_GRIP[track.weather] ?? 1;
    const weatherSpeed = RaceConfig.WEATHER_SPEED[track.weather] ?? 1;
    const weatherStaminaDrain = RaceConfig.WEATHER_STAMINA_DRAIN[track.weather] ?? 1;
    const terrainAccel = RaceConfig.TERRAIN_ACCEL[track.terrain] ?? 1;

    // Steering
    let angleDiff = targetAngle - racer.angle;
    while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
    while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

    const turnRate = 3.0 * racer.horse.handling * weatherGrip;
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
      // AI speed variation — strategic galloping
      targetSpeed = racer.aiTargetSpeed;
      // AI sprints when stamina is high and on straights (low turn angle)
      const onStraight = Math.abs(angleDiff) < 0.3;
      if (racer.stamina > racer.horse.stamina * 0.4 && onStraight && Math.random() < 0.03) {
        racer.galloping = true;
      }
      if (racer.galloping) {
        if (racer.stamina <= racer.horse.stamina * 0.15 || !onStraight) {
          racer.galloping = false;
        } else {
          targetSpeed = racer.horse.maxSpeed * RaceConfig.SPRINT_SPEED_MULT * 0.9;
          racer.stamina -= RaceConfig.GALLOP_STAMINA_COST * weatherStaminaDrain * dt * 0.8;
          if (racer.stamina <= 0) { racer.stamina = 0; racer.galloping = false; }
        }
      }
      // AI catches up if far behind leader
      const leaderProgress = Math.max(...state.racers.filter(r => !r.finished).map(r => r.lap * wpCount + r.waypointIndex));
      const myProgress = racer.lap * wpCount + racer.waypointIndex;
      if (leaderProgress - myProgress > 3 && racer.stamina > racer.horse.stamina * 0.3) {
        targetSpeed *= 1.1; // rubber-band catch-up
      }
    }

    // Stamina exhaustion: dramatically reduce speed when stamina is depleted
    if (racer.stamina <= 0) {
      targetSpeed *= RaceConfig.EXHAUSTION_SPEED_MULT;
    } else if (racer.stamina < RaceConfig.EXHAUSTION_THRESHOLD) {
      // Gradual slowdown as stamina approaches 0
      const exhaustionLerp = racer.stamina / RaceConfig.EXHAUSTION_THRESHOLD;
      targetSpeed *= RaceConfig.EXHAUSTION_SPEED_MULT + (1 - RaceConfig.EXHAUSTION_SPEED_MULT) * exhaustionLerp;
    }

    // Drafting / slipstream: speed boost when close behind another racer
    if (racer.isPlayer) {
      let drafting = false;
      for (const other of state.racers) {
        if (other === racer || other.finished) continue;
        const ddx = other.x - racer.x, ddy = other.y - racer.y;
        const ddist = Math.sqrt(ddx * ddx + ddy * ddy);
        if (ddist < RaceConfig.DRAFT_DISTANCE && ddist > 5) {
          // Check if racer is behind the other (facing roughly the same direction toward them)
          const angleToOther = Math.atan2(ddy, ddx);
          let angleDelta = angleToOther - racer.angle;
          while (angleDelta > Math.PI) angleDelta -= Math.PI * 2;
          while (angleDelta < -Math.PI) angleDelta += Math.PI * 2;
          if (Math.abs(angleDelta) < RaceConfig.DRAFT_ANGLE_TOLERANCE) {
            drafting = true;
            break;
          }
        }
      }
      if (drafting) {
        targetSpeed *= (1 + RaceConfig.DRAFT_SPEED_BONUS);
        // Visual indicator: show draft particles
        if (Math.random() < 0.4) {
          state.particles.push({
            x: racer.x - Math.cos(racer.angle) * 6 + (Math.random() - 0.5) * 6,
            y: racer.y - Math.sin(racer.angle) * 6 + (Math.random() - 0.5) * 6,
            vx: -Math.cos(racer.angle) * 30 + (Math.random() - 0.5) * 10,
            vy: -Math.sin(racer.angle) * 30 + (Math.random() - 0.5) * 10,
            life: 0.25, maxLife: 0.25, color: 0x88ccff, size: 2,
          });
        }
      }
    }

    // Apply weather speed cap
    targetSpeed *= weatherSpeed;

    // Acceleration (terrain affects)
    const accel = racer.horse.acceleration * terrainAccel;
    if (racer.speed < targetSpeed) {
      racer.speed = Math.min(targetSpeed, racer.speed + accel * dt);
    } else {
      racer.speed = Math.max(targetSpeed * 0.5, racer.speed - accel * 0.5 * dt);
    }

    // Stamina (weather affects drain rate)
    if (racer.isPlayer && racer.galloping) {
      racer.stamina -= RaceConfig.GALLOP_STAMINA_COST * weatherStaminaDrain * dt;
      if (racer.stamina <= 0) { racer.stamina = 0; racer.galloping = false; }
    } else {
      racer.stamina = Math.min(racer.horse.stamina, racer.stamina + racer.horse.staminaRegen * dt);
    }

    // Move
    racer.x += Math.cos(racer.angle) * racer.speed * dt;
    racer.y += Math.sin(racer.angle) * racer.speed * dt;

    // Dust particles when any racer is galloping fast
    const dustThreshold = racer.horse.maxSpeed * RaceConfig.DUST_SPEED_THRESHOLD;
    if (racer.speed > dustThreshold) {
      // More particles at higher speeds
      const speedRatio = (racer.speed - dustThreshold) / (racer.horse.maxSpeed * RaceConfig.SPRINT_SPEED_MULT - dustThreshold);
      const spawnChance = RaceConfig.DUST_SPAWN_RATE * Math.min(1, speedRatio + 0.3);
      if (Math.random() < spawnChance) {
        const backX = racer.x - Math.cos(racer.angle) * 10;
        const backY = racer.y - Math.sin(racer.angle) * 10;
        // Spawn 1-3 dust particles depending on speed
        const count = racer.speed > racer.horse.maxSpeed ? 2 + Math.floor(Math.random() * 2) : 1;
        for (let di = 0; di < count; di++) {
          state.particles.push({
            x: backX + (Math.random() - 0.5) * 6,
            y: backY + (Math.random() - 0.5) * 6,
            vx: -Math.cos(racer.angle) * 15 + (Math.random() - 0.5) * 25,
            vy: -Math.sin(racer.angle) * 15 + (Math.random() - 0.5) * 25,
            life: 0.5 + Math.random() * 0.3,
            maxLife: 0.8,
            color: 0xaa9977,
            size: 2 + Math.random() * 2,
          });
        }
      }
    }

    // Obstacle collision (shield protects player)
    for (const obs of track.obstacles) {
      const odx = racer.x - obs.x, ody = racer.y - obs.y;
      if (odx * odx + ody * ody < obs.r * obs.r * 4) {
        if (racer.isPlayer && state.playerShield > 0) {
          // Shield absorbs obstacle hit
        } else {
          racer.speed *= RaceConfig.OBSTACLE_SLOWDOWN;
          // Obstacle hit drains stamina
          racer.stamina = Math.max(0, racer.stamina - RaceConfig.OBSTACLE_STAMINA_LOSS);
          if (racer.isPlayer && racer.stamina <= 0) {
            racer.galloping = false;
          }
        }
        // Impact particles
        for (let pi = 0; pi < 4; pi++) {
          state.particles.push({
            x: obs.x + (Math.random() - 0.5) * obs.r,
            y: obs.y + (Math.random() - 0.5) * obs.r,
            vx: (Math.random() - 0.5) * 50,
            vy: (Math.random() - 0.5) * 50,
            life: 0.4, maxLife: 0.4, color: 0x556644, size: 3,
          });
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

  // Weather particles
  if (track.weather === "rain" && Math.random() < 0.6) {
    state.particles.push({
      x: Math.random() * RaceConfig.FIELD_WIDTH, y: Math.random() * RaceConfig.FIELD_HEIGHT,
      vx: -20, vy: 80, life: 0.3, maxLife: 0.3, color: 0x6688aa, size: 1,
    });
  }
  if (track.weather === "mud") {
    const player = state.racers.find(r => r.isPlayer);
    if (player && player.speed > 50 && Math.random() < 0.4) {
      state.particles.push({
        x: player.x + (Math.random() - 0.5) * 12,
        y: player.y + (Math.random() - 0.5) * 12,
        vx: (Math.random() - 0.5) * 30, vy: (Math.random() - 0.5) * 30,
        life: 0.4, maxLife: 0.4, color: 0x665533, size: 3,
      });
    }
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
