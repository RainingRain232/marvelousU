// Phase system — drives the PREP → BATTLE → RESOLVE → PREP cycle.
//
// Phase rules:
//
//   PREP     (phaseTimer counts down from PREP_DURATION)
//     → BATTLE when phaseTimer reaches 0.
//     Units may not be on the battlefield during PREP; any that remain from
//     a previous round are cleared on entry.
//
//   DRAFT    (Battlefield mode only — phaseTimer counts down from DRAFT_DURATION)
//     → BATTLE when phaseTimer reaches 0.
//     Players select units from a budget before the battle begins.
//
//   BATTLE   (phaseTimer = -1, runs until a win condition is met)
//     → RESOLVE when:
//       (a) A base's health reaches 0, OR
//       (b) One side has no units AND no buildings capable of producing more
//           (i.e. all buildings are destroyed) — this prevents a stalemate.
//     The `state.winnerId` is set to the surviving player's ID.
//     If both bases fall simultaneously it is a draw (winnerId = null).
//
//   RESOLVE  (phaseTimer counts down from RESOLVE_DURATION)
//     → PREP when phaseTimer reaches 0.
//     On transition back to PREP: clear all units, reset base health,
//     replenish player gold, reset phaseTimer to PREP_DURATION.
//
// Each transition emits "phaseChanged" on the EventBus so the view can react.

import type { GameState } from "@sim/state/GameState";
import { isAlly } from "@sim/state/GameState";
import {
  GamePhase,
  GameMode,
  BuildingType,
  CampaignAchievementCondition,
  RoguelikeWaveEventType,
  UnitType,
} from "@/types";
import { BuildingState, UnitState } from "@/types";
import { BalanceConfig } from "@sim/config/BalanceConfig";
import { BUILDING_DEFINITIONS } from "@sim/config/BuildingDefs";
import { EventBus } from "@sim/core/EventBus";
import { getRace } from "@sim/config/RaceDefs";
import { getCampaignDifficultyModifiers } from "@sim/config/DifficultyConfig";
import { getAchievementsForScenario } from "@sim/config/CampaignDefs";

// ---------------------------------------------------------------------------
// Public system
// ---------------------------------------------------------------------------

export const PhaseSystem = {
  update(state: GameState, dt: number): void {
    switch (state.phase) {
      case GamePhase.PREP:
        _tickPrep(state, dt);
        break;
      case GamePhase.DRAFT:
        _tickDraft(state, dt);
        break;
      case GamePhase.BATTLE:
        _tickBattle(state, dt);
        break;
      case GamePhase.RESOLVE:
        _tickResolve(state, dt);
        break;
    }
  },
};

// ---------------------------------------------------------------------------
// PREP tick
// ---------------------------------------------------------------------------

function _tickPrep(state: GameState, dt: number): void {
  state.phaseTimer -= dt;
  if (state.phaseTimer <= 0) {
    // Battlefield mode transitions to DRAFT phase first
    if (state.gameMode === GameMode.BATTLEFIELD) {
      _enterDraft(state);
    } else {
      _enterBattle(state);
    }
  }
}

// ---------------------------------------------------------------------------
// DRAFT tick (Battlefield mode only)
// ---------------------------------------------------------------------------

function _tickDraft(state: GameState, dt: number): void {
  state.phaseTimer -= dt;
  if (state.phaseTimer <= 0) {
    // Finalize draft picks and transition to battle
    state.battlefield.draft.active = false;
    _enterBattle(state);
  }
}

// ---------------------------------------------------------------------------
// BATTLE tick
// ---------------------------------------------------------------------------

function _tickBattle(state: GameState, dt: number): void {
  // Track total battle time (used for deathmatch sudden death and battlefield shrink)
  state.totalBattleTime += dt;

  // Track campaign battle time for achievement checking
  if (state.gameMode === GameMode.CAMPAIGN) {
    state.campaignBattleTime += dt;
  }

  // Deathmatch: sudden death — both bases take escalating damage after time threshold
  if (state.gameMode === GameMode.DEATHMATCH) {
    _tickSuddenDeath(state, dt);
  }

  // Battlefield: shrinking arena
  if (state.gameMode === GameMode.BATTLEFIELD) {
    _tickBattlefieldShrink(state, dt);
  }

  const winResult = _checkWinCondition(state);
  if (winResult !== undefined) {
    state.winnerId = winResult; // null = draw, string = winner PlayerId

    // Campaign: check achievements when player wins
    if (
      state.gameMode === GameMode.CAMPAIGN &&
      winResult === "p1" &&
      state.campaignScenario != null
    ) {
      _checkCampaignAchievements(state);
    }

    _enterResolve(state);
  }
}

