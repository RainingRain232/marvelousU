// Ability registry: AbilityType → factory function
import { AbilityType } from "@/types";
import { createFireball } from "@sim/abilities/Fireball";
import { createChainLightning } from "@sim/abilities/ChainLightning";
import { createWarp } from "@sim/abilities/Warp";
import { createSummon } from "@sim/abilities/Summon";
import { createIceBall } from "@sim/abilities/IceBall";
import { createWeb } from "@sim/abilities/Web";
import { createNetPull } from "@sim/abilities/NetPull";
import { createDistortionBlast } from "@sim/abilities/DistortionBlast";
import { createHeal } from "@sim/abilities/Heal";
import type { Ability } from "@sim/abilities/Ability";

type AbilityFactory = (id: string) => Ability;

export const abilityRegistry: Record<AbilityType, AbilityFactory> = {
  [AbilityType.FIREBALL]: createFireball,
  [AbilityType.CHAIN_LIGHTNING]: createChainLightning,
  [AbilityType.WARP]: createWarp,
  [AbilityType.SUMMON]: createSummon,
  [AbilityType.ICE_BALL]: createIceBall,
  [AbilityType.WEB]: createWeb,
  [AbilityType.GLADIATOR_NET]: createNetPull,
  [AbilityType.DISTORTION_BLAST]: createDistortionBlast,
  [AbilityType.VOID_DISTORTION]: (id) => createDistortionBlast(id, AbilityType.VOID_DISTORTION),
  [AbilityType.FAERY_DISTORTION]: (id) => createDistortionBlast(id, AbilityType.FAERY_DISTORTION),
  [AbilityType.FROG_TONGUE]: (id) => createNetPull(id, AbilityType.FROG_TONGUE),
  [AbilityType.DEVOUR_PULL]: (id) => createNetPull(id, AbilityType.DEVOUR_PULL),
  [AbilityType.HEAL]: createHeal,
};

export function createAbility(type: AbilityType, id: string): Ability {
  return abilityRegistry[type](id);
}
