// ────────────────────────────────────────────────────────────────────────────
// DiabloScreens  --  extracted large _show* UI methods from DiabloGame.ts
// ────────────────────────────────────────────────────────────────────────────

import davinciBg from './davinci.jpg';
import { exportSaveToFile, importSaveFromFile } from './DiabloSaveLoad';

/** Shared fullscreen background style with davinci.jpg overlay for all menu/screen panels. */
const SCREEN_BG = `background:rgba(0,0,0,0.88);background-image:url('${davinciBg}');background-size:cover;background-position:center;background-blend-mode:overlay;`;

import {
  DiabloState, DiabloClass, DiabloMapId, DiabloPhase, ItemRarity,
  DiabloDifficulty, SkillId, TimeOfDay, DiabloItem, DiabloEquipment,
  DiabloLoot, TalentEffectType, Weather, MapModifier,
  DiabloVendor, VendorType, DiabloPotion, PotionType, DiabloPortalNpc, MAX_POTION_STACK, EnemyType,
  CraftType, CraftingStationType, MaterialType, AdvancedCraftingRecipe,
  DiabloQuest, QuestType,
  createDefaultPlayer,
} from "./DiabloTypes";
import {
  SKILL_DEFS, DIFFICULTY_CONFIGS, MAP_CONFIGS, ITEM_DATABASE, ENEMY_DEFS,
  SET_BONUSES, LANTERN_CONFIGS, UNLOCKABLE_SKILLS, MAP_SPECIFIC_ITEMS,
  RARITY_NAMES, VENDOR_DEFS, POTION_DATABASE,
  TALENT_TREES, TALENT_BRANCH_NAMES,
  CRAFTING_RECIPES, SALVAGE_MATERIAL_YIELDS,
  ADVANCED_CRAFTING_RECIPES, CRAFTING_MATERIALS,
  QUEST_DATABASE, SKILL_BRANCHES, LEGENDARY_EFFECTS,
  MAP_COMPLETION_REWARDS,
} from "./DiabloConfig";
import {
  RARITY_CSS, RARITY_GLOW, RARITY_BORDER, RARITY_BG, RARITY_BADGE,
  RARITY_TIER, rarityNeedsAnim, resolveEquipKey,
  VENDOR_DIALOGUE, DAY_BOSS_MAP, NIGHT_BOSS_MAP,
  PORTAL_NPC_RUMORS, PORTAL_NPC_GENERIC_RUMORS,
} from "./DiabloConstants";

// ────────────────────────────────────────────────────────────────────────────
//  ScreenContext  --  every dependency the screen helpers need from DiabloGame
// ────────────────────────────────────────────────────────────────────────────

export interface ScreenContext {
  // DOM
  menuEl: HTMLDivElement;
  state: DiabloState;

  // Game methods exposed as callbacks
  showMapSelect(): void;
  showInventory(): void;
  showStash(): void;
  showControls(): void;
  showCharacterOverview(): void;
  showPrestigePanel(): void;
  showSkillTreeScreen(): void;
  showPetPanel(): void;
  showItemTooltip(ev: MouseEvent, item: DiabloItem | null): void;
  hideItemTooltip(): void;
  showSaveRecoveryPrompt(): void;
  closeOverlay(): void;
  backToMenu(): void;

  loadGame(): void;
  loadPlayerOnly(): void;
  hasSave(): boolean;
  saveGame(): void;
  startMap(mapId: DiabloMapId): void;
  startGreaterRift(level: number): void;

  sortInventory(sortBy: "rarity" | "type" | "level"): void;
  toggleItemLock(slotIndex: number): void;
  checkRunewords(): void;
  recalculatePlayerStats(): void;

  addFloatingText(x: number, y: number, z: number, text: string, color: string): void;
  genId(): string;

  getEffectiveStats(): {
    strength: number; dexterity: number; intelligence: number; vitality: number;
    armor: number; critChance: number; critDamage: number;
    moveSpeed: number; attackSpeed: number;
  };
  getWeaponDamage(): number;
  getTalentBonuses(): Partial<Record<TalentEffectType, number>>;

  renderer: { setPlayerLantern(on: boolean, intensity?: number, distance?: number, color?: number): void };

  // Mutable game flags
  setStatsDirty(): void;
  setEquipDirty(): void;
  setPhaseBeforeOverlay(phase: DiabloPhase): void;
  showQuestTracker(): void;

  // New fields for extracted screens
  sortStash(sortBy: "rarity" | "type" | "level"): void;
  countEquippedSetPieces(setName: string): number;
  getTalentPointsInBranch(branch: number): number;
  setTalentsDirty(): void;
  pickRandomItemOfRarity(rarity: ItemRarity): DiabloItem | null;
  canAffordRecipe(recipe: AdvancedCraftingRecipe): boolean;
  payRecipeCost(recipe: AdvancedCraftingRecipe): void;
  craftingUIOpen: boolean;
  setCraftingUIOpen(v: boolean): void;
  chestsOpened: number;
  goldEarnedTotal: number;
  setGoldEarnedTotal(v: number): void;
  vendorDialogueIdx: Record<string, number>;
}

// ════════════════════════════════════════════════════════════════════════════
//  1. showClassSelect
// ════════════════════════════════════════════════════════════════════════════

export function showClassSelect(ctx: ScreenContext): void {
  const classes: {
    cls: DiabloClass;
    icon: string;
    name: string;
    desc: string;
    str: number;
    dex: number;
    int: number;
    vit: number;
  }[] = [
    {
      cls: DiabloClass.WARRIOR,
      icon: "\u2694\uFE0F",
      name: "WARRIOR",
      desc: "A stalwart champion clad in heavy armor. Masters devastating melee attacks and can withstand tremendous punishment.",
      str: 25, dex: 8, int: 5, vit: 22,
    },
    {
      cls: DiabloClass.MAGE,
      icon: "\uD83D\uDD2E",
      name: "MAGE",
      desc: "An arcane scholar wielding elemental forces. Commands fire, ice, and lightning to devastate foes from afar.",
      str: 5, dex: 8, int: 28, vit: 14,
    },
    {
      cls: DiabloClass.RANGER,
      icon: "\uD83C\uDFF9",
      name: "RANGER",
      desc: "A swift hunter of deadly precision. Rains arrows upon enemies and uses cunning traps to control the battlefield.",
      str: 8, dex: 26, int: 7, vit: 16,
    },
    {
      cls: DiabloClass.PALADIN,
      icon: "\u{1F6E1}\uFE0F",
      name: "PALADIN",
      desc: "A holy knight channeling divine light. Wields sacred powers to smite evil and shield the faithful.",
      str: 20, dex: 8, int: 15, vit: 24,
    },
    {
      cls: DiabloClass.NECROMANCER,
      icon: "\uD83D\uDC80",
      name: "NECROMANCER",
      desc: "A master of death and decay. Commands undead armies and wields dark curses to drain the life from foes.",
      str: 6, dex: 10, int: 25, vit: 16,
    },
    {
      cls: DiabloClass.ASSASSIN,
      icon: "\uD83D\uDDE1\uFE0F",
      name: "ASSASSIN",
      desc: "A lethal shadow operative striking from the darkness. Dual-wields poisoned blades with blinding speed.",
      str: 14, dex: 28, int: 6, vit: 15,
    },
  ];

  const classColors: Record<string, string> = {
    WARRIOR: "#e85030", MAGE: "#5080ff", RANGER: "#40cc40",
    PALADIN: "#ffd740", NECROMANCER: "#b050e0", ASSASSIN: "#cc40cc",
  };
  // Class unlock levels: Warrior/Mage/Ranger = 0, Paladin = 6, Necro = 12, Assassin = 18
  const classUnlockLevel: Record<string, number> = {
    WARRIOR: 0, MAGE: 0, RANGER: 0, PALADIN: 6, NECROMANCER: 12, ASSASSIN: 18,
  };
  const playerLevel = ctx.state.player.level;
  const cheats = ctx.state.cheatsEnabled;
  const maxStat = 100;
  let cardsHtml = "";
  let classCardIndex = 0;
  for (const c of classes) {
    const reqLevel = classUnlockLevel[c.name] || 0;
    const isUnlocked = cheats || playerLevel >= reqLevel;
    const cc = classColors[c.name] || "#c8a84e";
    const statBar = (label: string, val: number, color: string) => {
      const pct = Math.round((val / maxStat) * 100);
      return `<div style="display:flex;align-items:center;gap:6px;margin-bottom:3px;">
        <span style="color:${color};font-size:11px;width:28px;text-align:right;font-weight:bold;">${label}</span>
        <div style="flex:1;height:8px;background:rgba(0,0,0,0.5);border-radius:4px;border:1px solid #3a3020;overflow:hidden;">
          <div style="width:${pct}%;height:100%;background:${color};border-radius:4px;box-shadow:0 0 4px ${color};"></div>
        </div>
        <span style="color:#ddd;font-size:11px;width:20px;">${val}</span>
      </div>`;
    };
    cardsHtml += `
      <div class="diablo-class-card" data-class="${c.cls}" data-unlocked="${isUnlocked}" style="
        width:220px;background:rgba(20,15,10,0.95);
        border:3px solid ${isUnlocked ? '#5a4a2a' : '#333'};border-top-color:${isUnlocked ? '#8a7a4a' : '#444'};border-left-color:${isUnlocked ? '#7a6a3a' : '#3a3a3a'};
        border-right-color:${isUnlocked ? '#3a2a1a' : '#222'};border-bottom-color:${isUnlocked ? '#2a1a0a' : '#111'};
        border-radius:12px;padding:28px 24px;cursor:${isUnlocked ? 'pointer' : 'not-allowed'};text-align:center;
        transition:all 0.3s ease;position:relative;
        backdrop-filter:blur(4px);
        transform:translateY(0) scale(1);
        animation:cs-card-enter 0.4s ease-out backwards;
        animation-delay:${classCardIndex * 0.1}s;
        background-image:repeating-linear-gradient(45deg,transparent,transparent 8px,rgba(200,168,78,0.015) 8px,rgba(200,168,78,0.015) 16px);
        ${isUnlocked ? '' : 'opacity:0.5;filter:grayscale(0.7);'}
      ">
        ${isUnlocked ? '' : `<div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;z-index:10;border-radius:10px;background:rgba(0,0,0,0.4);"><div style="color:#888;font-size:14px;font-family:'Georgia',serif;">&#128274; Unlocks at Level ${reqLevel}</div></div>`}
        <!-- Corner rivets -->
        <div style="position:absolute;top:6px;left:6px;width:8px;height:8px;border-radius:50%;background:radial-gradient(circle at 35% 35%,#ffd740,#8a6a20);box-shadow:0 1px 2px rgba(0,0,0,0.6);"></div>
        <div style="position:absolute;top:6px;right:6px;width:8px;height:8px;border-radius:50%;background:radial-gradient(circle at 35% 35%,#ffd740,#8a6a20);box-shadow:0 1px 2px rgba(0,0,0,0.6);"></div>
        <div style="position:absolute;bottom:6px;left:6px;width:8px;height:8px;border-radius:50%;background:radial-gradient(circle at 35% 35%,#ffd740,#8a6a20);box-shadow:0 1px 2px rgba(0,0,0,0.6);"></div>
        <div style="position:absolute;bottom:6px;right:6px;width:8px;height:8px;border-radius:50%;background:radial-gradient(circle at 35% 35%,#ffd740,#8a6a20);box-shadow:0 1px 2px rgba(0,0,0,0.6);"></div>
        <!-- Glowing rune circle behind icon -->
        <div style="position:relative;display:inline-block;margin-bottom:12px;">
          <div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:90px;height:90px;border-radius:50%;background:radial-gradient(circle,${cc}30 0%,${cc}10 40%,transparent 70%);border:1px solid ${cc}30;box-shadow:0 0 20px ${cc}20;"></div>
          <div style="font-size:64px;position:relative;z-index:1;filter:drop-shadow(0 0 8px ${cc}60);">${c.icon}</div>
        </div>
        <div style="font-size:24px;color:#c8a84e;font-weight:bold;letter-spacing:2px;margin-bottom:12px;text-shadow:0 0 10px rgba(200,168,78,0.3);">${c.name}</div>
        <p style="color:#aaa;font-size:13px;line-height:1.5;margin-bottom:16px;">${c.desc}</p>
        <div style="padding:0 4px;">
          ${statBar("STR", c.str, "#e88")}
          ${statBar("DEX", c.dex, "#8e8")}
          ${statBar("INT", c.int, "#88e")}
          ${statBar("VIT", c.vit, "#ee8")}
        </div>
      </div>`;
    classCardIndex++;
  }

  // Build difficulty selector (unlock every 4 levels)
  const difficulties = [
    DiabloDifficulty.DAGGER,
    DiabloDifficulty.CLEAVER,
    DiabloDifficulty.LONGSWORD,
    DiabloDifficulty.BASTARD_SWORD,
    DiabloDifficulty.CLAYMORE,
    DiabloDifficulty.FLAMBERGE,
  ];
  const diffUnlockLevels = [0, 4, 8, 12, 16, 20];
  let diffHtml = "";
  for (let di = 0; di < difficulties.length; di++) {
    const diff = difficulties[di];
    const cfg = DIFFICULTY_CONFIGS[diff];
    const isActive = ctx.state.difficulty === diff;
    const diffUnlocked = cheats || playerLevel >= diffUnlockLevels[di];
    diffHtml += `<button class="diff-btn" data-diff="${diff}" ${diffUnlocked ? '' : 'disabled'} style="
      cursor:${diffUnlocked ? 'pointer' : 'not-allowed'};padding:8px 16px;font-size:14px;border-radius:6px;transition:0.2s;
      background:${isActive ? "rgba(60,50,20,0.9)" : "rgba(30,20,10,0.7)"};
      border:2px solid ${isActive ? cfg.color : diffUnlocked ? "#3a3a2a" : "#222"};
      color:${isActive ? cfg.color : diffUnlocked ? "#666" : "#444"};
      font-family:'Georgia',serif;font-weight:bold;
      ${diffUnlocked ? '' : 'opacity:0.4;'}
    ">${cfg.icon} ${cfg.label}<br><span style="font-size:11px;font-weight:normal;opacity:0.7;">${diffUnlocked ? cfg.subtitle : 'Lv ' + diffUnlockLevels[di]}</span></button>`;
  }

  const hasSave = ctx.hasSave();

  // Parse saved character data for display
  const classIcons: Record<string, string> = {
    WARRIOR: "\u2694\uFE0F", MAGE: "\uD83D\uDD2E", RANGER: "\uD83C\uDFF9",
    PALADIN: "\u{1F6E1}\uFE0F", NECROMANCER: "\uD83D\uDC80", ASSASSIN: "\uD83D\uDDE1\uFE0F",
  };
  const classNames: Record<string, string> = {
    WARRIOR: "Warrior", MAGE: "Mage", RANGER: "Ranger",
    PALADIN: "Paladin", NECROMANCER: "Necromancer", ASSASSIN: "Assassin",
  };
  let savedCharHtml = "";
  if (hasSave) {
    const raw = localStorage.getItem("diablo_save");
    if (raw) {
      let save: any;
      try {
        save = JSON.parse(raw);
      } catch (e) {
        console.error('Failed to parse save data:', e);
        ctx.showSaveRecoveryPrompt();
        return;
      }
      const sp = save.player;
      const sc = {
        cls: sp.class as string,
        level: sp.level || 1,
        paragon: sp.paragonLevel || 0,
        gold: (save.persistentGold || 0) + (sp.gold || 0),
        killCount: save.totalKills || save.killCount || 0,
        goldEarned: save.goldEarnedTotal || 0,
        chestsOpened: save.chestsOpened || 0,
        mapsCleared: Object.keys(save.completedMaps || {}).length,
        str: sp.strength || 0,
        dex: sp.dexterity || 0,
        int: sp.intelligence || 0,
        vit: sp.vitality || 0,
        maxHp: sp.maxHp || 0,
        maxMana: sp.maxMana || 0,
        armor: sp.armor || 0,
        xp: sp.xp || 0,
        xpToNext: sp.xpToNext || 100,
        difficulty: save.difficulty || 'DAGGER',
        currentMap: save.currentMap || '',
      };
      const icon = classIcons[sc.cls] || "\u2694\uFE0F";
      const cc = classColors[sc.cls] || "#c8a84e";
      const displayName = classNames[sc.cls] || sc.cls;
      const levelStr = sc.paragon > 0
        ? `<span style="color:#ffd740;font-size:13px;">Lv.${sc.level}</span> <span style="color:#ff8800;font-size:11px;">(P${sc.paragon})</span>`
        : `<span style="color:#ffd740;font-size:13px;">Level ${sc.level}</span>`;
      const xpPct = Math.min(100, Math.round((sc.xp / Math.max(1, sc.xpToNext)) * 100));

      // Stat bar helper matching the class card style
      const statBarSm = (label: string, val: number, max: number, color: string) => {
        const pct = Math.min(100, Math.round((val / max) * 100));
        return `<div style="display:flex;align-items:center;gap:4px;margin-bottom:2px;">
          <span style="color:${color};font-size:10px;width:24px;text-align:right;font-weight:bold;">${label}</span>
          <div style="flex:1;height:6px;background:rgba(0,0,0,0.5);border-radius:3px;border:1px solid #3a3020;overflow:hidden;">
            <div style="width:${pct}%;height:100%;background:linear-gradient(90deg,${color},${color}aa);border-radius:3px;box-shadow:0 0 3px ${color}80;"></div>
          </div>
          <span style="color:#ccc;font-size:10px;width:22px;">${val}</span>
        </div>`;
      };

      // Count equipped items
      const eq = sp.equipment || {};
      const equippedCount = [eq.helmet, eq.body, eq.gauntlets, eq.legs, eq.feet, eq.accessory1, eq.accessory2, eq.weapon, eq.lantern].filter(Boolean).length;

      // Difficulty display
      const diffCfg = DIFFICULTY_CONFIGS[sc.difficulty as DiabloDifficulty];
      const diffLabel = diffCfg ? `${diffCfg.icon} ${diffCfg.label}` : sc.difficulty;

      // Stat max for bar scaling (use reasonable cap based on level)
      const statMax = Math.max(60, sc.str, sc.dex, sc.int, sc.vit);

      savedCharHtml = `
        <!-- Divider -->
        <div style="display:flex;align-items:center;gap:12px;margin:24px 0 14px 0;">
          <div style="width:60px;height:1px;background:linear-gradient(to right,transparent,#5a4a2a);"></div>
          <span style="color:#5a4a2a;font-size:10px;">&#9670;</span>
          <div style="width:30px;height:1px;background:#5a4a2a;"></div>
          <span style="color:#c8a84e;font-size:12px;letter-spacing:4px;font-family:'Georgia',serif;text-shadow:0 0 8px rgba(200,168,78,0.3);">CONTINUE YOUR JOURNEY</span>
          <div style="width:30px;height:1px;background:#5a4a2a;"></div>
          <span style="color:#5a4a2a;font-size:10px;">&#9670;</span>
          <div style="width:60px;height:1px;background:linear-gradient(to left,transparent,#5a4a2a);"></div>
        </div>
        <div id="diablo-saved-char" style="
          display:flex;align-items:stretch;gap:0;
          background:rgba(20,15,10,0.95);
          border:3px solid #5a4a2a;border-top-color:#8a7a4a;border-left-color:#7a6a3a;
          border-right-color:#3a2a1a;border-bottom-color:#2a1a0a;
          border-radius:12px;cursor:pointer;
          transition:border-color 0.3s, box-shadow 0.3s;
          max-width:820px;width:100%;position:relative;overflow:hidden;
          background-image:repeating-linear-gradient(45deg,transparent,transparent 8px,rgba(200,168,78,0.015) 8px,rgba(200,168,78,0.015) 16px);
        ">
          <!-- Corner rivets -->
          <div style="position:absolute;top:6px;left:6px;width:8px;height:8px;border-radius:50%;background:radial-gradient(circle at 35% 35%,#ffd740,#8a6a20);box-shadow:0 1px 2px rgba(0,0,0,0.6);"></div>
          <div style="position:absolute;top:6px;right:6px;width:8px;height:8px;border-radius:50%;background:radial-gradient(circle at 35% 35%,#ffd740,#8a6a20);box-shadow:0 1px 2px rgba(0,0,0,0.6);"></div>
          <div style="position:absolute;bottom:6px;left:6px;width:8px;height:8px;border-radius:50%;background:radial-gradient(circle at 35% 35%,#ffd740,#8a6a20);box-shadow:0 1px 2px rgba(0,0,0,0.6);"></div>
          <div style="position:absolute;bottom:6px;right:6px;width:8px;height:8px;border-radius:50%;background:radial-gradient(circle at 35% 35%,#ffd740,#8a6a20);box-shadow:0 1px 2px rgba(0,0,0,0.6);"></div>

          <!-- Left: Class icon + Name + Level -->
          <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;padding:20px 24px;min-width:140px;
            border-right:1px solid #3a2a1a;background:rgba(0,0,0,0.2);">
            <div style="position:relative;display:inline-block;margin-bottom:8px;">
              <div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:80px;height:80px;border-radius:50%;
                background:radial-gradient(circle,${cc}30 0%,${cc}10 40%,transparent 70%);border:1px solid ${cc}30;
                box-shadow:0 0 20px ${cc}20;"></div>
              <div style="font-size:52px;position:relative;z-index:1;filter:drop-shadow(0 0 8px ${cc}60);">${icon}</div>
            </div>
            <div style="font-size:20px;color:${cc};font-weight:bold;letter-spacing:2px;text-shadow:0 0 10px ${cc}40;font-family:'Georgia',serif;">${displayName}</div>
            <div style="margin-top:4px;">${levelStr}</div>
            <!-- XP bar -->
            <div style="width:100%;margin-top:6px;">
              <div style="height:4px;background:rgba(0,0,0,0.5);border-radius:2px;border:1px solid #3a3020;overflow:hidden;">
                <div style="width:${xpPct}%;height:100%;background:linear-gradient(90deg,#5080ff,#80b0ff);border-radius:2px;box-shadow:0 0 4px #5080ff80;"></div>
              </div>
              <div style="text-align:center;font-size:9px;color:#668;margin-top:2px;">XP: ${xpPct}%</div>
            </div>
          </div>

          <!-- Center: Stats grid -->
          <div style="flex:1;padding:16px 20px;display:flex;flex-direction:column;justify-content:center;gap:8px;">
            <!-- Top row: Primary stats as bars -->
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:2px 16px;">
              ${statBarSm("STR", sc.str, statMax, "#e88")}
              ${statBarSm("DEX", sc.dex, statMax, "#8e8")}
              ${statBarSm("INT", sc.int, statMax, "#88e")}
              ${statBarSm("VIT", sc.vit, statMax, "#ee8")}
            </div>
            <!-- Divider line -->
            <div style="height:1px;background:linear-gradient(to right,transparent,#3a2a1a 20%,#3a2a1a 80%,transparent);margin:2px 0;"></div>
            <!-- Bottom row: Secondary stats -->
            <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:4px 12px;font-size:11px;">
              <div style="color:#c88;"><span style="color:#888;">HP</span> <span style="color:#e88;">${sc.maxHp.toLocaleString()}</span></div>
              <div style="color:#88c;"><span style="color:#888;">Mana</span> <span style="color:#88e;">${sc.maxMana.toLocaleString()}</span></div>
              <div style="color:#cc8;"><span style="color:#888;">Armor</span> <span style="color:#ee8;">${sc.armor}</span></div>
            </div>
          </div>

          <!-- Right: Achievement stats + continue -->
          <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;padding:16px 24px;min-width:180px;
            border-left:1px solid #3a2a1a;background:rgba(0,0,0,0.15);gap:6px;">
            <div style="display:grid;grid-template-columns:auto 1fr;gap:3px 8px;font-size:12px;width:100%;">
              <span style="color:#f66;text-align:center;">\u2620</span>
              <span style="color:#daa;"><span style="color:#f88;font-weight:bold;">${sc.killCount.toLocaleString()}</span> Enemies slain</span>
              <span style="color:#fd0;text-align:center;">\uD83D\uDCB0</span>
              <span style="color:#da8;"><span style="color:#ffd700;font-weight:bold;">${sc.gold.toLocaleString()}</span> Gold</span>
              <span style="color:#4af;text-align:center;">\uD83D\uDDFA\uFE0F</span>
              <span style="color:#aad;"><span style="color:#8af;font-weight:bold;">${sc.mapsCleared}</span> Maps cleared</span>
              <span style="color:#4d4;text-align:center;">\uD83D\uDCE6</span>
              <span style="color:#ada;"><span style="color:#8f8;font-weight:bold;">${sc.chestsOpened}</span> Chests opened</span>
              <span style="color:#aaa;text-align:center;">\u2699\uFE0F</span>
              <span style="color:#bbb;"><span style="color:#ccc;font-weight:bold;">${equippedCount}/9</span> Gear equipped</span>
            </div>
            <div style="height:1px;width:80%;background:linear-gradient(to right,transparent,#5a4a2a,transparent);margin:4px 0;"></div>
            <div style="font-size:11px;color:#888;">${diffLabel}</div>
            <div style="
              margin-top:4px;padding:8px 24px;
              background:linear-gradient(180deg,rgba(${cc === '#e85030' ? '180,60,30' : cc === '#5080ff' ? '50,90,200' : cc === '#40cc40' ? '40,160,40' : cc === '#ffd740' ? '200,170,40' : cc === '#b050e0' ? '140,50,180' : '160,40,160'},0.25),rgba(0,0,0,0.3));
              border:2px solid ${cc}88;border-radius:6px;
              color:${cc};font-size:15px;letter-spacing:3px;font-weight:bold;
              font-family:'Georgia',serif;text-shadow:0 0 12px ${cc}40;
              transition:all 0.2s;
            ">CONTINUE \u25B6</div>
          </div>
        </div>`;
    }
  }

  const menuBtnStyle =
    "padding:12px 28px;font-size:15px;letter-spacing:2px;font-weight:bold;" +
    "background:rgba(40,30,15,0.9);border:2px solid #5a4a2a;border-radius:8px;color:#c8a84e;" +
    "cursor:pointer;transition:all 0.2s;font-family:'Georgia',serif;";
  const loadBtnStyle =
    "padding:12px 28px;font-size:15px;letter-spacing:2px;font-weight:bold;" +
    "background:rgba(40,30,15,0.9);border:2px solid #44a;border-radius:8px;color:#68f;" +
    "cursor:pointer;transition:all 0.2s;font-family:'Georgia',serif;";
  const exitBtnStyle =
    "padding:12px 28px;font-size:15px;letter-spacing:2px;font-weight:bold;" +
    "background:rgba(40,30,15,0.9);border:2px solid #a44;border-radius:8px;color:#e66;" +
    "cursor:pointer;transition:all 0.2s;font-family:'Georgia',serif;";

  const saveBtns = hasSave
    ? `<button id="diablo-cs-load" style="${loadBtnStyle}">LOAD GAME</button>
       <button id="diablo-cs-stash" style="${menuBtnStyle}">STASH</button>
       <button id="diablo-cs-inventory" style="${menuBtnStyle}">INVENTORY</button>
       <button id="diablo-cs-character" style="${menuBtnStyle}">CHARACTER</button>`
    : "";
  const importExportBtns = `<button id="diablo-cs-import" style="${menuBtnStyle}">&#8679; IMPORT SAVE</button>`;

  ctx.menuEl.innerHTML = `
    <style>
      @keyframes cs-flame-flicker {
        0%, 100% { text-shadow: 0 0 8px #ff6600, 0 0 16px #ff4400, 0 -4px 12px #ff8800; transform: scaleY(1); }
        25% { text-shadow: 0 0 12px #ff8800, 0 0 20px #ff6600, 0 -6px 16px #ffaa00; transform: scaleY(1.08); }
        50% { text-shadow: 0 0 6px #ff4400, 0 0 14px #ff2200, 0 -3px 10px #ff6600; transform: scaleY(0.95); }
        75% { text-shadow: 0 0 10px #ff6600, 0 0 18px #ff4400, 0 -5px 14px #ff8800; transform: scaleY(1.05); }
      }
      @keyframes cs-title-glow {
        0%, 100% { text-shadow: 0 0 20px rgba(200,168,78,0.5), 0 2px 4px rgba(0,0,0,0.8); }
        50% { text-shadow: 0 0 30px rgba(200,168,78,0.7), 0 0 60px rgba(200,168,78,0.2), 0 2px 4px rgba(0,0,0,0.8); }
      }
      @keyframes cs-card-enter {
        0% { opacity:0; transform:translateY(20px) scale(0.95); }
        100% { opacity:1; transform:translateY(0) scale(1); }
      }
      @keyframes cs-bg-shimmer {
        0% { background-position: -200% 0; }
        100% { background-position: 200% 0; }
      }
      @keyframes cs-border-pulse {
        0%, 100% { box-shadow: 0 0 40px rgba(200,168,78,0.15), inset 0 0 60px rgba(0,0,0,0.3); }
        50% { box-shadow: 0 0 60px rgba(200,168,78,0.25), inset 0 0 80px rgba(0,0,0,0.2); }
      }
      .weather-btn:hover, .diff-btn:hover { filter: brightness(1.2); transform: scale(1.03); }
      .diablo-class-card { box-shadow: 0 4px 20px rgba(0,0,0,0.5); }
      ::-webkit-scrollbar { width: 6px; }
      ::-webkit-scrollbar-track { background: rgba(0,0,0,0.3); }
      ::-webkit-scrollbar-thumb { background: #5a4a2a; border-radius: 3px; }
      ::-webkit-scrollbar-thumb:hover { background: #8a7a4a; }
    </style>
    <div style="
      width:100%;height:100%;${SCREEN_BG}display:flex;flex-direction:column;
      align-items:center;color:#fff;position:relative;overflow-y:auto;overflow-x:hidden;
      padding:30px 20px;box-sizing:border-box;
      scrollbar-width:thin;scrollbar-color:#5a4a2a rgba(0,0,0,0.3);
    ">
      <!-- Ornate gothic page border -->
      <div style="position:fixed;inset:8px;border:2px solid rgba(200,168,78,0.3);border-radius:4px;pointer-events:none;
        animation:cs-border-pulse 4s ease-in-out infinite;z-index:1;"></div>
      <div style="position:fixed;inset:12px;border:1px solid #3a2a1a;border-radius:2px;pointer-events:none;z-index:1;"></div>
      <!-- Corner ornaments -->
      <div style="position:fixed;top:14px;left:14px;color:#5a4a2a;font-size:20px;pointer-events:none;z-index:1;">&#9670;</div>
      <div style="position:fixed;top:14px;right:14px;color:#5a4a2a;font-size:20px;pointer-events:none;z-index:1;">&#9670;</div>
      <div style="position:fixed;bottom:14px;left:14px;color:#5a4a2a;font-size:20px;pointer-events:none;z-index:1;">&#9670;</div>
      <div style="position:fixed;bottom:14px;right:14px;color:#5a4a2a;font-size:20px;pointer-events:none;z-index:1;">&#9670;</div>

      <!-- Title with flame braziers -->
      <div style="display:flex;align-items:center;gap:24px;margin-bottom:8px;">
        <div style="font-size:32px;animation:cs-flame-flicker 0.6s ease-in-out infinite;color:#ff6600;">&#x1F525;</div>
        <div style="text-align:center;">
          <h1 style="
            color:#c8a84e;font-size:48px;letter-spacing:4px;margin:0;
            animation:cs-title-glow 3s ease-in-out infinite;
            font-family:'Georgia',serif;
          ">CHOOSE YOUR CLASS</h1>
          <div style="color:#8a7a4a;font-size:14px;letter-spacing:6px;margin-top:6px;font-family:'Georgia',serif;
            text-shadow:0 0 10px rgba(200,168,78,0.2);">&#10038; Choose Your Champion &#10038;</div>
        </div>
        <div style="font-size:32px;animation:cs-flame-flicker 0.6s ease-in-out infinite 0.3s;color:#ff6600;">&#x1F525;</div>
      </div>

      <!-- Decorative divider -->
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:20px;">
        <div style="width:80px;height:1px;background:linear-gradient(to right,transparent,#5a4a2a);"></div>
        <span style="color:#c8a84e;font-size:14px;">&#9884;</span>
        <div style="width:40px;height:1px;background:#5a4a2a;"></div>
        <span style="color:#c8a84e;font-size:10px;">&#9830;</span>
        <div style="width:40px;height:1px;background:#5a4a2a;"></div>
        <span style="color:#c8a84e;font-size:14px;">&#9884;</span>
        <div style="width:80px;height:1px;background:linear-gradient(to left,transparent,#5a4a2a);"></div>
      </div>

      <div style="display:flex;gap:8px;margin-bottom:16px;flex-wrap:wrap;justify-content:center;align-items:center;">
        <span style="color:#888;font-size:14px;margin-right:8px;font-family:'Georgia',serif;">DIFFICULTY:</span>
        ${diffHtml}
        <span style="width:1px;height:20px;background:#5a4a2a;margin:0 8px;"></span>
        <label style="color:#ff4444;font-family:Georgia,serif;cursor:pointer;font-size:13px;
          padding:4px 12px;border:1px solid rgba(255,68,68,0.2);border-radius:4px;
          background:rgba(80,20,20,0.3);transition:all 0.2s;">
          <input type="checkbox" id="hardcore-check" style="margin-right:6px;accent-color:#ff4444;">
          &#9760; Hardcore
        </label>
        <label style="color:#44ccff;font-family:Georgia,serif;cursor:pointer;font-size:13px;
          padding:4px 12px;border:1px solid rgba(68,204,255,0.2);border-radius:4px;
          background:rgba(20,40,60,0.3);transition:all 0.2s;">
          <input type="checkbox" id="cheat-check" ${ctx.state.cheatsEnabled ? 'checked' : ''} style="margin-right:6px;accent-color:#44ccff;">
          &#10024; Cheats
        </label>
      </div>

      <!-- Weather moved to map select screen -->

      <!-- Decorative sub-divider -->
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:18px;">
        <div style="width:60px;height:1px;background:linear-gradient(to right,transparent,#3a2a1a);"></div>
        <span style="color:#5a4a2a;font-size:8px;">\u25C6</span>
        <span style="color:#8a7a4a;font-size:11px;letter-spacing:4px;font-family:'Georgia',serif;">SELECT A CHAMPION</span>
        <span style="color:#5a4a2a;font-size:8px;">\u25C6</span>
        <div style="width:60px;height:1px;background:linear-gradient(to left,transparent,#3a2a1a);"></div>
      </div>

      <div style="display:flex;gap:16px;flex-wrap:wrap;justify-content:center;">${cardsHtml}</div>
      ${savedCharHtml}
      <div style="display:flex;gap:14px;margin-top:30px;flex-wrap:wrap;justify-content:center;">
        ${saveBtns}
        ${importExportBtns}
        <button id="diablo-cs-controls" style="${menuBtnStyle}">CONTROLS</button>
        <button id="diablo-cs-exit" style="${exitBtnStyle}">EXIT</button>
      </div>
    </div>`;

  const cards = ctx.menuEl.querySelectorAll(".diablo-class-card") as NodeListOf<HTMLDivElement>;
  cards.forEach((card) => {
    card.addEventListener("mouseenter", () => {
      card.style.borderColor = "#c8a84e";
      card.style.boxShadow = "0 0 25px rgba(200,168,78,0.4), 0 8px 32px rgba(0,0,0,0.5), inset 0 0 30px rgba(200,168,78,0.08)";
      card.style.transform = "translateY(-4px) scale(1.02)";
    });
    card.addEventListener("mouseleave", () => {
      card.style.borderColor = "#5a4a2a";
      card.style.boxShadow = "none";
      card.style.transform = "translateY(0) scale(1)";
    });
    card.addEventListener("click", () => {
      if (card.getAttribute("data-unlocked") !== "true") return;
      const cls = card.getAttribute("data-class") as DiabloClass;
      ctx.state.player = createDefaultPlayer(cls);
      const hcCheck = document.getElementById('hardcore-check') as HTMLInputElement | null;
      if (hcCheck && hcCheck.checked) {
        ctx.state.player.isHardcore = true;
      }
      ctx.showMapSelect();
    });
  });

  // Wire up cheat toggle
  const cheatCheck = document.getElementById('cheat-check') as HTMLInputElement | null;
  if (cheatCheck) {
    cheatCheck.addEventListener("change", () => {
      ctx.state.cheatsEnabled = cheatCheck.checked;
      showClassSelect(ctx); // Re-render to update locked/unlocked state
    });
  }

  // Wire up saved character continue button
  const savedCharEl = ctx.menuEl.querySelector("#diablo-saved-char") as HTMLElement | null;
  if (savedCharEl) {
    savedCharEl.addEventListener("mouseenter", () => {
      savedCharEl.style.borderColor = "#c8a84e";
      savedCharEl.style.boxShadow = "0 0 25px rgba(200,168,78,0.35), inset 0 0 30px rgba(200,168,78,0.05)";
    });
    savedCharEl.addEventListener("mouseleave", () => {
      savedCharEl.style.borderColor = "";
      savedCharEl.style.boxShadow = "none";
    });
    savedCharEl.addEventListener("click", () => {
      ctx.loadPlayerOnly();
      ctx.showMapSelect();
    });
  }

  // Wire up difficulty buttons
  const diffBtns = ctx.menuEl.querySelectorAll(".diff-btn") as NodeListOf<HTMLButtonElement>;
  diffBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      ctx.state.difficulty = btn.getAttribute("data-diff") as DiabloDifficulty;
      diffBtns.forEach((b) => {
        const bDiff = b.getAttribute("data-diff") as DiabloDifficulty;
        const bCfg = DIFFICULTY_CONFIGS[bDiff];
        const isNowActive = bDiff === ctx.state.difficulty;
        b.style.background = isNowActive ? "rgba(60,50,20,0.9)" : "rgba(30,20,10,0.7)";
        b.style.borderColor = isNowActive ? bCfg.color : "#3a3a2a";
        b.style.color = isNowActive ? bCfg.color : "#666";
      });
    });
  });

  // Wire up weather buttons
  // Hover helper for class-select menu buttons
  const csHover = (id: string, hBorder: string, hShadow: string, hBg: string, rBorder: string, rBg: string) => {
    const el = ctx.menuEl.querySelector(id) as HTMLButtonElement | null;
    if (!el) return;
    el.addEventListener("mouseenter", () => { el.style.borderColor = hBorder; el.style.boxShadow = `0 0 15px ${hShadow}`; el.style.background = hBg; });
    el.addEventListener("mouseleave", () => { el.style.borderColor = rBorder; el.style.boxShadow = "none"; el.style.background = rBg; });
  };
  // Standard gold buttons
  csHover("#diablo-cs-controls", "#c8a84e", "rgba(200,168,78,0.3)", "rgba(50,40,20,0.95)", "#5a4a2a", "rgba(40,30,15,0.9)");
  csHover("#diablo-cs-stash", "#c8a84e", "rgba(200,168,78,0.3)", "rgba(50,40,20,0.95)", "#5a4a2a", "rgba(40,30,15,0.9)");
  csHover("#diablo-cs-inventory", "#c8a84e", "rgba(200,168,78,0.3)", "rgba(50,40,20,0.95)", "#5a4a2a", "rgba(40,30,15,0.9)");
  csHover("#diablo-cs-character", "#c8a84e", "rgba(200,168,78,0.3)", "rgba(50,40,20,0.95)", "#5a4a2a", "rgba(40,30,15,0.9)");
  // Load button (blue)
  csHover("#diablo-cs-load", "#68f", "rgba(100,100,255,0.3)", "rgba(30,30,50,0.95)", "#44a", "rgba(40,30,15,0.9)");
  // Import button
  csHover("#diablo-cs-import", "#c8a84e", "rgba(200,168,78,0.3)", "rgba(50,40,20,0.95)", "#5a4a2a", "rgba(40,30,15,0.9)");
  // Exit button (red)
  csHover("#diablo-cs-exit", "#e44", "rgba(255,80,80,0.3)", "rgba(50,20,20,0.95)", "#a44", "rgba(40,30,15,0.9)");

  // Click handlers
  const csClick = (id: string, fn: () => void) => {
    const el = ctx.menuEl.querySelector(id);
    if (el) el.addEventListener("click", fn);
  };
  csClick("#diablo-cs-load", () => ctx.loadGame());
  csClick("#diablo-cs-controls", () => { ctx.setPhaseBeforeOverlay(DiabloPhase.CLASS_SELECT); ctx.state.phase = DiabloPhase.INVENTORY; ctx.showControls(); });
  csClick("#diablo-cs-import", () => {
    importSaveFromFile((success, message) => {
      const msgDiv = document.createElement('div');
      msgDiv.style.cssText = `position:fixed;top:40%;left:50%;transform:translate(-50%,-50%);z-index:300;
        background:rgba(10,10,20,0.95);border:2px solid ${success ? '#44ff44' : '#ff4444'};
        border-radius:8px;padding:16px 28px;color:${success ? '#44ff44' : '#ff4444'};
        font-family:Georgia,serif;font-size:18px;text-align:center;pointer-events:none;`;
      msgDiv.textContent = message;
      document.body.appendChild(msgDiv);
      if (!success) {
        setTimeout(() => { msgDiv.style.opacity = '0'; msgDiv.style.transition = 'opacity 0.5s'; }, 2000);
        setTimeout(() => msgDiv.remove(), 2500);
      }
    });
  });
  csClick("#diablo-cs-exit", () => window.dispatchEvent(new CustomEvent("diabloExit")));

  // Stash/Inventory/Character need a loaded save to have meaningful data
  if (hasSave) {
    csClick("#diablo-cs-stash", () => {
      ctx.setPhaseBeforeOverlay(DiabloPhase.CLASS_SELECT);
      const raw = localStorage.getItem("diablo_save");
      if (raw) {
        let save: any;
        try { save = JSON.parse(raw); } catch (e) { console.error('Failed to parse save data:', e); ctx.showSaveRecoveryPrompt(); return; }
        ctx.state.persistentStash = (() => { const s = save.persistentStash || []; while (s.length < 150) s.push({ item: null }); return s; })();
        ctx.state.player = { ...save.player, skillCooldowns: new Map(Object.entries(save.player.skillCooldowns)) };
        ctx.state.persistentGold = save.persistentGold;
      }
      ctx.state.phase = DiabloPhase.INVENTORY;
      ctx.showStash();
    });
    csClick("#diablo-cs-inventory", () => {
      ctx.setPhaseBeforeOverlay(DiabloPhase.CLASS_SELECT);
      const raw = localStorage.getItem("diablo_save");
      if (raw) {
        let save: any;
        try { save = JSON.parse(raw); } catch (e) { console.error('Failed to parse save data:', e); ctx.showSaveRecoveryPrompt(); return; }
        ctx.state.player = { ...save.player, skillCooldowns: new Map(Object.entries(save.player.skillCooldowns)) };
        ctx.state.persistentGold = save.persistentGold;
      }
      ctx.state.phase = DiabloPhase.INVENTORY;
      ctx.showInventory();
    });
    csClick("#diablo-cs-character", () => {
      ctx.setPhaseBeforeOverlay(DiabloPhase.CLASS_SELECT);
      const raw = localStorage.getItem("diablo_save");
      if (raw) {
        let save: any;
        try { save = JSON.parse(raw); } catch (e) { console.error('Failed to parse save data:', e); ctx.showSaveRecoveryPrompt(); return; }
        ctx.state.player = { ...save.player, skillCooldowns: new Map(Object.entries(save.player.skillCooldowns)) };
      }
      ctx.state.phase = DiabloPhase.INVENTORY;
      ctx.showCharacterOverview();
    });
  }
}

// ════════════════════════════════════════════════════════════════════════════
//  2. showMapSelect
// ════════════════════════════════════════════════════════════════════════════

export function showMapSelect(ctx: ScreenContext): void {
  const maps: {
    id: DiabloMapId;
    icon: string;
    name: string;
    desc: string;
    difficulty: string;
    isSafe?: boolean;
  }[] = [
    {
      id: DiabloMapId.CAMELOT,
      icon: "\uD83C\uDFF0",
      name: "Camelot",
      desc: "The great citadel. Visit merchants, manage your gear, and prepare for adventure.",
      difficulty: "Safe Zone",
      isSafe: true,
    },
    // -- 1 star --
    {
      id: DiabloMapId.EMERALD_GRASSLANDS,
      icon: "\uD83C\uDF3F",
      name: "Emerald Grasslands",
      desc: "Rolling green hills dotted with wildflowers. Raiders and wild beasts roam the open plains.",
      difficulty: "\u2B50",
    },
    {
      id: DiabloMapId.SUNSCORCH_DESERT,
      icon: "\uD83C\uDFDC\uFE0F",
      name: "Sunscorch Desert",
      desc: "Sun-blasted dunes and ancient ruins half-buried in sand. Scorpions and bandits prey on travelers.",
      difficulty: "\u2B50",
    },
    {
      id: DiabloMapId.FOREST,
      icon: "\uD83C\uDF32",
      name: "Darkwood Forest",
      desc: "Ancient woods teeming with wildlife turned hostile. Bandits lurk among the trees.",
      difficulty: "\u2B50",
    },
    {
      id: DiabloMapId.MOONLIT_GROVE,
      icon: "\uD83C\uDF19",
      name: "Moonlit Grove",
      desc: "A mystical clearing bathed in eternal moonlight. Fey creatures dance among silver-leafed trees.",
      difficulty: "\u2B50",
    },
    {
      id: DiabloMapId.RIVERSIDE_VILLAGE,
      icon: "\uD83C\uDFE1",
      name: "Riverside Village",
      desc: "A once-peaceful hamlet along the Silverrun River. Bandits and river creatures menace the abandoned cottages.",
      difficulty: "\u2B50",
    },
    {
      id: DiabloMapId.SHATTERED_COLOSSEUM,
      icon: "\uD83C\uDFDF\uFE0F",
      name: "Shattered Colosseum",
      desc: "A ruined gladiatorial arena where spectral fighters battle for an audience of ghosts.",
      difficulty: "\u2B50",
    },
    // -- 2 stars --
    {
      id: DiabloMapId.ELVEN_VILLAGE,
      icon: "\u2728",
      name: "Aelindor",
      desc: "A once-peaceful elven settlement, now corrupted by dark magic. Shadows stir between the crystal spires.",
      difficulty: "\u2B50\u2B50",
    },
    {
      id: DiabloMapId.CORAL_DEPTHS,
      icon: "\uD83E\uDEBB",
      name: "Coral Depths",
      desc: "Sunken ruins encrusted with bioluminescent coral. Predatory sea creatures guard forgotten treasures.",
      difficulty: "\u2B50\u2B50",
    },
    {
      id: DiabloMapId.ANCIENT_LIBRARY,
      icon: "\uD83D\uDCDA",
      name: "Ancient Library",
      desc: "An impossibly vast library where forbidden knowledge animates its guardians. Sentient tomes and ink-born horrors lurk.",
      difficulty: "\u2B50\u2B50",
    },
    {
      id: DiabloMapId.PETRIFIED_GARDEN,
      icon: "\uD83E\uDEA8",
      name: "Petrified Garden",
      desc: "A cursed garden where a gorgon queen turned everything to stone. Statues line the frozen paths.",
      difficulty: "\u2B50\u2B50",
    },
    {
      id: DiabloMapId.SUNKEN_CITADEL,
      icon: "\uD83C\uDF0A",
      name: "Sunken Citadel",
      desc: "A grand fortress dragged beneath the waves. Drowned knights patrol flooded corridors lit by bioluminescent algae.",
      difficulty: "\u2B50\u2B50",
    },
    {
      id: DiabloMapId.CITY_RUINS,
      icon: "\uD83C\uDFDA\uFE0F",
      name: "City Ruins",
      desc: "The shattered remains of a once-great city. Corrupted watchmen still patrol their forgotten posts.",
      difficulty: "\u2B50\u2B50",
    },
    // -- 3 stars --
    {
      id: DiabloMapId.NECROPOLIS_DUNGEON,
      icon: "\uD83D\uDC80",
      name: "Necropolis Depths",
      desc: "The catacombs beneath a fallen fortress. The dead do not rest here.",
      difficulty: "\u2B50\u2B50\u2B50",
    },
    {
      id: DiabloMapId.JADE_TEMPLE,
      icon: "\uD83C\uDFDB\uFE0F",
      name: "Jade Temple",
      desc: "A crumbling jungle temple where jade constructs guard forgotten rituals. Tribal shamans have awakened the old gods.",
      difficulty: "\u2B50\u2B50\u2B50",
    },
    {
      id: DiabloMapId.ASHEN_BATTLEFIELD,
      icon: "\u2694\uFE0F",
      name: "Ashen Battlefield",
      desc: "Scarred remnants of a cataclysmic war. Ghostly soldiers fight an endless battle among shattered siege engines.",
      difficulty: "\u2B50\u2B50\u2B50",
    },
    {
      id: DiabloMapId.WYRMSCAR_CANYON,
      icon: "\uD83D\uDC32",
      name: "Wyrmscar Canyon",
      desc: "A canyon scorched black by generations of dragonfire. Wyverns circle overhead while drakes swarm below.",
      difficulty: "\u2B50\u2B50\u2B50",
    },
    {
      id: DiabloMapId.PLAGUEROT_SEWERS,
      icon: "\u2620\uFE0F",
      name: "Plaguerot Sewers",
      desc: "Festering tunnels beneath a city consumed by plague. The infected have devolved into something inhuman.",
      difficulty: "\u2B50\u2B50\u2B50",
    },
    {
      id: DiabloMapId.CITY,
      icon: "\uD83C\uDFE0",
      name: "City of Thornwall",
      desc: "A walled city under the grip of a corrupt garrison. Armored enforcers patrol the market squares and shadowy alleyways.",
      difficulty: "\u2B50\u2B50\u2B50",
    },
    // -- 4 stars --
    {
      id: DiabloMapId.VOLCANIC_WASTES,
      icon: "\uD83C\uDF0B",
      name: "Volcanic Wastes",
      desc: "A scorched hellscape of molten rivers and ash storms. Demons forged in flame roam the ruins.",
      difficulty: "\u2B50\u2B50\u2B50\u2B50",
    },
    {
      id: DiabloMapId.FUNGAL_DEPTHS,
      icon: "\uD83C\uDF44",
      name: "Fungal Depths",
      desc: "Cavernous tunnels choked with towering bioluminescent mushrooms. The air is thick with toxic spores.",
      difficulty: "\u2B50\u2B50\u2B50\u2B50",
    },
    {
      id: DiabloMapId.OBSIDIAN_FORTRESS,
      icon: "\uD83C\uDFF0",
      name: "Obsidian Fortress",
      desc: "A fortress carved from volcanic glass reflecting hellfire. Demonic legions drill in its courtyards.",
      difficulty: "\u2B50\u2B50\u2B50\u2B50",
    },
    {
      id: DiabloMapId.ETHEREAL_SANCTUM,
      icon: "\uD83D\uDD2E",
      name: "Ethereal Sanctum",
      desc: "A temple phasing between multiple planes of existence. Its guardians shift between corporeal and spectral forms.",
      difficulty: "\u2B50\u2B50\u2B50\u2B50",
    },
    {
      id: DiabloMapId.IRON_WASTES,
      icon: "\u2699\uFE0F",
      name: "Iron Wastes",
      desc: "A blasted wasteland of rusting war machines. Self-repairing automatons build ever-deadlier forms from the wreckage.",
      difficulty: "\u2B50\u2B50\u2B50\u2B50",
    },
    // -- 5 stars --
    {
      id: DiabloMapId.ABYSSAL_RIFT,
      icon: "\uD83C\uDF0C",
      name: "Abyssal Rift",
      desc: "A tear in reality. Eldritch horrors drift between shattered islands of stone above the void.",
      difficulty: "\u2B50\u2B50\u2B50\u2B50\u2B50",
    },
    {
      id: DiabloMapId.CELESTIAL_RUINS,
      icon: "\u2B50",
      name: "Celestial Ruins",
      desc: "Shattered temples floating among the stars. Fallen cosmic guardians patrol bridges of pure light.",
      difficulty: "\u2B50\u2B50\u2B50\u2B50\u2B50",
    },
    {
      id: DiabloMapId.INFERNAL_THRONE,
      icon: "\uD83D\uDD25",
      name: "Infernal Throne",
      desc: "The seat of demonic power. Rivers of molten souls flow beneath a throne of compressed agony.",
      difficulty: "\u2B50\u2B50\u2B50\u2B50\u2B50",
    },
    {
      id: DiabloMapId.BLIGHTED_THRONE,
      icon: "\uD83D\uDC51",
      name: "Blighted Throne",
      desc: "The corrupted throne room of a king who bargained with dark powers. His nightmarish court still holds session.",
      difficulty: "\u2B50\u2B50\u2B50\u2B50\u2B50",
    },
    {
      id: DiabloMapId.CHRONO_LABYRINTH,
      icon: "\u231B",
      name: "Chrono Labyrinth",
      desc: "A maze where corridors loop through fractured timelines. Past and future collide with every step.",
      difficulty: "\u2B50\u2B50\u2B50\u2B50\u2B50",
    },
    // -- 6 stars --
    {
      id: DiabloMapId.DRAGONS_SANCTUM,
      icon: "\uD83D\uDC09",
      name: "Dragon's Sanctum",
      desc: "The ancient lair of the Elder Dragons. Gold-encrusted caverns echo with primordial fury.",
      difficulty: "\u2B50\u2B50\u2B50\u2B50\u2B50\u2B50",
    },
    {
      id: DiabloMapId.ASTRAL_VOID,
      icon: "\uD83C\uDF0C",
      name: "Astral Void",
      desc: "The space between dimensions where reality unravels. Entities older than creation drift through fractured timelines.",
      difficulty: "\u2B50\u2B50\u2B50\u2B50\u2B50\u2B50",
    },
    {
      id: DiabloMapId.ELDRITCH_NEXUS,
      icon: "\uD83E\uDDE0",
      name: "Eldritch Nexus",
      desc: "The convergence of all dark dimensions. Alien intelligences probe the boundaries of sanity in impossible geometries.",
      difficulty: "\u2B50\u2B50\u2B50\u2B50\u2B50\u2B50",
    },
  ];

  // Map completion counter
  const completedCount = Object.values(ctx.state.completedMaps).filter(Boolean).length;
  const totalMaps = maps.filter(m => !m.isSafe).length;

  let cardsHtml = "";
  let mapCardIndex = 0;
  const mapCheats = ctx.state.cheatsEnabled;
  const mapPlayerLevel = ctx.state.player.level;
  for (const m of maps) {
    // Check if any difficulty variant of this map has been completed
    const isCompleted = Object.keys(ctx.state.completedMaps).some(k => k.startsWith(m.id) && ctx.state.completedMaps[k]);
    const completionBadge = isCompleted ? `<span style="color:#44ff44;margin-left:6px;font-size:16px;">\u2713</span>` : '';
    // Gate maps by star tier: 1 star = level 0, 2 star = level 4, 3 star = level 8, etc.
    const starCount = m.isSafe ? 0 : (m.difficulty.match(/\u2B50/g) || []).length;
    const mapReqLevel = Math.max(0, (starCount - 1) * 4);
    const mapUnlocked = mapCheats || m.isSafe || mapPlayerLevel >= mapReqLevel;
    const cardBorder = !mapUnlocked ? '#333' : isCompleted ? '#44ff44' : '#5a4a2a';
    const cardBorderTop = !mapUnlocked ? '#444' : isCompleted ? '#66ff66' : '#8a7a4a';
    const cardBorderBot = !mapUnlocked ? '#111' : isCompleted ? '#228822' : '#2a1a0a';
    cardsHtml += `
      <div class="diablo-map-card" data-map="${m.id}" data-unlocked="${mapUnlocked}" style="
        width:220px;background:rgba(20,15,10,0.95);
        border:3px solid ${cardBorder};border-top-color:${cardBorderTop};border-left-color:${!mapUnlocked ? '#333' : isCompleted ? '#55dd55' : '#7a6a3a'};
        border-right-color:${!mapUnlocked ? '#222' : isCompleted ? '#339933' : '#3a2a1a'};border-bottom-color:${cardBorderBot};
        border-radius:12px;padding:28px 24px;cursor:${mapUnlocked ? 'pointer' : 'not-allowed'};text-align:center;
        transition:all 0.3s ease;
        backdrop-filter:blur(4px);
        ${mapUnlocked ? '' : 'opacity:0.4;filter:grayscale(0.7);'}
        transform:translateY(0) scale(1);
        animation:cs-card-enter 0.4s ease-out backwards;
        animation-delay:${mapCardIndex * 0.1}s;
        background-image:repeating-linear-gradient(45deg,transparent,transparent 8px,rgba(200,168,78,0.015) 8px,rgba(200,168,78,0.015) 16px);
        box-shadow:inset 0 0 30px rgba(0,0,0,0.3), 0 4px 12px rgba(0,0,0,0.4);
        position:relative;
      ">
        <div style="position:absolute;top:6px;left:6px;width:8px;height:8px;border-radius:50%;background:radial-gradient(circle,#c8a84e,#5a4a2a);opacity:0.6;"></div>
        <div style="position:absolute;top:6px;right:6px;width:8px;height:8px;border-radius:50%;background:radial-gradient(circle,#c8a84e,#5a4a2a);opacity:0.6;"></div>
        <div style="position:absolute;bottom:6px;left:6px;width:8px;height:8px;border-radius:50%;background:radial-gradient(circle,#c8a84e,#5a4a2a);opacity:0.6;"></div>
        <div style="position:absolute;bottom:6px;right:6px;width:8px;height:8px;border-radius:50%;background:radial-gradient(circle,#c8a84e,#5a4a2a);opacity:0.6;"></div>
        <div style="position:absolute;inset:4px;border:1px solid rgba(200,168,78,0.12);border-radius:8px;pointer-events:none;"></div>
        <div style="font-size:64px;margin-bottom:12px;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.5));">${m.icon}</div>
        <div style="font-size:20px;color:#c8a84e;font-weight:bold;letter-spacing:2px;margin-bottom:8px;font-family:'Georgia',serif;text-shadow:0 1px 3px rgba(0,0,0,0.5);">${m.name}${completionBadge}</div>
        <div style="width:60%;height:1px;background:linear-gradient(to right,transparent,#5a4a2a,transparent);margin:0 auto 10px;"></div>
        <p style="color:#998877;font-size:13px;line-height:1.5;margin-bottom:14px;font-family:'Georgia',serif;">${m.desc}</p>
        <div style="font-size:18px;color:${m.isSafe ? '#44ff44' : '#ff8'};font-family:'Georgia',serif;text-shadow:0 0 6px ${m.isSafe ? 'rgba(68,255,68,0.3)' : 'rgba(255,255,136,0.3)'};">${m.difficulty}</div>
        ${mapUnlocked ? '' : `<div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;z-index:10;border-radius:10px;background:rgba(0,0,0,0.5);"><div style="color:#888;font-size:13px;font-family:'Georgia',serif;">&#128274; Level ${mapReqLevel}</div></div>`}
      </div>`;
    mapCardIndex++;
  }

  const todOptions: { value: TimeOfDay; label: string; icon: string }[] = [
    { value: TimeOfDay.DAY, label: "DAY", icon: "\u2600\uFE0F" },
    { value: TimeOfDay.DAWN, label: "DAWN", icon: "\uD83C\uDF05" },
    { value: TimeOfDay.DUSK, label: "DUSK", icon: "\uD83C\uDF07" },
    { value: TimeOfDay.NIGHT, label: "NIGHT", icon: "\uD83C\uDF19" },
  ];
  let todHtml = "";
  for (const t of todOptions) {
    const isActive = ctx.state.timeOfDay === t.value;
    todHtml += `<button class="tod-btn" data-tod="${t.value}" style="
      cursor:pointer;padding:10px 20px;font-size:16px;border-radius:6px;transition:0.2s;
      background:${isActive ? "rgba(60,50,20,0.9)" : "rgba(30,20,10,0.7)"};
      border:2px solid ${isActive ? "#c8a84e" : "#3a3a2a"};
      color:${isActive ? "#ffd700" : "#888"};
      font-family:'Georgia',serif;
    ">${t.icon} ${t.label}</button>`;
  }

  // Weather selector options
  const weatherOptions = [
    { value: 'RANDOM', label: 'Random', icon: '\uD83C\uDFB2', color: '#c8a84e' },
    { value: 'NORMAL', label: 'Normal', icon: '\u2601\uFE0F', color: '#9999aa' },
    { value: 'CLEAR', label: 'Clear', icon: '\u2600\uFE0F', color: '#ffcc44' },
    { value: 'STORMY', label: 'Stormy', icon: '\u26C8\uFE0F', color: '#6688cc' },
  ];
  let weatherHtml = "";
  for (const wOpt of weatherOptions) {
    const isActive = ctx.state.preferredWeather === wOpt.value;
    weatherHtml += `<button class="weather-btn" data-weather="${wOpt.value}" style="
      cursor:pointer;padding:8px 14px;font-size:13px;border-radius:6px;transition:0.2s;
      background:${isActive ? "rgba(60,50,20,0.9)" : "rgba(30,20,10,0.7)"};
      border:2px solid ${isActive ? wOpt.color : "#3a3a2a"};
      color:${isActive ? wOpt.color : "#666"};
      font-family:'Georgia',serif;font-weight:bold;
    ">${wOpt.icon} ${wOpt.label}</button>`;
  }

  // Map modifier toggles
  const modifiers = [
    { id: 'ENEMY_SPEED', name: 'Swift', icon: '\uD83D\uDCA8', desc: 'Enemies 40% faster', color: '#44ccff', dropBonus: 15 },
    { id: 'ENEMY_FIRE_RESIST', name: 'Fireproof', icon: '\uD83D\uDD25', desc: '50% fire resist', color: '#ff4400', dropBonus: 10 },
    { id: 'ENEMY_ICE_RESIST', name: 'Frostbound', icon: '\u2744\uFE0F', desc: '50% ice resist', color: '#4488ff', dropBonus: 10 },
    { id: 'ENEMY_LIGHTNING_RESIST', name: 'Grounded', icon: '\u26A1', desc: '50% lightning resist', color: '#ffdd00', dropBonus: 10 },
    { id: 'ENEMY_THORNS', name: 'Thorns', icon: '\uD83C\uDF39', desc: '15% damage reflect', color: '#ff4488', dropBonus: 20 },
    { id: 'ENEMY_REGEN', name: 'Regenerating', icon: '\uD83D\uDC9A', desc: 'Enemies regen', color: '#44ff44', dropBonus: 15 },
    { id: 'EXTRA_ELITES', name: 'Champions', icon: '\uD83D\uDC51', desc: 'More bosses', color: '#ffd700', dropBonus: 25 },
    { id: 'EXPLOSIVE_DEATH', name: 'Volatile', icon: '\uD83D\uDCA5', desc: 'Enemies explode', color: '#ff8800', dropBonus: 15 },
    { id: 'DOUBLE_HP', name: 'Fortified', icon: '\uD83D\uDEE1\uFE0F', desc: 'Double enemy HP', color: '#888888', dropBonus: 30 },
    { id: 'VAMPIRIC', name: 'Vampiric', icon: '\uD83E\uDDDB', desc: 'Enemies lifesteal', color: '#cc0000', dropBonus: 20 },
  ];
  let modHtml = '';
  for (const mod of modifiers) {
    modHtml += `<button class="mod-btn" data-mod="${mod.id}" style="
      cursor:pointer;padding:6px 12px;font-size:13px;border-radius:6px;transition:0.2s;
      background:rgba(30,20,10,0.7);border:2px solid #3a3a2a;color:#888;
      font-family:'Georgia',serif;display:flex;align-items:center;gap:6px;
    " title="${mod.desc} (+${mod.dropBonus}% drop rate)">
      <span style="font-size:18px;">${mod.icon}</span>
      <span>${mod.name}</span>
      <span style="font-size:10px;color:#4a4;margin-left:4px;">+${mod.dropBonus}%\uD83C\uDF81</span>
    </button>`;
  }

  ctx.menuEl.innerHTML = `
    <style>
      @keyframes ms-flame-flicker {
        0%, 100% { text-shadow: 0 0 8px #ff6600, 0 0 16px #ff4400, 0 -4px 12px #ff8800; transform: scaleY(1); }
        25% { text-shadow: 0 0 12px #ff8800, 0 0 20px #ff6600, 0 -6px 16px #ffaa00; transform: scaleY(1.08); }
        50% { text-shadow: 0 0 6px #ff4400, 0 0 14px #ff2200, 0 -3px 10px #ff6600; transform: scaleY(0.95); }
        75% { text-shadow: 0 0 10px #ff6600, 0 0 18px #ff4400, 0 -5px 14px #ff8800; transform: scaleY(1.05); }
      }
      @keyframes ms-title-glow {
        0%, 100% { text-shadow: 0 0 20px rgba(200,168,78,0.5), 0 2px 4px rgba(0,0,0,0.8); }
        50% { text-shadow: 0 0 30px rgba(200,168,78,0.7), 0 0 60px rgba(200,168,78,0.2), 0 2px 4px rgba(0,0,0,0.8); }
      }
      @keyframes cs-card-enter {
        0% { opacity:0; transform:translateY(20px) scale(0.95); }
        100% { opacity:1; transform:translateY(0) scale(1); }
      }
      @keyframes cs-bg-shimmer {
        0% { background-position: -200% 0; }
        100% { background-position: 200% 0; }
      }
    </style>
    <div style="
      width:100%;height:100%;
      ${SCREEN_BG}
      display:flex;flex-direction:column;
      align-items:center;justify-content:center;color:#fff;
      position:relative;overflow:hidden;
    ">
      <!-- Ornate gothic page border -->
      <div style="position:absolute;inset:8px;border:2px solid rgba(200,168,78,0.3);border-radius:4px;pointer-events:none;
        box-shadow:0 0 40px rgba(200,168,78,0.15), inset 0 0 60px rgba(0,0,0,0.3);"></div>
      <div style="position:absolute;inset:12px;border:1px solid #3a2a1a;border-radius:2px;pointer-events:none;"></div>
      <!-- Corner diamond ornaments -->
      <div style="position:absolute;top:14px;left:14px;color:#5a4a2a;font-size:20px;">&#9670;</div>
      <div style="position:absolute;top:14px;right:14px;color:#5a4a2a;font-size:20px;">&#9670;</div>
      <div style="position:absolute;bottom:14px;left:14px;color:#5a4a2a;font-size:20px;">&#9670;</div>
      <div style="position:absolute;bottom:14px;right:14px;color:#5a4a2a;font-size:20px;">&#9670;</div>

      <!-- Title with flame braziers -->
      <div style="display:flex;align-items:center;gap:24px;margin-bottom:8px;">
        <div style="font-size:32px;animation:ms-flame-flicker 0.6s ease-in-out infinite;color:#ff6600;">&#x1F525;</div>
        <div style="text-align:center;">
          <h1 style="
            color:#c8a84e;font-size:42px;letter-spacing:4px;margin:0;
            animation:ms-title-glow 3s ease-in-out infinite;
            font-family:'Georgia',serif;
          ">SELECT YOUR DESTINATION</h1>
          <div style="color:#8a7a4a;font-size:14px;letter-spacing:6px;margin-top:6px;font-family:'Georgia',serif;
            text-shadow:0 0 10px rgba(200,168,78,0.2);">&#10038; Chart Your Path &#10038;</div>
          <div style="color:#44ff44;font-size:13px;margin-top:4px;letter-spacing:2px;font-family:'Georgia',serif;">Maps Cleared: ${completedCount}/${totalMaps} | Press <span style="display:inline-block;background:rgba(60,50,30,0.8);border:1px solid #888;border-radius:4px;padding:0 6px;font-family:monospace;color:#ffd700;">L</span> for Leaderboard</div>
        </div>
        <div style="font-size:32px;animation:ms-flame-flicker 0.6s ease-in-out infinite 0.3s;color:#ff6600;">&#x1F525;</div>
      </div>

      <!-- Decorative divider -->
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:14px;">
        <div style="width:80px;height:1px;background:linear-gradient(to right,transparent,#5a4a2a);"></div>
        <span style="color:#c8a84e;font-size:14px;">&#9884;</span>
        <div style="width:40px;height:1px;background:#5a4a2a;"></div>
        <span style="color:#c8a84e;font-size:10px;">&#9830;</span>
        <div style="width:40px;height:1px;background:#5a4a2a;"></div>
        <span style="color:#c8a84e;font-size:14px;">&#9884;</span>
        <div style="width:80px;height:1px;background:linear-gradient(to left,transparent,#5a4a2a);"></div>
      </div>

      <div style="font-size:16px;color:${DIFFICULTY_CONFIGS[ctx.state.difficulty].color};margin-bottom:12px;font-family:'Georgia',serif;">
        ${DIFFICULTY_CONFIGS[ctx.state.difficulty].icon} ${DIFFICULTY_CONFIGS[ctx.state.difficulty].label} Difficulty
      </div>
      <div style="display:flex;gap:8px;margin-bottom:10px;">${todHtml}</div>
      <div style="display:flex;gap:8px;margin-bottom:14px;flex-wrap:wrap;justify-content:center;align-items:center;">
        <span style="color:#888;font-size:13px;margin-right:4px;font-family:'Georgia',serif;">WEATHER:</span>
        ${weatherHtml}
      </div>

      <!-- Divider between weather and modifiers -->
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px;">
        <div style="width:60px;height:1px;background:linear-gradient(to right,transparent,#3a2a1a);"></div>
        <span style="color:#5a4a2a;font-size:10px;">&#9670;</span>
        <div style="width:60px;height:1px;background:linear-gradient(to left,transparent,#3a2a1a);"></div>
      </div>

      <div style="margin-bottom:12px;text-align:center;">
        <div style="color:#c8a84e;font-size:14px;letter-spacing:2px;margin-bottom:8px;font-family:'Georgia',serif;">MAP MODIFIERS (increase drop rate)</div>
        <div style="display:flex;gap:6px;flex-wrap:wrap;justify-content:center;max-width:900px;">${modHtml}</div>
        <div id="total-drop-bonus" style="color:#4a4;font-size:13px;margin-top:6px;">Total drop rate bonus: +0%</div>
      </div>

      <!-- Divider between modifiers and map cards -->
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:10px;">
        <div style="width:80px;height:1px;background:linear-gradient(to right,transparent,#5a4a2a);"></div>
        <span style="color:#c8a84e;font-size:14px;">&#9884;</span>
        <div style="width:40px;height:1px;background:#5a4a2a;"></div>
        <span style="color:#c8a84e;font-size:10px;">&#9830;</span>
        <div style="width:40px;height:1px;background:#5a4a2a;"></div>
        <span style="color:#c8a84e;font-size:14px;">&#9884;</span>
        <div style="width:80px;height:1px;background:linear-gradient(to left,transparent,#5a4a2a);"></div>
      </div>

      <div style="display:flex;gap:20px;flex-wrap:wrap;justify-content:center;max-width:95vw;overflow-y:auto;max-height:60vh;padding:10px;">${cardsHtml}</div>

      <!-- Prestige Section -->
      <div id="prestige-section-container"></div>

      <!-- Greater Rift Section -->
      <div style="display:flex;align-items:center;gap:12px;margin-top:16px;margin-bottom:8px;">
        <div style="width:80px;height:1px;background:linear-gradient(to right,transparent,#ff8800);"></div>
        <span style="color:#ff8800;font-size:14px;">&#9884;</span>
        <span style="color:#ff8800;font-size:12px;letter-spacing:2px;font-family:'Georgia',serif;">GREATER RIFTS</span>
        <span style="color:#ff8800;font-size:14px;">&#9884;</span>
        <div style="width:80px;height:1px;background:linear-gradient(to left,transparent,#ff8800);"></div>
      </div>
      <div style="display:flex;gap:12px;align-items:center;justify-content:center;">
        <button id="gr-start-btn" style="
          cursor:pointer;padding:12px 24px;font-size:15px;border-radius:8px;
          background:linear-gradient(135deg,rgba(60,30,0,0.9),rgba(40,20,0,0.9));
          border:2px solid #ff8800;color:#ffd700;font-family:'Georgia',serif;
          transition:0.2s;
        " ${ctx.state.greaterRift.keystones <= 0 ? 'disabled style="opacity:0.5;cursor:not-allowed;"' : ''}>
          \uD83D\uDD25 Enter Greater Rift (GR ${ctx.state.greaterRift.bestRiftLevel + 1})
        </button>
        <span style="color:#00ffff;font-size:13px;font-family:monospace;">
          \uD83D\uDD11 ${ctx.state.greaterRift.keystones} Keystones | Best: GR ${ctx.state.greaterRift.bestRiftLevel}
        </span>
      </div>
    </div>`;

  // Wire up Greater Rift button
  const grBtn = ctx.menuEl.querySelector("#gr-start-btn") as HTMLButtonElement;
  if (grBtn && ctx.state.greaterRift.keystones > 0) {
    grBtn.addEventListener("mouseenter", () => {
      grBtn.style.borderColor = "#ffaa00";
      grBtn.style.boxShadow = "0 0 20px rgba(255,136,0,0.4)";
    });
    grBtn.addEventListener("mouseleave", () => {
      grBtn.style.borderColor = "#ff8800";
      grBtn.style.boxShadow = "none";
    });
    grBtn.addEventListener("click", () => {
      const level = ctx.state.greaterRift.bestRiftLevel + 1;
      ctx.startGreaterRift(level);
    });
  }

  // Wire up prestige section
  if (ctx.state.player.level >= 20 || ctx.state.player.mordredDefeated) {
    const prestigeContainer = ctx.menuEl.querySelector('#prestige-section-container') as HTMLDivElement;
    if (prestigeContainer) {
      prestigeContainer.innerHTML = `
        <div style="display:flex;align-items:center;gap:12px;margin-top:16px;margin-bottom:8px;">
          <div style="width:80px;height:1px;background:linear-gradient(to right,transparent,#ffd700);"></div>
          <span style="color:#ffd700;font-size:14px;">&#9884;</span>
          <span style="color:#ffd700;font-size:12px;letter-spacing:2px;font-family:'Georgia',serif;">NEW GAME+</span>
          <span style="color:#ffd700;font-size:14px;">&#9884;</span>
          <div style="width:80px;height:1px;background:linear-gradient(to left,transparent,#ffd700);"></div>
        </div>
        <div style="text-align:center;">
          <button id="prestige-btn" style="
            cursor:pointer;padding:10px 20px;font-size:14px;border-radius:6px;
            background:linear-gradient(180deg,#ffd700,#b8860b);color:#000;
            border:2px solid #ffd700;font-family:'Georgia',serif;font-weight:bold;
            transition:0.2s;
          ">Prestige ${ctx.state.player.prestigeLevel + 1} (Current: ${ctx.state.player.prestigeLevel})</button>
        </div>
      `;
      const prestigeBtn = ctx.menuEl.querySelector('#prestige-btn') as HTMLButtonElement;
      if (prestigeBtn) {
        prestigeBtn.addEventListener('click', () => ctx.showPrestigePanel());
      }
    }
  }

  // Wire up time-of-day buttons
  const todBtns = ctx.menuEl.querySelectorAll(".tod-btn") as NodeListOf<HTMLButtonElement>;
  todBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      ctx.state.timeOfDay = btn.getAttribute("data-tod") as TimeOfDay;
      // Update visual state for all buttons
      todBtns.forEach((b) => {
        const isNowActive = b.getAttribute("data-tod") === ctx.state.timeOfDay;
        b.style.background = isNowActive ? "rgba(60,50,20,0.9)" : "rgba(30,20,10,0.7)";
        b.style.borderColor = isNowActive ? "#c8a84e" : "#3a3a2a";
        b.style.color = isNowActive ? "#ffd700" : "#888";
      });
    });
  });

  // Wire up weather buttons
  const weatherBtns = ctx.menuEl.querySelectorAll(".weather-btn") as NodeListOf<HTMLButtonElement>;
  const weatherColorMap: Record<string, string> = {
    RANDOM: "#c8a84e", NORMAL: "#9999aa", CLEAR: "#ffcc44", STORMY: "#6688cc",
  };
  weatherBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      const w = btn.getAttribute("data-weather") as Weather;
      ctx.state.preferredWeather = w;
      weatherBtns.forEach((b) => {
        const bw = b.getAttribute("data-weather")!;
        const isNowActive = bw === w;
        const color = weatherColorMap[bw] || "#c8a84e";
        b.style.background = isNowActive ? "rgba(60,50,20,0.9)" : "rgba(30,20,10,0.7)";
        b.style.borderColor = isNowActive ? color : "#3a3a2a";
        b.style.color = isNowActive ? color : "#666";
      });
    });
  });

  // Wire up map modifier buttons
  const activeModifiers: Set<string> = new Set();
  const modBtns = ctx.menuEl.querySelectorAll(".mod-btn") as NodeListOf<HTMLButtonElement>;
  const dropBonusLabel = ctx.menuEl.querySelector("#total-drop-bonus") as HTMLDivElement;
  modBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      const modId = btn.getAttribute("data-mod")!;
      if (activeModifiers.has(modId)) {
        activeModifiers.delete(modId);
        btn.style.background = "rgba(30,20,10,0.7)";
        btn.style.borderColor = "#3a3a2a";
        btn.style.color = "#888";
      } else {
        activeModifiers.add(modId);
        const mod = modifiers.find(m => m.id === modId)!;
        btn.style.background = "rgba(60,50,20,0.9)";
        btn.style.borderColor = mod.color;
        btn.style.color = mod.color;
      }
      // Update total drop bonus display
      let totalBonus = 0;
      for (const id of activeModifiers) {
        const m = modifiers.find(mod => mod.id === id);
        if (m) totalBonus += m.dropBonus;
      }
      if (dropBonusLabel) {
        dropBonusLabel.textContent = `Total drop rate bonus: +${totalBonus}%`;
        dropBonusLabel.style.color = totalBonus > 0 ? '#44ff44' : '#4a4';
      }
    });
  });

  const mapCards = ctx.menuEl.querySelectorAll(".diablo-map-card") as NodeListOf<HTMLDivElement>;
  mapCards.forEach((card) => {
    card.addEventListener("mouseenter", () => {
      card.style.borderColor = "#c8a84e";
      card.style.boxShadow = "0 0 25px rgba(200,168,78,0.4), 0 8px 32px rgba(0,0,0,0.5), inset 0 0 30px rgba(200,168,78,0.08)";
      card.style.transform = "translateY(-4px) scale(1.02)";
    });
    card.addEventListener("mouseleave", () => {
      card.style.borderColor = "#5a4a2a";
      card.style.boxShadow = "none";
      card.style.transform = "translateY(0) scale(1)";
    });
    card.addEventListener("click", () => {
      if (card.getAttribute("data-unlocked") !== "true") return;
      const mapId = card.getAttribute("data-map") as DiabloMapId;
      ctx.state.activeMapModifiers = [...activeModifiers] as MapModifier[];
      ctx.startMap(mapId);
    });
  });
}

// ════════════════════════════════════════════════════════════════════════════
//  3. showInventory
// ════════════════════════════════════════════════════════════════════════════

export function showInventory(ctx: ScreenContext): void {
  const p = ctx.state.player;

  // Inject rarity pulse animation styles (once)
  if (!document.getElementById("inv-rarity-anim-style")) {
    const styleEl = document.createElement("style");
    styleEl.id = "inv-rarity-anim-style";
    styleEl.textContent = `
      @keyframes inv-glow-legendary {
        0%, 100% { box-shadow: 0 0 10px #ff8800, 0 0 5px #ff8800 inset; }
        50% { box-shadow: 0 0 16px #ff8800, 0 0 8px #ff8800 inset, 0 0 24px rgba(255,136,0,0.3); }
      }
      @keyframes inv-glow-mythic {
        0%, 100% { box-shadow: 0 0 12px #ff2222, 0 0 6px #ff2222 inset; }
        50% { box-shadow: 0 0 18px #ff2222, 0 0 9px #ff2222 inset, 0 0 28px rgba(255,34,34,0.3); }
      }
      @keyframes inv-glow-divine {
        0%, 100% { box-shadow: 0 0 14px #ffd700, 0 0 7px #ffd700 inset; }
        50% { box-shadow: 0 0 20px #ffd700, 0 0 10px #ffd700 inset, 0 0 32px rgba(255,215,0,0.35); }
      }
      .inv-anim-legendary { animation: inv-glow-legendary 2s ease-in-out infinite; }
      .inv-anim-mythic    { animation: inv-glow-mythic 1.8s ease-in-out infinite; }
      .inv-anim-divine    { animation: inv-glow-divine 2.2s ease-in-out infinite; }
      .equip-slot:hover, .inv-slot:hover { filter: brightness(1.25); transform: scale(1.04); }
      .equip-slot, .inv-slot { transition: filter 0.15s, transform 0.15s, box-shadow 0.3s; }
    `;
    document.head.appendChild(styleEl);
  }

  const slotDefs: { key: keyof DiabloEquipment; label: string; gridArea: string }[] = [
    { key: "helmet", label: "Helmet", gridArea: "1/2/2/3" },
    { key: "weapon", label: "Weapon", gridArea: "2/1/3/2" },
    { key: "body", label: "Body", gridArea: "2/2/3/3" },
    { key: "accessory1", label: "Accessory 1", gridArea: "2/3/3/4" },
    { key: "gauntlets", label: "Gauntlets", gridArea: "3/1/4/2" },
    { key: "legs", label: "Legs", gridArea: "3/2/4/3" },
    { key: "accessory2", label: "Accessory 2", gridArea: "3/3/4/4" },
    { key: "feet", label: "Feet", gridArea: "4/2/5/3" },
    { key: "lantern", label: "Lantern [L/P]", gridArea: "4/3/5/4" },
  ];

  const animClass = (r: ItemRarity) => {
    if (r === ItemRarity.LEGENDARY) return "inv-anim-legendary";
    if (r === ItemRarity.MYTHIC) return "inv-anim-mythic";
    if (r === ItemRarity.DIVINE) return "inv-anim-divine";
    return "";
  };

  let equipHtml = "";
  for (const sd of slotDefs) {
    const item = p.equipment[sd.key];
    const borderColor = item ? RARITY_CSS[item.rarity] : "#555";
    const borderW = item ? RARITY_BORDER[item.rarity] : 1;
    const glow = item ? RARITY_GLOW[item.rarity] : "none";
    const bg = item ? RARITY_BG[item.rarity] : "rgba(15,10,5,0.9)";
    const anim = item && rarityNeedsAnim(item.rarity) ? animClass(item.rarity) : "";
    const badge = item && RARITY_BADGE[item.rarity]
      ? `<div style="position:absolute;top:2px;right:3px;font-size:9px;color:${RARITY_CSS[item.rarity]};text-shadow:0 0 4px ${RARITY_CSS[item.rarity]};line-height:1;">${RARITY_BADGE[item.rarity]}</div>`
      : "";
    const content = item
      ? `<div style="font-size:28px;">${item.icon}</div><div style="font-size:12px;color:${RARITY_CSS[item.rarity]};margin-top:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:72px;text-shadow:0 0 6px ${RARITY_CSS[item.rarity]}40;">${item.name}</div>${badge}`
      : `<div style="font-size:12px;color:#555;">${sd.label}</div>`;
    equipHtml += `
      <div class="equip-slot ${anim}" data-equip-key="${sd.key}" style="
        grid-area:${sd.gridArea};width:74px;height:74px;background:${bg};
        border:${borderW}px solid ${borderColor};border-radius:6px;display:flex;flex-direction:column;
        align-items:center;justify-content:center;cursor:pointer;pointer-events:auto;
        position:relative;box-shadow:${glow};
      ">${content}</div>`;
  }

  let invHtml = "";
  for (let i = 0; i < p.inventory.length; i++) {
    const slot = p.inventory[i];
    const item = slot.item;
    const borderColor = item ? RARITY_CSS[item.rarity] : "#3a3a3a";
    const borderW = item ? RARITY_BORDER[item.rarity] : 1;
    const glow = item ? RARITY_GLOW[item.rarity] : "none";
    const bg = item ? RARITY_BG[item.rarity] : "rgba(15,10,5,0.85)";
    const anim = item && rarityNeedsAnim(item.rarity) ? animClass(item.rarity) : "";
    const badge = item && RARITY_BADGE[item.rarity]
      ? `<div style="position:absolute;top:1px;right:2px;font-size:8px;color:${RARITY_CSS[item.rarity]};text-shadow:0 0 4px ${RARITY_CSS[item.rarity]};line-height:1;">${RARITY_BADGE[item.rarity]}</div>`
      : "";
    const lockIcon = item && item.isLocked
      ? `<span style="position:absolute;top:2px;right:2px;font-size:10px;">\uD83D\uDD12</span>`
      : "";
    const content = item
      ? `<div style="font-size:24px;">${item.icon}</div>${badge}${lockIcon}`
      : "";
    invHtml += `
      <div class="inv-slot ${anim}" data-inv-idx="${i}" style="
        width:62px;height:62px;background:${bg};border:${borderW}px solid ${borderColor};
        border-radius:4px;display:flex;align-items:center;justify-content:center;
        cursor:pointer;pointer-events:auto;position:relative;box-shadow:${glow};
      ">${content}</div>`;
  }

  // Player stats
  const stats = ctx.getEffectiveStats();
  const statsHtml = `
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px 14px;font-size:14px;">
      <div style="color:#e88;">STR: ${stats.strength}</div>
      <div style="color:#8e8;">DEX: ${stats.dexterity}</div>
      <div style="color:#88e;">INT: ${stats.intelligence}</div>
      <div style="color:#ee8;">VIT: ${stats.vitality}</div>
      <div style="color:#aaa;">Armor: ${stats.armor}</div>
      <div style="color:#f88;">Crit: ${(stats.critChance * 100).toFixed(1)}%</div>
      <div style="color:#8af;">Speed: ${stats.moveSpeed.toFixed(1)}</div>
      <div style="color:#fa8;">AtkSpd: ${stats.attackSpeed.toFixed(2)}</div>
      <div style="color:#af8;">CritDmg: ${(stats.critDamage * 100).toFixed(0)}%</div>
    </div>`;

  ctx.menuEl.innerHTML = `
    <div style="
      width:100%;height:100%;
      ${SCREEN_BG}
      display:flex;flex-direction:column;
      align-items:center;justify-content:center;color:#fff;pointer-events:auto;position:relative;
    ">
      <!-- Parchment-style inner panel -->
      <div style="position:relative;padding:24px 36px;
        background:linear-gradient(180deg,rgba(30,24,14,0.95) 0%,rgba(20,16,8,0.98) 100%);
        border:2px solid #5a4a2a;border-radius:8px;
        box-shadow:inset 0 0 60px rgba(0,0,0,0.3),0 0 30px rgba(0,0,0,0.5);">
        <!-- Inner decorative border -->
        <div style="position:absolute;inset:4px;border:1px solid #3a2a1a;border-radius:6px;pointer-events:none;"></div>

        <!-- Title with ornamental flourishes -->
        <div style="text-align:center;margin-bottom:18px;">
          <div style="display:flex;align-items:center;justify-content:center;gap:12px;margin-bottom:6px;">
            <div style="width:60px;height:1px;background:linear-gradient(to right,transparent,#c8a84e);"></div>
            <span style="color:#c8a84e;font-size:10px;">\u2726</span>
            <span style="color:#5a4a2a;font-size:14px;">\u269C</span>
            <span style="color:#c8a84e;font-size:10px;">\u2726</span>
            <div style="width:60px;height:1px;background:linear-gradient(to left,transparent,#c8a84e);"></div>
          </div>
          <h2 style="color:#c8a84e;font-size:32px;letter-spacing:5px;margin:0;font-family:'Georgia',serif;
            text-shadow:0 0 16px rgba(200,168,78,0.35), 0 2px 4px rgba(0,0,0,0.6);">
            INVENTORY
          </h2>
          <div style="display:flex;align-items:center;justify-content:center;gap:12px;margin-top:6px;">
            <div style="width:60px;height:1px;background:linear-gradient(to right,transparent,#c8a84e);"></div>
            <span style="color:#c8a84e;font-size:10px;">\u2726</span>
            <span style="color:#5a4a2a;font-size:14px;">\u269C</span>
            <span style="color:#c8a84e;font-size:10px;">\u2726</span>
            <div style="width:60px;height:1px;background:linear-gradient(to left,transparent,#c8a84e);"></div>
          </div>
        </div>
        <div style="display:flex;gap:40px;align-items:flex-start;">
          <!-- Equipment with Vitruvian Man background -->
          <div>
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;justify-content:center;">
              <div style="width:30px;height:1px;background:linear-gradient(to right,transparent,#5a4a2a);"></div>
              <span style="color:#a08850;font-size:13px;letter-spacing:2px;text-transform:uppercase;">Equipment</span>
              <div style="width:30px;height:1px;background:linear-gradient(to left,transparent,#5a4a2a);"></div>
            </div>
            <div style="position:relative;">
              <!-- Vitruvian Man SVG background -->
              <svg viewBox="0 0 234 314" style="position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;opacity:0.12;z-index:0;" xmlns="http://www.w3.org/2000/svg">
                <!-- Outer circle -->
                <ellipse cx="117" cy="152" rx="110" ry="148" fill="none" stroke="#c8a84e" stroke-width="1.2"/>
                <!-- Inner square -->
                <rect x="27" y="32" width="180" height="250" fill="none" stroke="#c8a84e" stroke-width="0.8" rx="2"/>
                <!-- Head -->
                <circle cx="117" cy="52" r="18" fill="none" stroke="#c8a84e" stroke-width="1.0"/>
                <!-- Neck -->
                <line x1="117" y1="70" x2="117" y2="82" stroke="#c8a84e" stroke-width="1.0"/>
                <!-- Torso -->
                <path d="M 97 82 L 137 82 L 133 180 L 101 180 Z" fill="none" stroke="#c8a84e" stroke-width="1.0"/>
                <!-- Chest line -->
                <line x1="104" y1="100" x2="130" y2="100" stroke="#c8a84e" stroke-width="0.5"/>
                <!-- Navel -->
                <circle cx="117" cy="165" r="2" fill="#c8a84e" opacity="0.5"/>
                <!-- Arms (outstretched) -->
                <path d="M 97 88 L 55 100 L 18 92" fill="none" stroke="#c8a84e" stroke-width="1.0" stroke-linecap="round"/>
                <path d="M 137 88 L 179 100 L 216 92" fill="none" stroke="#c8a84e" stroke-width="1.0" stroke-linecap="round"/>
                <!-- Arms (angled up — second pose) -->
                <path d="M 97 88 L 48 68 L 14 42" fill="none" stroke="#c8a84e" stroke-width="0.6" stroke-linecap="round" opacity="0.5"/>
                <path d="M 137 88 L 186 68 L 220 42" fill="none" stroke="#c8a84e" stroke-width="0.6" stroke-linecap="round" opacity="0.5"/>
                <!-- Hands -->
                <circle cx="18" cy="92" r="4" fill="none" stroke="#c8a84e" stroke-width="0.6"/>
                <circle cx="216" cy="92" r="4" fill="none" stroke="#c8a84e" stroke-width="0.6"/>
                <!-- Left leg -->
                <path d="M 107 180 L 95 240 L 88 290" fill="none" stroke="#c8a84e" stroke-width="1.0" stroke-linecap="round"/>
                <!-- Right leg -->
                <path d="M 127 180 L 139 240 L 146 290" fill="none" stroke="#c8a84e" stroke-width="1.0" stroke-linecap="round"/>
                <!-- Legs (spread — second pose) -->
                <path d="M 107 180 L 72 248 L 48 296" fill="none" stroke="#c8a84e" stroke-width="0.6" stroke-linecap="round" opacity="0.5"/>
                <path d="M 127 180 L 162 248 L 186 296" fill="none" stroke="#c8a84e" stroke-width="0.6" stroke-linecap="round" opacity="0.5"/>
                <!-- Feet -->
                <line x1="82" y1="290" x2="94" y2="290" stroke="#c8a84e" stroke-width="0.8"/>
                <line x1="140" y1="290" x2="152" y2="290" stroke="#c8a84e" stroke-width="0.8"/>
                <!-- Proportion lines -->
                <line x1="117" y1="32" x2="117" y2="282" stroke="#c8a84e" stroke-width="0.3" stroke-dasharray="4,4" opacity="0.3"/>
                <line x1="27" y1="157" x2="207" y2="157" stroke="#c8a84e" stroke-width="0.3" stroke-dasharray="4,4" opacity="0.3"/>
              </svg>
              <div style="display:grid;grid-template-columns:74px 74px 74px;grid-template-rows:74px 74px 74px 74px;gap:6px;position:relative;z-index:1;">
                ${equipHtml}
              </div>
            </div>
            <!-- Gold filigree connection line -->
            <div style="width:100%;height:1px;background:linear-gradient(to right,transparent,#5a4a2a40,transparent);margin-top:8px;"></div>
          </div>
          <!-- Vertical section divider with ornament -->
          <div style="display:flex;flex-direction:column;align-items:center;align-self:stretch;margin:20px 0;gap:0;">
            <div style="color:#5a4a2a;font-size:10px;">\u25C6</div>
            <div style="flex:1;width:1px;background:linear-gradient(to bottom,#5a4a2a,#5a4a2a);"></div>
            <div style="color:#c8a84e;font-size:12px;">\u25C6</div>
            <div style="flex:1;width:1px;background:linear-gradient(to bottom,#5a4a2a,#5a4a2a);"></div>
            <div style="color:#5a4a2a;font-size:10px;">\u25C6</div>
          </div>
          <!-- Inventory Grid -->
          <div>
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;justify-content:center;">
              <div style="width:30px;height:1px;background:linear-gradient(to right,transparent,#5a4a2a);"></div>
              <span style="color:#a08850;font-size:13px;letter-spacing:2px;text-transform:uppercase;">Backpack</span>
              <div style="width:30px;height:1px;background:linear-gradient(to left,transparent,#5a4a2a);"></div>
            </div>
            <div style="display:flex;gap:6px;margin-bottom:6px;justify-content:center;">
              <button class="inv-sort-btn" data-sort="rarity" style="padding:3px 10px;font-size:11px;background:rgba(50,40,20,0.8);border:1px solid #5a4a2a;border-radius:4px;color:#c8a84e;cursor:pointer;font-family:Georgia,serif;">Sort: Rarity</button>
              <button class="inv-sort-btn" data-sort="type" style="padding:3px 10px;font-size:11px;background:rgba(50,40,20,0.8);border:1px solid #5a4a2a;border-radius:4px;color:#c8a84e;cursor:pointer;font-family:Georgia,serif;">Sort: Type</button>
              <button class="inv-sort-btn" data-sort="level" style="padding:3px 10px;font-size:11px;background:rgba(50,40,20,0.8);border:1px solid #5a4a2a;border-radius:4px;color:#c8a84e;cursor:pointer;font-family:Georgia,serif;">Sort: Level</button>
            </div>
            <div style="display:grid;grid-template-columns:repeat(8,62px);grid-template-rows:repeat(5,62px);gap:4px;">
              ${invHtml}
            </div>
          </div>
        </div>
        <!-- Horizontal section divider with diamond ornaments -->
        <div style="display:flex;align-items:center;gap:8px;margin:16px auto 12px;width:70%;justify-content:center;">
          <div style="flex:1;height:1px;background:linear-gradient(to right,transparent,#5a4a2a);"></div>
          <span style="color:#5a4a2a;font-size:8px;">\u25C6</span>
          <span style="color:#c8a84e;font-size:10px;">\u25C6</span>
          <span style="color:#5a4a2a;font-size:8px;">\u25C6</span>
          <div style="flex:1;height:1px;background:linear-gradient(to left,transparent,#5a4a2a);"></div>
        </div>
        <!-- Bottom bar: gold, materials, stats -->
        <div style="display:flex;gap:30px;align-items:center;justify-content:center;">
          <div style="display:flex;align-items:center;gap:6px;background:rgba(50,40,10,0.5);border:1px solid #5a4a2a;border-radius:6px;padding:8px 16px;">
            <span style="font-size:18px;">\uD83E\uDE99</span>
            <span style="font-size:16px;color:#ffd700;font-weight:bold;">${p.gold}</span>
          </div>
          <div style="display:flex;align-items:center;gap:6px;background:rgba(10,30,50,0.4);border:1px solid #3a5a7a;border-radius:6px;padding:8px 16px;">
            <span style="font-size:14px;color:#88ccff;">\u2699 Materials:</span>
            <span style="font-size:15px;color:#aaddff;font-weight:bold;">${p.salvageMaterials}</span>
          </div>
          <div style="background:rgba(20,15,10,0.9);border:1px solid #5a4a2a;border-radius:8px;padding:12px 16px;">
            ${statsHtml}
          </div>
        </div>
        <div style="margin-top:12px;display:flex;gap:16px;align-items:center;justify-content:center;">
          <button id="inv-stash-btn" style="
            padding:10px 24px;font-size:15px;letter-spacing:2px;font-weight:bold;
            background:linear-gradient(180deg,rgba(50,40,20,0.95),rgba(30,22,10,0.95));
            border:2px solid #5a4a2a;border-radius:8px;color:#c8a84e;
            cursor:pointer;transition:all 0.2s;font-family:'Georgia',serif;pointer-events:auto;
            text-shadow:0 1px 3px rgba(0,0,0,0.5);
          ">STASH</button>
          <button id="inv-socket-rune-btn" style="
            padding:10px 24px;font-size:15px;letter-spacing:2px;font-weight:bold;
            background:linear-gradient(180deg,rgba(40,20,50,0.95),rgba(25,10,35,0.95));
            border:2px solid #7a4a8a;border-radius:8px;color:#bb88dd;
            cursor:pointer;transition:all 0.2s;font-family:'Georgia',serif;pointer-events:auto;
            text-shadow:0 1px 3px rgba(0,0,0,0.5);
          ">SOCKET RUNE</button>
          <button id="inv-enchant-btn" style="
            padding:10px 24px;font-size:15px;letter-spacing:2px;font-weight:bold;
            background:linear-gradient(180deg,rgba(20,30,50,0.95),rgba(10,18,35,0.95));
            border:2px solid #4a7aba;border-radius:8px;color:#88bbff;
            cursor:pointer;transition:all 0.2s;font-family:'Georgia',serif;pointer-events:auto;
            text-shadow:0 1px 3px rgba(0,0,0,0.5);
          ">ENCHANT</button>
          <div style="color:#888;font-size:13px;">Press <span style="display:inline-block;background:rgba(60,50,30,0.8);border:1px solid #888;border-radius:4px;padding:2px 10px;font-family:monospace;color:#fff;">S</span> to open Shared Stash</div>
        </div>
        <div style="margin-top:10px;color:#666;font-size:13px;text-align:center;display:flex;gap:20px;justify-content:center;flex-wrap:wrap;">
          <span><span style="color:#bb88dd;">Socket Rune:</span> Left-click a rune, hover a socketed item, press <span style="display:inline-block;background:rgba(40,20,50,0.8);border:1px solid #7a4a8a;border-radius:4px;padding:1px 8px;font-family:monospace;color:#bb88dd;">SOCKET RUNE</span></span>
          <span>Hover item + <span style="display:inline-block;background:rgba(60,50,30,0.8);border:1px solid #888;border-radius:4px;padding:1px 8px;font-family:monospace;color:#ff8844;">Y</span> to destroy</span>
          <span>Press <span style="color:#aaa;">I</span> or <span style="color:#aaa;">Escape</span> to close</span>
        </div>
      </div>
      <!-- Tooltip container -->
      <div id="inv-tooltip" style="
        display:none;position:fixed;z-index:100;background:rgba(8,4,2,0.97);
        border:2px solid #5a4a2a;border-radius:8px;padding:0;max-width:400px;min-width:280px;
        pointer-events:none;color:#ccc;font-size:15px;overflow:hidden;
        box-shadow:0 4px 20px rgba(0,0,0,0.7),0 0 1px #c8a84e;
      "></div>
    </div>`;

  // Wire up equipment slot clicks (unequip)
  const equipSlots = ctx.menuEl.querySelectorAll(".equip-slot") as NodeListOf<HTMLDivElement>;
  equipSlots.forEach((el) => {
    const key = el.getAttribute("data-equip-key") as keyof DiabloEquipment;
    el.addEventListener("click", () => {
      const item = p.equipment[key];
      if (!item) return;
      const emptyIdx = p.inventory.findIndex((s) => s.item === null);
      if (emptyIdx < 0) return;
      p.inventory[emptyIdx].item = item;
      (p.equipment as any)[key] = null;
      if (key === "lantern" && p.lanternOn) {
        p.lanternOn = false;
        ctx.renderer.setPlayerLantern(false);
      }
      ctx.setStatsDirty(); ctx.setEquipDirty();
      ctx.recalculatePlayerStats();
      ctx.showInventory();
    });
    el.addEventListener("mouseenter", (ev) => ctx.showItemTooltip(ev, p.equipment[key]));
    el.addEventListener("mouseleave", () => ctx.hideItemTooltip());
  });

  // Wire up inventory slot clicks (equip) and right-click (drop)
  const invSlots = ctx.menuEl.querySelectorAll(".inv-slot") as NodeListOf<HTMLDivElement>;
  invSlots.forEach((el) => {
    const idx = parseInt(el.getAttribute("data-inv-idx")!, 10);
    el.addEventListener("click", () => {
      const item = p.inventory[idx].item;
      if (!item) return;
      const ek = resolveEquipKey(item.slot as string);
      if (!ek) return;
      const existing = p.equipment[ek];
      (p.equipment as any)[ek] = item;
      p.inventory[idx].item = existing;
      if (ek === "lantern" && p.lanternOn) {
        const cfg = LANTERN_CONFIGS[item.name];
        if (cfg) ctx.renderer.setPlayerLantern(true, cfg.intensity, cfg.distance, cfg.color);
      }
      ctx.setStatsDirty(); ctx.setEquipDirty();
      ctx.recalculatePlayerStats();
      ctx.checkRunewords();
      ctx.showInventory();
    });
    el.addEventListener("contextmenu", (ev) => {
      ev.preventDefault();
      ev.stopPropagation();
      const item = p.inventory[idx].item;
      if (!item) return;
      if (ev.shiftKey) {
        ctx.toggleItemLock(idx);
        ctx.showInventory();
        return;
      }
      if (item.isLocked) {
        ctx.addFloatingText(p.x, p.y + 2, p.z, 'Item is locked!', '#ff4444');
        return;
      }
      p.inventory[idx].item = null;
      const loot: DiabloLoot = {
        id: ctx.genId(),
        item,
        x: p.x + (Math.random() * 2 - 1),
        y: 0,
        z: p.z + (Math.random() * 2 - 1),
        timer: 0,
      };
      ctx.state.loot.push(loot);
      ctx.showInventory();
    });
    el.addEventListener("mouseenter", (ev) => {
      ctx.showItemTooltip(ev, p.inventory[idx].item);
      (ctx.menuEl as any)._hoveredInvSlot = idx;
    });
    el.addEventListener("mouseleave", () => {
      ctx.hideItemTooltip();
      if ((ctx.menuEl as any)._hoveredInvSlot === idx) (ctx.menuEl as any)._hoveredInvSlot = -1;
    });
  });

  // T key to trash hovered item
  const trashKeyHandler = (e: KeyboardEvent) => {
    if (e.code !== "KeyY") return;
    const hovIdx = (ctx.menuEl as any)._hoveredInvSlot;
    if (hovIdx === undefined || hovIdx < 0) return;
    const item = p.inventory[hovIdx]?.item;
    if (!item) return;
    if (item.isLocked) {
      ctx.addFloatingText(p.x, p.y + 2, p.z, 'Item is locked!', '#ff4444');
      return;
    }
    const gold = Math.max(1, Math.floor((item.value || 0) * 0.3));
    p.gold += gold;
    ctx.addFloatingText(p.x, p.y + 2, p.z, `Destroyed ${item.name} (+${gold}g)`, '#ff8844');
    p.inventory[hovIdx].item = null;
    ctx.hideItemTooltip();
    window.removeEventListener("keydown", trashKeyHandler);
    ctx.showInventory();
  };
  window.addEventListener("keydown", trashKeyHandler);
  // Clean up listener when inventory closes (menuEl gets cleared)
  const observer = new MutationObserver(() => {
    if (!ctx.menuEl.querySelector("#inv-tooltip")) {
      window.removeEventListener("keydown", trashKeyHandler);
      observer.disconnect();
    }
  });
  observer.observe(ctx.menuEl, { childList: true });

  // Sort buttons
  const sortBtns = ctx.menuEl.querySelectorAll(".inv-sort-btn") as NodeListOf<HTMLButtonElement>;
  sortBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      const sortBy = btn.getAttribute("data-sort") as 'rarity' | 'type' | 'level';
      ctx.sortInventory(sortBy);
      ctx.showInventory();
    });
    btn.addEventListener("mouseenter", () => { btn.style.borderColor = "#c8a84e"; btn.style.background = "rgba(70,55,25,0.9)"; });
    btn.addEventListener("mouseleave", () => { btn.style.borderColor = "#5a4a2a"; btn.style.background = "rgba(50,40,20,0.8)"; });
  });

  // Stash button
  const stashBtn = ctx.menuEl.querySelector("#inv-stash-btn") as HTMLButtonElement | null;
  if (stashBtn) {
    stashBtn.addEventListener("mouseenter", () => {
      stashBtn.style.borderColor = "#c8a84e";
      stashBtn.style.boxShadow = "0 0 15px rgba(200,168,78,0.3)";
      stashBtn.style.background = "rgba(50,40,20,0.95)";
    });
    stashBtn.addEventListener("mouseleave", () => {
      stashBtn.style.borderColor = "#5a4a2a";
      stashBtn.style.boxShadow = "none";
      stashBtn.style.background = "rgba(40,30,15,0.9)";
    });
    stashBtn.addEventListener("click", () => {
      ctx.showStash();
    });
  }

  // Socket Rune button (not yet functional — placeholder)
  const socketBtn = ctx.menuEl.querySelector("#inv-socket-rune-btn") as HTMLButtonElement | null;
  if (socketBtn) {
    socketBtn.addEventListener("mouseenter", () => {
      socketBtn.style.borderColor = "#bb88dd";
      socketBtn.style.boxShadow = "0 0 15px rgba(187,136,221,0.3)";
      socketBtn.style.background = "rgba(50,20,60,0.95)";
    });
    socketBtn.addEventListener("mouseleave", () => {
      socketBtn.style.borderColor = "#7a4a8a";
      socketBtn.style.boxShadow = "none";
      socketBtn.style.background = "rgba(40,20,50,0.9)";
    });
    socketBtn.addEventListener("click", () => {
      // TODO: implement rune socketing
      // Flow: player left-clicks a rune in inventory (selecting it),
      // hovers over a socketed item, then clicks this button to insert
      // the rune into the first empty socket.
    });
  }

  // Enchant button
  const enchantBtn = ctx.menuEl.querySelector("#inv-enchant-btn") as HTMLButtonElement | null;
  if (enchantBtn) {
    enchantBtn.addEventListener("mouseenter", () => {
      enchantBtn.style.borderColor = "#88bbff";
      enchantBtn.style.boxShadow = "0 0 15px rgba(136,187,255,0.3)";
      enchantBtn.style.background = "rgba(30,40,60,0.95)";
    });
    enchantBtn.addEventListener("mouseleave", () => {
      enchantBtn.style.borderColor = "#4a7aba";
      enchantBtn.style.boxShadow = "none";
      enchantBtn.style.background = "rgba(20,30,50,0.95)";
    });
    enchantBtn.addEventListener("click", () => {
      showEnchantingModal(ctx);
    });
  }
}

// ════════════════════════════════════════════════════════════════════════════
//  3b. Enchanting Modal (Mystic)
// ════════════════════════════════════════════════════════════════════════════

const ENCHANT_STAT_NAMES: Record<string, string> = {
  strength: 'Strength', dexterity: 'Dexterity', intelligence: 'Intelligence',
  vitality: 'Vitality', armor: 'Armor', critChance: 'Crit Chance',
  critDamage: 'Crit Damage', attackSpeed: 'Attack Speed', moveSpeed: 'Move Speed',
  fireResist: 'Fire Resist', iceResist: 'Ice Resist', lightningResist: 'Lightning Resist',
  poisonResist: 'Poison Resist', lifeSteal: 'Life Steal', manaRegen: 'Mana Regen',
  bonusDamage: 'Bonus Damage', bonusHealth: 'Bonus Health', bonusMana: 'Bonus Mana',
};

const ENCHANT_STAT_RANGES: Record<string, { min: number; max: number; perLevel: number }> = {
  strength: { min: 3, max: 20, perLevel: 0.5 },
  dexterity: { min: 3, max: 20, perLevel: 0.5 },
  intelligence: { min: 3, max: 20, perLevel: 0.5 },
  vitality: { min: 3, max: 20, perLevel: 0.5 },
  armor: { min: 2, max: 15, perLevel: 0.3 },
  critChance: { min: 0.01, max: 0.08, perLevel: 0.001 },
  critDamage: { min: 0.05, max: 0.30, perLevel: 0.005 },
  attackSpeed: { min: 0.02, max: 0.15, perLevel: 0.002 },
  moveSpeed: { min: 0.1, max: 1.0, perLevel: 0.02 },
  fireResist: { min: 2, max: 15, perLevel: 0.2 },
  iceResist: { min: 2, max: 15, perLevel: 0.2 },
  lightningResist: { min: 2, max: 15, perLevel: 0.2 },
  poisonResist: { min: 2, max: 15, perLevel: 0.2 },
  lifeSteal: { min: 0.01, max: 0.05, perLevel: 0.001 },
  manaRegen: { min: 1, max: 8, perLevel: 0.1 },
  bonusDamage: { min: 5, max: 30, perLevel: 0.8 },
  bonusHealth: { min: 10, max: 60, perLevel: 1.5 },
  bonusMana: { min: 5, max: 30, perLevel: 0.5 },
};

function getEnchantCost(itemLevel: number, rarity: ItemRarity): { gold: number; materials: number } {
  const rarityMult: Record<ItemRarity, number> = {
    [ItemRarity.COMMON]: 1, [ItemRarity.UNCOMMON]: 1.5, [ItemRarity.RARE]: 2.5,
    [ItemRarity.EPIC]: 4, [ItemRarity.LEGENDARY]: 8, [ItemRarity.MYTHIC]: 15, [ItemRarity.DIVINE]: 25,
  };
  const mult = rarityMult[rarity] || 1;
  return {
    gold: Math.floor((50 + itemLevel * 10) * mult),
    materials: Math.floor((2 + itemLevel * 0.3) * mult),
  };
}

function rollEnchantStat(statKey: string, itemLevel: number): number {
  const range = ENCHANT_STAT_RANGES[statKey];
  if (!range) return 0;
  const min = range.min + itemLevel * range.perLevel * 0.3;
  const max = range.max + itemLevel * range.perLevel;
  const val = min + Math.random() * (max - min);
  // Round to appropriate precision
  if (statKey === 'critChance' || statKey === 'critDamage' || statKey === 'attackSpeed' || statKey === 'lifeSteal') {
    return Math.round(val * 1000) / 1000;
  }
  return Math.round(val * 10) / 10;
}

function formatStatValue(key: string, val: number): string {
  if (key === 'critChance' || key === 'lifeSteal') return `${(val * 100).toFixed(1)}%`;
  if (key === 'critDamage' || key === 'attackSpeed') return `${(val * 100).toFixed(0)}%`;
  return `${val}`;
}

function showEnchantingModal(ctx: ScreenContext): void {
  const p = ctx.state.player;

  // Gather all enchantable items (equipped + inventory)
  const items: { item: DiabloItem; source: string; index: number }[] = [];
  const equipKeys = Object.keys(p.equipment) as (keyof typeof p.equipment)[];
  for (const key of equipKeys) {
    const item = p.equipment[key];
    if (item && item.rarity !== ItemRarity.COMMON) {
      items.push({ item, source: `equip:${key}`, index: -1 });
    }
  }
  for (let i = 0; i < p.inventory.length; i++) {
    const slot = p.inventory[i];
    if (slot.item && slot.item.rarity !== ItemRarity.COMMON) {
      items.push({ item: slot.item, source: 'inv', index: i });
    }
  }

  // Create modal overlay
  const overlay = document.createElement('div');
  overlay.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.8);z-index:150;display:flex;align-items:center;justify-content:center;pointer-events:auto;';

  const panel = document.createElement('div');
  panel.style.cssText = 'background:rgba(10,15,25,0.97);border:2px solid #4a7aba;border-radius:12px;padding:20px 28px;color:#ccc;font-family:Georgia,serif;max-width:600px;width:90%;max-height:80vh;overflow-y:auto;box-shadow:0 0 30px rgba(68,136,255,0.3);';

  let selectedItemIdx = -1;
  let selectedStat = '';

  const render = () => {
    let html = `<h2 style="color:#88bbff;margin:0 0 12px;text-align:center;font-size:20px;">\uD83D\uDD2E Mystic Enchanting</h2>`;
    html += `<p style="color:#888;font-size:13px;text-align:center;margin-bottom:14px;">Reroll one stat on an item. Choose an item, then select which stat to reroll.</p>`;
    html += `<div style="color:#aaa;font-size:13px;text-align:center;margin-bottom:14px;">\uD83D\uDCB0 ${p.gold} Gold | \u2699 ${p.salvageMaterials} Materials</div>`;

    // Item selection
    html += `<div style="display:flex;flex-wrap:wrap;gap:6px;justify-content:center;margin-bottom:16px;">`;
    for (let i = 0; i < items.length; i++) {
      const it = items[i].item;
      const rCss = RARITY_CSS[it.rarity] || '';
      const selected = i === selectedItemIdx;
      html += `<div class="enchant-item" data-idx="${i}" style="
        padding:6px 10px;border:2px solid ${selected ? '#88bbff' : '#333'};border-radius:6px;
        background:${selected ? 'rgba(40,60,100,0.8)' : 'rgba(20,20,30,0.7)'};cursor:pointer;
        font-size:12px;text-align:center;min-width:70px;transition:border-color 0.15s;
      ">
        <div style="font-size:14px;">${it.icon}</div>
        <div style="${rCss}">${it.name.length > 12 ? it.name.substring(0, 12) + '..' : it.name}</div>
        <div style="color:#666;font-size:11px;">Lv${it.level}</div>
      </div>`;
    }
    html += `</div>`;

    // Stat selection for chosen item
    if (selectedItemIdx >= 0) {
      const it = items[selectedItemIdx].item;
      const cost = getEnchantCost(it.level, it.rarity);
      const canAfford = p.gold >= cost.gold && p.salvageMaterials >= cost.materials;

      html += `<div style="border:1px solid #3a5a7a;border-radius:8px;padding:12px;margin-bottom:12px;">`;
      html += `<div style="color:#88bbff;font-weight:bold;margin-bottom:8px;">Select a stat to reroll on <span style="${RARITY_CSS[it.rarity] || ''}">${it.name}</span>:</div>`;
      html += `<div style="color:#aaa;font-size:12px;margin-bottom:8px;">Cost: <span style="color:${canAfford ? '#ffd700' : '#ff4444'}">${cost.gold} gold + ${cost.materials} materials</span></div>`;

      const statKeys = Object.keys(it.stats).filter(k => (it.stats as any)[k] !== undefined && (it.stats as any)[k] !== 0);
      if (statKeys.length === 0) {
        html += `<div style="color:#666;">This item has no stats to enchant.</div>`;
      } else {
        html += `<div style="display:flex;flex-direction:column;gap:4px;">`;
        for (const key of statKeys) {
          const val = (it.stats as any)[key];
          const name = ENCHANT_STAT_NAMES[key] || key;
          const isSelected = key === selectedStat;
          html += `<div class="enchant-stat" data-stat="${key}" style="
            display:flex;justify-content:space-between;align-items:center;
            padding:6px 10px;border:1px solid ${isSelected ? '#88bbff' : '#333'};border-radius:4px;
            background:${isSelected ? 'rgba(40,60,100,0.6)' : 'rgba(15,15,25,0.6)'};cursor:pointer;
            transition:all 0.15s;
          ">
            <span style="color:#ddd;">${name}</span>
            <span style="color:#88ff88;font-family:monospace;">${formatStatValue(key, val)}</span>
          </div>`;
        }
        html += `</div>`;
      }
      html += `</div>`;

      // Enchant button
      if (selectedStat && canAfford) {
        html += `<div style="text-align:center;margin-top:12px;">
          <button id="enchant-execute" style="
            padding:10px 32px;font-size:16px;font-weight:bold;font-family:Georgia,serif;
            background:linear-gradient(180deg,rgba(30,50,80,0.95),rgba(15,30,55,0.95));
            border:2px solid #88bbff;border-radius:8px;color:#88bbff;cursor:pointer;
            transition:all 0.2s;text-shadow:0 1px 3px rgba(0,0,0,0.5);letter-spacing:2px;
          ">ENCHANT</button>
        </div>`;
      } else if (selectedStat && !canAfford) {
        html += `<div style="text-align:center;color:#ff4444;margin-top:8px;">Not enough gold or materials</div>`;
      }
    }

    if (items.length === 0) {
      html += `<div style="color:#666;text-align:center;">No enchantable items (Common items cannot be enchanted)</div>`;
    }

    // Close button
    html += `<div style="text-align:center;margin-top:14px;">
      <button id="enchant-close" style="
        padding:8px 24px;font-size:14px;background:rgba(40,30,20,0.9);
        border:1px solid #555;border-radius:6px;color:#aaa;cursor:pointer;font-family:Georgia,serif;
      ">Close</button>
    </div>`;

    panel.innerHTML = html;

    // Bind events
    panel.querySelectorAll('.enchant-item').forEach(el => {
      el.addEventListener('click', () => {
        selectedItemIdx = parseInt((el as HTMLElement).dataset.idx || '-1');
        selectedStat = '';
        render();
      });
    });
    panel.querySelectorAll('.enchant-stat').forEach(el => {
      el.addEventListener('click', () => {
        selectedStat = (el as HTMLElement).dataset.stat || '';
        render();
      });
    });
    const execBtn = panel.querySelector('#enchant-execute');
    if (execBtn) {
      execBtn.addEventListener('click', () => {
        const entry = items[selectedItemIdx];
        if (!entry) return;
        const it = entry.item;
        const cost = getEnchantCost(it.level, it.rarity);
        if (p.gold < cost.gold || p.salvageMaterials < cost.materials) return;

        // Pay cost
        p.gold -= cost.gold;
        p.salvageMaterials -= cost.materials;

        // Reroll the selected stat
        const oldVal = (it.stats as any)[selectedStat];
        const newVal = rollEnchantStat(selectedStat, it.level);
        (it.stats as any)[selectedStat] = newVal;

        // Recalculate player stats
        ctx.recalculatePlayerStats();

        // Show result as a brief flash
        const resultDiv = document.createElement('div');
        resultDiv.style.cssText = 'position:fixed;top:30%;left:50%;transform:translate(-50%,-50%);z-index:200;background:rgba(10,20,40,0.95);border:2px solid #88bbff;border-radius:8px;padding:16px 28px;color:#fff;font-family:Georgia,serif;text-align:center;pointer-events:none;';
        const name = ENCHANT_STAT_NAMES[selectedStat] || selectedStat;
        const improved = newVal > oldVal;
        resultDiv.innerHTML = `
          <div style="font-size:14px;color:#88bbff;margin-bottom:6px;">${name} Rerolled!</div>
          <div style="font-size:18px;">
            <span style="color:#888;">${formatStatValue(selectedStat, oldVal)}</span>
            <span style="color:#666;"> \u2192 </span>
            <span style="color:${improved ? '#44ff44' : '#ff6644'};font-weight:bold;">${formatStatValue(selectedStat, newVal)}</span>
          </div>
        `;
        document.body.appendChild(resultDiv);
        setTimeout(() => { resultDiv.style.opacity = '0'; resultDiv.style.transition = 'opacity 0.5s'; }, 1200);
        setTimeout(() => { resultDiv.remove(); }, 1800);

        render();
      });
    }
    const closeBtn = panel.querySelector('#enchant-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        overlay.remove();
        ctx.showInventory(); // Refresh inventory display
      });
    }
  };

  overlay.appendChild(panel);
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) { overlay.remove(); ctx.showInventory(); }
  });
  ctx.menuEl.appendChild(overlay);
  render();
}

// ════════════════════════════════════════════════════════════════════════════
//  4. showCollection
// ════════════════════════════════════════════════════════════════════════════

export function showCollection(ctx: ScreenContext): void {
  // Inject styles once
  if (!document.getElementById("codex-menu-styles")) {
    const styleEl = document.createElement("style");
    styleEl.id = "codex-menu-styles";
    styleEl.textContent = `
      .diablo-menu-scroll::-webkit-scrollbar { width: 8px; }
      .diablo-menu-scroll::-webkit-scrollbar-track { background: rgba(10,8,4,0.6); border-radius: 4px; }
      .diablo-menu-scroll::-webkit-scrollbar-thumb { background: linear-gradient(180deg, #5a4a2a, #3a2a1a); border-radius: 4px; border: 1px solid #6b5a3a; }
      .diablo-menu-scroll::-webkit-scrollbar-thumb:hover { background: linear-gradient(180deg, #7a6a4a, #5a4a2a); }
      @keyframes codex-panel-enter { from { opacity: 0; transform: scale(0.96) translateY(10px); } to { opacity: 1; transform: scale(1) translateY(0); } }
      .codex-panel-anim { animation: codex-panel-enter 0.3s ease-out; }
      @keyframes codex-legendary-shimmer { 0%,100% { background-position: -200% center; } 50% { background-position: 200% center; } }
      .codex-item:hover { transform: scale(1.08); filter: brightness(1.2); }
      .codex-item { transition: transform 0.2s, filter 0.2s; cursor: pointer; }
      .codex-map-section:hover { border-color: #7a6a4a; }
      .codex-map-section { transition: border-color 0.3s; }
    `;
    document.head.appendChild(styleEl);
  }

  const p = ctx.state.player;

  // Build set of all owned item names
  const ownedNames = new Set<string>();
  const eqKeys: (keyof DiabloEquipment)[] = ["helmet", "body", "gauntlets", "legs", "feet", "accessory1", "accessory2", "weapon", "lantern"];
  for (const k of eqKeys) {
    const it = p.equipment[k];
    if (it) ownedNames.add(it.name);
  }
  for (const slot of p.inventory) {
    if (slot.item) ownedNames.add(slot.item.name);
  }
  for (const slot of ctx.state.persistentStash) {
    if (slot.item) ownedNames.add(slot.item.name);
  }
  for (const slot of ctx.state.persistentInventory) {
    if (slot.item) ownedNames.add(slot.item.name);
  }

  // Build item lookup by name
  const itemByName: Record<string, DiabloItem> = {};
  for (const it of ITEM_DATABASE) {
    itemByName[it.name] = it;
  }

  // Build set bonus lookup by setName
  const setBonusByName: Record<string, { pieces: number; bonusDescription: string }> = {};
  for (const sb of SET_BONUSES) {
    setBonusByName[sb.setName] = { pieces: sb.pieces, bonusDescription: sb.bonusDescription };
  }

  // Totals
  let totalSets = 0;
  let collectedSets = 0;
  let totalUniques = 0;
  let collectedUniques = 0;

  // Build map sections HTML
  let mapSectionsHtml = "";
  const mapIds = Object.keys(MAP_SPECIFIC_ITEMS);

  for (const mapId of mapIds) {
    const itemNames = MAP_SPECIFIC_ITEMS[mapId];
    const mapCfg = MAP_CONFIGS[mapId as DiabloMapId];
    const mapDisplayName = mapCfg ? mapCfg.name : mapId;

    // Separate set items and unique items
    const setItems: DiabloItem[] = [];
    const uniqueItems: DiabloItem[] = [];
    let setName = "";

    for (const name of itemNames) {
      const it = itemByName[name];
      if (!it) continue;
      if (it.setName) {
        setItems.push(it);
        if (!setName) setName = it.setName;
      } else if (it.rarity === ItemRarity.LEGENDARY || it.legendaryAbility) {
        uniqueItems.push(it);
      }
    }

    // Level range from items
    const allItems = [...setItems, ...uniqueItems];
    const levels = allItems.map(i => i.level).filter(l => l > 0);
    const minLevel = levels.length > 0 ? Math.min(...levels) : 0;
    const maxLevel = levels.length > 0 ? Math.max(...levels) : 0;
    const levelStr = minLevel === maxLevel ? `Lv ${minLevel}` : `Lv ${minLevel}-${maxLevel}`;

    // Set progress
    const setOwned = setItems.filter(i => ownedNames.has(i.name)).length;
    const setTotal = setItems.length;
    if (setTotal > 0) {
      totalSets++;
      if (setOwned >= setTotal) collectedSets++;
    }

    // Unique progress
    for (const ui of uniqueItems) {
      totalUniques++;
      if (ownedNames.has(ui.name)) collectedUniques++;
    }

    // Set bonus info
    const bonus = setName ? setBonusByName[setName] : null;
    const setProgressPct = setTotal > 0 ? Math.round((setOwned / setTotal) * 100) : 0;

    // Build set items row
    let setItemsHtml = "";
    for (const it of setItems) {
      const owned = ownedNames.has(it.name);
      const color = RARITY_CSS[it.rarity];
      const glow = owned ? `box-shadow: 0 0 10px ${color}, 0 0 4px ${color} inset;` : "";
      const overlay = owned ? "" : `
        <div style="position:absolute;inset:0;background:rgba(0,0,0,0.65);border-radius:6px;
          display:flex;align-items:center;justify-content:center;font-size:24px;color:#555;">?</div>`;
      const filter = owned ? "" : "filter: grayscale(0.8) brightness(0.5);";
      setItemsHtml += `
        <div class="codex-item codex-set-item" data-item-name="${it.name}" style="
          position:relative;width:62px;height:62px;background:rgba(15,10,5,0.9);
          border:2px solid ${owned ? color : '#3a3a3a'};border-radius:6px;
          display:flex;flex-direction:column;align-items:center;justify-content:center;
          ${glow}${filter}
        ">
          <div style="font-size:24px;">${it.icon}</div>
          <div style="font-size:8px;color:${owned ? color : '#666'};margin-top:2px;
            text-align:center;overflow:hidden;white-space:nowrap;text-overflow:ellipsis;
            max-width:56px;">${it.name.split(/\s/).slice(-1)[0]}</div>
          ${overlay}
        </div>`;
    }

    // Build unique items
    let uniqueItemsHtml = "";
    for (const it of uniqueItems) {
      const owned = ownedNames.has(it.name);
      const color = RARITY_CSS[it.rarity];
      const glow = owned ? `box-shadow: 0 0 14px ${color}, 0 0 6px ${color} inset, 0 0 20px rgba(255,136,0,0.2);` : "";
      const overlay = owned ? "" : `
        <div style="position:absolute;inset:0;background:rgba(0,0,0,0.65);border-radius:6px;
          display:flex;align-items:center;justify-content:center;font-size:24px;color:#555;">?</div>`;
      const filter = owned ? "" : "filter: grayscale(0.8) brightness(0.5);";
      const legendaryBorder = owned ? `border-image: linear-gradient(135deg, #ffd700, #ff8800, #ffd700) 1;` : "";
      uniqueItemsHtml += `
        <div style="display:flex;align-items:center;gap:12px;margin-top:8px;">
          <div class="codex-item codex-unique-item" data-item-name="${it.name}" style="
            position:relative;width:62px;height:62px;min-width:62px;
            background:rgba(15,10,5,0.9);
            border:2px solid ${owned ? '#ffd700' : '#3a3a3a'};border-radius:6px;
            display:flex;flex-direction:column;align-items:center;justify-content:center;
            ${glow}${filter}${legendaryBorder}
          ">
            <div style="font-size:24px;">${it.icon}</div>
            ${overlay}
          </div>
          <div style="flex:1;">
            <div style="color:${owned ? color : '#555'};font-size:13px;font-weight:bold;
              font-family:'Cinzel','Georgia',serif;">${owned ? it.name : '???'}</div>
            ${it.legendaryAbility && owned ? `
              <div style="color:#ff8800;font-size:11px;font-style:italic;margin-top:2px;
                border-left:2px solid rgba(255,136,0,0.4);padding-left:6px;
                background:linear-gradient(90deg,rgba(255,136,0,0.06),transparent);
              ">${it.legendaryAbility}</div>` : (it.legendaryAbility ? `
              <div style="color:#555;font-size:11px;font-style:italic;margin-top:2px;">
                Legendary power unknown...</div>` : "")}
          </div>
        </div>`;
    }

    // Set bonus callout
    let setBonusHtml = "";
    if (bonus && setName) {
      const bonusActive = setOwned >= (bonus.pieces || setTotal);
      setBonusHtml = `
        <div style="margin-top:8px;padding:8px 10px;
          background:${bonusActive ? 'rgba(68,255,68,0.08)' : 'rgba(30,24,14,0.6)'};
          border:1px solid ${bonusActive ? 'rgba(68,255,68,0.3)' : 'rgba(90,74,42,0.2)'};
          border-radius:4px;">
          <div style="font-size:11px;color:${bonusActive ? '#44ff44' : '#666'};">
            <span style="color:${bonusActive ? '#6f6' : '#888'};">&#9830; Set Bonus (${bonus.pieces || setTotal}pc):</span>
            ${bonus.bonusDescription}
          </div>
        </div>`;
    }

    mapSectionsHtml += `
      <div class="codex-map-section" style="
        background:linear-gradient(135deg,rgba(22,16,8,0.95),rgba(30,22,12,0.9));
        border:1px solid rgba(90,74,42,0.3);border-radius:8px;padding:16px;margin-bottom:12px;
      ">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
          <div>
            <span style="color:#c8a84e;font-size:15px;font-weight:bold;
              font-family:'Cinzel','Georgia',serif;letter-spacing:1px;">
              &#10070; ${mapDisplayName}
            </span>
            <span style="color:#888;font-size:11px;margin-left:8px;">${levelStr}</span>
          </div>
          <div style="color:#888;font-size:11px;">Drop Location</div>
        </div>

        ${setItems.length > 0 ? `
          <div style="margin-bottom:6px;">
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">
              <span style="color:#44ff44;font-size:12px;font-family:'Cinzel','Georgia',serif;">
                ${setName}</span>
              <span style="color:#888;font-size:11px;">${setOwned}/${setTotal} pieces</span>
              <div style="flex:1;height:4px;background:rgba(30,24,14,0.8);border-radius:2px;
                max-width:120px;overflow:hidden;">
                <div style="width:${setProgressPct}%;height:100%;
                  background:linear-gradient(90deg,#44ff44,#88ff88);border-radius:2px;
                  transition:width 0.3s;"></div>
              </div>
            </div>
            <div style="display:flex;gap:8px;flex-wrap:wrap;">
              ${setItemsHtml}
            </div>
          </div>
          ${setBonusHtml}
        ` : ""}

        ${uniqueItems.length > 0 ? `
          <div style="margin-top:${setItems.length > 0 ? '12' : '0'}px;
            border-top:${setItems.length > 0 ? '1px solid rgba(90,74,42,0.2)' : 'none'};
            padding-top:${setItems.length > 0 ? '10' : '0'}px;">
            <div style="color:#ff8800;font-size:11px;margin-bottom:4px;letter-spacing:1px;">
              &#10022; LEGENDARY</div>
            ${uniqueItemsHtml}
          </div>
        ` : ""}
      </div>`;
  }

  // Summary counts
  const totalSetPieces = Object.values(MAP_SPECIFIC_ITEMS).reduce((sum, names) => {
    return sum + names.filter(n => { const it = itemByName[n]; return it && !!it.setName; }).length;
  }, 0);
  const ownedSetPieces = Object.values(MAP_SPECIFIC_ITEMS).reduce((sum, names) => {
    return sum + names.filter(n => { const it = itemByName[n]; return it && !!it.setName && ownedNames.has(n); }).length;
  }, 0);

  ctx.menuEl.innerHTML = `
    <div style="
      position:absolute;inset:0;${SCREEN_BG}display:flex;
      align-items:center;justify-content:center;z-index:100;pointer-events:auto;
    ">
      <div class="codex-panel-anim" style="
        width:min(820px,92vw);max-height:88vh;overflow-y:auto;
        background:rgba(18,12,6,0.97);border:2px solid #c8a84e;border-radius:12px;
        padding:28px 32px;position:relative;
        box-shadow:0 0 40px rgba(200,168,78,0.15), 0 0 80px rgba(0,0,0,0.6);
        font-family:'Cinzel','Palatino Linotype','Book Antiqua',Georgia,serif;
        color:#ddd;
      " class="diablo-menu-scroll">

        <!-- Corner flourishes -->
        <div style="position:absolute;top:6px;left:10px;color:rgba(200,168,78,0.25);
          font-size:18px;pointer-events:none;">&#9884;</div>
        <div style="position:absolute;top:6px;right:10px;color:rgba(200,168,78,0.25);
          font-size:18px;pointer-events:none;">&#9884;</div>
        <div style="position:absolute;bottom:6px;left:10px;color:rgba(200,168,78,0.25);
          font-size:18px;pointer-events:none;">&#9884;</div>
        <div style="position:absolute;bottom:6px;right:10px;color:rgba(200,168,78,0.25);
          font-size:18px;pointer-events:none;">&#9884;</div>

        <!-- Title -->
        <div style="text-align:center;margin-bottom:20px;">
          <div style="color:rgba(200,168,78,0.4);font-size:12px;letter-spacing:4px;">
            ${'='.repeat(20)}</div>
          <h2 style="color:#c8a84e;font-size:28px;letter-spacing:6px;margin:8px 0;
            text-shadow:0 0 20px rgba(200,168,78,0.3);
            font-family:'Cinzel','Georgia',serif;">
            &#10070; COLLECTION CODEX &#10070;</h2>
          <div style="color:rgba(200,168,78,0.4);font-size:12px;letter-spacing:4px;">
            ${'='.repeat(20)}</div>
        </div>

        <!-- Summary bar -->
        <div style="display:flex;justify-content:center;gap:32px;margin-bottom:20px;
          padding:10px 16px;background:rgba(30,24,14,0.6);border:1px solid rgba(90,74,42,0.3);
          border-radius:6px;">
          <div style="text-align:center;">
            <div style="color:#44ff44;font-size:18px;font-weight:bold;">
              ${collectedSets}/${totalSets}</div>
            <div style="color:#888;font-size:10px;letter-spacing:1px;">SETS COMPLETE</div>
          </div>
          <div style="width:1px;background:rgba(90,74,42,0.3);"></div>
          <div style="text-align:center;">
            <div style="color:#44ff44;font-size:18px;font-weight:bold;">
              ${ownedSetPieces}/${totalSetPieces}</div>
            <div style="color:#888;font-size:10px;letter-spacing:1px;">SET PIECES</div>
          </div>
          <div style="width:1px;background:rgba(90,74,42,0.3);"></div>
          <div style="text-align:center;">
            <div style="color:#ff8800;font-size:18px;font-weight:bold;">
              ${collectedUniques}/${totalUniques}</div>
            <div style="color:#888;font-size:10px;letter-spacing:1px;">LEGENDARIES</div>
          </div>
        </div>

        <!-- Map sections -->
        ${mapSectionsHtml}

        <!-- Close button -->
        <div style="text-align:center;margin-top:20px;">
          <button id="codex-close-btn" style="
            width:200px;padding:12px 0;font-size:18px;letter-spacing:3px;font-weight:bold;
            background:rgba(40,30,15,0.9);border:2px solid #5a4a2a;border-radius:8px;
            color:#c8a84e;cursor:pointer;transition:all 0.2s;
            font-family:'Georgia',serif;pointer-events:auto;
          ">CLOSE</button>
        </div>

        <div style="text-align:center;margin-top:12px;color:#555;font-size:10px;
          letter-spacing:1px;">Press <span style="color:#c8a84e;">N</span> or
          <span style="color:#c8a84e;">ESC</span> to close</div>

      </div>
      <div id="inv-tooltip" style="
        position:fixed;display:none;pointer-events:none;z-index:200;
        background:rgba(12,8,4,0.97);border:2px solid #5a4a2a;border-radius:8px;
        padding:12px;max-width:280px;min-width:180px;
        box-shadow:0 4px 20px rgba(0,0,0,0.8);
        font-family:'Cinzel','Palatino Linotype','Book Antiqua',Georgia,serif;
      "></div>
    </div>`;

  // Wire close button
  const closeBtn = ctx.menuEl.querySelector("#codex-close-btn") as HTMLButtonElement;
  closeBtn.addEventListener("mouseenter", () => {
    closeBtn.style.borderColor = "#c8a84e";
    closeBtn.style.boxShadow = "0 0 15px rgba(200,168,78,0.3)";
    closeBtn.style.background = "rgba(50,40,20,0.95)";
  });
  closeBtn.addEventListener("mouseleave", () => {
    closeBtn.style.borderColor = "#5a4a2a";
    closeBtn.style.boxShadow = "none";
    closeBtn.style.background = "rgba(40,30,15,0.9)";
  });
  closeBtn.addEventListener("click", () => {
    ctx.closeOverlay();
  });

  // Wire item tooltips
  const codexItems = ctx.menuEl.querySelectorAll(".codex-item[data-item-name]");
  codexItems.forEach((el) => {
    const name = el.getAttribute("data-item-name") || "";
    const it = itemByName[name];
    if (it && ownedNames.has(name)) {
      el.addEventListener("mouseenter", (ev) => ctx.showItemTooltip(ev as MouseEvent, it));
      el.addEventListener("mouseleave", () => ctx.hideItemTooltip());
    }
  });
}

// ════════════════════════════════════════════════════════════════════════════
//  5. showSkillSwapMenu
// ════════════════════════════════════════════════════════════════════════════

export function showSkillSwapMenu(ctx: ScreenContext): void {
  const p = ctx.state.player;
  const allAvailable = [...p.skills, ...p.unlockedSkills.filter(s => !p.skills.includes(s))];
  let selectedSlot = -1;

  const render = () => {
    // Build active skill slots
    let activeHtml = "";
    for (let i = 0; i < 6; i++) {
      const skillId = p.skills[i];
      const def = skillId ? SKILL_DEFS[skillId] : null;
      const isSelected = selectedSlot === i;
      activeHtml += `<div class="swap-active-slot" data-slot="${i}" style="
        width:80px;height:80px;background:rgba(15,10,5,0.9);border:2px solid ${isSelected ? '#ffd700' : '#5a4a2a'};
        border-radius:8px;display:flex;flex-direction:column;align-items:center;
        justify-content:center;cursor:pointer;transition:all 0.2s;position:relative;
        ${isSelected ? 'box-shadow:0 0 15px rgba(255,215,0,0.4);' : ''}
      ">
        <div style="font-size:28px;">${def ? def.icon : '\u2014'}</div>
        <div style="font-size:10px;color:#c8a84e;margin-top:4px;">${def ? def.name : 'Empty'}</div>
        <div style="position:absolute;top:2px;left:6px;font-size:10px;color:#888;">${i + 1}</div>
      </div>`;
    }

    // Build available skills pool
    let poolHtml = "";
    for (const skillId of allAvailable) {
      const def = SKILL_DEFS[skillId];
      if (!def) continue;
      const isEquipped = p.skills.includes(skillId);
      const unlockEntry = UNLOCKABLE_SKILLS[p.class].find(e => e.skillId === skillId);
      const levelLabel = unlockEntry ? `Lv.${unlockEntry.level}` : "Base";
      poolHtml += `<div class="swap-pool-skill" data-skill="${skillId}" style="
        width:100%;padding:8px 12px;background:rgba(15,10,5,${isEquipped ? '0.6' : '0.9'});
        border:1px solid ${isEquipped ? '#5a5a2a' : '#5a4a2a'};border-radius:6px;
        display:flex;align-items:center;gap:10px;cursor:pointer;transition:all 0.2s;
        ${isEquipped ? 'opacity:0.6;' : ''}
      ">
        <div style="font-size:24px;">${def.icon}</div>
        <div style="flex:1;">
          <div style="color:#c8a84e;font-weight:bold;font-size:14px;">${def.name}
            <span style="color:#888;font-weight:normal;font-size:11px;margin-left:6px;">[${levelLabel}]</span>
            ${isEquipped ? '<span style="color:#5a5;font-size:11px;margin-left:6px;">EQUIPPED</span>' : ''}
          </div>
          <div style="color:#999;font-size:12px;">${def.description}</div>
          <div style="color:#666;font-size:11px;margin-top:2px;">
            CD: ${def.cooldown}s · Mana: ${def.manaCost} · DMG: ${def.damageMultiplier}x
          </div>
        </div>
      </div>`;
    }

    // No unlocked skills message
    if (p.unlockedSkills.length === 0) {
      poolHtml += `<div style="color:#888;text-align:center;padding:20px;font-style:italic;">
        No bonus skills unlocked yet. New skills unlock every 3 levels.
      </div>`;
    }

    ctx.menuEl.innerHTML = `
      <style>
        .diablo-menu-scroll::-webkit-scrollbar { width: 8px; }
        .diablo-menu-scroll::-webkit-scrollbar-track {
          background: rgba(10,8,4,0.6);
          border-radius: 4px;
          border: 1px solid #3a2a1a;
        }
        .diablo-menu-scroll::-webkit-scrollbar-thumb {
          background: linear-gradient(180deg, #5a4a2a, #3a2a1a);
          border-radius: 4px;
          border: 1px solid #6a5a3a;
        }
        .diablo-menu-scroll::-webkit-scrollbar-thumb:hover {
          background: linear-gradient(180deg, #7a6a3a, #5a4a2a);
        }
        .diablo-menu-scroll { scrollbar-width: thin; scrollbar-color: #5a4a2a rgba(10,8,4,0.6); }
      </style>
      <div style="
        width:100%;height:100%;
        ${SCREEN_BG}
        display:flex;flex-direction:column;
        align-items:center;justify-content:center;color:#fff;pointer-events:auto;
      ">
        <div class="diablo-menu-scroll" style="
          max-width:620px;width:90%;position:relative;
          background:
            repeating-linear-gradient(
              135deg,
              transparent,
              transparent 10px,
              rgba(60,45,20,0.04) 10px,
              rgba(60,45,20,0.04) 20px
            ),
            linear-gradient(180deg, rgba(25,18,8,0.97), rgba(12,8,4,0.98));
          border:3px solid #5a4a2a;
          border-image:linear-gradient(180deg, #7a6a3a, #4a3a1a, #7a6a3a) 1;
          padding:30px;max-height:85vh;overflow-y:auto;
          box-shadow:
            inset 0 0 30px rgba(0,0,0,0.5),
            inset 0 0 1px 1px rgba(90,74,42,0.3),
            0 0 40px rgba(0,0,0,0.6),
            0 0 80px rgba(40,30,10,0.3);
        ">
          <!-- Corner rivets -->
          <div style="position:absolute;top:6px;left:6px;width:10px;height:10px;
            background:radial-gradient(circle, #8a7a4a, #4a3a1a);border-radius:50%;
            box-shadow:0 0 4px rgba(138,122,74,0.5);"></div>
          <div style="position:absolute;top:6px;right:6px;width:10px;height:10px;
            background:radial-gradient(circle, #8a7a4a, #4a3a1a);border-radius:50%;
            box-shadow:0 0 4px rgba(138,122,74,0.5);"></div>
          <div style="position:absolute;bottom:6px;left:6px;width:10px;height:10px;
            background:radial-gradient(circle, #8a7a4a, #4a3a1a);border-radius:50%;
            box-shadow:0 0 4px rgba(138,122,74,0.5);"></div>
          <div style="position:absolute;bottom:6px;right:6px;width:10px;height:10px;
            background:radial-gradient(circle, #8a7a4a, #4a3a1a);border-radius:50%;
            box-shadow:0 0 4px rgba(138,122,74,0.5);"></div>

          <!-- Inner decorative border -->
          <div style="position:absolute;top:14px;left:14px;right:14px;bottom:14px;
            border:1px solid rgba(90,74,42,0.25);pointer-events:none;"></div>

          <!-- Crossed swords icon -->
          <div style="text-align:center;font-size:36px;margin-bottom:4px;
            filter:drop-shadow(0 0 8px rgba(200,168,78,0.4));letter-spacing:2px;">
            &#x2694;&#xFE0F;
          </div>

          <!-- Title with decorative dividers -->
          <div style="text-align:center;margin-bottom:4px;">
            <div style="display:flex;align-items:center;justify-content:center;gap:12px;">
              <span style="color:#5a4a2a;font-size:18px;text-shadow:0 0 6px rgba(200,168,78,0.3);">
                &#x2500;&#x2500;&#x2500; &#x25C6; &#x2500;&#x2500;&#x2500;
              </span>
              <h1 style="color:#c8a84e;font-size:32px;letter-spacing:5px;margin:0;
                font-family:'Georgia',serif;
                text-shadow:0 0 15px rgba(200,168,78,0.4), 0 2px 4px rgba(0,0,0,0.8);
                background:linear-gradient(180deg, #e8d080, #c8a84e, #a8884e);
                -webkit-background-clip:text;-webkit-text-fill-color:transparent;
                background-clip:text;">SWAP SKILLS</h1>
              <span style="color:#5a4a2a;font-size:18px;text-shadow:0 0 6px rgba(200,168,78,0.3);">
                &#x2500;&#x2500;&#x2500; &#x25C6; &#x2500;&#x2500;&#x2500;
              </span>
            </div>
          </div>

          <p style="color:#888;font-size:13px;text-align:center;margin:0 0 22px 0;
            font-style:italic;letter-spacing:0.5px;">
            Click a slot, then click a skill to assign it. Press [K] to close.
          </p>

          <div style="margin-bottom:22px;">
            <div style="text-align:center;margin-bottom:10px;">
              <div style="display:inline-flex;align-items:center;gap:8px;">
                <span style="color:#5a4a2a;">&#x25C6;</span>
                <span style="color:#c8a84e;font-size:14px;letter-spacing:3px;font-weight:bold;
                  font-family:'Georgia',serif;">ACTIVE SKILLS</span>
                <span style="color:#5a4a2a;">&#x25C6;</span>
              </div>
              <div style="height:2px;margin-top:6px;
                background:linear-gradient(90deg, transparent, #5a4a2a, #c8a84e, #5a4a2a, transparent);"></div>
            </div>
            <div style="display:flex;gap:6px;justify-content:center;">${activeHtml}</div>
          </div>

          <div>
            <div style="text-align:center;margin-bottom:10px;">
              <div style="display:inline-flex;align-items:center;gap:8px;">
                <span style="color:#5a4a2a;">&#x25C6;</span>
                <span style="color:#c8a84e;font-size:14px;letter-spacing:3px;font-weight:bold;
                  font-family:'Georgia',serif;">AVAILABLE SKILLS</span>
                <span style="color:#5a4a2a;">&#x25C6;</span>
              </div>
              <div style="height:2px;margin-top:6px;
                background:linear-gradient(90deg, transparent, #5a4a2a, #c8a84e, #5a4a2a, transparent);"></div>
            </div>
            <div style="display:flex;flex-direction:column;gap:4px;">${poolHtml}</div>
          </div>

          <div style="text-align:center;margin-top:24px;">
            <button id="diablo-swapskill-back" style="
              width:200px;padding:12px 0;font-size:18px;letter-spacing:3px;font-weight:bold;
              background:linear-gradient(180deg, rgba(50,38,18,0.95), rgba(30,22,10,0.95));
              border:2px solid #5a4a2a;border-radius:8px;color:#c8a84e;
              cursor:pointer;transition:all 0.2s;font-family:'Georgia',serif;pointer-events:auto;
              box-shadow:0 2px 8px rgba(0,0,0,0.4), inset 0 1px 0 rgba(90,74,42,0.3);
              text-shadow:0 0 8px rgba(200,168,78,0.3);
            ">BACK</button>
          </div>
        </div>
      </div>`;

    // Wire active slot clicks
    const slotEls = ctx.menuEl.querySelectorAll(".swap-active-slot") as NodeListOf<HTMLDivElement>;
    slotEls.forEach(el => {
      el.addEventListener("mouseenter", () => {
        if (selectedSlot !== parseInt(el.getAttribute("data-slot")!)) {
          el.style.borderColor = "#c8a84e";
          el.style.boxShadow = "0 0 10px rgba(200,168,78,0.2)";
        }
      });
      el.addEventListener("mouseleave", () => {
        if (selectedSlot !== parseInt(el.getAttribute("data-slot")!)) {
          el.style.borderColor = "#5a4a2a";
          el.style.boxShadow = "none";
        }
      });
      el.addEventListener("click", () => {
        selectedSlot = parseInt(el.getAttribute("data-slot")!);
        render();
      });
    });

    // Wire pool skill clicks
    const poolEls = ctx.menuEl.querySelectorAll(".swap-pool-skill") as NodeListOf<HTMLDivElement>;
    poolEls.forEach(el => {
      el.addEventListener("mouseenter", () => {
        el.style.borderColor = "#c8a84e";
        el.style.background = "rgba(30,20,10,0.9)";
      });
      el.addEventListener("mouseleave", () => {
        const sid = el.getAttribute("data-skill") as SkillId;
        const equipped = p.skills.includes(sid);
        el.style.borderColor = equipped ? "#5a5a2a" : "#5a4a2a";
        el.style.background = `rgba(15,10,5,${equipped ? '0.6' : '0.9'})`;
      });
      el.addEventListener("click", () => {
        if (selectedSlot < 0) {
          // Auto-select first slot
          selectedSlot = 0;
          render();
          return;
        }
        const newSkillId = el.getAttribute("data-skill") as SkillId;
        // Check if this skill is already in another slot
        const existingIdx = p.skills.indexOf(newSkillId);
        if (existingIdx >= 0 && existingIdx !== selectedSlot) {
          // Swap: put the old skill from selectedSlot into existingIdx
          const oldSkill = p.skills[selectedSlot];
          p.skills[existingIdx] = oldSkill;
        }
        p.skills[selectedSlot] = newSkillId;
        selectedSlot = -1;
        render();
      });
    });

    // Back button
    const backBtn = ctx.menuEl.querySelector("#diablo-swapskill-back") as HTMLButtonElement;
    backBtn.addEventListener("mouseenter", () => {
      backBtn.style.borderColor = "#c8a84e";
      backBtn.style.boxShadow = "0 0 15px rgba(200,168,78,0.3)";
      backBtn.style.background = "rgba(50,40,20,0.95)";
    });
    backBtn.addEventListener("mouseleave", () => {
      backBtn.style.borderColor = "#5a4a2a";
      backBtn.style.boxShadow = "none";
      backBtn.style.background = "rgba(40,30,15,0.9)";
    });
    backBtn.addEventListener("click", () => {
      ctx.backToMenu();
    });
  };

  render();
}

// ════════════════════════════════════════════════════════════════════════════
//  6. showCharacterOverview
// ════════════════════════════════════════════════════════════════════════════

export function showCharacterOverview(ctx: ScreenContext): void {
  const p = ctx.state.player;
  const stats = ctx.getEffectiveStats();

  // Class info
  const classIcons: Record<DiabloClass, string> = {
    [DiabloClass.WARRIOR]: "\u2694\uFE0F",
    [DiabloClass.MAGE]: "\uD83D\uDD2E",
    [DiabloClass.RANGER]: "\uD83C\uDFF9",
    [DiabloClass.PALADIN]: "\u{1F6E1}\uFE0F",
    [DiabloClass.NECROMANCER]: "\uD83D\uDC80",
    [DiabloClass.ASSASSIN]: "\uD83D\uDDE1\uFE0F",
  };
  const classColors: Record<DiabloClass, string> = {
    [DiabloClass.WARRIOR]: "#aab",
    [DiabloClass.MAGE]: "#a4f",
    [DiabloClass.RANGER]: "#4c4",
    [DiabloClass.PALADIN]: "#ffd700",
    [DiabloClass.NECROMANCER]: "#8f8",
    [DiabloClass.ASSASSIN]: "#c44",
  };
  const classIcon = classIcons[p.class] || "\u2694\uFE0F";
  const className = p.class.charAt(0).toUpperCase() + p.class.slice(1).toLowerCase();
  const classColor = classColors[p.class] || "#ccc";

  // XP bar
  const xpPct = p.xpToNext > 0 ? Math.min(100, (p.xp / p.xpToNext) * 100) : 100;
  const xpToGo = Math.max(0, p.xpToNext - p.xp);

  // Stat color coding: high=green, medium=yellow, low=red
  const baseMaxStats: Record<DiabloClass, { str: number; dex: number; int: number; vit: number }> = {
    [DiabloClass.WARRIOR]: { str: 25, dex: 8, int: 5, vit: 22 },
    [DiabloClass.MAGE]: { str: 5, dex: 8, int: 28, vit: 14 },
    [DiabloClass.RANGER]: { str: 8, dex: 26, int: 7, vit: 16 },
    [DiabloClass.PALADIN]: { str: 20, dex: 8, int: 15, vit: 24 },
    [DiabloClass.NECROMANCER]: { str: 6, dex: 10, int: 25, vit: 16 },
    [DiabloClass.ASSASSIN]: { str: 14, dex: 28, int: 6, vit: 15 },
  };
  const baseCls = baseMaxStats[p.class];
  const maxForLevel = (base: number) => base + (p.level - 1) * 3 + 30; // generous ceiling
  const statColor = (val: number, base: number): string => {
    const max = maxForLevel(base);
    const ratio = val / max;
    if (ratio > 0.7) return "#4f4";
    if (ratio > 0.4) return "#ff4";
    return "#f44";
  };

  // Resists from equipment
  let fireResist = 0, iceResist = 0, lightningResist = 0, poisonResist = 0;
  let lifeSteal = 0, manaRegen = 0;
  const equipKeys: (keyof DiabloEquipment)[] = [
    "helmet", "body", "gauntlets", "legs", "feet", "accessory1", "accessory2", "weapon", "lantern",
  ];
  for (const key of equipKeys) {
    const item = p.equipment[key];
    if (!item) continue;
    const s = item.stats as any;
    if (s.fireResist) fireResist += s.fireResist;
    if (s.iceResist) iceResist += s.iceResist;
    if (s.lightningResist) lightningResist += s.lightningResist;
    if (s.poisonResist) poisonResist += s.poisonResist;
    if (s.lifeSteal) lifeSteal += s.lifeSteal;
    if (s.manaRegen) manaRegen += s.manaRegen;
  }
  const charTalentBonuses = ctx.getTalentBonuses();
  const allResistBonus = charTalentBonuses[TalentEffectType.RESISTANCE_ALL] || 0;
  fireResist += allResistBonus;
  iceResist += allResistBonus;
  lightningResist += allResistBonus;
  poisonResist += allResistBonus;

  // Section header helper
  const sectionHeader = (title: string): string =>
    `<div style="margin-top:24px;margin-bottom:12px;">
      <div style="display:flex;align-items:center;gap:10px;">
        <div style="flex:1;height:1px;background:linear-gradient(to right,transparent,#5a4a2a);"></div>
        <span style="color:#5a4a2a;font-size:8px;">&#9670;</span>
        <span style="font-size:18px;color:#c8a84e;letter-spacing:3px;font-weight:bold;font-family:'Georgia',serif;text-shadow:0 0 8px rgba(200,168,78,0.2);">${title}</span>
        <span style="color:#5a4a2a;font-size:8px;">&#9670;</span>
        <div style="flex:1;height:1px;background:linear-gradient(to left,transparent,#5a4a2a);"></div>
      </div>
    </div>`;

  // Section 1: Class & Level
  const sec1 = `
    <div style="text-align:center;margin-bottom:10px;">
      <div style="font-size:48px;">${classIcon}</div>
      <div style="font-size:28px;color:${classColor};font-weight:bold;letter-spacing:2px;margin:4px 0;">${className.toUpperCase()}</div>
      <div style="font-size:18px;color:#ccc;">Level ${p.level}</div>
      <div style="font-size:14px;color:#999;margin-top:6px;">${p.xp} / ${p.xpToNext} XP</div>
      <div style="width:300px;height:12px;background:rgba(30,25,15,0.9);border:1px solid #5a4a2a;border-radius:6px;margin:6px auto 0;overflow:hidden;">
        <div style="width:${xpPct}%;height:100%;background:linear-gradient(90deg,#c8a84e,#ffd700);border-radius:5px;"></div>
      </div>
      <div style="font-size:12px;color:#888;margin-top:4px;">${xpToGo} XP to next level</div>
    </div>`;

  // Section 2: Base Stats (2x grid)
  const tt = (_tip: string) => `cursor:help;border-bottom:1px dotted #666;`;
  const sec2 = `
    ${sectionHeader("BASE STATS")}
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px 24px;font-size:14px;">
      <div style="${tt("")}" title="Increases melee damage. Warriors gain 1.5x STR as bonus damage.">STR: <span style="color:${statColor(stats.strength, baseCls.str)};font-weight:bold;">${stats.strength}</span></div>
      <div style="${tt("")}" title="Increases ranged damage and dodge. Rangers gain 1.3x DEX as bonus damage.">DEX: <span style="color:${statColor(stats.dexterity, baseCls.dex)};font-weight:bold;">${stats.dexterity}</span></div>
      <div style="${tt("")}" title="Increases spell damage and max mana (+0.8 per level per point). Mages gain 1.2x INT as bonus damage.">INT: <span style="color:${statColor(stats.intelligence, baseCls.int)};font-weight:bold;">${stats.intelligence}</span></div>
      <div style="${tt("")}" title="Increases max HP (+2 per level per point). Higher vitality means more survivability.">VIT: <span style="color:${statColor(stats.vitality, baseCls.vit)};font-weight:bold;">${stats.vitality}</span></div>
      <div style="color:#aaa;${tt("")}" title="Reduces incoming damage. Damage reduction = armor / (armor + 200).">Armor: <span style="color:#fff;">${stats.armor}</span></div>
      <div style="color:#aaa;${tt("")}" title="Chance for attacks to critically strike, dealing bonus damage.">Crit Chance: <span style="color:#ff8;">${(stats.critChance * 100).toFixed(1)}%</span></div>
      <div style="color:#aaa;${tt("")}" title="Bonus damage multiplier when a critical hit occurs.">Crit Damage: <span style="color:#ff8;">${(stats.critDamage * 100).toFixed(0)}%</span></div>
      <div style="color:#aaa;${tt("")}" title="How fast your character moves across the map.">Move Speed: <span style="color:#fff;">${stats.moveSpeed.toFixed(1)}</span></div>
      <div style="color:#aaa;${tt("")}" title="Number of attacks per second. Higher means faster combat.">Attack Speed: <span style="color:#fff;">${stats.attackSpeed.toFixed(2)}</span></div>
    </div>`;

  // Section 3: Defensive Stats
  const sec3 = `
    ${sectionHeader("DEFENSIVE STATS")}
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px 24px;font-size:14px;">
      <div style="color:#e44;${tt("")}" title="Hit Points. When HP reaches 0 you die. Increased by Vitality.">HP: <span style="color:#fff;">${Math.floor(p.hp)} / ${p.maxHp}</span></div>
      <div style="color:#48f;${tt("")}" title="Mana pool for casting skills. Increased by Intelligence. Regenerates over time.">Mana: <span style="color:#fff;">${Math.floor(p.mana)} / ${p.maxMana}</span></div>
      <div style="color:#f84;${tt("")}" title="Reduces fire damage taken. Reduction = resist / (resist + 100).">Fire Resist: <span style="color:#fff;">${fireResist}</span> <span style="color:#888;font-size:11px;">(${(fireResist / (fireResist + 100) * 100).toFixed(1)}% red.)</span></div>
      <div style="color:#8df;${tt("")}" title="Reduces ice damage taken. Reduction = resist / (resist + 100).">Ice Resist: <span style="color:#fff;">${iceResist}</span> <span style="color:#888;font-size:11px;">(${(iceResist / (iceResist + 100) * 100).toFixed(1)}% red.)</span></div>
      <div style="color:#ff4;${tt("")}" title="Reduces lightning damage taken. Reduction = resist / (resist + 100).">Lightning Resist: <span style="color:#fff;">${lightningResist}</span> <span style="color:#888;font-size:11px;">(${(lightningResist / (lightningResist + 100) * 100).toFixed(1)}% red.)</span></div>
      <div style="color:#4f4;${tt("")}" title="Reduces poison damage taken. Reduction = resist / (resist + 100).">Poison Resist: <span style="color:#fff;">${poisonResist}</span> <span style="color:#888;font-size:11px;">(${(poisonResist / (poisonResist + 100) * 100).toFixed(1)}% red.)</span></div>
      <div style="color:#f88;${tt("")}" title="Percentage of damage dealt that is recovered as HP.">Life Steal: <span style="color:#fff;">${lifeSteal}%</span></div>
      <div style="color:#8af;${tt("")}" title="Mana recovered per second passively.">Mana Regen: <span style="color:#fff;">${manaRegen}</span></div>
    </div>`;

  // Section 4: Skill Details
  const weaponDmg = ctx.getWeaponDamage();
  let skillCardsHtml = "";
  for (let i = 0; i < p.skills.length; i++) {
    const def = SKILL_DEFS[p.skills[i]];
    if (!def) continue;

    // Compute base damage matching _getSkillDamage logic
    let primaryStat = 0;
    switch (p.class) {
      case DiabloClass.WARRIOR: primaryStat = p.strength * 1.5; break;
      case DiabloClass.MAGE: primaryStat = p.intelligence * 1.2; break;
      case DiabloClass.RANGER: primaryStat = p.dexterity * 1.3; break;
    }
    let bonusDmg = 0;
    for (const key of equipKeys) {
      const item = p.equipment[key];
      if (item) {
        const s = item.stats as any;
        if (s.bonusDamage) bonusDmg += s.bonusDamage;
      }
    }
    const baseDamage = (primaryStat + weaponDmg + bonusDmg) * (def.damageMultiplier || 1);
    const effectiveCd = Math.max(def.cooldown, 1 / stats.attackSpeed);
    const dps = def.damageMultiplier > 0
      ? (baseDamage * (1 + stats.critChance * stats.critDamage)) / effectiveCd
      : 0;

    // Status effect display
    let statusHtml = "";
    if (def.statusEffect) {
      const effectIcons: Record<string, string> = {
        BURNING: "\uD83D\uDD25", FROZEN: "\u2744\uFE0F", SHOCKED: "\u26A1",
        POISONED: "\u2620\uFE0F", SLOWED: "\uD83D\uDC22", STUNNED: "\uD83D\uDCAB",
        BLEEDING: "\uD83E\uDE78", WEAKENED: "\uD83D\uDCA7",
      };
      const eIcon = effectIcons[def.statusEffect] || "";
      statusHtml = `<span style="color:#f84;font-size:12px;margin-left:8px;">${eIcon} ${def.statusEffect}</span>`;
    }

    // AOE display
    let aoeHtml = "";
    if (def.aoeRadius) {
      aoeHtml = `<span style="color:#8af;font-size:12px;margin-left:8px;">AOE: ${def.aoeRadius} radius</span>`;
    }

    const keyCap = `<span style="display:inline-block;background:rgba(60,50,30,0.8);border:1px solid #888;border-radius:4px;padding:2px 10px;font-family:monospace;min-width:24px;text-align:center;color:#fff;font-size:14px;">${i + 1}</span>`;

    skillCardsHtml += `
      <div style="
        background:rgba(15,10,5,0.9);border-left:4px solid ${classColor};
        border-radius:6px;padding:12px;margin-bottom:8px;
      ">
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:6px;">
          ${keyCap}
          <span style="font-size:22px;">${def.icon}</span>
          <span style="color:#c8a84e;font-weight:bold;font-size:16px;">${def.name}</span>
        </div>
        <div style="color:#aaa;font-size:13px;margin-bottom:6px;">${def.description}</div>
        <div style="display:flex;flex-wrap:wrap;gap:12px;font-size:12px;color:#999;">
          <span>\u23F0 ${def.cooldown}sec</span>
          <span style="color:#48f;">Mana: ${def.manaCost}</span>
          <span style="color:#fa8;">Type: ${def.damageType}</span>
          ${statusHtml}
          ${aoeHtml}
        </div>
        ${def.damageMultiplier > 0 ? `
        <div style="margin-top:6px;display:flex;gap:16px;font-size:13px;">
          <span style="color:#c8a84e;font-weight:bold;">Est. DPS: ${dps.toFixed(1)}</span>
          <span style="color:#ccc;">Damage/Hit: ${baseDamage.toFixed(1)}</span>
        </div>` : ""}
      </div>`;
  }
  const sec4 = `${sectionHeader("SKILL DETAILS")}${skillCardsHtml}`;

  // Section 5: Equipment Summary
  const slotLabels: { key: keyof DiabloEquipment; label: string }[] = [
    { key: "helmet", label: "Helmet" },
    { key: "body", label: "Body" },
    { key: "weapon", label: "Weapon" },
    { key: "gauntlets", label: "Gauntlets" },
    { key: "legs", label: "Legs" },
    { key: "feet", label: "Feet" },
    { key: "accessory1", label: "Accessory 1" },
    { key: "accessory2", label: "Accessory 2" },
    { key: "lantern", label: "Lantern" },
  ];
  let equipListHtml = "";
  for (const sl of slotLabels) {
    const item = p.equipment[sl.key];
    if (item) {
      equipListHtml += `<div style="margin:4px 0;"><span style="color:#888;">${sl.label}:</span> <span style="color:${RARITY_CSS[item.rarity]};font-weight:bold;">${item.name}</span></div>`;
    } else {
      equipListHtml += `<div style="margin:4px 0;"><span style="color:#888;">${sl.label}:</span> <span style="color:#555;">Empty</span></div>`;
    }
  }
  const sec5 = `${sectionHeader("EQUIPMENT SUMMARY")}<div style="font-size:14px;">${equipListHtml}</div>`;

  // Section 6: Set Bonuses
  const equippedNames: string[] = [];
  for (const key of equipKeys) {
    const item = p.equipment[key];
    if (item && item.setName) equippedNames.push(item.setName);
  }
  let activeSets = "";
  for (const sb of SET_BONUSES) {
    const count = equippedNames.filter((n) => n === sb.setName).length;
    if (count >= sb.pieces) {
      activeSets += `<div style="margin:4px 0;color:#4f4;font-size:14px;"><span style="font-weight:bold;">${sb.setName}</span> (${sb.pieces}pc) \u2014 ${sb.bonusDescription}</div>`;
    }
  }
  if (!activeSets) {
    activeSets = `<div style="color:#555;font-size:14px;">No active set bonuses</div>`;
  }
  const sec6 = `${sectionHeader("SET BONUSES ACTIVE")}${activeSets}`;

  ctx.menuEl.innerHTML = `
    <style>
      .diablo-menu-scroll::-webkit-scrollbar { width: 8px; }
      .diablo-menu-scroll::-webkit-scrollbar-track { background: rgba(15,10,5,0.6); border-radius: 4px; }
      .diablo-menu-scroll::-webkit-scrollbar-thumb { background: linear-gradient(180deg, #5a4a2a, #3a2a1a); border-radius: 4px; border: 1px solid #2a1a0a; }
      .diablo-menu-scroll::-webkit-scrollbar-thumb:hover { background: linear-gradient(180deg, #7a6a3a, #5a4a2a); }
      .diablo-menu-scroll { scrollbar-width: thin; scrollbar-color: #5a4a2a rgba(15,10,5,0.6); }
    </style>
    <div style="
      width:100%;height:100%;
      ${SCREEN_BG}
      display:flex;flex-direction:column;
      align-items:center;justify-content:center;color:#fff;pointer-events:auto;
    ">
      <div style="
        position:relative;max-width:800px;width:90%;
        background:rgba(15,10,5,0.95);
        background-image:repeating-linear-gradient(135deg,transparent,transparent 20px,rgba(90,74,42,0.03) 20px,rgba(90,74,42,0.03) 21px);
        border:2px solid #5a4a2a;
        border-radius:12px;padding:0;
      ">
        <!-- Inner decorative border -->
        <div style="position:absolute;inset:4px;border:1px solid #3a2a1a;border-radius:9px;pointer-events:none;"></div>
        <!-- Corner rivets -->
        <div style="position:absolute;top:8px;left:8px;width:8px;height:8px;background:radial-gradient(circle,#7a6a3a,#3a2a1a);border-radius:50%;border:1px solid #5a4a2a;"></div>
        <div style="position:absolute;top:8px;right:8px;width:8px;height:8px;background:radial-gradient(circle,#7a6a3a,#3a2a1a);border-radius:50%;border:1px solid #5a4a2a;"></div>
        <div style="position:absolute;bottom:8px;left:8px;width:8px;height:8px;background:radial-gradient(circle,#7a6a3a,#3a2a1a);border-radius:50%;border:1px solid #5a4a2a;"></div>
        <div style="position:absolute;bottom:8px;right:8px;width:8px;height:8px;background:radial-gradient(circle,#7a6a3a,#3a2a1a);border-radius:50%;border:1px solid #5a4a2a;"></div>
        <!-- Scrollable content -->
        <div class="diablo-menu-scroll" style="
          padding:30px 40px;max-height:85vh;overflow-y:auto;
        ">
          <!-- Decorative top divider -->
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
            <div style="flex:1;height:1px;background:linear-gradient(to right,transparent,#5a4a2a);"></div>
            <span style="color:#5a4a2a;font-size:6px;">&#9670;</span>
            <span style="color:#5a4a2a;font-size:8px;">&#9670;</span>
            <span style="color:#c8a84e;font-size:10px;">&#9670;</span>
            <span style="color:#5a4a2a;font-size:8px;">&#9670;</span>
            <span style="color:#5a4a2a;font-size:6px;">&#9670;</span>
            <div style="flex:1;height:1px;background:linear-gradient(to left,transparent,#5a4a2a);"></div>
          </div>
          <h1 style="color:#c8a84e;font-size:36px;letter-spacing:4px;margin:0 0 8px 0;text-align:center;
            font-family:'Georgia',serif;text-shadow:0 0 15px rgba(200,168,78,0.4);">CHARACTER OVERVIEW</h1>
          <!-- Decorative bottom divider -->
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px;">
            <div style="flex:1;height:1px;background:linear-gradient(to right,transparent,#5a4a2a);"></div>
            <span style="color:#5a4a2a;font-size:6px;">&#9670;</span>
            <span style="color:#5a4a2a;font-size:8px;">&#9670;</span>
            <span style="color:#c8a84e;font-size:10px;">&#9670;</span>
            <span style="color:#5a4a2a;font-size:8px;">&#9670;</span>
            <span style="color:#5a4a2a;font-size:6px;">&#9670;</span>
            <div style="flex:1;height:1px;background:linear-gradient(to left,transparent,#5a4a2a);"></div>
          </div>
          <div style="text-align:center;color:#888;font-size:12px;margin-bottom:6px;">Press C or Escape to close</div>
          ${sec1}${sec2}${sec3}${sec4}${sec5}${sec6}
          <div style="text-align:center;margin-top:30px;display:flex;gap:16px;justify-content:center;">
            <button id="diablo-char-skilltree" style="
              width:200px;padding:12px 0;font-size:18px;letter-spacing:3px;font-weight:bold;
              background:rgba(40,30,15,0.9);border:2px solid #5a8a2a;border-radius:8px;color:#8c8;
              cursor:pointer;transition:all 0.2s;font-family:'Georgia',serif;pointer-events:auto;
            ">SKILL TREE</button>
            <button id="diablo-char-back" style="
              width:200px;padding:12px 0;font-size:18px;letter-spacing:3px;font-weight:bold;
              background:rgba(40,30,15,0.9);border:2px solid #5a4a2a;border-radius:8px;color:#c8a84e;
              cursor:pointer;transition:all 0.2s;font-family:'Georgia',serif;pointer-events:auto;
            ">BACK</button>
          </div>
        </div>
      </div>
    </div>`;

  const backBtn = ctx.menuEl.querySelector("#diablo-char-back") as HTMLButtonElement;
  backBtn.addEventListener("mouseenter", () => {
    backBtn.style.borderColor = "#c8a84e";
    backBtn.style.boxShadow = "0 0 15px rgba(200,168,78,0.3)";
    backBtn.style.background = "rgba(50,40,20,0.95)";
  });
  backBtn.addEventListener("mouseleave", () => {
    backBtn.style.borderColor = "#5a4a2a";
    backBtn.style.boxShadow = "none";
    backBtn.style.background = "rgba(40,30,15,0.9)";
  });
  backBtn.addEventListener("click", () => {
    ctx.backToMenu();
  });

  const stBtn = ctx.menuEl.querySelector("#diablo-char-skilltree") as HTMLButtonElement;
  stBtn.addEventListener("mouseenter", () => {
    stBtn.style.borderColor = "#8c8";
    stBtn.style.boxShadow = "0 0 15px rgba(100,200,100,0.3)";
    stBtn.style.background = "rgba(30,50,30,0.95)";
  });
  stBtn.addEventListener("mouseleave", () => {
    stBtn.style.borderColor = "#5a8a2a";
    stBtn.style.boxShadow = "none";
    stBtn.style.background = "rgba(40,30,15,0.9)";
  });
  stBtn.addEventListener("click", () => {
    ctx.showSkillTreeScreen();
  });
}

// ════════════════════════════════════════════════════════════════════════════
//  7. showItemTooltip
// ════════════════════════════════════════════════════════════════════════════

export function showItemTooltip(ctx: ScreenContext, ev: MouseEvent, item: DiabloItem | null): void {
    if (!item) return;
    const tooltip = ctx.menuEl.querySelector("#inv-tooltip") as HTMLDivElement;
    if (!tooltip) return;

    const rarityColor = RARITY_CSS[item.rarity];
    const rarityName = RARITY_NAMES[item.rarity];
    const stats = item.stats as any;
    let statsLines = "";
    const statLabels: Record<string, string> = {
      strength: "Strength", dexterity: "Dexterity", intelligence: "Intelligence",
      vitality: "Vitality", armor: "Armor", critChance: "Crit Chance",
      critDamage: "Crit Damage", attackSpeed: "Attack Speed", moveSpeed: "Move Speed",
      fireResist: "Fire Resist", iceResist: "Ice Resist", lightningResist: "Lightning Resist",
      poisonResist: "Poison Resist", lifeSteal: "Life Steal", manaRegen: "Mana Regen",
      bonusDamage: "Bonus Damage", bonusHealth: "Bonus Health", bonusMana: "Bonus Mana",
      damage: "Damage", speed: "Speed", lifeRegen: "Life Regen",
    };
    for (const k of Object.keys(stats)) {
      if (stats[k] && stats[k] !== 0) {
        const label = statLabels[k] || k;
        const val = stats[k];
        const clr = val > 0 ? "#8f8" : "#f88";
        const sgn = val > 0 ? "+" : "";
        statsLines += `<div style="color:${clr};font-size:15px;padding:2px 0;">${sgn}${val} ${label}</div>`;
      }
    }

    // Item comparison with currently equipped
    let comparisonLines = "";
    const equipKey = resolveEquipKey(item.slot as string);
    if (equipKey) {
      const equipped = ctx.state.player.equipment[equipKey];
      if (equipped && equipped.id !== item.id) {
        comparisonLines += `<div style="border-top:1px solid rgba(90,74,42,0.3);margin:6px 0;padding-top:6px;">`;
        comparisonLines += `<div style="color:#c8a84e;font-size:15px;font-weight:bold;margin-bottom:4px;">vs. ${equipped.name}</div>`;
        const eqStats = equipped.stats as any;
        for (const k of Object.keys(statLabels)) {
          const newVal = (stats[k] || 0) as number;
          const oldVal = (eqStats[k] || 0) as number;
          const diff = newVal - oldVal;
          if (diff !== 0) {
            const clr = diff > 0 ? "#44ff44" : "#ff4444";
            const arrow = diff > 0 ? "\u25B2" : "\u25BC";
            comparisonLines += `<div style="color:${clr};font-size:14px;padding:2px 0;">${arrow} ${diff > 0 ? '+' : ''}${diff} ${statLabels[k] || k}</div>`;
          }
        }
        comparisonLines += `</div>`;
      }
    }

    // Lantern light properties
    let lanternLines = "";
    if (item.type === "LANTERN") {
      const lcfg = LANTERN_CONFIGS[item.name];
      if (lcfg) {
        const colorHex = '#' + lcfg.color.toString(16).padStart(6, '0');
        lanternLines = `
          <div style="border-top:1px solid rgba(90,74,42,0.3);margin:6px 0;padding-top:6px;">
            <div style="color:#c8a84e;font-size:15px;font-weight:bold;margin-bottom:4px;">Light Properties</div>
            <div style="color:#ffcc66;font-size:14px;padding:2px 0;">Intensity: ${lcfg.intensity.toFixed(1)}</div>
            <div style="color:#ffcc66;font-size:14px;padding:2px 0;">Range: ${lcfg.distance} units</div>
            <div style="display:flex;align-items:center;gap:6px;font-size:14px;padding:2px 0;">
              <span style="color:#ffcc66;">Color:</span>
              <span style="display:inline-block;width:16px;height:16px;border-radius:50%;background:${colorHex};border:1px solid #555;box-shadow:0 0 6px ${colorHex};"></span>
            </div>
          </div>`;
      }
    }

    let legendaryLine = "";
    if (item.legendaryAbility) {
      const effect = LEGENDARY_EFFECTS[item.legendaryAbility];
      if (effect) {
        legendaryLine = `<div style="color:#ff8800;margin-top:6px;font-size:14px;font-style:italic;border-left:2px solid #ff880060;padding-left:6px;">${effect.description}</div>`;
      } else {
        legendaryLine = `<div style="color:#ff8800;margin-top:6px;font-size:14px;font-style:italic;border-left:2px solid #ff880060;padding-left:6px;">${item.legendaryAbility}</div>`;
      }
    }
    let setLine = "";
    if ((item as any).setName) {
      const sn = (item as any).setName as string;
      const equippedSetCount = ctx.countEquippedSetPieces(sn);
      const setBonuses = SET_BONUSES.filter(sb => sb.setName === sn);
      setLine = `<div style="color:#44ff44;margin-top:4px;font-size:14px;">Set: ${sn} (${equippedSetCount} equipped)</div>`;
      for (const sb of setBonuses) {
        const active = equippedSetCount >= sb.pieces;
        setLine += `<div style="color:${active ? '#44ff44' : '#666'};font-size:13px;padding:1px 0;margin-left:8px;">(${sb.pieces}) ${sb.bonusDescription || ''}</div>`;
      }
    }
    // Socket display
    let socketLine = "";
    if (item.sockets && item.sockets.length > 0) {
      let socketIcons = "";
      for (const socket of item.sockets) {
        if (socket.gemType) {
          const gemLabel = socket.gemType + ' T' + socket.gemTier;
          socketIcons += `<span style="display:inline-block;width:16px;height:16px;border-radius:50%;background:#aa44ff;border:1px solid #cc66ff;margin:1px;font-size:10px;text-align:center;line-height:16px;" title="${gemLabel}">${String(socket.gemType).charAt(0)}</span>`;
        } else {
          socketIcons += `<span style="display:inline-block;width:16px;height:16px;border-radius:50%;background:#222;border:1px solid #555;margin:1px;"></span>`;
        }
      }
      socketLine = `<div style="margin-top:4px;font-size:14px;color:#aaa;">Sockets: ${socketIcons}</div>`;
    }
    // DPS calculation for weapons
    let dpsLine = "";
    if (stats.damage && stats.speed) {
      const dps = (stats.damage * stats.speed).toFixed(1);
      dpsLine = `<div style="color:#ffdd44;font-size:15px;margin-top:2px;font-weight:bold;">${dps} DPS</div>`;
    } else if (stats.damage && stats.attackSpeed) {
      const dps = (stats.damage * (1 + stats.attackSpeed)).toFixed(1);
      dpsLine = `<div style="color:#ffdd44;font-size:15px;margin-top:2px;font-weight:bold;">${dps} DPS</div>`;
    }

    const stars = "\u2605".repeat(RARITY_TIER[item.rarity]);

    tooltip.innerHTML = `
      <!-- Ornate border with rarity glow -->
      <div style="position:absolute;inset:-1px;border:2px solid ${rarityColor}60;border-radius:9px;pointer-events:none;
        box-shadow:0 0 12px ${rarityColor}30,inset 0 0 12px ${rarityColor}10;"></div>
      <!-- Corner decorations -->
      <div style="position:absolute;top:2px;left:2px;color:${rarityColor};font-size:7px;opacity:0.6;">&#9670;</div>
      <div style="position:absolute;top:2px;right:2px;color:${rarityColor};font-size:7px;opacity:0.6;">&#9670;</div>
      <div style="position:absolute;bottom:2px;left:2px;color:${rarityColor};font-size:7px;opacity:0.6;">&#9670;</div>
      <div style="position:absolute;bottom:2px;right:2px;color:${rarityColor};font-size:7px;opacity:0.6;">&#9670;</div>
      <!-- Rarity color top bar -->
      <div style="height:4px;background:linear-gradient(90deg,transparent,${rarityColor},transparent);"></div>
      <!-- Content area with subtle rarity gradient background -->
      <div style="padding:16px 20px;background:linear-gradient(180deg, ${RARITY_BG[item.rarity]} 0%, rgba(8,4,2,0) 40%);position:relative;">
        <!-- Item name & rarity header -->
        <div style="border-bottom:1px solid rgba(90,74,42,0.5);padding-bottom:10px;margin-bottom:10px;">
          <div style="color:${rarityColor};font-size:20px;font-weight:bold;text-shadow:0 0 8px ${rarityColor}40;">${item.icon} ${item.name}</div>
          <div style="color:${rarityColor};font-size:14px;margin-top:4px;letter-spacing:1px;">
            <span style="font-size:13px;">${stars}</span> ${rarityName}
          </div>
        </div>
        <!-- Slot/type -->
        <div style="color:#888;font-size:14px;margin-bottom:8px;text-transform:uppercase;letter-spacing:1px;">${item.slot || item.type}</div>
        <!-- Separator with diamond ornaments -->
        <div style="display:flex;align-items:center;gap:6px;margin:4px 0 6px;">
          <div style="flex:1;height:1px;background:linear-gradient(to right,transparent,#5a4a2a60);"></div>
          <span style="color:#5a4a2a;font-size:6px;">&#9670;</span>
          <div style="flex:1;height:1px;background:linear-gradient(to left,transparent,#5a4a2a60);"></div>
        </div>
        <!-- Stats -->
        ${statsLines}
        ${comparisonLines}
        ${lanternLines}
        ${dpsLine}
        ${legendaryLine}
        ${setLine}
        ${socketLine}
        <!-- Separator with diamond ornaments before description -->
        <div style="display:flex;align-items:center;gap:6px;margin:8px 0 6px;">
          <div style="flex:1;height:1px;background:linear-gradient(to right,transparent,#5a4a2a60);"></div>
          <span style="color:#5a4a2a;font-size:6px;">&#9670;</span>
          <div style="flex:1;height:1px;background:linear-gradient(to left,transparent,#5a4a2a60);"></div>
        </div>
        <div style="color:#777;font-size:14px;font-style:italic;line-height:1.5;">${item.description}</div>
      </div>
      <!-- Rarity color bottom bar -->
      <div style="height:2px;background:linear-gradient(90deg,transparent,${rarityColor}40,transparent);"></div>
    `;
    tooltip.style.display = "block";
    tooltip.style.left = Math.min(ev.clientX + 16, window.innerWidth - 400) + "px";
    tooltip.style.top = Math.min(ev.clientY + 16, window.innerHeight - 250) + "px";
}

// ════════════════════════════════════════════════════════════════════════════
//  8. showPauseMenu
// ════════════════════════════════════════════════════════════════════════════

export function showPauseMenu(ctx: ScreenContext): void {
    const btnBase =
      "width:280px;padding:14px 0;margin:8px 0;font-size:18px;letter-spacing:3px;font-weight:bold;" +
      "background:rgba(40,30,15,0.9);border:2px solid #5a4a2a;border-radius:8px;color:#c8a84e;" +
      "cursor:pointer;transition:all 0.2s;font-family:'Georgia',serif;pointer-events:auto;";
    const exitBtn =
      "width:280px;padding:14px 0;margin:8px 0;font-size:18px;letter-spacing:3px;font-weight:bold;" +
      "background:rgba(40,30,15,0.9);border:2px solid #a44;border-radius:8px;color:#e66;" +
      "cursor:pointer;transition:all 0.2s;font-family:'Georgia',serif;pointer-events:auto;";

    const saveBtn =
      "width:280px;padding:14px 0;margin:8px 0;font-size:18px;letter-spacing:3px;font-weight:bold;" +
      "background:rgba(40,30,15,0.9);border:2px solid #4a4;border-radius:8px;color:#6c6;" +
      "cursor:pointer;transition:all 0.2s;font-family:'Georgia',serif;pointer-events:auto;";
    const loadBtn =
      "width:280px;padding:14px 0;margin:8px 0;font-size:18px;letter-spacing:3px;font-weight:bold;" +
      "background:rgba(40,30,15,0.9);border:2px solid #44a;border-radius:8px;color:#68f;" +
      "cursor:pointer;transition:all 0.2s;font-family:'Georgia',serif;pointer-events:auto;";

    const loadBtnHtml = ctx.hasSave()
      ? `<button id="diablo-load-btn" style="${loadBtn}">LOAD GAME</button>`
      : "";

    ctx.menuEl.innerHTML = `
      <style>
        @keyframes pause-candle {
          0%, 100% { opacity:0.7; text-shadow: 0 0 6px #ff8800, 0 -3px 8px #ff6600; }
          33% { opacity:1; text-shadow: 0 0 10px #ffaa00, 0 -5px 12px #ff8800; }
          66% { opacity:0.85; text-shadow: 0 0 8px #ff6600, 0 -4px 10px #ff4400; }
        }
        @keyframes pause-glow-spread {
          0% { box-shadow: 0 0 0px rgba(200,168,78,0); }
          100% { box-shadow: 0 0 20px rgba(200,168,78,0.4); }
        }
      </style>
      <div style="
        width:100%;height:100%;${SCREEN_BG}display:flex;flex-direction:column;
        align-items:center;justify-content:center;color:#fff;position:relative;
      ">
        <!-- Decorative stone frame around button column -->
        <div style="position:relative;display:flex;flex-direction:column;align-items:center;
          padding:30px 60px 24px;border:2px solid #5a4a2a;border-radius:8px;
          background:rgba(10,8,4,0.6);
          box-shadow:inset 0 0 40px rgba(0,0,0,0.4),0 0 2px #3a2a1a;">
          <!-- Inner border -->
          <div style="position:absolute;inset:4px;border:1px solid #3a2a1a;border-radius:6px;pointer-events:none;"></div>

          <!-- Vertical chain decorations -->
          <div style="position:absolute;left:-20px;top:40px;bottom:40px;width:12px;display:flex;flex-direction:column;align-items:center;gap:2px;overflow:hidden;">
            ${Array.from({length:20}).map(() => '<div style="width:8px;height:12px;border:2px solid #5a4a2a;border-radius:3px;"></div>').join("")}
          </div>
          <div style="position:absolute;right:-20px;top:40px;bottom:40px;width:12px;display:flex;flex-direction:column;align-items:center;gap:2px;overflow:hidden;">
            ${Array.from({length:20}).map(() => '<div style="width:8px;height:12px;border:2px solid #5a4a2a;border-radius:3px;"></div>').join("")}
          </div>

          <!-- Flickering candles on sides -->
          <div style="position:absolute;left:-36px;top:20px;font-size:20px;animation:pause-candle 0.8s ease-in-out infinite;">&#x1F56F;</div>
          <div style="position:absolute;right:-36px;top:20px;font-size:20px;animation:pause-candle 0.8s ease-in-out infinite 0.4s;">&#x1F56F;</div>

          <!-- Skull decoration above title -->
          <div style="font-size:28px;margin-bottom:4px;filter:drop-shadow(0 0 6px rgba(200,168,78,0.3));">&#9760;</div>

          <h1 style="color:#c8a84e;font-size:48px;letter-spacing:6px;margin-bottom:6px;
            font-family:'Georgia',serif;text-shadow:0 0 20px rgba(200,168,78,0.4);">PAUSED</h1>

          <!-- Decorative divider under title -->
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:20px;">
            <div style="width:60px;height:1px;background:linear-gradient(to right,transparent,#5a4a2a);"></div>
            <span style="color:#5a4a2a;font-size:12px;">&#9884;</span>
            <span style="color:#c8a84e;font-size:8px;">&#9830;</span>
            <span style="color:#5a4a2a;font-size:12px;">&#9884;</span>
            <div style="width:60px;height:1px;background:linear-gradient(to left,transparent,#5a4a2a);"></div>
          </div>

          <button id="diablo-resume-btn" style="${btnBase}">&#9876; RESUME</button>

          <div style="display:flex;gap:16px;margin-top:4px;">
            <!-- Left column: Gameplay -->
            <div style="display:flex;flex-direction:column;align-items:center;">
              <div style="color:#665533;font-size:10px;letter-spacing:2px;margin-bottom:6px;font-family:'Georgia',serif;">GAMEPLAY</div>
              <button id="diablo-inventory-btn" style="${btnBase}">&#9878; INVENTORY</button>
              <button id="diablo-character-btn" style="${btnBase}">&#10022; CHARACTER</button>
              <button id="diablo-skilltree-btn" style="${btnBase}">&#10040; SKILL TREE</button>
              <button id="diablo-skillswap-btn" style="${btnBase}">&#8644; SWAP SKILLS</button>
              <button id="diablo-stash-btn" style="${btnBase}">&#9878; STASH</button>
              <button id="diablo-collection-btn" style="${btnBase}">&#10070; COLLECTION</button>
              <button id="diablo-bestiary-btn" style="${btnBase}">&#128026; BESTIARY</button>
              <button id="diablo-pets-btn" style="${btnBase}">&#128062; PETS</button>
            </div>
            <!-- Right column: System -->
            <div style="display:flex;flex-direction:column;align-items:center;">
              <div style="color:#665533;font-size:10px;letter-spacing:2px;margin-bottom:6px;font-family:'Georgia',serif;">SYSTEM</div>
              <button id="diablo-controls-btn" style="${btnBase}">&#9881; CONTROLS</button>
              <button id="diablo-dailies-btn" style="${btnBase}">&#9733; CHALLENGES</button>
              <button id="diablo-save-btn" style="${saveBtn}">&#10004; SAVE GAME</button>
              ${loadBtnHtml}
              <button id="diablo-export-btn" style="${btnBase}">&#8681; EXPORT SAVE</button>
              <button id="diablo-import-btn" style="${btnBase}">&#8679; IMPORT SAVE</button>
              <button id="diablo-charselect-btn" style="${btnBase}">&#9733; CHAR SELECT</button>
              <button id="diablo-exit-btn" style="${exitBtn}">&#10008; EXIT</button>
            </div>
          </div>
          <div style="margin-top:24px;color:#888;font-size:12px;letter-spacing:1px;
            font-family:'Cinzel','Palatino Linotype','Book Antiqua',Georgia,serif;
            text-shadow:0 1px 3px rgba(0,0,0,0.6);">
            Press <span style="color:#c8a84e;">V</span> to toggle First Person view
          </div>
        </div>
      </div>`;

    // Hover effects for standard buttons
    const stdBtns = ctx.menuEl.querySelectorAll("#diablo-resume-btn,#diablo-controls-btn,#diablo-inventory-btn,#diablo-character-btn,#diablo-skilltree-btn,#diablo-skillswap-btn,#diablo-stash-btn,#diablo-collection-btn,#diablo-bestiary-btn,#diablo-pets-btn,#diablo-dailies-btn,#diablo-charselect-btn,#diablo-export-btn,#diablo-import-btn") as NodeListOf<HTMLButtonElement>;
    stdBtns.forEach((btn) => {
      btn.addEventListener("mouseenter", () => {
        btn.style.borderColor = "#c8a84e";
        btn.style.boxShadow = "0 0 15px rgba(200,168,78,0.3)";
        btn.style.background = "rgba(50,40,20,0.95)";
      });
      btn.addEventListener("mouseleave", () => {
        btn.style.borderColor = "#5a4a2a";
        btn.style.boxShadow = "none";
        btn.style.background = "rgba(40,30,15,0.9)";
      });
    });

    // Hover for save button
    const saveBtnEl = ctx.menuEl.querySelector("#diablo-save-btn") as HTMLButtonElement;
    saveBtnEl.addEventListener("mouseenter", () => {
      saveBtnEl.style.borderColor = "#6c6";
      saveBtnEl.style.boxShadow = "0 0 15px rgba(100,200,100,0.3)";
      saveBtnEl.style.background = "rgba(30,50,30,0.95)";
    });
    saveBtnEl.addEventListener("mouseleave", () => {
      saveBtnEl.style.borderColor = "#4a4";
      saveBtnEl.style.boxShadow = "none";
      saveBtnEl.style.background = "rgba(40,30,15,0.9)";
    });

    // Hover for load button
    const loadBtnEl = ctx.menuEl.querySelector("#diablo-load-btn") as HTMLButtonElement | null;
    if (loadBtnEl) {
      loadBtnEl.addEventListener("mouseenter", () => {
        loadBtnEl.style.borderColor = "#68f";
        loadBtnEl.style.boxShadow = "0 0 15px rgba(100,100,255,0.3)";
        loadBtnEl.style.background = "rgba(30,30,50,0.95)";
      });
      loadBtnEl.addEventListener("mouseleave", () => {
        loadBtnEl.style.borderColor = "#44a";
        loadBtnEl.style.boxShadow = "none";
        loadBtnEl.style.background = "rgba(40,30,15,0.9)";
      });
      loadBtnEl.addEventListener("click", () => {
        ctx.loadGame();
      });
    }

    // Hover effects for exit button
    const exitBtnEl = ctx.menuEl.querySelector("#diablo-exit-btn") as HTMLButtonElement;
    exitBtnEl.addEventListener("mouseenter", () => {
      exitBtnEl.style.borderColor = "#e44";
      exitBtnEl.style.boxShadow = "0 0 15px rgba(200,168,78,0.3)";
      exitBtnEl.style.background = "rgba(50,40,20,0.95)";
    });
    exitBtnEl.addEventListener("mouseleave", () => {
      exitBtnEl.style.borderColor = "#a44";
      exitBtnEl.style.boxShadow = "none";
      exitBtnEl.style.background = "rgba(40,30,15,0.9)";
    });

    ctx.menuEl.querySelector("#diablo-resume-btn")!.addEventListener("click", () => {
      ctx.state.phase = DiabloPhase.PLAYING;
      ctx.menuEl.innerHTML = "";
    });
    ctx.menuEl.querySelector("#diablo-controls-btn")!.addEventListener("click", () => {
      ctx.setPhaseBeforeOverlay(DiabloPhase.PAUSED);
      ctx.state.phase = DiabloPhase.INVENTORY;
      showControls(ctx);
    });
    ctx.menuEl.querySelector("#diablo-inventory-btn")!.addEventListener("click", () => {
      ctx.setPhaseBeforeOverlay(DiabloPhase.PAUSED);
      ctx.state.phase = DiabloPhase.INVENTORY;
      ctx.showInventory();
    });
    ctx.menuEl.querySelector("#diablo-character-btn")!.addEventListener("click", () => {
      ctx.setPhaseBeforeOverlay(DiabloPhase.PAUSED);
      ctx.state.phase = DiabloPhase.INVENTORY;
      showCharacterOverview(ctx);
    });
    ctx.menuEl.querySelector("#diablo-skilltree-btn")!.addEventListener("click", () => {
      ctx.setPhaseBeforeOverlay(DiabloPhase.PAUSED);
      ctx.state.phase = DiabloPhase.INVENTORY;
      showSkillTreeScreen(ctx);
    });
    ctx.menuEl.querySelector("#diablo-skillswap-btn")!.addEventListener("click", () => {
      ctx.setPhaseBeforeOverlay(DiabloPhase.PAUSED);
      ctx.state.phase = DiabloPhase.INVENTORY;
      showSkillSwapMenu(ctx);
    });
    ctx.menuEl.querySelector("#diablo-stash-btn")!.addEventListener("click", () => {
      ctx.setPhaseBeforeOverlay(DiabloPhase.PAUSED);
      ctx.state.phase = DiabloPhase.INVENTORY;
      showStash(ctx);
    });
    ctx.menuEl.querySelector("#diablo-collection-btn")!.addEventListener("click", () => {
      ctx.setPhaseBeforeOverlay(DiabloPhase.PAUSED);
      ctx.state.phase = DiabloPhase.INVENTORY;
      showCollection(ctx);
    });
    ctx.menuEl.querySelector("#diablo-bestiary-btn")!.addEventListener("click", () => {
      ctx.setPhaseBeforeOverlay(DiabloPhase.PAUSED);
      ctx.state.phase = DiabloPhase.INVENTORY;
      showBestiary(ctx);
    });
    ctx.menuEl.querySelector("#diablo-pets-btn")!.addEventListener("click", () => {
      ctx.setPhaseBeforeOverlay(DiabloPhase.PAUSED);
      ctx.state.phase = DiabloPhase.INVENTORY;
      ctx.showPetPanel();
    });
    ctx.menuEl.querySelector("#diablo-dailies-btn")!.addEventListener("click", () => {
      ctx.showQuestTracker();
      ctx.state.phase = DiabloPhase.PLAYING;
      ctx.menuEl.innerHTML = "";
    });
    ctx.menuEl.querySelector("#diablo-charselect-btn")!.addEventListener("click", () => {
      ctx.state.phase = DiabloPhase.CLASS_SELECT;
      showClassSelect(ctx);
    });
    ctx.menuEl.querySelector("#diablo-save-btn")!.addEventListener("click", () => {
      ctx.saveGame();
    });
    ctx.menuEl.querySelector("#diablo-export-btn")!.addEventListener("click", () => {
      const ok = exportSaveToFile();
      if (!ok) {
        ctx.addFloatingText(ctx.state.player.x, ctx.state.player.y + 2, ctx.state.player.z, 'No save data to export', '#ff4444');
      } else {
        ctx.addFloatingText(ctx.state.player.x, ctx.state.player.y + 2, ctx.state.player.z, 'Save exported!', '#44ff44');
      }
    });
    ctx.menuEl.querySelector("#diablo-import-btn")!.addEventListener("click", () => {
      importSaveFromFile((success, message) => {
        // Show result message as an overlay
        const msgDiv = document.createElement('div');
        msgDiv.style.cssText = `position:fixed;top:40%;left:50%;transform:translate(-50%,-50%);z-index:300;
          background:rgba(10,10,20,0.95);border:2px solid ${success ? '#44ff44' : '#ff4444'};
          border-radius:8px;padding:16px 28px;color:${success ? '#44ff44' : '#ff4444'};
          font-family:Georgia,serif;font-size:18px;text-align:center;pointer-events:none;`;
        msgDiv.textContent = message;
        document.body.appendChild(msgDiv);
        if (!success) {
          setTimeout(() => { msgDiv.style.opacity = '0'; msgDiv.style.transition = 'opacity 0.5s'; }, 2000);
          setTimeout(() => msgDiv.remove(), 2500);
        }
      });
    });
    ctx.menuEl.querySelector("#diablo-exit-btn")!.addEventListener("click", () => {
      window.dispatchEvent(new CustomEvent("diabloExit"));
    });
}

// ════════════════════════════════════════════════════════════════════════════
//  9. showControls
// ════════════════════════════════════════════════════════════════════════════

export function showControls(ctx: ScreenContext): void {
    const p = ctx.state.player;

    const keyCap = (key: string): string =>
      `<span style="display:inline-block;background:rgba(60,50,30,0.8);border:1px solid #888;border-radius:4px;padding:2px 10px;font-family:monospace;min-width:40px;text-align:center;color:#fff;">${key}</span>`;

    const row = (key: string, desc: string): string =>
      `<div style="display:flex;align-items:center;gap:15px;margin:6px 0;">${keyCap(key)}<span style="color:#ccc;">${desc}</span></div>`;

    const sectionHeader = (title: string): string =>
      `<div style="font-size:20px;color:#c8a84e;border-bottom:1px solid #5a4a2a;padding-bottom:4px;margin-bottom:10px;margin-top:20px;font-weight:bold;">${title}</div>`;

    // Build skills section
    let skillsHtml = "";
    for (let i = 0; i < p.skills.length; i++) {
      const def = SKILL_DEFS[p.skills[i]];
      if (!def) continue;
      skillsHtml += `<div style="display:flex;align-items:center;gap:15px;margin:6px 0;">
        ${keyCap(String(i + 1))}
        <span style="font-size:18px;">${def.icon}</span>
        <span style="color:#c8a84e;font-weight:bold;">${def.name}</span>
        <span style="color:#999;font-size:13px;"> — ${def.description}</span>
      </div>`;
    }

    ctx.menuEl.innerHTML = `
      <style>
        .diablo-controls-scroll::-webkit-scrollbar { width: 8px; }
        .diablo-controls-scroll::-webkit-scrollbar-track { background: rgba(10,8,4,0.6); border-radius: 4px; }
        .diablo-controls-scroll::-webkit-scrollbar-thumb { background: linear-gradient(180deg, #5a4a2a, #3a2a1a); border-radius: 4px; border: 1px solid #6b5a3a; }
        .diablo-controls-scroll::-webkit-scrollbar-thumb:hover { background: linear-gradient(180deg, #7a6a4a, #5a4a2a); }
      </style>
      <div style="
        width:100%;height:100%;${SCREEN_BG}display:flex;flex-direction:column;
        align-items:center;justify-content:center;color:#fff;pointer-events:auto;position:relative;overflow:hidden;
        background-image:radial-gradient(ellipse at center,rgba(40,30,15,0.15) 0%,transparent 70%);
      ">
        <!-- Ornate gothic page border -->
        <div style="position:absolute;inset:8px;border:2px solid #5a4a2a;border-radius:4px;pointer-events:none;
          box-shadow:inset 0 0 30px rgba(0,0,0,0.5),0 0 1px #3a2a1a;"></div>
        <div style="position:absolute;inset:12px;border:1px solid #3a2a1a;border-radius:2px;pointer-events:none;"></div>
        <!-- Corner diamond ornaments -->
        <div style="position:absolute;top:14px;left:14px;color:#5a4a2a;font-size:20px;">&#9670;</div>
        <div style="position:absolute;top:14px;right:14px;color:#5a4a2a;font-size:20px;">&#9670;</div>
        <div style="position:absolute;bottom:14px;left:14px;color:#5a4a2a;font-size:20px;">&#9670;</div>
        <div style="position:absolute;bottom:14px;right:14px;color:#5a4a2a;font-size:20px;">&#9670;</div>

        <!-- Scroll icon -->
        <div style="font-size:36px;margin-bottom:4px;text-shadow:0 0 12px rgba(200,168,78,0.3);">&#x1F4DC;</div>

        <!-- Title with decorative dividers -->
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:6px;">
          <div style="width:80px;height:1px;background:linear-gradient(to right,transparent,#5a4a2a);"></div>
          <div style="color:#5a4a2a;font-size:14px;">&#10038;</div>
          <h1 style="color:#c8a84e;font-size:36px;letter-spacing:4px;margin:0;text-align:center;
            font-family:'Georgia',serif;text-shadow:0 0 15px rgba(200,168,78,0.4);">CONTROLS</h1>
          <div style="color:#5a4a2a;font-size:14px;">&#10038;</div>
          <div style="width:80px;height:1px;background:linear-gradient(to left,transparent,#5a4a2a);"></div>
        </div>
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px;">
          <div style="width:120px;height:1px;background:linear-gradient(to right,transparent,#3a2a1a);"></div>
          <div style="color:#8a7a4a;font-size:12px;letter-spacing:4px;font-family:'Georgia',serif;">KEYBINDINGS &amp; COMMANDS</div>
          <div style="width:120px;height:1px;background:linear-gradient(to left,transparent,#3a2a1a);"></div>
        </div>

        <!-- Beveled panel frame with corner rivets -->
        <div style="
          max-width:700px;width:90%;background:rgba(15,10,5,0.95);
          border:3px solid #5a4a2a;border-top-color:#8a7a4a;border-left-color:#7a6a3a;
          border-right-color:#3a2a1a;border-bottom-color:#2a1a0a;
          border-radius:12px;padding:30px 40px;max-height:70vh;overflow-y:auto;position:relative;
          background-image:repeating-linear-gradient(45deg,transparent,transparent 8px,rgba(200,168,78,0.015) 8px,rgba(200,168,78,0.015) 16px);
        " class="diablo-controls-scroll">
          <!-- Corner rivets -->
          <div style="position:absolute;top:6px;left:6px;width:8px;height:8px;border-radius:50%;background:radial-gradient(circle at 35% 35%,#ffd740,#8a6a20);box-shadow:0 1px 2px rgba(0,0,0,0.6);"></div>
          <div style="position:absolute;top:6px;right:6px;width:8px;height:8px;border-radius:50%;background:radial-gradient(circle at 35% 35%,#ffd740,#8a6a20);box-shadow:0 1px 2px rgba(0,0,0,0.6);"></div>
          <div style="position:absolute;bottom:6px;left:6px;width:8px;height:8px;border-radius:50%;background:radial-gradient(circle at 35% 35%,#ffd740,#8a6a20);box-shadow:0 1px 2px rgba(0,0,0,0.6);"></div>
          <div style="position:absolute;bottom:6px;right:6px;width:8px;height:8px;border-radius:50%;background:radial-gradient(circle at 35% 35%,#ffd740,#8a6a20);box-shadow:0 1px 2px rgba(0,0,0,0.6);"></div>

          ${sectionHeader("MOVEMENT")}
          ${row("W / \u2191", "Move Forward")}
          ${row("S / \u2193", "Move Backward")}
          ${row("A / \u2190", "Move Left")}
          ${row("D / \u2192", "Move Right")}
          ${row("SPACE", "Dodge Roll (brief invulnerability)")}

          ${sectionHeader("COMBAT")}
          ${row("Left Click", "Attack / Select Target")}
          ${row("Right Click", "Block (Warrior/Ranger)")}
          ${row("1-6", "Activate Skills")}

          ${sectionHeader("SKILLS")}
          ${skillsHtml}

          ${sectionHeader("POTIONS")}
          ${row("Q", "Quick-use Health Potion")}
          ${row("E", "Quick-use Mana Potion (outside Camelot)")}
          ${row("F1-F4", "Use Potion from Quick Slots")}

          ${sectionHeader("INTERACTION")}
          ${row("F", "Open nearby Chest")}
          ${row("E", "Interact (Vendors / Crafting in Camelot)")}
          ${row("E", "Use Town Portal (near portal on combat maps)")}

          ${sectionHeader("INTERFACE")}
          ${row("I", "Open Inventory")}
          ${row("T", "Open Talent Tree")}
          ${row("K", "Swap Skills Menu")}
          ${row("J", "Quest Journal")}
          ${row("G", "Pet Management")}
          ${row("B", "Advanced Crafting")}
          ${row("L / P", "Toggle Lantern")}
          ${row("M", "Toggle Fullscreen Map")}
          ${row("ESC", "Pause Menu")}

          <div style="text-align:center;margin-top:30px;">
            <button id="diablo-controls-back" style="
              width:200px;padding:12px 0;font-size:18px;letter-spacing:3px;font-weight:bold;
              background:rgba(40,30,15,0.9);border:2px solid #5a4a2a;border-radius:8px;color:#c8a84e;
              cursor:pointer;transition:all 0.2s;font-family:'Georgia',serif;pointer-events:auto;
            ">BACK</button>
          </div>
        </div>
      </div>`;

    const backBtn = ctx.menuEl.querySelector("#diablo-controls-back") as HTMLButtonElement;
    backBtn.addEventListener("mouseenter", () => {
      backBtn.style.borderColor = "#c8a84e";
      backBtn.style.boxShadow = "0 0 15px rgba(200,168,78,0.3)";
      backBtn.style.background = "rgba(50,40,20,0.95)";
    });
    backBtn.addEventListener("mouseleave", () => {
      backBtn.style.borderColor = "#5a4a2a";
      backBtn.style.boxShadow = "none";
      backBtn.style.background = "rgba(40,30,15,0.9)";
    });
    backBtn.addEventListener("click", () => {
      ctx.backToMenu();
    });
}

// ════════════════════════════════════════════════════════════════════════════
//  10. showGameOver
// ════════════════════════════════════════════════════════════════════════════

export function showGameOver(ctx: ScreenContext): void {
    ctx.state.phase = DiabloPhase.GAME_OVER;
    const p = ctx.state.player;
    ctx.menuEl.innerHTML = `
      <style>
        @keyframes go-blood-pulse {
          0%   { text-shadow: 0 0 20px rgba(200,30,30,0.4), 0 0 60px rgba(150,0,0,0.2); }
          50%  { text-shadow: 0 0 40px rgba(255,40,40,0.8), 0 0 80px rgba(200,0,0,0.4), 0 4px 12px rgba(120,0,0,0.6); }
          100% { text-shadow: 0 0 20px rgba(200,30,30,0.4), 0 0 60px rgba(150,0,0,0.2); }
        }
        @keyframes go-skull-float {
          0%   { transform: translateY(0px); }
          50%  { transform: translateY(-6px); }
          100% { transform: translateY(0px); }
        }
        @keyframes go-chain-sway {
          0%   { transform: translateX(0px); }
          25%  { transform: translateX(2px); }
          75%  { transform: translateX(-2px); }
          100% { transform: translateX(0px); }
        }
        @keyframes go-fade-in {
          0%   { opacity: 0; transform: scale(0.95); }
          100% { opacity: 1; transform: scale(1); }
        }
        #go-return-btn:hover {
          background: rgba(60,25,25,0.95) !important;
          border-color: #ffd740 !important;
          color: #ffd740 !important;
          box-shadow: 0 0 20px rgba(255,215,64,0.3), inset 0 0 20px rgba(255,215,64,0.05) !important;
        }
        #go-exit-btn:hover {
          background: rgba(50,20,20,0.95) !important;
          border-color: #ffd740 !important;
          color: #ffd740 !important;
          box-shadow: 0 0 20px rgba(255,215,64,0.3), inset 0 0 20px rgba(255,215,64,0.05) !important;
        }
      </style>
      <div style="
        width:100%;height:100%;${SCREEN_BG}display:flex;flex-direction:column;
        align-items:center;justify-content:center;color:#fff;font-family:'Georgia',serif;
        animation: go-fade-in 0.6s ease-out;
      ">
        <!-- Outer stone frame -->
        <div style="
          position:relative;
          background:rgba(15,8,8,0.95);
          border:2px solid #5a4a2a;
          border-top-color:#8a7a4a;border-left-color:#7a6a3a;
          border-right-color:#3a2a1a;border-bottom-color:#2a1a0a;
          border-radius:4px;
          padding:6px;
          min-width:420px;max-width:500px;
          box-shadow: 0 0 40px rgba(150,0,0,0.3), inset 0 0 60px rgba(0,0,0,0.5);
        ">
          <!-- Corner rivets -->
          <div style="position:absolute;top:-5px;left:-5px;width:10px;height:10px;border-radius:50%;
            background:radial-gradient(circle at 35% 35%,#ffd740,#8a6a20);box-shadow:0 1px 3px rgba(0,0,0,0.6);"></div>
          <div style="position:absolute;top:-5px;right:-5px;width:10px;height:10px;border-radius:50%;
            background:radial-gradient(circle at 35% 35%,#ffd740,#8a6a20);box-shadow:0 1px 3px rgba(0,0,0,0.6);"></div>
          <div style="position:absolute;bottom:-5px;left:-5px;width:10px;height:10px;border-radius:50%;
            background:radial-gradient(circle at 35% 35%,#ffd740,#8a6a20);box-shadow:0 1px 3px rgba(0,0,0,0.6);"></div>
          <div style="position:absolute;bottom:-5px;right:-5px;width:10px;height:10px;border-radius:50%;
            background:radial-gradient(circle at 35% 35%,#ffd740,#8a6a20);box-shadow:0 1px 3px rgba(0,0,0,0.6);"></div>

          <!-- Left chain -->
          <div style="position:absolute;left:-18px;top:40px;bottom:40px;width:12px;display:flex;
            flex-direction:column;align-items:center;gap:2px;animation:go-chain-sway 3s ease-in-out infinite;">
            ${Array.from({length:10},()=>`<div style="width:8px;height:14px;border:2px solid #5a4a2a;border-radius:50%;
              background:transparent;"></div>`).join("")}
          </div>
          <!-- Right chain -->
          <div style="position:absolute;right:-18px;top:40px;bottom:40px;width:12px;display:flex;
            flex-direction:column;align-items:center;gap:2px;animation:go-chain-sway 3s ease-in-out infinite reverse;">
            ${Array.from({length:10},()=>`<div style="width:8px;height:14px;border:2px solid #5a4a2a;border-radius:50%;
              background:transparent;"></div>`).join("")}
          </div>

          <!-- Inner decorative border -->
          <div style="
            border:1px solid #3a2a1a;
            border-top-color:#5a4a2a;border-left-color:#4a3a2a;
            border-right-color:#2a1a0a;border-bottom-color:#1a0a00;
            padding:30px 36px;
            display:flex;flex-direction:column;align-items:center;
          ">
            <!-- Skull icon -->
            <div style="
              font-size:64px;line-height:1;margin-bottom:8px;
              filter:drop-shadow(0 0 12px rgba(200,30,30,0.5));
              animation: go-skull-float 3s ease-in-out infinite;
            ">&#9760;</div>

            <!-- Title -->
            <h1 style="
              color:#cc2222;font-size:48px;letter-spacing:6px;margin:0 0 6px 0;
              font-family:'Georgia',serif;
              animation: go-blood-pulse 2.5s ease-in-out infinite;
            ">YOU HAVE FALLEN</h1>

            <!-- Decorative divider -->
            <div style="display:flex;align-items:center;gap:10px;margin:12px 0 20px 0;width:100%;">
              <div style="flex:1;height:1px;background:linear-gradient(to right,transparent,#5a4a2a);"></div>
              <div style="width:8px;height:8px;background:#c8a84e;transform:rotate(45deg);box-shadow:0 0 6px rgba(200,168,78,0.4);"></div>
              <div style="width:6px;height:6px;background:#8a6a20;transform:rotate(45deg);"></div>
              <div style="width:8px;height:8px;background:#c8a84e;transform:rotate(45deg);box-shadow:0 0 6px rgba(200,168,78,0.4);"></div>
              <div style="flex:1;height:1px;background:linear-gradient(to left,transparent,#5a4a2a);"></div>
            </div>

            <!-- Subtitle -->
            <div style="color:#8a6a6a;font-size:14px;letter-spacing:3px;margin-bottom:24px;
              font-style:italic;">THE DARKNESS CLAIMS ANOTHER SOUL</div>

            <!-- Stats panel -->
            <div style="
              background:rgba(20,10,10,0.9);
              border:1px solid #5a2a2a;
              border-top-color:#6a3a3a;border-left-color:#5a3030;
              border-right-color:#3a1a1a;border-bottom-color:#2a0a0a;
              border-radius:4px;
              padding:20px 28px;margin-bottom:24px;width:100%;
              box-shadow:inset 0 0 30px rgba(0,0,0,0.4);
            ">
              <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:16px;text-align:center;">
                <!-- Kills -->
                <div style="display:flex;flex-direction:column;align-items:center;gap:6px;">
                  <div style="font-size:22px;filter:drop-shadow(0 0 4px rgba(255,100,100,0.4));">&#9876;</div>
                  <div style="font-size:11px;color:#8a7a6a;letter-spacing:2px;text-transform:uppercase;">Kills</div>
                  <div style="font-size:22px;color:#ff8;font-weight:bold;
                    text-shadow:0 0 8px rgba(255,255,136,0.3);">${ctx.state.killCount}</div>
                </div>
                <!-- Gold -->
                <div style="display:flex;flex-direction:column;align-items:center;gap:6px;">
                  <div style="font-size:22px;filter:drop-shadow(0 0 4px rgba(255,215,0,0.4));">&#9672;</div>
                  <div style="font-size:11px;color:#8a7a6a;letter-spacing:2px;text-transform:uppercase;">Gold</div>
                  <div style="font-size:22px;color:#ffd700;font-weight:bold;
                    text-shadow:0 0 8px rgba(255,215,0,0.3);">${p.gold}</div>
                </div>
                <!-- Level -->
                <div style="display:flex;flex-direction:column;align-items:center;gap:6px;">
                  <div style="font-size:22px;filter:drop-shadow(0 0 4px rgba(136,170,255,0.4));">&#9733;</div>
                  <div style="font-size:11px;color:#8a7a6a;letter-spacing:2px;text-transform:uppercase;">Level</div>
                  <div style="font-size:22px;color:#8af;font-weight:bold;
                    text-shadow:0 0 8px rgba(136,170,255,0.3);">${p.level}</div>
                </div>
              </div>
            </div>

            <!-- Bottom decorative divider -->
            <div style="display:flex;align-items:center;gap:10px;margin-bottom:24px;width:100%;">
              <div style="flex:1;height:1px;background:linear-gradient(to right,transparent,#5a4a2a);"></div>
              <div style="width:6px;height:6px;background:#c8a84e;transform:rotate(45deg);"></div>
              <div style="flex:1;height:1px;background:linear-gradient(to left,transparent,#5a4a2a);"></div>
            </div>

            <!-- Buttons -->
            <div style="display:flex;gap:16px;width:100%;justify-content:center;">
              <button id="go-return-btn" style="
                background:rgba(40,15,15,0.9);
                border:2px solid #c8a84e;border-top-color:#dab85e;border-left-color:#b8984e;
                border-right-color:#8a6a20;border-bottom-color:#6a4a10;
                color:#c8a84e;font-size:16px;
                padding:12px 28px;cursor:pointer;border-radius:4px;
                font-family:'Georgia',serif;letter-spacing:2px;pointer-events:auto;
                box-shadow:0 2px 8px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,215,64,0.1);
                transition: all 0.2s ease;
              ">RETURN TO CHARACTER SELECT</button>
              <button id="go-exit-btn" style="
                background:rgba(30,12,12,0.9);
                border:2px solid #5a4a2a;border-top-color:#7a6a3a;border-left-color:#6a5a2a;
                border-right-color:#3a2a1a;border-bottom-color:#2a1a0a;
                color:#8a7a6a;font-size:16px;
                padding:12px 28px;cursor:pointer;border-radius:4px;
                font-family:'Georgia',serif;letter-spacing:2px;pointer-events:auto;
                box-shadow:0 2px 8px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,215,64,0.05);
                transition: all 0.2s ease;
              ">EXIT</button>
            </div>
          </div>
        </div>
      </div>`;

    ctx.menuEl.querySelector("#go-return-btn")!.addEventListener("click", () => {
      ctx.state.phase = DiabloPhase.CLASS_SELECT;
      showClassSelect(ctx);
    });
    ctx.menuEl.querySelector("#go-exit-btn")!.addEventListener("click", () => {
      window.dispatchEvent(new CustomEvent("diabloExit"));
    });
}

// ════════════════════════════════════════════════════════════════════════════
//  11. showVictory
// ════════════════════════════════════════════════════════════════════════════

export function showVictory(ctx: ScreenContext): void {
    ctx.state.phase = DiabloPhase.VICTORY;
    const p = ctx.state.player;

    // Transfer inventory to persistent stash
    ctx.state.persistentGold += p.gold;
    ctx.state.persistentLevel = Math.max(ctx.state.persistentLevel, p.level);
    ctx.state.persistentXp = Math.max(ctx.state.persistentXp, p.xp);
    for (let i = 0; i < p.inventory.length; i++) {
      if (p.inventory[i].item && i < ctx.state.persistentInventory.length) {
        if (ctx.state.persistentInventory[i].item === null) {
          ctx.state.persistentInventory[i].item = p.inventory[i].item;
        }
      }
    }

    const reward = MAP_COMPLETION_REWARDS[ctx.state.currentMap];
    const rewardHtml = reward ? `
      <div style="font-size:14px;color:#c8a84e;margin-top:8px;font-style:italic;">${reward.bonusMessage}</div>
    ` : "";
    const clearedCount = Object.keys(ctx.state.completedMaps).length;
    const totalMaps = 8;

    ctx.menuEl.innerHTML = `
      <style>
        @keyframes victory-golden-pulse {
          0%, 100% { text-shadow:0 0 20px rgba(255,215,0,0.4), 0 0 40px rgba(255,215,0,0.2); }
          50% { text-shadow:0 0 35px rgba(255,215,0,0.8), 0 0 70px rgba(255,215,0,0.4), 0 0 100px rgba(255,215,0,0.2); }
        }
        @keyframes victory-trophy-shimmer {
          0%, 100% { filter:drop-shadow(0 0 8px rgba(255,215,0,0.5)); transform:scale(1); }
          50% { filter:drop-shadow(0 0 22px rgba(255,215,0,0.9)) drop-shadow(0 0 44px rgba(200,168,78,0.4)); transform:scale(1.06); }
        }
        @keyframes victory-rivet-gleam {
          0%, 100% { box-shadow:0 0 4px rgba(255,215,0,0.3); }
          50% { box-shadow:0 0 10px rgba(255,215,0,0.7), 0 0 20px rgba(255,215,0,0.3); }
        }
        @keyframes victory-fade-in {
          0% { opacity:0; transform:scale(0.95); }
          100% { opacity:1; transform:scale(1); }
        }
        #diablo-nextmap-btn:hover {
          background:rgba(30,50,30,0.95) !important;
          border-color:#ffd700 !important;
          color:#ffd700 !important;
          box-shadow:0 0 20px rgba(255,215,0,0.4), inset 0 0 20px rgba(255,215,0,0.1) !important;
          transform:translateY(-2px) !important;
        }
        #diablo-exit-btn:hover {
          background:rgba(60,20,20,0.95) !important;
          border-color:#ff4444 !important;
          color:#ff6666 !important;
          box-shadow:0 0 20px rgba(255,50,50,0.4), inset 0 0 20px rgba(255,50,50,0.1) !important;
          transform:translateY(-2px) !important;
        }
        #diablo-nextmap-btn, #diablo-exit-btn {
          transition:all 0.25s ease !important;
        }
      </style>
      <div style="
        width:100%;height:100%;
        ${SCREEN_BG}
        display:flex;flex-direction:column;align-items:center;justify-content:center;color:#fff;
        font-family:'Georgia',serif;
        animation:victory-fade-in 0.6s ease-out;
      ">
        <!-- Trophy/Crown Icon -->
        <div style="
          font-size:74px;line-height:1;margin-bottom:6px;
          animation:victory-trophy-shimmer 2.5s ease-in-out infinite;
        ">&#128081;</div>

        <!-- Title -->
        <h1 style="
          color:#ffd700;font-size:54px;letter-spacing:8px;margin:0 0 6px 0;
          font-family:'Georgia',serif;
          animation:victory-golden-pulse 2s ease-in-out infinite;
          text-transform:uppercase;
        ">MAP CLEARED!</h1>

        <!-- Top decorative divider -->
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:24px;">
          <div style="width:80px;height:1px;background:linear-gradient(to right,transparent,#c8a84e);"></div>
          <div style="width:8px;height:8px;background:#c8a84e;transform:rotate(45deg);box-shadow:0 0 6px rgba(200,168,78,0.4);"></div>
          <span style="color:#ffd700;font-size:14px;">&#9884;</span>
          <div style="width:8px;height:8px;background:#c8a84e;transform:rotate(45deg);box-shadow:0 0 6px rgba(200,168,78,0.4);"></div>
          <div style="width:80px;height:1px;background:linear-gradient(to left,transparent,#c8a84e);"></div>
        </div>

        <!-- Main Panel: stone frame -->
        <div style="
          position:relative;
          background:linear-gradient(180deg, rgba(30,25,15,0.95) 0%, rgba(12,10,5,0.98) 100%);
          border:2px solid #5a4a2a;
          border-top-color:#8a7a4a;border-left-color:#7a6a3a;
          border-right-color:#3a2a1a;border-bottom-color:#2a1a0a;
          border-radius:4px;
          padding:32px 40px;margin-bottom:24px;min-width:400px;
          box-shadow:0 0 50px rgba(0,0,0,0.8), inset 0 1px 0 rgba(200,168,78,0.15), 0 0 90px rgba(200,168,78,0.06);
        ">
          <!-- Inner decorative border -->
          <div style="position:absolute;inset:4px;border:1px solid #3a2a1a;border-top-color:#5a4a2a;border-left-color:#4a3a2a;
            border-right-color:#2a1a0a;border-bottom-color:#1a0a00;border-radius:3px;pointer-events:none;"></div>

          <!-- Corner rivets -->
          <div style="position:absolute;top:6px;left:6px;width:10px;height:10px;border-radius:50%;
            background:radial-gradient(circle at 35% 35%,#ffd740,#8a6a20);
            animation:victory-rivet-gleam 3s ease-in-out infinite;"></div>
          <div style="position:absolute;top:6px;right:6px;width:10px;height:10px;border-radius:50%;
            background:radial-gradient(circle at 35% 35%,#ffd740,#8a6a20);
            animation:victory-rivet-gleam 3s ease-in-out 0.5s infinite;"></div>
          <div style="position:absolute;bottom:6px;left:6px;width:10px;height:10px;border-radius:50%;
            background:radial-gradient(circle at 35% 35%,#ffd740,#8a6a20);
            animation:victory-rivet-gleam 3s ease-in-out 1s infinite;"></div>
          <div style="position:absolute;bottom:6px;right:6px;width:10px;height:10px;border-radius:50%;
            background:radial-gradient(circle at 35% 35%,#ffd740,#8a6a20);
            animation:victory-rivet-gleam 3s ease-in-out 1.5s infinite;"></div>

          <!-- Stats Grid -->
          <div style="
            display:grid;grid-template-columns:1fr 1fr;gap:18px 36px;
            padding:8px 12px;
          ">
            <!-- Kills -->
            <div style="display:flex;align-items:center;gap:12px;">
              <div style="font-size:24px;filter:drop-shadow(0 0 5px rgba(255,100,100,0.4));">&#128128;</div>
              <div>
                <div style="font-size:10px;color:#8a7a6a;text-transform:uppercase;letter-spacing:2px;">Kills</div>
                <div style="font-size:24px;color:#ff8;font-weight:bold;text-shadow:0 0 10px rgba(255,255,136,0.3);">${ctx.state.killCount}</div>
              </div>
            </div>
            <!-- Gold -->
            <div style="display:flex;align-items:center;gap:12px;">
              <div style="font-size:24px;filter:drop-shadow(0 0 5px rgba(255,215,0,0.4));">&#129689;</div>
              <div>
                <div style="font-size:10px;color:#8a7a6a;text-transform:uppercase;letter-spacing:2px;">Gold</div>
                <div style="font-size:24px;color:#ffd700;font-weight:bold;text-shadow:0 0 10px rgba(255,215,0,0.3);">${p.gold}</div>
              </div>
            </div>
            <!-- Level -->
            <div style="display:flex;align-items:center;gap:12px;">
              <div style="font-size:24px;filter:drop-shadow(0 0 5px rgba(136,170,255,0.4));">&#11088;</div>
              <div>
                <div style="font-size:10px;color:#8a7a6a;text-transform:uppercase;letter-spacing:2px;">Level</div>
                <div style="font-size:24px;color:#8af;font-weight:bold;text-shadow:0 0 10px rgba(136,170,255,0.3);">${p.level}</div>
              </div>
            </div>
            <!-- Maps Cleared -->
            <div style="display:flex;align-items:center;gap:12px;">
              <div style="font-size:24px;filter:drop-shadow(0 0 5px rgba(174,213,129,0.4));">&#128506;</div>
              <div>
                <div style="font-size:10px;color:#8a7a6a;text-transform:uppercase;letter-spacing:2px;">Maps Cleared</div>
                <div style="font-size:24px;color:#aed581;font-weight:bold;text-shadow:0 0 10px rgba(174,213,129,0.3);">${clearedCount}<span style="font-size:14px;color:#666;">/${totalMaps}</span></div>
              </div>
            </div>
          </div>

          ${rewardHtml ? `
          <!-- Reward divider -->
          <div style="display:flex;align-items:center;gap:10px;margin:20px 0 16px 0;">
            <div style="flex:1;height:1px;background:linear-gradient(to right,transparent,#5a4a2a);"></div>
            <div style="width:6px;height:6px;background:#c8a84e;transform:rotate(45deg);"></div>
            <span style="color:#c8a84e;font-size:12px;">&#9830;</span>
            <div style="width:6px;height:6px;background:#c8a84e;transform:rotate(45deg);"></div>
            <div style="flex:1;height:1px;background:linear-gradient(to left,transparent,#5a4a2a);"></div>
          </div>
          <!-- Reward message -->
          <div style="
            text-align:center;padding:12px 18px;
            background:linear-gradient(90deg, transparent, rgba(200,168,78,0.1), transparent);
            border-left:2px solid #c8a84e;border-right:2px solid #c8a84e;border-radius:2px;
          ">
            <div style="font-size:10px;color:#8a7a6a;text-transform:uppercase;letter-spacing:3px;margin-bottom:6px;">&#9733; Reward &#9733;</div>
            <div style="font-size:15px;color:#ffd700;font-style:italic;text-shadow:0 0 12px rgba(255,215,0,0.3);">${rewardHtml}</div>
          </div>
          ` : ''}
        </div>

        <!-- Bottom decorative divider -->
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:24px;">
          <div style="width:50px;height:1px;background:linear-gradient(to right,transparent,#5a4a2a);"></div>
          <div style="width:5px;height:5px;background:#5a4a2a;transform:rotate(45deg);"></div>
          <div style="width:50px;height:1px;background:linear-gradient(to left,transparent,#5a4a2a);"></div>
        </div>

        <!-- Buttons -->
        <div style="display:flex;gap:20px;">
          <button id="diablo-nextmap-btn" style="
            background:rgba(15,30,15,0.9);
            border:2px solid #c8a84e;border-top-color:#dab85e;border-left-color:#b8984e;
            border-right-color:#8a6a20;border-bottom-color:#6a4a10;
            color:#c8a84e;font-size:17px;
            padding:14px 36px;cursor:pointer;border-radius:4px;
            font-family:'Georgia',serif;letter-spacing:2px;pointer-events:auto;
            box-shadow:0 2px 10px rgba(0,0,0,0.4), inset 0 1px 0 rgba(200,168,78,0.12);
            text-shadow:0 0 8px rgba(200,168,78,0.3);
          ">&#9876; SELECT ANOTHER MAP</button>
          <button id="diablo-exit-btn" style="
            background:rgba(40,15,15,0.9);
            border:2px solid #a44;border-top-color:#c55;border-left-color:#b44;
            border-right-color:#833;border-bottom-color:#622;
            color:#e66;font-size:17px;
            padding:14px 36px;cursor:pointer;border-radius:4px;
            font-family:'Georgia',serif;letter-spacing:2px;pointer-events:auto;
            box-shadow:0 2px 10px rgba(0,0,0,0.4), inset 0 1px 0 rgba(170,68,68,0.12);
            text-shadow:0 0 8px rgba(230,100,100,0.3);
          ">&#10006; EXIT</button>
        </div>
      </div>`;

    ctx.menuEl.querySelector("#diablo-nextmap-btn")!.addEventListener("click", () => {
      ctx.showMapSelect();
    });
    ctx.menuEl.querySelector("#diablo-exit-btn")!.addEventListener("click", () => {
      window.dispatchEvent(new CustomEvent("diabloExit"));
    });
}

// ════════════════════════════════════════════════════════════════════════════
//  12. showStash
// ════════════════════════════════════════════════════════════════════════════

export function showStash(ctx: ScreenContext): void {
    const p = ctx.state.player;
    const stash = ctx.state.persistentStash;

    // Build inventory grid (8x5 = 40 slots)
    let invHtml = "";
    for (let i = 0; i < p.inventory.length; i++) {
      const slot = p.inventory[i];
      const item = slot.item;
      const borderColor = item ? RARITY_CSS[item.rarity] : "#3a3a3a";
      const content = item
        ? `<div style="font-size:22px;">${item.icon}</div>`
        : "";
      invHtml += `
        <div class="stash-inv-slot" data-inv-idx="${i}" style="
          width:55px;height:55px;background:rgba(15,10,5,0.85);border:1px solid ${borderColor};
          border-radius:4px;display:flex;align-items:center;justify-content:center;
          cursor:pointer;pointer-events:auto;position:relative;
        ">${content}</div>`;
    }

    // Build stash grid (10x15 = 150 slots)
    let stashHtml = "";
    for (let i = 0; i < stash.length; i++) {
      const slot = stash[i];
      const item = slot.item;
      const borderColor = item ? RARITY_CSS[item.rarity] : "#3a3a3a";
      const content = item
        ? `<div style="font-size:22px;">${item.icon}</div>`
        : "";
      stashHtml += `
        <div class="stash-slot" data-stash-idx="${i}" style="
          width:55px;height:55px;background:rgba(15,10,5,0.85);border:1px solid ${borderColor};
          border-radius:4px;display:flex;align-items:center;justify-content:center;
          cursor:pointer;pointer-events:auto;position:relative;
        ">${content}</div>`;
    }

    ctx.menuEl.innerHTML = `
      <div style="
        width:100%;height:100%;
        ${SCREEN_BG}
        display:flex;flex-direction:column;
        align-items:center;justify-content:center;color:#fff;pointer-events:auto;
        position:relative;
      ">
        <!-- Ornate page border -->
        <div style="position:absolute;inset:8px;border:2px solid rgba(200,168,78,0.25);border-radius:4px;pointer-events:none;
          box-shadow:0 0 30px rgba(200,168,78,0.1), inset 0 0 50px rgba(0,0,0,0.3);"></div>
        <div style="position:absolute;inset:12px;border:1px solid #3a2a1a;border-radius:2px;pointer-events:none;"></div>
        <!-- Corner ornaments -->
        <div style="position:absolute;top:14px;left:14px;color:#5a4a2a;font-size:18px;">&#9670;</div>
        <div style="position:absolute;top:14px;right:14px;color:#5a4a2a;font-size:18px;">&#9670;</div>
        <div style="position:absolute;bottom:14px;left:14px;color:#5a4a2a;font-size:18px;">&#9670;</div>
        <div style="position:absolute;bottom:14px;right:14px;color:#5a4a2a;font-size:18px;">&#9670;</div>

        <!-- Title -->
        <div style="display:flex;align-items:center;gap:16px;margin-bottom:12px;">
          <div style="width:60px;height:1px;background:linear-gradient(to right,transparent,#5a4a2a);"></div>
          <span style="color:#5a4a2a;font-size:14px;">&#9884;</span>
          <h2 style="color:#c8a84e;font-size:32px;letter-spacing:5px;margin:0;font-family:'Georgia',serif;
            text-shadow:0 0 16px rgba(200,168,78,0.35), 0 2px 4px rgba(0,0,0,0.6);">
            SHARED STASH
          </h2>
          <span style="color:#5a4a2a;font-size:14px;">&#9884;</span>
          <div style="width:60px;height:1px;background:linear-gradient(to left,transparent,#5a4a2a);"></div>
        </div>
        <div style="color:#887766;font-size:12px;letter-spacing:3px;margin-bottom:14px;font-family:'Georgia',serif;">
          Click items to transfer between panels
        </div>

        <!-- Sort buttons -->
        <div id="stash-sort-bar" style="display:flex;gap:8px;margin-bottom:14px;justify-content:center;">
          <button class="stash-sort-btn" data-sort="rarity" style="padding:6px 16px;background:rgba(30,25,15,0.9);color:#c8a84e;border:1px solid #5a4a2a;border-radius:4px;cursor:pointer;font-family:Georgia,serif;font-size:12px;transition:all 0.2s;">Sort: Rarity</button>
          <button class="stash-sort-btn" data-sort="type" style="padding:6px 16px;background:rgba(30,25,15,0.9);color:#c8a84e;border:1px solid #5a4a2a;border-radius:4px;cursor:pointer;font-family:Georgia,serif;font-size:12px;transition:all 0.2s;">Sort: Type</button>
          <button class="stash-sort-btn" data-sort="level" style="padding:6px 16px;background:rgba(30,25,15,0.9);color:#c8a84e;border:1px solid #5a4a2a;border-radius:4px;cursor:pointer;font-family:Georgia,serif;font-size:12px;transition:all 0.2s;">Sort: Level</button>
        </div>

        <div style="display:flex;gap:30px;align-items:flex-start;">
          <!-- Inventory Panel -->
          <div style="
            background:linear-gradient(180deg,rgba(30,24,14,0.95) 0%,rgba(20,16,8,0.98) 100%);
            border:2px solid #5a4a2a;border-radius:8px;padding:16px;
            box-shadow:inset 0 0 40px rgba(0,0,0,0.3), 0 4px 12px rgba(0,0,0,0.4);
            position:relative;
          ">
            <div style="position:absolute;inset:4px;border:1px solid rgba(200,168,78,0.1);border-radius:6px;pointer-events:none;"></div>
            <div style="color:#c8a84e;font-size:14px;margin-bottom:10px;text-align:center;font-weight:bold;letter-spacing:2px;font-family:'Georgia',serif;">INVENTORY</div>
            <div style="display:grid;grid-template-columns:repeat(8,55px);grid-template-rows:repeat(5,55px);gap:3px;">
              ${invHtml}
            </div>
          </div>
          <!-- Arrow indicator -->
          <div style="align-self:center;font-size:24px;color:#5a4a2a;">&#8596;</div>
          <!-- Stash Panel -->
          <div style="
            background:linear-gradient(180deg,rgba(30,24,14,0.95) 0%,rgba(20,16,8,0.98) 100%);
            border:2px solid #5a4a2a;border-radius:8px;padding:16px;
            box-shadow:inset 0 0 40px rgba(0,0,0,0.3), 0 4px 12px rgba(0,0,0,0.4);
            position:relative;
          ">
            <div style="position:absolute;inset:4px;border:1px solid rgba(200,168,78,0.1);border-radius:6px;pointer-events:none;"></div>
            <div style="color:#c8a84e;font-size:14px;margin-bottom:10px;text-align:center;font-weight:bold;letter-spacing:2px;font-family:'Georgia',serif;">STASH</div>
            <div style="display:grid;grid-template-columns:repeat(10,55px);gap:3px;max-height:700px;overflow-y:auto;">
              ${stashHtml}
            </div>
          </div>
        </div>

        <!-- Decorative divider -->
        <div style="display:flex;align-items:center;gap:8px;margin:14px 0 8px;">
          <div style="width:60px;height:1px;background:linear-gradient(to right,transparent,#5a4a2a);"></div>
          <span style="color:#5a4a2a;font-size:10px;">&#9830;</span>
          <div style="width:60px;height:1px;background:linear-gradient(to left,transparent,#5a4a2a);"></div>
        </div>

        <!-- Bottom bar -->
        <div style="display:flex;gap:30px;align-items:center;">
          <div style="font-size:16px;color:#ffd700;font-family:'Georgia',serif;">\uD83E\uDE99 ${p.gold} Gold</div>
          <button id="stash-back-btn" style="
            padding:12px 40px;font-size:18px;letter-spacing:3px;font-weight:bold;
            background:linear-gradient(180deg,rgba(40,30,15,0.9),rgba(25,18,8,0.95));
            border:2px solid #5a4a2a;border-top-color:#8a7a4a;border-bottom-color:#2a1a0a;
            border-radius:8px;color:#c8a84e;
            cursor:pointer;transition:all 0.2s;font-family:'Georgia',serif;pointer-events:auto;
            box-shadow:0 3px 8px rgba(0,0,0,0.4), inset 0 1px 0 rgba(200,168,78,0.15);
          ">BACK</button>
        </div>
        <div id="stash-status" style="margin-top:10px;color:#ff4444;font-size:14px;min-height:20px;font-family:'Georgia',serif;"></div>
        <!-- Tooltip container -->
        <div id="inv-tooltip" style="
          display:none;position:fixed;z-index:100;background:rgba(10,5,2,0.96);border:2px solid #5a4a2a;
          border-radius:8px;padding:14px;max-width:280px;pointer-events:none;color:#ccc;font-size:13px;
          box-shadow:0 4px 12px rgba(0,0,0,0.6), inset 0 0 20px rgba(0,0,0,0.3);
        "></div>
      </div>`;

    const statusEl = ctx.menuEl.querySelector("#stash-status") as HTMLDivElement;
    const showStatus = (msg: string, color: string) => {
      statusEl.textContent = msg;
      statusEl.style.color = color;
      setTimeout(() => { statusEl.textContent = ""; }, 1500);
    };

    // Wire up inventory slots (click to transfer to stash)
    const invSlots = ctx.menuEl.querySelectorAll(".stash-inv-slot") as NodeListOf<HTMLDivElement>;
    invSlots.forEach((el) => {
      const idx = parseInt(el.getAttribute("data-inv-idx")!, 10);
      el.addEventListener("click", () => {
        const item = p.inventory[idx].item;
        if (!item) return;
        const emptyStashIdx = stash.findIndex((s) => s.item === null);
        if (emptyStashIdx < 0) {
          showStatus("No space in stash!", "#ff4444");
          return;
        }
        stash[emptyStashIdx].item = item;
        p.inventory[idx].item = null;
        showStash(ctx); // Re-render
      });
      el.addEventListener("mouseenter", (ev) => showItemTooltip(ctx, ev, p.inventory[idx].item));
      el.addEventListener("mouseleave", () => ctx.hideItemTooltip());
    });

    // Wire up stash slots (click to transfer to inventory)
    const stashSlots = ctx.menuEl.querySelectorAll(".stash-slot") as NodeListOf<HTMLDivElement>;
    stashSlots.forEach((el) => {
      const idx = parseInt(el.getAttribute("data-stash-idx")!, 10);
      el.addEventListener("click", () => {
        const item = stash[idx].item;
        if (!item) return;
        const emptyInvIdx = p.inventory.findIndex((s) => s.item === null);
        if (emptyInvIdx < 0) {
          showStatus("No space in inventory!", "#ff4444");
          return;
        }
        p.inventory[emptyInvIdx].item = item;
        stash[idx].item = null;
        showStash(ctx); // Re-render
      });
      el.addEventListener("mouseenter", (ev) => showItemTooltip(ctx, ev, stash[idx].item));
      el.addEventListener("mouseleave", () => ctx.hideItemTooltip());
    });

    // Sort buttons
    const sortBtns = ctx.menuEl.querySelectorAll(".stash-sort-btn") as NodeListOf<HTMLButtonElement>;
    sortBtns.forEach((btn) => {
      btn.addEventListener("mouseenter", () => {
        btn.style.borderColor = "#c8a84e";
        btn.style.background = "#666";
      });
      btn.addEventListener("mouseleave", () => {
        btn.style.borderColor = "#888";
        btn.style.background = "#555";
      });
      btn.addEventListener("click", () => {
        const sortType = btn.getAttribute("data-sort") as 'rarity' | 'type' | 'level';
        ctx.sortStash(sortType);
        showStash(ctx);
      });
    });

    // Back button
    const backBtn = ctx.menuEl.querySelector("#stash-back-btn") as HTMLButtonElement;
    backBtn.addEventListener("mouseenter", () => {
      backBtn.style.borderColor = "#c8a84e";
      backBtn.style.boxShadow = "0 0 15px rgba(200,168,78,0.3)";
      backBtn.style.background = "rgba(50,40,20,0.95)";
    });
    backBtn.addEventListener("mouseleave", () => {
      backBtn.style.borderColor = "#5a4a2a";
      backBtn.style.boxShadow = "none";
      backBtn.style.background = "rgba(40,30,15,0.9)";
    });
    backBtn.addEventListener("click", () => {
      ctx.backToMenu();
    });
}

// ════════════════════════════════════════════════════════════════════════════
//  13. showSkillTreeScreen
// ════════════════════════════════════════════════════════════════════════════

export function showSkillTreeScreen(ctx: ScreenContext): void {
    const p = ctx.state.player;

    // All skills for the player's class, ordered by unlock level
    const SKILL_UNLOCK_LEVELS: Partial<Record<SkillId, number>> = {
      // Warrior
      [SkillId.CLEAVE]: 1, [SkillId.SHIELD_BASH]: 3, [SkillId.WHIRLWIND]: 6,
      [SkillId.BATTLE_CRY]: 10, [SkillId.GROUND_SLAM]: 15, [SkillId.BLADE_FURY]: 20,
      [SkillId.LEAP]: 3, [SkillId.IRON_SKIN]: 6, [SkillId.TAUNT]: 9,
      [SkillId.CRUSHING_BLOW]: 12, [SkillId.INTIMIDATING_ROAR]: 15, [SkillId.EARTHQUAKE]: 18,
      // Mage
      [SkillId.FIREBALL]: 1, [SkillId.LIGHTNING_BOLT]: 3, [SkillId.ICE_NOVA]: 6,
      [SkillId.ARCANE_SHIELD]: 10, [SkillId.METEOR]: 15, [SkillId.CHAIN_LIGHTNING]: 20,
      [SkillId.SUMMON_ELEMENTAL]: 3, [SkillId.BLINK]: 6, [SkillId.FROST_BARRIER]: 9,
      [SkillId.ARCANE_MISSILES]: 12, [SkillId.MANA_SIPHON]: 15, [SkillId.TIME_WARP]: 18,
      // Ranger
      [SkillId.MULTI_SHOT]: 1, [SkillId.POISON_ARROW]: 3, [SkillId.EVASIVE_ROLL]: 6,
      [SkillId.EXPLOSIVE_TRAP]: 10, [SkillId.RAIN_OF_ARROWS]: 15, [SkillId.PIERCING_SHOT]: 20,
      [SkillId.GRAPPLING_HOOK]: 3, [SkillId.CAMOUFLAGE]: 6, [SkillId.NET_TRAP]: 9,
      [SkillId.FIRE_VOLLEY]: 12, [SkillId.WIND_WALK]: 15, [SkillId.SHADOW_STRIKE]: 18,
    };

    // Skill upgrade descriptions per level tier
    const SKILL_UPGRADES: Record<number, string> = {
      5: "+10% damage",
      10: "+15% damage, -1s cooldown",
      15: "+20% damage, -10% mana cost",
      20: "+25% damage, -2s cooldown",
      25: "+30% damage, +1 range",
      30: "+40% damage, -15% mana cost",
      35: "+50% damage, +AOE radius",
      40: "+60% damage, -3s cooldown",
    };

    // Get all skills for current class
    const classSkills = Object.values(SKILL_DEFS).filter((s) => s.class === p.class);
    classSkills.sort((a, b) => (SKILL_UNLOCK_LEVELS[a.id] || 99) - (SKILL_UNLOCK_LEVELS[b.id] || 99));

    let skillsHtml = "";
    for (const def of classSkills) {
      const unlockLvl = SKILL_UNLOCK_LEVELS[def.id] || 1;
      const unlocked = p.level >= unlockLvl;
      const isActive = p.skills.includes(def.id);
      const borderColor = isActive ? "#c8a84e" : unlocked ? "#5a8a2a" : "#3a3a3a";
      const opacity = unlocked ? "1" : "0.5";

      const statusText = isActive
        ? `<span style="color:#ffd700;font-weight:bold;">EQUIPPED</span>`
        : unlocked
          ? `<span style="color:#5a5;">UNLOCKED</span>`
          : `<span style="color:#888;">Unlocks at Level ${unlockLvl}</span>`;

      // Status effect info
      let statusEffHtml = "";
      if (def.statusEffect) {
        statusEffHtml = `<span style="color:#f84;">Applies: ${def.statusEffect}</span>`;
      }

      // AOE info
      let aoeHtml = "";
      if (def.aoeRadius) {
        aoeHtml = `<span style="color:#8af;">AOE: ${def.aoeRadius} radius</span>`;
      }

      // Build upgrade progression
      let upgradeHtml = "";
      const upgradeLevels = [5, 10, 15, 20, 25, 30, 35, 40];
      for (const uLvl of upgradeLevels) {
        if (uLvl <= unlockLvl) continue; // skip upgrades below unlock level
        const reached = p.level >= uLvl;
        const color = reached ? "#6c6" : "#555";
        const check = reached ? "+" : "-";
        upgradeHtml += `<div style="color:${color};font-size:11px;margin-left:8px;">${check} Lv.${uLvl}: ${SKILL_UPGRADES[uLvl]}</div>`;
      }

      // Build specialization / branch choices
      const skillBranches = SKILL_BRANCHES.filter((b) => b.skillId === def.id);
      const totalTalentSpent = Object.values(p.talents).reduce((sum, v) => sum + v, 0);
      let branchHtml = "";
      for (const bd of skillBranches) {
        const key = `${bd.skillId}_b${bd.tier}`;
        const choice = p.skillBranches[key] || 0;
        const meetsReq = totalTalentSpent >= bd.talentReq;

        const renderOption = (opt: typeof bd.optionA, optIdx: 1 | 2) => {
          const isChosen = choice === optIdx;
          const isOther = choice > 0 && !isChosen;
          let modifiers = "";
          if (opt.damageMult && opt.damageMult !== 1) modifiers += `<span style="color:#fa8;">Dmg x${opt.damageMult}</span> `;
          if (opt.cooldownMult && opt.cooldownMult !== 1) modifiers += `<span style="color:#8af;">CD x${opt.cooldownMult}</span> `;
          if (opt.manaCostMult && opt.manaCostMult !== 1) modifiers += `<span style="color:#48f;">Mana x${opt.manaCostMult}</span> `;
          if (opt.aoeRadiusMult && opt.aoeRadiusMult !== 1) modifiers += `<span style="color:#8af;">AoE x${opt.aoeRadiusMult}</span> `;
          if (opt.extraProjectiles) modifiers += `<span style="color:#ff8;">+${opt.extraProjectiles} proj</span> `;
          if (opt.statusOverride) modifiers += `<span style="color:#f84;">${opt.statusOverride}</span> `;

          const borderCol = isChosen ? "#ffd700" : isOther ? "#2a2a2a" : meetsReq ? "#5a8a2a" : "#3a3a3a";
          const opac = isOther ? "0.4" : (!meetsReq && !isChosen) ? "0.5" : "1";
          const canChoose = !choice && meetsReq;

          return `<div class="branch-opt" data-branch-key="${key}" data-branch-choice="${optIdx}" style="
            flex:1;background:rgba(10,8,4,0.9);border:2px solid ${borderCol};border-radius:6px;
            padding:8px;opacity:${opac};cursor:${canChoose ? "pointer" : "default"};
            pointer-events:auto;transition:border-color 0.2s;min-width:0;
          ">
            <div style="display:flex;align-items:center;gap:6px;margin-bottom:4px;">
              <span style="font-size:18px;">${opt.icon}</span>
              <span style="color:${isChosen ? "#ffd700" : "#c8a84e"};font-weight:bold;font-size:12px;">${opt.name}</span>
            </div>
            <div style="color:#aaa;font-size:10px;margin-bottom:4px;">${opt.description}</div>
            <div style="display:flex;flex-wrap:wrap;gap:4px;font-size:10px;">${modifiers}</div>
            ${isChosen ? '<div style="color:#ffd700;font-size:10px;margin-top:4px;font-weight:bold;">CHOSEN</div>' : ""}
            ${canChoose ? '<div style="color:#5a5;font-size:10px;margin-top:4px;font-weight:bold;">CHOOSE</div>' : ""}
          </div>`;
        };

        const reqText = meetsReq
          ? ""
          : `<div style="color:#888;font-size:10px;margin-bottom:4px;">Requires ${bd.talentReq} talent points invested (${totalTalentSpent} / ${bd.talentReq})</div>`;

        branchHtml += `
          <div style="margin-top:6px;">
            <div style="font-size:11px;color:#c8a84e;margin-bottom:4px;">Tier ${bd.tier} Specialization</div>
            ${reqText}
            <div style="display:flex;gap:8px;">
              ${renderOption(bd.optionA, 1)}
              ${renderOption(bd.optionB, 2)}
            </div>
          </div>`;
      }

      skillsHtml += `
        <div style="
          background:rgba(15,10,5,0.9);border:2px solid ${borderColor};border-radius:8px;
          padding:14px;opacity:${opacity};transition:border-color 0.2s;margin-bottom:10px;
        ">
          <div style="display:flex;align-items:center;gap:10px;margin-bottom:6px;">
            <span style="font-size:28px;">${def.icon}</span>
            <div style="flex:1;">
              <div style="display:flex;align-items:center;gap:10px;">
                <span style="color:#c8a84e;font-weight:bold;font-size:16px;">${def.name}</span>
                ${statusText}
              </div>
              <div style="color:#aaa;font-size:12px;margin-top:2px;">${def.description}</div>
            </div>
          </div>
          <div style="display:flex;flex-wrap:wrap;gap:12px;font-size:12px;color:#999;margin-bottom:6px;">
            <span>Cooldown: ${def.cooldown}s</span>
            <span style="color:#48f;">Mana: ${def.manaCost}</span>
            <span style="color:#fa8;">Type: ${def.damageType}</span>
            <span>Dmg: x${def.damageMultiplier}</span>
            ${statusEffHtml}
            ${aoeHtml}
          </div>
          ${upgradeHtml ? `<div style="border-top:1px solid #333;padding-top:4px;margin-top:4px;">
            <div style="font-size:11px;color:#888;margin-bottom:2px;">Level Upgrades:</div>
            ${upgradeHtml}
          </div>` : ""}
          ${branchHtml ? `<div style="border-top:1px solid #444;padding-top:6px;margin-top:6px;">
            <div style="font-size:12px;color:#c8a84e;font-weight:bold;margin-bottom:4px;">Specializations</div>
            ${branchHtml}
          </div>` : ""}
        </div>`;
    }

    // Talent summary
    const talentBonuses = ctx.getTalentBonuses();
    const cdr = talentBonuses[TalentEffectType.SKILL_COOLDOWN_REDUCTION] || 0;
    const bonusDmg = talentBonuses[TalentEffectType.BONUS_DAMAGE_PERCENT] || 0;
    let talentSummary = "";
    if (cdr > 0) talentSummary += `<span style="color:#8af;margin-right:12px;">CDR: ${cdr}%</span>`;
    if (bonusDmg > 0) talentSummary += `<span style="color:#fa8;margin-right:12px;">+${bonusDmg}% Damage</span>`;
    if (!talentSummary) talentSummary = `<span style="color:#555;">No talent bonuses yet</span>`;

    ctx.menuEl.innerHTML = `
      <div style="
        width:100%;height:100%;${SCREEN_BG}display:flex;flex-direction:column;
        align-items:center;justify-content:center;color:#fff;pointer-events:auto;
      ">
        <h2 style="color:#c8a84e;font-size:32px;letter-spacing:3px;margin-bottom:4px;font-family:'Georgia',serif;
          text-shadow:0 0 15px rgba(200,168,78,0.4);">SKILL TREE</h2>
        <div style="font-size:14px;color:#888;margin-bottom:12px;">Level ${p.level} ${p.class.charAt(0).toUpperCase() + p.class.slice(1).toLowerCase()} — Talent Points: <span style="color:#ffd700;">${p.talentPoints}</span></div>
        <div style="display:flex;gap:12px;margin-bottom:16px;">
          <button id="st-tab-skills" style="
            padding:8px 24px;font-size:14px;letter-spacing:2px;font-weight:bold;
            background:rgba(60,50,20,0.9);border:2px solid #c8a84e;border-radius:6px;color:#ffd700;
            cursor:pointer;font-family:'Georgia',serif;pointer-events:auto;
          ">SKILLS</button>
          <button id="st-tab-talents" style="
            padding:8px 24px;font-size:14px;letter-spacing:2px;font-weight:bold;
            background:rgba(30,20,10,0.7);border:2px solid #3a3a2a;border-radius:6px;color:#888;
            cursor:pointer;font-family:'Georgia',serif;pointer-events:auto;
          ">TALENTS</button>
        </div>
        <div style="max-width:600px;width:90%;max-height:60vh;overflow-y:auto;padding:4px;">
          ${skillsHtml}
        </div>
        <div style="margin-top:12px;padding:8px 16px;background:rgba(20,15,10,0.9);border:1px solid #5a4a2a;border-radius:8px;font-size:13px;">
          Talent Bonuses: ${talentSummary}
        </div>
        <div style="margin-top:10px;color:#888;font-size:12px;">Press Escape to close</div>
      </div>`;

    // Tab switching
    ctx.menuEl.querySelector("#st-tab-talents")!.addEventListener("click", () => {
      showTalentTree(ctx);
    });
    ctx.menuEl.querySelector("#st-tab-skills")!.addEventListener("mouseenter", (ev) => {
      (ev.target as HTMLElement).style.boxShadow = "0 0 12px rgba(200,168,78,0.3)";
    });
    ctx.menuEl.querySelector("#st-tab-skills")!.addEventListener("mouseleave", (ev) => {
      (ev.target as HTMLElement).style.boxShadow = "none";
    });
    ctx.menuEl.querySelector("#st-tab-talents")!.addEventListener("mouseenter", (ev) => {
      (ev.target as HTMLElement).style.borderColor = "#c8a84e";
      (ev.target as HTMLElement).style.boxShadow = "0 0 12px rgba(200,168,78,0.3)";
    });
    ctx.menuEl.querySelector("#st-tab-talents")!.addEventListener("mouseleave", (ev) => {
      (ev.target as HTMLElement).style.borderColor = "#3a3a2a";
      (ev.target as HTMLElement).style.boxShadow = "none";
    });

    // Wire up branch specialization choice buttons
    const branchOpts = ctx.menuEl.querySelectorAll(".branch-opt") as NodeListOf<HTMLDivElement>;
    branchOpts.forEach((el) => {
      const key = el.getAttribute("data-branch-key")!;
      const choiceVal = parseInt(el.getAttribute("data-branch-choice")!, 10);
      const currentChoice = p.skillBranches[key] || 0;
      const bd = SKILL_BRANCHES.find((b) => `${b.skillId}_b${b.tier}` === key);
      if (!bd) return;
      const totalSpent = Object.values(p.talents).reduce((sum, v) => sum + v, 0);
      const canChoose = !currentChoice && totalSpent >= bd.talentReq;

      if (canChoose) {
        el.addEventListener("mouseenter", () => {
          el.style.borderColor = "#c8a84e";
          el.style.boxShadow = "0 0 12px rgba(200,168,78,0.3)";
        });
        el.addEventListener("mouseleave", () => {
          el.style.borderColor = "#5a8a2a";
          el.style.boxShadow = "none";
        });
        el.addEventListener("click", () => {
          p.skillBranches[key] = choiceVal;
          showSkillTreeScreen(ctx); // refresh to show chosen state
        });
      }
    });
}

// ════════════════════════════════════════════════════════════════════════════
//  14. showTalentTree
// ════════════════════════════════════════════════════════════════════════════

export function showTalentTree(ctx: ScreenContext): void {
    const p = ctx.state.player;
    const tree = TALENT_TREES[p.class];
    const branchNames = TALENT_BRANCH_NAMES[p.class];

    const renderTree = () => {
      let branchesHtml = "";
      for (let b = 0; b < 3; b++) {
        const branchNodes = tree.filter((n) => n.branch === b);
        const pointsInBranch = ctx.getTalentPointsInBranch(b);

        let nodesHtml = "";
        for (const node of branchNodes.sort((a, c) => a.tier - c.tier)) {
          const rank = p.talents[node.id] || 0;
          const isMaxed = rank >= node.maxRank;
          const tierReq = node.tier * 3;
          const hasPrereq = !node.requires || (p.talents[node.requires] || 0) > 0;
          const hasTierReq = pointsInBranch >= tierReq;
          const canInvest = p.talentPoints > 0 && !isMaxed && hasPrereq && hasTierReq;
          const borderColor = isMaxed ? "#ffd700" : canInvest ? "#5a8a2a" : "#3a3a3a";
          const opacity = (rank > 0 || canInvest) ? "1" : "0.5";

          let effectsText = "";
          for (const eff of node.effects) {
            effectsText += `<div style="font-size:10px;color:#8f8;">+${eff.value * Math.max(1, rank)} total</div>`;
          }

          nodesHtml += `
            <div class="talent-node" data-talent-id="${node.id}" style="
              width:148px;background:rgba(15,10,5,0.9);
              border:2px solid ${borderColor};
              border-radius:8px;padding:10px;cursor:${canInvest ? "pointer" : "default"};
              pointer-events:auto;opacity:${opacity};transition:border-color 0.2s,box-shadow 0.3s;
              position:relative;
              ${isMaxed ? "box-shadow:0 0 10px rgba(255,215,0,0.2),inset 0 0 10px rgba(255,215,0,0.05);" : rank > 0 ? "box-shadow:0 0 8px rgba(90,138,42,0.2);" : ""}
            ">
              ${isMaxed ? '<div style="position:absolute;top:3px;right:3px;color:#ffd700;font-size:8px;">\u2605</div>' : ""}
              <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;">
                <div style="position:relative;display:inline-block;">
                  ${rank > 0 ? '<div style="position:absolute;inset:-3px;border-radius:50%;background:radial-gradient(circle,' + (isMaxed ? 'rgba(255,215,0,0.15)' : 'rgba(90,138,42,0.1)') + ',transparent 70%);"></div>' : ""}
                  <span style="font-size:20px;position:relative;z-index:1;">${node.icon}</span>
                </div>
                <span style="color:#c8a84e;font-size:13px;font-weight:bold;">${node.name}</span>
              </div>
              <div style="font-size:11px;color:#aaa;margin-bottom:4px;">${node.description}</div>
              <div style="font-size:12px;color:${isMaxed ? "#ffd700" : "#ccc"};">${rank}/${node.maxRank}</div>
              ${effectsText}
            </div>`;
        }

        branchesHtml += `
          <div style="display:flex;flex-direction:column;gap:8px;align-items:center;
            background:rgba(10,8,4,0.4);border:1px solid #3a2a1a;border-radius:8px;padding:12px 10px;">
            <div style="color:#c8a84e;font-size:16px;font-weight:bold;letter-spacing:1px;padding-bottom:4px;width:100%;text-align:center;
              border-bottom:1px solid #5a4a2a;text-shadow:0 0 8px rgba(200,168,78,0.2);">${branchNames[b]}</div>
            <div style="font-size:11px;color:#888;">${pointsInBranch} points invested</div>
            ${nodesHtml}
          </div>`;
      }

      // Summary of active bonuses
      const bonuses = ctx.getTalentBonuses();
      let summaryHtml = "";
      const effectLabels: Record<string, string> = {
        [TalentEffectType.BONUS_DAMAGE_PERCENT]: "Damage",
        [TalentEffectType.BONUS_HP_PERCENT]: "HP",
        [TalentEffectType.BONUS_MANA_PERCENT]: "Mana",
        [TalentEffectType.BONUS_ARMOR]: "Armor",
        [TalentEffectType.BONUS_CRIT_CHANCE]: "Crit Chance",
        [TalentEffectType.BONUS_CRIT_DAMAGE]: "Crit Damage",
        [TalentEffectType.BONUS_ATTACK_SPEED]: "Atk Speed",
        [TalentEffectType.BONUS_MOVE_SPEED]: "Move Speed",
        [TalentEffectType.SKILL_COOLDOWN_REDUCTION]: "CDR",
        [TalentEffectType.LIFE_STEAL_PERCENT]: "Life Steal",
        [TalentEffectType.MANA_REGEN]: "Mana Regen",
        [TalentEffectType.BONUS_AOE_RADIUS]: "AoE Radius",
        [TalentEffectType.RESISTANCE_ALL]: "All Resist",
      };
      for (const [key, val] of Object.entries(bonuses)) {
        if (val && val > 0) {
          const label = effectLabels[key] || key;
          const isPercent = key.includes("PERCENT") || key.includes("COOLDOWN") || key.includes("CRIT") || key.includes("DAMAGE_PERCENT") || key.includes("HP_PERCENT") || key.includes("MANA_PERCENT") || key.includes("ATTACK_SPEED");
          summaryHtml += `<span style="color:#8f8;font-size:12px;margin-right:12px;">+${val}${isPercent ? "%" : ""} ${label}</span>`;
        }
      }
      if (!summaryHtml) summaryHtml = `<span style="color:#666;font-size:12px;">No talents invested</span>`;

      ctx.menuEl.innerHTML = `
        <div style="
          width:100%;height:100%;${SCREEN_BG}display:flex;flex-direction:column;
          align-items:center;justify-content:center;color:#fff;pointer-events:auto;position:relative;
        ">
          <!-- Stone tablet background -->
          <div style="position:relative;padding:24px 30px;
            background:linear-gradient(180deg,rgba(25,20,12,0.98),rgba(18,14,8,0.98));
            border:2px solid #5a4a2a;border-radius:8px;
            box-shadow:inset 0 0 50px rgba(0,0,0,0.3),0 0 20px rgba(0,0,0,0.5);
            background-image:repeating-linear-gradient(90deg,transparent,transparent 30px,rgba(90,74,42,0.02) 30px,rgba(90,74,42,0.02) 31px);">
            <!-- Inner border -->
            <div style="position:absolute;inset:4px;border:1px solid #3a2a1a;border-radius:6px;pointer-events:none;"></div>

            <!-- Title with flourishes -->
            <div style="text-align:center;margin-bottom:4px;">
              <div style="display:flex;align-items:center;justify-content:center;gap:12px;margin-bottom:4px;">
                <div style="width:50px;height:1px;background:linear-gradient(to right,transparent,#c8a84e);"></div>
                <span style="color:#c8a84e;font-size:10px;">\u2726</span>
                <div style="width:50px;height:1px;background:linear-gradient(to left,transparent,#c8a84e);"></div>
              </div>
              <h2 style="color:#c8a84e;font-size:32px;letter-spacing:3px;margin:0 0 4px;font-family:'Georgia',serif;
                text-shadow:0 0 15px rgba(200,168,78,0.4);">TALENT TREE</h2>
              <div style="display:flex;align-items:center;justify-content:center;gap:12px;margin-bottom:8px;">
                <div style="width:50px;height:1px;background:linear-gradient(to right,transparent,#c8a84e);"></div>
                <span style="color:#c8a84e;font-size:10px;">\u2726</span>
                <div style="width:50px;height:1px;background:linear-gradient(to left,transparent,#c8a84e);"></div>
              </div>
            </div>
            <div style="font-size:16px;color:#ffd700;margin-bottom:16px;text-align:center;text-shadow:0 0 8px rgba(255,215,0,0.2);">Available Points: ${p.talentPoints}</div>
            <div style="display:flex;gap:24px;align-items:flex-start;">${branchesHtml}</div>
            <!-- Summary with ornate frame -->
            <div style="margin-top:16px;padding:10px 16px;background:rgba(20,15,10,0.9);border:1px solid #5a4a2a;border-radius:8px;
              box-shadow:inset 0 0 20px rgba(0,0,0,0.2);text-align:center;">
              ${summaryHtml}
            </div>
            <div style="margin-top:12px;color:#888;font-size:13px;text-align:center;">
              <span style="color:#5a8a2a;">Left-click</span> to assign &nbsp;\u2022&nbsp; <span style="color:#aa4444;">Right-click</span> to remove &nbsp;\u2022&nbsp; Press T or Escape to close
            </div>
          </div>
        </div>`;

      // Wire up talent node clicks
      const nodes = ctx.menuEl.querySelectorAll(".talent-node") as NodeListOf<HTMLDivElement>;
      nodes.forEach((el) => {
        const talentId = el.getAttribute("data-talent-id")!;
        const node = tree.find((n) => n.id === talentId)!;
        const rank = p.talents[node.id] || 0;
        const isMaxed = rank >= node.maxRank;
        const pointsInBranch = ctx.getTalentPointsInBranch(node.branch);
        const tierReq = node.tier * 3;
        const hasPrereq = !node.requires || (p.talents[node.requires] || 0) > 0;
        const hasTierReq = pointsInBranch >= tierReq;
        const canInvest = p.talentPoints > 0 && !isMaxed && hasPrereq && hasTierReq;

        if (canInvest) {
          el.addEventListener("mouseenter", () => {
            el.style.borderColor = "#c8a84e";
            el.style.boxShadow = "0 0 12px rgba(200,168,78,0.3)";
          });
          el.addEventListener("mouseleave", () => {
            el.style.borderColor = "#5a8a2a";
            el.style.boxShadow = rank > 0 ? "0 0 8px rgba(90,138,42,0.2)" : "none";
          });
          el.addEventListener("click", () => {
            p.talents[node.id] = (p.talents[node.id] || 0) + 1;
            p.talentPoints--;
            ctx.setStatsDirty(); ctx.setTalentsDirty();
            ctx.recalculatePlayerStats();
            renderTree();
          });
        }

        // Right-click to remove a point
        if (rank > 0) {
          el.addEventListener("contextmenu", (ev) => {
            ev.preventDefault();
            ev.stopPropagation();
            p.talents[node.id] = Math.max(0, (p.talents[node.id] || 0) - 1);
            if (p.talents[node.id] === 0) delete p.talents[node.id];
            p.talentPoints++;
            ctx.setStatsDirty(); ctx.setTalentsDirty();
            ctx.recalculatePlayerStats();
            renderTree();
          });
          if (!canInvest) {
            // Still need hover effects for removable nodes
            el.addEventListener("mouseenter", () => {
              el.style.borderColor = "#aa4444";
              el.style.boxShadow = "0 0 10px rgba(180,60,60,0.3)";
            });
            el.addEventListener("mouseleave", () => {
              el.style.borderColor = isMaxed ? "#ffd700" : "#5a8a2a";
              el.style.boxShadow = isMaxed ? "0 0 10px rgba(255,215,0,0.2),inset 0 0 10px rgba(255,215,0,0.05)" : "0 0 8px rgba(90,138,42,0.2)";
            });
          }
          el.style.cursor = "pointer";
        }
      });
    };

    renderTree();
}

// ════════════════════════════════════════════════════════════════════════════
//  15. showVendorShop
// ════════════════════════════════════════════════════════════════════════════

export function showVendorShop(ctx: ScreenContext, vendor: DiabloVendor): void {
    // Vendor dialogue — show a floating speech line from this vendor
    const vendorLines = VENDOR_DIALOGUE[vendor.type] || VENDOR_DIALOGUE[VendorType.GENERAL_MERCHANT];
    const vLine = vendorLines[Math.floor(Math.random() * vendorLines.length)];
    ctx.addFloatingText(vendor.x, 3, vendor.z, `"${vLine}"`, '#ffd700');

    const p = ctx.state.player;
    ctx.setPhaseBeforeOverlay(DiabloPhase.PLAYING);
    ctx.state.phase = DiabloPhase.INVENTORY;

    const renderShop = () => {
      // Vendor wares grid
      let waresHtml = "";
      for (let i = 0; i < vendor.inventory.length; i++) {
        const item = vendor.inventory[i];
        const rarityColor = RARITY_CSS[item.rarity];
        const canAfford = p.gold >= item.value;
        const priceColor = canAfford ? "#ffd700" : "#ff4444";
        waresHtml += `
          <div class="vendor-ware" data-ware-idx="${i}" style="
            width:120px;height:120px;background:rgba(15,10,5,0.9);border:2px solid ${rarityColor};
            border-radius:6px;display:flex;flex-direction:column;align-items:center;
            justify-content:center;cursor:pointer;pointer-events:auto;position:relative;
            transition:border-color 0.2s,box-shadow 0.2s;
          ">
            <div style="font-size:32px;">${item.icon}</div>
            <div style="font-size:13px;color:${rarityColor};margin-top:4px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:110px;text-align:center;">${item.name}</div>
            <div style="font-size:12px;color:${priceColor};margin-top:2px;">\uD83E\uDE99 ${item.value}</div>
          </div>`;
      }
      if (vendor.inventory.length === 0 && vendor.type !== VendorType.ALCHEMIST) {
        waresHtml = `<div style="color:#888;font-size:14px;grid-column:1/-1;text-align:center;padding:30px;">Sold out!</div>`;
      }

      // Potion wares for Alchemist
      let potionWaresHtml = "";
      if (vendor.type === VendorType.ALCHEMIST) {
        for (let i = 0; i < POTION_DATABASE.length; i++) {
          const pot = POTION_DATABASE[i];
          const canAfford = p.gold >= pot.cost;
          const priceColor = canAfford ? "#ffd700" : "#ff4444";
          potionWaresHtml += `
            <div class="vendor-potion" data-potion-idx="${i}" style="
              width:120px;height:120px;background:rgba(15,10,5,0.9);border:2px solid #3a5a2a;
              border-radius:6px;display:flex;flex-direction:column;align-items:center;
              justify-content:center;cursor:pointer;pointer-events:auto;position:relative;
              transition:border-color 0.2s,box-shadow 0.2s;
            ">
              <div style="font-size:32px;">${pot.icon}</div>
              <div style="font-size:11px;color:#8f8;margin-top:4px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:110px;text-align:center;">${pot.name}</div>
              <div style="font-size:10px;color:#aaa;margin-top:2px;">${pot.type === 'HEALTH' ? `Heal ${pot.value}` : pot.type === 'MANA' ? `Restore ${pot.value}` : pot.type === 'REJUVENATION' ? `Heal ${pot.value}+Mana` : pot.duration ? `${pot.duration}s buff` : ''}</div>
              <div style="font-size:12px;color:${priceColor};margin-top:2px;">\u{1FA99} ${pot.cost}</div>
            </div>`;
        }
      }

      // Player inventory grid for selling
      let invHtml = "";
      for (let i = 0; i < p.inventory.length; i++) {
        const slot = p.inventory[i];
        const item = slot.item;
        const borderColor = item ? RARITY_CSS[item.rarity] : "#3a3a3a";
        const content = item
          ? `<div style="font-size:20px;">${item.icon}</div>`
          : "";
        invHtml += `
          <div class="vendor-inv-slot" data-inv-idx="${i}" style="
            width:55px;height:55px;background:rgba(15,10,5,0.85);border:1px solid ${borderColor};
            border-radius:4px;display:flex;align-items:center;justify-content:center;
            cursor:pointer;pointer-events:auto;position:relative;
          ">${content}</div>`;
      }

      ctx.menuEl.innerHTML = `
        <div style="
          width:100%;height:100%;${SCREEN_BG}display:flex;flex-direction:column;
          align-items:center;justify-content:center;color:#fff;pointer-events:auto;
        ">
          <div style="
            max-width:920px;width:92%;position:relative;
            background:linear-gradient(180deg,rgba(28,20,10,0.98),rgba(15,10,5,0.95));
            border:2px solid #5a4a2a;
            border-radius:12px;padding:24px 30px;max-height:88vh;overflow-y:auto;
            box-shadow:inset 0 0 40px rgba(0,0,0,0.3),0 0 20px rgba(0,0,0,0.5);
            background-image:repeating-linear-gradient(0deg,transparent,transparent 20px,rgba(90,74,42,0.03) 20px,rgba(90,74,42,0.03) 21px);
          ">
            <!-- Inner decorative border -->
            <div style="position:absolute;inset:4px;border:1px solid #3a2a1a;border-radius:10px;pointer-events:none;"></div>

            <!-- Hanging sign decoration -->
            <div style="text-align:center;margin-bottom:4px;">
              <div style="display:inline-block;position:relative;">
                <div style="display:flex;justify-content:center;gap:120px;margin-bottom:-2px;">
                  <div style="width:2px;height:12px;background:#5a4a2a;"></div>
                  <div style="width:2px;height:12px;background:#5a4a2a;"></div>
                </div>
                <div style="display:inline-block;background:linear-gradient(180deg,rgba(60,45,20,0.9),rgba(40,28,12,0.9));border:2px solid #5a4a2a;border-radius:6px;padding:8px 24px;
                  box-shadow:0 4px 12px rgba(0,0,0,0.4);">
                  <div style="font-size:32px;color:#c8a84e;font-weight:bold;letter-spacing:2px;font-family:'Georgia',serif;">
                    ${vendor.icon} ${vendor.name}
                  </div>
                </div>
              </div>
              <div style="font-size:14px;color:#888;margin-top:6px;">${(VENDOR_DEFS.find(vd => vd.type === vendor.type) || { description: "" }).description}</div>
            </div>

            <!-- Dialogue box -->
            <div style="margin-bottom:14px;background:rgba(30,25,15,0.9);border:1px solid #3a3a2a;border-radius:8px;padding:12px 18px;display:flex;align-items:center;gap:14px;">
              <div style="font-size:36px;flex-shrink:0;">${vendor.icon}</div>
              <div style="flex:1;">
                <div id="vendor-dialogue-text" style="font-size:13px;color:#ccbb99;font-style:italic;line-height:1.5;font-family:'Georgia',serif;min-height:36px;">
                  "${(VENDOR_DIALOGUE[vendor.type] || ["..."])[ctx.vendorDialogueIdx[vendor.type] || 0]}"
                </div>
              </div>
              <button id="vendor-talk-btn" style="
                padding:8px 16px;font-size:12px;background:rgba(40,35,20,0.9);border:1px solid #5a4a2a;
                border-radius:6px;color:#c8a84e;cursor:pointer;font-family:'Georgia',serif;
                pointer-events:auto;white-space:nowrap;transition:border-color 0.2s;
              ">Talk</button>
            </div>

            <!-- Two panels side by side -->
            <div style="display:flex;gap:24px;align-items:flex-start;">
              <!-- Left: Vendor's Wares -->
              <div style="flex:1;min-width:0;">
                <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;justify-content:center;">
                  <div style="width:40px;height:1px;background:linear-gradient(to right,transparent,#5a4a2a);"></div>
                  <span style="color:#c8a84e;font-size:14px;font-weight:bold;">VENDOR'S WARES</span>
                  <div style="width:40px;height:1px;background:linear-gradient(to left,transparent,#5a4a2a);"></div>
                </div>
                <div style="display:grid;grid-template-columns:repeat(4,120px);gap:6px;max-height:420px;overflow-y:auto;justify-content:center;">
                  ${waresHtml}
                </div>
              </div>

              ${vendor.type === VendorType.ALCHEMIST ? `
              <!-- Potions -->
              <div style="flex:1;min-width:0;">
                <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;justify-content:center;">
                  <div style="width:40px;height:1px;background:linear-gradient(to right,transparent,#3a8a2a);"></div>
                  <span style="color:#3a8a2a;font-size:14px;font-weight:bold;">POTIONS</span>
                  <div style="width:40px;height:1px;background:linear-gradient(to left,transparent,#3a8a2a);"></div>
                </div>
                <div style="display:grid;grid-template-columns:repeat(3,120px);gap:6px;max-height:420px;overflow-y:auto;justify-content:center;">
                  ${potionWaresHtml}
                </div>
              </div>` : ""}

              <!-- Right: Player's Items to Sell -->
              <div style="flex:0 0 auto;">
                <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;justify-content:center;">
                  <div style="width:40px;height:1px;background:linear-gradient(to right,transparent,#5a4a2a);"></div>
                  <span style="color:#c8a84e;font-size:14px;font-weight:bold;">YOUR ITEMS (click to sell)</span>
                  <div style="width:40px;height:1px;background:linear-gradient(to left,transparent,#5a4a2a);"></div>
                </div>
                <div style="display:grid;grid-template-columns:repeat(8,55px);grid-template-rows:repeat(5,55px);gap:3px;">
                  ${invHtml}
                </div>
                <button id="quick-sell-btn" style="
                  padding:8px 16px;background:rgba(60,40,20,0.9);border:2px solid #8a6a3a;
                  border-radius:6px;color:#ffd700;font-family:'Georgia',serif;font-size:14px;
                  cursor:pointer;letter-spacing:1px;margin:8px auto;display:block;
                  transition:all 0.2s;pointer-events:auto;
                ">⚡ Quick Sell Common &amp; Uncommon</button>
              </div>
            </div>

            <!-- Bottom bar with coin pile decoration -->
            <div style="display:flex;align-items:center;gap:8px;margin:16px auto 0;justify-content:center;">
              <div style="flex:1;height:1px;background:linear-gradient(to right,transparent,#5a4a2a);"></div>
              <span style="color:#5a4a2a;font-size:8px;">\u25C6</span>
              <div style="flex:1;height:1px;background:linear-gradient(to left,transparent,#5a4a2a);"></div>
            </div>
            <div style="margin-top:10px;display:flex;justify-content:center;align-items:center;gap:30px;">
              <div style="display:flex;align-items:center;gap:6px;background:rgba(50,40,10,0.5);border:1px solid #5a4a2a;border-radius:6px;padding:8px 16px;position:relative;">
                <span style="font-size:14px;position:absolute;left:-10px;top:-6px;opacity:0.4;">\uD83E\uDE99</span>
                <span style="font-size:18px;">\uD83E\uDE99</span>
                <span style="font-size:18px;color:#ffd700;font-weight:bold;">${p.gold} gold</span>
                <span style="font-size:12px;position:absolute;right:-8px;bottom:-4px;opacity:0.3;">\uD83E\uDE99</span>
              </div>
              <button id="vendor-close-btn" style="
                padding:12px 40px;font-size:18px;letter-spacing:3px;font-weight:bold;
                background:linear-gradient(180deg,rgba(50,40,20,0.95),rgba(30,22,10,0.95));
                border:2px solid #5a4a2a;border-radius:8px;color:#c8a84e;
                cursor:pointer;transition:all 0.2s;font-family:'Georgia',serif;pointer-events:auto;
                text-shadow:0 1px 3px rgba(0,0,0,0.5);
              ">CLOSE</button>
            </div>
            <div id="vendor-status" style="margin-top:8px;text-align:center;color:#ff4444;font-size:14px;min-height:20px;"></div>
            <!-- Tooltip container -->
            <div id="inv-tooltip" style="
              display:none;position:fixed;z-index:100;background:rgba(10,5,2,0.96);border:2px solid #5a4a2a;
              border-radius:8px;padding:14px;max-width:280px;pointer-events:none;color:#ccc;font-size:13px;
            "></div>
          </div>
        </div>`;

      const statusEl = ctx.menuEl.querySelector("#vendor-status") as HTMLDivElement;
      const showStatus = (msg: string, color: string) => {
        statusEl.textContent = msg;
        statusEl.style.color = color;
        setTimeout(() => { statusEl.textContent = ""; }, 1500);
      };

      // Wire up vendor ware clicks (buy)
      const wareSlots = ctx.menuEl.querySelectorAll(".vendor-ware") as NodeListOf<HTMLDivElement>;
      wareSlots.forEach((el) => {
        const idx = parseInt(el.getAttribute("data-ware-idx")!, 10);
        el.addEventListener("mouseenter", (ev) => {
          el.style.boxShadow = "0 0 12px rgba(200,168,78,0.3)";
          showItemTooltip(ctx, ev, vendor.inventory[idx]);
        });
        el.addEventListener("mouseleave", () => {
          el.style.boxShadow = "none";
          ctx.hideItemTooltip();
        });
        el.addEventListener("click", () => {
          const item = vendor.inventory[idx];
          if (!item) return;
          if (p.gold < item.value) {
            showStatus("Not enough gold!", "#ff4444");
            return;
          }
          const emptyIdx = p.inventory.findIndex((s) => s.item === null);
          if (emptyIdx < 0) {
            showStatus("Inventory Full!", "#ff4444");
            return;
          }
          p.gold -= item.value;
          p.stats.totalGoldSpent += item.value;
          p.inventory[emptyIdx].item = { ...item, id: ctx.genId() };
          vendor.inventory.splice(idx, 1);
          showStatus(`Purchased ${item.name}!`, "#44ff44");
          renderShop();
        });
      });

      // Wire up potion buy clicks
      const potionSlots = ctx.menuEl.querySelectorAll(".vendor-potion") as NodeListOf<HTMLDivElement>;
      potionSlots.forEach((el) => {
        const idx = parseInt(el.getAttribute("data-potion-idx")!, 10);
        el.addEventListener("mouseenter", () => {
          el.style.boxShadow = "0 0 12px rgba(60,180,60,0.3)";
          el.style.borderColor = "#5a8a2a";
        });
        el.addEventListener("mouseleave", () => {
          el.style.boxShadow = "none";
          el.style.borderColor = "#3a5a2a";
        });
        el.addEventListener("click", () => {
          const pot = POTION_DATABASE[idx];
          if (!pot) return;
          if (p.gold < pot.cost) {
            showStatus("Not enough gold!", "#ff4444");
            return;
          }
          p.gold -= pot.cost;
          p.stats.totalGoldSpent += pot.cost;
          const newPot: DiabloPotion = { ...pot, id: ctx.genId() };
          let assigned = false;
          // Try to stack into existing slot of same type
          for (let s = 0; s < 4; s++) {
            const slot = p.potionSlots[s];
            if (slot && slot.potion.name === pot.name && slot.count < MAX_POTION_STACK) {
              slot.count++;
              assigned = true;
              break;
            }
          }
          // Try empty slot
          if (!assigned) {
            for (let s = 0; s < 4; s++) {
              if (!p.potionSlots[s]) {
                p.potionSlots[s] = { potion: newPot, count: 1 };
                assigned = true;
                break;
              }
            }
          }
          if (!assigned) {
            p.potions.push(newPot);
          }
          showStatus(`Purchased ${pot.name}!`, "#44ff44");
          renderShop();
        });
      });

      // Wire up player inventory slots (sell)
      const invSlots = ctx.menuEl.querySelectorAll(".vendor-inv-slot") as NodeListOf<HTMLDivElement>;
      invSlots.forEach((el) => {
        const idx = parseInt(el.getAttribute("data-inv-idx")!, 10);
        el.addEventListener("mouseenter", (ev) => showItemTooltip(ctx, ev, p.inventory[idx].item));
        el.addEventListener("mouseleave", () => ctx.hideItemTooltip());
        el.addEventListener("click", () => {
          const item = p.inventory[idx].item;
          if (!item) return;
          const sellValue = Math.max(1, Math.floor(item.value * 0.5));
          p.gold += sellValue;
          p.inventory[idx].item = null;
          showStatus(`Sold ${item.name} for ${sellValue} gold`, "#ffd700");
          renderShop();
        });
      });

      // Close button
      const closeBtn = ctx.menuEl.querySelector("#vendor-close-btn") as HTMLButtonElement;
      closeBtn.addEventListener("mouseenter", () => {
        closeBtn.style.borderColor = "#c8a84e";
        closeBtn.style.boxShadow = "0 0 15px rgba(200,168,78,0.3)";
        closeBtn.style.background = "rgba(50,40,20,0.95)";
      });
      closeBtn.addEventListener("mouseleave", () => {
        closeBtn.style.borderColor = "#5a4a2a";
        closeBtn.style.boxShadow = "none";
        closeBtn.style.background = "rgba(40,30,15,0.9)";
      });
      closeBtn.addEventListener("click", () => {
        ctx.state.phase = DiabloPhase.PLAYING;
        ctx.menuEl.innerHTML = "";
      });

      // Talk button — cycle dialogue
      const talkBtn = ctx.menuEl.querySelector("#vendor-talk-btn") as HTMLButtonElement | null;
      if (talkBtn) {
        talkBtn.addEventListener("click", () => {
          const lines = VENDOR_DIALOGUE[vendor.type] || [];
          if (lines.length === 0) return;
          const idx = ((ctx.vendorDialogueIdx[vendor.type] || 0) + 1) % lines.length;
          ctx.vendorDialogueIdx[vendor.type] = idx;
          const textEl = ctx.menuEl.querySelector("#vendor-dialogue-text") as HTMLDivElement | null;
          if (textEl) textEl.textContent = `"${lines[idx]}"`;
        });
        talkBtn.addEventListener("mouseenter", () => {
          talkBtn.style.borderColor = "#c8a84e";
          talkBtn.style.background = "rgba(50,40,20,0.95)";
        });
        talkBtn.addEventListener("mouseleave", () => {
          talkBtn.style.borderColor = "#5a4a2a";
          talkBtn.style.background = "rgba(40,35,20,0.9)";
        });
      }

      // Quick-sell button: sell all COMMON and UNCOMMON items
      const quickSellBtn = ctx.menuEl.querySelector("#quick-sell-btn") as HTMLButtonElement | null;
      if (quickSellBtn) {
        quickSellBtn.addEventListener("click", () => {
          let totalGold = 0;
          let soldCount = 0;
          for (let i = p.inventory.length - 1; i >= 0; i--) {
            const slot = p.inventory[i];
            if (!slot) continue;
            const item = slot.item;
            if (!item) continue;
            if (item.rarity === ItemRarity.COMMON || item.rarity === ItemRarity.UNCOMMON) {
              const sellValue = Math.max(1, Math.floor(item.value * 0.5));
              totalGold += sellValue;
              soldCount++;
              p.inventory.splice(i, 1);
            }
          }
          if (soldCount > 0) {
            p.gold += totalGold;
            ctx.setGoldEarnedTotal(ctx.goldEarnedTotal + totalGold);
            ctx.addFloatingText(p.x, p.y + 3, p.z, `Quick Sold ${soldCount} items: +${totalGold} Gold`, '#ffd700');
            showStatus(`Sold ${soldCount} items for ${totalGold} gold`, "#ffd700");
          } else {
            showStatus("No common or uncommon items to sell", "#aaaaaa");
          }
          renderShop();
        });
      }
    };

    renderShop();
}

// ════════════════════════════════════════════════════════════════════════════
//  15b. showPortalNpcShop — Old Cedric the Wayfarer (portal NPC on adventure maps)
// ════════════════════════════════════════════════════════════════════════════

export function showPortalNpcShop(ctx: ScreenContext, npc: DiabloPortalNpc, mapId: DiabloMapId): void {
    const p = ctx.state.player;
    ctx.setPhaseBeforeOverlay(DiabloPhase.PLAYING);
    ctx.state.phase = DiabloPhase.INVENTORY;

    // Build the rumor pool for this map
    const mapRumors = PORTAL_NPC_RUMORS[mapId] || [];
    const allRumors = [...mapRumors, ...PORTAL_NPC_GENERIC_RUMORS];
    let rumorIdx = 0;

    // Tutorial / guide topics
    const guideBtnStyle = `
      background:rgba(30,25,15,0.9);border:1px solid #4a3a20;color:#c8a84e;
      padding:5px 12px;border-radius:4px;cursor:pointer;font-size:11px;
      font-family:inherit;transition:border-color 0.2s,background 0.2s;
      white-space:nowrap;
    `;
    const guideTopics: { label: string; icon: string; text: string }[] = [
      { label: "Introduction", icon: "\uD83D\uDCDC", text:
        "Welcome, adventurer. Mordred has betrayed Camelot and shattered Excalibur into fragments scattered across the corrupted lands. " +
        "You must explore dangerous maps, slay enemies, collect loot, and grow stronger. " +
        "Visit Camelot to trade with merchants, manage your gear, and prepare for the journey ahead. " +
        "Recover all eight fragments of Excalibur, reforge the blade, and end Mordred's reign." },
      { label: "Controls", icon: "\u2328\uFE0F", text:
        "<b>Movement:</b> W/A/S/D or Arrow Keys. Right-click to move to a location.<br>" +
        "<b>Attack:</b> Left-click on enemies to target and attack.<br>" +
        "<b>Skills:</b> Press 1-6 to use your equipped skills. Shift+1-6 cycles skill runes.<br>" +
        "<b>Potions:</b> F1-F4 use your four quick potion slots.<br>" +
        "<b>Dodge:</b> Space to dodge roll (invincible during the roll).<br>" +
        "<b>Interact:</b> E to talk to NPCs or use the town portal.<br>" +
        "<b>Map:</b> M to toggle the full map. Tab to cycle loot filters.<br>" +
        "<b>Panels:</b> I (inventory), C (character), K (skill swap), B (crafting), O (quests).<br>" +
        "<b>Other:</b> T (lantern), V (first-person toggle), Y (summon pet), H (help), Esc (pause)." },
      { label: "Combat & Dodge", icon: "\u2694\uFE0F", text:
        "Click enemies to target them. Your character auto-attacks when in range. Use skills 1-6 for powerful abilities \u2014 each has a cooldown.<br><br>" +
        "<b>Dodge Roll (Space):</b> You are completely invulnerable for 0.3 seconds during the roll. " +
        "It moves you quickly in your movement direction and has a 1.5 second cooldown. " +
        "Use it to escape deadly boss attacks or reposition in a fight. Timing is everything!<br><br>" +
        "<b>Tip:</b> Watch for boss wind-up animations and dodge just before the hit lands." },
      { label: "Skills & Runes", icon: "\uD83D\uDD25", text:
        "You have 6 skill slots (keys 1-6). Each class starts with 6 base skills and can unlock 6 more as you level up.<br><br>" +
        "<b>Skill Runes:</b> Press Shift+1-6 to cycle through rune variants for each skill. " +
        "Runes modify how a skill behaves \u2014 adding effects like extra damage, area of effect, or utility.<br><br>" +
        "<b>Skill Swap:</b> Press K to open the skill swap menu and rearrange which skills are in which slot.<br><br>" +
        "<b>Mana:</b> Skills cost mana. Your mana regenerates over time. Blue potions restore mana instantly." },
      { label: "Pets & Familiars", icon: "\uD83D\uDC3E", text:
        "You start with a Wolf Pup familiar. Press <b>Y</b> to cycle through and summon your pets. Only one can be active at a time.<br><br>" +
        "<b>Pet Types:</b><br>" +
        "\u2022 <b>Combat</b> \u2014 Wolf Pup, Fire Sprite, Storm Falcon, etc. They attack enemies alongside you.<br>" +
        "\u2022 <b>Loot</b> \u2014 Treasure Imp, Gold Scarab, Magpie. They auto-collect loot and increase drops.<br>" +
        "\u2022 <b>Utility</b> \u2014 Healing Wisp, Shield Golem, Mana Sprite. They provide buffs and healing.<br><br>" +
        "New pets drop from specific maps (check Shift+P for the pet panel). Pets gain XP and level up alongside you." },
      { label: "Equipment & Loot", icon: "\uD83D\uDEE1\uFE0F", text:
        "Press <b>I</b> to open your inventory. You have 9 equipment slots: Helmet, Body, Gauntlets, Legs, Feet, Weapon, two Accessories, and a Lantern.<br><br>" +
        "<b>Rarity:</b> Common (grey) \u2192 Uncommon (green) \u2192 Rare (blue) \u2192 Epic (purple) \u2192 Legendary (orange) \u2192 Mythic (red) \u2192 Divine (gold).<br><br>" +
        "<b>Pick Up:</b> Press F near dropped items to pick them up. Items are not auto-collected.<br><br>" +
        "<b>Loot Filter:</b> Press Tab to cycle through filters so you only see the rarities you care about.<br><br>" +
        "<b>Salvage:</b> Shift+C quick-salvages common/uncommon items for crafting materials. Sell unwanted gear to vendors for gold." },
      { label: "Potions & Healing", icon: "\uD83E\uDDEA", text:
        "You have 4 quick potion slots (F1-F4). Assign potions from your inventory to these slots.<br><br>" +
        "<b>Health potions</b> restore HP. <b>Mana potions</b> restore mana. There are also <b>Rejuvenation</b> potions (both), " +
        "and buff potions like <b>Elixir of Strength</b> (+20% damage) and <b>Elixir of Speed</b> (+30% movement).<br><br>" +
        "Potions have a 5-second cooldown between uses. Enemies have a 30% chance to drop potions when slain. " +
        "You can also buy potions from me or from the Alchemist in Camelot." },
      { label: "Excalibur Quest", icon: "\u2694\uFE0F", text:
        "The main quest: recover 8 fragments of Excalibur from bosses across the land.<br><br>" +
        "\u2022 <b>The Pommel</b> \u2014 Sunscorch Desert (Sandsworn Revenant)<br>" +
        "\u2022 <b>The Crossguard</b> \u2014 Emerald Grasslands (Warchief Garon)<br>" +
        "\u2022 <b>The Lower Blade</b> \u2014 Darkwood Forest (Blighted Heartwood)<br>" +
        "\u2022 <b>The Upper Blade</b> \u2014 Aelindor (Archon Sylvaris)<br>" +
        "\u2022 <b>The Blade Core</b> \u2014 Necropolis (Death Knight Lancelot)<br>" +
        "\u2022 <b>The Enchantment Rune</b> \u2014 Volcanic Wastes (Demon Balor)<br>" +
        "\u2022 <b>The Scabbard</b> \u2014 Abyssal Rift (Morgan le Fay)<br>" +
        "\u2022 <b>The Soul of the Blade</b> \u2014 Dragon's Sanctum (Aurelion)<br><br>" +
        "Once all fragments are collected, return to Camelot to reforge Excalibur and face Mordred." },
      { label: "Crafting", icon: "\uD83D\uDD28", text:
        "Visit vendors in Camelot to craft gear. The <b>Blacksmith</b> upgrades rarity (combine 3 items \u2192 1 higher rarity) and forges weapons. " +
        "The <b>Jeweler</b> rerolls item stats.<br><br>" +
        "Press <b>B</b> anywhere to open advanced crafting if you have materials. " +
        "Salvage unwanted items (Shift+C at vendors) to get crafting materials like Iron Ore, Steel Ingots, Mithril, and Dragon Scales.<br><br>" +
        "Higher rarity items yield more materials when salvaged." },
      { label: "Map Modifiers", icon: "\uD83C\uDF1F", text:
        "When selecting a map, you can apply optional <b>modifiers</b> that increase difficulty but boost rewards.<br><br>" +
        "\u2022 <b>Swift</b> \u2014 Enemies 40% faster (+15% drops/XP)<br>" +
        "\u2022 <b>Thorns</b> \u2014 Enemies reflect 15% damage (+20% drops/XP)<br>" +
        "\u2022 <b>Champions</b> \u2014 50% more elites (+25% drops/XP)<br>" +
        "\u2022 <b>Fortified</b> \u2014 Enemies have 2x HP (+30% drops/XP)<br>" +
        "\u2022 <b>Vampiric</b> \u2014 Enemies heal from damage dealt (+20% drops/XP)<br>" +
        "...and more. Stack multiple modifiers for even bigger bonuses!" },
      { label: "Greater Rifts", icon: "\uD83C\uDF00", text:
        "Greater Rifts are timed endgame dungeons with escalating difficulty. You need a <b>Keystone</b> to enter (15% drop chance from map bosses).<br><br>" +
        "Each rift level increases enemy HP (+15%) and damage (+10%), but also XP (+12%) and loot (+8%). " +
        "You have a time limit to kill enough enemies and defeat the Rift Guardian boss.<br><br>" +
        "Rift levels go up to 150. Your best completions appear on the leaderboard (press L)." },
    ];
    let activeGuide: number = -1;

    const renderShop = () => {
      // Wares grid
      let waresHtml = "";
      for (let i = 0; i < npc.inventory.length; i++) {
        const item = npc.inventory[i];
        const rarityColor = RARITY_CSS[item.rarity];
        const canAfford = p.gold >= item.value;
        const priceColor = canAfford ? "#ffd700" : "#ff4444";
        waresHtml += `
          <div class="npc-ware" data-ware-idx="${i}" style="
            width:110px;height:110px;background:rgba(15,10,5,0.9);border:2px solid ${rarityColor};
            border-radius:6px;display:flex;flex-direction:column;align-items:center;
            justify-content:center;cursor:pointer;pointer-events:auto;position:relative;
            transition:border-color 0.2s,box-shadow 0.2s;
          ">
            <div style="font-size:28px;">${item.icon}</div>
            <div style="font-size:12px;color:${rarityColor};margin-top:4px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:100px;text-align:center;">${item.name}</div>
            <div style="font-size:11px;color:${priceColor};margin-top:2px;">\uD83E\uDE99 ${item.value}</div>
          </div>`;
      }
      if (npc.inventory.length === 0) {
        waresHtml = `<div style="color:#888;font-size:14px;grid-column:1/-1;text-align:center;padding:30px;">I've nothing left to sell, I'm afraid.</div>`;
      }

      // Potion wares (minor potions only)
      const npcPotions: DiabloPotion[] = [
        { id: 'npc_hp_s', name: 'Small HP Potion', icon: '\u{1F9EA}', type: PotionType.HEALTH, value: 100, cooldown: 5, cost: 15 },
        { id: 'npc_mp_s', name: 'Small Mana Potion', icon: '\u{1FAE7}', type: PotionType.MANA, value: 80, cooldown: 5, cost: 12 },
      ];
      let potionHtml = "";
      for (let i = 0; i < npcPotions.length; i++) {
        const pot = npcPotions[i];
        const canAfford = p.gold >= pot.cost;
        const priceColor = canAfford ? "#ffd700" : "#ff4444";
        potionHtml += `
          <div class="npc-potion" data-potion-idx="${i}" style="
            width:110px;height:110px;background:rgba(15,10,5,0.9);border:2px solid #3a5a2a;
            border-radius:6px;display:flex;flex-direction:column;align-items:center;
            justify-content:center;cursor:pointer;pointer-events:auto;
            transition:border-color 0.2s,box-shadow 0.2s;
          ">
            <div style="font-size:28px;">${pot.icon}</div>
            <div style="font-size:12px;color:#88cc88;margin-top:4px;">${pot.name}</div>
            <div style="font-size:11px;color:${priceColor};margin-top:2px;">\uD83E\uDE99 ${pot.cost}</div>
          </div>`;
      }

      const currentRumor = allRumors[rumorIdx % allRumors.length];

      let statusHtml = `<div id="npc-status" style="min-height:24px;color:#aaa;font-size:13px;text-align:center;margin-top:8px;"></div>`;

      ctx.menuEl.innerHTML = `
        <div style="
          position:fixed;top:0;left:0;width:100%;height:100%;
          ${SCREEN_BG}display:flex;flex-direction:column;
          align-items:center;justify-content:center;z-index:1000;
          font-family:'Palatino Linotype','Book Antiqua',Palatino,serif;color:#e8dcc8;
          pointer-events:auto;
        ">
          <div style="max-width:700px;width:90%;max-height:90vh;overflow-y:auto;padding:20px;">
            <!-- Header -->
            <div style="text-align:center;margin-bottom:16px;">
              <div style="font-size:11px;color:#665533;letter-spacing:3px;margin-bottom:4px;">WAYFARER</div>
              <div style="font-size:22px;color:#c8a84e;font-weight:bold;text-shadow:0 0 8px rgba(200,168,78,0.3);">
                \uD83E\uDDD3 ${npc.name}
              </div>
              <div style="font-size:13px;color:#887766;margin-top:4px;font-style:italic;">
                "Humble peddler and keeper of old tales"
              </div>
            </div>

            <!-- Guide / Tutorial section -->
            <div style="
              background:rgba(20,15,8,0.9);border:1px solid #3a3020;border-radius:8px;
              padding:16px;margin-bottom:16px;
            ">
              <div style="font-size:11px;color:#665533;letter-spacing:2px;margin-bottom:10px;">GUIDE \u2014 <span style="color:#887766;font-style:italic;text-transform:none;letter-spacing:0;">Ask me about...</span></div>
              <div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:8px;">
                ${guideTopics.map((t, i) => `<button class="npc-guide-btn" data-guide-idx="${i}" style="${guideBtnStyle}${activeGuide === i ? 'border-color:#c8a84e;background:rgba(60,50,25,0.95);' : ''}">${t.icon} ${t.label}</button>`).join("")}
              </div>
              <div id="npc-guide-text" style="font-size:13px;color:#ccbb99;line-height:1.7;${activeGuide >= 0 ? '' : 'display:none;'}padding:10px;background:rgba(10,8,4,0.6);border-radius:6px;border:1px solid #2a2418;">
                ${activeGuide >= 0 ? guideTopics[activeGuide].text : ''}
              </div>
            </div>

            <!-- Rumor / Lore section -->
            <div style="
              background:rgba(20,15,8,0.9);border:1px solid #3a3020;border-radius:8px;
              padding:16px;margin-bottom:16px;
            ">
              <div style="font-size:11px;color:#665533;letter-spacing:2px;margin-bottom:8px;">RUMOR</div>
              <div id="npc-rumor-text" style="font-size:14px;color:#ccbb99;line-height:1.6;font-style:italic;">
                "${currentRumor}"
              </div>
              <div style="text-align:right;margin-top:10px;">
                <button id="npc-rumor-btn" style="
                  background:rgba(40,35,20,0.9);border:1px solid #5a4a2a;color:#c8a84e;
                  padding:6px 16px;border-radius:4px;cursor:pointer;font-size:12px;
                  font-family:inherit;transition:border-color 0.2s,background 0.2s;
                ">Another Rumor</button>
              </div>
            </div>

            <!-- Wares -->
            <div style="
              background:rgba(20,15,8,0.9);border:1px solid #3a3020;border-radius:8px;
              padding:16px;margin-bottom:12px;
            ">
              <div style="font-size:11px;color:#665533;letter-spacing:2px;margin-bottom:10px;">WARES</div>
              <div style="display:flex;flex-wrap:wrap;gap:8px;justify-content:center;">
                ${waresHtml}
              </div>
            </div>

            <!-- Potions -->
            <div style="
              background:rgba(20,15,8,0.9);border:1px solid #3a3020;border-radius:8px;
              padding:16px;margin-bottom:12px;
            ">
              <div style="font-size:11px;color:#665533;letter-spacing:2px;margin-bottom:10px;">POTIONS</div>
              <div style="display:flex;flex-wrap:wrap;gap:8px;justify-content:center;">
                ${potionHtml}
              </div>
            </div>

            <!-- Gold & Status -->
            <div style="text-align:center;margin-bottom:12px;">
              <span style="color:#ffd700;font-size:14px;">\uD83E\uDE99 ${p.gold} Gold</span>
            </div>
            ${statusHtml}

            <!-- Close -->
            <div style="text-align:center;margin-top:12px;">
              <button id="npc-close-btn" style="
                background:rgba(40,30,15,0.9);border:2px solid #5a4a2a;color:#c8a84e;
                padding:10px 40px;border-radius:6px;cursor:pointer;font-size:15px;
                font-family:inherit;letter-spacing:2px;
                transition:border-color 0.2s,box-shadow 0.2s,background 0.2s;
              ">CLOSE</button>
            </div>
          </div>
        </div>`;

      const showStatus = (msg: string, color: string) => {
        const el = ctx.menuEl.querySelector("#npc-status") as HTMLDivElement | null;
        if (el) { el.textContent = msg; el.style.color = color; }
      };

      // Wire up ware buy clicks
      const wareSlots = ctx.menuEl.querySelectorAll(".npc-ware") as NodeListOf<HTMLDivElement>;
      wareSlots.forEach((el) => {
        const idx = parseInt(el.getAttribute("data-ware-idx")!, 10);
        el.addEventListener("mouseenter", (ev) => showItemTooltip(ctx, ev, npc.inventory[idx]));
        el.addEventListener("mouseleave", () => ctx.hideItemTooltip());
        el.addEventListener("click", () => {
          const item = npc.inventory[idx];
          if (!item) return;
          if (p.gold < item.value) {
            showStatus("Not enough gold!", "#ff4444");
            return;
          }
          p.gold -= item.value;
          p.stats.totalGoldSpent += item.value;
          const slot = p.inventory.find(s => s.item === null);
          if (slot) {
            slot.item = { ...item, id: ctx.genId() };
          } else {
            p.inventory.push({ item: { ...item, id: ctx.genId() } });
          }
          npc.inventory.splice(idx, 1);
          showStatus(`Purchased ${item.name}!`, "#44ff44");
          renderShop();
        });
      });

      // Wire up potion buy clicks
      const potionSlots = ctx.menuEl.querySelectorAll(".npc-potion") as NodeListOf<HTMLDivElement>;
      potionSlots.forEach((el) => {
        const idx = parseInt(el.getAttribute("data-potion-idx")!, 10);
        el.addEventListener("mouseenter", () => {
          el.style.boxShadow = "0 0 12px rgba(60,180,60,0.3)";
          el.style.borderColor = "#5a8a2a";
        });
        el.addEventListener("mouseleave", () => {
          el.style.boxShadow = "none";
          el.style.borderColor = "#3a5a2a";
        });
        el.addEventListener("click", () => {
          const pot = npcPotions[idx];
          if (!pot) return;
          if (p.gold < pot.cost) {
            showStatus("Not enough gold!", "#ff4444");
            return;
          }
          p.gold -= pot.cost;
          p.stats.totalGoldSpent += pot.cost;
          const newPot: DiabloPotion = { ...pot, id: ctx.genId() };
          let assigned = false;
          for (let s = 0; s < 4; s++) {
            const slot = p.potionSlots[s];
            if (slot && slot.potion.name === pot.name && slot.count < MAX_POTION_STACK) {
              slot.count++;
              assigned = true;
              break;
            }
          }
          if (!assigned) {
            for (let s = 0; s < 4; s++) {
              if (!p.potionSlots[s]) {
                p.potionSlots[s] = { potion: newPot, count: 1 };
                assigned = true;
                break;
              }
            }
          }
          if (!assigned) {
            p.potions.push(newPot);
          }
          showStatus(`Purchased ${pot.name}!`, "#44ff44");
          renderShop();
        });
      });

      // Wire up guide topic buttons
      const guideBtns = ctx.menuEl.querySelectorAll(".npc-guide-btn") as NodeListOf<HTMLButtonElement>;
      guideBtns.forEach((btn) => {
        const idx = parseInt(btn.getAttribute("data-guide-idx")!, 10);
        btn.addEventListener("click", () => {
          activeGuide = activeGuide === idx ? -1 : idx;
          renderShop();
        });
        btn.addEventListener("mouseenter", () => {
          if (activeGuide !== idx) {
            btn.style.borderColor = "#8a7a4a";
            btn.style.background = "rgba(50,42,22,0.95)";
          }
        });
        btn.addEventListener("mouseleave", () => {
          if (activeGuide !== idx) {
            btn.style.borderColor = "#4a3a20";
            btn.style.background = "rgba(30,25,15,0.9)";
          }
        });
      });

      // Wire up rumor button
      const rumorBtn = ctx.menuEl.querySelector("#npc-rumor-btn") as HTMLButtonElement | null;
      if (rumorBtn) {
        rumorBtn.addEventListener("click", () => {
          rumorIdx = (rumorIdx + 1) % allRumors.length;
          const textEl = ctx.menuEl.querySelector("#npc-rumor-text") as HTMLDivElement | null;
          if (textEl) textEl.textContent = `"${allRumors[rumorIdx]}"`;
        });
        rumorBtn.addEventListener("mouseenter", () => {
          rumorBtn.style.borderColor = "#c8a84e";
          rumorBtn.style.background = "rgba(50,40,20,0.95)";
        });
        rumorBtn.addEventListener("mouseleave", () => {
          rumorBtn.style.borderColor = "#5a4a2a";
          rumorBtn.style.background = "rgba(40,35,20,0.9)";
        });
      }

      // Wire up close button
      const closeBtn = ctx.menuEl.querySelector("#npc-close-btn") as HTMLButtonElement;
      closeBtn.addEventListener("mouseenter", () => {
        closeBtn.style.borderColor = "#c8a84e";
        closeBtn.style.boxShadow = "0 0 15px rgba(200,168,78,0.3)";
        closeBtn.style.background = "rgba(50,40,20,0.95)";
      });
      closeBtn.addEventListener("mouseleave", () => {
        closeBtn.style.borderColor = "#5a4a2a";
        closeBtn.style.boxShadow = "none";
        closeBtn.style.background = "rgba(40,30,15,0.9)";
      });
      closeBtn.addEventListener("click", () => {
        ctx.state.phase = DiabloPhase.PLAYING;
        ctx.menuEl.innerHTML = "";
      });
    };

    renderShop();
}

// ════════════════════════════════════════════════════════════════════════════
//  16. showCraftingUI
// ════════════════════════════════════════════════════════════════════════════

export function showCraftingUI(ctx: ScreenContext, vendor: DiabloVendor, mode: 'blacksmith' | 'jeweler'): void {
    const p = ctx.state.player;
    ctx.setPhaseBeforeOverlay(DiabloPhase.PLAYING);
    ctx.state.phase = DiabloPhase.INVENTORY;

    const renderCrafting = () => {
      const isBlacksmith = mode === 'blacksmith';
      const title = isBlacksmith ? `${vendor.icon} ${vendor.name} -- Forge & Salvage` : `${vendor.icon} ${vendor.name} -- Reroll Stats`;

      const recipes = isBlacksmith
        ? CRAFTING_RECIPES.filter(r => r.type === CraftType.UPGRADE_RARITY)
        : CRAFTING_RECIPES.filter(r => r.type === CraftType.REROLL_STATS);

      let recipesHtml = "";
      for (const r of recipes) {
        const canAfford = p.gold >= r.cost && p.salvageMaterials >= (r.materialCost || 0);
        const costColor = canAfford ? "#ffd700" : "#ff4444";
        const inputColor = r.inputRarity ? RARITY_CSS[r.inputRarity] : "#ccc";
        const outputColor = r.outputRarity ? RARITY_CSS[r.outputRarity] : inputColor;
        const successPct = Math.round(r.successChance * 100);
        recipesHtml += `
          <div class="craft-recipe" data-recipe-id="${r.id}" style="
            background:rgba(20,15,8,0.9);border:1px solid #5a4a2a;border-radius:6px;padding:12px;
            cursor:pointer;transition:border-color 0.2s;pointer-events:auto;
          ">
            <div style="color:${outputColor};font-weight:bold;font-size:14px;">${r.name}</div>
            <div style="color:#aaa;font-size:12px;margin:4px 0;">${r.description}</div>
            <div style="font-size:11px;color:${costColor};">Cost: ${r.cost}g + ${r.materialCost || 0} materials</div>
            <div style="font-size:11px;color:${successPct === 100 ? '#44ff44' : '#ff8800'};">Success: ${successPct}%</div>
          </div>`;
      }

      let invHtml = "";
      for (let i = 0; i < p.inventory.length; i++) {
        const slot = p.inventory[i];
        const item = slot.item;
        const borderColor = item ? RARITY_CSS[item.rarity] : "#3a3a3a";
        const content = item ? `<div style="font-size:20px;">${item.icon}</div>` : "";
        invHtml += `
          <div class="craft-inv-slot" data-inv-idx="${i}" style="
            width:55px;height:55px;background:rgba(15,10,5,0.85);border:1px solid ${borderColor};
            border-radius:4px;display:flex;align-items:center;justify-content:center;
            cursor:pointer;pointer-events:auto;position:relative;
          ">${content}</div>`;
      }

      ctx.menuEl.innerHTML = `
        <div style="
          width:100%;height:100%;${SCREEN_BG}display:flex;flex-direction:column;
          align-items:center;justify-content:center;color:#fff;pointer-events:auto;
        ">
          <div style="
            max-width:950px;width:92%;background:rgba(15,10,5,0.95);border:2px solid #5a4a2a;
            border-radius:12px;padding:24px 30px;max-height:88vh;overflow-y:auto;
          ">
            <div style="text-align:center;margin-bottom:16px;">
              <div style="font-size:28px;color:#c8a84e;font-weight:bold;letter-spacing:2px;font-family:'Georgia',serif;">${title}</div>
            </div>
            <div style="display:flex;gap:20px;align-items:flex-start;">
              <div style="flex:0 0 250px;">
                <div style="color:#c8a84e;font-size:14px;font-weight:bold;margin-bottom:8px;">RECIPES</div>
                <div style="display:flex;flex-direction:column;gap:8px;max-height:350px;overflow-y:auto;">
                  ${recipesHtml}
                </div>
                ${isBlacksmith ? `
                <div style="margin-top:16px;">
                  <div style="color:#c8a84e;font-size:14px;font-weight:bold;margin-bottom:8px;">SALVAGE</div>
                  <div style="color:#aaa;font-size:12px;margin-bottom:8px;">Right-click an item below to salvage it for materials.</div>
                </div>` : ""}
              </div>
              <div style="flex:1;min-width:0;">
                <div style="color:#c8a84e;font-size:14px;font-weight:bold;margin-bottom:8px;">YOUR ITEMS</div>
                <div style="display:grid;grid-template-columns:repeat(8,55px);grid-template-rows:repeat(5,55px);gap:3px;">
                  ${invHtml}
                </div>
              </div>
            </div>
            <div style="margin-top:16px;display:flex;justify-content:center;align-items:center;gap:20px;">
              <div style="font-size:16px;color:#ffd700;">Gold: ${p.gold}</div>
              <div style="font-size:16px;color:#88ccff;">Materials: ${p.salvageMaterials}</div>
              <button id="craft-shop-btn" style="
                padding:10px 24px;font-size:14px;letter-spacing:2px;font-weight:bold;
                background:rgba(40,30,15,0.9);border:2px solid #5a4a2a;border-radius:8px;color:#c8a84e;
                cursor:pointer;transition:all 0.2s;font-family:'Georgia',serif;pointer-events:auto;
              ">SHOP</button>
              <button id="craft-close-btn" style="
                padding:10px 24px;font-size:14px;letter-spacing:2px;font-weight:bold;
                background:rgba(40,30,15,0.9);border:2px solid #5a4a2a;border-radius:8px;color:#c8a84e;
                cursor:pointer;transition:all 0.2s;font-family:'Georgia',serif;pointer-events:auto;
              ">CLOSE</button>
            </div>
            <div id="craft-status" style="margin-top:10px;text-align:center;color:#ff4444;font-size:14px;min-height:20px;"></div>
            <div id="inv-tooltip" style="
              display:none;position:fixed;z-index:100;background:rgba(10,5,2,0.96);border:2px solid #5a4a2a;
              border-radius:8px;padding:14px;max-width:280px;pointer-events:none;color:#ccc;font-size:13px;
            "></div>
          </div>
        </div>`;

      const statusEl = ctx.menuEl.querySelector("#craft-status") as HTMLDivElement;
      const showStatus = (msg: string, color: string) => {
        statusEl.textContent = msg;
        statusEl.style.color = color;
        setTimeout(() => { statusEl.textContent = ""; }, 2500);
      };

      // Recipe click
      const recipeSlots = ctx.menuEl.querySelectorAll(".craft-recipe") as NodeListOf<HTMLDivElement>;
      recipeSlots.forEach(el => {
        el.addEventListener("mouseenter", () => { el.style.borderColor = "#c8a84e"; });
        el.addEventListener("mouseleave", () => { el.style.borderColor = "#5a4a2a"; });
        el.addEventListener("click", () => {
          const rId = el.getAttribute("data-recipe-id")!;
          const recipe = CRAFTING_RECIPES.find(r => r.id === rId);
          if (!recipe) return;

          if (p.gold < recipe.cost) { showStatus("Not enough gold!", "#ff4444"); return; }
          if (p.salvageMaterials < (recipe.materialCost || 0)) { showStatus("Not enough materials!", "#ff4444"); return; }

          if (recipe.type === CraftType.UPGRADE_RARITY) {
            const inputItems: number[] = [];
            for (let i = 0; i < p.inventory.length; i++) {
              if (p.inventory[i].item && p.inventory[i].item!.rarity === recipe.inputRarity) {
                inputItems.push(i);
                if (inputItems.length >= (recipe.inputCount || 3)) break;
              }
            }
            if (inputItems.length < (recipe.inputCount || 3)) {
              showStatus(`Need ${recipe.inputCount || 3} ${RARITY_NAMES[recipe.inputRarity!]} items!`, "#ff4444");
              return;
            }

            p.gold -= recipe.cost;
            p.salvageMaterials -= recipe.materialCost || 0;

            if (Math.random() < recipe.successChance) {
              for (const idx of inputItems) p.inventory[idx].item = null;
              const outputItem = ctx.pickRandomItemOfRarity(recipe.outputRarity!);
              if (outputItem) {
                const emptyIdx = p.inventory.findIndex(s => s.item === null);
                if (emptyIdx >= 0) p.inventory[emptyIdx].item = { ...outputItem, id: ctx.genId() };
              }
              showStatus(`Forged a ${RARITY_NAMES[recipe.outputRarity!]} item!`, "#ffd700");
            } else {
              for (const idx of inputItems) p.inventory[idx].item = null;
              const returned = Math.floor((recipe.materialCost || 0) * 0.5);
              p.salvageMaterials += returned;
              showStatus(`Forge failed! Items destroyed. ${returned} materials returned.`, "#ff4444");
            }
            renderCrafting();
          } else if (recipe.type === CraftType.REROLL_STATS) {
            const itemIdx = p.inventory.findIndex(s => s.item && s.item.rarity === recipe.inputRarity);
            if (itemIdx < 0) {
              showStatus(`Need a ${RARITY_NAMES[recipe.inputRarity!]} item!`, "#ff4444");
              return;
            }
            p.gold -= recipe.cost;
            p.salvageMaterials -= recipe.materialCost || 0;

            const item = p.inventory[itemIdx].item!;
            const pool = ITEM_DATABASE.filter(it => it.rarity === item.rarity && it.slot === item.slot);
            if (pool.length > 0) {
              const donor = pool[Math.floor(Math.random() * pool.length)];
              item.stats = { ...donor.stats };
            }
            showStatus(`Rerolled stats on ${item.name}!`, "#44ff44");
            renderCrafting();
          }
        });
      });

      // Inventory slots with tooltips and salvage on right-click
      const invSlots = ctx.menuEl.querySelectorAll(".craft-inv-slot") as NodeListOf<HTMLDivElement>;
      invSlots.forEach(el => {
        const idx = parseInt(el.getAttribute("data-inv-idx")!, 10);
        el.addEventListener("mouseenter", (ev) => showItemTooltip(ctx, ev, p.inventory[idx].item));
        el.addEventListener("mouseleave", () => ctx.hideItemTooltip());
        if (isBlacksmith) {
          el.addEventListener("contextmenu", (ev) => {
            ev.preventDefault();
            ev.stopPropagation();
            const item = p.inventory[idx].item;
            if (!item) return;
            if (item.isLocked) {
              showStatus("Item is locked!", "#ff4444");
              return;
            }
            const materials = SALVAGE_MATERIAL_YIELDS[item.rarity] || 1;
            p.salvageMaterials += materials;
            p.inventory[idx].item = null;
            showStatus(`Salvaged ${item.name} for ${materials} materials.`, "#88ccff");
            renderCrafting();
          });
        }
      });

      // Shop button
      const shopBtn = ctx.menuEl.querySelector("#craft-shop-btn") as HTMLButtonElement;
      shopBtn.addEventListener("mouseenter", () => { shopBtn.style.borderColor = "#c8a84e"; shopBtn.style.boxShadow = "0 0 15px rgba(200,168,78,0.3)"; });
      shopBtn.addEventListener("mouseleave", () => { shopBtn.style.borderColor = "#5a4a2a"; shopBtn.style.boxShadow = "none"; });
      shopBtn.addEventListener("click", () => { showVendorShop(ctx, vendor); });

      // Close button
      const closeBtn = ctx.menuEl.querySelector("#craft-close-btn") as HTMLButtonElement;
      closeBtn.addEventListener("mouseenter", () => { closeBtn.style.borderColor = "#c8a84e"; closeBtn.style.boxShadow = "0 0 15px rgba(200,168,78,0.3)"; });
      closeBtn.addEventListener("mouseleave", () => { closeBtn.style.borderColor = "#5a4a2a"; closeBtn.style.boxShadow = "none"; });
      closeBtn.addEventListener("click", () => {
        ctx.state.phase = DiabloPhase.PLAYING;
        ctx.menuEl.innerHTML = "";
      });
    };

    renderCrafting();
}

// ════════════════════════════════════════════════════════════════════════════
//  17. showAdvancedCraftingUI
// ════════════════════════════════════════════════════════════════════════════

export function showAdvancedCraftingUI(ctx: ScreenContext): void {
    const p = ctx.state.player;
    const cs = p.crafting;
    ctx.setPhaseBeforeOverlay(DiabloPhase.PLAYING);
    ctx.state.phase = DiabloPhase.INVENTORY;
    ctx.setCraftingUIOpen(true);

    let selectedStation: CraftingStationType = CraftingStationType.BLACKSMITH_FORGE;

    const renderCraftUI = () => {
      const stations = [
        { type: CraftingStationType.BLACKSMITH_FORGE, name: 'Blacksmith', icon: '\u2694\uFE0F' },
        { type: CraftingStationType.JEWELER_BENCH, name: 'Jeweler', icon: '\uD83D\uDC8E' },
        { type: CraftingStationType.ALCHEMIST_TABLE, name: 'Alchemist', icon: '\u2697\uFE0F' },
        { type: CraftingStationType.ENCHANTER_ALTAR, name: 'Enchanter', icon: '\uD83D\uDD2E' },
      ];

      let stationTabsHtml = "";
      for (const st of stations) {
        const isActive = st.type === selectedStation;
        stationTabsHtml += `
          <button class="craft-station-tab" data-station="${st.type}" style="
            flex:1;padding:10px;font-size:13px;font-weight:bold;
            background:${isActive ? "rgba(60,45,20,0.95)" : "rgba(30,22,10,0.9)"};
            border:1px solid ${isActive ? "#c8a84e" : "#5a4a2a"};border-radius:6px 6px 0 0;
            color:${isActive ? "#ffd700" : "#887755"};cursor:pointer;pointer-events:auto;
            border-bottom:${isActive ? "2px solid #c8a84e" : "none"};
          ">${st.icon} ${st.name}</button>`;
      }

      // Filter recipes by station and discovered
      const recipes = ADVANCED_CRAFTING_RECIPES.filter(
        r => r.station === selectedStation && cs.discoveredRecipes.includes(r.id)
      );

      let recipesHtml = "";
      if (recipes.length === 0) {
        recipesHtml = `<div style="color:#887755;font-style:italic;padding:20px;text-align:center;">
          No recipes discovered for this station yet. Level up crafting to discover more!</div>`;
      }
      for (const recipe of recipes) {
        const canAfford = ctx.canAffordRecipe(recipe);
        const meetsLevel = cs.craftingLevel >= recipe.levelRequired;
        const borderColor = canAfford && meetsLevel ? "#5a4a2a" : "#3a2a1a";
        const outputColor = recipe.outputRarity ? RARITY_CSS[recipe.outputRarity] : "#cccccc";
        const successPct = Math.round(recipe.successChance * 100);

        let matsHtml = "";
        for (const mat of recipe.materials) {
          const matDef = CRAFTING_MATERIALS[mat.type];
          const have = cs.materials[mat.type] || 0;
          const enough = have >= mat.count;
          matsHtml += `<span style="color:${enough ? "#44ff44" : "#ff4444"};font-size:11px;">
            ${matDef.icon} ${mat.count} ${matDef.name} (${have})</span> `;
        }

        // Check if it's being crafted
        const inQueue = cs.craftingQueue.find(q => q.recipeId === recipe.id);
        let progressHtml = "";
        if (inQueue) {
          const pct = Math.round((inQueue.progress / inQueue.duration) * 100);
          progressHtml = `<div style="margin-top:6px;background:#333;border-radius:3px;height:6px;overflow:hidden;">
            <div style="background:#ffd700;height:100%;width:${pct}%;transition:width 0.3s;"></div>
          </div><div style="font-size:10px;color:#ffd700;margin-top:2px;">Crafting... ${pct}%</div>`;
        }

        recipesHtml += `
          <div class="adv-craft-recipe" data-recipe-id="${recipe.id}" style="
            background:rgba(20,15,8,0.9);border:1px solid ${borderColor};border-radius:6px;padding:12px;
            cursor:${canAfford && meetsLevel ? "pointer" : "not-allowed"};
            opacity:${canAfford && meetsLevel ? "1" : "0.6"};
            transition:border-color 0.2s;pointer-events:auto;
          ">
            <div style="display:flex;align-items:center;gap:8px;">
              <span style="font-size:22px;">${recipe.icon}</span>
              <div>
                <div style="color:${outputColor};font-weight:bold;font-size:14px;">${recipe.name}</div>
                <div style="color:#aaa;font-size:11px;">${recipe.description}</div>
              </div>
            </div>
            <div style="margin-top:6px;">${matsHtml}</div>
            <div style="display:flex;gap:12px;margin-top:4px;font-size:11px;">
              <span style="color:${p.gold >= recipe.goldCost ? "#ffd700" : "#ff4444"};">Gold: ${recipe.goldCost}</span>
              ${recipe.salvageCost > 0 ? `<span style="color:${p.salvageMaterials >= recipe.salvageCost ? "#88ccff" : "#ff4444"};">Materials: ${recipe.salvageCost}</span>` : ""}
              <span style="color:${successPct >= 80 ? "#44ff44" : successPct >= 50 ? "#ffdd00" : "#ff4444"};">Success: ${successPct}%</span>
              ${!meetsLevel ? `<span style="color:#ff4444;">Requires Lv.${recipe.levelRequired}</span>` : ""}
            </div>
            ${progressHtml}
          </div>`;
      }

      // Materials inventory
      let matsInvHtml = "";
      for (const [matType, count] of Object.entries(cs.materials) as [MaterialType, number][]) {
        if (count <= 0) continue;
        const matDef = CRAFTING_MATERIALS[matType];
        if (!matDef) continue;
        matsInvHtml += `
          <div style="display:flex;align-items:center;gap:6px;font-size:12px;color:#ccc;">
            <span style="font-size:16px;">${matDef.icon}</span>
            <span>${matDef.name}:</span>
            <span style="color:#ffd700;font-weight:bold;">${count}</span>
          </div>`;
      }
      if (!matsInvHtml) {
        matsInvHtml = `<div style="color:#665533;font-style:italic;font-size:12px;">No materials yet.</div>`;
      }

      ctx.menuEl.innerHTML = `
        <div style="
          width:100%;height:100%;${SCREEN_BG}display:flex;flex-direction:column;
          align-items:center;justify-content:center;color:#fff;pointer-events:auto;
        ">
          <div style="
            max-width:950px;width:92%;background:rgba(15,10,5,0.95);border:2px solid #5a4a2a;
            border-radius:12px;padding:24px 30px;max-height:88vh;overflow-y:auto;
          ">
            <div style="text-align:center;margin-bottom:12px;">
              <div style="font-size:28px;color:#c8a84e;font-weight:bold;letter-spacing:2px;font-family:'Georgia',serif;">
                CRAFTING WORKSHOP
              </div>
              <div style="font-size:12px;color:#887755;margin-top:4px;">
                Crafting Level: ${cs.craftingLevel} | XP: ${cs.craftingXp}/${cs.craftingXpToNext}
              </div>
            </div>
            <div style="display:flex;gap:2px;margin-bottom:2px;">
              ${stationTabsHtml}
            </div>
            <div style="display:flex;gap:20px;align-items:flex-start;">
              <div style="flex:1;min-width:0;">
                <div style="display:flex;flex-direction:column;gap:8px;max-height:400px;overflow-y:auto;padding:8px 0;">
                  ${recipesHtml}
                </div>
              </div>
              <div style="flex:0 0 200px;">
                <div style="color:#c8a84e;font-size:13px;font-weight:bold;margin-bottom:8px;">MATERIALS</div>
                <div style="display:flex;flex-direction:column;gap:6px;max-height:300px;overflow-y:auto;">
                  ${matsInvHtml}
                </div>
                <div style="margin-top:12px;font-size:12px;">
                  <div style="color:#ffd700;">Gold: ${p.gold}</div>
                  <div style="color:#88ccff;">Salvage: ${p.salvageMaterials}</div>
                </div>
              </div>
            </div>
            <div style="margin-top:16px;display:flex;justify-content:center;gap:20px;">
              <button id="adv-craft-close-btn" style="
                padding:10px 30px;font-size:14px;letter-spacing:2px;font-weight:bold;
                background:rgba(40,30,15,0.9);border:2px solid #5a4a2a;border-radius:8px;color:#c8a84e;
                cursor:pointer;pointer-events:auto;font-family:'Georgia',serif;
              ">CLOSE</button>
            </div>
            <div id="adv-craft-status" style="margin-top:8px;text-align:center;color:#ff4444;font-size:14px;min-height:20px;"></div>
          </div>
        </div>`;

      // Status helper
      const statusEl = ctx.menuEl.querySelector("#adv-craft-status") as HTMLDivElement;
      const showStatus = (msg: string, color: string) => {
        statusEl.textContent = msg;
        statusEl.style.color = color;
        setTimeout(() => { if (statusEl) statusEl.textContent = ""; }, 2500);
      };

      // Station tab clicks
      const tabBtns = ctx.menuEl.querySelectorAll(".craft-station-tab") as NodeListOf<HTMLButtonElement>;
      tabBtns.forEach(btn => {
        btn.addEventListener("click", () => {
          selectedStation = btn.getAttribute("data-station") as CraftingStationType;
          renderCraftUI();
        });
      });

      // Recipe clicks
      const recipeEls = ctx.menuEl.querySelectorAll(".adv-craft-recipe") as NodeListOf<HTMLDivElement>;
      recipeEls.forEach(el => {
        el.addEventListener("mouseenter", () => { el.style.borderColor = "#c8a84e"; });
        el.addEventListener("mouseleave", () => { el.style.borderColor = "#5a4a2a"; });
        el.addEventListener("click", () => {
          const recipeId = el.getAttribute("data-recipe-id")!;
          const recipe = ADVANCED_CRAFTING_RECIPES.find(r => r.id === recipeId);
          if (!recipe) return;

          if (cs.craftingLevel < recipe.levelRequired) {
            showStatus(`Requires crafting level ${recipe.levelRequired}!`, "#ff4444");
            return;
          }
          if (!ctx.canAffordRecipe(recipe)) {
            showStatus("Not enough resources!", "#ff4444");
            return;
          }
          if (cs.craftingQueue.some(q => q.recipeId === recipeId)) {
            showStatus("Already crafting this recipe!", "#ff8800");
            return;
          }

          ctx.payRecipeCost(recipe);
          // Crafting duration based on recipe complexity
          const duration = 1.0 + recipe.levelRequired * 0.2;
          cs.craftingQueue.push({ recipeId: recipe.id, progress: 0, duration });
          showStatus(`Started crafting ${recipe.name}...`, "#ffd700");
          renderCraftUI();
        });
      });

      // Close
      const closeBtn = ctx.menuEl.querySelector("#adv-craft-close-btn") as HTMLButtonElement;
      closeBtn.addEventListener("mouseenter", () => { closeBtn.style.borderColor = "#c8a84e"; });
      closeBtn.addEventListener("mouseleave", () => { closeBtn.style.borderColor = "#5a4a2a"; });
      closeBtn.addEventListener("click", () => {
        ctx.setCraftingUIOpen(false);
        ctx.state.phase = DiabloPhase.PLAYING;
        ctx.menuEl.innerHTML = "";
      });
    };

    renderCraftUI();
}

// ════════════════════════════════════════════════════════════════════════════
//  18. showQuestBoard
// ════════════════════════════════════════════════════════════════════════════

export function showQuestBoard(ctx: ScreenContext): void {
    const available = QUEST_DATABASE.filter(
      q => !ctx.state.completedQuestIds.includes(q.id) &&
           !ctx.state.activeQuests.some(aq => aq.id === q.id)
    );
    const active = ctx.state.activeQuests.filter(q => q.isActive);
    const completed = ctx.state.completedQuestIds;

    let availHtml = "";
    for (const q of available) {
      const rewardText = `${q.rewards.gold}g + ${q.rewards.xp}xp${q.rewards.itemRarity ? ` + ${RARITY_NAMES[q.rewards.itemRarity]} item` : ""}`;
      const rewardColor = q.rewards.itemRarity ? RARITY_CSS[q.rewards.itemRarity] : "#ffd700";
      availHtml += `
        <div class="quest-available" data-quest-id="${q.id}" style="
          background:rgba(20,15,8,0.9);border:1px solid #5a4a2a;border-radius:6px;padding:12px;
          cursor:pointer;transition:border-color 0.2s;pointer-events:auto;
        ">
          <div style="color:#c8a84e;font-weight:bold;font-size:14px;">${q.name}</div>
          <div style="color:#aaa;font-size:12px;margin:4px 0;">${q.description}</div>
          <div style="color:${rewardColor};font-size:11px;">Reward: ${rewardText}</div>
          <div style="color:#888;font-size:11px;">Goal: ${q.required}</div>
        </div>`;
    }

    let activeHtml = "";
    for (const q of active) {
      const pct = Math.min(100, (q.progress / q.required) * 100);
      activeHtml += `
        <div class="quest-active" data-quest-id="${q.id}" style="
          background:rgba(20,15,8,0.9);border:1px solid #c8a84e;border-radius:6px;padding:12px;
          pointer-events:auto;
        ">
          <div style="color:#ffd700;font-weight:bold;font-size:14px;">${q.name}</div>
          <div style="color:#aaa;font-size:12px;margin:4px 0;">${q.description}</div>
          <div style="width:100%;height:8px;background:rgba(30,25,15,0.9);border-radius:4px;overflow:hidden;margin:6px 0;">
            <div style="width:${pct}%;height:100%;background:linear-gradient(90deg,#c8a84e,#ffd700);border-radius:4px;"></div>
          </div>
          <div style="color:#888;font-size:11px;">${q.progress}/${q.required}</div>
          <button class="quest-abandon" data-quest-id="${q.id}" style="
            margin-top:6px;padding:4px 12px;font-size:11px;background:rgba(60,20,20,0.8);
            border:1px solid #a44;border-radius:4px;color:#e66;cursor:pointer;pointer-events:auto;
          ">Abandon</button>
        </div>`;
    }

    const canAccept = active.length < 5;

    ctx.menuEl.innerHTML = `
      <div style="
        width:100%;height:100%;
        ${SCREEN_BG}
        display:flex;flex-direction:column;
        align-items:center;justify-content:center;color:#fff;pointer-events:auto;
        position:relative;
      ">
        <!-- Ornate page border -->
        <div style="position:absolute;inset:8px;border:2px solid rgba(200,168,78,0.25);border-radius:4px;pointer-events:none;
          box-shadow:0 0 30px rgba(200,168,78,0.1), inset 0 0 50px rgba(0,0,0,0.3);"></div>
        <div style="position:absolute;inset:12px;border:1px solid #3a2a1a;border-radius:2px;pointer-events:none;"></div>
        <!-- Corner ornaments -->
        <div style="position:absolute;top:14px;left:14px;color:#5a4a2a;font-size:18px;">&#9670;</div>
        <div style="position:absolute;top:14px;right:14px;color:#5a4a2a;font-size:18px;">&#9670;</div>
        <div style="position:absolute;bottom:14px;left:14px;color:#5a4a2a;font-size:18px;">&#9670;</div>
        <div style="position:absolute;bottom:14px;right:14px;color:#5a4a2a;font-size:18px;">&#9670;</div>

        <div style="
          max-width:900px;width:92%;
          background:linear-gradient(180deg,rgba(30,24,14,0.95) 0%,rgba(20,16,8,0.98) 100%);
          border:2px solid #5a4a2a;border-top-color:#8a7a4a;border-bottom-color:#2a1a0a;
          border-radius:12px;padding:28px 34px;max-height:88vh;overflow-y:auto;
          box-shadow:inset 0 0 50px rgba(0,0,0,0.3), 0 0 20px rgba(0,0,0,0.5);
          position:relative;
        ">
          <div style="position:absolute;inset:4px;border:1px solid rgba(200,168,78,0.1);border-radius:10px;pointer-events:none;"></div>
          <!-- Title with ornamental flourishes -->
          <div style="display:flex;align-items:center;justify-content:center;gap:14px;margin-bottom:6px;">
            <div style="width:60px;height:1px;background:linear-gradient(to right,transparent,#5a4a2a);"></div>
            <span style="color:#5a4a2a;font-size:14px;">&#9884;</span>
            <h2 style="color:#c8a84e;font-size:32px;letter-spacing:5px;margin:0;font-family:'Georgia',serif;
              text-shadow:0 0 16px rgba(200,168,78,0.35), 0 2px 4px rgba(0,0,0,0.6);">QUEST BOARD</h2>
            <span style="color:#5a4a2a;font-size:14px;">&#9884;</span>
            <div style="width:60px;height:1px;background:linear-gradient(to left,transparent,#5a4a2a);"></div>
          </div>
          <div style="color:#887766;font-size:12px;text-align:center;margin-bottom:16px;letter-spacing:2px;font-family:'Georgia',serif;">${completed.length} quests completed &#9830; ${active.length}/5 active</div>
          <div style="display:flex;gap:20px;">
            <div style="flex:1;min-width:0;">
              <div style="color:#c8a84e;font-size:14px;font-weight:bold;margin-bottom:10px;letter-spacing:2px;font-family:'Georgia',serif;
                border-bottom:1px solid rgba(200,168,78,0.2);padding-bottom:6px;">AVAILABLE QUESTS</div>
              <div style="display:flex;flex-direction:column;gap:8px;max-height:400px;overflow-y:auto;">
                ${availHtml || '<div style="color:#666;font-size:13px;font-style:italic;">No quests available.</div>'}
              </div>
            </div>
            <div style="width:1px;background:linear-gradient(180deg,transparent,#5a4a2a,transparent);"></div>
            <div style="flex:1;min-width:0;">
              <div style="color:#ffd700;font-size:14px;font-weight:bold;margin-bottom:10px;letter-spacing:2px;font-family:'Georgia',serif;
                border-bottom:1px solid rgba(255,215,0,0.2);padding-bottom:6px;">ACTIVE QUESTS</div>
              <div style="display:flex;flex-direction:column;gap:8px;max-height:400px;overflow-y:auto;">
                ${activeHtml || '<div style="color:#666;font-size:13px;font-style:italic;">No active quests.</div>'}
              </div>
            </div>
          </div>
          <div id="quest-status" style="margin-top:12px;text-align:center;color:#ff4444;font-size:14px;min-height:20px;font-family:'Georgia',serif;"></div>
          <!-- Decorative divider -->
          <div style="display:flex;align-items:center;justify-content:center;gap:8px;margin:12px 0 10px;">
            <div style="width:80px;height:1px;background:linear-gradient(to right,transparent,#5a4a2a);"></div>
            <span style="color:#5a4a2a;font-size:10px;">&#9830;</span>
            <div style="width:80px;height:1px;background:linear-gradient(to left,transparent,#5a4a2a);"></div>
          </div>
          <div style="text-align:center;">
            <button id="quest-close-btn" style="
              padding:12px 40px;font-size:18px;letter-spacing:3px;font-weight:bold;
              background:linear-gradient(180deg,rgba(40,30,15,0.9),rgba(25,18,8,0.95));
              border:2px solid #5a4a2a;border-top-color:#8a7a4a;border-bottom-color:#2a1a0a;
              border-radius:8px;color:#c8a84e;
              cursor:pointer;transition:all 0.2s;font-family:'Georgia',serif;pointer-events:auto;
              box-shadow:0 3px 8px rgba(0,0,0,0.4), inset 0 1px 0 rgba(200,168,78,0.15);
            ">CLOSE</button>
          </div>
          <div style="text-align:center;margin-top:8px;color:#665533;font-size:11px;font-family:'Georgia',serif;">Press J or Escape to close</div>
        </div>
      </div>`;

    const statusEl = ctx.menuEl.querySelector("#quest-status") as HTMLDivElement;
    const showStatus = (msg: string, color: string) => {
      statusEl.textContent = msg;
      statusEl.style.color = color;
      setTimeout(() => { statusEl.textContent = ""; }, 2000);
    };

    const availSlots = ctx.menuEl.querySelectorAll(".quest-available") as NodeListOf<HTMLDivElement>;
    availSlots.forEach(el => {
      el.addEventListener("mouseenter", () => { el.style.borderColor = "#c8a84e"; });
      el.addEventListener("mouseleave", () => { el.style.borderColor = "#5a4a2a"; });
      el.addEventListener("click", () => {
        if (!canAccept) {
          showStatus("Max 5 active quests!", "#ff4444");
          return;
        }
        const qId = el.getAttribute("data-quest-id")!;
        const qDef = QUEST_DATABASE.find(q => q.id === qId);
        if (!qDef) return;
        const quest: DiabloQuest = {
          ...qDef,
          progress: 0,
          isComplete: false,
          isActive: true,
        };
        if (quest.type === QuestType.COLLECT_GOLD) quest.progress = ctx.state.player.gold;
        if (quest.type === QuestType.TREASURE_HUNT) quest.progress = ctx.chestsOpened;
        ctx.state.activeQuests.push(quest);
        showStatus(`Accepted: ${quest.name}`, "#44ff44");
        showQuestBoard(ctx);
      });
    });

    const abandonBtns = ctx.menuEl.querySelectorAll(".quest-abandon") as NodeListOf<HTMLButtonElement>;
    abandonBtns.forEach(btn => {
      btn.addEventListener("click", (ev) => {
        ev.stopPropagation();
        const qId = btn.getAttribute("data-quest-id")!;
        ctx.state.activeQuests = ctx.state.activeQuests.filter(q => q.id !== qId);
        showStatus("Quest abandoned.", "#ff8800");
        showQuestBoard(ctx);
      });
    });

    const closeBtn = ctx.menuEl.querySelector("#quest-close-btn") as HTMLButtonElement;
    closeBtn.addEventListener("mouseenter", () => {
      closeBtn.style.borderColor = "#c8a84e";
      closeBtn.style.boxShadow = "0 0 15px rgba(200,168,78,0.3)";
      closeBtn.style.background = "rgba(50,40,20,0.95)";
    });
    closeBtn.addEventListener("mouseleave", () => {
      closeBtn.style.borderColor = "#5a4a2a";
      closeBtn.style.boxShadow = "none";
      closeBtn.style.background = "rgba(40,30,15,0.9)";
    });
    closeBtn.addEventListener("click", () => { ctx.closeOverlay(); });
}

// ════════════════════════════════════════════════════════════════════════════
//  20. showBestiary — Monster compendium organized by map
// ════════════════════════════════════════════════════════════════════════════

export function showBestiary(ctx: ScreenContext): void {
    // Build map data with enemies
    const mapList = Object.values(MAP_CONFIGS).filter(m => m.enemyTypes && m.enemyTypes.length > 0);

    let contentHtml = "";
    for (const map of mapList) {
      const dayBoss = DAY_BOSS_MAP[map.id as DiabloMapId];
      const nightBoss = NIGHT_BOSS_MAP[map.id as DiabloMapId];

      let enemiesHtml = "";
      for (const etype of map.enemyTypes) {
        const def = ENEMY_DEFS[etype];
        if (!def) continue;
        const isBoss = def.isBoss;
        const borderColor = isBoss ? '#ff8800' : '#5a4a2a';
        const nameColor = isBoss ? '#ffd700' : '#c8a84e';
        const badge = isBoss ? '<span style="color:#ff4400;font-size:9px;font-weight:bold;margin-left:4px;">BOSS</span>' : '';
        const behaviorText = def.behavior ? `<span style="color:#888;font-size:10px;">${(def.behavior as string).replace(/_/g, ' ')}</span>` : '';

        enemiesHtml += `
          <div style="
            background:rgba(15,10,5,0.9);border:1px solid ${borderColor};border-radius:6px;
            padding:10px 14px;display:flex;gap:12px;align-items:center;
            ${isBoss ? 'box-shadow:0 0 8px rgba(255,136,0,0.15);' : ''}
          ">
            <div style="min-width:36px;text-align:center;">
              <div style="font-size:10px;color:#888;font-family:'Georgia',serif;">Lv ${def.level}</div>
              <div style="font-size:${isBoss ? '10' : '9'}px;color:${isBoss ? '#ff8800' : '#666'};margin-top:2px;">${isBoss ? '\u2B50' : '\u2022'}</div>
            </div>
            <div style="flex:1;min-width:0;">
              <div style="color:${nameColor};font-size:14px;font-weight:bold;font-family:'Georgia',serif;">${def.name}${badge}</div>
              <div style="display:flex;gap:12px;margin-top:4px;flex-wrap:wrap;">
                <span style="color:#e88;font-size:11px;">\u2764 ${def.hp}</span>
                <span style="color:#f88;font-size:11px;">\u2694 ${def.damage}</span>
                <span style="color:#8ae;font-size:11px;">\uD83D\uDEE1 ${def.armor}</span>
                <span style="color:#8e8;font-size:11px;">\u26A1 ${def.speed.toFixed(1)}</span>
                <span style="color:#ee8;font-size:11px;">XP ${def.xpReward}</span>
              </div>
              <div style="display:flex;gap:12px;margin-top:3px;flex-wrap:wrap;">
                <span style="color:#777;font-size:10px;">Range: ${def.attackRange}</span>
                <span style="color:#777;font-size:10px;">Aggro: ${def.aggroRange}</span>
                ${behaviorText}
              </div>
            </div>
          </div>`;
      }

      // Add day/night bosses if not already in enemyTypes
      for (const [label, bossType] of [['Day Boss', dayBoss], ['Night Boss', nightBoss]] as [string, EnemyType | undefined][]) {
        if (!bossType) continue;
        if (map.enemyTypes.includes(bossType)) continue;
        const def = ENEMY_DEFS[bossType];
        if (!def) continue;
        enemiesHtml += `
          <div style="
            background:rgba(20,10,5,0.9);border:1px solid #cc4400;border-radius:6px;
            padding:10px 14px;display:flex;gap:12px;align-items:center;
            box-shadow:0 0 10px rgba(200,68,0,0.2);
          ">
            <div style="min-width:36px;text-align:center;">
              <div style="font-size:10px;color:#ff8800;font-family:'Georgia',serif;">Lv ${def.level}</div>
              <div style="font-size:10px;color:#ff4400;margin-top:2px;">\u2B50</div>
            </div>
            <div style="flex:1;min-width:0;">
              <div style="color:#ff8800;font-size:14px;font-weight:bold;font-family:'Georgia',serif;">${def.name} <span style="color:#cc4400;font-size:9px;">${label.toUpperCase()}</span></div>
              <div style="display:flex;gap:12px;margin-top:4px;flex-wrap:wrap;">
                <span style="color:#e88;font-size:11px;">\u2764 ${def.hp}</span>
                <span style="color:#f88;font-size:11px;">\u2694 ${def.damage}</span>
                <span style="color:#8ae;font-size:11px;">\uD83D\uDEE1 ${def.armor}</span>
                <span style="color:#8e8;font-size:11px;">\u26A1 ${def.speed.toFixed(1)}</span>
                <span style="color:#ee8;font-size:11px;">XP ${def.xpReward}</span>
              </div>
            </div>
          </div>`;
      }

      contentHtml += `
        <div style="margin-bottom:20px;">
          <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px;">
            <div style="flex:1;height:1px;background:linear-gradient(to right,transparent,#5a4a2a);"></div>
            <span style="color:#c8a84e;font-size:16px;font-weight:bold;letter-spacing:2px;font-family:'Georgia',serif;">${map.name}</span>
            <span style="color:#887766;font-size:11px;">Lv ${map.enemyTypes.map(e => ENEMY_DEFS[e]?.level || 0).filter(Boolean).sort((a,b) => a-b)[0] || '?'}-${Math.max(...map.enemyTypes.map(e => ENEMY_DEFS[e]?.level || 0))}</span>
            <div style="flex:1;height:1px;background:linear-gradient(to left,transparent,#5a4a2a);"></div>
          </div>
          <div style="display:flex;flex-direction:column;gap:6px;">
            ${enemiesHtml}
          </div>
        </div>`;
    }

    ctx.menuEl.innerHTML = `
      <div style="
        width:100%;height:100%;${SCREEN_BG}
        display:flex;flex-direction:column;align-items:center;justify-content:center;
        color:#fff;pointer-events:auto;position:relative;
      ">
        <div style="position:absolute;inset:8px;border:2px solid rgba(200,168,78,0.25);border-radius:4px;pointer-events:none;
          box-shadow:0 0 30px rgba(200,168,78,0.1), inset 0 0 50px rgba(0,0,0,0.3);"></div>

        <div style="
          max-width:900px;width:92%;
          background:linear-gradient(180deg,rgba(30,24,14,0.95) 0%,rgba(20,16,8,0.98) 100%);
          border:2px solid #5a4a2a;border-top-color:#8a7a4a;border-bottom-color:#2a1a0a;
          border-radius:12px;padding:28px 34px;max-height:88vh;overflow-y:auto;
          box-shadow:inset 0 0 50px rgba(0,0,0,0.3), 0 0 20px rgba(0,0,0,0.5);
          position:relative;
        ">
          <div style="position:absolute;inset:4px;border:1px solid rgba(200,168,78,0.1);border-radius:10px;pointer-events:none;"></div>
          <div style="display:flex;align-items:center;justify-content:center;gap:14px;margin-bottom:6px;">
            <div style="width:60px;height:1px;background:linear-gradient(to right,transparent,#5a4a2a);"></div>
            <span style="color:#5a4a2a;font-size:14px;">&#9884;</span>
            <h2 style="color:#c8a84e;font-size:32px;letter-spacing:5px;margin:0;font-family:'Georgia',serif;
              text-shadow:0 0 16px rgba(200,168,78,0.35), 0 2px 4px rgba(0,0,0,0.6);">BESTIARY</h2>
            <span style="color:#5a4a2a;font-size:14px;">&#9884;</span>
            <div style="width:60px;height:1px;background:linear-gradient(to left,transparent,#5a4a2a);"></div>
          </div>
          <div style="color:#887766;font-size:12px;text-align:center;margin-bottom:16px;letter-spacing:2px;font-family:'Georgia',serif;">
            Creatures of the Realm &#9830; ${mapList.reduce((s, m) => s + m.enemyTypes.length, 0)} species catalogued
          </div>
          ${contentHtml}
          <div style="display:flex;align-items:center;justify-content:center;gap:8px;margin:12px 0 10px;">
            <div style="width:80px;height:1px;background:linear-gradient(to right,transparent,#5a4a2a);"></div>
            <span style="color:#5a4a2a;font-size:10px;">&#9830;</span>
            <div style="width:80px;height:1px;background:linear-gradient(to left,transparent,#5a4a2a);"></div>
          </div>
          <div style="text-align:center;">
            <button id="bestiary-close-btn" style="
              padding:12px 40px;font-size:18px;letter-spacing:3px;font-weight:bold;
              background:linear-gradient(180deg,rgba(40,30,15,0.9),rgba(25,18,8,0.95));
              border:2px solid #5a4a2a;border-top-color:#8a7a4a;border-bottom-color:#2a1a0a;
              border-radius:8px;color:#c8a84e;
              cursor:pointer;transition:all 0.2s;font-family:'Georgia',serif;pointer-events:auto;
              box-shadow:0 3px 8px rgba(0,0,0,0.4), inset 0 1px 0 rgba(200,168,78,0.15);
            ">CLOSE</button>
          </div>
          <div style="text-align:center;margin-top:8px;color:#665533;font-size:11px;font-family:'Georgia',serif;">Press Escape to close</div>
        </div>
      </div>`;

    const closeBtn = ctx.menuEl.querySelector("#bestiary-close-btn") as HTMLButtonElement;
    closeBtn.addEventListener("mouseenter", () => {
      closeBtn.style.borderColor = "#c8a84e";
      closeBtn.style.boxShadow = "0 0 15px rgba(200,168,78,0.3)";
      closeBtn.style.background = "rgba(50,40,20,0.95)";
    });
    closeBtn.addEventListener("mouseleave", () => {
      closeBtn.style.borderColor = "#5a4a2a";
      closeBtn.style.boxShadow = "none";
      closeBtn.style.background = "rgba(40,30,15,0.9)";
    });
    closeBtn.addEventListener("click", () => { ctx.closeOverlay(); });
}
