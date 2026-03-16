// GTAPlayerSystem.ts – Pure logic, no PixiJS imports
import type { MedievalGTAState, GTAVec2, GTABuilding, GTAActiveWorldEvent } from '../state/MedievalGTAState';
import { PROPERTY_DEFS, CRIME_RING_DEFS, WORLD_EVENT_DEFS } from '../config/MedievalGTAConfig';
import type { GTAWorldEventDef, GTAFactionId } from '../config/MedievalGTAConfig';
import { increaseWanted } from './GTAWantedSystem';
import { updateHeists } from './GTAHeistSystem';
import { updateDayNight } from './GTADayNightSystem';

// ─── Constants ───────────────────────────────────────────────────────────────
const PLAYER_WALK_SPEED    = 120;
const PLAYER_RUN_SPEED     = 220;
const PLAYER_HORSE_SPEED   = 350;
const PLAYER_STAMINA_DRAIN = 30;
const PLAYER_STAMINA_REGEN = 15;
const PLAYER_ROLL_DURATION = 0.3;
const PLAYER_ROLL_SPEED    = 300;
const CAMERA_LERP          = 0.08;
const CAMERA_OFFSET_Y      = -40;
const PLAYER_HALF          = 8;   // half-size of player collision rect

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Clamp a value between lo and hi. */
function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}

/** Returns true when the player rect overlaps a building rect. */
function rectsOverlap(
  px: number, py: number, ph: number,
  bx: number, by: number, bw: number, bh: number
): boolean {
  return px - ph < bx + bw &&
         px + ph > bx &&
         py - ph < by + bh &&
         py + ph > by;
}

/**
 * Axis-separated AABB push-out: moves the player position so it no longer
 * intersects `building`. Chooses the axis with the smallest overlap.
 */
function resolveAABB(
  pos: GTAVec2,
  building: GTABuilding,
  half: number
): void {
  const bx = building.x;
  const by = building.y;
  const bw = building.w;
  const bh = building.h;

  // Overlaps on each axis
  const overlapLeft  = (pos.x + half) - bx;
  const overlapRight = (bx + bw) - (pos.x - half);
  const overlapTop   = (pos.y + half) - by;
  const overlapBot   = (by + bh) - (pos.y - half);

  const minX = overlapLeft < overlapRight ? overlapLeft : overlapRight;
  const minY = overlapTop  < overlapBot   ? overlapTop  : overlapBot;

  if (minX < minY) {
    // Push on X
    if (overlapLeft < overlapRight) {
      pos.x -= overlapLeft;
    } else {
      pos.x += overlapRight;
    }
  } else {
    // Push on Y
    if (overlapTop < overlapBot) {
      pos.y -= overlapTop;
    } else {
      pos.y += overlapBot;
    }
  }
}

/** Resolve player vs all buildings. */
function resolvePlayerBuildings(pos: GTAVec2, buildings: GTABuilding[], half: number): void {
  for (const b of buildings) {
    if (b.blocksMovement === false) continue;
    if (rectsOverlap(pos.x, pos.y, half, b.x, b.y, b.w, b.h)) {
      resolveAABB(pos, b, half);
    }
  }
}

/** Compute facing direction string from dx/dy. */
function facingDir(dx: number, dy: number): 'n' | 's' | 'e' | 'w' {
  if (Math.abs(dx) >= Math.abs(dy)) {
    return dx >= 0 ? 'e' : 'w';
  }
  return dy >= 0 ? 's' : 'n';
}

/** Facing angle in radians from dx/dy (0 = east). */
function facingAngle(dx: number, dy: number): number {
  return Math.atan2(dy, dx);
}

// ─── Property Income System ──────────────────────────────────────────────────

/** Income collection interval in game-time seconds (represents one "day"). */
const PROPERTY_INCOME_INTERVAL = 60;

