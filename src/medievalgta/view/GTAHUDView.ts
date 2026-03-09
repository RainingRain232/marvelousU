// ---------------------------------------------------------------------------
// GTAHUDView — heads-up display overlay: health, stamina, wanted level,
// quest tracker, notifications, dialog box, quest log, game over screen.
// ---------------------------------------------------------------------------

import { Container, Graphics, Text, TextStyle } from "pixi.js";
import type { MedievalGTAState } from "../state/MedievalGTAState";

const PANEL_BG = 0x1a1a2e;
const PANEL_ALPHA = 0.85;
const GOLD_COLOR = 0xDAA520;
const FONT = "monospace";

function medievalStyle(size: number, fill: number, bold = false): TextStyle {
  return new TextStyle({
    fontFamily: FONT,
    fontSize: size,
    fill,
    fontWeight: bold ? "bold" : "normal",
  });
}

export class GTAHUDView {
  readonly container = new Container();

  // Sub-containers
  private statusPanel = new Container();
  private wantedPanel = new Container();
  private questTracker = new Container();
  private notificationContainer = new Container();
  private locationLabel: Text | null = null;
  private dialogBox = new Container();
  private questLogOverlay = new Container();
  private gameOverOverlay = new Container();
  private pauseMenuOverlay = new Container();

  // Exit callback
  private _onExit: (() => void) | null = null;

  // Cached elements
  private hpBarBg!: Graphics;
  private hpBarFill!: Graphics;
  private hpText!: Text;
  private staBarBg!: Graphics;
  private staBarFill!: Graphics;
  private staText!: Text;
  private goldText!: Text;
  private weaponText!: Text;
  private goldIcon!: Graphics;

  private wantedShields: Graphics[] = [];
  private wantedLabel!: Text;

  private lastLocation = "";
  private locationFadeTimer = 0;

  init(screenW: number, screenH: number, onExit?: () => void): void {
    this.container.removeChildren();
    this._onExit = onExit ?? null;

    this.buildStatusPanel();
    this.buildWantedPanel(screenW);
    this.buildQuestTracker();
    this.buildLocationLabel(screenW);
    this.buildDialogBox(screenW, screenH);
    this.buildQuestLogOverlay(screenW, screenH);
    this.buildGameOverOverlay(screenW, screenH);
    this.buildPauseMenu(screenW, screenH);

    this.container.addChild(this.statusPanel);
    this.container.addChild(this.wantedPanel);
    this.container.addChild(this.questTracker);
    this.container.addChild(this.notificationContainer);
    if (this.locationLabel) this.container.addChild(this.locationLabel);
    this.container.addChild(this.dialogBox);
    this.container.addChild(this.questLogOverlay);
    this.container.addChild(this.gameOverOverlay);
    this.container.addChild(this.pauseMenuOverlay);
  }

  // ===================== BUILD UI =====================

