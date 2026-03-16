// ============================================================================
// ArthurianRPGDialogue.ts – Dialogue trees, quests, reputation, and shops
// ============================================================================


// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

export enum QuestStatus {
  NotStarted = "NotStarted",
  Active = "Active",
  Completed = "Completed",
  Failed = "Failed",
}

export enum QuestObjectiveType {
  Kill = "Kill",
  Collect = "Collect",
  TalkTo = "TalkTo",
  GoTo = "GoTo",
  Escort = "Escort",
  Defend = "Defend",
}

export enum SkillCheckType {
  Charisma = "Charisma",
  Intelligence = "Intelligence",
  Strength = "Strength",
  Dexterity = "Dexterity",
  Perception = "Perception",
}

// ---------------------------------------------------------------------------
// Dialogue data structures
// ---------------------------------------------------------------------------

export interface DialogueNode {
  id: string;
  speaker: string;      // NPC name
  portrait: string;     // CSS class or image key
  text: string;
  choices: DialogueChoice[];
  onEnter?: DialogueAction[];  // actions triggered when node is shown
}

export interface DialogueChoice {
  text: string;
  nextNodeId: string | null;   // null = end conversation
  condition?: DialogueCondition;
  skillCheck?: {
    type: SkillCheckType;
    difficulty: number;        // player skill value must be >= this
    failNodeId: string;        // redirect on failure
  };
  action?: DialogueAction[];
}

export interface DialogueCondition {
  type: "quest" | "reputation" | "hasItem" | "flag";
  questId?: string;
  questStatus?: QuestStatus;
  factionId?: string;
  minReputation?: number;
  itemId?: string;
  flagId?: string;
  flagValue?: boolean;
}

export type DialogueAction =
  | { type: "startQuest"; questId: string }
  | { type: "completeQuest"; questId: string }
  | { type: "updateObjective"; questId: string; objectiveId: string; delta: number }
  | { type: "giveItem"; itemId: string; count: number }
  | { type: "removeItem"; itemId: string; count: number }
  | { type: "giveGold"; amount: number }
  | { type: "removeGold"; amount: number }
  | { type: "addReputation"; factionId: string; amount: number }
  | { type: "setFlag"; flagId: string; value: boolean }
  | { type: "recruitCompanion"; companionId: string }
  | { type: "openShop"; shopId: string }
  | { type: "addLoreEntry"; loreId: string };

// ---------------------------------------------------------------------------
// Dialogue tree container
// ---------------------------------------------------------------------------

export interface DialogueTree {
  id: string;
  npcId: string;
  startNodeId: string;
  nodes: Map<string, DialogueNode>;
}

// ---------------------------------------------------------------------------
// Quest definitions
// ---------------------------------------------------------------------------

export interface QuestObjective {
  id: string;
  description: string;
  type: QuestObjectiveType;
  targetId: string;     // enemy type, item id, NPC id, or location id
  required: number;
  current: number;
  completed: boolean;
}

export interface QuestReward {
  xp: number;
  gold: number;
  items: { itemId: string; count: number }[];
  reputationChanges: { factionId: string; amount: number }[];
}

export interface QuestDef {
  id: string;
  name: string;
  description: string;
  journalEntry: string;
  objectives: QuestObjective[];
  reward: QuestReward;
  prerequisiteQuestIds: string[];
  isMainQuest: boolean;
}

// ---------------------------------------------------------------------------
// Reputation system
// ---------------------------------------------------------------------------

export interface FactionDef {
  id: string;
  name: string;
  description: string;
}

const REPUTATION_THRESHOLDS = {
  hated: -100,
  disliked: -50,
  neutral: 0,
  liked: 50,
  honored: 100,
  exalted: 200,
} as const;

export type ReputationLevel = keyof typeof REPUTATION_THRESHOLDS;

export function getReputationLevel(value: number): ReputationLevel {
  if (value >= REPUTATION_THRESHOLDS.exalted) return "exalted";
  if (value >= REPUTATION_THRESHOLDS.honored) return "honored";
  if (value >= REPUTATION_THRESHOLDS.liked) return "liked";
  if (value >= REPUTATION_THRESHOLDS.neutral) return "neutral";
  if (value >= REPUTATION_THRESHOLDS.disliked) return "disliked";
  return "hated";
}

