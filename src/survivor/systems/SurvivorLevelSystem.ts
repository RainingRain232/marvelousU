// ---------------------------------------------------------------------------
// Survivor level-up system — generates upgrade choices, applies selections
// ---------------------------------------------------------------------------

import { SurvivorBalance } from "../config/SurvivorBalanceConfig";
import {
  SurvivorWeaponId,
  SurvivorPassiveId,
  WEAPON_DEFS,
  PASSIVE_DEFS,
} from "../config/SurvivorWeaponDefs";
import { SYNERGY_DEFS } from "../config/SurvivorSynergyDefs";
import { SurvivorFusionSystem } from "./SurvivorFusionSystem";
import type { SurvivorState } from "../state/SurvivorState";

// ---------------------------------------------------------------------------
// Upgrade choice types
// ---------------------------------------------------------------------------

export interface UpgradeChoice {
  type: "weapon" | "passive";
  id: string; // SurvivorWeaponId or SurvivorPassiveId
  name: string;
  description: string;
  level: number; // level it will become (1 = new, >1 = upgrade)
  isNew: boolean;
  color: number;
}

// ---------------------------------------------------------------------------
// Generate choices
// ---------------------------------------------------------------------------

export function generateUpgradeChoices(state: SurvivorState): UpgradeChoice[] {
  const candidates: UpgradeChoice[] = [];

  // Weapons — existing upgradable ones
  for (const ws of state.weapons) {
    if (ws.level < SurvivorBalance.MAX_WEAPON_LEVEL && !ws.evolved) {
      const def = WEAPON_DEFS[ws.id];
      candidates.push({
        type: "weapon",
        id: ws.id,
        name: def.name,
        description: `Level ${ws.level + 1}: +dmg, -cooldown`,
        level: ws.level + 1,
        isNew: false,
        color: def.color,
      });
    }
  }

  // Weapons — new ones (if slot available)
  if (state.weapons.length < SurvivorBalance.MAX_WEAPON_SLOTS) {
    const ownedIds = new Set(state.weapons.map((w) => w.id));
    for (const wId of Object.values(SurvivorWeaponId)) {
      if (ownedIds.has(wId)) continue;
      const def = WEAPON_DEFS[wId];
      candidates.push({
        type: "weapon",
        id: wId,
        name: def.name,
        description: def.description,
        level: 1,
        isNew: true,
        color: def.color,
      });
    }
  }

  // Passives — existing upgradable ones
  for (const ps of state.passives) {
    if (ps.level < SurvivorBalance.MAX_PASSIVE_LEVEL) {
      const def = PASSIVE_DEFS[ps.id];
      candidates.push({
        type: "passive",
        id: ps.id,
        name: def.name,
        description: `Level ${ps.level + 1}`,
        level: ps.level + 1,
        isNew: false,
        color: 0x8899aa,
      });
    }
  }

  // Passives — new ones (if slot available)
  if (state.passives.length < SurvivorBalance.MAX_PASSIVE_SLOTS) {
    const ownedIds = new Set(state.passives.map((p) => p.id));
    for (const pId of Object.values(SurvivorPassiveId)) {
      if (ownedIds.has(pId)) continue;
      const def = PASSIVE_DEFS[pId];
      candidates.push({
        type: "passive",
        id: pId,
        name: def.name,
        description: def.description,
        level: 1,
        isNew: true,
        color: 0x8899aa,
      });
    }
  }

  // Shuffle and pick N
  _shuffle(candidates);
  return candidates.slice(0, SurvivorBalance.LEVEL_UP_CHOICES);
}

// ---------------------------------------------------------------------------
// Apply a chosen upgrade
// ---------------------------------------------------------------------------

