// ---------------------------------------------------------------------------
// Grail Ball Manager — Match Simulation Engine
// Minute-by-minute simulation with medieval-flavored commentary,
// formation effects, player stats, weather, morale, and injuries.
// ---------------------------------------------------------------------------

import {
  PlayerClass, Formation, TeamInstruction, Injury,
  GBM, PlayerDef, getWeatherModifiers, randomWeather,
  MATCH_COMMENTARY_TEMPLATES, BODY_PARTS,
} from "./GrailManagerConfig";
import type { WeatherModifiers } from "./GrailManagerConfig";

import {
  MatchPhase, LiveMatchState, MatchCommentary,
  getPlayerFullName,
} from "./GrailManagerState";
import type { GrailManagerState } from "./GrailManagerState";

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}


// ---------------------------------------------------------------------------
// Formation strength multipliers
// ---------------------------------------------------------------------------

interface FormationMults {
  attackMult: number;
  defenseMult: number;
  midMult: number;
}

function getFormationMults(formation: Formation): FormationMults {
  switch (formation) {
    case Formation.F_2_2_2: return { attackMult: 1.0,  defenseMult: 1.0,  midMult: 1.0 };
    case Formation.F_1_3_2: return { attackMult: 1.0,  defenseMult: 0.85, midMult: 1.15 };
    case Formation.F_2_1_3: return { attackMult: 1.2,  defenseMult: 1.0,  midMult: 0.8 };
    case Formation.F_3_2_1: return { attackMult: 0.8,  defenseMult: 1.2,  midMult: 1.0 };
    case Formation.F_1_2_3: return { attackMult: 1.3,  defenseMult: 0.7,  midMult: 1.0 };
    case Formation.F_2_3_1: return { attackMult: 0.85, defenseMult: 1.0,  midMult: 1.15 };
  }
}

// ---------------------------------------------------------------------------
// Instruction modifiers
// ---------------------------------------------------------------------------

function getInstructionMods(instruction: TeamInstruction): { atkMod: number; defMod: number; possessionMod: number } {
  switch (instruction) {
    case TeamInstruction.ATTACKING:      return { atkMod: 1.2,  defMod: 0.85, possessionMod: 0.0 };
    case TeamInstruction.BALANCED:       return { atkMod: 1.0,  defMod: 1.0,  possessionMod: 0.0 };
    case TeamInstruction.DEFENSIVE:      return { atkMod: 0.8,  defMod: 1.2,  possessionMod: -0.05 };
    case TeamInstruction.COUNTER_ATTACK: return { atkMod: 1.1,  defMod: 1.05, possessionMod: -0.1 };
    case TeamInstruction.POSSESSION:     return { atkMod: 0.95, defMod: 0.95, possessionMod: 0.15 };
  }
}

// ---------------------------------------------------------------------------
// Compute team power from lineup
// ---------------------------------------------------------------------------

interface TeamPower {
  attack: number;
  defense: number;
  midfield: number;
  magic: number;
  speed: number;
  stamina: number;
  avgMorale: number;
  gkRating: number;
}