// ---------------------------------------------------------------------------
// Deathmatch sudden death
// ---------------------------------------------------------------------------

function _tickSuddenDeath(state: GameState, dt: number): void {
  if (state.totalBattleTime < BalanceConfig.SUDDEN_DEATH_START_TIME) return;

  // Activate sudden death on first crossing
  if (!state.suddenDeathActive) {
    state.suddenDeathActive = true;
    state.suddenDeathDps = BalanceConfig.SUDDEN_DEATH_BASE_DPS;
    EventBus.emit("suddenDeathStarted", {
      dps: state.suddenDeathDps,
    });
  }

  // Escalate DPS: +ESCALATION per minute past the start time
  const minutesPastStart =
    (state.totalBattleTime - BalanceConfig.SUDDEN_DEATH_START_TIME) / 60;
  state.suddenDeathDps =
    BalanceConfig.SUDDEN_DEATH_BASE_DPS +
    Math.floor(minutesPastStart) * BalanceConfig.SUDDEN_DEATH_ESCALATION_DPS;

  // Apply damage to all bases
  const damage = state.suddenDeathDps * dt;
  for (const base of state.bases.values()) {
    base.health -= damage;
    if (base.health < 0) base.health = 0;
  }
}

// ---------------------------------------------------------------------------
// Battlefield shrinking arena
// ---------------------------------------------------------------------------

function _tickBattlefieldShrink(state: GameState, dt: number): void {
  const shrink = state.battlefield.shrinkBoundary;
  shrink.battleElapsed += dt;

  if (shrink.battleElapsed < BalanceConfig.BATTLEFIELD_SHRINK_START_TIME) return;

  // Check if it's time for a new shrink step
  const timeSinceStart = shrink.battleElapsed - BalanceConfig.BATTLEFIELD_SHRINK_START_TIME;
  const expectedSteps = Math.floor(timeSinceStart / BalanceConfig.BATTLEFIELD_SHRINK_INTERVAL);
  const currentSteps = shrink.inset / BalanceConfig.BATTLEFIELD_SHRINK_TILES;

  if (expectedSteps > currentSteps) {
    // Apply a new shrink step
    shrink.inset += BalanceConfig.BATTLEFIELD_SHRINK_TILES;
    shrink.lastShrinkTime = shrink.battleElapsed;

    // Cap inset so it doesn't exceed half the map
    const maxInset = Math.floor(Math.min(state.battlefield.width, state.battlefield.height) / 2) - 1;
    if (shrink.inset > maxInset) shrink.inset = maxInset;

    EventBus.emit("arenaShrink", {
      inset: shrink.inset,
    });
  }

  // Damage to units outside the boundary is handled by the shrink damage
  // logic in SimLoop (BattlefieldShrinkSystem)
}

// ---------------------------------------------------------------------------
// RESOLVE tick
// ---------------------------------------------------------------------------

function _tickResolve(state: GameState, dt: number): void {
  state.phaseTimer -= dt;
  if (state.phaseTimer <= 0) {
    _enterPrep(state);
  }
}

// ---------------------------------------------------------------------------
// Phase transitions
// ---------------------------------------------------------------------------

function _enterDraft(state: GameState): void {
  state.phase = GamePhase.DRAFT;
  state.phaseTimer = BalanceConfig.BATTLEFIELD_DRAFT_DURATION;

  // Initialize draft state
  const draft = state.battlefield.draft;
  draft.active = true;
  draft.timer = BalanceConfig.BATTLEFIELD_DRAFT_DURATION;
  for (const [playerId] of state.players) {
    draft.budgets.set(playerId, BalanceConfig.BATTLEFIELD_DRAFT_BUDGET);
    draft.picks.set(playerId, []);
  }

  EventBus.emit("phaseChanged", { phase: GamePhase.DRAFT });
}

