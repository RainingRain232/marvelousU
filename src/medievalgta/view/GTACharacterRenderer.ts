// ---------------------------------------------------------------------------
// GTACharacterRenderer — procedural top-down rendering of player, NPCs,
// horses, and ground items. Depth-sorted by Y position.
// Now with much more visual detail: clothing, facial features, accessories,
// different body types, and improved animations.
// ---------------------------------------------------------------------------

import { Container, Graphics, Text, TextStyle } from "pixi.js";
import type {
  MedievalGTAState, GTAPlayer, GTANPC, GTAHorse, GTAItem, GTAProjectile,
} from "../state/MedievalGTAState";

// Palette lookup for NPC types — expanded with cloak, shoe, hair colors
const NPC_PALETTES: Record<string, {
  body: number; accent: number; head: number; extra?: number;
  cloak?: number; shoes?: number; hair?: number; belt?: number;
}> = {
  guard:              { body: 0xCC2222, accent: 0x888888, head: 0xDDB088, cloak: 0x992222, shoes: 0x444444, hair: 0x5C3A1E, belt: 0x6B4226 },
  knight:             { body: 0xCCCCCC, accent: 0xCC2222, head: 0xDDB088, cloak: 0xCC2222, shoes: 0x555555, hair: 0x3A2510, belt: 0x888888 },
  archer_guard:       { body: 0x336633, accent: 0x6B4226, head: 0xDDB088, cloak: 0x2A5528, shoes: 0x5C3A1E, hair: 0x8B6914, belt: 0x5C3A1E },
  army_soldier:       { body: 0x884422, accent: 0x666666, head: 0xDDB088, cloak: 0x773311, shoes: 0x444444, hair: 0x333333, belt: 0x555555 },
  civilian_m:         { body: 0x8B7355, accent: 0x6B4226, head: 0xDDB088, shoes: 0x5C3A1E, hair: 0x5C3A1E, belt: 0x6B4226 },
  civilian_f:         { body: 0x6688BB, accent: 0xCC6688, head: 0xDDB088, shoes: 0x6B4226, hair: 0x8B4513, belt: 0xCC6688 },
  merchant:           { body: 0xBB8833, accent: 0xDAA520, head: 0xDDB088, extra: 0x6B4226, shoes: 0x5C3A1E, hair: 0x4A3520, belt: 0xDAA520 },
  blacksmith_npc:     { body: 0x555555, accent: 0x333333, head: 0xDDB088, shoes: 0x333333, hair: 0x222222, belt: 0x444444 },
  priest:             { body: 0xEEDDCC, accent: 0xDAA520, head: 0xDDB088, shoes: 0x5C3A1E, hair: 0x888888, belt: 0xDAA520 },
  bard:               { body: 0xCC44CC, accent: 0x44CCCC, head: 0xDDB088, shoes: 0x6B4226, hair: 0xBB6644, belt: 0xDAA520 },
  tavern_keeper:      { body: 0x886644, accent: 0xEEDDCC, head: 0xDDB088, shoes: 0x5C3A1E, hair: 0x8B4513, belt: 0x6B4226 },
  stable_master:      { body: 0x6B4226, accent: 0x8B6914, head: 0xDDB088, shoes: 0x5C3A1E, hair: 0x5C3A1E, belt: 0x8B6914 },
  criminal:           { body: 0x333333, accent: 0x222222, head: 0x998877, cloak: 0x1A1A1A, shoes: 0x222222, hair: 0x222222, belt: 0x333333 },
  bandit:             { body: 0x443322, accent: 0x222211, head: 0x887766, cloak: 0x332211, shoes: 0x332211, hair: 0x443322, belt: 0x332211 },
};

// Color variants for civilians
const CIVILIAN_M_COLORS = [0x8B7355, 0x558855, 0x777777, 0xAA8855, 0x6B5544, 0x7A6655];
const CIVILIAN_F_COLORS = [0x6688BB, 0xCC4455, 0x8855AA, 0x55AA66, 0xBB7788, 0x6699AA];
const CIVILIAN_M_HAIR = [0x5C3A1E, 0x333333, 0x8B6914, 0xAA6633, 0x222222, 0x884422];
const CIVILIAN_F_HAIR = [0x8B4513, 0xBB6644, 0x5C3A1E, 0x333333, 0xCC8855, 0xDAA520];

const HORSE_COLORS: Record<string, number> = {
  brown: 0x8B4513,
  black: 0x333333,
  white: 0xEEEEDD,
  grey: 0x888888,
};

export class GTACharacterRenderer {
  readonly container = new Container();

  private gfx = new Graphics();
  private markerContainer = new Container();

  init(): void {
    this.container.removeChildren();
    this.gfx = new Graphics();
    this.markerContainer = new Container();
    this.container.addChild(this.gfx);
    this.container.addChild(this.markerContainer);
  }

  update(state: MedievalGTAState): void {
    this.gfx.clear();
    this.markerContainer.removeChildren();

    // Collect all renderable entities for depth sorting
    type RenderEntry = { y: number; draw: () => void };
    const entries: RenderEntry[] = [];

    // Player
    const p = state.player;
    if (p.state !== 'dead') {
      entries.push({ y: p.pos.y, draw: () => this.drawPlayer(p, state) });
    } else {
      entries.push({ y: p.pos.y, draw: () => this.drawDeadPlayer(p) });
    }

    // NPCs
    state.npcs.forEach((npc) => {
      entries.push({ y: npc.pos.y, draw: () => this.drawNPC(npc, state) });
    });

    // Horses (only those not currently ridden)
    state.horses.forEach((horse) => {
      if (horse.state !== 'ridden_by_player' && horse.state !== 'ridden_by_npc') {
        entries.push({ y: horse.pos.y, draw: () => this.drawHorse(horse, state) });
      }
    });

    // Items
    for (const item of state.items) {
      if (!item.collected) {
        entries.push({ y: item.pos.y, draw: () => this.drawItem(item, state) });
      }
    }

    // Projectiles (arrows)
    if (state.projectiles) {
      for (const proj of state.projectiles) {
        entries.push({ y: proj.pos.y, draw: () => this.drawProjectile(proj) });
      }
    }

    // Sort by Y (further up = drawn first = behind)
    entries.sort((a, b) => a.y - b.y);

    for (const e of entries) {
      e.draw();
    }
  }

