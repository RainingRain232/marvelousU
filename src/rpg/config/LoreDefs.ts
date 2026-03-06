export interface LoreEntry {
  id: string;
  title: string;
  text: string;
}

export const LORE_ENTRIES: LoreEntry[] = [
  { id: "lore_01", title: "The Shattered Crown", text: "Long ago, the Crown of Unity held the realm together. When the Dark One shattered it, five shards scattered across the land, each guarded by a terrible evil." },
  { id: "lore_02", title: "The First Kingdom", text: "The Kingdom of Astoria was the first to rise after the Shattering. Its knights swore to recover the Crown, but none returned from the dungeons alive." },
  { id: "lore_03", title: "Dragons of the Lair", text: "The Red Dragons once served the Crown as guardians. When it shattered, they went mad with rage and claimed the volcanic depths as their domain." },
  { id: "lore_04", title: "The Lich Lord's Bargain", text: "Lord Malachar was once a beloved king. He traded his soul for immortality, becoming the Lich Lord who haunts the Dark Crypt." },
  { id: "lore_05", title: "Goblin Tribes", text: "The goblins of the caves were once peaceful miners. The Crown's shattering corrupted them, turning them into savage raiders led by the Troll King." },
  { id: "lore_06", title: "The Round Table", text: "King Arthur gathered the greatest warriors at the Round Table. After the Shattering, they scattered across the realm, each seeking their own path." },
  { id: "lore_07", title: "Merlin's Tower", text: "The great wizard Merlin built his tower at the convergence of ley lines. From there, he watches over the realm, guiding worthy heroes." },
  { id: "lore_08", title: "The Demon Gate", text: "Deep beneath the volcanic wastes lies a gate to the demon realm. Azgaroth used the fourth shard to keep it open, letting his legions pour through." },
  { id: "lore_09", title: "The Abyssal Sanctum", text: "The Dark One's fortress exists between worlds. Only by gathering all five shards can one open the path to face the ultimate evil." },
  { id: "lore_10", title: "Elemental Balance", text: "The ancient mages understood the balance of elements: fire burns nature but yields to cold, lightning strikes water but is grounded by earth." },
  { id: "lore_11", title: "The Order of Light", text: "The clerics and monks of the Order dedicate their lives to healing. Their holy magic is the only force that can truly repel the undead." },
  { id: "lore_12", title: "Dwarven Forge-Masters", text: "The dwarves of the deep mountains craft weapons of legendary quality. Their forge-fire burns with the heart of the earth itself." },
  { id: "lore_13", title: "The Elven Exile", text: "The elves retreated to the Silverwood after the Shattering. Few venture out, but those who do are among the deadliest archers in the realm." },
  { id: "lore_14", title: "Berserker's Rage", text: "The half-orc berserkers channel their fury into devastating attacks. Their battle cry alone has been known to shatter enemy morale." },
  { id: "lore_15", title: "The Assassin's Code", text: "The Shadow Guild operates in secret. Their members strike from the darkness, and their code forbids harming the innocent." },
  { id: "lore_16", title: "Ancient Defenders", text: "The stone guardians found in ruins were once servants of the Crown. They continue their vigil long after their masters turned to dust." },
  { id: "lore_17", title: "The Fairy Ring", text: "Fairy rings appear where magic is strongest. Stepping into one may bring blessing or curse — the fair folk are unpredictable." },
  { id: "lore_18", title: "Dragon Scales", text: "A single dragon scale is worth a fortune. Armor crafted from them is nearly impervious, and weapons gain the dragon's fire." },
  { id: "lore_19", title: "The Crown's Power", text: "When whole, the Crown of Unity granted its bearer dominion over all elements. It could heal the land, calm storms, and even raise the dead." },
  { id: "lore_20", title: "The Prophecy", text: "It is written that a band of heroes will gather the shards and forge the Crown anew. Only then will the Dark One fall, and peace return to the realm." },
];

export function getLoreEntry(id: string): LoreEntry | undefined {
  return LORE_ENTRIES.find(e => e.id === id);
}
