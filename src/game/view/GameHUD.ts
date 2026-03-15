// ---------------------------------------------------------------------------
// Quest for the Grail — HUD
// Health bar, minimap, inventory display, ability cooldown, floor info,
// character stats, and notifications.
// ---------------------------------------------------------------------------

import { Container, Graphics, Text, TextStyle } from "pixi.js";
import {
  GameBalance, TileType, FLOOR_THEMES, QUEST_GENRE_DEFS, KNIGHT_DEFS,
} from "../config/GameConfig";

import { GamePhase } from "../state/GameState";
import type {
  GrailGameState, PlayerState, FloorState,
} from "../state/GameState";

const FONT = "Segoe UI";
const GOLD_COLOR = 0xffd700;

// ---------------------------------------------------------------------------
// GameHUD
// ---------------------------------------------------------------------------

export class GameHUD {
  readonly container = new Container();

  private _gfx = new Graphics();
  private _texts: Text[] = [];
  private _notification: { text: string; color: number; timer: number } | null = null;

  build(): void {
    this.container.addChild(this._gfx);
  }

  // -------------------------------------------------------------------------
  // Update each frame
  // -------------------------------------------------------------------------
  update(state: GrailGameState, sw: number, sh: number, dt: number): void {
    const g = this._gfx;
    g.clear();

    // Remove old texts
    for (const t of this._texts) {
      this.container.removeChild(t);
      t.destroy();
    }
    this._texts.length = 0;

    if (state.phase === GamePhase.GENRE_SELECT) {
      this._drawGenreSelect(state, sw, sh);
      return;
    }
    if (state.phase === GamePhase.KNIGHT_SELECT) {
      this._drawKnightSelect(state, sw, sh);
      return;
    }
    if (state.phase === GamePhase.GAME_OVER) {
      this._drawGameOver(state, sw, sh);
      return;
    }
    if (state.phase === GamePhase.VICTORY) {
      this._drawVictory(state, sw, sh);
      return;
    }

    // Playing HUD
    this._drawHPBar(state.player, sw);
    this._drawXPBar(state.player, sw);
    this._drawStats(state.player, sw, sh);
    this._drawAbilityCooldown(state.player, sw);
    this._drawFloorInfo(state, sw);
    this._drawMinimap(state.floor, state.player, sw, sh);
    this._drawInventoryBar(state.player, sw, sh);
    this._drawGold(state.player, sw);
    this._drawNotification(sw, sh, dt);

    if (state.phase === GamePhase.INVENTORY) {
      this._drawInventoryScreen(state, sw, sh);
    }
    if (state.phase === GamePhase.PAUSED) {
      this._drawPaused(sw, sh);
    }
  }

  // -------------------------------------------------------------------------
  // Genre Select Screen
  // -------------------------------------------------------------------------
  private _drawGenreSelect(_state: GrailGameState, sw: number, sh: number): void {
    const g = this._gfx;
    // Dark overlay
    g.rect(0, 0, sw, sh).fill({ color: 0x0a0805, alpha: 0.95 });

    this._addText("QUEST FOR THE GRAIL", sw / 2, 60, 32, GOLD_COLOR, true);
    this._addText("Choose Your Quest", sw / 2, 110, 18, 0xccbbaa, true);

    const genres = QUEST_GENRE_DEFS;
    const cols = 3;
    const cardW = 220;
    const cardH = 120;
    const gap = 20;
    const startX = (sw - (cols * cardW + (cols - 1) * gap)) / 2;
    const startY = 160;

    for (let i = 0; i < genres.length; i++) {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = startX + col * (cardW + gap);
      const y = startY + row * (cardH + gap);
      const genre = genres[i];

      g.roundRect(x, y, cardW, cardH, 6).fill({ color: 0x1a1510 });
      g.roundRect(x, y, cardW, cardH, 6).stroke({ color: genre.color, width: 2, alpha: 0.6 });

      this._addText(genre.label, x + cardW / 2, y + 20, 14, genre.color, true);
      // Word wrap the description manually
      const words = genre.desc.split(" ");
      let line = "";
      let ly = y + 44;
      for (const w of words) {
        if ((line + " " + w).length > 30) {
          this._addText(line.trim(), x + cardW / 2, ly, 11, 0xaa9988, true);
          ly += 15;
          line = w;
        } else {
          line += " " + w;
        }
      }
      if (line.trim()) this._addText(line.trim(), x + cardW / 2, ly, 11, 0xaa9988, true);

      // Key hint
      this._addText(`[${i + 1}]`, x + cardW / 2, y + cardH - 16, 12, 0x887766, true);
    }

    this._addText("Press 1-6 to select a quest type", sw / 2, sh - 40, 14, 0x665544, true);
  }

