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
  maxPoints: number;
  active: boolean;
  color: THREE.Color;
  fadeTimer: number;
}

export class TekkenFXManager {
  private _scene: TekkenSceneManager;
  private _particles: Particle[] = [];
  private _particlePool: THREE.Mesh[] = [];
  private _counterFlashMesh: THREE.Mesh | null = null;
  private _counterFlashLife = 0;

  // Ground cracks for knockdowns
  private _groundCracks: GroundCrack[] = [];

  // Weapon trails (one per fighter)
  private _trails: WeaponTrail[] = [];

  // Shared materials
  private _sparkMat: THREE.MeshBasicMaterial;
  private _blockSparkMat: THREE.MeshBasicMaterial;
  private _counterSparkMat: THREE.MeshBasicMaterial;
  private _dustMat: THREE.MeshBasicMaterial;
  private _emberMat: THREE.MeshBasicMaterial;
  private _hotSparkMat: THREE.MeshBasicMaterial;

  constructor(sceneManager: TekkenSceneManager) {
    this._scene = sceneManager;

    this._sparkMat = new THREE.MeshBasicMaterial({ color: 0xffaa33, transparent: true, opacity: 1 });
    this._blockSparkMat = new THREE.MeshBasicMaterial({ color: 0x88bbff, transparent: true, opacity: 1 });
    this._counterSparkMat = new THREE.MeshBasicMaterial({ color: 0xff2200, transparent: true, opacity: 1 });
    this._dustMat = new THREE.MeshBasicMaterial({ color: 0x998877, transparent: true, opacity: 0.6 });
    this._emberMat = new THREE.MeshBasicMaterial({ color: 0xff6622, transparent: true, opacity: 0.8 });
    this._hotSparkMat = new THREE.MeshBasicMaterial({ color: 0xffffaa, transparent: true, opacity: 1 });

    // Pre-allocate particle pool (larger pool for more effects)
    const geo = new THREE.SphereGeometry(0.03, 4, 3);
    for (let i = 0; i < 160; i++) {
      const mesh = new THREE.Mesh(geo, this._sparkMat.clone());
      mesh.visible = false;
      sceneManager.scene.add(mesh);
      this._particlePool.push(mesh);
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
      const maxPts = 12;
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

      this._trails.push({
        points: [],
        mesh: trailMesh,
        material: trailMat,
        maxPoints: maxPts,
        active: false,
        color: new THREE.Color(0xffaa33),
        fadeTimer: 0,
      });
    }
  }

  private _getParticleMesh(): THREE.Mesh | null {
    for (const mesh of this._particlePool) {
      if (!mesh.visible) return mesh;
    }
    return null;
  }

