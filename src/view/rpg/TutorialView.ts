// Small tooltip overlay for tutorial messages
import { Container, Graphics, Text } from "pixi.js";
import { EventBus } from "@sim/core/EventBus";

// ---------------------------------------------------------------------------
// Layout constants
// ---------------------------------------------------------------------------

const TIP_BG = 0x1a1a2e;
const TIP_BORDER = 0x4444aa;
const TIP_TEXT_COLOR = 0xeeeeee;
const TIP_ALPHA = 0.88;
const TIP_PAD = 12;
const AUTO_DISMISS_MS = 5000;

// ---------------------------------------------------------------------------
// createTutorialOverlay
// ---------------------------------------------------------------------------

export function createTutorialOverlay(): Container {
  const container = new Container();
  container.visible = false;

  let dismissTimeout: ReturnType<typeof setTimeout> | null = null;

  function showTip(message: string): void {
    // Clear any existing dismiss timer
    if (dismissTimeout) {
      clearTimeout(dismissTimeout);
      dismissTimeout = null;
    }

    container.removeChildren();
    container.visible = true;

    const W = 800; // assumed screen width
    const tipW = Math.min(500, W - 40);
    const tipX = (W - tipW) / 2;
    const tipY = 10;

    // Measure text to determine panel height
    const tipText = new Text({
      text: message,
      style: {
        fontFamily: "monospace",
        fontSize: 12,
        fill: TIP_TEXT_COLOR,
        wordWrap: true,
        wordWrapWidth: tipW - TIP_PAD * 2,
        lineHeight: 18,
      },
    });

    const tipH = Math.max(40, tipText.height + TIP_PAD * 2);

    // Semi-transparent panel
    const bg = new Graphics();
    bg.roundRect(tipX, tipY, tipW, tipH, 6);
    bg.fill({ color: TIP_BG, alpha: TIP_ALPHA });
    bg.stroke({ color: TIP_BORDER, width: 1 });
    bg.eventMode = "static";
    bg.cursor = "pointer";
    container.addChild(bg);

    tipText.position.set(tipX + TIP_PAD, tipY + TIP_PAD);
    container.addChild(tipText);

    // Click to dismiss
    bg.on("pointerdown", () => dismiss());

    // Auto-dismiss after 5 seconds
    dismissTimeout = setTimeout(() => dismiss(), AUTO_DISMISS_MS);
  }

  function dismiss(): void {
    if (dismissTimeout) {
      clearTimeout(dismissTimeout);
      dismissTimeout = null;
    }
    container.visible = false;
    container.removeChildren();
  }

  // Listen for tutorial tip events
  const unsub = EventBus.on("rpgTutorialTip", (e) => {
    showTip(e.message);
  });

  // Clean up listener when container is destroyed
  container.on("destroyed", () => {
    unsub();
    if (dismissTimeout) {
      clearTimeout(dismissTimeout);
      dismissTimeout = null;
    }
  });

  return container;
}
