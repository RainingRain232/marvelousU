// ---------------------------------------------------------------------------
// Caravan trade goods & town definitions
// ---------------------------------------------------------------------------

export interface TradeGoodDef {
  id: string;
  name: string;
  basePrice: number;
  description: string;
  perishable?: boolean; // loses value each segment if not sold
}

export const TRADE_GOODS: TradeGoodDef[] = [
  { id: "grain",  name: "Grain",  basePrice: 30,  description: "Perishable — cheap near farms", perishable: true },
  { id: "iron",   name: "Iron",   basePrice: 50,  description: "Durable — cheap near mines" },
  { id: "silk",   name: "Silk",   basePrice: 80,  description: "Fine fabric — cheap in port towns" },
  { id: "spices", name: "Spices", basePrice: 100, description: "Exotic flavors — moderate everywhere" },
  { id: "ale",    name: "Ale",    basePrice: 40,  description: "Perishable — cheap in brewing towns", perishable: true },
  { id: "gems",   name: "Gems",   basePrice: 150, description: "Precious stones — high profit" },
];

export type TownType = "farm" | "mine" | "port" | "city" | "monastery";

export interface TownDef {
  name: string;
  type: TownType;
  // Price multipliers per good ID (< 1 = cheaper to buy, > 1 = sells for more)
  priceMultipliers: Record<string, number>;
}

// Price multiplier presets by town type
const TOWN_PRICE_PRESETS: Record<TownType, Record<string, number>> = {
  farm:       { grain: 0.5, iron: 1.0, silk: 1.3, spices: 1.2, ale: 0.7, gems: 1.5 },
  mine:       { grain: 1.2, iron: 0.4, silk: 1.2, spices: 1.0, ale: 0.8, gems: 0.7 },
  port:       { grain: 1.1, iron: 1.1, silk: 0.5, spices: 0.6, ale: 1.0, gems: 1.3 },
  city:       { grain: 1.4, iron: 1.3, silk: 1.4, spices: 1.3, ale: 1.2, gems: 1.2 },
  monastery:  { grain: 0.8, iron: 1.0, silk: 1.5, spices: 1.4, ale: 1.6, gems: 1.0 },
};

// Named towns per segment (generated route)
const TOWN_POOL: { name: string; type: TownType }[] = [
  { name: "Tintagel",      type: "farm" },
  { name: "Caerphilly",    type: "mine" },
  { name: "Avalon Port",   type: "port" },
  { name: "Camelot",       type: "city" },
  { name: "Glastonbury",   type: "monastery" },
  { name: "Ironforge",     type: "mine" },
  { name: "Lyonesse",      type: "port" },
  { name: "Carlisle",      type: "farm" },
  { name: "Winchester",    type: "city" },
  { name: "Whitby Abbey",  type: "monastery" },
];

export function generateRoute(totalSegments: number): TownDef[] {
  // Fisher-Yates shuffle for proper randomization, then take unique towns
  const pool = [...TOWN_POOL];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }

  // Cap generation at 20 towns (endless mode loops through them)
  const count = Math.min(totalSegments + 1, 20);
  const towns: TownDef[] = [];
  let lastType: TownType | null = null;
  let poolIdx = 0;

  for (let i = 0; i < count; i++) {
    // Find next town that isn't same type as previous (with fallback)
    let chosen = pool[poolIdx % pool.length];
    for (let j = 0; j < pool.length; j++) {
      const candidate = pool[(poolIdx + j) % pool.length];
      if (candidate.type !== lastType || j === pool.length - 1) {
        chosen = candidate;
        poolIdx = (poolIdx + j + 1) % pool.length;
        break;
      }
    }

    // Price randomization ±20% for meaningful trade speculation
    const mults: Record<string, number> = {};
    for (const [key, val] of Object.entries(TOWN_PRICE_PRESETS[chosen.type])) {
      mults[key] = Math.round((val + (Math.random() * 0.4 - 0.2)) * 100) / 100;
    }

    towns.push({
      name: chosen.name,
      type: chosen.type,
      priceMultipliers: mults,
    });
    lastType = chosen.type;
  }
  return towns;
}

export function getGoodPrice(good: TradeGoodDef, town: TownDef): number {
  const mult = town.priceMultipliers[good.id] ?? 1.0;
  return Math.round(good.basePrice * mult);
}

/** Get town for a segment index (loops for endless mode) */
export function getTownForSegment(towns: TownDef[], segment: number): TownDef {
  return towns[segment % towns.length];
}

/** Get sell price accounting for spoilage (-15% per segment aged) */
export function getSpoiledSellPrice(good: TradeGoodDef, town: TownDef, spoilage: number): number {
  const basePrice = getGoodPrice(good, town);
  if (!good.perishable || spoilage <= 0) return basePrice;
  const decay = Math.max(0.3, 1 - spoilage * 0.15); // min 30% of value
  return Math.round(basePrice * decay);
}
