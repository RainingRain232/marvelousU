// ============================================================================
// ArthurianRPGHUD.ts – Full HTML overlay HUD for the Arthurian RPG
// ============================================================================

import type {
  ArthurianRPGState,
  CombatantState,
  HitResult,
} from "./ArthurianRPGState";
import type { QuestDef, DialogueNode, DialogueChoice } from "./ArthurianRPGDialogue";
import type { InventorySlot, QuickSlot, ItemDef } from "./ArthurianRPGInventory";

// ---------------------------------------------------------------------------
// Constants & style tokens
// ---------------------------------------------------------------------------

const PARCHMENT = "#f0dfc0";
const PARCHMENT_DARK = "#b89855";
const INK = "#2a1a0e";
const GOLD = "#d4a520";
const BLOOD_RED = "#8b0000";
const MANA_BLUE = "#2266bb";
const STAMINA_GREEN = "#3a8044";
const HEALTH_RED = "#c42222";

const FONT_MAIN = "'Palatino Linotype', 'Book Antiqua', Palatino, serif";
const FONT_TITLE = "'Georgia', serif";
const BORDER_ORNATE = `1px solid ${PARCHMENT_DARK}`;
const SHADOW = "0 2px 12px rgba(0,0,0,0.7)";
const GLASS_BG = "rgba(10, 8, 5, 0.55)";
const GLASS_BORDER = "1px solid rgba(180, 155, 100, 0.35)";
const GLASS_BACKDROP = "blur(8px)";
const GLOW_GOLD = "0 0 8px rgba(212, 165, 32, 0.4)";
const INNER_SHADOW = "inset 0 1px 3px rgba(0,0,0,0.3)";

const BAR_FADE_DELAY = 4000; // ms before full bars fade

// ---------------------------------------------------------------------------
// Helper: create a styled element
// ---------------------------------------------------------------------------

function el(
  tag: string,
  styles: Partial<CSSStyleDeclaration>,
  parent?: HTMLElement,
): HTMLElement {
  const e = document.createElement(tag);
  Object.assign(e.style, styles);
  if (parent) parent.appendChild(e);
  return e;
}

/** Set text content on a DOM element. */
export function assignText(e: HTMLElement, text: string): void {
  e.textContent = text;
}

// ---------------------------------------------------------------------------
// Damage number float
// ---------------------------------------------------------------------------

interface FloatingNumber {
  el: HTMLElement;
  birth: number;
  x: number;
  y: number;
  vy: number;
}

// ---------------------------------------------------------------------------
// Compass marker
// ---------------------------------------------------------------------------

export interface CompassMarker {
  id: string;
  label: string;
  worldX: number;
  worldZ: number;
  type: "quest" | "location" | "enemy";
}

// ---------------------------------------------------------------------------
// Map location for full map screen
// ---------------------------------------------------------------------------

export interface MapLocation {
  id: string;
  name: string;
  x: number;
  z: number;
  discovered: boolean;
  canFastTravel: boolean;
  type: "city" | "dungeon" | "camp" | "shrine" | "landmark";
}

// ---------------------------------------------------------------------------
// Status effect for buff/debuff display
// ---------------------------------------------------------------------------

export interface StatusEffectDisplay {
  id: string;
  name: string;
  icon: string;
  remainingSeconds: number;
  isBuff: boolean;
}

// ---------------------------------------------------------------------------
// Perk tree node for character sheet
// ---------------------------------------------------------------------------

export interface PerkTreeNode {
  id: string;
  name: string;
  description: string;
  x: number; // position in tree visualization
  y: number;
  unlocked: boolean;
  available: boolean;
  parentIds: string[];
}

export interface PerkTree {
  name: string;
  nodes: PerkTreeNode[];
}

// ---------------------------------------------------------------------------
// Callback signatures the HUD uses to communicate with game systems
// ---------------------------------------------------------------------------

export interface HUDCallbacks {
  onQuickSlotUsed(slotIndex: number): void;
  onDialogueChoice(index: number): void;
  onInventoryEquip(itemId: string): void;
  onInventoryUse(itemId: string): void;
  onInventoryDrop(itemId: string): void;
  onShopBuy(itemIndex: number): void;
  onShopSell(itemId: string): void;
  onFastTravel(locationId: string): void;
  onRespawn(): void;
  onCloseOverlay(): void;
}

// ---------------------------------------------------------------------------
// MAIN HUD CLASS
// ---------------------------------------------------------------------------

export class ArthurianRPGHUD {
  private root: HTMLElement;
  private callbacks: HUDCallbacks;

  // Containers
  healthBar!: HTMLElement;
  private healthFill!: HTMLElement;
  manaBar!: HTMLElement;
  private manaFill!: HTMLElement;
  staminaBar!: HTMLElement;
  private staminaFill!: HTMLElement;
  private barContainer!: HTMLElement;
  private barFadeTimeout: ReturnType<typeof setTimeout> | null = null;

  private compassContainer!: HTMLElement;
  private compassStrip!: HTMLElement;

  private minimapCanvas!: HTMLCanvasElement;
  private minimapCtx!: CanvasRenderingContext2D;
  private minimapTerrainCache: HTMLCanvasElement | null = null;
  private minimapTrail: { x: number; z: number }[] = [];

  private quickBarContainer!: HTMLElement;
  private quickSlotEls: HTMLElement[] = [];

  private crosshair!: HTMLElement;
  private interactionPrompt!: HTMLElement;

  private questTracker!: HTMLElement;
  xpBar!: HTMLElement;
  private xpFill!: HTMLElement;
  private levelLabel!: HTMLElement;

  private targetInfo!: HTMLElement;
  private targetName!: HTMLElement;
  private targetHpFill!: HTMLElement;

  private floatingNumbers: FloatingNumber[] = [];
  private floatingContainer!: HTMLElement;

  private levelUpBanner!: HTMLElement;
  private levelUpTimer = 0;

  private dialogueBox!: HTMLElement;
  private dialoguePortrait!: HTMLElement;
  private dialogueSpeaker!: HTMLElement;
  private dialogueText!: HTMLElement;
  private dialogueChoices!: HTMLElement;

  private inventoryScreen!: HTMLElement;
  private inventoryGrid!: HTMLElement;
  private inventoryCategoryTabs!: HTMLElement;
  private inventoryDetailPanel!: HTMLElement;

  private characterSheet!: HTMLElement;
  private charAttributes!: HTMLElement;
  private charSkills!: HTMLElement;
  private perkTreeCanvas!: HTMLCanvasElement;
  private perkTreeCtx!: CanvasRenderingContext2D;

  private mapScreen!: HTMLElement;
  private mapCanvas!: HTMLCanvasElement;
  private mapCtx!: CanvasRenderingContext2D;

  private statusEffectsContainer!: HTMLElement;

  private deathScreen!: HTMLElement;

  // State
  private isInventoryOpen = false;
  private isCharSheetOpen = false;
  private isMapOpen = false;
  private isDialogueActive = false;

  // -----------------------------------------------------------------------
  // Constructor: build all HTML overlays
  // -----------------------------------------------------------------------

  constructor(container: HTMLElement, callbacks: HUDCallbacks) {
    this.callbacks = callbacks;

    this.root = el("div", {
      position: "absolute",
      top: "0",
      left: "0",
      width: "100%",
      height: "100%",
      pointerEvents: "none",
      fontFamily: FONT_MAIN,
      color: INK,
      overflow: "hidden",
      zIndex: "1000",
    }, container);

    this.buildBars();
    this.buildCompass();
    this.buildMinimap();
    this.buildQuickBar();
    this.buildCrosshair();
    this.buildInteractionPrompt();
    this.buildQuestTracker();
    this.buildXPBar();
    this.buildTargetInfo();
    this.buildFloatingNumbers();
    this.buildLevelUpBanner();
    this.buildDialogueBox();
    this.buildInventoryScreen();
    this.buildCharacterSheet();
    this.buildMapScreen();
    this.buildStatusEffects();
    this.buildDeathScreen();

    this.setupKeyBindings();
  }

