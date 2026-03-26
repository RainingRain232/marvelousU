// ---------------------------------------------------------------------------
// Age of Wonders — 3D Unit Renderer (enhanced faction-specific visuals)
// ---------------------------------------------------------------------------

import * as THREE from "three";
import {
  type AoWGameState, type AoWArmy, type AoWUnit,
  AoWFaction, hexToWorld, hexKey,
} from "../AoWTypes";
import { getFactionDef } from "../config/AoWConfig";
import type { AoWSceneManager } from "./AoWSceneManager";

interface ArmyVisual {
  group: THREE.Group;
  armyId: string;
  selectionRing: THREE.Mesh;
  banner: THREE.Mesh;
  unitMeshes: THREE.Mesh[];
  bobPhase: number;
  targetPos: THREE.Vector3;
  countBadge: THREE.Sprite;
  hpBar: THREE.Mesh;
  faction: AoWFaction;
}

export class AoWUnitRenderer {
  private _sceneManager: AoWSceneManager;
  private _armyVisuals = new Map<string, ArmyVisual>();
  private _time = 0;

  constructor(sceneManager: AoWSceneManager) {
    this._sceneManager = sceneManager;
  }

  // ---------------------------------------------------------------------------
  // Build/update all armies
  // ---------------------------------------------------------------------------

  updateArmies(state: AoWGameState): void {
    const existingIds = new Set<string>();

    for (const army of state.armies) {
      existingIds.add(army.id);
      const hex = state.hexes.get(hexKey(army.q, army.r));
      const pos = hexToWorld(army.q, army.r, hex?.elevation || 0);
      const worldPos = new THREE.Vector3(pos.x, pos.y + 0.35, pos.z);

      let visual = this._armyVisuals.get(army.id);
      if (!visual) {
        visual = this._createArmyVisual(army, state);
        this._armyVisuals.set(army.id, visual);
        this._sceneManager.unitGroup.add(visual.group);
      }

      visual.targetPos.copy(worldPos);
      visual.armyId = army.id;
      visual.selectionRing.visible = state.selectedArmyId === army.id;

      this._updateArmyUnitMeshes(visual, army, state);
    }

    // Remove dead armies
    for (const [id, visual] of this._armyVisuals) {
      if (!existingIds.has(id)) {
        this._sceneManager.unitGroup.remove(visual.group);
        this._armyVisuals.delete(id);
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Create procedural army visual
  // ---------------------------------------------------------------------------

  private _createArmyVisual(army: AoWArmy, state: AoWGameState): ArmyVisual {
    const group = new THREE.Group();
    const player = state.players[army.playerId];
    const factionDef = player ? getFactionDef(player.faction) : null;
    const color = factionDef?.color ?? 0x888888;
    const faction = player?.faction ?? AoWFaction.CAMELOT;

    const hex = state.hexes.get(hexKey(army.q, army.r));
    const pos = hexToWorld(army.q, army.r, hex?.elevation || 0);
    group.position.set(pos.x, pos.y + 0.35, pos.z);

    // Selection ring with animated dashes
    const ringGeo = new THREE.RingGeometry(0.5, 0.6, 32);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0xffd700,
      transparent: true,
      opacity: 0.7,
      side: THREE.DoubleSide,
    });
    const selectionRing = new THREE.Mesh(ringGeo, ringMat);
    selectionRing.rotation.x = -Math.PI / 2;
    selectionRing.position.y = 0.02;
    selectionRing.visible = false;
    group.add(selectionRing);

    // Ground shadow disc
    const shadowMat = new THREE.MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0.25,
    });
    const shadow = new THREE.Mesh(new THREE.CircleGeometry(0.35, 12), shadowMat);
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = -0.33;
    group.add(shadow);

