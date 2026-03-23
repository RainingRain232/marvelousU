// ---------------------------------------------------------------------------
// Plague Doctor — core game systems
// ---------------------------------------------------------------------------

import type { PlagueState, Tile } from "../state/PlagueState";
import { PlaguePhase, TileType, InfectionLevel, MutationType, WeatherType } from "../state/PlagueState";
import { PlagueConfig, MUTATION_NAMES, MUTATION_DESCRIPTIONS, ALL_PERKS, NARRATIVE_EVENTS } from "../config/PlagueConfig";

// ── helpers ──────────────────────────────────────────────────────────────────

function rng(state: PlagueState): number {
  state.seed = (state.seed * 1103515245 + 12345) & 0x7fffffff;
  return state.seed / 0x7fffffff;
}

function announce(state: PlagueState, text: string, color: number = 0xffffff): void {
  state.announcements.push({ text, color, timer: 2.8 });
  state.log.push(`Day ${state.day}: ${text}`);
}

function tileAt(state: PlagueState, x: number, y: number): Tile | null {
  if (x < 0 || x >= state.cols || y < 0 || y >= state.rows) return null;
  return state.grid[y][x];
}

function addScore(state: PlagueState, amount: number): void {
  state.score = Math.max(0, state.score + amount);
}

function isWalkable(type: TileType): boolean {
  return type !== TileType.WALL && type !== TileType.EMPTY;
}

export function hasPerk(state: PlagueState, id: string): boolean {
  return state.activePerks.includes(id);
}

// ── fog of war ───────────────────────────────────────────────────────────────

export function updateVisibility(state: PlagueState): void {
  // Reset visibility
  for (let y = 0; y < state.rows; y++) {
    for (let x = 0; x < state.cols; x++) {
      state.grid[y][x].visible = false;
    }
  }

  let range = state.visionRange;

  // Weather effects on vision (unless weatherproof)
  if (!hasPerk(state, "weatherproof")) {
    if (state.weather === WeatherType.RAIN) range -= 1;
    if (state.weather === WeatherType.FOG) range -= 2;
  }
  range = Math.max(1, range);

  // Player vision
  revealAround(state, state.px, state.py, range);

  // Apprentice vision
  if (state.apprentice) {
    revealAround(state, state.apprentice.x, state.apprentice.y, 2);
  }

  // Scout's Report perk: reveal ALL tiles briefly (mark as revealed with last-seen info)
  if (hasPerk(state, "scouts_report")) {
    for (let y = 0; y < state.rows; y++) {
      for (let x = 0; x < state.cols; x++) {
        const t = state.grid[y][x];
        if (t.type !== TileType.WALL && t.type !== TileType.EMPTY) {
          t.revealed = true;
          t.lastSeenInfection = t.infection;
        }
      }
    }
  }
}

function revealAround(state: PlagueState, cx: number, cy: number, range: number): void {
  for (let dy = -range; dy <= range; dy++) {
    for (let dx = -range; dx <= range; dx++) {
      if (dx * dx + dy * dy > range * range + 1) continue; // Circular range
      const nx = cx + dx, ny = cy + dy;
      if (nx < 0 || nx >= state.cols || ny < 0 || ny >= state.rows) continue;
      const t = state.grid[ny][nx];
      t.visible = true;
      t.revealed = true;
      t.lastSeenInfection = t.infection;
    }
  }
}

// ── undo ─────────────────────────────────────────────────────────────────────

export function saveUndoSnapshot(state: PlagueState): void {
  // Save a lightweight snapshot of mutable game state
  state.undoSnapshot = JSON.stringify({
    px: state.px, py: state.py,
    health: state.health,
    herbs: state.herbs, remedies: state.remedies, masks: state.masks, leeches: state.leeches, gold: state.gold,
    movesLeft: state.movesLeft, actionsLeft: state.actionsLeft,
    treatedThisTurn: state.treatedThisTurn, comboBonus: state.comboBonus,
    deaths: state.deaths, cured: state.cured, score: state.score,
    grid: state.grid.map(row => row.map(t => ({
      infection: t.infection, type: t.type, population: t.population,
      quarantined: t.quarantined, fumigated: t.fumigated, treated: t.treated,
    }))),
    rats: state.rats.map(r => ({ ...r })),
  });
  state.undoUsed = false;
}

export function undoTurn(state: PlagueState): boolean {
  if (!state.undoSnapshot || state.undoUsed) {
    announce(state, "No undo available.", 0xff6644);
    return false;
  }
  const snap = JSON.parse(state.undoSnapshot);
  state.px = snap.px; state.py = snap.py;
  state.animPx = snap.px; state.animPy = snap.py;
  state.health = snap.health;
  state.herbs = snap.herbs; state.remedies = snap.remedies;
  state.masks = snap.masks; state.leeches = snap.leeches; state.gold = snap.gold;
  state.movesLeft = snap.movesLeft; state.actionsLeft = snap.actionsLeft;
  state.treatedThisTurn = snap.treatedThisTurn; state.comboBonus = snap.comboBonus;
  state.deaths = snap.deaths; state.cured = snap.cured; state.score = snap.score;
  state.rats = snap.rats;
  state.movePath = [];

  for (let y = 0; y < state.rows; y++) {
    for (let x = 0; x < state.cols; x++) {
      const s = snap.grid[y][x];
      const t = state.grid[y][x];
      t.infection = s.infection; t.type = s.type; t.population = s.population;
      t.quarantined = s.quarantined; t.fumigated = s.fumigated; t.treated = s.treated;
    }
  }

  state.undoUsed = true;
  announce(state, "Turn undone!", 0x88aaff);
  updateVisibility(state);
  return true;
}

// ── pathfinding ──────────────────────────────────────────────────────────────

export function findPath(state: PlagueState, tx: number, ty: number): { x: number; y: number }[] {
  if (tx === state.px && ty === state.py) return [];
  const tile = tileAt(state, tx, ty);
  if (!tile || !isWalkable(tile.type)) return [];

  const visited = new Set<number>();
  const parent = new Map<number, number>();
  const key = (x: number, y: number) => y * state.cols + x;
  const queue: [number, number][] = [[state.px, state.py]];
  visited.add(key(state.px, state.py));

  while (queue.length > 0) {
    const [cx, cy] = queue.shift()!;
    if (cx === tx && cy === ty) {
      const path: { x: number; y: number }[] = [];
      let cur = key(tx, ty);
      while (cur !== key(state.px, state.py)) {
        path.unshift({ x: cur % state.cols, y: Math.floor(cur / state.cols) });
        cur = parent.get(cur)!;
      }
      return path;
    }
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = cx + dx, ny = cy + dy;
      const nk = key(nx, ny);
      if (visited.has(nk)) continue;
      const nt = tileAt(state, nx, ny);
      if (!nt || !isWalkable(nt.type)) continue;
      visited.add(nk);
      parent.set(nk, key(cx, cy));
      queue.push([nx, ny]);
    }
  }
  return [];
}

// ── movement ─────────────────────────────────────────────────────────────────

export function tryMove(state: PlagueState, dx: number, dy: number): boolean {
  if (state.phase !== PlaguePhase.PLAYING) return false;
  if (state.movesLeft <= 0) return false;

  const nx = state.px + dx, ny = state.py + dy;
  const tile = tileAt(state, nx, ny);
  if (!tile || !isWalkable(tile.type)) return false;

  state.px = nx;
  state.py = ny;
  state.movesLeft--;

  // Storm weather: movement costs 2 moves instead of 1 (unless weatherproof)
  if (state.weather === WeatherType.STORM && !hasPerk(state, "weatherproof")) {
    state.movesLeft = Math.max(0, state.movesLeft - 1);
  }

  updateVisibility(state);

  // Fire Walk perk: auto-fumigate houses you walk through
  if (hasPerk(state, "fire_walk") && tile.type === TileType.HOUSE && tile.fumigated <= 0) {
    tile.fumigated = 1;
  }

  return true;
}

export function moveAlongPath(state: PlagueState): boolean {
  if (state.movePath.length === 0 || state.movesLeft <= 0) return false;
  const next = state.movePath[0];
  const dx = next.x - state.px, dy = next.y - state.py;
  if (Math.abs(dx) + Math.abs(dy) !== 1) { state.movePath = []; return false; }
  if (tryMove(state, dx, dy)) { state.movePath.shift(); return true; }
  state.movePath = [];
  return false;
}

