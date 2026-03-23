// ---------------------------------------------------------------------------
// Round Table – Map View (atmospheric node graph with glow & decorations)
// ---------------------------------------------------------------------------

import { Container, Graphics, Text, TextStyle } from "pixi.js";
import gsap from "gsap";
import { ActMap, MapNodeType } from "../types";
import { getEnemyDef } from "../config/RoundTableEnemies";

const NODE_R = 18;

const NODE_COLORS: Record<string, number> = {
  [MapNodeType.ENEMY]: 0xcc4444,
  [MapNodeType.ELITE]: 0xff8800,
  [MapNodeType.REST]: 0x33aa55,
  [MapNodeType.SHOP]: 0xddcc33,
  [MapNodeType.EVENT]: 0x4488cc,
  [MapNodeType.TREASURE]: 0xffcc00,
  [MapNodeType.BOSS]: 0xff2222,
};

const NODE_ICONS: Record<string, string> = {
  [MapNodeType.ENEMY]: "\u2694", // crossed swords
  [MapNodeType.ELITE]: "\u2620", // skull
  [MapNodeType.REST]: "\u2668", // campfire
  [MapNodeType.SHOP]: "\u2696", // scales
  [MapNodeType.EVENT]: "?",
  [MapNodeType.TREASURE]: "\u2666", // diamond
  [MapNodeType.BOSS]: "\u265B", // queen chess
};

const titleStyle = new TextStyle({
  fontFamily: "monospace", fontSize: 18, fill: 0xffd700, fontWeight: "bold",
  dropShadow: { color: 0x000000, blur: 4, distance: 1, alpha: 0.8 },
});
const iconStyle = new TextStyle({
  fontFamily: "monospace", fontSize: 14, fill: 0xffffff, fontWeight: "bold",
  dropShadow: { color: 0x000000, blur: 2, distance: 0, alpha: 0.7 },
});
const nodeLabel = new TextStyle({ fontFamily: "monospace", fontSize: 8, fill: 0x999999 });

const VIEW_W = 800;
const VIEW_H = 560; // leave room for HUD above

export class RoundTableMapView {
  container = new Container();
  onNodeClick: ((nodeId: number) => void) | null = null;
  private _scrollContent = new Container();
  private _scrollY = 0;
  private _maxScroll = 0;
  private _wheelHandler: ((e: WheelEvent) => void) | null = null;

