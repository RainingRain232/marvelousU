// ---------------------------------------------------------------------------
// Shadowhand mode — heist orchestration (tick loop, scoring, completion)
// ---------------------------------------------------------------------------

import type { ShadowhandState } from "../state/ShadowhandState";
import { ShadowhandPhase, AlertLevel, addLog, createHeistState } from "../state/ShadowhandState";
import { TARGET_DEFS, type TargetDef } from "../config/TargetDefs";
import { ShadowhandConfig, getDifficulty } from "../config/ShadowhandConfig";
import { getEquipmentById } from "../config/EquipmentDefs";
import { CREW_ARCHETYPES } from "../config/CrewDefs";
import { generateHeistMap } from "./MapGenerator";
import { spawnGuards, updateGuardMovement, checkGuardCatchThief, spawnReinforcements } from "./GuardAI";
import { updateThiefMovement, createThiefUnit, updateSmoke, updateShadowMeld } from "./ThiefSystem";
import { updateGuardVision } from "./VisionSystem";
import { updateNoiseEvents, guardsHearNoise, updateGlobalAlert } from "./NoiseSystem";

export function initHeist(state: ShadowhandState): void {
  if (!state.currentTarget) return;

  const map = generateHeistMap(state.currentTarget, state.seed + state.guild.day);
  const heist = createHeistState(map);

  // Create thief units from selected crew at entry points
  const crew = state.guild.roster.filter(c => state.selectedCrew.includes(c.id) && c.alive && !c.captured);
  if (crew.length === 0) {
    addLog(state, "No available crew for this heist!");
    return;
  }

  for (let i = 0; i < crew.length; i++) {
    const entry = map.entryPoints[i % map.entryPoints.length];
    if (entry) {
      const thief = createThiefUnit(crew[i], entry.x, entry.y);

      // Apply equipment effects to thief
      applyEquipmentEffects(state, thief);

      heist.thieves.push(thief);
    }
  }

  // Select first thief
  if (heist.thieves.length > 0) heist.thieves[0].selected = true;

  // Spawn guards
  spawnGuards(heist, state.currentTarget, state.seed + state.guild.day + 500, state.difficulty);

  state.heist = heist;
  state.phase = ShadowhandPhase.HEIST;
  addLog(state, `Infiltrating ${state.currentTarget.name}...`);

  // Log crew abilities
  for (const thief of heist.thieves) {
    const cm = crew.find(c => c.id === thief.crewMemberId);
    const arch = CREW_ARCHETYPES[thief.role];
    if (cm) addLog(state, `${cm.name} (${arch.name}) ready.`);
  }
}

function applyEquipmentEffects(state: ShadowhandState, thief: import("../state/ShadowhandState").ThiefUnit): void {
  for (const equipId of state.selectedEquipment) {
    const invItem = state.guild.inventory.find(i => i.id === equipId && i.uses !== 0);
    if (!invItem) continue;
    const def = getEquipmentById(equipId);
    if (!def) continue;

    switch (def.effect.type) {
      case "dark_cloak":
        // Reduce detection — applied by reducing visibility check threshold
        // We store this as a speed bonus (thief becomes harder to see)
        thief.noiseLevel -= 0.2; // Lower ambient noise
        break;
      case "soft_boots":
        thief.speed *= 1.0; // Speed stays same, but noise reduces
        // Applied via noiseMultiplier reduction on the crew member
        break;
      case "disguise":
        // Available for charlatan to activate
        break;
      default:
        break;
    }
  }
}

export function updateHeist(state: ShadowhandState, dt: number): void {
  const heist = state.heist;
  if (!heist || heist.paused) return;

  const effectiveDt = dt * heist.speedMult;
  heist.elapsedTime += effectiveDt;

  // Update systems
  updateThiefMovement(heist, effectiveDt);
  updateGuardMovement(heist, effectiveDt);
  updateGuardVision(heist, state.difficulty, effectiveDt);
  updateNoiseEvents(heist, effectiveDt);
  guardsHearNoise(heist);
  updateGlobalAlert(heist, effectiveDt);
  updateSmoke(heist, effectiveDt);
  updateShadowMeld(heist);

  // Check for catches
  const caught = checkGuardCatchThief(heist);
  for (const id of caught) {
    const crewMember = state.guild.roster.find(c => c.id === id);
    if (crewMember) {
      crewMember.captured = true;
      crewMember.alive = false;
      addLog(state, `${crewMember.name} has been captured!`);
    }
  }

  // Spawn reinforcements if alarmed
  if (heist.globalAlert === AlertLevel.ALARMED) {
    spawnReinforcements(heist, state.seed);
  }

  // Check completion — all thieves escaped or otherwise no longer active
  if (heist.allEscaped) {
    completeHeist(state);
  }

  // Check total failure — all crew captured/dead (not escaped)
  const allDead = heist.thieves.every(t => !t.alive);
  const anyEscaped = heist.thieves.some(t => t.escaped);
  if (allDead && !anyEscaped) {
    failHeist(state);
  }
}

