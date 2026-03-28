import * as THREE from 'three';
import { DiabloState } from './DiabloTypes';

export interface AOESyncContext {
  aoeMeshes: Map<string, THREE.Group>;
  scene: THREE.Scene;
  time: number;
  disposeObject3D: (obj: THREE.Object3D) => void;
}

export function syncAOE(ctx: AOESyncContext, state: DiabloState): void {
    const currentIds = new Set(state.aoeEffects.map((a) => a.id));

    for (const [id, grp] of ctx.aoeMeshes) {
      if (!currentIds.has(id)) {
        ctx.disposeObject3D(grp);
        ctx.scene.remove(grp);
        ctx.aoeMeshes.delete(id);
      }
    }

    for (const aoe of state.aoeEffects) {
      let grp = ctx.aoeMeshes.get(aoe.id);

      let color = 0xff4400;
      let innerColor = 0xff8800;
      switch (aoe.damageType) {
        case 'FIRE':    color = 0xff4400; innerColor = 0xffaa00; break;
        case 'ICE':     color = 0x44aaff; innerColor = 0xaaddff; break;
        case 'LIGHTNING': color = 0xffff44; innerColor = 0xffffff; break;
        case 'POISON':  color = 0x44ff44; innerColor = 0x88ff88; break;
        case 'ARCANE':  color = 0xaa44ff; innerColor = 0xdd88ff; break;
        case 'SHADOW':  color = 0x442266; innerColor = 0x6633aa; break;
        case 'HOLY':    color = 0xffdd88; innerColor = 0xffffff; break;
        default:        color = 0xff8844; innerColor = 0xffcc88; break;
      }

      if (!grp) {
        grp = new THREE.Group();

        // Outer glowing ring — thicker and more dramatic
        const ringGeo = new THREE.TorusGeometry(aoe.radius, 0.18, 30, 80);
        const ringMat = new THREE.MeshStandardMaterial({
          color, emissive: color, emissiveIntensity: 2.5,
          transparent: true, opacity: 0.85,
        });
        const ring = new THREE.Mesh(ringGeo, ringMat);
        ring.rotation.x = -Math.PI / 2;
        ring.name = 'aoe_ring';
        grp.add(ring);

        // Inner filled disc (subtle ground effect)
        const discGeo = new THREE.CircleGeometry(aoe.radius, 80);
        const discMat = new THREE.MeshStandardMaterial({
          color: innerColor, emissive: color, emissiveIntensity: 1.0,
          transparent: true, opacity: 0.2, side: THREE.DoubleSide,
        });
        const disc = new THREE.Mesh(discGeo, discMat);
        disc.rotation.x = -Math.PI / 2;
        disc.position.y = 0.02;
        disc.name = 'aoe_disc';
        grp.add(disc);

        // Secondary pulsing ring (smaller, brighter)
        const innerRingGeo = new THREE.TorusGeometry(aoe.radius * 0.6, 0.08, 27, 62);
        const innerRingMat = new THREE.MeshStandardMaterial({
          color: innerColor, emissive: innerColor, emissiveIntensity: 3.0,
          transparent: true, opacity: 0.6,
        });
        const innerRing = new THREE.Mesh(innerRingGeo, innerRingMat);
        innerRing.rotation.x = -Math.PI / 2;
        innerRing.position.y = 0.05;
        innerRing.name = 'aoe_inner_ring';
        grp.add(innerRing);

        // Expanding shockwave ring (fast-expanding, fading outer ring)
        const shockGeo = new THREE.TorusGeometry(aoe.radius * 0.3, 0.04, 23, 62);
        const shockMat = new THREE.MeshStandardMaterial({
          color: 0xffffff, emissive: innerColor, emissiveIntensity: 4.0,
          transparent: true, opacity: 0.7,
        });
        const shockRing = new THREE.Mesh(shockGeo, shockMat);
        shockRing.rotation.x = -Math.PI / 2;
        shockRing.position.y = 0.08;
        shockRing.name = 'aoe_shockwave';
        grp.add(shockRing);

        // Vertical energy column at center
        const columnGeo = new THREE.CylinderGeometry(aoe.radius * 0.08, aoe.radius * 0.15, 3.0, 27);
        const columnMat = new THREE.MeshStandardMaterial({
          color: innerColor, emissive: color, emissiveIntensity: 2.5,
          transparent: true, opacity: 0.25,
        });
        const column = new THREE.Mesh(columnGeo, columnMat);
        column.position.y = 1.5;
        column.name = 'aoe_column';
        grp.add(column);

        // Orbiting energy motes around the circumference
        for (let i = 0; i < 6; i++) {
          const mote = new THREE.Mesh(
            new THREE.SphereGeometry(0.08 + Math.random() * 0.06, 20, 17),
            new THREE.MeshStandardMaterial({
              color: innerColor, emissive: color, emissiveIntensity: 3.0,
              transparent: true, opacity: 0.7,
            })
          );
          mote.name = 'aoe_mote';
          mote.userData.moteAngle = (i / 6) * Math.PI * 2;
          mote.userData.moteSpeed = 2.5 + Math.random() * 1.5;
          mote.userData.moteHeight = 0.2 + Math.random() * 0.6;
          grp.add(mote);
        }

        // Type-specific effects
        if (aoe.damageType === 'FIRE') {
          // Rising flame pillars around the ring (more, taller)
          for (let i = 0; i < 12; i++) {
            const angle = (i / 12) * Math.PI * 2;
            const flameDist = aoe.radius * (0.5 + Math.random() * 0.4);
            const flame = new THREE.Mesh(
              new THREE.ConeGeometry(0.18 + Math.random() * 0.1, 1.0 + Math.random() * 0.8, 20),
              new THREE.MeshStandardMaterial({ color: 0xff6600, emissive: 0xff4400, emissiveIntensity: 3.0, transparent: true, opacity: 0.7 })
            );
            flame.position.set(Math.cos(angle) * flameDist, 0.5, Math.sin(angle) * flameDist);
            flame.name = 'aoe_flame';
            flame.userData.flameAngle = angle;
            flame.userData.flameDist = flameDist;
            grp.add(flame);
          }
          // Inner fire vortex (swirling embers)
          for (let i = 0; i < 8; i++) {
            const ember = new THREE.Mesh(
              new THREE.SphereGeometry(0.05 + Math.random() * 0.04, 17, 16),
              new THREE.MeshStandardMaterial({ color: 0xffaa00, emissive: 0xff6600, emissiveIntensity: 4.0, transparent: true, opacity: 0.8 })
            );
            ember.name = 'aoe_fire_ember';
            ember.userData.emberAngle = (i / 8) * Math.PI * 2;
            ember.userData.emberDist = aoe.radius * (0.2 + Math.random() * 0.5);
            ember.userData.emberSpeed = 4.0 + Math.random() * 3.0;
            ember.userData.emberHeight = 0.2 + Math.random() * 1.5;
            grp.add(ember);
          }
          // Heat distortion sphere
          const heatSphere = new THREE.Mesh(
            new THREE.SphereGeometry(aoe.radius * 0.8, 30, 27),
            new THREE.MeshStandardMaterial({ color: 0xff4400, emissive: 0xff2200, emissiveIntensity: 0.8, transparent: true, opacity: 0.06, side: THREE.DoubleSide })
          );
          heatSphere.position.y = 0.5;
          heatSphere.name = 'aoe_heat_sphere';
          grp.add(heatSphere);
        } else if (aoe.damageType === 'ICE') {
          // Ice crystals jutting from ground (more, varied sizes)
          for (let i = 0; i < 10; i++) {
            const angle = (i / 10) * Math.PI * 2 + Math.random() * 0.3;
            const crystalSize = 0.12 + Math.random() * 0.15;
            const crystal = new THREE.Mesh(
              new THREE.OctahedronGeometry(crystalSize, 2),
              new THREE.MeshStandardMaterial({ color: 0xccefff, emissive: 0x66ccff, emissiveIntensity: 2.0, transparent: true, opacity: 0.75, metalness: 0.4, roughness: 0.05 })
            );
            crystal.scale.set(0.5, 1.8 + Math.random() * 1.2, 0.5);
            const crystalDist = aoe.radius * (0.3 + Math.random() * 0.5);
            crystal.position.set(Math.cos(angle) * crystalDist, 0.3, Math.sin(angle) * crystalDist);
            crystal.rotation.set(Math.random() * 0.4, Math.random() * Math.PI, Math.random() * 0.4);
            crystal.name = 'aoe_crystal';
            crystal.userData.crystalPhase = Math.random() * Math.PI * 2;
            grp.add(crystal);
          }
          // Frost mist ground layer
          const frostMist = new THREE.Mesh(
            new THREE.CylinderGeometry(aoe.radius * 0.9, aoe.radius, 0.3, 44),
            new THREE.MeshStandardMaterial({ color: 0xaaddff, emissive: 0x4488cc, emissiveIntensity: 0.6, transparent: true, opacity: 0.12, side: THREE.DoubleSide })
          );
          frostMist.position.y = 0.15;
          frostMist.name = 'aoe_frost_mist';
          grp.add(frostMist);
          // Floating ice shards (smaller, spinning)
          for (let i = 0; i < 6; i++) {
            const shard = new THREE.Mesh(
              new THREE.OctahedronGeometry(0.05 + Math.random() * 0.04, 2),
              new THREE.MeshStandardMaterial({ color: 0xeeffff, emissive: 0x88ccff, emissiveIntensity: 2.5, transparent: true, opacity: 0.6 })
            );
            shard.name = 'aoe_ice_shard';
            shard.userData.shardAngle = Math.random() * Math.PI * 2;
            shard.userData.shardDist = aoe.radius * (0.2 + Math.random() * 0.6);
            shard.userData.shardSpeed = 1.5 + Math.random() * 2.0;
            shard.userData.shardHeight = 0.5 + Math.random() * 1.0;
            grp.add(shard);
          }
        } else if (aoe.damageType === 'LIGHTNING') {
          // Electric arcs across the area (more, with varying thickness)
          for (let i = 0; i < 6; i++) {
            const a1 = Math.random() * Math.PI * 2;
            const a2 = a1 + Math.PI * (0.4 + Math.random());
            const r1 = aoe.radius * (0.2 + Math.random() * 0.7);
            const r2 = aoe.radius * (0.2 + Math.random() * 0.7);
            const arcPts: THREE.Vector3[] = [];
            const segs = 6;
            for (let s = 0; s <= segs; s++) {
              const t = s / segs;
              const x = Math.cos(a1) * r1 * (1 - t) + Math.cos(a2) * r2 * t + (Math.random() - 0.5) * 0.4;
              const z = Math.sin(a1) * r1 * (1 - t) + Math.sin(a2) * r2 * t + (Math.random() - 0.5) * 0.4;
              arcPts.push(new THREE.Vector3(x, 0.1 + Math.random() * 0.3, z));
            }
            const arcCurve = new THREE.CatmullRomCurve3(arcPts);
            const arcThickness = 0.02 + Math.random() * 0.03;
            const arcGeo = new THREE.TubeGeometry(arcCurve, 10, arcThickness, 4, false);
            const arcMat = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffaa, emissiveIntensity: 5.0, transparent: true, opacity: 0.8 });
            const arc = new THREE.Mesh(arcGeo, arcMat);
            arc.name = 'aoe_lightning_arc';
            grp.add(arc);
          }
          // Central lightning strike column
          const strikeGeo = new THREE.CylinderGeometry(0.05, 0.15, 4.0, 23);
          const strikeMat = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffcc, emissiveIntensity: 6.0, transparent: true, opacity: 0.6 });
          const strike = new THREE.Mesh(strikeGeo, strikeMat);
          strike.position.y = 2.0;
          strike.name = 'aoe_lightning_strike';
          grp.add(strike);
          // Spark spheres scattered in the zone
          for (let i = 0; i < 5; i++) {
            const spark = new THREE.Mesh(
              new THREE.SphereGeometry(0.06, 17, 16),
              new THREE.MeshStandardMaterial({ color: 0xffffaa, emissive: 0xffff44, emissiveIntensity: 5.0, transparent: true, opacity: 0.8 })
            );
            spark.name = 'aoe_spark_mote';
            spark.userData.sparkAngle = Math.random() * Math.PI * 2;
            spark.userData.sparkDist = Math.random() * aoe.radius * 0.8;
            grp.add(spark);
          }
        } else if (aoe.damageType === 'POISON') {
          // Bubbling poison pools (more, varied)
          for (let i = 0; i < 10; i++) {
            const bubble = new THREE.Mesh(
              new THREE.SphereGeometry(0.06 + Math.random() * 0.1, 23, 20),
              new THREE.MeshStandardMaterial({ color: 0x44ff44, emissive: 0x22aa22, emissiveIntensity: 1.8, transparent: true, opacity: 0.55 })
            );
            const ba = Math.random() * Math.PI * 2;
            const bd = Math.random() * aoe.radius * 0.8;
            bubble.position.set(Math.cos(ba) * bd, 0.08, Math.sin(ba) * bd);
            bubble.name = 'aoe_bubble';
            bubble.userData.bubblePhase = Math.random() * Math.PI * 2;
            grp.add(bubble);
          }
          // Toxic gas cloud
          const gasCloud = new THREE.Mesh(
            new THREE.SphereGeometry(aoe.radius * 0.6, 27, 23),
            new THREE.MeshStandardMaterial({ color: 0x44ff44, emissive: 0x22aa22, emissiveIntensity: 0.5, transparent: true, opacity: 0.08, side: THREE.DoubleSide })
          );
          gasCloud.position.y = 0.4;
          gasCloud.name = 'aoe_gas_cloud';
          grp.add(gasCloud);
        } else if (aoe.damageType === 'ARCANE') {
          // Arcane rune circle on the ground
          const runeRing = new THREE.Mesh(
            new THREE.TorusGeometry(aoe.radius * 0.45, 0.04, 23, 46),
            new THREE.MeshStandardMaterial({ color: 0xdd88ff, emissive: 0xaa44ff, emissiveIntensity: 3.0, transparent: true, opacity: 0.6 })
          );
          runeRing.rotation.x = -Math.PI / 2;
          runeRing.position.y = 0.03;
          runeRing.name = 'aoe_arcane_rune';
          grp.add(runeRing);
          // Arcane orbiting motes
          for (let i = 0; i < 6; i++) {
            const arcaneMote = new THREE.Mesh(
              new THREE.OctahedronGeometry(0.07, 2),
              new THREE.MeshStandardMaterial({ color: 0xdd88ff, emissive: 0xaa44ff, emissiveIntensity: 3.5, transparent: true, opacity: 0.7 })
            );
            arcaneMote.name = 'aoe_arcane_mote';
            arcaneMote.userData.arcMoteAngle = (i / 6) * Math.PI * 2;
            arcaneMote.userData.arcMoteSpeed = 3.0 + Math.random() * 2.0;
            grp.add(arcaneMote);
          }
        }

        // AOE light — brighter, with wider range
        const aoeLight = new THREE.PointLight(color, 3.5, aoe.radius * 4);
        aoeLight.position.y = 1.0;
        aoeLight.name = 'aoe_light';
        grp.add(aoeLight);

        // Secondary color accent light
        const accentLight = new THREE.PointLight(innerColor, 1.5, aoe.radius * 2);
        accentLight.position.y = 0.3;
        accentLight.name = 'aoe_accent_light';
        grp.add(accentLight);

        ctx.scene.add(grp);
        ctx.aoeMeshes.set(aoe.id, grp);
      }

      grp.position.set(aoe.x, 0.1, aoe.z);

      // Animate based on timer
      const progress = aoe.timer / aoe.duration;
      const fadeOut = Math.max(0, 1.0 - progress);
      const pulse = 0.85 + Math.sin(ctx.time * 8) * 0.15;
      const fastPulse = 0.8 + Math.sin(ctx.time * 14) * 0.2;

      grp.traverse((child: THREE.Object3D) => {
        if (child.name === 'aoe_ring') {
          const ringScale = 0.4 + progress * 0.6;
          child.scale.setScalar(ringScale * pulse);
          if ((child as THREE.Mesh).material instanceof THREE.MeshStandardMaterial) {
            ((child as THREE.Mesh).material as THREE.MeshStandardMaterial).opacity = Math.max(0, 0.85 * fadeOut);
            ((child as THREE.Mesh).material as THREE.MeshStandardMaterial).emissiveIntensity = 2.0 + Math.sin(ctx.time * 6) * 1.0;
          }
        } else if (child.name === 'aoe_disc') {
          if ((child as THREE.Mesh).material instanceof THREE.MeshStandardMaterial) {
            ((child as THREE.Mesh).material as THREE.MeshStandardMaterial).opacity = Math.max(0, 0.2 * fadeOut * pulse);
            ((child as THREE.Mesh).material as THREE.MeshStandardMaterial).emissiveIntensity = 0.8 + Math.sin(ctx.time * 10) * 0.4;
          }
        } else if (child.name === 'aoe_inner_ring') {
          child.rotation.z = ctx.time * 3;
          const innerPulse = 0.8 + Math.sin(ctx.time * 12) * 0.2;
          child.scale.setScalar(innerPulse);
          if ((child as THREE.Mesh).material instanceof THREE.MeshStandardMaterial) {
            ((child as THREE.Mesh).material as THREE.MeshStandardMaterial).opacity = Math.max(0, 0.6 * fadeOut * pulse);
          }
        } else if (child.name === 'aoe_shockwave') {
          // Expand rapidly at the start, then fade
          const shockProgress = Math.min(1.0, progress * 4.0);
          const shockScale = 0.3 + shockProgress * 3.5;
          child.scale.setScalar(shockScale);
          if ((child as THREE.Mesh).material instanceof THREE.MeshStandardMaterial) {
            ((child as THREE.Mesh).material as THREE.MeshStandardMaterial).opacity = Math.max(0, 0.7 * (1.0 - shockProgress));
          }
        } else if (child.name === 'aoe_column') {
          const colScale = 0.8 + Math.sin(ctx.time * 6) * 0.3;
          child.scale.set(colScale, 0.6 + fadeOut * 0.6, colScale);
          if ((child as THREE.Mesh).material instanceof THREE.MeshStandardMaterial) {
            ((child as THREE.Mesh).material as THREE.MeshStandardMaterial).opacity = Math.max(0, 0.25 * fadeOut);
          }
        } else if (child.name === 'aoe_mote') {
          const angle = child.userData.moteAngle + ctx.time * child.userData.moteSpeed;
          const r = aoe.radius * 0.85;
          child.position.set(
            Math.cos(angle) * r,
            child.userData.moteHeight + Math.sin(ctx.time * 4 + angle) * 0.2,
            Math.sin(angle) * r
          );
          if ((child as THREE.Mesh).material instanceof THREE.MeshStandardMaterial) {
            ((child as THREE.Mesh).material as THREE.MeshStandardMaterial).opacity = 0.5 + Math.sin(ctx.time * 8 + angle) * 0.3;
          }
        } else if (child.name === 'aoe_flame') {
          const fScale = 0.5 + Math.sin(ctx.time * 12 + (child.userData.flameAngle || 0) * 5) * 0.5;
          child.scale.y = fScale * fadeOut;
          child.scale.x = 0.8 + Math.sin(ctx.time * 8 + (child.userData.flameAngle || 0)) * 0.3;
          child.position.y = 0.3 + Math.sin(ctx.time * 10 + (child.userData.flameAngle || 0) * 3) * 0.25;
          child.rotation.z = Math.sin(ctx.time * 5 + (child.userData.flameAngle || 0)) * 0.2;
        } else if (child.name === 'aoe_fire_ember') {
          const angle = child.userData.emberAngle + ctx.time * child.userData.emberSpeed;
          const r = child.userData.emberDist;
          child.position.set(
            Math.cos(angle) * r,
            child.userData.emberHeight + Math.sin(ctx.time * 6 + angle) * 0.3,
            Math.sin(angle) * r
          );
          const es = 0.6 + Math.sin(ctx.time * 10 + angle * 2) * 0.4;
          child.scale.setScalar(es);
        } else if (child.name === 'aoe_heat_sphere') {
          child.scale.setScalar(0.9 + Math.sin(ctx.time * 4) * 0.15);
          if ((child as THREE.Mesh).material instanceof THREE.MeshStandardMaterial) {
            ((child as THREE.Mesh).material as THREE.MeshStandardMaterial).opacity = Math.max(0, 0.06 * fadeOut);
          }
        } else if (child.name === 'aoe_crystal') {
          child.rotation.y += 0.015;
          const shimmer = 1.5 + Math.sin(ctx.time * 5 + (child.userData.crystalPhase || 0)) * 0.8;
          if ((child as THREE.Mesh).material instanceof THREE.MeshStandardMaterial) {
            ((child as THREE.Mesh).material as THREE.MeshStandardMaterial).emissiveIntensity = shimmer;
            ((child as THREE.Mesh).material as THREE.MeshStandardMaterial).opacity = Math.max(0, 0.75 * fadeOut);
          }
        } else if (child.name === 'aoe_frost_mist') {
          child.scale.setScalar(0.95 + Math.sin(ctx.time * 2) * 0.1);
          child.rotation.y = ctx.time * 0.3;
          if ((child as THREE.Mesh).material instanceof THREE.MeshStandardMaterial) {
            ((child as THREE.Mesh).material as THREE.MeshStandardMaterial).opacity = Math.max(0, 0.12 * fadeOut);
          }
        } else if (child.name === 'aoe_ice_shard') {
          const angle = child.userData.shardAngle + ctx.time * child.userData.shardSpeed;
          child.position.set(
            Math.cos(angle) * child.userData.shardDist,
            child.userData.shardHeight + Math.sin(ctx.time * 3 + angle) * 0.15,
            Math.sin(angle) * child.userData.shardDist
          );
          child.rotation.y += 0.06;
          child.rotation.x += 0.04;
        } else if (child.name === 'aoe_lightning_arc') {
          child.visible = Math.random() > 0.15;
          if ((child as THREE.Mesh).material instanceof THREE.MeshStandardMaterial) {
            ((child as THREE.Mesh).material as THREE.MeshStandardMaterial).emissiveIntensity = 3.0 + Math.random() * 4.0;
          }
        } else if (child.name === 'aoe_lightning_strike') {
          child.visible = Math.random() > 0.4;
          child.scale.x = 0.5 + Math.random() * 1.0;
          child.scale.z = 0.5 + Math.random() * 1.0;
          if ((child as THREE.Mesh).material instanceof THREE.MeshStandardMaterial) {
            ((child as THREE.Mesh).material as THREE.MeshStandardMaterial).opacity = Math.max(0, (0.4 + Math.random() * 0.3) * fadeOut);
          }
        } else if (child.name === 'aoe_spark_mote') {
          child.visible = Math.random() > 0.3;
          child.position.set(
            Math.cos(child.userData.sparkAngle + Math.random() * 0.5) * child.userData.sparkDist,
            0.1 + Math.random() * 0.5,
            Math.sin(child.userData.sparkAngle + Math.random() * 0.5) * child.userData.sparkDist
          );
        } else if (child.name === 'aoe_bubble') {
          const bPhase = child.userData.bubblePhase || 0;
          child.position.y = 0.08 + Math.abs(Math.sin(ctx.time * 4 + bPhase)) * 0.3;
          const bs = 0.7 + Math.sin(ctx.time * 6 + bPhase) * 0.4;
          child.scale.setScalar(bs);
          if ((child as THREE.Mesh).material instanceof THREE.MeshStandardMaterial) {
            ((child as THREE.Mesh).material as THREE.MeshStandardMaterial).opacity = Math.max(0, 0.55 * fadeOut);
          }
        } else if (child.name === 'aoe_gas_cloud') {
          child.scale.setScalar(0.9 + Math.sin(ctx.time * 2) * 0.2);
          child.rotation.y = ctx.time * 0.5;
          if ((child as THREE.Mesh).material instanceof THREE.MeshStandardMaterial) {
            ((child as THREE.Mesh).material as THREE.MeshStandardMaterial).opacity = Math.max(0, 0.08 * fadeOut);
          }
        } else if (child.name === 'aoe_arcane_rune') {
          child.rotation.z = ctx.time * 1.5;
          const runeScale = 0.9 + Math.sin(ctx.time * 4) * 0.15;
          child.scale.setScalar(runeScale);
          if ((child as THREE.Mesh).material instanceof THREE.MeshStandardMaterial) {
            ((child as THREE.Mesh).material as THREE.MeshStandardMaterial).opacity = Math.max(0, 0.6 * fadeOut * fastPulse);
          }
        } else if (child.name === 'aoe_arcane_mote') {
          const angle = child.userData.arcMoteAngle + ctx.time * child.userData.arcMoteSpeed;
          const r = aoe.radius * 0.5;
          child.position.set(
            Math.cos(angle) * r,
            0.5 + Math.sin(ctx.time * 5 + angle * 2) * 0.3,
            Math.sin(angle) * r
          );
          child.rotation.y += 0.08;
          child.rotation.x += 0.05;
        } else if (child.name === 'aoe_light') {
          (child as THREE.PointLight).intensity = 3.5 * fadeOut * pulse;
        } else if (child.name === 'aoe_accent_light') {
          (child as THREE.PointLight).intensity = 1.5 * fadeOut * fastPulse;
        }
      });
    }
}
