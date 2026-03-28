import * as THREE from 'three';
import { getTerrainHeight } from './DiabloRenderer';
import { MapBuildContext } from './DiabloRendererMaps';

export function buildClockworkFoundry(mctx: MapBuildContext, w: number, d: number): void {
    mctx.scene.fog = new THREE.FogExp2(0x554433, 0.015);
    mctx.applyTerrainColors(0x3a3322, 0x4a4433, 0.4);
    mctx.dirLight.color.setHex(0xffaa55);
    mctx.dirLight.intensity = 0.9;
    mctx.ambientLight.color.setHex(0x443322);
    mctx.ambientLight.intensity = 0.5;
    mctx.hemiLight.color.setHex(0x997755);
    mctx.hemiLight.groundColor.setHex(0x332211);

    const bronzeMat = new THREE.MeshStandardMaterial({ color: 0xaa8844, roughness: 0.4, metalness: 0.7 });
    const brassMat = new THREE.MeshStandardMaterial({ color: 0xcc9933, roughness: 0.35, metalness: 0.8 });
    const copperMat = new THREE.MeshStandardMaterial({ color: 0xbb6633, roughness: 0.4, metalness: 0.6 });
    const darkMetalMat = new THREE.MeshStandardMaterial({ color: 0x3a3a3a, roughness: 0.6, metalness: 0.8 });
    const ironMat = new THREE.MeshStandardMaterial({ color: 0x555555, roughness: 0.7, metalness: 0.5 });
    const oilMat = new THREE.MeshStandardMaterial({ color: 0x1a1008, roughness: 0.05, metalness: 0.3 });
    const forgeMat = new THREE.MeshStandardMaterial({ color: 0x442222, roughness: 0.9 });
    const steamMat = new THREE.MeshStandardMaterial({ color: 0xcccccc, roughness: 0.2, transparent: true, opacity: 0.35 });
    const woodMat = new THREE.MeshStandardMaterial({ color: 0x6b4422, roughness: 0.8 });
    const redBtnMat = new THREE.MeshStandardMaterial({ color: 0xff3333, roughness: 0.3, emissive: 0x331111 });
    const greenBtnMat = new THREE.MeshStandardMaterial({ color: 0x33ff33, roughness: 0.3, emissive: 0x113311 });
    const yellowBtnMat = new THREE.MeshStandardMaterial({ color: 0xffff33, roughness: 0.3, emissive: 0x333311 });

    // ── Gear/cog decorations (35) ──
    for (let i = 0; i < 35; i++) {
      const gear = new THREE.Group();
      const gearR = 0.8 + Math.random() * 2.5;
      const toothCount = 8 + Math.floor(Math.random() * 8);
      const ring = new THREE.Mesh(new THREE.TorusGeometry(gearR, gearR * 0.15, 6, toothCount), i % 2 === 0 ? bronzeMat : brassMat);
      gear.add(ring);
      for (let t = 0; t < toothCount; t++) {
        const angle = (t / toothCount) * Math.PI * 2;
        const tooth = new THREE.Mesh(new THREE.BoxGeometry(gearR * 0.2, gearR * 0.25, gearR * 0.15), bronzeMat);
        tooth.position.set(Math.cos(angle) * gearR, Math.sin(angle) * gearR, 0);
        tooth.rotation.z = angle;
        gear.add(tooth);
      }
      const hub = new THREE.Mesh(new THREE.CylinderGeometry(gearR * 0.2, gearR * 0.2, gearR * 0.15, 12), darkMetalMat);
      hub.rotation.x = Math.PI / 2;
      gear.add(hub);
      const gX = (Math.random() - 0.5) * w * 0.85;
      const gZ = (Math.random() - 0.5) * d * 0.85;
      gear.position.set(gX, 0.5 + Math.random() * 4, gZ);
      gear.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
      mctx.scene.add(gear);
    }

    // ── Steam pipes (18) ──
    for (let i = 0; i < 18; i++) {
      const pipe = new THREE.Group();
      const pipeLen = 4 + Math.random() * 10;
      const pipeR = 0.15 + Math.random() * 0.2;
      const body = new THREE.Mesh(new THREE.CylinderGeometry(pipeR, pipeR, pipeLen, 12), copperMat);
      if (i % 2 === 0) body.rotation.z = Math.PI / 2;
      pipe.add(body);
      const joint1 = new THREE.Mesh(new THREE.CylinderGeometry(pipeR * 1.3, pipeR * 1.3, 0.2, 12), darkMetalMat);
      joint1.position.y = pipeLen / 2;
      pipe.add(joint1);
      const joint2 = new THREE.Mesh(new THREE.CylinderGeometry(pipeR * 1.3, pipeR * 1.3, 0.2, 12), darkMetalMat);
      joint2.position.y = -pipeLen / 2;
      pipe.add(joint2);
      if (i % 3 === 0) {
        for (let s = 0; s < 3; s++) {
          const steam = new THREE.Mesh(new THREE.SphereGeometry(0.2 + Math.random() * 0.3, 14, 10), steamMat);
          steam.position.set((Math.random() - 0.5) * 0.5, (Math.random() - 0.5) * pipeLen * 0.5, pipeR + 0.3);
          pipe.add(steam);
        }
      }
      pipe.position.set((Math.random() - 0.5) * w * 0.7, 1 + Math.random() * 3, (Math.random() - 0.5) * d * 0.7);
      mctx.scene.add(pipe);
    }

    // ── Forge stations (14) ──
    for (let i = 0; i < 14; i++) {
      const forge = new THREE.Group();
      const platform = new THREE.Mesh(new THREE.BoxGeometry(2, 0.4, 2), darkMetalMat);
      forge.add(platform);
      const anvil = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.5, 0.4), ironMat);
      anvil.position.y = 0.45;
      forge.add(anvil);
      const anvilTop = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.15, 0.5), ironMat);
      anvilTop.position.y = 0.75;
      forge.add(anvilTop);
      const forgeLight = new THREE.PointLight(0xff4411, 1.2, 8);
      forgeLight.position.set(0, 1.5, 0);
      forge.add(forgeLight);
      mctx.torchLights.push(forgeLight);
      const fX = (Math.random() - 0.5) * w * 0.7;
      const fZ = (Math.random() - 0.5) * d * 0.7;
      forge.position.set(fX, getTerrainHeight(fX, fZ, 0.4) + 0.2, fZ);
      mctx.scene.add(forge);
    }

    // ── Scattered bolts and screws (25) ──
    for (let i = 0; i < 25; i++) {
      const bolt = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.15, 10), ironMat);
      const bX = (Math.random() - 0.5) * w * 0.8;
      const bZ = (Math.random() - 0.5) * d * 0.8;
      bolt.position.set(bX, getTerrainHeight(bX, bZ, 0.4) + 0.08, bZ);
      bolt.rotation.set(Math.random() * Math.PI, 0, Math.random() * Math.PI);
      mctx.scene.add(bolt);
    }

    // ── Conveyor belt sections (10) ──
    for (let i = 0; i < 10; i++) {
      const conveyor = new THREE.Group();
      const beltLen = 4 + Math.random() * 6;
      const belt = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.1, beltLen), darkMetalMat);
      conveyor.add(belt);
      for (let r = 0; r < Math.floor(beltLen / 0.8); r++) {
        const roller = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 1.6, 10), ironMat);
        roller.rotation.z = Math.PI / 2;
        roller.position.set(0, -0.15, -beltLen / 2 + r * 0.8 + 0.4);
        conveyor.add(roller);
      }
      const leg1 = new THREE.Mesh(new THREE.BoxGeometry(0.15, 1, 0.15), darkMetalMat);
      leg1.position.set(-0.65, -0.55, -beltLen / 2 + 0.3);
      conveyor.add(leg1);
      const leg2 = new THREE.Mesh(new THREE.BoxGeometry(0.15, 1, 0.15), darkMetalMat);
      leg2.position.set(0.65, -0.55, -beltLen / 2 + 0.3);
      conveyor.add(leg2);
      const leg3 = new THREE.Mesh(new THREE.BoxGeometry(0.15, 1, 0.15), darkMetalMat);
      leg3.position.set(-0.65, -0.55, beltLen / 2 - 0.3);
      conveyor.add(leg3);
      const leg4 = new THREE.Mesh(new THREE.BoxGeometry(0.15, 1, 0.15), darkMetalMat);
      leg4.position.set(0.65, -0.55, beltLen / 2 - 0.3);
      conveyor.add(leg4);
      conveyor.position.set((Math.random() - 0.5) * w * 0.6, 1.1, (Math.random() - 0.5) * d * 0.6);
      conveyor.rotation.y = Math.random() * Math.PI;
      mctx.scene.add(conveyor);
    }

    // ── Piston mechanisms (8) ──
    for (let i = 0; i < 8; i++) {
      const piston = new THREE.Group();
      const housing = new THREE.Mesh(new THREE.BoxGeometry(1, 2, 1), darkMetalMat);
      piston.add(housing);
      const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 2.5, 12), copperMat);
      rod.position.y = 2.2;
      piston.add(rod);
      const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 0.2, 12), bronzeMat);
      cap.position.y = 3.45;
      piston.add(cap);
      const piX = (Math.random() - 0.5) * w * 0.65;
      const piZ = (Math.random() - 0.5) * d * 0.65;
      piston.position.set(piX, getTerrainHeight(piX, piZ, 0.4), piZ);
      mctx.scene.add(piston);
    }

    // ── Oil puddles (12) ──
    for (let i = 0; i < 12; i++) {
      const puddle = new THREE.Mesh(new THREE.CircleGeometry(0.5 + Math.random() * 1.2, 16), oilMat);
      puddle.rotation.x = -Math.PI / 2;
      const oX = (Math.random() - 0.5) * w * 0.75;
      const oZ = (Math.random() - 0.5) * d * 0.75;
      puddle.position.set(oX, getTerrainHeight(oX, oZ, 0.4) + 0.02, oZ);
      mctx.scene.add(puddle);
    }

    // ── Workbenches (16) ──
    for (let i = 0; i < 16; i++) {
      const bench = new THREE.Group();
      const top = new THREE.Mesh(new THREE.BoxGeometry(2, 0.15, 1), woodMat);
      top.position.y = 1;
      bench.add(top);
      for (const ox of [-0.85, 0.85]) {
        for (const oz of [-0.4, 0.4]) {
          const leg = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1, 0.12), woodMat);
          leg.position.set(ox, 0.5, oz);
          bench.add(leg);
        }
      }
      for (let t = 0; t < 3; t++) {
        const tool = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.5 + Math.random() * 0.3, 17), ironMat);
        tool.rotation.z = Math.PI / 2;
        tool.position.set((Math.random() - 0.5) * 1.4, 1.12, (Math.random() - 0.5) * 0.6);
        bench.add(tool);
      }
      const wX = (Math.random() - 0.5) * w * 0.7;
      const wZ = (Math.random() - 0.5) * d * 0.7;
      bench.position.set(wX, getTerrainHeight(wX, wZ, 0.4), wZ);
      bench.rotation.y = Math.random() * Math.PI;
      mctx.scene.add(bench);
    }

    // ── Chain mechanisms (10) ──
    for (let i = 0; i < 10; i++) {
      const chain = new THREE.Group();
      const linkCount = 4 + Math.floor(Math.random() * 5);
      for (let l = 0; l < linkCount; l++) {
        const link = new THREE.Mesh(new THREE.TorusGeometry(0.15, 0.04, 23, 27), ironMat);
        link.position.y = l * 0.25;
        link.rotation.x = l % 2 === 0 ? 0 : Math.PI / 2;
        chain.add(link);
      }
      chain.position.set((Math.random() - 0.5) * w * 0.7, 2 + Math.random() * 3, (Math.random() - 0.5) * d * 0.7);
      mctx.scene.add(chain);
    }

    // ── Large furnaces (5) ──
    for (let i = 0; i < 5; i++) {
      const furnace = new THREE.Group();
      const fbody = new THREE.Mesh(new THREE.BoxGeometry(3, 3, 3), forgeMat);
      furnace.add(fbody);
      const opening = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.5, 0.1), new THREE.MeshStandardMaterial({ color: 0xff4400, emissive: 0xff2200, emissiveIntensity: 0.8 }));
      opening.position.set(0, -0.3, 1.51);
      furnace.add(opening);
      const chimney = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.5, 2, 12), darkMetalMat);
      chimney.position.y = 2.5;
      furnace.add(chimney);
      const fLight = new THREE.PointLight(0xff3300, 2.0, 24);
      fLight.position.set(0, 0, 2);
      furnace.add(fLight);
      mctx.torchLights.push(fLight);
      const fuX = (Math.random() - 0.5) * w * 0.5;
      const fuZ = (Math.random() - 0.5) * d * 0.5;
      furnace.position.set(fuX, getTerrainHeight(fuX, fuZ, 0.4) + 1.5, fuZ);
      mctx.scene.add(furnace);
    }

    // ── Metal barrels/containers (14) ──
    for (let i = 0; i < 14; i++) {
      const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 1.0, 30), i % 3 === 0 ? copperMat : darkMetalMat);
      const baX = (Math.random() - 0.5) * w * 0.75;
      const baZ = (Math.random() - 0.5) * d * 0.75;
      barrel.position.set(baX, getTerrainHeight(baX, baZ, 0.4) + 0.5, baZ);
      mctx.scene.add(barrel);
    }

    // ── Overhead crane tracks (7) ──
    for (let i = 0; i < 7; i++) {
      const crane = new THREE.Group();
      const railLen = 12 + Math.random() * 8;
      const rail = new THREE.Mesh(new THREE.BoxGeometry(railLen, 0.15, 0.3), darkMetalMat);
      crane.add(rail);
      const trolleyOff = (Math.random() - 0.5) * 5;
      const trolley = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.4, 0.5), ironMat);
      trolley.position.set(trolleyOff, -0.25, 0);
      crane.add(trolley);
      const cableLen = 2 + Math.random() * 2;
      const cable = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, cableLen, 17), ironMat);
      cable.position.set(trolleyOff, -0.25 - cableLen / 2, 0);
      crane.add(cable);
      const hook = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.03, 17, 27, Math.PI * 1.5), ironMat);
      hook.position.set(trolleyOff, -0.25 - cableLen - 0.1, 0);
      crane.add(hook);
      crane.position.set((Math.random() - 0.5) * w * 0.6, 5 + Math.random() * 2, (Math.random() - 0.5) * d * 0.6);
      crane.rotation.y = Math.random() * Math.PI;
      mctx.scene.add(crane);
    }

    // ── Tool racks (12) ──
    for (let i = 0; i < 12; i++) {
      const rack = new THREE.Group();
      const frame = new THREE.Mesh(new THREE.BoxGeometry(2, 2.5, 0.1), woodMat);
      rack.add(frame);
      for (let t = 0; t < 4 + Math.floor(Math.random() * 3); t++) {
        const toolH = 0.6 + Math.random() * 0.8;
        const tl = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, toolH, 17), ironMat);
        tl.position.set(-0.7 + t * 0.35, (Math.random() - 0.5) * 1.2, 0.08);
        tl.rotation.z = (Math.random() - 0.5) * 0.3;
        rack.add(tl);
      }
      const rX = (Math.random() - 0.5) * w * 0.7;
      const rZ = (Math.random() - 0.5) * d * 0.7;
      rack.position.set(rX, getTerrainHeight(rX, rZ, 0.4) + 1.3, rZ);
      rack.rotation.y = Math.random() * Math.PI;
      mctx.scene.add(rack);
    }

    // ── Broken automaton parts (10) ──
    for (let i = 0; i < 10; i++) {
      const parts = new THREE.Group();
      const torso = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.8, 0.4), bronzeMat);
      torso.rotation.set(Math.random() * 0.5, 0, Math.random() * Math.PI * 0.5);
      parts.add(torso);
      const limb = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.06, 0.6, 10), copperMat);
      limb.position.set(0.5, 0, (Math.random() - 0.5) * 0.5);
      limb.rotation.z = Math.random() * Math.PI;
      parts.add(limb);
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.15, 23, 23), brassMat);
      head.position.set((Math.random() - 0.5) * 0.8, 0.1, (Math.random() - 0.5) * 0.5);
      parts.add(head);
      const aX = (Math.random() - 0.5) * w * 0.7;
      const aZ = (Math.random() - 0.5) * d * 0.7;
      parts.position.set(aX, getTerrainHeight(aX, aZ, 0.4) + 0.2, aZ);
      mctx.scene.add(parts);
    }

    // ── Pressure gauges (6) ──
    for (let i = 0; i < 6; i++) {
      const gauge = new THREE.Group();
      const face = new THREE.Mesh(new THREE.CircleGeometry(0.25, 16), new THREE.MeshStandardMaterial({ color: 0xeeeecc, roughness: 0.3 }));
      gauge.add(face);
      const rim = new THREE.Mesh(new THREE.TorusGeometry(0.25, 0.03, 23, 44), brassMat);
      gauge.add(rim);
      const needle = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.2, 17), new THREE.MeshStandardMaterial({ color: 0xff0000 }));
      needle.position.set(0, 0.05, 0.02);
      needle.rotation.z = Math.random() * Math.PI - Math.PI / 2;
      gauge.add(needle);
      gauge.position.set((Math.random() - 0.5) * w * 0.6, 1.5 + Math.random() * 2, (Math.random() - 0.5) * d * 0.6);
      mctx.scene.add(gauge);
    }

    // ── Control panels (5) ──
    for (let i = 0; i < 5; i++) {
      const panel = new THREE.Group();
      const board = new THREE.Mesh(new THREE.BoxGeometry(1.5, 1, 0.15), darkMetalMat);
      panel.add(board);
      const btnMats = [redBtnMat, greenBtnMat, yellowBtnMat];
      for (let b = 0; b < 6; b++) {
        const btn = new THREE.Mesh(new THREE.SphereGeometry(0.05, 23, 23), btnMats[b % 3]);
        btn.position.set(-0.5 + (b % 3) * 0.5, 0.15 - Math.floor(b / 3) * 0.3, 0.09);
        panel.add(btn);
      }
      const lever = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.3, 17), ironMat);
      lever.position.set(0.5, 0.1, 0.1);
      lever.rotation.x = -0.4;
      panel.add(lever);
      const pX = (Math.random() - 0.5) * w * 0.6;
      const pZ = (Math.random() - 0.5) * d * 0.6;
      panel.position.set(pX, getTerrainHeight(pX, pZ, 0.4) + 1.2, pZ);
      panel.rotation.y = Math.random() * Math.PI;
      mctx.scene.add(panel);
    }

    // ── Spinning gear assemblies (torus at angles) ──
    for (let i = 0; i < 12; i++) {
      const gearAsm = new THREE.Group();
      const gR1 = 1.5 + Math.random() * 2; const gR2 = 0.8 + Math.random() * 1;
      const g1 = new THREE.Mesh(new THREE.TorusGeometry(gR1, gR1 * 0.12, 23, 44), bronzeMat);
      g1.rotation.x = 0.3 + Math.random() * 0.5; gearAsm.add(g1);
      const g2 = new THREE.Mesh(new THREE.TorusGeometry(gR2, gR2 * 0.12, 23, 36), brassMat);
      g2.rotation.y = 0.8; g2.position.set(gR1 * 0.8, 0.3, 0); gearAsm.add(g2);
      const axle = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.8, 10), darkMetalMat);
      axle.rotation.x = Math.PI / 2; gearAsm.add(axle);
      gearAsm.position.set((Math.random() - 0.5) * w * 0.7, 1 + Math.random() * 5, (Math.random() - 0.5) * d * 0.7);
      mctx.scene.add(gearAsm);
    }

    // ── Molten metal channels ──
    const moltenMat = new THREE.MeshStandardMaterial({ color: 0xff6600, emissive: 0xff4400, emissiveIntensity: 0.9, roughness: 0.2 });
    const channelMat = new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.8 });
    for (let i = 0; i < 8; i++) {
      const ch = new THREE.Group();
      const chLen = 4 + Math.random() * 8;
      const trough = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.15, chLen), channelMat); ch.add(trough);
      const lava = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.08, chLen - 0.2), moltenMat);
      lava.position.y = 0.1; ch.add(lava);
      const chLight = new THREE.PointLight(0xff4400, 0.6, 6);
      chLight.position.y = 0.5; ch.add(chLight); mctx.torchLights.push(chLight);
      // Side walls
      for (const sx of [-0.25, 0.25]) {
        const wall = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.3, chLen), channelMat);
        wall.position.set(sx, 0.15, 0); ch.add(wall);
      }
      ch.position.set((Math.random() - 0.5) * w * 0.6, 0.15, (Math.random() - 0.5) * d * 0.6);
      ch.rotation.y = Math.random() * Math.PI; mctx.scene.add(ch);
    }

    // ── Steam vents ──
    for (let i = 0; i < 15; i++) {
      const vent = new THREE.Group();
      const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.2, 0.5, 12), darkMetalMat);
      vent.add(pipe);
      const grate = new THREE.Mesh(new THREE.CircleGeometry(0.15, 16), new THREE.MeshStandardMaterial({ color: 0x444444, metalness: 0.7, roughness: 0.3, side: THREE.DoubleSide }));
      grate.rotation.x = -Math.PI / 2; grate.position.y = 0.26; vent.add(grate);
      // Steam puffs
      for (let s = 0; s < 3; s++) {
        const puff = new THREE.Mesh(new THREE.SphereGeometry(0.12 + s * 0.08, 23, 20), steamMat);
        puff.position.set((Math.random() - 0.5) * 0.2, 0.4 + s * 0.3, (Math.random() - 0.5) * 0.2);
        puff.scale.set(1 + s * 0.3, 1, 1 + s * 0.3); vent.add(puff);
      }
      const vx = (Math.random() - 0.5) * w * 0.75; const vz = (Math.random() - 0.5) * d * 0.75;
      vent.position.set(vx, getTerrainHeight(vx, vz, 0.4), vz); mctx.scene.add(vent);
    }

    // ── Mechanical pipe networks ──
    for (let i = 0; i < 12; i++) {
      const pipeNet = new THREE.Group();
      const segs = 2 + Math.floor(Math.random() * 3);
      let px = 0; let py = 0; let pz = 0;
      for (let s = 0; s < segs; s++) {
        const pLen = 2 + Math.random() * 4; const pR = 0.08 + Math.random() * 0.1;
        const seg = new THREE.Mesh(new THREE.CylinderGeometry(pR, pR, pLen, 10), copperMat);
        const dir = s % 3;
        if (dir === 0) { seg.position.set(px + pLen / 2, py, pz); seg.rotation.z = Math.PI / 2; px += pLen; }
        else if (dir === 1) { seg.position.set(px, py + pLen / 2, pz); py += pLen; }
        else { seg.position.set(px, py, pz + pLen / 2); seg.rotation.x = Math.PI / 2; pz += pLen; }
        pipeNet.add(seg);
        // Elbow joint
        const elbow = new THREE.Mesh(new THREE.SphereGeometry(pR * 1.5, 23, 23), darkMetalMat);
        elbow.position.set(px, py, pz); pipeNet.add(elbow);
      }
      pipeNet.position.set((Math.random() - 0.5) * w * 0.6, 0.5 + Math.random() * 2, (Math.random() - 0.5) * d * 0.6);
      mctx.scene.add(pipeNet);
    }

    // ── Pressure gauges (more detailed) ──
    for (let i = 0; i < 10; i++) {
      const pg = new THREE.Group();
      const faceR = 0.2 + Math.random() * 0.15;
      const face = new THREE.Mesh(new THREE.CircleGeometry(faceR, 16), new THREE.MeshStandardMaterial({ color: 0xeeeecc, roughness: 0.3 }));
      pg.add(face);
      const rim = new THREE.Mesh(new THREE.TorusGeometry(faceR, 0.02, 23, 44), brassMat); pg.add(rim);
      const needle = new THREE.Mesh(new THREE.BoxGeometry(0.008, faceR * 0.8, 0.002), new THREE.MeshStandardMaterial({ color: 0xff0000 }));
      needle.position.z = 0.01; needle.rotation.z = Math.random() * Math.PI - Math.PI / 2; pg.add(needle);
      // Pipe connection
      const conn = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.3, 10), copperMat);
      conn.position.y = -faceR - 0.15; pg.add(conn);
      pg.position.set((Math.random() - 0.5) * w * 0.65, 1.5 + Math.random() * 3, (Math.random() - 0.5) * d * 0.65);
      pg.rotation.y = Math.random() * Math.PI; mctx.scene.add(pg);
    }

    // ── Anvils (standalone) ──
    for (let i = 0; i < 8; i++) {
      const anvil = new THREE.Group();
      const base = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.4, 0.3), ironMat); anvil.add(base);
      const top = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.12, 0.35), ironMat); top.position.y = 0.26; anvil.add(top);
      const horn = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.3, 10), ironMat);
      horn.rotation.z = Math.PI / 2; horn.position.set(0.5, 0.2, 0); anvil.add(horn);
      const ax = (Math.random() - 0.5) * w * 0.7; const az = (Math.random() - 0.5) * d * 0.7;
      anvil.position.set(ax, getTerrainHeight(ax, az, 0.4) + 0.2, az); mctx.scene.add(anvil);
    }

    // ── Sparking wire bundles ──
    const wireMat = new THREE.MeshStandardMaterial({ color: 0x886633, roughness: 0.5 });
    const sparkMat = new THREE.MeshStandardMaterial({ color: 0xffff44, emissive: 0xffcc00, emissiveIntensity: 1.5, roughness: 0.2 });
    for (let i = 0; i < 10; i++) {
      const bundle = new THREE.Group();
      const wLen = 3 + Math.random() * 5;
      for (let w2 = 0; w2 < 3; w2++) {
        const wire = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, wLen, 17), wireMat);
        wire.position.set((w2 - 1) * 0.03, 0, 0); bundle.add(wire);
      }
      // Spark points
      for (let sp = 0; sp < 2; sp++) {
        const spark = new THREE.Mesh(new THREE.SphereGeometry(0.02, 17, 16), sparkMat);
        spark.position.set(0, (Math.random() - 0.5) * wLen * 0.6, 0); bundle.add(spark);
        const spL = new THREE.PointLight(0xffaa00, 0.3, 2);
        spL.position.copy(spark.position); bundle.add(spL); mctx.torchLights.push(spL);
      }
      bundle.position.set((Math.random() - 0.5) * w * 0.6, 2 + Math.random() * 3, (Math.random() - 0.5) * d * 0.6);
      bundle.rotation.set(Math.random() * 0.5, Math.random() * Math.PI, Math.random() * 0.5);
      mctx.scene.add(bundle);
    }

    // ── Clock mechanisms ──
    for (let i = 0; i < 5; i++) {
      const clock = new THREE.Group();
      const clockR = 1.5 + Math.random() * 1.5;
      const face = new THREE.Mesh(new THREE.CircleGeometry(clockR, 16), new THREE.MeshStandardMaterial({ color: 0xeeddcc, roughness: 0.3 }));
      clock.add(face);
      const rim = new THREE.Mesh(new THREE.TorusGeometry(clockR, 0.08, 27, 44), brassMat); clock.add(rim);
      // Hour markers
      for (let h = 0; h < 12; h++) {
        const ha = (h / 12) * Math.PI * 2;
        const marker = new THREE.Mesh(new THREE.BoxGeometry(0.04, clockR * 0.12, 0.02), darkMetalMat);
        marker.position.set(Math.sin(ha) * clockR * 0.85, Math.cos(ha) * clockR * 0.85, 0.02);
        marker.rotation.z = -ha; clock.add(marker);
      }
      // Hands
      const hourHand = new THREE.Mesh(new THREE.BoxGeometry(0.03, clockR * 0.5, 0.02), darkMetalMat);
      hourHand.position.set(0, clockR * 0.25, 0.03); hourHand.rotation.z = Math.random() * Math.PI * 2; clock.add(hourHand);
      const minHand = new THREE.Mesh(new THREE.BoxGeometry(0.02, clockR * 0.7, 0.02), darkMetalMat);
      minHand.position.set(0, clockR * 0.35, 0.04); minHand.rotation.z = Math.random() * Math.PI * 2; clock.add(minHand);
      // Center hub
      clock.add(new THREE.Mesh(new THREE.SphereGeometry(0.06, 27, 23), bronzeMat));
      clock.position.set((Math.random() - 0.5) * w * 0.5, 3 + Math.random() * 4, (Math.random() - 0.5) * d * 0.5);
      clock.rotation.y = Math.random() * Math.PI; mctx.scene.add(clock);
    }

    // ── Metal catwalks ──
    for (let i = 0; i < 6; i++) {
      const cw = new THREE.Group();
      const cwLen = 6 + Math.random() * 8;
      const cwW = 1.2 + Math.random() * 0.5;
      // Floor grate
      const floor = new THREE.Mesh(new THREE.BoxGeometry(cwW, 0.05, cwLen), new THREE.MeshStandardMaterial({ color: 0x555555, roughness: 0.6, metalness: 0.7 }));
      cw.add(floor);
      // Railings
      for (const rx of [-cwW / 2, cwW / 2]) {
        const rail = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.8, cwLen), ironMat);
        rail.position.set(rx, 0.4, 0); cw.add(rail);
        // Rail posts
        for (let p = 0; p < Math.floor(cwLen / 2); p++) {
          const post = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.8, 17), ironMat);
          post.position.set(rx, 0.4, -cwLen / 2 + p * 2 + 1); cw.add(post);
        }
      }
      // Support columns
      for (const sz of [-cwLen / 2 + 1, cwLen / 2 - 1]) {
        const col = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 3, 10), darkMetalMat);
        col.position.set(0, -1.5, sz); cw.add(col);
      }
      cw.position.set((Math.random() - 0.5) * w * 0.5, 3 + Math.random() * 3, (Math.random() - 0.5) * d * 0.5);
      cw.rotation.y = Math.random() * Math.PI; mctx.scene.add(cw);
    }

    // ── Furnace openings with emissive glow ──
    for (let i = 0; i < 8; i++) {
      const fo = new THREE.Group();
      const frame = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.5, 0.3), forgeMat);
      fo.add(frame);
      const opening = new THREE.Mesh(new THREE.BoxGeometry(0.8, 1.0, 0.1), new THREE.MeshStandardMaterial({ color: 0xff3300, emissive: 0xff2200, emissiveIntensity: 1.2 }));
      opening.position.z = 0.11; fo.add(opening);
      const glow = new THREE.PointLight(0xff3300, 1.5, 8);
      glow.position.set(0, 0, 0.5); fo.add(glow); mctx.torchLights.push(glow);
      // Heat shimmer (transparent planes)
      for (let h = 0; h < 3; h++) {
        const shimmer = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.4 + h * 0.3), new THREE.MeshStandardMaterial({ color: 0xff6600, transparent: true, opacity: 0.08, side: THREE.DoubleSide }));
        shimmer.position.set(0, 1.0 + h * 0.4, 0.3); fo.add(shimmer);
      }
      const fox = (Math.random() - 0.5) * w * 0.6; const foz = (Math.random() - 0.5) * d * 0.6;
      fo.position.set(fox, getTerrainHeight(fox, foz, 0.4) + 0.75, foz);
      fo.rotation.y = Math.random() * Math.PI; mctx.scene.add(fo);
    }

    // ── Gear/cog wall decorations (detailed) ──
    for (let i = 0; i < 14; i++) {
      const wallGear = new THREE.Group();
      const wgR = 0.4 + Math.random() * 0.8;
      const wgTeeth = 10 + Math.floor(Math.random() * 6);
      const wgRing = new THREE.Mesh(new THREE.TorusGeometry(wgR, wgR * 0.08, 8, wgTeeth), bronzeMat);
      wallGear.add(wgRing);
      for (let t = 0; t < wgTeeth; t++) {
        const ta = (t / wgTeeth) * Math.PI * 2;
        const tooth = new THREE.Mesh(new THREE.BoxGeometry(wgR * 0.12, wgR * 0.18, wgR * 0.08), brassMat);
        tooth.position.set(Math.cos(ta) * wgR, Math.sin(ta) * wgR, 0);
        tooth.rotation.z = ta; wallGear.add(tooth);
      }
      const wgHub = new THREE.Mesh(new THREE.CylinderGeometry(wgR * 0.15, wgR * 0.15, wgR * 0.1, 10), darkMetalMat);
      wgHub.rotation.x = Math.PI / 2; wallGear.add(wgHub);
      wallGear.position.set((Math.random() - 0.5) * w * 0.7, 1.5 + Math.random() * 4, (Math.random() - 0.5) * d * 0.7);
      wallGear.rotation.y = Math.random() * Math.PI; mctx.scene.add(wallGear);
    }

    // ── Steam pipe networks (connected with elbow joints) ──
    for (let i = 0; i < 10; i++) {
      const steamNet = new THREE.Group();
      const netSegs = 3 + Math.floor(Math.random() * 3);
      let snx = 0; let sny = 0; let snz = 0;
      for (let s = 0; s < netSegs; s++) {
        const sLen = 1.5 + Math.random() * 3; const sR = 0.06 + Math.random() * 0.06;
        const seg = new THREE.Mesh(new THREE.CylinderGeometry(sR, sR, sLen, 16), copperMat);
        const dir = s % 3;
        if (dir === 0) { seg.position.set(snx + sLen / 2, sny, snz); seg.rotation.z = Math.PI / 2; snx += sLen; }
        else if (dir === 1) { seg.position.set(snx, sny + sLen / 2, snz); sny += sLen; }
        else { seg.position.set(snx, sny, snz + sLen / 2); seg.rotation.x = Math.PI / 2; snz += sLen; }
        steamNet.add(seg);
        const elbow = new THREE.Mesh(new THREE.SphereGeometry(sR * 1.4, 16, 16), darkMetalMat);
        elbow.position.set(snx, sny, snz); steamNet.add(elbow);
        // Valve wheel at random joints
        if (Math.random() > 0.6) {
          const valve = new THREE.Mesh(new THREE.TorusGeometry(sR * 2.5, sR * 0.4, 8, 16), ironMat);
          valve.position.set(snx, sny, snz); valve.rotation.x = Math.random() * Math.PI;
          steamNet.add(valve);
        }
      }
      steamNet.position.set((Math.random() - 0.5) * w * 0.55, 0.5 + Math.random() * 2, (Math.random() - 0.5) * d * 0.55);
      mctx.scene.add(steamNet);
    }

    // ── Pressure gauge details on walls ──
    for (let i = 0; i < 12; i++) {
      const pgDetail = new THREE.Group();
      const pgR = 0.15 + Math.random() * 0.12;
      const pgFace = new THREE.Mesh(new THREE.CircleGeometry(pgR, 16), new THREE.MeshStandardMaterial({ color: 0xeeeecc, roughness: 0.3 }));
      pgDetail.add(pgFace);
      const pgRim = new THREE.Mesh(new THREE.TorusGeometry(pgR, 0.015, 16, 32), brassMat);
      pgDetail.add(pgRim);
      const pgNeedle = new THREE.Mesh(new THREE.BoxGeometry(0.006, pgR * 0.75, 0.002), new THREE.MeshStandardMaterial({ color: 0xff0000 }));
      pgNeedle.position.z = 0.01; pgNeedle.rotation.z = Math.random() * Math.PI - Math.PI / 2; pgDetail.add(pgNeedle);
      // Tick marks
      for (let t = 0; t < 8; t++) {
        const ta = (t / 8) * Math.PI * 1.5 - Math.PI * 0.75;
        const tick = new THREE.Mesh(new THREE.BoxGeometry(0.003, pgR * 0.15, 0.001), new THREE.MeshStandardMaterial({ color: 0x333333 }));
        tick.position.set(Math.sin(ta) * pgR * 0.8, Math.cos(ta) * pgR * 0.8, 0.005);
        tick.rotation.z = -ta; pgDetail.add(tick);
      }
      const pgPipe = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.2, 12), copperMat);
      pgPipe.position.y = -pgR - 0.1; pgDetail.add(pgPipe);
      pgDetail.position.set((Math.random() - 0.5) * w * 0.65, 1.5 + Math.random() * 3, (Math.random() - 0.5) * d * 0.65);
      pgDetail.rotation.y = Math.random() * Math.PI; mctx.scene.add(pgDetail);
    }

    // ── Conveyor belt segments (detailed) ──
    for (let i = 0; i < 8; i++) {
      const convDetail = new THREE.Group();
      const cdLen = 3 + Math.random() * 5;
      const cdBelt = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.06, cdLen), darkMetalMat);
      convDetail.add(cdBelt);
      // Side rails
      for (const sx of [-0.65, 0.65]) {
        const rail = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.15, cdLen), ironMat);
        rail.position.set(sx, 0.05, 0); convDetail.add(rail);
      }
      // Roller cylinders underneath
      const rollerCount = Math.floor(cdLen / 0.5);
      for (let r = 0; r < rollerCount; r++) {
        const roller = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 1.3, 12), ironMat);
        roller.rotation.z = Math.PI / 2;
        roller.position.set(0, -0.1, -cdLen / 2 + r * 0.5 + 0.25);
        convDetail.add(roller);
      }
      // Items on belt (small boxes)
      for (let b = 0; b < 2 + Math.floor(Math.random() * 3); b++) {
        const item = new THREE.Mesh(new THREE.BoxGeometry(0.15 + Math.random() * 0.15, 0.1, 0.15), bronzeMat);
        item.position.set((Math.random() - 0.5) * 0.6, 0.08, (Math.random() - 0.5) * cdLen * 0.6);
        convDetail.add(item);
      }
      convDetail.position.set((Math.random() - 0.5) * w * 0.55, 1.0, (Math.random() - 0.5) * d * 0.55);
      convDetail.rotation.y = Math.random() * Math.PI; mctx.scene.add(convDetail);
    }

    // ── Spark emitter details near machinery ──
    for (let i = 0; i < 16; i++) {
      const sparkCluster = new THREE.Group();
      const sparkCount = 3 + Math.floor(Math.random() * 5);
      for (let s = 0; s < sparkCount; s++) {
        const sparkSphere = new THREE.Mesh(new THREE.SphereGeometry(0.015 + Math.random() * 0.01, 8, 8),
          new THREE.MeshStandardMaterial({ color: 0xffff44, emissive: 0xffcc00, emissiveIntensity: 2.0, roughness: 0.1 }));
        sparkSphere.position.set((Math.random() - 0.5) * 0.3, (Math.random() - 0.5) * 0.3, (Math.random() - 0.5) * 0.3);
        sparkCluster.add(sparkSphere);
      }
      const spkL = new THREE.PointLight(0xffaa00, 0.2, 2);
      sparkCluster.add(spkL); mctx.torchLights.push(spkL);
      sparkCluster.position.set((Math.random() - 0.5) * w * 0.6, 0.5 + Math.random() * 3, (Math.random() - 0.5) * d * 0.6);
      mctx.scene.add(sparkCluster);
    }

    // ── Riveted metal plate patterns on walls ──
    for (let i = 0; i < 10; i++) {
      const plate = new THREE.Group();
      const pW = 1.5 + Math.random() * 2; const pH = 1.5 + Math.random() * 2;
      const plateBody = new THREE.Mesh(new THREE.BoxGeometry(pW, pH, 0.08), darkMetalMat);
      plate.add(plateBody);
      // Rivet grid
      const cols = Math.floor(pW / 0.3); const rows = Math.floor(pH / 0.3);
      for (let rx = 0; rx < cols; rx++) {
        for (let ry = 0; ry < rows; ry++) {
          const rivet = new THREE.Mesh(new THREE.SphereGeometry(0.02, 8, 6), ironMat);
          rivet.position.set(-pW / 2 + 0.15 + rx * 0.3, -pH / 2 + 0.15 + ry * 0.3, 0.05);
          plate.add(rivet);
        }
      }
      // Seam lines
      const seam = new THREE.Mesh(new THREE.BoxGeometry(pW, 0.01, 0.002), ironMat);
      seam.position.z = 0.042; plate.add(seam);
      plate.position.set((Math.random() - 0.5) * w * 0.65, 1 + Math.random() * 4, (Math.random() - 0.5) * d * 0.65);
      plate.rotation.y = Math.random() * Math.PI; mctx.scene.add(plate);
    }

    // ── Furnace structures with chimneys and slag (6) ──
    const furnaceGlowMat = new THREE.MeshStandardMaterial({ color: 0xff6600, emissive: 0xff4400, emissiveIntensity: 1.2, roughness: 0.3 });
    const slagMat = new THREE.MeshStandardMaterial({ color: 0x2a2018, roughness: 0.9 });
    for (let i = 0; i < 6; i++) {
      const furnaceUnit = new THREE.Group();
      const furnaceBody = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.4, 3.5, 12), forgeMat);
      furnaceBody.position.y = 1.75;
      furnaceUnit.add(furnaceBody);
      const topGlow = new THREE.Mesh(new THREE.CircleGeometry(1.1, 27), furnaceGlowMat);
      topGlow.rotation.x = -Math.PI / 2;
      topGlow.position.y = 3.52;
      furnaceUnit.add(topGlow);
      const topLight = new THREE.PointLight(0xff5500, 1.5, 12);
      topLight.position.y = 4.0;
      furnaceUnit.add(topLight);
      mctx.torchLights.push(topLight);
      const chimneyH2 = 4 + Math.random() * 2;
      const chimStack = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.35, chimneyH2, 10), darkMetalMat);
      chimStack.position.set(0.6, 3.5 + chimneyH2 / 2, 0);
      furnaceUnit.add(chimStack);
      const chimTop = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.3, 0.3, 10), darkMetalMat);
      chimTop.position.set(0.6, 3.5 + chimneyH2 + 0.15, 0);
      furnaceUnit.add(chimTop);
      for (let s = 0; s < 5; s++) {
        const slagR = 0.15 + Math.random() * 0.25;
        const slagBall = new THREE.Mesh(new THREE.SphereGeometry(slagR, 8, 7), slagMat);
        slagBall.position.set(-1.8 + (Math.random() - 0.5) * 1.2, slagR * 0.6, (Math.random() - 0.5) * 1.0);
        furnaceUnit.add(slagBall);
      }
      const fuuX = (Math.random() - 0.5) * w * 0.55;
      const fuuZ = (Math.random() - 0.5) * d * 0.55;
      furnaceUnit.position.set(fuuX, getTerrainHeight(fuuX, fuuZ, 0.4), fuuZ);
      furnaceUnit.rotation.y = Math.random() * Math.PI;
      mctx.scene.add(furnaceUnit);
    }

    // ── Crane/hoist structures (5) ──
    for (let i = 0; i < 5; i++) {
      const craneStruct = new THREE.Group();
      const craneMastH = 7 + Math.random() * 3;
      const craneMast = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.25, craneMastH, 10), darkMetalMat);
      craneMast.position.y = craneMastH / 2;
      craneStruct.add(craneMast);
      const craneArmLen = 4 + Math.random() * 2;
      const craneArm = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, craneArmLen, 16), ironMat);
      craneArm.rotation.z = Math.PI / 2;
      craneArm.position.set(craneArmLen / 2, craneMastH - 0.2, 0);
      craneStruct.add(craneArm);
      const craneCableLen = 3 + Math.random() * 2;
      const craneCable = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, craneCableLen, 8), ironMat);
      craneCable.position.set(craneArmLen * 0.8, craneMastH - 0.2 - craneCableLen / 2, 0);
      craneStruct.add(craneCable);
      const craneHook = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.03, 12, 20, Math.PI * 1.3), ironMat);
      craneHook.position.set(craneArmLen * 0.8, craneMastH - 0.2 - craneCableLen - 0.1, 0);
      craneStruct.add(craneHook);
      const craneBasePlate = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.2, 1.5), darkMetalMat);
      craneBasePlate.position.y = 0.1;
      craneStruct.add(craneBasePlate);
      const csX = (Math.random() - 0.5) * w * 0.55;
      const csZ = (Math.random() - 0.5) * d * 0.55;
      craneStruct.position.set(csX, getTerrainHeight(csX, csZ, 0.4), csZ);
      craneStruct.rotation.y = Math.random() * Math.PI;
      mctx.scene.add(craneStruct);
    }

    // ── Wall-mounted control panels with indicator lights and levers (8) ──
    const indRedMat = new THREE.MeshStandardMaterial({ color: 0xff2222, emissive: 0xff0000, emissiveIntensity: 0.8, roughness: 0.2 });
    const indGreenMat = new THREE.MeshStandardMaterial({ color: 0x22ff22, emissive: 0x00ff00, emissiveIntensity: 0.8, roughness: 0.2 });
    const indAmberMat = new THREE.MeshStandardMaterial({ color: 0xffaa22, emissive: 0xffaa00, emissiveIntensity: 0.8, roughness: 0.2 });
    const indicatorMats = [indRedMat, indGreenMat, indAmberMat];
    for (let i = 0; i < 8; i++) {
      const ctrlPanel = new THREE.Group();
      const panelBox = new THREE.Mesh(new THREE.BoxGeometry(1.8, 1.2, 0.2), darkMetalMat);
      ctrlPanel.add(panelBox);
      for (let row = 0; row < 2; row++) {
        for (let col = 0; col < 3; col++) {
          const indLight = new THREE.Mesh(new THREE.SphereGeometry(0.04, 12, 12), indicatorMats[col]);
          indLight.position.set(-0.5 + col * 0.5, 0.3 - row * 0.35, 0.12);
          ctrlPanel.add(indLight);
        }
      }
      for (let lv = 0; lv < 2; lv++) {
        const leverStick = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.35, 12), ironMat);
        leverStick.position.set(-0.3 + lv * 0.6, -0.2, 0.15);
        leverStick.rotation.x = -0.4 + Math.random() * 0.8;
        ctrlPanel.add(leverStick);
        const leverKnob = new THREE.Mesh(new THREE.SphereGeometry(0.04, 10, 10), redBtnMat);
        leverKnob.position.set(-0.3 + lv * 0.6, -0.02, 0.22);
        ctrlPanel.add(leverKnob);
      }
      const cpnX = (Math.random() - 0.5) * w * 0.6;
      const cpnZ = (Math.random() - 0.5) * d * 0.6;
      ctrlPanel.position.set(cpnX, getTerrainHeight(cpnX, cpnZ, 0.4) + 1.5, cpnZ);
      ctrlPanel.rotation.y = Math.random() * Math.PI;
      mctx.scene.add(ctrlPanel);
    }

    // ── Metal walkways/catwalks with X-brace supports (6) ──
    for (let i = 0; i < 6; i++) {
      const walkway = new THREE.Group();
      const wkLen = 8 + Math.random() * 6;
      const wkW = 1.5 + Math.random() * 0.5;
      const wkH = 3 + Math.random() * 2;
      const wkPlatform = new THREE.Mesh(new THREE.BoxGeometry(wkW, 0.08, wkLen), ironMat);
      wkPlatform.position.y = wkH;
      walkway.add(wkPlatform);
      const wkPostCount = Math.floor(wkLen / 1.5);
      for (const wkSide of [-wkW / 2, wkW / 2]) {
        const wkRailing = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.7, wkLen), ironMat);
        wkRailing.position.set(wkSide, wkH + 0.35, 0);
        walkway.add(wkRailing);
        for (let p = 0; p < wkPostCount; p++) {
          const wkPost = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.7, 8), ironMat);
          wkPost.position.set(wkSide, wkH + 0.35, -wkLen / 2 + p * 1.5 + 0.75);
          walkway.add(wkPost);
        }
      }
      const wkBraceCount = Math.floor(wkLen / 3);
      for (let b = 0; b < wkBraceCount; b++) {
        const bz = -wkLen / 2 + b * 3 + 1.5;
        for (const sx of [-wkW / 2 + 0.1, wkW / 2 - 0.1]) {
          const wkLeg = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, wkH, 12), darkMetalMat);
          wkLeg.position.set(sx, wkH / 2, bz);
          walkway.add(wkLeg);
        }
        const diagLen = Math.sqrt(wkW * wkW + wkH * wkH) * 0.85;
        const xBrace1 = new THREE.Mesh(new THREE.BoxGeometry(0.04, diagLen, 0.04), ironMat);
        xBrace1.position.set(0, wkH / 2, bz);
        xBrace1.rotation.z = Math.atan2(wkW, wkH);
        walkway.add(xBrace1);
        const xBrace2 = new THREE.Mesh(new THREE.BoxGeometry(0.04, diagLen, 0.04), ironMat);
        xBrace2.position.set(0, wkH / 2, bz);
        xBrace2.rotation.z = -Math.atan2(wkW, wkH);
        walkway.add(xBrace2);
      }
      const wkX = (Math.random() - 0.5) * w * 0.5;
      const wkZ = (Math.random() - 0.5) * d * 0.5;
      walkway.position.set(wkX, getTerrainHeight(wkX, wkZ, 0.4), wkZ);
      walkway.rotation.y = Math.random() * Math.PI;
      mctx.scene.add(walkway);
    }

    // ── Anvil props (10) ──
    const anvilDarkMat = new THREE.MeshStandardMaterial({ color: 0x2a2a2a, roughness: 0.6, metalness: 0.7 });
    for (let i = 0; i < 10; i++) {
      const anvilProp = new THREE.Group();
      const anvilStump = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.6, 0.5), woodMat);
      anvilStump.position.y = 0.3;
      anvilProp.add(anvilStump);
      const anvilPropBody = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.3, 0.2), anvilDarkMat);
      anvilPropBody.position.y = 0.75;
      anvilProp.add(anvilPropBody);
      const anvilFace = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.08, 0.25), anvilDarkMat);
      anvilFace.position.y = 0.94;
      anvilProp.add(anvilFace);
      const anvilHornTip = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.06, 0.15), anvilDarkMat);
      anvilHornTip.position.set(0.3, 0.88, 0);
      anvilProp.add(anvilHornTip);
      const apX = (Math.random() - 0.5) * w * 0.65;
      const apZ = (Math.random() - 0.5) * d * 0.65;
      anvilProp.position.set(apX, getTerrainHeight(apX, apZ, 0.4), apZ);
      anvilProp.rotation.y = Math.random() * Math.PI;
      mctx.scene.add(anvilProp);
    }

    // ── Water cooling troughs (8) ──
    const waterCoolMat = new THREE.MeshStandardMaterial({ color: 0x3388cc, roughness: 0.1, transparent: true, opacity: 0.5 });
    for (let i = 0; i < 8; i++) {
      const coolingTrough = new THREE.Group();
      const troughLen = 2.5 + Math.random() * 2;
      const troughOuter = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.4, troughLen), darkMetalMat);
      troughOuter.position.y = 0.5;
      coolingTrough.add(troughOuter);
      const troughInner = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.35, troughLen - 0.1), new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.9 }));
      troughInner.position.y = 0.53;
      coolingTrough.add(troughInner);
      const troughWater = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.03, troughLen - 0.15), waterCoolMat);
      troughWater.position.y = 0.65;
      coolingTrough.add(troughWater);
      for (const tlx of [-0.2, 0.2]) {
        for (const tlz of [-troughLen / 2 + 0.3, troughLen / 2 - 0.3]) {
          const troughLeg = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.3, 0.08), ironMat);
          troughLeg.position.set(tlx, 0.15, tlz);
          coolingTrough.add(troughLeg);
        }
      }
      const ctX = (Math.random() - 0.5) * w * 0.6;
      const ctZ = (Math.random() - 0.5) * d * 0.6;
      coolingTrough.position.set(ctX, getTerrainHeight(ctX, ctZ, 0.4), ctZ);
      coolingTrough.rotation.y = Math.random() * Math.PI;
      mctx.scene.add(coolingTrough);
    }
}

