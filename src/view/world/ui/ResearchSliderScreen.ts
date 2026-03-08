// Research allocation slider — divides research effort between Science and Magic.

import { Container, Graphics, Text, TextStyle } from "pixi.js";
import { t } from "@/i18n/i18n";
import type { ViewManager } from "@view/ViewManager";
import type { WorldPlayer } from "@world/state/WorldPlayer";

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const TITLE_STYLE = new TextStyle({
  fontFamily: "monospace", fontSize: 20, fontWeight: "bold", fill: 0xffcc44,
});

const LABEL_STYLE = new TextStyle({
  fontFamily: "monospace", fontSize: 13, fontWeight: "bold", fill: 0xffffff,
});

const VALUE_STYLE = new TextStyle({
  fontFamily: "monospace", fontSize: 16, fontWeight: "bold", fill: 0xffcc44,
});

const FLAVOR_STYLE = new TextStyle({
  fontFamily: "monospace", fontSize: 11, fill: 0x8888aa, fontStyle: "italic",
  wordWrap: true, wordWrapWidth: 500,
});

// ---------------------------------------------------------------------------
// ResearchSliderScreen
// ---------------------------------------------------------------------------

export class ResearchSliderScreen {
  readonly container = new Container();
  private _vm!: ViewManager;
  private _content = new Container();
  private _player: WorldPlayer | null = null;

  onClose: (() => void) | null = null;

  init(vm: ViewManager): void {
    this._vm = vm;
    vm.addToLayer("ui", this.container);
    this.container.visible = false;
  }

  show(player: WorldPlayer): void {
    this._player = player;
    this.container.visible = true;
    this._rebuild();
  }

  hide(): void {
    this.container.visible = false;
    this._player = null;
  }

  get isVisible(): boolean {
    return this.container.visible;
  }

  // -----------------------------------------------------------------------
  // Build
  // -----------------------------------------------------------------------

