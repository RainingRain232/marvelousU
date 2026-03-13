import { DiabloRenderer, getTerrainHeight } from "./DiabloRenderer";
import {
  DiabloState, DiabloEnemy, DiabloProjectile, DiabloLoot,
  DiabloTreasureChest, DiabloAOE,
  DiabloClass, DiabloMapId, DiabloPhase, ItemRarity, DiabloDifficulty,
  SkillId, EnemyState, EnemyType, StatusEffect, TimeOfDay, DamageType,
  DiabloItem, DiabloEquipment, DiabloPotion, PotionType,
  VendorType, DiabloVendor,
  BossAbility, EnemyBehavior,
  DiabloQuest, QuestType, CraftType,
  TalentEffectType,
  ParticleType, Weather,
  createDefaultPlayer, createDefaultState
} from "./DiabloTypes";
import {
  SKILL_DEFS, MAP_CONFIGS, ENEMY_DEFS, ITEM_DATABASE, SET_BONUSES,
  LOOT_TABLES, RARITY_NAMES, XP_TABLE,
  ENEMY_SPAWN_WEIGHTS,
  VENDOR_DEFS, generateVendorInventory,
  DIFFICULTY_CONFIGS,
  BOSS_PHASE_CONFIGS,
  TALENT_TREES, TALENT_BRANCH_NAMES,
  POTION_DATABASE, ENEMY_DAMAGE_TYPES,
  QUEST_DATABASE,
  MAP_COMPLETION_REWARDS,
  CRAFTING_RECIPES,
  SALVAGE_MATERIAL_YIELDS,
  LANTERN_CONFIGS,
  SKILL_BRANCHES,
  UNLOCKABLE_SKILLS,
} from "./DiabloConfig";

// ────────────────────────────────────────────────────────────────────────────
// Rarity color strings for UI (hex CSS colors)
// ────────────────────────────────────────────────────────────────────────────
const RARITY_CSS: Record<ItemRarity, string> = {
  [ItemRarity.COMMON]: "#cccccc",
  [ItemRarity.UNCOMMON]: "#44ff44",
  [ItemRarity.RARE]: "#4488ff",
  [ItemRarity.EPIC]: "#aa44ff",
  [ItemRarity.LEGENDARY]: "#ff8800",
  [ItemRarity.MYTHIC]: "#ff2222",
  [ItemRarity.DIVINE]: "#ffd700",
};

// Map any item slot string to a canonical equip key (handles config items that may
// use non-enum string values like "MAIN_HAND", "HEAD", "CHEST", etc.)
function resolveEquipKey(slot: string): keyof DiabloEquipment | null {
  const s = slot as string;
  if (s === "HELMET" || s === "HEAD") return "helmet";
  if (s === "BODY" || s === "CHEST") return "body";
  if (s === "GAUNTLETS" || s === "HANDS") return "gauntlets";
  if (s === "LEGS") return "legs";
  if (s === "FEET") return "feet";
  if (s === "ACCESSORY_1" || s === "RING" || s === "AMULET") return "accessory1";
  if (s === "ACCESSORY_2") return "accessory2";
  if (s === "WEAPON" || s === "MAIN_HAND") return "weapon";
  if (s === "LANTERN") return "lantern";
  if (s === "OFF_HAND" || s === "BELT" || s === "QUIVER" || s === "ORB") return null;
  return null;
}

// ────────────────────────────────────────────────────────────────────────────
// Map clear kill targets per map
// ────────────────────────────────────────────────────────────────────────────
const MAP_KILL_TARGET: Record<DiabloMapId, number> = {
  [DiabloMapId.FOREST]: 50,
  [DiabloMapId.ELVEN_VILLAGE]: 40,
  [DiabloMapId.NECROPOLIS_DUNGEON]: 60,
  [DiabloMapId.VOLCANIC_WASTES]: 70,
  [DiabloMapId.ABYSSAL_RIFT]: 80,
  [DiabloMapId.DRAGONS_SANCTUM]: 100,
  [DiabloMapId.SUNSCORCH_DESERT]: 35,
  [DiabloMapId.EMERALD_GRASSLANDS]: 30,
  [DiabloMapId.CAMELOT]: 0,
};

// ────────────────────────────────────────────────────────────────────────────
// Boss names per map
// ────────────────────────────────────────────────────────────────────────────
const BOSS_NAMES: Record<DiabloMapId, string[]> = {
  [DiabloMapId.FOREST]: ["Oakrot the Ancient", "Grimfang Alpha", "Bandit King Varros"],
  [DiabloMapId.ELVEN_VILLAGE]: ["Shadowlord Ael'thar", "Corrupted Archon", "Darkstalker Prime"],
  [DiabloMapId.NECROPOLIS_DUNGEON]: ["Lich Overlord Morthis", "Bonecrusher", "Wraith King Null"],
  [DiabloMapId.VOLCANIC_WASTES]: ["Ignis the Unquenched", "Emberlord Pyraxis", "Magma King Volrath"],
  [DiabloMapId.ABYSSAL_RIFT]: ["Xal'thuun the Void Maw", "Entropy Incarnate", "Riftlord Nihilus"],
  [DiabloMapId.DRAGONS_SANCTUM]: ["Vyrathion the Ancient", "Drakemaw the Endless", "Scorchfather Pyranax"],
  [DiabloMapId.SUNSCORCH_DESERT]: ["Sandclaw the Burrower", "Dune Reaver Kassim", "Mirage Serpent"],
  [DiabloMapId.EMERALD_GRASSLANDS]: ["Thunderhoof the Wild", "Warchief Garon", "Skytalon the Fierce"],
  [DiabloMapId.CAMELOT]: [],
};

// ────────────────────────────────────────────────────────────────────────────
// Main quest: The Fall of Excalibur — hints per map
// ────────────────────────────────────────────────────────────────────────────
const EXCALIBUR_QUEST_INFO: Partial<Record<DiabloMapId, { fragment: string; hint: string; lore: string }>> = {
  [DiabloMapId.SUNSCORCH_DESERT]: {
    fragment: "The Pommel of Excalibur",
    hint: "Sir Bedivere's tomb lies among the southern ruins. Seek the Sandsworn Revenant that guards it.",
    lore: "Bedivere carried the Pommel into the desert but fell to Mordred's curse. His body still clutches the shard.",
  },
  [DiabloMapId.EMERALD_GRASSLANDS]: {
    fragment: "The Crossguard of Excalibur",
    hint: "The raider camp to the northeast holds what Sir Percival died to protect. Look for Warchief Garon.",
    lore: "Percival sheltered refugees here, but Mordred's Oathbreaker found him. The Crossguard was taken as a trophy.",
  },
  [DiabloMapId.FOREST]: {
    fragment: "The Lower Blade of Excalibur",
    hint: "Morgan le Fay planted the shard in the Great Oak at the forest's heart. The corruption spreads from there.",
    lore: "The forest itself has become the guardian. Cut through the Blighted Heartwood to claim what was stolen.",
  },
  [DiabloMapId.ELVEN_VILLAGE]: {
    fragment: "The Upper Blade of Excalibur",
    hint: "Archon Sylvaris has gone mad with the fragment's power. He lurks in the central crystal spire.",
    lore: "The elves meant well when they kept the blade, but its unsheathed power shattered the Archon's mind.",
  },
  [DiabloMapId.NECROPOLIS_DUNGEON]: {
    fragment: "The Blade Core of Excalibur",
    hint: "Deep in the catacombs, a death knight waits — one who was once Sir Lancelot. Steel yourself.",
    lore: "Lancelot descended alone to reclaim the Core. Mordred's necromancers slew him and raised his corpse as a guardian.",
  },
  [DiabloMapId.VOLCANIC_WASTES]: {
    fragment: "The Enchantment Rune of Excalibur",
    hint: "The demon Balor consumed Merlin's essence along with the Rune. He burns in the deepest caldera.",
    lore: "Merlin's binding magic gave Excalibur its power. Without the Rune, the blade is but common steel.",
  },
  [DiabloMapId.ABYSSAL_RIFT]: {
    fragment: "The Scabbard of Excalibur",
    hint: "Morgan le Fay fled into the void with the Scabbard. She prepares a ritual to destroy it — hurry.",
    lore: "The Scabbard grants invulnerability to its bearer. Morgan knows that without it, Mordred can still be slain.",
  },
  [DiabloMapId.DRAGONS_SANCTUM]: {
    fragment: "The Soul of the Blade",
    hint: "Aurelion the Eternal bonded with Excalibur's sentient core. Prove your worth to the gold dragon.",
    lore: "The Soul chose the dragon to survive. It will not yield to the unworthy — but it yearns to be whole again.",
  },
};

const CAMELOT_FIRST_VISIT_TEXT = [
  "Mordred has betrayed Camelot and shattered Excalibur.",
  "Eight fragments lie scattered across the corrupted lands.",
  "Speak to the merchants for guidance. Recover the shards.",
  "Reforge the blade. End Mordred's reign.",
];

// ────────────────────────────────────────────────────────────────────────────
// Merchant dialogue lines (story flavor)
// ────────────────────────────────────────────────────────────────────────────
const VENDOR_DIALOGUE: Record<VendorType, string[]> = {
  [VendorType.BLACKSMITH]: [
    "I forged arms for the Round Table once. Now I forge them for you — the last hope of Camelot.",
    "Mordred's forces grow bolder each day. The patrols have stopped returning from the Necropolis.",
    "Excalibur... I held it once, to sharpen the edge. There was a hum in the steel, like a heartbeat. We must make it whole.",
    "Sir Lancelot was the finest swordsman I ever knew. If he truly fell in the catacombs... be careful down there.",
    "The desert traders say Bedivere's tomb glows at night. The Pommel still calls out for the blade.",
  ],
  [VendorType.ARCANIST]: [
    "I sense the fragments scattered across the land — each one pulses with Merlin's residual magic.",
    "Morgan le Fay was my teacher once, before the darkness took her. She hides in the Rift now, the coward.",
    "The elves of Aelindor sealed their village after the Archon went mad. Whatever he found, it broke him.",
    "When Excalibur shattered, I felt it in my bones. Every mage did. The world's magic... fractured.",
    "The Enchantment Rune is the key. Without Merlin's binding, the blade is just metal. The demon Balor must fall.",
  ],
  [VendorType.ALCHEMIST]: [
    "I've been brewing restoratives day and night. The wounded keep coming, and the dead... the dead keep rising.",
    "Brother monks in the Necropolis fell silent weeks ago. I fear the worst for their relics — and their souls.",
    "The volcanic wastes reek of brimstone and stolen magic. Something terrible feeds on Merlin's power there.",
    "Stock up on potions before the Abyssal Rift. The void drains life from the unwary.",
    "I pray for Arthur's return from Avalon. Until then, you carry Camelot's hope on your shoulders.",
  ],
  [VendorType.JEWELER]: [
    "These gems once adorned the crowns of Camelot. Now I sell them to fund the resistance.",
    "The grasslands were peaceful once. Now raiders ride under Mordred's black banner.",
    "I've heard whispers of a dragon in the eastern sanctum — old as the world, guarding something precious.",
    "If you find the Scabbard of Excalibur, bring it here. I can verify its authenticity by the gemwork.",
    "Mordred wears a crown of black iron. When you face him, aim for the arrogance.",
  ],
  [VendorType.GENERAL_MERCHANT]: [
    "I've traveled every road in this kingdom. They're all dangerous now. Mordred's patrols are everywhere.",
    "The forest has gone wrong — trees moving, shadows with teeth. It wasn't like that before the blade shattered.",
    "I sell a bit of everything because everyone needs a bit of everything these days. Dark times.",
    "A merchant from the desert told me he saw a tomb glowing blue at night. That's unnatural, that is.",
    "You look like you can handle yourself. Good. Camelot needs fighters, not merchants. ...Don't tell anyone I said that.",
  ],
};

const NIGHT_BOSS_MAP: Partial<Record<DiabloMapId, EnemyType>> = {
  [DiabloMapId.FOREST]: EnemyType.NIGHT_FOREST_WENDIGO,
  [DiabloMapId.ELVEN_VILLAGE]: EnemyType.NIGHT_ELVEN_BANSHEE_QUEEN,
  [DiabloMapId.NECROPOLIS_DUNGEON]: EnemyType.NIGHT_NECRO_DEATH_KNIGHT,
  [DiabloMapId.VOLCANIC_WASTES]: EnemyType.NIGHT_VOLCANIC_INFERNO_TITAN,
  [DiabloMapId.ABYSSAL_RIFT]: EnemyType.NIGHT_RIFT_VOID_EMPEROR,
  [DiabloMapId.DRAGONS_SANCTUM]: EnemyType.NIGHT_DRAGON_SHADOW_WYRM,
  [DiabloMapId.SUNSCORCH_DESERT]: EnemyType.NIGHT_DESERT_SANDSTORM_DJINN,
  [DiabloMapId.EMERALD_GRASSLANDS]: EnemyType.NIGHT_GRASSLAND_STAMPEDE_KING,
};

// ────────────────────────────────────────────────────────────────────────────
// DiabloGame
// ────────────────────────────────────────────────────────────────────────────
export class DiabloGame {
  private _state!: DiabloState;
  private _renderer!: DiabloRenderer;
  private _hud!: HTMLDivElement;
  private _menuEl!: HTMLDivElement;
  private _rafId: number = 0;
  private _lastTime: number = 0;
  private _keys: Set<string> = new Set();
  private _mouseX: number = 0;
  private _mouseY: number = 0;
  private _mouseDown: boolean = false;
  private _nextId: number = 1;
  private _targetEnemyId: string | null = null;
  private _phaseBeforeOverlay: DiabloPhase = DiabloPhase.CLASS_SELECT;

  // Bound event handlers
  private _boundKeyDown!: (e: KeyboardEvent) => void;
  private _boundKeyUp!: (e: KeyboardEvent) => void;
  private _boundMouseMove!: (e: MouseEvent) => void;
  private _boundMouseDown!: (e: MouseEvent) => void;
  private _boundMouseUp!: (e: MouseEvent) => void;
  private _boundContextMenu!: (e: MouseEvent) => void;
  private _boundResize!: () => void;

  // HUD element references
  private _hpBar!: HTMLDivElement;
  private _mpBar!: HTMLDivElement;
  private _xpBar!: HTMLDivElement;
  private _goldText!: HTMLDivElement;
  private _levelText!: HTMLDivElement;
  private _killText!: HTMLDivElement;
  private _hpText!: HTMLDivElement;
  private _mpText!: HTMLDivElement;
  private _skillSlots: HTMLDivElement[] = [];
  private _skillCooldownOverlays: HTMLDivElement[] = [];

  // Minimap
  private _minimapCanvas!: HTMLCanvasElement;
  private _minimapCtx!: CanvasRenderingContext2D;

  // Vendor interaction hint
  private _vendorHint!: HTMLDivElement;
  private _chestHint!: HTMLDivElement;

  // Quest popup element
  private _questPopup!: HTMLDivElement;

  // Death overlay (ac6cb424)
  private _deathOverlay!: HTMLDivElement;
  private _isDead: boolean = false;

  // Potion HUD slots (ad1a2850)
  private _potionHudSlots: HTMLDivElement[] = [];

  // Fullscreen map (aece2d8c)
  private _fullmapCanvas!: HTMLCanvasElement;
  private _fullmapCtx!: CanvasRenderingContext2D;
  private _fullmapVisible: boolean = false;
  private _weatherText!: HTMLDivElement;

  // Quest tracker (a270b216)
  private _questTracker!: HTMLDivElement;
  private _chestsOpened: number = 0;
  private _goldEarnedTotal: number = 0;

  // ──────────────────────────────────────────────────────────────
  //  BOOT
  // ──────────────────────────────────────────────────────────────
  async boot(): Promise<void> {
    this._state = createDefaultState();
    const w = window.innerWidth;
    const h = window.innerHeight;
    this._renderer = new DiabloRenderer();
    this._renderer.init(w, h);
    document.body.appendChild(this._renderer.canvas);

    // HUD overlay
    this._hud = document.createElement("div");
    this._hud.style.cssText =
      "position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:10;" +
      "font-family:'Segoe UI',sans-serif;display:none;";
    document.body.appendChild(this._hud);

    // Menu overlay
    this._menuEl = document.createElement("div");
    this._menuEl.style.cssText =
      "position:absolute;top:0;left:0;width:100%;height:100%;z-index:20;";
    document.body.appendChild(this._menuEl);

    // Bind events
    this._keys = new Set();
    this._boundKeyDown = (e: KeyboardEvent) => this._onKeyDown(e);
    this._boundKeyUp = (e: KeyboardEvent) => this._onKeyUp(e);
    this._boundMouseMove = (e: MouseEvent) => this._onMouseMove(e);
    this._boundMouseDown = (e: MouseEvent) => this._onMouseDown(e);
    this._boundMouseUp = (e: MouseEvent) => this._onMouseUp(e);
    this._boundContextMenu = (e: MouseEvent) => this._onContextMenu(e);
    this._boundResize = () => this._onResize();

    window.addEventListener("keydown", this._boundKeyDown);
    window.addEventListener("keyup", this._boundKeyUp);
    window.addEventListener("mousemove", this._boundMouseMove);
    window.addEventListener("mousedown", this._boundMouseDown);
    window.addEventListener("mouseup", this._boundMouseUp);
    window.addEventListener("contextmenu", this._boundContextMenu);
    window.addEventListener("resize", this._boundResize);

    this._buildHUD();
    this._showClassSelect();
    this._lastTime = performance.now();
    this._rafId = requestAnimationFrame(this._gameLoop);
  }

  // ──────────────────────────────────────────────────────────────
  //  DESTROY
  // ──────────────────────────────────────────────────────────────
  destroy(): void {
    cancelAnimationFrame(this._rafId);
    window.removeEventListener("keydown", this._boundKeyDown);
    window.removeEventListener("keyup", this._boundKeyUp);
    window.removeEventListener("mousemove", this._boundMouseMove);
    window.removeEventListener("mousedown", this._boundMouseDown);
    window.removeEventListener("mouseup", this._boundMouseUp);
    window.removeEventListener("contextmenu", this._boundContextMenu);
    window.removeEventListener("resize", this._boundResize);
    if (this._hud && this._hud.parentElement) {
      this._hud.parentElement.removeChild(this._hud);
    }
    if (this._menuEl && this._menuEl.parentElement) {
      this._menuEl.parentElement.removeChild(this._menuEl);
    }
    this._renderer.dispose();
  }

  // ──────────────────────────────────────────────────────────────
  //  INPUT HANDLERS
  // ──────────────────────────────────────────────────────────────
  private _onKeyDown(e: KeyboardEvent): void {
    this._keys.add(e.code);
    if (this._state.phase === DiabloPhase.PLAYING) {
      if (e.code === "Digit1") this._activateSkill(0);
      else if (e.code === "Digit2") this._activateSkill(1);
      else if (e.code === "Digit3") this._activateSkill(2);
      else if (e.code === "Digit4") this._activateSkill(3);
      else if (e.code === "Digit5") this._activateSkill(4);
      else if (e.code === "Digit6") this._activateSkill(5);
      else if (e.code === "KeyI") {
        this._phaseBeforeOverlay = DiabloPhase.PLAYING;
        this._state.phase = DiabloPhase.INVENTORY;
        this._showInventory();
      } else if (e.code === "Escape") {
        this._state.phase = DiabloPhase.PAUSED;
        this._showPauseMenu();
      } else if (e.code === "KeyJ") {
        this._phaseBeforeOverlay = DiabloPhase.PLAYING;
        this._state.phase = DiabloPhase.INVENTORY;
        this._showQuestBoard();
      } else if (e.code === "KeyT") {
        this._phaseBeforeOverlay = DiabloPhase.PLAYING;
        this._state.phase = DiabloPhase.INVENTORY;
        this._showTalentTree();
      } else if (e.code === "KeyQ") {
        this._useQuickPotion(PotionType.HEALTH);
      } else if (e.code === "KeyE" && this._state.currentMap !== DiabloMapId.CAMELOT) {
        this._useQuickPotion(PotionType.MANA);
      } else if (e.code === "F1") {
        e.preventDefault();
        this._usePotionSlot(0);
      } else if (e.code === "F2") {
        e.preventDefault();
        this._usePotionSlot(1);
      } else if (e.code === "F3") {
        e.preventDefault();
        this._usePotionSlot(2);
      } else if (e.code === "F4") {
        e.preventDefault();
        this._usePotionSlot(3);
      } else if (e.code === "KeyE" && this._state.currentMap === DiabloMapId.CAMELOT) {
        const p = this._state.player;
        let nearestVendor: DiabloVendor | null = null;
        let nearestDist = 4;
        for (const v of this._state.vendors) {
          const d = this._dist(p.x, p.z, v.x, v.z);
          if (d < nearestDist) {
            nearestDist = d;
            nearestVendor = v;
          }
        }
        if (nearestVendor) {
          if (nearestVendor.type === VendorType.BLACKSMITH) {
            this._showCraftingUI(nearestVendor, 'blacksmith');
          } else if (nearestVendor.type === VendorType.JEWELER) {
            this._showCraftingUI(nearestVendor, 'jeweler');
          } else {
            this._showVendorShop(nearestVendor);
          }
        }
      } else if (e.code === "KeyM") {
        this._fullmapVisible = !this._fullmapVisible;
        this._fullmapCanvas.style.display = this._fullmapVisible ? "block" : "none";
      } else if (e.code === "Space") {
        this._doDodgeRoll();
      } else if (e.code === "KeyP") {
        this._toggleLantern();
      } else if (e.code === "KeyK") {
        this._phaseBeforeOverlay = DiabloPhase.PLAYING;
        this._state.phase = DiabloPhase.INVENTORY;
        this._showSkillSwapMenu();
      } else if (e.code === "KeyF") {
        this._openNearestChest();
      }
    } else if (this._state.phase === DiabloPhase.INVENTORY) {
      if (e.code === "Escape" || e.code === "KeyI" || e.code === "KeyT") {
        this._closeOverlay();
      } else if (e.code === "KeyS") {
        this._showStash();
      }
    } else if (this._state.phase === DiabloPhase.CLASS_SELECT) {
      // no-op: class select handles its own UI
    } else if (this._state.phase === DiabloPhase.PAUSED) {
      if (e.code === "Escape") {
        this._state.phase = DiabloPhase.PLAYING;
        this._menuEl.innerHTML = "";
      }
    }
  }

  private _onKeyUp(e: KeyboardEvent): void {
    this._keys.delete(e.code);
  }

  private _onMouseMove(e: MouseEvent): void {
    this._mouseX = e.clientX;
    this._mouseY = e.clientY;
  }

  private _onMouseDown(e: MouseEvent): void {
    if (e.button === 0) {
      this._mouseDown = true;
      if (this._state.phase === DiabloPhase.PLAYING) {
        // Check vendor interaction on Camelot
        if (this._state.currentMap === DiabloMapId.CAMELOT) {
          const p = this._state.player;
          let nearestVendor: DiabloVendor | null = null;
          let nearestDist = 3;
          for (const v of this._state.vendors) {
            const d = this._dist(p.x, p.z, v.x, v.z);
            if (d < nearestDist) {
              nearestDist = d;
              nearestVendor = v;
            }
          }
          if (nearestVendor) {
            this._showVendorShop(nearestVendor);
            return;
          }
        }

        const target = this._renderer.getClickTarget(this._mouseX, this._mouseY, this._state);
        if (target) {
          if (target.type === "enemy") {
            this._targetEnemyId = target.id;
          } else if (target.type === "chest") {
            this._openChest(target.id);
          } else if (target.type === "loot") {
            this._pickupLoot(target.id);
          }
        } else {
          this._targetEnemyId = null;
        }
      }
    }
  }

  private _onMouseUp(e: MouseEvent): void {
    if (e.button === 0) this._mouseDown = false;
  }

  private _onContextMenu(e: MouseEvent): void {
    e.preventDefault();
  }

  private _onResize(): void {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this._renderer.resize(w, h);
  }

  // ──────────────────────────────────────────────────────────────
  //  CLASS SELECT SCREEN
  // ──────────────────────────────────────────────────────────────
  private _showClassSelect(): void {
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
    ];

    let cardsHtml = "";
    for (const c of classes) {
      cardsHtml += `
        <div class="diablo-class-card" data-class="${c.cls}" style="
          width:280px;background:rgba(20,15,10,0.95);border:2px solid #5a4a2a;
          border-radius:12px;padding:30px;cursor:pointer;text-align:center;
          transition:border-color 0.3s,box-shadow 0.3s;
        ">
          <div style="font-size:64px;margin-bottom:12px;">${c.icon}</div>
          <div style="font-size:24px;color:#c8a84e;font-weight:bold;letter-spacing:2px;margin-bottom:12px;">${c.name}</div>
          <p style="color:#aaa;font-size:14px;line-height:1.5;margin-bottom:16px;">${c.desc}</p>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;font-size:13px;">
            <div style="color:#e88;text-align:left;">STR: <span style="color:#fff;">${c.str}</span></div>
            <div style="color:#8e8;text-align:left;">DEX: <span style="color:#fff;">${c.dex}</span></div>
            <div style="color:#88e;text-align:left;">INT: <span style="color:#fff;">${c.int}</span></div>
            <div style="color:#ee8;text-align:left;">VIT: <span style="color:#fff;">${c.vit}</span></div>
          </div>
        </div>`;
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
      const isActive = this._state.difficulty === diff;
      diffHtml += `<button class="diff-btn" data-diff="${diff}" style="
        cursor:pointer;padding:8px 16px;font-size:14px;border-radius:6px;transition:0.2s;
        background:${isActive ? "rgba(60,50,20,0.9)" : "rgba(30,20,10,0.7)"};
        border:2px solid ${isActive ? cfg.color : "#3a3a2a"};
        color:${isActive ? cfg.color : "#666"};
        font-family:'Georgia',serif;font-weight:bold;
      ">${cfg.icon} ${cfg.label}<br><span style="font-size:11px;font-weight:normal;opacity:0.7;">${cfg.subtitle}</span></button>`;
    }

    const hasSave = this._hasSave();
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

    this._menuEl.innerHTML = `
      <div style="
        width:100%;height:100%;background:rgba(0,0,0,0.92);display:flex;flex-direction:column;
        align-items:center;justify-content:center;color:#fff;
      ">
        <h1 style="
          color:#c8a84e;font-size:48px;letter-spacing:4px;margin-bottom:50px;
          text-shadow:0 0 20px rgba(200,168,78,0.5),0 2px 4px rgba(0,0,0,0.8);
          font-family:'Georgia',serif;
        ">CHOOSE YOUR CLASS</h1>
        <div style="display:flex;gap:8px;margin-bottom:24px;flex-wrap:wrap;justify-content:center;">
          <span style="color:#888;font-size:14px;align-self:center;margin-right:8px;font-family:'Georgia',serif;">DIFFICULTY:</span>
          ${diffHtml}
        </div>
        <div style="display:flex;gap:30px;">${cardsHtml}</div>
        <div style="display:flex;gap:14px;margin-top:30px;flex-wrap:wrap;justify-content:center;">
          ${saveBtns}
          <button id="diablo-cs-controls" style="${menuBtnStyle}">CONTROLS</button>
          <button id="diablo-cs-exit" style="${exitBtnStyle}">EXIT</button>
        </div>
      </div>`;

    const cards = this._menuEl.querySelectorAll(".diablo-class-card") as NodeListOf<HTMLDivElement>;
    cards.forEach((card) => {
      card.addEventListener("mouseenter", () => {
        card.style.borderColor = "#c8a84e";
        card.style.boxShadow = "0 0 20px rgba(200,168,78,0.3)";
      });
      card.addEventListener("mouseleave", () => {
        card.style.borderColor = "#5a4a2a";
        card.style.boxShadow = "none";
      });
      card.addEventListener("click", () => {
        const cls = card.getAttribute("data-class") as DiabloClass;
        this._state.player = createDefaultPlayer(cls);
        this._showMapSelect();
      });
    });

    // Wire up difficulty buttons
    const diffBtns = this._menuEl.querySelectorAll(".diff-btn") as NodeListOf<HTMLButtonElement>;
    diffBtns.forEach((btn) => {
      btn.addEventListener("click", () => {
        this._state.difficulty = btn.getAttribute("data-diff") as DiabloDifficulty;
        diffBtns.forEach((b) => {
          const bDiff = b.getAttribute("data-diff") as DiabloDifficulty;
          const bCfg = DIFFICULTY_CONFIGS[bDiff];
          const isNowActive = bDiff === this._state.difficulty;
          b.style.background = isNowActive ? "rgba(60,50,20,0.9)" : "rgba(30,20,10,0.7)";
          b.style.borderColor = isNowActive ? bCfg.color : "#3a3a2a";
          b.style.color = isNowActive ? bCfg.color : "#666";
        });
      });
    });

    // Hover helper for class-select menu buttons
    const csHover = (id: string, hBorder: string, hShadow: string, hBg: string, rBorder: string, rBg: string) => {
      const el = this._menuEl.querySelector(id) as HTMLButtonElement | null;
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
      const el = this._menuEl.querySelector(id);
      if (el) el.addEventListener("click", fn);
    };
    csClick("#diablo-cs-load", () => this._loadGame());
    csClick("#diablo-cs-controls", () => { this._phaseBeforeOverlay = DiabloPhase.CLASS_SELECT; this._state.phase = DiabloPhase.INVENTORY; this._showControls(); });
    csClick("#diablo-cs-exit", () => window.dispatchEvent(new CustomEvent("diabloExit")));

