// ============================================================================
// ArthurianRPGCrafting.ts – Crafting UI screen with Smithing, Alchemy, Enchanting
// ============================================================================

import { CraftingDiscipline } from "./ArthurianRPGInventory";
import { ItemQualityTier } from "./ArthurianRPGConfig";
import { addItem, removeItem } from "./ArthurianRPGState";
import type { PlayerState } from "./ArthurianRPGState";

// ---------------------------------------------------------------------------
// Crafting recipe definition
// ---------------------------------------------------------------------------
export interface GameCraftingRecipe {
  id: string;
  name: string;
  discipline: CraftingDiscipline;
  requiredSkillLevel: number;
  materials: { itemId: string; name: string; count: number }[];
  result: { itemId: string; name: string; count: number; weight: number; quality: ItemQualityTier };
  xpReward: number;
  icon: string;
  description: string;
}

// ---------------------------------------------------------------------------
// Crafting UI state
// ---------------------------------------------------------------------------
export interface CraftingUIState {
  tab: CraftingDiscipline;
  selectedRecipe: number;
  scrollOffset: number;
  craftFlash: number;
  craftMessage: string;
}

export function createCraftingUIState(): CraftingUIState {
  return {
    tab: CraftingDiscipline.Smithing,
    selectedRecipe: 0,
    scrollOffset: 0,
    craftFlash: 0,
    craftMessage: "",
  };
}

