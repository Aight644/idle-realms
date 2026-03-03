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
  equipped: { weapon: null, armor: null, helm: null, gloves: null, boots: null, ring: null, amulet: null },
  pets: [], activePets: [], petSlots: 1,
  gold: 100, diamonds: 50,
  unlockedSkills: ["slash"], equippedSkills: ["slash", null, null],
  ownedCostumes: ["default"], activeCostume: "default",
  achievementsUnlocked: {},
  dungeonAttempts: {}, // { dungeonId: { date: "datestring", used: 0 } }
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
  const [equipment, setEquipment] = useState(() => sv.equipment || []);
  const [equipped, setEquipped] = useState(() => sv.equipped || DEFAULT_SAVE().equipped);
  const [pets, setPets] = useState(() => sv.pets || []);
  const [activePets, setActivePets] = useState(() => sv.activePets || []);
  const [petSlots] = useState(() => sv.petSlots || 1);
  const [unlockedSkills, setUnlockedSkills] = useState(() => sv.unlockedSkills || ["slash"]);
  const [equippedSkills, setEquippedSkills] = useState(() => sv.equippedSkills || ["slash", null, null]);
  const [ownedCostumes, setOwnedCostumes] = useState(() => sv.ownedCostumes || ["default"]);
  const [activeCostume, setActiveCostume] = useState(() => sv.activeCostume || "default");
  const [achievementsUnlocked, setAchievementsUnlocked] = useState(() => sv.achievementsUnlocked || {});
  const [dungeonAttempts, setDungeonAttempts] = useState(() => sv.dungeonAttempts || {});
  const [dungeonResult, setDungeonResult] = useState(null); // popup for dungeon result

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
  const [monsterAnim, setMonsterAnim] = useState(""); // "hit", "die", "idle"
  const [screenFlash, setScreenFlash] = useState(null); // {color, ts}
  const [goldPopups, setGoldPopups] = useState([]); // [{id, amount, ts}]
  const dmgIdRef = useRef(0);

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

  const triggerMonsterHit = useCallback(() => {
    setMonsterAnim("hit");
    setTimeout(() => setMonsterAnim(""), 200);
  }, []);

  const triggerHeroHit = useCallback(() => {
    setHeroAnim("hit");
    setTimeout(() => setHeroAnim(""), 200);
  }, []);

  const triggerMonsterDie = useCallback(() => {
    setMonsterAnim("die");
    setTimeout(() => setMonsterAnim(""), 400);
  }, []);

  const triggerFlash = useCallback((color) => {
    setScreenFlash({ color, ts: Date.now() });
    setTimeout(() => setScreenFlash(null), 150);
  }, []);

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
    ownedCostumes, activeCostume, achievementsUnlocked, dungeonAttempts,
    player: { hp: playerHp, maxHp: totalMaxHp },
    isPremium: false, storePurchases: {},
    lastActiveTime: Date.now(),
  }), [currentStage, highestStage, growth, gold, diamonds, combatStats, stats, autoProgress, equipment, equipped, pets, activePets, petSlots, unlockedSkills, equippedSkills, ownedCostumes, activeCostume, achievementsUnlocked, playerHp, totalMaxHp]);

  useEffect(() => {
    const timer = setInterval(async () => {
      try { await window.storage.set(`save:${account.uid}`, JSON.stringify(buildSave())); } catch {}
    }, 15000);
    return () => clearInterval(timer);
  }, [account.uid, buildSave]);

  useEffect(() => { return () => { try { window.storage.set(`save:${account.uid}`, JSON.stringify(buildSave())); } catch {} }; }, [account.uid, buildSave]);

  // Time tracker
  useEffect(() => { const t = setInterval(() => setStats(s => ({ ...s, timePlayed: (s.timePlayed || 0) + 1 })), 1000); return () => clearInterval(t); }, []);

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
    }, 2000); // check every 2 seconds
    return () => { if (achCheckRef.current) clearInterval(achCheckRef.current); };
  }, [combatStats, highestStage, growth, stats, equipment.length, pets.length, ownedCostumes.length, addLog]);

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
    // Auto-skill cooldown tracking (ms remaining)
    const skillCDs = {};

    battleRef.current = setInterval(() => {
      setBattleState(prev => {
        if (!prev) return prev;
        let { monsterHp, monsterMaxHp, killCount, targetKills, stageGold, monster, stageNum } = prev;
        pE += step; mE += step;

        // Tick down skill cooldowns
        equippedSkills.filter(Boolean).forEach(sid => {
          if (skillCDs[sid] > 0) skillCDs[sid] -= step;
        });

        if (pE >= atkSpd) {
          pE = 0;
          let dmg = Math.max(1, totalAtk - monster.def + Math.floor(Math.random() * 4));
          const wasCrit = Math.random() * 100 < critRate;
          if (wasCrit) dmg = Math.floor(dmg * critDmg / 100);
          monsterHp -= dmg;
          setCombatStats(s => ({ ...s, totalDamage: s.totalDamage + dmg, highestHit: Math.max(s.highestHit || 0, dmg) }));
          triggerHeroAttack();
          triggerMonsterHit();
          addDmgNumber(dmg, "right", wasCrit);
          if (wasCrit) triggerFlash(T.warning);

          // Auto-cast equipped skills when off cooldown
          equippedSkills.filter(Boolean).forEach(sid => {
            if ((skillCDs[sid] || 0) <= 0) {
              const sk = COMBAT_SKILLS.find(s => s.id === sid);
              if (sk) {
                const sDmg = Math.floor(totalAtk * sk.dmgMult);
                monsterHp -= sDmg;
                setCombatStats(s => ({ ...s, totalDamage: s.totalDamage + sDmg, highestHit: Math.max(s.highestHit || 0, sDmg) }));
                skillCDs[sid] = sk.cooldown;
                setSkillCooldowns(p => ({ ...p, [sid]: true }));
                setTimeout(() => setSkillCooldowns(p => ({ ...p, [sid]: false })), sk.cooldown);
                addLog(`${sk.emoji} ${sk.name}! ${fmt(sDmg)} damage!`);
                addDmgNumber(sDmg, "right", false, sk.emoji);
                triggerFlash(sk.color);
              }
            }
          });
        }

        if (mE >= mSpd) {
          mE = 0;
          const mDmg = Math.max(1, monster.atk - totalDef + Math.floor(Math.random() * 3));
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

        if (monsterHp <= 0) {
          const effGold = Math.floor(monster.gold * goldMult);
          stageGold += effGold; killCount++;
          addGold(effGold);
          triggerMonsterDie();
          addGoldPopup(effGold);
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
  }, [isBattling, battleState?.stageNum, totalAtk, totalDef, critRate, critDmg, goldMult, autoProgress, highestStage, unlockedSkills, pets, equippedSkills, triggerHeroAttack, triggerMonsterHit, triggerHeroHit, triggerMonsterDie, triggerFlash, addDmgNumber, addGoldPopup]);

  // Skills are now auto-cast in the battle loop — no manual activation needed

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
    return c?.emoji || "⚔️";
  }, [activeCostume]);

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

    // Show result popup
    setDungeonResult({ ...result, dungeon, tierIdx });
    addLog(`🏰 ${dungeon.name} (${tier.name}): ${result.success ? "CLEARED!" : `Failed at wave ${result.waves}/${result.totalWaves}`} ${result.totalReward.gold ? `+${fmt(result.totalReward.gold)}g` : ""} ${result.totalReward.diamonds ? `+${result.totalReward.diamonds}💎` : ""} ${result.totalReward.growthLevels ? `+${result.totalReward.growthLevels} growth levels` : ""}`);
  }, [getDungeonAttemptsLeft, highestStage, totalAtk, totalDef, totalMaxHp, addGold, addLog]);

  // ─── NAV ───
  const nav = (p) => { setPage(p); };
  const chapter = getChapter(currentStage);
  const timeMins = Math.floor((stats.timePlayed || 0) / 60);
  const timeStr = timeMins >= 60 ? `${Math.floor(timeMins / 60)}h ${timeMins % 60}m` : `${timeMins}m`;



  return (
    <div style={{ position: "relative", width: "100%", height: "100vh", maxWidth: 480, margin: "0 auto", overflow: "hidden", fontFamily: FONT_BODY, background: "#0a0c14", color: T.text }}>

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
          <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column" }}>

            {/* ── TOP: Avatar + currencies ── */}
            <div style={{ display: "flex", alignItems: "center", padding: "6px 8px 0", gap: 6, zIndex: 10 }}>
              <div style={{ position: "relative", flexShrink: 0 }}>
                <div style={{ width: 40, height: 40, borderRadius: "50%", background: `linear-gradient(135deg, ${T.accent}30, ${T.purple}30)`, border: `2px solid ${T.accent}60`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, boxShadow: `0 0 12px ${T.accent}30` }}>{heroEmoji}</div>
                <div style={{ position: "absolute", bottom: -2, right: -2, width: 14, height: 14, borderRadius: "50%", background: T.success, border: "2px solid #0a0c14", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 6 }}>▶</div>
              </div>
              <div style={{ flexShrink: 0 }}>
                <div style={{ fontSize: 10, fontWeight: 800, color: T.white, fontFamily: FONT_DISPLAY, lineHeight: 1.1 }}>{account.displayName}</div>
                <div style={{ fontSize: 8, fontWeight: 700, color: T.accent, fontFamily: FONT_DISPLAY }}>⚡{fmt(totalAtk + totalDef + totalMaxHp)}</div>
              </div>
              <div style={{ flex: 1 }} />
              {[
                { icon: "🪙", val: fmt(gold), c: "#f5c542" },
                { icon: "💎", val: fmt(diamonds), c: "#60a5fa" },
                { icon: "❤️", val: fmt(totalMaxHp), c: "#f87171" },
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
                  {stageLabel(currentStage)} ({battleState?.killCount || 0}/{monster.monstersToKill})
                </div>
              </div>
            </div>

            {/* ── BATTLEFIELD ── */}
            <div style={{ flex: 1, position: "relative", overflow: "hidden" }}>
              {/* BG */}
              <div style={{ position: "absolute", inset: 0, background: `radial-gradient(ellipse at 50% 30%, ${chapter.color}15 0%, transparent 50%), ${chapter.bgGrad}` }} />
              {/* Floor */}
              <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "55%", background: "repeating-conic-gradient(#ffffff04 0% 25%, transparent 0% 50%) 0 0 / 40px 40px", transform: "perspective(300px) rotateX(45deg)", transformOrigin: "bottom center", opacity: 0.5 }} />
              {/* Portal */}
              <div style={{ position: "absolute", top: "2%", left: "50%", transform: "translateX(-50%)", width: 140, height: 90, borderRadius: "50%", background: `radial-gradient(ellipse, ${chapter.color}30 0%, ${chapter.color}10 40%, transparent 70%)`, animation: "portalPulse 3s ease-in-out infinite", filter: "blur(2px)" }} />

              {/* Screen flash */}
              {screenFlash && <div key={screenFlash.ts} style={{ position: "absolute", inset: 0, zIndex: 30, pointerEvents: "none", background: `radial-gradient(circle, ${screenFlash.color}30 0%, transparent 70%)`, animation: "flashFade 0.15s ease-out forwards" }} />}

              {/* Floating dmg */}
              {floatingDmg.map(d => (
                <div key={d.id} style={{ position: "absolute", zIndex: 25, pointerEvents: "none", left: d.side === "right" ? `${52 + Math.random() * 18}%` : `${12 + Math.random() * 18}%`, top: "35%", animation: "dmgFloat 1.1s ease-out forwards" }}>
                  {d.skill && <span style={{ fontSize: 14 }}>{d.skill}</span>}
                  <span style={{ fontSize: d.crit ? 24 : d.skill ? 20 : 16, fontWeight: 900, fontFamily: FONT_DISPLAY, color: d.crit ? "#ffd700" : d.side === "right" ? "#fff" : "#ff4444", textShadow: `0 0 10px ${d.crit ? "#ffd700" : d.side === "right" ? "#6366f1" : "#ff4444"}80, 0 2px 6px #000c` }}>{d.crit ? "CRIT! " : ""}{fmt(d.dmg)}</span>
                </div>
              ))}

              {/* Gold popups */}
              {goldPopups.map(g => (
                <div key={g.id} style={{ position: "absolute", zIndex: 25, pointerEvents: "none", left: "50%", top: "55%", animation: "goldFloat 1s ease-out forwards" }}>
                  <span style={{ fontSize: 14, fontWeight: 900, color: T.gold, fontFamily: FONT_DISPLAY, textShadow: `0 0 8px ${T.gold}60, 0 2px 4px #000` }}>+{fmt(g.amount)}</span>
                </div>
              ))}

              {/* HERO */}
              <div style={{ position: "absolute", left: "22%", top: "40%", transform: "translate(-50%, -50%)", textAlign: "center", zIndex: 10 }}>
                <div style={{ width: 56, height: 5, background: "#00000060", borderRadius: 3, overflow: "hidden", margin: "0 auto 3px", border: "1px solid #ffffff10" }}>
                  <div style={{ width: `${(playerHp / totalMaxHp) * 100}%`, height: "100%", background: "linear-gradient(90deg, #22c55e, #4ade80)", borderRadius: 3, transition: "width 0.15s" }} />
                </div>
                <div style={{ width: 60, height: 60, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 34, animation: heroAnim === "attack" ? "heroAttack 0.3s ease" : heroAnim === "hit" ? "heroHit 0.2s ease" : "heroIdle 3s ease-in-out infinite", filter: heroAnim === "hit" ? "brightness(2)" : "drop-shadow(0 4px 8px #00000060)" }}>{heroEmoji}</div>
                <div style={{ fontSize: 7, fontWeight: 800, color: "#fff", fontFamily: FONT_DISPLAY, marginTop: 1, textShadow: "0 1px 4px #000" }}>{account.displayName}</div>
              </div>

              {/* MONSTER */}
              <div style={{ position: "absolute", right: "22%", top: "40%", transform: "translate(50%, -50%)", textAlign: "center", zIndex: 10 }}>
                <div style={{ width: 56, height: 5, background: "#00000060", borderRadius: 3, overflow: "hidden", margin: "0 auto 3px", border: "1px solid #ffffff10" }}>
                  <div style={{ width: `${Math.max(0, ((battleState?.monsterHp || monster.hp) / monster.hp) * 100)}%`, height: "100%", background: "linear-gradient(90deg, #ef4444, #f87171)", borderRadius: 3, transition: "width 0.15s" }} />
                </div>
                <div style={{ width: 60, height: 60, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "center", fontSize: monster.isBoss ? 40 : 34, animation: monsterAnim === "hit" ? "monsterHit 0.2s ease" : monsterAnim === "die" ? "monsterDie 0.4s ease forwards" : "monsterIdle 2.5s ease-in-out infinite", filter: monsterAnim === "hit" ? "brightness(2.5)" : "drop-shadow(0 4px 8px #00000060)" }}>{monster.emoji}</div>
                <div style={{ fontSize: 7, fontWeight: 800, color: monster.isBoss ? "#f87171" : "#fff", fontFamily: FONT_DISPLAY, marginTop: 1, textShadow: "0 1px 4px #000" }}>{monster.name}{monster.isBoss ? " 👑" : ""}</div>
              </div>

              {/* Decorative scattered coins */}
              {[{ x: "25%", y: "65%" }, { x: "55%", y: "72%" }, { x: "72%", y: "60%" }, { x: "38%", y: "68%" }].map((c, i) => (
                <div key={i} style={{ position: "absolute", left: c.x, top: c.y, fontSize: 9, opacity: 0.35, pointerEvents: "none", animation: `sparkle ${2 + i * 0.5}s ease-in-out infinite ${i * 0.3}s` }}>🪙</div>
              ))}

              {/* LEFT SIDE ICONS */}
              <div style={{ position: "absolute", left: 4, top: "20%", display: "flex", flexDirection: "column", gap: 4, zIndex: 20 }}>
                {[
                  { icon: "💎", sub: fmt(diamonds), p: null, bg: "#101828" },
                  { icon: "📊", sub: null, p: "growth", bg: "#101828" },
                  { icon: "👗", sub: null, p: "costumes", bg: "#101828" },
                  { icon: "⭐", sub: null, p: "achievements", bg: "#101828" },
                ].map((b, i) => (
                  <div key={i} onClick={b.p ? () => nav(b.p) : undefined} style={{ width: 34, height: b.sub ? 40 : 34, borderRadius: 7, cursor: b.p ? "pointer" : "default", background: b.bg, border: "1px solid #ffffff08", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 0, boxShadow: "0 2px 6px #00000040" }}>
                    <span style={{ fontSize: 15, lineHeight: 1 }}>{b.icon}</span>
                    {b.sub && <span style={{ fontSize: 7, fontWeight: 800, color: "#60a5fa", fontFamily: FONT_DISPLAY, lineHeight: 1 }}>{b.sub}</span>}
                  </div>
                ))}
              </div>

              {/* RIGHT SIDE ICONS */}
              <div style={{ position: "absolute", right: 4, top: "12%", display: "flex", flexDirection: "column", gap: 4, zIndex: 20 }}>
                {[
                  { icon: "🏰", p: "dungeons" },
                  { icon: "🐾", p: "pets" },
                  { icon: "🎁", p: null },
                  { icon: "⚙️", p: "settings" },
                  { icon: "📈", p: "stats" },
                ].map((b, i) => (
                  <div key={i} onClick={b.p ? () => nav(b.p) : undefined} style={{ width: 34, height: 34, borderRadius: 7, cursor: b.p ? "pointer" : "default", background: "#1a1610", border: "1px solid #ffffff08", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, boxShadow: "0 2px 6px #00000040" }}>{b.icon}</div>
                ))}
              </div>
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
              </div>
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

            {/* ── BOTTOM TABS ── */}
            <div style={{ flexShrink: 0, display: "flex", alignItems: "stretch", background: "linear-gradient(180deg, #12141e, #0a0c14)", borderTop: "1px solid #ffffff08", paddingBottom: "max(4px, env(safe-area-inset-bottom))" }}>
              {[
                { icon: "🗡️", label: "Equip", p: "equipment" },
                { icon: "🐾", label: "Pets", p: "pets" },
                { icon: "✨", label: "Summon", p: "summon" },
                { icon: "⭐", label: "Growth", p: "growth" },
                { icon: "🏰", label: "Dungeon", p: "dungeons" },
                { icon: "💀", label: "Achieve", p: "achievements" },
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
        );
      })()}

      {/* ═══ PAGE PANEL (slides up from bottom, battle stays visible at top) ═══ */}
      {page !== "battle" && (
        <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, top: "18%", zIndex: 50, display: "flex", flexDirection: "column", animation: "panelSlideUp 0.25s ease" }}>
          {/* Panel header with drag handle */}
          <div style={{ flexShrink: 0, borderRadius: "16px 16px 0 0", background: "linear-gradient(180deg, #181a24, #10121a)", borderTop: "1px solid #ffffff10", padding: "6px 12px 8px" }}>
            {/* Drag handle */}
            <div style={{ width: 36, height: 4, borderRadius: 99, background: "#ffffff15", margin: "0 auto 6px" }} />
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div onClick={() => nav("battle")} style={{ width: 28, height: 28, borderRadius: 7, cursor: "pointer", background: "#1a1c28", border: "1px solid #ffffff0a", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, color: T.textSec, fontWeight: 900 }}>✕</div>
              <div style={{ flex: 1, fontSize: 13, fontWeight: 900, color: T.white, fontFamily: FONT_DISPLAY, textTransform: "uppercase" }}>
                {page === "dungeons" && "🏰 Dungeons"}{page === "growth" && "📊 Growth"}{page === "equipment" && "🗡️ Equipment"}{page === "summon" && "✨ Summon"}{page === "pets" && "🐾 Pets"}{page === "costumes" && "👗 Costumes"}{page === "achievements" && "💀 Achievements"}{page === "stats" && "📈 Stats"}{page === "settings" && "⚙️ Settings"}
              </div>
              <div style={{ display: "flex", gap: 5 }}>
                <span style={{ fontSize: 9, fontWeight: 800, color: "#f5c542", fontFamily: FONT_DISPLAY }}>🪙{fmt(gold)}</span>
                <span style={{ fontSize: 9, fontWeight: 800, color: "#60a5fa", fontFamily: FONT_DISPLAY }}>💎{fmt(diamonds)}</span>
              </div>
            </div>
          </div>
          {/* Scrollable content */}
          <div style={{ flex: 1, overflow: "auto", padding: "10px 12px", paddingBottom: 60, background: "#10121aee", backdropFilter: "blur(6px)" }}>
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
              <Card style={{ marginTop: 12 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 0" }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: T.white }}>Account</div>
                    <div style={{ fontSize: 11, color: T.textSec }}>{account.displayName} • {account.email}</div>
                  </div>
                  <Btn small color={T.danger} onClick={onLogout}>Logout</Btn>
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
              { icon: "✨", label: "Summon", p: "summon" },
              { icon: "⭐", label: "Growth", p: "growth" },
              { icon: "🏰", label: "Dungeon", p: "dungeons" },
              { icon: "💀", label: "Achieve", p: "achievements" },
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

        /* Battle animations */
        @keyframes heroIdle { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-3px); } }
        @keyframes heroAttack { 0% { transform: translateX(0) scale(1); } 40% { transform: translateX(24px) scale(1.15); } 100% { transform: translateX(0) scale(1); } }
        @keyframes heroHit { 0% { transform: translateX(0); filter: brightness(1); } 50% { transform: translateX(-8px); filter: brightness(2.5); } 100% { transform: translateX(0); filter: brightness(1); } }
        @keyframes monsterIdle { 0%, 100% { transform: translateY(0) scale(1); } 50% { transform: translateY(-2px) scale(1.02); } }
        @keyframes monsterHit { 0% { transform: translateX(0) scale(1); filter: brightness(1); } 30% { transform: translateX(10px) scale(0.92); filter: brightness(3); } 100% { transform: translateX(0) scale(1); filter: brightness(1); } }
        @keyframes monsterDie { 0% { transform: scale(1) rotate(0deg); opacity: 1; } 50% { transform: scale(1.15) rotate(8deg); opacity: 0.7; } 100% { transform: scale(0) rotate(25deg); opacity: 0; } }
        @keyframes dmgFloat { 0% { opacity: 1; transform: translateY(0) scale(0.5); } 15% { opacity: 1; transform: translateY(-12px) scale(1.3); } 30% { transform: translateY(-24px) scale(1); } 100% { opacity: 0; transform: translateY(-80px) scale(0.7); } }
        @keyframes goldFloat { 0% { opacity: 1; transform: translateX(-50%) translateY(0) scale(0.8); } 20% { opacity: 1; transform: translateX(-50%) translateY(-12px) scale(1.15); } 100% { opacity: 0; transform: translateX(-50%) translateY(-45px) scale(0.6); } }
        @keyframes flashFade { 0% { opacity: 1; } 100% { opacity: 0; } }
        @keyframes portalPulse { 0%, 100% { transform: translateX(-50%) scale(1); opacity: 0.6; } 50% { transform: translateX(-50%) scale(1.1); opacity: 1; } }
        @keyframes panelSlideUp { from { transform: translateY(40%); opacity: 0.5; } to { transform: translateY(0); opacity: 1; } }

        ::selection { background: ${T.accent}40; color: ${T.white}; }
      `}</style>
    </div>
  );
}
