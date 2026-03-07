// Leader introduction dialog — shown once per leader when first encountered.
// Flow: Merlin announces the encounter first, then the leader introduces themselves.

import { getLeader } from "@sim/config/LeaderDefs";
import type { LeaderId } from "@sim/config/LeaderDefs";

// Leader portrait images
import arthurImgUrl from "@/img/arthur.png";
import merlinImgUrl from "@/img/merlin.png";
import queenImgUrl from "@/img/queen.png";
import lancelotImgUrl from "@/img/lancelot.png";
import morganImgUrl from "@/img/morgan.png";
import gawainImgUrl from "@/img/gawain.png";
import galahadImgUrl from "@/img/galahad.png";
import percivalImgUrl from "@/img/percival.png";
import tristanImgUrl from "@/img/tristan.png";
import nimueImgUrl from "@/img/nimue.png";
import kayImgUrl from "@/img/kay.png";
import bedivereImgUrl from "@/img/bedivere.png";
import elaineImgUrl from "@/img/elaine.png";
import mordredImgUrl from "@/img/mordred.png";
import igraineImgUrl from "@/img/igraine.png";
import pellinoreImgUrl from "@/img/pellinore.png";
import ectorImgUrl from "@/img/ector.png";
import borsImgUrl from "@/img/bors.png";
import utherImgUrl from "@/img/uther.png";
import lotImgUrl from "@/img/lot.png";

export const LEADER_IMAGES: Record<string, string> = {
  arthur: arthurImgUrl,
  merlin: merlinImgUrl,
  guinevere: queenImgUrl,
  lancelot: lancelotImgUrl,
  morgan: morganImgUrl,
  gawain: gawainImgUrl,
  galahad: galahadImgUrl,
  percival: percivalImgUrl,
  tristan: tristanImgUrl,
  nimue: nimueImgUrl,
  kay: kayImgUrl,
  bedivere: bedivereImgUrl,
  elaine: elaineImgUrl,
  mordred: mordredImgUrl,
  igraine: igraineImgUrl,
  pellinore: pellinoreImgUrl,
  ector: ectorImgUrl,
  bors: borsImgUrl,
  uther: utherImgUrl,
  lot: lotImgUrl,
};

// ---------------------------------------------------------------------------
// Leader self-introductions — first-person, in their own voice
// ---------------------------------------------------------------------------

const LEADER_INTRODUCTIONS: Record<string, string> = {
  arthur: "I am Arthur Pendragon, rightful King of Britain. I drew the sword from the stone when no other hand could move it, and I shall wield it in defence of this land until my last breath. Stand with me, and together we shall build a kingdom worthy of the ages.",
  merlin: "Ah, you have found old Merlin at last. I have watched the stars turn for longer than mortal memory, and I have seen what is to come. Whether you heed my counsel or not, know this — the forces gathering against us care nothing for crowns or courtesies. We must be ready.",
  guinevere: "I am Guinevere, Queen of Camelot. Do not mistake grace for weakness — I have held this throne against treachery, siege, and whispered conspiracies while better warriors than you rode off to seek glory. My court, my rules.",
  lancelot: "They call me Lancelot du Lac. My blade has never known defeat, and I do not intend for that to change today. If you stand against me, know that no fortress wall and no shield wall has ever held against my charge. Choose your next words carefully.",
  morgan: "I am Morgan le Fay, and I have mastered arts that would shatter your fragile mind. The old magics answer to me — the whispers of Avalon, the secrets of the veil between worlds. Do not presume to understand what I am, little ruler. You see a woman; you should see a storm.",
  gawain: "Gawain of Orkney, at your service — for now. My strength waxes with the sun, and at noon I fight with the fury of three men. I walked to certain death against the Green Knight and came back smiling. Do not test whether my courtesy has limits.",
  galahad: "I am Galahad, and I seek not glory but purpose. The Siege Perilous accepted me where it destroyed all others, and I trust that providence guides my steps still. My sword serves the righteous, and my heart knows no compromise with evil.",
  percival: "I am Percival. They say I came to Camelot a simple fool from the Welsh hills, and perhaps I was. But I have looked upon the Grail, and that changes a man. I build, I fortify, and I endure — that is my way.",
  tristan: "I am Tristan of Cornwall, and my blade sings with a sorrow you could never understand. I have won kingdoms through single combat and claimed contested ground before defenders could draw steel. Make peace with me, or make peace with your maker.",
  nimue: "I am Nimue, Lady of the Lake, guardian of waters older than your bloodline. It was I who gave Arthur Excalibur, and I who raised Lancelot beneath enchanted waves. My blessing wards these walls, and my curse would shatter them. Tread carefully.",
  kay: "Sir Kay, Seneschal of Camelot. While the other knights chase glory and dragons, I manage the treasury, supply the armies, and make certain there is actually a kingdom to come home to. Without me, there is no Camelot — only a pile of very expensive rubble.",
  bedivere: "I am Bedivere, the first knight to swear fealty to Arthur and the last who shall ever abandon him. I lost a hand in battle and fought on. Where I stand, the line does not break. Ever. So consider well before you advance.",
  elaine: "I am Elaine, the Lily Maid of Astolat. They remember my broken heart, but they forget my deadly aim. I trained the finest archers in the realm, and my bowmen have made kings weep from a distance they never even saw. Underestimate me at your peril.",
  mordred: "I am Mordred, and I will have what is rightfully mine. My father denied me the throne, so I shall take it — along with everything else. My warriors strike fast and without mercy, because mercy is a luxury only the strong can afford, and I intend to be the strongest.",
  igraine: "I am Igraine, Duchess of Cornwall, mother of kings and enchantresses alike. I endured the schemes of Uther and the machinations of Merlin with a grace that concealed iron resolve. My temples and healers serve the realm, and my legacy of mercy shall outlast every war my children fight.",
  pellinore: "King Pellinore, sworn hunter of the Questing Beast. I have spent my life pursuing monsters through the wild places where civilised men fear to tread. The creatures of the forest answer to my call, and the beasts I raise are fiercer and more cunning than any your kennels could produce.",
  ector: "I am Ector, the humble lord who raised young Arthur as my own. I never sought the crown or the glory — I sought only to manage my estates with prudence and care. My treasury is always full, my people always fed. That is victory enough for a quiet man.",
  bors: "I am Bors the Steadfast. I am neither the purest knight nor the mightiest, but I am the one who is always exactly where I need to be. My soldiers absorb my confidence, and they fight with both greater heart and sharper steel because of it.",
  uther: "I am Uther Pendragon, the dragon-bannered king who united Britain by force when sweet words failed. Gold flows into my coffers because men fear what happens when it does not. Bend the knee, or discover why they call me the Pendragon.",
  lot: "I am Lot, King of Orkney, lord of the storm-battered northern isles. My keeps are carved from cliffs so sheer no army has ever scaled them. Thick walls, deep moats, and supplies for years — you may lay siege to my lands, but you will grow old and grey before they fall.",
};