// ---------------------------------------------------------------------------
// Recipe registry (8 Smithing, 8 Alchemy, 6 Enchanting)
// ---------------------------------------------------------------------------
export const CRAFTING_RECIPES: GameCraftingRecipe[] = [
  // ===== SMITHING (8 recipes) =====
  {
    id: "smith_iron_dagger", name: "Iron Dagger", discipline: CraftingDiscipline.Smithing,
    requiredSkillLevel: 1,
    materials: [{ itemId: "iron_ingot", name: "Iron Ingot", count: 1 }, { itemId: "leather_strip", name: "Leather Strip", count: 1 }],
    result: { itemId: "iron_dagger", name: "Iron Dagger", count: 1, weight: 2, quality: ItemQualityTier.Common },
    xpReward: 15, icon: "\u{1F5E1}", description: "A simple iron dagger, reliable for close quarters.",
  },
  {
    id: "smith_iron_sword", name: "Iron Longsword", discipline: CraftingDiscipline.Smithing,
    requiredSkillLevel: 5,
    materials: [{ itemId: "iron_ingot", name: "Iron Ingot", count: 2 }, { itemId: "leather_strip", name: "Leather Strip", count: 1 }],
    result: { itemId: "iron_longsword", name: "Iron Longsword", count: 1, weight: 5, quality: ItemQualityTier.Common },
    xpReward: 25, icon: "\u2694\uFE0F", description: "A sturdy longsword forged from iron.",
  },
  {
    id: "smith_steel_sword", name: "Steel Broadsword", discipline: CraftingDiscipline.Smithing,
    requiredSkillLevel: 12,
    materials: [{ itemId: "steel_ingot", name: "Steel Ingot", count: 2 }, { itemId: "leather_strip", name: "Leather Strip", count: 2 }],
    result: { itemId: "steel_broadsword", name: "Steel Broadsword", count: 1, weight: 6, quality: ItemQualityTier.Uncommon },
    xpReward: 40, icon: "\u2694\uFE0F", description: "A sharp broadsword of tempered steel.",
  },
  {
    id: "smith_iron_shield", name: "Iron Buckler", discipline: CraftingDiscipline.Smithing,
    requiredSkillLevel: 8,
    materials: [{ itemId: "iron_ingot", name: "Iron Ingot", count: 3 }, { itemId: "leather_strip", name: "Leather Strip", count: 1 }],
    result: { itemId: "iron_buckler", name: "Iron Buckler", count: 1, weight: 6, quality: ItemQualityTier.Common },
    xpReward: 30, icon: "\u{1F6E1}\uFE0F", description: "A small round shield reinforced with iron bands.",
  },
  {
    id: "smith_chain_mail", name: "Chainmail Hauberk", discipline: CraftingDiscipline.Smithing,
    requiredSkillLevel: 18,
    materials: [{ itemId: "iron_ingot", name: "Iron Ingot", count: 4 }, { itemId: "steel_ingot", name: "Steel Ingot", count: 1 }, { itemId: "leather_strip", name: "Leather Strip", count: 3 }],
    result: { itemId: "chainmail_hauberk", name: "Chainmail Hauberk", count: 1, weight: 15, quality: ItemQualityTier.Uncommon },
    xpReward: 60, icon: "\u{1F9E5}", description: "Interlocking iron rings form a protective shirt.",
  },
  {
    id: "smith_camelot_plate", name: "Camelot Plate Armor", discipline: CraftingDiscipline.Smithing,
    requiredSkillLevel: 30,
    materials: [{ itemId: "steel_ingot", name: "Steel Ingot", count: 5 }, { itemId: "moonstone", name: "Moonstone", count: 1 }, { itemId: "leather_strip", name: "Leather Strip", count: 4 }],
    result: { itemId: "camelot_plate_chest", name: "Camelot Plate Armor", count: 1, weight: 25, quality: ItemQualityTier.Rare },
    xpReward: 100, icon: "\u{1F6E1}\uFE0F", description: "Gleaming plate armor emblazoned with the Pendragon crest.",
  },
  {
    id: "smith_excalibur_replica", name: "Caliburn (Replica)", discipline: CraftingDiscipline.Smithing,
    requiredSkillLevel: 45,
    materials: [{ itemId: "steel_ingot", name: "Steel Ingot", count: 4 }, { itemId: "moonstone", name: "Moonstone", count: 2 }, { itemId: "dragon_scale", name: "Dragon Scale", count: 1 }],
    result: { itemId: "caliburn_replica", name: "Caliburn (Replica)", count: 1, weight: 7, quality: ItemQualityTier.Epic },
    xpReward: 150, icon: "\u2694\uFE0F", description: "A masterwork blade inspired by the legendary Excalibur.",
  },
  {
    id: "smith_legendary_armor", name: "Avalon Warden Plate", discipline: CraftingDiscipline.Smithing,
    requiredSkillLevel: 60,
    materials: [{ itemId: "steel_ingot", name: "Steel Ingot", count: 6 }, { itemId: "dragon_scale", name: "Dragon Scale", count: 3 }, { itemId: "moonstone", name: "Moonstone", count: 3 }, { itemId: "holy_relic_shard", name: "Holy Relic Shard", count: 1 }],
    result: { itemId: "avalon_warden_plate", name: "Avalon Warden Plate", count: 1, weight: 30, quality: ItemQualityTier.Legendary },
    xpReward: 250, icon: "\u{1F451}", description: "Legendary armor said to be blessed by the Lady of the Lake.",
  },

  // ===== ALCHEMY (8 recipes) =====
  {
    id: "alch_health_potion", name: "Health Potion", discipline: CraftingDiscipline.Alchemy,
    requiredSkillLevel: 1,
    materials: [{ itemId: "red_herb", name: "Red Herb", count: 2 }, { itemId: "spring_water", name: "Spring Water", count: 1 }],
    result: { itemId: "health_potion", name: "Health Potion", count: 1, weight: 0.5, quality: ItemQualityTier.Common },
    xpReward: 10, icon: "\u2764\uFE0F", description: "Restores a moderate amount of health.",
  },
  {
    id: "alch_mana_potion", name: "Mana Elixir", discipline: CraftingDiscipline.Alchemy,
    requiredSkillLevel: 5,
    materials: [{ itemId: "blue_mushroom", name: "Blue Mushroom", count: 2 }, { itemId: "spring_water", name: "Spring Water", count: 1 }],
    result: { itemId: "mana_elixir", name: "Mana Elixir", count: 1, weight: 0.5, quality: ItemQualityTier.Common },
    xpReward: 12, icon: "\u{1F535}", description: "Replenishes magical energy.",
  },
  {
    id: "alch_stamina_draught", name: "Stamina Draught", discipline: CraftingDiscipline.Alchemy,
    requiredSkillLevel: 5,
    materials: [{ itemId: "green_herb", name: "Green Herb", count: 2 }, { itemId: "spring_water", name: "Spring Water", count: 1 }],
    result: { itemId: "stamina_draught", name: "Stamina Draught", count: 1, weight: 0.5, quality: ItemQualityTier.Common },
    xpReward: 12, icon: "\u{1F7E2}", description: "Quickly restores stamina.",
  },
  {
    id: "alch_poison_vial", name: "Serpent Venom", discipline: CraftingDiscipline.Alchemy,
    requiredSkillLevel: 10,
    materials: [{ itemId: "nightshade", name: "Nightshade", count: 2 }, { itemId: "spider_venom", name: "Spider Venom", count: 1 }],
    result: { itemId: "serpent_venom", name: "Serpent Venom", count: 1, weight: 0.3, quality: ItemQualityTier.Uncommon },
    xpReward: 20, icon: "\u2620\uFE0F", description: "A lethal poison that can be applied to weapons.",
  },
  {
    id: "alch_fortify_strength", name: "Draught of the Bear", discipline: CraftingDiscipline.Alchemy,
    requiredSkillLevel: 15,
    materials: [{ itemId: "red_herb", name: "Red Herb", count: 1 }, { itemId: "bear_claw", name: "Bear Claw", count: 1 }, { itemId: "spring_water", name: "Spring Water", count: 1 }],
    result: { itemId: "draught_bear", name: "Draught of the Bear", count: 1, weight: 0.5, quality: ItemQualityTier.Uncommon },
    xpReward: 30, icon: "\u{1F43B}", description: "Temporarily increases strength by 5.",
  },
  {
    id: "alch_invisibility", name: "Fae Vanishing Tonic", discipline: CraftingDiscipline.Alchemy,
    requiredSkillLevel: 25,
    materials: [{ itemId: "fae_dust", name: "Fae Dust", count: 2 }, { itemId: "nightshade", name: "Nightshade", count: 1 }, { itemId: "spring_water", name: "Spring Water", count: 1 }],
    result: { itemId: "fae_vanishing_tonic", name: "Fae Vanishing Tonic", count: 1, weight: 0.3, quality: ItemQualityTier.Rare },
    xpReward: 50, icon: "\u{1F47B}", description: "Renders the drinker invisible for a short time.",
  },
  {
    id: "alch_greater_health", name: "Greater Health Potion", discipline: CraftingDiscipline.Alchemy,
    requiredSkillLevel: 20,
    materials: [{ itemId: "red_herb", name: "Red Herb", count: 3 }, { itemId: "moonstone", name: "Moonstone", count: 1 }, { itemId: "spring_water", name: "Spring Water", count: 2 }],
    result: { itemId: "greater_health_potion", name: "Greater Health Potion", count: 1, weight: 0.5, quality: ItemQualityTier.Rare },
    xpReward: 40, icon: "\u2764\uFE0F", description: "Fully restores health. A masterwork of the apothecary.",
  },
  {
    id: "alch_grail_elixir", name: "Grail-blessed Elixir", discipline: CraftingDiscipline.Alchemy,
    requiredSkillLevel: 50,
    materials: [{ itemId: "holy_relic_shard", name: "Holy Relic Shard", count: 1 }, { itemId: "spring_water", name: "Spring Water", count: 3 }, { itemId: "moonstone", name: "Moonstone", count: 2 }, { itemId: "fae_dust", name: "Fae Dust", count: 2 }],
    result: { itemId: "grail_elixir", name: "Grail-blessed Elixir", count: 1, weight: 0.5, quality: ItemQualityTier.Legendary },
    xpReward: 200, icon: "\u{1F3C6}", description: "A miraculous elixir that fully restores all attributes and cures all ailments.",
  },

  // ===== ENCHANTING (6 recipes) =====
  {
    id: "ench_fire_rune", name: "Rune of Flame", discipline: CraftingDiscipline.Enchanting,
    requiredSkillLevel: 5,
    materials: [{ itemId: "soul_gem_petty", name: "Petty Soul Gem", count: 1 }, { itemId: "fire_salts", name: "Fire Salts", count: 1 }],
    result: { itemId: "fire_rune", name: "Rune of Flame", count: 1, weight: 0.2, quality: ItemQualityTier.Common },
    xpReward: 15, icon: "\u{1F525}", description: "Imbues a weapon with fire damage when applied.",
  },
  {
    id: "ench_frost_rune", name: "Rune of Frost", discipline: CraftingDiscipline.Enchanting,
    requiredSkillLevel: 8,
    materials: [{ itemId: "soul_gem_petty", name: "Petty Soul Gem", count: 1 }, { itemId: "frost_salts", name: "Frost Salts", count: 1 }],
    result: { itemId: "frost_rune", name: "Rune of Frost", count: 1, weight: 0.2, quality: ItemQualityTier.Common },
    xpReward: 15, icon: "\u2744\uFE0F", description: "Imbues a weapon with frost damage when applied.",
  },
  {
    id: "ench_ward_amulet", name: "Ward of Protection", discipline: CraftingDiscipline.Enchanting,
    requiredSkillLevel: 15,
    materials: [{ itemId: "soul_gem_lesser", name: "Lesser Soul Gem", count: 1 }, { itemId: "moonstone", name: "Moonstone", count: 1 }, { itemId: "silver_chain", name: "Silver Chain", count: 1 }],
    result: { itemId: "ward_amulet", name: "Ward of Protection", count: 1, weight: 0.3, quality: ItemQualityTier.Uncommon },
    xpReward: 35, icon: "\u{1F4FF}", description: "An amulet that absorbs a portion of incoming damage.",
  },
  {
    id: "ench_ring_haste", name: "Ring of Haste", discipline: CraftingDiscipline.Enchanting,
    requiredSkillLevel: 22,
    materials: [{ itemId: "soul_gem_lesser", name: "Lesser Soul Gem", count: 2 }, { itemId: "fae_dust", name: "Fae Dust", count: 1 }, { itemId: "silver_chain", name: "Silver Chain", count: 1 }],
    result: { itemId: "ring_haste", name: "Ring of Haste", count: 1, weight: 0.1, quality: ItemQualityTier.Rare },
    xpReward: 50, icon: "\u{1F48D}", description: "Increases movement and attack speed.",
  },
  {
    id: "ench_holy_blade", name: "Holy Weapon Enchant", discipline: CraftingDiscipline.Enchanting,
    requiredSkillLevel: 35,
    materials: [{ itemId: "soul_gem_grand", name: "Grand Soul Gem", count: 1 }, { itemId: "holy_relic_shard", name: "Holy Relic Shard", count: 1 }, { itemId: "moonstone", name: "Moonstone", count: 2 }],
    result: { itemId: "holy_enchant_scroll", name: "Holy Weapon Enchant", count: 1, weight: 0.1, quality: ItemQualityTier.Epic },
    xpReward: 80, icon: "\u2728", description: "Applies holy damage to a weapon. Devastating against undead.",
  },
  {
    id: "ench_soul_prison", name: "Soul Prison Gem", discipline: CraftingDiscipline.Enchanting,
    requiredSkillLevel: 50,
    materials: [{ itemId: "soul_gem_grand", name: "Grand Soul Gem", count: 2 }, { itemId: "dragon_scale", name: "Dragon Scale", count: 1 }, { itemId: "nightshade", name: "Nightshade", count: 2 }],
    result: { itemId: "soul_prison_gem", name: "Soul Prison Gem", count: 1, weight: 0.5, quality: ItemQualityTier.Legendary },
    xpReward: 180, icon: "\u{1F48E}", description: "Traps enemy souls on defeat, powering future enchantments.",
  },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Map discipline to the skill key used in PlayerState.skillEntries */
function disciplineToSkillKey(d: CraftingDiscipline): string {
  return d.toLowerCase(); // "Smithing" -> "smithing", etc.
}

/** Get current skill level for a crafting discipline */
export function getCraftingSkillLevel(player: PlayerState, discipline: CraftingDiscipline): number {
  const key = disciplineToSkillKey(discipline);
  return player.skillEntries[key]?.level ?? 1;
}

/** Get recipes for the current tab */
export function getRecipesForTab(tab: CraftingDiscipline): GameCraftingRecipe[] {
  return CRAFTING_RECIPES.filter(r => r.discipline === tab);
}

/** Get item count from player inventory */
function getItemCount(player: PlayerState, itemId: string): number {
  const it = player.inventory.items.find(i => i.defId === itemId);
  return it ? it.quantity : 0;
}

/** Check if player can craft a recipe */
export function canCraftRecipe(player: PlayerState, recipe: GameCraftingRecipe): { ok: boolean; reason: string } {
  const skillLvl = getCraftingSkillLevel(player, recipe.discipline);
  if (skillLvl < recipe.requiredSkillLevel) {
    return { ok: false, reason: `Requires ${recipe.discipline} level ${recipe.requiredSkillLevel} (yours: ${skillLvl})` };
  }
  for (const mat of recipe.materials) {
    const have = getItemCount(player, mat.itemId);
    if (have < mat.count) {
      return { ok: false, reason: `Need ${mat.count}x ${mat.name} (have ${have})` };
    }
  }
  return { ok: true, reason: "" };
}

/** Execute a craft: consume materials, produce result, grant XP */
export function executeCraft(player: PlayerState, recipe: GameCraftingRecipe): { success: boolean; message: string } {
  const check = canCraftRecipe(player, recipe);
  if (!check.ok) return { success: false, message: check.reason };

  // Consume materials
  for (const mat of recipe.materials) {
    removeItem(player, mat.itemId, mat.count);
  }

  // Produce result
  addItem(player, recipe.result.itemId, recipe.result.count, recipe.result.name, recipe.result.weight, recipe.result.quality);

  // Grant crafting skill XP
  const key = disciplineToSkillKey(recipe.discipline);
  if (!player.skillEntries[key]) {
    player.skillEntries[key] = { level: 1, xp: 0 };
  }
  const skill = player.skillEntries[key];
  skill.xp += recipe.xpReward;
  // Level up: every 100 XP per level
  const xpNeeded = skill.level * 100;
  while (skill.xp >= xpNeeded && skill.level < 100) {
    skill.xp -= skill.level * 100;
    skill.level++;
  }

  return { success: true, message: `Crafted ${recipe.result.name}! +${recipe.xpReward} ${recipe.discipline} XP` };
}

// ---------------------------------------------------------------------------
// Key handling for the crafting screen
// ---------------------------------------------------------------------------
export function handleCraftingKey(
  e: KeyboardEvent,
  ui: CraftingUIState,
  player: PlayerState,
): { close: boolean; notification: string } {
  const TABS: CraftingDiscipline[] = [CraftingDiscipline.Smithing, CraftingDiscipline.Alchemy, CraftingDiscipline.Enchanting];
  const tabIdx = TABS.indexOf(ui.tab);

  if (e.code === "Escape" || e.code === "KeyK") {
    return { close: true, notification: "" };
  }

  // Tab switching: Q/E or 1/2/3
  if (e.code === "KeyQ" || e.code === "Digit1" && tabIdx > 0) {
    const newIdx = e.code === "Digit1" ? 0 : Math.max(0, tabIdx - 1);
    ui.tab = TABS[newIdx];
    ui.selectedRecipe = 0;
    ui.scrollOffset = 0;
  }
  if (e.code === "KeyE" || e.code === "Digit2" || e.code === "Digit3") {
    const newIdx = e.code === "Digit2" ? 1 : e.code === "Digit3" ? 2 : Math.min(TABS.length - 1, tabIdx + 1);
    ui.tab = TABS[newIdx];
    ui.selectedRecipe = 0;
    ui.scrollOffset = 0;
  }

  // Navigate recipes
  const recipes = getRecipesForTab(ui.tab);
  if (e.code === "ArrowUp" || e.code === "KeyW") {
    ui.selectedRecipe = Math.max(0, ui.selectedRecipe - 1);
  }
  if (e.code === "ArrowDown" || e.code === "KeyS") {
    ui.selectedRecipe = Math.min(recipes.length - 1, ui.selectedRecipe);
  }

  // Craft
  if (e.code === "Enter" || e.code === "Space") {
    const recipe = recipes[ui.selectedRecipe];
    if (recipe) {
      const result = executeCraft(player, recipe);
      ui.craftFlash = result.success ? 1.5 : 0;
      ui.craftMessage = result.message;
      return { close: false, notification: result.message };
    }
  }

  return { close: false, notification: "" };
}

// ---------------------------------------------------------------------------
// Quality color
// ---------------------------------------------------------------------------
function qualityColor(q: ItemQualityTier): string {
  switch (q) {
    case ItemQualityTier.Common: return "#aaaaaa";
    case ItemQualityTier.Uncommon: return "#55cc55";
    case ItemQualityTier.Rare: return "#5588ff";
    case ItemQualityTier.Epic: return "#aa55dd";
    case ItemQualityTier.Legendary: return "#ff8800";
    default: return "#aaaaaa";
  }
}

// ---------------------------------------------------------------------------
// Render the crafting screen (medieval parchment aesthetic)
// ---------------------------------------------------------------------------
export function renderCraftingScreen(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  ui: CraftingUIState,
  player: PlayerState,
): void {
  // Dim background
  ctx.fillStyle = "rgba(0,0,0,0.82)";
  ctx.fillRect(0, 0, W, H);

  // Main panel (parchment)
  const panelW = Math.min(860, W - 40);
  const panelH = Math.min(620, H - 40);
  const panelX = (W - panelW) / 2;
  const panelY = (H - panelH) / 2;

  // Parchment background with gradient
  const parchGrad = ctx.createLinearGradient(panelX, panelY, panelX, panelY + panelH);
  parchGrad.addColorStop(0, "rgba(35, 28, 18, 0.96)");
  parchGrad.addColorStop(0.3, "rgba(30, 24, 15, 0.97)");
  parchGrad.addColorStop(1, "rgba(22, 18, 10, 0.98)");
  ctx.fillStyle = parchGrad;
  ctx.fillRect(panelX, panelY, panelW, panelH);

  // Double border (ornate)
  ctx.strokeStyle = "#c9a84c";
  ctx.lineWidth = 2;
  ctx.strokeRect(panelX, panelY, panelW, panelH);
  ctx.strokeStyle = "rgba(201, 168, 76, 0.3)";
  ctx.lineWidth = 1;
  ctx.strokeRect(panelX + 5, panelY + 5, panelW - 10, panelH - 10);

  // Corner ornaments
  const ornSize = 12;
  ctx.strokeStyle = "#c9a84c";
  ctx.lineWidth = 2;
  for (const [cx, cy, sx, sy] of [
    [panelX + 8, panelY + 8, 1, 1],
    [panelX + panelW - 8, panelY + 8, -1, 1],
    [panelX + 8, panelY + panelH - 8, 1, -1],
    [panelX + panelW - 8, panelY + panelH - 8, -1, -1],
  ] as [number, number, number, number][]) {
    ctx.beginPath();
    ctx.moveTo(cx, cy + sy * ornSize);
    ctx.lineTo(cx, cy);
    ctx.lineTo(cx + sx * ornSize, cy);
    ctx.stroke();
  }

  // Title
  ctx.fillStyle = "#c9a84c";
  ctx.font = "bold 30px 'Georgia', serif";
  ctx.textAlign = "center";
  ctx.fillText("CRAFTING", W / 2, panelY + 38);

  // Decorative divider under title
  ctx.strokeStyle = "rgba(201, 168, 76, 0.5)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(panelX + 40, panelY + 50);
  ctx.lineTo(panelX + panelW - 40, panelY + 50);
  ctx.stroke();
  // Ornamental diamond at center of divider
  ctx.fillStyle = "#c9a84c";
  ctx.save();
  ctx.translate(W / 2, panelY + 50);
  ctx.rotate(Math.PI / 4);
  ctx.fillRect(-4, -4, 8, 8);
  ctx.restore();

  // ---- TABS ----
  const TABS: CraftingDiscipline[] = [CraftingDiscipline.Smithing, CraftingDiscipline.Alchemy, CraftingDiscipline.Enchanting];
  const TAB_ICONS: Record<CraftingDiscipline, string> = {
    [CraftingDiscipline.Smithing]: "\u{1F528}",
    [CraftingDiscipline.Alchemy]: "\u{1F9EA}",
    [CraftingDiscipline.Enchanting]: "\u{1FA84}",
  };
  const tabW = (panelW - 40) / 3;
  const tabY = panelY + 60;
  const tabH = 32;

  for (let i = 0; i < TABS.length; i++) {
    const tx = panelX + 20 + i * tabW;
    const isActive = ui.tab === TABS[i];
    const skillLvl = getCraftingSkillLevel(player, TABS[i]);

    // Tab background
    ctx.fillStyle = isActive ? "rgba(201, 168, 76, 0.2)" : "rgba(0, 0, 0, 0.25)";
    ctx.fillRect(tx, tabY, tabW, tabH);
    ctx.strokeStyle = isActive ? "#c9a84c" : "rgba(201, 168, 76, 0.15)";
    ctx.lineWidth = isActive ? 2 : 1;
    ctx.strokeRect(tx, tabY, tabW, tabH);

    // Active tab highlight bar at top
    if (isActive) {
      ctx.fillStyle = "#c9a84c";
      ctx.fillRect(tx + 2, tabY, tabW - 4, 2);
    }

    // Tab label
    ctx.fillStyle = isActive ? "#c9a84c" : "#777";
    ctx.font = isActive ? "bold 14px 'Georgia', serif" : "13px 'Georgia', serif";
    ctx.textAlign = "center";
    ctx.fillText(`${TAB_ICONS[TABS[i]]} ${TABS[i]}  (Lv ${skillLvl})`, tx + tabW / 2, tabY + 22);
  }

  // Key hint for tabs
  ctx.fillStyle = "#555";
  ctx.font = "10px monospace";
  ctx.textAlign = "center";
  ctx.fillText("[1/2/3] or [Q/E] switch tabs", W / 2, tabY + tabH + 13);

  // ---- RECIPE LIST (left panel) ----
  const recipes = getRecipesForTab(ui.tab);
  const listX = panelX + 18;
  const listY = tabY + tabH + 22;
  const listW = panelW * 0.42;
  const listH = panelH - (listY - panelY) - 35;
  const rowH = 30;
  const maxVisible = Math.floor(listH / rowH);

  // List background
  ctx.fillStyle = "rgba(0, 0, 0, 0.2)";
  ctx.fillRect(listX, listY, listW, listH);
  ctx.strokeStyle = "rgba(201, 168, 76, 0.2)";
  ctx.lineWidth = 1;
  ctx.strokeRect(listX, listY, listW, listH);

  // List header
  ctx.fillStyle = "#c9a84c";
  ctx.font = "bold 13px 'Georgia', serif";
  ctx.textAlign = "left";
  ctx.fillText("RECIPES", listX + 8, listY + 16);
  ctx.strokeStyle = "rgba(201, 168, 76, 0.3)";
  ctx.beginPath();
  ctx.moveTo(listX + 4, listY + 22);
  ctx.lineTo(listX + listW - 4, listY + 22);
  ctx.stroke();

  // Scroll offset
  if (ui.selectedRecipe >= ui.scrollOffset + maxVisible - 1) {
    ui.scrollOffset = Math.max(0, ui.selectedRecipe - maxVisible + 2);
  }
  if (ui.selectedRecipe < ui.scrollOffset) {
    ui.scrollOffset = ui.selectedRecipe;
  }

  // Clip list area
  ctx.save();
  ctx.beginPath();
  ctx.rect(listX, listY + 24, listW, listH - 24);
  ctx.clip();

  for (let i = ui.scrollOffset; i < Math.min(recipes.length, ui.scrollOffset + maxVisible); i++) {
    const r = recipes[i];
    const ry = listY + 26 + (i - ui.scrollOffset) * rowH;
    const sel = i === ui.selectedRecipe;
    const craft = canCraftRecipe(player, r);
    const skillOk = getCraftingSkillLevel(player, r.discipline) >= r.requiredSkillLevel;

    // Row background
    if (sel) {
      ctx.fillStyle = "rgba(201, 168, 76, 0.15)";
      ctx.fillRect(listX + 2, ry, listW - 4, rowH - 2);
      // Selection indicator
      ctx.fillStyle = "#c9a84c";
      ctx.fillRect(listX + 2, ry, 3, rowH - 2);
    }

    // Recipe name
    ctx.font = sel ? "bold 13px 'Palatino Linotype', serif" : "13px 'Palatino Linotype', serif";
    if (!skillOk) {
      ctx.fillStyle = "#553333";
    } else if (craft.ok) {
      ctx.fillStyle = sel ? "#c9a84c" : "#ccbb99";
    } else {
      ctx.fillStyle = sel ? "#aa8855" : "#776655";
    }
    ctx.textAlign = "left";
    ctx.fillText(`${r.icon} ${r.name}`, listX + 10, ry + 14);

    // Quality badge
    ctx.fillStyle = qualityColor(r.result.quality);
    ctx.font = "9px monospace";
    ctx.fillText(`[${r.result.quality}]`, listX + 10, ry + 25);

    // Skill requirement
    if (!skillOk) {
      ctx.fillStyle = "#883333";
      ctx.font = "9px monospace";
      ctx.textAlign = "right";
      ctx.fillText(`Lv ${r.requiredSkillLevel}`, listX + listW - 8, ry + 14);
    } else if (craft.ok) {
      ctx.fillStyle = "#4a7a4a";
      ctx.font = "9px monospace";
      ctx.textAlign = "right";
      ctx.fillText("READY", listX + listW - 8, ry + 14);
    }
  }

  ctx.restore(); // Unclip

  // Scroll indicator
  if (recipes.length > maxVisible) {
    const scrollBarH = listH - 26;
    const thumbH = Math.max(20, scrollBarH * (maxVisible / recipes.length));
    const thumbY = listY + 24 + (scrollBarH - thumbH) * (ui.scrollOffset / Math.max(1, recipes.length - maxVisible));
    ctx.fillStyle = "rgba(201, 168, 76, 0.15)";
    ctx.fillRect(listX + listW - 5, listY + 24, 3, scrollBarH);
    ctx.fillStyle = "rgba(201, 168, 76, 0.4)";
    ctx.fillRect(listX + listW - 5, thumbY, 3, thumbH);
  }

  // ---- DETAIL PANEL (right side) ----
  const detX = listX + listW + 14;
  const detY = listY;
  const detW = panelW - listW - 50;
  const detH = listH;

  // Detail background
  ctx.fillStyle = "rgba(0, 0, 0, 0.15)";
  ctx.fillRect(detX, detY, detW, detH);
  ctx.strokeStyle = "rgba(201, 168, 76, 0.15)";
  ctx.lineWidth = 1;
  ctx.strokeRect(detX, detY, detW, detH);

  const selRecipe = recipes[ui.selectedRecipe];
  if (selRecipe) {
    const craft = canCraftRecipe(player, selRecipe);
    const skillLvl = getCraftingSkillLevel(player, selRecipe.discipline);
    const skillOk = skillLvl >= selRecipe.requiredSkillLevel;

    // Recipe icon (large)
    ctx.font = "36px serif";
    ctx.textAlign = "center";
    ctx.fillText(selRecipe.icon, detX + detW / 2, detY + 40);

    // Recipe name
    ctx.fillStyle = qualityColor(selRecipe.result.quality);
    ctx.font = "bold 18px 'Georgia', serif";
    ctx.fillText(selRecipe.name, detX + detW / 2, detY + 65);

    // Quality text
    ctx.fillStyle = qualityColor(selRecipe.result.quality);
    ctx.font = "12px 'Palatino Linotype', serif";
    ctx.fillText(`${selRecipe.result.quality} Quality`, detX + detW / 2, detY + 82);

    // Description
    ctx.fillStyle = "#bbaa88";
    ctx.font = "italic 12px 'Palatino Linotype', serif";
    ctx.textAlign = "center";
    // Word wrap description
    const words = selRecipe.description.split(" ");
    let line = "";
    let descY = detY + 102;
    for (const word of words) {
      const test = line + (line ? " " : "") + word;
      if (ctx.measureText(test).width > detW - 20) {
        ctx.fillText(line, detX + detW / 2, descY);
        line = word;
        descY += 16;
      } else {
        line = test;
      }
    }
    if (line) ctx.fillText(line, detX + detW / 2, descY);

    // Divider
    const divY = descY + 16;
    ctx.strokeStyle = "rgba(201, 168, 76, 0.3)";
    ctx.beginPath();
    ctx.moveTo(detX + 15, divY);
    ctx.lineTo(detX + detW - 15, divY);
    ctx.stroke();

    // Skill requirement
    ctx.textAlign = "left";
    ctx.font = "12px 'Palatino Linotype', serif";
    ctx.fillStyle = skillOk ? "#aabb88" : "#cc5555";
    ctx.fillText(`${selRecipe.discipline} Level: ${selRecipe.requiredSkillLevel} (yours: ${skillLvl})`, detX + 12, divY + 18);

    // Materials header
    ctx.fillStyle = "#c9a84c";
    ctx.font = "bold 12px 'Georgia', serif";
    ctx.fillText("REQUIRED MATERIALS:", detX + 12, divY + 40);

    // Materials list
    let matY = divY + 56;
    for (const mat of selRecipe.materials) {
      const have = getItemCount(player, mat.itemId);
      const enough = have >= mat.count;

      // Material icon dot
      ctx.fillStyle = enough ? "#4a7a4a" : "#883333";
      ctx.beginPath();
      ctx.arc(detX + 18, matY - 3, 3, 0, Math.PI * 2);
      ctx.fill();

      // Material name and count
      ctx.fillStyle = enough ? "#aabb88" : "#cc6655";
      ctx.font = "12px 'Palatino Linotype', serif";
      ctx.textAlign = "left";
      ctx.fillText(`${mat.name}`, detX + 26, matY);

      // Count
      ctx.textAlign = "right";
      ctx.fillStyle = enough ? "#88aa66" : "#cc4444";
      ctx.fillText(`${have} / ${mat.count}`, detX + detW - 12, matY);

      matY += 20;
    }

    // Result preview
    const resY = matY + 12;
    ctx.strokeStyle = "rgba(201, 168, 76, 0.3)";
    ctx.beginPath();
    ctx.moveTo(detX + 15, resY - 6);
    ctx.lineTo(detX + detW - 15, resY - 6);
    ctx.stroke();

    ctx.fillStyle = "#c9a84c";
    ctx.font = "bold 12px 'Georgia', serif";
    ctx.textAlign = "left";
    ctx.fillText("RESULT:", detX + 12, resY + 8);

    ctx.fillStyle = qualityColor(selRecipe.result.quality);
    ctx.font = "14px 'Palatino Linotype', serif";
    ctx.fillText(`${selRecipe.icon} ${selRecipe.result.name} x${selRecipe.result.count}`, detX + 12, resY + 26);

    ctx.fillStyle = "#888";
    ctx.font = "10px monospace";
    ctx.fillText(`Weight: ${selRecipe.result.weight} lb  |  XP: +${selRecipe.xpReward}`, detX + 12, resY + 42);

    // Craft button
    const btnW = detW - 24;
    const btnH = 32;
    const btnX = detX + 12;
    const btnY = detY + detH - btnH - 12;

    if (craft.ok) {
      // Craftable - golden button
      const btnGrad = ctx.createLinearGradient(btnX, btnY, btnX, btnY + btnH);
      btnGrad.addColorStop(0, "rgba(201, 168, 76, 0.3)");
      btnGrad.addColorStop(1, "rgba(160, 130, 50, 0.2)");
      ctx.fillStyle = btnGrad;
      ctx.fillRect(btnX, btnY, btnW, btnH);
      ctx.strokeStyle = "#c9a84c";
      ctx.lineWidth = 2;
      ctx.strokeRect(btnX, btnY, btnW, btnH);

      ctx.fillStyle = "#c9a84c";
      ctx.font = "bold 16px 'Georgia', serif";
      ctx.textAlign = "center";
      ctx.fillText("[Enter] CRAFT", btnX + btnW / 2, btnY + 22);
    } else {
      // Not craftable - dimmed
      ctx.fillStyle = "rgba(60, 40, 30, 0.3)";
      ctx.fillRect(btnX, btnY, btnW, btnH);
      ctx.strokeStyle = "rgba(100, 80, 60, 0.3)";
      ctx.lineWidth = 1;
      ctx.strokeRect(btnX, btnY, btnW, btnH);

      ctx.fillStyle = "#665544";
      ctx.font = "12px 'Palatino Linotype', serif";
      ctx.textAlign = "center";
      ctx.fillText(craft.reason, btnX + btnW / 2, btnY + 21);
    }
  } else {
    // No recipes available
    ctx.fillStyle = "#666";
    ctx.font = "16px 'Palatino Linotype', serif";
    ctx.textAlign = "center";
    ctx.fillText("No recipes available", detX + detW / 2, detY + detH / 2);
  }

  // ---- Craft success flash ----
  if (ui.craftFlash > 0) {
    const alpha = Math.min(1, ui.craftFlash) * 0.15;
    ctx.fillStyle = `rgba(201, 168, 76, ${alpha})`;
    ctx.fillRect(panelX, panelY, panelW, panelH);

    ctx.fillStyle = `rgba(201, 168, 76, ${Math.min(1, ui.craftFlash)})`;
    ctx.font = "bold 16px 'Georgia', serif";
    ctx.textAlign = "center";
    ctx.fillText(ui.craftMessage, W / 2, panelY + panelH - 8);
  }

  // ---- Footer ----
  ctx.fillStyle = "#555";
  ctx.font = "11px monospace";
  ctx.textAlign = "center";
  ctx.fillText("W/S or Arrows: navigate  |  Enter: craft  |  K or Esc: close", W / 2, panelY + panelH + 16);
}

// ---------------------------------------------------------------------------
// Update flash timer (call each frame with dt)
// ---------------------------------------------------------------------------
export function updateCraftingUI(ui: CraftingUIState, dt: number): void {
  if (ui.craftFlash > 0) {
    ui.craftFlash -= dt;
    if (ui.craftFlash < 0) ui.craftFlash = 0;
  }
}
