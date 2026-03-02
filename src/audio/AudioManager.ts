import menuMusicUrl from "@audio/Innkeepers_Melody_DEFAULT_MusicGPT.mp3";
import gameMusicUrl from "@audio/Innkeepers_Melody_DEFAULT_MusicGPT(1).mp3";

const FADE_MS = 1500;
const VOLUME = 0.5;

class AudioManagerImpl {
  private _menuAudio: HTMLAudioElement | null = null;
  private _gameAudio: HTMLAudioElement | null = null;
  private _active: HTMLAudioElement | null = null;

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
