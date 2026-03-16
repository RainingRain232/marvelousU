// ---------------------------------------------------------------------------
// Panzer Dragoon mode — HUD (health, mana, score, wave, skills, combo, level)
// ---------------------------------------------------------------------------

import { Container, Graphics, Text, TextStyle } from "pixi.js";
import type { DragoonState } from "../state/DragoonState";
import { DragoonClassId, DragoonSkillId } from "../state/DragoonState";
import { SKILL_CONFIGS, CLASS_DEFINITIONS, SUBCLASS_DEFINITIONS } from "../config/DragoonConfig";

// ---------------------------------------------------------------------------
// Skill icon drawing — draws a recognisable visual per attack type
// ---------------------------------------------------------------------------

function _drawSkillIcon(g: Graphics, cx: number, cy: number, skillId: DragoonSkillId, color: number, alpha: number): void {
  const a = alpha;
  switch (skillId) {
    // ── Arcane Mage ──
    case DragoonSkillId.ARCANE_BOLT: {
      // Glowing magic bolt / diamond
      g.moveTo(cx, cy - 7).lineTo(cx + 4, cy).lineTo(cx, cy + 7).lineTo(cx - 4, cy).closePath().fill({ color, alpha: a });
      g.circle(cx, cy, 3).fill({ color: 0xffffff, alpha: a * 0.4 });
      // Trailing sparkle lines
      g.moveTo(cx - 7, cy).lineTo(cx - 4, cy).stroke({ color, width: 1.5, alpha: a * 0.6 });
      break;
    }
    case DragoonSkillId.STARFALL: {
      // 4-point star
      const r = 7, ri = 3;
      for (let i = 0; i < 4; i++) {
        const ang = (i / 4) * Math.PI * 2 - Math.PI / 2;
        const angM = ang + Math.PI / 4;
        if (i === 0) g.moveTo(cx + Math.cos(ang) * r, cy + Math.sin(ang) * r);
        else g.lineTo(cx + Math.cos(ang) * r, cy + Math.sin(ang) * r);
        g.lineTo(cx + Math.cos(angM) * ri, cy + Math.sin(angM) * ri);
      }
      g.closePath().fill({ color, alpha: a });
      g.circle(cx, cy, 2).fill({ color: 0xffffff, alpha: a * 0.5 });
      break;
    }
    case DragoonSkillId.THUNDERSTORM: {
      // Lightning bolt
      g.moveTo(cx - 2, cy - 8).lineTo(cx + 3, cy - 2).lineTo(cx, cy - 2)
        .lineTo(cx + 4, cy + 8).lineTo(cx - 1, cy + 1).lineTo(cx + 2, cy + 1)
        .closePath().fill({ color, alpha: a });
      break;
    }
    case DragoonSkillId.FROST_NOVA: {
      // Snowflake / ice crystal – 6 spokes
      for (let i = 0; i < 6; i++) {
        const ang = (i / 6) * Math.PI * 2;
        g.moveTo(cx, cy).lineTo(cx + Math.cos(ang) * 8, cy + Math.sin(ang) * 8)
          .stroke({ color, width: 1.5, alpha: a });
        // small branch
        const bx = cx + Math.cos(ang) * 5, by = cy + Math.sin(ang) * 5;
        const perp = ang + Math.PI / 2;
        g.moveTo(bx - Math.cos(perp) * 2, by - Math.sin(perp) * 2)
          .lineTo(bx + Math.cos(perp) * 2, by + Math.sin(perp) * 2)
          .stroke({ color, width: 1, alpha: a * 0.7 });
      }
      g.circle(cx, cy, 2).fill({ color: 0xffffff, alpha: a * 0.4 });
      break;
    }
    case DragoonSkillId.METEOR_SHOWER: {
      // Flaming meteor falling
      g.circle(cx + 1, cy + 2, 4).fill({ color, alpha: a });
      g.circle(cx + 1, cy + 2, 2.5).fill({ color: 0xffcc00, alpha: a * 0.6 });
      // Flame trail
      g.moveTo(cx - 2, cy - 1).lineTo(cx - 5, cy - 7).lineTo(cx, cy - 3)
        .lineTo(cx - 1, cy - 8).lineTo(cx + 3, cy - 2).fill({ color: 0xff8800, alpha: a * 0.7 });
      break;
    }
    case DragoonSkillId.DIVINE_SHIELD: {
      // Shield shape
      g.moveTo(cx, cy - 7).lineTo(cx + 6, cy - 4).lineTo(cx + 6, cy + 1)
        .lineTo(cx, cy + 8).lineTo(cx - 6, cy + 1).lineTo(cx - 6, cy - 4)
        .closePath().fill({ color, alpha: a * 0.6 });
      g.moveTo(cx, cy - 7).lineTo(cx + 6, cy - 4).lineTo(cx + 6, cy + 1)
        .lineTo(cx, cy + 8).lineTo(cx - 6, cy + 1).lineTo(cx - 6, cy - 4)
        .closePath().stroke({ color: 0xffffff, width: 1.5, alpha: a * 0.5 });
      // Cross
      g.moveTo(cx, cy - 4).lineTo(cx, cy + 4).stroke({ color: 0xffffff, width: 1.5, alpha: a * 0.4 });
      g.moveTo(cx - 3, cy - 1).lineTo(cx + 3, cy - 1).stroke({ color: 0xffffff, width: 1.5, alpha: a * 0.4 });
      break;
    }
    // Chronomancer
    case DragoonSkillId.TIME_WARP: {
      // Clock / hourglass
      g.circle(cx, cy, 7).stroke({ color, width: 1.5, alpha: a });
      g.moveTo(cx, cy - 5).lineTo(cx, cy).lineTo(cx + 3, cy + 2).stroke({ color, width: 1.5, alpha: a * 0.8 });
      // Swirl arrows
      g.arc(cx, cy, 5, -0.5, 1.2).stroke({ color: 0xffffff, width: 1, alpha: a * 0.4 });
      break;
    }
    case DragoonSkillId.TEMPORAL_LOOP: {
      // Circular arrows
      g.arc(cx, cy, 6, 0, Math.PI * 1.5).stroke({ color, width: 2, alpha: a });
      g.moveTo(cx + 6, cy).lineTo(cx + 4, cy - 3).lineTo(cx + 8, cy - 1).closePath().fill({ color, alpha: a });
      break;
    }
    // Void Weaver
    case DragoonSkillId.SINGULARITY: {
      // Black hole with accretion ring
      g.circle(cx, cy, 4).fill({ color: 0x220044, alpha: a });
      g.circle(cx, cy, 7).stroke({ color, width: 2, alpha: a * 0.7 });
      g.circle(cx, cy, 5.5).stroke({ color: 0xaa44ff, width: 1, alpha: a * 0.4 });
      break;
    }
    case DragoonSkillId.MIRROR_IMAGE: {
      // Two overlapping figures
      g.roundRect(cx - 5, cy - 5, 6, 10, 1).fill({ color, alpha: a * 0.5 });
      g.roundRect(cx - 1, cy - 5, 6, 10, 1).fill({ color, alpha: a * 0.8 });
      g.circle(cx - 2, cy - 7, 2.5).fill({ color, alpha: a * 0.5 });
      g.circle(cx + 2, cy - 7, 2.5).fill({ color, alpha: a * 0.8 });
      break;
    }

    // ── Storm Ranger ──
    case DragoonSkillId.WIND_ARROW: {
      // Arrow with wind trail
      g.moveTo(cx + 7, cy).lineTo(cx + 2, cy - 3).lineTo(cx + 3, cy).lineTo(cx + 2, cy + 3).closePath().fill({ color, alpha: a });
      g.moveTo(cx + 3, cy).lineTo(cx - 6, cy).stroke({ color, width: 2, alpha: a * 0.7 });
      // Wind lines
      g.moveTo(cx - 7, cy - 3).lineTo(cx - 3, cy - 3).stroke({ color, width: 1, alpha: a * 0.3 });
      g.moveTo(cx - 6, cy + 3).lineTo(cx - 2, cy + 3).stroke({ color, width: 1, alpha: a * 0.3 });
      break;
    }
    case DragoonSkillId.CHAIN_LIGHTNING: {
      // Zigzag lightning bolt with branches
      g.moveTo(cx - 6, cy - 6).lineTo(cx - 2, cy - 2).lineTo(cx + 1, cy - 5)
        .lineTo(cx + 4, cy + 1).lineTo(cx + 1, cy - 1).lineTo(cx + 6, cy + 6)
        .stroke({ color, width: 2, alpha: a });
      // Branch
      g.moveTo(cx + 1, cy - 1).lineTo(cx + 5, cy - 3).stroke({ color, width: 1, alpha: a * 0.5 });
      break;
    }
    case DragoonSkillId.GALE_FORCE: {
      // Wind burst – three curved lines
      for (let i = -1; i <= 1; i++) {
        const oy = i * 4;
        g.moveTo(cx - 6, cy + oy).quadraticCurveTo(cx, cy + oy - 2, cx + 6, cy + oy)
          .stroke({ color, width: 1.5, alpha: a * (1 - Math.abs(i) * 0.2) });
      }
      break;
    }
    case DragoonSkillId.HAWK_COMPANION: {
      // Hawk silhouette
      g.moveTo(cx, cy - 1).lineTo(cx - 7, cy - 5).quadraticCurveTo(cx - 4, cy - 1, cx, cy)
        .fill({ color, alpha: a });
      g.moveTo(cx, cy - 1).lineTo(cx + 7, cy - 5).quadraticCurveTo(cx + 4, cy - 1, cx, cy)
        .fill({ color, alpha: a });
      // Tail
      g.moveTo(cx - 1, cy).lineTo(cx, cy + 5).lineTo(cx + 1, cy).fill({ color, alpha: a * 0.8 });
      break;
    }
    case DragoonSkillId.TORNADO: {
      // Spiral tornado shape
      g.moveTo(cx - 5, cy + 6).quadraticCurveTo(cx - 6, cy, cx - 3, cy - 3)
        .quadraticCurveTo(cx, cy - 6, cx + 3, cy - 4)
        .stroke({ color, width: 2, alpha: a });
      g.moveTo(cx - 3, cy + 4).quadraticCurveTo(cx - 4, cy + 1, cx - 1, cy - 1)
        .quadraticCurveTo(cx + 1, cy - 3, cx + 2, cy - 2)
        .stroke({ color, width: 1.5, alpha: a * 0.7 });
      // Base
      g.moveTo(cx - 6, cy + 6).lineTo(cx + 5, cy + 6).stroke({ color, width: 2, alpha: a * 0.5 });
      break;
    }
    case DragoonSkillId.WIND_WALK: {
      // Footprint with wind wisps
      g.ellipse(cx, cy + 2, 3, 5).fill({ color, alpha: a * 0.5 });
      g.moveTo(cx - 5, cy - 4).quadraticCurveTo(cx - 2, cy - 6, cx + 3, cy - 5).stroke({ color, width: 1, alpha: a * 0.5 });
      g.moveTo(cx - 4, cy - 1).quadraticCurveTo(cx - 1, cy - 3, cx + 4, cy - 2).stroke({ color, width: 1, alpha: a * 0.4 });
      break;
    }
    // Tempest Lord
    case DragoonSkillId.HURRICANE: {
      // Large swirl
      g.arc(cx, cy, 6, 0, Math.PI * 1.6).stroke({ color, width: 2, alpha: a });
      g.arc(cx, cy, 3, Math.PI, Math.PI * 2.6).stroke({ color, width: 1.5, alpha: a * 0.6 });
      g.circle(cx, cy, 1.5).fill({ color, alpha: a });
      break;
    }
    case DragoonSkillId.THUNDER_ARMOR: {
      // Body with lightning aura
      g.roundRect(cx - 3, cy - 5, 6, 10, 2).fill({ color, alpha: a * 0.5 });
      g.circle(cx, cy - 7, 3).fill({ color, alpha: a * 0.5 });
      // Lightning bolts around
      for (let i = 0; i < 4; i++) {
        const ang = (i / 4) * Math.PI * 2;
        const ex = cx + Math.cos(ang) * 8, ey = cy + Math.sin(ang) * 8;
        g.moveTo(cx + Math.cos(ang) * 5, cy + Math.sin(ang) * 5).lineTo(ex, ey)
          .stroke({ color: 0xffffff, width: 1, alpha: a * 0.5 });
      }
      break;
    }
    // Beastmaster
    case DragoonSkillId.WOLF_PACK: {
      // Three wolf heads in a triangle
      for (const [ox, oy] of [[-4, 2], [4, 2], [0, -4]] as [number, number][]) {
        g.moveTo(cx + ox, cy + oy + 3).lineTo(cx + ox - 2, cy + oy - 2).lineTo(cx + ox, cy + oy - 4)
          .lineTo(cx + ox + 2, cy + oy - 2).closePath().fill({ color, alpha: a * 0.7 });
      }
      break;
    }
    case DragoonSkillId.EAGLE_FURY: {
      // Eagle diving
      g.moveTo(cx, cy + 6).lineTo(cx - 8, cy - 3).quadraticCurveTo(cx - 3, cy - 1, cx, cy - 6)
        .quadraticCurveTo(cx + 3, cy - 1, cx + 8, cy - 3).closePath().fill({ color, alpha: a });
      g.moveTo(cx - 1, cy - 3).lineTo(cx, cy - 5).lineTo(cx + 1, cy - 3).fill({ color: 0xffffff, alpha: a * 0.3 });
      break;
    }

    // ── Blood Knight ──
    case DragoonSkillId.BLOOD_LANCE: {
      // Lance / spear
      g.moveTo(cx + 7, cy - 6).lineTo(cx + 4, cy - 3).lineTo(cx - 6, cy + 6)
        .stroke({ color, width: 2.5, alpha: a });
      // Spear tip
      g.moveTo(cx + 7, cy - 6).lineTo(cx + 5, cy - 4).lineTo(cx + 6, cy - 3)
        .closePath().fill({ color, alpha: a });
      break;
    }
    case DragoonSkillId.CRIMSON_SLASH: {
      // Three slash marks
      for (let i = -1; i <= 1; i++) {
        g.moveTo(cx - 5 + i * 2, cy - 6).lineTo(cx + 3 + i * 2, cy + 6)
          .stroke({ color, width: 1.5, alpha: a * (1 - Math.abs(i) * 0.2) });
      }
      break;
    }
    case DragoonSkillId.BLOOD_SHIELD: {
      // Shield with drop
      g.moveTo(cx, cy - 7).lineTo(cx + 6, cy - 3).lineTo(cx + 5, cy + 2)
        .lineTo(cx, cy + 7).lineTo(cx - 5, cy + 2).lineTo(cx - 6, cy - 3)
        .closePath().stroke({ color, width: 1.5, alpha: a });
      // Blood drop
      g.moveTo(cx, cy - 2).quadraticCurveTo(cx + 3, cy + 2, cx, cy + 4)
        .quadraticCurveTo(cx - 3, cy + 2, cx, cy - 2).fill({ color, alpha: a * 0.7 });
      break;
    }
    case DragoonSkillId.HEMORRHAGE: {
      // Blood droplets
      for (const [ox, oy] of [[-3, -3], [3, -1], [0, 4], [-4, 2]] as [number, number][]) {
        g.moveTo(cx + ox, cy + oy - 3).quadraticCurveTo(cx + ox + 2, cy + oy, cx + ox, cy + oy + 2)
          .quadraticCurveTo(cx + ox - 2, cy + oy, cx + ox, cy + oy - 3).fill({ color, alpha: a * 0.8 });
      }
      break;
    }
    case DragoonSkillId.EXECUTION: {
      // Axe / skull
      g.moveTo(cx, cy + 7).lineTo(cx, cy - 4).stroke({ color, width: 2, alpha: a });
      // Axe blade
      g.moveTo(cx, cy - 4).quadraticCurveTo(cx - 7, cy - 6, cx - 5, cy)
        .lineTo(cx, cy - 2).fill({ color, alpha: a });
      g.moveTo(cx, cy - 4).quadraticCurveTo(cx + 7, cy - 6, cx + 5, cy)
        .lineTo(cx, cy - 2).fill({ color, alpha: a * 0.8 });
      break;
    }
    case DragoonSkillId.WAR_CRY: {
      // Sound waves radiating
      g.circle(cx - 3, cy, 3).fill({ color, alpha: a * 0.5 });
      for (let i = 1; i <= 3; i++) {
        g.arc(cx - 1, cy, i * 3, -0.8, 0.8).stroke({ color, width: 1.5, alpha: a * (1 - i * 0.2) });
      }
      break;
    }
    // Death Knight
    case DragoonSkillId.RAISE_DEAD: {
      // Hand reaching up from ground
      g.rect(cx - 6, cy + 4, 12, 2).fill({ color: 0x554433, alpha: a * 0.5 });
      g.moveTo(cx, cy + 4).lineTo(cx, cy - 2).stroke({ color, width: 2, alpha: a });
      // Fingers
      g.moveTo(cx - 2, cy - 2).lineTo(cx - 3, cy - 5).stroke({ color, width: 1.5, alpha: a });
      g.moveTo(cx, cy - 2).lineTo(cx, cy - 6).stroke({ color, width: 1.5, alpha: a });
      g.moveTo(cx + 2, cy - 2).lineTo(cx + 3, cy - 5).stroke({ color, width: 1.5, alpha: a });
      break;
    }
    case DragoonSkillId.SOUL_HARVEST: {
      // Skull with explosion lines
      g.circle(cx, cy - 1, 4).fill({ color, alpha: a * 0.6 });
      g.circle(cx - 1.5, cy - 2, 1).fill({ color: 0x000000, alpha: a });
      g.circle(cx + 1.5, cy - 2, 1).fill({ color: 0x000000, alpha: a });
      for (let i = 0; i < 6; i++) {
        const ang = (i / 6) * Math.PI * 2;
        g.moveTo(cx + Math.cos(ang) * 5, cy + Math.sin(ang) * 5)
          .lineTo(cx + Math.cos(ang) * 8, cy + Math.sin(ang) * 8)
          .stroke({ color, width: 1, alpha: a * 0.5 });
      }
      break;
    }
    // Paladin
    case DragoonSkillId.HOLY_NOVA: {
      // Radiant cross with burst
      g.moveTo(cx, cy - 7).lineTo(cx, cy + 7).stroke({ color, width: 2, alpha: a });
      g.moveTo(cx - 7, cy).lineTo(cx + 7, cy).stroke({ color, width: 2, alpha: a });
      g.circle(cx, cy, 4).fill({ color, alpha: a * 0.25 });
      g.circle(cx, cy, 7).stroke({ color: 0xffffff, width: 1, alpha: a * 0.3 });
      break;
    }
    case DragoonSkillId.CONSECRATION: {
      // Holy ground ring with cross
      g.circle(cx, cy + 2, 6).stroke({ color, width: 1.5, alpha: a * 0.7 });
      g.circle(cx, cy + 2, 6).fill({ color, alpha: a * 0.15 });
      g.moveTo(cx, cy - 2).lineTo(cx, cy + 5).stroke({ color: 0xffffff, width: 1, alpha: a * 0.5 });
      g.moveTo(cx - 3, cy + 1).lineTo(cx + 3, cy + 1).stroke({ color: 0xffffff, width: 1, alpha: a * 0.5 });
      break;
    }

    // ── Shadow Assassin ──
    case DragoonSkillId.SHURIKEN: {
      // 4-pointed throwing star
      for (let i = 0; i < 4; i++) {
        const ang = (i / 4) * Math.PI * 2 + Math.PI / 4;
        const angN = ang + Math.PI / 4;
        g.moveTo(cx, cy)
          .lineTo(cx + Math.cos(ang) * 7, cy + Math.sin(ang) * 7)
          .lineTo(cx + Math.cos(angN) * 2, cy + Math.sin(angN) * 2)
          .closePath().fill({ color, alpha: a * 0.8 });
      }
      g.circle(cx, cy, 1.5).fill({ color: 0x444444, alpha: a });
      break;
    }
    case DragoonSkillId.FAN_OF_KNIVES: {
      // Fan of blades radiating outward
      for (let i = 0; i < 5; i++) {
        const ang = -Math.PI / 2 + (i - 2) * 0.35;
        g.moveTo(cx, cy + 3).lineTo(cx + Math.cos(ang) * 8, cy + 3 + Math.sin(ang) * 8)
          .stroke({ color, width: 1.5, alpha: a * (1 - Math.abs(i - 2) * 0.15) });
      }
      break;
    }
    case DragoonSkillId.POISON_CLOUD: {
      // Toxic cloud with skull
      g.circle(cx - 2, cy, 4).fill({ color, alpha: a * 0.3 });
      g.circle(cx + 2, cy - 1, 3.5).fill({ color, alpha: a * 0.35 });
      g.circle(cx, cy + 2, 3).fill({ color, alpha: a * 0.3 });
      // Skull mark
      g.circle(cx, cy - 1, 2).fill({ color: 0xffffff, alpha: a * 0.4 });
      g.circle(cx - 0.7, cy - 1.5, 0.6).fill({ color: 0x000000, alpha: a * 0.5 });
      g.circle(cx + 0.7, cy - 1.5, 0.6).fill({ color: 0x000000, alpha: a * 0.5 });
      break;
    }
    case DragoonSkillId.SHADOW_STEP: {
      // Teleport / dash lines with silhouette
      g.roundRect(cx + 2, cy - 5, 4, 10, 1).fill({ color, alpha: a * 0.7 });
      g.circle(cx + 4, cy - 7, 2).fill({ color, alpha: a * 0.7 });
      // Ghost trail
      g.roundRect(cx - 4, cy - 4, 3, 8, 1).fill({ color, alpha: a * 0.2 });
      g.moveTo(cx - 6, cy - 3).lineTo(cx - 1, cy - 3).stroke({ color, width: 1, alpha: a * 0.3 });
      g.moveTo(cx - 5, cy + 1).lineTo(cx, cy + 1).stroke({ color, width: 1, alpha: a * 0.3 });
      break;
    }
    case DragoonSkillId.MARK_FOR_DEATH: {
      // Crosshair / target
      g.circle(cx, cy, 6).stroke({ color, width: 1.5, alpha: a });
      g.circle(cx, cy, 3).stroke({ color, width: 1, alpha: a * 0.6 });
      g.moveTo(cx, cy - 8).lineTo(cx, cy - 4).stroke({ color, width: 1.5, alpha: a });
      g.moveTo(cx, cy + 4).lineTo(cx, cy + 8).stroke({ color, width: 1.5, alpha: a });
      g.moveTo(cx - 8, cy).lineTo(cx - 4, cy).stroke({ color, width: 1.5, alpha: a });
      g.moveTo(cx + 4, cy).lineTo(cx + 8, cy).stroke({ color, width: 1.5, alpha: a });
      break;
    }
    case DragoonSkillId.SMOKE_BOMB: {
      // Smoke puffs
      g.circle(cx - 2, cy + 1, 4).fill({ color, alpha: a * 0.3 });
      g.circle(cx + 3, cy, 3.5).fill({ color, alpha: a * 0.35 });
      g.circle(cx, cy - 2, 3).fill({ color, alpha: a * 0.4 });
      g.circle(cx + 1, cy + 3, 2.5).fill({ color, alpha: a * 0.25 });
      break;
    }
    // Ninja
    case DragoonSkillId.SHADOW_CLONE_ARMY: {
      // Multiple shadow figures
      for (const [ox, a2] of [[-4, 0.3], [0, 0.6], [4, 0.9]] as [number, number][]) {
        g.roundRect(cx + ox - 2, cy - 3, 4, 8, 1).fill({ color, alpha: a * a2 });
        g.circle(cx + ox, cy - 5, 2).fill({ color, alpha: a * a2 });
      }
      break;
    }
    case DragoonSkillId.BLADE_STORM: {
      // Spinning ring of blades
      g.circle(cx, cy, 6).stroke({ color, width: 1, alpha: a * 0.3 });
      for (let i = 0; i < 6; i++) {
        const ang = (i / 6) * Math.PI * 2;
        const bx = cx + Math.cos(ang) * 6, by = cy + Math.sin(ang) * 6;
        g.moveTo(bx, by).lineTo(bx + Math.cos(ang) * 2, by + Math.sin(ang) * 2)
          .stroke({ color, width: 2, alpha: a * 0.8 });
      }
      break;
    }
    // Phantom
    case DragoonSkillId.SOUL_SIPHON: {
      // Drain beam between two points
      g.circle(cx - 4, cy, 3).fill({ color, alpha: a * 0.4 });
      g.circle(cx + 4, cy, 3).fill({ color: 0xff4444, alpha: a * 0.4 });
      g.moveTo(cx - 2, cy).quadraticCurveTo(cx, cy - 2, cx + 2, cy).stroke({ color, width: 1.5, alpha: a });
      g.moveTo(cx - 2, cy).quadraticCurveTo(cx, cy + 2, cx + 2, cy).stroke({ color, width: 1.5, alpha: a * 0.6 });
      break;
    }
    case DragoonSkillId.PHASE_SHIFT: {
      // Ghostly figure with phase lines
      g.roundRect(cx - 3, cy - 4, 6, 9, 2).fill({ color, alpha: a * 0.3 });
      g.circle(cx, cy - 6, 2.5).fill({ color, alpha: a * 0.3 });
      g.roundRect(cx - 3, cy - 4, 6, 9, 2).stroke({ color, width: 1.5, alpha: a * 0.7 });
      // Phase lines
      for (let i = -2; i <= 2; i++) {
        g.moveTo(cx - 6, cy + i * 3).lineTo(cx + 6, cy + i * 3).stroke({ color, width: 0.5, alpha: a * 0.2 });
      }
      break;
    }

    // ── Unlockable Universal Skills ──
    case DragoonSkillId.FIREBALL_BARRAGE: {
      // Multiple fireballs in spread
      for (const [ox, oy] of [[-4, -2], [0, -4], [4, -2], [-2, 2], [2, 2]] as [number, number][]) {
        g.circle(cx + ox, cy + oy, 2).fill({ color, alpha: a * 0.7 });
        g.circle(cx + ox, cy + oy, 1).fill({ color: 0xffcc00, alpha: a * 0.4 });
      }
      break;
    }
    case DragoonSkillId.ARCANE_SHIELD: {
      // Arcane bubble shield
      g.circle(cx, cy, 7).stroke({ color, width: 2, alpha: a * 0.6 });
      g.circle(cx, cy, 7).fill({ color, alpha: a * 0.1 });
      // Rune marks
      g.moveTo(cx - 3, cy - 3).lineTo(cx + 3, cy + 3).stroke({ color: 0xffffff, width: 1, alpha: a * 0.3 });
      g.moveTo(cx + 3, cy - 3).lineTo(cx - 3, cy + 3).stroke({ color: 0xffffff, width: 1, alpha: a * 0.3 });
      break;
    }
    case DragoonSkillId.SPEED_SURGE: {
      // Speed lines / arrow
      g.moveTo(cx + 6, cy).lineTo(cx, cy - 4).lineTo(cx + 2, cy).lineTo(cx, cy + 4).closePath().fill({ color, alpha: a });
      g.moveTo(cx - 6, cy - 2).lineTo(cx - 1, cy - 2).stroke({ color, width: 1, alpha: a * 0.4 });
      g.moveTo(cx - 7, cy).lineTo(cx - 2, cy).stroke({ color, width: 1.5, alpha: a * 0.5 });
      g.moveTo(cx - 6, cy + 2).lineTo(cx - 1, cy + 2).stroke({ color, width: 1, alpha: a * 0.4 });
      break;
    }
    case DragoonSkillId.CHAIN_NOVA: {
      // Lightning chain between nodes
      g.circle(cx - 4, cy - 3, 2).fill({ color, alpha: a * 0.6 });
      g.circle(cx + 4, cy - 3, 2).fill({ color, alpha: a * 0.6 });
      g.circle(cx, cy + 4, 2).fill({ color, alpha: a * 0.6 });
      g.moveTo(cx - 4, cy - 3).lineTo(cx + 4, cy - 3).stroke({ color, width: 1.5, alpha: a });
      g.moveTo(cx + 4, cy - 3).lineTo(cx, cy + 4).stroke({ color, width: 1.5, alpha: a });
      g.moveTo(cx, cy + 4).lineTo(cx - 4, cy - 3).stroke({ color, width: 1.5, alpha: a });
      break;
    }
    case DragoonSkillId.HEALING_LIGHT: {
      // Plus/cross with glow
      g.moveTo(cx - 5, cy).lineTo(cx + 5, cy).stroke({ color, width: 3, alpha: a });
      g.moveTo(cx, cy - 5).lineTo(cx, cy + 5).stroke({ color, width: 3, alpha: a });
      g.circle(cx, cy, 4).fill({ color, alpha: a * 0.15 });
      break;
    }
    case DragoonSkillId.AOE_BOMB: {
      // Bomb with explosion
      g.circle(cx, cy + 1, 5).fill({ color, alpha: a * 0.6 });
      // Fuse
      g.moveTo(cx + 2, cy - 4).quadraticCurveTo(cx + 5, cy - 6, cx + 3, cy - 7).stroke({ color: 0xffcc00, width: 1.5, alpha: a });
      // Explosion rays
      for (let i = 0; i < 6; i++) {
        const ang = (i / 6) * Math.PI * 2;
        g.moveTo(cx + Math.cos(ang) * 6, cy + 1 + Math.sin(ang) * 6)
          .lineTo(cx + Math.cos(ang) * 8, cy + 1 + Math.sin(ang) * 8)
          .stroke({ color: 0xffaa00, width: 1, alpha: a * 0.5 });
      }
      break;
    }
    case DragoonSkillId.HOMING_MISSILES: {
      // Multiple missiles with curved trails
      for (const [ox, oy] of [[-3, -4, 0.3], [3, -3, -0.2], [0, 1, 0.1]] as [number, number, number][]) {
        g.moveTo(cx + ox, cy + oy).lineTo(cx + ox + 2, cy + oy - 1).lineTo(cx + ox, cy + oy + 2)
          .closePath().fill({ color, alpha: a * 0.8 });
      }
      // Trail curves
      g.moveTo(cx - 3, cy + 5).quadraticCurveTo(cx - 5, cy, cx - 3, cy - 4).stroke({ color, width: 1, alpha: a * 0.3 });
      g.moveTo(cx + 3, cy + 4).quadraticCurveTo(cx + 5, cy, cx + 3, cy - 3).stroke({ color, width: 1, alpha: a * 0.3 });
      break;
    }
    case DragoonSkillId.TIME_SLOW: {
      // Clock with slow motion marks
      g.circle(cx, cy, 7).stroke({ color, width: 1.5, alpha: a * 0.7 });
      g.moveTo(cx, cy).lineTo(cx - 3, cy - 4).stroke({ color, width: 1.5, alpha: a });
      g.moveTo(cx, cy).lineTo(cx + 4, cy - 1).stroke({ color, width: 1.5, alpha: a });
      // Slow marks
      g.moveTo(cx - 8, cy + 3).lineTo(cx - 5, cy + 3).stroke({ color: 0xffffff, width: 1, alpha: a * 0.3 });
      g.moveTo(cx - 9, cy + 5).lineTo(cx - 5, cy + 5).stroke({ color: 0xffffff, width: 1, alpha: a * 0.3 });
      break;
    }
    default: {
      // Fallback: simple colored orb
      g.circle(cx, cy, 5).fill({ color, alpha: a });
      g.circle(cx, cy, 2.5).fill({ color: 0xffffff, alpha: a * 0.3 });
      break;
    }
  }
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const STYLE_SCORE = new TextStyle({
  fontFamily: "Georgia, serif", fontSize: 24, fill: 0xffd700,
  fontWeight: "bold", dropShadow: { color: 0x000000, distance: 2, alpha: 0.8 }, letterSpacing: 2,
});

const STYLE_WAVE = new TextStyle({
  fontFamily: "Georgia, serif", fontSize: 18, fill: 0xccddff,
  fontWeight: "bold", dropShadow: { color: 0x000000, distance: 1, alpha: 0.8 },
});

const STYLE_COMBO = new TextStyle({
  fontFamily: "Georgia, serif", fontSize: 20, fill: 0xff8844,
  fontWeight: "bold", dropShadow: { color: 0x000000, distance: 1, alpha: 0.8 }, fontStyle: "italic",
});

const STYLE_SKILL_NAME = new TextStyle({
  fontFamily: "Georgia, serif", fontSize: 9, fill: 0xcccccc,
});

const STYLE_SKILL_KEY = new TextStyle({
  fontFamily: "Georgia, serif", fontSize: 10, fill: 0xffffff, fontWeight: "bold",
});

const STYLE_NOTIFICATION = new TextStyle({
  fontFamily: "Georgia, serif", fontSize: 28, fill: 0xffffff,
  fontWeight: "bold", dropShadow: { color: 0x000000, distance: 3, alpha: 0.8 }, letterSpacing: 3,
});

const STYLE_BOSS_WARNING = new TextStyle({
  fontFamily: "Georgia, serif", fontSize: 36, fill: 0xff4444,
  fontWeight: "bold", dropShadow: { color: 0x000000, distance: 4, alpha: 0.8 }, letterSpacing: 4, fontStyle: "italic",
});

const STYLE_BETWEEN_WAVE = new TextStyle({
  fontFamily: "Georgia, serif", fontSize: 22, fill: 0x88ccff,
  fontWeight: "bold", dropShadow: { color: 0x000000, distance: 2, alpha: 0.8 },
});

const STYLE_LEVEL = new TextStyle({
  fontFamily: "Georgia, serif", fontSize: 13, fill: 0xdddddd,
  fontWeight: "bold", dropShadow: { color: 0x000000, distance: 1, alpha: 0.8 },
});

const STYLE_CLASS_TITLE = new TextStyle({
  fontFamily: "Georgia, serif", fontSize: 32, fill: 0xffd700,
  fontWeight: "bold", dropShadow: { color: 0x000000, distance: 3, alpha: 0.8 }, letterSpacing: 3,
});

const STYLE_CLASS_NAME = new TextStyle({
  fontFamily: "Georgia, serif", fontSize: 20, fill: 0xffffff,
  fontWeight: "bold", dropShadow: { color: 0x000000, distance: 2, alpha: 0.8 },
});

const STYLE_CLASS_DESC = new TextStyle({
  fontFamily: "Georgia, serif", fontSize: 12, fill: 0xbbbbbb,
  wordWrap: true, wordWrapWidth: 220,
});

const STYLE_CLASS_KEY = new TextStyle({
  fontFamily: "Georgia, serif", fontSize: 14, fill: 0xffdd44,
  fontWeight: "bold",
});

// ---------------------------------------------------------------------------
// HUD
// ---------------------------------------------------------------------------

export class DragoonHUD {
  readonly container = new Container();

  private _hpBarBg = new Graphics();
  private _hpBarFill = new Graphics();
  private _manaBarBg = new Graphics();
  private _manaBarFill = new Graphics();
  private _scoreText = new Text({ text: "0", style: STYLE_SCORE });
  private _waveText = new Text({ text: "Wave 1", style: STYLE_WAVE });
  private _comboText = new Text({ text: "", style: STYLE_COMBO });
  private _skillBg = new Graphics();
  private _skillTexts: { name: Text; key: Text; cooldown: Graphics }[] = [];
  private _bossHpBg = new Graphics();
  private _bossHpFill = new Graphics();
  private _bossNameText = new Text({ text: "", style: STYLE_WAVE });

  // Level & XP
  private _levelText = new Text({ text: "Lv 1", style: STYLE_LEVEL });
  private _xpBarBg = new Graphics();
  private _xpBarFill = new Graphics();

  // Class select overlay
  private _classSelectContainer = new Container();

  // Subclass select overlay
  private _subclassSelectContainer = new Container();

  // Escape menu overlay
  private _escapeMenuContainer = new Container();
  private _escapeMenuResumeCb: (() => void) | null = null;
  private _escapeMenuMainMenuCb: (() => void) | null = null;
  private _escapeMenuClickHandler: ((e: MouseEvent) => void) | null = null;

  // Unlock skill slot
  private _unlockSkillBg = new Graphics();
  private _unlockSkillName = new Text({ text: "", style: STYLE_SKILL_NAME });
  private _unlockSkillKey = new Text({ text: "6", style: STYLE_SKILL_KEY });
  private _unlockSkillCooldown = new Graphics();

  // Notifications
  private _notifications: { text: Text; timer: number }[] = [];

  // Boss warning
  private _bossWarningText = new Text({ text: "BOSS INCOMING!", style: STYLE_BOSS_WARNING });
  private _bossWarningTimer = 0;

  // Boss entrance overlay
  private _bossEntranceText = new Text({ text: "", style: STYLE_BOSS_WARNING });
  private _bossEntranceNameText = new Text({ text: "", style: STYLE_NOTIFICATION });

  // Score multiplier indicator
  private _scoreMultText = new Text({ text: "x2 SCORE", style: new TextStyle({
    fontFamily: "Georgia, serif", fontSize: 16, fill: 0xffdd44,
    fontWeight: "bold", dropShadow: { color: 0x000000, distance: 1, alpha: 0.8 },
  }) });

  // Between waves text
  private _betweenWaveText = new Text({ text: "", style: STYLE_BETWEEN_WAVE });

  // Class name display
  private _classNameText = new Text({ text: "", style: new TextStyle({
    fontFamily: "Georgia, serif", fontSize: 11, fill: 0xaaaacc,
    dropShadow: { color: 0x000000, distance: 1, alpha: 0.8 },
  }) });

  private _lastSkillIds: string = "";

  build(sw: number, sh: number): void {
    this.container.removeChildren();

    // HP bar
    this.container.addChild(this._hpBarBg);
    this.container.addChild(this._hpBarFill);

    // Mana bar
    this.container.addChild(this._manaBarBg);
    this.container.addChild(this._manaBarFill);

    // XP bar
    this.container.addChild(this._xpBarBg);
    this.container.addChild(this._xpBarFill);

    // Level text
    this._levelText.position.set(205, 15);
    this.container.addChild(this._levelText);

    // Class name
    this._classNameText.position.set(205, 31);
    this.container.addChild(this._classNameText);

    // Score
    this._scoreText.anchor.set(1, 0);
    this._scoreText.position.set(sw - 20, 15);
    this.container.addChild(this._scoreText);

    // Wave
    this._waveText.anchor.set(0.5, 0);
    this._waveText.position.set(sw / 2, 10);
    this.container.addChild(this._waveText);

    // Combo
    this._comboText.anchor.set(0.5, 0);
    this._comboText.position.set(sw / 2, 35);
    this.container.addChild(this._comboText);

    // Skill bar
    this.container.addChild(this._skillBg);

    // Boss HP bar
    this.container.addChild(this._bossHpBg);
    this.container.addChild(this._bossHpFill);
    this._bossNameText.anchor.set(0.5, 1);
    this.container.addChild(this._bossNameText);

    // Boss warning
    this._bossWarningText.anchor.set(0.5, 0.5);
    this._bossWarningText.position.set(sw / 2, sh / 2 - 50);
    this._bossWarningText.alpha = 0;
    this.container.addChild(this._bossWarningText);

    // Boss entrance
    this._bossEntranceText.anchor.set(0.5, 0.5);
    this._bossEntranceText.position.set(sw / 2, sh / 2 - 80);
    this._bossEntranceText.alpha = 0;
    this.container.addChild(this._bossEntranceText);
    this._bossEntranceNameText.anchor.set(0.5, 0.5);
    this._bossEntranceNameText.position.set(sw / 2, sh / 2 - 40);
    this._bossEntranceNameText.alpha = 0;
    this.container.addChild(this._bossEntranceNameText);

    // Score multiplier
    this._scoreMultText.anchor.set(1, 0);
    this._scoreMultText.position.set(sw - 20, 42);
    this._scoreMultText.alpha = 0;
    this.container.addChild(this._scoreMultText);

    // Between wave text
    this._betweenWaveText.anchor.set(0.5, 0.5);
    this._betweenWaveText.position.set(sw / 2, sh / 2);
    this.container.addChild(this._betweenWaveText);

    // Unlock skill slot elements
    this.container.addChild(this._unlockSkillBg);
    this.container.addChild(this._unlockSkillCooldown);
    this._unlockSkillName.anchor.set(0.5, 0);
    this.container.addChild(this._unlockSkillName);
    this._unlockSkillKey.anchor.set(0.5, 0.5);
    this.container.addChild(this._unlockSkillKey);

    // Class select overlay
    this.container.addChild(this._classSelectContainer);
    this.container.addChild(this._subclassSelectContainer);

    // Escape menu overlay
    this.container.addChild(this._escapeMenuContainer);

    this._lastSkillIds = "";
  }

  private _buildSkillBar(state: DragoonState, sw: number, sh: number): void {
    // Get active skill IDs (skip index 0 which is basic attack)
    const skills = state.skills.slice(1).map(s => s.id);
    const currentIds = skills.join(",");
    if (currentIds === this._lastSkillIds) return;
    this._lastSkillIds = currentIds;

    // Remove old skill texts
    for (const st of this._skillTexts) {
      st.name.destroy();
      st.key.destroy();
      st.cooldown.destroy();
    }
    this._skillTexts = [];

    const slotW = 60;
    const slotH = 50;
    const gap = 8;
    const totalW = skills.length * slotW + (skills.length - 1) * gap;
    const startX = (sw - totalW) / 2;
    const y = sh - slotH - 15;

    for (let i = 0; i < skills.length; i++) {
      const cfg = SKILL_CONFIGS[skills[i]];
      const x = startX + i * (slotW + gap);

      const name = new Text({ text: cfg.name, style: STYLE_SKILL_NAME });
      name.anchor.set(0.5, 0);
      name.position.set(x + slotW / 2, y + slotH + 2);

      const key = new Text({ text: cfg.key, style: STYLE_SKILL_KEY });
      key.anchor.set(0.5, 0.5);
      key.position.set(x + slotW / 2, y + slotH / 2);

      const cooldown = new Graphics();

      this.container.addChild(name);
      this.container.addChild(key);
      this.container.addChild(cooldown);

      this._skillTexts.push({ name, key, cooldown });
    }
  }

  // ---------------------------------------------------------------------------
  // Class select screen
  // ---------------------------------------------------------------------------

  buildClassSelect(sw: number, sh: number): void {
    this._classSelectContainer.removeChildren();

    // Background overlay
    const bg = new Graphics();
    bg.rect(0, 0, sw, sh).fill({ color: 0x000000, alpha: 0.85 });
    this._classSelectContainer.addChild(bg);

    // Title
    const title = new Text({ text: "Choose Your Class", style: STYLE_CLASS_TITLE });
    title.anchor.set(0.5, 0);
    title.position.set(sw / 2, 40);
    this._classSelectContainer.addChild(title);

    const classes = [
      DragoonClassId.ARCANE_MAGE,
      DragoonClassId.STORM_RANGER,
      DragoonClassId.BLOOD_KNIGHT,
      DragoonClassId.SHADOW_ASSASSIN,
    ];

    const cardW = 200;
    const cardH = 280;
    const gap = 20;
    const totalW = classes.length * cardW + (classes.length - 1) * gap;
    const startX = (sw - totalW) / 2;
    const cardY = sh / 2 - cardH / 2;

    for (let i = 0; i < classes.length; i++) {
      const def = CLASS_DEFINITIONS[classes[i]];
      const x = startX + i * (cardW + gap);

      // Card background
      const card = new Graphics();
      card.roundRect(x, cardY, cardW, cardH, 8).fill({ color: 0x0a0a1a, alpha: 0.9 });
      card.roundRect(x, cardY, cardW, cardH, 8).stroke({ color: def.color, width: 2 });
      this._classSelectContainer.addChild(card);

      // Class color orb
      const orbG = new Graphics();
      orbG.circle(x + cardW / 2, cardY + 35, 18).fill({ color: def.color, alpha: 0.3 });
      orbG.circle(x + cardW / 2, cardY + 35, 12).fill({ color: def.color });
      orbG.circle(x + cardW / 2, cardY + 35, 5).fill({ color: 0xffffff, alpha: 0.3 });
      this._classSelectContainer.addChild(orbG);

      // Key prompt
      const keyText = new Text({ text: `[${i + 1}]`, style: STYLE_CLASS_KEY });
      keyText.anchor.set(0.5, 0);
      keyText.position.set(x + cardW / 2, cardY + 60);
      this._classSelectContainer.addChild(keyText);

      // Class name
      const nameText = new Text({ text: def.name, style: STYLE_CLASS_NAME });
      nameText.anchor.set(0.5, 0);
      nameText.position.set(x + cardW / 2, cardY + 82);
      this._classSelectContainer.addChild(nameText);

      // Description
      const descText = new Text({ text: def.description, style: STYLE_CLASS_DESC });
      descText.anchor.set(0.5, 0);
      descText.position.set(x + cardW / 2, cardY + 110);
      this._classSelectContainer.addChild(descText);

      // Skills list
      const skillNames = def.skills.map(s => SKILL_CONFIGS[s].name).join("\n");
      const skillText = new Text({ text: skillNames, style: new TextStyle({
        fontFamily: "Georgia, serif", fontSize: 10, fill: 0x99aacc, lineHeight: 15,
      }) });
      skillText.anchor.set(0.5, 0);
      skillText.position.set(x + cardW / 2, cardY + 165);
      this._classSelectContainer.addChild(skillText);

      // Stat mods
      const stats = `HP:${Math.round(def.hpMod * 100)}% MP:${Math.round(def.manaMod * 100)}% SPD:${Math.round(def.speedMod * 100)}%`;
      const statText = new Text({ text: stats, style: new TextStyle({
        fontFamily: "Georgia, serif", fontSize: 9, fill: 0x888888,
      }) });
      statText.anchor.set(0.5, 0);
      statText.position.set(x + cardW / 2, cardY + cardH - 25);
      this._classSelectContainer.addChild(statText);
    }

    this._classSelectContainer.visible = true;
  }

  hideClassSelect(): void {
    this._classSelectContainer.removeChildren();
    this._classSelectContainer.visible = false;
  }

  // ---------------------------------------------------------------------------
  // Subclass choice screen
  // ---------------------------------------------------------------------------

  buildSubclassChoice(state: DragoonState, sw: number, sh: number): void {
    this._subclassSelectContainer.removeChildren();
    if (!state.subclassOptions) return;

    // Background
    const bg = new Graphics();
    bg.rect(0, 0, sw, sh).fill({ color: 0x000000, alpha: 0.85 });
    this._subclassSelectContainer.addChild(bg);

    // Title
    const title = new Text({ text: "Level 20 - Choose Your Path", style: STYLE_CLASS_TITLE });
    title.anchor.set(0.5, 0);
    title.position.set(sw / 2, 50);
    this._subclassSelectContainer.addChild(title);

    const cardW = 280;
    const cardH = 300;
    const gap = 40;
    const totalW = 2 * cardW + gap;
    const startX = (sw - totalW) / 2;
    const cardY = sh / 2 - cardH / 2;

    for (let i = 0; i < 2; i++) {
      const subId = state.subclassOptions[i];
      const def = SUBCLASS_DEFINITIONS[subId];
      const x = startX + i * (cardW + gap);

      // Card
      const card = new Graphics();
      card.roundRect(x, cardY, cardW, cardH, 10).fill({ color: 0x0a0a1a, alpha: 0.9 });
      card.roundRect(x, cardY, cardW, cardH, 10).stroke({ color: def.color, width: 2.5 });
      this._subclassSelectContainer.addChild(card);

      // Color orb
      const orbG = new Graphics();
      orbG.circle(x + cardW / 2, cardY + 40, 22).fill({ color: def.color, alpha: 0.3 });
      orbG.circle(x + cardW / 2, cardY + 40, 15).fill({ color: def.color });
      orbG.circle(x + cardW / 2, cardY + 40, 6).fill({ color: 0xffffff, alpha: 0.3 });
      this._subclassSelectContainer.addChild(orbG);

      // Key
      const keyText = new Text({ text: `[${i + 1}]`, style: STYLE_CLASS_KEY });
      keyText.anchor.set(0.5, 0);
      keyText.position.set(x + cardW / 2, cardY + 68);
      this._subclassSelectContainer.addChild(keyText);

      // Name
      const nameText = new Text({ text: def.name, style: { ...STYLE_CLASS_NAME, fill: def.color } as any });
      nameText.anchor.set(0.5, 0);
      nameText.position.set(x + cardW / 2, cardY + 92);
      this._subclassSelectContainer.addChild(nameText);

      // Description
      const descText = new Text({ text: def.description, style: { ...STYLE_CLASS_DESC, wordWrapWidth: 250 } as any });
      descText.anchor.set(0.5, 0);
      descText.position.set(x + cardW / 2, cardY + 122);
      this._subclassSelectContainer.addChild(descText);

      // New skills
      const skill4 = SKILL_CONFIGS[def.replaceSkill4];
      const skill5 = SKILL_CONFIGS[def.replaceSkill5];

      const newSkillTitle = new Text({ text: "New Skills:", style: new TextStyle({
        fontFamily: "Georgia, serif", fontSize: 12, fill: 0xffdd44, fontWeight: "bold",
      }) });
      newSkillTitle.anchor.set(0.5, 0);
      newSkillTitle.position.set(x + cardW / 2, cardY + 175);
      this._subclassSelectContainer.addChild(newSkillTitle);

      const skill4Text = new Text({ text: `[4] ${skill4.name}: ${skill4.description}`, style: new TextStyle({
        fontFamily: "Georgia, serif", fontSize: 11, fill: 0xccddee, wordWrap: true, wordWrapWidth: 240,
      }) });
      skill4Text.anchor.set(0.5, 0);
      skill4Text.position.set(x + cardW / 2, cardY + 200);
      this._subclassSelectContainer.addChild(skill4Text);

      const skill5Text = new Text({ text: `[5] ${skill5.name}: ${skill5.description}`, style: new TextStyle({
        fontFamily: "Georgia, serif", fontSize: 11, fill: 0xccddee, wordWrap: true, wordWrapWidth: 240,
      }) });
      skill5Text.anchor.set(0.5, 0);
      skill5Text.position.set(x + cardW / 2, cardY + 245);
      this._subclassSelectContainer.addChild(skill5Text);
    }

    this._subclassSelectContainer.visible = true;
  }

  hideSubclassChoice(): void {
    this._subclassSelectContainer.removeChildren();
    this._subclassSelectContainer.visible = false;
  }

  // ---------------------------------------------------------------------------
  // Update
  // ---------------------------------------------------------------------------

  update(state: DragoonState, sw: number, sh: number, dt: number): void {
    // Don't update game HUD during selection screens
    if (state.classSelectActive || state.subclassChoiceActive) return;

    const p = state.player;

    // Rebuild skill bar if skills changed
    this._buildSkillBar(state, sw, sh);

    // HP bar
    const hpX = 20, hpY = 15, hpW = 180, hpH = 16;
    this._hpBarBg.clear();
    this._hpBarBg.roundRect(hpX - 1, hpY - 1, hpW + 2, hpH + 2, 5).fill({ color: 0x110000 });
    this._hpBarBg.roundRect(hpX, hpY, hpW, hpH, 4).fill({ color: 0x220000 });
    this._hpBarBg.roundRect(hpX, hpY, hpW, hpH, 4).stroke({ color: 0x884444, width: 1.5 });
    this._hpBarBg.roundRect(hpX + 1, hpY + 1, hpW - 2, 3, 2).fill({ color: 0x000000, alpha: 0.2 });
    this._hpBarFill.clear();
    const hpPct = p.hp / p.maxHp;
    const hpColor = hpPct > 0.5 ? 0x44cc44 : hpPct > 0.25 ? 0xccaa22 : 0xcc2222;
    const hpColorBright = hpPct > 0.5 ? 0x66ee66 : hpPct > 0.25 ? 0xeedd44 : 0xee4444;
    const fillW = (hpW - 2) * hpPct;
    this._hpBarFill.roundRect(hpX + 1, hpY + 1, fillW, hpH - 2, 3).fill({ color: hpColor });
    this._hpBarFill.roundRect(hpX + 1, hpY + 1, fillW, (hpH - 2) * 0.45, 3).fill({ color: hpColorBright, alpha: 0.4 });
    this._hpBarFill.roundRect(hpX + 2, hpY + 2, fillW - 2, 2, 1).fill({ color: 0xffffff, alpha: 0.15 });
    const shineX = ((state.gameTime * 40) % (hpW + 30)) - 15;
    if (shineX > hpX && shineX < hpX + fillW) {
      this._hpBarFill.roundRect(shineX, hpY + 2, 12, hpH - 4, 2).fill({ color: 0xffffff, alpha: 0.08 });
    }
    if (hpPct < 0.25) {
      const pulseAlpha = 0.15 + Math.sin(state.gameTime * 6) * 0.08;
      this._hpBarFill.roundRect(hpX - 2, hpY - 2, hpW + 4, hpH + 4, 6).fill({ color: 0xff0000, alpha: pulseAlpha });
      this._hpBarFill.roundRect(hpX, hpY, hpW, hpH, 4).stroke({ color: 0xff4444, width: 1, alpha: pulseAlpha * 2 });
    }
    this._hpBarBg.circle(hpX - 8, hpY + hpH / 2 - 1, 3).fill({ color: 0xff4444, alpha: 0.7 });
    this._hpBarBg.circle(hpX - 5, hpY + hpH / 2 - 1, 3).fill({ color: 0xff4444, alpha: 0.7 });
    this._hpBarBg.moveTo(hpX - 10, hpY + hpH / 2).lineTo(hpX - 6.5, hpY + hpH / 2 + 4).lineTo(hpX - 3, hpY + hpH / 2).fill({ color: 0xff4444, alpha: 0.7 });

    // Mana bar
    const manaX = 20, manaY = hpY + hpH + 6, manaW = 180, manaH = 12;
    this._manaBarBg.clear();
    this._manaBarBg.roundRect(manaX - 1, manaY - 1, manaW + 2, manaH + 2, 4).fill({ color: 0x000011 });
    this._manaBarBg.roundRect(manaX, manaY, manaW, manaH, 3).fill({ color: 0x000022 });
    this._manaBarBg.roundRect(manaX, manaY, manaW, manaH, 3).stroke({ color: 0x4444aa, width: 1.5 });
    this._manaBarBg.roundRect(manaX + 1, manaY + 1, manaW - 2, 2, 1).fill({ color: 0x000000, alpha: 0.2 });
    this._manaBarFill.clear();
    const manaPct = p.mana / p.maxMana;
    const manaFillW = (manaW - 2) * manaPct;
    this._manaBarFill.roundRect(manaX + 1, manaY + 1, manaFillW, manaH - 2, 2).fill({ color: 0x4488ff });
    this._manaBarFill.roundRect(manaX + 1, manaY + 1, manaFillW, (manaH - 2) * 0.4, 2).fill({ color: 0x66aaff, alpha: 0.4 });
    this._manaBarFill.roundRect(manaX + 2, manaY + 2, manaFillW - 2, 1.5, 1).fill({ color: 0xffffff, alpha: 0.12 });
    this._manaBarBg.moveTo(manaX - 6.5, manaY + manaH / 2).lineTo(manaX - 3, manaY + 1).lineTo(manaX + 0.5, manaY + manaH / 2).lineTo(manaX - 3, manaY + manaH - 1).fill({ color: 0x4488ff, alpha: 0.7 });

    // XP bar (below mana)
    const xpX = 20, xpY = manaY + manaH + 5, xpW = 180, xpH = 6;
    this._xpBarBg.clear();
    this._xpBarBg.roundRect(xpX, xpY, xpW, xpH, 3).fill({ color: 0x111111 });
    this._xpBarBg.roundRect(xpX, xpY, xpW, xpH, 3).stroke({ color: 0x444444, width: 0.5 });
    this._xpBarFill.clear();
    const xpPct = p.xpToNext > 0 ? p.xp / p.xpToNext : 1;
    const xpFillW = (xpW - 1) * Math.min(1, xpPct);
    this._xpBarFill.roundRect(xpX + 0.5, xpY + 0.5, xpFillW, xpH - 1, 2).fill({ color: 0xaaaa22 });

    // Level text
    this._levelText.text = `Lv ${p.level}`;

    // Class name display
    const classDef = CLASS_DEFINITIONS[state.classId];
    let className = classDef?.name || "";
    if (state.subclassId) {
      const subDef = SUBCLASS_DEFINITIONS[state.subclassId];
      className = subDef?.name || className;
    }
    this._classNameText.text = className;

    // Score
    this._scoreText.text = `${p.score.toLocaleString()}`;

    // Wave
    if (state.betweenWaves) {
      this._waveText.text = state.wave === 0 ? "Get Ready!" : `Wave ${state.wave} Complete`;
    } else {
      this._waveText.text = `Wave ${state.wave} / ${state.totalWaves}`;
    }

    // Combo
    if (p.comboCount > 2) {
      this._comboText.text = `${p.comboCount}x COMBO`;
      this._comboText.alpha = Math.min(1, p.comboTimer);
      const comboPulse = Math.sin(state.gameTime * 8) * 0.03;
      this._comboText.scale.set(1 + Math.min(0.4, p.comboCount * 0.025) + comboPulse);
      if (p.comboCount > 20) {
        this._comboText.style.fill = 0xffffff;
      } else if (p.comboCount > 10) {
        this._comboText.style.fill = 0xffdd44;
      } else {
        this._comboText.style.fill = 0xff8844;
      }
      this._comboText.rotation = Math.sin(state.gameTime * 5) * 0.03;
    } else {
      this._comboText.text = "";
      this._comboText.rotation = 0;
    }

    // Skill bar
    const skills = state.skills.slice(1).map(s => s.id);
    const slotW = 60, slotH = 50, gap = 8;
    const totalW = skills.length * slotW + (skills.length - 1) * gap;
    const startX = (sw - totalW) / 2;
    const barY = sh - slotH - 15;

    this._skillBg.clear();
    this._skillBg.roundRect(startX - 12, barY - 7, totalW + 24, slotH + 29, 8).fill({ color: 0x050510, alpha: 0.8 });
    this._skillBg.roundRect(startX - 12, barY - 7, totalW + 24, slotH + 29, 8).stroke({ color: 0x334466, width: 1.5 });
    this._skillBg.roundRect(startX - 10, barY - 6, totalW + 20, 1, 4).fill({ color: 0x556688, alpha: 0.3 });

    for (let i = 0; i < skills.length; i++) {
      const skillState = state.skills[i + 1];
      if (!skillState) continue;
      const cfg = SKILL_CONFIGS[skills[i]];
      if (!cfg) continue;
      const x = startX + i * (slotW + gap);

      const onCooldown = skillState.cooldown > 0;
      const hasEnough = p.mana >= cfg.manaCost;
      const slotColor = onCooldown ? 0x12121f : (hasEnough ? 0x1a2a3a : 0x141418);
      const borderColor = skillState.active ? 0xffdd44 : (hasEnough && !onCooldown ? cfg.color : 0x3a3a4a);
      this._skillBg.roundRect(x - 1, barY - 1, slotW + 2, slotH + 2, 5).fill({ color: 0x000000, alpha: 0.3 });
      this._skillBg.roundRect(x, barY, slotW, slotH, 4).fill({ color: slotColor });
      this._skillBg.roundRect(x + 1, barY + 1, slotW - 2, 2, 2).fill({ color: 0xffffff, alpha: 0.04 });
      this._skillBg.roundRect(x, barY, slotW, slotH, 4).stroke({ color: borderColor, width: skillState.active ? 2.5 : 1 });

      const cd = this._skillTexts[i]?.cooldown;
      if (cd) {
        cd.clear();
        if (onCooldown) {
          const cdPct = skillState.cooldown / skillState.maxCooldown;
          cd.rect(x + 1, barY + slotH * (1 - cdPct), slotW - 2, slotH * cdPct).fill({ color: 0x000000, alpha: 0.55 });
          cd.rect(x + 1, barY + slotH * (1 - cdPct), slotW - 2, 1.5).fill({ color: 0x8888aa, alpha: 0.3 });
        }
      }

      const orbAlpha = onCooldown ? 0.25 : 0.9;
      const orbPulse = hasEnough && !onCooldown ? Math.sin(state.gameTime * 3 + i) * 0.1 : 0;
      _drawSkillIcon(this._skillBg, x + slotW / 2, barY + 14, skills[i], cfg.color, orbAlpha + orbPulse);

      if (skillState.active) {
        const activeGlow = 0.12 + Math.sin(state.gameTime * 6) * 0.05;
        this._skillBg.roundRect(x - 3, barY - 3, slotW + 6, slotH + 6, 7).fill({ color: cfg.color, alpha: activeGlow });
        this._skillBg.roundRect(x - 1, barY - 1, slotW + 2, slotH + 2, 5).stroke({ color: cfg.color, width: 1, alpha: activeGlow * 2 });
      }

      if (hasEnough && !onCooldown && !skillState.active) {
        const readyGlow = 0.03 + Math.sin(state.gameTime * 2 + i * 1.5) * 0.015;
        this._skillBg.roundRect(x, barY, slotW, slotH, 4).fill({ color: cfg.color, alpha: readyGlow });
      }
    }

    // Unlockable skill slot (slot 6) — rendered to the right of the skill bar
    this._unlockSkillBg.clear();
    this._unlockSkillCooldown.clear();
    if (state.equippedUnlockSkill && state.unlockSkillState) {
      const ulCfg = SKILL_CONFIGS[state.equippedUnlockSkill];
      const ulState = state.unlockSkillState;
      const ulX = startX + totalW + gap + 16;
      const ulY = barY;

      // Separator line
      this._skillBg.rect(startX + totalW + 10, barY + 2, 2, slotH - 4).fill({ color: 0x556688, alpha: 0.5 });

      const onCooldown = ulState.cooldown > 0;
      const hasEnough = p.mana >= ulCfg.manaCost;
      const slotColor = onCooldown ? 0x12121f : (hasEnough ? 0x1a2a3a : 0x141418);
      const borderColor = ulState.active ? 0xffdd44 : (hasEnough && !onCooldown ? ulCfg.color : 0x3a3a4a);

      this._unlockSkillBg.roundRect(ulX - 1, ulY - 1, slotW + 2, slotH + 2, 5).fill({ color: 0x000000, alpha: 0.3 });
      this._unlockSkillBg.roundRect(ulX, ulY, slotW, slotH, 4).fill({ color: slotColor });
      this._unlockSkillBg.roundRect(ulX, ulY, slotW, slotH, 4).stroke({ color: borderColor, width: ulState.active ? 2.5 : 1 });

      // Cooldown overlay
      if (onCooldown) {
        const cdPct = ulState.cooldown / ulState.maxCooldown;
        this._unlockSkillCooldown.rect(ulX + 1, ulY + slotH * (1 - cdPct), slotW - 2, slotH * cdPct).fill({ color: 0x000000, alpha: 0.55 });
      }

      // Skill icon
      const orbAlpha = onCooldown ? 0.25 : 0.9;
      _drawSkillIcon(this._unlockSkillBg, ulX + slotW / 2, ulY + 14, state.equippedUnlockSkill!, ulCfg.color, orbAlpha);

      // Key and name text
      this._unlockSkillKey.position.set(ulX + slotW / 2, ulY + slotH / 2);
      this._unlockSkillKey.alpha = 1;
      this._unlockSkillName.text = ulCfg.name;
      this._unlockSkillName.position.set(ulX + slotW / 2, ulY + slotH + 2);
      this._unlockSkillName.alpha = 1;

      // Tab hint
      const tabHint = state.unlockedSkills.length > 1 ? "[Tab]" : "";
      if (tabHint) {
        this._unlockSkillBg.roundRect(ulX + slotW - 18, ulY - 8, 22, 12, 3).fill({ color: 0x222233, alpha: 0.9 });
        this._unlockSkillBg.roundRect(ulX + slotW - 18, ulY - 8, 22, 12, 3).stroke({ color: 0x556688, width: 0.5 });
      }
    } else {
      this._unlockSkillKey.alpha = 0;
      this._unlockSkillName.alpha = 0;
    }

    // Boss HP bar
    const boss = state.enemies.find(e => e.isBoss && e.alive);
    if (boss) {
      const bw = sw * 0.55;
      const bx = (sw - bw) / 2;
      const by = 52;
      const bh = 16;
      this._bossHpBg.clear();
      this._bossHpBg.roundRect(bx - 3, by - 3, bw + 6, bh + 6, 6).fill({ color: 0x110000, alpha: 0.8 });
      this._bossHpBg.roundRect(bx, by, bw, bh, 4).fill({ color: 0x220000 });
      this._bossHpBg.roundRect(bx + 1, by + 1, bw - 2, 3, 2).fill({ color: 0x000000, alpha: 0.3 });
      this._bossHpBg.roundRect(bx, by, bw, bh, 4).stroke({ color: 0xaa2222, width: 1.5 });
      this._bossHpBg.roundRect(bx - 1, by - 1, bw + 2, bh + 2, 5).stroke({ color: 0x661111, width: 0.5, alpha: 0.5 });
      for (const cx of [bx - 2, bx + bw + 2]) {
        this._bossHpBg.moveTo(cx, by + bh / 2).lineTo(cx + 3, by + bh / 2 - 3).lineTo(cx + 6, by + bh / 2).lineTo(cx + 3, by + bh / 2 + 3).fill({ color: 0xcc3333, alpha: 0.5 });
      }

      this._bossHpFill.clear();
      const bossHpPct = boss.hp / boss.maxHp;
      const bossFillW = (bw - 2) * bossHpPct;
      this._bossHpFill.roundRect(bx + 1, by + 1, bossFillW, bh - 2, 3).fill({ color: 0xcc1111 });
      this._bossHpFill.roundRect(bx + 1, by + 1, bossFillW, (bh - 2) * 0.4, 3).fill({ color: 0xff4444, alpha: 0.4 });
      this._bossHpFill.roundRect(bx + 2, by + 2, bossFillW - 2, 2, 1).fill({ color: 0xffffff, alpha: 0.12 });
      const bossGlow = 0.06 + Math.sin(state.gameTime * 4) * 0.03;
      this._bossHpFill.roundRect(bx - 1, by - 2, bw + 2, bh + 4, 5).fill({ color: 0xff0000, alpha: bossGlow });
      for (let seg = 1; seg < 4; seg++) {
        const segX = bx + bw * seg * 0.25;
        this._bossHpBg.rect(segX - 0.5, by + 1, 1, bh - 2).fill({ color: 0x000000, alpha: 0.3 });
      }

      this._bossNameText.position.set(sw / 2, by - 6);
      this._bossNameText.text = _getBossDisplayName(boss.type);
      this._bossNameText.alpha = 1;
    } else {
      this._bossHpBg.clear();
      this._bossHpFill.clear();
      this._bossNameText.alpha = 0;
    }

    // Boss warning
    if (this._bossWarningTimer > 0) {
      this._bossWarningTimer -= dt;
      const pulse = Math.sin(state.gameTime * 8);
      this._bossWarningText.alpha = Math.min(1, this._bossWarningTimer);
      this._bossWarningText.scale.set(1 + pulse * 0.05);
    } else {
      this._bossWarningText.alpha = 0;
    }

    // Between wave text
    if (state.betweenWaves && state.wave > 0) {
      const nextWave = state.wave + 1;
      const isBossNext = nextWave % state.bossWaveInterval === 0;
      if (nextWave > state.totalWaves) {
        this._betweenWaveText.text = "VICTORY!";
      } else if (isBossNext) {
        this._betweenWaveText.text = `Next: Wave ${nextWave} - BOSS WAVE!`;
        this._betweenWaveText.style.fill = 0xff4444;
      } else {
        this._betweenWaveText.text = `Next: Wave ${nextWave}`;
        this._betweenWaveText.style.fill = 0x88ccff;
      }
      this._betweenWaveText.alpha = Math.min(1, state.betweenWaveTimer);
    } else if (state.betweenWaves && state.wave === 0) {
      this._betweenWaveText.text = `${classDef?.name || "Arthur"} & the White Eagle`;
      this._betweenWaveText.alpha = 1;
    } else {
      this._betweenWaveText.alpha = 0;
    }

    // Boss entrance overlay
    if (state.bossEntranceTimer > 0) {
      const pulse = Math.sin(state.gameTime * 8);
      this._bossEntranceText.text = "WARNING";
      this._bossEntranceText.alpha = Math.min(1, state.bossEntranceTimer);
      this._bossEntranceText.scale.set(1 + pulse * 0.05);
      this._bossEntranceNameText.text = state.bossEntranceName;
      this._bossEntranceNameText.alpha = Math.min(1, state.bossEntranceTimer * 0.8);
    } else {
      this._bossEntranceText.alpha = 0;
      this._bossEntranceNameText.alpha = 0;
    }

    // Score multiplier
    if (p.scoreMultTimer > 0) {
      const multPulse = Math.sin(state.gameTime * 5) * 0.05;
      this._scoreMultText.alpha = Math.min(1, p.scoreMultTimer);
      this._scoreMultText.scale.set(1 + multPulse);
    } else {
      this._scoreMultText.alpha = 0;
    }

    // Notifications
    for (const notif of this._notifications) {
      notif.timer -= dt;
      notif.text.alpha = Math.min(1, notif.timer * 2);
      notif.text.y -= 20 * dt;
    }
    this._notifications = this._notifications.filter(n => {
      if (n.timer <= 0) {
        this.container.removeChild(n.text);
        n.text.destroy();
        return false;
      }
      return true;
    });
  }

  triggerBossWarning(): void {
    this._bossWarningTimer = 3;
  }

  showNotification(msg: string, color: number, sw: number, sh: number): void {
    const text = new Text({ text: msg, style: { ...STYLE_NOTIFICATION, fill: color } as any });
    text.anchor.set(0.5, 0.5);
    text.position.set(sw / 2, sh * 0.35);
    this.container.addChild(text);
    this._notifications.push({ text, timer: 2 });
  }

  // ---------------------------------------------------------------------------
  // Escape menu
  // ---------------------------------------------------------------------------

  showEscapeMenu(sw: number, sh: number, onResume: () => void, onMainMenu: () => void): void {
    this._escapeMenuContainer.removeChildren();
    this._escapeMenuResumeCb = onResume;
    this._escapeMenuMainMenuCb = onMainMenu;

    // Dark overlay
    const bg = new Graphics();
    bg.rect(0, 0, sw, sh).fill({ color: 0x000000, alpha: 0.85 });
    this._escapeMenuContainer.addChild(bg);

    // Title
    const title = new Text({ text: "PAUSED", style: STYLE_CLASS_TITLE });
    title.anchor.set(0.5, 0);
    title.position.set(sw / 2, 60);
    this._escapeMenuContainer.addChild(title);

    // Controls section
    const controlsTitle = new Text({ text: "Controls", style: new TextStyle({
      fontFamily: "Georgia, serif", fontSize: 22, fill: 0xffdd44,
      fontWeight: "bold", dropShadow: { color: 0x000000, distance: 2, alpha: 0.8 },
    }) });
    controlsTitle.anchor.set(0.5, 0);
    controlsTitle.position.set(sw / 2, 120);
    this._escapeMenuContainer.addChild(controlsTitle);

    const controls = [
      "W / Arrow Up  —  Move Up",
      "S / Arrow Down  —  Move Down",
      "A / Arrow Left  —  Move Left",
      "D / Arrow Right  —  Move Right",
      "Left Click  —  Basic Attack",
      "1-5  —  Class Skills",
      "6  —  Unlockable Skill",
      "Tab  —  Switch Unlockable Skill",
      "Escape  —  Pause / Resume",
    ];

    const controlStyle = new TextStyle({
      fontFamily: "Georgia, serif", fontSize: 14, fill: 0xbbccdd,
      lineHeight: 24,
    });

    const controlText = new Text({ text: controls.join("\n"), style: controlStyle });
    controlText.anchor.set(0.5, 0);
    controlText.position.set(sw / 2, 155);
    this._escapeMenuContainer.addChild(controlText);

    // Resume button
    const btnW = 220;
    const btnH = 50;
    const btnGap = 20;
    const resumeY = sh / 2 + 80;

    const resumeBg = new Graphics();
    resumeBg.roundRect(sw / 2 - btnW / 2, resumeY, btnW, btnH, 8).fill({ color: 0x1a3a2a, alpha: 0.9 });
    resumeBg.roundRect(sw / 2 - btnW / 2, resumeY, btnW, btnH, 8).stroke({ color: 0x44cc66, width: 2 });
    this._escapeMenuContainer.addChild(resumeBg);

    const resumeText = new Text({ text: "Resume Game", style: new TextStyle({
      fontFamily: "Georgia, serif", fontSize: 18, fill: 0x44cc66,
      fontWeight: "bold", dropShadow: { color: 0x000000, distance: 1, alpha: 0.8 },
    }) });
    resumeText.anchor.set(0.5, 0.5);
    resumeText.position.set(sw / 2, resumeY + btnH / 2);
    this._escapeMenuContainer.addChild(resumeText);

    // Main menu button
    const menuY = resumeY + btnH + btnGap;
    const menuBg = new Graphics();
    menuBg.roundRect(sw / 2 - btnW / 2, menuY, btnW, btnH, 8).fill({ color: 0x3a1a1a, alpha: 0.9 });
    menuBg.roundRect(sw / 2 - btnW / 2, menuY, btnW, btnH, 8).stroke({ color: 0xcc4444, width: 2 });
    this._escapeMenuContainer.addChild(menuBg);

    const menuText = new Text({ text: "Main Menu", style: new TextStyle({
      fontFamily: "Georgia, serif", fontSize: 18, fill: 0xcc4444,
      fontWeight: "bold", dropShadow: { color: 0x000000, distance: 1, alpha: 0.8 },
    }) });
    menuText.anchor.set(0.5, 0.5);
    menuText.position.set(sw / 2, menuY + btnH / 2);
    this._escapeMenuContainer.addChild(menuText);

    this._escapeMenuContainer.visible = true;

    // Click handler for buttons
    if (this._escapeMenuClickHandler) {
      window.removeEventListener("mousedown", this._escapeMenuClickHandler);
    }
    this._escapeMenuClickHandler = (e: MouseEvent) => {
      const mx = e.clientX;
      const my = e.clientY;
      // Resume button hit test
      if (mx >= sw / 2 - btnW / 2 && mx <= sw / 2 + btnW / 2 && my >= resumeY && my <= resumeY + btnH) {
        e.stopPropagation();
        this._escapeMenuResumeCb?.();
      }
      // Main menu button hit test
      if (mx >= sw / 2 - btnW / 2 && mx <= sw / 2 + btnW / 2 && my >= menuY && my <= menuY + btnH) {
        e.stopPropagation();
        this._escapeMenuMainMenuCb?.();
      }
    };
    window.addEventListener("mousedown", this._escapeMenuClickHandler, true);
  }

  hideEscapeMenu(): void {
    this._escapeMenuContainer.removeChildren();
    this._escapeMenuContainer.visible = false;
    if (this._escapeMenuClickHandler) {
      window.removeEventListener("mousedown", this._escapeMenuClickHandler, true);
      this._escapeMenuClickHandler = null;
    }
    this._escapeMenuResumeCb = null;
    this._escapeMenuMainMenuCb = null;
  }

  cleanup(): void {
    for (const n of this._notifications) n.text.destroy();
    this._notifications.length = 0;
    for (const st of this._skillTexts) {
      st.name.destroy();
      st.key.destroy();
      st.cooldown.destroy();
    }
    this._skillTexts = [];
    this._lastSkillIds = "";
    this._classSelectContainer.removeChildren();
    this._subclassSelectContainer.removeChildren();
    this.hideEscapeMenu();
    this._escapeMenuContainer.removeChildren();
    this.container.removeChildren();
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function _getBossDisplayName(type: string): string {
  const names: Record<string, string> = {
    boss_drake: "Ignis the Fire Drake",
    boss_chimera: "The Chimera of Dread",
    boss_lich_king: "Mordrath the Lich King",
    boss_storm_titan: "Thalassor, Storm Titan",
    boss_void_serpent: "Nyx, the Void Serpent",
  };
  return names[type] || "Boss";
}
