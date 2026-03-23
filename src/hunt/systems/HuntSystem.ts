// ---------------------------------------------------------------------------
// Hunt mode — prey movement, arrow physics, collision
// ---------------------------------------------------------------------------

import type { HuntState, Prey, Arrow } from "../state/HuntState";
import { PREY, HuntConfig, SPAWN_TABLE, type PreyType } from "../config/HuntConfig";

export function spawnPrey(state: HuntState): void {
  if (state.prey.filter(p => p.alive).length >= HuntConfig.MAX_PREY) return;
  const table = SPAWN_TABLE[Math.min(state.round, SPAWN_TABLE.length - 1)];
  const totalWeight = table.reduce((s, e) => s + e.weight, 0);
  let roll = Math.random() * totalWeight;
  let type: PreyType = table[0].type;
  for (const entry of table) {
    roll -= entry.weight;
    if (roll <= 0) { type = entry.type; break; }
  }
  const def = PREY[type];
  // Spawn from random edge
  const edge = Math.floor(Math.random() * 4);
  let x = 0, y = 0;
  if (edge === 0) { x = Math.random() * HuntConfig.FIELD_WIDTH; y = -10; }
  else if (edge === 1) { x = HuntConfig.FIELD_WIDTH + 10; y = Math.random() * HuntConfig.FIELD_HEIGHT; }
  else if (edge === 2) { x = Math.random() * HuntConfig.FIELD_WIDTH; y = HuntConfig.FIELD_HEIGHT + 10; }
  else { x = -10; y = Math.random() * HuntConfig.FIELD_HEIGHT; }

  state.prey.push({
    id: `prey_${state.preyIdCounter++}`,
    type, x, y, hp: def.hp, speed: def.speed,
    angle: Math.atan2(HuntConfig.FIELD_HEIGHT / 2 - y, HuntConfig.FIELD_WIDTH / 2 - x) + (Math.random() - 0.5) * 1,
    turnTimer: 1 + Math.random() * 3,
    startled: false, startledTimer: 0,
    alive: true,
    aggressive: (type === "wolf" || type === "bear") && state.round >= 1,
    attackCooldown: 3 + Math.random() * 2,
  });
}

export function shootArrow(state: HuntState): void {
  if (state.drawProgress < 0.3) return;
  if (state.arrowsLeft <= 0) {
    state.announcements.push({ text: "No arrows! Find ammo.", color: 0xff4444, timer: 1.5 });
    state.drawProgress = 0; state.isDrawing = false;
    return;
  }
  state.arrowsLeft--;
  const power = state.drawProgress;
  const speed = state.bow.arrowSpeed * power;
  state.arrows.push({
    x: state.playerX, y: state.playerY,
    vx: Math.cos(state.aimAngle) * speed,
    vy: Math.sin(state.aimAngle) * speed,
    damage: Math.ceil(state.bow.damage * power),
    life: HuntConfig.ARROW_LIFETIME,
  });
  state.drawProgress = 0;
  state.isDrawing = false;

  // Startle nearby prey
  for (const prey of state.prey) {
    if (!prey.alive) continue;
    const dx = prey.x - state.playerX, dy = prey.y - state.playerY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const def = PREY[prey.type];
    if (dist < 200 * def.awareness) {
      prey.startled = true;
      prey.startledTimer = HuntConfig.STARTLED_DURATION;
      prey.angle = Math.atan2(dy, dx) + (Math.random() - 0.5) * 0.5; // flee away from player
    }
  }
}