function computeTeamPower(
  lineup: PlayerDef[],
  formation: Formation,
  instruction: TeamInstruction,
  weatherMods: WeatherModifiers,
  isHome: boolean,
): TeamPower {
  const fMults = getFormationMults(formation);
  const iMods = getInstructionMods(instruction);
  const homeMult = isHome ? GBM.HOME_ADVANTAGE : 1.0;

  let attack = 0, defense = 0, midfield = 0, magic = 0, speed = 0, stamina = 0, morale = 0;
  let gkRating = 30;

  for (const p of lineup) {
    const s = p.stats;
    const formBonus = 1 + p.form * 0.03;
    const moraleBonus = s.morale / 100;

    switch (p.class) {
      case PlayerClass.GATEKEEPER:
        gkRating = s.defense * 0.5 + s.speed * 0.2 + s.stamina * 0.15 + s.magic * 0.15;
        gkRating *= formBonus * moraleBonus;
        defense += s.defense * 0.3;
        break;
      case PlayerClass.KNIGHT:
        defense += (s.defense * 0.6 + s.attack * 0.2 + s.stamina * 0.2) * fMults.defenseMult * formBonus * moraleBonus;
        break;
      case PlayerClass.ROGUE:
        midfield += (s.speed * 0.35 + s.attack * 0.25 + s.defense * 0.15 + s.magic * 0.25) * fMults.midMult * formBonus * moraleBonus;
        break;
      case PlayerClass.MAGE:
        attack += (s.attack * 0.3 + s.magic * 0.45 + s.speed * 0.15 + s.stamina * 0.1) * fMults.attackMult * formBonus * moraleBonus;
        magic += s.magic * formBonus;
        break;
    }

    speed += s.speed;
    stamina += s.stamina;
    morale += s.morale;
  }

  const n = Math.max(1, lineup.length);

  return {
    attack:   (attack * iMods.atkMod * homeMult * weatherMods.speedMult) / n * 7,
    defense:  (defense * iMods.defMod * homeMult) / n * 7,
    midfield: midfield / n * 7,
    magic:    (magic * weatherMods.magicMult) / n * 7,
    speed:    (speed * weatherMods.speedMult) / n,
    stamina:  stamina / n,
    avgMorale: morale / n,
    gkRating: gkRating * homeMult,
  };
}

// ---------------------------------------------------------------------------
// Initialize a live match
// ---------------------------------------------------------------------------

export function initLiveMatch(
  state: GrailManagerState,
  homeTeamId: string,
  awayTeamId: string,
): LiveMatchState {
  const homeTeam = state.teams[homeTeamId];
  const awayTeam = state.teams[awayTeamId];

  const weather = randomWeather();

  // Generate initial player positions for the pitch view
  const positions: Record<string, { x: number; y: number; hasOrb: boolean }> = {};
  const placeTeamPositions = (lineup: string[], squad: PlayerDef[], _formation: Formation, isHome: boolean) => {
    const xBase = isHome ? 0.2 : 0.8;
    const xDir = isHome ? 1 : -1;
    let idx = 0;
    for (const pid of lineup) {
      const p = squad.find(pl => pl.id === pid);
      if (!p) continue;
      let x = 0.5, y = 0.5;
      switch (p.class) {
        case PlayerClass.GATEKEEPER:
          x = isHome ? 0.05 : 0.95;
          y = 0.5;
          break;
        case PlayerClass.KNIGHT:
          x = xBase - xDir * 0.05;
          y = 0.25 + (idx % 3) * 0.25;
          break;
        case PlayerClass.ROGUE:
          x = 0.5 + (isHome ? -0.05 : 0.05);
          y = 0.2 + (idx % 3) * 0.3;
          break;
        case PlayerClass.MAGE:
          x = xBase + xDir * 0.2;
          y = 0.25 + (idx % 3) * 0.25;
          break;
      }
      positions[pid] = { x, y, hasOrb: false };
      idx++;
    }
  };

  placeTeamPositions(homeTeam.startingLineup, homeTeam.squad, homeTeam.formation, true);
  placeTeamPositions(awayTeam.startingLineup, awayTeam.squad, awayTeam.formation, false);

  const match: LiveMatchState = {
    homeTeamId,
    awayTeamId,
    homeGoals: 0,
    awayGoals: 0,
    minute: 0,
    phase: MatchPhase.NOT_STARTED,
    commentary: [],
    homePossession: 50,
    homeShots: 0,
    awayShots: 0,
    homeShotsOnTarget: 0,
    awayShotsOnTarget: 0,
    homeFouls: 0,
    awayFouls: 0,
    weather,
    speed: 1,
    homeLineup: [...homeTeam.startingLineup],
    awayLineup: [...awayTeam.startingLineup],
    homeSubs: [...(homeTeam.substitutes || [])],
    awaySubs: [...(awayTeam.substitutes || [])],
    homeSubsMade: 0,
    awaySubsMade: 0,
    homeRatings: {},
    awayRatings: {},
    playerPositions: positions,
    orbX: 0.5,
    orbY: 0.5,
    isUserHome: homeTeamId === state.playerTeamId,
    homeFormation: homeTeam.formation,
    awayFormation: awayTeam.formation,
    simulationComplete: false,
    eventsThisMinute: [],
  };

  // Initialize ratings
  for (const pid of match.homeLineup) match.homeRatings[pid] = 6.0;
  for (const pid of match.awayLineup) match.awayRatings[pid] = 6.0;

  return match;
}