function _enterBattle(state: GameState): void {
  state.phase = GamePhase.BATTLE;
  state.phaseTimer = -1; // no countdown during battle
  EventBus.emit("phaseChanged", { phase: GamePhase.BATTLE });
}

function _enterResolve(state: GameState): void {
  state.phase = GamePhase.RESOLVE;
  state.phaseTimer = BalanceConfig.RESOLVE_DURATION;

  // Reset sudden death state for next round
  if (state.gameMode === GameMode.DEATHMATCH) {
    state.suddenDeathActive = false;
    state.suddenDeathDps = 0;
  }

  // Reset battlefield shrink boundary for next round
  if (state.gameMode === GameMode.BATTLEFIELD) {
    state.battlefield.shrinkBoundary.inset = 0;
    state.battlefield.shrinkBoundary.battleElapsed = 0;
    state.battlefield.shrinkBoundary.lastShrinkTime = 0;
  }

  EventBus.emit("phaseChanged", { phase: GamePhase.RESOLVE });
}

function _enterPrep(state: GameState): void {
  // Clear all living units from the field
  for (const unit of state.units.values()) {
    if (unit.state !== UnitState.DIE) {
      unit.state = UnitState.DIE; // mark as dead so CombatSystem removes them
    }
  }
  // Hard-clear the unit map so we start fresh immediately
  state.units.clear();
  state.abilities.clear();

  // Reset base health
  for (const base of state.bases.values()) {
    base.health = base.maxHealth;
  }

  // Replenish player gold to starting amount (mode-dependent, race-overridable)
  const startGold = _startGoldForMode(state.gameMode);
  const p1Race = state.p1RaceId ? getRace(state.p1RaceId) : undefined;
  for (const player of state.players.values()) {
    const raceGold = player.id === "p1" && p1Race?.startingGold != null
      ? p1Race.startingGold
      : undefined;
    player.gold = raceGold ?? startGold;
    player.goldAccum = 0;
    EventBus.emit("goldChanged", { playerId: player.id, amount: player.gold });

    const raceMana = player.id === "p1" && p1Race?.startingMana != null
      ? p1Race.startingMana
      : 0;
    player.mana = raceMana;
    player.manaAccum = 0;
    EventBus.emit("manaChanged", { playerId: player.id, amount: player.mana });
  }

  // Clear winner from previous round
  state.winnerId = null;

  // Reset event timer — keep Infinity for modes that disable random events
  // Use deathmatch-specific interval if applicable
  if (state.eventTimer !== Infinity) {
    state.eventTimer = state.gameMode === GameMode.DEATHMATCH
      ? BalanceConfig.DEATHMATCH_RANDOM_EVENT_INTERVAL
      : BalanceConfig.RANDOM_EVENT_INTERVAL;
  }

  // Roguelike: increment round, roll cursed buildings, wave events, enemy scaling
  if (state.gameMode === GameMode.ROGUELIKE) {
    state.roguelikeRound += 1;
    _rollRoguelikeCursedBuildings(state);
    _rollRoguelikeDisabledBuildings(state);
    _processRoguelikeWaveEvent(state);
    _tickRoguelikeChampionBuff(state);
    _applyRoguelikeEnemyScaling(state);
    EventBus.emit("roguelikeRoundChanged", { round: state.roguelikeRound });
  }

  // Determine PREP duration (campaign difficulty may override)
  let prepDuration = state.gameMode === GameMode.DEATHMATCH
    ? BalanceConfig.DEATHMATCH_PREP_DURATION
    : BalanceConfig.PREP_DURATION;
  if (state.gameMode === GameMode.CAMPAIGN) {
    const mods = getCampaignDifficultyModifiers();
    if (mods.prepDurationOverride > 0) {
      prepDuration = mods.prepDurationOverride;
    }
  }

  state.phase = GamePhase.PREP;
  state.phaseTimer = prepDuration;
  EventBus.emit("phaseChanged", { phase: GamePhase.PREP });
}