export function updateHunt(state: HuntState, dt: number): void {
  state.elapsedTime += dt;

  // Wind changes
  state.windTimer -= dt;
  if (state.windTimer <= 0) {
    state.wind = (Math.random() - 0.5) * 2;
    state.windTimer = 4 + Math.random() * 4;
  }

  // Spawn timer
  state.spawnTimer -= dt;
  if (state.spawnTimer <= 0) {
    spawnPrey(state);
    state.spawnTimer = HuntConfig.SPAWN_INTERVAL - state.round * 0.5;
  }

  // Draw bow
  if (state.isDrawing) {
    state.drawProgress = Math.min(1, state.drawProgress + dt / state.bow.drawTime);
  }

  // Ammo pickups — player walks near to collect
  for (const pickup of state.ammoPickups) {
    if (pickup.collected) continue;
    const pdx = state.playerX - pickup.x, pdy = state.playerY - pickup.y;
    if (pdx * pdx + pdy * pdy < 25 * 25) {
      pickup.collected = true;
      state.arrowsLeft = Math.min(state.maxArrows, state.arrowsLeft + 5);
      state.announcements.push({ text: "+5 Arrows!", color: 0xccaa66, timer: 1.5 });
    }
  }

  // Move prey — with unique behaviors per type
  for (const prey of state.prey) {
    if (!prey.alive) continue;
    const def = PREY[prey.type];
    let speed = prey.startled ? def.fleeSpeed : prey.speed;

    // Unique behaviors
    if (prey.type === "rabbit" && !prey.startled) {
      // Zigzag: rapid direction changes
      prey.turnTimer -= dt;
      if (prey.turnTimer <= 0) { prey.angle += (Math.random() - 0.5) * 2.5; prey.turnTimer = 0.3 + Math.random() * 0.5; }
    } else if (prey.type === "deer" && !prey.startled) {
      // Herding: move toward nearest other deer
      const otherDeer = state.prey.find(p => p !== prey && p.alive && p.type === "deer");
      if (otherDeer) {
        const herdAngle = Math.atan2(otherDeer.y - prey.y, otherDeer.x - prey.x);
        prey.angle += (herdAngle - prey.angle) * 0.02; // gentle pull toward herd
      }
      prey.turnTimer -= dt;
      if (prey.turnTimer <= 0) { prey.angle += (Math.random() - 0.5) * 0.8; prey.turnTimer = 2 + Math.random() * 3; }
    } else if (prey.type === "boar" && prey.startled) {
      // Charging: when startled, boars charge IN a straight line (don't zigzag)
      speed = def.fleeSpeed * 1.3;
    } else {
      // Default wander
      prey.turnTimer -= dt;
      if (prey.turnTimer <= 0 && !prey.startled) {
        prey.angle += (Math.random() - 0.5) * 1.5;
        prey.turnTimer = 1 + Math.random() * 3;
      }
    }

    // Brush zones: prey in brush move slower but are harder to see
    for (const brush of state.brushZones) {
      if (prey.x > brush.x && prey.x < brush.x + brush.w && prey.y > brush.y && prey.y < brush.y + brush.h) {
        speed *= 0.6;
      }
    }

    prey.x += Math.cos(prey.angle) * speed * dt;
    prey.y += Math.sin(prey.angle) * speed * dt;

    // Bounce off edges
    if (prey.x < -20 || prey.x > HuntConfig.FIELD_WIDTH + 20 || prey.y < -20 || prey.y > HuntConfig.FIELD_HEIGHT + 20) {
      prey.angle = Math.atan2(HuntConfig.FIELD_HEIGHT / 2 - prey.y, HuntConfig.FIELD_WIDTH / 2 - prey.x);
    }

    // Startled timer
    if (prey.startled) {
      prey.startledTimer -= dt;
      if (prey.startledTimer <= 0) prey.startled = false;
    }
  }

  // Aggressive prey attack player (wolves, bears)
  for (const prey of state.prey) {
    if (!prey.alive || !prey.aggressive) continue;
    prey.attackCooldown -= dt;
    const dx = state.playerX - prey.x, dy = state.playerY - prey.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    // Chase player instead of wandering
    if (dist < 150) {
      prey.angle = Math.atan2(dy, dx);
      prey.startled = false;
    }
    // Attack when close
    if (dist < 20 && prey.attackCooldown <= 0) {
      state.playerHp--;
      prey.attackCooldown = 2;
      state.announcements.push({ text: `${PREY[prey.type].name} attacks! -1 HP`, color: 0xff4444, timer: 1.5 });
      // Knockback prey
      prey.angle = Math.atan2(-dy, -dx);
      prey.startled = true;
      prey.startledTimer = 1;
      if (state.playerHp <= 0) {
        state.roundOver = true;
        state.announcements.push({ text: "KNOCKED OUT!", color: 0xff2222, timer: 3 });
      }
    }
  }

  // Move arrows + check collisions (with wind drift + tree blocking)
  for (let i = state.arrows.length - 1; i >= 0; i--) {
    const arrow = state.arrows[i];
    arrow.x += arrow.vx * dt;
    arrow.y += arrow.vy * dt;
    // Wind drift
    arrow.x += state.wind * 30 * dt;
    arrow.life -= dt;

    // Tree collision check
    let hitTree = false;
    for (const tree of state.trees) {
      const tdx = arrow.x - tree.x, tdy = arrow.y - tree.y;
      if (tdx * tdx + tdy * tdy < tree.r * tree.r) {
        hitTree = true;
        // Arrow sticks in tree (particle)
        state.particles.push({ x: arrow.x, y: arrow.y, vx: 0, vy: 0, life: 0.5, maxLife: 0.5, color: 0x6a4a2a, size: 2 });
        break;
      }
    }
    if (hitTree) { state.arrows.splice(i, 1); state.misses++; state.streak = 0; continue; }

    // Out of bounds or expired
    if (arrow.life <= 0 || arrow.x < -20 || arrow.x > HuntConfig.FIELD_WIDTH + 20 || arrow.y < -20 || arrow.y > HuntConfig.FIELD_HEIGHT + 20) {
      state.misses++;
      state.streak = 0;
      state.score += HuntConfig.MISS_PENALTY;
      state.arrows.splice(i, 1);
      continue;
    }

    // Check hit on prey
    let hit = false;
    for (const prey of state.prey) {
      if (!prey.alive) continue;
      const def = PREY[prey.type];
      const dx = arrow.x - prey.x, dy = arrow.y - prey.y;
      if (dx * dx + dy * dy < def.size * def.size * 4) {
        prey.hp -= arrow.damage;
        if (prey.hp <= 0) {
          prey.alive = false;
          state.streak++;
          if (state.streak > state.bestStreak) state.bestStreak = state.streak;
          // Streak bonus: +25% per consecutive hit (capped at 3x)
          const streakMult = Math.min(3, 1 + (state.streak - 1) * 0.25);
          const reward = Math.floor(def.value * streakMult);
          state.gold += reward;
          state.score += reward;
          state.kills++;
          const streakStr = state.streak >= 3 ? ` x${state.streak} STREAK!` : "";
          state.announcements.push({ text: `${def.name}! +${reward}g${streakStr}`, color: state.streak >= 3 ? 0xff8844 : 0xffd700, timer: 1.5 });
          // Death particles
          for (let pi = 0; pi < 6; pi++) {
            state.particles.push({ x: prey.x, y: prey.y, vx: (Math.random() - 0.5) * 60, vy: -30 - Math.random() * 30, life: 0.4, maxLife: 0.4, color: def.color, size: 2 + Math.random() * 2 });
          }
        } else {
          prey.startled = true;
          prey.startledTimer = HuntConfig.STARTLED_DURATION;
          prey.angle = Math.atan2(prey.y - state.playerY, prey.x - state.playerX);
        }
        hit = true;
        state.arrows.splice(i, 1);
        break;
      }
    }
  }

  // Update particles + announcements
  for (let i = state.particles.length - 1; i >= 0; i--) {
    const p = state.particles[i];
    p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 40 * dt; p.life -= dt;
    if (p.life <= 0) state.particles.splice(i, 1);
  }
  for (let i = state.announcements.length - 1; i >= 0; i--) {
    state.announcements[i].timer -= dt;
    if (state.announcements[i].timer <= 0) state.announcements.splice(i, 1);
  }

  // Check round end
  if (state.elapsedTime >= state.timeLimit) {
    state.roundOver = true;
  }
}
