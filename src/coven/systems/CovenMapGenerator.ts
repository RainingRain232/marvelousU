// ---------------------------------------------------------------------------
// Coven mode — dark forest hex map generator
// ---------------------------------------------------------------------------

import { hexKey, hexNeighbors, hexDistance } from "@world/hex/HexCoord";
import type { HexCoord } from "@world/hex/HexCoord";
import type { CovenState, CovenHex, CovenTerrain, RitualComponent } from "../state/CovenState";
import { covenRng } from "../state/CovenState";
import { INGREDIENTS } from "../config/CovenRecipes";
import { getCreatureDef as getCreatureDefFn } from "../config/CovenCreatures";

function hexesInRadius(center: HexCoord, radius: number): HexCoord[] {
  const results: HexCoord[] = [];
  for (let q = -radius; q <= radius; q++) {
    const r1 = Math.max(-radius, -q - radius), r2 = Math.min(radius, -q + radius);
    for (let r = r1; r <= r2; r++) results.push({ q: center.q + q, r: center.r + r });
  }
  return results;
}

function pickTerrain(dist: number, maxDist: number, rng: () => number): CovenTerrain {
  const ratio = dist / maxDist;
  const roll = rng();
  // Center: clearings and deep woods. Edges: wilder terrain.
  if (dist <= 2) return roll < 0.6 ? "clearing" : "deep_woods";
  if (ratio < 0.3) {
    if (roll < 0.4) return "deep_woods";
    if (roll < 0.65) return "clearing";
    if (roll < 0.8) return "village";
    return "swamp";
  }
  if (ratio < 0.6) {
    if (roll < 0.3) return "deep_woods";
    if (roll < 0.5) return "swamp";
    if (roll < 0.65) return "graveyard";
    if (roll < 0.8) return "ruins";
    return "cave";
  }
  // Outer ring: dangerous terrain + ley lines
  if (roll < 0.2) return "ley_line";
  if (roll < 0.4) return "cave";
  if (roll < 0.55) return "graveyard";
  if (roll < 0.7) return "ruins";
  if (roll < 0.85) return "deep_woods";
  return "swamp";
}

function placeIngredients(hex: CovenHex, rng: () => number): void {
  const available = INGREDIENTS.filter((i) => i.terrains.includes(hex.terrain) && rng() < i.rarity);
  hex.ingredients = available.map((i) => i.id);
}

export function generateCovenMap(state: CovenState): void {
  const rng = covenRng(state.seed + 9999);
  const radius = state.mapRadius;

  state.playerPosition = { q: 0, r: 0 };
  state.hideoutPosition = { q: 0, r: 0 };

  const allCoords = hexesInRadius({ q: 0, r: 0 }, radius);

  for (const coord of allCoords) {
    const key = hexKey(coord.q, coord.r);
    const dist = hexDistance(coord, { q: 0, r: 0 });

    // Edge = water
    if (dist >= radius) {
      const hex: CovenHex = { coord, key, terrain: "water", revealed: false, visited: false, ingredients: [], creatureId: null, wardId: null, wardDurability: 0, lightLevel: 0, ritualComponent: null, inquisitorPatrol: false };
      state.hexes.set(key, hex);
      continue;
    }

    const terrain = pickTerrain(dist, radius, rng);
    const hex: CovenHex = { coord, key, terrain, revealed: false, visited: false, ingredients: [], creatureId: null, wardId: null, wardDurability: 0, lightLevel: 0, ritualComponent: null, inquisitorPatrol: false };
    placeIngredients(hex, rng);
    state.hexes.set(key, hex);
  }

  // Hideout hex = clearing at center
  const hideoutKey = hexKey(0, 0);
  const hideout = state.hexes.get(hideoutKey);
  if (hideout) {
    hideout.terrain = "clearing";
    hideout.revealed = true;
    hideout.visited = true;
    hideout.lightLevel = 2;
  }

  // Place ritual components on specific far hexes
  const components: RitualComponent[] = ["moonstone_tear", "dragon_blood", "silver_mirror", "living_flame", "crown_of_thorns"];
  const farHexes = Array.from(state.hexes.values())
    .filter((h) => h.terrain !== "water" && hexDistance(h.coord, { q: 0, r: 0 }) >= radius - 3)
    .sort(() => rng() - 0.5);

  // Place ritual components with guardian creatures
  const guardianTypes = ["wight", "dark_knight", "wraith", "drake", "bog_beast"];
  for (let i = 0; i < components.length && i < farHexes.length; i++) {
    farHexes[i].ritualComponent = components[i];
    // Place a guardian creature on the component hex
    const guardType = guardianTypes[i % guardianTypes.length];
    const guardDef = getCreatureDefFn(guardType);
    if (guardDef) {
      const creature = {
        id: `guardian_${i}`,
        type: guardType,
        hp: Math.floor(guardDef.hp * 1.5), // guardians are 50% tougher
        maxHp: Math.floor(guardDef.hp * 1.5),
        damage: guardDef.damage,
        position: farHexes[i].coord,
        nocturnalOnly: false, // guardians are always present
        loot: [...guardDef.loot],
      };
      farHexes[i].creatureId = creature.id;
      state.creatures.push(creature);
    }
  }

  // Reveal starting area
  revealAround(state, state.playerPosition, 2);
  updateAdjacentHexes(state);
}

export function revealAround(state: CovenState, center: HexCoord, radius: number): void {
  for (const c of hexesInRadius(center, radius)) {
    const key = hexKey(c.q, c.r);
    const hex = state.hexes.get(key);
    if (hex) { hex.revealed = true; state.revealedKeys.add(key); }
  }
}

export function updateAdjacentHexes(state: CovenState): void {
  state.adjacentHexes = hexNeighbors(state.playerPosition).filter((n) => {
    const hex = state.hexes.get(hexKey(n.q, n.r));
    return hex && hex.terrain !== "water";
  });
}

export function updateLighting(state: CovenState): void {
  const isNight = state.phase === CovenPhase.NIGHT || state.phase === CovenPhase.DUSK;
  void hexKey(state.playerPosition.q, state.playerPosition.r);

  for (const [, hex] of state.hexes) {
    if (!hex.revealed) { hex.lightLevel = 0; continue; }
    const dist = hexDistance(hex.coord, state.playerPosition);
    if (!isNight) {
      hex.lightLevel = 2; // daytime = fully lit
    } else {
      // Night: only player vicinity is lit
      if (dist <= 1) hex.lightLevel = 2;
      else if (dist <= 2) hex.lightLevel = 1;
      else hex.lightLevel = 0;
    }
    // Wards provide light
    if (hex.wardId) hex.lightLevel = Math.max(hex.lightLevel, 1);
    // Hideout is always lit
    if (hex.key === hexKey(state.hideoutPosition.q, state.hideoutPosition.r)) hex.lightLevel = 2;
  }
}

// Need to import CovenPhase for lighting check
import { CovenPhase } from "../state/CovenState";
