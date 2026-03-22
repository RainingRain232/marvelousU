// ---------------------------------------------------------------------------
// Caravan FX — damage numbers, loot text, kill bursts, hit sparks,
// slash trails, ability explosions, healing glow
// ---------------------------------------------------------------------------

import { Container, Graphics, Text, TextStyle } from "pixi.js";
import { BalanceConfig } from "@sim/config/BalanceConfig";

const TS = BalanceConfig.TILE_SIZE;

interface DmgNumber { text: Text; lifetime: number; vy: number; }
interface LootText { text: Text; lifetime: number; }
interface KillBurst { gfx: Graphics; lifetime: number; }
interface HitSpark { gfx: Graphics; lifetime: number; vx: number; vy: number; }
interface SlashTrail { gfx: Graphics; lifetime: number; }
interface AbilityBlast { gfx: Graphics; lifetime: number; maxR: number; color: number; }
interface HealGlow { gfx: Graphics; lifetime: number; }
interface ScreenFlash { gfx: Graphics; lifetime: number; }

export class CaravanFX {
  readonly dmgNumberContainer = new Container();

  private _dmgNumbers: DmgNumber[] = [];
  private _lootTexts: LootText[] = [];
  private _killBursts: KillBurst[] = [];
  private _hitSparks: HitSpark[] = [];
  private _slashTrails: SlashTrail[] = [];
  private _abilityBlasts: AbilityBlast[] = [];
  private _healGlows: HealGlow[] = [];
  private _screenFlashes: ScreenFlash[] = [];

  pendingDmgNumbers: { x: number; y: number; amount: number; isCrit: boolean }[] = [];
  pendingLootTexts: { x: number; y: number; value: number }[] = [];
  pendingKillBursts: { x: number; y: number; isBoss: boolean }[] = [];
  pendingHitSparks: { x: number; y: number; color: number }[] = [];
  pendingSlashTrails: { x1: number; y1: number; x2: number; y2: number; color: number }[] = [];
  pendingAbilityBlasts: { x: number; y: number; radius: number; color: number }[] = [];
  pendingHealGlows: { x: number; y: number }[] = [];

  init(): void {
    this.dmgNumberContainer.removeChildren();
    this._dmgNumbers = [];
    this._lootTexts = [];
    this._killBursts = [];
    this._hitSparks = [];
    this._slashTrails = [];
    this._abilityBlasts = [];
    this._healGlows = [];
    this._screenFlashes = [];
    this.pendingDmgNumbers = [];
    this.pendingLootTexts = [];
    this.pendingKillBursts = [];
    this.pendingHitSparks = [];
    this.pendingSlashTrails = [];
    this.pendingAbilityBlasts = [];
    this.pendingHealGlows = [];
  }

  // --- Damage numbers ---
  spawnDamageNumbers(): void {
    for (const dn of this.pendingDmgNumbers) {
      const text = new Text({
        text: dn.isCrit ? `${Math.ceil(dn.amount)}!` : `-${Math.ceil(dn.amount)}`,
        style: new TextStyle({
          fontFamily: "monospace",
          fontSize: dn.isCrit ? 20 : Math.min(16, 10 + dn.amount * 0.2),
          fill: dn.isCrit ? 0xffcc00 : 0xff4444,
          fontWeight: dn.isCrit ? "bold" : "normal",
          stroke: { color: 0x000000, width: dn.isCrit ? 3 : 2 },
        }),
      });
      text.anchor.set(0.5, 1);
      const offsetX = (Math.random() - 0.5) * 16;
      text.position.set(dn.x * TS + offsetX, dn.y * TS - 18);
      this.dmgNumberContainer.addChild(text);
      this._dmgNumbers.push({ text, lifetime: dn.isCrit ? 1.0 : 0.7, vy: dn.isCrit ? -60 : -45 });

      // Auto-spawn hit sparks for every damage number
      this.pendingHitSparks.push({
        x: dn.x, y: dn.y,
        color: dn.isCrit ? 0xffdd44 : 0xffaa44,
      });
    }
    this.pendingDmgNumbers = [];
  }

  // --- Hit sparks (radiating dots on impact) ---
  spawnHitSparks(): void {
    for (const hs of this.pendingHitSparks) {
      const sparkCount = 5 + Math.floor(Math.random() * 4);
      for (let i = 0; i < sparkCount; i++) {
        const angle = (i / sparkCount) * Math.PI * 2 + Math.random() * 0.5;
        const speed = 40 + Math.random() * 60;
        const gfx = new Graphics();
        const r = 1.5 + Math.random() * 1.5;
        gfx.circle(0, 0, r).fill({ color: hs.color, alpha: 0.9 });
        gfx.position.set(hs.x * TS, hs.y * TS);
        this.dmgNumberContainer.addChild(gfx);
        this._hitSparks.push({
          gfx, lifetime: 0.15 + Math.random() * 0.15,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
        });
      }
    }
    this.pendingHitSparks = [];
  }

