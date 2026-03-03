// Ability registry: AbilityType → factory function
import { AbilityType } from "@/types";
import { createFireball } from "@sim/abilities/Fireball";
import { createChainLightning } from "@sim/abilities/ChainLightning";
import { createWarp } from "@sim/abilities/Warp";
import { createSummon } from "@sim/abilities/Summon";
import { createImpSummon } from "@sim/abilities/ImpSummon";
import { createIceBall } from "@sim/abilities/IceBall";
import { createWeb } from "@sim/abilities/Web";
import { createNetPull } from "@sim/abilities/NetPull";
import { createDistortionBlast } from "@sim/abilities/DistortionBlast";
import { createHeal } from "@sim/abilities/Heal";
import { createFireBreath } from "@sim/abilities/FireBreath";
import { createFrostBreath } from "@sim/abilities/FrostBreath";
import { createAura } from "@sim/abilities/Aura";
import type { Ability } from "@sim/abilities/Ability";
import { UnitType } from "@/types";

type AbilityFactory = (id: string) => Ability;

export const abilityRegistry: Record<AbilityType, AbilityFactory> = {
  [AbilityType.FIREBALL]: createFireball,
  [AbilityType.CHAIN_LIGHTNING]: createChainLightning,
  [AbilityType.WARP]: createWarp,
  [AbilityType.SUMMON]: createSummon,
  [AbilityType.FIRE_IMP_SUMMON]: (id: string) =>
    createImpSummon(id, UnitType.FIRE_IMP, AbilityType.FIRE_IMP_SUMMON),
  [AbilityType.ICE_IMP_SUMMON]: (id: string) =>
    createImpSummon(id, UnitType.ICE_IMP, AbilityType.ICE_IMP_SUMMON),
  [AbilityType.LIGHTNING_IMP_SUMMON]: (id: string) =>
    createImpSummon(
      id,
      UnitType.LIGHTNING_IMP,
      AbilityType.LIGHTNING_IMP_SUMMON,
    ),
  [AbilityType.DISTORTION_IMP_SUMMON]: (id: string) =>
    createImpSummon(
      id,
      UnitType.DISTORTION_IMP,
      AbilityType.DISTORTION_IMP_SUMMON,
    ),
  [AbilityType.FIRE_MASTER_IMP_SUMMON]: (id: string) =>
    createImpSummon(id, UnitType.FIRE_IMP, AbilityType.FIRE_MASTER_IMP_SUMMON),
  [AbilityType.ICE_MASTER_IMP_SUMMON]: (id: string) =>
    createImpSummon(id, UnitType.ICE_IMP, AbilityType.ICE_MASTER_IMP_SUMMON),
  [AbilityType.LIGHTNING_MASTER_IMP_SUMMON]: (id: string) =>
    createImpSummon(
      id,
      UnitType.LIGHTNING_IMP,
      AbilityType.LIGHTNING_MASTER_IMP_SUMMON,
    ),
  [AbilityType.DISTORTION_MASTER_IMP_SUMMON]: (id: string) =>
    createImpSummon(
      id,
      UnitType.DISTORTION_IMP,
      AbilityType.DISTORTION_MASTER_IMP_SUMMON,
    ),
  [AbilityType.ICE_BALL]: createIceBall,
  [AbilityType.WEB]: createWeb,
  [AbilityType.GLADIATOR_NET]: createNetPull,
  [AbilityType.DISTORTION_BLAST]: createDistortionBlast,
  [AbilityType.VOID_DISTORTION]: (id) =>
    createDistortionBlast(id, AbilityType.VOID_DISTORTION),
  [AbilityType.FAERY_DISTORTION]: (id) =>
    createDistortionBlast(id, AbilityType.FAERY_DISTORTION),
  [AbilityType.FROG_TONGUE]: (id) => createNetPull(id, AbilityType.FROG_TONGUE),
  [AbilityType.DEVOUR_PULL]: (id) => createNetPull(id, AbilityType.DEVOUR_PULL),
  [AbilityType.FISHERMAN_NET]: (id) => createNetPull(id, AbilityType.FISHERMAN_NET),
  [AbilityType.HEAL]: createHeal,
  [AbilityType.FIRE_BREATH]: createFireBreath,
  [AbilityType.FROST_BREATH]: createFrostBreath,
  [AbilityType.FIRE_AURA]: (id) => createAura(id, AbilityType.FIRE_AURA),
  [AbilityType.ICE_AURA]: (id) => createAura(id, AbilityType.ICE_AURA),
  [AbilityType.MINOR_FIRE_AURA]: (id) => createAura(id, AbilityType.MINOR_FIRE_AURA),
  [AbilityType.MINOR_ICE_AURA]: (id) => createAura(id, AbilityType.MINOR_ICE_AURA),
};

export function createAbility(type: AbilityType, id: string): Ability {
  return abilityRegistry[type](id);
}
