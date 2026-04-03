import { Container, Graphics, Text, TextStyle } from "pixi.js";
import { viewManager } from "../../view/ViewManager";

type MenuPage = "main" | "controls" | "concepts" | "howtoplay";

// ---------------------------------------------------------------------------
// SolsticeEscapeMenu — pause overlay opened with ESC
// ---------------------------------------------------------------------------

export class SolsticeEscapeMenu {
  container: Container;

  onResume?: () => void;
  onQuit?:   () => void;

  private _sw: number;
  private _sh: number;
  private _mainPage: Container;
  private _subPage:  Container;

  constructor() {
    this._sw = viewManager.screenWidth;
    this._sh = viewManager.screenHeight;
    this.container  = new Container();
    this.container.eventMode = "auto";
    this._mainPage  = new Container();
    this._subPage   = new Container();
    this._build();
    this.container.visible = false;
  }

  // ---------------------------------------------------------------------------
  // Build
  // ---------------------------------------------------------------------------

  private _build(): void {
    const sw = this._sw;
    const sh = this._sh;

    // Full-screen backdrop — blocks all clicks through
    const backdrop = new Graphics().rect(0, 0, sw, sh).fill({ color: 0x000011, alpha: 0.78 });
    backdrop.eventMode = "static";
    this.container.addChild(backdrop);

    // Centered panel
    const pw = 480;
    const ph = 420;
    const panel = new Container();
    panel.position.set(sw / 2 - pw / 2, sh / 2 - ph / 2);

    const panelBg = new Graphics()
      .roundRect(0, 0, pw, ph, 10)
      .fill({ color: 0x050915, alpha: 0.97 })
      .stroke({ color: 0x334488, width: 1.5, alpha: 0.8 });
    panel.addChild(panelBg);

    // Title
    const title = _makeText("PAUSED", 22, 0xaaccff, true, 6);
    title.anchor.set(0.5, 0);
    title.position.set(pw / 2, 24);
    panel.addChild(title);

    // Divider
    const div = new Graphics().rect(40, 60, pw - 80, 1).fill({ color: 0x334488, alpha: 0.55 });
    panel.addChild(div);

    // Pages
    this._buildMainPage(pw, ph);
    panel.addChild(this._mainPage);
    panel.addChild(this._subPage);

    this.container.addChild(panel);
  }

  private _buildMainPage(pw: number, ph: number): void {
    const entries: Array<{ label: string; danger?: boolean; action: () => void }> = [
      { label: "RESUME",        action: () => this.onResume?.() },
      { label: "CONTROLS",      action: () => this._showPage("controls") },
      { label: "GAME CONCEPTS", action: () => this._showPage("concepts") },
      { label: "HOW TO PLAY",   action: () => this._showPage("howtoplay") },
      { label: "QUIT TO MENU",  danger: true, action: () => this.onQuit?.() },
    ];

    const btnW = 300;
    const btnH = 44;
    const gap  = 12;
    const totalH = entries.length * btnH + (entries.length - 1) * gap;
    let y = (ph - totalH) / 2 + 18;

    for (const entry of entries) {
      const btn = this._makeButton(entry.label, btnW, btnH, entry.danger ?? false);
      btn.position.set(pw / 2 - btnW / 2, y);
      btn.on("pointertap", entry.action);
      this._mainPage.addChild(btn);
      y += btnH + gap;
    }
  }

  // ---------------------------------------------------------------------------
  // Sub-pages
  // ---------------------------------------------------------------------------

  private _showPage(page: MenuPage): void {
    this._mainPage.visible = false;
    this._subPage.removeChildren();
    this._buildSubPage(page);
    this._subPage.visible = true;
  }