  private buildStatusPanel(): void {
    this.statusPanel.removeChildren();
    const panelW = 220, panelH = 110;
    const bg = new Graphics();
    bg.roundRect(0, 0, panelW, panelH, 6).fill({ color: PANEL_BG, alpha: PANEL_ALPHA });
    bg.roundRect(0, 0, panelW, panelH, 6).stroke({ color: GOLD_COLOR, width: 1.5, alpha: 0.7 });
    this.statusPanel.addChild(bg);
    this.statusPanel.position.set(12, 12);

    // HP bar
    const hpY = 12;
    const hpLabel = new Text({ text: "HP", style: medievalStyle(10, 0xFF6666, true) });
    hpLabel.position.set(10, hpY);
    this.statusPanel.addChild(hpLabel);

    this.hpBarBg = new Graphics();
    this.hpBarBg.roundRect(35, hpY, 130, 12, 3).fill({ color: 0x331111 });
    this.statusPanel.addChild(this.hpBarBg);

    this.hpBarFill = new Graphics();
    this.statusPanel.addChild(this.hpBarFill);

    this.hpText = new Text({ text: "100/100", style: medievalStyle(9, 0xFFCCCC) });
    this.hpText.position.set(170, hpY + 1);
    this.statusPanel.addChild(this.hpText);

    // Stamina bar
    const staY = 30;
    const staLabel = new Text({ text: "STA", style: medievalStyle(10, 0x66FF66, true) });
    staLabel.position.set(6, staY);
    this.statusPanel.addChild(staLabel);

    this.staBarBg = new Graphics();
    this.staBarBg.roundRect(35, staY, 130, 12, 3).fill({ color: 0x113311 });
    this.statusPanel.addChild(this.staBarBg);

    this.staBarFill = new Graphics();
    this.statusPanel.addChild(this.staBarFill);

    this.staText = new Text({ text: "100", style: medievalStyle(9, 0xCCFFCC) });
    this.staText.position.set(170, staY + 1);
    this.statusPanel.addChild(this.staText);

    // Gold
    const goldY = 52;
    this.goldIcon = new Graphics();
    this.goldIcon.circle(16, goldY + 7, 6).fill({ color: 0xDAA520 });
    this.goldIcon.circle(16, goldY + 7, 6).stroke({ color: 0xAA8800, width: 1 });
    // G letter on coin
    const gText = new Text({ text: "G", style: medievalStyle(7, 0x8B6914, true) });
    gText.anchor.set(0.5, 0.5);
    gText.position.set(16, goldY + 7);
    this.statusPanel.addChild(this.goldIcon);
    this.statusPanel.addChild(gText);

    this.goldText = new Text({ text: "20", style: medievalStyle(12, GOLD_COLOR, true) });
    this.goldText.position.set(28, goldY + 1);
    this.statusPanel.addChild(this.goldText);

    // Weapon display
    const weapY = 74;
    const weapIcon = new Graphics();
    // Sword icon
    weapIcon.moveTo(10, weapY + 4).lineTo(26, weapY + 4).stroke({ color: 0xBBBBBB, width: 2 });
    weapIcon.moveTo(16, weapY + 1).lineTo(16, weapY + 7).stroke({ color: 0x8B6914, width: 1.5 });
    this.statusPanel.addChild(weapIcon);

    this.weaponText = new Text({ text: "Fists", style: medievalStyle(11, 0xCCCCCC) });
    this.weaponText.position.set(32, weapY);
    this.statusPanel.addChild(this.weaponText);

    // Decorative corners
    const cornerSize = 6;
    const corners = new Graphics();
    // Top-left corner flourish
    corners.moveTo(0, cornerSize).lineTo(0, 0).lineTo(cornerSize, 0).stroke({ color: GOLD_COLOR, width: 2 });
    // Top-right
    corners.moveTo(panelW - cornerSize, 0).lineTo(panelW, 0).lineTo(panelW, cornerSize).stroke({ color: GOLD_COLOR, width: 2 });
    // Bottom-left
    corners.moveTo(0, panelH - cornerSize).lineTo(0, panelH).lineTo(cornerSize, panelH).stroke({ color: GOLD_COLOR, width: 2 });
    // Bottom-right
    corners.moveTo(panelW - cornerSize, panelH).lineTo(panelW, panelH).lineTo(panelW, panelH - cornerSize).stroke({ color: GOLD_COLOR, width: 2 });
    this.statusPanel.addChild(corners);
  }

  private buildWantedPanel(screenW: number): void {
    this.wantedPanel.removeChildren();
    this.wantedShields = [];
    this.wantedPanel.position.set(screenW - 200, 12);

    const bg = new Graphics();
    bg.roundRect(0, 0, 185, 45, 5).fill({ color: PANEL_BG, alpha: PANEL_ALPHA });
    bg.roundRect(0, 0, 185, 45, 5).stroke({ color: GOLD_COLOR, width: 1, alpha: 0.5 });
    this.wantedPanel.addChild(bg);

    this.wantedLabel = new Text({ text: "", style: medievalStyle(10, 0xFF3333, true) });
    this.wantedLabel.anchor.set(0.5, 0);
    this.wantedLabel.position.set(92, 3);
    this.wantedPanel.addChild(this.wantedLabel);

    // 5 shield shapes
    for (let i = 0; i < 5; i++) {
      const shield = new Graphics();
      shield.position.set(18 + i * 33, 18);
      this.wantedShields.push(shield);
      this.wantedPanel.addChild(shield);
    }
  }

  private drawShield(g: Graphics, filled: boolean, pulsing: boolean): void {
    g.clear();
    const color = filled ? 0xCC2222 : 0x444444;
    const alpha = filled ? 1 : 0.4;
    // Shield shape (pointed bottom)
    g.poly([0, 0, 14, 0, 14, 12, 7, 20, 0, 12]).fill({ color, alpha });
    g.poly([0, 0, 14, 0, 14, 12, 7, 20, 0, 12]).stroke({ color: filled ? 0xFF4444 : 0x555555, width: 1 });
    if (filled) {
      // Cross emblem
      g.rect(5, 2, 4, 12).fill({ color: 0xFFCC00, alpha: 0.8 });
      g.rect(2, 5, 10, 4).fill({ color: 0xFFCC00, alpha: 0.8 });
    }
    if (pulsing) {
      g.poly([0, 0, 14, 0, 14, 12, 7, 20, 0, 12]).fill({ color: 0xFF0000, alpha: 0.2 });
    }
  }

