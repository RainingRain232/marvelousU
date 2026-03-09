// ---------------------------------------------------------------------------
// GTAInteriorRenderer -- renders building interiors in screen space
// ---------------------------------------------------------------------------

import { Container, Graphics, Text, TextStyle } from "pixi.js";
import type { MedievalGTAState, GTABuildingType } from "../state/MedievalGTAState";

// Room dimensions (screen-space pixels)
const ROOM_W = 600;
const ROOM_H = 400;
const WALL_THICK = 20;
const DOOR_W = 60;

export class GTAInteriorRenderer {
  readonly container = new Container();
  private currentType: string | null = null;
  private gfx = new Graphics();
  private exitText: Text | null = null;

  init(): void {
    this.container.removeChildren();
    this.container.addChild(this.gfx);

    const style = new TextStyle({
      fontFamily: "monospace",
      fontSize: 14,
      fill: 0xffff88,
      stroke: { color: 0x000000, width: 3 },
    });
    this.exitText = new Text({ text: "Press E to exit", style });
    this.exitText.anchor.set(0.5, 0);
    this.container.addChild(this.exitText);

    this.container.visible = false;
  }

  update(state: MedievalGTAState, screenW: number, screenH: number): void {
    if (!state.insideBuilding) {
      this.container.visible = false;
      return;
    }
    this.container.visible = true;
    if (state.interiorType !== this.currentType) {
      this.currentType = state.interiorType;
      this.drawInterior(state.interiorType!, screenW, screenH);
    }
    // Position exit text
    if (this.exitText) {
      const rx = (screenW - ROOM_W) / 2;
      const ry = (screenH - ROOM_H) / 2;
      this.exitText.x = rx + ROOM_W / 2;
      this.exitText.y = ry + ROOM_H + 6;
    }
  }

  private drawInterior(type: GTABuildingType, screenW: number, screenH: number): void {
    const g = this.gfx;
    g.clear();

    // Room origin (top-left)
    const rx = (screenW - ROOM_W) / 2;
    const ry = (screenH - ROOM_H) / 2;

    // Dark background behind room
    g.rect(0, 0, screenW, screenH).fill({ color: 0x000000, alpha: 0.85 });

    switch (type) {
      case "tavern":
        this.drawTavern(g, rx, ry);
        break;
      case "church":
        this.drawChurch(g, rx, ry);
        break;
      case "blacksmith_shop":
        this.drawBlacksmith(g, rx, ry);
        break;
      case "castle":
        this.drawCastle(g, rx, ry);
        break;
      case "barracks":
        this.drawBarracks(g, rx, ry);
        break;
      case "stable":
        this.drawStable(g, rx, ry);
        break;
      default:
        this.drawGenericRoom(g, rx, ry);
        break;
    }

    // Door opening at bottom center (gap in wall)
    // already handled by not drawing wall in door region
  }

  // ── Shared helpers ───────────────────────────────────────────────────────

  private drawFloor(g: Graphics, rx: number, ry: number, color: number): void {
    g.rect(rx, ry, ROOM_W, ROOM_H).fill({ color });
  }

  private drawWalls(g: Graphics, rx: number, ry: number, color: number): void {
    // Top wall
    g.rect(rx, ry, ROOM_W, WALL_THICK).fill({ color });
    // Left wall
    g.rect(rx, ry, WALL_THICK, ROOM_H).fill({ color });
    // Right wall
    g.rect(rx + ROOM_W - WALL_THICK, ry, WALL_THICK, ROOM_H).fill({ color });
    // Bottom wall with door gap
    const doorStart = rx + (ROOM_W - DOOR_W) / 2;
    g.rect(rx, ry + ROOM_H - WALL_THICK, doorStart - rx, WALL_THICK).fill({ color });
    g.rect(doorStart + DOOR_W, ry + ROOM_H - WALL_THICK, rx + ROOM_W - doorStart - DOOR_W, WALL_THICK).fill({ color });
  }

