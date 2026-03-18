// ---------------------------------------------------------------------------
// Camelot Craft – Dynamic skybox with day/night cycle
// ---------------------------------------------------------------------------

import * as THREE from "three";
import { getSunAngle, getSunlight, getSkyColor, getFogColor } from "../systems/CraftDayNightSystem";

export class CraftSkybox {
  readonly group = new THREE.Group();

  private _skyMesh!: THREE.Mesh;
  private _sunMesh!: THREE.Mesh;
  private _moonMesh!: THREE.Mesh;
  private _starField!: THREE.Points;
  private _skyMaterial!: THREE.ShaderMaterial;

  private _baseSkyColor = 0x87CEEB;
  private _baseFogColor = 0xC8D8E8;

  build(): void {
    // Sky dome
    const skyGeo = new THREE.SphereGeometry(400, 32, 16);
    this._skyMaterial = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      uniforms: {
        uTopColor: { value: new THREE.Color(0x87CEEB) },
        uBottomColor: { value: new THREE.Color(0xE8D8C8) },
        uSunDir: { value: new THREE.Vector3(0, 1, 0) },
        uSunColor: { value: new THREE.Color(0xFFDD88) },
      },
      vertexShader: /* glsl */ `
        varying vec3 vWorldPos;
        void main() {
          vWorldPos = normalize(position);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        uniform vec3 uTopColor;
        uniform vec3 uBottomColor;
        uniform vec3 uSunDir;
        uniform vec3 uSunColor;
        varying vec3 vWorldPos;
        void main() {
          float h = vWorldPos.y * 0.5 + 0.5;
          vec3 sky = mix(uBottomColor, uTopColor, smoothstep(0.0, 0.6, h));
          // Sun glow
          float sunDot = max(dot(vWorldPos, uSunDir), 0.0);
          sky += uSunColor * pow(sunDot, 64.0) * 0.8;
          sky += uSunColor * pow(sunDot, 8.0) * 0.15;
          gl_FragColor = vec4(sky, 1.0);
        }
      `,
    });
    this._skyMesh = new THREE.Mesh(skyGeo, this._skyMaterial);
    this.group.add(this._skyMesh);

    // Sun
    const sunGeo = new THREE.SphereGeometry(8, 16, 8);
    const sunMat = new THREE.MeshBasicMaterial({ color: 0xFFDD44 });
    this._sunMesh = new THREE.Mesh(sunGeo, sunMat);
    this.group.add(this._sunMesh);

    // Moon
    const moonGeo = new THREE.SphereGeometry(5, 16, 8);
    const moonMat = new THREE.MeshBasicMaterial({ color: 0xD0D8E8 });
    this._moonMesh = new THREE.Mesh(moonGeo, moonMat);
    this.group.add(this._moonMesh);

    // Stars
    const starCount = 500;
    const starPositions = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random() * 2 - 1);
      const r = 350;
      starPositions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      starPositions[i * 3 + 1] = r * Math.abs(Math.cos(phi)); // only upper hemisphere
      starPositions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
    }
    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute("position", new THREE.BufferAttribute(starPositions, 3));
    const starMat = new THREE.PointsMaterial({ color: 0xFFFFFF, size: 1.5, sizeAttenuation: true });
    this._starField = new THREE.Points(starGeo, starMat);
    this.group.add(this._starField);
  }

  /** Update skybox based on time of day. Call each frame. */
  update(timeOfDay: number, playerPos: THREE.Vector3): void {
    // Move skybox with player (so it's always surrounding them)
    this.group.position.set(playerPos.x, 0, playerPos.z);

    const sunAngle = getSunAngle(timeOfDay);
    const sunlight = getSunlight(timeOfDay);

    // Sun position
    const sunDist = 300;
    const sunX = Math.cos(sunAngle) * sunDist;
    const sunY = Math.sin(sunAngle) * sunDist;
    this._sunMesh.position.set(sunX, sunY, 0);
    this._sunMesh.visible = sunY > -20;

    // Moon (opposite of sun)
    this._moonMesh.position.set(-sunX, -sunY, 0);
    this._moonMesh.visible = -sunY > -20;

    // Stars visible at night
    const starOpacity = Math.max(0, 1 - sunlight * 2);
    (this._starField.material as THREE.PointsMaterial).opacity = starOpacity;
    (this._starField.material as THREE.PointsMaterial).transparent = true;
    this._starField.visible = starOpacity > 0.01;

    // Sky colors
    const topColor = getSkyColor(timeOfDay, this._baseSkyColor);
    const bottomColor = getFogColor(timeOfDay, this._baseFogColor);

    const top = new THREE.Color(topColor);
    const bottom = new THREE.Color(bottomColor);

    this._skyMaterial.uniforms.uTopColor.value.copy(top);
    this._skyMaterial.uniforms.uBottomColor.value.copy(bottom);

    // Sun direction for glow
    const sunDir = new THREE.Vector3(sunX, sunY, 0).normalize();
    this._skyMaterial.uniforms.uSunDir.value.copy(sunDir);

    // Sun color shifts orange at horizon
    const horizonFactor = 1 - Math.abs(sunY) / sunDist;
    const sunColor = new THREE.Color(0xFFDD44).lerp(new THREE.Color(0xFF6600), horizonFactor * 0.6);
    this._skyMaterial.uniforms.uSunColor.value.copy(sunColor);
  }

  /** Set base colors from current biome. */
  setBiomeColors(skyColor: number, fogColor: number): void {
    this._baseSkyColor = skyColor;
    this._baseFogColor = fogColor;
  }

  destroy(): void {
    this.group.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose();
        if (Array.isArray(child.material)) child.material.forEach((m) => m.dispose());
        else child.material.dispose();
      }
      if (child instanceof THREE.Points) {
        child.geometry.dispose();
        (child.material as THREE.Material).dispose();
      }
    });
  }
}