/** Returns the starting gold for a given game mode. */
function _startGoldForMode(mode: GameMode): number {
  switch (mode) {
    case GameMode.DEATHMATCH: return 10000;
    case GameMode.BATTLEFIELD: return 30000;
    default: return BalanceConfig.START_GOLD;
  }
}

/**
 * For ROGUELIKE: randomly disable 50% of non-castle building types each round.
 * The castle is always available.
 */
function _rollRoguelikeDisabledBuildings(state: GameState): void {
  const allTypes = Object.values(BuildingType).filter(
    (t) => t !== BuildingType.CASTLE && t !== BuildingType.FIREPIT,
  );
  // Fisher-Yates shuffle then take first half
  const shuffled = [...allTypes];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  const half = Math.floor(shuffled.length / 2);
  state.roguelikeDisabledBuildings = shuffled.slice(0, half);

  // Apply the filter to all castle buildings so the shop reflects the new set
  const disabledSet = new Set(state.roguelikeDisabledBuildings);
  for (const building of state.buildings.values()) {
    if (building.type === BuildingType.CASTLE) {
      const fullBlueprints = [...BUILDING_DEFINITIONS[BuildingType.CASTLE].blueprints];
      building.blueprints = fullBlueprints.filter((t) => !disabledSet.has(t));
    }
  }

  EventBus.emit("roguelikeDisabledBuildingsChanged", {
    disabled: state.roguelikeDisabledBuildings,
  });
}

// ---------------------------------------------------------------------------
// Campaign achievement checking
// ---------------------------------------------------------------------------

/**
 * Check all achievements for the current campaign scenario and emit events
 * for any that are earned. Called when the player wins (winnerId === "p1").
 */
function _checkCampaignAchievements(state: GameState): void {
  if (state.campaignScenario == null) return;

  const achievements = getAchievementsForScenario(state.campaignScenario);
  const p1Player = state.players.get("p1");

  for (const achievement of achievements) {
    if (state.campaignAchievementsEarned.includes(achievement.achievementId)) {
      continue;
    }

    let earned = false;

    switch (achievement.condition) {
      case CampaignAchievementCondition.SPEED_CLEAR:
        earned = state.campaignBattleTime <= achievement.threshold;
        break;
      case CampaignAchievementCondition.NO_DAMAGE:
        for (const base of state.bases.values()) {
          if (base.owner === "p1" && base.health >= base.maxHealth) {
            earned = true;
          }
        }
        break;
      case CampaignAchievementCondition.NO_BUILDINGS_LOST:
        earned = state.campaignBuildingsLost === 0;
        break;
      case CampaignAchievementCondition.NO_UNITS_LOST:
        earned = state.campaignUnitsLost === 0;
        break;
      case CampaignAchievementCondition.GOLD_HOARDER:
        earned = (p1Player?.gold ?? 0) >= achievement.threshold;
        break;
    }

    if (earned) {
      state.campaignAchievementsEarned.push(achievement.achievementId);
      EventBus.emit("campaignAchievementEarned", {
        achievementId: achievement.achievementId,
        title: achievement.title,
        reward: achievement.reward.description,
      });
    }
  }
}

// ---------------------------------------------------------------------------
// Roguelike: cursed buildings (cost +50% instead of disabled)
// ---------------------------------------------------------------------------

/**
 * For ROGUELIKE: randomly curse 50% of non-castle building types each round.
 * Cursed buildings cost 50% more gold but are still available.
 */
function _rollRoguelikeCursedBuildings(state: GameState): void {
  const allTypes = Object.values(BuildingType).filter(
    (t) => t !== BuildingType.CASTLE && t !== BuildingType.FIREPIT,
  );
  const shuffled = [...allTypes];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  const half = Math.floor(shuffled.length / 2);
  state.roguelikeCursedBuildings = shuffled.slice(0, half);

  EventBus.emit("roguelikeCursedBuildingsChanged", {
    cursed: state.roguelikeCursedBuildings,
  });
}

// ---------------------------------------------------------------------------
// Roguelike: wave events every 5 rounds
// ---------------------------------------------------------------------------

