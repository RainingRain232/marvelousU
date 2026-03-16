// ---------------------------------------------------------------------------
// Grail Ball Manager -- Extended Systems
// Youth Academy, Transfer Market Negotiation, Press Conferences,
// Injuries & Fitness tracking.
// ---------------------------------------------------------------------------

import {
  PlayerClass, Injury, FacilityType, GBM, PlayerDef, PlayerTrait,
  generatePlayer, generatePlayerId,
} from "./GrailManagerConfig";
import type { PlayerStats } from "./GrailManagerConfig";

import {
  GrailManagerState,
  getOverall, getPlayerFullName,
} from "./GrailManagerState";

// ===========================================================================
// 1. YOUTH ACADEMY — Develop young players over multiple seasons
// ===========================================================================

export interface YouthProspect {
  player: PlayerDef;
  weeksInAcademy: number;
  developmentRate: number;   // 0.5 = slow, 1.0 = normal, 1.5 = fast
  readyToPromote: boolean;
  scoutReport: string;
  mentorPlayerId: string | null; // senior player mentoring this youth
}

export interface YouthAcademyState {
  prospects: YouthProspect[];
  maxProspects: number;         // depends on facility level
  weeklyDevelopment: boolean;   // has development been run this week
  totalGraduates: number;
  bestGraduateRating: number;
}

/** Create a fresh youth academy state */
export function createYouthAcademy(facilityLevel: number): YouthAcademyState {
  return {
    prospects: [],
    maxProspects: 3 + facilityLevel * 2,
    weeklyDevelopment: false,
    totalGraduates: 0,
    bestGraduateRating: 0,
  };
}

/** Generate a new youth prospect based on academy level */
export function generateYouthProspect(academyLevel: number): YouthProspect {
  const classes = [PlayerClass.KNIGHT, PlayerClass.ROGUE, PlayerClass.MAGE, PlayerClass.GATEKEEPER];
  const cls = classes[Math.floor(Math.random() * classes.length)];
  const quality = 0.4 + academyLevel * 0.12 + Math.random() * 0.2;
  const age = GBM.YOUTH_MIN_AGE + Math.floor(Math.random() * (GBM.YOUTH_MAX_AGE - GBM.YOUTH_MIN_AGE + 1));
  const player = generatePlayer(cls, quality, age, true);
  player.wage = Math.round(player.wage * GBM.YOUTH_WAGE_MULT);

  const developmentRate = 0.6 + Math.random() * 0.8 + academyLevel * 0.1;
  const scoutReports = [
    "Shows flashes of brilliance in training.",
    "Quiet but determined. Could develop into a solid player.",
    "Raw talent, needs refinement. High ceiling.",
    "The coaches are excited about this one.",
    "Needs work on positioning but has natural instincts.",
    "A fierce competitor with a warrior's heart.",
    "Gifted with the Orb. Magically talented beyond his years.",
    "Quick feet and sharp mind. A natural on the field.",
  ];

  return {
    player,
    weeksInAcademy: 0,
    developmentRate,
    readyToPromote: false,
    scoutReport: scoutReports[Math.floor(Math.random() * scoutReports.length)],
    mentorPlayerId: null,
  };
}

