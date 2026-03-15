// ---------------------------------------------------------------------------
// Grail Ball Manager — AI Manager Decisions
// Handles AI team management: transfers, training, tactics, lineup selection,
// and difficulty scaling. Each team has a personality that influences behavior.
// ---------------------------------------------------------------------------

import {
  PlayerClass, Formation, TeamInstruction,
  TrainingType, Injury, GBM,
  generatePlayerId,
} from "./GrailManagerConfig";

import {
  GrailManagerState, TeamState,
  getOverall, pickBestLineup,
} from "./GrailManagerState";

// ---------------------------------------------------------------------------
// AI Personality Types
// ---------------------------------------------------------------------------

interface AIPersonality {
  transferAggression: number;    // 0..1 how eager to buy
  youthPreference: number;       // 0..1 prefer young players
  tacticalFlexibility: number;   // 0..1 how often to change tactics
  trainingFocus: TrainingType;   // default training
  spendingWillingness: number;   // 0..1 of budget willing to spend
}

const PERSONALITIES: Record<string, AIPersonality> = {
  prestigious: {
    transferAggression: 0.7,
    youthPreference: 0.3,
    tacticalFlexibility: 0.4,
    trainingFocus: TrainingType.TEAMWORK,
    spendingWillingness: 0.8,
  },
  magical: {
    transferAggression: 0.5,
    youthPreference: 0.4,
    tacticalFlexibility: 0.3,
    trainingFocus: TrainingType.SPELLWORK,
    spendingWillingness: 0.6,
  },
  aggressive: {
    transferAggression: 0.8,
    youthPreference: 0.2,
    tacticalFlexibility: 0.5,
    trainingFocus: TrainingType.ATTACKING,
    spendingWillingness: 0.9,
  },
  defensive: {
    transferAggression: 0.4,
    youthPreference: 0.3,
    tacticalFlexibility: 0.2,
    trainingFocus: TrainingType.DEFENDING,
    spendingWillingness: 0.5,
  },
  "youth-focused": {
    transferAggression: 0.3,
    youthPreference: 0.9,
    tacticalFlexibility: 0.4,
    trainingFocus: TrainingType.FITNESS,
    spendingWillingness: 0.4,
  },
  physical: {
    transferAggression: 0.5,
    youthPreference: 0.2,
    tacticalFlexibility: 0.3,
    trainingFocus: TrainingType.FITNESS,
    spendingWillingness: 0.6,
  },
  "counter-attack": {
    transferAggression: 0.6,
    youthPreference: 0.4,
    tacticalFlexibility: 0.6,
    trainingFocus: TrainingType.SPEED,
    spendingWillingness: 0.7,
  },
  tactical: {
    transferAggression: 0.5,
    youthPreference: 0.5,
    tacticalFlexibility: 0.8,
    trainingFocus: TrainingType.TEAMWORK,
    spendingWillingness: 0.6,
  },
};

function getPersonality(team: TeamState): AIPersonality {
  return PERSONALITIES[team.teamDef.personality] || PERSONALITIES.prestigious;
}

// ---------------------------------------------------------------------------
// AI Weekly Decisions
// ---------------------------------------------------------------------------

export function aiWeeklyDecisions(state: GrailManagerState): void {
  for (const [teamId, team] of Object.entries(state.teams)) {
    if (teamId === state.playerTeamId) continue;
    const personality = getPersonality(team);

    // 1. Update lineup
    aiUpdateLineup(team);

    // 2. Set training
    aiSetTraining(team, personality);

    // 3. Consider tactical changes
    aiTacticalAdjustment(team, personality, state);

    // 4. Transfer decisions (if window is open)
    if (state.transferWindowOpen) {
      aiTransferDecisions(state, teamId, team, personality);
    }
  }
}

// ---------------------------------------------------------------------------
// Lineup Selection
// ---------------------------------------------------------------------------