/**
 * Process wave events at round milestones (every 5 rounds).
 * Events cycle with increasing rewards after round 25.
 */
function _processRoguelikeWaveEvent(state: GameState): void {
  const round = state.roguelikeRound;
  state.roguelikeActiveEvent = null;

  if (round % 5 !== 0) return;

  const cycleIndex = round > 25 ? Math.floor((round - 26) / 20) + 1 : 0;
  const bonusMultiplier = 1 + cycleIndex * 0.5;

  // Determine event based on (round % 20) or exact round for first cycle
  const mod20 = round % 20;
  let eventType: string;
  let description: string;

  if (mod20 === 5) {
    eventType = RoguelikeWaveEventType.MERCENARY;
    description = "A powerful mercenary joins your forces for one round!";
    state.roguelikeActiveEvent = eventType;
  } else if (mod20 === 10) {
    eventType = RoguelikeWaveEventType.SUPPLY_DROP;
    const bonusGold = Math.floor(1500 * bonusMultiplier);
    description = `Supply drop! You receive ${bonusGold} bonus gold.`;
    const p1 = state.players.get("p1");
    if (p1) {
      p1.gold += bonusGold;
      EventBus.emit("goldChanged", { playerId: "p1", amount: p1.gold });
    }
    state.roguelikeActiveEvent = eventType;
  } else if (mod20 === 15) {
    eventType = RoguelikeWaveEventType.RITUAL;
    description = "A ritual cleansing! All building curses have been lifted.";
    state.roguelikeCursedBuildings = [];
    EventBus.emit("roguelikeCursedBuildingsChanged", { cursed: [] });
    state.roguelikeActiveEvent = eventType;
  } else if (mod20 === 0) {
    // Round 20, 40, 60, ...
    eventType = RoguelikeWaveEventType.CHAMPION;
    description = "Champion's blessing! Your strongest unit type gains +25% stats for 3 rounds.";
    state.roguelikeChampionBuff = {
      unitType: UnitType.KNIGHT,
      remainingRounds: 3,
    };
    state.roguelikeActiveEvent = eventType;
  } else {
    return;
  }

  EventBus.emit("roguelikeWaveEvent", { eventType, round, description });
}

/** Tick down the champion buff remaining rounds. */
function _tickRoguelikeChampionBuff(state: GameState): void {
  if (!state.roguelikeChampionBuff) return;
  state.roguelikeChampionBuff.remainingRounds -= 1;
  if (state.roguelikeChampionBuff.remainingRounds <= 0) {
    state.roguelikeChampionBuff = null;
  }
}

// ---------------------------------------------------------------------------
// Roguelike: escalating enemy composition by round tier
// ---------------------------------------------------------------------------

/**
 * Returns the allowed enemy unit types for the current roguelike round.
 * - Rounds 1-5:  Basic units (swordsman, archer)
 * - Rounds 6-15: Add mages, cavalry
 * - Rounds 16-25: Add siege, elite
 * - Rounds 25+:  Random chaos combinations with bonus stats
 */
export function getRoguelikeAllowedEnemyUnits(round: number): UnitType[] {
  const basic: UnitType[] = [UnitType.SWORDSMAN, UnitType.ARCHER];
  if (round <= 5) return basic;

  const intermediate: UnitType[] = [
    ...basic,
    UnitType.FIRE_MAGE,
    UnitType.KNIGHT,
    UnitType.SCOUT_CAVALRY,
    UnitType.PIKEMAN,
  ];
  if (round <= 15) return intermediate;

  const advanced: UnitType[] = [
    ...intermediate,
    UnitType.BATTERING_RAM,
    UnitType.BALLISTA,
    UnitType.LANCER,
    UnitType.ELITE_LANCER,
    UnitType.STORM_MAGE,
    UnitType.LONGBOWMAN,
    UnitType.CROSSBOWMAN,
  ];
  if (round <= 25) return advanced;

  return [
    ...advanced,
    UnitType.KNIGHT_LANCER,
    UnitType.RED_DRAGON,
    UnitType.FROST_DRAGON,
    UnitType.CYCLOPS,
    UnitType.HALBERDIER,
    UnitType.COLD_MAGE,
    UnitType.SUMMONER,
  ];
}

