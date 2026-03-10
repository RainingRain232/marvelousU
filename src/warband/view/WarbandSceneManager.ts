// ---------------------------------------------------------------------------
// Warband mode – Three.js scene manager
// Creates and manages the 3D rendering context, separate from PixiJS.
// ---------------------------------------------------------------------------

import * as THREE from "three";
import { WB } from "../config/WarbandBalanceConfig";

export class WarbandSceneManager {
  renderer!: THREE.WebGLRenderer;
  scene!: THREE.Scene;
  camera!: THREE.PerspectiveCamera;
  canvas!: HTMLCanvasElement;

  // Lighting
  private _sunLight!: THREE.DirectionalLight;
  private _ambientLight!: THREE.AmbientLight;
  private _hemiLight!: THREE.HemisphereLight;

  // Ground
  private _ground!: THREE.Mesh;

  private _width = 0;
  private _height = 0;

  init(): void {
    this._width = window.innerWidth;
    this._height = window.innerHeight;

    // Create canvas
    this.canvas = document.createElement("canvas");
    this.canvas.id = "warband-canvas";
    this.canvas.style.position = "absolute";
    this.canvas.style.top = "0";
    this.canvas.style.left = "0";
    this.canvas.style.width = "100%";
    this.canvas.style.height = "100%";
    this.canvas.style.zIndex = "10";

    const container = document.getElementById("pixi-container");
    if (container) {
      container.appendChild(this.canvas);
    }

    // Renderer
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
    });
    this.renderer.setSize(this._width, this._height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;

    // Scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x87ceeb); // sky blue
    this.scene.fog = new THREE.Fog(0x87ceeb, 60, 120);

    // Camera
    this.camera = new THREE.PerspectiveCamera(
      65,
      this._width / this._height,
      0.1,
      200,
    );
    this.camera.position.set(0, WB.THIRD_PERSON_HEIGHT, WB.THIRD_PERSON_DIST);

    // Lighting
    this._setupLighting();

    // Ground
    this._setupGround();

    // Handle resize
    window.addEventListener("resize", this._onResize);
  }

  private _setupLighting(): void {
    // Ambient
    this._ambientLight = new THREE.AmbientLight(0x404060, 0.4);
    this.scene.add(this._ambientLight);

    // Hemisphere (sky/ground gradient)
    this._hemiLight = new THREE.HemisphereLight(0x87ceeb, 0x556b2f, 0.5);
    this.scene.add(this._hemiLight);

    // Directional sun
    this._sunLight = new THREE.DirectionalLight(0xfff4e0, 1.5);
    this._sunLight.position.set(30, 50, 20);
    this._sunLight.castShadow = true;
    this._sunLight.shadow.mapSize.width = 2048;
    this._sunLight.shadow.mapSize.height = 2048;
    this._sunLight.shadow.camera.near = 0.5;
    this._sunLight.shadow.camera.far = 150;
    this._sunLight.shadow.camera.left = -50;
    this._sunLight.shadow.camera.right = 50;
    this._sunLight.shadow.camera.top = 50;
    this._sunLight.shadow.camera.bottom = -50;
    this._sunLight.shadow.bias = -0.001;
    this.scene.add(this._sunLight);
  }

  private _setupGround(): void {
    const halfW = WB.ARENA_WIDTH / 2;
    const halfD = WB.ARENA_DEPTH / 2;

    // Main grass plane
    const groundGeo = new THREE.PlaneGeometry(
      WB.ARENA_WIDTH,
      WB.ARENA_DEPTH,
      64,
      64,
    );
    // Add slight terrain variation
    const posAttr = groundGeo.attributes.position;
    for (let i = 0; i < posAttr.count; i++) {
      const x = posAttr.getX(i);
      const y = posAttr.getY(i);
      // Gentle rolling hills
      const height =
        Math.sin(x * 0.1) * 0.3 +
        Math.cos(y * 0.08) * 0.2 +
        Math.sin(x * 0.05 + y * 0.05) * 0.5;
      posAttr.setZ(i, height);
    }
    groundGeo.computeVertexNormals();

    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x4a7c3f,
      roughness: 0.9,
      metalness: 0.0,
    });

    this._ground = new THREE.Mesh(groundGeo, groundMat);
    this._ground.rotation.x = -Math.PI / 2;
    this._ground.receiveShadow = true;
    this.scene.add(this._ground);

    // Arena boundary markers (simple posts)
    const postGeo = new THREE.CylinderGeometry(0.15, 0.15, 2, 6);
    const postMat = new THREE.MeshStandardMaterial({
      color: 0x8b4513,
      roughness: 0.8,
    });
    const corners = [
      [-halfW, halfD],
      [halfW, halfD],
      [halfW, -halfD],
      [-halfW, -halfD],
    ];
    for (const [cx, cz] of corners) {
      const post = new THREE.Mesh(postGeo, postMat);
      post.position.set(cx, 1, cz);
      post.castShadow = true;
      this.scene.add(post);
    }

    // Scatter some environment details (rocks, tufts)
    this._addEnvironmentDetails();
  }

  private _addEnvironmentDetails(): void {
    const halfW = WB.ARENA_WIDTH / 2;
    const halfD = WB.ARENA_DEPTH / 2;

    // Rocks
    const rockGeo = new THREE.IcosahedronGeometry(0.4, 0);
    const rockMat = new THREE.MeshStandardMaterial({
      color: 0x888888,
      roughness: 1.0,
      metalness: 0.1,
    });

    for (let i = 0; i < 20; i++) {
      const rock = new THREE.Mesh(rockGeo, rockMat);
      rock.position.set(
        (Math.random() - 0.5) * halfW * 1.8,
        0.15,
        (Math.random() - 0.5) * halfD * 1.8,
      );
      rock.scale.set(
        0.3 + Math.random() * 0.8,
        0.2 + Math.random() * 0.5,
        0.3 + Math.random() * 0.8,
      );
      rock.rotation.set(
        Math.random() * 0.5,
        Math.random() * Math.PI * 2,
        Math.random() * 0.3,
      );
      rock.castShadow = true;
      rock.receiveShadow = true;
      this.scene.add(rock);
    }

    // Grass tufts (simple flat triangles)
    const tuftGeo = new THREE.ConeGeometry(0.15, 0.4, 4);
    const tuftMat = new THREE.MeshStandardMaterial({
      color: 0x3a6b2f,
      roughness: 1.0,
    });

    for (let i = 0; i < 60; i++) {
      const tuft = new THREE.Mesh(tuftGeo, tuftMat);
      tuft.position.set(
        (Math.random() - 0.5) * halfW * 1.8,
        0.15,
        (Math.random() - 0.5) * halfD * 1.8,
      );
      tuft.scale.set(
        0.5 + Math.random() * 0.5,
        0.8 + Math.random() * 0.5,
        0.5 + Math.random() * 0.5,
      );
      this.scene.add(tuft);
    }

    // Trees at edges
    this._addTrees();
  }

  private _addTrees(): void {
    const halfW = WB.ARENA_WIDTH / 2;

    const trunkGeo = new THREE.CylinderGeometry(0.2, 0.3, 3, 6);
    const trunkMat = new THREE.MeshStandardMaterial({
      color: 0x654321,
      roughness: 0.9,
    });
    const leavesGeo = new THREE.SphereGeometry(1.5, 6, 5);
    const leavesMat = new THREE.MeshStandardMaterial({
      color: 0x2d5a1e,
      roughness: 0.8,
    });

    for (let i = 0; i < 30; i++) {
      const angle = (i / 30) * Math.PI * 2;
      const radius = halfW * 0.95 + Math.random() * 5;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;

      const treeGroup = new THREE.Group();

      const trunk = new THREE.Mesh(trunkGeo, trunkMat);
      trunk.position.y = 1.5;
      trunk.castShadow = true;
      treeGroup.add(trunk);

      const leaves = new THREE.Mesh(leavesGeo, leavesMat);
      leaves.position.y = 3.5 + Math.random() * 0.5;
      leaves.scale.set(
        0.8 + Math.random() * 0.6,
        0.7 + Math.random() * 0.5,
        0.8 + Math.random() * 0.6,
      );
      leaves.castShadow = true;
      treeGroup.add(leaves);

      treeGroup.position.set(x, 0, z);
      this.scene.add(treeGroup);
    }
  }

  /** Build a siege castle environment */
  buildSiegeArena(): void {
    // Castle wall
    const wallGeo = new THREE.BoxGeometry(40, 8, 2);
    const wallMat = new THREE.MeshStandardMaterial({
      color: 0x888877,
      roughness: 0.95,
      metalness: 0.05,
    });

    const wall = new THREE.Mesh(wallGeo, wallMat);
    wall.position.set(0, 4, -15);
    wall.castShadow = true;
    wall.receiveShadow = true;
    this.scene.add(wall);

    // Towers at wall ends
    const towerGeo = new THREE.CylinderGeometry(2, 2.2, 12, 8);
    for (const xPos of [-20, 20]) {
      const tower = new THREE.Mesh(towerGeo, wallMat);
      tower.position.set(xPos, 6, -15);
      tower.castShadow = true;
      tower.receiveShadow = true;
      this.scene.add(tower);

      // Tower top (crenellation approximation)
      const topGeo = new THREE.CylinderGeometry(2.4, 2.4, 1, 8);
      const top = new THREE.Mesh(topGeo, wallMat);
      top.position.set(xPos, 12.5, -15);
      top.castShadow = true;
      this.scene.add(top);
    }

    // Gate opening
    const gateGeo = new THREE.BoxGeometry(4, 5, 2.5);
    const gateMat = new THREE.MeshStandardMaterial({
      color: 0x654321,
      roughness: 0.9,
    });
    const gate = new THREE.Mesh(gateGeo, gateMat);
    gate.position.set(0, 2.5, -15);
    this.scene.add(gate);

    // Crenellations along wall top
    const crenGeo = new THREE.BoxGeometry(1.5, 1.5, 0.5);
    for (let x = -18; x <= 18; x += 3) {
      const cren = new THREE.Mesh(crenGeo, wallMat);
      cren.position.set(x, 8.75, -14);
      cren.castShadow = true;
      this.scene.add(cren);
    }

    // Inner courtyard floor
    const courtGeo = new THREE.PlaneGeometry(30, 20);
    const courtMat = new THREE.MeshStandardMaterial({
      color: 0x9a8a6a,
      roughness: 0.95,
    });
    const court = new THREE.Mesh(courtGeo, courtMat);
    court.rotation.x = -Math.PI / 2;
    court.position.set(0, 0.02, -25);
    court.receiveShadow = true;
    this.scene.add(court);
  }

  render(): void {
    this.renderer.render(this.scene, this.camera);
  }

  private _onResize = (): void => {
    this._width = window.innerWidth;
    this._height = window.innerHeight;
    this.camera.aspect = this._width / this._height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(this._width, this._height);
  };

  destroy(): void {
    window.removeEventListener("resize", this._onResize);

    // Remove canvas
    if (this.canvas.parentNode) {
      this.canvas.parentNode.removeChild(this.canvas);
    }

    // Dispose scene
    this.scene.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        obj.geometry.dispose();
        if (Array.isArray(obj.material)) {
          obj.material.forEach((m) => m.dispose());
        } else {
          obj.material.dispose();
        }
      }
    });

    this.renderer.dispose();
  }
}
