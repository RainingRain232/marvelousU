// ============================================================================
// CivAI.ts — AI opponent logic for Arthurian Civilization
// ============================================================================

import {
  CIV_UNIT_DEFS, CIV_DIFFICULTY, TERRAIN_TYPES, MIN_CITY_DISTANCE,
} from "./CivConfig";

import {
  type CivGameState, type CivUnit, type CivCity, type CivPlayer,
  getUnit, getCity, getNeighbors, hexDistance,
  foundCity, moveUnitTo, removeUnit, findPath,
  getAvailableTechs, setResearch, getBuildableItems,
  getReachableTiles, getAttackableTiles,
  resolveCombat, isAtWar, setDiplomacyRelation, getDiplomacy,
  processEndTurn, addEvent,
  buildImprovement, getValidImprovements,
  getAvailableHeroes, recruitHero, autoExploreUnit,
} from "./CivState";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Lightweight seeded RNG so AI decisions are reproducible within a turn. */
function aiRng(seed: number): () => number {
  let s = seed | 0 || 1;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

/** Pick a random element from an array using the provided rng. */
function pick<T>(arr: T[], rng: () => number): T | undefined {
  if (arr.length === 0) return undefined;
  return arr[Math.floor(rng() * arr.length)];
}

/** Weighted random selection. weights[i] corresponds to items[i]. */
function weightedPick<T>(items: T[], weights: number[], rng: () => number): T | undefined {
  if (items.length === 0) return undefined;
  const total = weights.reduce((a, b) => a + Math.max(0, b), 0);
  if (total <= 0) return pick(items, rng);
  let r = rng() * total;
  for (let i = 0; i < items.length; i++) {
    r -= Math.max(0, weights[i]);
    if (r <= 0) return items[i];
  }
  return items[items.length - 1];
}

/** Clamp a number between min and max. */
function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}

/** Check whether a tile is passable land. */
function isPassableLand(state: CivGameState, x: number, y: number): boolean {
  if (x < 0 || y < 0 || x >= state.mapWidth || y >= state.mapHeight) return false;
  const terrain = state.tiles[y][x].terrain;
  const def = TERRAIN_TYPES[terrain];
  return def ? def.passable : false;
}

/** Count military units a player controls. */
function countMilitary(state: CivGameState, player: CivPlayer): number {
  let n = 0;
  for (const uid of player.unitIds) {
    const u = getUnit(state, uid);
    if (u) {
      const def = CIV_UNIT_DEFS[u.type];
      if (def && def.unitClass !== "settler" && def.unitClass !== "worker" && def.unitClass !== "scout") {
        n++;
      }
    }
  }
  return n;
}

/** Rough military power estimate for a player. */
function militaryStrength(state: CivGameState, player: CivPlayer): number {
  let str = 0;
  for (const uid of player.unitIds) {
    const u = getUnit(state, uid);
    if (u) str += u.attack + u.defense + u.hp * 0.1;
  }
  return str;
}

/** Check if any enemy units are within a given range of (cx, cy). */
function enemyUnitsNearby(
  state: CivGameState, playerIndex: number, cx: number, cy: number, range: number,
): CivUnit[] {
  const enemies: CivUnit[] = [];
  for (const unit of state.units) {
    if (unit.owner !== playerIndex && hexDistance(cx, cy, unit.x, unit.y) <= range) {
      if (isAtWar(state, playerIndex, unit.owner)) {
        enemies.push(unit);
      }
    }
  }
  return enemies;
}

/** Find closest enemy city to a given position. */
function closestEnemyCity(
  state: CivGameState, playerIndex: number, x: number, y: number,
): CivCity | null {
  let best: CivCity | null = null;
  let bestDist = Infinity;
  for (const city of state.cities) {
    if (city.owner !== playerIndex && isAtWar(state, playerIndex, city.owner)) {
      const d = hexDistance(x, y, city.x, city.y);
      if (d < bestDist) {
        bestDist = d;
        best = city;
      }
    }
  }
  return best;
}

// ---------------------------------------------------------------------------
// Main AI class
// ---------------------------------------------------------------------------

export class CivAI {

  // =========================================================================
  // Public entry point — called once per AI player per turn
  // =========================================================================

  static runTurn(state: CivGameState, playerIndex: number): void {
    const player = state.players[playerIndex];
    if (!player || !player.alive) return;

    // Deterministic-ish seed per turn/player so behaviour varies but is stable.
    const rng = aiRng(state.turn * 1000 + playerIndex * 37 + 42);

    CivAI._chooseResearch(state, player, rng);
    CivAI._manageCities(state, player, rng);
    CivAI._manageUnits(state, player, rng);
    CivAI._handleDiplomacy(state, player, rng);
    CivAI._handleHeroRecruitment(state, player, playerIndex, rng);

    processEndTurn(state, playerIndex);
  }

  // =========================================================================
  // 1. Research
  // =========================================================================

