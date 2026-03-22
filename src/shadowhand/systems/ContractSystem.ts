// ---------------------------------------------------------------------------
// Shadowhand mode — random contracts, guild news, rescue missions
// ---------------------------------------------------------------------------

import type { ShadowhandState, Contract } from "../state/ShadowhandState";
import { seedRng, addLog } from "../state/ShadowhandState";
import { TARGET_DEFS } from "../config/TargetDefs";

const CONTRACT_NAMES = [
  "The Crimson Letter", "A Noble's Secret", "The Merchant's Folly",
  "Moonlight Requisition", "The Bishop's Tithe", "Golden Opportunity",
  "Whispers in the Dark", "The Fence's Request", "A Score to Settle",
  "The King's Ransom", "Shadow Contract", "Midnight Errand",
  "The Collector's Prize", "Operation Blackbird", "Silent Harvest",
];

const NEWS_POOL = [
  "A merchant caravan arrives with exotic goods. Prices may drop.",
  "The Inquisition patrols the eastern quarter tonight.",
  "Rumors of a hidden vault beneath the old chapel...",
  "A noble's wedding means heavy guard presence at the manor.",
  "Fog rolls in from the river. Good night for shadows.",
  "A guard captain was found drunk on duty. Security is lax tonight.",
  "The King announces a tournament. All eyes on the arena.",
  "A fire in the market district draws guards away.",
  "New recruits join the city watch. They're green and jumpy.",
  "The guild fence has a buyer for enchanted items — premium prices.",
  "A rival thieves' guild was caught. The Inquisition is on high alert.",
  "Harvest festival tonight. The streets will be crowded.",
  "A traveling mage offers services at the tavern...",
  "The cathedral's relic display opens tomorrow. Heavy security expected.",
  "An informant whispers about a secret passage in the castle walls.",
];

const CREW_BANTER = [
  "feels restless. Itching for a good heist.",
  "is sharpening their tools by the fire.",
  "is studying the layout of the next target.",
  "shares a drink with the crew. Morale improves.",
  "has been practicing lockpicking on old chests.",
  "tells a story about their greatest heist.",
  "is counting gold coins nervously.",
  "mutters about the Inquisition getting closer.",
  "suggests a new approach for the next job.",
  "is nursing a wound from the last heist.",
];

export function generateContracts(state: ShadowhandState): void {
  const rng = seedRng(state.seed + state.guild.day * 31);
  const maxTier = Math.min(state.guild.tier + 1, 5);
  const available = TARGET_DEFS.filter(t => t.tier <= maxTier);
  if (available.length === 0) return;

  const contracts: Contract[] = [];

  // Generate 2-3 random contracts
  const count = 2 + (rng() < 0.4 ? 1 : 0);
  for (let i = 0; i < count && available.length > 0; i++) {
    const target = available[Math.floor(rng() * available.length)];
    const name = CONTRACT_NAMES[Math.floor(rng() * CONTRACT_NAMES.length)];
    const bonusGold = 50 + Math.floor(rng() * target.tier * 40);
    const bonusRep = 30 + Math.floor(rng() * target.tier * 25);
    const expiresDay = state.guild.day + 3 + Math.floor(rng() * 3);

    // Varied objectives
    const objRoll = rng();
    let objective: Contract["objective"];
    if (objRoll < 0.4) {
      objective = { type: "steal", desc: `Steal the ${target.primaryLoot.name}.` };
    } else if (objRoll < 0.6) {
      objective = { type: "timed", timeLimit: 60 + target.tier * 20, desc: `Speed run: complete in ${60 + target.tier * 20}s.` };
    } else if (objRoll < 0.8) {
      const count = 2 + Math.floor(target.tier / 2);
      objective = { type: "sabotage", targetsLeft: count, total: count, desc: `Extinguish ${count} torches.` };
    } else {
      objective = { type: "steal", desc: `Clean sweep: take everything of value.` };
    }

    contracts.push({
      id: `contract_${state.guild.day}_${i}`,
      name,
      desc: `${target.name} — ${objective.desc} Bonus: ${bonusGold}g + ${bonusRep} rep.`,
      targetId: target.id,
      objective,
      bonusGold,
      bonusRep,
      expiresDay,
      isRescue: false,
    });
  }

  // If crew is captured, add rescue mission
  for (const crewId of state.guild.capturedCrewIds) {
    const crew = state.guild.roster.find(c => c.id === crewId);
    if (!crew) continue;
    const rescueTarget = available.find(t => t.tier >= 2) ?? available[0];
    contracts.push({
      id: `rescue_${crewId}`,
      name: `Rescue ${crew.name}`,
      desc: `${crew.name} is held in ${rescueTarget.name}. Break them out!`,
      targetId: rescueTarget.id,
      objective: { type: "rescue", npcX: 0, npcY: 0, rescued: false, desc: `Find and rescue ${crew.name}.` },
      bonusGold: 0,
      bonusRep: 100,
      expiresDay: state.guild.day + 5,
      isRescue: true,
      rescueCrewId: crewId,
    });
  }

  state.guild.availableContracts = contracts;

  // Remove expired contracts
  state.guild.availableContracts = state.guild.availableContracts.filter(c => c.expiresDay > state.guild.day);
}