  private _rebuild(): void {
    this._content.removeFromParent();
    this._content.destroy({ children: true });
    this._content = new Container();

    const player = this._player!;
    const sw = this._vm.screenWidth;
    const sh = this._vm.screenHeight;

    // Backdrop
    const bg = new Graphics();
    bg.rect(0, 0, sw, sh);
    bg.fill({ color: 0x000000, alpha: 0.85 });
    bg.eventMode = "static";
    this._content.addChild(bg);

    // Title
    const title = new Text({ text: t("world.research_alloc"), style: TITLE_STYLE });
    title.x = (sw - title.width) / 2;
    title.y = 40;
    this._content.addChild(title);

    // Close button
    this._content.addChild(this._makeClose(sw - 40, 10));

    // Current value display
    const ratio = player.magicResearchRatio;
    const sciPct = Math.round((1 - ratio) * 100);
    const magPct = Math.round(ratio * 100);

    const valueText = new Text({
      text: `Science: ${sciPct}%  |  Magic: ${magPct}%`,
      style: VALUE_STYLE,
    });
    valueText.x = (sw - valueText.width) / 2;
    valueText.y = 90;
    this._content.addChild(valueText);

    // Labels
    const sciLabel = new Text({ text: t("world.science"), style: LABEL_STYLE });
    const magLabel = new Text({ text: t("world.magic"), style: LABEL_STYLE });

    const sliderW = 400;
    const sliderX = (sw - sliderW) / 2;
    const sliderY = 150;

    sciLabel.x = sliderX - sciLabel.width - 16;
    sciLabel.y = sliderY - 4;
    this._content.addChild(sciLabel);

    magLabel.x = sliderX + sliderW + 16;
    magLabel.y = sliderY - 4;
    this._content.addChild(magLabel);

    // Slider track
    const track = new Graphics();
    track.roundRect(sliderX, sliderY, sliderW, 12, 6);
    track.fill({ color: 0x222244 });
    track.stroke({ color: 0x555577, width: 1 });
    this._content.addChild(track);

    // Filled portion (science = left, magic = right)
    const filled = new Graphics();
    const fillW = sliderW * ratio;
    filled.roundRect(sliderX + sliderW - fillW, sliderY + 1, fillW, 10, 5);
    filled.fill({ color: 0x8844cc, alpha: 0.6 });
    this._content.addChild(filled);

    const scienceFill = new Graphics();
    const sciFillW = sliderW * (1 - ratio);
    scienceFill.roundRect(sliderX, sliderY + 1, sciFillW, 10, 5);
    scienceFill.fill({ color: 0x44aa44, alpha: 0.6 });
    this._content.addChild(scienceFill);

    // Handle
    const handleX = sliderX + sliderW * ratio;
    const handle = new Graphics();
    handle.circle(0, 0, 10);
    handle.fill({ color: 0xffcc44 });
    handle.stroke({ color: 0xffffff, width: 2 });
    handle.position.set(handleX, sliderY + 6);
    this._content.addChild(handle);

    // Interactive slider area
    const hitArea = new Graphics();
    hitArea.rect(sliderX - 10, sliderY - 20, sliderW + 20, 52);
    hitArea.fill({ color: 0x000000, alpha: 0.01 });
    hitArea.eventMode = "static";
    hitArea.cursor = "pointer";

    let dragging = false;
    const updateSlider = (globalX: number) => {
      const localX = Math.max(0, Math.min(sliderW, globalX - sliderX));
      const newRatio = Math.round((localX / sliderW) * 20) / 20; // snap to 5% increments
      player.magicResearchRatio = Math.max(0, Math.min(1, newRatio));
      this._rebuild();
    };

    hitArea.on("pointerdown", (e) => {
      dragging = true;
      updateSlider(e.global.x);
    });
    hitArea.on("pointermove", (e) => {
      if (dragging) updateSlider(e.global.x);
    });
    hitArea.on("pointerup", () => { dragging = false; });
    hitArea.on("pointerupoutside", () => { dragging = false; });
    this._content.addChild(hitArea);

    // Tick marks
    for (let i = 0; i <= 20; i++) {
      const tx = sliderX + (sliderW * i) / 20;
      const tick = new Graphics();
      const isMajor = i % 4 === 0;
      tick.rect(tx - 0.5, sliderY + 16, 1, isMajor ? 8 : 4);
      tick.fill({ color: 0x555577 });
      this._content.addChild(tick);

      if (isMajor) {
        const pct = new Text({
          text: `${i * 5}%`,
          style: new TextStyle({ fontFamily: "monospace", fontSize: 8, fill: 0x666688 }),
        });
        pct.x = tx - pct.width / 2;
        pct.y = sliderY + 26;
        this._content.addChild(pct);
      }
    }

    // Flavor text
    const flavor = new Text({
      text: t("world.research_quote"),
      style: FLAVOR_STYLE,
    });
    flavor.x = (sw - flavor.width) / 2;
    flavor.y = sliderY + 70;
    this._content.addChild(flavor);

    this.container.addChild(this._content);
  }

  private _makeClose(x: number, y: number): Container {
    const btn = new Container();
    btn.eventMode = "static";
    btn.cursor = "pointer";

    const bg = new Graphics();
    bg.roundRect(0, 0, 24, 24, 4);
    bg.fill({ color: 0x333344 });
    bg.stroke({ color: 0x555577, width: 1 });
    btn.addChild(bg);

    const txt = new Text({
      text: "X",
      style: new TextStyle({ fontFamily: "monospace", fontSize: 14, fontWeight: "bold", fill: 0xff6666 }),
    });
    txt.anchor.set(0.5, 0.5);
    txt.position.set(12, 12);
    btn.addChild(txt);

    btn.position.set(x, y);
    btn.on("pointerdown", () => {
      this.hide();
      this.onClose?.();
    });
    return btn;
  }
}

export const researchSliderScreen = new ResearchSliderScreen();