// ---------------------------------------------------------------------------
// Shop system
// ---------------------------------------------------------------------------

export interface ShopDef {
  id: string;
  name: string;
  npcId: string;
  inventory: { itemId: string; stock: number; basePrice: number }[];
  buysCategories: string[]; // item categories the shop buys
  sellPriceMultiplier: number; // e.g. 0.4 = player sells at 40 % of value
}

// ---------------------------------------------------------------------------
// Lore book
// ---------------------------------------------------------------------------

export interface LoreEntry {
  id: string;
  title: string;
  text: string;
  category: string; // "History", "Magic", "People", etc.
  discovered: boolean;
}

// ---------------------------------------------------------------------------
// Dialogue Walker – navigates a dialogue tree
// ---------------------------------------------------------------------------

export class DialogueWalker {
  private tree: DialogueTree | null = null;
  private currentNode: DialogueNode | null = null;
  isActive = false;

  begin(tree: DialogueTree): DialogueNode | null {
    this.tree = tree;
    this.currentNode = tree.nodes.get(tree.startNodeId) ?? null;
    this.isActive = this.currentNode !== null;
    return this.currentNode;
  }

  getCurrentNode(): DialogueNode | null {
    return this.currentNode;
  }

  /**
   * Returns available choices after evaluating conditions.
   */
  getAvailableChoices(state: DialogueStateProvider): DialogueChoice[] {
    if (!this.currentNode) return [];
    return this.currentNode.choices.filter((c) => {
      if (!c.condition) return true;
      return evaluateCondition(c.condition, state);
    });
  }

  /**
   * Select a choice (by index among available ones). Returns next node or null if conversation ends.
   */
  selectChoice(
    choiceIndex: number,
    state: DialogueStateProvider,
    playerSkills: Record<string, number>,
  ): { node: DialogueNode | null; actions: DialogueAction[]; skillCheckPassed: boolean | null } {
    const available = this.getAvailableChoices(state);
    if (choiceIndex < 0 || choiceIndex >= available.length) {
      return { node: null, actions: [], skillCheckPassed: null };
    }

    const choice = available[choiceIndex];
    const actions: DialogueAction[] = [];
    let skillCheckPassed: boolean | null = null;

    // Skill check
    let nextId = choice.nextNodeId;
    if (choice.skillCheck) {
      const playerValue = playerSkills[choice.skillCheck.type.toLowerCase()] ?? 0;
      if (playerValue >= choice.skillCheck.difficulty) {
        skillCheckPassed = true;
      } else {
        skillCheckPassed = false;
        nextId = choice.skillCheck.failNodeId;
      }
    }

    // Collect actions
    if (choice.action) actions.push(...choice.action);

    // Navigate
    if (!nextId || !this.tree) {
      this.end();
      return { node: null, actions, skillCheckPassed };
    }

    this.currentNode = this.tree.nodes.get(nextId) ?? null;
    if (!this.currentNode) {
      this.end();
      return { node: null, actions, skillCheckPassed };
    }

    // onEnter actions
    if (this.currentNode.onEnter) {
      actions.push(...this.currentNode.onEnter);
    }

    return { node: this.currentNode, actions, skillCheckPassed };
  }

  end(): void {
    this.tree = null;
    this.currentNode = null;
    this.isActive = false;
  }
}

// ---------------------------------------------------------------------------
// Condition evaluator
// ---------------------------------------------------------------------------

export interface DialogueStateProvider {
  getQuestStatus(questId: string): QuestStatus;
  getReputation(factionId: string): number;
  hasItem(itemId: string): boolean;
  getFlag(flagId: string): boolean;
}

function evaluateCondition(cond: DialogueCondition, state: DialogueStateProvider): boolean {
  switch (cond.type) {
    case "quest":
      return cond.questId !== undefined && state.getQuestStatus(cond.questId) === cond.questStatus;
    case "reputation":
      return cond.factionId !== undefined && state.getReputation(cond.factionId) >= (cond.minReputation ?? 0);
    case "hasItem":
      return cond.itemId !== undefined && state.hasItem(cond.itemId);
    case "flag":
      return cond.flagId !== undefined && state.getFlag(cond.flagId) === (cond.flagValue ?? true);
    default:
      return true;
  }
}