function aiUpdateLineup(team: TeamState): void {
  const result = pickBestLineup(team.squad, team.formation);
  team.startingLineup = result.lineup.map(p => p.id);
  team.substitutes = result.subs.map(p => p.id);
}

// ---------------------------------------------------------------------------
// Training Selection
// ---------------------------------------------------------------------------

function aiSetTraining(team: TeamState, personality: AIPersonality): void {
  // Occasionally vary training
  if (Math.random() < 0.3) {
    const trainingOptions = [
      TrainingType.FITNESS,
      TrainingType.ATTACKING,
      TrainingType.DEFENDING,
      TrainingType.SPEED,
      TrainingType.SPELLWORK,
      TrainingType.TEAMWORK,
      TrainingType.REST,
    ];

    // Weighted toward personality preference
    if (Math.random() < 0.6) {
      team.trainingType = personality.trainingFocus;
    } else {
      team.trainingType = trainingOptions[Math.floor(Math.random() * trainingOptions.length)];
    }

    // If many injuries, prioritize rest
    const injuredCount = team.squad.filter(p => p.injury !== Injury.NONE).length;
    if (injuredCount >= 3) {
      team.trainingType = TrainingType.REST;
    }

    // If morale is low, do teamwork
    const avgMorale = team.squad.reduce((s, p) => s + p.stats.morale, 0) / team.squad.length;
    if (avgMorale < 40) {
      team.trainingType = TrainingType.TEAMWORK;
    }
  }
}

// ---------------------------------------------------------------------------
// Tactical Adjustments
// ---------------------------------------------------------------------------

function aiTacticalAdjustment(team: TeamState, personality: AIPersonality, state: GrailManagerState): void {
  if (Math.random() > personality.tacticalFlexibility * 0.2) return;

  // Check league position to adjust tactics
  const entry = state.leagueTable.find(e => e.teamId === team.teamDef.id);
  if (!entry) return;

  const position = state.leagueTable.indexOf(entry) + 1;
  const totalTeams = state.leagueTable.length;

  // Bottom half: be more defensive or aggressive depending on personality
  if (position > totalTeams / 2) {
    if (personality.trainingFocus === TrainingType.DEFENDING) {
      team.instruction = TeamInstruction.DEFENSIVE;
      team.formation = Formation.F_3_2_1;
    } else {
      team.instruction = TeamInstruction.ATTACKING;
      team.formation = Formation.F_1_2_3;
    }
  } else {
    // Top half: maintain or push further
    team.instruction = team.teamDef.style;
    team.formation = team.teamDef.formation;
  }

  // Losing streak: change approach
  if (entry.form.length >= 3 && entry.form.slice(-3).every(f => f === "L")) {
    const formations = Object.values(Formation);
    team.formation = formations[Math.floor(Math.random() * formations.length)];
    team.instruction = Math.random() < 0.5 ? TeamInstruction.DEFENSIVE : TeamInstruction.COUNTER_ATTACK;
  }
}

// ---------------------------------------------------------------------------
// Transfer Decisions
// ---------------------------------------------------------------------------