  private static _chooseResearch(
    state: CivGameState, player: CivPlayer, rng: () => number,
  ): void {
    if (player.currentTech) return; // already researching

    const available = getAvailableTechs(player);
    if (available.length === 0) return;

    const atWar = state.players.some(
      (p) => p.index !== player.index && p.alive && isAtWar(state, player.index, p.index),
    );

    // Score each tech
    const scores: number[] = available.map((tech) => {
      let score = 10; // base

      // Prefer techs that unlock things
      score += tech.unlocks.length * 5;

      // Branch preference based on personality & war status
      const personality = player.factionDef.aiPersonality;

      if (atWar) {
        // Prefer military-relevant branches
        if (tech.branch === "chivalry") score += 15;
        if (tech.branch === "statecraft") score += 8;
      } else {
        // Prefer economic / research
        if (tech.branch === "statecraft") score += 12;
        if (tech.branch === "sorcery") score += 8;
        if (tech.branch === "faith") score += 5;
      }

      // Personality modifiers
      if (personality === "aggressive" && tech.branch === "chivalry") score += 10;
      if (personality === "defensive" && tech.branch === "statecraft") score += 10;
      if (personality === "diplomatic" && tech.branch === "statecraft") score += 10;
      if (personality === "expansionist" && tech.branch === "statecraft") score += 8;
      if (personality === "balanced") score += 3; // slight uniform boost

      // Prefer cheaper techs slightly (faster progress)
      score += Math.max(0, 10 - tech.cost / 20);

      // Random noise for variety
      score += rng() * 8;

      return score;
    });

    const chosen = weightedPick(available, scores, rng);
    if (chosen) {
      setResearch(state, player.index, chosen.id);
    }
  }

  // =========================================================================
  // 2. City management — build queues
  // =========================================================================

  private static _manageCities(
    state: CivGameState, player: CivPlayer, rng: () => number,
  ): void {
    const totalCities = player.cityIds.length;

    for (const cityId of player.cityIds) {
      const city = getCity(state, cityId);
      if (!city) continue;
      if (city.buildQueue.length > 0) continue; // already building something

      const buildable = getBuildableItems(state, city);
      const choice = CivAI._pickProduction(state, player, city, buildable, totalCities, rng);
      if (choice) {
        city.buildQueue.push(choice);
      }
    }
  }

  private static _pickProduction(
    state: CivGameState,
    player: CivPlayer,
    city: CivCity,
    buildable: { units: string[]; buildings: string[]; wonders: string[] },
    totalCities: number,
    rng: () => number,
  ): string | null {
    const personality = player.factionDef.aiPersonality;
    const nearbyEnemies = enemyUnitsNearby(state, player.index, city.x, city.y, 6);
    const hasBuilding = (id: string) => city.buildings.includes(id);
    const canUnit = (id: string) => buildable.units.includes(id);
    const canBldg = (id: string) => buildable.buildings.includes(id);

    // --- Late game urgency: after turn 80, prioritize military and victory ---
    if (state.turn > 80) {
      // Rush holy grail if we have the tech
      if (player.techs.includes("grail_quest") && buildable.wonders.includes("holy_grail")) {
        city.buildQueue.push("holy_grail");
        return "holy_grail";
      }

      // More aggressive military production in late game
      const militaryCount = countMilitary(state, player);
      const lateGameDesired = totalCities * 3 + 4;
      if (militaryCount < lateGameDesired) {
        const mPick = CivAI._pickMilitaryUnit(buildable.units, rng);
        if (mPick) return mPick;
      }
    }

    // --- Priority 0: Ensure we are researching something before building ---
    if (!player.currentTech) {
      const availTechs = getAvailableTechs(player);
      if (availTechs.length > 0) {
        setResearch(state, player.index, availTechs[0].id);
      }
    }

    // --- Priority 0b: Happiness emergency — build chapel/cathedral if happiness low ---
    if (city.happiness < 2) {
      if (!hasBuilding("cathedral") && canBldg("cathedral")) return "cathedral";
      if (!hasBuilding("chapel") && canBldg("chapel")) return "chapel";
      if (!hasBuilding("abbey") && canBldg("abbey")) return "abbey";
    }

    // --- Priority 1: Expand early if we have few cities (only if gold can sustain) ---
    const wantExpand = personality === "expansionist" ? 5 : 3;
    if (totalCities < wantExpand && canUnit("settler") && player.gold > 30) {
      // Don't make a settler if this city has population 1 (it would starve)
      if (city.population >= 2) {
        return "settler";
      }
    }

    // --- Priority 2: Under threat — build military + defensive walls ---
    if (nearbyEnemies.length > 0) {
      // Walls first if we don't have them
      if (!hasBuilding("palisade") && canBldg("palisade")) return "palisade";
      if (!hasBuilding("stone_wall") && canBldg("stone_wall")) return "stone_wall";
      const militaryPick = CivAI._pickMilitaryUnit(buildable.units, rng);
      if (militaryPick) return militaryPick;
    }

    // --- Priority 3: Essential buildings ---
    if (!hasBuilding("barracks") && canBldg("barracks")) return "barracks";
    if (!hasBuilding("granary") && canBldg("granary")) return "granary";
    if (!hasBuilding("palisade") && canBldg("palisade")) return "palisade";

    // --- Priority 4: Economic buildings ---
    if (!hasBuilding("blacksmith") && canBldg("blacksmith")) return "blacksmith";
    if (!hasBuilding("marketplace") && canBldg("marketplace")) return "marketplace";
    if (!hasBuilding("great_hall") && canBldg("great_hall")) return "great_hall";

    // --- Priority 5: Military buildings for advanced units ---
    if (!hasBuilding("stables") && canBldg("stables")) return "stables";

    // --- Priority 6: Defensive buildings ---
    if (!hasBuilding("stone_wall") && canBldg("stone_wall")) return "stone_wall";

    // --- Priority 7: Research / culture buildings ---
    if (!hasBuilding("scriptorium") && canBldg("scriptorium")) return "scriptorium";
    if (!hasBuilding("chapel") && canBldg("chapel")) return "chapel";

    // --- Priority 8: Wonders (AI loves wonders) ---
    if (buildable.wonders.length > 0 && rng() < 0.4) {
      return pick(buildable.wonders, rng) ?? null;
    }

    // --- Priority 9: More advanced buildings ---
    const advancedBuildings = ["guild_hall", "abbey", "enchanted_tower", "harbor",
      "alchemist", "curtain_wall", "cathedral", "jousting_grounds", "watchtower"];
    for (const bId of advancedBuildings) {
      if (!hasBuilding(bId) && canBldg(bId)) return bId;
    }

    // --- Fallback: alternate military / worker ---
    const militaryCount = countMilitary(state, player);
    const desiredMilitary = totalCities * 2 + 2;

    if (militaryCount < desiredMilitary) {
      const mPick = CivAI._pickMilitaryUnit(buildable.units, rng);
      if (mPick) return mPick;
    }

    // Build a worker if we have fewer workers than cities
    if (canUnit("worker")) {
      const workerCount = player.unitIds.reduce((n, uid) => {
        const u = getUnit(state, uid);
        return n + (u && u.type === "worker" ? 1 : 0);
      }, 0);
      if (workerCount < totalCities) return "worker";
    }

    // Scout if we have none
    if (canUnit("scout")) {
      const scoutCount = player.unitIds.reduce((n, uid) => {
        const u = getUnit(state, uid);
        return n + (u && u.type === "scout" ? 1 : 0);
      }, 0);
      if (scoutCount === 0) return "scout";
    }

    // Last resort: any available military unit
    const mPick = CivAI._pickMilitaryUnit(buildable.units, rng);
    if (mPick) return mPick;

    // If truly nothing, pick any buildable unit or building
    if (buildable.units.length > 0) return pick(buildable.units, rng) ?? null;
    if (buildable.buildings.length > 0) return pick(buildable.buildings, rng) ?? null;

    return null;
  }