export function buildCrimsonCitadel(mctx: MapBuildContext, w: number, d: number): void {
    mctx.scene.fog = new THREE.FogExp2(0x331122, 0.02);
    mctx.applyTerrainColors(0x3a1122, 0x4a2233, 0.6);
    mctx.dirLight.color.setHex(0x993333);
    mctx.dirLight.intensity = 0.6;
    mctx.ambientLight.color.setHex(0x331111);
    mctx.ambientLight.intensity = 0.35;
    mctx.hemiLight.color.setHex(0x663333);
    mctx.hemiLight.groundColor.setHex(0x220808);

    const darkStoneMat = new THREE.MeshStandardMaterial({ color: 0x4a2233, roughness: 0.85 });
    const redStoneMat = new THREE.MeshStandardMaterial({ color: 0x662233, roughness: 0.8 });
    const ironMat = new THREE.MeshStandardMaterial({ color: 0x444444, roughness: 0.7, metalness: 0.5 });
    const bloodMat = new THREE.MeshStandardMaterial({ color: 0x880022, roughness: 0.2, transparent: true, opacity: 0.7 });
    const bloodStainMat = new THREE.MeshStandardMaterial({ color: 0x550011, roughness: 0.6, transparent: true, opacity: 0.5 });
    const boneMat = new THREE.MeshStandardMaterial({ color: 0xddccbb, roughness: 0.7 });
    const woodMat = new THREE.MeshStandardMaterial({ color: 0x3a2211, roughness: 0.8 });
    const candleMat = new THREE.MeshStandardMaterial({ color: 0xeeddcc, roughness: 0.4 });
    const chainMat = new THREE.MeshStandardMaterial({ color: 0x555555, roughness: 0.6, metalness: 0.6 });
    const frameMat = new THREE.MeshStandardMaterial({ color: 0x8B6914, roughness: 0.6, metalness: 0.3 });

    // ── Stone walls (15+) ──
    for (let i = 0; i < 18; i++) {
      const wallH = 4 + Math.random() * 6;
      const wallW = 3 + Math.random() * 8;
      const wall = new THREE.Mesh(new THREE.BoxGeometry(wallW, wallH, 1.2), darkStoneMat);
      const wX = (Math.random() - 0.5) * w * 0.8;
      const wZ = (Math.random() - 0.5) * d * 0.8;
      wall.position.set(wX, wallH / 2, wZ);
      wall.rotation.y = Math.random() * Math.PI;
      mctx.scene.add(wall);
      // Crenellations on top
      for (let c = 0; c < Math.floor(wallW / 1.2); c++) {
        const merlon = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.8, 1.3), darkStoneMat);
        merlon.position.set(wX + (c - wallW / 2.4) * 1.2, wallH + 0.4, wZ);
        merlon.rotation.y = wall.rotation.y;
        mctx.scene.add(merlon);
      }
    }

    // ── Blood fountains/pools (12+) ──
    for (let i = 0; i < 14; i++) {
      const pool = new THREE.Group();
      const basin = new THREE.Mesh(new THREE.CircleGeometry(1 + Math.random() * 1.5, 16), bloodMat);
      basin.rotation.x = -Math.PI / 2;
      basin.position.y = 0.03;
      pool.add(basin);
      const rim = new THREE.Mesh(new THREE.TorusGeometry(1 + Math.random() * 1.5, 0.15, 23, 44), darkStoneMat);
      rim.rotation.x = Math.PI / 2;
      rim.position.y = 0.15;
      pool.add(rim);
      if (i % 3 === 0) {
        const spout = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.15, 1.5, 12), darkStoneMat);
        spout.position.y = 0.75;
        pool.add(spout);
        const spoutTop = new THREE.Mesh(new THREE.SphereGeometry(0.2, 14, 10), redStoneMat);
        spoutTop.position.y = 1.5;
        pool.add(spoutTop);
      }
      pool.position.set((Math.random() - 0.5) * w * 0.7, getTerrainHeight(0, 0, 0.6), (Math.random() - 0.5) * d * 0.7);
      mctx.scene.add(pool);
    }

    // ── Iron cages (20+) ──
    for (let i = 0; i < 22; i++) {
      const cage = new THREE.Group();
      const cageH = 1.5 + Math.random() * 1.5;
      const cageW = 0.8 + Math.random() * 0.5;
      // Frame
      const bottom = new THREE.Mesh(new THREE.BoxGeometry(cageW, 0.06, cageW), ironMat);
      cage.add(bottom);
      const top = new THREE.Mesh(new THREE.BoxGeometry(cageW, 0.06, cageW), ironMat);
      top.position.y = cageH;
      cage.add(top);
      // Bars
      for (let b = 0; b < 8; b++) {
        const angle = (b / 8) * Math.PI * 2;
        const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, cageH, 17), ironMat);
        bar.position.set(Math.cos(angle) * cageW * 0.45, cageH / 2, Math.sin(angle) * cageW * 0.45);
        cage.add(bar);
      }
      // Skeleton skull in some
      if (i % 3 === 0) {
        const skull = new THREE.Mesh(new THREE.SphereGeometry(0.12, 23, 23), boneMat);
        skull.position.set(0, 0.3, 0);
        cage.add(skull);
        const jaw = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.05, 0.08), boneMat);
        jaw.position.set(0, 0.2, 0.08);
        cage.add(jaw);
      }
      const cX = (Math.random() - 0.5) * w * 0.75;
      const cZ = (Math.random() - 0.5) * d * 0.75;
      cage.position.set(cX, getTerrainHeight(cX, cZ, 0.6) + 0.5, cZ);
      mctx.scene.add(cage);
    }

    // ── Torture devices (8+) ──
    for (let i = 0; i < 10; i++) {
      const device = new THREE.Group();
      if (i % 3 === 0) {
        // Rack
        const base = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.2, 3), woodMat);
        device.add(base);
        const post1 = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 1.5, 10), woodMat);
        post1.position.set(0, 0.85, -1.2);
        device.add(post1);
        const post2 = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 1.5, 10), woodMat);
        post2.position.set(0, 0.85, 1.2);
        device.add(post2);
      } else if (i % 3 === 1) {
        // Wheel
        const wheel = new THREE.Mesh(new THREE.TorusGeometry(1, 0.08, 23, 44), woodMat);
        device.add(wheel);
        const spoke1 = new THREE.Mesh(new THREE.BoxGeometry(2, 0.06, 0.06), woodMat);
        device.add(spoke1);
        const spoke2 = new THREE.Mesh(new THREE.BoxGeometry(0.06, 2, 0.06), woodMat);
        device.add(spoke2);
        const stand = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.15, 2, 10), woodMat);
        stand.position.y = -1.5;
        device.add(stand);
      } else {
        // Chain post
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 8, 10), ironMat);
        post.position.y = 1.5;
        device.add(post);
        for (let c = 0; c < 4; c++) {
          const link = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.025, 17, 27), chainMat);
          link.position.set(0.2, 2.5 - c * 0.2, 0);
          link.rotation.x = c % 2 === 0 ? 0 : Math.PI / 2;
          device.add(link);
        }
      }
      const dX = (Math.random() - 0.5) * w * 0.6;
      const dZ = (Math.random() - 0.5) * d * 0.6;
      device.position.set(dX, getTerrainHeight(dX, dZ, 0.6), dZ);
      device.rotation.y = Math.random() * Math.PI;
      mctx.scene.add(device);
    }

    // ── Wall-mounted torches (15+) ──
    for (let i = 0; i < 18; i++) {
      const torch = new THREE.Group();
      const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.6, 10), ironMat);
      torch.add(handle);
      const bracket = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.06, 0.06), ironMat);
      bracket.position.set(-0.15, -0.2, 0);
      torch.add(bracket);
      const tLight = new THREE.PointLight(0xff4422, 1.0, 8);
      tLight.position.set(0, 0.4, 0);
      torch.add(tLight);
      mctx.torchLights.push(tLight);
      const tX = (Math.random() - 0.5) * w * 0.75;
      const tZ = (Math.random() - 0.5) * d * 0.75;
      torch.position.set(tX, 2 + Math.random() * 3, tZ);
      mctx.scene.add(torch);
    }

    // ── Gargoyle statues (10+) ──
    for (let i = 0; i < 12; i++) {
      const garg = new THREE.Group();
      const body = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.8, 0.5), darkStoneMat);
      garg.add(body);
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.25, 23, 23), darkStoneMat);
      head.position.set(0, 0.5, 0.2);
      garg.add(head);
      const wing1 = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.5, 0.05), darkStoneMat);
      wing1.position.set(-0.6, 0.3, 0);
      wing1.rotation.z = 0.3;
      garg.add(wing1);
      const wing2 = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.5, 0.05), darkStoneMat);
      wing2.position.set(0.6, 0.3, 0);
      wing2.rotation.z = -0.3;
      garg.add(wing2);
      const gX = (Math.random() - 0.5) * w * 0.75;
      const gZ = (Math.random() - 0.5) * d * 0.75;
      garg.position.set(gX, 4 + Math.random() * 4, gZ);
      mctx.scene.add(garg);
    }

    // ── Grand staircases (6+) ──
    for (let i = 0; i < 7; i++) {
      const stair = new THREE.Group();
      const steps = 6 + Math.floor(Math.random() * 6);
      for (let s = 0; s < steps; s++) {
        const step = new THREE.Mesh(new THREE.BoxGeometry(3, 0.3, 0.8), redStoneMat);
        step.position.set(0, s * 0.3, s * 0.8);
        stair.add(step);
      }
      const sX = (Math.random() - 0.5) * w * 0.6;
      const sZ = (Math.random() - 0.5) * d * 0.6;
      stair.position.set(sX, getTerrainHeight(sX, sZ, 0.6), sZ);
      stair.rotation.y = Math.random() * Math.PI;
      mctx.scene.add(stair);
    }

    // ── Floor bloodstains (25+) ──
    for (let i = 0; i < 28; i++) {
      const stain = new THREE.Mesh(new THREE.CircleGeometry(0.3 + Math.random() * 1.5, 16), bloodStainMat);
      stain.rotation.x = -Math.PI / 2;
      const sX = (Math.random() - 0.5) * w * 0.8;
      const sZ = (Math.random() - 0.5) * d * 0.8;
      stain.position.set(sX, getTerrainHeight(sX, sZ, 0.6) + 0.02, sZ);
      mctx.scene.add(stain);
    }

    // ── Chandeliers (8+) ──
    for (let i = 0; i < 10; i++) {
      const chandelier = new THREE.Group();
      const ringR = 0.8 + Math.random() * 0.5;
      const chanRing = new THREE.Mesh(new THREE.TorusGeometry(ringR, 0.04, 23, 36), ironMat);
      chanRing.rotation.x = Math.PI / 2;
      chandelier.add(chanRing);
      for (let c = 0; c < 6; c++) {
        const angle = (c / 6) * Math.PI * 2;
        const candle = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.2, 17), candleMat);
        candle.position.set(Math.cos(angle) * ringR, -0.1, Math.sin(angle) * ringR);
        chandelier.add(candle);
      }
      const cLight = new THREE.PointLight(0xff6633, 0.8, 10);
      cLight.position.y = 0.2;
      chandelier.add(cLight);
      mctx.torchLights.push(cLight);
      const chain = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 2 + Math.random() * 2, 17), chainMat);
      chain.position.y = 1.5;
      chandelier.add(chain);
      chandelier.position.set((Math.random() - 0.5) * w * 0.6, 5 + Math.random() * 3, (Math.random() - 0.5) * d * 0.6);
      mctx.scene.add(chandelier);
    }

    // ── Weapon racks (12+) ──
    for (let i = 0; i < 14; i++) {
      const rack = new THREE.Group();
      const backboard = new THREE.Mesh(new THREE.BoxGeometry(2, 2, 0.1), woodMat);
      rack.add(backboard);
      for (let s = 0; s < 3; s++) {
        // Sword shapes
        const blade = new THREE.Mesh(new THREE.BoxGeometry(0.06, 1.2, 0.02), ironMat);
        blade.position.set(-0.6 + s * 0.6, 0.2, 0.08);
        rack.add(blade);
        const guard = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.04, 0.04), ironMat);
        guard.position.set(-0.6 + s * 0.6, -0.4, 0.08);
        rack.add(guard);
      }
      const rX = (Math.random() - 0.5) * w * 0.7;
      const rZ = (Math.random() - 0.5) * d * 0.7;
      rack.position.set(rX, getTerrainHeight(rX, rZ, 0.6) + 1.5, rZ);
      rack.rotation.y = Math.random() * Math.PI;
      mctx.scene.add(rack);
    }

    // ── Throne platforms (4+) ──
    for (let i = 0; i < 5; i++) {
      const throne = new THREE.Group();
      const platform = new THREE.Mesh(new THREE.BoxGeometry(4, 0.6, 4), redStoneMat);
      throne.add(platform);
      const seat = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.3, 1.2), redStoneMat);
      seat.position.set(0, 0.45, 0);
      throne.add(seat);
      const back = new THREE.Mesh(new THREE.BoxGeometry(1.2, 2.5, 0.2), redStoneMat);
      back.position.set(0, 1.55, -0.5);
      throne.add(back);
      const arm1 = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.8, 1), redStoneMat);
      arm1.position.set(-0.55, 0.7, -0.1);
      throne.add(arm1);
      const arm2 = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.8, 1), redStoneMat);
      arm2.position.set(0.55, 0.7, -0.1);
      throne.add(arm2);
      const thX = (Math.random() - 0.5) * w * 0.5;
      const thZ = (Math.random() - 0.5) * d * 0.5;
      throne.position.set(thX, getTerrainHeight(thX, thZ, 0.6), thZ);
      throne.rotation.y = Math.random() * Math.PI;
      mctx.scene.add(throne);
    }

    // ── Crumbling towers (10+) ──
    for (let i = 0; i < 12; i++) {
      const towerH = 3 + Math.random() * 6;
      const towerR = 0.8 + Math.random() * 1.2;
      const tower = new THREE.Mesh(new THREE.CylinderGeometry(towerR * 0.8, towerR, towerH, 12), darkStoneMat);
      const twX = (Math.random() - 0.5) * w * 0.8;
      const twZ = (Math.random() - 0.5) * d * 0.8;
      tower.position.set(twX, towerH / 2, twZ);
      tower.rotation.x = (Math.random() - 0.5) * 0.15;
      tower.rotation.z = (Math.random() - 0.5) * 0.15;
      mctx.scene.add(tower);
    }

    // ── Scattered bones (15+) ──
    for (let i = 0; i < 18; i++) {
      const bone = new THREE.Mesh(
        new THREE.CylinderGeometry(0.03, 0.04, 0.4 + Math.random() * 0.3, 10),
        boneMat,
      );
      const boX = (Math.random() - 0.5) * w * 0.8;
      const boZ = (Math.random() - 0.5) * d * 0.8;
      bone.position.set(boX, getTerrainHeight(boX, boZ, 0.6) + 0.05, boZ);
      bone.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
      mctx.scene.add(bone);
    }

    // ── Portrait frames (6+) ──
    for (let i = 0; i < 8; i++) {
      const portrait = new THREE.Group();
      const frame = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.6, 0.08), frameMat);
      portrait.add(frame);
      const canvas = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 1.3), new THREE.MeshStandardMaterial({ color: 0x222211, roughness: 0.9 }));
      canvas.position.z = 0.05;
      portrait.add(canvas);
      portrait.position.set((Math.random() - 0.5) * w * 0.7, 2.5 + Math.random() * 2, (Math.random() - 0.5) * d * 0.7);
      portrait.rotation.y = Math.random() * Math.PI;
      mctx.scene.add(portrait);
    }

    // ── Candle clusters (8+) ──
    for (let i = 0; i < 10; i++) {
      const cluster = new THREE.Group();
      const count = 3 + Math.floor(Math.random() * 4);
      for (let c = 0; c < count; c++) {
        const h = 0.2 + Math.random() * 0.4;
        const candle = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.03, h, 10), candleMat);
        candle.position.set((Math.random() - 0.5) * 0.3, h / 2, (Math.random() - 0.5) * 0.3);
        cluster.add(candle);
      }
      const clLight = new THREE.PointLight(0xff6622, 0.5, 5);
      clLight.position.y = 0.5;
      cluster.add(clLight);
      mctx.torchLights.push(clLight);
      const clX = (Math.random() - 0.5) * w * 0.7;
      const clZ = (Math.random() - 0.5) * d * 0.7;
      cluster.position.set(clX, getTerrainHeight(clX, clZ, 0.6), clZ);
      mctx.scene.add(cluster);
    }

    // ── Drawbridge/portcullis (4+) ──
    for (let i = 0; i < 5; i++) {
      const gate = new THREE.Group();
      const post1 = new THREE.Mesh(new THREE.BoxGeometry(0.8, 5, 0.8), darkStoneMat);
      post1.position.set(-2, 2.5, 0);
      gate.add(post1);
      const post2 = new THREE.Mesh(new THREE.BoxGeometry(0.8, 5, 0.8), darkStoneMat);
      post2.position.set(2, 2.5, 0);
      gate.add(post2);
      const lintel = new THREE.Mesh(new THREE.BoxGeometry(4.8, 0.8, 0.8), darkStoneMat);
      lintel.position.set(0, 5, 0);
      gate.add(lintel);
      // Portcullis bars
      for (let b = 0; b < 6; b++) {
        const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 4.5, 17), ironMat);
        bar.position.set(-1.5 + b * 0.6, 2.5, 0);
        gate.add(bar);
      }
      for (let b = 0; b < 3; b++) {
        const hbar = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 3.5, 17), ironMat);
        hbar.rotation.z = Math.PI / 2;
        hbar.position.set(0, 1 + b * 1.5, 0);
        gate.add(hbar);
      }
      const gX = (Math.random() - 0.5) * w * 0.5;
      const gZ = (Math.random() - 0.5) * d * 0.5;
      gate.position.set(gX, getTerrainHeight(gX, gZ, 0.6), gZ);
      gate.rotation.y = Math.random() * Math.PI;
      mctx.scene.add(gate);
    }

    // ── Red crystal formations ──
    const redCrystalMat = new THREE.MeshStandardMaterial({ color: 0xcc1133, emissive: 0x880022, emissiveIntensity: 0.5, roughness: 0.2, metalness: 0.3 });
    for (let i = 0; i < 16; i++) {
      const crystal = new THREE.Group();
      const cH = 0.8 + Math.random() * 2;
      const main = new THREE.Mesh(new THREE.ConeGeometry(0.2 + Math.random() * 0.3, cH, 20), redCrystalMat);
      main.position.y = cH / 2; crystal.add(main);
      for (let s = 0; s < 2; s++) {
        const subH = cH * (0.3 + Math.random() * 0.3);
        const sub = new THREE.Mesh(new THREE.ConeGeometry(0.1 + Math.random() * 0.1, subH, 17), redCrystalMat);
        sub.position.set((Math.random() - 0.5) * 0.5, subH / 2, (Math.random() - 0.5) * 0.5);
        sub.rotation.x = (Math.random() - 0.5) * 0.3; sub.rotation.z = (Math.random() - 0.5) * 0.3;
        crystal.add(sub);
      }
      const crLight = new THREE.PointLight(0xcc0033, 0.4, 5);
      crLight.position.y = cH * 0.7; crystal.add(crLight); mctx.torchLights.push(crLight);
      const crx = (Math.random() - 0.5) * w * 0.75; const crz = (Math.random() - 0.5) * d * 0.75;
      crystal.position.set(crx, getTerrainHeight(crx, crz, 0.6), crz); mctx.scene.add(crystal);
    }

    // ── Banner poles with tattered flags ──
    const bannerFabricMat = new THREE.MeshStandardMaterial({ color: 0xaa1122, roughness: 0.7, side: THREE.DoubleSide });
    for (let i = 0; i < 12; i++) {
      const bp = new THREE.Group();
      const poleH = 4 + Math.random() * 4;
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.06, poleH, 10), ironMat);
      pole.position.y = poleH / 2; bp.add(pole);
      // Tattered flag (multiple segments for torn look)
      for (let f = 0; f < 3; f++) {
        const fH = 0.4 + Math.random() * 0.8;
        const fW = 0.8 + Math.random() * 0.5;
        const flag = new THREE.Mesh(new THREE.PlaneGeometry(fW, fH), bannerFabricMat);
        flag.position.set(fW / 2 + 0.05, poleH - 0.5 - f * 0.5, 0);
        flag.rotation.y = (Math.random() - 0.5) * 0.2; bp.add(flag);
      }
      // Finial
      const finial = new THREE.Mesh(new THREE.SphereGeometry(0.08, 23, 23), ironMat);
      finial.position.y = poleH + 0.08; bp.add(finial);
      const bpx = (Math.random() - 0.5) * w * 0.7; const bpz = (Math.random() - 0.5) * d * 0.7;
      bp.position.set(bpx, getTerrainHeight(bpx, bpz, 0.6), bpz); mctx.scene.add(bp);
    }

    // ── Blood pools ──
    const bloodPoolMat = new THREE.MeshStandardMaterial({ color: 0x660011, emissive: 0x220008, emissiveIntensity: 0.2, roughness: 0.15, transparent: true, opacity: 0.75 });
    for (let i = 0; i < 14; i++) {
      const pool = new THREE.Mesh(new THREE.CircleGeometry(0.5 + Math.random() * 2, 16), bloodPoolMat);
      pool.rotation.x = -Math.PI / 2;
      const bpx2 = (Math.random() - 0.5) * w * 0.8; const bpz2 = (Math.random() - 0.5) * d * 0.8;
      pool.position.set(bpx2, getTerrainHeight(bpx2, bpz2, 0.6) + 0.02, bpz2); mctx.scene.add(pool);
    }

    // ── Gargoyle perches (detailed) ──
    for (let i = 0; i < 8; i++) {
      const perch = new THREE.Group();
      // Stone bracket
      const bracket = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.3, 0.8), darkStoneMat);
      perch.add(bracket);
      // Gargoyle body
      const gBody = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.6, 0.4), darkStoneMat);
      gBody.position.set(0, 0.4, 0.15); perch.add(gBody);
      const gHead = new THREE.Mesh(new THREE.SphereGeometry(0.2, 23, 20), darkStoneMat);
      gHead.position.set(0, 0.75, 0.35); perch.add(gHead);
      // Horns
      for (const hx of [-0.1, 0.1]) {
        const horn = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.15, 17), darkStoneMat);
        horn.position.set(hx, 0.9, 0.3); horn.rotation.x = -0.3; perch.add(horn);
      }
      // Wings
      for (const wx of [-0.4, 0.4]) {
        const wing = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.4), new THREE.MeshStandardMaterial({ color: 0x4a2233, roughness: 0.85, side: THREE.DoubleSide }));
        wing.position.set(wx, 0.5, 0); wing.rotation.y = wx > 0 ? 0.5 : -0.5; perch.add(wing);
      }
      // Glowing eyes
      for (const ex of [-0.06, 0.06]) {
        const eye = new THREE.Mesh(new THREE.SphereGeometry(0.02, 17, 17), new THREE.MeshStandardMaterial({ color: 0xff2200, emissive: 0xff0000, emissiveIntensity: 1.5 }));
        eye.position.set(ex, 0.78, 0.5); perch.add(eye);
      }
      perch.position.set((Math.random() - 0.5) * w * 0.7, 5 + Math.random() * 5, (Math.random() - 0.5) * d * 0.7);
      mctx.scene.add(perch);
    }

    // ── Arrow slits in walls ──
    const arrowSlitMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 1.0 });
    for (let i = 0; i < 20; i++) {
      const slit = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.6, 0.05), arrowSlitMat);
      slit.position.set(
        (Math.random() - 0.5) * w * 0.75,
        2 + Math.random() * 5,
        (Math.random() - 0.5) * d * 0.75
      );
      slit.rotation.y = Math.random() * Math.PI; mctx.scene.add(slit);
    }

    // ── Iron gates (portcullis-style) ──
    for (let i = 0; i < 6; i++) {
      const gate = new THREE.Group();
      const gW = 2.5 + Math.random() * 1.5; const gH = 3 + Math.random() * 2;
      const frame = new THREE.Mesh(new THREE.BoxGeometry(gW + 0.4, gH + 0.4, 0.15), ironMat);
      gate.add(frame);
      // Vertical bars
      const barCount = Math.floor(gW / 0.3);
      for (let b = 0; b < barCount; b++) {
        const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, gH, 17), ironMat);
        bar.position.set(-gW / 2 + b * (gW / barCount) + 0.15, 0, 0.08); gate.add(bar);
      }
      // Horizontal bars
      for (let h = 0; h < 3; h++) {
        const hBar = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, gW, 17), ironMat);
        hBar.rotation.z = Math.PI / 2;
        hBar.position.set(0, -gH / 2 + h * gH / 2 + 0.3, 0.08); gate.add(hBar);
      }
      // Spikes on top
      for (let s = 0; s < barCount; s++) {
        const spike = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.15, 17), ironMat);
        spike.position.set(-gW / 2 + s * (gW / barCount) + 0.15, gH / 2 + 0.28, 0.08); gate.add(spike);
      }
      const gx = (Math.random() - 0.5) * w * 0.6; const gz = (Math.random() - 0.5) * d * 0.6;
      gate.position.set(gx, gH / 2, gz); gate.rotation.y = Math.random() * Math.PI; mctx.scene.add(gate);
    }

    // ── Weapon racks (more detail) ──
    for (let i = 0; i < 8; i++) {
      const wr = new THREE.Group();
      const rackW = 1.5; const rackH = 2;
      const board = new THREE.Mesh(new THREE.BoxGeometry(rackW, rackH, 0.08), woodMat); board.position.y = rackH / 2; wr.add(board);
      // Weapons: swords, axes, maces
      for (let w2 = 0; w2 < 4; w2++) {
        const wx = -0.5 + w2 * 0.35;
        if (w2 % 3 === 0) { // Sword
          const blade = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.9, 0.015), ironMat);
          blade.position.set(wx, rackH * 0.6, 0.05); wr.add(blade);
          const guard = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.03, 0.03), ironMat);
          guard.position.set(wx, rackH * 0.3, 0.05); wr.add(guard);
          const hilt = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.2, 17), woodMat);
          hilt.position.set(wx, rackH * 0.2, 0.05); wr.add(hilt);
        } else if (w2 % 3 === 1) { // Axe
          const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.8, 17), woodMat);
          handle.position.set(wx, rackH * 0.5, 0.05); wr.add(handle);
          const head = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.15, 0.03), ironMat);
          head.position.set(wx + 0.08, rackH * 0.8, 0.05); wr.add(head);
        } else { // Mace
          const mHandle = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.6, 17), woodMat);
          mHandle.position.set(wx, rackH * 0.4, 0.05); wr.add(mHandle);
          const mHead = new THREE.Mesh(new THREE.SphereGeometry(0.08, 23, 23), ironMat);
          mHead.position.set(wx, rackH * 0.75, 0.05); wr.add(mHead);
        }
      }
      const wrx = (Math.random() - 0.5) * w * 0.65; const wrz = (Math.random() - 0.5) * d * 0.65;
      wr.position.set(wrx, getTerrainHeight(wrx, wrz, 0.6), wrz);
      wr.rotation.y = Math.random() * Math.PI; mctx.scene.add(wr);
    }

    // ── Torture devices: iron maiden, stocks ──
    for (let i = 0; i < 4; i++) {
      const td = new THREE.Group();
      if (i % 2 === 0) { // Iron maiden
        const outer = new THREE.Mesh(new THREE.BoxGeometry(0.8, 2, 0.8), ironMat);
        outer.position.y = 1; td.add(outer);
        // Door (slightly open)
        const door = new THREE.Mesh(new THREE.BoxGeometry(0.75, 1.9, 0.08), ironMat);
        door.position.set(0, 1, 0.42); door.rotation.y = 0.3; td.add(door);
        // Spikes inside
        for (let s = 0; s < 6; s++) {
          const spike = new THREE.Mesh(new THREE.ConeGeometry(0.015, 0.12, 16), ironMat);
          spike.position.set((Math.random() - 0.5) * 0.3, 0.5 + s * 0.25, 0.35);
          spike.rotation.x = Math.PI / 2; td.add(spike);
        }
      } else { // Stocks
        const frame = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.15, 0.4), woodMat);
        frame.position.y = 1.2; td.add(frame);
        // Holes
        for (let h = 0; h < 3; h++) {
          const hole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.16, 12), new THREE.MeshStandardMaterial({ color: 0x111111 }));
          hole.position.set(-0.4 + h * 0.4, 1.2, 0); hole.rotation.x = Math.PI / 2; td.add(hole);
        }
        // Support posts
        for (const px of [-0.6, 0.6]) {
          const post = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 1.3, 10), woodMat);
          post.position.set(px, 0.65, 0); td.add(post);
        }
      }
      const tdx = (Math.random() - 0.5) * w * 0.55; const tdz = (Math.random() - 0.5) * d * 0.55;
      td.position.set(tdx, getTerrainHeight(tdx, tdz, 0.6), tdz);
      td.rotation.y = Math.random() * Math.PI; mctx.scene.add(td);
    }

    // ── Blood-red banner details hanging from walls ──
    const bannerRedMat = new THREE.MeshStandardMaterial({ color: 0xaa1122, roughness: 0.7, side: THREE.DoubleSide });
    for (let i = 0; i < 14; i++) {
      const banner = new THREE.Group();
      const bPoleW = 1.5 + Math.random() * 1.5;
      const bPole = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, bPoleW, 12), ironMat);
      bPole.rotation.z = Math.PI / 2; banner.add(bPole);
      // Hanging fabric (multiple strips for tattered look)
      const strips = 2 + Math.floor(Math.random() * 3);
      for (let s = 0; s < strips; s++) {
        const sH = 1.5 + Math.random() * 2; const sW = bPoleW / strips * 0.8;
        const strip = new THREE.Mesh(new THREE.PlaneGeometry(sW, sH), bannerRedMat);
        strip.position.set(-bPoleW / 2 + (s + 0.5) * (bPoleW / strips), -sH / 2, 0);
        strip.rotation.z = (Math.random() - 0.5) * 0.1;
        banner.add(strip);
      }
      // Decorative end caps
      for (const ex of [-bPoleW / 2, bPoleW / 2]) {
        const cap = new THREE.Mesh(new THREE.SphereGeometry(0.05, 12, 10), ironMat);
        cap.position.set(ex, 0, 0); banner.add(cap);
      }
      banner.position.set((Math.random() - 0.5) * w * 0.7, 3 + Math.random() * 5, (Math.random() - 0.5) * d * 0.7);
      mctx.scene.add(banner);
    }

    // ── Iron spike fencing ──
    for (let i = 0; i < 8; i++) {
      const fence = new THREE.Group();
      const fLen = 3 + Math.random() * 4; const fH = 1.5 + Math.random() * 1;
      const spikeCount = Math.floor(fLen / 0.3);
      // Horizontal bars
      for (let h = 0; h < 2; h++) {
        const hBar = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, fLen, 10), ironMat);
        hBar.rotation.z = Math.PI / 2; hBar.position.y = fH * (0.3 + h * 0.4);
        fence.add(hBar);
      }
      // Vertical spikes with cone tips
      for (let s = 0; s < spikeCount; s++) {
        const spike = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.015, fH, 8), ironMat);
        spike.position.set(-fLen / 2 + s * 0.3 + 0.15, fH / 2, 0);
        fence.add(spike);
        const tip = new THREE.Mesh(new THREE.ConeGeometry(0.02, 0.1, 8), ironMat);
        tip.position.set(-fLen / 2 + s * 0.3 + 0.15, fH + 0.05, 0);
        fence.add(tip);
      }
      const fex = (Math.random() - 0.5) * w * 0.7; const fez = (Math.random() - 0.5) * d * 0.7;
      fence.position.set(fex, getTerrainHeight(fex, fez, 0.6), fez);
      fence.rotation.y = Math.random() * Math.PI; mctx.scene.add(fence);
    }

    // ── Throne room carpet detail ──
    const carpetMat = new THREE.MeshStandardMaterial({ color: 0x881122, roughness: 0.8, side: THREE.DoubleSide });
    const carpetTrimMat = new THREE.MeshStandardMaterial({ color: 0xccaa44, roughness: 0.5, metalness: 0.3 });
    for (let i = 0; i < 5; i++) {
      const carpet = new THREE.Group();
      const cLen = 4 + Math.random() * 6; const cW = 1.5 + Math.random() * 1;
      const body = new THREE.Mesh(new THREE.BoxGeometry(cW, 0.02, cLen), carpetMat);
      carpet.add(body);
      // Gold trim edges
      for (const ex of [-cW / 2, cW / 2]) {
        const trim = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.025, cLen), carpetTrimMat);
        trim.position.set(ex, 0.005, 0); carpet.add(trim);
      }
      // End tassels
      for (const ez of [-cLen / 2, cLen / 2]) {
        for (let t = 0; t < 5; t++) {
          const tassel = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.005, 0.1, 6), carpetTrimMat);
          tassel.position.set(-cW / 2 + 0.15 + t * (cW / 5), -0.05, ez);
          carpet.add(tassel);
        }
      }
      const cpx = (Math.random() - 0.5) * w * 0.5; const cpz = (Math.random() - 0.5) * d * 0.5;
      carpet.position.set(cpx, getTerrainHeight(cpx, cpz, 0.6) + 0.02, cpz);
      carpet.rotation.y = Math.random() * Math.PI; mctx.scene.add(carpet);
    }

    // ── Weapon display racks on walls ──
    for (let i = 0; i < 10; i++) {
      const display = new THREE.Group();
      const dW = 1.2 + Math.random() * 0.8;
      const dBoard = new THREE.Mesh(new THREE.BoxGeometry(dW, 1.5, 0.06), woodMat);
      display.add(dBoard);
      // Shield (circle)
      const shield = new THREE.Mesh(new THREE.CircleGeometry(0.25, 20), new THREE.MeshStandardMaterial({ color: 0x882222, roughness: 0.6, metalness: 0.3 }));
      shield.position.set(0, 0.2, 0.04); display.add(shield);
      const shieldRim = new THREE.Mesh(new THREE.TorusGeometry(0.25, 0.02, 8, 20), ironMat);
      shieldRim.position.set(0, 0.2, 0.04); display.add(shieldRim);
      // Crossed swords behind shield
      for (const sx of [-0.15, 0.15]) {
        const sword = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.8, 0.01), ironMat);
        sword.position.set(sx, 0.2, 0.02); sword.rotation.z = sx > 0 ? 0.3 : -0.3;
        display.add(sword);
      }
      display.position.set((Math.random() - 0.5) * w * 0.65, 2.5 + Math.random() * 3, (Math.random() - 0.5) * d * 0.65);
      display.rotation.y = Math.random() * Math.PI; mctx.scene.add(display);
    }

    // ── Prison cell bars ──
    for (let i = 0; i < 6; i++) {
      const cell = new THREE.Group();
      const cellW = 2 + Math.random() * 1.5; const cellH = 3 + Math.random() * 1;
      // Vertical bars
      const barCount = Math.floor(cellW / 0.2);
      for (let b = 0; b < barCount; b++) {
        const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, cellH, 8), ironMat);
        bar.position.set(-cellW / 2 + b * (cellW / barCount) + 0.1, cellH / 2, 0);
        cell.add(bar);
      }
      // Horizontal crossbars
      for (let h = 0; h < 3; h++) {
        const hBar = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, cellW, 8), ironMat);
        hBar.rotation.z = Math.PI / 2;
        hBar.position.set(0, 0.5 + h * (cellH / 3), 0);
        cell.add(hBar);
      }
      // Lock mechanism
      const lock = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.12, 0.06), ironMat);
      lock.position.set(-cellW / 2 + 0.05, cellH * 0.45, 0.03); cell.add(lock);
      const clx = (Math.random() - 0.5) * w * 0.6; const clz = (Math.random() - 0.5) * d * 0.6;
      cell.position.set(clx, getTerrainHeight(clx, clz, 0.6), clz);
      cell.rotation.y = Math.random() * Math.PI; mctx.scene.add(cell);
    }

    // ── Gargoyle waterspout detail on building corners ──
    for (let i = 0; i < 8; i++) {
      const spout = new THREE.Group();
      // Stone bracket
      const bracket = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.25, 0.8), darkStoneMat);
      spout.add(bracket);
      // Gargoyle body (simplified beast)
      const gBody = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.4, 0.6), darkStoneMat);
      gBody.position.set(0, 0.25, 0.3); spout.add(gBody);
      // Head with open mouth
      const gHead = new THREE.Mesh(new THREE.SphereGeometry(0.15, 16, 12), darkStoneMat);
      gHead.position.set(0, 0.45, 0.6); spout.add(gHead);
      const jaw = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.04, 0.1), darkStoneMat);
      jaw.position.set(0, 0.35, 0.7); jaw.rotation.x = 0.3; spout.add(jaw);
      // Water channel (thin cylinder extending forward)
      const channel = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.04, 0.4, 8), darkStoneMat);
      channel.rotation.x = Math.PI / 2; channel.position.set(0, 0.38, 0.85); spout.add(channel);
      // Horns
      for (const hx of [-0.08, 0.08]) {
        const horn = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.12, 8), darkStoneMat);
        horn.position.set(hx, 0.58, 0.55); horn.rotation.x = -0.3;
        horn.rotation.z = hx > 0 ? -0.2 : 0.2; spout.add(horn);
      }
      spout.position.set((Math.random() - 0.5) * w * 0.7, 5 + Math.random() * 4, (Math.random() - 0.5) * d * 0.7);
      mctx.scene.add(spout);
    }

    // ── Murder holes (dark boxes inset in ceiling/overhang areas) (10) ──
    const murderHoleMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 1.0 });
    for (let i = 0; i < 10; i++) {
      const mh = new THREE.Group();
      const mhOverhang = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.3, 1.5), darkStoneMat);
      mh.add(mhOverhang);
      for (let h = 0; h < 3; h++) {
        const mhHole = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.32, 0.3), murderHoleMat);
        mhHole.position.set(-0.4 + h * 0.4, -0.02, 0);
        mh.add(mhHole);
      }
      const mhx = (Math.random() - 0.5) * w * 0.6;
      const mhz = (Math.random() - 0.5) * d * 0.6;
      mh.position.set(mhx, 5 + Math.random() * 3, mhz);
      mh.rotation.y = Math.random() * Math.PI;
      mctx.scene.add(mh);
    }

    // ── Portcullis gates (grid of vertical and horizontal thin cylinders) (4) ──
    for (let i = 0; i < 4; i++) {
      const portcullis = new THREE.Group();
      const pcW = 3 + Math.random() * 1.5;
      const pcH = 4 + Math.random() * 1.5;
      const pcFrameL = new THREE.Mesh(new THREE.BoxGeometry(0.4, pcH + 0.4, 0.4), darkStoneMat);
      pcFrameL.position.set(-pcW / 2 - 0.2, pcH / 2, 0);
      portcullis.add(pcFrameL);
      const pcFrameR = new THREE.Mesh(new THREE.BoxGeometry(0.4, pcH + 0.4, 0.4), darkStoneMat);
      pcFrameR.position.set(pcW / 2 + 0.2, pcH / 2, 0);
      portcullis.add(pcFrameR);
      const pcFrameTop = new THREE.Mesh(new THREE.BoxGeometry(pcW + 0.8, 0.4, 0.4), darkStoneMat);
      pcFrameTop.position.set(0, pcH + 0.2, 0);
      portcullis.add(pcFrameTop);
      const pcVBars = Math.floor(pcW / 0.25);
      for (let v = 0; v < pcVBars; v++) {
        const pcVBar = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, pcH, 12), ironMat);
        pcVBar.position.set(-pcW / 2 + v * (pcW / pcVBars) + 0.12, pcH / 2, 0);
        portcullis.add(pcVBar);
      }
      const pcHBars = Math.floor(pcH / 0.4);
      for (let h = 0; h < pcHBars; h++) {
        const pcHBar = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, pcW, 12), ironMat);
        pcHBar.rotation.z = Math.PI / 2;
        pcHBar.position.set(0, h * 0.4 + 0.2, 0);
        portcullis.add(pcHBar);
      }
      const pcx = (Math.random() - 0.5) * w * 0.5;
      const pcz = (Math.random() - 0.5) * d * 0.5;
      portcullis.position.set(pcx, getTerrainHeight(pcx, pcz, 0.6), pcz);
      portcullis.rotation.y = Math.random() * Math.PI;
      mctx.scene.add(portcullis);
    }

    // ── Arrow loops in towers (thin vertical dark box openings) (24) ──
    const arrowLoopMat2 = new THREE.MeshStandardMaterial({ color: 0x0a0a0a, roughness: 1.0 });
    for (let i = 0; i < 24; i++) {
      const arrowLoop = new THREE.Group();
      const loopSurround = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.8, 0.15), darkStoneMat);
      arrowLoop.add(loopSurround);
      const loopSlit = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.65, 0.16), arrowLoopMat2);
      arrowLoop.add(loopSlit);
      const alx = (Math.random() - 0.5) * w * 0.75;
      const alz = (Math.random() - 0.5) * d * 0.75;
      arrowLoop.position.set(alx, 2 + Math.random() * 6, alz);
      arrowLoop.rotation.y = Math.random() * Math.PI;
      mctx.scene.add(arrowLoop);
    }

    // ── Machicolations (protruding box brackets along wall tops) (8 sections) ──
    for (let i = 0; i < 8; i++) {
      const machSection = new THREE.Group();
      const machLen = 4 + Math.random() * 4;
      const machBracketCount = Math.floor(machLen / 0.8);
      const machWall = new THREE.Mesh(new THREE.BoxGeometry(machLen, 0.4, 1.0), darkStoneMat);
      machWall.position.y = 0.2;
      machSection.add(machWall);
      for (let b = 0; b < machBracketCount; b++) {
        const machBracket = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.5, 0.6), darkStoneMat);
        machBracket.position.set(-machLen / 2 + b * 0.8 + 0.4, -0.05, 0.8);
        machSection.add(machBracket);
      }
      const macx = (Math.random() - 0.5) * w * 0.7;
      const macz = (Math.random() - 0.5) * d * 0.7;
      machSection.position.set(macx, 6 + Math.random() * 3, macz);
      machSection.rotation.y = Math.random() * Math.PI;
      mctx.scene.add(machSection);
    }

    // ── Inner keep with throne (stepped platform, chair, red carpet) (3) ──
    for (let i = 0; i < 3; i++) {
      const keep = new THREE.Group();
      const keepStep1 = new THREE.Mesh(new THREE.BoxGeometry(6, 0.3, 6), redStoneMat);
      keepStep1.position.y = 0.15;
      keep.add(keepStep1);
      const keepStep2 = new THREE.Mesh(new THREE.BoxGeometry(4.5, 0.3, 4.5), redStoneMat);
      keepStep2.position.y = 0.45;
      keep.add(keepStep2);
      const keepStep3 = new THREE.Mesh(new THREE.BoxGeometry(3, 0.3, 3), redStoneMat);
      keepStep3.position.y = 0.75;
      keep.add(keepStep3);
      const keepSeat = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.25, 1.2), redStoneMat);
      keepSeat.position.set(0, 1.05, 0);
      keep.add(keepSeat);
      const keepBack = new THREE.Mesh(new THREE.BoxGeometry(1.4, 2.8, 0.25), redStoneMat);
      keepBack.position.set(0, 2.3, -0.5);
      keep.add(keepBack);
      const keepArmL = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.9, 1.0), redStoneMat);
      keepArmL.position.set(-0.65, 1.35, -0.1);
      keep.add(keepArmL);
      const keepArmR = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.9, 1.0), redStoneMat);
      keepArmR.position.set(0.65, 1.35, -0.1);
      keep.add(keepArmR);
      const keepCarpetMat = new THREE.MeshStandardMaterial({ color: 0xaa1122, roughness: 0.7 });
      const keepCarpet = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.03, 8), keepCarpetMat);
      keepCarpet.position.set(0, 0.02, 4.5);
      keep.add(keepCarpet);
      const kpx = (Math.random() - 0.5) * w * 0.4;
      const kpz = (Math.random() - 0.5) * d * 0.4;
      keep.position.set(kpx, getTerrainHeight(kpx, kpz, 0.6), kpz);
      keep.rotation.y = Math.random() * Math.PI;
      mctx.scene.add(keep);
    }

    // ── Dungeon grate in floor (flat grid of thin dark cylinders) (6) ──
    const dungeonGrateMat = new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.7, metalness: 0.5 });
    for (let i = 0; i < 6; i++) {
      const dgrate = new THREE.Group();
      const dgrateSize = 1.5 + Math.random() * 1;
      const dgrateFrame = new THREE.Mesh(new THREE.BoxGeometry(dgrateSize + 0.3, 0.1, dgrateSize + 0.3), darkStoneMat);
      dgrate.add(dgrateFrame);
      const dgrateBarCount = Math.floor(dgrateSize / 0.2);
      for (let gb = 0; gb < dgrateBarCount; gb++) {
        const dgrateBarX = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, dgrateSize, 8), dungeonGrateMat);
        dgrateBarX.rotation.z = Math.PI / 2;
        dgrateBarX.position.set(0, 0.03, -dgrateSize / 2 + gb * 0.2 + 0.1);
        dgrate.add(dgrateBarX);
      }
      for (let gb = 0; gb < dgrateBarCount; gb++) {
        const dgrateBarZ = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, dgrateSize, 8), dungeonGrateMat);
        dgrateBarZ.rotation.x = Math.PI / 2;
        dgrateBarZ.position.set(-dgrateSize / 2 + gb * 0.2 + 0.1, 0.03, 0);
        dgrate.add(dgrateBarZ);
      }
      const dgrateVoid = new THREE.Mesh(new THREE.BoxGeometry(dgrateSize - 0.1, 0.05, dgrateSize - 0.1), murderHoleMat);
      dgrateVoid.position.y = -0.03;
      dgrate.add(dgrateVoid);
      const dgrx = (Math.random() - 0.5) * w * 0.6;
      const dgrz = (Math.random() - 0.5) * d * 0.6;
      dgrate.position.set(dgrx, getTerrainHeight(dgrx, dgrz, 0.6) + 0.05, dgrz);
      mctx.scene.add(dgrate);
    }

    // ── War room table with map markers and stools (3) ──
    for (let i = 0; i < 3; i++) {
      const warRoom = new THREE.Group();
      const warTable = new THREE.Mesh(new THREE.BoxGeometry(3, 0.15, 2), woodMat);
      warTable.position.y = 1.0;
      warRoom.add(warTable);
      for (const wtlx of [-1.3, 1.3]) {
        for (const wtlz of [-0.8, 0.8]) {
          const wtLeg = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.0, 0.12), woodMat);
          wtLeg.position.set(wtlx, 0.5, wtlz);
          warRoom.add(wtLeg);
        }
      }
      for (let m = 0; m < 8; m++) {
        if (m % 2 === 0) {
          const mapMarker = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.06, 0.08), new THREE.MeshStandardMaterial({ color: m < 4 ? 0xcc2222 : 0x2222cc, roughness: 0.4 }));
          mapMarker.position.set((Math.random() - 0.5) * 2.4, 1.11, (Math.random() - 0.5) * 1.4);
          warRoom.add(mapMarker);
        } else {
          const mapMarkerS = new THREE.Mesh(new THREE.SphereGeometry(0.04, 10, 10), new THREE.MeshStandardMaterial({ color: m < 4 ? 0xcc2222 : 0x2222cc, roughness: 0.4 }));
          mapMarkerS.position.set((Math.random() - 0.5) * 2.4, 1.11, (Math.random() - 0.5) * 1.4);
          warRoom.add(mapMarkerS);
        }
      }
      const mapScroll = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.01, 1.4), new THREE.MeshStandardMaterial({ color: 0xddcc99, roughness: 0.7 }));
      mapScroll.position.y = 1.08;
      warRoom.add(mapScroll);
      for (let st = 0; st < 4; st++) {
        const wrStool = new THREE.Group();
        const wrStoolSeat = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.08, 0.4), woodMat);
        wrStoolSeat.position.y = 0.7;
        wrStool.add(wrStoolSeat);
        for (const slx of [-0.15, 0.15]) {
          for (const slz of [-0.15, 0.15]) {
            const wrStoolLeg = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.7, 0.06), woodMat);
            wrStoolLeg.position.set(slx, 0.35, slz);
            wrStool.add(wrStoolLeg);
          }
        }
        const stAngle = (st / 4) * Math.PI * 2;
        wrStool.position.set(Math.cos(stAngle) * 2, 0, Math.sin(stAngle) * 1.3);
        warRoom.add(wrStool);
      }
      const wrx2 = (Math.random() - 0.5) * w * 0.45;
      const wrz2 = (Math.random() - 0.5) * d * 0.45;
      warRoom.position.set(wrx2, getTerrainHeight(wrx2, wrz2, 0.6), wrz2);
      warRoom.rotation.y = Math.random() * Math.PI;
      mctx.scene.add(warRoom);
    }

    // ── Torch bracket detail on walls (iron bracket + flaming sphere + light) (14) ──
    const torchFlameMat = new THREE.MeshStandardMaterial({ color: 0xff6622, emissive: 0xff4400, emissiveIntensity: 1.5, roughness: 0.3 });
    for (let i = 0; i < 14; i++) {
      const torchBracket = new THREE.Group();
      const tbBase = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 0.4), ironMat);
      tbBase.position.set(0, 0, 0.2);
      torchBracket.add(tbBase);
      const tbArm = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.3, 0.06), ironMat);
      tbArm.position.set(0, 0.15, 0.38);
      torchBracket.add(tbArm);
      const tbCup = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.06, 0.15), ironMat);
      tbCup.position.set(0, 0.3, 0.38);
      torchBracket.add(tbCup);
      const tbHandle = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.03, 0.5, 12), woodMat);
      tbHandle.position.set(0, 0.55, 0.38);
      torchBracket.add(tbHandle);
      const tbFlame = new THREE.Mesh(new THREE.SphereGeometry(0.12, 12, 10), torchFlameMat);
      tbFlame.position.set(0, 0.85, 0.38);
      torchBracket.add(tbFlame);
      const tbLight = new THREE.PointLight(0xff5522, 1.2, 10);
      tbLight.position.set(0, 0.9, 0.38);
      torchBracket.add(tbLight);
      mctx.torchLights.push(tbLight);
      const tbx = (Math.random() - 0.5) * w * 0.7;
      const tbz = (Math.random() - 0.5) * d * 0.7;
      torchBracket.position.set(tbx, 2 + Math.random() * 4, tbz);
      torchBracket.rotation.y = Math.random() * Math.PI;
      mctx.scene.add(torchBracket);
    }
}