export function generateNews(state: ShadowhandState): void {
  const rng = seedRng(state.seed + state.guild.day * 17);
  const news: string[] = [];

  // 2-3 news items
  const count = 2 + (rng() < 0.3 ? 1 : 0);
  const pool = [...NEWS_POOL];
  for (let i = 0; i < count && pool.length > 0; i++) {
    const idx = Math.floor(rng() * pool.length);
    news.push(pool.splice(idx, 1)[0]);
  }

  // Crew banter
  const aliveCrew = state.guild.roster.filter(c => c.alive && !c.captured);
  if (aliveCrew.length > 0) {
    const crew = aliveCrew[Math.floor(rng() * aliveCrew.length)];
    const banter = CREW_BANTER[Math.floor(rng() * CREW_BANTER.length)];
    news.push(`${crew.name} ${banter}`);
  }

  // Heat warning
  const heat = state.guild.heat.get("default") ?? 0;
  if (heat > 40) news.push("The streets are restless. The Inquisition is watching.");
  if (heat > 60) news.push("\u26A0 Heat is dangerously high. Consider laying low.");

  // Tier-up teaser
  const nextTier = state.guild.tier + 1;
  if (nextTier < 5) {
    const needed = [0, 300, 800, 1800, 4000][nextTier] ?? 9999;
    const remaining = needed - state.guild.reputation;
    if (remaining > 0 && remaining < 200) {
      news.push(`Almost at Tier ${nextTier}! ${remaining} reputation needed.`);
    }
  }

  state.guild.news = news;
}

export function completeContract(state: ShadowhandState, contractId: string): void {
  const contract = state.guild.availableContracts.find(c => c.id === contractId);
  if (!contract) return;

  state.guild.gold += contract.bonusGold;
  state.guild.reputation += contract.bonusRep;
  addLog(state, `Contract "${contract.name}" complete! +${contract.bonusGold}g +${contract.bonusRep} rep.`);

  // Handle rescue
  if (contract.isRescue && contract.rescueCrewId) {
    const crew = state.guild.roster.find(c => c.id === contract.rescueCrewId);
    if (crew) {
      crew.alive = true;
      crew.captured = false;
      crew.hp = Math.floor(crew.maxHp * 0.5); // rescued at half health
      addLog(state, `${crew.name} has been rescued! They're weak but alive.`);
      state.guild.capturedCrewIds = state.guild.capturedCrewIds.filter(id => id !== contract.rescueCrewId);
    }
  }

  // Remove completed contract
  state.guild.availableContracts = state.guild.availableContracts.filter(c => c.id !== contractId);
}

export function updateCrewBonds(state: ShadowhandState, heistCrewIds: string[]): void {
  // Crew that survive heists together build bonds
  for (let i = 0; i < heistCrewIds.length; i++) {
    for (let j = i + 1; j < heistCrewIds.length; j++) {
      const key = [heistCrewIds[i], heistCrewIds[j]].sort().join("_");
      const current = state.guild.bonds.get(key) ?? 0;
      state.guild.bonds.set(key, Math.min(10, current + 1));
    }
  }
}

export function getCrewBondBonus(state: ShadowhandState, crewIds: string[]): number {
  let totalBond = 0;
  for (let i = 0; i < crewIds.length; i++) {
    for (let j = i + 1; j < crewIds.length; j++) {
      const key = [crewIds[i], crewIds[j]].sort().join("_");
      totalBond += state.guild.bonds.get(key) ?? 0;
    }
  }
  // Bond bonus: +5% score per bond level (capped at 50%)
  return Math.min(0.5, totalBond * 0.05);
}
