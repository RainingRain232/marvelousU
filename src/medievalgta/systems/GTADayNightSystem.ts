// GTADayNightSystem.ts – Day/night cycle with gameplay impact. No PixiJS.
import type { MedievalGTAState, GTANPC } from '../state/MedievalGTAState';
import {
  getTimeOfDay,
  isNightTime,
  getNPCScheduleEntry,
  SHADY_DEALER_DEFS,
} from '../config/MedievalGTAConfig';
import type { GTATimeOfDayDef } from '../config/MedievalGTAConfig';
import { NPC_DEFINITIONS } from '../config/NPCDefs';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function addNotif(state: MedievalGTAState, text: string, color: number, timer = 3.0): void {
  state.notifications.push({
    id: `notif_${state.nextId++}`,
    text,
    timer,
    color,
  });
}

// ─── Time-of-day transition tracking ─────────────────────────────────────────

function updateTimeOfDay(state: MedievalGTAState, dt: number): void {
  const dn = state.dayNight;
  const todDef = getTimeOfDay(state.dayTime);

  // Decrement notification cooldown
  if (dn.timeOfDayChangeTimer > 0) {
    dn.timeOfDayChangeTimer -= dt;
  }

  // Track day count
  if (dn.previousTimeOfDay === 'late_night' && todDef.id === 'dawn') {
    dn.dayCount++;
    if (dn.timeOfDayChangeTimer <= 0) {
      addNotif(state, `Day ${dn.dayCount} begins.`, 0xffcc44, 3.0);
      dn.timeOfDayChangeTimer = 5.0;
    }
  }

  // Detect time-of-day change
  if (todDef.id !== dn.currentTimeOfDay) {
    dn.previousTimeOfDay = dn.currentTimeOfDay;
    dn.currentTimeOfDay = todDef.id;

    if (dn.timeOfDayChangeTimer <= 0) {
      addNotif(state, todDef.name, 0xccccaa, 2.5);
      dn.timeOfDayChangeTimer = 5.0;

      // Special notifications for transitions
      if (todDef.id === 'evening') {
        addNotif(state, 'Shops are closing. Shady dealers emerge.', 0xaa88cc, 3.0);
      } else if (todDef.id === 'morning') {
        addNotif(state, 'Shops open for business. Dealers retreat.', 0xffcc44, 3.0);
      } else if (todDef.id === 'night') {
        addNotif(state, 'The streets grow dark and dangerous.', 0x6644aa, 3.0);
      }
    }
  }
}

// ─── NPC schedule enforcement ────────────────────────────────────────────────

/**
 * Apply NPC schedules: change behaviors based on time of day.
 * Only affects NPCs that are not currently in combat or fleeing.
 */
function updateNPCSchedules(state: MedievalGTAState): void {
  const dayTime = state.dayTime;

  for (const [, npc] of state.npcs) {
    if (npc.dead) continue;

    // Skip NPCs currently in combat behaviors
    if (
      npc.behavior === 'chase_player' ||
      npc.behavior === 'attack_player' ||
      npc.behavior === 'flee' ||
      npc.behavior === 'hunt_player' ||
      npc.behavior === 'ambush'
    ) {
      continue;
    }

    const scheduleEntry = getNPCScheduleEntry(npc.type, dayTime);
    if (!scheduleEntry) continue;

    // Apply scheduled behavior
    const targetBehavior = scheduleEntry.behavior;

    // Map 'sleep' to 'idle' (NPCs that are sleeping just stand still)
    if (targetBehavior === 'sleep') {
      if (npc.behavior !== 'idle' && npc.behavior !== 'stand') {
        npc.behavior = 'idle';
        npc.vel.x = 0;
        npc.vel.y = 0;
      }
    } else if (targetBehavior === 'patrol' && npc.patrolPath.length > 0) {
      if (npc.behavior !== 'patrol') {
        npc.behavior = 'patrol';
      }
    } else if (targetBehavior === 'wander') {
      if (npc.behavior === 'idle' || npc.behavior === 'stand') {
        npc.behavior = 'wander';
      }
    } else if (targetBehavior === 'stand' || targetBehavior === 'idle') {
      if (npc.behavior === 'wander' || npc.behavior === 'patrol') {
        npc.behavior = targetBehavior;
        npc.vel.x *= 0.3;
        npc.vel.y *= 0.3;
      }
    }

    // Apply speed multiplier from schedule
    // Store original speed from NPC_DEFINITIONS if needed
    const def = NPC_DEFINITIONS[npc.type];
    if (def) {
      npc.speed = def.speed * scheduleEntry.speedMult;
    }
  }
}

// ─── Guard patrol adjustments ────────────────────────────────────────────────