  /** Draw optional decorative trim lines along the inner wall edges. */
  drawWallTrim(g: Graphics, rx: number, ry: number, color: number): void {
    g.rect(rx + WALL_THICK, ry + WALL_THICK, ROOM_W - 2 * WALL_THICK, 3).fill({ color });
    g.rect(rx + WALL_THICK, ry, 3, ROOM_H).fill({ color });
    g.rect(rx + ROOM_W - WALL_THICK - 3, ry, 3, ROOM_H).fill({ color });
  }

  // ── Tavern ───────────────────────────────────────────────────────────────

  private drawTavern(g: Graphics, rx: number, ry: number): void {
    // Wooden plank floor
    this.drawFloor(g, rx, ry, 0x6b4226);
    // Horizontal plank lines
    for (let i = 1; i < 12; i++) {
      g.rect(rx, ry + i * 34, ROOM_W, 1).fill({ color: 0x553318, alpha: 0.6 });
    }

    // Stone walls
    this.drawWalls(g, rx, ry, 0x777777);

    // Ceiling beams
    for (let i = 1; i <= 3; i++) {
      g.rect(rx + WALL_THICK, ry + WALL_THICK + i * 90, ROOM_W - 2 * WALL_THICK, 4).fill({ color: 0x5a3a1a });
    }

    // Bar counter on right side
    const barX = rx + ROOM_W - WALL_THICK - 100;
    const barY = ry + 60;
    g.rect(barX, barY, 80, 200).fill({ color: 0x5a3a1a });
    g.rect(barX + 2, barY + 2, 76, 196).fill({ color: 0x704828 });
    // Bottles on bar
    const bottleColors = [0xff4444, 0x44aa44, 0x8888ff, 0xffaa00, 0xcc44cc];
    for (let i = 0; i < 5; i++) {
      g.rect(barX + 10 + i * 14, barY + 10, 6, 16).fill({ color: bottleColors[i] });
      g.rect(barX + 11 + i * 14, barY + 4, 4, 6).fill({ color: bottleColors[i], alpha: 0.7 });
    }

    // Tables with stools
    const tables = [
      { x: rx + 80, y: ry + 100 },
      { x: rx + 200, y: ry + 180 },
      { x: rx + 120, y: ry + 300 },
      { x: rx + 300, y: ry + 120 },
    ];
    for (const t of tables) {
      // Table (circle)
      g.circle(t.x, t.y, 22).fill({ color: 0x704828 });
      g.circle(t.x, t.y, 20).fill({ color: 0x8b6432 });
      // Stools
      for (let a = 0; a < 4; a++) {
        const angle = (a * Math.PI * 2) / 4;
        const sx = t.x + Math.cos(angle) * 32;
        const sy = t.y + Math.sin(angle) * 32;
        g.circle(sx, sy, 6).fill({ color: 0x5a3a1a });
      }
    }

    // Fireplace on back wall
    const fpX = rx + ROOM_W / 2 - 40;
    const fpY = ry + WALL_THICK;
    g.rect(fpX, fpY, 80, 50).fill({ color: 0x333333 });
    g.rect(fpX + 5, fpY + 5, 70, 40).fill({ color: 0x1a1a1a });
    // Fire glow
    g.circle(fpX + 40, fpY + 30, 25).fill({ color: 0xff6600, alpha: 0.3 });
    g.circle(fpX + 40, fpY + 30, 15).fill({ color: 0xff4400, alpha: 0.5 });
    // Fire triangles
    const fireColors = [0xff4400, 0xff6600, 0xffaa00];
    for (let i = 0; i < 5; i++) {
      const fx = fpX + 15 + i * 12;
      const color = fireColors[i % 3];
      g.moveTo(fx, fpY + 40);
      g.lineTo(fx + 5, fpY + 15 + (i % 2) * 8);
      g.lineTo(fx + 10, fpY + 40);
      g.fill({ color, alpha: 0.9 });
    }

    // Barrels in corners
    const barrelPos = [
      { x: rx + WALL_THICK + 20, y: ry + WALL_THICK + 20 },
      { x: rx + WALL_THICK + 20, y: ry + ROOM_H - WALL_THICK - 30 },
      { x: rx + ROOM_W - WALL_THICK - 25, y: ry + ROOM_H - WALL_THICK - 30 },
    ];
    for (const bp of barrelPos) {
      g.circle(bp.x, bp.y, 14).fill({ color: 0x5a3a1a });
      g.circle(bp.x, bp.y, 12).fill({ color: 0x704828 });
      // Barrel bands
      g.rect(bp.x - 12, bp.y - 3, 24, 2).fill({ color: 0x444444 });
      g.rect(bp.x - 12, bp.y + 4, 24, 2).fill({ color: 0x444444 });
    }

    // Hanging lanterns
    const lanternX = [rx + 150, rx + 350, rx + 450];
    for (const lx of lanternX) {
      g.rect(lx - 1, ry + WALL_THICK, 2, 20).fill({ color: 0x444444 });
      g.circle(lx, ry + WALL_THICK + 24, 6).fill({ color: 0xffcc44, alpha: 0.8 });
      g.circle(lx, ry + WALL_THICK + 24, 12).fill({ color: 0xffcc44, alpha: 0.15 });
    }
  }

