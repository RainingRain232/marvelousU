// Main menu wiki screen — tabbed encyclopedia with lore, units, spells, buildings.
// Accessed from the main menu via the WIKI button.

import {
  Container, Graphics, Text, TextStyle, Rectangle,
} from "pixi.js";
import type { ViewManager } from "@view/ViewManager";
import { AmbientParticles } from "@view/fx/AmbientParticles";
import { t } from "@/i18n/i18n";
import { getAllWorldBuildingDefs } from "@world/config/WorldBuildingDefs";
import type { WorldBuildingDef } from "@world/config/WorldBuildingDefs";

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const STYLE_TITLE = new TextStyle({
  fontFamily: "monospace", fontSize: 29, fill: 0xffd700,
  fontWeight: "bold", letterSpacing: 3,
});

const STYLE_TAB = new TextStyle({
  fontFamily: "monospace", fontSize: 13, fill: 0xaabbcc, fontWeight: "bold",
});

const STYLE_TAB_ACTIVE = new TextStyle({
  fontFamily: "monospace", fontSize: 13, fill: 0xffd700, fontWeight: "bold",
});

const STYLE_BODY = new TextStyle({
  fontFamily: "monospace", fontSize: 12, fill: 0xccddee,
  wordWrap: true, wordWrapWidth: 900,
  lineHeight: 20,
});

const STYLE_LORE_HEADING = new TextStyle({
  fontFamily: "monospace", fontSize: 14, fill: 0xffd700, fontWeight: "bold",
  letterSpacing: 1,
});

const STYLE_ITEM_NAME = new TextStyle({
  fontFamily: "monospace", fontSize: 14, fill: 0xffd700, fontWeight: "bold",
});

const STYLE_ITEM_STAT = new TextStyle({
  fontFamily: "monospace", fontSize: 12, fill: 0xaabbcc,
});

const STYLE_ITEM_EFFECT = new TextStyle({
  fontFamily: "monospace", fontSize: 12, fill: 0x88ffaa,
});

const STYLE_ITEM_REQ = new TextStyle({
  fontFamily: "monospace", fontSize: 12, fill: 0xcc8844,
});

// Layout
const BG_COLOR = 0x0a0a18;
const BORDER_COLOR = 0xffd700;
const CARD_W = 1000;
const CARD_H = 700;
const CORNER_R = 10;
const TAB_H = 36;

type WikiTab = "guidance" | "lore" | "game_modes" | "leaders" | "units" | "spells" | "buildings" | "world_buildings" | "world_research";

const TAB_DEFS: { id: WikiTab; label: string }[] = [
  { id: "guidance", label: "★ GUIDANCE" },
  { id: "lore", label: "LORE" },
  { id: "game_modes", label: "GAME MODES" },
  { id: "leaders", label: "LEADERS" },
  { id: "units", label: "UNITS" },
  { id: "spells", label: "SPELLS" },
  { id: "buildings", label: "BUILDINGS" },
  { id: "world_buildings", label: "WORLD BUILDINGS" },
  { id: "world_research", label: "RESEARCH" },
];

// ---------------------------------------------------------------------------
// Lore content (from arthurian_lore.docx)
// ---------------------------------------------------------------------------

interface LoreSection {
  heading: string;
  body: string;
}

const LORE_SECTIONS: LoreSection[] = [
  {
    heading: "THE CHRONICLES OF CAMELOT",
    body: "A World Compendium — Background Lore",
  },
  {
    heading: "The Age of Arthur",
    body: "Britain stands fractured. The Roman legions withdrew generations ago, leaving behind crumbling roads, empty forts, and a power vacuum that a dozen petty kings rushed to fill. Saxon warbands raid the eastern shores with growing boldness. The old Celtic faiths clash with the rising influence of Christian monasteries. Into this chaos steps Arthur Pendragon, a young warlord of uncertain parentage who draws a blade from an enchanted stone and unites the warring kingdoms under a single banner. His reign ushers in a brief golden age, but the seeds of its downfall are sown from the very beginning.",
  },
  {
    heading: "The Rise of a King",
    body: "Arthur is raised in obscurity by Sir Ector, unaware of his true bloodline. His father, Uther Pendragon, conceived him through a deception engineered by the sorcerer Merlin, who demanded the child as payment for his services. When Uther dies without a recognized heir, the realm splinters. Merlin orchestrates a test: a sword embedded in an anvil atop a stone, inscribed with the promise that whoever draws it is the rightful king. Arthur, serving as squire to Ector's son Kay, pulls the blade almost by accident. The act is met not with celebration but with fury. Established lords refuse to kneel before an unknown boy. Arthur must win his throne through a brutal campaign of battles against rebel kings, Saxon invaders, and opportunistic warlords. Only after years of bloodshed does he consolidate enough power to establish his court at Camelot.",
  },
  {
    heading: "Camelot and the Round Table",
    body: "Camelot is more than a castle. It is an idea: that justice and honour can hold together a kingdom that violence alone cannot. At its heart sits the Round Table, a massive circular council where no seat ranks above another. Arthur fills these seats with the greatest warriors and noblest minds of the age. Each knight swears an oath to defend the weak, speak truth, and pursue justice above personal gain. The system works, for a time. Disputes between lords are settled by law rather than sword. Trade routes are protected. The Saxon advance is halted. But the Table's strength is also its fragility. It depends entirely on the moral integrity of its members, and mortals are imperfect creatures.",
  },
  {
    heading: "Arthur Pendragon",
    body: "A warrior-king who genuinely believes in the ideals he preaches. Arthur is neither naive nor cruel. He is a skilled battlefield commander who would rather negotiate than fight, but who fights decisively when negotiation fails. His greatest flaw is a tendency to trust the people he loves long past the point where that trust is warranted. He knows, on some level, what transpires between Lancelot and Guinevere, but confronting it would destroy everything he has built. This willful blindness ultimately costs him his kingdom.",
  },
  {
    heading: "Merlin",
    body: "The architect behind Arthur's rise. Merlin is ancient, possibly half-human, and operates on a timescale that makes his motives opaque to everyone around him. He sees fragments of the future and manipulates events to steer history toward outcomes only he understands. He is Arthur's greatest asset and most dangerous ally. His power is immense but not unlimited. He is ultimately undone not by an enemy but by his own fascination with the enchantress Nimue, who traps him using the very magic he taught her.",
  },
  {
    heading: "Guinevere",
    body: "Arthur's queen is a political figure in her own right, not merely a consort. She is intelligent, ambitious, and deeply committed to Camelot's success. Her affair with Lancelot is not a simple betrayal but a tragic collision between personal desire and public duty. She loves Arthur as a partner and Lancelot as a soul. The impossibility of reconciling these loyalties tears all three of them apart and provides the crack through which Camelot's enemies strike.",
  },
  {
    heading: "Lancelot du Lac",
    body: "The greatest knight of the Round Table and its ultimate destroyer. Lancelot is raised by the Lady of the Lake in the enchanted realm beneath the waters, emerging as a warrior without equal. His devotion to Arthur is genuine, which makes his love for Guinevere agonizing rather than treacherous. He tries repeatedly to distance himself, undertaking dangerous quests and voluntary exile, but is drawn back every time. When the affair is finally exposed, Lancelot rescues Guinevere from execution, killing fellow knights in the process. The brotherhood of the Round Table shatters beyond repair.",
  },
  {
    heading: "Morgana le Fay",
    body: "Arthur's half-sister and the most formidable sorceress in Britain. Morgana's opposition to Arthur is not born from simple villainy. She represents the old ways: the pre-Christian traditions, the matrilineal power structures, and the wild magic that Merlin and Arthur's new order threatens to erase. She is a healer, a shapeshifter, and a strategist who wages a shadow war against Camelot through enchantment, political manipulation, and the careful cultivation of her son, Mordred.",
  },
  {
    heading: "Mordred",
    body: "The son of Arthur and Morgana, born of an unwitting union that haunts the king for the rest of his life. Mordred is raised to despise his father, yet he also craves Arthur's recognition. He is cunning, charismatic, and patient. He arrives at Camelot as a young knight, earns a seat at the Round Table, and waits. When Arthur rides to war against Lancelot, Mordred seizes the throne and rallies the discontented lords. The final battle between father and son at Camlann ends them both and brings the age of Camelot to its close.",
  },
  {
    heading: "Magic in the Realm",
    body: "Magic in Arthurian Britain is ancient, dangerous, and deeply tied to the land itself. It is not a system to be mastered through study alone but a living force that flows through sacred sites, standing stones, and enchanted waters. Practitioners draw power from ley lines that crisscross the island, and the potency of their spells waxes and wanes with the seasons. The old druidic traditions treat magic as a covenant with the natural world: take too much and the land withers; give back and it flourishes. Merlin's sorcery, Morgana's enchantments, and the blessings of the Lady of the Lake all stem from this same wellspring, though each channels it differently.",
  },
  {
    heading: "The Schools of Power",
    body: "Several distinct traditions of magic exist. The Druidic Path channels elemental forces through ritual and sacrifice, commanding storms, accelerating growth, and communing with the spirits of place. The Enchanter's Art, practiced by Merlin and Nimue, focuses on illusion, foresight, and the manipulation of fate. The Fay Craft of Morgana and the Ladies of the Lake blends shapeshifting, healing, and the ability to step between the mortal world and the Otherworld. Necromancy, whispered about in fearful tones, draws on the restless dead and corrupts the ley lines wherever it is practiced. Finally, the Holy Tradition channels divine power through faith, prayer, and sacred relics, and stands in uneasy tension with the older magical arts.",
  },
  {
    heading: "The Factions of Britain",
    body: "Arthur's Britain is not a unified nation but a fragile alliance of competing powers. The Pendragon Loyalists hold the heartland and defend the ideals of the Round Table. The Northern Kings, proud and independent, resent southern authority and cooperate only when Saxon raids threaten their own borders. The Saxon Warbands control the eastern coastline and push steadily inland, establishing permanent settlements and fortified halls. The Fay Courts operate in the liminal spaces between the mortal world and the Otherworld, pursuing agendas that span centuries. Morgana's Shadow Court works to undermine Camelot from within, cultivating disaffected knights and ambitious lords. The Church Militant, emboldened by Rome's blessing, seeks to stamp out pagan magic and establish spiritual authority over even the king.",
  },
  {
    heading: "The Fall of Camelot",
    body: "Camelot does not fall to a single catastrophe. It erodes. The Grail Quest strips the Round Table of its finest knights: some die in the wilderness, others achieve the vision and never return, and those who fail come back diminished, haunted by their unworthiness. With the Table weakened, long-suppressed grievances resurface. When Mordred exposes Lancelot and Guinevere's affair, it detonates every fault line at once. Arthur is forced by his own laws to condemn his wife. Lancelot's rescue splits the knighthood into warring camps. Arthur pursues Lancelot to the continent, leaving Mordred as regent. The rest unfolds with terrible inevitability. Mordred declares Arthur dead and claims the crown. Arthur returns to a civil war. At the Battle of Camlann, father and son destroy each other.\n\nThe mortally wounded Arthur is carried to the shores of a mist-shrouded lake. A barge appears, crewed by veiled women. They bear him to the Isle of Avalon, where he is said to sleep still, healing from his wounds, waiting for the hour when Britain's need is greatest. The sword Excalibur is returned to the waters. The Round Table lies empty. But the story does not end. It waits.",
  },
];

