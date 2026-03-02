// Procedural sprite generator for the Arbelestier unit type.
//
// Draws a detailed medieval fantasy arbelestier at 48×48 pixels per frame
// using PixiJS Graphics → RenderTexture.
//
// Visual features:
//   • Heavy plate armor inspired by swordsman
//   • Large crossbow with detailed mechanics
//   • Shoot → reload animation cycle
//   • Heavy helmet with visor
//   • Quiver with bolts on back
//   • Boots + legs with walk / collapse poses
//   • Shadow ellipse at feet

import { Graphics, RenderTexture, type Renderer, Texture } from "pixi.js";
import { UnitState } from "@/types";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const F = 48;          // frame size (px)
const CX = F / 2;      // center X
const GY = F - 4;      // ground Y (feet line)

// Palette ─ heavy armored crossbowman tones
const COL_SKIN = 0xd4a574;
const COL_SKIN_DARK = 0xb8875a;
const COL_ARMOR = 0x666666;
const COL_ARMOR_DK = 0x444444;
const COL_ARMOR_LIGHT = 0x888888;
const COL_LEATHER = 0x5d3a1a;
const COL_LEATHER_DK = 0x3d2610;
const COL_CROSSBOW = 0x8b6914;
const COL_CROSSBOW_DK = 0x5d4a0e;
const COL_STRING = 0xddddcc;
const COL_BOLT = 0xcccccc;
const COL_BOOT = 0x3d2610;
const COL_SHADOW = 0x000000;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function sin01(frame: number, total: number): number {
    return Math.sin((frame / total) * Math.PI * 2) * 0.5 + 0.5;
}

// ---------------------------------------------------------------------------
// Drawing sub-routines
// ---------------------------------------------------------------------------

function drawShadow(g: Graphics, cx: number, gy: number, w = 12, h = 3.5): void {
    g.ellipse(cx, gy + 1, w, h).fill({ color: COL_SHADOW, alpha: 0.25 });
}

function drawBoots(g: Graphics, cx: number, gy: number, stanceL: number, stanceR: number, squash = 0): void {
    const bw = 4, bh = 4 - squash;
    g.roundRect(cx - 6 + stanceL, gy - bh, bw, bh, 1).fill({ color: COL_BOOT });
    g.roundRect(cx + 2 + stanceR, gy - bh, bw, bh, 1).fill({ color: COL_BOOT });
}

function drawLegs(g: Graphics, cx: number, legTop: number, legH: number, stanceL: number, stanceR: number): void {
    g.rect(cx - 4.5 + stanceL, legTop, 3, legH).fill({ color: COL_LEATHER_DK });
    g.rect(cx + 1.5 + stanceR, legTop, 3, legH).fill({ color: COL_LEATHER_DK });
}

function drawTorso(g: Graphics, cx: number, torsoTop: number, torsoH: number, tilt = 0): void {
    const tw = 13;
    const x = cx - tw / 2 + tilt;
    
    // Heavy plate armor
    g.roundRect(x, torsoTop, tw, torsoH, 2)
        .fill({ color: COL_ARMOR })
        .stroke({ color: COL_ARMOR_DK, width: 1 });
    
    // Armor details
    g.rect(x + 2, torsoTop + 3, tw - 4, 2).fill({ color: COL_ARMOR_LIGHT });
    
    // Leather belt
    g.rect(x, torsoTop + torsoH - 5, tw, 3).fill({ color: COL_LEATHER_DK });
}

function drawHelmet(g: Graphics, cx: number, headTop: number, tilt = 0): void {
    const hw = 10, hh = 9;
    const x = cx - hw / 2 + tilt;
    
    // Full plate helmet
    g.roundRect(x, headTop, hw, hh, 3)
        .fill({ color: COL_ARMOR })
        .stroke({ color: COL_ARMOR_DK, width: 1 });
    
    // Visor
    g.rect(x + 2, headTop + 4, hw - 4, 3).fill({ color: COL_ARMOR_DK });
    
    // Face opening
    g.rect(x + 3, headTop + 5, hw - 6, 2).fill({ color: COL_SKIN });
    
    // Helmet crest
    g.rect(x + hw/2 - 1, headTop - 2, 2, 2).fill({ color: COL_ARMOR_LIGHT });
}

