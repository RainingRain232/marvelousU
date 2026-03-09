// ---------------------------------------------------------------------------
// GTAMinimapView — bottom-right minimap showing the world overview with
// player, NPCs, buildings, horses, and camera viewport.
// ---------------------------------------------------------------------------

import { Container, Graphics, Text, TextStyle } from "pixi.js";
import { GTAConfig } from "../config/MedievalGTAConfig";
import type { MedievalGTAState, GTANPC } from "../state/MedievalGTAState";

const MAP_W = 180;
const MAP_H = 135;
const WORLD_W = GTAConfig.WORLD_WIDTH;
const WORLD_H = GTAConfig.WORLD_HEIGHT;
const CITY_X = GTAConfig.CITY_X;
const CITY_Y = GTAConfig.CITY_Y;
const CITY_W = GTAConfig.CITY_W;
const CITY_H = GTAConfig.CITY_H;
const WT = GTAConfig.WALL_THICKNESS;
const ZOOM = 1.5;

// Convert world coords to minimap coords
function toMapX(wx: number): number { return (wx / WORLD_W) * MAP_W; }
function toMapY(wy: number): number { return (wy / WORLD_H) * MAP_H; }
function toMapW(ww: number): number { return (ww / WORLD_W) * MAP_W; }
function toMapH(wh: number): number { return (wh / WORLD_H) * MAP_H; }

export class GTAMinimapView {
  readonly container = new Container();

  private bg = new Graphics();
  private staticLayer = new Graphics();
  private dynamicLayer = new Graphics();
  private viewportRect = new Graphics();
  private titleText!: Text;
  private playerBlinkTimer = 0;

  init(screenW: number, screenH: number): void {
    this.container.removeChildren();

    const margin = 12;
    this.container.position.set(screenW - MAP_W - margin - 8, screenH - MAP_H - margin - 8);

    // Background panel
    this.bg.clear();
    this.bg.roundRect(-6, -20, MAP_W + 12, MAP_H + 28, 5).fill({ color: 0x1a1a2e, alpha: 0.88 });
    this.bg.roundRect(-6, -20, MAP_W + 12, MAP_H + 28, 5).stroke({ color: 0xDAA520, width: 1.5, alpha: 0.7 });
    // Inner border
    this.bg.roundRect(-2, -2, MAP_W + 4, MAP_H + 4, 3).stroke({ color: 0xDAA520, width: 0.5, alpha: 0.3 });
    this.container.addChild(this.bg);

    // Title
    this.titleText = new Text({
      text: "CAMELOT",
      style: new TextStyle({
        fontFamily: "monospace", fontSize: 9, fill: 0xDAA520,
        fontWeight: "bold", letterSpacing: 3,
      }),
    });
    this.titleText.anchor.set(0.5, 0.5);
    this.titleText.position.set(MAP_W / 2, -10);
    this.container.addChild(this.titleText);

    // Static layer (drawn once)
    this.drawStaticMap();
    this.container.addChild(this.staticLayer);

    // Dynamic layer (redrawn each frame)
    this.container.addChild(this.dynamicLayer);
    this.container.addChild(this.viewportRect);

    // Decorative corner nubs
    const corners = new Graphics();
    const cs = 4;
    corners.moveTo(-6, -20 + cs).lineTo(-6, -20).lineTo(-6 + cs, -20).stroke({ color: 0xDAA520, width: 2 });
    corners.moveTo(MAP_W + 6 - cs, -20).lineTo(MAP_W + 6, -20).lineTo(MAP_W + 6, -20 + cs).stroke({ color: 0xDAA520, width: 2 });
    corners.moveTo(-6, MAP_H + 8 - cs).lineTo(-6, MAP_H + 8).lineTo(-6 + cs, MAP_H + 8).stroke({ color: 0xDAA520, width: 2 });
    corners.moveTo(MAP_W + 6 - cs, MAP_H + 8).lineTo(MAP_W + 6, MAP_H + 8).lineTo(MAP_W + 6, MAP_H + 8 - cs).stroke({ color: 0xDAA520, width: 2 });
    this.container.addChild(corners);
  }

