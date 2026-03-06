// Advisor dialog — shows Merlin or Queen advisor with flavor text.
//
// Full-screen overlay with a portrait image and randomised advice text.

import { Container, Graphics, Text, TextStyle, Sprite, Assets, Texture } from "pixi.js";
import type { ViewManager } from "@view/ViewManager";
import merlinImgUrl from "@/img/merlin.png";
import throneImgUrl from "@/img/throne.png";

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
  fontSize: 11,
  fill: 0xffffff,
});

// ---------------------------------------------------------------------------
// Flavor text pools
// ---------------------------------------------------------------------------

const MERLIN_QUOTES = [
  "The stars whisper of great change, my liege. Build granaries before winter's grip tightens, or your people shall know hunger.",
  "I sense dark magic stirring beyond the eastern mountains. Strengthen your mage towers — we shall need every spark of arcane might.",
  "A wise ruler invests in knowledge. The library I proposed would shorten our research by a full season. Consider it well.",
  "The ley lines beneath this city pulse with unusual vigour. 'Twould be a fine place for an aqueduct, channelling both water and mana.",
  "I have consulted the runes. They speak of an alliance forged in fire — perhaps the time has come to train more cavalry.",
  "Patience, my liege. Rome was not built in a day, and neither shall your empire be. But each building laid is a stone upon the path to greatness.",
  "The ancient texts speak of cities that fell not to siege, but to complacency. Keep your garrison strong and your walls higher.",
  "I have brewed a potion that may interest you — ah, but that is a matter for another day. For now, focus on your city's defences.",
  "The owls tell me an enemy scouts our borders. Perhaps a watchtower upon the western ridge would serve us well?",
  "Every great empire began as a single city with a single dream. Never lose sight of yours, my king.",
];

const QUEEN_QUOTES = [
  "The people grow restless, my lord. A marketplace would bring merchants from afar and gold to fill our coffers.",
  "I have spoken with the guild masters. They request a workshop to improve our production. I believe their petition has merit.",
  "Our children play in the streets while enemy armies march. We need a barracks — and we need it yesterday.",
  "The harvest festival approaches. With a granary, we could store enough grain to feast and still survive the winter.",
  "I dreamt of a great castle upon this hill, its banners flying in the wind. Perhaps it is time to build one worthy of our ambitions.",
  "The court is abuzz with rumours of a new trade route. A marketplace would let us profit handsomely from the passing caravans.",
  "I have been training the court ladies in archery. Do not look so surprised — an archery range would benefit us all.",
  "The temple bells have fallen silent. The monks say they need repairs. Shall we attend to matters of the spirit as well as the sword?",
  "A queen must think not only of war, but of the legacy we leave. Libraries preserve knowledge for generations yet unborn.",
  "I planted roses in the courtyard today. Even in times of war, beauty reminds us what we fight to protect.",
];

// ---------------------------------------------------------------------------
// AdvisorDialog
// ---------------------------------------------------------------------------

export class AdvisorDialog {
  readonly container = new Container();
  private _vm!: ViewManager;
  private _content = new Container();

  init(vm: ViewManager): void {
    this._vm = vm;
    vm.addToLayer("ui", this.container);
    this.container.visible = false;
  }

  show(advisor: "merlin" | "queen"): void {
    this.container.visible = true;
    this._rebuild(advisor);
  }

  hide(): void {
    this.container.visible = false;
    this._cleanup();
  }

  get isVisible(): boolean {
    return this.container.visible;
  }

  private _cleanup(): void {
    this._content.removeFromParent();
    this._content.destroy({ children: true });
    this._content = new Container();
  }

