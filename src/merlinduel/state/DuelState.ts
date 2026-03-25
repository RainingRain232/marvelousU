// ---------------------------------------------------------------------------
// Merlin's Duel — State factory & persistence
// ---------------------------------------------------------------------------

import { DuelPhase, Element, SpellId } from "../types";
import type { DuelState, DuelMeta, DuelUpgrades, Spell } from "../types";
import { DUEL_BALANCE as B, SPELL_DEFS, OPPONENTS } from "../config/DuelBalance";

const META_KEY = "merlinduel_meta";

const DEFAULT_UPGRADES: DuelUpgrades = {
  maxHp: 0,
  manaRegen: 0,
  spellPower: 0,
  shieldEfficiency: 0,
  startingGold: 0,
};

export function loadDuelMeta(): DuelMeta {
  try {
    const raw = localStorage.getItem(META_KEY);
    if (raw) {
      const m = JSON.parse(raw) as DuelMeta;
      // Field migration
      if (!m.upgrades) m.upgrades = { ...DEFAULT_UPGRADES };
      if (m.shards === undefined) m.shards = 0;
      if (m.highestRound === undefined) m.highestRound = 0;
      if (m.totalWins === undefined) m.totalWins = 0;
      if (m.upgrades.maxHp === undefined) m.upgrades.maxHp = 0;
      if (m.upgrades.manaRegen === undefined) m.upgrades.manaRegen = 0;
      if (m.upgrades.spellPower === undefined) m.upgrades.spellPower = 0;
      if (m.upgrades.shieldEfficiency === undefined) m.upgrades.shieldEfficiency = 0;
      if (m.upgrades.startingGold === undefined) m.upgrades.startingGold = 0;
      return m;
    }
  } catch { /* ignore */ }
  return {
    shards: 0,
    upgrades: { ...DEFAULT_UPGRADES },
    highestRound: 0,
    totalWins: 0,
  };
}

export function saveDuelMeta(meta: DuelMeta): void {
  try { localStorage.setItem(META_KEY, JSON.stringify(meta)); } catch { /* ignore */ }
}

function makePlayerSpells(): Spell[] {
  // Start with tier-1 spells from each element
  const startIds: SpellId[] = [
    SpellId.FIREBALL,
    SpellId.ICE_SHARD,
    SpellId.LIGHTNING_BOLT,
    SpellId.ARCANE_MISSILE,
  ];
  const keys = Object.keys(SPELL_DEFS) as SpellId[];
  return keys.map(k => {
    const def = SPELL_DEFS[k];
    return { ...def, unlocked: startIds.indexOf(def.id) >= 0 };
  });
}

export function createDuelState(meta?: DuelMeta): DuelState {
  const m = meta || loadDuelMeta();
  const u = m.upgrades ?? DEFAULT_UPGRADES;

  const maxHp = B.PLAYER_MAX_HP + u.maxHp * B.UPGRADE_VALUES.maxHp;
  const maxMana = B.PLAYER_MAX_MANA;
  const manaRegen = B.PLAYER_MANA_REGEN + u.manaRegen * B.UPGRADE_VALUES.manaRegen;
  const spellPower = 1.0 + u.spellPower * B.UPGRADE_VALUES.spellPower;
  const shieldEfficiency = 1.0 - u.shieldEfficiency * B.UPGRADE_VALUES.shieldEfficiency;
  const startingGold = u.startingGold * B.UPGRADE_VALUES.startingGold;

  // Deep-copy opponents so each run is fresh
  const opponents = OPPONENTS.map(o => ({ ...o, defeated: false }));

  // Build initial cooldown map
  const cooldowns: Record<string, number> = {};
  const spellKeys = Object.keys(SpellId) as (keyof typeof SpellId)[];
  for (const k of spellKeys) { cooldowns[SpellId[k]] = 0; }

  return {
    phase: DuelPhase.START,
    playerHp: maxHp,
    playerMaxHp: maxHp,
    playerMana: maxMana,
    playerMaxMana: maxMana,
    playerManaRegen: manaRegen,
    playerY: B.CANVAS_H / 2,
    playerSpells: makePlayerSpells(),
    playerCooldowns: cooldowns,
    selectedElement: Element.FIRE,
    shieldActive: false,
    shieldManaCost: B.SHIELD_DRAIN_RATE * shieldEfficiency,
    enemy: opponents[0],
    enemyY: B.CANVAS_H / 2,
    enemyCastTimer: 0,
    enemyDodgeTimer: 0,
    projectiles: [],
    particles: [],
    round: 1,
    opponents,
    gold: startingGold,
    score: 0,
    messages: [],
    countdownTimer: B.COUNTDOWN_DURATION,
    screenShake: 0,
    screenFlash: 0,
    time: 0,
    moveUp: false,
    moveDown: false,
    spellPower,
    shieldEfficiency,
    burnTimers: {},
    slowTimers: {},
    stunTimer: 0,
  };
}