export function buildStormspirePeak(mctx: MapBuildContext, w: number, d: number): void {
    mctx.scene.fog = new THREE.FogExp2(0x667788, 0.012);
    mctx.applyTerrainColors(0x556677, 0x778899, 2.0);
    mctx.dirLight.color.setHex(0xaabbdd);
    mctx.dirLight.intensity = 1.2;
    mctx.ambientLight.color.setHex(0x445566);
    mctx.ambientLight.intensity = 0.5;
    mctx.hemiLight.color.setHex(0x8899bb);
    mctx.hemiLight.groundColor.setHex(0x445566);

    const greyRockMat = new THREE.MeshStandardMaterial({ color: 0x667788, roughness: 0.85 });
    const darkRockMat = new THREE.MeshStandardMaterial({ color: 0x556677, roughness: 0.9 });
    const metalMat = new THREE.MeshStandardMaterial({ color: 0x888899, roughness: 0.3, metalness: 0.8 });
    const snowMat = new THREE.MeshStandardMaterial({ color: 0xeeeeff, roughness: 0.6 });
    const woodMat = new THREE.MeshStandardMaterial({ color: 0x665533, roughness: 0.8 });
    const chainMat = new THREE.MeshStandardMaterial({ color: 0x777777, roughness: 0.5, metalness: 0.6 });
    const windMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3, transparent: true, opacity: 0.15, side: THREE.DoubleSide });
    const cloudMat = new THREE.MeshStandardMaterial({ color: 0x556666, roughness: 0.4, transparent: true, opacity: 0.3 });
    const runeMat = new THREE.MeshStandardMaterial({ color: 0x4488ff, roughness: 0.3, emissive: 0x2244aa, emissiveIntensity: 0.6 });
    const nestMat = new THREE.MeshStandardMaterial({ color: 0x887744, roughness: 0.9 });

    // ── Jagged rock spires (25+) ──
    for (let i = 0; i < 28; i++) {
      const spire = new THREE.Group();
      const spireH = 3 + Math.random() * 8;
      const spireR = 0.5 + Math.random() * 1.5;
      if (i % 2 === 0) {
        const cone = new THREE.Mesh(new THREE.ConeGeometry(spireR, spireH, 10 + Math.floor(Math.random() * 3)), greyRockMat);
        cone.position.y = spireH / 2;
        spire.add(cone);
      } else {
        const box = new THREE.Mesh(new THREE.BoxGeometry(spireR, spireH, spireR * 0.7), darkRockMat);
        box.position.y = spireH / 2;
        box.rotation.y = Math.random() * Math.PI;
        spire.add(box);
      }
      const sX = (Math.random() - 0.5) * w * 0.9;
      const sZ = (Math.random() - 0.5) * d * 0.9;
      spire.position.set(sX, getTerrainHeight(sX, sZ, 2.0), sZ);
      mctx.scene.add(spire);
    }

    // ── Wind-swept platforms (15+) ──
    for (let i = 0; i < 18; i++) {
      const platW = 3 + Math.random() * 5;
      const platD = 3 + Math.random() * 5;
      const plat = new THREE.Mesh(new THREE.BoxGeometry(platW, 0.4, platD), greyRockMat);
      const pX = (Math.random() - 0.5) * w * 0.8;
      const pZ = (Math.random() - 0.5) * d * 0.8;
      plat.position.set(pX, getTerrainHeight(pX, pZ, 2.0) + 1 + Math.random() * 4, pZ);
      mctx.scene.add(plat);
    }

    // ── Lightning rods (10+) ──
    for (let i = 0; i < 12; i++) {
      const rod = new THREE.Group();
      const rodH = 5 + Math.random() * 6;
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.08, rodH, 10), metalMat);
      pole.position.y = rodH / 2;
      rod.add(pole);
      const tip = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.4, 30), metalMat);
      tip.position.y = rodH + 0.2;
      rod.add(tip);
      const rLight = new THREE.PointLight(0x4488ff, 1.5, 12);
      rLight.position.y = rodH + 0.3;
      rod.add(rLight);
      mctx.torchLights.push(rLight);
      const rX = (Math.random() - 0.5) * w * 0.75;
      const rZ = (Math.random() - 0.5) * d * 0.75;
      rod.position.set(rX, getTerrainHeight(rX, rZ, 2.0), rZ);
      mctx.scene.add(rod);
    }

    // ── Loose boulders (20+) ──
    for (let i = 0; i < 24; i++) {
      const boulderR = 0.4 + Math.random() * 1.5;
      const boulder = new THREE.Mesh(new THREE.DodecahedronGeometry(boulderR, 2), greyRockMat);
      boulder.scale.set(0.8 + Math.random() * 0.4, 0.6 + Math.random() * 0.4, 0.8 + Math.random() * 0.4);
      const bX = (Math.random() - 0.5) * w * 0.85;
      const bZ = (Math.random() - 0.5) * d * 0.85;
      boulder.position.set(bX, getTerrainHeight(bX, bZ, 2.0) + boulderR * 0.3, bZ);
      mctx.scene.add(boulder);
    }

    // ── Cliff edges (8+) ──
    for (let i = 0; i < 10; i++) {
      const cliffW = 5 + Math.random() * 8;
      const cliffH = 2 + Math.random() * 4;
      const cliff = new THREE.Mesh(new THREE.BoxGeometry(cliffW, cliffH, 2 + Math.random() * 3), darkRockMat);
      const cX = (Math.random() - 0.5) * w * 0.8;
      const cZ = (Math.random() - 0.5) * d * 0.8;
      cliff.position.set(cX, cliffH / 2, cZ);
      cliff.rotation.y = Math.random() * Math.PI;
      mctx.scene.add(cliff);
    }

    // ── Wind streaks (12+) ──
    for (let i = 0; i < 15; i++) {
      const streak = new THREE.Mesh(new THREE.PlaneGeometry(6 + Math.random() * 8, 0.15), windMat);
      streak.position.set(
        (Math.random() - 0.5) * w * 0.9,
        2 + Math.random() * 8,
        (Math.random() - 0.5) * d * 0.9,
      );
      streak.rotation.set(0, Math.random() * Math.PI, (Math.random() - 0.5) * 0.3);
      mctx.scene.add(streak);
    }

    // ── Eagle nests (6+) ──
    for (let i = 0; i < 7; i++) {
      const nest = new THREE.Group();
      for (let s = 0; s < 8; s++) {
        const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.6 + Math.random() * 0.4, 17), nestMat);
        stick.rotation.set(Math.random() * 0.3, Math.random() * Math.PI, Math.PI / 2);
        stick.position.set((Math.random() - 0.5) * 0.4, 0, (Math.random() - 0.5) * 0.4);
        nest.add(stick);
      }
      for (let e = 0; e < 2 + Math.floor(Math.random() * 2); e++) {
        const egg = new THREE.Mesh(new THREE.SphereGeometry(0.06, 23, 23), snowMat);
        egg.position.set((Math.random() - 0.5) * 0.2, 0.08, (Math.random() - 0.5) * 0.2);
        egg.scale.y = 1.3;
        nest.add(egg);
      }
      const nX = (Math.random() - 0.5) * w * 0.7;
      const nZ = (Math.random() - 0.5) * d * 0.7;
      nest.position.set(nX, getTerrainHeight(nX, nZ, 2.0) + 4 + Math.random() * 4, nZ);
      mctx.scene.add(nest);
    }

    // ── Weathered stone pillars (10+) ──
    for (let i = 0; i < 12; i++) {
      const pillar = new THREE.Group();
      const pillarH = 2 + Math.random() * 4;
      const pillarR = 0.3 + Math.random() * 0.4;
      const col = new THREE.Mesh(new THREE.CylinderGeometry(pillarR * 0.8, pillarR, pillarH, 12), greyRockMat);
      col.position.y = pillarH / 2;
      pillar.add(col);
      // Erosion cutouts
      for (let e = 0; e < 3; e++) {
        const cut = new THREE.Mesh(new THREE.BoxGeometry(pillarR * 0.5, 0.3, pillarR * 1.5), darkRockMat);
        cut.position.set(pillarR * 0.3, Math.random() * pillarH, 0);
        pillar.add(cut);
      }
      const piX = (Math.random() - 0.5) * w * 0.7;
      const piZ = (Math.random() - 0.5) * d * 0.7;
      pillar.position.set(piX, getTerrainHeight(piX, piZ, 2.0), piZ);
      mctx.scene.add(pillar);
    }

    // ── Ruined mountain shrines (4+) ──
    for (let i = 0; i < 5; i++) {
      const shrine = new THREE.Group();
      const altar = new THREE.Mesh(new THREE.BoxGeometry(2, 0.6, 1.5), greyRockMat);
      shrine.add(altar);
      const pillarL = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.25, 2.5, 10), greyRockMat);
      pillarL.position.set(-1.2, 1.25, 0);
      shrine.add(pillarL);
      const pillarR = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.25, 1.8, 10), greyRockMat);
      pillarR.position.set(1.2, 0.9, 0);
      shrine.add(pillarR);
      const brokenLintel = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.3, 0.5), greyRockMat);
      brokenLintel.position.set(-0.3, 2.5, 0);
      brokenLintel.rotation.z = 0.2;
      shrine.add(brokenLintel);
      const shX = (Math.random() - 0.5) * w * 0.6;
      const shZ = (Math.random() - 0.5) * d * 0.6;
      shrine.position.set(shX, getTerrainHeight(shX, shZ, 2.0), shZ);
      shrine.rotation.y = Math.random() * Math.PI;
      mctx.scene.add(shrine);
    }

    // ── Snow patches (15+) ──
    for (let i = 0; i < 18; i++) {
      const snow = new THREE.Mesh(new THREE.CircleGeometry(0.5 + Math.random() * 2, 16), snowMat);
      snow.rotation.x = -Math.PI / 2;
      const snX = (Math.random() - 0.5) * w * 0.85;
      const snZ = (Math.random() - 0.5) * d * 0.85;
      snow.position.set(snX, getTerrainHeight(snX, snZ, 2.0) + 0.03, snZ);
      mctx.scene.add(snow);
    }

    // ── Chain bridges (8+) ──
    for (let i = 0; i < 9; i++) {
      const bridge = new THREE.Group();
      const bridgeLen = 5 + Math.random() * 6;
      const plankCount = Math.floor(bridgeLen / 0.6);
      for (let p = 0; p < plankCount; p++) {
        const plank = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.08, 0.5), woodMat);
        plank.position.set(0, 0, -bridgeLen / 2 + p * 0.6 + 0.3);
        plank.rotation.x = (Math.random() - 0.5) * 0.1;
        bridge.add(plank);
      }
      const chain1 = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, bridgeLen, 17), chainMat);
      chain1.rotation.x = Math.PI / 2;
      chain1.position.set(-0.6, 0.4, 0);
      bridge.add(chain1);
      const chain2 = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, bridgeLen, 17), chainMat);
      chain2.rotation.x = Math.PI / 2;
      chain2.position.set(0.6, 0.4, 0);
      bridge.add(chain2);
      const bX = (Math.random() - 0.5) * w * 0.6;
      const bZ = (Math.random() - 0.5) * d * 0.6;
      bridge.position.set(bX, getTerrainHeight(bX, bZ, 2.0) + 2 + Math.random() * 3, bZ);
      bridge.rotation.y = Math.random() * Math.PI;
      mctx.scene.add(bridge);
    }

    // ── Cavern entrances (6+) ──
    for (let i = 0; i < 7; i++) {
      const cavern = new THREE.Group();
      const archL = new THREE.Mesh(new THREE.BoxGeometry(0.8, 3, 1), darkRockMat);
      archL.position.set(-1.5, 1.5, 0);
      cavern.add(archL);
      const archR = new THREE.Mesh(new THREE.BoxGeometry(0.8, 3, 1), darkRockMat);
      archR.position.set(1.5, 1.5, 0);
      cavern.add(archR);
      const archTop = new THREE.Mesh(new THREE.BoxGeometry(3.8, 0.8, 1), darkRockMat);
      archTop.position.set(0, 3.2, 0);
      cavern.add(archTop);
      const darkness = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 2.8), new THREE.MeshStandardMaterial({ color: 0x111122, roughness: 1 }));
      darkness.position.set(0, 1.4, 0.1);
      cavern.add(darkness);
      const cvX = (Math.random() - 0.5) * w * 0.7;
      const cvZ = (Math.random() - 0.5) * d * 0.7;
      cavern.position.set(cvX, getTerrainHeight(cvX, cvZ, 2.0), cvZ);
      cavern.rotation.y = Math.random() * Math.PI;
      mctx.scene.add(cavern);
    }

    // ── Mountain goat remains (10+) ──
    for (let i = 0; i < 12; i++) {
      const remains = new THREE.Group();
      for (let b = 0; b < 3 + Math.floor(Math.random() * 3); b++) {
        const bone = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.03, 0.2 + Math.random() * 0.2, 17), snowMat);
        bone.position.set((Math.random() - 0.5) * 0.4, 0.03, (Math.random() - 0.5) * 0.4);
        bone.rotation.set(Math.random() * Math.PI, 0, Math.random() * Math.PI);
        remains.add(bone);
      }
      const mX = (Math.random() - 0.5) * w * 0.8;
      const mZ = (Math.random() - 0.5) * d * 0.8;
      remains.position.set(mX, getTerrainHeight(mX, mZ, 2.0), mZ);
      mctx.scene.add(remains);
    }

    // ── Telescope/observation platforms (5+) ──
    for (let i = 0; i < 6; i++) {
      const obs = new THREE.Group();
      const stand = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.12, 1.5, 10), metalMat);
      stand.position.y = 0.75;
      obs.add(stand);
      const scope = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.04, 0.8, 12), metalMat);
      scope.position.set(0, 1.5, 0.2);
      scope.rotation.x = -0.3;
      obs.add(scope);
      const platform = new THREE.Mesh(new THREE.BoxGeometry(2, 0.2, 2), greyRockMat);
      obs.add(platform);
      const oX = (Math.random() - 0.5) * w * 0.6;
      const oZ = (Math.random() - 0.5) * d * 0.6;
      obs.position.set(oX, getTerrainHeight(oX, oZ, 2.0) + 3 + Math.random() * 3, oZ);
      mctx.scene.add(obs);
    }

    // ── Storm cloud wisps (8+) ──
    for (let i = 0; i < 10; i++) {
      const cloud = new THREE.Mesh(
        new THREE.SphereGeometry(2 + Math.random() * 3, 27, 23),
        cloudMat,
      );
      cloud.scale.set(1.5 + Math.random(), 0.4 + Math.random() * 0.3, 1 + Math.random() * 0.5);
      cloud.position.set(
        (Math.random() - 0.5) * w * 0.9,
        10 + Math.random() * 6,
        (Math.random() - 0.5) * d * 0.9,
      );
      mctx.scene.add(cloud);
    }

    // ── Ancient rune stones (4+) ──
    for (let i = 0; i < 5; i++) {
      const rune = new THREE.Group();
      const stone = new THREE.Mesh(new THREE.BoxGeometry(0.8, 1.5, 0.3), darkRockMat);
      stone.position.y = 0.75;
      rune.add(stone);
      const glow = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.8), runeMat);
      glow.position.set(0, 0.8, 0.16);
      rune.add(glow);
      const ruLight = new THREE.PointLight(0x4488ff, 0.6, 6);
      ruLight.position.set(0, 1, 0.3);
      rune.add(ruLight);
      mctx.torchLights.push(ruLight);
      const ruX = (Math.random() - 0.5) * w * 0.6;
      const ruZ = (Math.random() - 0.5) * d * 0.6;
      rune.position.set(ruX, getTerrainHeight(ruX, ruZ, 2.0), ruZ);
      rune.rotation.y = Math.random() * Math.PI;
      mctx.scene.add(rune);
    }

    // ── Mountain peaks with snow caps ──
    for (let i = 0; i < 10; i++) {
      const peak = new THREE.Group();
      const pH = 6 + Math.random() * 10;
      const pR = 2 + Math.random() * 3;
      const rock = new THREE.Mesh(new THREE.ConeGeometry(pR, pH, 10), darkRockMat);
      rock.position.y = pH / 2; peak.add(rock);
      // Snow cap
      const snowH = pH * 0.3;
      const snowCap = new THREE.Mesh(new THREE.ConeGeometry(pR * 0.5, snowH, 10), snowMat);
      snowCap.position.y = pH - snowH / 2; peak.add(snowCap);
      // Ridges
      for (let r = 0; r < 3; r++) {
        const ridge = new THREE.Mesh(new THREE.BoxGeometry(0.3, pH * 0.6, pR * 0.3), greyRockMat);
        ridge.rotation.y = (r / 3) * Math.PI * 2;
        ridge.position.y = pH * 0.4; peak.add(ridge);
      }
      const pkx = (Math.random() - 0.5) * w * 0.85; const pkz = (Math.random() - 0.5) * d * 0.85;
      peak.position.set(pkx, getTerrainHeight(pkx, pkz, 2.0), pkz); mctx.scene.add(peak);
    }

    // ── Wind-swept trees ──
    for (let i = 0; i < 15; i++) {
      const tree = new THREE.Group();
      const tH = 1.5 + Math.random() * 2.5;
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.1, tH, 10), woodMat);
      trunk.position.y = tH / 2; trunk.rotation.z = 0.2 + Math.random() * 0.3; tree.add(trunk);
      // Sparse wind-swept branches (all leaning one way)
      for (let b = 0; b < 3 + Math.floor(Math.random() * 3); b++) {
        const bLen = 0.3 + Math.random() * 0.8;
        const branch = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.03, bLen, 17), woodMat);
        branch.position.set(0.2 + Math.random() * 0.3, tH * (0.4 + b * 0.15), 0);
        branch.rotation.z = -0.8 - Math.random() * 0.5; tree.add(branch);
      }
      const tx2 = (Math.random() - 0.5) * w * 0.8; const tz2 = (Math.random() - 0.5) * d * 0.8;
      tree.position.set(tx2, getTerrainHeight(tx2, tz2, 2.0), tz2); mctx.scene.add(tree);
    }

    // ── Cloud formations ──
    for (let i = 0; i < 12; i++) {
      const cloudGrp = new THREE.Group();
      const cloudCount = 3 + Math.floor(Math.random() * 3);
      for (let c = 0; c < cloudCount; c++) {
        const cR = 1 + Math.random() * 2;
        const cPart = new THREE.Mesh(new THREE.SphereGeometry(cR, 23, 20), cloudMat);
        cPart.position.set((Math.random() - 0.5) * 3, (Math.random() - 0.5) * 0.5, (Math.random() - 0.5) * 2);
        cPart.scale.set(1.5, 0.5, 1); cloudGrp.add(cPart);
      }
      cloudGrp.position.set((Math.random() - 0.5) * w * 0.9, 6 + Math.random() * 8, (Math.random() - 0.5) * d * 0.9);
      mctx.scene.add(cloudGrp);
    }

    // ── Rocky outcrops ──
    for (let i = 0; i < 18; i++) {
      const outcrop = new THREE.Group();
      const rockCount = 2 + Math.floor(Math.random() * 3);
      for (let r = 0; r < rockCount; r++) {
        const rR = 0.3 + Math.random() * 0.8;
        const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(rR, 2), r % 2 === 0 ? greyRockMat : darkRockMat);
        rock.scale.set(1 + Math.random() * 0.5, 0.7 + Math.random() * 0.5, 1 + Math.random() * 0.5);
        rock.position.set((Math.random() - 0.5) * 1.5, rR * 0.3, (Math.random() - 0.5) * 1.5);
        rock.rotation.y = Math.random() * Math.PI; outcrop.add(rock);
      }
      const ox = (Math.random() - 0.5) * w * 0.85; const oz = (Math.random() - 0.5) * d * 0.85;
      outcrop.position.set(ox, getTerrainHeight(ox, oz, 2.0), oz); mctx.scene.add(outcrop);
    }

    // ── Goat skull totems ──
    for (let i = 0; i < 8; i++) {
      const totem = new THREE.Group();
      const tH = 1.5 + Math.random() * 1.5;
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.08, tH, 10), woodMat);
      pole.position.y = tH / 2; totem.add(pole);
      // Skull
      const skull = new THREE.Mesh(new THREE.SphereGeometry(0.12, 14, 10), snowMat);
      skull.position.y = tH + 0.1; skull.scale.set(0.8, 1, 1.2); totem.add(skull);
      // Horns
      for (const hx of [-0.12, 0.12]) {
        const horn = new THREE.Mesh(new THREE.ConeGeometry(0.025, 0.2, 17), new THREE.MeshStandardMaterial({ color: 0xbbaa88, roughness: 0.7 }));
        horn.position.set(hx, tH + 0.2, -0.05);
        horn.rotation.z = hx > 0 ? -0.4 : 0.4; horn.rotation.x = -0.2; totem.add(horn);
      }
      // Eye sockets
      for (const ex of [-0.04, 0.04]) {
        const eye = new THREE.Mesh(new THREE.SphereGeometry(0.02, 17, 16), new THREE.MeshStandardMaterial({ color: 0x111111 }));
        eye.position.set(ex, tH + 0.12, 0.1); totem.add(eye);
      }
      // Hanging feathers/trinkets
      for (let f = 0; f < 2; f++) {
        const feather = new THREE.Mesh(new THREE.PlaneGeometry(0.03, 0.15), new THREE.MeshStandardMaterial({ color: 0x553322, side: THREE.DoubleSide }));
        feather.position.set((Math.random() - 0.5) * 0.1, tH - 0.3 - f * 0.2, 0.06);
        feather.rotation.z = (Math.random() - 0.5) * 0.3; totem.add(feather);
      }
      const ttx = (Math.random() - 0.5) * w * 0.7; const ttz = (Math.random() - 0.5) * d * 0.7;
      totem.position.set(ttx, getTerrainHeight(ttx, ttz, 2.0), ttz); mctx.scene.add(totem);
    }

    // ── Weather vane structures ──
    for (let i = 0; i < 6; i++) {
      const wv = new THREE.Group();
      const wvH = 2 + Math.random() * 2;
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.04, wvH, 10), metalMat);
      pole.position.y = wvH / 2; wv.add(pole);
      // Arrow
      const arrow = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.25, 30), metalMat);
      arrow.rotation.z = Math.PI / 2; arrow.position.set(0.15, wvH, 0); wv.add(arrow);
      // Tail
      const tail = new THREE.Mesh(new THREE.PlaneGeometry(0.15, 0.1), new THREE.MeshStandardMaterial({ color: 0x888899, metalness: 0.5, side: THREE.DoubleSide }));
      tail.position.set(-0.15, wvH, 0); wv.add(tail);
      // Cross bars (N/S/E/W)
      const nsBar = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.25, 16), metalMat);
      nsBar.rotation.z = Math.PI / 2; nsBar.position.y = wvH - 0.15; wv.add(nsBar);
      const ewBar = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.25, 16), metalMat);
      ewBar.rotation.x = Math.PI / 2; ewBar.position.y = wvH - 0.15; wv.add(ewBar);
      const wvx = (Math.random() - 0.5) * w * 0.7; const wvz = (Math.random() - 0.5) * d * 0.7;
      wv.position.set(wvx, getTerrainHeight(wvx, wvz, 2.0) + 3 + Math.random() * 4, wvz);
      wv.rotation.y = Math.random() * Math.PI * 2; mctx.scene.add(wv);
    }

    // ── Aurora-like effects ──
    const auroraMat = new THREE.MeshStandardMaterial({ color: 0x44ffaa, emissive: 0x22cc66, emissiveIntensity: 0.5, transparent: true, opacity: 0.12, side: THREE.DoubleSide, depthWrite: false });
    const auroraMat2 = new THREE.MeshStandardMaterial({ color: 0x4488ff, emissive: 0x2244cc, emissiveIntensity: 0.5, transparent: true, opacity: 0.1, side: THREE.DoubleSide, depthWrite: false });
    for (let i = 0; i < 6; i++) {
      const aurora = new THREE.Mesh(new THREE.PlaneGeometry(15 + Math.random() * 10, 3 + Math.random() * 2), i % 2 === 0 ? auroraMat : auroraMat2);
      aurora.position.set((Math.random() - 0.5) * w * 0.7, 14 + Math.random() * 4, (Math.random() - 0.5) * d * 0.7);
      aurora.rotation.set(Math.random() * 0.3, Math.random() * Math.PI, Math.random() * 0.2);
      mctx.scene.add(aurora);
    }

    // ── Bridge over chasm ──
    for (let i = 0; i < 3; i++) {
      const bridge = new THREE.Group();
      const bLen = 8 + Math.random() * 6;
      // Stone arch
      const archR = bLen / 2;
      const arch = new THREE.Mesh(new THREE.TorusGeometry(archR, 0.4, 23, 36, Math.PI), greyRockMat);
      arch.rotation.x = Math.PI / 2; arch.rotation.z = Math.PI; arch.position.y = -archR * 0.3; bridge.add(arch);
      // Walking surface
      const surface = new THREE.Mesh(new THREE.BoxGeometry(2, 0.3, bLen), greyRockMat);
      bridge.add(surface);
      // Low walls
      for (const sx of [-0.9, 0.9]) {
        const wall = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.6, bLen), greyRockMat);
        wall.position.set(sx, 0.45, 0); bridge.add(wall);
      }
      const bx = (Math.random() - 0.5) * w * 0.5; const bz = (Math.random() - 0.5) * d * 0.5;
      bridge.position.set(bx, getTerrainHeight(bx, bz, 2.0) + 2, bz);
      bridge.rotation.y = Math.random() * Math.PI; mctx.scene.add(bridge);
    }

    // ── Lightning rod arrays (thin metallic cylinders with sphere tips) ──
    for (let i = 0; i < 10; i++) {
      const rodArray = new THREE.Group();
      const rodCount = 3 + Math.floor(Math.random() * 3);
      for (let r = 0; r < rodCount; r++) {
        const rH = 3 + Math.random() * 4;
        const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.03, rH, 12), metalMat);
        rod.position.set((r - rodCount / 2) * 0.4, rH / 2, 0);
        rodArray.add(rod);
        const tip = new THREE.Mesh(new THREE.SphereGeometry(0.06, 16, 12), metalMat);
        tip.position.set((r - rodCount / 2) * 0.4, rH + 0.06, 0);
        rodArray.add(tip);
        // Cross braces between rods
        if (r < rodCount - 1) {
          const brace = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.4, 6), metalMat);
          brace.rotation.z = Math.PI / 2;
          brace.position.set((r - rodCount / 2 + 0.5) * 0.4, rH * 0.6, 0);
          rodArray.add(brace);
        }
      }
      // Base plate
      const basePlate = new THREE.Mesh(new THREE.BoxGeometry(rodCount * 0.5, 0.1, 0.4), metalMat);
      rodArray.add(basePlate);
      const arrL = new THREE.PointLight(0x4488ff, 0.6, 6);
      arrL.position.y = 4; rodArray.add(arrL); mctx.torchLights.push(arrL);
      const arx = (Math.random() - 0.5) * w * 0.7; const arz = (Math.random() - 0.5) * d * 0.7;
      rodArray.position.set(arx, getTerrainHeight(arx, arz, 2.0) + 2 + Math.random() * 4, arz);
      mctx.scene.add(rodArray);
    }

    // ── Wind-worn rock formations with layered erosion ──
    for (let i = 0; i < 12; i++) {
      const erosion = new THREE.Group();
      const layers = 4 + Math.floor(Math.random() * 4);
      const baseR = 0.8 + Math.random() * 1.5;
      for (let l = 0; l < layers; l++) {
        const layerR = baseR * (1 - l * 0.12);
        const layerH = 0.3 + Math.random() * 0.4;
        const layer = new THREE.Mesh(new THREE.CylinderGeometry(layerR * 0.85, layerR, layerH, 12 + Math.floor(Math.random() * 3)), l % 2 === 0 ? greyRockMat : darkRockMat);
        layer.position.y = l * 0.35;
        layer.rotation.y = l * 0.3 + Math.random() * 0.2;
        erosion.add(layer);
      }
      // Wind-cut groove
      const groove = new THREE.Mesh(new THREE.BoxGeometry(baseR * 1.2, 0.08, 0.15), darkRockMat);
      groove.position.y = layers * 0.15; groove.rotation.y = Math.random() * Math.PI;
      erosion.add(groove);
      const erx = (Math.random() - 0.5) * w * 0.8; const erz = (Math.random() - 0.5) * d * 0.8;
      erosion.position.set(erx, getTerrainHeight(erx, erz, 2.0), erz); mctx.scene.add(erosion);
    }

    // ── Broken bridge segments with hanging chain details ──
    for (let i = 0; i < 5; i++) {
      const brokenBridge = new THREE.Group();
      const bbLen = 3 + Math.random() * 4;
      // Broken platform (tilted)
      const plat = new THREE.Mesh(new THREE.BoxGeometry(2, 0.25, bbLen), greyRockMat);
      plat.rotation.x = (Math.random() - 0.5) * 0.3; plat.rotation.z = (Math.random() - 0.5) * 0.15;
      brokenBridge.add(plat);
      // Low walls (partially broken)
      const wallLen = bbLen * (0.4 + Math.random() * 0.3);
      const bWall = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.5, wallLen), greyRockMat);
      bWall.position.set(0.9, 0.35, (Math.random() - 0.5) * bbLen * 0.3); brokenBridge.add(bWall);
      // Hanging chains from broken edge
      for (let c = 0; c < 3; c++) {
        const chainLen = 1 + Math.random() * 2;
        const hangChain = new THREE.Group();
        const linkCount = Math.floor(chainLen / 0.2);
        for (let l = 0; l < linkCount; l++) {
          const link = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.015, 8, 12), chainMat);
          link.position.y = -l * 0.15;
          link.rotation.x = l % 2 === 0 ? 0 : Math.PI / 2;
          hangChain.add(link);
        }
        hangChain.position.set((c - 1) * 0.5, -0.1, bbLen / 2);
        brokenBridge.add(hangChain);
      }
      const bbx = (Math.random() - 0.5) * w * 0.6; const bbz = (Math.random() - 0.5) * d * 0.6;
      brokenBridge.position.set(bbx, getTerrainHeight(bbx, bbz, 2.0) + 3 + Math.random() * 3, bbz);
      brokenBridge.rotation.y = Math.random() * Math.PI; mctx.scene.add(brokenBridge);
    }

    // ── Storm-damaged structures with tilted/broken elements ──
    for (let i = 0; i < 6; i++) {
      const damaged = new THREE.Group();
      // Tilted wall section
      const wallH = 2 + Math.random() * 3; const wallW = 2 + Math.random() * 2;
      const dWall = new THREE.Mesh(new THREE.BoxGeometry(wallW, wallH, 0.4), greyRockMat);
      dWall.position.y = wallH / 2; dWall.rotation.z = (Math.random() - 0.5) * 0.4;
      dWall.rotation.x = (Math.random() - 0.5) * 0.2; damaged.add(dWall);
      // Fallen pillar
      const pillarH = 2 + Math.random() * 2;
      const fallen = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.3, pillarH, 16), greyRockMat);
      fallen.rotation.z = Math.PI / 2 + (Math.random() - 0.5) * 0.3;
      fallen.position.set(wallW * 0.6, 0.3, (Math.random() - 0.5) * 1); damaged.add(fallen);
      // Rubble pile
      for (let r = 0; r < 4 + Math.floor(Math.random() * 3); r++) {
        const rubble = new THREE.Mesh(new THREE.DodecahedronGeometry(0.15 + Math.random() * 0.2, 1), darkRockMat);
        rubble.position.set((Math.random() - 0.5) * wallW, 0.1 + Math.random() * 0.2, (Math.random() - 0.5) * 1);
        rubble.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
        damaged.add(rubble);
      }
      // Bent metal beam
      const beam = new THREE.Mesh(new THREE.BoxGeometry(0.08, wallH * 0.7, 0.08), metalMat);
      beam.position.set(-wallW * 0.3, wallH * 0.3, 0.3);
      beam.rotation.z = 0.2 + Math.random() * 0.3; damaged.add(beam);
      const dmx = (Math.random() - 0.5) * w * 0.7; const dmz = (Math.random() - 0.5) * d * 0.7;
      damaged.position.set(dmx, getTerrainHeight(dmx, dmz, 2.0), dmz);
      damaged.rotation.y = Math.random() * Math.PI; mctx.scene.add(damaged);
    }

    // ── Tesla coil structures (4) ──
    for (let i = 0; i < 4; i++) {
      const coil = new THREE.Group();
      const baseH = 4 + Math.random() * 2;
      const coilBase = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.6, baseH, 12), metalMat);
      coilBase.position.y = baseH / 2; coil.add(coilBase);
      const coilSphere = new THREE.Mesh(new THREE.SphereGeometry(0.6, 16, 16), metalMat);
      coilSphere.position.y = baseH + 0.6; coil.add(coilSphere);
      const energyMat = new THREE.MeshStandardMaterial({ color: 0x88ccff, emissive: 0x4488ff, emissiveIntensity: 1.2, roughness: 0.2 });
      for (let e = 0; e < 5; e++) {
        const spark = new THREE.Mesh(new THREE.SphereGeometry(0.06 + Math.random() * 0.04, 8, 8), energyMat);
        const angle = (e / 5) * Math.PI * 2;
        spark.position.set(Math.cos(angle) * 0.8, baseH + 0.6 + Math.sin(angle) * 0.5, Math.sin(angle) * 0.8);
        coil.add(spark);
      }
      const coilLight = new THREE.PointLight(0x4488ff, 1.5, 15);
      coilLight.position.y = baseH + 0.8; coil.add(coilLight); mctx.torchLights.push(coilLight);
      const conduit = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 6 + Math.random() * 4, 6), metalMat);
      conduit.rotation.z = Math.PI / 2 + (Math.random() - 0.5) * 0.3;
      conduit.position.y = baseH * 0.7; coil.add(conduit);
      const tcx = (Math.random() - 0.5) * w * 0.6; const tcz = (Math.random() - 0.5) * d * 0.6;
      coil.position.set(tcx, getTerrainHeight(tcx, tcz, 2.0), tcz);
      mctx.scene.add(coil);
    }

    // ── Wind-torn flag remnants (6) ──
    const flagClothMat = new THREE.MeshStandardMaterial({ color: 0x444455, roughness: 0.8, side: THREE.DoubleSide });
    for (let i = 0; i < 6; i++) {
      const flagGrp = new THREE.Group();
      const poleH = 2 + Math.random() * 1.5;
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.06, poleH, 8), darkRockMat);
      pole.position.y = poleH / 2; flagGrp.add(pole);
      for (let c = 0; c < 2 + Math.floor(Math.random() * 2); c++) {
        const cloth = new THREE.Mesh(new THREE.PlaneGeometry(0.8 + Math.random() * 0.5, 0.3 + Math.random() * 0.2), flagClothMat);
        cloth.position.set(0.5, poleH * (0.6 + c * 0.15), (Math.random() - 0.5) * 0.2);
        cloth.rotation.y = -0.3; cloth.rotation.z = (Math.random() - 0.5) * 0.2;
        flagGrp.add(cloth);
      }
      const fx = (Math.random() - 0.5) * w * 0.7; const fz = (Math.random() - 0.5) * d * 0.7;
      flagGrp.position.set(fx, getTerrainHeight(fx, fz, 2.0), fz);
      mctx.scene.add(flagGrp);
    }

    // ── Mountain goat skull props (8) ──
    for (let i = 0; i < 8; i++) {
      const skullGrp = new THREE.Group();
      const skull = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 8), snowMat);
      skull.scale.set(1, 0.8, 1.2); skullGrp.add(skull);
      for (const side of [-1, 1]) {
        const horn = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.3, 6), snowMat);
        horn.position.set(side * 0.12, 0.08, -0.05);
        horn.rotation.z = side * 0.6; horn.rotation.x = -0.3;
        skullGrp.add(horn);
      }
      const gsx = (Math.random() - 0.5) * w * 0.8; const gsz = (Math.random() - 0.5) * d * 0.8;
      skullGrp.position.set(gsx, getTerrainHeight(gsx, gsz, 2.0) + 0.1, gsz);
      skullGrp.rotation.y = Math.random() * Math.PI * 2;
      mctx.scene.add(skullGrp);
    }

    // ── Storm-damaged observatory (1) ──
    {
      const obs = new THREE.Group();
      const dome = new THREE.Mesh(new THREE.SphereGeometry(3, 16, 16, 0, Math.PI), greyRockMat);
      dome.rotation.x = -Math.PI / 2; dome.position.y = 2; obs.add(dome);
      const obsBase = new THREE.Mesh(new THREE.CylinderGeometry(3, 3.2, 2, 16, 1, true), greyRockMat);
      obsBase.position.y = 1; obs.add(obsBase);
      const mount = new THREE.Mesh(new THREE.BoxGeometry(0.5, 1, 0.5), metalMat);
      mount.position.set(0, 1.5, 0); obs.add(mount);
      const telescope = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.08, 2.5, 8), metalMat);
      telescope.rotation.z = 0.5; telescope.position.set(0.6, 2.8, 0); obs.add(telescope);
      for (let l = 0; l < 3; l++) {
        const lens = new THREE.Mesh(new THREE.SphereGeometry(0.08 + Math.random() * 0.05, 8, 8),
          new THREE.MeshStandardMaterial({ color: 0xaaddff, roughness: 0.1, metalness: 0.2, transparent: true, opacity: 0.6 }));
        lens.position.set((Math.random() - 0.5) * 2, 0.1, (Math.random() - 0.5) * 2);
        obs.add(lens);
      }
      const ox = (Math.random() - 0.5) * w * 0.4; const oz = (Math.random() - 0.5) * d * 0.4;
      obs.position.set(ox, getTerrainHeight(ox, oz, 2.0), oz);
      mctx.scene.add(obs);
    }

    // ── Chain anchors (6) ──
    for (let i = 0; i < 6; i++) {
      const anchorGrp = new THREE.Group();
      const plate = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.6, 0.1), metalMat);
      anchorGrp.add(plate);
      const linkCount = 4 + Math.floor(Math.random() * 4);
      const broken = Math.random() < 0.4;
      for (let l = 0; l < linkCount; l++) {
        const link = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.02, 6, 8), chainMat);
        link.position.set(0, -l * 0.12, 0.1);
        link.rotation.x = l % 2 === 0 ? 0 : Math.PI / 2;
        anchorGrp.add(link);
      }
      if (broken) {
        const dangle = new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.015, 6, 8), chainMat);
        dangle.position.set(0.05, -linkCount * 0.12 - 0.15, 0.1);
        dangle.rotation.z = 0.5; anchorGrp.add(dangle);
      }
      const ax = (Math.random() - 0.5) * w * 0.7; const az = (Math.random() - 0.5) * d * 0.7;
      anchorGrp.position.set(ax, getTerrainHeight(ax, az, 2.0) + 1 + Math.random() * 3, az);
      anchorGrp.rotation.y = Math.random() * Math.PI * 2;
      mctx.scene.add(anchorGrp);
    }

    // ── Wind erosion pillars (5) ──
    for (let i = 0; i < 5; i++) {
      const pillar = new THREE.Group();
      const segCount = 3 + Math.floor(Math.random() * 3);
      let yOff = 0;
      for (let s = 0; s < segCount; s++) {
        const segH = 1 + Math.random() * 1.5;
        const segR = 0.3 + Math.random() * 0.2 + (s === segCount - 1 ? 0.3 : 0);
        const seg = new THREE.Mesh(new THREE.CylinderGeometry(segR * 0.9, segR, segH, 10), greyRockMat);
        seg.position.y = yOff + segH / 2; pillar.add(seg);
        yOff += segH;
      }
      const epx = (Math.random() - 0.5) * w * 0.75; const epz = (Math.random() - 0.5) * d * 0.75;
      pillar.position.set(epx, getTerrainHeight(epx, epz, 2.0), epz);
      mctx.scene.add(pillar);
    }

    // ── Cracked crystal spheres (4) ──
    for (let i = 0; i < 4; i++) {
      const crystalGrp = new THREE.Group();
      const crR = 0.6 + Math.random() * 0.4;
      const crMat = new THREE.MeshStandardMaterial({ color: 0xaaddff, roughness: 0.1, metalness: 0.2, transparent: true, opacity: 0.5 });
      const crystal = new THREE.Mesh(new THREE.SphereGeometry(crR, 16, 16), crMat);
      crystalGrp.add(crystal);
      for (let c = 0; c < 4 + Math.floor(Math.random() * 3); c++) {
        const crack = new THREE.Mesh(new THREE.BoxGeometry(0.02, crR * 0.8, 0.02), darkRockMat);
        crack.position.set((Math.random() - 0.5) * crR * 0.6, (Math.random() - 0.5) * crR * 0.6, (Math.random() - 0.5) * crR * 0.6);
        crack.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
        crystalGrp.add(crack);
      }
      for (let f = 0; f < 3; f++) {
        const frag = new THREE.Mesh(new THREE.BoxGeometry(0.1 + Math.random() * 0.08, 0.08, 0.06), crMat);
        frag.position.set((Math.random() - 0.5) * 1.5, -crR * 0.3, (Math.random() - 0.5) * 1.5);
        frag.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
        crystalGrp.add(frag);
      }
      const ccx = (Math.random() - 0.5) * w * 0.6; const ccz = (Math.random() - 0.5) * d * 0.6;
      crystalGrp.position.set(ccx, getTerrainHeight(ccx, ccz, 2.0) + crR, ccz);
      mctx.scene.add(crystalGrp);
    }
}

