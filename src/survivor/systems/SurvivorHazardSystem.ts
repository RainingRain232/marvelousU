// ---------------------------------------------------------------------------
// Survivor hazard system — map hazards + timed events
// ---------------------------------------------------------------------------

import { MapType } from "@/types";
import type { SurvivorState, SurvivorHazard, SurvivorTimedEvent } from "../state/SurvivorState";

// ---------------------------------------------------------------------------
// Hazard generation per map type
// ---------------------------------------------------------------------------

function _generateHazards(state: SurvivorState): SurvivorHazard[] {
  const hazards: SurvivorHazard[] = [];
  const { mapWidth, mapHeight, mapType } = state;

  let type: SurvivorHazard["type"];
  let count: number;
  let damage: number;
  let slowFactor: number;
  let speedBonus: number;
  let minRadius: number;
  let maxRadius: number;

  switch (mapType) {
    case MapType.VOLCANIC:
      type = "lava"; count = 12; damage = 15; slowFactor = 1; speedBonus = 0; minRadius = 2; maxRadius = 4;
      break;
    case MapType.TUNDRA:
      type = "ice"; count = 15; damage = 0; slowFactor = 1; speedBonus = 0.5; minRadius = 3; maxRadius = 5;
      break;
    case MapType.SWAMP:
      type = "fog"; count = 10; damage = 0; slowFactor = 0.6; speedBonus = 0; minRadius = 4; maxRadius = 6;
      break;
    case MapType.FOREST:
      type = "thorns"; count = 18; damage = 5; slowFactor = 0.8; speedBonus = 0; minRadius = 1.5; maxRadius = 3;
      break;
    default:
      return hazards; // no hazards for meadow/desert
  }

  for (let i = 0; i < count; i++) {
    const margin = 5;
    hazards.push({
      id: state.nextHazardId++,
      type,
      position: {
        x: margin + Math.random() * (mapWidth - margin * 2),
        y: margin + Math.random() * (mapHeight - margin * 2),
      },
      radius: minRadius + Math.random() * (maxRadius - minRadius),
      damage,
      slowFactor,
      speedBonus,
    });
  }

  return hazards;
}

// ---------------------------------------------------------------------------
// Timed events
// ---------------------------------------------------------------------------

const TIMED_EVENTS: Omit<SurvivorTimedEvent, "remaining">[] = [
  {
    id: "blood_moon",
    name: "BLOOD MOON",
    duration: 60,
    spawnRateMultiplier: 2.0,
    enemySpeedMultiplier: 1.3,
    xpMultiplier: 2.0,
    color: 0xff2222,
  },
  {
    id: "treasure_rain",
    name: "TREASURE RAIN",
    duration: 30,
    spawnRateMultiplier: 0.5,
    enemySpeedMultiplier: 1.0,
    xpMultiplier: 1.0,
    color: 0xffd700,
  },
  {
    id: "eclipse",
    name: "ECLIPSE",
    duration: 45,
    spawnRateMultiplier: 1.5,
    enemySpeedMultiplier: 1.2,
    xpMultiplier: 1.5,
    color: 0x6644aa,
  },
];

type EventCallback = ((event: SurvivorTimedEvent | null) => void) | null;
let _eventCallback: EventCallback = null;

// Treasure rain chest timer
let _treasureTimer = 0;

export const SurvivorHazardSystem = {
  setEventCallback(cb: EventCallback): void { _eventCallback = cb; },

  init(state: SurvivorState): void {
    state.hazards = _generateHazards(state);
    _treasureTimer = 0;
  },

  update(state: SurvivorState, dt: number): void {
    if (state.paused || state.levelUpPending || state.gameOver || state.victory) return;

    const px = state.player.position.x;
    const py = state.player.position.y;

    // Apply hazard effects to player
    for (const h of state.hazards) {
      const dx = px - h.position.x;
      const dy = py - h.position.y;
      if (dx * dx + dy * dy < h.radius * h.radius) {
        // Damage
        if (h.damage > 0 && state.player.invincibilityTimer <= 0) {
          state.player.hp -= h.damage * dt;
          if (state.player.hp <= 0) {
            state.player.hp = 0;
            state.gameOver = true;
          }
        }
      }
    }

    // Timed event lifecycle
    if (state.activeEvent) {
      state.activeEvent.remaining -= dt;

      // Treasure Rain: spawn chests periodically
      if (state.activeEvent.id === "treasure_rain") {
        _treasureTimer -= dt;
        if (_treasureTimer <= 0) {
          _treasureTimer = 3; // every 3 seconds
          const chestTypes = ["gold", "heal"] as const;
          state.chests.push({
            id: state.nextChestId++,
            position: {
              x: px + (Math.random() * 2 - 1) * 15,
              y: py + (Math.random() * 2 - 1) * 10,
            },
            alive: true,
            type: chestTypes[Math.floor(Math.random() * chestTypes.length)],
            value: 30 + Math.floor(state.gameTime / 60) * 10,
          });
        }
      }

      if (state.activeEvent.remaining <= 0) {
        state.activeEvent = null;
        _eventCallback?.(null);
      }
    } else {
      // Cooldown to next event
      state.eventCooldown -= dt;
      if (state.eventCooldown <= 0) {
        // Trigger random event
        const eventDef = TIMED_EVENTS[Math.floor(Math.random() * TIMED_EVENTS.length)];
        state.activeEvent = { ...eventDef, remaining: eventDef.duration };
        state.eventCooldown = 180 + Math.random() * 120; // 3-5 minutes
        _treasureTimer = 0;
        _eventCallback?.(state.activeEvent);
      }
    }
  },
};
