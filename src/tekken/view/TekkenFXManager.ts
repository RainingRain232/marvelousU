// ---------------------------------------------------------------------------
// Tekken mode – Visual effects manager
// Hit sparks, block sparks, counter-hit flash, dust particles, weapon trails
// ---------------------------------------------------------------------------

import * as THREE from "three";
import type { TekkenSceneManager } from "./TekkenSceneManager";

interface Particle {
  mesh: THREE.Mesh;
  velocity: THREE.Vector3;
  life: number;
  maxLife: number;
  gravity: number;
  shrink: boolean;
  rotationSpeed?: THREE.Vector3;
}

interface GroundCrack {
  mesh: THREE.Mesh;
  life: number;
  maxLife: number;
}

interface TrailPoint {
  position: THREE.Vector3;
  time: number;
}

interface WeaponTrail {
  points: TrailPoint[];
  mesh: THREE.Mesh;
  material: THREE.MeshBasicMaterial;
  glowMesh: THREE.Mesh;
  glowMaterial: THREE.MeshBasicMaterial;
  maxPoints: number;
  active: boolean;
  color: THREE.Color;
  fadeTimer: number;
  frameCounter: number;
}

/** Animated mesh that scales/fades over its lifetime */
interface AnimatedEffect {
  mesh: THREE.Mesh;
  life: number;
  maxLife: number;
  type: "flash" | "radialLine" | "pillar" | "clashLine" | "blockRing" | "shard" | "glowLine";
  /** Per-frame update callback */
  onUpdate: (effect: AnimatedEffect, t: number) => void;
}

/** Debris mesh with simple physics */
interface Debris {
  mesh: THREE.Mesh;
  velocity: THREE.Vector3;
  life: number;
  maxLife: number;
  gravity: number;
  bounces: number;
  groundY: number;
}

/** Delayed effect spawn */
interface DelayedEffect {
  delay: number;
  callback: () => void;
}

export class TekkenFXManager {
  private _scene: TekkenSceneManager;
  private _particles: Particle[] = [];
  private _particlePool: THREE.Mesh[] = [];
  private _emberPool: THREE.Mesh[] = [];
  private _counterFlashMesh: THREE.Mesh | null = null;
  private _counterFlashLife = 0;

  // Ground cracks for knockdowns
  private _groundCracks: GroundCrack[] = [];

  // Weapon trails (one per fighter)
  private _trails: WeaponTrail[] = [];

  // Animated effects (flash spheres, radial lines, pillars, etc.)
  private _animatedEffects: AnimatedEffect[] = [];

  // Debris meshes with physics
  private _debris: Debris[] = [];

  // Delayed effect spawns
  private _delayedEffects: DelayedEffect[] = [];

  // Shared materials
  private _sparkMat: THREE.MeshBasicMaterial;
  private _blockSparkMat: THREE.MeshBasicMaterial;
  private _counterSparkMat: THREE.MeshBasicMaterial;
  private _dustMat: THREE.MeshBasicMaterial;
  private _emberMat: THREE.MeshBasicMaterial;
  private _hotSparkMat: THREE.MeshBasicMaterial;
  private _smokeMat: THREE.MeshBasicMaterial;
  // @ts-ignore reserved for future additive effects
  private _additiveMat: THREE.MeshBasicMaterial;

  // Shared geometries for reuse
  private _shardGeo: THREE.BoxGeometry;
  private _debrisGeo: THREE.BoxGeometry;
  private _flashSphereGeo: THREE.SphereGeometry;

  constructor(sceneManager: TekkenSceneManager) {
    this._scene = sceneManager;

    this._sparkMat = new THREE.MeshBasicMaterial({ color: 0xffaa33, transparent: true, opacity: 1 });
    this._blockSparkMat = new THREE.MeshBasicMaterial({ color: 0x88bbff, transparent: true, opacity: 1 });
    this._counterSparkMat = new THREE.MeshBasicMaterial({ color: 0xff2200, transparent: true, opacity: 1 });
    this._dustMat = new THREE.MeshBasicMaterial({ color: 0x998877, transparent: true, opacity: 0.6 });
    this._emberMat = new THREE.MeshBasicMaterial({ color: 0xff6622, transparent: true, opacity: 0.8 });
    this._hotSparkMat = new THREE.MeshBasicMaterial({ color: 0xffffaa, transparent: true, opacity: 1 });
    this._smokeMat = new THREE.MeshBasicMaterial({ color: 0x444444, transparent: true, opacity: 0.35 });
    this._additiveMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    // Shared geometries
    this._shardGeo = new THREE.BoxGeometry(0.02, 0.005, 0.015);
    this._debrisGeo = new THREE.BoxGeometry(0.02, 0.02, 0.02);
    this._flashSphereGeo = new THREE.SphereGeometry(0.15, 12, 8);

    // Pre-allocate particle pool (300 particles with variety)
    const sphereGeo = new THREE.SphereGeometry(0.03, 8, 6);
    const octaGeo = new THREE.OctahedronGeometry(0.03);
    for (let i = 0; i < 300; i++) {
      const geo = (i % 4 === 0) ? octaGeo : sphereGeo;
      const mesh = new THREE.Mesh(geo, this._sparkMat.clone());
      mesh.visible = false;
      sceneManager.scene.add(mesh);
      this._particlePool.push(mesh);
    }

    // Secondary "ember" pool – smaller particles with additive blending
    const emberGeo = new THREE.SphereGeometry(0.015, 6, 4);
    for (let i = 0; i < 60; i++) {
      const mat = new THREE.MeshBasicMaterial({
        color: 0xff8833,
        transparent: true,
        opacity: 0.9,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      // Give them a slight emissive look via brighter base color
      mat.color.setHex(0xffaa55);
      const mesh = new THREE.Mesh(emberGeo, mat);
      mesh.visible = false;
      sceneManager.scene.add(mesh);
      this._emberPool.push(mesh);
    }

    // Counter-hit flash (full-screen quad)
    const flashGeo = new THREE.PlaneGeometry(20, 20);
    const flashMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide,
      depthTest: false,
      depthWrite: false,
    });
    this._counterFlashMesh = new THREE.Mesh(flashGeo, flashMat);
    this._counterFlashMesh.renderOrder = 999;
    this._counterFlashMesh.position.z = 4; // in front of camera
    sceneManager.scene.add(this._counterFlashMesh);

    // Pre-allocate weapon trails (one per fighter)
    for (let i = 0; i < 2; i++) {
      const maxPts = 20;
      const trailGeo = new THREE.BufferGeometry();
      const positions = new Float32Array(maxPts * 2 * 3); // 2 verts per point, xyz
      const colors = new Float32Array(maxPts * 2 * 4); // rgba
      const indices: number[] = [];
      for (let j = 0; j < maxPts - 1; j++) {
        const base = j * 2;
        indices.push(base, base + 1, base + 2, base + 1, base + 3, base + 2);
      }
      trailGeo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
      trailGeo.setAttribute("color", new THREE.BufferAttribute(colors, 4));
      trailGeo.setIndex(indices);

      const trailMat = new THREE.MeshBasicMaterial({
        vertexColors: true,
        transparent: true,
        side: THREE.DoubleSide,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });

      const trailMesh = new THREE.Mesh(trailGeo, trailMat);
      trailMesh.frustumCulled = false;
      trailMesh.visible = false;
      sceneManager.scene.add(trailMesh);

      // Glow trail (wider, lower opacity duplicate)
      const glowGeo = new THREE.BufferGeometry();
      const glowPositions = new Float32Array(maxPts * 2 * 3);
      const glowColors = new Float32Array(maxPts * 2 * 4);
      const glowIndices: number[] = [];
      for (let j = 0; j < maxPts - 1; j++) {
        const base = j * 2;
        glowIndices.push(base, base + 1, base + 2, base + 1, base + 3, base + 2);
      }
      glowGeo.setAttribute("position", new THREE.BufferAttribute(glowPositions, 3));
      glowGeo.setAttribute("color", new THREE.BufferAttribute(glowColors, 4));
      glowGeo.setIndex(glowIndices);

      const glowMat = new THREE.MeshBasicMaterial({
        vertexColors: true,
        transparent: true,
        side: THREE.DoubleSide,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });

      const glowMesh = new THREE.Mesh(glowGeo, glowMat);
      glowMesh.frustumCulled = false;
      glowMesh.visible = false;
      sceneManager.scene.add(glowMesh);

      this._trails.push({
        points: [],
        mesh: trailMesh,
        material: trailMat,
        glowMesh,
        glowMaterial: glowMat,
        maxPoints: maxPts,
        active: false,
        color: new THREE.Color(0xffaa33),
        fadeTimer: 0,
        frameCounter: 0,
      });
    }
  }

