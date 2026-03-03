import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { auth, db } from './firebase.js';
import './storage.js';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
} from 'firebase/auth';
import { doc, setDoc, onSnapshot, serverTimestamp } from 'firebase/firestore';

// ─── THEME ───
const T = {
  bg: "#0c0e14", bgDeep: "#080a0f", bgCard: "#111420",
  sidebar: "#0d0f18", sidebarBorder: "#1a1d2d",
  sidebarActive: "#161a2c", sidebarHover: "#131628",
  card: "#12151f", cardBorder: "#1c2035", cardHover: "#181c2e",
  header: "#0e1018", headerBorder: "#1a1d2d",
  accent: "#6366f1", accentSoft: "#818cf8", accentMuted: "#6366f115",
  success: "#34d399", successMuted: "#34d39915",
  danger: "#f87171", dangerMuted: "#f8717115",
  warning: "#fbbf24", warningMuted: "#fbbf2415",
  info: "#38bdf8", infoMuted: "#38bdf815",
  purple: "#c084fc", purpleMuted: "#c084fc15",
  orange: "#fb923c", orangeMuted: "#fb923c15",
  teal: "#2dd4bf", tealMuted: "#2dd4bf15",
  pink: "#f472b6", pinkMuted: "#f472b615",
  text: "#dde1ed", textSec: "#7d85a0", textDim: "#454b64", textSoft: "#9096a8",
  white: "#eef0f8", gold: "#fbbf24", bar: "#181b28", divider: "#1c1f30",
  r: 14, rs: 10,
  // Rarity
  rarCommon: "#94a3b8", rarUncommon: "#34d399", rarRare: "#60a5fa",
  rarEpic: "#c084fc", rarLegendary: "#fbbf24", rarMythic: "#f87171", rarGod: "#ff375f",
};

// Use Google Fonts — Rajdhani for display, DM Sans for body
const FONT_DISPLAY = `"Rajdhani", "Segoe UI", system-ui, sans-serif`;
const FONT_BODY = `"DM Sans", "Segoe UI", system-ui, sans-serif`;

// ═══════════════════════════════════════════════
// STAGE SYSTEM
// ═══════════════════════════════════════════════

const CHAPTERS = [
  { id: 1, name: "Sunlit Meadow", emoji: "🌾", color: "#8bc34a", bgGrad: "linear-gradient(135deg, #0e1a06 0%, #0c0e14 60%)" },
  { id: 2, name: "Darkstone Caves", emoji: "🕳️", color: "#78909c", bgGrad: "linear-gradient(135deg, #0e1218 0%, #0c0e14 60%)" },
  { id: 3, name: "Rotwood Swamp", emoji: "🌿", color: "#66bb6a", bgGrad: "linear-gradient(135deg, #081408 0%, #0c0e14 60%)" },
  { id: 4, name: "Shattered Ruins", emoji: "🏛️", color: "#a1887f", bgGrad: "linear-gradient(135deg, #181008 0%, #0c0e14 60%)" },
  { id: 5, name: "Emberpeak Volcano", emoji: "🌋", color: "#ff7043", bgGrad: "linear-gradient(135deg, #1a0804 0%, #0c0e14 60%)" },
  { id: 6, name: "The Hollow Abyss", emoji: "🕳️", color: "#b388ff", bgGrad: "linear-gradient(135deg, #12081e 0%, #0c0e14 60%)" },
  { id: 7, name: "Titan's Domain", emoji: "⚡", color: "#ffca28", bgGrad: "linear-gradient(135deg, #1a1600 0%, #0c0e14 60%)" },
  { id: 8, name: "Celestial Rift", emoji: "✨", color: "#ea80fc", bgGrad: "linear-gradient(135deg, #1a061a 0%, #0c0e14 60%)" },
];

const STAGE_MONSTERS = [
  [{ name: "Slime", emoji: "🟢", sprite: "/sprites/monsters/ch1_meadow/slime_idle.png" }, { name: "Rat", emoji: "🐀", sprite: "/sprites/monsters/ch1_meadow/rat_idle.png" }, { name: "Goblin", emoji: "👺", sprite: "/sprites/monsters/ch1_meadow/goblin_idle.png" }, { name: "Skeleton", emoji: "💀", sprite: "/sprites/monsters/ch1_meadow/skeleton_idle.png" }, { name: "Wild Boar", emoji: "🐗", sprite: "/sprites/monsters/ch1_meadow/wild_boar_idle.png" }],
  [{ name: "Wolf", emoji: "🐺", sprite: "/sprites/monsters/ch2_caves/wolf_idle.png" }, { name: "Cave Spider", emoji: "🕷️", sprite: "/sprites/monsters/ch2_caves/cave_spider_idle.png" }, { name: "Orc", emoji: "👹", sprite: "/sprites/monsters/ch2_caves/orc_idle.png" }, { name: "Stone Troll", emoji: "🪨", sprite: "/sprites/monsters/ch2_caves/stone_troll_idle.png" }, { name: "Dark Bat", emoji: "🦇", sprite: "/sprites/monsters/ch2_caves/dark_bat_idle.png" }],
  [{ name: "Bog Lurker", emoji: "🐸" }, { name: "Venomfang", emoji: "🐍" }, { name: "Dark Mage", emoji: "🧙" }, { name: "Plague Bearer", emoji: "🤢" }, { name: "Swamp Thing", emoji: "🌿" }],
  [{ name: "Haunted Armor", emoji: "🛡️" }, { name: "Wraith", emoji: "👻" }, { name: "Golem", emoji: "🗿" }, { name: "Dragon", emoji: "🐉" }, { name: "Death Knight", emoji: "⚔️" }],
  [{ name: "Magma Imp", emoji: "😈" }, { name: "Flame Serpent", emoji: "🔥" }, { name: "Obsidian Brute", emoji: "⬛" }, { name: "Ember Drake", emoji: "🐉" }, { name: "Lava Golem", emoji: "🌋" }],
  [{ name: "Shadow Stalker", emoji: "🌑" }, { name: "Abyssal Watcher", emoji: "👁️" }, { name: "Doom Crawler", emoji: "🦂" }, { name: "Soul Reaver", emoji: "💀" }, { name: "Void Spawn", emoji: "🕳️" }],
  [{ name: "Storm Giant", emoji: "⛈️" }, { name: "Ancient Wyrm", emoji: "🐲" }, { name: "Celestial Knight", emoji: "🌟" }, { name: "Titan Colossus", emoji: "🗿" }, { name: "Thunder Beast", emoji: "⚡" }],
  [{ name: "Void Walker", emoji: "🌀" }, { name: "Star Devourer", emoji: "⭐" }, { name: "Cosmic Horror", emoji: "👾" }, { name: "Rift Guardian", emoji: "🔮" }, { name: "Eternal Flame", emoji: "🔥" }],
];

const BOSSES = [
  [{ name: "Meadow Golem", emoji: "🗿", sprite: "/sprites/bosses/ch1_meadow/meadow_golem_idle.png" }, { name: "Forest Guardian", emoji: "🌲", sprite: "/sprites/bosses/ch1_meadow/forest_guardian_idle.png" }, { name: "Goblin King", emoji: "👺", sprite: "/sprites/bosses/ch1_meadow/goblin_king_idle.png" }, { name: "Undead General", emoji: "💀", sprite: "/sprites/bosses/ch1_meadow/undead_general_idle.png" }, { name: "Ancient Treant", emoji: "🌳", sprite: "/sprites/bosses/ch1_meadow/ancient_treant_idle.png" }],
  [{ name: "Cave Wyrm", emoji: "🐛", sprite: "/sprites/bosses/ch2_caves/cave_wyrm_idle.png" }, { name: "Crystal Basilisk", emoji: "💎", sprite: "/sprites/bosses/ch2_caves/crystal_basilisk_idle.png" }, { name: "Orc Warlord", emoji: "👹", sprite: "/sprites/bosses/ch2_caves/orc_warlord_idle.png" }, { name: "Shadow Drake", emoji: "🐉", sprite: "/sprites/bosses/ch2_caves/shadow_drake_idle.png" }, { name: "Troll King", emoji: "🪨", sprite: "/sprites/bosses/ch2_caves/troll_king_idle.png" }],
  ["Swamp Hydra 🐲", "Poison Queen 🐍", "Witch Doctor 🧙", "Plague Lord 🤢", "Bog Titan 🌿"],
  ["Elder Lich ☠️", "Ruin Colossus 🗿", "Phantom King 👻", "Dragon Lord 🐉", "Death Emperor ⚔️"],
  ["Inferno King 👑", "Magma Titan 🌋", "Phoenix Lord 🔥", "Obsidian Emperor ⬛", "Fire God 😈"],
  ["Void Leviathan 🐙", "Abyss Lord 🕳️", "Shadow Emperor 🌑", "Soul Tyrant 💀", "Doom Sovereign 🦂"],
  ["God of the Spire ⚡", "Storm Emperor ⛈️", "Wyrm God 🐲", "Celestial Lord 🌟", "Titan God 🗿"],
  ["Rift Overlord 🌀", "Star Eater ⭐", "Cosmic Emperor 👾", "Void God 🔮", "Eternal Sovereign 🔥"],
];

function getStageMonster(stageNum) {
  const chapter = Math.floor((stageNum - 1) / 50);
  const stageInChapter = ((stageNum - 1) % 50) + 1;
  const isBoss = stageInChapter % 10 === 0;
  const bossIdx = Math.floor(stageInChapter / 10) - 1;
  const ch = Math.min(chapter, CHAPTERS.length - 1);
  const monsters = STAGE_MONSTERS[ch];
  const bosses = BOSSES[ch];

  const sf = stageNum <= 100 ? stageNum - 1 : 99 + (stageNum - 100) * 0.7;
  const baseHp = Math.floor(20 * Math.pow(1.055, sf));
  const baseAtk = Math.floor(3 * Math.pow(1.045, sf));
  const baseDef = Math.floor(1 * Math.pow(1.03, sf));
  const baseGold = Math.floor(5 * Math.pow(1.06, sf));
  const baseXp = Math.floor(10 * Math.pow(1.05, sf));

  if (isBoss) {
    const b = bosses[Math.min(bossIdx, bosses.length - 1)];
    const bName = typeof b === "string" ? b.replace(/ [^\s]+$/, '') : b.name;
    const bEmoji = typeof b === "string" ? (b.match(/[^\w\s]+$/)?.[0] || "👑") : b.emoji;
    const bSprite = typeof b === "object" ? b.sprite : undefined;
    return {
      name: bName, emoji: bEmoji, sprite: bSprite,
      hp: Math.floor(baseHp * 3), atk: Math.floor(baseAtk * 1.5), def: Math.floor(baseDef * 1.5),
      gold: Math.floor(baseGold * 5), xp: Math.floor(baseXp * 5),
      isBoss: true, monstersToKill: 1,
    };
  }
  const m = monsters[(stageInChapter - 1) % monsters.length];
  return { ...m, hp: baseHp, atk: baseAtk, def: baseDef, gold: baseGold, xp: baseXp, isBoss: false, monstersToKill: 5 + Math.floor(stageInChapter / 15) };
}

function getChapter(stageNum) { return CHAPTERS[Math.min(Math.floor((stageNum - 1) / 50), CHAPTERS.length - 1)]; }
function stageLabel(s) { return `${Math.floor((s - 1) / 50) + 1}-${((s - 1) % 50) + 1}`; }
function growthCost(level) { return Math.floor(8 * Math.pow(1.08, level - 1)); }

// ─── EQUIPMENT ───
const RARITIES = [
  { id: "common", name: "Common", color: T.rarCommon, weight: 50 },
  { id: "uncommon", name: "Uncommon", color: T.rarUncommon, weight: 25 },
  { id: "rare", name: "Rare", color: T.rarRare, weight: 15 },
  { id: "epic", name: "Epic", color: T.rarEpic, weight: 7 },
  { id: "legendary", name: "Legendary", color: T.rarLegendary, weight: 2.5 },
  { id: "mythic", name: "Mythic", color: T.rarMythic, weight: 0.45 },
  { id: "god", name: "God", color: T.rarGod, weight: 0.05 },
];

const EQUIP_TYPES = [
  { id: "weapon", name: "Weapon", emoji: "⚔️", stat: "atk" },
  { id: "armor", name: "Armor", emoji: "🛡️", stat: "def" },
  { id: "helm", name: "Helm", emoji: "⛑️", stat: "hp" },
  { id: "gloves", name: "Gloves", emoji: "🧤", stat: "atk" },
  { id: "boots", name: "Boots", emoji: "👢", stat: "def" },
  { id: "ring", name: "Ring", emoji: "💍", stat: "critRate" },
  { id: "amulet", name: "Amulet", emoji: "📿", stat: "critDmg" },
];

// Accessories — separate category with their own summon
const ACCESSORY_TYPES = [
  { id: "earring", name: "Earring", emoji: "👂", stat: "pen" },
  { id: "necklace", name: "Necklace", emoji: "📿", stat: "acu" },
  { id: "bracelet", name: "Bracelet", emoji: "⌚", stat: "spd" },
];

const EQUIP_NAMES = {
  weapon: ["Rusty Blade", "Iron Sword", "Steel Cleaver", "Shadow Edge", "Void Slasher", "Titan Blade", "God Sword"],
  armor: ["Cloth Vest", "Leather Armor", "Iron Plate", "Shadow Mail", "Void Plate", "Titan Armor", "God Armor"],
  helm: ["Cloth Cap", "Leather Helm", "Iron Helm", "Shadow Crown", "Void Mask", "Titan Crown", "God Crown"],
  gloves: ["Cloth Wraps", "Leather Gloves", "Iron Gauntlets", "Shadow Claws", "Void Grips", "Titan Fists", "God Gauntlets"],
  boots: ["Sandals", "Leather Boots", "Iron Greaves", "Shadow Steps", "Void Treads", "Titan Boots", "God Boots"],
  ring: ["Copper Ring", "Silver Ring", "Gold Ring", "Shadow Ring", "Void Ring", "Titan Ring", "God Ring"],
  amulet: ["Bone Charm", "Crystal Pendant", "Gold Amulet", "Shadow Talisman", "Void Pendant", "Titan Amulet", "God Amulet"],
  earring: ["Wooden Stud", "Iron Hoop", "Silver Earring", "Shadow Loop", "Void Spike", "Titan Ring", "God Stud"],
  necklace: ["Cord Necklace", "Chain Link", "Silver Chain", "Shadow Choker", "Void Pendant", "Titan Chain", "God Collar"],
  bracelet: ["Leather Band", "Iron Cuff", "Steel Brace", "Shadow Wrap", "Void Band", "Titan Cuff", "God Brace"],
};

function generateEquipment(type) {
  let roll = Math.random() * 100, cum = 0, ri = 0;
  for (let i = 0; i < RARITIES.length; i++) { cum += RARITIES[i].weight; if (roll < cum) { ri = i; break; } }
  const rarity = RARITIES[ri];
  const td = EQUIP_TYPES.find(t => t.id === type) || ACCESSORY_TYPES.find(t => t.id === type);
  const baseMult = [1, 2.5, 6, 15, 40, 100, 300][ri];
  const stats = {};
  if (td.stat === "atk") stats.atk = Math.floor(5 * baseMult * (0.9 + Math.random() * 0.2));
  if (td.stat === "def") stats.def = Math.floor(4 * baseMult * (0.9 + Math.random() * 0.2));
  if (td.stat === "hp") stats.hp = Math.floor(20 * baseMult * (0.9 + Math.random() * 0.2));
  if (td.stat === "critRate") stats.critRate = Math.min(80, Math.floor(2 + ri * 3 + Math.random() * 3));
  if (td.stat === "critDmg") stats.critDmg = Math.floor(10 + ri * 15 + Math.random() * 10);
  // Accessory stats
  if (td.stat === "pen") stats.pen = Math.floor(3 + ri * 4 + Math.random() * 3); // Penetration: ignore DEF%
  if (td.stat === "acu") stats.acu = Math.floor(2 + ri * 3 + Math.random() * 2); // Accuracy: bonus hit rate
  if (td.stat === "spd") stats.spd = Math.floor(1 + ri * 2 + Math.random() * 2); // Speed: attack speed %
  if (Math.random() < 0.3 + ri * 0.1) {
    const secs = ["atk", "def", "hp"].filter(s => s !== td.stat);
    const sec = secs[Math.floor(Math.random() * secs.length)];
    stats[sec] = (stats[sec] || 0) + Math.floor((sec === "hp" ? 10 : 2) * baseMult * 0.3 * (0.8 + Math.random() * 0.4));
  }
  return { id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6), type, name: EQUIP_NAMES[type][ri], rarity: rarity.id, rarityIdx: ri, level: 0, stats, emoji: td.emoji };
}

// ─── GACHA LEVEL ───

// ─── WEAPON EVOLUTION TREE ───
const WEAPON_EVOLUTIONS = [
  { id: "wev_1", name: "Iron Sword", emoji: "🗡️", tier: 1, cost: 0, atkBonus: 0, color: T.textSec },
  { id: "wev_2", name: "Steel Blade", emoji: "⚔️", tier: 2, cost: 500, atkBonus: 15, color: T.rarUncommon },
  { id: "wev_3", name: "Shadow Edge", emoji: "🔪", tier: 3, cost: 2000, atkBonus: 45, color: T.rarRare },
  { id: "wev_4", name: "Flaming Sword", emoji: "🔥", tier: 4, cost: 8000, atkBonus: 120, color: T.rarEpic },
  { id: "wev_5", name: "Void Slasher", emoji: "💜", tier: 5, cost: 25000, atkBonus: 300, color: T.rarLegendary },
  { id: "wev_6", name: "Divine Blade", emoji: "✨", tier: 6, cost: 80000, atkBonus: 700, color: T.rarMythic },
  { id: "wev_7", name: "God Cleaver", emoji: "⚡", tier: 7, cost: 250000, atkBonus: 1500, color: T.rarGod },
];

// ─── EQUIPMENT SET BONUSES ───
const EQUIP_SETS = [
  { id: "set_shadow", name: "Shadow Set", pieces: ["weapon", "armor", "helm"], bonus2: { atkPct: 5 }, bonus3: { atkPct: 12, critRate: 5 }, aura: "#8b5cf6", desc: "2pc: +5% ATK | 3pc: +12% ATK, +5% Crit" },
  { id: "set_iron", name: "Iron Fortress", pieces: ["armor", "helm", "boots"], bonus2: { defPct: 8 }, bonus3: { defPct: 18, hpPct: 10 }, aura: "#6b7280", desc: "2pc: +8% DEF | 3pc: +18% DEF, +10% HP" },
  { id: "set_crit", name: "Assassin's Edge", pieces: ["weapon", "gloves", "ring"], bonus2: { critRate: 4 }, bonus3: { critRate: 10, critDmg: 25 }, aura: "#ef4444", desc: "2pc: +4% Crit | 3pc: +10% Crit, +25% CritDmg" },
  { id: "set_void", name: "Void Regalia", pieces: ["weapon", "armor", "helm", "boots", "gloves"], bonus2: { atkPct: 3 }, bonus3: { atkPct: 8, defPct: 5 }, bonus5: { atkPct: 20, defPct: 15, hpPct: 15, critRate: 5 }, aura: "#a855f7", desc: "2/3/5pc: Growing power" },
];

// ─── STAGE HAZARDS ───
const STAGE_HAZARDS = [
  null, // Ch1 Meadow - no hazard
  { name: "Cave Collapse", emoji: "🪨", dmgPct: 3, interval: 8000, color: "#78909c", desc: "Falling rocks deal 3% HP" },
  { name: "Poison Bog", emoji: "☠️", dmgPct: 2, interval: 5000, color: "#66bb6a", desc: "Poison ticks 2% HP every 5s" },
  { name: "Cursed Ground", emoji: "💀", dmgPct: 4, interval: 10000, color: "#a1887f", desc: "Curse drains 4% HP every 10s" },
  { name: "Lava Floor", emoji: "🌋", dmgPct: 5, interval: 6000, color: "#ff7043", desc: "Lava burns 5% HP every 6s" },
  { name: "Void Drain", emoji: "🕳️", dmgPct: 3, interval: 4000, color: "#b388ff", desc: "Void saps 3% HP every 4s" },
  { name: "Lightning Storm", emoji: "⚡", dmgPct: 6, interval: 7000, color: "#ffca28", desc: "Lightning strikes for 6% HP" },
  { name: "Reality Tear", emoji: "🌀", dmgPct: 4, interval: 3000, color: "#ea80fc", desc: "Reality tears for 4% HP every 3s" },
];

// ─── CHALLENGE STAGES ───
const CHALLENGES = [
  { id: "ch_noCrit", name: "No Critical", emoji: "🚫", desc: "Critical hits disabled", condition: "noCrit", reward: { diamonds: 30, gold: 5000 }, minStage: 30, color: T.danger },
  { id: "ch_speed", name: "Speed Run", emoji: "⏱️", desc: "Clear 10 stages in 60s", condition: "speedRun", stages: 10, timeLimit: 60, reward: { diamonds: 50, gold: 8000 }, minStage: 50, color: T.info },
  { id: "ch_glass", name: "Glass Cannon", emoji: "💔", desc: "1 HP, 5x ATK", condition: "glassCannon", reward: { diamonds: 40, gold: 6000 }, minStage: 40, color: T.warning },
  { id: "ch_tank", name: "Immovable", emoji: "🛡️", desc: "5x HP, 0.3x ATK", condition: "tank", reward: { diamonds: 35, gold: 5000 }, minStage: 35, color: T.success },
  { id: "ch_poison", name: "Toxic Trial", emoji: "☠️", desc: "Lose 1% HP per second", condition: "poison", reward: { diamonds: 45, gold: 7000 }, minStage: 60, color: "#66bb6a" },
  { id: "ch_boss", name: "Boss Gauntlet", emoji: "👑", desc: "5 bosses in a row", condition: "bossGauntlet", reward: { diamonds: 80, gold: 15000, souls: 5 }, minStage: 100, color: T.gold },
];

// ─── TRAINING DOJO ───
const DOJO_SLOTS = [
  { id: "dojo_atk", name: "Attack Training", emoji: "⚔️", stat: "atk", baseRate: 0.5, color: T.danger },
  { id: "dojo_def", name: "Defense Training", emoji: "🛡️", stat: "def", baseRate: 0.4, color: T.info },
  { id: "dojo_hp", name: "Vitality Training", emoji: "❤️", stat: "hp", baseRate: 2, color: T.success },
  { id: "dojo_crit", name: "Precision Training", emoji: "🎯", stat: "critRate", baseRate: 0.1, color: T.warning },
];


const GACHA_LEVELS = [
  { level: 1, summons: 0, label: "Bronze", color: "#cd7f32", bonus: 0 },
  { level: 2, summons: 20, label: "Silver", color: "#c0c0c0", bonus: 3 },
  { level: 3, summons: 60, label: "Gold", color: "#ffd700", bonus: 7 },
  { level: 4, summons: 150, label: "Platinum", color: "#e5e4e2", bonus: 12 },
  { level: 5, summons: 300, label: "Diamond", color: "#b9f2ff", bonus: 18 },
  { level: 6, summons: 600, label: "Master", color: "#ff6b6b", bonus: 25 },
  { level: 7, summons: 1000, label: "Legendary", color: "#fbbf24", bonus: 35 },
];
function getGachaLevel(totalSummons) {
  let gl = GACHA_LEVELS[0];
  for (const g of GACHA_LEVELS) { if (totalSummons >= g.summons) gl = g; }
  return gl;
}
function generateWithGachaBonus(type, gachaBonus) {
  const adj = RARITIES.map((r, i) => ({ ...r, weight: i === 0 ? Math.max(10, r.weight - gachaBonus) : r.weight + (gachaBonus / (RARITIES.length - 1)) }));
  let roll = Math.random() * adj.reduce((s, r) => s + r.weight, 0), cum = 0, ri = 0;
  for (let i = 0; i < adj.length; i++) { cum += adj[i].weight; if (roll < cum) { ri = i; break; } }
  const rarity = RARITIES[ri];
  const td = EQUIP_TYPES.find(t => t.id === type) || ACCESSORY_TYPES.find(t => t.id === type);
  const baseMult = [1, 2.5, 6, 15, 40, 100, 300][ri];
  const stats = {};
  if (td.stat === "atk") stats.atk = Math.floor(5 * baseMult * (0.9 + Math.random() * 0.2));
  if (td.stat === "def") stats.def = Math.floor(4 * baseMult * (0.9 + Math.random() * 0.2));
  if (td.stat === "hp") stats.hp = Math.floor(20 * baseMult * (0.9 + Math.random() * 0.2));
  if (td.stat === "critRate") stats.critRate = Math.min(80, Math.floor(2 + ri * 3 + Math.random() * 3));
  if (td.stat === "critDmg") stats.critDmg = Math.floor(10 + ri * 15 + Math.random() * 10);
  if (td.stat === "pen") stats.pen = Math.floor(3 + ri * 4 + Math.random() * 3);
  if (td.stat === "acu") stats.acu = Math.floor(2 + ri * 3 + Math.random() * 2);
  if (td.stat === "spd") stats.spd = Math.floor(1 + ri * 2 + Math.random() * 2);
  if (Math.random() < 0.3 + ri * 0.1) { const secs = ["atk", "def", "hp"].filter(s => s !== td.stat); const sec = secs[Math.floor(Math.random() * secs.length)]; stats[sec] = (stats[sec] || 0) + Math.floor((sec === "hp" ? 10 : 2) * baseMult * 0.3 * (0.8 + Math.random() * 0.4)); }
  return { id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6), type, name: EQUIP_NAMES[type][ri], rarity: rarity.id, rarityIdx: ri, level: 0, stats, emoji: td.emoji };
}

// ─── EMBLEMS ───
const EMBLEMS = [
  { id: "emb_iron", name: "Iron Emblem", emoji: "🔰", tier: 1, marks: 5, bonus: { atkFlat: 10, defFlat: 5 }, color: T.textSec },
  { id: "emb_bronze", name: "Bronze Emblem", emoji: "🥉", tier: 2, marks: 15, bonus: { atkFlat: 25, hpFlat: 50 }, color: "#cd7f32" },
  { id: "emb_silver", name: "Silver Emblem", emoji: "🥈", tier: 3, marks: 40, bonus: { atkPct: 3, defPct: 2 }, color: "#c0c0c0" },
  { id: "emb_gold", name: "Gold Emblem", emoji: "🥇", tier: 4, marks: 80, bonus: { atkPct: 5, critRate: 2, goldPct: 3 }, color: T.gold },
  { id: "emb_plat", name: "Platinum Emblem", emoji: "💠", tier: 5, marks: 150, bonus: { atkPct: 8, critDmg: 10, hpPct: 3 }, color: "#e5e4e2" },
  { id: "emb_diamond", name: "Diamond Emblem", emoji: "💎", tier: 6, marks: 300, bonus: { atkPct: 12, defPct: 5, critRate: 3, goldPct: 5 }, color: "#60a5fa" },
];

// ─── PETS ───
const PET_DEFS = [
  { name: "Baby Dragon", emoji: "🐉", rarity: "rare", bonus: { atkPct: 5, hpPct: 3 } },
  { name: "Spirit Wolf", emoji: "🐺", rarity: "uncommon", bonus: { atkPct: 3, defPct: 2 } },
  { name: "Golden Pig", emoji: "🐷", rarity: "uncommon", bonus: { goldPct: 10 } },
  { name: "Crystal Cat", emoji: "🐱", rarity: "rare", bonus: { xpPct: 8 } },
  { name: "Shadow Fox", emoji: "🦊", rarity: "epic", bonus: { critRate: 5, atkPct: 8 } },
  { name: "Phoenix Chick", emoji: "🐦", rarity: "legendary", bonus: { atkPct: 15, hpPct: 10 } },
  { name: "Void Serpent", emoji: "🐍", rarity: "mythic", bonus: { atkPct: 25, critDmg: 20 } },
];

// ─── RESONANCE STONES ───
// Late-game scaling: gain resonance XP from killing, each level boosts ALL stats
function resonanceXpNeeded(level) { return Math.floor(100 * Math.pow(1.25, level)); }
const RESONANCE_MILESTONES = [
  { level: 5, bonus: "Unlock +1 pet slot", effect: "petSlot" },
  { level: 10, bonus: "+5% all stats", effect: "allPct5" },
  { level: 20, bonus: "+10% gold bonus", effect: "gold10" },
  { level: 30, bonus: "Unlock 4th skill slot", effect: "skillSlot" },
  { level: 50, bonus: "+15% all stats", effect: "allPct15" },
  { level: 75, bonus: "+25% crit damage", effect: "critDmg25" },
  { level: 100, bonus: "+20% all stats", effect: "allPct20" },
];

// ─── FIGURES / COLLECTIBLES ───
const FIGURES = [
  { id: "fig_wolf", name: "Wolf Figurine", emoji: "🐺", cost: 500, costType: "diamonds", bonus: { atkFlat: 15 }, color: T.info },
  { id: "fig_dragon", name: "Dragon Figurine", emoji: "🐉", cost: 1200, costType: "diamonds", bonus: { atkPct: 3, hpPct: 2 }, color: T.danger },
  { id: "fig_phoenix", name: "Phoenix Figurine", emoji: "🔥", cost: 2000, costType: "diamonds", bonus: { critDmg: 10, atkPct: 2 }, color: T.orange },
  { id: "fig_titan", name: "Titan Figurine", emoji: "🗿", cost: 3000, costType: "diamonds", bonus: { defPct: 5, hpPct: 5 }, color: T.teal },
  { id: "fig_void", name: "Void Figurine", emoji: "🕳️", cost: 5000, costType: "diamonds", bonus: { atkPct: 5, critRate: 3 }, color: T.purple },
  { id: "fig_god", name: "God Figurine", emoji: "⚜️", cost: 10000, costType: "diamonds", bonus: { atkPct: 8, defPct: 4, goldPct: 5 }, color: T.gold },
  { id: "fig_gold_wolf", name: "Golden Wolf", emoji: "🐺", cost: 50000, costType: "gold", bonus: { goldPct: 8 }, color: T.gold },
  { id: "fig_gold_cat", name: "Crystal Cat", emoji: "🐱", cost: 80000, costType: "gold", bonus: { critRate: 2, defFlat: 20 }, color: T.info },
];
// Set bonuses: collect X figures for extra stats
const FIGURE_SET_BONUSES = [
  { count: 3, bonus: { atkPct: 3, defPct: 2 }, label: "3 figures: +3% ATK, +2% DEF" },
  { count: 5, bonus: { atkPct: 5, hpPct: 3, goldPct: 3 }, label: "5 figures: +5% ATK, +3% HP, +3% Gold" },
  { count: 8, bonus: { atkPct: 10, critDmg: 15, critRate: 3 }, label: "All 8: +10% ATK, +15 CritDMG, +3% Crit" },
];

// ─── TOWER OF TRIALS ───
function towerEnemy(floor) {
  const hp = Math.floor(200 * Math.pow(1.15, floor));
  const atk = Math.floor(15 * Math.pow(1.12, floor));
  const def = Math.floor(8 * Math.pow(1.10, floor));
  const emojis = ["👹", "🧟", "👻", "🦇", "🐲", "💀", "👿", "🔥"];
  return { hp, atk, def, emoji: emojis[floor % emojis.length], name: `Floor ${floor + 1} Guardian` };
}
const TOWER_REWARDS = [
  { floor: 5, reward: { diamonds: 20, gold: 2000 } },
  { floor: 10, reward: { diamonds: 50, gold: 5000 } },
  { floor: 20, reward: { diamonds: 100, gold: 15000, souls: 5 } },
  { floor: 30, reward: { diamonds: 200, gold: 30000, souls: 10 } },
  { floor: 50, reward: { diamonds: 400, gold: 80000, souls: 25 } },
  { floor: 75, reward: { diamonds: 600, gold: 150000, souls: 40 } },
  { floor: 100, reward: { diamonds: 1000, gold: 300000, souls: 75 } },
];

// ─── DAILY WHEEL SPIN ───
const SPIN_PRIZES = [
  { label: "500 Gold", icon: "🪙", reward: { gold: 500 }, weight: 25, color: T.gold },
  { label: "2,000 Gold", icon: "💰", reward: { gold: 2000 }, weight: 18, color: T.gold },
  { label: "10 Diamonds", icon: "💎", reward: { diamonds: 10 }, weight: 20, color: "#60a5fa" },
  { label: "30 Diamonds", icon: "💎", reward: { diamonds: 30 }, weight: 10, color: "#60a5fa" },
  { label: "100 Diamonds", icon: "💎", reward: { diamonds: 100 }, weight: 3, color: "#818cf8" },
  { label: "5 Marks", icon: "🏅", reward: { marks: 5 }, weight: 8, color: T.orange },
  { label: "3 Souls", icon: "✦", reward: { souls: 3 }, weight: 5, color: "#a855f7" },
  { label: "10 Souls", icon: "✦", reward: { souls: 10 }, weight: 1, color: "#a855f7" },
  { label: "5,000 Gold", icon: "🪙", reward: { gold: 5000 }, weight: 10, color: T.gold },
];

// ─── BOSS RUSH ───
const BOSS_RUSH_BOSSES = [
  { name: "Shadow Wolf", emoji: "🐺", hpMult: 1, atkMult: 1, defMult: 1 },
  { name: "Stone Golem", emoji: "🗿", hpMult: 1.5, atkMult: 1.3, defMult: 1.8 },
  { name: "Fire Drake", emoji: "🐉", hpMult: 2.2, atkMult: 1.8, defMult: 1.5 },
  { name: "Lich Lord", emoji: "💀", hpMult: 3, atkMult: 2.5, defMult: 2 },
  { name: "Void Beast", emoji: "🕳️", hpMult: 4.5, atkMult: 3, defMult: 2.5 },
  { name: "Ancient God", emoji: "⚜️", hpMult: 7, atkMult: 4, defMult: 3 },
  { name: "Chaos Titan", emoji: "💥", hpMult: 10, atkMult: 5, defMult: 4 },
  { name: "World Ender", emoji: "🌑", hpMult: 15, atkMult: 7, defMult: 5 },
];

// ─── BATTLE PASS ───
const BP_XP_PER_LEVEL = 100;
const BP_MAX_LEVEL = 30;
const BATTLE_PASS_REWARDS = [];
for (let i = 1; i <= BP_MAX_LEVEL; i++) {
  const free = i % 5 === 0 ? { diamonds: 30 + i * 5, gold: 2000 * i, souls: i >= 20 ? Math.floor(i / 5) : 0 }
    : i % 3 === 0 ? { diamonds: 10 + i * 2 } : { gold: 500 * i };
  const premium = i % 5 === 0 ? { diamonds: 80 + i * 8, gold: 5000 * i, souls: Math.floor(i / 3), marks: 5 }
    : i % 2 === 0 ? { diamonds: 20 + i * 3, gold: 1000 * i } : { gold: 1500 * i, marks: 2 };
  BATTLE_PASS_REWARDS.push({ level: i, free, premium });
}

// ─── GEMS ───
const GEM_TYPES = [
  { id: "ruby", name: "Ruby", emoji: "🔴", stat: "atkFlat", color: "#ef4444" },
  { id: "sapphire", name: "Sapphire", emoji: "🔵", stat: "defFlat", color: "#3b82f6" },
  { id: "emerald", name: "Emerald", emoji: "🟢", stat: "hpFlat", color: "#22c55e" },
  { id: "topaz", name: "Topaz", emoji: "🟡", stat: "critRate", color: "#eab308" },
  { id: "amethyst", name: "Amethyst", emoji: "🟣", stat: "critDmg", color: "#a855f7" },
  { id: "diamond_gem", name: "Diamond", emoji: "💠", stat: "atkPct", color: "#60a5fa" },
];
const GEM_TIERS = [
  { tier: 1, name: "Chipped", mult: 1, color: "#9ca3af" },
  { tier: 2, name: "Flawed", mult: 2.5, color: "#22c55e" },
  { tier: 3, name: "Normal", mult: 5, color: "#3b82f6" },
  { tier: 4, name: "Flawless", mult: 10, color: "#a855f7" },
  { tier: 5, name: "Perfect", mult: 20, color: "#fbbf24" },
];
function gemValue(type, tier) {
  const base = { atkFlat: 5, defFlat: 4, hpFlat: 20, critRate: 1, critDmg: 5, atkPct: 1 };
  return Math.floor((base[type.stat] || 1) * GEM_TIERS[tier - 1].mult);
}
function generateGem() {
  const type = GEM_TYPES[Math.floor(Math.random() * GEM_TYPES.length)];
  const tierRoll = Math.random();
  const tier = tierRoll < 0.5 ? 1 : tierRoll < 0.8 ? 2 : tierRoll < 0.93 ? 3 : tierRoll < 0.99 ? 4 : 5;
  return { id: Date.now().toString(36) + Math.random().toString(36).slice(2, 5), type: type.id, tier, stat: type.stat, value: gemValue(type, tier) };
}

// ─── COMBAT SKILLS ───
const COMBAT_SKILLS = [
  { id: "slash", name: "Power Slash", emoji: "⚔️", dmgMult: 2.0, cooldown: 5000, desc: "200% ATK damage", unlockStage: 1, color: T.danger },
  { id: "whirlwind", name: "Whirlwind", emoji: "🌪️", dmgMult: 1.5, cooldown: 4000, desc: "150% ATK damage", unlockStage: 10, color: T.info },
  { id: "fireball", name: "Fireball", emoji: "🔥", dmgMult: 3.0, cooldown: 8000, desc: "300% ATK damage", unlockStage: 30, color: T.orange },
  { id: "thunderbolt", name: "Thunderbolt", emoji: "⚡", dmgMult: 4.0, cooldown: 12000, desc: "400% ATK damage", unlockStage: 60, color: T.warning },
  { id: "voidstrike", name: "Void Strike", emoji: "🕳️", dmgMult: 6.0, cooldown: 18000, desc: "600% ATK damage", unlockStage: 100, color: T.purple },
  { id: "judgment", name: "Divine Judgment", emoji: "✨", dmgMult: 10.0, cooldown: 30000, desc: "1000% ATK damage", unlockStage: 200, color: T.gold },
];

// ─── PASSIVE SKILLS ───
const PASSIVE_SKILLS = [
  { id: "ps_might", name: "Might", emoji: "💪", desc: "+{v}% ATK", stat: "atkPct", baseVal: 1, perLvl: 0.5, maxLvl: 50, color: T.danger },
  { id: "ps_fortress", name: "Fortress", emoji: "🏰", desc: "+{v}% DEF", stat: "defPct", baseVal: 1, perLvl: 0.5, maxLvl: 50, color: T.info },
  { id: "ps_vitality", name: "Vitality", emoji: "💚", desc: "+{v}% HP", stat: "hpPct", baseVal: 1, perLvl: 0.5, maxLvl: 50, color: T.success },
  { id: "ps_precision", name: "Precision", emoji: "🎯", desc: "+{v}% Crit Rate", stat: "critRate", baseVal: 0.5, perLvl: 0.3, maxLvl: 30, color: T.orange },
  { id: "ps_brutality", name: "Brutality", emoji: "💥", desc: "+{v}% Crit DMG", stat: "critDmg", baseVal: 2, perLvl: 1.5, maxLvl: 40, color: T.warning },
  { id: "ps_greed", name: "Greed", emoji: "🤑", desc: "+{v}% Gold", stat: "goldPct", baseVal: 1, perLvl: 0.5, maxLvl: 40, color: T.gold },
];

function skillUpgradeCost(level) { return Math.floor(100 * Math.pow(1.12, level)); }
function passiveSkillCost(level) { return Math.floor(50 * Math.pow(1.1, level)); }
function enhanceCost(eqLevel, rarityIdx) { return Math.floor((50 + rarityIdx * 30) * Math.pow(1.18, eqLevel)); }

// ─── PRESTIGE / REBIRTH ───
const PRESTIGE_MILESTONES = [
  { stage: 50, souls: 10, bonus: "All +20%" },
  { stage: 100, souls: 30, bonus: "All +60%" },
  { stage: 150, souls: 60, bonus: "All +120%" },
  { stage: 200, souls: 100, bonus: "All +200%" },
  { stage: 300, souls: 200, bonus: "All +400%" },
  { stage: 400, souls: 400, bonus: "All +800%" },
];
function calcPrestigeSouls(highestStage) {
  let souls = 0;
  for (const m of PRESTIGE_MILESTONES) {
    if (highestStage >= m.stage) souls = m.souls;
  }
  // Bonus souls for every 10 stages past 50
  if (highestStage >= 50) souls += Math.floor((highestStage - 50) / 10) * 5;
  return souls;
}
// Relics are permanent artifacts with stat bonuses. Upgrade with gold to increase their power.
const RELICS = [
  { id: "blade_of_dawn", name: "Blade of Dawn", emoji: "🗡️", desc: "A sword forged at first light", rarity: "rare", cost: 300, baseStat: "atk", baseVal: 10, perLvl: 5, maxLvl: 50, color: T.danger },
  { id: "aegis_shield", name: "Aegis Shield", emoji: "🛡️", desc: "An indestructible barrier", rarity: "rare", cost: 300, baseStat: "def", baseVal: 8, perLvl: 3, maxLvl: 50, color: T.info },
  { id: "heart_crystal", name: "Heart Crystal", emoji: "💎", desc: "Pulsing with vital energy", rarity: "rare", cost: 300, baseStat: "hp", baseVal: 50, perLvl: 25, maxLvl: 50, color: T.success },
  { id: "lucky_coin", name: "Lucky Coin", emoji: "🪙", desc: "Fortune favors the bold", rarity: "epic", cost: 800, baseStat: "goldPct", baseVal: 5, perLvl: 2, maxLvl: 30, color: T.gold },
  { id: "eye_of_storm", name: "Eye of Storm", emoji: "🌀", desc: "See weakness in all things", rarity: "epic", cost: 800, baseStat: "critRate", baseVal: 3, perLvl: 1, maxLvl: 25, color: T.orange },
  { id: "blood_gem", name: "Blood Gem", emoji: "🔴", desc: "Amplifies critical strikes", rarity: "epic", cost: 800, baseStat: "critDmg", baseVal: 10, perLvl: 5, maxLvl: 30, color: T.warning },
  { id: "shadow_orb", name: "Shadow Orb", emoji: "🟣", desc: "Darkness empowers all stats", rarity: "legendary", cost: 2000, baseStat: "atkPct", baseVal: 3, perLvl: 1, maxLvl: 20, color: T.purple },
  { id: "titan_core", name: "Titan Core", emoji: "🔶", desc: "The heart of an ancient titan", rarity: "legendary", cost: 2000, baseStat: "hpPct", baseVal: 3, perLvl: 1, maxLvl: 20, color: T.teal },
  { id: "void_shard", name: "Void Shard", emoji: "🕳️", desc: "A fragment of the void itself", rarity: "mythic", cost: 5000, baseStat: "allPct", baseVal: 2, perLvl: 1, maxLvl: 15, color: "#a855f7" },
  { id: "god_seal", name: "God Seal", emoji: "⚜️", desc: "Seal of a forgotten deity", rarity: "god", cost: 12000, baseStat: "allFlat", baseVal: 20, perLvl: 10, maxLvl: 10, color: "#fbbf24" },
];

function relicUpgradeCost(level) { return Math.floor(200 * Math.pow(1.15, level)); }

// ─── INSIGNIAS ───
// Insignias are milestone badges that give permanent buffs. Earned automatically.
const INSIGNIAS = [
  { id: "ins_first_blood", name: "First Blood", emoji: "🩸", desc: "Kill your first monster", check: (s) => s.combatStats.kills >= 1, bonus: { atkFlat: 5 }, color: T.danger },
  { id: "ins_centurion", name: "Centurion", emoji: "🏛️", desc: "Kill 100 monsters", check: (s) => s.combatStats.kills >= 100, bonus: { atkPct: 2 }, color: T.danger },
  { id: "ins_warlord", name: "Warlord", emoji: "⚔️", desc: "Kill 1,000 monsters", check: (s) => s.combatStats.kills >= 1000, bonus: { atkPct: 5 }, color: T.danger },
  { id: "ins_stage10", name: "Journeyman", emoji: "🥾", desc: "Reach stage 10", check: (s) => s.highestStage >= 10, bonus: { hpFlat: 50 }, color: T.info },
  { id: "ins_stage50", name: "Veteran", emoji: "🎖️", desc: "Reach stage 50", check: (s) => s.highestStage >= 50, bonus: { atkFlat: 20, defFlat: 10 }, color: T.accent },
  { id: "ins_stage100", name: "Champion", emoji: "👑", desc: "Reach stage 100", check: (s) => s.highestStage >= 100, bonus: { atkPct: 5, defPct: 3, hpPct: 3 }, color: T.gold },
  { id: "ins_stage200", name: "Legend", emoji: "🌟", desc: "Reach stage 200", check: (s) => s.highestStage >= 200, bonus: { atkPct: 8, critRate: 3, critDmg: 15 }, color: T.purple },
  { id: "ins_boss25", name: "Boss Slayer", emoji: "💀", desc: "Kill 25 bosses", check: (s) => (s.combatStats.bossesKilled || 0) >= 25, bonus: { critDmg: 10 }, color: T.orange },
  { id: "ins_boss100", name: "Raid Master", emoji: "🏆", desc: "Kill 100 bosses", check: (s) => (s.combatStats.bossesKilled || 0) >= 100, bonus: { atkPct: 3, goldPct: 5 }, color: T.warning },
  { id: "ins_rich", name: "Tycoon", emoji: "💰", desc: "Earn 100,000 total gold", check: (s) => (s.combatStats.totalGoldEarned || 0) >= 100000, bonus: { goldPct: 8 }, color: T.gold },
  { id: "ins_collector", name: "Collector", emoji: "🎒", desc: "Own 20 equipment pieces", check: (s) => (s.equipCount || 0) >= 20, bonus: { defPct: 3 }, color: T.teal },
  { id: "ins_summoner", name: "Summoner", emoji: "✨", desc: "Summon 50 items", check: (s) => (s.stats.summons || 0) >= 50, bonus: { critRate: 2, atkFlat: 15 }, color: T.purple },
];

// ─── TITLES ───
// Equippable name titles earned from milestones. Each gives stat bonuses when equipped.
const TITLES = [
  { id: "tl_newbie", name: "Newbie", desc: "Start your adventure", check: () => true, bonus: {}, color: T.textDim },
  { id: "tl_slayer", name: "Monster Slayer", desc: "Kill 500 monsters", check: (s) => s.combatStats.kills >= 500, bonus: { atkFlat: 10 }, color: T.danger },
  { id: "tl_rich", name: "Wealthy", desc: "Earn 50,000 gold total", check: (s) => (s.combatStats.totalGoldEarned || 0) >= 50000, bonus: { goldPct: 5 }, color: T.gold },
  { id: "tl_explorer", name: "Explorer", desc: "Reach stage 30", check: (s) => s.highestStage >= 30, bonus: { hpFlat: 30 }, color: T.info },
  { id: "tl_warrior", name: "Elite Warrior", desc: "Reach stage 100", check: (s) => s.highestStage >= 100, bonus: { atkPct: 3, defPct: 2 }, color: T.accent },
  { id: "tl_champion", name: "Champion", desc: "Reach stage 200", check: (s) => s.highestStage >= 200, bonus: { atkPct: 5, critRate: 2 }, color: T.purple },
  { id: "tl_legend", name: "Living Legend", desc: "Reach stage 300", check: (s) => s.highestStage >= 300, bonus: { atkPct: 8, critDmg: 15, goldPct: 5 }, color: T.gold },
  { id: "tl_boss", name: "Boss Crusher", desc: "Kill 50 bosses", check: (s) => (s.combatStats.bossesKilled || 0) >= 50, bonus: { critDmg: 10 }, color: T.orange },
  { id: "tl_reborn", name: "Reborn", desc: "Prestige once", check: (s) => (s.prestigeCount || 0) >= 1, bonus: { atkPct: 2, hpPct: 2 }, color: T.purple },
  { id: "tl_ascended", name: "Ascended", desc: "Prestige 5 times", check: (s) => (s.prestigeCount || 0) >= 5, bonus: { atkPct: 5, defPct: 3, hpPct: 3 }, color: "#fbbf24" },
  { id: "tl_collector", name: "Grand Collector", desc: "Own 50 equipment", check: (s) => (s.equipCount || 0) >= 50, bonus: { defFlat: 15, critRate: 1 }, color: T.teal },
  { id: "tl_whale", name: "Diamond Lord", desc: "Summon 100 items", check: (s) => (s.stats.summons || 0) >= 100, bonus: { atkFlat: 25, goldPct: 3 }, color: "#60a5fa" },
];

// ─── SHOP DEALS ───
const SHOP_ITEMS = [
  { id: "shop_gold_s", name: "Gold Pouch", desc: "+5,000 gold", icon: "🪙", cost: 50, costType: "diamonds", reward: { gold: 5000 }, daily: true, color: T.gold },
  { id: "shop_gold_l", name: "Gold Chest", desc: "+25,000 gold", icon: "💰", cost: 200, costType: "diamonds", reward: { gold: 25000 }, daily: true, color: T.gold },
  { id: "shop_dia_s", name: "Gem Sack", desc: "+30 diamonds", icon: "💎", cost: 3000, costType: "gold", reward: { diamonds: 30 }, daily: true, color: T.purple },
  { id: "shop_soul_s", name: "Soul Fragment", desc: "+5 prestige souls", icon: "✦", cost: 500, costType: "diamonds", reward: { souls: 5 }, daily: false, color: "#a855f7" },
  { id: "shop_soul_l", name: "Soul Crystal", desc: "+25 prestige souls", icon: "🔮", cost: 2000, costType: "diamonds", reward: { souls: 25 }, daily: false, color: "#a855f7" },
  { id: "shop_skill_reset", name: "Skill Reset", desc: "Reset all skill levels, refund gold", icon: "🔄", cost: 100, costType: "diamonds", reward: { skillReset: true }, daily: false, color: T.info },
];

// ─── COSTUMES / SKINS ───
// Costumes are cosmetic outfits with stat bonuses. Buy with diamonds, equip one at a time.
// Each costume changes the hero's appearance emoji and gives permanent stat bonuses.
const COSTUMES = [
  { id: "default", name: "Adventurer", emoji: "⚔️", desc: "The classic hero look", rarity: "common", cost: 0, bonuses: {}, owned: true },
  { id: "knight", name: "Silver Knight", emoji: "🛡️", desc: "Gleaming armor of a royal guard", rarity: "uncommon", cost: 200, bonuses: { defFlat: 10, hpFlat: 50 } },
  { id: "assassin", name: "Shadow Assassin", emoji: "🗡️", desc: "Darkness is your ally", rarity: "uncommon", cost: 200, bonuses: { atkFlat: 15, critRate: 3 } },
  { id: "mage", name: "Arcane Mage", emoji: "🧙", desc: "Robes woven with pure mana", rarity: "rare", cost: 500, bonuses: { atkPct: 5, critDmg: 10 } },
  { id: "berserker", name: "Blood Berserker", emoji: "🪓", desc: "Rage fuels your strikes", rarity: "rare", cost: 500, bonuses: { atkFlat: 25, atkPct: 3, hpFlat: -30 } },
  { id: "paladin", name: "Holy Paladin", emoji: "⚜️", desc: "Blessed by the light itself", rarity: "epic", cost: 1200, bonuses: { defFlat: 20, hpFlat: 100, hpPct: 3 } },
  { id: "samurai", name: "Crimson Samurai", emoji: "⛩️", desc: "The way of the blade", rarity: "epic", cost: 1200, bonuses: { atkFlat: 30, critRate: 5, critDmg: 15 } },
  { id: "necromancer", name: "Necromancer", emoji: "💀", desc: "Command the armies of the dead", rarity: "legendary", cost: 3000, bonuses: { atkPct: 8, goldPct: 10, hpFlat: 80 } },
  { id: "dragonlord", name: "Dragon Lord", emoji: "🐉", desc: "Bonded with an ancient wyrm", rarity: "legendary", cost: 3000, bonuses: { atkFlat: 50, atkPct: 5, defFlat: 20, critDmg: 20 } },
  { id: "voidking", name: "Void Emperor", emoji: "🕳️", desc: "The abyss bows to your will", rarity: "mythic", cost: 8000, bonuses: { atkPct: 12, defPct: 8, hpPct: 10, critRate: 5 } },
  { id: "celestial", name: "Celestial Avatar", emoji: "✨", desc: "Ascended beyond mortal form", rarity: "god", cost: 20000, bonuses: { atkPct: 18, defPct: 12, hpPct: 15, critRate: 8, critDmg: 30, goldPct: 15 } },
];

// Set bonuses: owning multiple costumes of same rarity gives extra bonuses
const COSTUME_SET_BONUSES = [
  { rarity: "uncommon", need: 2, label: "2× Uncommon", bonus: { atkFlat: 5, defFlat: 5 } },
  { rarity: "rare", need: 2, label: "2× Rare", bonus: { atkPct: 2, hpPct: 2 } },
  { rarity: "epic", need: 2, label: "2× Epic", bonus: { atkPct: 3, defPct: 3, critRate: 2 } },
  { rarity: "legendary", need: 2, label: "2× Legendary", bonus: { atkPct: 5, goldPct: 5, critDmg: 10 } },
];

// ─── DUNGEONS ───
// Daily resource dungeons with limited attempts. Auto-battle simulated instantly based on power.
const DUNGEONS = [
  {
    id: "gold_vault", name: "Gold Vault", emoji: "💰", desc: "Plunder ancient treasure vaults",
    color: "#fbbf24", bgGrad: "linear-gradient(135deg, #1a1400 0%, #0c0e14 60%)",
    resource: "gold", maxAttempts: 3,
    tiers: [
      { name: "Bronze Vault", minStage: 1, powerReq: 50, reward: { gold: 500 }, enemies: 5, bossHpMult: 2 },
      { name: "Silver Vault", minStage: 20, powerReq: 200, reward: { gold: 2000 }, enemies: 8, bossHpMult: 3 },
      { name: "Gold Vault", minStage: 50, powerReq: 600, reward: { gold: 8000 }, enemies: 10, bossHpMult: 4 },
      { name: "Platinum Vault", minStage: 100, powerReq: 2000, reward: { gold: 25000 }, enemies: 12, bossHpMult: 5 },
      { name: "Diamond Vault", minStage: 200, powerReq: 8000, reward: { gold: 100000 }, enemies: 15, bossHpMult: 7 },
    ],
  },
  {
    id: "gem_mine", name: "Gem Mine", emoji: "💎", desc: "Delve into crystalline caverns",
    color: "#c084fc", bgGrad: "linear-gradient(135deg, #140820 0%, #0c0e14 60%)",
    resource: "diamonds", maxAttempts: 2,
    tiers: [
      { name: "Quartz Deposit", minStage: 10, powerReq: 100, reward: { diamonds: 15 }, enemies: 5, bossHpMult: 3 },
      { name: "Amethyst Vein", minStage: 40, powerReq: 400, reward: { diamonds: 40 }, enemies: 8, bossHpMult: 4 },
      { name: "Sapphire Core", minStage: 80, powerReq: 1200, reward: { diamonds: 100 }, enemies: 10, bossHpMult: 5 },
      { name: "Ruby Heart", minStage: 150, powerReq: 5000, reward: { diamonds: 250 }, enemies: 12, bossHpMult: 6 },
      { name: "Star Crystal", minStage: 300, powerReq: 20000, reward: { diamonds: 600 }, enemies: 15, bossHpMult: 8 },
    ],
  },
  {
    id: "xp_dojo", name: "Training Dojo", emoji: "🥋", desc: "Hone your skills against masters",
    color: "#34d399", bgGrad: "linear-gradient(135deg, #041a10 0%, #0c0e14 60%)",
    resource: "growth", maxAttempts: 2,
    tiers: [
      { name: "Novice Ring", minStage: 5, powerReq: 80, reward: { growthLevels: 2 }, enemies: 5, bossHpMult: 2 },
      { name: "Warrior Ring", minStage: 30, powerReq: 300, reward: { growthLevels: 5 }, enemies: 8, bossHpMult: 3 },
      { name: "Master Ring", minStage: 70, powerReq: 1000, reward: { growthLevels: 10 }, enemies: 10, bossHpMult: 4 },
      { name: "Grandmaster Ring", minStage: 140, powerReq: 4000, reward: { growthLevels: 20 }, enemies: 12, bossHpMult: 5 },
      { name: "Legendary Arena", minStage: 250, powerReq: 15000, reward: { growthLevels: 50 }, enemies: 15, bossHpMult: 7 },
    ],
  },
  {
    id: "emblem_hall", name: "Emblem Hall", emoji: "🏅", desc: "Earn emblem marks to unlock badges",
    color: "#60a5fa", bgGrad: "linear-gradient(135deg, #0a1028 0%, #0c0e14 60%)",
    resource: "emblems", maxAttempts: 2,
    tiers: [
      { name: "Training Hall", minStage: 15, powerReq: 120, reward: { emblemMarks: 3 }, enemies: 5, bossHpMult: 2 },
      { name: "Trial Chamber", minStage: 45, powerReq: 500, reward: { emblemMarks: 8 }, enemies: 8, bossHpMult: 3 },
      { name: "Valor Arena", minStage: 90, powerReq: 1500, reward: { emblemMarks: 15 }, enemies: 10, bossHpMult: 4 },
      { name: "Honor Court", minStage: 160, powerReq: 6000, reward: { emblemMarks: 30 }, enemies: 12, bossHpMult: 5 },
      { name: "Legend Sanctum", minStage: 280, powerReq: 18000, reward: { emblemMarks: 60 }, enemies: 15, bossHpMult: 7 },
    ],
  },
];

// Simulate dungeon run — returns { success, waves, totalReward }
function simulateDungeon(dungeon, tierIdx, totalAtk, totalDef, totalMaxHp) {
  const tier = dungeon.tiers[tierIdx];
  if (!tier) return { success: false, waves: 0, totalReward: {} };
  const power = totalAtk + totalDef + totalMaxHp;
  const enemyPower = tier.powerReq;

  // Simulate wave-by-wave combat
  let playerHp = totalMaxHp;
  let wavesCleared = 0;
  const totalWaves = tier.enemies;

  for (let w = 0; w < totalWaves; w++) {
    const isBoss = w === totalWaves - 1;
    const waveHp = Math.floor(enemyPower * (0.3 + w * 0.1) * (isBoss ? tier.bossHpMult : 1));
    const waveAtk = Math.floor(enemyPower * (0.05 + w * 0.01) * (isBoss ? 1.5 : 1));

    // Rounds to kill monster (simplified)
    const dmgPerHit = Math.max(1, totalAtk - Math.floor(waveAtk * 0.3));
    const roundsToKill = Math.ceil(waveHp / dmgPerHit);
    const dmgTaken = Math.floor(Math.max(1, waveAtk - totalDef * 0.5) * roundsToKill * 0.6);

    playerHp -= dmgTaken;
    if (playerHp <= 0) break;
    wavesCleared++;
  }

  const success = wavesCleared >= totalWaves;
  const rewardMult = success ? 1 : wavesCleared / totalWaves;
  const totalReward = {};
  Object.entries(tier.reward).forEach(([k, v]) => {
    totalReward[k] = Math.floor(v * rewardMult);
  });

  return { success, waves: wavesCleared, totalWaves, totalReward, tier };
}

// ─── RAID BOSSES ───
const RAID_BOSSES = [
  { id: "raid_wolf", name: "Alpha Dire Wolf", emoji: "🐺", hp: 5000, atk: 80, def: 20, timeLimit: 30, minStage: 20, reward: { diamonds: 30, gold: 3000, souls: 2 }, color: T.info },
  { id: "raid_golem", name: "Ancient Golem", emoji: "🗿", hp: 20000, atk: 150, def: 60, timeLimit: 45, minStage: 50, reward: { diamonds: 60, gold: 8000, souls: 5 }, color: T.orange },
  { id: "raid_dragon", name: "Elder Dragon", emoji: "🐉", hp: 80000, atk: 300, def: 120, timeLimit: 60, minStage: 100, reward: { diamonds: 120, gold: 25000, souls: 12 }, color: T.danger },
  { id: "raid_lich", name: "Lich King", emoji: "💀", hp: 250000, atk: 600, def: 250, timeLimit: 60, minStage: 200, reward: { diamonds: 250, gold: 60000, souls: 25 }, color: T.purple },
  { id: "raid_void", name: "Void Titan", emoji: "🕳️", hp: 1000000, atk: 1200, def: 500, timeLimit: 90, minStage: 300, reward: { diamonds: 500, gold: 150000, souls: 50 }, color: "#a855f7" },
  { id: "raid_god", name: "Fallen God", emoji: "⚜️", hp: 5000000, atk: 3000, def: 1200, timeLimit: 120, minStage: 400, reward: { diamonds: 1000, gold: 500000, souls: 100 }, color: T.gold },
];

// ─── ACHIEVEMENTS ───
const ACHIEVEMENTS = [
  // Combat milestones
  { id: "kill_100", name: "Monster Slayer", desc: "Kill 100 monsters", icon: "⚔️", category: "combat", check: (s) => s.combatStats.kills >= 100, reward: { gold: 500 }, color: T.danger },
  { id: "kill_1k", name: "Centurion", desc: "Kill 1,000 monsters", icon: "🗡️", category: "combat", check: (s) => s.combatStats.kills >= 1000, reward: { gold: 2000, diamonds: 20 }, color: T.danger },
  { id: "kill_10k", name: "Warlord", desc: "Kill 10,000 monsters", icon: "💀", category: "combat", check: (s) => s.combatStats.kills >= 10000, reward: { gold: 10000, diamonds: 100 }, color: T.danger },
  { id: "kill_100k", name: "Extinction Event", desc: "Kill 100,000 monsters", icon: "☠️", category: "combat", check: (s) => s.combatStats.kills >= 100000, reward: { gold: 50000, diamonds: 500 }, color: T.danger },
  { id: "boss_10", name: "Boss Hunter", desc: "Kill 10 bosses", icon: "👑", category: "combat", check: (s) => (s.combatStats.bossesKilled || 0) >= 10, reward: { gold: 1000, diamonds: 15 }, color: T.orange },
  { id: "boss_50", name: "Boss Slayer", desc: "Kill 50 bosses", icon: "🏆", category: "combat", check: (s) => (s.combatStats.bossesKilled || 0) >= 50, reward: { gold: 5000, diamonds: 75 }, color: T.orange },
  { id: "boss_200", name: "Raid Master", desc: "Kill 200 bosses", icon: "⚡", category: "combat", check: (s) => (s.combatStats.bossesKilled || 0) >= 200, reward: { gold: 25000, diamonds: 250 }, color: T.orange },
  { id: "dmg_10k", name: "Hard Hitter", desc: "Deal 10,000 total damage", icon: "💥", category: "combat", check: (s) => s.combatStats.totalDamage >= 10000, reward: { gold: 300 }, color: T.warning },
  { id: "dmg_1m", name: "Devastator", desc: "Deal 1,000,000 total damage", icon: "🔥", category: "combat", check: (s) => s.combatStats.totalDamage >= 1000000, reward: { gold: 5000, diamonds: 50 }, color: T.warning },
  { id: "crit_500", name: "Critical Strike", desc: "Land a single hit of 500+", icon: "💢", category: "combat", check: (s) => (s.combatStats.highestHit || 0) >= 500, reward: { gold: 1000 }, color: T.danger },
  { id: "crit_5k", name: "Massive Blow", desc: "Land a single hit of 5,000+", icon: "💫", category: "combat", check: (s) => (s.combatStats.highestHit || 0) >= 5000, reward: { gold: 5000, diamonds: 30 }, color: T.danger },
  { id: "death_0", name: "Immortal", desc: "Reach stage 50 with 0 deaths", icon: "🛡️", category: "combat", check: (s) => s.highestStage >= 50 && s.combatStats.deaths === 0, reward: { diamonds: 100 }, color: T.info },

  // Stage milestones
  { id: "stage_10", name: "Getting Started", desc: "Reach stage 10", icon: "🌱", category: "progress", check: (s) => s.highestStage >= 10, reward: { gold: 200 }, color: T.success },
  { id: "stage_50", name: "Adventurer", desc: "Reach stage 50", icon: "🗺️", category: "progress", check: (s) => s.highestStage >= 50, reward: { gold: 1000, diamonds: 20 }, color: T.success },
  { id: "stage_100", name: "Centurion", desc: "Reach stage 100", icon: "💯", category: "progress", check: (s) => s.highestStage >= 100, reward: { gold: 5000, diamonds: 50 }, color: T.success },
  { id: "stage_200", name: "Veteran", desc: "Reach stage 200", icon: "⭐", category: "progress", check: (s) => s.highestStage >= 200, reward: { gold: 15000, diamonds: 150 }, color: T.success },
  { id: "stage_400", name: "Legend", desc: "Reach stage 400", icon: "🌟", category: "progress", check: (s) => s.highestStage >= 400, reward: { gold: 50000, diamonds: 500 }, color: T.gold },
  { id: "ch2", name: "Into the Dark", desc: "Enter Darkstone Caves (Ch.2)", icon: "🕳️", category: "progress", check: (s) => s.highestStage >= 51, reward: { gold: 500 }, color: T.textSec },
  { id: "ch3", name: "Swamp Crawler", desc: "Enter Rotwood Swamp (Ch.3)", icon: "🌿", category: "progress", check: (s) => s.highestStage >= 101, reward: { gold: 1500 }, color: T.success },
  { id: "ch5", name: "Fire Walker", desc: "Enter Emberpeak Volcano (Ch.5)", icon: "🌋", category: "progress", check: (s) => s.highestStage >= 201, reward: { gold: 5000, diamonds: 30 }, color: T.orange },
  { id: "ch8", name: "Rift Breaker", desc: "Enter Celestial Rift (Ch.8)", icon: "✨", category: "progress", check: (s) => s.highestStage >= 351, reward: { gold: 20000, diamonds: 200 }, color: T.pink },

  // Growth milestones
  { id: "growth_10", name: "Powered Up", desc: "Any growth stat reaches Lv.10", icon: "📊", category: "growth", check: (s) => Math.max(s.growth.atk, s.growth.hp, s.growth.def) >= 10, reward: { gold: 300 }, color: T.accent },
  { id: "growth_50", name: "Ascendant", desc: "Any growth stat reaches Lv.50", icon: "📈", category: "growth", check: (s) => Math.max(s.growth.atk, s.growth.hp, s.growth.def) >= 50, reward: { gold: 3000, diamonds: 30 }, color: T.accent },
  { id: "growth_100", name: "Transcendent", desc: "Any growth stat reaches Lv.100", icon: "🚀", category: "growth", check: (s) => Math.max(s.growth.atk, s.growth.hp, s.growth.def) >= 100, reward: { gold: 15000, diamonds: 100 }, color: T.accent },
  { id: "balanced_25", name: "Balanced Build", desc: "All growth stats at Lv.25+", icon: "⚖️", category: "growth", check: (s) => Math.min(s.growth.atk, s.growth.hp, s.growth.def) >= 25, reward: { gold: 5000, diamonds: 50 }, color: T.teal },

  // Collection milestones
  { id: "equip_10", name: "Collector", desc: "Own 10 equipment pieces", icon: "🎒", category: "collection", check: (s) => s.equipCount >= 10, reward: { gold: 500 }, color: T.warning },
  { id: "equip_50", name: "Hoarder", desc: "Own 50 equipment pieces", icon: "🏪", category: "collection", check: (s) => s.equipCount >= 50, reward: { gold: 3000, diamonds: 25 }, color: T.warning },
  { id: "summon_50", name: "Summoner", desc: "Perform 50 summons", icon: "✨", category: "collection", check: (s) => (s.stats.summons || 0) >= 50, reward: { gold: 2000, diamonds: 20 }, color: T.purple },
  { id: "summon_200", name: "Grand Summoner", desc: "Perform 200 summons", icon: "🌀", category: "collection", check: (s) => (s.stats.summons || 0) >= 200, reward: { gold: 10000, diamonds: 100 }, color: T.purple },
  { id: "merge_10", name: "Blacksmith", desc: "Perform 10 merges", icon: "🔨", category: "collection", check: (s) => (s.stats.merges || 0) >= 10, reward: { gold: 2000, diamonds: 15 }, color: T.orange },
  { id: "pet_1", name: "Pet Owner", desc: "Obtain your first pet", icon: "🐾", category: "collection", check: (s) => s.petCount >= 1, reward: { gold: 500 }, color: T.pink },
  { id: "pet_5", name: "Menagerie", desc: "Own 5 pets", icon: "🐲", category: "collection", check: (s) => s.petCount >= 5, reward: { gold: 5000, diamonds: 50 }, color: T.pink },
  { id: "costume_3", name: "Fashionista", desc: "Own 3 costumes", icon: "👗", category: "collection", check: (s) => s.costumeCount >= 3, reward: { gold: 1000, diamonds: 15 }, color: T.teal },
  { id: "costume_8", name: "Wardrobe Master", desc: "Own 8 costumes", icon: "👔", category: "collection", check: (s) => s.costumeCount >= 8, reward: { gold: 10000, diamonds: 150 }, color: T.teal },

  // Economy milestones
  { id: "gold_10k", name: "Wealthy", desc: "Earn 10,000 total gold", icon: "💰", category: "economy", check: (s) => (s.combatStats.totalGoldEarned || 0) >= 10000, reward: { diamonds: 10 }, color: T.gold },
  { id: "gold_100k", name: "Tycoon", desc: "Earn 100,000 total gold", icon: "💎", category: "economy", check: (s) => (s.combatStats.totalGoldEarned || 0) >= 100000, reward: { diamonds: 50 }, color: T.gold },
  { id: "gold_1m", name: "Mogul", desc: "Earn 1,000,000 total gold", icon: "🏦", category: "economy", check: (s) => (s.combatStats.totalGoldEarned || 0) >= 1000000, reward: { diamonds: 200 }, color: T.gold },
  { id: "streak_7", name: "Dedicated", desc: "7-day login streak", icon: "🔥", category: "economy", check: (s) => (s.stats.loginStreak || 0) >= 7, reward: { gold: 2000, diamonds: 30 }, color: T.orange },
  { id: "streak_30", name: "Loyal Warrior", desc: "30-day login streak", icon: "🔥", category: "economy", check: (s) => (s.stats.loginStreak || 0) >= 30, reward: { gold: 10000, diamonds: 200 }, color: T.orange },
];

const ACH_CATEGORIES = [
  { id: "combat", name: "Combat", icon: "⚔️", color: T.danger },
  { id: "progress", name: "Progress", icon: "🗺️", color: T.success },
  { id: "growth", name: "Growth", icon: "📊", color: T.accent },
  { id: "collection", name: "Collection", icon: "🎒", color: T.warning },
  { id: "economy", name: "Economy", icon: "💰", color: T.gold },
];

// ─── QUESTS ───
const DAILY_QUESTS = [
  { id: "dq_kill", name: "Monster Hunter", desc: "Kill {n} monsters", icon: "⚔️", target: 50, reward: { diamonds: 15 }, color: T.danger, stat: "kills" },
  { id: "dq_gold", name: "Gold Collector", desc: "Earn {n} gold", icon: "🪙", target: 5000, reward: { diamonds: 10 }, color: T.gold, stat: "goldEarned" },
  { id: "dq_stage", name: "Stage Clearer", desc: "Clear {n} stages", icon: "🏔️", target: 3, reward: { diamonds: 20 }, color: T.info, stat: "stagesCleared" },
  { id: "dq_summon", name: "Lucky Draw", desc: "Summon {n} items", icon: "✨", target: 3, reward: { diamonds: 10 }, color: T.purple, stat: "summonsDone" },
  { id: "dq_upgrade", name: "Power Up", desc: "Upgrade growth {n} times", icon: "📊", target: 5, reward: { diamonds: 10 }, color: T.success, stat: "upgradesDone" },
  { id: "dq_dungeon", name: "Dungeon Runner", desc: "Complete {n} dungeon", icon: "🏰", target: 1, reward: { diamonds: 15 }, color: T.orange, stat: "dungeonsRun" },
];
const WEEKLY_QUESTS = [
  { id: "wq_kill", name: "Weekly Slaughter", desc: "Kill {n} monsters", icon: "💀", target: 500, reward: { diamonds: 80 }, color: T.danger, stat: "kills" },
  { id: "wq_stage", name: "Weekly Climber", desc: "Clear {n} stages", icon: "🗻", target: 20, reward: { diamonds: 100 }, color: T.accent, stat: "stagesCleared" },
  { id: "wq_summon", name: "Weekly Gacha", desc: "Summon {n} items", icon: "🎰", target: 20, reward: { diamonds: 60 }, color: T.purple, stat: "summonsDone" },
];
function getQuestDay() { return new Date().toISOString().slice(0, 10); }
function getQuestWeek() { const d = new Date(); const day = d.getDay(); const diff = d.getDate() - day + (day === 0 ? -6 : 1); return new Date(d.setDate(diff)).toISOString().slice(0, 10); }

// ─── DAILY LOGIN REWARDS ───
const LOGIN_REWARDS = [
  { day: 1, gold: 100, diamonds: 10, label: "100g + 10💎" },
  { day: 2, gold: 200, diamonds: 15, label: "200g + 15💎" },
  { day: 3, gold: 350, diamonds: 20, label: "350g + 20💎" },
  { day: 4, gold: 500, diamonds: 25, label: "500g + 25💎" },
  { day: 5, gold: 800, diamonds: 35, label: "800g + 35💎" },
  { day: 6, gold: 1200, diamonds: 50, label: "1,200g + 50💎" },
  { day: 7, gold: 2000, diamonds: 100, label: "2,000g + 100💎" },
];

// ─── OFFLINE EARNINGS CONFIG ───
const OFFLINE_GOLD_PER_SEC = 1; // base gold per second offline (multiplied by stage)
const OFFLINE_MAX_HOURS = 12; // max offline earnings cap
const OFFLINE_STAGE_MULT = 0.05; // extra gold per stage per second

// ═══════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════

const fmt = (n) => {
  if (n >= 1e12) return (n / 1e12).toFixed(1) + "T";
  if (n >= 1e9) return (n / 1e9).toFixed(1) + "B";
  if (n >= 1e6) return (n / 1e6).toFixed(1) + "M";
  if (n >= 1e3) return (n / 1e3).toFixed(1) + "K";
  return String(Math.floor(n));
};

const rarColor = (r) => RARITIES.find(x => x.id === r)?.color || T.textDim;

function formatDuration(seconds) {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  if (hrs > 0) return `${hrs}h ${mins}m`;
  if (mins > 0) return `${mins}m`;
  return `${Math.floor(seconds)}s`;
}

// ═══════════════════════════════════════════════
// UI COMPONENTS (polished)
// ═══════════════════════════════════════════════

function Card({ children, style, glow, onClick, hover, accent: accentLine }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div onClick={onClick}
      onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
      style={{
        background: hovered && hover ? `linear-gradient(180deg, ${T.cardHover} 0%, ${T.card} 100%)` : T.card,
        borderRadius: T.r, padding: 18, position: "relative", overflow: "hidden",
        border: `1px solid ${glow ? glow + "30" : T.cardBorder}`,
        boxShadow: glow ? `0 0 24px ${glow}10, 0 4px 24px #00000035` : "0 2px 16px #00000020",
        cursor: onClick ? "pointer" : undefined,
        transition: "all 0.2s ease", ...style,
      }}>
      {accentLine && <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, ${accentLine}, transparent)` }} />}
      {children}
    </div>
  );
}

function Btn({ children, onClick, color = T.accent, small, disabled, style: sx, block }) {
  const [hover, setHover] = useState(false);
  const [pressed, setPressed] = useState(false);
  return (
    <div onClick={disabled ? undefined : onClick}
      onMouseEnter={() => setHover(true)} onMouseLeave={() => { setHover(false); setPressed(false); }}
      onMouseDown={() => setPressed(true)} onMouseUp={() => setPressed(false)}
      style={{
        display: block ? "flex" : "inline-flex", alignItems: "center", justifyContent: "center", gap: 6,
        padding: small ? "7px 14px" : "10px 22px",
        borderRadius: T.rs, fontWeight: 700, fontSize: small ? 11 : 13, fontFamily: FONT_BODY,
        background: disabled ? T.bar : hover ? `${color}28` : `${color}14`,
        color: disabled ? T.textDim : color,
        border: `1px solid ${disabled ? T.divider : hover ? color + "50" : color + "25"}`,
        cursor: disabled ? "not-allowed" : "pointer",
        transition: "all 0.15s ease", userSelect: "none",
        transform: pressed && !disabled ? "scale(0.97)" : hover && !disabled ? "translateY(-1px)" : undefined,
        boxShadow: hover && !disabled ? `0 4px 12px ${color}15` : undefined,
        width: block ? "100%" : undefined,
        ...sx,
      }}>{children}</div>
  );
}

function Badge({ children, color = T.accent, style: sx }) {
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", padding: "2px 8px",
      borderRadius: 99, fontSize: 10, fontWeight: 700, fontFamily: FONT_BODY,
      background: `${color}15`, color, border: `1px solid ${color}20`,
      ...sx,
    }}>{children}</span>
  );
}

function ProgressBar({ value, max, color = T.accent, height = 8, showLabel, labelLeft, labelRight, bg, animated }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div>
      {(showLabel || labelLeft || labelRight) && (
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, fontWeight: 600, color, marginBottom: 4, fontFamily: FONT_BODY }}>
          <span style={{ color: T.textSec }}>{labelLeft || ""}</span>
          <span>{labelRight || (showLabel ? `${fmt(value)} / ${fmt(max)}` : "")}</span>
        </div>
      )}
      <div style={{ height, background: bg || T.bar, borderRadius: 99, overflow: "hidden", position: "relative" }}>
        <div style={{
          width: `${pct}%`, height: "100%", borderRadius: 99,
          background: `linear-gradient(90deg, ${color}, ${color}cc)`,
          transition: "width 0.3s ease",
          boxShadow: pct > 5 ? `0 0 8px ${color}40` : undefined,
        }} />
        {animated && pct > 5 && pct < 100 && (
          <div style={{
            position: "absolute", top: 0, right: `${100 - pct}%`, width: 20, height: "100%",
            background: `linear-gradient(90deg, transparent, ${color}60, transparent)`,
            animation: "shimmer 1.5s infinite",
          }} />
        )}
      </div>
    </div>
  );
}

function StatRow({ label, value, color }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: `1px solid ${T.divider}08`, fontSize: 12, fontFamily: FONT_BODY }}>
      <span style={{ color: T.textSec }}>{label}</span>
      <span style={{ color: color || T.white, fontWeight: 700 }}>{value}</span>
    </div>
  );
}

function PageTitle({ icon, title, subtitle }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ fontSize: 24, fontWeight: 900, color: T.white, fontFamily: FONT_DISPLAY, letterSpacing: -0.5 }}>{icon} {title}</div>
      {subtitle && <div style={{ fontSize: 12, color: T.textSec, marginTop: 3, fontFamily: FONT_BODY }}>{subtitle}</div>}
    </div>
  );
}

// ─── POPUP OVERLAY ───
function Popup({ children, onClose, title, icon, color = T.accent }) {
  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 999, display: "flex", alignItems: "center", justifyContent: "center",
      background: "rgba(0,0,0,0.75)", backdropFilter: "blur(8px)", animation: "fadeIn 0.3s ease",
    }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{
        background: T.card, borderRadius: 16, padding: 28, maxWidth: 440, width: "90%",
        border: `1px solid ${color}30`, boxShadow: `0 0 40px ${color}15, 0 20px 60px #00000060`,
        animation: "slideUp 0.3s ease",
      }}>
        {icon && <div style={{ textAlign: "center", fontSize: 48, marginBottom: 8 }}>{icon}</div>}
        {title && <div style={{ textAlign: "center", fontSize: 20, fontWeight: 900, color: T.white, marginBottom: 16, fontFamily: FONT_DISPLAY }}>{title}</div>}
        {children}
        <div style={{ textAlign: "center", marginTop: 18 }}>
          <Btn color={color} onClick={onClose}>Collect & Continue</Btn>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════
// DEFAULT SAVE
// ═══════════════════════════════════════════════

const DEFAULT_SAVE = () => ({
  currentStage: 1, highestStage: 1,
  growth: { atk: 1, hp: 1, def: 1 },
  player: { hp: 100, maxHp: 100 },
  equipment: [],
  equipped: { weapon: null, armor: null, helm: null, gloves: null, boots: null, ring: null, amulet: null, earring: null, necklace: null, bracelet: null },
  accessories: [], // separate pool for accessories
  raidAttempts: {}, // { raidId: { date, used } }
  pets: [], activePets: [], petSlots: 1,
  gold: 100, diamonds: 50,
  unlockedSkills: ["slash"], equippedSkills: ["slash", null, null],
  ownedCostumes: ["default"], activeCostume: "default",
  achievementsUnlocked: {},
  dungeonAttempts: {},
  questProgress: { day: "", week: "", daily: {}, weekly: {}, claimedDaily: {}, claimedWeekly: {} },
  ownedRelics: {}, earnedInsignias: {},
  activeTitle: "tl_newbie", earnedTitles: { tl_newbie: true },
  shopPurchases: {},
  emblemMarks: 0, unlockedEmblems: {}, equippedEmblems: [null, null, null], // { shopId: { date, count } }
  prestigeCount: 0, prestigeSouls: 0, // souls = permanent currency from rebirth
  skillLevels: {}, // { skillId: level }
  passiveSkillLevels: {}, // { passiveId: level }
  skillBarPresets: [["slash", null, null], [null, null, null]], // 2 loadouts
  activeSkillBar: 0,
  resonanceLevel: 0, resonanceXp: 0, // late-game scaling
  ownedFigures: {}, // { figureId: count }
  towerFloor: 0, towerBestFloor: 0, // Tower of Trials
  mailbox: [], mailRead: {}, // in-game mail
  lastSpinDay: "", // daily wheel spin
  bossRushBest: 0, bossRushAttempts: 0, // boss rush mode
  combatStats: { kills: 0, totalDamage: 0, deaths: 0, highestHit: 0, bossesKilled: 0, totalGoldEarned: 0 },
  stats: { timePlayed: 0, loginStreak: 0, lastLoginDay: null, summons: 0, merges: 0 },
  isPremium: false, storePurchases: {},
  autoProgress: true,
  farmStage: 0, // 0 = auto-progress, >0 = farm that specific stage
  lastActiveTime: Date.now(),
  autoDismantle: -1, lockedEquipment: {}, tutorialDone: false,
  petLevels: {}, // -1 = off, 0+ = rarityIdx threshold (dismantle at or below)
  battlePassXp: 0, battlePassLevel: 0, battlePassClaimed: {}, battlePassPremium: false,
  bestiary: {}, // { chapterIdx_monsterIdx: killCount }
  gems: [], // { id, tier, stat, value }
  socketedGems: {}, // { equipSlot: [gemId, gemId] }
  weaponEvo: 1, // weapon evolution tier
  rage: 0, // rage meter 0-100
  dojoTraining: {}, // { slotId: { startTime, stat, rate } }
  dojoStats: { atk: 0, def: 0, hp: 0, critRate: 0 }, // permanent dojo bonuses
  challengesCompleted: {}, // { challengeId: true }
});

// ═══════════════════════════════════════════════
// AUTH SCREEN
// ═══════════════════════════════════════════════

function AuthScreen({ onLogin }) {
  const [tab, setTab] = useState("login");
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const clearForm = () => { setDisplayName(""); setEmail(""); setPassword(""); setConfirmPw(""); setError(""); };

  const handleSignup = async () => {
    setError("");
    if (!displayName.trim() || displayName.length < 3) return setError("Display name must be at least 3 characters");
    if (!email.trim()) return setError("Please enter an email");
    if (!password || password.length < 6) return setError("Password must be at least 6 characters");
    if (password !== confirmPw) return setError("Passwords do not match");
    setLoading(true);
    try {
      const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
      await updateProfile(cred.user, { displayName: displayName.trim() });
      const save = DEFAULT_SAVE();
      await window.storage.set(`save:${cred.user.uid}`, JSON.stringify(save));
      onLogin({ username: cred.user.uid, displayName: displayName.trim(), email: email.trim(), uid: cred.user.uid, isGuest: false }, save);
    } catch (e) {
      setError(e.code === "auth/email-already-in-use" ? "Email already in use" : e.message);
    }
    setLoading(false);
  };

  const handleLogin = async () => {
    setError("");
    if (!email.trim() || !password) return setError("Enter email and password");
    setLoading(true);
    try { await signInWithEmailAndPassword(auth, email.trim(), password); }
    catch (e) { setError(e.code === "auth/invalid-credential" ? "Invalid email or password" : e.message); }
    setLoading(false);
  };

  const inp = { padding: "11px 14px", borderRadius: T.rs, background: T.bgDeep, border: `1px solid ${T.divider}`, color: T.white, fontSize: 13, outline: "none", fontFamily: FONT_BODY, width: "100%", boxSizing: "border-box" };

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: `radial-gradient(ellipse at 50% 30%, #1a1040 0%, ${T.bg} 70%)`, fontFamily: FONT_BODY, position: "relative", overflow: "hidden" }}>
      {/* Floating background particles */}
      {[...Array(6)].map((_, i) => (
        <div key={i} style={{
          position: "absolute", borderRadius: "50%",
          width: 4 + i * 2, height: 4 + i * 2,
          background: `${[T.accent, T.purple, T.teal, T.danger, T.success, T.gold][i]}30`,
          left: `${10 + i * 15}%`, top: `${15 + (i % 3) * 25}%`,
          animation: `float ${3 + i * 0.5}s ease-in-out infinite ${i * 0.3}s`,
          filter: "blur(1px)",
        }} />
      ))}
      <div style={{ width: "100%", maxWidth: 400, padding: 24, position: "relative", zIndex: 1 }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ fontSize: 60, marginBottom: 10, filter: "drop-shadow(0 0 24px rgba(99,102,241,0.5))", animation: "float 3s ease-in-out infinite" }}>⚔️</div>
          <div style={{ fontSize: 36, fontWeight: 900, color: T.white, fontFamily: FONT_DISPLAY, letterSpacing: 2 }}>BLADE REALMS</div>
          <div style={{ fontSize: 11, color: T.textSec, marginTop: 6, letterSpacing: 3, textTransform: "uppercase" }}>Idle Adventure RPG</div>
        </div>
        <Card style={{ background: `${T.card}e0`, backdropFilter: "blur(12px)" }}>
          <div style={{ display: "flex", marginBottom: 20, borderBottom: `1px solid ${T.divider}` }}>
            {["login", "signup"].map(t => (
              <div key={t} onClick={() => { setTab(t); clearForm(); }} style={{
                flex: 1, padding: "10px 0", textAlign: "center", cursor: "pointer",
                fontSize: 12, fontWeight: 700, letterSpacing: 0.5, transition: "all 0.15s",
                color: tab === t ? T.accent : T.textDim,
                borderBottom: `2px solid ${tab === t ? T.accent : "transparent"}`,
              }}>{t === "login" ? "SIGN IN" : "CREATE ACCOUNT"}</div>
            ))}
          </div>

          {error && <div style={{ padding: "9px 14px", borderRadius: T.rs, background: T.dangerMuted, color: T.danger, fontSize: 12, fontWeight: 600, marginBottom: 14, border: `1px solid ${T.danger}20` }}>{error}</div>}

          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {tab === "signup" && <input value={displayName} onChange={e => setDisplayName(e.target.value)} placeholder="Display Name" style={inp} />}
            <input value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" type="email" style={inp} />
            <input value={password} onChange={e => setPassword(e.target.value)} placeholder="Password" type="password" style={inp}
              onKeyDown={e => e.key === "Enter" && tab === "login" && handleLogin()} />
            {tab === "signup" && <input value={confirmPw} onChange={e => setConfirmPw(e.target.value)} placeholder="Confirm Password" type="password" style={inp} />}
            <Btn block color={T.accent} onClick={tab === "login" ? handleLogin : handleSignup} disabled={loading}
              style={{ padding: "13px 0", fontSize: 14, marginTop: 4 }}>
              {loading ? "Loading..." : tab === "login" ? "Sign In" : "Create Account"}
            </Btn>
          </div>
        </Card>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════
// MAIN APP WRAPPER
// ═══════════════════════════════════════════════

const SESSION_ID = Math.random().toString(36).slice(2) + Date.now().toString(36);

export default function BladeRealmsApp() {
  const [account, setAccount] = useState(null);
  const [initialSave, setInitialSave] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [kicked, setKicked] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (user) {
        await setDoc(doc(db, "sessions", user.uid), { sessionId: SESSION_ID, loginAt: serverTimestamp() });
        let save;
        try { const sr = await window.storage.get(`save:${user.uid}`); save = JSON.parse(sr.value); }
        catch { save = DEFAULT_SAVE(); }
        setAccount({ username: user.uid, displayName: user.displayName || user.email?.split("@")[0] || "Adventurer", email: user.email, uid: user.uid, isGuest: false });
        setInitialSave(save);
        setKicked(false);
      } else { setAccount(null); setInitialSave(null); }
      setAuthChecked(true);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!account) return;
    const unsub = onSnapshot(doc(db, "sessions", account.uid), (snap) => {
      if (snap.exists() && snap.data().sessionId && snap.data().sessionId !== SESSION_ID) {
        setKicked(true); setAccount(null);
      }
    });
    return () => unsub();
  }, [account]);

  const handleLogin = (acc, save) => { setAccount(acc); setInitialSave(save); };
  const handleLogout = async () => { await signOut(auth); setAccount(null); setInitialSave(null); };

  if (!authChecked) return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: T.bg, fontFamily: FONT_BODY }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 40, marginBottom: 12, animation: "pulse 1.5s infinite" }}>⚔️</div>
        <div style={{ color: T.textSec, fontSize: 13 }}>Loading...</div>
      </div>
    </div>
  );

  if (kicked) return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: T.bg, fontFamily: FONT_BODY }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>🔒</div>
        <div style={{ fontSize: 20, fontWeight: 900, color: T.white, marginBottom: 8, fontFamily: FONT_DISPLAY }}>Session Ended</div>
        <div style={{ fontSize: 13, color: T.textSec, marginBottom: 20 }}>Logged in from another device.</div>
        <Btn onClick={() => setKicked(false)}>Back to Login</Btn>
      </div>
    </div>
  );

  if (!account) return <AuthScreen onLogin={handleLogin} />;
  return <GameUI key={account.username} account={account} initialSave={initialSave} onLogout={handleLogout} />;
}

// ═══════════════════════════════════════════════
// ACHIEVEMENTS PAGE COMPONENT
// ═══════════════════════════════════════════════

function AchievementsPage({ achievementsUnlocked, isMobile }) {
  const [filter, setFilter] = useState("all");
  const achCount = Object.keys(achievementsUnlocked).length;
  const totalCount = ACHIEVEMENTS.length;

  return (
    <div>
      <PageTitle icon="🏆" title="ACHIEVEMENTS" subtitle={`${achCount}/${totalCount} unlocked — complete milestones for rewards`} />

      {/* Progress overview */}
      <Card glow={T.gold} style={{ marginBottom: 18 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 20, flexWrap: "wrap", marginBottom: 14 }}>
          <div style={{
            width: 64, height: 64, borderRadius: "50%",
            background: `conic-gradient(${T.gold} ${(achCount / totalCount) * 360}deg, ${T.bar} 0deg)`,
            display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
          }}>
            <div style={{
              width: 52, height: 52, borderRadius: "50%", background: T.card,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 16, fontWeight: 900, color: T.gold, fontFamily: FONT_DISPLAY,
            }}>{Math.floor((achCount / totalCount) * 100)}%</div>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 18, fontWeight: 900, color: T.white, fontFamily: FONT_DISPLAY }}>
              {achCount} / {totalCount} Achievements
            </div>
            <ProgressBar value={achCount} max={totalCount} color={T.gold} height={8} animated />
          </div>
        </div>
        {/* Category filters */}
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          <div onClick={() => setFilter("all")} style={{
            padding: "6px 12px", borderRadius: 99, cursor: "pointer", fontSize: 10, fontWeight: 700,
            background: filter === "all" ? `${T.accent}20` : T.bgDeep,
            border: `1px solid ${filter === "all" ? T.accent + "40" : T.divider}`,
            color: filter === "all" ? T.accent : T.textSec,
            transition: "all 0.15s",
          }}>All {achCount}/{totalCount}</div>
          {ACH_CATEGORIES.map(cat => {
            const total = ACHIEVEMENTS.filter(a => a.category === cat.id).length;
            const done = ACHIEVEMENTS.filter(a => a.category === cat.id && achievementsUnlocked[a.id]).length;
            return (
              <div key={cat.id} onClick={() => setFilter(filter === cat.id ? "all" : cat.id)} style={{
                padding: "6px 12px", borderRadius: 99, cursor: "pointer", fontSize: 10, fontWeight: 700,
                background: filter === cat.id ? `${cat.color}20` : T.bgDeep,
                border: `1px solid ${filter === cat.id ? cat.color + "40" : T.divider}`,
                color: filter === cat.id ? cat.color : T.textSec,
                transition: "all 0.15s",
              }}>{cat.icon} {cat.name} {done}/{total}</div>
            );
          })}
        </div>
      </Card>

      {/* Achievement list */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {ACHIEVEMENTS
          .filter(a => filter === "all" || a.category === filter)
          .sort((a, b) => (achievementsUnlocked[a.id] ? 1 : 0) - (achievementsUnlocked[b.id] ? 1 : 0))
          .map(ach => {
            const unlocked = !!achievementsUnlocked[ach.id];
            return (
              <Card key={ach.id} style={{
                padding: 14, opacity: unlocked ? 0.65 : 1,
                background: unlocked ? `${ach.color}06` : T.card,
                borderLeft: `3px solid ${unlocked ? ach.color : T.divider}`,
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{
                    width: 42, height: 42, borderRadius: 10, flexShrink: 0,
                    background: unlocked ? `${ach.color}15` : T.bgDeep,
                    border: `1px solid ${unlocked ? ach.color + "30" : T.divider}`,
                    display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20,
                  }}>{unlocked ? ach.icon : "🔒"}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ fontSize: 13, fontWeight: 800, color: unlocked ? ach.color : T.white, fontFamily: FONT_DISPLAY }}>{ach.name}</span>
                      {unlocked && <Badge color={T.success} style={{ fontSize: 8 }}>DONE</Badge>}
                    </div>
                    <div style={{ fontSize: 10, color: T.textSec, marginTop: 1 }}>{ach.desc}</div>
                  </div>
                  <div style={{ textAlign: "right", fontSize: 10, fontWeight: 700, flexShrink: 0 }}>
                    {ach.reward.gold && <div style={{ color: T.gold }}>+{fmt(ach.reward.gold)}g</div>}
                    {ach.reward.diamonds && <div style={{ color: T.purple }}>+{ach.reward.diamonds}💎</div>}
                  </div>
                </div>
              </Card>
            );
          })}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════
// GAME UI
// ═══════════════════════════════════════════════

function GameUI({ account, initialSave, onLogout }) {
  const [page, setPage] = useState("battle");
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768);
  useEffect(() => { const fn = () => setIsMobile(window.innerWidth < 768); window.addEventListener("resize", fn); return () => window.removeEventListener("resize", fn); }, []);

  const sv = initialSave || DEFAULT_SAVE();

  // ─── STATE ───
  const [currentStage, setCurrentStage] = useState(() => sv.currentStage || 1);
  const [highestStage, setHighestStage] = useState(() => sv.highestStage || 1);
  const [growth, setGrowth] = useState(() => sv.growth || { atk: 1, hp: 1, def: 1 });
  const [gold, setGold] = useState(() => sv.gold || 100);
  const [diamonds, setDiamonds] = useState(() => sv.diamonds || 50);
  const [combatStats, setCombatStats] = useState(() => sv.combatStats || DEFAULT_SAVE().combatStats);
  const [stats, setStats] = useState(() => sv.stats || DEFAULT_SAVE().stats);
  const [autoProgress, setAutoProgress] = useState(() => sv.autoProgress !== false);
  const [farmStage, setFarmStage] = useState(() => sv.farmStage || 0);
  const [equipment, setEquipment] = useState(() => sv.equipment || []);
  const [equipped, setEquipped] = useState(() => {
    const eq = sv.equipped || DEFAULT_SAVE().equipped;
    // Ensure accessory slots exist for old saves
    return { earring: null, necklace: null, bracelet: null, ...eq };
  });
  const [accessories, setAccessories] = useState(() => sv.accessories || []);
  const [raidAttempts, setRaidAttempts] = useState(() => sv.raidAttempts || {});

  // Titles
  const [activeTitle, setActiveTitle] = useState(() => sv.activeTitle || "tl_newbie");
  const [earnedTitles, setEarnedTitles] = useState(() => sv.earnedTitles || { tl_newbie: true });

  // Shop
  const [shopPurchases, setShopPurchases] = useState(() => sv.shopPurchases || {});

  // Emblems
  const [emblemMarks, setEmblemMarks] = useState(() => sv.emblemMarks || 0);
  const [unlockedEmblems, setUnlockedEmblems] = useState(() => sv.unlockedEmblems || {});
  const [equippedEmblems, setEquippedEmblems] = useState(() => sv.equippedEmblems || [null, null, null]);
  const [pets, setPets] = useState(() => sv.pets || []);
  const [activePets, setActivePets] = useState(() => sv.activePets || []);
  const [petSlots] = useState(() => sv.petSlots || 1);
  const [unlockedSkills, setUnlockedSkills] = useState(() => sv.unlockedSkills || ["slash"]);
  const [equippedSkills, setEquippedSkills] = useState(() => sv.equippedSkills || ["slash", null, null]);
  const [ownedCostumes, setOwnedCostumes] = useState(() => sv.ownedCostumes || ["default"]);
  const [activeCostume, setActiveCostume] = useState(() => sv.activeCostume || "default");
  const [achievementsUnlocked, setAchievementsUnlocked] = useState(() => sv.achievementsUnlocked || {});
  const [dungeonAttempts, setDungeonAttempts] = useState(() => sv.dungeonAttempts || {});
  const [dungeonResult, setDungeonResult] = useState(null);

  // ─── RELICS & INSIGNIAS ───
  const [ownedRelics, setOwnedRelics] = useState(() => sv.ownedRelics || {}); // { relicId: level }
  const [earnedInsignias, setEarnedInsignias] = useState(() => sv.earnedInsignias || {});

  // Prestige
  const [prestigeCount, setPrestigeCount] = useState(() => sv.prestigeCount || 0);
  const [prestigeSouls, setPrestigeSouls] = useState(() => sv.prestigeSouls || 0);

  // Skill & passive levels
  const [skillLevels, setSkillLevels] = useState(() => sv.skillLevels || {});
  const [passiveSkillLevels, setPassiveSkillLevels] = useState(() => sv.passiveSkillLevels || {});

  // Skill bar presets
  const [skillBarPresets, setSkillBarPresets] = useState(() => sv.skillBarPresets || [["slash", null, null], [null, null, null]]);
  const [activeSkillBar, setActiveSkillBar] = useState(() => sv.activeSkillBar || 0);

  // Resonance
  const [resonanceLevel, setResonanceLevel] = useState(() => sv.resonanceLevel || 0);
  const [resonanceXp, setResonanceXp] = useState(() => sv.resonanceXp || 0);

  // Figures
  const [ownedFigures, setOwnedFigures] = useState(() => sv.ownedFigures || {});

  // Tower of Trials
  const [towerFloor, setTowerFloor] = useState(() => sv.towerFloor || 0);
  const [towerBestFloor, setTowerBestFloor] = useState(() => sv.towerBestFloor || 0);
  const [towerResult, setTowerResult] = useState(null);

  // Daily Spin
  const [lastSpinDay, setLastSpinDay] = useState(() => sv.lastSpinDay || "");
  const [spinResult, setSpinResult] = useState(null);
  const [isSpinning, setIsSpinning] = useState(false);

  // Boss Rush
  const [bossRushBest, setBossRushBest] = useState(() => sv.bossRushBest || 0);
  const [bossRushResult, setBossRushResult] = useState(null);

  // Auto-dismantle
  const [autoDismantle, setAutoDismantle] = useState(() => sv.autoDismantle !== undefined ? sv.autoDismantle : -1);
  const [lockedEquipment, setLockedEquipment] = useState(() => sv.lockedEquipment || {});
  const [petLevels, setPetLevels] = useState(() => sv.petLevels || {});
  const [showPowerBreakdown, setShowPowerBreakdown] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [tutorialStep, setTutorialStep] = useState(() => sv.tutorialDone ? -1 : 0);

  // Derived values (must be before useCallbacks that reference them)
  const canPrestige = highestStage >= 50;
  const prestigeSoulsToEarn = calcPrestigeSouls(highestStage);
  const addLog = useCallback((msg) => { setLog(prev => [...prev.slice(-60), { msg, t: Date.now() }]); }, []);

  // Battle Pass
  const [battlePassXp, setBattlePassXp] = useState(() => sv.battlePassXp || 0);
  const [battlePassLevel, setBattlePassLevel] = useState(() => sv.battlePassLevel || 0);
  const [battlePassClaimed, setBattlePassClaimed] = useState(() => sv.battlePassClaimed || {});
  const [battlePassPremium] = useState(() => sv.battlePassPremium || false);

  // Bestiary
  const [bestiary, setBestiary] = useState(() => sv.bestiary || {});

  // Gems
  const [gems, setGems] = useState(() => sv.gems || []);
  const [socketedGems, setSocketedGems] = useState(() => sv.socketedGems || {});
  const [weaponEvo, setWeaponEvo] = useState(() => sv.weaponEvo || 1);
  const [rage, setRage] = useState(0);
  const [dojoTraining, setDojoTraining] = useState(() => sv.dojoTraining || {});
  const [dojoStats, setDojoStats] = useState(() => sv.dojoStats || { atk: 0, def: 0, hp: 0, critRate: 0 });
  const [challengesCompleted, setChallengesCompleted] = useState(() => sv.challengesCompleted || {});
  const [hazardFlash, setHazardFlash] = useState(null);

  const buyRelic = useCallback((relicId) => {
    const r = RELICS.find(x => x.id === relicId);
    if (!r || ownedRelics[relicId] !== undefined || diamonds < r.cost) return;
    setDiamonds(d => d - r.cost);
    setOwnedRelics(prev => ({ ...prev, [relicId]: 1 }));
  }, [diamonds, ownedRelics]);

  const upgradeRelic = useCallback((relicId) => {
    const r = RELICS.find(x => x.id === relicId);
    if (!r) return;
    const lvl = ownedRelics[relicId];
    if (lvl === undefined || lvl >= r.maxLvl) return;
    const cost = relicUpgradeCost(lvl);
    if (gold < cost) return;
    setGold(g => g - cost);
    setOwnedRelics(prev => ({ ...prev, [relicId]: lvl + 1 }));
  }, [gold, ownedRelics]);

  const upgradeRelicMax = useCallback((relicId) => {
    const r = RELICS.find(x => x.id === relicId);
    if (!r) return;
    let lvl = ownedRelics[relicId];
    if (lvl === undefined || lvl >= r.maxLvl) return;
    let rem = gold, spent = 0;
    while (lvl < r.maxLvl) {
      const cost = relicUpgradeCost(lvl);
      if (rem < cost) break;
      rem -= cost; spent += cost; lvl++;
    }
    if (spent > 0) { setGold(g => g - spent); setOwnedRelics(prev => ({ ...prev, [relicId]: lvl })); }
  }, [gold, ownedRelics]);

  // ─── EQUIPMENT ENHANCEMENT ───
  const enhanceEquipment = useCallback((eqId) => {
    const idx = equipment.findIndex(e => e.id === eqId);
    if (idx < 0) return;
    const eq = equipment[idx];
    const cost = enhanceCost(eq.level || 0, eq.rarityIdx || 0);
    if (gold < cost) return;
    setGold(g => g - cost);
    setEquipment(prev => prev.map(e => e.id === eqId ? { ...e, level: (e.level || 0) + 1 } : e));
  }, [equipment, gold]);

  const enhanceEquipmentMax = useCallback((eqId) => {
    const eq = equipment.find(e => e.id === eqId);
    if (!eq) return;
    let lvl = eq.level || 0, rem = gold, spent = 0;
    const maxLvl = 50 + (eq.rarityIdx || 0) * 10;
    while (lvl < maxLvl) {
      const c = enhanceCost(lvl, eq.rarityIdx || 0);
      if (rem < c) break;
      rem -= c; spent += c; lvl++;
    }
    if (spent > 0) { setGold(g => g - spent); setEquipment(prev => prev.map(e => e.id === eqId ? { ...e, level: lvl } : e)); }
  }, [equipment, gold]);

  // ─── SKILL UPGRADES ───
  // Skill bar presets - swap loadout
  const swapSkillBar = useCallback((barIdx) => {
    // Save current to active preset
    setSkillBarPresets(prev => {
      const next = [...prev];
      next[activeSkillBar] = [...equippedSkills];
      return next;
    });
    // Load new preset
    setEquippedSkills(skillBarPresets[barIdx] || [null, null, null]);
    setActiveSkillBar(barIdx);
  }, [activeSkillBar, equippedSkills, skillBarPresets]);

  // Buy figure
  const buyFigure = useCallback((figId) => {
    const fig = FIGURES.find(f => f.id === figId);
    if (!fig || ownedFigures[figId]) return;
    if (fig.costType === "diamonds" && diamonds < fig.cost) return;
    if (fig.costType === "gold" && gold < fig.cost) return;
    if (fig.costType === "diamonds") setDiamonds(d => d - fig.cost);
    else setGold(g => g - fig.cost);
    setOwnedFigures(prev => ({ ...prev, [figId]: 1 }));
    addLog(`🗿 Figure collected: ${fig.emoji} ${fig.name}!`);
  }, [diamonds, gold, ownedFigures, addLog]);

  // Battle Pass XP gain
  const addBpXp = useCallback((amount) => {
    if (battlePassLevel >= BP_MAX_LEVEL) return;
    setBattlePassXp(prev => {
      let xp = prev + amount, lvl = battlePassLevel;
      while (xp >= BP_XP_PER_LEVEL && lvl < BP_MAX_LEVEL) { xp -= BP_XP_PER_LEVEL; lvl++; }
      if (lvl > battlePassLevel) setBattlePassLevel(lvl);
      return xp;
    });
  }, [battlePassLevel]);

  // Claim battle pass reward
  const claimBpReward = useCallback((level, track) => {
    const key = track + "_" + level;
    if (battlePassClaimed[key] || level > battlePassLevel) return;
    if (track === "premium" && !battlePassPremium) return;
    const bp = BATTLE_PASS_REWARDS[level - 1];
    const reward = track === "free" ? bp.free : bp.premium;
    if (reward.gold) setGold(g => g + reward.gold);
    if (reward.diamonds) setDiamonds(d => d + reward.diamonds);
    if (reward.souls) setPrestigeSouls(s => s + reward.souls);
    if (reward.marks) setEmblemMarks(m => m + reward.marks);
    setBattlePassClaimed(prev => ({ ...prev, [key]: true }));
  }, [battlePassLevel, battlePassClaimed, battlePassPremium]);

  // Gem socket/unsocket
  const socketGem = useCallback((gemId, slot) => {
    setSocketedGems(prev => {
      const cur = prev[slot] || [];
      if (cur.length >= 2 || cur.includes(gemId)) return prev;
      return { ...prev, [slot]: [...cur, gemId] };
    });
  }, []);
  const unsocketGem = useCallback((gemId, slot) => {
    setSocketedGems(prev => ({ ...prev, [slot]: (prev[slot] || []).filter(id => id !== gemId) }));
  }, []);

  // Combine 3 same-type same-tier gems into next tier
  const combineGems = useCallback((typeId, tier) => {
    if (tier >= 5) return;
    const allSocketed = Object.values(socketedGems).flat();
    const available = gems.filter(g => g.type === typeId && g.tier === tier && !allSocketed.includes(g.id));
    if (available.length < 3) return;
    const toRemove = available.slice(0, 3).map(g => g.id);
    const type = GEM_TYPES.find(t => t.id === typeId);
    const newGem = { id: Date.now().toString(36) + Math.random().toString(36).slice(2, 5), type: typeId, tier: tier + 1, stat: type.stat, value: gemValue(type, tier + 1) };
    setGems(prev => [...prev.filter(g => !toRemove.includes(g.id)), newGem]);
  }, [gems, socketedGems]);

  const upgradeSkill = useCallback((skillId) => {
    const lvl = skillLevels[skillId] || 0;
    const cost = skillUpgradeCost(lvl);
    if (gold < cost) return;
    setGold(g => g - cost);
    setSkillLevels(prev => ({ ...prev, [skillId]: lvl + 1 }));
  }, [gold, skillLevels]);

  const upgradePassiveSkill = useCallback((passiveId) => {
    const ps = PASSIVE_SKILLS.find(p => p.id === passiveId);
    if (!ps) return;
    const lvl = passiveSkillLevels[passiveId] || 0;
    if (lvl >= ps.maxLvl) return;
    const cost = passiveSkillCost(lvl);
    if (gold < cost) return;
    setGold(g => g - cost);
    setPassiveSkillLevels(prev => ({ ...prev, [passiveId]: lvl + 1 }));
  }, [gold, passiveSkillLevels]);

  // ─── PRESTIGE / REBIRTH ───

  const doPrestige = useCallback(() => {
    if (!canPrestige) return;
    const souls = prestigeSoulsToEarn;
    setCurrentStage(1);
    setHighestStage(1);
    setGrowth({ atk: 1, hp: 1, def: 1 });
    setGold(100);
    setEquipment([]);
    setEquipped({ weapon: null, armor: null, helm: null, gloves: null, boots: null, ring: null, amulet: null, earring: null, necklace: null, bracelet: null });
    setAccessories([]);
    setSkillLevels({});
    setPassiveSkillLevels({});
    setPrestigeSouls(s => s + souls);
    setPrestigeCount(c => c + 1);
    setCombatStats(s => ({ ...s, kills: 0, totalDamage: 0, deaths: 0, highestHit: 0, bossesKilled: 0 }));
    setIsBattling(false);
    setBattleState(null);
    setPage("battle");
    addLog(`🔄 REBIRTH #${prestigeCount + 1}! +${souls} Prestige Souls`);
  }, [canPrestige, prestigeSoulsToEarn, prestigeCount]);

  // ─── QUEST STATE ───
  const [questProgress, setQuestProgress] = useState(() => {
    const qp = sv.questProgress || {};
    const today = getQuestDay();
    const week = getQuestWeek();
    // Reset daily progress if day changed
    if (qp.day !== today) return { day: today, week: qp.week === week ? qp.week : week, daily: {}, weekly: qp.week === week ? (qp.weekly || {}) : {}, claimedDaily: {}, claimedWeekly: qp.week === week ? (qp.claimedWeekly || {}) : {} };
    if (qp.week !== week) return { ...qp, week, weekly: {}, claimedWeekly: {} };
    return qp;
  });

  const addQuestProgress = useCallback((stat, amount = 1) => {
    setQuestProgress(prev => ({
      ...prev,
      daily: { ...prev.daily, [stat]: (prev.daily[stat] || 0) + amount },
      weekly: { ...prev.weekly, [stat]: (prev.weekly[stat] || 0) + amount },
    }));
  }, []);

  const claimQuest = useCallback((questId, isWeekly = false) => {
    const quests = isWeekly ? WEEKLY_QUESTS : DAILY_QUESTS;
    const q = quests.find(qq => qq.id === questId);
    if (!q) return;
    const prog = isWeekly ? questProgress.weekly : questProgress.daily;
    const claimed = isWeekly ? questProgress.claimedWeekly : questProgress.claimedDaily;
    if ((prog[q.stat] || 0) < q.target || claimed[questId]) return;
    if (q.reward.diamonds) setDiamonds(d => d + q.reward.diamonds);
    if (q.reward.gold) setGold(g => g + q.reward.gold);
    setQuestProgress(prev => ({
      ...prev,
      [isWeekly ? "claimedWeekly" : "claimedDaily"]: { ...(isWeekly ? prev.claimedWeekly : prev.claimedDaily), [questId]: true },
    }));
  }, [questProgress]);

  // Combat live
  const [battleState, setBattleState] = useState(null);
  const [playerHp, setPlayerHp] = useState(100);
  const [isBattling, setIsBattling] = useState(false);
  const [skillCooldowns, setSkillCooldowns] = useState({});
  const [log, setLog] = useState([]);
  const [showSummonResult, setShowSummonResult] = useState(null);
  const [achToast, setAchToast] = useState(null);

  // ─── BATTLE EFFECTS STATE ───
  const [floatingDmg, setFloatingDmg] = useState([]); // [{id, dmg, x, side, crit, skill, ts}]
  const [heroAnim, setHeroAnim] = useState(""); // "attack", "hit", "idle"
  const [screenFlash, setScreenFlash] = useState(null); // {color, ts}
  const [goldPopups, setGoldPopups] = useState([]); // [{id, amount, ts}]
  const [comboCount, setComboCount] = useState(0); // hit combo counter
  const [screenShake, setScreenShake] = useState(false);
  const [bossCinematic, setBossCinematic] = useState(null); // {name, emoji, sprite}
  const [announcer, setAnnouncer] = useState(null); // {text, color, ts}
  const dmgIdRef = useRef(0);
  const comboRef = useRef(0);
  const comboTimerRef = useRef(null);
  const battleStateRef = useRef(null);

  const addDmgNumber = useCallback((dmg, side, crit = false, skill = null) => {
    const id = ++dmgIdRef.current;
    const x = 30 + Math.random() * 40; // random horizontal offset %
    setFloatingDmg(prev => [...prev.slice(-8), { id, dmg, x, side, crit, skill, ts: Date.now() }]);
    setTimeout(() => setFloatingDmg(prev => prev.filter(d => d.id !== id)), 1200);
  }, []);

  const addGoldPopup = useCallback((amount) => {
    const id = ++dmgIdRef.current;
    setGoldPopups(prev => [...prev.slice(-4), { id, amount, ts: Date.now() }]);
    setTimeout(() => setGoldPopups(prev => prev.filter(g => g.id !== id)), 1000);
  }, []);

  const triggerHeroAttack = useCallback(() => {
    setHeroAnim("attack");
    setTimeout(() => setHeroAnim(""), 300);
  }, []);

  const triggerHeroHit = useCallback(() => {
    setHeroAnim("hit");
    setTimeout(() => setHeroAnim(""), 400);
  }, []);

  const triggerFlash = useCallback((color) => {
    setScreenFlash({ color, ts: Date.now() });
    setTimeout(() => setScreenFlash(null), 150);
  }, []);

  const triggerShake = useCallback((intensity = "normal") => {
    setScreenShake(intensity);
    setTimeout(() => setScreenShake(false), intensity === "heavy" ? 400 : 200);
  }, []);

  const incrementCombo = useCallback(() => {
    comboRef.current += 1;
    setComboCount(comboRef.current);
    if (comboTimerRef.current) clearTimeout(comboTimerRef.current);
    comboTimerRef.current = setTimeout(() => { comboRef.current = 0; setComboCount(0); }, 2000);
  }, []);

  const showAnnouncer = useCallback((text, color = "#fff") => {
    setAnnouncer({ text, color, ts: Date.now() });
    setTimeout(() => setAnnouncer(null), 1500);
  }, []);

  // Tap-to-attack handler — defined after totalAtk/critRate/critDmg below

  // Keep ref in sync for tap handler
  useEffect(() => { battleStateRef.current = battleState; }, [battleState]);

  // Auto-dismiss toast
  useEffect(() => {
    if (!achToast) return;
    const t = setTimeout(() => setAchToast(null), 4000);
    return () => clearTimeout(t);
  }, [achToast]);

  // Popups
  const [offlinePopup, setOfflinePopup] = useState(null);
  const [loginRewardPopup, setLoginRewardPopup] = useState(null);

  const battleRef = useRef(null);
  const addGold = useCallback((n) => { setGold(g => g + n); if (n > 0) setCombatStats(s => ({ ...s, totalGoldEarned: (s.totalGoldEarned || 0) + n })); }, []);

  // ─── DERIVED STATS ───
  const baseAtk = Math.floor(growth.atk * 4 * (1 + growth.atk * 0.008));
  const baseHp = 80 + Math.floor(growth.hp * 20 * (1 + growth.hp * 0.006));
  const baseDef = Math.floor(growth.def * 2 * (1 + growth.def * 0.005));

  const equipBonus = useMemo(() => {
    const b = { atk: 0, def: 0, hp: 0, critRate: 0, critDmg: 0, pen: 0, acu: 0, spd: 0 };
    Object.values(equipped).forEach(id => {
      if (!id) return;
      const eq = equipment.find(e => e.id === id) || accessories.find(e => e.id === id);
      if (!eq) return;
      Object.entries(eq.stats).forEach(([k, v]) => { b[k] = (b[k] || 0) + v; });
    });
    return b;
  }, [equipped, equipment, accessories]);

  const petBonus = useMemo(() => {
    const b = { atkPct: 0, defPct: 0, hpPct: 0, goldPct: 0, xpPct: 0, critRate: 0, critDmg: 0 };
    activePets.forEach(pn => { const pd = PET_DEFS.find(p => p.name === pn); if (!pd) return;
      const pLvl = petLevels[pn] || 1; Object.entries(pd.bonus).forEach(([k, v]) => { b[k] = (b[k] || 0) + Math.floor(v * (1 + (pLvl - 1) * 0.5)); }); });
    return b;
  }, [activePets, petLevels]);

  // Costume bonuses (active costume + set bonuses)
  const costumeBonus = useMemo(() => {
    const b = { atkFlat: 0, defFlat: 0, hpFlat: 0, atkPct: 0, defPct: 0, hpPct: 0, critRate: 0, critDmg: 0, goldPct: 0 };
    // Active costume bonus
    const active = COSTUMES.find(c => c.id === activeCostume);
    if (active) Object.entries(active.bonuses).forEach(([k, v]) => { b[k] = (b[k] || 0) + v; });
    // Set bonuses from owned costumes
    COSTUME_SET_BONUSES.forEach(sb => {
      const count = ownedCostumes.filter(cid => { const c = COSTUMES.find(x => x.id === cid); return c && c.rarity === sb.rarity; }).length;
      if (count >= sb.need) Object.entries(sb.bonus).forEach(([k, v]) => { b[k] = (b[k] || 0) + v; });
    });
    return b;
  }, [activeCostume, ownedCostumes]);

  // Relic bonuses
  const relicBonus = useMemo(() => {
    const b = { atk: 0, def: 0, hp: 0, critRate: 0, critDmg: 0, goldPct: 0, atkPct: 0, defPct: 0, hpPct: 0 };
    Object.entries(ownedRelics).forEach(([rid, lvl]) => {
      const r = RELICS.find(x => x.id === rid);
      if (!r || lvl === undefined) return;
      const val = r.baseVal + (lvl - 1) * r.perLvl;
      if (r.baseStat === "allPct") { b.atkPct += val; b.defPct += val; b.hpPct += val; }
      else if (r.baseStat === "allFlat") { b.atk += val; b.def += Math.floor(val * 0.7); b.hp += val * 5; }
      else { b[r.baseStat] = (b[r.baseStat] || 0) + val; }
    });
    return b;
  }, [ownedRelics]);

  // Insignia bonuses
  const insigniaBonus = useMemo(() => {
    const b = { atkFlat: 0, defFlat: 0, hpFlat: 0, atkPct: 0, defPct: 0, hpPct: 0, critRate: 0, critDmg: 0, goldPct: 0 };
    Object.keys(earnedInsignias).forEach(iid => {
      const ins = INSIGNIAS.find(x => x.id === iid);
      if (!ins) return;
      Object.entries(ins.bonus).forEach(([k, v]) => { b[k] = (b[k] || 0) + v; });
    });
    return b;
  }, [earnedInsignias]);

  // Title bonus (active title only)
  const titleBonus = useMemo(() => {
    const b = { atkFlat: 0, defFlat: 0, hpFlat: 0, atkPct: 0, defPct: 0, hpPct: 0, critRate: 0, critDmg: 0, goldPct: 0 };
    const t = TITLES.find(x => x.id === activeTitle);
    if (t) Object.entries(t.bonus).forEach(([k, v]) => { b[k] = (b[k] || 0) + v; });
    return b;
  }, [activeTitle]);

  // Emblem bonus (up to 3 equipped)
  const emblemBonus = useMemo(() => {
    const b = { atkFlat: 0, defFlat: 0, hpFlat: 0, atkPct: 0, defPct: 0, hpPct: 0, critRate: 0, critDmg: 0, goldPct: 0 };
    equippedEmblems.forEach(eid => {
      if (!eid) return;
      const emb = EMBLEMS.find(e => e.id === eid);
      if (!emb) return;
      Object.entries(emb.bonus).forEach(([k, v]) => { b[k] = (b[k] || 0) + v; });
    });
    return b;
  }, [equippedEmblems]);

  // Passive skill bonuses
  const passiveBonus = useMemo(() => {
    const b = { atkPct: 0, defPct: 0, hpPct: 0, critRate: 0, critDmg: 0, goldPct: 0 };
    Object.entries(passiveSkillLevels).forEach(([pid, lvl]) => {
      const ps = PASSIVE_SKILLS.find(p => p.id === pid);
      if (!ps || lvl <= 0) return;
      b[ps.stat] = (b[ps.stat] || 0) + ps.baseVal + (lvl - 1) * ps.perLvl;
    });
    return b;
  }, [passiveSkillLevels]);

  // Equipment enhance bonus (adds % to each stat per level)
  const enhanceBonus = useMemo(() => {
    const b = { atk: 0, def: 0, hp: 0, critRate: 0, critDmg: 0 };
    Object.values(equipped).forEach(id => {
      if (!id) return;
      const eq = equipment.find(e => e.id === id) || accessories.find(e => e.id === id);
      if (!eq || !eq.level) return;
      const mult = eq.level * 0.08;
      Object.entries(eq.stats).forEach(([k, v]) => { if (b[k] !== undefined) b[k] = (b[k] || 0) + Math.floor(v * mult); });
    });
    return b;
  }, [equipped, equipment, accessories]);

  // Prestige multiplier: each soul gives +2% to all stats
  const prestigeMult = 1 + prestigeSouls * 0.02;

  // Resonance bonus: +2% all stats per level + milestones
  const resonanceBonus = useMemo(() => {
    const b = { atkPct: 0, defPct: 0, hpPct: 0, critRate: 0, critDmg: 0, goldPct: 0 };
    const basePct = resonanceLevel * 2;
    b.atkPct += basePct; b.defPct += basePct; b.hpPct += basePct;
    // Milestone bonuses
    for (const m of RESONANCE_MILESTONES) {
      if (resonanceLevel < m.level) break;
      if (m.effect === "allPct5") { b.atkPct += 5; b.defPct += 5; b.hpPct += 5; }
      if (m.effect === "allPct15") { b.atkPct += 15; b.defPct += 15; b.hpPct += 15; }
      if (m.effect === "allPct20") { b.atkPct += 20; b.defPct += 20; b.hpPct += 20; }
      if (m.effect === "gold10") b.goldPct += 10;
      if (m.effect === "critDmg25") b.critDmg += 25;
    }
    return b;
  }, [resonanceLevel]);

  // Figure bonuses (owned figures + set bonuses)
  const figureBonus = useMemo(() => {
    const b = { atkFlat: 0, defFlat: 0, hpFlat: 0, atkPct: 0, defPct: 0, hpPct: 0, critRate: 0, critDmg: 0, goldPct: 0 };
    const ownedCount = Object.keys(ownedFigures).length;
    // Individual bonuses
    Object.keys(ownedFigures).forEach(fid => {
      const fig = FIGURES.find(f => f.id === fid);
      if (fig) Object.entries(fig.bonus).forEach(([k, v]) => { b[k] = (b[k] || 0) + v; });
    });
    // Set bonuses
    FIGURE_SET_BONUSES.forEach(sb => {
      if (ownedCount >= sb.count) Object.entries(sb.bonus).forEach(([k, v]) => { b[k] = (b[k] || 0) + v; });
    });
    return b;
  }, [ownedFigures]);

  // Gem socketed bonuses
  const gemBonus = useMemo(() => {
    const b = { atkFlat: 0, defFlat: 0, hpFlat: 0, critRate: 0, critDmg: 0, atkPct: 0 };
    Object.values(socketedGems).flat().forEach(gid => {
      const g = gems.find(x => x.id === gid);
      if (g) b[g.stat] = (b[g.stat] || 0) + g.value;
    });
    return b;
  }, [socketedGems, gems]);


  // Equipment set bonus calculation
  const setBonus = useMemo(() => {
    const b = { atkPct: 0, defPct: 0, hpPct: 0, critRate: 0, critDmg: 0 };
    const equippedTypes = Object.entries(equipped).filter(([, v]) => v).map(([k]) => k);
    EQUIP_SETS.forEach(set => {
      const matched = set.pieces.filter(p => equippedTypes.includes(p)).length;
      const apply = (bonus) => { Object.entries(bonus).forEach(([k, v]) => { b[k] = (b[k] || 0) + v; }); };
      if (matched >= 5 && set.bonus5) apply(set.bonus5);
      else if (matched >= 3 && set.bonus3) apply(set.bonus3);
      else if (matched >= 2 && set.bonus2) apply(set.bonus2);
    });
    return b;
  }, [equipped]);

  // Weapon evolution bonus
  const wEvo = WEAPON_EVOLUTIONS[weaponEvo - 1] || WEAPON_EVOLUTIONS[0];

  const totalAtk = Math.floor((baseAtk + equipBonus.atk + enhanceBonus.atk + (costumeBonus.atkFlat || 0) + (relicBonus.atk || 0) + (insigniaBonus.atkFlat || 0) + (titleBonus.atkFlat || 0) + (emblemBonus.atkFlat || 0) + (figureBonus.atkFlat || 0) + (gemBonus.atkFlat || 0) + wEvo.atkBonus + (dojoStats.atk || 0)) * (1 + ((petBonus.atkPct || 0) + (costumeBonus.atkPct || 0) + (relicBonus.atkPct || 0) + (insigniaBonus.atkPct || 0) + (passiveBonus.atkPct || 0) + (titleBonus.atkPct || 0) + (emblemBonus.atkPct || 0) + (resonanceBonus.atkPct || 0) + (figureBonus.atkPct || 0) + (gemBonus.atkPct || 0) + (setBonus.atkPct || 0)) / 100) * prestigeMult);
  const totalDef = Math.floor((baseDef + equipBonus.def + enhanceBonus.def + (costumeBonus.defFlat || 0) + (relicBonus.def || 0) + (insigniaBonus.defFlat || 0) + (titleBonus.defFlat || 0) + (emblemBonus.defFlat || 0) + (figureBonus.defFlat || 0) + (gemBonus.defFlat || 0) + (dojoStats.def || 0)) * (1 + ((petBonus.defPct || 0) + (costumeBonus.defPct || 0) + (relicBonus.defPct || 0) + (insigniaBonus.defPct || 0) + (passiveBonus.defPct || 0) + (titleBonus.defPct || 0) + (emblemBonus.defPct || 0) + (resonanceBonus.defPct || 0) + (figureBonus.defPct || 0) + (setBonus.defPct || 0)) / 100) * prestigeMult);
  const totalMaxHp = Math.floor((baseHp + equipBonus.hp + enhanceBonus.hp + (costumeBonus.hpFlat || 0) + (relicBonus.hp || 0) + (insigniaBonus.hpFlat || 0) + (titleBonus.hpFlat || 0) + (emblemBonus.hpFlat || 0) + (figureBonus.hpFlat || 0) + (gemBonus.hpFlat || 0) + (dojoStats.hp || 0)) * (1 + ((petBonus.hpPct || 0) + (costumeBonus.hpPct || 0) + (relicBonus.hpPct || 0) + (insigniaBonus.hpPct || 0) + (passiveBonus.hpPct || 0) + (titleBonus.hpPct || 0) + (emblemBonus.hpPct || 0) + (resonanceBonus.hpPct || 0) + (figureBonus.hpPct || 0) + (setBonus.hpPct || 0)) / 100) * prestigeMult);
  const critRate = Math.min(80, (equipBonus.critRate || 0) + enhanceBonus.critRate + (petBonus.critRate || 0) + (costumeBonus.critRate || 0) + (relicBonus.critRate || 0) + (insigniaBonus.critRate || 0) + (passiveBonus.critRate || 0) + (titleBonus.critRate || 0) + (emblemBonus.critRate || 0) + (resonanceBonus.critRate || 0) + (figureBonus.critRate || 0) + (gemBonus.critRate || 0) + (setBonus.critRate || 0) + (dojoStats.critRate || 0));
  const critDmg = 150 + (equipBonus.critDmg || 0) + enhanceBonus.critDmg + (petBonus.critDmg || 0) + (costumeBonus.critDmg || 0) + (relicBonus.critDmg || 0) + (insigniaBonus.critDmg || 0) + (passiveBonus.critDmg || 0) + (titleBonus.critDmg || 0) + (emblemBonus.critDmg || 0) + (resonanceBonus.critDmg || 0) + (figureBonus.critDmg || 0) + (gemBonus.critDmg || 0) + (setBonus.critDmg || 0);
  const goldMult = 1 + ((petBonus.goldPct || 0) + (costumeBonus.goldPct || 0) + (relicBonus.goldPct || 0) + (insigniaBonus.goldPct || 0) + (passiveBonus.goldPct || 0) + (titleBonus.goldPct || 0) + (emblemBonus.goldPct || 0) + (resonanceBonus.goldPct || 0) + (figureBonus.goldPct || 0)) / 100;

  // Tap-to-attack handler
  const handleTapAttack = useCallback(() => {
    if (!isBattling) return;
    const bs = battleStateRef.current;
    if (!bs) return;
    const alive = bs.enemies.filter(e => e.hp > 0 && e.anim !== "die");
    if (alive.length === 0) return;
    const target = alive[0];
    const tapDmg = Math.max(1, Math.floor(totalAtk * 0.3) + Math.floor(Math.random() * 4));
    const wasCrit = Math.random() * 100 < critRate;
    const finalDmg = wasCrit ? Math.floor(tapDmg * critDmg / 100) : tapDmg;
    setBattleState(prev => {
      if (!prev) return prev;
      return { ...prev, enemies: prev.enemies.map(e => e.id === target.id ? { ...e, hp: e.hp - finalDmg, anim: "hit" } : e) };
    });
    setTimeout(() => setBattleState(p => {
      if (!p) return p;
      return { ...p, enemies: p.enemies.map(e => e.id === target.id && e.anim === "hit" ? { ...e, anim: "idle" } : e) };
    }), 200);
    triggerHeroAttack();
    addDmgNumber(finalDmg, "right", wasCrit, "👊");
    incrementCombo();
    if (wasCrit) { triggerFlash(T.warning); triggerShake(); }
  }, [isBattling, totalAtk, critRate, critDmg, triggerHeroAttack, addDmgNumber, incrementCombo, triggerFlash, triggerShake]);

  // ─── WEAPON EVOLUTION ───
  const evolveWeapon = useCallback(() => {
    const nextTier = weaponEvo + 1;
    if (nextTier > WEAPON_EVOLUTIONS.length) return;
    const next = WEAPON_EVOLUTIONS[nextTier - 1];
    if (gold < next.cost) return;
    setGold(g => g - next.cost);
    setWeaponEvo(nextTier);
  }, [weaponEvo, gold]);

  // ─── DOJO TRAINING ───
  const startDojoTraining = useCallback((slotId) => {
    const slot = DOJO_SLOTS.find(s => s.id === slotId);
    if (!slot || dojoTraining[slotId]) return;
    setDojoTraining(prev => ({ ...prev, [slotId]: { startTime: Date.now(), stat: slot.stat, rate: slot.baseRate } }));
  }, [dojoTraining]);

  const collectDojoTraining = useCallback((slotId) => {
    const training = dojoTraining[slotId];
    if (!training) return;
    const elapsed = Math.floor((Date.now() - training.startTime) / 1000);
    const hours = elapsed / 3600;
    const gain = Math.floor(training.rate * hours * 10) / 10;
    if (gain > 0) {
      setDojoStats(prev => ({ ...prev, [training.stat]: (prev[training.stat] || 0) + gain }));
    }
    setDojoTraining(prev => { const n = { ...prev }; delete n[slotId]; return n; });
  }, [dojoTraining]);

// Tower of Trials - fight one floor
  const attemptTowerFloor = useCallback(() => {
    const floor = towerFloor;
    const enemy = towerEnemy(floor);
    const playerDps = Math.max(1, totalAtk - enemy.def * 0.3);
    const enemyDps = Math.max(1, enemy.atk - totalDef * 0.3);
    const timeToKill = enemy.hp / playerDps;
    const timeToDie = totalMaxHp / enemyDps;
    const success = timeToKill < timeToDie;
    if (success) {
      const newFloor = floor + 1;
      setTowerFloor(newFloor);
      if (newFloor > towerBestFloor) setTowerBestFloor(newFloor);
      const reward = TOWER_REWARDS.find(r => r.floor === newFloor);
      if (reward) {
        if (reward.reward.gold) setGold(g => g + reward.reward.gold);
        if (reward.reward.diamonds) setDiamonds(d => d + reward.reward.diamonds);
        if (reward.reward.souls) setPrestigeSouls(s => s + reward.reward.souls);
      }
      setTowerResult({ success: true, floor: newFloor, enemy, reward: reward?.reward });
      addLog("Tower Floor " + newFloor + " cleared!");
    } else {
      setTowerResult({ success: false, floor, enemy, hpPct: Math.floor((timeToKill / timeToDie) * 100) });
    }
  }, [towerFloor, towerBestFloor, totalAtk, totalDef, totalMaxHp, addLog]);

  // Daily Wheel Spin
  const doDailySpin = useCallback(() => {
    const today = new Date().toISOString().slice(0, 10);
    if (lastSpinDay === today || isSpinning) return;
    setIsSpinning(true);
    const totalWeight = SPIN_PRIZES.reduce((s, p) => s + p.weight, 0);
    let roll = Math.random() * totalWeight, cum = 0, idx = 0;
    for (let i = 0; i < SPIN_PRIZES.length; i++) { cum += SPIN_PRIZES[i].weight; if (roll < cum) { idx = i; break; } }
    const prize = SPIN_PRIZES[idx];
    setTimeout(() => {
      if (prize.reward.gold) setGold(g => g + prize.reward.gold);
      if (prize.reward.diamonds) setDiamonds(d => d + prize.reward.diamonds);
      if (prize.reward.marks) setEmblemMarks(m => m + prize.reward.marks);
      if (prize.reward.souls) setPrestigeSouls(s => s + prize.reward.souls);
      setLastSpinDay(today);
      setSpinResult(prize);
      setIsSpinning(false);
    }, 1500);
  }, [lastSpinDay, isSpinning]);

  // Boss Rush
  const doBossRush = useCallback(() => {
    let bossesKilled = 0, playerHpRem = totalMaxHp;
    for (const boss of BOSS_RUSH_BOSSES) {
      const bHp = Math.floor(500 * boss.hpMult * (1 + highestStage * 0.5));
      const bAtk = Math.floor(20 * boss.atkMult * (1 + highestStage * 0.3));
      const bDef = Math.floor(10 * boss.defMult * (1 + highestStage * 0.2));
      const dps = Math.max(1, totalAtk - bDef * 0.3);
      const eDps = Math.max(1, bAtk - totalDef * 0.3);
      const timeToKill = bHp / dps;
      playerHpRem -= eDps * timeToKill;
      if (playerHpRem <= 0) break;
      bossesKilled++;
    }
    const goldReward = Math.floor(bossesKilled * 2000 * (1 + highestStage * 0.1));
    const diamondReward = bossesKilled * 15;
    const soulReward = bossesKilled >= 5 ? bossesKilled * 2 : 0;
    setGold(g => g + goldReward);
    setDiamonds(d => d + diamondReward);
    if (soulReward > 0) setPrestigeSouls(s => s + soulReward);
    if (bossesKilled > bossRushBest) setBossRushBest(bossesKilled);
    setCombatStats(s => ({ ...s, bossesKilled: s.bossesKilled + bossesKilled }));
    setBossRushResult({ bossesKilled, total: BOSS_RUSH_BOSSES.length, goldReward, diamondReward, soulReward });
  }, [totalAtk, totalDef, totalMaxHp, highestStage, bossRushBest]);

    const maxHpRef = useRef(totalMaxHp);
  useEffect(() => { maxHpRef.current = totalMaxHp; }, [totalMaxHp]);

  // ─── OFFLINE EARNINGS (runs once on mount) ───
  useEffect(() => {
    const lastTime = sv.lastActiveTime || Date.now();
    const elapsed = Math.floor((Date.now() - lastTime) / 1000);
    if (elapsed < 60) return; // less than 1 minute, skip

    const cappedSeconds = Math.min(elapsed, OFFLINE_MAX_HOURS * 3600);
    const stageBonus = (sv.highestStage || 1) * OFFLINE_STAGE_MULT;
    const goldPerSec = OFFLINE_GOLD_PER_SEC + stageBonus;
    const earnedGold = Math.floor(goldPerSec * cappedSeconds);
    const earnedKills = Math.floor(cappedSeconds / 3); // ~1 kill per 3 seconds

    if (earnedGold > 0) {
      setGold(g => g + earnedGold);
      setCombatStats(s => ({
        ...s,
        kills: s.kills + earnedKills,
        totalGoldEarned: (s.totalGoldEarned || 0) + earnedGold,
      }));
      setOfflinePopup({
        duration: formatDuration(cappedSeconds),
        gold: earnedGold,
        kills: earnedKills,
        capped: elapsed > OFFLINE_MAX_HOURS * 3600,
      });
    }
  }, []); // only on mount

  // ─── DAILY LOGIN REWARDS (runs once on mount) ───
  useEffect(() => {
    const today = new Date().toDateString();
    if (stats.lastLoginDay === today) return;
    const yesterday = new Date(Date.now() - 86400000).toDateString();
    const streak = stats.lastLoginDay === yesterday ? (stats.loginStreak || 0) + 1 : 1;
    const dayIdx = (streak - 1) % 7;
    const reward = LOGIN_REWARDS[dayIdx];

    setGold(g => g + reward.gold);
    setDiamonds(d => d + (reward.diamonds || 0));
    setStats(s => ({ ...s, loginStreak: streak, lastLoginDay: today }));
    setLoginRewardPopup({ ...reward, streak, dayIdx: dayIdx + 1 });
  }, []);

  // ─── SAVE SYSTEM ───
  const buildSave = useCallback(() => ({
    currentStage, highestStage, growth, gold, diamonds, combatStats, stats, autoProgress, farmStage,
    equipment, equipped, pets, activePets, petSlots, unlockedSkills, equippedSkills,
    accessories, raidAttempts,
    activeTitle, earnedTitles, shopPurchases,
    ownedCostumes, activeCostume, achievementsUnlocked, dungeonAttempts, questProgress,
    ownedRelics, earnedInsignias,
    prestigeCount, prestigeSouls, skillLevels, passiveSkillLevels,
    skillBarPresets, activeSkillBar, resonanceLevel, resonanceXp, ownedFigures,
    towerFloor, towerBestFloor, lastSpinDay, bossRushBest,
    autoDismantle, lockedEquipment, petLevels, battlePassXp, battlePassLevel, battlePassClaimed, battlePassPremium,
    tutorialDone: tutorialStep === -1,
    bestiary, gems, socketedGems,
    weaponEvo, dojoTraining, dojoStats, challengesCompleted,
    player: { hp: playerHp, maxHp: totalMaxHp },
    isPremium: false, storePurchases: {},
    lastActiveTime: Date.now(),
  }), [currentStage, highestStage, growth, gold, diamonds, combatStats, stats, autoProgress, equipment, equipped, pets, activePets, petSlots, unlockedSkills, equippedSkills, ownedCostumes, activeCostume, achievementsUnlocked, playerHp, totalMaxHp, questProgress, dungeonAttempts, ownedRelics, earnedInsignias, prestigeCount, prestigeSouls, skillLevels, passiveSkillLevels]);

  useEffect(() => {
    const timer = setInterval(async () => {
      try { await window.storage.set(`save:${account.uid}`, JSON.stringify(buildSave())); } catch {}
    }, 15000);
    return () => clearInterval(timer);
  }, [account.uid, buildSave]);

  useEffect(() => { return () => { try { window.storage.set(`save:${account.uid}`, JSON.stringify(buildSave())); } catch {} }; }, [account.uid, buildSave]);

  // Time tracker
  useEffect(() => { const t = setInterval(() => setStats(s => ({ ...s, timePlayed: (s.timePlayed || 0) + 1 })), 1000); return () => clearInterval(t); }, []);

  // Passive diamond drip — 1 diamond every 60s of active play
  useEffect(() => { const t = setInterval(() => setDiamonds(d => d + 1), 60000); return () => clearInterval(t); }, []);

  // ─── ACHIEVEMENT CHECKER ───
  const achCheckRef = useRef(null);
  useEffect(() => {
    if (achCheckRef.current) clearInterval(achCheckRef.current);
    achCheckRef.current = setInterval(() => {
      const snapshot = {
        combatStats, highestStage, growth, stats, 
        equipCount: equipment.length, petCount: pets.length,
        costumeCount: ownedCostumes.length,
      };
      setAchievementsUnlocked(prev => {
        let updated = false;
        const next = { ...prev };
        for (const ach of ACHIEVEMENTS) {
          if (next[ach.id]) continue;
          try {
            if (ach.check(snapshot)) {
              next[ach.id] = Date.now();
              updated = true;
              // Award rewards
              if (ach.reward.gold) setGold(g => g + ach.reward.gold);
              if (ach.reward.diamonds) setDiamonds(d => d + ach.reward.diamonds);
              // Show toast
              setAchToast({ ...ach, ts: Date.now() });
              addLog(`🏆 Achievement: ${ach.icon} ${ach.name}! ${ach.reward.gold ? `+${fmt(ach.reward.gold)}g` : ""} ${ach.reward.diamonds ? `+${ach.reward.diamonds}💎` : ""}`);
            }
          } catch {}
        }
        return updated ? next : prev;
      });
    }, 2000);
    return () => { if (achCheckRef.current) clearInterval(achCheckRef.current); };
  }, [combatStats, highestStage, growth, stats, equipment.length, pets.length, ownedCostumes.length, addLog]);

  // Insignia auto-checker
  useEffect(() => {
    const check = setInterval(() => {
      const snapshot = {
        combatStats, highestStage, growth, stats,
        equipCount: equipment.length, petCount: pets.length,
      };
      setEarnedInsignias(prev => {
        let updated = false;
        const next = { ...prev };
        for (const ins of INSIGNIAS) {
          if (next[ins.id]) continue;
          try {
            if (ins.check(snapshot)) {
              next[ins.id] = Date.now();
              updated = true;
              setAchToast({ name: ins.name, icon: ins.emoji, color: ins.color, ts: Date.now() });
              addLog(`🎖️ Insignia: ${ins.emoji} ${ins.name} earned!`);
            }
          } catch {}
        }
        return updated ? next : prev;
      });
    }, 3000);
    return () => clearInterval(check);
  }, [combatStats, highestStage, growth, stats, equipment.length, pets.length, addLog]);

  // Title auto-checker
  useEffect(() => {
    const check = setInterval(() => {
      const snapshot = { combatStats, highestStage, growth, stats, equipCount: equipment.length, prestigeCount };
      setEarnedTitles(prev => {
        let updated = false;
        const next = { ...prev };
        for (const t of TITLES) {
          if (next[t.id]) continue;
          try { if (t.check(snapshot)) { next[t.id] = true; updated = true; addLog(`🏷️ Title unlocked: "${t.name}"`); } } catch {}
        }
        return updated ? next : prev;
      });
    }, 4000);
    return () => clearInterval(check);
  }, [combatStats, highestStage, growth, stats, equipment.length, prestigeCount, addLog]);

  // Shop purchase
  const buyShopItem = useCallback((itemId) => {
    const item = SHOP_ITEMS.find(x => x.id === itemId);
    if (!item) return;
    const today = new Date().toISOString().slice(0, 10);
    const purchase = shopPurchases[itemId];
    if (item.daily && purchase && purchase.date === today) return; // daily limit

    if (item.costType === "diamonds" && diamonds < item.cost) return;
    if (item.costType === "gold" && gold < item.cost) return;

    // Pay
    if (item.costType === "diamonds") setDiamonds(d => d - item.cost);
    if (item.costType === "gold") setGold(g => g - item.cost);

    // Reward
    if (item.reward.gold) setGold(g => g + item.reward.gold);
    if (item.reward.diamonds) setDiamonds(d => d + item.reward.diamonds);
    if (item.reward.souls) setPrestigeSouls(s => s + item.reward.souls);
    if (item.reward.skillReset) {
      // Refund gold from skill levels
      let refund = 0;
      Object.entries(skillLevels).forEach(([, lvl]) => { for (let i = 0; i < lvl; i++) refund += skillUpgradeCost(i); });
      Object.entries(passiveSkillLevels).forEach(([, lvl]) => { for (let i = 0; i < lvl; i++) refund += passiveSkillCost(i); });
      setGold(g => g + refund);
      setSkillLevels({});
      setPassiveSkillLevels({});
      addLog(`🔄 Skills reset! Refunded ${fmt(refund)} gold`);
    }

    setShopPurchases(prev => ({ ...prev, [itemId]: { date: today, count: ((purchase?.count) || 0) + 1 } }));
  }, [diamonds, gold, shopPurchases, skillLevels, passiveSkillLevels, addLog]);

  // ─── EMBLEMS ───
  const unlockEmblem = useCallback((emblemId) => {
    const emb = EMBLEMS.find(e => e.id === emblemId);
    if (!emb || unlockedEmblems[emblemId] || emblemMarks < emb.marks) return;
    setEmblemMarks(m => m - emb.marks);
    setUnlockedEmblems(prev => ({ ...prev, [emblemId]: true }));
    addLog(`🏅 Emblem unlocked: ${emb.emoji} ${emb.name}!`);
  }, [emblemMarks, unlockedEmblems, addLog]);

  const equipEmblem = useCallback((emblemId, slot) => {
    if (!unlockedEmblems[emblemId]) return;
    setEquippedEmblems(prev => {
      const next = [...prev];
      // Remove if already equipped in another slot
      const existIdx = next.indexOf(emblemId);
      if (existIdx !== -1) next[existIdx] = null;
      next[slot] = emblemId;
      return next;
    });
  }, [unlockedEmblems]);

  const unequipEmblem = useCallback((slot) => {
    setEquippedEmblems(prev => { const next = [...prev]; next[slot] = null; return next; });
  }, []);

  // ─── GROWTH UPGRADES ───
  const upgradeGrowth = useCallback((stat) => { const cost = growthCost(growth[stat]); if (gold < cost) return; setGold(g => g - cost); setGrowth(g => ({ ...g, [stat]: g[stat] + 1 })); addQuestProgress("upgradesDone", 1); }, [growth, gold, addQuestProgress]);
  const upgradeGrowthMax = useCallback((stat) => {
    let rem = gold, lvl = growth[stat], spent = 0, count = 0;
    while (rem >= growthCost(lvl)) { const c = growthCost(lvl); rem -= c; spent += c; lvl++; count++; }
    if (lvl > growth[stat]) { setGold(g => g - spent); setGrowth(g => ({ ...g, [stat]: lvl })); addQuestProgress("upgradesDone", count); }
  }, [growth, gold, addQuestProgress]);

  // ─── BATTLE SYSTEM (multi-enemy like Blade Idle) ───
  const enemyIdRef = useRef(0);

  const spawnEnemy = useCallback((monster, posIdx) => {
    return {
      id: ++enemyIdRef.current,
      hp: monster.hp, maxHp: monster.hp,
      atk: monster.atk, def: monster.def, gold: monster.gold,
      emoji: monster.emoji, sprite: monster.sprite, name: monster.name, isBoss: monster.isBoss,
      x: 72, y: 55,
      anim: "spawn",
      scale: monster.isBoss ? 1.3 : 1,
    };
  }, []);

  const startBattle = useCallback((stage) => {
    const monster = getStageMonster(stage);
    setPlayerHp(totalMaxHp);
    // Spawn initial enemies
    const count = 1;
    const enemies = [];
    for (let i = 0; i < count; i++) {
      enemies.push(spawnEnemy(monster, i));
    }
    setBattleState({
      enemies, killCount: 0, targetKills: monster.monstersToKill,
      stageGold: 0, monster, stageNum: stage, spawnIdx: count,
    });
    // Boss cinematic
    if (monster.isBoss) {
      setBossCinematic({ name: monster.name, emoji: monster.emoji, sprite: monster.sprite });
      setIsBattling(false);
      setTimeout(() => { setBossCinematic(null); setIsBattling(true); }, 2000);
    } else {
      setIsBattling(true);
    }
    setSkillCooldowns({});
  }, [totalMaxHp, spawnEnemy]);

  const stopBattle = useCallback(() => { if (battleRef.current) { clearInterval(battleRef.current); battleRef.current = null; } setIsBattling(false); setBattleState(null); }, []);

  useEffect(() => { if (!isBattling && !bossCinematic) startBattle(currentStage); }, [currentStage]);
  useEffect(() => { startBattle(currentStage); return () => { if (battleRef.current) clearInterval(battleRef.current); }; }, []);

  useEffect(() => {
    if (!isBattling || !battleState) return;
    const step = 100, baseAtkSpd = 1200, mSpd = 2500;
    const spdBonus = Math.min(0.5, (equipBonus.spd || 0) * 0.01); // SPD: each point = 1% faster, max 50%
    const atkSpd = Math.floor(baseAtkSpd * (1 - spdBonus));
    let pE = 0, mE = 0, hzE = 0;
    const skillCDs = {};

    battleRef.current = setInterval(() => {
      setBattleState(prev => {
        if (!prev) return prev;
        let { enemies, killCount, targetKills, stageGold, monster, stageNum, spawnIdx } = prev;
        let newEnemies = enemies.map(e => ({ ...e })); // shallow copy
        pE += step; mE += step; hzE += step;

        // ── STAGE HAZARD ──
        const chIdx = Math.min(Math.floor((stageNum - 1) / 50), STAGE_HAZARDS.length - 1);
        const hazard = STAGE_HAZARDS[chIdx];
        if (hazard && hzE >= hazard.interval) {
          hzE = 0;
          const hzDmg = Math.max(1, Math.floor(maxHpRef.current * hazard.dmgPct / 100));
          setPlayerHp(hp => Math.max(1, hp - hzDmg));
          addDmgNumber(hzDmg, "left", false, hazard.emoji);
          setHazardFlash(hazard.color);
          setTimeout(() => setHazardFlash(null), 300);
        }

        // ── COMPANION PET ATTACK ──
        if (pE % 3000 < step && activePets.length > 0) {
          const petDmg = Math.max(1, Math.floor(totalAtk * 0.15));
          const aliveForPet = newEnemies.filter(e => e.hp > 0 && e.anim !== "die");
          if (aliveForPet.length > 0) {
            aliveForPet[0].hp -= petDmg;
            addDmgNumber(petDmg, "right", false, "🐾");
          }
        }

        // Tick skill cooldowns
        equippedSkills.filter(Boolean).forEach(sid => {
          if (skillCDs[sid] > 0) skillCDs[sid] -= step;
        });

        // Find closest alive enemy
        const alive = newEnemies.filter(e => e.hp > 0 && e.anim !== "die");
        const target = alive.length > 0 ? alive[0] : null;

        if (pE >= atkSpd && target) {
          pE = 0;
          const penReduction = Math.min(0.8, (equipBonus.pen || 0) * 0.01); // PEN: each point ignores 1% DEF, max 80%
          let dmg = Math.max(1, totalAtk - Math.floor(target.def * (1 - penReduction)) + Math.floor(Math.random() * 4));
          const wasCrit = Math.random() * 100 < critRate;
          if (wasCrit) dmg = Math.floor(dmg * critDmg / 100);
          target.hp -= dmg;
          target.anim = "hit";
          setTimeout(() => setBattleState(p => {
            if (!p) return p;
            return { ...p, enemies: p.enemies.map(e => e.id === target.id && e.anim === "hit" ? { ...e, anim: "idle" } : e) };
          }), 400);
          setCombatStats(s => ({ ...s, totalDamage: s.totalDamage + dmg, highestHit: Math.max(s.highestHit || 0, dmg) }));
          triggerHeroAttack();
          addDmgNumber(dmg, "right", wasCrit);
          incrementCombo();
          if (wasCrit) { triggerFlash(T.warning); triggerShake(); }

          // Rage meter — fills on hit, unleashes ultimate at 100
          setRage(prev => {
            const gain = wasCrit ? 8 : 3;
            const next = Math.min(100, prev + gain);
            if (next >= 100) {
              // ULTIMATE ATTACK
              setTimeout(() => {
                const ultDmg = Math.floor(totalAtk * 5);
                setBattleState(p => {
                  if (!p) return p;
                  return { ...p, enemies: p.enemies.map(e => e.hp > 0 ? { ...e, hp: e.hp - ultDmg, anim: "hit" } : e) };
                });
                addDmgNumber(ultDmg, "right", true, "💥");
                triggerShake("heavy");
                triggerFlash("#ff4444");
                showAnnouncer("ULTIMATE!", "#ff4444");
                setRage(0);
              }, 100);
              return 0;
            }
            return next;
          });

          // Auto-cast skills on same or other targets
          equippedSkills.filter(Boolean).forEach(sid => {
            if ((skillCDs[sid] || 0) <= 0) {
              const sk = COMBAT_SKILLS.find(s => s.id === sid);
              if (sk) {
                // Skills can hit all alive enemies (AoE feel)
                const aoeTargets = alive.slice(0, sk.dmgMult > 2 ? 3 : 1);
                aoeTargets.forEach(t => {
                  const skLvl = skillLevels[sid] || 0;
                  const sDmg = Math.floor(totalAtk * (sk.dmgMult + skLvl * 0.15) / aoeTargets.length);
                  t.hp -= sDmg;
                  addDmgNumber(sDmg, "right", false, sk.emoji);
                });
                skillCDs[sid] = sk.cooldown;
                setSkillCooldowns(p => ({ ...p, [sid]: true }));
                setTimeout(() => setSkillCooldowns(p => ({ ...p, [sid]: false })), sk.cooldown);
                triggerFlash(sk.color);
                addLog(`${sk.emoji} ${sk.name}!`);
              }
            }
          });
        }

        // Monster attacks (random alive enemy attacks hero)
        if (mE >= mSpd && alive.length > 0) {
          mE = 0;
          const attacker = alive[Math.floor(Math.random() * alive.length)];
          const mDmg = Math.max(1, attacker.atk - totalDef + Math.floor(Math.random() * 3));
          triggerHeroHit();
          addDmgNumber(mDmg, "left", false);
          setPlayerHp(hp => {
            const newHp = hp - mDmg;
            if (newHp <= 0) {
              addLog(`💀 Defeated at stage ${stageLabel(stageNum)}!`);
              setCombatStats(s => ({ ...s, deaths: s.deaths + 1 }));
              setTimeout(() => { setPlayerHp(maxHpRef.current); startBattle(stageNum); }, 500);
              return maxHpRef.current;
            }
            return newHp;
          });
        }

        // Check for dead enemies
        newEnemies.forEach(e => {
          if (e.hp <= 0 && e.anim !== "die") {
            e.anim = "die";
            const effGold = Math.floor(e.gold * goldMult);
            stageGold += effGold;
            killCount++;
            addGold(effGold);
            addGoldPopup(effGold);
            addQuestProgress("kills", 1);
            addQuestProgress("goldEarned", effGold);
            setCombatStats(s => ({ ...s, kills: s.kills + 1, bossesKilled: s.bossesKilled + (e.isBoss ? 1 : 0) }));
            if (e.isBoss) { triggerShake("heavy"); showAnnouncer("BOSS DEFEATED!", T.gold); triggerFlash(T.gold); }

            // Resonance XP gain (more from bosses and higher stages)
            const resXpGain = Math.floor(1 + stageNum * 0.1 + (e.isBoss ? 10 : 0));
            setResonanceXp(prev => {
              let xp = prev + resXpGain;
              let lvl = resonanceLevel;
              while (xp >= resonanceXpNeeded(lvl)) {
                xp -= resonanceXpNeeded(lvl);
                lvl++;
              }
              if (lvl > resonanceLevel) setResonanceLevel(lvl);
              return xp;
            });

            // Bestiary tracking
            const bKey = e.emoji + "_" + e.name.replace(/\s/g, "_");
            setBestiary(prev => ({ ...prev, [bKey]: (prev[bKey] || 0) + 1 }));

            // Battle Pass XP
            addBpXp(e.isBoss ? 10 : 2);

            // Gem drop from bosses (15% chance)
            if (e.isBoss && Math.random() < 0.15) {
              const newGem = generateGem();
              setGems(prev => [...prev, newGem]);
              const gt = GEM_TYPES.find(t => t.id === newGem.type);
              const gTier = GEM_TIERS[newGem.tier - 1];
              addDmgNumber(0, "right", false, gt ? gt.emoji : "");
            }

            // Pet drop on boss
            if (e.isBoss && Math.random() < 0.08) {
              const available = PET_DEFS.filter(p => !pets.includes(p.name));
              if (available.length > 0) {
                const newPet = available[Math.floor(Math.random() * available.length)];
                setPets(pv => [...pv, newPet.name]);
                addLog(`🐾 Boss dropped: ${newPet.emoji} ${newPet.name}!`);
              }
            }

            // Spawn replacement after delay (or check stage clear)
            if (killCount >= targetKills) {
              // Stage cleared
              addLog(`✅ Stage ${stageLabel(stageNum)} cleared! +${fmt(stageGold)}g`);
              addQuestProgress("stagesCleared", 1);
              const next = stageNum + 1;
              if (stageNum >= highestStage) setHighestStage(next);
              COMBAT_SKILLS.forEach(sk => {
                if (sk.unlockStage === next && !unlockedSkills.includes(sk.id)) {
                  setUnlockedSkills(pv => [...pv, sk.id]);
                  addLog(`🎉 New skill: ${sk.emoji} ${sk.name}!`);
                }
              });
              if (autoProgress) {
                if (farmStage > 0 && farmStage <= highestStage) {
                  // Farm mode: repeat the farm stage
                  setCurrentStage(farmStage);
                  setTimeout(() => startBattle(farmStage), 400);
                } else {
                  setCurrentStage(next);
                  setTimeout(() => startBattle(next), 400);
                }
              }
              // Diamond bonus every 10 stages
              if (stageNum % 10 === 0) {
                const dReward = 10 + Math.floor(stageNum / 10) * 5;
                setDiamonds(d => d + dReward);
                addLog(`💎 +${dReward} diamonds!`);
              }
            } else {
              // Spawn new enemy after short delay
              const si = spawnIdx++;
              setTimeout(() => {
                setBattleState(p => {
                  if (!p) return p;
                  const m = p.monster;
                  const newEnemy = {
                    id: ++enemyIdRef.current,
                    hp: m.hp, maxHp: m.hp, atk: m.atk, def: m.def, gold: m.gold,
                    emoji: m.emoji, sprite: m.sprite, name: m.name, isBoss: false,
                    x: 72, y: 55,
                    anim: "spawn", scale: 1,
                  };
                  setTimeout(() => setBattleState(pp => {
                    if (!pp) return pp;
                    return { ...pp, enemies: pp.enemies.map(ee => ee.id === newEnemy.id ? { ...ee, anim: "idle" } : ee) };
                  }), 300);
                  return { ...p, enemies: [...p.enemies.filter(ee => ee.anim !== "die" || Date.now() - 500 > 0), newEnemy] };
                });
              }, 350);
            }
          }
        });

        // Clean up old dead enemies
        newEnemies = newEnemies.filter(e => e.anim !== "die" || e.hp > -9999);

        return { ...prev, enemies: newEnemies, killCount, stageGold, spawnIdx };
      });
    }, step);

    return () => { if (battleRef.current) clearInterval(battleRef.current); };
  }, [isBattling, battleState?.stageNum, totalAtk, totalDef, critRate, critDmg, goldMult, autoProgress, farmStage, highestStage, unlockedSkills, pets, equippedSkills, triggerHeroAttack, triggerHeroHit, triggerFlash, triggerShake, incrementCombo, showAnnouncer, addDmgNumber, addGoldPopup, addQuestProgress, skillLevels, resonanceLevel]);

  // Skills are now auto-cast in the battle loop — no manual activation needed

  // ─── EQUIPMENT ───
  const gachaLevel = getGachaLevel(stats.summons || 0);

  const summonEquipment = useCallback((count) => {
    const cost = count === 1 ? 100 : 900;
    if (diamonds < cost) return;
    setDiamonds(d => d - cost);
    const results = [];
    const types = EQUIP_TYPES.map(t => t.id);
    for (let i = 0; i < (count === 1 ? 1 : 10); i++) results.push(generateWithGachaBonus(types[Math.floor(Math.random() * types.length)], gachaLevel.bonus));
    // Auto-dismantle: sell items at or below threshold
    const kept = autoDismantle >= 0 ? results.filter(e => e.rarityIdx > autoDismantle) : results;
    const dismantled = results.length - kept.length;
    const dismantleGold = dismantled * 50;
    if (dismantleGold > 0) setGold(g => g + dismantleGold);
    setEquipment(prev => [...prev, ...kept]);
    setStats(s => ({ ...s, summons: (s.summons || 0) + results.length }));
    addQuestProgress("summonsDone", results.length);
    addBpXp(results.length * 5);
    setShowSummonResult(results);
  }, [diamonds, gachaLevel.bonus, autoDismantle]);

  const equipItem = useCallback((eqId) => {
    const item = equipment.find(e => e.id === eqId) || accessories.find(e => e.id === eqId);
    if (item) setEquipped(p => ({ ...p, [item.type]: eqId }));
  }, [equipment, accessories]);
  const unequipItem = useCallback((slot) => { setEquipped(p => ({ ...p, [slot]: null })); }, []);

  const toggleLock = useCallback((eqId) => {
    setLockedEquipment(prev => { const n = { ...prev }; if (n[eqId]) delete n[eqId]; else n[eqId] = true; return n; });
  }, []);

  const quickEquipBest = useCallback(() => {
    const ne = { ...equipped };
    [...EQUIP_TYPES, ...ACCESSORY_TYPES].forEach(slot => {
      const pool = [...equipment, ...accessories].filter(e => e.type === slot.id);
      if (pool.length === 0) return;
      const best = pool.sort((a, b) => {
        const av = Object.values(a.stats).reduce((s, v) => s + v, 0) * (1 + (a.level || 0) * 0.08);
        const bv = Object.values(b.stats).reduce((s, v) => s + v, 0) * (1 + (b.level || 0) * 0.08);
        return bv - av;
      })[0];
      if (best) ne[slot.id] = best.id;
    });
    setEquipped(ne);
  }, [equipped, equipment, accessories]);

  const levelUpPet = useCallback((petName) => {
    const count = pets.filter(p => p === petName).length;
    if (count < 2) return;
    setPets(prev => { const idx = prev.lastIndexOf(petName); return prev.filter((_, i) => i !== idx); });
    setPetLevels(prev => ({ ...prev, [petName]: (prev[petName] || 1) + 1 }));
  }, [pets]);

  // Accessory summon
  const summonAccessories = useCallback((count) => {
    const cost = count === 1 ? 150 : 1350;
    if (diamonds < cost) return;
    setDiamonds(d => d - cost);
    const results = [];
    const types = ACCESSORY_TYPES.map(t => t.id);
    for (let i = 0; i < (count === 1 ? 1 : 10); i++) results.push(generateWithGachaBonus(types[Math.floor(Math.random() * types.length)], gachaLevel.bonus));
    setAccessories(prev => [...prev, ...results]);
    setStats(s => ({ ...s, summons: (s.summons || 0) + results.length }));
    addQuestProgress("summonsDone", results.length);
    setShowSummonResult(results);
  }, [diamonds, gachaLevel.bonus]);

  // Raid boss fight
  const [raidResult, setRaidResult] = useState(null);
  const attemptRaid = useCallback((raidId) => {
    const raid = RAID_BOSSES.find(r => r.id === raidId);
    if (!raid || highestStage < raid.minStage) return;
    const today = new Date().toISOString().slice(0, 10);
    const att = raidAttempts[raidId];
    if (att && att.date === today && att.used >= 1) return; // 1 attempt per day per boss

    // Simulate timed fight
    const timeLimit = raid.timeLimit;
    const playerDps = Math.max(1, totalAtk - raid.def * 0.3);
    const totalDmg = playerDps * timeLimit;
    const success = totalDmg >= raid.hp;
    const hpPct = Math.min(100, (totalDmg / raid.hp) * 100);

    // Update attempts
    setRaidAttempts(prev => ({
      ...prev, [raidId]: { date: today, used: (att && att.date === today ? att.used : 0) + 1 },
    }));

    if (success) {
      if (raid.reward.gold) setGold(g => g + raid.reward.gold);
      if (raid.reward.diamonds) setDiamonds(d => d + raid.reward.diamonds);
      if (raid.reward.souls) setPrestigeSouls(s => s + raid.reward.souls);
      setCombatStats(s => ({ ...s, bossesKilled: s.bossesKilled + 1 }));
      addLog(`⚔️ Raid ${raid.name} defeated! +${raid.reward.diamonds}💎 +${raid.reward.souls}✦`);
    } else {
      addLog(`💀 Raid ${raid.name} failed (${Math.floor(hpPct)}% damage dealt)`);
    }
    setRaidResult({ raid, success, hpPct: Math.floor(hpPct), totalDmg: Math.floor(totalDmg) });
  }, [highestStage, totalAtk, raidAttempts, gold]);

  const mergeEquipment = useCallback((type, rarityId) => {
    const candidates = equipment.filter(e => e.type === type && e.rarity === rarityId && !Object.values(equipped).includes(e.id) && !lockedEquipment[e.id]);
    if (candidates.length < 5) return;
    const toRemove = candidates.slice(0, 5).map(e => e.id);
    const ri = RARITIES.findIndex(r => r.id === rarityId);
    if (ri >= RARITIES.length - 1) return;
    const newItem = generateEquipment(type);
    // Force to next rarity
    const nextR = RARITIES[ri + 1];
    const baseMult = [1, 2.5, 6, 15, 40, 100, 300][ri + 1];
    const td = EQUIP_TYPES.find(t => t.id === type);
    newItem.rarity = nextR.id; newItem.rarityIdx = ri + 1;
    newItem.name = EQUIP_NAMES[type][ri + 1];
    newItem.stats = {};
    if (td.stat === "atk") newItem.stats.atk = Math.floor(5 * baseMult * (0.9 + Math.random() * 0.2));
    if (td.stat === "def") newItem.stats.def = Math.floor(4 * baseMult * (0.9 + Math.random() * 0.2));
    if (td.stat === "hp") newItem.stats.hp = Math.floor(20 * baseMult * (0.9 + Math.random() * 0.2));
    if (td.stat === "critRate") newItem.stats.critRate = Math.min(80, Math.floor(2 + (ri + 1) * 3 + Math.random() * 3));
    if (td.stat === "critDmg") newItem.stats.critDmg = Math.floor(10 + (ri + 1) * 15 + Math.random() * 10);

    setEquipment(prev => [...prev.filter(e => !toRemove.includes(e.id)), newItem]);
    setStats(s => ({ ...s, merges: (s.merges || 0) + 1 }));
    addLog(`🔨 Merged 5× ${RARITIES[ri].name} ${type} → ${nextR.name}!`);
  }, [equipment, equipped, lockedEquipment, addLog]);

  // ─── COSTUMES ───
  const buyCostume = useCallback((costumeId) => {
    const c = COSTUMES.find(x => x.id === costumeId);
    if (!c || ownedCostumes.includes(costumeId) || diamonds < c.cost) return;
    setDiamonds(d => d - c.cost);
    setOwnedCostumes(prev => [...prev, costumeId]);
    addLog(`👗 Purchased costume: ${c.emoji} ${c.name}!`);
  }, [ownedCostumes, diamonds, addLog]);

  const equipCostume = useCallback((costumeId) => {
    if (!ownedCostumes.includes(costumeId)) return;
    setActiveCostume(costumeId);
  }, [ownedCostumes]);

  const heroEmoji = useMemo(() => {
    const c = COSTUMES.find(x => x.id === activeCostume);
    return c?.emoji || "⚔️";
  }, [activeCostume]);
  const heroSprite = "/sprites/hero/idle.png";

  // ─── DUNGEONS ───
  const getDungeonAttemptsLeft = useCallback((dungeonId) => {
    const today = new Date().toDateString();
    const att = dungeonAttempts[dungeonId];
    if (!att || att.date !== today) return DUNGEONS.find(d => d.id === dungeonId)?.maxAttempts || 0;
    return Math.max(0, (DUNGEONS.find(d => d.id === dungeonId)?.maxAttempts || 0) - att.used);
  }, [dungeonAttempts]);

  const runDungeon = useCallback((dungeonId, tierIdx) => {
    const dungeon = DUNGEONS.find(d => d.id === dungeonId);
    if (!dungeon) return;
    const attLeft = getDungeonAttemptsLeft(dungeonId);
    if (attLeft <= 0) return;
    const tier = dungeon.tiers[tierIdx];
    if (!tier || highestStage < tier.minStage) return;

    // Use attempt
    const today = new Date().toDateString();
    setDungeonAttempts(prev => {
      const curr = prev[dungeonId];
      const used = (curr && curr.date === today) ? curr.used + 1 : 1;
      return { ...prev, [dungeonId]: { date: today, used } };
    });

    // Simulate the dungeon run
    const result = simulateDungeon(dungeon, tierIdx, totalAtk, totalDef, totalMaxHp);

    // Award rewards
    if (result.totalReward.gold) addGold(result.totalReward.gold);
    if (result.totalReward.diamonds) setDiamonds(d => d + result.totalReward.diamonds);
    if (result.totalReward.growthLevels) {
      const lvls = result.totalReward.growthLevels;
      const perStat = Math.floor(lvls / 3);
      const remainder = lvls % 3;
      setGrowth(g => ({
        atk: g.atk + perStat + (remainder >= 1 ? 1 : 0),
        hp: g.hp + perStat + (remainder >= 2 ? 1 : 0),
        def: g.def + perStat,
      }));
    }
    if (result.totalReward.emblemMarks) setEmblemMarks(m => m + result.totalReward.emblemMarks);

    // Show result popup
    setDungeonResult({ ...result, dungeon, tierIdx });
    addQuestProgress("dungeonsRun", 1);
    addLog(`🏰 ${dungeon.name} (${tier.name}): ${result.success ? "CLEARED!" : `Failed at wave ${result.waves}/${result.totalWaves}`} ${result.totalReward.gold ? `+${fmt(result.totalReward.gold)}g` : ""} ${result.totalReward.diamonds ? `+${result.totalReward.diamonds}💎` : ""} ${result.totalReward.growthLevels ? `+${result.totalReward.growthLevels} growth levels` : ""}`);
  }, [getDungeonAttemptsLeft, highestStage, totalAtk, totalDef, totalMaxHp, addGold, addLog]);

  // ─── NAV ───
  const nav = (p) => { setPage(p); };
  const chapter = getChapter(currentStage);
  const timeMins = Math.floor((stats.timePlayed || 0) / 60);
  const timeStr = timeMins >= 60 ? `${Math.floor(timeMins / 60)}h ${timeMins % 60}m` : `${timeMins}m`;



  return (
    <div style={{ position: "relative", width: "100%", height: "100vh", maxWidth: isMobile ? 480 : "100%", margin: "0 auto", overflow: "hidden", fontFamily: FONT_BODY, background: "#0a0c14", color: T.text, display: isMobile ? "block" : "flex" }}>

      {/* ═══ DESKTOP SIDEBAR NAV ═══ */}
      {!isMobile && (
        <div style={{ width: 64, flexShrink: 0, display: "flex", flexDirection: "column", background: "linear-gradient(180deg, #12141e, #0a0c14)", borderRight: "1px solid #ffffff08", padding: "8px 0", overflowY: "auto" }}>
          <div style={{ textAlign: "center", marginBottom: 8, padding: "4px 0" }}>
            <div style={{ fontSize: 20 }}>⚔️</div>
            <div style={{ fontSize: 6, fontWeight: 900, color: T.accent, fontFamily: FONT_DISPLAY, letterSpacing: 1 }}>BLADE</div>
          </div>
          {[
            { icon: "🗡️", label: "Equip", p: "equipment" },
            { icon: "📜", label: "Quests", p: "quests" },
            { icon: "✨", label: "Summon", p: "summon" },
            { icon: "⭐", label: "Growth", p: "growth" },
            { icon: "🏰", label: "Dungeon", p: "dungeons" },
            { icon: "⚔️", label: "Raids", p: "raids" },
            { icon: "🐾", label: "Pets", p: "pets" },
            { icon: "🔄", label: "Rebirth", p: "prestige" },
            { icon: "🛒", label: "Shop", p: "shop" },
            { icon: "⚔️", label: "Evolve", p: "weaponevo" },
            { icon: "🥋", label: "Dojo", p: "dojo" },
            { icon: "🎯", label: "Chall.", p: "challenge" },
            { icon: "⋯", label: "More", p: "_more" },
          ].map(tab => {
            const act = page === tab.p;
            if (tab.p === "_more") return (
              <div key={tab.p} onClick={() => setShowMoreMenu(p => !p)} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 1, padding: "6px 0", cursor: "pointer", position: "relative", background: showMoreMenu ? `${T.accent}10` : "transparent" }}>
                <span style={{ fontSize: 16 }}>{tab.icon}</span>
                <span style={{ fontSize: 6, fontWeight: 700, color: T.textDim, fontFamily: FONT_DISPLAY }}>{tab.label}</span>
              </div>
            );
            return (
              <div key={tab.p} onClick={() => { nav(tab.p); setShowMoreMenu(false); }} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 1, padding: "6px 0", cursor: "pointer", position: "relative", background: act ? `${T.accent}10` : "transparent", borderLeft: act ? `2px solid ${T.accent}` : "2px solid transparent" }}>
                <span style={{ fontSize: 16 }}>{tab.icon}</span>
                <span style={{ fontSize: 6, fontWeight: 700, color: act ? T.accent : T.textDim, fontFamily: FONT_DISPLAY }}>{tab.label}</span>
              </div>
            );
          })}
          <div style={{ flex: 1 }} />
          <div onClick={() => nav("settings")} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 1, padding: "6px 0", cursor: "pointer" }}>
            <span style={{ fontSize: 16 }}>⚙️</span>
            <span style={{ fontSize: 6, fontWeight: 700, color: page === "settings" ? T.accent : T.textDim, fontFamily: FONT_DISPLAY }}>Settings</span>
          </div>
        </div>
      )}

      {/* ═══ POPUPS (z:999) ═══ */}
      {offlinePopup && (
        <Popup title="Welcome Back!" icon="🌙" color={T.gold} onClose={() => setOfflinePopup(null)}>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 12, color: T.textSec, marginBottom: 10 }}>Away for <span style={{ color: T.white, fontWeight: 700 }}>{offlinePopup.duration}</span>{offlinePopup.capped ? ` (max ${OFFLINE_MAX_HOURS}h)` : ""}</div>
            <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
              <div style={{ padding: "10px 18px", borderRadius: 10, background: `${T.gold}12`, border: `1px solid ${T.gold}25` }}>
                <div style={{ fontSize: 20, fontWeight: 900, color: T.gold, fontFamily: FONT_DISPLAY }}>{fmt(offlinePopup.gold)}</div>
                <div style={{ fontSize: 8, color: T.textDim, fontWeight: 700 }}>GOLD</div>
              </div>
              <div style={{ padding: "10px 18px", borderRadius: 10, background: `${T.danger}12`, border: `1px solid ${T.danger}25` }}>
                <div style={{ fontSize: 20, fontWeight: 900, color: T.danger, fontFamily: FONT_DISPLAY }}>{fmt(offlinePopup.kills)}</div>
                <div style={{ fontSize: 8, color: T.textDim, fontWeight: 700 }}>KILLS</div>
              </div>
            </div>
          </div>
        </Popup>
      )}
      {loginRewardPopup && !offlinePopup && (
        <Popup title="Daily Reward!" icon="🎁" color={T.accent} onClose={() => setLoginRewardPopup(null)}>
          <div style={{ textAlign: "center" }}>
            <Badge color={T.orange} style={{ fontSize: 11, padding: "3px 10px", marginBottom: 10 }}>🔥 Day {loginRewardPopup.dayIdx}</Badge>
            <div style={{ display: "flex", gap: 10, justifyContent: "center", marginTop: 8 }}>
              <div style={{ padding: "10px 18px", borderRadius: 10, background: `${T.gold}12`, border: `1px solid ${T.gold}25` }}>
                <div style={{ fontSize: 18, fontWeight: 900, color: T.gold, fontFamily: FONT_DISPLAY }}>+{fmt(loginRewardPopup.gold)}</div>
                <div style={{ fontSize: 8, color: T.textDim }}>GOLD</div>
              </div>
              {loginRewardPopup.diamonds > 0 && <div style={{ padding: "10px 18px", borderRadius: 10, background: `${T.purple}12`, border: `1px solid ${T.purple}25` }}>
                <div style={{ fontSize: 18, fontWeight: 900, color: T.purple, fontFamily: FONT_DISPLAY }}>+{loginRewardPopup.diamonds}</div>
                <div style={{ fontSize: 8, color: T.textDim }}>GEMS</div>
              </div>}
            </div>
          </div>
        </Popup>
      )}
      {dungeonResult && (
        <Popup title={dungeonResult.success ? "Cleared!" : "Failed"} icon={dungeonResult.success ? "🎉" : "💀"} color={dungeonResult.success ? T.success : T.danger} onClose={() => setDungeonResult(null)}>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 11, color: T.textSec, marginBottom: 8 }}>{dungeonResult.dungeon.emoji} {dungeonResult.tier.name} — {dungeonResult.waves}/{dungeonResult.totalWaves} waves</div>
            <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
              {dungeonResult.totalReward.gold > 0 && <div style={{ padding: "8px 14px", borderRadius: 8, background: `${T.gold}10`, border: `1px solid ${T.gold}20` }}><div style={{ fontSize: 16, fontWeight: 900, color: T.gold, fontFamily: FONT_DISPLAY }}>+{fmt(dungeonResult.totalReward.gold)}</div><div style={{ fontSize: 7, color: T.textDim }}>GOLD</div></div>}
              {dungeonResult.totalReward.diamonds > 0 && <div style={{ padding: "8px 14px", borderRadius: 8, background: `${T.purple}10`, border: `1px solid ${T.purple}20` }}><div style={{ fontSize: 16, fontWeight: 900, color: T.purple, fontFamily: FONT_DISPLAY }}>+{dungeonResult.totalReward.diamonds}</div><div style={{ fontSize: 7, color: T.textDim }}>GEMS</div></div>}
              {dungeonResult.totalReward.growthLevels > 0 && <div style={{ padding: "8px 14px", borderRadius: 8, background: `${T.success}10`, border: `1px solid ${T.success}20` }}><div style={{ fontSize: 16, fontWeight: 900, color: T.success, fontFamily: FONT_DISPLAY }}>+{dungeonResult.totalReward.growthLevels}</div><div style={{ fontSize: 7, color: T.textDim }}>GROWTH</div></div>}
            </div>
          </div>
        </Popup>
      )}
      {achToast && (
        <div key={achToast.ts} style={{ position: "absolute", top: 48, left: "50%", transform: "translateX(-50%)", zIndex: 1000, padding: "8px 14px", borderRadius: 10, minWidth: 220, maxWidth: "88%", background: `${T.card}f0`, backdropFilter: "blur(12px)", border: `1px solid ${achToast.color || T.gold}40`, boxShadow: `0 0 20px ${achToast.color || T.gold}15`, animation: "slideDown 0.4s ease, fadeOut 0.5s ease 3.5s forwards", display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 28, height: 28, borderRadius: 7, background: `${achToast.color || T.gold}15`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>{achToast.icon}</div>
          <div style={{ flex: 1 }}><div style={{ fontSize: 7, fontWeight: 700, color: T.gold, letterSpacing: 1 }}>ACHIEVEMENT!</div><div style={{ fontSize: 10, fontWeight: 800, color: T.white, fontFamily: FONT_DISPLAY }}>{achToast.name}</div></div>
        </div>
      )}

      {/* ═══ BATTLE SCREEN ═══ */}
      {(() => {
        const monster = battleState?.monster || getStageMonster(currentStage);
        return (
          <div style={{ position: isMobile ? "absolute" : "relative", inset: isMobile ? 0 : undefined, width: isMobile ? undefined : "45%", flexShrink: 0, display: "flex", flexDirection: "column", height: isMobile ? undefined : "100vh" }}>

            {/* ── TOP: Avatar + currencies ── */}
            <div style={{ display: "flex", alignItems: "center", padding: "6px 8px 0", gap: 6, zIndex: 10 }}>
              <div style={{ position: "relative", flexShrink: 0 }}>
                <div style={{ width: 40, height: 40, borderRadius: "50%", background: `linear-gradient(135deg, ${T.accent}30, ${T.purple}30)`, border: `2px solid ${T.accent}60`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, boxShadow: `0 0 12px ${T.accent}30` }}>{heroEmoji}</div>
                <div style={{ position: "absolute", bottom: -2, right: -2, width: 14, height: 14, borderRadius: "50%", background: T.success, border: "2px solid #0a0c14", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 6 }}>▶</div>
              </div>
              <div style={{ flexShrink: 0 }}>
                <div style={{ fontSize: 10, fontWeight: 800, color: T.white, fontFamily: FONT_DISPLAY, lineHeight: 1.1 }}>{account.displayName}</div>
                <div style={{ fontSize: 7, fontWeight: 700, color: TITLES.find(t => t.id === activeTitle)?.color || T.textDim, fontFamily: FONT_DISPLAY }}>{TITLES.find(t => t.id === activeTitle)?.name || "Newbie"}</div>
                <div style={{ fontSize: 8, fontWeight: 700, color: T.accent, fontFamily: FONT_DISPLAY }}>⚡{fmt(totalAtk + totalDef + totalMaxHp)}</div>
              </div>
              <div style={{ flex: 1 }} />
              {[
                { icon: "🪙", val: fmt(gold), c: "#f5c542" },
                { icon: "💎", val: fmt(diamonds), c: "#60a5fa" },
                { icon: "✨", val: `R${resonanceLevel}`, c: "#a855f7" },
              ].map((cur, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 3, padding: "2px 8px 2px 4px", borderRadius: 12, background: "linear-gradient(90deg, #1a1c28, #12141e)", border: "1px solid #ffffff0a" }}>
                  <span style={{ fontSize: 11 }}>{cur.icon}</span>
                  <span style={{ fontSize: 10, fontWeight: 800, color: cur.c, fontFamily: FONT_DISPLAY }}>{cur.val}</span>
                </div>
              ))}
            </div>

            {/* ── Stage progress bar ── */}
            <div style={{ padding: "6px 10px 4px", zIndex: 10 }}>
              <div style={{ position: "relative", height: 20, background: "#0e1020", borderRadius: 4, border: "1px solid #2a2e40", overflow: "hidden" }}>
                <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: `${Math.max(3, ((battleState?.killCount || 0) / monster.monstersToKill) * 100)}%`, background: "linear-gradient(90deg, #3b82f6, #60a5fa)", borderRadius: 3, transition: "width 0.3s", boxShadow: "0 0 8px #3b82f680" }} />
                <div style={{ position: "absolute", inset: 0, background: "linear-gradient(90deg, transparent 0%, #ffffff10 50%, transparent 100%)", animation: "shimmer 3s infinite" }} />
                <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 900, color: "#fff", fontFamily: FONT_DISPLAY, textShadow: "0 1px 3px #00000080" }}>
                  {farmStage > 0 && <span style={{ color: T.gold, marginRight: 4, fontSize: 8 }}>⚔️FARM</span>}
                  {stageLabel(currentStage)} ({battleState?.killCount || 0}/{monster.monstersToKill})
                </div>
              </div>
            </div>

            {/* ── PIXEL FIGHTER ARENA ── */}
            <div onClick={handleTapAttack} style={{ flex: 1, position: "relative", overflow: "hidden", cursor: "pointer", animation: screenShake === "heavy" ? "shakeHeavy 0.4s ease" : screenShake ? "shakeLight 0.2s ease" : undefined }}>
              {/* Sky/background gradient per chapter */}
              <div style={{ position: "absolute", inset: 0, background: `linear-gradient(180deg, ${chapter.color}08 0%, ${chapter.color}18 40%, #0a0c14 100%)` }} />
              {/* Parallax background elements */}
              <div style={{ position: "absolute", top: "5%", left: "10%", width: 60, height: 40, borderRadius: "50% 50% 0 0", background: `${chapter.color}08`, filter: "blur(8px)" }} />
              <div style={{ position: "absolute", top: "8%", right: "15%", width: 80, height: 30, borderRadius: "50% 50% 0 0", background: `${chapter.color}06`, filter: "blur(12px)" }} />
              {/* Ground/floor */}
              <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "30%", background: `linear-gradient(180deg, ${chapter.color}12 0%, #080a10 100%)`, borderTop: `2px solid ${chapter.color}20` }} />
              {/* Ground texture lines */}
              {[15, 35, 55, 75].map((x, i) => (
                <div key={i} style={{ position: "absolute", bottom: `${4 + i * 5}%`, left: `${x}%`, width: `${20 + i * 5}%`, height: 1, background: `${chapter.color}08`, transform: "perspective(200px) rotateX(20deg)" }} />
              ))}
              {/* Chapter name tag */}
              <div style={{ position: "absolute", top: 6, left: "50%", transform: "translateX(-50%)", zIndex: 15, padding: "2px 12px", borderRadius: 6, background: "#00000060", border: `1px solid ${chapter.color}30`, backdropFilter: "blur(4px)" }}>
                <span style={{ fontSize: 8, fontWeight: 800, color: chapter.color, fontFamily: FONT_DISPLAY, letterSpacing: 1, textTransform: "uppercase" }}>{chapter.emoji} {chapter.name}</span>
              </div>

              {/* Screen flash */}
              {screenFlash && <div key={screenFlash.ts} style={{ position: "absolute", inset: 0, zIndex: 30, pointerEvents: "none", background: `radial-gradient(circle, ${screenFlash.color}30 0%, transparent 70%)`, animation: "flashFade 0.15s ease-out forwards" }} />}

              {/* Floating dmg numbers */}
              {floatingDmg.map(d => (
                <div key={d.id} style={{ position: "absolute", zIndex: 25, pointerEvents: "none", left: d.side === "right" ? "65%" : "25%", top: "30%", animation: "dmgFloat 1.1s ease-out forwards" }}>
                  {d.skill && <span style={{ fontSize: 14 }}>{d.skill}</span>}
                  <span style={{ fontSize: d.crit ? 28 : d.skill ? 22 : 18, fontWeight: 900, fontFamily: FONT_DISPLAY, color: d.crit ? "#ffd700" : d.side === "right" ? "#fff" : "#ff4444", textShadow: `0 0 12px ${d.crit ? "#ffd700" : d.side === "right" ? "#6366f1" : "#ff4444"}80, 0 2px 8px #000c` }}>{d.crit ? "CRIT! " : ""}{fmt(d.dmg)}</span>
                </div>
              ))}

              {/* Gold popups */}
              {goldPopups.map(g => (
                <div key={g.id} style={{ position: "absolute", zIndex: 25, pointerEvents: "none", left: "50%", top: "50%", animation: "goldFloat 1s ease-out forwards" }}>
                  <span style={{ fontSize: 14, fontWeight: 900, color: T.gold, fontFamily: FONT_DISPLAY, textShadow: `0 0 8px ${T.gold}60, 0 2px 4px #000` }}>+{fmt(g.amount)}</span>
                </div>
              ))}

              {/* ── COMBO COUNTER (disabled - re-enable with buffs) ── */}

              {/* ── ANNOUNCER TEXT ── */}
              {announcer && (
                <div key={announcer.ts} style={{ position: "absolute", left: "50%", top: "20%", transform: "translateX(-50%)", zIndex: 35, pointerEvents: "none", animation: "announcerSlam 1.5s ease forwards" }}>
                  <div style={{ fontSize: 26, fontWeight: 900, fontFamily: FONT_DISPLAY, color: announcer.color, textShadow: `0 0 20px ${announcer.color}80, 0 0 40px ${announcer.color}40, 0 3px 8px #000`, letterSpacing: 3, whiteSpace: "nowrap" }}>{announcer.text}</div>
                </div>
              )}

              {/* ── BOSS CINEMATIC OVERLAY ── */}
              {bossCinematic && (
                <div style={{ position: "absolute", inset: 0, zIndex: 50, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "linear-gradient(180deg, #000000e0 0%, #0a0000d0 50%, #000000e0 100%)", animation: "cinematicFade 2s ease" }}>
                  <div style={{ animation: "warningFlash 0.5s ease-in-out infinite", fontSize: 10, fontWeight: 900, color: "#ff4444", fontFamily: FONT_DISPLAY, letterSpacing: 6, textTransform: "uppercase", marginBottom: 12 }}>⚠️ WARNING ⚠️</div>
                  <div style={{ animation: "bossSpriteEnter 0.8s ease 0.3s both" }}>
                    {bossCinematic.sprite ? (
                      <img src={bossCinematic.sprite} alt={bossCinematic.name} style={{ width: 96, height: 96, imageRendering: "pixelated", filter: "drop-shadow(0 0 20px #ff000060) drop-shadow(0 0 40px #ff000030)" }} />
                    ) : (
                      <div style={{ fontSize: 72, filter: "drop-shadow(0 0 20px #ff000060)" }}>{bossCinematic.emoji}</div>
                    )}
                  </div>
                  <div style={{ animation: "bossNameEnter 0.6s ease 0.6s both", fontSize: 22, fontWeight: 900, fontFamily: FONT_DISPLAY, color: T.gold, textShadow: `0 0 20px ${T.gold}80, 0 2px 8px #000`, letterSpacing: 2, marginTop: 8 }}>{bossCinematic.name}</div>
                  <div style={{ animation: "bossNameEnter 0.6s ease 0.9s both", fontSize: 10, fontWeight: 700, color: "#ff666680", fontFamily: FONT_DISPLAY, letterSpacing: 4, marginTop: 4, textTransform: "uppercase" }}>BOSS BATTLE</div>
                  {/* Red scanlines */}
                  <div style={{ position: "absolute", inset: 0, background: "repeating-linear-gradient(0deg, transparent, transparent 3px, #ff000008 3px, #ff000008 4px)", pointerEvents: "none" }} />
                </div>
              )}

              {/* ── ANIMATED BACKGROUND PARTICLES ── */}
              {[...Array(8)].map((_, i) => (
                <div key={`p${i}`} style={{
                  position: "absolute", pointerEvents: "none", zIndex: 1,
                  left: `${10 + (i * 12)}%`, bottom: `${30 + (i % 3) * 8}%`,
                  width: 3, height: 3, borderRadius: "50%",
                  background: `${chapter.color}${i % 2 === 0 ? "30" : "18"}`,
                  animation: `particleFloat ${4 + (i % 3) * 2}s ease-in-out infinite ${i * 0.5}s`,
                  filter: "blur(1px)",
                }} />
              ))}
              {/* Floating dust motes */}
              {[...Array(5)].map((_, i) => (
                <div key={`d${i}`} style={{
                  position: "absolute", pointerEvents: "none", zIndex: 1,
                  left: `${5 + i * 20}%`, top: `${15 + (i % 4) * 15}%`,
                  width: 2, height: 2, borderRadius: "50%",
                  background: "#ffffff10",
                  animation: `dustDrift ${6 + i * 1.5}s linear infinite ${i * 1.2}s`,
                }} />
              ))}

              {/* ── RAGE METER ── */}
              {rage > 0 && (
                <div style={{ position: "absolute", bottom: "8%", left: "10%", right: "10%", zIndex: 15, pointerEvents: "none" }}>
                  <div style={{ fontSize: 7, fontWeight: 800, color: rage >= 80 ? "#ff4444" : "#ff8800", fontFamily: FONT_DISPLAY, textAlign: "center", marginBottom: 2, textShadow: "0 1px 3px #000" }}>
                    {rage >= 100 ? "⚡ ULTIMATE READY!" : `🔥 RAGE ${rage}%`}
                  </div>
                  <div style={{ height: 5, borderRadius: 3, background: "#ffffff15", border: "1px solid #ffffff20", overflow: "hidden" }}>
                    <div style={{ width: `${rage}%`, height: "100%", borderRadius: 3, background: rage >= 80 ? "linear-gradient(90deg, #ff4444, #ff0000)" : "linear-gradient(90deg, #ff8800, #ffcc00)", transition: "width 0.2s", boxShadow: rage >= 80 ? "0 0 8px #ff000080" : "none", animation: rage >= 90 ? "pulse 0.5s infinite" : "none" }} />
                  </div>
                </div>
              )}

              {/* ── HAZARD WARNING ── */}
              {(() => { const h = STAGE_HAZARDS[Math.min(Math.floor((currentStage - 1) / 50), STAGE_HAZARDS.length - 1)]; return h ? (
                <div style={{ position: "absolute", top: 18, right: 8, zIndex: 15, padding: "2px 6px", borderRadius: 4, background: `${h.color}20`, border: `1px solid ${h.color}40`, fontSize: 7, fontWeight: 700, color: h.color, fontFamily: FONT_DISPLAY }}>
                  {h.emoji} {h.name}
                </div>
              ) : null; })()}

              {/* ── HAZARD FLASH OVERLAY ── */}
              {hazardFlash && <div style={{ position: "absolute", inset: 0, background: `${hazardFlash}15`, zIndex: 12, pointerEvents: "none", animation: "fadeOut 0.3s ease forwards" }} />}

              {/* ── COMPANION PET ── */}
              {activePets.length > 0 && (() => { const pd = PET_DEFS.find(p => p.name === activePets[0]); return pd ? (
                <div style={{ position: "absolute", left: "12%", bottom: "35%", zIndex: 8, animation: "fighterIdle 3s ease-in-out infinite 1s" }}>
                  <div style={{ fontSize: 24, filter: "drop-shadow(0 2px 4px #00000080)" }}>{pd.emoji}</div>
                  <div style={{ fontSize: 6, fontWeight: 700, color: T.textSec, fontFamily: FONT_DISPLAY, textAlign: "center", textShadow: "0 1px 2px #000" }}>{pd.name}</div>
                </div>
              ) : null; })()}

              {/* ── SET BONUS AURA ── */}
              {(() => {
                const equippedTypes = Object.entries(equipped).filter(([, v]) => v).map(([k]) => k);
                const activeSet = EQUIP_SETS.find(set => set.pieces.filter(p => equippedTypes.includes(p)).length >= 3);
                return activeSet ? (
                  <div style={{ position: "absolute", left: "22%", bottom: "25%", width: 80, height: 80, borderRadius: "50%", background: `radial-gradient(circle, ${activeSet.aura}20 0%, transparent 70%)`, border: `1px solid ${activeSet.aura}15`, zIndex: 3, pointerEvents: "none", animation: "pulse 3s infinite", transform: "translateX(-50%)" }} />
                ) : null;
              })()}

              {/* ── TAP INDICATOR ── */}
              <div style={{ position: "absolute", bottom: "32%", left: "50%", transform: "translateX(-50%)", zIndex: 5, pointerEvents: "none", opacity: 0.25, animation: "pulse 2s infinite" }}>
                <div style={{ fontSize: 8, fontWeight: 700, color: "#ffffff60", fontFamily: FONT_DISPLAY, textAlign: "center" }}>TAP TO ATTACK</div>
              </div>

              {/* ── HERO (left side fighter) ── */}
              <div style={{ position: "absolute", left: "22%", bottom: "28%", transform: "translateX(-50%)", textAlign: "center", zIndex: 10 }}>
                {/* Hero name */}
                <div style={{ fontSize: 7, fontWeight: 800, color: T.accent, fontFamily: FONT_DISPLAY, marginBottom: 2, textShadow: "0 1px 3px #000" }}>{account.displayName}</div>
                {/* Hero HP bar */}
                <div style={{ width: 64, height: 6, background: "#00000080", borderRadius: 3, overflow: "hidden", margin: "0 auto 4px", border: "1px solid #ffffff15" }}>
                  <div style={{ width: `${(playerHp / totalMaxHp) * 100}%`, height: "100%", background: "linear-gradient(90deg, #22c55e, #4ade80)", borderRadius: 3, transition: "width 0.15s", boxShadow: "0 0 6px #22c55e60" }} />
                </div>
                {/* Hero sprite */}
                <div style={{ width: 64, height: 64, margin: "0 auto", position: "relative" }}>
                  {/* Shadow on ground */}
                  <div style={{ position: "absolute", bottom: -6, left: "50%", transform: "translateX(-50%)", width: 40, height: 10, borderRadius: "50%", background: "#00000050", filter: "blur(3px)" }} />
                  {/* Hero body */}
                  <div style={{
                    width: 64, height: 64, display: "flex", alignItems: "center", justifyContent: "center",
                    animation: heroAnim === "attack" ? "fighterAttack 0.3s ease" : heroAnim === "hit" ? "fighterHit 0.4s ease" : "fighterIdle 2s ease-in-out infinite",
                    filter: heroAnim === "hit" ? "brightness(0.7) sepia(1) saturate(10) hue-rotate(-50deg) drop-shadow(0 0 12px #ff0000cc)" : "drop-shadow(0 2px 8px #00000080) drop-shadow(0 0 12px " + T.accent + "30)",
                    transition: "filter 0.1s",
                  }}>
                    <img src={heroSprite} alt="Hero" onError={(e) => { e.target.style.display = "none"; e.target.nextSibling.style.display = "flex"; }} style={{ width: 64, height: 64, imageRendering: "pixelated", objectFit: "contain" }} />
                    <span style={{ display: "none", width: 64, height: 64, alignItems: "center", justifyContent: "center", fontSize: 40 }}>{heroEmoji}</span>
                  </div>
                </div>
                {/* HP text */}
                <div style={{ fontSize: 7, fontWeight: 800, color: "#22c55e", fontFamily: FONT_DISPLAY, marginTop: 1, textShadow: "0 1px 2px #000" }}>{fmt(playerHp)}/{fmt(totalMaxHp)}</div>
              </div>

              {/* ── VS indicator ── */}
              {(battleState?.enemies || []).some(e => e.anim !== "die") && (
                <div style={{ position: "absolute", left: "50%", top: "35%", transform: "translate(-50%, -50%)", zIndex: 12, pointerEvents: "none" }}>
                  <div style={{ fontSize: 14, fontWeight: 900, color: "#ffffff30", fontFamily: FONT_DISPLAY, textShadow: "0 0 20px #ffffff10", letterSpacing: 2 }}>VS</div>
                </div>
              )}

              {/* ── ENEMY (right side fighter) ── */}
              {(battleState?.enemies || []).map(enemy => (
                <div key={enemy.id} style={{
                  position: "absolute", right: "18%", bottom: "28%", transform: `translateX(50%) scale(${enemy.scale || 1})`,
                  textAlign: "center", zIndex: 8,
                  animation: enemy.anim === "spawn" ? "enemyEnter 0.4s ease" : enemy.anim === "die" ? "fighterDie 0.5s ease forwards" : undefined,
                  pointerEvents: "none",
                }}>
                  {/* Enemy name */}
                  {enemy.anim !== "die" && (
                    <div style={{ fontSize: 7, fontWeight: 800, color: enemy.isBoss ? T.gold : T.danger, fontFamily: FONT_DISPLAY, marginBottom: 2, textShadow: "0 1px 3px #000" }}>
                      {enemy.isBoss && "👑 "}{enemy.name}
                    </div>
                  )}
                  {/* Enemy HP bar */}
                  {enemy.anim !== "die" && (
                    <div style={{ width: 64, height: 6, background: "#00000080", borderRadius: 3, overflow: "hidden", margin: "0 auto 4px", border: `1px solid ${enemy.isBoss ? T.gold + "30" : "#ffffff15"}` }}>
                      <div style={{ width: `${Math.max(0, (enemy.hp / enemy.maxHp) * 100)}%`, height: "100%", background: enemy.isBoss ? `linear-gradient(90deg, ${T.gold}, ${T.orange})` : "linear-gradient(90deg, #ef4444, #f87171)", borderRadius: 3, transition: "width 0.1s", boxShadow: `0 0 6px ${enemy.isBoss ? T.gold : "#ef4444"}60` }} />
                    </div>
                  )}
                  {/* Enemy sprite */}
                  <div style={{ width: 64, height: 64, margin: "0 auto", position: "relative" }}>
                    {/* Shadow on ground */}
                    <div style={{ position: "absolute", bottom: -6, left: "50%", transform: "translateX(-50%)", width: 40, height: 10, borderRadius: "50%", background: "#00000050", filter: "blur(3px)", opacity: enemy.anim === "die" ? 0 : 1 }} />
                    {/* Enemy body */}
                    <div style={{
                      width: 64, height: 64, display: "flex", alignItems: "center", justifyContent: "center",
                      transform: "scaleX(-1)",
                      animation: enemy.anim === "hit" ? "fighterHit 0.4s ease" : enemy.anim === "idle" ? "fighterIdle 2s ease-in-out infinite 0.5s" : undefined,
                      filter: enemy.anim === "hit" ? "brightness(0.7) sepia(1) saturate(10) hue-rotate(-50deg) drop-shadow(0 0 12px #ff0000cc)" : enemy.isBoss ? `drop-shadow(0 0 12px ${T.gold}60)` : "drop-shadow(0 2px 8px #00000080)",
                      opacity: enemy.anim === "die" ? 0 : 1,
                      transition: "filter 0.1s, opacity 0.3s",
                    }}>
                      {enemy.sprite ? (
                        <img src={enemy.sprite} alt={enemy.name} onError={(e) => { e.target.style.display = "none"; e.target.nextSibling.style.display = "flex"; }} style={{ width: 64, height: 64, imageRendering: "pixelated", objectFit: "contain" }} />
                      ) : null}
                      <span style={{ display: enemy.sprite ? "none" : "flex", width: 64, height: 64, alignItems: "center", justifyContent: "center", fontSize: enemy.isBoss ? 44 : 36 }}>{enemy.emoji}</span>
                    </div>
                  </div>
                  {/* Enemy HP text */}
                  {enemy.anim !== "die" && (
                    <div style={{ fontSize: 7, fontWeight: 800, color: "#ef4444", fontFamily: FONT_DISPLAY, marginTop: 1, textShadow: "0 1px 2px #000" }}>{fmt(enemy.hp)}/{fmt(enemy.maxHp)}</div>
                  )}
                </div>
              ))}

              {/* Slash VFX between fighters on hero attack */}
              {heroAnim === "attack" && (
                <div style={{ position: "absolute", left: "42%", top: "42%", zIndex: 20, pointerEvents: "none", animation: "slashVfx 0.3s ease-out forwards" }}>
                  <div style={{ fontSize: 32, transform: "rotate(-30deg) scaleX(1.5)", filter: `drop-shadow(0 0 8px ${T.accent}80)`, opacity: 0.9 }}>⚔️</div>
                </div>
              )}

                                          {/* LEFT SIDE ICONS */}
              <div style={{ position: "absolute", left: 4, top: "25%%", display: "flex", flexDirection: "column", gap: 5, zIndex: 20 }}>
                {[{ icon: "💎", sub: fmt(diamonds), p: null }, { icon: "🛒", p: "shop" }, { icon: "👗", p: "costumes" }, { icon: "🏅", p: "battlepass" }].map((b, i) => (
                  <div key={i} onClick={b.p ? () => nav(b.p) : undefined} style={{ width: 36, height: b.sub ? 42 : 36, borderRadius: 8, cursor: b.p ? "pointer" : "default", background: "linear-gradient(135deg, #161a2a, #101420)", border: "1px solid #ffffff0a", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 0, boxShadow: "0 2px 8px #00000050" }}>
                    <span style={{ fontSize: 16, lineHeight: 1 }}>{b.icon}</span>
                    {b.sub && <span style={{ fontSize: 7, fontWeight: 800, color: "#60a5fa", fontFamily: FONT_DISPLAY, lineHeight: 1 }}>{b.sub}</span>}
                  </div>
                ))}
              </div>

                            {/* RIGHT SIDE ICONS */}
              <div style={{ position: "absolute", right: 4, top: "20%", display: "flex", flexDirection: "column", gap: 5, zIndex: 20 }}>
              {[{ icon: "🐾", p: "pets" }, { icon: "🔄", p: "prestige" }, { icon: "🏰", p: "dungeons" }, { icon: "⚙️", p: "settings" }].map((b,i) => (<div key={i} onClick={() => nav(b.p)} style={{ width:36,height:36,borderRadius:8,cursor:"pointer",background:"linear-gradient(135deg,#1a1610,#12100a)",border:"1px solid #ffffff0a",display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,boxShadow:"0 2px 8px #00000050"}}>{b.icon}</div>))}
              <div onClick={() => setShowMoreMenu(p=>!p)} style={{ width:36,height:36,borderRadius:8,cursor:"pointer",background:showMoreMenu?"linear-gradient(135deg,#2a1a30,#1a1228)":"linear-gradient(135deg,#1a1610,#12100a)",border:showMoreMenu?`1px solid ${T.accent}30`:"1px solid #ffffff0a",display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,boxShadow:"0 2px 8px #00000050",fontWeight:900,color:showMoreMenu?T.accent:T.textDim}}>{"⋯"}</div>
              </div>
              {showMoreMenu&&(<div onClick={()=>setShowMoreMenu(false)} style={{position:"absolute",inset:0,zIndex:28}}/>)}
              {showMoreMenu&&(<div style={{position:"absolute",right:46,top:"18%",zIndex:30,background:"linear-gradient(145deg,#1c1f2e,#141620)",border:"1px solid #ffffff15",borderRadius:14,padding:12,boxShadow:"0 12px 40px #000000b0",minWidth:180}}>
              <div style={{fontSize:10,fontWeight:800,color:T.textDim,fontFamily:FONT_DISPLAY,marginBottom:8,textAlign:"center",textTransform:"uppercase",letterSpacing:2}}>More</div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:6}}>
              {[{icon:"🏺",label:"Relics",p:"relics"},{icon:"🏅",label:"Emblems",p:"emblems"},{icon:"🗼",label:"Tower",p:"tower"},{icon:"⚗️",label:"Alchemy",p:"alchemy"},{icon:"💠",label:"Gems",p:"gems"},{icon:"✨",label:"Resonance",p:"resonance"},{icon:"🎡",label:"Spin",p:"spin"},{icon:"💥",label:"BossRush",p:"bossrush"},{icon:"📖",label:"Bestiary",p:"bestiary"},{icon:"🏷️",label:"Titles",p:"titles"},{icon:"🗿",label:"Figures",p:"figures"},{icon:"💀",label:"Achieve",p:"achievements"},{icon:"📊",label:"Power",p:"power"},{icon:"⚔️",label:"Evolve",p:"weaponevo"},{icon:"🥋",label:"Dojo",p:"dojo"},{icon:"🎯",label:"Challenge",p:"challenge"}].map(b=>(<div key={b.p} onClick={()=>{nav(b.p);setShowMoreMenu(false)}} style={{display:"flex",flexDirection:"column",alignItems:"center",gap:3,padding:"8px 2px",borderRadius:8,cursor:"pointer",background:"#ffffff04",border:"1px solid #ffffff08"}}><span style={{fontSize:18}}>{b.icon}</span><span style={{fontSize:7,fontWeight:700,color:T.textSec,fontFamily:FONT_DISPLAY,lineHeight:1}}>{b.label}</span></div>))}
              </div></div>)}
            </div>


            {/* ── SKILL SLOTS ── */}
            <div style={{ flexShrink: 0, padding: "3px 10px", background: "linear-gradient(180deg, #10121a, #0c0e16)", borderTop: "1px solid #ffffff06" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}>
                {[0, 1, 2].map(idx => {
                  const sid = equippedSkills[idx];
                  const sk = sid ? COMBAT_SKILLS.find(s => s.id === sid) : null;
                  const cd = sk ? skillCooldowns[sk.id] : false;
                  return (
                    <div key={idx} style={{ width: 42, height: 42, borderRadius: 8, position: "relative", background: sk ? (cd ? "#0e1020" : `${sk.color}15`) : "#0a0c14", border: `2px solid ${sk ? (cd ? "#ffffff08" : sk.color + "40") : "#ffffff06"}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: sk ? 19 : 11, color: sk ? undefined : T.textDim, opacity: cd ? 0.35 : 1, transition: "all 0.3s", boxShadow: sk && !cd ? `0 0 8px ${sk.color}15, inset 0 0 10px ${sk.color}08` : "none" }}>
                      {sk ? sk.emoji : idx + 1}
                      {sk && !cd && <div style={{ position: "absolute", inset: 0, borderRadius: 6, background: `${sk.color}06`, animation: "pulse 2s infinite" }} />}
                      <div style={{ position: "absolute", top: 0, left: 2, fontSize: 7, fontWeight: 900, color: cd ? T.textDim : sk ? sk.color : T.textDim, fontFamily: FONT_DISPLAY }}>{idx + 1}</div>
                    </div>
                  );
                })}
                <div style={{ width: 1, height: 28, background: "#ffffff08", margin: "0 2px" }} />
                <div onClick={() => setAutoProgress(!autoProgress)} style={{ width: 42, height: 42, borderRadius: "50%", cursor: "pointer", background: autoProgress ? "linear-gradient(135deg, #16a34a20, #22c55e10)" : "#0e1020", border: `2px solid ${autoProgress ? "#22c55e50" : "#ffffff08"}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 8, fontWeight: 900, fontFamily: FONT_DISPLAY, color: autoProgress ? "#22c55e" : T.textDim, boxShadow: autoProgress ? "0 0 10px #22c55e20" : "none" }}>AUTO</div>
                {/* Farm stage selector */}
                <div onClick={() => {
                  if (farmStage > 0) { setFarmStage(0); } // Turn off farming
                  else { setFarmStage(Math.max(1, highestStage - 5)); } // Farm 5 stages back
                }} style={{ width: 42, height: 42, borderRadius: "50%", cursor: "pointer", background: farmStage > 0 ? "linear-gradient(135deg, #f59e0b20, #fbbf2410)" : "#0e1020", border: `2px solid ${farmStage > 0 ? "#fbbf2450" : "#ffffff08"}`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", fontSize: farmStage > 0 ? 7 : 8, fontWeight: 900, fontFamily: FONT_DISPLAY, color: farmStage > 0 ? T.gold : T.textDim, boxShadow: farmStage > 0 ? "0 0 10px #fbbf2420" : "none", lineHeight: 1.2 }}>
                  {farmStage > 0 ? (<>{`⚔️`}<span style={{ fontSize: 6 }}>{farmStage}</span></>) : "FARM"}
                </div>
              </div>
            </div>

            {/* ── SKILL BAR SWAP ── */}
            <div style={{ flexShrink: 0, padding: "2px 10px 0", background: "#0c0e16", display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}>
              {[0, 1].map(idx => (
                <div key={idx} onClick={() => swapSkillBar(idx)} style={{
                  padding: "2px 14px", borderRadius: 4, cursor: "pointer",
                  background: activeSkillBar === idx ? `${T.accent}15` : "transparent",
                  border: `1px solid ${activeSkillBar === idx ? T.accent + "40" : "#ffffff08"}`,
                  fontSize: 7, fontWeight: 800, color: activeSkillBar === idx ? T.accent : T.textDim,
                  fontFamily: FONT_DISPLAY,
                }}>Bar {idx + 1}</div>
              ))}
            </div>
            {/* ── SKILL ICONS (equip/unequip) ── */}
            <div style={{ flexShrink: 0, padding: "3px 10px", background: "#0c0e16", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
              {COMBAT_SKILLS.filter(sk => unlockedSkills.includes(sk.id)).map(sk => {
                const isEq = equippedSkills.includes(sk.id);
                return (
                  <div key={sk.id} onClick={() => { if (isEq) { setEquippedSkills(p => p.map(s => s === sk.id ? null : s)); } else { setEquippedSkills(p => { const c = [...p]; const e = c.indexOf(null); if (e !== -1) c[e] = sk.id; return c; }); } }} style={{ width: 34, height: 34, borderRadius: "50%", cursor: "pointer", background: isEq ? `${sk.color}20` : "#14161e", border: `2px solid ${isEq ? sk.color + "60" : "#ffffff0a"}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, boxShadow: isEq ? `0 0 8px ${sk.color}20` : "none", transition: "all 0.2s" }}>
                    {sk.emoji}
                  </div>
                );
              })}
              {COMBAT_SKILLS.filter(sk => !unlockedSkills.includes(sk.id)).slice(0, 3).map((_, i) => (
                <div key={i} style={{ width: 34, height: 34, borderRadius: "50%", background: "#0e1020", border: "2px solid #ffffff06", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, color: T.textDim }}>🔒</div>
              ))}
            </div>

            {/* ── BOTTOM TABS (mobile only) ── */}
            {isMobile && <div style={{ flexShrink: 0, display: "flex", alignItems: "stretch", background: "linear-gradient(180deg, #12141e, #0a0c14)", borderTop: "1px solid #ffffff08", paddingBottom: "max(4px, env(safe-area-inset-bottom))" }}>
              {[
                { icon: "🗡️", label: "Equip", p: "equipment" },
                { icon: "📜", label: "Quests", p: "quests" },
                { icon: "✨", label: "Summon", p: "summon" },
                { icon: "⭐", label: "Growth", p: "growth" },
                { icon: "🏰", label: "Dungeon", p: "dungeons" },
                { icon: "⚔️", label: "Raids", p: "raids" },
              ].map(tab => {
                const act = page === tab.p;
                const hasNotif = tab.p === "quests" && (() => {
                  const dp = questProgress.daily || {};
                  const wp = questProgress.weekly || {};
                  const dc = questProgress.claimedDaily || {};
                  const wc = questProgress.claimedWeekly || {};
                  return DAILY_QUESTS.some(q => (dp[q.stat] || 0) >= q.target && !dc[q.id]) || WEEKLY_QUESTS.some(q => (wp[q.stat] || 0) >= q.target && !wc[q.id]);
                })();
                return (
                  <div key={tab.p} onClick={() => nav(tab.p)} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "5px 0 3px", cursor: "pointer", position: "relative" }}>
                    {act && <div style={{ position: "absolute", top: 0, left: "20%", right: "20%", height: 2, background: T.accent, borderRadius: "0 0 2px 2px" }} />}
                    {hasNotif && <div style={{ position: "absolute", top: 2, right: "18%", width: 7, height: 7, borderRadius: "50%", background: T.danger, border: "1px solid #0a0c14", zIndex: 2 }} />}
                    <div style={{ width: 36, height: 36, borderRadius: 9, background: act ? "linear-gradient(180deg, #1e2040, #14162a)" : "transparent", border: act ? `1px solid ${T.accent}30` : "1px solid transparent", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 19, boxShadow: act ? `0 0 10px ${T.accent}15` : "none" }}>{tab.icon}</div>
                    <span style={{ fontSize: 7, fontWeight: 700, color: act ? T.accent : T.textDim, marginTop: 1, fontFamily: FONT_DISPLAY }}>{tab.label}</span>
                  </div>
                );
              })}
            </div>}
          </div>
        );
      })()}

      {/* ═══ PAGE PANEL ═══ */}
      {(isMobile ? page !== "battle" : true) && (
        <div style={{
          ...(isMobile ? { position: "absolute", left: 0, right: 0, bottom: 0, top: "18%", zIndex: 50, animation: "panelSlideUp 0.25s ease" } : { position: "relative", flex: 1, height: "100vh", borderLeft: "1px solid #ffffff08" }),
          display: "flex", flexDirection: "column",
        }}>
          {/* Panel header */}
          <div style={{ flexShrink: 0, borderRadius: isMobile ? "16px 16px 0 0" : 0, background: "linear-gradient(180deg, #181a24, #10121a)", borderTop: isMobile ? "1px solid #ffffff10" : "none", borderBottom: isMobile ? "none" : "1px solid #ffffff08", padding: isMobile ? "6px 12px 8px" : "10px 16px" }}>
            {/* Drag handle (mobile only) */}
            {isMobile && <div style={{ width: 36, height: 4, borderRadius: 99, background: "#ffffff15", margin: "0 auto 6px" }} />}
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              {isMobile && <div onClick={() => nav("battle")} style={{ width: 28, height: 28, borderRadius: 7, cursor: "pointer", background: "#1a1c28", border: "1px solid #ffffff0a", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, color: T.textSec, fontWeight: 900 }}>✕</div>}
              <div style={{ flex: 1, fontSize: isMobile ? 13 : 15, fontWeight: 900, color: T.white, fontFamily: FONT_DISPLAY, textTransform: "uppercase" }}>
                {page === "dungeons" && "🏰 Dungeons"}{page === "growth" && "📊 Growth"}{page === "equipment" && "🗡️ Equipment"}{page === "summon" && "✨ Summon"}{page === "pets" && "🐾 Pets"}{page === "costumes" && "👗 Costumes"}{page === "achievements" && "💀 Achievements"}{page === "stats" && "📈 Stats"}{page === "settings" && "⚙️ Settings"}{page === "quests" && "📜 Quests"}{page === "relics" && "🏺 Relics & Insignias"}{page === "prestige" && "🔄 Rebirth & Skills"}{page === "raids" && "⚔️ Raid Bosses"}{page === "shop" && "🛒 Shop"}{page === "titles" && "🏷️ Titles"}{page === "emblems" && "🏅 Emblems"}{page === "alchemy" && "⚗️ Alchemy"}{page === "resonance" && "✨ Resonance"}{page === "figures" && "🗿 Figures"}{page === "tower" && "🗼 Tower"}{page === "spin" && "🎡 Daily Spin"}{page === "bossrush" && "💥 Boss Rush"}{page === "battlepass" && "🎖️ Battle Pass"}{page === "gems" && "💎 Gems"}{page === "bestiary" && "📖 Bestiary"}{page === "power" && "📊 Power"}{page === "weaponevo" && "⚔️ Weapon Evolution"}{page === "dojo" && "🥋 Training Dojo"}{page === "challenge" && "🎯 Challenges"}{page === "battle" && !isMobile && "⚔️ Quick Stats"}
              </div>
              <div style={{ display: "flex", gap: 5 }}>
                <span style={{ fontSize: 9, fontWeight: 800, color: "#f5c542", fontFamily: FONT_DISPLAY }}>🪙{fmt(gold)}</span>
                <span style={{ fontSize: 9, fontWeight: 800, color: "#60a5fa", fontFamily: FONT_DISPLAY }}>💎{fmt(diamonds)}</span>
              </div>
            </div>
          </div>
          {/* Scrollable content */}
          <div style={{ flex: 1, overflow: "auto", padding: isMobile ? "10px 12px" : "16px 20px", paddingBottom: 60, background: "#10121aee", backdropFilter: "blur(6px)" }}>

          {/* ═══ DESKTOP BATTLE QUICK STATS ═══ */}
          {page === "battle" && !isMobile && (
            <div>
              <div style={{ fontSize: 15, fontWeight: 900, color: T.white, fontFamily: FONT_DISPLAY, marginBottom: 12 }}>⚔️ BATTLE OVERVIEW</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 16 }}>
                {[
                  { label: "ATK", val: fmt(totalAtk), color: T.danger, icon: "⚔️" },
                  { label: "DEF", val: fmt(totalDef), color: T.info, icon: "🛡️" },
                  { label: "HP", val: fmt(totalMaxHp), color: T.success, icon: "❤️" },
                  { label: "CRIT", val: `${critRate}%`, color: T.warning, icon: "🎯" },
                  { label: "STAGE", val: stageLabel(currentStage), color: T.accent, icon: "📍" },
                  { label: "HIGHEST", val: stageLabel(highestStage), color: T.purple, icon: "🏆" },
                  { label: "KILLS", val: fmt(combatStats.kills), color: T.orange, icon: "💀" },
                  { label: "GOLD", val: fmt(gold), color: T.gold, icon: "🪙" },
                ].map(s => (
                  <div key={s.label} style={{ padding: "10px 12px", borderRadius: 10, background: `${s.color}06`, border: `1px solid ${s.color}15` }}>
                    <div style={{ fontSize: 8, fontWeight: 700, color: s.color, fontFamily: FONT_DISPLAY, marginBottom: 4 }}>{s.icon} {s.label}</div>
                    <div style={{ fontSize: 16, fontWeight: 900, color: T.white, fontFamily: FONT_DISPLAY }}>{s.val}</div>
                  </div>
                ))}
              </div>
              {/* Weapon evolution mini */}
              <div style={{ padding: "10px 12px", borderRadius: 10, background: `${wEvo.color}06`, border: `1px solid ${wEvo.color}15`, marginBottom: 8 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 24 }}>{wEvo.emoji}</span>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 800, color: wEvo.color, fontFamily: FONT_DISPLAY }}>{wEvo.name}</div>
                    <div style={{ fontSize: 8, color: T.textDim }}>Tier {wEvo.tier} • +{wEvo.atkBonus} ATK</div>
                  </div>
                </div>
              </div>
              {/* Active set bonus */}
              {(() => {
                const equippedTypes = Object.entries(equipped).filter(([, v]) => v).map(([k]) => k);
                const activeSet = EQUIP_SETS.find(set => set.pieces.filter(p => equippedTypes.includes(p)).length >= 2);
                return activeSet ? (
                  <div style={{ padding: "10px 12px", borderRadius: 10, background: `${activeSet.aura}06`, border: `1px solid ${activeSet.aura}15`, marginBottom: 8 }}>
                    <div style={{ fontSize: 11, fontWeight: 800, color: activeSet.aura, fontFamily: FONT_DISPLAY }}>{activeSet.name}</div>
                    <div style={{ fontSize: 8, color: T.textDim }}>{activeSet.desc}</div>
                  </div>
                ) : null;
              })()}
              {/* Quick nav buttons */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6, marginTop: 12 }}>
                {[
                  { icon: "⚔️", label: "Evolve", p: "weaponevo" },
                  { icon: "🥋", label: "Dojo", p: "dojo" },
                  { icon: "🎯", label: "Challenge", p: "challenge" },
                  { icon: "⭐", label: "Growth", p: "growth" },
                  { icon: "🗡️", label: "Equip", p: "equipment" },
                  { icon: "📊", label: "Power", p: "power" },
                ].map(q => (
                  <div key={q.p} onClick={() => nav(q.p)} style={{ padding: "8px 6px", borderRadius: 8, background: "#ffffff04", border: "1px solid #ffffff08", cursor: "pointer", textAlign: "center" }}>
                    <div style={{ fontSize: 18 }}>{q.icon}</div>
                    <div style={{ fontSize: 8, fontWeight: 700, color: T.textSec, fontFamily: FONT_DISPLAY }}>{q.label}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ═══ RAIDS ═══ */}
          {page === "raids" && (
            <div>
              <div style={{ fontSize: 13, fontWeight: 900, color: T.white, fontFamily: FONT_DISPLAY, marginBottom: 4 }}>⚔️ RAID BOSSES</div>
              <div style={{ fontSize: 8, color: T.textDim, marginBottom: 12 }}>Powerful bosses with timed fights. 1 attempt per boss per day. Rewards include Prestige Souls!</div>

              {/* Raid result popup */}
              {raidResult && (
                <div style={{ padding: 14, borderRadius: 10, marginBottom: 14, background: raidResult.success ? `${T.success}08` : `${T.danger}08`, border: `1px solid ${raidResult.success ? T.success + "25" : T.danger + "25"}` }}>
                  <div style={{ fontSize: 12, fontWeight: 900, color: raidResult.success ? T.success : T.danger, fontFamily: FONT_DISPLAY, marginBottom: 4 }}>{raidResult.success ? "VICTORY!" : "DEFEATED"} — {raidResult.raid.emoji} {raidResult.raid.name}</div>
                  <div style={{ fontSize: 9, color: T.textSec }}>Damage dealt: {fmt(raidResult.totalDmg)} ({raidResult.hpPct}% of HP)</div>
                  {raidResult.success && <div style={{ fontSize: 9, color: T.gold, fontWeight: 700, marginTop: 2 }}>+{raidResult.raid.reward.diamonds}💎 +{fmt(raidResult.raid.reward.gold)}🪙 +{raidResult.raid.reward.souls}✦ Souls</div>}
                  <div onClick={() => setRaidResult(null)} style={{ marginTop: 6, padding: "4px 12px", borderRadius: 6, background: "#ffffff08", border: "1px solid #ffffff10", fontSize: 9, fontWeight: 700, color: T.textSec, cursor: "pointer", display: "inline-block" }}>Dismiss</div>
                </div>
              )}

              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {RAID_BOSSES.map(raid => {
                  const unlocked = highestStage >= raid.minStage;
                  const today = new Date().toISOString().slice(0, 10);
                  const att = raidAttempts[raid.id];
                  const usedToday = att && att.date === today ? att.used : 0;
                  const canFight = unlocked && usedToday < 1;
                  return (
                    <div key={raid.id} style={{
                      padding: "10px 12px", borderRadius: 10,
                      background: unlocked ? `${raid.color}06` : "#ffffff03",
                      border: `1px solid ${unlocked ? raid.color + "20" : "#ffffff06"}`,
                      opacity: unlocked ? 1 : 0.4,
                    }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{ width: 42, height: 42, borderRadius: 10, background: `${raid.color}12`, border: `1px solid ${raid.color}25`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, flexShrink: 0 }}>{raid.emoji}</div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 12, fontWeight: 700, color: unlocked ? T.white : T.textDim }}>{raid.name}</div>
                          <div style={{ fontSize: 8, color: T.textDim }}>HP: {fmt(raid.hp)} • ATK: {fmt(raid.atk)} • DEF: {fmt(raid.def)} • ⏱️{raid.timeLimit}s</div>
                          <div style={{ fontSize: 8, color: raid.color, fontWeight: 700, marginTop: 1 }}>💎{raid.reward.diamonds} 🪙{fmt(raid.reward.gold)} ✦{raid.reward.souls} souls</div>
                        </div>
                        <div style={{ flexShrink: 0 }}>
                          {!unlocked ? (
                            <div style={{ padding: "5px 8px", borderRadius: 6, background: "#ffffff06", fontSize: 8, color: T.textDim, fontWeight: 700 }}>Stage {raid.minStage}</div>
                          ) : usedToday >= 1 ? (
                            <div style={{ padding: "5px 8px", borderRadius: 6, background: "#ffffff06", fontSize: 8, color: T.textDim, fontWeight: 700 }}>Done today</div>
                          ) : (
                            <div onClick={() => attemptRaid(raid.id)} style={{
                              padding: "5px 12px", borderRadius: 6, cursor: "pointer",
                              background: `${raid.color}18`, border: `1px solid ${raid.color}30`,
                              fontSize: 10, fontWeight: 800, color: raid.color, fontFamily: FONT_DISPLAY,
                            }}>⚔️ FIGHT</div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ═══ QUESTS ═══ */}
          {page === "quests" && (
            <div>
              {/* Daily quest header */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                <div style={{ fontSize: 13, fontWeight: 900, color: T.white, fontFamily: FONT_DISPLAY }}>📋 DAILY QUESTS</div>
                <div style={{ fontSize: 8, color: T.textDim, fontWeight: 700 }}>Resets at midnight</div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 18 }}>
                {DAILY_QUESTS.map(q => {
                  const prog = questProgress.daily?.[q.stat] || 0;
                  const done = prog >= q.target;
                  const claimed = questProgress.claimedDaily?.[q.id];
                  const pct = Math.min(100, (prog / q.target) * 100);
                  return (
                    <div key={q.id} style={{
                      display: "flex", alignItems: "center", gap: 8, padding: "8px 10px",
                      borderRadius: 8, background: claimed ? "#ffffff04" : done ? `${q.color}08` : "#ffffff04",
                      border: `1px solid ${claimed ? "#ffffff06" : done ? q.color + "25" : "#ffffff08"}`,
                      opacity: claimed ? 0.5 : 1,
                    }}>
                      <div style={{ width: 32, height: 32, borderRadius: 8, background: `${q.color}12`, border: `1px solid ${q.color}20`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0 }}>{q.icon}</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: T.white }}>{q.name}</div>
                        <div style={{ fontSize: 8, color: T.textDim }}>{q.desc.replace("{n}", q.target)}</div>
                        {/* Progress bar */}
                        <div style={{ height: 4, background: "#ffffff08", borderRadius: 99, overflow: "hidden", marginTop: 3 }}>
                          <div style={{ width: `${pct}%`, height: "100%", background: done ? T.success : q.color, borderRadius: 99, transition: "width 0.3s" }} />
                        </div>
                        <div style={{ fontSize: 7, color: done ? T.success : T.textDim, fontWeight: 700, marginTop: 1 }}>{Math.min(prog, q.target)}/{q.target}{claimed ? " ✓ Claimed" : ""}</div>
                      </div>
                      <div style={{ flexShrink: 0 }}>
                        {claimed ? (
                          <div style={{ padding: "4px 8px", borderRadius: 6, background: "#ffffff06", fontSize: 9, color: T.textDim, fontWeight: 700 }}>Done</div>
                        ) : done ? (
                          <div onClick={() => claimQuest(q.id, false)} style={{
                            padding: "4px 10px", borderRadius: 6, cursor: "pointer",
                            background: `${T.success}18`, border: `1px solid ${T.success}30`,
                            fontSize: 9, fontWeight: 800, color: T.success, fontFamily: FONT_DISPLAY,
                            animation: "pulse 1.5s infinite",
                          }}>💎+{q.reward.diamonds}</div>
                        ) : (
                          <div style={{ padding: "4px 8px", borderRadius: 6, background: "#ffffff06", fontSize: 9, color: T.textDim, fontWeight: 700 }}>💎+{q.reward.diamonds}</div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Weekly quests */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                <div style={{ fontSize: 13, fontWeight: 900, color: T.white, fontFamily: FONT_DISPLAY }}>🏅 WEEKLY QUESTS</div>
                <div style={{ fontSize: 8, color: T.textDim, fontWeight: 700 }}>Resets Monday</div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 18 }}>
                {WEEKLY_QUESTS.map(q => {
                  const prog = questProgress.weekly?.[q.stat] || 0;
                  const done = prog >= q.target;
                  const claimed = questProgress.claimedWeekly?.[q.id];
                  const pct = Math.min(100, (prog / q.target) * 100);
                  return (
                    <div key={q.id} style={{
                      display: "flex", alignItems: "center", gap: 8, padding: "8px 10px",
                      borderRadius: 8, background: claimed ? "#ffffff04" : done ? `${q.color}08` : "#ffffff04",
                      border: `1px solid ${claimed ? "#ffffff06" : done ? q.color + "25" : "#ffffff08"}`,
                      opacity: claimed ? 0.5 : 1,
                    }}>
                      <div style={{ width: 32, height: 32, borderRadius: 8, background: `${q.color}12`, border: `1px solid ${q.color}20`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0 }}>{q.icon}</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: T.white }}>{q.name}</div>
                        <div style={{ fontSize: 8, color: T.textDim }}>{q.desc.replace("{n}", q.target)}</div>
                        <div style={{ height: 4, background: "#ffffff08", borderRadius: 99, overflow: "hidden", marginTop: 3 }}>
                          <div style={{ width: `${pct}%`, height: "100%", background: done ? T.success : q.color, borderRadius: 99, transition: "width 0.3s" }} />
                        </div>
                        <div style={{ fontSize: 7, color: done ? T.success : T.textDim, fontWeight: 700, marginTop: 1 }}>{Math.min(prog, q.target)}/{q.target}{claimed ? " ✓ Claimed" : ""}</div>
                      </div>
                      <div style={{ flexShrink: 0 }}>
                        {claimed ? (
                          <div style={{ padding: "4px 8px", borderRadius: 6, background: "#ffffff06", fontSize: 9, color: T.textDim, fontWeight: 700 }}>Done</div>
                        ) : done ? (
                          <div onClick={() => claimQuest(q.id, true)} style={{
                            padding: "4px 10px", borderRadius: 6, cursor: "pointer",
                            background: `${T.success}18`, border: `1px solid ${T.success}30`,
                            fontSize: 9, fontWeight: 800, color: T.success, fontFamily: FONT_DISPLAY,
                            animation: "pulse 1.5s infinite",
                          }}>💎+{q.reward.diamonds}</div>
                        ) : (
                          <div style={{ padding: "4px 8px", borderRadius: 6, background: "#ffffff06", fontSize: 9, color: T.textDim, fontWeight: 700 }}>💎+{q.reward.diamonds}</div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Diamond income summary */}
              <div style={{ padding: "10px 12px", borderRadius: 10, background: "#ffffff04", border: "1px solid #ffffff08" }}>
                <div style={{ fontSize: 11, fontWeight: 900, color: T.white, fontFamily: FONT_DISPLAY, marginBottom: 6 }}>💎 DIAMOND INCOME</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4 }}>
                  {[
                    { src: "Passive", val: "1/min" },
                    { src: "Daily Quests", val: `${DAILY_QUESTS.reduce((a, q) => a + q.reward.diamonds, 0)}/day` },
                    { src: "Weekly Quests", val: `${WEEKLY_QUESTS.reduce((a, q) => a + q.reward.diamonds, 0)}/week` },
                    { src: "Stage Clear", val: "Every 10 stages" },
                    { src: "Dungeons", val: "Gem Mine" },
                    { src: "Achievements", val: "One-time" },
                  ].map((s, i) => (
                    <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "3px 6px", fontSize: 8, color: T.textDim }}>
                      <span>{s.src}</span>
                      <span style={{ color: "#60a5fa", fontWeight: 700 }}>{s.val}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ═══ DUNGEONS ═══ */}
          {page === "dungeons" && (
            <div>
              <PageTitle icon="🏰" title="DUNGEONS" subtitle="Daily resource dungeons — clear waves for rewards" />

              {/* Daily reset notice */}
              <Card accent={T.orange} style={{ marginBottom: 18 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <span style={{ fontSize: 24 }}>🔄</span>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: T.white }}>Attempts reset daily at midnight</div>
                    <div style={{ fontSize: 11, color: T.textSec }}>Higher stage progress unlocks harder tiers with better rewards</div>
                  </div>
                </div>
              </Card>

              {/* Dungeon list */}
              <div style={{ display: "grid", gap: 18 }}>
                {DUNGEONS.map(dg => {
                  const attLeft = getDungeonAttemptsLeft(dg.id);
                  return (
                    <Card key={dg.id} accent={dg.color} style={{ background: dg.bgGrad }}>
                      {/* Dungeon header */}
                      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 16 }}>
                        <div style={{
                          width: 56, height: 56, borderRadius: 14,
                          background: `${dg.color}15`, border: `2px solid ${dg.color}30`,
                          display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28,
                          boxShadow: `0 0 16px ${dg.color}12`,
                        }}>{dg.emoji}</div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 18, fontWeight: 900, color: T.white, fontFamily: FONT_DISPLAY }}>{dg.name}</div>
                          <div style={{ fontSize: 11, color: T.textSec }}>{dg.desc}</div>
                        </div>
                        <div style={{ textAlign: "right" }}>
                          <div style={{
                            fontSize: 16, fontWeight: 900, fontFamily: FONT_DISPLAY,
                            color: attLeft > 0 ? dg.color : T.textDim,
                          }}>{attLeft}/{dg.maxAttempts}</div>
                          <div style={{ fontSize: 9, color: T.textDim, fontWeight: 600 }}>ATTEMPTS</div>
                        </div>
                      </div>

                      {/* Tiers */}
                      <div style={{ display: "grid", gap: 8 }}>
                        {dg.tiers.map((tier, ti) => {
                          const unlocked = highestStage >= tier.minStage;
                          const power = totalAtk + totalDef + totalMaxHp;
                          const canWin = power >= tier.powerReq;
                          const powerPct = Math.min(100, Math.floor((power / tier.powerReq) * 100));

                          return (
                            <div key={ti} style={{
                              display: "flex", alignItems: "center", gap: 12, padding: "12px 14px",
                              borderRadius: T.rs, background: unlocked ? `${dg.color}06` : T.bgDeep,
                              border: `1px solid ${unlocked ? dg.color + "20" : T.divider}`,
                              opacity: unlocked ? 1 : 0.4,
                            }}>
                              {/* Tier info */}
                              <div style={{ flex: 1 }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                                  <span style={{ fontSize: 13, fontWeight: 800, color: unlocked ? T.white : T.textDim, fontFamily: FONT_DISPLAY }}>{tier.name}</span>
                                  {!unlocked && <Badge color={T.textDim}>Stage {tier.minStage}+</Badge>}
                                  {unlocked && canWin && <Badge color={T.success} style={{ fontSize: 8 }}>CLEARABLE</Badge>}
                                </div>
                                <div style={{ fontSize: 10, color: T.textSec }}>
                                  {tier.enemies} waves • Power: {fmt(tier.powerReq)}
                                  {tier.reward.gold && ` • 💰 ${fmt(tier.reward.gold)}`}
                                  {tier.reward.diamonds && ` • 💎 ${tier.reward.diamonds}`}
                                  {tier.reward.growthLevels && ` • 📊 +${tier.reward.growthLevels} levels`}
                                </div>
                                {/* Power comparison bar */}
                                {unlocked && (
                                  <div style={{ marginTop: 6, maxWidth: 200 }}>
                                    <ProgressBar value={Math.min(power, tier.powerReq)} max={tier.powerReq}
                                      color={canWin ? T.success : powerPct > 60 ? T.warning : T.danger}
                                      height={4} labelRight={`${powerPct}%`} />
                                  </div>
                                )}
                              </div>

                              {/* Run button */}
                              <Btn small
                                color={unlocked && attLeft > 0 ? dg.color : T.textDim}
                                disabled={!unlocked || attLeft <= 0}
                                onClick={() => runDungeon(dg.id, ti)}
                              >
                                {!unlocked ? "🔒" : attLeft <= 0 ? "No Tries" : "⚔️ Enter"}
                              </Btn>
                            </div>
                          );
                        })}
                      </div>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}

          {/* ═══ GROWTH ═══ */}
          {page === "growth" && (
            <div>
              {/* Stat upgrade rows — compact for bottom panel */}
              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 14 }}>
                {[
                  { stat: "atk", label: "Attack", icon: "⚔️", color: T.danger, desc: "+3 ATK/lv", val: baseAtk },
                  { stat: "hp", label: "Health", icon: "❤️", color: T.success, desc: "+20 HP/lv", val: baseHp },
                  { stat: "def", label: "Defense", icon: "🛡️", color: T.info, desc: "+2 DEF/lv", val: baseDef },
                ].map(g => {
                  const cost = growthCost(growth[g.stat]);
                  const ok = gold >= cost;
                  return (
                    <div key={g.stat} style={{
                      display: "flex", alignItems: "center", gap: 10, padding: "10px 12px",
                      borderRadius: 10, background: `${g.color}06`, border: `1px solid ${g.color}15`,
                    }}>
                      <div style={{ width: 38, height: 38, borderRadius: 10, background: `${g.color}12`, border: `1px solid ${g.color}25`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>{g.icon}</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
                          <span style={{ fontSize: 13, fontWeight: 900, color: T.white, fontFamily: FONT_DISPLAY }}>{g.label}</span>
                          <span style={{ fontSize: 11, fontWeight: 800, color: g.color, fontFamily: FONT_DISPLAY }}>Lv.{growth[g.stat]}</span>
                        </div>
                        <div style={{ fontSize: 9, color: T.textDim }}>{g.val} • {g.desc}</div>
                      </div>
                      <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                        <div onClick={ok ? () => upgradeGrowth(g.stat) : undefined} style={{
                          padding: "6px 10px", borderRadius: 7, cursor: ok ? "pointer" : "default",
                          background: ok ? `${g.color}18` : "#ffffff06",
                          border: `1px solid ${ok ? g.color + "30" : "#ffffff08"}`,
                          fontSize: 9, fontWeight: 800, color: ok ? g.color : T.textDim, fontFamily: FONT_DISPLAY,
                          transition: "all 0.15s",
                        }}>+1 🪙{fmt(cost)}</div>
                        <div onClick={ok ? () => upgradeGrowthMax(g.stat) : undefined} style={{
                          padding: "6px 8px", borderRadius: 7, cursor: ok ? "pointer" : "default",
                          background: ok ? `${g.color}10` : "#ffffff04",
                          border: `1px solid ${ok ? g.color + "20" : "#ffffff06"}`,
                          fontSize: 9, fontWeight: 800, color: ok ? g.color : T.textDim, fontFamily: FONT_DISPLAY,
                        }}>MAX</div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Power overview — compact grid */}
              <div style={{ padding: "10px 12px", borderRadius: 10, background: "#ffffff04", border: "1px solid #ffffff08", marginBottom: 14 }}>
                <div style={{ fontSize: 11, fontWeight: 900, color: T.white, fontFamily: FONT_DISPLAY, marginBottom: 8 }}>⚡ TOTAL POWER — <span style={{ color: T.accent }}>{fmt(totalAtk + totalDef + totalMaxHp)} CP</span></div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6 }}>
                  {[
                    { l: "ATK", v: fmt(totalAtk), c: T.danger }, { l: "DEF", v: fmt(totalDef), c: T.info },
                    { l: "HP", v: fmt(totalMaxHp), c: T.success }, { l: "Crit%", v: `${critRate}%`, c: T.orange },
                    { l: "CritDMG", v: `${critDmg}%`, c: T.warning }, { l: "Gold+", v: `+${Math.floor((goldMult - 1) * 100)}%`, c: T.gold },
                  ].map((s, i) => (
                    <div key={i} style={{ textAlign: "center", padding: "8px 4px", borderRadius: 7, background: "#0a0c14", border: "1px solid #ffffff06" }}>
                      <div style={{ fontSize: 14, fontWeight: 900, color: s.c, fontFamily: FONT_DISPLAY }}>{s.v}</div>
                      <div style={{ fontSize: 7, color: T.textDim, fontWeight: 700 }}>{s.l}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Skills — compact */}
              <div style={{ padding: "10px 12px", borderRadius: 10, background: "#ffffff04", border: "1px solid #ffffff08" }}>
                <div style={{ fontSize: 11, fontWeight: 900, color: T.white, fontFamily: FONT_DISPLAY, marginBottom: 8 }}>⚡ SKILLS</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {COMBAT_SKILLS.map(sk => {
                    const unlocked = unlockedSkills.includes(sk.id);
                    const isEq = equippedSkills.includes(sk.id);
                    return (
                      <div key={sk.id} style={{
                        display: "flex", alignItems: "center", gap: 8, padding: "8px 10px",
                        borderRadius: 8, background: unlocked ? `${sk.color}06` : "#0a0c14",
                        border: `1px solid ${unlocked ? sk.color + "15" : "#ffffff06"}`,
                        opacity: unlocked ? 1 : 0.35,
                      }}>
                        <span style={{ fontSize: 18 }}>{sk.emoji}</span>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 11, fontWeight: 700, color: unlocked ? sk.color : T.textDim }}>{sk.name}</div>
                          <div style={{ fontSize: 8, color: T.textDim }}>{sk.desc} • {sk.cooldown / 1000}s cd</div>
                        </div>
                        {unlocked ? (
                          <div onClick={() => {
                            if (isEq) setEquippedSkills(p => p.map(s => s === sk.id ? null : s));
                            else setEquippedSkills(p => { const i = p.indexOf(null); if (i >= 0) { const n = [...p]; n[i] = sk.id; return n; } return p; });
                          }} style={{
                            padding: "4px 10px", borderRadius: 6, cursor: "pointer",
                            background: isEq ? `${T.danger}15` : `${T.success}15`,
                            border: `1px solid ${isEq ? T.danger + "30" : T.success + "30"}`,
                            fontSize: 9, fontWeight: 800, color: isEq ? T.danger : T.success, fontFamily: FONT_DISPLAY,
                          }}>{isEq ? "Remove" : "Equip"}</div>
                        ) : <span style={{ fontSize: 8, color: T.textDim, fontWeight: 700 }}>Stage {sk.unlockStage}</span>}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* ═══ EQUIPMENT ═══ */}
          {page === "equipment" && (
            <div>
              <PageTitle icon="🎒" title="EQUIPMENT" subtitle={`${equipment.length} items owned`} />
              <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
                <Btn color={T.accent} onClick={quickEquipBest}>Auto-Equip Best</Btn>
              </div>
              <Card style={{ marginBottom: 18 }}>
                <div style={{ fontSize: 14, fontWeight: 800, color: T.white, marginBottom: 14, fontFamily: FONT_DISPLAY }}>EQUIPPED GEAR</div>
                <div style={{ display: "grid", gridTemplateColumns: `repeat(auto-fill, minmax(${isMobile ? "100%" : "190px"}, 1fr))`, gap: 8 }}>
                  {EQUIP_TYPES.map(slot => {
                    const eqId = equipped[slot.id];
                    const eq = eqId ? equipment.find(e => e.id === eqId) : null;
                    return (
                      <div key={slot.id} onClick={() => eq && unequipItem(slot.id)} style={{
                        padding: 13, borderRadius: T.rs, cursor: eq ? "pointer" : "default",
                        background: eq ? `${rarColor(eq.rarity)}06` : T.bgDeep,
                        border: `1px solid ${eq ? rarColor(eq.rarity) + "25" : T.divider}`,
                        transition: "all 0.15s",
                      }}>
                        <div style={{ fontSize: 9, fontWeight: 700, color: T.textDim, marginBottom: 5, textTransform: "uppercase", letterSpacing: 0.5 }}>{slot.name}</div>
                        {eq ? (<>
                          <div style={{ fontSize: 12, fontWeight: 700, color: rarColor(eq.rarity) }}>{eq.emoji} {eq.name} {eq.level > 0 ? <span style={{ color: T.gold, fontSize: 10 }}>+{eq.level}</span> : ""}</div>
                          <div style={{ fontSize: 9, color: T.textSec, marginTop: 2 }}>
                            {Object.entries(eq.stats).map(([k, v]) => {
                              const bonus = eq.level ? Math.floor(v * eq.level * 0.08) : 0;
                              return `+${v + bonus} ${k}`;
                            }).join(" • ")}
                          </div>
                          <div style={{ display: "flex", gap: 4, marginTop: 5 }}>
                            {(() => {
                              const maxLvl = 50 + (eq.rarityIdx || 0) * 10;
                              const cost = enhanceCost(eq.level || 0, eq.rarityIdx || 0);
                              const canE = gold >= cost && (eq.level || 0) < maxLvl;
                              return (eq.level || 0) < maxLvl ? (<>
                                <div onClick={(e) => { e.stopPropagation(); canE && enhanceEquipment(eq.id); }} style={{ padding: "3px 7px", borderRadius: 5, cursor: canE ? "pointer" : "default", background: canE ? `${T.gold}15` : "#ffffff06", border: `1px solid ${canE ? T.gold + "25" : "#ffffff08"}`, fontSize: 8, fontWeight: 800, color: canE ? T.gold : T.textDim, fontFamily: FONT_DISPLAY }}>+1 🪙{fmt(cost)}</div>
                                <div onClick={(e) => { e.stopPropagation(); canE && enhanceEquipmentMax(eq.id); }} style={{ padding: "3px 5px", borderRadius: 5, cursor: canE ? "pointer" : "default", background: canE ? `${T.gold}10` : "#ffffff04", border: `1px solid ${canE ? T.gold + "15" : "#ffffff06"}`, fontSize: 8, fontWeight: 800, color: canE ? T.gold : T.textDim, fontFamily: FONT_DISPLAY }}>MAX</div>
                              </>) : <div style={{ fontSize: 8, color: T.gold, fontWeight: 800 }}>MAX ENHANCED</div>;
                            })()}
                          </div>
                        </>) : <div style={{ fontSize: 11, color: T.textDim }}>{slot.emoji} Empty</div>}
                      </div>
                    );
                  })}
                </div>
                {/* Accessory slots */}
                <div style={{ fontSize: 12, fontWeight: 800, color: T.teal, marginTop: 14, marginBottom: 8, fontFamily: FONT_DISPLAY }}>ACCESSORIES</div>
                <div style={{ display: "grid", gridTemplateColumns: `repeat(auto-fill, minmax(${isMobile ? "100%" : "190px"}, 1fr))`, gap: 8 }}>
                  {ACCESSORY_TYPES.map(slot => {
                    const eqId = equipped[slot.id];
                    const eq = eqId ? accessories.find(e => e.id === eqId) : null;
                    return (
                      <div key={slot.id} onClick={() => eq && unequipItem(slot.id)} style={{
                        padding: 13, borderRadius: T.rs, cursor: eq ? "pointer" : "default",
                        background: eq ? `${rarColor(eq.rarity)}06` : T.bgDeep,
                        border: `1px solid ${eq ? rarColor(eq.rarity) + "25" : T.divider}`,
                      }}>
                        <div style={{ fontSize: 9, fontWeight: 700, color: T.teal, marginBottom: 5, textTransform: "uppercase" }}>{slot.name}</div>
                        {eq ? (<>
                          <div style={{ fontSize: 12, fontWeight: 700, color: rarColor(eq.rarity) }}>{eq.emoji} {eq.name} {eq.level > 0 ? <span style={{ color: T.gold, fontSize: 10 }}>+{eq.level}</span> : ""}</div>
                          <div style={{ fontSize: 9, color: T.textSec, marginTop: 2 }}>{Object.entries(eq.stats).map(([k, v]) => `+${v} ${k}`).join(" • ")}</div>
                        </>) : <div style={{ fontSize: 11, color: T.textDim }}>{slot.emoji} Empty</div>}
                      </div>
                    );
                  })}
                </div>
              </Card>

              {/* Accessory inventory */}
              {accessories.length > 0 && (
                <Card style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: 13, fontWeight: 800, color: T.teal, marginBottom: 10, fontFamily: FONT_DISPLAY }}>👂 ACCESSORIES ({accessories.filter(a => !Object.values(equipped).includes(a.id)).length})</div>
                  <div style={{ display: "grid", gridTemplateColumns: `repeat(auto-fill, minmax(${isMobile ? "100%" : "200px"}, 1fr))`, gap: 6 }}>
                    {accessories.filter(a => !Object.values(equipped).includes(a.id)).sort((a, b) => b.rarityIdx - a.rarityIdx).map(eq => (
                      <div key={eq.id} onClick={() => equipItem(eq.id)} style={{
                        padding: 10, borderRadius: T.rs, cursor: "pointer",
                        background: `${rarColor(eq.rarity)}05`, border: `1px solid ${rarColor(eq.rarity)}18`,
                      }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span style={{ fontSize: 16 }}>{eq.emoji}</span>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 11, fontWeight: 700, color: rarColor(eq.rarity) }}>{eq.name}</div>
                            <div style={{ fontSize: 9, color: T.textSec }}>{Object.entries(eq.stats).map(([k, v]) => `+${v} ${k}`).join(" • ")}</div>
                          </div>
                          <Badge color={rarColor(eq.rarity)}>{RARITIES.find(r => r.id === eq.rarity)?.name?.[0]}</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              )}

              {EQUIP_TYPES.map(type => {
                const items = equipment.filter(e => e.type === type.id && !Object.values(equipped).includes(e.id));
                if (items.length === 0) return null;
                const byR = {}; items.forEach(e => { byR[e.rarity] = (byR[e.rarity] || 0) + 1; });
                return (
                  <Card key={type.id} style={{ marginBottom: 12 }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10, flexWrap: "wrap", gap: 6 }}>
                      <div style={{ fontSize: 13, fontWeight: 800, color: T.white, fontFamily: FONT_DISPLAY }}>{type.emoji} {type.name.toUpperCase()}S ({items.length})</div>
                      <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                        {RARITIES.slice(0, -1).map(r => (byR[r.id] || 0) >= 5 ? (
                          <Btn key={r.id} small color={r.color} onClick={() => mergeEquipment(type.id, r.id)}>Merge {r.name} ({byR[r.id]}/5)</Btn>
                        ) : null)}
                      </div>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: `repeat(auto-fill, minmax(${isMobile ? "100%" : "210px"}, 1fr))`, gap: 6 }}>
                      {items.sort((a, b) => b.rarityIdx - a.rarityIdx).map(eq => (
                        <div key={eq.id} onClick={() => equipItem(eq.id)} style={{
                          padding: 10, borderRadius: T.rs, cursor: "pointer",
                          background: `${rarColor(eq.rarity)}05`, border: `1px solid ${rarColor(eq.rarity)}18`, transition: "all 0.15s",
                        }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <span style={{ fontSize: 16 }}>{eq.emoji}</span>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontSize: 11, fontWeight: 700, color: rarColor(eq.rarity) }}>{eq.name}</div>
                              <div style={{ fontSize: 9, color: T.textSec }}>{Object.entries(eq.stats).map(([k, v]) => `+${v} ${k}`).join(" • ")}</div>
                            </div>
                            <Badge color={rarColor(eq.rarity)}>{RARITIES.find(r => r.id === eq.rarity)?.name?.[0]}</Badge>
                            <span onClick={(e) => { e.stopPropagation(); toggleLock(eq.id); }} style={{ cursor: "pointer", fontSize: 11, opacity: lockedEquipment[eq.id] ? 1 : 0.2 }}>{lockedEquipment[eq.id] ? "\uD83D\uDD12" : "\uD83D\uDD13"}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </Card>
                );
              })}

              {equipment.filter(e => !Object.values(equipped).includes(e.id)).length === 0 && (
                <Card style={{ textAlign: "center", padding: 40 }}>
                  <div style={{ fontSize: 36, marginBottom: 8 }}>🎒</div>
                  <div style={{ fontSize: 13, color: T.textSec }}>No equipment yet — visit the Summon page!</div>
                </Card>
              )}
            </div>
          )}

          {/* ═══ SUMMON ═══ */}
          {page === "summon" && (
            <div>
              <PageTitle icon="✨" title="SUMMON" subtitle="Spend diamonds for powerful gear" />

              {/* Gacha Banner Level */}
              <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", borderRadius: 8, background: `${gachaLevel.color}08`, border: `1px solid ${gachaLevel.color}20`, marginBottom: 12 }}>
                <div style={{ width: 32, height: 32, borderRadius: "50%", background: `${gachaLevel.color}15`, border: `2px solid ${gachaLevel.color}40`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 900, color: gachaLevel.color, fontFamily: FONT_DISPLAY }}>Lv{gachaLevel.level}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: gachaLevel.color }}>{gachaLevel.label} Banner</div>
                  <div style={{ fontSize: 8, color: T.textDim }}>Rarity boost: +{gachaLevel.bonus}% • {stats.summons || 0} total summons</div>
                </div>
                {(() => { const next = GACHA_LEVELS.find(g => g.summons > (stats.summons || 0)); return next ? <div style={{ fontSize: 8, color: T.textDim }}>Next: {next.summons - (stats.summons || 0)} more</div> : <div style={{ fontSize: 8, color: T.gold, fontWeight: 700 }}>MAX</div>; })()}
              </div>
              <Card glow={T.purple} style={{ marginBottom: 18, padding: isMobile ? 24 : 32, textAlign: "center", position: "relative", overflow: "hidden" }}>
                <div style={{ position: "absolute", top: -30, left: "50%", transform: "translateX(-50%)", width: 200, height: 200, borderRadius: "50%", background: `${T.purple}08`, filter: "blur(60px)" }} />
                <div style={{ fontSize: 56, marginBottom: 14, position: "relative" }}>✨</div>
                <div style={{ fontSize: 14, color: T.textSec, marginBottom: 20, position: "relative" }}>Random equipment with a chance at legendary and god tier!</div>
                <div style={{ display: "flex", gap: 6, justifyContent: "center", flexWrap: "wrap", marginBottom: 20 }}>
                  {RARITIES.map(r => <Badge key={r.id} color={r.color}>{r.name} {r.weight}%</Badge>)}
                </div>
                <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap", position: "relative" }}>
                  <Btn color={T.purple} disabled={diamonds < 100} onClick={() => summonEquipment(1)}>Summon ×1 (💎100)</Btn>
                  <Btn color={T.gold} disabled={diamonds < 900} onClick={() => summonEquipment(10)}>Summon ×10 (💎900)</Btn>
                </div>
                <div style={{ fontSize: 11, color: T.textDim, marginTop: 12 }}>💎 {fmt(diamonds)} diamonds • {stats.summons || 0} total summons</div>
              </Card>

              {showSummonResult && (
                <Card glow={T.purple} style={{ marginBottom: 18 }}>
                  <div style={{ fontSize: 15, fontWeight: 900, color: T.white, marginBottom: 14, textAlign: "center", fontFamily: FONT_DISPLAY }}>🎉 SUMMON RESULTS</div>
                  <div style={{ display: "grid", gridTemplateColumns: `repeat(auto-fill, minmax(${isMobile ? "120px" : "160px"}, 1fr))`, gap: 8 }}>
                    {showSummonResult.map((eq, i) => (
                      <div key={i} style={{
                        padding: 14, borderRadius: T.rs, textAlign: "center",
                        background: `${rarColor(eq.rarity)}08`, border: `1px solid ${rarColor(eq.rarity)}25`,
                        animation: `slideUp 0.3s ease ${i * 0.05}s both`,
                      }}>
                        <div style={{ fontSize: 26, marginBottom: 4 }}>{eq.emoji}</div>
                        <div style={{ fontSize: 11, fontWeight: 700, color: rarColor(eq.rarity) }}>{eq.name}</div>
                        <div style={{ fontSize: 9, color: T.textSec }}>{RARITIES.find(r => r.id === eq.rarity)?.name}</div>
                        <div style={{ fontSize: 9, color: T.textDim, marginTop: 3 }}>{Object.entries(eq.stats).map(([k, v]) => `+${v} ${k}`).join(", ")}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{ textAlign: "center", marginTop: 14 }}><Btn small onClick={() => setShowSummonResult(null)}>Close</Btn></div>
                </Card>
              )}

              <Card>
                <div style={{ fontSize: 14, fontWeight: 800, color: T.white, marginBottom: 8, fontFamily: FONT_DISPLAY }}>🔨 MERGE SYSTEM</div>
                <div style={{ fontSize: 12, color: T.textSec }}>Combine 5 same-type same-rarity equipment → 1 of the next rarity tier. Visit Equipment page to merge!</div>
              </Card>

              {/* Accessory Summon Banner */}
              <Card glow={T.teal} style={{ marginTop: 14, padding: isMobile ? 20 : 28, textAlign: "center", position: "relative", overflow: "hidden" }}>
                <div style={{ position: "absolute", top: -20, left: "50%", transform: "translateX(-50%)", width: 160, height: 160, borderRadius: "50%", background: `${T.teal}08`, filter: "blur(50px)" }} />
                <div style={{ fontSize: 36, marginBottom: 8, position: "relative" }}>👂📿⌚</div>
                <div style={{ fontSize: 13, fontWeight: 900, color: T.white, fontFamily: FONT_DISPLAY, marginBottom: 4, position: "relative" }}>ACCESSORY SUMMON</div>
                <div style={{ fontSize: 11, color: T.textSec, marginBottom: 14, position: "relative" }}>Earrings, necklaces & bracelets with PEN, ACU & SPD stats</div>
                <div style={{ display: "flex", gap: 6, justifyContent: "center", flexWrap: "wrap", marginBottom: 12, position: "relative", fontSize: 9, color: T.textDim }}>
                  <span>PEN = Ignore enemy DEF%</span> • <span>ACU = Bonus accuracy</span> • <span>SPD = Faster attacks</span>
                </div>
                <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap", position: "relative" }}>
                  <Btn color={T.teal} disabled={diamonds < 150} onClick={() => summonAccessories(1)}>Summon ×1 (💎150)</Btn>
                  <Btn color={T.gold} disabled={diamonds < 1350} onClick={() => summonAccessories(10)}>Summon ×10 (💎1350)</Btn>
                </div>
                <div style={{ fontSize: 10, color: T.textDim, marginTop: 8, position: "relative" }}>{accessories.length} accessories owned</div>
              </Card>
            </div>
          )}

          {/* ═══ PETS ═══ */}
          {page === "pets" && (
            <div>
              <PageTitle icon="🐾" title="PETS" subtitle="Companions that boost your stats" />
              <Card style={{ marginBottom: 18 }}>
                <div style={{ fontSize: 14, fontWeight: 800, color: T.white, marginBottom: 12, fontFamily: FONT_DISPLAY }}>ACTIVE ({activePets.length}/{petSlots})</div>
                {activePets.length === 0 ? <div style={{ fontSize: 11, color: T.textDim }}>No active pets. Equip a pet for bonuses!</div> : (
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {activePets.map(pn => {
                      const pd = PET_DEFS.find(p => p.name === pn);
                      return pd ? (
                        <div key={pn} style={{ padding: 12, borderRadius: T.rs, background: `${rarColor(pd.rarity)}08`, border: `1px solid ${rarColor(pd.rarity)}25`, display: "flex", alignItems: "center", gap: 8 }}>
                          <span style={{ fontSize: 22 }}>{pd.emoji}</span>
                          <div>
                            <div style={{ fontSize: 12, fontWeight: 700, color: rarColor(pd.rarity) }}>{pd.name}</div>
                            <div style={{ fontSize: 9, color: T.textSec }}>{Object.entries(pd.bonus).map(([k, v]) => `+${v}% ${k}`).join(", ")}</div>
                          </div>
                          <Btn small color={T.danger} onClick={() => setActivePets(p => p.filter(x => x !== pn))}>×</Btn>
                        </div>
                      ) : null;
                    })}
                  </div>
                )}
              </Card>
              <Card>
                <div style={{ fontSize: 14, fontWeight: 800, color: T.white, marginBottom: 12, fontFamily: FONT_DISPLAY }}>ALL PETS</div>
                {pets.length === 0 ? (
                  <div style={{ textAlign: "center", padding: 30 }}>
                    <div style={{ fontSize: 36, marginBottom: 8 }}>🐾</div>
                    <div style={{ fontSize: 12, color: T.textDim }}>No pets yet. Defeat bosses for a chance to earn one!</div>
                  </div>
                ) : (
                  <div style={{ display: "grid", gridTemplateColumns: `repeat(auto-fill, minmax(${isMobile ? "100%" : "220px"}, 1fr))`, gap: 8 }}>
                    {pets.map(pn => {
                      const pd = PET_DEFS.find(p => p.name === pn);
                      const active = activePets.includes(pn);
                      return pd ? (
                        <div key={pn} onClick={() => active ? setActivePets(p => p.filter(x => x !== pn)) : activePets.length < petSlots && setActivePets(p => [...p, pn])}
                          style={{ padding: 14, borderRadius: T.rs, cursor: "pointer", background: active ? `${rarColor(pd.rarity)}08` : T.bgDeep, border: `1px solid ${active ? rarColor(pd.rarity) + "35" : T.divider}`, transition: "all 0.15s" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            <span style={{ fontSize: 24 }}>{pd.emoji}</span>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontSize: 12, fontWeight: 700, color: rarColor(pd.rarity) }}>{pd.name} <span style={{ fontSize: 9, color: T.gold }}>Lv.{petLevels[pn] || 1}</span></div>
                              <div style={{ fontSize: 10, color: T.textSec }}>{Object.entries(pd.bonus).map(([k, v]) => `+${Math.floor(v * (1 + ((petLevels[pn] || 1) - 1) * 0.5))}% ${k}`).join(", ")}</div>
                            </div>
                            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 2 }}>
                              {active && <Badge color={T.success}>Active</Badge>}
                              {pets.filter(p => p === pn).length >= 2 && <div onClick={(e) => { e.stopPropagation(); levelUpPet(pn); }} style={{ padding: "2px 6px", borderRadius: 4, background: `${T.gold}15`, border: `1px solid ${T.gold}25`, fontSize: 8, fontWeight: 800, color: T.gold, cursor: "pointer" }}>LVL UP ({pets.filter(p => p === pn).length}x)</div>}
                            </div>
                          </div>
                        </div>
                      ) : null;
                    })}
                  </div>
                )}
              </Card>
            </div>
          )}

          {/* ═══ COSTUMES ═══ */}
          {page === "costumes" && (
            <div>
              <PageTitle icon="👗" title="COSTUMES" subtitle={`${ownedCostumes.length}/${COSTUMES.length} collected — equip a look, gain stat bonuses`} />

              {/* Current costume preview */}
              <Card glow={T.teal} style={{ marginBottom: 18, padding: isMobile ? 24 : 32 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 20, flexWrap: "wrap" }}>
                  <div style={{
                    width: 80, height: 80, borderRadius: "50%",
                    background: `radial-gradient(circle, ${T.teal}20 0%, transparent 70%)`,
                    border: `2px solid ${T.teal}40`, boxShadow: `0 0 30px ${T.teal}15`,
                    display: "flex", alignItems: "center", justifyContent: "center", fontSize: 40,
                    flexShrink: 0,
                  }}>{heroEmoji}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 18, fontWeight: 900, color: T.white, fontFamily: FONT_DISPLAY }}>
                      {COSTUMES.find(c => c.id === activeCostume)?.name || "Adventurer"}
                    </div>
                    <div style={{ fontSize: 11, color: T.textSec, marginTop: 2 }}>
                      {COSTUMES.find(c => c.id === activeCostume)?.desc}
                    </div>
                    {(() => {
                      const c = COSTUMES.find(x => x.id === activeCostume);
                      const bonusEntries = c ? Object.entries(c.bonuses).filter(([, v]) => v !== 0) : [];
                      return bonusEntries.length > 0 ? (
                        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8 }}>
                          {bonusEntries.map(([k, v]) => (
                            <Badge key={k} color={v > 0 ? T.success : T.danger}>
                              {v > 0 ? "+" : ""}{v}{k.includes("Pct") || k === "critRate" || k === "critDmg" || k === "goldPct" ? "%" : ""} {k.replace(/Flat|Pct/g, "").toUpperCase()}
                            </Badge>
                          ))}
                        </div>
                      ) : null;
                    })()}
                  </div>
                </div>
              </Card>

              {/* Set bonuses */}
              <Card style={{ marginBottom: 18 }}>
                <div style={{ fontSize: 14, fontWeight: 900, color: T.white, marginBottom: 12, fontFamily: FONT_DISPLAY }}>🏅 SET BONUSES</div>
                <div style={{ display: "grid", gridTemplateColumns: `repeat(auto-fill, minmax(${isMobile ? "100%" : "200px"}, 1fr))`, gap: 8 }}>
                  {COSTUME_SET_BONUSES.map(sb => {
                    const count = ownedCostumes.filter(cid => { const c = COSTUMES.find(x => x.id === cid); return c && c.rarity === sb.rarity; }).length;
                    const active = count >= sb.need;
                    return (
                      <div key={sb.rarity} style={{
                        padding: 12, borderRadius: T.rs,
                        background: active ? `${T.success}08` : T.bgDeep,
                        border: `1px solid ${active ? T.success + "30" : T.divider}`,
                      }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                          <span style={{ fontSize: 11, fontWeight: 700, color: active ? T.success : T.textDim }}>{sb.label}</span>
                          <Badge color={active ? T.success : T.textDim}>{count}/{sb.need}</Badge>
                        </div>
                        <div style={{ fontSize: 9, color: active ? T.textSec : T.textDim }}>
                          {Object.entries(sb.bonus).map(([k, v]) => `+${v}${k.includes("Pct") || k === "critRate" || k === "critDmg" || k === "goldPct" ? "%" : ""} ${k.replace(/Flat|Pct/g, "").toUpperCase()}`).join(", ")}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Card>

              {/* All costumes grid */}
              <div style={{ display: "grid", gridTemplateColumns: `repeat(auto-fill, minmax(${isMobile ? "100%" : "260px"}, 1fr))`, gap: 12 }}>
                {COSTUMES.map(c => {
                  const owned = ownedCostumes.includes(c.id);
                  const isActive = activeCostume === c.id;
                  const canAfford = diamonds >= c.cost;
                  const rc = rarColor(c.rarity);
                  const bonusEntries = Object.entries(c.bonuses).filter(([, v]) => v !== 0);

                  return (
                    <Card key={c.id} glow={isActive ? rc : undefined} hover style={{
                      position: "relative", overflow: "hidden",
                      opacity: !owned && !canAfford && c.cost > 0 ? 0.5 : 1,
                    }}>
                      {/* Rarity ribbon */}
                      <div style={{ position: "absolute", top: 10, right: -28, background: rc, color: "#000", fontSize: 8, fontWeight: 800, padding: "2px 32px", transform: "rotate(45deg)", letterSpacing: 0.5 }}>
                        {RARITIES.find(r => r.id === c.rarity)?.name?.toUpperCase()}
                      </div>

                      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 12 }}>
                        <div style={{
                          width: 54, height: 54, borderRadius: 14,
                          background: `${rc}12`, border: `2px solid ${isActive ? rc : rc + "30"}`,
                          display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28,
                          boxShadow: isActive ? `0 0 16px ${rc}25` : undefined,
                          transition: "all 0.2s",
                        }}>{c.emoji}</div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 14, fontWeight: 800, color: isActive ? rc : T.white, fontFamily: FONT_DISPLAY }}>{c.name}</div>
                          <div style={{ fontSize: 10, color: T.textSec }}>{c.desc}</div>
                        </div>
                      </div>

                      {/* Stat bonuses */}
                      {bonusEntries.length > 0 && (
                        <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginBottom: 12 }}>
                          {bonusEntries.map(([k, v]) => (
                            <Badge key={k} color={v > 0 ? T.success : T.danger} style={{ fontSize: 9 }}>
                              {v > 0 ? "+" : ""}{v}{k.includes("Pct") || k === "critRate" || k === "critDmg" || k === "goldPct" ? "%" : ""} {k.replace(/Flat|Pct/g, "")}
                            </Badge>
                          ))}
                        </div>
                      )}

                      {/* Actions */}
                      {isActive ? (
                        <Badge color={rc} style={{ padding: "5px 14px", fontSize: 11 }}>✓ Equipped</Badge>
                      ) : owned ? (
                        <Btn small color={rc} onClick={() => equipCostume(c.id)}>Equip</Btn>
                      ) : c.cost === 0 ? (
                        <Badge color={T.success}>Free</Badge>
                      ) : (
                        <Btn small color={canAfford ? T.purple : T.textDim} disabled={!canAfford} onClick={() => buyCostume(c.id)}>
                          Buy (💎{fmt(c.cost)})
                        </Btn>
                      )}
                    </Card>
                  );
                })}
              </div>
            </div>
          )}

          {/* ═══ RELICS & INSIGNIAS ═══ */}
          {page === "relics" && (
            <div>
              {/* Relics section */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                <div style={{ fontSize: 13, fontWeight: 900, color: T.white, fontFamily: FONT_DISPLAY }}>🏺 RELICS</div>
                <div style={{ fontSize: 8, color: T.textDim, fontWeight: 700 }}>Buy with 💎, upgrade with 🪙</div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 18 }}>
                {RELICS.map(r => {
                  const owned = ownedRelics[r.id] !== undefined;
                  const lvl = ownedRelics[r.id] || 0;
                  const maxed = lvl >= r.maxLvl;
                  const val = owned ? r.baseVal + (lvl - 1) * r.perLvl : r.baseVal;
                  const upgCost = owned ? relicUpgradeCost(lvl) : 0;
                  const canUpg = owned && !maxed && gold >= upgCost;
                  const canBuy = !owned && diamonds >= r.cost;
                  const statLabel = { atk: "ATK", def: "DEF", hp: "HP", critRate: "Crit%", critDmg: "CritDMG", goldPct: "Gold%", atkPct: "ATK%", defPct: "DEF%", hpPct: "HP%", allPct: "ALL%", allFlat: "ALL" }[r.baseStat] || r.baseStat;
                  return (
                    <div key={r.id} style={{
                      display: "flex", alignItems: "center", gap: 8, padding: "8px 10px",
                      borderRadius: 8,
                      background: owned ? `${r.color}06` : "#ffffff04",
                      border: `1px solid ${owned ? r.color + "20" : "#ffffff08"}`,
                      opacity: owned ? 1 : 0.7,
                    }}>
                      <div style={{ width: 36, height: 36, borderRadius: 10, background: `${r.color}12`, border: `1px solid ${r.color}25`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>{r.emoji}</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
                          <span style={{ fontSize: 11, fontWeight: 700, color: T.white }}>{r.name}</span>
                          {owned && <span style={{ fontSize: 9, fontWeight: 800, color: r.color, fontFamily: FONT_DISPLAY }}>Lv.{lvl}{maxed ? " MAX" : ""}</span>}
                        </div>
                        <div style={{ fontSize: 8, color: T.textDim }}>{r.desc}</div>
                        <div style={{ fontSize: 9, fontWeight: 700, color: r.color, marginTop: 1 }}>+{val} {statLabel}</div>
                      </div>
                      <div style={{ flexShrink: 0, display: "flex", gap: 3 }}>
                        {!owned ? (
                          <div onClick={canBuy ? () => buyRelic(r.id) : undefined} style={{
                            padding: "5px 10px", borderRadius: 6, cursor: canBuy ? "pointer" : "default",
                            background: canBuy ? `${r.color}15` : "#ffffff06",
                            border: `1px solid ${canBuy ? r.color + "30" : "#ffffff08"}`,
                            fontSize: 9, fontWeight: 800, color: canBuy ? r.color : T.textDim, fontFamily: FONT_DISPLAY,
                          }}>💎{r.cost}</div>
                        ) : maxed ? (
                          <div style={{ padding: "5px 8px", borderRadius: 6, background: `${T.gold}10`, border: `1px solid ${T.gold}20`, fontSize: 9, fontWeight: 800, color: T.gold, fontFamily: FONT_DISPLAY }}>MAX</div>
                        ) : (
                          <>
                            <div onClick={canUpg ? () => upgradeRelic(r.id) : undefined} style={{
                              padding: "5px 8px", borderRadius: 6, cursor: canUpg ? "pointer" : "default",
                              background: canUpg ? `${r.color}15` : "#ffffff06",
                              border: `1px solid ${canUpg ? r.color + "25" : "#ffffff08"}`,
                              fontSize: 8, fontWeight: 800, color: canUpg ? r.color : T.textDim, fontFamily: FONT_DISPLAY,
                            }}>+1 🪙{fmt(upgCost)}</div>
                            <div onClick={canUpg ? () => upgradeRelicMax(r.id) : undefined} style={{
                              padding: "5px 6px", borderRadius: 6, cursor: canUpg ? "pointer" : "default",
                              background: canUpg ? `${r.color}10` : "#ffffff04",
                              border: `1px solid ${canUpg ? r.color + "15" : "#ffffff06"}`,
                              fontSize: 8, fontWeight: 800, color: canUpg ? r.color : T.textDim, fontFamily: FONT_DISPLAY,
                            }}>MAX</div>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Insignias section */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                <div style={{ fontSize: 13, fontWeight: 900, color: T.white, fontFamily: FONT_DISPLAY }}>🎖️ INSIGNIAS</div>
                <div style={{ fontSize: 8, color: T.textDim, fontWeight: 700 }}>{Object.keys(earnedInsignias).length}/{INSIGNIAS.length} earned</div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {INSIGNIAS.map(ins => {
                  const earned = !!earnedInsignias[ins.id];
                  const bonusText = Object.entries(ins.bonus).map(([k, v]) => {
                    const label = { atkFlat: "ATK", defFlat: "DEF", hpFlat: "HP", atkPct: "ATK%", defPct: "DEF%", hpPct: "HP%", critRate: "Crit%", critDmg: "CritDMG", goldPct: "Gold%" }[k] || k;
                    return `+${v} ${label}`;
                  }).join(", ");
                  return (
                    <div key={ins.id} style={{
                      display: "flex", alignItems: "center", gap: 8, padding: "8px 10px",
                      borderRadius: 8,
                      background: earned ? `${ins.color}08` : "#ffffff03",
                      border: `1px solid ${earned ? ins.color + "20" : "#ffffff06"}`,
                      opacity: earned ? 1 : 0.4,
                    }}>
                      <div style={{
                        width: 32, height: 32, borderRadius: "50%",
                        background: earned ? `${ins.color}15` : "#ffffff06",
                        border: `2px solid ${earned ? ins.color + "40" : "#ffffff08"}`,
                        display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0,
                        boxShadow: earned ? `0 0 8px ${ins.color}15` : "none",
                      }}>{ins.emoji}</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: earned ? T.white : T.textDim }}>{ins.name}</div>
                        <div style={{ fontSize: 8, color: T.textDim }}>{ins.desc}</div>
                        <div style={{ fontSize: 9, fontWeight: 700, color: earned ? ins.color : T.textDim, marginTop: 1 }}>{bonusText}</div>
                      </div>
                      {earned && <div style={{ fontSize: 8, fontWeight: 800, color: T.success, fontFamily: FONT_DISPLAY }}>✓</div>}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ═══ ACHIEVEMENTS ═══ */}
          {page === "achievements" && <AchievementsPage achievementsUnlocked={achievementsUnlocked} isMobile={isMobile} />}

          {/* ═══ STATS ═══ */}
          {page === "stats" && (
            <div>
              <PageTitle icon="🏆" title="STATISTICS" subtitle="Your adventure at a glance" />
              <div style={{ display: "grid", gridTemplateColumns: `repeat(auto-fill, minmax(${isMobile ? "130px" : "150px"}, 1fr))`, gap: 10, marginBottom: 18 }}>
                {[
                  { i: "⏱️", v: timeStr, l: "TIME PLAYED", c: T.info },
                  { i: "📍", v: stageLabel(currentStage), l: "CURRENT STAGE", c: chapter.color },
                  { i: "🏔️", v: stageLabel(highestStage), l: "HIGHEST STAGE", c: T.gold },
                  { i: "💰", v: fmt(gold), l: "GOLD", c: T.gold },
                  { i: "💎", v: fmt(diamonds), l: "DIAMONDS", c: T.purple },
                  { i: "⚔️", v: fmt(combatStats.kills), l: "KILLS", c: T.danger },
                  { i: "🔥", v: String(stats.loginStreak || 0), l: "LOGIN STREAK", c: T.orange },
                  { i: "🎒", v: String(equipment.length), l: "EQUIPMENT", c: T.warning },
                  { i: "👗", v: `${ownedCostumes.length}/${COSTUMES.length}`, l: "COSTUMES", c: T.teal },
                  { i: "🏆", v: `${Object.keys(achievementsUnlocked).length}/${ACHIEVEMENTS.length}`, l: "ACHIEVEMENTS", c: T.gold },
                ].map((s, i) => (
                  <Card key={i} style={{ textAlign: "center", padding: 16 }}>
                    <div style={{ fontSize: 22, marginBottom: 4 }}>{s.i}</div>
                    <div style={{ fontSize: 18, fontWeight: 900, color: s.c, fontFamily: FONT_DISPLAY }}>{s.v}</div>
                    <div style={{ fontSize: 8, color: T.textDim, fontWeight: 700, letterSpacing: 0.5 }}>{s.l}</div>
                  </Card>
                ))}
              </div>
              <Card style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 14, fontWeight: 800, color: T.white, marginBottom: 10, fontFamily: FONT_DISPLAY }}>⚔️ COMBAT</div>
                <StatRow label="Monsters Killed" value={fmt(combatStats.kills)} color={T.danger} />
                <StatRow label="Bosses Killed" value={String(combatStats.bossesKilled || 0)} color={T.orange} />
                <StatRow label="Deaths" value={String(combatStats.deaths)} color={T.danger} />
                <StatRow label="Total Damage" value={fmt(combatStats.totalDamage)} color={T.orange} />
                <StatRow label="Highest Hit" value={fmt(combatStats.highestHit || 0)} color={T.gold} />
                <StatRow label="Total Gold Earned" value={fmt(combatStats.totalGoldEarned || 0)} color={T.gold} />
              </Card>
              <Card>
                <div style={{ fontSize: 14, fontWeight: 800, color: T.white, marginBottom: 10, fontFamily: FONT_DISPLAY }}>📈 GROWTH</div>
                <StatRow label="ATK Level" value={String(growth.atk)} color={T.danger} />
                <StatRow label="HP Level" value={String(growth.hp)} color={T.success} />
                <StatRow label="DEF Level" value={String(growth.def)} color={T.info} />
                <StatRow label="Summons" value={String(stats.summons || 0)} color={T.purple} />
                <StatRow label="Merges" value={String(stats.merges || 0)} color={T.purple} />
                <StatRow label="Pets Owned" value={String(pets.length)} color={T.pink} />
              </Card>
            </div>
          )}

          {/* ═══ EMBLEMS ═══ */}
          {page === "emblems" && (
            <div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 900, color: T.white, fontFamily: FONT_DISPLAY }}>🏅 EMBLEMS</div>
                  <div style={{ fontSize: 8, color: T.textDim }}>Earn marks from Training Dojo dungeon. Equip up to 3 emblems.</div>
                </div>
                <div style={{ padding: "5px 10px", borderRadius: 6, background: `${T.gold}10`, border: `1px solid ${T.gold}20`, fontSize: 10, fontWeight: 800, color: T.gold, fontFamily: FONT_DISPLAY }}>🏅 {emblemMarks} marks</div>
              </div>

              {/* Equipped slots */}
              <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
                {equippedEmblems.map((eid, slot) => {
                  const emb = eid ? EMBLEMS.find(e => e.id === eid) : null;
                  return (
                    <div key={slot} onClick={emb ? () => unequipEmblem(slot) : undefined} style={{
                      flex: 1, padding: 10, borderRadius: 8, textAlign: "center", cursor: emb ? "pointer" : "default",
                      background: emb ? `${emb.color}08` : "#ffffff04",
                      border: `1px solid ${emb ? emb.color + "25" : "#ffffff08"}`,
                    }}>
                      <div style={{ fontSize: 7, color: T.textDim, marginBottom: 3 }}>SLOT {slot + 1}</div>
                      {emb ? (<>
                        <div style={{ fontSize: 18 }}>{emb.emoji}</div>
                        <div style={{ fontSize: 9, fontWeight: 700, color: emb.color }}>{emb.name}</div>
                        <div style={{ fontSize: 7, color: emb.color }}>{Object.entries(emb.bonus).map(([k, v]) => `+${v} ${k}`).join(", ")}</div>
                      </>) : <div style={{ fontSize: 11, color: T.textDim }}>Empty</div>}
                    </div>
                  );
                })}
              </div>

              {/* All emblems */}
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {EMBLEMS.map(emb => {
                  const owned = !!unlockedEmblems[emb.id];
                  const equipped = equippedEmblems.includes(emb.id);
                  const canBuy = !owned && emblemMarks >= emb.marks;
                  const freeSlot = equippedEmblems.indexOf(null);
                  return (
                    <div key={emb.id} style={{
                      display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", borderRadius: 8,
                      background: equipped ? `${emb.color}10` : owned ? `${emb.color}05` : "#ffffff03",
                      border: `1px solid ${equipped ? emb.color + "30" : owned ? emb.color + "12" : "#ffffff06"}`,
                      opacity: owned ? 1 : 0.5,
                    }}>
                      <div style={{ width: 34, height: 34, borderRadius: 8, background: `${emb.color}15`, border: `2px solid ${owned ? emb.color + "40" : "#ffffff08"}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>{emb.emoji}</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: owned ? emb.color : T.textDim }}>{emb.name} <span style={{ fontSize: 8, color: T.textDim }}>Tier {emb.tier}</span></div>
                        <div style={{ fontSize: 8, color: emb.color }}>{Object.entries(emb.bonus).map(([k, v]) => `+${v} ${k}`).join(" • ")}</div>
                      </div>
                      {!owned ? (
                        <div onClick={canBuy ? () => unlockEmblem(emb.id) : undefined} style={{
                          padding: "4px 8px", borderRadius: 6, cursor: canBuy ? "pointer" : "default",
                          background: canBuy ? `${emb.color}15` : "#ffffff06",
                          border: `1px solid ${canBuy ? emb.color + "25" : "#ffffff08"}`,
                          fontSize: 8, fontWeight: 800, color: canBuy ? emb.color : T.textDim, fontFamily: FONT_DISPLAY,
                        }}>🏅{emb.marks}</div>
                      ) : equipped ? (
                        <div style={{ fontSize: 8, fontWeight: 800, color: T.success }}>EQUIPPED</div>
                      ) : freeSlot !== -1 ? (
                        <div onClick={() => equipEmblem(emb.id, freeSlot)} style={{
                          padding: "4px 8px", borderRadius: 6, cursor: "pointer",
                          background: `${emb.color}15`, border: `1px solid ${emb.color}25`,
                          fontSize: 8, fontWeight: 800, color: emb.color, fontFamily: FONT_DISPLAY,
                        }}>Equip</div>
                      ) : (
                        <div style={{ fontSize: 8, color: T.textDim }}>Slots full</div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ═══ BATTLE PASS ═══ */}
          {page === "battlepass" && (
            <div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 900, color: T.white, fontFamily: FONT_DISPLAY }}>🎖️ BATTLE PASS</div>
                  <div style={{ fontSize: 8, color: T.textDim }}>Earn XP from combat and summoning. Claim rewards each level!</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 14, fontWeight: 900, color: T.gold, fontFamily: FONT_DISPLAY }}>Lv {battlePassLevel}</div>
                  <div style={{ fontSize: 8, color: T.textDim }}>{battlePassXp}/{BP_XP_PER_LEVEL} XP</div>
                </div>
              </div>
              {/* XP bar */}
              <div style={{ position: "relative", height: 10, background: "#0e1020", borderRadius: 5, border: "1px solid #ffffff10", overflow: "hidden", marginBottom: 12 }}>
                <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: `${battlePassLevel >= BP_MAX_LEVEL ? 100 : (battlePassXp / BP_XP_PER_LEVEL) * 100}%`, background: "linear-gradient(90deg, #f59e0b, #fbbf24)", borderRadius: 4 }} />
              </div>
              {/* Reward track */}
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                {BATTLE_PASS_REWARDS.filter((_, i) => i < 15 || i >= battlePassLevel - 2).map(bp => {
                  const reached = battlePassLevel >= bp.level;
                  const freeClaimed = !!battlePassClaimed["free_" + bp.level];
                  const premClaimed = !!battlePassClaimed["premium_" + bp.level];
                  return (
                    <div key={bp.level} style={{ display: "flex", gap: 4, alignItems: "stretch", opacity: reached ? 1 : 0.4 }}>
                      <div style={{ width: 24, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 900, color: reached ? T.gold : T.textDim, fontFamily: FONT_DISPLAY }}>{bp.level}</div>
                      {/* Free track */}
                      <div onClick={reached && !freeClaimed ? () => claimBpReward(bp.level, "free") : undefined} style={{
                        flex: 1, padding: "6px 8px", borderRadius: 6, cursor: reached && !freeClaimed ? "pointer" : "default",
                        background: freeClaimed ? `${T.success}08` : reached ? `${T.gold}08` : "#ffffff03",
                        border: `1px solid ${freeClaimed ? T.success + "20" : reached ? T.gold + "20" : "#ffffff06"}`,
                      }}>
                        <div style={{ fontSize: 7, color: T.textDim, marginBottom: 1 }}>FREE</div>
                        <div style={{ fontSize: 8, color: freeClaimed ? T.success : T.gold, fontWeight: 700 }}>
                          {freeClaimed ? "✓" : Object.entries(bp.free).map(([k, v]) => v > 0 ? `${k === "gold" ? "🪙" : k === "diamonds" ? "💎" : k === "souls" ? "✦" : "🏅"}${fmt(v)}` : "").filter(Boolean).join(" ")}
                        </div>
                      </div>
                      {/* Premium track */}
                      <div onClick={reached && !premClaimed && battlePassPremium ? () => claimBpReward(bp.level, "premium") : undefined} style={{
                        flex: 1, padding: "6px 8px", borderRadius: 6, cursor: reached && !premClaimed && battlePassPremium ? "pointer" : "default",
                        background: premClaimed ? `${T.purple}08` : "#ffffff03",
                        border: `1px solid ${premClaimed ? T.purple + "20" : "#ffffff06"}`,
                        opacity: battlePassPremium ? 1 : 0.3,
                      }}>
                        <div style={{ fontSize: 7, color: T.purple, marginBottom: 1 }}>PREMIUM</div>
                        <div style={{ fontSize: 8, color: premClaimed ? T.purple : T.textDim, fontWeight: 700 }}>
                          {premClaimed ? "✓" : Object.entries(bp.premium).map(([k, v]) => v > 0 ? `${k === "gold" ? "🪙" : k === "diamonds" ? "💎" : k === "souls" ? "✦" : "🏅"}${fmt(v)}` : "").filter(Boolean).join(" ")}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ═══ GEMS ═══ */}
          {page === "gems" && (
            <div>
              <div style={{ fontSize: 13, fontWeight: 900, color: T.white, fontFamily: FONT_DISPLAY, marginBottom: 4 }}>💎 GEMS</div>
              <div style={{ fontSize: 8, color: T.textDim, marginBottom: 12 }}>Gems drop from boss kills. Socket into equipment (2 per item). Combine 3 same type+tier for upgrade.</div>

              {/* Gem inventory by type */}
              {GEM_TYPES.map(type => {
                const allSocketed = Object.values(socketedGems).flat();
                const typeGems = gems.filter(g => g.type === type.id).sort((a, b) => b.tier - a.tier);
                if (typeGems.length === 0) return null;
                return (
                  <div key={type.id} style={{ marginBottom: 10 }}>
                    <div style={{ fontSize: 10, fontWeight: 800, color: type.color, fontFamily: FONT_DISPLAY, marginBottom: 4 }}>{type.emoji} {type.name} — {type.stat}</div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                      {typeGems.map(g => {
                        const tierInfo = GEM_TIERS[g.tier - 1];
                        const isSocketed = allSocketed.includes(g.id);
                        return (
                          <div key={g.id} style={{
                            padding: "4px 8px", borderRadius: 5, fontSize: 9,
                            background: `${tierInfo.color}08`, border: `1px solid ${tierInfo.color}20`,
                            color: tierInfo.color, fontWeight: 700,
                            opacity: isSocketed ? 0.4 : 1,
                          }}>{tierInfo.name} +{g.value} {isSocketed ? "(S)" : ""}</div>
                        );
                      })}
                    </div>
                    {/* Combine buttons */}
                    <div style={{ display: "flex", gap: 4, marginTop: 4 }}>
                      {[1, 2, 3, 4].map(tier => {
                        const available = typeGems.filter(g => g.tier === tier && !allSocketed.includes(g.id));
                        if (available.length < 3) return null;
                        return (
                          <div key={tier} onClick={() => combineGems(type.id, tier)} style={{
                            padding: "3px 8px", borderRadius: 4, cursor: "pointer",
                            background: `${GEM_TIERS[tier - 1].color}12`, border: `1px solid ${GEM_TIERS[tier - 1].color}25`,
                            fontSize: 8, fontWeight: 800, color: GEM_TIERS[tier - 1].color,
                          }}>Combine {GEM_TIERS[tier - 1].name} ({available.length}/3)</div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
              {gems.length === 0 && <div style={{ fontSize: 10, color: T.textDim, textAlign: "center", padding: 20 }}>No gems yet. Kill bosses to find gems!</div>}

              {/* Socket section */}
              {gems.length > 0 && (
                <div style={{ marginTop: 14 }}>
                  <div style={{ fontSize: 11, fontWeight: 900, color: T.white, fontFamily: FONT_DISPLAY, marginBottom: 6 }}>⚙️ SOCKET GEMS</div>
                  <div style={{ fontSize: 8, color: T.textDim, marginBottom: 8 }}>Tap an equipment slot, then a gem to socket it (max 2 per slot).</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                    {EQUIP_TYPES.map(slot => {
                      const eqId = equipped[slot.id];
                      const eq = eqId ? equipment.find(e => e.id === eqId) : null;
                      const slotGems = (socketedGems[slot.id] || []).map(gid => gems.find(g => g.id === gid)).filter(Boolean);
                      return (
                        <div key={slot.id} style={{ padding: 6, borderRadius: 6, background: "#ffffff04", border: "1px solid #ffffff08", minWidth: 80, textAlign: "center" }}>
                          <div style={{ fontSize: 8, fontWeight: 700, color: T.textDim }}>{slot.emoji} {slot.name}</div>
                          {slotGems.map(g => {
                            const gt = GEM_TYPES.find(t => t.id === g.type);
                            return <div key={g.id} onClick={() => unsocketGem(g.id, slot.id)} style={{ fontSize: 8, color: gt?.color || T.textSec, cursor: "pointer" }}>{gt?.emoji} +{g.value} ×</div>;
                          })}
                          {slotGems.length < 2 && eq && (() => {
                            const allSocketed = Object.values(socketedGems).flat();
                            const avail = gems.filter(g => !allSocketed.includes(g.id));
                            return avail.length > 0 ? (
                              <select onChange={e => { if (e.target.value) socketGem(e.target.value, slot.id); e.target.value = ""; }} style={{ fontSize: 8, background: "#1a1c2e", color: T.textSec, border: "1px solid #ffffff10", borderRadius: 4, padding: 2, marginTop: 2, width: "100%" }}>
                                <option value="">+ Add gem</option>
                                {avail.map(g => { const gt = GEM_TYPES.find(t => t.id === g.type); const ti = GEM_TIERS[g.tier - 1]; return <option key={g.id} value={g.id}>{gt?.emoji} {ti.name} {gt?.name} +{g.value}</option>; })}
                              </select>
                            ) : null;
                          })()}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ═══ POWER BREAKDOWN ═══ */}
          {page === "power" && (
            <div>
              <div style={{ fontSize: 13, fontWeight: 900, color: T.white, fontFamily: FONT_DISPLAY, marginBottom: 12 }}>📊 POWER BREAKDOWN</div>
              <div style={{ fontSize: 18, fontWeight: 900, color: T.accent, fontFamily: FONT_DISPLAY, marginBottom: 14, textAlign: "center" }}>
                {fmt(totalAtk + totalDef + totalMaxHp)} CP
              </div>
              {[
                { label: "ATK", val: totalAtk, sources: [
                  { n: "Base Growth", v: baseAtk }, { n: "Equipment", v: equipBonus.atk + enhanceBonus.atk },
                  { n: "Costumes", v: costumeBonus.atkFlat || 0 }, { n: "Relics", v: relicBonus.atk || 0 },
                  { n: "Emblems", v: emblemBonus.atkFlat || 0 }, { n: "Figures", v: figureBonus.atkFlat || 0 },
                  { n: "Gems", v: gemBonus.atkFlat || 0 }, { n: "Titles", v: titleBonus.atkFlat || 0 },
                ], color: T.danger },
                { label: "DEF", val: totalDef, sources: [
                  { n: "Base Growth", v: baseDef }, { n: "Equipment", v: equipBonus.def + enhanceBonus.def },
                  { n: "Costumes", v: costumeBonus.defFlat || 0 }, { n: "Relics", v: relicBonus.def || 0 },
                  { n: "Emblems", v: emblemBonus.defFlat || 0 }, { n: "Figures", v: figureBonus.defFlat || 0 },
                  { n: "Gems", v: gemBonus.defFlat || 0 },
                ], color: T.info },
                { label: "HP", val: totalMaxHp, sources: [
                  { n: "Base Growth", v: baseHp }, { n: "Equipment", v: equipBonus.hp + enhanceBonus.hp },
                  { n: "Costumes", v: costumeBonus.hpFlat || 0 }, { n: "Relics", v: relicBonus.hp || 0 },
                  { n: "Emblems", v: emblemBonus.hpFlat || 0 }, { n: "Figures", v: figureBonus.hpFlat || 0 },
                  { n: "Gems", v: gemBonus.hpFlat || 0 },
                ], color: T.success },
                { label: "CRIT%", val: critRate, sources: [
                  { n: "Equipment", v: (equipBonus.critRate || 0) + enhanceBonus.critRate },
                  { n: "Pets", v: petBonus.critRate || 0 }, { n: "Passives", v: passiveBonus.critRate || 0 },
                  { n: "Resonance", v: resonanceBonus.critRate || 0 }, { n: "Gems", v: gemBonus.critRate || 0 },
                ], color: T.warning },
                { label: "CRIT DMG", val: critDmg, sources: [
                  { n: "Base", v: 150 }, { n: "Equipment", v: (equipBonus.critDmg || 0) + enhanceBonus.critDmg },
                  { n: "Pets", v: petBonus.critDmg || 0 }, { n: "Resonance", v: resonanceBonus.critDmg || 0 },
                  { n: "Gems", v: gemBonus.critDmg || 0 },
                ], color: T.orange },
              ].map(stat => (
                <div key={stat.label} style={{ marginBottom: 10, padding: "8px 10px", borderRadius: 8, background: `${stat.color}05`, border: `1px solid ${stat.color}12` }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                    <span style={{ fontSize: 11, fontWeight: 900, color: stat.color, fontFamily: FONT_DISPLAY }}>{stat.label}</span>
                    <span style={{ fontSize: 11, fontWeight: 900, color: T.white, fontFamily: FONT_DISPLAY }}>{fmt(stat.val)}</span>
                  </div>
                  {stat.sources.filter(s => s.v > 0).map(s => (
                    <div key={s.n} style={{ display: "flex", justifyContent: "space-between", fontSize: 8, color: T.textDim, padding: "1px 0" }}>
                      <span>{s.n}</span><span style={{ color: stat.color }}>+{fmt(s.v)}</span>
                    </div>
                  ))}
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 8, color: T.textDim, padding: "1px 0", borderTop: "1px solid #ffffff06", marginTop: 2 }}>
                    <span>Prestige Mult</span><span style={{ color: "#a855f7" }}>x{prestigeMult.toFixed(2)}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 8, color: T.textDim, padding: "1px 0" }}>
                    <span>Resonance Pct</span><span style={{ color: "#a855f7" }}>+{resonanceBonus[stat.label === "ATK" ? "atkPct" : stat.label === "DEF" ? "defPct" : "hpPct"] || 0}%</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ═══ WEAPON EVOLUTION ═══ */}
          {page === "weaponevo" && (
            <div>
              <div style={{ fontSize: 13, fontWeight: 900, color: T.white, fontFamily: FONT_DISPLAY, marginBottom: 4 }}>⚔️ WEAPON EVOLUTION</div>
              <div style={{ fontSize: 8, color: T.textDim, marginBottom: 12 }}>Evolve your weapon for permanent ATK bonuses</div>
              {/* Current weapon */}
              <div style={{ textAlign: "center", padding: "14px 10px", borderRadius: 10, background: `${wEvo.color}08`, border: `1px solid ${wEvo.color}25`, marginBottom: 12 }}>
                <div style={{ fontSize: 36, marginBottom: 6, filter: `drop-shadow(0 0 12px ${wEvo.color}60)` }}>{wEvo.emoji}</div>
                <div style={{ fontSize: 14, fontWeight: 900, color: wEvo.color, fontFamily: FONT_DISPLAY }}>{wEvo.name}</div>
                <div style={{ fontSize: 9, color: T.textSec, marginTop: 2 }}>Tier {wEvo.tier} • +{wEvo.atkBonus} ATK</div>
              </div>
              {/* Evolution tree */}
              {WEAPON_EVOLUTIONS.map((evo, i) => {
                const unlocked = weaponEvo > i;
                const current = weaponEvo === i + 1;
                const isNext = weaponEvo === i;
                return (
                  <div key={evo.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 8px", marginBottom: 4, borderRadius: 8, background: current ? `${evo.color}12` : "#ffffff04", border: current ? `1px solid ${evo.color}30` : "1px solid #ffffff06", opacity: unlocked || current || isNext ? 1 : 0.4 }}>
                    <span style={{ fontSize: 22, filter: unlocked || current ? `drop-shadow(0 0 6px ${evo.color}40)` : "grayscale(1)" }}>{evo.emoji}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 10, fontWeight: 800, color: unlocked || current ? evo.color : T.textDim, fontFamily: FONT_DISPLAY }}>{evo.name}</div>
                      <div style={{ fontSize: 8, color: T.textDim }}>+{evo.atkBonus} ATK{evo.cost > 0 ? ` • ${fmt(evo.cost)} gold` : " • Free"}</div>
                    </div>
                    {current && <span style={{ fontSize: 8, fontWeight: 800, color: T.success, fontFamily: FONT_DISPLAY }}>EQUIPPED</span>}
                    {isNext && evo.cost > 0 && (
                      <div onClick={evolveWeapon} style={{ padding: "4px 10px", borderRadius: 6, background: gold >= evo.cost ? T.accent : "#ffffff15", cursor: gold >= evo.cost ? "pointer" : "default", fontSize: 8, fontWeight: 800, color: T.white, fontFamily: FONT_DISPLAY, opacity: gold >= evo.cost ? 1 : 0.5 }}>EVOLVE</div>
                    )}
                    {unlocked && !current && <span style={{ fontSize: 10, color: T.success }}>✓</span>}
                  </div>
                );
              })}
            </div>
          )}

          {/* ═══ TRAINING DOJO ═══ */}
          {page === "dojo" && (
            <div>
              <div style={{ fontSize: 13, fontWeight: 900, color: T.white, fontFamily: FONT_DISPLAY, marginBottom: 4 }}>🥋 TRAINING DOJO</div>
              <div style={{ fontSize: 8, color: T.textDim, marginBottom: 12 }}>Train stats while idle. Collect after time passes.</div>
              {/* Permanent bonuses */}
              <div style={{ padding: "8px 10px", borderRadius: 8, background: "#ffffff04", border: "1px solid #ffffff08", marginBottom: 12 }}>
                <div style={{ fontSize: 9, fontWeight: 800, color: T.accent, fontFamily: FONT_DISPLAY, marginBottom: 6 }}>PERMANENT BONUSES</div>
                <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                  {Object.entries(dojoStats).filter(([, v]) => v > 0).map(([k, v]) => (
                    <span key={k} style={{ fontSize: 9, color: T.textSec }}>+{v.toFixed(1)} {k.toUpperCase()}</span>
                  ))}
                  {Object.values(dojoStats).every(v => v === 0) && <span style={{ fontSize: 8, color: T.textDim }}>No bonuses yet — start training!</span>}
                </div>
              </div>
              {/* Training slots */}
              {DOJO_SLOTS.map(slot => {
                const training = dojoTraining[slot.id];
                const elapsed = training ? Math.floor((Date.now() - training.startTime) / 1000) : 0;
                const hours = elapsed / 3600;
                const pendingGain = training ? Math.floor(slot.baseRate * hours * 10) / 10 : 0;
                return (
                  <div key={slot.id} style={{ padding: "10px 10px", borderRadius: 8, background: `${slot.color}06`, border: `1px solid ${slot.color}15`, marginBottom: 6 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                      <div>
                        <span style={{ fontSize: 16, marginRight: 6 }}>{slot.emoji}</span>
                        <span style={{ fontSize: 11, fontWeight: 800, color: slot.color, fontFamily: FONT_DISPLAY }}>{slot.name}</span>
                      </div>
                      <span style={{ fontSize: 8, color: T.textDim }}>+{slot.baseRate}/hr {slot.stat.toUpperCase()}</span>
                    </div>
                    {training ? (
                      <div>
                        <div style={{ fontSize: 8, color: T.textSec, marginBottom: 4 }}>Training for {hours >= 1 ? `${Math.floor(hours)}h ${Math.floor((hours % 1) * 60)}m` : `${Math.floor(hours * 60)}m ${elapsed % 60}s`} • Pending: +{pendingGain.toFixed(1)} {slot.stat.toUpperCase()}</div>
                        <div onClick={() => collectDojoTraining(slot.id)} style={{ padding: "5px 12px", borderRadius: 6, background: pendingGain > 0 ? T.success : "#ffffff15", cursor: "pointer", fontSize: 9, fontWeight: 800, color: T.white, fontFamily: FONT_DISPLAY, textAlign: "center" }}>
                          {pendingGain > 0 ? `COLLECT +${pendingGain.toFixed(1)}` : "COLLECTING..."}
                        </div>
                      </div>
                    ) : (
                      <div onClick={() => startDojoTraining(slot.id)} style={{ padding: "5px 12px", borderRadius: 6, background: T.accent, cursor: "pointer", fontSize: 9, fontWeight: 800, color: T.white, fontFamily: FONT_DISPLAY, textAlign: "center" }}>
                        START TRAINING
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* ═══ CHALLENGES ═══ */}
          {page === "challenge" && (
            <div>
              <div style={{ fontSize: 13, fontWeight: 900, color: T.white, fontFamily: FONT_DISPLAY, marginBottom: 4 }}>🎯 CHALLENGE STAGES</div>
              <div style={{ fontSize: 8, color: T.textDim, marginBottom: 12 }}>Special conditions for bonus rewards</div>
              {CHALLENGES.map(ch => {
                const completed = challengesCompleted[ch.id];
                const locked = highestStage < ch.minStage;
                return (
                  <div key={ch.id} style={{ padding: "10px 10px", borderRadius: 8, background: completed ? `${T.success}08` : locked ? "#ffffff02" : `${ch.color}06`, border: `1px solid ${completed ? T.success : ch.color}${locked ? "08" : "20"}`, marginBottom: 6, opacity: locked ? 0.4 : 1 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                      <div>
                        <span style={{ fontSize: 16, marginRight: 6 }}>{ch.emoji}</span>
                        <span style={{ fontSize: 11, fontWeight: 800, color: completed ? T.success : ch.color, fontFamily: FONT_DISPLAY }}>{ch.name}</span>
                      </div>
                      {completed && <span style={{ fontSize: 10, color: T.success }}>✓ DONE</span>}
                      {locked && <span style={{ fontSize: 8, color: T.textDim }}>Stage {ch.minStage}+</span>}
                    </div>
                    <div style={{ fontSize: 8, color: T.textSec, marginBottom: 6 }}>{ch.desc}</div>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      {ch.reward.gold && <span style={{ fontSize: 7, color: T.gold, background: `${T.gold}10`, padding: "1px 5px", borderRadius: 4 }}>💰 {fmt(ch.reward.gold)}</span>}
                      {ch.reward.diamonds && <span style={{ fontSize: 7, color: T.info, background: `${T.info}10`, padding: "1px 5px", borderRadius: 4 }}>💎 {ch.reward.diamonds}</span>}
                      {ch.reward.souls && <span style={{ fontSize: 7, color: "#a855f7", background: "#a855f710", padding: "1px 5px", borderRadius: 4 }}>👻 {ch.reward.souls}</span>}
                    </div>
                    {!completed && !locked && (
                      <div style={{ marginTop: 6, padding: "5px 12px", borderRadius: 6, background: `${ch.color}20`, cursor: "pointer", fontSize: 9, fontWeight: 800, color: ch.color, fontFamily: FONT_DISPLAY, textAlign: "center", border: `1px solid ${ch.color}30` }}>
                        COMING SOON
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* ═══ BESTIARY ═══ */}
          {page === "bestiary" && (
            <div>
              <div style={{ fontSize: 13, fontWeight: 900, color: T.white, fontFamily: FONT_DISPLAY, marginBottom: 4 }}>📖 BESTIARY</div>
              <div style={{ fontSize: 8, color: T.textDim, marginBottom: 12 }}>{Object.keys(bestiary).length} monster types encountered</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4 }}>
                {Object.entries(bestiary).sort((a, b) => b[1] - a[1]).map(([key, kills]) => {
                  const parts = key.split("_");
                  const emoji = parts[0];
                  const name = parts.slice(1).join(" ");
                  return (
                    <div key={key} style={{ padding: "6px 8px", borderRadius: 6, background: "#ffffff04", border: "1px solid #ffffff08", display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ fontSize: 18 }}>{emoji}</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 9, fontWeight: 700, color: T.white, textTransform: "capitalize" }}>{name}</div>
                        <div style={{ fontSize: 8, color: T.textDim }}>{fmt(kills)} killed</div>
                      </div>
                    </div>
                  );
                })}
              </div>
              {Object.keys(bestiary).length === 0 && <div style={{ fontSize: 10, color: T.textDim, textAlign: "center", padding: 20 }}>No monsters encountered yet. Start battling!</div>}
            </div>
          )}

          {/* ═══ TOWER OF TRIALS ═══ */}
          {page === "tower" && (
            <div>
              <div style={{ fontSize: 13, fontWeight: 900, color: T.white, fontFamily: FONT_DISPLAY, marginBottom: 4 }}>🗼 TOWER OF TRIALS</div>
              <div style={{ fontSize: 8, color: T.textDim, marginBottom: 12 }}>Endless ascending challenge. Each floor is harder. How far can you climb?</div>

              {/* Current floor display */}
              <div style={{ padding: 14, borderRadius: 10, background: "linear-gradient(135deg, #1a1810, #0e0820)", border: "1px solid #fbbf2420", marginBottom: 14, textAlign: "center" }}>
                <div style={{ fontSize: 10, color: T.textDim }}>CURRENT FLOOR</div>
                <div style={{ fontSize: 32, fontWeight: 900, color: T.gold, fontFamily: FONT_DISPLAY }}>{towerFloor + 1}</div>
                <div style={{ fontSize: 9, color: T.textSec }}>Best: Floor {towerBestFloor}</div>
                {(() => { const e = towerEnemy(towerFloor); return (
                  <div style={{ marginTop: 8, padding: 8, borderRadius: 8, background: "#ffffff04", border: "1px solid #ffffff08" }}>
                    <div style={{ fontSize: 18 }}>{e.emoji}</div>
                    <div style={{ fontSize: 10, fontWeight: 700, color: T.white }}>{e.name}</div>
                    <div style={{ fontSize: 8, color: T.textDim }}>HP: {fmt(e.hp)} • ATK: {fmt(e.atk)} • DEF: {fmt(e.def)}</div>
                  </div>
                ); })()}
                <div onClick={attemptTowerFloor} style={{
                  marginTop: 10, padding: "10px 0", borderRadius: 8, cursor: "pointer",
                  background: "linear-gradient(135deg, #fbbf2420, #f59e0b10)",
                  border: "1px solid #fbbf2440",
                  fontSize: 13, fontWeight: 900, color: T.gold, fontFamily: FONT_DISPLAY,
                }}>⚔️ CHALLENGE FLOOR {towerFloor + 1}</div>
              </div>

              {/* Result */}
              {towerResult && (
                <div style={{ padding: 12, borderRadius: 8, marginBottom: 12, background: towerResult.success ? `${T.success}08` : `${T.danger}08`, border: `1px solid ${towerResult.success ? T.success + "25" : T.danger + "25"}` }}>
                  <div style={{ fontSize: 12, fontWeight: 900, color: towerResult.success ? T.success : T.danger, fontFamily: FONT_DISPLAY }}>{towerResult.success ? `FLOOR ${towerResult.floor} CLEARED!` : "DEFEATED"}</div>
                  {!towerResult.success && <div style={{ fontSize: 9, color: T.textDim }}>Dealt {towerResult.hpPct}% of needed damage</div>}
                  {towerResult.reward && <div style={{ fontSize: 9, color: T.gold, marginTop: 2 }}>{towerResult.reward.diamonds ? `+${towerResult.reward.diamonds}💎 ` : ""}{towerResult.reward.gold ? `+${fmt(towerResult.reward.gold)}🪙 ` : ""}{towerResult.reward.souls ? `+${towerResult.reward.souls}✦` : ""}</div>}
                  <div onClick={() => setTowerResult(null)} style={{ marginTop: 6, padding: "3px 10px", borderRadius: 5, background: "#ffffff06", border: "1px solid #ffffff08", fontSize: 8, color: T.textDim, cursor: "pointer", display: "inline-block" }}>OK</div>
                </div>
              )}

              {/* Floor rewards */}
              <div style={{ fontSize: 10, fontWeight: 900, color: T.white, fontFamily: FONT_DISPLAY, marginBottom: 6 }}>🎁 FLOOR REWARDS</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                {TOWER_REWARDS.map((tr, i) => {
                  const reached = towerBestFloor >= tr.floor;
                  return (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: 6, padding: "5px 8px", borderRadius: 5, background: reached ? `${T.gold}06` : "#ffffff03", border: `1px solid ${reached ? T.gold + "15" : "#ffffff06"}`, opacity: reached ? 1 : 0.5 }}>
                      <span style={{ fontSize: 11 }}>{reached ? "✅" : "🔒"}</span>
                      <span style={{ flex: 1, fontSize: 9, color: reached ? T.white : T.textDim }}>Floor {tr.floor}</span>
                      <span style={{ fontSize: 8, color: T.gold }}>{tr.reward.diamonds ? `💎${tr.reward.diamonds} ` : ""}{tr.reward.gold ? `🪙${fmt(tr.reward.gold)} ` : ""}{tr.reward.souls ? `✦${tr.reward.souls}` : ""}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ═══ DAILY SPIN ═══ */}
          {page === "spin" && (
            <div>
              <div style={{ fontSize: 13, fontWeight: 900, color: T.white, fontFamily: FONT_DISPLAY, marginBottom: 4 }}>🎡 DAILY SPIN</div>
              <div style={{ fontSize: 8, color: T.textDim, marginBottom: 12 }}>Free spin once per day for rewards!</div>

              {/* Wheel visual */}
              <div style={{ padding: 20, borderRadius: 12, background: "linear-gradient(135deg, #1a1020, #0e0814)", border: "1px solid #a855f720", marginBottom: 14, textAlign: "center" }}>
                {isSpinning ? (
                  <div style={{ fontSize: 48, animation: "wheelSpin 1.5s ease-out forwards" }}>🎡</div>
                ) : spinResult ? (
                  <div>
                    <div style={{ fontSize: 42 }}>{spinResult.icon}</div>
                    <div style={{ fontSize: 16, fontWeight: 900, color: spinResult.color, fontFamily: FONT_DISPLAY, marginTop: 8 }}>{spinResult.label}</div>
                    <div onClick={() => setSpinResult(null)} style={{ marginTop: 10, padding: "6px 16px", borderRadius: 6, background: "#ffffff08", border: "1px solid #ffffff10", fontSize: 10, color: T.textSec, cursor: "pointer", display: "inline-block" }}>Collect</div>
                  </div>
                ) : (
                  <div>
                    <div style={{ fontSize: 48 }}>🎡</div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: T.white, marginTop: 8 }}>Tap to spin!</div>
                  </div>
                )}
              </div>

              {(() => {
                const today = new Date().toISOString().slice(0, 10);
                const canSpin = lastSpinDay !== today && !isSpinning;
                return (
                  <div onClick={canSpin ? doDailySpin : undefined} style={{
                    padding: "12px 0", borderRadius: 8, textAlign: "center", cursor: canSpin ? "pointer" : "default",
                    background: canSpin ? "linear-gradient(135deg, #a855f720, #7c3aed10)" : "#ffffff06",
                    border: `1px solid ${canSpin ? "#a855f740" : "#ffffff08"}`,
                    fontSize: 14, fontWeight: 900, color: canSpin ? "#a855f7" : T.textDim, fontFamily: FONT_DISPLAY,
                    boxShadow: canSpin ? "0 0 20px #a855f710" : "none",
                  }}>🎡 {canSpin ? "SPIN NOW — FREE!" : "Already spun today"}</div>
                );
              })()}

              {/* Prize table */}
              <div style={{ fontSize: 10, fontWeight: 900, color: T.white, fontFamily: FONT_DISPLAY, marginTop: 14, marginBottom: 6 }}>🎁 PRIZE TABLE</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 4 }}>
                {SPIN_PRIZES.map((p, i) => (
                  <div key={i} style={{ padding: "6px 4px", borderRadius: 6, background: `${p.color}06`, border: `1px solid ${p.color}12`, textAlign: "center" }}>
                    <div style={{ fontSize: 14 }}>{p.icon}</div>
                    <div style={{ fontSize: 8, fontWeight: 700, color: p.color }}>{p.label}</div>
                    <div style={{ fontSize: 7, color: T.textDim }}>{((p.weight / SPIN_PRIZES.reduce((s, x) => s + x.weight, 0)) * 100).toFixed(1)}%</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ═══ BOSS RUSH ═══ */}
          {page === "bossrush" && (
            <div>
              <div style={{ fontSize: 13, fontWeight: 900, color: T.white, fontFamily: FONT_DISPLAY, marginBottom: 4 }}>💥 BOSS RUSH</div>
              <div style={{ fontSize: 8, color: T.textDim, marginBottom: 12 }}>Fight {BOSS_RUSH_BOSSES.length} bosses back-to-back. Survive as long as you can!</div>

              <div style={{ padding: 14, borderRadius: 10, background: "linear-gradient(135deg, #1a1010, #0e0814)", border: `1px solid ${T.danger}20`, marginBottom: 14, textAlign: "center" }}>
                <div style={{ fontSize: 10, color: T.textDim }}>PERSONAL BEST</div>
                <div style={{ fontSize: 28, fontWeight: 900, color: T.danger, fontFamily: FONT_DISPLAY }}>{bossRushBest}/{BOSS_RUSH_BOSSES.length}</div>
                <div style={{ fontSize: 9, color: T.textSec }}>bosses defeated</div>

                <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 4, marginTop: 10 }}>
                  {BOSS_RUSH_BOSSES.map((b, i) => (
                    <div key={i} style={{ width: 36, height: 36, borderRadius: 8, background: i < bossRushBest ? `${T.success}10` : "#ffffff04", border: `1px solid ${i < bossRushBest ? T.success + "25" : "#ffffff08"}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>{b.emoji}</div>
                  ))}
                </div>

                <div onClick={doBossRush} style={{
                  marginTop: 12, padding: "10px 0", borderRadius: 8, cursor: "pointer",
                  background: `linear-gradient(135deg, ${T.danger}20, ${T.orange}10)`,
                  border: `1px solid ${T.danger}40`,
                  fontSize: 13, fontWeight: 900, color: T.danger, fontFamily: FONT_DISPLAY,
                }}>💥 START BOSS RUSH</div>
              </div>

              {/* Result */}
              {bossRushResult && (
                <div style={{ padding: 12, borderRadius: 8, background: `${bossRushResult.bossesKilled > 0 ? T.success : T.danger}08`, border: `1px solid ${bossRushResult.bossesKilled > 0 ? T.success + "25" : T.danger + "25"}` }}>
                  <div style={{ fontSize: 14, fontWeight: 900, color: T.white, fontFamily: FONT_DISPLAY, marginBottom: 4 }}>
                    {bossRushResult.bossesKilled === bossRushResult.total ? "PERFECT CLEAR!" : `${bossRushResult.bossesKilled}/${bossRushResult.total} Bosses Defeated`}
                  </div>
                  <div style={{ fontSize: 9, color: T.gold }}>+{fmt(bossRushResult.goldReward)}🪙 +{bossRushResult.diamondReward}💎 {bossRushResult.soulReward > 0 ? `+${bossRushResult.soulReward}✦` : ""}</div>
                  <div onClick={() => setBossRushResult(null)} style={{ marginTop: 6, padding: "3px 10px", borderRadius: 5, background: "#ffffff06", border: "1px solid #ffffff08", fontSize: 8, color: T.textDim, cursor: "pointer", display: "inline-block" }}>OK</div>
                </div>
              )}
            </div>
          )}

          {/* ═══ RESONANCE ═══ */}
          {page === "resonance" && (
            <div>
              <div style={{ fontSize: 13, fontWeight: 900, color: T.white, fontFamily: FONT_DISPLAY, marginBottom: 4 }}>✨ RESONANCE</div>
              <div style={{ fontSize: 8, color: T.textDim, marginBottom: 12 }}>Gain resonance XP from killing monsters. Each level boosts ALL stats by +2%.</div>

              {/* Level display */}
              <div style={{ padding: 14, borderRadius: 10, background: "linear-gradient(135deg, #1a1040, #0e0820)", border: `1px solid #a855f720`, marginBottom: 14, textAlign: "center" }}>
                <div style={{ fontSize: 28, fontWeight: 900, color: "#a855f7", fontFamily: FONT_DISPLAY }}>Level {resonanceLevel}</div>
                <div style={{ fontSize: 10, color: T.textSec, marginTop: 2 }}>+{resonanceLevel * 2}% All Stats</div>
                {/* XP bar */}
                <div style={{ position: "relative", height: 14, background: "#0e1020", borderRadius: 7, border: "1px solid #ffffff10", overflow: "hidden", marginTop: 8 }}>
                  <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: `${(resonanceXp / resonanceXpNeeded(resonanceLevel)) * 100}%`, background: "linear-gradient(90deg, #7c3aed, #a855f7)", borderRadius: 6, transition: "width 0.3s" }} />
                  <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 8, fontWeight: 800, color: "#fff", fontFamily: FONT_DISPLAY }}>{resonanceXp}/{resonanceXpNeeded(resonanceLevel)} XP</div>
                </div>
              </div>

              {/* Milestones */}
              <div style={{ fontSize: 11, fontWeight: 900, color: T.white, fontFamily: FONT_DISPLAY, marginBottom: 8 }}>🏆 MILESTONES</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                {RESONANCE_MILESTONES.map((m, i) => {
                  const reached = resonanceLevel >= m.level;
                  return (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 10px", borderRadius: 6, background: reached ? "#a855f706" : "#ffffff03", border: `1px solid ${reached ? "#a855f715" : "#ffffff06"}`, opacity: reached ? 1 : 0.5 }}>
                      <span style={{ fontSize: 13 }}>{reached ? "✅" : "🔒"}</span>
                      <div style={{ flex: 1, fontSize: 10, color: reached ? T.white : T.textDim }}>Level {m.level}</div>
                      <div style={{ fontSize: 9, fontWeight: 700, color: "#a855f7" }}>{m.bonus}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ═══ FIGURES ═══ */}
          {page === "figures" && (
            <div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 900, color: T.white, fontFamily: FONT_DISPLAY }}>🗿 FIGURES</div>
                  <div style={{ fontSize: 8, color: T.textDim }}>Collect figurines for permanent stat bonuses. Set bonuses at 3/5/8.</div>
                </div>
                <div style={{ fontSize: 10, fontWeight: 800, color: T.gold, fontFamily: FONT_DISPLAY }}>{Object.keys(ownedFigures).length}/{FIGURES.length}</div>
              </div>

              {/* Set bonuses */}
              <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 14 }}>
                {FIGURE_SET_BONUSES.map((sb, i) => {
                  const active = Object.keys(ownedFigures).length >= sb.count;
                  return (
                    <div key={i} style={{ padding: "6px 10px", borderRadius: 6, background: active ? `${T.gold}06` : "#ffffff03", border: `1px solid ${active ? T.gold + "15" : "#ffffff06"}`, fontSize: 9, color: active ? T.gold : T.textDim, fontWeight: active ? 700 : 400 }}>
                      {active ? "✅" : "🔒"} {sb.label}
                    </div>
                  );
                })}
              </div>

              {/* All figures */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                {FIGURES.map(fig => {
                  const owned = !!ownedFigures[fig.id];
                  const canBuy = !owned && (fig.costType === "diamonds" ? diamonds >= fig.cost : gold >= fig.cost);
                  return (
                    <div key={fig.id} style={{
                      padding: 10, borderRadius: 8, textAlign: "center",
                      background: owned ? `${fig.color}08` : "#ffffff04",
                      border: `1px solid ${owned ? fig.color + "25" : "#ffffff08"}`,
                      opacity: owned ? 1 : 0.7,
                    }}>
                      <div style={{ fontSize: 28, marginBottom: 4 }}>{fig.emoji}</div>
                      <div style={{ fontSize: 10, fontWeight: 700, color: owned ? fig.color : T.textDim }}>{fig.name}</div>
                      <div style={{ fontSize: 8, color: fig.color, marginTop: 2 }}>{Object.entries(fig.bonus).map(([k, v]) => `+${v} ${k}`).join(", ")}</div>
                      {!owned && (
                        <div onClick={canBuy ? () => buyFigure(fig.id) : undefined} style={{
                          marginTop: 6, padding: "4px 8px", borderRadius: 5, cursor: canBuy ? "pointer" : "default",
                          background: canBuy ? `${fig.color}15` : "#ffffff06",
                          border: `1px solid ${canBuy ? fig.color + "25" : "#ffffff08"}`,
                          fontSize: 8, fontWeight: 800, color: canBuy ? fig.color : T.textDim, fontFamily: FONT_DISPLAY,
                        }}>{fig.costType === "diamonds" ? "💎" : "🪙"}{fmt(fig.cost)}</div>
                      )}
                      {owned && <div style={{ marginTop: 4, fontSize: 7, color: T.success, fontWeight: 700 }}>✓ OWNED</div>}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ═══ ALCHEMY ═══ */}
          {page === "alchemy" && (
            <div>
              <div style={{ fontSize: 13, fontWeight: 900, color: T.white, fontFamily: FONT_DISPLAY, marginBottom: 4 }}>⚗️ ALCHEMY</div>
              <div style={{ fontSize: 8, color: T.textDim, marginBottom: 12 }}>Convert resources between types. Exchange rates apply.</div>

              {/* Balance */}
              <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
                {[{ icon: "🪙", val: gold, c: T.gold, l: "Gold" }, { icon: "💎", val: diamonds, c: "#60a5fa", l: "Diamonds" }, { icon: "✦", val: prestigeSouls, c: "#a855f7", l: "Souls" }, { icon: "🏅", val: emblemMarks, c: T.orange, l: "Marks" }].map(r => (
                  <div key={r.l} style={{ flex: 1, padding: "8px 0", borderRadius: 8, background: `${r.c}06`, border: `1px solid ${r.c}15`, textAlign: "center" }}>
                    <div style={{ fontSize: 14, fontWeight: 900, color: r.c, fontFamily: FONT_DISPLAY }}>{fmt(r.val)}</div>
                    <div style={{ fontSize: 7, color: T.textDim }}>{r.icon} {r.l}</div>
                  </div>
                ))}
              </div>

              {/* Conversion recipes */}
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {[
                  { id: "g2d", name: "Gold → Diamonds", desc: "5,000 gold → 30 diamonds", icon: "🪙→💎", cost: 5000, costType: "gold", give: { diamonds: 30 }, color: "#60a5fa" },
                  { id: "d2g", name: "Diamonds → Gold", desc: "50 diamonds → 8,000 gold", icon: "💎→🪙", cost: 50, costType: "diamonds", give: { gold: 8000 }, color: T.gold },
                  { id: "g2m", name: "Gold → Marks", desc: "10,000 gold → 5 emblem marks", icon: "🪙→🏅", cost: 10000, costType: "gold", give: { marks: 5 }, color: T.orange },
                  { id: "d2s", name: "Diamonds → Souls", desc: "200 diamonds → 3 prestige souls", icon: "💎→✦", cost: 200, costType: "diamonds", give: { souls: 3 }, color: "#a855f7" },
                  { id: "g2s", name: "Gold → Souls", desc: "50,000 gold → 2 prestige souls", icon: "🪙→✦", cost: 50000, costType: "gold", give: { souls: 2 }, color: "#a855f7" },
                ].map(recipe => {
                  const canAfford = recipe.costType === "gold" ? gold >= recipe.cost : diamonds >= recipe.cost;
                  return (
                    <div key={recipe.id} style={{
                      display: "flex", alignItems: "center", gap: 8, padding: "10px 12px", borderRadius: 8,
                      background: `${recipe.color}05`, border: `1px solid ${recipe.color}15`,
                    }}>
                      <div style={{ width: 34, height: 34, borderRadius: 8, background: `${recipe.color}12`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, flexShrink: 0, fontWeight: 900 }}>{recipe.icon.split("→")[0]}</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: T.white }}>{recipe.name}</div>
                        <div style={{ fontSize: 8, color: recipe.color }}>{recipe.desc}</div>
                      </div>
                      <div style={{ display: "flex", gap: 4 }}>
                        <div onClick={canAfford ? () => {
                          if (recipe.costType === "gold") setGold(g => g - recipe.cost);
                          else setDiamonds(d => d - recipe.cost);
                          if (recipe.give.diamonds) setDiamonds(d => d + recipe.give.diamonds);
                          if (recipe.give.gold) setGold(g => g + recipe.give.gold);
                          if (recipe.give.marks) setEmblemMarks(m => m + recipe.give.marks);
                          if (recipe.give.souls) setPrestigeSouls(s => s + recipe.give.souls);
                        } : undefined} style={{
                          padding: "5px 10px", borderRadius: 6, cursor: canAfford ? "pointer" : "default",
                          background: canAfford ? `${recipe.color}15` : "#ffffff06",
                          border: `1px solid ${canAfford ? recipe.color + "25" : "#ffffff08"}`,
                          fontSize: 9, fontWeight: 800, color: canAfford ? recipe.color : T.textDim, fontFamily: FONT_DISPLAY,
                        }}>×1</div>
                        <div onClick={(() => {
                          const maxTimes = recipe.costType === "gold" ? Math.floor(gold / recipe.cost) : Math.floor(diamonds / recipe.cost);
                          return maxTimes >= 5 ? () => {
                            const times = Math.min(maxTimes, 10);
                            if (recipe.costType === "gold") setGold(g => g - recipe.cost * times);
                            else setDiamonds(d => d - recipe.cost * times);
                            if (recipe.give.diamonds) setDiamonds(d => d + recipe.give.diamonds * times);
                            if (recipe.give.gold) setGold(g => g + recipe.give.gold * times);
                            if (recipe.give.marks) setEmblemMarks(m => m + recipe.give.marks * times);
                            if (recipe.give.souls) setPrestigeSouls(s => s + recipe.give.souls * times);
                          } : undefined;
                        })()} style={{
                          padding: "5px 8px", borderRadius: 6, cursor: (recipe.costType === "gold" ? gold >= recipe.cost * 5 : diamonds >= recipe.cost * 5) ? "pointer" : "default",
                          background: "#ffffff06", border: "1px solid #ffffff08",
                          fontSize: 8, fontWeight: 800, color: T.textDim, fontFamily: FONT_DISPLAY,
                        }}>×10</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ═══ SHOP ═══ */}
          {page === "shop" && (
            <div>
              <div style={{ fontSize: 13, fontWeight: 900, color: T.white, fontFamily: FONT_DISPLAY, marginBottom: 4 }}>🛒 SHOP</div>
              <div style={{ fontSize: 8, color: T.textDim, marginBottom: 12 }}>Exchange resources and buy boosts. Daily items reset at midnight.</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {SHOP_ITEMS.map(item => {
                  const today = new Date().toISOString().slice(0, 10);
                  const purchase = shopPurchases[item.id];
                  const boughtToday = item.daily && purchase && purchase.date === today;
                  const canAfford = item.costType === "diamonds" ? diamonds >= item.cost : gold >= item.cost;
                  const canBuy = !boughtToday && canAfford;
                  return (
                    <div key={item.id} style={{
                      display: "flex", alignItems: "center", gap: 8, padding: "10px 12px",
                      borderRadius: 8, background: boughtToday ? "#ffffff03" : `${item.color}06`,
                      border: `1px solid ${boughtToday ? "#ffffff06" : item.color + "18"}`,
                      opacity: boughtToday ? 0.45 : 1,
                    }}>
                      <div style={{ width: 36, height: 36, borderRadius: 10, background: `${item.color}12`, border: `1px solid ${item.color}20`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>{item.icon}</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: T.white }}>{item.name} {item.daily && <span style={{ fontSize: 7, color: T.textDim }}>(daily)</span>}</div>
                        <div style={{ fontSize: 9, color: item.color }}>{item.desc}</div>
                      </div>
                      <div onClick={canBuy ? () => buyShopItem(item.id) : undefined} style={{
                        padding: "5px 10px", borderRadius: 6, cursor: canBuy ? "pointer" : "default",
                        background: canBuy ? `${item.color}18` : "#ffffff06",
                        border: `1px solid ${canBuy ? item.color + "30" : "#ffffff08"}`,
                        fontSize: 9, fontWeight: 800, color: canBuy ? item.color : T.textDim, fontFamily: FONT_DISPLAY,
                      }}>{boughtToday ? "Sold Out" : `${item.costType === "diamonds" ? "💎" : "🪙"}${fmt(item.cost)}`}</div>
                    </div>
                  );
                })}
              </div>

              {/* Balance display */}
              <div style={{ marginTop: 14, padding: "10px 12px", borderRadius: 8, background: "#ffffff04", border: "1px solid #ffffff08", display: "flex", justifyContent: "center", gap: 20, fontSize: 11 }}>
                <span style={{ color: T.gold, fontWeight: 800 }}>🪙 {fmt(gold)}</span>
                <span style={{ color: "#60a5fa", fontWeight: 800 }}>💎 {fmt(diamonds)}</span>
                <span style={{ color: "#a855f7", fontWeight: 800 }}>✦ {prestigeSouls} souls</span>
              </div>
            </div>
          )}

          {/* ═══ TITLES ═══ */}
          {page === "titles" && (
            <div>
              <div style={{ fontSize: 13, fontWeight: 900, color: T.white, fontFamily: FONT_DISPLAY, marginBottom: 4 }}>🏷️ TITLES</div>
              <div style={{ fontSize: 8, color: T.textDim, marginBottom: 12 }}>Equip a title for stat bonuses. Displayed next to your name.</div>

              {/* Active title */}
              {(() => {
                const t = TITLES.find(x => x.id === activeTitle);
                return t && (
                  <div style={{ padding: 12, borderRadius: 10, background: `${t.color}08`, border: `1px solid ${t.color}20`, marginBottom: 14, textAlign: "center" }}>
                    <div style={{ fontSize: 8, color: T.textDim, marginBottom: 2 }}>ACTIVE TITLE</div>
                    <div style={{ fontSize: 15, fontWeight: 900, color: t.color, fontFamily: FONT_DISPLAY }}>{t.name}</div>
                    {Object.keys(t.bonus).length > 0 && (
                      <div style={{ fontSize: 9, color: t.color, marginTop: 2 }}>{Object.entries(t.bonus).map(([k, v]) => `+${v} ${k}`).join(" • ")}</div>
                    )}
                  </div>
                );
              })()}

              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {TITLES.map(t => {
                  const earned = !!earnedTitles[t.id];
                  const isActive = activeTitle === t.id;
                  const bonusText = Object.entries(t.bonus).map(([k, v]) => `+${v} ${k}`).join(", ");
                  return (
                    <div key={t.id} onClick={earned && !isActive ? () => setActiveTitle(t.id) : undefined} style={{
                      display: "flex", alignItems: "center", gap: 8, padding: "8px 10px",
                      borderRadius: 8, cursor: earned && !isActive ? "pointer" : "default",
                      background: isActive ? `${t.color}10` : earned ? `${t.color}04` : "#ffffff03",
                      border: `1px solid ${isActive ? t.color + "30" : earned ? t.color + "12" : "#ffffff06"}`,
                      opacity: earned ? 1 : 0.35,
                    }}>
                      <div style={{ width: 28, height: 28, borderRadius: "50%", background: `${t.color}15`, border: `2px solid ${earned ? t.color + "40" : "#ffffff08"}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, flexShrink: 0, fontWeight: 900, color: t.color, fontFamily: FONT_DISPLAY }}>{earned ? "✓" : "?"}</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: earned ? t.color : T.textDim }}>{t.name}</div>
                        <div style={{ fontSize: 8, color: T.textDim }}>{t.desc}</div>
                        {bonusText && <div style={{ fontSize: 8, color: t.color, marginTop: 1 }}>{bonusText}</div>}
                      </div>
                      {isActive && <div style={{ fontSize: 8, fontWeight: 800, color: T.success, fontFamily: FONT_DISPLAY }}>ACTIVE</div>}
                      {earned && !isActive && <div style={{ fontSize: 8, fontWeight: 700, color: T.textDim }}>Tap to equip</div>}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ═══ PRESTIGE / REBIRTH ═══ */}
          {page === "prestige" && (
            <div>
              {/* Rebirth card */}
              <div style={{ padding: "16px 14px", borderRadius: 12, background: "linear-gradient(135deg, #1a1030, #0e0820)", border: `1px solid ${T.purple}20`, marginBottom: 16 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                  <div style={{ width: 44, height: 44, borderRadius: "50%", background: `${T.purple}15`, border: `2px solid ${T.purple}30`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>🔄</div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 900, color: T.white, fontFamily: FONT_DISPLAY }}>REBIRTH</div>
                    <div style={{ fontSize: 9, color: T.textDim }}>Reset progress for permanent power</div>
                  </div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 12 }}>
                  <div style={{ textAlign: "center", padding: 8, borderRadius: 8, background: "#ffffff04" }}>
                    <div style={{ fontSize: 16, fontWeight: 900, color: T.purple, fontFamily: FONT_DISPLAY }}>{prestigeCount}</div>
                    <div style={{ fontSize: 7, color: T.textDim }}>Rebirths</div>
                  </div>
                  <div style={{ textAlign: "center", padding: 8, borderRadius: 8, background: "#ffffff04" }}>
                    <div style={{ fontSize: 16, fontWeight: 900, color: T.gold, fontFamily: FONT_DISPLAY }}>{prestigeSouls}</div>
                    <div style={{ fontSize: 7, color: T.textDim }}>Souls</div>
                  </div>
                  <div style={{ textAlign: "center", padding: 8, borderRadius: 8, background: "#ffffff04" }}>
                    <div style={{ fontSize: 16, fontWeight: 900, color: T.accent, fontFamily: FONT_DISPLAY }}>{Math.floor(prestigeSouls)}%</div>
                    <div style={{ fontSize: 7, color: T.textDim }}>All Stats+</div>
                  </div>
                </div>
                {canPrestige ? (
                  <div style={{ padding: "10px 14px", borderRadius: 8, background: `${T.purple}10`, border: `1px solid ${T.purple}25`, marginBottom: 10 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: T.white, marginBottom: 4 }}>Rebirth now for <span style={{ color: T.gold, fontWeight: 900 }}>+{prestigeSoulsToEarn} Souls</span></div>
                    <div style={{ fontSize: 8, color: T.textDim }}>This will reset: stages, growth, gold, equipment, skill levels</div>
                    <div style={{ fontSize: 8, color: T.success, marginTop: 2 }}>Keeps: 💎diamonds, 🐾pets, 👗costumes, 🏺relics, 🎖️insignias</div>
                  </div>
                ) : (
                  <div style={{ padding: 10, borderRadius: 8, background: "#ffffff04", textAlign: "center" }}>
                    <div style={{ fontSize: 10, color: T.textDim }}>Reach <span style={{ color: T.warning, fontWeight: 700 }}>Stage 50</span> to unlock Rebirth</div>
                    <div style={{ fontSize: 8, color: T.textDim, marginTop: 2 }}>Current: Stage {highestStage}</div>
                  </div>
                )}
                <div onClick={canPrestige ? doPrestige : undefined} style={{
                  padding: "10px 0", borderRadius: 8, textAlign: "center", cursor: canPrestige ? "pointer" : "default",
                  background: canPrestige ? `linear-gradient(135deg, ${T.purple}25, ${T.gold}15)` : "#ffffff06",
                  border: `1px solid ${canPrestige ? T.purple + "40" : "#ffffff08"}`,
                  fontSize: 13, fontWeight: 900, color: canPrestige ? T.white : T.textDim, fontFamily: FONT_DISPLAY,
                  boxShadow: canPrestige ? `0 0 20px ${T.purple}15` : "none",
                }}>🔄 {canPrestige ? "REBIRTH NOW" : "LOCKED"}</div>
              </div>

              {/* Soul milestones */}
              <div style={{ fontSize: 11, fontWeight: 900, color: T.white, fontFamily: FONT_DISPLAY, marginBottom: 8 }}>📊 SOUL MILESTONES</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 16 }}>
                {PRESTIGE_MILESTONES.map((m, i) => {
                  const reached = highestStage >= m.stage;
                  return (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 10px", borderRadius: 6, background: reached ? `${T.purple}06` : "#ffffff03", border: `1px solid ${reached ? T.purple + "15" : "#ffffff06"}`, opacity: reached ? 1 : 0.5 }}>
                      <span style={{ fontSize: 13 }}>{reached ? "✅" : "🔒"}</span>
                      <div style={{ flex: 1, fontSize: 10, color: reached ? T.white : T.textDim }}>Stage {m.stage}</div>
                      <div style={{ fontSize: 9, fontWeight: 800, color: T.gold, fontFamily: FONT_DISPLAY }}>{m.souls} souls</div>
                      <div style={{ fontSize: 8, color: T.purple }}>{m.bonus}</div>
                    </div>
                  );
                })}
              </div>

              {/* Passive skills */}
              <div style={{ fontSize: 11, fontWeight: 900, color: T.white, fontFamily: FONT_DISPLAY, marginBottom: 8 }}>🧿 PASSIVE SKILLS</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 16 }}>
                {PASSIVE_SKILLS.map(ps => {
                  const lvl = passiveSkillLevels[ps.id] || 0;
                  const maxed = lvl >= ps.maxLvl;
                  const val = lvl > 0 ? (ps.baseVal + (lvl - 1) * ps.perLvl).toFixed(1) : ps.baseVal.toFixed(1);
                  const cost = passiveSkillCost(lvl);
                  const canUp = gold >= cost && !maxed;
                  return (
                    <div key={ps.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", borderRadius: 8, background: lvl > 0 ? `${ps.color}06` : "#ffffff04", border: `1px solid ${lvl > 0 ? ps.color + "15" : "#ffffff08"}` }}>
                      <div style={{ width: 30, height: 30, borderRadius: 8, background: `${ps.color}12`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, flexShrink: 0 }}>{ps.emoji}</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: "flex", gap: 4, alignItems: "baseline" }}>
                          <span style={{ fontSize: 10, fontWeight: 700, color: T.white }}>{ps.name}</span>
                          <span style={{ fontSize: 9, fontWeight: 800, color: ps.color, fontFamily: FONT_DISPLAY }}>Lv.{lvl}{maxed ? " MAX" : ""}</span>
                        </div>
                        <div style={{ fontSize: 8, color: ps.color }}>{ps.desc.replace("{v}", val)}</div>
                      </div>
                      {!maxed && (
                        <div onClick={canUp ? () => upgradePassiveSkill(ps.id) : undefined} style={{ padding: "4px 8px", borderRadius: 6, cursor: canUp ? "pointer" : "default", background: canUp ? `${ps.color}15` : "#ffffff06", border: `1px solid ${canUp ? ps.color + "25" : "#ffffff08"}`, fontSize: 8, fontWeight: 800, color: canUp ? ps.color : T.textDim, fontFamily: FONT_DISPLAY }}>🪙{fmt(cost)}</div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Active skill upgrades */}
              <div style={{ fontSize: 11, fontWeight: 900, color: T.white, fontFamily: FONT_DISPLAY, marginBottom: 8 }}>⚡ SKILL UPGRADES</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {COMBAT_SKILLS.map(sk => {
                  const unlocked = unlockedSkills.includes(sk.id);
                  const lvl = skillLevels[sk.id] || 0;
                  const cost = skillUpgradeCost(lvl);
                  const canUp = gold >= cost && unlocked;
                  const dmg = (sk.dmgMult + lvl * 0.15).toFixed(1);
                  return (
                    <div key={sk.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", borderRadius: 8, background: unlocked ? `${sk.color}06` : "#ffffff03", border: `1px solid ${unlocked ? sk.color + "15" : "#ffffff06"}`, opacity: unlocked ? 1 : 0.35 }}>
                      <span style={{ fontSize: 16 }}>{sk.emoji}</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: "flex", gap: 4, alignItems: "baseline" }}>
                          <span style={{ fontSize: 10, fontWeight: 700, color: unlocked ? sk.color : T.textDim }}>{sk.name}</span>
                          {unlocked && <span style={{ fontSize: 9, fontWeight: 800, color: sk.color, fontFamily: FONT_DISPLAY }}>Lv.{lvl}</span>}
                        </div>
                        <div style={{ fontSize: 8, color: T.textDim }}>{dmg}x ATK • {sk.cooldown / 1000}s cd</div>
                      </div>
                      {unlocked ? (
                        <div onClick={canUp ? () => upgradeSkill(sk.id) : undefined} style={{ padding: "4px 8px", borderRadius: 6, cursor: canUp ? "pointer" : "default", background: canUp ? `${sk.color}15` : "#ffffff06", border: `1px solid ${canUp ? sk.color + "25" : "#ffffff08"}`, fontSize: 8, fontWeight: 800, color: canUp ? sk.color : T.textDim, fontFamily: FONT_DISPLAY }}>🪙{fmt(cost)}</div>
                      ) : <span style={{ fontSize: 8, color: T.textDim }}>Stage {sk.unlockStage}</span>}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ═══ SETTINGS ═══ */}
          {page === "settings" && (
            <div>
              <PageTitle icon="⚙️" title="SETTINGS" subtitle="Game preferences" />
              <Card style={{ marginBottom: 12 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 0" }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: T.white }}>Auto Progress</div>
                    <div style={{ fontSize: 11, color: T.textSec }}>Automatically advance to next stage</div>
                  </div>
                  <Btn small color={autoProgress ? T.success : T.textDim} onClick={() => setAutoProgress(!autoProgress)}>{autoProgress ? "ON" : "OFF"}</Btn>
                </div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 0", borderTop: `1px solid ${T.divider}` }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: T.white }}>Farm Stage</div>
                    <div style={{ fontSize: 11, color: T.textSec }}>{farmStage > 0 ? `Farming stage ${farmStage}` : "Progressing normally"}</div>
                  </div>
                  <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                    {farmStage > 0 && <Btn small color={T.textDim} onClick={() => setFarmStage(Math.max(1, farmStage - 10))}>-10</Btn>}
                    {farmStage > 0 && <Btn small color={T.textDim} onClick={() => setFarmStage(Math.max(1, farmStage - 1))}>-1</Btn>}
                    <Btn small color={farmStage > 0 ? T.gold : T.textDim} onClick={() => {
                      if (farmStage > 0) setFarmStage(0);
                      else setFarmStage(Math.max(1, highestStage - 5));
                    }}>{farmStage > 0 ? `⚔️ ${farmStage}` : "OFF"}</Btn>
                    {farmStage > 0 && <Btn small color={T.textDim} onClick={() => setFarmStage(Math.min(highestStage, farmStage + 1))}>+1</Btn>}
                    {farmStage > 0 && <Btn small color={T.textDim} onClick={() => setFarmStage(Math.min(highestStage, farmStage + 10))}>+10</Btn>}
                  </div>
                </div>
              </Card>
              <Card style={{ marginTop: 6 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 0" }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: T.white }}>Auto-Dismantle</div>
                    <div style={{ fontSize: 11, color: T.textSec }}>{autoDismantle >= 0 ? "Auto-selling low rarity gear on summon" : "Off"}</div>
                  </div>
                  <div style={{ display: "flex", gap: 3, alignItems: "center" }}>
                    {autoDismantle >= 0 && <Btn small color={T.textDim} onClick={() => setAutoDismantle(p => p <= 0 ? -1 : p - 1)}>-</Btn>}
                    <Btn small color={autoDismantle >= 0 ? T.gold : T.textDim} onClick={() => setAutoDismantle(p => p < 0 ? 0 : p >= 4 ? -1 : p + 1)}>{autoDismantle >= 0 ? RARITIES[autoDismantle].name : "OFF"}</Btn>
                    {autoDismantle >= 0 && autoDismantle < 4 && <Btn small color={T.textDim} onClick={() => setAutoDismantle(p => Math.min(4, p + 1))}>+</Btn>}
                  </div>
                </div>
              </Card>
              <Card>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 0" }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: T.white }}>Offline Earnings</div>
                    <div style={{ fontSize: 11, color: T.textSec }}>Earn gold while away (max {OFFLINE_MAX_HOURS}h). Rate: ~{fmt((OFFLINE_GOLD_PER_SEC + highestStage * OFFLINE_STAGE_MULT) * 3600)}/hr</div>
                  </div>
                  <Badge color={T.success}>Active</Badge>
                </div>
              </Card>
              <Card style={{ marginTop: 12 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 0" }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: T.white }}>Account</div>
                    <div style={{ fontSize: 11, color: T.textSec }}>{account.displayName} • {account.email}</div>
                  </div>
                  <Btn small color={T.danger} onClick={onLogout}>Logout</Btn>
                </div>
              </Card>
              <Card style={{ marginTop: 6 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 0" }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: T.white }}>Tutorial</div>
                    <div style={{ fontSize: 11, color: T.textSec }}>Replay the new player guide</div>
                  </div>
                  <Btn small color={T.info} onClick={() => { setTutorialStep(0); nav("battle"); }}>Replay</Btn>
                </div>
              </Card>
            </div>
          )}

          </div>
          {/* Bottom tabs in panel */}
          <div style={{ flexShrink: 0, display: "flex", alignItems: "stretch", background: "#0e1018", borderTop: "1px solid #ffffff08", paddingBottom: "max(4px, env(safe-area-inset-bottom))" }}>
            {[
              { icon: "⚔️", label: "Battle", p: "battle" },
              { icon: "🗡️", label: "Equip", p: "equipment" },
              { icon: "📜", label: "Quests", p: "quests" },
              { icon: "✨", label: "Summon", p: "summon" },
              { icon: "⭐", label: "Growth", p: "growth" },
              { icon: "🏰", label: "Dungeon", p: "dungeons" },
              { icon: "⚔️", label: "Raids", p: "raids" },
            ].map(tab => {
              const act = page === tab.p;
              return (
                <div key={tab.p} onClick={() => nav(tab.p)} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "5px 0 3px", cursor: "pointer", position: "relative" }}>
                  {act && <div style={{ position: "absolute", top: 0, left: "20%", right: "20%", height: 2, background: T.accent, borderRadius: "0 0 2px 2px" }} />}
                  <div style={{ width: 36, height: 36, borderRadius: 9, background: act ? "linear-gradient(180deg, #1e2040, #14162a)" : "transparent", border: act ? `1px solid ${T.accent}30` : "1px solid transparent", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 19, boxShadow: act ? `0 0 10px ${T.accent}15` : "none" }}>{tab.icon}</div>
                  <span style={{ fontSize: 7, fontWeight: 700, color: act ? T.accent : T.textDim, marginTop: 1, fontFamily: FONT_DISPLAY }}>{tab.label}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ═══ GLOBAL STYLES ═══ */}
      {/* ── TUTORIAL OVERLAY ── */}
      {tutorialStep >= 0 && (
        <div style={{ position: "fixed", inset: 0, zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", background: "#000000cc", backdropFilter: "blur(4px)" }}>
          <div style={{ width: "90%", maxWidth: 380, background: "linear-gradient(145deg, #1a1d2e, #12141e)", border: "1px solid #ffffff15", borderRadius: 16, padding: 24, boxShadow: "0 20px 60px #000000d0" }}>
            {tutorialStep === 0 && (<>
              <div style={{ textAlign: "center", marginBottom: 16 }}>
                <div style={{ fontSize: 48, marginBottom: 8 }}>⚔️</div>
                <div style={{ fontSize: 20, fontWeight: 900, color: T.white, fontFamily: FONT_DISPLAY, marginBottom: 4 }}>Welcome to Blade Realms!</div>
                <div style={{ fontSize: 11, color: T.textSec, lineHeight: 1.6 }}>Your hero fights enemies automatically. Your job is to grow stronger, collect gear, and push deeper into the world.</div>
              </div>
              <div style={{ background: "#ffffff06", borderRadius: 10, padding: 12, marginBottom: 16 }}>
                <div style={{ fontSize: 10, fontWeight: 800, color: T.accent, fontFamily: FONT_DISPLAY, marginBottom: 8, textTransform: "uppercase", letterSpacing: 1 }}>Quick Start Guide</div>
                {[
                  { icon: "⭐", text: "Tap Growth to level up ATK, HP & DEF" },
                  { icon: "✨", text: "Tap Summon to pull new equipment" },
                  { icon: "🗡️", text: "Equip your best gear for more power" },
                  { icon: "📜", text: "Complete Quests for gold & diamonds" },
                  { icon: "🏰", text: "Try Dungeons for big rewards" },
                ].map((tip, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 0", borderTop: i > 0 ? "1px solid #ffffff06" : "none" }}>
                    <span style={{ fontSize: 16, width: 24, textAlign: "center" }}>{tip.icon}</span>
                    <span style={{ fontSize: 11, color: T.textSec }}>{tip.text}</span>
                  </div>
                ))}
              </div>
            </>)}
            {tutorialStep === 1 && (<>
              <div style={{ textAlign: "center", marginBottom: 16 }}>
                <div style={{ fontSize: 48, marginBottom: 8 }}>⭐</div>
                <div style={{ fontSize: 18, fontWeight: 900, color: T.white, fontFamily: FONT_DISPLAY, marginBottom: 4 }}>Growth</div>
                <div style={{ fontSize: 11, color: T.textSec, lineHeight: 1.6 }}>Spend gold to level up your base stats. ATK increases damage, HP keeps you alive, DEF reduces damage taken. Growth is your most reliable path to power!</div>
              </div>
              <div style={{ background: "#ffffff06", borderRadius: 10, padding: 12, marginBottom: 16 }}>
                {["ATK — Your damage per hit. Prioritize this early!", "HP — Your health pool. Level when you keep dying.", "DEF — Damage reduction. Helps on tough bosses."].map((t, i) => (
                  <div key={i} style={{ fontSize: 11, color: T.textSec, padding: "5px 0", borderTop: i > 0 ? "1px solid #ffffff06" : "none" }}>{["🗡️", "❤️", "🛡️"][i]} {t}</div>
                ))}
              </div>
            </>)}
            {tutorialStep === 2 && (<>
              <div style={{ textAlign: "center", marginBottom: 16 }}>
                <div style={{ fontSize: 48, marginBottom: 8 }}>✨</div>
                <div style={{ fontSize: 18, fontWeight: 900, color: T.white, fontFamily: FONT_DISPLAY, marginBottom: 4 }}>Summoning & Equipment</div>
                <div style={{ fontSize: 11, color: T.textSec, lineHeight: 1.6 }}>Spend diamonds to summon equipment. Each piece has random stats and a rarity tier. Merge 5 of the same rarity to get a higher tier!</div>
              </div>
              <div style={{ background: "#ffffff06", borderRadius: 10, padding: 12, marginBottom: 16 }}>
                {["Equip your best gear in each slot", "Merge 5 same-rarity items → next tier", "Lock items you want to keep (🔒)", "Use Auto-Dismantle to sell low-tier drops"].map((t, i) => (
                  <div key={i} style={{ fontSize: 11, color: T.textSec, padding: "5px 0", borderTop: i > 0 ? "1px solid #ffffff06" : "none" }}>💡 {t}</div>
                ))}
              </div>
            </>)}
            {tutorialStep === 3 && (<>
              <div style={{ textAlign: "center", marginBottom: 16 }}>
                <div style={{ fontSize: 48, marginBottom: 8 }}>🔄</div>
                <div style={{ fontSize: 18, fontWeight: 900, color: T.white, fontFamily: FONT_DISPLAY, marginBottom: 4 }}>Prestige & Progression</div>
                <div style={{ fontSize: 11, color: T.textSec, lineHeight: 1.6 }}>When you hit stage 50+, you can Prestige (Rebirth). This resets your stage but grants permanent Prestige Souls for powerful upgrades.</div>
              </div>
              <div style={{ background: "#ffffff06", borderRadius: 10, padding: 12, marginBottom: 16 }}>
                {["Rebirth unlocks at Stage 50", "Prestige Souls boost ALL your stats permanently", "Spend souls on Prestige Skills for huge bonuses", "Each rebirth goes faster than the last!"].map((t, i) => (
                  <div key={i} style={{ fontSize: 11, color: T.textSec, padding: "5px 0", borderTop: i > 0 ? "1px solid #ffffff06" : "none" }}>🔮 {t}</div>
                ))}
              </div>
            </>)}
            {tutorialStep === 4 && (<>
              <div style={{ textAlign: "center", marginBottom: 16 }}>
                <div style={{ fontSize: 48, marginBottom: 8 }}>🎮</div>
                <div style={{ fontSize: 18, fontWeight: 900, color: T.white, fontFamily: FONT_DISPLAY, marginBottom: 4 }}>You're Ready!</div>
                <div style={{ fontSize: 11, color: T.textSec, lineHeight: 1.6 }}>There's tons more to discover — pets, dungeons, raids, costumes, gems, tower climbing, boss rush, and more. Explore the ⋯ More menu on the right side!</div>
              </div>
              <div style={{ background: "#ffffff06", borderRadius: 10, padding: 12, marginBottom: 16 }}>
                {[
                  { icon: "🐾", text: "Collect Pets for passive stat boosts" },
                  { icon: "🏰", text: "Clear Dungeons for growth & diamonds" },
                  { icon: "⚔️", text: "Raid bosses for exclusive accessories" },
                  { icon: "📜", text: "Daily & Weekly quests refresh regularly" },
                  { icon: "💎", text: "Earn offline diamonds every minute!" },
                ].map((tip, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 0", borderTop: i > 0 ? "1px solid #ffffff06" : "none" }}>
                    <span style={{ fontSize: 14, width: 22, textAlign: "center" }}>{tip.icon}</span>
                    <span style={{ fontSize: 11, color: T.textSec }}>{tip.text}</span>
                  </div>
                ))}
              </div>
            </>)}
            <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
              {tutorialStep > 0 && <div onClick={() => setTutorialStep(s => s - 1)} style={{ padding: "10px 20px", borderRadius: 8, cursor: "pointer", background: "#ffffff08", border: "1px solid #ffffff10", fontSize: 12, fontWeight: 700, color: T.textSec, fontFamily: FONT_DISPLAY }}>Back</div>}
              {tutorialStep < 4 ? (
                <div onClick={() => setTutorialStep(s => s + 1)} style={{ padding: "10px 24px", borderRadius: 8, cursor: "pointer", background: `linear-gradient(135deg, ${T.accent}, ${T.purple})`, fontSize: 12, fontWeight: 900, color: T.white, fontFamily: FONT_DISPLAY, boxShadow: `0 4px 15px ${T.accent}40` }}>{tutorialStep === 0 ? "Let's Go!" : "Next"}</div>
              ) : (
                <div onClick={() => setTutorialStep(-1)} style={{ padding: "10px 24px", borderRadius: 8, cursor: "pointer", background: `linear-gradient(135deg, ${T.success}, ${T.teal})`, fontSize: 12, fontWeight: 900, color: T.white, fontFamily: FONT_DISPLAY, boxShadow: `0 4px 15px ${T.success}40` }}>Start Playing!</div>
              )}
            </div>
            <div style={{ display: "flex", justifyContent: "center", gap: 6, marginTop: 12 }}>
              {[0,1,2,3,4].map(i => (<div key={i} style={{ width: i === tutorialStep ? 16 : 6, height: 6, borderRadius: 3, background: i === tutorialStep ? T.accent : "#ffffff15", transition: "all 0.3s" }} />))}
            </div>
            {tutorialStep === 0 && <div onClick={() => setTutorialStep(-1)} style={{ textAlign: "center", marginTop: 10, fontSize: 10, color: T.textDim, cursor: "pointer" }}>Skip tutorial</div>}
          </div>
        </div>
      )}

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Rajdhani:wght@500;600;700&family=DM+Sans:wght@400;500;600;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #0a0c14; overflow: hidden; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: ${T.divider}; border-radius: 99px; }

        @keyframes pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.06); } }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes shimmer { 0% { transform: translateX(-100%); } 100% { transform: translateX(400%); } }
        @keyframes glow { 0%, 100% { box-shadow: 0 0 8px var(--glow-color, #6366f140); } 50% { box-shadow: 0 0 20px var(--glow-color, #6366f160); } }
        @keyframes float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-4px); } }
        @keyframes shake { 0%, 100% { transform: translateX(0); } 25% { transform: translateX(-2px); } 75% { transform: translateX(2px); } }
        @keyframes slideDown { from { opacity: 0; transform: translateY(-30px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes fadeOut { from { opacity: 1; } to { opacity: 0; pointer-events: none; } }
        @keyframes slideRight { from { opacity: 0; transform: translateX(-30px); } to { opacity: 1; transform: translateX(0); } }
        @keyframes sparkle { 0%, 100% { opacity: 0.3; transform: scale(1); } 50% { opacity: 1; transform: scale(1.3); } }
        @keyframes wheelSpin { 0% { transform: rotate(0deg); } 100% { transform: rotate(1080deg); } }

        /* Battle animations */
        @keyframes heroIdle { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-3px); } }
        @keyframes heroAttack { 0% { transform: translateX(0) scale(1); } 40% { transform: translateX(24px) scale(1.15); } 100% { transform: translateX(0) scale(1); } }
        @keyframes heroHit { 0% { transform: translateX(0); filter: brightness(1); } 50% { transform: translateX(-8px); filter: brightness(2.5); } 100% { transform: translateX(0); filter: brightness(1); } }
        @keyframes monsterIdle { 0%, 100% { transform: translateY(0) scale(1); } 50% { transform: translateY(-2px) scale(1.02); } }
        @keyframes monsterHit { 0% { transform: translateX(0) scale(1); filter: brightness(1); } 30% { transform: translateX(10px) scale(0.92); filter: brightness(3); } 100% { transform: translateX(0) scale(1); filter: brightness(1); } }
        @keyframes monsterDie { 0% { transform: scale(1) rotate(0deg); opacity: 1; } 50% { transform: scale(1.15) rotate(8deg); opacity: 0.7; } 100% { transform: scale(0) rotate(25deg); opacity: 0; } }
        @keyframes enemySpawn { 0% { opacity: 0; transform: translate(-50%, -50%) scale(0); } 50% { transform: translate(-50%, -50%) scale(1.2); } 100% { opacity: 1; transform: translate(-50%, -50%) scale(1); } }
        @keyframes dmgFloat { 0% { opacity: 1; transform: translateY(0) scale(0.5); } 15% { opacity: 1; transform: translateY(-12px) scale(1.3); } 30% { transform: translateY(-24px) scale(1); } 100% { opacity: 0; transform: translateY(-80px) scale(0.7); } }
        @keyframes fighterIdle { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-4px); } }
        @keyframes fighterAttack { 0% { transform: translateX(0) scale(1); } 30% { transform: translateX(40px) scale(1.2); } 60% { transform: translateX(30px) scale(1.1); } 100% { transform: translateX(0) scale(1); } }
        @keyframes fighterHit { 0% { transform: translateX(0) scale(1); } 20% { transform: translateX(-12px) scale(0.9); } 60% { transform: translateX(-6px) scale(0.95); } 100% { transform: translateX(0) scale(1); } }
        @keyframes fighterDie { 0% { transform: scale(1) translateY(0); opacity: 1; } 40% { transform: scale(1.1) translateY(-10px); opacity: 0.8; } 100% { transform: scale(0.3) translateY(20px); opacity: 0; } }
        @keyframes enemyEnter { 0% { opacity: 0; transform: translateX(80px) scale(0.5); } 60% { transform: translateX(-5px) scale(1.05); } 100% { opacity: 1; transform: translateX(0) scale(1); } }
        @keyframes slashVfx { 0% { opacity: 1; transform: scale(0.5) rotate(-45deg); } 50% { opacity: 1; transform: scale(1.3) rotate(-30deg); } 100% { opacity: 0; transform: scale(1.8) rotate(-20deg); } }
        @keyframes shakeLight { 0%, 100% { transform: translate(0); } 25% { transform: translate(-3px, 2px); } 50% { transform: translate(3px, -2px); } 75% { transform: translate(-2px, -1px); } }
        @keyframes shakeHeavy { 0%, 100% { transform: translate(0); } 10% { transform: translate(-6px, 4px); } 20% { transform: translate(6px, -4px); } 30% { transform: translate(-5px, -3px); } 40% { transform: translate(5px, 3px); } 50% { transform: translate(-4px, 2px); } 60% { transform: translate(4px, -2px); } 70% { transform: translate(-3px, 1px); } 80% { transform: translate(2px, -1px); } }
        @keyframes comboPopIn { 0% { opacity: 0; transform: scale(2) rotate(-10deg); } 50% { opacity: 1; transform: scale(0.9) rotate(2deg); } 100% { opacity: 1; transform: scale(1) rotate(0deg); } }
        @keyframes announcerSlam { 0% { opacity: 0; transform: translateX(-50%) scale(3); } 10% { opacity: 1; transform: translateX(-50%) scale(1); } 70% { opacity: 1; transform: translateX(-50%) scale(1); } 100% { opacity: 0; transform: translateX(-50%) scale(0.8) translateY(-20px); } }
        @keyframes cinematicFade { 0% { opacity: 0; } 15% { opacity: 1; } 85% { opacity: 1; } 100% { opacity: 0; } }
        @keyframes warningFlash { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }
        @keyframes bossSpriteEnter { 0% { opacity: 0; transform: scale(3) translateY(20px); filter: blur(10px); } 100% { opacity: 1; transform: scale(1) translateY(0); filter: blur(0); } }
        @keyframes bossNameEnter { 0% { opacity: 0; transform: translateY(15px); } 100% { opacity: 1; transform: translateY(0); } }
        @keyframes particleFloat { 0%, 100% { transform: translateY(0) translateX(0); opacity: 0.3; } 25% { transform: translateY(-20px) translateX(5px); opacity: 0.6; } 50% { transform: translateY(-40px) translateX(-3px); opacity: 0.4; } 75% { transform: translateY(-60px) translateX(4px); opacity: 0.2; } }
        @keyframes dustDrift { 0% { transform: translate(0, 0); opacity: 0; } 10% { opacity: 0.4; } 90% { opacity: 0.4; } 100% { transform: translate(30px, -60px); opacity: 0; } }
        @keyframes fadeOut { 0% { opacity: 1; } 100% { opacity: 0; } }
        @keyframes goldFloat { 0% { opacity: 1; transform: translateX(-50%) translateY(0) scale(0.8); } 20% { opacity: 1; transform: translateX(-50%) translateY(-12px) scale(1.15); } 100% { opacity: 0; transform: translateX(-50%) translateY(-45px) scale(0.6); } }
        @keyframes flashFade { 0% { opacity: 1; } 100% { opacity: 0; } }
        @keyframes portalPulse { 0%, 100% { transform: translateX(-50%) scale(1); opacity: 0.6; } 50% { transform: translateX(-50%) scale(1.1); opacity: 1; } }
        @keyframes panelSlideUp { from { transform: translateY(40%); opacity: 0.5; } to { transform: translateY(0); opacity: 1; } }

        ::selection { background: ${T.accent}40; color: ${T.white}; }
      `}</style>
    </div>
  );
}