// ---------------------------------------------------------------------------
// Leader lore (from Legends_of_Camelot_Lore.docx)
// ---------------------------------------------------------------------------

interface LeaderLore {
  name: string;
  title: string;
  body: string;
}

const LEADER_LORE: LeaderLore[] = [
  {
    name: "Arthur",
    title: "The Once and Future King",
    body: "Arthur stands at the heart of British mythological tradition, a figure whose origins stretch back to the earliest Welsh and Latin chronicles of the post-Roman period. The ninth-century Historia Brittonum lists him as a war leader who fought twelve battles against Saxon invaders, culminating in a decisive victory at Mount Badon. Geoffrey of Monmouth transformed this shadowy commander into a full-blown monarch in his twelfth-century Historia Regum Britanniae, weaving together threads of Welsh poetry, folk memory, and pure invention to create the king we recognise today.\n\nAccording to the legends, Arthur was conceived at Tintagel through Merlin's sorcery, raised in secret by Sir Ector, and revealed as the rightful heir when he drew a sword from a stone that no other man could move. He established his court at Camelot, gathered the finest warriors of the age to his Round Table, and forged a fragmented land into a united kingdom through courage and justice. His reign became a golden age of chivalry, cut short by civil war and the treachery of those closest to him.\n\nAt the Battle of Camlann, Arthur fell fighting his own kin, and was carried away by mysterious queens to the isle of Avalon. No grave was ever found. The enduring belief that Arthur sleeps beneath the hills, waiting to return in Britain's hour of greatest need, earned him the title Rex Quondam Rexque Futurus — the Once and Future King — a symbol of hope that has persisted for nearly a thousand years.",
  },
  {
    name: "Merlin",
    title: "Archmage of Avalon",
    body: "Merlin is the archetypal wizard of Western literature, yet his origins are surprisingly tangled. Geoffrey of Monmouth created the character by fusing two distinct traditions: the historical Welsh bard Myrddin Wyllt, a sixth-century poet said to have been driven mad by the horrors of battle, and the Romano-British leader Ambrosius Aurelianus, whose prophetic abilities were recorded in earlier chronicles. The resulting figure — Merlin Ambrosius — first appeared in Geoffrey's Historia Regum Britanniae around 1136.\n\nMedieval tradition held that Merlin was born of a mortal woman and a supernatural being, an origin that granted him prophetic sight and command over forces beyond mortal understanding. He served as counsellor to Uther Pendragon and engineered the circumstances of Arthur's conception at Tintagel. Later romances, particularly those of Robert de Boron and the Vulgate Cycle, expanded his role into that of Arthur's mentor and the architect of the Round Table itself.\n\nMerlin's downfall came through love. The enchantress known variously as Viviane, Nimue, or Niniane learned his secrets and used them to imprison him — within a tree, a cave, or an invisible tower, depending on the telling. His voice fell silent, and Camelot lost its wisest guide. Yet the legend suggests his counsel never truly ended; across the centuries, storytellers have imagined his voice still echoing in the deep places of the earth, guiding those wise enough to listen.",
  },
  {
    name: "Guinevere",
    title: "Queen of Camelot",
    body: "Guinevere first appears in Geoffrey of Monmouth's chronicle as a noblewoman of Roman descent, and later romances describe her as the daughter of King Leodegrance of Cameliard. Her marriage to Arthur brought the Round Table itself as a dowry, along with a hundred knights — a detail that underscores her importance to the political foundation of Camelot.\n\nAcross the centuries, Guinevere has been portrayed as everything from a wise and capable queen to a tragic figure whose passions brought ruin upon the kingdom. The twelfth-century French poet Chrétien de Troyes established her love affair with Lancelot as a central thread of the Arthurian cycle, and Thomas Malory's Le Morte d'Arthur gave the story its most enduring form. In Malory's telling, the queen's relationship with Lancelot is the slow-burning fuse that eventually detonates the fellowship of the Round Table, splitting its greatest champions into warring factions.\n\nYet Guinevere was no passive figure. Multiple traditions describe her as a shrewd ruler who held court in Arthur's absence, dispensing justice with an authority that silenced even the most quarrelsome lords. Her story ends in repentance: after the fall of Camelot, she withdrew to a convent and lived out her remaining years in reflection, a final act that medieval audiences would have read as both punishment and redemption.",
  },
  {
    name: "Lancelot",
    title: "Knight of the Lake",
    body: "Lancelot is a comparatively late addition to the Arthurian canon. He has no presence in the earliest Welsh or Latin sources; his first major appearance is in Chrétien de Troyes's twelfth-century poem Lancelot, the Knight of the Cart, which already centres on his devotion to Guinevere. The vast prose Lancelot-Grail cycle of the thirteenth century then expanded his biography into an epic spanning his entire life.\n\nAccording to the romances, Lancelot was the orphaned son of King Ban of Benoic, spirited away as an infant by the Lady of the Lake and raised in her enchanted domain beneath the waters. He emerged as a young man of extraordinary martial ability, quickly establishing himself as the foremost knight of the Round Table. His prowess in battle and tournament was unmatched; his lance shattered shields and his sword settled sieges that armies could not.\n\nThe tragedy of Lancelot lies in the contradiction at his core. His absolute devotion to Guinevere made him the perfect courtly lover but an imperfect knight: when the quest for the Holy Grail demanded spiritual purity, Lancelot was found wanting. He could glimpse the Grail but never fully achieve it — that honour fell to his own son, Galahad. In the end, his love for the queen tore the fellowship apart, and Lancelot spent his final days as a hermit, dying shortly after learning of Guinevere's death.",
  },
  {
    name: "Morgan le Fay",
    title: "The Fay Enchantress",
    body: "Morgan le Fay is one of the most complex and contradictory figures in the Arthurian tradition. Her earliest appearances, in Geoffrey of Monmouth's Vita Merlini and Chrétien de Troyes's romances, depict her as a benevolent healer and ruler of Avalon — a skilled practitioner of medicine who could change her shape and fly on magical wings. Scholars have linked her to the Welsh goddess Modron and the Irish war deity known as the Morrígan, suggesting roots far older than the medieval romances.\n\nAs Christian morality increasingly shaped the legends, Morgan's characterisation shifted. The Vulgate and Post-Vulgate Cycles recast her as an antagonist: Arthur's half-sister, born to Igraine and Gorlois, who studied the dark arts and schemed against Camelot from the shadows. In Sir Gawain and the Green Knight, she is revealed as the unseen architect of the entire plot, having engineered the Green Knight's challenge to test Arthur's court and frighten Guinevere. Later romances portray her as a seductress who learned her craft from Merlin himself and used it to manipulate kings.\n\nYet even at her most villainous, Morgan retains a strange dignity. When Arthur lies mortally wounded at Camlann, it is Morgan who arrives in a dark barge to carry him to Avalon — the same island she rules, the same place of healing she presided over in the very earliest stories. Her duality — healer and schemer, protector and rival — has made her one of the most enduring figures in the entire cycle.",
  },
  {
    name: "Gawain",
    title: "Knight of the Sun",
    body: "Gawain holds a peculiar distinction in Arthurian literature: no other knight appears in more tales, yet he is rarely the central hero of any single one. He is Arthur's nephew, the son of King Lot of Orkney and Arthur's half-sister Morgause, and in the earliest traditions he was the pre-eminent knight of the Round Table — a position that only shifted to Lancelot when the French romances gained dominance.\n\nHis most famous adventure is Sir Gawain and the Green Knight, the fourteenth-century masterpiece in which a monstrous green warrior crashes Arthur's New Year's feast and issues an impossible challenge. Gawain alone steps forward when no other knight dares, accepting a blow he believes will mean his death. The poem tests his courage, honesty, and courtesy to the breaking point, and his single small failure — concealing a protective girdle out of fear for his life — becomes one of the most nuanced explorations of human virtue in medieval literature.\n\nAn old Welsh tradition holds that Gawain's strength waxes with the sun, reaching its peak at noon and fading as evening approaches. This solar association, combined with his reputation for courtesy and his fierce loyalty to Arthur, made him the model of achievable human excellence — not the impossible sainthood of a Galahad, but the best that a flawed mortal could manage.",
  },
  {
    name: "Galahad",
    title: "The Pure Knight",
    body: "Galahad is a relatively late creation in the Arthurian tradition, first appearing in the thirteenth-century Vulgate Cycle as the knight destined to achieve the Holy Grail. He is the son of Lancelot, conceived through deception when Elaine of Corbenic, with the aid of enchantment, took on the appearance of Guinevere. Where his father's spiritual potential was squandered through sin, Galahad represents that potential perfectly fulfilled.\n\nUpon arriving at Camelot, Galahad took the Siege Perilous — the one seat at the Round Table that would destroy any knight unworthy of it. Where others were consumed, Galahad sat unharmed, confirming his singular purity. During the Grail Quest, he surpassed every other knight: where Lancelot could only glimpse the sacred vessel, and Percival and Bors could witness it, Galahad alone looked directly upon its mysteries.\n\nHis achievement of the Grail is both the climax and the beginning of the end for the Round Table. The quest scattered Arthur's knights across the land, and many never returned. Galahad himself ascended to a realm beyond the mortal world after beholding the Grail's secrets, leaving the fellowship diminished. He embodies a medieval paradox: the perfect knight whose very perfection renders him unsuitable for the imperfect world that needs him most.",
  },
  {
    name: "Percival",
    title: "Seeker of the Grail",
    body: "Percival's story is one of the oldest Grail narratives, predating Galahad's by several decades. Chrétien de Troyes introduced him in the late twelfth century in Perceval, the Story of the Grail — a poem left tantalizingly unfinished at the author's death. In Chrétien's telling, Percival is a naïve Welsh boy raised in isolation by his mother, who kept him ignorant of knighthood after losing her husband and other sons to war.\n\nWhen Percival stumbles upon a group of knights in the forest, he mistakes them for angels and immediately sets out for Arthur's court, arriving as an uncouth rustic who must learn everything from scratch. His journey from innocent fool to Grail seeker became one of the defining narratives of chivalric literature. In the German poet Wolfram von Eschenbach's Parzival, the story was expanded into a sprawling epic that explored questions of faith, doubt, and perseverance.\n\nIn earlier versions of the Grail legend, Percival was the knight who achieved the sacred vessel. When later romances introduced Galahad as the supreme Grail knight, Percival was relegated to one of three worthy companions — alongside Bors — who could witness the Grail but not fully attain it. Even so, his arc from ignorant youth to spiritual seeker remains among the most compelling in the entire tradition: a reminder that wisdom often begins in simplicity and earnest dedication.",
  },
  {
    name: "Tristan",
    title: "The Sorrowful Knight",
    body: "The story of Tristan originated as an independent Celtic romance, separate from the Arthurian cycle entirely. The earliest surviving versions date to the twelfth century, composed by the poets Béroul and Thomas of Britain, and they tell a tale of doomed love that predates and likely inspired the more famous affair between Lancelot and Guinevere.\n\nTristan was the nephew of King Mark of Cornwall. Sent to Ireland on a diplomatic mission to bring back the princess Isolde as a bride for his uncle, Tristan and Isolde accidentally drank a love potion during the voyage home and fell into an unbreakable passion. Their subsequent adulterous relationship — conducted under Mark's nose, punctuated by exile, disguise, and narrow escapes — became one of the great tragic love stories of medieval Europe. No version of the tale grants them a happy ending.\n\nThe thirteenth-century Prose Tristan formally integrated the character into the Arthurian world, making him a Knight of the Round Table and a peer of Lancelot in martial skill. Malory continued this tradition in Le Morte d'Arthur, devoting substantial sections to Tristan's adventures. His name, likely derived from the French triste or the Celtic Drystan, carries the melancholy that defines his legend: a knight whose blade was as lethal as his love life was sorrowful.",
  },
  {
    name: "Nimue",
    title: "Lady of the Lake",
    body: "The Lady of the Lake is among the most enigmatic figures in Arthurian legend, and her identity shifts dramatically depending on which text one consults. She is variously called Nimue, Viviane, and Niniane, and her role ranges from benevolent guardian to dangerous enchantress. The confusion is partly deliberate: she represents the unpredictable power of the otherworld, a figure who operates by rules that mortals cannot fully comprehend.\n\nHer most famous acts define the boundaries of the Arthurian story. It was the Lady of the Lake who presented Arthur with Excalibur, the enchanted sword that made him nearly invincible. She raised the infant Lancelot in her domain beneath the waters, shaping him into the greatest knight of the age. And when Merlin fell in love with her, she turned his own teachings against him, imprisoning the wizard so thoroughly that he was never seen again.\n\nIn Malory's Le Morte d'Arthur, Nimue evolves from Merlin's captor into a protector of the realm, repeatedly intervening to save Arthur from magical assassination attempts. At the very end, when Bedivere casts Excalibur into the lake after Arthur's final battle, a hand rises from the water to reclaim it — and Nimue is among the queens who arrive in a dark barge to carry the dying king to Avalon. She bookends the entire saga: the giver and reclaimer of the sword, present at both the beginning and the end.",
  },
  {
    name: "Kay",
    title: "Seneschal of Camelot",
    body: "Kay is one of the oldest characters in the Arthurian tradition, appearing in the earliest Welsh sources alongside Arthur himself. In the tale of Culhwch and Olwen, drawn from the Mabinogion, Kay possesses almost superhuman abilities: he can hold his breath for nine days, grow as tall as a tree, and radiate heat from his hands so intense that no rain could wet him. These fantastical qualities suggest that Kay may have originated as a figure from Celtic mythology long before the romance tradition domesticated him.\n\nBy the time of the French romances and Malory's Le Morte d'Arthur, Kay had been transformed into Arthur's foster-brother and the seneschal — chief steward — of Camelot. In this role he managed the day-to-day governance of the court: supplying armies, overseeing the treasury, and handling the logistics that allowed other knights to ride off on quests. He is frequently portrayed as sharp-tongued and boastful, a foil to the more courteous knights, yet his loyalty to Arthur is never in question.\n\nThe most famous episode involving Kay is the drawing of the sword from the stone. In most tellings, the young Arthur pulls the sword only because Kay has forgotten his own and sends his foster-brother to fetch a replacement. It is a small, accidental moment that changes the course of history — and Kay, for all his bluster, is the one who recognises what has happened and kneels before the new king.",
  },
  {
    name: "Bedivere",
    title: "The Loyal Hand",
    body: "Like Kay, Bedivere belongs to the oldest stratum of Arthurian legend, appearing in Welsh tradition as Bedwyr, one of Arthur's earliest and most trusted companions. In the Mabinogion, Bedwyr is described as a formidable warrior despite having lost one hand — a detail preserved across centuries of retelling that speaks to his extraordinary resilience.\n\nBedivere's defining moment comes at the very end of the story. After the catastrophic Battle of Camlann, Arthur lies mortally wounded and commands Bedivere to return Excalibur to the lake from which it came. Twice Bedivere approaches the water and cannot bring himself to throw away so magnificent a weapon, hiding it and lying to his king. Only on the third attempt does he obey, hurling the sword over the water — and a hand rises from beneath the surface to catch it and draw it under.\n\nThis scene, rendered powerfully in both Malory and Tennyson, has become one of the most iconic moments in the entire legend. Bedivere is the last knight to see Arthur alive before the barge carries him to Avalon. His reluctance to part with Excalibur is deeply human — a final, understandable act of attachment in the face of overwhelming loss — and his eventual obedience marks the true end of Camelot's age.",
  },
  {
    name: "Elaine",
    title: "The Lily Maid",
    body: "The name Elaine recurs throughout Arthurian literature, attached to at least five distinct women in Malory's work alone. The most famous is Elaine of Astolat, also known as the Fair Maid of Astolat, whose story of unrequited love for Lancelot has haunted readers and artists for centuries.\n\nIn Malory's telling, Lancelot lodges with Elaine's father before a tournament and, to maintain his disguise, agrees to wear her favour in the lists — something he had never done for any woman, including Guinevere. Elaine falls hopelessly in love. She nurses Lancelot back to health after he is wounded, and when he departs, she begs him to marry her or at least take her as his lover. He refuses both, gently but absolutely, bound as he is to the queen.\n\nElaine dies of grief. At her instruction, her body is placed in a small barge, clutching a lily in one hand and a final letter in the other, and floated down the river to Camelot, where Arthur's court discovers her with sorrow. Tennyson immortalised this image in his poem \"The Lady of Shalott,\" transforming Elaine into one of the most recognisable figures in Victorian art. Her tragedy is a quiet counterpoint to the grand betrayals and battles of the Arthurian cycle: a reminder of the private devastation that the great knights leave in their wake.",
  },
  {
    name: "Mordred",
    title: "The Usurper",
    body: "Mordred is the shadow that falls across every version of the Arthurian legend. In Geoffrey of Monmouth's chronicle, he is Arthur's nephew who seizes the throne while the king campaigns abroad. Later romances darkened his origins considerably: in the Vulgate Cycle and Malory, Mordred is Arthur's own son, born of an unwitting incestuous union with his half-sister Morgause.\n\nUpon learning of the child's existence and a prophecy that this offspring would destroy him, Arthur attempted to eliminate the threat by setting all children born on a certain day adrift at sea — an echo of the biblical Herod. Mordred alone survived, washed ashore and raised in secret, a living reminder that some fates cannot be avoided.\n\nMordred's rebellion is the catastrophe that ends the golden age. Left as regent while Arthur pursues Lancelot to France, Mordred declares the king dead, attempts to marry Guinevere, and raises an army. At the Battle of Camlann, father and son meet in combat: Arthur drives a spear through Mordred's body, but Mordred, with his last strength, deals Arthur his mortal wound. It is the final, devastating proof that Camelot's destruction came not from foreign enemies but from within — from blood, ambition, and the consequences of a king's oldest sin.",
  },
  {
    name: "Igraine",
    title: "Duchess of Cornwall",
    body: "Igraine — also rendered as Igerna, Ygraine, or Ygerna depending on the source — is the mother of Arthur, and her story sets the entire legend in motion. In Geoffrey of Monmouth's telling, she was the wife of Gorlois, Duke of Cornwall, and renowned for her beauty. King Uther Pendragon became consumed with desire for her, and when Gorlois refused to surrender his wife, war erupted between them.\n\nIt was Merlin who provided the terrible solution. Through sorcery, Uther was disguised as Gorlois and gained entry to Tintagel Castle, where he lay with Igraine while her true husband was being killed in battle elsewhere. Arthur was conceived that night. The moral ambiguity of this act — a king using deception and magic to take another man's wife — casts a long shadow over the legend, suggesting that Camelot's foundation was flawed from its very first moment.\n\nIgraine's other children, born to Gorlois before his death, include Morgan le Fay and Morgause — figures who would shape Arthur's fate as profoundly as any enemy. In some romances, Igraine outlives Uther and is discovered alive in an enchanted castle years later; in others, she dies before her son ever learns her identity. Either way, she is the silent origin point of every major conflict in the cycle, the woman whose unwilling role in Merlin's scheme gave birth to both a golden age and its destruction.",
  },
  {
    name: "Pellinore",
    title: "The Questing King",
    body: "King Pellinore is defined by a single, magnificent obsession: the Questing Beast. This bizarre creature — described as having the head of a serpent, the body of a leopard, the haunches of a lion, and the feet of a deer, with a belly that produced the sound of thirty baying hounds — appears throughout the Arthurian romances as a quarry that can never quite be caught.\n\nPellinore devoted his life to hunting this impossible prey, riding endlessly through the wild places of Britain in pursuit. In the Post-Vulgate Cycle, the Questing Beast was born from a princess's unnatural desire and the sorcery of a demon, making its hunt a kind of penance or cosmic errand. Pellinore's obsession with it marks him as a figure apart from the courtly world of Camelot — a king more at home in the untamed forest than in any throne room.\n\nBeyond his famous hunt, Pellinore plays a significant role in the political tensions of the Round Table. He killed King Lot of Orkney in battle, a deed that earned him the lasting enmity of Lot's sons, particularly Gawain. This feud between the houses of Pellinore and Orkney runs as a dark undercurrent through the romances, and Pellinore's eventual murder at the hands of Gawain and his brothers is one of the cycle's many instances of vengeance breeding further vengeance.",
  },
  {
    name: "Ector",
    title: "The Humble Lord",
    body: "Sir Ector is one of the quietest yet most essential figures in the Arthurian legend. When Merlin spirited the newborn Arthur away from Uther Pendragon's court for the child's protection, it was Ector who received the infant and raised him as his own alongside his biological son, Kay. Ector asked no questions and sought no reward; he simply provided the stable, loving household that allowed a future king to grow up in safety.\n\nThe extent of Ector's role varies between sources. In some tellings he is a minor lord of modest means; in others, a man of considerable estates who managed his lands with such prudence that his people prospered even in lean years. What remains constant is his selflessness. He kept Arthur's true identity secret, treated the boy no differently from his own son, and when the moment came for Arthur to claim the throne by drawing the sword from the stone, Ector was the first to kneel.\n\nHis place in the legend serves as a quiet argument that the virtues which sustain a kingdom — prudence, humility, and steady care — are no less heroic than those displayed on the battlefield. Without Ector's unremarkable goodness, there would have been no Arthur at all.",
  },
  {
    name: "Bors",
    title: "The Steadfast",
    body: "Sir Bors de Ganis is the cousin of Lancelot and the brother of Lionel, and of the three knights who achieved the Holy Grail — Galahad, Percival, and Bors — he is the most human. Where Galahad is divinely pure and Percival is touched by holy innocence, Bors is simply a good man who tries his best. He is neither the strongest nor the holiest knight at the Round Table, but he is arguably the most dependable.\n\nDuring the Grail Quest, Bors faces a series of moral dilemmas that test his character more subtly than any battle could. In one famous episode from the Vulgate Cycle, he must choose between rescuing his brother Lionel and saving a maiden in distress — an impossible choice that illustrates the agonising contradictions of chivalric duty. He chooses the maiden, and the consequences haunt him.\n\nAfter the fall of Camelot, Bors is one of the few knights who survives the final catastrophe. In Malory's telling, he is present at Lancelot's death and afterwards travels to the Holy Land to fight in the Crusades, eventually dying on a Good Friday. His quiet perseverance across the entire arc of the legend — from the Grail Quest to the bitter end — makes him a figure of understated heroism: the knight who was always exactly where he was needed.",
  },
  {
    name: "Uther",
    title: "The Pendragon",
    body: "Uther Pendragon is Arthur's father and the king whose reign immediately preceded the golden age of Camelot. The epithet \"Pendragon\" derives from the Welsh pen, meaning \"chief,\" and dragon, meaning \"warrior\" — a title signifying supreme military leadership. Geoffrey of Monmouth records that a dragon-shaped comet appeared in the sky at the death of Uther's brother Ambrosius, and Merlin interpreted it as a sign that Uther would take the throne.\n\nUther's reign was defined by warfare. He fought against Saxon invaders and rival British kings, uniting the fractious lords of the island through force of arms and political cunning. His treasury was perpetually engaged in funding campaigns, and his rule, while effective, lacked the idealism that would characterise his son's court. Uther was a pragmatist in an age that demanded pragmatism.\n\nHis most consequential act was also his most morally compromised. Consumed by desire for Igraine, wife of the Duke of Cornwall, Uther enlisted Merlin's sorcery to take her through deception — an act that produced Arthur but also introduced a stain of dishonour into the royal bloodline. Uther eventually married Igraine after her husband's death, but he did not live long after, reportedly poisoned by Saxon enemies. His legacy is inseparable from his son's: everything Arthur built rested on foundations that Uther laid, for better and for worse.",
  },
  {
    name: "Lot",
    title: "King of Orkney",
    body: "King Lot of Lothian and Orkney occupies an uneasy position in Arthurian legend: he is both Arthur's brother-in-law and, at various points, his rival. Married to Morgause, Arthur's half-sister, Lot fathered some of the Round Table's most important knights — Gawain, Gaheris, Agravain, and Gareth — as well as, in some versions, the traitor Mordred.\n\nIn the early stages of Arthur's reign, Lot was among the rebel kings who refused to accept the young monarch's authority. He brought his northern armies south and fought against Arthur at the Battle of Bedegraine, one of the defining conflicts of the king's consolidation of power. The rebellion ultimately failed, and Lot was killed by King Pellinore — a death that ignited a blood feud between their families lasting generations.\n\nLot's legacy in the romances is primarily dynastic. Through his sons, particularly Gawain, the House of Orkney became one of the two great power blocs at the Round Table, perpetually in tension with the House of Ban represented by Lancelot and his kin. This rivalry, rooted in Lot's death and the grudges it spawned, contributed as much to Camelot's eventual downfall as any act of outright treachery. Lot himself is remembered as a stern northern lord: a builder of impregnable fortresses on storm-battered coasts, a ruler whose strength lay in endurance rather than glamour.",
  },
];