  /** Pick a military unit to build, preferring stronger ones. */
  private static _pickMilitaryUnit(available: string[], rng: () => number): string | null {
    // Preference order: strongest first
    const preferred = [
      "grail_knight", "enchanted_champion", "knight", "man_at_arms",
      "longbowman", "mounted_sergeant", "fae_warrior", "trebuchet",
      "siege_ram", "spearmen", "warband",
    ];

    // Also consider faction unique units
    const allMilitary = available.filter((id) => {
      const def = CIV_UNIT_DEFS[id];
      return def && def.unitClass !== "settler" && def.unitClass !== "worker"
        && def.unitClass !== "scout" && def.unitClass !== "naval"
        && def.unitClass !== "special";
    });

    if (allMilitary.length === 0) return null;

    // Check preferred order first
    for (const pref of preferred) {
      if (allMilitary.includes(pref)) {
        // 70% chance to pick highest-priority available; 30% to keep looking
        if (rng() < 0.7) return pref;
      }
    }

    // Fallback: weight by attack power
    const weights = allMilitary.map((id) => {
      const def = CIV_UNIT_DEFS[id];
      return def ? def.attack + def.defense : 1;
    });
    return weightedPick(allMilitary, weights, rng) ?? allMilitary[0];
  }

  // =========================================================================
  // 3. Unit management — movement, combat, settling
  // =========================================================================

  private static _manageUnits(
    state: CivGameState, player: CivPlayer, rng: () => number,
  ): void {
    // Copy the id list since we may modify it during iteration (e.g. founding city removes settler)
    const unitIds = [...player.unitIds];

    for (const uid of unitIds) {
      const unit = getUnit(state, uid);
      if (!unit || unit.owner !== player.index) continue;
      if (unit.movement <= 0) continue;

      const def = CIV_UNIT_DEFS[unit.type];
      if (!def) continue;

      if (def.unitClass === "settler") {
        CivAI._handleSettler(state, player, unit, rng);
      } else if (def.unitClass === "scout") {
        unit.autoExplore = true;
        autoExploreUnit(state, unit);
        CivAI._handleScout(state, player, unit, rng);
      } else if (def.unitClass === "worker") {
        // Workers: just move toward unimproved tiles near owned cities (simplified)
        CivAI._handleWorker(state, player, unit, rng);
      } else {
        // Military unit
        CivAI._handleMilitary(state, player, unit, rng);
      }
    }
  }

  // --- Settler logic ---