  // --- Slash trails (line from attacker to target) ---
  spawnSlashTrails(): void {
    for (const st of this.pendingSlashTrails) {
      const gfx = new Graphics();
      gfx.moveTo(st.x1 * TS, st.y1 * TS).lineTo(st.x2 * TS, st.y2 * TS)
        .stroke({ color: st.color, width: 2, alpha: 0.7 });
      // Add perpendicular arc for slash feel
      const mx = (st.x1 + st.x2) / 2 * TS;
      const my = (st.y1 + st.y2) / 2 * TS;
      const dx = (st.x2 - st.x1) * TS;
      const dy = (st.y2 - st.y1) * TS;
      gfx.moveTo(st.x1 * TS, st.y1 * TS)
        .quadraticCurveTo(mx - dy * 0.3, my + dx * 0.3, st.x2 * TS, st.y2 * TS)
        .stroke({ color: 0xffffff, width: 1, alpha: 0.4 });
      this.dmgNumberContainer.addChild(gfx);
      this._slashTrails.push({ gfx, lifetime: 0.12 });
    }
    this.pendingSlashTrails = [];
  }

  // --- Ability blasts (expanding ring) ---
  spawnAbilityBlasts(): void {
    for (const ab of this.pendingAbilityBlasts) {
      const gfx = new Graphics();
      gfx.position.set(ab.x * TS, ab.y * TS);
      this.dmgNumberContainer.addChild(gfx);
      this._abilityBlasts.push({ gfx, lifetime: 0.4, maxR: ab.radius * TS, color: ab.color });
    }
    this.pendingAbilityBlasts = [];
  }

  // --- Heal glow (green expanding ring) ---
  spawnHealGlows(): void {
    for (const hg of this.pendingHealGlows) {
      const gfx = new Graphics();
      gfx.position.set(hg.x * TS, hg.y * TS);
      this.dmgNumberContainer.addChild(gfx);
      this._healGlows.push({ gfx, lifetime: 0.6 });
    }
    this.pendingHealGlows = [];
  }

  // --- Loot texts ---
  spawnLootTexts(): void {
    for (const lt of this.pendingLootTexts) {
      const text = new Text({
        text: `+${lt.value}g`,
        style: new TextStyle({
          fontFamily: "monospace", fontSize: 13, fill: 0xffd700,
          fontWeight: "bold", stroke: { color: 0x000000, width: 2 },
        }),
      });
      text.anchor.set(0.5, 1);
      text.position.set(lt.x * TS, lt.y * TS - 10);
      this.dmgNumberContainer.addChild(text);
      this._lootTexts.push({ text, lifetime: 0.9 });
    }
    this.pendingLootTexts = [];
  }

  // --- Kill bursts ---
  spawnKillBursts(): void {
    for (const kb of this.pendingKillBursts) {
      const radius = kb.isBoss ? 24 : 12;
      const gfx = new Graphics();
      // Ring burst instead of filled circle
      gfx.circle(0, 0, radius).stroke({ color: kb.isBoss ? 0xffaa00 : 0xff6644, width: 3, alpha: 0.8 });
      gfx.circle(0, 0, radius * 0.5).fill({ color: kb.isBoss ? 0xffcc44 : 0xff8844, alpha: 0.4 });
      gfx.position.set(kb.x * TS, kb.y * TS);
      this.dmgNumberContainer.addChild(gfx);
      this._killBursts.push({ gfx, lifetime: 0.35 });

      // Spawn extra sparks for kills
      for (let i = 0; i < (kb.isBoss ? 12 : 6); i++) {
        this.pendingHitSparks.push({
          x: kb.x + (Math.random() - 0.5) * 0.5,
          y: kb.y + (Math.random() - 0.5) * 0.5,
          color: kb.isBoss ? 0xffdd44 : 0xff8844,
        });
      }
    }
    this.pendingKillBursts = [];
  }

  // --- Update all ---
  updateDamageNumbers(dt: number): void {
    for (let i = this._dmgNumbers.length - 1; i >= 0; i--) {
      const dn = this._dmgNumbers[i];
      dn.lifetime -= dt;
      dn.text.position.y += dn.vy * dt;
      dn.text.alpha = Math.max(0, dn.lifetime / 0.8);
      if (dn.lifetime <= 0) {
        this.dmgNumberContainer.removeChild(dn.text);
        dn.text.destroy();
        this._dmgNumbers.splice(i, 1);
      }
    }
  }

