// ---------------------------------------------------------------------------
// Grail Ball -- AI System
// Controls computer-controlled players: positioning, pursuit, passing,
// defensive marking, ability usage, and team coordination.
// ---------------------------------------------------------------------------

import {
  GBPlayerClass, GBMatchPhase, GB_FIELD, GB_PHYSICS, GB_MATCH,
  GB_FORMATION, GB_FORMATION_TEMPLATES,
} from "./GrailBallConfig";
import {
  type GBMatchState, type GBPlayer, type Vec3, type GBPressureMode,
  v3, v3Dist, v3Sub, v3Normalize, v3Scale, v3Add, v3Len,
  getPlayer, getOrbCarrier, getTeamPlayers,
  isFatigued, isCriticallyFatigued,
} from "./GrailBallState";

// ---------------------------------------------------------------------------
// AI decision output
// ---------------------------------------------------------------------------
export interface AIDecision {
  moveDir: Vec3 | null;     // direction to move (normalized)
  sprint: boolean;
  tackle: boolean;
  useAbility: boolean;
  pass: boolean;
  shoot: boolean;
  lobPass: boolean;
  callForPass: boolean;
  switchTarget: number | null; // player id to switch to (for human team hint)
}

const EMPTY_DECISION: AIDecision = {
  moveDir: null, sprint: false, tackle: false, useAbility: false,
  pass: false, shoot: false, lobPass: false, callForPass: false,
  switchTarget: null,
};

// ---------------------------------------------------------------------------
// Utility
// ---------------------------------------------------------------------------

function gateCenter(teamIndex: number): Vec3 {
  // Team 0 defends left gate (x = -HALF_LENGTH), team 1 defends right gate (x = +HALF_LENGTH)
  const x = teamIndex === 0 ? -GB_FIELD.HALF_LENGTH : GB_FIELD.HALF_LENGTH;
  return v3(x, 2, 0);
}

function opponentGate(teamIndex: number): Vec3 {
  return gateCenter(teamIndex === 0 ? 1 : 0);
}

function formationPos(player: GBPlayer, state: GBMatchState): Vec3 {
  // Use dynamic formation template if available
  const templateId = state.teamFormations[player.teamIndex];
  const template = GB_FORMATION_TEMPLATES[templateId];
  const slots = template ? template.slots : GB_FORMATION;
  const slot = slots[player.slotIndex] ?? GB_FORMATION[player.slotIndex];

  const sign = player.teamIndex === 0 ? -1 : 1;

  // Shift formation based on orb position (press up / drop back)
  const orbX = state.orb.pos.x;
  const pressShift = orbX * 0.15 * sign;

  // Apply pressure mode offset
  const pressure = state.pressureMode[player.teamIndex];
  const pressureOffset = getPressureModeOffset(pressure, player.cls);

  const x = sign * (slot.baseX + pressureOffset) * GB_FIELD.HALF_LENGTH + pressShift;
  const z = slot.baseZ * GB_FIELD.HALF_WIDTH;
  return v3(x, 0, z);
}

// ---------------------------------------------------------------------------
// Pressure mode affects how far up/back the formation sits
// ---------------------------------------------------------------------------
function getPressureModeOffset(mode: GBPressureMode, cls: GBPlayerClass): number {
  switch (mode) {
    case "offensive":
      return cls === GBPlayerClass.GATEKEEPER ? 0.05 : 0.1;
    case "ultra_attack":
      return cls === GBPlayerClass.GATEKEEPER ? 0.08 : 0.2;
    case "defensive":
      return cls === GBPlayerClass.GATEKEEPER ? -0.02 : -0.1;
    case "park_the_bus":
      return cls === GBPlayerClass.GATEKEEPER ? -0.03 : -0.2;
    default:
      return 0;
  }
}

