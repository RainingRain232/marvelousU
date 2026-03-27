import * as THREE from 'three';
import { getTerrainHeight } from './DiabloRenderer';
import { VendorType } from './DiabloTypes';
import { VENDOR_DEFS } from './DiabloConfig';
import { MapBuildContext } from './DiabloRendererMaps';

export function buildChronoLabyrinth(mctx: MapBuildContext, w: number, d: number): void {
    mctx.scene.fog = new THREE.FogExp2(0x223355, 0.022);
    mctx.applyTerrainColors(0x1a2a44, 0x2a3a55, 0.5);
    mctx.dirLight.color.setHex(0x88aaff);
    mctx.dirLight.intensity = 0.7;
    mctx.ambientLight.color.setHex(0x112244);
    mctx.ambientLight.intensity = 0.4;
    mctx.hemiLight.color.setHex(0x556699);
    mctx.hemiLight.groundColor.setHex(0x111133);

    const clockMat = new THREE.MeshStandardMaterial({ color: 0xccaa44, metalness: 0.6, roughness: 0.3 });
    const wallMat = new THREE.MeshStandardMaterial({ color: 0x4455aa, roughness: 0.6 });
    const timeMat = new THREE.MeshStandardMaterial({ color: 0x66ccff, emissive: 0x4488ff, emissiveIntensity: 1.0, transparent: true, opacity: 0.5 });
    const ghostWallMat = new THREE.MeshStandardMaterial({ color: 0x5566aa, roughness: 0.5, transparent: true, opacity: 0.4 });
    const mirrorMat = new THREE.MeshStandardMaterial({ color: 0xaabbcc, metalness: 0.8, roughness: 0.1 });
    const handMat = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.5 });
    const sandMat = new THREE.MeshStandardMaterial({ color: 0xddcc88, roughness: 0.6 });
    const frozenMat = new THREE.MeshStandardMaterial({ color: 0x88aacc, transparent: true, opacity: 0.5, emissive: 0x446688, emissiveIntensity: 0.3 });

    // Maze walls (some solid, some partially transparent - time-distorted)
    for (let i = 0; i < 35; i++) {
      const isGhost = Math.random() > 0.6;
      const wall = new THREE.Mesh(new THREE.BoxGeometry(0.4, 2 + Math.random() * 2, 3 + Math.random() * 5), isGhost ? ghostWallMat : wallMat);
      const wx = (Math.random() - 0.5) * w * 0.8, wz = (Math.random() - 0.5) * d * 0.8;
      wall.position.set(wx, getTerrainHeight(wx, wz, 0.5) + wall.geometry.parameters.height / 2, wz);
      wall.rotation.y = Math.random() * Math.PI; wall.castShadow = !isGhost; mctx.scene.add(wall);
      // Clock gear embedded in some walls
      if (Math.random() > 0.6) {
        const embeddedGear = new THREE.Mesh(new THREE.TorusGeometry(0.4 + Math.random() * 0.3, 0.05, 4, [6, 8, 10][Math.floor(Math.random() * 3)]), clockMat);
        embeddedGear.position.set(wx, getTerrainHeight(wx, wz, 0.5) + 1 + Math.random() * 2, wz + 0.21);
        embeddedGear.rotation.y = wall.rotation.y; mctx.scene.add(embeddedGear);
      }
    }

    // Clock faces on walls (more detailed with numerals)
    for (let i = 0; i < 12; i++) {
      const clock = new THREE.Group();
      const face = new THREE.Mesh(new THREE.CircleGeometry(0.6, 44), new THREE.MeshStandardMaterial({ color: 0xeeddcc }));
      clock.add(face);
      const rim = new THREE.Mesh(new THREE.TorusGeometry(0.6, 0.05, 17, 46), clockMat); clock.add(rim);
      // Hour markers
      for (let h = 0; h < 12; h++) {
        const marker = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.08, 0.01), handMat);
        const mAngle = (h / 12) * Math.PI * 2;
        marker.position.set(Math.sin(mAngle) * 0.48, Math.cos(mAngle) * 0.48, 0.01);
        marker.rotation.z = -mAngle; clock.add(marker);
      }
      // Hands
      const hour = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.3, 0.02), handMat);
      hour.position.y = 0.15; hour.rotation.z = Math.random() * Math.PI * 2; clock.add(hour);
      const minute = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.4, 0.02), handMat);
      minute.position.y = 0.2; minute.rotation.z = Math.random() * Math.PI * 2; clock.add(minute);
      // Center pin
      const pin = new THREE.Mesh(new THREE.SphereGeometry(0.03, 17, 16), clockMat);
      pin.position.z = 0.02; clock.add(pin);
      clock.position.set((Math.random() - 0.5) * w * 0.6, 1.5 + Math.random() * 2, (Math.random() - 0.5) * d * 0.6);
      clock.rotation.y = Math.random() * Math.PI; mctx.scene.add(clock);
    }

    // Temporal rifts (glowing portal rings with inner glow)
    for (let i = 0; i < 10; i++) {
      const rift = new THREE.Group();
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.8 + Math.random() * 0.5, 0.05, 23, 46), timeMat);
      rift.add(ring);
      // Inner portal glow
      const inner = new THREE.Mesh(new THREE.CircleGeometry(0.7 + Math.random() * 0.4, 36),
        new THREE.MeshStandardMaterial({ color: 0x4488ff, emissive: 0x2266dd, emissiveIntensity: 1.5, transparent: true, opacity: 0.2 }));
      rift.add(inner);
      rift.position.set((Math.random() - 0.5) * w * 0.6, 1 + Math.random() * 3, (Math.random() - 0.5) * d * 0.6);
      rift.rotation.set(Math.random() * 0.5, Math.random(), Math.random() * 0.5); mctx.scene.add(rift);
      const tLight = new THREE.PointLight(0x4488ff, 0.5, 8);
      tLight.position.copy(rift.position); mctx.scene.add(tLight); mctx.torchLights.push(tLight);
    }

    // Floating gears (more varied sizes)
    for (let i = 0; i < 20; i++) {
      const gear = new THREE.Mesh(new THREE.TorusGeometry(0.2 + Math.random() * 0.6, 0.04 + Math.random() * 0.04, 4, [6, 8, 10, 12][i % 4]), clockMat);
      gear.position.set((Math.random() - 0.5) * w * 0.7, 0.5 + Math.random() * 5, (Math.random() - 0.5) * d * 0.7);
      gear.rotation.set(Math.random(), Math.random(), Math.random()); mctx.scene.add(gear);
    }

    // Hourglasses (more detailed with sand)
    for (let i = 0; i < 8; i++) {
      const hg = new THREE.Group();
      // Frame
      const frameTop = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.04, 23), clockMat);
      frameTop.position.y = 0.8; hg.add(frameTop);
      const frameBot = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.04, 23), clockMat);
      frameBot.position.y = -0.4; hg.add(frameBot);
      // Posts
      for (let p = 0; p < 3; p++) {
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 1.2, 16), clockMat);
        const pAngle = (p / 3) * Math.PI * 2;
        post.position.set(Math.sin(pAngle) * 0.3, 0.2, Math.cos(pAngle) * 0.3); hg.add(post);
      }
      // Glass bulbs
      const topBulb = new THREE.Mesh(new THREE.SphereGeometry(0.25, 23, 20), new THREE.MeshStandardMaterial({ color: 0xddddcc, transparent: true, opacity: 0.4 }));
      topBulb.scale.y = 1.3; topBulb.position.y = 0.5; hg.add(topBulb);
      const botBulb = new THREE.Mesh(new THREE.SphereGeometry(0.25, 23, 20), new THREE.MeshStandardMaterial({ color: 0xddddcc, transparent: true, opacity: 0.4 }));
      botBulb.scale.y = 1.3; botBulb.position.y = -0.1; hg.add(botBulb);
      // Sand inside
      const sand = new THREE.Mesh(new THREE.ConeGeometry(0.15, 0.2, 23), sandMat);
      sand.position.y = -0.25; hg.add(sand);
      const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.15, 17), clockMat);
      neck.position.y = 0.2; hg.add(neck);
      const hx = (Math.random() - 0.5) * w * 0.5, hz = (Math.random() - 0.5) * d * 0.5;
      hg.position.set(hx, getTerrainHeight(hx, hz, 0.5) + 1.5, hz); mctx.scene.add(hg);
    }

    // Frozen-in-time objects (semi-transparent items suspended)
    for (let i = 0; i < 8; i++) {
      const frozen = new THREE.Group();
      // Frozen aura
      const aura = new THREE.Mesh(new THREE.SphereGeometry(0.4, 23, 20), frozenMat);
      frozen.add(aura);
      // Object inside (random shape)
      const shapes = [
        new THREE.BoxGeometry(0.2, 0.2, 0.2),
        new THREE.SphereGeometry(0.12, 20, 17),
        new THREE.CylinderGeometry(0.05, 0.05, 0.3, 17),
      ];
      const inner = new THREE.Mesh(shapes[i % 3], new THREE.MeshStandardMaterial({ color: 0x887766 }));
      frozen.add(inner);
      frozen.position.set((Math.random() - 0.5) * w * 0.5, 1 + Math.random() * 3, (Math.random() - 0.5) * d * 0.5);
      mctx.scene.add(frozen);
    }

    // Paradox mirrors (reflective vertical surfaces)
    for (let i = 0; i < 6; i++) {
      const mirror = new THREE.Group();
      const frame = new THREE.Mesh(new THREE.BoxGeometry(1.2, 2, 0.1), clockMat);
      mirror.add(frame);
      const glass = new THREE.Mesh(new THREE.BoxGeometry(1.0, 1.8, 0.02), mirrorMat);
      glass.position.z = 0.05; mirror.add(glass);
      // Ornate top
      const ornate = new THREE.Mesh(new THREE.SphereGeometry(0.15, 23, 17), clockMat);
      ornate.position.y = 1.1; mirror.add(ornate);
      const mrx = (Math.random() - 0.5) * w * 0.5, mrz = (Math.random() - 0.5) * d * 0.5;
      mirror.position.set(mrx, getTerrainHeight(mrx, mrz, 0.5) + 1.2, mrz);
      mirror.rotation.y = Math.random() * Math.PI; mctx.scene.add(mirror);
    }

    // Time-stream effects (flowing light ribbons)
    for (let i = 0; i < 8; i++) {
      const stream = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.02, 5 + Math.random() * 5), timeMat);
      stream.position.set((Math.random() - 0.5) * w * 0.6, 1 + Math.random() * 4, (Math.random() - 0.5) * d * 0.6);
      stream.rotation.set(Math.random() * 0.3, Math.random() * Math.PI, Math.random() * 0.3);
      mctx.scene.add(stream);
    }

    // Pendulum elements (hanging from ceiling)
    for (let i = 0; i < 5; i++) {
      const pend = new THREE.Group();
      const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 2 + Math.random(), 16), clockMat);
      pend.add(rod);
      const bob = new THREE.Mesh(new THREE.SphereGeometry(0.12, 31, 20), clockMat);
      bob.position.y = -1.2; pend.add(bob);
      pend.position.set((Math.random() - 0.5) * w * 0.4, 4 + Math.random(), (Math.random() - 0.5) * d * 0.4);
      pend.rotation.z = (Math.random() - 0.5) * 0.4; mctx.scene.add(pend);
    }

    // Floor clock tile pattern
    for (let i = 0; i < 15; i++) {
      const tile = new THREE.Mesh(new THREE.CircleGeometry(0.8 + Math.random() * 0.5, 36), new THREE.MeshStandardMaterial({ color: 0x334466, roughness: 0.6 }));
      tile.rotation.x = -Math.PI / 2;
      const tlx = (Math.random() - 0.5) * w * 0.5, tlz = (Math.random() - 0.5) * d * 0.5;
      tile.position.set(tlx, getTerrainHeight(tlx, tlz, 0.5) + 0.02, tlz); mctx.scene.add(tile);
    }
    // ── Clock face wall decorations ──
    for (let i = 0; i < 8; i++) {
      const wallClock = new THREE.Group();
      const backing = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.8, 0.05), wallMat);
      wallClock.add(backing);
      const face = new THREE.Mesh(new THREE.CircleGeometry(0.35, 30), new THREE.MeshStandardMaterial({ color: 0xeeddcc }));
      face.position.z = 0.03; wallClock.add(face);
      const rim = new THREE.Mesh(new THREE.TorusGeometry(0.35, 0.03, 16, 30), clockMat);
      rim.position.z = 0.03; wallClock.add(rim);
      for (let h = 0; h < 12; h++) {
        const dot = new THREE.Mesh(new THREE.SphereGeometry(0.012, 16, 8), handMat);
        const da = (h / 12) * Math.PI * 2;
        dot.position.set(Math.sin(da) * 0.28, Math.cos(da) * 0.28, 0.04); wallClock.add(dot);
      }
      const wcx = (Math.random()-0.5)*w*0.6, wcz = (Math.random()-0.5)*d*0.6;
      wallClock.position.set(wcx, getTerrainHeight(wcx, wcz, 0.5) + 2 + Math.random(), wcz);
      wallClock.rotation.y = Math.random() * Math.PI; mctx.scene.add(wallClock);
    }
    // ── Hourglass props (smaller, on surfaces) ──
    for (let i = 0; i < 6; i++) {
      const smallHg = new THREE.Group();
      const topBulb = new THREE.Mesh(new THREE.SphereGeometry(0.06, 16, 16), new THREE.MeshStandardMaterial({ color: 0xddddcc, transparent: true, opacity: 0.4 }));
      topBulb.scale.y = 1.3; topBulb.position.y = 0.1; smallHg.add(topBulb);
      const botBulb = new THREE.Mesh(new THREE.SphereGeometry(0.06, 16, 16), new THREE.MeshStandardMaterial({ color: 0xddddcc, transparent: true, opacity: 0.4 }));
      botBulb.scale.y = 1.3; botBulb.position.y = -0.06; smallHg.add(botBulb);
      const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.05, 16), clockMat);
      neck.position.y = 0.02; smallHg.add(neck);
      const sand = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.06, 16), sandMat);
      sand.position.y = -0.08; smallHg.add(sand);
      const shx = (Math.random()-0.5)*w*0.5, shz = (Math.random()-0.5)*d*0.5;
      smallHg.position.set(shx, getTerrainHeight(shx, shz, 0.5) + 0.8 + Math.random(), shz); mctx.scene.add(smallHg);
    }
    // ── Time-frozen debris (mid-air floating pieces) ──
    for (let i = 0; i < 10; i++) {
      const debris = new THREE.Group();
      const aura = new THREE.Mesh(new THREE.SphereGeometry(0.2, 16, 16), frozenMat);
      debris.add(aura);
      const piece = new THREE.Mesh(new THREE.DodecahedronGeometry(0.08 + Math.random() * 0.06, 1), new THREE.MeshStandardMaterial({ color: 0x887766, roughness: 0.7 }));
      debris.add(piece);
      debris.position.set((Math.random()-0.5)*w*0.5, 1 + Math.random() * 4, (Math.random()-0.5)*d*0.5);
      mctx.scene.add(debris);
    }
    // ── Pendulum mechanisms (wall-mounted) ──
    for (let i = 0; i < 4; i++) {
      const mech = new THREE.Group();
      const plate = new THREE.Mesh(new THREE.CircleGeometry(0.4, 20), clockMat);
      mech.add(plate);
      for (let g = 0; g < 3; g++) {
        const gear = new THREE.Mesh(new THREE.TorusGeometry(0.08 + g * 0.05, 0.015, 4, [6, 8, 10][g]), clockMat);
        gear.position.set((Math.random()-0.5)*0.2, (Math.random()-0.5)*0.2, 0.02);
        gear.rotation.z = Math.random(); mech.add(gear);
      }
      const pendRod = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.6, 16), handMat);
      pendRod.position.y = -0.35; mech.add(pendRod);
      const pendBob = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.02, 20), clockMat);
      pendBob.position.y = -0.65; mech.add(pendBob);
      const mex = (Math.random()-0.5)*w*0.5, mez = (Math.random()-0.5)*d*0.5;
      mech.position.set(mex, getTerrainHeight(mex, mez, 0.5) + 2 + Math.random(), mez);
      mech.rotation.y = Math.random() * Math.PI; mctx.scene.add(mech);
    }
    // ── Temporal rift portals ──
    for (let i = 0; i < 4; i++) {
      const tPortal = new THREE.Group();
      const outer = new THREE.Mesh(new THREE.TorusGeometry(0.6, 0.04, 16, 30), timeMat);
      tPortal.add(outer);
      const inner = new THREE.Mesh(new THREE.CircleGeometry(0.55, 30), new THREE.MeshStandardMaterial({ color: 0x224488, emissive: 0x112266, emissiveIntensity: 1.0, transparent: true, opacity: 0.15 }));
      tPortal.add(inner);
      const clockOverlay = new THREE.Mesh(new THREE.TorusGeometry(0.4, 0.01, 16, 12), clockMat);
      tPortal.add(clockOverlay);
      tPortal.position.set((Math.random()-0.5)*w*0.5, 1.5 + Math.random() * 2, (Math.random()-0.5)*d*0.5);
      tPortal.rotation.set(Math.random()*0.3, Math.random(), Math.random()*0.3); mctx.scene.add(tPortal);
    }
    // ── Giant clock mechanisms (large gear rings with teeth) ──
    for (let i = 0; i < 4; i++) {
      const gcMech = new THREE.Group();
      const gcR = 1.0 + Math.random() * 0.5;
      // Large torus gear ring
      const gcRing = new THREE.Mesh(new THREE.TorusGeometry(gcR, 0.08, 16, 36), clockMat);
      gcMech.add(gcRing);
      // Box teeth around edge
      for (let t = 0; t < 16; t++) {
        const tA = (t / 16) * Math.PI * 2;
        const gcTooth = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.15, 0.08), clockMat);
        gcTooth.position.set(Math.cos(tA) * (gcR + 0.1), Math.sin(tA) * (gcR + 0.1), 0);
        gcTooth.rotation.z = tA; gcMech.add(gcTooth);
      }
      // Rotating shaft cylinder through center
      const gcShaft = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.4, 16), handMat);
      gcShaft.rotation.x = Math.PI / 2; gcMech.add(gcShaft);
      // Wall frame (box supports)
      const gcFrame1 = new THREE.Mesh(new THREE.BoxGeometry(0.1, gcR * 2.5, 0.1), wallMat);
      gcFrame1.position.x = -gcR - 0.3; gcMech.add(gcFrame1);
      const gcFrame2 = new THREE.Mesh(new THREE.BoxGeometry(0.1, gcR * 2.5, 0.1), wallMat);
      gcFrame2.position.x = gcR + 0.3; gcMech.add(gcFrame2);
      const gcx = (Math.random() - 0.5) * w * 0.5, gcz = (Math.random() - 0.5) * d * 0.5;
      gcMech.position.set(gcx, getTerrainHeight(gcx, gcz, 0.5) + 2 + Math.random() * 2, gcz);
      gcMech.rotation.y = Math.random() * Math.PI; mctx.scene.add(gcMech);
    }
    // ── Hourglass monuments (two cones connected by thin neck) ──
    for (let i = 0; i < 6; i++) {
      const hgMon = new THREE.Group();
      const hgPed = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.2, 0.6), wallMat);
      hgMon.add(hgPed);
      // Top inverted cone
      const hgTopCone = new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.7, 20),
        new THREE.MeshStandardMaterial({ color: 0xddddcc, transparent: true, opacity: 0.45 }));
      hgTopCone.position.y = 0.95; hgTopCone.rotation.x = Math.PI; hgMon.add(hgTopCone);
      // Bottom normal cone
      const hgBotCone = new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.7, 20),
        new THREE.MeshStandardMaterial({ color: 0xddddcc, transparent: true, opacity: 0.45 }));
      hgBotCone.position.y = 0.45; hgMon.add(hgBotCone);
      // Thin cylinder neck
      const hgNeck = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.12, 12), clockMat);
      hgNeck.position.y = 0.7; hgMon.add(hgNeck);
      // Sand particles (tiny sphere cluster in bottom cone area)
      for (let sp = 0; sp < 8; sp++) {
        const hgSand = new THREE.Mesh(new THREE.SphereGeometry(0.015, 8, 6), sandMat);
        hgSand.position.set((Math.random() - 0.5) * 0.15, 0.2 + Math.random() * 0.2, (Math.random() - 0.5) * 0.15);
        hgMon.add(hgSand);
      }
      const hmx = (Math.random() - 0.5) * w * 0.5, hmz = (Math.random() - 0.5) * d * 0.5;
      hgMon.position.set(hmx, getTerrainHeight(hmx, hmz, 0.5), hmz); mctx.scene.add(hgMon);
    }
    // ── Time-frozen debris zones (objects suspended mid-air) ──
    for (let i = 0; i < 8; i++) {
      const tfZone = new THREE.Group();
      // Translucent blue time-freeze sphere
      const tfAura = new THREE.Mesh(new THREE.SphereGeometry(0.8 + Math.random() * 0.4, 20, 16), frozenMat);
      tfZone.add(tfAura);
      // Box fragments
      for (let b = 0; b < 3; b++) {
        const tfBox = new THREE.Mesh(new THREE.BoxGeometry(0.1 + Math.random() * 0.1, 0.08, 0.12),
          new THREE.MeshStandardMaterial({ color: 0x887766, roughness: 0.7 }));
        tfBox.position.set((Math.random() - 0.5) * 0.5, (Math.random() - 0.5) * 0.5, (Math.random() - 0.5) * 0.5);
        tfBox.rotation.set(Math.random(), Math.random(), Math.random()); tfZone.add(tfBox);
      }
      // Sphere particles
      for (let sp = 0; sp < 3; sp++) {
        const tfSph = new THREE.Mesh(new THREE.SphereGeometry(0.03 + Math.random() * 0.03, 12, 8),
          new THREE.MeshStandardMaterial({ color: 0x998877 }));
        tfSph.position.set((Math.random() - 0.5) * 0.5, (Math.random() - 0.5) * 0.5, (Math.random() - 0.5) * 0.5);
        tfZone.add(tfSph);
      }
      // Cylinder shards
      for (let cs = 0; cs < 2; cs++) {
        const tfCyl = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.03, 0.15, 8),
          new THREE.MeshStandardMaterial({ color: 0x887766, roughness: 0.7 }));
        tfCyl.position.set((Math.random() - 0.5) * 0.5, (Math.random() - 0.5) * 0.5, (Math.random() - 0.5) * 0.5);
        tfCyl.rotation.set(Math.random(), Math.random(), Math.random()); tfZone.add(tfCyl);
      }
      tfZone.position.set((Math.random() - 0.5) * w * 0.5, 1.5 + Math.random() * 3, (Math.random() - 0.5) * d * 0.5);
      mctx.scene.add(tfZone);
    }
    // ── Pendulum mechanisms (tall frames with hanging weight) ──
    for (let i = 0; i < 5; i++) {
      const pmFrm = new THREE.Group();
      // Two box pillars
      const pmP1 = new THREE.Mesh(new THREE.BoxGeometry(0.12, 3.5, 0.12), wallMat);
      pmP1.position.set(-0.5, 1.75, 0); pmFrm.add(pmP1);
      const pmP2 = new THREE.Mesh(new THREE.BoxGeometry(0.12, 3.5, 0.12), wallMat);
      pmP2.position.set(0.5, 1.75, 0); pmFrm.add(pmP2);
      // Box crossbar
      const pmBar = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.1, 0.12), wallMat);
      pmBar.position.y = 3.5; pmFrm.add(pmBar);
      // Thin cylinder rod hanging down
      const pmRod = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 2.5, 12), clockMat);
      pmRod.position.y = 2.2; pmFrm.add(pmRod);
      // Large sphere weight at bottom
      const pmBob = new THREE.Mesh(new THREE.SphereGeometry(0.15, 20, 16), clockMat);
      pmBob.position.y = 0.9; pmFrm.add(pmBob);
      const pmx = (Math.random() - 0.5) * w * 0.4, pmz = (Math.random() - 0.5) * d * 0.4;
      pmFrm.position.set(pmx, getTerrainHeight(pmx, pmz, 0.5), pmz);
      pmFrm.rotation.y = Math.random() * Math.PI; mctx.scene.add(pmFrm);
    }
    // ── Temporal rift portals (large upright rings with swirling fill) ──
    for (let i = 0; i < 6; i++) {
      const trPtl = new THREE.Group();
      const trRing = new THREE.Mesh(new THREE.TorusGeometry(1.0 + Math.random() * 0.4, 0.06, 20, 40), timeMat);
      trPtl.add(trRing);
      // Swirling translucent colored fill
      const trFill = new THREE.Mesh(new THREE.CircleGeometry(0.9 + Math.random() * 0.3, 32),
        new THREE.MeshStandardMaterial({ color: 0x4466cc, emissive: 0x2244aa, emissiveIntensity: 1.5, transparent: true, opacity: 0.2 }));
      trPtl.add(trFill);
      // Crackling edge sparks (tiny bright spheres)
      for (let sp = 0; sp < 8; sp++) {
        const spA = (sp / 8) * Math.PI * 2;
        const trSpark = new THREE.Mesh(new THREE.SphereGeometry(0.02, 8, 6),
          new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xaaccff, emissiveIntensity: 3.0 }));
        trSpark.position.set(Math.cos(spA) * 1.05, Math.sin(spA) * 1.05, 0.02); trPtl.add(trSpark);
      }
      const trLt = new THREE.PointLight(0x4488ff, 0.6, 8);
      trPtl.add(trLt); mctx.torchLights.push(trLt);
      trPtl.position.set((Math.random() - 0.5) * w * 0.5, 1.5 + Math.random() * 2, (Math.random() - 0.5) * d * 0.5);
      trPtl.rotation.set(Math.random() * 0.3, Math.random(), 0); mctx.scene.add(trPtl);
    }
    // ── Clock tower structures ──
    for (let i = 0; i < 3; i++) {
      const ctTwr = new THREE.Group();
      const ctH = 6 + Math.random() * 3;
      // Tall box tower body
      const ctBody = new THREE.Mesh(new THREE.BoxGeometry(1.5, ctH, 1.5), wallMat);
      ctBody.position.y = ctH / 2; ctBody.castShadow = true; ctTwr.add(ctBody);
      // Clock face on front (circle with tick marks and hands)
      const ctFace = new THREE.Mesh(new THREE.CircleGeometry(0.5, 30), new THREE.MeshStandardMaterial({ color: 0xeeddcc }));
      ctFace.position.set(0, ctH * 0.75, 0.76); ctTwr.add(ctFace);
      const ctRim = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.03, 16, 30), clockMat);
      ctRim.position.set(0, ctH * 0.75, 0.76); ctTwr.add(ctRim);
      // 12 small box tick marks
      for (let tk = 0; tk < 12; tk++) {
        const tkA = (tk / 12) * Math.PI * 2;
        const ctTick = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.07, 0.01), handMat);
        ctTick.position.set(Math.sin(tkA) * 0.4, ctH * 0.75 + Math.cos(tkA) * 0.4, 0.77);
        ctTick.rotation.z = -tkA; ctTwr.add(ctTick);
      }
      // 2 thin box hands
      const ctHr = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.25, 0.015), handMat);
      ctHr.position.set(0, ctH * 0.75 + 0.12, 0.78); ctHr.rotation.z = Math.random() * Math.PI * 2; ctTwr.add(ctHr);
      const ctMn = new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.35, 0.015), handMat);
      ctMn.position.set(0, ctH * 0.75 + 0.17, 0.79); ctMn.rotation.z = Math.random() * Math.PI * 2; ctTwr.add(ctMn);
      // Peaked roof
      const ctRoof = new THREE.Mesh(new THREE.ConeGeometry(1.2, 1.5, 4), wallMat);
      ctRoof.position.y = ctH + 0.75; ctRoof.rotation.y = Math.PI / 4; ctTwr.add(ctRoof);
      const ctx = (Math.random() - 0.5) * w * 0.4, ctz = (Math.random() - 0.5) * d * 0.4;
      ctTwr.position.set(ctx, getTerrainHeight(ctx, ctz, 0.5), ctz);
      ctTwr.rotation.y = Math.random() * Math.PI; mctx.scene.add(ctTwr);
    }
    // ── Chronometer pillars (cylindrical with rotating torus bands) ──
    for (let i = 0; i < 8; i++) {
      const cmPil = new THREE.Group();
      const cmH = 3 + Math.random() * 2;
      const cmBody = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.25, cmH, 20), wallMat);
      cmBody.position.y = cmH / 2; cmBody.castShadow = true; cmPil.add(cmBody);
      // Rotating torus ring bands at different heights
      for (let r = 0; r < 4; r++) {
        const cmRing = new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.02, 12, 24), clockMat);
        cmRing.position.y = 0.5 + r * (cmH / 4);
        cmRing.rotation.x = -Math.PI / 2;
        cmRing.rotation.z = r * 0.7; cmPil.add(cmRing);
      }
      // Emissive time-glyph boxes on surface
      for (let g = 0; g < 3; g++) {
        const cmGlyph = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.12, 0.02), timeMat);
        const gA = (g / 3) * Math.PI * 2;
        cmGlyph.position.set(Math.cos(gA) * 0.22, 1.0 + g * 0.8, Math.sin(gA) * 0.22);
        cmGlyph.rotation.y = -gA; cmPil.add(cmGlyph);
      }
      const cmx = (Math.random() - 0.5) * w * 0.6, cmz = (Math.random() - 0.5) * d * 0.6;
      cmPil.position.set(cmx, getTerrainHeight(cmx, cmz, 0.5), cmz); mctx.scene.add(cmPil);
    }
    // ── Shattered timeline fragments (broken mirror-like planes) ──
    for (let i = 0; i < 10; i++) {
      const stFrag = new THREE.Group();
      // Reflective mirror-like flat plane at angle
      const stW = 0.3 + Math.random() * 0.5, stH = 0.4 + Math.random() * 0.6;
      const stPane = new THREE.Mesh(new THREE.PlaneGeometry(stW, stH), mirrorMat);
      stFrag.add(stPane);
      // Ghostly after-image (translucent duplicate offset nearby)
      const stGhost = new THREE.Mesh(new THREE.PlaneGeometry(stW, stH),
        new THREE.MeshStandardMaterial({ color: 0xaabbcc, transparent: true, opacity: 0.15, side: THREE.DoubleSide }));
      stGhost.position.set(0.1 + Math.random() * 0.1, 0.05, 0.08);
      stGhost.rotation.y = 0.1; stFrag.add(stGhost);
      const stGhost2 = new THREE.Mesh(new THREE.PlaneGeometry(stW * 0.9, stH * 0.9),
        new THREE.MeshStandardMaterial({ color: 0xaabbcc, transparent: true, opacity: 0.08, side: THREE.DoubleSide }));
      stGhost2.position.set(-0.15, -0.08, 0.15);
      stGhost2.rotation.y = -0.15; stFrag.add(stGhost2);
      stFrag.position.set((Math.random() - 0.5) * w * 0.6, 1 + Math.random() * 4, (Math.random() - 0.5) * d * 0.6);
      stFrag.rotation.set((Math.random() - 0.5) * 0.8, Math.random() * Math.PI, (Math.random() - 0.5) * 0.5);
      mctx.scene.add(stFrag);
    }
}