  // ── Church ───────────────────────────────────────────────────────────────

  private drawChurch(g: Graphics, rx: number, ry: number): void {
    // Stone tile floor (grid)
    this.drawFloor(g, rx, ry, 0x999988);
    for (let i = 0; i < 20; i++) {
      for (let j = 0; j < 14; j++) {
        const tx = rx + i * 30;
        const ty = ry + j * 30;
        g.rect(tx, ty, 30, 30).stroke({ color: 0x888877, width: 1 });
      }
    }

    // Tall stone walls
    this.drawWalls(g, rx, ry, 0x888877);

    // Red carpet runner down center
    const carpetX = rx + ROOM_W / 2 - 25;
    g.rect(carpetX, ry + WALL_THICK, 50, ROOM_H - WALL_THICK).fill({ color: 0x8b1a1a });
    // Carpet gold trim
    g.rect(carpetX, ry + WALL_THICK, 2, ROOM_H - WALL_THICK).fill({ color: 0xccaa44 });
    g.rect(carpetX + 48, ry + WALL_THICK, 2, ROOM_H - WALL_THICK).fill({ color: 0xccaa44 });

    // Pews (2 rows)
    for (let row = 0; row < 2; row++) {
      const pewX = row === 0 ? rx + 50 : rx + ROOM_W - 50 - 80;
      for (let i = 0; i < 5; i++) {
        const pewY = ry + 80 + i * 55;
        g.rect(pewX, pewY, 80, 20).fill({ color: 0x5a3a1a });
        g.rect(pewX, pewY - 5, 4, 25).fill({ color: 0x5a3a1a }); // back
        g.rect(pewX + 76, pewY - 5, 4, 25).fill({ color: 0x5a3a1a });
      }
    }

    // Altar at back
    const altarX = rx + ROOM_W / 2 - 40;
    const altarY = ry + WALL_THICK + 10;
    g.rect(altarX, altarY, 80, 40).fill({ color: 0xccccbb });
    g.rect(altarX + 2, altarY + 2, 76, 36).fill({ color: 0xddddcc });
    // Gold cross on altar
    g.rect(altarX + 35, altarY + 5, 10, 28).fill({ color: 0xccaa44 });
    g.rect(altarX + 25, altarY + 12, 30, 8).fill({ color: 0xccaa44 });

    // 3 stained glass windows on back wall
    const windowColors = [0xcc3333, 0x3366cc, 0xccaa44];
    for (let i = 0; i < 3; i++) {
      const wx = rx + 120 + i * 160;
      const wy = ry + 2;
      // Arched window
      g.rect(wx, wy + 8, 40, 14).fill({ color: windowColors[i], alpha: 0.7 });
      // Arc top
      g.moveTo(wx, wy + 8);
      g.arc(wx + 20, wy + 8, 20, Math.PI, 0);
      g.fill({ color: windowColors[i], alpha: 0.7 });
      // Window frame
      g.rect(wx + 19, wy, 2, 22).fill({ color: 0x444444 });
      g.rect(wx, wy + 12, 40, 2).fill({ color: 0x444444 });
    }

    // Candelabras on sides
    for (let side = 0; side < 2; side++) {
      const cx = side === 0 ? rx + WALL_THICK + 15 : rx + ROOM_W - WALL_THICK - 15;
      for (let i = 0; i < 4; i++) {
        const cy = ry + 80 + i * 80;
        g.rect(cx - 1, cy - 20, 2, 20).fill({ color: 0x888844 });
        g.circle(cx, cy - 22, 4).fill({ color: 0xffcc44, alpha: 0.9 });
        g.circle(cx, cy - 22, 8).fill({ color: 0xffcc44, alpha: 0.15 });
      }
    }
  }

