/**
 * Reusable ornate panel frame drawn with high polygon count decorations.
 * Draws directly into a Graphics object for maximum performance.
 *
 * Features:
 * - Triple-line border with corner bevels
 * - Gem ornaments at all 4 corners with multi-layer detail
 * - Decorative filigree lines along edges with diamond midpoint ornaments
 * - Runic tick marks along the inner border
 * - Header/footer gradient bands
 * - Celtic-knot style corner flourishes
 */
import { Graphics } from "pixi.js";

export interface OrnateFrameOptions {
  /** Primary accent color (default: 0x4444aa) */
  color?: number;
  /** Secondary/highlight color (default: 0x6666dd) */
  highlight?: number;
  /** Whether to draw the header gradient band (default: true) */
  headerBand?: boolean;
  /** Whether to draw the background grid pattern (default: true) */
  grid?: boolean;
  /** Whether to draw runic tick marks along border (default: true) */
  runicTicks?: boolean;
  /** Whether to draw edge filigree with midpoint diamonds (default: true) */
  edgeFiligree?: boolean;
}

const DEFAULT_OPTS: Required<OrnateFrameOptions> = {
  color: 0x4444aa,
  highlight: 0x6666dd,
  headerBand: true,
  grid: true,
  runicTicks: true,
  edgeFiligree: true,
};

/**
 * Draw an ornate frame into the given Graphics at position (px, py)
 * with dimensions (w, h).
 */