  private _getParticleMesh(): THREE.Mesh | null {
    for (const mesh of this._particlePool) {
      if (!mesh.visible) return mesh;
    }
    return null;
  }

  private _getEmberMesh(): THREE.Mesh | null {
    for (const mesh of this._emberPool) {
      if (!mesh.visible) return mesh;
    }
    return null;
  }

  spawnHitSpark(x: number, y: number, z: number, count: number, isCounterHit: boolean): void {
    const mat = isCounterHit ? this._counterSparkMat : this._sparkMat;
    // Double the count parameter, then apply existing 1.5x multiplier
    const totalCount = Math.floor(count * 2 * 1.5);

    for (let i = 0; i < totalCount; i++) {
      const mesh = this._getParticleMesh();
      if (!mesh) break;

      mesh.visible = true;
      mesh.position.set(x, y, z);
      // Hot-white center sparks for first few, colored for the rest
      const isCenter = i < Math.ceil(totalCount * 0.25);
      mesh.scale.setScalar(isCenter ? 1.2 + Math.random() * 0.8 : 0.6 + Math.random() * 1.0);
      (mesh.material as THREE.MeshBasicMaterial).color.copy(
        isCenter ? this._hotSparkMat.color : mat.color,
      );
      (mesh.material as THREE.MeshBasicMaterial).opacity = 1;

      const angle = Math.random() * Math.PI * 2;
      const speed = 0.025 + Math.random() * 0.08;
      const upSpeed = 0.015 + Math.random() * 0.05;

      const vel = new THREE.Vector3(
        Math.cos(angle) * speed,
        upSpeed,
        Math.sin(angle) * speed * 0.5,
      );

      this._particles.push({
        mesh,
        velocity: vel.clone(),
        life: 0,
        maxLife: 10 + Math.random() * 15,
        gravity: 0.0025,
        shrink: true,
        rotationSpeed: new THREE.Vector3(
          (Math.random() - 0.5) * 0.3,
          (Math.random() - 0.5) * 0.3,
          0,
        ),
      });

      // Spark trails: 1-2 sub-particles trailing behind each spark
      const subCount = 1 + Math.floor(Math.random() * 2);
      for (let s = 0; s < subCount; s++) {
        const sub = this._getEmberMesh();
        if (!sub) break;
        sub.visible = true;
        sub.position.set(x, y, z);
        sub.scale.setScalar(0.3 + Math.random() * 0.3);
        (sub.material as THREE.MeshBasicMaterial).color.copy(mat.color);
        (sub.material as THREE.MeshBasicMaterial).opacity = 0.7;
        this._particles.push({
          mesh: sub,
          velocity: vel.clone().multiplyScalar(0.5 + Math.random() * 0.3),
          life: 0,
          maxLife: 6 + Math.random() * 8,
          gravity: 0.002,
          shrink: true,
        });
      }
    }

    // Brief flash sphere at impact point
    this._spawnFlashSphere(x, y, z, isCounterHit ? 0xff4400 : 0xffdd88, 0.3, 4);

    // Smoke puffs at hit location
    this._spawnSmokePuffs(x, y, z, 3 + Math.floor(Math.random() * 2));

    // Counter-hit special: ring of 12 particles expanding in a perfect circle
    if (isCounterHit) {
      const ringCount = 12;
      for (let i = 0; i < ringCount; i++) {
        const mesh = this._getParticleMesh();
        if (!mesh) break;
        mesh.visible = true;
        mesh.position.set(x, y, z);
        mesh.scale.setScalar(0.8 + Math.random() * 0.4);
        // Bright orange/white
        (mesh.material as THREE.MeshBasicMaterial).color.setHex(0xffcc66);
        (mesh.material as THREE.MeshBasicMaterial).opacity = 1;

        const ringAngle = (i / ringCount) * Math.PI * 2;
        const ringSpeed = 0.06;
        this._particles.push({
          mesh,
          velocity: new THREE.Vector3(
            Math.cos(ringAngle) * ringSpeed,
            0,
            Math.sin(ringAngle) * ringSpeed,
          ),
          life: 0,
          maxLife: 12 + Math.random() * 4,
          gravity: 0,
          shrink: true,
          rotationSpeed: new THREE.Vector3(0.2, 0.2, 0),
        });
      }
    }

    // Spawn lingering embers on hits
    this._spawnEmbers(x, y, z, isCounterHit ? 6 : 3);
  }

  /** Spawn a brief flash sphere that scales up then fades */
  private _spawnFlashSphere(x: number, y: number, z: number, color: number, maxScale: number, frames: number): void {
    const mat = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const mesh = new THREE.Mesh(this._flashSphereGeo, mat);
    mesh.position.set(x, y, z);
    mesh.scale.setScalar(0.01);
    this._scene.scene.add(mesh);

    this._animatedEffects.push({
      mesh,
      life: 0,
      maxLife: frames,
      type: "flash",
      onUpdate: (effect, t) => {
        const scale = maxScale * t;
        effect.mesh.scale.setScalar(scale);
        (effect.mesh.material as THREE.MeshBasicMaterial).opacity = (1 - t) * 0.9;
      },
    });
  }

