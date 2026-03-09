// ---------------------------------------------------------------------------
// GTACharacterRenderer — procedural top-down rendering of player, NPCs,
// horses, and ground items. Depth-sorted by Y position.
// ---------------------------------------------------------------------------

import { Container, Graphics, Text, TextStyle } from "pixi.js";
import type {
  MedievalGTAState, GTAPlayer, GTANPC, GTAHorse, GTAItem,
} from "../state/MedievalGTAState";

// Palette lookup for NPC types
const NPC_PALETTES: Record<string, { body: number; accent: number; head: number; extra?: number }> = {
  guard:              { body: 0xCC2222, accent: 0x888888, head: 0x999999 },
  knight:             { body: 0xCCCCCC, accent: 0xCC2222, head: 0xBBBBBB },
  archer_guard:       { body: 0x336633, accent: 0x6B4226, head: 0xDDB088 },
  army_soldier:       { body: 0x884422, accent: 0x666666, head: 0x888888 },
  civilian_m:         { body: 0x8B7355, accent: 0x6B4226, head: 0xDDB088 },
  civilian_f:         { body: 0x6688BB, accent: 0xCC6688, head: 0xDDB088 },
  merchant:           { body: 0xBB8833, accent: 0xDAA520, head: 0xDDB088, extra: 0x6B4226 },
  blacksmith_npc:     { body: 0x555555, accent: 0x333333, head: 0xDDB088 },
  priest:             { body: 0xEEDDCC, accent: 0xDAA520, head: 0xDDB088 },
  bard:               { body: 0xCC44CC, accent: 0x44CCCC, head: 0xDDB088 },
  tavern_keeper:      { body: 0x886644, accent: 0xEEDDCC, head: 0xDDB088 },
  stable_master:      { body: 0x6B4226, accent: 0x8B6914, head: 0xDDB088 },
  criminal:           { body: 0x333333, accent: 0x222222, head: 0x444444 },
  bandit:             { body: 0x443322, accent: 0x222211, head: 0x665544 },
};