  // =======================================================================
  // BUILD METHODS
  // =======================================================================

  // ---- Health / Mana / Stamina bars (bottom center, Skyrim-style) --------

  private buildBars(): void {
    this.barContainer = el("div", {
      position: "absolute",
      bottom: "80px",
      left: "50%",
      transform: "translateX(-50%)",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      gap: "4px",
      transition: "opacity 0.8s",
    }, this.root);

    const makeBar = (color: string, width: string): { bar: HTMLElement; fill: HTMLElement } => {
      const bar = el("div", {
        width,
        height: "10px",
        background: "rgba(0,0,0,0.6)",
        borderRadius: "5px",
        border: GLASS_BORDER,
        overflow: "hidden",
        boxShadow: `${INNER_SHADOW}, 0 1px 6px rgba(0,0,0,0.4)`,
      }, this.barContainer);
      const fill = el("div", {
        width: "100%",
        height: "100%",
        background: `linear-gradient(180deg, ${color} 0%, ${color}cc 50%, ${color}88 100%)`,
        borderRadius: "5px",
        transition: "width 0.35s ease-out",
        boxShadow: `0 0 6px ${color}66`,
      }, bar);
      return { bar, fill };
    };

    const hp = makeBar(HEALTH_RED, "300px");
    this.healthBar = hp.bar;
    this.healthFill = hp.fill;

    const mp = makeBar(MANA_BLUE, "250px");
    this.manaBar = mp.bar;
    this.manaFill = mp.fill;

    const st = makeBar(STAMINA_GREEN, "250px");
    this.staminaBar = st.bar;
    this.staminaFill = st.fill;
  }

  // ---- Compass bar (top center) ------------------------------------------

  private buildCompass(): void {
    this.compassContainer = el("div", {
      position: "absolute",
      top: "10px",
      left: "50%",
      transform: "translateX(-50%)",
      width: "500px",
      height: "28px",
      background: GLASS_BG,
      borderRadius: "4px",
      border: GLASS_BORDER,
      overflow: "hidden",
      boxShadow: `${INNER_SHADOW}, ${GLOW_GOLD}`,
      backdropFilter: GLASS_BACKDROP,
    }, this.root);

    this.compassStrip = el("div", {
      position: "relative",
      width: "200%",
      height: "100%",
      display: "flex",
      alignItems: "center",
      color: PARCHMENT,
      fontSize: "11px",
      fontFamily: FONT_MAIN,
      whiteSpace: "nowrap",
    }, this.compassContainer);
  }

  // ---- Minimap (top right) -----------------------------------------------

  private buildMinimap(): void {
    const outerWrapper = el("div", {
      position: "absolute",
      top: "6px",
      right: "6px",
      width: "200px",
      height: "200px",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      pointerEvents: "none",
    }, this.root);

    // Cardinal direction labels
    const labelStyle = {
      position: "absolute" as const,
      color: PARCHMENT,
      fontSize: "11px",
      fontFamily: FONT_MAIN,
      fontWeight: "bold",
      textShadow: "0 0 4px rgba(0,0,0,0.9)",
      pointerEvents: "none" as const,
    };
    const nLabel = document.createElement("span");
    Object.assign(nLabel.style, labelStyle, { top: "0px", left: "50%", transform: "translateX(-50%)" });
    nLabel.textContent = "N";
    nLabel.style.color = "#ffcc44";
    outerWrapper.appendChild(nLabel);

    const sLabel = document.createElement("span");
    Object.assign(sLabel.style, labelStyle, { bottom: "0px", left: "50%", transform: "translateX(-50%)" });
    sLabel.textContent = "S";
    outerWrapper.appendChild(sLabel);

    const eLabel = document.createElement("span");
    Object.assign(eLabel.style, labelStyle, { top: "50%", right: "0px", transform: "translateY(-50%)" });
    eLabel.textContent = "E";
    outerWrapper.appendChild(eLabel);

    const wLabel = document.createElement("span");
    Object.assign(wLabel.style, labelStyle, { top: "50%", left: "0px", transform: "translateY(-50%)" });
    wLabel.textContent = "W";
    outerWrapper.appendChild(wLabel);

    const wrapper = el("div", {
      width: "180px",
      height: "180px",
      borderRadius: "50%",
      border: `3px solid ${PARCHMENT_DARK}`,
      overflow: "hidden",
      boxShadow: SHADOW + ", inset 0 0 12px rgba(0,0,0,0.5)",
      background: "rgba(30,40,20,0.8)",
    }, outerWrapper);

    this.minimapCanvas = document.createElement("canvas");
    this.minimapCanvas.width = 180;
    this.minimapCanvas.height = 180;
    this.minimapCanvas.style.width = "100%";
    this.minimapCanvas.style.height = "100%";
    wrapper.appendChild(this.minimapCanvas);
    this.minimapCtx = this.minimapCanvas.getContext("2d")!;

    // Pre-create terrain cache canvas
    this.minimapTerrainCache = document.createElement("canvas");
    this.minimapTerrainCache.width = 180;
    this.minimapTerrainCache.height = 180;
  }

  // ---- Quick-use bar (bottom center, below bars) -------------------------

  private buildQuickBar(): void {
    this.quickBarContainer = el("div", {
      position: "absolute",
      bottom: "20px",
      left: "50%",
      transform: "translateX(-50%)",
      display: "flex",
      gap: "4px",
      pointerEvents: "auto",
    }, this.root);

    for (let i = 0; i < 8; i++) {
      const slot = el("div", {
        width: "48px",
        height: "48px",
        background: GLASS_BG,
        border: GLASS_BORDER,
        borderRadius: "6px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
        position: "relative",
        fontSize: "20px",
        color: PARCHMENT,
        boxShadow: INNER_SHADOW,
        backdropFilter: GLASS_BACKDROP,
        transition: "border-color 0.2s, box-shadow 0.2s",
      }, this.quickBarContainer);

      // Hotkey label
      const label = el("span", {
        position: "absolute",
        top: "2px",
        left: "4px",
        fontSize: "10px",
        color: GOLD,
      }, slot);
      label.textContent = String(i + 1);

      const idx = i;
      slot.addEventListener("click", () => this.callbacks.onQuickSlotUsed(idx));
      this.quickSlotEls.push(slot);
    }
  }

  // ---- Crosshair (center) ------------------------------------------------

  private buildCrosshair(): void {
    this.crosshair = el("div", {
      position: "absolute",
      top: "50%",
      left: "50%",
      transform: "translate(-50%, -50%)",
      width: "3px",
      height: "3px",
      borderRadius: "50%",
      background: "rgba(255,255,255,0.65)",
      boxShadow: `0 0 3px rgba(255,255,255,0.4), ${GLOW_GOLD}`,
    }, this.root);
  }

  // ---- Interaction prompt ------------------------------------------------

  private buildInteractionPrompt(): void {
    this.interactionPrompt = el("div", {
      position: "absolute",
      top: "55%",
      left: "50%",
      transform: "translateX(-50%)",
      padding: "6px 16px",
      background: "rgba(0,0,0,0.6)",
      borderRadius: "4px",
      border: BORDER_ORNATE,
      color: PARCHMENT,
      fontSize: "14px",
      fontFamily: FONT_MAIN,
      display: "none",
      pointerEvents: "none",
    }, this.root);
  }

  // ---- Quest tracker (right side) ----------------------------------------

  private buildQuestTracker(): void {
    this.questTracker = el("div", {
      position: "absolute",
      top: "200px",
      right: "10px",
      width: "240px",
      maxHeight: "300px",
      overflowY: "auto",
      color: PARCHMENT,
      fontSize: "12px",
      fontFamily: FONT_MAIN,
      background: "rgba(0,0,0,0.3)",
      borderRadius: "6px",
      padding: "8px",
    }, this.root);
  }

  // ---- XP bar (bottom) ---------------------------------------------------