  /** Spawn smoke puffs that drift upward slowly */
  private _spawnSmokePuffs(x: number, y: number, z: number, count: number): void {
    for (let i = 0; i < count; i++) {
      const mesh = this._getParticleMesh();
      if (!mesh) break;
      mesh.visible = true;
      mesh.position.set(
        x + (Math.random() - 0.5) * 0.1,
        y + (Math.random() - 0.5) * 0.05,
        z + (Math.random() - 0.5) * 0.05,
      );
      mesh.scale.setScalar(2.0 + Math.random() * 1.0);
      (mesh.material as THREE.MeshBasicMaterial).color.copy(this._smokeMat.color);
      (mesh.material as THREE.MeshBasicMaterial).opacity = 0.3;

      this._particles.push({
        mesh,
        velocity: new THREE.Vector3(
          (Math.random() - 0.5) * 0.003,
          0.003 + Math.random() * 0.005,
          (Math.random() - 0.5) * 0.002,
        ),
        life: 0,
        maxLife: 30 + Math.random() * 15,
        gravity: -0.0002, // float upward
        shrink: false,
      });
    }
  }

  /** Spawn lingering ember particles that float upward slowly */
  private _spawnEmbers(x: number, y: number, z: number, count: number): void {
    for (let i = 0; i < count; i++) {
      const mesh = this._getEmberMesh() || this._getParticleMesh();
      if (!mesh) break;

      mesh.visible = true;
      mesh.position.set(
        x + (Math.random() - 0.5) * 0.15,
        y + (Math.random() - 0.5) * 0.1,
        z + (Math.random() - 0.5) * 0.1,
      );
      mesh.scale.setScalar(0.3 + Math.random() * 0.4);
      (mesh.material as THREE.MeshBasicMaterial).color.copy(this._emberMat.color);
      (mesh.material as THREE.MeshBasicMaterial).opacity = 0.8;

      this._particles.push({
        mesh,
        velocity: new THREE.Vector3(
          (Math.random() - 0.5) * 0.005,
          0.003 + Math.random() * 0.008,
          (Math.random() - 0.5) * 0.003,
        ),
        life: 0,
        maxLife: 30 + Math.random() * 40,
        gravity: -0.0002, // float up
        shrink: false,
      });
    }
  }