  private static _handleSettler(
    state: CivGameState, player: CivPlayer, unit: CivUnit, rng: () => number,
  ): void {
    // Check if current tile is a good city spot
    const currentScore = CivAI._scoreCityLocation(state, player, unit.x, unit.y);
    if (currentScore >= 12 && CivAI._canFoundHere(state, player, unit.x, unit.y)) {
      foundCity(state, player.index, unit.x, unit.y);
      removeUnit(state, unit.id);
      addEvent(state, player.index,
        `${player.factionDef.name} founded a new city.`);
      return;
    }

    // Search for best city location within a reasonable radius
    let bestX = -1, bestY = -1, bestScore = -Infinity;
    const searchRadius = 10;
    for (let dy = -searchRadius; dy <= searchRadius; dy++) {
      for (let dx = -searchRadius; dx <= searchRadius; dx++) {
        const tx = unit.x + dx;
        const ty = unit.y + dy;
        if (tx < 0 || ty < 0 || tx >= state.mapWidth || ty >= state.mapHeight) continue;
        if (hexDistance(unit.x, unit.y, tx, ty) > searchRadius) continue;
        if (!CivAI._canFoundHere(state, player, tx, ty)) continue;

        const score = CivAI._scoreCityLocation(state, player, tx, ty) + rng() * 2;
        if (score > bestScore) {
          bestScore = score;
          bestX = tx;
          bestY = ty;
        }
      }
    }

    if (bestX >= 0 && bestY >= 0) {
      // Move toward best location
      CivAI._moveToward(state, unit, bestX, bestY);

      // If we arrived, found the city
      if (unit.x === bestX && unit.y === bestY) {
        foundCity(state, player.index, unit.x, unit.y);
        removeUnit(state, unit.id);
        addEvent(state, player.index,
          `${player.factionDef.name} founded a new city.`);
      }
    } else {
      // Just wander to explore
      CivAI._moveRandomly(state, unit, rng);
    }
  }

  /** Check if a city can be founded at (x, y). */
  private static _canFoundHere(
    state: CivGameState, _player: CivPlayer, x: number, y: number,
  ): boolean {
    if (!isPassableLand(state, x, y)) return false;

    // Must not be too close to existing cities
    for (const city of state.cities) {
      if (hexDistance(x, y, city.x, city.y) < MIN_CITY_DISTANCE) {
        return false;
      }
    }

    // Tile must not already be a city tile
    if (state.tiles[y][x].cityId > 0) return false;

    return true;
  }

  // --- Scout logic ---

  private static _handleScout(
    state: CivGameState, player: CivPlayer, unit: CivUnit, rng: () => number,
  ): void {
    const visibility = state.visibility[player.index];
    const reachable = getReachableTiles(state, unit);
    if (reachable.length === 0) return;

    // Prefer tiles that reveal unexplored areas
    let bestTile: { x: number; y: number } | null = null;
    let bestUnexplored = -1;

    for (const tile of reachable) {
      // Count unexplored neighbors around this tile
      const neighbors = getNeighbors(tile.x, tile.y, state.mapWidth, state.mapHeight);
      let unexplored = 0;
      for (const nb of neighbors) {
        if (visibility && visibility[nb.y] && visibility[nb.y][nb.x] === 0) {
          unexplored++;
        }
      }
      // Add a bit of distance preference to spread out exploration
      unexplored += rng() * 0.5;

      if (unexplored > bestUnexplored) {
        bestUnexplored = unexplored;
        bestTile = tile;
      }
    }

    if (bestTile && bestUnexplored > 0) {
      moveUnitTo(state, unit.id, bestTile.x, bestTile.y);
    } else {
      // Nothing unexplored nearby — wander toward map edges
      CivAI._moveRandomly(state, unit, rng);
    }
  }

  // --- Worker logic — build improvements on owned tiles ---

  private static _handleWorker(
    state: CivGameState, player: CivPlayer, unit: CivUnit, _rng: () => number,
  ): void {
    // 1. If standing on a tile that has valid improvements and no improvement yet, build one
    const currentTile = state.tiles[unit.y]?.[unit.x];
    if (currentTile && currentTile.owner === player.index) {
      const validHere = getValidImprovements(state, unit.x, unit.y);
      if (validHere.length > 0) {
        // Pick the best improvement based on city needs
        let improvement = "road";
        // Find nearest city to gauge food vs production needs
        let nearestCity: CivCity | null = null;
        let nearestDist = Infinity;
        for (const cid of player.cityIds) {
          const city = getCity(state, cid);
          if (!city) continue;
          const d = hexDistance(unit.x, unit.y, city.x, city.y);
          if (d < nearestDist) { nearestDist = d; nearestCity = city; }
        }
        if (nearestCity) {
          const food = nearestCity.food ?? 0;
          const prod = nearestCity.production ?? 0;
          if (validHere.includes("farm") && food <= prod) {
            improvement = "farm";
          } else if (validHere.includes("mine") && prod <= food) {
            improvement = "mine";
          } else if (validHere.includes("lumber_camp")) {
            improvement = "lumber_camp";
          } else if (validHere.includes("farm")) {
            improvement = "farm";
          } else if (validHere.includes("mine")) {
            improvement = "mine";
          } else if (validHere.includes("holy_shrine")) {
            improvement = "holy_shrine";
          }
        } else if (validHere.includes("farm")) {
          improvement = "farm";
        }
        buildImprovement(state, unit.x, unit.y, improvement);
        unit.movement = 0;
        return;
      }
    }

    // 2. Find nearest owned tile without improvement that has valid improvements
    let bestTileX = -1, bestTileY = -1, bestDist = Infinity;
    const searchRange = 12;
    for (let dy = -searchRange; dy <= searchRange; dy++) {
      for (let dx = -searchRange; dx <= searchRange; dx++) {
        const tx = unit.x + dx;
        const ty = unit.y + dy;
        if (tx < 0 || ty < 0 || tx >= state.mapWidth || ty >= state.mapHeight) continue;
        const tile = state.tiles[ty][tx];
        if (tile.owner !== player.index) continue;
        if (tile.improvement) continue;
        const valid = getValidImprovements(state, tx, ty);
        if (valid.length === 0) continue;
        const d = hexDistance(unit.x, unit.y, tx, ty);
        if (d < bestDist) {
          bestDist = d;
          bestTileX = tx;
          bestTileY = ty;
        }
      }
    }

    if (bestTileX >= 0 && bestTileY >= 0) {
      CivAI._moveToward(state, unit, bestTileX, bestTileY);
      return;
    }

    // 3. No owned tiles need improvement — move toward unclaimed land near cities
    let closestCity: CivCity | null = null;
    let closestCityDist = Infinity;
    for (const cid of player.cityIds) {
      const city = getCity(state, cid);
      if (!city) continue;
      const d = hexDistance(unit.x, unit.y, city.x, city.y);
      if (d < closestCityDist) {
        closestCityDist = d;
        closestCity = city;
      }
    }
    if (closestCity) {
      CivAI._moveToward(state, unit, closestCity.x, closestCity.y);
    }
  }