  private buildQuestTracker(): void {
    this.questTracker.removeChildren();
    this.questTracker.position.set(12, 140);
    this.questTracker.visible = false;
  }

  private buildLocationLabel(screenW: number): void {
    this.locationLabel = new Text({
      text: "",
      style: new TextStyle({
        fontFamily: FONT, fontSize: 14, fill: GOLD_COLOR,
        fontWeight: "bold",
        stroke: { color: 0x000000, width: 3 },
        letterSpacing: 2,
      }),
    });
    this.locationLabel.anchor.set(0.5, 0);
    this.locationLabel.position.set(screenW / 2, 14);
    this.locationLabel.alpha = 0;
  }

  private buildDialogBox(screenW: number, screenH: number): void {
    this.dialogBox.removeChildren();
    this.dialogBox.visible = false;
    const boxW = 500, boxH = 150;
    const bx = (screenW - boxW) / 2;
    const by = screenH - boxH - 60;

    const bg = new Graphics();
    // Double border
    bg.roundRect(bx - 4, by - 4, boxW + 8, boxH + 8, 8).stroke({ color: GOLD_COLOR, width: 2 });
    bg.roundRect(bx, by, boxW, boxH, 6).fill({ color: PANEL_BG, alpha: 0.92 });
    bg.roundRect(bx, by, boxW, boxH, 6).stroke({ color: GOLD_COLOR, width: 1.5, alpha: 0.8 });
    // Inner decorative line
    bg.roundRect(bx + 6, by + 6, boxW - 12, boxH - 12, 3).stroke({ color: GOLD_COLOR, width: 0.5, alpha: 0.3 });
    this.dialogBox.addChild(bg);

    // Name text
    const nameText = new Text({ text: "", style: medievalStyle(13, GOLD_COLOR, true) });
    nameText.position.set(bx + 16, by + 12);
    nameText.name = "dialogName";
    this.dialogBox.addChild(nameText);

    // Separator line
    const sep = new Graphics();
    sep.moveTo(bx + 12, by + 30).lineTo(bx + boxW - 12, by + 30).stroke({ color: GOLD_COLOR, width: 0.5, alpha: 0.5 });
    this.dialogBox.addChild(sep);

    // Dialog text
    const dialogText = new Text({
      text: "",
      style: new TextStyle({
        fontFamily: FONT, fontSize: 11, fill: 0xEEEEEE, wordWrap: true, wordWrapWidth: boxW - 32,
      }),
    });
    dialogText.position.set(bx + 16, by + 38);
    dialogText.name = "dialogText";
    this.dialogBox.addChild(dialogText);

    // Continue prompt
    const continueText = new Text({
      text: "[E] Continue",
      style: medievalStyle(10, 0xAAAA88),
    });
    continueText.anchor.set(1, 1);
    continueText.position.set(bx + boxW - 16, by + boxH - 10);
    continueText.name = "dialogContinue";
    this.dialogBox.addChild(continueText);
  }