  // ── Blacksmith ───────────────────────────────────────────────────────────

  private drawBlacksmith(g: Graphics, rx: number, ry: number): void {
    // Dark stone floor
    this.drawFloor(g, rx, ry, 0x444444);

    // Dark stone walls
    this.drawWalls(g, rx, ry, 0x555555);

    // Smoke overlay at top
    g.rect(rx, ry, ROOM_W, ROOM_H / 3).fill({ color: 0x222222, alpha: 0.3 });

    // Forge on back wall
    const forgeX = rx + ROOM_W / 2 - 60;
    const forgeY = ry + WALL_THICK;
    g.rect(forgeX, forgeY, 120, 60).fill({ color: 0x333333 });
    g.rect(forgeX + 5, forgeY + 5, 110, 50).fill({ color: 0x1a1a1a });
    // Glowing center
    g.circle(forgeX + 60, forgeY + 35, 30).fill({ color: 0xff4400, alpha: 0.3 });
    g.circle(forgeX + 60, forgeY + 35, 20).fill({ color: 0xff6600, alpha: 0.5 });
    g.circle(forgeX + 60, forgeY + 35, 10).fill({ color: 0xffaa00, alpha: 0.7 });
    // Bellows shape (right of forge)
    g.rect(forgeX + 125, forgeY + 10, 30, 40).fill({ color: 0x5a3a1a });
    g.moveTo(forgeX + 125, forgeY + 10);
    g.lineTo(forgeX + 120, forgeY + 30);
    g.lineTo(forgeX + 125, forgeY + 50);
    g.fill({ color: 0x5a3a1a });

    // Anvil in center
    const anvX = rx + ROOM_W / 2;
    const anvY = ry + 180;
    // Trapezoid anvil
    g.moveTo(anvX - 25, anvY + 20);
    g.lineTo(anvX - 15, anvY);
    g.lineTo(anvX + 15, anvY);
    g.lineTo(anvX + 25, anvY + 20);
    g.fill({ color: 0x333333 });
    // Anvil top surface
    g.rect(anvX - 20, anvY - 5, 40, 8).fill({ color: 0x555555 });
    // Horn
    g.moveTo(anvX + 20, anvY - 2);
    g.lineTo(anvX + 35, anvY + 2);
    g.lineTo(anvX + 20, anvY + 5);
    g.fill({ color: 0x555555 });

    // Weapon rack on left wall
    const wrX = rx + WALL_THICK + 5;
    const wrY = ry + 60;
    g.rect(wrX, wrY, 8, 200).fill({ color: 0x5a3a1a });
    g.rect(wrX + 25, wrY, 8, 200).fill({ color: 0x5a3a1a });
    // Cross pieces
    for (let i = 0; i < 4; i++) {
      g.rect(wrX, wrY + 20 + i * 50, 33, 4).fill({ color: 0x5a3a1a });
    }
    // Weapons on rack (swords)
    for (let i = 0; i < 3; i++) {
      const sy = wrY + 30 + i * 50;
      g.rect(wrX + 5, sy, 2, 35).fill({ color: 0xaaaaaa });
      g.rect(wrX + 1, sy + 30, 10, 3).fill({ color: 0x888844 });
    }

    // Tool rack on right
    const trX = rx + ROOM_W - WALL_THICK - 40;
    const trY = ry + 60;
    g.rect(trX, trY, 30, 4).fill({ color: 0x5a3a1a });
    g.rect(trX, trY + 60, 30, 4).fill({ color: 0x5a3a1a });
    // Hooks with tools
    for (let i = 0; i < 4; i++) {
      const hx = trX + 5 + i * 7;
      g.rect(hx, trY + 4, 2, 8).fill({ color: 0x666666 });
      // Tool shapes (tongs, hammer, etc)
      g.rect(hx - 2, trY + 12, 6, 20).fill({ color: 0x888888 });
    }

    // Water trough
    g.rect(rx + 350, ry + 280, 80, 30).fill({ color: 0x5a3a1a });
    g.rect(rx + 354, ry + 284, 72, 22).fill({ color: 0x4466aa, alpha: 0.7 });

    // Sparks/embers near forge
    const sparkColors = [0xff4400, 0xff6600, 0xffaa00, 0xffcc44];
    for (let i = 0; i < 12; i++) {
      const sx = forgeX + 20 + Math.sin(i * 2.3) * 50;
      const sy = forgeY + 10 + Math.cos(i * 1.7) * 40;
      g.circle(sx, sy, 1.5).fill({ color: sparkColors[i % 4], alpha: 0.8 });
    }
  }