  // ===================== PLAYER =====================
  private drawPlayer(p: GTAPlayer, state: MedievalGTAState): void {
    const g = this.gfx;
    const px = p.pos.x, py = p.pos.y;
    const facing = p.facing;
    const dx = Math.cos(facing);
    const dy = Math.sin(facing);
    const tick = state.tick;

    // Walk bob animation
    const isMoving = p.state === 'walking' || p.state === 'running';
    const bobPhase = isMoving ? Math.sin(tick * 0.2) * 1.5 : 0;
    const armSwing = isMoving ? Math.sin(tick * 0.2) * 0.3 : 0;

    // If on horse, draw horse body underneath first
    if (p.onHorse && p.mountedHorseId) {
      const horse = state.horses.get(p.mountedHorseId);
      if (horse) {
        this.drawHorseBody(g, px, py, facing, HORSE_COLORS[horse.color] ?? 0x8B4513, true);
      }
    }

    // Shadow
    g.ellipse(px, py + 10, p.onHorse ? 16 : 10, 5).fill({ color: 0x000000, alpha: 0.3 });

    // Feet/shoes (drawn first, behind body)
    const perpDx = Math.cos(facing + Math.PI / 2);
    const perpDy = Math.sin(facing + Math.PI / 2);
    const footOffset = isMoving ? Math.sin(tick * 0.2) * 3 : 0;
    // Left foot
    g.ellipse(
      px + perpDx * 3 + dx * (-2 + footOffset),
      py + perpDy * 3 + dy * (-2 + footOffset) + 6,
      2.5, 2
    ).fill({ color: 0x5C3A1E });
    // Right foot
    g.ellipse(
      px - perpDx * 3 + dx * (-2 - footOffset),
      py - perpDy * 3 + dy * (-2 - footOffset) + 6,
      2.5, 2
    ).fill({ color: 0x5C3A1E });

    // Cloak (drawn behind the body)
    if (!p.onHorse) {
      const cloakFlutter = isMoving ? Math.sin(tick * 0.15) * 2 : 0;
      g.poly([
        px - perpDx * 5 - dx * 3, py - perpDy * 5 - dy * 3 - 2,
        px + perpDx * 5 - dx * 3, py + perpDy * 5 - dy * 3 - 2,
        px + perpDx * 6 - dx * 10 + cloakFlutter, py + perpDy * 6 - dy * 10 + 4,
        px - perpDx * 6 - dx * 10 - cloakFlutter, py - perpDy * 6 - dy * 10 + 4,
      ]).fill({ color: 0x1A2266, alpha: 0.7 });
    }

    // Body (blue tunic with detail)
    g.ellipse(px, py + bobPhase * 0.3, 8, 10).fill({ color: 0x2244AA });
    // Tunic decorative trim lines
    g.ellipse(px, py + bobPhase * 0.3, 8, 10).stroke({ color: 0xDAA520, width: 1.2 });
    // Tunic chest detail - gold embroidery
    g.moveTo(px - 2, py - 5).lineTo(px, py - 7).lineTo(px + 2, py - 5).stroke({ color: 0xDAA520, width: 0.8 });
    g.moveTo(px - 3, py - 3).lineTo(px, py - 5).lineTo(px + 3, py - 3).stroke({ color: 0xDAA520, width: 0.8 });

    // Belt with buckle
    g.ellipse(px, py + 3, 8, 2.5).fill({ color: 0x5C3A1E });
    // Belt buckle
    g.rect(px - 2, py + 1.5, 4, 3).fill({ color: 0xDAA520 });
    g.rect(px - 1, py + 2, 2, 1.5).fill({ color: 0xBB8811 });

    // Pouch on belt
    g.roundRect(px + perpDx * 6, py + perpDy * 6 + 2, 4, 5, 1).fill({ color: 0x6B4226 });
    g.roundRect(px + perpDx * 6, py + perpDy * 6 + 2, 4, 5, 1).stroke({ color: 0x4A2810, width: 0.5 });

    // Arms with sleeves
    const armAngle1 = facing + Math.PI / 2;
    const armAngle2 = facing - Math.PI / 2;
    const arm1X = px + Math.cos(armAngle1) * 8;
    const arm1Y = py + Math.sin(armAngle1) * 8 - 1 + armSwing * 3;
    const arm2X = px + Math.cos(armAngle2) * 8;
    const arm2Y = py + Math.sin(armAngle2) * 8 - 1 - armSwing * 3;
    // Sleeve (tunic color)
    g.circle(arm1X, arm1Y, 3).fill({ color: 0x2244AA });
    g.circle(arm2X, arm2Y, 3).fill({ color: 0x2244AA });
    // Hands (skin color)
    g.circle(arm1X + dx * 2, arm1Y + dy * 2, 2).fill({ color: 0xDDB088 });
    g.circle(arm2X + dx * 2, arm2Y + dy * 2, 2).fill({ color: 0xDDB088 });

    // Head (offset in facing direction)
    const headX = px + dx * 5;
    const headY = py + dy * 5 - 7 + bobPhase * 0.2;
    // Neck
    g.ellipse(headX - dx * 1, headY - dy * 1 + 3, 2, 2.5).fill({ color: 0xDDB088 });
    // Head shape
    g.circle(headX, headY, 4.5).fill({ color: 0xDDB088 });
    // Hair (dark brown, back of head)
    g.circle(headX - dx * 2, headY - 1.5, 4.5).fill({ color: 0x4A2510, alpha: 0.8 });
    // Hair top
    g.ellipse(headX - dx * 0.5, headY - 3, 3.5, 2).fill({ color: 0x4A2510, alpha: 0.7 });
    // Eyes (two small dots in facing direction)
    const eyeOffX = perpDx * 1.5;
    const eyeOffY = perpDy * 1.5;
    g.circle(headX + dx * 2.5 + eyeOffX, headY + dy * 2.5 + eyeOffY - 0.5, 0.8).fill({ color: 0x222222 });
    g.circle(headX + dx * 2.5 - eyeOffX, headY + dy * 2.5 - eyeOffY - 0.5, 0.8).fill({ color: 0x222222 });
    // Nose hint
    g.circle(headX + dx * 3.5, headY + dy * 3.5 - 0.3, 0.6).fill({ color: 0xCC9977 });

    // Weapon rendering
    if (p.weapon === 'sword') {
      let swingAngle = facing;
      if (p.attackTimer > 0) {
        const swingProgress = 1 - p.attackTimer / 0.2;
        swingAngle = facing - Math.PI / 3 + swingProgress * (Math.PI * 2 / 3);
      }
      const swordDx = Math.cos(swingAngle);
      const swordDy = Math.sin(swingAngle);
      // Sword blade with gradient-like effect
      g.moveTo(px + swordDx * 7, py + swordDy * 7 - 2)
        .lineTo(px + swordDx * 22, py + swordDy * 22 - 2)
        .stroke({ color: 0xDDDDDD, width: 2.5 });
      // Blade edge highlight
      g.moveTo(px + swordDx * 8, py + swordDy * 8 - 3)
        .lineTo(px + swordDx * 20, py + swordDy * 20 - 3)
        .stroke({ color: 0xFFFFFF, width: 0.5, alpha: 0.5 });
      // Sword tip
      g.circle(px + swordDx * 22, py + swordDy * 22 - 2, 1).fill({ color: 0xEEEEEE });
      // Hilt crossguard
      const hiltPx = px + swordDx * 7;
      const hiltPy = py + swordDy * 7 - 2;
      const hPerpDx = Math.cos(swingAngle + Math.PI / 2);
      const hPerpDy = Math.sin(swingAngle + Math.PI / 2);
      g.moveTo(hiltPx + hPerpDx * 5, hiltPy + hPerpDy * 5)
        .lineTo(hiltPx - hPerpDx * 5, hiltPy - hPerpDy * 5)
        .stroke({ color: 0x8B6914, width: 2.5 });
      // Grip
      g.moveTo(hiltPx - swordDx * 1, hiltPy - swordDy * 1)
        .lineTo(hiltPx - swordDx * 5, hiltPy - swordDy * 5)
        .stroke({ color: 0x5C3A1E, width: 2 });
      // Pommel
      g.circle(hiltPx - swordDx * 5, hiltPy - swordDy * 5, 2).fill({ color: 0xDAA520 });
    } else if (p.weapon === 'bow') {
      const bowCx = px - dx * 2;
      const bowCy = py - dy * 2 - 2;
      const bowAngle = facing + Math.PI / 2;
      // Bow arc (thicker, more detailed)
      g.moveTo(bowCx + Math.cos(bowAngle - 0.8) * 11, bowCy + Math.sin(bowAngle - 0.8) * 11)
        .arc(bowCx, bowCy, 11, bowAngle - 0.8, bowAngle + 0.8)
        .stroke({ color: 0x6B4226, width: 2.5 });
      // Bow limb tips
      g.circle(bowCx + Math.cos(bowAngle - 0.8) * 11, bowCy + Math.sin(bowAngle - 0.8) * 11, 1).fill({ color: 0x8B6914 });
      g.circle(bowCx + Math.cos(bowAngle + 0.8) * 11, bowCy + Math.sin(bowAngle + 0.8) * 11, 1).fill({ color: 0x8B6914 });
      // String
      g.moveTo(bowCx + Math.cos(bowAngle - 0.8) * 11, bowCy + Math.sin(bowAngle - 0.8) * 11)
        .lineTo(bowCx + Math.cos(bowAngle + 0.8) * 11, bowCy + Math.sin(bowAngle + 0.8) * 11)
        .stroke({ color: 0xAA9966, width: 0.8 });
      // Quiver on back
      g.roundRect(px - dx * 6 - 3, py - dy * 6 - 9, 5, 12, 1).fill({ color: 0x6B4226 });
      g.roundRect(px - dx * 6 - 3, py - dy * 6 - 9, 5, 12, 1).stroke({ color: 0x4A2810, width: 0.5 });
      // Arrow tips poking out
      for (let ai = 0; ai < 3; ai++) {
        g.moveTo(px - dx * 6 - 1 + ai * 1.5, py - dy * 6 - 9)
          .lineTo(px - dx * 6 - 1 + ai * 1.5, py - dy * 6 - 13)
          .stroke({ color: 0x888888, width: 0.8 });
      }
    }

    // Quiver on back if player has bow but using different weapon
    if (p.weapon !== 'bow' && p.hasBow) {
      g.roundRect(px - dx * 6 - 3, py - dy * 6 - 9, 5, 12, 1).fill({ color: 0x6B4226 });
      g.roundRect(px - dx * 6 - 3, py - dy * 6 - 9, 5, 12, 1).stroke({ color: 0x4A2810, width: 0.5 });
      for (let ai = 0; ai < 3; ai++) {
        g.moveTo(px - dx * 6 - 1 + ai * 1.5, py - dy * 6 - 9)
          .lineTo(px - dx * 6 - 1 + ai * 1.5, py - dy * 6 - 13)
          .stroke({ color: 0x888888, width: 0.8 });
      }
    }

    // Invincibility flash
    if (p.invincibleTimer > 0 && Math.floor(tick * 0.3) % 2 === 0) {
      g.ellipse(px, py, 11, 13).fill({ color: 0xFFFFFF, alpha: 0.25 });
    }

    // Rolling visual
    if (p.state === 'rolling') {
      g.circle(px, py, 14).stroke({ color: 0xFFFFFF, width: 1.5, alpha: 0.4 });
      // Dust puff
      for (let di = 0; di < 3; di++) {
        const da = facing + Math.PI + (di - 1) * 0.5;
        g.circle(px + Math.cos(da) * 12, py + Math.sin(da) * 12, 3 + di).fill({ color: 0xBBAA88, alpha: 0.2 });
      }
    }
  }