  /** Spawn ground crack decal on knockdown impact */
  spawnGroundCrack(x: number, z: number, scaleMultiplier = 1): void {
    const crackGroup = new THREE.Group();
    const crackMat = new THREE.MeshBasicMaterial({
      color: 0x222222,
      transparent: true,
      opacity: 0.6,
      depthWrite: false,
    });

    // Create radial crack lines (8-14 main cracks)
    const crackCount = 8 + Math.floor(Math.random() * 6);
    for (let i = 0; i < crackCount; i++) {
      const angle = (i / crackCount) * Math.PI * 2 + (Math.random() - 0.5) * 0.5;
      const length = (0.15 + Math.random() * 0.25) * scaleMultiplier;
      // Wider at center, thinner at tips
      const width = (0.012 + Math.random() * 0.01) * scaleMultiplier;

      const crackGeo = new THREE.PlaneGeometry(width, length);
      const crackLine = new THREE.Mesh(crackGeo, crackMat);
      crackLine.rotation.x = -Math.PI / 2;
      crackLine.rotation.z = angle;
      crackLine.position.set(
        Math.cos(angle) * length * 0.4,
        0.004,
        Math.sin(angle) * length * 0.4,
      );
      crackGroup.add(crackLine);

      // Glow line following each crack (emissive orange/red)
      const glowMat = new THREE.MeshBasicMaterial({
        color: 0xff4411,
        transparent: true,
        opacity: 0.5,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const glowGeo = new THREE.PlaneGeometry(width * 2.5, length);
      const glowLine = new THREE.Mesh(glowGeo, glowMat);
      glowLine.rotation.x = -Math.PI / 2;
      glowLine.rotation.z = angle;
      glowLine.position.set(
        Math.cos(angle) * length * 0.4,
        0.005,
        Math.sin(angle) * length * 0.4,
      );
      crackGroup.add(glowLine);

      // Track glow line for fading
      this._animatedEffects.push({
        mesh: glowLine,
        life: 0,
        maxLife: 40,
        type: "glowLine",
        onUpdate: (effect, t) => {
          (effect.mesh.material as THREE.MeshBasicMaterial).opacity = 0.5 * (1 - t);
        },
      });

      // Sub-cracks branching off
      if (Math.random() > 0.4) {
        const branchAngle = angle + (Math.random() - 0.5) * 1.2;
        const branchLen = (0.05 + Math.random() * 0.12) * scaleMultiplier;
        const branchGeo = new THREE.PlaneGeometry(width * 0.7, branchLen);
        const branch = new THREE.Mesh(branchGeo, crackMat);
        branch.rotation.x = -Math.PI / 2;
        branch.rotation.z = branchAngle;
        branch.position.set(
          Math.cos(angle) * length * 0.7 + Math.cos(branchAngle) * branchLen * 0.3,
          0.004,
          Math.sin(angle) * length * 0.7 + Math.sin(branchAngle) * branchLen * 0.3,
        );
        crackGroup.add(branch);
      }
    }

    // Impact crater (dark circle) – wider at center
    const craterRadius = (0.08 + Math.random() * 0.05) * scaleMultiplier;
    const craterGeo = new THREE.CircleGeometry(craterRadius, 10);
    const crater = new THREE.Mesh(craterGeo, new THREE.MeshBasicMaterial({
      color: 0x1a1a1a, transparent: true, opacity: 0.4, depthWrite: false,
    }));
    crater.rotation.x = -Math.PI / 2;
    crater.position.y = 0.003;
    crackGroup.add(crater);

    crackGroup.position.set(x, 0, z);
    this._scene.scene.add(crackGroup);

    // Create a single Mesh reference for the crack (use crater for tracking)
    this._groundCracks.push({
      mesh: crater,
      life: 0,
      maxLife: 120,
    });
    // Store the group on the mesh for cleanup
    (crater as any).__crackGroup = crackGroup;

    // Debris meshes popping up from crack location (4-8 small boxes)
    const debrisCount = 4 + Math.floor(Math.random() * 5);
    for (let i = 0; i < debrisCount; i++) {
      const debrisMat = new THREE.MeshStandardMaterial({
        color: 0x665544 + Math.floor(Math.random() * 0x222222),
        roughness: 0.9,
        metalness: 0.1,
      });
      const debrisMesh = new THREE.Mesh(this._debrisGeo, debrisMat);
      const offsetAngle = Math.random() * Math.PI * 2;
      const offsetDist = Math.random() * 0.1 * scaleMultiplier;
      debrisMesh.position.set(
        x + Math.cos(offsetAngle) * offsetDist,
        0.01,
        z + Math.sin(offsetAngle) * offsetDist,
      );
      debrisMesh.scale.setScalar(0.5 + Math.random() * 1.0);
      this._scene.scene.add(debrisMesh);

      this._debris.push({
        mesh: debrisMesh,
        velocity: new THREE.Vector3(
          (Math.random() - 0.5) * 0.015,
          0.02 + Math.random() * 0.03,
          (Math.random() - 0.5) * 0.015,
        ),
        life: 0,
        maxLife: 60 + Math.random() * 30,
        gravity: 0.003,
        bounces: 1 + Math.floor(Math.random() * 2),
        groundY: 0,
      });
    }

    // Dust cloud at crack location (6-10 semi-transparent particles)
    const dustCount = 6 + Math.floor(Math.random() * 5);
    for (let i = 0; i < dustCount; i++) {
      const mesh = this._getParticleMesh();
      if (!mesh) break;
      mesh.visible = true;
      const dustAngle = Math.random() * Math.PI * 2;
      mesh.position.set(x, 0.02, z);
      mesh.scale.setScalar(1.5 + Math.random() * 1.5);
      (mesh.material as THREE.MeshBasicMaterial).color.setHex(0x998877);
      (mesh.material as THREE.MeshBasicMaterial).opacity = 0.35;

      this._particles.push({
        mesh,
        velocity: new THREE.Vector3(
          Math.cos(dustAngle) * (0.005 + Math.random() * 0.01),
          0.002 + Math.random() * 0.004,
          Math.sin(dustAngle) * (0.005 + Math.random() * 0.01),
        ),
        life: 0,
        maxLife: 35 + Math.random() * 20,
        gravity: -0.0001,
        shrink: false,
      });
    }
  }

  spawnBlockSpark(x: number, y: number, z: number): void {
    // Increased particle count from 8 to 14
    for (let i = 0; i < 14; i++) {
      const mesh = this._getParticleMesh();
      if (!mesh) break;

      mesh.visible = true;
      mesh.position.set(x, y, z);
      mesh.scale.setScalar(0.5 + Math.random() * 0.4);
      (mesh.material as THREE.MeshBasicMaterial).color.copy(this._blockSparkMat.color);
      (mesh.material as THREE.MeshBasicMaterial).opacity = 1;

      const angle = Math.random() * Math.PI * 2;
      const speed = 0.01 + Math.random() * 0.03;

      this._particles.push({
        mesh,
        velocity: new THREE.Vector3(Math.cos(angle) * speed, 0.02 + Math.random() * 0.02, Math.sin(angle) * speed * 0.3),
        life: 0,
        maxLife: 6 + Math.random() * 8,
        gravity: 0.001,
        shrink: true,
      });
    }

    // Metallic shard clink visuals (2-3 shards)
    const shardCount = 2 + Math.floor(Math.random() * 2);
    for (let i = 0; i < shardCount; i++) {
      const shardMat = new THREE.MeshStandardMaterial({
        color: 0xaabbcc,
        roughness: 0.3,
        metalness: 0.8,
      });
      const shard = new THREE.Mesh(this._shardGeo, shardMat);
      shard.position.set(x, y, z);
      shard.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
      this._scene.scene.add(shard);

      this._debris.push({
        mesh: shard,
        velocity: new THREE.Vector3(
          (Math.random() - 0.5) * 0.02,
          0.015 + Math.random() * 0.02,
          (Math.random() - 0.5) * 0.01,
        ),
        life: 0,
        maxLife: 30 + Math.random() * 15,
        gravity: 0.002,
        bounces: 1,
        groundY: y - 0.5,
      });
    }

    // Brief directional "clash" line (stretched thin box, blue-white, 5 frames)
    const clashMat = new THREE.MeshBasicMaterial({
      color: 0xccddff,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const clashGeo = new THREE.BoxGeometry(0.005, 0.005, 0.2);
    const clashLine = new THREE.Mesh(clashGeo, clashMat);
    clashLine.position.set(x, y, z);
    // Point in a random block direction
    clashLine.rotation.y = Math.random() * Math.PI * 2;
    this._scene.scene.add(clashLine);

    this._animatedEffects.push({
      mesh: clashLine,
      life: 0,
      maxLife: 5,
      type: "clashLine",
      onUpdate: (effect, t) => {
        (effect.mesh.material as THREE.MeshBasicMaterial).opacity = (1 - t) * 0.9;
        effect.mesh.scale.x = 1 + t * 2;
      },
    });

    // Expanding ring (small torus, blue tint, 8 frames)
    const blockRingGeo = new THREE.TorusGeometry(0.1, 0.008, 6, 24);
    const blockRingMat = new THREE.MeshBasicMaterial({
      color: 0x88bbff,
      transparent: true,
      opacity: 0.7,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const blockRing = new THREE.Mesh(blockRingGeo, blockRingMat);
    blockRing.position.set(x, y, z);
    blockRing.rotation.x = Math.PI / 2;
    this._scene.scene.add(blockRing);

    this._animatedEffects.push({
      mesh: blockRing,
      life: 0,
      maxLife: 8,
      type: "blockRing",
      onUpdate: (effect, t) => {
        const scale = 1 + t * 4; // expand from 0.1 to ~0.5
        effect.mesh.scale.set(scale, scale, scale);
        (effect.mesh.material as THREE.MeshBasicMaterial).opacity = (1 - t) * 0.7;
      },
    });
  }

  spawnCounterFlash(): void {
    this._counterFlashLife = 12; // Longer, more dramatic flash
  }

  spawnDust(x: number, y: number, z: number): void {
    for (let i = 0; i < 5; i++) {
      const mesh = this._getParticleMesh();
      if (!mesh) break;

      mesh.visible = true;
      mesh.position.set(x + (Math.random() - 0.5) * 0.3, y, z);
      mesh.scale.setScalar(1 + Math.random() * 1.5);
      (mesh.material as THREE.MeshBasicMaterial).color.copy(this._dustMat.color);
      (mesh.material as THREE.MeshBasicMaterial).opacity = 0.4;

      this._particles.push({
        mesh,
        velocity: new THREE.Vector3((Math.random() - 0.5) * 0.01, 0.005 + Math.random() * 0.01, 0),
        life: 0,
        maxLife: 20 + Math.random() * 15,
        gravity: -0.0005, // float up
        shrink: false,
      });
    }
  }

  /** Spawn dramatic KO impact burst: extra-large sparks and expanding shockwave rings */
  spawnKOImpact(x: number, y: number, z: number, color: number): void {
    // Extra-large burst of sparks (doubled to 100)
    const burstCount = 100;
    const burstColor = new THREE.Color(color);
    for (let i = 0; i < burstCount; i++) {
      const mesh = this._getParticleMesh();
      if (!mesh) break;

      mesh.visible = true;
      mesh.position.set(x, y, z);
      const isCenter = i < Math.ceil(burstCount * 0.3);
      mesh.scale.setScalar(isCenter ? 1.8 + Math.random() * 1.2 : 1.0 + Math.random() * 1.5);
      (mesh.material as THREE.MeshBasicMaterial).color.copy(
        isCenter ? this._hotSparkMat.color : burstColor,
      );
      (mesh.material as THREE.MeshBasicMaterial).opacity = 1;

      const angle = Math.random() * Math.PI * 2;
      const speed = 0.04 + Math.random() * 0.12;
      const upSpeed = 0.02 + Math.random() * 0.08;

      this._particles.push({
        mesh,
        velocity: new THREE.Vector3(
          Math.cos(angle) * speed,
          upSpeed,
          Math.sin(angle) * speed * 0.5,
        ),
        life: 0,
        maxLife: 15 + Math.random() * 25,
        gravity: 0.003,
        shrink: true,
        rotationSpeed: new THREE.Vector3(
          (Math.random() - 0.5) * 0.4,
          (Math.random() - 0.5) * 0.4,
          0,
        ),
      });
    }

    // Multiple shockwave rings at staggered delays (0, 5, 10 frames)
    for (let delay = 0; delay < 3; delay++) {
      const ringDelay = delay * 5;
      const spawnRing = () => {
        const ringScale = 1.0 + delay * 0.15;
        const ringGeo = new THREE.TorusGeometry(0.05 * ringScale, 0.02, 8, 32);
        const ringMat = new THREE.MeshBasicMaterial({
          color,
          transparent: true,
          opacity: 0.9,
          side: THREE.DoubleSide,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
        });
        const ring = new THREE.Mesh(ringGeo, ringMat);
        ring.position.set(x, y, z);
        ring.rotation.x = Math.PI / 2;
        this._scene.scene.add(ring);

        this._groundCracks.push({
          mesh: ring,
          life: 0,
          maxLife: 30,
        });
        (ring as any).__crackGroup = undefined;
        (ring as any).__isShockwave = true;
      };

      if (ringDelay === 0) {
        spawnRing();
      } else {
        this._delayedEffects.push({ delay: ringDelay, callback: spawnRing });
      }
    }

    // Secondary delayed burst after 10 frames (30 particles in opponent's primary color)
    this._delayedEffects.push({
      delay: 10,
      callback: () => {
        for (let i = 0; i < 30; i++) {
          const mesh = this._getParticleMesh();
          if (!mesh) break;
          mesh.visible = true;
          mesh.position.set(x, y, z);
          mesh.scale.setScalar(0.8 + Math.random() * 1.2);
          (mesh.material as THREE.MeshBasicMaterial).color.copy(burstColor);
          (mesh.material as THREE.MeshBasicMaterial).opacity = 1;

          const angle = Math.random() * Math.PI * 2;
          const speed = 0.03 + Math.random() * 0.08;
          this._particles.push({
            mesh,
            velocity: new THREE.Vector3(
              Math.cos(angle) * speed,
              0.01 + Math.random() * 0.06,
              Math.sin(angle) * speed * 0.5,
            ),
            life: 0,
            maxLife: 12 + Math.random() * 18,
            gravity: 0.0025,
            shrink: true,
          });
        }
      },
    });

    // Screen-wide radial lines: 8 thin planes radiating from impact
    for (let i = 0; i < 8; i++) {
      const lineAngle = (i / 8) * Math.PI * 2;
      const lineMat = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.7,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide,
      });
      const lineGeo = new THREE.PlaneGeometry(0.01, 0.5);
      const lineMesh = new THREE.Mesh(lineGeo, lineMat);
      lineMesh.position.set(x, y, z);
      lineMesh.rotation.z = lineAngle;
      this._scene.scene.add(lineMesh);

      this._animatedEffects.push({
        mesh: lineMesh,
        life: 0,
        maxLife: 20,
        type: "radialLine",
        onUpdate: (effect, t) => {
          const expand = 1 + t * 5;
          effect.mesh.scale.set(1, expand, 1);
          (effect.mesh.material as THREE.MeshBasicMaterial).opacity = (1 - t) * 0.7;
        },
      });
    }

    // Ground slam effect: extra large ground crack if near ground
    if (y < 0.5) {
      this.spawnGroundCrack(x, z, 2.0);
    }

    // Rising energy pillar: cylinder scaling upward
    const pillarMat = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.6,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const pillarGeo = new THREE.CylinderGeometry(0.1, 0.1, 1, 12, 1, true);
    const pillar = new THREE.Mesh(pillarGeo, pillarMat);
    pillar.position.set(x, y, z);
    pillar.scale.set(1, 0.01, 1);
    this._scene.scene.add(pillar);

    this._animatedEffects.push({
      mesh: pillar,
      life: 0,
      maxLife: 20,
      type: "pillar",
      onUpdate: (effect, t) => {
        const height = t * 3;
        effect.mesh.scale.set(1, height, 1);
        effect.mesh.position.y = y + height * 0.5;
        (effect.mesh.material as THREE.MeshBasicMaterial).opacity = (1 - t * t) * 0.6;
      },
    });

    // Spawn extra embers
    this._spawnEmbers(x, y, z, 12);
  }

  // ---- Weapon Trail API ----

  startTrail(fighterIndex: number, color: number): void {
    const trail = this._trails[fighterIndex];
    if (!trail) return;
    trail.active = true;
    trail.points = [];
    trail.color.set(color);
    trail.fadeTimer = 0;
    trail.frameCounter = 0;
  }

  updateTrailPoint(fighterIndex: number, pos: THREE.Vector3): void {
    const trail = this._trails[fighterIndex];
    if (!trail) return;
    trail.points.unshift({ position: pos.clone(), time: performance.now() });
    if (trail.points.length > trail.maxPoints) {
      trail.points.length = trail.maxPoints;
    }

    // Sparkle particles along the trail: every 3rd frame, spawn 1-2 tiny bright particles
    trail.frameCounter++;
    if (trail.active && trail.frameCounter % 3 === 0) {
      const sparkleCount = 1 + Math.floor(Math.random() * 2);
      for (let i = 0; i < sparkleCount; i++) {
        const mesh = this._getEmberMesh();
        if (!mesh) break;
        mesh.visible = true;
        mesh.position.copy(pos).add(
          new THREE.Vector3(
            (Math.random() - 0.5) * 0.03,
            (Math.random() - 0.5) * 0.03,
            (Math.random() - 0.5) * 0.03,
          ),
        );
        mesh.scale.setScalar(0.3 + Math.random() * 0.4);
        (mesh.material as THREE.MeshBasicMaterial).color.setHex(0xffffff);
        (mesh.material as THREE.MeshBasicMaterial).opacity = 1;

        this._particles.push({
          mesh,
          velocity: new THREE.Vector3(
            (Math.random() - 0.5) * 0.005,
            (Math.random() - 0.5) * 0.005,
            (Math.random() - 0.5) * 0.005,
          ),
          life: 0,
          maxLife: 8 + Math.random() * 6,
          gravity: 0.001,
          shrink: true,
        });
      }
    }
  }

  stopTrail(fighterIndex: number): void {
    const trail = this._trails[fighterIndex];
    if (!trail) return;
    trail.active = false;
    trail.fadeTimer = 10;
  }

  isTrailActive(fighterIndex: number): boolean {
    const trail = this._trails[fighterIndex];
    return trail ? trail.active : false;
  }

  private _updateTrails(): void {
    const whiteColor = new THREE.Color(0xffffff);
    for (const trail of this._trails) {
      if (trail.points.length < 2) {
        trail.mesh.visible = false;
        trail.glowMesh.visible = false;
        continue;
      }

      trail.mesh.visible = true;
      trail.glowMesh.visible = true;
      const geo = trail.mesh.geometry;
      const posArr = geo.attributes.position.array as Float32Array;
      const colArr = geo.attributes.color.array as Float32Array;

      const glowGeo = trail.glowMesh.geometry;
      const glowPosArr = glowGeo.attributes.position.array as Float32Array;
      const glowColArr = glowGeo.attributes.color.array as Float32Array;

      const maxW = 0.08;
      const glowW = 0.14; // wider for glow
      const n = trail.points.length;

      for (let i = 0; i < trail.maxPoints; i++) {
        const vi = i * 2;
        if (i < n) {
          const p = trail.points[i];
          const t = i / (n - 1); // 0 = newest, 1 = oldest
          const w = maxW * (1 - t * 0.8);
          const gw = glowW * (1 - t * 0.8);

          // Ribbon top/bottom (offset in Y)
          posArr[(vi) * 3] = p.position.x;
          posArr[(vi) * 3 + 1] = p.position.y + w;
          posArr[(vi) * 3 + 2] = p.position.z;
          posArr[(vi + 1) * 3] = p.position.x;
          posArr[(vi + 1) * 3 + 1] = p.position.y - w;
          posArr[(vi + 1) * 3 + 2] = p.position.z;

          // Glow ribbon (wider)
          glowPosArr[(vi) * 3] = p.position.x;
          glowPosArr[(vi) * 3 + 1] = p.position.y + gw;
          glowPosArr[(vi) * 3 + 2] = p.position.z;
          glowPosArr[(vi + 1) * 3] = p.position.x;
          glowPosArr[(vi + 1) * 3 + 1] = p.position.y - gw;
          glowPosArr[(vi + 1) * 3 + 2] = p.position.z;

          // Color gradient: white at tip (t=0) fading to character color at tail (t=1)
          const alpha = (1 - t) * (trail.active ? 1.0 : trail.fadeTimer / 10);
          const gradColor = whiteColor.clone().lerp(trail.color, t);

          for (let v = 0; v < 2; v++) {
            colArr[(vi + v) * 4] = gradColor.r;
            colArr[(vi + v) * 4 + 1] = gradColor.g;
            colArr[(vi + v) * 4 + 2] = gradColor.b;
            colArr[(vi + v) * 4 + 3] = alpha;

            // Glow: same color, lower alpha
            glowColArr[(vi + v) * 4] = gradColor.r;
            glowColArr[(vi + v) * 4 + 1] = gradColor.g;
            glowColArr[(vi + v) * 4 + 2] = gradColor.b;
            glowColArr[(vi + v) * 4 + 3] = alpha * 0.35;
          }
        } else {
          // Zero out unused vertices
          for (let v = 0; v < 2; v++) {
            posArr[(vi + v) * 3] = 0;
            posArr[(vi + v) * 3 + 1] = 0;
            posArr[(vi + v) * 3 + 2] = 0;
            colArr[(vi + v) * 4 + 3] = 0;

            glowPosArr[(vi + v) * 3] = 0;
            glowPosArr[(vi + v) * 3 + 1] = 0;
            glowPosArr[(vi + v) * 3 + 2] = 0;
            glowColArr[(vi + v) * 4 + 3] = 0;
          }
        }
      }

      geo.attributes.position.needsUpdate = true;
      geo.attributes.color.needsUpdate = true;
      glowGeo.attributes.position.needsUpdate = true;
      glowGeo.attributes.color.needsUpdate = true;

      // Fade and trim when inactive
      if (!trail.active) {
        trail.fadeTimer--;
        if (trail.fadeTimer <= 0) {
          trail.points = [];
          trail.mesh.visible = false;
          trail.glowMesh.visible = false;
        }
      }
    }
  }

  // ---- New Effect Methods ----

  /** Spawn rage aura: continuous upward particle stream, pulsing torus, ground energy cracks */
  spawnRageAura(x: number, y: number, z: number, color: number): void {
    const auraColor = new THREE.Color(color);

    // Upward particle stream (10 particles)
    for (let i = 0; i < 10; i++) {
      const mesh = this._getEmberMesh() || this._getParticleMesh();
      if (!mesh) break;
      mesh.visible = true;
      mesh.position.set(
        x + (Math.random() - 0.5) * 0.2,
        y + Math.random() * 0.3,
        z + (Math.random() - 0.5) * 0.2,
      );
      mesh.scale.setScalar(0.4 + Math.random() * 0.5);
      (mesh.material as THREE.MeshBasicMaterial).color.copy(auraColor);
      (mesh.material as THREE.MeshBasicMaterial).opacity = 0.8;

      this._particles.push({
        mesh,
        velocity: new THREE.Vector3(
          (Math.random() - 0.5) * 0.004,
          0.008 + Math.random() * 0.012,
          (Math.random() - 0.5) * 0.004,
        ),
        life: 0,
        maxLife: 25 + Math.random() * 20,
        gravity: -0.0003, // float up
        shrink: false,
      });
    }

    // Pulsing torus aura (expanding/contracting ring)
    const torusGeo = new THREE.TorusGeometry(0.3, 0.015, 8, 32);
    const torusMat = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.5,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const torus = new THREE.Mesh(torusGeo, torusMat);
    torus.position.set(x, y + 0.3, z);
    torus.rotation.x = Math.PI / 2;
    this._scene.scene.add(torus);

    this._animatedEffects.push({
      mesh: torus,
      life: 0,
      maxLife: 30,
      type: "flash",
      onUpdate: (effect, t) => {
        // Pulsing scale
        const pulse = 1 + Math.sin(t * Math.PI * 4) * 0.3;
        effect.mesh.scale.set(pulse, pulse, pulse);
        (effect.mesh.material as THREE.MeshBasicMaterial).opacity = (1 - t) * 0.5;
      },
    });

    // Ground energy cracks radiating outward (emissive red/rage-colored)
    const crackGroup = new THREE.Group();
    const rageCrackMat = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.7,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const rageCrackCount = 6 + Math.floor(Math.random() * 4);
    for (let i = 0; i < rageCrackCount; i++) {
      const angle = (i / rageCrackCount) * Math.PI * 2 + (Math.random() - 0.5) * 0.3;
      const length = 0.1 + Math.random() * 0.2;
      const width = 0.006 + Math.random() * 0.006;
      const crackGeo = new THREE.PlaneGeometry(width, length);
      const crackLine = new THREE.Mesh(crackGeo, rageCrackMat);
      crackLine.rotation.x = -Math.PI / 2;
      crackLine.rotation.z = angle;
      crackLine.position.set(
        Math.cos(angle) * length * 0.4,
        0.005,
        Math.sin(angle) * length * 0.4,
      );
      crackGroup.add(crackLine);
    }
    crackGroup.position.set(x, 0, z);
    this._scene.scene.add(crackGroup);

    // Use a dummy mesh for tracking the group
    const dummyGeo = new THREE.PlaneGeometry(0.01, 0.01);
    const dummy = new THREE.Mesh(dummyGeo, rageCrackMat.clone());
    dummy.visible = false;
    crackGroup.add(dummy);
    (dummy as any).__crackGroup = crackGroup;

    this._groundCracks.push({
      mesh: dummy,
      life: 0,
      maxLife: 40,
    });
  }

  /** Spawn throw impact: large dust cloud, flash sphere, bouncing debris */
  spawnThrowImpact(x: number, y: number, z: number): void {
    // Large ground dust cloud (15 grey particles on XZ plane)
    for (let i = 0; i < 15; i++) {
      const mesh = this._getParticleMesh();
      if (!mesh) break;
      mesh.visible = true;
      const dustAngle = Math.random() * Math.PI * 2;
      mesh.position.set(x, y + 0.02, z);
      mesh.scale.setScalar(2.0 + Math.random() * 2.0);
      (mesh.material as THREE.MeshBasicMaterial).color.setHex(0x777766);
      (mesh.material as THREE.MeshBasicMaterial).opacity = 0.35;

      const outSpeed = 0.008 + Math.random() * 0.015;
      this._particles.push({
        mesh,
        velocity: new THREE.Vector3(
          Math.cos(dustAngle) * outSpeed,
          0.001 + Math.random() * 0.003,
          Math.sin(dustAngle) * outSpeed,
        ),
        life: 0,
        maxLife: 30 + Math.random() * 20,
        gravity: -0.0001,
        shrink: false,
      });
    }

    // Large flash sphere (bigger than normal hit)
    this._spawnFlashSphere(x, y, z, 0xffffff, 0.6, 6);

    // Bouncing debris (5-6 small box meshes)
    const debrisCount = 5 + Math.floor(Math.random() * 2);
    for (let i = 0; i < debrisCount; i++) {
      const debrisMat = new THREE.MeshStandardMaterial({
        color: 0x665544 + Math.floor(Math.random() * 0x222222),
        roughness: 0.9,
        metalness: 0.1,
      });
      const debrisMesh = new THREE.Mesh(this._debrisGeo, debrisMat);
      debrisMesh.position.set(x, y + 0.01, z);
      debrisMesh.scale.setScalar(0.4 + Math.random() * 0.8);
      this._scene.scene.add(debrisMesh);

      this._debris.push({
        mesh: debrisMesh,
        velocity: new THREE.Vector3(
          (Math.random() - 0.5) * 0.02,
          0.02 + Math.random() * 0.04,
          (Math.random() - 0.5) * 0.02,
        ),
        life: 0,
        maxLife: 50 + Math.random() * 25,
        gravity: 0.003,
        bounces: 1 + Math.floor(Math.random() * 2),
        groundY: 0,
      });
    }
  }

  /** Spawn special move flash: colored energy burst, streaking lines, expanding ring */
  spawnSpecialMoveFlash(x: number, y: number, z: number, color: number): void {
    const burstColor = new THREE.Color(color);

    // Colored energy burst (20 particles)
    for (let i = 0; i < 20; i++) {
      const mesh = this._getParticleMesh();
      if (!mesh) break;
      mesh.visible = true;
      mesh.position.set(x, y, z);
      mesh.scale.setScalar(0.8 + Math.random() * 0.8);
      (mesh.material as THREE.MeshBasicMaterial).color.copy(burstColor);
      (mesh.material as THREE.MeshBasicMaterial).opacity = 1;

      const angle = Math.random() * Math.PI * 2;
      const speed = 0.03 + Math.random() * 0.06;
      this._particles.push({
        mesh,
        velocity: new THREE.Vector3(
          Math.cos(angle) * speed,
          (Math.random() - 0.3) * 0.04,
          Math.sin(angle) * speed * 0.5,
        ),
        life: 0,
        maxLife: 10 + Math.random() * 12,
        gravity: 0.001,
        shrink: true,
        rotationSpeed: new THREE.Vector3(
          (Math.random() - 0.5) * 0.3,
          (Math.random() - 0.5) * 0.3,
          0,
        ),
      });
    }

    // Streaking lines (6 thin planes radiating from center)
    for (let i = 0; i < 6; i++) {
      const lineAngle = (i / 6) * Math.PI * 2;
      const lineMat = new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.8,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide,
      });
      const lineGeo = new THREE.PlaneGeometry(0.008, 0.3);
      const lineMesh = new THREE.Mesh(lineGeo, lineMat);
      lineMesh.position.set(x, y, z);
      lineMesh.rotation.z = lineAngle;
      this._scene.scene.add(lineMesh);

      this._animatedEffects.push({
        mesh: lineMesh,
        life: 0,
        maxLife: 12,
        type: "radialLine",
        onUpdate: (effect, t) => {
          const expand = 1 + t * 3;
          effect.mesh.scale.set(1, expand, 1);
          (effect.mesh.material as THREE.MeshBasicMaterial).opacity = (1 - t) * 0.8;
        },
      });
    }

    // Expanding colored ring (torus, additive)
    const ringGeo = new THREE.TorusGeometry(0.08, 0.012, 8, 28);
    const ringMat = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.position.set(x, y, z);
    ring.rotation.x = Math.PI / 2;
    this._scene.scene.add(ring);

    this._animatedEffects.push({
      mesh: ring,
      life: 0,
      maxLife: 15,
      type: "flash",
      onUpdate: (effect, t) => {
        const scale = 1 + t * 6;
        effect.mesh.scale.set(scale, scale, scale);
        (effect.mesh.material as THREE.MeshBasicMaterial).opacity = (1 - t) * 0.8;
      },
    });

    // Flash sphere at center
    this._spawnFlashSphere(x, y, z, color, 0.25, 5);
  }

  update(): void {
    // Update delayed effects
    for (let i = this._delayedEffects.length - 1; i >= 0; i--) {
      this._delayedEffects[i].delay--;
      if (this._delayedEffects[i].delay <= 0) {
        this._delayedEffects[i].callback();
        this._delayedEffects.splice(i, 1);
      }
    }

    // Update particles
    for (let i = this._particles.length - 1; i >= 0; i--) {
      const p = this._particles[i];
      p.life++;

      p.mesh.position.add(p.velocity);
      p.velocity.y -= p.gravity;

      // Rotation for sparks
      if (p.rotationSpeed) {
        p.mesh.rotation.x += p.rotationSpeed.x;
        p.mesh.rotation.y += p.rotationSpeed.y;
      }

      const t = p.life / p.maxLife;
      (p.mesh.material as THREE.MeshBasicMaterial).opacity = (1 - t) * (1 - t); // quadratic fade for softer decay

      if (p.shrink) {
        const scale = (1 - t) * 0.8;
        p.mesh.scale.setScalar(Math.max(0.01, scale));
      }

      if (p.life >= p.maxLife) {
        p.mesh.visible = false;
        this._particles.splice(i, 1);
      }
    }

    // Update animated effects (flash spheres, radial lines, pillars, etc.)
    for (let i = this._animatedEffects.length - 1; i >= 0; i--) {
      const effect = this._animatedEffects[i];
      effect.life++;
      const t = effect.life / effect.maxLife;

      effect.onUpdate(effect, t);

      if (effect.life >= effect.maxLife) {
        this._scene.scene.remove(effect.mesh);
        effect.mesh.geometry.dispose();
        (effect.mesh.material as THREE.Material).dispose();
        this._animatedEffects.splice(i, 1);
      }
    }

    // Update debris with physics
    for (let i = this._debris.length - 1; i >= 0; i--) {
      const d = this._debris[i];
      d.life++;

      d.mesh.position.add(d.velocity);
      d.velocity.y -= d.gravity;

      // Spin debris
      d.mesh.rotation.x += 0.1;
      d.mesh.rotation.z += 0.08;

      // Bounce off ground
      if (d.mesh.position.y <= d.groundY && d.bounces > 0) {
        d.mesh.position.y = d.groundY;
        d.velocity.y = Math.abs(d.velocity.y) * 0.4;
        d.velocity.x *= 0.7;
        d.velocity.z *= 0.7;
        d.bounces--;
      }

      // Fade out toward end of life
      const t = d.life / d.maxLife;
      if (t > 0.7) {
        const fadeMat = d.mesh.material as THREE.MeshStandardMaterial;
        if (fadeMat.opacity !== undefined) {
          fadeMat.transparent = true;
          fadeMat.opacity = 1 - ((t - 0.7) / 0.3);
        }
      }

      if (d.life >= d.maxLife) {
        this._scene.scene.remove(d.mesh);
        d.mesh.geometry.dispose();
        (d.mesh.material as THREE.Material).dispose();
        this._debris.splice(i, 1);
      }
    }

    // Update ground cracks and shockwave rings (fade out over time)
    for (let i = this._groundCracks.length - 1; i >= 0; i--) {
      const crack = this._groundCracks[i];
      crack.life++;

      // Handle shockwave ring expansion
      if ((crack.mesh as any).__isShockwave) {
        const t = crack.life / crack.maxLife;
        const scale = 1 + t * 40; // Expand rapidly
        crack.mesh.scale.set(scale, scale, scale);
        (crack.mesh.material as THREE.MeshBasicMaterial).opacity = (1 - t) * 0.9;
        if (crack.life >= crack.maxLife) {
          this._scene.scene.remove(crack.mesh);
          crack.mesh.geometry.dispose();
          (crack.mesh.material as THREE.Material).dispose();
          this._groundCracks.splice(i, 1);
        }
        continue;
      }

      if (crack.life >= crack.maxLife) {
        const group = (crack.mesh as any).__crackGroup as THREE.Group | undefined;
        if (group) {
          group.traverse((obj: THREE.Object3D) => {
            if (obj instanceof THREE.Mesh) {
              obj.geometry.dispose();
              (obj.material as THREE.Material).dispose();
            }
          });
          this._scene.scene.remove(group);
        }
        this._groundCracks.splice(i, 1);
      } else if (crack.life > crack.maxLife * 0.6) {
        // Start fading out at 60% life
        const fadeT = (crack.life - crack.maxLife * 0.6) / (crack.maxLife * 0.4);
        const group = (crack.mesh as any).__crackGroup as THREE.Group | undefined;
        if (group) {
          group.traverse((obj: THREE.Object3D) => {
            if (obj instanceof THREE.Mesh) {
              (obj.material as THREE.MeshBasicMaterial).opacity *= (1 - fadeT);
            }
          });
        }
      }
    }

    // Update counter-hit flash (two-phase: bright white then red tint)
    if (this._counterFlashMesh && this._counterFlashLife > 0) {
      this._counterFlashLife--;
      const t = this._counterFlashLife / 12;
      const flashMat = this._counterFlashMesh.material as THREE.MeshBasicMaterial;
      if (t > 0.5) {
        // Bright white phase
        flashMat.color.setHex(0xffffff);
        flashMat.opacity = (t - 0.5) * 2 * 0.8;
      } else {
        // Red tint phase
        flashMat.color.setHex(0xff4422);
        flashMat.opacity = t * 2 * 0.4;
      }
      // Keep flash in front of camera
      this._counterFlashMesh.position.copy(this._scene.camera.position);
      this._counterFlashMesh.position.add(
        this._scene.camera.getWorldDirection(new THREE.Vector3()).multiplyScalar(1),
      );
      this._counterFlashMesh.quaternion.copy(this._scene.camera.quaternion);
    }

    // Update weapon trails
    this._updateTrails();
  }

  dispose(): void {
    for (const mesh of this._particlePool) {
      this._scene.scene.remove(mesh);
      mesh.geometry.dispose();
      (mesh.material as THREE.Material).dispose();
    }
    for (const mesh of this._emberPool) {
      this._scene.scene.remove(mesh);
      mesh.geometry.dispose();
      (mesh.material as THREE.Material).dispose();
    }
    if (this._counterFlashMesh) {
      this._scene.scene.remove(this._counterFlashMesh);
      this._counterFlashMesh.geometry.dispose();
      (this._counterFlashMesh.material as THREE.Material).dispose();
    }
    for (const trail of this._trails) {
      this._scene.scene.remove(trail.mesh);
      trail.mesh.geometry.dispose();
      trail.material.dispose();
      this._scene.scene.remove(trail.glowMesh);
      trail.glowMesh.geometry.dispose();
      trail.glowMaterial.dispose();
    }
    for (const crack of this._groundCracks) {
      const group = (crack.mesh as any).__crackGroup as THREE.Group | undefined;
      if (group) {
        group.traverse((obj: THREE.Object3D) => {
          if (obj instanceof THREE.Mesh) {
            obj.geometry.dispose();
            (obj.material as THREE.Material).dispose();
          }
        });
        this._scene.scene.remove(group);
      } else {
        this._scene.scene.remove(crack.mesh);
        crack.mesh.geometry.dispose();
        (crack.mesh.material as THREE.Material).dispose();
      }
    }
    this._groundCracks = [];

    // Clean up animated effects
    for (const effect of this._animatedEffects) {
      this._scene.scene.remove(effect.mesh);
      effect.mesh.geometry.dispose();
      (effect.mesh.material as THREE.Material).dispose();
    }
    this._animatedEffects = [];

    // Clean up debris
    for (const d of this._debris) {
      this._scene.scene.remove(d.mesh);
      d.mesh.geometry.dispose();
      (d.mesh.material as THREE.Material).dispose();
    }
    this._debris = [];

    // Clean up delayed effects
    this._delayedEffects = [];

    // Dispose shared geometries
    this._shardGeo.dispose();
    this._debrisGeo.dispose();
    this._flashSphereGeo.dispose();
  }
}