function drawCrossbow(g: Graphics, startX: number, startY: number, endX: number, endY: number, pull = 0, bolts = 1): void {
    // Crossbow body
    
    // Draw crossbow stock
    g.moveTo(startX, startY)
        .lineTo(endX, endY)
        .stroke({ color: COL_CROSSBOW, width: 3 });
    
    // Crossbow details
    g.moveTo(startX, startY)
        .lineTo(endX, endY)
        .stroke({ color: COL_CROSSBOW_DK, width: 1 });
    
    // Bowstring
    const stringPull = pull * 8;
    const midX = (startX + endX) / 2;
    const midY = (startY + endY) / 2;
    
    g.moveTo(startX, startY)
        .lineTo(midX + stringPull, midY)
        .lineTo(endX, endY)
        .stroke({ color: COL_STRING, width: 1 });
    
    // Bolt in crossbow (if loaded)
    if (bolts > 0) {
        g.rect(endX - 1, endY - 0.5, 3, 1).fill({ color: COL_BOLT });
    }
}

function drawBoltQuiver(g: Graphics, cx: number, cy: number): void {
    const qx = cx - 8;
    const qy = cy - 2;

    // Quiver tube
    g.roundRect(qx, qy, 4, 10, 1)
        .fill({ color: COL_LEATHER })
        .stroke({ color: COL_LEATHER_DK, width: 0.5 });

    // Bolts sticking out
    for (let i = 0; i < 3; i++) {
        g.rect(qx + 1, qy - 2 - i * 3, 2, 4).fill({ color: COL_BOLT });
    }
}

function drawArm(g: Graphics, sx: number, sy: number, ex: number, ey: number, color = COL_SKIN): void {
    g.moveTo(sx, sy).lineTo(ex, ey).stroke({ color, width: 3 });
    g.circle(ex, ey, 2).fill({ color: COL_SKIN_DARK });
}

// ---------------------------------------------------------------------------
// Frame generators
// ---------------------------------------------------------------------------

function generateIdleFrames(g: Graphics, frame: number): void {
    const t = sin01(frame, 8);
    const bob = Math.round(t * 1 - 0.5);

    const torsoTop = GY - 20 + bob;
    const helmetTop = torsoTop - 10;

    drawShadow(g, CX, GY);
    drawBoltQuiver(g, CX, torsoTop + 4);
    drawBoots(g, CX, GY, 0, 0);
    drawLegs(g, CX, GY - 10, 8, 0, 0);
    drawTorso(g, CX, torsoTop, 12);
    drawHelmet(g, CX, helmetTop);

    // Crossbow held at ready position
    const bowX = CX + 8;
    const bowY = torsoTop + 4;
    drawArm(g, CX + 4, torsoTop + 3, bowX, bowY);
    drawCrossbow(g, bowX, bowY, bowX + 14, bowY + 2, 0, 1);
}

function generateMoveFrames(g: Graphics, frame: number): void {
    const t = frame / 8;
    const walk = Math.sin(t * Math.PI * 2);
    const bob = Math.abs(walk) * 2;

    const stanceL = Math.round(walk * 2);
    const stanceR = Math.round(-walk * 2);
    const torsoTop = GY - 20 - Math.round(bob);
    const helmetTop = torsoTop - 10;

    drawShadow(g, CX, GY, 12 + Math.abs(walk) * 2);
    drawBoltQuiver(g, CX, torsoTop + 4);
    drawBoots(g, CX, GY, stanceL, stanceR);
    drawLegs(g, CX, GY - 10, 8, stanceL, stanceR);
    drawTorso(g, CX, torsoTop, 12, walk * 0.2);
    drawHelmet(g, CX, helmetTop, walk * 0.2);

    // Crossbow swaying while walking
    const bowX = CX + 8 + walk;
    const bowY = torsoTop + 4 + bob;
    drawArm(g, CX + 4, torsoTop + 3, bowX, bowY);
    drawCrossbow(g, bowX, bowY, bowX + 14, bowY + 2, 0, 1);
}