  private buildQuestLogOverlay(screenW: number, screenH: number): void {
    this.questLogOverlay.removeChildren();
    this.questLogOverlay.visible = false;

    // Dark overlay
    const overlay = new Graphics();
    overlay.rect(0, 0, screenW, screenH).fill({ color: 0x000000, alpha: 0.7 });
    this.questLogOverlay.addChild(overlay);

    // Panel
    const panelW = 450, panelH = 500;
    const px = (screenW - panelW) / 2, py = (screenH - panelH) / 2;
    const bg = new Graphics();
    bg.roundRect(px, py, panelW, panelH, 8).fill({ color: PANEL_BG, alpha: 0.95 });
    bg.roundRect(px, py, panelW, panelH, 8).stroke({ color: GOLD_COLOR, width: 2 });
    // Inner border
    bg.roundRect(px + 6, py + 6, panelW - 12, panelH - 12, 4).stroke({ color: GOLD_COLOR, width: 0.5, alpha: 0.3 });
    this.questLogOverlay.addChild(bg);

    // Title
    const title = new Text({
      text: "QUEST LOG",
      style: new TextStyle({
        fontFamily: FONT, fontSize: 18, fill: GOLD_COLOR, fontWeight: "bold", letterSpacing: 4,
      }),
    });
    title.anchor.set(0.5, 0);
    title.position.set(screenW / 2, py + 14);
    this.questLogOverlay.addChild(title);

    // Decorative separator
    const sep = new Graphics();
    sep.moveTo(px + 20, py + 42).lineTo(px + panelW - 20, py + 42).stroke({ color: GOLD_COLOR, width: 1, alpha: 0.5 });
    // Diamond accents
    sep.poly([px + panelW / 2 - 4, py + 42, px + panelW / 2, py + 38, px + panelW / 2 + 4, py + 42, px + panelW / 2, py + 46]).fill({ color: GOLD_COLOR });
    this.questLogOverlay.addChild(sep);

    // Quest entries container
    const questEntries = new Container();
    questEntries.name = "questEntries";
    questEntries.position.set(px + 16, py + 52);
    this.questLogOverlay.addChild(questEntries);

    // Close hint
    const closeHint = new Text({
      text: "[TAB] Close",
      style: medievalStyle(10, 0x888888),
    });
    closeHint.anchor.set(0.5, 1);
    closeHint.position.set(screenW / 2, py + panelH - 10);
    this.questLogOverlay.addChild(closeHint);
  }

  private buildGameOverOverlay(screenW: number, screenH: number): void {
    this.gameOverOverlay.removeChildren();
    this.gameOverOverlay.visible = false;

    const overlay = new Graphics();
    overlay.rect(0, 0, screenW, screenH).fill({ color: 0x110000, alpha: 0.75 });
    this.gameOverOverlay.addChild(overlay);

    // Blood drip vignette effect
    const vignette = new Graphics();
    vignette.rect(0, 0, screenW, 40).fill({ color: 0x660000, alpha: 0.4 });
    vignette.rect(0, screenH - 40, screenW, 40).fill({ color: 0x660000, alpha: 0.4 });
    this.gameOverOverlay.addChild(vignette);

    const diedText = new Text({
      text: "YOU DIED",
      style: new TextStyle({
        fontFamily: FONT, fontSize: 52, fill: 0x880000,
        fontWeight: "bold", letterSpacing: 8,
        stroke: { color: 0x220000, width: 4 },
      }),
    });
    diedText.anchor.set(0.5, 0.5);
    diedText.position.set(screenW / 2, screenH / 2 - 20);
    this.gameOverOverlay.addChild(diedText);

    const restartText = new Text({
      text: "Press R to restart",
      style: medievalStyle(16, 0x996666),
    });
    restartText.anchor.set(0.5, 0.5);
    restartText.position.set(screenW / 2, screenH / 2 + 40);
    this.gameOverOverlay.addChild(restartText);
  }