// ── actions ──────────────────────────────────────────────────────────────────

export function treatHouse(state: PlagueState): boolean {
  if (state.phase !== PlaguePhase.PLAYING || state.actionsLeft <= 0) return false;

  const tile = state.grid[state.py][state.px];
  if (tile.type !== TileType.HOUSE) { announce(state, "No house here to treat.", 0xff6644); return false; }
  if (tile.infection === InfectionLevel.HEALTHY) { announce(state, "This house is healthy.", 0x88aa88); return false; }
  if (tile.infection === InfectionLevel.DEAD) { announce(state, "Too late... they're gone.", 0x888888); return false; }
  if (tile.treated) { announce(state, "Already treated this turn.", 0xccaa44); return false; }

  if (tile.infection === InfectionLevel.DYING) {
    if (state.remedies > 0) {
      state.remedies--;
      tile.infection = InfectionLevel.HEALTHY;
      tile.treated = true;
      const curedPop = tile.population;
      state.cured += curedPop;
      const goldReward = (PlagueConfig.GOLD_PER_CURE + (hasPerk(state, "gold_touch") && state.cured % 2 === 0 ? 1 : 0)) * curedPop;
      state.gold += goldReward;
      addScore(state, PlagueConfig.SCORE_PER_CURE * curedPop);
      state.actionsLeft--;
      applyExposure(state);
      applyCombo(state);
      // Potent Remedy perk
      if (hasPerk(state, "potent_remedy")) tile.fumigated = Math.max(tile.fumigated, PlagueConfig.FUMIGATION_TURNS);
      announce(state, `Remedy saved ${curedPop} souls! (+${goldReward}g)`, 0x44ff44);
      return true;
    } else if (state.leeches > 0) {
      const isLeechMaster = hasPerk(state, "leech_master");
      if (!isLeechMaster) state.leeches--;
      state.actionsLeft--;
      applyExposure(state);
      const threshold = isLeechMaster ? 1.0 : PlagueConfig.LEECH_CURE_CHANCE;
      if (rng(state) < threshold) {
        tile.infection = InfectionLevel.HEALTHY;
        tile.treated = true;
        state.cured += tile.population;
        const goldReward = (PlagueConfig.GOLD_PER_CURE + (hasPerk(state, "gold_touch") && state.cured % 2 === 0 ? 1 : 0)) * tile.population;
        state.gold += goldReward;
        addScore(state, PlagueConfig.SCORE_PER_CURE * tile.population);
        applyCombo(state);
        announce(state, `Bloodletting worked! ${tile.population} saved. (+${goldReward}g)`, 0x44dd44);
      } else {
        killHouse(state, tile);
        announce(state, "Bloodletting failed... they perished.", 0xff4444);
      }
      return true;
    } else {
      announce(state, "Need a remedy or leeches for dying patients!", 0xff6644);
      return false;
    }
  }

  if (state.herbs >= PlagueConfig.TREAT_HERB_COST) {
    state.herbs -= PlagueConfig.TREAT_HERB_COST;
    tile.treated = true;
    state.actionsLeft--;
    applyExposure(state);

    const isResilient = (state.day >= state.mutationDay && state.activeMutation === MutationType.RESILIENT)
      || (state.day >= state.secondMutationDay && state.secondMutation === MutationType.RESILIENT);

    if (tile.infection === InfectionLevel.RUMORED) {
      tile.infection = InfectionLevel.HEALTHY;
      state.cured += tile.population;
      const goldReward = (PlagueConfig.GOLD_PER_CURE + (hasPerk(state, "gold_touch") && state.cured % 2 === 0 ? 1 : 0)) * tile.population;
      state.gold += goldReward;
      addScore(state, PlagueConfig.SCORE_PER_CURE * tile.population);
      applyCombo(state);
      announce(state, `Prevented outbreak — ${tile.population} safe. (+${goldReward}g)`, 0x44ff44);
    } else if (tile.infection === InfectionLevel.INFECTED) {
      tile.infection = InfectionLevel.RUMORED;
      if (isResilient) {
        announce(state, "Treatment slowed by resilient plague — still rumored.", 0xddaa44);
      } else {
        announce(state, "Treatment helping — condition improving.", 0xdddd44);
      }
      applyCombo(state);
    }
    return true;
  }

  announce(state, "Not enough herbs to treat!", 0xff6644);
  return false;
}

function applyCombo(state: PlagueState): void {
  state.treatedThisTurn++;
  if (state.treatedThisTurn > 1) {
    const bonus = (state.treatedThisTurn - 1) * PlagueConfig.COMBO_GOLD_PER_STEP;
    const scoreBonus = (state.treatedThisTurn - 1) * PlagueConfig.COMBO_SCORE_PER_STEP;
    state.gold += bonus;
    state.comboBonus += bonus;
    addScore(state, scoreBonus);
    state.maxCombo = Math.max(state.maxCombo, state.treatedThisTurn);
    announce(state, `Combo x${state.treatedThisTurn}! (+${bonus}g bonus)`, 0xffdd44);
  }
}

function applyExposure(state: PlagueState): void {
  if (state.masks > 0) {
    state.masks--;
  } else {
    const dmg = hasPerk(state, "thick_skin") ? 1 : PlagueConfig.EXPOSURE_TREAT_NO_MASK;
    state.health -= dmg;
    if (state.health <= 0) {
      state.health = 0;
      announce(state, "The plague has claimed the doctor...", 0xff0000);
      state.phase = PlaguePhase.LOST;
    }
  }
}

function killHouse(state: PlagueState, tile: Tile): void {
  tile.infection = InfectionLevel.DEAD;
  tile.type = TileType.CEMETERY;
  const pop = tile.population;
  state.deaths += pop;
  addScore(state, PlagueConfig.SCORE_DEATH_PENALTY * pop);
  state.deathShake = 0.4;
  tile.population = 0;
}

export function gatherHerbs(state: PlagueState): boolean {
  if (state.phase !== PlaguePhase.PLAYING || state.actionsLeft <= 0) return false;
  const tile = state.grid[state.py][state.px];
  if (tile.type !== TileType.WELL) { announce(state, "No herb garden here.", 0xff6644); return false; }

  const amount = PlagueConfig.HERBS_PER_GATHER + (hasPerk(state, "herbalist") ? 1 : 0);
  state.herbs += amount;
  state.actionsLeft--;
  // Track for challenge
  const hc = state.challenges.find(c => c.id === "herbalist_c");
  if (hc && !hc.completed) hc.current++;
  announce(state, `Gathered ${amount} herbs.`, 0x44cc44);
  return true;
}

export function craftRemedy(state: PlagueState): boolean {
  if (state.phase !== PlaguePhase.PLAYING || state.actionsLeft <= 0) return false;
  const tile = state.grid[state.py][state.px];
  if (tile.type !== TileType.WORKSHOP) { announce(state, "Need a workshop to craft.", 0xff6644); return false; }
  if (state.herbs < PlagueConfig.HERBS_TO_CRAFT_REMEDY) {
    announce(state, `Need ${PlagueConfig.HERBS_TO_CRAFT_REMEDY} herbs to craft a remedy.`, 0xff6644);
    return false;
  }
  state.herbs -= PlagueConfig.HERBS_TO_CRAFT_REMEDY;
  state.remedies += PlagueConfig.REMEDIES_PER_CRAFT;
  state.actionsLeft--;
  announce(state, "Crafted a remedy!", 0x44ddcc);
  return true;
}

export function restAtChurch(state: PlagueState): boolean {
  if (state.phase !== PlaguePhase.PLAYING || state.actionsLeft <= 0) return false;
  const tile = state.grid[state.py][state.px];
  if (tile.type !== TileType.CHURCH) { announce(state, "Need a church to rest.", 0xff6644); return false; }

  if (hasPerk(state, "second_wind")) {
    state.health = state.maxHealth;
  } else {
    state.health = Math.min(state.maxHealth, state.health + PlagueConfig.CHURCH_HEAL);
  }
  state.actionsLeft--;
  announce(state, "Rested at the church. Health restored.", 0xddddaa);
  return true;
}

