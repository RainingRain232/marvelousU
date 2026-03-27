// ────────────────────────────────────────────────────────────────────────────
// DiabloScreens  --  extracted large _show* UI methods from DiabloGame.ts
// ────────────────────────────────────────────────────────────────────────────

import {
  DiabloState, DiabloClass, DiabloMapId, DiabloPhase, ItemRarity,
  DiabloDifficulty, SkillId, TimeOfDay, DiabloItem, DiabloEquipment,
  DiabloLoot, TalentEffectType, Weather, MapModifier,
  createDefaultPlayer,
} from "./DiabloTypes";
import {
  SKILL_DEFS, DIFFICULTY_CONFIGS, MAP_CONFIGS, ITEM_DATABASE,
  SET_BONUSES, LANTERN_CONFIGS, UNLOCKABLE_SKILLS, MAP_SPECIFIC_ITEMS,
} from "./DiabloConfig";
import {
  RARITY_CSS, RARITY_GLOW, RARITY_BORDER, RARITY_BG, RARITY_BADGE,
  rarityNeedsAnim, resolveEquipKey,
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
  const maxStat = 30;
  let cardsHtml = "";
  let classCardIndex = 0;
  for (const c of classes) {
    const cc = classColors[c.name] || "#c8a84e";
    const statBar = (label: string, val: number, color: string) => {
      const pct = Math.round((val / maxStat) * 100);
      return `<div style="display:flex;align-items:center;gap:6px;margin-bottom:3px;">
        <span style="color:${color};font-size:11px;width:28px;text-align:right;font-weight:bold;">${label}</span>
        <div style="flex:1;height:8px;background:rgba(0,0,0,0.5);border-radius:4px;border:1px solid #3a3020;overflow:hidden;">
          <div style="width:${pct}%;height:100%;background:linear-gradient(90deg,${color},${color}aa);border-radius:4px;box-shadow:0 0 4px ${color}80;"></div>
        </div>
        <span style="color:#ddd;font-size:11px;width:20px;">${val}</span>
      </div>`;
    };
    cardsHtml += `
      <div class="diablo-class-card" data-class="${c.cls}" style="
        width:220px;background:rgba(20,15,10,0.95);
        border:3px solid #5a4a2a;border-top-color:#8a7a4a;border-left-color:#7a6a3a;
        border-right-color:#3a2a1a;border-bottom-color:#2a1a0a;
        border-radius:12px;padding:28px 24px;cursor:pointer;text-align:center;
        transition:all 0.3s ease;position:relative;
        backdrop-filter:blur(4px);
        transform:translateY(0) scale(1);
        animation:cs-card-enter 0.4s ease-out backwards;
        animation-delay:${classCardIndex * 0.1}s;
        background-image:repeating-linear-gradient(45deg,transparent,transparent 8px,rgba(200,168,78,0.015) 8px,rgba(200,168,78,0.015) 16px);
      ">
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

  // Build difficulty selector
  const difficulties = [
    DiabloDifficulty.DAGGER,
    DiabloDifficulty.CLEAVER,
    DiabloDifficulty.LONGSWORD,
    DiabloDifficulty.BASTARD_SWORD,
    DiabloDifficulty.CLAYMORE,
    DiabloDifficulty.FLAMBERGE,
  ];
  let diffHtml = "";
  for (const diff of difficulties) {
    const cfg = DIFFICULTY_CONFIGS[diff];
    const isActive = ctx.state.difficulty === diff;
    diffHtml += `<button class="diff-btn" data-diff="${diff}" style="
      cursor:pointer;padding:8px 16px;font-size:14px;border-radius:6px;transition:0.2s;
      background:${isActive ? "rgba(60,50,20,0.9)" : "rgba(30,20,10,0.7)"};
      border:2px solid ${isActive ? cfg.color : "#3a3a2a"};
      color:${isActive ? cfg.color : "#666"};
      font-family:'Georgia',serif;font-weight:bold;
    ">${cfg.icon} ${cfg.label}<br><span style="font-size:11px;font-weight:normal;opacity:0.7;">${cfg.subtitle}</span></button>`;
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
      width:100%;height:100%;background:rgba(0,0,0,0.92);display:flex;flex-direction:column;
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
      </div>

      <!-- Weather selector -->
      <div style="display:flex;gap:8px;margin-bottom:16px;flex-wrap:wrap;justify-content:center;align-items:center;">
        <span style="color:#888;font-size:14px;margin-right:8px;font-family:'Georgia',serif;">WEATHER:</span>
        <button class="weather-btn" data-weather="RANDOM" style="
          cursor:pointer;padding:8px 14px;font-size:13px;border-radius:6px;transition:0.2s;
          background:rgba(60,50,20,0.9);border:2px solid #c8a84e;color:#c8a84e;
          font-family:'Georgia',serif;font-weight:bold;
        ">\uD83C\uDFB2 Random</button>
        <button class="weather-btn" data-weather="NORMAL" style="
          cursor:pointer;padding:8px 14px;font-size:13px;border-radius:6px;transition:0.2s;
          background:rgba(30,20,10,0.7);border:2px solid #3a3a2a;color:#666;
          font-family:'Georgia',serif;font-weight:bold;
        ">\u2601\uFE0F Normal</button>
        <button class="weather-btn" data-weather="CLEAR" style="
          cursor:pointer;padding:8px 14px;font-size:13px;border-radius:6px;transition:0.2s;
          background:rgba(30,20,10,0.7);border:2px solid #3a3a2a;color:#666;
          font-family:'Georgia',serif;font-weight:bold;
        ">\u2600\uFE0F Clear</button>
        <button class="weather-btn" data-weather="FOGGY" style="
          cursor:pointer;padding:8px 14px;font-size:13px;border-radius:6px;transition:0.2s;
          background:rgba(30,20,10,0.7);border:2px solid #3a3a2a;color:#666;
          font-family:'Georgia',serif;font-weight:bold;
        ">\uD83C\uDF2B\uFE0F Foggy</button>
        <button class="weather-btn" data-weather="STORMY" style="
          cursor:pointer;padding:8px 14px;font-size:13px;border-radius:6px;transition:0.2s;
          background:rgba(30,20,10,0.7);border:2px solid #3a3a2a;color:#666;
          font-family:'Georgia',serif;font-weight:bold;
        ">\u26C8\uFE0F Stormy</button>
      </div>

      <!-- Decorative sub-divider -->
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:18px;">
        <div style="width:60px;height:1px;background:linear-gradient(to right,transparent,#3a2a1a);"></div>
        <span style="color:#5a4a2a;font-size:8px;">\u25C6</span>
        <span style="color:#8a7a4a;font-size:11px;letter-spacing:4px;font-family:'Georgia',serif;">SELECT A CHAMPION</span>
        <span style="color:#5a4a2a;font-size:8px;">\u25C6</span>
        <div style="width:60px;height:1px;background:linear-gradient(to left,transparent,#3a2a1a);"></div>
      </div>

      <div style="display:flex;gap:16px;flex-wrap:wrap;justify-content:center;">${cardsHtml}</div>
      <div style="text-align:center;margin:10px 0;">
        <label style="color:#ff4444;font-family:Georgia,serif;cursor:pointer;font-size:14px;
          padding:6px 16px;border:1px solid rgba(255,68,68,0.2);border-radius:4px;
          background:rgba(80,20,20,0.3);transition:all 0.2s;">
          <input type="checkbox" id="hardcore-check" style="margin-right:6px;accent-color:#ff4444;">
          \u2620 Hardcore Mode (Permadeath)
        </label>
      </div>
      ${savedCharHtml}
      <div style="display:flex;gap:14px;margin-top:30px;flex-wrap:wrap;justify-content:center;">
        ${saveBtns}
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
      const cls = card.getAttribute("data-class") as DiabloClass;
      ctx.state.player = createDefaultPlayer(cls);
      const hcCheck = document.getElementById('hardcore-check') as HTMLInputElement | null;
      if (hcCheck && hcCheck.checked) {
        ctx.state.player.isHardcore = true;
      }
      ctx.showMapSelect();
    });
  });

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
  const weatherBtns = ctx.menuEl.querySelectorAll(".weather-btn") as NodeListOf<HTMLButtonElement>;
  const weatherColors: Record<string, string> = {
    RANDOM: "#c8a84e", NORMAL: "#9999aa", CLEAR: "#ffcc44", FOGGY: "#8899bb", STORMY: "#6688cc",
  };
  weatherBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      const w = btn.getAttribute("data-weather") as Weather | 'RANDOM';
      ctx.state.preferredWeather = w;
      weatherBtns.forEach((b) => {
        const bw = b.getAttribute("data-weather")!;
        const isNowActive = bw === w;
        const color = weatherColors[bw] || "#c8a84e";
        b.style.background = isNowActive ? "rgba(60,50,20,0.9)" : "rgba(30,20,10,0.7)";
        b.style.borderColor = isNowActive ? color : "#3a3a2a";
        b.style.color = isNowActive ? color : "#666";
      });
    });
  });

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
  // Exit button (red)
  csHover("#diablo-cs-exit", "#e44", "rgba(255,80,80,0.3)", "rgba(50,20,20,0.95)", "#a44", "rgba(40,30,15,0.9)");

  // Click handlers
  const csClick = (id: string, fn: () => void) => {
    const el = ctx.menuEl.querySelector(id);
    if (el) el.addEventListener("click", fn);
  };
  csClick("#diablo-cs-load", () => ctx.loadGame());
  csClick("#diablo-cs-controls", () => { ctx.setPhaseBeforeOverlay(DiabloPhase.CLASS_SELECT); ctx.state.phase = DiabloPhase.INVENTORY; ctx.showControls(); });
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
  for (const m of maps) {
    // Check if any difficulty variant of this map has been completed
    const isCompleted = Object.keys(ctx.state.completedMaps).some(k => k.startsWith(m.id) && ctx.state.completedMaps[k]);
    const completionBadge = isCompleted ? `<span style="color:#44ff44;margin-left:6px;font-size:16px;">\u2713</span>` : '';
    cardsHtml += `
      <div class="diablo-map-card" data-map="${m.id}" style="
        width:220px;background:rgba(20,15,10,0.95);border:2px solid ${isCompleted ? '#44ff44' : '#5a4a2a'};
        border-radius:12px;padding:30px;cursor:pointer;text-align:center;
        transition:all 0.3s ease;
        backdrop-filter:blur(4px);
        transform:translateY(0) scale(1);
        animation:cs-card-enter 0.4s ease-out backwards;
        animation-delay:${mapCardIndex * 0.1}s;
      ">
        <div style="font-size:64px;margin-bottom:12px;">${m.icon}</div>
        <div style="font-size:22px;color:#c8a84e;font-weight:bold;letter-spacing:2px;margin-bottom:12px;">${m.name}${completionBadge}</div>
        <p style="color:#aaa;font-size:14px;line-height:1.5;margin-bottom:16px;">${m.desc}</p>
        <div style="font-size:20px;color:${m.isSafe ? '#44ff44' : '#ff8'};">Difficulty: ${m.difficulty}</div>
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
      background:rgba(0,0,0,0.92);
      background-image:radial-gradient(ellipse at center,rgba(200,168,78,0.04) 0%,transparent 60%);
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
      <div style="display:flex;gap:8px;margin-bottom:14px;">${todHtml}</div>

      <!-- Divider between time-of-day and modifiers -->
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
      ? `<div style="font-size:28px;">${item.icon}</div><div style="font-size:10px;color:${RARITY_CSS[item.rarity]};margin-top:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:68px;text-shadow:0 0 6px ${RARITY_CSS[item.rarity]}40;">${item.name}</div>${badge}`
      : `<div style="font-size:11px;color:#555;">${sd.label}</div>`;
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
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px 14px;font-size:12px;">
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
      background:rgba(0,0,0,0.90);
      background-image:radial-gradient(ellipse at center,rgba(40,30,15,0.15) 0%,transparent 70%);
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
          <!-- Equipment -->
          <div>
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;justify-content:center;">
              <div style="width:30px;height:1px;background:linear-gradient(to right,transparent,#5a4a2a);"></div>
              <span style="color:#a08850;font-size:13px;letter-spacing:2px;text-transform:uppercase;">Equipment</span>
              <div style="width:30px;height:1px;background:linear-gradient(to left,transparent,#5a4a2a);"></div>
            </div>
            <div style="display:grid;grid-template-columns:74px 74px 74px;grid-template-rows:74px 74px 74px 74px;gap:6px;">
              ${equipHtml}
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
          <div style="color:#888;font-size:12px;">Press <span style="display:inline-block;background:rgba(60,50,30,0.8);border:1px solid #888;border-radius:4px;padding:2px 10px;font-family:monospace;color:#fff;">S</span> to open Shared Stash</div>
        </div>
        <div style="margin-top:10px;color:#666;font-size:12px;text-align:center;">Press <span style="color:#aaa;">I</span> or <span style="color:#aaa;">Escape</span> to close</div>
      </div>
      <!-- Tooltip container -->
      <div id="inv-tooltip" style="
        display:none;position:fixed;z-index:100;background:rgba(8,4,2,0.97);
        border:2px solid #5a4a2a;border-radius:8px;padding:0;max-width:300px;
        pointer-events:none;color:#ccc;font-size:13px;overflow:hidden;
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
    el.addEventListener("mouseenter", (ev) => ctx.showItemTooltip(ev, p.inventory[idx].item));
    el.addEventListener("mouseleave", () => ctx.hideItemTooltip());
  });

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
      position:absolute;inset:0;background:rgba(0,0,0,0.85);display:flex;
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
        background:radial-gradient(ellipse at center, rgba(40,25,10,0.92) 0%, rgba(0,0,0,0.94) 70%);
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
      background:radial-gradient(ellipse at center, rgba(40,30,10,0.4) 0%, rgba(0,0,0,0.92) 70%);
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