// Color variants for civilians
const CIVILIAN_M_COLORS = [0x8B7355, 0x558855, 0x777777, 0xAA8855];
const CIVILIAN_F_COLORS = [0x6688BB, 0xCC4455, 0x8855AA, 0x55AA66];

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
        entries.push({ y: item.pos.y, draw: () => this.drawItem(item) });
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

    // If on horse, draw horse body underneath first
    if (p.onHorse && p.mountedHorseId) {
      const horse = state.horses.get(p.mountedHorseId);
      if (horse) {
        this.drawHorseBody(g, px, py, facing, HORSE_COLORS[horse.color] ?? 0x8B4513, true);
      }
    }

    // Shadow
    g.ellipse(px, py + 8, p.onHorse ? 14 : 8, 4).fill({ color: 0x000000, alpha: 0.25 });

    // Body (blue tunic)
    g.ellipse(px, py, 7, 9).fill({ color: 0x2244AA });
    // Gold trim
    g.ellipse(px, py, 7, 9).stroke({ color: 0xDAA520, width: 1 });

    // Belt
    g.ellipse(px, py + 2, 7, 2).fill({ color: 0x6B4226 });

    // Head (offset in facing direction)
    const headX = px + dx * 4;
    const headY = py + dy * 4 - 6;
    g.circle(headX, headY, 4).fill({ color: 0xDDB088 });
    // Hair
    g.circle(headX - dx * 2, headY - 1, 4).fill({ color: 0x5C3A1E, alpha: 0.7 });

    // Arms (small ellipses on sides)
    const armAngle1 = facing + Math.PI / 2;
    const armAngle2 = facing - Math.PI / 2;
    g.circle(px + Math.cos(armAngle1) * 7, py + Math.sin(armAngle1) * 7 - 1, 2.5).fill({ color: 0xDDB088 });
    g.circle(px + Math.cos(armAngle2) * 7, py + Math.sin(armAngle2) * 7 - 1, 2.5).fill({ color: 0xDDB088 });

    // Weapon rendering
    if (p.weapon === 'sword') {
      let swingAngle = facing;
      if (p.attackTimer > 0) {
        // Swing arc during attack
        const swingProgress = 1 - p.attackTimer / 0.2;
        swingAngle = facing - Math.PI / 3 + swingProgress * (Math.PI * 2 / 3);
      }
      const swordDx = Math.cos(swingAngle);
      const swordDy = Math.sin(swingAngle);
      // Sword blade
      g.moveTo(px + swordDx * 6, py + swordDy * 6 - 2)
        .lineTo(px + swordDx * 20, py + swordDy * 20 - 2)
        .stroke({ color: 0xCCCCCC, width: 2.5 });
      // Hilt
      const hiltPx = px + swordDx * 6;
      const hiltPy = py + swordDy * 6 - 2;
      const perpDx = Math.cos(swingAngle + Math.PI / 2);
      const perpDy = Math.sin(swingAngle + Math.PI / 2);
      g.moveTo(hiltPx + perpDx * 4, hiltPy + perpDy * 4)
        .lineTo(hiltPx - perpDx * 4, hiltPy - perpDy * 4)
        .stroke({ color: 0x8B6914, width: 2 });
      // Pommel
      g.circle(hiltPx - swordDx * 2, hiltPy - swordDy * 2, 1.5).fill({ color: 0xDAA520 });
    } else if (p.weapon === 'bow') {
      // Bow on back/side
      const bowCx = px - dx * 2;
      const bowCy = py - dy * 2 - 2;
      const bowAngle = facing + Math.PI / 2;
      // Bow arc
      g.moveTo(bowCx + Math.cos(bowAngle - 0.8) * 10, bowCy + Math.sin(bowAngle - 0.8) * 10)
        .arc(bowCx, bowCy, 10, bowAngle - 0.8, bowAngle + 0.8)
        .stroke({ color: 0x6B4226, width: 2 });
      // String
      g.moveTo(bowCx + Math.cos(bowAngle - 0.8) * 10, bowCy + Math.sin(bowAngle - 0.8) * 10)
        .lineTo(bowCx + Math.cos(bowAngle + 0.8) * 10, bowCy + Math.sin(bowAngle + 0.8) * 10)
        .stroke({ color: 0xAA9966, width: 0.8 });
      // Quiver on back
      g.rect(px - dx * 5 - 2, py - dy * 5 - 8, 4, 10).fill({ color: 0x6B4226 });
      // Arrow tips poking out
      g.moveTo(px - dx * 5, py - dy * 5 - 8).lineTo(px - dx * 5, py - dy * 5 - 12).stroke({ color: 0x888888, width: 1 });
      g.moveTo(px - dx * 5 + 2, py - dy * 5 - 8).lineTo(px - dx * 5 + 2, py - dy * 5 - 11).stroke({ color: 0x888888, width: 1 });
    }

    // Invincibility flash
    if (p.invincibleTimer > 0 && Math.floor(state.tick * 0.3) % 2 === 0) {
      g.ellipse(px, py, 9, 11).fill({ color: 0xFFFFFF, alpha: 0.3 });
    }

    // Rolling visual
    if (p.state === 'rolling') {
      g.circle(px, py, 12).stroke({ color: 0xFFFFFF, width: 1, alpha: 0.4 });
    }
  }

  private drawDeadPlayer(p: GTAPlayer): void {
    const g = this.gfx;
    const px = p.pos.x, py = p.pos.y;
    // Flattened body
    g.ellipse(px, py, 10, 5).fill({ color: 0x1a2255, alpha: 0.6 });
    g.circle(px + 8, py, 3).fill({ color: 0xAA8866, alpha: 0.5 });
  }

  // ===================== NPC =====================
  private drawNPC(npc: GTANPC, state: MedievalGTAState): void {
    const g = this.gfx;
    const px = npc.pos.x, py = npc.pos.y;

    if (npc.dead) {
      // Fade out over deathTimer
      const alpha = Math.max(0.1, Math.min(0.8, npc.deathTimer / 3));
      g.ellipse(px, py, 9, 4).fill({ color: 0x553333, alpha });
      g.circle(px + 6, py, 2.5).fill({ color: 0xAA8866, alpha: alpha * 0.7 });
      return;
    }

    const facing = npc.facing;
    const dx = Math.cos(facing);
    const dy = Math.sin(facing);

    // Resolve palette
    let palette = NPC_PALETTES[npc.type] ?? NPC_PALETTES.civilian_m;

    // Apply color variant for civilians
    if (npc.type === 'civilian_m') {
      palette = { ...palette, body: CIVILIAN_M_COLORS[npc.colorVariant % 4] };
    } else if (npc.type === 'civilian_f') {
      palette = { ...palette, body: CIVILIAN_F_COLORS[npc.colorVariant % 4] };
    }

    // Shadow
    g.ellipse(px, py + 7, 7, 3.5).fill({ color: 0x000000, alpha: 0.2 });

    // Draw body based on type
    const isFemale = npc.type === 'civilian_f';
    const isPriest = npc.type === 'priest';
    const isKnight = npc.type === 'knight';
    const isTavernKeeper = npc.type === 'tavern_keeper';

    if (isFemale) {
      // Wider dress bottom
      g.ellipse(px, py + 2, 8, 10).fill({ color: palette.body });
      g.ellipse(px, py - 2, 6, 5).fill({ color: palette.body });
      // Dress trim
      g.ellipse(px, py + 8, 8, 2).fill({ color: palette.accent, alpha: 0.6 });
    } else if (isPriest) {
      // Long robe
      g.ellipse(px, py + 1, 6, 11).fill({ color: palette.body });
      g.ellipse(px, py + 1, 6, 11).stroke({ color: 0xCCBB99, width: 0.5 });
      // Cross accessory
      g.rect(px - 1, py - 2, 2, 6).fill({ color: 0xDAA520 });
      g.rect(px - 2.5, py - 0.5, 5, 2).fill({ color: 0xDAA520 });
    } else if (isKnight) {
      // Larger armored body
      g.ellipse(px, py, 8, 10).fill({ color: palette.body });
      g.ellipse(px, py, 8, 10).stroke({ color: 0x999999, width: 1 });
      // Shoulder plates
      g.circle(px - 7, py - 3, 3).fill({ color: 0xAAAAAA });
      g.circle(px + 7, py - 3, 3).fill({ color: 0xAAAAAA });
    } else if (isTavernKeeper) {
      // Wider/rotund body
      g.ellipse(px, py, 8, 10).fill({ color: palette.body });
      // White apron
      g.ellipse(px, py + 3, 6, 7).fill({ color: palette.accent, alpha: 0.7 });
    } else if (npc.type === 'blacksmith_npc') {
      g.ellipse(px, py, 7, 9).fill({ color: palette.body });
      // Dark apron
      g.ellipse(px, py + 3, 6, 6).fill({ color: palette.accent });
      // Wider build
      g.ellipse(px, py - 1, 8, 5).fill({ color: palette.body, alpha: 0.5 });
    } else if (npc.type === 'bard') {
      // Two-toned body (jester-like)
      g.ellipse(px - 2, py, 5, 9).fill({ color: palette.body });
      g.ellipse(px + 2, py, 5, 9).fill({ color: palette.accent });
      // Lute shape on back
      g.ellipse(px - dx * 6, py - dy * 6, 4, 6).fill({ color: 0x8B6914, alpha: 0.7 });
      g.moveTo(px - dx * 6, py - dy * 6 - 6).lineTo(px - dx * 6, py - dy * 6 - 12).stroke({ color: 0x8B6914, width: 1 });
    } else if (npc.type === 'criminal' || npc.type === 'bandit') {
      g.ellipse(px, py, 6, 9).fill({ color: palette.body });
      // Hood
      g.circle(px + dx * 3, py + dy * 3 - 6, 5).fill({ color: palette.accent });
    } else if (npc.type === 'merchant') {
      g.ellipse(px, py, 7, 9).fill({ color: palette.body });
      // Small hat
      g.ellipse(px + dx * 2, py + dy * 2 - 8, 5, 2).fill({ color: palette.extra ?? 0x6B4226 });
    } else if (npc.type === 'stable_master') {
      g.ellipse(px, py, 7, 9).fill({ color: palette.body });
      // Wide-brimmed hat
      g.ellipse(px + dx * 2, py + dy * 2 - 8, 7, 2).fill({ color: palette.accent });
      g.circle(px + dx * 2, py + dy * 2 - 9, 3.5).fill({ color: palette.accent });
    } else {
      // Default body (guard, archer, soldier, etc.)
      g.ellipse(px, py, 6, 9).fill({ color: palette.body });
    }

    // Head
    const headX = px + dx * 4;
    const headY = py + dy * 4 - 6;
    g.circle(headX, headY, 3.5).fill({ color: palette.head });

    // Type-specific head gear
    if (npc.type === 'guard' || npc.type === 'army_soldier') {
      // Helmet
      g.circle(headX, headY, 4).fill({ color: 0x888888 });
      g.circle(headX, headY - 1, 4).fill({ color: 0x999999, alpha: 0.5 });
      // Shield on arm
      const shieldAngle = facing + Math.PI / 2;
      const sx = px + Math.cos(shieldAngle) * 7;
      const sy = py + Math.sin(shieldAngle) * 7;
      g.roundRect(sx - 4, sy - 5, 8, 10, 2).fill({ color: 0x884422 });
      g.roundRect(sx - 4, sy - 5, 8, 10, 2).stroke({ color: 0x666666, width: 1 });
      // Shield cross
      g.moveTo(sx, sy - 5).lineTo(sx, sy + 5).stroke({ color: 0xDAA520, width: 1 });
      g.moveTo(sx - 4, sy).lineTo(sx + 4, sy).stroke({ color: 0xDAA520, width: 1 });
    } else if (npc.type === 'knight') {
      // Full helmet with plume
      g.circle(headX, headY, 4.5).fill({ color: 0xBBBBBB });
      // Visor slit
      g.rect(headX - 3, headY - 0.5, 6, 1).fill({ color: 0x333333 });
      // Red plume
      g.poly([headX, headY - 4.5, headX - 2, headY - 10, headX + 2, headY - 10]).fill({ color: 0xCC2222 });
      g.ellipse(headX, headY - 10, 3, 1.5).fill({ color: 0xCC2222 });
    } else if (npc.type === 'archer_guard') {
      // Green hood
      g.circle(headX, headY, 4).fill({ color: 0x336633 });
      // Bow on back
      const bowAngle = facing + Math.PI;
      const bx = px + Math.cos(bowAngle) * 5;
      const by = py + Math.sin(bowAngle) * 5 - 3;
      g.moveTo(bx, by - 5).arc(bx + 3, by, 6, -Math.PI / 2, Math.PI / 2).stroke({ color: 0x6B4226, width: 1.5 });
      // Quiver
      g.rect(bx - 3, by - 7, 3, 10).fill({ color: 0x6B4226 });
    }

    // Guard/Knight weapon (sword)
    if (npc.type === 'guard' || npc.type === 'knight' || npc.type === 'army_soldier') {
      const weaponAngle = facing - Math.PI / 4;
      const wx = Math.cos(weaponAngle);
      const wy = Math.sin(weaponAngle);
      g.moveTo(px + wx * 5, py + wy * 5 - 2)
        .lineTo(px + wx * 16, py + wy * 16 - 2)
        .stroke({ color: 0xBBBBBB, width: 2 });
    }

    // Combat indicator (! above head)
    if (npc.behavior === 'chase_player' || npc.behavior === 'attack_player') {
      const excl = new Text({
        text: "!",
        style: new TextStyle({ fontFamily: "monospace", fontSize: 12, fill: 0xFF3333, fontWeight: "bold" }),
      });
      excl.anchor.set(0.5, 1);
      excl.position.set(px, py - 18);
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
          // Glow background
          const glow = new Graphics();
          glow.circle(px, py - 20, 7).fill({ color: markerColor, alpha: 0.25 });
          this.markerContainer.addChild(glow);

          const marker = new Text({
            text: markerText,
            style: new TextStyle({
              fontFamily: "monospace", fontSize: 14, fill: markerColor,
              fontWeight: "bold", stroke: { color: 0x000000, width: 2 },
            }),
          });
          marker.anchor.set(0.5, 1);
          marker.position.set(px, py - 16);
          this.markerContainer.addChild(marker);
        }
      }
    }
  }

  // ===================== HORSE =====================
  private drawHorse(horse: GTAHorse, state: MedievalGTAState): void {
    const g = this.gfx;
    const px = horse.pos.x, py = horse.pos.y;
    const facing = horse.facing;
    const color = HORSE_COLORS[horse.color] ?? 0x8B4513;

    this.drawHorseBody(g, px, py, facing, color, false);

    // Saddle (darker rectangle on back)
    const saddleDx = Math.cos(facing);
    const saddleDy = Math.sin(facing);
    g.ellipse(px - saddleDx * 2, py - saddleDy * 2, 5, 4).fill({ color: 0x4A2810 });

    // Rope if tied
    if (horse.state === 'tied') {
      g.moveTo(px, py).lineTo(horse.basePos.x, horse.basePos.y).stroke({ color: 0x8B6914, width: 1, alpha: 0.6 });
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

    // Legs (4 small dots underneath)
    const legOffsets = [
      { along: -6, side: 5 }, { along: -6, side: -5 },
      { along: 6, side: 5 }, { along: 6, side: -5 },
    ];
    const perpDx = Math.cos(facing + Math.PI / 2);
    const perpDy = Math.sin(facing + Math.PI / 2);
    for (const lo of legOffsets) {
      const lx = px + dx * lo.along + perpDx * lo.side;
      const ly = py + dy * lo.along + perpDy * lo.side + 6;
      g.circle(lx, ly, 2).fill({ color: darken(color, 0.4) });
    }

    // Body (large oval oriented in facing direction)
    // We approximate an oriented ellipse by drawing at center
    g.ellipse(px, py, 12, 8).fill({ color });

    // Neck + Head
    const neckX = px + dx * 10;
    const neckY = py + dy * 10 - 2;
    g.ellipse(neckX, neckY, 5, 4).fill({ color });
    const headX = px + dx * 16;
    const headY = py + dy * 16 - 3;
    g.ellipse(headX, headY, 4, 3).fill({ color });
    // Eye
    g.circle(headX + perpDx * 2, headY + perpDy * 2 - 1, 1).fill({ color: 0x222222 });
    // Nostril
    g.circle(headX + dx * 3, headY + dy * 3, 0.8).fill({ color: darken(color, 0.3) });

    // Mane (zigzag on neck)
    const maneColor = darken(color, 0.3);
    for (let m = 0; m < 5; m++) {
      const mx = px + dx * (4 + m * 2.5);
      const my = py + dy * (4 + m * 2.5) - 4;
      const mOff = (m % 2 === 0 ? 1 : -1) * 2;
      g.circle(mx + perpDx * mOff, my + perpDy * mOff - 1, 1.5).fill({ color: maneColor });
    }

    // Tail
    const tailX = px + Math.cos(facing + Math.PI) * 12;
    const tailY = py + Math.sin(facing + Math.PI) * 12;
    g.moveTo(tailX, tailY)
      .lineTo(tailX + Math.cos(facing + Math.PI) * 8, tailY + Math.sin(facing + Math.PI) * 8 + 2)
      .stroke({ color: maneColor, width: 2 });
  }

  // ===================== ITEMS =====================
  private drawItem(item: GTAItem): void {
    const g = this.gfx;
    const px = item.pos.x, py = item.pos.y;

    switch (item.type) {
      case 'gold_pile': {
        // Small cluster of gold circles
        g.circle(px - 2, py - 1, 3).fill({ color: 0xDAA520 });
        g.circle(px + 2, py + 1, 3).fill({ color: 0xFFCC00 });
        g.circle(px, py - 3, 2.5).fill({ color: 0xEEBB22 });
        g.circle(px + 1, py + 3, 2).fill({ color: 0xDAA520 });
        // Shine
        g.circle(px, py - 2, 1).fill({ color: 0xFFFFAA, alpha: 0.6 });
        break;
      }
      case 'health_potion': {
        // Red potion bottle
        g.roundRect(px - 3, py - 2, 6, 8, 2).fill({ color: 0xCC2222 });
        g.rect(px - 1.5, py - 5, 3, 3).fill({ color: 0xCC2222 });
        // Cork
        g.rect(px - 1.5, py - 6, 3, 2).fill({ color: 0x8B6914 });
        // Highlight
        g.rect(px - 1, py, 2, 4).fill({ color: 0xFF6666, alpha: 0.5 });
        break;
      }
      case 'sword': {
        // Diagonal gray line
        g.moveTo(px - 6, py + 6).lineTo(px + 6, py - 6).stroke({ color: 0xBBBBBB, width: 2 });
        // Hilt crossbar
        g.moveTo(px - 3, py - 1).lineTo(px + 1, py - 5).stroke({ color: 0x8B6914, width: 2 });
        break;
      }
      case 'bow': {
        g.moveTo(px - 4, py - 6).arc(px + 2, py, 7, -Math.PI * 0.7, Math.PI * 0.7).stroke({ color: 0x6B4226, width: 1.5 });
        g.moveTo(px - 4, py - 6).lineTo(px - 4, py + 6).stroke({ color: 0xAA9966, width: 0.8 });
        break;
      }
      case 'supply_crate': {
        g.rect(px - 5, py - 5, 10, 10).fill({ color: 0x8B6914 });
        g.rect(px - 5, py - 5, 10, 10).stroke({ color: 0x6B4226, width: 1 });
        // Cross planks
        g.moveTo(px - 5, py).lineTo(px + 5, py).stroke({ color: 0x6B4226, width: 1 });
        g.moveTo(px, py - 5).lineTo(px, py + 5).stroke({ color: 0x6B4226, width: 1 });
        break;
      }
      case 'key': {
        g.circle(px, py - 3, 3).stroke({ color: 0xDAA520, width: 1.5 });
        g.moveTo(px, py).lineTo(px, py + 5).stroke({ color: 0xDAA520, width: 1.5 });
        g.moveTo(px, py + 3).lineTo(px + 2, py + 3).stroke({ color: 0xDAA520, width: 1 });
        g.moveTo(px, py + 5).lineTo(px + 2, py + 5).stroke({ color: 0xDAA520, width: 1 });
        break;
      }
      case 'letter': {
        g.rect(px - 5, py - 3, 10, 7).fill({ color: 0xEEDDCC });
        g.rect(px - 5, py - 3, 10, 7).stroke({ color: 0xAA9988, width: 0.5 });
        // Wax seal
        g.circle(px, py + 1, 2).fill({ color: 0xCC2222 });
        break;
      }
    }
  }
}

// ===================== UTILITY =====================
function darken(color: number, amount: number): number {
  const r = Math.max(0, ((color >> 16) & 0xFF) * (1 - amount)) | 0;
  const gr = Math.max(0, ((color >> 8) & 0xFF) * (1 - amount)) | 0;
  const b = Math.max(0, (color & 0xFF) * (1 - amount)) | 0;
  return (r << 16) | (gr << 8) | b;
}
