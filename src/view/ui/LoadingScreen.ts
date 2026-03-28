const LOADING_TIPS = [
  "The Holy Grail awaits the worthy...",
  "Steel yourself for battle...",
  "The realm stirs with dark forces...",
  "Fortune favours the bold, but wisdom favours the prepared...",
  "A thousand swords await their masters...",
  "The ancient walls remember every siege...",
  "Even the mightiest fortress was built one stone at a time...",
  "In darkness, the faithful find their way...",
  "The harvest moon portends great change...",
  "Legends are forged in the fires of adversity...",
  "The old gods watch from beyond the veil...",
  "A crown is only as strong as the head that bears it...",
  "The road to glory is paved with sacrifice...",
  "Whispers in the cathedral speak of forgotten relics...",
  "The bannermen gather at the call of war...",
  "No castle stands forever against the tide of time...",
  "The blacksmith's hammer rings through the night...",
  "Honour is the shield that never breaks...",
];

const STYLE_ID = "loading-screen-style";

const CSS = `
  .loading-screen-overlay {
    position: fixed;
    inset: 0;
    z-index: 9999;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #0a0806;
    opacity: 0;
    transition: opacity 0.3s ease-in;
    font-family: Georgia, 'Palatino Linotype', 'Book Antiqua', serif;
  }

  .loading-screen-overlay.visible {
    opacity: 1;
  }

  .loading-screen-overlay.fade-out {
    opacity: 0;
    transition: opacity 0.4s ease-out;
  }

  .loading-screen-content {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
    max-width: 500px;
    text-align: center;
  }

  .loading-screen-title {
    font-size: 42px;
    letter-spacing: 6px;
    color: #c8a84e;
    text-shadow: 0 0 20px rgba(200, 168, 78, 0.5), 0 0 40px rgba(200, 168, 78, 0.2);
    text-transform: uppercase;
    margin: 0 0 4px 0;
  }

  .loading-screen-subtitle {
    font-size: 16px;
    color: #887766;
    font-style: italic;
    margin: 0 0 28px 0;
  }

  .loading-screen-bar-track {
    width: 300px;
    height: 6px;
    background: #1a1510;
    border: 1px solid #3a3020;
    border-radius: 3px;
    overflow: hidden;
    position: relative;
  }

  .loading-screen-bar-fill {
    height: 100%;
    width: 0%;
    background: linear-gradient(90deg, #8a6a20, #c8a84e, #e0c060);
    border-radius: 2px;
    transition: width 0.3s ease;
    position: relative;
    overflow: hidden;
  }

  .loading-screen-bar-fill::after {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(
      90deg,
      transparent 0%,
      rgba(255, 255, 255, 0.25) 40%,
      rgba(255, 255, 255, 0.35) 50%,
      rgba(255, 255, 255, 0.25) 60%,
      transparent 100%
    );
    animation: loading-shimmer 1.8s ease-in-out infinite;
  }

  @keyframes loading-shimmer {
    0%   { transform: translateX(-100%); }
    100% { transform: translateX(100%); }
  }

  .loading-screen-status {
    font-size: 11px;
    color: #665544;
    margin: 2px 0 0 0;
    min-height: 14px;
  }

  .loading-screen-tip {
    font-size: 13px;
    color: #665544;
    font-style: italic;
    margin-top: 48px;
    max-width: 400px;
    line-height: 1.5;
  }
`;

export class LoadingScreen {
  private overlay: HTMLDivElement | null = null;
  private titleEl: HTMLHeadingElement | null = null;
  private subtitleEl: HTMLParagraphElement | null = null;
  private barFill: HTMLDivElement | null = null;
  private statusEl: HTMLParagraphElement | null = null;

  show(title: string, subtitle?: string): void {
    if (this.overlay) {
      if (this.titleEl) this.titleEl.textContent = title;
      if (this.subtitleEl) this.subtitleEl.textContent = subtitle ?? "";
      return;
    }

    this.injectStyle();

    const overlay = document.createElement("div");
    overlay.className = "loading-screen-overlay";

    const content = document.createElement("div");
    content.className = "loading-screen-content";

    const titleEl = document.createElement("h1");
    titleEl.className = "loading-screen-title";
    titleEl.textContent = title;
    this.titleEl = titleEl;

    const subtitleEl = document.createElement("p");
    subtitleEl.className = "loading-screen-subtitle";
    subtitleEl.textContent = subtitle ?? "Preparing the realm...";
    this.subtitleEl = subtitleEl;

    const barTrack = document.createElement("div");
    barTrack.className = "loading-screen-bar-track";

    const barFill = document.createElement("div");
    barFill.className = "loading-screen-bar-fill";
    barFill.style.width = "0%";
    this.barFill = barFill;
    barTrack.appendChild(barFill);

    const statusEl = document.createElement("p");
    statusEl.className = "loading-screen-status";
    this.statusEl = statusEl;

    const tipEl = document.createElement("p");
    tipEl.className = "loading-screen-tip";
    tipEl.textContent = LOADING_TIPS[Math.floor(Math.random() * LOADING_TIPS.length)];

    content.appendChild(titleEl);
    content.appendChild(subtitleEl);
    content.appendChild(barTrack);
    content.appendChild(statusEl);
    content.appendChild(tipEl);
    overlay.appendChild(content);

    document.body.appendChild(overlay);
    this.overlay = overlay;

    // Force reflow so the initial opacity: 0 is applied before transitioning
    void overlay.offsetHeight;
    overlay.classList.add("visible");
  }

  setProgress(pct: number, text: string): void {
    const clamped = Math.max(0, Math.min(100, pct));
    if (this.barFill) this.barFill.style.width = `${clamped}%`;
    if (this.statusEl) this.statusEl.textContent = text;
  }

  async hide(): Promise<void> {
    if (!this.overlay) return;

    const overlay = this.overlay;
    overlay.classList.remove("visible");
    overlay.classList.add("fade-out");

    await new Promise<void>((resolve) => {
      const onEnd = () => {
        overlay.removeEventListener("transitionend", onEnd);
        resolve();
      };
      overlay.addEventListener("transitionend", onEnd);
      // Safety timeout in case transitionend never fires
      setTimeout(onEnd, 500);
    });

    overlay.remove();
    this.overlay = null;
    this.titleEl = null;
    this.subtitleEl = null;
    this.barFill = null;
    this.statusEl = null;
  }

  private injectStyle(): void {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = CSS;
    document.head.appendChild(style);
  }
}

export const loadingScreen = new LoadingScreen();