export function buildShadowRealm(mctx: MapBuildContext, w: number, d: number): void {
    mctx.scene.fog = new THREE.FogExp2(0x110011, 0.035);
    mctx.applyTerrainColors(0x0a000a, 0x1a0a1a, 0.8);
    mctx.dirLight.color.setHex(0x553366);
    mctx.dirLight.intensity = 0.3;
    mctx.ambientLight.color.setHex(0x110011);
    mctx.ambientLight.intensity = 0.2;
    mctx.hemiLight.color.setHex(0x331144);
    mctx.hemiLight.groundColor.setHex(0x0a000a);

    const voidMat = new THREE.MeshStandardMaterial({ color: 0x1a001a, roughness: 0.9 });
    const purpleMat = new THREE.MeshStandardMaterial({ color: 0x440066, roughness: 0.6, emissive: 0x220033, emissiveIntensity: 0.3 });
    const darkPurpleMat = new THREE.MeshStandardMaterial({ color: 0x220033, roughness: 0.7 });
    const blackMat = new THREE.MeshStandardMaterial({ color: 0x050005, roughness: 0.95 });
    const mirrorMat = new THREE.MeshStandardMaterial({ color: 0x888899, roughness: 0.05, metalness: 0.9 });
    const eyeYellowMat = new THREE.MeshStandardMaterial({ color: 0xffaa00, emissive: 0xffaa00, emissiveIntensity: 1.0, roughness: 0.3 });
    const eyeRedMat = new THREE.MeshStandardMaterial({ color: 0xff2200, emissive: 0xff2200, emissiveIntensity: 1.0, roughness: 0.3 });
    const portalMat = new THREE.MeshStandardMaterial({ color: 0x330055, emissive: 0x220044, emissiveIntensity: 0.6, transparent: true, opacity: 0.7 });
    const tearMat = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 0.8, transparent: true, opacity: 0.6, side: THREE.DoubleSide });
    const redHotMat = new THREE.MeshStandardMaterial({ color: 0xff2200, emissive: 0xff1100, emissiveIntensity: 0.7, roughness: 0.4 });

    // ── Floating rock fragments (25+) ──
    for (let i = 0; i < 28; i++) {
      const fragR = 0.5 + Math.random() * 2;
      const frag = new THREE.Mesh(new THREE.DodecahedronGeometry(fragR, 2), voidMat);
      frag.scale.set(0.6 + Math.random() * 0.8, 0.5 + Math.random() * 0.6, 0.6 + Math.random() * 0.8);
      frag.position.set(
        (Math.random() - 0.5) * w * 0.85,
        1 + Math.random() * 10,
        (Math.random() - 0.5) * d * 0.85,
      );
      frag.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
      mctx.scene.add(frag);
    }

    // ── Shadow tendrils (15+) ──
    for (let i = 0; i < 18; i++) {
      const tendril = new THREE.Group();
      const segments = 4 + Math.floor(Math.random() * 4);
      let yOff = 0;
      for (let s = 0; s < segments; s++) {
        const segH = 0.8 + Math.random() * 1.2;
        const segR = 0.08 - s * 0.008;
        const seg = new THREE.Mesh(new THREE.CylinderGeometry(Math.max(0.02, segR - 0.02), Math.max(0.03, segR), segH, 5), darkPurpleMat);
        seg.position.set((Math.random() - 0.5) * 0.3, yOff + segH / 2, (Math.random() - 0.5) * 0.3);
        seg.rotation.x = (Math.random() - 0.5) * 0.3;
        seg.rotation.z = (Math.random() - 0.5) * 0.3;
        tendril.add(seg);
        yOff += segH * 0.8;
      }
      const tX = (Math.random() - 0.5) * w * 0.8;
      const tZ = (Math.random() - 0.5) * d * 0.8;
      tendril.position.set(tX, getTerrainHeight(tX, tZ, 0.8), tZ);
      mctx.scene.add(tendril);
    }

    // ── Nightmare eyes (20+) ──
    for (let i = 0; i < 24; i++) {
      const eyeGroup = new THREE.Group();
      const eyeMat = i % 3 === 0 ? eyeRedMat : eyeYellowMat;
      const eye1 = new THREE.Mesh(new THREE.SphereGeometry(0.06 + Math.random() * 0.04, 23, 23), eyeMat);
      eye1.position.set(-0.08, 0, 0);
      eyeGroup.add(eye1);
      const eye2 = new THREE.Mesh(new THREE.SphereGeometry(0.06 + Math.random() * 0.04, 23, 23), eyeMat);
      eye2.position.set(0.08, 0, 0);
      eyeGroup.add(eye2);
      eyeGroup.position.set(
        (Math.random() - 0.5) * w * 0.85,
        0.5 + Math.random() * 4,
        (Math.random() - 0.5) * d * 0.85,
      );
      eyeGroup.rotation.y = Math.random() * Math.PI * 2;
      mctx.scene.add(eyeGroup);
    }

    // ── Void portals (10+) ──
    for (let i = 0; i < 12; i++) {
      const portal = new THREE.Group();
      const portalR = 1 + Math.random() * 1.5;
      const ring = new THREE.Mesh(new THREE.TorusGeometry(portalR, 0.12, 27, 46), purpleMat);
      portal.add(ring);
      const center = new THREE.Mesh(new THREE.CircleGeometry(portalR * 0.85, 16), portalMat);
      portal.add(center);
      const pLight = new THREE.PointLight(0x6600aa, 0.8, 8);
      portal.add(pLight);
      mctx.torchLights.push(pLight);
      portal.position.set(
        (Math.random() - 0.5) * w * 0.7,
        1 + Math.random() * 5,
        (Math.random() - 0.5) * d * 0.7,
      );
      portal.rotation.set(Math.random() * Math.PI * 0.3, Math.random() * Math.PI, 0);
      mctx.scene.add(portal);
    }

    // ── Distorted mirror shards (12+) ──
    for (let i = 0; i < 14; i++) {
      const shard = new THREE.Mesh(
        new THREE.PlaneGeometry(0.5 + Math.random() * 1.5, 0.5 + Math.random() * 2),
        mirrorMat,
      );
      shard.position.set(
        (Math.random() - 0.5) * w * 0.8,
        0.5 + Math.random() * 6,
        (Math.random() - 0.5) * d * 0.8,
      );
      shard.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
      mctx.scene.add(shard);
    }

    // ── Soul cages (8+) ──
    for (let i = 0; i < 10; i++) {
      const soul = new THREE.Group();
      const cageR = 0.5 + Math.random() * 0.8;
      const cage = new THREE.Mesh(new THREE.SphereGeometry(cageR, 23, 17), new THREE.MeshStandardMaterial({ color: 0x442266, wireframe: true }));
      soul.add(cage);
      const innerGlow = new THREE.Mesh(new THREE.SphereGeometry(cageR * 0.3, 23, 23), new THREE.MeshStandardMaterial({ color: 0x8844ff, emissive: 0x6633cc, emissiveIntensity: 0.8, transparent: true, opacity: 0.5 }));
      soul.add(innerGlow);
      const sLight = new THREE.PointLight(0x8844ff, 0.5, 5);
      soul.add(sLight);
      mctx.torchLights.push(sLight);
      soul.position.set(
        (Math.random() - 0.5) * w * 0.7,
        1 + Math.random() * 5,
        (Math.random() - 0.5) * d * 0.7,
      );
      mctx.scene.add(soul);
    }

    // ── Corrupted trees (15+) ──
    for (let i = 0; i < 18; i++) {
      const tree = new THREE.Group();
      const trunkH = 2 + Math.random() * 4;
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.2, trunkH, 10), blackMat);
      trunk.position.y = trunkH / 2;
      trunk.rotation.x = (Math.random() - 0.5) * 0.2;
      trunk.rotation.z = (Math.random() - 0.5) * 0.2;
      tree.add(trunk);
      for (let b = 0; b < 3 + Math.floor(Math.random() * 3); b++) {
        const branchH = 0.5 + Math.random() * 1.5;
        const branch = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.05, branchH, 17), blackMat);
        branch.position.set(
          (Math.random() - 0.5) * 0.4,
          trunkH * 0.4 + Math.random() * trunkH * 0.5,
          (Math.random() - 0.5) * 0.4,
        );
        branch.rotation.set((Math.random() - 0.5) * 1.2, 0, (Math.random() - 0.5) * 1.2);
        tree.add(branch);
      }
      const trX = (Math.random() - 0.5) * w * 0.8;
      const trZ = (Math.random() - 0.5) * d * 0.8;
      tree.position.set(trX, getTerrainHeight(trX, trZ, 0.8), trZ);
      mctx.scene.add(tree);
    }

    // ── Nightmare pools (6+) ──
    for (let i = 0; i < 8; i++) {
      const pool = new THREE.Group();
      const poolR = 1.5 + Math.random() * 2;
      const surface = new THREE.Mesh(new THREE.CircleGeometry(poolR, 16), new THREE.MeshStandardMaterial({ color: 0x330044, emissive: 0x220033, emissiveIntensity: 0.4, transparent: true, opacity: 0.7 }));
      surface.rotation.x = -Math.PI / 2;
      surface.position.y = 0.02;
      pool.add(surface);
      const poolLight = new THREE.PointLight(0x660099, 0.6, 6);
      poolLight.position.y = -0.5;
      pool.add(poolLight);
      mctx.torchLights.push(poolLight);
      const plX = (Math.random() - 0.5) * w * 0.7;
      const plZ = (Math.random() - 0.5) * d * 0.7;
      pool.position.set(plX, getTerrainHeight(plX, plZ, 0.8), plZ);
      mctx.scene.add(pool);
    }

    // ── Floating orbs (20+) ──
    for (let i = 0; i < 24; i++) {
      const orbR = 0.1 + Math.random() * 0.25;
      const orbColors = [
        { c: 0x8800ff, e: 0x6600cc },
        { c: 0xff2200, e: 0xcc1100 },
        { c: 0x44ff44, e: 0x22aa22 },
      ];
      const oc = orbColors[i % 3];
      const orb = new THREE.Mesh(
        new THREE.SphereGeometry(orbR, 27, 27),
        new THREE.MeshStandardMaterial({ color: oc.c, emissive: oc.e, emissiveIntensity: 0.8, transparent: true, opacity: 0.7 }),
      );
      orb.position.set(
        (Math.random() - 0.5) * w * 0.85,
        0.5 + Math.random() * 8,
        (Math.random() - 0.5) * d * 0.85,
      );
      mctx.scene.add(orb);
    }

    // ── Reality tears (10+) ──
    for (let i = 0; i < 12; i++) {
      const tear = new THREE.Mesh(
        new THREE.PlaneGeometry(0.3 + Math.random() * 0.5, 1 + Math.random() * 2),
        tearMat,
      );
      tear.position.set(
        (Math.random() - 0.5) * w * 0.8,
        1 + Math.random() * 6,
        (Math.random() - 0.5) * d * 0.8,
      );
      tear.rotation.set(Math.random() * 0.5, Math.random() * Math.PI, Math.random() * 0.5);
      mctx.scene.add(tear);
    }

    // ── Shadow pillars (8+) ──
    for (let i = 0; i < 10; i++) {
      const pillar = new THREE.Group();
      const pilH = 4 + Math.random() * 6;
      const col = new THREE.Mesh(new THREE.BoxGeometry(0.8, pilH, 0.8), voidMat);
      col.position.y = pilH / 2;
      pillar.add(col);
      const topLight = new THREE.PointLight(0x8833cc, 0.7, 8);
      topLight.position.y = pilH + 0.3;
      pillar.add(topLight);
      mctx.torchLights.push(topLight);
      const piX = (Math.random() - 0.5) * w * 0.7;
      const piZ = (Math.random() - 0.5) * d * 0.7;
      pillar.position.set(piX, getTerrainHeight(piX, piZ, 0.8), piZ);
      mctx.scene.add(pillar);
    }

    // ── Fear totems (5+) ──
    for (let i = 0; i < 6; i++) {
      const totem = new THREE.Group();
      const base = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.3, 0.6), voidMat);
      totem.add(base);
      const body = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.25, 2, 10), darkPurpleMat);
      body.position.y = 1.15;
      totem.add(body);
      const skull = new THREE.Mesh(new THREE.SphereGeometry(0.2, 14, 10), voidMat);
      skull.position.y = 2.3;
      totem.add(skull);
      const totemLight = new THREE.PointLight(0x440066, 0.5, 4);
      totemLight.position.y = 2.5;
      totem.add(totemLight);
      mctx.torchLights.push(totemLight);
      const ftX = (Math.random() - 0.5) * w * 0.6;
      const ftZ = (Math.random() - 0.5) * d * 0.6;
      totem.position.set(ftX, getTerrainHeight(ftX, ftZ, 0.8), ftZ);
      mctx.scene.add(totem);
    }

    // ── Whispering stones (12+) ──
    for (let i = 0; i < 14; i++) {
      const stone = new THREE.Mesh(
        new THREE.SphereGeometry(0.3 + Math.random() * 0.5, 20, 17),
        new THREE.MeshStandardMaterial({ color: 0x332244, emissive: 0x220033, emissiveIntensity: 0.3, roughness: 0.8 }),
      );
      stone.scale.set(0.8 + Math.random() * 0.4, 0.7 + Math.random() * 0.6, 0.8 + Math.random() * 0.4);
      const wsX = (Math.random() - 0.5) * w * 0.8;
      const wsZ = (Math.random() - 0.5) * d * 0.8;
      stone.position.set(wsX, getTerrainHeight(wsX, wsZ, 0.8) + 0.2, wsZ);
      mctx.scene.add(stone);
    }

    // ── Inverted structures (4+) ──
    for (let i = 0; i < 5; i++) {
      const inverted = new THREE.Group();
      const archW = 2 + Math.random() * 2;
      const archH = 3 + Math.random() * 2;
      const pillarL = new THREE.Mesh(new THREE.BoxGeometry(0.4, archH, 0.4), voidMat);
      pillarL.position.set(-archW / 2, -archH / 2, 0);
      inverted.add(pillarL);
      const pillarR = new THREE.Mesh(new THREE.BoxGeometry(0.4, archH, 0.4), voidMat);
      pillarR.position.set(archW / 2, -archH / 2, 0);
      inverted.add(pillarR);
      const lintel = new THREE.Mesh(new THREE.BoxGeometry(archW + 0.8, 0.4, 0.5), voidMat);
      lintel.position.y = 0;
      inverted.add(lintel);
      inverted.position.set(
        (Math.random() - 0.5) * w * 0.6,
        8 + Math.random() * 4,
        (Math.random() - 0.5) * d * 0.6,
      );
      inverted.rotation.z = Math.PI;
      mctx.scene.add(inverted);
    }

    // ── Path of torment (10+) ──
    for (let i = 0; i < 12; i++) {
      const pathSeg = new THREE.Mesh(
        new THREE.BoxGeometry(1.5 + Math.random() * 2, 0.05, 0.3),
        redHotMat,
      );
      pathSeg.rotation.y = Math.random() * Math.PI;
      const ptX = (Math.random() - 0.5) * w * 0.6;
      const ptZ = (Math.random() - 0.5) * d * 0.6;
      pathSeg.position.set(ptX, getTerrainHeight(ptX, ptZ, 0.8) + 0.03, ptZ);
      mctx.scene.add(pathSeg);
    }

    // ── Void tendrils (detailed, rising from ground) ──
    for (let i = 0; i < 14; i++) {
      const tendril = new THREE.Group();
      const segs = 6 + Math.floor(Math.random() * 5);
      let ty = 0;
      for (let s = 0; s < segs; s++) {
        const sH = 0.5 + Math.random() * 0.8;
        const sR = Math.max(0.015, 0.1 - s * 0.008);
        const seg = new THREE.Mesh(new THREE.CylinderGeometry(sR * 0.7, sR, sH, 10), darkPurpleMat);
        seg.position.set((Math.random() - 0.5) * 0.4, ty + sH / 2, (Math.random() - 0.5) * 0.4);
        seg.rotation.x = (Math.random() - 0.5) * 0.4; seg.rotation.z = (Math.random() - 0.5) * 0.4;
        tendril.add(seg);
        ty += sH * 0.7;
        // Small barbs
        if (Math.random() > 0.6) {
          const barb = new THREE.Mesh(new THREE.ConeGeometry(0.015, 0.08, 16), purpleMat);
          barb.position.set(seg.position.x + 0.05, ty - sH * 0.3, seg.position.z);
          barb.rotation.z = Math.PI / 2 + (Math.random() - 0.5); tendril.add(barb);
        }
      }
      // Glow tip
      const tipGlow = new THREE.Mesh(new THREE.SphereGeometry(0.03, 17, 16), new THREE.MeshStandardMaterial({ color: 0x8800ff, emissive: 0x6600cc, emissiveIntensity: 1.0 }));
      tipGlow.position.y = ty; tendril.add(tipGlow);
      const vtx = (Math.random() - 0.5) * w * 0.8; const vtz = (Math.random() - 0.5) * d * 0.8;
      tendril.position.set(vtx, getTerrainHeight(vtx, vtz, 0.8), vtz); mctx.scene.add(tendril);
    }

    // ── Floating shadow fragments ──
    for (let i = 0; i < 20; i++) {
      const frag = new THREE.Group();
      const fragR = 0.3 + Math.random() * 0.8;
      const shard = new THREE.Mesh(new THREE.TetrahedronGeometry(fragR, 2), blackMat);
      shard.scale.set(0.8 + Math.random() * 0.4, 1.2 + Math.random() * 0.5, 0.8 + Math.random() * 0.4);
      frag.add(shard);
      // Dark aura
      const aura = new THREE.Mesh(new THREE.SphereGeometry(fragR * 1.3, 23, 17), new THREE.MeshStandardMaterial({ color: 0x220033, transparent: true, opacity: 0.15, depthWrite: false }));
      frag.add(aura);
      frag.position.set((Math.random() - 0.5) * w * 0.85, 2 + Math.random() * 8, (Math.random() - 0.5) * d * 0.85);
      frag.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
      mctx.scene.add(frag);
    }

    // ── Dark mirrors ──
    for (let i = 0; i < 8; i++) {
      const mirror = new THREE.Group();
      const mW = 1 + Math.random() * 1.5; const mH = 1.5 + Math.random() * 2;
      // Ornate frame
      const frame = new THREE.Mesh(new THREE.BoxGeometry(mW + 0.2, mH + 0.2, 0.1), new THREE.MeshStandardMaterial({ color: 0x222233, roughness: 0.5, metalness: 0.4 }));
      mirror.add(frame);
      // Reflective surface
      const surface = new THREE.Mesh(new THREE.PlaneGeometry(mW, mH), new THREE.MeshStandardMaterial({ color: 0x334455, roughness: 0.02, metalness: 0.95 }));
      surface.position.z = 0.06; mirror.add(surface);
      // Distortion overlay
      const distort = new THREE.Mesh(new THREE.PlaneGeometry(mW * 0.8, mH * 0.8), new THREE.MeshStandardMaterial({ color: 0x6600aa, emissive: 0x4400aa, emissiveIntensity: 0.3, transparent: true, opacity: 0.2 }));
      distort.position.z = 0.07; mirror.add(distort);
      mirror.position.set((Math.random() - 0.5) * w * 0.65, 1 + Math.random() * 4, (Math.random() - 0.5) * d * 0.65);
      mirror.rotation.y = Math.random() * Math.PI; mctx.scene.add(mirror);
    }

    // ── Shadow pools (with ripple rings) ──
    for (let i = 0; i < 10; i++) {
      const pool = new THREE.Group();
      const pR = 1 + Math.random() * 2;
      const surface = new THREE.Mesh(new THREE.CircleGeometry(pR, 16), new THREE.MeshStandardMaterial({ color: 0x110022, emissive: 0x0a0011, emissiveIntensity: 0.3, transparent: true, opacity: 0.8 }));
      surface.rotation.x = -Math.PI / 2; surface.position.y = 0.02; pool.add(surface);
      // Concentric ripple rings
      for (let r = 0; r < 3; r++) {
        const ring = new THREE.Mesh(new THREE.TorusGeometry(pR * (0.3 + r * 0.25), 0.01, 17, 44), new THREE.MeshStandardMaterial({ color: 0x330055, emissive: 0x220044, emissiveIntensity: 0.4, transparent: true, opacity: 0.3 }));
        ring.rotation.x = Math.PI / 2; ring.position.y = 0.03; pool.add(ring);
      }
      const pLight = new THREE.PointLight(0x440066, 0.4, 4);
      pLight.position.y = -0.5; pool.add(pLight); mctx.torchLights.push(pLight);
      const px = (Math.random() - 0.5) * w * 0.7; const pz = (Math.random() - 0.5) * d * 0.7;
      pool.position.set(px, getTerrainHeight(px, pz, 0.8), pz); mctx.scene.add(pool);
    }

    // ── Wispy ghost-like forms ──
    const ghostMat = new THREE.MeshStandardMaterial({ color: 0x8866cc, emissive: 0x442266, emissiveIntensity: 0.5, transparent: true, opacity: 0.2, depthWrite: false, side: THREE.DoubleSide });
    for (let i = 0; i < 10; i++) {
      const ghost = new THREE.Group();
      // Body (elongated sphere)
      const body = new THREE.Mesh(new THREE.SphereGeometry(0.3 + Math.random() * 0.2, 23, 20), ghostMat);
      body.scale.set(0.7, 1.5, 0.7); body.position.y = 0.5; ghost.add(body);
      // Head
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.15, 23, 20), ghostMat);
      head.position.y = 1.2; ghost.add(head);
      // Trailing wisps
      for (let w2 = 0; w2 < 3; w2++) {
        const wisp = new THREE.Mesh(new THREE.PlaneGeometry(0.15, 0.4 + Math.random() * 0.3), ghostMat);
        wisp.position.set((Math.random() - 0.5) * 0.2, -0.2 - w2 * 0.2, 0);
        wisp.rotation.z = (Math.random() - 0.5) * 0.5; ghost.add(wisp);
      }
      // Eye dots
      for (const ex of [-0.05, 0.05]) {
        const eye = new THREE.Mesh(new THREE.SphereGeometry(0.02, 17, 16), new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 1.0 }));
        eye.position.set(ex, 1.22, 0.12); ghost.add(eye);
      }
      ghost.position.set((Math.random() - 0.5) * w * 0.7, 0.5 + Math.random() * 3, (Math.random() - 0.5) * d * 0.7);
      ghost.rotation.y = Math.random() * Math.PI * 2; mctx.scene.add(ghost);
    }

    // ── Corrupted crystalline structures ──
    const corruptCrystalMat = new THREE.MeshStandardMaterial({ color: 0x440066, emissive: 0x330055, emissiveIntensity: 0.6, roughness: 0.15, metalness: 0.4 });
    for (let i = 0; i < 12; i++) {
      const crystal = new THREE.Group();
      const cH = 1 + Math.random() * 3;
      const main = new THREE.Mesh(new THREE.ConeGeometry(0.15 + Math.random() * 0.2, cH, 20), corruptCrystalMat);
      main.position.y = cH / 2; crystal.add(main);
      for (let s = 0; s < 3; s++) {
        const sub = new THREE.Mesh(new THREE.ConeGeometry(0.08 + Math.random() * 0.08, cH * (0.3 + Math.random() * 0.3), 17), corruptCrystalMat);
        sub.position.set((Math.random() - 0.5) * 0.4, cH * 0.2 + Math.random() * cH * 0.3, (Math.random() - 0.5) * 0.4);
        sub.rotation.x = (Math.random() - 0.5) * 0.5; sub.rotation.z = (Math.random() - 0.5) * 0.5;
        crystal.add(sub);
      }
      const cLight = new THREE.PointLight(0x6600aa, 0.3, 4);
      cLight.position.y = cH * 0.8; crystal.add(cLight); mctx.torchLights.push(cLight);
      const cx = (Math.random() - 0.5) * w * 0.75; const cz = (Math.random() - 0.5) * d * 0.75;
      crystal.position.set(cx, getTerrainHeight(cx, cz, 0.8), cz); mctx.scene.add(crystal);
    }

    // ── Dark energy conduits ──
    for (let i = 0; i < 8; i++) {
      const conduit = new THREE.Group();
      const cLen = 4 + Math.random() * 6;
      const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, cLen, 10), new THREE.MeshStandardMaterial({ color: 0x220033, roughness: 0.5, metalness: 0.3 }));
      conduit.add(pipe);
      // Energy pulses along conduit
      for (let p = 0; p < 4; p++) {
        const pulse = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.02, 17, 27), new THREE.MeshStandardMaterial({ color: 0x8800ff, emissive: 0x6600cc, emissiveIntensity: 0.8 }));
        pulse.position.y = (p / 3 - 0.5) * cLen * 0.8; conduit.add(pulse);
      }
      // End nodes
      for (const ey of [-cLen / 2, cLen / 2]) {
        const node = new THREE.Mesh(new THREE.SphereGeometry(0.12, 23, 23), purpleMat);
        node.position.y = ey; conduit.add(node);
      }
      conduit.position.set((Math.random() - 0.5) * w * 0.6, 2 + Math.random() * 5, (Math.random() - 0.5) * d * 0.6);
      conduit.rotation.set(Math.random() * Math.PI * 0.5, Math.random() * Math.PI, Math.random() * 0.5);
      mctx.scene.add(conduit);
    }

    // ── Shadow flame braziers ──
    for (let i = 0; i < 8; i++) {
      const brazier = new THREE.Group();
      // Bowl
      const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.3, 0.3, 12), voidMat);
      bowl.position.y = 1.3; brazier.add(bowl);
      // Stand
      const stand = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.15, 1.3, 10), voidMat);
      stand.position.y = 0.65; brazier.add(stand);
      // Shadow flames (dark purple/black transparent cones)
      for (let f = 0; f < 4; f++) {
        const flame = new THREE.Mesh(new THREE.ConeGeometry(0.15 + Math.random() * 0.1, 0.5 + Math.random() * 0.3, 36), new THREE.MeshStandardMaterial({ color: 0x6600aa, emissive: 0x4400aa, emissiveIntensity: 0.8, transparent: true, opacity: 0.5, depthWrite: false }));
        flame.position.set((Math.random() - 0.5) * 0.15, 1.6 + f * 0.1, (Math.random() - 0.5) * 0.15); brazier.add(flame);
      }
      const bLight = new THREE.PointLight(0x6600aa, 0.8, 6);
      bLight.position.y = 1.8; brazier.add(bLight); mctx.torchLights.push(bLight);
      const bx = (Math.random() - 0.5) * w * 0.65; const bz = (Math.random() - 0.5) * d * 0.65;
      brazier.position.set(bx, getTerrainHeight(bx, bz, 0.8), bz); mctx.scene.add(brazier);
    }

    // ── Shadow tendril pillars (dark twisted cylinders) ──
    for (let i = 0; i < 10; i++) {
      const tendrilPillar = new THREE.Group();
      const tpH = 4 + Math.random() * 6;
      const twistSegs = 8 + Math.floor(Math.random() * 4);
      for (let s = 0; s < twistSegs; s++) {
        const t = s / twistSegs;
        const segH = tpH / twistSegs;
        const segR = 0.15 * (1 - t * 0.3);
        const seg = new THREE.Mesh(new THREE.CylinderGeometry(segR * 0.8, segR, segH, 8), darkPurpleMat);
        const twistAngle = t * Math.PI * 2;
        const offset = Math.sin(twistAngle) * 0.1;
        seg.position.set(offset, t * tpH + segH / 2, Math.cos(twistAngle) * 0.1);
        seg.rotation.x = Math.sin(twistAngle) * 0.15; seg.rotation.z = Math.cos(twistAngle) * 0.15;
        tendrilPillar.add(seg);
      }
      // Pulsing glow at top
      const tipOrb = new THREE.Mesh(new THREE.SphereGeometry(0.08, 16, 12), new THREE.MeshStandardMaterial({ color: 0x8800ff, emissive: 0x6600cc, emissiveIntensity: 1.0 }));
      tipOrb.position.y = tpH; tendrilPillar.add(tipOrb);
      const tpL = new THREE.PointLight(0x6600aa, 0.4, 5);
      tpL.position.y = tpH; tendrilPillar.add(tpL); mctx.torchLights.push(tpL);
      const tpx = (Math.random() - 0.5) * w * 0.7; const tpz = (Math.random() - 0.5) * d * 0.7;
      tendrilPillar.position.set(tpx, getTerrainHeight(tpx, tpz, 0.8), tpz); mctx.scene.add(tendrilPillar);
    }

    // ── Mirror-like portal surfaces (reflective flat circles) ──
    for (let i = 0; i < 10; i++) {
      const mirrorPortal = new THREE.Group();
      const mpR = 0.8 + Math.random() * 1.5;
      // Reflective surface
      const mpSurf = new THREE.Mesh(new THREE.CircleGeometry(mpR, 16), new THREE.MeshStandardMaterial({ color: 0x667799, roughness: 0.02, metalness: 0.95 }));
      mirrorPortal.add(mpSurf);
      // Ornate frame ring
      const mpFrame = new THREE.Mesh(new THREE.TorusGeometry(mpR, 0.06, 12, 36), purpleMat);
      mirrorPortal.add(mpFrame);
      // Inner glow ring
      const mpGlow = new THREE.Mesh(new THREE.TorusGeometry(mpR * 0.85, 0.02, 8, 36), new THREE.MeshStandardMaterial({ color: 0x8844ff, emissive: 0x6633cc, emissiveIntensity: 0.8 }));
      mpGlow.position.z = 0.01; mirrorPortal.add(mpGlow);
      // Ripple effect (concentric circles)
      for (let r = 1; r <= 3; r++) {
        const ripple = new THREE.Mesh(new THREE.TorusGeometry(mpR * r * 0.25, 0.008, 6, 32), new THREE.MeshStandardMaterial({ color: 0x6644aa, emissive: 0x4422aa, emissiveIntensity: 0.4, transparent: true, opacity: 0.3 }));
        ripple.position.z = 0.005; mirrorPortal.add(ripple);
      }
      mirrorPortal.position.set((Math.random() - 0.5) * w * 0.65, 1.5 + Math.random() * 5, (Math.random() - 0.5) * d * 0.65);
      mirrorPortal.rotation.set(Math.random() * 0.3, Math.random() * Math.PI, 0); mctx.scene.add(mirrorPortal);
    }

    // ── Floating rune symbols (arranged thin boxes forming glyphs) ──
    for (let i = 0; i < 14; i++) {
      const runeGlyph = new THREE.Group();
      const runeSize = 0.4 + Math.random() * 0.6;
      const glyphRuneMat = new THREE.MeshStandardMaterial({ color: 0x8855ff, emissive: 0x6633cc, emissiveIntensity: 0.8, roughness: 0.3 });
      // Outer square frame
      for (let side = 0; side < 4; side++) {
        const bar = new THREE.Mesh(new THREE.BoxGeometry(runeSize, 0.02, 0.02), glyphRuneMat);
        const sa = (side / 4) * Math.PI * 2;
        bar.position.set(Math.cos(sa) * runeSize * 0.5, Math.sin(sa) * runeSize * 0.5, 0);
        bar.rotation.z = sa; runeGlyph.add(bar);
      }
      // Inner cross pattern
      const cross1 = new THREE.Mesh(new THREE.BoxGeometry(runeSize * 0.6, 0.015, 0.015), glyphRuneMat);
      runeGlyph.add(cross1);
      const cross2 = new THREE.Mesh(new THREE.BoxGeometry(0.015, runeSize * 0.6, 0.015), glyphRuneMat);
      runeGlyph.add(cross2);
      // Diagonal lines
      const diag1 = new THREE.Mesh(new THREE.BoxGeometry(runeSize * 0.5, 0.012, 0.012), glyphRuneMat);
      diag1.rotation.z = Math.PI / 4; runeGlyph.add(diag1);
      const diag2 = new THREE.Mesh(new THREE.BoxGeometry(runeSize * 0.5, 0.012, 0.012), glyphRuneMat);
      diag2.rotation.z = -Math.PI / 4; runeGlyph.add(diag2);
      // Corner dots
      for (let c = 0; c < 4; c++) {
        const ca = (c / 4) * Math.PI * 2 + Math.PI / 4;
        const dot = new THREE.Mesh(new THREE.SphereGeometry(0.02, 8, 6), glyphRuneMat);
        dot.position.set(Math.cos(ca) * runeSize * 0.35, Math.sin(ca) * runeSize * 0.35, 0);
        runeGlyph.add(dot);
      }
      runeGlyph.position.set((Math.random() - 0.5) * w * 0.75, 1 + Math.random() * 7, (Math.random() - 0.5) * d * 0.75);
      runeGlyph.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
      mctx.scene.add(runeGlyph);
    }

    // ── Corrupted crystal outcrops (dark translucent cones) ──
    for (let i = 0; i < 14; i++) {
      const darkCrystal = new THREE.Group();
      const dcMat = new THREE.MeshStandardMaterial({ color: 0x330055, emissive: 0x220044, emissiveIntensity: 0.4, roughness: 0.15, metalness: 0.3, transparent: true, opacity: 0.7 });
      const dcH = 1 + Math.random() * 2.5;
      const mainShard = new THREE.Mesh(new THREE.ConeGeometry(0.2 + Math.random() * 0.15, dcH, 8), dcMat);
      mainShard.position.y = dcH / 2; darkCrystal.add(mainShard);
      // Secondary shards
      for (let s = 0; s < 3 + Math.floor(Math.random() * 3); s++) {
        const subH = dcH * (0.2 + Math.random() * 0.3);
        const sub = new THREE.Mesh(new THREE.ConeGeometry(0.08 + Math.random() * 0.08, subH, 6), dcMat);
        sub.position.set((Math.random() - 0.5) * 0.4, subH / 2, (Math.random() - 0.5) * 0.4);
        sub.rotation.x = (Math.random() - 0.5) * 0.4; sub.rotation.z = (Math.random() - 0.5) * 0.4;
        darkCrystal.add(sub);
      }
      // Inner glow
      const dcLight = new THREE.PointLight(0x5500aa, 0.3, 4);
      dcLight.position.y = dcH * 0.5; darkCrystal.add(dcLight); mctx.torchLights.push(dcLight);
      const dcx = (Math.random() - 0.5) * w * 0.75; const dcz = (Math.random() - 0.5) * d * 0.75;
      darkCrystal.position.set(dcx, getTerrainHeight(dcx, dcz, 0.8), dcz); mctx.scene.add(darkCrystal);
    }

    // ── Shadow clone figures (8) ──
    const shadowCloneMat = new THREE.MeshStandardMaterial({ color: 0x0a000a, roughness: 0.8, transparent: true, opacity: 0.4 });
    const purpleEdgeMat = new THREE.MeshStandardMaterial({ color: 0x8800cc, emissive: 0x6600aa, emissiveIntensity: 0.8, roughness: 0.3 });
    for (let i = 0; i < 8; i++) {
      const clone = new THREE.Group();
      const torso = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.6, 0.2), shadowCloneMat);
      torso.position.y = 1.0; clone.add(torso);
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 8), shadowCloneMat);
      head.position.y = 1.45; clone.add(head);
      for (const ax of [-0.25, 0.25]) {
        const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.5, 6), shadowCloneMat);
        arm.position.set(ax, 0.9, 0); arm.rotation.z = ax > 0 ? -0.15 : 0.15; clone.add(arm);
      }
      for (const lx of [-0.1, 0.1]) {
        const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.55, 6), shadowCloneMat);
        leg.position.set(lx, 0.35, 0); clone.add(leg);
      }
      for (const [ey, eh] of [[1.0, 0.62], [1.45, 0.26]] as [number, number][]) {
        const edge = new THREE.Mesh(new THREE.BoxGeometry(0.38, eh, 0.03), purpleEdgeMat);
        edge.position.set(0, ey, 0.12); clone.add(edge);
      }
      const scx = (Math.random() - 0.5) * w * 0.75; const scz = (Math.random() - 0.5) * d * 0.75;
      clone.position.set(scx, getTerrainHeight(scx, scz, 0.8), scz);
      clone.rotation.y = Math.random() * Math.PI * 2;
      mctx.scene.add(clone);
    }

    // ── Nightmare trees (6) ──
    const nightBarkMat = new THREE.MeshStandardMaterial({ color: 0x1a0a1a, roughness: 0.95 });
    for (let i = 0; i < 6; i++) {
      const tree = new THREE.Group();
      let ty = 0;
      for (let s = 0; s < 4 + Math.floor(Math.random() * 3); s++) {
        const segH = 1.2 + Math.random() * 1.0;
        const seg = new THREE.Mesh(new THREE.CylinderGeometry(0.08 - s * 0.008, 0.12 - s * 0.008, segH, 6), nightBarkMat);
        seg.position.y = ty + segH / 2;
        seg.rotation.x = (Math.random() - 0.5) * 0.4;
        seg.rotation.z = (Math.random() - 0.5) * 0.4;
        tree.add(seg); ty += segH * 0.8;
      }
      for (let b = 0; b < 4 + Math.floor(Math.random() * 3); b++) {
        const branchLen = 0.8 + Math.random() * 1.2;
        const branch = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.04, branchLen, 5), nightBarkMat);
        branch.position.set((Math.random() - 0.5) * 0.5, ty * (0.5 + Math.random() * 0.4), (Math.random() - 0.5) * 0.5);
        branch.rotation.z = (Math.random() - 0.5) * 1.5;
        branch.rotation.x = (Math.random() - 0.5) * 0.8;
        tree.add(branch);
        const claw = new THREE.Mesh(new THREE.ConeGeometry(0.02, 0.15, 4), nightBarkMat);
        claw.position.copy(branch.position);
        claw.position.y += branchLen * 0.4;
        claw.rotation.z = branch.rotation.z + 0.3;
        tree.add(claw);
      }
      const ntx = (Math.random() - 0.5) * w * 0.7; const ntz = (Math.random() - 0.5) * d * 0.7;
      tree.position.set(ntx, getTerrainHeight(ntx, ntz, 0.8), ntz);
      mctx.scene.add(tree);
    }

    // ── Shadow pools (5) ──
    for (let i = 0; i < 5; i++) {
      const poolGrp = new THREE.Group();
      const poolR = 1.2 + Math.random() * 0.8;
      const poolSurface = new THREE.Mesh(new THREE.CircleGeometry(poolR, 24),
        new THREE.MeshStandardMaterial({ color: 0x000000, emissive: 0x000000, emissiveIntensity: 0, roughness: 1.0, metalness: 0.0 }));
      poolSurface.rotation.x = -Math.PI / 2; poolSurface.position.y = 0.02; poolGrp.add(poolSurface);
      const rim = new THREE.Mesh(new THREE.TorusGeometry(poolR, 0.05, 8, 24), purpleMat);
      rim.rotation.x = -Math.PI / 2; rim.position.y = 0.03; poolGrp.add(rim);
      const spx = (Math.random() - 0.5) * w * 0.7; const spz = (Math.random() - 0.5) * d * 0.7;
      poolGrp.position.set(spx, getTerrainHeight(spx, spz, 0.8), spz);
      mctx.scene.add(poolGrp);
    }

    // ── Trapped soul lanterns (8) ──
    for (let i = 0; i < 8; i++) {
      const lantern = new THREE.Group();
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 3, 6), darkPurpleMat);
      post.position.y = 1.5; lantern.add(post);
      const chain = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.8, 4), blackMat);
      chain.position.set(0, 3.3, 0); lantern.add(chain);
      const glass = new THREE.Mesh(new THREE.SphereGeometry(0.2, 12, 12),
        new THREE.MeshStandardMaterial({ color: 0x553388, roughness: 0.1, transparent: true, opacity: 0.3 }));
      glass.position.set(0, 2.8, 0); lantern.add(glass);
      const soul = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 8),
        new THREE.MeshStandardMaterial({ color: 0xaaddff, emissive: 0x8899ff, emissiveIntensity: 1.0, roughness: 0.2 }));
      soul.position.set(0, 2.8, 0); lantern.add(soul);
      const soulLight = new THREE.PointLight(0x8899ff, 0.6, 6);
      soulLight.position.set(0, 2.8, 0); lantern.add(soulLight); mctx.torchLights.push(soulLight);
      const slx = (Math.random() - 0.5) * w * 0.7; const slz = (Math.random() - 0.5) * d * 0.7;
      lantern.position.set(slx, getTerrainHeight(slx, slz, 0.8), slz);
      mctx.scene.add(lantern);
    }

    // ── Dark altars (3) ──
    for (let i = 0; i < 3; i++) {
      const altar = new THREE.Group();
      const altarBox = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.8, 1), blackMat);
      altarBox.position.y = 0.4; altar.add(altarBox);
      const altarSkull = new THREE.Mesh(new THREE.SphereGeometry(0.15, 8, 8), voidMat);
      altarSkull.position.set(0, 0.95, 0); altar.add(altarSkull);
      for (const [cx, cz] of [[-0.6, -0.4], [0.6, -0.4], [-0.6, 0.4], [0.6, 0.4]] as [number, number][]) {
        const candle = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.3, 6), darkPurpleMat);
        candle.position.set(cx, 0.95, cz); altar.add(candle);
        const flame = new THREE.Mesh(new THREE.SphereGeometry(0.05, 6, 6), purpleMat);
        flame.position.set(cx, 1.15, cz); altar.add(flame);
      }
      for (let r = 0; r < 6; r++) {
        const rAngle = (r / 6) * Math.PI * 2;
        const rune = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.02, 0.2), purpleMat);
        rune.position.set(Math.cos(rAngle) * 1.5, 0.01, Math.sin(rAngle) * 1.5);
        rune.rotation.y = rAngle; altar.add(rune);
      }
      const alx = (Math.random() - 0.5) * w * 0.6; const alz = (Math.random() - 0.5) * d * 0.6;
      altar.position.set(alx, getTerrainHeight(alx, alz, 0.8), alz);
      mctx.scene.add(altar);
    }

    // ── Shadowy archways (4) ──
    for (let i = 0; i < 4; i++) {
      const arch = new THREE.Group();
      const archH = 3 + Math.random() * 1.5;
      const archW = 1.5 + Math.random() * 0.5;
      const leftPillar = new THREE.Mesh(new THREE.BoxGeometry(0.3, archH, 0.3), darkPurpleMat);
      leftPillar.position.set(-archW / 2, archH / 2, 0); arch.add(leftPillar);
      const rightPillar = new THREE.Mesh(new THREE.BoxGeometry(0.3, archH, 0.3), darkPurpleMat);
      rightPillar.position.set(archW / 2, archH / 2, 0); arch.add(rightPillar);
      const lintel = new THREE.Mesh(new THREE.BoxGeometry(archW + 0.3, 0.3, 0.3), darkPurpleMat);
      lintel.position.set(0, archH, 0); arch.add(lintel);
      const voidFill = new THREE.Mesh(new THREE.PlaneGeometry(archW - 0.1, archH - 0.2),
        new THREE.MeshStandardMaterial({ color: 0x000000, roughness: 1.0, side: THREE.DoubleSide }));
      voidFill.position.set(0, archH / 2, 0); arch.add(voidFill);
      const edgeTop = new THREE.Mesh(new THREE.BoxGeometry(archW + 0.4, 0.05, 0.35), purpleEdgeMat);
      edgeTop.position.set(0, archH + 0.15, 0); arch.add(edgeTop);
      const arx = (Math.random() - 0.5) * w * 0.65; const arz = (Math.random() - 0.5) * d * 0.65;
      arch.position.set(arx, getTerrainHeight(arx, arz, 0.8), arz);
      arch.rotation.y = Math.random() * Math.PI * 2;
      mctx.scene.add(arch);
    }

    // ── Whispering stones (6) ──
    for (let i = 0; i < 6; i++) {
      const stoneRing = new THREE.Group();
      const stoneCount = 5 + Math.floor(Math.random() * 3);
      const ringR = 1.5 + Math.random() * 1;
      for (let s = 0; s < stoneCount; s++) {
        const sAngle = (s / stoneCount) * Math.PI * 2;
        const stoneH = 1.5 + Math.random() * 1.5;
        const stone = new THREE.Mesh(new THREE.BoxGeometry(0.15, stoneH, 0.1), voidMat);
        stone.position.set(Math.cos(sAngle) * ringR, stoneH / 2, Math.sin(sAngle) * ringR);
        stone.rotation.x = Math.sin(sAngle) * 0.15;
        stone.rotation.z = -Math.cos(sAngle) * 0.15;
        stone.rotation.y = sAngle;
        stoneRing.add(stone);
      }
      for (let p = 0; p < 3; p++) {
        const particle = new THREE.Mesh(new THREE.SphereGeometry(0.03, 6, 6),
          new THREE.MeshStandardMaterial({ color: 0x8866cc, emissive: 0x6644aa, emissiveIntensity: 0.5, transparent: true, opacity: 0.4 }));
        particle.position.set((Math.random() - 0.5) * ringR, 0.5 + Math.random() * 1.5, (Math.random() - 0.5) * ringR);
        stoneRing.add(particle);
      }
      const wsx = (Math.random() - 0.5) * w * 0.7; const wsz = (Math.random() - 0.5) * d * 0.7;
      stoneRing.position.set(wsx, getTerrainHeight(wsx, wsz, 0.8), wsz);
      mctx.scene.add(stoneRing);
    }
}

