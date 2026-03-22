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
import { selectModifiers, applyModifiers, generateHeistEvents, updateHeistEvents, spawnParticles, MODIFIER_DISPLAY } from "./HeistEventSystem";

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

  // Select and apply heist modifiers
  const heat = state.guild.heat.get("default") ?? 0;
  heist.modifiers = selectModifiers(state.currentTarget, heat, state.seed + state.guild.day);
  applyModifiers(heist);
  generateHeistEvents(heist, state.currentTarget, state.seed + state.guild.day);

  // Apply guild upgrades
  if (state.guild.upgrades.has("escape_tunnels") && heist.map.entryPoints.length > 0) {
    // Add extra exit point
    const ep = heist.map.entryPoints[0];
    const oppositeX = heist.map.width - 1 - ep.x;
    const oppositeY = heist.map.height - 1 - ep.y;
    heist.map.exitPoints.push({ x: Math.max(1, oppositeX), y: Math.max(1, oppositeY) });
  }
  if (state.guild.upgrades.has("thieves_cant")) {
    for (const thief of heist.thieves) {
      // +1 vision range from shared signals (handled in ThiefSystem)
    }
  }

  state.heist = heist;
  state.phase = ShadowhandPhase.HEIST;
  state.guild.totalHeistsAttempted++;
  addLog(state, `Infiltrating ${state.currentTarget.name}...`);

  // Log active modifiers
  for (const mod of heist.modifiers) {
    const display = MODIFIER_DISPLAY[mod];
    addLog(state, `Modifier: ${display.name} — ${display.desc}`);
  }

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
  updateShadowMeld(heist, effectiveDt);
  updateHeistEvents(heist, effectiveDt);

  // Track combo: time in shadow
  for (const thief of heist.thieves) {
    if (!thief.alive) continue;
    const tx = Math.round(thief.x), ty = Math.round(thief.y);
    if (ty >= 0 && ty < heist.map.height && tx >= 0 && tx < heist.map.width) {
      if (!heist.map.tiles[ty][tx].lit) heist.combo.timeInShadow += effectiveDt;
    }
    heist.combo.timeTotal += effectiveDt;
  }

  // Track combo: alert breaks perfect escape
  if (heist.globalAlert >= AlertLevel.SUSPICIOUS) {
    heist.combo.perfectEscape = false;
  }

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

  // Combo bonuses
  const combo = heist.combo;
  if (combo.silentTakedowns >= 3) {
    const bonus = combo.silentTakedowns * 50;
    score += bonus;
    addLog(state, `Silent Takedown Streak x${combo.silentTakedowns}! +${bonus}`);
  }
  if (combo.timeTotal > 0 && combo.timeInShadow / combo.timeTotal > 0.8) {
    score += 200;
    addLog(state, "Shadow Master! 80%+ time in darkness. +200");
  }
  if (combo.torchesExtinguished >= 3) {
    score += combo.torchesExtinguished * 25;
    addLog(state, `Lights Out! ${combo.torchesExtinguished} torches doused.`);
  }
  if (combo.perfectEscape) {
    score += 300;
    addLog(state, "Perfect Escape! No alerts whatsoever. +300");
  }

  // Guild upgrade: fence contact
  if (state.guild.upgrades.has("fence_contact")) {
    const fenceBonus = Math.floor(goldEarned * 0.15);
    state.guild.gold += fenceBonus;
    addLog(state, `Master Fence bonus: +${fenceBonus}g`);
  }

  state.score += score;
  state.guild.reputation += score;

  // Update streaks
  state.guild.totalHeistsSucceeded++;
  state.guild.currentStreak++;
  state.guild.longestStreak = Math.max(state.guild.longestStreak, state.guild.currentStreak);

  // Check achievements
  checkAchievements(state, heist, score);

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
  const xpMult = state.guild.upgrades.has("training_ground") ? 1.5 : 1.0;
  const xpPerCrew = escapedCrew.length > 0 ? Math.floor(score * xpMult / escapedCrew.length) : 0;
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
  state.guild.currentStreak = 0;

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
  const decayMult = state.guild.upgrades.has("safe_house") ? 1.5 : 1.0;
  for (const [key, val] of state.guild.heat) {
    const newVal = Math.max(0, val - ShadowhandConfig.HEAT_DECAY_PER_DAY * decayMult);
    if (newVal === 0) state.guild.heat.delete(key);
    else state.guild.heat.set(key, newVal);
  }
  // Infirmary: heal all crew between heists
  if (state.guild.upgrades.has("infirmary")) {
    for (const cm of state.guild.roster) {
      if (cm.alive && !cm.captured) {
        cm.hp = cm.maxHp;
      }
    }
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

/** Check and award achievements */
function checkAchievements(state: ShadowhandState, heist: HeistState, score: number): void {
  const a = state.guild.achievements;

  if (!a.has("first_heist")) {
    a.add("first_heist");
    addLog(state, "\u2605 Achievement: First Blood — Complete your first heist");
  }

  if (heist.combo.perfectEscape && !a.has("ghost")) {
    a.add("ghost");
    addLog(state, "\u2605 Achievement: Ghost — Perfect escape with zero alerts");
  }

  if (state.guild.perfectHeists >= 5 && !a.has("phantom")) {
    a.add("phantom");
    addLog(state, "\u2605 Achievement: Phantom of Camelot — 5 ghost heists");
  }

  if (score >= 1000 && !a.has("big_score")) {
    a.add("big_score");
    addLog(state, "\u2605 Achievement: Big Score — Earn 1000+ points in one heist");
  }

  if (state.guild.currentStreak >= 5 && !a.has("unstoppable")) {
    a.add("unstoppable");
    addLog(state, "\u2605 Achievement: Unstoppable — 5 heists in a row");
  }

  if (state.guild.totalLootValue >= 5000 && !a.has("dragon_hoard")) {
    a.add("dragon_hoard");
    addLog(state, "\u2605 Achievement: Dragon's Hoard — 5000g total loot value");
  }

  if (heist.elapsedTime < 60 && !a.has("speed_demon")) {
    a.add("speed_demon");
    addLog(state, "\u2605 Achievement: Speed Demon — Complete heist in under 60s");
  }

  const maxLevel = Math.max(...state.guild.roster.map(c => c.level));
  if (maxLevel >= 5 && !a.has("veteran")) {
    a.add("veteran");
    addLog(state, "\u2605 Achievement: Veteran — Crew member reaches level 5");
  }

  if (state.currentTarget?.id === "grail_vault" && !a.has("grail_thief")) {
    a.add("grail_thief");
    addLog(state, "\u2605 Achievement: Grail Thief — Steal from the Grail Vault");
  }
}
