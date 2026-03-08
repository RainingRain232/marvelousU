// World intro dialog — shows a sequence of story pages when a new world game
// begins.  Each page has a portrait image (e.g. Merlin, the Man) and narrative
// text.  The player clicks "Continue" / "Very well." to advance.

import {
  Container,
  Graphics,
  Text,
  TextStyle,
  Sprite,
  Texture,
  Assets,
} from "pixi.js";
import { t } from "@/i18n/i18n";
import type { ViewManager } from "@view/ViewManager";

import merlinImgUrl from "@/img/merlin.png";
import manImgUrl from "@/img/man.png";
import morgaineImgUrl from "@/img/morgaine.png";
import avalonImgUrl from "@/img/avalon.png";

// ---------------------------------------------------------------------------
// Intro page data
// ---------------------------------------------------------------------------

export interface IntroPage {
  imageUrl: string;
  title: string;
  subtitle: string;
  borderColor: number;
  text: string;
  /** Optional delay in ms before the page content fades in. */
  delay?: number;
}

const WORLD_INTRO_PAGES: IntroPage[] = [
  {
    imageUrl: merlinImgUrl,
    title: "MERLIN",
    subtitle: "Archmage of Avalon",
    borderColor: 0x4466aa,
    text: t("world.intro1"),
  },
  {
    imageUrl: manImgUrl,
    title: "THE STEWARD",
    subtitle: "Royal Advisor",
    borderColor: 0xaa8844,
    text: t("world.intro2"),
  },
];

/** Proximity-triggered dialog page for Avalon (shown when 2 tiles away). */
export const AVALON_PROXIMITY_PAGE: IntroPage = {
  imageUrl: avalonImgUrl,
  title: "AVALON",
  subtitle: "Heart of the Continent",
  borderColor: 0x44aa88,
  text: t("world.avalon_desc"),
};

/** Proximity-triggered dialog page for Morgaine (shown when 1 tile away). */
export const MORGAINE_PROXIMITY_PAGE: IntroPage = {
  imageUrl: morgaineImgUrl,
  title: "MORGAINE",
  subtitle: "Sorceress of Avalon",
  borderColor: 0x8844aa,
  text: t("world.morgaine_speech"),
};

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const TITLE_STYLE = new TextStyle({
  fontFamily: "monospace",
  fontSize: 20,
  fontWeight: "bold",
  fill: 0xffcc44,
});

const SUBTITLE_STYLE = new TextStyle({
  fontFamily: "monospace",
  fontSize: 12,
  fontStyle: "italic",
  fill: 0xaaaacc,
});

const BTN_STYLE = new TextStyle({
  fontFamily: "monospace",
  fontSize: 12,
  fill: 0xeeeeff,
  fontWeight: "bold",
});

// ---------------------------------------------------------------------------
// WorldIntroDialog
// ---------------------------------------------------------------------------

export class WorldIntroDialog {
  readonly container = new Container();
  private _vm!: ViewManager;
  private _content = new Container();
  private _pages: IntroPage[] = [];
  private _pageIndex = 0;
  private _delayTimer: ReturnType<typeof setTimeout> | null = null;

  /** Called when the player dismisses the last page. */
  onDone: (() => void) | null = null;

  init(vm: ViewManager): void {
    this._vm = vm;
    vm.addToLayer("ui", this.container);
    this.container.visible = false;
  }

  show(pages?: IntroPage[]): void {
    this._pages = pages ?? WORLD_INTRO_PAGES;
    this._pageIndex = 0;
    if (this._pages.length === 0) {
      this.onDone?.();
      return;
    }
    this.container.visible = true;
    this._rebuild();
  }

  hide(): void {
    this.container.visible = false;
    this._cleanup();
  }

  get isVisible(): boolean {
    return this.container.visible;
  }

  private _cleanup(): void {
    if (this._delayTimer) {
      clearTimeout(this._delayTimer);
      this._delayTimer = null;
    }
    this._content.removeFromParent();
    this._content.destroy({ children: true });
    this._content = new Container();
  }

  private _advance(): void {
    if (this._pageIndex < this._pages.length - 1) {
      this._pageIndex++;
      this._rebuild();
    } else {
      this.hide();
      this.onDone?.();
    }
  }

