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
  sidebar: "#0e1018", sidebarBorder: "#1a1d2d",
  sidebarActive: "#161a2c", sidebarHover: "#131628",
  card: "#131620", cardBorder: "#1c2035", cardHover: "#181c2e",
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
  white: "#eef0f8", gold: "#fbbf24", bar: "#1a1d2d", divider: "#1a1d2d",
  r: 12, rs: 8,
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
  [{ name: "Slime", emoji: "🟢" }, { name: "Rat", emoji: "🐀" }, { name: "Goblin", emoji: "👺" }, { name: "Skeleton", emoji: "💀" }, { name: "Wild Boar", emoji: "🐗" }],
  [{ name: "Wolf", emoji: "🐺" }, { name: "Cave Spider", emoji: "🕷️" }, { name: "Orc", emoji: "👹" }, { name: "Stone Troll", emoji: "🪨" }, { name: "Dark Bat", emoji: "🦇" }],
  [{ name: "Bog Lurker", emoji: "🐸" }, { name: "Venomfang", emoji: "🐍" }, { name: "Dark Mage", emoji: "🧙" }, { name: "Plague Bearer", emoji: "🤢" }, { name: "Swamp Thing", emoji: "🌿" }],
  [{ name: "Haunted Armor", emoji: "🛡️" }, { name: "Wraith", emoji: "👻" }, { name: "Golem", emoji: "🗿" }, { name: "Dragon", emoji: "🐉" }, { name: "Death Knight", emoji: "⚔️" }],
  [{ name: "Magma Imp", emoji: "😈" }, { name: "Flame Serpent", emoji: "🔥" }, { name: "Obsidian Brute", emoji: "⬛" }, { name: "Ember Drake", emoji: "🐉" }, { name: "Lava Golem", emoji: "🌋" }],
  [{ name: "Shadow Stalker", emoji: "🌑" }, { name: "Abyssal Watcher", emoji: "👁️" }, { name: "Doom Crawler", emoji: "🦂" }, { name: "Soul Reaver", emoji: "💀" }, { name: "Void Spawn", emoji: "🕳️" }],
  [{ name: "Storm Giant", emoji: "⛈️" }, { name: "Ancient Wyrm", emoji: "🐲" }, { name: "Celestial Knight", emoji: "🌟" }, { name: "Titan Colossus", emoji: "🗿" }, { name: "Thunder Beast", emoji: "⚡" }],
  [{ name: "Void Walker", emoji: "🌀" }, { name: "Star Devourer", emoji: "⭐" }, { name: "Cosmic Horror", emoji: "👾" }, { name: "Rift Guardian", emoji: "🔮" }, { name: "Eternal Flame", emoji: "🔥" }],
];