export function quarantineHouse(state: PlagueState): boolean {
  if (state.phase !== PlaguePhase.PLAYING) return false;
  if (!hasPerk(state, "quarantine_pro") && state.actionsLeft <= 0) return false;
  const tile = state.grid[state.py][state.px];
  if (tile.type !== TileType.HOUSE) { announce(state, "No house here to quarantine.", 0xff6644); return false; }
  if (tile.quarantined) { announce(state, "Already quarantined.", 0xccaa44); return false; }
  if (tile.infection === InfectionLevel.DEAD) { announce(state, "No point quarantining the dead.", 0x888888); return false; }

  tile.quarantined = true;
  if (!hasPerk(state, "quarantine_pro")) state.actionsLeft--;
  announce(state, "House quarantined — plague won't spread from here.", 0xccaa44);
  return true;
}

export function fumigate(state: PlagueState): boolean {
  if (state.phase !== PlaguePhase.PLAYING || state.actionsLeft <= 0) return false;
  if (state.herbs < 2) { announce(state, "Need 2 herbs to fumigate.", 0xff6644); return false; }
  state.herbs -= 2;
  state.actionsLeft--;

  let count = 0;
  for (const [dx, dy] of [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]]) {
    const tile = tileAt(state, state.px + dx, state.py + dy);
    if (tile && tile.type === TileType.HOUSE) { tile.fumigated = PlagueConfig.FUMIGATION_TURNS; count++; }
  }
  announce(state, `Fumigated ${count} house${count !== 1 ? "s" : ""} — protected for ${PlagueConfig.FUMIGATION_TURNS} turns.`, 0xaaddaa);
  return true;
}

export function killRat(state: PlagueState): boolean {
  if (state.phase !== PlaguePhase.PLAYING) return false;
  if (!hasPerk(state, "rat_catcher") && state.actionsLeft <= 0) return false;

  const ratIdx = state.rats.findIndex(r => r.x === state.px && r.y === state.py);
  if (ratIdx === -1) { announce(state, "No rat here.", 0xff6644); return false; }

  state.rats.splice(ratIdx, 1);
  state.ratsKilled++;
  state.gold += PlagueConfig.GOLD_PER_RAT_KILL;
  addScore(state, PlagueConfig.SCORE_PER_RAT);
  if (!hasPerk(state, "rat_catcher")) state.actionsLeft--;
  announce(state, `Rat exterminated! (+${PlagueConfig.GOLD_PER_RAT_KILL}g)`, 0xddaa44);
  return true;
}

// ── market ───────────────────────────────────────────────────────────────────

export type MarketItem = "herbs" | "mask" | "leech" | "remedy";

export function buyFromMarket(state: PlagueState, item: MarketItem): boolean {
  if (state.phase !== PlaguePhase.PLAYING || state.actionsLeft <= 0) return false;
  const tile = state.grid[state.py][state.px];
  if (tile.type !== TileType.MARKET) { announce(state, "Need to be at the market.", 0xff6644); return false; }

  const discount = hasPerk(state, "bulk_buyer") ? 1 : 0;
  let price = 0, label = "";
  switch (item) {
    case "herbs":  price = Math.max(1, PlagueConfig.MARKET_HERB_PRICE - discount); label = "herbs"; break;
    case "mask":   price = Math.max(1, PlagueConfig.MARKET_MASK_PRICE - discount); label = "a plague mask"; break;
    case "leech":  price = Math.max(1, PlagueConfig.MARKET_LEECH_PRICE - discount); label = "leeches"; break;
    case "remedy": price = Math.max(1, PlagueConfig.MARKET_REMEDY_PRICE - discount); label = "a remedy"; break;
  }

  if (state.gold < price) { announce(state, `Not enough gold! Need ${price}g.`, 0xff6644); return false; }

  state.gold -= price;
  state.actionsLeft--;
  switch (item) {
    case "herbs":  state.herbs += 3; break;
    case "mask":   state.masks += 1; break;
    case "leech":  state.leeches += 1; break;
    case "remedy": state.remedies += 1; break;
  }
  // Track for challenge
  const mc = state.challenges.find(c => c.id === "market_mogul");
  if (mc && !mc.completed) mc.current += price;
  announce(state, `Bought ${label} for ${price}g.`, 0xddcc44);
  return true;
}

// ── perks ────────────────────────────────────────────────────────────────────

export function generatePerkChoices(state: PlagueState): void {
  const available = ALL_PERKS.filter(p => !state.activePerks.includes(p.id));
  const choices = [];
  for (let i = 0; i < 3 && available.length > 0; i++) {
    const idx = Math.floor(rng(state) * available.length);
    choices.push(available.splice(idx, 1)[0]);
  }
  state.perkChoices = choices;
  state.phaseBeforeOverlay = state.phase;
  state.phase = PlaguePhase.PERK_SELECT;
}

export function selectPerk(state: PlagueState, index: number): void {
  if (index < 0 || index >= state.perkChoices.length) return;
  const perk = state.perkChoices[index];
  state.activePerks.push(perk.id);
  state.perkChoices = [];
  state.phase = state.phaseBeforeOverlay;
  state.nextPerkDay = state.day + PlagueConfig.PERK_INTERVAL;

  // Apply immediate effects
  if (perk.id === "swift_feet") { state.maxMoves++; state.movesLeft++; }
  if (perk.id === "extra_action") { state.maxActions++; state.actionsLeft++; }
  if (perk.id === "eagle_eye") { state.visionRange += 2; updateVisibility(state); }
  if (perk.id === "iron_will") { state.maxHealth += 3; state.health += 3; }

  announce(state, `Perk acquired: ${perk.name}!`, perk.color);
}

// ── narrative events ─────────────────────────────────────────────────────────

export function triggerRandomEvent(state: PlagueState): boolean {
  if (rng(state) > 0.3) return false; // 30% chance per trigger point

  const available = NARRATIVE_EVENTS.filter(e => {
    if (e.id === "apprentice_offer" && state.apprentice) return false;
    if (e.id === "apprentice_offer" && state.gold < PlagueConfig.APPRENTICE_HIRE_COST) return false;
    if (e.id === "rat_king" && state.rats.length === 0) return false;
    if (e.id === "quarantine_riot") {
      let hasQ = false;
      for (let y = 0; y < state.rows; y++) for (let x = 0; x < state.cols; x++) if (state.grid[y][x].quarantined) hasQ = true;
      if (!hasQ) return false;
    }
    return true;
  });

  if (available.length === 0) return false;
  const event = available[Math.floor(rng(state) * available.length)];
  state.currentEvent = event;
  state.phaseBeforeOverlay = state.phase;
  state.phase = PlaguePhase.EVENT_CHOICE;
  return true;
}

