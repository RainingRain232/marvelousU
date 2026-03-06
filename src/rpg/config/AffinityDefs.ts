export const AFFINITY_THRESHOLDS = [
  { level: 10, atkBonus: 0.05, defBonus: 0 },
  { level: 25, atkBonus: 0.10, defBonus: 0.05 },
  { level: 50, atkBonus: 0.15, defBonus: 0.10 },
] as const;

export function getAffinityBonus(affinityScore: number): { atkMult: number; defMult: number } {
  let atkMult = 1.0;
  let defMult = 1.0;
  for (const t of AFFINITY_THRESHOLDS) {
    if (affinityScore >= t.level) {
      atkMult = 1.0 + t.atkBonus;
      defMult = 1.0 + t.defBonus;
    }
  }
  return { atkMult, defMult };
}
