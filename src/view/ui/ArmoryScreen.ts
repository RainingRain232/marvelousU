// Armory screen — equip items that boost hero unit stats before game start.
// Layout: 1622×980 card (matching RaceDetailScreen) with item grid,
// weapon image display, and detail panel.
import {
  Container, Graphics, Text, TextStyle, Sprite, Texture, Assets,
} from "pixi.js";
import type { ViewManager } from "@view/ViewManager";
import {
  ARMORY_ITEMS,
  MAX_EQUIPPED_ITEMS,
  type ArmoryItemDef,
  type ArmoryItemId,
} from "@sim/config/ArmoryItemDefs";

// Vite static image imports
import longswordImgUrl from "@/img/longsword.png";
import spearImgUrl from "@/img/spear.png";
import displaycaseImgUrl from "@/img/displaycase.png";
import armoryImgUrl from "@/img/armory.png";

/** Map of item IDs that have dedicated weapon images. */
const ITEM_IMAGES: Record<string, string> = {
  longsword: longswordImgUrl,
  spear: spearImgUrl,
};

// ---------------------------------------------------------------------------
// Icon drawing helpers
// ---------------------------------------------------------------------------

function drawLongswordIcon(g: Graphics, cx: number, cy: number, size: number): void {
  const s = size / 30;
  // Blade
  g.roundRect(cx - 2 * s, cy - 12 * s, 4 * s, 18 * s, 0.5 * s).fill({ color: 0xc0c8d8 });
  // Blade highlight
  g.rect(cx - 0.5 * s, cy - 11 * s, 1 * s, 16 * s).fill({ color: 0xe8eef8, alpha: 0.4 });
  // Crossguard
  g.roundRect(cx - 7 * s, cy + 5 * s, 14 * s, 2.5 * s, 0.5 * s).fill({ color: 0xaa8844 });
  // Handle
  g.roundRect(cx - 1.5 * s, cy + 7.5 * s, 3 * s, 5 * s, 0.5 * s).fill({ color: 0x664422 });
  // Pommel
  g.circle(cx, cy + 13.5 * s, 2 * s).fill({ color: 0xaa8844 });
}

function drawSpearIcon(g: Graphics, cx: number, cy: number, size: number): void {
  const s = size / 30;
  // Shaft
  g.roundRect(cx - 1.2 * s, cy - 4 * s, 2.4 * s, 22 * s, 0.5 * s).fill({ color: 0x886644 });
  // Spearhead (triangle)
  g.poly([
    cx, cy - 14 * s,
    cx + 4 * s, cy - 4 * s,
    cx - 4 * s, cy - 4 * s,
  ]).fill({ color: 0xaabbcc });
  // Spearhead highlight
  g.poly([
    cx - 0.5 * s, cy - 13 * s,
    cx + 1.5 * s, cy - 5 * s,
    cx - 1.5 * s, cy - 5 * s,
  ]).fill({ color: 0xc8d4e0, alpha: 0.4 });
}

function drawLeatherArmorIcon(g: Graphics, cx: number, cy: number, size: number): void {
  const s = size / 30;
  // Torso shape
  g.roundRect(cx - 8 * s, cy - 9 * s, 16 * s, 18 * s, 2 * s).fill({ color: 0x8B6914 });
  // Shoulder straps
  g.roundRect(cx - 10 * s, cy - 11 * s, 5 * s, 6 * s, 1 * s).fill({ color: 0x9a7824 });
  g.roundRect(cx + 5 * s, cy - 11 * s, 5 * s, 6 * s, 1 * s).fill({ color: 0x9a7824 });
  // Neckline
  g.poly([cx - 3 * s, cy - 9 * s, cx, cy - 5 * s, cx + 3 * s, cy - 9 * s]).fill({ color: 0x7a5910, alpha: 0.6 });
  // Stitching lines
  g.rect(cx - 0.3 * s, cy - 6 * s, 0.6 * s, 14 * s).fill({ color: 0x6a4a08, alpha: 0.5 });
  // Belt
  g.roundRect(cx - 9 * s, cy + 4 * s, 18 * s, 2.5 * s, 0.5 * s).fill({ color: 0x6a4a08 });
  // Belt buckle
  g.roundRect(cx - 1.5 * s, cy + 3.5 * s, 3 * s, 3.5 * s, 0.5 * s).fill({ color: 0xccaa44 });
  // Leather texture highlights
  g.rect(cx - 5 * s, cy - 3 * s, 3 * s, 0.5 * s).fill({ color: 0xa08830, alpha: 0.3 });
  g.rect(cx + 2 * s, cy + 0 * s, 4 * s, 0.5 * s).fill({ color: 0xa08830, alpha: 0.3 });
}

function drawLeatherSandalsIcon(g: Graphics, cx: number, cy: number, size: number): void {
  const s = size / 30;
  // Left sole
  g.roundRect(cx - 10 * s, cy + 1 * s, 8 * s, 12 * s, 2 * s).fill({ color: 0x7a5520 });
  // Right sole
  g.roundRect(cx + 2 * s, cy + 1 * s, 8 * s, 12 * s, 2 * s).fill({ color: 0x7a5520 });
  // Left straps
  g.roundRect(cx - 9 * s, cy + 2 * s, 6 * s, 1.5 * s, 0.3 * s).fill({ color: 0x996633 });
  g.roundRect(cx - 9 * s, cy + 5 * s, 6 * s, 1.5 * s, 0.3 * s).fill({ color: 0x996633 });
  g.roundRect(cx - 8 * s, cy + 8 * s, 5 * s, 1.5 * s, 0.3 * s).fill({ color: 0x996633 });
  // Right straps
  g.roundRect(cx + 3 * s, cy + 2 * s, 6 * s, 1.5 * s, 0.3 * s).fill({ color: 0x996633 });
  g.roundRect(cx + 3 * s, cy + 5 * s, 6 * s, 1.5 * s, 0.3 * s).fill({ color: 0x996633 });
  g.roundRect(cx + 4 * s, cy + 8 * s, 5 * s, 1.5 * s, 0.3 * s).fill({ color: 0x996633 });
  // Ankle lacing (going up)
  g.rect(cx - 6 * s, cy - 3 * s, 1 * s, 5 * s).fill({ color: 0x996633, alpha: 0.7 });
  g.rect(cx + 5 * s, cy - 3 * s, 1 * s, 5 * s).fill({ color: 0x996633, alpha: 0.7 });
  // Wing flourish on left sandal
  g.poly([cx - 11 * s, cy - 1 * s, cx - 13 * s, cy - 5 * s, cx - 9 * s, cy - 3 * s]).fill({ color: 0xccaa66, alpha: 0.5 });
  // Wing flourish on right sandal
  g.poly([cx + 11 * s, cy - 1 * s, cx + 13 * s, cy - 5 * s, cx + 9 * s, cy - 3 * s]).fill({ color: 0xccaa66, alpha: 0.5 });
}

function drawSteelShieldIcon(g: Graphics, cx: number, cy: number, size: number): void {
  const s = size / 30;
  // Shield body (pointed bottom)
  g.poly([
    cx - 10 * s, cy - 11 * s,
    cx + 10 * s, cy - 11 * s,
    cx + 11 * s, cy - 9 * s,
    cx + 10 * s, cy + 4 * s,
    cx, cy + 14 * s,
    cx - 10 * s, cy + 4 * s,
    cx - 11 * s, cy - 9 * s,
  ]).fill({ color: 0x8899bb });
  // Shield rim
  g.poly([
    cx - 10 * s, cy - 11 * s,
    cx + 10 * s, cy - 11 * s,
    cx + 11 * s, cy - 9 * s,
    cx + 10 * s, cy + 4 * s,
    cx, cy + 14 * s,
    cx - 10 * s, cy + 4 * s,
    cx - 11 * s, cy - 9 * s,
  ]).stroke({ color: 0xaabbdd, width: 1.2 * s });
  // Central vertical bar
  g.roundRect(cx - 1.5 * s, cy - 9 * s, 3 * s, 20 * s, 0.5 * s).fill({ color: 0x667799 });
  // Horizontal bar
  g.roundRect(cx - 8 * s, cy - 2 * s, 16 * s, 2.5 * s, 0.5 * s).fill({ color: 0x667799 });
  // Central boss (circle)
  g.circle(cx, cy - 2 * s, 3 * s).fill({ color: 0xaabbcc });
  g.circle(cx, cy - 2 * s, 2 * s).fill({ color: 0xc0ccdd });
  // Highlight sheen
  g.poly([
    cx - 6 * s, cy - 10 * s,
    cx - 3 * s, cy - 10 * s,
    cx - 5 * s, cy + 2 * s,
    cx - 8 * s, cy + 2 * s,
  ]).fill({ color: 0xddeeff, alpha: 0.15 });
}