  // ── Castle throne room ───────────────────────────────────────────────────

  private drawCastle(g: Graphics, rx: number, ry: number): void {
    // Checkered marble floor
    this.drawFloor(g, rx, ry, 0xccccbb);
    const tileSize = 30;
    for (let i = 0; i < Math.ceil(ROOM_W / tileSize); i++) {
      for (let j = 0; j < Math.ceil(ROOM_H / tileSize); j++) {
        if ((i + j) % 2 === 0) {
          g.rect(rx + i * tileSize, ry + j * tileSize, tileSize, tileSize).fill({ color: 0xeeeedd });
        }
      }
    }

    // Stone walls
    this.drawWalls(g, rx, ry, 0x888877);

    // Ornate floor border
    g.rect(rx + WALL_THICK, ry + WALL_THICK, ROOM_W - 2 * WALL_THICK, 4).fill({ color: 0xccaa44 });
    g.rect(rx + WALL_THICK, ry + ROOM_H - WALL_THICK - 4, ROOM_W - 2 * WALL_THICK, 4).fill({ color: 0xccaa44 });
    g.rect(rx + WALL_THICK, ry + WALL_THICK, 4, ROOM_H - 2 * WALL_THICK).fill({ color: 0xccaa44 });
    g.rect(rx + ROOM_W - WALL_THICK - 4, ry + WALL_THICK, 4, ROOM_H - 2 * WALL_THICK).fill({ color: 0xccaa44 });

    // Red carpet from door to throne
    const carpetX = rx + ROOM_W / 2 - 30;
    g.rect(carpetX, ry + WALL_THICK + 60, 60, ROOM_H - WALL_THICK - 60).fill({ color: 0x8b1a1a });
    g.rect(carpetX, ry + WALL_THICK + 60, 3, ROOM_H - WALL_THICK - 60).fill({ color: 0xccaa44 });
    g.rect(carpetX + 57, ry + WALL_THICK + 60, 3, ROOM_H - WALL_THICK - 60).fill({ color: 0xccaa44 });

    // Pillars (2 each side)
    const pillarPositions = [
      { x: rx + 80, y: ry + 80 },
      { x: rx + 80, y: ry + 240 },
      { x: rx + ROOM_W - 80, y: ry + 80 },
      { x: rx + ROOM_W - 80, y: ry + 240 },
    ];
    for (const pp of pillarPositions) {
      g.rect(pp.x - 15, pp.y - 15, 30, 30).fill({ color: 0x999988 });
      g.rect(pp.x - 18, pp.y - 18, 36, 6).fill({ color: 0xaaa999 }); // capital
      g.rect(pp.x - 18, pp.y + 12, 36, 6).fill({ color: 0xaaa999 }); // base
    }

    // Throne at back center
    const throneX = rx + ROOM_W / 2;
    const throneY = ry + WALL_THICK + 30;
    // Throne base
    g.rect(throneX - 25, throneY, 50, 40).fill({ color: 0xccaa44 });
    // Throne back
    g.rect(throneX - 20, throneY - 30, 40, 35).fill({ color: 0xccaa44 });
    // Throne top ornament
    g.moveTo(throneX - 20, throneY - 30);
    g.lineTo(throneX, throneY - 45);
    g.lineTo(throneX + 20, throneY - 30);
    g.fill({ color: 0xccaa44 });
    // Red cushion
    g.rect(throneX - 18, throneY + 5, 36, 28).fill({ color: 0x8b1a1a });
    // Armrests
    g.rect(throneX - 28, throneY + 5, 8, 30).fill({ color: 0xccaa44 });
    g.rect(throneX + 20, throneY + 5, 8, 30).fill({ color: 0xccaa44 });

    // Banners on walls
    const bannerPositions = [
      { x: rx + WALL_THICK + 20, y: ry + WALL_THICK + 10 },
      { x: rx + WALL_THICK + 20, y: ry + WALL_THICK + 160 },
      { x: rx + ROOM_W - WALL_THICK - 50, y: ry + WALL_THICK + 10 },
      { x: rx + ROOM_W - WALL_THICK - 50, y: ry + WALL_THICK + 160 },
    ];
    for (const bp of bannerPositions) {
      g.rect(bp.x, bp.y, 30, 70).fill({ color: 0x8b1a1a });
      g.rect(bp.x, bp.y, 30, 4).fill({ color: 0xccaa44 });
      g.rect(bp.x, bp.y + 66, 30, 4).fill({ color: 0xccaa44 });
      g.rect(bp.x, bp.y, 2, 70).fill({ color: 0xccaa44 });
      g.rect(bp.x + 28, bp.y, 2, 70).fill({ color: 0xccaa44 });
      // Banner emblem (simple cross/shield)
      g.rect(bp.x + 12, bp.y + 15, 6, 30).fill({ color: 0xccaa44 });
      g.rect(bp.x + 5, bp.y + 25, 20, 6).fill({ color: 0xccaa44 });
    }

    // Torch sconces
    const torchPositions = [
      { x: rx + WALL_THICK + 5, y: ry + 120 },
      { x: rx + WALL_THICK + 5, y: ry + 280 },
      { x: rx + ROOM_W - WALL_THICK - 5, y: ry + 120 },
      { x: rx + ROOM_W - WALL_THICK - 5, y: ry + 280 },
    ];
    for (const tp of torchPositions) {
      g.rect(tp.x - 2, tp.y, 4, 12).fill({ color: 0x5a3a1a });
      g.circle(tp.x, tp.y - 2, 5).fill({ color: 0xff8844, alpha: 0.9 });
      g.circle(tp.x, tp.y - 2, 10).fill({ color: 0xff8844, alpha: 0.15 });
    }
  }