  private _buildSubPage(page: MenuPage): void {
    const pw = 480;
    const ph = 420;

    let heading = "";
    let lines: string[] = [];

    switch (page) {
      case "controls":
        heading = "CONTROLS";
        lines = [
          "1 / 2 / 3      Spawn Guardian / Warden / Invoker",
          "Click platform  Set rally point for your units",
          "Drag            Orbit camera",
          "Scroll          Zoom in / out",
          "ESC             Open / close this menu",
        ];
        break;

      case "concepts":
        heading = "GAME CONCEPTS";
        lines = [
          "PLATFORMS   Capture them to earn Essence income.",
          "ESSENCE     Currency spent to spawn combat units.",
          "ALIGNMENT   Occurs at dawn & dusk each cycle.",
          "            Majority platform holder scores +1 point.",
          "VICTORY     First to 3 Alignment points wins.",
          "",
          "DAY         Your units deal bonus damage.",
          "NIGHT       Enemy units deal bonus damage.",
          "CENTER      The center platform grants bonus Essence.",
        ];
        break;

      case "howtoplay":
        heading = "HOW TO PLAY";
        lines = [
          "Spawn units with keys 1 / 2 / 3.",
          "Click any platform to rally your units there —",
          "they will march and fight toward it.",
          "",
          "Capture platforms to increase your Essence",
          "income, then spend Essence on more units.",
          "",
          "Score points by holding the majority of",
          "platforms at each Grand Alignment (dawn & dusk).",
          "First to 3 points wins the Solstice.",
        ];
        break;
    }

    const headingT = _makeText(heading, 15, 0xffdd88, true, 4);
    headingT.anchor.set(0.5, 0);
    headingT.position.set(pw / 2, 74);
    this._subPage.addChild(headingT);

    const divider = new Graphics().rect(40, 100, pw - 80, 1).fill({ color: 0x443300, alpha: 0.5 });
    this._subPage.addChild(divider);

    let y = 114;
    for (const line of lines) {
      if (line === "") { y += 8; continue; }
      const t = _makeText(line, 12, 0xaabbcc, false, 0.3);
      t.position.set(44, y);
      this._subPage.addChild(t);
      y += 22;
    }

    // Back button
    const back = this._makeButton("← BACK", 140, 36);
    back.position.set(pw / 2 - 70, ph - 54);
    back.on("pointertap", () => {
      this._subPage.visible = false;
      this._mainPage.visible = true;
    });
    this._subPage.addChild(back);
  }

  // ---------------------------------------------------------------------------
  // Button helper
  // ---------------------------------------------------------------------------

  private _makeButton(label: string, w: number, h: number, danger = false): Container {
    const cont = new Container();
    cont.eventMode = "static";
    cont.cursor    = "pointer";

    const fillNormal  = danger ? 0x1a0505 : 0x080e1e;
    const fillHover   = danger ? 0x280a0a : 0x101828;
    const borderNormal = danger ? 0x882222 : 0x334488;
    const borderHover  = danger ? 0xcc4444 : 0x5577bb;
    const textColor    = danger ? 0xff7777 : 0xaaccff;

    const bg = new Graphics();
    const drawBg = (hovered: boolean) => {
      bg.clear()
        .roundRect(0, 0, w, h, 6)
        .fill({ color: hovered ? fillHover : fillNormal, alpha: 0.92 })
        .stroke({ color: hovered ? borderHover : borderNormal, alpha: 0.8, width: 1.5 });
    };
    drawBg(false);
    cont.addChild(bg);

    const lbl = _makeText(label, 13, textColor, true, 2.5);
    lbl.anchor.set(0.5, 0.5);
    lbl.position.set(w / 2, h / 2);
    cont.addChild(lbl);

    cont.on("pointerover", () => drawBg(true));
    cont.on("pointerout",  () => drawBg(false));

    return cont;
  }

  // ---------------------------------------------------------------------------
  // Visibility
  // ---------------------------------------------------------------------------

  show(): void {
    this._subPage.removeChildren();
    this._subPage.visible  = false;
    this._mainPage.visible = true;
    this.container.visible = true;
  }

  hide(): void {
    this.container.visible = false;
  }

  destroy(): void {
    this.container.destroy({ children: true });
  }
}

// ---------------------------------------------------------------------------

function _makeText(
  text: string,
  size: number,
  fill: number,
  bold: boolean,
  letterSpacing: number,
): Text {
  return new Text({
    text,
    style: new TextStyle({
      fontFamily:    "monospace",
      fontSize:      size,
      fill,
      fontWeight:    bold ? "bold" : "normal",
      letterSpacing,
    }),
  });
}