  private buildPauseMenu(screenW: number, screenH: number): void {
    this.pauseMenuOverlay.removeChildren();
    this.pauseMenuOverlay.visible = false;

    // Dark overlay
    const overlay = new Graphics();
    overlay.rect(0, 0, screenW, screenH).fill({ color: 0x000011, alpha: 0.7 });
    this.pauseMenuOverlay.addChild(overlay);

    // Panel
    const panelW = 420, panelH = 560;
    const px = (screenW - panelW) / 2;
    const py = (screenH - panelH) / 2;

    const panel = new Graphics();
    panel.roundRect(px, py, panelW, panelH, 8).fill({ color: 0x12122a, alpha: 0.95 });
    panel.roundRect(px, py, panelW, panelH, 8).stroke({ color: GOLD_COLOR, width: 2 });
    // Inner border
    panel.roundRect(px + 4, py + 4, panelW - 8, panelH - 8, 6).stroke({ color: GOLD_COLOR, width: 0.5, alpha: 0.3 });
    this.pauseMenuOverlay.addChild(panel);

    // Title
    const title = new Text({
      text: "PAUSED",
      style: new TextStyle({
        fontFamily: FONT, fontSize: 28, fill: GOLD_COLOR,
        fontWeight: "bold", letterSpacing: 6,
      }),
    });
    title.anchor.set(0.5, 0);
    title.position.set(screenW / 2, py + 16);
    this.pauseMenuOverlay.addChild(title);

    // Divider
    const divider = new Graphics();
    divider.rect(px + 20, py + 52, panelW - 40, 1).fill({ color: GOLD_COLOR, alpha: 0.3 });
    this.pauseMenuOverlay.addChild(divider);

    // Controls section
    const controls = [
      ["WASD", "Move"],
      ["Shift", "Run (uses stamina)"],
      ["Space", "Dodge roll"],
      ["Left Click", "Attack"],
      ["Right Click", "Block"],
      ["E", "Interact / Mount horse"],
      ["F", "Steal horse"],
      ["Q / Tab", "Quest log"],
      ["1 / 2 / 3", "Switch weapon"],
      ["Esc", "Pause menu"],
    ];

    const controlsTitle = new Text({
      text: "CONTROLS",
      style: medievalStyle(13, GOLD_COLOR, true),
    });
    controlsTitle.position.set(px + 20, py + 64);
    this.pauseMenuOverlay.addChild(controlsTitle);

    let cy = py + 85;
    for (const [key, desc] of controls) {
      const keyText = new Text({
        text: key,
        style: medievalStyle(10, 0xCCBB88, true),
      });
      keyText.position.set(px + 24, cy);
      this.pauseMenuOverlay.addChild(keyText);

      const descText = new Text({
        text: desc,
        style: medievalStyle(10, 0x99AABB),
      });
      descText.position.set(px + 130, cy);
      this.pauseMenuOverlay.addChild(descText);
      cy += 18;
    }

    // Quest guide divider
    cy += 6;
    const div2 = new Graphics();
    div2.rect(px + 20, cy, panelW - 40, 1).fill({ color: GOLD_COLOR, alpha: 0.3 });
    this.pauseMenuOverlay.addChild(div2);
    cy += 8;

    const questTitle = new Text({
      text: "QUESTS",
      style: medievalStyle(13, GOLD_COLOR, true),
    });
    questTitle.position.set(px + 20, cy);
    this.pauseMenuOverlay.addChild(questTitle);
    cy += 18;

    const questHints: Array<[string, string]> = [
      ["The Missing Merchant", "Talk to Margaret at market, find Edmund near south gate"],
      ["Bandit Trouble", "Captain Gareth (barracks) — kill 3 criminals near prison"],
      ["The Holy Relic", "Priest at church — pick up key near the tavern"],
      ["Royal Escort", "Knight at barracks — escort him safely to the castle"],
      ["Tax Collection", "Steward at castle — talk to 3 merchants at market"],
      ["Horse Thief", "Stable master — find horse outside south gate, ride it back"],
    ];

    for (const [name, hint] of questHints) {
      const nameText = new Text({
        text: `\u2022 ${name}`,
        style: medievalStyle(9, 0xCCBB88, true),
      });
      nameText.position.set(px + 24, cy);
      this.pauseMenuOverlay.addChild(nameText);

      const hintText = new Text({
        text: hint,
        style: medievalStyle(8, 0x8899AA),
      });
      hintText.position.set(px + 30, cy + 12);
      this.pauseMenuOverlay.addChild(hintText);
      cy += 26;
    }

    // Buttons
    const btnW = 200, btnH = 32;
    const btnX = screenW / 2 - btnW / 2;

    // Resume button
    const resumeBtn = new Container();
    resumeBtn.eventMode = "static";
    resumeBtn.cursor = "pointer";
    const resumeBg = new Graphics();
    resumeBg.roundRect(0, 0, btnW, btnH, 5).fill({ color: 0x224422 });
    resumeBg.roundRect(0, 0, btnW, btnH, 5).stroke({ color: 0x44AA44, width: 1.5 });
    resumeBtn.addChild(resumeBg);
    const resumeLbl = new Text({ text: "RESUME", style: medievalStyle(13, 0x88FF88, true) });
    resumeLbl.anchor.set(0.5, 0.5);
    resumeLbl.position.set(btnW / 2, btnH / 2);
    resumeBtn.addChild(resumeLbl);
    resumeBtn.position.set(btnX, py + panelH - 90);
    resumeBtn.on("pointerover", () => { resumeBg.tint = 0xAAFFAA; });
    resumeBtn.on("pointerout", () => { resumeBg.tint = 0xFFFFFF; });
    resumeBtn.on("pointerdown", () => {
      this._resumeCallback?.();
    });
    this.pauseMenuOverlay.addChild(resumeBtn);

    // Back to Main Menu button
    const exitBtn = new Container();
    exitBtn.eventMode = "static";
    exitBtn.cursor = "pointer";
    const exitBg = new Graphics();
    exitBg.roundRect(0, 0, btnW, btnH, 5).fill({ color: 0x442222 });
    exitBg.roundRect(0, 0, btnW, btnH, 5).stroke({ color: 0xAA4444, width: 1.5 });
    exitBtn.addChild(exitBg);
    const exitLbl = new Text({ text: "BACK TO MAIN MENU", style: medievalStyle(13, 0xFF8888, true) });
    exitLbl.anchor.set(0.5, 0.5);
    exitLbl.position.set(btnW / 2, btnH / 2);
    exitBtn.addChild(exitLbl);
    exitBtn.position.set(btnX, py + panelH - 50);
    exitBtn.on("pointerover", () => { exitBg.tint = 0xFFAAAA; });
    exitBtn.on("pointerout", () => { exitBg.tint = 0xFFFFFF; });
    exitBtn.on("pointerdown", () => {
      if (this._onExit) this._onExit();
    });
    this.pauseMenuOverlay.addChild(exitBtn);
  }