  updateLootTexts(dt: number): void {
    for (let i = this._lootTexts.length - 1; i >= 0; i--) {
      const lt = this._lootTexts[i];
      lt.lifetime -= dt;
      lt.text.position.y -= 30 * dt;
      lt.text.alpha = Math.max(0, lt.lifetime / 0.9);
      if (lt.lifetime <= 0) {
        this.dmgNumberContainer.removeChild(lt.text);
        lt.text.destroy();
        this._lootTexts.splice(i, 1);
      }
    }
  }

  updateKillBursts(dt: number): void {
    for (let i = this._killBursts.length - 1; i >= 0; i--) {
      const kb = this._killBursts[i];
      kb.lifetime -= dt;
      const t = 1 - kb.lifetime / 0.35;
      kb.gfx.scale.set(1 + t * 1.5);
      kb.gfx.alpha = Math.max(0, kb.lifetime / 0.35);
      if (kb.lifetime <= 0) {
        this.dmgNumberContainer.removeChild(kb.gfx);
        kb.gfx.destroy();
        this._killBursts.splice(i, 1);
      }
    }
  }

  updateHitSparks(dt: number): void {
    for (let i = this._hitSparks.length - 1; i >= 0; i--) {
      const s = this._hitSparks[i];
      s.lifetime -= dt;
      s.gfx.position.x += s.vx * dt;
      s.gfx.position.y += s.vy * dt;
      s.vy += 80 * dt; // gravity
      s.gfx.alpha = Math.max(0, s.lifetime / 0.3);
      s.gfx.scale.set(Math.max(0.2, s.lifetime / 0.3));
      if (s.lifetime <= 0) {
        this.dmgNumberContainer.removeChild(s.gfx);
        s.gfx.destroy();
        this._hitSparks.splice(i, 1);
      }
    }
  }

  updateSlashTrails(dt: number): void {
    for (let i = this._slashTrails.length - 1; i >= 0; i--) {
      const s = this._slashTrails[i];
      s.lifetime -= dt;
      s.gfx.alpha = Math.max(0, s.lifetime / 0.12);
      if (s.lifetime <= 0) {
        this.dmgNumberContainer.removeChild(s.gfx);
        s.gfx.destroy();
        this._slashTrails.splice(i, 1);
      }
    }
  }

  updateAbilityBlasts(dt: number): void {
    for (let i = this._abilityBlasts.length - 1; i >= 0; i--) {
      const ab = this._abilityBlasts[i];
      ab.lifetime -= dt;
      const t = 1 - ab.lifetime / 0.4;
      const r = ab.maxR * t;
      ab.gfx.clear();
      ab.gfx.circle(0, 0, r).stroke({ color: ab.color, width: 3, alpha: ab.lifetime / 0.4 });
      ab.gfx.circle(0, 0, r * 0.7).fill({ color: ab.color, alpha: ab.lifetime / 0.4 * 0.15 });
      if (ab.lifetime <= 0) {
        this.dmgNumberContainer.removeChild(ab.gfx);
        ab.gfx.destroy();
        this._abilityBlasts.splice(i, 1);
      }
    }
  }

  updateHealGlows(dt: number): void {
    for (let i = this._healGlows.length - 1; i >= 0; i--) {
      const hg = this._healGlows[i];
      hg.lifetime -= dt;
      const t = 1 - hg.lifetime / 0.6;
      hg.gfx.clear();
      const r = 15 + t * 25;
      hg.gfx.circle(0, 0, r).fill({ color: 0x44ff88, alpha: (1 - t) * 0.2 });
      hg.gfx.circle(0, 0, r).stroke({ color: 0x44ff88, width: 2, alpha: (1 - t) * 0.5 });
      // Plus sign
      const pa = (1 - t) * 0.6;
      hg.gfx.rect(-6, -1.5, 12, 3).fill({ color: 0x44ff88, alpha: pa });
      hg.gfx.rect(-1.5, -6, 3, 12).fill({ color: 0x44ff88, alpha: pa });
      if (hg.lifetime <= 0) {
        this.dmgNumberContainer.removeChild(hg.gfx);
        hg.gfx.destroy();
        this._healGlows.splice(i, 1);
      }
    }
  }

  cleanup(): void {
    for (const dn of this._dmgNumbers) dn.text.destroy();
    for (const lt of this._lootTexts) lt.text.destroy();
    for (const kb of this._killBursts) kb.gfx.destroy();
    for (const hs of this._hitSparks) hs.gfx.destroy();
    for (const st of this._slashTrails) st.gfx.destroy();
    for (const ab of this._abilityBlasts) ab.gfx.destroy();
    for (const hg of this._healGlows) hg.gfx.destroy();
    for (const sf of this._screenFlashes) sf.gfx.destroy();
    this._dmgNumbers = [];
    this._lootTexts = [];
    this._killBursts = [];
    this._hitSparks = [];
    this._slashTrails = [];
    this._abilityBlasts = [];
    this._healGlows = [];
    this._screenFlashes = [];
    this.dmgNumberContainer.removeChildren();
  }
}
