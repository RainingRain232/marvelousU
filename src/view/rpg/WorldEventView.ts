// Modal dialog for world events — shows event title, description, and choice buttons
import { Container, Graphics, Text } from "pixi.js";
import type { WorldEventDef, WorldEventChoice } from "@rpg/config/WorldEventDefs";
import type { RPGState } from "@rpg/state/RPGState";

// ---------------------------------------------------------------------------
// Layout constants
// ---------------------------------------------------------------------------

const OVERLAY_ALPHA = 0.65;
const PANEL_COLOR = 0xf0f0f0;
const PANEL_BORDER = 0x4444aa;
const TITLE_COLOR = 0x1a1a2e;
const DESC_COLOR = 0x333333;
const BTN_COLOR = 0x3355aa;
const BTN_HOVER_COLOR = 0x4466cc;
const BTN_TEXT_COLOR = 0xffffff;
const PANEL_RADIUS = 10;
const PANEL_PAD = 20;
const BTN_HEIGHT = 32;
const BTN_GAP = 10;

// ---------------------------------------------------------------------------
// createWorldEventView
// ---------------------------------------------------------------------------

export function createWorldEventView(
  event: WorldEventDef,
  rpgState: RPGState,
  onDismiss: () => void,
): Container {
  const container = new Container();

  const W = 800;
  const H = 600;

  // Dark background overlay
  const overlay = new Graphics();
  overlay.rect(0, 0, W, H);
  overlay.fill({ color: 0x000000, alpha: OVERLAY_ALPHA });
  overlay.eventMode = "static";
  container.addChild(overlay);

  // Calculate panel dimensions
  const panelW = Math.min(420, W - 60);
  const choiceCount = event.choices.length;
  const panelH = 160 + choiceCount * (BTN_HEIGHT + BTN_GAP);
  const panelX = (W - panelW) / 2;
  const panelY = (H - panelH) / 2;

  // Centered white panel with rounded corners
  const panel = new Graphics();
  panel.roundRect(panelX, panelY, panelW, panelH, PANEL_RADIUS);
  panel.fill({ color: PANEL_COLOR, alpha: 0.97 });
  panel.stroke({ color: PANEL_BORDER, width: 2 });
  container.addChild(panel);

  // Title (bold/large)
  const title = new Text({
    text: event.title,
    style: {
      fontFamily: "monospace",
      fontSize: 18,
      fill: TITLE_COLOR,
      fontWeight: "bold",
    },
  });
  title.anchor.set(0.5, 0);
  title.position.set(W / 2, panelY + PANEL_PAD);
  container.addChild(title);

  // Description
  const desc = new Text({
    text: event.description,
    style: {
      fontFamily: "monospace",
      fontSize: 11,
      fill: DESC_COLOR,
      wordWrap: true,
      wordWrapWidth: panelW - PANEL_PAD * 2,
      lineHeight: 18,
    },
  });
  desc.position.set(panelX + PANEL_PAD, panelY + PANEL_PAD + 30);
  container.addChild(desc);

  // Choice buttons at the bottom of the panel
  const btnAreaY = panelY + panelH - choiceCount * (BTN_HEIGHT + BTN_GAP) - PANEL_PAD + BTN_GAP;

  for (let i = 0; i < event.choices.length; i++) {
    const choice = event.choices[i];
    const btnY = btnAreaY + i * (BTN_HEIGHT + BTN_GAP);
    const btnW = panelW - PANEL_PAD * 2;

    const btnBg = new Graphics();
    btnBg.roundRect(panelX + PANEL_PAD, btnY, btnW, BTN_HEIGHT, 5);
    btnBg.fill({ color: BTN_COLOR });
    btnBg.eventMode = "static";
    btnBg.cursor = "pointer";
    container.addChild(btnBg);

    const btnLabel = new Text({
      text: choice.label,
      style: {
        fontFamily: "monospace",
        fontSize: 12,
        fill: BTN_TEXT_COLOR,
        fontWeight: "bold",
      },
    });
    btnLabel.anchor.set(0.5, 0.5);
    btnLabel.position.set(panelX + PANEL_PAD + btnW / 2, btnY + BTN_HEIGHT / 2);
    container.addChild(btnLabel);

    // Hover effect
    btnBg.on("pointerover", () => {
      btnBg.clear();
      btnBg.roundRect(panelX + PANEL_PAD, btnY, btnW, BTN_HEIGHT, 5);
      btnBg.fill({ color: BTN_HOVER_COLOR });
    });
    btnBg.on("pointerout", () => {
      btnBg.clear();
      btnBg.roundRect(panelX + PANEL_PAD, btnY, btnW, BTN_HEIGHT, 5);
      btnBg.fill({ color: BTN_COLOR });
    });

    // On click: apply effects to rpgState and dismiss
    btnBg.on("pointerdown", () => {
      applyChoiceEffects(choice, rpgState);
      onDismiss();
    });
  }

  return container;
}

// ---------------------------------------------------------------------------
// Apply choice effects to RPGState
// ---------------------------------------------------------------------------

function applyChoiceEffects(choice: WorldEventChoice, rpgState: RPGState): void {
  const fx = choice.effects;

  if (fx.gold != null) {
    rpgState.gold = Math.max(0, rpgState.gold + fx.gold);
  }

  if (fx.karma != null) {
    rpgState.karma += fx.karma;
  }

  if (fx.xp != null && rpgState.party.length > 0) {
    // Distribute XP evenly to all party members
    const xpEach = Math.floor(fx.xp / rpgState.party.length);
    for (const member of rpgState.party) {
      member.xp += xpEach;
    }
  }

  if (fx.reputation != null) {
    // Apply reputation globally (no specific town context in world events)
    // This can be consumed by systems that check for it
  }
}