export function resolveEventChoice(state: PlagueState, choiceIndex: number): void {
  if (!state.currentEvent || choiceIndex < 0 || choiceIndex >= state.currentEvent.choices.length) return;
  const effect = state.currentEvent.choices[choiceIndex].effect;

  switch (effect) {
    case "noble_accept": state.gold += 8; addScore(state, -5); announce(state, "Lord Ashworth pays you handsomely. (+8g)", 0xffd700); break;
    case "noble_refuse": addScore(state, 10); announce(state, "The poor thank you. Your reputation grows. (+10 score)", 0x44ff44); break;

    case "witch_trust": state.remedies += 2; announce(state, "The folk remedy works! (+2 remedies)", 0x44ddcc); break;
    case "witch_refuse": state.health = Math.max(1, state.health - 1); announce(state, "She mutters a curse. (-1 HP)", 0xff6644); break;
    case "witch_buy": if (state.gold >= 4) { state.gold -= 4; state.remedies += 2; announce(state, "A fair trade. (+2 remedies, -4g)", 0x44ddcc); } else { announce(state, "Not enough gold!", 0xff6644); } break;

    case "ratking_give":
      if (state.herbs >= 3) {
        state.herbs -= 3;
        state.rats = [];
        announce(state, "The rat nest is destroyed! All rats eliminated.", 0x44ff44);
      } else { announce(state, "Not enough herbs!", 0xff6644); }
      break;
    case "ratking_decline": {
      const count = 2;
      for (let i = 0; i < count; i++) {
        for (let a = 0; a < 50; a++) {
          const rx = 1 + Math.floor(rng(state) * (state.cols - 2)), ry = 1 + Math.floor(rng(state) * (state.rows - 2));
          if (isWalkable(state.grid[ry][rx].type)) { state.rats.push({ x: rx, y: ry, id: state.nextRatId++ }); break; }
        }
      }
      announce(state, "The rats multiply! +2 new rats.", 0xaa6633);
      break;
    }

    case "flee_let": state.totalPopulation -= 2; announce(state, "The family escapes. (-2 pop)", 0xddddaa); break;
    case "flee_keep": {
      const hh: [number, number][] = [];
      for (let y = 0; y < state.rows; y++) for (let x = 0; x < state.cols; x++) if (state.grid[y][x].type === TileType.HOUSE) hh.push([x, y]);
      if (hh.length > 0) {
        const [hx, hy] = hh[Math.floor(rng(state) * hh.length)];
        state.grid[hy][hx].population++;
        state.totalPopulation++;
        if (rng(state) < 0.3 && state.grid[hy][hx].infection === InfectionLevel.HEALTHY) {
          state.grid[hy][hx].infection = InfectionLevel.RUMORED;
          announce(state, "The family stayed, but they brought sickness...", 0xdd8844);
        } else {
          announce(state, "The family found shelter safely.", 0xddddaa);
        }
      }
      break;
    }

    case "bishop_attend": state.gold += 10; state.actionsLeft = 0; announce(state, "The sermon raises funds. (+10g, actions spent)", 0xffd700); break;
    case "bishop_decline": announce(state, "The Bishop nods. You have work to do.", 0xddddaa); break;

    case "apprentice_hire":
      if (state.gold >= PlagueConfig.APPRENTICE_HIRE_COST) {
        state.gold -= PlagueConfig.APPRENTICE_HIRE_COST;
        state.apprentice = { x: state.px, y: state.py, animX: state.px, animY: state.py };
        announce(state, `Apprentice hired! (-${PlagueConfig.APPRENTICE_HIRE_COST}g)`, 0x44aaff);
      } else { announce(state, "Not enough gold!", 0xff6644); }
      break;
    case "apprentice_decline": announce(state, "The young apprentice walks away, disappointed.", 0x888877); break;

    case "riot_reinforce":
      if (state.gold >= 3) { state.gold -= 3; announce(state, "Guards reinforce the quarantine. (-3g)", 0xccaa44); }
      else { announce(state, "Not enough gold to hire guards!", 0xff6644); }
      break;
    case "riot_free":
      for (let y = 0; y < state.rows; y++) for (let x = 0; x < state.cols; x++) state.grid[y][x].quarantined = false;
      announce(state, "All quarantine barriers have been torn down!", 0xff4444);
      break;

    case "spring_bless": state.health = Math.min(state.maxHealth, state.health + 3); state.herbs += 2; announce(state, "The spring heals you. (+3 HP, +2 herbs)", 0x44ddcc); break;
    case "spring_debunk": addScore(state, 5); announce(state, "Honesty prevails. (+5 score)", 0xddddaa); break;

    // New event effects
    case "harbinger_prep": state.masks += 2; announce(state, "You prepare for the dark figure. (+2 masks)", 0xcccccc); break;
    case "harbinger_pray": state.health = Math.min(state.maxHealth, state.health + 2); announce(state, "Divine protection bolsters you. (+2 HP)", 0xddddaa); break;
    case "weather_rain":
      if (state.gold >= 5) {
        state.gold -= 5;
        state.weather = WeatherType.RAIN;
        state.weatherDuration = 4;
        announce(state, "The druid calls forth rain. (-5g)", 0x6688aa);
      } else { announce(state, "Not enough gold!", 0xff6644); }
      break;
    case "weather_clear":
      if (state.gold >= 3) {
        state.gold -= 3;
        state.weather = WeatherType.CLEAR;
        state.weatherDuration = 4;
        announce(state, "The skies clear. (-3g)", 0xddddaa);
      } else { announce(state, "Not enough gold!", 0xff6644); }
      break;
    case "weather_decline": announce(state, "You leave the druid to their rituals.", 0xddddaa); break;
  }

  state.currentEvent = null;
  state.phase = state.phaseBeforeOverlay;
}

// ── active abilities ─────────────────────────────────────────────────────────

export function useAbility(state: PlagueState, abilityId: string): boolean {
  if (state.phase !== PlaguePhase.PLAYING || state.actionsLeft <= 0) return false;

  const ability = state.abilities.find(a => a.id === abilityId);
  if (!ability) { announce(state, "Unknown ability.", 0xff6644); return false; }
  if (ability.currentCd > 0) { announce(state, `${ability.name} is on cooldown (${ability.currentCd} turns).`, 0xff6644); return false; }

  state.actionsLeft--;
  ability.currentCd = ability.cooldown;

  switch (abilityId) {
    case "holy_water": {
      // Cure all rumored/infected houses in 2-tile Manhattan radius around player
      let curedCount = 0;
      for (let dy = -2; dy <= 2; dy++) {
        for (let dx = -2; dx <= 2; dx++) {
          if (Math.abs(dx) + Math.abs(dy) > 2) continue;
          const t = tileAt(state, state.px + dx, state.py + dy);
          if (t && t.type === TileType.HOUSE && (t.infection === InfectionLevel.RUMORED || t.infection === InfectionLevel.INFECTED)) {
            state.cured += t.population;
            const goldReward = (PlagueConfig.GOLD_PER_CURE + (hasPerk(state, "gold_touch") && state.cured % 2 === 0 ? 1 : 0)) * t.population;
            state.gold += goldReward;
            addScore(state, PlagueConfig.SCORE_PER_CURE * t.population);
            t.infection = InfectionLevel.HEALTHY;
            curedCount++;
          }
        }
      }
      // Stun harbinger if in range
      if (state.harbinger && !state.harbingerDefeated) {
        const hdx = Math.abs(state.harbinger.x - state.px);
        const hdy = Math.abs(state.harbinger.y - state.py);
        if (hdx + hdy <= 2) {
          state.harbinger.stunned = Math.max(state.harbinger.stunned, 2);
          announce(state, "The Holy Water stuns the Harbinger!", 0x44ddff);
        }
      }
      announce(state, `Holy Water purifies the area! ${curedCount} house${curedCount !== 1 ? "s" : ""} cleansed.`, 0x44ddff);
      break;
    }

    case "bonfire": {
      // Kill all rats within 2 tiles of player
      const killRange = 2;
      const ratsKilled: number[] = [];
      for (let i = state.rats.length - 1; i >= 0; i--) {
        const r = state.rats[i];
        if (Math.abs(r.x - state.px) + Math.abs(r.y - state.py) <= killRange) {
          ratsKilled.push(i);
        }
      }
      for (const idx of ratsKilled) {
        state.rats.splice(idx, 1);
        state.ratsKilled++;
        state.gold += PlagueConfig.GOLD_PER_RAT_KILL;
        addScore(state, PlagueConfig.SCORE_PER_RAT);
      }
      // Fumigate all houses in 3x3 area
      let fumCount = 0;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const t = tileAt(state, state.px + dx, state.py + dy);
          if (t && t.type === TileType.HOUSE) {
            t.fumigated = PlagueConfig.FUMIGATION_TURNS;
            fumCount++;
          }
        }
      }
      announce(state, `Bonfire! ${ratsKilled.length} rat${ratsKilled.length !== 1 ? "s" : ""} burned, ${fumCount} house${fumCount !== 1 ? "s" : ""} fumigated.`, 0xff8833);
      break;
    }

    case "barricade": {
      // Place a BARRICADE tile on the player's current tile (must be on ROAD)
      const tile = state.grid[state.py][state.px];
      if (tile.type !== TileType.ROAD) {
        announce(state, "Can only place barricades on roads.", 0xff6644);
        // Refund: undo the action cost and cooldown
        state.actionsLeft++;
        ability.currentCd = 0;
        return false;
      }
      tile.type = TileType.BARRICADE;
      announce(state, "Barricade erected! Plague cannot spread through here.", 0xaa8866);
      break;
    }
  }

  return true;
}