/** Run weekly youth academy development */
export function tickYouthAcademy(
  state: GrailManagerState,
  academy: YouthAcademyState,
  academyLevel: number,
): string[] {
  const events: string[] = [];

  // Spawn new prospects if we have room
  const spawnChance = GBM.YOUTH_SPAWN_CHANCE * academyLevel;
  if (academy.prospects.length < academy.maxProspects && Math.random() < spawnChance) {
    const prospect = generateYouthProspect(academyLevel);
    academy.prospects.push(prospect);
    events.push(`Youth prospect ${getPlayerFullName(prospect.player)} (${prospect.player.class}, age ${prospect.player.age}) enters the academy!`);
  }

  // Develop each prospect
  for (const prospect of academy.prospects) {
    prospect.weeksInAcademy++;

    // Stat growth based on development rate and academy level
    const growthChance = GBM.TRAINING_STAT_GAIN_BASE * prospect.developmentRate * (1 + academyLevel * 0.15);

    const statKeys: (keyof PlayerStats)[] = ["attack", "defense", "speed", "magic", "stamina"];
    for (const stat of statKeys) {
      if (Math.random() < growthChance) {
        const ceiling = Math.min(99, prospect.player.potential);
        if (prospect.player.stats[stat] < ceiling) {
          prospect.player.stats[stat] = Math.min(ceiling, prospect.player.stats[stat] + 1);
        }
      }
    }

    // Mentoring bonus
    if (prospect.mentorPlayerId) {
      const team = state.teams[state.playerTeamId];
      const mentor = team?.squad.find(p => p.id === prospect.mentorPlayerId);
      if (mentor && Math.random() < 0.15) {
        // Mentor's best stat influences youth growth
        const mentorBestStat = (Object.entries(mentor.stats) as [keyof PlayerStats, number][])
          .filter(([k]) => k !== "morale")
          .sort((a, b) => b[1] - a[1])[0];
        if (mentorBestStat && prospect.player.stats[mentorBestStat[0]] < prospect.player.potential) {
          prospect.player.stats[mentorBestStat[0]]++;
          events.push(`${getPlayerFullName(prospect.player)} learns from mentor ${getPlayerFullName(mentor)}!`);
        }
      }
    }

    // Morale boost from academy
    prospect.player.stats.morale = Math.min(99, prospect.player.stats.morale + 1);

    // Check promotion readiness (after enough weeks or high enough rating)
    const overall = getOverall(prospect.player);
    if (prospect.weeksInAcademy >= 8 || overall >= 55) {
      prospect.readyToPromote = true;
    }

    // Age up at mid-season
    if (state.currentWeek === 15) {
      prospect.player.age++;
      if (prospect.player.age > 19) {
        prospect.readyToPromote = true;
      }
    }
  }

  academy.weeklyDevelopment = true;
  academy.maxProspects = 3 + academyLevel * 2;

  return events;
}

/** Promote a youth prospect to the senior squad */
export function promoteYouthProspect(
  state: GrailManagerState,
  academy: YouthAcademyState,
  prospectIndex: number,
): { success: boolean; message: string } {
  if (prospectIndex < 0 || prospectIndex >= academy.prospects.length) {
    return { success: false, message: "Invalid prospect." };
  }

  const team = state.teams[state.playerTeamId];
  if (!team) return { success: false, message: "No team found." };

  if (team.squad.length >= GBM.SQUAD_MAX) {
    return { success: false, message: "Squad is full! Sell or release a player first." };
  }

  const prospect = academy.prospects[prospectIndex];
  prospect.player.isYouth = false;
  prospect.player.id = generatePlayerId();
  team.squad.push(prospect.player);

  academy.prospects.splice(prospectIndex, 1);
  academy.totalGraduates++;
  academy.bestGraduateRating = Math.max(academy.bestGraduateRating, getOverall(prospect.player));

  return {
    success: true,
    message: `${getPlayerFullName(prospect.player)} promoted to the senior squad! (Overall: ${getOverall(prospect.player)})`,
  };
}

// ===========================================================================
// 2. TRANSFER MARKET — Buy/sell with negotiation mini-game
// ===========================================================================

export enum NegotiationPhase {
  INITIAL_OFFER = "initial_offer",
  COUNTER_OFFER = "counter_offer",
  FINAL_OFFER = "final_offer",
  ACCEPTED = "accepted",
  REJECTED = "rejected",
  WALKED_AWAY = "walked_away",
}

export interface TransferNegotiation {
  playerId: string;
  playerName: string;
  sellerTeamId: string;
  buyerTeamId: string;
  askingPrice: number;
  currentOffer: number;
  counterOffer: number;
  phase: NegotiationPhase;
  roundsRemaining: number;
  sellerMood: number;           // 0-100: higher = more willing to sell
  buyerLeverage: number;        // 0-1: influenced by scouting, reputation
  wageOffer: number;
  contractYears: number;
  messages: string[];           // negotiation dialogue
}