// ---------------------------------------------------------------------------
// Class
// ---------------------------------------------------------------------------

export class MainMenuWikiScreen {
  readonly container = new Container();

  private _vm!: ViewManager;
  private _bg!: Graphics;
  private _particles!: AmbientParticles;
  private _mainCard!: Container;
  private _activeTab: WikiTab = "lore";

  // Content area
  private _contentContainer!: Container;
  private _contentMask!: Graphics;
  private _scrollY = 0;
  private _maxScroll = 0;
  private _contentH = 0;
  private _viewH = 0;

  // Tab buttons
  private _tabButtons: { id: WikiTab; bg: Graphics; txt: Text }[] = [];

  // Callbacks
  onBack: (() => void) | null = null;
  onOpenUnits: (() => void) | null = null;
  onOpenSpells: (() => void) | null = null;
  onOpenBuildings: (() => void) | null = null;

  get isVisible(): boolean {
    return this.container.visible;
  }

  // ---------------------------------------------------------------------------
  // Lifecycle
  // ---------------------------------------------------------------------------

  init(vm: ViewManager): void {
    this._vm = vm;

    this._bg = new Graphics();
    this.container.addChild(this._bg);

    this._particles = new AmbientParticles(120);
    this.container.addChild(this._particles.container);

    this._mainCard = new Container();
    this.container.addChild(this._mainCard);

    this.container.visible = false;
    vm.addToLayer("ui", this.container);

    vm.app.renderer.on("resize", () => this._layout());
    vm.app.ticker.add((ticker) => {
      if (this.container.visible) {
        this._particles.update(ticker.deltaMS / 1000);
      }
    });
  }

