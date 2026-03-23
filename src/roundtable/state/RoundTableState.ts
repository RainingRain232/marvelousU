// ---------------------------------------------------------------------------
// Round Table – State Factory & Helpers
// ---------------------------------------------------------------------------

import {
  RTRunState, RTCombatState, RTPhase, KnightId,
  CardInstance, EnemyInstance, StatusEffectId,
  RTMetaState,
} from "../types";
import { KNIGHT_DEFS } from "../config/RoundTableKnights";
import { getEnemyDef } from "../config/RoundTableEnemies";
import { RT_BALANCE } from "../config/RoundTableBalance";

// ── Seeded RNG (simple LCG) ────────────────────────────────────────────────

export function createRng(seed: number): { next: () => number; state: number } {
  let s = seed;
  return {
    get state() { return s; },
    set state(v: number) { s = v; },
    next(): number {
      s = (s * 1664525 + 1013904223) & 0x7fffffff;
      return s / 0x7fffffff;
    },
  };
}

// ── State Creation ──────────────────────────────────────────────────────────

let _nextUid = 1;

export function makeCardInstance(defId: string): CardInstance {
  return { uid: _nextUid++, defId, upgraded: false };
}

export function createRunState(knightId: KnightId, ascension: number, seed?: number): RTRunState {
  const knight = KNIGHT_DEFS[knightId];
  const s = seed ?? (Date.now() ^ (Math.random() * 0xffffffff));
  _nextUid = 1;

  const deck: CardInstance[] = knight.startingDeckIds.map(id => makeCardInstance(id));

  // ── Ascension starting penalties ──
  let startHp = knight.maxHp;
  let startGold: number = RT_BALANCE.STARTING_GOLD;
  if (ascension >= 3) startHp -= 7;
  if (ascension >= 15) startHp -= 5;
  if (ascension >= 5) startGold -= 20;
  if (ascension >= 16) startGold -= 10;
  startHp = Math.max(1, startHp);
  startGold = Math.max(0, startGold);

  // Ascension 9: extra curse in starting deck
  if (ascension >= 9) {
    deck.push(makeCardInstance("curse_regret"));
  }

  const state: RTRunState = {
    phase: RTPhase.MAP,
    knightId,
    hp: startHp,
    maxHp: startHp,
    gold: startGold,
    purity: RT_BALANCE.STARTING_PURITY,
    act: 1,
    floor: 0,
    deck,
    relics: [],
    potions: [null, null, null],
    maps: [],
    ascension,
    nextUid: _nextUid,
    seed: s,
    rngState: s,
    score: 0,
    cardsPlayed: 0,
    enemiesKilled: 0,
    damageDealt: 0,
    combat: null,
    currentEventId: null,
    shop: null,
    rewardCards: null,
    rewardGold: 0,
    rewardRelics: [],
    rewardPotions: [],
    flags: new Set(),
  };

  return state;
}

// ── Combat State Creation ──────────────────────────────────────────────────

export function createCombatState(
  run: RTRunState,
  enemyIds: string[],
  rng: { next: () => number },
): RTCombatState {
  const enemies: EnemyInstance[] = enemyIds.map(id => {
    const def = getEnemyDef(id);
    let hp = Math.round(def.maxHp[0] + rng.next() * (def.maxHp[1] - def.maxHp[0]));

    // ── Ascension HP scaling ──
    const asc = run.ascension;
    if (def.isBoss) {
      if (asc >= 4) hp = Math.round(hp * 1.1);
      if (asc >= 19) hp = Math.round(hp * 1.1);
    } else if (def.isElite) {
      if (asc >= 1) hp = Math.round(hp * 1.1);
      if (asc >= 18) hp = Math.round(hp * 1.1);
    } else {
      if (asc >= 2) hp = Math.round(hp * 1.1);
      if (asc >= 17) hp = Math.round(hp * 1.05);
    }

    return {
      uid: _nextUid++,
      defId: id,
      hp,
      maxHp: hp,
      block: 0,
      effects: new Map(),
      currentMoveId: "",
      lastMoveId: "",
      moveCooldowns: new Map(),
      turnCount: 0,
    };
  });

  run.nextUid = _nextUid;

  // Shuffle deck into draw pile
  const allCards = [...run.deck];
  shuffleArray(allCards, rng.next);

  return {
    enemies,
    hand: [],
    drawPile: allCards,
    discardPile: [],
    exhaustPile: [],
    energy: RT_BALANCE.STARTING_ENERGY,
    maxEnergy: RT_BALANCE.STARTING_ENERGY,
    turn: 0,
    playerBlock: 0,
    playerEffects: new Map(),
    selectedTarget: 0,
    isPlayerTurn: true,
    log: [],
    comboThisTurn: 0,
    cardsPlayedThisTurn: 0,
    playedStrikeThisTurn: false,
    playedGuardThisTurn: false,
    animQueue: [],
  };
}

