// GTAHeistSystem.ts – Heist mission management. No PixiJS.
import type { MedievalGTAState, GTAHeistCrewMember } from '../state/MedievalGTAState';
import { HEIST_DEFS, isNightTime } from '../config/MedievalGTAConfig';
import { increaseWanted } from './GTAWantedSystem';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function dist(ax: number, ay: number, bx: number, by: number): number {
  return Math.sqrt((ax - bx) ** 2 + (ay - by) ** 2);
}

function addNotif(state: MedievalGTAState, text: string, color: number, timer = 3.0): void {
  state.notifications.push({
    id: `notif_${state.nextId++}`,
    text,
    timer,
    color,
  });
}

// ─── Start a heist ──────────────────────────────────────────────────────────

/** Begin a heist mission. Returns true on success. */
export function startHeist(
  state: MedievalGTAState,
  heistId: string,
): boolean {
  // Cannot start if a heist is already active
  if (state.activeHeist) {
    addNotif(state, 'A heist is already in progress!', 0xff8800);
    return false;
  }

  const def = HEIST_DEFS.find(h => h.id === heistId);
  if (!def) return false;

  // Check thieves guild rep
  const thievesRep = state.player.reputation.thieves_guild ?? 0;
  if (thievesRep < def.requiredRep) {
    addNotif(state, `Need ${def.requiredRep} Thieves Guild rep for this heist!`, 0xff8800);
    return false;
  }

  // Check night requirement
  if (def.nightOnly && !isNightTime(state.dayTime)) {
    addNotif(state, 'This heist can only be started at night!', 0xff8800);
    return false;
  }

  // Already completed (allow replay)
  // Build crew members from heist def
  const crewMembers: GTAHeistCrewMember[] = def.crewSlots.map(slot => ({
    role: slot.role,
    name: slot.name,
    hired: false,
    hireCost: slot.hireCost,
    successBonus: slot.successBonus,
  }));

  const firstPhase = def.phases[0];

  state.activeHeist = {
    heistId,
    currentPhaseIndex: 0,
    phase: firstPhase.phase,
    phaseTimer: firstPhase.duration,
    phaseComplete: false,
    crewMembers,
    totalSuccessBonus: 0,
    startTime: state.timeElapsed,
    lootCollected: 0,
    detected: false,
  };

  addNotif(state, `HEIST STARTED: ${def.name}`, 0xcc88ff, 4.0);
  addNotif(state, `Phase: ${firstPhase.name}`, 0xddaaff, 3.0);

  return true;
}

// ─── Hire crew member ───────────────────────────────────────────────────────

/** Hire a crew member for the active heist by role. Returns true on success. */
export function hireCrewMember(
  state: MedievalGTAState,
  role: string,
): boolean {
  const heist = state.activeHeist;
  if (!heist) return false;

  const def = HEIST_DEFS.find(h => h.id === heist.heistId);
  if (!def) return false;

  // Find the crew slot
  const member = heist.crewMembers.find(m => m.role === role && !m.hired);
  if (!member) {
    addNotif(state, 'No crew slot available for that role!', 0xff8800);
    return false;
  }

  // Check thieves guild rep for this slot
  const slotDef = def.crewSlots.find(s => s.role === role);
  if (!slotDef) return false;

  const thievesRep = state.player.reputation.thieves_guild ?? 0;
  if (thievesRep < slotDef.requiredRep) {
    addNotif(state, `Need ${slotDef.requiredRep} Thieves Guild rep to hire ${member.name}!`, 0xff8800);
    return false;
  }

  // Check gold
  if (state.player.gold < member.hireCost) {
    addNotif(state, `Not enough gold! Need ${member.hireCost}g`, 0xff8800);
    return false;
  }

  state.player.gold -= member.hireCost;
  member.hired = true;
  heist.totalSuccessBonus += member.successBonus;

  addNotif(state, `Hired ${member.name} (${member.role})`, 0x44ff44);

  return true;
}

// ─── Advance heist phase ────────────────────────────────────────────────────

function advanceHeistPhase(state: MedievalGTAState): void {
  const heist = state.activeHeist;
  if (!heist) return;

  const def = HEIST_DEFS.find(h => h.id === heist.heistId);
  if (!def) return;

  heist.currentPhaseIndex++;

  if (heist.currentPhaseIndex >= def.phases.length) {
    // All phases complete - resolve heist
    resolveHeist(state);
    return;
  }

  const nextPhase = def.phases[heist.currentPhaseIndex];
  heist.phase = nextPhase.phase;
  heist.phaseTimer = nextPhase.duration;
  heist.phaseComplete = false;

  addNotif(state, `Phase: ${nextPhase.name}`, 0xddaaff, 3.0);
  addNotif(state, nextPhase.description, 0xcccccc, 4.0);
}

// ─── Resolve heist outcome ──────────────────────────────────────────────────