/** Start a negotiation for a transfer market player */
export function startNegotiation(
  state: GrailManagerState,
  playerId: string,
  sellerTeamId: string,
  askingPrice: number,
  playerName: string,
): TransferNegotiation {
  const scoutLevel = state.facilities[FacilityType.SCOUTING_NETWORK] ?? 0;
  const buyerLeverage = Math.min(1, 0.3 + scoutLevel * 0.1 + state.managerReputation * 0.003);

  return {
    playerId,
    playerName,
    sellerTeamId,
    buyerTeamId: state.playerTeamId,
    askingPrice,
    currentOffer: 0,
    counterOffer: askingPrice,
    phase: NegotiationPhase.INITIAL_OFFER,
    roundsRemaining: 3,
    sellerMood: 50 + Math.floor(Math.random() * 30),
    buyerLeverage,
    wageOffer: 0,
    contractYears: 3,
    messages: [`The negotiations for ${playerName} begin. They are asking ${askingPrice}g.`],
  };
}

/** Submit a bid in the negotiation */
export function submitBid(
  negotiation: TransferNegotiation,
  bidAmount: number,
  wageOffer: number,
  contractYears: number,
): void {
  negotiation.currentOffer = bidAmount;
  negotiation.wageOffer = wageOffer;
  negotiation.contractYears = contractYears;
  negotiation.roundsRemaining--;

  const ratio = bidAmount / negotiation.askingPrice;
  const variance = GBM.TRANSFER_NEGOTIATION_VARIANCE;

  if (ratio >= 1.0) {
    // Met or exceeded asking price
    negotiation.phase = NegotiationPhase.ACCEPTED;
    negotiation.messages.push(`Your offer of ${bidAmount}g has been accepted! The deal is done.`);
  } else if (ratio >= 0.85 + (Math.random() - 0.5) * variance) {
    // Close enough, they accept
    negotiation.phase = NegotiationPhase.ACCEPTED;
    negotiation.messages.push(`After deliberation, they accept your offer of ${bidAmount}g.`);
  } else if (negotiation.roundsRemaining <= 0) {
    // Out of rounds
    if (ratio >= 0.7) {
      // Final chance acceptance
      if (Math.random() < negotiation.buyerLeverage + ratio - 0.7) {
        negotiation.phase = NegotiationPhase.ACCEPTED;
        negotiation.messages.push(`With the deadline looming, they reluctantly accept ${bidAmount}g.`);
      } else {
        negotiation.phase = NegotiationPhase.REJECTED;
        negotiation.messages.push(`They reject your final offer. The negotiations have collapsed.`);
      }
    } else {
      negotiation.phase = NegotiationPhase.REJECTED;
      negotiation.messages.push(`Your offer was too low. They walk away from the table.`);
    }
  } else {
    // Counter offer
    negotiation.phase = NegotiationPhase.COUNTER_OFFER;
    const moodFactor = negotiation.sellerMood / 100;
    const reduction = (1 - ratio) * 0.4 * moodFactor;
    negotiation.counterOffer = Math.round(negotiation.askingPrice * (1 - reduction));
    negotiation.counterOffer = Math.max(negotiation.counterOffer, bidAmount + 50);

    const dialogues = [
      `"${bidAmount}g? You insult us. We want at least ${negotiation.counterOffer}g."`,
      `"Not enough gold. Come back with ${negotiation.counterOffer}g and we'll talk."`,
      `"We appreciate the interest, but the price is ${negotiation.counterOffer}g. Take it or leave it."`,
      `"The player is worth more than that. ${negotiation.counterOffer}g is our counter."`,
    ];
    negotiation.messages.push(dialogues[Math.floor(Math.random() * dialogues.length)]);

    // Mood shifts
    if (ratio < 0.5) {
      negotiation.sellerMood = Math.max(10, negotiation.sellerMood - 15);
      negotiation.messages.push("The seller seems annoyed by the lowball offer.");
    } else if (ratio > 0.8) {
      negotiation.sellerMood = Math.min(100, negotiation.sellerMood + 10);
      negotiation.messages.push("The seller is warming to the negotiation.");
    }
  }
}