  // Resume callback — set by update when pause menu is visible
  private _resumeCallback: (() => void) | null = null;

  // ===================== UPDATE =====================

  update(state: MedievalGTAState, screenW: number, screenH: number): void {
    const p = state.player;

    // --- Status Panel ---
    this.updateBars(p.hp, p.maxHp, p.runStamina);
    this.goldText.text = `${p.gold}`;
    const weaponNames: Record<string, string> = { fists: "Fists", sword: "Sword", bow: "Bow" };
    this.weaponText.text = weaponNames[p.weapon] ?? p.weapon;

    // --- Wanted Level ---
    this.updateWanted(p.wantedLevel, state.tick);

    // --- Quest Tracker ---
    this.updateQuestTracker(state);

    // --- Location Label ---
    this.updateLocation(state, screenW);

    // --- Notifications ---
    this.updateNotifications(state, screenW, screenH);

    // --- Dialog Box ---
    this.updateDialog(state, screenW, screenH);

    // --- Quest Log ---
    this.updateQuestLog(state, screenW, screenH);

    // --- Game Over ---
    this.gameOverOverlay.visible = state.gameOver;

    // --- Pause Menu ---
    this.pauseMenuOverlay.visible = !!state.showPauseMenu;
    this._resumeCallback = () => {
      state.paused = false;
      state.showPauseMenu = false;
    };
  }

  private updateBars(hp: number, maxHp: number, stamina: number): void {
    // HP
    const hpPct = Math.max(0, hp / maxHp);
    this.hpBarFill.clear();
    const hpColor = hpPct > 0.5 ? 0xCC3333 : hpPct > 0.25 ? 0xCC6633 : 0xCC2222;
    if (hpPct > 0) {
      this.hpBarFill.roundRect(35, 12, 130 * hpPct, 12, 3).fill({ color: hpColor });
      // Shine
      this.hpBarFill.roundRect(35, 12, 130 * hpPct, 5, 3).fill({ color: 0xFFFFFF, alpha: 0.1 });
    }
    this.hpText.text = `${Math.ceil(hp)}/${maxHp}`;

    // Stamina
    const staPct = Math.max(0, stamina / 100);
    this.staBarFill.clear();
    if (staPct > 0) {
      this.staBarFill.roundRect(35, 30, 130 * staPct, 12, 3).fill({ color: 0x44AA44 });
      this.staBarFill.roundRect(35, 30, 130 * staPct, 5, 3).fill({ color: 0xFFFFFF, alpha: 0.1 });
    }
    this.staText.text = `${Math.ceil(stamina)}`;
  }

  private updateWanted(level: number, tick: number): void {
    const pulsing = level >= 5 && Math.floor(tick * 0.1) % 2 === 0;
    for (let i = 0; i < 5; i++) {
      this.drawShield(this.wantedShields[i], i < level, pulsing && i < level);
    }
    if (level > 0) {
      this.wantedLabel.text = "WANTED";
      // Flash effect
      this.wantedLabel.alpha = level >= 4 ? (Math.sin(tick * 0.15) * 0.3 + 0.7) : 1;
    } else {
      this.wantedLabel.text = "";
    }
  }