// ---------------------------------------------------------------------------
// Simulate one minute of match
// ---------------------------------------------------------------------------

export function simulateMinute(state: GrailManagerState, match: LiveMatchState): void {
  if (match.simulationComplete) return;

  match.eventsThisMinute = [];

  // Kickoff
  if (match.phase === MatchPhase.NOT_STARTED) {
    match.phase = MatchPhase.FIRST_HALF;
    match.minute = 0;
    const weatherMods = getWeatherModifiers(match.weather);
    const kickoffText = pick(MATCH_COMMENTARY_TEMPLATES.kickoff).replace("{weather}", match.weather);
    addCommentary(match, 0, kickoffText, "kickoff", true);
    addCommentary(match, 0, weatherMods.description, "info", true);
    return;
  }

  // Half time
  if (match.minute === GBM.MATCH_HALF_MINUTES && match.phase === MatchPhase.FIRST_HALF) {
    match.phase = MatchPhase.HALF_TIME;
    const htText = pick(MATCH_COMMENTARY_TEMPLATES.halftime)
      .replace("{home}", getTeamName(state, match.homeTeamId))
      .replace("{away}", getTeamName(state, match.awayTeamId))
      .replace("{homeGoals}", String(match.homeGoals))
      .replace("{awayGoals}", String(match.awayGoals));
    addCommentary(match, match.minute, htText, "halftime", true);
    return;
  }

  // Resume from half time
  if (match.phase === MatchPhase.HALF_TIME) {
    match.phase = MatchPhase.SECOND_HALF;
    addCommentary(match, match.minute, "The second half begins!", "info", true);
    return;
  }

  // Full time
  if (match.minute >= GBM.MATCH_HALF_MINUTES * 2 && match.phase === MatchPhase.SECOND_HALF) {
    match.phase = MatchPhase.FULL_TIME;
    const ftText = pick(MATCH_COMMENTARY_TEMPLATES.fulltime)
      .replace("{home}", getTeamName(state, match.homeTeamId))
      .replace("{away}", getTeamName(state, match.awayTeamId))
      .replace("{homeGoals}", String(match.homeGoals))
      .replace("{awayGoals}", String(match.awayGoals));
    addCommentary(match, match.minute, ftText, "fulltime", true);
    match.simulationComplete = true;
    return;
  }

  match.minute++;

  const homeTeam = state.teams[match.homeTeamId];
  const awayTeam = state.teams[match.awayTeamId];
  const weatherMods = getWeatherModifiers(match.weather);

  // Get lineups as player objects
  const homePlayers = match.homeLineup.map(id => homeTeam.squad.find(p => p.id === id)!).filter(Boolean);
  const awayPlayers = match.awayLineup.map(id => awayTeam.squad.find(p => p.id === id)!).filter(Boolean);

  // Compute team powers
  const homePower = computeTeamPower(homePlayers, match.homeFormation, homeTeam.instruction, weatherMods, true);
  const awayPower = computeTeamPower(awayPlayers, match.awayFormation, awayTeam.instruction, weatherMods, false);

  // Stamina drain
  const staminaDrain = GBM.STAMINA_DRAIN_PER_MINUTE;
  for (const p of homePlayers) {
    p.stats.stamina = Math.max(10, p.stats.stamina - staminaDrain * 0.1);
  }
  for (const p of awayPlayers) {
    p.stats.stamina = Math.max(10, p.stats.stamina - staminaDrain * 0.1);
  }

  // Possession calculation
  const midTotal = homePower.midfield + awayPower.midfield;
  const iMods = getInstructionMods(homeTeam.instruction);
  const basePoss = midTotal > 0 ? (homePower.midfield / midTotal) * 100 : 50;
  const poss = clamp(basePoss + iMods.possessionMod * 100 + (Math.random() - 0.5) * weatherMods.possessionVariance * 100, 25, 75);
  match.homePossession = Math.round(match.homePossession * 0.9 + poss * 0.1); // smooth

  // Determine events this minute (1-3 events)
  const eventCount = 1 + Math.floor(Math.random() * GBM.MATCH_EVENTS_PER_MINUTE);

  for (let e = 0; e < eventCount; e++) {
    // Which team has the ball?
    const homeAttacking = Math.random() * 100 < match.homePossession;
    // Team IDs available: match.homeTeamId / match.awayTeamId
    const atkPower = homeAttacking ? homePower : awayPower;
    const defPower = homeAttacking ? awayPower : homePower;
    const atkPlayers = homeAttacking ? homePlayers : awayPlayers;
    const defPlayers = homeAttacking ? awayPlayers : homePlayers;
    const isHome = homeAttacking;

    // Event type roll
    const roll = Math.random();

    if (roll < 0.12) {
      // SHOT ON TARGET / GOAL ATTEMPT
      const shooter = pickAttacker(atkPlayers);
      if (!shooter) continue;

      const shotPower = (atkPower.attack + atkPower.magic * 0.3 + shooter.stats.attack + shooter.stats.magic * 0.2) * (1 + (Math.random() - 0.3) * 0.5);
      const saveChance = defPower.gkRating * 0.6 + defPower.defense * 0.3;

      if (homeAttacking) match.homeShots++;
      else match.awayShots++;

      if (Math.random() * (shotPower + saveChance) < shotPower * 0.45) {
        // GOAL!
        if (homeAttacking) {
          match.homeGoals++;
          match.homeShotsOnTarget++;
        } else {
          match.awayGoals++;
          match.awayShotsOnTarget++;
        }

        shooter.goals++;
        const ratings = homeAttacking ? match.homeRatings : match.awayRatings;
        ratings[shooter.id] = Math.min(10, (ratings[shooter.id] || 6) + 0.8);

        // Assist
        const assister = pickMidfielder(atkPlayers, shooter.id);
        if (assister && Math.random() < 0.6) {
          assister.assists++;
          const aRatings = homeAttacking ? match.homeRatings : match.awayRatings;
          aRatings[assister.id] = Math.min(10, (aRatings[assister.id] || 6) + 0.4);
        }

        const goalText = pick(MATCH_COMMENTARY_TEMPLATES.goal)
          .replace(/{scorer}/g, getPlayerFullName(shooter));
        addCommentary(match, match.minute, goalText, "goal", isHome);

        // Move orb to center
        match.orbX = 0.5;
        match.orbY = 0.5;

        // Spell commentary for mage goals
        if (shooter.class === PlayerClass.MAGE && Math.random() < 0.5) {
          const spellText = pick(MATCH_COMMENTARY_TEMPLATES.spell)
            .replace("{player}", getPlayerFullName(shooter));
          addCommentary(match, match.minute, spellText, "spell", isHome);
        }
      } else if (Math.random() < 0.5) {
        // Save
        if (homeAttacking) match.homeShotsOnTarget++;
        else match.awayShotsOnTarget++;

        const keeper = defPlayers.find(p => p.class === PlayerClass.GATEKEEPER);
        if (keeper) {
          const saveText = pick(MATCH_COMMENTARY_TEMPLATES.save)
            .replace(/{keeper}/g, getPlayerFullName(keeper));
          addCommentary(match, match.minute, saveText, "save", !isHome);
          const dRatings = homeAttacking ? match.awayRatings : match.homeRatings;
          dRatings[keeper.id] = Math.min(10, (dRatings[keeper.id] || 6) + 0.3);
        }
      } else {
        // Miss / chance
        const chanceText = pick(MATCH_COMMENTARY_TEMPLATES.chance)
          .replace("{player}", getPlayerFullName(shooter));
        addCommentary(match, match.minute, chanceText, "chance", isHome);
      }
    } else if (roll < 0.22) {
      // Tackle
      const tackler = pickDefender(defPlayers);
      if (tackler) {
        const tackleText = pick(MATCH_COMMENTARY_TEMPLATES.tackle)
          .replace("{player}", getPlayerFullName(tackler));
        addCommentary(match, match.minute, tackleText, "tackle", !isHome);
      }
    } else if (roll < 0.28) {
      // Foul
      const fouler = pick(defPlayers.length > 0 ? defPlayers : atkPlayers);
      if (fouler) {
        if (homeAttacking) match.awayFouls++;
        else match.homeFouls++;

        const foulText = pick(MATCH_COMMENTARY_TEMPLATES.foul)
          .replace("{player}", getPlayerFullName(fouler));
        addCommentary(match, match.minute, foulText, "foul", !isHome);

        // Red card chance (very rare)
        if (Math.random() < 0.02) {
          const rcText = pick(MATCH_COMMENTARY_TEMPLATES.redCard)
            .replace("{player}", getPlayerFullName(fouler));
          addCommentary(match, match.minute, rcText, "redCard", !isHome);
          // Remove from lineup
          if (homeAttacking) {
            match.awayLineup = match.awayLineup.filter(id => id !== fouler.id);
          } else {
            match.homeLineup = match.homeLineup.filter(id => id !== fouler.id);
          }
        }

        // Penalty chance if in attacking zone
        if (Math.random() < 0.15) {
          const penText = pick(MATCH_COMMENTARY_TEMPLATES.penalty);
          addCommentary(match, match.minute, penText, "penalty", isHome);
          // Penalty result
          const penScorer = pickAttacker(atkPlayers);
          if (penScorer) {
            if (Math.random() < 0.75) {
              // Penalty scored
              if (homeAttacking) {
                match.homeGoals++;
                match.homeShotsOnTarget++;
                match.homeShots++;
              } else {
                match.awayGoals++;
                match.awayShotsOnTarget++;
                match.awayShots++;
              }
              penScorer.goals++;
              addCommentary(match, match.minute,
                `${getPlayerFullName(penScorer)} steps up... and scores from the Grail Circle! GOAL!`, "goal", isHome);
            } else {
              addCommentary(match, match.minute, "The penalty is saved! Incredible!", "save", !isHome);
            }
          }
        }
      }
    } else if (roll < 0.32) {
      // Spell event
      const caster = atkPlayers.find(p => p.class === PlayerClass.MAGE);
      if (caster) {
        const spellText = pick(MATCH_COMMENTARY_TEMPLATES.spell)
          .replace("{player}", getPlayerFullName(caster));
        addCommentary(match, match.minute, spellText, "spell", isHome);
      }
    } else if (roll < 0.35) {
      // Injury event
      const allPlayers = [...atkPlayers, ...defPlayers];
      if (allPlayers.length > 0 && Math.random() < GBM.INJURY_CHANCE_BASE * weatherMods.injuryMult * 3) {
        const injured = pick(allPlayers);
        const bodyPart = pick(BODY_PARTS);
        const injuryText = pick(MATCH_COMMENTARY_TEMPLATES.injury)
          .replace("{player}", getPlayerFullName(injured))
          .replace("{bodypart}", bodyPart);
        addCommentary(match, match.minute, injuryText, "injury", isHome);

        // Apply actual injury
        const injuries = [Injury.MINOR_BRUISE, Injury.TWISTED_ANKLE, Injury.CONCUSSION, Injury.MAGICAL_BURN];
        injured.injury = pick(injuries);
        injured.injuryWeeks = 1 + Math.floor(Math.random() * 3);

        // AI substitution
        const isInjuredHome = homePlayers.includes(injured);
        if (isInjuredHome) {
          attemptSubstitution(match, state, true, injured.id);
        } else {
          attemptSubstitution(match, state, false, injured.id);
        }
      }
    } else if (roll < 0.38) {
      // Possession commentary
      const team = homeAttacking ? getTeamName(state, match.homeTeamId) : getTeamName(state, match.awayTeamId);
      const possText = pick(MATCH_COMMENTARY_TEMPLATES.possession).replace("{team}", team);
      addCommentary(match, match.minute, possText, "possession", isHome);
    }
    // else: nothing notable this event
  }

  // Update player positions for pitch view
  updatePositions(match, homePlayers, awayPlayers);
}

