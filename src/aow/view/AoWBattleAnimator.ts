// ---------------------------------------------------------------------------
// AoW Battle Animator — visual replay of auto-resolved combat
// ---------------------------------------------------------------------------

import * as THREE from "three";
import type { BattleTimeline, BattleEvent } from "../AoWTypes";

const UNIT_SPACING = 1.8;
const ATTACKER_X = -5;
const DEFENDER_X = 5;
const STEP_DISTANCE = 2.5;

interface BattleUnit {
  mesh: THREE.Group;
  side: "attacker" | "defender";
  baseX: number;
  baseZ: number;
  hp: number;
  maxHp: number;
  hpBar: THREE.Mesh;
  hpBg: THREE.Mesh;
  alive: boolean;
  flashTimer: number;
  stepTimer: number;
  stepTarget: number;
  name: string;
}

export class AoWBattleAnimator {
  private _scene: THREE.Scene;
  private _camera: THREE.PerspectiveCamera;
  private _renderer: THREE.WebGLRenderer;
  private _group = new THREE.Group();
  private _units: BattleUnit[] = [];
  private _timeline: BattleTimeline;
  private _clock = 0;
  private _eventIdx = 0;
  private _done = false;
  private _onComplete: () => void;
  private _overlay: HTMLDivElement;
  private _logDiv: HTMLDivElement;
  private _roundText: HTMLDivElement;
  private _dmgPopups: { el: HTMLDivElement; timer: number }[] = [];

  constructor(
    scene: THREE.Scene,
    camera: THREE.PerspectiveCamera,
    renderer: THREE.WebGLRenderer,
    timeline: BattleTimeline,
    onComplete: () => void,
  ) {
    this._scene = scene;
    this._camera = camera;
    this._renderer = renderer;
    this._timeline = timeline;
    this._onComplete = onComplete;

    // Build battle arena
    this._buildArena();
    this._buildUnits();
    this._buildOverlay();

    // Position camera for battle view
    this._camera.position.set(0, 12, 14);
    this._camera.lookAt(0, 1, 0);
  }

  private _buildArena(): void {
    // Ground plane
    const groundGeo = new THREE.PlaneGeometry(20, 12);
    const groundMat = new THREE.MeshStandardMaterial({ color: 0x3a4a2a, roughness: 0.9 });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    this._group.add(ground);

    // Dividing line
    const lineMat = new THREE.MeshBasicMaterial({ color: 0x888855, transparent: true, opacity: 0.3 });
    const line = new THREE.Mesh(new THREE.PlaneGeometry(0.05, 10), lineMat);
    line.rotation.x = -Math.PI / 2;
    line.position.y = 0.01;
    this._group.add(line);

    // Ambient lighting for battle
    const light = new THREE.DirectionalLight(0xffeedd, 1.0);
    light.position.set(5, 10, 5);
    this._group.add(light);
    this._group.add(new THREE.AmbientLight(0x667788, 0.5));

    this._scene.add(this._group);
  }

  private _buildUnits(): void {
    const tl = this._timeline;

    // Attacker units (left side)
    for (let i = 0; i < tl.attackerSnapshot.length; i++) {
      const snap = tl.attackerSnapshot[i];
      const x = ATTACKER_X;
      const z = (i - (tl.attackerSnapshot.length - 1) / 2) * UNIT_SPACING;
      this._addUnit(snap, x, z, "attacker", snap.isHero ? 0x3366cc : 0x4488aa);
    }

    // Defender units (right side)
    for (let i = 0; i < tl.defenderSnapshot.length; i++) {
      const snap = tl.defenderSnapshot[i];
      const x = DEFENDER_X;
      const z = (i - (tl.defenderSnapshot.length - 1) / 2) * UNIT_SPACING;
      this._addUnit(snap, x, z, "defender", snap.isHero ? 0xcc3333 : 0xaa4444);
    }
  }