const BOSSES = [
  ["Meadow Golem 🗿", "Forest Guardian 🌲", "Goblin King 👺", "Undead General 💀", "Ancient Treant 🌳"],
  ["Cave Wyrm 🐛", "Crystal Basilisk 💎", "Orc Warlord 👹", "Shadow Drake 🐉", "Troll King 🪨"],
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

  const baseHp = Math.floor(20 * Math.pow(1.08, stageNum - 1));
  const baseAtk = Math.floor(3 * Math.pow(1.06, stageNum - 1));
  const baseDef = Math.floor(1 * Math.pow(1.05, stageNum - 1));
  const baseGold = Math.floor(5 * Math.pow(1.04, stageNum - 1));
  const baseXp = Math.floor(10 * Math.pow(1.05, stageNum - 1));

  if (isBoss) {
    const b = bosses[Math.min(bossIdx, bosses.length - 1)];
    return {
      name: b.replace(/ [^\s]+$/, ''), emoji: b.match(/[^\w\s]+$/)?.[0] || "👑",
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
function growthCost(level) { return Math.floor(10 * Math.pow(1.12, level - 1)); }

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

const EQUIP_NAMES = {
  weapon: ["Rusty Blade", "Iron Sword", "Steel Cleaver", "Shadow Edge", "Void Slasher", "Titan Blade", "God Sword"],
  armor: ["Cloth Vest", "Leather Armor", "Iron Plate", "Shadow Mail", "Void Plate", "Titan Armor", "God Armor"],
  helm: ["Cloth Cap", "Leather Helm", "Iron Helm", "Shadow Crown", "Void Mask", "Titan Crown", "God Crown"],
  gloves: ["Cloth Wraps", "Leather Gloves", "Iron Gauntlets", "Shadow Claws", "Void Grips", "Titan Fists", "God Gauntlets"],
  boots: ["Sandals", "Leather Boots", "Iron Greaves", "Shadow Steps", "Void Treads", "Titan Boots", "God Boots"],
  ring: ["Copper Ring", "Silver Ring", "Gold Ring", "Shadow Ring", "Void Ring", "Titan Ring", "God Ring"],
  amulet: ["Bone Charm", "Crystal Pendant", "Gold Amulet", "Shadow Talisman", "Void Pendant", "Titan Amulet", "God Amulet"],
};

function generateEquipment(type) {
  let roll = Math.random() * 100, cum = 0, ri = 0;
  for (let i = 0; i < RARITIES.length; i++) { cum += RARITIES[i].weight; if (roll < cum) { ri = i; break; } }
  const rarity = RARITIES[ri];
  const td = EQUIP_TYPES.find(t => t.id === type);
  const baseMult = [1, 2.5, 6, 15, 40, 100, 300][ri];
  const stats = {};
  if (td.stat === "atk") stats.atk = Math.floor(5 * baseMult * (0.9 + Math.random() * 0.2));
  if (td.stat === "def") stats.def = Math.floor(4 * baseMult * (0.9 + Math.random() * 0.2));
  if (td.stat === "hp") stats.hp = Math.floor(20 * baseMult * (0.9 + Math.random() * 0.2));
  if (td.stat === "critRate") stats.critRate = Math.min(80, Math.floor(2 + ri * 3 + Math.random() * 3));
  if (td.stat === "critDmg") stats.critDmg = Math.floor(10 + ri * 15 + Math.random() * 10);
  if (Math.random() < 0.3 + ri * 0.1) {
    const secs = ["atk", "def", "hp"].filter(s => s !== td.stat);
    const sec = secs[Math.floor(Math.random() * secs.length)];
    stats[sec] = (stats[sec] || 0) + Math.floor((sec === "hp" ? 10 : 2) * baseMult * 0.3 * (0.8 + Math.random() * 0.4));
  }
  return { id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6), type, name: EQUIP_NAMES[type][ri], rarity: rarity.id, rarityIdx: ri, level: 0, stats, emoji: td.emoji };
}

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

// ─── COMBAT SKILLS ───
const COMBAT_SKILLS = [
  { id: "slash", name: "Power Slash", emoji: "⚔️", dmgMult: 2.0, cooldown: 5000, desc: "200% ATK damage", unlockStage: 1, color: T.danger },
  { id: "whirlwind", name: "Whirlwind", emoji: "🌪️", dmgMult: 1.5, cooldown: 4000, desc: "150% ATK damage", unlockStage: 10, color: T.info },
  { id: "fireball", name: "Fireball", emoji: "🔥", dmgMult: 3.0, cooldown: 8000, desc: "300% ATK damage", unlockStage: 30, color: T.orange },
  { id: "thunderbolt", name: "Thunderbolt", emoji: "⚡", dmgMult: 4.0, cooldown: 12000, desc: "400% ATK damage", unlockStage: 60, color: T.warning },
  { id: "voidstrike", name: "Void Strike", emoji: "🕳️", dmgMult: 6.0, cooldown: 18000, desc: "600% ATK damage", unlockStage: 100, color: T.purple },
  { id: "judgment", name: "Divine Judgment", emoji: "✨", dmgMult: 10.0, cooldown: 30000, desc: "1000% ATK damage", unlockStage: 200, color: T.gold },
];

// ─── COSTUMES / SKINS ───
// Each costume gives stat bonuses and changes the player's visual appearance
const COSTUMES = [
  { id: "default", name: "Adventurer", emoji: "🧑‍⚔️", desc: "A humble herb collector turned hero", cost: 0, currency: "free", bonus: {}, tier: "starter", color: T.textSec },
  { id: "iron_knight", name: "Iron Knight", emoji: "🪖", desc: "Heavy iron armor fit for frontline battle", cost: 500, currency: "gold", bonus: { def: 5, hp: 30 }, tier: "common", color: T.rarCommon },
  { id: "forest_ranger", name: "Forest Ranger", emoji: "🏹", desc: "Swift woodland garb with sharpened senses", cost: 800, currency: "gold", bonus: { atk: 5, critRate: 2 }, tier: "common", color: T.rarCommon },
  { id: "shadow_assassin", name: "Shadow Assassin", emoji: "🗡️", desc: "Dark cloak that strikes from the shadows", cost: 2000, currency: "gold", bonus: { atk: 12, critRate: 5, critDmg: 15 }, tier: "uncommon", color: T.rarUncommon },
  { id: "crimson_berserker", name: "Crimson Berserker", emoji: "🔴", desc: "Blood-red war paint that fuels rage", cost: 5000, currency: "gold", bonus: { atk: 25, hp: 50 }, tier: "uncommon", color: T.rarUncommon },
  { id: "frost_warden", name: "Frost Warden", emoji: "❄️", desc: "Enchanted ice armor that chills attackers", cost: 12000, currency: "gold", bonus: { def: 20, hp: 80, atk: 10 }, tier: "rare", color: T.rarRare },
  { id: "flame_lord", name: "Flame Lord", emoji: "🔥", desc: "Blazing armor forged in volcanic fire", cost: 200, currency: "diamonds", bonus: { atk: 35, critDmg: 25 }, tier: "rare", color: T.rarRare },
  { id: "void_phantom", name: "Void Phantom", emoji: "👻", desc: "Phase through reality itself", cost: 500, currency: "diamonds", bonus: { atk: 20, def: 15, critRate: 8, critDmg: 20 }, tier: "epic", color: T.rarEpic },
  { id: "celestial_guardian", name: "Celestial Guardian", emoji: "👼", desc: "Blessed by the heavens with divine light", cost: 1000, currency: "diamonds", bonus: { atk: 30, def: 25, hp: 150, critRate: 5 }, tier: "epic", color: T.rarEpic },
  { id: "dragon_emperor", name: "Dragon Emperor", emoji: "🐲", desc: "Armor crafted from an ancient dragon's scales", cost: 2500, currency: "diamonds", bonus: { atk: 50, def: 35, hp: 200, critRate: 8, critDmg: 30 }, tier: "legendary", color: T.rarLegendary },
  { id: "god_slayer", name: "God Slayer", emoji: "⚡", desc: "Worn by those who defy the divine", cost: 5000, currency: "diamonds", bonus: { atk: 80, def: 50, hp: 300, critRate: 10, critDmg: 50, goldPct: 10 }, tier: "mythic", color: T.rarMythic },
  // Special costumes (unlocked by milestones, not purchased)
  { id: "stage100", name: "Centurion", emoji: "💯", desc: "Awarded for clearing 100 stages", cost: 0, currency: "milestone", milestone: "stage100", bonus: { atk: 15, def: 10, hp: 60 }, tier: "rare", color: T.rarRare },
  { id: "boss50", name: "Boss Hunter", emoji: "👑", desc: "Awarded for slaying 50 bosses", cost: 0, currency: "milestone", milestone: "boss50", bonus: { atk: 25, critRate: 5, critDmg: 20 }, tier: "epic", color: T.rarEpic },
  { id: "kills10k", name: "Eternal Warrior", emoji: "⚔️", desc: "Awarded for 10,000 monster kills", cost: 0, currency: "milestone", milestone: "kills10k", bonus: { atk: 40, def: 20, hp: 100, goldPct: 5 }, tier: "legendary", color: T.rarLegendary },
];

const COSTUME_TIERS = ["starter", "common", "uncommon", "rare", "epic", "legendary", "mythic"];

// Check if a milestone costume is unlocked
function isMilestoneUnlocked(costumeId, combatStats, highestStage) {
  const c = COSTUMES.find(x => x.id === costumeId);
  if (!c || c.currency !== "milestone") return false;
  if (c.milestone === "stage100") return highestStage >= 100;
  if (c.milestone === "boss50") return (combatStats.bossesKilled || 0) >= 50;
  if (c.milestone === "kills10k") return combatStats.kills >= 10000;
  return false;
}

// ─── COSTUMES / SKINS ───
// Costumes are cosmetic outfits with stat bonuses. Buy with diamonds, equip one at a time.
// Each costume changes the hero's appearance emoji and gives permanent stat bonuses.
const COSTUMES = [
  { id: "default", name: "Adventurer", emoji: "🧑‍⚔️", desc: "The classic hero look", rarity: "common", cost: 0, bonuses: {}, owned: true },
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
const OFFLINE_GOLD_PER_SEC = 0.5; // base gold per second offline (multiplied by stage)
const OFFLINE_MAX_HOURS = 12; // max offline earnings cap
const OFFLINE_STAGE_MULT = 0.02; // extra gold per stage per second

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

function Card({ children, style, glow, onClick, hover }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div onClick={onClick}
      onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
      style={{
        background: hovered && hover ? T.cardHover : T.card,
        borderRadius: T.r, padding: 18,
        border: `1px solid ${glow ? glow + "35" : T.cardBorder}`,
        boxShadow: glow ? `0 0 24px ${glow}12, 0 4px 20px #00000040` : "0 2px 12px #00000025",
        cursor: onClick ? "pointer" : undefined,
        transition: "all 0.2s ease", ...style,
      }}>{children}</div>
  );
}

function Btn({ children, onClick, color = T.accent, small, disabled, style: sx, block }) {
  const [hover, setHover] = useState(false);
  return (
    <div onClick={disabled ? undefined : onClick}
      onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{
        display: block ? "flex" : "inline-flex", alignItems: "center", justifyContent: "center", gap: 6,
        padding: small ? "7px 14px" : "10px 22px",
        borderRadius: T.rs, fontWeight: 700, fontSize: small ? 11 : 13, fontFamily: FONT_BODY,
        background: disabled ? T.bar : hover ? `${color}30` : `${color}18`,
        color: disabled ? T.textDim : color,
        border: `1px solid ${disabled ? T.divider : hover ? color + "50" : color + "30"}`,
        cursor: disabled ? "not-allowed" : "pointer",
        transition: "all 0.15s ease", userSelect: "none",
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

function SidebarItem({ icon, label, active, onClick, color, badge }) {
  const [hover, setHover] = useState(false);
  return (
    <div onClick={onClick}
      onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{
        display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", marginBottom: 2,
        borderRadius: T.rs, cursor: "pointer",
        background: active ? `${color || T.accent}10` : hover ? T.sidebarHover : "transparent",
        borderLeft: active ? `3px solid ${color || T.accent}` : "3px solid transparent",
        transition: "all 0.12s ease",
      }}>
      <span style={{ fontSize: 15, width: 22, textAlign: "center" }}>{icon}</span>
      <span style={{ fontSize: 12, fontWeight: active ? 700 : 500, color: active ? T.white : T.textSec, flex: 1, fontFamily: FONT_BODY }}>{label}</span>
      {badge && <Badge color={color}>{badge}</Badge>}
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
  equipped: { weapon: null, armor: null, helm: null, gloves: null, boots: null, ring: null, amulet: null },
  pets: [], activePets: [], petSlots: 1,
  gold: 100, diamonds: 50,
  unlockedSkills: ["slash"], equippedSkills: ["slash", null, null],
  ownedCostumes: ["default"], activeCostume: "default",
  combatStats: { kills: 0, totalDamage: 0, deaths: 0, highestHit: 0, bossesKilled: 0, totalGoldEarned: 0 },
  stats: { timePlayed: 0, loginStreak: 0, lastLoginDay: null, summons: 0, merges: 0 },
  isPremium: false, storePurchases: {},
  autoProgress: true,
  lastActiveTime: Date.now(),
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
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: `radial-gradient(ellipse at 50% 30%, #1a1040 0%, ${T.bg} 70%)`, fontFamily: FONT_BODY }}>
      <div style={{ width: "100%", maxWidth: 400, padding: 24 }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ fontSize: 56, marginBottom: 8, filter: "drop-shadow(0 0 20px rgba(99,102,241,0.4))" }}>⚔️</div>
          <div style={{ fontSize: 32, fontWeight: 900, color: T.white, fontFamily: FONT_DISPLAY, letterSpacing: 1 }}>BLADE REALMS</div>
          <div style={{ fontSize: 12, color: T.textSec, marginTop: 4, letterSpacing: 2, textTransform: "uppercase" }}>Idle Adventure RPG</div>
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
// GAME UI
// ═══════════════════════════════════════════════

function GameUI({ account, initialSave, onLogout }) {
  const [page, setPage] = useState("battle");
  const [mobileNav, setMobileNav] = useState(false);
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
  const [equipment, setEquipment] = useState(() => sv.equipment || []);
  const [equipped, setEquipped] = useState(() => sv.equipped || DEFAULT_SAVE().equipped);
  const [pets, setPets] = useState(() => sv.pets || []);
  const [activePets, setActivePets] = useState(() => sv.activePets || []);
  const [petSlots] = useState(() => sv.petSlots || 1);
  const [unlockedSkills, setUnlockedSkills] = useState(() => sv.unlockedSkills || ["slash"]);
  const [equippedSkills, setEquippedSkills] = useState(() => sv.equippedSkills || ["slash", null, null]);
  const [ownedCostumes, setOwnedCostumes] = useState(() => sv.ownedCostumes || ["default"]);
  const [activeCostume, setActiveCostume] = useState(() => sv.activeCostume || "default");

  // Combat live
  const [battleState, setBattleState] = useState(null);
  const [playerHp, setPlayerHp] = useState(100);
  const [isBattling, setIsBattling] = useState(false);
  const [skillCooldowns, setSkillCooldowns] = useState({});
  const [log, setLog] = useState([]);
  const [showSummonResult, setShowSummonResult] = useState(null);

  // Popups
  const [offlinePopup, setOfflinePopup] = useState(null);
  const [loginRewardPopup, setLoginRewardPopup] = useState(null);

  const battleRef = useRef(null);
  const addLog = useCallback((msg) => { setLog(prev => [...prev.slice(-60), { msg, t: Date.now() }]); }, []);
  const addGold = useCallback((n) => { setGold(g => g + n); if (n > 0) setCombatStats(s => ({ ...s, totalGoldEarned: (s.totalGoldEarned || 0) + n })); }, []);

  // ─── DERIVED STATS ───
  const baseAtk = growth.atk * 3;
  const baseHp = 80 + growth.hp * 20;
  const baseDef = growth.def * 2;

  const equipBonus = useMemo(() => {
    const b = { atk: 0, def: 0, hp: 0, critRate: 0, critDmg: 0 };
    Object.values(equipped).forEach(id => { if (!id) return; const eq = equipment.find(e => e.id === id); if (!eq) return; Object.entries(eq.stats).forEach(([k, v]) => { b[k] = (b[k] || 0) + v; }); });
    return b;
  }, [equipped, equipment]);

  const petBonus = useMemo(() => {
    const b = { atkPct: 0, defPct: 0, hpPct: 0, goldPct: 0, xpPct: 0, critRate: 0, critDmg: 0 };
    activePets.forEach(pn => { const pd = PET_DEFS.find(p => p.name === pn); if (!pd) return; Object.entries(pd.bonus).forEach(([k, v]) => { b[k] = (b[k] || 0) + v; }); });
    return b;
  }, [activePets]);

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

  const totalAtk = Math.floor((baseAtk + equipBonus.atk + (costumeBonus.atkFlat || 0)) * (1 + ((petBonus.atkPct || 0) + (costumeBonus.atkPct || 0)) / 100));
  const totalDef = Math.floor((baseDef + equipBonus.def + (costumeBonus.defFlat || 0)) * (1 + ((petBonus.defPct || 0) + (costumeBonus.defPct || 0)) / 100));
  const totalMaxHp = Math.floor((baseHp + equipBonus.hp + (costumeBonus.hpFlat || 0)) * (1 + ((petBonus.hpPct || 0) + (costumeBonus.hpPct || 0)) / 100));
  const critRate = Math.min(80, (equipBonus.critRate || 0) + (petBonus.critRate || 0) + (costumeBonus.critRate || 0));
  const critDmg = 150 + (equipBonus.critDmg || 0) + (petBonus.critDmg || 0) + (costumeBonus.critDmg || 0);
  const goldMult = 1 + ((petBonus.goldPct || 0) + (costumeBonus.goldPct || 0)) / 100;
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
    currentStage, highestStage, growth, gold, diamonds, combatStats, stats, autoProgress,
    equipment, equipped, pets, activePets, petSlots, unlockedSkills, equippedSkills,
    ownedCostumes, activeCostume,
    player: { hp: playerHp, maxHp: totalMaxHp },
    isPremium: false, storePurchases: {},
    lastActiveTime: Date.now(),
  }), [currentStage, highestStage, growth, gold, diamonds, combatStats, stats, autoProgress, equipment, equipped, pets, activePets, petSlots, unlockedSkills, equippedSkills, ownedCostumes, activeCostume, playerHp, totalMaxHp]);

  useEffect(() => {
    const timer = setInterval(async () => {
      try { await window.storage.set(`save:${account.uid}`, JSON.stringify(buildSave())); } catch {}
    }, 15000);
    return () => clearInterval(timer);
  }, [account.uid, buildSave]);

  useEffect(() => { return () => { try { window.storage.set(`save:${account.uid}`, JSON.stringify(buildSave())); } catch {} }; }, [account.uid, buildSave]);

  // Time tracker
  useEffect(() => { const t = setInterval(() => setStats(s => ({ ...s, timePlayed: (s.timePlayed || 0) + 1 })), 1000); return () => clearInterval(t); }, []);

  // ─── GROWTH UPGRADES ───
  const upgradeGrowth = useCallback((stat) => { const cost = growthCost(growth[stat]); if (gold < cost) return; setGold(g => g - cost); setGrowth(g => ({ ...g, [stat]: g[stat] + 1 })); }, [growth, gold]);
  const upgradeGrowthMax = useCallback((stat) => {
    let rem = gold, lvl = growth[stat], spent = 0;
    while (rem >= growthCost(lvl)) { const c = growthCost(lvl); rem -= c; spent += c; lvl++; }
    if (lvl > growth[stat]) { setGold(g => g - spent); setGrowth(g => ({ ...g, [stat]: lvl })); }
  }, [growth, gold]);

  // ─── BATTLE SYSTEM ───
  const startBattle = useCallback((stage) => {
    const monster = getStageMonster(stage);
    setPlayerHp(totalMaxHp);
    setBattleState({ monsterHp: monster.hp, monsterMaxHp: monster.hp, killCount: 0, targetKills: monster.monstersToKill, stageGold: 0, monster, stageNum: stage });
    setIsBattling(true);
    setSkillCooldowns({});
  }, [totalMaxHp]);

  const stopBattle = useCallback(() => { if (battleRef.current) { clearInterval(battleRef.current); battleRef.current = null; } setIsBattling(false); setBattleState(null); }, []);

  useEffect(() => { if (!isBattling) startBattle(currentStage); }, [currentStage]);
  useEffect(() => { startBattle(currentStage); return () => { if (battleRef.current) clearInterval(battleRef.current); }; }, []);

  useEffect(() => {
    if (!isBattling || !battleState) return;
    const step = 100, atkSpd = 1500, mSpd = 2000;
    let pE = 0, mE = 0;

    battleRef.current = setInterval(() => {
      setBattleState(prev => {
        if (!prev) return prev;
        let { monsterHp, monsterMaxHp, killCount, targetKills, stageGold, monster, stageNum } = prev;
        pE += step; mE += step;

        if (pE >= atkSpd) {
          pE = 0;
          let dmg = Math.max(1, totalAtk - monster.def + Math.floor(Math.random() * 4));
          if (Math.random() * 100 < critRate) dmg = Math.floor(dmg * critDmg / 100);
          monsterHp -= dmg;
          setCombatStats(s => ({ ...s, totalDamage: s.totalDamage + dmg, highestHit: Math.max(s.highestHit || 0, dmg) }));
        }

        if (mE >= mSpd) {
          mE = 0;
          const mDmg = Math.max(1, monster.atk - totalDef + Math.floor(Math.random() * 3));
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

        if (monsterHp <= 0) {
          const effGold = Math.floor(monster.gold * goldMult);
          stageGold += effGold; killCount++;
          addGold(effGold);
          setCombatStats(s => ({ ...s, kills: s.kills + 1, bossesKilled: s.bossesKilled + (monster.isBoss ? 1 : 0) }));

          // Pet drop chance on boss kills
          if (monster.isBoss && Math.random() < 0.08) {
            const available = PET_DEFS.filter(p => !pets.includes(p.name));
            if (available.length > 0) {
              const newPet = available[Math.floor(Math.random() * available.length)];
              setPets(prev => [...prev, newPet.name]);
              addLog(`🐾 Boss dropped a pet: ${newPet.emoji} ${newPet.name}!`);
            }
          }

          if (killCount >= targetKills) {
            addLog(`✅ Stage ${stageLabel(stageNum)} cleared! +${fmt(stageGold)} gold`);
            const next = stageNum + 1;
            if (stageNum >= highestStage) setHighestStage(next);
            COMBAT_SKILLS.forEach(sk => {
              if (sk.unlockStage === next && !unlockedSkills.includes(sk.id)) {
                setUnlockedSkills(prev => [...prev, sk.id]);
                addLog(`🎉 New skill: ${sk.emoji} ${sk.name}!`);
              }
            });
            // Award diamonds every 10 stages
            if (stageNum % 10 === 0) {
              const dReward = 10 + Math.floor(stageNum / 10) * 5;
              setDiamonds(d => d + dReward);
              addLog(`💎 Stage ${stageLabel(stageNum)} bonus: +${dReward} diamonds!`);
            }
            if (autoProgress) {
              setCurrentStage(next);
              const nm = getStageMonster(next);
              return { monsterHp: nm.hp, monsterMaxHp: nm.hp, killCount: 0, targetKills: nm.monstersToKill, stageGold: 0, monster: nm, stageNum: next };
            } else { setIsBattling(false); return null; }
          }
          monsterHp = monsterMaxHp;
        }
        return { ...prev, monsterHp, killCount, stageGold };
      });
    }, step);

    return () => { if (battleRef.current) clearInterval(battleRef.current); };
  }, [isBattling, battleState?.stageNum, totalAtk, totalDef, critRate, critDmg, goldMult, autoProgress, highestStage, unlockedSkills, pets]);

  // ─── SKILL USAGE ───
  const useSkill = useCallback((sid) => {
    const sk = COMBAT_SKILLS.find(s => s.id === sid);
    if (!sk || !battleState || skillCooldowns[sid]) return;
    const dmg = Math.floor(totalAtk * sk.dmgMult);
    setBattleState(prev => prev ? { ...prev, monsterHp: prev.monsterHp - dmg } : prev);
    setCombatStats(s => ({ ...s, totalDamage: s.totalDamage + dmg, highestHit: Math.max(s.highestHit || 0, dmg) }));
    addLog(`${sk.emoji} ${sk.name}! ${fmt(dmg)} damage!`);
    setSkillCooldowns(p => ({ ...p, [sid]: true }));
    setTimeout(() => setSkillCooldowns(p => ({ ...p, [sid]: false })), sk.cooldown);
  }, [battleState, totalAtk, skillCooldowns, addLog]);

  // ─── EQUIPMENT ───
  const summonEquipment = useCallback((count) => {
    const cost = count === 1 ? 100 : 900;
    if (diamonds < cost) return;
    setDiamonds(d => d - cost);
    const results = [];
    const types = EQUIP_TYPES.map(t => t.id);
    for (let i = 0; i < (count === 1 ? 1 : 10); i++) results.push(generateEquipment(types[Math.floor(Math.random() * types.length)]));
    setEquipment(prev => [...prev, ...results]);
    setStats(s => ({ ...s, summons: (s.summons || 0) + results.length }));
    setShowSummonResult(results);
  }, [diamonds]);

  const equipItem = useCallback((eqId) => { const item = equipment.find(e => e.id === eqId); if (item) setEquipped(p => ({ ...p, [item.type]: eqId })); }, [equipment]);
  const unequipItem = useCallback((slot) => { setEquipped(p => ({ ...p, [slot]: null })); }, []);

  const mergeEquipment = useCallback((type, rarityId) => {
    const candidates = equipment.filter(e => e.type === type && e.rarity === rarityId && !Object.values(equipped).includes(e.id));
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
  }, [equipment, equipped, addLog]);

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
    return c?.emoji || "🧑‍⚔️";
  }, [activeCostume]);

  // ─── NAV ───
  const nav = (p) => { setPage(p); setMobileNav(false); };
  const chapter = getChapter(currentStage);
  const timeMins = Math.floor((stats.timePlayed || 0) / 60);
  const timeStr = timeMins >= 60 ? `${Math.floor(timeMins / 60)}h ${timeMins % 60}m` : `${timeMins}m`;

  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden", fontFamily: FONT_BODY, background: T.bg, color: T.text }}>

      {/* ═══ POPUPS ═══ */}

      {/* Offline Earnings Popup */}
      {offlinePopup && (
        <Popup title="Welcome Back!" icon="🌙" color={T.gold} onClose={() => setOfflinePopup(null)}>
          <div style={{ textAlign: "center", marginBottom: 16 }}>
            <div style={{ fontSize: 13, color: T.textSec, marginBottom: 12 }}>
              You were away for <span style={{ color: T.white, fontWeight: 700 }}>{offlinePopup.duration}</span>
              {offlinePopup.capped && <span style={{ color: T.textDim }}> (capped at {OFFLINE_MAX_HOURS}h)</span>}
            </div>
            <div style={{ display: "flex", gap: 16, justifyContent: "center" }}>
              <div style={{ padding: "14px 24px", borderRadius: T.r, background: `${T.gold}12`, border: `1px solid ${T.gold}25` }}>
                <div style={{ fontSize: 24, fontWeight: 900, color: T.gold, fontFamily: FONT_DISPLAY }}>{fmt(offlinePopup.gold)}</div>
                <div style={{ fontSize: 10, color: T.textDim, fontWeight: 600 }}>GOLD EARNED</div>
              </div>
              <div style={{ padding: "14px 24px", borderRadius: T.r, background: `${T.danger}12`, border: `1px solid ${T.danger}25` }}>
                <div style={{ fontSize: 24, fontWeight: 900, color: T.danger, fontFamily: FONT_DISPLAY }}>{fmt(offlinePopup.kills)}</div>
                <div style={{ fontSize: 10, color: T.textDim, fontWeight: 600 }}>MONSTERS SLAIN</div>
              </div>
            </div>
          </div>
          <div style={{ fontSize: 11, color: T.textDim, textAlign: "center" }}>
            Tip: Progress further in stages to earn more gold while offline!
          </div>
        </Popup>
      )}

      {/* Daily Login Reward Popup */}
      {loginRewardPopup && !offlinePopup && (
        <Popup title="Daily Login Reward!" icon="🎁" color={T.accent} onClose={() => setLoginRewardPopup(null)}>
          <div style={{ textAlign: "center", marginBottom: 16 }}>
            <Badge color={T.orange} style={{ fontSize: 12, padding: "4px 12px", marginBottom: 12 }}>
              🔥 Day {loginRewardPopup.dayIdx} — Streak: {loginRewardPopup.streak}
            </Badge>
            <div style={{ display: "flex", gap: 12, justifyContent: "center", marginTop: 12 }}>
              <div style={{ padding: "12px 20px", borderRadius: T.r, background: `${T.gold}12`, border: `1px solid ${T.gold}25` }}>
                <div style={{ fontSize: 20, fontWeight: 900, color: T.gold, fontFamily: FONT_DISPLAY }}>+{fmt(loginRewardPopup.gold)}</div>
                <div style={{ fontSize: 10, color: T.textDim, fontWeight: 600 }}>GOLD</div>
              </div>
              {loginRewardPopup.diamonds > 0 && (
                <div style={{ padding: "12px 20px", borderRadius: T.r, background: `${T.purple}12`, border: `1px solid ${T.purple}25` }}>
                  <div style={{ fontSize: 20, fontWeight: 900, color: T.purple, fontFamily: FONT_DISPLAY }}>+{loginRewardPopup.diamonds}</div>
                  <div style={{ fontSize: 10, color: T.textDim, fontWeight: 600 }}>DIAMONDS</div>
                </div>
              )}
            </div>
          </div>
          {/* 7-day preview */}
          <div style={{ display: "flex", gap: 4, justifyContent: "center", flexWrap: "wrap", marginTop: 8 }}>
            {LOGIN_REWARDS.map((r, i) => (
              <div key={i} style={{
                width: 44, padding: "6px 0", borderRadius: 6, textAlign: "center", fontSize: 9, fontWeight: 700,
                background: i < loginRewardPopup.dayIdx ? `${T.success}15` : i === loginRewardPopup.dayIdx - 1 ? `${T.accent}20` : T.bgDeep,
                border: `1px solid ${i === loginRewardPopup.dayIdx - 1 ? T.accent + "40" : T.divider}`,
                color: i < loginRewardPopup.dayIdx ? T.success : i === loginRewardPopup.dayIdx - 1 ? T.accent : T.textDim,
              }}>
                <div>D{i + 1}</div>
                <div style={{ fontSize: 8 }}>{i < loginRewardPopup.dayIdx ? "✓" : ""}</div>
              </div>
            ))}
          </div>
        </Popup>
      )}

      {/* ═══ SIDEBAR ═══ */}
      {(!isMobile || mobileNav) && (
        <div style={{
          width: isMobile ? "100%" : 230, flexShrink: 0, background: T.sidebar,
          borderRight: `1px solid ${T.sidebarBorder}`, display: "flex", flexDirection: "column",
          position: isMobile ? "fixed" : "relative", zIndex: 100, height: "100%", overflowY: "auto",
        }}>
          <div style={{ padding: "20px 18px 16px", borderBottom: `1px solid ${T.sidebarBorder}` }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 38, height: 38, borderRadius: 10, background: `${T.accent}18`, border: `1px solid ${T.accent}25`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>⚔️</div>
              <div>
                <div style={{ fontSize: 16, fontWeight: 900, color: T.white, fontFamily: FONT_DISPLAY, letterSpacing: 0.5 }}>BLADE REALMS</div>
                <div style={{ fontSize: 10, color: T.textDim }}>{account.displayName}</div>
              </div>
              {isMobile && <div onClick={() => setMobileNav(false)} style={{ marginLeft: "auto", fontSize: 18, cursor: "pointer", color: T.textDim, padding: 4 }}>✕</div>}
            </div>
          </div>

          <div style={{ padding: "10px 8px", flex: 1 }}>
            <div style={{ fontSize: 9, fontWeight: 700, color: T.textDim, padding: "10px 14px 4px", letterSpacing: 1.5, textTransform: "uppercase" }}>Battle</div>
            <SidebarItem icon="⚔️" label="Battle" active={page === "battle"} onClick={() => nav("battle")} color={T.danger} badge={stageLabel(currentStage)} />
            <SidebarItem icon="📊" label="Growth" active={page === "growth"} onClick={() => nav("growth")} color={T.success} />

            <div style={{ fontSize: 9, fontWeight: 700, color: T.textDim, padding: "12px 14px 4px", letterSpacing: 1.5, textTransform: "uppercase" }}>Gear</div>
            <SidebarItem icon="🎒" label="Equipment" active={page === "equipment"} onClick={() => nav("equipment")} color={T.warning} badge={`${equipment.length}`} />
            <SidebarItem icon="✨" label="Summon" active={page === "summon"} onClick={() => nav("summon")} color={T.purple} />
            <SidebarItem icon="👗" label="Costumes" active={page === "costumes"} onClick={() => nav("costumes")} color={T.teal} badge={`${ownedCostumes.length}/${COSTUMES.length}`} />
            <SidebarItem icon="🐾" label="Pets" active={page === "pets"} onClick={() => nav("pets")} color={T.pink} badge={pets.length > 0 ? `${pets.length}` : undefined} />

            <div style={{ fontSize: 9, fontWeight: 700, color: T.textDim, padding: "12px 14px 4px", letterSpacing: 1.5, textTransform: "uppercase" }}>Info</div>
            <SidebarItem icon="🏆" label="Stats" active={page === "stats"} onClick={() => nav("stats")} color={T.info} />
            <SidebarItem icon="⚙️" label="Settings" active={page === "settings"} onClick={() => nav("settings")} color={T.textSec} />
          </div>

          <div style={{ padding: "14px 18px", borderTop: `1px solid ${T.sidebarBorder}` }}>
            <div style={{ display: "flex", gap: 14, fontSize: 12, fontWeight: 700, marginBottom: 10 }}>
              <span style={{ color: T.gold }}>💰 {fmt(gold)}</span>
              <span style={{ color: T.purple }}>💎 {fmt(diamonds)}</span>
            </div>
            <div onClick={onLogout} style={{ fontSize: 11, color: T.textDim, cursor: "pointer", padding: "6px 0" }}>🚪 Logout</div>
          </div>
        </div>
      )}

      {/* ═══ MAIN ═══ */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>

        {/* HEADER */}
        <header style={{
          height: 56, flexShrink: 0, display: "flex", alignItems: "center", gap: 14,
          padding: isMobile ? "0 14px" : "0 28px",
          background: chapter.bgGrad, borderBottom: `1px solid ${T.headerBorder}`,
        }}>
          {isMobile && <div onClick={() => setMobileNav(!mobileNav)} style={{ fontSize: 22, cursor: "pointer", padding: "4px 6px", color: T.textSec }}>☰</div>}
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: `${chapter.color}18`, border: `1px solid ${chapter.color}30`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>{chapter.emoji}</div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 800, color: chapter.color, fontFamily: FONT_DISPLAY }}>{chapter.name}</div>
              <div style={{ fontSize: 10, color: T.textDim }}>Stage {stageLabel(currentStage)} • Best: {stageLabel(highestStage)}</div>
            </div>
          </div>
          <div style={{ flex: 1 }} />
          {/* Power rating */}
          {!isMobile && (
            <div style={{ padding: "4px 12px", borderRadius: 99, background: `${T.accent}10`, border: `1px solid ${T.accent}20`, marginRight: 8 }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: T.accent, fontFamily: FONT_DISPLAY }}>⚡ {fmt(totalAtk + totalDef + totalMaxHp)} CP</span>
            </div>
          )}
          <div style={{ display: "flex", gap: isMobile ? 10 : 18, fontSize: 11, fontWeight: 700 }}>
            <span style={{ color: T.danger }}>⚔️{fmt(totalAtk)}</span>
            <span style={{ color: T.info }}>🛡️{fmt(totalDef)}</span>
            <span style={{ color: T.success }}>❤️{fmt(totalMaxHp)}</span>
          </div>
          <div style={{ width: 30, height: 30, borderRadius: "50%", background: `${T.accent}12`, border: `1px solid ${T.accent}25`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, marginLeft: 8 }}>{heroEmoji}</div>
        </header>

        {/* HP Bar */}
        <div style={{ padding: "6px " + (isMobile ? "14px" : "28px"), background: `${T.bgDeep}cc` }}>
          <ProgressBar value={playerHp} max={totalMaxHp} color={playerHp < totalMaxHp * 0.3 ? T.danger : T.success}
            height={5} labelLeft="HP" labelRight={`${fmt(playerHp)} / ${fmt(totalMaxHp)}`} animated />
        </div>

        {/* CONTENT */}
        <div style={{ flex: 1, overflow: "auto", padding: isMobile ? 14 : 28 }}>

          {/* ═══ BATTLE ═══ */}
          {page === "battle" && (() => {
            const monster = battleState?.monster || getStageMonster(currentStage);
            return (
              <div>
                {/* Stage banner */}
                <div style={{ padding: "20px 24px", borderRadius: T.r, marginBottom: 18, background: chapter.bgGrad, border: `1px solid ${chapter.color}20`, position: "relative", overflow: "hidden" }}>
                  {/* Decorative glow */}
                  <div style={{ position: "absolute", top: -20, right: -20, width: 120, height: 120, borderRadius: "50%", background: `${chapter.color}08`, filter: "blur(40px)" }} />
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12, position: "relative" }}>
                    <div>
                      <div style={{ fontSize: 26, fontWeight: 900, color: T.white, fontFamily: FONT_DISPLAY, letterSpacing: -0.5 }}>
                        Stage {stageLabel(currentStage)}
                        {monster.isBoss && <Badge color={T.danger} style={{ marginLeft: 10, fontSize: 11, padding: "3px 10px" }}>BOSS</Badge>}
                      </div>
                      <div style={{ fontSize: 12, color: T.textSec, marginTop: 2 }}>{chapter.emoji} {chapter.name} • {monster.monstersToKill} enemies</div>
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                      <Btn small color={autoProgress ? T.success : T.textDim} onClick={() => setAutoProgress(!autoProgress)}>
                        {autoProgress ? "▶ Auto" : "⏸ Manual"}
                      </Btn>
                      {currentStage > 1 && <Btn small color={T.textSec} onClick={() => { stopBattle(); setCurrentStage(Math.max(1, currentStage - 1)); }}>◀</Btn>}
                    </div>
                  </div>
                </div>

                {/* Battle arena */}
                <Card glow={monster.isBoss ? T.danger : chapter.color} style={{ marginBottom: 18, padding: isMobile ? 20 : 28 }}>
                  {/* VS display */}
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: isMobile ? 16 : 40, marginBottom: 20, flexWrap: "wrap" }}>
                    {/* Hero */}
                    <div style={{ textAlign: "center" }}>
                      <div style={{
                        width: 70, height: 70, borderRadius: "50%", margin: "0 auto 8px",
                        background: `radial-gradient(circle, ${T.accent}20 0%, transparent 70%)`,
                        border: `2px solid ${T.accent}40`,
                        display: "flex", alignItems: "center", justifyContent: "center", fontSize: 34,
                        boxShadow: `0 0 20px ${T.accent}15`,
                      }}>{heroEmoji}</div>
                      <div style={{ fontSize: 12, fontWeight: 700, color: T.white, fontFamily: FONT_DISPLAY }}>{account.displayName}</div>
                      <div style={{ fontSize: 9, color: T.textDim }}>ATK {fmt(totalAtk)} • DEF {fmt(totalDef)}</div>
                    </div>

                    {/* VS badge */}
                    <div style={{
                      width: 40, height: 40, borderRadius: "50%", background: `${T.danger}18`, border: `1px solid ${T.danger}30`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 12, fontWeight: 900, color: T.danger, fontFamily: FONT_DISPLAY,
                    }}>VS</div>

                    {/* Monster */}
                    <div style={{ textAlign: "center" }}>
                      <div style={{
                        width: 70, height: 70, borderRadius: "50%", margin: "0 auto 8px",
                        background: `radial-gradient(circle, ${chapter.color}20 0%, transparent 70%)`,
                        border: `2px solid ${monster.isBoss ? T.danger + "50" : chapter.color + "30"}`,
                        display: "flex", alignItems: "center", justifyContent: "center", fontSize: 34,
                        boxShadow: `0 0 20px ${chapter.color}15`,
                        animation: isBattling ? "pulse 2s infinite" : undefined,
                      }}>{monster.emoji}</div>
                      <div style={{ fontSize: 12, fontWeight: 700, color: monster.isBoss ? T.danger : T.white, fontFamily: FONT_DISPLAY }}>{monster.name}</div>
                      <div style={{ fontSize: 9, color: T.textDim }}>ATK {fmt(monster.atk)} • DEF {fmt(monster.def)}</div>
                    </div>
                  </div>

                  {/* Monster HP */}
                  <div style={{ maxWidth: 420, margin: "0 auto 14px" }}>
                    <ProgressBar value={Math.max(0, battleState?.monsterHp || monster.hp)} max={monster.hp} color={T.danger} height={12} showLabel animated />
                  </div>

                  {/* Kill progress */}
                  <div style={{ maxWidth: 420, margin: "0 auto 18px" }}>
                    <ProgressBar value={battleState?.killCount || 0} max={monster.monstersToKill}
                      color={chapter.color} height={6} labelLeft="Kills" labelRight={`${battleState?.killCount || 0} / ${monster.monstersToKill}`} />
                  </div>

                  {/* Stage rewards */}
                  <div style={{ display: "flex", justifyContent: "center", gap: 24, fontSize: 12, fontWeight: 700 }}>
                    <span style={{ color: T.gold }}>💰 +{fmt(battleState?.stageGold || 0)}</span>
                    <span style={{ color: T.textSec }}>⚔️ Total: {fmt(combatStats.kills)}</span>
                    {combatStats.bossesKilled > 0 && <span style={{ color: T.orange }}>👑 Bosses: {combatStats.bossesKilled}</span>}
                  </div>
                </Card>

                {/* Skills */}
                <Card style={{ marginBottom: 18 }}>
                  <div style={{ fontSize: 13, fontWeight: 800, color: T.white, marginBottom: 12, fontFamily: FONT_DISPLAY }}>⚡ SKILLS</div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {equippedSkills.filter(Boolean).map(sid => {
                      const sk = COMBAT_SKILLS.find(s => s.id === sid);
                      if (!sk) return null;
                      const cd = skillCooldowns[sk.id];
                      return (
                        <div key={sk.id} onClick={() => useSkill(sk.id)} style={{
                          padding: "12px 20px", borderRadius: T.rs, cursor: cd ? "not-allowed" : "pointer",
                          background: cd ? T.bar : `${sk.color}12`,
                          border: `1px solid ${cd ? T.divider : sk.color + "35"}`,
                          color: cd ? T.textDim : sk.color,
                          fontWeight: 700, fontSize: 12, opacity: cd ? 0.5 : 1,
                          transition: "all 0.15s", boxShadow: cd ? undefined : `0 0 12px ${sk.color}10`,
                        }}>{sk.emoji} {sk.name} {cd && "⏳"}</div>
                      );
                    })}
                    {equippedSkills.filter(Boolean).length === 0 && <div style={{ fontSize: 11, color: T.textDim }}>No skills equipped — visit Growth page.</div>}
                  </div>
                </Card>

                {/* Log */}
                <Card>
                  <div style={{ fontSize: 13, fontWeight: 800, color: T.white, marginBottom: 8, fontFamily: FONT_DISPLAY }}>📜 BATTLE LOG</div>
                  <div style={{ maxHeight: 140, overflow: "auto", fontSize: 11, color: T.textSec }}>
                    {log.slice(-25).reverse().map((l, i) => (
                      <div key={i} style={{ padding: "3px 0", borderBottom: i < 24 ? `1px solid ${T.divider}08` : undefined, opacity: 1 - i * 0.03 }}>{l.msg}</div>
                    ))}
                    {log.length === 0 && <div style={{ color: T.textDim }}>Battle in progress...</div>}
                  </div>
                </Card>
              </div>
            );
          })()}

          {/* ═══ GROWTH ═══ */}
          {page === "growth" && (
            <div>
              <PageTitle icon="📊" title="GROWTH STATS" subtitle="Spend gold to power up your hero" />
              <div style={{ display: "grid", gridTemplateColumns: `repeat(auto-fill, minmax(${isMobile ? "100%" : "280px"}, 1fr))`, gap: 14, marginBottom: 24 }}>
                {[
                  { stat: "atk", label: "Attack", icon: "⚔️", color: T.danger, desc: "+3 ATK per level", val: `${baseAtk} ATK` },
                  { stat: "hp", label: "Health", icon: "❤️", color: T.success, desc: "+20 Max HP per level", val: `${baseHp} HP` },
                  { stat: "def", label: "Defense", icon: "🛡️", color: T.info, desc: "+2 DEF per level", val: `${baseDef} DEF` },
                ].map(g => {
                  const cost = growthCost(growth[g.stat]);
                  const ok = gold >= cost;
                  return (
                    <Card key={g.stat} hover>
                      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 16 }}>
                        <div style={{ width: 52, height: 52, borderRadius: 14, background: `${g.color}12`, border: `1px solid ${g.color}25`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26 }}>{g.icon}</div>
                        <div>
                          <div style={{ fontSize: 16, fontWeight: 900, color: T.white, fontFamily: FONT_DISPLAY }}>{g.label}</div>
                          <div style={{ fontSize: 11, color: T.textSec }}>Lv.{growth[g.stat]} — {g.val}</div>
                        </div>
                      </div>
                      <div style={{ fontSize: 11, color: T.textDim, marginBottom: 12 }}>{g.desc}</div>
                      <div style={{ display: "flex", gap: 8 }}>
                        <Btn small color={ok ? g.color : T.textDim} disabled={!ok} onClick={() => upgradeGrowth(g.stat)}>+1 (💰{fmt(cost)})</Btn>
                        <Btn small color={ok ? g.color : T.textDim} disabled={!ok} onClick={() => upgradeGrowthMax(g.stat)}>MAX</Btn>
                      </div>
                    </Card>
                  );
                })}
              </div>

              {/* Power overview */}
              <Card style={{ marginBottom: 18 }}>
                <div style={{ fontSize: 15, fontWeight: 900, color: T.white, marginBottom: 14, fontFamily: FONT_DISPLAY }}>⚡ TOTAL POWER</div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))", gap: 10 }}>
                  {[
                    { l: "ATK", v: fmt(totalAtk), c: T.danger }, { l: "DEF", v: fmt(totalDef), c: T.info },
                    { l: "HP", v: fmt(totalMaxHp), c: T.success }, { l: "Crit Rate", v: `${critRate}%`, c: T.orange },
                    { l: "Crit DMG", v: `${critDmg}%`, c: T.warning }, { l: "Gold+", v: `+${Math.floor((goldMult - 1) * 100)}%`, c: T.gold },
                  ].map((s, i) => (
                    <div key={i} style={{ textAlign: "center", padding: 14, borderRadius: T.rs, background: T.bgDeep, border: `1px solid ${T.divider}` }}>
                      <div style={{ fontSize: 18, fontWeight: 900, color: s.c, fontFamily: FONT_DISPLAY }}>{s.v}</div>
                      <div style={{ fontSize: 9, color: T.textDim, fontWeight: 600, marginTop: 2 }}>{s.l}</div>
                    </div>
                  ))}
                </div>
              </Card>

              {/* Skills */}
              <Card>
                <div style={{ fontSize: 15, fontWeight: 900, color: T.white, marginBottom: 14, fontFamily: FONT_DISPLAY }}>⚡ COMBAT SKILLS</div>
                <div style={{ display: "grid", gridTemplateColumns: `repeat(auto-fill, minmax(${isMobile ? "100%" : "240px"}, 1fr))`, gap: 10 }}>
                  {COMBAT_SKILLS.map(sk => {
                    const unlocked = unlockedSkills.includes(sk.id);
                    const isEq = equippedSkills.includes(sk.id);
                    return (
                      <div key={sk.id} style={{ padding: 14, borderRadius: T.rs, background: unlocked ? `${sk.color}06` : T.bgDeep, border: `1px solid ${unlocked ? sk.color + "20" : T.divider}`, opacity: unlocked ? 1 : 0.35 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                          <span style={{ fontSize: 20 }}>{sk.emoji}</span>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 12, fontWeight: 700, color: unlocked ? sk.color : T.textDim }}>{sk.name}</div>
                            <div style={{ fontSize: 10, color: T.textDim }}>{sk.desc} • {sk.cooldown / 1000}s</div>
                          </div>
                          {unlocked ? (
                            <Btn small color={isEq ? T.danger : T.success} onClick={() => {
                              if (isEq) setEquippedSkills(p => p.map(s => s === sk.id ? null : s));
                              else setEquippedSkills(p => { const i = p.indexOf(null); if (i >= 0) { const n = [...p]; n[i] = sk.id; return n; } return p; });
                            }}>{isEq ? "−" : "+"}</Btn>
                          ) : <Badge color={T.textDim}>Stage {sk.unlockStage}</Badge>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Card>
            </div>
          )}

          {/* ═══ EQUIPMENT ═══ */}
          {page === "equipment" && (
            <div>
              <PageTitle icon="🎒" title="EQUIPMENT" subtitle={`${equipment.length} items owned`} />
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
                          <div style={{ fontSize: 12, fontWeight: 700, color: rarColor(eq.rarity) }}>{eq.emoji} {eq.name}</div>
                          <div style={{ fontSize: 9, color: T.textSec, marginTop: 2 }}>{Object.entries(eq.stats).map(([k, v]) => `+${v} ${k}`).join(" • ")}</div>
                        </>) : <div style={{ fontSize: 11, color: T.textDim }}>{slot.emoji} Empty</div>}
                      </div>
                    );
                  })}
                </div>
              </Card>

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
                              <div style={{ fontSize: 12, fontWeight: 700, color: rarColor(pd.rarity) }}>{pd.name}</div>
                              <div style={{ fontSize: 10, color: T.textSec }}>{Object.entries(pd.bonus).map(([k, v]) => `+${v}% ${k}`).join(", ")}</div>
                            </div>
                            {active && <Badge color={T.success}>Active</Badge>}
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
            </div>
          )}

        </div>
      </div>

      {/* ═══ GLOBAL STYLES ═══ */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Rajdhani:wght@500;600;700&family=DM+Sans:wght@400;500;600;700&display=swap');

        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: ${T.bg}; overflow: hidden; }
        ::-webkit-scrollbar { width: 5px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: ${T.divider}; border-radius: 99px; }
        ::-webkit-scrollbar-thumb:hover { background: ${T.textDim}; }

        @keyframes pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.06); } }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes shimmer { 0% { transform: translateX(-100%); } 100% { transform: translateX(400%); } }
        @keyframes glow { 0%, 100% { box-shadow: 0 0 8px var(--glow-color, #6366f140); } 50% { box-shadow: 0 0 20px var(--glow-color, #6366f160); } }
        @keyframes float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-4px); } }
        @keyframes shake { 0%, 100% { transform: translateX(0); } 25% { transform: translateX(-2px); } 75% { transform: translateX(2px); } }

        /* Smooth page transitions */
        [data-page] { animation: fadeIn 0.2s ease; }
      `}</style>
    </div>
  );
}