  private drawDeadPlayer(p: GTAPlayer): void {
    const g = this.gfx;
    const px = p.pos.x, py = p.pos.y;
    // Flattened body
    g.ellipse(px, py, 12, 5).fill({ color: 0x1a2255, alpha: 0.6 });
    // Head
    g.circle(px + 9, py, 3.5).fill({ color: 0xAA8866, alpha: 0.5 });
    // Arm sprawled
    g.ellipse(px - 6, py + 4, 4, 2).fill({ color: 0xDDB088, alpha: 0.4 });
    // Sword on ground
    g.moveTo(px + 3, py + 5).lineTo(px + 15, py + 8).stroke({ color: 0x999999, width: 1.5, alpha: 0.4 });
  }

  // ===================== NPC =====================
  private drawNPC(npc: GTANPC, state: MedievalGTAState): void {
    const g = this.gfx;
    const px = npc.pos.x, py = npc.pos.y;
    const tick = state.tick;

    if (npc.dead) {
      const alpha = Math.max(0.1, Math.min(0.8, npc.deathTimer / 3));
      g.ellipse(px, py, 10, 4).fill({ color: 0x553333, alpha });
      g.circle(px + 7, py, 3).fill({ color: 0xAA8866, alpha: alpha * 0.7 });
      // Blood pool slowly spreading
      g.ellipse(px - 2, py + 1, 6 * (1 - alpha), 3 * (1 - alpha)).fill({ color: 0x881111, alpha: alpha * 0.5 });
      return;
    }

    const facing = npc.facing;
    const fdx = Math.cos(facing);
    const fdy = Math.sin(facing);
    const perpDx = Math.cos(facing + Math.PI / 2);
    const perpDy = Math.sin(facing + Math.PI / 2);

    // Resolve palette
    let palette = NPC_PALETTES[npc.type] ?? NPC_PALETTES.civilian_m;
    let hairColor = palette.hair ?? 0x5C3A1E;

    // Apply color variant for civilians
    if (npc.type === 'civilian_m') {
      palette = { ...palette, body: CIVILIAN_M_COLORS[npc.colorVariant % CIVILIAN_M_COLORS.length] };
      hairColor = CIVILIAN_M_HAIR[npc.colorVariant % CIVILIAN_M_HAIR.length];
    } else if (npc.type === 'civilian_f') {
      palette = { ...palette, body: CIVILIAN_F_COLORS[npc.colorVariant % CIVILIAN_F_COLORS.length] };
      hairColor = CIVILIAN_F_HAIR[npc.colorVariant % CIVILIAN_F_HAIR.length];
    }

    // Movement animation
    const speed = Math.sqrt(npc.vel.x * npc.vel.x + npc.vel.y * npc.vel.y);
    const isMoving = speed > 5;
    const bobPhase = isMoving ? Math.sin(tick * 0.18 + npc.pos.x * 0.1) * 1.2 : 0;
    const armSwing = isMoving ? Math.sin(tick * 0.18 + npc.pos.x * 0.1) * 0.25 : 0;
    const footOffset = isMoving ? Math.sin(tick * 0.18 + npc.pos.x * 0.1) * 2.5 : 0;

    // Shadow
    g.ellipse(px, py + 8, 8, 4).fill({ color: 0x000000, alpha: 0.22 });

    const isFemale = npc.type === 'civilian_f';
    const isPriest = npc.type === 'priest';
    const isKnight = npc.type === 'knight';
    const isTavernKeeper = npc.type === 'tavern_keeper';
    const isBlacksmith = npc.type === 'blacksmith_npc';
    const isBard = npc.type === 'bard';
    const isCriminal = npc.type === 'criminal' || npc.type === 'bandit';
    const isMerchant = npc.type === 'merchant';
    const isStableMaster = npc.type === 'stable_master';
    const isGuard = npc.type === 'guard' || npc.type === 'army_soldier';
    const isArcher = npc.type === 'archer_guard';

    // Shoes/feet
    const shoeColor = palette.shoes ?? 0x5C3A1E;
    g.ellipse(px + perpDx * 2.5 + fdx * (-1 + footOffset), py + perpDy * 2.5 + fdy * (-1 + footOffset) + 7, 2, 1.5).fill({ color: shoeColor });
    g.ellipse(px - perpDx * 2.5 + fdx * (-1 - footOffset), py - perpDy * 2.5 + fdy * (-1 - footOffset) + 7, 2, 1.5).fill({ color: shoeColor });

    // Draw cloak behind for cloaked NPCs
    if (palette.cloak && (isCriminal || isKnight || isArcher)) {
      const cloakFlutter = isMoving ? Math.sin(tick * 0.12 + npc.pos.y) * 2 : 0;
      g.poly([
        px - perpDx * 5 - fdx * 2, py - perpDy * 5 - fdy * 2 - 1,
        px + perpDx * 5 - fdx * 2, py + perpDy * 5 - fdy * 2 - 1,
        px + perpDx * 6 - fdx * 9 + cloakFlutter, py + perpDy * 6 - fdy * 9 + 5,
        px - perpDx * 6 - fdx * 9 - cloakFlutter, py - perpDy * 6 - fdy * 9 + 5,
      ]).fill({ color: palette.cloak, alpha: 0.6 });
    }

    // ---- Body shape per type ----
    if (isFemale) {
      // Dress body - narrower top, wider bottom
      g.ellipse(px, py + 3, 8, 10).fill({ color: palette.body });
      g.ellipse(px, py - 3, 6, 5).fill({ color: palette.body });
      // Dress trim at bottom
      g.ellipse(px, py + 9, 9, 2.5).fill({ color: palette.accent, alpha: 0.7 });
      // Lace/pattern detail on dress
      g.ellipse(px, py - 1, 5, 3).fill({ color: lighten(palette.body, 0.15), alpha: 0.4 });
      // Belt/sash
      g.ellipse(px, py + 1, 7, 2).fill({ color: palette.belt ?? palette.accent });
    } else if (isPriest) {
      // Long white robe
      g.ellipse(px, py + 2, 7, 12).fill({ color: palette.body });
      g.ellipse(px, py + 2, 7, 12).stroke({ color: 0xCCBB99, width: 0.5 });
      // Gold sash
      g.ellipse(px, py, 7, 2).fill({ color: 0xDAA520 });
      // Cross on chest
      g.rect(px - 1, py - 4, 2, 7).fill({ color: 0xDAA520 });
      g.rect(px - 3, py - 2, 6, 2).fill({ color: 0xDAA520 });
      // Robe hem detail
      g.ellipse(px, py + 10, 7, 2).fill({ color: 0xDAA520, alpha: 0.5 });
    } else if (isKnight) {
      // Large armored body
      g.ellipse(px, py, 9, 11).fill({ color: palette.body });
      g.ellipse(px, py, 9, 11).stroke({ color: 0x999999, width: 1.5 });
      // Chainmail texture (horizontal lines)
      for (let cy = py - 7; cy < py + 7; cy += 3) {
        g.moveTo(px - 6, cy).lineTo(px + 6, cy).stroke({ color: 0xAAAAAA, width: 0.5, alpha: 0.3 });
      }
      // Shoulder plates
      g.ellipse(px - 8, py - 3, 4, 3).fill({ color: 0xAAAAAA });
      g.ellipse(px - 8, py - 3, 4, 3).stroke({ color: 0x888888, width: 0.5 });
      g.ellipse(px + 8, py - 3, 4, 3).fill({ color: 0xAAAAAA });
      g.ellipse(px + 8, py - 3, 4, 3).stroke({ color: 0x888888, width: 0.5 });
      // Tabard (red over armor)
      g.rect(px - 4, py - 4, 8, 12).fill({ color: 0xCC2222, alpha: 0.7 });
      // Gold cross on tabard
      g.rect(px - 0.5, py - 3, 1, 8).fill({ color: 0xDAA520 });
      g.rect(px - 3, py, 6, 1).fill({ color: 0xDAA520 });
      // Belt
      g.ellipse(px, py + 4, 8, 2).fill({ color: 0x888888 });
    } else if (isTavernKeeper) {
      // Wider/rotund body
      g.ellipse(px, py, 9, 11).fill({ color: palette.body });
      // White apron
      g.ellipse(px, py + 4, 7, 8).fill({ color: palette.accent, alpha: 0.8 });
      // Apron strings
      g.moveTo(px - 5, py + 1).lineTo(px - 7, py + 3).stroke({ color: 0xCCBBAA, width: 1 });
      g.moveTo(px + 5, py + 1).lineTo(px + 7, py + 3).stroke({ color: 0xCCBBAA, width: 1 });
      // Belt
      g.ellipse(px, py + 1, 8, 2).fill({ color: palette.belt ?? 0x6B4226 });
    } else if (isBlacksmith) {
      // Stocky build
      g.ellipse(px, py, 8, 10).fill({ color: palette.body });
      // Dark leather apron
      g.ellipse(px, py + 3, 7, 7).fill({ color: palette.accent });
      // Apron straps
      g.moveTo(px - 4, py - 5).lineTo(px - 5, py + 3).stroke({ color: 0x222222, width: 1.5 });
      g.moveTo(px + 4, py - 5).lineTo(px + 5, py + 3).stroke({ color: 0x222222, width: 1.5 });
      // Muscular arms (thicker)
      g.circle(px + perpDx * 8, py + perpDy * 8 - 1, 3.5).fill({ color: 0xDDB088 });
      g.circle(px - perpDx * 8, py - perpDy * 8 - 1, 3.5).fill({ color: 0xDDB088 });
      // Belt
      g.ellipse(px, py + 2, 7, 2).fill({ color: palette.belt ?? 0x444444 });
    } else if (isBard) {
      // Two-toned body (jester-like)
      g.ellipse(px - 2, py, 5, 9).fill({ color: palette.body });
      g.ellipse(px + 2, py, 5, 9).fill({ color: palette.accent });
      // Fancy collar
      g.ellipse(px, py - 6, 5, 2).fill({ color: 0xDAA520 });
      // Lute shape on back - more detailed
      g.ellipse(px - fdx * 7, py - fdy * 7, 5, 7).fill({ color: 0x8B6914 });
      g.ellipse(px - fdx * 7, py - fdy * 7, 5, 7).stroke({ color: 0x6B4226, width: 0.5 });
      // Lute neck
      g.moveTo(px - fdx * 7, py - fdy * 7 - 7).lineTo(px - fdx * 7, py - fdy * 7 - 14).stroke({ color: 0x8B6914, width: 1.5 });
      // Strings
      g.moveTo(px - fdx * 7 - 1, py - fdy * 7 - 3).lineTo(px - fdx * 7 - 1, py - fdy * 7 - 13).stroke({ color: 0xCCBB88, width: 0.3 });
      g.moveTo(px - fdx * 7 + 1, py - fdy * 7 - 3).lineTo(px - fdx * 7 + 1, py - fdy * 7 - 13).stroke({ color: 0xCCBB88, width: 0.3 });
      // Belt with bells
      g.ellipse(px, py + 2, 6, 2).fill({ color: 0xDAA520 });
      g.circle(px - 3, py + 3, 1).fill({ color: 0xFFDD00 });
      g.circle(px + 3, py + 3, 1).fill({ color: 0xFFDD00 });
    } else if (isCriminal) {
      // Slim, hooded figure
      g.ellipse(px, py, 6, 9).fill({ color: palette.body });
      // Dark belt with hidden dagger
      g.ellipse(px, py + 2, 6, 2).fill({ color: palette.belt ?? 0x333333 });
      // Dagger tucked in belt
      g.moveTo(px + 4, py + 1).lineTo(px + 8, py - 3).stroke({ color: 0x888888, width: 1 });
    } else if (isMerchant) {
      // Rounder body, well-fed
      g.ellipse(px, py, 8, 10).fill({ color: palette.body });
      // Rich fabric vest
      g.ellipse(px, py - 1, 6, 6).fill({ color: darken(palette.body, 0.15) });
      // Gold chain/necklace
      g.ellipse(px, py - 5, 4, 1.5).stroke({ color: 0xDAA520, width: 0.8 });
      // Money pouch (prominent)
      g.roundRect(px + perpDx * 7, py + perpDy * 7, 5, 6, 1.5).fill({ color: 0x8B6914 });
      g.roundRect(px + perpDx * 7, py + perpDy * 7, 5, 6, 1.5).stroke({ color: 0x6B4226, width: 0.5 });
      // Gold coins visible in pouch
      g.circle(px + perpDx * 7 + 2, py + perpDy * 7 + 1, 1).fill({ color: 0xFFDD00 });
      // Belt
      g.ellipse(px, py + 3, 7, 2).fill({ color: palette.belt ?? 0xDAA520 });
    } else if (isStableMaster) {
      g.ellipse(px, py, 7, 9).fill({ color: palette.body });
      // Rope coil on belt
      g.circle(px + perpDx * 7, py + perpDy * 7 + 1, 3).stroke({ color: 0xBBA855, width: 1.5 });
      // Belt
      g.ellipse(px, py + 2, 7, 2).fill({ color: palette.belt ?? 0x8B6914 });
    } else if (isGuard) {
      // Guard body with armor
      g.ellipse(px, py, 7, 10).fill({ color: palette.body });
      // Leather armor overlay
      g.ellipse(px, py - 1, 6, 6).fill({ color: darken(palette.body, 0.1) });
      // Belt
      g.ellipse(px, py + 3, 7, 2).fill({ color: palette.belt ?? 0x6B4226 });
    } else if (isArcher) {
      // Lean body
      g.ellipse(px, py, 6, 9).fill({ color: palette.body });
      // Quiver on back
      g.roundRect(px - fdx * 6 - 2, py - fdy * 6 - 8, 4, 12, 1).fill({ color: 0x6B4226 });
      for (let ai = 0; ai < 3; ai++) {
        g.moveTo(px - fdx * 6 - 1 + ai, py - fdy * 6 - 8)
          .lineTo(px - fdx * 6 - 1 + ai, py - fdy * 6 - 12)
          .stroke({ color: 0x888888, width: 0.5 });
      }
      // Belt
      g.ellipse(px, py + 2, 6, 2).fill({ color: palette.belt ?? 0x5C3A1E });
    } else {
      // Default body (civilian_m, etc.)
      g.ellipse(px, py, 7, 9).fill({ color: palette.body });
      // Simple tunic detail
      g.moveTo(px, py - 5).lineTo(px, py + 5).stroke({ color: darken(palette.body, 0.15), width: 0.5 });
      // Belt
      g.ellipse(px, py + 2, 7, 2).fill({ color: palette.belt ?? 0x6B4226 });
    }

    // ---- Arms (for types that don't draw custom arms) ----
    if (!isBlacksmith) {
      const armAngle1 = facing + Math.PI / 2;
      const armAngle2 = facing - Math.PI / 2;
      const a1x = px + Math.cos(armAngle1) * 7 + fdx * armSwing * 3;
      const a1y = py + Math.sin(armAngle1) * 7 + fdy * armSwing * 3 - 1;
      const a2x = px + Math.cos(armAngle2) * 7 - fdx * armSwing * 3;
      const a2y = py + Math.sin(armAngle2) * 7 - fdy * armSwing * 3 - 1;
      // Sleeve
      g.circle(a1x, a1y, 2.5).fill({ color: palette.body });
      g.circle(a2x, a2y, 2.5).fill({ color: palette.body });
      // Hands
      g.circle(a1x + fdx * 1.5, a1y + fdy * 1.5, 1.8).fill({ color: palette.head });
      g.circle(a2x + fdx * 1.5, a2y + fdy * 1.5, 1.8).fill({ color: palette.head });
    }

    // ---- Head ----
    const headX = px + fdx * 4;
    const headY = py + fdy * 4 - 6 + bobPhase * 0.15;

    // Neck
    g.ellipse(headX - fdx * 1, headY - fdy * 1 + 2.5, 1.8, 2).fill({ color: palette.head });

    // Head shape
    g.circle(headX, headY, 4).fill({ color: palette.head });

    // ---- Type-specific headgear and facial features ----
    if (isGuard || npc.type === 'army_soldier') {
      // Metal helmet
      g.circle(headX, headY, 4.5).fill({ color: 0x888888 });
      g.circle(headX, headY - 1, 4.5).fill({ color: 0x999999, alpha: 0.5 });
      // Nose guard
      g.rect(headX + fdx * 3 - 0.5, headY + fdy * 3 - 2, 1, 4).fill({ color: 0x777777 });
      // Eye slit
      g.rect(headX + fdx * 2 - 3, headY + fdy * 2 - 0.5, 6, 1.5).fill({ color: 0x222222 });
      // Shield on arm
      const shieldAngle = facing + Math.PI / 2;
      const sx = px + Math.cos(shieldAngle) * 8;
      const sy = py + Math.sin(shieldAngle) * 8;
      g.roundRect(sx - 5, sy - 6, 10, 12, 2).fill({ color: 0x884422 });
      g.roundRect(sx - 5, sy - 6, 10, 12, 2).stroke({ color: 0x666666, width: 1 });
      // Shield cross emblem
      g.moveTo(sx, sy - 6).lineTo(sx, sy + 6).stroke({ color: 0xDAA520, width: 1.2 });
      g.moveTo(sx - 5, sy).lineTo(sx + 5, sy).stroke({ color: 0xDAA520, width: 1.2 });
      // Shield boss (center circle)
      g.circle(sx, sy, 2).fill({ color: 0xDAA520 });
    } else if (isKnight) {
      // Full great helm
      g.circle(headX, headY, 5).fill({ color: 0xBBBBBB });
      g.circle(headX, headY, 5).stroke({ color: 0x999999, width: 0.5 });
      // Visor with breathing holes
      g.rect(headX + fdx * 2 - 3.5, headY + fdy * 2 - 1, 7, 2).fill({ color: 0x333333 });
      g.circle(headX + fdx * 3 - 2, headY + fdy * 3 + 1.5, 0.5).fill({ color: 0x333333 });
      g.circle(headX + fdx * 3, headY + fdy * 3 + 1.5, 0.5).fill({ color: 0x333333 });
      g.circle(headX + fdx * 3 + 2, headY + fdy * 3 + 1.5, 0.5).fill({ color: 0x333333 });
      // Red plume
      g.poly([headX, headY - 5, headX - 2.5, headY - 12, headX + 2.5, headY - 12]).fill({ color: 0xCC2222 });
      g.ellipse(headX, headY - 12, 4, 2).fill({ color: 0xCC2222 });
    } else if (isArcher) {
      // Green hood
      g.circle(headX, headY, 4.5).fill({ color: 0x336633 });
      // Hood point
      g.poly([headX - fdx * 3, headY - fdy * 3, headX - fdx * 3 - 2, headY - fdy * 3 - 5, headX - fdx * 3 + 2, headY - fdy * 3 - 3]).fill({ color: 0x2A5528 });
      // Face visible from front
      g.circle(headX + fdx * 1, headY + fdy * 1, 2.5).fill({ color: palette.head });
      // Eyes
      g.circle(headX + fdx * 2.5 + perpDx, headY + fdy * 2.5 + perpDy, 0.6).fill({ color: 0x222222 });
      g.circle(headX + fdx * 2.5 - perpDx, headY + fdy * 2.5 - perpDy, 0.6).fill({ color: 0x222222 });
      // Bow on back
      const bowAngle = facing + Math.PI;
      const bx = px + Math.cos(bowAngle) * 6;
      const by = py + Math.sin(bowAngle) * 6 - 3;
      g.moveTo(bx, by - 6).arc(bx + 3, by, 7, -Math.PI / 2, Math.PI / 2).stroke({ color: 0x6B4226, width: 1.5 });
    } else if (isCriminal) {
      // Dark hood covering most of face
      g.circle(headX, headY, 5).fill({ color: palette.accent });
      // Only eyes visible
      g.circle(headX + fdx * 2.5 + perpDx * 1.2, headY + fdy * 2.5 + perpDy * 1.2, 0.7).fill({ color: 0xBBBBAA });
      g.circle(headX + fdx * 2.5 - perpDx * 1.2, headY + fdy * 2.5 - perpDy * 1.2, 0.7).fill({ color: 0xBBBBAA });
      // Scarf covering lower face
      g.ellipse(headX + fdx * 1.5, headY + fdy * 1.5 + 1.5, 3, 2).fill({ color: 0x222222 });
    } else if (isMerchant) {
      // Hat (flat cap / beret)
      g.circle(headX, headY, 4).fill({ color: palette.head });
      // Hair
      g.circle(headX - fdx * 2, headY - 1.5, 4).fill({ color: hairColor, alpha: 0.6 });
      // Fancy hat
      g.ellipse(headX + fdx * 0.5, headY - 3, 5.5, 2.5).fill({ color: palette.extra ?? 0x6B4226 });
      g.circle(headX + fdx * 0.5, headY - 4, 4).fill({ color: palette.extra ?? 0x6B4226 });
      // Hat feather
      g.moveTo(headX + 3, headY - 5).lineTo(headX + 7, headY - 9).stroke({ color: 0xCC4444, width: 1 });
      // Face features
      g.circle(headX + fdx * 2.5 + perpDx, headY + fdy * 2.5 + perpDy - 0.3, 0.6).fill({ color: 0x222222 });
      g.circle(headX + fdx * 2.5 - perpDx, headY + fdy * 2.5 - perpDy - 0.3, 0.6).fill({ color: 0x222222 });
      // Mustache
      g.moveTo(headX + fdx * 3 - 2, headY + fdy * 3 + 1).lineTo(headX + fdx * 3 + 2, headY + fdy * 3 + 1).stroke({ color: hairColor, width: 1 });
    } else if (isStableMaster) {
      g.circle(headX, headY, 4).fill({ color: palette.head });
      // Hair
      g.circle(headX - fdx * 2, headY - 1, 4).fill({ color: hairColor, alpha: 0.6 });
      // Wide-brimmed hat
      g.ellipse(headX + fdx * 0.5, headY - 3, 7, 2.5).fill({ color: palette.accent });
      g.circle(headX + fdx * 0.5, headY - 4.5, 4).fill({ color: palette.accent });
      // Eyes
      g.circle(headX + fdx * 2.5 + perpDx, headY + fdy * 2.5 + perpDy - 0.3, 0.6).fill({ color: 0x222222 });
      g.circle(headX + fdx * 2.5 - perpDx, headY + fdy * 2.5 - perpDy - 0.3, 0.6).fill({ color: 0x222222 });
      // Stubble
      g.ellipse(headX + fdx * 2, headY + fdy * 2 + 1.5, 2, 1).fill({ color: hairColor, alpha: 0.3 });
    } else if (isPriest) {
      // Tonsure haircut
      g.circle(headX, headY, 4).fill({ color: palette.head });
      // Ring of hair around bald top
      g.circle(headX, headY, 4).stroke({ color: hairColor, width: 1.5 });
      g.circle(headX, headY - 0.5, 2.5).fill({ color: palette.head }); // bald spot
      // Kind eyes
      g.circle(headX + fdx * 2.5 + perpDx, headY + fdy * 2.5 + perpDy - 0.3, 0.6).fill({ color: 0x222222 });
      g.circle(headX + fdx * 2.5 - perpDx, headY + fdy * 2.5 - perpDy - 0.3, 0.6).fill({ color: 0x222222 });
    } else if (isBard) {
      g.circle(headX, headY, 4).fill({ color: palette.head });
      // Feathered cap
      g.ellipse(headX, headY - 3, 4, 2).fill({ color: 0xCC44CC });
      g.moveTo(headX + 2, headY - 4).lineTo(headX + 5, headY - 9).stroke({ color: 0x44CCCC, width: 1.5 });
      g.moveTo(headX + 5, headY - 9).lineTo(headX + 3, headY - 7).stroke({ color: 0x44CCCC, width: 1 });
      // Flowing hair
      g.circle(headX - fdx * 2, headY, 3.5).fill({ color: hairColor, alpha: 0.6 });
      // Smile
      g.moveTo(headX + fdx * 2 - 1.5, headY + fdy * 2 + 1.5).arc(headX + fdx * 2, headY + fdy * 2 + 1.5, 1.5, Math.PI * 0.1, Math.PI * 0.9).stroke({ color: 0x884444, width: 0.5 });
      // Eyes
      g.circle(headX + fdx * 2.5 + perpDx, headY + fdy * 2.5 + perpDy - 0.3, 0.6).fill({ color: 0x222222 });
      g.circle(headX + fdx * 2.5 - perpDx, headY + fdy * 2.5 - perpDy - 0.3, 0.6).fill({ color: 0x222222 });
    } else if (isTavernKeeper) {
      g.circle(headX, headY, 4).fill({ color: palette.head });
      // Balding with side hair
      g.circle(headX - fdx * 2 + perpDx * 2, headY + perpDy * 2 - 1, 2.5).fill({ color: hairColor, alpha: 0.5 });
      g.circle(headX - fdx * 2 - perpDx * 2, headY - perpDy * 2 - 1, 2.5).fill({ color: hairColor, alpha: 0.5 });
      // Ruddy cheeks
      g.circle(headX + fdx * 1 + perpDx * 2, headY + fdy * 1 + perpDy * 2, 1.5).fill({ color: 0xCC8888, alpha: 0.4 });
      g.circle(headX + fdx * 1 - perpDx * 2, headY + fdy * 1 - perpDy * 2, 1.5).fill({ color: 0xCC8888, alpha: 0.4 });
      // Eyes
      g.circle(headX + fdx * 2.5 + perpDx, headY + fdy * 2.5 + perpDy - 0.3, 0.6).fill({ color: 0x222222 });
      g.circle(headX + fdx * 2.5 - perpDx, headY + fdy * 2.5 - perpDy - 0.3, 0.6).fill({ color: 0x222222 });
      // Mustache
      g.moveTo(headX + fdx * 3 - 2.5, headY + fdy * 3 + 1).lineTo(headX + fdx * 3 + 2.5, headY + fdy * 3 + 1).stroke({ color: hairColor, width: 1.2 });
    } else if (isBlacksmith) {
      g.circle(headX, headY, 4).fill({ color: palette.head });
      // Short dark hair
      g.circle(headX - fdx * 1.5, headY - 1.5, 4).fill({ color: hairColor, alpha: 0.7 });
      // Soot smudges
      g.circle(headX + fdx * 1 + perpDx * 2, headY + fdy * 1 + perpDy * 2, 1).fill({ color: 0x333333, alpha: 0.3 });
      // Stern eyes
      g.circle(headX + fdx * 2.5 + perpDx, headY + fdy * 2.5 + perpDy - 0.3, 0.7).fill({ color: 0x222222 });
      g.circle(headX + fdx * 2.5 - perpDx, headY + fdy * 2.5 - perpDy - 0.3, 0.7).fill({ color: 0x222222 });
      // Furrowed brow
      g.moveTo(headX + fdx * 2 + perpDx * 2, headY + fdy * 2 + perpDy * 2 - 2).lineTo(headX + fdx * 2 + perpDx * 0.5, headY + fdy * 2 + perpDy * 0.5 - 2.5).stroke({ color: darken(palette.head, 0.15), width: 0.5 });
    } else if (isFemale) {
      g.circle(headX, headY, 4).fill({ color: palette.head });
      // Long flowing hair
      g.circle(headX - fdx * 2.5, headY + 1, 4.5).fill({ color: hairColor, alpha: 0.7 });
      g.ellipse(headX - fdx * 1 + perpDx * 3, headY + perpDy * 3 + 2, 2, 4).fill({ color: hairColor, alpha: 0.5 });
      g.ellipse(headX - fdx * 1 - perpDx * 3, headY - perpDy * 3 + 2, 2, 4).fill({ color: hairColor, alpha: 0.5 });
      // Eyelashes / larger eyes
      g.circle(headX + fdx * 2.5 + perpDx * 1.2, headY + fdy * 2.5 + perpDy * 1.2 - 0.3, 0.7).fill({ color: 0x222222 });
      g.circle(headX + fdx * 2.5 - perpDx * 1.2, headY + fdy * 2.5 - perpDy * 1.2 - 0.3, 0.7).fill({ color: 0x222222 });
      // Lips
      g.ellipse(headX + fdx * 3, headY + fdy * 3 + 1, 1.5, 0.7).fill({ color: 0xCC6666 });
    } else {
      // Default: civilian male head
      g.circle(headX, headY, 4).fill({ color: palette.head });
      // Hair
      g.circle(headX - fdx * 2, headY - 1.5, 4).fill({ color: hairColor, alpha: 0.65 });
      // Eyes
      g.circle(headX + fdx * 2.5 + perpDx, headY + fdy * 2.5 + perpDy - 0.3, 0.6).fill({ color: 0x222222 });
      g.circle(headX + fdx * 2.5 - perpDx, headY + fdy * 2.5 - perpDy - 0.3, 0.6).fill({ color: 0x222222 });
      // Nose
      g.circle(headX + fdx * 3, headY + fdy * 3 - 0.2, 0.5).fill({ color: darken(palette.head, 0.08) });
    }

    // Guard/Knight weapon (sword)
    if (isGuard || isKnight || npc.type === 'army_soldier') {
      const weaponAngle = facing - Math.PI / 4;
      const wx = Math.cos(weaponAngle);
      const wy = Math.sin(weaponAngle);
      // Blade
      g.moveTo(px + wx * 5, py + wy * 5 - 2)
        .lineTo(px + wx * 18, py + wy * 18 - 2)
        .stroke({ color: 0xBBBBBB, width: 2 });
      // Hilt
      g.moveTo(px + wx * 5 + perpDx * 3, py + wy * 5 + perpDy * 3 - 2)
        .lineTo(px + wx * 5 - perpDx * 3, py + wy * 5 - perpDy * 3 - 2)
        .stroke({ color: 0x8B6914, width: 1.5 });
    }

    // Combat indicator (! above head)
    if (npc.behavior === 'chase_player' || npc.behavior === 'attack_player') {
      const excl = new Text({
        text: "!",
        style: new TextStyle({ fontFamily: "monospace", fontSize: 12, fill: 0xFF3333, fontWeight: "bold" }),
      });
      excl.anchor.set(0.5, 1);
      excl.position.set(px, py - 20);
      this.markerContainer.addChild(excl);
    }

    // Quest markers
    if (npc.questId) {
      const quest = state.quests.find(q => q.id === npc.questId);
      if (quest) {
        let markerText = "";
        let markerColor = 0xFFDD00;
        if (quest.status === 'available') {
          markerText = "!";
        } else if (quest.status === 'active') {
          markerText = "?";
          markerColor = 0x88BBFF;
        }
        if (markerText) {
          // Animated bob
          const markerBob = Math.sin(tick * 0.08) * 2;
          // Glow background
          const glow = new Graphics();
          glow.circle(px, py - 22 + markerBob, 8).fill({ color: markerColor, alpha: 0.2 });
          this.markerContainer.addChild(glow);

          const marker = new Text({
            text: markerText,
            style: new TextStyle({
              fontFamily: "monospace", fontSize: 14, fill: markerColor,
              fontWeight: "bold", stroke: { color: 0x000000, width: 2 },
            }),
          });
          marker.anchor.set(0.5, 1);
          marker.position.set(px, py - 17 + markerBob);
          this.markerContainer.addChild(marker);
        }
      }
    }

    // NPC name on hover (always show for quest givers)
    if (npc.questId) {
      const nameLabel = new Text({
        text: npc.name,
        style: new TextStyle({
          fontFamily: "monospace", fontSize: 7, fill: 0xEEDDCC,
          stroke: { color: 0x000000, width: 1.5 },
        }),
      });
      nameLabel.anchor.set(0.5, 0);
      nameLabel.position.set(px, py + 12);
      this.markerContainer.addChild(nameLabel);
    }
  }