  private drawStaticMap(): void {
    const g = this.staticLayer;
    g.clear();

    // Green outside
    g.rect(0, 0, MAP_W, MAP_H).fill({ color: 0x3a6b2f });

    // Forest area (north - darker green)
    g.rect(0, 0, MAP_W, toMapY(450)).fill({ color: 0x2a5520, alpha: 0.5 });

    // Farm area (south - lighter green/brown)
    const farmY = toMapY(CITY_Y + CITY_H + 50);
    g.rect(0, farmY, MAP_W, MAP_H - farmY).fill({ color: 0x5a7a35, alpha: 0.4 });
    // Farm field rows
    for (let fi = 0; fi < 4; fi++) {
      const fx = toMapX(400 + fi * 600);
      g.rect(fx, farmY + 2, toMapW(350), toMapH(150)).fill({ color: 0x6b8e23, alpha: 0.3 });
    }

    // City area (gray cobblestone)
    const cx = toMapX(CITY_X + WT);
    const cy = toMapY(CITY_Y + WT);
    const cw = toMapW(CITY_W - WT * 2);
    const ch = toMapH(CITY_H - WT * 2);
    g.rect(cx, cy, cw, ch).fill({ color: 0x6a6a62 });

    // Market square (lighter)
    g.rect(toMapX(1500), toMapY(1200), toMapW(600), toMapH(500)).fill({ color: 0x8a7a6a, alpha: 0.4 });

    // Roads
    const roadW = toMapW(36);
    g.rect(toMapX(1950) - roadW / 2, 0, roadW, MAP_H).fill({ color: 0x7a7060, alpha: 0.5 });
    g.rect(0, toMapY(1400) - roadW / 2, MAP_W, roadW).fill({ color: 0x7a7060, alpha: 0.5 });

    // City walls (darker lines)
    const wallColor = 0x554433;
    const wt = Math.max(2, toMapW(WT));
    // North wall
    g.rect(toMapX(CITY_X), toMapY(CITY_Y), toMapW(CITY_W), wt).fill({ color: wallColor });
    // South wall
    g.rect(toMapX(CITY_X), toMapY(CITY_Y + CITY_H) - wt, toMapW(CITY_W), wt).fill({ color: wallColor });
    // West wall
    g.rect(toMapX(CITY_X), toMapY(CITY_Y), wt, toMapH(CITY_H)).fill({ color: wallColor });
    // East wall
    g.rect(toMapX(CITY_X + CITY_W) - wt, toMapY(CITY_Y), wt, toMapH(CITY_H)).fill({ color: wallColor });

    // Gate openings (small gaps)
    const gateW = toMapW(100);
    // N gate
    g.rect(toMapX(1950) - gateW / 2, toMapY(CITY_Y), gateW, wt).fill({ color: 0x6a6a62 });
    // S gate
    g.rect(toMapX(1950) - gateW / 2, toMapY(CITY_Y + CITY_H) - wt, gateW, wt).fill({ color: 0x6a6a62 });
    // W gate
    g.rect(toMapX(CITY_X), toMapY(1400) - gateW / 2, wt, gateW).fill({ color: 0x6a6a62 });
    // E gate
    g.rect(toMapX(CITY_X + CITY_W) - wt, toMapY(1400) - gateW / 2, wt, gateW).fill({ color: 0x6a6a62 });

    // Tower dots
    const towerColor = 0x665544;
    const towerR = 2;
    // Corners
    g.circle(toMapX(CITY_X), toMapY(CITY_Y), towerR).fill({ color: towerColor });
    g.circle(toMapX(CITY_X + CITY_W), toMapY(CITY_Y), towerR).fill({ color: towerColor });
    g.circle(toMapX(CITY_X), toMapY(CITY_Y + CITY_H), towerR).fill({ color: towerColor });
    g.circle(toMapX(CITY_X + CITY_W), toMapY(CITY_Y + CITY_H), towerR).fill({ color: towerColor });
  }