  private _addUnit(
    snap: { name: string; defId: string; hp: number; maxHp: number; isHero: boolean },
    x: number, z: number, side: "attacker" | "defender", color: number,
  ): void {
    const g = new THREE.Group();

    // Body
    const bodyH = snap.isHero ? 1.6 : 1.1;
    const bodyGeo = new THREE.CylinderGeometry(0.3, 0.4, bodyH, 8);
    const bodyMat = new THREE.MeshStandardMaterial({ color, roughness: 0.6, metalness: 0.3 });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = bodyH / 2;
    body.castShadow = true;
    g.add(body);

    // Head
    const headGeo = new THREE.SphereGeometry(0.25, 10, 8);
    const head = new THREE.Mesh(headGeo, new THREE.MeshStandardMaterial({ color: 0xffcc99, roughness: 0.7 }));
    head.position.y = bodyH + 0.15;
    g.add(head);

    // Hero crown
    if (snap.isHero) {
      const crown = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.04, 6, 8),
        new THREE.MeshStandardMaterial({ color: 0xffd700, emissive: 0xffd700, emissiveIntensity: 0.5 }));
      crown.rotation.x = Math.PI / 2;
      crown.position.y = bodyH + 0.35;
      g.add(crown);
    }

    // Face direction
    g.rotation.y = side === "attacker" ? Math.PI / 2 : -Math.PI / 2;

    // HP bar background
    const hpBgGeo = new THREE.PlaneGeometry(0.8, 0.08);
    const hpBg = new THREE.Mesh(hpBgGeo, new THREE.MeshBasicMaterial({ color: 0x333333, depthTest: false }));
    hpBg.position.set(0, bodyH + 0.6, 0);
    hpBg.rotation.y = -g.rotation.y; // face camera
    g.add(hpBg);

    // HP bar fill
    const hpFillGeo = new THREE.PlaneGeometry(0.8, 0.08);
    const hpFill = new THREE.Mesh(hpFillGeo, new THREE.MeshBasicMaterial({ color: 0x44cc44, depthTest: false }));
    hpFill.position.set(0, bodyH + 0.6, 0.01);
    hpFill.rotation.y = -g.rotation.y;
    g.add(hpFill);

    g.position.set(x, 0, z);
    this._group.add(g);

    this._units.push({
      mesh: g, side, baseX: x, baseZ: z,
      hp: snap.hp, maxHp: snap.maxHp,
      hpBar: hpFill, hpBg: hpBg,
      alive: true, flashTimer: 0, stepTimer: 0, stepTarget: 0,
      name: snap.name,
    });
  }

  private _buildOverlay(): void {
    this._overlay = document.createElement("div");
    this._overlay.style.cssText = "position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:30;font-family:'Segoe UI',sans-serif;";

    // Round text
    this._roundText = document.createElement("div");
    this._roundText.style.cssText = "position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);font-size:32px;font-weight:bold;color:#ffd700;text-shadow:0 2px 8px rgba(0,0,0,0.8);opacity:0;transition:opacity 0.3s;letter-spacing:4px;";
    this._overlay.appendChild(this._roundText);

    // Battle log
    this._logDiv = document.createElement("div");
    this._logDiv.style.cssText = "position:absolute;bottom:10px;left:10px;max-width:400px;max-height:150px;overflow-y:auto;font-size:11px;color:#ccc;background:rgba(0,0,0,0.6);padding:8px;border-radius:6px;pointer-events:auto;";
    this._overlay.appendChild(this._logDiv);

    // Skip button
    const skipBtn = document.createElement("button");
    skipBtn.textContent = "SKIP";
    skipBtn.style.cssText = "position:absolute;bottom:10px;right:10px;padding:8px 24px;font-size:14px;background:rgba(0,0,0,0.6);color:#ffd700;border:1px solid #ffd700;border-radius:4px;cursor:pointer;pointer-events:auto;letter-spacing:2px;";
    skipBtn.onclick = () => this.skip();
    this._overlay.appendChild(skipBtn);

    // Unit name labels
    const attackerLabel = document.createElement("div");
    attackerLabel.style.cssText = "position:absolute;top:10px;left:20px;font-size:16px;color:#4488ff;font-weight:bold;text-shadow:0 1px 4px rgba(0,0,0,0.8);";
    attackerLabel.textContent = "ATTACKER";
    this._overlay.appendChild(attackerLabel);

    const defenderLabel = document.createElement("div");
    defenderLabel.style.cssText = "position:absolute;top:10px;right:20px;font-size:16px;color:#ff4444;font-weight:bold;text-shadow:0 1px 4px rgba(0,0,0,0.8);";
    defenderLabel.textContent = "DEFENDER";
    this._overlay.appendChild(defenderLabel);

    document.body.appendChild(this._overlay);
  }

  tick(dt: number): void {
    if (this._done) return;
    this._clock += dt;

    // Process events
    while (this._eventIdx < this._timeline.events.length) {
      const ev = this._timeline.events[this._eventIdx];
      if (ev.time > this._clock) break;
      this._processEvent(ev);
      this._eventIdx++;
    }

    // Update unit animations
    for (const u of this._units) {
      // Step animation
      if (u.stepTimer > 0) {
        u.stepTimer -= dt;
        const progress = 1 - u.stepTimer / 0.3;
        const stepX = progress < 0.5 ? progress * 2 * u.stepTarget : (1 - (progress - 0.5) * 2) * u.stepTarget;
        u.mesh.position.x = u.baseX + stepX;
      }

      // Damage flash
      if (u.flashTimer > 0) {
        u.flashTimer -= dt;
        const body = u.mesh.children[0] as THREE.Mesh;
        if (body?.material) {
          (body.material as THREE.MeshStandardMaterial).emissive.setHex(u.flashTimer > 0 ? 0xff2222 : 0x000000);
          (body.material as THREE.MeshStandardMaterial).emissiveIntensity = u.flashTimer > 0 ? 2 : 0;
        }
      }

      // HP bar scale
      const ratio = Math.max(0, u.hp / u.maxHp);
      u.hpBar.scale.x = ratio;
      u.hpBar.position.x = -(1 - ratio) * 0.4;
      (u.hpBar.material as THREE.MeshBasicMaterial).color.setHex(ratio > 0.5 ? 0x44cc44 : ratio > 0.25 ? 0xccaa00 : 0xcc2222);

      // Dead: fall over
      if (!u.alive) {
        u.mesh.rotation.z = Math.min(u.mesh.rotation.z + dt * 3, Math.PI / 2);
        u.mesh.position.y = Math.max(-0.5, u.mesh.position.y - dt * 2);
      }
    }

    // Update damage popups
    for (let i = this._dmgPopups.length - 1; i >= 0; i--) {
      const p = this._dmgPopups[i];
      p.timer -= dt;
      const el = p.el;
      const progress = 1 - p.timer / 1.0;
      el.style.transform = `translate(-50%, -${50 + progress * 40}px)`;
      el.style.opacity = String(Math.max(0, 1 - progress));
      if (p.timer <= 0) {
        el.remove();
        this._dmgPopups.splice(i, 1);
      }
    }

    // Check completion
    if (this._eventIdx >= this._timeline.events.length && this._clock > this._timeline.totalDuration) {
      this._finish();
    }
  }

  private _processEvent(ev: BattleEvent): void {
    switch (ev.type) {
      case "round_start": {
        this._roundText.textContent = ev.message;
        this._roundText.style.opacity = "1";
        setTimeout(() => { this._roundText.style.opacity = "0"; }, 600);
        break;
      }
      case "attack":
      case "kill": {
        const actor = this._units[ev.actorIdx];
        const target = ev.targetIdx !== undefined ? this._units[ev.targetIdx] : null;
        if (actor && actor.alive) {
          // Step toward target
          actor.stepTimer = 0.3;
          actor.stepTarget = actor.side === "attacker" ? STEP_DISTANCE : -STEP_DISTANCE;
        }
        if (target && ev.damage) {
          target.hp = ev.hpAfter ?? (target.hp - ev.damage);
          target.flashTimer = 0.3;

          // Spawn damage number
          this._spawnDmgPopup(ev.damage, target.side === "attacker" ? 0.3 : 0.7, 0.4, "#ff4444");
        }
        if (ev.killed && target) {
          target.alive = false;
        }
        // Log
        this._addLog(ev.message, ev.killed ? "#ff6666" : "#cccccc");
        break;
      }
      case "dodge": {
        this._addLog(ev.message, "#88ccff");
        break;
      }
      case "ability": {
        this._addLog(ev.message, "#88ff88");
        break;
      }
      case "battle_end": {
        const resultText = this._timeline.result === "attacker_wins" ? "VICTORY!" :
          this._timeline.result === "defender_wins" ? "DEFEAT!" : "DRAW";
        const resultColor = this._timeline.result === "attacker_wins" ? "#44ff44" : this._timeline.result === "defender_wins" ? "#ff4444" : "#ffdd44";
        this._roundText.textContent = resultText;
        this._roundText.style.color = resultColor;
        this._roundText.style.fontSize = "48px";
        this._roundText.style.opacity = "1";
        break;
      }
    }
  }

  private _spawnDmgPopup(damage: number, xFrac: number, yFrac: number, color: string): void {
    const el = document.createElement("div");
    el.textContent = `-${damage}`;
    el.style.cssText = `position:absolute;top:${yFrac * 100}%;left:${xFrac * 100}%;font-size:24px;font-weight:bold;color:${color};text-shadow:0 2px 4px rgba(0,0,0,0.8);pointer-events:none;transform:translate(-50%,0);`;
    this._overlay.appendChild(el);
    this._dmgPopups.push({ el, timer: 1.0 });
  }

  private _addLog(text: string, color: string): void {
    const line = document.createElement("div");
    line.textContent = text;
    line.style.color = color;
    this._logDiv.appendChild(line);
    this._logDiv.scrollTop = this._logDiv.scrollHeight;
  }

  skip(): void {
    this._finish();
  }

  private _finish(): void {
    if (this._done) return;
    this._done = true;

    // Cleanup
    setTimeout(() => {
      this._scene.remove(this._group);
      this._group.traverse((child: any) => {
        if (child.geometry) child.geometry.dispose();
        if (child.material) {
          if (Array.isArray(child.material)) child.material.forEach((m: THREE.Material) => m.dispose());
          else child.material.dispose();
        }
      });
      this._overlay.remove();
      this._onComplete();
    }, 1500);
  }

  get isDone(): boolean { return this._done; }
}