// ---------------------------------------------------------------------------
// Merlin announcements — what Merlin says before the leader speaks
// ---------------------------------------------------------------------------

const MERLIN_ANNOUNCEMENTS: Record<string, string> = {
  arthur: "My liege, we have encountered forces loyal to Arthur Pendragon himself! He is a formidable ruler — tread carefully, for his knights are among the finest in the land.",
  merlin: "How curious — another Merlin! Or perhaps an imposter wearing my name. Regardless, this one commands real power. Do not underestimate a fellow student of the arcane.",
  guinevere: "We have encountered the banners of Queen Guinevere. She rules with an iron will beneath a velvet glove. Her court may seem gentle, but her armies are anything but.",
  lancelot: "My liege, those are the colours of Lancelot du Lac — the greatest knight who ever lived. His charge has shattered every army it has met. I urge extreme caution.",
  morgan: "I sense powerful magic nearby… Morgan le Fay! My old rival commands forces in these lands. Her sorcery is dangerous, my liege — do not let her enchantments cloud your judgement.",
  gawain: "We have spotted the banner of Gawain, Knight of the Sun. His strength grows with the daylight — engage him at dusk if you must engage him at all.",
  galahad: "Those are the arms of Sir Galahad, the Pure Knight. Providence itself seems to favour his campaigns. A most formidable opponent, my liege.",
  percival: "The banner of Percival, Seeker of the Grail! He is a builder and a defender — his fortifications will not fall easily. Prepare for a long campaign.",
  tristan: "We have found forces belonging to Tristan of Cornwall. His swordsmanship is legendary, and he strikes with a swiftness that leaves enemies reeling. Be on your guard.",
  nimue: "The Lady of the Lake has claimed these lands! Nimue's magic rivals my own, and her defences are warded by enchantments older than Camelot itself.",
  kay: "Those banners belong to Sir Kay, Seneschal of Camelot. Do not be fooled by his reputation as a mere steward — his armies are the best-supplied and most efficiently run in the realm.",
  bedivere: "We face Sir Bedivere, the Loyal Hand. He lost a hand in battle yet fights on with a fury that shames lesser men. Where he plants his standard, the line does not break.",
  elaine: "The Lily Maid's archers have been spotted, my liege! Lady Elaine's bowmen are the deadliest in the realm. Keep your shields high and your wits higher.",
  mordred: "Dark tidings, my liege — we have encountered Mordred's forces! Arthur's illegitimate son fights without honour or restraint. His warriors attack with frenzied speed. Be wary.",
  igraine: "The banners of Igraine, Duchess of Cornwall! She is a woman of deep faith and iron will. Her healers and temples make her forces resilient beyond measure.",
  pellinore: "King Pellinore's beast-banners fly nearby! The Questing King commands creatures of unusual cunning and savagery. His monster dens produce fearsome war-beasts.",
  ector: "We have encountered Lord Ector's forces. Arthur's foster-father is a humble man, but his coffers run deep and his estates are prosperous. He can field armies where others cannot.",
  bors: "The steadfast Sir Bors commands forces in these lands. He is neither flashy nor boastful, but his soldiers fight with quiet confidence and surprising tenacity.",
  uther: "The Pendragon banner flies! Uther, Arthur's father, rules through strength and cunning. Gold flows ceaselessly into his war chest — expect a well-funded enemy, my liege.",
  lot: "We have found the fortress-banners of King Lot of Orkney! His strongholds are legendary for their impregnability. Sieging his holdings will test our patience and our supply lines.",
};