export function buildPrimordialAbyss(mctx: MapBuildContext, w: number, d: number): void {
    mctx.scene.fog = new THREE.FogExp2(0x0a0011, 0.04);
    mctx.applyTerrainColors(0x050008, 0x0a0a15, 0.5);
    mctx.dirLight.color.setHex(0x221133);
    mctx.dirLight.intensity = 0.15;
    mctx.ambientLight.color.setHex(0x050008);
    mctx.ambientLight.intensity = 0.1;
    mctx.hemiLight.color.setHex(0x110022);
    mctx.hemiLight.groundColor.setHex(0x050005);

    const voidBlackMat = new THREE.MeshStandardMaterial({ color: 0x080010, roughness: 0.95 });
    const crystalPurpleMat = new THREE.MeshStandardMaterial({ color: 0x5500aa, emissive: 0x4400aa, emissiveIntensity: 0.7, roughness: 0.2, metalness: 0.3 });
    const crystalBlueMat = new THREE.MeshStandardMaterial({ color: 0x2244cc, emissive: 0x1133aa, emissiveIntensity: 0.7, roughness: 0.2, metalness: 0.3 });
    const conduitMat = new THREE.MeshStandardMaterial({ color: 0x6633ff, emissive: 0x4422cc, emissiveIntensity: 0.6, roughness: 0.3 });
    const runeMat = new THREE.MeshStandardMaterial({ color: 0x8855ff, emissive: 0x6633cc, emissiveIntensity: 0.8, roughness: 0.3 });
    const chainMat = new THREE.MeshStandardMaterial({ color: 0x333344, roughness: 0.5, metalness: 0.7 });
    const stoneMat = new THREE.MeshStandardMaterial({ color: 0x444455, roughness: 0.8 });
    const boneMat = new THREE.MeshStandardMaterial({ color: 0xccbbaa, roughness: 0.7 });
    const gateMat = new THREE.MeshStandardMaterial({ color: 0x333344, roughness: 0.7, metalness: 0.4 });
    const tentacleMat = new THREE.MeshStandardMaterial({ color: 0x1a2a1a, roughness: 0.7, emissive: 0x0a110a, emissiveIntensity: 0.2 });
    const fractureMat = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 1.0, transparent: true, opacity: 0.6, side: THREE.DoubleSide });
    const starMat = new THREE.MeshStandardMaterial({ color: 0xccddff, emissive: 0xaabbee, emissiveIntensity: 0.9, roughness: 0.1 });
    const wellMat = new THREE.MeshStandardMaterial({ color: 0x0a0015, roughness: 0.1, transparent: true, opacity: 0.7 });

    // ── Void crystals (30+) ──
    for (let i = 0; i < 34; i++) {
      const crystal = new THREE.Group();
      const cH = 1.5 + Math.random() * 4;
      const cR = 0.3 + Math.random() * 0.8;
      const shard = new THREE.Mesh(new THREE.ConeGeometry(cR, cH, 10 + Math.floor(Math.random() * 3)), i % 2 === 0 ? crystalPurpleMat : crystalBlueMat);
      shard.position.y = cH / 2;
      crystal.add(shard);
      const cLight = new THREE.PointLight(i % 2 === 0 ? 0x6600cc : 0x2244cc, 1.0 + Math.random() * 0.8, 10 + Math.random() * 5);
      cLight.position.y = cH * 0.7;
      crystal.add(cLight);
      mctx.torchLights.push(cLight);
      // Secondary smaller shards
      for (let s = 0; s < 2; s++) {
        const subH = cH * (0.3 + Math.random() * 0.3);
        const sub = new THREE.Mesh(new THREE.ConeGeometry(cR * 0.4, subH, 17), i % 2 === 0 ? crystalPurpleMat : crystalBlueMat);
        sub.position.set((Math.random() - 0.5) * cR * 2, subH / 2, (Math.random() - 0.5) * cR * 2);
        sub.rotation.x = (Math.random() - 0.5) * 0.4;
        sub.rotation.z = (Math.random() - 0.5) * 0.4;
        crystal.add(sub);
      }
      const crX = (Math.random() - 0.5) * w * 0.85;
      const crZ = (Math.random() - 0.5) * d * 0.85;
      crystal.position.set(crX, getTerrainHeight(crX, crZ, 0.5), crZ);
      mctx.scene.add(crystal);
    }

    // ── Floating debris islands (20+) ──
    for (let i = 0; i < 24; i++) {
      const island = new THREE.Group();
      const iW = 2 + Math.random() * 4;
      const iH = 0.5 + Math.random() * 1;
      const iD = 2 + Math.random() * 4;
      if (i % 3 === 0) {
        const base = new THREE.Mesh(new THREE.SphereGeometry(iW / 2, 23, 17), voidBlackMat);
        base.scale.set(1, iH / iW, iD / iW);
        island.add(base);
      } else {
        const base = new THREE.Mesh(new THREE.BoxGeometry(iW, iH, iD), voidBlackMat);
        island.add(base);
      }
      island.position.set(
        (Math.random() - 0.5) * w * 0.85,
        2 + Math.random() * 10,
        (Math.random() - 0.5) * d * 0.85,
      );
      island.rotation.set((Math.random() - 0.5) * 0.2, Math.random() * Math.PI, (Math.random() - 0.5) * 0.2);
      mctx.scene.add(island);
    }

    // ── Ancient rune circles (15+) ──
    for (let i = 0; i < 18; i++) {
      const runeCircle = new THREE.Group();
      const rcR = 1 + Math.random() * 2;
      const ring = new THREE.Mesh(new THREE.TorusGeometry(rcR, 0.06, 23, 46), runeMat);
      ring.rotation.x = Math.PI / 2;
      runeCircle.add(ring);
      // Rune symbols as small glowing planes
      for (let s = 0; s < 4; s++) {
        const angle = (s / 4) * Math.PI * 2;
        const sym = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.3), runeMat);
        sym.rotation.x = -Math.PI / 2;
        sym.position.set(Math.cos(angle) * rcR * 0.6, 0.02, Math.sin(angle) * rcR * 0.6);
        runeCircle.add(sym);
      }
      const rcX = (Math.random() - 0.5) * w * 0.75;
      const rcZ = (Math.random() - 0.5) * d * 0.75;
      runeCircle.position.set(rcX, getTerrainHeight(rcX, rcZ, 0.5) + 0.03, rcZ);
      mctx.scene.add(runeCircle);
    }

    // ── Energy conduits (12+) ──
    for (let i = 0; i < 14; i++) {
      const condLen = 4 + Math.random() * 8;
      const conduit = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, condLen, 10), conduitMat);
      conduit.position.set(
        (Math.random() - 0.5) * w * 0.7,
        1 + Math.random() * 5,
        (Math.random() - 0.5) * d * 0.7,
      );
      conduit.rotation.set(Math.random() * Math.PI * 0.5, Math.random() * Math.PI, Math.random() * Math.PI * 0.5);
      mctx.scene.add(conduit);
    }

    // ── Imprisoned titans (8+) ──
    for (let i = 0; i < 8; i++) {
      const titan = new THREE.Group();
      // Torso
      const torso = new THREE.Mesh(new THREE.BoxGeometry(2.5, 3.5, 1.5), stoneMat);
      torso.position.y = 4;
      titan.add(torso);
      // Head
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.9, 23, 23), stoneMat);
      head.position.y = 6.5;
      titan.add(head);
      // Arms
      const armL = new THREE.Mesh(new THREE.BoxGeometry(0.7, 3, 0.7), stoneMat);
      armL.position.set(-1.8, 4.5, 0);
      armL.rotation.z = 0.5;
      titan.add(armL);
      const armR = new THREE.Mesh(new THREE.BoxGeometry(0.7, 3, 0.7), stoneMat);
      armR.position.set(1.8, 4.5, 0);
      armR.rotation.z = -0.5;
      titan.add(armR);
      // Legs
      const legL = new THREE.Mesh(new THREE.BoxGeometry(0.8, 3.5, 0.8), stoneMat);
      legL.position.set(-0.6, 1.2, 0);
      titan.add(legL);
      const legR = new THREE.Mesh(new THREE.BoxGeometry(0.8, 3.5, 0.8), stoneMat);
      legR.position.set(0.6, 1.2, 0);
      titan.add(legR);
      // Chains
      for (let c = 0; c < 4; c++) {
        const chainLink = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.06, 17, 27), chainMat);
        chainLink.position.set(
          (c < 2 ? -1 : 1) * (1.5 + Math.random()),
          3 + c * 1.2,
          (Math.random() - 0.5) * 2,
        );
        chainLink.rotation.set(Math.random(), Math.random(), Math.random());
        titan.add(chainLink);
      }
      const tiX = (Math.random() - 0.5) * w * 0.6;
      const tiZ = (Math.random() - 0.5) * d * 0.6;
      titan.position.set(tiX, getTerrainHeight(tiX, tiZ, 0.5) - 0.5, tiZ);
      titan.rotation.y = Math.random() * Math.PI;
      mctx.scene.add(titan);
    }

    // ── Reality fractures (10+) ──
    for (let i = 0; i < 12; i++) {
      const fracture = new THREE.Mesh(
        new THREE.PlaneGeometry(0.2 + Math.random() * 0.4, 1 + Math.random() * 3),
        fractureMat,
      );
      fracture.position.set(
        (Math.random() - 0.5) * w * 0.8,
        1 + Math.random() * 7,
        (Math.random() - 0.5) * d * 0.8,
      );
      fracture.rotation.set(Math.random() * 0.4, Math.random() * Math.PI, Math.random() * 0.4);
      mctx.scene.add(fracture);
    }

    // ── Abyssal tentacles (15+) ──
    for (let i = 0; i < 18; i++) {
      const tentacle = new THREE.Group();
      const segs = 5 + Math.floor(Math.random() * 4);
      let ty = 0;
      for (let s = 0; s < segs; s++) {
        const segH = 0.6 + Math.random() * 0.8;
        const topR = Math.max(0.02, 0.15 - s * 0.015);
        const botR = Math.max(0.03, 0.18 - s * 0.015);
        const seg = new THREE.Mesh(new THREE.CylinderGeometry(topR, botR, segH, 10), tentacleMat);
        seg.position.set((Math.random() - 0.5) * 0.2, ty + segH / 2, (Math.random() - 0.5) * 0.2);
        seg.rotation.x = (Math.random() - 0.5) * 0.3;
        seg.rotation.z = (Math.random() - 0.5) * 0.3;
        tentacle.add(seg);
        ty += segH * 0.75;
      }
      const teX = (Math.random() - 0.5) * w * 0.8;
      const teZ = (Math.random() - 0.5) * d * 0.8;
      tentacle.position.set(teX, getTerrainHeight(teX, teZ, 0.5), teZ);
      mctx.scene.add(tentacle);
    }

    // ── Ancient gates (6+) ──
    for (let i = 0; i < 7; i++) {
      const gate = new THREE.Group();
      const gateH = 6 + Math.random() * 4;
      const gateW = 4 + Math.random() * 3;
      const pillarL = new THREE.Mesh(new THREE.BoxGeometry(1.2, gateH, 1.2), gateMat);
      pillarL.position.set(-gateW / 2, gateH / 2, 0);
      gate.add(pillarL);
      const pillarR = new THREE.Mesh(new THREE.BoxGeometry(1.2, gateH, 1.2), gateMat);
      pillarR.position.set(gateW / 2, gateH / 2, 0);
      gate.add(pillarR);
      // Partial lintel (broken)
      const lintelW = gateW * (0.4 + Math.random() * 0.4);
      const lintel = new THREE.Mesh(new THREE.BoxGeometry(lintelW, 1, 1.2), gateMat);
      lintel.position.set(-gateW / 2 + lintelW / 2, gateH + 0.5, 0);
      lintel.rotation.z = (Math.random() - 0.5) * 0.15;
      gate.add(lintel);
      const gaX = (Math.random() - 0.5) * w * 0.6;
      const gaZ = (Math.random() - 0.5) * d * 0.6;
      gate.position.set(gaX, getTerrainHeight(gaX, gaZ, 0.5), gaZ);
      gate.rotation.y = Math.random() * Math.PI;
      mctx.scene.add(gate);
    }

    // ── Starfield particles (20+) ──
    for (let i = 0; i < 25; i++) {
      const star = new THREE.Mesh(
        new THREE.SphereGeometry(0.03 + Math.random() * 0.05, 17, 17),
        starMat,
      );
      star.position.set(
        (Math.random() - 0.5) * w * 0.95,
        Math.random() * 15,
        (Math.random() - 0.5) * d * 0.95,
      );
      mctx.scene.add(star);
    }

    // ── Gravitational wells (8+) ──
    for (let i = 0; i < 10; i++) {
      const well = new THREE.Group();
      const wellR = 1.5 + Math.random() * 2;
      const disc = new THREE.Mesh(new THREE.CircleGeometry(wellR, 16), wellMat);
      disc.rotation.x = -Math.PI / 2;
      well.add(disc);
      const distortRing = new THREE.Mesh(new THREE.TorusGeometry(wellR * 0.7, 0.04, 23, 44), new THREE.MeshStandardMaterial({ color: 0x3322aa, emissive: 0x2211aa, emissiveIntensity: 0.5, transparent: true, opacity: 0.4 }));
      distortRing.rotation.x = Math.PI / 2;
      distortRing.position.y = 0.05;
      well.add(distortRing);
      const weX = (Math.random() - 0.5) * w * 0.7;
      const weZ = (Math.random() - 0.5) * d * 0.7;
      well.position.set(weX, getTerrainHeight(weX, weZ, 0.5) + 0.02, weZ);
      mctx.scene.add(well);
    }

    // ── Petrified warriors (10+) ──
    for (let i = 0; i < 12; i++) {
      const warrior = new THREE.Group();
      const wTorso = new THREE.Mesh(new THREE.BoxGeometry(0.6, 1, 0.4), stoneMat);
      wTorso.position.y = 1.3;
      warrior.add(wTorso);
      const wHead = new THREE.Mesh(new THREE.SphereGeometry(0.2, 23, 23), stoneMat);
      wHead.position.y = 2;
      warrior.add(wHead);
      const wArmL = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.8, 0.15), stoneMat);
      wArmL.position.set(-0.45, 1.4, 0.15);
      wArmL.rotation.x = -0.5 - Math.random() * 0.5;
      warrior.add(wArmL);
      const wArmR = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.8, 0.15), stoneMat);
      wArmR.position.set(0.45, 1.4, 0.15);
      wArmR.rotation.x = -0.3 - Math.random() * 0.7;
      warrior.add(wArmR);
      const wLegL = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.9, 0.2), stoneMat);
      wLegL.position.set(-0.15, 0.45, 0);
      warrior.add(wLegL);
      const wLegR = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.9, 0.2), stoneMat);
      wLegR.position.set(0.15, 0.45, 0.15);
      wLegR.rotation.x = -0.3;
      warrior.add(wLegR);
      // Sword in hand
      const sword = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.9, 0.08), stoneMat);
      sword.position.set(0.45, 1.8, 0.5);
      sword.rotation.x = -0.8;
      warrior.add(sword);
      const waX = (Math.random() - 0.5) * w * 0.7;
      const waZ = (Math.random() - 0.5) * d * 0.7;
      warrior.position.set(waX, getTerrainHeight(waX, waZ, 0.5), waZ);
      warrior.rotation.y = Math.random() * Math.PI * 2;
      mctx.scene.add(warrior);
    }

    // ── Elder god eyes (5+) ──
    for (let i = 0; i < 5; i++) {
      const godEye = new THREE.Group();
      const eyeR = 1.5 + Math.random() * 2;
      const eyeball = new THREE.Mesh(new THREE.SphereGeometry(eyeR, 14, 10), new THREE.MeshStandardMaterial({ color: 0xaa0000, emissive: 0xff0000, emissiveIntensity: 0.6, roughness: 0.3 }));
      godEye.add(eyeball);
      const pupil = new THREE.Mesh(new THREE.SphereGeometry(eyeR * 0.4, 27, 27), new THREE.MeshStandardMaterial({ color: 0x000000, roughness: 0.1 }));
      pupil.position.z = eyeR * 0.7;
      godEye.add(pupil);
      const iris = new THREE.Mesh(new THREE.TorusGeometry(eyeR * 0.35, eyeR * 0.08, 23, 36), new THREE.MeshStandardMaterial({ color: 0xff4400, emissive: 0xff2200, emissiveIntensity: 0.5 }));
      iris.position.z = eyeR * 0.65;
      godEye.add(iris);
      const eLight = new THREE.PointLight(0xff2200, 1.5, 15);
      eLight.position.z = eyeR * 0.5;
      godEye.add(eLight);
      mctx.torchLights.push(eLight);
      godEye.position.set(
        (Math.random() - 0.5) * w * 0.5,
        3 + Math.random() * 6,
        (Math.random() - 0.5) * d * 0.5,
      );
      godEye.rotation.set((Math.random() - 0.5) * 0.5, Math.random() * Math.PI, 0);
      mctx.scene.add(godEye);
    }

    // ── Bone spires (12+) ──
    for (let i = 0; i < 14; i++) {
      const spireH = 2 + Math.random() * 5;
      const spire = new THREE.Mesh(
        new THREE.CylinderGeometry(0.08, 0.2 + Math.random() * 0.15, spireH, 10),
        boneMat,
      );
      const bsX = (Math.random() - 0.5) * w * 0.8;
      const bsZ = (Math.random() - 0.5) * d * 0.8;
      spire.position.set(bsX, getTerrainHeight(bsX, bsZ, 0.5) + spireH / 2, bsZ);
      spire.rotation.x = (Math.random() - 0.5) * 0.15;
      spire.rotation.z = (Math.random() - 0.5) * 0.15;
      mctx.scene.add(spire);
    }

    // ── Chaos fountains (4+) ──
    for (let i = 0; i < 5; i++) {
      const fountain = new THREE.Group();
      const base = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 1.2, 0.5, 12), voidBlackMat);
      fountain.add(base);
      const cone = new THREE.Mesh(new THREE.ConeGeometry(0.5, 4, 10), conduitMat);
      cone.position.y = 1.5;
      cone.rotation.z = Math.PI; // pointing up = reverse gravity feel
      fountain.add(cone);
      // Upward particles
      for (let p = 0; p < 6; p++) {
        const particle = new THREE.Mesh(new THREE.SphereGeometry(0.06 + Math.random() * 0.06, 17, 17), conduitMat);
        particle.position.set(
          (Math.random() - 0.5) * 0.8,
          1.5 + Math.random() * 3,
          (Math.random() - 0.5) * 0.8,
        );
        fountain.add(particle);
      }
      const foLight = new THREE.PointLight(0x6633ff, 0.8, 8);
      foLight.position.y = 2;
      fountain.add(foLight);
      mctx.torchLights.push(foLight);
      const foX = (Math.random() - 0.5) * w * 0.5;
      const foZ = (Math.random() - 0.5) * d * 0.5;
      fountain.position.set(foX, getTerrainHeight(foX, foZ, 0.5), foZ);
      mctx.scene.add(fountain);
    }

    // ── Void chains (8+) ──
    for (let i = 0; i < 10; i++) {
      const voidChain = new THREE.Group();
      const linkCount = 5 + Math.floor(Math.random() * 5);
      const linkR = 0.3 + Math.random() * 0.4;
      for (let l = 0; l < linkCount; l++) {
        const link = new THREE.Mesh(new THREE.TorusGeometry(linkR, linkR * 0.2, 20, 27), chainMat);
        link.position.set(l * linkR * 1.5, 0, 0);
        link.rotation.y = l % 2 === 0 ? 0 : Math.PI / 2;
        voidChain.add(link);
      }
      voidChain.position.set(
        (Math.random() - 0.5) * w * 0.6,
        2 + Math.random() * 8,
        (Math.random() - 0.5) * d * 0.6,
      );
      voidChain.rotation.set(
        (Math.random() - 0.5) * 0.5,
        Math.random() * Math.PI,
        (Math.random() - 0.5) * 0.5,
      );
      mctx.scene.add(voidChain);
    }

    // ── Ancient cosmic structures ──
    for (let i = 0; i < 6; i++) {
      const cosmic = new THREE.Group();
      // Floating pyramid
      const pyrH = 3 + Math.random() * 4;
      const pyrR = 1.5 + Math.random() * 2;
      const pyr = new THREE.Mesh(new THREE.ConeGeometry(pyrR, pyrH, 17), voidBlackMat);
      pyr.position.y = pyrH / 2; cosmic.add(pyr);
      // Glowing runes on surface
      for (let r = 0; r < 4; r++) {
        const ra = (r / 4) * Math.PI * 2;
        const rune = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 0.4), runeMat);
        rune.position.set(Math.cos(ra) * pyrR * 0.5, pyrH * 0.4, Math.sin(ra) * pyrR * 0.5);
        rune.lookAt(0, pyrH * 0.4, 0); cosmic.add(rune);
      }
      // Orbiting ring
      const orbit = new THREE.Mesh(new THREE.TorusGeometry(pyrR * 1.3, 0.05, 23, 44), conduitMat);
      orbit.rotation.x = Math.PI / 2 + (Math.random() - 0.5) * 0.3;
      orbit.position.y = pyrH * 0.5; cosmic.add(orbit);
      const csLight = new THREE.PointLight(0x4422cc, 0.8, 10);
      csLight.position.y = pyrH * 0.7; cosmic.add(csLight); mctx.torchLights.push(csLight);
      cosmic.position.set((Math.random() - 0.5) * w * 0.5, 2 + Math.random() * 6, (Math.random() - 0.5) * d * 0.5);
      cosmic.rotation.y = Math.random() * Math.PI; mctx.scene.add(cosmic);
    }

    // ── Tentacle formations ──
    for (let i = 0; i < 12; i++) {
      const tent = new THREE.Group();
      const segs = 6 + Math.floor(Math.random() * 5);
      let ty = 0; let tx2 = 0; let tz2 = 0;
      for (let s = 0; s < segs; s++) {
        const sH = 0.5 + Math.random() * 0.6;
        const topR = Math.max(0.02, 0.2 - s * 0.02);
        const botR = Math.max(0.03, 0.25 - s * 0.02);
        const seg = new THREE.Mesh(new THREE.CylinderGeometry(topR, botR, sH, 10), tentacleMat);
        const dx = (Math.random() - 0.5) * 0.3; const dz = (Math.random() - 0.5) * 0.3;
        seg.position.set(tx2 + dx, ty + sH / 2, tz2 + dz);
        seg.rotation.x = (Math.random() - 0.5) * 0.4; seg.rotation.z = (Math.random() - 0.5) * 0.4;
        tent.add(seg); tx2 += dx * 0.5; tz2 += dz * 0.5; ty += sH * 0.7;
        // Suckers
        if (Math.random() > 0.5) {
          const sucker = new THREE.Mesh(new THREE.CircleGeometry(topR * 0.6, 23), new THREE.MeshStandardMaterial({ color: 0x2a1a2a, roughness: 0.6, side: THREE.DoubleSide }));
          sucker.position.set(tx2 + botR, ty - sH * 0.3, tz2);
          sucker.rotation.y = Math.PI / 2; tent.add(sucker);
        }
      }
      const ttx = (Math.random() - 0.5) * w * 0.8; const ttz = (Math.random() - 0.5) * d * 0.8;
      tent.position.set(ttx, getTerrainHeight(ttx, ttz, 0.5), ttz); mctx.scene.add(tent);
    }

    // ── Eye-like formations ──
    for (let i = 0; i < 8; i++) {
      const eye = new THREE.Group();
      const eR = 0.8 + Math.random() * 1.2;
      // Outer ring (eyelid)
      const lid = new THREE.Mesh(new THREE.TorusGeometry(eR, eR * 0.15, 23, 44), new THREE.MeshStandardMaterial({ color: 0x1a1a2a, roughness: 0.7 }));
      eye.add(lid);
      // Iris
      const iris = new THREE.Mesh(new THREE.CircleGeometry(eR * 0.7, 16), new THREE.MeshStandardMaterial({ color: 0xaa4400, emissive: 0x882200, emissiveIntensity: 0.5 }));
      eye.add(iris);
      // Pupil
      const pupil = new THREE.Mesh(new THREE.CircleGeometry(eR * 0.3, 16), new THREE.MeshStandardMaterial({ color: 0x000000 }));
      pupil.position.z = 0.01; eye.add(pupil);
      // Veins
      for (let v = 0; v < 5; v++) {
        const va = Math.random() * Math.PI * 2;
        const vein = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, eR * 0.5, 16), new THREE.MeshStandardMaterial({ color: 0xcc2200, roughness: 0.5 }));
        vein.position.set(Math.cos(va) * eR * 0.5, Math.sin(va) * eR * 0.5, 0.01);
        vein.rotation.z = va + Math.PI / 2; eye.add(vein);
      }
      const eLight = new THREE.PointLight(0xff4400, 0.4, 6);
      eye.add(eLight); mctx.torchLights.push(eLight);
      eye.position.set((Math.random() - 0.5) * w * 0.6, 2 + Math.random() * 6, (Math.random() - 0.5) * d * 0.6);
      eye.rotation.set((Math.random() - 0.5) * 0.5, Math.random() * Math.PI, 0); mctx.scene.add(eye);
    }

    // ── Reality tears (enhanced) ──
    for (let i = 0; i < 10; i++) {
      const tear = new THREE.Group();
      const tH = 1 + Math.random() * 3; const tW = 0.2 + Math.random() * 0.4;
      const main = new THREE.Mesh(new THREE.PlaneGeometry(tW, tH), fractureMat);
      tear.add(main);
      // Jagged edges (small planes)
      for (let j = 0; j < 4; j++) {
        const jag = new THREE.Mesh(new THREE.PlaneGeometry(tW * 0.5, tH * 0.2), fractureMat);
        jag.position.set(tW * 0.3 * (j % 2 === 0 ? 1 : -1), (j / 3 - 0.5) * tH * 0.6, 0);
        jag.rotation.z = (Math.random() - 0.5) * 0.5; tear.add(jag);
      }
      // Energy leaking from tear
      for (let e = 0; e < 2; e++) {
        const leak = new THREE.Mesh(new THREE.SphereGeometry(0.08, 17, 16), new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xeeeeff, emissiveIntensity: 1.0, transparent: true, opacity: 0.4 }));
        leak.position.set((Math.random() - 0.5) * 0.3, (Math.random() - 0.5) * tH * 0.5, 0.1); tear.add(leak);
      }
      tear.position.set((Math.random() - 0.5) * w * 0.7, 2 + Math.random() * 6, (Math.random() - 0.5) * d * 0.7);
      tear.rotation.set(Math.random() * 0.3, Math.random() * Math.PI, Math.random() * 0.3); mctx.scene.add(tear);
    }

    // ── Floating runes in air ──
    for (let i = 0; i < 16; i++) {
      const rune = new THREE.Group();
      // Rune symbol (glowing plane)
      const runeSize = 0.3 + Math.random() * 0.4;
      const symbol = new THREE.Mesh(new THREE.PlaneGeometry(runeSize, runeSize), runeMat);
      rune.add(symbol);
      // Aura ring
      const aura = new THREE.Mesh(new THREE.TorusGeometry(runeSize * 0.8, 0.01, 17, 36), runeMat);
      rune.add(aura);
      rune.position.set((Math.random() - 0.5) * w * 0.8, 1 + Math.random() * 8, (Math.random() - 0.5) * d * 0.8);
      rune.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
      mctx.scene.add(rune);
    }

    // ── Primordial ooze pools ──
    const oozeMat = new THREE.MeshStandardMaterial({ color: 0x112211, emissive: 0x0a1a0a, emissiveIntensity: 0.3, roughness: 0.1, transparent: true, opacity: 0.8 });
    for (let i = 0; i < 8; i++) {
      const ooze = new THREE.Group();
      const oR = 1 + Math.random() * 2.5;
      const surface = new THREE.Mesh(new THREE.CircleGeometry(oR, 16), oozeMat);
      surface.rotation.x = -Math.PI / 2; surface.position.y = 0.02; ooze.add(surface);
      // Bubbles
      for (let b = 0; b < 4; b++) {
        const bubble = new THREE.Mesh(new THREE.SphereGeometry(0.05 + Math.random() * 0.05, 20, 17), new THREE.MeshStandardMaterial({ color: 0x224422, transparent: true, opacity: 0.4 }));
        bubble.position.set((Math.random() - 0.5) * oR, 0.04 + Math.random() * 0.08, (Math.random() - 0.5) * oR);
        ooze.add(bubble);
      }
      const ox = (Math.random() - 0.5) * w * 0.7; const oz = (Math.random() - 0.5) * d * 0.7;
      ooze.position.set(ox, getTerrainHeight(ox, oz, 0.5), oz); mctx.scene.add(ooze);
    }

    // ── Petrified titan bones ──
    for (let i = 0; i < 6; i++) {
      const bone = new THREE.Group();
      // Giant femur
      const boneLen = 4 + Math.random() * 6;
      const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.4, boneLen, 12), boneMat);
      shaft.rotation.z = Math.PI / 2 + (Math.random() - 0.5) * 0.3;
      shaft.position.y = 0.5; bone.add(shaft);
      // Knobs on ends
      for (const ex of [-boneLen / 2, boneLen / 2]) {
        const knob = new THREE.Mesh(new THREE.SphereGeometry(0.5, 14, 10), boneMat);
        knob.position.set(ex, 0.5, 0); bone.add(knob);
      }
      const bnx = (Math.random() - 0.5) * w * 0.7; const bnz = (Math.random() - 0.5) * d * 0.7;
      bone.position.set(bnx, getTerrainHeight(bnx, bnz, 0.5), bnz);
      bone.rotation.y = Math.random() * Math.PI; mctx.scene.add(bone);
    }

    // ── Dimensional rifts ──
    for (let i = 0; i < 5; i++) {
      const rift = new THREE.Group();
      const riftR = 1.5 + Math.random() * 2;
      // Outer ring (unstable)
      const ring = new THREE.Mesh(new THREE.TorusGeometry(riftR, 0.1, 23, 46), conduitMat);
      rift.add(ring);
      // Inner void
      const inner = new THREE.Mesh(new THREE.CircleGeometry(riftR * 0.8, 16), new THREE.MeshStandardMaterial({ color: 0x000005, emissive: 0x110022, emissiveIntensity: 0.3, transparent: true, opacity: 0.9 }));
      rift.add(inner);
      // Energy arcs
      for (let a = 0; a < 6; a++) {
        const arcAngle = (a / 6) * Math.PI * 2;
        const arc = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, riftR * 0.6, 16), conduitMat);
        arc.position.set(Math.cos(arcAngle) * riftR * 0.4, Math.sin(arcAngle) * riftR * 0.4, 0.05);
        arc.rotation.z = arcAngle + Math.PI / 2; rift.add(arc);
      }
      const rLight = new THREE.PointLight(0x6633ff, 1.2, 10);
      rift.add(rLight); mctx.torchLights.push(rLight);
      rift.position.set((Math.random() - 0.5) * w * 0.5, 3 + Math.random() * 5, (Math.random() - 0.5) * d * 0.5);
      rift.rotation.set(Math.random() * 0.5, Math.random() * Math.PI, Math.random() * 0.5);
      mctx.scene.add(rift);
    }

    // ── Eldritch symbols on ground ──
    const eldritchMat = new THREE.MeshStandardMaterial({ color: 0x8855ff, emissive: 0x6633cc, emissiveIntensity: 0.7, transparent: true, opacity: 0.5, side: THREE.DoubleSide, depthWrite: false });
    for (let i = 0; i < 10; i++) {
      const symGrp = new THREE.Group();
      const symR = 1.5 + Math.random() * 2;
      // Outer circle
      const circle = new THREE.Mesh(new THREE.TorusGeometry(symR, 0.03, 17, 46), eldritchMat);
      circle.rotation.x = Math.PI / 2; symGrp.add(circle);
      // Inner circle
      const inner = new THREE.Mesh(new THREE.TorusGeometry(symR * 0.6, 0.02, 17, 44), eldritchMat);
      inner.rotation.x = Math.PI / 2; symGrp.add(inner);
      // Connecting lines (pentagram-like)
      for (let l = 0; l < 5; l++) {
        const la = (l / 5) * Math.PI * 2;
        const la2 = ((l + 2) / 5) * Math.PI * 2;
        const lineLen = Math.sqrt(Math.pow(Math.cos(la) - Math.cos(la2), 2) + Math.pow(Math.sin(la) - Math.sin(la2), 2)) * symR;
        const line = new THREE.Mesh(new THREE.BoxGeometry(lineLen, 0.02, 0.02), eldritchMat);
        line.position.set((Math.cos(la) + Math.cos(la2)) * symR * 0.5, 0.01, (Math.sin(la) + Math.sin(la2)) * symR * 0.5);
        line.rotation.y = -Math.atan2(Math.cos(la) - Math.cos(la2), Math.sin(la) - Math.sin(la2));
        symGrp.add(line);
      }
      const sx = (Math.random() - 0.5) * w * 0.7; const sz = (Math.random() - 0.5) * d * 0.7;
      symGrp.position.set(sx, getTerrainHeight(sx, sz, 0.5) + 0.03, sz); mctx.scene.add(symGrp);
    }

    // ── Ancient fossil details embedded in walls (spiral curve approximations) ──
    for (let i = 0; i < 10; i++) {
      const fossil = new THREE.Group();
      const fossilMat = new THREE.MeshStandardMaterial({ color: 0x998877, roughness: 0.7, metalness: 0.1 });
      // Spiral shell (approximated with torus segments)
      const spiralTurns = 3 + Math.floor(Math.random() * 2);
      for (let s = 0; s < spiralTurns * 8; s++) {
        const t = s / (spiralTurns * 8);
        const sAngle = t * spiralTurns * Math.PI * 2;
        const sR = 0.05 + t * 0.3;
        const dot = new THREE.Mesh(new THREE.SphereGeometry(0.01 + t * 0.015, 6, 6), fossilMat);
        dot.position.set(Math.cos(sAngle) * sR, Math.sin(sAngle) * sR, 0);
        fossil.add(dot);
      }
      // Connecting ribs (radial lines)
      for (let r = 0; r < 6; r++) {
        const rAngle = (r / 6) * Math.PI * 2;
        const ribLen = 0.15 + Math.random() * 0.1;
        const rib = new THREE.Mesh(new THREE.CylinderGeometry(0.003, 0.005, ribLen, 4), fossilMat);
        rib.position.set(Math.cos(rAngle) * 0.15, Math.sin(rAngle) * 0.15, 0);
        rib.rotation.z = rAngle + Math.PI / 2; fossil.add(rib);
      }
      // Background stone plate
      const plate = new THREE.Mesh(new THREE.CircleGeometry(0.4, 16), new THREE.MeshStandardMaterial({ color: 0x555566, roughness: 0.8 }));
      plate.position.z = -0.01; fossil.add(plate);
      fossil.position.set((Math.random() - 0.5) * w * 0.7, 1 + Math.random() * 4, (Math.random() - 0.5) * d * 0.7);
      fossil.rotation.set(Math.random() * 0.3, Math.random() * Math.PI, Math.random() * 0.3); mctx.scene.add(fossil);
    }

    // ── Primordial ooze pools (enhanced with translucent surfaces and bubbles) ──
    const enhancedOozeMat = new THREE.MeshStandardMaterial({ color: 0x113311, emissive: 0x0a1a0a, emissiveIntensity: 0.4, roughness: 0.08, transparent: true, opacity: 0.75 });
    for (let i = 0; i < 10; i++) {
      const oozePool = new THREE.Group();
      const opR = 1.5 + Math.random() * 2.5;
      const opSurf = new THREE.Mesh(new THREE.CircleGeometry(opR, 16), enhancedOozeMat);
      opSurf.rotation.x = -Math.PI / 2; opSurf.position.y = 0.02; oozePool.add(opSurf);
      // Bubble spheres
      for (let b = 0; b < 6 + Math.floor(Math.random() * 4); b++) {
        const bR = 0.03 + Math.random() * 0.06;
        const bubble = new THREE.Mesh(new THREE.SphereGeometry(bR, 12, 10), new THREE.MeshStandardMaterial({ color: 0x336633, transparent: true, opacity: 0.3, roughness: 0.1 }));
        const bDist = Math.random() * opR * 0.8;
        const bAngle = Math.random() * Math.PI * 2;
        bubble.position.set(Math.cos(bAngle) * bDist, 0.03 + Math.random() * 0.06, Math.sin(bAngle) * bDist);
        oozePool.add(bubble);
      }
      // Ripple rings
      for (let r = 0; r < 2; r++) {
        const ripR = opR * (0.3 + r * 0.25);
        const ripple = new THREE.Mesh(new THREE.TorusGeometry(ripR, 0.008, 6, 28), new THREE.MeshStandardMaterial({ color: 0x224422, transparent: true, opacity: 0.25 }));
        ripple.rotation.x = Math.PI / 2; ripple.position.y = 0.025; oozePool.add(ripple);
      }
      const oLight = new THREE.PointLight(0x225522, 0.3, 4);
      oLight.position.y = 0.5; oozePool.add(oLight); mctx.torchLights.push(oLight);
      const opx = (Math.random() - 0.5) * w * 0.7; const opz = (Math.random() - 0.5) * d * 0.7;
      oozePool.position.set(opx, getTerrainHeight(opx, opz, 0.5), opz); mctx.scene.add(oozePool);
    }

    // ── Tentacle props (tapered curved cylinder chains) ──
    for (let i = 0; i < 10; i++) {
      const tentProp = new THREE.Group();
      const tSegs = 7 + Math.floor(Math.random() * 5);
      let tpy = 0; let tpx2 = 0; let tpz2 = 0;
      const tCurveX = (Math.random() - 0.5) * 0.4; const tCurveZ = (Math.random() - 0.5) * 0.4;
      for (let s = 0; s < tSegs; s++) {
        const t = s / tSegs;
        const segH = 0.4 + Math.random() * 0.5;
        const topR = Math.max(0.015, 0.15 * (1 - t * 0.8));
        const botR = Math.max(0.02, 0.18 * (1 - t * 0.8));
        const seg = new THREE.Mesh(new THREE.CylinderGeometry(topR, botR, segH, 12), tentacleMat);
        tpx2 += tCurveX * (0.1 + Math.random() * 0.1); tpz2 += tCurveZ * (0.1 + Math.random() * 0.1);
        seg.position.set(tpx2, tpy + segH / 2, tpz2);
        seg.rotation.x = tCurveZ * t * 1.5; seg.rotation.z = -tCurveX * t * 1.5;
        tentProp.add(seg); tpy += segH * 0.7;
        // Suction cups
        if (Math.random() > 0.5) {
          const sucker = new THREE.Mesh(new THREE.CircleGeometry(botR * 0.5, 12), new THREE.MeshStandardMaterial({ color: 0x2a1a2a, roughness: 0.5, side: THREE.DoubleSide }));
          sucker.position.set(tpx2 + botR * 1.1, tpy - segH * 0.3, tpz2);
          sucker.rotation.y = Math.PI / 2; tentProp.add(sucker);
        }
      }
      // Tip (slightly glowing)
      const tentTip = new THREE.Mesh(new THREE.SphereGeometry(0.02, 10, 8), new THREE.MeshStandardMaterial({ color: 0x336633, emissive: 0x224422, emissiveIntensity: 0.5 }));
      tentTip.position.set(tpx2, tpy, tpz2); tentProp.add(tentTip);
      const ttx2 = (Math.random() - 0.5) * w * 0.75; const ttz2 = (Math.random() - 0.5) * d * 0.75;
      tentProp.position.set(ttx2, getTerrainHeight(ttx2, ttz2, 0.5), ttz2); mctx.scene.add(tentProp);
    }

    // ── Eldritch eye motifs on surfaces (concentric circles with iris detail) ──
    for (let i = 0; i < 12; i++) {
      const eyeMotif = new THREE.Group();
      const emR = 0.5 + Math.random() * 0.8;
      const eyeMotifMat = new THREE.MeshStandardMaterial({ color: 0x1a1a2a, roughness: 0.6 });
      // Outer eyelid shape (torus)
      const lid = new THREE.Mesh(new THREE.TorusGeometry(emR, emR * 0.12, 12, 32), eyeMotifMat);
      eyeMotif.add(lid);
      // Iris (colored circle)
      const irisMat = new THREE.MeshStandardMaterial({ color: 0xaa4400, emissive: 0x882200, emissiveIntensity: 0.5 });
      const irisDisc = new THREE.Mesh(new THREE.CircleGeometry(emR * 0.6, 28), irisMat);
      eyeMotif.add(irisDisc);
      // Iris ring detail
      const irisRing = new THREE.Mesh(new THREE.TorusGeometry(emR * 0.45, 0.01, 8, 28), new THREE.MeshStandardMaterial({ color: 0xcc6600, emissive: 0x884400, emissiveIntensity: 0.4 }));
      irisRing.position.z = 0.005; eyeMotif.add(irisRing);
      // Pupil (dark center)
      const pupilDisc = new THREE.Mesh(new THREE.CircleGeometry(emR * 0.25, 24), new THREE.MeshStandardMaterial({ color: 0x000000 }));
      pupilDisc.position.z = 0.01; eyeMotif.add(pupilDisc);
      // Pupil highlight
      const highlight = new THREE.Mesh(new THREE.SphereGeometry(emR * 0.06, 10, 8), new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 0.8 }));
      highlight.position.set(emR * 0.08, emR * 0.06, 0.015); eyeMotif.add(highlight);
      // Veins radiating from iris
      for (let v = 0; v < 6; v++) {
        const va = Math.random() * Math.PI * 2;
        const vein = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.005, emR * 0.35, 4), new THREE.MeshStandardMaterial({ color: 0xcc2200, roughness: 0.5 }));
        vein.position.set(Math.cos(va) * emR * 0.55, Math.sin(va) * emR * 0.55, 0.005);
        vein.rotation.z = va + Math.PI / 2; eyeMotif.add(vein);
      }
      eyeMotif.position.set((Math.random() - 0.5) * w * 0.65, 1.5 + Math.random() * 5, (Math.random() - 0.5) * d * 0.65);
      eyeMotif.rotation.set((Math.random() - 0.5) * 0.4, Math.random() * Math.PI, 0); mctx.scene.add(eyeMotif);
    }
}