// ── warn action ──────────────────────────────────────────────────────────────

export function warnHouse(state: PlagueState): boolean {
  if (state.phase !== PlaguePhase.PLAYING || state.actionsLeft <= 0) return false;

  const tile = state.grid[state.py][state.px];
  if (tile.type !== TileType.HOUSE) { announce(state, "No house here to warn.", 0xff6644); return false; }
  if (tile.infection !== InfectionLevel.HEALTHY) { announce(state, "Can only warn healthy houses.", 0xff6644); return false; }
  if (tile.warned > 0) { announce(state, "This house is already warned.", 0xccaa44); return false; }

  tile.warned = PlagueConfig.WARN_DURATION;
  state.actionsLeft--;
  announce(state, `House warned — they'll resist infection for ${PlagueConfig.WARN_DURATION} turns.`, 0xddcc88);
  return true;
}

// ── harbinger boss ───────────────────────────────────────────────────────────

function spawnHarbinger(state: PlagueState): void {
  // Find a tile far from the player to spawn the harbinger
  let bestX = 1, bestY = 1, bestDist = 0;
  for (let y = 1; y < state.rows - 1; y++) {
    for (let x = 1; x < state.cols - 1; x++) {
      const t = state.grid[y][x];
      if (!isWalkable(t.type)) continue;
      const dist = Math.abs(x - state.px) + Math.abs(y - state.py);
      if (dist > bestDist) { bestDist = dist; bestX = x; bestY = y; }
    }
  }
  state.harbinger = {
    x: bestX, y: bestY,
    animX: bestX, animY: bestY,
    hp: PlagueConfig.HARBINGER_HP, maxHp: PlagueConfig.HARBINGER_HP,
    stunned: 0,
    spawnDay: state.day,
  };
  announce(state, "A dark figure emerges from the shadows... the HARBINGER has arrived!", 0xaa00aa);
}

function tickHarbinger(state: PlagueState): void {
  if (!state.harbinger || state.harbingerDefeated) return;
  const h = state.harbinger;

  // Tick stun
  if (h.stunned > 0) {
    h.stunned--;
    return;
  }

  // Find nearest healthy house
  let bestDist = 9999, bestX = h.x, bestY = h.y;
  for (let y = 0; y < state.rows; y++) {
    for (let x = 0; x < state.cols; x++) {
      const t = state.grid[y][x];
      if (t.type === TileType.HOUSE && t.infection === InfectionLevel.HEALTHY) {
        const dist = Math.abs(x - h.x) + Math.abs(y - h.y);
        if (dist < bestDist) { bestDist = dist; bestX = x; bestY = y; }
      }
    }
  }

  // Move 1-2 tiles toward nearest healthy house
  const moveSteps = 1 + (rng(state) < 0.5 ? 1 : 0);
  for (let step = 0; step < moveSteps; step++) {
    if (h.x === bestX && h.y === bestY) break;
    const dx = Math.sign(bestX - h.x);
    const dy = Math.sign(bestY - h.y);

    // Prefer axis with larger distance
    let moved = false;
    if (Math.abs(bestX - h.x) >= Math.abs(bestY - h.y)) {
      const nt = tileAt(state, h.x + dx, h.y);
      if (nt && isWalkable(nt.type)) { h.x += dx; moved = true; }
      else { const nt2 = tileAt(state, h.x, h.y + dy); if (nt2 && isWalkable(nt2.type)) { h.y += dy; moved = true; } }
    } else {
      const nt = tileAt(state, h.x, h.y + dy);
      if (nt && isWalkable(nt.type)) { h.y += dy; moved = true; }
      else { const nt2 = tileAt(state, h.x + dx, h.y); if (nt2 && isWalkable(nt2.type)) { h.x += dx; moved = true; } }
    }
    if (!moved) break;

    // Infect any house it enters
    const tile = tileAt(state, h.x, h.y);
    if (tile && tile.type === TileType.HOUSE && tile.infection === InfectionLevel.HEALTHY) {
      if (rng(state) < PlagueConfig.HARBINGER_INFECT_CHANCE) {
        tile.infection = InfectionLevel.INFECTED;
        announce(state, "The Harbinger spreads death in its wake!", 0xaa00aa);
      }
    }
  }
}

export function attackHarbinger(state: PlagueState): boolean {
  if (state.phase !== PlaguePhase.PLAYING || state.actionsLeft <= 0) return false;
  if (!state.harbinger || state.harbingerDefeated) { announce(state, "No harbinger to attack.", 0xff6644); return false; }

  const h = state.harbinger;
  const dist = Math.abs(h.x - state.px) + Math.abs(h.y - state.py);
  if (dist > 1) { announce(state, "Must be adjacent to the Harbinger to attack!", 0xff6644); return false; }

  state.actionsLeft--;
  h.hp--;
  announce(state, `You strike the Harbinger! (${h.hp}/${h.maxHp} HP)`, 0xff44ff);

  if (h.hp <= 0) {
    state.harbingerDefeated = true;
    addScore(state, PlagueConfig.SCORE_HARBINGER_DEFEAT);
    announce(state, "The Harbinger is defeated! The dark figure crumbles to dust.", 0xffdd44);
  }

  return true;
}

// ── threat calculation ───────────────────────────────────────────────────────

export function updateThreatLevels(state: PlagueState): void {
  for (let y = 0; y < state.rows; y++) {
    for (let x = 0; x < state.cols; x++) {
      const tile = state.grid[y][x];
      tile.threatLevel = 0;
      if (tile.type !== TileType.HOUSE || tile.infection !== InfectionLevel.HEALTHY) continue;

      let adjacentInfected = 0;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const neighbor = tileAt(state, x + dx, y + dy);
        if (neighbor && (neighbor.type === TileType.HOUSE || neighbor.type === TileType.CEMETERY)) {
          if (neighbor.infection >= InfectionLevel.INFECTED && neighbor.infection <= InfectionLevel.DYING) {
            adjacentInfected++;
          }
        }
      }
      tile.threatLevel = Math.min(1, adjacentInfected / 4);
    }
  }
}

// ── persistent unlocks ───────────────────────────────────────────────────────

export function saveWin(state: PlagueState): void {
  try {
    const currentWins = parseInt(localStorage.getItem("plague_total_wins") ?? "0") || 0;
    localStorage.setItem("plague_total_wins", String(currentWins + 1));
    state.totalWins = currentWins + 1;
  } catch {
    // localStorage unavailable
  }
}

// ── apprentice AI ────────────────────────────────────────────────────────────

function tickApprentice(state: PlagueState): void {
  if (!state.apprentice) return;
  const a = state.apprentice;

  // Move towards nearest infected house within 5 tiles
  let bestDist = 999, bestX = a.x, bestY = a.y;
  for (let dy = -5; dy <= 5; dy++) {
    for (let dx = -5; dx <= 5; dx++) {
      const nx = a.x + dx, ny = a.y + dy;
      const t = tileAt(state, nx, ny);
      if (!t || t.type !== TileType.HOUSE) continue;
      if (t.infection <= InfectionLevel.HEALTHY || t.infection >= InfectionLevel.DYING) continue;
      const dist = Math.abs(dx) + Math.abs(dy);
      if (dist < bestDist) { bestDist = dist; bestX = nx; bestY = ny; }
    }
  }

  // Move one step towards target
  if (bestX !== a.x || bestY !== a.y) {
    const dx = Math.sign(bestX - a.x), dy = Math.sign(bestY - a.y);
    // Prefer axis with larger distance
    if (Math.abs(bestX - a.x) >= Math.abs(bestY - a.y)) {
      const nt = tileAt(state, a.x + dx, a.y);
      if (nt && isWalkable(nt.type)) { a.x += dx; }
      else { const nt2 = tileAt(state, a.x, a.y + dy); if (nt2 && isWalkable(nt2.type)) a.y += dy; }
    } else {
      const nt = tileAt(state, a.x, a.y + dy);
      if (nt && isWalkable(nt.type)) { a.y += dy; }
      else { const nt2 = tileAt(state, a.x + dx, a.y); if (nt2 && isWalkable(nt2.type)) a.x += dx; }
    }
  }

  // Try to treat the house they're on
  const tile = tileAt(state, a.x, a.y);
  if (tile && tile.type === TileType.HOUSE && tile.infection === InfectionLevel.RUMORED && !tile.treated) {
    tile.infection = InfectionLevel.HEALTHY;
    tile.treated = true;
    state.cured += tile.population;
    announce(state, `Your apprentice treated a house! (${tile.population} saved)`, 0x88aaff);
  }
}