  // ===================== HORSE =====================
  private drawHorse(horse: GTAHorse, state: MedievalGTAState): void {
    const g = this.gfx;
    const px = horse.pos.x, py = horse.pos.y;
    const facing = horse.facing;
    const color = HORSE_COLORS[horse.color] ?? 0x8B4513;

    this.drawHorseBody(g, px, py, facing, color, false);

    // Saddle (detailed)
    const saddleDx = Math.cos(facing);
    const saddleDy = Math.sin(facing);
    g.ellipse(px - saddleDx * 2, py - saddleDy * 2, 6, 5).fill({ color: 0x4A2810 });
    g.ellipse(px - saddleDx * 2, py - saddleDy * 2, 6, 5).stroke({ color: 0x3A1800, width: 0.5 });
    // Saddle pommel
    g.circle(px + saddleDx * 2, py + saddleDy * 2 - 3, 2).fill({ color: 0x5C3A1E });
    // Stirrups
    const perpDx = Math.cos(facing + Math.PI / 2);
    const perpDy = Math.sin(facing + Math.PI / 2);
    g.circle(px + perpDx * 7, py + perpDy * 7 + 4, 1.5).fill({ color: 0x888888 });
    g.circle(px - perpDx * 7, py - perpDy * 7 + 4, 1.5).fill({ color: 0x888888 });
    // Stirrup straps
    g.moveTo(px, py).lineTo(px + perpDx * 7, py + perpDy * 7 + 4).stroke({ color: 0x5C3A1E, width: 0.5 });
    g.moveTo(px, py).lineTo(px - perpDx * 7, py - perpDy * 7 + 4).stroke({ color: 0x5C3A1E, width: 0.5 });

    // Rope if tied
    if (horse.state === 'tied') {
      g.moveTo(px, py).lineTo(horse.basePos.x, horse.basePos.y).stroke({ color: 0x8B6914, width: 1.2, alpha: 0.6 });
    }

    // Subtle idle bob for free horses
    if (horse.state === 'free') {
      const bobPhase = (state.tick * 0.05 + horse.pos.x) % (Math.PI * 2);
      const bob = Math.sin(bobPhase) * 0.5;
      // Tail flick
      const tailAngle = facing + Math.PI + Math.sin(bobPhase * 2) * 0.3;
      g.moveTo(px + Math.cos(facing + Math.PI) * 14, py + Math.sin(facing + Math.PI) * 14)
        .lineTo(px + Math.cos(tailAngle) * 20 + bob, py + Math.sin(tailAngle) * 20)
        .stroke({ color: darken(color, 0.3), width: 1.5 });
    }
  }