  private updateQuestTracker(state: MedievalGTAState): void {
    const activeQuests = state.quests.filter(q => q.status === 'active');
    this.questTracker.removeChildren();

    if (activeQuests.length === 0) {
      this.questTracker.visible = false;
      return;
    }

    this.questTracker.visible = true;
    const quest = activeQuests[0]; // Show first active quest

    const panelW = 250, panelH = 70;
    const bg = new Graphics();
    bg.roundRect(0, 0, panelW, panelH, 5).fill({ color: PANEL_BG, alpha: 0.8 });
    bg.roundRect(0, 0, panelW, panelH, 5).stroke({ color: GOLD_COLOR, width: 1, alpha: 0.5 });
    this.questTracker.addChild(bg);

    // Quest icon
    const icon = new Graphics();
    icon.circle(12, 14, 8).fill({ color: GOLD_COLOR, alpha: 0.3 });
    const iconText = new Text({ text: "!", style: medievalStyle(11, GOLD_COLOR, true) });
    iconText.anchor.set(0.5, 0.5);
    iconText.position.set(12, 14);
    this.questTracker.addChild(icon);
    this.questTracker.addChild(iconText);

    const title = new Text({ text: quest.title, style: medievalStyle(10, GOLD_COLOR, true) });
    title.position.set(26, 5);
    this.questTracker.addChild(title);

    // Current objective
    const obj = quest.objectives.find(o => !o.completed) ?? quest.objectives[0];
    let objText = obj.description;
    // Progress for kill quests
    if (obj.type === 'kill' && obj.killCount) {
      objText += ` (${obj.killCurrent ?? 0}/${obj.killCount})`;
    } else if (obj.type === 'collect' && obj.itemCount) {
      objText += ` (${obj.itemCurrent ?? 0}/${obj.itemCount})`;
    }
    const objLabel = new Text({
      text: objText,
      style: new TextStyle({ fontFamily: FONT, fontSize: 9, fill: 0xBBBBBB, wordWrap: true, wordWrapWidth: panelW - 16 }),
    });
    objLabel.position.set(10, 28);
    this.questTracker.addChild(objLabel);

    // Progress bar for kill/collect
    if ((obj.type === 'kill' && obj.killCount) || (obj.type === 'collect' && obj.itemCount)) {
      const current = obj.type === 'kill' ? (obj.killCurrent ?? 0) : (obj.itemCurrent ?? 0);
      const total = obj.type === 'kill' ? obj.killCount! : obj.itemCount!;
      const pct = Math.min(1, current / total);
      const pbar = new Graphics();
      pbar.roundRect(10, 52, panelW - 20, 6, 2).fill({ color: 0x333333 });
      if (pct > 0) {
        pbar.roundRect(10, 52, (panelW - 20) * pct, 6, 2).fill({ color: GOLD_COLOR, alpha: 0.7 });
      }
      this.questTracker.addChild(pbar);
    }
  }

  private updateLocation(state: MedievalGTAState, screenW: number): void {
    if (!this.locationLabel) return;

    const location = this.getLocationName(state);
    if (location !== this.lastLocation) {
      this.lastLocation = location;
      this.locationLabel.text = location;
      this.locationFadeTimer = 180; // ~3 seconds at 60fps
    }

    if (this.locationFadeTimer > 0) {
      this.locationFadeTimer--;
      if (this.locationFadeTimer > 150) {
        // Fade in
        this.locationLabel.alpha = 1 - (this.locationFadeTimer - 150) / 30;
      } else if (this.locationFadeTimer < 30) {
        // Fade out
        this.locationLabel.alpha = this.locationFadeTimer / 30;
      } else {
        this.locationLabel.alpha = 1;
      }
    } else {
      this.locationLabel.alpha = 0;
    }

    this.locationLabel.position.set(screenW / 2, 14);
  }

  private getLocationName(state: MedievalGTAState): string {
    const px = state.player.pos.x;
    const py = state.player.pos.y;
    const city = state.cityBounds;

    // Outside city?
    if (px < city.x || px > city.x + city.w || py < city.y || py > city.y + city.h) {
      if (py < city.y) return "Outside Camelot - Northern Forest";
      if (py > city.y + city.h) return "Outside Camelot - Southern Farms";
      if (px < city.x) return "Outside Camelot - Western Fields";
      return "Outside Camelot - Eastern Plains";
    }

    // Inside city - check specific areas
    // Castle
    if (px < 1350 && py < 1100) return "CAMELOT - Castle Keep";
    // Barracks
    if (px >= 1350 && px < 1950 && py < 900) return "CAMELOT - Barracks";
    // Church
    if (px >= 1950 && py < 900) return "CAMELOT - Church District";
    // Market
    if (px >= 1400 && px < 2150 && py >= 1100 && py < 1750) return "CAMELOT - Market Square";
    // Tavern
    if (px >= 2150 && py >= 1100 && py < 1500) return "CAMELOT - Tavern Quarter";
    // Blacksmith
    if (px < 1200 && py >= 1100 && py < 1500) return "CAMELOT - Blacksmith Lane";
    // Prison
    if (px < 1300 && py >= 1500) return "CAMELOT - Prison District";
    // Stable
    if (px >= 2500 && py >= 1700) return "CAMELOT - Stables";

    return "CAMELOT";
  }