function drawWarAxeIcon(g: Graphics, cx: number, cy: number, size: number): void {
  const s = size / 30;
  // Handle
  g.roundRect(cx - 1.2 * s, cy - 6 * s, 2.4 * s, 22 * s, 0.5 * s).fill({ color: 0x664422 });
  // Handle grip wrapping
  g.rect(cx - 1.5 * s, cy + 8 * s, 3 * s, 1 * s).fill({ color: 0x553311, alpha: 0.6 });
  g.rect(cx - 1.5 * s, cy + 11 * s, 3 * s, 1 * s).fill({ color: 0x553311, alpha: 0.6 });
  g.rect(cx - 1.5 * s, cy + 14 * s, 3 * s, 1 * s).fill({ color: 0x553311, alpha: 0.6 });
  // Axe head right blade
  g.poly([
    cx + 1 * s, cy - 10 * s,
    cx + 11 * s, cy - 6 * s,
    cx + 12 * s, cy - 3 * s,
    cx + 11 * s, cy + 0 * s,
    cx + 1 * s, cy + 4 * s,
  ]).fill({ color: 0xaa4444 });
  // Axe head left blade (double-headed)
  g.poly([
    cx - 1 * s, cy - 10 * s,
    cx - 11 * s, cy - 6 * s,
    cx - 12 * s, cy - 3 * s,
    cx - 11 * s, cy + 0 * s,
    cx - 1 * s, cy + 4 * s,
  ]).fill({ color: 0x993333 });
  // Edge highlight right
  g.poly([
    cx + 10 * s, cy - 5 * s,
    cx + 12 * s, cy - 3 * s,
    cx + 10 * s, cy - 1 * s,
  ]).fill({ color: 0xccaaaa, alpha: 0.4 });
  // Edge highlight left
  g.poly([
    cx - 10 * s, cy - 5 * s,
    cx - 12 * s, cy - 3 * s,
    cx - 10 * s, cy - 1 * s,
  ]).fill({ color: 0xccaaaa, alpha: 0.3 });
}

function drawChainmailIcon(g: Graphics, cx: number, cy: number, size: number): void {
  const s = size / 30;
  // Torso shape
  g.roundRect(cx - 8 * s, cy - 9 * s, 16 * s, 18 * s, 2 * s).fill({ color: 0x777788 });
  // Shoulder guards
  g.roundRect(cx - 11 * s, cy - 11 * s, 6 * s, 5 * s, 1 * s).fill({ color: 0x888899 });
  g.roundRect(cx + 5 * s, cy - 11 * s, 6 * s, 5 * s, 1 * s).fill({ color: 0x888899 });
  // Neckline
  g.poly([cx - 3 * s, cy - 9 * s, cx, cy - 6 * s, cx + 3 * s, cy - 9 * s]).fill({ color: 0x666677 });
  // Chain ring pattern (rows of small circles)
  for (let row = 0; row < 5; row++) {
    const ry = cy - 4 * s + row * 3.5 * s;
    const offset = row % 2 === 0 ? 0 : 2 * s;
    for (let col = -2; col <= 2; col++) {
      const rx = cx + col * 4 * s + offset;
      if (rx > cx - 7 * s && rx < cx + 7 * s) {
        g.circle(rx, ry, 1.2 * s).stroke({ color: 0x999aaa, width: 0.5 * s });
      }
    }
  }
  // Bottom hem
  g.roundRect(cx - 9 * s, cy + 7 * s, 18 * s, 2 * s, 0.5 * s).fill({ color: 0x666677 });
}

function drawIronBootsIcon(g: Graphics, cx: number, cy: number, size: number): void {
  const s = size / 30;
  // Left boot
  g.poly([
    cx - 10 * s, cy - 8 * s,
    cx - 3 * s, cy - 8 * s,
    cx - 3 * s, cy + 8 * s,
    cx - 12 * s, cy + 8 * s,
    cx - 13 * s, cy + 10 * s,
    cx - 14 * s, cy + 12 * s,
    cx - 4 * s, cy + 12 * s,
    cx - 2 * s, cy + 10 * s,
    cx - 2 * s, cy + 8 * s,
  ]).fill({ color: 0x556666 });
  // Right boot
  g.poly([
    cx + 3 * s, cy - 8 * s,
    cx + 10 * s, cy - 8 * s,
    cx + 10 * s, cy + 8 * s,
    cx + 2 * s, cy + 8 * s,
    cx + 2 * s, cy + 10 * s,
    cx + 4 * s, cy + 12 * s,
    cx + 14 * s, cy + 12 * s,
    cx + 13 * s, cy + 10 * s,
    cx + 12 * s, cy + 8 * s,
  ]).fill({ color: 0x556666 });
  // Metal plate bands left
  g.roundRect(cx - 10 * s, cy - 5 * s, 7 * s, 2 * s, 0.3 * s).fill({ color: 0x778888 });
  g.roundRect(cx - 10 * s, cy + 0 * s, 7 * s, 2 * s, 0.3 * s).fill({ color: 0x778888 });
  g.roundRect(cx - 10 * s, cy + 5 * s, 7 * s, 2 * s, 0.3 * s).fill({ color: 0x778888 });
  // Metal plate bands right
  g.roundRect(cx + 3 * s, cy - 5 * s, 7 * s, 2 * s, 0.3 * s).fill({ color: 0x778888 });
  g.roundRect(cx + 3 * s, cy + 0 * s, 7 * s, 2 * s, 0.3 * s).fill({ color: 0x778888 });
  g.roundRect(cx + 3 * s, cy + 5 * s, 7 * s, 2 * s, 0.3 * s).fill({ color: 0x778888 });
  // Rivets
  g.circle(cx - 9 * s, cy - 4 * s, 0.7 * s).fill({ color: 0x99aaaa });
  g.circle(cx - 9 * s, cy + 1 * s, 0.7 * s).fill({ color: 0x99aaaa });
  g.circle(cx + 9 * s, cy - 4 * s, 0.7 * s).fill({ color: 0x99aaaa });
  g.circle(cx + 9 * s, cy + 1 * s, 0.7 * s).fill({ color: 0x99aaaa });
  // Sole highlight
  g.roundRect(cx - 13 * s, cy + 11 * s, 9 * s, 1.5 * s, 0.3 * s).fill({ color: 0x445555 });
  g.roundRect(cx + 5 * s, cy + 11 * s, 9 * s, 1.5 * s, 0.3 * s).fill({ color: 0x445555 });
}

function drawFlamingSwordIcon(g: Graphics, cx: number, cy: number, size: number): void {
  const s = size / 30;
  // Blade
  g.roundRect(cx - 2 * s, cy - 12 * s, 4 * s, 18 * s, 0.5 * s).fill({ color: 0xdd6633 });
  // Blade core glow
  g.rect(cx - 0.8 * s, cy - 11 * s, 1.6 * s, 16 * s).fill({ color: 0xff9944, alpha: 0.6 });
  // Flame wisps left
  g.poly([cx - 3 * s, cy - 10 * s, cx - 6 * s, cy - 13 * s, cx - 2 * s, cy - 8 * s]).fill({ color: 0xff6622, alpha: 0.6 });
  g.poly([cx - 3 * s, cy - 5 * s, cx - 5 * s, cy - 8 * s, cx - 2 * s, cy - 3 * s]).fill({ color: 0xff8833, alpha: 0.5 });
  // Flame wisps right
  g.poly([cx + 3 * s, cy - 8 * s, cx + 6 * s, cy - 12 * s, cx + 2 * s, cy - 6 * s]).fill({ color: 0xff6622, alpha: 0.6 });
  g.poly([cx + 3 * s, cy - 3 * s, cx + 5 * s, cy - 6 * s, cx + 2 * s, cy - 1 * s]).fill({ color: 0xff8833, alpha: 0.5 });
  // Tip flame
  g.poly([cx, cy - 15 * s, cx - 2 * s, cy - 12 * s, cx + 2 * s, cy - 12 * s]).fill({ color: 0xffaa22 });
  // Crossguard
  g.roundRect(cx - 7 * s, cy + 5 * s, 14 * s, 2.5 * s, 0.5 * s).fill({ color: 0xcc4422 });
  // Handle
  g.roundRect(cx - 1.5 * s, cy + 7.5 * s, 3 * s, 5 * s, 0.5 * s).fill({ color: 0x442211 });
  // Pommel
  g.circle(cx, cy + 13.5 * s, 2 * s).fill({ color: 0xff6622 });
  // Ember glow
  g.circle(cx, cy - 4 * s, 4 * s).fill({ color: 0xff4400, alpha: 0.15 });
}

function drawElvenBowIcon(g: Graphics, cx: number, cy: number, size: number): void {
  const s = size / 30;
  // Bow limb (curved arc) - left side
  g.poly([
    cx - 2 * s, cy - 13 * s,
    cx - 4 * s, cy - 10 * s,
    cx - 6 * s, cy - 5 * s,
    cx - 7 * s, cy + 0 * s,
    cx - 6 * s, cy + 5 * s,
    cx - 4 * s, cy + 10 * s,
    cx - 2 * s, cy + 13 * s,
    cx - 1 * s, cy + 12 * s,
    cx - 3 * s, cy + 9 * s,
    cx - 5 * s, cy + 4 * s,
    cx - 5.5 * s, cy + 0 * s,
    cx - 5 * s, cy - 4 * s,
    cx - 3 * s, cy - 9 * s,
    cx - 1 * s, cy - 12 * s,
  ]).fill({ color: 0x44aa44 });
  // Bowstring
  g.rect(cx - 2 * s, cy - 13 * s, 0.5 * s, 26 * s).fill({ color: 0xccddaa, alpha: 0.7 });
  // Leaf ornament top
  g.poly([cx - 2 * s, cy - 14 * s, cx - 4 * s, cy - 16 * s, cx + 0 * s, cy - 14 * s]).fill({ color: 0x66cc66, alpha: 0.6 });
  // Leaf ornament bottom
  g.poly([cx - 2 * s, cy + 14 * s, cx - 4 * s, cy + 16 * s, cx + 0 * s, cy + 14 * s]).fill({ color: 0x66cc66, alpha: 0.6 });
  // Arrow
  g.rect(cx + 1 * s, cy - 8 * s, 1 * s, 16 * s).fill({ color: 0x886644 });
  // Arrowhead
  g.poly([cx + 1.5 * s, cy - 12 * s, cx - 0.5 * s, cy - 8 * s, cx + 3.5 * s, cy - 8 * s]).fill({ color: 0xaabbcc });
  // Arrow fletching
  g.poly([cx + 0 * s, cy + 6 * s, cx + 1 * s, cy + 8 * s, cx + 0 * s, cy + 10 * s]).fill({ color: 0x66cc66, alpha: 0.5 });
  g.poly([cx + 3 * s, cy + 6 * s, cx + 2 * s, cy + 8 * s, cx + 3 * s, cy + 10 * s]).fill({ color: 0x66cc66, alpha: 0.5 });
  // Grip wrapping
  g.roundRect(cx - 6 * s, cy - 2 * s, 3 * s, 4 * s, 0.5 * s).fill({ color: 0x338833, alpha: 0.5 });
}

