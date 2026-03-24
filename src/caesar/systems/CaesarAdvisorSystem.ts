// ---------------------------------------------------------------------------
// Caesar – Advisor system: detect problems and guide the player
// ---------------------------------------------------------------------------

import { CB } from "../config/CaesarBalance";
import { CaesarBuildingType } from "../config/CaesarBuildingDefs";
import { CaesarResourceType } from "../config/CaesarResourceDefs";
import type { CaesarState, CaesarAdvisorMessage } from "../state/CaesarState";

const ADVISOR_INTERVAL = 10; // seconds between checks
const MAX_MESSAGES = 5;

function addMessage(state: CaesarState, text: string, severity: CaesarAdvisorMessage["severity"]): void {
  // Don't duplicate recent messages
  if (state.advisorMessages.some((m) => m.text === text)) return;

  state.advisorMessages.push({ text, severity, timestamp: state.gameTick });

  // Keep only the most recent
  if (state.advisorMessages.length > MAX_MESSAGES) {
    state.advisorMessages.shift();
  }
}

export function updateAdvisor(state: CaesarState, dt: number): void {
  state.advisorTimer += dt;
  if (state.advisorTimer < ADVISOR_INTERVAL) return;
  state.advisorTimer -= ADVISOR_INTERVAL;

  // Clear old messages (older than 60 seconds)
  const expiry = state.gameTick - CB.SIM_TPS * 60;
  state.advisorMessages = state.advisorMessages.filter((m) => m.timestamp > expiry);

  const food = state.resources.get(CaesarResourceType.FOOD) ?? 0;
  const gold = state.resources.get(CaesarResourceType.GOLD) ?? 0;
  const wheat = state.resources.get(CaesarResourceType.WHEAT) ?? 0;

  // --- Critical warnings ---

  if (food <= 0 && state.population > 0) {
    addMessage(state, "No food! People are leaving. Build farms, mills, and bakeries.", "critical");
  }

  if (gold < 50 && state.population > 10) {
    addMessage(state, "Nearly bankrupt! Reduce maintenance or build more housing for taxes.", "critical");
  }

  if (state.tributeTimer < 20 && gold < (CB.TRIBUTE_BASE_AMOUNT + state.population * CB.TRIBUTE_PER_POP)) {
    addMessage(state, "Tribute due soon! You may not have enough gold to pay the King.", "warning");
  }

  // Active raid
  let banditCount = 0;
  for (const w of state.walkers.values()) {
    if (w.walkerType === "bandit" && w.alive) banditCount++;
  }
  if (banditCount > 0) {
    let hasMilitary = false;
    for (const b of state.buildings.values()) {
      if (b.built && (b.type === CaesarBuildingType.WATCHPOST || b.type === CaesarBuildingType.BARRACKS)) {
        hasMilitary = true;
        break;
      }
    }
    if (!hasMilitary) {
      addMessage(state, "Bandits attacking! Build watchposts or barracks to defend your town.", "critical");
    }
  }

  // --- Warnings ---

  if (food < 30 && food > 0 && state.population > 20) {
    addMessage(state, "Food supplies running low. Expand your food production chain.", "warning");
  }

  // No food production
  if (state.population > 10) {
    let hasFarm = false;
    let hasBakery = false;
    let hasMarket = false;
    for (const b of state.buildings.values()) {
      if (!b.built) continue;
      if (b.type === CaesarBuildingType.FARM) hasFarm = true;
      if (b.type === CaesarBuildingType.BAKERY || b.type === CaesarBuildingType.BUTCHER) hasBakery = true;
      if (b.type === CaesarBuildingType.MARKET) hasMarket = true;
    }
    if (!hasFarm) addMessage(state, "No farms! Build farms on grass tiles to grow wheat.", "warning");
    else if (!hasBakery && wheat > 20) addMessage(state, "Wheat piling up. Build a mill and bakery to convert it to food.", "info");
    if (!hasMarket && state.population > 30) addMessage(state, "No market! Build a market to deliver food service to housing.", "warning");
  }

  // Housing at capacity
  if (state.population >= state.maxPopulation * 0.9 && state.maxPopulation > 0) {
    addMessage(state, "Housing nearly full. Build more housing plots to attract immigrants.", "info");
  }

  // High unemployment
  if (state.unemployed > state.population * 0.4 && state.population > 30) {
    addMessage(state, "High unemployment! Build more workplaces to employ your people.", "warning");
  }

  // Cloth/tools needed for housing evolution
  const cloth = state.resources.get(CaesarResourceType.CLOTH) ?? 0;
  const tools = state.resources.get(CaesarResourceType.TOOLS) ?? 0;
  let manorCount = 0;
  let estateCount = 0;
  for (const b of state.buildings.values()) {
    if (b.type === CaesarBuildingType.HOUSING && b.built) {
      if (b.housingTier >= 3) manorCount++;
      if (b.housingTier >= 4) estateCount++;
    }
  }
  if (manorCount > 0 && cloth <= 0) {
    addMessage(state, "Manors need cloth! Build a weaver to produce cloth or they'll devolve.", "warning");
  }
  if (estateCount > 0 && tools <= 0) {
    addMessage(state, "Estates need tools! Build a blacksmith (needs iron mine) or they'll devolve.", "warning");
  }

  // Storage full
  for (const [rt, amount] of state.resources) {
    if (rt === CaesarResourceType.GOLD) continue;
    const cap = state.resourceCaps.get(rt) ?? CB.BASE_STORAGE_CAP;
    if (amount >= cap && cap < 999) {
      const name = rt.charAt(0).toUpperCase() + rt.slice(1);
      addMessage(state, `${name} storage full! Build a ${rt === CaesarResourceType.FOOD || rt === CaesarResourceType.WHEAT ? "granary" : "warehouse"} to increase capacity.`, "info");
      break; // Only one storage warning at a time
    }
  }

  // --- Fire warnings ---
  let fireCount = 0;
  for (const b of state.buildings.values()) {
    if (b.onFire) fireCount++;
  }
  if (fireCount > 0) {
    addMessage(state, `${fireCount} building${fireCount > 1 ? "s" : ""} on fire! Build watchposts to prevent fires.`, "critical");
  }

  // --- Morale warnings ---
  if (state.morale < 30) {
    addMessage(state, "Morale is critical! People are leaving. Improve food, entertainment, and safety.", "critical");
  } else if (state.morale < 50) {
    addMessage(state, "Morale is low. Build taverns, churches, or reduce unemployment.", "warning");
  }

  // --- Positive guidance ---
  if (state.population === 0 && state.gameTick < CB.SIM_TPS * 30) {
    addMessage(state, "Place housing plots near roads and a well to attract your first residents.", "info");
  }
}