  // --- Military unit logic ---

  private static _handleMilitary(
    state: CivGameState, player: CivPlayer, unit: CivUnit, rng: () => number,
  ): void {
    // 0. Heal at cities when HP < 50%
    if (unit.hp < unit.maxHp * 0.5) {
      let nearestOwnCity: CivCity | null = null;
      let nearestCityDist = Infinity;
      for (const cid of player.cityIds) {
        const city = getCity(state, cid);
        if (!city) continue;
        const d = hexDistance(unit.x, unit.y, city.x, city.y);
        if (d < nearestCityDist) { nearestCityDist = d; nearestOwnCity = city; }
      }
      if (nearestOwnCity) {
        // If already on a city tile, stay put (heal passively)
        if (unit.x === nearestOwnCity.x && unit.y === nearestOwnCity.y) {
          unit.movement = 0; // rest to heal
          return;
        }
        CivAI._moveToward(state, unit, nearestOwnCity.x, nearestOwnCity.y);
        return;
      }
    }

    // 1. Check for attackable targets
    const attackable = getAttackableTiles(state, unit);
    if (attackable.length > 0) {
      // Find the best target among attackable tiles
      let bestTarget: CivUnit | null = null;
      let bestScore = -Infinity;

      for (const tile of attackable) {
        const tileData = state.tiles[tile.y][tile.x];
        for (const targetId of tileData.unitIds) {
          const target = getUnit(state, targetId);
          if (!target || target.owner === player.index) continue;
          if (!isAtWar(state, player.index, target.owner)) continue;

          // Prefer weaker targets (low HP) and high-value targets
          const killChance = (unit.attack / Math.max(1, target.defense)) *
            (unit.hp / unit.maxHp);
          const valueScore = target.attack + target.defense;
          // Heavily prefer wounded enemies — easier kills
          const woundedBonus = (1 - target.hp / target.maxHp) * 15;
          const score = killChance * 10 + valueScore + woundedBonus;

          if (score > bestScore) {
            bestScore = score;
            bestTarget = target;
          }
        }
      }

      if (bestTarget) {
        // Move adjacent if needed for melee, then attack
        const dist = hexDistance(unit.x, unit.y, bestTarget.x, bestTarget.y);
        const unitDef = CIV_UNIT_DEFS[unit.type];
        const isRanged = unitDef?.ranged ?? false;

        if (!isRanged && dist > 1) {
          // Need to move closer first
          CivAI._moveToward(state, unit, bestTarget.x, bestTarget.y);
        }

        // Attack if still in range
        if (unit.movement > 0) {
          const targetX = bestTarget.x;
          const targetY = bestTarget.y;
          resolveCombat(state, unit.id, bestTarget.id);

          // After killing a defender, move onto the tile to capture any city there
          if (unit.movement > 0 && !getUnit(state, bestTarget.id)) {
            const targetTile = state.tiles[targetY]?.[targetX];
            if (targetTile && targetTile.cityId > 0) {
              // City tile — check if no more enemy units remain
              const remainingEnemies = targetTile.unitIds.filter(uid => {
                const u = getUnit(state, uid);
                return u && u.owner !== player.index;
              });
              if (remainingEnemies.length === 0) {
                moveUnitTo(state, unit.id, targetX, targetY);
              }
            }
          }
          return;
        }
      }
    }

    // 1b. Defend threatened own cities — redirect if a city has enemies within 3 tiles and < 2 defenders
    let threatenedCity: CivCity | null = null;
    let worstThreatScore = -Infinity;
    for (const cid of player.cityIds) {
      const city = getCity(state, cid);
      if (!city) continue;
      const threats = state.units.filter(u =>
        u.owner !== player.index &&
        isAtWar(state, player.index, u.owner) &&
        hexDistance(u.x, u.y, city.x, city.y) <= 3
      );
      if (threats.length === 0) continue;
      const tile = state.tiles[city.y]?.[city.x];
      const defenders = tile ? tile.unitIds.filter(uid => {
        const u = getUnit(state, uid);
        return u && u.owner === player.index;
      }).length : 0;
      if (defenders < 2) {
        const threatScore = threats.length * 3 - defenders;
        if (threatScore > worstThreatScore) {
          worstThreatScore = threatScore;
          threatenedCity = city;
        }
      }
    }

    if (threatenedCity) {
      const distToThreat = hexDistance(unit.x, unit.y, threatenedCity.x, threatenedCity.y);
      // Only redirect units that are reasonably close (within 8 tiles)
      if (distToThreat <= 8) {
        CivAI._moveToward(state, unit, threatenedCity.x, threatenedCity.y);
        return;
      }
    }

    // 1c. Target nearby enemy cities — prefer weakly defended ones
    let bestCityTarget: { x: number; y: number; score: number } | null = null;
    for (const city of state.cities) {
      if (city.owner === player.index) continue;
      if (!isAtWar(state, player.index, city.owner)) continue;
      const dist = hexDistance(unit.x, unit.y, city.x, city.y);
      if (dist <= 10) {
        // Count defenders
        const tile = state.tiles[city.y]?.[city.x];
        const defenderCount = tile ? tile.unitIds.filter(uid => {
          const u = getUnit(state, uid);
          return u && u.owner === city.owner;
        }).length : 0;

        // Prefer weakly defended cities — distance + defender penalty
        const score = dist + defenderCount * 3;
        if (!bestCityTarget || score < bestCityTarget.score) {
          bestCityTarget = { x: city.x, y: city.y, score };
        }
      }
    }

    if (bestCityTarget) {
      CivAI._moveToward(state, unit, bestCityTarget.x, bestCityTarget.y);
      return;
    }

    // 2. No immediate combat — move strategically
    // If at war, march toward enemy cities but try to group up first
    const enemyCity = closestEnemyCity(state, player.index, unit.x, unit.y);
    if (enemyCity) {
      const distToTarget = hexDistance(unit.x, unit.y, enemyCity.x, enemyCity.y);

      // Group up before attacking: count friendly military units within 3 tiles
      let nearbyFriendlyMilitary = 0;
      for (const uid of player.unitIds) {
        if (uid === unit.id) continue;
        const ally = getUnit(state, uid);
        if (!ally) continue;
        const def = CIV_UNIT_DEFS[ally.type];
        if (!def || def.unitClass === "settler" || def.unitClass === "worker" || def.unitClass === "scout") continue;
        if (hexDistance(unit.x, unit.y, ally.x, ally.y) <= 3) {
          nearbyFriendlyMilitary++;
        }
      }

      // If close to enemy city, wait for reinforcements (need 2+ allies nearby)
      if (distToTarget <= 4 && nearbyFriendlyMilitary < 2) {
        // Hold position and wait for more units, unless we have overwhelming HP
        if (unit.hp >= unit.maxHp * 0.8) {
          // Don't retreat, just slow advance — move only if we have support or are far
          return;
        }
      }

      CivAI._moveToward(state, unit, enemyCity.x, enemyCity.y);
      return;
    }

    // 3. Patrol: look for nearby enemy units within a wider radius
    const nearEnemies = enemyUnitsNearby(state, player.index, unit.x, unit.y, 8);
    if (nearEnemies.length > 0) {
      // Prefer attacking weakened enemies first
      let bestEnemy = nearEnemies[0];
      let bestEnemyScore = -Infinity;
      for (const enemy of nearEnemies) {
        const d = hexDistance(unit.x, unit.y, enemy.x, enemy.y);
        // Score: prefer close enemies and wounded enemies
        const score = -d * 2 + (1 - enemy.hp / enemy.maxHp) * 10;
        if (score > bestEnemyScore) {
          bestEnemyScore = score;
          bestEnemy = enemy;
        }
      }
      CivAI._moveToward(state, unit, bestEnemy.x, bestEnemy.y);
      return;
    }

    // 4. Garrison near own cities if no threats
    const personality = player.factionDef.aiPersonality;
    if (personality === "defensive" || rng() < 0.3) {
      // Find the least-defended city
      let weakestCity: CivCity | null = null;
      let leastDefenders = Infinity;
      for (const cid of player.cityIds) {
        const city = getCity(state, cid);
        if (!city) continue;
        const defenders = state.tiles[city.y][city.x].unitIds.length;
        if (defenders < leastDefenders) {
          leastDefenders = defenders;
          weakestCity = city;
        }
      }
      if (weakestCity && hexDistance(unit.x, unit.y, weakestCity.x, weakestCity.y) > 0) {
        CivAI._moveToward(state, unit, weakestCity.x, weakestCity.y);
        return;
      }
    }

    // 5. Wander / patrol randomly
    CivAI._moveRandomly(state, unit, rng);
  }