export function drawOrnateFrame(
  g: Graphics,
  px: number,
  py: number,
  w: number,
  h: number,
  opts?: OrnateFrameOptions,
): void {
  const o = { ...DEFAULT_OPTS, ...opts };

  // === Background grid pattern ===
  if (o.grid) {
    for (let gx = px + 16; gx < px + w; gx += 16) {
      g.moveTo(gx, py);
      g.lineTo(gx, py + h);
      g.stroke({ color: 0x111122, width: 0.5, alpha: 0.12 });
    }
    for (let gy = py + 16; gy < py + h; gy += 16) {
      g.moveTo(px, gy);
      g.lineTo(px + w, gy);
      g.stroke({ color: 0x111122, width: 0.5, alpha: 0.12 });
    }
    // Runic cross marks at sparse grid intersections
    for (let gx = px + 48; gx < px + w - 16; gx += 48) {
      for (let gy = py + 48; gy < py + h - 16; gy += 48) {
        g.moveTo(gx - 2, gy);
        g.lineTo(gx + 2, gy);
        g.stroke({ color: 0x222244, width: 0.5, alpha: 0.15 });
        g.moveTo(gx, gy - 2);
        g.lineTo(gx, gy + 2);
        g.stroke({ color: 0x222244, width: 0.5, alpha: 0.15 });
      }
    }
  }

  // === Header gradient band ===
  if (o.headerBand) {
    g.rect(px, py, w, 40);
    g.fill({ color: 0x12122a, alpha: 0.6 });
    g.rect(px, py, w, 20);
    g.fill({ color: 0x181838, alpha: 0.4 });
  }

  // === Triple-line border ===
  // Outer
  g.rect(px, py, w, h);
  g.stroke({ color: o.color, width: 2 });
  // Mid
  g.rect(px + 3, py + 3, w - 6, h - 6);
  g.stroke({ color: o.color, width: 1, alpha: 0.5 });
  // Inner
  g.rect(px + 6, py + 6, w - 12, h - 12);
  g.stroke({ color: o.color, width: 0.5, alpha: 0.3 });

  // === Top glow line ===
  g.rect(px + 1, py + 1, w - 2, 2);
  g.fill({ color: o.highlight, alpha: 0.7 });
  // Bottom subtle glow
  g.rect(px + 1, py + h - 2, w - 2, 1);
  g.fill({ color: o.highlight, alpha: 0.25 });

  // === Runic tick marks along inner border ===
  if (o.runicTicks) {
    const tickSpacing = 24;
    const tickLen = 4;
    // Top edge
    for (let tx = px + 30; tx < px + w - 30; tx += tickSpacing) {
      g.moveTo(tx, py + 6);
      g.lineTo(tx, py + 6 + tickLen);
      g.stroke({ color: o.color, width: 0.5, alpha: 0.2 });
    }
    // Bottom edge
    for (let tx = px + 30; tx < px + w - 30; tx += tickSpacing) {
      g.moveTo(tx, py + h - 6);
      g.lineTo(tx, py + h - 6 - tickLen);
      g.stroke({ color: o.color, width: 0.5, alpha: 0.2 });
    }
    // Left edge
    for (let ty = py + 30; ty < py + h - 30; ty += tickSpacing) {
      g.moveTo(px + 6, ty);
      g.lineTo(px + 6 + tickLen, ty);
      g.stroke({ color: o.color, width: 0.5, alpha: 0.2 });
    }
    // Right edge
    for (let ty = py + 30; ty < py + h - 30; ty += tickSpacing) {
      g.moveTo(px + w - 6, ty);
      g.lineTo(px + w - 6 - tickLen, ty);
      g.stroke({ color: o.color, width: 0.5, alpha: 0.2 });
    }
  }

  // === Corner ornaments with multi-layer gems + celtic flourishes ===
  const corners: [number, number, number, number][] = [
    [px, py, 1, 1],
    [px + w, py, -1, 1],
    [px, py + h, 1, -1],
    [px + w, py + h, -1, -1],
  ];

  for (const [cx, cy, dx, dy] of corners) {
    const bevelSize = 12;

    // Celtic-knot flourish: curved corner bracket
    // Outer arc bracket
    g.moveTo(cx, cy + dy * bevelSize * 2.5);
    g.lineTo(cx + dx * 3, cy + dy * bevelSize * 1.5);
    g.lineTo(cx + dx * bevelSize * 1.5, cy + dy * 3);
    g.lineTo(cx + dx * bevelSize * 2.5, cy);
    g.stroke({ color: o.color, width: 1, alpha: 0.25 });

    // Diagonal bevel line
    g.moveTo(cx, cy + dy * bevelSize);
    g.lineTo(cx + dx * bevelSize, cy);
    g.stroke({ color: o.highlight, width: 1.5, alpha: 0.6 });

    // Gem cluster: outer glow
    const gemX = cx + dx * 5;
    const gemY = cy + dy * 5;
    g.circle(gemX, gemY, 5);
    g.fill({ color: o.color, alpha: 0.08 });
    // Gem outer ring
    g.circle(gemX, gemY, 3.5);
    g.stroke({ color: o.color, width: 0.5, alpha: 0.3 });
    // Gem body
    g.circle(gemX, gemY, 2.5);
    g.fill({ color: o.color, alpha: 0.6 });
    // Gem inner highlight
    g.circle(gemX, gemY, 1.5);
    g.fill({ color: o.highlight, alpha: 0.4 });
    // Gem specular
    g.circle(gemX - dx * 0.5, gemY - dy * 0.5, 0.7);
    g.fill({ color: 0xffffff, alpha: 0.4 });

    // Tiny dots at end of bevel line
    g.circle(cx + dx * bevelSize, cy, 1.5);
    g.fill({ color: o.color, alpha: 0.4 });
    g.circle(cx, cy + dy * bevelSize, 1.5);
    g.fill({ color: o.color, alpha: 0.4 });

    // Extra flourish: small diamond between bevel endpoints
    const midBevelX = cx + dx * bevelSize * 0.5;
    const midBevelY = cy + dy * bevelSize * 0.5;
    const ds = 2.5;
    g.moveTo(midBevelX, midBevelY - ds);
    g.lineTo(midBevelX + ds, midBevelY);
    g.lineTo(midBevelX, midBevelY + ds);
    g.lineTo(midBevelX - ds, midBevelY);
    g.closePath();
    g.fill({ color: o.highlight, alpha: 0.2 });
  }

  // === Edge filigree with midpoint diamonds ===
  if (o.edgeFiligree) {
    // Top edge midpoint
    _drawEdgeDiamond(g, px + w / 2, py, o.color, o.highlight);
    // Bottom edge midpoint
    _drawEdgeDiamond(g, px + w / 2, py + h, o.color, o.highlight);
    // Left edge midpoint
    _drawEdgeDiamond(g, px, py + h / 2, o.color, o.highlight, true);
    // Right edge midpoint
    _drawEdgeDiamond(g, px + w, py + h / 2, o.color, o.highlight, true);
  }
}

function _drawEdgeDiamond(
  g: Graphics,
  cx: number,
  cy: number,
  color: number,
  highlight: number,
  vertical = false,
): void {
  const s = 5;
  // Outer diamond
  if (vertical) {
    g.moveTo(cx - s, cy);
    g.lineTo(cx, cy - s * 0.6);
    g.lineTo(cx + s, cy);
    g.lineTo(cx, cy + s * 0.6);
  } else {
    g.moveTo(cx, cy - s);
    g.lineTo(cx + s * 0.6, cy);
    g.lineTo(cx, cy + s);
    g.lineTo(cx - s * 0.6, cy);
  }
  g.closePath();
  g.fill({ color, alpha: 0.2 });
  g.stroke({ color: highlight, alpha: 0.3, width: 0.5 });

  // Inner dot
  g.circle(cx, cy, 1.2);
  g.fill({ color: highlight, alpha: 0.4 });

  // Flanking lines
  const lineLen = 12;
  if (vertical) {
    g.moveTo(cx, cy - s - 2);
    g.lineTo(cx, cy - s - lineLen);
    g.stroke({ color, alpha: 0.15, width: 0.5 });
    g.moveTo(cx, cy + s + 2);
    g.lineTo(cx, cy + s + lineLen);
    g.stroke({ color, alpha: 0.15, width: 0.5 });
  } else {
    g.moveTo(cx - s - 2, cy);
    g.lineTo(cx - s - lineLen, cy);
    g.stroke({ color, alpha: 0.15, width: 0.5 });
    g.moveTo(cx + s + 2, cy);
    g.lineTo(cx + s + lineLen, cy);
    g.stroke({ color, alpha: 0.15, width: 0.5 });
  }
}