  private drawHorseBody(g: Graphics, px: number, py: number, facing: number, color: number, _isRidden: boolean): void {
    const dx = Math.cos(facing);
    const dy = Math.sin(facing);

    // Shadow
    g.ellipse(px, py + 10, 14, 6).fill({ color: 0x000000, alpha: 0.2 });

    // Legs (4 with more detail)
    const legOffsets = [
      { along: -6, side: 5 }, { along: -6, side: -5 },
      { along: 6, side: 5 }, { along: 6, side: -5 },
    ];
    const perpDx = Math.cos(facing + Math.PI / 2);
    const perpDy = Math.sin(facing + Math.PI / 2);
    for (const lo of legOffsets) {
      const lx = px + dx * lo.along + perpDx * lo.side;
      const ly = py + dy * lo.along + perpDy * lo.side + 6;
      // Upper leg
      g.ellipse(lx, ly - 1, 2.5, 3).fill({ color: darken(color, 0.2) });
      // Hoof
      g.circle(lx, ly + 2, 2).fill({ color: darken(color, 0.5) });
    }

    // Body (large oval)
    g.ellipse(px, py, 13, 9).fill({ color });
    // Belly highlight
    g.ellipse(px, py + 2, 10, 5).fill({ color: lighten(color, 0.1), alpha: 0.3 });

    // Neck + Head
    const neckX = px + dx * 11;
    const neckY = py + dy * 11 - 2;
    g.ellipse(neckX, neckY, 5, 4).fill({ color });
    const headX = px + dx * 17;
    const headY = py + dy * 17 - 3;
    g.ellipse(headX, headY, 4.5, 3.5).fill({ color });
    // Nose/muzzle
    g.ellipse(headX + dx * 3, headY + dy * 3, 2.5, 2).fill({ color: lighten(color, 0.1) });
    // Eye
    g.circle(headX + perpDx * 2, headY + perpDy * 2 - 1, 1.2).fill({ color: 0x222222 });
    // Ear
    g.poly([
      headX - perpDx * 1 + dx * 1, headY - perpDy * 1 + dy * 1 - 2,
      headX - perpDx * 1, headY - perpDy * 1 - 5,
      headX + perpDx * 0.5, headY + perpDy * 0.5 - 3,
    ]).fill({ color });
    // Nostril
    g.circle(headX + dx * 4, headY + dy * 4, 1).fill({ color: darken(color, 0.35) });

    // Mane (zigzag on neck) - more flowing
    const maneColor = darken(color, 0.3);
    for (let m = 0; m < 6; m++) {
      const mx = px + dx * (3 + m * 2.5);
      const my = py + dy * (3 + m * 2.5) - 4;
      const mOff = (m % 2 === 0 ? 1 : -1) * 2.5;
      g.ellipse(mx + perpDx * mOff, my + perpDy * mOff - 1, 2, 1.8).fill({ color: maneColor });
    }

    // Tail
    const tailX = px + Math.cos(facing + Math.PI) * 13;
    const tailY = py + Math.sin(facing + Math.PI) * 13;
    g.moveTo(tailX, tailY)
      .lineTo(tailX + Math.cos(facing + Math.PI) * 9, tailY + Math.sin(facing + Math.PI) * 9 + 2)
      .stroke({ color: maneColor, width: 2.5 });
    // Tail hair strands
    g.moveTo(tailX + Math.cos(facing + Math.PI) * 9, tailY + Math.sin(facing + Math.PI) * 9 + 2)
      .lineTo(tailX + Math.cos(facing + Math.PI) * 11 + perpDx * 2, tailY + Math.sin(facing + Math.PI) * 11 + 3)
      .stroke({ color: maneColor, width: 1 });
  }