// ---------------------------------------------------------------------------
// Quest Manager
// ---------------------------------------------------------------------------

export class QuestManager {
  private quests: Map<string, QuestDef> = new Map();
  private activeQuests: Map<string, QuestDef> = new Map();
  private completedQuestIds: Set<string> = new Set();
  private failedQuestIds: Set<string> = new Set();

  registerQuest(def: QuestDef): void {
    this.quests.set(def.id, def);
  }

  startQuest(questId: string): boolean {
    const def = this.quests.get(questId);
    if (!def) return false;
    if (this.activeQuests.has(questId) || this.completedQuestIds.has(questId)) return false;

    // Check prerequisites
    for (const preReq of def.prerequisiteQuestIds) {
      if (!this.completedQuestIds.has(preReq)) return false;
    }

    // Deep-copy so objective progress is per-instance
    const instance: QuestDef = JSON.parse(JSON.stringify(def));
    this.activeQuests.set(questId, instance);
    return true;
  }

  updateObjective(questId: string, objectiveId: string, delta: number): boolean {
    const quest = this.activeQuests.get(questId);
    if (!quest) return false;
    const obj = quest.objectives.find((o) => o.id === objectiveId);
    if (!obj || obj.completed) return false;
    obj.current = Math.min(obj.required, obj.current + delta);
    if (obj.current >= obj.required) {
      obj.completed = true;
    }
    return true;
  }

  /**
   * Check if all objectives for a quest are done.
   */
  isQuestReady(questId: string): boolean {
    const quest = this.activeQuests.get(questId);
    if (!quest) return false;
    return quest.objectives.every((o) => o.completed);
  }

  completeQuest(questId: string): QuestReward | null {
    const quest = this.activeQuests.get(questId);
    if (!quest || !this.isQuestReady(questId)) return null;
    this.activeQuests.delete(questId);
    this.completedQuestIds.add(questId);
    return quest.reward;
  }

  failQuest(questId: string): void {
    this.activeQuests.delete(questId);
    this.failedQuestIds.add(questId);
  }

  getQuestStatus(questId: string): QuestStatus {
    if (this.completedQuestIds.has(questId)) return QuestStatus.Completed;
    if (this.failedQuestIds.has(questId)) return QuestStatus.Failed;
    if (this.activeQuests.has(questId)) return QuestStatus.Active;
    return QuestStatus.NotStarted;
  }

  getActiveQuests(): QuestDef[] {
    return Array.from(this.activeQuests.values());
  }

  getQuestJournal(): { active: QuestDef[]; completed: string[]; failed: string[] } {
    return {
      active: this.getActiveQuests(),
      completed: Array.from(this.completedQuestIds),
      failed: Array.from(this.failedQuestIds),
    };
  }
}

// ---------------------------------------------------------------------------
// Reputation Manager
// ---------------------------------------------------------------------------

export class ReputationManager {
  private factions: Map<string, FactionDef> = new Map();
  private values: Map<string, number> = new Map();

  registerFaction(def: FactionDef): void {
    this.factions.set(def.id, def);
    if (!this.values.has(def.id)) this.values.set(def.id, 0);
  }

  addReputation(factionId: string, amount: number): void {
    const current = this.values.get(factionId) ?? 0;
    this.values.set(factionId, Math.max(-200, Math.min(300, current + amount)));
  }

  getReputation(factionId: string): number {
    return this.values.get(factionId) ?? 0;
  }

  getLevel(factionId: string): ReputationLevel {
    return getReputationLevel(this.getReputation(factionId));
  }

  /** Charisma affects shop prices. Returns discount factor (0.8 = 20 % discount). */
  getPriceModifier(factionId: string, charisma: number): number {
    const rep = this.getReputation(factionId);
    const repDiscount = rep * 0.001; // max ~0.3 at exalted
    const charismaDiscount = charisma * 0.005; // max ~0.25 at 50
    return Math.max(0.5, 1 - repDiscount - charismaDiscount);
  }
}

// ---------------------------------------------------------------------------
// Shop System
// ---------------------------------------------------------------------------