/**
 * Returns the enemy stat bonus multiplier for the current round tier.
 * Rounds 25+: enemy units get +2% stats per round above 25.
 */
export function getRoguelikeEnemyStatBonus(round: number): number {
  if (round <= 25) return 0;
  return (round - 25) * 0.02;
}

/** Apply round-tier enemy scaling: adjusts AI gold based on round number. */
function _applyRoguelikeEnemyScaling(state: GameState): void {
  const round = state.roguelikeRound;
  const aiGoldBonus = Math.floor(round * 100);
  for (const player of state.players.values()) {
    if (player.isAI) {
      player.gold += aiGoldBonus;
      EventBus.emit("goldChanged", { playerId: player.id, amount: player.gold });
    }
  }
}

// ---------------------------------------------------------------------------
// Roguelike: meta-progression (persisted to localStorage)
// ---------------------------------------------------------------------------

const ROGUELIKE_META_KEY = "roguelike_meta_v1";

export interface RoguelikeMetaState {
  highScore: number;
  totalRoundsPlayed: number;
  permanentBonuses: RoguelikePermanentBonus[];
}

export interface RoguelikePermanentBonus {
  id: string;
  label: string;
  description: string;
  unlockThreshold: number;
  unlocked: boolean;
}

const DEFAULT_PERMANENT_BONUSES: RoguelikePermanentBonus[] = [
  {
    id: "starting_gold_5",
    label: "+5% Starting Gold",
    description: "Start each run with 5% more gold.",
    unlockThreshold: 10,
    unlocked: false,
  },
  {
    id: "starting_unit",
    label: "+1 Starting Unit",
    description: "Begin each run with one extra swordsman.",
    unlockThreshold: 25,
    unlocked: false,
  },
  {
    id: "building_cost_5",
    label: "-5% Building Costs",
    description: "All buildings cost 5% less gold.",
    unlockThreshold: 50,
    unlocked: false,
  },
];

export function loadRoguelikeMeta(): RoguelikeMetaState {
  try {
    const raw = localStorage.getItem(ROGUELIKE_META_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as RoguelikeMetaState;
      if (!parsed.permanentBonuses) {
        parsed.permanentBonuses = DEFAULT_PERMANENT_BONUSES.map((b) => ({ ...b }));
      }
      return parsed;
    }
  } catch {
    // Corrupted storage — reset
  }
  return {
    highScore: 0,
    totalRoundsPlayed: 0,
    permanentBonuses: DEFAULT_PERMANENT_BONUSES.map((b) => ({ ...b })),
  };
}

export function saveRoguelikeMeta(meta: RoguelikeMetaState): void {
  try {
    localStorage.setItem(ROGUELIKE_META_KEY, JSON.stringify(meta));
  } catch {
    // Storage unavailable — ignore
  }
}

export function updateRoguelikeMeta(roundReached: number): RoguelikeMetaState {
  const meta = loadRoguelikeMeta();
  meta.totalRoundsPlayed += roundReached;
  if (roundReached > meta.highScore) {
    meta.highScore = roundReached;
  }
  for (const bonus of meta.permanentBonuses) {
    if (!bonus.unlocked && meta.highScore >= bonus.unlockThreshold) {
      bonus.unlocked = true;
    }
  }
  saveRoguelikeMeta(meta);
  return meta;
}

// ---------------------------------------------------------------------------
// Win condition check
// ---------------------------------------------------------------------------

/**
 * Returns:
 *   - `undefined`  — battle is still ongoing
 *   - `null`       — draw (both sides simultaneously destroyed)
 *   - `string`     — PlayerId of the surviving/winning player
 *
 * Win conditions (checked in order):
 *   1. Any base has hp <= 0 -> the base owner loses (opponent wins).
 *   2. One side has zero living units AND zero active buildings (total wipe).
 *      Only fires when at least one side has something on the field -- prevents
 *      an instant win-on-empty-battlefield at the start of the BATTLE phase.
 */
