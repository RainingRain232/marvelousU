// Renders resource nodes (gold piles, trees, rocks) with depletion indicator
import { Container, Graphics, Text, TextStyle } from "pixi.js";
import type { ResourceNode } from "@sim/entities/ResourceNode";
import { ResourceType } from "@sim/entities/ResourceNode";
import { BalanceConfig } from "@sim/config/BalanceConfig";

const TS = BalanceConfig.TILE_SIZE;

const NODE_COLORS: Record<ResourceType, number> = {
  [ResourceType.GOLD]: 0xffd700,
  [ResourceType.WOOD]: 0x2e8b2e,
  [ResourceType.STONE]: 0x888888,
};

const NODE_LABELS: Record<ResourceType, string> = {
  [ResourceType.GOLD]: "GOLD",
  [ResourceType.WOOD]: "WOOD",
  [ResourceType.STONE]: "STONE",
};

const LABEL_STYLE = new TextStyle({
  fontFamily: "monospace",
  fontSize: 9,
  fill: 0xffffff,
  align: "center",
});

const BAR_W = TS * 0.6;
const BAR_H = 3;
const BAR_BG = 0x222222;

// ---------------------------------------------------------------------------
// ResourceNodeView
// ---------------------------------------------------------------------------

export class ResourceNodeView {
  readonly container = new Container();
  private _barFill = new Graphics();
  private _nodeColor: number;

  constructor(node: ResourceNode) {
    this._nodeColor = NODE_COLORS[node.type];

    // Body: filled shape representing the resource
    const body = new Graphics();
    const r = TS * 0.3;

    if (node.type === ResourceType.GOLD) {
      // Gold pile: stacked circles
      body.circle(0, 2, r * 0.7).fill({ color: 0xdaa520 });
      body.circle(-4, -2, r * 0.5).fill({ color: this._nodeColor });
      body.circle(4, -2, r * 0.5).fill({ color: this._nodeColor });
      body.circle(0, -5, r * 0.4).fill({ color: 0xffe066 });
    } else if (node.type === ResourceType.WOOD) {
      // Tree: trunk + canopy
      body.rect(-3, -2, 6, 14).fill({ color: 0x5c3a1e });
      body.circle(0, -8, r).fill({ color: this._nodeColor });
      body.circle(-5, -4, r * 0.6).fill({ color: 0x3a7a3a });
      body.circle(5, -4, r * 0.6).fill({ color: 0x3a7a3a });
    } else {
      // Stone: angular rock
      body.poly([-r, 4, -r * 0.5, -r, r * 0.5, -r * 0.8, r, 2, r * 0.3, 6])
        .fill({ color: this._nodeColor })
        .poly([-r, 4, -r * 0.5, -r, r * 0.5, -r * 0.8, r, 2, r * 0.3, 6])
        .stroke({ color: 0x555555, width: 1 });
    }
    this.container.addChild(body);

    // Label
    const label = new Text({ text: NODE_LABELS[node.type], style: LABEL_STYLE });
    label.anchor.set(0.5, 0);
    label.position.set(0, r + 2);
    this.container.addChild(label);

    // Depletion bar background
    const barBg = new Graphics();
    barBg.rect(-BAR_W / 2, -(r + 8), BAR_W, BAR_H).fill({ color: BAR_BG });
    this.container.addChild(barBg);

    // Depletion bar fill
    this.container.addChild(this._barFill);

    // Position
    this.container.position.set(
      (node.position.x + 0.5) * TS,
      (node.position.y + 0.5) * TS,
    );
  }

  update(node: ResourceNode): void {
    const pct = node.maxAmount > 0 ? Math.max(0, node.remaining / node.maxAmount) : 0;
    const fillW = BAR_W * pct;
    const r = TS * 0.3;

    this._barFill.clear();
    if (fillW > 0) {
      this._barFill
        .rect(-BAR_W / 2, -(r + 8), fillW, BAR_H)
        .fill({ color: this._nodeColor });
    }

    // Fade out depleted nodes
    this.container.alpha = node.remaining <= 0 ? 0.3 : 1;
  }

  destroy(): void {
    this.container.destroy({ children: true });
  }
}