function completeHeist(state: ShadowhandState): void {
  const heist = state.heist!;
  const target = state.currentTarget!;
  const diff = getDifficulty(state.difficulty);

  // Calculate score
  let lootValue = 0;
  for (const loot of heist.lootCollected) lootValue += loot.value;

  const goldEarned = Math.floor(lootValue * ShadowhandConfig.FENCE_CUT * diff.lootMult);
  state.guild.gold += goldEarned;
  state.guild.totalLootValue += lootValue;

  let score = lootValue * ShadowhandConfig.SCORE_PER_LOOT_GOLD;

  // Ghost bonus: no guard ever reached suspicious
  const wasGhost = heist.guards.every(g => g.alertTimer < ShadowhandConfig.ALERT_SUSPICIOUS_THRESHOLD);
  const wasStealth = heist.globalAlert === AlertLevel.UNAWARE;

  if (wasGhost) {
    score += ShadowhandConfig.SCORE_GHOST_BONUS;
    state.guild.perfectHeists++;
    addLog(state, "Ghost bonus! No one even noticed.");
  } else if (wasStealth) {
    score += ShadowhandConfig.SCORE_STEALTH_BONUS;
    addLog(state, "Stealth bonus! No alarms triggered.");
  }

  if (heist.elapsedTime < ShadowhandConfig.SCORE_SPEED_BONUS_THRESHOLD) {
    score += ShadowhandConfig.SCORE_SPEED_BONUS;
    addLog(state, "Speed bonus!");
  }

  // Escaped crew count
  const escapedCrew = heist.thieves.filter(t => t.escaped);
  score += escapedCrew.length * ShadowhandConfig.SCORE_CREW_ALIVE_BONUS;

  state.score += score;
  state.guild.reputation += score;

  // Update tier
  for (let i = ShadowhandConfig.TIER_THRESHOLDS.length - 1; i >= 0; i--) {
    if (state.guild.reputation >= ShadowhandConfig.TIER_THRESHOLDS[i]) {
      state.guild.tier = i;
      break;
    }
  }

  // Add heat
  state.guild.heat.set("default", (state.guild.heat.get("default") ?? 0) + ShadowhandConfig.HEAT_PER_HEIST * diff.heatMult);

  // Record completion
  if (!state.guild.completedHeists.includes(target.id)) {
    state.guild.completedHeists.push(target.id);
  }
  state.guild.day++;

  // XP to escaped crew — leveling now improves abilities
  const xpPerCrew = escapedCrew.length > 0 ? Math.floor(score / escapedCrew.length) : 0;
  for (const thief of escapedCrew) {
    const cm = state.guild.roster.find(c => c.id === thief.crewMemberId);
    if (cm) {
      cm.xp += xpPerCrew;
      const xpNeeded = cm.level * 200;
      if (cm.xp >= xpNeeded) {
        cm.xp -= xpNeeded;
        cm.level++;
        cm.maxHp += 10;
        cm.hp = cm.maxHp;
        // Level-up bonuses based on role
        const arch = CREW_ARCHETYPES[cm.role];
        cm.speed = Math.min(arch.speed + cm.level * 0.05, arch.speed * 1.5);
        cm.noiseMultiplier = Math.max(arch.noiseMultiplier - cm.level * 0.03, arch.noiseMultiplier * 0.5);
        cm.visionRange = arch.visionRange + Math.floor(cm.level / 3);
        addLog(state, `${cm.name} leveled up to ${cm.level}! Stats improved.`);
      }
    }
  }

  // Restore HP for surviving crew
  for (const thief of escapedCrew) {
    const cm = state.guild.roster.find(c => c.id === thief.crewMemberId);
    if (cm) {
      cm.hp = cm.maxHp;
    }
  }

  // Clean up used equipment
  state.guild.inventory = state.guild.inventory.filter(i => i.uses !== 0);

  addLog(state, `Heist complete! Earned ${goldEarned} gold. Score: ${score}`);

  if (target.id === "grail_vault") {
    state.phase = ShadowhandPhase.VICTORY;
  } else {
    state.phase = ShadowhandPhase.RESULTS;
  }
}

function failHeist(state: ShadowhandState): void {
  addLog(state, "All crew lost. The heist has failed.");
  state.guild.day++;

  const diff = getDifficulty(state.difficulty);
  state.guild.heat.set("default", (state.guild.heat.get("default") ?? 0) + ShadowhandConfig.HEAT_PER_HEIST * 2 * diff.heatMult);

  const aliveCrew = state.guild.roster.filter(c => c.alive && !c.captured);
  if (aliveCrew.length === 0) {
    state.phase = ShadowhandPhase.GAME_OVER;
  } else {
    state.phase = ShadowhandPhase.RESULTS;
  }
}

export function decayHeat(state: ShadowhandState): void {
  for (const [key, val] of state.guild.heat) {
    const newVal = Math.max(0, val - ShadowhandConfig.HEAT_DECAY_PER_DAY);
    if (newVal === 0) state.guild.heat.delete(key);
    else state.guild.heat.set(key, newVal);
  }
}

export function getAvailableTargets(state: ShadowhandState): TargetDef[] {
  const maxTier = Math.min(state.guild.tier + 1, 5);
  return TARGET_DEFS.filter(t => t.tier <= maxTier);
}

/** Check if equipment has uses remaining and consume one use */
export function consumeEquipment(state: ShadowhandState, equipId: string): boolean {
  const item = state.guild.inventory.find(i => i.id === equipId && (i.uses > 0 || i.uses === -1));
  if (!item) return false;
  if (item.uses > 0) item.uses--;
  return true;
}