  private buildXPBar(): void {
    const wrapper = el("div", {
      position: "absolute",
      bottom: "0",
      left: "0",
      width: "100%",
      height: "6px",
      background: "rgba(0,0,0,0.4)",
    }, this.root);

    this.xpFill = el("div", {
      width: "0%",
      height: "100%",
      background: `linear-gradient(90deg, ${GOLD}, #ffd700)`,
      transition: "width 0.5s",
    }, wrapper);

    this.xpBar = wrapper;

    this.levelLabel = el("div", {
      position: "absolute",
      bottom: "8px",
      left: "10px",
      color: GOLD,
      fontSize: "11px",
      fontFamily: FONT_MAIN,
    }, this.root);
  }

  // ---- Target info (enemy name + HP) -------------------------------------

  private buildTargetInfo(): void {
    this.targetInfo = el("div", {
      position: "absolute",
      top: "50px",
      left: "50%",
      transform: "translateX(-50%)",
      textAlign: "center",
      display: "none",
    }, this.root);

    this.targetName = el("div", {
      color: PARCHMENT,
      fontSize: "14px",
      fontFamily: FONT_TITLE,
      marginBottom: "4px",
    }, this.targetInfo);

    const barBg = el("div", {
      width: "200px",
      height: "8px",
      background: "rgba(0,0,0,0.5)",
      borderRadius: "4px",
      border: `1px solid ${PARCHMENT_DARK}`,
      overflow: "hidden",
    }, this.targetInfo);

    this.targetHpFill = el("div", {
      width: "100%",
      height: "100%",
      background: HEALTH_RED,
      transition: "width 0.2s",
    }, barBg);
  }

  // ---- Floating damage numbers -------------------------------------------

  private buildFloatingNumbers(): void {
    this.floatingContainer = el("div", {
      position: "absolute",
      top: "0",
      left: "0",
      width: "100%",
      height: "100%",
      pointerEvents: "none",
      overflow: "hidden",
    }, this.root);
  }

  // ---- Level up banner ---------------------------------------------------

  private buildLevelUpBanner(): void {
    this.levelUpBanner = el("div", {
      position: "absolute",
      top: "30%",
      left: "50%",
      transform: "translateX(-50%)",
      padding: "24px 70px",
      background: `linear-gradient(180deg, rgba(0,0,0,0.85), rgba(15,12,5,0.92))`,
      border: `2px solid ${GOLD}`,
      borderRadius: "6px",
      color: GOLD,
      fontSize: "30px",
      fontFamily: FONT_TITLE,
      textAlign: "center",
      display: "none",
      boxShadow: `0 0 40px rgba(212,165,32,0.35), inset 0 0 20px rgba(212,165,32,0.08)`,
      letterSpacing: "3px",
      textTransform: "uppercase",
      textShadow: `0 0 15px rgba(212,165,32,0.5)`,
      backdropFilter: GLASS_BACKDROP,
    }, this.root);
  }

  // ---- Dialogue box (bottom third) ---------------------------------------

  private buildDialogueBox(): void {
    this.dialogueBox = el("div", {
      position: "absolute",
      bottom: "0",
      left: "0",
      width: "100%",
      height: "33%",
      background: `linear-gradient(0deg, rgba(15,12,8,0.95), rgba(25,20,12,0.85))`,
      borderTop: `2px solid rgba(180,155,100,0.5)`,
      display: "none",
      pointerEvents: "auto",
      padding: "20px",
      boxSizing: "border-box",
      backdropFilter: GLASS_BACKDROP,
      boxShadow: "0 -4px 20px rgba(0,0,0,0.5)",
    }, this.root);

    const inner = el("div", {
      display: "flex",
      gap: "20px",
      height: "100%",
    }, this.dialogueBox);

    // Portrait
    this.dialoguePortrait = el("div", {
      width: "120px",
      height: "120px",
      border: `2px solid ${PARCHMENT_DARK}`,
      borderRadius: "8px",
      background: "rgba(0,0,0,0.3)",
      flexShrink: "0",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontSize: "48px",
    }, inner);

    const textArea = el("div", {
      flex: "1",
      display: "flex",
      flexDirection: "column",
      gap: "8px",
      overflow: "auto",
    }, inner);

    this.dialogueSpeaker = el("div", {
      color: GOLD,
      fontSize: "18px",
      fontFamily: FONT_TITLE,
      fontWeight: "bold",
    }, textArea);

    this.dialogueText = el("div", {
      color: PARCHMENT,
      fontSize: "15px",
      lineHeight: "1.5",
      fontFamily: FONT_MAIN,
    }, textArea);

    this.dialogueChoices = el("div", {
      display: "flex",
      flexDirection: "column",
      gap: "6px",
      marginTop: "8px",
    }, textArea);
  }

  // ---- Inventory screen (full overlay) -----------------------------------

  private buildInventoryScreen(): void {
    this.inventoryScreen = el("div", {
      position: "absolute",
      top: "0",
      left: "0",
      width: "100%",
      height: "100%",
      background: `rgba(30,25,18,0.92)`,
      display: "none",
      pointerEvents: "auto",
      zIndex: "2000",
    }, this.root);

    const header = el("div", {
      padding: "20px",
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      borderBottom: `2px solid ${PARCHMENT_DARK}`,
    }, this.inventoryScreen);

    const title = el("h2", {
      color: GOLD,
      fontFamily: FONT_TITLE,
      margin: "0",
      fontSize: "24px",
    }, header);
    title.textContent = "Inventory";

    const closeBtn = el("button", {
      background: "none",
      border: `1px solid ${PARCHMENT_DARK}`,
      color: PARCHMENT,
      padding: "6px 16px",
      cursor: "pointer",
      fontFamily: FONT_MAIN,
      fontSize: "14px",
      borderRadius: "4px",
    }, header);
    closeBtn.textContent = "Close [Tab]";
    closeBtn.addEventListener("click", () => this.toggleInventory(false));

    // Category tabs
    this.inventoryCategoryTabs = el("div", {
      display: "flex",
      gap: "4px",
      padding: "10px 20px",
      borderBottom: `1px solid ${PARCHMENT_DARK}`,
    }, this.inventoryScreen);

    const cats = ["All", "Weapons", "Armor", "Potions", "Food", "Quest Items", "Materials"];
    for (const cat of cats) {
      const tab = el("button", {
        background: "rgba(0,0,0,0.3)",
        border: `1px solid ${PARCHMENT_DARK}`,
        color: PARCHMENT,
        padding: "6px 12px",
        cursor: "pointer",
        fontFamily: FONT_MAIN,
        fontSize: "12px",
        borderRadius: "4px",
      }, this.inventoryCategoryTabs);
      tab.textContent = cat;
    }

    const body = el("div", {
      display: "flex",
      flex: "1",
      padding: "20px",
      gap: "20px",
      overflow: "hidden",
    }, this.inventoryScreen);

    this.inventoryGrid = el("div", {
      flex: "1",
      display: "grid",
      gridTemplateColumns: "repeat(auto-fill, 64px)",
      gridAutoRows: "64px",
      gap: "4px",
      overflowY: "auto",
      alignContent: "start",
    }, body);

    this.inventoryDetailPanel = el("div", {
      width: "280px",
      background: "rgba(0,0,0,0.3)",
      border: `1px solid ${PARCHMENT_DARK}`,
      borderRadius: "6px",
      padding: "16px",
      color: PARCHMENT,
      fontSize: "13px",
      overflowY: "auto",
    }, body);
    this.inventoryDetailPanel.innerHTML = "<em>Select an item to view details</em>";
  }

  // ---- Character sheet (full overlay) ------------------------------------