  private _rebuild(advisor: "merlin" | "queen"): void {
    this._cleanup();

    const sw = this._vm.screenWidth;
    const sh = this._vm.screenHeight;

    // Backdrop
    const bg = new Graphics();
    bg.rect(0, 0, sw, sh);
    bg.fill({ color: 0x000000, alpha: 0.85 });
    bg.eventMode = "static";
    this._content.addChild(bg);

    // Dialog box
    const DW = 520;
    const DH = 340;
    const dx = (sw - DW) / 2;
    const dy = (sh - DH) / 2;

    const dialogBg = new Graphics();
    dialogBg.roundRect(dx, dy, DW, DH, 10);
    dialogBg.fill({ color: 0x0c0c24, alpha: 0.95 });
    dialogBg.stroke({ color: advisor === "merlin" ? 0x4466aa : 0xaa6644, width: 2 });
    this._content.addChild(dialogBg);

    // Close button
    const closeBtn = this._makeClose(dx + DW - 34, dy + 8);
    this._content.addChild(closeBtn);

    // Portrait frame
    const PW = 140;
    const PH = 180;
    const px = dx + 20;
    const py = dy + 50;

    const portraitFrame = new Graphics();
    portraitFrame.roundRect(px, py, PW, PH, 6);
    portraitFrame.fill({ color: 0x080818 });
    portraitFrame.stroke({ color: advisor === "merlin" ? 0x4466aa : 0xaa6644, width: 1.5 });
    this._content.addChild(portraitFrame);

    // Load portrait image
    const imgUrl = advisor === "merlin" ? merlinImgUrl : throneImgUrl;
    void Assets.load(imgUrl).then((tex: Texture) => {
      if (!this.container.visible) return;
      const sprite = new Sprite(tex);
      const maxW = PW - 10;
      const maxH = PH - 10;
      const scale = Math.min(maxW / tex.width, maxH / tex.height);
      sprite.scale.set(scale);
      sprite.x = px + 5 + (maxW - tex.width * scale) / 2;
      sprite.y = py + 5 + (maxH - tex.height * scale) / 2;
      this._content.addChild(sprite);
    });

    // Title
    const name = advisor === "merlin" ? "MERLIN" : "THE QUEEN";
    const title = new Text({ text: name, style: TITLE_STYLE });
    title.x = dx + 20;
    title.y = dy + 14;
    this._content.addChild(title);

    // Subtitle
    const subtitle = advisor === "merlin"
      ? "Archmage of Avalon"
      : "Royal Advisor";
    const subText = new Text({ text: subtitle, style: SUBTITLE_STYLE });
    subText.x = dx + 20 + title.width + 12;
    subText.y = dy + 20;
    this._content.addChild(subText);

    // Advice text
    const quotes = advisor === "merlin" ? MERLIN_QUOTES : QUEEN_QUOTES;
    const quote = quotes[Math.floor(Math.random() * quotes.length)];

    const bodyStyle = new TextStyle({
      fontFamily: "monospace",
      fontSize: 13,
      fill: 0xdddddd,
      wordWrap: true,
      wordWrapWidth: DW - PW - 60,
      lineHeight: 20,
    });

    const quoteText = new Text({ text: `"${quote}"`, style: bodyStyle });
    quoteText.x = px + PW + 20;
    quoteText.y = py + 10;
    this._content.addChild(quoteText);

    // Decorative quote mark
    const bigQuote = new Text({
      text: "\u201C",
      style: new TextStyle({ fontFamily: "serif", fontSize: 48, fill: advisor === "merlin" ? 0x4466aa : 0xaa6644 }),
    });
    bigQuote.x = px + PW + 12;
    bigQuote.y = py - 10;
    this._content.addChild(bigQuote);

    // Dismiss button
    const dismissBtn = this._makeBtn("Very well.", dx + DW / 2 - 60, dy + DH - 48, 120, 28);
    this._content.addChild(dismissBtn);

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
    btn.on("pointerdown", () => this.hide());
    return btn;
  }

  private _makeBtn(label: string, x: number, y: number, w: number, h: number): Container {
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
    btn.on("pointerdown", () => this.hide());

    btn.on("pointerover", () => {
      bg.clear();
      bg.roundRect(0, 0, w, h, 4);
      bg.fill({ color: 0x334466 });
      bg.stroke({ color: 0x6688aa, width: 1 });
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

export const advisorDialog = new AdvisorDialog();