  // -------------------------------------------------------------------------
  // Knight Select Screen
  // -------------------------------------------------------------------------
  private _drawKnightSelect(state: GrailGameState, sw: number, sh: number): void {
    const g = this._gfx;
    g.rect(0, 0, sw, sh).fill({ color: 0x0a0805, alpha: 0.95 });

    const genreLabel = state.genre?.label ?? "Quest";
    this._addText(genreLabel, sw / 2, 30, 16, state.genre?.color ?? GOLD_COLOR, true);
    this._addText("Choose Your Knight", sw / 2, 60, 24, GOLD_COLOR, true);

    const knights = KNIGHT_DEFS;
    const cols = 4;
    const cardW = 180;
    const cardH = 200;
    const gap = 16;
    const startX = (sw - (cols * cardW + (cols - 1) * gap)) / 2;
    const startY = 100;

    for (let i = 0; i < knights.length; i++) {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = startX + col * (cardW + gap);
      const y = startY + row * (cardH + gap);
      const k = knights[i];
      const locked = !state.unlockedKnights.includes(k.id);

      g.roundRect(x, y, cardW, cardH, 6).fill({ color: locked ? 0x111111 : 0x1a1510 });
      g.roundRect(x, y, cardW, cardH, 6).stroke({ color: locked ? 0x333333 : k.color, width: 2 });

      // Knight circle
      g.circle(x + cardW / 2, y + 36, 18).fill({ color: locked ? 0x333333 : k.color });

      this._addText(locked ? "???" : k.name, x + cardW / 2, y + 64, 14, locked ? 0x555555 : k.color, true);
      if (!locked) {
        this._addText(k.title, x + cardW / 2, y + 82, 10, 0xaa9988, true);
        this._addText(`HP:${k.hp} ATK:${k.attack} DEF:${k.defense}`, x + cardW / 2, y + 102, 10, 0x888888, true);
        this._addText(`SPD:${k.speed} CRIT:${Math.round(k.critChance * 100)}%`, x + cardW / 2, y + 116, 10, 0x888888, true);
        this._addText(k.ability.name, x + cardW / 2, y + 138, 11, 0x44aaff, true);
        // Wrap ability desc
        const words = k.ability.desc.split(" ");
        let line = "";
        let ly = y + 155;
        for (const w of words) {
          if ((line + " " + w).length > 24) {
            this._addText(line.trim(), x + cardW / 2, ly, 9, 0x777766, true);
            ly += 12;
            line = w;
          } else {
            line += " " + w;
          }
        }
        if (line.trim()) this._addText(line.trim(), x + cardW / 2, ly, 9, 0x777766, true);
      } else {
        this._addText("LOCKED", x + cardW / 2, y + 100, 12, 0x555555, true);
      }

      // Key hint
      if (!locked) {
        this._addText(`[${i + 1}]`, x + cardW / 2, y + cardH - 10, 11, 0x887766, true);
      }
    }

    this._addText("Press 1-8 to select (ESC to go back)", sw / 2, sh - 40, 14, 0x665544, true);
  }

