// ---------------------------------------------------------------------------
// Age of Wonders — Game State Creation & Map Generation
// ---------------------------------------------------------------------------

import {
  AoWPhase, AoWFaction, AoWTerrain,
  type AoWGameState, type AoWHex, type AoWCity, type AoWArmy, type AoWUnit, type AoWPlayer,
  hexKey, hexNeighbors, hexDistance,
} from "../AoWTypes";
import {
  AOW_BALANCE, AOW_TERRAIN, AOW_CITY_NAMES,
  getUnitsForFaction, getHeroForFaction, getFactionDef, AOW_SPELLS,
} from "../config/AoWConfig";

// ---------------------------------------------------------------------------
// Unique ID generator
// ---------------------------------------------------------------------------

let _nextId = 1;
function uid(): string { return `aow_${_nextId++}`; }

// ---------------------------------------------------------------------------
// Create a unit instance from a definition
// ---------------------------------------------------------------------------

export function createUnit(_defId: string, playerId: number, defs: any): AoWUnit {
  const def = defs;
  return {
    id: uid(),
    defId: def.id,
    playerId,
    hp: def.hp,
    maxHp: def.hp,
    attack: def.attack,
    defense: def.defense,
    damage: [...def.damage] as [number, number],
    speed: def.speed,
    range: def.range,
    abilities: [...def.abilities],
    xp: 0,
    level: 1,
    isHero: def.tier === 4,
    heroName: def.tier === 4 ? def.name : undefined,
  };
}

// ---------------------------------------------------------------------------
// Map generation
// ---------------------------------------------------------------------------

function _generateHexMap(radius: number): Map<string, AoWHex> {
  const hexes = new Map<string, AoWHex>();
  const terrainWeights: [AoWTerrain, number][] = [
    [AoWTerrain.PLAINS, 35],
    [AoWTerrain.FOREST, 25],
    [AoWTerrain.HILLS, 15],
    [AoWTerrain.MOUNTAIN, 8],
    [AoWTerrain.WATER, 10],
    [AoWTerrain.SWAMP, 5],
    [AoWTerrain.SNOW, 2],
  ];

  const totalWeight = terrainWeights.reduce((s, [, w]) => s + w, 0);

  function pickTerrain(): AoWTerrain {
    let r = Math.random() * totalWeight;
    for (const [t, w] of terrainWeights) {
      r -= w;
      if (r <= 0) return t;
    }
    return AoWTerrain.PLAINS;
  }

  // Generate raw hexes
  for (let q = -radius; q <= radius; q++) {
    for (let r = -radius; r <= radius; r++) {
      const s = -q - r;
      if (Math.abs(s) > radius) continue;
      const terrain = pickTerrain();
      const tDef = AOW_TERRAIN[terrain];
      const elev = tDef.elevationRange[0] +
        Math.floor(Math.random() * (tDef.elevationRange[1] - tDef.elevationRange[0] + 1));

      hexes.set(hexKey(q, r), {
        q, r, terrain, elevation: elev,
        explored: [false, false, false, false],
        cityId: null,
        resourceBonus: Math.random() < 0.1 ? (Math.random() < 0.5 ? 1 : 2) : 0,
        decoration: Math.random() < 0.08 ? "ruins" :
          Math.random() < 0.05 ? "shrine" :
          Math.random() < 0.06 ? "stone" :
          Math.random() < 0.06 ? "tree" : "none",
      });
    }
  }

  // Smooth terrain: make clusters more natural
  for (let pass = 0; pass < 2; pass++) {
    for (const [_key, hex] of hexes) {
      const neighbors = hexNeighbors(hex.q, hex.r);
      const sameCount: Record<string, number> = {};
      for (const [nq, nr] of neighbors) {
        const nh = hexes.get(hexKey(nq, nr));
        if (nh) sameCount[nh.terrain] = (sameCount[nh.terrain] || 0) + 1;
      }
      // If surrounded by 3+ of one type, convert
      for (const [t, c] of Object.entries(sameCount)) {
        if (c >= 3 && Math.random() < 0.5) {
          hex.terrain = t as AoWTerrain;
          const tDef = AOW_TERRAIN[hex.terrain];
          hex.elevation = tDef.elevationRange[0] +
            Math.floor(Math.random() * (tDef.elevationRange[1] - tDef.elevationRange[0] + 1));
          break;
        }
      }
    }
  }

  // Place one grail on a random ruins hex (or a random plains hex)
  const ruinHexes = [...hexes.values()].filter(h => h.decoration === "ruins");
  if (ruinHexes.length > 0) {
    ruinHexes[Math.floor(Math.random() * ruinHexes.length)].decoration = "grail";
  } else {
    const plains = [...hexes.values()].filter(h => h.terrain === AoWTerrain.PLAINS);
    if (plains.length > 0) {
      plains[Math.floor(Math.random() * plains.length)].decoration = "grail";
    }
  }

  return hexes;
}