  // =========================================================================
  // 4. Diplomacy
  // =========================================================================

  private static _handleDiplomacy(
    state: CivGameState, player: CivPlayer, rng: () => number,
  ): void {
    const myStrength = militaryStrength(state, player);
    const personality = player.factionDef.aiPersonality;
    const faction = player.faction;
    const myMilCount = countMilitary(state, player);

    // Determine personality-based war advantage threshold
    const aggressiveFactions = ["orkney", "saxons", "benwick"];
    const defensiveFactions = ["gwynedd", "annwn"];
    let warAdvantageThreshold = 2.0; // default: need 2x military units to consider war
    if (aggressiveFactions.includes(faction)) {
      warAdvantageThreshold = 1.5;
    } else if (defensiveFactions.includes(faction)) {
      warAdvantageThreshold = 3.0;
    }

    for (const other of state.players) {
      if (other.index === player.index || !other.alive) continue;
      if (other.isHuman && state.phase !== "playing") continue;

      const diplo = getDiplomacy(state, player.index, other.index);
      if (!diplo) continue;

      const theirStrength = militaryStrength(state, other);
      const strengthRatio = myStrength / Math.max(1, theirStrength);
      const theirMilCount = countMilitary(state, other);
      const milCountRatio = myMilCount / Math.max(1, theirMilCount);

      if (diplo.relation === "peace") {
        // --- Alliance forming: ally against common enemies ---
        const myEnemies = player.diplomacy
          .filter(d => d.relation === "war").map(d => d.targetPlayer);
        const theirEnemies = other.diplomacy
          .filter(d => d.relation === "war").map(d => d.targetPlayer);
        const commonEnemies = myEnemies.filter(e => theirEnemies.includes(e));

        if (commonEnemies.length > 0 && diplo.attitude > -20) {
          setDiplomacyRelation(state, player.index, other.index, "alliance");
          addEvent(state, player.index,
            `${player.factionDef.name} forms an alliance with ${other.factionDef.name} against a common foe.`);
          continue;
        }

        // --- Consider declaring war ---
        let warChance = 0;

        // Base aggression from difficulty
        const diffDef = CIV_DIFFICULTY[state.difficulty];
        if (diffDef) warChance += (diffDef as { aiAggressionBonus?: number }).aiAggressionBonus ?? 0;

        // Personality influence
        if (personality === "aggressive") warChance += 0.06;
        if (personality === "expansionist") warChance += 0.03;
        if (personality === "defensive") warChance -= 0.04;
        if (personality === "diplomatic") warChance -= 0.06;

        // Military unit count advantage (personality-scaled threshold)
        if (milCountRatio > warAdvantageThreshold) warChance += 0.12;

        // Strength advantage makes war more likely
        if (strengthRatio > 1.8) warChance += 0.08;
        if (strengthRatio > 2.5) warChance += 0.10;

        // Low chivalry factions are more belligerent
        if (player.chivalry < 30) warChance += 0.04;

        // Less likely to attack if we already have wars
        const activeWars = state.players.filter(
          (p) => p.index !== player.index && p.alive && isAtWar(state, player.index, p.index),
        ).length;
        warChance -= activeWars * 0.05;

        // Attitude affects likelihood
        warChance -= diplo.attitude * 0.002;

        // Turns at peace reduce war likelihood initially
        if (diplo.turnsAtPeace < 15) warChance -= 0.03;

        // Bonus if target is already fighting someone else (opportunistic)
        const targetAtWar = other.diplomacy.some(d => d.relation === "war" && d.targetPlayer !== player.index);
        if (targetAtWar) warChance += 0.15;

        // Late game aggression — more wars after turn 80
        if (state.turn > 80) warChance += 0.08;
        if (state.turn > 120) warChance += 0.06;

        warChance = clamp(warChance, 0, 0.25);

        if (rng() < warChance) {
          setDiplomacyRelation(state, player.index, other.index, "war");
          addEvent(state, player.index,
            `${player.factionDef.name} declares war on ${other.factionDef.name}!`);
        }
      } else if (diplo.relation === "alliance") {
        // --- Break alliance if ally becomes too powerful (> 2x our score) ---
        if (other.score > player.score * 2) {
          setDiplomacyRelation(state, player.index, other.index, "peace");
          addEvent(state, player.index,
            `${player.factionDef.name} breaks their alliance with ${other.factionDef.name} — they have grown too powerful.`);
        }
      } else if (diplo.relation === "war") {
        // Consider making peace
        let peaceChance = 0;

        // Losing badly? Seek peace.
        if (strengthRatio < 0.5) peaceChance += 0.15;
        if (strengthRatio < 0.3) peaceChance += 0.20;

        // Losing cities
        if (player.cityIds.length <= 1) peaceChance += 0.10;

        // Long wars exhaust everyone
        peaceChance += diplo.turnsAtWar * 0.01;

        // Diplomatic factions prefer peace
        if (personality === "diplomatic") peaceChance += 0.08;
        if (personality === "defensive") peaceChance += 0.04;
        if (personality === "aggressive") peaceChance -= 0.06;

        peaceChance = clamp(peaceChance, 0, 0.40);

        if (rng() < peaceChance) {
          setDiplomacyRelation(state, player.index, other.index, "peace");
          addEvent(state, player.index,
            `${player.factionDef.name} makes peace with ${other.factionDef.name}.`);
        }
      }
    }
  }