function resolveHeist(state: MedievalGTAState): void {
  const heist = state.activeHeist;
  if (!heist) return;

  const def = HEIST_DEFS.find(h => h.id === heist.heistId);
  if (!def) return;

  // Calculate success chance
  const successChance = Math.min(0.95, def.baseSuccessChance + heist.totalSuccessBonus);
  const roll = Math.random();
  const success = roll < successChance;

  if (success) {
    // Heist succeeded
    const reward = def.reward + heist.lootCollected;
    state.player.gold += reward;

    addNotif(state, `HEIST COMPLETE: ${def.name}!`, 0x44ff44, 5.0);
    addNotif(state, `+${reward}g earned!`, 0xffdd00, 4.0);

    // Wanted level (may be reduced if undetected)
    if (!heist.detected) {
      addNotif(state, 'Clean getaway!', 0x44ff44, 3.0);
    } else {
      increaseWanted(state, def.successWantedIncrease);
      addNotif(state, `+${def.successWantedIncrease} wanted!`, 0xff8800, 3.0);
    }

    // Mark as completed
    if (!state.completedHeistIds.includes(def.id)) {
      state.completedHeistIds.push(def.id);
    }

    // Reputation effects
    _applyHeistReputationEffects(state, 'heist_complete');
  } else {
    // Heist failed
    addNotif(state, `HEIST FAILED: ${def.name}!`, 0xff0000, 5.0);
    addNotif(state, 'The guards are alerted!', 0xff4400, 4.0);
    increaseWanted(state, def.failWantedIncrease);

    _applyHeistReputationEffects(state, 'heist_fail');
  }

  state.activeHeist = null;
}

function _applyHeistReputationEffects(state: MedievalGTAState, action: string): void {
  // Inline reputation application to avoid circular imports
  const effects: Record<string, Array<{ faction: string; amount: number }>> = {
    heist_complete: [
      { faction: 'thieves_guild', amount: 20 },
      { faction: 'crown', amount: -15 },
      { faction: 'nobles', amount: -10 },
      { faction: 'merchants', amount: -5 },
    ],
    heist_fail: [
      { faction: 'thieves_guild', amount: -5 },
      { faction: 'crown', amount: -5 },
    ],
  };

  const repEffects = effects[action];
  if (!repEffects) return;

  for (const eff of repEffects) {
    const factionKey = eff.faction as keyof typeof state.player.reputation;
    if (factionKey in state.player.reputation) {
      const current = state.player.reputation[factionKey];
      state.player.reputation[factionKey] = Math.max(-100, Math.min(100, current + eff.amount));
    }
  }
}

// ─── Abort heist ────────────────────────────────────────────────────────────

/** Abort the current heist. */
export function abortHeist(state: MedievalGTAState): void {
  if (!state.activeHeist) return;

  const def = HEIST_DEFS.find(h => h.id === state.activeHeist!.heistId);
  const name = def ? def.name : 'heist';

  addNotif(state, `Heist aborted: ${name}`, 0xff8800, 3.0);

  // Small wanted increase for aborting
  if (state.activeHeist.phase === 'executing' || state.activeHeist.phase === 'escaping') {
    increaseWanted(state, 1);
  }

  state.activeHeist = null;
}

// ─── Main update ────────────────────────────────────────────────────────────

export function updateHeists(state: MedievalGTAState, dt: number): void {
  const heist = state.activeHeist;
  if (!heist) return;

  const def = HEIST_DEFS.find(h => h.id === heist.heistId);
  if (!def) {
    state.activeHeist = null;
    return;
  }

  const phaseDef = def.phases[heist.currentPhaseIndex];
  if (!phaseDef) {
    resolveHeist(state);
    return;
  }

  // Tick phase timer
  heist.phaseTimer -= dt;

  // Check phase completion conditions
  switch (phaseDef.requiredAction) {
    case 'go_to_location': {
      if (phaseDef.targetPos && phaseDef.targetRadius) {
        const d = dist(
          state.player.pos.x, state.player.pos.y,
          phaseDef.targetPos.x, phaseDef.targetPos.y,
        );
        if (d <= phaseDef.targetRadius) {
          if (!heist.phaseComplete) {
            heist.phaseComplete = true;
            addNotif(state, 'Location reached!', 0x44ff44);
          }
        }
      }
      break;
    }

    case 'recruit_crew': {
      // Phase complete when all crew members are hired or timer runs out
      const allHired = heist.crewMembers.every(m => m.hired);
      if (allHired && !heist.phaseComplete) {
        heist.phaseComplete = true;
        addNotif(state, 'Crew assembled!', 0x44ff44);
      }
      break;
    }

    case 'execute_plan': {
      // Auto-progress: phase completes when timer runs out
      if (heist.phaseTimer <= 0) {
        heist.phaseComplete = true;
      }

      // Random detection chance during execution
      if (!heist.detected && Math.random() < 0.003 * dt) {
        // Guards might detect you during the heist based on wanted level
        if (state.player.wantedLevel > 0) {
          heist.detected = true;
          addNotif(state, 'You have been spotted!', 0xff4400, 3.0);
        }
      }

      // Accumulate loot during execution
      if (!heist.phaseComplete) {
        heist.lootCollected += Math.floor(dt * 2);
      }
      break;
    }

    case 'escape': {
      if (phaseDef.targetPos && phaseDef.targetRadius) {
        const d = dist(
          state.player.pos.x, state.player.pos.y,
          phaseDef.targetPos.x, phaseDef.targetPos.y,
        );
        if (d <= phaseDef.targetRadius) {
          if (!heist.phaseComplete) {
            heist.phaseComplete = true;
            addNotif(state, 'Escape successful!', 0x44ff44);
          }
        }
      }
      break;
    }

    case 'wait': {
      if (heist.phaseTimer <= 0) {
        heist.phaseComplete = true;
      }
      break;
    }
  }

  // Phase timer expired without completion
  if (heist.phaseTimer <= 0 && !heist.phaseComplete) {
    // For go_to_location and escape, failure to reach in time = detected
    if (phaseDef.requiredAction === 'go_to_location' || phaseDef.requiredAction === 'escape') {
      heist.detected = true;
      addNotif(state, 'Time ran out! You were spotted!', 0xff4400, 3.0);
    }
    // Force advance anyway
    heist.phaseComplete = true;
  }

  // Advance to next phase when complete
  if (heist.phaseComplete) {
    advanceHeistPhase(state);
  }
}