/**
 * Adjust guard alertness and aggression based on time of day.
 * At night, guards have shorter detection ranges but are more aggressive when alerted.
 */
function updateGuardBehaviorForTime(state: MedievalGTAState): void {
  const todDef = getTimeOfDay(state.dayTime);

  for (const [, npc] of state.npcs) {
    if (npc.dead) continue;
    if (npc.type !== 'guard' && npc.type !== 'knight' && npc.type !== 'archer_guard' && npc.type !== 'army_soldier') continue;

    const def = NPC_DEFINITIONS[npc.type];
    if (!def) continue;

    // Adjust alert and aggro radius based on time of day
    npc.alertRadius = def.alertRadius * todDef.guardAlertMult;
    npc.aggroRadius = def.aggroRadius * todDef.guardAlertMult;
  }
}

// ─── Shady dealer spawning/despawning ────────────────────────────────────────

function updateShadyDealers(state: MedievalGTAState): void {
  const nightActive = isNightTime(state.dayTime);

  // Initialize dealer state if empty
  if (state.shadyDealers.length === 0) {
    for (const dealerDef of SHADY_DEALER_DEFS) {
      state.shadyDealers.push({
        dealerId: dealerDef.id,
        spawned: false,
        npcId: null,
      });
    }
  }

  for (const dealerState of state.shadyDealers) {
    const dealerDef = SHADY_DEALER_DEFS.find(d => d.id === dealerState.dealerId);
    if (!dealerDef) continue;

    if (nightActive && !dealerState.spawned) {
      // Spawn the shady dealer
      const npcId = `shady_${state.nextId++}`;

      // Pick random dialog lines
      const dialogLines = dealerDef.dialogLines.slice(0, 2 + Math.floor(Math.random()));

      const npc: GTANPC = {
        id: npcId,
        type: 'criminal',  // shady dealers use criminal type
        name: dealerDef.name,
        pos: { x: dealerDef.pos.x, y: dealerDef.pos.y },
        vel: { x: 0, y: 0 },
        hp: 60,
        maxHp: 60,
        behavior: 'stand',
        facing: 0,
        facingDir: 's',
        patrolPath: [],
        patrolIndex: 0,
        patrolDir: 1,
        wanderTarget: null,
        wanderTimer: 0,
        chaseTimer: 0,
        attackTimer: 0,
        attackCooldown: 1.5,
        alertRadius: 60,
        aggroRadius: 0,  // don't aggro
        dialogLines,
        questId: null,
        onHorse: false,
        colorVariant: 2,
        dead: false,
        deathTimer: 0,
        homePos: { x: dealerDef.pos.x, y: dealerDef.pos.y },
        damage: 8,
        speed: 0,
      };

      state.npcs.set(npcId, npc);
      dealerState.spawned = true;
      dealerState.npcId = npcId;
    } else if (!nightActive && dealerState.spawned) {
      // Despawn the shady dealer
      if (dealerState.npcId) {
        state.npcs.delete(dealerState.npcId);
      }
      dealerState.spawned = false;
      dealerState.npcId = null;
    }
  }
}

// ─── Public API ──────────────────────────────────────────────────────────────

/** Get the current time-of-day definition. */
export function getCurrentTimeOfDay(state: MedievalGTAState): GTATimeOfDayDef {
  return getTimeOfDay(state.dayTime);
}

/** Check if shops are currently open. */
export function areShopsOpen(state: MedievalGTAState): boolean {
  return getTimeOfDay(state.dayTime).shopsOpen;
}

/** Get the crime detection multiplier for the current time. */
export function getCrimeDetectionMultiplier(state: MedievalGTAState): number {
  return getTimeOfDay(state.dayTime).crimeDetectionMult;
}

/** Get the ambient light level (0-1) for rendering. */
export function getAmbientLight(state: MedievalGTAState): number {
  return getTimeOfDay(state.dayTime).ambientLight;
}

/** Check if a shady dealer is available at the given position. */
export function findShadyDealerNear(
  state: MedievalGTAState,
  x: number,
  y: number,
  radius: number,
): string | null {
  for (const dealerState of state.shadyDealers) {
    if (!dealerState.spawned || !dealerState.npcId) continue;
    const npc = state.npcs.get(dealerState.npcId);
    if (!npc || npc.dead) continue;

    const d = Math.sqrt((npc.pos.x - x) ** 2 + (npc.pos.y - y) ** 2);
    if (d <= radius) return dealerState.dealerId;
  }
  return null;
}

// ─── Main update ────────────────────────────────────────────────────────────

export function updateDayNight(state: MedievalGTAState, dt: number): void {
  if (state.paused || state.gameOver) return;

  updateTimeOfDay(state, dt);
  updateNPCSchedules(state);
  updateGuardBehaviorForTime(state);
  updateShadyDealers(state);
}