function aiTransferDecisions(state: GrailManagerState, teamId: string, team: TeamState, personality: AIPersonality): void {
  // Only attempt transfers occasionally
  if (Math.random() > personality.transferAggression * 0.15) return;

  const budget = team.teamDef.budget * personality.spendingWillingness;

  // Identify weak positions
  const classCount: Record<string, number> = {
    [PlayerClass.GATEKEEPER]: 0,
    [PlayerClass.KNIGHT]: 0,
    [PlayerClass.ROGUE]: 0,
    [PlayerClass.MAGE]: 0,
  };
  for (const p of team.squad) classCount[p.class]++;

  let needClass: PlayerClass | null = null;
  if (classCount[PlayerClass.GATEKEEPER] < 2) needClass = PlayerClass.GATEKEEPER;
  else if (classCount[PlayerClass.KNIGHT] < 3) needClass = PlayerClass.KNIGHT;
  else if (classCount[PlayerClass.ROGUE] < 3) needClass = PlayerClass.ROGUE;
  else if (classCount[PlayerClass.MAGE] < 3) needClass = PlayerClass.MAGE;

  if (needClass && team.squad.length < GBM.SQUAD_MAX) {
    // Find a suitable player on the market
    const candidates = state.transferMarket.filter(l =>
      l.player.class === needClass &&
      l.askingPrice <= budget &&
      l.fromTeamId !== teamId
    );

    if (candidates.length > 0) {
      // Sort by overall rating, youth preference
      candidates.sort((a, b) => {
        const aScore = getOverall(a.player) + (a.player.isYouth ? personality.youthPreference * 20 : 0);
        const bScore = getOverall(b.player) + (b.player.isYouth ? personality.youthPreference * 20 : 0);
        return bScore - aScore;
      });

      const target = candidates[0];
      // Buy the player
      team.squad.push({ ...target.player, id: generatePlayerId() });
      state.transferMarket = state.transferMarket.filter(l => l !== target);
      state.news.push({
        week: state.currentWeek,
        text: `${team.teamDef.name} have signed ${target.player.firstName} ${target.player.lastName} for ${target.askingPrice}g!`,
        type: "transfer",
      });
    }
  }

  // Sell surplus players
  if (team.squad.length > GBM.SQUAD_MAX - 2) {
    const worstPlayer = [...team.squad]
      .filter(p => !team.startingLineup.includes(p.id))
      .sort((a, b) => getOverall(a) - getOverall(b))[0];

    if (worstPlayer) {
      team.squad = team.squad.filter(p => p.id !== worstPlayer.id);
      state.transferMarket.push({
        player: worstPlayer,
        fromTeamId: teamId,
        askingPrice: Math.round(worstPlayer.value * 0.8),
        daysListed: 0,
      });
    }
  }
}

// ---------------------------------------------------------------------------
// AI Match-Day Decisions
// ---------------------------------------------------------------------------

export function aiMatchDayDecisions(state: GrailManagerState, teamId: string): void {
  const team = state.teams[teamId];
  if (!team || teamId === state.playerTeamId) return;

  // Ensure lineup is updated
  aiUpdateLineup(team);

  // Tactical adjustment based on opponent
  const personality = getPersonality(team);
  if (Math.random() < personality.tacticalFlexibility * 0.5) {
    // Against strong teams, be more defensive
    // Against weak teams, be more attacking
    // Simple heuristic based on league position
    const entry = state.leagueTable.find(e => e.teamId === teamId);
    if (entry) {
      const pos = state.leagueTable.indexOf(entry);
      if (pos >= 4) {
        team.instruction = TeamInstruction.DEFENSIVE;
      }
    }
  }
}

// ---------------------------------------------------------------------------
// AI Substitution Decision (during match)
// ---------------------------------------------------------------------------

export function aiSubstitutionDecision(
  state: GrailManagerState,
  teamId: string,
  match: { minute: number; homeGoals: number; awayGoals: number; homeTeamId: string },
): { outId: string; inId: string } | null {
  const team = state.teams[teamId];
  if (!team) return null;

  const isHome = match.homeTeamId === teamId;
  const ourGoals = isHome ? match.homeGoals : match.awayGoals;
  const theirGoals = isHome ? match.awayGoals : match.homeGoals;

  // Find lowest stamina player in lineup
  const lineup = team.startingLineup;
  let worstStamina = 100;
  let worstId = "";
  for (const pid of lineup) {
    const p = team.squad.find(pl => pl.id === pid);
    if (p && p.stats.stamina < worstStamina && p.class !== PlayerClass.GATEKEEPER) {
      worstStamina = p.stats.stamina;
      worstId = p.id;
    }
  }

  // Sub if stamina is very low or if losing and past minute 6
  if (worstStamina < 30 || (theirGoals > ourGoals && match.minute > 6)) {
    const subs = team.substitutes;
    if (subs.length > 0 && worstId) {
      return { outId: worstId, inId: subs[0] };
    }
  }

  return null;
}