function drawPlateArmorIcon(g: Graphics, cx: number, cy: number, size: number): void {
  const s = size / 30;
  // Torso plate
  g.roundRect(cx - 9 * s, cy - 9 * s, 18 * s, 18 * s, 2 * s).fill({ color: 0x9999bb });
  // Shoulder pauldrons
  g.roundRect(cx - 13 * s, cy - 12 * s, 8 * s, 7 * s, 2 * s).fill({ color: 0xaaaacc });
  g.roundRect(cx + 5 * s, cy - 12 * s, 8 * s, 7 * s, 2 * s).fill({ color: 0xaaaacc });
  // Pauldron ridges
  g.roundRect(cx - 12 * s, cy - 11 * s, 6 * s, 1.2 * s, 0.3 * s).fill({ color: 0xbbbbdd, alpha: 0.5 });
  g.roundRect(cx - 12 * s, cy - 9 * s, 6 * s, 1.2 * s, 0.3 * s).fill({ color: 0xbbbbdd, alpha: 0.5 });
  g.roundRect(cx + 6 * s, cy - 11 * s, 6 * s, 1.2 * s, 0.3 * s).fill({ color: 0xbbbbdd, alpha: 0.5 });
  g.roundRect(cx + 6 * s, cy - 9 * s, 6 * s, 1.2 * s, 0.3 * s).fill({ color: 0xbbbbdd, alpha: 0.5 });
  // Neckguard
  g.poly([cx - 4 * s, cy - 9 * s, cx, cy - 5 * s, cx + 4 * s, cy - 9 * s]).fill({ color: 0x888aaa });
  // Center crest line
  g.rect(cx - 0.5 * s, cy - 6 * s, 1 * s, 14 * s).fill({ color: 0x7778aa, alpha: 0.6 });
  // Chest plate sections
  g.roundRect(cx - 7 * s, cy - 4 * s, 6 * s, 7 * s, 1 * s).fill({ color: 0xa5a5cc, alpha: 0.3 });
  g.roundRect(cx + 1 * s, cy - 4 * s, 6 * s, 7 * s, 1 * s).fill({ color: 0xa5a5cc, alpha: 0.3 });
  // Waist plate
  g.roundRect(cx - 9 * s, cy + 5 * s, 18 * s, 3 * s, 0.5 * s).fill({ color: 0x8888aa });
  // Metal sheen highlights
  g.poly([
    cx - 6 * s, cy - 8 * s,
    cx - 4 * s, cy - 8 * s,
    cx - 5 * s, cy + 3 * s,
    cx - 7 * s, cy + 3 * s,
  ]).fill({ color: 0xddddff, alpha: 0.12 });
  // Rivets
  g.circle(cx - 7 * s, cy - 3 * s, 0.8 * s).fill({ color: 0xccccdd });
  g.circle(cx + 7 * s, cy - 3 * s, 0.8 * s).fill({ color: 0xccccdd });
  g.circle(cx - 7 * s, cy + 4 * s, 0.8 * s).fill({ color: 0xccccdd });
  g.circle(cx + 7 * s, cy + 4 * s, 0.8 * s).fill({ color: 0xccccdd });
}

function drawWingedBootsIcon(g: Graphics, cx: number, cy: number, size: number): void {
  const s = size / 30;
  // Boot body
  g.poly([
    cx - 3 * s, cy - 6 * s,
    cx + 3 * s, cy - 6 * s,
    cx + 3 * s, cy + 6 * s,
    cx + 8 * s, cy + 6 * s,
    cx + 9 * s, cy + 8 * s,
    cx + 8 * s, cy + 10 * s,
    cx - 4 * s, cy + 10 * s,
    cx - 5 * s, cy + 8 * s,
    cx - 4 * s, cy + 6 * s,
  ]).fill({ color: 0x7799cc });
  // Boot trim
  g.roundRect(cx - 4 * s, cy - 7 * s, 8 * s, 3 * s, 1 * s).fill({ color: 0x99bbee });
  // Left wing
  g.poly([
    cx - 4 * s, cy - 2 * s,
    cx - 10 * s, cy - 8 * s,
    cx - 13 * s, cy - 10 * s,
    cx - 11 * s, cy - 6 * s,
    cx - 14 * s, cy - 7 * s,
    cx - 11 * s, cy - 3 * s,
    cx - 12 * s, cy - 3 * s,
    cx - 8 * s, cy + 1 * s,
    cx - 4 * s, cy + 2 * s,
  ]).fill({ color: 0xeeeeff });
  // Right wing
  g.poly([
    cx + 4 * s, cy - 2 * s,
    cx + 10 * s, cy - 8 * s,
    cx + 13 * s, cy - 10 * s,
    cx + 11 * s, cy - 6 * s,
    cx + 14 * s, cy - 7 * s,
    cx + 11 * s, cy - 3 * s,
    cx + 12 * s, cy - 3 * s,
    cx + 8 * s, cy + 1 * s,
    cx + 4 * s, cy + 2 * s,
  ]).fill({ color: 0xeeeeff });
  // Wing feather details
  g.poly([cx - 6 * s, cy - 4 * s, cx - 9 * s, cy - 7 * s, cx - 7 * s, cy - 3 * s]).fill({ color: 0xddddef, alpha: 0.5 });
  g.poly([cx + 6 * s, cy - 4 * s, cx + 9 * s, cy - 7 * s, cx + 7 * s, cy - 3 * s]).fill({ color: 0xddddef, alpha: 0.5 });
  // Sole
  g.roundRect(cx - 5 * s, cy + 9 * s, 14 * s, 2 * s, 0.5 * s).fill({ color: 0x5577aa });
  // Magical sparkle
  g.circle(cx - 8 * s, cy - 6 * s, 0.8 * s).fill({ color: 0xffffff, alpha: 0.7 });
  g.circle(cx + 10 * s, cy - 5 * s, 0.6 * s).fill({ color: 0xffffff, alpha: 0.5 });
}

function drawMaceOfMightIcon(g: Graphics, cx: number, cy: number, size: number): void {
  const s = size / 30;
  // Handle
  g.roundRect(cx - 1.2 * s, cy + 0 * s, 2.4 * s, 16 * s, 0.5 * s).fill({ color: 0x664422 });
  // Handle grip
  g.rect(cx - 1.5 * s, cy + 9 * s, 3 * s, 1 * s).fill({ color: 0x553311, alpha: 0.6 });
  g.rect(cx - 1.5 * s, cy + 12 * s, 3 * s, 1 * s).fill({ color: 0x553311, alpha: 0.6 });
  // Mace head base
  g.circle(cx, cy - 4 * s, 6 * s).fill({ color: 0x777766 });
  // Flanges/spikes
  g.poly([cx, cy - 12 * s, cx - 2 * s, cy - 9 * s, cx + 2 * s, cy - 9 * s]).fill({ color: 0x888877 });
  g.poly([cx + 8 * s, cy - 4 * s, cx + 5 * s, cy - 6 * s, cx + 5 * s, cy - 2 * s]).fill({ color: 0x888877 });
  g.poly([cx - 8 * s, cy - 4 * s, cx - 5 * s, cy - 6 * s, cx - 5 * s, cy - 2 * s]).fill({ color: 0x888877 });
  g.poly([cx + 5 * s, cy + 2 * s, cx + 4 * s, cy - 0 * s, cx + 2 * s, cy + 2 * s]).fill({ color: 0x888877 });
  g.poly([cx - 5 * s, cy + 2 * s, cx - 4 * s, cy - 0 * s, cx - 2 * s, cy + 2 * s]).fill({ color: 0x888877 });
  // Diagonal flanges
  g.poly([cx + 6 * s, cy - 10 * s, cx + 3 * s, cy - 8 * s, cx + 5 * s, cy - 6 * s]).fill({ color: 0x888877 });
  g.poly([cx - 6 * s, cy - 10 * s, cx - 3 * s, cy - 8 * s, cx - 5 * s, cy - 6 * s]).fill({ color: 0x888877 });
  // Metal sheen
  g.circle(cx - 1 * s, cy - 5 * s, 2.5 * s).fill({ color: 0xaaaaaa, alpha: 0.2 });
  // Pommel
  g.circle(cx, cy + 16 * s, 1.8 * s).fill({ color: 0x776655 });
}