  show(): void {
    this.container.visible = true;
    this._activeTab = "guidance";
    this._rebuild();
    this._layout();
  }

  hide(): void {
    this.container.visible = false;
  }

  // ---------------------------------------------------------------------------
  // Build
  // ---------------------------------------------------------------------------

  private _rebuild(): void {
    this._mainCard.removeChildren();
    this._tabButtons = [];
    this._scrollY = 0;

    const card = this._mainCard;

    // Card background
    card.addChild(
      new Graphics()
        .roundRect(0, 0, CARD_W, CARD_H, CORNER_R)
        .fill({ color: 0x10102a, alpha: 0.97 })
        .roundRect(0, 0, CARD_W, CARD_H, CORNER_R)
        .stroke({ color: BORDER_COLOR, alpha: 0.4, width: 1.5 }),
    );

    // Block clicks from passing through
    card.eventMode = "static";

    // Title
    const title = new Text({ text: t("wiki.title"), style: STYLE_TITLE });
    title.anchor.set(0.5, 0);
    title.position.set(CARD_W / 2, 14);
    card.addChild(title);

    // Close button
    const closeBtn = this._makeBtn("BACK", 80, 30);
    closeBtn.position.set(CARD_W - 100, 16);
    closeBtn.on("pointerdown", () => {
      this.hide();
      this.onBack?.();
    });
    card.addChild(closeBtn);

    // Divider
    card.addChild(
      new Graphics().rect(16, 52, CARD_W - 32, 1).fill({ color: BORDER_COLOR, alpha: 0.2 }),
    );

    // Tab bar
    let tabX = 20;
    for (const tabDef of TAB_DEFS) {
      const tabW = tabDef.label.length * 10 + 24;
      const btn = new Container();
      btn.eventMode = "static";
      btn.cursor = "pointer";
      btn.hitArea = new Rectangle(0, 0, tabW, TAB_H);

      const isActive = tabDef.id === this._activeTab;
      const tabBg = new Graphics()
        .roundRect(0, 0, tabW, TAB_H - 4, 5)
        .fill({ color: isActive ? 0x222255 : 0x151530 })
        .roundRect(0, 0, tabW, TAB_H - 4, 5)
        .stroke({ color: isActive ? BORDER_COLOR : 0x333355, width: 1 });
      btn.addChild(tabBg);

      const txt = new Text({
        text: tabDef.label,
        style: isActive ? STYLE_TAB_ACTIVE : STYLE_TAB,
      });
      txt.anchor.set(0.5, 0.5);
      txt.position.set(tabW / 2, TAB_H / 2 - 2);
      btn.addChild(txt);

      btn.position.set(tabX, 58);
      btn.on("pointerdown", () => this._selectTab(tabDef.id));
      card.addChild(btn);

      this._tabButtons.push({ id: tabDef.id, bg: tabBg, txt });
      tabX += tabW + 6;
    }

    // Content area
    const contentTop = 58 + TAB_H + 6;
    this._viewH = CARD_H - contentTop - 10;

    this._contentMask = new Graphics()
      .rect(16, contentTop, CARD_W - 32, this._viewH)
      .fill({ color: 0xffffff });
    card.addChild(this._contentMask);

    this._contentContainer = new Container();
    this._contentContainer.position.set(24, contentTop);
    this._contentContainer.mask = this._contentMask;
    card.addChild(this._contentContainer);

    // Build content for active tab
    this._buildContent();

    // Scroll
    card.on("wheel", (e: WheelEvent) => {
      if (this._maxScroll <= 0) return;
      this._scrollY = Math.max(0, Math.min(this._maxScroll, this._scrollY + e.deltaY));
      this._contentContainer.position.y = (58 + TAB_H + 6) - this._scrollY;
    });
  }

  private _selectTab(tab: WikiTab): void {
    // For units/spells/buildings, delegate to existing screens
    if (tab === "units") {
      this.hide();
      this.onOpenUnits?.();
      return;
    }
    if (tab === "spells") {
      this.hide();
      this.onOpenSpells?.();
      return;
    }
    if (tab === "buildings") {
      this.hide();
      this.onOpenBuildings?.();
      return;
    }

    this._activeTab = tab;
    this._rebuild();
    this._layout();
  }

  private _buildContent(): void {
    this._contentContainer.removeChildren();
    this._scrollY = 0;

    switch (this._activeTab) {
      case "guidance":
        this._buildGuidanceContent();
        break;
      case "lore":
        this._buildLoreContent();
        break;
      case "game_modes":
        this._buildGameModesContent();
        break;
      case "leaders":
        this._buildLeadersContent();
        break;
      case "world_buildings":
        this._buildWorldBuildingsContent();
        break;
      case "world_research":
        this._buildWorldResearchContent();
        break;
    }
  }

  // ---------------------------------------------------------------------------
  // Guidance tab
  // ---------------------------------------------------------------------------

