/**
 * DiabloHUD.ts — Extracted HUD building and per-frame update logic.
 *
 * All DOM element references created by buildHUD() are returned as a HUDRefs
 * object.  Mutable per-frame tracking state lives in HUDState.
 */

import {
  DiabloState, DiabloMapId, VendorType, DiabloVendor,
  GreaterRiftState, MultiplayerState, SkillId, DamageType,
} from "./DiabloTypes";
import {
  SKILL_DEFS, ADVANCED_CRAFTING_RECIPES,
} from "./DiabloConfig";

// Dark Diablo-style skill icon colors per damage type
const SKILL_ICON_STYLES: Record<string, { bg: string; glow: string; border: string; symbol: string }> = {
  [DamageType.FIRE]:      { bg: 'radial-gradient(circle at 40% 35%, #4a1a08, #1a0800)', glow: 'rgba(255,80,20,0.5)',  border: '#8a3010', symbol: '#ff6622' },
  [DamageType.ICE]:       { bg: 'radial-gradient(circle at 40% 35%, #0a1a2a, #020810)', glow: 'rgba(80,160,255,0.5)', border: '#2a4a6a', symbol: '#66bbff' },
  [DamageType.LIGHTNING]: { bg: 'radial-gradient(circle at 40% 35%, #1a1a08, #080800)', glow: 'rgba(255,255,80,0.5)', border: '#5a5a10', symbol: '#ffee44' },
  [DamageType.POISON]:    { bg: 'radial-gradient(circle at 40% 35%, #0a1a08, #020800)', glow: 'rgba(80,255,80,0.4)',  border: '#2a5a10', symbol: '#66ff44' },
  [DamageType.ARCANE]:    { bg: 'radial-gradient(circle at 40% 35%, #1a0a2a, #080010)', glow: 'rgba(160,80,255,0.5)', border: '#4a2a6a', symbol: '#bb66ff' },
  [DamageType.SHADOW]:    { bg: 'radial-gradient(circle at 40% 35%, #12081a, #040008)', glow: 'rgba(120,60,180,0.4)', border: '#3a1a4a', symbol: '#9944cc' },
  [DamageType.HOLY]:      { bg: 'radial-gradient(circle at 40% 35%, #2a2408, #0a0800)', glow: 'rgba(255,215,80,0.5)', border: '#6a5a10', symbol: '#ffd744' },
  [DamageType.PHYSICAL]:  { bg: 'radial-gradient(circle at 40% 35%, #1a1510, #080604)', glow: 'rgba(180,140,80,0.3)', border: '#4a3a2a', symbol: '#ccaa66' },
};

/** Render a dark Diablo-style skill icon as HTML — fills the entire slot */
function renderSkillIcon(icon: string, damageType: string): string {
  const style = SKILL_ICON_STYLES[damageType] || SKILL_ICON_STYLES[DamageType.PHYSICAL];
  return `<div style="
    width:100%;height:100%;display:flex;align-items:center;justify-content:center;
    background:${style.bg};
    box-shadow:0 0 8px ${style.glow}, inset 0 0 15px rgba(0,0,0,0.7),
      inset 0 1px 0 rgba(255,255,255,0.06);
    position:absolute;top:0;left:0;border-radius:5px;overflow:hidden;
  "><div style="
    font-size:30px;color:${style.symbol};
    filter:drop-shadow(0 0 5px ${style.glow}) drop-shadow(0 0 10px ${style.glow});
    text-shadow:0 0 8px ${style.glow};
    z-index:1;line-height:1;
  ">${icon}</div><div style="
    position:absolute;top:0;left:0;width:100%;height:100%;
    background:linear-gradient(135deg, rgba(255,255,255,0.08) 0%, transparent 40%, rgba(0,0,0,0.2) 100%);
    pointer-events:none;
  "></div></div>`;
}
import {
  EXCALIBUR_QUEST_INFO, MAP_NAME_MAP, WEATHER_LABELS,
} from "./DiabloConstants";

// ─────────────────────────────────────────────────────────────────────────────
//  Interfaces
// ─────────────────────────────────────────────────────────────────────────────

export interface HUDRefs {
  hpBar: HTMLDivElement;
  mpBar: HTMLDivElement;
  hpText: HTMLDivElement;
  mpText: HTMLDivElement;
  hpOrbWrap: HTMLDivElement;
  mpOrbWrap: HTMLDivElement;
  xpBar: HTMLDivElement;
  xpLevelText: HTMLDivElement;
  goldText: HTMLDivElement;
  levelText: HTMLDivElement;
  killText: HTMLDivElement;
  topRightPanel: HTMLDivElement;
  lootLog: HTMLDivElement;
  skillSlots: HTMLDivElement[];
  skillCooldownOverlays: HTMLDivElement[];
  minimapCanvas: HTMLCanvasElement;
  minimapCtx: CanvasRenderingContext2D;
  fullmapCanvas: HTMLCanvasElement;
  fullmapCtx: CanvasRenderingContext2D;
  dpsMeter: HTMLDivElement;
  mapNameLabel: HTMLDivElement;
  weatherText: HTMLDivElement;
  potionHudSlots: HTMLDivElement[];
  questTracker: HTMLDivElement;
  vendorHint: HTMLDivElement;
  chestHint: HTMLDivElement;
  portalHint: HTMLDivElement;
  questPopup: HTMLDivElement;
  deathOverlay: HTMLDivElement;
  fpsCrosshair: HTMLDivElement;
  viewModeLabel: HTMLDivElement;
  dpsDisplay: HTMLDivElement;
  dpsValueEl: Element | null;
  lootFilterLabelEl: HTMLDivElement | null;
}

export interface HUDState {
  prevHp: number;
  prevMana: number;
  hpFlashTimer: number;
  manaFlashTimer: number;
  prevSkillCooldowns: number[];
  lastGoldValue: number;
  lastLevelValue: number;
  lastKillValue: number;
  lastDeathValue: number;
  lastHpPctInt: number;
  lastMpPctInt: number;
  minimapFrameCounter: number;
  fullmapVisible: boolean;
  hardcoreLabel: HTMLDivElement | null;
  riftHud: HTMLDivElement | null;
  lastRiftProgress: number;
  lastRiftTime: number;
  lastRiftState: GreaterRiftState | null;
  excaliburHud: HTMLDivElement | null;
  craftingQueueHud: HTMLDivElement | null;
  lastCraftingPct: number;
  lastCraftingQueueLen: number;
  multiplayerHud: HTMLDivElement | null;
  lastMpMessageCount: number;
}

/** Parameters that updateHUD reads from the game but does not own. */
export interface HUDUpdateContext {
  state: DiabloState;
  firstPerson: boolean;
  portalActive: boolean;
  portalX: number;
  portalZ: number;
  combatLog: { time: number; damage: number }[];
  currentDps: number;
  /** Called so the game can store the computed DPS back. */
  setCurrentDps: (v: number) => void;
  /** Renderer vignette update. */
  updateVignette: (hpRatio: number) => void;
  /** Distance helper. */
  dist: (x1: number, z1: number, x2: number, z2: number) => number;
  /** The game's own minimap/fullmap/quest tracker updates. */
  updateMinimap: () => void;
  updateFullmap: () => void;
  updateQuestTracker: () => void;
  /** The HUD container itself (needed for lazily appending dynamic elements). */
  hudEl: HTMLDivElement;
}

// ─────────────────────────────────────────────────────────────────────────────
//  Factory helpers
// ─────────────────────────────────────────────────────────────────────────────

