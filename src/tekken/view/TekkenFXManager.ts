// ---------------------------------------------------------------------------
// Tekken mode – Visual effects manager
// Hit sparks, block sparks, counter-hit flash, dust particles
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
}

export class TekkenFXManager {
  private _scene: TekkenSceneManager;
  private _particles: Particle[] = [];
  private _particlePool: THREE.Mesh[] = [];
  private _counterFlashMesh: THREE.Mesh | null = null;
  private _counterFlashLife = 0;

  // Shared materials
  private _sparkMat: THREE.MeshBasicMaterial;
  private _blockSparkMat: THREE.MeshBasicMaterial;
  private _counterSparkMat: THREE.MeshBasicMaterial;
  private _dustMat: THREE.MeshBasicMaterial;

  constructor(sceneManager: TekkenSceneManager) {
    this._scene = sceneManager;

    this._sparkMat = new THREE.MeshBasicMaterial({ color: 0xffaa33, transparent: true, opacity: 1 });
    this._blockSparkMat = new THREE.MeshBasicMaterial({ color: 0x88bbff, transparent: true, opacity: 1 });
    this._counterSparkMat = new THREE.MeshBasicMaterial({ color: 0xff2200, transparent: true, opacity: 1 });
    this._dustMat = new THREE.MeshBasicMaterial({ color: 0x998877, transparent: true, opacity: 0.6 });

    // Pre-allocate particle pool
    const geo = new THREE.SphereGeometry(0.03, 4, 3);
    for (let i = 0; i < 100; i++) {
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
  }

  private _getParticleMesh(): THREE.Mesh | null {
    for (const mesh of this._particlePool) {
      if (!mesh.visible) return mesh;
    }
    return null;
  }

  spawnHitSpark(x: number, y: number, z: number, count: number, isCounterHit: boolean): void {
    const mat = isCounterHit ? this._counterSparkMat : this._sparkMat;

    for (let i = 0; i < count; i++) {
      const mesh = this._getParticleMesh();
      if (!mesh) break;

      mesh.visible = true;
      mesh.position.set(x, y, z);
      mesh.scale.setScalar(0.8 + Math.random() * 0.8);
      (mesh.material as THREE.MeshBasicMaterial).color.copy(mat.color);
      (mesh.material as THREE.MeshBasicMaterial).opacity = 1;

      const angle = Math.random() * Math.PI * 2;
      const speed = 0.02 + Math.random() * 0.06;
      const upSpeed = 0.01 + Math.random() * 0.04;

      this._particles.push({
        mesh,
        velocity: new THREE.Vector3(
          Math.cos(angle) * speed,
          upSpeed,
          Math.sin(angle) * speed * 0.5,
        ),
        life: 0,
        maxLife: 8 + Math.random() * 12,
        gravity: 0.002,
        shrink: true,
      });
    }
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
    this._counterFlashLife = 8;
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

  update(): void {
    // Update particles
    for (let i = this._particles.length - 1; i >= 0; i--) {
      const p = this._particles[i];
      p.life++;

      p.mesh.position.add(p.velocity);
      p.velocity.y -= p.gravity;

      const t = p.life / p.maxLife;
      (p.mesh.material as THREE.MeshBasicMaterial).opacity = 1 - t;

      if (p.shrink) {
        const scale = (1 - t) * 0.8;
        p.mesh.scale.setScalar(Math.max(0.01, scale));
      }

      if (p.life >= p.maxLife) {
        p.mesh.visible = false;
        this._particles.splice(i, 1);
      }
    }

    // Update counter-hit flash
    if (this._counterFlashMesh && this._counterFlashLife > 0) {
      this._counterFlashLife--;
      const t = this._counterFlashLife / 8;
      (this._counterFlashMesh.material as THREE.MeshBasicMaterial).opacity = t * 0.7;
      // Keep flash in front of camera
      this._counterFlashMesh.position.copy(this._scene.camera.position);
      this._counterFlashMesh.position.add(
        this._scene.camera.getWorldDirection(new THREE.Vector3()).multiplyScalar(1),
      );
      this._counterFlashMesh.quaternion.copy(this._scene.camera.quaternion);
    }
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
  }
}