export class ShopSystem {
  private shops: Map<string, ShopDef> = new Map();

  registerShop(def: ShopDef): void {
    this.shops.set(def.id, def);
  }

  getShop(shopId: string): ShopDef | null {
    return this.shops.get(shopId) ?? null;
  }

  /**
   * Calculate buy price (player buying from shop).
   */
  getBuyPrice(_shopId: string, itemBasePrice: number, priceMod: number): number {
    return Math.ceil(itemBasePrice * priceMod);
  }

  /**
   * Calculate sell price (player selling to shop).
   */
  getSellPrice(shopId: string, itemBaseValue: number, priceMod: number): number {
    const shop = this.shops.get(shopId);
    if (!shop) return 0;
    return Math.floor(itemBaseValue * shop.sellPriceMultiplier * priceMod);
  }

  /**
   * Execute a purchase. Returns true on success.
   */
  buyItem(
    shopId: string,
    itemIndex: number,
    count: number,
    playerGold: number,
    priceMod: number,
  ): { success: boolean; totalCost: number; itemId: string } | null {
    const shop = this.shops.get(shopId);
    if (!shop || itemIndex < 0 || itemIndex >= shop.inventory.length) return null;

    const entry = shop.inventory[itemIndex];
    if (entry.stock < count && entry.stock !== -1) return null; // -1 = unlimited
    const price = this.getBuyPrice(shopId, entry.basePrice, priceMod);
    const total = price * count;
    if (playerGold < total) return null;

    if (entry.stock !== -1) entry.stock -= count;
    return { success: true, totalCost: total, itemId: entry.itemId };
  }
}

// ---------------------------------------------------------------------------
// Lore System
// ---------------------------------------------------------------------------

export class LoreSystem {
  private entries: Map<string, LoreEntry> = new Map();

  registerEntry(entry: LoreEntry): void {
    this.entries.set(entry.id, entry);
  }

  discover(loreId: string): LoreEntry | null {
    const entry = this.entries.get(loreId);
    if (!entry || entry.discovered) return null;
    entry.discovered = true;
    return entry;
  }

  getDiscovered(): LoreEntry[] {
    return Array.from(this.entries.values()).filter((e) => e.discovered);
  }

  getByCategory(category: string): LoreEntry[] {
    return this.getDiscovered().filter((e) => e.category === category);
  }

  getCategories(): string[] {
    const cats = new Set(this.getDiscovered().map((e) => e.category));
    return Array.from(cats);
  }
}

// ---------------------------------------------------------------------------
// Master Dialogue System (composes all sub-systems)
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Inventory bridge – allows the dialogue system to interact with inventory
// ---------------------------------------------------------------------------

export interface DialogueInventoryBridge {
  /** Check if player has at least one of the given item */
  hasItem(itemId: string): boolean;
  /** Add item(s) to player inventory. Returns true on success. */
  addItem(itemId: string, count: number): boolean;
  /** Remove item(s) from player inventory. Returns true on success. */
  removeItem(itemId: string, count: number): boolean;
  /** Get current gold */
  getGold(): number;
  /** Add gold */
  addGold(amount: number): void;
  /** Remove gold. Returns true on success (false if insufficient). */
  removeGold(amount: number): boolean;
}

// ---------------------------------------------------------------------------
// Notification callback for UI feedback on item / gold changes
// ---------------------------------------------------------------------------

export type DialogueNotifyFn = (message: string) => void;

export class ArthurianRPGDialogueSystem implements DialogueStateProvider {
  readonly walker = new DialogueWalker();
  readonly quests = new QuestManager();
  readonly reputation = new ReputationManager();
  readonly shops = new ShopSystem();
  readonly lore = new LoreSystem();

  private dialogueTrees: Map<string, DialogueTree> = new Map();
  private flags: Map<string, boolean> = new Map();
  private companionRecruits: Set<string> = new Set();

  /** Bridge to the player inventory system – must be set by the orchestrator */
  private inventoryBridge: DialogueInventoryBridge | null = null;

  /** Optional notification callback for UI feedback */
  private notifyFn: DialogueNotifyFn | null = null;

  /** Connect the inventory bridge so dialogue actions can modify inventory */
  setInventoryBridge(bridge: DialogueInventoryBridge): void {
    this.inventoryBridge = bridge;
  }