  // -------------------------------------------------------------------------
  // HP Bar
  // -------------------------------------------------------------------------
  private _drawHPBar(p: PlayerState, _sw: number): void {
    const g = this._gfx;
    const barW = 200;
    const barH = 16;
    const x = 16;
    const y = 16;

    g.roundRect(x - 1, y - 1, barW + 2, barH + 2, 4).fill({ color: 0x000000 });
    g.roundRect(x, y, barW, barH, 3).fill({ color: 0x331111 });
    const hpFrac = Math.max(0, p.hp / p.maxHp);
    const hpColor = hpFrac > 0.5 ? 0x22cc22 : hpFrac > 0.25 ? 0xccaa22 : 0xcc2222;
    g.roundRect(x, y, barW * hpFrac, barH, 3).fill({ color: hpColor });

    this._addText(`${Math.ceil(p.hp)} / ${p.maxHp}`, x + barW / 2, y + barH / 2 - 1, 11, 0xffffff, true);
  }

  // -------------------------------------------------------------------------
  // XP Bar
  // -------------------------------------------------------------------------
  private _drawXPBar(p: PlayerState, _sw: number): void {
    const g = this._gfx;
    const barW = 200;
    const barH = 8;
    const x = 16;
    const y = 36;

    g.roundRect(x, y, barW, barH, 2).fill({ color: 0x111133 });
    const xpFrac = p.xp / p.xpToNext;
    g.roundRect(x, y, barW * xpFrac, barH, 2).fill({ color: 0x4488ff });

    this._addText(`Lv ${p.level}`, x + barW + 10, y + 2, 10, 0x4488ff);
  }

  // -------------------------------------------------------------------------
  // Stats
  // -------------------------------------------------------------------------
  private _drawStats(p: PlayerState, _sw: number, _sh: number): void {
    const x = 16;
    let y = 52;
    this._addText(`${p.knightDef.name} - ${p.knightDef.title}`, x, y, 11, p.knightDef.color);
    y += 16;
    this._addText(`ATK: ${p.attack}  DEF: ${p.defense}  SPD: ${p.speed}  CRIT: ${Math.round(p.critChance * 100)}%`, x, y, 10, 0xaaaaaa);
  }

  // -------------------------------------------------------------------------
  // Ability Cooldown
  // -------------------------------------------------------------------------
  private _drawAbilityCooldown(p: PlayerState, _sw: number): void {
    const g = this._gfx;
    const x = 16;
    const y = 86;
    const ability = p.knightDef.ability;

    g.roundRect(x, y, 160, 20, 4).fill({ color: 0x111122 });
    if (p.abilityCooldown <= 0) {
      g.roundRect(x, y, 160, 20, 4).fill({ color: 0x224488, alpha: 0.6 });
      this._addText(`[Q] ${ability.name} - READY`, x + 80, y + 9, 10, 0x88ccff, true);
    } else {
      const frac = 1 - p.abilityCooldown / ability.cooldown;
      g.roundRect(x, y, 160 * frac, 20, 4).fill({ color: 0x223344, alpha: 0.4 });
      this._addText(`[Q] ${ability.name} (${Math.ceil(p.abilityCooldown)})`, x + 80, y + 9, 10, 0x556677, true);
    }
  }

  // -------------------------------------------------------------------------
  // Floor Info
  // -------------------------------------------------------------------------
  private _drawFloorInfo(state: GrailGameState, sw: number): void {
    const themeIdx = Math.min(state.currentFloor, FLOOR_THEMES.length - 1);
    const theme = FLOOR_THEMES[themeIdx];
    const x = sw - 200;
    const y = 16;
    this._addText(`Floor ${state.currentFloor + 1} / ${state.totalFloors}`, x, y, 14, GOLD_COLOR);
    this._addText(theme.name, x, y + 20, 11, 0xaa9988);

    const alive = state.floor.enemies.filter((e) => e.alive).length;
    this._addText(`Enemies: ${alive}`, x, y + 38, 10, alive > 0 ? 0xff6644 : 0x44ff44);
  }