/** Purchase a property. Returns true on success. */
export function purchaseProperty(
  state: MedievalGTAState,
  propertyId: string,
): boolean {
  const def = PROPERTY_DEFS.find(p => p.id === propertyId);
  if (!def) return false;

  // Already owned?
  if (state.ownedProperties.some(p => p.propertyId === propertyId)) return false;

  const p = state.player;

  // Check faction reputation requirement
  if (def.requiredFaction && def.requiredRep !== undefined) {
    const factionRep = p.reputation[def.requiredFaction] ?? 0;
    if (factionRep < def.requiredRep) {
      state.notifications.push({
        id: `notif_${state.nextId++}`,
        text: `Need ${def.requiredRep} ${def.requiredFaction} rep!`,
        timer: 2.5,
        color: 0xff8800,
      });
      return false;
    }
  }

  if (p.gold < def.cost) {
    state.notifications.push({
      id: `notif_${state.nextId++}`,
      text: `Not enough gold! Need ${def.cost}g`,
      timer: 2.5,
      color: 0xff8800,
    });
    return false;
  }

  p.gold -= def.cost;
  state.ownedProperties.push({
    propertyId,
    purchasedAt: state.timeElapsed,
    lastIncomeTime: state.timeElapsed,
    totalIncomeEarned: 0,
    purchasedUpgrades: [],
  });

  state.notifications.push({
    id: `notif_${state.nextId++}`,
    text: `Purchased ${def.name}!`,
    timer: 3.0,
    color: 0x44ff44,
  });

  // Reputation effects from buying property
  _applyPropertyReputation(state);

  return true;
}

/** Purchase an upgrade for an owned property. Returns true on success. */
export function purchasePropertyUpgrade(
  state: MedievalGTAState,
  propertyId: string,
  upgradeId: string,
): boolean {
  const ownedProp = state.ownedProperties.find(p => p.propertyId === propertyId);
  if (!ownedProp) {
    state.notifications.push({
      id: `notif_${state.nextId++}`,
      text: 'You do not own this property!',
      timer: 2.5,
      color: 0xff8800,
    });
    return false;
  }

  // Already purchased this upgrade?
  if (ownedProp.purchasedUpgrades.includes(upgradeId)) {
    state.notifications.push({
      id: `notif_${state.nextId++}`,
      text: 'Upgrade already purchased!',
      timer: 2.0,
      color: 0xff8800,
    });
    return false;
  }

  const def = PROPERTY_DEFS.find(p => p.id === propertyId);
  if (!def || !def.upgrades) return false;

  const upgradeDef = def.upgrades.find(u => u.id === upgradeId);
  if (!upgradeDef) return false;

  const p = state.player;
  if (p.gold < upgradeDef.cost) {
    state.notifications.push({
      id: `notif_${state.nextId++}`,
      text: `Not enough gold! Need ${upgradeDef.cost}g`,
      timer: 2.5,
      color: 0xff8800,
    });
    return false;
  }

  p.gold -= upgradeDef.cost;
  ownedProp.purchasedUpgrades.push(upgradeId);

  state.notifications.push({
    id: `notif_${state.nextId++}`,
    text: `Upgraded: ${upgradeDef.name}!`,
    timer: 3.0,
    color: 0x44ff44,
  });

  return true;
}

/** Get total income for a property including upgrades. */
export function getPropertyTotalIncome(state: MedievalGTAState, propertyId: string): number {
  const def = PROPERTY_DEFS.find(p => p.id === propertyId);
  if (!def) return 0;

  const owned = state.ownedProperties.find(p => p.propertyId === propertyId);
  if (!owned) return 0;

  let totalIncome = def.income;

  if (def.upgrades) {
    for (const upgId of owned.purchasedUpgrades) {
      const upgDef = def.upgrades.find(u => u.id === upgId);
      if (upgDef) totalIncome += upgDef.incomeBonus;
    }
  }

  return totalIncome;
}

function _applyPropertyReputation(state: MedievalGTAState): void {
  const repEffects: Array<{ faction: GTAFactionId; amount: number }> = [
    { faction: 'merchants', amount: 5 },
    { faction: 'nobles', amount: 3 },
  ];
  for (const eff of repEffects) {
    const current = state.player.reputation[eff.faction] ?? 0;
    state.player.reputation[eff.faction] = Math.max(-100, Math.min(100, current + eff.amount));
  }
}

