// ---------------------------------------------------------------------------
// Caravan relic definitions — segment completion rewards
// ---------------------------------------------------------------------------

export interface RelicDef {
  id: string;
  name: string;
  description: string;
  color: number;
  apply(state: RelicTarget): void;
}

/** Simplified target so relics can modify state */
export interface RelicTarget {
  player: { atk: number; maxHp: number; hp: number; speed: number; range: number; attackCooldown: number; abilities: { def: { cooldown: number }; cooldownTimer: number }[] };
  caravan: { maxHp: number; hp: number; speed: number; baseSpeed: number };
  gold: number;
  maxCargoSlots: number;
  defense: number;
}

export const RELIC_POOL: RelicDef[] = [
  {
    id: "dragon_scale", name: "Dragon Scale Amulet",
    description: "+30 Max HP, +5 ATK",
    color: 0xff6633,
    apply(s) { s.player.maxHp += 30; s.player.hp += 30; s.player.atk += 5; },
  },
  {
    id: "swift_boots", name: "Boots of Swiftness",
    description: "+0.5 Speed, -0.05s attack cooldown",
    color: 0x44ccff,
    apply(s) { s.player.speed += 0.5; s.player.attackCooldown = Math.max(0.2, s.player.attackCooldown - 0.05); },
  },
  {
    id: "iron_plates", name: "Iron Wagon Plates",
    description: "Caravan +100 Max HP",
    color: 0x888899,
    apply(s) { s.caravan.maxHp += 100; s.caravan.hp += 100; },
  },
  {
    id: "merchant_charm", name: "Merchant's Charm",
    description: "+150 Gold, +3 cargo slots",
    color: 0xffd700,
    apply(s) { s.gold += 150; s.maxCargoSlots += 3; },
  },
  {
    id: "war_banner", name: "War Banner",
    description: "+8 ATK, +0.3 range",
    color: 0xcc4444,
    apply(s) { s.player.atk += 8; s.player.range += 0.3; },
  },
  {
    id: "blessed_wheel", name: "Blessed Wheel",
    description: "Caravan +0.2 speed permanently",
    color: 0x88cc44,
    apply(s) { s.caravan.speed += 0.2; s.caravan.baseSpeed += 0.2; },
  },
  {
    id: "healers_satchel", name: "Healer's Satchel",
    description: "Full heal: hero + caravan",
    color: 0x44ff88,
    apply(s) { s.player.hp = s.player.maxHp; s.caravan.hp = s.caravan.maxHp; },
  },
  {
    id: "scouts_eye", name: "Scout's Eye",
    description: "+1.0 range, +0.3 speed",
    color: 0xaaddff,
    apply(s) { s.player.range += 1.0; s.player.speed += 0.3; },
  },
  {
    id: "iron_shield", name: "Iron Shield",
    description: "+5 Defense (reduces all incoming damage)",
    color: 0x8899aa,
    apply(s) { s.defense += 5; },
  },
  {
    id: "mithril_mail", name: "Mithril Mail",
    description: "+3 Defense, +20 Max HP",
    color: 0xaaccdd,
    apply(s) { s.defense += 3; s.player.maxHp += 20; s.player.hp += 20; },
  },
  {
    id: "spell_loop", name: "Spell Loop Amulet",
    description: "-1.5s all ability cooldowns",
    color: 0xaa44ff,
    apply(s) {
      for (const ab of s.player.abilities) {
        ab.def.cooldown = Math.max(2, ab.def.cooldown - 1.5);
      }
    },
  },
  {
    id: "berserker_totem", name: "Berserker Totem",
    description: "+10 ATK, -0.08s attack speed",
    color: 0xff4444,
    apply(s) { s.player.atk += 10; s.player.attackCooldown = Math.max(0.15, s.player.attackCooldown - 0.08); },
  },
  {
    id: "caravan_armor", name: "Reinforced Plating",
    description: "+8 Defense, caravan +80 HP",
    color: 0x667788,
    apply(s) { s.defense += 8; s.caravan.maxHp += 80; s.caravan.hp += 80; },
  },
];

/** Roll 3 random relics for player to choose from */
export function rollRelicChoices(excludeIds: string[]): RelicDef[] {
  const pool = RELIC_POOL.filter((r) => !excludeIds.includes(r.id));
  // Fisher-Yates shuffle
  const shuffled = [...pool];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled.slice(0, Math.min(3, shuffled.length));
}