  // -------------------------------------------------------------------------
  // Minimap
  // -------------------------------------------------------------------------
  private _drawMinimap(floor: FloorState, player: PlayerState, sw: number, sh: number): void {
    const g = this._gfx;
    const mapW = 120;
    const mapH = 90;
    const mx = sw - mapW - 16;
    const my = sh - mapH - 16;

    g.rect(mx - 1, my - 1, mapW + 2, mapH + 2).fill({ color: 0x000000, alpha: 0.8 });

    const scaleX = mapW / floor.width;
    const scaleY = mapH / floor.height;

    for (let r = 0; r < floor.height; r++) {
      for (let c = 0; c < floor.width; c++) {
        if (!floor.explored[r][c]) continue;
        const tile = floor.tiles[r][c];
        if (tile === TileType.WALL) continue;
        let color = 0x333333;
        if (tile === TileType.STAIRS_DOWN) color = 0x44aaff;
        else if (tile === TileType.ENTRANCE) color = 0x22aa22;
        else if (tile === TileType.TREASURE) color = 0xccaa44;
        else if (tile === TileType.TRAP) color = 0x553322;
        else color = 0x444444;

        const px = mx + c * scaleX;
        const py = my + r * scaleY;
        g.rect(px, py, Math.max(1, scaleX), Math.max(1, scaleY)).fill({ color });
      }
    }

    // Enemies
    for (const e of floor.enemies) {
      if (!e.alive) continue;
      const ec = e.x / GameBalance.TILE_SIZE;
      const er = e.y / GameBalance.TILE_SIZE;
      if (er >= 0 && er < floor.height && ec >= 0 && ec < floor.width && floor.explored[Math.floor(er)][Math.floor(ec)]) {
        const color = e.def.isBoss ? 0xff0000 : 0xff6644;
        g.circle(mx + ec * scaleX, my + er * scaleY, e.def.isBoss ? 2 : 1).fill({ color });
      }
    }

    // Player
    const pc = player.x / GameBalance.TILE_SIZE;
    const pr = player.y / GameBalance.TILE_SIZE;
    g.circle(mx + pc * scaleX, my + pr * scaleY, 2).fill({ color: 0x00ff00 });
  }

  // -------------------------------------------------------------------------
  // Inventory Bar (bottom of screen)
  // -------------------------------------------------------------------------
  private _drawInventoryBar(p: PlayerState, sw: number, sh: number): void {
    const g = this._gfx;
    const slotSize = 32;
    const gap = 4;
    const maxSlots = GameBalance.MAX_INVENTORY_SIZE;
    const totalW = maxSlots * (slotSize + gap);
    const startX = (sw - totalW) / 2;
    const y = sh - slotSize - 12;

    for (let i = 0; i < maxSlots; i++) {
      const x = startX + i * (slotSize + gap);
      g.roundRect(x, y, slotSize, slotSize, 3).fill({ color: 0x1a1510, alpha: 0.8 });
      g.roundRect(x, y, slotSize, slotSize, 3).stroke({ color: 0x443322, width: 1 });

      if (i < p.inventory.length) {
        const inv = p.inventory[i];
        g.roundRect(x + 2, y + 2, slotSize - 4, slotSize - 4, 2).fill({ color: inv.def.color, alpha: 0.6 });
        if (inv.quantity > 1) {
          this._addText(`${inv.quantity}`, x + slotSize - 6, y + slotSize - 8, 8, 0xffffff);
        }
      }
    }

    // Equipped slots
    const eqX = startX - 120;
    // Weapon
    g.roundRect(eqX, y, slotSize, slotSize, 3).fill({ color: 0x1a1510, alpha: 0.8 });
    g.roundRect(eqX, y, slotSize, slotSize, 3).stroke({ color: 0x664422, width: 1 });
    if (p.equippedWeapon) {
      g.roundRect(eqX + 2, y + 2, slotSize - 4, slotSize - 4, 2).fill({ color: p.equippedWeapon.color, alpha: 0.6 });
    }
    this._addText("WPN", eqX + slotSize / 2, y - 8, 8, 0x887766, true);

    // Armor
    const arX = eqX + slotSize + gap;
    g.roundRect(arX, y, slotSize, slotSize, 3).fill({ color: 0x1a1510, alpha: 0.8 });
    g.roundRect(arX, y, slotSize, slotSize, 3).stroke({ color: 0x664422, width: 1 });
    if (p.equippedArmor) {
      g.roundRect(arX + 2, y + 2, slotSize - 4, slotSize - 4, 2).fill({ color: p.equippedArmor.color, alpha: 0.6 });
    }
    this._addText("ARM", arX + slotSize / 2, y - 8, 8, 0x887766, true);

    // Relic
    const rlX = arX + slotSize + gap;
    g.roundRect(rlX, y, slotSize, slotSize, 3).fill({ color: 0x1a1510, alpha: 0.8 });
    g.roundRect(rlX, y, slotSize, slotSize, 3).stroke({ color: 0x664422, width: 1 });
    if (p.equippedRelic) {
      g.roundRect(rlX + 2, y + 2, slotSize - 4, slotSize - 4, 2).fill({ color: p.equippedRelic.color, alpha: 0.6 });
    }
    this._addText("RLC", rlX + slotSize / 2, y - 8, 8, 0x887766, true);

    this._addText("[I] Inventory  [E] Interact  [Q] Ability  [WASD] Move  [SPACE] Attack", sw / 2, sh - 4, 9, 0x555544, true);
  }