  private _buildGuidanceContent(): void {
    const c = this._contentContainer;
    const W = CARD_W - 60;
    let cy = 8;

    const heading = (text: string) => {
      const t2 = new Text({ text, style: STYLE_LORE_HEADING });
      t2.position.set(0, cy);
      c.addChild(t2);
      cy += 26;
    };

    const subheading = (text: string) => {
      const t2 = new Text({ text, style: STYLE_ITEM_NAME });
      t2.position.set(0, cy);
      c.addChild(t2);
      cy += 22;
    };

    const body = (text: string, indent = 12) => {
      const t2 = new Text({ text, style: new TextStyle({ fontFamily: "monospace", fontSize: 12, fill: 0xccddee, wordWrap: true, wordWrapWidth: W - indent, lineHeight: 20 }) });
      t2.position.set(indent, cy);
      c.addChild(t2);
      cy += t2.height + 10;
    };

    const bullet = (text: string) => {
      const t2 = new Text({ text: `•  ${text}`, style: new TextStyle({ fontFamily: "monospace", fontSize: 12, fill: 0xaabbcc, wordWrap: true, wordWrapWidth: W - 28, lineHeight: 19 }) });
      t2.position.set(16, cy);
      c.addChild(t2);
      cy += t2.height + 4;
    };

    const note = (text: string) => {
      const t2 = new Text({ text, style: new TextStyle({ fontFamily: "monospace", fontSize: 11, fill: 0x88ffaa, wordWrap: true, wordWrapWidth: W - 20, lineHeight: 18 }) });
      t2.position.set(12, cy);
      c.addChild(t2);
      cy += t2.height + 8;
    };

    const divider = () => {
      c.addChild(new Graphics().rect(0, cy, W, 1).fill({ color: 0x334466, alpha: 0.5 }));
      cy += 16;
    };

    // =========================================================================
    // CORE CONCEPTS
    // =========================================================================
    heading("CORE CONCEPTS — HOW THE GAME WORKS");
    body("If you're new to the game, start here. These fundamentals apply to Standard, Skirmish, Roguelike, and Campaign modes. Other modes (Wave, Survivor, World, RPG) are covered in their own sections below.");

    subheading("PREP PHASE vs BATTLE PHASE");
    body("Every match is divided into two alternating phases. During the PREP phase, the battlefield is paused — units do not move or fight. You use this time to build structures, spend gold, research upgrades, and position defences. When the PREP phase ends (either by pressing the Ready button, or automatically after a countdown), the BATTLE phase begins. Units march, fight, and die. Once the battle ends, you return to PREP.");
    bullet("You cannot build or buy units during the battle phase — plan ahead.");
    bullet("The PREP timer appears at the top of the screen. Use every second of it.");
    bullet("Skirmish mode has unlimited prep time. Standard mode has a countdown.");

    subheading("ECONOMY — GOLD AND INCOME");
    body("Gold is your primary resource. You earn it passively each round based on the buildings you have constructed. Certain buildings — particularly the Town Hall and its upgrades — increase your income. You can also find neutral gold mines on the map and capture them for a permanent income boost.");
    bullet("Build income structures early. A 10% income advantage compounds over many rounds.");
    bullet("Neutral buildings on the map provide income when captured — send a unit to stand on them.");
    bullet("Spending all your gold before a battle is usually correct. Stockpiling gold has no benefit.");

    subheading("BUILDINGS");
    body("Buildings are your economic engine and unit source. Each building type produces a different category of unit. To unlock stronger units, you must upgrade the building that produces them, or research upgrades in specialised structures.");
    bullet("BARRACKS — produces infantry (swordsmen, spearmen, knights).");
    bullet("ARCHERY RANGE — produces ranged units (archers, crossbowmen, longbowmen).");
    bullet("STABLES — produces cavalry (mounted knights, lancers).");
    bullet("MAGE TOWER — produces magical units (mages, storm mages, archmages).");
    bullet("SIEGE WORKSHOP — produces siege engines (catapults, trebuchets, cannons).");
    bullet("CREATURE DEN — produces beasts and monsters (wolves, trolls, dragons).");
    bullet("TEMPLE — produces holy units (clerics, paladins, angels).");
    bullet("TOWN HALL — increases gold income per round. Upgrade it first.");
    note("Tip: You don't need every building. Specialise. Two fully upgraded Barracks will outperform one of everything.");

    subheading("UNITS AND THEIR ROLES");
    body("Units are produced automatically by buildings when you pay their cost. Each unit type has different stats — health, attack damage, attack speed, move speed, and range. Understanding what each type is strong and weak against is the key skill of the game.");
    bullet("INFANTRY — high health, fights in melee. Good all-round frontline.");
    bullet("SPEARMEN — bonus damage against cavalry and large creatures.");
    bullet("ARCHERS — ranged damage from safety. Weak if enemies reach them.");
    bullet("CAVALRY — fast, high damage. Excellent at flanking and targeting archers.");
    bullet("MAGES — area-of-effect damage. Melts grouped infantry. Fragile.");
    bullet("SIEGE ENGINES — massive damage to buildings and grouped units. Very slow.");
    bullet("CREATURES — powerful late-game units. Expensive but often game-winning.");
    bullet("ANGELS / PALADINS — high health, strong vs undead and creatures.");
    note("Tip: Counters matter. A cavalry charge into a line of spearmen will lose badly. A cavalry charge into a group of archers will win easily.");

    subheading("RACES");
    body("Each race has a unique faction unit that provides a bonus to their army. Races also affect which units are available and how your army fights overall. Some races excel at ranged combat, others at tanking or magic.");
    bullet("MAN — balanced army, no weaknesses. Good for learning.");
    bullet("ELF — superior archers and mages. Fragile but lethal at range.");
    bullet("DWARF — exceptional defence, heavily armoured infantry and siege.");
    bullet("ORC — aggressive infantry with high attack. Less defensive.");
    bullet("UNDEAD — unique units that revive or drain life. Requires adaptation.");
    bullet("HALFLING — fast, tricky units. High mobility.");
    note("Tip: Read the Race Select screen carefully. Each race has a Faction Unit that appears at the start of battle. These can swing fights early.");

    subheading("LEADERS");
    body("Your chosen leader grants a passive bonus that is active for the entire match. Bonuses range from extra starting gold, to attack or HP multipliers, to units that spawn at higher levels. Choose a leader whose bonus matches your intended strategy.");
    bullet("Arthur: Stables units start at level 2. Best for cavalry builds.");
    bullet("Merlin: Mages start at level 1. A Storm Mage spawns at battle start.");
    bullet("Morgan le Fay: +300 bonus gold at the start. Strong economic opener.");
    bullet("Lancelot: Units spawn 30% faster. Aggressive pressure builds.");
    bullet("Gawain: All units +15% HP. Works with every army composition.");
    note("Tip: The leader bonus is fixed for the whole match. Don't pick an income leader if you plan to spend gold on creatures — pick an income leader if you want a faster economy.");

    divider();

    // =========================================================================
    // STANDARD & SKIRMISH
    // =========================================================================
    heading("STANDARD & SKIRMISH — YOUR FIRST MATCH");

    subheading("THE FIRST TWO MINUTES");
    body("The opening of any match determines the rest of the game. Your first two prep phases should focus on economy and a basic defence, not on building your dream army.");
    bullet("Build a Town Hall first, or upgrade your existing one. Income beats unit cost in the long run.");
    bullet("Build at least one military building immediately so you can start producing units.");
    bullet("Queue the cheapest viable unit (usually swordsmen) to begin building army size.");
    bullet("On your first battle phase, you will probably only have a handful of units. That is fine — hold your ground.");
    bullet("Do not try to attack the enemy castle in the first 3–4 rounds. Defend and grow.");

    subheading("MID GAME — BUILDING YOUR ARMY");
    body("Once your economy is running (2–3 income buildings), shift your gold toward military. The mid-game is about unit composition — building a mix that works together, not just buying the most expensive thing.");
    bullet("Add a second military building of a different type to diversify your army.");
    bullet("Research upgrades in your existing buildings before building new ones.");
    bullet("If you have cavalry, protect them — don't send them into spearmen.");
    bullet("Capture neutral income buildings on the map by sending one unit to occupy them.");

    subheading("LATE GAME — PUSHING AND WINNING");
    body("The late game is won by siege and concentrated damage. If the enemy has a strong castle defence, you need siege weapons to crack it. Dragons and other top-tier units can carry a push if they reach the enemy base.");
    bullet("Build a Siege Workshop when you have excess gold and a stable frontline.");
    bullet("Push with your full army — don't dribble units in one at a time.");
    bullet("If you are ahead, spend gold on attack. If you are behind, spend gold on defence and income.");

    note("Skirmish mode starts both players with 10,000 gold. Skip the economy phase entirely and go straight to your ideal army composition from the start.");

    divider();

    // =========================================================================
    // WAVE MODE
    // =========================================================================
    heading("WAVE MODE — SURVIVAL GUIDE");
    body("Wave mode is a single-player survival challenge. You play as one faction defending against endless enemy waves. There is no opponent — only escalating hordes. Your goal is to survive as many waves as possible.");

    subheading("SETUP AND SETTINGS");
    body("Before each wave run, you choose your race, leader, difficulty, and optional modifiers. These choices are permanent for the run.");
    bullet("Grail Greed: Each wave gives bonus gold, but enemies scale harder. High risk, high reward.");
    bullet("Scaling Difficulty: Later waves get exponentially harder. Push your wave record early in the run.");
    bullet("Boss Waves: Every 10 waves, a boss enemy leads the charge. Prepare accordingly.");
    bullet("Random Events: Random buffs and debuffs apply each wave. Adds unpredictability.");
    bullet("Wave Intro: A dramatic intro plays before each wave. Disable for faster gameplay.");

    subheading("EARLY WAVES (1–10)");
    body("The first ten waves are your setup window. Focus entirely on economy and building your army infrastructure.");
    bullet("Build your Town Hall immediately and queue income upgrades.");
    bullet("Get two military buildings running as fast as possible.");
    bullet("Don't worry about defence in waves 1–5. Your starting units will hold.");
    bullet("Research upgrades between every wave — they compound.");
    bullet("Wave 10 has a boss. Have at least one siege unit or high-damage creature ready.");

    subheading("MID WAVES (10–30)");
    body("Enemy composition begins to diversify. Pure infantry strategies start to break down.");
    bullet("Add ranged units if you only have melee, and vice versa.");
    bullet("Build a Siege Workshop — catapults kill grouped enemies efficiently.");
    bullet("Upgrade your castle's walls to absorb more punishment on inevitable breach waves.");
    bullet("Mages become extremely valuable here against armoured enemies.");

    subheading("LATE WAVES (30+)");
    body("Enemies have high health, multiple unit types, and often siege of their own. Survival requires a diverse army with a clear damage strategy.");
    bullet("Creature Den units — dragons, trolls, elementals — become necessary.");
    bullet("Multiple Mage Towers provide the sustained AoE needed to handle hordes.");
    bullet("Prioritise killing enemy siege before it reaches your castle.");
    bullet("At very high waves, enemies will breach your castle. Having high base HP (via the Nimue or Lot leader bonuses) buys critical time.");
    note("Personal best records are displayed on the Wave Mode setup screen. Your top 8 runs by wave reached are saved automatically.");

    divider();

    // =========================================================================
    // SURVIVOR MODE
    // =========================================================================
    heading("SURVIVOR MODE — ACTION ROGUELIKE GUIDE");
    body("Survivor mode is a fast-paced action game. You control a single hero character who moves around a map while enemies flood in from all sides. Weapons fire automatically — your only input is movement. Survive as long as possible, collect XP gems to level up, and choose upgrades at each level.");

    subheading("CHARACTER SELECTION");
    body("Each character has a different starting weapon, stats, and passive ability. Choosing a character also determines your starting power level and play style.");
    bullet("SWORDSMAN — balanced melee character. Wide sword sweep hits enemies in an arc.");
    bullet("ARCHER — ranged character. Fires automatically at the nearest enemy.");
    bullet("FIRE MAGE — AoE specialist. Fireballs explode on impact, damaging nearby enemies.");
    bullet("Locked characters are unlocked with gold earned from runs.");

    subheading("MOVEMENT AND SURVIVAL");
    body("Movement is the most important skill in Survivor mode. Dying usually means you made a movement error, not that your build was wrong.");
    bullet("Always be moving. Standing still lets the horde surround you from all sides.");
    bullet("Move perpendicular to the direction enemies are coming from — this extends your survival time.");
    bullet("Never move directly toward a dense cluster of enemies. Circle them.");
    bullet("Use the edges of the map to limit the angle enemies can approach from.");
    bullet("Save speed upgrades — they increase your ability to escape bad situations.");

    subheading("XP AND LEVELLING");
    body("Defeated enemies drop XP gems. You must collect these gems by walking over them or using the Magnet passive. Each gem collected fills your XP bar. When it fills, you level up and choose one of three upgrades.");
    bullet("Collect gems quickly — they do not despawn, but enemies will overwhelm you if you stay in one place.");
    bullet("The Magnet passive pulls gems from a wide radius automatically. It is one of the strongest passives in the game.");
    bullet("At higher levels, enemies become dense enough that XP practically rains down. Early levels are harder for XP collection.");

    subheading("WEAPON UPGRADES AND BUILDS");
    body("At each level, you choose one of three random upgrades: a new weapon, a weapon upgrade, or a passive item. Building a coherent set of weapons that synergise is the difference between an average run and a great run.");
    bullet("Prioritise upgrading existing weapons over adding new ones early on.");
    bullet("Piercing weapons (arrows, lances) are excellent in corridors and choke points.");
    bullet("AoE weapons (fireballs, explosions, lightning) are excellent against dense hordes.");
    bullet("Passive items (speed, magnet, armour, HP regen) are universally valuable.");
    bullet("Weapon evolutions unlock when you have a weapon at max level AND a specific passive. Read the evolution requirements.");
    note("Tip: Two fully evolved weapons beat six partially-upgraded ones. Focus your upgrades.");

    subheading("BOSSES AND ELITE ENEMIES");
    body("Elite enemies (red-outlined) spawn periodically and have much higher HP and special abilities. Bosses appear at timed intervals and are the primary threat to long runs.");
    bullet("Elite enemies drop large XP gems and treasure chests on death — worth hunting.");
    bullet("Treasure chests contain gold, health pickups, screen clears, or powerful Arcana abilities.");
    bullet("Boss enemies do not go away. Keep moving in large circles while your weapons deal damage.");
    bullet("Arcana abilities (gained from treasure chests) are extremely powerful. Prioritise chests.");

    subheading("META UPGRADES");
    body("Gold earned from each run is saved permanently. You can spend this gold in the Survivor select screen on meta upgrades that persist between runs and make every subsequent run easier.");
    bullet("Max HP upgrades are the best early meta investment — they make all runs more forgiving.");
    bullet("XP gain upgrades make levelling faster, which unlocks better builds sooner.");
    bullet("Upgrade the magnet range early — gem collection is often the bottleneck on long runs.");
    note("Meta upgrades carry over forever. Even bad runs contribute to your long-term progression.");

    divider();

    // =========================================================================
    // WORLD MODE
    // =========================================================================
    heading("WORLD MODE — GRAND STRATEGY GUIDE");
    body("World mode is a full hex-based grand strategy game built on top of the core battle system. You play as a faction on a procedurally generated world map, founding cities, researching technologies, building armies, and conquering Morgaine's Avalon fortress at the centre of the map.");

    subheading("THE WORLD MAP");
    body("The map is a hex grid. Your starting town is near the edge of the map. Avalon, the win condition, is in the centre. Between you and it are neutral camps, other factions, and fog of war.");
    bullet("Fog of war hides everything beyond your current vision range. Send scouts or expand to reveal it.");
    bullet("Neutral camps can be captured and converted into income — essential for expansion.");
    bullet("Other factions have their own armies and will expand toward you. Diplomacy can delay conflict.");
    bullet("The world map uses a turn-based system. Each turn, you move your armies and manage your cities.");

    subheading("FOUNDING CITIES");
    body("Your starting town is the foundation of your empire. Build more towns to increase your resource production and military capacity. Each city can be upgraded with buildings that provide income, units, or strategic advantages.");
    bullet("Town Hall: Core income building. Upgrade it first in every city.");
    bullet("Barracks / Archery Range / Stables: Produce military units for the world map army.");
    bullet("Mage Guild: Unlocks overland spells and magic research.");
    bullet("Forge: Improves unit stats through research.");
    bullet("Market: Increases trade income between connected cities.");

    subheading("RESEARCH");
    body("The research system unlocks permanent upgrades for your faction. Research is divided into military, economic, and magical trees. You can only research one thing at a time, so choose deliberately.");
    bullet("Military research upgrades the stats of unit types you rely on.");
    bullet("Economic research increases income, reduces building costs, and unlocks new structures.");
    bullet("Magical research unlocks overland spells and improves their power.");
    note("Tip: Research compounds over many turns. A 10% income upgrade early is worth far more than a 10% attack upgrade late.");

    subheading("OVERLAND SPELLS");
    body("Once you build a Mage Guild and research the relevant spells, you can cast overland spells on the world map. These have major strategic effects.");
    bullet("Siege spells damage enemy cities directly without a battle.");
    bullet("Summon spells create units on the world map that join your army.");
    bullet("Fog spells reveal hidden areas or blind enemy scouts.");
    bullet("Buff spells strengthen your army before a major engagement.");

    subheading("COMBAT");
    body("When your world map army enters a hex containing enemies, a battle is triggered. This uses the full tactical battle system — the same PREP/BATTLE loop as all other modes. Win the battle to capture the hex.");
    bullet("Your world map army's composition is set before battles. Build a balanced force.");
    bullet("Losing a battle causes your army to retreat. You do not permanently lose units (they are rebuilt over turns).");
    bullet("Defending your own cities gives a significant defensive bonus. Attack carefully.");

    subheading("WINNING");
    body("The victory condition is capturing Avalon at the centre of the map. Avalon is a fortress with extremely powerful defences, guarded by Morgaine's army. You must build a powerful army, potentially ally with other factions, and conduct a final siege.");
    bullet("Avalon has walls, towers, and elite units. You will need siege equipment.");
    bullet("Other factions may also be racing for Avalon. Monitor their expansion.");
    bullet("Diplomatic alliances can let you focus on Avalon while an ally handles a rival faction.");

    divider();

    // =========================================================================
    // RPG MODE
    // =========================================================================
    heading("RPG MODE — ADVENTURE GUIDE");
    body("RPG mode is an overworld exploration game. You control a hero who travels across a procedurally generated map, enters dungeons, fights encounters, collects loot, and builds their character through experience and equipment. Combat uses the autobattler system — you set up your hero's party and they fight automatically.");

    subheading("OVERWORLD EXPLORATION");
    body("The overworld map is a large grid filled with locations — dungeons, towns, camps, shrines, and encounters. You move your hero across it turn by turn, choosing which locations to visit.");
    bullet("Dungeons are the primary source of loot and experience. Enter them whenever possible.");
    bullet("Towns allow you to rest (restoring HP), buy equipment, and receive quests.");
    bullet("Arthurian characters — Merlin, Guinevere, and others — appear on the road and offer blessings or quests. Talk to everyone.");
    bullet("Shrines grant permanent buffs. Prioritise them.");

    subheading("DUNGEON CRAWLING");
    body("Each dungeon has multiple floors. Each floor contains one or more encounters, and the final floor has a boss. Clearing a dungeon rewards major loot.");
    bullet("Encounters are tactical battles. Your hero fights alongside summoned units — set up your party wisely.");
    bullet("Boss enemies have special abilities and much higher HP. Keep your HP high before the boss floor.");
    bullet("Loot drops from enemies. Better dungeons have rarer loot.");
    bullet("You can retreat from a dungeon if you are running low on health, preserving your progress.");

    subheading("EQUIPMENT AND LEVELLING");
    body("Your hero gains experience from victories and levels up over time. Each level increases your hero's base stats. Equipment (weapons, armour, rings, amulets) provides additional stat bonuses.");
    bullet("Weapon type determines your hero's attack style in battle.");
    bullet("Armour reduces damage taken. Prioritise it in the early game.");
    bullet("Rings and amulets provide special passive effects — read them carefully.");
    bullet("Higher rarity equipment (uncommon, rare, epic) has significantly better stats.");

    subheading("QUESTS AND NPCS");
    body("Arthurian NPCs appear throughout the overworld and offer quests and rewards. Completing quests is often the fastest way to earn powerful unique items.");
    bullet("Merlin offers magical research quests that reward spellbooks.");
    bullet("Arthur's knights offer combat challenges — win for equipment.");
    bullet("Villagers in towns occasionally have simple quests for gold rewards.");
    note("Tip: NPCs disappear after a few turns if you do not visit them. Move toward them promptly when they appear on the map.");

    divider();

    // =========================================================================
    // BATTLEFIELD MODE
    // =========================================================================
    heading("BATTLEFIELD MODE — PURE COMBAT");
    body("Battlefield mode strips out all economy and construction. Both sides start with a pre-built army and fight until one side is destroyed. There is no prep phase for building — only for reviewing your army. This mode rewards knowledge of unit counters and positioning.");
    bullet("You cannot buy or build anything. Your army is fixed at the start.");
    bullet("Study your enemy's army composition before the battle begins. You have time.");
    bullet("Position your melee units in the front, ranged in the back, mages behind them.");
    bullet("Cavalry should be positioned on the flanks — they will charge around the frontline.");
    bullet("If the enemy has many archers, charge them immediately with cavalry.");
    bullet("If the enemy has many cavalry, position spearmen at the front edges.");
    note("Tip: Battlefield mode is ideal for quickly learning how different unit types interact without the complexity of economy management.");

    divider();

    // =========================================================================
    // ROGUELIKE MODE
    // =========================================================================
    heading("ROGUELIKE MODE — ADAPTIVE STRATEGY");
    body("Roguelike mode uses the same rules as Standard mode, but with a twist: at the start of the match, 50% of all building types are randomly disabled. You cannot build or use those buildings. This forces you to abandon fixed strategies and adapt to whatever tools you have available.");
    bullet("Check which buildings are enabled before committing to a strategy.");
    bullet("If your favourite unit type is disabled, its counters are probably weaker too — exploit that.");
    bullet("Disabled buildings mean disabled counters. A world with no Mage Towers is a world where cavalry can dominate.");
    bullet("If the Town Hall is disabled, focus purely on military — income will be tight.");
    bullet("Creature Den disabled? Focus on human units. Stables disabled? Go heavy infantry and ranged.");
    note("Tip: Roguelike mode is the most replayable mode in the game. No two matches play out the same way.");

    divider();

    // =========================================================================
    // CAMPAIGN MODE
    // =========================================================================
    heading("CAMPAIGN MODE — LEARNING THE GAME");
    body("Campaign mode is the recommended entry point for new players. It presents a series of hand-crafted scenarios with increasing difficulty, each teaching a specific game mechanic. Read the scenario description carefully — each one tells you what to focus on.");
    bullet("Scenario 1: Basic combat. Build one barracks, recruit swordsmen, attack.");
    bullet("Scenario 2: Economy. Demonstrates the power of upgrading the Town Hall early.");
    bullet("Scenario 3: Unit counters. You must use archers to stop a cavalry rush.");
    bullet("Later scenarios introduce siege, magic, and complex multi-building strategies.");
    note("Tip: Even experienced players benefit from replaying the campaign after learning a new race or leader. The scenarios are short enough to run in 5–10 minutes each.");

    this._contentH = cy;
    this._maxScroll = Math.max(0, this._contentH - this._viewH);
  }