  // ── Barracks ─────────────────────────────────────────────────────────────

  private drawBarracks(g: Graphics, rx: number, ry: number): void {
    // Wood plank floor
    this.drawFloor(g, rx, ry, 0x6b4226);
    for (let i = 1; i < 12; i++) {
      g.rect(rx, ry + i * 34, ROOM_W, 1).fill({ color: 0x553318, alpha: 0.5 });
    }

    // Stone walls
    this.drawWalls(g, rx, ry, 0x777766);

    // 4 bunk beds along left wall
    for (let i = 0; i < 4; i++) {
      const bx = rx + WALL_THICK + 10;
      const by = ry + 40 + i * 80;
      // Bottom bunk
      g.rect(bx, by, 70, 30).fill({ color: 0x5a3a1a });
      g.rect(bx + 3, by + 3, 64, 24).fill({ color: 0x666655 }); // blanket
      // Top bunk
      g.rect(bx, by - 30, 70, 30).fill({ color: 0x5a3a1a });
      g.rect(bx + 3, by - 27, 64, 24).fill({ color: 0x556655 }); // blanket
      // Posts
      g.rect(bx, by - 30, 4, 60).fill({ color: 0x5a3a1a });
      g.rect(bx + 66, by - 30, 4, 60).fill({ color: 0x5a3a1a });
      // Chest at foot
      g.rect(bx + 72, by + 5, 25, 18).fill({ color: 0x5a3a1a });
      g.rect(bx + 80, by + 8, 8, 3).fill({ color: 0x888844 }); // latch
    }

    // Weapon rack on right wall
    const wrX = rx + ROOM_W - WALL_THICK - 50;
    const wrY = ry + 40;
    g.rect(wrX, wrY, 8, 180).fill({ color: 0x5a3a1a });
    g.rect(wrX + 35, wrY, 8, 180).fill({ color: 0x5a3a1a });
    for (let i = 0; i < 4; i++) {
      g.rect(wrX, wrY + 10 + i * 45, 43, 4).fill({ color: 0x5a3a1a });
    }
    // Swords
    for (let i = 0; i < 3; i++) {
      g.rect(wrX + 10 + i * 10, wrY + 20 + i * 45, 2, 35).fill({ color: 0xaaaaaa });
      g.rect(wrX + 6 + i * 10, wrY + 50 + i * 45, 10, 3).fill({ color: 0x888844 });
    }
    // Shield
    g.circle(wrX + 20, wrY + 170, 15).fill({ color: 0x8b1a1a });
    g.circle(wrX + 20, wrY + 170, 12).fill({ color: 0xaa2222 });
    g.circle(wrX + 20, wrY + 170, 4).fill({ color: 0xccaa44 });

    // Armor stand in corner
    const asX = rx + ROOM_W - WALL_THICK - 40;
    const asY = ry + ROOM_H - WALL_THICK - 80;
    // Stand pole
    g.rect(asX + 12, asY + 15, 4, 50).fill({ color: 0x5a3a1a });
    g.rect(asX, asY + 60, 28, 5).fill({ color: 0x5a3a1a }); // base
    // Head
    g.circle(asX + 14, asY + 8, 8).fill({ color: 0x888888 });
    // Shoulders/torso
    g.rect(asX - 2, asY + 15, 32, 20).fill({ color: 0x777777 });
    // Arms
    g.rect(asX - 10, asY + 15, 10, 4).fill({ color: 0x5a3a1a });
    g.rect(asX + 28, asY + 15, 10, 4).fill({ color: 0x5a3a1a });

    // Training dummy
    const tdX = rx + 250;
    const tdY = ry + 200;
    g.rect(tdX - 2, tdY + 10, 4, 40).fill({ color: 0x5a3a1a }); // pole
    g.circle(tdX, tdY, 10).fill({ color: 0xbbaa88 }); // head
    g.rect(tdX - 20, tdY + 15, 40, 4).fill({ color: 0x5a3a1a }); // crossbar
    g.rect(tdX - 15, tdY + 22, 30, 20).fill({ color: 0xbbaa88 }); // body

    // Table with maps
    const tmX = rx + 200;
    const tmY = ry + 320;
    g.rect(tmX, tmY, 80, 50).fill({ color: 0x5a3a1a });
    g.rect(tmX + 5, tmY + 5, 70, 40).fill({ color: 0x704828 });
    // Map (tan paper with lines)
    g.rect(tmX + 10, tmY + 8, 40, 30).fill({ color: 0xddcc99 });
    for (let i = 0; i < 4; i++) {
      g.rect(tmX + 15, tmY + 13 + i * 6, 30, 1).fill({ color: 0x555555, alpha: 0.5 });
    }
  }