  // -------------------------------------------------------------------------
  // Gold
  // -------------------------------------------------------------------------
  private _drawGold(p: PlayerState, sw: number): void {
    this._addText(`Gold: ${p.gold}`, sw - 200, 72, 12, GOLD_COLOR);
  }

  // -------------------------------------------------------------------------
  // Inventory Screen (full overlay)
  // -------------------------------------------------------------------------
  private _drawInventoryScreen(state: GrailGameState, sw: number, sh: number): void {
    const g = this._gfx;
    const p = state.player;

    g.rect(0, 0, sw, sh).fill({ color: 0x000000, alpha: 0.8 });
    this._addText("INVENTORY", sw / 2, 40, 24, GOLD_COLOR, true);
    this._addText("Press number key to equip/use. ESC to close.", sw / 2, 70, 12, 0x887766, true);

    const startX = sw / 2 - 200;
    let y = 100;

    for (let i = 0; i < p.inventory.length; i++) {
      const inv = p.inventory[i];
      const rarityColor = GameBalance.RARITY_COLORS[inv.def.rarity as keyof typeof GameBalance.RARITY_COLORS] ?? 0xaaaaaa;
      this._addText(`[${i + 1}] ${inv.def.name}${inv.quantity > 1 ? ` x${inv.quantity}` : ""}`, startX, y, 13, rarityColor);
      this._addText(`${inv.def.desc}`, startX + 20, y + 16, 10, 0x888877);
      y += 38;
    }

    if (p.inventory.length === 0) {
      this._addText("Your pack is empty.", sw / 2, 140, 14, 0x666655, true);
    }

    // Show equipped
    y = 100;
    const eqX = sw / 2 + 100;
    this._addText("Equipped:", eqX, y, 14, 0xccbbaa);
    y += 24;
    this._addText(`Weapon: ${p.equippedWeapon?.name ?? "None"}`, eqX, y, 12, p.equippedWeapon ? (GameBalance.RARITY_COLORS[p.equippedWeapon.rarity as keyof typeof GameBalance.RARITY_COLORS] ?? 0xaaaaaa) : 0x555555);
    y += 20;
    this._addText(`Armor:  ${p.equippedArmor?.name ?? "None"}`, eqX, y, 12, p.equippedArmor ? (GameBalance.RARITY_COLORS[p.equippedArmor.rarity as keyof typeof GameBalance.RARITY_COLORS] ?? 0xaaaaaa) : 0x555555);
    y += 20;
    this._addText(`Relic:  ${p.equippedRelic?.name ?? "None"}`, eqX, y, 12, p.equippedRelic ? (GameBalance.RARITY_COLORS[p.equippedRelic.rarity as keyof typeof GameBalance.RARITY_COLORS] ?? 0xaaaaaa) : 0x555555);
  }

