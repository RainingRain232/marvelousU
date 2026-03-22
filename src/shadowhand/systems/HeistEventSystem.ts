// ---------------------------------------------------------------------------
// Shadowhand mode — dynamic heist events & modifiers
// ---------------------------------------------------------------------------

import type { HeistState, HeistModifier, HeistEvent } from "../state/ShadowhandState";
import { AlertLevel } from "../state/ShadowhandState";
import type { TargetDef } from "../config/TargetDefs";
import { ShadowhandConfig } from "../config/ShadowhandConfig";
import { seedRng } from "../state/ShadowhandState";

// ---------------------------------------------------------------------------
// Modifier selection — randomly picked before heist based on tier & heat
// ---------------------------------------------------------------------------

const MODIFIER_POOL: { mod: HeistModifier; minTier: number; weight: number }[] = [
  { mod: "paranoid", minTier: 1, weight: 3 },
  { mod: "fog", minTier: 1, weight: 2 },
  { mod: "treasure_room", minTier: 1, weight: 3 },
  { mod: "moonless_night", minTier: 1, weight: 2 },
  { mod: "elite_patrol", minTier: 2, weight: 3 },
  { mod: "guard_rotation", minTier: 2, weight: 2 },
  { mod: "lockdown", minTier: 3, weight: 2 },
  { mod: "inquisitor_spy", minTier: 3, weight: 1 },
];

export function selectModifiers(target: TargetDef, heat: number, seed: number): HeistModifier[] {
  const rng = seedRng(seed + 7777);
  const eligible = MODIFIER_POOL.filter(m => m.minTier <= target.tier);
  if (eligible.length === 0) return [];

  const mods: HeistModifier[] = [];
  // Number of modifiers scales with tier and heat
  const modCount = Math.min(3, Math.floor(target.tier / 2) + (heat > 50 ? 1 : 0));

  for (let i = 0; i < modCount; i++) {
    const totalWeight = eligible.reduce((s, m) => s + m.weight, 0);
    let roll = rng() * totalWeight;
    for (const m of eligible) {
      roll -= m.weight;
      if (roll <= 0) {
        if (!mods.includes(m.mod)) mods.push(m.mod);
        break;
      }
    }
  }

  return mods;
}

// ---------------------------------------------------------------------------
// Modifier names for display
// ---------------------------------------------------------------------------

export const MODIFIER_DISPLAY: Record<HeistModifier, { name: string; desc: string; color: number }> = {
  lockdown: { name: "Lockdown", desc: "All doors lock after 90 seconds", color: 0xff4444 },
  elite_patrol: { name: "Elite Patrol", desc: "Extra elite guard spawns mid-heist", color: 0xff8844 },
  guard_rotation: { name: "Guard Rotation", desc: "New guards swap in periodically", color: 0xffaa44 },
  paranoid: { name: "Paranoid Guards", desc: "Alert decay is halved", color: 0xddaa22 },
  fog: { name: "Dense Fog", desc: "Thief vision reduced by 2", color: 0x8888aa },
  treasure_room: { name: "Treasure Room", desc: "Extra loot spawned, but more traps", color: 0xffd700 },
  inquisitor_spy: { name: "Inquisitor Spy", desc: "One guard has doubled vision range", color: 0xff2222 },
  moonless_night: { name: "Moonless Night", desc: "All windows dark — more shadows", color: 0x4444aa },
};

// ---------------------------------------------------------------------------
// Apply modifiers to heist state
// ---------------------------------------------------------------------------

export function applyModifiers(heist: HeistState): void {
  for (const mod of heist.modifiers) {
    switch (mod) {
      case "paranoid":
        // Halve alert decay for all guards
        // (Handled in VisionSystem via check)
        break;
      case "fog":
        // Reduce thief vision (handled in updateThiefMovement)
        break;
      case "moonless_night":
        // Remove window light
        for (let y = 0; y < heist.map.height; y++) {
          for (let x = 0; x < heist.map.width; x++) {
            if (heist.map.tiles[y][x].type === "window") {
              heist.map.tiles[y][x].lit = false;
            }
          }
        }
        break;
      case "inquisitor_spy":
        // Buff one random guard's vision
        if (heist.guards.length > 0) {
          const spy = heist.guards[Math.floor(Math.random() * heist.guards.length)];
          spy.isElite = true;
          spy.speed *= 1.3;
        }
        break;
      case "treasure_room":
        // Extra loot already placed via map gen; add more traps
        for (let y = 0; y < heist.map.height; y++) {
          for (let x = 0; x < heist.map.width; x++) {
            const tile = heist.map.tiles[y][x];
            if (tile.type === "floor" && !tile.loot && !tile.trapArmed && Math.random() < 0.02) {
              tile.type = "trap";
              tile.trapArmed = true;
            }
          }
        }
        break;
    }
  }
}

// ---------------------------------------------------------------------------
// Generate timed heist events
// ---------------------------------------------------------------------------

