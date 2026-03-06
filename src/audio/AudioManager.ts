import menuMusicUrl from "@audio/Innkeepers_Melody_DEFAULT_MusicGPT.mp3";
import gameMusicUrl from "@audio/Innkeepers_Melody_DEFAULT_MusicGPT(1).mp3";
import { EventBus } from "@sim/core/EventBus";

const FADE_MS = 1500;
const VOLUME = 0.5;

/** Track identifiers for context-sensitive music. */
export type TrackId =
  | "overworld"
  | "battle"
  | "boss_battle"
  | "town"
  | "dungeon"
  | "victory"
  | "game_over";

/** Jingle identifiers for short one-shot sounds. */
export type JingleId = "victory" | "level_up" | "achievement";

/**
 * Placeholder track URLs keyed by TrackId.
 * Replace these with real asset imports once audio files are available.
 */
const TRACK_URLS: Record<TrackId, string | null> = {
  overworld: gameMusicUrl, // reuse existing game music as placeholder
  battle: null,
  boss_battle: null,
  town: null,
  dungeon: null,
  victory: null,
  game_over: null,
};

/**
 * Placeholder jingle URLs keyed by JingleId.
 * Replace with real asset imports once audio files are available.
 */
const JINGLE_URLS: Record<JingleId, string | null> = {
  victory: null,
  level_up: null,
  achievement: null,
};

class AudioManagerImpl {
  private _menuAudio: HTMLAudioElement | null = null;
  private _gameAudio: HTMLAudioElement | null = null;
  private _active: HTMLAudioElement | null = null;

  /* ── Context-sensitive music state ── */
  private _trackCache: Partial<Record<TrackId, HTMLAudioElement>> = {};
  private _currentTrackId: TrackId | null = null;
  private _previousTrackId: TrackId | null = null;
  private _pendingEncounterType: "random" | "dungeon" | "boss" = "random";
  private _eventUnsubs: Array<() => void> = [];

  /** Start playing menu background music (looped). */
  playMenuMusic(): void {
    if (!this._menuAudio) {
      this._menuAudio = this._createAudio(menuMusicUrl);
    }
    this._switchTo(this._menuAudio);
  }

  /** Start playing in-game background music (looped). */
  playGameMusic(): void {
    if (!this._gameAudio) {
      this._gameAudio = this._createAudio(gameMusicUrl);
    }
    this._switchTo(this._gameAudio);
  }

  /* ── Context-sensitive track switching ── */

  /**
   * Crossfade to a named track. If the track URL is not yet available the
   * request is silently ignored so the game can run before all audio assets
   * are wired up.
   */
  switchTrack(trackId: TrackId): void {
    const url = TRACK_URLS[trackId];
    if (!url) {
      // No audio file mapped yet – just record the logical state.
      this._previousTrackId = this._currentTrackId;
      this._currentTrackId = trackId;
      return;
    }

    if (!this._trackCache[trackId]) {
      this._trackCache[trackId] = this._createAudio(url);
    }
    const next = this._trackCache[trackId]!;
    this._previousTrackId = this._currentTrackId;
    this._currentTrackId = trackId;
    this._switchTo(next);
  }

  /**
   * Play a short one-shot jingle (e.g. victory fanfare, level-up chime).
   * The jingle plays on top of the current music at full volume and does
   * not loop.  If the jingle URL is not yet available the call is a no-op.
   */
  playJingle(jingleId: JingleId): void {
    const url = JINGLE_URLS[jingleId];
    if (!url) return;

    const audio = new Audio(url);
    audio.loop = false;
    audio.volume = VOLUME;
    audio.play().catch(() => {});
  }

  /**
   * Wire up EventBus listeners so the AudioManager reacts to RPG game-state
   * changes automatically.  Call once during game initialisation.
   */
  initContextListeners(): void {
    // Clean up any previous subscriptions to be safe.
    this.disposeContextListeners();

    // Track the encounter type so we can pick battle vs boss_battle.
    this._eventUnsubs.push(
      EventBus.on("rpgEncounterTriggered", (e) => {
        this._pendingEncounterType = e.encounterType;
      }),
    );

    this._eventUnsubs.push(
      EventBus.on("rpgBattleStarted", () => {
        const track: TrackId =
          this._pendingEncounterType === "boss" ? "boss_battle" : "battle";
        this.switchTrack(track);
      }),
    );

    this._eventUnsubs.push(
      EventBus.on("rpgBattleEnded", (e) => {
        if (e.victory) {
          this.playJingle("victory");
        }
        // Return to whichever track was playing before the battle.
        const returnTo = this._previousTrackId ?? "overworld";
        this.switchTrack(returnTo);
      }),
    );

    this._eventUnsubs.push(
      EventBus.on("rpgTownEntered", () => {
        this.switchTrack("town");
      }),
    );

    this._eventUnsubs.push(
      EventBus.on("rpgDungeonEntered", () => {
        this.switchTrack("dungeon");
      }),
    );

    this._eventUnsubs.push(
      EventBus.on("rpgDungeonExited", () => {
        this.switchTrack("overworld");
      }),
    );

    this._eventUnsubs.push(
      EventBus.on("rpgLevelUp", () => {
        this.playJingle("level_up");
      }),
    );

    this._eventUnsubs.push(
      EventBus.on("rpgAchievementUnlocked", () => {
        this.playJingle("achievement");
      }),
    );
  }

  /** Remove all EventBus subscriptions registered by initContextListeners. */
  disposeContextListeners(): void {
    for (const unsub of this._eventUnsubs) unsub();
    this._eventUnsubs = [];
  }

  private _createAudio(src: string): HTMLAudioElement {
    const audio = new Audio(src);
    audio.loop = true;
    audio.volume = 0;
    return audio;
  }

  private _switchTo(next: HTMLAudioElement): void {
    if (this._active === next) return;

    const prev = this._active;
    this._active = next;

    // Fade out previous
    if (prev) {
      this._fade(prev, prev.volume, 0, FADE_MS, () => {
        prev.pause();
      });
    }

    // Fade in next
    next.currentTime = 0;
    next.volume = 0;
    next.play().catch(() => {
      // Autoplay blocked — retry on first user interaction
      const resume = () => {
        next.play().catch(() => {});
        document.removeEventListener("pointerdown", resume);
        document.removeEventListener("keydown", resume);
      };
      document.addEventListener("pointerdown", resume, { once: true });
      document.addEventListener("keydown", resume, { once: true });
    });
    this._fade(next, 0, VOLUME, FADE_MS);
  }

  private _fade(
    audio: HTMLAudioElement,
    from: number,
    to: number,
    durationMs: number,
    onDone?: () => void,
  ): void {
    const start = performance.now();
    const step = () => {
      const elapsed = performance.now() - start;
      const t = Math.min(elapsed / durationMs, 1);
      audio.volume = from + (to - from) * t;
      if (t < 1) {
        requestAnimationFrame(step);
      } else if (onDone) {
        onDone();
      }
    };
    requestAnimationFrame(step);
  }
}

export const audioManager = new AudioManagerImpl();
