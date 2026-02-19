// Ability registry: AbilityType → factory function
import { AbilityType } from "@/types";
import { createFireball } from "@sim/abilities/Fireball";
import { createChainLightning } from "@sim/abilities/ChainLightning";
import { createWarp } from "@sim/abilities/Warp";
import { createSummon } from "@sim/abilities/Summon";
import { createIceBall } from "@sim/abilities/IceBall";
import { createWeb, createGladiatorNet } from "@sim/abilities/Web";
import type { Ability } from "@sim/abilities/Ability";

type AbilityFactory = (id: string) => Ability;

export const abilityRegistry: Record<AbilityType, AbilityFactory> = {
  [AbilityType.FIREBALL]:        createFireball,
  [AbilityType.CHAIN_LIGHTNING]: createChainLightning,
  [AbilityType.WARP]:            createWarp,
  [AbilityType.SUMMON]:          createSummon,
  [AbilityType.ICE_BALL]:        createIceBall,
  [AbilityType.WEB]:             createWeb,
  [AbilityType.GLADIATOR_NET]:   createGladiatorNet,
};

export function createAbility(type: AbilityType, id: string): Ability {
  return abilityRegistry[type](id);
}