function drawHalberdIcon(g: Graphics, cx: number, cy: number, size: number): void {
  const s = size / 30;
  // Long shaft
  g.roundRect(cx - 1 * s, cy - 6 * s, 2 * s, 24 * s, 0.5 * s).fill({ color: 0x776644 });
  // Axe blade (one side)
  g.poly([
    cx + 1 * s, cy - 8 * s,
    cx + 9 * s, cy - 5 * s,
    cx + 10 * s, cy - 2 * s,
    cx + 9 * s, cy + 1 * s,
    cx + 1 * s, cy + 4 * s,
  ]).fill({ color: 0x778877 });
  // Blade edge highlight
  g.poly([
    cx + 8 * s, cy - 4 * s,
    cx + 10 * s, cy - 2 * s,
    cx + 8 * s, cy + 0 * s,
  ]).fill({ color: 0xaabbaa, alpha: 0.4 });
  // Back spike
  g.poly([
    cx - 1 * s, cy - 4 * s,
    cx - 6 * s, cy - 2 * s,
    cx - 1 * s, cy + 0 * s,
  ]).fill({ color: 0x667766 });
  // Top spike/spearpoint
  g.poly([
    cx, cy - 14 * s,
    cx + 2.5 * s, cy - 8 * s,
    cx - 2.5 * s, cy - 8 * s,
  ]).fill({ color: 0x99aa99 });
  // Spike highlight
  g.poly([
    cx - 0.5 * s, cy - 13 * s,
    cx + 1 * s, cy - 9 * s,
    cx - 1 * s, cy - 9 * s,
  ]).fill({ color: 0xbbccbb, alpha: 0.4 });
  // Shaft reinforcement
  g.roundRect(cx - 2 * s, cy - 6 * s, 4 * s, 2 * s, 0.3 * s).fill({ color: 0x888877 });
  g.roundRect(cx - 2 * s, cy + 2 * s, 4 * s, 2 * s, 0.3 * s).fill({ color: 0x888877 });
}

function drawEnchantedCloakIcon(g: Graphics, cx: number, cy: number, size: number): void {
  const s = size / 30;
  // Cloak body (flowing shape)
  g.poly([
    cx - 3 * s, cy - 12 * s,
    cx + 3 * s, cy - 12 * s,
    cx + 5 * s, cy - 8 * s,
    cx + 10 * s, cy + 2 * s,
    cx + 12 * s, cy + 10 * s,
    cx + 10 * s, cy + 14 * s,
    cx + 4 * s, cy + 12 * s,
    cx, cy + 14 * s,
    cx - 4 * s, cy + 12 * s,
    cx - 10 * s, cy + 14 * s,
    cx - 12 * s, cy + 10 * s,
    cx - 10 * s, cy + 2 * s,
    cx - 5 * s, cy - 8 * s,
  ]).fill({ color: 0x5533aa });
  // Inner lining
  g.poly([
    cx - 2 * s, cy - 8 * s,
    cx + 2 * s, cy - 8 * s,
    cx + 6 * s, cy + 4 * s,
    cx + 4 * s, cy + 12 * s,
    cx, cy + 10 * s,
    cx - 4 * s, cy + 12 * s,
    cx - 6 * s, cy + 4 * s,
  ]).fill({ color: 0x7744cc, alpha: 0.4 });
  // Clasp at neck
  g.circle(cx, cy - 11 * s, 2.5 * s).fill({ color: 0xddaa22 });
  g.circle(cx, cy - 11 * s, 1.5 * s).fill({ color: 0xffcc44 });
  // Magical shimmer dots
  g.circle(cx - 5 * s, cy + 2 * s, 0.8 * s).fill({ color: 0xaa88ff, alpha: 0.6 });
  g.circle(cx + 3 * s, cy + 5 * s, 0.7 * s).fill({ color: 0xcc99ff, alpha: 0.5 });
  g.circle(cx - 2 * s, cy + 8 * s, 0.9 * s).fill({ color: 0xbb88ff, alpha: 0.4 });
  g.circle(cx + 6 * s, cy - 1 * s, 0.6 * s).fill({ color: 0xddaaff, alpha: 0.5 });
  g.circle(cx - 7 * s, cy + 7 * s, 0.7 * s).fill({ color: 0xaa88ff, alpha: 0.3 });
  // Hem glow
  g.poly([
    cx - 10 * s, cy + 13 * s,
    cx - 4 * s, cy + 11 * s,
    cx, cy + 13 * s,
    cx + 4 * s, cy + 11 * s,
    cx + 10 * s, cy + 13 * s,
  ]).stroke({ color: 0x9966dd, width: 0.8 * s, alpha: 0.4 });
}

function drawGiantsBeltIcon(g: Graphics, cx: number, cy: number, size: number): void {
  const s = size / 30;
  // Belt body (thick band)
  g.roundRect(cx - 14 * s, cy - 4 * s, 28 * s, 8 * s, 2 * s).fill({ color: 0x8B6914 });
  // Belt texture - leather grain
  g.rect(cx - 12 * s, cy - 2 * s, 24 * s, 0.5 * s).fill({ color: 0x7a5910, alpha: 0.4 });
  g.rect(cx - 12 * s, cy + 1 * s, 24 * s, 0.5 * s).fill({ color: 0x7a5910, alpha: 0.4 });
  // Large buckle
  g.roundRect(cx - 5 * s, cy - 6 * s, 10 * s, 12 * s, 1.5 * s).fill({ color: 0xccaa44 });
  g.roundRect(cx - 3.5 * s, cy - 4.5 * s, 7 * s, 9 * s, 1 * s).fill({ color: 0x8B6914 });
  // Buckle prong
  g.roundRect(cx - 0.5 * s, cy - 5 * s, 1 * s, 6 * s, 0.3 * s).fill({ color: 0xddbb55 });
  // Studs along belt
  g.circle(cx - 10 * s, cy, 1.2 * s).fill({ color: 0xccaa44 });
  g.circle(cx + 10 * s, cy, 1.2 * s).fill({ color: 0xccaa44 });
  g.circle(cx - 7 * s, cy, 1 * s).fill({ color: 0xbbaa44, alpha: 0.6 });
  g.circle(cx + 7 * s, cy, 1 * s).fill({ color: 0xbbaa44, alpha: 0.6 });
  // Belt holes
  g.circle(cx + 12 * s, cy - 1 * s, 0.6 * s).fill({ color: 0x6a4a08 });
  g.circle(cx + 12 * s, cy + 1 * s, 0.6 * s).fill({ color: 0x6a4a08 });
  // Giant rune engraving on buckle
  g.rect(cx - 1.5 * s, cy + 1 * s, 3 * s, 0.8 * s).fill({ color: 0xddcc66, alpha: 0.5 });
  g.rect(cx - 0.4 * s, cy - 0 * s, 0.8 * s, 3 * s).fill({ color: 0xddcc66, alpha: 0.5 });
}

function drawDragonscaleMailIcon(g: Graphics, cx: number, cy: number, size: number): void {
  const s = size / 30;
  // Torso shape
  g.roundRect(cx - 9 * s, cy - 9 * s, 18 * s, 18 * s, 2 * s).fill({ color: 0xbb5511 });
  // Shoulder guards
  g.roundRect(cx - 12 * s, cy - 12 * s, 7 * s, 6 * s, 2 * s).fill({ color: 0xcc6622 });
  g.roundRect(cx + 5 * s, cy - 12 * s, 7 * s, 6 * s, 2 * s).fill({ color: 0xcc6622 });
  // Neckguard
  g.poly([cx - 3 * s, cy - 9 * s, cx, cy - 6 * s, cx + 3 * s, cy - 9 * s]).fill({ color: 0xaa4411 });
  // Scale pattern (overlapping rows)
  for (let row = 0; row < 4; row++) {
    const ry = cy - 4 * s + row * 4 * s;
    const offset = row % 2 === 0 ? 0 : 3 * s;
    for (let col = -2; col <= 2; col++) {
      const rx = cx + col * 6 * s + offset;
      if (rx > cx - 8 * s && rx < cx + 8 * s) {
        g.poly([
          rx, ry - 2 * s,
          rx + 2.5 * s, ry,
          rx, ry + 2.5 * s,
          rx - 2.5 * s, ry,
        ]).fill({ color: 0xdd7733, alpha: 0.5 });
        g.poly([
          rx, ry - 2 * s,
          rx + 2.5 * s, ry,
          rx, ry + 2.5 * s,
          rx - 2.5 * s, ry,
        ]).stroke({ color: 0xee8844, width: 0.3 * s, alpha: 0.4 });
      }
    }
  }
  // Waist plate
  g.roundRect(cx - 9 * s, cy + 6 * s, 18 * s, 2.5 * s, 0.5 * s).fill({ color: 0xaa4411 });
  // Fire-glow accent
  g.circle(cx, cy - 2 * s, 3 * s).fill({ color: 0xff6600, alpha: 0.1 });
}