// ── end turn ─────────────────────────────────────────────────────────────────

export function endTurn(state: PlagueState): void {
  if (state.phase !== PlaguePhase.PLAYING) return;

  const deathsBefore = state.deaths;
  let anyWorsened = false;

  // ── First mutation activation ──
  if (state.day >= state.mutationDay && !state.mutationAnnounced) {
    state.mutationAnnounced = true;
    announce(state, `MUTATION: ${MUTATION_NAMES[state.activeMutation]} — ${MUTATION_DESCRIPTIONS[state.activeMutation]}`, 0xff44ff);
  }

  // ── Second mutation activation ──
  if (state.day >= state.secondMutationDay && !state.secondMutationAnnounced) {
    state.secondMutationAnnounced = true;
    announce(state, `SECOND MUTATION: ${MUTATION_NAMES[state.secondMutation]} — ${MUTATION_DESCRIPTIONS[state.secondMutation]}`, 0xff44ff);
  }

  // Determine active mutations
  const isFast = (state.day >= state.mutationDay && state.activeMutation === MutationType.FAST)
    || (state.day >= state.secondMutationDay && state.secondMutation === MutationType.FAST);
  const isNecromantic = (state.day >= state.mutationDay && state.activeMutation === MutationType.NECROMANTIC)
    || (state.day >= state.secondMutationDay && state.secondMutation === MutationType.NECROMANTIC);
  const isAirborne = (state.day >= state.mutationDay && state.activeMutation === MutationType.AIRBORNE)
    || (state.day >= state.secondMutationDay && state.secondMutation === MutationType.AIRBORNE);

  // ── Plague Wave check ──
  const isWave = state.day >= state.nextWaveDay;
  if (isWave) {
    state.waveActive = true;
    state.waveFlash = 1.0;
    announce(state, "PLAGUE WAVE!", 0xaa00ff);
    state.nextWaveDay = state.day + PlagueConfig.WAVE_INTERVAL;
  } else {
    state.waveActive = false;
  }

  // ── Weather effects ──
  const isStorm = state.weather === WeatherType.STORM;
  const weatherproofed = hasPerk(state, "weatherproof");

  // Calculate weather-adjusted spread and advance multipliers
  let weatherSpreadMult = 1.0;
  let weatherAdvanceMult = 1.0;
  if (!weatherproofed) {
    if (state.weather === WeatherType.RAIN) {
      weatherSpreadMult = 0.7;
    }
    if (isStorm) {
      weatherSpreadMult = 0.0; // No plague spread during storm
      weatherAdvanceMult = 1.0; // Advance still happens
    }
  }

  // ── Advance infections ── (with difficulty + weather + wave multipliers)
  const advanceRolls = isFast ? 2 : 1;
  for (let roll = 0; roll < advanceRolls; roll++) {
    for (let y = 0; y < state.rows; y++) {
      for (let x = 0; x < state.cols; x++) {
        const tile = state.grid[y][x];
        if (roll === 0) tile.treated = false;
        if (tile.type !== TileType.HOUSE && tile.type !== TileType.CEMETERY) continue;
        if (tile.fumigated > 0) { if (roll === 0) tile.fumigated--; continue; }

        // Tick warned counters on first roll
        if (roll === 0 && tile.warned > 0) tile.warned--;

        let advanceChance = PlagueConfig.INFECTION_ADVANCE_CHANCE * state.advanceMult * weatherAdvanceMult;
        if (isWave) advanceChance += PlagueConfig.WAVE_EXTRA_ADVANCE;

        if (tile.infection === InfectionLevel.RUMORED && rng(state) < advanceChance) {
          tile.infection = InfectionLevel.INFECTED; anyWorsened = true;
        } else if (tile.infection === InfectionLevel.INFECTED && rng(state) < advanceChance) {
          tile.infection = InfectionLevel.DYING; anyWorsened = true;
        } else if (tile.infection === InfectionLevel.DYING && roll === 0) {
          killHouse(state, tile);
          announce(state, `A household has perished... (${state.deaths} dead)`, 0xff4444);
        }
      }
    }
  }

  // ── Spread ── (with difficulty + weather + wave + wind multipliers)
  // Storm blocks all spread (unless weatherproof — then normal)
  const stormBlocksSpread = isStorm && !weatherproofed;

  if (!stormBlocksSpread) {
    const newInfections: [number, number][] = [];
    const spreadDirs = isAirborne
      ? [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]
      : [[1, 0], [-1, 0], [0, 1], [0, -1]];

    let baseSpreadChance = PlagueConfig.SPREAD_CHANCE * state.spreadMult * weatherSpreadMult;
    if (isWave) baseSpreadChance += PlagueConfig.WAVE_EXTRA_SPREAD;

    for (let y = 0; y < state.rows; y++) {
      for (let x = 0; x < state.cols; x++) {
        const tile = state.grid[y][x];
        if (tile.type === TileType.HOUSE && tile.infection >= InfectionLevel.INFECTED && !tile.quarantined) {
          for (const [dx, dy] of spreadDirs) {
            // Barricade check: block spread if a barricade tile lies between source and target
            const bTile = tileAt(state, x + dx, y + dy);
            if (!bTile) continue;

            // If target is a barricade, block spread through it
            if (bTile.type === TileType.BARRICADE) continue;

            if (bTile.type === TileType.HOUSE && bTile.infection === InfectionLevel.HEALTHY && bTile.fumigated <= 0) {
              // Wind direction modifiers
              let dirSpreadChance = baseSpreadChance;
              if (!weatherproofed) {
                if (state.weather === WeatherType.WIND_NORTH) {
                  // Spread toward south (y+1) has +50%, toward north (y-1) has -50%
                  if (dy > 0) dirSpreadChance *= 1.5;
                  else if (dy < 0) dirSpreadChance *= 0.5;
                }
                if (state.weather === WeatherType.WIND_SOUTH) {
                  // Opposite: north (y-1) has +50%, south (y+1) has -50%
                  if (dy < 0) dirSpreadChance *= 1.5;
                  else if (dy > 0) dirSpreadChance *= 0.5;
                }
              }

              // Warned houses resist infection
              if (bTile.warned > 0 && rng(state) < PlagueConfig.WARN_RESIST) {
                continue; // Resisted!
              }

              if (rng(state) < dirSpreadChance) {
                newInfections.push([x + dx, y + dy]);
              }
            }
          }
        }
        if (isNecromantic && tile.type === TileType.CEMETERY) {
          for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
            const neighbor = tileAt(state, x + dx, y + dy);
            if (!neighbor) continue;
            if (neighbor.type === TileType.BARRICADE) continue;
            if (neighbor.type === TileType.HOUSE && neighbor.infection === InfectionLevel.HEALTHY
                && rng(state) < baseSpreadChance * 0.5) {
              // Warned houses resist
              if (neighbor.warned > 0 && rng(state) < PlagueConfig.WARN_RESIST) continue;
              newInfections.push([x + dx, y + dy]);
            }
          }
        }
      }
    }

    for (const [nx, ny] of newInfections) {
      if (state.grid[ny][nx].infection === InfectionLevel.HEALTHY) {
        state.grid[ny][nx].infection = InfectionLevel.RUMORED;
        anyWorsened = true;
      }
    }
    if (newInfections.length > 0) {
      announce(state, `Plague spreading... ${newInfections.length} new rumor${newInfections.length > 1 ? "s" : ""}.`, 0xddaa44);
    }
  }

  // ── Rats ──
  const ratMoveChance = PlagueConfig.RAT_MOVE_CHANCE
    + (state.weather === WeatherType.FOG && !weatherproofed ? 0.2 : 0);

  for (const rat of state.rats) {
    if (rng(state) < ratMoveChance) {
      const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
      const [dx, dy] = dirs[Math.floor(rng(state) * dirs.length)];
      const nt = tileAt(state, rat.x + dx, rat.y + dy);
      if (nt && isWalkable(nt.type)) { rat.x += dx; rat.y += dy; }
    }
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const neighbor = tileAt(state, rat.x + dx, rat.y + dy);
      if (neighbor && neighbor.type === TileType.HOUSE && neighbor.infection === InfectionLevel.HEALTHY
          && neighbor.fumigated <= 0 && rng(state) < PlagueConfig.RAT_INFECT_CHANCE) {
        // Warned houses resist rat infection too
        if (neighbor.warned > 0 && rng(state) < PlagueConfig.WARN_RESIST) continue;
        neighbor.infection = InfectionLevel.RUMORED;
        announce(state, "Rats are spreading disease!", 0xaa7744);
      }
    }
  }

  if (state.day % PlagueConfig.RAT_SPAWN_INTERVAL === 0 && state.rats.length < PlagueConfig.RAT_SPAWN_MAX) {
    for (let a = 0; a < 50; a++) {
      const rx = 1 + Math.floor(rng(state) * (state.cols - 2)), ry = 1 + Math.floor(rng(state) * (state.rows - 2));
      if (isWalkable(state.grid[ry][rx].type) && !(rx === state.px && ry === state.py)) {
        state.rats.push({ x: rx, y: ry, id: state.nextRatId++ });
        announce(state, "A new rat has appeared in the city!", 0xaa6633);
        break;
      }
    }
  }

  // ── Apprentice ──
  tickApprentice(state);

  // ── Harbinger ──
  if (!state.harbinger && !state.harbingerDefeated && state.day >= PlagueConfig.HARBINGER_SPAWN_DAY) {
    spawnHarbinger(state);
  }
  tickHarbinger(state);

  // ── Ability cooldowns ──
  const cdReduction = hasPerk(state, "smite") ? 2 : 1;
  for (const ability of state.abilities) {
    if (ability.currentCd > 0) {
      ability.currentCd = Math.max(0, ability.currentCd - cdReduction);
    }
  }

  // ── Weather duration ──
  state.weatherDuration--;
  if (state.weatherDuration <= 0) {
    const weathers = [WeatherType.CLEAR, WeatherType.RAIN, WeatherType.WIND_NORTH, WeatherType.WIND_SOUTH, WeatherType.FOG, WeatherType.STORM];
    state.weather = weathers[Math.floor(rng(state) * weathers.length)];
    state.weatherDuration = 3 + Math.floor(rng(state) * 3);
    announce(state, `Weather changed to ${["Clear", "Rain", "North Wind", "South Wind", "Fog", "Storm"][state.weather]}.`, 0x88aacc);
  }

  // ── Threat levels ──
  updateThreatLevels(state);

  // ── Advance day ──
  state.day++;
  state.movesLeft = state.maxMoves;
  state.actionsLeft = state.maxActions;
  state.treatedThisTurn = 0;
  state.comboBonus = 0;
  state.turnFlashTimer = 0.5;
  addScore(state, PlagueConfig.SCORE_PER_DAY_SURVIVED);

  if (state.deaths === deathsBefore && !anyWorsened) {
    state.perfectDays++;
    state.gold += PlagueConfig.GOLD_PERFECT_DAY;
    addScore(state, PlagueConfig.SCORE_PERFECT_DAY);
  }
  if (state.deaths === deathsBefore) { state.turnsWithoutDeath++; } else { state.turnsWithoutDeath = 0; }

  // ── Random events and perks ──
  if (state.day > 3 && state.day % 3 === 0) {
    if (!triggerRandomEvent(state)) {
      // Fallback supply events
      const eventRoll = rng(state);
      if (eventRoll < 0.15) {
        const roll = rng(state);
        if (roll < 0.3) { state.herbs += 1; announce(state, "A herbalist left supplies at your door.", 0x88cc88); }
        else if (roll < 0.55) { state.masks += 1; announce(state, "A merchant donated a plague mask.", 0xcccccc); }
        else if (roll < 0.75) { state.leeches += 1; announce(state, "Found leeches in the barber's shop.", 0xcc8888); }
        else { state.gold += 3; announce(state, "The church collected alms for your work. (+3g)", 0xddcc44); }
      }
    }
  }

  // ── Perk offer ──
  if (state.day >= state.nextPerkDay && state.phase === PlaguePhase.PLAYING) {
    generatePerkChoices(state);
    // Save undo after perk is resolved
  }

  // ── Save undo snapshot for the new turn ──
  if (state.phase === PlaguePhase.PLAYING) {
    saveUndoSnapshot(state);
  }

  updateVisibility(state);

  // ── Morale ──
  if (deathsBefore < state.deaths) {
    adjustMorale(state, -3 * (state.deaths - deathsBefore), "citizens died");
  }
  if (state.cured > 0 && state.treatedThisTurn > 0) {
    adjustMorale(state, 2, "people were treated");
  }
  applyMoraleEffects(state);

  // ── Full health challenge ──
  if (state.health === state.maxHealth) {
    const fhc = state.challenges.find(c => c.id === "full_health");
    if (fhc && !fhc.completed) fhc.current++;
  }

  // ── Challenges & tutorial ──
  updateChallenges(state);
  updateTutorialHints(state);

  // ── Check win/loss ──
  if (state.deaths >= state.maxDeaths) {
    state.phase = PlaguePhase.LOST;
    announce(state, "Too many have died. The city is lost.", 0xff0000);
    generateEpilogue(state);
    return;
  }

  let anyInfected = false;
  for (let y = 0; y < state.rows; y++) {
    for (let x = 0; x < state.cols; x++) {
      const t = state.grid[y][x];
      if (t.type === TileType.HOUSE && t.infection > InfectionLevel.HEALTHY && t.infection < InfectionLevel.DEAD) anyInfected = true;
    }
  }

  if (!anyInfected && state.day > 3) {
    state.phase = PlaguePhase.WON;
    addScore(state, PlagueConfig.SCORE_WIN_BONUS);
    announce(state, "The plague has been eradicated! The city is saved!", 0x44ff44);
    saveWin(state);
    updateChallenges(state);
    generateEpilogue(state);
    return;
  }

  if (state.day > state.maxDays) {
    if (state.deaths < state.maxDeaths / 2) {
      state.phase = PlaguePhase.WON;
      addScore(state, Math.floor(PlagueConfig.SCORE_WIN_BONUS * 0.5));
      announce(state, "You endured the plague. The worst has passed.", 0x44ff44);
      saveWin(state);
    } else {
      state.phase = PlaguePhase.LOST;
      announce(state, "The plague outlasted your efforts.", 0xff6644);
    }
    updateChallenges(state);
    generateEpilogue(state);
  }
}