  // ---------------------------------------------------------------------------
  // Lore tab
  // ---------------------------------------------------------------------------

  private _buildLoreContent(): void {
    const c = this._contentContainer;
    let cy = 8;

    for (const section of LORE_SECTIONS) {
      // Heading
      const heading = new Text({ text: section.heading, style: STYLE_LORE_HEADING });
      heading.position.set(0, cy);
      c.addChild(heading);
      cy += 22;

      // Body
      const body = new Text({ text: section.body, style: STYLE_BODY });
      body.position.set(0, cy);
      c.addChild(body);
      cy += body.height + 18;

      // Separator
      c.addChild(
        new Graphics().rect(0, cy, CARD_W - 60, 1).fill({ color: 0x333355, alpha: 0.3 }),
      );
      cy += 14;
    }

    this._contentH = cy;
    this._maxScroll = Math.max(0, this._contentH - this._viewH);
  }

  // ---------------------------------------------------------------------------
  // Game Modes tab
  // ---------------------------------------------------------------------------

  private _buildGameModesContent(): void {
    const c = this._contentContainer;
    let cy = 8;

    const heading = new Text({ text: t("wiki.game_modes"), style: STYLE_LORE_HEADING });
    heading.position.set(0, cy);
    c.addChild(heading);
    cy += 28;

    const modes: { name: string; desc: string }[] = [
      {
        name: "STANDARD",
        desc: "Classic mode. Build your base, recruit an army, and destroy the enemy. Both players start with a castle and a small amount of gold. Research buildings, train units, and deploy them on the battlefield.",
      },
      {
        name: "SKIRMISH",
        desc: "Same rules as Standard, but both players start with 10,000 gold. This allows immediate access to powerful units and buildings from the start. Expect fast-paced, high-intensity battles.",
      },
      {
        name: "BATTLEFIELD",
        desc: "No buildings allowed. Both sides start with pre-built armies and fight to the last unit standing. Pure tactical combat with no economy or construction phase.",
      },
      {
        name: "ROGUELIKE",
        desc: "50% of buildings are randomly disabled each match. Forces creative adaptation and prevents reliance on a single strategy. Every game plays differently.",
      },
      {
        name: "CAMPAIGN",
        desc: "A guided tutorial and story progression mode. Play through a series of increasingly difficult scenarios that teach the game's mechanics step by step. Recommended for new players learning the basics of combat, building, and unit management.",
      },
      {
        name: "WORLD",
        desc: "Hex-based grand strategy mode. Choose a leader from Arthurian legend and build a kingdom on a procedurally generated world map. Found cities, research technologies, recruit armies, cast overland spells, and conquer Morgaine's fortress of Avalon at the center of the map. Features diplomacy, fog of war, neutral camps, random events, and multiple victory conditions.",
      },
      {
        name: "WAVE MODE",
        desc: "Endless survival mode. Defend against increasingly powerful waves of enemies. See how long you can last as each wave brings stronger and more numerous foes. No opponent — just you against the horde.",
      },
      {
        name: "SURVIVOR",
        desc: "Vampire Survivors-style action roguelike. Choose a character and fight through endless hordes of enemies on a scrolling map. Defeat enemies to collect XP gems and level up, choosing new weapons and passive items at each level. Weapons fire automatically — you only control movement. Collect treasure chests for gold, health, screen clears, and powerful Arcana abilities. Survive long enough to face massive bosses. Features 10 unique weapons with evolution paths, 8 passive items, synergy bonuses, elite enemies, map hazards, and landmark buffs.",
      },
      {
        name: "RPG",
        desc: "Overworld adventure mode. Explore a procedurally generated map with your hero, enter dungeons, fight encounters in tactical autobattler combat, collect loot, and level up. Meet legendary Arthurian characters on the road who offer quests and blessings. Features town visits, dungeon crawling, boss fights, and a narrative-driven experience through the world of Camelot.",
      },
    ];

    for (const mode of modes) {
      const name = new Text({ text: mode.name, style: STYLE_ITEM_NAME });
      name.position.set(0, cy);
      c.addChild(name);
      cy += 20;

      const desc = new Text({ text: mode.desc, style: STYLE_BODY });
      desc.position.set(12, cy);
      c.addChild(desc);
      cy += desc.height + 12;

      c.addChild(
        new Graphics().rect(0, cy, CARD_W - 60, 1).fill({ color: 0x333355, alpha: 0.3 }),
      );
      cy += 10;
    }

    this._contentH = cy;
    this._maxScroll = Math.max(0, this._contentH - this._viewH);
  }