// ---------------------------------------------------------------------------
// AI Formation & Pressure Adaptation
// Adapts formation and pressure based on score differential and time remaining
// ---------------------------------------------------------------------------
export function adaptFormation(state: GBMatchState, teamIndex: number): void {
  const scoreDiff = state.scores[teamIndex] - state.scores[teamIndex === 0 ? 1 : 0];
  const timeRemaining = GB_MATCH.HALF_DURATION - state.matchClock;
  const isLateGame = timeRemaining < GB_MATCH.HALF_DURATION * 0.25;
  const isMidGame = timeRemaining < GB_MATCH.HALF_DURATION * 0.5;

  // AI adapts based on score and time
  if (scoreDiff <= -2 && isLateGame) {
    // Losing badly late: go ultra-attack
    state.teamFormations[teamIndex] = "1-1-3-2";
    state.pressureMode[teamIndex] = "ultra_attack";
  } else if (scoreDiff <= -1 && isMidGame) {
    // Losing: attack more
    state.teamFormations[teamIndex] = "1-1-3-2";
    state.pressureMode[teamIndex] = "offensive";
  } else if (scoreDiff >= 2 && isLateGame) {
    // Winning comfortably late: park the bus
    state.teamFormations[teamIndex] = "1-3-2-1";
    state.pressureMode[teamIndex] = "park_the_bus";
  } else if (scoreDiff >= 1 && isLateGame) {
    // Winning late: go defensive
    state.teamFormations[teamIndex] = "1-3-2-1";
    state.pressureMode[teamIndex] = "defensive";
  } else if (scoreDiff === 0) {
    // Drawing: balanced
    state.teamFormations[teamIndex] = "1-2-2-2";
    state.pressureMode[teamIndex] = "balanced";
  } else {
    // Default based on play style
    state.pressureMode[teamIndex] = "balanced";
  }
}

// ---------------------------------------------------------------------------
// Set piece formation positioning
// ---------------------------------------------------------------------------
export function applySetPieceFormation(state: GBMatchState, teamIndex: number, type: "corner" | "free_kick"): void {
  const templateId = type === "corner" ? "corner_attack" : "free_kick_attack";
  // Temporarily override the team formation
  state.teamFormations[teamIndex] = templateId;
}

function bestPassTarget(state: GBMatchState, player: GBPlayer): GBPlayer | null {
  const teammates = getTeamPlayers(state, player.teamIndex).filter(
    t => t.id !== player.id && t.stunTimer <= 0 && t.foulTimer <= 0
  );
  if (teammates.length === 0) return null;

  const oppGate = opponentGate(player.teamIndex);

  // Score each teammate: prefer closer to opponent gate, and not too close to opponents
  let best: GBPlayer | null = null;
  let bestScore = -Infinity;

  for (const t of teammates) {
    const distToGoal = v3Dist(t.pos, oppGate);
    const distFromMe = v3Dist(t.pos, player.pos);

    // Check if there's an opponent between us
    const opponents = getTeamPlayers(state, player.teamIndex === 0 ? 1 : 0);
    let blocked = false;
    for (const opp of opponents) {
      // Simple line-of-sight check
      const toTeammate = v3Sub(t.pos, player.pos);
      const toOpp = v3Sub(opp.pos, player.pos);
      const dot = toTeammate.x * toOpp.x + toTeammate.z * toOpp.z;
      const tLen = v3Len(toTeammate);
      const oLen = v3Len(toOpp);
      if (tLen > 0.1 && oLen > 0.1 && oLen < tLen) {
        const cross = Math.abs(toTeammate.x * toOpp.z - toTeammate.z * toOpp.x) / tLen;
        if (cross < 3 && dot > 0) { blocked = true; break; }
      }
    }

    let score = 100 - distToGoal; // prefer closer to goal
    if (distFromMe < 5) score -= 20; // too close, not useful
    if (distFromMe > 40) score -= 15; // too far, risky pass
    if (blocked) score -= 30;
    if (t.cls === GBPlayerClass.MAGE) score += 10; // mages are good attackers
    if (t.cls === GBPlayerClass.ROGUE) score += 5;

    if (score > bestScore) { bestScore = score; best = t; }
  }

  return best;
}

