// Full-screen epilogue view after defeating the final boss
import { Container, Graphics, Text } from "pixi.js";
import type { RPGState } from "@rpg/state/RPGState";

// ---------------------------------------------------------------------------
// Layout constants
// ---------------------------------------------------------------------------

const BG_COLOR = 0x0a0a18;
const PANEL_COLOR = 0x1a1a2e;
const BORDER_COLOR = 0xdaa520;
const TITLE_COLOR = 0xffd700;
const TEXT_COLOR = 0xcccccc;
const DIM_TEXT = 0x888888;
const BTN_COLOR = 0x3355aa;
const BTN_HOVER_COLOR = 0x4466cc;
const BTN_TEXT_COLOR = 0xffffff;
const GOLD_BTN_COLOR = 0xaa8800;
const GOLD_BTN_HOVER = 0xcc9900;
const PANEL_PAD = 20;

// ---------------------------------------------------------------------------
// createGameOverView (victory ending)
// ---------------------------------------------------------------------------

export function createGameOverView(
  rpgState: RPGState,
  onNewGamePlus: () => void,
  onMainMenu: () => void,
): Container {
  const container = new Container();

  const W = 800;
  const H = 600;

  // Full-screen dark background
  const bg = new Graphics();
  bg.rect(0, 0, W, H);
  bg.fill({ color: BG_COLOR, alpha: 0.9 });
  bg.eventMode = "static";
  container.addChild(bg);

  // Panel
  const panelW = Math.min(440, W - 40);
  const panelH = 420;
  const panelX = (W - panelW) / 2;
  const panelY = (H - panelH) / 2;

  const panel = new Graphics();
  panel.roundRect(panelX, panelY, panelW, panelH, 10);
  panel.fill({ color: PANEL_COLOR, alpha: 0.95 });
  panel.stroke({ color: BORDER_COLOR, width: 2 });
  container.addChild(panel);

  // Victory title
  const title = new Text({
    text: "Victory!",
    style: {
      fontFamily: "monospace",
      fontSize: 32,
      fill: TITLE_COLOR,
      fontWeight: "bold",
    },
  });
  title.anchor.set(0.5, 0);
  title.position.set(W / 2, panelY + PANEL_PAD);
  container.addChild(title);

  // Subtitle
  const subtitle = new Text({
    text: "The Dark One has been vanquished. Peace returns to the realm.",
    style: {
      fontFamily: "monospace",
      fontSize: 11,
      fill: TEXT_COLOR,
      wordWrap: true,
      wordWrapWidth: panelW - PANEL_PAD * 2,
      align: "center",
      lineHeight: 18,
    },
  });
  subtitle.anchor.set(0.5, 0);
  subtitle.position.set(W / 2, panelY + 60);
  container.addChild(subtitle);

  // Stats section
  let statsY = panelY + 110;

  // Quests completed
  const questsCompleted = rpgState.completedQuests.size;
  const questsText = new Text({
    text: `Quests Completed: ${questsCompleted}`,
    style: { fontFamily: "monospace", fontSize: 12, fill: TEXT_COLOR },
  });
  questsText.position.set(panelX + PANEL_PAD, statsY);
  container.addChild(questsText);
  statsY += 22;

  // Lore found
  const loreFound = rpgState.collectedLore.size;
  const loreText = new Text({
    text: `Lore Entries Found: ${loreFound}`,
    style: { fontFamily: "monospace", fontSize: 12, fill: TEXT_COLOR },
  });
  loreText.position.set(panelX + PANEL_PAD, statsY);
  container.addChild(loreText);
  statsY += 30;

  // Party summary header
  const partyHeader = new Text({
    text: "Party Summary",
    style: { fontFamily: "monospace", fontSize: 13, fill: TITLE_COLOR, fontWeight: "bold" },
  });
  partyHeader.position.set(panelX + PANEL_PAD, statsY);
  container.addChild(partyHeader);
  statsY += 20;

  // Party members (names + levels)
  for (const member of rpgState.party) {
    const memberText = new Text({
      text: `${member.name}  -  Level ${member.level}`,
      style: { fontFamily: "monospace", fontSize: 11, fill: DIM_TEXT },
    });
    memberText.position.set(panelX + PANEL_PAD + 8, statsY);
    container.addChild(memberText);
    statsY += 18;
  }

  // Buttons area
  const btnW = panelW - PANEL_PAD * 2;
  const btnH = 36;
  const btnAreaY = panelY + panelH - PANEL_PAD - btnH * 2 - 12;

  // New Game+ button (gold)
  const ngBtnY = btnAreaY;
  const ngBtnBg = new Graphics();
  ngBtnBg.roundRect(panelX + PANEL_PAD, ngBtnY, btnW, btnH, 5);
  ngBtnBg.fill({ color: GOLD_BTN_COLOR });
  ngBtnBg.eventMode = "static";
  ngBtnBg.cursor = "pointer";
  container.addChild(ngBtnBg);

  const ngBtnLabel = new Text({
    text: "New Game+",
    style: { fontFamily: "monospace", fontSize: 14, fill: BTN_TEXT_COLOR, fontWeight: "bold" },
  });
  ngBtnLabel.anchor.set(0.5, 0.5);
  ngBtnLabel.position.set(panelX + PANEL_PAD + btnW / 2, ngBtnY + btnH / 2);
  container.addChild(ngBtnLabel);

  ngBtnBg.on("pointerover", () => {
    ngBtnBg.clear();
    ngBtnBg.roundRect(panelX + PANEL_PAD, ngBtnY, btnW, btnH, 5);
    ngBtnBg.fill({ color: GOLD_BTN_HOVER });
  });
  ngBtnBg.on("pointerout", () => {
    ngBtnBg.clear();
    ngBtnBg.roundRect(panelX + PANEL_PAD, ngBtnY, btnW, btnH, 5);
    ngBtnBg.fill({ color: GOLD_BTN_COLOR });
  });
  ngBtnBg.on("pointerdown", () => onNewGamePlus());

  // Return to Menu button
  const menuBtnY = ngBtnY + btnH + 12;
  const menuBtnBg = new Graphics();
  menuBtnBg.roundRect(panelX + PANEL_PAD, menuBtnY, btnW, btnH, 5);
  menuBtnBg.fill({ color: BTN_COLOR });
  menuBtnBg.eventMode = "static";
  menuBtnBg.cursor = "pointer";
  container.addChild(menuBtnBg);

  const menuBtnLabel = new Text({
    text: "Return to Menu",
    style: { fontFamily: "monospace", fontSize: 14, fill: BTN_TEXT_COLOR, fontWeight: "bold" },
  });
  menuBtnLabel.anchor.set(0.5, 0.5);
  menuBtnLabel.position.set(panelX + PANEL_PAD + btnW / 2, menuBtnY + btnH / 2);
  container.addChild(menuBtnLabel);

  menuBtnBg.on("pointerover", () => {
    menuBtnBg.clear();
    menuBtnBg.roundRect(panelX + PANEL_PAD, menuBtnY, btnW, btnH, 5);
    menuBtnBg.fill({ color: BTN_HOVER_COLOR });
  });
  menuBtnBg.on("pointerout", () => {
    menuBtnBg.clear();
    menuBtnBg.roundRect(panelX + PANEL_PAD, menuBtnY, btnW, btnH, 5);
    menuBtnBg.fill({ color: BTN_COLOR });
  });
  menuBtnBg.on("pointerdown", () => onMainMenu());

  return container;
}