  private buildCharacterSheet(): void {
    this.characterSheet = el("div", {
      position: "absolute",
      top: "0",
      left: "0",
      width: "100%",
      height: "100%",
      background: `rgba(30,25,18,0.92)`,
      display: "none",
      pointerEvents: "auto",
      zIndex: "2000",
    }, this.root);

    const header = el("div", {
      padding: "20px",
      borderBottom: `2px solid ${PARCHMENT_DARK}`,
      display: "flex",
      justifyContent: "space-between",
    }, this.characterSheet);

    const title = el("h2", {
      color: GOLD,
      fontFamily: FONT_TITLE,
      margin: "0",
      fontSize: "24px",
    }, header);
    title.textContent = "Character";

    const closeBtn = el("button", {
      background: "none",
      border: `1px solid ${PARCHMENT_DARK}`,
      color: PARCHMENT,
      padding: "6px 16px",
      cursor: "pointer",
      fontFamily: FONT_MAIN,
      borderRadius: "4px",
    }, header);
    closeBtn.textContent = "Close [C]";
    closeBtn.addEventListener("click", () => this.toggleCharacterSheet(false));

    const body = el("div", {
      display: "flex",
      gap: "20px",
      padding: "20px",
      height: "calc(100% - 80px)",
    }, this.characterSheet);

    // Left: attributes & skills
    const leftCol = el("div", {
      width: "300px",
      overflowY: "auto",
      color: PARCHMENT,
      fontSize: "13px",
    }, body);

    const attrTitle = el("h3", {
      color: GOLD,
      fontFamily: FONT_TITLE,
      marginTop: "0",
    }, leftCol);
    attrTitle.textContent = "Attributes";

    this.charAttributes = el("div", {
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: "4px",
    }, leftCol);

    const skillTitle = el("h3", {
      color: GOLD,
      fontFamily: FONT_TITLE,
    }, leftCol);
    skillTitle.textContent = "Skills";

    this.charSkills = el("div", {
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: "4px",
    }, leftCol);

    // Right: perk tree
    const rightCol = el("div", {
      flex: "1",
      position: "relative",
    }, body);

    const perkTitle = el("h3", {
      color: GOLD,
      fontFamily: FONT_TITLE,
      marginTop: "0",
    }, rightCol);
    perkTitle.textContent = "Perks";

    this.perkTreeCanvas = document.createElement("canvas");
    this.perkTreeCanvas.width = 600;
    this.perkTreeCanvas.height = 500;
    this.perkTreeCanvas.style.width = "100%";
    this.perkTreeCanvas.style.height = "calc(100% - 40px)";
    this.perkTreeCanvas.style.border = `1px solid ${PARCHMENT_DARK}`;
    this.perkTreeCanvas.style.borderRadius = "6px";
    this.perkTreeCanvas.style.background = "rgba(0,0,0,0.3)";
    rightCol.appendChild(this.perkTreeCanvas);
    this.perkTreeCtx = this.perkTreeCanvas.getContext("2d")!;
  }

  // ---- Map screen (full overlay) -----------------------------------------

  private buildMapScreen(): void {
    this.mapScreen = el("div", {
      position: "absolute",
      top: "0",
      left: "0",
      width: "100%",
      height: "100%",
      background: `rgba(30,25,18,0.95)`,
      display: "none",
      pointerEvents: "auto",
      zIndex: "2000",
    }, this.root);

    const header = el("div", {
      padding: "20px",
      borderBottom: `2px solid ${PARCHMENT_DARK}`,
      display: "flex",
      justifyContent: "space-between",
    }, this.mapScreen);

    const title = el("h2", {
      color: GOLD,
      fontFamily: FONT_TITLE,
      margin: "0",
    }, header);
    title.textContent = "Map of Albion";

    const closeBtn = el("button", {
      background: "none",
      border: `1px solid ${PARCHMENT_DARK}`,
      color: PARCHMENT,
      padding: "6px 16px",
      cursor: "pointer",
      fontFamily: FONT_MAIN,
      borderRadius: "4px",
    }, header);
    closeBtn.textContent = "Close [M]";
    closeBtn.addEventListener("click", () => this.toggleMap(false));

    this.mapCanvas = document.createElement("canvas");
    this.mapCanvas.width = 800;
    this.mapCanvas.height = 600;
    this.mapCanvas.style.width = "100%";
    this.mapCanvas.style.height = "calc(100% - 80px)";
    this.mapCanvas.style.display = "block";
    this.mapCanvas.style.margin = "0 auto";
    this.mapScreen.appendChild(this.mapCanvas);
    this.mapCtx = this.mapCanvas.getContext("2d")!;
  }

  // ---- Status effects (top left) -----------------------------------------

  private buildStatusEffects(): void {
    this.statusEffectsContainer = el("div", {
      position: "absolute",
      top: "10px",
      left: "10px",
      display: "flex",
      flexWrap: "wrap",
      gap: "4px",
      maxWidth: "200px",
    }, this.root);
  }

  // ---- Death screen ------------------------------------------------------

  private buildDeathScreen(): void {
    this.deathScreen = el("div", {
      position: "absolute",
      top: "0",
      left: "0",
      width: "100%",
      height: "100%",
      background: "radial-gradient(ellipse at center, rgba(40,0,0,0.9) 0%, rgba(0,0,0,0.95) 70%)",
      display: "none",
      pointerEvents: "auto",
      zIndex: "3000",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
    }, this.root);

    const text = el("div", {
      color: BLOOD_RED,
      fontSize: "52px",
      fontFamily: FONT_TITLE,
      textShadow: "0 0 30px rgba(139,0,0,0.7), 0 0 60px rgba(139,0,0,0.3)",
      marginBottom: "10px",
      letterSpacing: "4px",
      textTransform: "uppercase",
    }, this.deathScreen);
    text.textContent = "You Have Fallen";

    const subtext = el("div", {
      color: "rgba(200,180,150,0.5)",
      fontSize: "16px",
      fontFamily: FONT_MAIN,
      fontStyle: "italic",
      marginBottom: "40px",
    }, this.deathScreen);
    subtext.textContent = "The darkness claims another soul...";

    const btn = el("button", {
      padding: "14px 50px",
      background: "none",
      border: `1px solid rgba(139,0,0,0.6)`,
      color: PARCHMENT,
      fontSize: "18px",
      fontFamily: FONT_TITLE,
      cursor: "pointer",
      borderRadius: "4px",
      transition: "all 0.3s",
      letterSpacing: "2px",
      textTransform: "uppercase",
    }, this.deathScreen);
    btn.textContent = "Reload Last Save";
    btn.addEventListener("mouseenter", () => {
      btn.style.background = "rgba(139,0,0,0.25)";
      btn.style.borderColor = "rgba(139,0,0,0.9)";
      btn.style.boxShadow = "0 0 15px rgba(139,0,0,0.3)";
    });
    btn.addEventListener("mouseleave", () => {
      btn.style.background = "none";
      btn.style.borderColor = "rgba(139,0,0,0.6)";
      btn.style.boxShadow = "none";
    });
    btn.addEventListener("click", () => {
      this.hideDeathScreen();
      this.callbacks.onRespawn();
    });
  }

  // ---- Key bindings ------------------------------------------------------

  private setupKeyBindings(): void {
    document.addEventListener("keydown", (e) => {
      // Quick slots 1-8
      const num = parseInt(e.key);
      if (num >= 1 && num <= 8) {
        this.callbacks.onQuickSlotUsed(num - 1);
        this.highlightQuickSlot(num - 1);
        return;
      }

      switch (e.key.toLowerCase()) {
        case "tab":
          e.preventDefault();
          this.toggleInventory(!this.isInventoryOpen);
          break;
        case "c":
          if (!this.isDialogueActive && !this.isInventoryOpen) {
            this.toggleCharacterSheet(!this.isCharSheetOpen);
          }
          break;
        case "m":
          if (!this.isDialogueActive && !this.isInventoryOpen && !this.isCharSheetOpen) {
            this.toggleMap(!this.isMapOpen);
          }
          break;
        case "escape":
          this.closeAllOverlays();
          break;
      }
    });
  }

  // =======================================================================
  // UPDATE METHODS  (called each frame from the game loop)
  // =======================================================================