export function buildEldritchNexus(mctx: MapBuildContext, w: number, d: number): void {
    mctx.scene.fog = new THREE.FogExp2(0x150f15, 0.045);
    mctx.applyTerrainColors(0x110a11, 0x1a111a, 0.5);
    mctx.dirLight.color.setHex(0x884488);
    mctx.dirLight.intensity = 0.4;
    mctx.ambientLight.color.setHex(0x0a050a);
    mctx.ambientLight.intensity = 0.2;
    mctx.hemiLight.color.setHex(0x442244);
    mctx.hemiLight.groundColor.setHex(0x050005);

    const eldritchMat = new THREE.MeshStandardMaterial({ color: 0x440044, emissive: 0x220022, emissiveIntensity: 0.5 });
    const tentacleMat = new THREE.MeshStandardMaterial({ color: 0x553355, roughness: 0.5 });
    const eyeMat = new THREE.MeshStandardMaterial({ color: 0xff00ff, emissive: 0xcc00cc, emissiveIntensity: 2.0 });
    const madnessMat = new THREE.MeshStandardMaterial({ color: 0x884488, emissive: 0x662266, emissiveIntensity: 0.8, transparent: true, opacity: 0.4 });
    const organicMat = new THREE.MeshStandardMaterial({ color: 0x664455, roughness: 0.4, emissive: 0x331122, emissiveIntensity: 0.3 });
    const voidMat = new THREE.MeshStandardMaterial({ color: 0x220033, emissive: 0x110022, emissiveIntensity: 0.5 });
    const runeMat = new THREE.MeshStandardMaterial({ color: 0xaa44ff, emissive: 0x8822dd, emissiveIntensity: 1.5 });
    const alienStoneMat = new THREE.MeshStandardMaterial({ color: 0x332244, roughness: 0.6, metalness: 0.2 });

    // Giant tentacles (more segments, better curvature)
    for (let i = 0; i < 24; i++) {
      const tentacle = new THREE.Group();
      const segments = 6 + Math.floor(Math.random() * 6);
      let lastR = 0.15 + Math.random() * 0.12;
      for (let s = 0; s < segments; s++) {
        const r = lastR * (0.82 + Math.random() * 0.12);
        const seg = new THREE.Mesh(new THREE.CylinderGeometry(r, lastR, 0.6, 23), tentacleMat);
        seg.position.y = s * 0.55;
        seg.rotation.z = Math.sin(s * 0.7) * 0.18;
        seg.rotation.x = Math.cos(s * 0.5) * 0.18; tentacle.add(seg); lastR = r;
      }
      // Suction cups on some
      if (Math.random() > 0.5) {
        for (let sc = 0; sc < 4; sc++) {
          const sucker = new THREE.Mesh(new THREE.TorusGeometry(0.04, 0.01, 27, 23), organicMat);
          sucker.position.set(0.1, sc * 1.2 + 0.5, 0); tentacle.add(sucker);
        }
      }
      const tx = (Math.random() - 0.5) * w * 0.8, tz = (Math.random() - 0.5) * d * 0.8;
      tentacle.position.set(tx, getTerrainHeight(tx, tz, 0.5), tz);
      tentacle.rotation.set((Math.random() - 0.5) * 0.4, Math.random() * Math.PI, (Math.random() - 0.5) * 0.4);
      mctx.scene.add(tentacle);
    }

    // Eldritch eyes (more, with varied sizes and eyelids)
    for (let i = 0; i < 12; i++) {
      const eye = new THREE.Group();
      const eyeSize = 0.3 + Math.random() * 0.4;
      const eyeball = new THREE.Mesh(new THREE.SphereGeometry(eyeSize, 27, 23),
        new THREE.MeshStandardMaterial({ color: [0xaa0066, 0x880088, 0xcc4400][i % 3], emissive: 0x660033, emissiveIntensity: 0.5 }));
      eye.add(eyeball);
      const pupil = new THREE.Mesh(new THREE.SphereGeometry(eyeSize * 0.35, 23, 20), new THREE.MeshStandardMaterial({ color: 0x000000 }));
      pupil.position.z = eyeSize * 0.7; eye.add(pupil);
      const iris = new THREE.Mesh(new THREE.TorusGeometry(eyeSize * 0.3, 0.03, 17, 27), eyeMat);
      iris.position.z = eyeSize * 0.65; eye.add(iris);
      // Eyelid
      const lid = new THREE.Mesh(new THREE.SphereGeometry(eyeSize * 1.05, 23, 17, 0, Math.PI * 2, 0, Math.PI * 0.3), organicMat);
      lid.position.y = eyeSize * 0.2; eye.add(lid);
      // Veins radiating from eye
      for (let v = 0; v < 3; v++) {
        const vein = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.02, eyeSize, 16), organicMat);
        const vAngle = (v / 3) * Math.PI * 2 + Math.random();
        vein.position.set(Math.sin(vAngle) * eyeSize * 0.8, Math.cos(vAngle) * eyeSize * 0.8, 0);
        vein.rotation.z = vAngle; eye.add(vein);
      }
      const eLight = new THREE.PointLight(0xff00ff, 0.5, 8);
      eLight.position.z = eyeSize * 0.3; eye.add(eLight); mctx.torchLights.push(eLight);
      eye.position.set((Math.random() - 0.5) * w * 0.6, 1 + Math.random() * 5, (Math.random() - 0.5) * d * 0.6);
      eye.rotation.set((Math.random() - 0.5) * 0.5, Math.random() * Math.PI, 0);
      mctx.scene.add(eye);
    }

    // Eye-covered surfaces (walls with multiple small eyes)
    for (let i = 0; i < 6; i++) {
      const eyeWall = new THREE.Group();
      const wallBase = new THREE.Mesh(new THREE.BoxGeometry(2 + Math.random() * 2, 2 + Math.random() * 2, 0.3), organicMat);
      eyeWall.add(wallBase);
      const wallW = wallBase.geometry.parameters.width;
      const wallH = wallBase.geometry.parameters.height;
      for (let e = 0; e < 8 + Math.floor(Math.random() * 6); e++) {
        const smallEye = new THREE.Mesh(new THREE.SphereGeometry(0.06 + Math.random() * 0.04, 20, 17),
          new THREE.MeshStandardMaterial({ color: 0xaa0066, emissive: 0x440022, emissiveIntensity: 0.5 }));
        smallEye.position.set((Math.random() - 0.5) * wallW * 0.8, (Math.random() - 0.5) * wallH * 0.8, 0.16);
        eyeWall.add(smallEye);
        const smallPupil = new THREE.Mesh(new THREE.SphereGeometry(0.025, 17, 16), new THREE.MeshStandardMaterial({ color: 0x000000 }));
        smallPupil.position.copy(smallEye.position); smallPupil.position.z += 0.04; eyeWall.add(smallPupil);
      }
      const ewx = (Math.random() - 0.5) * w * 0.6, ewz = (Math.random() - 0.5) * d * 0.6;
      eyeWall.position.set(ewx, getTerrainHeight(ewx, ewz, 0.5) + 1.5, ewz);
      eyeWall.rotation.y = Math.random() * Math.PI; mctx.scene.add(eyeWall);
    }

    // Alien architecture (non-euclidean columns, twisted shapes)
    for (let i = 0; i < 10; i++) {
      const alienCol = new THREE.Group();
      const colH = 3 + Math.random() * 4;
      const col = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.4, colH, 20), alienStoneMat);
      col.position.y = colH / 2; alienCol.add(col);
      // Twisted ring decorations
      for (let r = 0; r < 3; r++) {
        const ring = new THREE.Mesh(new THREE.TorusGeometry(0.45, 0.04, 27, 23), eldritchMat);
        ring.position.y = 1 + r * 1.2;
        ring.rotation.set(Math.random() * 0.5, Math.random(), Math.random() * 0.5); alienCol.add(ring);
      }
      const acx = (Math.random() - 0.5) * w * 0.7, acz = (Math.random() - 0.5) * d * 0.7;
      alienCol.position.set(acx, getTerrainHeight(acx, acz, 0.5), acz);
      alienCol.rotation.z = (Math.random() - 0.5) * 0.15; mctx.scene.add(alienCol);
    }

    // Impossible geometry (intersecting shapes)
    for (let i = 0; i < 15; i++) {
      const geom = new THREE.Group();
      const box1 = new THREE.Mesh(new THREE.BoxGeometry(0.5 + Math.random() * 1.5, 0.5 + Math.random() * 1.5, 0.5 + Math.random() * 1.5), eldritchMat);
      geom.add(box1);
      // Intersecting second shape
      const box2 = new THREE.Mesh(new THREE.BoxGeometry(0.4 + Math.random(), 0.4 + Math.random(), 0.4 + Math.random()), voidMat);
      box2.rotation.set(Math.PI / 4, Math.PI / 4, 0); geom.add(box2);
      geom.position.set((Math.random() - 0.5) * w * 0.7, Math.random() * 6, (Math.random() - 0.5) * d * 0.7);
      geom.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
      mctx.scene.add(geom);
    }

    // Reality-warping portals (larger, with distortion rings)
    for (let i = 0; i < 6; i++) {
      const portal = new THREE.Group();
      const outerRing = new THREE.Mesh(new THREE.TorusGeometry(1 + Math.random(), 0.08, 23, 46), eyeMat);
      portal.add(outerRing);
      const innerRing = new THREE.Mesh(new THREE.TorusGeometry(0.7 + Math.random() * 0.5, 0.04, 17, 44), madnessMat);
      portal.add(innerRing);
      // Void center
      const voidCenter = new THREE.Mesh(new THREE.CircleGeometry(0.6 + Math.random() * 0.4, 36),
        new THREE.MeshStandardMaterial({ color: 0x110022, emissive: 0x220044, emissiveIntensity: 0.5 }));
      portal.add(voidCenter);
      portal.position.set((Math.random() - 0.5) * w * 0.4, 2 + Math.random() * 3, (Math.random() - 0.5) * d * 0.4);
      portal.rotation.set(Math.random() * 0.5, Math.random(), Math.random() * 0.5); mctx.scene.add(portal);
    }

    // Cosmic horror statues
    for (let i = 0; i < 4; i++) {
      const statue = new THREE.Group();
      const stBody = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.4, 2, 23), alienStoneMat);
      stBody.position.y = 1; statue.add(stBody);
      // Multiple heads/faces
      for (let h = 0; h < 3; h++) {
        const face = new THREE.Mesh(new THREE.SphereGeometry(0.18, 31, 20), alienStoneMat);
        const hAngle = (h / 3) * Math.PI * 2;
        face.position.set(Math.sin(hAngle) * 0.15, 2.1, Math.cos(hAngle) * 0.15); statue.add(face);
      }
      // Tentacle arms
      for (let a = 0; a < 4; a++) {
        const tArm = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.06, 1 + Math.random() * 0.5, 17), tentacleMat);
        tArm.position.set((a < 2 ? -1 : 1) * 0.3, 1.3, (a % 2 === 0 ? -1 : 1) * 0.15);
        tArm.rotation.z = (a < 2 ? 1 : -1) * (0.5 + Math.random() * 0.5); statue.add(tArm);
      }
      // Base with runes
      const stBase = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.7, 0.3, 27), alienStoneMat);
      stBase.position.y = 0.15; statue.add(stBase);
      const baseRune = new THREE.Mesh(new THREE.TorusGeometry(0.55, 0.02, 27, 27), runeMat);
      baseRune.rotation.x = -Math.PI / 2; baseRune.position.y = 0.31; statue.add(baseRune);
      const stx = (Math.random() - 0.5) * w * 0.5, stz = (Math.random() - 0.5) * d * 0.5;
      statue.position.set(stx, getTerrainHeight(stx, stz, 0.5), stz);
      statue.rotation.y = Math.random() * Math.PI; mctx.scene.add(statue);
    }

    // Void tendrils (thin dark wisps reaching from ground)
    for (let i = 0; i < 15; i++) {
      const tendril = new THREE.Group();
      for (let s = 0; s < 4 + Math.floor(Math.random() * 3); s++) {
        const seg = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.03, 0.8, 16), voidMat);
        seg.position.y = s * 0.7; seg.rotation.z = Math.sin(s * 0.8) * 0.2;
        seg.rotation.x = Math.cos(s * 0.6) * 0.2; tendril.add(seg);
      }
      const vtx = (Math.random() - 0.5) * w * 0.7, vtz = (Math.random() - 0.5) * d * 0.7;
      tendril.position.set(vtx, getTerrainHeight(vtx, vtz, 0.5), vtz); mctx.scene.add(tendril);
    }

    // Madness-inducing runes (glowing symbols on ground)
    for (let i = 0; i < 12; i++) {
      const runeGroup = new THREE.Group();
      const circle = new THREE.Mesh(new THREE.TorusGeometry(0.4 + Math.random() * 0.3, 0.02, 16, 30), runeMat);
      circle.rotation.x = -Math.PI / 2; runeGroup.add(circle);
      // Inner symbols (star pattern)
      for (let p = 0; p < 5; p++) {
        const line = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.01, 0.6), runeMat);
        line.rotation.y = (p / 5) * Math.PI; runeGroup.add(line);
      }
      const rnx = (Math.random() - 0.5) * w * 0.6, rnz = (Math.random() - 0.5) * d * 0.6;
      runeGroup.position.set(rnx, getTerrainHeight(rnx, rnz, 0.5) + 0.03, rnz); mctx.scene.add(runeGroup);
    }

    // Pulsing organic walls (breathing membrane look)
    for (let i = 0; i < 8; i++) {
      const orgWall = new THREE.Mesh(new THREE.SphereGeometry(1.5 + Math.random() * 2, 23, 20), organicMat);
      orgWall.scale.z = 0.15;
      const owx = (Math.random() - 0.5) * w * 0.7, owz = (Math.random() - 0.5) * d * 0.7;
      orgWall.position.set(owx, getTerrainHeight(owx, owz, 0.5) + 1.5, owz);
      orgWall.rotation.y = Math.random() * Math.PI; mctx.scene.add(orgWall);
    }

    // Madness pools
    for (let i = 0; i < 8; i++) {
      const pool = new THREE.Mesh(new THREE.CircleGeometry(1 + Math.random() * 2, 30), madnessMat);
      pool.rotation.x = -Math.PI / 2;
      const px = (Math.random() - 0.5) * w * 0.5, pz = (Math.random() - 0.5) * d * 0.5;
      pool.position.set(px, getTerrainHeight(px, pz, 0.5) + 0.02, pz); mctx.scene.add(pool);
    }

    // Psychic energy streams
    for (let i = 0; i < 12; i++) {
      const stream = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 4 + Math.random() * 6, 16), madnessMat);
      stream.position.set((Math.random() - 0.5) * w * 0.6, 8, (Math.random() - 0.5) * d * 0.6);
      stream.rotation.set(Math.random() * 0.5, 0, Math.random() * 0.5); mctx.scene.add(stream);
    }
    // ── Tentacle archways ──
    for (let i = 0; i < 4; i++) {
      const archway = new THREE.Group();
      for (const side of [-1, 1]) {
        for (let s = 0; s < 6; s++) {
          const seg = new THREE.Mesh(new THREE.CylinderGeometry(0.08 - s * 0.008, 0.1 - s * 0.008, 0.5, 20), tentacleMat);
          const angle = (s / 6) * Math.PI * 0.5 * side;
          seg.position.set(side * (1.0 - Math.sin(angle) * 0.8), s * 0.45, 0);
          seg.rotation.z = angle * 0.8; archway.add(seg);
        }
      }
      const ahx = (Math.random()-0.5)*w*0.5, ahz = (Math.random()-0.5)*d*0.5;
      archway.position.set(ahx, getTerrainHeight(ahx, ahz, 0.5), ahz);
      archway.rotation.y = Math.random() * Math.PI; mctx.scene.add(archway);
    }
    // ── Non-euclidean geometry hints (impossible angles with thin boxes) ──
    for (let i = 0; i < 10; i++) {
      const impossible = new THREE.Group();
      const bar1 = new THREE.Mesh(new THREE.BoxGeometry(0.05, 1.5, 0.05), alienStoneMat);
      impossible.add(bar1);
      const bar2 = new THREE.Mesh(new THREE.BoxGeometry(0.05, 1.2, 0.05), alienStoneMat);
      bar2.position.set(0.4, 0.3, 0.2); bar2.rotation.set(0.4, 0.6, -0.3); impossible.add(bar2);
      const bar3 = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.8, 0.05), alienStoneMat);
      bar3.position.set(-0.2, -0.2, 0.4); bar3.rotation.set(-0.3, 0.2, 0.7); impossible.add(bar3);
      const connector = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.04, 0.04), eldritchMat);
      connector.position.set(0.2, 0.5, 0.1); connector.rotation.set(0.2, 0.4, 0.3); impossible.add(connector);
      impossible.position.set((Math.random()-0.5)*w*0.6, 1 + Math.random() * 4, (Math.random()-0.5)*d*0.6);
      impossible.rotation.set(Math.random(), Math.random(), Math.random()); mctx.scene.add(impossible);
    }
    // ── Sigil floor patterns ──
    for (let i = 0; i < 8; i++) {
      const sigil = new THREE.Group();
      const outerCirc = new THREE.Mesh(new THREE.TorusGeometry(0.8 + Math.random() * 0.4, 0.02, 16, 36), runeMat);
      outerCirc.rotation.x = -Math.PI / 2; sigil.add(outerCirc);
      const innerCirc = new THREE.Mesh(new THREE.TorusGeometry(0.4 + Math.random() * 0.2, 0.015, 16, 30), runeMat);
      innerCirc.rotation.x = -Math.PI / 2; sigil.add(innerCirc);
      for (let l = 0; l < 7; l++) {
        const line = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.01, 1.4), runeMat);
        line.rotation.y = (l / 7) * Math.PI; sigil.add(line);
      }
      const triangle = new THREE.Group();
      for (let t = 0; t < 3; t++) {
        const tAngle1 = (t / 3) * Math.PI * 2;
        const tAngle2 = ((t+1) / 3) * Math.PI * 2;
        const tLine = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.01, 0.8), runeMat);
        tLine.position.set(Math.cos((tAngle1+tAngle2)/2)*0.35, 0, Math.sin((tAngle1+tAngle2)/2)*0.35);
        tLine.rotation.y = -(tAngle1+tAngle2)/2 + Math.PI/2; triangle.add(tLine);
      }
      sigil.add(triangle);
      const sgx = (Math.random()-0.5)*w*0.5, sgz = (Math.random()-0.5)*d*0.5;
      sigil.position.set(sgx, getTerrainHeight(sgx, sgz, 0.5) + 0.03, sgz); mctx.scene.add(sigil);
    }
    // ── Otherworldly flora (alien plant forms) ──
    for (let i = 0; i < 12; i++) {
      const flora = new THREE.Group();
      const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.04, 0.5 + Math.random() * 0.5, 16), organicMat);
      stem.position.y = 0.3; flora.add(stem);
      for (let p = 0; p < 3 + Math.floor(Math.random() * 3); p++) {
        const petal = new THREE.Mesh(new THREE.SphereGeometry(0.06 + Math.random() * 0.04, 16, 16), new THREE.MeshStandardMaterial({ color: 0xaa44cc, emissive: 0x662266, emissiveIntensity: 0.5, transparent: true, opacity: 0.6 }));
        petal.scale.y = 0.3;
        const pa = (p / 4) * Math.PI * 2;
        petal.position.set(Math.cos(pa) * 0.08, 0.55 + Math.random() * 0.1, Math.sin(pa) * 0.08); flora.add(petal);
      }
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.02, 16, 8), eyeMat);
      eye.position.y = 0.6; flora.add(eye);
      const flx = (Math.random()-0.5)*w*0.7, flz = (Math.random()-0.5)*d*0.7;
      flora.position.set(flx, getTerrainHeight(flx, flz, 0.5), flz); mctx.scene.add(flora);
    }
}