  // ---------------------------------------------------------------------------
  // Leaders tab
  // ---------------------------------------------------------------------------

  private _buildLeadersContent(): void {
    const c = this._contentContainer;
    let cy = 8;

    const heading = new Text({ text: t("wiki.legends"), style: STYLE_LORE_HEADING });
    heading.position.set(0, cy);
    c.addChild(heading);
    cy += 22;

    const intro = new Text({
      text: t("wiki.legends_desc"),
      style: STYLE_BODY,
    });
    intro.position.set(0, cy);
    c.addChild(intro);
    cy += intro.height + 16;

    for (const leader of LEADER_LORE) {
      const titleText = new Text({
        text: `${leader.name}  —  ${leader.title}`,
        style: STYLE_ITEM_NAME,
      });
      titleText.position.set(0, cy);
      c.addChild(titleText);
      cy += 22;

      const body = new Text({ text: leader.body, style: STYLE_BODY });
      body.position.set(0, cy);
      c.addChild(body);
      cy += body.height + 12;

      c.addChild(
        new Graphics().rect(0, cy, CARD_W - 60, 1).fill({ color: 0x333355, alpha: 0.3 }),
      );
      cy += 14;
    }

    this._contentH = cy;
    this._maxScroll = Math.max(0, this._contentH - this._viewH);
  }

  // ---------------------------------------------------------------------------
  // World Buildings tab
  // ---------------------------------------------------------------------------

  private _buildWorldBuildingsContent(): void {
    const c = this._contentContainer;
    let cy = 8;

    const heading = new Text({ text: t("wiki.world_buildings"), style: STYLE_LORE_HEADING });
    heading.position.set(0, cy);
    c.addChild(heading);
    cy += 22;

    const intro = new Text({
      text: t("wiki.world_buildings_desc"),
      style: STYLE_BODY,
    });
    intro.position.set(0, cy);
    c.addChild(intro);
    cy += intro.height + 16;

    const allDefs = getAllWorldBuildingDefs();
    for (const def of allDefs) {
      cy = this._buildBuildingEntry(def, cy);
    }

    this._contentH = cy;
    this._maxScroll = Math.max(0, this._contentH - this._viewH);
  }

  private _buildBuildingEntry(def: WorldBuildingDef, startY: number): number {
    const c = this._contentContainer;
    let cy = startY;

    const name = new Text({ text: def.name, style: STYLE_ITEM_NAME });
    name.position.set(0, cy);
    c.addChild(name);
    cy += 20;

    const stats: string[] = [];
    if (def.productionCost > 0) stats.push(`Cost: ${def.productionCost}`);
    if (def.goldBonus) stats.push(`Gold: +${def.goldBonus}`);
    if (def.foodBonus) stats.push(`Food: +${def.foodBonus}`);
    if (def.productionBonus) stats.push(`Production: +${def.productionBonus}`);
    if (def.manaBonus) stats.push(`Mana: +${def.manaBonus}`);
    if (def.scienceBonus) stats.push(`Research: +${def.scienceBonus}`);
    if (stats.length > 0) {
      const statText = new Text({ text: stats.join("  |  "), style: STYLE_ITEM_STAT });
      statText.position.set(12, cy);
      c.addChild(statText);
      cy += 18;
    }

    const effect = new Text({ text: def.effect, style: STYLE_ITEM_EFFECT });
    effect.position.set(12, cy);
    c.addChild(effect);
    cy += 18;

    if (def.unlocksUnits.length > 0) {
      const unlocks = new Text({
        text: `Unlocks: ${def.unlocksUnits.join(", ")}`,
        style: STYLE_ITEM_STAT,
      });
      unlocks.position.set(12, cy);
      c.addChild(unlocks);
      cy += 18;
    }

    if (def.researchRequired) {
      const req = new Text({
        text: `Requires: ${def.researchRequired}`,
        style: STYLE_ITEM_REQ,
      });
      req.position.set(12, cy);
      c.addChild(req);
      cy += 18;
    }

    c.addChild(
      new Graphics().rect(0, cy + 2, CARD_W - 60, 1).fill({ color: 0x333355, alpha: 0.3 }),
    );
    cy += 10;

    return cy;
  }

