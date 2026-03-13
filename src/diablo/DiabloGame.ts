import { DiabloRenderer } from "./DiabloRenderer";
import {
  DiabloState, DiabloEnemy, DiabloProjectile, DiabloLoot,
  DiabloTreasureChest, DiabloAOE,
  DiabloClass, DiabloMapId, DiabloPhase, ItemRarity,
  SkillId, EnemyState, StatusEffect,
  DiabloItem, DiabloEquipment,
  createDefaultPlayer, createDefaultState
} from "./DiabloTypes";
import {
  SKILL_DEFS, MAP_CONFIGS, ENEMY_DEFS, ITEM_DATABASE, SET_BONUSES,
  LOOT_TABLES, RARITY_NAMES, XP_TABLE,
  ENEMY_SPAWN_WEIGHTS
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
};

// ────────────────────────────────────────────────────────────────────────────
// Boss names per map
// ────────────────────────────────────────────────────────────────────────────
const BOSS_NAMES: Record<DiabloMapId, string[]> = {
  [DiabloMapId.FOREST]: ["Oakrot the Ancient", "Grimfang Alpha", "Bandit King Varros"],
  [DiabloMapId.ELVEN_VILLAGE]: ["Shadowlord Ael'thar", "Corrupted Archon", "Darkstalker Prime"],
  [DiabloMapId.NECROPOLIS_DUNGEON]: ["Lich Overlord Morthis", "Bonecrusher", "Wraith King Null"],
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
        this._state.phase = DiabloPhase.INVENTORY;
        this._showInventory();
      } else if (e.code === "Escape") {
        this._state.phase = DiabloPhase.PAUSED;
        this._showPauseMenu();
      } else if (e.code === "Space") {
        this._doDodgeRoll();
      }
    } else if (this._state.phase === DiabloPhase.INVENTORY) {
      if (e.code === "Escape" || e.code === "KeyI") {
        this._state.phase = DiabloPhase.PLAYING;
        this._menuEl.innerHTML = "";
      }
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
        <div style="display:flex;gap:30px;">${cardsHtml}</div>
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
    }[] = [
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
          <div style="font-size:20px;color:#ff8;">Difficulty: ${m.difficulty}</div>
        </div>`;
    }

    this._menuEl.innerHTML = `
      <div style="
        width:100%;height:100%;background:rgba(0,0,0,0.92);display:flex;flex-direction:column;
        align-items:center;justify-content:center;color:#fff;
      ">
        <h1 style="
          color:#c8a84e;font-size:42px;letter-spacing:4px;margin-bottom:50px;
          text-shadow:0 0 20px rgba(200,168,78,0.5),0 2px 4px rgba(0,0,0,0.8);
          font-family:'Georgia',serif;
        ">SELECT YOUR DESTINATION</h1>
        <div style="display:flex;gap:30px;">${cardsHtml}</div>
      </div>`;

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

    const mapCfg = MAP_CONFIGS[mapId];
    const mapW = mapCfg.width;
    const mapD = (mapCfg as any).depth || (mapCfg as any).height || mapCfg.width;

    this._state.player.x = 0;
    this._state.player.y = 0;
    this._state.player.z = 0;
    this._state.player.hp = this._state.player.maxHp;
    this._state.player.mana = this._state.player.maxMana;

    this._renderer.buildMap(mapId);
    this._renderer.buildPlayer(this._state.player.class);

    // Spawn initial enemies
    const initialCount = 8 + Math.floor(Math.random() * 5);
    for (let i = 0; i < initialCount; i++) {
      this._spawnEnemy();
    }

    // Spawn treasure chests
    const chestCount = 5 + Math.floor(Math.random() * 4);
    for (let i = 0; i < chestCount; i++) {
      const halfW = mapW / 2 - 5;
      const halfD = mapD / 2 - 5;
      const cx = (Math.random() * 2 - 1) * halfW;
      const cz = (Math.random() * 2 - 1) * halfD;
      const rarity = Math.random() < 0.1
        ? ItemRarity.EPIC
        : Math.random() < 0.3
          ? ItemRarity.RARE
          : ItemRarity.UNCOMMON;
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

    this._state.phase = DiabloPhase.PLAYING;
    this._menuEl.innerHTML = "";
    this._hud.style.display = "block";
    this._recalculatePlayerStats();
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
          <div style="background:rgba(20,15,10,0.9);border:1px solid #5a4a2a;border-radius:8px;padding:12px;">
            ${statsHtml}
          </div>
        </div>
        <div style="margin-top:16px;color:#888;font-size:12px;">Press I or Escape to close</div>
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
    this._menuEl.innerHTML = `
      <div style="
        width:100%;height:100%;background:rgba(0,0,0,0.8);display:flex;flex-direction:column;
        align-items:center;justify-content:center;color:#fff;
      ">
        <h1 style="color:#c8a84e;font-size:48px;letter-spacing:6px;margin-bottom:40px;
          font-family:'Georgia',serif;text-shadow:0 0 20px rgba(200,168,78,0.4);">PAUSED</h1>
        <button id="diablo-resume-btn" style="
          background:rgba(40,30,15,0.9);border:2px solid #c8a84e;color:#c8a84e;font-size:20px;
          padding:14px 50px;cursor:pointer;border-radius:8px;margin-bottom:16px;
          font-family:'Georgia',serif;letter-spacing:2px;pointer-events:auto;
        ">RESUME</button>
        <button id="diablo-exit-btn" style="
          background:rgba(40,15,15,0.9);border:2px solid #a44;color:#e66;font-size:20px;
          padding:14px 50px;cursor:pointer;border-radius:8px;
          font-family:'Georgia',serif;letter-spacing:2px;pointer-events:auto;
        ">EXIT</button>
      </div>`;

    this._menuEl.querySelector("#diablo-resume-btn")!.addEventListener("click", () => {
      this._state.phase = DiabloPhase.PLAYING;
      this._menuEl.innerHTML = "";
    });
    this._menuEl.querySelector("#diablo-exit-btn")!.addEventListener("click", () => {
      window.dispatchEvent(new CustomEvent("diabloExit"));
    });
  }

  // ──────────────────────────────────────────────────────────────
  //  GAME OVER SCREEN
  // ──────────────────────────────────────────────────────────────
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

    // Mark map as cleared
    const mapIdx = this._state.currentMap === DiabloMapId.FOREST ? 0
      : this._state.currentMap === DiabloMapId.ELVEN_VILLAGE ? 1 : 2;
    this._state.mapCleared[mapIdx] = true;

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
          <div style="font-size:16px;">Level: <span style="color:#8af;">${p.level}</span></div>
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
      if (cd > 0) {
        const pct = Math.min(100, (cd / maxCd) * 100);
        this._skillCooldownOverlays[i].style.height = pct + "%";
      } else {
        this._skillCooldownOverlays[i].style.height = "0%";
      }
    }

    // XP bar
    const xpPct = p.xpToNext > 0 ? (p.xp / p.xpToNext) * 100 : 0;
    this._xpBar.style.width = Math.min(100, xpPct) + "%";

    // Top right
    this._goldText.textContent = `\uD83E\uDE99 ${p.gold}`;
    this._levelText.textContent = `Lv. ${p.level}`;
    this._killText.textContent = `Kills: ${this._state.killCount}`;
  }

  // ──────────────────────────────────────────────────────────────
  //  GAME LOOP
  // ──────────────────────────────────────────────────────────────
  private _gameLoop = (ts: number): void => {
    const dt = Math.min((ts - this._lastTime) / 1000, 0.1);
    this._lastTime = ts;

    if (this._state.phase === DiabloPhase.PLAYING) {
      this._processInput(dt);
      this._updatePlayer(dt);
      this._updateEnemies(dt);
      this._updateCombat(dt);
      this._updateProjectiles(dt);
      this._updateAOE(dt);
      this._updateLoot(dt);
      this._updateSpawning(dt);
      this._updateStatusEffects(dt);
      this._updateFloatingText(dt);
      this._checkMapClear();
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

      this._addFloatingText(p.x, p.y + 3, p.z, "LEVEL UP!", "#ffd700");
      this._recalculatePlayerStats();
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

      switch (enemy.state) {
        case EnemyState.IDLE: {
          enemy.stateTimer += dt;
          if (dist <= enemy.aggroRange) {
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
          if (dist <= enemy.aggroRange) {
            enemy.state = EnemyState.CHASE;
            enemy.stateTimer = 0;
          }
          break;
        }
        case EnemyState.CHASE: {
          if (isStunned || isFrozen) break;
          if (dist <= enemy.attackRange) {
            enemy.state = EnemyState.ATTACK;
            enemy.attackTimer = 0.5;
            enemy.stateTimer = 0;
          } else if (!enemy.isBoss && dist > enemy.aggroRange * 1.5) {
            enemy.state = EnemyState.IDLE;
            enemy.stateTimer = 0;
          } else {
            const dx = p.x - enemy.x;
            const dz = p.z - enemy.z;
            const cLen = Math.sqrt(dx * dx + dz * dz);
            if (cLen > 0) {
              enemy.x += (dx / cLen) * effectiveSpeed * dt;
              enemy.z += (dz / cLen) * effectiveSpeed * dt;
            }
            enemy.angle = Math.atan2(dx, dz);
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

                const mitigated = Math.max(1, rawDmg - p.armor * 0.3);
                p.hp -= mitigated;
                this._addFloatingText(p.x, p.y + 2, p.z, `-${Math.round(mitigated)}`, "#ff4444");

                if (p.hp <= 0) {
                  p.hp = 0;
                  this._showGameOver();
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

    // Crit check
    const isCrit = Math.random() < p.critChance;
    if (isCrit) baseDamage *= p.critDamage;

    // Apply enemy armor reduction
    const finalDamage = Math.max(1, baseDamage - target.armor * 0.2);

    target.hp -= finalDamage;

    // Floating text
    if (isCrit) {
      this._addFloatingText(target.x, target.y + 2.5, target.z, `CRIT! ${Math.round(finalDamage)}`, "#ff4444");
    } else {
      this._addFloatingText(target.x, target.y + 2, target.z, `${Math.round(finalDamage)}`, "#ffff44");
    }

    // Life steal
    const lifeStealPct = this._getLifeSteal();
    if (lifeStealPct > 0) {
      const healed = finalDamage * lifeStealPct / 100;
      p.hp = Math.min(p.maxHp, p.hp + healed);
    }

    // Reset attack timer
    p.attackTimer = 1.0 / p.attackSpeed;
    p.isAttacking = true;

    // Check enemy death
    if (target.hp <= 0) {
      target.hp = 0;
      target.state = EnemyState.DYING;
      target.deathTimer = 0;
      p.xp += target.xpReward;
      p.gold += Math.floor(5 + Math.random() * 10 * target.level);
      this._state.killCount++;
      this._targetEnemyId = null;

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
    if (p.mana < def.manaCost) return;

    p.mana -= def.manaCost;
    p.skillCooldowns.set(skillId, def.cooldown);
    p.activeSkillId = skillId;
    p.activeSkillAnimTimer = 0.5;

    const worldMouse = this._getMouseWorldPos();
    const angle = Math.atan2(worldMouse.x - p.x, worldMouse.z - p.z);
    const baseDmg = this._getSkillDamage(def);

    switch (skillId) {
      // ── PROJECTILE SKILLS ──
      case SkillId.FIREBALL:
      case SkillId.LIGHTNING_BOLT:
      case SkillId.POISON_ARROW:
      case SkillId.PIERCING_SHOT: {
        this._createProjectile(p.x, p.y + 1, p.z, angle, baseDmg, def, skillId);
        break;
      }

      case SkillId.MULTI_SHOT: {
        const spread = 0.3;
        for (let i = -2; i <= 2; i++) {
          this._createProjectile(p.x, p.y + 1, p.z, angle + i * spread, baseDmg * 0.8, def, skillId);
        }
        break;
      }

      case SkillId.CHAIN_LIGHTNING: {
        // Fires a projectile that, on hit, chains to nearby enemies
        this._createProjectile(p.x, p.y + 1, p.z, angle, baseDmg, def, skillId);
        break;
      }

      // ── AOE AT PLAYER ──
      case SkillId.CLEAVE:
      case SkillId.WHIRLWIND:
      case SkillId.ICE_NOVA:
      case SkillId.GROUND_SLAM:
      case SkillId.BLADE_FURY:
      case SkillId.SHIELD_BASH: {
        const radius = def.aoeRadius || 3;
        const aoe: DiabloAOE = {
          id: this._genId(),
          x: p.x,
          y: 0,
          z: p.z,
          radius,
          damage: baseDmg,
          damageType: def.damageType,
          duration: 0.3,
          timer: 0,
          ownerId: "player",
          tickInterval: 0.3,
          lastTickTimer: 0,
          statusEffect: def.statusEffect,
        };
        this._state.aoeEffects.push(aoe);
        // Immediate damage tick for melee AOE
        this._tickAOEDamage(aoe);
        break;
      }

      // ── AOE AT TARGET ──
      case SkillId.METEOR: {
        const radius = def.aoeRadius || 6;
        const aoe: DiabloAOE = {
          id: this._genId(),
          x: worldMouse.x,
          y: 0,
          z: worldMouse.z,
          radius,
          damage: baseDmg,
          damageType: def.damageType,
          duration: 1.5,
          timer: 0,
          ownerId: "player",
          tickInterval: 0.5,
          lastTickTimer: 0,
          statusEffect: def.statusEffect,
        };
        this._state.aoeEffects.push(aoe);
        break;
      }

      case SkillId.RAIN_OF_ARROWS: {
        const radius = def.aoeRadius || 6;
        const aoe: DiabloAOE = {
          id: this._genId(),
          x: worldMouse.x,
          y: 0,
          z: worldMouse.z,
          radius,
          damage: baseDmg,
          damageType: def.damageType,
          duration: 2.0,
          timer: 0,
          ownerId: "player",
          tickInterval: 0.4,
          lastTickTimer: 0,
        };
        this._state.aoeEffects.push(aoe);
        break;
      }

      case SkillId.EXPLOSIVE_TRAP: {
        const radius = def.aoeRadius || 4;
        const aoe: DiabloAOE = {
          id: this._genId(),
          x: worldMouse.x,
          y: 0,
          z: worldMouse.z,
          radius,
          damage: baseDmg,
          damageType: def.damageType,
          duration: 10.0, // trap lasts 10 seconds
          timer: 0,
          ownerId: "player",
          tickInterval: 10.0, // only triggers once
          lastTickTimer: 0,
          statusEffect: StatusEffect.BURNING,
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
            const finalDmg = Math.max(1, proj.damage - enemy.armor * 0.15);
            enemy.hp -= finalDmg;
            this._addFloatingText(enemy.x, enemy.y + 2, enemy.z, `${Math.round(finalDmg)}`, "#ffff44");

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
    const mapCfg = MAP_CONFIGS[this._state.currentMap];
    const spawnInterval = (mapCfg as any).spawnInterval || 4;

    this._state.spawnTimer += dt;
    if (this._state.spawnTimer >= spawnInterval && this._state.enemies.length < mapCfg.maxEnemies) {
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
          if (p.hp <= 0) { p.hp = 0; this._showGameOver(); return; }
          break;
        case StatusEffect.POISONED:
          p.hp -= 3 * dt;
          if (p.hp <= 0) { p.hp = 0; this._showGameOver(); return; }
          break;
        case StatusEffect.BLEEDING:
          p.hp -= 4 * dt;
          if (p.hp <= 0) { p.hp = 0; this._showGameOver(); return; }
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
    const target = MAP_KILL_TARGET[this._state.currentMap] || 50;
    if (this._state.killCount >= target) {
      const aliveEnemies = this._state.enemies.filter(
        (e) => e.state !== EnemyState.DYING && e.state !== EnemyState.DEAD
      );
      if (aliveEnemies.length === 0) {
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

    const hpMult = isBossSpawn ? 5 : 1;
    const dmgMult = isBossSpawn ? 2 : 1;
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
      armor: def.armor * (isBossSpawn ? 1.5 : 1),
      speed: def.speed,
      state: EnemyState.IDLE,
      targetId: null,
      attackTimer: 1.0,
      attackRange: def.attackRange,
      aggroRange: def.aggroRange * (isBossSpawn ? 1.3 : 1),
      xpReward: def.xpReward * (isBossSpawn ? 5 : 1),
      lootTable: [],
      deathTimer: 0,
      stateTimer: 0,
      patrolTarget: null,
      statusEffects: [],
      isBoss: isBossSpawn || def.isBoss,
      bossName: isBossSpawn ? bossName : undefined,
      scale: def.scale * (isBossSpawn ? 1.8 : 1),
      level: def.level + (isBossSpawn ? 5 : 0),
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

    const p = this._state.player;
    p.xp += enemy.xpReward;
    p.gold += Math.floor(5 + Math.random() * 10 * enemy.level);
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
    this._addFloatingText(chest.x, 2, chest.z, `+${goldBonus} Gold`, "#ffd700");
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
      "helmet", "body", "gauntlets", "legs", "feet", "accessory1", "accessory2", "weapon",
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
      "helmet", "body", "gauntlets", "legs", "feet", "accessory1", "accessory2", "weapon",
    ];
    for (const key of equipKeys) {
      const item = this._state.player.equipment[key];
      if (item) {
        const stats = item.stats as any;
        if (stats.lifeSteal) ls += stats.lifeSteal;
      }
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
      "helmet", "body", "gauntlets", "legs", "feet", "accessory1", "accessory2", "weapon",
    ];
    for (const key of equipKeys) {
      const item = p.equipment[key];
      if (item) {
        const stats = item.stats as any;
        if (stats.bonusDamage) bonusDmg += stats.bonusDamage;
      }
    }

    return (base + bonusDmg) * (def.damageMultiplier || 1);
  }

  // ──────────────────────────────────────────────────────────────
  //  HELPER: Get enemy effective speed
  // ──────────────────────────────────────────────────────────────
  private _getEnemyEffectiveSpeed(enemy: DiabloEnemy): number {
    let speed = enemy.speed;
    if (enemy.statusEffects.some((e) => e.effect === StatusEffect.FROZEN)) return 0;
    if (enemy.statusEffects.some((e) => e.effect === StatusEffect.SLOWED)) speed *= 0.5;
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
}