  private _rebuild(): void {
    this._cleanup();

    const page = this._pages[this._pageIndex];
    if (!page) return;

    const sw = this._vm.screenWidth;
    const sh = this._vm.screenHeight;
    const isLast = this._pageIndex >= this._pages.length - 1;

    // ── Backdrop ─────────────────────────────────────────────────────────
    const bg = new Graphics();
    bg.rect(0, 0, sw, sh);
    bg.fill({ color: 0x000000, alpha: 0.8 });
    bg.eventMode = "static";
    this._content.addChild(bg);

    // ── Dialog wrapper (may be delayed) ──────────────────────────────────
    const dialog = new Container();
    this._content.addChild(dialog);

    const buildDialog = () => {
      // ── Dialog box ───────────────────────────────────────────────────────
      const DW = 540;
      const DH = 360;
      const dx = (sw - DW) / 2;
      const dy = (sh - DH) / 2;

      const dialogBg = new Graphics();
      dialogBg.roundRect(dx, dy, DW, DH, 10);
      dialogBg.fill({ color: 0x0c0c24, alpha: 0.95 });
      dialogBg.stroke({ color: page.borderColor, width: 2 });
      dialog.addChild(dialogBg);

      // ── Title ────────────────────────────────────────────────────────────
      const title = new Text({ text: page.title, style: TITLE_STYLE });
      title.x = dx + 20;
      title.y = dy + 14;
      dialog.addChild(title);

      // ── Subtitle ─────────────────────────────────────────────────────────
      const subText = new Text({ text: page.subtitle, style: SUBTITLE_STYLE });
      subText.x = dx + 20 + title.width + 12;
      subText.y = dy + 20;
      dialog.addChild(subText);

      // ── Portrait frame ───────────────────────────────────────────────────
      const PW = 140;
      const PH = 180;
      const px = dx + 20;
      const py = dy + 50;

      const portraitFrame = new Graphics();
      portraitFrame.roundRect(px, py, PW, PH, 6);
      portraitFrame.fill({ color: 0x080818 });
      portraitFrame.stroke({ color: page.borderColor, width: 1.5 });
      dialog.addChild(portraitFrame);

      // Load portrait
      void Assets.load(page.imageUrl).then((tex: Texture) => {
        if (!this.container.visible) return;
        const sprite = new Sprite(tex);
        const maxW = PW - 10;
        const maxH = PH - 10;
        const scale = Math.min(maxW / tex.width, maxH / tex.height);
        sprite.scale.set(scale);
        sprite.x = px + 5 + (maxW - tex.width * scale) / 2;
        sprite.y = py + 5 + (maxH - tex.height * scale) / 2;
        dialog.addChild(sprite);
      });

      // ── Decorative quote mark ────────────────────────────────────────────
      const bigQuote = new Text({
        text: "\u201C",
        style: new TextStyle({
          fontFamily: "serif",
          fontSize: 48,
          fill: page.borderColor,
        }),
      });
      bigQuote.x = px + PW + 12;
      bigQuote.y = py - 10;
      dialog.addChild(bigQuote);

      // ── Body text ────────────────────────────────────────────────────────
      const bodyStyle = new TextStyle({
        fontFamily: "monospace",
        fontSize: 13,
        fill: 0xdddddd,
        wordWrap: true,
        wordWrapWidth: DW - PW - 60,
        lineHeight: 20,
      });

      const bodyText = new Text({ text: `"${page.text}"`, style: bodyStyle });
      bodyText.x = px + PW + 20;
      bodyText.y = py + 10;
      dialog.addChild(bodyText);

      // ── Page indicator ───────────────────────────────────────────────────
      if (this._pages.length > 1) {
        const indicator = new Text({
          text: `${this._pageIndex + 1} / ${this._pages.length}`,
          style: new TextStyle({
            fontFamily: "monospace",
            fontSize: 11,
            fill: 0x888899,
          }),
        });
        indicator.x = dx + DW / 2 - indicator.width / 2;
        indicator.y = dy + DH - 30;
        dialog.addChild(indicator);
      }

      // ── Action button ────────────────────────────────────────────────────
      const btnLabel = isLast ? "Very well." : "Continue";
      const btnW = 130;
      const btnH = 32;
      const btn = this._makeBtn(
        btnLabel,
        dx + DW / 2 - btnW / 2,
        dy + DH - 56,
        btnW,
        btnH,
        page.borderColor,
      );
      dialog.addChild(btn);

      // Fade in if delayed
      if (page.delay) {
        dialog.alpha = 0;
        const fadeStart = performance.now();
        const fadeDuration = 600;
        const tick = () => {
          if (!this.container.visible) return;
          const t = Math.min(1, (performance.now() - fadeStart) / fadeDuration);
          dialog.alpha = t;
          if (t < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      }
    };

    if (page.delay) {
      this._delayTimer = setTimeout(() => {
        this._delayTimer = null;
        if (!this.container.visible) return;
        buildDialog();
      }, page.delay);
    } else {
      buildDialog();
    }

    this.container.addChild(this._content);
  }

  private _makeBtn(
    label: string,
    x: number,
    y: number,
    w: number,
    h: number,
    accent: number,
  ): Container {
    const btn = new Container();
    btn.eventMode = "static";
    btn.cursor = "pointer";

    const bg = new Graphics();
    bg.roundRect(0, 0, w, h, 4);
    bg.fill({ color: 0x222244 });
    bg.stroke({ color: 0x555577, width: 1 });
    btn.addChild(bg);

    const txt = new Text({ text: label, style: BTN_STYLE });
    txt.x = (w - txt.width) / 2;
    txt.y = (h - txt.height) / 2;
    btn.addChild(txt);

    btn.position.set(x, y);
    btn.on("pointerdown", () => this._advance());

    btn.on("pointerover", () => {
      bg.clear();
      bg.roundRect(0, 0, w, h, 4);
      bg.fill({ color: 0x334466 });
      bg.stroke({ color: accent, width: 1 });
    });
    btn.on("pointerout", () => {
      bg.clear();
      bg.roundRect(0, 0, w, h, 4);
      bg.fill({ color: 0x222244 });
      bg.stroke({ color: 0x555577, width: 1 });
    });

    return btn;
  }
}

export const worldIntroDialog = new WorldIntroDialog();
