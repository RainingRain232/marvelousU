// Event bus for Rift Wizard — decoupled event emission for sound, UI, analytics

export enum RWEvent {
  SPELL_CAST = "spell_cast",
  SPELL_HIT = "spell_hit",
  ENEMY_DEATH = "enemy_death",
  BOSS_DEATH = "boss_death",
  WIZARD_HIT = "wizard_hit",
  WIZARD_DEATH = "wizard_death",
  LEVEL_CLEAR = "level_clear",
  LEVEL_START = "level_start",
  SPELL_LEARNED = "spell_learned",
  UPGRADE_BOUGHT = "upgrade_bought",
  ITEM_PICKUP = "item_pickup",
  PORTAL_ENTER = "portal_enter",
  SHRINE_USE = "shrine_use",
  TURN_START = "turn_start",
  TURN_END = "turn_end",
  GAME_OVER = "game_over",
  VICTORY = "victory",
  SUMMON_CREATED = "summon_created",
  SHIELD_GAINED = "shield_gained",
  STATUS_APPLIED = "status_applied",
  MELEE_HIT = "melee_hit",
}

export interface RWEventData {
  type: RWEvent;
  [key: string]: unknown;
}

type EventCallback = (data: RWEventData) => void;

class RiftWizardEventBus {
  private _listeners = new Map<RWEvent, Set<EventCallback>>();
  private _globalListeners = new Set<EventCallback>();

  /** Subscribe to a specific event */
  on(event: RWEvent, callback: EventCallback): () => void {
    if (!this._listeners.has(event)) {
      this._listeners.set(event, new Set());
    }
    this._listeners.get(event)!.add(callback);
    // Return unsubscribe function
    return () => {
      this._listeners.get(event)?.delete(callback);
    };
  }

  /** Subscribe to ALL events (useful for sound manager, analytics) */
  onAny(callback: EventCallback): () => void {
    this._globalListeners.add(callback);
    return () => {
      this._globalListeners.delete(callback);
    };
  }

  /** Emit an event */
  emit(type: RWEvent, data?: Omit<RWEventData, "type">): void {
    const eventData: RWEventData = { type, ...data };

    // Notify specific listeners
    const listeners = this._listeners.get(type);
    if (listeners) {
      for (const cb of listeners) {
        try {
          cb(eventData);
        } catch (e) {
          console.warn(`RWEventBus listener error for ${type}:`, e);
        }
      }
    }

    // Notify global listeners
    for (const cb of this._globalListeners) {
      try {
        cb(eventData);
      } catch (e) {
        console.warn(`RWEventBus global listener error:`, e);
      }
    }
  }

  /** Remove all listeners */
  clear(): void {
    this._listeners.clear();
    this._globalListeners.clear();
  }
}

/** Singleton event bus instance */
export const rwEventBus = new RiftWizardEventBus();