// ---------------------------------------------------------------------------
// Simulate entire match at once (for AI vs AI)
// ---------------------------------------------------------------------------

export function simulateFullMatch(state: GrailManagerState, match: LiveMatchState): void {
  while (!match.simulationComplete) {
    simulateMinute(state, match);
  }
}

// ---------------------------------------------------------------------------
// Quick simulate (no live match, just result)
// ---------------------------------------------------------------------------

export function quickSimMatch(
  state: GrailManagerState,
  homeTeamId: string,
  awayTeamId: string,
): { homeGoals: number; awayGoals: number; events: string[] } {
  const match = initLiveMatch(state, homeTeamId, awayTeamId);
  simulateFullMatch(state, match);
  return {
    homeGoals: match.homeGoals,
    awayGoals: match.awayGoals,
    events: match.commentary.map(c => `[${c.minute}'] ${c.text}`),
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function addCommentary(match: LiveMatchState, minute: number, text: string, type: MatchCommentary["type"], isHome: boolean): void {
  const entry: MatchCommentary = { minute, text, type, isHome };
  match.commentary.push(entry);
  match.eventsThisMinute.push(entry);
}

function getTeamName(state: GrailManagerState, teamId: string): string {
  return state.teams[teamId]?.teamDef.name ?? teamId;
}

function pickAttacker(players: PlayerDef[]): PlayerDef | null {
  const attackers = players.filter(p => p.class === PlayerClass.MAGE);
  if (attackers.length > 0) return pick(attackers);
  const rogues = players.filter(p => p.class === PlayerClass.ROGUE);
  if (rogues.length > 0 && Math.random() < 0.4) return pick(rogues);
  return players.length > 0 ? pick(players) : null;
}

function pickDefender(players: PlayerDef[]): PlayerDef | null {
  const defenders = players.filter(p => p.class === PlayerClass.KNIGHT);
  if (defenders.length > 0) return pick(defenders);
  return players.length > 0 ? pick(players) : null;
}

function pickMidfielder(players: PlayerDef[], excludeId?: string): PlayerDef | null {
  const mids = players.filter(p => p.class === PlayerClass.ROGUE && p.id !== excludeId);
  if (mids.length > 0) return pick(mids);
  return null;
}

function attemptSubstitution(match: LiveMatchState, state: GrailManagerState, isHome: boolean, outPlayerId: string): void {
  const subs = isHome ? match.homeSubs : match.awaySubs;
  const subsMade = isHome ? match.homeSubsMade : match.awaySubsMade;
  const maxSubs = 3;

  if (subsMade >= maxSubs || subs.length === 0) return;

  const subIn = subs[0];
  if (isHome) {
    match.homeLineup = match.homeLineup.map(id => id === outPlayerId ? subIn : id);
    match.homeSubs = match.homeSubs.filter(id => id !== subIn);
    match.homeSubsMade++;
  } else {
    match.awayLineup = match.awayLineup.map(id => id === outPlayerId ? subIn : id);
    match.awaySubs = match.awaySubs.filter(id => id !== subIn);
    match.awaySubsMade++;
  }

  const teamId = isHome ? match.homeTeamId : match.awayTeamId;
  const team = state.teams[teamId];
  const playerOut = team.squad.find(p => p.id === outPlayerId);
  const playerIn = team.squad.find(p => p.id === subIn);

  if (playerOut && playerIn) {
    const subText = pick(MATCH_COMMENTARY_TEMPLATES.substitution)
      .replace("{playerOut}", getPlayerFullName(playerOut))
      .replace("{playerIn}", getPlayerFullName(playerIn));
    addCommentary(match, match.minute, subText, "substitution", isHome);
  }
}

// ---------------------------------------------------------------------------
// Update pitch positions for visualization
// ---------------------------------------------------------------------------

function updatePositions(match: LiveMatchState, homePlayers: PlayerDef[], awayPlayers: PlayerDef[]): void {
  const orbHolderHome = Math.random() * 100 < match.homePossession;

  for (const pid of match.homeLineup) {
    const pos = match.playerPositions[pid];
    if (!pos) continue;
    const p = homePlayers.find(pl => pl.id === pid);
    if (!p) continue;

    // Drift positions based on class and game state
    const jitter = 0.015;
    switch (p.class) {
      case PlayerClass.GATEKEEPER:
        pos.x += (0.06 - pos.x) * 0.1;
        pos.y += (0.5 - pos.y) * 0.05 + (Math.random() - 0.5) * jitter;
        break;
      case PlayerClass.KNIGHT:
        pos.x += (0.25 - pos.x) * 0.05 + (Math.random() - 0.5) * jitter;
        pos.y += (Math.random() - 0.5) * jitter * 2;
        break;
      case PlayerClass.ROGUE:
        pos.x += (0.5 - pos.x) * 0.03 + (Math.random() - 0.5) * jitter * 3;
        pos.y += (Math.random() - 0.5) * jitter * 3;
        break;
      case PlayerClass.MAGE:
        pos.x += (0.7 - pos.x) * 0.04 + (Math.random() - 0.5) * jitter * 2;
        pos.y += (Math.random() - 0.5) * jitter * 2;
        break;
    }
    pos.x = clamp(pos.x, 0.02, 0.98);
    pos.y = clamp(pos.y, 0.05, 0.95);
    pos.hasOrb = false;
  }

  for (const pid of match.awayLineup) {
    const pos = match.playerPositions[pid];
    if (!pos) continue;
    const p = awayPlayers.find(pl => pl.id === pid);
    if (!p) continue;

    const jitter = 0.015;
    switch (p.class) {
      case PlayerClass.GATEKEEPER:
        pos.x += (0.94 - pos.x) * 0.1;
        pos.y += (0.5 - pos.y) * 0.05 + (Math.random() - 0.5) * jitter;
        break;
      case PlayerClass.KNIGHT:
        pos.x += (0.75 - pos.x) * 0.05 + (Math.random() - 0.5) * jitter;
        pos.y += (Math.random() - 0.5) * jitter * 2;
        break;
      case PlayerClass.ROGUE:
        pos.x += (0.5 - pos.x) * 0.03 + (Math.random() - 0.5) * jitter * 3;
        pos.y += (Math.random() - 0.5) * jitter * 3;
        break;
      case PlayerClass.MAGE:
        pos.x += (0.3 - pos.x) * 0.04 + (Math.random() - 0.5) * jitter * 2;
        pos.y += (Math.random() - 0.5) * jitter * 2;
        break;
    }
    pos.x = clamp(pos.x, 0.02, 0.98);
    pos.y = clamp(pos.y, 0.05, 0.95);
    pos.hasOrb = false;
  }

  // Place orb with a random player
  const allActive = [...match.homeLineup, ...match.awayLineup];
  if (allActive.length > 0) {
    const orbHolder = orbHolderHome
      ? pick(match.homeLineup)
      : pick(match.awayLineup);
    const orbPos = match.playerPositions[orbHolder];
    if (orbPos) {
      orbPos.hasOrb = true;
      match.orbX = orbPos.x;
      match.orbY = orbPos.y;
    }
  }
}