/** Walk away from negotiations */
export function walkAwayFromNegotiation(negotiation: TransferNegotiation): void {
  negotiation.phase = NegotiationPhase.WALKED_AWAY;
  negotiation.messages.push("You have walked away from the negotiation table.");
}

/** Finalize a completed negotiation (transfer the player) */
export function finalizeTransfer(
  state: GrailManagerState,
  negotiation: TransferNegotiation,
): { success: boolean; message: string } {
  if (negotiation.phase !== NegotiationPhase.ACCEPTED) {
    return { success: false, message: "Negotiation not accepted." };
  }

  const team = state.teams[state.playerTeamId];
  if (!team) return { success: false, message: "No team found." };
  if (team.squad.length >= GBM.SQUAD_MAX) {
    return { success: false, message: "Squad is full!" };
  }
  if (state.gold < negotiation.currentOffer) {
    return { success: false, message: "Insufficient funds!" };
  }

  // Find the player on the market
  const listing = state.transferMarket.find(l => l.player.id === negotiation.playerId);
  if (!listing) return { success: false, message: "Player no longer available." };

  // Transfer the player
  const newPlayer = { ...listing.player };
  newPlayer.id = generatePlayerId();
  newPlayer.wage = negotiation.wageOffer || newPlayer.wage;
  newPlayer.contractYears = negotiation.contractYears;
  team.squad.push(newPlayer);

  // Remove from market
  state.transferMarket = state.transferMarket.filter(l => l.player.id !== negotiation.playerId);

  // Deduct funds
  state.gold -= negotiation.currentOffer;
  state.seasonExpenses += negotiation.currentOffer;

  // News
  state.news.push({
    week: state.currentWeek,
    text: `TRANSFER COMPLETE: ${getPlayerFullName(newPlayer)} joins ${state.playerClubName} for ${negotiation.currentOffer}g!`,
    type: "transfer",
  });

  return {
    success: true,
    message: `${getPlayerFullName(newPlayer)} has signed for ${negotiation.currentOffer}g on a ${negotiation.contractYears}-year deal!`,
  };
}

/** Sell a player from your squad */
export function sellPlayer(
  state: GrailManagerState,
  playerId: string,
  salePrice: number,
): { success: boolean; message: string } {
  const team = state.teams[state.playerTeamId];
  if (!team) return { success: false, message: "No team found." };

  const playerIdx = team.squad.findIndex(p => p.id === playerId);
  if (playerIdx === -1) return { success: false, message: "Player not found in squad." };

  if (team.squad.length <= GBM.SQUAD_MIN) {
    return { success: false, message: "Cannot sell: squad would be below minimum size." };
  }

  const player = team.squad[playerIdx];
  team.squad.splice(playerIdx, 1);

  // Remove from lineup/subs if present
  team.startingLineup = team.startingLineup.filter(id => id !== playerId);
  team.substitutes = team.substitutes.filter(id => id !== playerId);

  // Add funds
  state.gold += salePrice;
  state.seasonRevenue += salePrice;

  state.news.push({
    week: state.currentWeek,
    text: `${getPlayerFullName(player)} has been sold for ${salePrice}g.`,
    type: "transfer",
  });

  return {
    success: true,
    message: `${getPlayerFullName(player)} sold for ${salePrice}g.`,
  };
}

// ===========================================================================
// 3. PRESS CONFERENCES — Dialogue choices affecting morale and fan support
// ===========================================================================

export interface PressConferenceChoice {
  text: string;
  moraleEffect: number;         // -10 to +10 applied to all squad
  fanSupportEffect: number;     // -10 to +10 applied to manager reputation
  rivalryEffect: number;        // 0 = neutral, negative = aggravate rivals
  description: string;          // flavor text for the result
}

export interface PressConference {
  id: string;
  title: string;
  prompt: string;
  choices: PressConferenceChoice[];
  context: "pre_match" | "post_win" | "post_loss" | "post_draw" | "transfer" | "crisis" | "season_start";
}