  // =========================================================================
  // 5. Hero recruitment
  // =========================================================================

  private static _handleHeroRecruitment(
    state: CivGameState, player: CivPlayer, playerIndex: number, rng: () => number,
  ): void {
    // Try to recruit a hero if we can afford it and have fewer than 2 heroes
    const availableHeroes = getAvailableHeroes(state, playerIndex);
    if (availableHeroes.length > 0 && player.gold > 150 && player.heroes.length < 2) {
      const heroId = availableHeroes[Math.floor(rng() * availableHeroes.length)];
      recruitHero(state, playerIndex, heroId);
      addEvent(state, playerIndex,
        `${player.factionDef.name} recruits a legendary hero!`);
    }
  }

  // =========================================================================
  // 6. City location scoring
  // =========================================================================

  private static _scoreCityLocation(
    state: CivGameState, player: CivPlayer, x: number, y: number,
  ): number {
    if (!isPassableLand(state, x, y)) return -100;

    let score = 0;

    // Score surrounding tiles for food, production, gold
    const neighbors = getNeighbors(x, y, state.mapWidth, state.mapHeight);
    const allTiles = [{ x, y }, ...neighbors];

    // Also get second ring for a broader picture
    const secondRing: { x: number; y: number }[] = [];
    for (const nb of neighbors) {
      for (const nb2 of getNeighbors(nb.x, nb.y, state.mapWidth, state.mapHeight)) {
        if (nb2.x === x && nb2.y === y) continue;
        if (allTiles.some((t) => t.x === nb2.x && t.y === nb2.y)) continue;
        if (!secondRing.some((t) => t.x === nb2.x && t.y === nb2.y)) {
          secondRing.push(nb2);
        }
      }
    }

    // Inner ring: full value
    for (const tile of allTiles) {
      const terrain = state.tiles[tile.y]?.[tile.x]?.terrain;
      const tDef = terrain ? TERRAIN_TYPES[terrain] : null;
      if (tDef) {
        score += tDef.food * 1.5;     // food is most important
        score += tDef.production * 1.2;
        score += tDef.gold * 0.8;

        // Bonus for special terrain
        if (terrain === "holy_spring") score += 3;
        if (terrain === "roman_ruins") score += 3;
        if (terrain === "enchanted_forest") score += 2;

        // Penalty for impassable terrain in the city radius
        if (!tDef.passable) score -= 2;
      }
    }

    // Second ring: half value
    for (const tile of secondRing) {
      const terrain = state.tiles[tile.y]?.[tile.x]?.terrain;
      const tDef = terrain ? TERRAIN_TYPES[terrain] : null;
      if (tDef) {
        score += (tDef.food + tDef.production + tDef.gold) * 0.3;
      }
    }

    // River adjacency bonus
    for (const tile of allTiles) {
      if (state.tiles[tile.y]?.[tile.x]?.terrain === "river") {
        score += 3;
        break; // only count once
      }
    }

    // Penalise proximity to own cities (diminishing returns)
    for (const cid of player.cityIds) {
      const city = getCity(state, cid);
      if (!city) continue;
      const d = hexDistance(x, y, city.x, city.y);
      if (d < MIN_CITY_DISTANCE) return -100; // too close, forbidden
      if (d < MIN_CITY_DISTANCE + 2) score -= (MIN_CITY_DISTANCE + 2 - d) * 3;
    }

    // Slight bonus for being far from enemy cities (safer)
    for (const city of state.cities) {
      if (city.owner === player.index) continue;
      const d = hexDistance(x, y, city.x, city.y);
      if (d < 4) score -= 5;
    }

    // Penalty for wasteland
    if (state.tiles[y][x].terrain === "wasteland") score -= 10;

    return score;
  }