/** Tick property income generation. */
function updatePropertyIncome(state: MedievalGTAState): void {
  const now = state.timeElapsed;

  // Get active world event price multiplier (affects property income too)
  let incomeMultiplier = 1.0;
  for (const evt of state.activeWorldEvents) {
    if (evt.effects.priceMultiplier) {
      // Higher prices = more income from shops
      incomeMultiplier *= evt.effects.priceMultiplier;
    }
  }

  for (const prop of state.ownedProperties) {
    const def = PROPERTY_DEFS.find(d => d.id === prop.propertyId);
    if (!def) continue;

    // Calculate total income including upgrades
    let baseIncome = def.income;
    if (def.upgrades) {
      for (const upgId of prop.purchasedUpgrades) {
        const upgDef = def.upgrades.find(u => u.id === upgId);
        if (upgDef) baseIncome += upgDef.incomeBonus;
      }
    }

    if (baseIncome <= 0) continue;

    if (now - prop.lastIncomeTime >= PROPERTY_INCOME_INTERVAL) {
      const earned = Math.floor(baseIncome * incomeMultiplier);
      state.player.gold += earned;
      prop.lastIncomeTime = now;
      prop.totalIncomeEarned += earned;

      state.notifications.push({
        id: `notif_${state.nextId++}`,
        text: `${def.name}: +${earned}g income`,
        timer: 2.0,
        color: 0xffdd00,
      });
    }
  }
}

// ─── Crime Ring System ───────────────────────────────────────────────────────

/** Crime ring income interval in game-time seconds. */
const CRIME_RING_CYCLE_INTERVAL = 45;

/** Join a crime ring. Returns true on success. */
export function joinCrimeRing(
  state: MedievalGTAState,
  ringId: string,
): boolean {
  const def = CRIME_RING_DEFS.find(r => r.id === ringId);
  if (!def) return false;

  // Already a member?
  if (state.crimeRings.some(r => r.ringId === ringId)) return false;

  // Check thieves guild reputation requirement
  const thievesRep = state.player.reputation.thieves_guild ?? 0;
  if (thievesRep < def.requiredRep) {
    state.notifications.push({
      id: `notif_${state.nextId++}`,
      text: `Need ${def.requiredRep} Thieves Guild rep to join!`,
      timer: 2.5,
      color: 0xff8800,
    });
    return false;
  }

  state.crimeRings.push({
    ringId,
    role: 'member',
    joinedAt: state.timeElapsed,
    incomeAccumulated: 0,
    lastCycleTime: state.timeElapsed,
    busted: false,
  });

  state.notifications.push({
    id: `notif_${state.nextId++}`,
    text: `Joined ${def.name}!`,
    timer: 3.0,
    color: 0xcc88ff,
  });

  return true;
}

/** Tick crime ring operations – income and risk of getting caught. */
function updateCrimeRings(state: MedievalGTAState): void {
  const now = state.timeElapsed;

  // Get active world event crime risk multiplier
  let crimeRiskMult = 1.0;
  for (const evt of state.activeWorldEvents) {
    if (evt.effects.crimeRiskMultiplier) {
      crimeRiskMult *= evt.effects.crimeRiskMultiplier;
    }
  }

  for (let i = state.crimeRings.length - 1; i >= 0; i--) {
    const ring = state.crimeRings[i];
    if (ring.busted) continue;

    const def = CRIME_RING_DEFS.find(d => d.id === ring.ringId);
    if (!def) continue;

    if (now - ring.lastCycleTime >= CRIME_RING_CYCLE_INTERVAL) {
      ring.lastCycleTime = now;

      // Risk check: chance of getting busted
      const adjustedRisk = def.riskPerCycle * crimeRiskMult;
      if (Math.random() < adjustedRisk) {
        // Busted!
        ring.busted = true;
        increaseWanted(state, def.wantedOnCaught);

        state.notifications.push({
          id: `notif_${state.nextId++}`,
          text: `${def.name} busted! +${def.wantedOnCaught} wanted!`,
          timer: 4.0,
          color: 0xff0000,
        });

        // Remove the ring after being busted
        state.crimeRings.splice(i, 1);
        continue;
      }

      // Income earned this cycle
      const earned = def.income;
      state.player.gold += earned;
      ring.incomeAccumulated += earned;

      state.notifications.push({
        id: `notif_${state.nextId++}`,
        text: `${def.name}: +${earned}g`,
        timer: 2.0,
        color: 0xcc88ff,
      });
    }
  }
}