// ---------------------------------------------------------------------------
// Place cities
// ---------------------------------------------------------------------------

function _placeCities(hexes: Map<string, AoWHex>, radius: number, playerFactions: AoWFaction[]): AoWCity[] {
  const cities: AoWCity[] = [];
  const passableHexes = [...hexes.values()].filter(
    h => AOW_TERRAIN[h.terrain].passable && h.terrain !== AoWTerrain.SWAMP,
  );

  // Player capital positions (opposite corners)
  const capitalPositions = [
    { q: -Math.floor(radius * 0.6), r: 0 },
    { q: Math.floor(radius * 0.6), r: 0 },
    { q: 0, r: -Math.floor(radius * 0.6) },
    { q: 0, r: Math.floor(radius * 0.6) },
  ];

  // Place player capitals
  for (let i = 0; i < playerFactions.length; i++) {
    const target = capitalPositions[i];
    // Find closest passable hex to target
    let bestHex = passableHexes[0];
    let bestDist = Infinity;
    for (const h of passableHexes) {
      const d = hexDistance(h.q, h.r, target.q, target.r);
      if (d < bestDist && !h.cityId) {
        bestDist = d;
        bestHex = h;
      }
    }

    // Make sure capital hex is plains
    bestHex.terrain = AoWTerrain.PLAINS;
    bestHex.elevation = 0;

    const cityNames = AOW_CITY_NAMES[playerFactions[i]];
    const city: AoWCity = {
      id: uid(),
      name: cityNames[0],
      playerId: i,
      q: bestHex.q,
      r: bestHex.r,
      population: 3,
      goldPerTurn: AOW_BALANCE.CITY_GOLD_PER_POP * 3,
      manaPerTurn: AOW_BALANCE.CITY_MANA_PER_POP * 3,
      walls: playerFactions[i] === AoWFaction.DWARVES,
      buildQueue: [],
      turnsLeft: 0,
      garrisonUnits: [],
    };
    bestHex.cityId = city.id;
    cities.push(city);
  }

  // Place neutral cities
  const neutralCount = Math.floor(radius * 0.8);
  let placed = 0;
  const usedCityHexes = new Set(cities.map(c => hexKey(c.q, c.r)));

  for (let attempt = 0; attempt < 200 && placed < neutralCount; attempt++) {
    const h = passableHexes[Math.floor(Math.random() * passableHexes.length)];
    const k = hexKey(h.q, h.r);
    if (usedCityHexes.has(k)) continue;

    // Min distance from other cities
    let tooClose = false;
    for (const c of cities) {
      if (hexDistance(h.q, h.r, c.q, c.r) < 3) { tooClose = true; break; }
    }
    if (tooClose) continue;

    const factionNames = Object.values(AOW_CITY_NAMES);
    const namePool = factionNames[Math.floor(Math.random() * factionNames.length)];
    const city: AoWCity = {
      id: uid(),
      name: namePool[Math.floor(Math.random() * namePool.length)],
      playerId: -1,
      q: h.q, r: h.r,
      population: 1 + Math.floor(Math.random() * 2),
      goldPerTurn: AOW_BALANCE.CITY_GOLD_PER_POP * (1 + Math.floor(Math.random() * 2)),
      manaPerTurn: AOW_BALANCE.CITY_MANA_PER_POP,
      walls: false,
      buildQueue: [],
      turnsLeft: 0,
      garrisonUnits: [],
    };
    h.cityId = city.id;
    h.terrain = AoWTerrain.PLAINS;
    h.elevation = 0;
    usedCityHexes.add(k);
    cities.push(city);
    placed++;
  }

  return cities;
}

// ---------------------------------------------------------------------------
// Create initial armies
// ---------------------------------------------------------------------------

function _createStartingArmies(players: AoWPlayer[], cities: AoWCity[]): AoWArmy[] {
  const armies: AoWArmy[] = [];

  for (const player of players) {
    if (player.defeated) continue;
    const capital = cities.find(c => c.playerId === player.id);
    if (!capital) continue;

    const heroDef = getHeroForFaction(player.faction);
    const hero = createUnit(heroDef.id, player.id, heroDef);

    const t1Units = getUnitsForFaction(player.faction).filter(u => u.tier === 1);
    const startUnits: AoWUnit[] = [hero];
    for (let i = 0; i < 3; i++) {
      const def = t1Units[i % t1Units.length];
      startUnits.push(createUnit(def.id, player.id, def));
    }

    armies.push({
      id: uid(),
      playerId: player.id,
      units: startUnits,
      q: capital.q,
      r: capital.r,
      movementLeft: heroDef.speed,
      maxMovement: heroDef.speed,
    });
  }

  return armies;
}