  // ---------------------------------------------------------------------------
  // World Research tab
  // ---------------------------------------------------------------------------

  private _buildWorldResearchContent(): void {
    const c = this._contentContainer;
    let cy = 8;

    // --- TECH RESEARCH ---
    const techHeading = new Text({ text: t("wiki.tech_research"), style: STYLE_LORE_HEADING });
    techHeading.position.set(0, cy);
    c.addChild(techHeading);
    cy += 22;

    const techIntro = new Text({
      text: t("wiki.tech_research_desc"),
      style: STYLE_BODY,
    });
    techIntro.position.set(0, cy);
    c.addChild(techIntro);
    cy += techIntro.height + 16;

    const techBranches: { name: string; color: number; techs: { name: string; turns: number; effect: string; requires?: string }[] }[] = [
      {
        name: "ECONOMIC",
        color: 0xffcc44,
        techs: [
          { name: "Agriculture", turns: 3, effect: "Unlocks Granary (+3 food/turn)" },
          { name: "Masonry", turns: 4, effect: "Unlocks City Walls (+50% defense)" },
          { name: "Trade", turns: 5, effect: "Unlocks Marketplace (+5 gold/turn)", requires: "Agriculture" },
          { name: "Scholarship", turns: 5, effect: "Unlocks Library (-1 turn from research)", requires: "Agriculture" },
          { name: "Banking", turns: 7, effect: "Unlocks Workshop (+3 production/turn)", requires: "Trade" },
          { name: "Sea Travel", turns: 8, effect: "Unlocks Shipwright (water crossing)", requires: "Trade" },
          { name: "Industrialization", turns: 10, effect: "Unlocks Aqueduct + Military Academy", requires: "Banking" },
        ],
      },
      {
        name: "MILITARY",
        color: 0xff4444,
        techs: [
          { name: "Bronze Working", turns: 4, effect: "Melee Tier 2" },
          { name: "Iron Working", turns: 6, effect: "Melee Tier 3", requires: "Bronze Working" },
          { name: "Steel Working", turns: 8, effect: "Melee Tier 4", requires: "Iron Working" },
          { name: "Mithril Forging", turns: 12, effect: "Melee Tier 5", requires: "Steel Working" },
          { name: "Improved Bows", turns: 5, effect: "Ranged Tier 2", requires: "Bronze Working" },
          { name: "Advanced Archery", turns: 8, effect: "Ranged Tier 3", requires: "Improved Bows" },
          { name: "Cavalry Tactics", turns: 8, effect: "Cavalry Tier 3", requires: "Horsemanship" },
          { name: "Cavalry Mastery", turns: 10, effect: "Cavalry Tier 4", requires: "Cavalry Tactics" },
        ],
      },
      {
        name: "SIEGE",
        color: 0xaa8844,
        techs: [
          { name: "Siege Engineering", turns: 5, effect: "Siege Tier 2", requires: "Bronze Working" },
          { name: "Siege Craft", turns: 8, effect: "Siege Tier 3", requires: "Siege Engineering" },
          { name: "Advanced Siege", turns: 10, effect: "Siege Tier 4", requires: "Siege Craft" },
          { name: "Heavy Artillery", turns: 14, effect: "Siege Tier 5", requires: "Advanced Siege" },
        ],
      },
      {
        name: "MAGIC",
        color: 0xaa44ff,
        techs: [
          { name: "Arcane Study", turns: 5, effect: "Spell Tiers 1-2, Mage units" },
          { name: "Conjuration", turns: 7, effect: "Spell Tiers 3-4, Creatures", requires: "Arcane Study" },
          { name: "High Sorcery", turns: 10, effect: "Spell Tiers 5-6", requires: "Conjuration" },
          { name: "Archmage Arts", turns: 14, effect: "Spell Tier 7", requires: "High Sorcery" },
          { name: "Divine Blessing", turns: 6, effect: "Holy unit recruitment", requires: "Arcane Study" },
        ],
      },
      {
        name: "BUILDINGS",
        color: 0x44aa66,
        techs: [
          { name: "Basic Fortification", turns: 3, effect: "Barracks + Archery Range" },
          { name: "Horsemanship", turns: 4, effect: "Stables", requires: "Basic Fortification" },
          { name: "Siege Construction", turns: 4, effect: "Siege Workshop", requires: "Basic Fortification" },
          { name: "Faction Construction", turns: 5, effect: "Faction Hall + Embassy", requires: "Basic Fortification" },
          { name: "Arcane Construction", turns: 4, effect: "Mage Tower" },
          { name: "Holy Construction", turns: 5, effect: "Temple", requires: "Arcane Construction" },
          { name: "Beast Construction", turns: 6, effect: "Creature Den", requires: "Arcane Construction" },
          { name: "Elite Hall", turns: 10, effect: "Elite Hall (unlock elite buildings)", requires: "Arcane + Basic Fort." },
          { name: "Elite Warfare", turns: 6, effect: "Elite Barracks/Archery/Stables", requires: "Elite Hall" },
          { name: "Elite Siege Works", turns: 6, effect: "Elite Siege Workshop", requires: "Elite Hall" },
          { name: "Elite Arcanum", turns: 6, effect: "Elite Mage Tower", requires: "Elite Hall" },
        ],
      },
    ];

    for (const branch of techBranches) {
      const branchName = new Text({
        text: branch.name,
        style: new TextStyle({ fontFamily: "monospace", fontSize: 14, fill: branch.color, fontWeight: "bold" }),
      });
      branchName.position.set(0, cy);
      c.addChild(branchName);
      cy += 22;

      for (const tech of branch.techs) {
        const line = `${tech.name}  (${tech.turns} turns)  —  ${tech.effect}${tech.requires ? `  [requires: ${tech.requires}]` : ""}`;
        const techText = new Text({
          text: line,
          style: new TextStyle({
            fontFamily: "monospace", fontSize: 11, fill: 0xbbccdd,
            wordWrap: true, wordWrapWidth: CARD_W - 80,
          }),
        });
        techText.position.set(12, cy);
        c.addChild(techText);
        cy += techText.height + 4;
      }

      cy += 10;
    }

    // Separator
    c.addChild(
      new Graphics().rect(0, cy, CARD_W - 60, 1).fill({ color: BORDER_COLOR, alpha: 0.3 }),
    );
    cy += 20;

    // --- MAGIC RESEARCH ---
    const magicHeading = new Text({ text: t("wiki.magic_research"), style: STYLE_LORE_HEADING });
    magicHeading.position.set(0, cy);
    c.addChild(magicHeading);
    cy += 22;

    const magicIntro = new Text({
      text: t("wiki.magic_research_desc"),
      style: STYLE_BODY,
    });
    magicIntro.position.set(0, cy);
    c.addChild(magicIntro);
    cy += magicIntro.height + 16;

    const schools: { name: string; color: number; desc: string }[] = [
      { name: "Fire", color: 0xff4422, desc: "Offensive damage spells — fireballs, flame walls, and infernos" },
      { name: "Ice", color: 0x44aaff, desc: "Slowing and freezing spells — blizzards, frost bolts, and ice walls" },
      { name: "Lightning", color: 0xffff44, desc: "Chain damage and stun effects — thunderbolts and storm calls" },
      { name: "Earth", color: 0x886633, desc: "Defensive and terrain spells — stone walls, earthquakes, and shields" },
      { name: "Nature", color: 0x44cc44, desc: "Healing, growth, and summoning natural creatures" },
      { name: "Arcane", color: 0xaa44ff, desc: "Utility and manipulation — teleportation, dispelling, and enchantments" },
      { name: "Holy", color: 0xffffaa, desc: "Divine healing, protection, and smiting undead" },
      { name: "Shadow", color: 0x8888aa, desc: "Debuffs, fear, and draining life from enemies" },
      { name: "Poison", color: 0x88cc22, desc: "Damage over time and weakening effects" },
      { name: "Void", color: 0x8844aa, desc: "Reality-warping spells — banishment and dimensional rifts" },
      { name: "Death", color: 0x888888, desc: "Necromancy — raising undead and death curses" },
      { name: "Conjuration", color: 0xcc8844, desc: "Summoning creatures and constructs to fight for you" },
    ];

    for (const school of schools) {
      const schoolText = new Text({
        text: school.name,
        style: new TextStyle({ fontFamily: "monospace", fontSize: 13, fill: school.color, fontWeight: "bold" }),
      });
      schoolText.position.set(0, cy);
      c.addChild(schoolText);

      const schoolDesc = new Text({
        text: school.desc,
        style: STYLE_ITEM_STAT,
      });
      schoolDesc.position.set(120, cy + 1);
      c.addChild(schoolDesc);
      cy += 20;
    }

    cy += 10;

    const tierInfo = new Text({
      text: t("wiki.tier_costs"),
      style: STYLE_ITEM_STAT,
    });
    tierInfo.position.set(0, cy);
    c.addChild(tierInfo);
    cy += 24;

    const noteText = new Text({
      text: t("wiki.research_together"),
      style: STYLE_BODY,
    });
    noteText.position.set(0, cy);
    c.addChild(noteText);
    cy += noteText.height + 16;

    this._contentH = cy;
    this._maxScroll = Math.max(0, this._contentH - this._viewH);
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  private _makeBtn(label: string, w: number, h: number): Container {
    const btn = new Container();
    btn.eventMode = "static";
    btn.cursor = "pointer";
    const bg = new Graphics()
      .roundRect(0, 0, w, h, 6)
      .fill({ color: 0x1a2a3a })
      .roundRect(0, 0, w, h, 6)
      .stroke({ color: 0x4488cc, width: 1.5 });
    btn.addChild(bg);
    const txt = new Text({
      text: label,
      style: new TextStyle({
        fontFamily: "monospace", fontSize: 13, fill: 0x88bbff, fontWeight: "bold",
      }),
    });
    txt.anchor.set(0.5, 0.5);
    txt.position.set(w / 2, h / 2);
    btn.addChild(txt);
    btn.on("pointerover", () => { bg.tint = 0xaaddff; });
    btn.on("pointerout", () => { bg.tint = 0xffffff; });
    return btn;
  }

  private _layout(): void {
    if (!this._vm) return;
    const sw = this._vm.screenWidth;
    const sh = this._vm.screenHeight;
    this._bg.clear().rect(0, 0, sw, sh).fill({ color: BG_COLOR });
    this._bg.eventMode = "static"; // block clicks behind
    this._particles.resize(sw, sh);
    this._mainCard.position.set(
      Math.floor((sw - CARD_W) / 2),
      Math.floor((sh - CARD_H) / 2),
    );
  }
}

export const mainMenuWikiScreen = new MainMenuWikiScreen();
