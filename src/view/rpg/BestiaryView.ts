// Full-screen overlay showing all encountered enemies (bestiary)
import { Container, Graphics, Text } from "pixi.js";
import type { RPGState } from "@rpg/state/RPGState";

// ---------------------------------------------------------------------------
// Layout constants
// ---------------------------------------------------------------------------

const BG_COLOR = 0x0e0e1a;
const PANEL_COLOR = 0x1a1a2e;
const BORDER_COLOR = 0x4444aa;
const TITLE_COLOR = 0xffcc00;
const TEXT_COLOR = 0xcccccc;
const DIM_TEXT = 0x888888;
const MASTERED_COLOR = 0xffd700;
const ENTRY_HEIGHT = 60;
const PANEL_PAD = 16;

// ---------------------------------------------------------------------------
// Unlock tier helpers
// ---------------------------------------------------------------------------

function getUnlockTier(timesDefeated: number): 1 | 2 | 3 {
  if (timesDefeated >= 10) return 3;
  if (timesDefeated >= 3) return 2;
  return 1;
}

// ---------------------------------------------------------------------------
// createBestiaryView
// ---------------------------------------------------------------------------

export function createBestiaryView(rpgState: RPGState): Container {
  const container = new Container();

  // We use a fixed screen size assumption; caller can reposition if needed.
  const W = 800;
  const H = 600;

  // Full-screen dark overlay
  const overlay = new Graphics();
  overlay.rect(0, 0, W, H);
  overlay.fill({ color: 0x000000, alpha: 0.7 });
  overlay.eventMode = "static";
  container.addChild(overlay);

  // Panel
  const panelW = Math.min(500, W - 40);
  const entries = Object.values(rpgState.bestiary);
  const listContentH = Math.max(entries.length * ENTRY_HEIGHT, 60);
  const maxPanelH = H - 60;
  const panelH = Math.min(listContentH + 80, maxPanelH);
  const panelX = (W - panelW) / 2;
  const panelY = (H - panelH) / 2;

  const panel = new Graphics();
  panel.roundRect(panelX, panelY, panelW, panelH, 8);
  panel.fill({ color: PANEL_COLOR, alpha: 0.95 });
  panel.stroke({ color: BORDER_COLOR, width: 2 });
  container.addChild(panel);

  // Title
  const title = new Text({
    text: "Bestiary",
    style: { fontFamily: "monospace", fontSize: 20, fill: TITLE_COLOR, fontWeight: "bold" },
  });
  title.anchor.set(0.5, 0);
  title.position.set(W / 2, panelY + PANEL_PAD);
  container.addChild(title);

  // Close button (X)
  const closeBtn = new Text({
    text: "X",
    style: { fontFamily: "monospace", fontSize: 16, fill: 0xff4444, fontWeight: "bold" },
  });
  closeBtn.anchor.set(1, 0);
  closeBtn.position.set(panelX + panelW - PANEL_PAD, panelY + PANEL_PAD);
  closeBtn.eventMode = "static";
  closeBtn.cursor = "pointer";
  closeBtn.on("pointerdown", () => {
    container.visible = false;
    if (container.parent) container.parent.removeChild(container);
  });
  container.addChild(closeBtn);

  // Scrollable list area — clip via mask
  const listContainer = new Container();
  const listAreaY = panelY + 50;
  const listAreaH = panelH - 60;

  const mask = new Graphics();
  mask.rect(panelX, listAreaY, panelW, listAreaH);
  mask.fill({ color: 0xffffff });
  listContainer.mask = mask;
  container.addChild(mask);

  let scrollOffset = 0;

  function renderEntries(): void {
    listContainer.removeChildren();

    if (entries.length === 0) {
      const emptyText = new Text({
        text: "No creatures encountered yet.",
        style: { fontFamily: "monospace", fontSize: 12, fill: DIM_TEXT },
      });
      emptyText.anchor.set(0.5, 0);
      emptyText.position.set(W / 2, listAreaY + 20);
      listContainer.addChild(emptyText);
      return;
    }

    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i];
      const ey = listAreaY + i * ENTRY_HEIGHT + scrollOffset;
      const tier = getUnlockTier(entry.timesDefeated);

      // Entry background
      const entryBg = new Graphics();
      entryBg.roundRect(panelX + PANEL_PAD, ey, panelW - PANEL_PAD * 2, ENTRY_HEIGHT - 6, 4);
      entryBg.fill({ color: BG_COLOR, alpha: 0.6 });
      listContainer.addChild(entryBg);

      // Name (always shown at tier 1+)
      const nameText = new Text({
        text: entry.name,
        style: { fontFamily: "monospace", fontSize: 13, fill: TEXT_COLOR, fontWeight: "bold" },
      });
      nameText.position.set(panelX + PANEL_PAD + 8, ey + 6);
      listContainer.addChild(nameText);

      // Defeated count
      const defeatedText = new Text({
        text: `Defeated: ${entry.timesDefeated}`,
        style: { fontFamily: "monospace", fontSize: 10, fill: DIM_TEXT },
      });
      defeatedText.position.set(panelX + PANEL_PAD + 8, ey + 22);
      listContainer.addChild(defeatedText);

      // Tier 2+: show stats (first seen time)
      if (tier >= 2) {
        const firstSeenText = new Text({
          text: `First seen: turn ${entry.firstSeen}`,
          style: { fontFamily: "monospace", fontSize: 10, fill: DIM_TEXT },
        });
        firstSeenText.position.set(panelX + PANEL_PAD + 8, ey + 36);
        listContainer.addChild(firstSeenText);
      }

      // Tier 3: mastered badge
      if (tier >= 3) {
        const badge = new Text({
          text: "MASTERED",
          style: { fontFamily: "monospace", fontSize: 9, fill: MASTERED_COLOR, fontWeight: "bold" },
        });
        badge.anchor.set(1, 0);
        badge.position.set(panelX + panelW - PANEL_PAD - 8, ey + 6);
        listContainer.addChild(badge);
      }
    }
  }

  renderEntries();
  container.addChild(listContainer);

  // Scroll via wheel
  overlay.on("wheel", (e: WheelEvent) => {
    const maxScroll = Math.max(0, entries.length * ENTRY_HEIGHT - listAreaH);
    scrollOffset = Math.max(-maxScroll, Math.min(0, scrollOffset - e.deltaY));
    renderEntries();
  });

  // Escape key to close
  const onKeyDown = (e: KeyboardEvent) => {
    if (e.code === "Escape") {
      container.visible = false;
      if (container.parent) container.parent.removeChild(container);
      window.removeEventListener("keydown", onKeyDown);
    }
  };
  window.addEventListener("keydown", onKeyDown);

  // Clean up key listener when container is destroyed
  container.on("destroyed", () => {
    window.removeEventListener("keydown", onKeyDown);
  });

  return container;
}