  // ===================== ITEMS =====================
  private drawItem(item: GTAItem, state: MedievalGTAState): void {
    const g = this.gfx;
    const px = item.pos.x, py = item.pos.y;
    const tick = state.tick;
    // Subtle floating animation for items
    const floatY = Math.sin(tick * 0.06 + px * 0.1) * 1.5;

    switch (item.type) {
      case 'gold_pile': {
        // Ground shadow
        g.ellipse(px, py + 3, 6, 2).fill({ color: 0x000000, alpha: 0.15 });
        // Coins with more detail
        g.circle(px - 3, py - 1 + floatY, 3.5).fill({ color: 0xDAA520 });
        g.circle(px - 3, py - 1 + floatY, 3.5).stroke({ color: 0xBB8811, width: 0.5 });
        g.circle(px + 2, py + 1 + floatY, 3.5).fill({ color: 0xFFCC00 });
        g.circle(px + 2, py + 1 + floatY, 3.5).stroke({ color: 0xDDAA00, width: 0.5 });
        g.circle(px, py - 3 + floatY, 3).fill({ color: 0xEEBB22 });
        g.circle(px + 1, py + 3 + floatY, 2.5).fill({ color: 0xDAA520 });
        // Shine sparkle
        const sparkle = Math.sin(tick * 0.15) * 0.3 + 0.5;
        g.circle(px - 1, py - 2 + floatY, 1.2).fill({ color: 0xFFFFAA, alpha: sparkle });
        break;
      }
      case 'health_potion': {
        g.ellipse(px, py + 4, 4, 1.5).fill({ color: 0x000000, alpha: 0.15 });
        // Red potion bottle
        g.roundRect(px - 3.5, py - 2 + floatY, 7, 9, 2).fill({ color: 0xCC2222 });
        g.roundRect(px - 3.5, py - 2 + floatY, 7, 9, 2).stroke({ color: 0xAA1111, width: 0.5 });
        // Neck
        g.rect(px - 2, py - 5 + floatY, 4, 3).fill({ color: 0xCC2222 });
        // Cork
        g.rect(px - 2, py - 6.5 + floatY, 4, 2).fill({ color: 0x8B6914 });
        // Heart symbol on bottle
        g.circle(px - 1, py + 1 + floatY, 1.5).fill({ color: 0xFF4444, alpha: 0.6 });
        g.circle(px + 1, py + 1 + floatY, 1.5).fill({ color: 0xFF4444, alpha: 0.6 });
        g.poly([px - 2, py + 1.5 + floatY, px, py + 4 + floatY, px + 2, py + 1.5 + floatY]).fill({ color: 0xFF4444, alpha: 0.6 });
        // Highlight
        g.rect(px - 1.5, py - 1 + floatY, 1.5, 5).fill({ color: 0xFF6666, alpha: 0.4 });
        break;
      }
      case 'sword': {
        g.ellipse(px, py + 3, 8, 2).fill({ color: 0x000000, alpha: 0.1 });
        g.moveTo(px - 7, py + 7).lineTo(px + 7, py - 7).stroke({ color: 0xCCCCCC, width: 2.5 });
        g.moveTo(px - 6, py + 6).lineTo(px + 6, py - 6).stroke({ color: 0xEEEEEE, width: 0.5, alpha: 0.5 });
        g.moveTo(px - 3, py - 1).lineTo(px + 1, py - 5).stroke({ color: 0x8B6914, width: 2.5 });
        g.circle(px - 4, py + 0.5, 2).fill({ color: 0xDAA520 });
        break;
      }
      case 'bow': {
        g.ellipse(px, py + 3, 6, 2).fill({ color: 0x000000, alpha: 0.1 });
        g.moveTo(px - 4, py - 7).arc(px + 2, py, 8, -Math.PI * 0.7, Math.PI * 0.7).stroke({ color: 0x6B4226, width: 2 });
        g.moveTo(px - 4, py - 7).lineTo(px - 4, py + 7).stroke({ color: 0xAA9966, width: 0.8 });
        break;
      }
      case 'supply_crate': {
        g.ellipse(px, py + 6, 6, 2).fill({ color: 0x000000, alpha: 0.12 });
        g.rect(px - 6, py - 6, 12, 12).fill({ color: 0x8B6914 });
        g.rect(px - 6, py - 6, 12, 12).stroke({ color: 0x6B4226, width: 1 });
        g.moveTo(px - 6, py).lineTo(px + 6, py).stroke({ color: 0x6B4226, width: 1 });
        g.moveTo(px, py - 6).lineTo(px, py + 6).stroke({ color: 0x6B4226, width: 1 });
        // Nails
        g.circle(px - 5, py - 5, 0.8).fill({ color: 0x888888 });
        g.circle(px + 5, py - 5, 0.8).fill({ color: 0x888888 });
        g.circle(px - 5, py + 5, 0.8).fill({ color: 0x888888 });
        g.circle(px + 5, py + 5, 0.8).fill({ color: 0x888888 });
        break;
      }
      case 'key': {
        g.ellipse(px, py + 4, 4, 1.5).fill({ color: 0x000000, alpha: 0.1 });
        const ky = floatY;
        g.circle(px, py - 3 + ky, 3.5).stroke({ color: 0xDAA520, width: 2 });
        g.circle(px, py - 3 + ky, 3.5).fill({ color: 0xDAA520, alpha: 0.2 });
        g.moveTo(px, py + ky).lineTo(px, py + 6 + ky).stroke({ color: 0xDAA520, width: 2 });
        g.moveTo(px, py + 3 + ky).lineTo(px + 3, py + 3 + ky).stroke({ color: 0xDAA520, width: 1.5 });
        g.moveTo(px, py + 5 + ky).lineTo(px + 2.5, py + 5 + ky).stroke({ color: 0xDAA520, width: 1.5 });
        break;
      }
      case 'letter': {
        g.ellipse(px, py + 4, 6, 1.5).fill({ color: 0x000000, alpha: 0.1 });
        g.rect(px - 6, py - 4, 12, 8).fill({ color: 0xEEDDCC });
        g.rect(px - 6, py - 4, 12, 8).stroke({ color: 0xAA9988, width: 0.5 });
        // Fold lines
        g.moveTo(px - 6, py).lineTo(px + 6, py).stroke({ color: 0xCCBBAA, width: 0.5 });
        // Wax seal
        g.circle(px, py + 1, 2.5).fill({ color: 0xCC2222 });
        g.circle(px, py + 1, 2.5).stroke({ color: 0xAA1111, width: 0.3 });
        // Seal imprint
        g.circle(px, py + 1, 1).fill({ color: 0xDD3333 });
        break;
      }
      case 'treasure_chest': {
        g.ellipse(px, py + 6, 8, 2.5).fill({ color: 0x000000, alpha: 0.15 });
        // Chest body
        g.roundRect(px - 7, py - 5, 14, 11, 1).fill({ color: 0x6B4226 });
        g.roundRect(px - 7, py - 5, 14, 11, 1).stroke({ color: 0x4A2810, width: 1 });
        // Lid with slight arch
        g.roundRect(px - 7, py - 7, 14, 4, 2).fill({ color: 0x7B5236 });
        // Gold bands
        g.rect(px - 7, py - 2, 14, 2.5).fill({ color: 0xDAA520 });
        g.rect(px - 7, py - 7, 14, 1.5).fill({ color: 0xDAA520 });
        // Gold clasp
        g.roundRect(px - 2, py - 1.5, 4, 3, 1).fill({ color: 0xFFCC00 });
        g.roundRect(px - 2, py - 1.5, 4, 3, 1).stroke({ color: 0x8B6914, width: 0.5 });
        // Keyhole
        g.circle(px, py - 0.5, 0.8).fill({ color: 0x333333 });
        g.rect(px - 0.3, py - 0.5, 0.6, 1.5).fill({ color: 0x333333 });
        // Corner studs
        g.circle(px - 6, py - 4, 1).fill({ color: 0xDAA520 });
        g.circle(px + 6, py - 4, 1).fill({ color: 0xDAA520 });
        g.circle(px - 6, py + 5, 1).fill({ color: 0xDAA520 });
        g.circle(px + 6, py + 5, 1).fill({ color: 0xDAA520 });
        // Shimmer
        const shimmer = Math.sin(tick * 0.1) * 0.3 + 0.3;
        g.rect(px - 5, py - 4, 3, 1).fill({ color: 0xFFFFAA, alpha: shimmer });
        break;
      }
    }
  }

