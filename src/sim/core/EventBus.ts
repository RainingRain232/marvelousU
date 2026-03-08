// Typed event emitter — bridge between sim and view
// sim/ emits events; view/ listens. sim/ never imports from view/.
import type { AbilityType, GamePhase, PlayerId, RPGPhase, TurnBattleAction, UnitState, UnitType, Vec2 } from "@/types";
import type { RPGItem } from "@rpg/state/RPGState";

// ---------------------------------------------------------------------------
// Event map — every event the simulation can emit
// ---------------------------------------------------------------------------

export interface SimEvents {
  // Unit lifecycle
  unitSpawned: { unitId: string; buildingId: string; position: Vec2 };
  unitDied: { unitId: string; killerUnitId?: string };
  unitDamaged: { unitId: string; amount: number; attackerId: string };
  unitCrit: { unitId: string; amount: number; attackerId: string };
  unitBlocked: { unitId: string; attackerId: string };
  unitAttacked: { attackerId: string; targetId: string; attackerPos: Vec2; targetPos: Vec2; attackerType: UnitType };
  unitHealed: { unitId: string; amount: number; position: Vec2; isRegen?: boolean };
  unitLevelUp: { unitId: string; newLevel: number };
  unitStateChanged: { unitId: string; from: UnitState; to: UnitState };
  groupSpawned: { unitIds: string[]; buildingId: string };

  // Building lifecycle
  buildingPlaced: { buildingId: string; position: Vec2; owner: PlayerId | null };
  buildingDestroyed: { buildingId: string };
  buildingCaptured: { buildingId: string; newOwner: PlayerId | null };

  // Abilities & projectiles
  castStarted: { casterId: string; abilityId: string; abilityType: string; position: Vec2; castTime: number };
  abilityUsed: { casterId: string; abilityId: string; targets: Vec2[] };
  projectileCreated: { projectileId: string; origin: Vec2; target: Vec2 };
  projectileHit: { projectileId: string; targetId: string; teleportedIds?: string[] };
  unitTeleported: { unitId: string; from: Vec2; to: Vec2 };

  // Aura pulses
  auraPulse: { casterId: string; abilityType: AbilityType; position: Vec2; radius: number };

  // Random events
  randomEvent: { eventType: string; title: string; description: string };

  // Economy
  goldChanged: { playerId: PlayerId; amount: number };
  manaChanged: { playerId: PlayerId; amount: number };
  upgradePurchased: { playerId: PlayerId; upgradeType: string; newLevel: number };

  // Rally flag
  flagPlaced: { playerId: PlayerId; position: Vec2 };

  // Player manual commands (RTS controls)
  playerCommandIssued: { unitIds: string[]; goal: Vec2; targetId?: string };

  // Game flow
  phaseChanged: { phase: GamePhase };
  roguelikeDisabledBuildingsChanged: { disabled: string[] };

  // Grail Greed Corruption
  corruptionModifierActivated: { modifierName: string; description: string; corruptionLevel: number };

  // RPG events
  rpgPhaseChanged: { phase: RPGPhase; previousPhase: RPGPhase };
  rpgPartyMoved: { position: Vec2; previousPosition: Vec2 };
  rpgEncounterTriggered: { encounterId: string; encounterType: "random" | "dungeon" | "boss"; arenaBet?: number };
  rpgDungeonEntered: { dungeonId: string };
  rpgDungeonFloorChanged: { floor: number; direction: "down" | "up" };
  rpgDungeonExited: { dungeonId: string };
  rpgTownEntered: { townId: string };
  rpgBattleStarted: { mode: "turn" | "auto" };
  rpgBattleEnded: { victory: boolean; xp: number; gold: number };
  rpgTurnBattleAction: { combatantId: string; action: TurnBattleAction; targetId?: string };
  rpgTurnBattleDamage: { attackerId: string; targetId: string; damage: number; isCritical: boolean };
  rpgItemUsed: { itemId: string; targetId: string };
  rpgLevelUp: { memberId: string; newLevel: number };
  rpgQuestAccepted: { questId: string };
  rpgQuestUpdated: { questId: string; objectiveIndex: number };
  rpgQuestCompleted: { questId: string };
  rpgChestOpened: { position: Vec2; items: RPGItem[] };
  rpgRoomRevealed: { roomId: string };

  // RPG town/equipment events
  rpgItemBought: { itemId: string };
  rpgItemEquipped: { memberId: string; itemId: string; slot: string };
  rpgInnRested: { cost: number };

  // RPG NPC events
  rpgNPCInteraction: { npcId: string; npcName: string; dialogue: string[]; leaderId?: string; leaderTitle?: string };

  // RPG spell system events
  rpgSpellLearnPrompt: { memberId: string; memberName: string; picks: number; choices: string[] };
  rpgSpellLearned: { memberId: string; spellId: string };
  rpgSpellCast: { casterId: string; spellId: string; fxKey: string; targetIds: string[]; isHeal: boolean };
  rpgAllSpellsKnown: { memberId: string; memberName: string; level: number };

  // RPG world events
  rpgWorldEvent: { id: string; title: string; description: string; choices: { label: string; effects: Record<string, unknown> }[] };
  rpgAchievementUnlocked: { achievementId: string };
  rpgShrineUsed: { entityId: string; buff: { type: string; duration: number; magnitude: number } };
  rpgHerbGathered: { entityId: string; remaining: number };
  rpgFishCaught: { entityId: string };
  rpgFastTravel: { targetEntityId: string; position: Vec2 };
  rpgTutorialTip: { tipId: string; message: string };
  rpgBanter: { text: string };
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type EventKey = keyof SimEvents;
export type Listener<K extends EventKey> = (payload: SimEvents[K]) => void;

// ---------------------------------------------------------------------------
// Implementation
// ---------------------------------------------------------------------------

export class EventBusImpl {
  private listeners: { [K in EventKey]?: Listener<K>[] } = {};

  /** Subscribe to an event. Returns an unsubscribe function for convenience. */
  on<K extends EventKey>(event: K, listener: Listener<K>): () => void {
    if (!this.listeners[event]) this.listeners[event] = [];
    (this.listeners[event] as Listener<K>[]).push(listener);
    return () => this.off(event, listener);
  }

  /** Subscribe to an event for exactly one emission, then auto-unsubscribe. */
  once<K extends EventKey>(event: K, listener: Listener<K>): void {
    const wrapper = (payload: SimEvents[K]) => {
      listener(payload);
      this.off(event, wrapper as Listener<K>);
    };
    this.on(event, wrapper as Listener<K>);
  }

  /** Unsubscribe a specific listener from an event. */
  off<K extends EventKey>(event: K, listener: Listener<K>): void {
    const arr = this.listeners[event] as Listener<K>[] | undefined;
    if (!arr) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (this.listeners as any)[event] = arr.filter((l) => l !== listener);
  }

  /** Emit an event, calling all registered listeners synchronously. */
  emit<K extends EventKey>(event: K, payload: SimEvents[K]): void {
    // Snapshot listeners before iterating — a listener may call off() mid-loop
    const arr = (this.listeners[event] as Listener<K>[] | undefined)?.slice();
    if (!arr) return;
    for (const l of arr) l(payload);
  }

  /** Remove all listeners for all events. */
  clear(): void {
    this.listeners = {};
  }

  /** Remove all listeners for a specific event. */
  clearEvent<K extends EventKey>(event: K): void {
    delete this.listeners[event];
  }
}

// ---------------------------------------------------------------------------
// Global singleton — use this throughout the app
// ---------------------------------------------------------------------------

export const EventBus = new EventBusImpl();