/**
 * Draw a decorative title divider line with wing flourishes and diamond ornaments.
 */
export function drawTitleDivider(
  g: Graphics,
  panelX: number,
  panelW: number,
  y: number,
  color = 0x4444aa,
  highlight = 0x5555cc,
): void {
  // Main line
  g.moveTo(panelX + 30, y);
  g.lineTo(panelX + panelW - 30, y);
  g.stroke({ color, width: 1, alpha: 0.6 });

  // Wing flourishes at each end
  for (const side of [-1, 1]) {
    const endX = side < 0 ? panelX + 30 : panelX + panelW - 30;
    const dir = side < 0 ? -1 : 1;
    // Upper wing
    g.moveTo(endX, y);
    g.lineTo(endX + dir * 8, y - 5);
    g.stroke({ color, width: 1, alpha: 0.4 });
    // Lower wing
    g.moveTo(endX, y);
    g.lineTo(endX + dir * 8, y + 5);
    g.stroke({ color, width: 1, alpha: 0.4 });
    // Extended curl
    g.moveTo(endX + dir * 8, y - 5);
    g.lineTo(endX + dir * 12, y - 3);
    g.stroke({ color, width: 0.5, alpha: 0.2 });
    g.moveTo(endX + dir * 8, y + 5);
    g.lineTo(endX + dir * 12, y + 3);
    g.stroke({ color, width: 0.5, alpha: 0.2 });

    // Diamond ornament at end
    const ds = 3.5;
    g.moveTo(endX, y - ds);
    g.lineTo(endX + ds, y);
    g.lineTo(endX, y + ds);
    g.lineTo(endX - ds, y);
    g.closePath();
    g.fill({ color: highlight, alpha: 0.5 });
  }

  // Center ornament (larger diamond with inner detail)
  const cx = panelX + panelW / 2;
  const cs = 5;
  g.moveTo(cx, y - cs);
  g.lineTo(cx + cs, y);
  g.lineTo(cx, y + cs);
  g.lineTo(cx - cs, y);
  g.closePath();
  g.fill({ color: highlight, alpha: 0.35 });
  g.stroke({ color, alpha: 0.5, width: 0.5 });
  // Inner dot
  g.circle(cx, y, 1.5);
  g.fill({ color: 0xffffff, alpha: 0.2 });
}

/**
 * Draw an ornate button background with bevels and corner accents.
 */
export function drawOrnateButton(
  g: Graphics,
  x: number,
  y: number,
  w: number,
  h: number,
  color: number,
  options?: { selected?: boolean },
): void {
  const selected = options?.selected ?? false;

  // Button background
  g.rect(x, y, w, h);
  g.fill({ color, alpha: selected ? 0.5 : 0.3 });

  // Outer border
  g.rect(x, y, w, h);
  g.stroke({ color, width: selected ? 2 : 1.5, alpha: 0.7 });

  // Inner border
  g.rect(x + 2, y + 2, w - 4, h - 4);
  g.stroke({ color, width: 0.5, alpha: 0.25 });

  // Top highlight edge
  g.moveTo(x + 1, y + 1);
  g.lineTo(x + w - 1, y + 1);
  g.stroke({ color: 0xffffff, width: 0.5, alpha: 0.15 });

  // Bottom shadow
  g.moveTo(x + 1, y + h - 1);
  g.lineTo(x + w - 1, y + h - 1);
  g.stroke({ color: 0x000000, width: 0.5, alpha: 0.3 });

  // Corner bevels (4 small diagonal lines)
  const bev = 4;
  // Top-left
  g.moveTo(x, y + bev);
  g.lineTo(x + bev, y);
  g.stroke({ color, width: 0.5, alpha: 0.3 });
  // Top-right
  g.moveTo(x + w - bev, y);
  g.lineTo(x + w, y + bev);
  g.stroke({ color, width: 0.5, alpha: 0.3 });
  // Bottom-left
  g.moveTo(x, y + h - bev);
  g.lineTo(x + bev, y + h);
  g.stroke({ color, width: 0.5, alpha: 0.3 });
  // Bottom-right
  g.moveTo(x + w - bev, y + h);
  g.lineTo(x + w, y + h - bev);
  g.stroke({ color, width: 0.5, alpha: 0.3 });

  // Selection glow
  if (selected) {
    g.rect(x - 1, y - 1, w + 2, h + 2);
    g.stroke({ color, width: 1, alpha: 0.4 });
  }
}