  /**
   * Main per-frame update for the HUD.
   */
  update(state: ArthurianRPGState, dt: number): void {
    const pc = state.player.combatant;

    // Bars
    this.updateBar(this.healthFill, pc.hp, pc.maxHp);
    this.updateBar(this.manaFill, pc.mp, pc.maxMp);
    this.updateBar(this.staminaFill, pc.stamina, pc.maxStamina);
    this.handleBarFade(pc);

    // XP
    const xpPct = pc.xpToNext > 0 ? (pc.xp / pc.xpToNext) * 100 : 0;
    this.xpFill.style.width = `${xpPct}%`;
    this.levelLabel.textContent = `Level ${pc.level}`;

    // Floating numbers
    this.updateFloatingNumbers(dt);

    // Level up banner
    if (this.levelUpTimer > 0) {
      this.levelUpTimer -= dt;
      if (this.levelUpTimer <= 0) {
        this.levelUpBanner.style.display = "none";
      }
    }
  }

  private updateBar(fill: HTMLElement, current: number, max: number): void {
    const pct = max > 0 ? Math.max(0, Math.min(100, (current / max) * 100)) : 0;
    fill.style.width = `${pct}%`;
  }

  private handleBarFade(pc: CombatantState): void {
    const allFull =
      pc.hp >= pc.maxHp && pc.mp >= pc.maxMp && pc.stamina >= pc.maxStamina;
    if (allFull) {
      if (!this.barFadeTimeout) {
        this.barFadeTimeout = setTimeout(() => {
          this.barContainer.style.opacity = "0.2";
        }, BAR_FADE_DELAY);
      }
    } else {
      if (this.barFadeTimeout) {
        clearTimeout(this.barFadeTimeout);
        this.barFadeTimeout = null;
      }
      this.barContainer.style.opacity = "1";
    }
  }

  // =======================================================================
  // COMPASS
  // =======================================================================

  updateCompass(playerYaw: number, markers: CompassMarker[], playerX: number, playerZ: number): void {
    this.compassStrip.innerHTML = "";

    // Cardinal directions
    const cardinals = [
      { label: "N", angle: 0 },
      { label: "E", angle: Math.PI / 2 },
      { label: "S", angle: Math.PI },
      { label: "W", angle: -Math.PI / 2 },
    ];

    const containerWidth = 500;

    for (const c of cardinals) {
      let diff = c.angle - playerYaw;
      while (diff > Math.PI) diff -= 2 * Math.PI;
      while (diff < -Math.PI) diff += 2 * Math.PI;
      const px = containerWidth / 2 + (diff / Math.PI) * containerWidth;
      if (px < -20 || px > containerWidth + 20) continue;

      const label = el("span", {
        position: "absolute",
        left: `${px}px`,
        transform: "translateX(-50%)",
        color: GOLD,
        fontWeight: "bold",
        fontSize: "13px",
      }, this.compassStrip);
      label.textContent = c.label;
    }

    // Markers
    for (const m of markers) {
      const dx = m.worldX - playerX;
      const dz = m.worldZ - playerZ;
      const angle = Math.atan2(dx, dz);
      let diff = angle - playerYaw;
      while (diff > Math.PI) diff -= 2 * Math.PI;
      while (diff < -Math.PI) diff += 2 * Math.PI;
      const px = containerWidth / 2 + (diff / Math.PI) * containerWidth;
      if (px < 0 || px > containerWidth) continue;

      const color = m.type === "quest" ? GOLD : m.type === "enemy" ? HEALTH_RED : PARCHMENT;
      const marker = el("span", {
        position: "absolute",
        left: `${px}px`,
        transform: "translateX(-50%)",
        color,
        fontSize: "10px",
        top: "16px",
      }, this.compassStrip);
      marker.textContent = m.type === "quest" ? "\u25C6" : "\u25CF"; // diamond or circle
    }
  }

  // =======================================================================
  // MINIMAP
  // =======================================================================