  spawnHitSpark(x: number, y: number, z: number, count: number, isCounterHit: boolean): void {
    const mat = isCounterHit ? this._counterSparkMat : this._sparkMat;
    // Spawn extra sparks for more dramatic effect
    const totalCount = Math.floor(count * 1.5);

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

      this._particles.push({
        mesh,
        velocity: new THREE.Vector3(
          Math.cos(angle) * speed,
          upSpeed,
          Math.sin(angle) * speed * 0.5,
        ),
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
    }

    // Spawn lingering embers on hits
    this._spawnEmbers(x, y, z, isCounterHit ? 6 : 3);
  }

  /** Spawn lingering ember particles that float upward slowly */
  private _spawnEmbers(x: number, y: number, z: number, count: number): void {
    for (let i = 0; i < count; i++) {
      const mesh = this._getParticleMesh();
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
  spawnGroundCrack(x: number, z: number): void {
    const crackGroup = new THREE.Group();
    const crackMat = new THREE.MeshBasicMaterial({
      color: 0x222222,
      transparent: true,
      opacity: 0.6,
      depthWrite: false,
    });

    // Create radial crack lines
    const crackCount = 5 + Math.floor(Math.random() * 4);
    for (let i = 0; i < crackCount; i++) {
      const angle = (i / crackCount) * Math.PI * 2 + (Math.random() - 0.5) * 0.5;
      const length = 0.15 + Math.random() * 0.25;
      const width = 0.008 + Math.random() * 0.008;

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

      // Sub-cracks branching off
      if (Math.random() > 0.4) {
        const branchAngle = angle + (Math.random() - 0.5) * 1.2;
        const branchLen = 0.05 + Math.random() * 0.12;
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

    // Impact crater (dark circle)
    const craterGeo = new THREE.CircleGeometry(0.06 + Math.random() * 0.04, 8);
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
  }

  spawnBlockSpark(x: number, y: number, z: number): void {
    for (let i = 0; i < 8; i++) {
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

  // ---- Weapon Trail API ----

  startTrail(fighterIndex: number, color: number): void {
    const trail = this._trails[fighterIndex];
    if (!trail) return;
    trail.active = true;
    trail.points = [];
    trail.color.set(color);
    trail.fadeTimer = 0;
  }

  updateTrailPoint(fighterIndex: number, pos: THREE.Vector3): void {
    const trail = this._trails[fighterIndex];
    if (!trail) return;
    trail.points.unshift({ position: pos.clone(), time: performance.now() });
    if (trail.points.length > trail.maxPoints) {
      trail.points.length = trail.maxPoints;
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
    for (const trail of this._trails) {
      if (trail.points.length < 2) {
        trail.mesh.visible = false;
        continue;
      }

      trail.mesh.visible = true;
      const geo = trail.mesh.geometry;
      const posArr = geo.attributes.position.array as Float32Array;
      const colArr = geo.attributes.color.array as Float32Array;

      const maxW = 0.08;
      const n = trail.points.length;

      for (let i = 0; i < trail.maxPoints; i++) {
        const vi = i * 2;
        if (i < n) {
          const p = trail.points[i];
          const t = i / (n - 1); // 0 = newest, 1 = oldest
          const w = maxW * (1 - t * 0.8);

          // Ribbon top/bottom (offset in Y)
          posArr[(vi) * 3] = p.position.x;
          posArr[(vi) * 3 + 1] = p.position.y + w;
          posArr[(vi) * 3 + 2] = p.position.z;
          posArr[(vi + 1) * 3] = p.position.x;
          posArr[(vi + 1) * 3 + 1] = p.position.y - w;
          posArr[(vi + 1) * 3 + 2] = p.position.z;

          // Color with alpha fade
          const alpha = (1 - t) * (trail.active ? 1.0 : trail.fadeTimer / 10);
          for (let v = 0; v < 2; v++) {
            colArr[(vi + v) * 4] = trail.color.r;
            colArr[(vi + v) * 4 + 1] = trail.color.g;
            colArr[(vi + v) * 4 + 2] = trail.color.b;
            colArr[(vi + v) * 4 + 3] = alpha;
          }
        } else {
          // Zero out unused vertices
          for (let v = 0; v < 2; v++) {
            posArr[(vi + v) * 3] = 0;
            posArr[(vi + v) * 3 + 1] = 0;
            posArr[(vi + v) * 3 + 2] = 0;
            colArr[(vi + v) * 4 + 3] = 0;
          }
        }
      }

      geo.attributes.position.needsUpdate = true;
      geo.attributes.color.needsUpdate = true;

      // Fade and trim when inactive
      if (!trail.active) {
        trail.fadeTimer--;
        if (trail.fadeTimer <= 0) {
          trail.points = [];
          trail.mesh.visible = false;
        }
      }
    }
  }

  update(): void {
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

    // Update ground cracks (fade out over time)
    for (let i = this._groundCracks.length - 1; i >= 0; i--) {
      const crack = this._groundCracks[i];
      crack.life++;
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
    if (this._counterFlashMesh) {
      this._scene.scene.remove(this._counterFlashMesh);
      this._counterFlashMesh.geometry.dispose();
      (this._counterFlashMesh.material as THREE.Material).dispose();
    }
    for (const trail of this._trails) {
      this._scene.scene.remove(trail.mesh);
      trail.mesh.geometry.dispose();
      trail.material.dispose();
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
      }
    }
    this._groundCracks = [];
  }
}