    // Stash/Inventory/Character need a loaded save to have meaningful data
    if (hasSave) {
      csClick("#diablo-cs-stash", () => {
        this._phaseBeforeOverlay = DiabloPhase.CLASS_SELECT;
        const raw = localStorage.getItem("diablo_save");
        if (raw) {
          const save = JSON.parse(raw);
          this._state.persistentStash = save.persistentStash || Array.from({ length: 100 }, () => ({ item: null }));
          this._state.player = { ...save.player, skillCooldowns: new Map(Object.entries(save.player.skillCooldowns)) };
          this._state.persistentGold = save.persistentGold;
        }
        this._state.phase = DiabloPhase.INVENTORY;
        this._showStash();
      });
      csClick("#diablo-cs-inventory", () => {
        this._phaseBeforeOverlay = DiabloPhase.CLASS_SELECT;
        const raw = localStorage.getItem("diablo_save");
        if (raw) {
          const save = JSON.parse(raw);
          this._state.player = { ...save.player, skillCooldowns: new Map(Object.entries(save.player.skillCooldowns)) };
          this._state.persistentGold = save.persistentGold;
        }
        this._state.phase = DiabloPhase.INVENTORY;
        this._showInventory();
      });
      csClick("#diablo-cs-character", () => {
        this._phaseBeforeOverlay = DiabloPhase.CLASS_SELECT;
        const raw = localStorage.getItem("diablo_save");
        if (raw) {
          const save = JSON.parse(raw);
          this._state.player = { ...save.player, skillCooldowns: new Map(Object.entries(save.player.skillCooldowns)) };
        }
        this._state.phase = DiabloPhase.INVENTORY;
        this._showCharacterOverview();
      });
    }
  }

  // ──────────────────────────────────────────────────────────────
  //  MAP SELECT SCREEN
  // ──────────────────────────────────────────────────────────────
  private _showMapSelect(): void {
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
      {
        id: DiabloMapId.SUNSCORCH_DESERT,
        icon: "\uD83C\uDFDC\uFE0F",
        name: "Sunscorch Desert",
        desc: "Sun-blasted dunes and ancient ruins half-buried in sand. Scorpions and bandits prey on travelers.",
        difficulty: "\u2B50",
      },
      {
        id: DiabloMapId.EMERALD_GRASSLANDS,
        icon: "\uD83C\uDF3F",
        name: "Emerald Grasslands",
        desc: "Rolling green hills dotted with wildflowers. Raiders and wild beasts roam the open plains.",
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
        id: DiabloMapId.ELVEN_VILLAGE,
        icon: "\u2728",
        name: "Aelindor",
        desc: "A once-peaceful elven settlement, now corrupted by dark magic. Shadows stir between the crystal spires.",
        difficulty: "\u2B50\u2B50",
      },
      {
        id: DiabloMapId.NECROPOLIS_DUNGEON,
        icon: "\uD83D\uDC80",
        name: "Necropolis Depths",
        desc: "The catacombs beneath a fallen fortress. The dead do not rest here.",
        difficulty: "\u2B50\u2B50\u2B50",
      },
      {
        id: DiabloMapId.VOLCANIC_WASTES,
        icon: "\uD83C\uDF0B",
        name: "Volcanic Wastes",
        desc: "A scorched hellscape of molten rivers and ash storms. Demons forged in flame roam the ruins.",
        difficulty: "\u2B50\u2B50\u2B50\u2B50",
      },
      {
        id: DiabloMapId.ABYSSAL_RIFT,
        icon: "\uD83C\uDF0C",
        name: "Abyssal Rift",
        desc: "A tear in reality. Eldritch horrors drift between shattered islands of stone above the void.",
        difficulty: "\u2B50\u2B50\u2B50\u2B50\u2B50",
      },
      {
        id: DiabloMapId.DRAGONS_SANCTUM,
        icon: "\uD83D\uDC09",
        name: "Dragon's Sanctum",
        desc: "The ancient lair of the Elder Dragons. Gold-encrusted caverns echo with primordial fury.",
        difficulty: "\u2B50\u2B50\u2B50\u2B50\u2B50\u2B50",
      },
    ];

    let cardsHtml = "";
    for (const m of maps) {
      cardsHtml += `
        <div class="diablo-map-card" data-map="${m.id}" style="
          width:280px;background:rgba(20,15,10,0.95);border:2px solid #5a4a2a;
          border-radius:12px;padding:30px;cursor:pointer;text-align:center;
          transition:border-color 0.3s,box-shadow 0.3s;
        ">
          <div style="font-size:64px;margin-bottom:12px;">${m.icon}</div>
          <div style="font-size:22px;color:#c8a84e;font-weight:bold;letter-spacing:2px;margin-bottom:12px;">${m.name}</div>
          <p style="color:#aaa;font-size:14px;line-height:1.5;margin-bottom:16px;">${m.desc}</p>
          <div style="font-size:20px;color:${m.isSafe ? '#44ff44' : '#ff8'};">Difficulty: ${m.difficulty}</div>
        </div>`;
    }

    const todOptions: { value: TimeOfDay; label: string; icon: string }[] = [
      { value: TimeOfDay.DAY, label: "DAY", icon: "\u2600\uFE0F" },
      { value: TimeOfDay.DAWN, label: "DAWN", icon: "\uD83C\uDF05" },
      { value: TimeOfDay.DUSK, label: "DUSK", icon: "\uD83C\uDF07" },
      { value: TimeOfDay.NIGHT, label: "NIGHT", icon: "\uD83C\uDF19" },
    ];
    let todHtml = "";
    for (const t of todOptions) {
      const isActive = this._state.timeOfDay === t.value;
      todHtml += `<button class="tod-btn" data-tod="${t.value}" style="
        cursor:pointer;padding:10px 20px;font-size:16px;border-radius:6px;transition:0.2s;
        background:${isActive ? "rgba(60,50,20,0.9)" : "rgba(30,20,10,0.7)"};
        border:2px solid ${isActive ? "#c8a84e" : "#3a3a2a"};
        color:${isActive ? "#ffd700" : "#888"};
        font-family:'Georgia',serif;
      ">${t.icon} ${t.label}</button>`;
    }

    this._menuEl.innerHTML = `
      <div style="
        width:100%;height:100%;background:rgba(0,0,0,0.92);display:flex;flex-direction:column;
        align-items:center;justify-content:center;color:#fff;
      ">
        <h1 style="
          color:#c8a84e;font-size:42px;letter-spacing:4px;margin-bottom:30px;
          text-shadow:0 0 20px rgba(200,168,78,0.5),0 2px 4px rgba(0,0,0,0.8);
          font-family:'Georgia',serif;
        ">SELECT YOUR DESTINATION</h1>
        <div style="font-size:16px;color:${DIFFICULTY_CONFIGS[this._state.difficulty].color};margin-bottom:12px;font-family:'Georgia',serif;">
          ${DIFFICULTY_CONFIGS[this._state.difficulty].icon} ${DIFFICULTY_CONFIGS[this._state.difficulty].label} Difficulty
        </div>
        <div style="display:flex;gap:8px;margin-bottom:20px;">${todHtml}</div>
        <div style="display:flex;gap:20px;flex-wrap:wrap;justify-content:center;max-width:95vw;overflow-y:auto;max-height:60vh;padding:10px;">${cardsHtml}</div>
      </div>`;

    // Wire up time-of-day buttons
    const todBtns = this._menuEl.querySelectorAll(".tod-btn") as NodeListOf<HTMLButtonElement>;
    todBtns.forEach((btn) => {
      btn.addEventListener("click", () => {
        this._state.timeOfDay = btn.getAttribute("data-tod") as TimeOfDay;
        // Update visual state for all buttons
        todBtns.forEach((b) => {
          const isNowActive = b.getAttribute("data-tod") === this._state.timeOfDay;
          b.style.background = isNowActive ? "rgba(60,50,20,0.9)" : "rgba(30,20,10,0.7)";
          b.style.borderColor = isNowActive ? "#c8a84e" : "#3a3a2a";
          b.style.color = isNowActive ? "#ffd700" : "#888";
        });
      });
    });

    const cards = this._menuEl.querySelectorAll(".diablo-map-card") as NodeListOf<HTMLDivElement>;
    cards.forEach((card) => {
      card.addEventListener("mouseenter", () => {
        card.style.borderColor = "#c8a84e";
        card.style.boxShadow = "0 0 20px rgba(200,168,78,0.3)";
      });
      card.addEventListener("mouseleave", () => {
        card.style.borderColor = "#5a4a2a";
        card.style.boxShadow = "none";
      });
      card.addEventListener("click", () => {
        const mapId = card.getAttribute("data-map") as DiabloMapId;
        this._startMap(mapId);
      });
    });
  }

  // ──────────────────────────────────────────────────────────────
  //  START MAP
  // ──────────────────────────────────────────────────────────────
  private _startMap(mapId: DiabloMapId): void {
    this._state.currentMap = mapId;
    this._state.enemies = [];
    this._state.projectiles = [];
    this._state.loot = [];
    this._state.treasureChests = [];
    this._state.aoeEffects = [];
    this._state.floatingTexts = [];
    this._state.particles = [];
    this._state.killCount = 0;
    this._state.totalEnemiesSpawned = 0;
    this._state.spawnTimer = 0;
    this._targetEnemyId = null;
    this._fullmapVisible = false;
    if (this._fullmapCanvas) this._fullmapCanvas.style.display = "none";

    const weathers = [Weather.NORMAL, Weather.FOGGY, Weather.CLEAR, Weather.STORMY];
    this._state.weather = weathers[Math.floor(Math.random() * weathers.length)];

    const mapCfg = MAP_CONFIGS[mapId];
    const gridW = mapCfg.width;
    const gridD = mapCfg.depth;
    this._state.exploredGrid = [];
    for (let x = 0; x < gridW; x++) {
      this._state.exploredGrid[x] = [];
      for (let z = 0; z < gridD; z++) {
        this._state.exploredGrid[x][z] = false;
      }
    }
    this._revealAroundPlayer(0, 0);

    this._state.player.x = 0;
    this._state.player.y = getTerrainHeight(0, 0);
    this._state.player.z = 0;
    this._state.player.hp = this._state.player.maxHp;
    this._state.player.mana = this._state.player.maxMana;

    this._renderer.buildMap(mapId);
    this._renderer.buildPlayer(this._state.player.class);
    this._renderer.applyTimeOfDay(this._state.timeOfDay, mapId);
    this._renderer.applyWeather(this._state.weather);

    if (mapId === DiabloMapId.CAMELOT) {
      // Camelot is a safe hub: no enemies or chests, spawn vendors instead
      this._state.vendors = VENDOR_DEFS.map((vd) => ({
        id: this._genId(),
        type: vd.type,
        name: vd.name,
        x: vd.x,
        z: vd.z,
        inventory: generateVendorInventory(vd.type, this._state.player.level),
        icon: vd.icon,
      }));
      if ((this._renderer as any).syncVendors) {
        (this._renderer as any).syncVendors(
          this._state.vendors.map((v) => ({ x: v.x, z: v.z, type: v.type, name: v.name, icon: v.icon }))
        );
      }
    } else {
      this._state.vendors = [];
      this._spawnInitialEnemies();
      this._spawnInitialChests();
    }

    this._state.phase = DiabloPhase.PLAYING;
    this._menuEl.innerHTML = "";
    this._hud.style.display = "block";
    this._recalculatePlayerStats();

    // Main quest popup on map entry
    if (mapId === DiabloMapId.CAMELOT) {
      this._showQuestPopup(
        "\u2694\uFE0F The Fall of Excalibur",
        CAMELOT_FIRST_VISIT_TEXT.join("<br>"),
        null,
        8000,
      );
    } else {
      const questInfo = EXCALIBUR_QUEST_INFO[mapId];
      if (questInfo) {
        this._showQuestPopup(
          `\u2694\uFE0F ${questInfo.fragment}`,
          questInfo.hint,
          questInfo.lore,
          7000,
        );
      }
    }
  }

  // ──────────────────────────────────────────────────────────────
  //  INVENTORY SCREEN
  // ──────────────────────────────────────────────────────────────
  private _showInventory(): void {
    const p = this._state.player;

    const slotDefs: { key: keyof DiabloEquipment; label: string; gridArea: string }[] = [
      { key: "helmet", label: "Helmet", gridArea: "1/2/2/3" },
      { key: "weapon", label: "Weapon", gridArea: "2/1/3/2" },
      { key: "body", label: "Body", gridArea: "2/2/3/3" },
      { key: "accessory1", label: "Accessory 1", gridArea: "2/3/3/4" },
      { key: "gauntlets", label: "Gauntlets", gridArea: "3/1/4/2" },
      { key: "legs", label: "Legs", gridArea: "3/2/4/3" },
      { key: "accessory2", label: "Accessory 2", gridArea: "3/3/4/4" },
      { key: "feet", label: "Feet", gridArea: "4/2/5/3" },
      { key: "lantern", label: "Lantern [P]", gridArea: "4/3/5/4" },
    ];

    let equipHtml = "";
    for (const sd of slotDefs) {
      const item = p.equipment[sd.key];
      const borderColor = item ? RARITY_CSS[item.rarity] : "#555";
      const content = item
        ? `<div style="font-size:28px;">${item.icon}</div><div style="font-size:10px;color:${RARITY_CSS[item.rarity]};margin-top:4px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:64px;">${item.name}</div>`
        : `<div style="font-size:11px;color:#666;">${sd.label}</div>`;
      equipHtml += `
        <div class="equip-slot" data-equip-key="${sd.key}" style="
          grid-area:${sd.gridArea};width:70px;height:70px;background:rgba(15,10,5,0.9);
          border:2px solid ${borderColor};border-radius:6px;display:flex;flex-direction:column;
          align-items:center;justify-content:center;cursor:pointer;pointer-events:auto;
        ">${content}</div>`;
    }

    let invHtml = "";
    for (let i = 0; i < p.inventory.length; i++) {
      const slot = p.inventory[i];
      const item = slot.item;
      const borderColor = item ? RARITY_CSS[item.rarity] : "#3a3a3a";
      const content = item
        ? `<div style="font-size:24px;">${item.icon}</div>`
        : "";
      invHtml += `
        <div class="inv-slot" data-inv-idx="${i}" style="
          width:60px;height:60px;background:rgba(15,10,5,0.85);border:1px solid ${borderColor};
          border-radius:4px;display:flex;align-items:center;justify-content:center;
          cursor:pointer;pointer-events:auto;position:relative;
        ">${content}</div>`;
    }

    // Player stats
    const stats = this._getEffectiveStats();
    const statsHtml = `
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px;font-size:12px;">
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

    this._menuEl.innerHTML = `
      <div style="
        width:100%;height:100%;background:rgba(0,0,0,0.88);display:flex;flex-direction:column;
        align-items:center;justify-content:center;color:#fff;pointer-events:auto;
      ">
        <h2 style="color:#c8a84e;font-size:32px;letter-spacing:3px;margin-bottom:20px;font-family:'Georgia',serif;">
          INVENTORY
        </h2>
        <div style="display:flex;gap:40px;align-items:flex-start;">
          <!-- Equipment -->
          <div>
            <div style="color:#888;font-size:13px;margin-bottom:8px;text-align:center;">Equipment</div>
            <div style="display:grid;grid-template-columns:70px 70px 70px;grid-template-rows:70px 70px 70px 70px;gap:6px;">
              ${equipHtml}
            </div>
          </div>
          <!-- Inventory Grid -->
          <div>
            <div style="color:#888;font-size:13px;margin-bottom:8px;text-align:center;">Backpack</div>
            <div style="display:grid;grid-template-columns:repeat(8,60px);grid-template-rows:repeat(5,60px);gap:4px;">
              ${invHtml}
            </div>
          </div>
        </div>
        <!-- Bottom bar -->
        <div style="margin-top:20px;display:flex;gap:30px;align-items:center;">
          <div style="font-size:16px;color:#ffd700;">\uD83E\uDE99 ${p.gold}</div>
          <div style="font-size:14px;color:#88ccff;">Materials: ${p.salvageMaterials}</div>
          <div style="background:rgba(20,15,10,0.9);border:1px solid #5a4a2a;border-radius:8px;padding:12px;">
            ${statsHtml}
          </div>
        </div>
        <div style="margin-top:12px;display:flex;gap:16px;align-items:center;">
          <button id="inv-stash-btn" style="
            padding:10px 24px;font-size:15px;letter-spacing:2px;font-weight:bold;
            background:rgba(40,30,15,0.9);border:2px solid #5a4a2a;border-radius:8px;color:#c8a84e;
            cursor:pointer;transition:all 0.2s;font-family:'Georgia',serif;pointer-events:auto;
          ">STASH</button>
          <div style="color:#888;font-size:12px;">Press <span style="display:inline-block;background:rgba(60,50,30,0.8);border:1px solid #888;border-radius:4px;padding:2px 10px;font-family:monospace;color:#fff;">S</span> to open Shared Stash</div>
        </div>
        <div style="margin-top:10px;color:#888;font-size:12px;">Press I or Escape to close</div>
        <!-- Tooltip container -->
        <div id="inv-tooltip" style="
          display:none;position:fixed;z-index:100;background:rgba(10,5,2,0.96);border:2px solid #5a4a2a;
          border-radius:8px;padding:14px;max-width:280px;pointer-events:none;color:#ccc;font-size:13px;
        "></div>
      </div>`;

    // Wire up equipment slot clicks (unequip)
    const equipSlots = this._menuEl.querySelectorAll(".equip-slot") as NodeListOf<HTMLDivElement>;
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
          this._renderer.setPlayerLantern(false);
        }
        this._recalculatePlayerStats();
        this._showInventory();
      });
      el.addEventListener("mouseenter", (ev) => this._showItemTooltip(ev, p.equipment[key]));
      el.addEventListener("mouseleave", () => this._hideItemTooltip());
    });

    // Wire up inventory slot clicks (equip) and right-click (drop)
    const invSlots = this._menuEl.querySelectorAll(".inv-slot") as NodeListOf<HTMLDivElement>;
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
          if (cfg) this._renderer.setPlayerLantern(true, cfg.intensity, cfg.distance, cfg.color);
        }
        this._recalculatePlayerStats();
        this._showInventory();
      });
      el.addEventListener("contextmenu", (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        const item = p.inventory[idx].item;
        if (!item) return;
        p.inventory[idx].item = null;
        const loot: DiabloLoot = {
          id: this._genId(),
          item,
          x: p.x + (Math.random() * 2 - 1),
          y: 0,
          z: p.z + (Math.random() * 2 - 1),
          timer: 0,
        };
        this._state.loot.push(loot);
        this._showInventory();
      });
      el.addEventListener("mouseenter", (ev) => this._showItemTooltip(ev, p.inventory[idx].item));
      el.addEventListener("mouseleave", () => this._hideItemTooltip());
    });

    // Stash button
    const stashBtn = this._menuEl.querySelector("#inv-stash-btn") as HTMLButtonElement | null;
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
        this._showStash();
      });
    }
  }

  private _showItemTooltip(ev: MouseEvent, item: DiabloItem | null): void {
    if (!item) return;
    const tooltip = this._menuEl.querySelector("#inv-tooltip") as HTMLDivElement;
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
        statsLines += `<div style="color:#8f8;">+${stats[k]} ${label}</div>`;
      }
    }

    let legendaryLine = "";
    if (item.legendaryAbility) {
      legendaryLine = `<div style="color:#ff8800;margin-top:6px;font-style:italic;">${item.legendaryAbility}</div>`;
    }
    let setLine = "";
    if ((item as any).setName) {
      setLine = `<div style="color:#44ff44;margin-top:4px;">Set: ${(item as any).setName}</div>`;
    }

    tooltip.innerHTML = `
      <div style="border-bottom:2px solid ${rarityColor};padding-bottom:6px;margin-bottom:6px;">
        <div style="color:${rarityColor};font-size:15px;font-weight:bold;">${item.name}</div>
        <div style="color:${rarityColor};font-size:11px;">${rarityName}</div>
      </div>
      <div style="color:#888;font-size:11px;margin-bottom:4px;">${item.slot || item.type}</div>
      ${statsLines}
      ${legendaryLine}
      ${setLine}
      <div style="color:#666;font-size:11px;margin-top:6px;font-style:italic;">${item.description}</div>
    `;
    tooltip.style.display = "block";
    tooltip.style.left = Math.min(ev.clientX + 16, window.innerWidth - 300) + "px";
    tooltip.style.top = Math.min(ev.clientY + 16, window.innerHeight - 200) + "px";
  }

  private _hideItemTooltip(): void {
    const tooltip = this._menuEl.querySelector("#inv-tooltip") as HTMLDivElement;
    if (tooltip) tooltip.style.display = "none";
  }

  // ──────────────────────────────────────────────────────────────
  //  PAUSE MENU
  // ──────────────────────────────────────────────────────────────
  private _showPauseMenu(): void {
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

    const loadBtnHtml = this._hasSave()
      ? `<button id="diablo-load-btn" style="${loadBtn}">LOAD GAME</button>`
      : "";

    this._menuEl.innerHTML = `
      <div style="
        width:100%;height:100%;background:rgba(0,0,0,0.8);display:flex;flex-direction:column;
        align-items:center;justify-content:center;color:#fff;
      ">
        <h1 style="color:#c8a84e;font-size:48px;letter-spacing:6px;margin-bottom:40px;
          font-family:'Georgia',serif;text-shadow:0 0 20px rgba(200,168,78,0.4);">PAUSED</h1>
        <button id="diablo-resume-btn" style="${btnBase}">RESUME</button>
        <button id="diablo-controls-btn" style="${btnBase}">CONTROLS</button>
        <button id="diablo-inventory-btn" style="${btnBase}">INVENTORY</button>
        <button id="diablo-character-btn" style="${btnBase}">CHARACTER</button>
        <button id="diablo-skilltree-btn" style="${btnBase}">SKILL TREE</button>
        <button id="diablo-skillswap-btn" style="${btnBase}">SWAP SKILLS</button>
        <button id="diablo-stash-btn" style="${btnBase}">STASH</button>
        <button id="diablo-save-btn" style="${saveBtn}">SAVE GAME</button>
        ${loadBtnHtml}
        <button id="diablo-charselect-btn" style="${btnBase}">CHARACTER SELECT</button>
        <button id="diablo-exit-btn" style="${exitBtn}">EXIT</button>
      </div>`;

    // Hover effects for standard buttons
    const stdBtns = this._menuEl.querySelectorAll("#diablo-resume-btn,#diablo-controls-btn,#diablo-inventory-btn,#diablo-character-btn,#diablo-skilltree-btn,#diablo-skillswap-btn,#diablo-stash-btn,#diablo-charselect-btn") as NodeListOf<HTMLButtonElement>;
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
    const saveBtnEl = this._menuEl.querySelector("#diablo-save-btn") as HTMLButtonElement;
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
    const loadBtnEl = this._menuEl.querySelector("#diablo-load-btn") as HTMLButtonElement | null;
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
        this._loadGame();
      });
    }

    // Hover effects for exit button
    const exitBtnEl = this._menuEl.querySelector("#diablo-exit-btn") as HTMLButtonElement;
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

    this._menuEl.querySelector("#diablo-resume-btn")!.addEventListener("click", () => {
      this._state.phase = DiabloPhase.PLAYING;
      this._menuEl.innerHTML = "";
    });
    this._menuEl.querySelector("#diablo-controls-btn")!.addEventListener("click", () => {
      this._phaseBeforeOverlay = DiabloPhase.PAUSED;
      this._showControls();
    });
    this._menuEl.querySelector("#diablo-inventory-btn")!.addEventListener("click", () => {
      this._phaseBeforeOverlay = DiabloPhase.PAUSED;
      this._showInventory();
    });
    this._menuEl.querySelector("#diablo-character-btn")!.addEventListener("click", () => {
      this._phaseBeforeOverlay = DiabloPhase.PAUSED;
      this._showCharacterOverview();
    });
    this._menuEl.querySelector("#diablo-skilltree-btn")!.addEventListener("click", () => {
      this._phaseBeforeOverlay = DiabloPhase.PAUSED;
      this._state.phase = DiabloPhase.INVENTORY;
      this._showSkillTreeScreen();
    });
    this._menuEl.querySelector("#diablo-skillswap-btn")!.addEventListener("click", () => {
      this._phaseBeforeOverlay = DiabloPhase.PAUSED;
      this._state.phase = DiabloPhase.INVENTORY;
      this._showSkillSwapMenu();
    });
    this._menuEl.querySelector("#diablo-stash-btn")!.addEventListener("click", () => {
      this._phaseBeforeOverlay = DiabloPhase.PAUSED;
      this._showStash();
    });
    this._menuEl.querySelector("#diablo-charselect-btn")!.addEventListener("click", () => {
      this._state.phase = DiabloPhase.CLASS_SELECT;
      this._showClassSelect();
    });
    this._menuEl.querySelector("#diablo-save-btn")!.addEventListener("click", () => {
      this._saveGame();
    });
    this._menuEl.querySelector("#diablo-exit-btn")!.addEventListener("click", () => {
      window.dispatchEvent(new CustomEvent("diabloExit"));
    });
  }

  // ──────────────────────────────────────────────────────────────
  //  CONTROLS SCREEN
  // ──────────────────────────────────────────────────────────────
  private _backToMenu(): void {
    if (this._phaseBeforeOverlay === DiabloPhase.CLASS_SELECT) {
      this._state.phase = DiabloPhase.CLASS_SELECT;
      this._showClassSelect();
    } else {
      this._showPauseMenu();
    }
  }

  private _closeOverlay(): void {
    if (this._phaseBeforeOverlay === DiabloPhase.CLASS_SELECT) {
      this._state.phase = DiabloPhase.CLASS_SELECT;
      this._showClassSelect();
    } else {
      this._state.phase = DiabloPhase.PLAYING;
      this._menuEl.innerHTML = "";
    }
  }

  private _showControls(): void {
    const p = this._state.player;

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

    this._menuEl.innerHTML = `
      <div style="
        width:100%;height:100%;background:rgba(0,0,0,0.88);display:flex;flex-direction:column;
        align-items:center;justify-content:center;color:#fff;pointer-events:auto;
      ">
        <div style="
          max-width:700px;width:90%;background:rgba(15,10,5,0.95);border:2px solid #5a4a2a;
          border-radius:12px;padding:30px 40px;max-height:85vh;overflow-y:auto;
        ">
          <h1 style="color:#c8a84e;font-size:36px;letter-spacing:4px;margin:0 0 20px 0;text-align:center;
            font-family:'Georgia',serif;text-shadow:0 0 15px rgba(200,168,78,0.4);">CONTROLS</h1>

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

          ${sectionHeader("INTERFACE")}
          ${row("I", "Open Inventory")}
          ${row("T", "Open Talent Tree")}
          ${row("K", "Swap Skills Menu")}
          ${row("J", "Quest Journal")}
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

    const backBtn = this._menuEl.querySelector("#diablo-controls-back") as HTMLButtonElement;
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
      this._backToMenu();
    });
  }

  // ──────────────────────────────────────────────────────────────
  //  SKILL SWAP MENU
  // ──────────────────────────────────────────────────────────────
  private _showSkillSwapMenu(): void {
    const p = this._state.player;
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
          <div style="font-size:28px;">${def ? def.icon : '—'}</div>
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

      this._menuEl.innerHTML = `
        <div style="
          width:100%;height:100%;background:rgba(0,0,0,0.88);display:flex;flex-direction:column;
          align-items:center;justify-content:center;color:#fff;pointer-events:auto;
        ">
          <div style="
            max-width:600px;width:90%;background:rgba(15,10,5,0.95);border:2px solid #5a4a2a;
            border-radius:12px;padding:30px;max-height:85vh;overflow-y:auto;
          ">
            <h1 style="color:#c8a84e;font-size:32px;letter-spacing:4px;margin:0 0 8px 0;text-align:center;
              font-family:'Georgia',serif;text-shadow:0 0 15px rgba(200,168,78,0.4);">SWAP SKILLS</h1>
            <p style="color:#888;font-size:13px;text-align:center;margin:0 0 20px 0;">
              Click a slot, then click a skill to assign it. Press [K] to close.
            </p>

            <div style="margin-bottom:20px;">
              <div style="color:#c8a84e;font-size:14px;margin-bottom:8px;letter-spacing:2px;">ACTIVE SKILLS</div>
              <div style="display:flex;gap:6px;justify-content:center;">${activeHtml}</div>
            </div>

            <div>
              <div style="color:#c8a84e;font-size:14px;margin-bottom:8px;letter-spacing:2px;">AVAILABLE SKILLS</div>
              <div style="display:flex;flex-direction:column;gap:4px;">${poolHtml}</div>
            </div>

            <div style="text-align:center;margin-top:20px;">
              <button id="diablo-swapskill-back" style="
                width:200px;padding:12px 0;font-size:18px;letter-spacing:3px;font-weight:bold;
                background:rgba(40,30,15,0.9);border:2px solid #5a4a2a;border-radius:8px;color:#c8a84e;
                cursor:pointer;transition:all 0.2s;font-family:'Georgia',serif;pointer-events:auto;
              ">BACK</button>
            </div>
          </div>
        </div>`;

      // Wire active slot clicks
      const slotEls = this._menuEl.querySelectorAll(".swap-active-slot") as NodeListOf<HTMLDivElement>;
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
      const poolEls = this._menuEl.querySelectorAll(".swap-pool-skill") as NodeListOf<HTMLDivElement>;
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
      const backBtn = this._menuEl.querySelector("#diablo-swapskill-back") as HTMLButtonElement;
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
        this._backToMenu();
      });
    };

    render();
  }

  // ──────────────────────────────────────────────────────────────
  //  HELPER: Open nearest chest (F key)
  // ──────────────────────────────────────────────────────────────
  private _openNearestChest(): void {
    const p = this._state.player;
    let nearest: DiabloTreasureChest | null = null;
    let nearestDist = 3;
    for (const chest of this._state.treasureChests) {
      if (chest.opened) continue;
      const d = this._dist(p.x, p.z, chest.x, chest.z);
      if (d < nearestDist) {
        nearestDist = d;
        nearest = chest;
      }
    }
    if (nearest) {
      this._openChest(nearest.id);
    }
  }

  // ──────────────────────────────────────────────────────────────
  //  CHARACTER OVERVIEW SCREEN
  // ──────────────────────────────────────────────────────────────
  private _showCharacterOverview(): void {
    const p = this._state.player;
    const stats = this._getEffectiveStats();

    // Class info
    const classIcons: Record<DiabloClass, string> = {
      [DiabloClass.WARRIOR]: "\u2694\uFE0F",
      [DiabloClass.MAGE]: "\uD83D\uDD2E",
      [DiabloClass.RANGER]: "\uD83C\uDFF9",
    };
    const classColors: Record<DiabloClass, string> = {
      [DiabloClass.WARRIOR]: "#aab",
      [DiabloClass.MAGE]: "#a4f",
      [DiabloClass.RANGER]: "#4c4",
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
    const charTalentBonuses = this._getTalentBonuses();
    const allResistBonus = charTalentBonuses[TalentEffectType.RESISTANCE_ALL] || 0;
    fireResist += allResistBonus;
    iceResist += allResistBonus;
    lightningResist += allResistBonus;
    poisonResist += allResistBonus;

    // Section header helper
    const sectionHeader = (title: string): string =>
      `<div style="font-size:20px;color:#c8a84e;border-bottom:1px solid #5a4a2a;padding-bottom:4px;margin-bottom:10px;margin-top:24px;font-weight:bold;">${title}</div>`;

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
    const sec2 = `
      ${sectionHeader("BASE STATS")}
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px 24px;font-size:14px;">
        <div>STR: <span style="color:${statColor(stats.strength, baseCls.str)};font-weight:bold;">${stats.strength}</span></div>
        <div>DEX: <span style="color:${statColor(stats.dexterity, baseCls.dex)};font-weight:bold;">${stats.dexterity}</span></div>
        <div>INT: <span style="color:${statColor(stats.intelligence, baseCls.int)};font-weight:bold;">${stats.intelligence}</span></div>
        <div>VIT: <span style="color:${statColor(stats.vitality, baseCls.vit)};font-weight:bold;">${stats.vitality}</span></div>
        <div style="color:#aaa;">Armor: <span style="color:#fff;">${stats.armor}</span></div>
        <div style="color:#aaa;">Crit Chance: <span style="color:#ff8;">${(stats.critChance * 100).toFixed(1)}%</span></div>
        <div style="color:#aaa;">Crit Damage: <span style="color:#ff8;">${(stats.critDamage * 100).toFixed(0)}%</span></div>
        <div style="color:#aaa;">Move Speed: <span style="color:#fff;">${stats.moveSpeed.toFixed(1)}</span></div>
        <div style="color:#aaa;">Attack Speed: <span style="color:#fff;">${stats.attackSpeed.toFixed(2)}</span></div>
      </div>`;

    // Section 3: Defensive Stats
    const sec3 = `
      ${sectionHeader("DEFENSIVE STATS")}
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px 24px;font-size:14px;">
        <div style="color:#e44;">HP: <span style="color:#fff;">${Math.floor(p.hp)} / ${p.maxHp}</span></div>
        <div style="color:#48f;">Mana: <span style="color:#fff;">${Math.floor(p.mana)} / ${p.maxMana}</span></div>
        <div style="color:#f84;">Fire Resist: <span style="color:#fff;">${fireResist}</span> <span style="color:#888;font-size:11px;">(${(fireResist / (fireResist + 100) * 100).toFixed(1)}% red.)</span></div>
        <div style="color:#8df;">Ice Resist: <span style="color:#fff;">${iceResist}</span> <span style="color:#888;font-size:11px;">(${(iceResist / (iceResist + 100) * 100).toFixed(1)}% red.)</span></div>
        <div style="color:#ff4;">Lightning Resist: <span style="color:#fff;">${lightningResist}</span> <span style="color:#888;font-size:11px;">(${(lightningResist / (lightningResist + 100) * 100).toFixed(1)}% red.)</span></div>
        <div style="color:#4f4;">Poison Resist: <span style="color:#fff;">${poisonResist}</span> <span style="color:#888;font-size:11px;">(${(poisonResist / (poisonResist + 100) * 100).toFixed(1)}% red.)</span></div>
        <div style="color:#f88;">Life Steal: <span style="color:#fff;">${lifeSteal}%</span></div>
        <div style="color:#8af;">Mana Regen: <span style="color:#fff;">${manaRegen}</span></div>
      </div>`;

    // Section 4: Skill Details
    const weaponDmg = this._getWeaponDamage();
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
        activeSets += `<div style="margin:4px 0;color:#4f4;font-size:14px;"><span style="font-weight:bold;">${sb.setName}</span> (${sb.pieces}pc) — ${sb.bonusDescription}</div>`;
      }
    }
    if (!activeSets) {
      activeSets = `<div style="color:#555;font-size:14px;">No active set bonuses</div>`;
    }
    const sec6 = `${sectionHeader("SET BONUSES ACTIVE")}${activeSets}`;

    this._menuEl.innerHTML = `
      <div style="
        width:100%;height:100%;background:rgba(0,0,0,0.88);display:flex;flex-direction:column;
        align-items:center;justify-content:center;color:#fff;pointer-events:auto;
      ">
        <div style="
          max-width:800px;width:90%;background:rgba(15,10,5,0.95);border:2px solid #5a4a2a;
          border-radius:12px;padding:30px 40px;max-height:85vh;overflow-y:auto;
        ">
          <h1 style="color:#c8a84e;font-size:36px;letter-spacing:4px;margin:0 0 10px 0;text-align:center;
            font-family:'Georgia',serif;text-shadow:0 0 15px rgba(200,168,78,0.4);">CHARACTER OVERVIEW</h1>
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
      </div>`;

    const backBtn = this._menuEl.querySelector("#diablo-char-back") as HTMLButtonElement;
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
      this._backToMenu();
    });

    const stBtn = this._menuEl.querySelector("#diablo-char-skilltree") as HTMLButtonElement;
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
      this._showSkillTreeScreen();
    });
  }

  // ──────────────────────────────────────────────────────────────
  //  GAME OVER SCREEN (kept for potential future use)
  // ──────────────────────────────────────────────────────────────
  // @ts-ignore unused-method kept intentionally
  private _showGameOver(): void {
    this._state.phase = DiabloPhase.GAME_OVER;
    const p = this._state.player;
    this._menuEl.innerHTML = `
      <div style="
        width:100%;height:100%;background:rgba(0,0,0,0.92);display:flex;flex-direction:column;
        align-items:center;justify-content:center;color:#fff;
      ">
        <h1 style="color:#cc2222;font-size:52px;letter-spacing:6px;margin-bottom:30px;
          font-family:'Georgia',serif;text-shadow:0 0 30px rgba(200,30,30,0.6);">YOU HAVE FALLEN</h1>
        <div style="background:rgba(20,10,10,0.9);border:1px solid #5a2a2a;border-radius:10px;padding:24px;margin-bottom:30px;">
          <div style="font-size:16px;margin-bottom:8px;">Kills: <span style="color:#ff8;">${this._state.killCount}</span></div>
          <div style="font-size:16px;margin-bottom:8px;">Gold: <span style="color:#ffd700;">${p.gold}</span></div>
          <div style="font-size:16px;">Level: <span style="color:#8af;">${p.level}</span></div>
        </div>
        <button id="diablo-return-btn" style="
          background:rgba(40,15,15,0.9);border:2px solid #c8a84e;color:#c8a84e;font-size:20px;
          padding:14px 50px;cursor:pointer;border-radius:8px;
          font-family:'Georgia',serif;letter-spacing:2px;pointer-events:auto;
        ">RETURN TO MENU</button>
      </div>`;

    this._menuEl.querySelector("#diablo-return-btn")!.addEventListener("click", () => {
      window.dispatchEvent(new CustomEvent("diabloExit"));
    });
  }

  // ──────────────────────────────────────────────────────────────
  //  VICTORY SCREEN
  // ──────────────────────────────────────────────────────────────
  private _showVictory(): void {
    this._state.phase = DiabloPhase.VICTORY;
    const p = this._state.player;

    // Transfer inventory to persistent stash
    this._state.persistentGold += p.gold;
    this._state.persistentLevel = Math.max(this._state.persistentLevel, p.level);
    this._state.persistentXp = Math.max(this._state.persistentXp, p.xp);
    for (let i = 0; i < p.inventory.length; i++) {
      if (p.inventory[i].item && i < this._state.persistentInventory.length) {
        if (this._state.persistentInventory[i].item === null) {
          this._state.persistentInventory[i].item = p.inventory[i].item;
        }
      }
    }

    const reward = MAP_COMPLETION_REWARDS[this._state.currentMap];
    const rewardHtml = reward ? `
      <div style="font-size:14px;color:#c8a84e;margin-top:8px;font-style:italic;">${reward.bonusMessage}</div>
    ` : "";
    const clearedCount = Object.keys(this._state.completedMaps).length;
    const totalMaps = 8;

    this._menuEl.innerHTML = `
      <div style="
        width:100%;height:100%;background:rgba(0,0,0,0.92);display:flex;flex-direction:column;
        align-items:center;justify-content:center;color:#fff;
      ">
        <h1 style="color:#ffd700;font-size:52px;letter-spacing:6px;margin-bottom:30px;
          font-family:'Georgia',serif;text-shadow:0 0 30px rgba(255,215,0,0.5);">MAP CLEARED!</h1>
        <div style="background:rgba(20,18,10,0.9);border:1px solid #5a4a2a;border-radius:10px;padding:24px;margin-bottom:30px;">
          <div style="font-size:16px;margin-bottom:8px;">Kills: <span style="color:#ff8;">${this._state.killCount}</span></div>
          <div style="font-size:16px;margin-bottom:8px;">Gold: <span style="color:#ffd700;">${p.gold}</span></div>
          <div style="font-size:16px;margin-bottom:8px;">Level: <span style="color:#8af;">${p.level}</span></div>
          <div style="font-size:14px;color:#888;margin-top:8px;">Maps cleared: ${clearedCount}/${totalMaps}</div>
          ${rewardHtml}
        </div>
        <div style="display:flex;gap:16px;">
          <button id="diablo-nextmap-btn" style="
            background:rgba(15,30,15,0.9);border:2px solid #c8a84e;color:#c8a84e;font-size:18px;
            padding:14px 40px;cursor:pointer;border-radius:8px;
            font-family:'Georgia',serif;letter-spacing:2px;pointer-events:auto;
          ">SELECT ANOTHER MAP</button>
          <button id="diablo-exit-btn" style="
            background:rgba(40,15,15,0.9);border:2px solid #a44;color:#e66;font-size:18px;
            padding:14px 40px;cursor:pointer;border-radius:8px;
            font-family:'Georgia',serif;letter-spacing:2px;pointer-events:auto;
          ">EXIT</button>
        </div>
      </div>`;

    this._menuEl.querySelector("#diablo-nextmap-btn")!.addEventListener("click", () => {
      this._showMapSelect();
    });
    this._menuEl.querySelector("#diablo-exit-btn")!.addEventListener("click", () => {
      window.dispatchEvent(new CustomEvent("diabloExit"));
    });
  }

  // ──────────────────────────────────────────────────────────────
  //  BUILD HUD
  // ──────────────────────────────────────────────────────────────
  private _buildHUD(): void {
    this._hud.innerHTML = "";

    // Health orb - bottom left
    const hpOrb = document.createElement("div");
    hpOrb.style.cssText = `
      position:absolute;bottom:30px;left:30px;width:80px;height:80px;border-radius:50%;
      background:rgba(30,5,5,0.85);border:3px solid #8b0000;overflow:hidden;
      display:flex;align-items:center;justify-content:center;
    `;
    this._hpBar = document.createElement("div");
    this._hpBar.style.cssText = `
      position:absolute;bottom:0;left:0;width:100%;height:100%;background:rgba(180,20,20,0.8);
      border-radius:50%;transition:height 0.3s;
    `;
    this._hpText = document.createElement("div");
    this._hpText.style.cssText = `
      position:relative;z-index:1;color:#fff;font-size:12px;font-weight:bold;text-align:center;
      text-shadow:0 1px 3px rgba(0,0,0,0.8);
    `;
    hpOrb.appendChild(this._hpBar);
    hpOrb.appendChild(this._hpText);
    this._hud.appendChild(hpOrb);

    // Mana orb - bottom right
    const mpOrb = document.createElement("div");
    mpOrb.style.cssText = `
      position:absolute;bottom:30px;right:30px;width:80px;height:80px;border-radius:50%;
      background:rgba(5,5,30,0.85);border:3px solid #000088;overflow:hidden;
      display:flex;align-items:center;justify-content:center;
    `;
    this._mpBar = document.createElement("div");
    this._mpBar.style.cssText = `
      position:absolute;bottom:0;left:0;width:100%;height:100%;background:rgba(30,30,200,0.8);
      border-radius:50%;transition:height 0.3s;
    `;
    this._mpText = document.createElement("div");
    this._mpText.style.cssText = `
      position:relative;z-index:1;color:#fff;font-size:12px;font-weight:bold;text-align:center;
      text-shadow:0 1px 3px rgba(0,0,0,0.8);
    `;
    mpOrb.appendChild(this._mpBar);
    mpOrb.appendChild(this._mpText);
    this._hud.appendChild(mpOrb);

    // Skill bar - bottom center
    const skillBar = document.createElement("div");
    skillBar.style.cssText = `
      position:absolute;bottom:20px;left:50%;transform:translateX(-50%);display:flex;gap:6px;
    `;
    this._skillSlots = [];
    this._skillCooldownOverlays = [];
    for (let i = 0; i < 6; i++) {
      const slot = document.createElement("div");
      slot.style.cssText = `
        width:60px;height:60px;background:rgba(15,10,5,0.9);border:2px solid #5a4a2a;
        border-radius:8px;display:flex;flex-direction:column;align-items:center;
        justify-content:center;position:relative;overflow:hidden;
      `;

      const cdOverlay = document.createElement("div");
      cdOverlay.style.cssText = `
        position:absolute;top:0;left:0;width:100%;height:0%;
        background:rgba(0,0,0,0.65);transition:height 0.1s;pointer-events:none;
      `;

      const cdText = document.createElement("div");
      cdText.style.cssText = `
        position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);
        font-size:16px;font-weight:bold;color:#fff;z-index:3;
        text-shadow:0 0 4px #000,0 0 8px #000;pointer-events:none;display:none;
      `;
      cdText.className = "skill-cd-text";

      const keyLabel = document.createElement("div");
      keyLabel.style.cssText = `
        position:absolute;bottom:2px;right:4px;font-size:10px;color:#888;z-index:2;
      `;
      keyLabel.textContent = String(i + 1);

      const iconEl = document.createElement("div");
      iconEl.style.cssText = "font-size:24px;z-index:1;";
      iconEl.className = "skill-icon";

      slot.appendChild(cdOverlay);
      slot.appendChild(iconEl);
      slot.appendChild(cdText);
      slot.appendChild(keyLabel);
      skillBar.appendChild(slot);
      this._skillSlots.push(slot);
      this._skillCooldownOverlays.push(cdOverlay);
    }
    this._hud.appendChild(skillBar);

    // XP bar - very bottom
    const xpContainer = document.createElement("div");
    xpContainer.style.cssText = `
      position:absolute;bottom:0;left:0;width:100%;height:6px;background:rgba(20,15,5,0.8);
    `;
    this._xpBar = document.createElement("div");
    this._xpBar.style.cssText = `
      height:100%;width:0%;background:linear-gradient(90deg,#8b7500,#ffd700);transition:width 0.3s;
    `;
    xpContainer.appendChild(this._xpBar);
    this._hud.appendChild(xpContainer);

    // Top right info
    const topRight = document.createElement("div");
    topRight.style.cssText = `
      position:absolute;top:16px;right:20px;text-align:right;
    `;
    this._goldText = document.createElement("div");
    this._goldText.style.cssText = "font-size:16px;color:#ffd700;margin-bottom:4px;";
    this._levelText = document.createElement("div");
    this._levelText.style.cssText = "font-size:14px;color:#c8a84e;margin-bottom:4px;";
    this._killText = document.createElement("div");
    this._killText.style.cssText = "font-size:13px;color:#aaa;";
    topRight.appendChild(this._goldText);
    topRight.appendChild(this._levelText);
    topRight.appendChild(this._killText);
    this._hud.appendChild(topRight);

    // Minimap canvas — top-left corner
    this._minimapCanvas = document.createElement("canvas");
    this._minimapCanvas.width = 200;
    this._minimapCanvas.height = 200;
    this._minimapCanvas.style.cssText = `
      position:absolute;top:16px;left:16px;width:200px;height:200px;
      border:2px solid #c8a84e;border-radius:4px;background:rgba(0,0,0,0.6);
    `;
    this._minimapCtx = this._minimapCanvas.getContext("2d")!;
    this._hud.appendChild(this._minimapCanvas);

    // Fullscreen map overlay (aece2d8c)
    this._fullmapCanvas = document.createElement("canvas");
    this._fullmapCanvas.width = 400;
    this._fullmapCanvas.height = 400;
    this._fullmapCanvas.style.cssText = `
      position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:400px;height:400px;
      border:3px solid #c8a84e;border-radius:8px;background:rgba(0,0,0,0.85);
      display:none;z-index:5;
    `;
    this._fullmapCtx = this._fullmapCanvas.getContext("2d")!;
    this._hud.appendChild(this._fullmapCanvas);

    // Weather text (aece2d8c)
    this._weatherText = document.createElement("div");
    this._weatherText.style.cssText = `
      position:absolute;top:222px;left:16px;width:200px;text-align:center;
      font-size:11px;color:#aaa;font-family:'Georgia',serif;
    `;
    this._hud.appendChild(this._weatherText);

    // Potion bar (ad1a2850)
    const potionBar = document.createElement("div");
    potionBar.style.cssText = `
      position:absolute;bottom:28px;left:50%;transform:translateX(205px);display:flex;gap:4px;
    `;
    this._potionHudSlots = [];
    const potionLabels = ["F1", "F2", "F3", "F4"];
    for (let i = 0; i < 4; i++) {
      const slot = document.createElement("div");
      slot.style.cssText = `
        width:44px;height:44px;background:rgba(15,10,5,0.9);border:2px solid #3a5a2a;
        border-radius:6px;display:flex;flex-direction:column;align-items:center;
        justify-content:center;position:relative;overflow:hidden;
      `;
      const keyLabel = document.createElement("div");
      keyLabel.style.cssText = `
        position:absolute;bottom:1px;right:3px;font-size:8px;color:#888;z-index:2;
      `;
      keyLabel.textContent = potionLabels[i];
      const iconEl = document.createElement("div");
      iconEl.style.cssText = "font-size:18px;z-index:1;";
      iconEl.className = "potion-icon";
      slot.appendChild(iconEl);
      slot.appendChild(keyLabel);
      potionBar.appendChild(slot);
      this._potionHudSlots.push(slot);
    }
    this._hud.appendChild(potionBar);

    // Quest tracker (a270b216)
    this._questTracker = document.createElement("div");
    this._questTracker.style.cssText = `
      position:absolute;top:16px;right:20px;margin-top:80px;width:220px;
      background:rgba(10,8,4,0.75);border:1px solid #5a4a2a;border-radius:6px;
      padding:8px 10px;font-size:12px;color:#ccc;display:none;
    `;
    this._hud.appendChild(this._questTracker);

    // Vendor interaction hint
    this._vendorHint = document.createElement("div");
    this._vendorHint.style.cssText = `
      position:absolute;bottom:100px;left:50%;transform:translateX(-50%);
      padding:8px 20px;background:rgba(10,8,4,0.85);border:1px solid #5a4a2a;
      border-radius:6px;color:#c8a84e;font-size:14px;font-weight:bold;
      letter-spacing:1px;display:none;white-space:nowrap;
    `;
    this._hud.appendChild(this._vendorHint);

    // Chest interaction hint
    this._chestHint = document.createElement("div");
    this._chestHint.style.cssText = `
      position:absolute;bottom:120px;left:50%;transform:translateX(-50%);
      padding:8px 20px;background:rgba(10,8,4,0.85);border:1px solid #5a4a2a;
      border-radius:6px;color:#ffd700;font-size:14px;font-weight:bold;
      letter-spacing:1px;display:none;white-space:nowrap;
    `;
    this._hud.appendChild(this._chestHint);

    // Quest popup (centered, semi-transparent parchment style)
    this._questPopup = document.createElement("div");
    this._questPopup.style.cssText = `
      position:absolute;top:12%;left:50%;transform:translateX(-50%);
      max-width:550px;width:90%;padding:20px 30px;
      background:linear-gradient(180deg, rgba(35,28,15,0.95) 0%, rgba(25,20,10,0.95) 100%);
      border:2px solid #5a4a2a;border-radius:10px;
      box-shadow:0 0 30px rgba(200,168,78,0.15), inset 0 0 20px rgba(0,0,0,0.3);
      color:#ccbb99;font-family:'Georgia',serif;text-align:center;
      display:none;z-index:5;pointer-events:none;
      transition:opacity 0.8s ease-out;
    `;
    this._hud.appendChild(this._questPopup);

    this._deathOverlay = document.createElement("div");
    this._deathOverlay.style.cssText = `
      position:absolute;top:0;left:0;width:100%;height:100%;
      background:rgba(80,0,0,0.7);display:none;
      flex-direction:column;align-items:center;justify-content:center;
      color:#fff;pointer-events:none;
    `;
    this._deathOverlay.innerHTML = `
      <div style="font-size:48px;font-family:'Georgia',serif;color:#cc2222;
        text-shadow:0 0 30px rgba(200,30,30,0.6);letter-spacing:4px;">YOU HAVE DIED</div>
      <div id="diablo-respawn-timer" style="font-size:20px;color:#c8a84e;margin-top:16px;"></div>
      <div id="diablo-gold-loss" style="font-size:16px;color:#ff8888;margin-top:8px;"></div>
    `;
    this._hud.appendChild(this._deathOverlay);
  }

  // ──────────────────────────────────────────────────────────────
  //  UPDATE HUD
  // ──────────────────────────────────────────────────────────────
  private _updateHUD(): void {
    const p = this._state.player;

    // Health orb
    const hpPct = Math.max(0, p.hp / p.maxHp);
    this._hpBar.style.height = (hpPct * 100) + "%";
    this._hpText.textContent = `${Math.ceil(p.hp)}/${p.maxHp}`;

    // Mana orb
    const mpPct = Math.max(0, p.mana / p.maxMana);
    this._mpBar.style.height = (mpPct * 100) + "%";
    this._mpText.textContent = `${Math.ceil(p.mana)}/${p.maxMana}`;

    // Skill bar
    for (let i = 0; i < 6; i++) {
      const skillId = p.skills[i];
      if (!skillId) continue;
      const def = SKILL_DEFS[skillId];
      if (!def) continue;
      const iconEl = this._skillSlots[i].querySelector(".skill-icon") as HTMLDivElement;
      if (iconEl) iconEl.textContent = def.icon;

      const cd = p.skillCooldowns.get(skillId) || 0;
      const maxCd = def.cooldown;
      const cdTextEl = this._skillSlots[i].querySelector(".skill-cd-text") as HTMLDivElement | null;
      if (cd > 0) {
        const pct = Math.min(100, (cd / maxCd) * 100);
        this._skillCooldownOverlays[i].style.height = pct + "%";
        if (cdTextEl) {
          cdTextEl.style.display = "block";
          cdTextEl.textContent = cd >= 1 ? Math.ceil(cd).toString() : cd.toFixed(1);
        }
      } else {
        this._skillCooldownOverlays[i].style.height = "0%";
        if (cdTextEl) cdTextEl.style.display = "none";
      }
    }

    // XP bar
    const xpPct = p.xpToNext > 0 ? (p.xp / p.xpToNext) * 100 : 0;
    this._xpBar.style.width = Math.min(100, xpPct) + "%";

    // Top right
    this._goldText.textContent = `\uD83E\uDE99 ${p.gold}`;
    this._levelText.textContent = `Lv. ${p.level}`;
    this._killText.textContent = `Kills: ${this._state.killCount}` +
      (this._state.deathCount > 0 ? `  \u2620 Deaths: ${this._state.deathCount}` : "");

    // Potion slots (ad1a2850)
    for (let i = 0; i < 4; i++) {
      const pot = p.potionSlots[i];
      const iconEl = this._potionHudSlots[i].querySelector(".potion-icon") as HTMLDivElement;
      if (iconEl) iconEl.textContent = pot ? pot.icon : "";
      const onCd = p.potionCooldown > 0;
      this._potionHudSlots[i].style.borderColor = onCd ? "#5a2a2a" : "#3a5a2a";
      this._potionHudSlots[i].style.opacity = onCd ? "0.5" : "1";
    }

    // Minimap
    this._updateMinimap();
    if (this._fullmapVisible) {
      this._updateFullmap();
    }

    // Weather text (aece2d8c)
    const weatherLabels: Record<Weather, string> = {
      [Weather.NORMAL]: "",
      [Weather.FOGGY]: "Foggy",
      [Weather.CLEAR]: "Clear Skies",
      [Weather.STORMY]: "Stormy",
    };
    this._weatherText.textContent = weatherLabels[this._state.weather] || "";

    // Quest tracker (a270b216)
    this._updateQuestTracker();

    // Vendor hint (Camelot only)
    if (this._state.currentMap === DiabloMapId.CAMELOT) {
      let nearestVendor: DiabloVendor | null = null;
      let nearestDist = 4;
      for (const v of this._state.vendors) {
        const d = this._dist(p.x, p.z, v.x, v.z);
        if (d < nearestDist) {
          nearestDist = d;
          nearestVendor = v;
        }
      }
      if (nearestVendor) {
        this._vendorHint.style.display = "block";
        const action = nearestVendor.type === VendorType.BLACKSMITH ? "forge/salvage"
          : nearestVendor.type === VendorType.JEWELER ? "reroll stats"
          : "trade";
        this._vendorHint.textContent = `Press [E] to ${action} with ${nearestVendor.name}`;
      } else {
        this._vendorHint.style.display = "none";
      }
    } else {
      this._vendorHint.style.display = "none";
    }

    // Chest proximity hint
    let nearestChest = false;
    for (const chest of this._state.treasureChests) {
      if (chest.opened) continue;
      const d = this._dist(p.x, p.z, chest.x, chest.z);
      if (d < 4) {
        nearestChest = true;
        break;
      }
    }
    if (nearestChest) {
      this._chestHint.style.display = "block";
      this._chestHint.textContent = "Press [F] to open chest";
    } else {
      this._chestHint.style.display = "none";
    }
  }

  // ──────────────────────────────────────────────────────────────
  //  GAME LOOP
  // ──────────────────────────────────────────────────────────────
  private _gameLoop = (ts: number): void => {
    const dt = Math.min((ts - this._lastTime) / 1000, 0.1);
    this._lastTime = ts;

    if (this._state.phase === DiabloPhase.PLAYING) {
      if (this._isDead) {
        this._updateDeathRespawn(dt);
      } else {
        this._processInput(dt);
        this._updatePlayer(dt);
        this._updateEnemies(dt);
        this._updateBossAbilities(dt);
        this._updateCombat(dt);
        this._updateProjectiles(dt);
        this._updateAOE(dt);
        this._updateLoot(dt);
        this._updateSpawning(dt);
        this._updateStatusEffects(dt);
        this._updateFloatingText(dt);
        this._checkMapClear();
        this._revealAroundPlayer(this._state.player.x, this._state.player.z);

        // Quest popup fade
        if (this._questPopupTimer > 0) {
          this._questPopupTimer -= dt * 1000;
          if (this._questPopupTimer <= 1500) {
            this._questPopup.style.opacity = String(Math.max(0, this._questPopupTimer / 1500));
          }
          if (this._questPopupTimer <= 0) {
            this._questPopup.style.display = "none";
            this._questPopupTimer = 0;
          }
        }
      }
      this._updateHUD();
    }

    this._renderer.update(this._state, dt);
    this._rafId = requestAnimationFrame(this._gameLoop);
  };

  // ──────────────────────────────────────────────────────────────
  //  PROCESS INPUT
  // ──────────────────────────────────────────────────────────────
  private _processInput(dt: number): void {
    const p = this._state.player;
    let dx = 0;
    let dz = 0;
    if (this._keys.has("KeyW") || this._keys.has("ArrowUp")) dz -= 1;
    if (this._keys.has("KeyS") || this._keys.has("ArrowDown")) dz += 1;
    if (this._keys.has("KeyA") || this._keys.has("ArrowLeft")) dx -= 1;
    if (this._keys.has("KeyD") || this._keys.has("ArrowRight")) dx += 1;

    // Normalize diagonal
    const len = Math.sqrt(dx * dx + dz * dz);
    if (len > 0) {
      dx /= len;
      dz /= len;
    }

    const speed = p.moveSpeed;
    p.x += dx * speed * dt;
    p.z += dz * speed * dt;

    // Clamp to map bounds
    const mapCfg = MAP_CONFIGS[this._state.currentMap];
    const halfW = mapCfg.width / 2;
    const halfD = ((mapCfg as any).depth || (mapCfg as any).height || mapCfg.width) / 2;
    p.x = Math.max(-halfW, Math.min(halfW, p.x));
    p.z = Math.max(-halfD, Math.min(halfD, p.z));
    p.y = getTerrainHeight(p.x, p.z);

    // Face mouse direction
    const worldMouse = this._getMouseWorldPos();
    p.angle = Math.atan2(worldMouse.x - p.x, worldMouse.z - p.z);

    // Update camera target to follow player
    this._state.camera.targetX = p.x;
    this._state.camera.targetZ = p.z;
    this._state.camera.x += (p.x + Math.sin(this._state.camera.angle) * this._state.camera.distance - this._state.camera.x) * 3 * dt;
    this._state.camera.z += (p.z + Math.cos(this._state.camera.angle) * this._state.camera.distance - this._state.camera.z) * 3 * dt;
  }

  // ──────────────────────────────────────────────────────────────
  //  UPDATE PLAYER
  // ──────────────────────────────────────────────────────────────
  private _updatePlayer(dt: number): void {
    const p = this._state.player;

    // Mana regen
    const manaRegenBase = 1.0 + p.intelligence * 0.05;
    p.mana = Math.min(p.maxMana, p.mana + manaRegenBase * dt);

    // Cooldowns
    for (const [skillId, cd] of p.skillCooldowns) {
      if (cd > 0) {
        p.skillCooldowns.set(skillId, Math.max(0, cd - dt));
      }
    }

    // Attack timer
    if (p.attackTimer > 0) {
      p.attackTimer -= dt;
    }

    // Invuln timer
    if (p.invulnTimer > 0) {
      p.invulnTimer -= dt;
    }

    // Skill anim timer
    if (p.activeSkillAnimTimer > 0) {
      p.activeSkillAnimTimer -= dt;
      if (p.activeSkillAnimTimer <= 0) {
        p.activeSkillId = null;
      }
    }

    // Potion cooldown (ad1a2850)
    if (p.potionCooldown > 0) {
      p.potionCooldown = Math.max(0, p.potionCooldown - dt);
    }
    // Potion buff durations (ad1a2850)
    for (let i = p.activePotionBuffs.length - 1; i >= 0; i--) {
      p.activePotionBuffs[i].remaining -= dt;
      if (p.activePotionBuffs[i].remaining <= 0) {
        p.activePotionBuffs.splice(i, 1);
        this._recalculatePlayerStats();
      }
    }
    // Mana regen from talents (ad1a2850)
    const talentManaRegen = this._getTalentBonuses()[TalentEffectType.MANA_REGEN] || 0;
    if (talentManaRegen > 0) {
      p.mana = Math.min(p.maxMana, p.mana + talentManaRegen * dt);
    }

    // Level up check
    while (p.level < XP_TABLE.length - 1 && p.xp >= p.xpToNext) {
      p.xp -= p.xpToNext;
      p.level++;
      p.xpToNext = p.level < XP_TABLE.length ? XP_TABLE[p.level] : XP_TABLE[XP_TABLE.length - 1] * 1.5;

      // Stat increases
      p.strength += 3;
      p.dexterity += 3;
      p.intelligence += 3;
      p.vitality += 4;
      p.maxHp += Math.floor(p.vitality * 2);
      p.maxMana += Math.floor(p.intelligence * 0.8);
      p.hp = p.maxHp;
      p.mana = p.maxMana;
      p.talentPoints += 1;

      this._addFloatingText(p.x, p.y + 3, p.z, "LEVEL UP!", "#ffd700");
      this._renderer.spawnParticles(ParticleType.LEVEL_UP, p.x, p.y + 0.5, p.z, 20 + Math.floor(Math.random() * 11), this._state.particles);
      this._renderer.shakeCamera(0.2, 0.3);
      this._recalculatePlayerStats();

      // Check for new skill unlocks (every 3 levels)
      const unlockList = UNLOCKABLE_SKILLS[p.class];
      for (const entry of unlockList) {
        if (p.level >= entry.level && !p.unlockedSkills.includes(entry.skillId)) {
          p.unlockedSkills.push(entry.skillId);
          const def = SKILL_DEFS[entry.skillId];
          this._addFloatingText(p.x, p.y + 4, p.z, `NEW SKILL: ${def.name}!`, "#44ffff");
        }
      }
    }

    // Increment global time
    this._state.time += dt;
  }

  // ──────────────────────────────────────────────────────────────
  //  UPDATE ENEMIES (AI STATE MACHINE)
  // ──────────────────────────────────────────────────────────────
  private _updateEnemies(dt: number): void {
    const p = this._state.player;
    const toRemove: string[] = [];

    for (const enemy of this._state.enemies) {
      const dist = this._dist(enemy.x, enemy.z, p.x, p.z);
      const effectiveSpeed = this._getEnemyEffectiveSpeed(enemy);

      // Check for stun
      const isStunned = enemy.statusEffects.some((e) => e.effect === StatusEffect.STUNNED);
      const isFrozen = enemy.statusEffects.some((e) => e.effect === StatusEffect.FROZEN);

      const effectiveAggroRange = this._state.weather === Weather.FOGGY ? enemy.aggroRange * 0.8 : enemy.aggroRange;

      switch (enemy.state) {
        case EnemyState.IDLE: {
          enemy.stateTimer += dt;
          if (dist <= effectiveAggroRange) {
            enemy.state = EnemyState.CHASE;
            enemy.stateTimer = 0;
          } else if (enemy.stateTimer > 3 && Math.random() < 0.02) {
            // Random patrol
            enemy.state = EnemyState.PATROL;
            enemy.stateTimer = 0;
            enemy.patrolTarget = {
              x: enemy.x + (Math.random() * 10 - 5),
              y: 0,
              z: enemy.z + (Math.random() * 10 - 5),
            };
          }
          break;
        }
        case EnemyState.PATROL: {
          if (isStunned || isFrozen) break;
          enemy.stateTimer += dt;
          if (enemy.patrolTarget) {
            const pdist = this._dist(enemy.x, enemy.z, enemy.patrolTarget.x, enemy.patrolTarget.z);
            if (pdist < 1 || enemy.stateTimer > 5) {
              enemy.state = EnemyState.IDLE;
              enemy.stateTimer = 0;
              enemy.patrolTarget = null;
            } else {
              const dx = enemy.patrolTarget.x - enemy.x;
              const dz = enemy.patrolTarget.z - enemy.z;
              const pLen = Math.sqrt(dx * dx + dz * dz);
              if (pLen > 0) {
                enemy.x += (dx / pLen) * effectiveSpeed * 0.5 * dt;
                enemy.z += (dz / pLen) * effectiveSpeed * 0.5 * dt;
                enemy.angle = Math.atan2(dx, dz);
              }
            }
          }
          // Aggro check
          if (dist <= effectiveAggroRange) {
            enemy.state = EnemyState.CHASE;
            enemy.stateTimer = 0;
          }
          break;
        }
        case EnemyState.CHASE: {
          if (isStunned || isFrozen) break;
          const behavior = enemy.behavior || EnemyBehavior.MELEE_BASIC;

          if (behavior === EnemyBehavior.RANGED) {
            const preferredDist = 10;
            const tooClose = 4;
            if (enemy.rangedCooldown === undefined) enemy.rangedCooldown = 0;
            enemy.rangedCooldown = Math.max(0, (enemy.rangedCooldown || 0) - dt);
            if (dist < tooClose) {
              const dx = enemy.x - p.x;
              const dz = enemy.z - p.z;
              const bLen = Math.sqrt(dx * dx + dz * dz);
              if (bLen > 0) { enemy.x += (dx / bLen) * effectiveSpeed * dt; enemy.z += (dz / bLen) * effectiveSpeed * dt; }
              enemy.angle = Math.atan2(p.x - enemy.x, p.z - enemy.z);
            } else if (dist > preferredDist + 2) {
              const dx = p.x - enemy.x; const dz = p.z - enemy.z;
              const cLen = Math.sqrt(dx * dx + dz * dz);
              if (cLen > 0) { enemy.x += (dx / cLen) * effectiveSpeed * dt; enemy.z += (dz / cLen) * effectiveSpeed * dt; }
              enemy.angle = Math.atan2(dx, dz);
            } else {
              enemy.angle = Math.atan2(p.x - enemy.x, p.z - enemy.z);
              if (enemy.rangedCooldown <= 0) { this._enemyFireProjectile(enemy); enemy.rangedCooldown = 2.0; }
            }
            if (!enemy.isBoss && dist > enemy.aggroRange * 1.5) { enemy.state = EnemyState.IDLE; enemy.stateTimer = 0; }
          } else if (behavior === EnemyBehavior.HEALER) {
            let healTarget: DiabloEnemy | null = null;
            let healDist = 8;
            for (const ally of this._state.enemies) {
              if (ally.id === enemy.id) continue;
              if (ally.state === EnemyState.DYING || ally.state === EnemyState.DEAD) continue;
              if (ally.hp >= ally.maxHp) continue;
              const ad = this._dist(enemy.x, enemy.z, ally.x, ally.z);
              if (ad < healDist) { healDist = ad; healTarget = ally; }
            }
            if (healTarget && dist > 3) {
              const dx = healTarget.x - enemy.x; const dz = healTarget.z - enemy.z;
              const hLen = Math.sqrt(dx * dx + dz * dz);
              if (hLen > 2) { enemy.x += (dx / hLen) * effectiveSpeed * 0.8 * dt; enemy.z += (dz / hLen) * effectiveSpeed * 0.8 * dt; }
              enemy.angle = Math.atan2(dx, dz);
              healTarget.hp = Math.min(healTarget.maxHp, healTarget.hp + healTarget.maxHp * 0.05 * dt);
              enemy.healTarget = healTarget.id;
            } else {
              enemy.healTarget = null;
              if (dist <= enemy.attackRange) { enemy.state = EnemyState.ATTACK; enemy.attackTimer = 0.5; enemy.stateTimer = 0; }
              else {
                const dx = p.x - enemy.x; const dz = p.z - enemy.z;
                const cLen = Math.sqrt(dx * dx + dz * dz);
                if (cLen > 0) { enemy.x += (dx / cLen) * effectiveSpeed * dt; enemy.z += (dz / cLen) * effectiveSpeed * dt; }
                enemy.angle = Math.atan2(dx, dz);
              }
            }
            if (!enemy.isBoss && dist > enemy.aggroRange * 1.5) { enemy.state = EnemyState.IDLE; enemy.stateTimer = 0; }
          } else if (behavior === EnemyBehavior.SHIELDED) {
            if (enemy.shieldCooldown === undefined) enemy.shieldCooldown = 5;
            if (enemy.shieldActive === undefined) enemy.shieldActive = false;
            enemy.shieldCooldown = Math.max(0, (enemy.shieldCooldown || 0) - dt);
            if (enemy.shieldActive) {
              enemy.stateTimer += dt;
              if (enemy.stateTimer > 2) { enemy.shieldActive = false; enemy.shieldCooldown = 5; enemy.stateTimer = 0; }
            } else if (enemy.shieldCooldown <= 0) { enemy.shieldActive = true; enemy.stateTimer = 0; }
            if (dist <= enemy.attackRange) { enemy.state = EnemyState.ATTACK; enemy.attackTimer = 0.5; enemy.stateTimer = 0; }
            else if (!enemy.isBoss && dist > enemy.aggroRange * 1.5) { enemy.state = EnemyState.IDLE; enemy.stateTimer = 0; }
            else {
              const dx = p.x - enemy.x; const dz = p.z - enemy.z;
              const cLen = Math.sqrt(dx * dx + dz * dz);
              if (cLen > 0) { enemy.x += (dx / cLen) * effectiveSpeed * dt; enemy.z += (dz / cLen) * effectiveSpeed * dt; }
              enemy.angle = Math.atan2(dx, dz);
            }
          } else if (behavior === EnemyBehavior.FLANKER) {
            if (enemy.flankerAngle === undefined) { enemy.flankerAngle = p.angle + Math.PI * (0.5 + Math.random()); }
            const flankDist = 3;
            const targetX = p.x + Math.sin(enemy.flankerAngle) * flankDist;
            const targetZ = p.z + Math.cos(enemy.flankerAngle) * flankDist;
            const ftDist = this._dist(enemy.x, enemy.z, targetX, targetZ);
            if (ftDist < 1.5 && dist <= enemy.attackRange * 1.5) { enemy.state = EnemyState.ATTACK; enemy.attackTimer = 0.5; enemy.stateTimer = 0; enemy.flankerAngle = undefined; }
            else if (!enemy.isBoss && dist > enemy.aggroRange * 1.5) { enemy.state = EnemyState.IDLE; enemy.stateTimer = 0; enemy.flankerAngle = undefined; }
            else {
              const dx = targetX - enemy.x; const dz = targetZ - enemy.z;
              const fLen = Math.sqrt(dx * dx + dz * dz);
              if (fLen > 0) { enemy.x += (dx / fLen) * effectiveSpeed * 1.1 * dt; enemy.z += (dz / fLen) * effectiveSpeed * 1.1 * dt; }
              enemy.angle = Math.atan2(p.x - enemy.x, p.z - enemy.z);
            }
          } else {
            if (dist <= enemy.attackRange) { enemy.state = EnemyState.ATTACK; enemy.attackTimer = 0.5; enemy.stateTimer = 0; }
            else if (!enemy.isBoss && dist > enemy.aggroRange * 1.5) { enemy.state = EnemyState.IDLE; enemy.stateTimer = 0; }
            else {
              const dx = p.x - enemy.x; const dz = p.z - enemy.z;
              const cLen = Math.sqrt(dx * dx + dz * dz);
              if (cLen > 0) { enemy.x += (dx / cLen) * effectiveSpeed * dt; enemy.z += (dz / cLen) * effectiveSpeed * dt; }
              enemy.angle = Math.atan2(dx, dz);
            }
          }
          break;
        }
        case EnemyState.ATTACK: {
          if (isStunned || isFrozen) break;
          // Face player
          const adx = p.x - enemy.x;
          const adz = p.z - enemy.z;
          enemy.angle = Math.atan2(adx, adz);

          enemy.attackTimer -= dt;
          if (enemy.attackTimer <= 0) {
            if (dist <= enemy.attackRange * 1.2) {
              // Deal damage to player
              if (p.invulnTimer <= 0) {
                let rawDmg = enemy.damage;
                // Check weakened
                const isWeakened = enemy.statusEffects.some((e) => e.effect === StatusEffect.WEAKENED);
                if (isWeakened) rawDmg *= 0.7;

                const mitigated = this._applyPlayerDefenses(rawDmg, enemy.damageType);
                p.hp -= mitigated;
                this._addFloatingText(p.x, p.y + 2, p.z, `-${Math.round(mitigated)}`, "#ff4444");

                if (enemy.isBoss) {
                  this._renderer.shakeCamera(0.25, 0.3);
                }
                this._renderer.spawnParticles(ParticleType.BLOOD, p.x, p.y + 1, p.z, 3 + Math.floor(Math.random() * 3), this._state.particles);

                if (p.hp <= 0) {
                  p.hp = 0;
                  this._triggerDeath();
                  return;
                }
              }
            }
            enemy.attackTimer = 1.5;
            if (dist > enemy.attackRange * 1.5) {
              enemy.state = EnemyState.CHASE;
              enemy.stateTimer = 0;
            }
          }
          break;
        }
        case EnemyState.HURT: {
          enemy.stateTimer += dt;
          if (enemy.stateTimer >= 0.3) {
            enemy.state = EnemyState.CHASE;
            enemy.stateTimer = 0;
          }
          break;
        }
        case EnemyState.DYING: {
          enemy.deathTimer += dt;
          if (enemy.deathTimer >= 1.0) {
            enemy.state = EnemyState.DEAD;
            enemy.deathTimer = 0;
          }
          break;
        }
        case EnemyState.DEAD: {
          enemy.deathTimer += dt;
          if (enemy.deathTimer >= 3.0) {
            toRemove.push(enemy.id);
          }
          break;
        }
      }
    }

    this._state.enemies = this._state.enemies.filter((e) => !toRemove.includes(e.id));
  }

  // ──────────────────────────────────────────────────────────────
  //  UPDATE COMBAT (auto-attack targeted enemy)
  // ──────────────────────────────────────────────────────────────
  private _updateCombat(dt: number): void {
    if (!this._targetEnemyId) return;
    const p = this._state.player;
    const target = this._state.enemies.find((e) => e.id === this._targetEnemyId);
    if (!target || target.state === EnemyState.DYING || target.state === EnemyState.DEAD) {
      this._targetEnemyId = null;
      return;
    }

    const dist = this._dist(p.x, p.z, target.x, target.z);
    const attackRange = 3.0; // base melee range

    if (dist > attackRange) {
      // Move toward target if holding mouse
      if (this._mouseDown) {
        const dx = target.x - p.x;
        const dz = target.z - p.z;
        const len = Math.sqrt(dx * dx + dz * dz);
        if (len > 0) {
          p.x += (dx / len) * p.moveSpeed * dt;
          p.z += (dz / len) * p.moveSpeed * dt;
        }
      }
      return;
    }

    if (p.attackTimer > 0) return;

    // Calculate damage
    let baseDamage = 0;
    const weaponBonus = this._getWeaponDamage();
    switch (p.class) {
      case DiabloClass.WARRIOR:
        baseDamage = p.strength * 1.5 + weaponBonus;
        break;
      case DiabloClass.MAGE:
        baseDamage = p.intelligence * 1.2 + weaponBonus;
        break;
      case DiabloClass.RANGER:
        baseDamage = p.dexterity * 1.3 + weaponBonus;
        break;
    }

    // Check for buff
    const hasBattleCry = p.statusEffects.some((e) => e.source === "BATTLE_CRY");
    if (hasBattleCry) baseDamage *= 1.3;

    // Talent damage bonus (ad1a2850)
    const talentBonuses = this._getTalentBonuses();
    if (talentBonuses[TalentEffectType.BONUS_DAMAGE_PERCENT]) {
      baseDamage *= (1 + talentBonuses[TalentEffectType.BONUS_DAMAGE_PERCENT] / 100);
    }
    for (const buff of p.activePotionBuffs) {
      if (buff.type === PotionType.STRENGTH) baseDamage *= (1 + buff.value / 100);
    }

    // Crit check
    const isCrit = Math.random() < p.critChance;
    if (isCrit) baseDamage *= p.critDamage;

    let finalDamage = Math.max(1, baseDamage - target.armor * 0.2);
    if (target.shieldActive) finalDamage *= 0.2;
    if (target.bossShieldTimer && target.bossShieldTimer > 0) finalDamage *= 0.1;

    target.hp -= finalDamage;

    // Floating text
    if (isCrit) {
      this._addFloatingText(target.x, target.y + 2.5, target.z, `CRIT! ${Math.round(finalDamage)}`, "#ff4444");
      this._renderer.shakeCamera(0.15, 0.2);
    } else {
      this._addFloatingText(target.x, target.y + 2, target.z, `${Math.round(finalDamage)}`, "#ffff44");
    }

    this._spawnHitParticles(target, DamageType.PHYSICAL);

    // Life steal
    const lifeStealPct = this._getLifeSteal();
    if (lifeStealPct > 0) {
      const healed = finalDamage * lifeStealPct / 100;
      p.hp = Math.min(p.maxHp, p.hp + healed);
      if (healed > 1) {
        this._renderer.spawnParticles(ParticleType.HEAL, p.x, p.y + 0.5, p.z, 5 + Math.floor(Math.random() * 4), this._state.particles);
      }
    }

    // Reset attack timer
    p.attackTimer = 1.0 / p.attackSpeed;
    p.isAttacking = true;

    // Check enemy death
    if (target.hp <= 0) {
      target.hp = 0;
      target.state = EnemyState.DYING;
      target.deathTimer = 0;
      const meleeXpMult = this._state.weather === Weather.CLEAR ? 1.1 : 1.0;
      p.xp += Math.floor(target.xpReward * meleeXpMult);
      const goldFromKill = Math.floor(5 + Math.random() * 10 * target.level);
      p.gold += goldFromKill;
      this._goldEarnedTotal += goldFromKill;
      this._state.killCount++;
      this._targetEnemyId = null;

      this._renderer.spawnParticles(ParticleType.DUST, target.x, target.y + 0.5, target.z, 8 + Math.floor(Math.random() * 5), this._state.particles);

      // Roll loot
      const lootItems = this._rollLoot(target);
      for (const item of lootItems) {
        const loot: DiabloLoot = {
          id: this._genId(),
          item,
          x: target.x + (Math.random() * 2 - 1),
          y: 0,
          z: target.z + (Math.random() * 2 - 1),
          timer: 0,
        };
        this._state.loot.push(loot);
      }
    } else {
      // Stagger
      if (!target.isBoss && Math.random() < 0.3) {
        target.state = EnemyState.HURT;
        target.stateTimer = 0;
      }
    }
  }

  // ──────────────────────────────────────────────────────────────
  //  SKILL BRANCH MODIFIERS
  // ──────────────────────────────────────────────────────────────
  private _getSkillBranchModifiers(skillId: SkillId): {
    damageMult: number; cooldownMult: number; manaCostMult: number;
    aoeRadiusMult: number; extraProjectiles: number;
    statusOverride: string | null; bonusEffects: Set<string>;
  } {
    const result = {
      damageMult: 1, cooldownMult: 1, manaCostMult: 1,
      aoeRadiusMult: 1, extraProjectiles: 0,
      statusOverride: null as string | null, bonusEffects: new Set<string>(),
    };
    const branches = this._state.player.skillBranches;
    for (const bd of SKILL_BRANCHES) {
      if (bd.skillId !== skillId) continue;
      const key = `${skillId}_b${bd.tier}`;
      const choice = branches[key];
      if (!choice) continue;
      const opt = choice === 1 ? bd.optionA : bd.optionB;
      if (opt.damageMult) result.damageMult *= opt.damageMult;
      if (opt.cooldownMult) result.cooldownMult *= opt.cooldownMult;
      if (opt.manaCostMult) result.manaCostMult *= opt.manaCostMult;
      if (opt.aoeRadiusMult) result.aoeRadiusMult *= opt.aoeRadiusMult;
      if (opt.extraProjectiles) result.extraProjectiles += opt.extraProjectiles;
      if (opt.statusOverride) result.statusOverride = opt.statusOverride;
      if (opt.bonusEffect) result.bonusEffects.add(opt.bonusEffect);
    }
    return result;
  }

  // ──────────────────────────────────────────────────────────────
  //  ACTIVATE SKILL
  // ──────────────────────────────────────────────────────────────
  private _activateSkill(idx: number): void {
    const p = this._state.player;
    if (idx >= p.skills.length) return;
    const skillId = p.skills[idx];
    const def = SKILL_DEFS[skillId];
    if (!def) return;

    const cd = p.skillCooldowns.get(skillId) || 0;
    if (cd > 0) return;
    const branchMods = this._getSkillBranchModifiers(skillId);
    if (p.mana < Math.ceil(def.manaCost * branchMods.manaCostMult)) return;

    p.mana -= Math.ceil(def.manaCost * branchMods.manaCostMult);
    const talentBonusesCd = this._getTalentBonuses();
    const cdReduction = talentBonusesCd[TalentEffectType.SKILL_COOLDOWN_REDUCTION] || 0;
    const effectiveCooldown = def.cooldown * branchMods.cooldownMult * (1 - cdReduction / 100);
    p.skillCooldowns.set(skillId, effectiveCooldown);
    p.activeSkillId = skillId;
    p.activeSkillAnimTimer = 0.5;

    const worldMouse = this._getMouseWorldPos();
    const angle = Math.atan2(worldMouse.x - p.x, worldMouse.z - p.z);
    const baseDmg = this._getSkillDamage(def);
    const modDmg = baseDmg * branchMods.damageMult;
    const modRadius = (r: number) => r * branchMods.aoeRadiusMult;
    const modStatus = branchMods.statusOverride
      ? branchMods.statusOverride as StatusEffect
      : def.statusEffect;

    switch (skillId) {
      // ── PROJECTILE SKILLS ──
      case SkillId.FIREBALL:
      case SkillId.LIGHTNING_BOLT:
      case SkillId.POISON_ARROW:
      case SkillId.PIERCING_SHOT: {
        this._createProjectile(p.x, p.y + 1, p.z, angle, modDmg, def, skillId);
        // Branch effect: extra projectiles for projectile skills
        if (branchMods.extraProjectiles > 0) {
          for (let i = 1; i <= branchMods.extraProjectiles; i++) {
            const offsetAngle = (i % 2 === 0 ? 1 : -1) * Math.ceil(i / 2) * 0.15;
            this._createProjectile(p.x, p.y + 1, p.z, angle + offsetAngle, modDmg, def, skillId);
          }
        }
        // Branch effect: HEAL_ON_BURN
        if (branchMods.bonusEffects.has('HEAL_ON_BURN')) {
          p.hp = Math.min(p.maxHp, p.hp + Math.round(p.maxHp * 0.10));
          this._addFloatingText(p.x, p.y + 3, p.z, `+${Math.round(p.maxHp * 0.10)} HP`, "#44ff44");
        }
        // Branch effect: GUARANTEED_CRIT
        if (branchMods.bonusEffects.has('GUARANTEED_CRIT')) {
          // Damage already boosted via damageMult; add visual cue
          this._addFloatingText(p.x, p.y + 3, p.z, "CRITICAL!", "#ff4444");
        }
        break;
      }

      case SkillId.MULTI_SHOT: {
        const spread = 0.3;
        const arrowCount = 5 + branchMods.extraProjectiles;
        const half = Math.floor(arrowCount / 2);
        for (let i = -half; i <= half; i++) {
          this._createProjectile(p.x, p.y + 1, p.z, angle + i * spread, modDmg * 0.8, def, skillId);
        }
        break;
      }

      case SkillId.CHAIN_LIGHTNING: {
        // Fires a projectile that, on hit, chains to nearby enemies
        this._createProjectile(p.x, p.y + 1, p.z, angle, modDmg, def, skillId);
        break;
      }

      // ── AOE AT PLAYER ──
      case SkillId.CLEAVE:
      case SkillId.WHIRLWIND:
      case SkillId.ICE_NOVA:
      case SkillId.GROUND_SLAM:
      case SkillId.BLADE_FURY:
      case SkillId.SHIELD_BASH: {
        const radius = modRadius(def.aoeRadius || 3);
        const aoe: DiabloAOE = {
          id: this._genId(),
          x: p.x,
          y: 0,
          z: p.z,
          radius,
          damage: modDmg,
          damageType: def.damageType,
          duration: 0.3,
          timer: 0,
          ownerId: "player",
          tickInterval: 0.3,
          lastTickTimer: 0,
          statusEffect: modStatus,
        };
        this._state.aoeEffects.push(aoe);
        // Immediate damage tick for melee AOE
        this._tickAOEDamage(aoe);
        // Branch effect: LIFE_STEAL_AOE — heal 15% of damage dealt
        if (branchMods.bonusEffects.has('LIFE_STEAL_AOE')) {
          const healAmt = Math.round(modDmg * 0.15);
          p.hp = Math.min(p.maxHp, p.hp + healAmt);
          this._addFloatingText(p.x, p.y + 3, p.z, `+${healAmt} HP`, "#44ff44");
        }
        // Branch effect: GUARANTEED_CRIT — multiply by crit damage
        if (branchMods.bonusEffects.has('GUARANTEED_CRIT')) {
          this._addFloatingText(p.x, p.y + 3, p.z, "CRITICAL!", "#ff4444");
        }
        // Branch effect: EXECUTE_LOW_HP
        if (branchMods.bonusEffects.has('EXECUTE_LOW_HP')) {
          this._addFloatingText(p.x, p.y + 3.5, p.z, "EXECUTE!", "#ff2222");
        }
        break;
      }

      // ── AOE AT TARGET ──
      case SkillId.METEOR: {
        const radius = modRadius(def.aoeRadius || 6);
        const aoe: DiabloAOE = {
          id: this._genId(),
          x: worldMouse.x,
          y: 0,
          z: worldMouse.z,
          radius,
          damage: modDmg,
          damageType: def.damageType,
          duration: 1.5,
          timer: 0,
          ownerId: "player",
          tickInterval: 0.5,
          lastTickTimer: 0,
          statusEffect: modStatus,
        };
        this._state.aoeEffects.push(aoe);
        break;
      }

      case SkillId.RAIN_OF_ARROWS: {
        const radius = modRadius(def.aoeRadius || 6);
        const aoe: DiabloAOE = {
          id: this._genId(),
          x: worldMouse.x,
          y: 0,
          z: worldMouse.z,
          radius,
          damage: modDmg,
          damageType: def.damageType,
          duration: 2.0,
          timer: 0,
          ownerId: "player",
          tickInterval: 0.4,
          lastTickTimer: 0,
          statusEffect: modStatus,
        };
        this._state.aoeEffects.push(aoe);
        break;
      }

      case SkillId.EXPLOSIVE_TRAP: {
        const radius = modRadius(def.aoeRadius || 4);
        const trapStatus = modStatus || StatusEffect.BURNING;
        const aoe: DiabloAOE = {
          id: this._genId(),
          x: worldMouse.x,
          y: 0,
          z: worldMouse.z,
          radius,
          damage: modDmg,
          damageType: def.damageType,
          duration: 10.0, // trap lasts 10 seconds
          timer: 0,
          ownerId: "player",
          tickInterval: 10.0, // only triggers once
          lastTickTimer: 0,
          statusEffect: trapStatus,
        };
        this._state.aoeEffects.push(aoe);
        break;
      }

      // ── BUFFS ──
      case SkillId.BATTLE_CRY: {
        p.statusEffects.push({
          effect: StatusEffect.STUNNED, // Placeholder effect type; source is what matters
          duration: 10,
          source: "BATTLE_CRY",
        });
        this._addFloatingText(p.x, p.y + 3, p.z, "BATTLE CRY!", "#ffd700");
        // Branch effect: BUFF_ATTACK_SPEED
        if (branchMods.bonusEffects.has('BUFF_ATTACK_SPEED')) {
          p.attackSpeed *= 1.3;
          this._addFloatingText(p.x, p.y + 3.5, p.z, "Attack Speed UP!", "#88ff88");
        }
        // Branch effect: DEBUFF_ENEMIES
        if (branchMods.bonusEffects.has('DEBUFF_ENEMIES')) {
          this._addFloatingText(p.x, p.y + 3.5, p.z, "Enemies Weakened!", "#ff8844");
        }
        // Branch effect: HEAL_ON_CRY
        if (branchMods.bonusEffects.has('HEAL_ON_CRY')) {
          const healAmt = Math.round(p.maxHp * 0.10);
          p.hp = Math.min(p.maxHp, p.hp + healAmt);
          this._addFloatingText(p.x, p.y + 4, p.z, `+${healAmt} HP`, "#44ff44");
        }
        // Branch effect: BERSERKER_MODE
        if (branchMods.bonusEffects.has('BERSERKER_MODE')) {
          this._addFloatingText(p.x, p.y + 4, p.z, "BERSERKER!", "#ff2222");
        }
        break;
      }

      case SkillId.ARCANE_SHIELD: {
        p.invulnTimer = 8;
        this._addFloatingText(p.x, p.y + 3, p.z, "ARCANE SHIELD!", "#aa44ff");
        break;
      }

      case SkillId.EVASIVE_ROLL: {
        // Dash forward, brief invuln
        const dashDist = 6;
        p.x += Math.sin(angle) * dashDist;
        p.z += Math.cos(angle) * dashDist;
        p.invulnTimer = 0.8;
        this._addFloatingText(p.x, p.y + 2, p.z, "DODGE!", "#44ff44");
        break;
      }

      // ── WARRIOR UNLOCKABLE SKILLS ──
      case SkillId.LEAP: {
        // Leap to target location, AOE on landing
        const leapDist = Math.min(12, Math.sqrt((worldMouse.x - p.x) ** 2 + (worldMouse.z - p.z) ** 2));
        p.x += Math.sin(angle) * leapDist;
        p.z += Math.cos(angle) * leapDist;
        p.invulnTimer = 0.5;
        const radius = modRadius(def.aoeRadius || 4);
        const aoe: DiabloAOE = {
          id: this._genId(), x: p.x, y: 0, z: p.z, radius,
          damage: modDmg, damageType: def.damageType, duration: 0.3, timer: 0,
          ownerId: "player", tickInterval: 0.3, lastTickTimer: 0, statusEffect: modStatus,
        };
        this._state.aoeEffects.push(aoe);
        this._tickAOEDamage(aoe);
        this._addFloatingText(p.x, p.y + 3, p.z, "LEAP!", "#ffd700");
        this._renderer.spawnParticles(ParticleType.DUST, p.x, 0, p.z, 10, this._state.particles);
        // Clamp to map bounds
        const mapLeap = MAP_CONFIGS[this._state.currentMap];
        p.x = Math.max(-mapLeap.width / 2, Math.min(mapLeap.width / 2, p.x));
        p.z = Math.max(-((mapLeap as any).depth || mapLeap.width) / 2, Math.min(((mapLeap as any).depth || mapLeap.width) / 2, p.z));
        break;
      }

      case SkillId.IRON_SKIN: {
        p.statusEffects.push({ effect: StatusEffect.STUNNED, duration: 8, source: "IRON_SKIN" });
        this._addFloatingText(p.x, p.y + 3, p.z, "IRON SKIN!", "#aaaaff");
        // Temporary armor boost handled via source check in damage calc
        break;
      }

      case SkillId.TAUNT: {
        const tauntRadius = modRadius(def.aoeRadius || 8);
        for (const enemy of this._state.enemies) {
          const d = this._dist(p.x, p.z, enemy.x, enemy.z);
          if (d < tauntRadius && enemy.state !== EnemyState.DEAD && enemy.state !== EnemyState.DYING) {
            enemy.state = EnemyState.CHASE;
            enemy.targetId = "player";
          }
        }
        this._addFloatingText(p.x, p.y + 3, p.z, "TAUNT!", "#ff8844");
        break;
      }

      case SkillId.CRUSHING_BLOW: {
        // Single target melee — use AOE with tiny radius
        const cbRadius = modRadius(2.5);
        const cbAoe: DiabloAOE = {
          id: this._genId(), x: p.x + Math.sin(angle) * 2, y: 0, z: p.z + Math.cos(angle) * 2,
          radius: cbRadius, damage: modDmg, damageType: def.damageType, duration: 0.2, timer: 0,
          ownerId: "player", tickInterval: 0.2, lastTickTimer: 0, statusEffect: modStatus,
        };
        this._state.aoeEffects.push(cbAoe);
        this._tickAOEDamage(cbAoe);
        this._addFloatingText(p.x, p.y + 3, p.z, "CRUSH!", "#ff4444");
        break;
      }

      case SkillId.INTIMIDATING_ROAR:
      case SkillId.EARTHQUAKE:
      case SkillId.FROST_BARRIER:
      case SkillId.MANA_SIPHON:
      case SkillId.TIME_WARP:
      case SkillId.NET_TRAP: {
        // AOE centered on player (or target for NET_TRAP)
        const aoeCenterX = skillId === SkillId.NET_TRAP ? worldMouse.x : p.x;
        const aoeCenterZ = skillId === SkillId.NET_TRAP ? worldMouse.z : p.z;
        const aoeR = modRadius(def.aoeRadius || 6);
        const bigAoe: DiabloAOE = {
          id: this._genId(), x: aoeCenterX, y: 0, z: aoeCenterZ, radius: aoeR,
          damage: modDmg, damageType: def.damageType,
          duration: def.duration || 1.0, timer: 0,
          ownerId: "player", tickInterval: 0.5, lastTickTimer: 0, statusEffect: modStatus,
        };
        this._state.aoeEffects.push(bigAoe);
        this._tickAOEDamage(bigAoe);
        const labels: Partial<Record<SkillId, string>> = {
          [SkillId.INTIMIDATING_ROAR]: "ROAR!",
          [SkillId.EARTHQUAKE]: "EARTHQUAKE!",
          [SkillId.FROST_BARRIER]: "FROST BARRIER!",
          [SkillId.MANA_SIPHON]: "SIPHON!",
          [SkillId.TIME_WARP]: "TIME WARP!",
          [SkillId.NET_TRAP]: "TRAPPED!",
        };
        this._addFloatingText(p.x, p.y + 3, p.z, labels[skillId] || "!", "#44ffff");
        // Mana Siphon: restore mana
        if (skillId === SkillId.MANA_SIPHON) {
          const manaGain = Math.round(p.maxMana * 0.25);
          p.mana = Math.min(p.maxMana, p.mana + manaGain);
          const hpGain = Math.round(p.maxHp * 0.10);
          p.hp = Math.min(p.maxHp, p.hp + hpGain);
          this._addFloatingText(p.x, p.y + 3.5, p.z, `+${manaGain} Mana +${hpGain} HP`, "#4488ff");
        }
        if (skillId === SkillId.EARTHQUAKE) {
          this._renderer.shakeCamera(0.5, 0.8);
          this._renderer.spawnParticles(ParticleType.DUST, p.x, 0, p.z, 20, this._state.particles);
        }
        break;
      }

      // ── MAGE UNLOCKABLE SKILLS ──
      case SkillId.SUMMON_ELEMENTAL: {
        // Spawn a temporary allied "elemental" enemy that fights for the player
        // Implemented as a series of AOE ticks around a projected point
        const summonX = p.x + Math.sin(angle) * 3;
        const summonZ = p.z + Math.cos(angle) * 3;
        const elemAoe: DiabloAOE = {
          id: this._genId(), x: summonX, y: 0, z: summonZ,
          radius: modRadius(3), damage: modDmg,
          damageType: def.damageType, duration: 15, timer: 0,
          ownerId: "player", tickInterval: 1.5, lastTickTimer: 0,
          statusEffect: modStatus || StatusEffect.BURNING,
        };
        this._state.aoeEffects.push(elemAoe);
        this._addFloatingText(summonX, 2, summonZ, "ELEMENTAL!", "#ff8844");
        this._renderer.spawnParticles(ParticleType.FIRE, summonX, 0.5, summonZ, 12, this._state.particles);
        break;
      }

      case SkillId.BLINK: {
        // Teleport to target location
        const blinkDist = Math.min(15, Math.sqrt((worldMouse.x - p.x) ** 2 + (worldMouse.z - p.z) ** 2));
        // Damage at departure point
        if (modDmg > 0) {
          const departAoe: DiabloAOE = {
            id: this._genId(), x: p.x, y: 0, z: p.z,
            radius: modRadius(def.aoeRadius || 2), damage: modDmg,
            damageType: DamageType.ARCANE, duration: 0.3, timer: 0,
            ownerId: "player", tickInterval: 0.3, lastTickTimer: 0,
          };
          this._state.aoeEffects.push(departAoe);
          this._tickAOEDamage(departAoe);
        }
        this._renderer.spawnParticles(ParticleType.SPARK, p.x, 1, p.z, 8, this._state.particles);
        p.x += Math.sin(angle) * blinkDist;
        p.z += Math.cos(angle) * blinkDist;
        p.invulnTimer = 0.3;
        // Clamp to map bounds
        const mapBlink = MAP_CONFIGS[this._state.currentMap];
        p.x = Math.max(-mapBlink.width / 2, Math.min(mapBlink.width / 2, p.x));
        p.z = Math.max(-((mapBlink as any).depth || mapBlink.width) / 2, Math.min(((mapBlink as any).depth || mapBlink.width) / 2, p.z));
        this._renderer.spawnParticles(ParticleType.SPARK, p.x, 1, p.z, 8, this._state.particles);
        this._addFloatingText(p.x, p.y + 3, p.z, "BLINK!", "#aa44ff");
        break;
      }

      case SkillId.ARCANE_MISSILES: {
        // Fire multiple projectiles in a spread
        const missileCount = 5 + branchMods.extraProjectiles;
        const spread = 0.2;
        const half = Math.floor(missileCount / 2);
        for (let i = -half; i <= half; i++) {
          if (missileCount % 2 === 0 && i === 0) continue;
          this._createProjectile(p.x, p.y + 1, p.z, angle + i * spread, modDmg * 0.6, def, skillId);
        }
        this._addFloatingText(p.x, p.y + 3, p.z, "ARCANE MISSILES!", "#aa44ff");
        break;
      }

      // ── RANGER UNLOCKABLE SKILLS ──
      case SkillId.GRAPPLING_HOOK: {
        // Dash to target location
        const hookDist = Math.min(15, Math.sqrt((worldMouse.x - p.x) ** 2 + (worldMouse.z - p.z) ** 2));
        p.x += Math.sin(angle) * hookDist;
        p.z += Math.cos(angle) * hookDist;
        p.invulnTimer = 0.3;
        // Clamp to map bounds
        const mapHook = MAP_CONFIGS[this._state.currentMap];
        p.x = Math.max(-mapHook.width / 2, Math.min(mapHook.width / 2, p.x));
        p.z = Math.max(-((mapHook as any).depth || mapHook.width) / 2, Math.min(((mapHook as any).depth || mapHook.width) / 2, p.z));
        // Damage on arrival
        if (modDmg > 0) {
          const hookAoe: DiabloAOE = {
            id: this._genId(), x: p.x, y: 0, z: p.z,
            radius: 2, damage: modDmg,
            damageType: def.damageType, duration: 0.2, timer: 0,
            ownerId: "player", tickInterval: 0.2, lastTickTimer: 0,
          };
          this._state.aoeEffects.push(hookAoe);
          this._tickAOEDamage(hookAoe);
        }
        this._addFloatingText(p.x, p.y + 2, p.z, "HOOK!", "#88ff44");
        break;
      }

      case SkillId.CAMOUFLAGE: {
        p.invulnTimer = 5;
        p.statusEffects.push({ effect: StatusEffect.STUNNED, duration: 5, source: "CAMOUFLAGE" });
        // Drop aggro from all enemies
        for (const enemy of this._state.enemies) {
          if (enemy.state === EnemyState.CHASE) {
            enemy.state = EnemyState.IDLE;
            enemy.stateTimer = 0;
          }
        }
        this._addFloatingText(p.x, p.y + 3, p.z, "CAMOUFLAGE!", "#44aa44");
        break;
      }

      case SkillId.FIRE_VOLLEY: {
        const arrowCount = 7 + branchMods.extraProjectiles;
        const fvSpread = 0.25;
        const fvHalf = Math.floor(arrowCount / 2);
        for (let i = -fvHalf; i <= fvHalf; i++) {
          this._createProjectile(p.x, p.y + 1, p.z, angle + i * fvSpread, modDmg * 0.7, def, skillId);
        }
        this._addFloatingText(p.x, p.y + 3, p.z, "FIRE VOLLEY!", "#ff6622");
        break;
      }

      case SkillId.WIND_WALK: {
        p.statusEffects.push({ effect: StatusEffect.STUNNED, duration: 5, source: "WIND_WALK" });
        p.moveSpeed *= 1.8;
        p.invulnTimer = 0.5;
        this._addFloatingText(p.x, p.y + 3, p.z, "WIND WALK!", "#88ffff");
        break;
      }

      case SkillId.SHADOW_STRIKE: {
        // Find nearest enemy and teleport behind them
        let nearestEnemy: DiabloEnemy | null = null;
        let nearestDist = 12;
        for (const enemy of this._state.enemies) {
          if (enemy.state === EnemyState.DEAD || enemy.state === EnemyState.DYING) continue;
          const d = this._dist(p.x, p.z, enemy.x, enemy.z);
          if (d < nearestDist) {
            nearestDist = d;
            nearestEnemy = enemy;
          }
        }
        if (nearestEnemy) {
          const behindAngle = Math.atan2(p.x - nearestEnemy.x, p.z - nearestEnemy.z);
          p.x = nearestEnemy.x + Math.sin(behindAngle) * 1.5;
          p.z = nearestEnemy.z + Math.cos(behindAngle) * 1.5;
          // Deal damage
          const ssAoe: DiabloAOE = {
            id: this._genId(), x: nearestEnemy.x, y: 0, z: nearestEnemy.z,
            radius: modRadius(2), damage: modDmg,
            damageType: def.damageType, duration: 0.2, timer: 0,
            ownerId: "player", tickInterval: 0.2, lastTickTimer: 0,
          };
          this._state.aoeEffects.push(ssAoe);
          this._tickAOEDamage(ssAoe);
          this._addFloatingText(nearestEnemy.x, 3, nearestEnemy.z, "BACKSTAB!", "#ff44ff");
          this._renderer.spawnParticles(ParticleType.SPARK, nearestEnemy.x, 1, nearestEnemy.z, 8, this._state.particles);
        } else {
          this._addFloatingText(p.x, p.y + 2, p.z, "No target!", "#ff4444");
          // Refund mana
          p.mana = Math.min(p.maxMana, p.mana + Math.ceil(def.manaCost * branchMods.manaCostMult));
          p.skillCooldowns.set(skillId, 0);
        }
        break;
      }
    }
  }

  // ──────────────────────────────────────────────────────────────
  //  UPDATE PROJECTILES
  // ──────────────────────────────────────────────────────────────
  private _updateProjectiles(dt: number): void {
    const toRemove: string[] = [];

    for (const proj of this._state.projectiles) {
      proj.x += proj.vx * dt;
      proj.y += proj.vy * dt;
      proj.z += proj.vz * dt;
      proj.lifetime += dt;

      if (proj.lifetime > proj.maxLifetime) {
        toRemove.push(proj.id);
        continue;
      }

      // Bounds check
      const mapCfg = MAP_CONFIGS[this._state.currentMap];
      const halfW = mapCfg.width / 2 + 10;
      if (Math.abs(proj.x) > halfW || Math.abs(proj.z) > halfW) {
        toRemove.push(proj.id);
        continue;
      }

      if (proj.isPlayerOwned) {
        let hitCount = 0;
        for (const enemy of this._state.enemies) {
          if (enemy.state === EnemyState.DYING || enemy.state === EnemyState.DEAD) continue;
          const dist = this._dist(proj.x, proj.z, enemy.x, enemy.z);
          if (dist < proj.radius + 0.5) {
            // Hit
            let finalDmg = Math.max(1, proj.damage - enemy.armor * 0.15);
            if (enemy.shieldActive) finalDmg *= 0.2;
            if (enemy.bossShieldTimer && enemy.bossShieldTimer > 0) finalDmg *= 0.1;
            enemy.hp -= finalDmg;
            this._addFloatingText(enemy.x, enemy.y + 2, enemy.z, `${Math.round(finalDmg)}`, "#ffff44");

            this._spawnHitParticles(enemy, proj.damageType);
            this._renderer.shakeCamera(0.08, 0.1);

            // Apply status effect if applicable
            const def = proj.skillId ? SKILL_DEFS[proj.skillId] : null;
            if (def && def.statusEffect) {
              enemy.statusEffects.push({
                effect: def.statusEffect,
                duration: 3,
                source: proj.skillId || "projectile",
              });
            }

            // Chain lightning bounce
            if (proj.skillId === SkillId.CHAIN_LIGHTNING) {
              this._chainLightningBounce(enemy, proj.damage * 0.7, 4);
            }

            if (enemy.hp <= 0) {
              this._killEnemy(enemy);
            } else if (!enemy.isBoss && Math.random() < 0.2) {
              enemy.state = EnemyState.HURT;
              enemy.stateTimer = 0;
            }

            hitCount++;
            // Piercing shot can hit up to 5
            if (proj.skillId === SkillId.PIERCING_SHOT) {
              if (hitCount >= 5) {
                toRemove.push(proj.id);
                break;
              }
            } else {
              toRemove.push(proj.id);
              break;
            }
          }
        }
      } else {
        const pp = this._state.player;
        if (pp.invulnTimer <= 0) {
          const dist = this._dist(proj.x, proj.z, pp.x, pp.z);
          if (dist < proj.radius + 0.5) {
            const mitigated = Math.max(1, proj.damage - pp.armor * 0.3);
            pp.hp -= mitigated;
            this._addFloatingText(pp.x, pp.y + 2, pp.z, `-${Math.round(mitigated)}`, "#ff4444");
            toRemove.push(proj.id);
            if (pp.hp <= 0) {
              pp.hp = 0;
              this._triggerDeath();
              break;
            }
          }
        }
      }
    }

    this._state.projectiles = this._state.projectiles.filter((p) => !toRemove.includes(p.id));
  }

  // ──────────────────────────────────────────────────────────────
  //  UPDATE AOE
  // ──────────────────────────────────────────────────────────────
  private _updateAOE(dt: number): void {
    const toRemove: string[] = [];

    for (const aoe of this._state.aoeEffects) {
      aoe.timer += dt;
      aoe.lastTickTimer += dt;

      if (aoe.lastTickTimer >= aoe.tickInterval) {
        this._tickAOEDamage(aoe);
        aoe.lastTickTimer = 0;
      }

      // Explosive trap proximity trigger
      if (aoe.tickInterval >= 10) {
        for (const enemy of this._state.enemies) {
          if (enemy.state === EnemyState.DYING || enemy.state === EnemyState.DEAD) continue;
          const dist = this._dist(aoe.x, aoe.z, enemy.x, enemy.z);
          if (dist < aoe.radius) {
            this._tickAOEDamage(aoe);
            aoe.timer = aoe.duration; // Force removal
            break;
          }
        }
      }

      if (aoe.timer >= aoe.duration) {
        toRemove.push(aoe.id);
      }
    }

    this._state.aoeEffects = this._state.aoeEffects.filter((a) => !toRemove.includes(a.id));
  }

  private _tickAOEDamage(aoe: DiabloAOE): void {
    if (aoe.ownerId === "player") {
      for (const enemy of this._state.enemies) {
        if (enemy.state === EnemyState.DYING || enemy.state === EnemyState.DEAD) continue;
        const dist = this._dist(aoe.x, aoe.z, enemy.x, enemy.z);
        if (dist <= aoe.radius) {
          const finalDmg = Math.max(1, aoe.damage - enemy.armor * 0.15);
          enemy.hp -= finalDmg;
          this._addFloatingText(enemy.x, enemy.y + 2, enemy.z, `${Math.round(finalDmg)}`, "#ff8844");

          this._spawnHitParticles(enemy, aoe.damageType);
          this._renderer.shakeCamera(0.1, 0.15);

          if (aoe.statusEffect) {
            const existing = enemy.statusEffects.find((e) => e.effect === aoe.statusEffect);
            if (existing) {
              existing.duration = Math.max(existing.duration, 3);
            } else {
              enemy.statusEffects.push({
                effect: aoe.statusEffect,
                duration: 3,
                source: "aoe",
              });
            }
          }

          if (enemy.hp <= 0) {
            this._killEnemy(enemy);
          }
        }
      }
    } else {
      const pp = this._state.player;
      if (pp.invulnTimer <= 0) {
        const dist = this._dist(aoe.x, aoe.z, pp.x, pp.z);
        if (dist <= aoe.radius) {
          const mitigated = Math.max(1, aoe.damage - pp.armor * 0.3);
          pp.hp -= mitigated;
          this._addFloatingText(pp.x, pp.y + 2, pp.z, `-${Math.round(mitigated)}`, "#ff4444");
          if (pp.hp <= 0) { pp.hp = 0; this._triggerDeath(); }
        }
      }
    }
  }

  // ──────────────────────────────────────────────────────────────
  //  UPDATE LOOT
  // ──────────────────────────────────────────────────────────────
  private _updateLoot(dt: number): void {
    const p = this._state.player;
    const toRemove: string[] = [];

    for (const loot of this._state.loot) {
      loot.timer += dt;

      // Auto-pickup within 2 units
      const dist = this._dist(p.x, p.z, loot.x, loot.z);
      if (dist < 2) {
        const emptyIdx = p.inventory.findIndex((s) => s.item === null);
        if (emptyIdx >= 0) {
          p.inventory[emptyIdx].item = { ...loot.item, id: this._genId() };
          this._addFloatingText(p.x, p.y + 2.5, p.z, `+${loot.item.name}`, RARITY_CSS[loot.item.rarity]);
          toRemove.push(loot.id);
        }
      }

      // Expire after 60 seconds
      if (loot.timer > 60) {
        toRemove.push(loot.id);
      }
    }

    this._state.loot = this._state.loot.filter((l) => !toRemove.includes(l.id));
  }

  // ──────────────────────────────────────────────────────────────
  //  UPDATE SPAWNING
  // ──────────────────────────────────────────────────────────────
  private _updateSpawning(dt: number): void {
    if (this._state.currentMap === DiabloMapId.CAMELOT) return;

    const mapCfg = MAP_CONFIGS[this._state.currentMap];
    const spawnInterval = (mapCfg as any).spawnInterval || 4;

    this._state.spawnTimer += dt;
    const effectiveMaxEnemies = Math.round(mapCfg.maxEnemies * DIFFICULTY_CONFIGS[this._state.difficulty].maxEnemiesMult);
    if (this._state.spawnTimer >= spawnInterval && this._state.enemies.length < effectiveMaxEnemies) {
      this._spawnEnemy();
      this._state.spawnTimer = 0;
    }
  }

  // ──────────────────────────────────────────────────────────────
  //  UPDATE STATUS EFFECTS
  // ──────────────────────────────────────────────────────────────
  private _updateStatusEffects(dt: number): void {
    const p = this._state.player;

    // Player effects
    for (let i = p.statusEffects.length - 1; i >= 0; i--) {
      const eff = p.statusEffects[i];
      eff.duration -= dt;

      switch (eff.effect) {
        case StatusEffect.BURNING:
          p.hp -= 5 * dt;
          if (p.hp <= 0) { p.hp = 0; this._triggerDeath(); return; }
          break;
        case StatusEffect.POISONED:
          p.hp -= 3 * dt;
          if (p.hp <= 0) { p.hp = 0; this._triggerDeath(); return; }
          break;
        case StatusEffect.BLEEDING:
          p.hp -= 4 * dt;
          if (p.hp <= 0) { p.hp = 0; this._triggerDeath(); return; }
          break;
        case StatusEffect.FROZEN:
          p.moveSpeed = 0;
          break;
        case StatusEffect.SLOWED:
          // Handled in movement calc below
          break;
      }

      if (eff.duration <= 0) {
        p.statusEffects.splice(i, 1);
      }
    }

    // Restore speed if no longer frozen
    if (!p.statusEffects.some((e) => e.effect === StatusEffect.FROZEN)) {
      this._recalculatePlayerStats();
    }

    // Enemy effects
    for (const enemy of this._state.enemies) {
      if (enemy.state === EnemyState.DYING || enemy.state === EnemyState.DEAD) continue;
      for (let i = enemy.statusEffects.length - 1; i >= 0; i--) {
        const eff = enemy.statusEffects[i];
        eff.duration -= dt;

        switch (eff.effect) {
          case StatusEffect.BURNING:
            enemy.hp -= 5 * dt;
            break;
          case StatusEffect.POISONED:
            enemy.hp -= 3 * dt;
            break;
          case StatusEffect.BLEEDING:
            enemy.hp -= 4 * dt;
            break;
        }

        if (enemy.hp <= 0) {
          this._killEnemy(enemy);
        }

        if (eff.duration <= 0) {
          enemy.statusEffects.splice(i, 1);
        }
      }
    }
  }

  // ──────────────────────────────────────────────────────────────
  //  UPDATE FLOATING TEXT
  // ──────────────────────────────────────────────────────────────
  private _updateFloatingText(dt: number): void {
    for (let i = this._state.floatingTexts.length - 1; i >= 0; i--) {
      const ft = this._state.floatingTexts[i];
      ft.timer += dt;
      ft.y += 2 * dt;
      if (ft.timer > 1.5) {
        this._state.floatingTexts.splice(i, 1);
      }
    }
  }

  // ──────────────────────────────────────────────────────────────
  //  CHECK MAP CLEAR
  // ──────────────────────────────────────────────────────────────
  private _checkMapClear(): void {
    if (this._state.phase !== DiabloPhase.PLAYING) return;
    if (this._state.currentMap === DiabloMapId.CAMELOT) return;
    const target = MAP_KILL_TARGET[this._state.currentMap] || 50;
    if (this._state.killCount >= target) {
      const aliveEnemies = this._state.enemies.filter(
        (e) => e.state !== EnemyState.DYING && e.state !== EnemyState.DEAD
      );
      if (aliveEnemies.length === 0) {
        this._onMapComplete();
        this._showVictory();
      }
    }
  }

  // ──────────────────────────────────────────────────────────────
  //  ROLL LOOT
  // ──────────────────────────────────────────────────────────────
  private _rollLoot(enemy: DiabloEnemy): DiabloItem[] {
    const items: DiabloItem[] = [];
    const table = LOOT_TABLES[enemy.type];
    if (!table) return items;

    for (const entry of table) {
      if (Math.random() < entry.chance) {
        const item = this._pickRandomItemOfRarity(entry.rarity);
        if (item) {
          items.push({ ...item, id: this._genId() });
        }
      }
    }

    // Boss guaranteed rare+ drop
    if (enemy.isBoss && items.length === 0) {
      const rareItems = ITEM_DATABASE.filter(
        (it) => it.rarity === ItemRarity.RARE || it.rarity === ItemRarity.EPIC || it.rarity === ItemRarity.LEGENDARY
      );
      if (rareItems.length > 0) {
        const pick = rareItems[Math.floor(Math.random() * rareItems.length)];
        items.push({ ...pick, id: this._genId() });
      }
    }

    return items;
  }

  private _pickRandomItemOfRarity(rarity: ItemRarity): DiabloItem | null {
    const pool = ITEM_DATABASE.filter((it) => it.rarity === rarity);
    if (pool.length === 0) return null;
    return pool[Math.floor(Math.random() * pool.length)];
  }

  // ──────────────────────────────────────────────────────────────
  //  SPAWN ENEMY
  // ──────────────────────────────────────────────────────────────
  private _spawnEnemy(): void {
    const p = this._state.player;
    const mapCfg = MAP_CONFIGS[this._state.currentMap];
    const weights = ENEMY_SPAWN_WEIGHTS[this._state.currentMap];
    if (!weights || weights.length === 0) return;

    // Pick enemy type from weighted table
    const totalWeight = weights.reduce((s, w) => s + w.weight, 0);
    let roll = Math.random() * totalWeight;
    let chosenType = weights[0].type;
    for (const w of weights) {
      roll -= w.weight;
      if (roll <= 0) {
        chosenType = w.type;
        break;
      }
    }

    // Night boss re-spawn check (once per 10 kills at night)
    if (this._state.timeOfDay === TimeOfDay.NIGHT && this._state.killCount > 0 && this._state.killCount % 10 === 0) {
      this._spawnNightBoss();
    }

    // Boss spawn every 20 kills
    let isBossSpawn = false;
    if (this._state.killCount > 0 && this._state.killCount % 20 === 0 && this._state.totalEnemiesSpawned > 0) {
      const existingBoss = this._state.enemies.find((e) => e.isBoss && e.state !== EnemyState.DEAD && e.state !== EnemyState.DYING);
      if (!existingBoss) {
        isBossSpawn = true;
      }
    }

    const def = ENEMY_DEFS[chosenType];
    if (!def) return;

    // Random position 20-40 units from player, within map bounds
    const angle = Math.random() * Math.PI * 2;
    const dist = 20 + Math.random() * 20;
    const halfW = mapCfg.width / 2 - 2;
    const halfD = ((mapCfg as any).depth || (mapCfg as any).height || mapCfg.width) / 2 - 2;

    let ex = p.x + Math.cos(angle) * dist;
    let ez = p.z + Math.sin(angle) * dist;
    ex = Math.max(-halfW, Math.min(halfW, ex));
    ez = Math.max(-halfD, Math.min(halfD, ez));

    const diffCfg = DIFFICULTY_CONFIGS[this._state.difficulty];
    const hpMult = (isBossSpawn ? 5 : 1) * diffCfg.hpMult;
    const dmgMult = (isBossSpawn ? 2 : 1) * diffCfg.damageMult;
    const armorMult = (isBossSpawn ? 1.5 : 1) * diffCfg.armorMult;
    const bossNames = BOSS_NAMES[this._state.currentMap] || ["Dark Champion"];
    const bossName = bossNames[Math.floor(Math.random() * bossNames.length)];

    const enemy: DiabloEnemy = {
      id: this._genId(),
      type: chosenType,
      x: ex,
      y: 0,
      z: ez,
      angle: Math.random() * Math.PI * 2,
      hp: def.hp * hpMult,
      maxHp: def.hp * hpMult,
      damage: def.damage * dmgMult,
      armor: def.armor * armorMult,
      speed: def.speed * diffCfg.speedMult,
      state: EnemyState.IDLE,
      targetId: null,
      attackTimer: 1.0,
      attackRange: def.attackRange,
      aggroRange: def.aggroRange * (isBossSpawn ? 1.3 : 1),
      xpReward: Math.round(def.xpReward * (isBossSpawn ? 5 : 1) * diffCfg.xpMult),
      lootTable: [],
      deathTimer: 0,
      stateTimer: 0,
      patrolTarget: null,
      statusEffects: [],
      isBoss: isBossSpawn || def.isBoss,
      bossName: isBossSpawn ? bossName : undefined,
      scale: def.scale * (isBossSpawn ? 1.8 : 1),
      level: def.level + (isBossSpawn ? 5 : 0),
      damageType: ENEMY_DAMAGE_TYPES[chosenType] || DamageType.PHYSICAL,
      behavior: def.behavior,
    };

    this._state.enemies.push(enemy);
    this._state.totalEnemiesSpawned++;
  }

  // ──────────────────────────────────────────────────────────────
  //  HELPER: Kill enemy
  // ──────────────────────────────────────────────────────────────
  private _killEnemy(enemy: DiabloEnemy): void {
    if (enemy.state === EnemyState.DYING || enemy.state === EnemyState.DEAD) return;
    enemy.hp = 0;
    enemy.state = EnemyState.DYING;
    enemy.deathTimer = 0;

    this._renderer.spawnParticles(ParticleType.DUST, enemy.x, enemy.y + 0.5, enemy.z, 8 + Math.floor(Math.random() * 5), this._state.particles);

    const p = this._state.player;
    const xpMult = this._state.weather === Weather.CLEAR ? 1.1 : 1.0;
    p.xp += Math.floor(enemy.xpReward * xpMult);
    const goldEarned = Math.floor((5 + Math.random() * 10 * enemy.level) * DIFFICULTY_CONFIGS[this._state.difficulty].goldMult);
    p.gold += goldEarned;
    this._goldEarnedTotal += goldEarned;
    this._state.killCount++;

    // Roll loot
    const lootItems = this._rollLoot(enemy);
    for (const item of lootItems) {
      const loot: DiabloLoot = {
        id: this._genId(),
        item,
        x: enemy.x + (Math.random() * 2 - 1),
        y: 0,
        z: enemy.z + (Math.random() * 2 - 1),
        timer: 0,
      };
      this._state.loot.push(loot);
    }

    // 5% chance to drop a potion
    if (Math.random() < 0.05) {
      const pot = POTION_DATABASE[Math.floor(Math.random() * POTION_DATABASE.length)];
      const droppedPotion: DiabloPotion = { ...pot, id: this._genId() };
      p.potions.push(droppedPotion);
      this._addFloatingText(enemy.x, enemy.y + 2, enemy.z, `+${pot.name}`, "#44ff44");
    }

    this._updateQuestProgress(QuestType.KILL_COUNT, this._state.currentMap);
    this._updateQuestProgress(QuestType.KILL_SPECIFIC, enemy.type);
    if (enemy.isBoss) {
      this._updateQuestProgress(QuestType.BOSS_KILL, this._state.currentMap);
      if ((enemy.type as string).startsWith("NIGHT_")) {
        this._updateQuestProgress(QuestType.NIGHT_BOSS, undefined);
      }
    }
    this._updateQuestProgress(QuestType.COLLECT_GOLD, undefined);
  }

  // ──────────────────────────────────────────────────────────────
  //  HELPER: Create projectile
  // ──────────────────────────────────────────────────────────────
  private _createProjectile(
    x: number, y: number, z: number,
    angle: number, damage: number,
    def: any, skillId: SkillId
  ): void {
    const speed = 20;
    const proj: DiabloProjectile = {
      id: this._genId(),
      x, y, z,
      vx: Math.sin(angle) * speed,
      vy: 0,
      vz: Math.cos(angle) * speed,
      speed,
      damage,
      damageType: def.damageType,
      radius: 0.3,
      ownerId: "player",
      isPlayerOwned: true,
      lifetime: 0,
      maxLifetime: 3.0,
      skillId,
    };
    this._state.projectiles.push(proj);
  }

  // ──────────────────────────────────────────────────────────────
  //  HELPER: Chain lightning bounce
  // ──────────────────────────────────────────────────────────────
  private _chainLightningBounce(fromEnemy: DiabloEnemy, damage: number, bouncesLeft: number): void {
    if (bouncesLeft <= 0) return;

    let nearest: DiabloEnemy | null = null;
    let nearestDist = 10;
    for (const enemy of this._state.enemies) {
      if (enemy.id === fromEnemy.id) continue;
      if (enemy.state === EnemyState.DYING || enemy.state === EnemyState.DEAD) continue;
      const d = this._dist(fromEnemy.x, fromEnemy.z, enemy.x, enemy.z);
      if (d < nearestDist) {
        nearestDist = d;
        nearest = enemy;
      }
    }

    if (nearest) {
      const finalDmg = Math.max(1, damage - nearest.armor * 0.1);
      nearest.hp -= finalDmg;
      this._addFloatingText(nearest.x, nearest.y + 2, nearest.z, `${Math.round(finalDmg)}`, "#8888ff");

      if (nearest.hp <= 0) {
        this._killEnemy(nearest);
      }

      // Apply shocked
      nearest.statusEffects.push({
        effect: StatusEffect.SHOCKED,
        duration: 2,
        source: "chain_lightning",
      });

      this._chainLightningBounce(nearest, damage * 0.7, bouncesLeft - 1);
    }
  }

  // ──────────────────────────────────────────────────────────────
  //  HELPER: Open chest
  // ──────────────────────────────────────────────────────────────
  private _openChest(chestId: string): void {
    const chest = this._state.treasureChests.find((c) => c.id === chestId);
    if (!chest || chest.opened) return;

    const p = this._state.player;
    const dist = this._dist(p.x, p.z, chest.x, chest.z);
    if (dist > 3) return;

    chest.opened = true;
    for (const item of chest.items) {
      const loot: DiabloLoot = {
        id: this._genId(),
        item: { ...item, id: this._genId() },
        x: chest.x + (Math.random() * 3 - 1.5),
        y: 0,
        z: chest.z + (Math.random() * 3 - 1.5),
        timer: 0,
      };
      this._state.loot.push(loot);
    }

    // Gold bonus
    const goldBonus = Math.floor(20 + Math.random() * 50);
    p.gold += goldBonus;
    this._goldEarnedTotal += goldBonus;
    this._addFloatingText(chest.x, 2, chest.z, `+${goldBonus} Gold`, "#ffd700");

    this._chestsOpened++;
    this._updateQuestProgress(QuestType.TREASURE_HUNT, undefined);
    this._updateQuestProgress(QuestType.COLLECT_GOLD, undefined);
  }

  // ──────────────────────────────────────────────────────────────
  //  HELPER: Pickup loot manually
  // ──────────────────────────────────────────────────────────────
  private _pickupLoot(lootId: string): void {
    const lootIdx = this._state.loot.findIndex((l) => l.id === lootId);
    if (lootIdx < 0) return;
    const loot = this._state.loot[lootIdx];

    const p = this._state.player;
    const dist = this._dist(p.x, p.z, loot.x, loot.z);
    if (dist > 4) return;

    const emptyIdx = p.inventory.findIndex((s) => s.item === null);
    if (emptyIdx < 0) {
      this._addFloatingText(p.x, p.y + 2, p.z, "Inventory Full!", "#ff4444");
      return;
    }

    p.inventory[emptyIdx].item = { ...loot.item, id: this._genId() };
    this._addFloatingText(p.x, p.y + 2.5, p.z, `+${loot.item.name}`, RARITY_CSS[loot.item.rarity]);
    this._renderer.spawnParticles(ParticleType.GOLD, loot.x, loot.y + 0.5, loot.z, 4 + Math.floor(Math.random() * 3), this._state.particles);
    this._state.loot.splice(lootIdx, 1);
  }

  // ──────────────────────────────────────────────────────────────
  //  HELPER: Generate chest loot
  // ──────────────────────────────────────────────────────────────
  private _generateChestLoot(rarity: ItemRarity): DiabloItem[] {
    const items: DiabloItem[] = [];
    const count = rarity === ItemRarity.EPIC ? 3 : rarity === ItemRarity.RARE ? 2 : 1;
    for (let i = 0; i < count; i++) {
      const item = this._pickRandomItemOfRarity(rarity);
      if (item) items.push({ ...item, id: this._genId() });
    }
    // Always add a common item too
    const common = this._pickRandomItemOfRarity(ItemRarity.COMMON);
    if (common) items.push({ ...common, id: this._genId() });
    return items;
  }

  // ──────────────────────────────────────────────────────────────
  //  HELPER: Dodge roll (space bar)
  // ──────────────────────────────────────────────────────────────
  private _doDodgeRoll(): void {
    const p = this._state.player;
    if (p.invulnTimer > 0) return;
    const worldMouse = this._getMouseWorldPos();
    const angle = Math.atan2(worldMouse.x - p.x, worldMouse.z - p.z);
    p.x += Math.sin(angle) * 4;
    p.z += Math.cos(angle) * 4;
    p.invulnTimer = 0.4;

    // Clamp to map bounds
    const mapCfg = MAP_CONFIGS[this._state.currentMap];
    const halfW = mapCfg.width / 2;
    const halfD = ((mapCfg as any).depth || (mapCfg as any).height || mapCfg.width) / 2;
    p.x = Math.max(-halfW, Math.min(halfW, p.x));
    p.z = Math.max(-halfD, Math.min(halfD, p.z));
  }

  // ──────────────────────────────────────────────────────────────
  //  HELPER: Add floating text
  // ──────────────────────────────────────────────────────────────
  private _addFloatingText(x: number, y: number, z: number, text: string, color: string): void {
    this._state.floatingTexts.push({
      id: this._genId(),
      text,
      x,
      y,
      z,
      color,
      timer: 0,
      vy: 2,
    });
  }

  private _questPopupTimer: number = 0;

  private _showQuestPopup(title: string, body: string, lore: string | null, duration: number): void {
    const loreHtml = lore
      ? `<div style="margin-top:10px;font-size:12px;color:#887755;font-style:italic;line-height:1.5;">${lore}</div>`
      : "";
    this._questPopup.innerHTML = `
      <div style="font-size:11px;color:#665533;letter-spacing:3px;margin-bottom:6px;">THE FALL OF EXCALIBUR</div>
      <div style="font-size:20px;color:#ffd700;font-weight:bold;margin-bottom:10px;text-shadow:0 0 8px rgba(255,215,0,0.3);">${title}</div>
      <div style="font-size:14px;color:#ccbb99;line-height:1.7;">${body}</div>
      ${loreHtml}
    `;
    this._questPopup.style.display = "block";
    this._questPopup.style.opacity = "1";
    this._questPopupTimer = duration;
  }

  // ──────────────────────────────────────────────────────────────
  //  HELPER: Distance
  // ──────────────────────────────────────────────────────────────
  private _dist(x1: number, z1: number, x2: number, z2: number): number {
    return Math.hypot(x2 - x1, z2 - z1);
  }

  // ──────────────────────────────────────────────────────────────
  //  HELPER: Generate ID
  // ──────────────────────────────────────────────────────────────
  private _genId(): string {
    return "d" + (this._nextId++);
  }

  // ──────────────────────────────────────────────────────────────
  //  HELPER: Recalculate player stats
  // ──────────────────────────────────────────────────────────────
  private _recalculatePlayerStats(): void {
    const p = this._state.player;
    const base = createDefaultPlayer(p.class);

    // Scale base stats by level
    const lvlBonus = (p.level - 1) * 3;
    p.strength = base.strength + lvlBonus;
    p.dexterity = base.dexterity + lvlBonus;
    p.intelligence = base.intelligence + lvlBonus;
    p.vitality = base.vitality + (p.level - 1) * 4;
    p.armor = base.armor;
    p.moveSpeed = base.moveSpeed;
    p.attackSpeed = base.attackSpeed;
    p.critChance = base.critChance;
    p.critDamage = base.critDamage;
    p.maxHp = base.maxHp + (p.level - 1) * Math.floor(p.vitality * 2);
    p.maxMana = base.maxMana + (p.level - 1) * Math.floor(p.intelligence * 0.8);

    // Apply equipment stats
    const equipKeys: (keyof DiabloEquipment)[] = [
      "helmet", "body", "gauntlets", "legs", "feet", "accessory1", "accessory2", "weapon", "lantern",
    ];
    const equippedNames: string[] = [];

    for (const key of equipKeys) {
      const item = p.equipment[key];
      if (!item) continue;
      equippedNames.push(item.name);
      const stats = item.stats as any;
      if (stats.strength) p.strength += stats.strength;
      if (stats.dexterity) p.dexterity += stats.dexterity;
      if (stats.intelligence) p.intelligence += stats.intelligence;
      if (stats.vitality) p.vitality += stats.vitality;
      if (stats.armor) p.armor += stats.armor;
      if (stats.critChance) p.critChance += stats.critChance / 100;
      if (stats.critDamage) p.critDamage += stats.critDamage / 100;
      if (stats.attackSpeed) p.attackSpeed += stats.attackSpeed / 100;
      if (stats.moveSpeed || stats.speed) p.moveSpeed += (stats.moveSpeed || stats.speed || 0);
      if (stats.bonusHealth) p.maxHp += stats.bonusHealth;
      if (stats.bonusMana) p.maxMana += stats.bonusMana;
    }

    // Check set bonuses
    for (const setBonus of SET_BONUSES) {
      const setItemNames = (setBonus as any).itemNames as string[] | undefined;
      if (!setItemNames) continue;
      const requiredPieces = (setBonus as any).requiredPieces || 2;
      const matchCount = setItemNames.filter((n) => equippedNames.includes(n)).length;
      if (matchCount >= requiredPieces) {
        const bs = setBonus.bonusStats as any;
        if (bs.strength) p.strength += bs.strength;
        if (bs.dexterity) p.dexterity += bs.dexterity;
        if (bs.intelligence) p.intelligence += bs.intelligence;
        if (bs.vitality) p.vitality += bs.vitality;
        if (bs.armor) p.armor += bs.armor;
        if (bs.critChance) p.critChance += bs.critChance / 100;
        if (bs.critDamage) p.critDamage += bs.critDamage / 100;
        if (bs.attackSpeed) p.attackSpeed += bs.attackSpeed / 100;
        if (bs.moveSpeed) p.moveSpeed += bs.moveSpeed;
        if (bs.manaRegen) { /* applied in update */ }
        if (bs.bonusDamage) { /* applied in damage calc */ }
        if (bs.lifeSteal) { /* applied in damage calc */ }
      }
    }

    // Apply talent effects
    const talentBonuses = this._getTalentBonuses();
    if (talentBonuses[TalentEffectType.BONUS_HP_PERCENT]) {
      p.maxHp = Math.floor(p.maxHp * (1 + talentBonuses[TalentEffectType.BONUS_HP_PERCENT] / 100));
    }
    if (talentBonuses[TalentEffectType.BONUS_MANA_PERCENT]) {
      p.maxMana = Math.floor(p.maxMana * (1 + talentBonuses[TalentEffectType.BONUS_MANA_PERCENT] / 100));
    }
    if (talentBonuses[TalentEffectType.BONUS_ARMOR]) {
      p.armor += talentBonuses[TalentEffectType.BONUS_ARMOR];
    }
    if (talentBonuses[TalentEffectType.BONUS_CRIT_CHANCE]) {
      p.critChance += talentBonuses[TalentEffectType.BONUS_CRIT_CHANCE] / 100;
    }
    if (talentBonuses[TalentEffectType.BONUS_CRIT_DAMAGE]) {
      p.critDamage += talentBonuses[TalentEffectType.BONUS_CRIT_DAMAGE] / 100;
    }
    if (talentBonuses[TalentEffectType.BONUS_ATTACK_SPEED]) {
      p.attackSpeed += talentBonuses[TalentEffectType.BONUS_ATTACK_SPEED] / 100;
    }
    if (talentBonuses[TalentEffectType.BONUS_MOVE_SPEED]) {
      p.moveSpeed += talentBonuses[TalentEffectType.BONUS_MOVE_SPEED];
    }

    // Apply potion buffs
    for (const buff of p.activePotionBuffs) {
      if (buff.type === PotionType.SPEED) {
        p.moveSpeed *= (1 + buff.value / 100);
      }
    }

    // Make sure hp/mana don't exceed new max
    p.hp = Math.min(p.hp, p.maxHp);
    p.mana = Math.min(p.mana, p.maxMana);

    // Apply frozen override if applicable
    if (p.statusEffects.some((e) => e.effect === StatusEffect.FROZEN)) {
      p.moveSpeed = 0;
    }
    // Apply slowed
    if (p.statusEffects.some((e) => e.effect === StatusEffect.SLOWED)) {
      p.moveSpeed *= 0.5;
    }
  }

  // ──────────────────────────────────────────────────────────────
  //  HELPER: Get effective stats (for display)
  // ──────────────────────────────────────────────────────────────
  private _getEffectiveStats(): {
    strength: number; dexterity: number; intelligence: number;
    vitality: number; armor: number; critChance: number;
    moveSpeed: number; attackSpeed: number; critDamage: number;
  } {
    const p = this._state.player;
    return {
      strength: p.strength,
      dexterity: p.dexterity,
      intelligence: p.intelligence,
      vitality: p.vitality,
      armor: p.armor,
      critChance: p.critChance,
      moveSpeed: p.moveSpeed,
      attackSpeed: p.attackSpeed,
      critDamage: p.critDamage,
    };
  }

  // ──────────────────────────────────────────────────────────────
  //  HELPER: Get weapon damage bonus
  // ──────────────────────────────────────────────────────────────
  private _getWeaponDamage(): number {
    const weapon = this._state.player.equipment.weapon;
    if (!weapon) return 5;
    const stats = weapon.stats as any;
    return (stats.damage || 0) + (stats.bonusDamage || 0);
  }

  // ──────────────────────────────────────────────────────────────
  //  HELPER: Get life steal percentage
  // ──────────────────────────────────────────────────────────────
  private _getLifeSteal(): number {
    let ls = 0;
    const equipKeys: (keyof DiabloEquipment)[] = [
      "helmet", "body", "gauntlets", "legs", "feet", "accessory1", "accessory2", "weapon", "lantern",
    ];
    for (const key of equipKeys) {
      const item = this._state.player.equipment[key];
      if (item) {
        const stats = item.stats as any;
        if (stats.lifeSteal) ls += stats.lifeSteal;
      }
    }
    const talentBonusesLs = this._getTalentBonuses();
    if (talentBonusesLs[TalentEffectType.LIFE_STEAL_PERCENT]) {
      ls += talentBonusesLs[TalentEffectType.LIFE_STEAL_PERCENT];
    }
    return ls;
  }

  // ──────────────────────────────────────────────────────────────
  //  HELPER: Get skill damage
  // ──────────────────────────────────────────────────────────────
  private _getSkillDamage(def: any): number {
    const p = this._state.player;
    let base = 0;
    const weaponBonus = this._getWeaponDamage();
    switch (p.class) {
      case DiabloClass.WARRIOR:
        base = p.strength * 1.5 + weaponBonus;
        break;
      case DiabloClass.MAGE:
        base = p.intelligence * 1.2 + weaponBonus;
        break;
      case DiabloClass.RANGER:
        base = p.dexterity * 1.3 + weaponBonus;
        break;
    }
    const hasBattleCry = p.statusEffects.some((e) => e.source === "BATTLE_CRY");
    if (hasBattleCry) base *= 1.3;

    // Apply equipped bonus damage
    let bonusDmg = 0;
    const equipKeys: (keyof DiabloEquipment)[] = [
      "helmet", "body", "gauntlets", "legs", "feet", "accessory1", "accessory2", "weapon", "lantern",
    ];
    for (const key of equipKeys) {
      const item = p.equipment[key];
      if (item) {
        const stats = item.stats as any;
        if (stats.bonusDamage) bonusDmg += stats.bonusDamage;
      }
    }

    let total = (base + bonusDmg) * (def.damageMultiplier || 1);

    const talentBonusesSkill = this._getTalentBonuses();
    if (talentBonusesSkill[TalentEffectType.BONUS_DAMAGE_PERCENT]) {
      total *= (1 + talentBonusesSkill[TalentEffectType.BONUS_DAMAGE_PERCENT] / 100);
    }

    // Strength potion buff
    for (const buff of p.activePotionBuffs) {
      if (buff.type === PotionType.STRENGTH) {
        total *= (1 + buff.value / 100);
      }
    }

    return total;
  }

  // ──────────────────────────────────────────────────────────────
  //  HELPER: Get enemy effective speed
  // ──────────────────────────────────────────────────────────────
  private _getEnemyEffectiveSpeed(enemy: DiabloEnemy): number {
    let speed = enemy.speed;
    if (enemy.statusEffects.some((e) => e.effect === StatusEffect.FROZEN)) return 0;
    if (enemy.statusEffects.some((e) => e.effect === StatusEffect.SLOWED)) speed *= 0.5;
    if (this._state.weather === Weather.STORMY) speed *= 1.1;
    return speed;
  }

  // ──────────────────────────────────────────────────────────────
  //  HELPER: Get mouse world position
  // ──────────────────────────────────────────────────────────────
  private _getMouseWorldPos(): { x: number; z: number } {
    // Approximate: map screen coordinates to world using isometric projection
    const p = this._state.player;
    const w = window.innerWidth;
    const h = window.innerHeight;

    // Center of screen is roughly where the player is
    const dx = (this._mouseX - w / 2) / (w / 2);
    const dz = (this._mouseY - h / 2) / (h / 2);

    // Scale factor based on camera distance
    const camDist = this._state.camera.distance;
    const scale = camDist * 0.6;

    // Isometric-ish mapping: screen x maps to world x+z, screen y maps to world z-x
    const worldX = p.x + dx * scale;
    const worldZ = p.z + dz * scale;

    return { x: worldX, z: worldZ };
  }

  // ──────────────────────────────────────────────────────────────
  //  HELPER: Spawn initial enemies (extracted from _startMap)
  // ──────────────────────────────────────────────────────────────
  private _spawnInitialEnemies(): void {
    const initialCount = 8 + Math.floor(Math.random() * 5);
    for (let i = 0; i < initialCount; i++) {
      this._spawnEnemy();
    }
    // Spawn special night boss if time is NIGHT
    if (this._state.timeOfDay === TimeOfDay.NIGHT) {
      this._spawnNightBoss();
    }
  }

  private _spawnNightBoss(): void {
    const nightBossType = NIGHT_BOSS_MAP[this._state.currentMap];
    if (!nightBossType) return;
    // Check if night boss already exists
    const existingNightBoss = this._state.enemies.find(
      (e) => e.type === nightBossType && e.state !== EnemyState.DEAD && e.state !== EnemyState.DYING
    );
    if (existingNightBoss) return;

    const def = ENEMY_DEFS[nightBossType];
    if (!def) return;

    const mapCfg = MAP_CONFIGS[this._state.currentMap];
    const halfW = mapCfg.width / 2 - 5;
    const halfD = ((mapCfg as any).depth || mapCfg.width) / 2 - 5;
    const diffCfg = DIFFICULTY_CONFIGS[this._state.difficulty];

    const enemy: DiabloEnemy = {
      id: this._genId(),
      type: nightBossType,
      x: (Math.random() - 0.5) * halfW * 1.2,
      y: 0,
      z: (Math.random() - 0.5) * halfD * 1.2,
      angle: Math.random() * Math.PI * 2,
      hp: def.hp * diffCfg.hpMult,
      maxHp: def.hp * diffCfg.hpMult,
      damage: def.damage * diffCfg.damageMult,
      damageType: ENEMY_DAMAGE_TYPES[nightBossType] || DamageType.PHYSICAL,
      armor: def.armor * diffCfg.armorMult,
      speed: def.speed * diffCfg.speedMult,
      state: EnemyState.IDLE,
      targetId: null,
      attackTimer: 1.0,
      attackRange: def.attackRange,
      aggroRange: def.aggroRange,
      xpReward: Math.round(def.xpReward * diffCfg.xpMult),
      lootTable: [],
      deathTimer: 0,
      stateTimer: 0,
      patrolTarget: null,
      statusEffects: [],
      isBoss: true,
      bossName: def.name,
      scale: def.scale,
      level: def.level,
    };

    this._state.enemies.push(enemy);
    this._state.totalEnemiesSpawned++;

    // Announce the night boss spawn
    const px = this._state.player.x;
    const py = this._state.player.y;
    const pz = this._state.player.z;
    this._addFloatingText(px, py + 4, pz, `${def.name} has awoken!`, "#ff44ff");
    this._addFloatingText(px, py + 3, pz, "A creature of the night stalks this land...", "#cc88ff");
  }

  // ──────────────────────────────────────────────────────────────
  //  HELPER: Spawn initial chests (extracted from _startMap)
  // ──────────────────────────────────────────────────────────────
  private _spawnInitialChests(): void {
    const mapCfg = MAP_CONFIGS[this._state.currentMap];
    const mapW = mapCfg.width;
    const mapD = (mapCfg as any).depth || (mapCfg as any).height || mapCfg.width;
    const chestCount = 5 + Math.floor(Math.random() * 4);
    for (let i = 0; i < chestCount; i++) {
      const halfW = mapW / 2 - 5;
      const halfD = mapD / 2 - 5;
      const cx = (Math.random() * 2 - 1) * halfW;
      const cz = (Math.random() * 2 - 1) * halfD;
      const roll = Math.random();
      const rarity = roll < 0.02
        ? ItemRarity.EPIC
        : roll < 0.12
          ? ItemRarity.RARE
          : roll < 0.45
            ? ItemRarity.UNCOMMON
            : ItemRarity.COMMON;
      const chestItems = this._generateChestLoot(rarity);
      const chest: DiabloTreasureChest = {
        id: this._genId(),
        x: cx,
        y: 0,
        z: cz,
        opened: false,
        rarity,
        items: chestItems,
      };
      this._state.treasureChests.push(chest);
    }
  }

  // ──────────────────────────────────────────────────────────────
  //  HELPER: Check if save exists
  // ──────────────────────────────────────────────────────────────
  private _hasSave(): boolean {
    return localStorage.getItem("diablo_save") !== null;
  }

  // ──────────────────────────────────────────────────────────────
  //  SAVE GAME
  // ──────────────────────────────────────────────────────────────
  private _saveGame(): void {
    const save = {
      version: 2,
      timestamp: Date.now(),
      player: {
        ...this._state.player,
        skillCooldowns: Object.fromEntries(this._state.player.skillCooldowns),
      },
      currentMap: this._state.currentMap,
      timeOfDay: this._state.timeOfDay,
      killCount: this._state.killCount,
      persistentInventory: this._state.persistentInventory,
      persistentGold: this._state.persistentGold,
      persistentLevel: this._state.persistentLevel,
      persistentXp: this._state.persistentXp,
      persistentStash: this._state.persistentStash,
      mapCleared: this._state.mapCleared,
      difficulty: this._state.difficulty,
      playerTalents: this._state.player.talents,
      playerTalentPoints: this._state.player.talentPoints,
      playerPotions: this._state.player.potions,
      playerPotionSlots: this._state.player.potionSlots,
      activeQuests: this._state.activeQuests,
      completedQuestIds: this._state.completedQuestIds,
      completedMaps: this._state.completedMaps,
      chestsOpened: this._chestsOpened,
      goldEarnedTotal: this._goldEarnedTotal,
    };
    localStorage.setItem("diablo_save", JSON.stringify(save));

    // Show floating notification
    const notification = document.createElement("div");
    notification.style.cssText =
      "position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);" +
      "color:#4f4;font-size:28px;font-weight:bold;font-family:'Georgia',serif;" +
      "text-shadow:0 0 15px rgba(0,255,0,0.5);pointer-events:none;" +
      "transition:opacity 1s;opacity:1;z-index:50;";
    notification.textContent = "Game Saved!";
    this._menuEl.appendChild(notification);
    setTimeout(() => {
      notification.style.opacity = "0";
    }, 800);
    setTimeout(() => {
      if (notification.parentElement) notification.parentElement.removeChild(notification);
    }, 2000);
  }

  // ──────────────────────────────────────────────────────────────
  //  LOAD GAME
  // ──────────────────────────────────────────────────────────────
  private _loadGame(): void {
    const raw = localStorage.getItem("diablo_save");
    if (!raw) return;
    const save = JSON.parse(raw);
    // Restore player state
    this._state.player = {
      ...save.player,
      skillCooldowns: new Map(Object.entries(save.player.skillCooldowns)),
      talents: save.playerTalents || save.player.talents || {},
      talentPoints: save.playerTalentPoints ?? save.player.talentPoints ?? 0,
      potions: save.playerPotions || save.player.potions || [],
      potionSlots: save.playerPotionSlots || save.player.potionSlots || [null, null, null, null],
      potionCooldown: 0,
      activePotionBuffs: [],
      lanternOn: save.player.lanternOn || false,
      skillBranches: save.player.skillBranches || {},
      unlockedSkills: save.player.unlockedSkills || [],
    };
    // Restore lantern light if it was on
    if (this._state.player.lanternOn && this._state.player.equipment.lantern) {
      const cfg = LANTERN_CONFIGS[this._state.player.equipment.lantern.name];
      if (cfg) this._renderer.setPlayerLantern(true, cfg.intensity, cfg.distance, cfg.color);
    }
    this._state.currentMap = save.currentMap;
    this._state.timeOfDay = save.timeOfDay || TimeOfDay.DAY;
    this._state.killCount = save.killCount;
    this._state.persistentInventory = save.persistentInventory;
    this._state.persistentGold = save.persistentGold;
    this._state.persistentLevel = save.persistentLevel;
    this._state.persistentXp = save.persistentXp;
    this._state.persistentStash = save.persistentStash || Array.from({ length: 100 }, () => ({ item: null }));
    this._state.mapCleared = save.mapCleared;
    this._state.difficulty = save.difficulty || DiabloDifficulty.DAGGER;
    this._state.activeQuests = save.activeQuests || [];
    this._state.completedQuestIds = save.completedQuestIds || [];
    this._state.completedMaps = save.completedMaps || {};
    this._chestsOpened = save.chestsOpened || 0;
    this._goldEarnedTotal = save.goldEarnedTotal || 0;
    // Rebuild the map
    this._renderer.buildMap(this._state.currentMap);
    this._renderer.buildPlayer(this._state.player.class);
    this._renderer.applyTimeOfDay(this._state.timeOfDay, this._state.currentMap);
    // Spawn fresh enemies and chests (or vendors for Camelot)
    this._state.enemies = [];
    this._state.projectiles = [];
    this._state.loot = [];
    this._state.treasureChests = [];
    this._state.aoeEffects = [];
    this._state.floatingTexts = [];
    this._state.particles = [];
    this._state.vendors = [];
    if (this._state.currentMap === DiabloMapId.CAMELOT) {
      this._state.vendors = VENDOR_DEFS.map((vd) => ({
        id: this._genId(),
        type: vd.type,
        name: vd.name,
        x: vd.x,
        z: vd.z,
        inventory: generateVendorInventory(vd.type, this._state.player.level),
        icon: vd.icon,
      }));
      if ((this._renderer as any).syncVendors) {
        (this._renderer as any).syncVendors(
          this._state.vendors.map((v) => ({ x: v.x, z: v.z, type: v.type, name: v.name, icon: v.icon }))
        );
      }
    } else {
      this._spawnInitialEnemies();
      this._spawnInitialChests();
    }
    // Set to playing
    this._state.phase = DiabloPhase.PLAYING;
    this._menuEl.innerHTML = "";
    this._hud.style.display = "block";
    this._recalculatePlayerStats();
  }

  // ──────────────────────────────────────────────────────────────
  //  SHARED STASH SCREEN
  // ──────────────────────────────────────────────────────────────
  private _showStash(): void {
    const p = this._state.player;
    const stash = this._state.persistentStash;

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

    // Build stash grid (10x10 = 100 slots)
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

    this._menuEl.innerHTML = `
      <div style="
        width:100%;height:100%;background:rgba(0,0,0,0.90);display:flex;flex-direction:column;
        align-items:center;justify-content:center;color:#fff;pointer-events:auto;
      ">
        <h2 style="color:#ffd700;font-size:32px;letter-spacing:3px;margin-bottom:16px;font-family:'Georgia',serif;
          text-shadow:0 0 15px rgba(255,215,0,0.4);">
          SHARED STASH
        </h2>
        <div style="display:flex;gap:30px;align-items:flex-start;">
          <!-- Inventory Panel -->
          <div>
            <div style="color:#c8a84e;font-size:14px;margin-bottom:8px;text-align:center;font-weight:bold;">INVENTORY</div>
            <div style="display:grid;grid-template-columns:repeat(8,55px);grid-template-rows:repeat(5,55px);gap:3px;">
              ${invHtml}
            </div>
          </div>
          <!-- Stash Panel -->
          <div>
            <div style="color:#c8a84e;font-size:14px;margin-bottom:8px;text-align:center;font-weight:bold;">STASH</div>
            <div style="display:grid;grid-template-columns:repeat(10,55px);grid-template-rows:repeat(10,55px);gap:3px;max-height:600px;overflow-y:auto;">
              ${stashHtml}
            </div>
          </div>
        </div>
        <!-- Bottom bar -->
        <div style="margin-top:16px;display:flex;gap:30px;align-items:center;">
          <div style="font-size:16px;color:#ffd700;">\uD83E\uDE99 ${p.gold}</div>
          <button id="stash-back-btn" style="
            padding:12px 40px;font-size:18px;letter-spacing:3px;font-weight:bold;
            background:rgba(40,30,15,0.9);border:2px solid #5a4a2a;border-radius:8px;color:#c8a84e;
            cursor:pointer;transition:all 0.2s;font-family:'Georgia',serif;pointer-events:auto;
          ">BACK</button>
        </div>
        <div id="stash-status" style="margin-top:10px;color:#ff4444;font-size:14px;min-height:20px;"></div>
        <!-- Tooltip container -->
        <div id="inv-tooltip" style="
          display:none;position:fixed;z-index:100;background:rgba(10,5,2,0.96);border:2px solid #5a4a2a;
          border-radius:8px;padding:14px;max-width:280px;pointer-events:none;color:#ccc;font-size:13px;
        "></div>
      </div>`;

    const statusEl = this._menuEl.querySelector("#stash-status") as HTMLDivElement;
    const showStatus = (msg: string, color: string) => {
      statusEl.textContent = msg;
      statusEl.style.color = color;
      setTimeout(() => { statusEl.textContent = ""; }, 1500);
    };

    // Wire up inventory slots (click to transfer to stash)
    const invSlots = this._menuEl.querySelectorAll(".stash-inv-slot") as NodeListOf<HTMLDivElement>;
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
        this._showStash(); // Re-render
      });
      el.addEventListener("mouseenter", (ev) => this._showItemTooltip(ev, p.inventory[idx].item));
      el.addEventListener("mouseleave", () => this._hideItemTooltip());
    });

    // Wire up stash slots (click to transfer to inventory)
    const stashSlots = this._menuEl.querySelectorAll(".stash-slot") as NodeListOf<HTMLDivElement>;
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
        this._showStash(); // Re-render
      });
      el.addEventListener("mouseenter", (ev) => this._showItemTooltip(ev, stash[idx].item));
      el.addEventListener("mouseleave", () => this._hideItemTooltip());
    });

    // Back button
    const backBtn = this._menuEl.querySelector("#stash-back-btn") as HTMLButtonElement;
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
      this._backToMenu();
    });
  }

  // ──────────────────────────────────────────────────────────────
  //  VENDOR SHOP
  // ──────────────────────────────────────────────────────────────
  private _vendorDialogueIdx: Record<string, number> = {};

  private _showVendorShop(vendor: DiabloVendor): void {
    const p = this._state.player;
    this._phaseBeforeOverlay = DiabloPhase.PLAYING;
    this._state.phase = DiabloPhase.INVENTORY;

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
            <div style="font-size:11px;color:${rarityColor};margin-top:4px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:110px;text-align:center;">${item.name}</div>
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

      this._menuEl.innerHTML = `
        <div style="
          width:100%;height:100%;background:rgba(0,0,0,0.88);display:flex;flex-direction:column;
          align-items:center;justify-content:center;color:#fff;pointer-events:auto;
        ">
          <div style="
            max-width:900px;width:92%;background:rgba(15,10,5,0.95);border:2px solid #5a4a2a;
            border-radius:12px;padding:24px 30px;max-height:88vh;overflow-y:auto;
          ">
            <!-- Title -->
            <div style="text-align:center;margin-bottom:16px;">
              <div style="font-size:32px;color:#c8a84e;font-weight:bold;letter-spacing:2px;font-family:'Georgia',serif;">
                ${vendor.icon} ${vendor.name}
              </div>
              <div style="font-size:14px;color:#888;margin-top:4px;">${(VENDOR_DEFS.find(vd => vd.type === vendor.type) || { description: "" }).description}</div>
            </div>

            <!-- Dialogue box -->
            <div style="margin-bottom:14px;background:rgba(30,25,15,0.9);border:1px solid #3a3a2a;border-radius:8px;padding:12px 18px;display:flex;align-items:center;gap:14px;">
              <div style="font-size:36px;flex-shrink:0;">${vendor.icon}</div>
              <div style="flex:1;">
                <div id="vendor-dialogue-text" style="font-size:13px;color:#ccbb99;font-style:italic;line-height:1.5;font-family:'Georgia',serif;min-height:36px;">
                  "${(VENDOR_DIALOGUE[vendor.type] || ["..."])[this._vendorDialogueIdx[vendor.type] || 0]}"
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
                <div style="color:#c8a84e;font-size:14px;font-weight:bold;margin-bottom:8px;text-align:center;">VENDOR'S WARES</div>
                <div style="display:grid;grid-template-columns:repeat(4,120px);gap:6px;max-height:420px;overflow-y:auto;justify-content:center;">
                  ${waresHtml}
                </div>
              </div>

              ${vendor.type === VendorType.ALCHEMIST ? `
              <!-- Potions -->
              <div style="flex:1;min-width:0;">
                <div style="color:#3a8a2a;font-size:14px;font-weight:bold;margin-bottom:8px;text-align:center;">POTIONS</div>
                <div style="display:grid;grid-template-columns:repeat(3,120px);gap:6px;max-height:420px;overflow-y:auto;justify-content:center;">
                  ${potionWaresHtml}
                </div>
              </div>` : ""}

              <!-- Right: Player's Items to Sell -->
              <div style="flex:0 0 auto;">
                <div style="color:#c8a84e;font-size:14px;font-weight:bold;margin-bottom:8px;text-align:center;">YOUR ITEMS (click to sell)</div>
                <div style="display:grid;grid-template-columns:repeat(8,55px);grid-template-rows:repeat(5,55px);gap:3px;">
                  ${invHtml}
                </div>
              </div>
            </div>

            <!-- Bottom bar -->
            <div style="margin-top:16px;display:flex;justify-content:center;align-items:center;gap:30px;">
              <div style="font-size:18px;color:#ffd700;">\uD83E\uDE99 ${p.gold} gold</div>
              <button id="vendor-close-btn" style="
                padding:12px 40px;font-size:18px;letter-spacing:3px;font-weight:bold;
                background:rgba(40,30,15,0.9);border:2px solid #5a4a2a;border-radius:8px;color:#c8a84e;
                cursor:pointer;transition:all 0.2s;font-family:'Georgia',serif;pointer-events:auto;
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

      const statusEl = this._menuEl.querySelector("#vendor-status") as HTMLDivElement;
      const showStatus = (msg: string, color: string) => {
        statusEl.textContent = msg;
        statusEl.style.color = color;
        setTimeout(() => { statusEl.textContent = ""; }, 1500);
      };

      // Wire up vendor ware clicks (buy)
      const wareSlots = this._menuEl.querySelectorAll(".vendor-ware") as NodeListOf<HTMLDivElement>;
      wareSlots.forEach((el) => {
        const idx = parseInt(el.getAttribute("data-ware-idx")!, 10);
        el.addEventListener("mouseenter", (ev) => {
          el.style.boxShadow = "0 0 12px rgba(200,168,78,0.3)";
          this._showItemTooltip(ev, vendor.inventory[idx]);
        });
        el.addEventListener("mouseleave", () => {
          el.style.boxShadow = "none";
          this._hideItemTooltip();
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
          p.inventory[emptyIdx].item = { ...item, id: this._genId() };
          vendor.inventory.splice(idx, 1);
          showStatus(`Purchased ${item.name}!`, "#44ff44");
          renderShop();
        });
      });

      // Wire up potion buy clicks
      const potionSlots = this._menuEl.querySelectorAll(".vendor-potion") as NodeListOf<HTMLDivElement>;
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
          const newPot: DiabloPotion = { ...pot, id: this._genId() };
          // Try to assign to an empty potion slot first
          let assigned = false;
          for (let s = 0; s < 4; s++) {
            if (!p.potionSlots[s]) {
              p.potionSlots[s] = newPot;
              assigned = true;
              break;
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
      const invSlots = this._menuEl.querySelectorAll(".vendor-inv-slot") as NodeListOf<HTMLDivElement>;
      invSlots.forEach((el) => {
        const idx = parseInt(el.getAttribute("data-inv-idx")!, 10);
        el.addEventListener("mouseenter", (ev) => this._showItemTooltip(ev, p.inventory[idx].item));
        el.addEventListener("mouseleave", () => this._hideItemTooltip());
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
      const closeBtn = this._menuEl.querySelector("#vendor-close-btn") as HTMLButtonElement;
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
        this._state.phase = DiabloPhase.PLAYING;
        this._menuEl.innerHTML = "";
      });

      // Talk button — cycle dialogue
      const talkBtn = this._menuEl.querySelector("#vendor-talk-btn") as HTMLButtonElement | null;
      if (talkBtn) {
        talkBtn.addEventListener("click", () => {
          const lines = VENDOR_DIALOGUE[vendor.type] || [];
          if (lines.length === 0) return;
          const idx = ((this._vendorDialogueIdx[vendor.type] || 0) + 1) % lines.length;
          this._vendorDialogueIdx[vendor.type] = idx;
          const textEl = this._menuEl.querySelector("#vendor-dialogue-text") as HTMLDivElement | null;
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
    };

    renderShop();
  }

  // ──────────────────────────────────────────────────────────────
  //  MINIMAP
  // ──────────────────────────────────────────────────────────────
  private _drawMinimapContent(ctx: CanvasRenderingContext2D, W: number, H: number): void {
    const p = this._state.player;
    const mapId = this._state.currentMap;
    const mapCfg = MAP_CONFIGS[mapId];
    const mapW = mapCfg.width;
    const mapD = mapCfg.depth;

    ctx.clearRect(0, 0, W, H);

    const bgColors: Record<string, string> = {
      [DiabloMapId.FOREST]: "rgba(10,30,10,0.85)",
      [DiabloMapId.ELVEN_VILLAGE]: "rgba(10,25,30,0.85)",
      [DiabloMapId.NECROPOLIS_DUNGEON]: "rgba(20,10,30,0.85)",
      [DiabloMapId.CAMELOT]: "rgba(30,22,12,0.85)",
    };
    ctx.fillStyle = bgColors[mapId] || "rgba(15,15,15,0.85)";
    ctx.fillRect(0, 0, W, H);

    const scale = Math.min(W / mapW, H / mapD) * 0.85;
    const cx = W / 2;
    const cy = H / 2;

    const toMx = (wx: number) => cx + wx * scale;
    const toMy = (wz: number) => cy + wz * scale;

    const halfW = mapW / 2;
    const halfD = mapD / 2;

    // Grid overlay
    ctx.strokeStyle = "rgba(90,74,42,0.15)";
    ctx.lineWidth = 0.5;
    const gridStep = 20;
    for (let gx = -halfW; gx <= halfW; gx += gridStep) {
      ctx.beginPath();
      ctx.moveTo(toMx(gx), toMy(-halfD));
      ctx.lineTo(toMx(gx), toMy(halfD));
      ctx.stroke();
    }
    for (let gz = -halfD; gz <= halfD; gz += gridStep) {
      ctx.beginPath();
      ctx.moveTo(toMx(-halfW), toMy(gz));
      ctx.lineTo(toMx(halfW), toMy(gz));
      ctx.stroke();
    }

    // Map border
    ctx.strokeStyle = "rgba(200,168,78,0.6)";
    ctx.lineWidth = 1.5;
    ctx.strokeRect(toMx(-halfW), toMy(-halfD), mapW * scale, mapD * scale);

    // Fog of war overlay for combat maps
    const useFogOfWar = mapId !== DiabloMapId.CAMELOT && this._state.exploredGrid.length > 0;

    if (mapId === DiabloMapId.CAMELOT) {
      // Walls
      ctx.strokeStyle = "rgba(80,80,80,0.7)";
      ctx.lineWidth = 2;
      ctx.strokeRect(toMx(-halfW + 1), toMy(-halfD + 1), (mapW - 2) * scale, (mapD - 2) * scale);

      // Roads
      ctx.strokeStyle = "rgba(100,70,40,0.5)";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(toMx(-halfW), toMy(0));
      ctx.lineTo(toMx(halfW), toMy(0));
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(toMx(0), toMy(-halfD));
      ctx.lineTo(toMx(0), toMy(halfD));
      ctx.stroke();

      // Castle
      ctx.fillStyle = "rgba(70,65,55,0.5)";
      ctx.fillRect(toMx(-10), toMy(-halfD + 2), 20 * scale, 8 * scale);

      // Buildings
      ctx.strokeStyle = "rgba(90,85,75,0.5)";
      ctx.lineWidth = 1;
      const bldgs = [
        { x: -20, z: -15, w: 8, h: 6 },
        { x: 12, z: -15, w: 8, h: 6 },
        { x: -20, z: 8, w: 8, h: 6 },
        { x: 12, z: 8, w: 8, h: 6 },
        { x: -5, z: -22, w: 10, h: 5 },
      ];
      for (const b of bldgs) {
        ctx.strokeRect(toMx(b.x), toMy(b.z), b.w * scale, b.h * scale);
      }

      // Vendors as blue dots
      const vendorColors: Record<string, string> = {
        [VendorType.BLACKSMITH]: "#4488ff",
        [VendorType.ARCANIST]: "#4488ff",
        [VendorType.ALCHEMIST]: "#4488ff",
        [VendorType.JEWELER]: "#4488ff",
        [VendorType.GENERAL_MERCHANT]: "#4488ff",
      };
      ctx.font = `${Math.max(7, W / 25)}px sans-serif`;
      for (const v of this._state.vendors) {
        const mx = toMx(v.x);
        const my = toMy(v.z);
        ctx.fillStyle = vendorColors[v.type] || "#4488ff";
        ctx.beginPath();
        ctx.arc(mx, my, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "rgba(200,190,170,0.8)";
        ctx.fillText(v.name.split(" ")[0], mx + 5, my + 3);
      }
    } else {
      // Enemies
      for (const enemy of this._state.enemies) {
        if (enemy.state === EnemyState.DEAD) continue;
        if (enemy.type && (enemy.type as string).startsWith("NIGHT_")) continue;
        if (useFogOfWar && !this._isExplored(enemy.x, enemy.z)) continue;
        const mx = toMx(enemy.x);
        const my = toMy(enemy.z);
        ctx.fillStyle = "#ff3333";
        const r = enemy.isBoss ? 4 : 2;
        ctx.beginPath();
        ctx.arc(mx, my, r, 0, Math.PI * 2);
        ctx.fill();
      }

      // Loot (colored by rarity)
      for (const loot of this._state.loot) {
        if (useFogOfWar && !this._isExplored(loot.x, loot.z)) continue;
        ctx.fillStyle = RARITY_CSS[loot.item.rarity] || "#ffff00";
        ctx.beginPath();
        ctx.arc(toMx(loot.x), toMy(loot.z), 1.5, 0, Math.PI * 2);
        ctx.fill();
      }

      // Treasure chests as yellow dots
      for (const chest of this._state.treasureChests) {
        if (chest.opened) continue;
        if (useFogOfWar && !this._isExplored(chest.x, chest.z)) continue;
        ctx.fillStyle = "#ffdd00";
        ctx.beginPath();
        ctx.arc(toMx(chest.x), toMy(chest.z), 2.5, 0, Math.PI * 2);
        ctx.fill();
      }

      // Fog of war darkening
      if (useFogOfWar) {
        const fogStepPx = Math.max(2, Math.floor(scale));
        ctx.fillStyle = "rgba(0,0,0,0.7)";
        for (let wx = -halfW; wx < halfW; wx += fogStepPx / scale) {
          for (let wz = -halfD; wz < halfD; wz += fogStepPx / scale) {
            if (!this._isExplored(wx, wz)) {
              ctx.fillRect(toMx(wx), toMy(wz), fogStepPx, fogStepPx);
            }
          }
        }
      }

      // Landmarks as grey shapes
      ctx.fillStyle = "rgba(120,110,100,0.3)";
      ctx.fillRect(toMx(-5), toMy(-5), 10 * scale, 10 * scale);
    }

    // Player as green arrow/triangle
    const pmx = toMx(p.x);
    const pmy = toMy(p.z);
    ctx.save();
    ctx.translate(pmx, pmy);
    ctx.rotate(-p.angle + Math.PI);
    ctx.fillStyle = "#44ff44";
    ctx.beginPath();
    ctx.moveTo(0, -5);
    ctx.lineTo(-3.5, 4);
    ctx.lineTo(3.5, 4);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.restore();

    // Map name
    const mapNames: Record<string, string> = {
      [DiabloMapId.FOREST]: "Darkwood Forest",
      [DiabloMapId.ELVEN_VILLAGE]: "Aelindor",
      [DiabloMapId.NECROPOLIS_DUNGEON]: "Necropolis Depths",
      [DiabloMapId.VOLCANIC_WASTES]: "Volcanic Wastes",
      [DiabloMapId.ABYSSAL_RIFT]: "Abyssal Rift",
      [DiabloMapId.DRAGONS_SANCTUM]: "Dragon's Sanctum",
      [DiabloMapId.SUNSCORCH_DESERT]: "Sunscorch Desert",
      [DiabloMapId.EMERALD_GRASSLANDS]: "Emerald Grasslands",
      [DiabloMapId.CAMELOT]: "Camelot",
    };
    ctx.fillStyle = "rgba(200,168,78,0.7)";
    ctx.font = `${Math.max(8, W / 22)}px sans-serif`;
    ctx.textAlign = "center";
    ctx.fillText(mapNames[mapId] || mapId, W / 2, H - 4);
    ctx.textAlign = "start";
  }

  private _updateMinimap(): void {
    this._drawMinimapContent(this._minimapCtx, 200, 200);
  }

  private _updateFullmap(): void {
    this._drawMinimapContent(this._fullmapCtx, 400, 400);
  }

  // ──────────────────────────────────────────────────────────────
  //  MAP COMPLETION
  // ──────────────────────────────────────────────────────────────
  private _onMapComplete(): void {
    const p = this._state.player;
    const mapId = this._state.currentMap;
    const reward = MAP_COMPLETION_REWARDS[mapId];
    if (!reward) return;

    const completionKey = `${mapId}_${this._state.difficulty}_${this._state.timeOfDay}`;
    const isFirstClear = !this._state.completedMaps[completionKey];
    const isNight = this._state.timeOfDay === TimeOfDay.NIGHT;
    const diffCfg = DIFFICULTY_CONFIGS[this._state.difficulty];

    let goldReward = Math.floor(reward.gold * diffCfg.goldMult);
    let xpReward = Math.floor(reward.xp * diffCfg.xpMult);
    if (isNight) { goldReward = Math.floor(goldReward * 1.5); xpReward = Math.floor(xpReward * 1.5); }
    if (isFirstClear) { goldReward *= 2; xpReward *= 2; }

    p.gold += goldReward;
    p.xp += xpReward;

    const item = this._pickRandomItemOfRarity(reward.guaranteedDropRarity);
    if (item) {
      const loot: DiabloLoot = {
        id: this._genId(), item: { ...item, id: this._genId() },
        x: p.x + (Math.random() * 2 - 1), y: 0, z: p.z + (Math.random() * 2 - 1), timer: 0,
      };
      this._state.loot.push(loot);
    }

    this._addFloatingText(p.x, p.y + 4, p.z, "MAP CLEARED!", "#ffd700");
    this._addFloatingText(p.x, p.y + 3, p.z, `+${goldReward} Gold  +${xpReward} XP`, "#ffd700");
    if (isFirstClear) {
      this._addFloatingText(p.x, p.y + 2, p.z, "FIRST CLEAR BONUS!", "#44ff44");
    }
    this._addFloatingText(p.x, p.y + 1, p.z, reward.bonusMessage, "#c8a84e");

    this._state.completedMaps[completionKey] = true;

    this._updateQuestProgress(QuestType.CLEAR_MAP, mapId);
  }

  // ──────────────────────────────────────────────────────────────
  //  DEATH / RESPAWN
  // ──────────────────────────────────────────────────────────────
  private _triggerDeath(): void {
    if (this._isDead) return;
    this._isDead = true;
    this._state.deathCount++;
    const p = this._state.player;
    const goldLoss = Math.floor(p.gold * 0.1);
    p.gold -= goldLoss;
    this._state.deathGoldLoss = goldLoss;
    this._state.respawnTimer = 5.0;

    this._deathOverlay.style.display = "flex";
    const goldEl = this._deathOverlay.querySelector("#diablo-gold-loss") as HTMLDivElement;
    if (goldEl) goldEl.textContent = goldLoss > 0 ? `Lost ${goldLoss} gold` : "";
  }

  private _updateDeathRespawn(dt: number): void {
    this._state.respawnTimer -= dt;
    const timerEl = this._deathOverlay.querySelector("#diablo-respawn-timer") as HTMLDivElement;
    if (timerEl) timerEl.textContent = `Respawning in ${Math.ceil(this._state.respawnTimer)}...`;

    if (this._state.respawnTimer <= 0) {
      this._isDead = false;
      this._deathOverlay.style.display = "none";
      const p = this._state.player;
      p.x = 0;
      p.z = 0;
      p.hp = Math.floor(p.maxHp * 0.5);
      p.mana = Math.floor(p.maxMana * 0.5);
      p.invulnTimer = 3.0;
      p.statusEffects = [];
      this._state.respawnTimer = 0;
    }
  }

  // ──────────────────────────────────────────────────────────────
  //  BOSS ABILITIES
  // ──────────────────────────────────────────────────────────────
  private _updateBossAbilities(dt: number): void {
    const p = this._state.player;
    const phases = BOSS_PHASE_CONFIGS[this._state.currentMap];
    if (!phases || phases.length === 0) return;

    for (const enemy of this._state.enemies) {
      if (!enemy.isBoss) continue;
      if (enemy.state === EnemyState.DYING || enemy.state === EnemyState.DEAD) continue;

      if (enemy.bossPhase === undefined) enemy.bossPhase = 0;
      if (enemy.bossAbilityCooldown === undefined) enemy.bossAbilityCooldown = 3;

      const hpPct = enemy.hp / enemy.maxHp;
      let targetPhase = 0;
      for (let i = phases.length - 1; i >= 0; i--) {
        if (hpPct <= phases[i].hpThreshold) {
          targetPhase = i;
        }
      }

      if (targetPhase > enemy.bossPhase) {
        enemy.bossPhase = targetPhase;
        const phase = phases[targetPhase];
        enemy.damage = enemy.damage * phase.damageMultiplier;
        enemy.speed = enemy.speed * phase.speedMultiplier;
        this._addFloatingText(enemy.x, enemy.y + 3, enemy.z, phase.name, "#ff00ff");
        enemy.bossAbilityCooldown = 1.0;
      }

      const phase = phases[enemy.bossPhase];
      if (!phase || phase.abilities.length === 0) continue;

      if (enemy.bossShieldTimer !== undefined && enemy.bossShieldTimer > 0) {
        enemy.bossShieldTimer -= dt;
      }

      enemy.bossAbilityCooldown = Math.max(0, enemy.bossAbilityCooldown - dt);
      if (enemy.bossAbilityCooldown > 0) continue;

      const dist = this._dist(enemy.x, enemy.z, p.x, p.z);
      if (dist > enemy.aggroRange * 2) continue;

      const ability = phase.abilities[Math.floor(Math.random() * phase.abilities.length)];
      enemy.bossAbilityCooldown = 4.0;

      switch (ability) {
        case BossAbility.GROUND_SLAM: {
          const aoe: DiabloAOE = {
            id: this._genId(),
            x: enemy.x, y: 0, z: enemy.z,
            radius: 6, damage: enemy.damage * 1.5,
            damageType: DamageType.PHYSICAL,
            duration: 0.5, timer: 0,
            ownerId: enemy.id, tickInterval: 0.5, lastTickTimer: 0,
          };
          this._state.aoeEffects.push(aoe);
          this._addFloatingText(enemy.x, enemy.y + 3, enemy.z, "GROUND SLAM!", "#ff8844");
          break;
        }
        case BossAbility.CHARGE: {
          const dx = p.x - enemy.x;
          const dz = p.z - enemy.z;
          const cLen = Math.sqrt(dx * dx + dz * dz);
          if (cLen > 0) {
            enemy.x += (dx / cLen) * 12;
            enemy.z += (dz / cLen) * 12;
          }
          if (this._dist(enemy.x, enemy.z, p.x, p.z) < 3 && p.invulnTimer <= 0) {
            const dmg = Math.max(1, enemy.damage * 2 - p.armor * 0.3);
            p.hp -= dmg;
            this._addFloatingText(p.x, p.y + 2, p.z, `-${Math.round(dmg)}`, "#ff4444");
            if (p.hp <= 0) { p.hp = 0; this._triggerDeath(); }
          }
          this._addFloatingText(enemy.x, enemy.y + 3, enemy.z, "CHARGE!", "#ffaa00");
          break;
        }
        case BossAbility.SUMMON_ADDS: {
          for (let i = 0; i < 3; i++) {
            const angle = Math.random() * Math.PI * 2;
            const addEnemy: DiabloEnemy = {
              id: this._genId(),
              type: EnemyType.SKELETON_WARRIOR,
              x: enemy.x + Math.cos(angle) * 4, y: 0, z: enemy.z + Math.sin(angle) * 4,
              angle: Math.random() * Math.PI * 2,
              hp: enemy.maxHp * 0.1, maxHp: enemy.maxHp * 0.1,
              damage: enemy.damage * 0.3, damageType: DamageType.PHYSICAL, armor: 2, speed: 4,
              state: EnemyState.CHASE, targetId: null,
              attackTimer: 1.0, attackRange: 2.0, aggroRange: 20,
              xpReward: 10, lootTable: [], deathTimer: 0, stateTimer: 0,
              patrolTarget: null, statusEffects: [], isBoss: false,
              scale: 0.8, level: enemy.level,
            };
            this._state.enemies.push(addEnemy);
          }
          this._addFloatingText(enemy.x, enemy.y + 3, enemy.z, "SUMMON!", "#aa44ff");
          break;
        }
        case BossAbility.ENRAGE: {
          if (!enemy.bossEnraged) {
            enemy.bossEnraged = true;
            enemy.damage *= 1.5;
            enemy.speed *= 1.3;
            this._addFloatingText(enemy.x, enemy.y + 3, enemy.z, "ENRAGED!", "#ff0000");
          }
          break;
        }
        case BossAbility.SHIELD: {
          enemy.bossShieldTimer = 4.0;
          this._addFloatingText(enemy.x, enemy.y + 3, enemy.z, "SHIELD!", "#4488ff");
          break;
        }
        case BossAbility.METEOR_RAIN: {
          for (let i = 0; i < 5; i++) {
            const mx = p.x + (Math.random() * 12 - 6);
            const mz = p.z + (Math.random() * 12 - 6);
            const aoe: DiabloAOE = {
              id: this._genId(),
              x: mx, y: 0, z: mz,
              radius: 3, damage: enemy.damage * 1.2,
              damageType: DamageType.FIRE,
              duration: 1.0, timer: 0,
              ownerId: enemy.id, tickInterval: 0.5, lastTickTimer: 0,
            };
            this._state.aoeEffects.push(aoe);
          }
          this._addFloatingText(enemy.x, enemy.y + 3, enemy.z, "METEOR RAIN!", "#ff4400");
          break;
        }
      }
    }
  }

  private _enemyFireProjectile(enemy: DiabloEnemy): void {
    const p = this._state.player;
    const dx = p.x - enemy.x;
    const dz = p.z - enemy.z;
    const angle = Math.atan2(dx, dz);
    const speed = 15;
    const proj: DiabloProjectile = {
      id: this._genId(),
      x: enemy.x, y: 1, z: enemy.z,
      vx: Math.sin(angle) * speed, vy: 0, vz: Math.cos(angle) * speed,
      speed,
      damage: enemy.damage * 0.8,
      damageType: DamageType.PHYSICAL,
      radius: 0.3,
      ownerId: enemy.id,
      isPlayerOwned: false,
      lifetime: 0,
      maxLifetime: 3.0,
    };
    this._state.projectiles.push(proj);
  }

  // ──────────────────────────────────────────────────────────────
  //  TALENT TREE
  // ──────────────────────────────────────────────────────────────
  private _getTalentBonuses(): Partial<Record<TalentEffectType, number>> {
    const p = this._state.player;
    const tree = TALENT_TREES[p.class];
    const result: Partial<Record<TalentEffectType, number>> = {};
    for (const node of tree) {
      const rank = p.talents[node.id] || 0;
      if (rank > 0) {
        for (const eff of node.effects) {
          result[eff.type] = (result[eff.type] || 0) + eff.value * rank;
        }
      }
    }
    return result;
  }

  private _getTalentPointsInBranch(branch: number): number {
    const p = this._state.player;
    const tree = TALENT_TREES[p.class];
    let total = 0;
    for (const node of tree) {
      if (node.branch === branch) {
        total += (p.talents[node.id] || 0);
      }
    }
    return total;
  }

  private _showSkillTreeScreen(): void {
    const p = this._state.player;

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
    const talentBonuses = this._getTalentBonuses();
    const cdr = talentBonuses[TalentEffectType.SKILL_COOLDOWN_REDUCTION] || 0;
    const bonusDmg = talentBonuses[TalentEffectType.BONUS_DAMAGE_PERCENT] || 0;
    let talentSummary = "";
    if (cdr > 0) talentSummary += `<span style="color:#8af;margin-right:12px;">CDR: ${cdr}%</span>`;
    if (bonusDmg > 0) talentSummary += `<span style="color:#fa8;margin-right:12px;">+${bonusDmg}% Damage</span>`;
    if (!talentSummary) talentSummary = `<span style="color:#555;">No talent bonuses yet</span>`;

    this._menuEl.innerHTML = `
      <div style="
        width:100%;height:100%;background:rgba(0,0,0,0.90);display:flex;flex-direction:column;
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
    this._menuEl.querySelector("#st-tab-talents")!.addEventListener("click", () => {
      this._showTalentTree();
    });
    this._menuEl.querySelector("#st-tab-skills")!.addEventListener("mouseenter", (ev) => {
      (ev.target as HTMLElement).style.boxShadow = "0 0 12px rgba(200,168,78,0.3)";
    });
    this._menuEl.querySelector("#st-tab-skills")!.addEventListener("mouseleave", (ev) => {
      (ev.target as HTMLElement).style.boxShadow = "none";
    });
    this._menuEl.querySelector("#st-tab-talents")!.addEventListener("mouseenter", (ev) => {
      (ev.target as HTMLElement).style.borderColor = "#c8a84e";
      (ev.target as HTMLElement).style.boxShadow = "0 0 12px rgba(200,168,78,0.3)";
    });
    this._menuEl.querySelector("#st-tab-talents")!.addEventListener("mouseleave", (ev) => {
      (ev.target as HTMLElement).style.borderColor = "#3a3a2a";
      (ev.target as HTMLElement).style.boxShadow = "none";
    });

    // Wire up branch specialization choice buttons
    const branchOpts = this._menuEl.querySelectorAll(".branch-opt") as NodeListOf<HTMLDivElement>;
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
          this._showSkillTreeScreen(); // refresh to show chosen state
        });
      }
    });
  }

  private _showTalentTree(): void {
    const p = this._state.player;
    const tree = TALENT_TREES[p.class];
    const branchNames = TALENT_BRANCH_NAMES[p.class];

    const renderTree = () => {
      let branchesHtml = "";
      for (let b = 0; b < 3; b++) {
        const branchNodes = tree.filter((n) => n.branch === b);
        const pointsInBranch = this._getTalentPointsInBranch(b);

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
              width:140px;background:rgba(15,10,5,0.9);border:2px solid ${borderColor};
              border-radius:8px;padding:10px;cursor:${canInvest ? "pointer" : "default"};
              pointer-events:auto;opacity:${opacity};transition:border-color 0.2s;
            ">
              <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;">
                <span style="font-size:20px;">${node.icon}</span>
                <span style="color:#c8a84e;font-size:13px;font-weight:bold;">${node.name}</span>
              </div>
              <div style="font-size:11px;color:#aaa;margin-bottom:4px;">${node.description}</div>
              <div style="font-size:12px;color:${isMaxed ? "#ffd700" : "#ccc"};">${rank}/${node.maxRank}</div>
              ${effectsText}
            </div>`;
        }

        branchesHtml += `
          <div style="display:flex;flex-direction:column;gap:8px;align-items:center;">
            <div style="color:#c8a84e;font-size:16px;font-weight:bold;letter-spacing:1px;border-bottom:1px solid #5a4a2a;padding-bottom:4px;width:100%;text-align:center;">${branchNames[b]}</div>
            <div style="font-size:11px;color:#888;">${pointsInBranch} points invested</div>
            ${nodesHtml}
          </div>`;
      }

      // Summary of active bonuses
      const bonuses = this._getTalentBonuses();
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

      this._menuEl.innerHTML = `
        <div style="
          width:100%;height:100%;background:rgba(0,0,0,0.90);display:flex;flex-direction:column;
          align-items:center;justify-content:center;color:#fff;pointer-events:auto;
        ">
          <h2 style="color:#c8a84e;font-size:32px;letter-spacing:3px;margin-bottom:8px;font-family:'Georgia',serif;
            text-shadow:0 0 15px rgba(200,168,78,0.4);">TALENT TREE</h2>
          <div style="font-size:16px;color:#ffd700;margin-bottom:16px;">Available Points: ${p.talentPoints}</div>
          <div style="display:flex;gap:24px;align-items:flex-start;">${branchesHtml}</div>
          <div style="margin-top:16px;padding:10px;background:rgba(20,15,10,0.9);border:1px solid #5a4a2a;border-radius:8px;">
            ${summaryHtml}
          </div>
          <div style="margin-top:12px;color:#888;font-size:12px;">Press T or Escape to close</div>
        </div>`;

      // Wire up talent node clicks
      const nodes = this._menuEl.querySelectorAll(".talent-node") as NodeListOf<HTMLDivElement>;
      nodes.forEach((el) => {
        const talentId = el.getAttribute("data-talent-id")!;
        const node = tree.find((n) => n.id === talentId)!;
        const rank = p.talents[node.id] || 0;
        const isMaxed = rank >= node.maxRank;
        const pointsInBranch = this._getTalentPointsInBranch(node.branch);
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
            el.style.boxShadow = "none";
          });
          el.addEventListener("click", () => {
            p.talents[node.id] = (p.talents[node.id] || 0) + 1;
            p.talentPoints--;
            this._recalculatePlayerStats();
            renderTree();
          });
        }
      });
    };

    renderTree();
  }

  // ──────────────────────────────────────────────────────────────
  //  LANTERN TOGGLE
  // ──────────────────────────────────────────────────────────────
  private _toggleLantern(): void {
    const p = this._state.player;
    if (!p.equipment.lantern) {
      this._addFloatingText(p.x, p.y + 2, p.z, "No lantern equipped!", "#ff4444");
      return;
    }
    p.lanternOn = !p.lanternOn;
    const cfg = LANTERN_CONFIGS[p.equipment.lantern.name];
    if (p.lanternOn && cfg) {
      this._renderer.setPlayerLantern(true, cfg.intensity, cfg.distance, cfg.color);
      this._addFloatingText(p.x, p.y + 2, p.z, "Lantern lit", "#ffcc44");
    } else {
      this._renderer.setPlayerLantern(false);
      this._addFloatingText(p.x, p.y + 2, p.z, "Lantern doused", "#888888");
      p.lanternOn = false;
    }
  }

  // ──────────────────────────────────────────────────────────────
  //  POTION SYSTEM
  // ──────────────────────────────────────────────────────────────
  private _useQuickPotion(type: PotionType.HEALTH | PotionType.MANA): void {
    const p = this._state.player;
    if (p.potionCooldown > 0) return;

    // Find from potion slots first, then inventory
    for (let i = 0; i < 4; i++) {
      const pot = p.potionSlots[i];
      if (pot && ((type === PotionType.HEALTH && (pot.type === PotionType.HEALTH || pot.type === PotionType.REJUVENATION))
        || (type === PotionType.MANA && (pot.type === PotionType.MANA || pot.type === PotionType.REJUVENATION)))) {
        this._consumePotion(pot, i);
        return;
      }
    }
    // Fallback to potion inventory
    for (let i = 0; i < p.potions.length; i++) {
      const pot = p.potions[i];
      if ((type === PotionType.HEALTH && (pot.type === PotionType.HEALTH || pot.type === PotionType.REJUVENATION))
        || (type === PotionType.MANA && (pot.type === PotionType.MANA || pot.type === PotionType.REJUVENATION))) {
        this._consumePotionFromInventory(i);
        return;
      }
    }
  }

  private _usePotionSlot(slotIdx: number): void {
    const p = this._state.player;
    if (p.potionCooldown > 0) return;
    const pot = p.potionSlots[slotIdx];
    if (!pot) return;
    this._consumePotion(pot, slotIdx);
  }

  private _consumePotion(pot: DiabloPotion, slotIdx: number): void {
    const p = this._state.player;
    this._applyPotionEffect(pot);
    p.potionSlots[slotIdx] = null;
    p.potionCooldown = pot.cooldown;
  }

  private _consumePotionFromInventory(idx: number): void {
    const p = this._state.player;
    const pot = p.potions[idx];
    this._applyPotionEffect(pot);
    p.potions.splice(idx, 1);
    p.potionCooldown = pot.cooldown;
  }

  private _applyPotionEffect(pot: DiabloPotion): void {
    const p = this._state.player;
    switch (pot.type) {
      case PotionType.HEALTH:
        p.hp = Math.min(p.maxHp, p.hp + pot.value);
        this._addFloatingText(p.x, p.y + 2.5, p.z, `+${pot.value} HP`, "#44ff44");
        break;
      case PotionType.MANA:
        p.mana = Math.min(p.maxMana, p.mana + pot.value);
        this._addFloatingText(p.x, p.y + 2.5, p.z, `+${pot.value} Mana`, "#4488ff");
        break;
      case PotionType.REJUVENATION:
        p.hp = Math.min(p.maxHp, p.hp + pot.value);
        p.mana = Math.min(p.maxMana, p.mana + 150);
        this._addFloatingText(p.x, p.y + 2.5, p.z, `+${pot.value} HP`, "#44ff44");
        this._addFloatingText(p.x, p.y + 3.5, p.z, "+150 Mana", "#4488ff");
        break;
      case PotionType.STRENGTH:
        p.activePotionBuffs.push({ type: PotionType.STRENGTH, value: pot.value, remaining: pot.duration || 30 });
        this._addFloatingText(p.x, p.y + 2.5, p.z, `+${pot.value}% Damage!`, "#ff8800");
        break;
      case PotionType.SPEED:
        p.activePotionBuffs.push({ type: PotionType.SPEED, value: pot.value, remaining: pot.duration || 20 });
        this._addFloatingText(p.x, p.y + 2.5, p.z, `+${pot.value}% Speed!`, "#44ffff");
        this._recalculatePlayerStats();
        break;
    }
  }

  // ──────────────────────────────────────────────────────────────
  //  ELEMENTAL RESISTANCE DAMAGE REDUCTION
  // ──────────────────────────────────────────────────────────────
  private _getPlayerResistances(): { fire: number; ice: number; lightning: number; poison: number } {
    const p = this._state.player;
    let fire = 0, ice = 0, lightning = 0, poison = 0;
    const equipKeys: (keyof DiabloEquipment)[] = [
      "helmet", "body", "gauntlets", "legs", "feet", "accessory1", "accessory2", "weapon", "lantern",
    ];
    for (const key of equipKeys) {
      const item = p.equipment[key];
      if (!item) continue;
      const s = item.stats as any;
      if (s.fireResist) fire += s.fireResist;
      if (s.iceResist) ice += s.iceResist;
      if (s.lightningResist) lightning += s.lightningResist;
      if (s.poisonResist) poison += s.poisonResist;
    }
    const talentBonuses = this._getTalentBonuses();
    const allResist = talentBonuses[TalentEffectType.RESISTANCE_ALL] || 0;
    fire += allResist;
    ice += allResist;
    lightning += allResist;
    poison += allResist;
    return { fire, ice, lightning, poison };
  }

  private _applyPlayerDefenses(rawDmg: number, dmgType: DamageType): number {
    const p = this._state.player;
    const resists = this._getPlayerResistances();

    // Physical: armor only
    if (dmgType === DamageType.PHYSICAL) {
      return Math.max(1, rawDmg - p.armor * 0.3);
    }

    // Apply armor first
    let afterArmor = Math.max(1, rawDmg - p.armor * 0.15);

    // Get elemental resistance
    let resist = 0;
    switch (dmgType) {
      case DamageType.FIRE: resist = resists.fire; break;
      case DamageType.ICE: resist = resists.ice; break;
      case DamageType.LIGHTNING: resist = resists.lightning; break;
      case DamageType.POISON: resist = resists.poison; break;
      case DamageType.ARCANE:
      case DamageType.SHADOW:
        resist = (resists.fire + resists.ice + resists.lightning + resists.poison) / 4;
        break;
      default:
        resist = 0;
    }

    // Diminishing returns: reduction = resist / (resist + 100)
    const reduction = resist / (resist + 100);
    return Math.max(1, afterArmor * (1 - reduction));
  }

  // ──────────────────────────────────────────────────────────────
  //  QUEST SYSTEM
  // ──────────────────────────────────────────────────────────────
  private _updateQuestTracker(): void {
    const active = this._state.activeQuests.filter(q => q.isActive && !q.isComplete);
    if (active.length === 0) {
      this._questTracker.style.display = "none";
      return;
    }
    this._questTracker.style.display = "block";
    let html = `<div style="color:#c8a84e;font-size:13px;font-weight:bold;margin-bottom:6px;border-bottom:1px solid #5a4a2a;padding-bottom:4px;">QUESTS</div>`;
    for (const q of active) {
      const pct = Math.min(100, (q.progress / q.required) * 100);
      html += `
        <div style="margin-bottom:6px;">
          <div style="font-size:11px;color:#ddd;margin-bottom:2px;">${q.name}</div>
          <div style="width:100%;height:6px;background:rgba(30,25,15,0.9);border-radius:3px;overflow:hidden;">
            <div style="width:${pct}%;height:100%;background:linear-gradient(90deg,#c8a84e,#ffd700);border-radius:3px;"></div>
          </div>
          <div style="font-size:10px;color:#888;margin-top:1px;">${q.progress}/${q.required}</div>
        </div>`;
    }
    this._questTracker.innerHTML = html;
  }

  private _updateQuestProgress(type: QuestType, context: string | undefined): void {
    for (const quest of this._state.activeQuests) {
      if (quest.isComplete || !quest.isActive) continue;
      if (quest.type !== type) continue;

      let matches = false;
      switch (type) {
        case QuestType.KILL_COUNT:
          if (quest.mapId && quest.mapId === context) matches = true;
          else if (!quest.mapId) matches = true;
          break;
        case QuestType.KILL_SPECIFIC:
          if (quest.target.enemyType === context) matches = true;
          break;
        case QuestType.CLEAR_MAP:
          if (quest.id === 'q_completionist') {
            quest.progress = Object.keys(this._state.completedMaps).length;
            if (quest.progress >= quest.required) this._completeQuest(quest);
            return;
          }
          if (quest.target.mapId === context || !quest.target.mapId) matches = true;
          break;
        case QuestType.BOSS_KILL:
          if (!quest.mapId || quest.mapId === context) matches = true;
          break;
        case QuestType.NIGHT_BOSS:
          matches = true;
          break;
        case QuestType.COLLECT_GOLD:
          quest.progress = this._state.player.gold;
          if (quest.progress >= quest.required) this._completeQuest(quest);
          return;
        case QuestType.TREASURE_HUNT:
          quest.progress = this._chestsOpened;
          if (quest.progress >= quest.required) this._completeQuest(quest);
          return;
      }

      if (matches) {
        quest.progress++;
        if (quest.progress >= quest.required) {
          this._completeQuest(quest);
        }
      }
    }
  }

  private _completeQuest(quest: DiabloQuest): void {
    quest.isComplete = true;
    quest.isActive = false;
    this._state.completedQuestIds.push(quest.id);

    const p = this._state.player;
    p.gold += quest.rewards.gold;
    p.xp += quest.rewards.xp;

    if (quest.rewards.itemRarity) {
      const item = this._pickRandomItemOfRarity(quest.rewards.itemRarity);
      if (item) {
        const emptyIdx = p.inventory.findIndex(s => s.item === null);
        if (emptyIdx >= 0) {
          p.inventory[emptyIdx].item = { ...item, id: this._genId() };
        } else {
          const loot: DiabloLoot = {
            id: this._genId(), item: { ...item, id: this._genId() },
            x: p.x + (Math.random() * 2 - 1), y: 0, z: p.z + (Math.random() * 2 - 1), timer: 0,
          };
          this._state.loot.push(loot);
        }
      }
    }

    this._addFloatingText(p.x, p.y + 4, p.z, `QUEST COMPLETE: ${quest.name}!`, "#ffd700");
    this._addFloatingText(p.x, p.y + 3, p.z, `+${quest.rewards.gold} Gold  +${quest.rewards.xp} XP`, "#c8a84e");

    this._state.activeQuests = this._state.activeQuests.filter(q => q.id !== quest.id);
  }

  private _showQuestBoard(): void {
    const available = QUEST_DATABASE.filter(
      q => !this._state.completedQuestIds.includes(q.id) &&
           !this._state.activeQuests.some(aq => aq.id === q.id)
    );
    const active = this._state.activeQuests.filter(q => q.isActive);
    const completed = this._state.completedQuestIds;

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

    this._menuEl.innerHTML = `
      <div style="
        width:100%;height:100%;background:rgba(0,0,0,0.88);display:flex;flex-direction:column;
        align-items:center;justify-content:center;color:#fff;pointer-events:auto;
      ">
        <div style="
          max-width:900px;width:92%;background:rgba(15,10,5,0.95);border:2px solid #5a4a2a;
          border-radius:12px;padding:24px 30px;max-height:88vh;overflow-y:auto;
        ">
          <h2 style="color:#c8a84e;font-size:32px;letter-spacing:3px;margin:0 0 16px;text-align:center;font-family:'Georgia',serif;
            text-shadow:0 0 15px rgba(200,168,78,0.4);">QUEST BOARD</h2>
          <div style="color:#888;font-size:12px;text-align:center;margin-bottom:16px;">${completed.length} quests completed | ${active.length}/5 active</div>
          <div style="display:flex;gap:20px;">
            <div style="flex:1;min-width:0;">
              <div style="color:#c8a84e;font-size:14px;font-weight:bold;margin-bottom:8px;">AVAILABLE QUESTS</div>
              <div style="display:flex;flex-direction:column;gap:8px;max-height:400px;overflow-y:auto;">
                ${availHtml || '<div style="color:#666;font-size:13px;">No quests available.</div>'}
              </div>
            </div>
            <div style="flex:1;min-width:0;">
              <div style="color:#ffd700;font-size:14px;font-weight:bold;margin-bottom:8px;">ACTIVE QUESTS</div>
              <div style="display:flex;flex-direction:column;gap:8px;max-height:400px;overflow-y:auto;">
                ${activeHtml || '<div style="color:#666;font-size:13px;">No active quests.</div>'}
              </div>
            </div>
          </div>
          <div id="quest-status" style="margin-top:10px;text-align:center;color:#ff4444;font-size:14px;min-height:20px;"></div>
          <div style="text-align:center;margin-top:16px;">
            <button id="quest-close-btn" style="
              padding:12px 40px;font-size:18px;letter-spacing:3px;font-weight:bold;
              background:rgba(40,30,15,0.9);border:2px solid #5a4a2a;border-radius:8px;color:#c8a84e;
              cursor:pointer;transition:all 0.2s;font-family:'Georgia',serif;pointer-events:auto;
            ">CLOSE</button>
          </div>
          <div style="text-align:center;margin-top:8px;color:#888;font-size:12px;">Press J or Escape to close</div>
        </div>
      </div>`;

    const statusEl = this._menuEl.querySelector("#quest-status") as HTMLDivElement;
    const showStatus = (msg: string, color: string) => {
      statusEl.textContent = msg;
      statusEl.style.color = color;
      setTimeout(() => { statusEl.textContent = ""; }, 2000);
    };

    const availSlots = this._menuEl.querySelectorAll(".quest-available") as NodeListOf<HTMLDivElement>;
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
        if (quest.type === QuestType.COLLECT_GOLD) quest.progress = this._state.player.gold;
        if (quest.type === QuestType.TREASURE_HUNT) quest.progress = this._chestsOpened;
        this._state.activeQuests.push(quest);
        showStatus(`Accepted: ${quest.name}`, "#44ff44");
        this._showQuestBoard();
      });
    });

    const abandonBtns = this._menuEl.querySelectorAll(".quest-abandon") as NodeListOf<HTMLButtonElement>;
    abandonBtns.forEach(btn => {
      btn.addEventListener("click", (ev) => {
        ev.stopPropagation();
        const qId = btn.getAttribute("data-quest-id")!;
        this._state.activeQuests = this._state.activeQuests.filter(q => q.id !== qId);
        showStatus("Quest abandoned.", "#ff8800");
        this._showQuestBoard();
      });
    });

    const closeBtn = this._menuEl.querySelector("#quest-close-btn") as HTMLButtonElement;
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
    closeBtn.addEventListener("click", () => { this._closeOverlay(); });
  }

  // ──────────────────────────────────────────────────────────────
  //  CRAFTING SYSTEM
  // ──────────────────────────────────────────────────────────────
  private _showCraftingUI(vendor: DiabloVendor, mode: 'blacksmith' | 'jeweler'): void {
    const p = this._state.player;
    this._phaseBeforeOverlay = DiabloPhase.PLAYING;
    this._state.phase = DiabloPhase.INVENTORY;

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

      this._menuEl.innerHTML = `
        <div style="
          width:100%;height:100%;background:rgba(0,0,0,0.88);display:flex;flex-direction:column;
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

      const statusEl = this._menuEl.querySelector("#craft-status") as HTMLDivElement;
      const showStatus = (msg: string, color: string) => {
        statusEl.textContent = msg;
        statusEl.style.color = color;
        setTimeout(() => { statusEl.textContent = ""; }, 2500);
      };

      // Recipe click
      const recipeSlots = this._menuEl.querySelectorAll(".craft-recipe") as NodeListOf<HTMLDivElement>;
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
              const outputItem = this._pickRandomItemOfRarity(recipe.outputRarity!);
              if (outputItem) {
                const emptyIdx = p.inventory.findIndex(s => s.item === null);
                if (emptyIdx >= 0) p.inventory[emptyIdx].item = { ...outputItem, id: this._genId() };
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
      const invSlots = this._menuEl.querySelectorAll(".craft-inv-slot") as NodeListOf<HTMLDivElement>;
      invSlots.forEach(el => {
        const idx = parseInt(el.getAttribute("data-inv-idx")!, 10);
        el.addEventListener("mouseenter", (ev) => this._showItemTooltip(ev, p.inventory[idx].item));
        el.addEventListener("mouseleave", () => this._hideItemTooltip());
        if (isBlacksmith) {
          el.addEventListener("contextmenu", (ev) => {
            ev.preventDefault();
            ev.stopPropagation();
            const item = p.inventory[idx].item;
            if (!item) return;
            const materials = SALVAGE_MATERIAL_YIELDS[item.rarity] || 1;
            p.salvageMaterials += materials;
            p.inventory[idx].item = null;
            showStatus(`Salvaged ${item.name} for ${materials} materials.`, "#88ccff");
            renderCrafting();
          });
        }
      });

      // Shop button
      const shopBtn = this._menuEl.querySelector("#craft-shop-btn") as HTMLButtonElement;
      shopBtn.addEventListener("mouseenter", () => { shopBtn.style.borderColor = "#c8a84e"; shopBtn.style.boxShadow = "0 0 15px rgba(200,168,78,0.3)"; });
      shopBtn.addEventListener("mouseleave", () => { shopBtn.style.borderColor = "#5a4a2a"; shopBtn.style.boxShadow = "none"; });
      shopBtn.addEventListener("click", () => { this._showVendorShop(vendor); });

      // Close button
      const closeBtn = this._menuEl.querySelector("#craft-close-btn") as HTMLButtonElement;
      closeBtn.addEventListener("mouseenter", () => { closeBtn.style.borderColor = "#c8a84e"; closeBtn.style.boxShadow = "0 0 15px rgba(200,168,78,0.3)"; });
      closeBtn.addEventListener("mouseleave", () => { closeBtn.style.borderColor = "#5a4a2a"; closeBtn.style.boxShadow = "none"; });
      closeBtn.addEventListener("click", () => {
        this._state.phase = DiabloPhase.PLAYING;
        this._menuEl.innerHTML = "";
      });
    };

    renderCrafting();
  }

  // ──────────────────────────────────────────────────────────────
  //  FOG OF WAR / EXPLORATION
  // ──────────────────────────────────────────────────────────────
  private _revealAroundPlayer(px: number, pz: number): void {
    const mapCfg = MAP_CONFIGS[this._state.currentMap];
    const halfW = mapCfg.width / 2;
    const halfD = mapCfg.depth / 2;
    const revealRadius = 40;
    const gx = Math.floor(px + halfW);
    const gz = Math.floor(pz + halfD);
    const grid = this._state.exploredGrid;
    for (let dx = -revealRadius; dx <= revealRadius; dx++) {
      for (let dz = -revealRadius; dz <= revealRadius; dz++) {
        if (dx * dx + dz * dz > revealRadius * revealRadius) continue;
        const x = gx + dx;
        const z = gz + dz;
        if (x >= 0 && x < mapCfg.width && z >= 0 && z < mapCfg.depth) {
          if (grid[x]) grid[x][z] = true;
        }
      }
    }
  }

  private _isExplored(wx: number, wz: number): boolean {
    const mapCfg = MAP_CONFIGS[this._state.currentMap];
    const halfW = mapCfg.width / 2;
    const halfD = mapCfg.depth / 2;
    const gx = Math.floor(wx + halfW);
    const gz = Math.floor(wz + halfD);
    const grid = this._state.exploredGrid;
    if (gx < 0 || gx >= mapCfg.width || gz < 0 || gz >= mapCfg.depth) return false;
    return grid[gx] ? grid[gx][gz] : false;
  }

  // ──────────────────────────────────────────────────────────────
  //  HIT PARTICLES
  // ──────────────────────────────────────────────────────────────
  private _spawnHitParticles(enemy: DiabloEnemy, damageType: DamageType): void {
    const isArmored = enemy.type === EnemyType.BONE_GOLEM || enemy.type === EnemyType.SAND_GOLEM ||
      enemy.type === EnemyType.INFERNAL_KNIGHT || enemy.type === EnemyType.DRAKE_GUARDIAN;

    switch (damageType) {
      case DamageType.FIRE:
        this._renderer.spawnParticles(ParticleType.FIRE, enemy.x, enemy.y + 1, enemy.z, 5 + Math.floor(Math.random() * 4), this._state.particles);
        break;
      case DamageType.ICE:
        this._renderer.spawnParticles(ParticleType.ICE, enemy.x, enemy.y + 1, enemy.z, 5 + Math.floor(Math.random() * 4), this._state.particles);
        break;
      case DamageType.POISON:
        this._renderer.spawnParticles(ParticleType.POISON, enemy.x, enemy.y + 1, enemy.z, 3 + Math.floor(Math.random() * 3), this._state.particles);
        break;
      case DamageType.LIGHTNING:
        this._renderer.spawnParticles(ParticleType.LIGHTNING, enemy.x, enemy.y + 1, enemy.z, 4 + Math.floor(Math.random() * 3), this._state.particles);
        break;
      default:
        if (isArmored) {
          this._renderer.spawnParticles(ParticleType.SPARK, enemy.x, enemy.y + 1, enemy.z, 3 + Math.floor(Math.random() * 4), this._state.particles);
        } else {
          this._renderer.spawnParticles(ParticleType.BLOOD, enemy.x, enemy.y + 1, enemy.z, 3 + Math.floor(Math.random() * 4), this._state.particles);
        }
        break;
    }
  }
}