  // =========================================================================
  // Movement helpers
  // =========================================================================

  /** Move unit one step toward (targetX, targetY) using pathfinding. */
  private static _moveToward(
    state: CivGameState, unit: CivUnit, targetX: number, targetY: number,
  ): void {
    if (unit.x === targetX && unit.y === targetY) return;
    if (unit.movement <= 0) return;

    const path = findPath(state, unit, targetX, targetY);
    if (path && path.length > 0) {
      // Move along path as far as movement allows
      for (const step of path) {
        if (unit.movement <= 0) break;
        const moved = moveUnitTo(state, unit.id, step.x, step.y);
        if (!moved) break;
      }
    } else {
      // No path found — try moving to the reachable tile closest to target
      const reachable = getReachableTiles(state, unit);
      if (reachable.length === 0) return;

      let bestTile = reachable[0];
      let bestDist = hexDistance(bestTile.x, bestTile.y, targetX, targetY);
      for (let i = 1; i < reachable.length; i++) {
        const d = hexDistance(reachable[i].x, reachable[i].y, targetX, targetY);
        if (d < bestDist) {
          bestDist = d;
          bestTile = reachable[i];
        }
      }

      if (bestDist < hexDistance(unit.x, unit.y, targetX, targetY)) {
        moveUnitTo(state, unit.id, bestTile.x, bestTile.y);
      }
    }
  }

  /** Move unit to a random reachable tile. */
  private static _moveRandomly(
    state: CivGameState, unit: CivUnit, rng: () => number,
  ): void {
    if (unit.movement <= 0) return;

    const reachable = getReachableTiles(state, unit);
    if (reachable.length === 0) return;

    const target = pick(reachable, rng);
    if (target) {
      moveUnitTo(state, unit.id, target.x, target.y);
    }
  }
}