  updateMinimap(
    playerX: number,
    playerZ: number,
    playerYaw: number,
    enemies: { x: number; z: number }[],
    npcs: { x: number; z: number }[],
    objectives: { x: number; z: number }[],
  ): void {
    const ctx = this.minimapCtx;
    const size = 180;
    const half = size / 2;
    const scale = 2; // pixels per world unit
    ctx.clearRect(0, 0, size, size);

    // -- Terrain background rendering (onto cache canvas, then draw rotated) --
    const terrainHeightAt = (x: number, z: number): number => {
      const s1 = Math.sin(x * 0.008) * Math.cos(z * 0.008) * 18;
      const s2 = Math.sin(x * 0.025 + 1.3) * Math.cos(z * 0.02 - 0.7) * 6;
      const s3 = Math.sin(x * 0.06) * Math.sin(z * 0.06) * 2;
      return s1 + s2 + s3;
    };

    if (this.minimapTerrainCache) {
      const tCtx = this.minimapTerrainCache.getContext("2d")!;
      const imgData = tCtx.createImageData(size, size);
      const data = imgData.data;
      const step = 4; // render every 4th pixel for performance

      for (let py = 0; py < size; py += step) {
        for (let px = 0; px < size; px += step) {
          // Map pixel to world coords (rotated by player yaw)
          const lx = (px - half) / scale;
          const lz = (py - half) / scale;
          const cosY = Math.cos(-playerYaw);
          const sinY = Math.sin(-playerYaw);
          const wx = playerX + lx * cosY - lz * sinY;
          const wz = playerZ + lx * sinY + lz * cosY;
          const h = terrainHeightAt(wx, wz);

          let r: number, g: number, b: number;
          if (h < 2) {
            // water
            r = 40; g = 80; b = 160;
          } else if (h < 4) {
            // sand / beach
            r = 194; g = 178; b = 128;
          } else if (h < 6) {
            // grass
            r = 60; g = 120; b = 40;
          } else if (h < 14) {
            // hills / stone transition
            const t = (h - 6) / 8;
            r = Math.floor(60 + t * 80);
            g = Math.floor(120 - t * 50);
            b = Math.floor(40 + t * 50);
          } else {
            // snow
            const t = Math.min((h - 14) / 6, 1);
            r = Math.floor(140 + t * 100);
            g = Math.floor(135 + t * 100);
            b = Math.floor(130 + t * 110);
          }

          // Fill the step x step block
          for (let dy = 0; dy < step && py + dy < size; dy++) {
            for (let dx = 0; dx < step && px + dx < size; dx++) {
              const idx = ((py + dy) * size + (px + dx)) * 4;
              data[idx] = r;
              data[idx + 1] = g;
              data[idx + 2] = b;
              data[idx + 3] = 220;
            }
          }
        }
      }
      tCtx.putImageData(imgData, 0, 0);

      // Clip to circle and draw terrain
      ctx.save();
      ctx.beginPath();
      ctx.arc(half, half, half, 0, Math.PI * 2);
      ctx.clip();
      ctx.drawImage(this.minimapTerrainCache, 0, 0);
      ctx.restore();
    }

    // -- Circular mask overlay (darken edges) --
    ctx.save();
    ctx.beginPath();
    ctx.arc(half, half, half, 0, Math.PI * 2);
    ctx.clip();
    const edgeGrad = ctx.createRadialGradient(half, half, half * 0.6, half, half, half);
    edgeGrad.addColorStop(0, "rgba(0,0,0,0)");
    edgeGrad.addColorStop(1, "rgba(0,0,0,0.5)");
    ctx.fillStyle = edgeGrad;
    ctx.fillRect(0, 0, size, size);
    ctx.restore();

    // -- Trail dots (fading previous positions) --
    this.minimapTrail.push({ x: playerX, z: playerZ });
    if (this.minimapTrail.length > 20) this.minimapTrail.shift();

    ctx.save();
    ctx.beginPath();
    ctx.arc(half, half, half - 2, 0, Math.PI * 2);
    ctx.clip();
    for (let i = 0; i < this.minimapTrail.length - 1; i++) {
      const t = this.minimapTrail[i];
      const dx = (t.x - playerX) * scale;
      const dz = (t.z - playerZ) * scale;
      const cosY = Math.cos(-playerYaw);
      const sinY = Math.sin(-playerYaw);
      const sx = half + dx * cosY - (-dz) * sinY;
      const sy = half + dx * sinY + (-dz) * cosY;
      if ((sx - half) * (sx - half) + (sy - half) * (sy - half) > half * half) continue;
      const alpha = (i / this.minimapTrail.length) * 0.5;
      ctx.fillStyle = `rgba(200,200,255,${alpha})`;
      ctx.beginPath();
      ctx.arc(sx, sy, 1.5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    // -- Entities (rotated so player faces up) --
    ctx.save();
    ctx.beginPath();
    ctx.arc(half, half, half - 2, 0, Math.PI * 2);
    ctx.clip();
    ctx.translate(half, half);
    ctx.rotate(-playerYaw);

    // Enemies (red)
    ctx.fillStyle = "#ff3333";
    ctx.shadowColor = "#ff0000";
    ctx.shadowBlur = 4;
    for (const e of enemies) {
      const dx = (e.x - playerX) * scale;
      const dz = (e.z - playerZ) * scale;
      if (dx * dx + dz * dz > half * half) continue;
      ctx.beginPath();
      ctx.arc(dx, -dz, 3, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.shadowBlur = 0;

    // NPCs (green)
    ctx.fillStyle = "#33dd55";
    ctx.shadowColor = "#00ff00";
    ctx.shadowBlur = 3;
    for (const n of npcs) {
      const dx = (n.x - playerX) * scale;
      const dz = (n.z - playerZ) * scale;
      if (dx * dx + dz * dz > half * half) continue;
      ctx.beginPath();
      ctx.arc(dx, -dz, 3, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.shadowBlur = 0;

    // Objectives (gold diamond)
    ctx.fillStyle = GOLD;
    ctx.shadowColor = "#ffaa00";
    ctx.shadowBlur = 5;
    for (const o of objectives) {
      const dx = (o.x - playerX) * scale;
      const dz = -(o.z - playerZ) * scale;
      if (dx * dx + dz * dz > half * half) continue;
      ctx.save();
      ctx.translate(dx, dz);
      ctx.rotate(Math.PI / 4);
      ctx.fillRect(-3, -3, 6, 6);
      ctx.restore();
    }
    ctx.shadowBlur = 0;

    ctx.restore();

    // -- Compass ring with tick marks --
    ctx.save();
    ctx.strokeStyle = `${PARCHMENT_DARK}`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(half, half, half - 1, 0, Math.PI * 2);
    ctx.stroke();

    // Tick marks every 30 degrees
    for (let deg = 0; deg < 360; deg += 30) {
      const rad = (deg * Math.PI) / 180 - playerYaw - Math.PI / 2;
      const inner = deg % 90 === 0 ? half - 8 : half - 5;
      const outer = half - 1;
      ctx.beginPath();
      ctx.moveTo(half + Math.cos(rad) * inner, half + Math.sin(rad) * inner);
      ctx.lineTo(half + Math.cos(rad) * outer, half + Math.sin(rad) * outer);
      ctx.lineWidth = deg % 90 === 0 ? 2 : 1;
      ctx.stroke();
    }
    ctx.restore();

    // -- Player arrow (always center, always pointing up) --
    ctx.fillStyle = "#ffffff";
    ctx.shadowColor = "#ffffff";
    ctx.shadowBlur = 4;
    ctx.beginPath();
    ctx.moveTo(half, half - 7);
    ctx.lineTo(half - 5, half + 5);
    ctx.lineTo(half, half + 2);
    ctx.lineTo(half + 5, half + 5);
    ctx.closePath();
    ctx.fill();
    ctx.shadowBlur = 0;
  }

  // =======================================================================
  // QUICK SLOTS
  // =======================================================================

  updateQuickSlots(slots: QuickSlot[], itemLookup: (id: string) => ItemDef | null): void {
    for (let i = 0; i < 8; i++) {
      const el = this.quickSlotEls[i];
      const slotData = slots[i];
      // Keep the hotkey label (first child), update content
      while (el.childNodes.length > 1) el.removeChild(el.lastChild!);
      if (slotData?.itemId) {
        const item = itemLookup(slotData.itemId);
        if (item) {
          const icon = document.createElement("span");
          icon.textContent = item.icon || "?";
          icon.style.fontSize = "24px";
          el.appendChild(icon);
        }
      }
    }
  }

  private highlightQuickSlot(index: number): void {
    const slot = this.quickSlotEls[index];
    if (!slot) return;
    slot.style.borderColor = GOLD;
    setTimeout(() => { slot.style.borderColor = PARCHMENT_DARK; }, 200);
  }

  // =======================================================================
  // CROSSHAIR & INTERACTION
  // =======================================================================

  setCrosshairInteractable(isInteractable: boolean): void {
    this.crosshair.style.width = isInteractable ? "8px" : "4px";
    this.crosshair.style.height = isInteractable ? "8px" : "4px";
    this.crosshair.style.background = isInteractable
      ? `rgba(212,160,23,0.9)`
      : "rgba(255,255,255,0.7)";
  }

  showInteractionPrompt(text: string): void {
    this.interactionPrompt.textContent = text;
    this.interactionPrompt.style.display = "block";
  }

  hideInteractionPrompt(): void {
    this.interactionPrompt.style.display = "none";
  }

  // =======================================================================
  // QUEST TRACKER
  // =======================================================================

  updateQuestTracker(quests: QuestDef[]): void {
    this.questTracker.innerHTML = "";
    if (quests.length === 0) {
      this.questTracker.style.display = "none";
      return;
    }
    this.questTracker.style.display = "block";

    for (const q of quests.slice(0, 3)) {
      const qEl = el("div", { marginBottom: "10px" }, this.questTracker);
      const title = el("div", {
        color: GOLD,
        fontSize: "13px",
        fontWeight: "bold",
        fontFamily: FONT_TITLE,
      }, qEl);
      title.textContent = q.name;

      for (const obj of q.objectives) {
        const oEl = el("div", {
          color: obj.completed ? "#88aa88" : PARCHMENT,
          fontSize: "11px",
          paddingLeft: "8px",
          textDecoration: obj.completed ? "line-through" : "none",
        }, qEl);
        oEl.textContent = `${obj.completed ? "\u2713" : "\u25CB"} ${obj.description} (${obj.current}/${obj.required})`;
      }
    }
  }

  // =======================================================================
  // TARGET INFO
  // =======================================================================

  showTargetInfo(name: string, hp: number, maxHp: number): void {
    this.targetInfo.style.display = "block";
    this.targetName.textContent = name;
    this.updateBar(this.targetHpFill, hp, maxHp);
  }

  hideTargetInfo(): void {
    this.targetInfo.style.display = "none";
  }

  // =======================================================================
  // FLOATING DAMAGE NUMBERS
  // =======================================================================

  spawnDamageNumber(screenX: number, screenY: number, result: HitResult): void {
    const text = result.dodged
      ? "Dodged"
      : result.blocked
        ? `${result.damage} (Blocked)`
        : result.critical
          ? `${result.damage}!`
          : String(result.damage);

    const color = result.dodged
      ? "#88ccff"
      : result.critical
        ? "#ff4444"
        : result.blocked
          ? "#aaaaaa"
          : "#ffdd44";

    const numEl = el("div", {
      position: "absolute",
      left: `${screenX}px`,
      top: `${screenY}px`,
      color,
      fontSize: result.critical ? "24px" : "18px",
      fontWeight: "bold",
      fontFamily: FONT_TITLE,
      textShadow: "0 1px 3px rgba(0,0,0,0.8)",
      pointerEvents: "none",
      transition: "opacity 0.3s",
    }, this.floatingContainer);
    numEl.textContent = text;

    this.floatingNumbers.push({
      el: numEl,
      birth: performance.now(),
      x: screenX,
      y: screenY,
      vy: -60,
    });
  }

  private updateFloatingNumbers(dt: number): void {
    const now = performance.now();
    for (let i = this.floatingNumbers.length - 1; i >= 0; i--) {
      const fn = this.floatingNumbers[i];
      fn.y += fn.vy * dt;
      fn.vy += 20 * dt; // slow down
      fn.el.style.top = `${fn.y}px`;

      const age = (now - fn.birth) / 1000;
      if (age > 1.5) {
        fn.el.style.opacity = "0";
      }
      if (age > 2.0) {
        fn.el.remove();
        this.floatingNumbers.splice(i, 1);
      }
    }
  }

  // =======================================================================
  // LEVEL UP
  // =======================================================================

  showLevelUp(level: number, skillIncrease?: { name: string; newLevel: number }): void {
    this.levelUpBanner.style.display = "block";
    let html = `Level Up! &mdash; ${level}`;
    if (skillIncrease) {
      html += `<br><span style="font-size:16px;color:${PARCHMENT}">${skillIncrease.name} increased to ${skillIncrease.newLevel}</span>`;
    }
    this.levelUpBanner.innerHTML = html;
    this.levelUpTimer = 4;
  }

  // =======================================================================
  // DIALOGUE
  // =======================================================================

  showDialogue(node: DialogueNode, availableChoices: DialogueChoice[]): void {
    this.isDialogueActive = true;
    this.dialogueBox.style.display = "block";
    this.dialoguePortrait.textContent = node.portrait || "\u2694";
    this.dialogueSpeaker.textContent = node.speaker;
    this.dialogueText.textContent = node.text;
    this.dialogueChoices.innerHTML = "";

    availableChoices.forEach((choice, idx) => {
      const btn = el("button", {
        display: "block",
        width: "100%",
        textAlign: "left",
        background: "rgba(0,0,0,0.3)",
        border: `1px solid ${PARCHMENT_DARK}`,
        color: PARCHMENT,
        padding: "8px 12px",
        cursor: "pointer",
        fontFamily: FONT_MAIN,
        fontSize: "14px",
        borderRadius: "4px",
        transition: "background 0.2s",
      }, this.dialogueChoices);

      let label = `${idx + 1}. ${choice.text}`;
      if (choice.skillCheck) {
        label += ` [${choice.skillCheck.type} ${choice.skillCheck.difficulty}]`;
      }
      btn.textContent = label;

      btn.addEventListener("mouseenter", () => { btn.style.background = "rgba(212,160,23,0.2)"; });
      btn.addEventListener("mouseleave", () => { btn.style.background = "rgba(0,0,0,0.3)"; });
      btn.addEventListener("click", () => this.callbacks.onDialogueChoice(idx));
    });
  }

  hideDialogue(): void {
    this.isDialogueActive = false;
    this.dialogueBox.style.display = "none";
  }

  // =======================================================================
  // INVENTORY SCREEN
  // =======================================================================

  toggleInventory(show: boolean): void {
    this.isInventoryOpen = show;
    this.inventoryScreen.style.display = show ? "flex" : "none";
    if (!show) this.callbacks.onCloseOverlay();
  }

  updateInventoryGrid(
    slots: ReadonlyArray<InventorySlot>,
    carryWeight: number,
    maxCarry: number,
    gold: number,
  ): void {
    this.inventoryGrid.innerHTML = "";

    // Weight / gold header
    const info = el("div", {
      gridColumn: "1 / -1",
      color: PARCHMENT,
      fontSize: "12px",
      marginBottom: "8px",
    }, this.inventoryGrid);
    info.textContent = `Weight: ${carryWeight.toFixed(1)} / ${maxCarry}  |  Gold: ${gold}`;

    for (const slot of slots) {
      const cell = el("div", {
        width: "60px",
        height: "60px",
        background: "rgba(0,0,0,0.4)",
        border: `1px solid ${PARCHMENT_DARK}`,
        borderRadius: "4px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
        position: "relative",
        fontSize: "24px",
        color: PARCHMENT,
      }, this.inventoryGrid);

      cell.textContent = slot.item.icon || "?";

      if (slot.count > 1) {
        const badge = el("span", {
          position: "absolute",
          bottom: "2px",
          right: "4px",
          fontSize: "10px",
          color: GOLD,
        }, cell);
        badge.textContent = `x${slot.count}`;
      }

      // Quality border color
      const qColor = this.qualityColor(slot.item.quality as unknown as string);
      cell.style.borderColor = qColor;

      cell.addEventListener("click", () => {
        this.showItemDetail(slot.item);
      });
    }
  }

  private showItemDetail(item: ItemDef): void {
    this.inventoryDetailPanel.innerHTML = "";

    const name = el("div", {
      color: this.qualityColor(item.quality as unknown as string),
      fontSize: "16px",
      fontWeight: "bold",
      fontFamily: FONT_TITLE,
      marginBottom: "8px",
    }, this.inventoryDetailPanel);
    name.textContent = item.name;

    const desc = el("div", {
      color: PARCHMENT,
      fontSize: "12px",
      marginBottom: "8px",
      fontStyle: "italic",
    }, this.inventoryDetailPanel);
    desc.textContent = item.description;

    const stats = el("div", {
      color: PARCHMENT,
      fontSize: "12px",
      lineHeight: "1.6",
    }, this.inventoryDetailPanel);

    let html = "";
    if (item.baseDamage !== undefined) html += `Damage: ${item.baseDamage}<br>`;
    if (item.armorValue !== undefined) html += `Armor: ${item.armorValue}<br>`;
    if (item.healAmount !== undefined) html += `Heals: ${item.healAmount} HP<br>`;
    if (item.element) html += `Element: ${item.element}<br>`;
    html += `Weight: ${item.weight}<br>`;
    html += `Value: ${item.value} gold<br>`;
    html += `Quality: ${item.quality}<br>`;
    if (item.enchantment) {
      html += `<span style="color:${MANA_BLUE}">Enchantment: ${item.enchantment.name} (+${item.enchantment.bonusDamage} ${item.enchantment.element})</span><br>`;
    }
    stats.innerHTML = html;

    // Action buttons
    const btnRow = el("div", {
      display: "flex",
      gap: "8px",
      marginTop: "12px",
    }, this.inventoryDetailPanel);

    if (item.equipSlot) {
      const equipBtn = this.makeButton("Equip", () => this.callbacks.onInventoryEquip(item.id));
      btnRow.appendChild(equipBtn);
    }
    if (item.healAmount || item.manaRestore || item.staminaRestore || item.buffId) {
      const useBtn = this.makeButton("Use", () => this.callbacks.onInventoryUse(item.id));
      btnRow.appendChild(useBtn);
    }
    if (!item.isQuestItem) {
      const dropBtn = this.makeButton("Drop", () => this.callbacks.onInventoryDrop(item.id));
      btnRow.appendChild(dropBtn);
    }
  }

  private qualityColor(quality: string): string {
    switch (quality) {
      case "Legendary": return "#ff8800";
      case "Epic": return "#aa44ff";
      case "Rare": return "#4488ff";
      case "Uncommon": return "#44cc44";
      default: return PARCHMENT_DARK;
    }
  }

  // =======================================================================
  // CHARACTER SHEET
  // =======================================================================

  toggleCharacterSheet(show: boolean): void {
    this.isCharSheetOpen = show;
    this.characterSheet.style.display = show ? "flex" : "none";
    if (!show) this.callbacks.onCloseOverlay();
  }

  updateCharacterSheet(pc: CombatantState): void {
    // Attributes
    this.charAttributes.innerHTML = "";
    const attrs = pc.attributes;
    for (const [key, val] of Object.entries(attrs)) {
      const row = el("div", { padding: "2px 0", color: PARCHMENT, fontSize: "13px" }, this.charAttributes);
      row.textContent = `${key.charAt(0).toUpperCase() + key.slice(1)}: ${val}`;
    }

    // Skills
    this.charSkills.innerHTML = "";
    for (const [key, val] of Object.entries(pc.skills)) {
      const row = el("div", { padding: "2px 0", color: PARCHMENT, fontSize: "12px" }, this.charSkills);
      row.textContent = `${key}: ${val}`;
    }
  }

  drawPerkTree(trees: PerkTree[]): void {
    const ctx = this.perkTreeCtx;
    const w = this.perkTreeCanvas.width;
    const h = this.perkTreeCanvas.height;
    ctx.clearRect(0, 0, w, h);

    for (const tree of trees) {
      // Draw connections
      ctx.strokeStyle = "rgba(200,180,140,0.3)";
      ctx.lineWidth = 1;
      for (const node of tree.nodes) {
        for (const pid of node.parentIds) {
          const parent = tree.nodes.find((n) => n.id === pid);
          if (parent) {
            ctx.beginPath();
            ctx.moveTo(parent.x, parent.y);
            ctx.lineTo(node.x, node.y);
            ctx.stroke();
          }
        }
      }

      // Draw nodes
      for (const node of tree.nodes) {
        ctx.beginPath();
        ctx.arc(node.x, node.y, 12, 0, Math.PI * 2);
        if (node.unlocked) {
          ctx.fillStyle = GOLD;
        } else if (node.available) {
          ctx.fillStyle = "rgba(200,180,140,0.5)";
        } else {
          ctx.fillStyle = "rgba(100,90,70,0.3)";
        }
        ctx.fill();
        ctx.strokeStyle = PARCHMENT_DARK;
        ctx.lineWidth = 2;
        ctx.stroke();

        // Label
        ctx.fillStyle = node.unlocked ? INK : PARCHMENT;
        ctx.font = "9px serif";
        ctx.textAlign = "center";
        ctx.fillText(node.name, node.x, node.y + 22);
      }
    }
  }

  // =======================================================================
  // MAP SCREEN
  // =======================================================================

  toggleMap(show: boolean): void {
    this.isMapOpen = show;
    this.mapScreen.style.display = show ? "block" : "none";
    if (!show) this.callbacks.onCloseOverlay();
  }

  drawMap(
    locations: MapLocation[],
    playerX: number,
    playerZ: number,
    mapWidth: number,
    mapHeight: number,
  ): void {
    const ctx = this.mapCtx;
    const cw = this.mapCanvas.width;
    const ch = this.mapCanvas.height;
    ctx.clearRect(0, 0, cw, ch);

    // Background parchment
    ctx.fillStyle = "rgba(80,70,50,0.6)";
    ctx.fillRect(0, 0, cw, ch);

    // Scale
    const sx = cw / mapWidth;
    const sz = ch / mapHeight;

    // Draw regions (simplified grid)
    ctx.strokeStyle = "rgba(200,180,140,0.15)";
    ctx.lineWidth = 1;
    for (let gx = 0; gx < cw; gx += 50) {
      ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, ch); ctx.stroke();
    }
    for (let gy = 0; gy < ch; gy += 50) {
      ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(cw, gy); ctx.stroke();
    }

    // Locations
    for (const loc of locations) {
      if (!loc.discovered) continue;
      const px = loc.x * sx;
      const py = loc.z * sz;

      const iconColor = loc.canFastTravel ? GOLD : PARCHMENT_DARK;
      const typeIcon = loc.type === "city" ? "\u{1F3F0}" :
                       loc.type === "dungeon" ? "\u26F0" :
                       loc.type === "shrine" ? "\u2720" :
                       "\u25CF";

      ctx.fillStyle = iconColor;
      ctx.font = "16px serif";
      ctx.textAlign = "center";
      ctx.fillText(typeIcon, px, py);

      ctx.fillStyle = PARCHMENT;
      ctx.font = "10px serif";
      ctx.fillText(loc.name, px, py + 14);

      // Click detection for fast travel is handled separately
    }

    // Player position
    const ppx = playerX * sx;
    const ppy = playerZ * sz;
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(ppx, ppy, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = GOLD;
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = "#ffffff";
    ctx.font = "11px serif";
    ctx.textAlign = "center";
    ctx.fillText("You", ppx, ppy - 10);
  }

  setupMapClickHandler(
    locations: MapLocation[],
    mapWidth: number,
    mapHeight: number,
  ): void {
    // Remove old listener by replacing canvas (simple approach)
    const newCanvas = this.mapCanvas.cloneNode(true) as HTMLCanvasElement;
    this.mapCanvas.parentNode?.replaceChild(newCanvas, this.mapCanvas);
    this.mapCanvas = newCanvas;
    this.mapCtx = this.mapCanvas.getContext("2d")!;

    this.mapCanvas.addEventListener("click", (e) => {
      const rect = this.mapCanvas.getBoundingClientRect();
      const scaleX = this.mapCanvas.width / rect.width;
      const scaleY = this.mapCanvas.height / rect.height;
      const mx = (e.clientX - rect.left) * scaleX;
      const my = (e.clientY - rect.top) * scaleY;

      const sx = this.mapCanvas.width / mapWidth;
      const sz = this.mapCanvas.height / mapHeight;

      for (const loc of locations) {
        if (!loc.discovered || !loc.canFastTravel) continue;
        const px = loc.x * sx;
        const py = loc.z * sz;
        const dx = mx - px;
        const dy = my - py;
        if (dx * dx + dy * dy < 15 * 15) {
          this.callbacks.onFastTravel(loc.id);
          this.toggleMap(false);
          return;
        }
      }
    });
  }

  // =======================================================================
  // STATUS EFFECTS
  // =======================================================================

  updateStatusEffects(effects: StatusEffectDisplay[]): void {
    this.statusEffectsContainer.innerHTML = "";
    for (const eff of effects) {
      const badge = el("div", {
        width: "36px",
        height: "36px",
        background: eff.isBuff ? "rgba(50,100,50,0.7)" : "rgba(100,30,30,0.7)",
        border: `1px solid ${eff.isBuff ? STAMINA_GREEN : BLOOD_RED}`,
        borderRadius: "4px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        fontSize: "16px",
        position: "relative",
      }, this.statusEffectsContainer);

      badge.textContent = eff.icon || (eff.isBuff ? "\u2191" : "\u2193");

      const timer = el("span", {
        position: "absolute",
        bottom: "-2px",
        right: "2px",
        fontSize: "9px",
        color: PARCHMENT,
      }, badge);
      timer.textContent = `${Math.ceil(eff.remainingSeconds)}s`;

      badge.title = eff.name;
    }
  }

  // =======================================================================
  // DEATH SCREEN
  // =======================================================================

  showDeathScreen(): void {
    this.deathScreen.style.display = "flex";
  }

  hideDeathScreen(): void {
    this.deathScreen.style.display = "none";
  }

  // =======================================================================
  // OVERLAY MANAGEMENT
  // =======================================================================

  private closeAllOverlays(): void {
    this.toggleInventory(false);
    this.toggleCharacterSheet(false);
    this.toggleMap(false);
    this.hideDialogue();
    this.callbacks.onCloseOverlay();
  }

  isAnyOverlayOpen(): boolean {
    return this.isInventoryOpen || this.isCharSheetOpen || this.isMapOpen || this.isDialogueActive;
  }

  // =======================================================================
  // SHARED BUTTON BUILDER
  // =======================================================================

  private makeButton(label: string, onClick: () => void): HTMLElement {
    const btn = document.createElement("button");
    Object.assign(btn.style, {
      background: "rgba(0,0,0,0.4)",
      border: `1px solid ${PARCHMENT_DARK}`,
      color: PARCHMENT,
      padding: "6px 12px",
      cursor: "pointer",
      fontFamily: FONT_MAIN,
      fontSize: "12px",
      borderRadius: "4px",
    } as Partial<CSSStyleDeclaration>);
    btn.textContent = label;
    btn.addEventListener("click", onClick);
    btn.addEventListener("mouseenter", () => { btn.style.borderColor = GOLD; });
    btn.addEventListener("mouseleave", () => { btn.style.borderColor = PARCHMENT_DARK; });
    return btn;
  }

  // =======================================================================
  // CLEANUP
  // =======================================================================

  destroy(): void {
    if (this.barFadeTimeout) clearTimeout(this.barFadeTimeout);
    this.root.remove();
  }
}
