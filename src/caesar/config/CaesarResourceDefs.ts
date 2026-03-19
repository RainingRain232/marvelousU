// ---------------------------------------------------------------------------
// Caesar – Resource definitions
// ---------------------------------------------------------------------------

export enum CaesarResourceType {
  GOLD = "gold",
  FOOD = "food",
  WHEAT = "wheat",
  FLOUR = "flour",
  WOOD = "wood",
  STONE = "stone",
  IRON = "iron",
  TOOLS = "tools",
  CLOTH = "cloth",
}

export interface CaesarResourceMeta {
  label: string;
  color: string;
  isRaw: boolean;
}

export const RESOURCE_META: Record<CaesarResourceType, CaesarResourceMeta> = {
  [CaesarResourceType.GOLD]:  { label: "Gold",  color: "#ffd700", isRaw: false },
  [CaesarResourceType.FOOD]:  { label: "Food",  color: "#8bc34a", isRaw: false },
  [CaesarResourceType.WHEAT]: { label: "Wheat", color: "#cddc39", isRaw: true },
  [CaesarResourceType.FLOUR]: { label: "Flour", color: "#fff9c4", isRaw: false },
  [CaesarResourceType.WOOD]:  { label: "Wood",  color: "#795548", isRaw: true },
  [CaesarResourceType.STONE]: { label: "Stone", color: "#9e9e9e", isRaw: true },
  [CaesarResourceType.IRON]:  { label: "Iron",  color: "#607d8b", isRaw: true },
  [CaesarResourceType.TOOLS]: { label: "Tools", color: "#455a64", isRaw: false },
  [CaesarResourceType.CLOTH]: { label: "Cloth", color: "#e1bee7", isRaw: false },
};