function drawStormLanceIcon(g: Graphics, cx: number, cy: number, size: number): void {
  const s = size / 30;
  // Shaft
  g.roundRect(cx - 1.2 * s, cy - 2 * s, 2.4 * s, 20 * s, 0.5 * s).fill({ color: 0x556688 });
  // Lance head (elongated diamond)
  g.poly([
    cx, cy - 14 * s,
    cx + 3 * s, cy - 6 * s,
    cx, cy - 2 * s,
    cx - 3 * s, cy - 6 * s,
  ]).fill({ color: 0x6699dd });
  // Lance head highlight
  g.poly([
    cx - 0.5 * s, cy - 13 * s,
    cx + 1.5 * s, cy - 7 * s,
    cx - 0.5 * s, cy - 3 * s,
  ]).fill({ color: 0x88bbff, alpha: 0.4 });
  // Lightning bolt left
  g.poly([
    cx - 4 * s, cy - 10 * s,
    cx - 6 * s, cy - 7 * s,
    cx - 4.5 * s, cy - 7 * s,
    cx - 7 * s, cy - 3 * s,
    cx - 5 * s, cy - 5 * s,
    cx - 3.5 * s, cy - 5 * s,
  ]).fill({ color: 0x66bbff, alpha: 0.6 });
  // Lightning bolt right
  g.poly([
    cx + 4 * s, cy - 9 * s,
    cx + 7 * s, cy - 5 * s,
    cx + 5 * s, cy - 5 * s,
    cx + 6 * s, cy - 2 * s,
    cx + 4 * s, cy - 4 * s,
    cx + 3.5 * s, cy - 4 * s,
  ]).fill({ color: 0x66bbff, alpha: 0.6 });
  // Electric glow
  g.circle(cx, cy - 8 * s, 5 * s).fill({ color: 0x4488cc, alpha: 0.15 });
  // Handguard
  g.roundRect(cx - 5 * s, cy - 2 * s, 10 * s, 2 * s, 0.5 * s).fill({ color: 0x4477aa });
  // Grip wrapping
  g.rect(cx - 1.5 * s, cy + 4 * s, 3 * s, 1 * s).fill({ color: 0x445566, alpha: 0.5 });
  g.rect(cx - 1.5 * s, cy + 7 * s, 3 * s, 1 * s).fill({ color: 0x445566, alpha: 0.5 });
  g.rect(cx - 1.5 * s, cy + 10 * s, 3 * s, 1 * s).fill({ color: 0x445566, alpha: 0.5 });
  // Spark dots
  g.circle(cx - 5 * s, cy - 8 * s, 0.5 * s).fill({ color: 0xaaddff, alpha: 0.7 });
  g.circle(cx + 6 * s, cy - 6 * s, 0.4 * s).fill({ color: 0xaaddff, alpha: 0.6 });
}

function drawCrownOfValorIcon(g: Graphics, cx: number, cy: number, size: number): void {
  const s = size / 30;
  // Crown band
  g.roundRect(cx - 10 * s, cy + 0 * s, 20 * s, 6 * s, 1 * s).fill({ color: 0xddaa22 });
  // Crown points
  g.poly([cx - 9 * s, cy, cx - 8 * s, cy - 8 * s, cx - 5 * s, cy]).fill({ color: 0xddaa22 });
  g.poly([cx - 4 * s, cy, cx - 2 * s, cy - 11 * s, cx + 0 * s, cy]).fill({ color: 0xeebb33 });
  g.poly([cx + 1 * s, cy, cx + 2 * s, cy - 11 * s, cx + 4 * s, cy]).fill({ color: 0xddaa22 });
  g.poly([cx + 5 * s, cy, cx + 8 * s, cy - 8 * s, cx + 9 * s, cy]).fill({ color: 0xddaa22 });
  // Jewels on points
  g.circle(cx - 2 * s, cy - 8 * s, 1.5 * s).fill({ color: 0xff3333 });
  g.circle(cx + 2 * s, cy - 8 * s, 1.5 * s).fill({ color: 0x3355ff });
  g.circle(cx - 8 * s, cy - 5 * s, 1.2 * s).fill({ color: 0x33cc33 });
  g.circle(cx + 8 * s, cy - 5 * s, 1.2 * s).fill({ color: 0x33cc33 });
  // Band detail - gems along base
  g.circle(cx - 6 * s, cy + 3 * s, 1.3 * s).fill({ color: 0xff4444 });
  g.circle(cx, cy + 3 * s, 1.5 * s).fill({ color: 0x4488ff });
  g.circle(cx + 6 * s, cy + 3 * s, 1.3 * s).fill({ color: 0xff4444 });
  // Gold trim highlights
  g.roundRect(cx - 9 * s, cy - 0.5 * s, 18 * s, 1 * s, 0.3 * s).fill({ color: 0xffcc44, alpha: 0.4 });
  // Inner band shadow
  g.roundRect(cx - 9 * s, cy + 5 * s, 18 * s, 2 * s, 0.5 * s).fill({ color: 0xbb8811, alpha: 0.5 });
  // Velvet interior hint
  g.roundRect(cx - 7 * s, cy + 6 * s, 14 * s, 4 * s, 1 * s).fill({ color: 0x882222, alpha: 0.4 });
}

function drawShadowDaggerIcon(g: Graphics, cx: number, cy: number, size: number): void {
  const s = size / 30;
  // Shadow aura
  g.circle(cx, cy - 2 * s, 8 * s).fill({ color: 0x221133, alpha: 0.3 });
  // Blade (sleek, narrow)
  g.poly([
    cx, cy - 14 * s,
    cx + 2 * s, cy - 3 * s,
    cx + 1.5 * s, cy + 2 * s,
    cx - 1.5 * s, cy + 2 * s,
    cx - 2 * s, cy - 3 * s,
  ]).fill({ color: 0x443366 });
  // Blade edge highlight
  g.poly([
    cx - 0.3 * s, cy - 13 * s,
    cx + 0.8 * s, cy - 4 * s,
    cx + 0.5 * s, cy + 1 * s,
    cx - 0.5 * s, cy + 1 * s,
  ]).fill({ color: 0x6655aa, alpha: 0.4 });
  // Fuller (groove)
  g.rect(cx - 0.3 * s, cy - 10 * s, 0.6 * s, 8 * s).fill({ color: 0x332244, alpha: 0.5 });
  // Crossguard (curved)
  g.poly([
    cx - 6 * s, cy + 1 * s,
    cx - 5 * s, cy + 3 * s,
    cx + 5 * s, cy + 3 * s,
    cx + 6 * s, cy + 1 * s,
  ]).fill({ color: 0x332244 });
  // Handle (wrapped)
  g.roundRect(cx - 1.2 * s, cy + 3 * s, 2.4 * s, 7 * s, 0.5 * s).fill({ color: 0x221133 });
  // Handle wrapping
  g.rect(cx - 1.5 * s, cy + 4 * s, 3 * s, 0.8 * s).fill({ color: 0x443355, alpha: 0.6 });
  g.rect(cx - 1.5 * s, cy + 6.5 * s, 3 * s, 0.8 * s).fill({ color: 0x443355, alpha: 0.6 });
  g.rect(cx - 1.5 * s, cy + 9 * s, 3 * s, 0.8 * s).fill({ color: 0x443355, alpha: 0.6 });
  // Pommel
  g.circle(cx, cy + 11 * s, 1.8 * s).fill({ color: 0x332244 });
  g.circle(cx, cy + 11 * s, 0.8 * s).fill({ color: 0x8855cc, alpha: 0.5 });
  // Shadow wisps
  g.poly([cx - 3 * s, cy - 8 * s, cx - 5 * s, cy - 11 * s, cx - 2 * s, cy - 6 * s]).fill({ color: 0x332244, alpha: 0.4 });
  g.poly([cx + 3 * s, cy - 6 * s, cx + 5 * s, cy - 10 * s, cx + 2 * s, cy - 4 * s]).fill({ color: 0x332244, alpha: 0.4 });
}

function drawExcaliburIcon(g: Graphics, cx: number, cy: number, size: number): void {
  const s = size / 30;
  // Holy glow
  g.circle(cx, cy - 2 * s, 10 * s).fill({ color: 0xffdd44, alpha: 0.12 });
  // Blade (wide, majestic)
  g.poly([
    cx - 2.5 * s, cy + 5 * s,
    cx - 2.5 * s, cy - 8 * s,
    cx - 1.5 * s, cy - 12 * s,
    cx, cy - 14 * s,
    cx + 1.5 * s, cy - 12 * s,
    cx + 2.5 * s, cy - 8 * s,
    cx + 2.5 * s, cy + 5 * s,
  ]).fill({ color: 0xdde8f8 });
  // Blade highlight (center fuller)
  g.rect(cx - 0.5 * s, cy - 12 * s, 1 * s, 16 * s).fill({ color: 0xffffff, alpha: 0.35 });
  // Blade edge gleam
  g.poly([
    cx - 2 * s, cy - 10 * s,
    cx - 1 * s, cy - 10 * s,
    cx - 1.5 * s, cy + 3 * s,
    cx - 2.5 * s, cy + 3 * s,
  ]).fill({ color: 0xeef4ff, alpha: 0.3 });
  // Ornate crossguard
  g.roundRect(cx - 9 * s, cy + 4 * s, 18 * s, 3 * s, 1 * s).fill({ color: 0xddaa22 });
  // Crossguard end ornaments
  g.circle(cx - 9 * s, cy + 5.5 * s, 2 * s).fill({ color: 0xeebb33 });
  g.circle(cx + 9 * s, cy + 5.5 * s, 2 * s).fill({ color: 0xeebb33 });
  // Central gem on crossguard
  g.circle(cx, cy + 5.5 * s, 1.8 * s).fill({ color: 0x3366ff });
  g.circle(cx, cy + 5.5 * s, 1 * s).fill({ color: 0x88aaff, alpha: 0.6 });
  // Handle
  g.roundRect(cx - 1.5 * s, cy + 7 * s, 3 * s, 6 * s, 0.5 * s).fill({ color: 0x664411 });
  // Handle gold wrapping
  g.rect(cx - 1.8 * s, cy + 8 * s, 3.6 * s, 0.8 * s).fill({ color: 0xddaa22, alpha: 0.6 });
  g.rect(cx - 1.8 * s, cy + 10.5 * s, 3.6 * s, 0.8 * s).fill({ color: 0xddaa22, alpha: 0.6 });
  // Pommel (golden orb)
  g.circle(cx, cy + 14.5 * s, 2.5 * s).fill({ color: 0xeebb33 });
  g.circle(cx, cy + 14.5 * s, 1.2 * s).fill({ color: 0xffdd66, alpha: 0.6 });
  // Holy sparkles
  g.circle(cx - 4 * s, cy - 8 * s, 0.7 * s).fill({ color: 0xffffaa, alpha: 0.6 });
  g.circle(cx + 3 * s, cy - 10 * s, 0.5 * s).fill({ color: 0xffffaa, alpha: 0.5 });
  g.circle(cx + 5 * s, cy - 4 * s, 0.6 * s).fill({ color: 0xffffaa, alpha: 0.4 });
}