export function applyUpgrade(state: SurvivorState, choice: UpgradeChoice): void {
  if (choice.type === "weapon") {
    const existing = state.weapons.find((w) => w.id === choice.id);
    if (existing) {
      existing.level = choice.level;
      // Check evolution
      _checkEvolution(state, existing);
    } else {
      state.weapons.push({
        id: choice.id as SurvivorWeaponId,
        level: 1,
        cooldownTimer: 0,
        evolved: false,
      });
    }
  } else {
    const existing = state.passives.find((p) => p.id === choice.id);
    if (existing) {
      existing.level = choice.level;
    } else {
      state.passives.push({
        id: choice.id as SurvivorPassiveId,
        level: 1,
      });
    }
    // Recalculate passive bonuses
    _recalcPassives(state);
  }

  // Check synergies
  _checkSynergies(state);

  // Check fusion synergies
  SurvivorFusionSystem.checkFusions(state);

  state.levelUpPending = false;
}

// ---------------------------------------------------------------------------
// Passive recalculation
// ---------------------------------------------------------------------------

function _recalcPassives(state: SurvivorState): void {
  const charDef = state.player.characterDef;
  let hpBonus = 0;
  let speedBonus = charDef.speedBonus;
  let areaBonus = charDef.areaBonus;
  let atkSpdBonus = 0;
  let critBonus = charDef.critBonus;
  let pickupBonus = 0;
  let xpBonus = 0;
  let regenBonus = charDef.regenBonus;

  for (const ps of state.passives) {
    const def = PASSIVE_DEFS[ps.id];
    hpBonus += def.hpPerLevel * ps.level;
    speedBonus += def.speedPerLevel * ps.level;
    areaBonus += def.areaPerLevel * ps.level;
    atkSpdBonus += def.attackSpeedPerLevel * ps.level;
    critBonus += def.critPerLevel * ps.level;
    pickupBonus += def.pickupRadiusPerLevel * ps.level;
    xpBonus += def.xpMultPerLevel * ps.level;
    regenBonus += def.regenPerLevel * ps.level;
  }

  const baseHp = SurvivorBalance.PLAYER_BASE_HP + charDef.hpBonus;
  state.player.maxHp = baseHp + hpBonus;
  state.player.hp = Math.min(state.player.hp, state.player.maxHp);
  state.player.speed = SurvivorBalance.PLAYER_SPEED * (1 + speedBonus);
  state.player.areaMultiplier = 1 + areaBonus;
  state.player.attackSpeedMultiplier = 1 + atkSpdBonus;
  state.player.critChance = 0.05 + critBonus;
  state.player.pickupRadius = SurvivorBalance.PLAYER_PICKUP_RADIUS + pickupBonus;
  state.player.xpMultiplier = 1 + xpBonus;
  state.player.regenRate = regenBonus;
}

// ---------------------------------------------------------------------------
// Evolution check
// ---------------------------------------------------------------------------

function _checkEvolution(state: SurvivorState, ws: { id: SurvivorWeaponId; level: number; evolved: boolean; evolutionId?: string }): void {
  if (ws.evolved) return;
  if (ws.level < SurvivorBalance.MAX_WEAPON_LEVEL) return;
  const def = WEAPON_DEFS[ws.id];
  if (!def.evolutionId || !def.evolutionPassive) return;

  const hasPassive = state.passives.some((p) => p.id === def.evolutionPassive);
  if (hasPassive) {
    ws.evolved = true;
    ws.evolutionId = def.evolutionId;
  }
}

// ---------------------------------------------------------------------------
// Synergy check
// ---------------------------------------------------------------------------

function _checkSynergies(state: SurvivorState): void {
  const ownedWeapons = new Set(state.weapons.map((w) => w.id));
  const ownedPassives = new Set(state.passives.map((p) => p.id));

  state.activeSynergies = [];
  for (const syn of SYNERGY_DEFS) {
    const hasWeapons = syn.requireWeapons.every((w) => ownedWeapons.has(w));
    const hasPassives = syn.requirePassives.every((p) => ownedPassives.has(p));
    if (hasWeapons && hasPassives) {
      state.activeSynergies.push(syn.id);
    }
  }
}

// ---------------------------------------------------------------------------
// Shuffle
// ---------------------------------------------------------------------------

function _shuffle<T>(arr: T[]): void {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}