/** Pool of press conference templates */
const PRESS_CONFERENCE_POOL: Omit<PressConference, "id">[] = [
  // Pre-match
  {
    title: "Pre-Match Press Conference",
    prompt: "A reporter asks: 'How do you assess the upcoming match against your opponents?'",
    context: "pre_match",
    choices: [
      {
        text: "We respect them, but we're confident in our preparation.",
        moraleEffect: 3,
        fanSupportEffect: 2,
        rivalryEffect: 0,
        description: "A balanced, professional response. The squad feels quietly confident.",
      },
      {
        text: "They should be afraid of us. We'll crush them on the pitch.",
        moraleEffect: 5,
        fanSupportEffect: 4,
        rivalryEffect: -5,
        description: "Bold words! The fans love it, but you've given the opponents extra motivation.",
      },
      {
        text: "It will be a tough match. We need to be at our best.",
        moraleEffect: 1,
        fanSupportEffect: 1,
        rivalryEffect: 0,
        description: "A cautious response. No one is inspired, but no one is angered either.",
      },
    ],
  },
  // Post-win
  {
    title: "Post-Match Press Conference (Victory)",
    prompt: "The scribes ask: 'A magnificent victory! What was the key to success?'",
    context: "post_win",
    choices: [
      {
        text: "The players were outstanding. Every single one of them gave their all.",
        moraleEffect: 6,
        fanSupportEffect: 3,
        rivalryEffect: 0,
        description: "The players are thrilled by the public praise. Morale soars!",
      },
      {
        text: "Our tactical preparation was flawless. This is just the beginning.",
        moraleEffect: 2,
        fanSupportEffect: 5,
        rivalryEffect: -2,
        description: "The fans see you as a tactical genius. Other managers take note.",
      },
      {
        text: "We were lucky today. We need to improve for next week.",
        moraleEffect: -2,
        fanSupportEffect: -1,
        rivalryEffect: 0,
        description: "Your humility is noted, but the players feel undervalued after their hard work.",
      },
    ],
  },
  // Post-loss
  {
    title: "Post-Match Press Conference (Defeat)",
    prompt: "The crowd murmurs as a reporter asks: 'What went wrong out there today?'",
    context: "post_loss",
    choices: [
      {
        text: "I take full responsibility. We will come back stronger.",
        moraleEffect: 4,
        fanSupportEffect: 3,
        rivalryEffect: 0,
        description: "The players respect your leadership. The fans appreciate your accountability.",
      },
      {
        text: "The referee's decisions were questionable. We were robbed!",
        moraleEffect: 2,
        fanSupportEffect: -3,
        rivalryEffect: -3,
        description: "The players rally behind you, but the league officials are not impressed.",
      },
      {
        text: "Some players didn't perform today. Changes will be made.",
        moraleEffect: -5,
        fanSupportEffect: 2,
        rivalryEffect: 0,
        description: "The fans see decisive leadership, but the dressing room is tense.",
      },
    ],
  },
  // Post-draw
  {
    title: "Post-Match Press Conference (Draw)",
    prompt: "A scribe asks: 'Are you satisfied with the point, or disappointed?'",
    context: "post_draw",
    choices: [
      {
        text: "A point is a point. We'll take it and move on.",
        moraleEffect: 1,
        fanSupportEffect: 0,
        rivalryEffect: 0,
        description: "A pragmatic view. The squad accepts it and looks ahead.",
      },
      {
        text: "We should have won. We dominated but couldn't finish.",
        moraleEffect: -1,
        fanSupportEffect: 2,
        rivalryEffect: 0,
        description: "The fans agree, but the strikers feel the pressure of expectation.",
      },
      {
        text: "Given the circumstances, I'm proud of how we fought back.",
        moraleEffect: 4,
        fanSupportEffect: 3,
        rivalryEffect: 0,
        description: "The squad feels united and appreciated. Good spirit for next week.",
      },
    ],
  },
  // Transfer window
  {
    title: "Transfer Window Press Conference",
    prompt: "Rumors swirl! A reporter asks: 'Are you looking to make signings this window?'",
    context: "transfer",
    choices: [
      {
        text: "We're always looking to improve. If the right player becomes available...",
        moraleEffect: 0,
        fanSupportEffect: 3,
        rivalryEffect: 0,
        description: "The fans are excited by the prospect of new signings.",
      },
      {
        text: "I'm happy with my squad. We don't need anyone.",
        moraleEffect: 5,
        fanSupportEffect: -2,
        rivalryEffect: 0,
        description: "Current players are delighted by your faith in them, but fans want ambition.",
      },
      {
        text: "Yes, we have a big-name target. Watch this space.",
        moraleEffect: 2,
        fanSupportEffect: 6,
        rivalryEffect: -2,
        description: "Fan excitement reaches fever pitch! Other clubs are now on alert.",
      },
    ],
  },
  // Crisis (injury/losing streak)
  {
    title: "Emergency Press Conference",
    prompt: "The situation is dire. A reporter presses: 'How do you plan to turn things around?'",
    context: "crisis",
    choices: [
      {
        text: "We stick together. This squad has the character to overcome adversity.",
        moraleEffect: 6,
        fanSupportEffect: 4,
        rivalryEffect: 0,
        description: "A rallying cry! The dressing room unites behind the manager.",
      },
      {
        text: "I need time. Rome wasn't built in a day, and neither is a Grail Ball team.",
        moraleEffect: 1,
        fanSupportEffect: -2,
        rivalryEffect: 0,
        description: "The board gives you a knowing look. Patience is wearing thin.",
      },
      {
        text: "Heads will roll if performances don't improve immediately.",
        moraleEffect: -4,
        fanSupportEffect: 3,
        rivalryEffect: 0,
        description: "Fear grips the dressing room. Some players step up, others crumble.",
      },
    ],
  },
  // Season start
  {
    title: "Season Opening Press Conference",
    prompt: "The new season dawns! 'What are your ambitions for the campaign ahead?'",
    context: "season_start",
    choices: [
      {
        text: "We're going for the title. Anything less is failure.",
        moraleEffect: 3,
        fanSupportEffect: 6,
        rivalryEffect: -3,
        description: "Bold ambition! The fans are buzzing, but the pressure is immense.",
      },
      {
        text: "We aim to improve on last season and compete at the top.",
        moraleEffect: 4,
        fanSupportEffect: 3,
        rivalryEffect: 0,
        description: "A measured response that sets realistic expectations.",
      },
      {
        text: "It's a rebuilding year. We're developing for the future.",
        moraleEffect: -2,
        fanSupportEffect: -3,
        rivalryEffect: 0,
        description: "The fans are deflated. Some players wonder about their future here.",
      },
    ],
  },
];