// ── Meta State ─────────────────────────────────────────────────────────────

const META_STORAGE_KEY = "rt_meta";

export function loadMetaState(): RTMetaState {
  try {
    const raw = localStorage.getItem(META_STORAGE_KEY);
    if (raw) return JSON.parse(raw) as RTMetaState;
  } catch { /* ignore */ }
  return createDefaultMeta();
}

export function saveMetaState(meta: RTMetaState): void {
  try {
    localStorage.setItem(META_STORAGE_KEY, JSON.stringify(meta));
  } catch { /* ignore */ }
}

function createDefaultMeta(): RTMetaState {
  return {
    totalGold: 0,
    ascensionPerKnight: {},
    unlockedCards: [],
    unlockedKnights: [KnightId.LANCELOT, KnightId.PERCIVAL],
    totalRuns: 0,
    totalWins: 0,
    bestScore: 0,
    upgrades: {},
  };
}

// ── Utility ────────────────────────────────────────────────────────────────

export function shuffleArray<T>(arr: T[], rng: () => number): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function getEffect(effects: Map<StatusEffectId, number>, id: StatusEffectId): number {
  return effects.get(id) ?? 0;
}

export function addEffect(effects: Map<StatusEffectId, number>, id: StatusEffectId, amount: number): void {
  const current = effects.get(id) ?? 0;
  effects.set(id, current + amount);
}

export function clampHp(run: RTRunState): void {
  if (run.hp > run.maxHp) run.hp = run.maxHp;
  if (run.hp < 0) run.hp = 0;
}

// ── Run History ──────────────────────────────────────────────────────────

export interface RunHistoryEntry {
  knightId: string;
  ascension: number;
  won: boolean;
  score: number;
  act: number;
  floor: number;
  purity: number;
  cardsPlayed: number;
  enemiesKilled: number;
  damageDealt: number;
  relicCount: number;
  deckSize: number;
  timestamp: number;
}

const HISTORY_KEY = "rt_run_history";
const MAX_HISTORY = 20;

export function addRunHistory(entry: RunHistoryEntry): void {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    const history: RunHistoryEntry[] = raw ? JSON.parse(raw) : [];
    history.unshift(entry);
    if (history.length > MAX_HISTORY) history.length = MAX_HISTORY;
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  } catch { /* ignore */ }
}

export function getRunHistory(): RunHistoryEntry[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

// ── Run Save/Load ─────────────────────────────────────────────────────────

const RUN_SAVE_KEY = "rt_run_save";

/** Save current run state to localStorage. */
export function saveRunState(run: RTRunState): void {
  try {
    // Convert Sets and Maps to serializable form
    const serializable = {
      ...run,
      flags: Array.from(run.flags),
      combat: null, // don't save mid-combat state
    };
    localStorage.setItem(RUN_SAVE_KEY, JSON.stringify(serializable));
  } catch { /* ignore quota errors */ }
}

/** Load a saved run state, or null if none exists. */
export function loadRunState(): RTRunState | null {
  try {
    const raw = localStorage.getItem(RUN_SAVE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    // Restore Set from array
    data.flags = new Set(data.flags);
    // Restore potion nulls
    data.potions = data.potions.map((p: any) => p ?? null);
    return data as RTRunState;
  } catch { return null; }
}

/** Clear saved run. */
export function clearRunSave(): void {
  try { localStorage.removeItem(RUN_SAVE_KEY); } catch { /* ignore */ }
}

/** Check if a saved run exists. */
export function hasSavedRun(): boolean {
  try { return localStorage.getItem(RUN_SAVE_KEY) !== null; } catch { return false; }
}