function hasCustomIcon(_id: ArmoryItemId): boolean {
  return true;
}

function drawItemIcon(g: Graphics, id: ArmoryItemId, cx: number, cy: number, size: number): void {
  switch (id) {
    case "longsword": drawLongswordIcon(g, cx, cy, size); break;
    case "spear": drawSpearIcon(g, cx, cy, size); break;
    case "leather_armor": drawLeatherArmorIcon(g, cx, cy, size); break;
    case "leather_sandals": drawLeatherSandalsIcon(g, cx, cy, size); break;
    case "steel_shield": drawSteelShieldIcon(g, cx, cy, size); break;
    case "war_axe": drawWarAxeIcon(g, cx, cy, size); break;
    case "chainmail": drawChainmailIcon(g, cx, cy, size); break;
    case "iron_boots": drawIronBootsIcon(g, cx, cy, size); break;
    case "flaming_sword": drawFlamingSwordIcon(g, cx, cy, size); break;
    case "elven_bow": drawElvenBowIcon(g, cx, cy, size); break;
    case "plate_armor": drawPlateArmorIcon(g, cx, cy, size); break;
    case "winged_boots": drawWingedBootsIcon(g, cx, cy, size); break;
    case "mace_of_might": drawMaceOfMightIcon(g, cx, cy, size); break;
    case "halberd": drawHalberdIcon(g, cx, cy, size); break;
    case "enchanted_cloak": drawEnchantedCloakIcon(g, cx, cy, size); break;
    case "giants_belt": drawGiantsBeltIcon(g, cx, cy, size); break;
    case "dragonscale_mail": drawDragonscaleMailIcon(g, cx, cy, size); break;
    case "storm_lance": drawStormLanceIcon(g, cx, cy, size); break;
    case "crown_of_valor": drawCrownOfValorIcon(g, cx, cy, size); break;
    case "shadow_dagger": drawShadowDaggerIcon(g, cx, cy, size); break;
    case "excalibur": drawExcaliburIcon(g, cx, cy, size); break;
  }
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const STYLE_SCREEN_TITLE = new TextStyle({
  fontFamily: "monospace", fontSize: 29, fill: 0xffd700,
  fontWeight: "bold", letterSpacing: 3,
});

const STYLE_ITEM_NAME = new TextStyle({
  fontFamily: "monospace", fontSize: 11, fill: 0xeeeeff,
  fontWeight: "bold", letterSpacing: 1,
});

const STYLE_ITEM_SYMBOL = new TextStyle({
  fontFamily: "monospace", fontSize: 24, fill: 0xffffff, fontWeight: "bold",
});

const STYLE_DETAIL_NAME = new TextStyle({
  fontFamily: "monospace", fontSize: 20, fill: 0xffd700,
  fontWeight: "bold", letterSpacing: 2,
});

const STYLE_DETAIL_DESC = new TextStyle({
  fontFamily: "monospace", fontSize: 12, fill: 0xaabbcc,
  wordWrap: true, wordWrapWidth: 250,
});

const STYLE_STAT_LABEL = new TextStyle({
  fontFamily: "monospace", fontSize: 11, fill: 0x88ff88,
  letterSpacing: 1, fontWeight: "bold",
});

const STYLE_STAT_TEXT = new TextStyle({
  fontFamily: "monospace", fontSize: 12, fill: 0x88ffaa,
  wordWrap: true, wordWrapWidth: 250,
});

const STYLE_SLOTS = new TextStyle({
  fontFamily: "monospace", fontSize: 12, fill: 0x8899bb, letterSpacing: 1,
});

const STYLE_LOCKED = new TextStyle({
  fontFamily: "monospace", fontSize: 9, fill: 0x556677, letterSpacing: 1,
});

const STYLE_SECTION = new TextStyle({
  fontFamily: "monospace", fontSize: 14, fill: 0xffd700,
  fontWeight: "bold", letterSpacing: 2,
});

// Colors
const BG_COLOR = 0x0a0a18;
const BORDER_COLOR = 0xffd700;
const CARD_SELECTED_BORDER = 0xffd700;
const CARD_NORMAL_BORDER = 0x334455;
const CARD_LOCKED_BORDER = 0x222233;

// ---------------------------------------------------------------------------
// Layout constants
// ---------------------------------------------------------------------------

const MAIN_W = 1622;
const MAIN_H = 980;
const CORNER_R = 10;

// Item card grid
const ITEM_W = 143;
const ITEM_H = 104;
const ITEM_GAP = 13;
const GRID_COLS = 5;

// Horizontal sections
const CONTENT_Y = 75;
const FOOTER_Y = MAIN_H - 68;
const CONTENT_H = FOOTER_Y - CONTENT_Y;

const GRID_X = 26;
const GRID_W_TOTAL = GRID_COLS * ITEM_W + (GRID_COLS - 1) * ITEM_GAP;

const IMG_X = GRID_X + GRID_W_TOTAL + 20;
const IMG_W = 364;
const IMG_H = 403;

const DETAIL_X = IMG_X + IMG_W + 16;
const DETAIL_W = MAIN_W - DETAIL_X - 26;

// Armory decorative image (below weapon image)
const ARMORY_IMG_Y = CONTENT_Y + IMG_H + 16; // 401
const ARMORY_IMG_H = FOOTER_Y - ARMORY_IMG_Y; // 285

// ---------------------------------------------------------------------------
// Class
// ---------------------------------------------------------------------------

export class ArmoryScreen {
  readonly container = new Container();

  private _vm!: ViewManager;
  private _bg!: Graphics;
  private _mainCard!: Container;

  /** Currently selected items (max MAX_EQUIPPED_ITEMS). */
  private _selectedIds: ArmoryItemId[] = [];

  /** Set of item IDs that are available (unlocked). null = all unlocked. */
  private _unlockedIds: Set<ArmoryItemId> | null = null;

  /** Currently highlighted card (for detail panel). null = nothing clicked yet. */
  private _focusedId: ArmoryItemId | null = null;

  // Card entries
  private _cards: Array<{
    id: ArmoryItemId;
    bg: Graphics;
    container: Container;
    locked: boolean;
  }> = [];

  // Detail panel elements
  private _detailPanel!: Container;
  private _detailName!: Text;
  private _detailDesc!: Text;
  private _detailStats!: Text;
  private _detailIconBg!: Graphics;
  private _detailIconSymbol!: Text;
  private _detailIconDraw!: Graphics;

  // Image display
  private _weaponImgContainer!: Container;
  private _weaponSprite: Sprite | null = null;
  private _currentImgUrl = "";

  // Slots label
  private _slotsLabel!: Text;

  // Scrollable grid
  private _gridScroll!: Container;
  private _gridMask!: Graphics;
  private _gridScrollY = 0;
  private _gridContentH = 0;

  // Navigation
  private _nextBtn!: Container;
  onStartGame: (() => void) | null = null;
  onBack: (() => void) | null = null;

  /** Returns the currently equipped item IDs. */
  get selectedItems(): ArmoryItemId[] {
    return [...this._selectedIds];
  }

  // ---------------------------------------------------------------------------
  // Lifecycle
  // ---------------------------------------------------------------------------

  init(vm: ViewManager): void {
    this._vm = vm;

    this._bg = new Graphics();
    this.container.addChild(this._bg);

    this._mainCard = new Container();
    this.container.addChild(this._mainCard);

    // Preload all images
    void Assets.load([displaycaseImgUrl, longswordImgUrl, spearImgUrl, armoryImgUrl]);

    this._buildUI();

    vm.addToLayer("ui", this.container);
    this._layout();
    vm.app.renderer.on("resize", () => this._layout());
  }

  show(): void {
    this.container.visible = true;
  }

  hide(): void {
    this.container.visible = false;
  }

  /**
   * Set which items are available. Pass null to unlock all (standard/roguelike mode).
   */
  setUnlockedItems(ids: ArmoryItemId[] | null): void {
    this._unlockedIds = ids ? new Set(ids) : null;
    this._selectedIds = this._selectedIds.filter(
      (id) => !this._unlockedIds || this._unlockedIds.has(id),
    );
    this._rebuildCards();
    this._updateSlotsLabel();
    this._updateDetail();
  }

  // ---------------------------------------------------------------------------
  // Build UI
  // ---------------------------------------------------------------------------

  private _buildUI(): void {
    const card = this._mainCard;

    // Card background
    card.addChild(
      new Graphics()
        .roundRect(0, 0, MAIN_W, MAIN_H, CORNER_R)
        .fill({ color: 0x10102a, alpha: 0.97 })
        .roundRect(0, 0, MAIN_W, MAIN_H, CORNER_R)
        .stroke({ color: BORDER_COLOR, alpha: 0.4, width: 1.5 }),
    );

    // Title
    const title = new Text({ text: "ARMORY", style: STYLE_SCREEN_TITLE });
    title.anchor.set(0.5, 0);
    title.position.set(MAIN_W / 2, 18);
    card.addChild(title);

    // Back button
    const backBtn = this._makeNavBtn("< BACK", 104, 36, false);
    backBtn.position.set(21, 18);
    backBtn.on("pointerdown", () => this.onBack?.());
    card.addChild(backBtn);

    // Slots label (top-right)
    this._slotsLabel = new Text({ text: "", style: STYLE_SLOTS });
    this._slotsLabel.anchor.set(1, 0.5);
    this._slotsLabel.position.set(MAIN_W - 26, 35);
    card.addChild(this._slotsLabel);
    this._updateSlotsLabel();

    // Header divider
    card.addChild(
      new Graphics().rect(21, 65, MAIN_W - 42, 1).fill({ color: BORDER_COLOR, alpha: 0.2 }),
    );

    // --- Grid area (left) ---
    this._gridScroll = new Container();
    this._gridScroll.position.set(GRID_X, CONTENT_Y);
    this._buildCards();
    card.addChild(this._gridScroll);

    this._gridMask = new Graphics()
      .rect(GRID_X, CONTENT_Y, GRID_W_TOTAL, CONTENT_H)
      .fill({ color: 0xffffff });
    card.addChild(this._gridMask);
    this._gridScroll.mask = this._gridMask;

    this._gridScroll.eventMode = "static";
    this._gridScroll.on("wheel", (e: any) => this._onGridWheel(e));

    // --- Weapon image display + armory image (center) ---
    this._buildImageDisplay(card);

    // --- Detail panel (right) ---
    this._detailPanel = new Container();
    this._detailPanel.position.set(DETAIL_X, CONTENT_Y);
    card.addChild(this._detailPanel);
    this._buildDetailPanel();

    // Footer divider
    card.addChild(
      new Graphics().rect(21, FOOTER_Y, MAIN_W - 42, 1).fill({ color: BORDER_COLOR, alpha: 0.15 }),
    );

    // Start game button
    this._nextBtn = this._makeNavBtn("START GAME", 195, 44, true);
    this._nextBtn.position.set(MAIN_W - 221, MAIN_H - 57);
    this._nextBtn.on("pointerdown", () => this.onStartGame?.());
    card.addChild(this._nextBtn);

    // Initial state: no item focused, show displaycase
    this._updateDetail();
    this._updateItemImage();
  }

  // ---------------------------------------------------------------------------
  // Grid
  // ---------------------------------------------------------------------------

  private _buildCards(): void {
    this._gridScroll.removeChildren();
    this._cards = [];

    for (let i = 0; i < ARMORY_ITEMS.length; i++) {
      const item = ARMORY_ITEMS[i];
      const col = i % GRID_COLS;
      const row = Math.floor(i / GRID_COLS);
      const cx = col * (ITEM_W + ITEM_GAP);
      const cy = row * (ITEM_H + ITEM_GAP);

      const locked = this._isLocked(item.id);
      const cardEntry = this._makeItemCard(item, cx, cy, locked);
      this._gridScroll.addChild(cardEntry.container);
      this._cards.push(cardEntry);
    }

    const rows = Math.ceil(ARMORY_ITEMS.length / GRID_COLS);
    this._gridContentH = rows * (ITEM_H + ITEM_GAP) - ITEM_GAP + 8;
  }

  private _rebuildCards(): void {
    this._buildCards();
    for (const card of this._cards) {
      const selected = this._selectedIds.includes(card.id);
      const focused = card.id === this._focusedId;
      this._refreshCard(card.bg, selected, focused, card.locked);
    }
  }

  private _makeItemCard(
    item: ArmoryItemDef, x: number, y: number, locked: boolean,
  ): { id: ArmoryItemId; bg: Graphics; container: Container; locked: boolean } {
    const c = new Container();
    c.position.set(x, y);
    c.eventMode = "static";
    c.cursor = locked ? "default" : "pointer";

    const bg = new Graphics();
    c.addChild(bg);

    // Icon background area
    const iconBg = new Graphics()
      .roundRect(6, 6, ITEM_W - 12, ITEM_H - 28, 3)
      .fill({ color: locked ? 0x111118 : item.iconColor, alpha: locked ? 0.5 : 0.3 });
    c.addChild(iconBg);

    // Icon: drawn weapon icon for longsword/spear, text symbol for others
    const iconCX = ITEM_W / 2;
    const iconCY = (ITEM_H - 22) / 2 + 6;

    if (!locked && hasCustomIcon(item.id)) {
      const iconGfx = new Graphics();
      drawItemIcon(iconGfx, item.id, iconCX, iconCY, 30);
      c.addChild(iconGfx);
    } else {
      const symbol = new Text({
        text: locked ? "?" : item.iconSymbol,
        style: new TextStyle({
          ...STYLE_ITEM_SYMBOL,
          fill: locked ? 0x334455 : 0xffffff,
        }),
      });
      symbol.anchor.set(0.5, 0.5);
      symbol.position.set(iconCX, iconCY);
      c.addChild(symbol);
    }

    // Item name below icon
    const nameText = new Text({
      text: locked ? "LOCKED" : item.name.toUpperCase(),
      style: locked ? STYLE_LOCKED : STYLE_ITEM_NAME,
    });
    nameText.anchor.set(0.5, 0);
    nameText.position.set(ITEM_W / 2, ITEM_H - 20);
    c.addChild(nameText);

    this._refreshCard(bg, false, false, locked);

    c.on("pointerdown", () => {
      if (locked) return;
      this._focusItem(item.id);
      this._toggleSelect(item.id);
    });

    return { id: item.id, bg, container: c, locked };
  }

  // ---------------------------------------------------------------------------
  // Image display (weapon image + armory decorative)
  // ---------------------------------------------------------------------------

  private _buildImageDisplay(parent: Container): void {
    // --- Weapon image box ---
    this._weaponImgContainer = new Container();
    this._weaponImgContainer.position.set(IMG_X, CONTENT_Y);
    parent.addChild(this._weaponImgContainer);

    this._weaponImgContainer.addChild(
      new Graphics()
        .roundRect(0, 0, IMG_W, IMG_H, 6)
        .fill({ color: 0x080818 })
        .roundRect(0, 0, IMG_W, IMG_H, 6)
        .stroke({ color: 0x334466, alpha: 0.6, width: 1 }),
    );

    // --- Armory decorative image box ---
    const armContainer = new Container();
    armContainer.position.set(IMG_X, ARMORY_IMG_Y);
    parent.addChild(armContainer);

    // Section label above frame
    const armLabel = new Text({ text: "THE ARMORY", style: STYLE_SECTION });
    armLabel.position.set(0, -20);
    armContainer.addChild(armLabel);

    // Frame
    armContainer.addChild(
      new Graphics()
        .roundRect(0, 0, IMG_W, ARMORY_IMG_H, 6)
        .fill({ color: 0x080818 })
        .roundRect(0, 0, IMG_W, ARMORY_IMG_H, 6)
        .stroke({ color: 0x334466, alpha: 0.6, width: 1 }),
    );

    // Load armory image
    void Assets.load(armoryImgUrl).then((tex: Texture) => {
      const sprite = new Sprite(tex);
      const maxW = IMG_W - 12;
      const maxH = ARMORY_IMG_H - 12;
      const scale = Math.min(maxW / tex.width, maxH / tex.height);
      sprite.scale.set(scale);
      sprite.position.set(
        6 + (maxW - tex.width * scale) / 2,
        6 + (maxH - tex.height * scale) / 2,
      );
      armContainer.addChild(sprite);
    });
  }

  // ---------------------------------------------------------------------------
  // Detail panel
  // ---------------------------------------------------------------------------

  private _buildDetailPanel(): void {
    const dp = this._detailPanel;
    dp.removeChildren();

    const pw = DETAIL_W;
    const ph = CONTENT_H;

    // Panel background
    dp.addChild(
      new Graphics()
        .roundRect(0, 0, pw, ph, 6)
        .fill({ color: 0x0d0d1e, alpha: 0.8 })
        .roundRect(0, 0, pw, ph, 6)
        .stroke({ color: 0x334466, width: 1 }),
    );

    // Icon area background
    this._detailIconBg = new Graphics()
      .roundRect(8, 8, pw - 16, 90, 4)
      .fill({ color: 0x151525 });
    dp.addChild(this._detailIconBg);

    // Text symbol (for non-custom-icon items)
    this._detailIconSymbol = new Text({
      text: "",
      style: new TextStyle({
        fontFamily: "monospace", fontSize: 44, fill: 0xffd700, fontWeight: "bold",
      }),
    });
    this._detailIconSymbol.anchor.set(0.5, 0.5);
    this._detailIconSymbol.position.set(pw / 2, 53);
    dp.addChild(this._detailIconSymbol);

    // Drawn icon graphics (for longsword/spear)
    this._detailIconDraw = new Graphics();
    dp.addChild(this._detailIconDraw);

    // Name
    this._detailName = new Text({ text: "", style: STYLE_DETAIL_NAME });
    this._detailName.anchor.set(0.5, 0);
    this._detailName.position.set(pw / 2, 106);
    dp.addChild(this._detailName);

    // Divider
    dp.addChild(
      new Graphics().rect(8, 135, pw - 16, 1).fill({ color: 0x334466 }),
    );

    // Description label
    const descLabel = new Text({
      text: "DESCRIPTION",
      style: new TextStyle({
        fontFamily: "monospace", fontSize: 10, fill: 0x556677, letterSpacing: 2,
      }),
    });
    descLabel.position.set(10, 143);
    dp.addChild(descLabel);

    // Description text
    this._detailDesc = new Text({ text: "", style: STYLE_DETAIL_DESC });
    this._detailDesc.position.set(10, 160);
    dp.addChild(this._detailDesc);

    // Divider
    dp.addChild(
      new Graphics().rect(8, 235, pw - 16, 1).fill({ color: 0x334466 }),
    );

    // Stats label
    const statsLabel = new Text({ text: "BONUSES", style: STYLE_STAT_LABEL });
    statsLabel.position.set(10, 243);
    dp.addChild(statsLabel);

    // Stats text
    this._detailStats = new Text({ text: "", style: STYLE_STAT_TEXT });
    this._detailStats.position.set(10, 263);
    dp.addChild(this._detailStats);
  }

  // ---------------------------------------------------------------------------
  // Selection logic
  // ---------------------------------------------------------------------------

  private _isLocked(id: ArmoryItemId): boolean {
    if (!this._unlockedIds) return false;
    return !this._unlockedIds.has(id);
  }

  private _focusItem(id: ArmoryItemId): void {
    const prev = this._focusedId;
    this._focusedId = id;

    for (const card of this._cards) {
      if (card.id === prev || card.id === id) {
        const selected = this._selectedIds.includes(card.id);
        const focused = card.id === id;
        this._refreshCard(card.bg, selected, focused, card.locked);
      }
    }

    this._updateDetail();
    this._updateItemImage();
  }

  private _toggleSelect(id: ArmoryItemId): void {
    const idx = this._selectedIds.indexOf(id);
    if (idx >= 0) {
      this._selectedIds.splice(idx, 1);
    } else if (this._selectedIds.length < MAX_EQUIPPED_ITEMS) {
      this._selectedIds.push(id);
    } else {
      this._selectedIds.shift();
      this._selectedIds.push(id);
    }

    for (const card of this._cards) {
      const selected = this._selectedIds.includes(card.id);
      const focused = card.id === this._focusedId;
      this._refreshCard(card.bg, selected, focused, card.locked);
    }
    this._updateSlotsLabel();
  }

  private _refreshCard(bg: Graphics, selected: boolean, focused: boolean, locked: boolean): void {
    bg.clear();
    let borderColor = CARD_NORMAL_BORDER;
    let fillColor = 0x10101e;
    let borderWidth = 1;

    if (locked) {
      borderColor = CARD_LOCKED_BORDER;
      fillColor = 0x0a0a14;
    } else if (selected) {
      borderColor = CARD_SELECTED_BORDER;
      fillColor = 0x1a1e32;
      borderWidth = 2;
    } else if (focused) {
      borderColor = 0x6688aa;
      fillColor = 0x141828;
      borderWidth = 1.5;
    }

    bg.roundRect(0, 0, ITEM_W, ITEM_H, 6)
      .fill({ color: fillColor })
      .roundRect(0, 0, ITEM_W, ITEM_H, 6)
      .stroke({ color: borderColor, width: borderWidth });
  }

  // ---------------------------------------------------------------------------
  // Update display
  // ---------------------------------------------------------------------------

  private _updateDetail(): void {
    const item = this._focusedId
      ? ARMORY_ITEMS.find((i) => i.id === this._focusedId) ?? null
      : null;

    const pw = DETAIL_W;

    if (!item) {
      // No selection — placeholder
      this._detailIconSymbol.text = "?";
      this._detailIconSymbol.visible = true;
      this._detailIconDraw.clear();
      this._detailName.text = "SELECT AN ITEM";
      this._detailDesc.text = "Click on a weapon or armor\npiece to view its details.";
      this._detailStats.text = "";
      this._detailIconBg.clear()
        .roundRect(8, 8, pw - 16, 90, 4)
        .fill({ color: 0x151525 });
      return;
    }

    const locked = this._isLocked(item.id);

    // Update icon background color
    this._detailIconBg.clear()
      .roundRect(8, 8, pw - 16, 90, 4)
      .fill({ color: locked ? 0x111118 : item.iconColor, alpha: locked ? 0.5 : 0.2 });

    // Update icon
    if (!locked && hasCustomIcon(item.id)) {
      this._detailIconSymbol.visible = false;
      this._detailIconDraw.clear();
      drawItemIcon(this._detailIconDraw, item.id, pw / 2, 53, 50);
    } else {
      this._detailIconSymbol.visible = true;
      this._detailIconSymbol.text = locked ? "?" : item.iconSymbol;
      this._detailIconDraw.clear();
    }

    // Name
    this._detailName.text = locked ? "LOCKED" : item.name.toUpperCase();

    // Description
    this._detailDesc.text = locked
      ? "This item has not been unlocked yet.\nComplete more campaign scenarios\nto unlock it."
      : item.description;

    // Stats
    if (locked) {
      this._detailStats.text = "???";
    } else {
      const lines: string[] = [];
      if (item.atkBonus > 0) lines.push(`+${item.atkBonus} Attack`);
      if (item.atkBonus < 0) lines.push(`${item.atkBonus} Attack`);
      if (item.hpBonus > 0) lines.push(`+${item.hpBonus} Health`);
      if (item.hpBonus < 0) lines.push(`${item.hpBonus} Health`);
      if (item.speedBonus > 0) lines.push(`+${item.speedBonus} Speed`);
      if (item.speedBonus < 0) lines.push(`${item.speedBonus} Speed`);
      if (item.rangeBonus > 0) lines.push(`+${item.rangeBonus} Range`);
      if (item.rangeBonus < 0) lines.push(`${item.rangeBonus} Range`);
      this._detailStats.text = lines.length > 0 ? lines.join("\n") : "No bonuses";
    }
  }

  private _updateItemImage(): void {
    const imgUrl = (this._focusedId && ITEM_IMAGES[this._focusedId])
      ? ITEM_IMAGES[this._focusedId]
      : displaycaseImgUrl;

    this._currentImgUrl = imgUrl;

    void Assets.load(imgUrl).then((tex: Texture) => {
      // Guard against stale loads from rapid clicks
      if (this._currentImgUrl !== imgUrl) return;

      if (this._weaponSprite) {
        this._weaponSprite.texture = tex;
      } else {
        this._weaponSprite = new Sprite(tex);
        this._weaponImgContainer.addChild(this._weaponSprite);
      }

      const maxW = IMG_W - 16;
      const maxH = IMG_H - 16;
      const scale = Math.min(maxW / tex.width, maxH / tex.height);
      this._weaponSprite.scale.set(scale);
      this._weaponSprite.position.set(
        8 + (maxW - tex.width * scale) / 2,
        8 + (maxH - tex.height * scale) / 2,
      );
    });
  }

  private _updateSlotsLabel(): void {
    this._slotsLabel.text = `SLOTS: ${this._selectedIds.length}/${MAX_EQUIPPED_ITEMS}`;
  }

  // ---------------------------------------------------------------------------
  // Scroll
  // ---------------------------------------------------------------------------

  private _onGridWheel(e: any): void {
    const maxScroll = Math.max(0, this._gridContentH - CONTENT_H);
    this._gridScrollY = Math.max(0, Math.min(maxScroll, this._gridScrollY + e.deltaY * 0.5));
    this._gridScroll.position.y = CONTENT_Y - this._gridScrollY;
  }

  // ---------------------------------------------------------------------------
  // Navigation buttons
  // ---------------------------------------------------------------------------

  private _makeNavBtn(label: string, w: number, h: number, primary = false): Container {
    const btn = new Container();
    btn.eventMode = "static";
    btn.cursor = "pointer";

    const bg = new Graphics()
      .roundRect(0, 0, w, h, 8)
      .fill({ color: primary ? 0x1a3a1a : 0x1a2a3a })
      .roundRect(0, 0, w, h, 8)
      .stroke({ color: primary ? 0x44aa66 : 0x4488cc, width: 1.5 });
    btn.addChild(bg);

    const txt = new Text({
      text: label,
      style: new TextStyle({
        fontFamily: "monospace",
        fontSize: primary ? 17 : 14,
        fill: primary ? 0x88ffaa : 0x88bbff,
        fontWeight: "bold", letterSpacing: 1,
      }),
    });
    txt.anchor.set(0.5, 0.5);
    txt.position.set(w / 2, h / 2);
    btn.addChild(txt);

    btn.on("pointerover", () => { bg.tint = primary ? 0xaaffcc : 0xaaddff; });
    btn.on("pointerout", () => { bg.tint = 0xffffff; });

    return btn;
  }

  // ---------------------------------------------------------------------------
  // Layout
  // ---------------------------------------------------------------------------

  private _layout(): void {
    const sw = this._vm.screenWidth;
    const sh = this._vm.screenHeight;

    this._bg.clear().rect(0, 0, sw, sh).fill({ color: BG_COLOR });

    this._mainCard.position.set(
      Math.floor((sw - MAIN_W) / 2),
      Math.floor((sh - MAIN_H) / 2),
    );
  }
}

export const armoryScreen = new ArmoryScreen();