// ─── Dynamic World Events System ─────────────────────────────────────────────

/** Time between world event spawn checks (seconds). */
const WORLD_EVENT_CHECK_INTERVAL = 30;

/** Start a world event. */
function startWorldEvent(state: MedievalGTAState, def: GTAWorldEventDef): void {
  const activeEvent: GTAActiveWorldEvent = {
    type: def.type,
    name: def.name,
    startTime: state.timeElapsed,
    duration: def.duration,
    effects: { ...def.effects },
  };

  state.activeWorldEvents.push(activeEvent);
  state.worldEventCooldowns[def.type] = state.timeElapsed + def.cooldown;

  state.notifications.push({
    id: `notif_${state.nextId++}`,
    text: def.startText,
    timer: 5.0,
    color: 0xffdd00,
  });
}

/** Tick world events: expire old events, potentially start new ones. */
function updateWorldEvents(state: MedievalGTAState, dt: number): void {
  const now = state.timeElapsed;

  // Expire finished events
  for (let i = state.activeWorldEvents.length - 1; i >= 0; i--) {
    const evt = state.activeWorldEvents[i];
    if (now - evt.startTime >= evt.duration) {
      // Find the definition for the end text
      const def = WORLD_EVENT_DEFS.find(d => d.type === evt.type);
      if (def) {
        state.notifications.push({
          id: `notif_${state.nextId++}`,
          text: def.endText,
          timer: 4.0,
          color: 0xaaaaaa,
        });
      }
      state.activeWorldEvents.splice(i, 1);
    }
  }

  // Check timer for spawning new events
  state.worldEventCheckTimer -= dt;
  if (state.worldEventCheckTimer > 0) return;
  state.worldEventCheckTimer = WORLD_EVENT_CHECK_INTERVAL;

  // Only allow one active event at a time
  if (state.activeWorldEvents.length > 0) return;

  // Random chance to start an event (30% per check)
  if (Math.random() > 0.30) return;

  // Pick a random eligible event (respecting cooldowns)
  const eligible = WORLD_EVENT_DEFS.filter(def => {
    const cooldownEnd = state.worldEventCooldowns[def.type] ?? 0;
    return now >= cooldownEnd;
  });

  if (eligible.length === 0) return;

  const chosen = eligible[Math.floor(Math.random() * eligible.length)];
  startWorldEvent(state, chosen);
}

/** Get the combined effects of all active world events. */
export function getActiveWorldEffects(state: MedievalGTAState): {
  priceMultiplier: number;
  guardMultiplier: number;
  npcSpawnMultiplier: number;
  crimeRiskMultiplier: number;
} {
  const result = {
    priceMultiplier: 1.0,
    guardMultiplier: 1.0,
    npcSpawnMultiplier: 1.0,
    crimeRiskMultiplier: 1.0,
  };

  for (const evt of state.activeWorldEvents) {
    if (evt.effects.priceMultiplier) result.priceMultiplier *= evt.effects.priceMultiplier;
    if (evt.effects.guardMultiplier) result.guardMultiplier *= evt.effects.guardMultiplier;
    if (evt.effects.npcSpawnMultiplier) result.npcSpawnMultiplier *= evt.effects.npcSpawnMultiplier;
    if (evt.effects.crimeRiskMultiplier) result.crimeRiskMultiplier *= evt.effects.crimeRiskMultiplier;
  }

  return result;
}

// ─── Main export ─────────────────────────────────────────────────────────────