// ── query helpers ────────────────────────────────────────────────────────────

export function getAvailableActions(state: PlagueState): string[] {
  if (state.phase !== PlaguePhase.PLAYING) return [];
  const actions: string[] = [];
  const tile = state.grid[state.py][state.px];

  if (state.actionsLeft > 0) {
    if (tile.type === TileType.HOUSE && tile.infection > InfectionLevel.HEALTHY && tile.infection < InfectionLevel.DEAD && !tile.treated) actions.push("treat");
    if (tile.type === TileType.HOUSE && !tile.quarantined && tile.infection < InfectionLevel.DEAD) actions.push("quarantine");
    if (tile.type === TileType.HOUSE && tile.infection === InfectionLevel.HEALTHY && tile.warned <= 0) actions.push("warn");
    if (tile.type === TileType.WELL) actions.push("gather");
    if (tile.type === TileType.WORKSHOP && state.herbs >= PlagueConfig.HERBS_TO_CRAFT_REMEDY) actions.push("craft");
    if (tile.type === TileType.CHURCH && state.health < state.maxHealth) actions.push("rest");
    if (state.herbs >= 2) actions.push("fumigate");
    if (state.rats.some(r => r.x === state.px && r.y === state.py)) actions.push("killrat");
    if (tile.type === TileType.MARKET) actions.push("buy");

    // Abilities
    for (const ability of state.abilities) {
      if (ability.currentCd === 0) {
        actions.push(`ability:${ability.id}`);
      }
    }

    // Attack harbinger (if adjacent)
    if (state.harbinger && !state.harbingerDefeated) {
      const dist = Math.abs(state.harbinger.x - state.px) + Math.abs(state.harbinger.y - state.py);
      if (dist <= 1) actions.push("attack_harbinger");
    }
  }
  // Free actions (perks)
  if (hasPerk(state, "quarantine_pro") && tile.type === TileType.HOUSE && !tile.quarantined && tile.infection < InfectionLevel.DEAD && !actions.includes("quarantine")) actions.push("quarantine");
  if (hasPerk(state, "rat_catcher") && state.rats.some(r => r.x === state.px && r.y === state.py) && !actions.includes("killrat")) actions.push("killrat");

  if (!state.undoUsed && state.undoSnapshot) actions.push("undo");
  actions.push("endturn");
  return actions;
}