  // ── Stable ───────────────────────────────────────────────────────────────

  private drawStable(g: Graphics, rx: number, ry: number): void {
    // Dirt/hay floor
    this.drawFloor(g, rx, ry, 0x8b7355);
    // Hay patches
    const hayColors = [0xccaa44, 0xddbb55, 0xbbaa33];
    for (let i = 0; i < 15; i++) {
      const hx = rx + 30 + (i * 97) % (ROOM_W - 60);
      const hy = ry + 30 + ((i * 73) % (ROOM_H - 60));
      g.rect(hx, hy, 20 + (i % 3) * 10, 15 + (i % 2) * 8).fill({ color: hayColors[i % 3], alpha: 0.4 });
    }

    // Wooden walls
    this.drawWalls(g, rx, ry, 0x6b4226);

    // 4 horse stalls along back
    const stallW = (ROOM_W - 2 * WALL_THICK) / 4;
    for (let i = 0; i < 4; i++) {
      const sx = rx + WALL_THICK + i * stallW;
      const sy = ry + WALL_THICK;
      // Stall divider
      if (i > 0) {
        g.rect(sx, sy, 4, 120).fill({ color: 0x5a3a1a });
      }
      // Stall back
      g.rect(sx, sy, stallW, 4).fill({ color: 0x5a3a1a });
      // Stall floor (darker)
      g.rect(sx + 2, sy + 4, stallW - 4, 116).fill({ color: 0x7a6345, alpha: 0.3 });
      // Hay in stall
      g.rect(sx + 10, sy + 80, stallW - 20, 30).fill({ color: 0xccaa44, alpha: 0.5 });
    }

    // Saddle rack on left (wooden X shape)
    const srX = rx + WALL_THICK + 15;
    const srY = ry + 180;
    g.moveTo(srX, srY);
    g.lineTo(srX + 30, srY + 40);
    g.lineTo(srX + 30, srY + 38);
    g.lineTo(srX + 2, srY);
    g.fill({ color: 0x5a3a1a });
    g.moveTo(srX + 30, srY);
    g.lineTo(srX, srY + 40);
    g.lineTo(srX + 2, srY + 40);
    g.lineTo(srX + 30, srY + 2);
    g.fill({ color: 0x5a3a1a });
    // Saddle arc on top
    g.moveTo(srX + 5, srY + 10);
    g.arc(srX + 15, srY + 5, 12, Math.PI, 0);
    g.fill({ color: 0x704828 });

    // Feed trough
    g.rect(rx + 200, ry + 250, 120, 25).fill({ color: 0x5a3a1a });
    g.rect(rx + 204, ry + 254, 112, 17).fill({ color: 0x558833, alpha: 0.6 });

    // Hay bales in corner
    const hbX = rx + ROOM_W - WALL_THICK - 70;
    const hbY = ry + ROOM_H - WALL_THICK - 80;
    g.rect(hbX, hbY, 55, 30).fill({ color: 0xccaa44 });
    g.rect(hbX, hbY + 32, 55, 30).fill({ color: 0xbbaa33 });
    g.rect(hbX + 10, hbY - 28, 40, 28).fill({ color: 0xddbb55 });
    // Hay texture lines
    for (let i = 0; i < 3; i++) {
      g.rect(hbX + 5, hbY + 5 + i * 8, 45, 1).fill({ color: 0xaa8822 });
      g.rect(hbX + 5, hbY + 37 + i * 8, 45, 1).fill({ color: 0xaa8822 });
    }

    // Pitchfork leaning on wall
    const pfX = rx + ROOM_W - WALL_THICK - 15;
    const pfY = ry + 160;
    g.rect(pfX, pfY, 3, 80).fill({ color: 0x5a3a1a });
    // Prongs
    g.rect(pfX - 5, pfY, 2, 15).fill({ color: 0x888888 });
    g.rect(pfX + 1, pfY - 3, 2, 18).fill({ color: 0x888888 });
    g.rect(pfX + 5, pfY, 2, 15).fill({ color: 0x888888 });

    // Rope coils
    g.circle(rx + WALL_THICK + 15, ry + ROOM_H - WALL_THICK - 25, 12).stroke({ color: 0x8b7355, width: 3 });
    g.circle(rx + WALL_THICK + 15, ry + ROOM_H - WALL_THICK - 25, 7).stroke({ color: 0x8b7355, width: 2 });
  }

  // ── Generic fallback room ────────────────────────────────────────────────

  private drawGenericRoom(g: Graphics, rx: number, ry: number): void {
    this.drawFloor(g, rx, ry, 0x888877);
    this.drawWalls(g, rx, ry, 0x666655);
  }
}