// ---------------------------------------------------------------------------
// Tracking
// ---------------------------------------------------------------------------

const _introducedLeaders = new Set<string>();

export function hasBeenIntroduced(leaderId: string): boolean {
  return _introducedLeaders.has(leaderId);
}

export function markIntroduced(leaderId: string): void {
  _introducedLeaders.add(leaderId);
}

// ---------------------------------------------------------------------------
// Dialog helpers (DOM-based, matching existing Merlin dialog style)
// ---------------------------------------------------------------------------

function _showCharacterDialog(
  imgSrc: string,
  name: string,
  title: string,
  quote: string,
  borderColor: string,
  glowColor: string,
): Promise<void> {
  return new Promise((resolve) => {
    const backdrop = document.createElement("div");
    backdrop.style.cssText = "position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.7);display:flex;align-items:center;justify-content:center;z-index:9999;";

    const card = document.createElement("div");
    card.style.cssText = `background:#1a1a2e;border:2px solid ${borderColor};border-radius:12px;padding:24px;max-width:480px;text-align:center;box-shadow:0 0 30px ${glowColor};`;

    const img = document.createElement("img");
    img.src = imgSrc;
    img.style.cssText = `width:100px;height:100px;border-radius:50%;border:2px solid ${borderColor};margin-bottom:12px;image-rendering:pixelated;object-fit:cover;`;
    card.appendChild(img);

    const titleEl = document.createElement("div");
    titleEl.textContent = name;
    titleEl.style.cssText = `color:${borderColor};font-family:monospace;font-size:18px;font-weight:bold;margin-bottom:4px;`;
    card.appendChild(titleEl);

    const subtitleEl = document.createElement("div");
    subtitleEl.textContent = title;
    subtitleEl.style.cssText = "color:#aaaacc;font-family:monospace;font-size:12px;font-style:italic;margin-bottom:12px;";
    card.appendChild(subtitleEl);

    const text = document.createElement("div");
    text.textContent = `\u201C${quote}\u201D`;
    text.style.cssText = "color:#ccccdd;font-family:monospace;font-size:12px;line-height:1.6;margin-bottom:16px;text-align:left;padding:0 8px;";
    card.appendChild(text);

    const btn = document.createElement("button");
    btn.textContent = "Very well.";
    btn.style.cssText = `background:#222244;color:white;border:1px solid ${borderColor};border-radius:6px;padding:8px 24px;font-family:monospace;font-size:13px;cursor:pointer;`;
    btn.onmouseenter = () => { btn.style.background = "#334466"; };
    btn.onmouseleave = () => { btn.style.background = "#222244"; };
    btn.onclick = () => { backdrop.remove(); resolve(); };
    card.appendChild(btn);

    backdrop.appendChild(card);
    document.body.appendChild(backdrop);
  });
}

// ---------------------------------------------------------------------------
// Main encounter function — call when player first encounters an enemy leader
// ---------------------------------------------------------------------------

/**
 * Shows the leader introduction sequence:
 * 1. Merlin announces the encounter
 * 2. The leader introduces themselves
 *
 * Only triggers once per leader per session.
 * Returns a resolved promise if the leader was already introduced.
 */
export async function showLeaderIntroduction(leaderId: LeaderId): Promise<void> {
  if (_introducedLeaders.has(leaderId)) return;
  _introducedLeaders.add(leaderId);

  const leaderDef = getLeader(leaderId);
  if (!leaderDef) return;

  const intro = LEADER_INTRODUCTIONS[leaderId];
  if (!intro) return;

  // Step 1: Merlin announces the encounter
  const merlinAnnouncement = MERLIN_ANNOUNCEMENTS[leaderId];
  if (merlinAnnouncement) {
    await _showCharacterDialog(
      merlinImgUrl,
      "MERLIN",
      "Archmage of Avalon",
      merlinAnnouncement,
      "#aa88dd",
      "rgba(136,68,204,0.4)",
    );
  }

  // Step 2: The leader introduces themselves
  const leaderImg = LEADER_IMAGES[leaderId];
  if (leaderImg) {
    await _showCharacterDialog(
      leaderImg,
      leaderDef.name.toUpperCase(),
      leaderDef.title,
      intro,
      "#cc8844",
      "rgba(204,136,68,0.4)",
    );
  }
}