export function updatePlayer(state: MedievalGTAState, dt: number): void {
  if (state.paused || state.gameOver) return;

  const p      = state.player;
  const keys   = state.keys;

  // ── Timers ──────────────────────────────────────────────────────────────
  if (p.attackCooldown   > 0) p.attackCooldown   = Math.max(0, p.attackCooldown   - dt);
  if (p.attackTimer      > 0) p.attackTimer      = Math.max(0, p.attackTimer      - dt);
  if (p.invincibleTimer  > 0) p.invincibleTimer  = Math.max(0, p.invincibleTimer  - dt);
  if (p.dialogCooldown   > 0) p.dialogCooldown   = Math.max(0, p.dialogCooldown   - dt);
  if (p.stealAnimTimer   > 0) p.stealAnimTimer   = Math.max(0, p.stealAnimTimer   - dt);
  if (p.pickpocketCooldown > 0) p.pickpocketCooldown = Math.max(0, p.pickpocketCooldown - dt);
  if (p.killStreakTimer > 0) {
    p.killStreakTimer = Math.max(0, p.killStreakTimer - dt);
    if (p.killStreakTimer <= 0) p.killStreak = 0;
  }
  if (p.blockTimer       > 0 && !state.rightMouseDown) p.blockTimer = 0;

  // ── Wanted decay ────────────────────────────────────────────────────────
  if (p.wantedDecayTimer > 0) {
    p.wantedDecayTimer -= dt;
    if (p.wantedDecayTimer <= 0 && p.wantedLevel > 0) {
      p.wantedLevel--;
      if (p.wantedLevel > 0) {
        p.wantedDecayTimer = 12.0;
      } else {
        p.wantedDecayTimer = 0;
      }
    }
  }

  // ── Dead check ──────────────────────────────────────────────────────────
  if ((p.state as string) === 'dead') {
    // gameOver is triggered after a short delay (handled by caller counting down)
    return;
  }

  if (p.hp <= 0) {
    (p as { state: string }).state = 'dead';
    p.vel.x    = 0;
    p.vel.y    = 0;
    // gameOver set by combat system / after 2-second grace, flagged here for immediate use
    state.gameOver = true;
    return;
  }

  // ── Dialog blocks movement ──────────────────────────────────────────────
  const inDialog = state.dialogNpcId !== null;

  // ── Roll logic ──────────────────────────────────────────────────────────
  const rolling = p.rollTimer > 0;
  if (rolling) {
    p.rollTimer -= dt;
    if (p.rollTimer < 0) p.rollTimer = 0;
    p.invincibleTimer = Math.max(p.invincibleTimer, p.rollTimer > 0 ? 0.05 : 0);
    p.state = 'rolling';
  }

  // ── Input axes ──────────────────────────────────────────────────────────
  let dx = 0;
  let dy = 0;
  if (!inDialog) {
    if (keys.has('a') || keys.has('arrowleft'))  dx -= 1;
    if (keys.has('d') || keys.has('arrowright')) dx += 1;
    if (keys.has('w') || keys.has('arrowup'))    dy -= 1;
    if (keys.has('s') || keys.has('arrowdown'))  dy += 1;
  }

  const moving = (dx !== 0 || dy !== 0);

  // Normalise diagonal
  if (dx !== 0 && dy !== 0) {
    const inv = 1 / Math.SQRT2;
    dx *= inv;
    dy *= inv;
  }

  // ── Stamina ─────────────────────────────────────────────────────────────
  const wantsRun = keys.has('shift') && moving && !p.onHorse;
  if (wantsRun && p.runStamina > 0) {
    p.runStamina = clamp(p.runStamina - PLAYER_STAMINA_DRAIN * dt, 0, 100);
  } else if (!wantsRun || p.onHorse) {
    p.runStamina = clamp(p.runStamina + PLAYER_STAMINA_REGEN * dt, 0, 100);
  }
  const isRunning = wantsRun && p.runStamina > 0;

  // ── Speed ────────────────────────────────────────────────────────────────
  let speed: number;
  if (p.onHorse) {
    speed = PLAYER_HORSE_SPEED;
  } else if (isRunning) {
    speed = PLAYER_RUN_SPEED;
  } else {
    speed = PLAYER_WALK_SPEED;
  }

  // ── Roll initiation ──────────────────────────────────────────────────────
  const spacePressed = keys.has(' ');
  if (spacePressed && p.rollTimer <= 0 && !rolling && moving && !inDialog) {
    p.rollTimer       = PLAYER_ROLL_DURATION;
    p.rollVel.x       = dx * PLAYER_ROLL_SPEED;
    p.rollVel.y       = dy * PLAYER_ROLL_SPEED;
    p.invincibleTimer = PLAYER_ROLL_DURATION;
    p.state           = 'rolling';
  }

  // ── Apply velocity ───────────────────────────────────────────────────────
  if (rolling && p.rollTimer > 0) {
    p.vel.x = p.rollVel.x;
    p.vel.y = p.rollVel.y;
  } else if (!inDialog) {
    p.vel.x = dx * speed;
    p.vel.y = dy * speed;
  } else {
    p.vel.x = 0;
    p.vel.y = 0;
  }

  p.pos.x += p.vel.x * dt;
  p.pos.y += p.vel.y * dt;

  // ── Building collisions ──────────────────────────────────────────────────
  if (!rolling) {
    resolvePlayerBuildings(p.pos, state.buildings, PLAYER_HALF);
  }

  // ── World bounds ─────────────────────────────────────────────────────────
  p.pos.x = clamp(p.pos.x, PLAYER_HALF, state.worldWidth  - PLAYER_HALF);
  p.pos.y = clamp(p.pos.y, PLAYER_HALF, state.worldHeight - PLAYER_HALF);

  // ── Facing ──────────────────────────────────────────────────────────────
  if (moving && !rolling) {
    p.facingDir = facingDir(dx, dy);
    p.facing    = facingAngle(dx, dy);
  }

  // ── State machine ────────────────────────────────────────────────────────
  if (!rolling) {
    if (p.attackTimer > 0) {
      p.state = 'attacking';
    } else if (state.rightMouseDown && !p.onHorse) {
      p.state        = 'blocking';
      p.blockTimer  += dt;
    } else if (p.onHorse) {
      p.state = moving ? 'on_horse_moving' : 'on_horse_idle';
    } else if (moving) {
      p.state = isRunning ? 'running' : 'walking';
    } else {
      p.state = 'idle';
    }
  }

  // ── Attack initiation ────────────────────────────────────────────────────
  if (
    state.mouseDown &&
    p.attackCooldown <= 0 &&
    !rolling &&
    p.state !== 'blocking' &&
    (p.state as string) !== 'dead' &&
    !inDialog
  ) {
    p.attackTimer    = 0.25;
    p.state          = 'attacking';
    const cooldowns: Record<string, number> = { fists: 0.5, sword: 0.6, bow: 0.8 };
    p.attackCooldown = cooldowns[p.weapon] ?? 0.5;

    // Update facing toward mouse on attack
    const mx = state.mouseWorldPos.x - p.pos.x;
    const my = state.mouseWorldPos.y - p.pos.y;
    if (Math.abs(mx) > 1 || Math.abs(my) > 1) {
      p.facing    = facingAngle(mx, my);
      p.facingDir = facingDir(mx, my);
    }
  }

  // ── interactKey edge detection ───────────────────────────────────────────
  // lastInteractKey is set to current value at the end of this frame
  state.lastInteractKey = state.interactKey;

  // ── Camera ───────────────────────────────────────────────────────────────
  state.cameraTargetX = p.pos.x - state.screenWidth  / 2;
  state.cameraTargetY = p.pos.y - state.screenHeight / 2 + CAMERA_OFFSET_Y;

  state.cameraX += (state.cameraTargetX - state.cameraX) * CAMERA_LERP;
  state.cameraY += (state.cameraTargetY - state.cameraY) * CAMERA_LERP;

  // Clamp camera to world
  state.cameraX = clamp(state.cameraX, 0, Math.max(0, state.worldWidth  - state.screenWidth));
  state.cameraY = clamp(state.cameraY, 0, Math.max(0, state.worldHeight - state.screenHeight));

  // ── Day/night ────────────────────────────────────────────────────────────
  state.dayTime = (state.dayTime + state.daySpeed * dt) % 1.0;

  // ── Property income ────────────────────────────────────────────────────
  updatePropertyIncome(state);

  // ── Crime ring operations ──────────────────────────────────────────────
  updateCrimeRings(state);

  // ── Dynamic world events ───────────────────────────────────────────────
  updateWorldEvents(state, dt);

  // ── Heist missions ──────────────────────────────────────────────────────
  updateHeists(state, dt);

  // ── Day/night cycle systems ─────────────────────────────────────────────
  updateDayNight(state, dt);

  // ── Tick ─────────────────────────────────────────────────────────────────
  state.timeElapsed += dt;
  state.tick++;
}