export function getInfectionStats(state: PlagueState): { healthy: number; rumored: number; infected: number; dying: number; dead: number } {
  let healthy = 0, rumored = 0, infected = 0, dying = 0, dead = 0;
  for (let y = 0; y < state.rows; y++) {
    for (let x = 0; x < state.cols; x++) {
      const t = state.grid[y][x];
      if (t.type === TileType.HOUSE || t.type === TileType.CEMETERY) {
        switch (t.infection) {
          case InfectionLevel.HEALTHY: healthy++; break;
          case InfectionLevel.RUMORED: rumored++; break;
          case InfectionLevel.INFECTED: infected++; break;
          case InfectionLevel.DYING: dying++; break;
          case InfectionLevel.DEAD: dead++; break;
        }
      }
    }
  }
  return { healthy, rumored, infected, dying, dead };
}

// ── challenge tracking ───────────────────────────────────────────────────────

export function updateChallenges(state: PlagueState): void {
  for (const c of state.challenges) {
    if (c.completed) continue;
    switch (c.id) {
      case "cure_many": c.current = state.cured; break;
      case "rat_hunter": c.current = state.ratsKilled; break;
      case "speed_run": c.current = state.day; break;
      case "no_deaths_5": c.current = state.turnsWithoutDeath; break;
      case "combo_master": c.current = state.maxCombo; break;
      case "herbalist_c": /* tracked separately in gatherHerbs */ break;
      case "market_mogul": /* tracked separately in buyFromMarket */ break;
      case "quarantine_5": {
        let q = 0;
        for (let y = 0; y < state.rows; y++) for (let x = 0; x < state.cols; x++) if (state.grid[y][x].quarantined) q++;
        c.current = q;
        break;
      }
      case "full_health": /* tracked at end of turn */ break;
      case "harbinger_slayer": c.current = state.harbingerDefeated ? 1 : 0; break;
    }

    // Special win conditions
    if (c.id === "speed_run") {
      // Only complete if won before target day
      if (state.phase === PlaguePhase.WON && state.day <= c.target && !c.completed) {
        c.completed = true;
        state.score += c.reward;
        state.gold += c.goldReward;
        announce(state, `Challenge complete: ${c.desc}! (+${c.reward} score)`, 0xffd700);
      }
      continue;
    }

    if (c.current >= c.target && !c.completed) {
      c.completed = true;
      state.score += c.reward;
      state.gold += c.goldReward;
      announce(state, `Challenge complete: ${c.desc}! (+${c.reward} score, +${c.goldReward}g)`, 0xffd700);
    }
  }
}

// ── morale ───────────────────────────────────────────────────────────────────

export function adjustMorale(state: PlagueState, amount: number, reason: string): void {
  const prev = state.morale;
  state.morale = Math.max(0, Math.min(100, state.morale + amount));
  if (state.morale !== prev) {
    const dir = amount > 0 ? "+" : "";
    announce(state, `Morale ${dir}${amount}: ${reason} (${state.morale}/100)`, amount > 0 ? 0x44aa44 : 0xff6644);
  }
}

// Called at end of turn to apply morale effects
function applyMoraleEffects(state: PlagueState): void {
  if (state.morale >= 75 && rng(state) < 0.25) {
    // High morale: citizens help
    const roll = rng(state);
    if (roll < 0.5) {
      state.herbs += 1;
      announce(state, "Grateful citizens donated herbs!", 0x88cc88);
    } else {
      state.gold += 2;
      announce(state, "Citizens collected gold for your cause! (+2g)", 0xffd700);
    }
  }
  if (state.morale <= 20 && rng(state) < 0.2) {
    // Low morale: citizens resist
    // Random quarantine broken
    for (let y = 0; y < state.rows; y++) {
      for (let x = 0; x < state.cols; x++) {
        if (state.grid[y][x].quarantined && rng(state) < 0.3) {
          state.grid[y][x].quarantined = false;
          announce(state, "Angry citizens broke a quarantine!", 0xff4444);
          return;
        }
      }
    }
  }
}

// ── tutorial hints ───────────────────────────────────────────────────────────

export function updateTutorialHints(state: PlagueState): void {
  if (state.tutorialSeen) { state.tutorialHints = []; return; }
  const hints: string[] = [];
  const tile = state.grid[state.py]?.[state.px];

  if (state.day === 1 && state.movesLeft === state.maxMoves) {
    hints.push("WASD/Arrows to move. You have limited moves and actions per turn.");
    hints.push("Find infected houses (orange/red) and press T to treat them.");
    hints.push("Gather herbs at wells (G), craft remedies at workshops (C).");
    hints.push("Press Enter to end your turn. The plague spreads each turn!");
  } else if (state.day <= 3) {
    if (tile && tile.type === TileType.HOUSE && tile.infection > InfectionLevel.HEALTHY) {
      hints.push("Press T to treat this infected house. Costs 1 herb + 1 action.");
    }
    if (tile && tile.type === TileType.WELL) hints.push("Press G to gather herbs here.");
    if (state.movesLeft === 0 && state.actionsLeft > 0) hints.push("Out of moves! Use remaining actions or press Enter to end turn.");
    if (state.actionsLeft === 0) hints.push("No actions left. Press Enter to end your turn.");
  } else if (state.day === 5) {
    hints.push("Perk time! Choose wisely — each perk shapes your strategy.");
  }

  state.tutorialHints = hints;
}

export function dismissTutorial(state: PlagueState): void {
  state.tutorialSeen = true;
  state.tutorialHints = [];
  try { localStorage.setItem("plague_tutorial_seen", "1"); } catch { /* */ }
}

// ── epilogue generation ──────────────────────────────────────────────────────

export function generateEpilogue(state: PlagueState): void {
  const lines: string[] = [];
  const won = state.phase === PlaguePhase.WON;

  lines.push(won ? "The plague doctor saved the city." : "The city fell to the plague.");
  lines.push(`Over ${state.day} days, ${state.cured} citizens were cured and ${state.deaths} perished.`);

  if (state.harbingerDefeated) {
    lines.push("The dark Harbinger was vanquished, lifting the curse from the streets.");
  } else if (state.harbinger && !state.harbingerDefeated) {
    lines.push("The Harbinger stalked the city unchallenged, spreading misery.");
  }

  if (state.apprentice) {
    lines.push("A faithful apprentice worked alongside the doctor, saving many lives.");
  }

  if (state.ratsKilled > 0) {
    lines.push(`${state.ratsKilled} plague rats were exterminated.`);
  }

  if (state.activePerks.length > 0) {
    lines.push(`The doctor mastered ${state.activePerks.length} special techniques.`);
  }

  if (state.maxCombo >= 3) {
    lines.push(`A remarkable healing streak of x${state.maxCombo} was achieved.`);
  }

  const completed = state.challenges.filter(c => c.completed).length;
  if (completed > 0) {
    lines.push(`${completed} of ${state.challenges.length} challenges were conquered.`);
  }

  if (state.morale >= 70) {
    lines.push("The people loved their doctor — morale remained high throughout.");
  } else if (state.morale <= 30) {
    lines.push("The citizens grew desperate, their faith in medicine waning.");
  }

  if (won) {
    if (state.deaths === 0) lines.push("Not a single soul was lost. A miracle.");
    else if (state.deaths <= 5) lines.push("Only a handful were lost. The city remembers them.");
    lines.push("Songs would be sung of this doctor for generations.");
  } else {
    lines.push("But the doctor's sacrifice was not forgotten.");
    lines.push("One day, another healer would rise to finish what was started.");
  }

  state.epilogueLines = lines;
}
