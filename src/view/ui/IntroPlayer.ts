// IntroPlayer — plays a sequence of mp4 intro videos as a full-screen overlay.
// After all videos finish (or the player presses Escape), calls `onDone`.

import intro1Url from "@/img/intro/1.mp4";
import intro2Url from "@/img/intro/2.mp4";
import intro3Url from "@/img/intro/3.mp4";
import intro4Url from "@/img/intro/4.mp4";
import intro5Url from "@/img/intro/5.mp4";

const VIDEOS = [intro1Url, intro2Url, intro3Url, intro4Url, intro5Url];

const CAPTIONS = [
  "For years the land of Rain were divided. Factions fought for control and there was no single ruler of the land.",
  "The people of Man looked to their leader to guide them. But the old king died before accomplishing much of the hopes of his people.",
  "Now the people flock to the castle to welcome their new liege.",
  "The still empty throneroom awaits its new ruler to take seat.",
  "To unite the lands under one banner as the one true Sire!",
];

export class IntroPlayer {
  onDone: (() => void) | null = null;

  private _overlay: HTMLDivElement | null = null;
  private _video: HTMLVideoElement | null = null;
  private _caption: HTMLDivElement | null = null;
  private _currentIndex = 0;
  private _active = false;
  private _onKeyDown: ((e: KeyboardEvent) => void) | null = null;

  play(): void {
    if (this._active) return;
    this._active = true;
    this._currentIndex = 0;

    // Create fullscreen overlay
    this._overlay = document.createElement("div");
    Object.assign(this._overlay.style, {
      position: "fixed",
      top: "0",
      left: "0",
      width: "100vw",
      height: "100vh",
      background: "#000",
      zIndex: "9999",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
    });
    document.body.appendChild(this._overlay);

    // Caption text box (above video)
    this._caption = document.createElement("div");
    Object.assign(this._caption.style, {
      color: "#ffd700",
      fontFamily: "monospace",
      fontSize: "20px",
      textAlign: "center",
      padding: "16px 48px",
      maxWidth: "800px",
      lineHeight: "1.6",
      letterSpacing: "1px",
      marginBottom: "16px",
    });
    this._overlay.appendChild(this._caption);

    // Escape key listener
    this._onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        this._finish();
      }
    };
    window.addEventListener("keydown", this._onKeyDown);

    this._playNext();
  }

  private _playNext(): void {
    if (!this._active || this._currentIndex >= VIDEOS.length) {
      this._finish();
      return;
    }

    // Remove previous video element if any
    if (this._video) {
      this._video.pause();
      this._video.remove();
      this._video = null;
    }

    // Update caption
    if (this._caption) {
      this._caption.textContent = CAPTIONS[this._currentIndex] ?? "";
    }

    const vid = document.createElement("video");
    vid.src = VIDEOS[this._currentIndex];
    vid.autoplay = true;
    vid.playsInline = true;
    Object.assign(vid.style, {
      maxWidth: "100%",
      maxHeight: "calc(100vh - 100px)",
      objectFit: "contain",
    });

    vid.onended = () => {
      this._currentIndex++;
      this._playNext();
    };

    vid.onerror = () => {
      // Skip broken videos
      this._currentIndex++;
      this._playNext();
    };

    this._overlay?.appendChild(vid);
    this._video = vid;
  }

  private _finish(): void {
    if (!this._active) return;
    this._active = false;

    if (this._video) {
      this._video.pause();
      this._video.remove();
      this._video = null;
    }

    if (this._overlay) {
      this._overlay.remove();
      this._overlay = null;
    }

    if (this._onKeyDown) {
      window.removeEventListener("keydown", this._onKeyDown);
      this._onKeyDown = null;
    }

    this.onDone?.();
  }
}

export const introPlayer = new IntroPlayer();