export function createHUDState(): HUDState {
  return {
    prevHp: -1,
    prevMana: -1,
    hpFlashTimer: 0,
    manaFlashTimer: 0,
    prevSkillCooldowns: [0, 0, 0, 0, 0, 0],
    lastGoldValue: -1,
    lastLevelValue: -1,
    lastKillValue: -1,
    lastDeathValue: -1,
    lastHpPctInt: -1,
    lastMpPctInt: -1,
    minimapFrameCounter: 0,
    fullmapVisible: false,
    hardcoreLabel: null,
    riftHud: null,
    lastRiftProgress: -1,
    lastRiftTime: -1,
    lastRiftState: null,
    excaliburHud: null,
    craftingQueueHud: null,
    lastCraftingPct: -1,
    lastCraftingQueueLen: -1,
    multiplayerHud: null,
    lastMpMessageCount: -1,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
//  buildHUD
// ─────────────────────────────────────────────────────────────────────────────

export function buildHUD(hud: HTMLDivElement): HUDRefs {
  hud.innerHTML = "";

  // Inject CSS keyframe animations for HUD effects
  const hudStyleEl = document.createElement("style");
  hudStyleEl.textContent = `
    @keyframes hud-blood-drip {
      0%, 100% { opacity:0.6; transform:translateX(-50%) scaleY(1); }
      50% { opacity:1; transform:translateX(-50%) scaleY(1.5); }
    }
    @keyframes hud-arcane-particles {
      0% { box-shadow:0 0 4px 2px rgba(100,100,255,0.6), 8px -6px 3px 1px rgba(120,80,255,0.4), -6px -8px 2px 1px rgba(80,120,255,0.5); }
      33% { box-shadow:-4px -10px 4px 2px rgba(120,80,255,0.5), 6px 4px 3px 1px rgba(80,120,255,0.6), 10px -4px 2px 1px rgba(100,100,255,0.4); }
      66% { box-shadow:6px -4px 4px 2px rgba(80,120,255,0.4), -8px 2px 3px 1px rgba(100,100,255,0.6), 2px -12px 2px 1px rgba(120,80,255,0.5); }
      100% { box-shadow:0 0 4px 2px rgba(100,100,255,0.6), 8px -6px 3px 1px rgba(120,80,255,0.4), -6px -8px 2px 1px rgba(80,120,255,0.5); }
    }
    @keyframes hud-xp-pulse {
      0%, 100% { box-shadow:0 0 10px rgba(255,215,0,0.5), inset 0 1px 0 rgba(255,255,255,0.2); }
      50% { box-shadow:0 0 20px rgba(255,215,0,0.9), 0 0 40px rgba(255,215,0,0.4), inset 0 1px 0 rgba(255,255,255,0.3); }
    }
    @keyframes hud-xp-shimmer {
      0% { background-position: -200% 0; }
      100% { background-position: 200% 0; }
    }
    @keyframes hud-torch-flicker {
      0%, 100% { opacity:0.85; transform:translateX(-50%) scaleX(1) scaleY(1); }
      25% { opacity:1; transform:translateX(-50%) scaleX(1.05) scaleY(1.1); }
      50% { opacity:0.75; transform:translateX(-50%) scaleX(0.95) scaleY(0.95); }
      75% { opacity:0.95; transform:translateX(-50%) scaleX(1.02) scaleY(1.05); }
    }
    @keyframes hud-torch-glow {
      0%, 100% { box-shadow:0 0 15px 8px rgba(255,140,20,0.3), 0 0 30px 12px rgba(255,100,0,0.15); }
      50% { box-shadow:0 0 20px 12px rgba(255,140,20,0.45), 0 0 40px 16px rgba(255,100,0,0.2); }
    }
    @keyframes hud-compass-spin {
      0% { transform:translate(-50%,-50%) rotate(0deg); }
      100% { transform:translate(-50%,-50%) rotate(360deg); }
    }
    @keyframes hud-bar-breathe {
      0%, 100% { box-shadow:0 4px 20px rgba(0,0,0,0.7), inset 0 1px 0 rgba(200,168,78,0.25),
        inset 0 -1px 0 rgba(0,0,0,0.5), 0 0 1px rgba(200,168,78,0.3),
        0 -2px 15px rgba(200,168,78,0.08); }
      50% { box-shadow:0 4px 20px rgba(0,0,0,0.7), inset 0 1px 0 rgba(200,168,78,0.35),
        inset 0 -1px 0 rgba(0,0,0,0.5), 0 0 3px rgba(200,168,78,0.4),
        0 -2px 20px rgba(200,168,78,0.15); }
    }
    @keyframes hud-orb-low-pulse {
      0%, 100% { border-color: rgba(255,40,40,0.6); }
      50% { border-color: rgba(255,80,80,0.9); }
    }
    @keyframes hud-orb-rune-spin {
      0% { transform:rotate(0deg); }
      100% { transform:rotate(360deg); }
    }
    @keyframes hud-orb-inner-pulse {
      0%, 100% { opacity:0.3; }
      50% { opacity:0.6; }
    }
    @keyframes hud-hp-liquid {
      0%, 100% { border-radius:50% 50% 50% 50% / 48% 52% 48% 52%; }
      25% { border-radius:50% 50% 50% 50% / 52% 48% 52% 48%; }
      50% { border-radius:50% 50% 50% 50% / 49% 51% 49% 51%; }
      75% { border-radius:50% 50% 50% 50% / 51% 49% 51% 49%; }
    }
    @keyframes hud-slot-hover-glow {
      0%, 100% { box-shadow:inset 0 0 20px rgba(200,168,78,0.15), 0 0 8px rgba(200,168,78,0.2); }
      50% { box-shadow:inset 0 0 25px rgba(200,168,78,0.25), 0 0 14px rgba(200,168,78,0.35); }
    }
  `;
  hud.appendChild(hudStyleEl);

  // Health orb - bottom left (ornate) with gargoyle holder
  const hpOrbWrap = document.createElement("div");
  hpOrbWrap.style.cssText = `
    position:absolute;bottom:22px;left:22px;width:150px;height:150px;
    display:flex;align-items:center;justify-content:center;
    filter:drop-shadow(0 0 12px rgba(180,20,20,0.35));
  `;
  // Detailed gargoyle behind the health orb with claws gripping the sides
  const hpCreature = document.createElement("div");
  hpCreature.style.cssText = `position:absolute;width:220px;height:220px;top:-35px;left:-35px;pointer-events:none;z-index:-3;`;
  hpCreature.innerHTML = `<svg viewBox="0 0 220 220" style="width:100%;height:100%;" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <radialGradient id="hpGG" cx="50%" cy="48%"><stop offset="0%" stop-color="#18120c"/><stop offset="70%" stop-color="#0e0a06"/><stop offset="100%" stop-color="#060402"/></radialGradient>
      <linearGradient id="hpHorn" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#1a1410"/><stop offset="100%" stop-color="#0a0806"/></linearGradient>
      <radialGradient id="hpEyeGlow" cx="50%" cy="50%"><stop offset="0%" stop-color="#ff4444"/><stop offset="50%" stop-color="#cc2222"/><stop offset="100%" stop-color="#661111" stop-opacity="0"/></radialGradient>
      <linearGradient id="hpWingMem" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#14100a"/><stop offset="100%" stop-color="#0a0806"/></linearGradient>
    </defs>
    <!-- Wings (folded behind body, visible at edges) -->
    <!-- Left wing membrane -->
    <path d="M 38 50 Q 8 30 2 8 Q 0 2 4 6 Q 12 18 20 32 Q 10 42 6 58 Q 2 72 6 68 Q 12 60 22 52 Q 14 72 8 90 Q 4 100 8 96 Q 16 82 28 66 Z"
      fill="url(#hpWingMem)" stroke="#1a1410" stroke-width="0.6" opacity="0.7"/>
    <!-- Left wing bone spars -->
    <path d="M 38 50 Q 18 28 4 6" fill="none" stroke="#201810" stroke-width="1.8" opacity="0.5"/>
    <path d="M 36 54 Q 16 50 6 58" fill="none" stroke="#201810" stroke-width="1.2" opacity="0.4"/>
    <path d="M 34 60 Q 18 68 8 90" fill="none" stroke="#201810" stroke-width="1.2" opacity="0.4"/>
    <!-- Left wing vein details -->
    <path d="M 20 32 Q 14 38 12 48" fill="none" stroke="#1a1410" stroke-width="0.5" opacity="0.35"/>
    <path d="M 16 42 Q 12 55 10 65" fill="none" stroke="#1a1410" stroke-width="0.4" opacity="0.3"/>
    <!-- Right wing membrane -->
    <path d="M 182 50 Q 212 30 218 8 Q 220 2 216 6 Q 208 18 200 32 Q 210 42 214 58 Q 218 72 214 68 Q 208 60 198 52 Q 206 72 212 90 Q 216 100 212 96 Q 204 82 192 66 Z"
      fill="url(#hpWingMem)" stroke="#1a1410" stroke-width="0.6" opacity="0.7"/>
    <!-- Right wing bone spars -->
    <path d="M 182 50 Q 202 28 216 6" fill="none" stroke="#201810" stroke-width="1.8" opacity="0.5"/>
    <path d="M 184 54 Q 204 50 214 58" fill="none" stroke="#201810" stroke-width="1.2" opacity="0.4"/>
    <path d="M 186 60 Q 202 68 212 90" fill="none" stroke="#201810" stroke-width="1.2" opacity="0.4"/>
    <!-- Right wing vein details -->
    <path d="M 200 32 Q 206 38 208 48" fill="none" stroke="#1a1410" stroke-width="0.5" opacity="0.35"/>
    <path d="M 204 42 Q 208 55 210 65" fill="none" stroke="#1a1410" stroke-width="0.4" opacity="0.3"/>
    <!-- Body mass behind orb -->
    <path d="M 110 8 C 70 5 28 28 16 62 C 6 90 4 110 8 135 C 14 160 32 182 60 196
             C 78 205 95 210 110 210 C 125 210 142 205 160 196
             C 188 182 206 160 212 135 C 216 110 214 90 204 62
             C 192 28 150 5 110 8 Z"
      fill="url(#hpGG)" stroke="#1a1208" stroke-width="1.5" opacity="0.85"/>
    <!-- Scale texture (overlapping rows across body) -->
    <path d="M 46 72 Q 48 68 52 72 Q 54 68 58 72" fill="none" stroke="#1a1410" stroke-width="0.7" opacity="0.3"/>
    <path d="M 44 82 Q 47 78 50 82 Q 53 78 56 82 Q 59 78 62 82" fill="none" stroke="#1a1410" stroke-width="0.6" opacity="0.25"/>
    <path d="M 42 94 Q 45 90 48 94 Q 51 90 54 94" fill="none" stroke="#1a1410" stroke-width="0.6" opacity="0.25"/>
    <path d="M 162 72 Q 164 68 168 72 Q 170 68 174 72" fill="none" stroke="#1a1410" stroke-width="0.7" opacity="0.3"/>
    <path d="M 158 82 Q 161 78 164 82 Q 167 78 170 82 Q 173 78 176 82" fill="none" stroke="#1a1410" stroke-width="0.6" opacity="0.25"/>
    <path d="M 160 94 Q 163 90 166 94 Q 169 90 172 94" fill="none" stroke="#1a1410" stroke-width="0.6" opacity="0.25"/>
    <!-- Muscle/rib texture lines on body -->
    <path d="M 50 70 Q 55 80 48 95" fill="none" stroke="#1a1410" stroke-width="1.2" opacity="0.4"/>
    <path d="M 42 90 Q 48 105 40 120" fill="none" stroke="#1a1410" stroke-width="1" opacity="0.3"/>
    <path d="M 170 70 Q 165 80 172 95" fill="none" stroke="#1a1410" stroke-width="1.2" opacity="0.4"/>
    <path d="M 178 90 Q 172 105 180 120" fill="none" stroke="#1a1410" stroke-width="1" opacity="0.3"/>
    <path d="M 55 150 Q 60 160 52 172" fill="none" stroke="#1a1410" stroke-width="0.8" opacity="0.3"/>
    <path d="M 165 150 Q 160 160 168 172" fill="none" stroke="#1a1410" stroke-width="0.8" opacity="0.3"/>
    <!-- Spine ridge bumps down center back -->
    <ellipse cx="110" cy="190" rx="3" ry="2" fill="#14100a" opacity="0.5"/>
    <ellipse cx="110" cy="198" rx="2.5" ry="1.8" fill="#14100a" opacity="0.4"/>
    <ellipse cx="110" cy="205" rx="2" ry="1.5" fill="#14100a" opacity="0.3"/>
    <!-- LEFT SHOULDER (skeletal — scapula + ball joint) -->
    <ellipse cx="40" cy="60" rx="14" ry="10" fill="#14100a" stroke="#1e1810" stroke-width="0.8" opacity="0.6"/>
    <circle cx="34" cy="68" r="5" fill="#18140e" stroke="#221c14" stroke-width="0.8"/>
    <circle cx="34" cy="68" r="2.5" fill="#100c06" opacity="0.5"/>
    <!-- Left clavicle bone -->
    <path d="M 70 52 Q 52 54 34 64" fill="none" stroke="#1e1810" stroke-width="2.5" stroke-linecap="round" opacity="0.5"/>
    <!-- Left upper arm bone (humerus) -->
    <path d="M 34 72 Q 32 78 30 86" fill="none" stroke="#1a1410" stroke-width="3" stroke-linecap="round" opacity="0.45"/>
    <!-- LEFT ELBOW joint -->
    <circle cx="30" cy="86" r="3" fill="#14100a" stroke="#1e1810" stroke-width="0.6"/>
    <!-- Left forearm bones (radius + ulna) -->
    <path d="M 30 88 Q 28 96 26 105" fill="none" stroke="#1a1410" stroke-width="2.5" stroke-linecap="round" opacity="0.4"/>
    <path d="M 31 89 Q 30 97 28 105" fill="none" stroke="#16120c" stroke-width="1.5" stroke-linecap="round" opacity="0.3"/>
    <!-- RIGHT SHOULDER (skeletal — mirror) -->
    <ellipse cx="180" cy="60" rx="14" ry="10" fill="#14100a" stroke="#1e1810" stroke-width="0.8" opacity="0.6"/>
    <circle cx="186" cy="68" r="5" fill="#18140e" stroke="#221c14" stroke-width="0.8"/>
    <circle cx="186" cy="68" r="2.5" fill="#100c06" opacity="0.5"/>
    <!-- Right clavicle bone -->
    <path d="M 150 52 Q 168 54 186 64" fill="none" stroke="#1e1810" stroke-width="2.5" stroke-linecap="round" opacity="0.5"/>
    <!-- Right upper arm bone -->
    <path d="M 186 72 Q 188 78 190 86" fill="none" stroke="#1a1410" stroke-width="3" stroke-linecap="round" opacity="0.45"/>
    <!-- RIGHT ELBOW joint -->
    <circle cx="190" cy="86" r="3" fill="#14100a" stroke="#1e1810" stroke-width="0.6"/>
    <!-- Right forearm bones -->
    <path d="M 190 88 Q 192 96 194 105" fill="none" stroke="#1a1410" stroke-width="2.5" stroke-linecap="round" opacity="0.4"/>
    <path d="M 189 89 Q 190 97 192 105" fill="none" stroke="#16120c" stroke-width="1.5" stroke-linecap="round" opacity="0.3"/>
    <!-- LEFT SKELETAL HAND gripping orb (5 bony fingers from wrist) -->
    <!-- Left wrist bones (carpals cluster) -->
    <circle cx="24" cy="106" r="3.5" fill="#16120c" stroke="#221c14" stroke-width="0.6"/>
    <circle cx="28" cy="104" r="2.2" fill="#14100a" opacity="0.4"/>
    <circle cx="22" cy="104" r="1.8" fill="#18140e" opacity="0.35"/>
    <circle cx="26" cy="108" r="1.5" fill="#14100a" opacity="0.3"/>
    <!-- Left thumb (metacarpal + 2 phalanges with knuckle joints) -->
    <path d="M 28 100 Q 34 92 38 82" fill="none" stroke="#1e1810" stroke-width="2.5" stroke-linecap="round"/>
    <circle cx="36" cy="85" r="2" fill="#1a1410" stroke="#221c14" stroke-width="0.5"/>
    <path d="M 38 82 Q 40 76 38 72" fill="none" stroke="#1e1810" stroke-width="2" stroke-linecap="round"/>
    <circle cx="39" cy="76" r="1.6" fill="#1a1410" opacity="0.5"/>
    <path d="M 38 72 Q 36 68 32 66" fill="none" stroke="#1e1810" stroke-width="1.5" stroke-linecap="round"/>
    <!-- Thumb nail/claw -->
    <path d="M 32 66 Q 30 64 28 63 Q 30 62 33 64" fill="#201810" stroke="#1e1810" stroke-width="0.5"/>
    <!-- Left index finger (3 phalanges curving around orb) -->
    <path d="M 22 108 Q 18 98 16 88" fill="none" stroke="#1a1410" stroke-width="2.2" stroke-linecap="round"/>
    <circle cx="17" cy="93" r="1.8" fill="#16120c" stroke="#1e1810" stroke-width="0.4"/>
    <path d="M 16 88 Q 12 80 8 74" fill="none" stroke="#1a1410" stroke-width="2" stroke-linecap="round"/>
    <circle cx="12" cy="81" r="1.5" fill="#16120c" stroke="#1e1810" stroke-width="0.4"/>
    <path d="M 8 74 Q 4 68 2 64" fill="none" stroke="#1e1810" stroke-width="1.5" stroke-linecap="round"/>
    <path d="M 2 64 Q 0 62 -1 60 Q 1 59 3 62" fill="#201810" stroke="#1e1810" stroke-width="0.4"/>
    <!-- Left middle finger (longest, most prominent) -->
    <path d="M 20 110 Q 14 102 10 92" fill="none" stroke="#1a1410" stroke-width="2.5" stroke-linecap="round"/>
    <circle cx="13" cy="98" r="1.8" fill="#16120c" stroke="#1e1810" stroke-width="0.4"/>
    <path d="M 10 92 Q 6 82 2 74" fill="none" stroke="#1a1410" stroke-width="2.2" stroke-linecap="round"/>
    <circle cx="6" cy="83" r="1.6" fill="#16120c" stroke="#1e1810" stroke-width="0.4"/>
    <path d="M 2 74 Q -2 66 -4 60" fill="none" stroke="#1e1810" stroke-width="1.6" stroke-linecap="round"/>
    <path d="M -4 60 Q -6 58 -7 56 Q -5 55 -3 58" fill="#201810" stroke="#1e1810" stroke-width="0.4"/>
    <!-- Left ring finger -->
    <path d="M 18 114 Q 12 108 8 100" fill="none" stroke="#1a1410" stroke-width="2.2" stroke-linecap="round"/>
    <circle cx="10" cy="104" r="1.6" fill="#16120c" stroke="#1e1810" stroke-width="0.4"/>
    <path d="M 8 100 Q 4 92 0 86" fill="none" stroke="#1a1410" stroke-width="2" stroke-linecap="round"/>
    <circle cx="4" cy="93" r="1.4" fill="#16120c" opacity="0.5"/>
    <path d="M 0 86 Q -2 80 -4 76" fill="none" stroke="#1e1810" stroke-width="1.4" stroke-linecap="round"/>
    <path d="M -4 76 Q -5 74 -6 72 Q -4 72 -3 74" fill="#201810" stroke="#1e1810" stroke-width="0.4"/>
    <!-- Left pinky finger -->
    <path d="M 16 118 Q 10 114 8 108" fill="none" stroke="#16120c" stroke-width="2" stroke-linecap="round"/>
    <circle cx="9" cy="111" r="1.4" fill="#14100a" stroke="#1e1810" stroke-width="0.4"/>
    <path d="M 8 108 Q 4 102 2 96" fill="none" stroke="#16120c" stroke-width="1.8" stroke-linecap="round"/>
    <circle cx="5" cy="102" r="1.2" fill="#14100a" opacity="0.45"/>
    <path d="M 2 96 Q 0 92 -2 88" fill="none" stroke="#1a1410" stroke-width="1.2" stroke-linecap="round"/>
    <path d="M -2 88 Q -3 86 -4 85 Q -2 85 -1 87" fill="#201810" stroke="#1a1410" stroke-width="0.3"/>
    <!-- Tendon lines on back of left hand -->
    <path d="M 24 106 Q 20 100 18 92" fill="none" stroke="#1a1410" stroke-width="0.5" opacity="0.35"/>
    <path d="M 23 107 Q 17 102 14 96" fill="none" stroke="#1a1410" stroke-width="0.5" opacity="0.3"/>
    <path d="M 22 108 Q 15 106 10 102" fill="none" stroke="#1a1410" stroke-width="0.4" opacity="0.25"/>
    <!-- RIGHT SKELETAL HAND gripping orb (mirror) -->
    <!-- Right wrist bones (carpals cluster) -->
    <circle cx="196" cy="106" r="3.5" fill="#16120c" stroke="#221c14" stroke-width="0.6"/>
    <circle cx="192" cy="104" r="2.2" fill="#14100a" opacity="0.4"/>
    <circle cx="198" cy="104" r="1.8" fill="#18140e" opacity="0.35"/>
    <circle cx="194" cy="108" r="1.5" fill="#14100a" opacity="0.3"/>
    <!-- Right thumb -->
    <path d="M 192 100 Q 186 92 182 82" fill="none" stroke="#1e1810" stroke-width="2.5" stroke-linecap="round"/>
    <circle cx="184" cy="85" r="2" fill="#1a1410" stroke="#221c14" stroke-width="0.5"/>
    <path d="M 182 82 Q 180 76 182 72" fill="none" stroke="#1e1810" stroke-width="2" stroke-linecap="round"/>
    <circle cx="181" cy="76" r="1.6" fill="#1a1410" opacity="0.5"/>
    <path d="M 182 72 Q 184 68 188 66" fill="none" stroke="#1e1810" stroke-width="1.5" stroke-linecap="round"/>
    <path d="M 188 66 Q 190 64 192 63 Q 190 62 187 64" fill="#201810" stroke="#1e1810" stroke-width="0.5"/>
    <!-- Right index finger -->
    <path d="M 198 108 Q 202 98 204 88" fill="none" stroke="#1a1410" stroke-width="2.2" stroke-linecap="round"/>
    <circle cx="203" cy="93" r="1.8" fill="#16120c" stroke="#1e1810" stroke-width="0.4"/>
    <path d="M 204 88 Q 208 80 212 74" fill="none" stroke="#1a1410" stroke-width="2" stroke-linecap="round"/>
    <circle cx="208" cy="81" r="1.5" fill="#16120c" stroke="#1e1810" stroke-width="0.4"/>
    <path d="M 212 74 Q 216 68 218 64" fill="none" stroke="#1e1810" stroke-width="1.5" stroke-linecap="round"/>
    <path d="M 218 64 Q 220 62 221 60 Q 219 59 217 62" fill="#201810" stroke="#1e1810" stroke-width="0.4"/>
    <!-- Right middle finger (longest) -->
    <path d="M 200 110 Q 206 102 210 92" fill="none" stroke="#1a1410" stroke-width="2.5" stroke-linecap="round"/>
    <circle cx="207" cy="98" r="1.8" fill="#16120c" stroke="#1e1810" stroke-width="0.4"/>
    <path d="M 210 92 Q 214 82 218 74" fill="none" stroke="#1a1410" stroke-width="2.2" stroke-linecap="round"/>
    <circle cx="214" cy="83" r="1.6" fill="#16120c" stroke="#1e1810" stroke-width="0.4"/>
    <path d="M 218 74 Q 222 66 224 60" fill="none" stroke="#1e1810" stroke-width="1.6" stroke-linecap="round"/>
    <path d="M 224 60 Q 226 58 227 56 Q 225 55 223 58" fill="#201810" stroke="#1e1810" stroke-width="0.4"/>
    <!-- Right ring finger -->
    <path d="M 202 114 Q 208 108 212 100" fill="none" stroke="#1a1410" stroke-width="2.2" stroke-linecap="round"/>
    <circle cx="210" cy="104" r="1.6" fill="#16120c" stroke="#1e1810" stroke-width="0.4"/>
    <path d="M 212 100 Q 216 92 220 86" fill="none" stroke="#1a1410" stroke-width="2" stroke-linecap="round"/>
    <circle cx="216" cy="93" r="1.4" fill="#16120c" opacity="0.5"/>
    <path d="M 220 86 Q 222 80 224 76" fill="none" stroke="#1e1810" stroke-width="1.4" stroke-linecap="round"/>
    <path d="M 224 76 Q 225 74 226 72 Q 224 72 223 74" fill="#201810" stroke="#1e1810" stroke-width="0.4"/>
    <!-- Right pinky finger -->
    <path d="M 204 118 Q 210 114 212 108" fill="none" stroke="#16120c" stroke-width="2" stroke-linecap="round"/>
    <circle cx="211" cy="111" r="1.4" fill="#14100a" stroke="#1e1810" stroke-width="0.4"/>
    <path d="M 212 108 Q 216 102 218 96" fill="none" stroke="#16120c" stroke-width="1.8" stroke-linecap="round"/>
    <circle cx="215" cy="102" r="1.2" fill="#14100a" opacity="0.45"/>
    <path d="M 218 96 Q 220 92 222 88" fill="none" stroke="#1a1410" stroke-width="1.2" stroke-linecap="round"/>
    <path d="M 222 88 Q 223 86 224 85 Q 222 85 221 87" fill="#201810" stroke="#1a1410" stroke-width="0.3"/>
    <!-- Tendon lines on back of right hand -->
    <path d="M 196 106 Q 200 100 202 92" fill="none" stroke="#1a1410" stroke-width="0.5" opacity="0.35"/>
    <path d="M 197 107 Q 203 102 206 96" fill="none" stroke="#1a1410" stroke-width="0.5" opacity="0.3"/>
    <path d="M 198 108 Q 205 106 210 102" fill="none" stroke="#1a1410" stroke-width="0.4" opacity="0.25"/>
    <!-- Head (larger, more detailed) -->
    <path d="M 110 14 C 90 12 76 18 74 30 C 72 42 80 50 95 52 C 100 52 110 53 120 52
             C 140 50 148 42 146 30 C 144 18 130 12 110 14 Z" fill="#12100a" stroke="#1a1410" stroke-width="1"/>
    <!-- Cranial ridges / wrinkled skin on forehead -->
    <path d="M 84 20 Q 90 17 96 20" fill="none" stroke="#1a1410" stroke-width="0.6" opacity="0.4"/>
    <path d="M 86 22 Q 92 19 98 22" fill="none" stroke="#1a1410" stroke-width="0.5" opacity="0.35"/>
    <path d="M 122 20 Q 128 17 134 20" fill="none" stroke="#1a1410" stroke-width="0.6" opacity="0.4"/>
    <path d="M 120 22 Q 126 19 132 22" fill="none" stroke="#1a1410" stroke-width="0.5" opacity="0.35"/>
    <!-- Brow ridge (heavy, overhanging) -->
    <path d="M 80 24 C 88 18 100 17 110 20 C 120 17 132 18 140 24" fill="none" stroke="#1e1810" stroke-width="2.5" stroke-linecap="round"/>
    <!-- Brow ridge underside shadow -->
    <path d="M 82 25 C 90 20 100 19 110 21 C 120 19 130 20 138 25" fill="none" stroke="#0a0806" stroke-width="1" opacity="0.4"/>
    <!-- Deep-set eye sockets (larger, more cavernous) -->
    <ellipse cx="95" cy="28" rx="9" ry="6.5" fill="#040200" stroke="#0a0806" stroke-width="1"/>
    <ellipse cx="125" cy="28" rx="9" ry="6.5" fill="#040200" stroke="#0a0806" stroke-width="1"/>
    <!-- Socket inner shadow ring -->
    <ellipse cx="95" cy="28" rx="8" ry="5.5" fill="none" stroke="#060402" stroke-width="1.5" opacity="0.6"/>
    <ellipse cx="125" cy="28" rx="8" ry="5.5" fill="none" stroke="#060402" stroke-width="1.5" opacity="0.6"/>
    <!-- Glowing red eyes — large outer glow -->
    <ellipse cx="95" cy="28" rx="10" ry="7" fill="url(#hpEyeGlow)" opacity="0.3"/>
    <ellipse cx="125" cy="28" rx="10" ry="7" fill="url(#hpEyeGlow)" opacity="0.3"/>
    <!-- Mid glow layer -->
    <ellipse cx="95" cy="28" rx="7" ry="5" fill="#441111" opacity="0.7"/>
    <ellipse cx="125" cy="28" rx="7" ry="5" fill="#441111" opacity="0.7"/>
    <!-- Bright iris -->
    <ellipse cx="95" cy="28" rx="5" ry="3.5" fill="#881111"/>
    <ellipse cx="125" cy="28" rx="5" ry="3.5" fill="#881111"/>
    <!-- Inner bright core -->
    <ellipse cx="95" cy="28" rx="3" ry="2" fill="#cc2222"/>
    <ellipse cx="125" cy="28" rx="3" ry="2" fill="#cc2222"/>
    <!-- Vertical slit pupil -->
    <ellipse cx="95" cy="28" rx="0.8" ry="3" fill="#ff4444" opacity="0.95"/>
    <ellipse cx="125" cy="28" rx="0.8" ry="3" fill="#ff4444" opacity="0.95"/>
    <!-- Hot white center point -->
    <ellipse cx="95" cy="28" rx="0.4" ry="1.2" fill="#ff8866" opacity="0.8"/>
    <ellipse cx="125" cy="28" rx="0.4" ry="1.2" fill="#ff8866" opacity="0.8"/>
    <!-- Nose bridge and nostrils -->
    <path d="M 107 32 Q 110 36 113 32" fill="none" stroke="#1a1410" stroke-width="1.2"/>
    <circle cx="107" cy="34" r="1.2" fill="#0a0806"/>
    <circle cx="113" cy="34" r="1.2" fill="#0a0806"/>
    <!-- Nasal ridge wrinkles -->
    <path d="M 108 30 Q 110 29 112 30" fill="none" stroke="#1a1410" stroke-width="0.5" opacity="0.3"/>
    <path d="M 108.5 31 Q 110 30.5 111.5 31" fill="none" stroke="#1a1410" stroke-width="0.4" opacity="0.25"/>
    <!-- Mouth with fangs -->
    <path d="M 94 40 Q 100 43 110 42 Q 120 43 126 40" fill="none" stroke="#1a1410" stroke-width="1.2" stroke-linecap="round"/>
    <!-- Upper fangs (larger, more prominent) -->
    <path d="M 100 41 L 98.5 47 L 101.5 41" fill="#1e1a12" stroke="#1a1410" stroke-width="0.4"/>
    <path d="M 120 41 L 121.5 47 L 118.5 41" fill="#1e1a12" stroke="#1a1410" stroke-width="0.4"/>
    <!-- Smaller inner teeth -->
    <path d="M 104 41.5 L 103.5 44 L 104.5 41.5" fill="#1e1a12" stroke="#1a1410" stroke-width="0.3"/>
    <path d="M 116 41.5 L 116.5 44 L 115.5 41.5" fill="#1e1a12" stroke="#1a1410" stroke-width="0.3"/>
    <!-- Lower jaw fangs poking up -->
    <path d="M 102 43 L 101.5 40 L 102.5 43" fill="#1a1610" stroke="#1a1410" stroke-width="0.3"/>
    <path d="M 118 43 L 118.5 40 L 117.5 43" fill="#1a1610" stroke="#1a1410" stroke-width="0.3"/>
    <!-- Cheekbone ridges -->
    <path d="M 82 30 Q 86 36 88 42" fill="none" stroke="#1a1410" stroke-width="1" opacity="0.6"/>
    <path d="M 138 30 Q 134 36 132 42" fill="none" stroke="#1a1410" stroke-width="1" opacity="0.6"/>
    <!-- Jaw muscle lines -->
    <path d="M 84 38 Q 88 44 90 48" fill="none" stroke="#1a1410" stroke-width="0.6" opacity="0.35"/>
    <path d="M 136 38 Q 132 44 130 48" fill="none" stroke="#1a1410" stroke-width="0.6" opacity="0.35"/>
    <!-- Pointed ears -->
    <path d="M 74 28 Q 66 22 62 16 Q 60 14 64 18 Q 68 24 74 30" fill="#12100a" stroke="#1a1410" stroke-width="0.6" opacity="0.6"/>
    <path d="M 146 28 Q 154 22 158 16 Q 160 14 156 18 Q 152 24 146 30" fill="#12100a" stroke="#1a1410" stroke-width="0.6" opacity="0.6"/>
    <!-- Horns (thick, curved, textured) -->
    <path d="M 78 20 Q 62 6 48 0" fill="none" stroke="url(#hpHorn)" stroke-width="8" stroke-linecap="round"/>
    <path d="M 142 20 Q 158 6 172 0" fill="none" stroke="url(#hpHorn)" stroke-width="8" stroke-linecap="round"/>
    <!-- Horn ridges (more rings for texture) -->
    <path d="M 74 18 Q 72 16 74 14" fill="none" stroke="#201810" stroke-width="0.8" opacity="0.5"/>
    <path d="M 70 15 Q 68 13 70 11" fill="none" stroke="#201810" stroke-width="0.7" opacity="0.45"/>
    <path d="M 65 12 Q 63 10 65 8" fill="none" stroke="#201810" stroke-width="0.7" opacity="0.4"/>
    <path d="M 60 9 Q 58 7 60 5" fill="none" stroke="#201810" stroke-width="0.6" opacity="0.35"/>
    <path d="M 55 6 Q 53 4 55 2" fill="none" stroke="#201810" stroke-width="0.5" opacity="0.3"/>
    <path d="M 146 18 Q 148 16 146 14" fill="none" stroke="#201810" stroke-width="0.8" opacity="0.5"/>
    <path d="M 150 15 Q 152 13 150 11" fill="none" stroke="#201810" stroke-width="0.7" opacity="0.45"/>
    <path d="M 155 12 Q 157 10 155 8" fill="none" stroke="#201810" stroke-width="0.7" opacity="0.4"/>
    <path d="M 160 9 Q 162 7 160 5" fill="none" stroke="#201810" stroke-width="0.6" opacity="0.35"/>
    <path d="M 165 6 Q 167 4 165 2" fill="none" stroke="#201810" stroke-width="0.5" opacity="0.3"/>
    <!-- Chin/jaw detail (more defined) -->
    <path d="M 96 48 Q 103 52 110 54 Q 117 52 124 48" fill="#0e0c08" stroke="#1a1410" stroke-width="0.6" opacity="0.5"/>
    <!-- Chin bump -->
    <ellipse cx="110" cy="52" rx="4" ry="2.5" fill="#10100a" opacity="0.4"/>
    <!-- Neck folds visible below jaw -->
    <path d="M 94 50 Q 102 56 110 56 Q 118 56 126 50" fill="none" stroke="#1a1410" stroke-width="0.5" opacity="0.3"/>
    <path d="M 96 53 Q 103 58 110 58 Q 117 58 124 53" fill="none" stroke="#1a1410" stroke-width="0.4" opacity="0.25"/>
  </svg>`;
  hpOrbWrap.appendChild(hpCreature);
  // Outer decorative ring
  const hpRingOuter = document.createElement("div");
  hpRingOuter.style.cssText = `
    position:absolute;width:146px;height:146px;border-radius:50%;
    border:3px solid transparent;
    background:conic-gradient(from 0deg, #8b6914, #c8a84e, #e8d07a, #c8a84e, #8b6914, #6b4f0e, #8b6914) border-box;
    -webkit-mask:linear-gradient(#fff 0 0) padding-box, linear-gradient(#fff 0 0);
    -webkit-mask-composite:xor;mask-composite:exclude;
    pointer-events:none;
  `;
  // Inner decorative ring
  const hpRingInner = document.createElement("div");
  hpRingInner.style.cssText = `
    position:absolute;width:146px;height:146px;border-radius:50%;
    border:2px solid rgba(60,5,5,0.8);
    box-shadow:0 0 6px rgba(0,0,0,0.6);
    pointer-events:none;
  `;
  const hpOrb = document.createElement("div");
  hpOrb.style.cssText = `
    width:130px;height:130px;border-radius:50%;
    background:radial-gradient(circle at 35% 35%, rgba(60,10,10,0.9), rgba(20,2,2,0.97));
    overflow:hidden;position:relative;
    display:flex;align-items:center;justify-content:center;
    box-shadow:0 0 20px rgba(180,20,20,0.5), inset 0 0 30px rgba(0,0,0,0.6),
      inset 0 0 60px rgba(120,10,10,0.2);
  `;
  const hpBar = document.createElement("div");
  hpBar.style.cssText = `
    position:absolute;bottom:0;left:0;width:100%;height:100%;
    background:radial-gradient(circle at 40% 40%, rgba(220,40,40,0.9), rgba(160,15,15,0.85), rgba(100,5,5,0.9));
    border-radius:50%;transition:height 0.3s;
    box-shadow:inset 0 -5px 15px rgba(255,60,60,0.3), inset 0 3px 8px rgba(255,120,120,0.15);
    animation:hud-hp-liquid 3s ease-in-out infinite;
  `;
  // Surface highlight (liquid sheen)
  const hpSheen = document.createElement("div");
  hpSheen.style.cssText = `
    position:absolute;top:0;left:0;width:100%;height:100%;
    background:linear-gradient(170deg, rgba(255,180,180,0.15) 0%, transparent 40%, transparent 60%, rgba(255,100,100,0.08) 100%);
    border-radius:50%;pointer-events:none;z-index:1;
  `;
  hpBar.appendChild(hpSheen);
  // Inner glow overlay
  const hpGlow = document.createElement("div");
  hpGlow.style.cssText = `
    position:absolute;top:8%;left:12%;width:35%;height:25%;
    background:radial-gradient(ellipse, rgba(255,200,200,0.35), transparent);
    border-radius:50%;pointer-events:none;z-index:2;
    animation:hud-orb-inner-pulse 2s ease-in-out infinite;
  `;
  const hpText = document.createElement("div");
  hpText.style.cssText = `
    position:relative;z-index:3;color:#ffdddd;font-size:15px;font-weight:bold;text-align:center;
    text-shadow:0 0 6px rgba(0,0,0,1), 0 0 12px rgba(0,0,0,0.9), 0 1px 2px rgba(0,0,0,1),
      0 0 20px rgba(180,20,20,0.3);
    font-family:'Cinzel','Palatino Linotype','Book Antiqua',Georgia,serif;
    letter-spacing:1px;
  `;
  // Skull decoration on top
  const hpSkull = document.createElement("div");
  hpSkull.style.cssText = `
    position:absolute;top:-8px;left:50%;transform:translateX(-50%);z-index:4;
    font-size:16px;filter:drop-shadow(0 1px 3px rgba(0,0,0,0.8));
    color:#c8a84e;pointer-events:none;
  `;
  hpSkull.textContent = "\u2020";
  // Corner flourishes (4 positions)
  const hpFlourishes = [
    { top: "2px", left: "2px", rot: "0deg" },
    { top: "2px", right: "2px", rot: "90deg" },
    { bottom: "2px", left: "2px", rot: "270deg" },
    { bottom: "2px", right: "2px", rot: "180deg" },
  ];
  for (const pos of hpFlourishes) {
    const fl = document.createElement("div");
    let posStr = `position:absolute;width:14px;height:14px;pointer-events:none;z-index:5;`;
    if (pos.top) posStr += `top:${pos.top};`;
    if (pos.bottom) posStr += `bottom:${pos.bottom};`;
    if (pos.left) posStr += `left:${pos.left};`;
    if (pos.right) posStr += `right:${pos.right};`;
    posStr += `transform:rotate(${pos.rot});font-size:10px;color:#c8a84e;text-shadow:0 0 4px rgba(200,168,78,0.4);`;
    fl.style.cssText = posStr;
    fl.textContent = "\u269C";
    hpOrbWrap.appendChild(fl);
  }
  hpOrb.appendChild(hpBar);
  hpOrb.appendChild(hpGlow);
  hpOrb.appendChild(hpText);
  hpOrbWrap.appendChild(hpRingOuter);
  hpOrbWrap.appendChild(hpRingInner);
  hpOrbWrap.appendChild(hpOrb);
  hpOrbWrap.appendChild(hpSkull);

  // === HP Orb enhancements ===
  // Second outer ring (dark metal, behind existing gold ring)
  const hpRingOuter2 = document.createElement("div");
  hpRingOuter2.style.cssText = `
    position:absolute;width:144px;height:144px;border-radius:50%;
    border:4px solid transparent;
    background:conic-gradient(from 0deg, #3a2a10, #5a4420, #3a2a10, #2a1a08, #3a2a10) border-box;
    -webkit-mask:linear-gradient(#fff 0 0) padding-box, linear-gradient(#fff 0 0);
    -webkit-mask-composite:xor;mask-composite:exclude;
    pointer-events:none;z-index:-1;
  `;
  hpOrbWrap.appendChild(hpRingOuter2);

  // Tick marks (8 radial lines around the ring)
  for (let t = 0; t < 8; t++) {
    const tick = document.createElement("div");
    tick.style.cssText = `
      position:absolute;width:2px;height:10px;
      background:linear-gradient(180deg, #c8a84e, rgba(139,105,20,0.3));
      top:50%;left:50%;transform-origin:0 0;
      transform:rotate(${t * 45}deg) translate(-1px, -72px);
      pointer-events:none;z-index:6;
    `;
    hpOrbWrap.appendChild(tick);
  }

  // Animated blood drip at top of orb
  const hpBloodDrip = document.createElement("div");
  hpBloodDrip.style.cssText = `
    position:absolute;top:8px;left:50%;transform:translateX(-50%);z-index:7;
    width:6px;height:12px;border-radius:50% 50% 50% 50% / 30% 30% 70% 70%;
    background:radial-gradient(circle at 40% 30%, rgba(220,40,40,0.9), rgba(140,10,10,0.7));
    animation:hud-blood-drip 2s ease-in-out infinite;
    pointer-events:none;
  `;
  hpOrbWrap.appendChild(hpBloodDrip);

  // Chain link decoration connecting to skill bar
  const hpChain = document.createElement("div");
  hpChain.style.cssText = `
    position:absolute;bottom:-18px;left:50%;transform:translateX(-50%);z-index:6;
    width:8px;height:20px;pointer-events:none;
    background:repeating-linear-gradient(180deg, #8b6914 0px, #c8a84e 2px, #8b6914 4px, transparent 4px, transparent 6px);
    border-radius:2px;
    filter:drop-shadow(0 1px 2px rgba(0,0,0,0.6));
  `;
  hpOrbWrap.appendChild(hpChain);

  // Bottom ornament (fleur-de-lis)
  const hpBottomOrnament = document.createElement("div");
  hpBottomOrnament.style.cssText = `
    position:absolute;bottom:-10px;left:50%;transform:translateX(-50%);z-index:8;
    font-size:16px;color:#c8a84e;pointer-events:none;
    filter:drop-shadow(0 1px 3px rgba(0,0,0,0.8));
    text-shadow:0 0 6px rgba(200,168,78,0.4);
  `;
  hpBottomOrnament.textContent = "\u269C";
  hpOrbWrap.appendChild(hpBottomOrnament);

  // Rotating rune ring (slow spin, adds arcane feel)
  const hpRuneRing = document.createElement("div");
  hpRuneRing.style.cssText = `
    position:absolute;width:158px;height:158px;border-radius:50%;
    top:50%;left:50%;transform-origin:center center;
    animation:hud-orb-rune-spin 20s linear infinite;
    pointer-events:none;z-index:0;
  `;
  const runeChars = ["\u16A0", "\u16B1", "\u16C1", "\u16D2", "\u16A8", "\u16BE"];
  for (let r = 0; r < 6; r++) {
    const rune = document.createElement("div");
    const angle = (r / 6) * 360;
    rune.style.cssText = `
      position:absolute;width:16px;height:16px;
      top:50%;left:50%;font-size:11px;color:rgba(200,168,78,0.35);
      text-shadow:0 0 4px rgba(200,168,78,0.2);
      transform-origin:0 0;transform:rotate(${angle}deg) translate(0, -79px) rotate(-${angle}deg) translate(-8px,-8px);
      text-align:center;line-height:16px;
      font-family:'Segoe UI Symbol','Apple Symbols',sans-serif;
    `;
    rune.textContent = runeChars[r];
    hpRuneRing.appendChild(rune);
  }
  hpOrbWrap.appendChild(hpRuneRing);

  // Outer glow ring (subtle red ambient)
  const hpAmbientGlow = document.createElement("div");
  hpAmbientGlow.style.cssText = `
    position:absolute;width:160px;height:160px;border-radius:50%;
    top:50%;left:50%;transform:translate(-50%,-50%);
    box-shadow:0 0 20px rgba(180,20,20,0.2), 0 0 40px rgba(180,20,20,0.1);
    pointer-events:none;z-index:-2;
    animation:hud-orb-inner-pulse 3s ease-in-out infinite;
  `;
  hpOrbWrap.appendChild(hpAmbientGlow);

  hud.appendChild(hpOrbWrap);

  // Mana orb - bottom right (ornate)
  const mpOrbWrap = document.createElement("div");
  mpOrbWrap.style.cssText = `
    position:absolute;bottom:22px;right:22px;width:150px;height:150px;
    display:flex;align-items:center;justify-content:center;
    filter:drop-shadow(0 0 12px rgba(30,30,200,0.35));
  `;
  // Detailed gargoyle behind the mana orb with claws (blue-tinted)
  const mpCreature = document.createElement("div");
  mpCreature.style.cssText = `position:absolute;width:220px;height:220px;top:-35px;left:-35px;pointer-events:none;z-index:-3;`;
  mpCreature.innerHTML = `<svg viewBox="0 0 220 220" style="width:100%;height:100%;" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <radialGradient id="mpGG" cx="50%" cy="48%"><stop offset="0%" stop-color="#0c1018"/><stop offset="70%" stop-color="#06080e"/><stop offset="100%" stop-color="#020406"/></radialGradient>
      <linearGradient id="mpHorn" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#10141a"/><stop offset="100%" stop-color="#06080a"/></linearGradient>
      <radialGradient id="mpEyeGlow" cx="50%" cy="50%"><stop offset="0%" stop-color="#4488ff"/><stop offset="50%" stop-color="#2244cc"/><stop offset="100%" stop-color="#112266" stop-opacity="0"/></radialGradient>
      <linearGradient id="mpWingMem" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#0a1018"/><stop offset="100%" stop-color="#060810"/></linearGradient>
    </defs>
    <!-- Wings (folded behind body, visible at edges) -->
    <!-- Left wing membrane -->
    <path d="M 38 50 Q 8 30 2 8 Q 0 2 4 6 Q 12 18 20 32 Q 10 42 6 58 Q 2 72 6 68 Q 12 60 22 52 Q 14 72 8 90 Q 4 100 8 96 Q 16 82 28 66 Z"
      fill="url(#mpWingMem)" stroke="#101828" stroke-width="0.6" opacity="0.7"/>
    <!-- Left wing bone spars -->
    <path d="M 38 50 Q 18 28 4 6" fill="none" stroke="#141c28" stroke-width="1.8" opacity="0.5"/>
    <path d="M 36 54 Q 16 50 6 58" fill="none" stroke="#141c28" stroke-width="1.2" opacity="0.4"/>
    <path d="M 34 60 Q 18 68 8 90" fill="none" stroke="#141c28" stroke-width="1.2" opacity="0.4"/>
    <!-- Left wing vein details -->
    <path d="M 20 32 Q 14 38 12 48" fill="none" stroke="#101828" stroke-width="0.5" opacity="0.35"/>
    <path d="M 16 42 Q 12 55 10 65" fill="none" stroke="#101828" stroke-width="0.4" opacity="0.3"/>
    <!-- Right wing membrane -->
    <path d="M 182 50 Q 212 30 218 8 Q 220 2 216 6 Q 208 18 200 32 Q 210 42 214 58 Q 218 72 214 68 Q 208 60 198 52 Q 206 72 212 90 Q 216 100 212 96 Q 204 82 192 66 Z"
      fill="url(#mpWingMem)" stroke="#101828" stroke-width="0.6" opacity="0.7"/>
    <!-- Right wing bone spars -->
    <path d="M 182 50 Q 202 28 216 6" fill="none" stroke="#141c28" stroke-width="1.8" opacity="0.5"/>
    <path d="M 184 54 Q 204 50 214 58" fill="none" stroke="#141c28" stroke-width="1.2" opacity="0.4"/>
    <path d="M 186 60 Q 202 68 212 90" fill="none" stroke="#141c28" stroke-width="1.2" opacity="0.4"/>
    <!-- Right wing vein details -->
    <path d="M 200 32 Q 206 38 208 48" fill="none" stroke="#101828" stroke-width="0.5" opacity="0.35"/>
    <path d="M 204 42 Q 208 55 210 65" fill="none" stroke="#101828" stroke-width="0.4" opacity="0.3"/>
    <!-- Body mass behind orb -->
    <path d="M 110 8 C 70 5 28 28 16 62 C 6 90 4 110 8 135 C 14 160 32 182 60 196
             C 78 205 95 210 110 210 C 125 210 142 205 160 196
             C 188 182 206 160 212 135 C 216 110 214 90 204 62
             C 192 28 150 5 110 8 Z"
      fill="url(#mpGG)" stroke="#0e1420" stroke-width="1.5" opacity="0.85"/>
    <!-- Scale texture -->
    <path d="M 46 72 Q 48 68 52 72 Q 54 68 58 72" fill="none" stroke="#101828" stroke-width="0.7" opacity="0.3"/>
    <path d="M 44 82 Q 47 78 50 82 Q 53 78 56 82 Q 59 78 62 82" fill="none" stroke="#101828" stroke-width="0.6" opacity="0.25"/>
    <path d="M 42 94 Q 45 90 48 94 Q 51 90 54 94" fill="none" stroke="#101828" stroke-width="0.6" opacity="0.25"/>
    <path d="M 162 72 Q 164 68 168 72 Q 170 68 174 72" fill="none" stroke="#101828" stroke-width="0.7" opacity="0.3"/>
    <path d="M 158 82 Q 161 78 164 82 Q 167 78 170 82 Q 173 78 176 82" fill="none" stroke="#101828" stroke-width="0.6" opacity="0.25"/>
    <path d="M 160 94 Q 163 90 166 94 Q 169 90 172 94" fill="none" stroke="#101828" stroke-width="0.6" opacity="0.25"/>
    <!-- Muscle/rib texture lines -->
    <path d="M 50 70 Q 55 80 48 95" fill="none" stroke="#101828" stroke-width="1.2" opacity="0.4"/>
    <path d="M 42 90 Q 48 105 40 120" fill="none" stroke="#101828" stroke-width="1" opacity="0.3"/>
    <path d="M 170 70 Q 165 80 172 95" fill="none" stroke="#101828" stroke-width="1.2" opacity="0.4"/>
    <path d="M 178 90 Q 172 105 180 120" fill="none" stroke="#101828" stroke-width="1" opacity="0.3"/>
    <path d="M 55 150 Q 60 160 52 172" fill="none" stroke="#101828" stroke-width="0.8" opacity="0.3"/>
    <path d="M 165 150 Q 160 160 168 172" fill="none" stroke="#101828" stroke-width="0.8" opacity="0.3"/>
    <!-- Spine ridge bumps -->
    <ellipse cx="110" cy="190" rx="3" ry="2" fill="#0a0e18" opacity="0.5"/>
    <ellipse cx="110" cy="198" rx="2.5" ry="1.8" fill="#0a0e18" opacity="0.4"/>
    <ellipse cx="110" cy="205" rx="2" ry="1.5" fill="#0a0e18" opacity="0.3"/>
    <!-- LEFT SHOULDER (skeletal) -->
    <ellipse cx="40" cy="60" rx="14" ry="10" fill="#0a0e18" stroke="#101828" stroke-width="0.8" opacity="0.6"/>
    <circle cx="34" cy="68" r="5" fill="#0c1018" stroke="#141c28" stroke-width="0.8"/>
    <circle cx="34" cy="68" r="2.5" fill="#060a10" opacity="0.5"/>
    <!-- Left clavicle bone -->
    <path d="M 70 52 Q 52 54 34 64" fill="none" stroke="#101828" stroke-width="2.5" stroke-linecap="round" opacity="0.5"/>
    <!-- Left upper arm bone -->
    <path d="M 34 72 Q 32 78 30 86" fill="none" stroke="#101828" stroke-width="3" stroke-linecap="round" opacity="0.45"/>
    <!-- LEFT ELBOW joint -->
    <circle cx="30" cy="86" r="3" fill="#0a0e18" stroke="#101828" stroke-width="0.6"/>
    <!-- Left forearm bones -->
    <path d="M 30 88 Q 28 96 26 105" fill="none" stroke="#101828" stroke-width="2.5" stroke-linecap="round" opacity="0.4"/>
    <path d="M 31 89 Q 30 97 28 105" fill="none" stroke="#0c1018" stroke-width="1.5" stroke-linecap="round" opacity="0.3"/>
    <!-- RIGHT SHOULDER (skeletal) -->
    <ellipse cx="180" cy="60" rx="14" ry="10" fill="#0a0e18" stroke="#101828" stroke-width="0.8" opacity="0.6"/>
    <circle cx="186" cy="68" r="5" fill="#0c1018" stroke="#141c28" stroke-width="0.8"/>
    <circle cx="186" cy="68" r="2.5" fill="#060a10" opacity="0.5"/>
    <!-- Right clavicle bone -->
    <path d="M 150 52 Q 168 54 186 64" fill="none" stroke="#101828" stroke-width="2.5" stroke-linecap="round" opacity="0.5"/>
    <!-- Right upper arm bone -->
    <path d="M 186 72 Q 188 78 190 86" fill="none" stroke="#101828" stroke-width="3" stroke-linecap="round" opacity="0.45"/>
    <!-- RIGHT ELBOW joint -->
    <circle cx="190" cy="86" r="3" fill="#0a0e18" stroke="#101828" stroke-width="0.6"/>
    <!-- Right forearm bones -->
    <path d="M 190 88 Q 192 96 194 105" fill="none" stroke="#101828" stroke-width="2.5" stroke-linecap="round" opacity="0.4"/>
    <path d="M 189 89 Q 190 97 192 105" fill="none" stroke="#0c1018" stroke-width="1.5" stroke-linecap="round" opacity="0.3"/>
    <!-- LEFT SKELETAL HAND gripping orb (5 bony fingers) -->
    <!-- Left wrist bones (carpals cluster) -->
    <circle cx="24" cy="106" r="3.5" fill="#0c1018" stroke="#141c28" stroke-width="0.6"/>
    <circle cx="28" cy="104" r="2.2" fill="#0a0e18" opacity="0.4"/>
    <circle cx="22" cy="104" r="1.8" fill="#0c1018" opacity="0.35"/>
    <circle cx="26" cy="108" r="1.5" fill="#0a0e18" opacity="0.3"/>
    <!-- Left thumb -->
    <path d="M 28 100 Q 34 92 38 82" fill="none" stroke="#101828" stroke-width="2.5" stroke-linecap="round"/>
    <circle cx="36" cy="85" r="2" fill="#0c1018" stroke="#141c28" stroke-width="0.5"/>
    <path d="M 38 82 Q 40 76 38 72" fill="none" stroke="#101828" stroke-width="2" stroke-linecap="round"/>
    <circle cx="39" cy="76" r="1.6" fill="#0c1018" opacity="0.5"/>
    <path d="M 38 72 Q 36 68 32 66" fill="none" stroke="#101828" stroke-width="1.5" stroke-linecap="round"/>
    <path d="M 32 66 Q 30 64 28 63 Q 30 62 33 64" fill="#141c28" stroke="#101828" stroke-width="0.5"/>
    <!-- Left index finger -->
    <path d="M 22 108 Q 18 98 16 88" fill="none" stroke="#0e1420" stroke-width="2.2" stroke-linecap="round"/>
    <circle cx="17" cy="93" r="1.8" fill="#0c1018" stroke="#101828" stroke-width="0.4"/>
    <path d="M 16 88 Q 12 80 8 74" fill="none" stroke="#0e1420" stroke-width="2" stroke-linecap="round"/>
    <circle cx="12" cy="81" r="1.5" fill="#0c1018" stroke="#101828" stroke-width="0.4"/>
    <path d="M 8 74 Q 4 68 2 64" fill="none" stroke="#101828" stroke-width="1.5" stroke-linecap="round"/>
    <path d="M 2 64 Q 0 62 -1 60 Q 1 59 3 62" fill="#141c28" stroke="#101828" stroke-width="0.4"/>
    <!-- Left middle finger (longest) -->
    <path d="M 20 110 Q 14 102 10 92" fill="none" stroke="#0e1420" stroke-width="2.5" stroke-linecap="round"/>
    <circle cx="13" cy="98" r="1.8" fill="#0c1018" stroke="#101828" stroke-width="0.4"/>
    <path d="M 10 92 Q 6 82 2 74" fill="none" stroke="#0e1420" stroke-width="2.2" stroke-linecap="round"/>
    <circle cx="6" cy="83" r="1.6" fill="#0c1018" stroke="#101828" stroke-width="0.4"/>
    <path d="M 2 74 Q -2 66 -4 60" fill="none" stroke="#101828" stroke-width="1.6" stroke-linecap="round"/>
    <path d="M -4 60 Q -6 58 -7 56 Q -5 55 -3 58" fill="#141c28" stroke="#101828" stroke-width="0.4"/>
    <!-- Left ring finger -->
    <path d="M 18 114 Q 12 108 8 100" fill="none" stroke="#0e1420" stroke-width="2.2" stroke-linecap="round"/>
    <circle cx="10" cy="104" r="1.6" fill="#0c1018" stroke="#101828" stroke-width="0.4"/>
    <path d="M 8 100 Q 4 92 0 86" fill="none" stroke="#0e1420" stroke-width="2" stroke-linecap="round"/>
    <circle cx="4" cy="93" r="1.4" fill="#0c1018" opacity="0.5"/>
    <path d="M 0 86 Q -2 80 -4 76" fill="none" stroke="#101828" stroke-width="1.4" stroke-linecap="round"/>
    <path d="M -4 76 Q -5 74 -6 72 Q -4 72 -3 74" fill="#141c28" stroke="#101828" stroke-width="0.4"/>
    <!-- Left pinky finger -->
    <path d="M 16 118 Q 10 114 8 108" fill="none" stroke="#0c1018" stroke-width="2" stroke-linecap="round"/>
    <circle cx="9" cy="111" r="1.4" fill="#0a0e18" stroke="#101828" stroke-width="0.4"/>
    <path d="M 8 108 Q 4 102 2 96" fill="none" stroke="#0c1018" stroke-width="1.8" stroke-linecap="round"/>
    <circle cx="5" cy="102" r="1.2" fill="#0a0e18" opacity="0.45"/>
    <path d="M 2 96 Q 0 92 -2 88" fill="none" stroke="#0e1420" stroke-width="1.2" stroke-linecap="round"/>
    <path d="M -2 88 Q -3 86 -4 85 Q -2 85 -1 87" fill="#141c28" stroke="#0e1420" stroke-width="0.3"/>
    <!-- Tendon lines left hand -->
    <path d="M 24 106 Q 20 100 18 92" fill="none" stroke="#0e1420" stroke-width="0.5" opacity="0.35"/>
    <path d="M 23 107 Q 17 102 14 96" fill="none" stroke="#0e1420" stroke-width="0.5" opacity="0.3"/>
    <path d="M 22 108 Q 15 106 10 102" fill="none" stroke="#0e1420" stroke-width="0.4" opacity="0.25"/>
    <!-- RIGHT SKELETAL HAND gripping orb (mirror) -->
    <!-- Right wrist bones -->
    <circle cx="196" cy="106" r="3.5" fill="#0c1018" stroke="#141c28" stroke-width="0.6"/>
    <circle cx="192" cy="104" r="2.2" fill="#0a0e18" opacity="0.4"/>
    <circle cx="198" cy="104" r="1.8" fill="#0c1018" opacity="0.35"/>
    <circle cx="194" cy="108" r="1.5" fill="#0a0e18" opacity="0.3"/>
    <!-- Right thumb -->
    <path d="M 192 100 Q 186 92 182 82" fill="none" stroke="#101828" stroke-width="2.5" stroke-linecap="round"/>
    <circle cx="184" cy="85" r="2" fill="#0c1018" stroke="#141c28" stroke-width="0.5"/>
    <path d="M 182 82 Q 180 76 182 72" fill="none" stroke="#101828" stroke-width="2" stroke-linecap="round"/>
    <circle cx="181" cy="76" r="1.6" fill="#0c1018" opacity="0.5"/>
    <path d="M 182 72 Q 184 68 188 66" fill="none" stroke="#101828" stroke-width="1.5" stroke-linecap="round"/>
    <path d="M 188 66 Q 190 64 192 63 Q 190 62 187 64" fill="#141c28" stroke="#101828" stroke-width="0.5"/>
    <!-- Right index finger -->
    <path d="M 198 108 Q 202 98 204 88" fill="none" stroke="#0e1420" stroke-width="2.2" stroke-linecap="round"/>
    <circle cx="203" cy="93" r="1.8" fill="#0c1018" stroke="#101828" stroke-width="0.4"/>
    <path d="M 204 88 Q 208 80 212 74" fill="none" stroke="#0e1420" stroke-width="2" stroke-linecap="round"/>
    <circle cx="208" cy="81" r="1.5" fill="#0c1018" stroke="#101828" stroke-width="0.4"/>
    <path d="M 212 74 Q 216 68 218 64" fill="none" stroke="#101828" stroke-width="1.5" stroke-linecap="round"/>
    <path d="M 218 64 Q 220 62 221 60 Q 219 59 217 62" fill="#141c28" stroke="#101828" stroke-width="0.4"/>
    <!-- Right middle finger (longest) -->
    <path d="M 200 110 Q 206 102 210 92" fill="none" stroke="#0e1420" stroke-width="2.5" stroke-linecap="round"/>
    <circle cx="207" cy="98" r="1.8" fill="#0c1018" stroke="#101828" stroke-width="0.4"/>
    <path d="M 210 92 Q 214 82 218 74" fill="none" stroke="#0e1420" stroke-width="2.2" stroke-linecap="round"/>
    <circle cx="214" cy="83" r="1.6" fill="#0c1018" stroke="#101828" stroke-width="0.4"/>
    <path d="M 218 74 Q 222 66 224 60" fill="none" stroke="#101828" stroke-width="1.6" stroke-linecap="round"/>
    <path d="M 224 60 Q 226 58 227 56 Q 225 55 223 58" fill="#141c28" stroke="#101828" stroke-width="0.4"/>
    <!-- Right ring finger -->
    <path d="M 202 114 Q 208 108 212 100" fill="none" stroke="#0e1420" stroke-width="2.2" stroke-linecap="round"/>
    <circle cx="210" cy="104" r="1.6" fill="#0c1018" stroke="#101828" stroke-width="0.4"/>
    <path d="M 212 100 Q 216 92 220 86" fill="none" stroke="#0e1420" stroke-width="2" stroke-linecap="round"/>
    <circle cx="216" cy="93" r="1.4" fill="#0c1018" opacity="0.5"/>
    <path d="M 220 86 Q 222 80 224 76" fill="none" stroke="#101828" stroke-width="1.4" stroke-linecap="round"/>
    <path d="M 224 76 Q 225 74 226 72 Q 224 72 223 74" fill="#141c28" stroke="#101828" stroke-width="0.4"/>
    <!-- Right pinky finger -->
    <path d="M 204 118 Q 210 114 212 108" fill="none" stroke="#0c1018" stroke-width="2" stroke-linecap="round"/>
    <circle cx="211" cy="111" r="1.4" fill="#0a0e18" stroke="#101828" stroke-width="0.4"/>
    <path d="M 212 108 Q 216 102 218 96" fill="none" stroke="#0c1018" stroke-width="1.8" stroke-linecap="round"/>
    <circle cx="215" cy="102" r="1.2" fill="#0a0e18" opacity="0.45"/>
    <path d="M 218 96 Q 220 92 222 88" fill="none" stroke="#0e1420" stroke-width="1.2" stroke-linecap="round"/>
    <path d="M 222 88 Q 223 86 224 85 Q 222 85 221 87" fill="#141c28" stroke="#0e1420" stroke-width="0.3"/>
    <!-- Tendon lines right hand -->
    <path d="M 196 106 Q 200 100 202 92" fill="none" stroke="#0e1420" stroke-width="0.5" opacity="0.35"/>
    <path d="M 197 107 Q 203 102 206 96" fill="none" stroke="#0e1420" stroke-width="0.5" opacity="0.3"/>
    <path d="M 198 108 Q 205 106 210 102" fill="none" stroke="#0e1420" stroke-width="0.4" opacity="0.25"/>
    <!-- Head (larger, more detailed) -->
    <path d="M 110 14 C 90 12 76 18 74 30 C 72 42 80 50 95 52 C 100 52 110 53 120 52
             C 140 50 148 42 146 30 C 144 18 130 12 110 14 Z" fill="#0a0e14" stroke="#101828" stroke-width="1"/>
    <!-- Cranial ridges -->
    <path d="M 84 20 Q 90 17 96 20" fill="none" stroke="#101828" stroke-width="0.6" opacity="0.4"/>
    <path d="M 86 22 Q 92 19 98 22" fill="none" stroke="#101828" stroke-width="0.5" opacity="0.35"/>
    <path d="M 122 20 Q 128 17 134 20" fill="none" stroke="#101828" stroke-width="0.6" opacity="0.4"/>
    <path d="M 120 22 Q 126 19 132 22" fill="none" stroke="#101828" stroke-width="0.5" opacity="0.35"/>
    <!-- Brow ridge -->
    <path d="M 80 24 C 88 18 100 17 110 20 C 120 17 132 18 140 24" fill="none" stroke="#141c28" stroke-width="2.5" stroke-linecap="round"/>
    <path d="M 82 25 C 90 20 100 19 110 21 C 120 19 130 20 138 25" fill="none" stroke="#040810" stroke-width="1" opacity="0.4"/>
    <!-- Deep-set eye sockets -->
    <ellipse cx="95" cy="28" rx="9" ry="6.5" fill="#010308" stroke="#0a0e14" stroke-width="1"/>
    <ellipse cx="125" cy="28" rx="9" ry="6.5" fill="#010308" stroke="#0a0e14" stroke-width="1"/>
    <ellipse cx="95" cy="28" rx="8" ry="5.5" fill="none" stroke="#020408" stroke-width="1.5" opacity="0.6"/>
    <ellipse cx="125" cy="28" rx="8" ry="5.5" fill="none" stroke="#020408" stroke-width="1.5" opacity="0.6"/>
    <!-- Glowing blue eyes -->
    <ellipse cx="95" cy="28" rx="10" ry="7" fill="url(#mpEyeGlow)" opacity="0.3"/>
    <ellipse cx="125" cy="28" rx="10" ry="7" fill="url(#mpEyeGlow)" opacity="0.3"/>
    <ellipse cx="95" cy="28" rx="7" ry="5" fill="#112244" opacity="0.7"/>
    <ellipse cx="125" cy="28" rx="7" ry="5" fill="#112244" opacity="0.7"/>
    <ellipse cx="95" cy="28" rx="5" ry="3.5" fill="#1133aa"/>
    <ellipse cx="125" cy="28" rx="5" ry="3.5" fill="#1133aa"/>
    <ellipse cx="95" cy="28" rx="3" ry="2" fill="#2244cc"/>
    <ellipse cx="125" cy="28" rx="3" ry="2" fill="#2244cc"/>
    <ellipse cx="95" cy="28" rx="0.8" ry="3" fill="#4488ff" opacity="0.95"/>
    <ellipse cx="125" cy="28" rx="0.8" ry="3" fill="#4488ff" opacity="0.95"/>
    <ellipse cx="95" cy="28" rx="0.4" ry="1.2" fill="#88bbff" opacity="0.8"/>
    <ellipse cx="125" cy="28" rx="0.4" ry="1.2" fill="#88bbff" opacity="0.8"/>
    <!-- Nose -->
    <path d="M 107 32 Q 110 36 113 32" fill="none" stroke="#101828" stroke-width="1.2"/>
    <circle cx="107" cy="34" r="1.2" fill="#040810"/>
    <circle cx="113" cy="34" r="1.2" fill="#040810"/>
    <path d="M 108 30 Q 110 29 112 30" fill="none" stroke="#101828" stroke-width="0.5" opacity="0.3"/>
    <path d="M 108.5 31 Q 110 30.5 111.5 31" fill="none" stroke="#101828" stroke-width="0.4" opacity="0.25"/>
    <!-- Mouth with fangs -->
    <path d="M 94 40 Q 100 43 110 42 Q 120 43 126 40" fill="none" stroke="#101828" stroke-width="1.2" stroke-linecap="round"/>
    <path d="M 100 41 L 98.5 47 L 101.5 41" fill="#141c24" stroke="#101828" stroke-width="0.4"/>
    <path d="M 120 41 L 121.5 47 L 118.5 41" fill="#141c24" stroke="#101828" stroke-width="0.4"/>
    <path d="M 104 41.5 L 103.5 44 L 104.5 41.5" fill="#141c24" stroke="#101828" stroke-width="0.3"/>
    <path d="M 116 41.5 L 116.5 44 L 115.5 41.5" fill="#141c24" stroke="#101828" stroke-width="0.3"/>
    <path d="M 102 43 L 101.5 40 L 102.5 43" fill="#101820" stroke="#101828" stroke-width="0.3"/>
    <path d="M 118 43 L 118.5 40 L 117.5 43" fill="#101820" stroke="#101828" stroke-width="0.3"/>
    <!-- Cheekbone ridges -->
    <path d="M 82 30 Q 86 36 88 42" fill="none" stroke="#101828" stroke-width="1" opacity="0.6"/>
    <path d="M 138 30 Q 134 36 132 42" fill="none" stroke="#101828" stroke-width="1" opacity="0.6"/>
    <!-- Jaw muscle lines -->
    <path d="M 84 38 Q 88 44 90 48" fill="none" stroke="#101828" stroke-width="0.6" opacity="0.35"/>
    <path d="M 136 38 Q 132 44 130 48" fill="none" stroke="#101828" stroke-width="0.6" opacity="0.35"/>
    <!-- Pointed ears -->
    <path d="M 74 28 Q 66 22 62 16 Q 60 14 64 18 Q 68 24 74 30" fill="#0a0e14" stroke="#101828" stroke-width="0.6" opacity="0.6"/>
    <path d="M 146 28 Q 154 22 158 16 Q 160 14 156 18 Q 152 24 146 30" fill="#0a0e14" stroke="#101828" stroke-width="0.6" opacity="0.6"/>
    <!-- Horns -->
    <path d="M 78 20 Q 62 6 48 0" fill="none" stroke="url(#mpHorn)" stroke-width="8" stroke-linecap="round"/>
    <path d="M 142 20 Q 158 6 172 0" fill="none" stroke="url(#mpHorn)" stroke-width="8" stroke-linecap="round"/>
    <!-- Horn ridges -->
    <path d="M 74 18 Q 72 16 74 14" fill="none" stroke="#141c28" stroke-width="0.8" opacity="0.5"/>
    <path d="M 70 15 Q 68 13 70 11" fill="none" stroke="#141c28" stroke-width="0.7" opacity="0.45"/>
    <path d="M 65 12 Q 63 10 65 8" fill="none" stroke="#141c28" stroke-width="0.7" opacity="0.4"/>
    <path d="M 60 9 Q 58 7 60 5" fill="none" stroke="#141c28" stroke-width="0.6" opacity="0.35"/>
    <path d="M 55 6 Q 53 4 55 2" fill="none" stroke="#141c28" stroke-width="0.5" opacity="0.3"/>
    <path d="M 146 18 Q 148 16 146 14" fill="none" stroke="#141c28" stroke-width="0.8" opacity="0.5"/>
    <path d="M 150 15 Q 152 13 150 11" fill="none" stroke="#141c28" stroke-width="0.7" opacity="0.45"/>
    <path d="M 155 12 Q 157 10 155 8" fill="none" stroke="#141c28" stroke-width="0.7" opacity="0.4"/>
    <path d="M 160 9 Q 162 7 160 5" fill="none" stroke="#141c28" stroke-width="0.6" opacity="0.35"/>
    <path d="M 165 6 Q 167 4 165 2" fill="none" stroke="#141c28" stroke-width="0.5" opacity="0.3"/>
    <!-- Chin/jaw -->
    <path d="M 96 48 Q 103 52 110 54 Q 117 52 124 48" fill="#060a10" stroke="#101828" stroke-width="0.6" opacity="0.5"/>
    <ellipse cx="110" cy="52" rx="4" ry="2.5" fill="#080c14" opacity="0.4"/>
    <!-- Neck folds -->
    <path d="M 94 50 Q 102 56 110 56 Q 118 56 126 50" fill="none" stroke="#101828" stroke-width="0.5" opacity="0.3"/>
    <path d="M 96 53 Q 103 58 110 58 Q 117 58 124 53" fill="none" stroke="#101828" stroke-width="0.4" opacity="0.25"/>
  </svg>`;
  mpOrbWrap.appendChild(mpCreature);
  // Outer decorative ring (silver/blue)
  const mpRingOuter = document.createElement("div");
  mpRingOuter.style.cssText = `
    position:absolute;width:146px;height:146px;border-radius:50%;
    border:3px solid transparent;
    background:conic-gradient(from 0deg, #4a5a8b, #7a8ac8, #a0b0e8, #7a8ac8, #4a5a8b, #3a4a6b, #4a5a8b) border-box;
    -webkit-mask:linear-gradient(#fff 0 0) padding-box, linear-gradient(#fff 0 0);
    -webkit-mask-composite:xor;mask-composite:exclude;
    pointer-events:none;
  `;
  // Inner ring
  const mpRingInner = document.createElement("div");
  mpRingInner.style.cssText = `
    position:absolute;width:136px;height:136px;border-radius:50%;
    border:2px solid rgba(5,5,60,0.8);
    box-shadow:0 0 6px rgba(0,0,0,0.6);
    pointer-events:none;
  `;
  const mpOrb = document.createElement("div");
  mpOrb.style.cssText = `
    width:130px;height:130px;border-radius:50%;
    background:radial-gradient(circle at 35% 35%, rgba(10,10,60,0.9), rgba(2,2,20,0.97));
    overflow:hidden;position:relative;
    display:flex;align-items:center;justify-content:center;
    box-shadow:0 0 20px rgba(30,30,200,0.5), inset 0 0 30px rgba(0,0,0,0.6),
      inset 0 0 60px rgba(10,10,120,0.2);
  `;
  const mpBar = document.createElement("div");
  mpBar.style.cssText = `
    position:absolute;bottom:0;left:0;width:100%;height:100%;
    background:radial-gradient(circle at 40% 40%, rgba(70,70,240,0.9), rgba(30,30,160,0.85), rgba(10,10,100,0.9));
    border-radius:50%;transition:height 0.3s;
    box-shadow:inset 0 -5px 15px rgba(60,60,255,0.3), inset 0 3px 8px rgba(120,120,255,0.15);
    animation:hud-hp-liquid 3.5s ease-in-out infinite;
  `;
  // Surface highlight (arcane sheen)
  const mpSheen = document.createElement("div");
  mpSheen.style.cssText = `
    position:absolute;top:0;left:0;width:100%;height:100%;
    background:linear-gradient(170deg, rgba(180,180,255,0.15) 0%, transparent 40%, transparent 60%, rgba(100,100,255,0.08) 100%);
    border-radius:50%;pointer-events:none;z-index:1;
  `;
  mpBar.appendChild(mpSheen);
  // Inner glow
  const mpGlow = document.createElement("div");
  mpGlow.style.cssText = `
    position:absolute;top:8%;left:12%;width:35%;height:25%;
    background:radial-gradient(ellipse, rgba(200,200,255,0.35), transparent);
    border-radius:50%;pointer-events:none;z-index:2;
    animation:hud-orb-inner-pulse 2.5s ease-in-out infinite;
  `;
  const mpText = document.createElement("div");
  mpText.style.cssText = `
    position:relative;z-index:3;color:#ddddff;font-size:15px;font-weight:bold;text-align:center;
    text-shadow:0 0 6px rgba(0,0,0,1), 0 0 12px rgba(0,0,0,0.9), 0 1px 2px rgba(0,0,0,1),
      0 0 20px rgba(40,40,200,0.3);
    font-family:'Cinzel','Palatino Linotype','Book Antiqua',Georgia,serif;
    letter-spacing:1px;
  `;
  // Arcane rune decoration on top
  const mpRune = document.createElement("div");
  mpRune.style.cssText = `
    position:absolute;top:-8px;left:50%;transform:translateX(-50%);z-index:4;
    font-size:16px;filter:drop-shadow(0 1px 3px rgba(0,0,0,0.8));
    color:#7a8ac8;pointer-events:none;
  `;
  mpRune.textContent = "\u2726";
  // Corner rune flourishes
  const mpFlourishes = [
    { top: "2px", left: "2px", rot: "0deg" },
    { top: "2px", right: "2px", rot: "90deg" },
    { bottom: "2px", left: "2px", rot: "270deg" },
    { bottom: "2px", right: "2px", rot: "180deg" },
  ];
  for (const pos of mpFlourishes) {
    const fl = document.createElement("div");
    let posStr = `position:absolute;width:14px;height:14px;pointer-events:none;z-index:5;`;
    if (pos.top) posStr += `top:${pos.top};`;
    if (pos.bottom) posStr += `bottom:${pos.bottom};`;
    if (pos.left) posStr += `left:${pos.left};`;
    if (pos.right) posStr += `right:${pos.right};`;
    posStr += `transform:rotate(${pos.rot});font-size:10px;color:#7a8ac8;text-shadow:0 0 4px rgba(100,120,200,0.4);`;
    fl.style.cssText = posStr;
    fl.textContent = "\u2727";
    mpOrbWrap.appendChild(fl);
  }
  mpOrb.appendChild(mpBar);
  mpOrb.appendChild(mpGlow);
  mpOrb.appendChild(mpText);
  mpOrbWrap.appendChild(mpRingOuter);
  mpOrbWrap.appendChild(mpRingInner);
  mpOrbWrap.appendChild(mpOrb);
  mpOrbWrap.appendChild(mpRune);

  // === MP Orb enhancements ===
  // Second outer ring (silver metal, behind existing ring)
  const mpRingOuter2 = document.createElement("div");
  mpRingOuter2.style.cssText = `
    position:absolute;width:144px;height:144px;border-radius:50%;
    border:4px solid transparent;
    background:conic-gradient(from 0deg, #2a2a3a, #3a3a5a, #2a2a3a, #1a1a28, #2a2a3a) border-box;
    -webkit-mask:linear-gradient(#fff 0 0) padding-box, linear-gradient(#fff 0 0);
    -webkit-mask-composite:xor;mask-composite:exclude;
    pointer-events:none;z-index:-1;
  `;
  mpOrbWrap.appendChild(mpRingOuter2);

  // Tick marks (8 radial lines)
  for (let t = 0; t < 8; t++) {
    const tick = document.createElement("div");
    tick.style.cssText = `
      position:absolute;width:2px;height:10px;
      background:linear-gradient(180deg, #7a8ac8, rgba(74,90,139,0.3));
      top:50%;left:50%;transform-origin:0 0;
      transform:rotate(${t * 45}deg) translate(-1px, -72px);
      pointer-events:none;z-index:6;
    `;
    mpOrbWrap.appendChild(tick);
  }

  // Arcane energy particles effect
  const mpArcaneParticles = document.createElement("div");
  mpArcaneParticles.style.cssText = `
    position:absolute;top:6px;left:50%;transform:translateX(-50%);z-index:7;
    width:4px;height:4px;border-radius:50%;
    background:rgba(120,100,255,0.8);
    animation:hud-arcane-particles 3s ease-in-out infinite;
    pointer-events:none;
  `;
  mpOrbWrap.appendChild(mpArcaneParticles);

  // Chain link decoration connecting to skill bar
  const mpChain = document.createElement("div");
  mpChain.style.cssText = `
    position:absolute;bottom:-18px;left:50%;transform:translateX(-50%);z-index:6;
    width:8px;height:20px;pointer-events:none;
    background:repeating-linear-gradient(180deg, #4a5a8b 0px, #7a8ac8 2px, #4a5a8b 4px, transparent 4px, transparent 6px);
    border-radius:2px;
    filter:drop-shadow(0 1px 2px rgba(0,0,0,0.6));
  `;
  mpOrbWrap.appendChild(mpChain);

  // Bottom rune ornament
  const mpBottomOrnament = document.createElement("div");
  mpBottomOrnament.style.cssText = `
    position:absolute;bottom:-10px;left:50%;transform:translateX(-50%);z-index:8;
    font-size:16px;color:#7a8ac8;pointer-events:none;
    filter:drop-shadow(0 1px 3px rgba(0,0,0,0.8));
    text-shadow:0 0 6px rgba(100,120,200,0.4);
  `;
  mpBottomOrnament.textContent = "\u25C6";
  mpOrbWrap.appendChild(mpBottomOrnament);

  // Rotating arcane rune ring (slow reverse spin)
  const mpRuneRing = document.createElement("div");
  mpRuneRing.style.cssText = `
    position:absolute;width:158px;height:158px;border-radius:50%;
    top:50%;left:50%;transform-origin:center center;
    animation:hud-orb-rune-spin 25s linear infinite reverse;
    pointer-events:none;z-index:0;
  `;
  const mpRuneChars = ["\u16A2", "\u16B7", "\u16C7", "\u16D6", "\u16AA", "\u16CF"];
  for (let r = 0; r < 6; r++) {
    const rune = document.createElement("div");
    const angle = (r / 6) * 360;
    rune.style.cssText = `
      position:absolute;width:16px;height:16px;
      top:50%;left:50%;font-size:11px;color:rgba(100,120,200,0.35);
      text-shadow:0 0 4px rgba(100,120,200,0.2);
      transform-origin:0 0;transform:rotate(${angle}deg) translate(0, -79px) rotate(-${angle}deg) translate(-8px,-8px);
      text-align:center;line-height:16px;
      font-family:'Segoe UI Symbol','Apple Symbols',sans-serif;
    `;
    rune.textContent = mpRuneChars[r];
    mpRuneRing.appendChild(rune);
  }
  mpOrbWrap.appendChild(mpRuneRing);

  // Outer glow ring (subtle blue ambient)
  const mpAmbientGlow = document.createElement("div");
  mpAmbientGlow.style.cssText = `
    position:absolute;width:160px;height:160px;border-radius:50%;
    top:50%;left:50%;transform:translate(-50%,-50%);
    box-shadow:0 0 20px rgba(30,30,200,0.2), 0 0 40px rgba(30,30,200,0.1);
    pointer-events:none;z-index:-2;
    animation:hud-orb-inner-pulse 3.5s ease-in-out infinite;
  `;
  mpOrbWrap.appendChild(mpAmbientGlow);

  hud.appendChild(mpOrbWrap);

  // Skill bar - bottom center (ornate stone bar)
  const skillBarBg = document.createElement("div");
  skillBarBg.style.cssText = `
    position:absolute;bottom:14px;left:50%;transform:translateX(-50%);
    padding:10px 14px;display:flex;gap:6px;
    background:linear-gradient(180deg, rgba(35,28,18,0.95), rgba(18,14,8,0.97), rgba(28,22,14,0.95));
    border:2px solid #7a6a3a;border-radius:8px;
    box-shadow:0 3px 12px rgba(0,0,0,0.6), inset 0 1px 0 rgba(200,168,78,0.15),
      0 0 1px rgba(200,168,78,0.2), 0 -2px 10px rgba(200,168,78,0.05);
    animation:hud-bar-breathe 4s ease-in-out infinite;
  `;
  // Left end-cap ornament
  const skillCapL = document.createElement("div");
  skillCapL.style.cssText = `
    position:absolute;left:-10px;top:50%;transform:translateY(-50%);
    font-size:20px;color:#c8a84e;filter:drop-shadow(0 0 4px rgba(200,168,78,0.4));
    pointer-events:none;
  `;
  skillCapL.textContent = "\uD83D\uDDFF";
  skillBarBg.appendChild(skillCapL);
  // Right end-cap ornament (gargoyle)
  const skillCapR = document.createElement("div");
  skillCapR.style.cssText = `
    position:absolute;right:-14px;top:50%;transform:translateY(-50%) scaleX(-1);
    font-size:20px;color:#c8a84e;filter:drop-shadow(0 0 4px rgba(200,168,78,0.4));
    pointer-events:none;
  `;
  skillCapR.textContent = "\uD83D\uDDFF";
  skillBarBg.appendChild(skillCapR);

  // Top decorative border strip (gothic repeating pattern via box-shadow)
  const skillTopBorder = document.createElement("div");
  skillTopBorder.style.cssText = `
    position:absolute;top:-6px;left:10px;right:10px;height:4px;pointer-events:none;
    background:linear-gradient(90deg, transparent, #c8a84e, #e8d07a, #c8a84e, transparent);
    box-shadow:0 -2px 0 rgba(139,105,20,0.4),
      -20px -4px 0 1px rgba(200,168,78,0.15), 0px -4px 0 1px rgba(200,168,78,0.2), 20px -4px 0 1px rgba(200,168,78,0.15),
      -40px -4px 0 1px rgba(200,168,78,0.1), 40px -4px 0 1px rgba(200,168,78,0.1);
    z-index:10;
  `;
  skillBarBg.appendChild(skillTopBorder);

  // Bottom shadow/depth strip for 3D beveled effect
  const skillBottomStrip = document.createElement("div");
  skillBottomStrip.style.cssText = `
    position:absolute;bottom:-4px;left:4px;right:4px;height:4px;pointer-events:none;
    background:linear-gradient(180deg, rgba(0,0,0,0.4), rgba(0,0,0,0.1));
    border-radius:0 0 8px 8px;z-index:10;
  `;
  skillBarBg.appendChild(skillBottomStrip);

  // Runic inscription strip below skill bar
  const runicStrip = document.createElement("div");
  runicStrip.style.cssText = `
    position:absolute;bottom:-16px;left:20px;right:20px;height:12px;pointer-events:none;
    text-align:center;font-size:8px;letter-spacing:3px;
    color:rgba(200,168,78,0.35);z-index:10;
    font-family:'Cinzel','Palatino Linotype','Book Antiqua',Georgia,serif;
    text-shadow:0 0 4px rgba(200,168,78,0.15);
  `;
  runicStrip.textContent = "\u16A0 \u16B1 \u16C1 \u16A2 \u16B3 \u16C7 \u16A8 \u16B7 \u16C9 \u16AA";
  skillBarBg.appendChild(runicStrip);

  const skillBarGlow = document.createElement("div");
  skillBarGlow.style.cssText = `
    position:absolute;bottom:-8px;left:10%;right:10%;height:8px;pointer-events:none;
    background:radial-gradient(ellipse at center, rgba(200,168,78,0.15), transparent);
    filter:blur(4px);z-index:-1;
  `;
  skillBarBg.appendChild(skillBarGlow);

  const skillSlots: HTMLDivElement[] = [];
  const skillCooldownOverlays: HTMLDivElement[] = [];
  for (let i = 0; i < 6; i++) {
    const slotWrap = document.createElement("div");
    slotWrap.style.cssText = `
      position:relative;width:66px;height:66px;
    `;
    const slot = document.createElement("div");
    slot.style.cssText = `
      width:66px;height:66px;
      background:linear-gradient(180deg, rgba(20,28,15,0.95), rgba(8,14,4,0.97));
      border:2px solid #8a7a4a;border-radius:6px;display:flex;flex-direction:column;
      align-items:center;justify-content:center;position:relative;overflow:hidden;
      box-shadow:inset 0 1px 0 rgba(255,255,255,0.08), inset 0 -1px 0 rgba(0,0,0,0.4),
        0 3px 10px rgba(0,0,0,0.7), 0 0 1px rgba(200,168,78,0.25);
    `;
    // Ornate frame corners on each slot
    const cornerDeco = document.createElement("div");
    cornerDeco.style.cssText = `
      position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:4;
      border-radius:8px;
      box-shadow:inset 2px 2px 0 rgba(200,168,78,0.15), inset -2px -2px 0 rgba(200,168,78,0.1);
    `;

    const cdOverlay = document.createElement("div");
    cdOverlay.style.cssText = `
      position:absolute;top:0;left:0;width:100%;height:0%;
      background:linear-gradient(180deg, rgba(0,0,0,0.75), rgba(10,5,0,0.6) 80%, rgba(60,40,10,0.2));
      transition:height 0.1s;pointer-events:none;
      border-bottom:1px solid rgba(200,168,78,0.25);
    `;

    const cdText = document.createElement("div");
    cdText.style.cssText = `
      position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);
      font-size:18px;font-weight:bold;color:#fff;z-index:3;
      text-shadow:0 0 4px #000,0 0 8px #000;pointer-events:none;display:none;
    `;
    cdText.className = "skill-cd-text";

    const keyLabel = document.createElement("div");
    keyLabel.style.cssText = `
      position:absolute;bottom:2px;right:4px;font-size:13px;color:#9a8a5a;z-index:2;text-shadow:0 1px 2px rgba(0,0,0,0.6);
      font-family:'Cinzel','Palatino Linotype','Book Antiqua',Georgia,serif;
    `;
    keyLabel.textContent = String(i + 1);

    const iconEl = document.createElement("div");
    iconEl.style.cssText = "position:absolute;top:0;left:0;width:100%;height:100%;z-index:1;";
    iconEl.className = "skill-icon";

    // Inner bevel highlight (raised stone look)
    const innerBevel = document.createElement("div");
    innerBevel.style.cssText = `
      position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:5;
      border-radius:6px;
      border-top:1px solid rgba(200,180,120,0.25);
      border-left:1px solid rgba(200,180,120,0.2);
      border-bottom:1px solid rgba(0,0,0,0.5);
      border-right:1px solid rgba(0,0,0,0.4);
    `;

    slot.appendChild(cdOverlay);
    slot.appendChild(iconEl);
    slot.appendChild(cdText);
    slot.appendChild(keyLabel);
    slot.appendChild(cornerDeco);
    slot.appendChild(innerBevel);
    slotWrap.appendChild(slot);

    // Divider line between slots (not after last one)
    if (i < 5) {
      const divider = document.createElement("div");
      divider.style.cssText = `
        position:absolute;right:-4px;top:4px;bottom:4px;width:2px;pointer-events:none;z-index:6;
        background:linear-gradient(180deg, transparent, #c8a84e, #e8d07a, #c8a84e, transparent);
        box-shadow:0 0 4px rgba(200,168,78,0.3);
      `;
      slotWrap.appendChild(divider);
    }

    skillBarBg.appendChild(slotWrap);
    skillSlots.push(slot);
    skillCooldownOverlays.push(cdOverlay);
  }
  hud.appendChild(skillBarBg);

  // === Skeleton figurehead on left side of top-right panel ===
  const figurehead = document.createElement("div");
  figurehead.style.cssText = `
    position:absolute;top:12px;right:190px;
    width:70px;height:110px;pointer-events:none;z-index:11;
    filter:drop-shadow(2px 2px 4px rgba(0,0,0,0.7));
    transform:scaleX(-1);
  `;
  figurehead.innerHTML = `<svg viewBox="0 0 80 120" style="width:100%;height:100%;" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="fhBone" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#d4c8a8"/><stop offset="100%" stop-color="#a89870"/></linearGradient>
      <linearGradient id="fhDark" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#8a7a60"/><stop offset="100%" stop-color="#5a4a30"/></linearGradient>
    </defs>
    <!-- Arm bone (horizontal spar) -->
    <path d="M 22 52 Q 40 50 50 48 Q 54 48 54 52 Q 54 56 50 56 Q 40 56 22 54 Z" fill="url(#fhBone)" stroke="#8a7a60" stroke-width="0.8"/>
    <!-- Shoulder joint -->
    <circle cx="22" cy="53" r="4" fill="#c4b898" stroke="#8a7a60" stroke-width="0.8"/>
    <!-- Sternum (breastbone) -->
    <path d="M 22 56 L 22 82" fill="none" stroke="url(#fhBone)" stroke-width="2.5" stroke-linecap="round"/>
    <!-- Spine (behind sternum) -->
    <path d="M 22 56 L 22 90" fill="none" stroke="#9a8a68" stroke-width="1.8" opacity="0.5"/>
    <!-- Spine vertebrae bumps -->
    <circle cx="22" cy="58" r="1.2" fill="#b8a880" opacity="0.5"/>
    <circle cx="22" cy="63" r="1.2" fill="#b8a880" opacity="0.5"/>
    <circle cx="22" cy="68" r="1.2" fill="#b8a880" opacity="0.5"/>
    <circle cx="22" cy="73" r="1.2" fill="#b8a880" opacity="0.5"/>
    <circle cx="22" cy="78" r="1.2" fill="#b8a880" opacity="0.5"/>
    <circle cx="22" cy="83" r="1.2" fill="#b8a880" opacity="0.5"/>
    <!-- Clavicles (collarbones) -->
    <path d="M 22 56 Q 16 54 10 56" fill="none" stroke="url(#fhBone)" stroke-width="2" stroke-linecap="round"/>
    <path d="M 22 56 Q 28 54 34 56" fill="none" stroke="url(#fhBone)" stroke-width="2" stroke-linecap="round"/>
    <!-- Ribs - left side (curving out from spine) -->
    <path d="M 22 59 Q 16 57 10 60 Q 7 63 10 65 Q 16 63 22 61" fill="none" stroke="url(#fhBone)" stroke-width="1.8" stroke-linecap="round"/>
    <path d="M 22 64 Q 15 62 9 65 Q 6 68 9 70 Q 15 68 22 66" fill="none" stroke="url(#fhBone)" stroke-width="1.8" stroke-linecap="round"/>
    <path d="M 22 69 Q 15 67 10 70 Q 7 73 10 75 Q 15 73 22 71" fill="none" stroke="url(#fhBone)" stroke-width="1.6" stroke-linecap="round"/>
    <path d="M 22 74 Q 16 72 12 75 Q 10 77 13 79 Q 17 77 22 76" fill="none" stroke="url(#fhBone)" stroke-width="1.4" stroke-linecap="round"/>
    <path d="M 22 78 Q 17 77 14 79 Q 13 81 15 82 Q 18 81 22 80" fill="none" stroke="url(#fhBone)" stroke-width="1.2" stroke-linecap="round" opacity="0.8"/>
    <!-- Ribs - right side (curving out from spine) -->
    <path d="M 22 59 Q 28 57 34 60 Q 37 63 34 65 Q 28 63 22 61" fill="none" stroke="url(#fhBone)" stroke-width="1.8" stroke-linecap="round"/>
    <path d="M 22 64 Q 29 62 35 65 Q 38 68 35 70 Q 29 68 22 66" fill="none" stroke="url(#fhBone)" stroke-width="1.8" stroke-linecap="round"/>
    <path d="M 22 69 Q 29 67 34 70 Q 37 73 34 75 Q 29 73 22 71" fill="none" stroke="url(#fhBone)" stroke-width="1.6" stroke-linecap="round"/>
    <path d="M 22 74 Q 28 72 32 75 Q 34 77 31 79 Q 27 77 22 76" fill="none" stroke="url(#fhBone)" stroke-width="1.4" stroke-linecap="round"/>
    <path d="M 22 78 Q 27 77 30 79 Q 31 81 29 82 Q 26 81 22 80" fill="none" stroke="url(#fhBone)" stroke-width="1.2" stroke-linecap="round" opacity="0.8"/>
    <!-- Skull -->
    <ellipse cx="22" cy="40" rx="12" ry="14" fill="url(#fhBone)" stroke="#8a7a60" stroke-width="1"/>
    <!-- Skull top (cranium) -->
    <ellipse cx="22" cy="35" rx="11" ry="10" fill="#d4c8a8" stroke="#a89870" stroke-width="0.5"/>
    <!-- Brow ridge -->
    <path d="M 12 38 Q 17 35 22 37 Q 27 35 32 38" fill="none" stroke="#8a7a60" stroke-width="1.5" stroke-linecap="round"/>
    <!-- Eye sockets (deep, dark) -->
    <ellipse cx="17" cy="40" rx="4" ry="3.5" fill="#1a1208"/>
    <ellipse cx="27" cy="40" rx="4" ry="3.5" fill="#1a1208"/>
    <!-- Eye glow (faint red) -->
    <ellipse cx="17" cy="40" rx="2" ry="1.5" fill="#661111" opacity="0.6"/>
    <ellipse cx="27" cy="40" rx="2" ry="1.5" fill="#661111" opacity="0.6"/>
    <ellipse cx="17" cy="40" rx="0.8" ry="0.6" fill="#cc3333" opacity="0.4"/>
    <ellipse cx="27" cy="40" rx="0.8" ry="0.6" fill="#cc3333" opacity="0.4"/>
    <!-- Nasal cavity -->
    <path d="M 20 44 Q 22 47 24 44" fill="#2a1a0a" stroke="#5a4a30" stroke-width="0.5"/>
    <!-- Jaw -->
    <path d="M 12 48 Q 14 52 22 53 Q 30 52 32 48" fill="url(#fhDark)" stroke="#8a7a60" stroke-width="0.8"/>
    <!-- Teeth (upper) -->
    <path d="M 15 48 L 15 50 M 17 48 L 17 50.5 M 19 48 L 19 50.5 M 21 48 L 21 50 M 23 48 L 23 50.5 M 25 48 L 25 50.5 M 27 48 L 27 50 M 29 48 L 29 50" fill="none" stroke="#d4c8a8" stroke-width="0.8"/>
    <!-- Cheekbones -->
    <path d="M 10 42 Q 12 44 14 44" fill="none" stroke="#a89870" stroke-width="0.8" opacity="0.5"/>
    <path d="M 34 42 Q 32 44 30 44" fill="none" stroke="#a89870" stroke-width="0.8" opacity="0.5"/>
    <!-- Pelvis / hip bones (bottom) -->
    <path d="M 14 88 Q 10 92 8 98 Q 6 102 10 104 Q 14 102 18 96 Z" fill="url(#fhBone)" stroke="#8a7a60" stroke-width="0.6"/>
    <path d="M 30 88 Q 34 92 36 98 Q 38 102 34 104 Q 30 102 26 96 Z" fill="url(#fhBone)" stroke="#8a7a60" stroke-width="0.6"/>
    <!-- Dangling leg bones -->
    <path d="M 12 102 Q 10 108 8 116" fill="none" stroke="url(#fhBone)" stroke-width="2.5" stroke-linecap="round"/>
    <path d="M 32 102 Q 34 108 36 116" fill="none" stroke="url(#fhBone)" stroke-width="2.5" stroke-linecap="round"/>
    <!-- Free arm (left, dangling down) -->
    <path d="M 14 56 Q 6 64 4 76 Q 2 86 6 90" fill="none" stroke="url(#fhBone)" stroke-width="2.5" stroke-linecap="round"/>
    <!-- Hanging hand bones -->
    <path d="M 6 90 L 4 94 M 6 90 L 6 95 M 6 90 L 8 94" fill="none" stroke="#c4b898" stroke-width="1" stroke-linecap="round"/>
    <!-- Tattered cloth hanging from ribs -->
    <path d="M 10 65 Q 4 75 6 88 Q 2 92 4 96" fill="none" stroke="#3a3020" stroke-width="1.5" opacity="0.4"/>
    <path d="M 34 65 Q 38 78 36 90" fill="none" stroke="#3a3020" stroke-width="1.2" opacity="0.35"/>
  </svg>`;
  hud.appendChild(figurehead);

  // XP bar - very bottom (ornate, enhanced)
  const xpContainer = document.createElement("div");
  xpContainer.style.cssText = `
    position:absolute;bottom:0;left:0;width:100%;height:18px;
    background:linear-gradient(180deg, rgba(30,22,8,0.95), rgba(15,10,3,0.95));
    border-top:2px solid rgba(200,168,78,0.4);
    box-shadow:inset 0 1px 3px rgba(0,0,0,0.5);
  `;
  // Gothic-style repeating peaks border on top
  const xpGothicBorder = document.createElement("div");
  xpGothicBorder.style.cssText = `
    position:absolute;top:-6px;left:0;right:0;height:4px;pointer-events:none;z-index:4;
    background:repeating-linear-gradient(90deg,
      transparent 0px, transparent 8px,
      rgba(200,168,78,0.3) 8px, rgba(200,168,78,0.3) 10px,
      transparent 10px, transparent 18px);
  `;
  xpContainer.appendChild(xpGothicBorder);
  // Filigree left end-cap (wider ornamental)
  const xpCapL = document.createElement("div");
  xpCapL.style.cssText = `
    position:absolute;left:2px;top:50%;transform:translateY(-50%);z-index:3;
    font-size:14px;color:#c8a84e;pointer-events:none;
    filter:drop-shadow(0 0 3px rgba(200,168,78,0.4));
  `;
  xpCapL.textContent = "\u2761\u25C0";
  xpContainer.appendChild(xpCapL);
  // Filigree right end-cap
  const xpCapR = document.createElement("div");
  xpCapR.style.cssText = `
    position:absolute;right:2px;top:50%;transform:translateY(-50%);z-index:3;
    font-size:14px;color:#c8a84e;pointer-events:none;
    filter:drop-shadow(0 0 3px rgba(200,168,78,0.4));
  `;
  xpCapR.textContent = "\u25B6\u2761";
  xpContainer.appendChild(xpCapR);
  // Segment marks every 10%
  for (let s = 1; s < 10; s++) {
    const seg = document.createElement("div");
    seg.style.cssText = `
      position:absolute;left:${s * 10}%;top:2px;bottom:2px;width:1px;z-index:2;
      background:linear-gradient(180deg, rgba(200,168,78,0.5), rgba(200,168,78,0.15));
      pointer-events:none;
    `;
    xpContainer.appendChild(seg);
  }
  const xpBar = document.createElement("div");
  xpBar.style.cssText = `
    height:100%;width:0%;
    background:linear-gradient(90deg,#6b5500,#ffd700,#fff4aa,#ffd700,#6b5500);
    background-size:200% 100%;
    animation:hud-xp-shimmer 3s linear infinite;
    transition:width 0.3s;
    box-shadow:0 0 10px rgba(255,215,0,0.5), inset 0 1px 0 rgba(255,255,255,0.3);
  `;
  xpContainer.appendChild(xpBar);
  // Level indicator text embedded in bar
  const xpLevelText = document.createElement("div");
  xpLevelText.style.cssText = `
    position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);z-index:3;
    font-size:10px;color:#e8d07a;font-weight:bold;pointer-events:none;
    text-shadow:0 0 4px rgba(0,0,0,0.9), 0 1px 2px rgba(0,0,0,0.8);
    font-family:'Cinzel','Palatino Linotype','Book Antiqua',Georgia,serif;
    letter-spacing:1px;
  `;
  xpContainer.appendChild(xpLevelText);
  hud.appendChild(xpContainer);

  // Top right info (parchment panel, enhanced)
  const topRight = document.createElement("div");
  topRight.style.cssText = `
    position:absolute;top:16px;right:20px;text-align:right;
    background:linear-gradient(180deg, rgba(35,28,15,0.9), rgba(20,15,8,0.92), rgba(30,24,12,0.9));
    border:2px solid #7a6a3a;border-radius:8px;
    padding:14px 18px;min-width:160px;
    box-shadow:0 4px 12px rgba(0,0,0,0.5), inset 0 1px 0 rgba(200,168,78,0.15),
      inset 0 -1px 0 rgba(0,0,0,0.3), 0 0 1px rgba(200,168,78,0.2),
      inset 0 0 0 1px rgba(200,168,78,0.08), 0 0 0 1px rgba(0,0,0,0.3);
    transition:border-color 0.3s, box-shadow 0.3s;
  `;
  // Inner border
  const panelInner = document.createElement("div");
  panelInner.style.cssText = `
    position:absolute;inset:3px;border:1px solid rgba(200,168,78,0.15);border-radius:6px;pointer-events:none;
  `;
  topRight.appendChild(panelInner);
  // Corner decorations
  for (const [t, l] of [["2px","2px"],["2px","auto"],["auto","2px"],["auto","auto"]]) {
    const corner = document.createElement("div");
    const r = t === "auto" ? "bottom:2px;" : "top:2px;";
    const c = l === "auto" ? "right:2px;" : "left:2px;";
    corner.style.cssText = `position:absolute;${r}${c}color:#5a4a2a;font-size:8px;pointer-events:none;opacity:0.6;`;
    corner.textContent = "\u25C6";
    topRight.appendChild(corner);
  }
  // Top ornament for the panel
  const panelOrnament = document.createElement("div");
  panelOrnament.style.cssText = `
    position:absolute;top:-8px;left:50%;transform:translateX(-50%);
    font-size:14px;color:#c8a84e;filter:drop-shadow(0 0 3px rgba(200,168,78,0.3));
    pointer-events:none;letter-spacing:6px;
  `;
  panelOrnament.textContent = "\u2E31 \u2736 \u2E31";
  topRight.appendChild(panelOrnament);
  // Bottom ornament
  const panelBotOrn = document.createElement("div");
  panelBotOrn.style.cssText = `
    position:absolute;bottom:-6px;left:50%;transform:translateX(-50%);
    font-size:10px;color:#5a4a2a;pointer-events:none;letter-spacing:4px;
  `;
  panelBotOrn.textContent = "\u25C6 \u25C6";
  topRight.appendChild(panelBotOrn);
  const goldText = document.createElement("div");
  goldText.style.cssText = `
    font-size:20px;color:#ffd700;margin-bottom:6px;
    font-family:'Cinzel','Palatino Linotype','Book Antiqua',Georgia,serif;
    text-shadow:0 0 8px rgba(255,215,0,0.5), 0 0 16px rgba(255,215,0,0.2), 0 1px 3px rgba(0,0,0,0.9);
    letter-spacing:1px;transition:text-shadow 0.3s, transform 0.2s;
  `;
  const levelText = document.createElement("div");
  levelText.style.cssText = `
    font-size:18px;color:#c8a84e;margin-bottom:5px;
    font-family:'Cinzel','Palatino Linotype','Book Antiqua',Georgia,serif;
    text-shadow:0 0 6px rgba(200,168,78,0.3), 0 1px 2px rgba(0,0,0,0.7);
  `;
  const killText = document.createElement("div");
  killText.style.cssText = `
    font-size:15px;color:#bbb;
    font-family:'Cinzel','Palatino Linotype','Book Antiqua',Georgia,serif;
    text-shadow:0 1px 2px rgba(0,0,0,0.6);
  `;
  topRight.appendChild(goldText);

  // Separator between gold and level
  const sep1 = document.createElement("div");
  sep1.style.cssText = `
    width:100%;height:1px;margin:4px 0;pointer-events:none;
    background:linear-gradient(90deg, transparent, rgba(200,168,78,0.4), rgba(200,168,78,0.6), rgba(200,168,78,0.4), transparent);
  `;
  topRight.appendChild(sep1);

  topRight.appendChild(levelText);

  // Separator between level and kills
  const sep2 = document.createElement("div");
  sep2.style.cssText = `
    width:100%;height:1px;margin:4px 0;pointer-events:none;
    background:linear-gradient(90deg, transparent, rgba(200,168,78,0.3), rgba(200,168,78,0.5), rgba(200,168,78,0.3), transparent);
  `;
  topRight.appendChild(sep2);

  topRight.appendChild(killText);

  // Corner metal brackets (L-shaped gold corners)
  const bracketPositions = [
    { top: "3px", left: "3px", borderSides: "border-top:2px solid #c8a84e;border-left:2px solid #c8a84e;" },
    { top: "3px", right: "3px", borderSides: "border-top:2px solid #c8a84e;border-right:2px solid #c8a84e;" },
    { bottom: "3px", left: "3px", borderSides: "border-bottom:2px solid #c8a84e;border-left:2px solid #c8a84e;" },
    { bottom: "3px", right: "3px", borderSides: "border-bottom:2px solid #c8a84e;border-right:2px solid #c8a84e;" },
  ];
  for (const bp of bracketPositions) {
    const bracket = document.createElement("div");
    let bStyle = `position:absolute;width:12px;height:12px;pointer-events:none;z-index:5;${bp.borderSides}`;
    if (bp.top) bStyle += `top:${bp.top};`;
    if (bp.bottom) bStyle += `bottom:${bp.bottom};`;
    if (bp.left) bStyle += `left:${bp.left};`;
    if (bp.right) bStyle += `right:${bp.right};`;
    bracket.style.cssText = bStyle;
    topRight.appendChild(bracket);
  }

  // Wax seal decoration at the bottom
  const waxSeal = document.createElement("div");
  waxSeal.style.cssText = `
    position:absolute;bottom:-12px;left:50%;transform:translateX(-50%);z-index:6;
    width:24px;height:24px;border-radius:50%;pointer-events:none;
    background:radial-gradient(circle at 40% 35%, #cc3333, #8b1a1a, #5a0a0a);
    box-shadow:0 1px 4px rgba(0,0,0,0.6), inset 0 1px 2px rgba(255,100,100,0.3);
    display:flex;align-items:center;justify-content:center;
    font-size:12px;color:rgba(180,40,40,0.8);text-shadow:0 0 2px rgba(0,0,0,0.4);
  `;
  waxSeal.textContent = "\u2605";
  topRight.appendChild(waxSeal);

  hud.appendChild(topRight);

  // Loot pickup log (fading entries, right side below top-right panel)
  const lootLog = document.createElement("div");
  lootLog.style.cssText = `
    position:absolute;top:170px;right:20px;width:220px;
    display:flex;flex-direction:column;gap:2px;
    pointer-events:none;z-index:8;
  `;
  hud.appendChild(lootLog);


  // Minimap canvas - top-left corner (ornate frame)
  const minimapWrap = document.createElement("div");
  minimapWrap.style.cssText = `
    position:absolute;top:12px;left:12px;width:216px;height:216px;
    display:flex;align-items:center;justify-content:center;
  `;
  // Ornate outer frame
  const mmFrame = document.createElement("div");
  mmFrame.style.cssText = `
    position:absolute;width:216px;height:216px;border-radius:6px;
    border:3px solid transparent;pointer-events:none;
    background:linear-gradient(135deg, #8b6914, #c8a84e, #e8d07a, #c8a84e, #8b6914) border-box;
    -webkit-mask:linear-gradient(#fff 0 0) padding-box, linear-gradient(#fff 0 0);
    -webkit-mask-composite:xor;mask-composite:exclude;
    box-shadow:0 0 8px rgba(200,168,78,0.3);
  `;
  minimapWrap.appendChild(mmFrame);
  // Inner thick border
  const mmInner = document.createElement("div");
  mmInner.style.cssText = `
    position:absolute;width:208px;height:208px;border-radius:4px;
    border:2px solid rgba(40,30,10,0.9);pointer-events:none;
    box-shadow:inset 0 0 6px rgba(0,0,0,0.5);
  `;
  minimapWrap.appendChild(mmInner);
  // Corner rivets (small gold circles)
  const mmCorners = [
    { top: "-5px", left: "-5px" },
    { top: "-5px", right: "-5px" },
    { bottom: "-5px", left: "-5px" },
    { bottom: "-5px", right: "-5px" },
  ];
  for (const pos of mmCorners) {
    const c = document.createElement("div");
    let cStyle = `position:absolute;width:10px;height:10px;border-radius:50%;z-index:3;pointer-events:none;
      background:radial-gradient(circle at 35% 35%, #e8d07a, #c8a84e, #8b6914);
      box-shadow:0 1px 3px rgba(0,0,0,0.6), inset 0 1px 1px rgba(255,255,200,0.3);`;
    if (pos.top) cStyle += `top:${pos.top};`;
    if (pos.bottom) cStyle += `bottom:${pos.bottom};`;
    if (pos.left) cStyle += `left:${pos.left};`;
    if (pos.right) cStyle += `right:${pos.right};`;
    c.style.cssText = cStyle;
    minimapWrap.appendChild(c);
  }

  // Chain/rope edge effect around minimap frame
  const mmChainEdge = document.createElement("div");
  mmChainEdge.style.cssText = `
    position:absolute;width:222px;height:222px;border-radius:6px;pointer-events:none;z-index:1;
    top:50%;left:50%;transform:translate(-50%,-50%);
    box-shadow:
      inset 3px 0 0 -1px rgba(139,105,20,0.25), inset -3px 0 0 -1px rgba(139,105,20,0.25),
      inset 0 3px 0 -1px rgba(139,105,20,0.25), inset 0 -3px 0 -1px rgba(139,105,20,0.25),
      3px 0 0 -1px rgba(139,105,20,0.15), -3px 0 0 -1px rgba(139,105,20,0.15),
      0 3px 0 -1px rgba(139,105,20,0.15), 0 -3px 0 -1px rgba(139,105,20,0.15);
  `;
  minimapWrap.appendChild(mmChainEdge);

  // 4 compass point labels (N, S, E, W)
  const compassLabels = [
    { label: "N", top: "-2px", left: "50%", extra: "transform:translateX(-50%);" },
    { label: "S", bottom: "-2px", left: "50%", extra: "transform:translateX(-50%);" },
    { label: "E", right: "-1px", top: "50%", extra: "transform:translateY(-50%);" },
    { label: "W", left: "1px", top: "50%", extra: "transform:translateY(-50%);" },
  ];
  for (const cl of compassLabels) {
    const lbl = document.createElement("div");
    let lStyle = `position:absolute;z-index:4;font-size:11px;color:#e8d07a;font-weight:bold;pointer-events:none;
      text-shadow:0 0 4px rgba(0,0,0,0.9), 0 0 8px rgba(200,168,78,0.3);
      font-family:'Cinzel','Palatino Linotype','Book Antiqua',Georgia,serif;`;
    if (cl.top) lStyle += `top:${cl.top};`;
    if (cl.bottom) lStyle += `bottom:${cl.bottom};`;
    if (cl.left) lStyle += `left:${cl.left};`;
    if (cl.right) lStyle += `right:${cl.right};`;
    if (cl.extra) lStyle += cl.extra;
    lbl.style.cssText = lStyle;
    lbl.textContent = cl.label;
    minimapWrap.appendChild(lbl);
  }

  // Rotating compass needle overlay
  const compassNeedle = document.createElement("div");
  compassNeedle.style.cssText = `
    position:absolute;top:50%;left:50%;z-index:5;pointer-events:none;
    width:2px;height:20px;
    background:linear-gradient(180deg, #cc2222 0%, #cc2222 50%, #cccccc 50%, #cccccc 100%);
    transform-origin:center center;
    animation:hud-compass-spin 30s linear infinite;
    transform:translate(-50%,-50%) rotate(0deg);
    opacity:0.6;
  `;
  minimapWrap.appendChild(compassNeedle);

  // Parchment texture background behind the map canvas
  const mmParchment = document.createElement("div");
  mmParchment.style.cssText = `
    position:absolute;width:204px;height:204px;border-radius:3px;pointer-events:none;z-index:0;
    background:
      radial-gradient(ellipse at 20% 20%, rgba(180,160,120,0.08), transparent 50%),
      radial-gradient(ellipse at 80% 80%, rgba(160,140,100,0.06), transparent 50%),
      radial-gradient(ellipse at 50% 50%, rgba(140,120,80,0.04), transparent 70%),
      linear-gradient(180deg, rgba(120,100,60,0.05), rgba(80,60,30,0.08));
  `;
  minimapWrap.appendChild(mmParchment);

  const minimapCanvas = document.createElement("canvas");
  minimapCanvas.width = 200;
  minimapCanvas.height = 200;
  minimapCanvas.style.cssText = `
    width:200px;height:200px;border-radius:3px;background:rgba(0,0,0,0.6);
    box-shadow:inset 0 0 10px rgba(0,0,0,0.4);z-index:1;position:relative;
  `;
  const minimapCtx = minimapCanvas.getContext("2d")!;
  minimapWrap.appendChild(minimapCanvas);
  hud.appendChild(minimapWrap);

  // DPS meter
  const dpsMeter = document.createElement("div");
  dpsMeter.style.cssText = `
    position:absolute;top:270px;left:16px;
    font-size:12px;color:#ffcc44;font-family:'Georgia',serif;
    text-shadow:0 0 4px rgba(0,0,0,0.8), 0 1px 2px rgba(0,0,0,0.9);
    pointer-events:none;letter-spacing:1px;opacity:0.8;
  `;
  hud.appendChild(dpsMeter);

  // Dedicated map name label below minimap
  const mapNameLabel = document.createElement("div");
  mapNameLabel.style.cssText = `
    position:absolute;top:234px;left:12px;width:216px;text-align:center;
    font-size:13px;color:#e8d07a;font-weight:bold;
    font-family:'Cinzel','Palatino Linotype','Book Antiqua',Georgia,serif;
    text-shadow:0 0 6px rgba(200,168,78,0.3), 0 1px 3px rgba(0,0,0,0.8);
    background:linear-gradient(90deg, transparent, rgba(25,20,10,0.7), transparent);
    padding:3px 0;letter-spacing:1px;pointer-events:none;
  `;
  hud.appendChild(mapNameLabel);

  // Fullscreen map overlay
  const fullmapCanvas = document.createElement("canvas");
  fullmapCanvas.width = 400;
  fullmapCanvas.height = 400;
  fullmapCanvas.style.cssText = `
    position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:400px;height:400px;
    border:3px solid #c8a84e;border-radius:8px;background:rgba(0,0,0,0.85);
    display:none;z-index:5;
  `;
  const fullmapCtx = fullmapCanvas.getContext("2d")!;
  hud.appendChild(fullmapCanvas);

  // Weather text - ornate
  const weatherText = document.createElement("div");
  weatherText.style.cssText = `
    position:absolute;top:258px;left:12px;width:216px;text-align:center;
    font-size:12px;color:#b8a878;
    font-family:'Cinzel','Palatino Linotype','Book Antiqua',Georgia,serif;
    text-shadow:0 1px 3px rgba(0,0,0,0.7);
    background:linear-gradient(90deg, transparent, rgba(20,16,8,0.6), transparent);
    padding:2px 0;letter-spacing:0.5px;
  `;
  hud.appendChild(weatherText);

  // Potion bar - ornate, enhanced with flask shapes
  const potionBarBg = document.createElement("div");
  potionBarBg.style.cssText = `
    position:absolute;bottom:22px;left:50%;transform:translateX(320px);display:flex;gap:6px;
    background:linear-gradient(180deg, rgba(35,28,18,0.95), rgba(18,14,8,0.97), rgba(28,22,14,0.95));
    border:2px solid #7a6a3a;border-radius:8px;padding:8px 12px;
    box-shadow:0 3px 12px rgba(0,0,0,0.6), inset 0 1px 0 rgba(200,168,78,0.15),
      0 0 1px rgba(200,168,78,0.2), 0 -2px 10px rgba(200,168,78,0.05);
  `;

  // Wooden rack background (horizontal wood grain lines)
  const woodenRack = document.createElement("div");
  woodenRack.style.cssText = `
    position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:0;
    border-radius:6px;overflow:hidden;
    background:repeating-linear-gradient(0deg,
      transparent 0px, transparent 6px,
      rgba(90,60,20,0.08) 6px, rgba(90,60,20,0.08) 7px,
      transparent 7px, transparent 13px,
      rgba(70,45,15,0.06) 13px, rgba(70,45,15,0.06) 14px);
  `;
  potionBarBg.appendChild(woodenRack);

  const potionHudSlots: HTMLDivElement[] = [];
  const potionLabels = ["F1", "F2", "F3", "F4"];
  const potionColors = [
    { fill: "rgba(200,40,40,0.55)", glow: "rgba(200,40,40,0.15)", border: "#8a4a4a" },
    { fill: "rgba(60,60,220,0.55)", glow: "rgba(60,60,220,0.15)", border: "#4a4a8a" },
    { fill: "rgba(40,180,40,0.55)", glow: "rgba(40,180,40,0.15)", border: "#4a8a4a" },
    { fill: "rgba(200,180,40,0.55)", glow: "rgba(200,180,40,0.15)", border: "#8a7a3a" },
  ];
  for (let i = 0; i < 4; i++) {
    const pc = potionColors[i];
    const slot = document.createElement("div");
    slot.style.cssText = `
      width:58px;height:70px;background:linear-gradient(180deg, rgba(20,28,15,0.95), rgba(8,14,4,0.97));
      border:2px solid ${pc.border};display:flex;flex-direction:column;
      align-items:center;justify-content:center;position:relative;overflow:hidden;
      border-radius:6px 6px 10px 10px;
      box-shadow:inset 0 1px 0 rgba(255,255,255,0.08), inset 0 -1px 0 rgba(0,0,0,0.3),
        0 2px 6px rgba(0,0,0,0.4), 0 0 8px ${pc.glow};
    `;

    // Flask neck (narrower top section with smooth border-radius)
    const neck = document.createElement("div");
    neck.style.cssText = `
      position:absolute;top:0;left:50%;transform:translateX(-50%);z-index:3;
      width:24px;height:16px;pointer-events:none;
      background:linear-gradient(180deg, rgba(20,28,15,0.95), rgba(15,22,10,0.95));
      border-left:2px solid ${pc.border};border-right:2px solid ${pc.border};
      border-top:2px solid ${pc.border};
      border-radius:4px 4px 0 0;
    `;
    slot.appendChild(neck);

    // Cork/stopper
    const cork = document.createElement("div");
    cork.style.cssText = `
      position:absolute;top:-2px;left:50%;transform:translateX(-50%);z-index:5;
      width:18px;height:7px;pointer-events:none;
      background:linear-gradient(180deg, #9b8365, #7b6345, #6b5335, #7b6345);
      border-radius:3px 3px 1px 1px;
      box-shadow:0 1px 2px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.1);
    `;
    slot.appendChild(cork);

    // Liquid level indicator (colored fill from bottom, smooth)
    const liquidLevel = document.createElement("div");
    liquidLevel.style.cssText = `
      position:absolute;bottom:0;left:0;width:100%;height:60%;z-index:0;
      background:linear-gradient(0deg, ${pc.fill}, ${pc.glow}, transparent);
      pointer-events:none;transition:height 0.3s;
      border-radius:0 0 8px 8px;
    `;
    slot.appendChild(liquidLevel);

    // Liquid surface highlight
    const liquidSurface = document.createElement("div");
    liquidSurface.style.cssText = `
      position:absolute;bottom:55%;left:10%;width:80%;height:4px;z-index:1;
      background:linear-gradient(90deg, transparent, rgba(255,255,255,0.12), transparent);
      pointer-events:none;border-radius:2px;
    `;
    slot.appendChild(liquidSurface);

    // Glass shine
    const shine = document.createElement("div");
    shine.style.cssText = `
      position:absolute;top:18px;left:4px;width:8px;height:30px;z-index:2;
      background:linear-gradient(180deg, rgba(255,255,255,0.12), rgba(255,255,255,0.04), transparent);
      border-radius:4px;pointer-events:none;
    `;
    slot.appendChild(shine);

    const keyLabel = document.createElement("div");
    keyLabel.style.cssText = `
      position:absolute;bottom:2px;right:4px;font-size:13px;color:#9aaa7a;z-index:4;
      font-family:'Cinzel','Palatino Linotype','Book Antiqua',Georgia,serif;
      text-shadow:0 1px 2px rgba(0,0,0,0.8), 0 0 4px rgba(0,0,0,0.6);
    `;
    keyLabel.textContent = potionLabels[i];
    const iconEl = document.createElement("div");
    iconEl.style.cssText = "font-size:24px;z-index:3;filter:drop-shadow(0 1px 2px rgba(0,0,0,0.6));";
    iconEl.className = "potion-icon";
    slot.appendChild(iconEl);
    slot.appendChild(keyLabel);
    potionBarBg.appendChild(slot);
    potionHudSlots.push(slot);
  }
  hud.appendChild(potionBarBg);

  // Quest tracker - ornate scroll style
  const questTracker = document.createElement("div");
  questTracker.style.cssText = `
    position:absolute;top:16px;right:20px;margin-top:130px;width:240px;
    background:linear-gradient(180deg, rgba(30,24,12,0.9), rgba(15,12,6,0.92), rgba(25,20,10,0.9));
    border:2px solid #7a6a3a;border-radius:8px;
    padding:12px 36px 12px 14px;font-size:13px;color:#ccc;display:none;
    box-shadow:0 4px 14px rgba(0,0,0,0.5), inset 0 1px 0 rgba(200,168,78,0.15),
      inset 0 -1px 0 rgba(0,0,0,0.3), 0 0 1px rgba(200,168,78,0.25),
      inset 0 0 0 1px rgba(200,168,78,0.06), 0 0 0 1px rgba(0,0,0,0.3);
    font-family:'Cinzel','Palatino Linotype','Book Antiqua',Georgia,serif;
  `;
  // Close button (X) in top-right corner
  const questCloseBtn = document.createElement("div");
  questCloseBtn.style.cssText = `
    position:absolute;top:6px;right:8px;width:24px;height:24px;
    cursor:pointer;pointer-events:auto;z-index:10;
    display:flex;align-items:center;justify-content:center;
    font-size:16px;font-weight:bold;color:#cc9955;line-height:1;
    border:1px solid #8a6a3a;border-radius:4px;
    background:rgba(40,30,15,0.8);transition:all 0.15s;
    text-shadow:0 0 4px rgba(200,168,78,0.3);
  `;
  questCloseBtn.textContent = "\u2715";
  questCloseBtn.addEventListener("mouseenter", () => {
    questCloseBtn.style.color = "#ffdd99";
    questCloseBtn.style.background = "rgba(200,168,78,0.25)";
    questCloseBtn.style.borderColor = "#c8a84e";
    questCloseBtn.style.boxShadow = "0 0 6px rgba(200,168,78,0.3)";
  });
  questCloseBtn.addEventListener("mouseleave", () => {
    questCloseBtn.style.color = "#cc9955";
    questCloseBtn.style.background = "rgba(40,30,15,0.8)";
    questCloseBtn.style.borderColor = "#8a6a3a";
    questCloseBtn.style.boxShadow = "none";
  });
  questCloseBtn.addEventListener("click", () => {
    questTracker.style.display = "none";
    questTracker.dataset.userHidden = "true";
  });
  questTracker.appendChild(questCloseBtn);
  // Content container (so innerHTML updates don't destroy the close button)
  const questContent = document.createElement("div");
  questContent.id = "quest-tracker-content";
  questTracker.appendChild(questContent);
  // Scroll top decoration
  const questScrollTop = document.createElement("div");
  questScrollTop.style.cssText = `
    position:absolute;top:-7px;left:50%;transform:translateX(-50%);
    font-size:12px;color:#c8a84e;pointer-events:none;letter-spacing:4px;
    filter:drop-shadow(0 0 3px rgba(200,168,78,0.3));
  `;
  questScrollTop.textContent = "\u2E31 \u2736 \u2E31";
  questTracker.appendChild(questScrollTop);
  // Scroll bottom decoration
  const questScrollBot = document.createElement("div");
  questScrollBot.style.cssText = `
    position:absolute;bottom:-7px;left:50%;transform:translateX(-50%);
    font-size:12px;color:#c8a84e;pointer-events:none;letter-spacing:4px;
    filter:drop-shadow(0 0 3px rgba(200,168,78,0.3));
  `;
  questScrollBot.textContent = "\u2E31 \u2736 \u2E31";
  questTracker.appendChild(questScrollBot);
  hud.appendChild(questTracker);

  // Vendor interaction hint
  const vendorHint = document.createElement("div");
  vendorHint.style.cssText = `
    position:absolute;bottom:100px;left:50%;transform:translateX(-50%);
    padding:8px 20px;background:rgba(10,8,4,0.85);border:1px solid #5a4a2a;
    border-radius:6px;color:#c8a84e;font-size:14px;font-weight:bold;
    letter-spacing:1px;display:none;white-space:nowrap;
  `;
  hud.appendChild(vendorHint);

  // Chest interaction hint
  const chestHint = document.createElement("div");
  chestHint.style.cssText = `
    position:absolute;bottom:120px;left:50%;transform:translateX(-50%);
    padding:8px 20px;background:rgba(10,8,4,0.85);border:1px solid #5a4a2a;
    border-radius:6px;color:#ffd700;font-size:14px;font-weight:bold;
    letter-spacing:1px;display:none;white-space:nowrap;
  `;
  hud.appendChild(chestHint);

  // Town portal interaction hint
  const portalHint = document.createElement("div");
  portalHint.style.cssText = `
    position:absolute;bottom:140px;left:50%;transform:translateX(-50%);
    padding:8px 20px;background:rgba(10,8,20,0.9);border:1px solid #6688ff;
    border-radius:6px;color:#88bbff;font-size:14px;font-weight:bold;
    letter-spacing:1px;display:none;white-space:nowrap;
    box-shadow:0 0 12px rgba(100,130,255,0.3);
  `;
  hud.appendChild(portalHint);

  // Quest popup (centered, semi-transparent parchment style)
  const questPopup = document.createElement("div");
  questPopup.style.cssText = `
    position:absolute;top:12%;left:50%;transform:translateX(-50%);
    max-width:550px;width:90%;padding:20px 30px;
    background:linear-gradient(180deg, rgba(35,28,15,0.95) 0%, rgba(25,20,10,0.95) 100%);
    border:2px solid #5a4a2a;border-radius:10px;
    box-shadow:0 0 30px rgba(200,168,78,0.15), inset 0 0 20px rgba(0,0,0,0.3);
    color:#ccbb99;font-family:'Georgia',serif;text-align:center;
    display:none;z-index:5;pointer-events:none;
    transition:opacity 0.8s ease-out;
  `;
  hud.appendChild(questPopup);

  const deathOverlay = document.createElement("div");
  deathOverlay.style.cssText = `
    position:absolute;top:0;left:0;width:100%;height:100%;
    background:rgba(80,0,0,0.7);display:none;
    flex-direction:column;align-items:center;justify-content:center;
    color:#fff;pointer-events:none;
  `;
  deathOverlay.innerHTML = `
    <div style="font-size:48px;font-family:'Georgia',serif;color:#cc2222;
      text-shadow:0 0 30px rgba(200,30,30,0.6);letter-spacing:4px;">YOU HAVE DIED</div>
    <div id="diablo-respawn-timer" style="font-size:20px;color:#c8a84e;margin-top:16px;"></div>
    <div id="diablo-death-recap" style="font-size:14px;color:#aaa;margin-top:10px;text-align:center;"></div>
    <div id="diablo-gold-loss" style="font-size:16px;color:#ff8888;margin-top:8px;"></div>
  `;
  hud.appendChild(deathOverlay);

  // FPS crosshair (hidden by default)
  const fpsCrosshair = document.createElement("div");
  fpsCrosshair.style.cssText = `
    position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);pointer-events:none;display:none;
  `;
  fpsCrosshair.innerHTML =
    `<div style="position:absolute;width:3px;height:3px;border:1px solid rgba(255,255,255,0.9);border-radius:50%;left:-1px;top:-1px"></div>` +
    `<div style="position:absolute;width:14px;height:2px;background:rgba(255,255,255,0.6);left:5px;top:0"></div>` +
    `<div style="position:absolute;width:14px;height:2px;background:rgba(255,255,255,0.6);right:5px;top:0;transform:translateX(100%)"></div>` +
    `<div style="position:absolute;width:2px;height:14px;background:rgba(255,255,255,0.6);left:0;top:5px"></div>` +
    `<div style="position:absolute;width:2px;height:14px;background:rgba(255,255,255,0.6);left:0;bottom:5px;transform:translateY(100%)"></div>`;
  hud.appendChild(fpsCrosshair);

  // View mode indicator - hidden from main HUD (shown in pause menu instead)
  const viewModeLabel = document.createElement("div");
  viewModeLabel.style.cssText = `
    position:absolute;top:10px;left:50%;transform:translateX(-50%);
    font-size:11px;color:#888;letter-spacing:1px;pointer-events:none;display:none;
  `;
  viewModeLabel.textContent = "";
  hud.appendChild(viewModeLabel);

  // DPS display
  const dpsDisplay = document.createElement("div");
  dpsDisplay.style.cssText = `
    position:absolute;bottom:140px;right:20px;background:rgba(0,0,0,0.7);
    border:1px solid #5a4a2a;border-radius:6px;padding:8px 12px;display:none;
    font-family:'Georgia',serif;color:#c8a84e;font-size:13px;min-width:120px;
  `;
  dpsDisplay.innerHTML = `<div style="font-size:10px;color:#888;margin-bottom:2px;">DPS METER</div><div id="dps-value">0</div>`;
  hud.appendChild(dpsDisplay);
  const dpsValueEl = dpsDisplay.querySelector("#dps-value");

  // Loot filter label
  const lootFilterLabel = document.createElement("div");
  lootFilterLabel.id = "loot-filter-label";
  lootFilterLabel.style.cssText = `
    position:absolute;bottom:110px;right:20px;color:#ffdd00;font-size:11px;
    font-family:'Georgia',serif;opacity:0.7;
  `;
  lootFilterLabel.textContent = "Filter: Show All (Tab)";
  hud.appendChild(lootFilterLabel);

  // === Animated torches flanking the skill bar ===
  const torchPositions = [
    { side: "left", xOffset: "-238px" },
    { side: "right", xOffset: "238px" },
  ];
  for (const tp of torchPositions) {
    const torchWrap = document.createElement("div");
    torchWrap.style.cssText = `
      position:absolute;bottom:30px;left:50%;
      transform:translateX(calc(${tp.xOffset} - 50%));
      width:30px;height:80px;pointer-events:none;z-index:10;
    `;
    // Torch handle (stick)
    const torchHandle = document.createElement("div");
    torchHandle.style.cssText = `
      position:absolute;bottom:0;left:50%;transform:translateX(-50%);
      width:6px;height:48px;
      background:linear-gradient(180deg, #8b6914, #6b4f0e, #4a3508, #3a2508);
      border-radius:2px 2px 3px 3px;
      box-shadow:inset 1px 0 0 rgba(200,168,78,0.25), inset -1px 0 0 rgba(0,0,0,0.3),
        0 0 3px rgba(0,0,0,0.5);
    `;
    torchWrap.appendChild(torchHandle);
    // Torch cup (sits on top of handle)
    const cup = document.createElement("div");
    cup.style.cssText = `
      position:absolute;bottom:44px;left:50%;transform:translateX(-50%);
      width:14px;height:10px;
      background:linear-gradient(180deg, #3a2a1a, #5a4a2a, #3a2a1a);
      border-radius:3px 3px 5px 5px;
      box-shadow:0 1px 2px rgba(0,0,0,0.5), inset 0 1px 1px rgba(200,168,78,0.15);
    `;
    torchWrap.appendChild(cup);
    // Flame (anchored to top of cup)
    const flame = document.createElement("div");
    flame.style.cssText = `
      position:absolute;bottom:50px;left:50%;
      width:18px;height:26px;
      background:radial-gradient(ellipse at 50% 70%, #ffee66, #ffaa00 40%, #ff5500 70%, transparent);
      border-radius:50% 50% 50% 50% / 60% 60% 40% 40%;
      animation:hud-torch-flicker 0.4s ease-in-out infinite alternate;
      filter:blur(0.5px);
    `;
    torchWrap.appendChild(flame);
    // Inner flame core (sits inside the flame)
    const flameCore = document.createElement("div");
    flameCore.style.cssText = `
      position:absolute;bottom:52px;left:50%;transform:translateX(-50%);
      width:8px;height:14px;
      background:radial-gradient(ellipse at 50% 60%, #ffffee, #ffee66, transparent);
      border-radius:50% 50% 50% 50% / 60% 60% 40% 40%;
      pointer-events:none;
    `;
    torchWrap.appendChild(flameCore);
    // Flame glow (ambient light around flame)
    const flameGlow = document.createElement("div");
    flameGlow.style.cssText = `
      position:absolute;bottom:48px;left:50%;transform:translateX(-50%);
      width:30px;height:30px;border-radius:50%;
      background:radial-gradient(circle, rgba(255,170,0,0.25), transparent 70%);
      animation:hud-torch-glow 0.6s ease-in-out infinite alternate;
      pointer-events:none;
    `;
    torchWrap.appendChild(flameGlow);
    hud.appendChild(torchWrap);
  }

  // === Gothic frame border around entire HUD viewport ===
  const gothicFrame = document.createElement("div");
  gothicFrame.style.cssText = `
    position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:0;
    box-shadow:
      inset 0 0 0 3px rgba(20,15,5,0.8),
      inset 0 0 0 5px rgba(139,105,20,0.3),
      inset 0 0 0 6px rgba(200,168,78,0.15),
      inset 0 0 0 8px rgba(20,15,5,0.6),
      inset 0 0 30px rgba(0,0,0,0.3);
  `;
  hud.appendChild(gothicFrame);

  // Corner demon face ornaments (dark gradients shaped with border-radius)
  const cornerOrnPositions = [
    { top: "4px", left: "4px", rot: "0deg" },
    { top: "4px", right: "4px", rot: "90deg" },
    { bottom: "22px", left: "4px", rot: "270deg" },
    { bottom: "22px", right: "4px", rot: "180deg" },
  ];
  for (const cp of cornerOrnPositions) {
    const demon = document.createElement("div");
    let dStyle = `position:absolute;width:28px;height:28px;pointer-events:none;z-index:1;
      background:radial-gradient(circle at 50% 40%,
        rgba(200,168,78,0.25), rgba(100,80,30,0.2) 40%, rgba(20,15,5,0.4) 70%, transparent);
      border-radius:40% 40% 50% 50%;
      box-shadow:0 0 6px rgba(200,168,78,0.1);
      transform:rotate(${cp.rot});`;
    if (cp.top) dStyle += `top:${cp.top};`;
    if (cp.bottom) dStyle += `bottom:${cp.bottom};`;
    if (cp.left) dStyle += `left:${cp.left};`;
    if (cp.right) dStyle += `right:${cp.right};`;
    demon.style.cssText = dStyle;
    // Small face detail
    demon.innerHTML = `<div style="position:absolute;top:30%;left:50%;transform:translateX(-50%);
      font-size:10px;color:rgba(200,168,78,0.3);pointer-events:none;">\u2620</div>`;
    hud.appendChild(demon);
  }

  // Thin gold pinstripe inside the stone border
  const goldPinstripe = document.createElement("div");
  goldPinstripe.style.cssText = `
    position:absolute;top:6px;left:6px;right:6px;bottom:6px;pointer-events:none;z-index:0;
    border:1px solid rgba(200,168,78,0.12);
    border-radius:2px;
  `;
  hud.appendChild(goldPinstripe);

  return {
    hpBar: hpBar as HTMLDivElement,
    mpBar: mpBar as HTMLDivElement,
    hpText: hpText as HTMLDivElement,
    mpText: mpText as HTMLDivElement,
    hpOrbWrap: hpOrbWrap as HTMLDivElement,
    mpOrbWrap: mpOrbWrap as HTMLDivElement,
    xpBar: xpBar as HTMLDivElement,
    xpLevelText: xpLevelText as HTMLDivElement,
    goldText: goldText as HTMLDivElement,
    levelText: levelText as HTMLDivElement,
    killText: killText as HTMLDivElement,
    topRightPanel: topRight as HTMLDivElement,
    lootLog: lootLog as HTMLDivElement,
    skillSlots,
    skillCooldownOverlays,
    minimapCanvas,
    minimapCtx,
    fullmapCanvas,
    fullmapCtx,
    dpsMeter: dpsMeter as HTMLDivElement,
    mapNameLabel: mapNameLabel as HTMLDivElement,
    weatherText: weatherText as HTMLDivElement,
    potionHudSlots,
    questTracker: questTracker as HTMLDivElement,
    vendorHint: vendorHint as HTMLDivElement,
    chestHint: chestHint as HTMLDivElement,
    portalHint: portalHint as HTMLDivElement,
    questPopup: questPopup as HTMLDivElement,
    deathOverlay: deathOverlay as HTMLDivElement,
    fpsCrosshair: fpsCrosshair as HTMLDivElement,
    viewModeLabel: viewModeLabel as HTMLDivElement,
    dpsDisplay: dpsDisplay as HTMLDivElement,
    dpsValueEl,
    lootFilterLabelEl: lootFilterLabel,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
//  updateHUD
// ─────────────────────────────────────────────────────────────────────────────

export function updateHUD(
  refs: HUDRefs,
  hs: HUDState,
  ctx: HUDUpdateContext,
): void {
  const p = ctx.state.player;

  // Hardcore HUD indicator
  if (p.isHardcore) {
    if (!hs.hardcoreLabel) {
      hs.hardcoreLabel = document.createElement('div');
      hs.hardcoreLabel.style.cssText = 'position:absolute;top:5px;left:50%;transform:translateX(-50%);color:#ff4444;font-size:11px;font-family:Georgia,serif;font-weight:bold;pointer-events:none;z-index:20;text-shadow:0 0 5px #ff0000;';
      hs.hardcoreLabel.textContent = 'HARDCORE';
      ctx.hudEl.appendChild(hs.hardcoreLabel);
    }
  }

  // DPS calculation
  const now = performance.now();
  for (let i = ctx.combatLog.length - 1; i >= 0; i--) {
    if (now - ctx.combatLog[i].time >= 5000) ctx.combatLog.splice(i, 1);
  }
  const totalDmg = ctx.combatLog.reduce((s, e) => s + e.damage, 0);
  const currentDps = ctx.combatLog.length > 0 ? totalDmg / 5 : 0;
  ctx.setCurrentDps(currentDps);

  if (refs.dpsMeter) {
    if (currentDps > 0) {
      refs.dpsMeter.textContent = `\u2694 ${Math.round(currentDps)} DPS`;
      refs.dpsMeter.style.display = 'block';
    } else {
      refs.dpsMeter.style.display = 'none';
    }
  }

  // FPS crosshair + view mode label
  if (refs.fpsCrosshair) refs.fpsCrosshair.style.display = ctx.firstPerson ? "block" : "none";

  // Health orb
  const hpPct = Math.max(0, p.hp / p.maxHp);
  const hpPctInt = Math.round(hpPct * 100);
  if (hpPctInt !== hs.lastHpPctInt) {
    hs.lastHpPctInt = hpPctInt;
    refs.hpBar.style.height = hpPctInt + "%";
  }
  refs.hpText.textContent = `${Math.ceil(p.hp)}/${p.maxHp}`;
  ctx.updateVignette(p.hp / p.maxHp);

  // Detect HP change and trigger flash
  const hpDelta = p.hp - hs.prevHp;
  if (hs.prevHp >= 0 && Math.abs(hpDelta) > 2) {
    hs.hpFlashTimer = hpDelta < 0 ? 0.5 : 0.4;
  }
  hs.prevHp = p.hp;
  if (hs.hpFlashTimer > 0) {
    hs.hpFlashTimer -= 0.016;
    const fi = Math.min(1, hs.hpFlashTimer * 3);
    const isLoss = fi > 0;
    if (isLoss) {
      const pulse = 0.6 + Math.sin(Date.now() * 0.02) * 0.4;
      refs.hpOrbWrap.style.filter = `drop-shadow(0 0 ${12 + fi * 16}px rgba(255,40,40,${0.5 * fi * pulse})) drop-shadow(0 0 ${6 + fi * 8}px rgba(255,100,100,${0.3 * fi}))`;
    }
  } else {
    if (hpPct < 0.3 && hpPct > 0) {
      const pulse = 0.5 + Math.sin(Date.now() * 0.006) * 0.5;
      const danger = (0.3 - hpPct) / 0.3;
      refs.hpOrbWrap.style.filter = `drop-shadow(0 0 ${14 + danger * 12}px rgba(255,30,30,${0.3 + pulse * 0.35 * danger}))`;
    } else {
      refs.hpOrbWrap.style.filter = 'drop-shadow(0 0 12px rgba(180,20,20,0.35))';
    }
  }

  // Mana orb
  const mpPct = Math.max(0, p.mana / p.maxMana);
  const mpPctInt = Math.round(mpPct * 100);
  if (mpPctInt !== hs.lastMpPctInt) {
    hs.lastMpPctInt = mpPctInt;
    refs.mpBar.style.height = mpPctInt + "%";
  }
  refs.mpText.textContent = `${Math.ceil(p.mana)}/${p.maxMana}`;

  const manaDelta = p.mana - hs.prevMana;
  if (hs.prevMana >= 0 && Math.abs(manaDelta) > 5) {
    hs.manaFlashTimer = manaDelta < 0 ? 0.4 : 0.35;
  }
  hs.prevMana = p.mana;
  if (hs.manaFlashTimer > 0) {
    hs.manaFlashTimer -= 0.016;
    const mi = Math.min(1, hs.manaFlashTimer * 3);
    const pulse = 0.6 + Math.sin(Date.now() * 0.02) * 0.4;
    refs.mpOrbWrap.style.filter = `drop-shadow(0 0 ${12 + mi * 16}px rgba(60,60,255,${0.5 * mi * pulse})) drop-shadow(0 0 ${6 + mi * 8}px rgba(120,120,255,${0.3 * mi}))`;
  } else {
    if (mpPct < 0.2 && mpPct > 0) {
      const pulse = 0.5 + Math.sin(Date.now() * 0.005) * 0.5;
      const danger = (0.2 - mpPct) / 0.2;
      refs.mpOrbWrap.style.filter = `drop-shadow(0 0 ${14 + danger * 10}px rgba(80,80,255,${0.25 + pulse * 0.3 * danger}))`;
    } else {
      refs.mpOrbWrap.style.filter = 'drop-shadow(0 0 12px rgba(30,30,200,0.35))';
    }
  }

  // Skill bar
  for (let i = 0; i < 6; i++) {
    const skillId = p.skills[i];
    if (!skillId) continue;
    const def = SKILL_DEFS[skillId];
    if (!def) continue;
    const iconEl = refs.skillSlots[i].querySelector(".skill-icon") as HTMLDivElement;
    if (iconEl && iconEl.dataset.skillId !== skillId) {
      iconEl.dataset.skillId = skillId;
      iconEl.innerHTML = renderSkillIcon(def.icon, def.damageType);
    }

    const cd = p.skillCooldowns.get(skillId) || 0;
    const maxCd = def.cooldown;
    const cdTextEl = refs.skillSlots[i].querySelector(".skill-cd-text") as HTMLDivElement | null;
    const prevCd = hs.prevSkillCooldowns[i] || 0;
    if (prevCd > 0.1 && cd <= 0) {
      refs.skillSlots[i].style.transition = 'box-shadow 0.1s ease';
      refs.skillSlots[i].style.boxShadow = '0 0 20px rgba(255,215,0,0.9), 0 0 40px rgba(255,180,0,0.6), inset 0 0 15px rgba(255,215,0,0.4)';
      refs.skillSlots[i].style.borderColor = '#ffd700';
      const slotRef = refs.skillSlots[i];
      setTimeout(() => {
        if (slotRef) {
          slotRef.style.transition = 'box-shadow 0.5s ease';
          slotRef.style.boxShadow = 'inset 0 1px 0 rgba(200,168,78,0.2), inset 0 -1px 0 rgba(0,0,0,0.3), 0 2px 8px rgba(0,0,0,0.5), inset 0 0 20px rgba(200,168,78,0.03)';
          slotRef.style.borderColor = '#9a8a4a';
        }
      }, 500);
    }
    hs.prevSkillCooldowns[i] = cd;
    if (cd > 0) {
      const pct = Math.min(100, (cd / maxCd) * 100);
      refs.skillCooldownOverlays[i].style.height = pct + "%";
      if (cdTextEl) {
        cdTextEl.style.display = "block";
        cdTextEl.textContent = cd >= 1 ? Math.ceil(cd).toString() : cd.toFixed(1);
      }
    } else {
      refs.skillCooldownOverlays[i].style.height = "0%";
      if (cdTextEl) cdTextEl.style.display = "none";
    }

    // Ability glow effect when skill is actively being used
    const isActive = p.activeSkillId === skillId && p.activeSkillAnimTimer > 0;
    if (isActive) {
      const glowIntensity = Math.min(1, p.activeSkillAnimTimer * 4);
      const pulseGlow = 0.7 + Math.sin(Date.now() * 0.012) * 0.3;
      const gI = glowIntensity * pulseGlow;
      refs.skillSlots[i].style.boxShadow =
        `inset 0 0 20px rgba(255,215,100,${0.4 * gI}), ` +
        `0 0 12px rgba(255,200,60,${0.5 * gI}), ` +
        `0 0 24px rgba(255,180,40,${0.3 * gI})`;
      refs.skillSlots[i].style.borderColor = `rgba(255,215,100,${0.7 * gI + 0.3})`;
    } else {
      refs.skillSlots[i].style.boxShadow =
        'inset 0 1px 0 rgba(200,168,78,0.2), inset 0 -1px 0 rgba(0,0,0,0.3), 0 2px 8px rgba(0,0,0,0.5), inset 0 0 20px rgba(200,168,78,0.03)';
      refs.skillSlots[i].style.borderColor = '#9a8a4a';
    }
  }

  // XP bar
  const xpPct = p.xpToNext > 0 ? (p.xp / p.xpToNext) * 100 : 0;
  refs.xpBar.style.width = Math.min(100, xpPct) + "%";
  if (xpPct > 90) {
    refs.xpBar.style.animation = "hud-xp-pulse 1.2s ease-in-out infinite";
  } else {
    refs.xpBar.style.animation = "none";
  }
  if (refs.xpLevelText) {
    refs.xpLevelText.textContent = `Level ${p.level}  \u2014  ${Math.floor(xpPct)}%`;
  }

  // Top right
  if (p.gold !== hs.lastGoldValue) {
    const gained = p.gold > hs.lastGoldValue;
    hs.lastGoldValue = p.gold;
    refs.goldText.innerHTML = `<span style="filter:drop-shadow(0 0 3px rgba(255,215,0,0.4))">\uD83E\uDE99</span> ${p.gold.toLocaleString()}`;
    if (gained) {
      refs.goldText.style.textShadow = '0 0 16px rgba(255,215,0,0.9), 0 0 32px rgba(255,215,0,0.5), 0 1px 3px rgba(0,0,0,0.9)';
      refs.goldText.style.transform = 'scale(1.08)';
      setTimeout(() => {
        refs.goldText.style.textShadow = '0 0 8px rgba(255,215,0,0.5), 0 0 16px rgba(255,215,0,0.2), 0 1px 3px rgba(0,0,0,0.9)';
        refs.goldText.style.transform = 'scale(1)';
      }, 300);
    }
  }
  if (p.level !== hs.lastLevelValue) {
    const didLevelUp = hs.lastLevelValue > 0 && p.level > hs.lastLevelValue;
    hs.lastLevelValue = p.level;
    refs.levelText.innerHTML = `\u2694 Level ${p.level}`;
    if (didLevelUp) {
      refs.levelText.style.color = '#fff';
      refs.levelText.style.textShadow = '0 0 20px rgba(255,215,0,1), 0 0 40px rgba(255,215,0,0.7), 0 0 60px rgba(255,180,0,0.5)';
      refs.levelText.style.transform = 'scale(1.15)';
      refs.levelText.style.transition = 'all 0.15s ease-out';
      if (refs.topRightPanel) {
        refs.topRightPanel.style.borderColor = '#ffd700';
        refs.topRightPanel.style.boxShadow = '0 0 20px rgba(255,215,0,0.5), 0 4px 12px rgba(0,0,0,0.5), inset 0 0 15px rgba(255,215,0,0.1)';
      }
      setTimeout(() => {
        refs.levelText.style.color = '#c8a84e';
        refs.levelText.style.textShadow = '0 0 6px rgba(200,168,78,0.3), 0 1px 2px rgba(0,0,0,0.7)';
        refs.levelText.style.transform = 'scale(1)';
        if (refs.topRightPanel) {
          refs.topRightPanel.style.borderColor = '#7a6a3a';
          refs.topRightPanel.style.boxShadow = '0 4px 12px rgba(0,0,0,0.5), inset 0 1px 0 rgba(200,168,78,0.15), inset 0 -1px 0 rgba(0,0,0,0.3), 0 0 1px rgba(200,168,78,0.2), inset 0 0 0 1px rgba(200,168,78,0.08), 0 0 0 1px rgba(0,0,0,0.3)';
        }
      }, 800);
    }
  }
  if (ctx.state.killCount !== hs.lastKillValue || ctx.state.deathCount !== hs.lastDeathValue) {
    hs.lastKillValue = ctx.state.killCount;
    hs.lastDeathValue = ctx.state.deathCount;
    refs.killText.innerHTML = `\u2620 ${ctx.state.killCount} Kills` +
      (ctx.state.deathCount > 0 ? `  &nbsp;\u2620 ${ctx.state.deathCount} Deaths` : "");
  }

  // Glow border when talent points are available
  if (p.talentPoints > 0) {
    refs.topRightPanel.style.borderColor = "#ffd700";
    refs.topRightPanel.style.boxShadow = "0 4px 12px rgba(0,0,0,0.5), 0 0 12px rgba(255,215,0,0.5), 0 0 24px rgba(255,215,0,0.25), inset 0 0 8px rgba(255,215,0,0.1)";
  } else {
    refs.topRightPanel.style.borderColor = "#7a6a3a";
    refs.topRightPanel.style.boxShadow = "0 4px 12px rgba(0,0,0,0.5), inset 0 1px 0 rgba(200,168,78,0.15), inset 0 -1px 0 rgba(0,0,0,0.3), 0 0 1px rgba(200,168,78,0.2), inset 0 0 0 1px rgba(200,168,78,0.08), 0 0 0 1px rgba(0,0,0,0.3)";
  }

  // Potion slots (stacking)
  for (let i = 0; i < 4; i++) {
    const slot = p.potionSlots[i];
    const iconEl = refs.potionHudSlots[i].querySelector(".potion-icon") as HTMLDivElement;
    if (iconEl) iconEl.textContent = slot ? slot.potion.icon : "";
    // Show stack count
    let countEl = refs.potionHudSlots[i].querySelector(".potion-count") as HTMLDivElement | null;
    if (!countEl) {
      countEl = document.createElement("div");
      countEl.className = "potion-count";
      countEl.style.cssText = `position:absolute;bottom:2px;left:4px;font-size:14px;font-weight:bold;color:#ffd700;
        text-shadow:0 0 3px #000,0 0 6px #000,0 1px 2px #000;z-index:3;font-family:'Georgia',serif;pointer-events:none;`;
      refs.potionHudSlots[i].appendChild(countEl);
    }
    countEl.textContent = slot && slot.count > 1 ? `x${slot.count}` : "";
    const onCd = p.potionCooldown > 0;
    refs.potionHudSlots[i].style.borderColor = onCd ? "#5a2a2a" : "#6a8a4a";
    refs.potionHudSlots[i].style.opacity = onCd ? "0.5" : "1";
  }

  // Minimap (throttled to every 3rd frame)
  hs.minimapFrameCounter++;
  if (hs.minimapFrameCounter >= 3) {
    hs.minimapFrameCounter = 0;
    ctx.updateMinimap();
  }
  if (hs.fullmapVisible) {
    ctx.updateFullmap();
  }

  // Map name label
  if (refs.mapNameLabel) {
    refs.mapNameLabel.textContent = MAP_NAME_MAP[ctx.state.currentMap] || ctx.state.currentMap.replace(/_/g, ' ');
  }

  // Weather text - with icons
  refs.weatherText.textContent = WEATHER_LABELS[ctx.state.weather] || "";

  // Quest tracker
  ctx.updateQuestTracker();

  // Vendor hint (Camelot only)
  if (ctx.state.currentMap === DiabloMapId.CAMELOT) {
    let nearestVendor: DiabloVendor | null = null;
    let nearestDist = 4;
    for (const v of ctx.state.vendors) {
      const d = ctx.dist(p.x, p.z, v.x, v.z);
      if (d < nearestDist) {
        nearestDist = d;
        nearestVendor = v;
      }
    }
    if (nearestVendor) {
      refs.vendorHint.style.display = "block";
      const action = nearestVendor.type === VendorType.BLACKSMITH ? "forge/salvage"
        : nearestVendor.type === VendorType.JEWELER ? "reroll stats"
        : "trade";
      refs.vendorHint.textContent = `Press [E] to ${action} with ${nearestVendor.name}`;
    } else {
      refs.vendorHint.style.display = "none";
    }
  } else {
    refs.vendorHint.style.display = "none";
  }

  // Chest proximity hint
  let nearestChest = false;
  for (const chest of ctx.state.treasureChests) {
    if (chest.opened) continue;
    const d = ctx.dist(p.x, p.z, chest.x, chest.z);
    if (d < 4) {
      nearestChest = true;
      break;
    }
  }
  if (nearestChest) {
    refs.chestHint.style.display = "block";
    refs.chestHint.textContent = "Press [F] to open chest";
  } else {
    refs.chestHint.style.display = "none";
  }

  // Town portal & NPC proximity hint
  if (ctx.portalActive) {
    const portalDist = ctx.dist(p.x, p.z, ctx.portalX, ctx.portalZ);
    const npc = ctx.state.portalNpc;
    const npcDist = npc ? ctx.dist(p.x, p.z, npc.x, npc.z) : 999;
    if (portalDist < 4 || npcDist < 4) {
      refs.portalHint.style.display = "block";
      let hint = "";
      if (portalDist < 4) hint += "\uD83C\uDF00 Press [E] to use Town Portal";
      if (portalDist < 4 && npcDist < 4) hint += "  \u2502  ";
      if (npcDist < 4) hint += "\uD83E\uDDD3 Press [R] to talk to " + npc!.name;
      refs.portalHint.textContent = hint;
    } else {
      refs.portalHint.style.display = "none";
    }
  } else {
    refs.portalHint.style.display = "none";
  }

  // DPS meter update
  if (ctx.state.player.dpsDisplayVisible && refs.dpsDisplay) {
    refs.dpsDisplay.style.display = "block";
    const dpsVal = refs.dpsValueEl;
    if (dpsVal) dpsVal.textContent = `${Math.round(currentDps).toLocaleString()} DPS`;
  } else if (refs.dpsDisplay) {
    refs.dpsDisplay.style.display = "none";
  }

  // Loot filter label update
  const filterLabel = refs.lootFilterLabelEl;
  if (filterLabel) {
    const customFilter = p.customLootFilters[p.activeFilterIndex];
    const filterName = customFilter ? customFilter.name : 'Show All';
    filterLabel.textContent = `Filter: ${filterName} (Tab)`;
  }

  // Greater Rift HUD
  const rift = ctx.state.greaterRift;
  if (rift.state !== GreaterRiftState.NOT_ACTIVE) {
    if (!hs.riftHud) {
      hs.riftHud = document.createElement('div');
      hs.riftHud.style.cssText = 'position:absolute;top:10px;left:50%;transform:translateX(-50%);color:#fff;font-size:14px;font-family:monospace;text-align:center;background:rgba(0,0,0,0.7);padding:8px 16px;border:1px solid #ff8800;border-radius:4px;pointer-events:none;z-index:20;';
      ctx.hudEl.appendChild(hs.riftHud);
    }
    const riftProgressInt = Math.floor(rift.progressBar);
    const riftTimeInt = Math.floor(rift.timeRemaining);
    if (riftProgressInt !== hs.lastRiftProgress || riftTimeInt !== hs.lastRiftTime || rift.state !== hs.lastRiftState) {
      hs.lastRiftProgress = riftProgressInt;
      hs.lastRiftTime = riftTimeInt;
      hs.lastRiftState = rift.state;
      const mins = Math.floor(rift.timeRemaining / 60);
      const secs = Math.floor(rift.timeRemaining % 60);
      const timeStr = `${mins}:${secs.toString().padStart(2, '0')}`;
      const barWidth = Math.floor(rift.progressBar * 2);
      const barFill = '\u2588'.repeat(Math.floor(barWidth / 10));
      const barEmpty = '\u2591'.repeat(20 - Math.floor(barWidth / 10));
      const stateLabel = rift.state === GreaterRiftState.BOSS_SPAWNED ? ' \u26A0 GUARDIAN!' : '';
      hs.riftHud.innerHTML = `<span style="color:#ff8800">GR ${rift.level}</span> | ${timeStr} | [${barFill}${barEmpty}] ${riftProgressInt}%${stateLabel}`;
    }
    hs.riftHud.style.display = 'block';
    if (rift.timeRemaining < 30) hs.riftHud.style.borderColor = '#ff2222';
    else hs.riftHud.style.borderColor = '#ff8800';
  } else if (hs.riftHud) {
    hs.riftHud.style.display = 'none';
  }

  // Multiplayer HUD
  if (ctx.state.multiplayer.state !== MultiplayerState.DISCONNECTED) {
    if (!hs.multiplayerHud) {
      hs.multiplayerHud = document.createElement('div');
      hs.multiplayerHud.style.cssText = 'position:absolute;bottom:10px;left:10px;color:#fff;font-size:12px;font-family:monospace;background:rgba(0,0,0,0.6);padding:6px 10px;border-radius:4px;pointer-events:none;z-index:20;max-height:200px;overflow:hidden;';
      ctx.hudEl.appendChild(hs.multiplayerHud);
    }
    const mp = ctx.state.multiplayer;
    const msgCount = mp.chatMessages.length;
    if (msgCount !== hs.lastMpMessageCount) {
      hs.lastMpMessageCount = msgCount;
      const playerCount = mp.remotePlayers.length + 1;
      const recentChat = mp.chatMessages.slice(-5).map(m => `<span style="color:#aaa">${m.name}:</span> ${m.message}`).join('<br>');
      if (ctx.state.multiplayer.state === MultiplayerState.CONNECTING) {
        hs.multiplayerHud.innerHTML = `<span style="color:#ffaa00">RECONNECTING...</span>`;
      } else {
        hs.multiplayerHud.innerHTML = `<span style="color:#44ff44">ONLINE</span> ${playerCount} players | ${mp.ping}ms${recentChat ? '<br>' + recentChat : ''}`;
      }
    }
    hs.multiplayerHud.style.display = 'block';
  } else if (hs.multiplayerHud) {
    hs.multiplayerHud.style.display = 'none';
  }

  // Excalibur quest progress
  const fragments = ctx.state.player.excaliburFragments.length;
  if (fragments > 0 && !ctx.state.player.excaliburReforged) {
    const total = Object.keys(EXCALIBUR_QUEST_INFO).length;
    if (!hs.excaliburHud) {
      hs.excaliburHud = document.createElement('div');
      hs.excaliburHud.style.cssText = 'position:absolute;top:50px;right:10px;color:#ffd700;font-size:12px;font-family:Georgia,serif;background:rgba(0,0,0,0.6);padding:4px 8px;border:1px solid #8b6914;border-radius:4px;pointer-events:none;z-index:20;';
      ctx.hudEl.appendChild(hs.excaliburHud);
    }
    hs.excaliburHud.textContent = `\u2694\uFE0F Excalibur: ${fragments}/${total}`;
    hs.excaliburHud.style.display = 'block';
  } else if (hs.excaliburHud) {
    hs.excaliburHud.style.display = 'none';
  }

  // Crafting queue HUD indicator
  const cq = ctx.state.player.crafting.craftingQueue;
  if (cq.length > 0) {
    if (!hs.craftingQueueHud) {
      hs.craftingQueueHud = document.createElement('div');
      hs.craftingQueueHud.style.cssText = 'position:absolute;top:70px;right:10px;color:#ffd700;font-size:12px;font-family:Georgia,serif;background:rgba(0,0,0,0.7);padding:6px 12px;border:1px solid #5a4a2a;border-radius:4px;pointer-events:none;z-index:20;min-width:160px;';
      ctx.hudEl.appendChild(hs.craftingQueueHud);
    }
    const current = cq[0];
    const pct = Math.floor((current.progress / current.duration) * 100);
    if (pct !== hs.lastCraftingPct || cq.length !== hs.lastCraftingQueueLen) {
      hs.lastCraftingPct = pct;
      hs.lastCraftingQueueLen = cq.length;
      const recipe = ADVANCED_CRAFTING_RECIPES.find(r => r.id === current.recipeId);
      const recipeName = recipe ? recipe.name : current.recipeId;
      const barWidth = 120;
      const filledWidth = Math.floor(barWidth * pct / 100);
      hs.craftingQueueHud.innerHTML =
        `<div style="margin-bottom:4px;">Crafting: ${recipeName}</div>` +
        `<div style="background:#333;border-radius:3px;height:8px;width:${barWidth}px;overflow:hidden;">` +
        `<div style="background:linear-gradient(90deg,#c8a84e,#ffd700);height:100%;width:${filledWidth}px;transition:width 0.2s;"></div>` +
        `</div>` +
        `<div style="font-size:10px;color:#c8a84e;margin-top:2px;">${pct}%${cq.length > 1 ? ` (+${cq.length - 1} queued)` : ''}</div>`;
    }
    hs.craftingQueueHud.style.display = 'block';
  } else if (hs.craftingQueueHud) {
    hs.craftingQueueHud.style.display = 'none';
  }
}