function generateAttackFrames(g: Graphics, frame: number): void {
    // 8 frames: aim -> fire -> reload -> recover
    let pull = 0;
    let angle = 0;
    let recoil = 0;
    let bolts = 1;
    let reloading = false;

    if (frame <= 2) {
        // Aiming phase
        pull = frame / 2;
        angle = -0.1;
    } else if (frame === 3) {
        // Fire!
        pull = 0;
        angle = 0.2;
        recoil = 2;
        bolts = 0;
    } else if (frame <= 5) {
        // Reloading phase - lower crossbow
        pull = 0;
        angle = 0.3;
        recoil = 1;
        reloading = true;
        bolts = 0;
    } else {
        // Recovery phase - raise crossbow back up
        pull = 0;
        angle = 0.1;
        recoil = 0;
        reloading = false;
        bolts = 1;
    }

    const torsoTop = GY - 20;
    const helmetTop = torsoTop - 10;

    drawShadow(g, CX + recoil * 0.3, GY, 12 + recoil);
    drawBoltQuiver(g, CX, torsoTop + 4);
    drawBoots(g, CX, GY, -1, recoil);
    drawLegs(g, CX, GY - 10, 8, -1, recoil);
    drawTorso(g, CX, torsoTop, 12, recoil * 0.1);
    drawHelmet(g, CX, helmetTop, recoil * 0.1);

    // Crossbow handling
    const bowX = CX + 8 + recoil;
    const bowY = torsoTop + 4;
    
    if (reloading) {
        // Crossbow pointed down during reload
        drawArm(g, CX + 4, torsoTop + 6, bowX, bowY + 8);
        drawCrossbow(g, bowX, bowY + 8, bowX + 10, bowY + 12, 0, 0);
    } else {
        // Normal firing position
        drawArm(g, CX + 4, torsoTop + 3, bowX, bowY);
        drawCrossbow(g, bowX, bowY, bowX + 14, bowY + 2, pull, bolts);
    }

    // Bolt flight effect on fire frame
    if (frame === 3) {
        g.moveTo(bowX + 14, bowY + 2)
            .lineTo(bowX + 30, bowY)
            .stroke({ color: 0xffffff, width: 2, alpha: 0.6 });
    }
}

function generateCastFrames(g: Graphics, frame: number): void {
    // Simple "preparing" pose - crossbow ready
    const t = sin01(frame, 6);
    const lift = t * 2;

    const torsoTop = GY - 20 - lift * 0.5;
    const helmetTop = torsoTop - 10;

    drawShadow(g, CX, GY);
    drawBoltQuiver(g, CX, torsoTop + 4);
    drawBoots(g, CX, GY, -1, 1);
    drawLegs(g, CX, GY - 10, 8, -1, 1);
    drawTorso(g, CX, torsoTop, 12);
    drawHelmet(g, CX, helmetTop);

    // Crossbow held ready
    const bowX = CX + 8;
    const bowY = torsoTop - 2;
    drawArm(g, CX + 4, torsoTop + 2, bowX, bowY);
    drawCrossbow(g, bowX, bowY, bowX + 14, bowY + 2, 0, 1);

    // Ready sparkle
    if (frame % 2 === 0) {
        g.circle(CX + 24, torsoTop - 8, 1.5).fill({ color: 0xaaaaff, alpha: 0.7 });
    }
}

function generateDieFrames(g: Graphics, frame: number): void {
    const t = frame / 8;
    const fallX = t * 4;
    const dropY = t * t * 8;

    const torsoTop = GY - 20 + dropY;
    const helmetTop = torsoTop - 10;

    drawShadow(g, CX + fallX * 0.5, GY, 12 + t * 4);
    drawBoots(g, CX + fallX * 0.3, GY, t * 2, -t * 2, t * 2);
    
    if (t < 0.7) {
        drawLegs(g, CX + fallX * 0.3, GY - 10 + dropY * 0.5, 8 - t * 2, t * 2, -t * 2);
        drawTorso(g, CX + fallX * 0.5, torsoTop, 12 * (1 - t * 0.4), t * 0.8);
        drawHelmet(g, CX + fallX * 0.6, helmetTop + dropY * 0.5, t * 1.5);
    }

    // Crossbow falling away
    const bowX = CX + 12 + fallX * 0.8;
    const bowY = GY - 10 + t * 3;
    if (t < 0.9) {
        drawCrossbow(g, bowX, bowY, bowX + 16, bowY + 4, 0, 0);
    }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

type StateFrameGenerator = (g: Graphics, frame: number) => void;

const STATE_GENERATORS: Record<UnitState, { gen: StateFrameGenerator; count: number }> = {
    [UnitState.IDLE]: { gen: generateIdleFrames, count: 8 },
    [UnitState.MOVE]: { gen: generateMoveFrames, count: 8 },
    [UnitState.ATTACK]: { gen: generateAttackFrames, count: 8 },
    [UnitState.CAST]: { gen: generateCastFrames, count: 6 },
    [UnitState.DIE]: { gen: generateDieFrames, count: 8 },
};

export function generateArbelestierFrames(
    renderer: Renderer,
): Map<UnitState, Texture[]> {
    const result = new Map<UnitState, Texture[]>();

    for (const state of Object.values(UnitState)) {
        const { gen, count } = STATE_GENERATORS[state];
        const textures: Texture[] = [];

        for (let i = 0; i < count; i++) {
            const g = new Graphics();
            gen(g, i);

            const rt = RenderTexture.create({ width: F, height: F });
            renderer.render({ container: g, target: rt });
            textures.push(rt);

            g.destroy();
        }

        result.set(state, textures);
    }

    return result;
}