  update(state: MedievalGTAState, screenW: number, screenH: number): void {
    this.playerBlinkTimer++;
    const g = this.dynamicLayer;
    g.clear();

    // Reposition if screen resized
    this.container.position.set(screenW - MAP_W - 20, screenH - MAP_H - 20);

    // ---- Building outlines ----
    for (const b of state.buildings) {
      // Skip walls/gates (already drawn as static)
      const bt = b.type as string;
      if (bt.startsWith('wall_') || bt.startsWith('gate_')) continue;
      const bx = toMapX(b.x);
      const by = toMapY(b.y);
      const bw = Math.max(2, toMapW(b.w));
      const bh = Math.max(2, toMapH(b.h));
      let color = 0x555550;
      if (b.type === 'castle') color = 0x666660;
      else if (b.type === 'church') color = 0x777770;
      else if (b.type === 'tavern') color = 0x6a5a4a;
      else if (b.type === 'market_stall') color = 0x8a7a5a;
      else if (b.type === 'stable') color = 0x6a5a3a;
      else if (bt.startsWith('house_')) color = 0x606058;
      g.rect(bx, by, bw, bh).fill({ color, alpha: 0.6 });
    }

    // ---- Horses (brown dots) ----
    state.horses.forEach((horse) => {
      g.circle(toMapX(horse.pos.x), toMapY(horse.pos.y), 1.5).fill({ color: 0x8B4513 });
    });

    // ---- NPCs (small colored dots) ----
    state.npcs.forEach((npc) => {
      if (npc.dead) return;
      const nx = toMapX(npc.pos.x);
      const ny = toMapY(npc.pos.y);
      const color = this.getNPCDotColor(npc);
      g.circle(nx, ny, 1).fill({ color });
    });

    // ---- Quest markers (yellow ! dots for quest givers with available quests) ----
    state.npcs.forEach((npc) => {
      if (!npc.questId || npc.dead) return;
      const quest = state.quests.find(q => q.id === npc.questId);
      if (quest && quest.status === 'available') {
        const nx = toMapX(npc.pos.x);
        const ny = toMapY(npc.pos.y);
        g.circle(nx, ny, 2.5).fill({ color: 0xFFDD00, alpha: 0.8 });
      }
    });

    // ---- Quest objective markers (gold diamonds for active quest targets) ----
    for (const quest of state.quests) {
      if (quest.status !== 'active') continue;
      for (const obj of quest.objectives) {
        if (obj.completed || !obj.targetPos) continue;
        const qx = toMapX(obj.targetPos.x);
        const qy = toMapY(obj.targetPos.y);
        // Gold diamond marker
        g.poly([qx, qy - 3, qx + 2.5, qy, qx, qy + 3, qx - 2.5, qy]).fill({ color: 0xFFDD00 });
        g.poly([qx, qy - 3, qx + 2.5, qy, qx, qy + 3, qx - 2.5, qy]).stroke({ color: 0xAA8800, width: 0.5 });
      }
    }

    // ---- Player (bright white blinking dot) ----
    const px = toMapX(state.player.pos.x);
    const py = toMapY(state.player.pos.y);
    const blink = Math.floor(this.playerBlinkTimer * 0.08) % 2 === 0;
    if (blink) {
      // Glow
      g.circle(px, py, 4).fill({ color: 0xFFFFFF, alpha: 0.15 });
      g.circle(px, py, 2.5).fill({ color: 0xFFFFFF });
    } else {
      g.circle(px, py, 2).fill({ color: 0xDDDDDD });
    }

    // Player direction indicator
    const facing = state.player.facing;
    g.moveTo(px, py)
      .lineTo(px + Math.cos(facing) * 5, py + Math.sin(facing) * 5)
      .stroke({ color: 0xFFFFFF, width: 1, alpha: 0.6 });

    // ---- Camera viewport rectangle ----
    this.viewportRect.clear();
    const vpW = screenW / ZOOM;
    const vpH = screenH / ZOOM;
    const vpX = toMapX(state.cameraX - vpW / 2);
    const vpY = toMapY(state.cameraY - vpH / 2);
    const vpMW = toMapW(vpW);
    const vpMH = toMapH(vpH);
    this.viewportRect.rect(vpX, vpY, vpMW, vpMH).stroke({ color: 0xFFFFFF, width: 1, alpha: 0.4 });
  }

  private getNPCDotColor(npc: GTANPC): number {
    switch (npc.type) {
      case 'guard':
      case 'knight':
      case 'archer_guard':
      case 'army_soldier':
        return 0xCC3333; // red for military
      case 'merchant':
      case 'tavern_keeper':
      case 'stable_master':
        return 0xDDAA22; // yellow for merchants
      case 'criminal':
      case 'bandit':
        return 0x884422; // dark red for hostiles
      case 'priest':
      case 'bard':
        return 0xAAAA88; // light for special
      default:
        return 0x888888; // gray for civilians
    }
  }
}