/** Generate a press conference for the given context */
export function generatePressConference(context: PressConference["context"]): PressConference {
  const pool = PRESS_CONFERENCE_POOL.filter(pc => pc.context === context);
  const template = pool.length > 0
    ? pool[Math.floor(Math.random() * pool.length)]
    : PRESS_CONFERENCE_POOL[0];

  return {
    id: `pc_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    ...template,
  };
}

/** Apply a press conference choice to the game state */
export function applyPressConferenceChoice(
  state: GrailManagerState,
  conference: PressConference,
  choiceIndex: number,
): string[] {
  const choice = conference.choices[choiceIndex];
  if (!choice) return ["Invalid choice."];

  const events: string[] = [];
  const team = state.teams[state.playerTeamId];

  // Apply morale effect to all squad members
  if (team && choice.moraleEffect !== 0) {
    for (const p of team.squad) {
      p.stats.morale = Math.max(1, Math.min(99, p.stats.morale + choice.moraleEffect));
    }
    if (choice.moraleEffect > 0) {
      events.push(`Squad morale boosted by ${choice.moraleEffect} points!`);
    } else {
      events.push(`Squad morale dropped by ${Math.abs(choice.moraleEffect)} points.`);
    }
  }

  // Apply fan support / reputation effect
  if (choice.fanSupportEffect !== 0) {
    state.managerReputation = Math.max(1, Math.min(100, state.managerReputation + choice.fanSupportEffect));
    if (choice.fanSupportEffect > 0) {
      events.push(`Fan support increases! (+${choice.fanSupportEffect} reputation)`);
    } else {
      events.push(`Fan support decreases. (${choice.fanSupportEffect} reputation)`);
    }
  }

  // Rivalry effect (affects upcoming match difficulty indirectly via morale of opponents)
  // For now, just note it in the news
  if (choice.rivalryEffect < 0) {
    events.push("Your words have motivated the opposition!");
  }

  events.push(choice.description);

  // Add to news
  state.news.push({
    week: state.currentWeek,
    text: `PRESS: ${conference.title} - "${choice.text}" ${choice.description}`,
    type: "info",
  });

  return events;
}

// ===========================================================================
// 4. INJURIES AND FITNESS — Fatigue tracking, injury risk, recovery
// ===========================================================================

export interface PlayerFitnessData {
  playerId: string;
  matchFitness: number;           // 0-100: how fit for match action
  trainingLoad: number;           // 0-100: accumulated training stress
  restDaysNeeded: number;         // how many rest days recommended
  injuryRisk: number;             // 0-1: probability of injury this week
  lastMatchMinutes: number;       // minutes played last match
  consecutiveStarts: number;      // how many matches in a row they've started
  seasonMinutesPlayed: number;    // total minutes this season
}

/** Create fitness tracking data for a player */
export function createPlayerFitness(playerId: string): PlayerFitnessData {
  return {
    playerId,
    matchFitness: 80 + Math.floor(Math.random() * 20),
    trainingLoad: 0,
    restDaysNeeded: 0,
    injuryRisk: 0,
    lastMatchMinutes: 0,
    consecutiveStarts: 0,
    seasonMinutesPlayed: 0,
  };
}

/** Update fitness after a match */
export function updateFitnessAfterMatch(
  fitness: PlayerFitnessData,
  player: PlayerDef,
  minutesPlayed: number,
  wasStarter: boolean,
): void {
  fitness.lastMatchMinutes = minutesPlayed;
  fitness.seasonMinutesPlayed += minutesPlayed;

  if (wasStarter) {
    fitness.consecutiveStarts++;
  } else {
    fitness.consecutiveStarts = 0;
  }

  // Fitness drops based on minutes played and age
  const ageFactor = player.age > 30 ? 1.3 : player.age > 28 ? 1.1 : 1.0;
  const fitnessDrop = (minutesPlayed / 10) * ageFactor * (1 + fitness.trainingLoad * 0.01);
  fitness.matchFitness = Math.max(0, fitness.matchFitness - fitnessDrop);

  // Training load increases
  fitness.trainingLoad = Math.min(100, fitness.trainingLoad + minutesPlayed * 0.3);

  // Calculate rest days needed
  if (fitness.matchFitness < 40) {
    fitness.restDaysNeeded = 3;
  } else if (fitness.matchFitness < 60) {
    fitness.restDaysNeeded = 2;
  } else if (fitness.matchFitness < 80) {
    fitness.restDaysNeeded = 1;
  } else {
    fitness.restDaysNeeded = 0;
  }
}

/** Weekly fitness recovery tick */
export function tickWeeklyFitness(
  fitness: PlayerFitnessData,
  player: PlayerDef,
  isResting: boolean,
  medicalBayLevel: number,
): void {
  // Base recovery
  const recoveryRate = isResting ? 20 : 10;
  const medicalBonus = medicalBayLevel * 3;

  fitness.matchFitness = Math.min(100, fitness.matchFitness + recoveryRate + medicalBonus);
  fitness.trainingLoad = Math.max(0, fitness.trainingLoad - (isResting ? 30 : 15) - medicalBonus);

  if (fitness.restDaysNeeded > 0) {
    fitness.restDaysNeeded = Math.max(0, fitness.restDaysNeeded - 1);
  }

  // Calculate injury risk
  const baseFatigueRisk = (100 - fitness.matchFitness) * 0.002;
  const overplayRisk = fitness.consecutiveStarts > 3 ? (fitness.consecutiveStarts - 3) * 0.01 : 0;
  const ageRisk = player.age > 30 ? 0.02 : player.age > 28 ? 0.01 : 0;
  const traitRisk = player.trait === PlayerTrait.FRAGILE ? 0.03 : 0;
  const traitProtect = player.trait === PlayerTrait.IRONWILL ? -0.01 : 0;
  const loadRisk = fitness.trainingLoad > 70 ? (fitness.trainingLoad - 70) * 0.001 : 0;

  fitness.injuryRisk = Math.max(0, Math.min(0.5,
    GBM.INJURY_CHANCE_BASE + baseFatigueRisk + overplayRisk + ageRisk + traitRisk + traitProtect + loadRisk
  ));
}

/** Roll for injury based on current fitness risk */
export function rollForInjury(
  fitness: PlayerFitnessData,
  _player: PlayerDef,
  medicalBayLevel: number,
): { injured: boolean; injury: Injury; weeks: number } {
  const medicalProtection = medicalBayLevel * 0.005;
  const effectiveRisk = Math.max(0, fitness.injuryRisk - medicalProtection);

  if (Math.random() >= effectiveRisk) {
    return { injured: false, injury: Injury.NONE, weeks: 0 };
  }

  // Determine severity
  const severityRoll = Math.random();
  let injury: Injury;
  let weeks: number;

  if (severityRoll < 0.35) {
    injury = Injury.MINOR_BRUISE;
    weeks = 1;
  } else if (severityRoll < 0.55) {
    injury = Injury.TWISTED_ANKLE;
    weeks = 1 + Math.floor(Math.random() * 2);
  } else if (severityRoll < 0.70) {
    injury = Injury.ENCHANTMENT_FATIGUE;
    weeks = 1 + Math.floor(Math.random() * 2);
  } else if (severityRoll < 0.82) {
    injury = Injury.CONCUSSION;
    weeks = 2 + Math.floor(Math.random() * 2);
  } else if (severityRoll < 0.92) {
    injury = Injury.MAGICAL_BURN;
    weeks = 2 + Math.floor(Math.random() * 3);
  } else if (severityRoll < 0.97) {
    injury = Injury.BROKEN_ARM;
    weeks = 3 + Math.floor(Math.random() * 3);
  } else {
    injury = Injury.TORN_LIGAMENT;
    weeks = 4 + Math.floor(Math.random() * 4);
  }

  // Medical bay reduces recovery time
  const reduction = Math.floor(weeks * medicalBayLevel * 0.1);
  weeks = Math.max(1, weeks - reduction);

  return { injured: true, injury, weeks };
}

/** Get squad fitness summary for rotation recommendations */
export function getSquadFitnessSummary(
  fitnessMap: Map<string, PlayerFitnessData>,
  squad: PlayerDef[],
): { atRisk: PlayerDef[]; needsRest: PlayerDef[]; fullyFit: PlayerDef[]; averageFitness: number } {
  const atRisk: PlayerDef[] = [];
  const needsRest: PlayerDef[] = [];
  const fullyFit: PlayerDef[] = [];
  let totalFitness = 0;

  for (const p of squad) {
    if (p.injury !== Injury.NONE) continue;

    const fitness = fitnessMap.get(p.id);
    if (!fitness) {
      fullyFit.push(p);
      totalFitness += 80;
      continue;
    }

    totalFitness += fitness.matchFitness;

    if (fitness.injuryRisk > 0.1) {
      atRisk.push(p);
    } else if (fitness.restDaysNeeded > 0 || fitness.matchFitness < 60) {
      needsRest.push(p);
    } else {
      fullyFit.push(p);
    }
  }

  const availableCount = squad.filter(p => p.injury === Injury.NONE).length;
  return {
    atRisk,
    needsRest,
    fullyFit,
    averageFitness: availableCount > 0 ? Math.round(totalFitness / availableCount) : 0,
  };
}