export function buildCityRuins(mctx: MapBuildContext, w: number, d: number): void {
    // ── Lighting / Atmosphere ──
    mctx.scene.fog = new THREE.FogExp2(0x6a6560, 0.014);
    mctx.applyTerrainColors(0x4a4540, 0x6a6560, 0.5);
    mctx.dirLight.color.setHex(0xccbbaa);
    mctx.dirLight.intensity = 0.9;
    mctx.dirLight.position.set(12, 20, 8);
    mctx.ambientLight.color.setHex(0x444038);
    mctx.ambientLight.intensity = 0.5;
    mctx.hemiLight.color.setHex(0x887766);
    mctx.hemiLight.groundColor.setHex(0x332a22);
    mctx.hemiLight.intensity = 0.4;

    const hw = w / 2;
    const hd = d / 2;

    // ── Cobblestone Ground — broken streets with individual stones ──
    const streetColors = [0x6a6055, 0x7a7065, 0x5a5550, 0x686058, 0x787068];
    const streetMat = new THREE.MeshStandardMaterial({ color: 0x5a5550, roughness: 0.9 });

    // Main ruined boulevard (north-south)
    const boulevardGeo = new THREE.BoxGeometry(8, 0.05, w * 0.8);
    const boulevard = new THREE.Mesh(boulevardGeo, streetMat);
    boulevard.position.set(0, 0.03, 0);
    boulevard.receiveShadow = true;
    mctx.envGroup.add(boulevard);

    // Cross streets (east-west)
    for (const zOff of [-20, -5, 10, 25]) {
      const crossGeo = new THREE.BoxGeometry(w * 0.6, 0.05, 5);
      const cross = new THREE.Mesh(crossGeo, new THREE.MeshStandardMaterial({ color: streetColors[Math.floor(Math.random() * streetColors.length)], roughness: 0.9 }));
      cross.position.set(0, 0.03, zOff);
      cross.receiveShadow = true;
      mctx.envGroup.add(cross);
    }

    // Individual cobblestone tiles on boulevard
    const tileColors = [0x5a5048, 0x6a6058, 0x4a4840, 0x7a7068, 0x585048, 0x686060];
    const tileSize = 1.1;
    const tileGeo = new THREE.BoxGeometry(tileSize - 0.06, 0.025, tileSize - 0.06);
    for (let tx = -3.5; tx <= 3.5; tx += tileSize) {
      for (let tz = -hw * 0.35; tz <= hw * 0.35; tz += tileSize) {
        if (Math.random() > 0.15) { // Some missing tiles for ruined look
          const tileMat = new THREE.MeshStandardMaterial({ color: tileColors[Math.floor(Math.random() * tileColors.length)], roughness: 0.88 + Math.random() * 0.1 });
          const tile = new THREE.Mesh(tileGeo, tileMat);
          tile.position.set(tx + (Math.random() - 0.5) * 0.1, 0.06, tz + (Math.random() - 0.5) * 0.1);
          tile.rotation.y = (Math.random() - 0.5) * 0.1;
          tile.receiveShadow = true;
          mctx.envGroup.add(tile);
        }
      }
    }

    // Cobblestone circle details with mortar
    const cobbleColors = [0x5a5048, 0x6a6058, 0x4a4840, 0x7a7068, 0x585048];
    for (let ci = 0; ci < 350; ci++) {
      const cbR = 0.12 + Math.random() * 0.1;
      const cMat = new THREE.MeshStandardMaterial({ color: cobbleColors[ci % cobbleColors.length], roughness: 0.95, side: THREE.DoubleSide });
      const cobble = new THREE.Mesh(new THREE.CircleGeometry(cbR, 12), cMat);
      cobble.rotation.x = -Math.PI / 2;
      const cx = (Math.random() - 0.5) * w * 0.7;
      const cz = (Math.random() - 0.5) * d * 0.7;
      cobble.position.set(cx, 0.065, cz);
      mctx.envGroup.add(cobble);
      // Mortar lines
      if (Math.random() > 0.5) {
        const mortarMat = new THREE.MeshStandardMaterial({ color: 0x3a3530, roughness: 1.0 });
        const mortar = new THREE.Mesh(new THREE.BoxGeometry(cbR * 2, 0.004, 0.012), mortarMat);
        mortar.rotation.y = Math.random() * Math.PI;
        mortar.position.set(cx, 0.063, cz);
        mctx.envGroup.add(mortar);
      }
    }

    // ── Drain Grates in streets ──
    const grateMat = new THREE.MeshStandardMaterial({ color: 0x333333, metalness: 0.6, roughness: 0.5 });
    for (let gi = 0; gi < 8; gi++) {
      const gx = (Math.random() - 0.5) * 6;
      const gz = -30 + gi * 8;
      const grateGroup = new THREE.Group();
      const grateFrame = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.03, 0.6), grateMat);
      grateFrame.position.y = 0.07;
      grateGroup.add(grateFrame);
      // Bars
      for (let b = -3; b <= 3; b++) {
        const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.55, 8), grateMat);
        bar.rotation.z = Math.PI / 2;
        bar.position.set(b * 0.1, 0.07, 0);
        grateGroup.add(bar);
      }
      // Dark hole beneath
      const hole = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.02, 0.5), new THREE.MeshStandardMaterial({ color: 0x0a0a08, roughness: 1.0 }));
      hole.position.y = 0.04;
      grateGroup.add(hole);
      grateGroup.position.set(gx, 0, gz);
      mctx.envGroup.add(grateGroup);
    }

    // ── Ruined Buildings — forming alleyways ──
    const ruinPositions: [number, number, number, number, number][] = [
      [-14, -30, 4, 5, 6], [-14, -22, 3.5, 4, 4], [-14, -15, 4, 5, 7],
      [-14, -7, 3, 4, 5], [-14, 1, 4, 5, 8], [-14, 9, 3.5, 4, 3],
      [-14, 16, 4, 5, 6], [-14, 24, 3, 4, 5],
      [14, -30, 4, 5, 5], [14, -22, 3, 4, 7], [14, -15, 4, 5, 4],
      [14, -7, 3.5, 4, 6], [14, 1, 4, 5, 5], [14, 9, 3, 4, 8],
      [14, 16, 4, 5, 3], [14, 24, 3.5, 4, 6],
      [-7, -28, 3, 3, 5], [-7, -20, 2.5, 3, 4], [-7, -12, 3, 3, 6],
      [-7, -4, 2.5, 3, 3], [-7, 4, 3, 3, 5], [-7, 12, 2.5, 3, 7],
      [-7, 20, 3, 3, 4], [-7, 28, 2.5, 3, 5],
      [7, -28, 3, 3, 4], [7, -20, 2.5, 3, 6], [7, -12, 3, 3, 3],
      [7, -4, 2.5, 3, 5], [7, 4, 3, 3, 7], [7, 12, 2.5, 3, 4],
      [7, 20, 3, 3, 5], [7, 28, 2.5, 3, 6],
      [-22, -25, 3, 4, 4], [-22, -10, 4, 3, 3], [-22, 5, 3, 4, 5],
      [-22, 18, 4, 3, 4], [22, -25, 3, 4, 5], [22, -10, 4, 3, 3],
      [22, 5, 3, 4, 4], [22, 18, 4, 3, 6],
      [-30, -15, 5, 4, 3], [-30, 5, 4, 5, 5], [30, -15, 4, 5, 4], [30, 5, 5, 4, 3],
    ];

    const ruinWallColors = [0x6a6055, 0x7a7065, 0x585048, 0x807568, 0x5a5045, 0x706558];
    const ruinRoofColors = [0x554433, 0x443322, 0x665544, 0x3a3028];

    for (let ri = 0; ri < ruinPositions.length; ri++) {
      const [rx, rz, rw, rd, maxH] = ruinPositions[ri];
      const collapse = 0.3 + Math.random() * 0.7;
      const bh = maxH * collapse;
      const buildGroup = new THREE.Group();

      // Base walls — weathered stone
      const wallColor = ruinWallColors[ri % ruinWallColors.length];
      const wallMat = new THREE.MeshStandardMaterial({ color: wallColor, roughness: 0.92 });
      const baseGeo = new THREE.BoxGeometry(rw, bh, rd);
      const base = new THREE.Mesh(baseGeo, wallMat);
      base.position.y = bh / 2;
      base.castShadow = true;
      base.receiveShadow = true;
      buildGroup.add(base);

      // Crumbled top — jagged stones
      for (let ji = 0; ji < 7; ji++) {
        const jw = 0.2 + Math.random() * 0.5;
        const jh = 0.15 + Math.random() * 0.6;
        const jGeo = new THREE.BoxGeometry(jw, jh, 0.2 + Math.random() * 0.4);
        const jag = new THREE.Mesh(jGeo, new THREE.MeshStandardMaterial({ color: wallColor, roughness: 0.95 }));
        jag.position.set((Math.random() - 0.5) * (rw - 0.2), bh + jh / 2, (Math.random() - 0.5) * (rd - 0.2));
        jag.rotation.set((Math.random() - 0.5) * 0.2, Math.random() * 0.3, (Math.random() - 0.5) * 0.15);
        jag.castShadow = true;
        buildGroup.add(jag);
      }

      // Exposed brickwork patches
      const brickMat = new THREE.MeshStandardMaterial({ color: 0x8a5540, roughness: 0.9 });
      if (Math.random() > 0.4) {
        for (let bi = 0; bi < 4 + Math.floor(Math.random() * 4); bi++) {
          const brickW = 0.15 + Math.random() * 0.15;
          const brickH = 0.08 + Math.random() * 0.06;
          const brick = new THREE.Mesh(new THREE.BoxGeometry(brickW, brickH, 0.06), brickMat);
          brick.position.set(
            (Math.random() - 0.5) * rw * 0.7,
            0.3 + Math.random() * (bh - 0.5),
            rd / 2 + 0.05
          );
          buildGroup.add(brick);
        }
      }

      // Collapsed roof (if tall enough)
      if (bh > 3 && Math.random() > 0.3) {
        const roofColor = ruinRoofColors[ri % ruinRoofColors.length];
        const roofMat = new THREE.MeshStandardMaterial({ color: roofColor, roughness: 0.8, side: THREE.DoubleSide });
        const roofW = rw + 0.3;
        const slopeLen = rd * 0.7;
        const roofPlane = new THREE.Mesh(new THREE.PlaneGeometry(roofW, slopeLen), roofMat);
        roofPlane.position.set(0, bh + 0.2, 0);
        roofPlane.rotation.x = -0.3 - Math.random() * 0.4;
        roofPlane.rotation.z = (Math.random() - 0.5) * 0.3;
        buildGroup.add(roofPlane);
        // Roof beams visible through collapse
        for (let rbi = 0; rbi < 3; rbi++) {
          const beam = new THREE.Mesh(
            new THREE.CylinderGeometry(0.04, 0.04, rw + 0.2, 8),
            new THREE.MeshStandardMaterial({ color: 0x4a3520, roughness: 0.85 })
          );
          beam.rotation.z = Math.PI / 2;
          beam.position.set(0, bh - 0.2 + rbi * 0.4, (Math.random() - 0.5) * rd * 0.5);
          buildGroup.add(beam);
        }
      }

      // Empty windows — dark holes with stone frames and cracked sills
      const darkMat = new THREE.MeshStandardMaterial({ color: 0x1a1815, roughness: 1.0 });
      const frameMat = new THREE.MeshStandardMaterial({ color: 0x555048, roughness: 0.9 });
      if (bh > 2) {
        for (let wni = 0; wni < 2; wni++) {
          const wx = -rw * 0.2 + wni * rw * 0.4;
          const wy = bh * 0.55;
          for (const wz of [rd / 2 + 0.04, -rd / 2 - 0.04]) {
            // Dark window hole
            const win = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.5, 0.08), darkMat);
            win.position.set(wx, wy, wz);
            buildGroup.add(win);
            // Stone frame - lintel
            const lintel = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.06, 0.06), frameMat);
            lintel.position.set(wx, wy + 0.28, wz);
            buildGroup.add(lintel);
            // Sill
            const sill = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.04, 0.1), frameMat);
            sill.position.set(wx, wy - 0.27, wz > 0 ? wz + 0.03 : wz - 0.03);
            buildGroup.add(sill);
            // Side posts
            for (const sx of [-0.22, 0.22]) {
              const post = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.5, 0.05), frameMat);
              post.position.set(wx + sx, wy, wz);
              buildGroup.add(post);
            }
            // Cracked glass shard (some windows)
            if (Math.random() > 0.6) {
              const shardMat = new THREE.MeshStandardMaterial({ color: 0x88aaaa, transparent: true, opacity: 0.3, roughness: 0.2, side: THREE.DoubleSide });
              const shard = new THREE.Mesh(new THREE.PlaneGeometry(0.15, 0.25), shardMat);
              shard.position.set(wx + 0.08, wy + 0.05, wz);
              shard.rotation.z = 0.3;
              buildGroup.add(shard);
            }
          }
        }
      }

      // Cracked doorway with rubble at threshold
      const door = new THREE.Mesh(new THREE.BoxGeometry(0.7, 1.4, 0.08), darkMat);
      door.position.set(0, 0.7, rd / 2 + 0.04);
      buildGroup.add(door);
      // Door arch (stone)
      const archMat2 = new THREE.MeshStandardMaterial({ color: 0x605548, roughness: 0.88 });
      const doorArch = new THREE.Mesh(new THREE.TorusGeometry(0.38, 0.05, 8, 16, Math.PI), archMat2);
      doorArch.position.set(0, 1.4, rd / 2 + 0.06);
      buildGroup.add(doorArch);
      // Rubble at doorstep
      for (let dri = 0; dri < 3; dri++) {
        const drub = new THREE.Mesh(new THREE.DodecahedronGeometry(0.08 + Math.random() * 0.1, 1), archMat2);
        drub.position.set((Math.random() - 0.5) * 0.5, 0.08, rd / 2 + 0.15 + Math.random() * 0.3);
        buildGroup.add(drub);
      }

      // Stone block texture lines on ALL 4 faces
      for (let li = 0; li < Math.floor(bh / 0.7); li++) {
        const ly = 0.35 + li * 0.7;
        // Front and back
        for (const fz of [rd / 2 + 0.04, -rd / 2 - 0.04]) {
          const hLine = new THREE.Mesh(new THREE.BoxGeometry(rw + 0.02, 0.012, 0.008), new THREE.MeshStandardMaterial({ color: 0x4a4540, roughness: 1.0 }));
          hLine.position.set(0, ly, fz);
          buildGroup.add(hLine);
        }
        // Left and right
        for (const fx of [rw / 2 + 0.04, -rw / 2 - 0.04]) {
          const vLine = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.012, rd + 0.02), new THREE.MeshStandardMaterial({ color: 0x4a4540, roughness: 1.0 }));
          vLine.position.set(fx, ly, 0);
          buildGroup.add(vLine);
        }
        // Vertical mortar joints (staggered)
        if (li % 2 === 0) {
          for (let vj = 0; vj < 3; vj++) {
            const vjx = -rw * 0.3 + vj * rw * 0.3 + (li % 4 === 0 ? rw * 0.15 : 0);
            const vjLine = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.7, 0.008), new THREE.MeshStandardMaterial({ color: 0x4a4540, roughness: 1.0 }));
            vjLine.position.set(vjx, ly, rd / 2 + 0.04);
            buildGroup.add(vjLine);
          }
        }
      }

      // Moss / vine patches on walls (multiple per building)
      const mossCount = Math.floor(Math.random() * 4);
      for (let mi = 0; mi < mossCount; mi++) {
        const mossMat = new THREE.MeshStandardMaterial({ color: 0x3a5530 + Math.floor(Math.random() * 0x101010), roughness: 0.9, transparent: true, opacity: 0.6 + Math.random() * 0.2 });
        const mossW = 0.5 + Math.random() * 1.2;
        const mossH = 0.3 + Math.random() * 0.8;
        const moss = new THREE.Mesh(new THREE.PlaneGeometry(mossW, mossH), mossMat);
        const mossface = Math.floor(Math.random() * 4);
        if (mossface < 2) {
          moss.position.set((Math.random() - 0.5) * rw * 0.6, 0.3 + Math.random() * bh * 0.4, (mossface === 0 ? rd / 2 : -rd / 2) + (mossface === 0 ? 0.05 : -0.05));
        } else {
          moss.rotation.y = Math.PI / 2;
          moss.position.set((mossface === 2 ? rw / 2 : -rw / 2) + (mossface === 2 ? 0.05 : -0.05), 0.3 + Math.random() * bh * 0.4, (Math.random() - 0.5) * rd * 0.6);
        }
        buildGroup.add(moss);
      }

      // Ivy vines climbing walls
      if (Math.random() > 0.5) {
        const ivyMat = new THREE.MeshStandardMaterial({ color: 0x2a4020, roughness: 0.85 });
        const vineCount = 2 + Math.floor(Math.random() * 3);
        for (let vi = 0; vi < vineCount; vi++) {
          const vineH = 0.3 + Math.random() * 0.5;
          const vine = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.015, vineH, 5), ivyMat);
          vine.position.set((Math.random() - 0.5) * rw * 0.5, vineH / 2 + Math.random() * bh * 0.3, rd / 2 + 0.05);
          vine.rotation.z = (Math.random() - 0.5) * 0.3;
          buildGroup.add(vine);
          // Leaves
          for (let lfi = 0; lfi < 4; lfi++) {
            const leaf = new THREE.Mesh(new THREE.SphereGeometry(0.03, 6, 5), new THREE.MeshStandardMaterial({ color: 0x3a5028, roughness: 0.7 }));
            leaf.scale.set(1.5, 0.5, 1.0);
            leaf.position.set(vine.position.x + (Math.random() - 0.5) * 0.12, vine.position.y - vineH / 2 + lfi * vineH * 0.25, rd / 2 + 0.07);
            buildGroup.add(leaf);
          }
        }
      }

      // Foundation stones at base
      const foundMat = new THREE.MeshStandardMaterial({ color: 0x555548, roughness: 0.92 });
      for (let fi = 0; fi < 8; fi++) {
        const fStone = new THREE.Mesh(new THREE.DodecahedronGeometry(0.1 + Math.random() * 0.08, 1), foundMat);
        const fAngle = (fi / 8) * Math.PI * 2;
        fStone.position.set(Math.cos(fAngle) * (rw / 2), 0.08, Math.sin(fAngle) * (rd / 2));
        buildGroup.add(fStone);
      }

      // Quoin cornerstones
      const quoinMat = new THREE.MeshStandardMaterial({ color: 0x666658, roughness: 0.88 });
      for (const [qx, qz] of [[-rw / 2, rd / 2], [rw / 2, rd / 2], [-rw / 2, -rd / 2], [rw / 2, -rd / 2]] as [number, number][]) {
        for (let qi = 0; qi < Math.min(3, Math.floor(bh / 1.2)); qi++) {
          const quoin = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.28, 0.18), quoinMat);
          quoin.position.set(qx, 0.2 + qi * (bh / 3), qz);
          buildGroup.add(quoin);
        }
      }

      // Cracked wall lines (diagonal cracks)
      if (Math.random() > 0.5) {
        const crackMat = new THREE.MeshStandardMaterial({ color: 0x2a2520, roughness: 1.0 });
        const crackLen = bh * (0.3 + Math.random() * 0.4);
        const crack = new THREE.Mesh(new THREE.BoxGeometry(0.015, crackLen, 0.008), crackMat);
        crack.position.set((Math.random() - 0.5) * rw * 0.4, bh * 0.4, rd / 2 + 0.05);
        crack.rotation.z = (Math.random() - 0.5) * 0.6;
        buildGroup.add(crack);
      }

      // Water stains
      if (Math.random() > 0.6) {
        const stainMat = new THREE.MeshStandardMaterial({ color: 0x3a3530, transparent: true, opacity: 0.25, roughness: 1.0, side: THREE.DoubleSide });
        const stain = new THREE.Mesh(new THREE.PlaneGeometry(0.2, 0.8 + Math.random() * 1.0), stainMat);
        stain.position.set((Math.random() - 0.5) * rw * 0.5, bh * 0.5, rd / 2 + 0.05);
        buildGroup.add(stain);
      }

      // Dust pile at base
      if (Math.random() > 0.5) {
        const dustMat = new THREE.MeshStandardMaterial({ color: 0x6a6050, transparent: true, opacity: 0.5, roughness: 1.0 });
        const dust = new THREE.Mesh(new THREE.SphereGeometry(0.3 + Math.random() * 0.4, 12, 8), dustMat);
        dust.scale.set(1.5, 0.2, 1.0);
        dust.position.set((Math.random() - 0.5) * rw * 0.3, 0.05, rd / 2 + 0.3);
        buildGroup.add(dust);
      }

      // Cobwebs in window corners
      if (bh > 2 && Math.random() > 0.5) {
        const webMat = new THREE.MeshStandardMaterial({ color: 0xcccccc, transparent: true, opacity: 0.1, roughness: 1.0, side: THREE.DoubleSide });
        const web = new THREE.Mesh(new THREE.PlaneGeometry(0.25, 0.3), webMat);
        web.position.set(-rw * 0.2 - 0.15, bh * 0.55 + 0.2, rd / 2 + 0.05);
        buildGroup.add(web);
      }

      buildGroup.position.set(rx, 0, rz);
      mctx.envGroup.add(buildGroup);
    }

    // ── Rubble Piles — scattered everywhere ──
    for (let rbi = 0; rbi < 100; rbi++) {
      const rbx = (Math.random() - 0.5) * w * 0.8;
      const rbz = (Math.random() - 0.5) * d * 0.8;
      const rbGroup = new THREE.Group();
      const rockCount = 4 + Math.floor(Math.random() * 6);
      for (let rci = 0; rci < rockCount; rci++) {
        const rockSize = 0.1 + Math.random() * 0.35;
        const rockCol = 0x5a5048 + Math.floor(Math.random() * 0x202020);
        const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(rockSize, 1), new THREE.MeshStandardMaterial({ color: rockCol, roughness: 0.9 }));
        rock.position.set((Math.random() - 0.5) * 1.5, rockSize * 0.4, (Math.random() - 0.5) * 1.5);
        rock.rotation.set(Math.random(), Math.random(), Math.random());
        rock.castShadow = true;
        rbGroup.add(rock);
      }
      // Dust flat disc under pile
      const dustDisc = new THREE.Mesh(new THREE.CircleGeometry(0.8 + Math.random() * 0.5, 10), new THREE.MeshStandardMaterial({ color: 0x5a5548, roughness: 1.0, side: THREE.DoubleSide, transparent: true, opacity: 0.4 }));
      dustDisc.rotation.x = -Math.PI / 2;
      dustDisc.position.y = 0.02;
      rbGroup.add(dustDisc);
      rbGroup.position.set(rbx, 0, rbz);
      mctx.envGroup.add(rbGroup);
    }

    // ── Collapsed Arches / Alleyway Connectors ──
    const archMat = new THREE.MeshStandardMaterial({ color: 0x706558, roughness: 0.88 });
    const archPositions: [number, number, number][] = [
      [0, -25, 0], [0, -10, 0], [0, 5, 0], [0, 20, 0],
      [-10, -20, Math.PI / 2], [-10, 0, Math.PI / 2], [-10, 15, Math.PI / 2],
      [10, -20, Math.PI / 2], [10, 0, Math.PI / 2], [10, 15, Math.PI / 2],
    ];
    for (const [ax, az, aRot] of archPositions) {
      const archGroup = new THREE.Group();
      for (const side of [-1, 1]) {
        // Pillar with capital and base molding
        const pillarGeo = new THREE.CylinderGeometry(0.25, 0.3, 4, 16);
        const pillar = new THREE.Mesh(pillarGeo, archMat);
        pillar.position.set(side * 2.5, 2, 0);
        pillar.castShadow = true;
        archGroup.add(pillar);
        // Capital
        const capital = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.25, 0.25, 16), archMat);
        capital.position.set(side * 2.5, 4.1, 0);
        archGroup.add(capital);
        // Base molding
        const baseMold = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.38, 0.2, 16), archMat);
        baseMold.position.set(side * 2.5, 0.1, 0);
        archGroup.add(baseMold);
      }
      // Arch top — curved TorusGeometry
      if (Math.random() > 0.25) {
        const archCurve = new THREE.Mesh(new THREE.TorusGeometry(2.5, 0.2, 8, 24, Math.PI), archMat);
        archCurve.position.set(0, 4.2, 0);
        archCurve.rotation.z = Math.PI / 2;
        archCurve.rotation.x = Math.PI / 2;
        archCurve.castShadow = true;
        archGroup.add(archCurve);
        // Keystone at top
        const keystone = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.4, 0.3), new THREE.MeshStandardMaterial({ color: 0x807568, roughness: 0.85 }));
        keystone.position.set(0, 6.65, 0);
        archGroup.add(keystone);
      }
      // Rubble at arch base
      for (let ari = 0; ari < 4; ari++) {
        const arub = new THREE.Mesh(new THREE.DodecahedronGeometry(0.12 + Math.random() * 0.15, 1), archMat);
        arub.position.set((Math.random() - 0.5) * 3, 0.1, (Math.random() - 0.5) * 1);
        arub.rotation.set(Math.random(), Math.random(), Math.random());
        archGroup.add(arub);
      }
      archGroup.rotation.y = aRot;
      archGroup.position.set(ax, 0, az);
      mctx.envGroup.add(archGroup);
    }

    // ── Broken Fountain (center) ──
    const fountainGroup = new THREE.Group();
    const ftnMat = new THREE.MeshStandardMaterial({ color: 0x706558, roughness: 0.85 });
    const fBase = new THREE.Mesh(new THREE.CylinderGeometry(2.5, 2.8, 0.5, 32), ftnMat);
    fBase.position.y = 0.25;
    fBase.receiveShadow = true;
    fountainGroup.add(fBase);
    // Decorative rim stones
    for (let rs = 0; rs < 16; rs++) {
      const rimAngle = (rs / 16) * Math.PI * 2;
      const rimStone = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.25, 0.2), ftnMat);
      rimStone.position.set(Math.cos(rimAngle) * 2.3, 0.62, Math.sin(rimAngle) * 2.3);
      rimStone.rotation.y = rimAngle;
      fountainGroup.add(rimStone);
    }
    // Low wall torus
    const fWall = new THREE.Mesh(new THREE.TorusGeometry(2.3, 0.15, 10, 32), ftnMat);
    fWall.rotation.x = Math.PI / 2;
    fWall.position.y = 0.75;
    fountainGroup.add(fWall);
    // Broken central pillar
    const fPillar = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.35, 2.5, 20), ftnMat);
    fPillar.position.y = 1.5;
    fPillar.rotation.z = 0.08;
    fPillar.castShadow = true;
    fountainGroup.add(fPillar);
    // Pillar decorative bands
    for (const by of [0.8, 1.6, 2.4]) {
      const band = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.03, 8, 16), ftnMat);
      band.rotation.x = Math.PI / 2;
      band.position.y = by;
      fountainGroup.add(band);
    }
    // Broken statue fragments
    const statMat = new THREE.MeshStandardMaterial({ color: 0x807568, roughness: 0.8 });
    const statTorso = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.25, 0.6, 12), statMat);
    statTorso.position.y = 3.1;
    statTorso.rotation.z = 0.15;
    fountainGroup.add(statTorso);
    // Fallen statue arm on ground
    const statArm = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 0.5, 10), statMat);
    statArm.position.set(1.5, 0.06, 0.8);
    statArm.rotation.z = Math.PI / 2;
    fountainGroup.add(statArm);
    // Fallen statue head
    const statHead = new THREE.Mesh(new THREE.SphereGeometry(0.18, 16, 14), statMat);
    statHead.position.set(-1.2, 0.18, -0.5);
    fountainGroup.add(statHead);
    // Stagnant water
    const waterMat2 = new THREE.MeshStandardMaterial({ color: 0x2a3a25, transparent: true, opacity: 0.55, roughness: 0.15, metalness: 0.15 });
    const ftnWater = new THREE.Mesh(new THREE.CircleGeometry(2.1, 32), waterMat2);
    ftnWater.rotation.x = -Math.PI / 2;
    ftnWater.position.y = 0.55;
    fountainGroup.add(ftnWater);
    // Algae patches on water
    for (let alg = 0; alg < 5; alg++) {
      const algae = new THREE.Mesh(new THREE.CircleGeometry(0.2 + Math.random() * 0.3, 8), new THREE.MeshStandardMaterial({ color: 0x3a5a20, transparent: true, opacity: 0.5, roughness: 0.8, side: THREE.DoubleSide }));
      algae.rotation.x = -Math.PI / 2;
      algae.position.set((Math.random() - 0.5) * 3, 0.56, (Math.random() - 0.5) * 3);
      fountainGroup.add(algae);
    }
    mctx.envGroup.add(fountainGroup);

    // ── Lampposts — broken, some still flickering ──
    const lampPositions: [number, number][] = [
      [-4, -25], [4, -25], [-4, -10], [4, -10],
      [-4, 5], [4, 5], [-4, 20], [4, 20],
      [-18, -18], [-18, 8], [18, -18], [18, 8],
      [-25, -5], [25, -5], [-25, 15], [25, 15],
    ];
    const lampMat = new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.7, metalness: 0.5 });
    for (let li = 0; li < lampPositions.length; li++) {
      const [lx, lz] = lampPositions[li];
      const lampGroup = new THREE.Group();
      const tilt = (Math.random() - 0.5) * 0.2;
      // Base plate
      const basePlate = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.22, 0.06, 12), lampMat);
      basePlate.position.y = 0.03;
      lampGroup.add(basePlate);
      // Pole
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.06, 3.5, 12), lampMat);
      pole.position.y = 1.75;
      pole.rotation.z = tilt;
      pole.castShadow = true;
      lampGroup.add(pole);
      // Decorative ring on pole
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.07, 0.015, 6, 12), lampMat);
      ring.rotation.x = Math.PI / 2;
      ring.position.y = 2.5;
      lampGroup.add(ring);
      // Curved arm (torus arc)
      const arm = new THREE.Mesh(new THREE.TorusGeometry(0.4, 0.02, 8, 12, Math.PI / 2), lampMat);
      arm.position.set(0.4, 3.35, 0);
      arm.rotation.z = -Math.PI / 2;
      lampGroup.add(arm);
      // Lantern cage with bars
      const cageBot = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.02, 0.22), lampMat);
      cageBot.position.set(0.8, 3.15, 0);
      lampGroup.add(cageBot);
      const cageTop = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.12, 6), lampMat);
      cageTop.position.set(0.8, 3.45, 0);
      lampGroup.add(cageTop);
      for (let cb = 0; cb < 4; cb++) {
        const cbar = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.28, 6), lampMat);
        const cba = (cb / 4) * Math.PI * 2;
        cbar.position.set(0.8 + Math.cos(cba) * 0.1, 3.3, Math.sin(cba) * 0.1);
        lampGroup.add(cbar);
      }
      // Some lampposts still glow
      if (Math.random() > 0.4) {
        const glowMat = new THREE.MeshStandardMaterial({ color: 0xffaa44, emissive: 0xff8822, emissiveIntensity: 0.7 });
        const glow = new THREE.Mesh(new THREE.SphereGeometry(0.06, 10, 10), glowMat);
        glow.position.set(0.8, 3.3, 0);
        lampGroup.add(glow);
        const light = new THREE.PointLight(0xff9933, 0.7, 14);
        light.position.set(lx + 0.8, 3.3, lz);
        mctx.scene.add(light);
        mctx.torchLights.push(light);
      }
      lampGroup.position.set(lx, 0, lz);
      mctx.envGroup.add(lampGroup);
    }

    // ── Cracked City Walls (perimeter) with buttresses ──
    const wallMat2 = new THREE.MeshStandardMaterial({ color: 0x5a5550, roughness: 0.9 });
    for (const zSide of [-hw + 2, hw - 2]) {
      for (let wx = -hw + 5; wx < hw - 5; wx += 12) {
        if (Math.random() > 0.25) {
          const wallH = 3 + Math.random() * 3;
          const wallW = 8 + Math.random() * 4;
          const wallGeo = new THREE.BoxGeometry(wallW, wallH, 1.2);
          const wall = new THREE.Mesh(wallGeo, wallMat2);
          wall.position.set(wx, wallH / 2, zSide);
          wall.castShadow = true;
          wall.receiveShadow = true;
          mctx.envGroup.add(wall);
          // Jagged top stones
          for (let ji = 0; ji < 5; ji++) {
            const jag = new THREE.Mesh(new THREE.BoxGeometry(0.4 + Math.random() * 0.6, 0.2 + Math.random() * 0.5, 1.2), wallMat2);
            jag.position.set(wx + (Math.random() - 0.5) * wallW * 0.7, wallH + 0.2, zSide);
            jag.castShadow = true;
            mctx.envGroup.add(jag);
          }
          // Buttress
          if (Math.random() > 0.5) {
            const buttGeo = new THREE.BoxGeometry(1, wallH * 0.7, 0.8);
            const butt = new THREE.Mesh(buttGeo, wallMat2);
            butt.position.set(wx + wallW * 0.3, wallH * 0.35, zSide + (zSide > 0 ? 0.8 : -0.8));
            butt.castShadow = true;
            mctx.envGroup.add(butt);
          }
          // Stone block lines
          for (let sl = 0; sl < Math.floor(wallH / 0.8); sl++) {
            const sLine = new THREE.Mesh(new THREE.BoxGeometry(wallW, 0.01, 0.01), new THREE.MeshStandardMaterial({ color: 0x4a4540, roughness: 1.0 }));
            sLine.position.set(wx, 0.4 + sl * 0.8, zSide + 0.61);
            mctx.envGroup.add(sLine);
          }
          // Moss patches on wall
          if (Math.random() > 0.5) {
            const moss = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 0.6), new THREE.MeshStandardMaterial({ color: 0x3a5530, transparent: true, opacity: 0.5, roughness: 0.9 }));
            moss.position.set(wx, 0.4, zSide + (zSide > 0 ? 0.62 : -0.62));
            mctx.envGroup.add(moss);
          }
        }
      }
    }
    for (const xSide of [-hw + 2, hw - 2]) {
      for (let wz = -hd + 5; wz < hd - 5; wz += 12) {
        if (Math.random() > 0.25) {
          const wallH = 3 + Math.random() * 3;
          const wallD = 8 + Math.random() * 4;
          const wall = new THREE.Mesh(new THREE.BoxGeometry(1.2, wallH, wallD), wallMat2);
          wall.position.set(xSide, wallH / 2, wz);
          wall.castShadow = true;
          wall.receiveShadow = true;
          mctx.envGroup.add(wall);
          for (let ji = 0; ji < 4; ji++) {
            const jag = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.2 + Math.random() * 0.5, 0.5 + Math.random() * 0.6), wallMat2);
            jag.position.set(xSide, wallH + 0.2, wz + (Math.random() - 0.5) * wallD * 0.6);
            jag.castShadow = true;
            mctx.envGroup.add(jag);
          }
        }
      }
    }

    // ── Collapsed Tower (landmark) ──
    const towerGroup = new THREE.Group();
    const towerMat = new THREE.MeshStandardMaterial({ color: 0x706558, roughness: 0.85 });
    const towerBase2 = new THREE.Mesh(new THREE.CylinderGeometry(2.5, 3, 8, 28, 1, true, 0, Math.PI * 1.5), towerMat);
    towerBase2.position.y = 4;
    towerBase2.castShadow = true;
    towerGroup.add(towerBase2);
    // Stone band detail
    for (const ty of [2, 4, 6]) {
      const tBand = new THREE.Mesh(new THREE.TorusGeometry(2.6, 0.06, 6, 28, Math.PI * 1.5), new THREE.MeshStandardMaterial({ color: 0x605548, roughness: 0.88 }));
      tBand.rotation.x = Math.PI / 2;
      tBand.position.y = ty;
      towerGroup.add(tBand);
    }
    // Arrow slits
    for (let as = 0; as < 4; as++) {
      const slitAngle = as * (Math.PI * 1.5 / 4) + 0.3;
      const slit = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.6, 0.15), new THREE.MeshStandardMaterial({ color: 0x1a1815, roughness: 1.0 }));
      slit.position.set(Math.cos(slitAngle) * 2.52, 5, Math.sin(slitAngle) * 2.52);
      slit.rotation.y = slitAngle + Math.PI / 2;
      towerGroup.add(slit);
    }
    const towerFloor = new THREE.Mesh(new THREE.CircleGeometry(2.5, 28), towerMat);
    towerFloor.rotation.x = -Math.PI / 2;
    towerFloor.position.y = 0.1;
    towerGroup.add(towerFloor);
    // Spiral stair remnant inside
    for (let ss = 0; ss < 6; ss++) {
      const stairAngle = ss * 0.8;
      const step = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.15, 0.5), towerMat);
      step.position.set(Math.cos(stairAngle) * 1.2, 0.5 + ss * 0.6, Math.sin(stairAngle) * 1.2);
      step.rotation.y = stairAngle;
      towerGroup.add(step);
    }
    // Fallen rubble ring
    for (let ti = 0; ti < 18; ti++) {
      const rbGeo = new THREE.DodecahedronGeometry(0.2 + Math.random() * 0.5, 1);
      const rb = new THREE.Mesh(rbGeo, new THREE.MeshStandardMaterial({ color: 0x605548, roughness: 0.9 }));
      const angle = Math.random() * Math.PI * 2;
      const dist = 3 + Math.random() * 4;
      rb.position.set(Math.cos(angle) * dist, 0.15 + Math.random() * 0.4, Math.sin(angle) * dist);
      rb.rotation.set(Math.random(), Math.random(), Math.random());
      rb.castShadow = true;
      towerGroup.add(rb);
    }
    towerGroup.position.set(-25, 0, -25);
    mctx.envGroup.add(towerGroup);

    // ── Second Collapsed Tower (opposite corner) ──
    const tower2 = new THREE.Group();
    const t2Base = new THREE.Mesh(new THREE.CylinderGeometry(2, 2.5, 5, 24, 1, true, 0, Math.PI * 1.2), towerMat);
    t2Base.position.y = 2.5;
    t2Base.castShadow = true;
    tower2.add(t2Base);
    const t2Floor = new THREE.Mesh(new THREE.CircleGeometry(2, 24), towerMat);
    t2Floor.rotation.x = -Math.PI / 2;
    t2Floor.position.y = 0.1;
    tower2.add(t2Floor);
    for (let ti = 0; ti < 10; ti++) {
      const rb = new THREE.Mesh(new THREE.DodecahedronGeometry(0.25 + Math.random() * 0.4, 1), new THREE.MeshStandardMaterial({ color: 0x605548, roughness: 0.9 }));
      const a = Math.random() * Math.PI * 2;
      rb.position.set(Math.cos(a) * (2.5 + Math.random() * 3), 0.2, Math.sin(a) * (2.5 + Math.random() * 3));
      rb.rotation.set(Math.random(), Math.random(), Math.random());
      tower2.add(rb);
    }
    tower2.position.set(25, 0, 25);
    mctx.envGroup.add(tower2);

    // ── Dead Trees with detailed bark and roots ──
    const deadTreeMat = new THREE.MeshStandardMaterial({ color: 0x3a3028, roughness: 0.9 });
    for (let dti = 0; dti < 18; dti++) {
      const dtx = (Math.random() - 0.5) * w * 0.8;
      const dtz = (Math.random() - 0.5) * d * 0.8;
      const dtGroup = new THREE.Group();
      const trunkH = 2 + Math.random() * 3;
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.18, trunkH, 10), deadTreeMat);
      trunk.position.y = trunkH / 2;
      trunk.rotation.z = (Math.random() - 0.5) * 0.2;
      trunk.castShadow = true;
      dtGroup.add(trunk);
      // Bark rings
      for (let bk = 0; bk < 3; bk++) {
        const barkRing = new THREE.Mesh(new THREE.TorusGeometry(0.1 + bk * 0.01, 0.015, 6, 10), deadTreeMat);
        barkRing.rotation.x = Math.PI / 2;
        barkRing.position.y = 0.5 + bk * (trunkH * 0.25);
        dtGroup.add(barkRing);
      }
      // Exposed roots
      for (let rt = 0; rt < 3; rt++) {
        const rootAngle = rt * (Math.PI * 2 / 3) + Math.random() * 0.5;
        const root = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.04, 0.6, 6), deadTreeMat);
        root.position.set(Math.cos(rootAngle) * 0.25, 0.15, Math.sin(rootAngle) * 0.25);
        root.rotation.z = rootAngle + Math.PI / 2;
        root.rotation.x = 0.5;
        dtGroup.add(root);
      }
      // Bare branches with sub-branches
      for (let br = 0; br < 4; br++) {
        const brLen = 0.6 + Math.random() * 1.5;
        const branch = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.04, brLen, 6), deadTreeMat);
        const brAngle = Math.random() * Math.PI * 2;
        const brY = trunkH * (0.5 + Math.random() * 0.4);
        branch.position.set(Math.cos(brAngle) * 0.2, brY, Math.sin(brAngle) * 0.2);
        branch.rotation.z = (Math.random() - 0.5) * 1.5;
        branch.rotation.y = brAngle;
        dtGroup.add(branch);
        // Sub-branch
        if (Math.random() > 0.4) {
          const subLen = 0.3 + Math.random() * 0.4;
          const sub = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.015, subLen, 5), deadTreeMat);
          sub.position.set(Math.cos(brAngle) * 0.5, brY + brLen * 0.3, Math.sin(brAngle) * 0.5);
          sub.rotation.z = (Math.random() - 0.5) * 1.0;
          dtGroup.add(sub);
        }
      }
      // Knot detail
      if (Math.random() > 0.5) {
        const knot = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 6), new THREE.MeshStandardMaterial({ color: 0x2a2018, roughness: 0.95 }));
        knot.position.set(0.1, trunkH * 0.4, 0);
        dtGroup.add(knot);
      }
      dtGroup.position.set(dtx, 0, dtz);
      mctx.envGroup.add(dtGroup);
    }

    // ── Barrels and Crates — detailed with bands, nails, lids ──
    for (let pi = 0; pi < 55; pi++) {
      const px = (Math.random() - 0.5) * w * 0.7;
      const pz = (Math.random() - 0.5) * d * 0.7;
      const r = Math.random();
      if (r < 0.35) {
        const barrelGroup = new THREE.Group();
        const barrelGeo = new THREE.CylinderGeometry(0.3, 0.3, 0.7, 20);
        const barrelMesh = new THREE.Mesh(barrelGeo, new THREE.MeshStandardMaterial({ color: 0x6B4226, roughness: 0.85 }));
        barrelMesh.position.y = 0.35;
        if (Math.random() > 0.6) { barrelMesh.rotation.x = Math.PI / 2; barrelMesh.position.y = 0.3; }
        barrelMesh.castShadow = true;
        barrelGroup.add(barrelMesh);
        for (const by of [0.12, 0.35, 0.58]) {
          const band = new THREE.Mesh(new THREE.TorusGeometry(0.31, 0.012, 6, 20), new THREE.MeshStandardMaterial({ color: 0x444444, metalness: 0.5, roughness: 0.6 }));
          band.rotation.x = Math.PI / 2;
          band.position.y = by;
          barrelGroup.add(band);
        }
        // Lid circle
        const lid = new THREE.Mesh(new THREE.CircleGeometry(0.28, 16), new THREE.MeshStandardMaterial({ color: 0x5a3a1a, roughness: 0.9, side: THREE.DoubleSide }));
        lid.rotation.x = -Math.PI / 2;
        lid.position.y = 0.7;
        barrelGroup.add(lid);
        barrelGroup.position.set(px, 0, pz);
        mctx.envGroup.add(barrelGroup);
      } else if (r < 0.6) {
        const crateSize = 0.35 + Math.random() * 0.3;
        const crateGroup = new THREE.Group();
        const crate = new THREE.Mesh(new THREE.BoxGeometry(crateSize, crateSize, crateSize), new THREE.MeshStandardMaterial({ color: 0x8B6914, roughness: 0.85 }));
        crate.position.y = crateSize / 2;
        crate.castShadow = true;
        crateGroup.add(crate);
        // Plank lines
        for (let pl = 0; pl < 3; pl++) {
          const plank = new THREE.Mesh(new THREE.BoxGeometry(crateSize + 0.01, 0.01, 0.01), new THREE.MeshStandardMaterial({ color: 0x5a4a14, roughness: 1.0 }));
          plank.position.set(0, crateSize * 0.2 + pl * crateSize * 0.3, crateSize / 2 + 0.005);
          crateGroup.add(plank);
        }
        // Corner nails
        for (const nx of [-crateSize * 0.4, crateSize * 0.4]) {
          for (const ny of [crateSize * 0.2, crateSize * 0.8]) {
            const nail = new THREE.Mesh(new THREE.SphereGeometry(0.012, 6, 6), new THREE.MeshStandardMaterial({ color: 0x444444, metalness: 0.6, roughness: 0.4 }));
            nail.position.set(nx, ny, crateSize / 2 + 0.01);
            crateGroup.add(nail);
          }
        }
        crateGroup.rotation.y = Math.random() * Math.PI;
        crateGroup.position.set(px, 0, pz);
        mctx.envGroup.add(crateGroup);
      } else if (r < 0.75) {
        // Overturned cart
        const cartGroup = new THREE.Group();
        const platform = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.08, 0.8), new THREE.MeshStandardMaterial({ color: 0x6B4226, roughness: 0.85 }));
        platform.position.y = 0.3;
        platform.rotation.z = 0.4;
        cartGroup.add(platform);
        for (const [wx2, wz2] of [[-0.5, -0.35], [0.5, -0.35], [-0.5, 0.35], [0.5, 0.35]] as [number, number][]) {
          const wheel = new THREE.Mesh(new THREE.TorusGeometry(0.15, 0.025, 6, 16), new THREE.MeshStandardMaterial({ color: 0x4a3a1a, roughness: 0.8 }));
          wheel.position.set(wx2, 0.15, wz2);
          cartGroup.add(wheel);
          // Spokes
          for (let sp = 0; sp < 4; sp++) {
            const spoke = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.005, 0.28, 4), new THREE.MeshStandardMaterial({ color: 0x4a3a1a, roughness: 0.8 }));
            spoke.rotation.z = sp * (Math.PI / 4);
            spoke.position.set(wx2, 0.15, wz2);
            cartGroup.add(spoke);
          }
        }
        cartGroup.position.set(px, 0, pz);
        cartGroup.rotation.y = Math.random() * Math.PI;
        mctx.envGroup.add(cartGroup);
      } else {
        // Sack
        const sack = new THREE.Mesh(new THREE.SphereGeometry(0.2, 10, 8), new THREE.MeshStandardMaterial({ color: 0x998866, roughness: 0.9 }));
        sack.scale.set(1.0, 0.6, 0.8);
        sack.position.set(px, 0.12, pz);
        mctx.envGroup.add(sack);
      }
    }

    // ── Gargoyle fragments on buildings ──
    const gargoyleMat = new THREE.MeshStandardMaterial({ color: 0x606058, roughness: 0.85 });
    for (let gi = 0; gi < 6; gi++) {
      const gGroup = new THREE.Group();
      // Body
      const body = new THREE.Mesh(new THREE.ConeGeometry(0.15, 0.4, 12), gargoyleMat);
      body.rotation.z = Math.PI / 2;
      gGroup.add(body);
      // Head
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.1, 12, 10), gargoyleMat);
      head.position.set(0.25, 0.05, 0);
      gGroup.add(head);
      // Wings (small stubs - broken)
      for (const wside of [-1, 1]) {
        const wing = new THREE.Mesh(new THREE.PlaneGeometry(0.15, 0.12), gargoyleMat);
        wing.position.set(-0.05, 0.08, wside * 0.12);
        wing.rotation.y = wside * 0.5;
        gGroup.add(wing);
      }
      // Perch bracket
      const bracket = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.04, 0.12), gargoyleMat);
      bracket.position.set(-0.2, -0.12, 0);
      gGroup.add(bracket);
      const gx = (Math.random() - 0.5) * w * 0.5;
      const gz = (Math.random() - 0.5) * d * 0.5;
      // Some on ground (fallen), some on walls
      if (Math.random() > 0.5) {
        gGroup.position.set(gx, 0.15, gz);
        gGroup.rotation.z = Math.PI / 2 + (Math.random() - 0.5) * 0.5;
      } else {
        gGroup.position.set(gx, 2 + Math.random() * 3, gz);
      }
      mctx.envGroup.add(gGroup);
    }

    // ── Scattered Banners / Torn Flags ──
    const bannerColors = [0x882222, 0x884422, 0x668822, 0x224488, 0x882266];
    for (let bi = 0; bi < 10; bi++) {
      const bx = (Math.random() - 0.5) * w * 0.5;
      const bz = (Math.random() - 0.5) * d * 0.5;
      const bannerGroup = new THREE.Group();
      const bPole = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.03, 4, 8), new THREE.MeshStandardMaterial({ color: 0x553322, roughness: 0.8 }));
      bPole.position.y = 2;
      bPole.rotation.z = (Math.random() - 0.5) * 0.3;
      bannerGroup.add(bPole);
      // Pole tip (ornament)
      const tip = new THREE.Mesh(new THREE.SphereGeometry(0.04, 8, 6), new THREE.MeshStandardMaterial({ color: 0x888844, metalness: 0.4, roughness: 0.5 }));
      tip.position.y = 4;
      bannerGroup.add(tip);
      const clothMat = new THREE.MeshStandardMaterial({ color: bannerColors[bi % bannerColors.length], roughness: 0.8, side: THREE.DoubleSide, transparent: true, opacity: 0.75 });
      const clothH = 0.8 + Math.random() * 1.0;
      const cloth = new THREE.Mesh(new THREE.PlaneGeometry(0.5, clothH), clothMat);
      cloth.position.set(0.1, 3.5 - clothH / 2, 0);
      cloth.rotation.z = -0.15;
      bannerGroup.add(cloth);
      // Torn bottom edge (irregular triangle cut)
      const tearMat = new THREE.MeshStandardMaterial({ color: bannerColors[bi % bannerColors.length], roughness: 0.8, side: THREE.DoubleSide, transparent: true, opacity: 0.6 });
      const tear = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.15), tearMat);
      tear.position.set(0.15, 3.5 - clothH - 0.05, 0);
      tear.rotation.z = -0.3;
      bannerGroup.add(tear);
      bannerGroup.position.set(bx, 0, bz);
      mctx.envGroup.add(bannerGroup);
    }

    // ── Skull Piles ──
    const skullMat = new THREE.MeshStandardMaterial({ color: 0xccbbaa, roughness: 0.85 });
    for (let ski = 0; ski < 5; ski++) {
      const skGroup = new THREE.Group();
      const skullCount = 3 + Math.floor(Math.random() * 4);
      for (let si = 0; si < skullCount; si++) {
        const skull = new THREE.Mesh(new THREE.SphereGeometry(0.1 + Math.random() * 0.06, 12, 10), skullMat);
        skull.position.set((Math.random() - 0.5) * 0.4, 0.1 + si * 0.06, (Math.random() - 0.5) * 0.4);
        skGroup.add(skull);
        // Jaw
        const jaw = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.04, 0.06), skullMat);
        jaw.position.set(skull.position.x, skull.position.y - 0.08, skull.position.z + 0.06);
        skGroup.add(jaw);
      }
      // Scattered bones
      for (let bi2 = 0; bi2 < 4; bi2++) {
        const bone = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.02, 0.3 + Math.random() * 0.3, 8), skullMat);
        bone.position.set((Math.random() - 0.5) * 0.6, 0.03, (Math.random() - 0.5) * 0.6);
        bone.rotation.set(Math.random(), Math.random(), Math.PI / 2);
        skGroup.add(bone);
      }
      skGroup.position.set((Math.random() - 0.5) * w * 0.5, 0, (Math.random() - 0.5) * d * 0.5);
      mctx.envGroup.add(skGroup);
    }

    // ── Puddles ──
    const puddleMat = new THREE.MeshStandardMaterial({ color: 0x3a4045, transparent: true, opacity: 0.4, roughness: 0.1, metalness: 0.2, side: THREE.DoubleSide });
    for (let pdi = 0; pdi < 15; pdi++) {
      const puddle = new THREE.Mesh(new THREE.CircleGeometry(0.4 + Math.random() * 0.8, 16), puddleMat);
      puddle.rotation.x = -Math.PI / 2;
      puddle.position.set((Math.random() - 0.5) * w * 0.6, 0.04, (Math.random() - 0.5) * d * 0.6);
      mctx.envGroup.add(puddle);
    }

    // ── Ash / Soot patches ──
    const ashMat = new THREE.MeshStandardMaterial({ color: 0x2a2520, roughness: 1.0, side: THREE.DoubleSide, transparent: true, opacity: 0.35 });
    for (let ai = 0; ai < 40; ai++) {
      const ash = new THREE.Mesh(new THREE.CircleGeometry(0.8 + Math.random() * 2, 14), ashMat);
      ash.rotation.x = -Math.PI / 2;
      ash.position.set((Math.random() - 0.5) * w * 0.7, 0.035, (Math.random() - 0.5) * d * 0.7);
      mctx.envGroup.add(ash);
    }

    // ── Glowing Rune Circle (mysterious) ──
    const runeGlow = new THREE.Mesh(new THREE.TorusGeometry(1.2, 0.04, 12, 36), new THREE.MeshStandardMaterial({ color: 0x44ff44, emissive: 0x44ff44, emissiveIntensity: 0.8, transparent: true, opacity: 0.6 }));
    runeGlow.rotation.x = Math.PI / 2;
    runeGlow.position.set(15, 0.05, -15);
    mctx.envGroup.add(runeGlow);
    // Rune symbols inside circle
    for (let rs2 = 0; rs2 < 4; rs2++) {
      const rune = new THREE.Mesh(new THREE.PlaneGeometry(0.06, 0.8), new THREE.MeshStandardMaterial({ color: 0x44ff44, emissive: 0x44ff44, emissiveIntensity: 0.6, side: THREE.DoubleSide }));
      rune.rotation.x = -Math.PI / 2;
      rune.rotation.z = rs2 * (Math.PI / 4);
      rune.position.set(15, 0.06, -15);
      mctx.envGroup.add(rune);
    }
    const runeLight = new THREE.PointLight(0x44ff44, 0.4, 8);
    runeLight.position.set(15, 0.5, -15);
    mctx.scene.add(runeLight);
    mctx.torchLights.push(runeLight);

    // ── Wall-mounted torch brackets ──
    for (let ti2 = 0; ti2 < 10; ti2++) {
      const tx = (Math.random() - 0.5) * w * 0.5;
      const tz = (Math.random() - 0.5) * d * 0.5;
      const torchGroup = new THREE.Group();
      const bracket2 = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.05, 0.05), new THREE.MeshStandardMaterial({ color: 0x444444, metalness: 0.5, roughness: 0.6 }));
      bracket2.position.y = 2.5;
      torchGroup.add(bracket2);
      const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.5, 8), new THREE.MeshStandardMaterial({ color: 0x553322, roughness: 0.8 }));
      handle.position.set(0.15, 2.75, 0);
      torchGroup.add(handle);
      // Flame glow
      if (Math.random() > 0.3) {
        const flame = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 8), new THREE.MeshStandardMaterial({ color: 0xff6622, emissive: 0xff4400, emissiveIntensity: 1.0 }));
        flame.position.set(0.15, 3.05, 0);
        torchGroup.add(flame);
        const tLight = new THREE.PointLight(0xff6622, 0.5, 8);
        tLight.position.set(tx + 0.15, 3.05, tz);
        mctx.scene.add(tLight);
        mctx.torchLights.push(tLight);
      }
      torchGroup.position.set(tx, 0, tz);
      mctx.envGroup.add(torchGroup);
    }

    // ── Detailed Gargoyles perched on ruins (full necropolis style) ──
    const gargoyleStoneMat = new THREE.MeshStandardMaterial({ color: 0x606058, roughness: 0.85 });
    const gargDarkMat2 = new THREE.MeshStandardMaterial({ color: 0x1a1a18, roughness: 0.95 });
    for (let ggi = 0; ggi < 8; ggi++) {
      const gg = new THREE.Group();
      // Head
      const gHead = new THREE.Mesh(new THREE.SphereGeometry(0.1, 20, 18), gargoyleStoneMat);
      gHead.position.set(0, 0.15, 0.12);
      gg.add(gHead);
      // Horns
      for (const hs of [-1, 1]) {
        const horn = new THREE.Mesh(new THREE.ConeGeometry(0.018, 0.08, 8), gargoyleStoneMat);
        horn.position.set(hs * 0.05, 0.24, 0.1);
        horn.rotation.z = hs * 0.4;
        horn.rotation.x = -0.2;
        gg.add(horn);
      }
      // Pointed ears
      for (const es of [-1, 1]) {
        const ear = new THREE.Mesh(new THREE.ConeGeometry(0.014, 0.05, 6), gargoyleStoneMat);
        ear.position.set(es * 0.09, 0.18, 0.1);
        ear.rotation.z = es * 0.7;
        gg.add(ear);
      }
      // Snout
      const snout = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.07, 8), gargoyleStoneMat);
      snout.position.set(0, 0.12, 0.2);
      snout.rotation.x = -Math.PI / 2;
      gg.add(snout);
      // Eye sockets
      for (const eyeS of [-1, 1]) {
        const eye = new THREE.Mesh(new THREE.CircleGeometry(0.015, 10), gargDarkMat2);
        eye.position.set(eyeS * 0.035, 0.17, 0.2);
        gg.add(eye);
      }
      // Body
      const gBody = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.28, 16), gargoyleStoneMat);
      gBody.position.set(0, -0.02, 0.08);
      gBody.rotation.x = -0.15;
      gg.add(gBody);
      // Folded wings with ridge
      for (const ws of [-1, 1]) {
        const wing = new THREE.Mesh(new THREE.PlaneGeometry(0.18, 0.15), gargoyleStoneMat);
        wing.position.set(ws * 0.1, 0.05, 0.06);
        wing.rotation.y = ws * 0.3;
        wing.rotation.z = ws * 0.5;
        gg.add(wing);
        const wRidge = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.006, 0.018), gargoyleStoneMat);
        wRidge.position.set(ws * 0.12, 0.08, 0.06);
        wRidge.rotation.z = ws * 0.6;
        gg.add(wRidge);
      }
      // Clawed feet (3 per side)
      for (const fs of [-1, 1]) {
        for (let ci2 = 0; ci2 < 3; ci2++) {
          const claw = new THREE.Mesh(new THREE.ConeGeometry(0.007, 0.035, 6), gargoyleStoneMat);
          claw.position.set(fs * 0.05 + (ci2 - 1) * 0.014, -0.15, 0.1 + ci2 * 0.006);
          claw.rotation.x = Math.PI;
          gg.add(claw);
        }
      }
      // Perch bracket
      const perch = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.05, 0.14), gargoyleStoneMat);
      perch.position.set(0, -0.1, 0.04);
      gg.add(perch);
      const gx2 = -30 + ggi * 8 + (Math.random() - 0.5) * 3;
      const gz2 = (Math.random() > 0.5 ? 1 : -1) * (15 + Math.random() * 15);
      gg.position.set(gx2, 3 + Math.random() * 4, gz2);
      gg.rotation.y = Math.random() * Math.PI * 2;
      mctx.envGroup.add(gg);
    }

    // ── Crumbling Edge Detail on wall tops ──
    const crumbleMat2 = new THREE.MeshStandardMaterial({ color: 0x5a5550, roughness: 0.9 });
    for (let cei = 0; cei < 30; cei++) {
      const ceg = new THREE.Group();
      // Larger fallen blocks
      for (let fb = 0; fb < 2 + Math.floor(Math.random() * 3); fb++) {
        const block = new THREE.Mesh(new THREE.BoxGeometry(0.18 + Math.random() * 0.15, 0.12 + Math.random() * 0.1, 0.14), crumbleMat2);
        block.position.set((Math.random() - 0.5) * 1.5, 0.08, (Math.random() - 0.5) * 0.5);
        block.rotation.set(Math.random() * 0.3, Math.random() * 0.3, Math.random() * 0.3);
        block.castShadow = true;
        ceg.add(block);
      }
      // Smaller debris
      for (let sd = 0; sd < 5 + Math.floor(Math.random() * 4); sd++) {
        const debris = new THREE.Mesh(new THREE.SphereGeometry(0.02 + Math.random() * 0.03, 8, 6), new THREE.MeshStandardMaterial({ color: 0x5a5548 + Math.floor(Math.random() * 0x101010), roughness: 1.0 }));
        debris.position.set((Math.random() - 0.5) * 2, 0.03, (Math.random() - 0.5) * 1);
        ceg.add(debris);
      }
      // Dust pile
      const dustPile = new THREE.Mesh(new THREE.SphereGeometry(0.15 + Math.random() * 0.1, 12, 10), new THREE.MeshStandardMaterial({ color: 0x5a5548, roughness: 1.0, transparent: true, opacity: 0.3 }));
      dustPile.scale.set(1.5, 0.2, 1.0);
      dustPile.position.y = 0.02;
      ceg.add(dustPile);
      // Cobweb strands
      if (Math.random() > 0.5) {
        const webMat2 = new THREE.MeshStandardMaterial({ color: 0x888888, transparent: true, opacity: 0.1, side: THREE.DoubleSide, roughness: 0.3 });
        const web1 = new THREE.Mesh(new THREE.PlaneGeometry(0.2, 0.25), webMat2);
        web1.position.set(0, 0.15, 0);
        web1.rotation.z = Math.random() * 0.5;
        ceg.add(web1);
        const web2 = new THREE.Mesh(new THREE.PlaneGeometry(0.12, 0.3), webMat2);
        web2.position.set(0.05, 0.15, 0);
        web2.rotation.z = 0.5 + Math.random() * 0.5;
        ceg.add(web2);
      }
      // Exposed brick
      for (let eb = 0; eb < 3; eb++) {
        const expBrick = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.05, 0.04), new THREE.MeshStandardMaterial({ color: 0x8a5540, roughness: 0.9 }));
        expBrick.position.set((Math.random() - 0.5) * 0.8, 0.12 + Math.random() * 0.1, (Math.random() - 0.5) * 0.3);
        ceg.add(expBrick);
      }
      ceg.position.set((Math.random() - 0.5) * w * 0.7, 0, (Math.random() - 0.5) * d * 0.7);
      mctx.envGroup.add(ceg);
    }

    // ── Bone Piles (fuller necropolis style) ──
    const boneMat2 = new THREE.MeshStandardMaterial({ color: 0xddddbb, roughness: 0.9 });
    for (let bpi = 0; bpi < 10; bpi++) {
      const bp = new THREE.Group();
      // Individual bones
      for (let bn = 0; bn < 6; bn++) {
        const bone = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.03, 0.4 + Math.random() * 0.3, 16), boneMat2);
        bone.position.set((Math.random() - 0.5) * 0.5, 0.08, (Math.random() - 0.5) * 0.5);
        bone.rotation.z = Math.random() * Math.PI;
        bone.rotation.y = Math.random() * Math.PI;
        bp.add(bone);
      }
      // Fragments
      for (let fr = 0; fr < 4; fr++) {
        const frag = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.015, 0.1 + Math.random() * 0.12, 12), boneMat2);
        frag.position.set((Math.random() - 0.5) * 0.6, 0.04, (Math.random() - 0.5) * 0.6);
        frag.rotation.set(Math.random(), Math.random(), Math.PI / 2);
        bp.add(frag);
      }
      // Joint knobs
      for (let jk = 0; jk < 3 + Math.floor(Math.random() * 3); jk++) {
        const knob = new THREE.Mesh(new THREE.SphereGeometry(0.02 + Math.random() * 0.015, 10, 8), boneMat2);
        knob.position.set((Math.random() - 0.5) * 0.5, 0.06, (Math.random() - 0.5) * 0.5);
        bp.add(knob);
      }
      // Rib cage arcs
      if (Math.random() > 0.4) {
        for (let rb2 = 0; rb2 < 3; rb2++) {
          const rib = new THREE.Mesh(new THREE.TorusGeometry(0.08, 0.008, 6, 10, Math.PI * 0.7), boneMat2);
          rib.position.set(0, 0.04 + rb2 * 0.03, rb2 * 0.02);
          rib.rotation.y = Math.random() * 0.5;
          bp.add(rib);
        }
      }
      bp.position.set((Math.random() - 0.5) * w * 0.5, 0, (Math.random() - 0.5) * d * 0.5);
      mctx.envGroup.add(bp);
    }

    // ── Dripping Water Pools with droplets ──
    for (let dwp = 0; dwp < 10; dwp++) {
      const poolGrp = new THREE.Group();
      const poolR = 0.3 + Math.random() * 0.5;
      const pool = new THREE.Mesh(new THREE.CircleGeometry(poolR, 24), new THREE.MeshStandardMaterial({ color: 0x223344, transparent: true, opacity: 0.4, roughness: 0.1, metalness: 0.3, side: THREE.DoubleSide }));
      pool.rotation.x = -Math.PI / 2;
      pool.position.y = 0.03;
      poolGrp.add(pool);
      const droplet = new THREE.Mesh(new THREE.SphereGeometry(0.025, 14, 12), new THREE.MeshStandardMaterial({ color: 0x335566, transparent: true, opacity: 0.5, roughness: 0.1 }));
      droplet.position.y = 0.5 + Math.random() * 1.5;
      poolGrp.add(droplet);
      poolGrp.position.set((Math.random() - 0.5) * w * 0.5, 0, (Math.random() - 0.5) * d * 0.5);
      mctx.envGroup.add(poolGrp);
    }

    // ── Chain Mechanisms hanging from arches ──
    const ironMat2 = new THREE.MeshStandardMaterial({ color: 0x444444, metalness: 0.6, roughness: 0.4 });
    for (let chi = 0; chi < 12; chi++) {
      const chainGrp = new THREE.Group();
      const linkCount = 4 + Math.floor(Math.random() * 5);
      for (let cl = 0; cl < linkCount; cl++) {
        const link = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.015, 8, 12), ironMat2);
        link.position.y = -cl * 0.12;
        link.rotation.x = cl % 2 === 0 ? 0 : Math.PI / 2;
        chainGrp.add(link);
      }
      // Hook at bottom
      const hook = new THREE.Mesh(new THREE.TorusGeometry(0.04, 0.01, 6, 10, Math.PI * 1.5), ironMat2);
      hook.position.y = -linkCount * 0.12 - 0.05;
      chainGrp.add(hook);
      chainGrp.position.set((Math.random() - 0.5) * w * 0.4, 3.5 + Math.random() * 2, (Math.random() - 0.5) * d * 0.4);
      mctx.envGroup.add(chainGrp);
    }

    // ── Broken Clock Face on collapsed tower ──
    const clockGrp = new THREE.Group();
    const clockR = 1.5;
    const clockFace = new THREE.Mesh(new THREE.CircleGeometry(clockR, 44), new THREE.MeshStandardMaterial({ color: 0xeeddcc, roughness: 0.4, side: THREE.DoubleSide }));
    clockGrp.add(clockFace);
    const clockRim = new THREE.Mesh(new THREE.TorusGeometry(clockR, 0.08, 16, 44), new THREE.MeshStandardMaterial({ color: 0x886622, metalness: 0.5, roughness: 0.35 }));
    clockGrp.add(clockRim);
    // Hour markers
    for (let hm = 0; hm < 12; hm++) {
      const ha = (hm / 12) * Math.PI * 2;
      const marker = new THREE.Mesh(new THREE.BoxGeometry(0.05, clockR * 0.12, 0.02), new THREE.MeshStandardMaterial({ color: 0x333333, metalness: 0.4, roughness: 0.5 }));
      marker.position.set(Math.sin(ha) * clockR * 0.82, Math.cos(ha) * clockR * 0.82, 0.02);
      marker.rotation.z = -ha;
      clockGrp.add(marker);
    }
    // Hands (frozen in time)
    const hourHand = new THREE.Mesh(new THREE.BoxGeometry(0.04, clockR * 0.5, 0.02), new THREE.MeshStandardMaterial({ color: 0x222222, metalness: 0.5, roughness: 0.4 }));
    hourHand.position.set(0, clockR * 0.25, 0.03);
    hourHand.rotation.z = -1.2;
    clockGrp.add(hourHand);
    const minHand = new THREE.Mesh(new THREE.BoxGeometry(0.025, clockR * 0.7, 0.02), new THREE.MeshStandardMaterial({ color: 0x222222, metalness: 0.5, roughness: 0.4 }));
    minHand.position.set(0, clockR * 0.35, 0.04);
    minHand.rotation.z = -2.8;
    clockGrp.add(minHand);
    // Center hub
    const clockHub = new THREE.Mesh(new THREE.SphereGeometry(0.08, 16, 14), new THREE.MeshStandardMaterial({ color: 0x886622, metalness: 0.5, roughness: 0.35 }));
    clockHub.position.z = 0.04;
    clockGrp.add(clockHub);
    // Crack across face
    const clockCrack = new THREE.Mesh(new THREE.BoxGeometry(0.02, clockR * 1.4, 0.005), new THREE.MeshStandardMaterial({ color: 0x333322, roughness: 1.0, side: THREE.DoubleSide }));
    clockCrack.rotation.z = 0.7;
    clockCrack.position.z = 0.01;
    clockGrp.add(clockCrack);
    clockGrp.position.set(-25, 6, -25);
    clockGrp.rotation.y = 0.5;
    mctx.envGroup.add(clockGrp);

    // ── Iron Cages (hanging and standing) ──
    for (let ici = 0; ici < 4; ici++) {
      const cage = new THREE.Group();
      const cageW = 0.6 + Math.random() * 0.3;
      const cageH = 0.8 + Math.random() * 0.4;
      // Top and bottom frames
      const cTop = new THREE.Mesh(new THREE.BoxGeometry(cageW, 0.05, cageW), ironMat2);
      cTop.position.y = cageH;
      cage.add(cTop);
      const cBot = new THREE.Mesh(new THREE.BoxGeometry(cageW, 0.05, cageW), ironMat2);
      cage.add(cBot);
      // 8 vertical bars arranged in circle
      for (let cb2 = 0; cb2 < 8; cb2++) {
        const bAngle = (cb2 / 8) * Math.PI * 2;
        const bar2 = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, cageH, 10), ironMat2);
        bar2.position.set(Math.cos(bAngle) * cageW * 0.4, cageH / 2, Math.sin(bAngle) * cageW * 0.4);
        cage.add(bar2);
      }
      // Skull inside (alternating)
      if (ici % 2 === 0) {
        const cSkull = new THREE.Mesh(new THREE.SphereGeometry(0.1, 14, 12), new THREE.MeshStandardMaterial({ color: 0xccbbaa, roughness: 0.85 }));
        cSkull.position.y = 0.15;
        cage.add(cSkull);
        const cJaw = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.04, 0.06), new THREE.MeshStandardMaterial({ color: 0xccbbaa, roughness: 0.85 }));
        cJaw.position.set(0, 0.07, 0.05);
        cage.add(cJaw);
      }
      // Hanging chain above cage
      for (let cl2 = 0; cl2 < 3; cl2++) {
        const link2 = new THREE.Mesh(new THREE.TorusGeometry(0.04, 0.01, 6, 10), ironMat2);
        link2.position.y = cageH + 0.1 + cl2 * 0.08;
        link2.rotation.x = cl2 % 2 === 0 ? 0 : Math.PI / 2;
        cage.add(link2);
      }
      cage.position.set((Math.random() - 0.5) * w * 0.4, Math.random() > 0.5 ? 2.5 + Math.random() * 2 : 0, (Math.random() - 0.5) * d * 0.4);
      mctx.envGroup.add(cage);
    }

    // ── Weapon Racks on walls ──
    for (let wri = 0; wri < 6; wri++) {
      const wrGroup = new THREE.Group();
      const backboard = new THREE.Mesh(new THREE.BoxGeometry(1.5, 1.8, 0.08), new THREE.MeshStandardMaterial({ color: 0x5a4a3a, roughness: 0.85 }));
      backboard.position.y = 1.5;
      wrGroup.add(backboard);
      // Sword silhouettes
      for (let sw = 0; sw < 3; sw++) {
        const blade = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.8 + Math.random() * 0.3, 0.02), new THREE.MeshStandardMaterial({ color: 0x888888, metalness: 0.5, roughness: 0.4 }));
        blade.position.set(-0.4 + sw * 0.4, 1.6, 0.05);
        wrGroup.add(blade);
        const guard = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.03, 0.03), new THREE.MeshStandardMaterial({ color: 0x666622, metalness: 0.4, roughness: 0.5 }));
        guard.position.set(-0.4 + sw * 0.4, 1.15, 0.05);
        wrGroup.add(guard);
        const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.15, 8), new THREE.MeshStandardMaterial({ color: 0x553322, roughness: 0.8 }));
        grip.position.set(-0.4 + sw * 0.4, 1.0, 0.05);
        wrGroup.add(grip);
      }
      // Mounting pegs
      for (let mp = 0; mp < 4; mp++) {
        const peg = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.1, 8), new THREE.MeshStandardMaterial({ color: 0x444444, metalness: 0.4, roughness: 0.5 }));
        peg.rotation.x = Math.PI / 2;
        peg.position.set(-0.5 + mp * 0.35, 1.2, 0.06);
        wrGroup.add(peg);
      }
      wrGroup.position.set((Math.random() - 0.5) * w * 0.4, 0, (Math.random() - 0.5) * d * 0.4);
      wrGroup.rotation.y = Math.random() * Math.PI * 2;
      mctx.envGroup.add(wrGroup);
    }

    // ── Chandeliers (fallen, on ground) ──
    for (let ch2i = 0; ch2i < 4; ch2i++) {
      const chandGrp = new THREE.Group();
      const ringR = 0.4 + Math.random() * 0.3;
      const chandRing = new THREE.Mesh(new THREE.TorusGeometry(ringR, 0.03, 12, 24), ironMat2);
      chandRing.rotation.x = Math.PI / 2 + (Math.random() - 0.5) * 0.4;
      chandRing.position.y = 0.05;
      chandGrp.add(chandRing);
      // Candle stubs
      for (let cs2 = 0; cs2 < 6; cs2++) {
        const csAngle = (cs2 / 6) * Math.PI * 2;
        const stub = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.025, 0.08, 8), new THREE.MeshStandardMaterial({ color: 0xeeddbb, roughness: 0.7 }));
        stub.position.set(Math.cos(csAngle) * ringR, 0.12, Math.sin(csAngle) * ringR);
        chandGrp.add(stub);
      }
      // Broken chain links
      for (let bcl = 0; bcl < 3; bcl++) {
        const bLink = new THREE.Mesh(new THREE.TorusGeometry(0.03, 0.008, 6, 8), ironMat2);
        bLink.position.set((Math.random() - 0.5) * 0.3, 0.08 + bcl * 0.06, (Math.random() - 0.5) * 0.3);
        bLink.rotation.x = bcl % 2 === 0 ? 0 : Math.PI / 2;
        chandGrp.add(bLink);
      }
      chandGrp.position.set((Math.random() - 0.5) * w * 0.4, 0, (Math.random() - 0.5) * d * 0.4);
      mctx.envGroup.add(chandGrp);
    }

    // ── Broken Stained Glass fragments on ground ──
    const glassColors = [0xff4444, 0x4444ff, 0x44ff44, 0xffff44, 0xff44ff, 0x44ffff];
    for (let sgi = 0; sgi < 20; sgi++) {
      const shardW = 0.08 + Math.random() * 0.15;
      const shardH = 0.06 + Math.random() * 0.12;
      const shard = new THREE.Mesh(new THREE.PlaneGeometry(shardW, shardH), new THREE.MeshStandardMaterial({
        color: glassColors[Math.floor(Math.random() * glassColors.length)],
        transparent: true, opacity: 0.4 + Math.random() * 0.3,
        roughness: 0.15, metalness: 0.1, side: THREE.DoubleSide,
      }));
      shard.rotation.x = -Math.PI / 2 + (Math.random() - 0.5) * 0.3;
      shard.rotation.z = Math.random() * Math.PI;
      shard.position.set((Math.random() - 0.5) * w * 0.4, 0.04, (Math.random() - 0.5) * d * 0.4);
      mctx.envGroup.add(shard);
    }

    // ── Heraldic Shield Emblems on wall fragments ──
    for (let hei = 0; hei < 6; hei++) {
      const shieldGrp = new THREE.Group();
      const shield = new THREE.Mesh(new THREE.CircleGeometry(0.2, 24), new THREE.MeshStandardMaterial({ color: 0xddaa22, roughness: 0.4, metalness: 0.5, side: THREE.DoubleSide }));
      shieldGrp.add(shield);
      const shieldRing = new THREE.Mesh(new THREE.RingGeometry(0.17, 0.2, 24), new THREE.MeshStandardMaterial({ color: 0xbb9922, roughness: 0.35, metalness: 0.6, side: THREE.DoubleSide }));
      shieldRing.position.z = 0.005;
      shieldGrp.add(shieldRing);
      // Heraldic cross
      const hV = new THREE.Mesh(new THREE.PlaneGeometry(0.04, 0.25), new THREE.MeshStandardMaterial({ color: 0xcc2222, roughness: 0.5, side: THREE.DoubleSide }));
      hV.position.z = 0.01;
      shieldGrp.add(hV);
      const hH = new THREE.Mesh(new THREE.PlaneGeometry(0.25, 0.04), new THREE.MeshStandardMaterial({ color: 0xcc2222, roughness: 0.5, side: THREE.DoubleSide }));
      hH.position.z = 0.01;
      shieldGrp.add(hH);
      shieldGrp.position.set((Math.random() - 0.5) * w * 0.5, 2 + Math.random() * 3, (Math.random() - 0.5) * d * 0.5);
      shieldGrp.rotation.y = Math.random() * Math.PI * 2;
      mctx.envGroup.add(shieldGrp);
    }

    // ── More cobweb clusters in corners ──
    for (let cwi = 0; cwi < 25; cwi++) {
      const webCluster = new THREE.Group();
      const cwMat = new THREE.MeshStandardMaterial({ color: 0xaaaaaa, transparent: true, opacity: 0.08 + Math.random() * 0.06, side: THREE.DoubleSide, roughness: 0.2 });
      for (let ws2 = 0; ws2 < 3; ws2++) {
        const strand = new THREE.Mesh(new THREE.PlaneGeometry(0.2 + Math.random() * 0.3, 0.15 + Math.random() * 0.25), cwMat);
        strand.rotation.z = ws2 * 0.8 + Math.random() * 0.5;
        strand.position.set(ws2 * 0.05, ws2 * 0.05, 0);
        webCluster.add(strand);
      }
      webCluster.position.set((Math.random() - 0.5) * w * 0.6, 1.5 + Math.random() * 3, (Math.random() - 0.5) * d * 0.6);
      webCluster.rotation.y = Math.random() * Math.PI;
      mctx.envGroup.add(webCluster);
    }
}