  // -------------------------------------------------------------------------
  // Game Over
  // -------------------------------------------------------------------------
  private _drawGameOver(state: GrailGameState, sw: number, sh: number): void {
    const g = this._gfx;
    g.rect(0, 0, sw, sh).fill({ color: 0x110000, alpha: 0.9 });
    this._addText("FALLEN IN BATTLE", sw / 2, sh / 2 - 60, 32, 0xff2222, true);
    this._addText(`${state.player.knightDef.name} has perished on Floor ${state.currentFloor + 1}`, sw / 2, sh / 2 - 20, 16, 0xaa8888, true);
    this._addText(`Kills: ${state.totalKills}  Gold: ${state.totalGold}  Level: ${state.player.level}`, sw / 2, sh / 2 + 10, 14, 0x888888, true);
    const elapsed = Math.floor((Date.now() - state.startTime) / 1000);
    this._addText(`Time: ${Math.floor(elapsed / 60)}m ${elapsed % 60}s`, sw / 2, sh / 2 + 30, 12, 0x666666, true);
    this._addText("Press ENTER to try again  |  ESC to exit", sw / 2, sh / 2 + 70, 14, 0x887766, true);
  }

  // -------------------------------------------------------------------------
  // Victory
  // -------------------------------------------------------------------------
  private _drawVictory(state: GrailGameState, sw: number, sh: number): void {
    const g = this._gfx;
    g.rect(0, 0, sw, sh).fill({ color: 0x0a0805, alpha: 0.9 });
    this._addText("THE GRAIL IS FOUND!", sw / 2, sh / 2 - 60, 32, GOLD_COLOR, true);
    this._addText(`${state.player.knightDef.name} has completed the quest!`, sw / 2, sh / 2 - 20, 16, 0xccbbaa, true);
    this._addText(`Kills: ${state.totalKills}  Gold: ${state.totalGold}  Level: ${state.player.level}`, sw / 2, sh / 2 + 10, 14, 0xaa9988, true);
    this._addText(`Bosses Slain: ${state.killedBosses.length}`, sw / 2, sh / 2 + 30, 12, 0xff6644, true);
    const elapsed = Math.floor((Date.now() - state.startTime) / 1000);
    this._addText(`Time: ${Math.floor(elapsed / 60)}m ${elapsed % 60}s`, sw / 2, sh / 2 + 50, 12, 0x888888, true);
    this._addText("Press ENTER to play again  |  ESC to exit", sw / 2, sh / 2 + 90, 14, 0x887766, true);
  }

  // -------------------------------------------------------------------------
  // Paused
  // -------------------------------------------------------------------------
  private _drawPaused(sw: number, sh: number): void {
    const g = this._gfx;
    g.rect(0, 0, sw, sh).fill({ color: 0x000000, alpha: 0.6 });
    this._addText("PAUSED", sw / 2, sh / 2, 28, 0xcccccc, true);
    this._addText("Press P to resume  |  ESC to exit", sw / 2, sh / 2 + 40, 14, 0x888888, true);
  }

  // -------------------------------------------------------------------------
  // Notification
  // -------------------------------------------------------------------------
  showNotification(text: string, color: number, duration: number = 2): void {
    this._notification = { text, color, timer: duration };
  }

  private _drawNotification(sw: number, _sh: number, dt: number): void {
    if (!this._notification) return;
    this._notification.timer -= dt;
    if (this._notification.timer <= 0) {
      this._notification = null;
      return;
    }
    const alpha = Math.min(1, this._notification.timer);
    this._addText(this._notification.text, sw / 2, 140, 18, this._notification.color, true, alpha);
  }

  // -------------------------------------------------------------------------
  // Helpers
  // -------------------------------------------------------------------------
  private _addText(
    str: string, x: number, y: number, size: number, color: number,
    centered = false, alpha = 1,
  ): void {
    const style = new TextStyle({
      fontFamily: FONT,
      fontSize: size,
      fill: color,
      align: centered ? "center" : "left",
    });
    const t = new Text({ text: str, style });
    t.alpha = alpha;
    if (centered) {
      t.anchor.set(0.5, 0.5);
    }
    t.x = x;
    t.y = y;
    this._texts.push(t);
    this.container.addChild(t);
  }

  // -------------------------------------------------------------------------
  // Cleanup
  // -------------------------------------------------------------------------
  cleanup(): void {
    this._gfx.clear();
    for (const t of this._texts) {
      t.destroy();
    }
    this._texts.length = 0;
    this.container.removeChildren();
  }
}