function _checkWinCondition(state: GameState): string | null | undefined {
  // BATTLEFIELD mode: bases don't matter — losing last unit means defeat.
  if (state.gameMode === GameMode.BATTLEFIELD) {
    return _checkBattlefieldWin(state);
  }

  // 1. Base health — collect all eliminated player IDs
  const eliminated = new Set<string>();
  for (const base of state.bases.values()) {
    if (base.health <= 0) {
      eliminated.add(base.owner);
    }
  }

  if (eliminated.size > 0) {
    // Identify surviving players
    const allPlayers = [...state.players.keys()];
    const survivors = allPlayers.filter((id) => !eliminated.has(id));
    if (survivors.length === 0) return null; // mutual destruction — draw
    if (survivors.length === 1) return survivors[0];
    // Check if all survivors are allied — if so, they win together
    if (_allAllied(state, survivors)) return survivors[0];
    // Multiple non-allied players still standing — keep fighting
  }

  // 2. Total wipe: a player has no living units and no active buildings.
  // Guard: skip if the entire field is empty (start of battle, nothing deployed yet).
  const anyEntitiesOnField = _anyEntitiesExist(state);
  if (!anyEntitiesOnField) return undefined;

  for (const [playerId] of state.players) {
    const hasUnits = _hasLivingUnits(state, playerId);
    const hasBuildings = _hasActiveBuildings(state, playerId);
    if (!hasUnits && !hasBuildings) {
      // This player is totally wiped — check remaining opponents
      const opponents = [...state.players.keys()].filter(
        (id) => id !== playerId,
      );
      if (opponents.length === 1) return opponents[0];
      // Check if all remaining opponents (excluding this wiped player)
      // are allied — if so, they win together
      const survivors = opponents.filter(
        (id) => _hasLivingUnits(state, id) || _hasActiveBuildings(state, id),
      );
      if (survivors.length >= 1 && _allAllied(state, survivors)) {
        return survivors[0];
      }
    }
  }

  return undefined; // ongoing
}

/**
 * BATTLEFIELD win condition: the player who loses all living units loses.
 * No buildings are involved.  Guard against instant win on empty field start.
 */
function _checkBattlefieldWin(state: GameState): string | null | undefined {
  // Wait until at least one unit is on the field
  let anyUnits = false;
  for (const unit of state.units.values()) {
    if (unit.state !== UnitState.DIE) { anyUnits = true; break; }
  }
  if (!anyUnits) return undefined;

  const eliminated = new Set<string>();
  for (const [playerId] of state.players) {
    if (!_hasLivingUnits(state, playerId)) {
      eliminated.add(playerId);
    }
  }

  if (eliminated.size === 0) return undefined; // all sides still have units

  const allPlayers = [...state.players.keys()];
  const survivors = allPlayers.filter((id) => !eliminated.has(id));
  if (survivors.length === 0) return null; // simultaneous last-unit death — draw
  if (survivors.length === 1) return survivors[0];
  // All survivors allied = win
  if (_allAllied(state, survivors)) return survivors[0];
  return undefined;
}

/**
 * Returns true if at least one player has a living unit OR an active building.
 * Used to prevent the wipe-condition from firing on an empty BATTLE field.
 */
function _anyEntitiesExist(state: GameState): boolean {
  for (const unit of state.units.values()) {
    if (unit.state !== UnitState.DIE) return true;
  }
  for (const building of state.buildings.values()) {
    if (building.state === BuildingState.ACTIVE) return true;
  }
  return false;
}

function _hasLivingUnits(state: GameState, playerId: string): boolean {
  for (const unit of state.units.values()) {
    if (unit.owner === playerId && unit.state !== UnitState.DIE) return true;
  }
  return false;
}

function _hasActiveBuildings(state: GameState, playerId: string): boolean {
  for (const building of state.buildings.values()) {
    if (
      building.owner === playerId &&
      building.state === BuildingState.ACTIVE
    ) {
      return true;
    }
  }
  return false;
}

/** Returns true if all players in the list are allied with each other. */
function _allAllied(state: GameState, playerIds: string[]): boolean {
  for (let i = 0; i < playerIds.length; i++) {
    for (let j = i + 1; j < playerIds.length; j++) {
      if (!isAlly(state, playerIds[i], playerIds[j])) return false;
    }
  }
  return true;
}