  private updateNotifications(state: MedievalGTAState, screenW: number, screenH: number): void {
    this.notificationContainer.removeChildren();

    const centerX = screenW / 2;
    const baseY = screenH - 180;

    for (let i = 0; i < state.notifications.length; i++) {
      const n = state.notifications[i];
      if (n.timer <= 0) continue;

      const alpha = Math.min(1, n.timer);
      const offsetY = -i * 28;

      // Background
      const bg = new Graphics();
      const textObj = new Text({
        text: n.text,
        style: new TextStyle({
          fontFamily: FONT, fontSize: 12, fill: n.color,
          fontWeight: "bold",
          stroke: { color: 0x000000, width: 2 },
        }),
      });
      textObj.anchor.set(0.5, 0.5);

      const tw = textObj.width + 20;
      bg.roundRect(-tw / 2, -12, tw, 24, 4).fill({ color: PANEL_BG, alpha: 0.7 });
      bg.position.set(centerX, baseY + offsetY);
      bg.alpha = alpha;
      textObj.position.set(centerX, baseY + offsetY);
      textObj.alpha = alpha;

      this.notificationContainer.addChild(bg);
      this.notificationContainer.addChild(textObj);
    }
  }

  private updateDialog(state: MedievalGTAState, _screenW: number, _screenH: number): void {
    if (!state.dialogNpcId) {
      this.dialogBox.visible = false;
      return;
    }

    this.dialogBox.visible = true;
    const npc = state.npcs.get(state.dialogNpcId);
    const npcName = npc?.name ?? "???";

    // Update dialog text fields
    for (const child of this.dialogBox.children) {
      if (child instanceof Text) {
        if (child.name === "dialogName") {
          (child as Text).text = npcName;
        }
      }
    }
    // Find text child by name
    const dialogTextChild = this.dialogBox.children.find(c => c.name === "dialogText");
    if (dialogTextChild instanceof Text) {
      dialogTextChild.text = state.dialogText;
    }
  }

  private updateQuestLog(state: MedievalGTAState, _screenW: number, _screenH: number): void {
    this.questLogOverlay.visible = state.showQuestLog;
    if (!state.showQuestLog) return;

    // Update quest entries
    const entriesContainer = this.questLogOverlay.children.find(c => c.name === "questEntries") as Container | undefined;
    if (!entriesContainer) return;
    entriesContainer.removeChildren();

    const quests = state.quests;
    let yOff = 0;

    for (const quest of quests) {
      if (quest.status === 'available') continue; // Don't show undiscovered quests

      const statusIcon = quest.status === 'completed' ? "[DONE]" : quest.status === 'failed' ? "[FAIL]" : "[>]";
      const color = quest.status === 'completed' ? 0x666666 : quest.status === 'active' ? GOLD_COLOR : 0x884444;
      const iconColor = quest.status === 'completed' ? 0x44AA44 : quest.status === 'active' ? GOLD_COLOR : 0xAA4444;

      const icon = new Text({ text: statusIcon, style: medievalStyle(9, iconColor) });
      icon.position.set(0, yOff);
      entriesContainer.addChild(icon);

      const title = new Text({ text: quest.title, style: medievalStyle(11, color, quest.status === 'active') });
      title.position.set(50, yOff);
      entriesContainer.addChild(title);

      const desc = new Text({
        text: quest.description,
        style: new TextStyle({ fontFamily: FONT, fontSize: 9, fill: 0x888888, wordWrap: true, wordWrapWidth: 360 }),
      });
      desc.position.set(50, yOff + 16);
      entriesContainer.addChild(desc);

      // Reward
      if (quest.status === 'active') {
        const reward = new Text({
          text: `Reward: ${quest.reward.gold}g - ${quest.reward.description}`,
          style: medievalStyle(8, 0xAA9944),
        });
        reward.position.set(50, yOff + 34);
        entriesContainer.addChild(reward);
      }

      // Separator
      const sep = new Graphics();
      sep.moveTo(0, yOff + 50).lineTo(410, yOff + 50).stroke({ color: 0x333333, width: 0.5 });
      entriesContainer.addChild(sep);

      yOff += 58;
    }
  }
}