export function generateHeistEvents(heist: HeistState, target: TargetDef, seed: number): void {
  const rng = seedRng(seed + 3333);
  const events: HeistEvent[] = [];

  // Escalation events based on tier
  if (target.tier >= 2) {
    events.push({
      type: "guard_shift",
      triggerTime: 60 + rng() * 30,
      triggered: false,
      message: "Guard shift change! New patrols incoming.",
    });
  }

  if (target.tier >= 3) {
    events.push({
      type: "elite_spawn",
      triggerTime: 90 + rng() * 30,
      triggered: false,
      message: "An elite guard has arrived!",
    });
  }

  if (heist.modifiers.includes("lockdown")) {
    events.push({
      type: "lockdown",
      triggerTime: 90,
      triggered: false,
      message: "LOCKDOWN! All doors are now locked!",
    });
  }

  if (heist.modifiers.includes("guard_rotation")) {
    events.push({
      type: "rotation_1",
      triggerTime: 45 + rng() * 15,
      triggered: false,
      message: "Guard rotation — fresh guards entering.",
    });
    events.push({
      type: "rotation_2",
      triggerTime: 100 + rng() * 20,
      triggered: false,
      message: "Second guard rotation!",
    });
  }

  // Primary loot alarm (when picked up, all guards alerted after delay)
  events.push({
    type: "primary_loot_alarm",
    triggerTime: -1, // triggered by condition, not time
    triggered: false,
    message: "The primary target is missing! Guards are on high alert!",
  });

  heist.events = events;
}

// ---------------------------------------------------------------------------
// Tick heist events
// ---------------------------------------------------------------------------

export function updateHeistEvents(heist: HeistState, dt: number): void {
  for (const event of heist.events) {
    if (event.triggered) continue;

    // Time-based events
    if (event.triggerTime >= 0 && heist.elapsedTime >= event.triggerTime) {
      triggerEvent(heist, event);
    }

    // Condition-based: primary loot alarm
    if (event.type === "primary_loot_alarm" && heist.primaryLootTaken) {
      event.triggerTime = heist.elapsedTime + 10; // 10 second delay after grab
      if (heist.elapsedTime >= event.triggerTime) {
        triggerEvent(heist, event);
      }
    }
  }

  // Update announcements
  for (let i = heist.announcements.length - 1; i >= 0; i--) {
    heist.announcements[i].timer -= dt;
    if (heist.announcements[i].timer <= 0) {
      heist.announcements.splice(i, 1);
    }
  }

  // Update particles
  for (let i = heist.particles.length - 1; i >= 0; i--) {
    const p = heist.particles[i];
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vy += 20 * dt; // gravity
    p.life -= dt;
    if (p.life <= 0) heist.particles.splice(i, 1);
  }

  // Decay screen shake
  if (heist.screenShake > 0) {
    heist.screenShake = Math.max(0, heist.screenShake - dt * 8);
  }
}

function triggerEvent(heist: HeistState, event: HeistEvent): void {
  event.triggered = true;
  heist.announcements.push({ text: event.message, color: 0xff6644, timer: 4 });
  heist.screenShake = 3;

  switch (event.type) {
    case "lockdown":
      // Lock all doors
      for (let y = 0; y < heist.map.height; y++) {
        for (let x = 0; x < heist.map.width; x++) {
          if (heist.map.tiles[y][x].type === "door") {
            heist.map.tiles[y][x].type = "locked_door";
          }
        }
      }
      break;

    case "guard_shift":
    case "rotation_1":
    case "rotation_2": {
      // Spawn 1-2 new guards from entry points
      const entry = heist.map.entryPoints[Math.floor(Math.random() * heist.map.entryPoints.length)];
      if (entry) {
        heist.guards.push({
          id: `event_guard_${heist.guards.length}`,
          x: entry.x, y: entry.y,
          angle: Math.random() * Math.PI * 2,
          patrolPath: [entry],
          patrolIndex: 0,
          patrolForward: true,
          speed: 1.5,
          alertLevel: AlertLevel.UNAWARE,
          alertTimer: 0,
          stunTimer: 0,
          sleepTimer: 0,
          investigating: null,
          canSeeThief: null,
          isElite: false,
          isDog: false,
          chasePath: [],
          lastKnownThiefPos: null,
          waitTimer: 0,
        });
      }
      break;
    }

    case "elite_spawn": {
      const entry = heist.map.entryPoints[0];
      if (entry) {
        heist.guards.push({
          id: `elite_event_${heist.guards.length}`,
          x: entry.x, y: entry.y,
          angle: Math.random() * Math.PI * 2,
          patrolPath: [entry],
          patrolIndex: 0,
          patrolForward: true,
          speed: 2.0,
          alertLevel: AlertLevel.SUSPICIOUS,
          alertTimer: ShadowhandConfig.ALERT_SUSPICIOUS_THRESHOLD,
          stunTimer: 0,
          sleepTimer: 0,
          investigating: null,
          canSeeThief: null,
          isElite: true,
          isDog: false,
          chasePath: [],
          lastKnownThiefPos: null,
          waitTimer: 0,
        });
      }
      break;
    }

    case "primary_loot_alarm":
      // All guards go suspicious
      for (const guard of heist.guards) {
        if (guard.alertTimer < ShadowhandConfig.ALERT_SUSPICIOUS_THRESHOLD) {
          guard.alertTimer = ShadowhandConfig.ALERT_SUSPICIOUS_THRESHOLD;
          guard.alertLevel = AlertLevel.SUSPICIOUS;
        }
      }
      heist.combo.perfectEscape = false;
      break;
  }
}

// ---------------------------------------------------------------------------
// Spawn particles
// ---------------------------------------------------------------------------

export function spawnParticles(heist: HeistState, x: number, y: number, color: number, count: number): void {
  for (let i = 0; i < count; i++) {
    heist.particles.push({
      x, y,
      vx: (Math.random() - 0.5) * 60,
      vy: -20 - Math.random() * 40,
      life: 0.5 + Math.random() * 0.8,
      maxLife: 1.3,
      color,
      size: 1 + Math.random() * 2,
    });
  }
}