function shouldShoot(state: GBMatchState, player: GBPlayer): boolean {
  const oppGate = opponentGate(player.teamIndex);
  const dist = v3Dist(player.pos, oppGate);
  if (dist > 35) return false;
  if (dist < 15) return true; // close enough, take the shot immediately

  // Check if gatekeeper is out of position
  const oppTeam = player.teamIndex === 0 ? 1 : 0;
  const gk = getTeamPlayers(state, oppTeam).find(p => p.cls === GBPlayerClass.GATEKEEPER);
  if (gk) {
    const gkDistToGate = v3Dist(gk.pos, oppGate);
    if (gkDistToGate > 6) return true; // gatekeeper out of position
  }

  // Random chance based on distance (higher chance than before)
  return Math.random() < (1 - dist / 35) * 0.4;
}

// ---------------------------------------------------------------------------
// Assign AI roles
// ---------------------------------------------------------------------------
export function assignAIRoles(state: GBMatchState, teamIndex: number): void {
  const players = getTeamPlayers(state, teamIndex);
  const carrier = getOrbCarrier(state);
  const weHaveOrb = carrier != null && carrier.teamIndex === teamIndex;
  const orbPos = state.orb.pos;

  for (const p of players) {
    if (p.stunTimer > 0 || p.foulTimer > 0) continue;

    if (p.cls === GBPlayerClass.GATEKEEPER) {
      p.aiRole = "defend";
      continue;
    }

    if (carrier && carrier.id === p.id) {
      p.aiRole = "attack";
      continue;
    }

    if (weHaveOrb) {
      // Our team has the orb
      if (p.cls === GBPlayerClass.KNIGHT) {
        p.aiRole = "support"; // move up to support
      } else if (p.cls === GBPlayerClass.ROGUE) {
        p.aiRole = "attack"; // get open for pass
      } else {
        p.aiRole = "attack";
      }
    } else {
      // Opponent has the orb or it's free
      if (state.orb.carrier == null) {
        // Free orb - closest player chases
        let closest = players[0];
        let closestDist = Infinity;
        for (const pp of players) {
          if (pp.cls === GBPlayerClass.GATEKEEPER) continue;
          const d = v3Dist(pp.pos, orbPos);
          if (d < closestDist) { closestDist = d; closest = pp; }
        }
        if (p.id === closest.id) {
          p.aiRole = "chase_orb";
        } else if (p.cls === GBPlayerClass.KNIGHT) {
          p.aiRole = "defend";
        } else {
          p.aiRole = "return"; // go back to formation
        }
      } else {
        // Opponent has orb
        if (p.cls === GBPlayerClass.KNIGHT) {
          p.aiRole = "defend";
        } else if (p.cls === GBPlayerClass.ROGUE) {
          // Mark the carrier or chase
          const d = v3Dist(p.pos, orbPos);
          if (d < 20 && carrier) {
            p.aiRole = "chase_orb";
            p.aiTarget = carrier.id;
          } else {
            p.aiRole = "mark";
            // Find nearest opponent to mark
            const opps = getTeamPlayers(state, teamIndex === 0 ? 1 : 0);
            let nearestOpp: GBPlayer | null = null;
            let nearestD = Infinity;
            for (const o of opps) {
              const od = v3Dist(o.pos, p.pos);
              if (od < nearestD && carrier && o.id !== carrier.id) { nearestD = od; nearestOpp = o; }
            }
            if (nearestOpp) p.aiTarget = nearestOpp.id;
          }
        } else {
          p.aiRole = "return";
        }
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Decide action for one AI player
// ---------------------------------------------------------------------------
export function decideAI(state: GBMatchState, player: GBPlayer, _dt: number): AIDecision {
  if (player.stunTimer > 0 || player.foulTimer > 0) return { ...EMPTY_DECISION };
  if (state.phase !== GBMatchPhase.PLAYING && state.phase !== GBMatchPhase.OVERTIME) return { ...EMPTY_DECISION };

  const decision: AIDecision = { ...EMPTY_DECISION };
  const iHaveOrb = player.hasOrb;

  // --- Gatekeeper logic ---
  if (player.cls === GBPlayerClass.GATEKEEPER) {
    return decideGatekeeper(state, player, decision);
  }

  // --- Has orb: attack ---
  if (iHaveOrb) {
    return decideWithOrb(state, player, decision);
  }

  // --- Based on AI role ---
  switch (player.aiRole) {
    case "chase_orb":
      return decideChaseOrb(state, player, decision);
    case "defend":
      return decideDefend(state, player, decision);
    case "attack":
      return decideAttackWithoutOrb(state, player, decision);
    case "support":
      return decideSupport(state, player, decision);
    case "mark":
      return decideMark(state, player, decision);
    case "return":
      return decideReturn(state, player, decision);
    default:
      return decideReturn(state, player, decision);
  }
}

// ---------------------------------------------------------------------------
// Role-specific decisions
// ---------------------------------------------------------------------------

function decideGatekeeper(state: GBMatchState, player: GBPlayer, d: AIDecision): AIDecision {
  const myGate = gateCenter(player.teamIndex);
  const orbPos = state.orb.pos;

  // Position between orb and gate center
  const orbToGate = v3Sub(myGate, orbPos);
  const orbToGateLen = v3Len(orbToGate);
  const idealPos = v3Add(myGate, v3Scale(v3Normalize(v3Sub(orbPos, myGate)), Math.min(5, orbToGateLen * 0.3)));
  // Clamp z to gate width
  idealPos.z = Math.max(-GB_FIELD.GATE_WIDTH / 2, Math.min(GB_FIELD.GATE_WIDTH / 2, idealPos.z));

  const distToIdeal = v3Dist(player.pos, idealPos);
  if (distToIdeal > 1) {
    d.moveDir = v3Normalize(v3Sub(idealPos, player.pos));
    d.sprint = distToIdeal > 5;
  }

  // If orb is very close and no carrier, try to grab it
  const orbDist = v3Dist(player.pos, orbPos);
  if (orbDist < 8 && state.orb.carrier == null) {
    d.moveDir = v3Normalize(v3Sub(orbPos, player.pos));
    d.sprint = true;
  }

  // If carrying orb, pass it away immediately
  if (player.hasOrb) {
    d.pass = true;
  }

  // Use ability if opponent is close with orb
  const carrier = getOrbCarrier(state);
  if (carrier && carrier.teamIndex !== player.teamIndex) {
    const carrierDist = v3Dist(player.pos, carrier.pos);
    if (carrierDist < 12 && player.abilityCooldown <= 0 && player.stamina > 30) {
      d.useAbility = true;
    }
    // Tackle if very close
    if (carrierDist < GB_PHYSICS.TACKLE_RANGE * 1.2 && player.tackleCooldown <= 0) {
      d.tackle = true;
    }
  }

  return d;
}

function decideWithOrb(state: GBMatchState, player: GBPlayer, d: AIDecision): AIDecision {
  const oppGate = opponentGate(player.teamIndex);
  const distToGoal = v3Dist(player.pos, oppGate);

  // Very close to goal: prioritize scoring above all else
  if (distToGoal < 6) {
    // Aim directly at gate center and run straight in for a carry-in goal
    const gateCenter = v3(oppGate.x, 0, 0);
    d.moveDir = v3Normalize(v3Sub(gateCenter, player.pos));
    // Don't sprint -- conserve stamina for the shot
    d.sprint = false;

    // Always try to shoot when this close
    if (player.stamina >= 10) {
      d.shoot = true;
      // Mage: use arcane blast for super shot
      if (player.cls === GBPlayerClass.MAGE && player.abilityCooldown <= 0 && player.stamina > 30) {
        d.useAbility = true;
      }
    }
    // Even if we can't shoot (low stamina), keep running at the gate -- the carry-in will score
    return d;
  }

  // Move toward opponent gate
  const moveTarget = v3(oppGate.x, 0, player.pos.z * 0.7); // slight drift toward center
  d.moveDir = v3Normalize(v3Sub(moveTarget, player.pos));

  // When getting close to goal, stop sprinting to conserve stamina for the shot
  if (distToGoal < 15) {
    d.sprint = player.stamina > 50; // only sprint if plenty of stamina
  } else {
    d.sprint = player.stamina > 30;
  }

  // Avoid nearby opponents - dodge (but not when very close to goal, handled above)
  const oppTeam = player.teamIndex === 0 ? 1 : 0;
  const opponents = getTeamPlayers(state, oppTeam);
  for (const opp of opponents) {
    if (opp.stunTimer > 0) continue;
    const dist = v3Dist(opp.pos, player.pos);
    if (dist < 4) {
      // Dodge sideways
      const awayDir = v3Normalize(v3Sub(player.pos, opp.pos));
      // Mix dodge with forward movement
      d.moveDir = v3Normalize(v3Add(d.moveDir!, v3Scale(awayDir, 0.6)));

      // Rogue: use shadow step
      if (player.cls === GBPlayerClass.ROGUE && player.abilityCooldown <= 0 && player.stamina > 20) {
        d.useAbility = true;
      }
    }
  }

  // Decision: shoot or pass
  if (shouldShoot(state, player)) {
    // Mage: use arcane blast for super shot
    if (player.cls === GBPlayerClass.MAGE && player.abilityCooldown <= 0 && player.stamina > 30 && distToGoal < 25) {
      d.useAbility = true;
    }
    d.shoot = true;
  } else if (distToGoal > 20) {
    // Look for pass opportunity
    const passTarget = bestPassTarget(state, player);
    if (passTarget) {
      const passDist = v3Dist(passTarget.pos, player.pos);
      // Check if pass target is closer to goal
      if (v3Dist(passTarget.pos, oppGate) < distToGoal - 5 || Math.random() < 0.02) {
        if (passDist > 15) {
          d.lobPass = true;
        } else {
          d.pass = true;
        }
      }
    }
  }

  // Knight with orb: use shield charge to break through
  if (player.cls === GBPlayerClass.KNIGHT && player.abilityCooldown <= 0 && player.stamina > 25) {
    const nearestOpp = opponents.reduce((best, opp) => {
      const dist = v3Dist(opp.pos, player.pos);
      return dist < v3Dist(best.pos, player.pos) ? opp : best;
    }, opponents[0]);
    if (nearestOpp && v3Dist(nearestOpp.pos, player.pos) < 6) {
      d.useAbility = true;
    }
  }

  return d;
}

function decideChaseOrb(state: GBMatchState, player: GBPlayer, d: AIDecision): AIDecision {
  const orbPos = state.orb.pos;
  const carrier = getOrbCarrier(state);
  const fatigued = isFatigued(player);
  const critFatigued = isCriticallyFatigued(player);

  if (carrier && carrier.teamIndex !== player.teamIndex) {
    // Chase the carrier
    const dist = v3Dist(player.pos, carrier.pos);
    d.moveDir = v3Normalize(v3Sub(carrier.pos, player.pos));
    // Fatigued players conserve stamina
    d.sprint = dist > 5 && player.stamina > 20 && !critFatigued;

    if (dist < GB_PHYSICS.TACKLE_RANGE * 1.3 && player.tackleCooldown <= 0 && !critFatigued) {
      d.tackle = true;
    }

    // Rogue: shadow step to close distance
    if (player.cls === GBPlayerClass.ROGUE && dist < 8 && dist > 3 && player.abilityCooldown <= 0 && !fatigued) {
      d.useAbility = true;
    }
  } else {
    // Free orb, run to it
    d.moveDir = v3Normalize(v3Sub(orbPos, player.pos));
    d.sprint = player.stamina > 15 && !critFatigued;
  }

  return d;
}

function decideDefend(state: GBMatchState, player: GBPlayer, d: AIDecision): AIDecision {
  const myGate = gateCenter(player.teamIndex);
  const orbPos = state.orb.pos;

  // Position between orb and own gate, but not too close to gate
  const defendPos = v3Add(myGate, v3Scale(v3Normalize(v3Sub(orbPos, myGate)), 15));
  // Offset slightly by slot
  defendPos.z += (player.slotIndex % 2 === 0 ? -5 : 5);

  const dist = v3Dist(player.pos, defendPos);
  if (dist > 2) {
    d.moveDir = v3Normalize(v3Sub(defendPos, player.pos));
    d.sprint = dist > 10;
  }

  // If opponent with orb is nearby, engage
  const carrier = getOrbCarrier(state);
  if (carrier && carrier.teamIndex !== player.teamIndex) {
    const carrierDist = v3Dist(player.pos, carrier.pos);
    if (carrierDist < 10) {
      d.moveDir = v3Normalize(v3Sub(carrier.pos, player.pos));
      d.sprint = true;
      if (carrierDist < GB_PHYSICS.TACKLE_RANGE * 1.3 && player.tackleCooldown <= 0) {
        d.tackle = true;
      }
    }
  }

  return d;
}

function decideAttackWithoutOrb(state: GBMatchState, player: GBPlayer, d: AIDecision): AIDecision {
  const oppGate = opponentGate(player.teamIndex);

  // Get open for a pass - move toward opponent half, spread out
  const targetX = oppGate.x * 0.5;
  const targetZ = (player.slotIndex % 2 === 0 ? -1 : 1) * (10 + Math.sin(Date.now() * 0.001 + player.id) * 8);
  const target = v3(targetX, 0, targetZ);

  const dist = v3Dist(player.pos, target);
  if (dist > 3) {
    d.moveDir = v3Normalize(v3Sub(target, player.pos));
    d.sprint = false;
  }

  // If orb is nearby and free, grab it
  if (state.orb.carrier == null) {
    const orbDist = v3Dist(player.pos, state.orb.pos);
    if (orbDist < 10) {
      d.moveDir = v3Normalize(v3Sub(state.orb.pos, player.pos));
      d.sprint = true;
    }
  }

  // Call for pass if in good position
  const carrier = getOrbCarrier(state);
  if (carrier && carrier.teamIndex === player.teamIndex && carrier.id !== player.id) {
    const distToOppGate = v3Dist(player.pos, oppGate);
    const carrierDistToOppGate = v3Dist(carrier.pos, oppGate);
    if (distToOppGate < carrierDistToOppGate - 5) {
      d.callForPass = true;
    }
  }

  return d;
}

function decideSupport(state: GBMatchState, player: GBPlayer, d: AIDecision): AIDecision {
  // Move up field to support the attack
  const carrier = getOrbCarrier(state);
  if (carrier && carrier.teamIndex === player.teamIndex) {
    // Position near the carrier but offset
    const offset = v3((player.slotIndex % 2 === 0 ? -8 : 8), 0, (player.slotIndex % 2 === 0 ? -6 : 6));
    const supportPos = v3Add(carrier.pos, offset);
    const dist = v3Dist(player.pos, supportPos);
    if (dist > 3) {
      d.moveDir = v3Normalize(v3Sub(supportPos, player.pos));
      d.sprint = dist > 8;
    }
  } else {
    return decideReturn(state, player, d);
  }

  return d;
}

function decideMark(state: GBMatchState, player: GBPlayer, d: AIDecision): AIDecision {
  if (player.aiTarget == null) return decideReturn(state, player, d);

  const target = getPlayer(state, player.aiTarget);
  if (!target) return decideReturn(state, player, d);

  // Stay between target and own gate
  const myGate = gateCenter(player.teamIndex);
  const idealPos = v3Lerp(target.pos, myGate, 0.2);
  const dist = v3Dist(player.pos, idealPos);

  if (dist > 2) {
    d.moveDir = v3Normalize(v3Sub(idealPos, player.pos));
    d.sprint = dist > 6;
  }

  // If target has orb, tackle
  if (target.hasOrb && v3Dist(player.pos, target.pos) < GB_PHYSICS.TACKLE_RANGE * 1.3 && player.tackleCooldown <= 0) {
    d.tackle = true;
  }

  return d;
}

function decideReturn(state: GBMatchState, player: GBPlayer, d: AIDecision): AIDecision {
  const target = formationPos(player, state);
  const dist = v3Dist(player.pos, target);

  if (dist > 3) {
    d.moveDir = v3Normalize(v3Sub(target, player.pos));
    d.sprint = dist > 12;
  }

  // If orb is very close and free, grab it
  if (state.orb.carrier == null) {
    const orbDist = v3Dist(player.pos, state.orb.pos);
    if (orbDist < 6) {
      d.moveDir = v3Normalize(v3Sub(state.orb.pos, player.pos));
      d.sprint = true;
    }
  }

  return d;
}

// ---------------------------------------------------------------------------
// Lerp utility for Vec3
// ---------------------------------------------------------------------------
function v3Lerp(a: Vec3, b: Vec3, t: number): Vec3 {
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, z: a.z + (b.z - a.z) * t };
}
