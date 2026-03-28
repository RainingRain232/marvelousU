// ---------------------------------------------------------------------------
// Age of Wonders — Visual Effects Manager (enhanced particles & spells)
// ---------------------------------------------------------------------------

import * as THREE from "three";
import { hexToWorld } from "../AoWTypes";
import type { AoWSceneManager } from "./AoWSceneManager";

interface ParticleEffect {
  mesh: THREE.Points;
  life: number;
  maxLife: number;
  velocities: Float32Array;
  type: string;
}

interface MeshEffect {
  mesh: THREE.Object3D;
  life: number;
  maxLife: number;
  type: string;
  update: (t: number, life: number) => void;
}

export class AoWFXManager {
  private _sceneManager: AoWSceneManager;
  private _particles: ParticleEffect[] = [];
  private _meshEffects: MeshEffect[] = [];
  private _time = 0;

  constructor(sceneManager: AoWSceneManager) {
    this._sceneManager = sceneManager;
  }

  // ---------------------------------------------------------------------------
  // Spell effects
  // ---------------------------------------------------------------------------

  spawnFireball(fromQ: number, fromR: number, toQ: number, toR: number, elevation: number): void {
    const from = hexToWorld(fromQ, fromR, elevation);
    const to = hexToWorld(toQ, toR, elevation);

    // Fireball core
    const coreMat = new THREE.MeshBasicMaterial({
      color: 0xffaa00,
      transparent: true,
      opacity: 0.95,
    });
    const core = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 8), coreMat);

    // Outer flame
    const flameMat = new THREE.MeshBasicMaterial({
      color: 0xff4400,
      transparent: true,
      opacity: 0.6,
    });
    const flame = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 8), flameMat);
    core.add(flame);

    // Bright inner glow
    const innerMat = new THREE.MeshBasicMaterial({
      color: 0xffffaa,
      transparent: true,
      opacity: 0.4,
    });
    const inner = new THREE.Mesh(new THREE.SphereGeometry(0.08, 12, 10), innerMat);
    core.add(inner);

    // Point light
    const light = new THREE.PointLight(0xff6600, 3, 6);
    core.add(light);

    core.position.set(from.x, from.y + 1.5, from.z);
    this._sceneManager.fxGroup.add(core);

    const dx = to.x - from.x;
    const dz = to.z - from.z;
    const dist = Math.sqrt(dx * dx + dz * dz);
    const duration = Math.max(0.5, dist * 0.12);

    // Trail particles spawned during flight
    let lastTrailTime = 0;

    this._meshEffects.push({
      mesh: core,
      life: duration,
      maxLife: duration,
      type: "fireball",
      update: (t, life) => {
        const progress = 1 - life / duration;
        core.position.x = from.x + dx * progress;
        core.position.z = from.z + dz * progress;
        core.position.y = from.y + 1.5 + Math.sin(progress * Math.PI) * 1.2;

        // Pulsing scale
        const scale = 1 + Math.sin(t * 15) * 0.15;
        core.scale.setScalar(scale);
        coreMat.opacity = 0.95 - progress * 0.2;
        light.intensity = 3 - progress * 1.5;

        // Rotation for visual interest
        core.rotation.x = t * 3;
        core.rotation.y = t * 5;

        // Spawn trail particles every 0.05s
        if (t - lastTrailTime > 0.05) {
          lastTrailTime = t;
          this._spawnTrailParticle(core.position.x, core.position.y, core.position.z, 0xff6600, 0.04);
        }
      },
    });

    // Initial fire burst particles
    this._spawnFireParticles(from.x, from.y + 1.5, from.z, 30);
  }

  spawnExplosion(q: number, r: number, elevation: number, color: number = 0xff4400): void {
    const pos = hexToWorld(q, r, elevation);

    // Explosion sphere
    const mat = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.8,
    });
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(0.1, 12, 12), mat);
    mesh.position.set(pos.x, pos.y + 0.5, pos.z);
    this._sceneManager.fxGroup.add(mesh);

    // White center flash
    const flashMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.9,
    });
    const flashMesh = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 8), flashMat);
    mesh.add(flashMesh);

    // Flash light
    const light = new THREE.PointLight(color, 4, 8);
    mesh.add(light);

    // Secondary colored light
    const light2 = new THREE.PointLight(0xffffff, 2, 4);
    mesh.add(light2);

    this._meshEffects.push({
      mesh,
      life: 0.8,
      maxLife: 0.8,
      type: "explosion",
      update: (_t, life) => {
        const progress = 1 - life / 0.8;
        const scale = 0.1 + progress * 3.0;
        mesh.scale.setScalar(scale);
        mat.opacity = 0.8 * (1 - progress * progress);
        flashMat.opacity = 0.9 * Math.max(0, 1 - progress * 3);
        light.intensity = 4 * (1 - progress);
        light2.intensity = 2 * Math.max(0, 1 - progress * 2);
      },
    });

    // Explosion particles
    this._spawnExplosionParticles(pos.x, pos.y + 0.5, pos.z, color, 60);

    // Debris fragments
    this._spawnDebris(pos.x, pos.y + 0.5, pos.z, color);

    // Shockwave ring
    this._spawnShockwave(pos.x, pos.y + 0.35, pos.z, color);
  }

  spawnHealEffect(q: number, r: number, elevation: number): void {
    const pos = hexToWorld(q, r, elevation);

    // Spiral green particles rising upward
    const count = 50;
    const positions = new Float32Array(count * 3);
    const velocities = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 6; // 3 full spirals
      const radius = 0.15 + (i / count) * 0.35;
      positions[i * 3] = pos.x + Math.cos(angle) * radius;
      positions[i * 3 + 1] = pos.y + 0.3 + (i / count) * 0.1;
      positions[i * 3 + 2] = pos.z + Math.sin(angle) * radius;
      // Spiral upward motion
      velocities[i * 3] = Math.cos(angle + Math.PI / 2) * 0.3;
      velocities[i * 3 + 1] = 1.0 + Math.random() * 1.5;
      velocities[i * 3 + 2] = Math.sin(angle + Math.PI / 2) * 0.3;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    const mat = new THREE.PointsMaterial({
      color: 0x44ff44,
      size: 0.1,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
    });
    const points = new THREE.Points(geo, mat);
    this._sceneManager.fxGroup.add(points);

    this._particles.push({
      mesh: points,
      life: 1.8,
      maxLife: 1.8,
      velocities,
      type: "heal",
    });

    // Golden sparkle particles interspersed
    const sparkCount = 20;
    const sparkPos = new Float32Array(sparkCount * 3);
    const sparkVel = new Float32Array(sparkCount * 3);
    for (let i = 0; i < sparkCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const r = Math.random() * 0.4;
      sparkPos[i * 3] = pos.x + Math.cos(angle) * r;
      sparkPos[i * 3 + 1] = pos.y + 0.3 + Math.random() * 0.3;
      sparkPos[i * 3 + 2] = pos.z + Math.sin(angle) * r;
      sparkVel[i * 3] = (Math.random() - 0.5) * 0.2;
      sparkVel[i * 3 + 1] = 1.5 + Math.random() * 2;
      sparkVel[i * 3 + 2] = (Math.random() - 0.5) * 0.2;
    }
    const sparkGeo = new THREE.BufferGeometry();
    sparkGeo.setAttribute("position", new THREE.BufferAttribute(sparkPos, 3));
    const sparkMat = new THREE.PointsMaterial({
      color: 0xffdd44,
      size: 0.06,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
    });
    const sparkPoints = new THREE.Points(sparkGeo, sparkMat);
    this._sceneManager.fxGroup.add(sparkPoints);
    this._particles.push({
      mesh: sparkPoints,
      life: 1.5,
      maxLife: 1.5,
      velocities: sparkVel,
      type: "sparkle",
    });

    // Heal glow column
    const columnMat = new THREE.MeshBasicMaterial({
      color: 0x44ff44,
      transparent: true,
      opacity: 0.15,
    });
    const column = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.1, 2, 8), columnMat);
    column.position.set(pos.x, pos.y + 1.2, pos.z);
    this._sceneManager.fxGroup.add(column);

    this._meshEffects.push({
      mesh: column,
      life: 1.5,
      maxLife: 1.5,
      type: "heal_column",
      update: (_t, life) => {
        const progress = 1 - life / 1.5;
        columnMat.opacity = 0.15 * (1 - progress * progress);
        column.scale.y = 1 + progress * 0.5;
        column.rotation.y = progress * Math.PI * 2;
      },
    });
  }

  spawnIceEffect(q: number, r: number, elevation: number): void {
    const pos = hexToWorld(q, r, elevation);

    const iceMat = new THREE.MeshStandardMaterial({
      color: 0x88ccff,
      transparent: true,
      opacity: 0.7,
      metalness: 0.6,
      roughness: 0.1,
      emissive: 0x4488cc,
      emissiveIntensity: 0.2,
    });

    const group = new THREE.Group();
    group.position.set(pos.x, pos.y, pos.z);

    // More crystals with varied sizes
    for (let i = 0; i < 8; i++) {
      const angle = (Math.PI * 2 / 8) * i + Math.random() * 0.3;
      const r2 = 0.2 + Math.random() * 0.2;
      const height = 0.1 + Math.random() * 0.12;
      const crystal = new THREE.Mesh(
        new THREE.OctahedronGeometry(height, 0),
        iceMat,
      );
      crystal.position.set(
        Math.cos(angle) * r2,
        0.3 + Math.random() * 0.4,
        Math.sin(angle) * r2,
      );
      crystal.rotation.set(Math.random(), Math.random(), Math.random());
      crystal.castShadow = true;
      group.add(crystal);
    }

    // Central ice spike
    const spike = new THREE.Mesh(
      new THREE.ConeGeometry(0.08, 0.4, 10),
      iceMat,
    );
    spike.position.y = 0.5;
    group.add(spike);

    this._sceneManager.fxGroup.add(group);
    const light = new THREE.PointLight(0x88ccff, 1.5, 5);
    light.position.y = 0.5;
    group.add(light);

    // Frost particles
    this._spawnFrostParticles(pos.x, pos.y + 0.5, pos.z);

    this._meshEffects.push({
      mesh: group,
      life: 2.0,
      maxLife: 2.0,
      type: "ice",
      update: (t, life) => {
        const progress = 1 - life / 2.0;
        if (progress < 0.2) {
          group.scale.setScalar(progress / 0.2);
        } else if (progress > 0.7) {
          const fade = (1 - progress) / 0.3;
          group.scale.setScalar(fade);
          iceMat.opacity = 0.7 * fade;
        }
        group.rotation.y = t * 0.8;
        light.intensity = 1.5 * (1 - progress);
        iceMat.emissiveIntensity = 0.2 + Math.sin(t * 4) * 0.1;
      },
    });
  }

  spawnLightningEffect(q: number, r: number, elevation: number): void {
    const pos = hexToWorld(q, r, elevation);

    // Main bolt with jagged segments
    const mainBolt = this._createLightningBolt(
      pos.x, pos.y + 5, pos.z,
      pos.x, pos.y + 0.3, pos.z,
      10, 0.25,
    );
    this._sceneManager.fxGroup.add(mainBolt);

    // Branch bolts
    for (let b = 0; b < 3; b++) {
      const startY = pos.y + 2 + Math.random() * 2;
      const endX = pos.x + (Math.random() - 0.5) * 1.5;
      const endZ = pos.z + (Math.random() - 0.5) * 1.5;
      const branch = this._createLightningBolt(
        pos.x + (Math.random() - 0.5) * 0.3, startY, pos.z + (Math.random() - 0.5) * 0.3,
        endX, pos.y + 0.5, endZ,
        5, 0.15,
      );
      this._sceneManager.fxGroup.add(branch);

      this._meshEffects.push({
        mesh: branch,
        life: 0.25,
        maxLife: 0.25,
        type: "lightning_branch",
        update: (_t, life) => {
          const m = branch.children[0] as THREE.Line;
          if (m) {
            (m.material as THREE.LineBasicMaterial).opacity = life / 0.25;
          }
        },
      });
    }

    // Bright flash
    const flash = new THREE.PointLight(0xaaaaff, 8, 15);
    flash.position.set(pos.x, pos.y + 2, pos.z);
    this._sceneManager.fxGroup.add(flash);

    // Ground impact light
    const impactLight = new THREE.PointLight(0xffff88, 4, 6);
    impactLight.position.set(pos.x, pos.y + 0.3, pos.z);
    this._sceneManager.fxGroup.add(impactLight);

    // Electric sparks at impact
    this._spawnElectricSparks(pos.x, pos.y + 0.3, pos.z);

    this._meshEffects.push({
      mesh: mainBolt,
      life: 0.35,
      maxLife: 0.35,
      type: "lightning",
      update: (_t, life) => {
        const progress = 1 - life / 0.35;
        const m = mainBolt.children[0] as THREE.Line;
        if (m) {
          (m.material as THREE.LineBasicMaterial).opacity = 1 - progress;
        }
        flash.intensity = 8 * (1 - progress);
        impactLight.intensity = 4 * (1 - progress);
        if (life <= 0) {
          this._sceneManager.fxGroup.remove(flash);
          this._sceneManager.fxGroup.remove(impactLight);
        }
      },
    });
  }

  spawnCombatSlash(q: number, r: number, elevation: number): void {
    const pos = hexToWorld(q, r, elevation);

    // Multiple slash arcs for dramatic effect
    for (let s = 0; s < 2; s++) {
      const offset = s * 0.15;
      const curve = new THREE.QuadraticBezierCurve3(
        new THREE.Vector3(pos.x - 0.4 + offset, pos.y + 0.6 + offset, pos.z - 0.1 * s),
        new THREE.Vector3(pos.x + offset * 0.5, pos.y + 1.3, pos.z),
        new THREE.Vector3(pos.x + 0.4 - offset, pos.y + 0.5 - offset, pos.z + 0.1 * s),
      );
      const points = curve.getPoints(16);
      const geo = new THREE.BufferGeometry().setFromPoints(points);
      const mat = new THREE.LineBasicMaterial({
        color: s === 0 ? 0xffffff : 0xffcc44,
        transparent: true,
        opacity: 0.9 - s * 0.3,
      });
      const line = new THREE.Line(geo, mat);
      this._sceneManager.fxGroup.add(line);

      this._meshEffects.push({
        mesh: line,
        life: 0.35,
        maxLife: 0.35,
        type: "slash",
        update: (_t, life) => {
          mat.opacity = (life / 0.35) * (0.9 - s * 0.3);
        },
      });
    }

    // Spark particles from impact
    this._spawnSlashSparks(pos.x, pos.y + 0.8, pos.z);
  }

  // ---------------------------------------------------------------------------
  // Lightning bolt generator
  // ---------------------------------------------------------------------------

  private _createLightningBolt(
    x1: number, y1: number, z1: number,
    x2: number, y2: number, z2: number,
    segments: number, jitter: number,
  ): THREE.Group {
    const group = new THREE.Group();
    const points: THREE.Vector3[] = [];

    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      const x = x1 + (x2 - x1) * t + (i > 0 && i < segments ? (Math.random() - 0.5) * jitter : 0);
      const y = y1 + (y2 - y1) * t;
      const z = z1 + (z2 - z1) * t + (i > 0 && i < segments ? (Math.random() - 0.5) * jitter : 0);
      points.push(new THREE.Vector3(x, y, z));
    }

    // Main line (bright)
    const geo = new THREE.BufferGeometry().setFromPoints(points);
    const mat = new THREE.LineBasicMaterial({
      color: 0xccccff,
      transparent: true,
      opacity: 1,
    });
    const line = new THREE.Line(geo, mat);
    group.add(line);

    // Glow line (wider, dimmer) using a tube
    const curve = new THREE.CatmullRomCurve3(points);
    const tubeGeo = new THREE.TubeGeometry(curve, segments * 2, 0.03, 4, false);
    const glowMat = new THREE.MeshBasicMaterial({
      color: 0x8888ff,
      transparent: true,
      opacity: 0.3,
    });
    const tube = new THREE.Mesh(tubeGeo, glowMat);
    group.add(tube);

    return group;
  }

  // ---------------------------------------------------------------------------
  // Particle helpers
  // ---------------------------------------------------------------------------

  private _spawnTrailParticle(x: number, y: number, z: number, color: number, size: number): void {
    const count = 5;
    const positions = new Float32Array(count * 3);
    const velocities = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      positions[i * 3] = x + (Math.random() - 0.5) * 0.08;
      positions[i * 3 + 1] = y + (Math.random() - 0.5) * 0.08;
      positions[i * 3 + 2] = z + (Math.random() - 0.5) * 0.08;
      velocities[i * 3] = (Math.random() - 0.5) * 0.3;
      velocities[i * 3 + 1] = Math.random() * 0.5;
      velocities[i * 3 + 2] = (Math.random() - 0.5) * 0.3;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    const mat = new THREE.PointsMaterial({
      color,
      size,
      transparent: true,
      opacity: 0.7,
      blending: THREE.AdditiveBlending,
    });
    const points = new THREE.Points(geo, mat);
    this._sceneManager.fxGroup.add(points);
    this._particles.push({ mesh: points, life: 0.5, maxLife: 0.5, velocities, type: "trail" });
  }

  private _spawnFireParticles(x: number, y: number, z: number, count: number = 20): void {
    const positions = new Float32Array(count * 3);
    const velocities = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      positions[i * 3] = x + (Math.random() - 0.5) * 0.2;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z + (Math.random() - 0.5) * 0.2;
      velocities[i * 3] = (Math.random() - 0.5) * 0.8;
      velocities[i * 3 + 1] = Math.random() * 2;
      velocities[i * 3 + 2] = (Math.random() - 0.5) * 0.8;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    const mat = new THREE.PointsMaterial({
      color: 0xff6600,
      size: 0.07,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
    });
    const points = new THREE.Points(geo, mat);
    this._sceneManager.fxGroup.add(points);

    this._particles.push({
      mesh: points,
      life: 1.0,
      maxLife: 1.0,
      velocities,
      type: "fire",
    });
  }

  private _spawnExplosionParticles(x: number, y: number, z: number, color: number, count: number = 40): void {
    const positions = new Float32Array(count * 3);
    const velocities = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;
      const angle = Math.random() * Math.PI * 2;
      const elev = (Math.random() - 0.3) * Math.PI;
      const speed = 1.5 + Math.random() * 4;
      velocities[i * 3] = Math.cos(angle) * Math.cos(elev) * speed;
      velocities[i * 3 + 1] = Math.sin(elev) * speed + 1;
      velocities[i * 3 + 2] = Math.sin(angle) * Math.cos(elev) * speed;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    const mat = new THREE.PointsMaterial({
      color,
      size: 0.06,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
    });
    const points = new THREE.Points(geo, mat);
    this._sceneManager.fxGroup.add(points);

    this._particles.push({
      mesh: points,
      life: 1.2,
      maxLife: 1.2,
      velocities,
      type: "explosion",
    });
  }

  private _spawnDebris(x: number, y: number, z: number, color: number): void {
    // Solid fragments flying outward
    const debrisCount = 8;
    for (let i = 0; i < debrisCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 2 + Math.random() * 3;
      const upSpeed = 2 + Math.random() * 4;

      const geo = new THREE.BoxGeometry(
        0.02 + Math.random() * 0.04,
        0.02 + Math.random() * 0.04,
        0.02 + Math.random() * 0.04,
      );
      const mat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(color).lerp(new THREE.Color(0x333333), Math.random() * 0.5).getHex(),
        flatShading: true,
      });
      const debris = new THREE.Mesh(geo, mat);
      debris.position.set(x, y, z);
      debris.castShadow = true;
      this._sceneManager.fxGroup.add(debris);

      const vx = Math.cos(angle) * speed;
      const vz = Math.sin(angle) * speed;
      let vy = upSpeed;
      const rotSpeed = new THREE.Vector3(
        (Math.random() - 0.5) * 10,
        (Math.random() - 0.5) * 10,
        (Math.random() - 0.5) * 10,
      );

      this._meshEffects.push({
        mesh: debris,
        life: 1.5,
        maxLife: 1.5,
        type: "debris",
        update: (_t, life) => {
          const dt2 = 0.016;
          debris.position.x += vx * dt2;
          debris.position.y += vy * dt2;
          debris.position.z += vz * dt2;
          vy -= 9.8 * dt2;
          debris.rotation.x += rotSpeed.x * dt2;
          debris.rotation.y += rotSpeed.y * dt2;
          debris.rotation.z += rotSpeed.z * dt2;

          // Fade near end
          const progress = 1 - life / 1.5;
          if (progress > 0.7) {
            mat.opacity = (1 - progress) / 0.3;
            mat.transparent = true;
          }

          // Stop at ground
          if (debris.position.y < 0.3) {
            debris.position.y = 0.3;
            vy = 0;
          }
        },
      });
    }
  }

  private _spawnShockwave(x: number, y: number, z: number, color: number): void {
    const ringMat = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.5,
      side: THREE.DoubleSide,
    });
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.05, 0.12, 24),
      ringMat,
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(x, y, z);
    this._sceneManager.fxGroup.add(ring);

    this._meshEffects.push({
      mesh: ring,
      life: 0.6,
      maxLife: 0.6,
      type: "shockwave",
      update: (_t, life) => {
        const progress = 1 - life / 0.6;
        const scale = 1 + progress * 15;
        ring.scale.set(scale, scale, 1);
        ringMat.opacity = 0.5 * (1 - progress);
      },
    });
  }

  private _spawnFrostParticles(x: number, y: number, z: number): void {
    const count = 30;
    const positions = new Float32Array(count * 3);
    const velocities = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const r = Math.random() * 0.5;
      positions[i * 3] = x + Math.cos(angle) * r;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z + Math.sin(angle) * r;
      velocities[i * 3] = (Math.random() - 0.5) * 0.5;
      velocities[i * 3 + 1] = -0.5 + Math.random() * 1.5;
      velocities[i * 3 + 2] = (Math.random() - 0.5) * 0.5;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    const mat = new THREE.PointsMaterial({
      color: 0xccddff,
      size: 0.05,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending,
    });
    const points = new THREE.Points(geo, mat);
    this._sceneManager.fxGroup.add(points);

    this._particles.push({
      mesh: points,
      life: 2.0,
      maxLife: 2.0,
      velocities,
      type: "frost",
    });
  }

  private _spawnElectricSparks(x: number, y: number, z: number): void {
    const count = 25;
    const positions = new Float32Array(count * 3);
    const velocities = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;
      const angle = Math.random() * Math.PI * 2;
      const speed = 1 + Math.random() * 4;
      velocities[i * 3] = Math.cos(angle) * speed;
      velocities[i * 3 + 1] = Math.random() * 3;
      velocities[i * 3 + 2] = Math.sin(angle) * speed;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    const mat = new THREE.PointsMaterial({
      color: 0xffffaa,
      size: 0.04,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
    });
    const points = new THREE.Points(geo, mat);
    this._sceneManager.fxGroup.add(points);

    this._particles.push({
      mesh: points,
      life: 0.5,
      maxLife: 0.5,
      velocities,
      type: "electric",
    });
  }

  private _spawnSlashSparks(x: number, y: number, z: number): void {
    const count = 15;
    const positions = new Float32Array(count * 3);
    const velocities = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;
      velocities[i * 3] = (Math.random() - 0.5) * 2;
      velocities[i * 3 + 1] = Math.random() * 2;
      velocities[i * 3 + 2] = (Math.random() - 0.5) * 2;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    const mat = new THREE.PointsMaterial({
      color: 0xffffcc,
      size: 0.04,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
    });
    const points = new THREE.Points(geo, mat);
    this._sceneManager.fxGroup.add(points);

    this._particles.push({
      mesh: points,
      life: 0.4,
      maxLife: 0.4,
      velocities,
      type: "slash_sparks",
    });
  }

  // ---------------------------------------------------------------------------
  // Tick
  // ---------------------------------------------------------------------------

  tick(dt: number): void {
    this._time += dt;

    // Update particles
    for (let i = this._particles.length - 1; i >= 0; i--) {
      const p = this._particles[i];
      p.life -= dt;

      if (p.life <= 0) {
        this._sceneManager.fxGroup.remove(p.mesh);
        p.mesh.geometry.dispose();
        this._particles.splice(i, 1);
        continue;
      }

      // Move particles
      const posArr = p.mesh.geometry.attributes.position.array as Float32Array;
      for (let j = 0; j < posArr.length / 3; j++) {
        posArr[j * 3] += p.velocities[j * 3] * dt;
        posArr[j * 3 + 1] += p.velocities[j * 3 + 1] * dt;
        posArr[j * 3 + 2] += p.velocities[j * 3 + 2] * dt;
        // Gravity
        p.velocities[j * 3 + 1] -= 2 * dt;
      }
      p.mesh.geometry.attributes.position.needsUpdate = true;

      // Fade
      const progress = 1 - p.life / p.maxLife;
      (p.mesh.material as THREE.PointsMaterial).opacity = (1 - progress * progress) * 0.9;
    }

    // Update mesh effects
    for (let i = this._meshEffects.length - 1; i >= 0; i--) {
      const e = this._meshEffects[i];
      e.life -= dt;
      e.update(this._time, e.life);

      if (e.life <= 0) {
        this._sceneManager.fxGroup.remove(e.mesh);
        this._meshEffects.splice(i, 1);
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Cleanup
  // ---------------------------------------------------------------------------

  clear(): void {
    for (const p of this._particles) {
      this._sceneManager.fxGroup.remove(p.mesh);
      p.mesh.geometry.dispose();
    }
    this._particles = [];
    for (const e of this._meshEffects) {
      this._sceneManager.fxGroup.remove(e.mesh);
    }
    this._meshEffects = [];
  }
}