export function buildCity(mctx: MapBuildContext, w: number, d: number): void {
    mctx.scene.fog = new THREE.FogExp2(0x6e7280, 0.01);
    mctx.applyTerrainColors(0x4a4e58, 0x5e626c, 0.4);
    mctx.dirLight.color.setHex(0xddeeff);
    mctx.dirLight.intensity = 1.1;
    mctx.dirLight.position.set(14, 22, 10);
    mctx.ambientLight.color.setHex(0x3a3e48);
    mctx.ambientLight.intensity = 0.55;
    mctx.hemiLight.color.setHex(0x8899aa);
    mctx.hemiLight.groundColor.setHex(0x3a3530);
    mctx.hemiLight.intensity = 0.5;

    const hw = w / 2;
    const hd = d / 2;

    // ── Cobblestone Streets with tile grid and mortar ──
    const stoneColors = [0x7a7570, 0x8a8580, 0x6a6560, 0x9a9590, 0x888380, 0x787270];
    const mainStreet = new THREE.Mesh(new THREE.BoxGeometry(7, 0.05, d * 0.85), new THREE.MeshStandardMaterial({ color: 0x7a7570, roughness: 0.88 }));
    mainStreet.position.set(0, 0.03, 0);
    mainStreet.receiveShadow = true;
    mctx.envGroup.add(mainStreet);

    for (const zOff of [-22, -8, 8, 22]) {
      const cross = new THREE.Mesh(new THREE.BoxGeometry(w * 0.7, 0.05, 5), new THREE.MeshStandardMaterial({ color: stoneColors[Math.floor(Math.random() * stoneColors.length)], roughness: 0.88 }));
      cross.position.set(0, 0.03, zOff);
      cross.receiveShadow = true;
      mctx.envGroup.add(cross);
    }

    // Individual tiles on main street
    const tileSize = 1.0;
    const tileGeo = new THREE.BoxGeometry(tileSize - 0.05, 0.022, tileSize - 0.05);
    for (let tx = -3; tx <= 3; tx += tileSize) {
      for (let tz = -hw + 5; tz <= hw - 5; tz += tileSize) {
        const tileMat = new THREE.MeshStandardMaterial({ color: stoneColors[Math.floor(Math.random() * stoneColors.length)], roughness: 0.85 + Math.random() * 0.1 });
        const tile = new THREE.Mesh(tileGeo, tileMat);
        tile.position.set(tx, 0.06, tz);
        tile.receiveShadow = true;
        mctx.envGroup.add(tile);
      }
    }

    // Cobblestone circles with mortar
    for (let ci = 0; ci < 300; ci++) {
      const cbR = 0.1 + Math.random() * 0.1;
      const cobble = new THREE.Mesh(new THREE.CircleGeometry(cbR, 10), new THREE.MeshStandardMaterial({ color: stoneColors[ci % stoneColors.length], roughness: 0.92, side: THREE.DoubleSide }));
      cobble.rotation.x = -Math.PI / 2;
      const cx = (Math.random() - 0.5) * w * 0.7;
      const cz = (Math.random() - 0.5) * d * 0.7;
      cobble.position.set(cx, 0.065, cz);
      mctx.envGroup.add(cobble);
      if (Math.random() > 0.6) {
        const mortar = new THREE.Mesh(new THREE.BoxGeometry(cbR * 2, 0.003, 0.01), new THREE.MeshStandardMaterial({ color: 0x4a4540, roughness: 1.0 }));
        mortar.rotation.y = Math.random() * Math.PI;
        mortar.position.set(cx, 0.063, cz);
        mctx.envGroup.add(mortar);
      }
    }

    // ── Market Square (center, 18×18) ──
    const market = new THREE.Mesh(new THREE.BoxGeometry(18, 0.06, 18), new THREE.MeshStandardMaterial({ color: 0x9a9590, roughness: 0.82 }));
    market.position.set(0, 0.02, 0);
    market.receiveShadow = true;
    mctx.envGroup.add(market);

    // Market square border stones
    const borderMat = new THREE.MeshStandardMaterial({ color: 0x706860, roughness: 0.9 });
    for (let bi2 = -9; bi2 <= 9; bi2 += 1.5) {
      for (const bz of [-9, 9]) {
        const b = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.08, 0.3), borderMat);
        b.position.set(bi2, 0.06, bz);
        mctx.envGroup.add(b);
      }
      for (const bx of [-9, 9]) {
        const b = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.08, 1.3), borderMat);
        b.position.set(bx, 0.06, bi2);
        mctx.envGroup.add(b);
      }
    }

    // Market stalls (8) with detailed supports, brackets, and wares
    const stallColors = [0xaa3333, 0x3366aa, 0x33aa66, 0xaaaa33, 0xaa6633, 0x6633aa, 0x33aaaa, 0xaa3366];
    const stallPositions: [number, number, number][] = [
      [-6, -6, 0], [-2, -6, 0], [2, -6, 0], [6, -6, 0],
      [-6, 6, Math.PI], [-2, 6, Math.PI], [2, 6, Math.PI], [6, 6, Math.PI],
    ];
    const woodMat = new THREE.MeshStandardMaterial({ color: 0x6B4226, roughness: 0.85 });
    for (let si = 0; si < stallPositions.length; si++) {
      const [sx, sz, sRot] = stallPositions[si];
      const stallGroup = new THREE.Group();
      for (const [ppx, ppz] of [[-0.8, -0.6], [0.8, -0.6], [-0.8, 0.6], [0.8, 0.6]] as [number, number][]) {
        const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 2.5, 12), woodMat);
        pole.position.set(ppx, 1.25, ppz);
        pole.castShadow = true;
        stallGroup.add(pole);
      }
      // Cross bracing
      const crossBrace = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 2.0, 6), woodMat);
      crossBrace.rotation.z = 0.9;
      crossBrace.position.set(0, 1.25, -0.6);
      stallGroup.add(crossBrace);

      const canvasMat = new THREE.MeshStandardMaterial({ color: stallColors[si], roughness: 0.7, side: THREE.DoubleSide });
      const canvas = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.05, 1.6), canvasMat);
      canvas.position.set(0, 2.5, 0);
      stallGroup.add(canvas);
      // Scalloped valance trim
      for (let ei = 0; ei < 8; ei++) {
        const scallop = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.15, 4), canvasMat);
        scallop.position.set(-0.8 + ei * 0.25, 2.42, 0.8);
        scallop.rotation.x = Math.PI;
        stallGroup.add(scallop);
      }
      // Fringe below scallops
      for (let fri = 0; fri < 6; fri++) {
        const fringe = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.06, 0.01), canvasMat);
        fringe.position.set(-0.6 + fri * 0.25, 2.35, 0.8);
        stallGroup.add(fringe);
      }

      // Counter with bracket supports
      const counter = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.08, 0.8), woodMat);
      counter.position.set(0, 1.0, 0);
      stallGroup.add(counter);
      for (const cbx of [-0.7, 0.7]) {
        const bracket = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.3, 0.06), woodMat);
        bracket.position.set(cbx, 0.8, 0);
        stallGroup.add(bracket);
        // Metal ring on bracket
        const ring = new THREE.Mesh(new THREE.TorusGeometry(0.04, 0.008, 6, 10), new THREE.MeshStandardMaterial({ color: 0x555555, metalness: 0.5, roughness: 0.5 }));
        ring.position.set(cbx, 0.9, 0.04);
        stallGroup.add(ring);
      }

      // Wares on counter (more variety)
      for (let wi = 0; wi < 5; wi++) {
        const wr = Math.random();
        let wareMesh: THREE.Mesh;
        if (wr < 0.3) {
          wareMesh = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 0.12), new THREE.MeshStandardMaterial({ color: Math.random() * 0xffffff, roughness: 0.6 }));
        } else if (wr < 0.6) {
          wareMesh = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 8), new THREE.MeshStandardMaterial({ color: Math.random() * 0xffffff, roughness: 0.5 }));
        } else {
          wareMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.15, 8), new THREE.MeshStandardMaterial({ color: Math.random() * 0xffffff, roughness: 0.6 }));
        }
        wareMesh.position.set(-0.6 + wi * 0.3, 1.12, (Math.random() - 0.5) * 0.4);
        stallGroup.add(wareMesh);
      }

      stallGroup.rotation.y = sRot;
      stallGroup.position.set(sx, 0, sz);
      mctx.envGroup.add(stallGroup);
    }

    // ── Central Fountain with ornate detail ──
    const fountainGroup = new THREE.Group();
    const fMat = new THREE.MeshStandardMaterial({ color: 0x889098, roughness: 0.75 });
    const fBase = new THREE.Mesh(new THREE.CylinderGeometry(2.0, 2.3, 0.6, 8), fMat);
    fBase.position.y = 0.3;
    fBase.receiveShadow = true;
    fountainGroup.add(fBase);
    // Step ring
    const fStep = new THREE.Mesh(new THREE.CylinderGeometry(2.5, 2.6, 0.15, 8), fMat);
    fStep.position.y = 0.08;
    fountainGroup.add(fStep);
    // Basin torus
    const fWall = new THREE.Mesh(new THREE.TorusGeometry(1.8, 0.12, 10, 8), fMat);
    fWall.rotation.x = Math.PI / 2;
    fWall.position.y = 0.65;
    fountainGroup.add(fWall);
    // Decorative lion heads (4 around basin)
    for (let lh = 0; lh < 4; lh++) {
      const lhAngle = lh * (Math.PI / 2) + Math.PI / 4;
      const lionHead = new THREE.Mesh(new THREE.SphereGeometry(0.12, 12, 10), fMat);
      lionHead.position.set(Math.cos(lhAngle) * 1.82, 0.65, Math.sin(lhAngle) * 1.82);
      fountainGroup.add(lionHead);
      // Mane
      const mane = new THREE.Mesh(new THREE.SphereGeometry(0.15, 10, 8), fMat);
      mane.scale.set(1, 0.7, 0.5);
      mane.position.set(Math.cos(lhAngle) * 1.92, 0.68, Math.sin(lhAngle) * 1.92);
      fountainGroup.add(mane);
    }
    // Column (fluted)
    const fCol = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.25, 3, 16), fMat);
    fCol.position.y = 1.8;
    fCol.castShadow = true;
    fountainGroup.add(fCol);
    // Column bands
    for (const cby of [1.0, 2.0, 3.0]) {
      const cBand = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.025, 6, 12), fMat);
      cBand.rotation.x = Math.PI / 2;
      cBand.position.y = cby;
      fountainGroup.add(cBand);
    }
    // Sword ornament on top
    const swordMat = new THREE.MeshStandardMaterial({ color: 0xcccccc, metalness: 0.6, roughness: 0.3 });
    const fSword = new THREE.Mesh(new THREE.BoxGeometry(0.06, 1.2, 0.03), swordMat);
    fSword.position.y = 3.9;
    fountainGroup.add(fSword);
    const fGuard = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.05, 0.05), swordMat);
    fGuard.position.y = 3.35;
    fountainGroup.add(fGuard);
    // Pommel
    const fPommel = new THREE.Mesh(new THREE.SphereGeometry(0.04, 8, 8), swordMat);
    fPommel.position.y = 3.25;
    fountainGroup.add(fPommel);
    // Water
    const fWater = new THREE.Mesh(new THREE.CircleGeometry(1.7, 24), new THREE.MeshStandardMaterial({ color: 0x4488aa, transparent: true, opacity: 0.45, roughness: 0.08, metalness: 0.25 }));
    fWater.rotation.x = -Math.PI / 2;
    fWater.position.y = 0.62;
    fountainGroup.add(fWater);
    mctx.envGroup.add(fountainGroup);

    // ── Buildings — forming streets and alleyways ──
    const houseColors = [0x8a8070, 0x7a7568, 0x9a9080, 0x706860, 0x888078, 0x6a6558];
    const roofColors = [0x664433, 0x553322, 0x774444, 0x335566, 0x445533, 0x554444];

    const buildingPositions: [number, number, number, number][] = [
      [-10, -28, 3.5, 4], [-10, -21, 3, 3.5], [-10, -14, 3.5, 4],
      [-10, -4, 3, 3], [-10, 4, 3.5, 4], [-10, 11, 3, 3.5],
      [-10, 18, 3.5, 4], [-10, 25, 3, 3],
      [10, -28, 3.5, 4], [10, -21, 3, 3.5], [10, -14, 3.5, 4],
      [10, -4, 3, 3], [10, 4, 3.5, 4], [10, 11, 3, 3.5],
      [10, 18, 3.5, 4], [10, 25, 3, 3],
      [-18, -26, 3, 3], [-18, -18, 2.5, 3], [-18, -10, 3, 3.5],
      [-18, -2, 2.5, 3], [-18, 6, 3, 3], [-18, 14, 2.5, 3.5],
      [-18, 22, 3, 3],
      [18, -26, 3, 3], [18, -18, 2.5, 3], [18, -10, 3, 3.5],
      [18, -2, 2.5, 3], [18, 6, 3, 3], [18, 14, 2.5, 3.5],
      [18, 22, 3, 3],
      [-26, -24, 4, 3], [-26, -14, 3, 4], [-26, -4, 4, 3],
      [-26, 8, 3, 4], [-26, 18, 4, 3],
      [26, -24, 4, 3], [26, -14, 3, 4], [26, -4, 4, 3],
      [26, 8, 3, 4], [26, 18, 4, 3],
      [-6, -32, 3, 3], [0, -32, 2.5, 3], [6, -32, 3, 3],
      [-6, 32, 3, 3], [0, 32, 2.5, 3], [6, 32, 3, 3],
    ];

    for (let bi = 0; bi < buildingPositions.length; bi++) {
      const [bx, bz, bw, bd] = buildingPositions[bi];
      const bh = 3.5 + Math.random() * 2.5;
      const buildGroup = new THREE.Group();

      const wallColor = houseColors[bi % houseColors.length];
      const wallMat = new THREE.MeshStandardMaterial({ color: wallColor, roughness: 0.85 });
      const base = new THREE.Mesh(new THREE.BoxGeometry(bw, bh, bd), wallMat);
      base.position.y = bh / 2;
      base.castShadow = true;
      base.receiveShadow = true;
      buildGroup.add(base);

      // Peaked roof
      const roofColor = roofColors[bi % roofColors.length];
      const roofW = bw + 0.4;
      const roofD = bd + 0.4;
      const roofH = 1.2 + Math.random() * 0.8;
      const slopeLen = Math.sqrt(roofD * roofD / 4 + roofH * roofH);
      const roofAngle = Math.atan2(roofD / 2, roofH);
      const roofMat = new THREE.MeshStandardMaterial({ color: roofColor, roughness: 0.7, side: THREE.DoubleSide });
      const roofL = new THREE.Mesh(new THREE.PlaneGeometry(roofW, slopeLen), roofMat);
      roofL.position.set(0, bh + roofH / 2, -roofD / 4);
      roofL.rotation.x = roofAngle;
      buildGroup.add(roofL);
      const roofR = new THREE.Mesh(new THREE.PlaneGeometry(roofW, slopeLen), roofMat);
      roofR.position.set(0, bh + roofH / 2, roofD / 4);
      roofR.rotation.x = -roofAngle;
      buildGroup.add(roofR);
      const gShape = new THREE.Shape();
      gShape.moveTo(-roofD / 2, 0);
      gShape.lineTo(0, roofH);
      gShape.lineTo(roofD / 2, 0);
      gShape.closePath();
      const gGeo = new THREE.ShapeGeometry(gShape);
      const gMat = new THREE.MeshStandardMaterial({ color: roofColor, roughness: 0.7, side: THREE.DoubleSide });
      for (const gx of [-roofW / 2, roofW / 2]) {
        const gable = new THREE.Mesh(gGeo, gMat);
        gable.rotation.y = Math.PI / 2;
        gable.position.set(gx, bh, 0);
        buildGroup.add(gable);
      }
      const ridge = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, roofW, 10), new THREE.MeshStandardMaterial({ color: roofColor, roughness: 0.7 }));
      ridge.rotation.z = Math.PI / 2;
      ridge.position.set(0, bh + roofH, 0);
      buildGroup.add(ridge);
      // Eaves trim
      for (const ez of [-roofD / 2, roofD / 2]) {
        const eave = new THREE.Mesh(new THREE.BoxGeometry(roofW, 0.04, 0.08), roofMat);
        eave.position.set(0, bh - 0.02, ez);
        buildGroup.add(eave);
      }

      // Windows with arch tops, frames, sills, shutters
      const winMat = new THREE.MeshStandardMaterial({ color: 0xffdd88, emissive: 0xffdd88, emissiveIntensity: 0.45, roughness: 0.3 });
      const frameMat = new THREE.MeshStandardMaterial({ color: 0x553322, roughness: 0.8 });
      for (let wni = 0; wni < 2; wni++) {
        const wx = -bw * 0.2 + wni * bw * 0.4;
        const wy = bh * 0.6;
        for (const wz of [bd / 2 + 0.03, -bd / 2 - 0.03]) {
          // Window glow
          const win = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.45, 0.05), winMat);
          win.position.set(wx, wy, wz);
          buildGroup.add(win);
          // Arch top
          const arch = new THREE.Mesh(new THREE.TorusGeometry(0.18, 0.02, 8, 16, Math.PI), new THREE.MeshStandardMaterial({ color: 0x555048, roughness: 0.88 }));
          arch.position.set(wx, wy + 0.22, wz + (wz > 0 ? 0.01 : -0.01));
          buildGroup.add(arch);
          // Frame — lintel, sill, posts
          const lintel = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.05, 0.04), frameMat);
          lintel.position.set(wx, wy + 0.25, wz);
          buildGroup.add(lintel);
          const sill = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.035, 0.1), frameMat);
          sill.position.set(wx, wy - 0.25, wz > 0 ? wz + 0.03 : wz - 0.03);
          buildGroup.add(sill);
          for (const sx of [-0.2, 0.2]) {
            const post = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.45, 0.04), frameMat);
            post.position.set(wx + sx, wy, wz);
            buildGroup.add(post);
          }
          // Shutters
          for (const sx2 of [-0.22, 0.22]) {
            const shutter = new THREE.Mesh(new THREE.PlaneGeometry(0.1, 0.45), frameMat);
            shutter.position.set(wx + sx2, wy, wz > 0 ? wz + 0.01 : wz - 0.01);
            buildGroup.add(shutter);
          }
          // Mullion cross
          const vMull = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.4, 0.012), frameMat);
          vMull.position.set(wx, wy, wz > 0 ? wz + 0.015 : wz - 0.015);
          buildGroup.add(vMull);
          const hMull = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.012, 0.012), frameMat);
          hMull.position.set(wx, wy, wz > 0 ? wz + 0.015 : wz - 0.015);
          buildGroup.add(hMull);
        }
      }

      // Door with detailed frame, handle, keyhole, step
      const doorMat = new THREE.MeshStandardMaterial({ color: 0x553322, roughness: 0.8 });
      const door = new THREE.Mesh(new THREE.BoxGeometry(0.6, 1.3, 0.06), doorMat);
      door.position.set(0, 0.65, bd / 2 + 0.03);
      buildGroup.add(door);
      const dfMat = new THREE.MeshStandardMaterial({ color: 0x443322, roughness: 0.85 });
      const lintel = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.7, 10), dfMat);
      lintel.rotation.z = Math.PI / 2;
      lintel.position.set(0, 1.32, bd / 2 + 0.04);
      buildGroup.add(lintel);
      for (const dpx of [-0.32, 0.32]) {
        const dPost = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 1.3, 8), dfMat);
        dPost.position.set(dpx, 0.65, bd / 2 + 0.04);
        buildGroup.add(dPost);
      }
      // Door handle (torus ring)
      const handle = new THREE.Mesh(new THREE.TorusGeometry(0.025, 0.006, 6, 10), new THREE.MeshStandardMaterial({ color: 0x888844, metalness: 0.5, roughness: 0.4 }));
      handle.position.set(0.18, 0.7, bd / 2 + 0.065);
      buildGroup.add(handle);
      // Keyhole
      const keyhole = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.018, 0.01), new THREE.MeshStandardMaterial({ color: 0x111111 }));
      keyhole.position.set(0.18, 0.62, bd / 2 + 0.065);
      buildGroup.add(keyhole);
      // Doorstep
      const doorstep = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.04, 0.15), new THREE.MeshStandardMaterial({ color: 0x666658, roughness: 0.9 }));
      doorstep.position.set(0, 0.02, bd / 2 + 0.1);
      buildGroup.add(doorstep);

      // Quoin cornerstones
      const quoinMat = new THREE.MeshStandardMaterial({ color: 0x777766, roughness: 0.85 });
      for (const [qx, qz] of [[-bw / 2, bd / 2], [bw / 2, bd / 2], [-bw / 2, -bd / 2], [bw / 2, -bd / 2]] as [number, number][]) {
        for (let qi = 0; qi < Math.ceil(bh / 1.5); qi++) {
          const quoin = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.28, 0.16), quoinMat);
          quoin.position.set(qx, 0.2 + qi * (bh / Math.ceil(bh / 1.5)), qz);
          buildGroup.add(quoin);
        }
      }

      // Timber framing (half-timbered style) on front & back
      const beamMat = new THREE.MeshStandardMaterial({ color: 0x5A3A1A, roughness: 0.85 });
      for (const faceZ of [bd / 2 + 0.04, -bd / 2 - 0.04]) {
        // Horizontal beams
        for (const by of [bh * 0.35, bh * 0.65, bh - 0.1]) {
          const hBeam = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, bw + 0.2, 8), beamMat);
          hBeam.rotation.z = Math.PI / 2;
          hBeam.position.set(0, by, faceZ);
          buildGroup.add(hBeam);
        }
        // Vertical posts
        for (const vx of [-bw / 2 + 0.03, 0, bw / 2 - 0.03]) {
          const vBeam = new THREE.Mesh(new THREE.BoxGeometry(0.05, bh, 0.05), beamMat);
          vBeam.position.set(vx, bh / 2, faceZ);
          buildGroup.add(vBeam);
        }
        // Diagonal braces
        if (Math.random() > 0.4) {
          const braceLen = Math.sqrt((bw * 0.3) ** 2 + (bh * 0.25) ** 2);
          for (const bsx of [-1, 1]) {
            const brace = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, braceLen, 6), beamMat);
            brace.rotation.z = bsx > 0 ? Math.atan2(bh * 0.25, bw * 0.3) : -Math.atan2(bh * 0.25, bw * 0.3);
            brace.position.set(bsx * bw * 0.2, bh * 0.5, faceZ);
            buildGroup.add(brace);
          }
        }
      }

      // Stone block lines on side walls
      for (let li = 0; li < Math.floor(bh / 0.8); li++) {
        const ly = 0.4 + li * 0.8;
        for (const fx of [bw / 2 + 0.04, -bw / 2 - 0.04]) {
          const sLine = new THREE.Mesh(new THREE.BoxGeometry(0.006, 0.01, bd + 0.02), new THREE.MeshStandardMaterial({ color: 0x5a5550, roughness: 1.0 }));
          sLine.position.set(fx, ly, 0);
          buildGroup.add(sLine);
        }
      }

      // Chimney with cap, smoke, and brick lines
      if (bi % 3 === 0) {
        const chimMat = new THREE.MeshStandardMaterial({ color: 0x665544, roughness: 0.9 });
        const chim = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.16, 1.5, 14), chimMat);
        chim.position.set(bw * 0.25, bh + roofH + 0.3, -bd * 0.2);
        chim.castShadow = true;
        buildGroup.add(chim);
        // Cap
        const chimCap = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.14, 0.08, 14), chimMat);
        chimCap.position.set(bw * 0.25, bh + roofH + 1.08, -bd * 0.2);
        buildGroup.add(chimCap);
        // Brick lines
        for (let cl = 0; cl < 3; cl++) {
          const cLine = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.008, 0.008), chimMat);
          cLine.position.set(bw * 0.25, bh + roofH + cl * 0.4, -bd * 0.2 + 0.14);
          buildGroup.add(cLine);
        }
        // Smoke wisps
        for (let sm = 0; sm < 3; sm++) {
          const smoke = new THREE.Mesh(new THREE.SphereGeometry(0.1 + sm * 0.06, 8, 8), new THREE.MeshStandardMaterial({ color: 0x888888, transparent: true, opacity: 0.15 - sm * 0.04, roughness: 1.0 }));
          smoke.position.set(bw * 0.25 + sm * 0.05, bh + roofH + 1.3 + sm * 0.3, -bd * 0.2);
          buildGroup.add(smoke);
        }
      }

      // Flower boxes with stems, petals, pistils
      if (Math.random() > 0.55) {
        const fbMat = new THREE.MeshStandardMaterial({ color: 0x6B4226, roughness: 0.85 });
        const flowerBox = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.1, 0.12), fbMat);
        flowerBox.position.set(0, bh * 0.6 - 0.3, bd / 2 + 0.09);
        buildGroup.add(flowerBox);
        // Corner posts on box
        for (const fbx of [-0.24, 0.24]) {
          const fbPost = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.14, 0.03), fbMat);
          fbPost.position.set(fbx, bh * 0.6 - 0.3, bd / 2 + 0.09);
          buildGroup.add(fbPost);
        }
        for (let fi = 0; fi < 4; fi++) {
          const flowerColor = [0xff6688, 0xffaa44, 0xff4466, 0xaa66ff, 0xff88cc][Math.floor(Math.random() * 5)];
          // Stem
          const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.12, 5), new THREE.MeshStandardMaterial({ color: 0x338822, roughness: 0.8 }));
          stem.position.set(-0.18 + fi * 0.12, bh * 0.6 - 0.18, bd / 2 + 0.09);
          buildGroup.add(stem);
          // Flower head (multiple petals)
          const pistil = new THREE.Mesh(new THREE.SphereGeometry(0.012, 8, 6), new THREE.MeshStandardMaterial({ color: 0xffff44, roughness: 0.5 }));
          pistil.position.set(-0.18 + fi * 0.12, bh * 0.6 - 0.11, bd / 2 + 0.09);
          buildGroup.add(pistil);
          for (let pi2 = 0; pi2 < 4; pi2++) {
            const petal = new THREE.Mesh(new THREE.SphereGeometry(0.015, 6, 6), new THREE.MeshStandardMaterial({ color: flowerColor, emissive: flowerColor, emissiveIntensity: 0.15, roughness: 0.6 }));
            const pAngle = pi2 * (Math.PI / 2);
            petal.scale.set(1.4, 0.5, 1.0);
            petal.position.set(-0.18 + fi * 0.12 + Math.cos(pAngle) * 0.02, bh * 0.6 - 0.11, bd / 2 + 0.09 + Math.sin(pAngle) * 0.02);
            buildGroup.add(petal);
          }
        }
      }

      // Hanging sign (some buildings)
      if (Math.random() > 0.7) {
        const signGroup = new THREE.Group();
        const signPost = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.5, 6), new THREE.MeshStandardMaterial({ color: 0x444444, metalness: 0.4, roughness: 0.6 }));
        signPost.rotation.z = Math.PI / 2;
        signPost.position.set(0, bh * 0.45, bd / 2 + 0.15);
        signGroup.add(signPost);
        // Sign board
        const signBoard = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.2, 0.02), new THREE.MeshStandardMaterial({ color: 0x6B4226, roughness: 0.85 }));
        signBoard.position.set(0.25, bh * 0.45 - 0.15, bd / 2 + 0.15);
        signGroup.add(signBoard);
        // Chain links
        for (let ch = 0; ch < 2; ch++) {
          const chain = new THREE.Mesh(new THREE.TorusGeometry(0.015, 0.004, 4, 6), new THREE.MeshStandardMaterial({ color: 0x555555, metalness: 0.5, roughness: 0.5 }));
          chain.position.set(0.15 + ch * 0.2, bh * 0.45 - 0.06, bd / 2 + 0.15);
          chain.rotation.y = ch * (Math.PI / 2);
          signGroup.add(chain);
        }
        buildGroup.add(signGroup);
      }

      // Balcony (tall buildings)
      if (bh > 4.5 && Math.random() > 0.5) {
        const balcMat = new THREE.MeshStandardMaterial({ color: 0x5A3A1A, roughness: 0.85 });
        const balcFloor = new THREE.Mesh(new THREE.BoxGeometry(bw * 0.6, 0.04, 0.4), balcMat);
        balcFloor.position.set(0, bh * 0.7, bd / 2 + 0.2);
        buildGroup.add(balcFloor);
        // Railing posts
        for (let rp = 0; rp < 5; rp++) {
          const post = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.4, 6), balcMat);
          post.position.set(-bw * 0.25 + rp * (bw * 0.6 / 4), bh * 0.7 + 0.22, bd / 2 + 0.38);
          buildGroup.add(post);
        }
        // Railing bar
        const railBar = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, bw * 0.6, 6), balcMat);
        railBar.rotation.z = Math.PI / 2;
        railBar.position.set(0, bh * 0.7 + 0.42, bd / 2 + 0.38);
        buildGroup.add(railBar);
        // Support brackets
        for (const sbx of [-bw * 0.25, bw * 0.25]) {
          const bracket = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.15, 0.06), balcMat);
          bracket.position.set(sbx, bh * 0.7 - 0.1, bd / 2 + 0.15);
          bracket.rotation.z = 0.3;
          buildGroup.add(bracket);
        }
      }

      // Foundation stones
      const foundMat = new THREE.MeshStandardMaterial({ color: 0x555548, roughness: 0.92 });
      for (let fi = 0; fi < 8; fi++) {
        const fStone = new THREE.Mesh(new THREE.DodecahedronGeometry(0.08 + Math.random() * 0.06, 1), foundMat);
        const fAngle = (fi / 8) * Math.PI * 2;
        fStone.position.set(Math.cos(fAngle) * (bw / 2), 0.07, Math.sin(fAngle) * (bd / 2));
        buildGroup.add(fStone);
      }

      buildGroup.position.set(bx, 0, bz);
      mctx.envGroup.add(buildGroup);
    }

    // ── City Walls with crenellations, arrow slits, buttresses, stone lines ──
    const wallMat2 = new THREE.MeshStandardMaterial({ color: 0x6a6860, roughness: 0.88 });
    const wallH = 5;
    // North wall
    const nWall = new THREE.Mesh(new THREE.BoxGeometry(w - 4, wallH, 1.5), wallMat2);
    nWall.position.set(0, wallH / 2, -hd + 1);
    nWall.castShadow = true;
    nWall.receiveShadow = true;
    mctx.envGroup.add(nWall);
    // South wall (gate gap)
    for (const sx of [-hw / 2 - 5, hw / 2 + 5]) {
      const sWall = new THREE.Mesh(new THREE.BoxGeometry(hw - 12, wallH, 1.5), wallMat2);
      sWall.position.set(sx, wallH / 2, hd - 1);
      sWall.castShadow = true;
      sWall.receiveShadow = true;
      mctx.envGroup.add(sWall);
    }
    // E/W walls
    for (const xSide of [-hw + 1, hw - 1]) {
      const eWall = new THREE.Mesh(new THREE.BoxGeometry(1.5, wallH, d - 4), wallMat2);
      eWall.position.set(xSide, wallH / 2, 0);
      eWall.castShadow = true;
      eWall.receiveShadow = true;
      mctx.envGroup.add(eWall);
    }

    // Crenellations (merlons)
    const crenMat = new THREE.MeshStandardMaterial({ color: 0x5a5850, roughness: 0.9 });
    for (let cx = -hw + 3; cx < hw - 3; cx += 2) {
      for (const cz of [-hd + 1, hd - 1]) {
        const cren = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.8, 1.6), crenMat);
        cren.position.set(cx, wallH + 0.4, cz);
        cren.castShadow = true;
        mctx.envGroup.add(cren);
      }
    }

    // Wall stone block lines
    for (let sl = 0; sl < Math.floor(wallH / 0.8); sl++) {
      const sLine = new THREE.Mesh(new THREE.BoxGeometry(w - 4, 0.01, 0.01), new THREE.MeshStandardMaterial({ color: 0x5a5550, roughness: 1.0 }));
      sLine.position.set(0, 0.4 + sl * 0.8, -hd + 1.76);
      mctx.envGroup.add(sLine);
    }

    // Arrow slits on walls
    const slitMat = new THREE.MeshStandardMaterial({ color: 0x1a1815, roughness: 1.0 });
    for (let asx = -hw + 8; asx < hw - 8; asx += 6) {
      for (const asz of [-hd + 1, hd - 1]) {
        const slit = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.6, 0.08), slitMat);
        slit.position.set(asx, wallH * 0.6, asz + (asz > 0 ? 0.72 : -0.72));
        mctx.envGroup.add(slit);
      }
    }

    // Wall buttresses
    for (let btx = -hw + 10; btx < hw - 10; btx += 15) {
      for (const btz of [-hd + 1, hd - 1]) {
        const butt = new THREE.Mesh(new THREE.BoxGeometry(1.0, wallH * 0.8, 0.8), wallMat2);
        butt.position.set(btx, wallH * 0.4, btz + (btz > 0 ? 1.0 : -1.0));
        butt.castShadow = true;
        mctx.envGroup.add(butt);
      }
    }

    // Moss on lower walls
    for (let mi = 0; mi < 12; mi++) {
      const moss = new THREE.Mesh(new THREE.PlaneGeometry(0.8 + Math.random() * 1.0, 0.3 + Math.random() * 0.3), new THREE.MeshStandardMaterial({ color: 0x3a5530, transparent: true, opacity: 0.45, roughness: 0.9, side: THREE.DoubleSide }));
      moss.position.set((Math.random() - 0.5) * w * 0.7, 0.3, -hd + 1.76);
      mctx.envGroup.add(moss);
    }

    // Corner towers with crenellations and arrow slits
    const towerMat = new THREE.MeshStandardMaterial({ color: 0x6a6860, roughness: 0.85 });
    for (const [tx, tz] of [[-hw + 1, -hd + 1], [hw - 1, -hd + 1], [-hw + 1, hd - 1], [hw - 1, hd - 1]] as [number, number][]) {
      const tower = new THREE.Mesh(new THREE.CylinderGeometry(2, 2.2, wallH + 4, 20), towerMat);
      tower.position.set(tx, (wallH + 4) / 2, tz);
      tower.castShadow = true;
      mctx.envGroup.add(tower);
      // Cone roof
      const cone = new THREE.Mesh(new THREE.ConeGeometry(2.5, 2.5, 20), new THREE.MeshStandardMaterial({ color: 0x554433, roughness: 0.7 }));
      cone.position.set(tx, wallH + 5.2, tz);
      cone.castShadow = true;
      mctx.envGroup.add(cone);
      // Finial
      const finial = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.5, 8), new THREE.MeshStandardMaterial({ color: 0x888844, metalness: 0.5, roughness: 0.4 }));
      finial.position.set(tx, wallH + 6.6, tz);
      mctx.envGroup.add(finial);
      // Tower arrow slits
      for (let tas = 0; tas < 4; tas++) {
        const tAngle = tas * (Math.PI / 2) + Math.PI / 4;
        const tSlit = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.6, 0.12), slitMat);
        tSlit.position.set(tx + Math.cos(tAngle) * 2.02, wallH, tz + Math.sin(tAngle) * 2.02);
        tSlit.rotation.y = tAngle + Math.PI / 2;
        mctx.envGroup.add(tSlit);
      }
      // Stone band at mid-height
      const tBand = new THREE.Mesh(new THREE.TorusGeometry(2.1, 0.06, 6, 20), towerMat);
      tBand.rotation.x = Math.PI / 2;
      tBand.position.set(tx, wallH, tz);
      mctx.envGroup.add(tBand);
      // Tower crenellations
      for (let tc = 0; tc < 6; tc++) {
        const tcAngle = tc * (Math.PI / 3);
        const tCren = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.6, 0.5), crenMat);
        tCren.position.set(tx + Math.cos(tcAngle) * 2, wallH + 4.3, tz + Math.sin(tcAngle) * 2);
        tCren.rotation.y = tcAngle;
        mctx.envGroup.add(tCren);
      }
    }

    // Gate towers and portcullis
    for (const gx of [-4, 4]) {
      const gTower = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.7, wallH + 3, 16), towerMat);
      gTower.position.set(gx, (wallH + 3) / 2, hd - 1);
      gTower.castShadow = true;
      mctx.envGroup.add(gTower);
      const gCone = new THREE.Mesh(new THREE.ConeGeometry(2, 2, 16), new THREE.MeshStandardMaterial({ color: 0x554433, roughness: 0.7 }));
      gCone.position.set(gx, wallH + 4.5, hd - 1);
      mctx.envGroup.add(gCone);
      // Banner on gate tower
      const gBanner = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 1.2), new THREE.MeshStandardMaterial({ color: 0xaa2222, roughness: 0.7, side: THREE.DoubleSide }));
      gBanner.position.set(gx, wallH + 2, hd - 1 + 1.72);
      mctx.envGroup.add(gBanner);
    }
    // Portcullis bars
    const portMat = new THREE.MeshStandardMaterial({ color: 0x333333, metalness: 0.6, roughness: 0.5 });
    for (let pb = 0; pb < 7; pb++) {
      const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, wallH - 1, 10), portMat);
      bar.position.set(-3 + pb, (wallH - 1) / 2, hd - 1);
      mctx.envGroup.add(bar);
    }
    for (let hb = 0; hb < 4; hb++) {
      const hBar = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 6, 10), portMat);
      hBar.rotation.z = Math.PI / 2;
      hBar.position.set(0, 0.5 + hb * 1.0, hd - 1);
      mctx.envGroup.add(hBar);
    }

    // ── Street Lamps with ornate detail ──
    const lampMat = new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.6, metalness: 0.5 });
    const lampPositions: [number, number][] = [
      [-3.5, -25], [3.5, -25], [-3.5, -15], [3.5, -15],
      [-3.5, -5], [3.5, -5], [-3.5, 5], [3.5, 5],
      [-3.5, 15], [3.5, 15], [-3.5, 25], [3.5, 25],
      [-14, -22], [-14, -8], [-14, 8], [-14, 22],
      [14, -22], [14, -8], [14, 8], [14, 22],
      [-22, -15], [-22, 5], [22, -15], [22, 5],
    ];
    for (const [lx, lz] of lampPositions) {
      const lampGroup = new THREE.Group();
      // Base plate
      const basePlate = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.2, 0.05, 10), lampMat);
      basePlate.position.y = 0.025;
      lampGroup.add(basePlate);
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.05, 3.5, 12), lampMat);
      pole.position.y = 1.75;
      pole.castShadow = true;
      lampGroup.add(pole);
      // Decorative rings
      for (const ry of [1.5, 2.5]) {
        const ring = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.012, 6, 12), lampMat);
        ring.rotation.x = Math.PI / 2;
        ring.position.y = ry;
        lampGroup.add(ring);
      }
      // Curved arm (torus arc)
      const arm = new THREE.Mesh(new THREE.TorusGeometry(0.35, 0.018, 8, 12, Math.PI / 2), lampMat);
      arm.position.set(0.35, 3.35, 0);
      arm.rotation.z = -Math.PI / 2;
      lampGroup.add(arm);
      // Lantern cage with bars and cone top
      const cageBot = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.015, 0.2), lampMat);
      cageBot.position.set(0.7, 3.15, 0);
      lampGroup.add(cageBot);
      const cageTop = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.1, 6), lampMat);
      cageTop.position.set(0.7, 3.42, 0);
      lampGroup.add(cageTop);
      for (let cb = 0; cb < 4; cb++) {
        const cbar = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.26, 6), lampMat);
        const cba = (cb / 4) * Math.PI * 2;
        cbar.position.set(0.7 + Math.cos(cba) * 0.09, 3.28, Math.sin(cba) * 0.09);
        lampGroup.add(cbar);
      }
      // Glow sphere
      const glow = new THREE.Mesh(new THREE.SphereGeometry(0.05, 10, 10), new THREE.MeshStandardMaterial({ color: 0xffcc66, emissive: 0xffaa44, emissiveIntensity: 0.9 }));
      glow.position.set(0.7, 3.28, 0);
      lampGroup.add(glow);
      const light = new THREE.PointLight(0xffcc66, 0.8, 16);
      light.position.set(lx + 0.7, 3.28, lz);
      mctx.scene.add(light);
      mctx.torchLights.push(light);
      lampGroup.position.set(lx, 0, lz);
      mctx.envGroup.add(lampGroup);
    }

    // ── Props (barrels, crates, hay, sacks, carts) ──
    for (let pi = 0; pi < 60; pi++) {
      const px = (Math.random() - 0.5) * w * 0.7;
      const pz = (Math.random() - 0.5) * d * 0.7;
      const r = Math.random();
      if (r < 0.25) {
        const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.65, 18), new THREE.MeshStandardMaterial({ color: 0x6B4226, roughness: 0.85 }));
        barrel.position.set(px, 0.325, pz);
        barrel.castShadow = true;
        mctx.envGroup.add(barrel);
        for (const by of [0.1, 0.33, 0.55]) {
          const band = new THREE.Mesh(new THREE.TorusGeometry(0.29, 0.01, 6, 18), new THREE.MeshStandardMaterial({ color: 0x444444, metalness: 0.5, roughness: 0.6 }));
          band.rotation.x = Math.PI / 2;
          band.position.set(px, by, pz);
          mctx.envGroup.add(band);
        }
        const lid = new THREE.Mesh(new THREE.CircleGeometry(0.26, 14), new THREE.MeshStandardMaterial({ color: 0x5a3a1a, roughness: 0.9, side: THREE.DoubleSide }));
        lid.rotation.x = -Math.PI / 2;
        lid.position.set(px, 0.66, pz);
        mctx.envGroup.add(lid);
      } else if (r < 0.45) {
        const cs = 0.3 + Math.random() * 0.25;
        const crate = new THREE.Mesh(new THREE.BoxGeometry(cs, cs, cs), new THREE.MeshStandardMaterial({ color: 0x8B6914, roughness: 0.85 }));
        crate.position.set(px, cs / 2, pz);
        crate.rotation.y = Math.random() * Math.PI;
        crate.castShadow = true;
        mctx.envGroup.add(crate);
      } else if (r < 0.6) {
        const hay = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.45, 16), new THREE.MeshStandardMaterial({ color: 0xccaa55, roughness: 0.95 }));
        hay.position.set(px, 0.225, pz);
        hay.castShadow = true;
        mctx.envGroup.add(hay);
        // Straw wisps
        for (let sw = 0; sw < 3; sw++) {
          const straw = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.15, 4), new THREE.MeshStandardMaterial({ color: 0xccaa55, roughness: 0.95 }));
          straw.position.set(px + (Math.random() - 0.5) * 0.3, 0.1, pz + (Math.random() - 0.5) * 0.3);
          straw.rotation.z = Math.random() * Math.PI;
          mctx.envGroup.add(straw);
        }
      } else if (r < 0.75) {
        const sack = new THREE.Mesh(new THREE.SphereGeometry(0.2, 10, 8), new THREE.MeshStandardMaterial({ color: 0x998866, roughness: 0.9 }));
        sack.scale.set(1.0, 0.6, 0.8);
        sack.position.set(px, 0.12, pz);
        mctx.envGroup.add(sack);
      } else {
        // Cart
        const cartGroup = new THREE.Group();
        const platform = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.06, 0.7), new THREE.MeshStandardMaterial({ color: 0x6B4226, roughness: 0.85 }));
        platform.position.y = 0.4;
        cartGroup.add(platform);
        for (const [cwx, cwz] of [[-0.4, -0.3], [0.4, -0.3], [-0.4, 0.3], [0.4, 0.3]] as [number, number][]) {
          const wheel = new THREE.Mesh(new THREE.TorusGeometry(0.14, 0.02, 6, 14), new THREE.MeshStandardMaterial({ color: 0x4a3a1a, roughness: 0.8 }));
          wheel.position.set(cwx, 0.14, cwz);
          cartGroup.add(wheel);
          for (let sp = 0; sp < 4; sp++) {
            const spoke = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.25, 4), new THREE.MeshStandardMaterial({ color: 0x4a3a1a, roughness: 0.8 }));
            spoke.rotation.z = sp * (Math.PI / 4);
            spoke.position.set(cwx, 0.14, cwz);
            cartGroup.add(spoke);
          }
          const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.04, 8), new THREE.MeshStandardMaterial({ color: 0x555555, metalness: 0.4, roughness: 0.5 }));
          hub.rotation.x = Math.PI / 2;
          hub.position.set(cwx, 0.14, cwz);
          cartGroup.add(hub);
        }
        // Handle
        const handle2 = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.6, 6), new THREE.MeshStandardMaterial({ color: 0x6B4226, roughness: 0.85 }));
        handle2.rotation.x = Math.PI / 4;
        handle2.position.set(0, 0.55, -0.5);
        cartGroup.add(handle2);
        cartGroup.rotation.y = Math.random() * Math.PI;
        cartGroup.position.set(px, 0, pz);
        mctx.envGroup.add(cartGroup);
      }
    }

    // ── Banners with heraldic detail ──
    const bannerColors = [0xaa2222, 0x2244aa, 0x22aa44, 0xaa8822, 0x882266];
    for (let bni = 0; bni < 14; bni++) {
      const bnx = (Math.random() - 0.5) * w * 0.5;
      const bnz = (Math.random() - 0.5) * d * 0.5;
      const bannerGroup = new THREE.Group();
      const bPole = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.025, 3.5, 8), new THREE.MeshStandardMaterial({ color: 0x553322, roughness: 0.8 }));
      bPole.position.y = 1.75;
      bannerGroup.add(bPole);
      const tip = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 6), new THREE.MeshStandardMaterial({ color: 0x888844, metalness: 0.4, roughness: 0.5 }));
      tip.position.y = 3.5;
      bannerGroup.add(tip);
      const bColor = bannerColors[bni % bannerColors.length];
      const cloth = new THREE.Mesh(new THREE.PlaneGeometry(0.45, 0.9), new THREE.MeshStandardMaterial({ color: bColor, roughness: 0.7, side: THREE.DoubleSide }));
      cloth.position.set(0.05, 3.0, 0);
      cloth.rotation.z = -0.1;
      bannerGroup.add(cloth);
      // Heraldic cross/symbol
      const symbol = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.3, 0.005), new THREE.MeshStandardMaterial({ color: 0xddcc88, roughness: 0.6, side: THREE.DoubleSide }));
      symbol.position.set(0.05, 3.0, 0.005);
      bannerGroup.add(symbol);
      const hSymbol = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.03, 0.005), new THREE.MeshStandardMaterial({ color: 0xddcc88, roughness: 0.6, side: THREE.DoubleSide }));
      hSymbol.position.set(0.05, 3.05, 0.005);
      bannerGroup.add(hSymbol);
      bannerGroup.position.set(bnx, 0, bnz);
      mctx.envGroup.add(bannerGroup);
    }

    // ── Trees with bark rings, branches, leaf clusters ──
    const treeMat = new THREE.MeshStandardMaterial({ color: 0x5A3A1A, roughness: 0.85 });
    const leafColors = [0x448833, 0x4a9935, 0x3a7828, 0x558840];
    const treePositions: [number, number][] = [
      [-6, -28], [-6, -14], [-6, 0], [-6, 14], [-6, 28],
      [6, -28], [6, -14], [6, 0], [6, 14], [6, 28],
      [-22, -20], [-22, 10], [22, -20], [22, 10],
    ];
    for (const [ttx, ttz] of treePositions) {
      const treeGroup = new THREE.Group();
      const trunkH = 1.5 + Math.random() * 1.0;
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.15, trunkH, 10), treeMat);
      trunk.position.y = trunkH / 2;
      trunk.castShadow = true;
      treeGroup.add(trunk);
      // Bark rings
      for (let bk = 0; bk < 3; bk++) {
        const bark = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.012, 6, 10), treeMat);
        bark.rotation.x = Math.PI / 2;
        bark.position.y = trunkH * (0.2 + bk * 0.25);
        treeGroup.add(bark);
      }
      // Exposed roots
      for (let rt = 0; rt < 3; rt++) {
        const rootAngle = rt * (Math.PI * 2 / 3);
        const root = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.04, 0.4, 5), treeMat);
        root.position.set(Math.cos(rootAngle) * 0.18, 0.1, Math.sin(rootAngle) * 0.18);
        root.rotation.z = rootAngle + Math.PI / 2;
        root.rotation.x = 0.4;
        treeGroup.add(root);
      }
      // Multiple leaf clusters
      const crownR = 0.8 + Math.random() * 0.5;
      const leafMat = new THREE.MeshStandardMaterial({ color: leafColors[Math.floor(Math.random() * leafColors.length)], roughness: 0.7 });
      const crown = new THREE.Mesh(new THREE.SphereGeometry(crownR, 14, 12), leafMat);
      crown.position.y = trunkH + crownR * 0.6;
      crown.castShadow = true;
      treeGroup.add(crown);
      // Sub-clusters
      for (let sc = 0; sc < 3; sc++) {
        const subR = crownR * (0.4 + Math.random() * 0.3);
        const subAngle = sc * (Math.PI * 2 / 3) + Math.random() * 0.5;
        const sub = new THREE.Mesh(new THREE.SphereGeometry(subR, 10, 8), new THREE.MeshStandardMaterial({ color: leafColors[Math.floor(Math.random() * leafColors.length)], roughness: 0.7 }));
        sub.position.set(Math.cos(subAngle) * crownR * 0.6, trunkH + crownR * 0.4 + Math.random() * 0.3, Math.sin(subAngle) * crownR * 0.6);
        sub.castShadow = true;
        treeGroup.add(sub);
      }
      // Shadow disc under tree
      const shadow = new THREE.Mesh(new THREE.CircleGeometry(crownR * 1.2, 12), new THREE.MeshStandardMaterial({ color: 0x222222, transparent: true, opacity: 0.15, roughness: 1.0, side: THREE.DoubleSide }));
      shadow.rotation.x = -Math.PI / 2;
      shadow.position.y = 0.02;
      treeGroup.add(shadow);
      treeGroup.position.set(ttx, 0, ttz);
      mctx.envGroup.add(treeGroup);
    }

    // ── Well with full detail ──
    const wellGroup = new THREE.Group();
    const wellMat = new THREE.MeshStandardMaterial({ color: 0x706860, roughness: 0.85 });
    const wellBase = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.9, 0.6, 20), wellMat);
    wellBase.position.y = 0.3;
    wellGroup.add(wellBase);
    // Individual rim stones
    for (let rs = 0; rs < 12; rs++) {
      const rsAngle = (rs / 12) * Math.PI * 2;
      const rimStone = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.15, 0.12), wellMat);
      rimStone.position.set(Math.cos(rsAngle) * 0.75, 0.67, Math.sin(rsAngle) * 0.75);
      rimStone.rotation.y = rsAngle;
      wellGroup.add(rimStone);
    }
    const wellRim = new THREE.Mesh(new THREE.TorusGeometry(0.75, 0.06, 8, 20), wellMat);
    wellRim.rotation.x = Math.PI / 2;
    wellRim.position.y = 0.75;
    wellGroup.add(wellRim);
    for (const wpx of [-0.5, 0.5]) {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.04, 1.8, 10), new THREE.MeshStandardMaterial({ color: 0x553322, roughness: 0.85 }));
      post.position.set(wpx, 1.5, 0);
      wellGroup.add(post);
    }
    const crossBeam = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.2, 10), new THREE.MeshStandardMaterial({ color: 0x553322, roughness: 0.85 }));
    crossBeam.rotation.z = Math.PI / 2;
    crossBeam.position.set(0, 2.4, 0);
    wellGroup.add(crossBeam);
    // Peaked mini roof
    const wellRoofMat = new THREE.MeshStandardMaterial({ color: 0x554433, roughness: 0.75, side: THREE.DoubleSide });
    for (const rz2 of [-0.3, 0.3]) {
      const roofPanel = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.5), wellRoofMat);
      roofPanel.position.set(0, 2.55, rz2);
      roofPanel.rotation.x = rz2 > 0 ? -0.5 : 0.5;
      wellGroup.add(roofPanel);
    }
    // Bucket with handle
    const bucket = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.06, 0.12, 10), new THREE.MeshStandardMaterial({ color: 0x6B4226, roughness: 0.8 }));
    bucket.position.set(0, 1.6, 0);
    wellGroup.add(bucket);
    const bHandle = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.005, 4, 8, Math.PI), new THREE.MeshStandardMaterial({ color: 0x555555, metalness: 0.5, roughness: 0.5 }));
    bHandle.position.set(0, 1.68, 0);
    wellGroup.add(bHandle);
    // Rope
    const rope = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.8, 5), new THREE.MeshStandardMaterial({ color: 0x8a7a5a, roughness: 0.9 }));
    rope.position.set(0, 2.0, 0);
    wellGroup.add(rope);
    // Moss on well base
    const wellMoss = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 0.2), new THREE.MeshStandardMaterial({ color: 0x3a5530, transparent: true, opacity: 0.5, roughness: 0.9, side: THREE.DoubleSide }));
    wellMoss.position.set(0.6, 0.2, 0.4);
    wellGroup.add(wellMoss);
    wellGroup.position.set(-14, 0, 0);
    mctx.envGroup.add(wellGroup);

    // ── Notice Board ──
    const nbGroup = new THREE.Group();
    const nbMat = new THREE.MeshStandardMaterial({ color: 0x6B4226, roughness: 0.85 });
    // Posts
    for (const npx of [-0.5, 0.5]) {
      const nbPost = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 2, 8), nbMat);
      nbPost.position.set(npx, 1, 0);
      nbGroup.add(nbPost);
    }
    // Board
    const board = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.8, 0.04), nbMat);
    board.position.y = 1.6;
    nbGroup.add(board);
    // Papers/notices pinned to board
    for (let np = 0; np < 4; np++) {
      const paper = new THREE.Mesh(new THREE.PlaneGeometry(0.18, 0.22), new THREE.MeshStandardMaterial({ color: 0xeeddcc, roughness: 0.7, side: THREE.DoubleSide }));
      paper.position.set(-0.35 + np * 0.22, 1.6 + (Math.random() - 0.5) * 0.3, 0.025);
      paper.rotation.z = (Math.random() - 0.5) * 0.15;
      nbGroup.add(paper);
    }
    nbGroup.position.set(14, 0, 0);
    mctx.envGroup.add(nbGroup);

    // ── Stocks (city punishment device) ──
    const stockGroup = new THREE.Group();
    const stockMat = new THREE.MeshStandardMaterial({ color: 0x6B4226, roughness: 0.85 });
    for (const spx of [-0.6, 0.6]) {
      const sPost = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.5, 8), stockMat);
      sPost.position.set(spx, 0.75, 0);
      stockGroup.add(sPost);
    }
    const sBeam = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.12, 0.15), stockMat);
    sBeam.position.y = 1.2;
    stockGroup.add(sBeam);
    // Holes for head and hands
    for (const hx of [-0.3, 0, 0.3]) {
      const hole = new THREE.Mesh(new THREE.CircleGeometry(0.06, 10), new THREE.MeshStandardMaterial({ color: 0x1a1815, roughness: 1.0, side: THREE.DoubleSide }));
      hole.position.set(hx, 1.2, 0.076);
      stockGroup.add(hole);
    }
    stockGroup.position.set(5, 0, -28);
    mctx.envGroup.add(stockGroup);

    // ── Clock Tower (major landmark) ──
    const clockTower = new THREE.Group();
    const ctMat = new THREE.MeshStandardMaterial({ color: 0x6a6860, roughness: 0.85 });
    // Square tower base
    const ctBase = new THREE.Mesh(new THREE.BoxGeometry(4, 12, 4), ctMat);
    ctBase.position.y = 6;
    ctBase.castShadow = true;
    clockTower.add(ctBase);
    // Stone block lines on tower
    for (let ctsl = 0; ctsl < 15; ctsl++) {
      for (const ctz of [2.02, -2.02]) {
        const ctLine = new THREE.Mesh(new THREE.BoxGeometry(3.98, 0.012, 0.008), new THREE.MeshStandardMaterial({ color: 0x5a5550, roughness: 1.0 }));
        ctLine.position.set(0, 0.5 + ctsl * 0.8, ctz);
        clockTower.add(ctLine);
      }
    }
    // Arrow slits on tower
    const ctSlitMat = new THREE.MeshStandardMaterial({ color: 0x1a1815, roughness: 1.0 });
    for (let ctas = 0; ctas < 4; ctas++) {
      for (const ctface of [2.02, -2.02]) {
        const ctSlit = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.6, 0.06), ctSlitMat);
        ctSlit.position.set(-1 + ctas * 0.7, 5 + ctas * 1.5, ctface);
        clockTower.add(ctSlit);
      }
    }
    // Crenellations on tower top
    for (let ctc = 0; ctc < 4; ctc++) {
      for (const ctz2 of [-2, 2]) {
        const ctCren = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.7, 0.3), crenMat);
        ctCren.position.set(-1.5 + ctc * 1, 12.35, ctz2);
        clockTower.add(ctCren);
      }
      for (const ctx2 of [-2, 2]) {
        const ctCren2 = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.7, 0.7), crenMat);
        ctCren2.position.set(ctx2, 12.35, -1.5 + ctc * 1);
        clockTower.add(ctCren2);
      }
    }
    // Peaked roof
    const ctRoof = new THREE.Mesh(new THREE.ConeGeometry(3, 3, 4), new THREE.MeshStandardMaterial({ color: 0x554433, roughness: 0.7 }));
    ctRoof.position.y = 13.5;
    ctRoof.rotation.y = Math.PI / 4;
    ctRoof.castShadow = true;
    clockTower.add(ctRoof);
    // Finial
    const ctFinial = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.8, 8), new THREE.MeshStandardMaterial({ color: 0x888844, metalness: 0.5, roughness: 0.4 }));
    ctFinial.position.y = 15.3;
    clockTower.add(ctFinial);
    // Clock face on each side
    const clockBrassMat = new THREE.MeshStandardMaterial({ color: 0x886622, metalness: 0.5, roughness: 0.35 });
    for (let cfi = 0; cfi < 4; cfi++) {
      const cfAngle = cfi * (Math.PI / 2);
      const cfGroup = new THREE.Group();
      const cfR = 1.2;
      // Face
      const cfFace = new THREE.Mesh(new THREE.CircleGeometry(cfR, 44), new THREE.MeshStandardMaterial({ color: 0xeeddcc, roughness: 0.35, side: THREE.DoubleSide }));
      cfGroup.add(cfFace);
      // Rim
      const cfRim = new THREE.Mesh(new THREE.TorusGeometry(cfR, 0.06, 12, 44), clockBrassMat);
      cfGroup.add(cfRim);
      // Hour markers
      for (let cfh = 0; cfh < 12; cfh++) {
        const cfha = (cfh / 12) * Math.PI * 2;
        const cfMarker = new THREE.Mesh(new THREE.BoxGeometry(0.04, cfR * 0.1, 0.015), new THREE.MeshStandardMaterial({ color: 0x333333, metalness: 0.4, roughness: 0.5 }));
        cfMarker.position.set(Math.sin(cfha) * cfR * 0.82, Math.cos(cfha) * cfR * 0.82, 0.02);
        cfMarker.rotation.z = -cfha;
        cfGroup.add(cfMarker);
      }
      // Hands
      const cfHour = new THREE.Mesh(new THREE.BoxGeometry(0.035, cfR * 0.45, 0.015), new THREE.MeshStandardMaterial({ color: 0x222222, metalness: 0.5, roughness: 0.4 }));
      cfHour.position.set(0, cfR * 0.22, 0.03);
      cfHour.rotation.z = -0.8;
      cfGroup.add(cfHour);
      const cfMin = new THREE.Mesh(new THREE.BoxGeometry(0.025, cfR * 0.65, 0.015), new THREE.MeshStandardMaterial({ color: 0x222222, metalness: 0.5, roughness: 0.4 }));
      cfMin.position.set(0, cfR * 0.32, 0.04);
      cfMin.rotation.z = -2.4;
      cfGroup.add(cfMin);
      // Center hub
      const cfHub = new THREE.Mesh(new THREE.SphereGeometry(0.06, 14, 12), clockBrassMat);
      cfHub.position.z = 0.04;
      cfGroup.add(cfHub);
      // Position face on tower wall
      cfGroup.position.set(Math.sin(cfAngle) * 2.02, 9, Math.cos(cfAngle) * 2.02);
      cfGroup.rotation.y = cfAngle;
      clockTower.add(cfGroup);
    }
    // Bell inside (visible through openings)
    const bellMat = new THREE.MeshStandardMaterial({ color: 0xbb9933, metalness: 0.6, roughness: 0.3 });
    const bell = new THREE.Mesh(new THREE.ConeGeometry(0.6, 0.8, 16), bellMat);
    bell.position.y = 11.5;
    bell.rotation.x = Math.PI;
    clockTower.add(bell);
    const bellClapper = new THREE.Mesh(new THREE.SphereGeometry(0.08, 10, 8), bellMat);
    bellClapper.position.y = 11.1;
    clockTower.add(bellClapper);
    clockTower.position.set(20, 0, -20);
    mctx.envGroup.add(clockTower);

    // ── Blacksmith Area ──
    const bsGroup = new THREE.Group();
    const bsWoodMat = new THREE.MeshStandardMaterial({ color: 0x6B4226, roughness: 0.85 });
    // Open shed roof
    const shedRoof = new THREE.Mesh(new THREE.BoxGeometry(4, 0.12, 3), bsWoodMat);
    shedRoof.position.y = 2.8;
    bsGroup.add(shedRoof);
    // 4 posts
    for (const [spx, spz] of [[-1.8, -1.3], [1.8, -1.3], [-1.8, 1.3], [1.8, 1.3]] as [number, number][]) {
      const shedPost = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 2.8, 10), bsWoodMat);
      shedPost.position.set(spx, 1.4, spz);
      shedPost.castShadow = true;
      bsGroup.add(shedPost);
    }
    // Anvil
    const anvilMat = new THREE.MeshStandardMaterial({ color: 0x444444, metalness: 0.7, roughness: 0.3 });
    const anvilBase = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.4, 0.3), anvilMat);
    anvilBase.position.set(0, 0.2, 0);
    bsGroup.add(anvilBase);
    const anvilTop = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.12, 0.35), anvilMat);
    anvilTop.position.set(0, 0.46, 0);
    bsGroup.add(anvilTop);
    const anvilHorn = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.25, 16), anvilMat);
    anvilHorn.rotation.z = -Math.PI / 2;
    anvilHorn.position.set(0.5, 0.46, 0);
    bsGroup.add(anvilHorn);
    // Forge fire
    const forge = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.6, 0.8), new THREE.MeshStandardMaterial({ color: 0x554433, roughness: 0.9 }));
    forge.position.set(-1, 0.3, 0);
    bsGroup.add(forge);
    const ember = new THREE.Mesh(new THREE.SphereGeometry(0.15, 12, 10), new THREE.MeshStandardMaterial({ color: 0xff4400, emissive: 0xff2200, emissiveIntensity: 1.2 }));
    ember.position.set(-1, 0.7, 0);
    bsGroup.add(ember);
    const forgeLight = new THREE.PointLight(0xff6622, 1.0, 10);
    forgeLight.position.set(-20 - 1, 0.7, 20);
    mctx.scene.add(forgeLight);
    mctx.torchLights.push(forgeLight);
    // Weapon rack
    const wrBack = new THREE.Mesh(new THREE.BoxGeometry(1.5, 2, 0.08), bsWoodMat);
    wrBack.position.set(1.5, 1.2, -1.2);
    bsGroup.add(wrBack);
    for (let bsw = 0; bsw < 4; bsw++) {
      const bsSword = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.7 + Math.random() * 0.3, 0.015), new THREE.MeshStandardMaterial({ color: 0x888888, metalness: 0.5, roughness: 0.4 }));
      bsSword.position.set(1.1 + bsw * 0.3, 1.4, -1.15);
      bsGroup.add(bsSword);
    }
    // Water trough
    const trough = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.3, 0.4), bsWoodMat);
    trough.position.set(1.2, 0.15, 0.8);
    bsGroup.add(trough);
    const troughWater = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.02, 0.3), new THREE.MeshStandardMaterial({ color: 0x4488aa, transparent: true, opacity: 0.5, roughness: 0.1 }));
    troughWater.position.set(1.2, 0.28, 0.8);
    bsGroup.add(troughWater);
    bsGroup.position.set(-20, 0, 20);
    mctx.envGroup.add(bsGroup);

    // ── Statue in market square ──
    const statueGrp = new THREE.Group();
    const statMat2 = new THREE.MeshStandardMaterial({ color: 0x889098, roughness: 0.7 });
    // Pedestal
    const pedestal = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.5, 1.2), statMat2);
    pedestal.position.y = 0.75;
    pedestal.castShadow = true;
    statueGrp.add(pedestal);
    // Pedestal molding
    const pedTop = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.1, 1.4), statMat2);
    pedTop.position.y = 1.55;
    statueGrp.add(pedTop);
    const pedBot = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.1, 1.4), statMat2);
    pedBot.position.y = 0.05;
    statueGrp.add(pedBot);
    // Figure body
    const figBody = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.25, 1.2, 16), statMat2);
    figBody.position.y = 2.2;
    figBody.castShadow = true;
    statueGrp.add(figBody);
    // Head
    const figHead = new THREE.Mesh(new THREE.SphereGeometry(0.15, 16, 14), statMat2);
    figHead.position.y = 2.95;
    statueGrp.add(figHead);
    // Arms
    for (const armSide of [-1, 1]) {
      const figArm = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 0.7, 10), statMat2);
      figArm.position.set(armSide * 0.28, 2.3, 0);
      figArm.rotation.z = armSide * 0.3;
      statueGrp.add(figArm);
    }
    // Sword held upright
    const statSword = new THREE.Mesh(new THREE.BoxGeometry(0.04, 1.0, 0.02), new THREE.MeshStandardMaterial({ color: 0xcccccc, metalness: 0.6, roughness: 0.3 }));
    statSword.position.set(0.3, 2.8, 0);
    statueGrp.add(statSword);
    const statGuard = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.04, 0.04), new THREE.MeshStandardMaterial({ color: 0xcccccc, metalness: 0.6, roughness: 0.3 }));
    statGuard.position.set(0.3, 2.35, 0);
    statueGrp.add(statGuard);
    // Plaque
    const plaque = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.25, 0.02), new THREE.MeshStandardMaterial({ color: 0xbb9933, metalness: 0.5, roughness: 0.35 }));
    plaque.position.set(0, 0.9, 0.62);
    statueGrp.add(plaque);
    statueGrp.position.set(8, 0, 0);
    mctx.envGroup.add(statueGrp);

    // ── Hanging Lanterns across alleyways ──
    for (let hli = 0; hli < 15; hli++) {
      const hlGrp = new THREE.Group();
      // Rope/wire
      const wire = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.005, 4 + Math.random() * 3, 4), new THREE.MeshStandardMaterial({ color: 0x8a7a5a, roughness: 0.9 }));
      wire.rotation.z = Math.PI / 2;
      hlGrp.add(wire);
      // Lantern body
      const hlBody = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.2, 0.15), new THREE.MeshStandardMaterial({ color: 0x444444, roughness: 0.5, metalness: 0.4, transparent: true, opacity: 0.6 }));
      hlBody.position.y = -0.2;
      hlGrp.add(hlBody);
      const hlGlow = new THREE.Mesh(new THREE.SphereGeometry(0.04, 8, 8), new THREE.MeshStandardMaterial({ color: 0xffcc66, emissive: 0xffaa44, emissiveIntensity: 0.9 }));
      hlGlow.position.y = -0.2;
      hlGrp.add(hlGlow);
      // Top cap
      const hlCap = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.08, 6), new THREE.MeshStandardMaterial({ color: 0x444444, metalness: 0.4, roughness: 0.5 }));
      hlCap.position.y = -0.08;
      hlGrp.add(hlCap);
      // Chain links
      for (let hlc = 0; hlc < 2; hlc++) {
        const hlLink = new THREE.Mesh(new THREE.TorusGeometry(0.02, 0.005, 4, 8), new THREE.MeshStandardMaterial({ color: 0x555555, metalness: 0.5, roughness: 0.5 }));
        hlLink.position.y = -0.04 - hlc * 0.04;
        hlLink.rotation.x = hlc % 2 === 0 ? 0 : Math.PI / 2;
        hlGrp.add(hlLink);
      }
      const hlx = (Math.random() - 0.5) * w * 0.5;
      const hlz = (Math.random() - 0.5) * d * 0.5;
      hlGrp.position.set(hlx, 3.5 + Math.random() * 1.5, hlz);
      mctx.envGroup.add(hlGrp);
      const hlLight = new THREE.PointLight(0xffcc66, 0.4, 8);
      hlLight.position.set(hlx, 3.3 + Math.random() * 1.5, hlz);
      mctx.scene.add(hlLight);
      mctx.torchLights.push(hlLight);
    }

    // ── Street Benches ──
    for (let sbi = 0; sbi < 8; sbi++) {
      const bench = new THREE.Group();
      const benchWood = new THREE.MeshStandardMaterial({ color: 0x6B4226, roughness: 0.85 });
      // Seat planks (3)
      for (let sp2 = 0; sp2 < 3; sp2++) {
        const plank = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.03, 0.12), benchWood);
        plank.position.set(0, 0.45, -0.12 + sp2 * 0.13);
        bench.add(plank);
      }
      // 4 legs
      for (const [lx2, lz2] of [[-0.5, -0.12], [0.5, -0.12], [-0.5, 0.12], [0.5, 0.12]] as [number, number][]) {
        const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.03, 0.45, 8), benchWood);
        leg.position.set(lx2, 0.225, lz2);
        bench.add(leg);
      }
      // Backrest (2 planks)
      for (let br2 = 0; br2 < 2; br2++) {
        const backPlank = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.06, 0.02), benchWood);
        backPlank.position.set(0, 0.55 + br2 * 0.12, -0.15);
        bench.add(backPlank);
      }
      // Back posts
      for (const bpx of [-0.5, 0.5]) {
        const bPost = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.4, 6), benchWood);
        bPost.position.set(bpx, 0.65, -0.15);
        bench.add(bPost);
      }
      // Metal bolts
      for (const [mbx, mby] of [[-0.5, 0.45], [0.5, 0.45], [-0.5, 0.65], [0.5, 0.65]] as [number, number][]) {
        const bolt = new THREE.Mesh(new THREE.SphereGeometry(0.01, 6, 6), new THREE.MeshStandardMaterial({ color: 0x444444, metalness: 0.5, roughness: 0.4 }));
        bolt.position.set(mbx, mby, -0.16);
        bench.add(bolt);
      }
      bench.position.set((Math.random() - 0.5) * w * 0.5, 0, (Math.random() - 0.5) * d * 0.5);
      bench.rotation.y = Math.random() * Math.PI;
      mctx.envGroup.add(bench);
    }

    // ── Potted Plants ──
    for (let ppi = 0; ppi < 12; ppi++) {
      const potGrp = new THREE.Group();
      const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.15, 0.2, 12), new THREE.MeshStandardMaterial({ color: 0xaa6633, roughness: 0.85 }));
      pot.position.y = 0.1;
      potGrp.add(pot);
      // Pot rim
      const potRim = new THREE.Mesh(new THREE.TorusGeometry(0.13, 0.015, 6, 12), new THREE.MeshStandardMaterial({ color: 0xaa6633, roughness: 0.85 }));
      potRim.rotation.x = Math.PI / 2;
      potRim.position.y = 0.2;
      potGrp.add(potRim);
      // Soil
      const soil = new THREE.Mesh(new THREE.CircleGeometry(0.11, 10), new THREE.MeshStandardMaterial({ color: 0x3a2a1a, roughness: 1.0, side: THREE.DoubleSide }));
      soil.rotation.x = -Math.PI / 2;
      soil.position.y = 0.19;
      potGrp.add(soil);
      // Small plant
      const plantStem = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.15, 5), new THREE.MeshStandardMaterial({ color: 0x338822, roughness: 0.8 }));
      plantStem.position.y = 0.27;
      potGrp.add(plantStem);
      // Leaves
      for (let pl2 = 0; pl2 < 4; pl2++) {
        const pLeaf = new THREE.Mesh(new THREE.SphereGeometry(0.04, 8, 6), new THREE.MeshStandardMaterial({ color: 0x44aa33, roughness: 0.7 }));
        pLeaf.scale.set(1.5, 0.4, 1.0);
        const plAngle = pl2 * (Math.PI / 2) + Math.random() * 0.5;
        pLeaf.position.set(Math.cos(plAngle) * 0.05, 0.3 + pl2 * 0.02, Math.sin(plAngle) * 0.05);
        pLeaf.rotation.z = (Math.random() - 0.5) * 0.5;
        potGrp.add(pLeaf);
      }
      potGrp.position.set((Math.random() - 0.5) * w * 0.6, 0, (Math.random() - 0.5) * d * 0.6);
      mctx.envGroup.add(potGrp);
    }

    // ── Detailed Heraldic Banners on tower walls ──
    for (const [txx, tzz] of [[-hw + 1, -hd + 1], [hw - 1, -hd + 1], [-hw + 1, hd - 1], [hw - 1, hd - 1]] as [number, number][]) {
      const tBanner = new THREE.Group();
      // Banner pole
      const bPole2 = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 3, 8), new THREE.MeshStandardMaterial({ color: 0x553322, roughness: 0.8 }));
      bPole2.position.y = 1.5;
      tBanner.add(bPole2);
      // Cloth with gold trim
      const bCloth = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 2.2), new THREE.MeshStandardMaterial({ color: 0xcc2222, roughness: 0.7, side: THREE.DoubleSide, emissive: 0x220000, emissiveIntensity: 0.1 }));
      bCloth.position.set(0.05, 1.7, 0);
      tBanner.add(bCloth);
      // Gold trim at top
      const goldTrim = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.1), new THREE.MeshStandardMaterial({ color: 0xddaa22, roughness: 0.4, metalness: 0.6, side: THREE.DoubleSide }));
      goldTrim.position.set(0.05, 2.75, 0.005);
      tBanner.add(goldTrim);
      // Pennant triangle at bottom
      const pennShape = new THREE.Shape();
      pennShape.moveTo(0, 0);
      pennShape.lineTo(0.3, -0.12);
      pennShape.lineTo(0, -0.25);
      pennShape.closePath();
      const pennGeo = new THREE.ShapeGeometry(pennShape);
      const pennant = new THREE.Mesh(pennGeo, new THREE.MeshStandardMaterial({ color: 0xddaa22, roughness: 0.6, side: THREE.DoubleSide }));
      pennant.position.set(-0.15, 0.6, 0.005);
      tBanner.add(pennant);
      // Heraldic emblem (circle with cross)
      const emblem = new THREE.Mesh(new THREE.CircleGeometry(0.15, 24), new THREE.MeshStandardMaterial({ color: 0xddaa22, roughness: 0.4, metalness: 0.5, side: THREE.DoubleSide }));
      emblem.position.set(0.05, 2.0, 0.01);
      tBanner.add(emblem);
      const embRing = new THREE.Mesh(new THREE.RingGeometry(0.12, 0.15, 24), new THREE.MeshStandardMaterial({ color: 0xbb9922, roughness: 0.35, metalness: 0.6, side: THREE.DoubleSide }));
      embRing.position.set(0.05, 2.0, 0.015);
      tBanner.add(embRing);
      const embV = new THREE.Mesh(new THREE.PlaneGeometry(0.03, 0.18), new THREE.MeshStandardMaterial({ color: 0xcc2222, roughness: 0.5, side: THREE.DoubleSide }));
      embV.position.set(0.05, 2.0, 0.02);
      tBanner.add(embV);
      const embH2 = new THREE.Mesh(new THREE.PlaneGeometry(0.18, 0.03), new THREE.MeshStandardMaterial({ color: 0xcc2222, roughness: 0.5, side: THREE.DoubleSide }));
      embH2.position.set(0.05, 2.0, 0.02);
      tBanner.add(embH2);
      tBanner.position.set(txx, wallH + 1, tzz);
      tBanner.rotation.y = Math.atan2(txx, tzz);
      mctx.envGroup.add(tBanner);
    }

    // ── Chains on portcullis mechanism ──
    for (const gcx of [-3.5, 3.5]) {
      const gChain = new THREE.Group();
      for (let gcl = 0; gcl < 8; gcl++) {
        const gLink = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.015, 8, 12), new THREE.MeshStandardMaterial({ color: 0x444444, metalness: 0.6, roughness: 0.4 }));
        gLink.position.y = gcl * 0.12;
        gLink.rotation.x = gcl % 2 === 0 ? 0 : Math.PI / 2;
        gChain.add(gLink);
      }
      gChain.position.set(gcx, wallH - 1, hd - 1);
      mctx.envGroup.add(gChain);
    }

    // ── Drain Grates in streets ──
    const drainMat = new THREE.MeshStandardMaterial({ color: 0x333333, metalness: 0.6, roughness: 0.5 });
    for (let dgi = 0; dgi < 10; dgi++) {
      const dgx = (Math.random() - 0.5) * 5;
      const dgz = -25 + dgi * 5;
      const drainGrp = new THREE.Group();
      const drainFrame = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.025, 0.5), drainMat);
      drainFrame.position.y = 0.07;
      drainGrp.add(drainFrame);
      for (let db = -3; db <= 3; db++) {
        const dBar = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.45, 8), drainMat);
        dBar.rotation.z = Math.PI / 2;
        dBar.position.set(db * 0.09, 0.07, 0);
        drainGrp.add(dBar);
      }
      const dHole = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.015, 0.4), new THREE.MeshStandardMaterial({ color: 0x0a0a08, roughness: 1.0 }));
      dHole.position.y = 0.04;
      drainGrp.add(dHole);
      drainGrp.position.set(dgx, 0, dgz);
      mctx.envGroup.add(drainGrp);
    }
}