// ---------------------------------------------------------------------------
// Neutral garrisons
// ---------------------------------------------------------------------------

function _populateNeutralGarrisons(cities: AoWCity[]): void {
  // All factions T1 units for neutral garrison
  const allT1 = [
    { id: "cam_militia", name: "Militia", faction: AoWFaction.CAMELOT, tier: 1, hp: 30, attack: 6, defense: 4, damage: [3, 5] as [number, number], speed: 3, range: 0, abilities: [], cost: 25, description: "" },
    { id: "cam_archer", name: "Longbowman", faction: AoWFaction.CAMELOT, tier: 1, hp: 20, attack: 7, defense: 2, damage: [3, 6] as [number, number], speed: 3, range: 3, abilities: ["ranged"], cost: 35, description: "" },
  ];

  for (const city of cities) {
    if (city.playerId !== -1) continue;
    const count = AOW_BALANCE.NEUTRAL_CITY_GARRISON;
    for (let i = 0; i < count; i++) {
      const def = allT1[i % allT1.length];
      city.garrisonUnits.push(createUnit(def.id, -1, def));
    }
  }
}

// ---------------------------------------------------------------------------
// Reveal hexes around a position
// ---------------------------------------------------------------------------

export function revealHexes(hexes: Map<string, AoWHex>, q: number, r: number, radius: number, playerId: number): void {
  for (const [, hex] of hexes) {
    if (hexDistance(hex.q, hex.r, q, r) <= radius) {
      if (playerId >= 0 && playerId < hex.explored.length) {
        hex.explored[playerId] = true;
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Create full game state
// ---------------------------------------------------------------------------

export function createAoWGameState(
  playerFaction: AoWFaction,
  aiFaction: AoWFaction,
  mapRadius: number = AOW_BALANCE.MAP_RADIUS_MEDIUM,
): AoWGameState {
  _nextId = 1;

  const players: AoWPlayer[] = [
    {
      id: 0,
      faction: playerFaction,
      name: getFactionDef(playerFaction).name,
      gold: AOW_BALANCE.START_GOLD,
      mana: AOW_BALANCE.START_MANA,
      goldPerTurn: AOW_BALANCE.BASE_GOLD_PER_TURN,
      manaPerTurn: AOW_BALANCE.BASE_MANA_PER_TURN,
      spellBook: AOW_SPELLS.map(s => s.id),
      researchedSpells: [getFactionDef(playerFaction).startSpell],
      currentResearch: null,
      researchProgress: 0,
      isAI: false,
      defeated: false,
      heroesRecruited: 1,
    },
    {
      id: 1,
      faction: aiFaction,
      name: getFactionDef(aiFaction).name,
      gold: AOW_BALANCE.START_GOLD,
      mana: AOW_BALANCE.START_MANA,
      goldPerTurn: AOW_BALANCE.BASE_GOLD_PER_TURN,
      manaPerTurn: AOW_BALANCE.BASE_MANA_PER_TURN,
      spellBook: AOW_SPELLS.map(s => s.id),
      researchedSpells: [getFactionDef(aiFaction).startSpell],
      currentResearch: null,
      researchProgress: 0,
      isAI: true,
      defeated: false,
      heroesRecruited: 1,
    },
  ];

  const hexes = _generateHexMap(mapRadius);
  const cities = _placeCities(hexes, mapRadius, [playerFaction, aiFaction]);
  const armies = _createStartingArmies(players, cities);
  _populateNeutralGarrisons(cities);

  // Reveal around starting positions
  for (const army of armies) {
    revealHexes(hexes, army.q, army.r, 3, army.playerId);
  }
  for (const city of cities) {
    if (city.playerId >= 0) {
      revealHexes(hexes, city.q, city.r, 2, city.playerId);
    }
  }

  // Update income
  for (const city of cities) {
    if (city.playerId >= 0) {
      players[city.playerId].goldPerTurn += city.goldPerTurn;
      players[city.playerId].manaPerTurn += city.manaPerTurn;
    }
  }

  return {
    phase: AoWPhase.PLAYING,
    turn: 1,
    currentPlayer: 0,
    players,
    hexes,
    armies,
    cities,
    combat: null,
    mapRadius,
    selectedArmyId: null,
    hoveredHex: null,
    movePath: null,
    castingSpell: null,
    grailFound: false,
    log: [`Turn 1 — ${players[0].name} begins.`],
  };
}