    // Faction banner pole
    const poleMat = new THREE.MeshStandardMaterial({ color: 0x554433, roughness: 0.8 });
    const pole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.015, 0.015, 0.8, 4),
      poleMat,
    );
    pole.position.set(0.18, 0.4, 0);
    group.add(pole);

    // Banner with faction emblem
    const bannerMat = new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide });
    const banner = new THREE.Mesh(
      new THREE.PlaneGeometry(0.18, 0.14),
      bannerMat,
    );
    banner.position.set(0.28, 0.7, 0);
    group.add(banner);

    // Create unit meshes
    const unitMeshes = this._createUnitMeshes(army, state, group, color, faction);

    // Count badge
    const countBadge = this._createCountBadge(army.units.length, color);
    countBadge.position.y = 1.2;
    group.add(countBadge);

    // HP bar
    const hpBar = this._createHpBar(army);
    hpBar.position.y = 1.0;
    group.add(hpBar);

    return {
      group,
      armyId: army.id,
      selectionRing,
      banner,
      unitMeshes,
      bobPhase: Math.random() * Math.PI * 2,
      targetPos: new THREE.Vector3(pos.x, pos.y + 0.35, pos.z),
      countBadge,
      hpBar,
      faction,
    };
  }

  private _createUnitMeshes(army: AoWArmy, _state: AoWGameState, group: THREE.Group, color: number, faction: AoWFaction): THREE.Mesh[] {
    const meshes: THREE.Mesh[] = [];
    const count = Math.min(army.units.length, 6);

    for (let i = 0; i < count; i++) {
      const unit = army.units[i];
      const mesh = this._createUnitMesh(unit, color, faction);

      const angle = (Math.PI * 2 / Math.max(count, 1)) * i;
      const radius = count > 1 ? 0.45 : 0;
      mesh.position.set(Math.cos(angle) * radius, 0, Math.sin(angle) * radius);

      group.add(mesh);
      meshes.push(mesh);
    }

    return meshes;
  }

  private _createUnitMesh(unit: AoWUnit, factionColor: number, faction: AoWFaction): THREE.Mesh {
    const isHero = unit.isHero;

    // Faction-specific material properties
    const matProps = this._getFactionMaterial(faction, isHero);
    const bodyColor = isHero ? factionColor : this._getUnitColor(unit, faction);

    const mat = new THREE.MeshStandardMaterial({
      color: bodyColor,
      flatShading: true,
      metalness: matProps.metalness,
      roughness: matProps.roughness,
      emissive: matProps.emissive,
      emissiveIntensity: matProps.emissiveIntensity,
      transparent: matProps.transparent,
      opacity: matProps.opacity,
    });

    let geo: THREE.BufferGeometry;
    if (isHero) {
      geo = this._createHeroGeometry(faction);
    } else if (unit.range > 0) {
      geo = this._createRangedGeometry(faction);
    } else if (unit.abilities.includes("flying")) {
      geo = this._createFlyingGeometry(faction);
    } else if (unit.abilities.includes("armored") || unit.abilities.includes("construct")) {
      geo = this._createHeavyGeometry(faction);
    } else {
      geo = this._createBasicGeometry(faction);
    }

    const mesh = new THREE.Mesh(geo, mat);
    mesh.castShadow = true;

    // Hero crown/glow
    if (isHero) {
      // Crown
      const crownMat = new THREE.MeshStandardMaterial({
        color: 0xffd700,
        emissive: 0xffd700,
        emissiveIntensity: 0.3,
        metalness: 0.7,
        roughness: 0.2,
      });
      const crown = new THREE.Mesh(
        new THREE.TorusGeometry(0.12, 0.02, 6, 8),
        crownMat,
      );
      crown.position.y = 0.55;
      crown.rotation.x = Math.PI / 2;
      mesh.add(crown);

      // Crown spikes
      for (let i = 0; i < 5; i++) {
        const angle = (Math.PI * 2 / 5) * i;
        const spike = new THREE.Mesh(
          new THREE.ConeGeometry(0.015, 0.06, 3),
          crownMat,
        );
        spike.position.set(Math.cos(angle) * 0.12, 0.57, Math.sin(angle) * 0.12);
        mesh.add(spike);
      }

      // Hero aura glow
      const glowMat = new THREE.MeshBasicMaterial({
        color: factionColor,
        transparent: true,
        opacity: 0.15,
      });
      const glow = new THREE.Mesh(new THREE.SphereGeometry(0.5, 12, 12), glowMat);
      glow.position.y = 0.2;
      mesh.add(glow);

      // Inner bright glow
      const innerGlow = new THREE.MeshBasicMaterial({
        color: factionColor,
        transparent: true,
        opacity: 0.25,
      });
      const inner = new THREE.Mesh(new THREE.SphereGeometry(0.3, 8, 8), innerGlow);
      inner.position.y = 0.2;
      mesh.add(inner);
    }

    // Weapon detail for melee units
    if (!isHero && unit.range === 0 && !unit.abilities.includes("flying")) {
      this._addWeaponDetail(mesh, faction, unit);
    }

    // Shield for armored units
    if (unit.abilities.includes("armored") && !isHero) {
      this._addShieldDetail(mesh, factionColor);
    }

    return mesh;
  }

  private _getFactionMaterial(faction: AoWFaction, isHero: boolean): {
    metalness: number; roughness: number;
    emissive: number; emissiveIntensity: number;
    transparent: boolean; opacity: number;
  } {
    switch (faction) {
      case AoWFaction.CAMELOT:
        return {
          metalness: isHero ? 0.6 : 0.35,
          roughness: isHero ? 0.2 : 0.4,
          emissive: 0x000000,
          emissiveIntensity: 0,
          transparent: false,
          opacity: 1,
        };
      case AoWFaction.UNDEAD:
        return {
          metalness: 0.05,
          roughness: 0.7,
          emissive: 0x224422,
          emissiveIntensity: isHero ? 0.25 : 0.1,
          transparent: true,
          opacity: isHero ? 0.9 : 0.85,
        };
      case AoWFaction.FEY:
        return {
          metalness: 0.15,
          roughness: 0.4,
          emissive: 0x22aa44,
          emissiveIntensity: isHero ? 0.3 : 0.12,
          transparent: true,
          opacity: isHero ? 0.9 : 0.88,
        };
      case AoWFaction.DWARVES:
        return {
          metalness: isHero ? 0.5 : 0.3,
          roughness: isHero ? 0.3 : 0.6,
          emissive: 0x000000,
          emissiveIntensity: 0,
          transparent: false,
          opacity: 1,
        };
      default:
        return { metalness: 0.1, roughness: 0.7, emissive: 0, emissiveIntensity: 0, transparent: false, opacity: 1 };
    }
  }

  private _getUnitColor(unit: AoWUnit, faction: AoWFaction): number {
    // Faction-themed base colors
    switch (faction) {
      case AoWFaction.CAMELOT:
        if (unit.abilities.includes("armored")) return 0xbbbbcc; // polished steel
        return 0x998877; // leather/cloth
      case AoWFaction.UNDEAD:
        if (unit.abilities.includes("incorporeal")) return 0x66aa77; // ghostly
        return 0x889988; // bone/decay
      case AoWFaction.FEY:
        if (unit.abilities.includes("flying")) return 0x88ccaa; // fairy
        return 0x77aa77; // nature green
      case AoWFaction.DWARVES:
        if (unit.abilities.includes("construct")) return 0x8888aa; // iron
        return 0xaa7744; // dwarven bronze
    }
    return 0x887766;
  }

  // ---------------------------------------------------------------------------
  // Faction-specific geometries
  // ---------------------------------------------------------------------------

  private _createHeroGeometry(faction: AoWFaction): THREE.BufferGeometry {
    switch (faction) {
      case AoWFaction.CAMELOT:
        // Tall knight silhouette
        return new THREE.CylinderGeometry(0.18, 0.22, 1.0, 6);
      case AoWFaction.UNDEAD:
        // Hooded lich shape (wider top)
        return new THREE.CylinderGeometry(0.22, 0.15, 1.0, 5);
      case AoWFaction.FEY:
        // Slender elf queen
        return new THREE.CylinderGeometry(0.14, 0.18, 1.1, 8);
      case AoWFaction.DWARVES:
        // Stocky and wide
        return new THREE.CylinderGeometry(0.22, 0.25, 0.8, 6);
      default:
        return new THREE.CylinderGeometry(0.2, 0.25, 1.0, 6);
    }
  }

  private _createRangedGeometry(faction: AoWFaction): THREE.BufferGeometry {
    switch (faction) {
      case AoWFaction.FEY:
        // Tall slender archer
        return new THREE.CylinderGeometry(0.1, 0.14, 0.8, 6);
      case AoWFaction.DWARVES:
        // Stocky crossbowman
        return new THREE.BoxGeometry(0.28, 0.5, 0.22);
      default:
        return new THREE.ConeGeometry(0.17, 0.75, 4);
    }
  }

  private _createFlyingGeometry(faction: AoWFaction): THREE.BufferGeometry {
    switch (faction) {
      case AoWFaction.FEY:
        // Fairy/phoenix - elegant diamond
        return new THREE.OctahedronGeometry(0.25, 1);
      case AoWFaction.UNDEAD:
        // Bat wing shape
        return new THREE.OctahedronGeometry(0.3, 0);
      default:
        return new THREE.OctahedronGeometry(0.3, 0);
    }
  }

  private _createHeavyGeometry(faction: AoWFaction): THREE.BufferGeometry {
    switch (faction) {
      case AoWFaction.DWARVES:
        // Iron golem - chunky
        return new THREE.BoxGeometry(0.4, 0.65, 0.35);
      case AoWFaction.CAMELOT:
        // Heavy knight
        return new THREE.CylinderGeometry(0.2, 0.2, 0.7, 6);
      default:
        return new THREE.BoxGeometry(0.35, 0.6, 0.35);
    }
  }

  private _createBasicGeometry(faction: AoWFaction): THREE.BufferGeometry {
    switch (faction) {
      case AoWFaction.CAMELOT:
        return new THREE.CylinderGeometry(0.13, 0.16, 0.55, 6);
      case AoWFaction.UNDEAD:
        // Skeletal - thinner
        return new THREE.CapsuleGeometry(0.1, 0.4, 4, 5);
      case AoWFaction.FEY:
        // Elegant sprite
        return new THREE.CapsuleGeometry(0.12, 0.35, 4, 6);
      case AoWFaction.DWARVES:
        // Stocky warrior
        return new THREE.CylinderGeometry(0.16, 0.18, 0.5, 6);
      default:
        return new THREE.CapsuleGeometry(0.15, 0.35, 4, 6);
    }
  }

  // ---------------------------------------------------------------------------
  // Weapon / Shield details
  // ---------------------------------------------------------------------------

  private _addWeaponDetail(mesh: THREE.Mesh, faction: AoWFaction, unit: AoWUnit): void {
    const bladeMat = new THREE.MeshStandardMaterial({
      color: 0xccccdd,
      metalness: 0.7,
      roughness: 0.2,
      flatShading: true,
    });

    let weapon: THREE.Mesh;
    switch (faction) {
      case AoWFaction.CAMELOT:
        // Sword
        weapon = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.35, 0.015), bladeMat);
        weapon.position.set(0.2, 0.15, 0);
        weapon.rotation.z = -0.3;
        break;
      case AoWFaction.UNDEAD:
        // Scythe blade
        weapon = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.25, 3), bladeMat);
        weapon.position.set(0.15, 0.25, 0);
        weapon.rotation.z = -0.6;
        break;
      case AoWFaction.DWARVES:
        // Axe head
        if (unit.abilities.includes("frenzy")) {
          weapon = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.2, 0.015), bladeMat);
        } else {
          weapon = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.15, 0.015), bladeMat);
        }
        weapon.position.set(0.18, 0.15, 0);
        weapon.rotation.z = -0.4;
        break;
      default:
        weapon = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.25, 0.01), bladeMat);
        weapon.position.set(0.15, 0.15, 0);
        weapon.rotation.z = -0.3;
        break;
    }
    weapon.castShadow = true;
    mesh.add(weapon);
  }

  private _addShieldDetail(mesh: THREE.Mesh, factionColor: number): void {
    const shieldMat = new THREE.MeshStandardMaterial({
      color: factionColor,
      metalness: 0.4,
      roughness: 0.4,
      flatShading: true,
    });
    const shield = new THREE.Mesh(
      new THREE.CircleGeometry(0.1, 6),
      shieldMat,
    );
    shield.position.set(-0.18, 0.1, 0.05);
    shield.rotation.y = -0.5;
    mesh.add(shield);
  }

  // ---------------------------------------------------------------------------
  // Count badge helper
  // ---------------------------------------------------------------------------

  private _createCountBadge(count: number, color: number): THREE.Sprite {
    const canvas = document.createElement("canvas");
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext("2d")!;

    const r = (color >> 16) & 0xff;
    const g = (color >> 8) & 0xff;
    const b = color & 0xff;

    // Drop shadow
    ctx.beginPath();
    ctx.arc(34, 34, 28, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(0,0,0,0.4)";
    ctx.fill();

    // Main circle
    ctx.beginPath();
    ctx.arc(32, 32, 28, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(${r}, ${g}, ${b}, 0.9)`;
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.7)";
    ctx.lineWidth = 3;
    ctx.stroke();

    // Number
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 36px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.shadowColor = "rgba(0,0,0,0.5)";
    ctx.shadowBlur = 4;
    ctx.fillText(String(count), 32, 34);

    const texture = new THREE.CanvasTexture(canvas);
    const mat = new THREE.SpriteMaterial({ map: texture, transparent: true });
    const sprite = new THREE.Sprite(mat);
    sprite.scale.set(0.4, 0.4, 1);
    return sprite;
  }

  // ---------------------------------------------------------------------------
  // HP bar helper
  // ---------------------------------------------------------------------------

  private _createHpBar(army: AoWArmy): THREE.Mesh {
    const geo = new THREE.PlaneGeometry(0.5, 0.05);
    const hpPct = this._getArmyHpPct(army);
    const mat = new THREE.MeshBasicMaterial({
      color: this._hpColor(hpPct),
      transparent: true,
      opacity: 0.85,
      side: THREE.DoubleSide,
    });
    const mesh = new THREE.Mesh(geo, mat);
    return mesh;
  }

  private _getArmyHpPct(army: AoWArmy): number {
    let totalHp = 0;
    let totalMaxHp = 0;
    for (const u of army.units) {
      totalHp += u.hp;
      totalMaxHp += u.maxHp;
    }
    return totalMaxHp > 0 ? totalHp / totalMaxHp : 1;
  }

  private _hpColor(pct: number): number {
    const r = pct > 0.5 ? Math.round(0x44 + (0xcc - 0x44) * (1 - (pct - 0.5) * 2)) : 0xcc;
    const g = pct < 0.5 ? Math.round(0x44 + (0xcc - 0x44) * pct * 2) : 0xcc;
    const b = 0x44;
    return (r << 16) | (g << 8) | b;
  }

  private _updateCountBadge(sprite: THREE.Sprite, count: number, color: number): void {
    const canvas = document.createElement("canvas");
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext("2d")!;

    const r = (color >> 16) & 0xff;
    const g = (color >> 8) & 0xff;
    const b = color & 0xff;

    ctx.beginPath();
    ctx.arc(34, 34, 28, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(0,0,0,0.4)";
    ctx.fill();

    ctx.beginPath();
    ctx.arc(32, 32, 28, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(${r}, ${g}, ${b}, 0.9)`;
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.7)";
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 36px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.shadowColor = "rgba(0,0,0,0.5)";
    ctx.shadowBlur = 4;
    ctx.fillText(String(count), 32, 34);

    const oldTex = (sprite.material as THREE.SpriteMaterial).map;
    if (oldTex) oldTex.dispose();

    const texture = new THREE.CanvasTexture(canvas);
    (sprite.material as THREE.SpriteMaterial).map = texture;
    (sprite.material as THREE.SpriteMaterial).needsUpdate = true;
  }

  // ---------------------------------------------------------------------------
  // Update unit meshes when army composition changes
  // ---------------------------------------------------------------------------

  private _updateArmyUnitMeshes(visual: ArmyVisual, army: AoWArmy, state: AoWGameState): void {
    const player = state.players[army.playerId];
    const color = player ? getFactionDef(player.faction).color : 0x888888;
    const faction = player?.faction ?? AoWFaction.CAMELOT;

    if (visual.unitMeshes.length !== Math.min(army.units.length, 6)) {
      for (const m of visual.unitMeshes) {
        visual.group.remove(m);
        m.geometry.dispose();
      }
      visual.unitMeshes = this._createUnitMeshes(army, state, visual.group, color, faction);
      this._updateCountBadge(visual.countBadge, army.units.length, color);
    }

    // Update HP bar
    const hpPct = this._getArmyHpPct(army);
    (visual.hpBar.material as THREE.MeshBasicMaterial).color.setHex(this._hpColor(hpPct));
    visual.hpBar.scale.x = Math.max(hpPct, 0.01);
  }

  // ---------------------------------------------------------------------------
  // Animation tick
  // ---------------------------------------------------------------------------

  tick(dt: number): void {
    this._time += dt;

    for (const [, visual] of this._armyVisuals) {
      // Smooth movement toward target
      visual.group.position.lerp(visual.targetPos, 0.12);

      // Bob animation - faction specific
      const bobSpeed = visual.faction === AoWFaction.FEY ? 2.5 : 1.8;
      const bobHeight = visual.faction === AoWFaction.FEY ? 0.05 : 0.03;
      const bob = Math.sin(this._time * bobSpeed + visual.bobPhase) * bobHeight;

      for (let i = 0; i < visual.unitMeshes.length; i++) {
        const mesh = visual.unitMeshes[i];
        mesh.position.y = 0.15 + bob + Math.sin(this._time * 1.5 + i * 0.5) * 0.008;
      }

      // Selection ring pulse with scale
      if (visual.selectionRing.visible) {
        const pulse = 0.5 + Math.sin(this._time * 3) * 0.3;
        (visual.selectionRing.material as THREE.MeshBasicMaterial).opacity = pulse;
        const ringScale = 1 + Math.sin(this._time * 2) * 0.05;
        visual.selectionRing.scale.set(ringScale, ringScale, 1);
      }

      // Banner wave
      visual.banner.rotation.y = Math.sin(this._time * 2 + visual.bobPhase) * 0.2;
      visual.banner.rotation.z = Math.sin(this._time * 1.2 + visual.bobPhase) * 0.05;

      // HP bar billboard - face camera
      visual.hpBar.lookAt(this._sceneManager.camera.position);
      visual.countBadge.lookAt(this._sceneManager.camera.position);
    }
  }

  // ---------------------------------------------------------------------------
  // Cleanup
  // ---------------------------------------------------------------------------

  clear(): void {
    for (const [, visual] of this._armyVisuals) {
      this._sceneManager.unitGroup.remove(visual.group);
    }
    this._armyVisuals.clear();
  }
}