  build(map: ActMap, availableIds: Set<number>, currentNodeId: number): void {
    this.container.removeChildren();
    this._scrollContent = new Container();

    // Mask for scroll area
    const maskGfx = new Graphics();
    maskGfx.rect(0, 40, VIEW_W, VIEW_H);
    maskGfx.fill({ color: 0xffffff });
    this.container.addChild(maskGfx);
    this._scrollContent.mask = maskGfx;

    // ── Background atmosphere ──
    const mapH = this.getMapHeight(map);
    const bg = new Graphics();
    bg.rect(0, 0, VIEW_W, mapH);
    bg.fill({ color: 0x0a0a18 });
    // Subtle vertical gradient overlay
    for (let i = 0; i < 8; i++) {
      bg.rect(0, i * 175, 800, 175);
      bg.fill({ color: 0x111122, alpha: 0.02 * i });
    }
    // Stars / sparkles
    for (let i = 0; i < 40; i++) {
      const sx = Math.random() * 800;
      const sy = Math.random() * 1400;
      const sr = 0.5 + Math.random() * 1.5;
      bg.circle(sx, sy, sr);
      bg.fill({ color: 0xffffff, alpha: 0.05 + Math.random() * 0.1 });
    }
    // ── Terrain features (mountains, forests, ruins) ──
    const terrain = new Graphics();
    // Procedural mountain ranges (multi-peak with ridgelines)
    for (let i = 0; i < 10; i++) {
      const mx = 30 + Math.random() * 700;
      const my = 100 + Math.random() * (mapH - 200);
      const mw = 40 + Math.random() * 60;
      const mh = 20 + Math.random() * 35;
      const alpha = 0.35 + Math.random() * 0.2;
      // Main peak + secondary peaks (5-7 point polygon)
      terrain.moveTo(mx - mw / 2, my);
      terrain.lineTo(mx - mw * 0.3, my - mh * 0.6);
      terrain.lineTo(mx - mw * 0.15, my - mh * 0.5);
      terrain.lineTo(mx - mw * 0.05, my - mh);
      terrain.lineTo(mx + mw * 0.08, my - mh * 0.85);
      terrain.lineTo(mx + mw * 0.2, my - mh * 0.65);
      terrain.lineTo(mx + mw * 0.35, my - mh * 0.4);
      terrain.lineTo(mx + mw / 2, my);
      terrain.closePath();
      terrain.fill({ color: 0x1a1a28, alpha });
      // Snow caps on peaks
      terrain.moveTo(mx - mw * 0.12, my - mh * 0.85);
      terrain.lineTo(mx - mw * 0.05, my - mh);
      terrain.lineTo(mx + mw * 0.02, my - mh * 0.9);
      terrain.fill({ color: 0x334466, alpha: 0.2 });
      // Ridge shadow line
      terrain.moveTo(mx - mw * 0.3, my - mh * 0.55);
      terrain.lineTo(mx - mw * 0.05, my - mh * 0.95);
      terrain.lineTo(mx + mw * 0.2, my - mh * 0.6);
      terrain.stroke({ color: 0x111122, width: 0.8, alpha: 0.25 });
    }
    // Procedural trees (layered triangles for evergreen look)
    for (let i = 0; i < 18; i++) {
      const tx = 20 + Math.random() * 760;
      const ty = 80 + Math.random() * (mapH - 160);
      const ts = 6 + Math.random() * 10;
      const treeAlpha = 0.25 + Math.random() * 0.15;
      const treeColor = [0x1a2a1a, 0x1a331a, 0x223a1a][Math.floor(Math.random() * 3)];
      // Trunk
      terrain.rect(tx - 1.5, ty, 3, ts * 0.6);
      terrain.fill({ color: 0x2a1a0a, alpha: treeAlpha });
      // Bottom layer (widest)
      terrain.moveTo(tx, ty - ts * 0.5);
      terrain.lineTo(tx - ts * 1.1, ty + 2);
      terrain.lineTo(tx + ts * 1.1, ty + 2);
      terrain.closePath();
      terrain.fill({ color: treeColor, alpha: treeAlpha });
      // Middle layer
      terrain.moveTo(tx, ty - ts * 1.2);
      terrain.lineTo(tx - ts * 0.85, ty - ts * 0.3);
      terrain.lineTo(tx + ts * 0.85, ty - ts * 0.3);
      terrain.closePath();
      terrain.fill({ color: treeColor, alpha: treeAlpha + 0.05 });
      // Top layer (narrowest)
      terrain.moveTo(tx, ty - ts * 2);
      terrain.lineTo(tx - ts * 0.55, ty - ts);
      terrain.lineTo(tx + ts * 0.55, ty - ts);
      terrain.closePath();
      terrain.fill({ color: treeColor, alpha: treeAlpha + 0.1 });
    }
    // Procedural ruins (broken walls with arches and cracks)
    for (let i = 0; i < 6; i++) {
      const rx = 60 + Math.random() * 680;
      const ry = 120 + Math.random() * (mapH - 240);
      const rw = 10 + Math.random() * 14;
      const rh = 6 + Math.random() * 10;
      // Main wall
      terrain.rect(rx, ry, rw, rh);
      terrain.fill({ color: 0x222233, alpha: 0.3 });
      // Broken column
      terrain.rect(rx + rw + 3, ry + 2, 4, rh + 4);
      terrain.fill({ color: 0x222233, alpha: 0.25 });
      terrain.rect(rx + rw + 3, ry - 2, 4, 3);
      terrain.fill({ color: 0x222233, alpha: 0.15 }); // broken top
      // Arch fragment
      terrain.arc(rx + rw / 2, ry, rw * 0.4, -Math.PI, 0);
      terrain.stroke({ color: 0x2a2a3a, width: 1.5, alpha: 0.2 });
      // Crack lines
      terrain.moveTo(rx + 3, ry + 1);
      terrain.lineTo(rx + rw * 0.4, ry + rh * 0.6);
      terrain.stroke({ color: 0x111122, width: 0.8, alpha: 0.2 });
      terrain.moveTo(rx + rw * 0.6, ry);
      terrain.lineTo(rx + rw * 0.5, ry + rh);
      terrain.stroke({ color: 0x111122, width: 0.6, alpha: 0.15 });
    }
    // Road/path texture
    for (let i = 0; i < 25; i++) {
      const px = 300 + (Math.random() - 0.5) * 200;
      const py = 60 + i * (mapH / 25);
      terrain.ellipse(px, py, 15 + Math.random() * 20, 3);
      terrain.fill({ color: 0x1a1a22, alpha: 0.12 });
    }
    this._scrollContent.addChild(bg);
    this._scrollContent.addChild(terrain);

    // ── Connections layer ──
    const linesGfx = new Graphics();
    this._scrollContent.addChild(linesGfx);

    for (const node of map.nodes) {
      const ny = mapH - node.y;
      for (const connId of node.connections) {
        const target = map.nodes.find(n => n.id === connId);
        if (!target) continue;
        const ty = mapH - target.y;
        const visited = node.visited;
        const isPath = visited && target.visited;

        if (isPath) {
          // Bright traveled path
          linesGfx.moveTo(node.x, ny);
          linesGfx.lineTo(target.x, ty);
          linesGfx.stroke({ color: 0x66cc66, width: 2.5, alpha: 0.7 });
          // Glow
          linesGfx.moveTo(node.x, ny);
          linesGfx.lineTo(target.x, ty);
          linesGfx.stroke({ color: 0x44ff44, width: 5, alpha: 0.1 });
        } else {
          // Dim future path (dashed look via dots)
          const dx = target.x - node.x;
          const dy2 = ty - ny;
          const dist = Math.sqrt(dx * dx + dy2 * dy2);
          const steps = Math.floor(dist / 8);
          for (let s = 0; s < steps; s++) {
            const frac = s / steps;
            const px = node.x + dx * frac;
            const py = ny + dy2 * frac;
            linesGfx.circle(px, py, 0.8);
            linesGfx.fill({ color: 0x444466, alpha: 0.4 });
          }
        }
      }
    }

    // ── Nodes ──
    for (const node of map.nodes) {
      const ny = mapH - node.y;
      const nc = new Container();
      nc.position.set(node.x, ny);

      const isAvailable = availableIds.has(node.id);
      const isCurrent = node.id === currentNodeId;
      const color = NODE_COLORS[node.type] ?? 0x888888;
      const isBoss = node.type === MapNodeType.BOSS;
      const r = isBoss ? NODE_R * 1.5 : NODE_R;

      // ── Availability glow (pulsing) ──
      if (isAvailable) {
        const glow = new Graphics();
        glow.circle(0, 0, r + 10);
        glow.fill({ color, alpha: 0.12 });
        glow.circle(0, 0, r + 6);
        glow.fill({ color, alpha: 0.08 });
        nc.addChild(glow);
        // Pulse animation
        gsap.to(glow, { alpha: 0.4, duration: 0.8, yoyo: true, repeat: -1, ease: "sine.inOut" });
      }

      // ── Current position indicator ──
      if (isCurrent) {
        const curr = new Graphics();
        curr.circle(0, 0, r + 8);
        curr.stroke({ color: 0x44ff44, width: 3, alpha: 0.9 });
        curr.circle(0, 0, r + 12);
        curr.stroke({ color: 0x44ff44, width: 1.5, alpha: 0.3 });
        nc.addChild(curr);
      }

      // ── Node circle ──
      const nodeGfx = new Graphics();
      if (node.visited && !isCurrent) {
        // Visited: dimmed
        nodeGfx.circle(0, 0, r);
        nodeGfx.fill({ color: 0x333333, alpha: 0.5 });
        nodeGfx.circle(0, 0, r);
        nodeGfx.stroke({ color: 0x555555, width: 1.2 });
      } else {
        // Active: rich layered node
        // Outer ring
        nodeGfx.circle(0, 0, r);
        nodeGfx.fill({ color: 0x0c0c1a, alpha: 0.9 });
        // Color fill
        nodeGfx.circle(0, 0, r - 2);
        nodeGfx.fill({ color, alpha: 0.7 });
        // Highlight arc (top)
        nodeGfx.arc(0, 0, r - 3, -Math.PI * 0.8, -Math.PI * 0.2);
        nodeGfx.stroke({ color: 0xffffff, width: 1.2, alpha: 0.15 });
        // Border
        nodeGfx.circle(0, 0, r);
        nodeGfx.stroke({ color, width: 2 });
      }
      nc.addChild(nodeGfx);

      // ── Icon ──
      const icon = NODE_ICONS[node.type] ?? "?";
      const iTxt = new Text({ text: icon, style: iconStyle });
      iTxt.anchor.set(0.5);
      iTxt.alpha = node.visited && !isCurrent ? 0.4 : 1;
      nc.addChild(iTxt);

      // ── Label below ──
      if (isAvailable || isBoss) {
        const labels: Record<string, string> = {
          [MapNodeType.ENEMY]: "Enemy",
          [MapNodeType.ELITE]: "Elite",
          [MapNodeType.REST]: "Rest",
          [MapNodeType.SHOP]: "Shop",
          [MapNodeType.EVENT]: "Event",
          [MapNodeType.TREASURE]: "Chest",
          [MapNodeType.BOSS]: "BOSS",
        };
        const lbl = new Text({ text: labels[node.type] ?? "", style: isBoss ? new TextStyle({ fontFamily: "monospace", fontSize: 10, fill: 0xff4444, fontWeight: "bold" }) : nodeLabel });
        lbl.anchor.set(0.5, 0);
        lbl.position.set(0, r + 6);
        nc.addChild(lbl);

        // Boss preview: show boss name
        if (isBoss && node.encounterIds.length > 0) {
          try {
            const bossDef = getEnemyDef(node.encounterIds[0]);
            const bossName = new Text({ text: bossDef.name, style: new TextStyle({ fontFamily: "monospace", fontSize: 8, fill: 0xcc6666 }) });
            bossName.anchor.set(0.5, 0);
            bossName.position.set(0, r + 20);
            nc.addChild(bossName);
            const bossHp = new Text({ text: `HP: ${bossDef.maxHp[0]}-${bossDef.maxHp[1]}`, style: new TextStyle({ fontFamily: "monospace", fontSize: 7, fill: 0x886666 }) });
            bossHp.anchor.set(0.5, 0);
            bossHp.position.set(0, r + 31);
            nc.addChild(bossHp);
          } catch { /* skip */ }
        }
      }

      // ── Interactivity ──
      if (isAvailable) {
        nc.eventMode = "static";
        nc.cursor = "pointer";
        nc.on("pointerdown", () => this.onNodeClick?.(node.id));
        nc.on("pointerover", () => { nc.scale.set(1.15); });
        nc.on("pointerout", () => { nc.scale.set(1.0); });
      }

      this._scrollContent.addChild(nc);
    }

    // Add scroll content to container
    this.container.addChild(this._scrollContent);

    // Title (fixed, drawn on top)
    const actNames = ["", "Act I \u2014 Departure from Camelot", "Act II \u2014 The Wasteland", "Act III \u2014 The Perilous Lands"];
    const title = new Text({ text: actNames[map.act] ?? `Act ${map.act}`, style: titleStyle });
    title.anchor.set(0.5, 0);
    title.position.set(400, 8);
    this.container.addChild(title);

    // Scroll hint
    if (mapH > VIEW_H) {
      const hint = new Text({ text: "\u25BC Scroll to explore \u25BC", style: new TextStyle({ fontFamily: "monospace", fontSize: 9, fill: 0x555577 }) });
      hint.anchor.set(0.5);
      hint.position.set(400, VIEW_H + 34);
      this.container.addChild(hint);
      gsap.to(hint, { alpha: 0.3, duration: 1, yoyo: true, repeat: -1 });
    }

    // Set initial scroll to show available nodes or current node
    this._maxScroll = Math.max(0, mapH - VIEW_H);
    // Scroll to show current area (available nodes, or current node as fallback)
    if (availableIds.size > 0) {
      const firstAvail = map.nodes.find(n => availableIds.has(n.id));
      if (firstAvail) {
        const targetY = mapH - firstAvail.y;
        this._scrollY = Math.max(0, Math.min(this._maxScroll, targetY - VIEW_H / 2));
      }
    } else {
      const currentNode = map.nodes.find(n => n.id === currentNodeId);
      if (currentNode) {
        const targetY = mapH - currentNode.y;
        this._scrollY = Math.max(0, Math.min(this._maxScroll, targetY - VIEW_H / 2));
      } else {
        this._scrollY = 0;
      }
    }
    this._scrollContent.y = 40 - this._scrollY;

    // Wire up wheel scroll
    this._removeWheelHandler();
    this._wheelHandler = (e: WheelEvent) => {
      this._scrollY = Math.max(0, Math.min(this._maxScroll, this._scrollY + e.deltaY * 0.5));
      this._scrollContent.y = 40 - this._scrollY;
      e.preventDefault();
    };
    // Use the canvas element for wheel events
    const canvas = document.querySelector("canvas");
    if (canvas) canvas.addEventListener("wheel", this._wheelHandler, { passive: false });
  }

  getMapHeight(map: ActMap): number {
    const maxRow = Math.max(...map.nodes.map(n => n.row));
    return (maxRow + 2) * 80 + 160;
  }

  private _removeWheelHandler(): void {
    if (this._wheelHandler) {
      const canvas = document.querySelector("canvas");
      if (canvas) canvas.removeEventListener("wheel", this._wheelHandler);
      this._wheelHandler = null;
    }
  }

  destroy(): void {
    this._removeWheelHandler();
    this.container.removeChildren();
  }
}
