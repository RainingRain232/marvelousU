export interface MasteryBonus {
  id: string;
  name: string;
  description: string;
  cost: number; // mastery points per purchase
  maxPurchases: number;
  effect: {
    type: "crit_chance" | "lifesteal" | "spell_penetration" | "max_hp" | "max_mp";
    value: number; // per purchase
  };
}

export const MASTERY_BONUSES: MasteryBonus[] = [
  {
    id: "mastery_crit",
    name: "Critical Focus",
    description: "+2% critical hit chance",
    cost: 1,
    maxPurchases: 5,
    effect: { type: "crit_chance", value: 0.02 },
  },
  {
    id: "mastery_lifesteal",
    name: "Life Drain",
    description: "+3% lifesteal on attacks",
    cost: 2,
    maxPurchases: 3,
    effect: { type: "lifesteal", value: 0.03 },
  },
  {
    id: "mastery_spell_pen",
    name: "Spell Penetration",
    description: "+5% spell damage ignores defense",
    cost: 2,
    maxPurchases: 3,
    effect: { type: "spell_penetration", value: 0.05 },
  },
  {
    id: "mastery_hp",
    name: "Vitality",
    description: "+10 maximum HP",
    cost: 1,
    maxPurchases: 10,
    effect: { type: "max_hp", value: 10 },
  },
  {
    id: "mastery_mp",
    name: "Arcane Well",
    description: "+5 maximum MP",
    cost: 1,
    maxPurchases: 5,
    effect: { type: "max_mp", value: 5 },
  },
];

/** XP needed per mastery point after max level */
export const XP_PER_MASTERY_POINT = 200;

export function getMasteryPurchaseCount(member: { masteryBonuses: Record<string, number> }, bonusId: string): number {
  return member.masteryBonuses[bonusId] ?? 0;
}

export function canPurchaseMastery(
  member: { masteryPoints: number; masteryBonuses: Record<string, number> },
  bonusId: string,
): boolean {
  const bonus = MASTERY_BONUSES.find(b => b.id === bonusId);
  if (!bonus) return false;
  const current = getMasteryPurchaseCount(member, bonusId);
  return current < bonus.maxPurchases && member.masteryPoints >= bonus.cost;
}

export function purchaseMastery(
  member: { masteryPoints: number; masteryBonuses: Record<string, number>; maxHp: number; maxMp: number; critBonus?: number },
  bonusId: string,
): boolean {
  const bonus = MASTERY_BONUSES.find(b => b.id === bonusId);
  if (!bonus || !canPurchaseMastery(member, bonusId)) return false;

  member.masteryPoints -= bonus.cost;
  member.masteryBonuses[bonusId] = (member.masteryBonuses[bonusId] ?? 0) + 1;

  // Apply immediate stat effects
  if (bonus.effect.type === "max_hp") member.maxHp += bonus.effect.value;
  if (bonus.effect.type === "max_mp") member.maxMp += bonus.effect.value;

  return true;
}