  /** Set a notification callback for UI feedback (e.g. "Received Iron Sword x1") */
  setNotifyFn(fn: DialogueNotifyFn): void {
    this.notifyFn = fn;
  }

  private notify(message: string): void {
    if (this.notifyFn) this.notifyFn(message);
  }

  // Registration ----------------------------------------------------------

  registerDialogueTree(tree: DialogueTree): void {
    this.dialogueTrees.set(tree.id, tree);
  }

  // Dialogue flow ---------------------------------------------------------

  beginDialogue(treeId: string): DialogueNode | null {
    const tree = this.dialogueTrees.get(treeId);
    if (!tree) return null;
    return this.walker.begin(tree);
  }

  selectChoice(
    index: number,
    playerSkills: Record<string, number>,
  ): { node: DialogueNode | null; skillCheckPassed: boolean | null } {
    const result = this.walker.selectChoice(index, this, playerSkills);
    // Process actions
    for (const action of result.actions) {
      this.processAction(action);
    }
    return { node: result.node, skillCheckPassed: result.skillCheckPassed };
  }

  endDialogue(): void {
    this.walker.end();
  }

  // Action processing -----------------------------------------------------

  private processAction(action: DialogueAction): void {
    switch (action.type) {
      case "startQuest":
        this.quests.startQuest(action.questId);
        break;
      case "completeQuest":
        this.quests.completeQuest(action.questId);
        break;
      case "updateObjective":
        this.quests.updateObjective(action.questId, action.objectiveId, action.delta);
        break;
      case "addReputation":
        this.reputation.addReputation(action.factionId, action.amount);
        break;
      case "setFlag":
        this.flags.set(action.flagId, action.value);
        break;
      case "recruitCompanion":
        this.companionRecruits.add(action.companionId);
        break;
      case "addLoreEntry":
        this.lore.discover(action.loreId);
        break;

      // Inventory actions – delegated to inventory bridge
      case "giveItem": {
        if (this.inventoryBridge) {
          const success = this.inventoryBridge.addItem(action.itemId, action.count);
          if (success) {
            this.notify(`Received ${action.itemId} x${action.count}`);
          } else {
            this.notify("Inventory full – could not receive item!");
          }
        }
        break;
      }
      case "removeItem": {
        if (this.inventoryBridge) {
          const success = this.inventoryBridge.removeItem(action.itemId, action.count);
          if (success) {
            this.notify(`Gave away ${action.itemId} x${action.count}`);
          } else {
            this.notify("You don't have the required item.");
          }
        }
        break;
      }
      case "giveGold": {
        if (this.inventoryBridge) {
          this.inventoryBridge.addGold(action.amount);
          this.notify(`Received ${action.amount} gold`);
        }
        break;
      }
      case "removeGold": {
        if (this.inventoryBridge) {
          const success = this.inventoryBridge.removeGold(action.amount);
          if (success) {
            this.notify(`Paid ${action.amount} gold`);
          } else {
            this.notify("Not enough gold!");
          }
        }
        break;
      }
      case "openShop":
        // openShop is still handled by the orchestrator since it needs to
        // switch the game phase to SHOP mode – emit a notification for now
        this.notify(`Opening shop: ${action.shopId}`);
        break;

      default:
        break;
    }
  }

  // DialogueStateProvider implementation ----------------------------------

  getQuestStatus(questId: string): QuestStatus {
    return this.quests.getQuestStatus(questId);
  }

  getReputation(factionId: string): number {
    return this.reputation.getReputation(factionId);
  }

  hasItem(itemId: string): boolean {
    if (this.inventoryBridge) {
      return this.inventoryBridge.hasItem(itemId);
    }
    // Fallback: if no inventory bridge is connected, assume item is present
    // so dialogue choices requiring items are not silently hidden
    return true;
  }

  getFlag(flagId: string): boolean {
    return this.flags.get(flagId) ?? false;
  }

  setFlag(flagId: string, value: boolean): void {
    this.flags.set(flagId, value);
  }

  isCompanionRecruited(companionId: string): boolean {
    return this.companionRecruits.has(companionId);
  }
}