  // ===================== PROJECTILES =====================
  private drawProjectile(proj: GTAProjectile): void {
    const g = this.gfx;
    const px = proj.pos.x, py = proj.pos.y;
    const speed = Math.sqrt(proj.vel.x * proj.vel.x + proj.vel.y * proj.vel.y);
    const dx = speed > 0 ? proj.vel.x / speed : 1;
    const dy = speed > 0 ? proj.vel.y / speed : 0;
    // Arrow shaft
    const tailX = px - dx * 10;
    const tailY = py - dy * 10;
    g.moveTo(tailX, tailY).lineTo(px, py).stroke({ color: 0x5C3A1E, width: 1.5 });
    // Arrowhead
    const perpX = -dy;
    const perpY = dx;
    const tipX = px + dx * 3;
    const tipY = py + dy * 3;
    g.poly([
      tipX, tipY,
      px + perpX * 2, py + perpY * 2,
      px - perpX * 2, py - perpY * 2,
    ]).fill({ color: 0x888888 });
    // Fletching
    g.moveTo(tailX, tailY).lineTo(tailX + perpX * 2.5, tailY + perpY * 2.5).stroke({ color: 0xCCCCCC, width: 0.7 });
    g.moveTo(tailX, tailY).lineTo(tailX - perpX * 2.5, tailY - perpY * 2.5).stroke({ color: 0xCCCCCC, width: 0.7 });
    // Motion blur
    g.moveTo(tailX - dx * 5, tailY - dy * 5).lineTo(tailX, tailY).stroke({ color: 0xCCBB99, width: 0.5, alpha: 0.3 });
  }
}

// ===================== UTILITY =====================
function darken(color: number, amount: number): number {
  const r = Math.max(0, ((color >> 16) & 0xFF) * (1 - amount)) | 0;
  const gr = Math.max(0, ((color >> 8) & 0xFF) * (1 - amount)) | 0;
  const b = Math.max(0, (color & 0xFF) * (1 - amount)) | 0;
  return (r << 16) | (gr << 8) | b;
}

function lighten(color: number, amount: number): number {
  const r = Math.min(255, ((color >> 16) & 0xFF) * (1 + amount)) | 0;
  const gr = Math.min(255, ((color >> 8) & 0xFF) * (1 + amount)) | 0;
  const b = Math.min(255, (color & 0xFF) * (1 + amount)) | 0;
  return (r << 16) | (gr << 8) | b;
}
