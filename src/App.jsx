import { useState, useCallback, useEffect, useRef } from "react";
import { auth } from './firebase.js';
import './storage.js'; // installs window.storage backed by Firestore
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
} from 'firebase/auth';

// ─── THEME ───
const T = {
  bg: "#1c1f26",
  bgDeep: "#151820",
  sidebar: "#171a21",
  sidebarBorder: "#252832",
  sidebarActive: "#1f2330",
  sidebarHover: "#1c2029",
  card: "#21242d",
  cardBorder: "#2c2f3a",
  header: "#1a1d25",
  headerBorder: "#252832",
  accent: "#3b82f6",
  success: "#22c55e",
  successMuted: "#22c55e20",
  danger: "#ef4444",
  dangerMuted: "#ef444420",
  warning: "#eab308",
  warningMuted: "#eab30820",
  info: "#06b6d4",
  infoMuted: "#06b6d420",
  purple: "#8b5cf6",
  purpleMuted: "#8b5cf620",
  orange: "#f97316",
  orangeMuted: "#f9731620",
  teal: "#14b8a6",
  tealMuted: "#14b8a620",
  pink: "#ec4899",
  pinkMuted: "#ec489920",
  text: "#e1e4ea",
  textSec: "#9096a8",
  textDim: "#585e72",
  white: "#f8f9fb",
  gold: "#facc15",
  bar: "#2a2d38",
  divider: "#282b36",
  r: 8,
  rs: 6,
};

const FONT = `"Inter", "Segoe UI", system-ui, -apple-system, sans-serif`;

// ─── SKILLS CONFIG ───
const SKILLS_CONFIG = {
  combat:     { name: "Combat",      icon: "⚔️", color: T.danger,  bg: T.dangerMuted,  type: "combat",    desc: "Fight monsters for gold, XP, and loot drops" },
  mining:     { name: "Mining",      icon: "⛏️", color: T.warning, bg: T.warningMuted, type: "gathering", desc: "Mine rocks to obtain ores and gems" },
  woodcutting:{ name: "Woodcutting", icon: "🪓", color: T.success, bg: T.successMuted, type: "gathering", desc: "Chop trees for logs used in crafting" },
  fishing:    { name: "Fishing",     icon: "🎣", color: T.info,    bg: T.infoMuted,    type: "gathering", desc: "Catch fish from rivers and seas" },
  cooking:    { name: "Cooking",     icon: "🍳", color: T.orange,  bg: T.orangeMuted,  type: "artisan",   desc: "Cook raw fish into food that heals HP" },
  smithing:   { name: "Smithing",    icon: "🔨", color: T.warning, bg: T.warningMuted, type: "artisan",   desc: "Forge weapons and armor from ores" },
  alchemy:    { name: "Alchemy",     icon: "🧪", color: T.teal,    bg: T.tealMuted,    type: "artisan",   desc: "Brew potions and elixirs from drops" },
  magic:      { name: "Magic",       icon: "✨", color: T.purple,  bg: T.purpleMuted,  type: "combat",    desc: "Harness arcane power to boost MP" },
};

const xpForLevel = (lvl) => Math.floor(50 * Math.pow(lvl, 1.8));
const SKILL_IDS = Object.keys(SKILLS_CONFIG);

const MONSTERS = [
  { name: "Slime", emoji: "🟢", lvl: 1, hp: 10, atk: 1, def: 0, speed: 2500, xpR: 5, goldR: 2, drops: [{ item: "Slime Gel", pct: 40 }] },
  { name: "Rat", emoji: "🐀", lvl: 1, hp: 15, atk: 2, def: 1, speed: 2200, xpR: 8, goldR: 3, drops: [{ item: "Rat Tail", pct: 35 }] },
  { name: "Goblin", emoji: "👺", lvl: 3, hp: 30, atk: 4, def: 2, speed: 2800, xpR: 15, goldR: 8, drops: [{ item: "Goblin Ear", pct: 25 }, { item: "Herb", pct: 20 }] },
  { name: "Skeleton", emoji: "💀", lvl: 5, hp: 45, atk: 6, def: 4, speed: 3000, xpR: 25, goldR: 12, drops: [{ item: "Bone", pct: 35 }, { item: "Shadow Dust", pct: 10 }] },
  { name: "Wolf", emoji: "🐺", lvl: 8, hp: 60, atk: 8, def: 3, speed: 1800, xpR: 35, goldR: 15, drops: [{ item: "Wolf Pelt", pct: 30 }, { item: "Beast Fang", pct: 15 }] },
  { name: "Orc", emoji: "👹", lvl: 12, hp: 100, atk: 12, def: 8, speed: 3200, xpR: 60, goldR: 30, drops: [{ item: "Orc Tooth", pct: 20 }, { item: "Thick Hide", pct: 15 }] },
  { name: "Dark Mage", emoji: "🧙", lvl: 16, hp: 80, atk: 18, def: 5, speed: 3500, xpR: 80, goldR: 45, drops: [{ item: "Mana Crystal", pct: 20 }, { item: "Shadow Dust", pct: 25 }] },
  { name: "Dragon", emoji: "🐉", lvl: 25, hp: 250, atk: 30, def: 20, speed: 4000, xpR: 200, goldR: 100, drops: [{ item: "Dragon Scale", pct: 15 }, { item: "Dragon Fang", pct: 10 }] },
  { name: "Elder Lich", emoji: "☠️", lvl: 30, hp: 500, atk: 35, def: 15, speed: 3000, xpR: 500, goldR: 200, drops: [{ item: "Shadow Dust", pct: 50 }, { item: "Mana Crystal", pct: 40 }, { item: "Dragon Scale", pct: 8 }], boss: true },
  { name: "World Serpent", emoji: "🐍", lvl: 40, hp: 1000, atk: 50, def: 30, speed: 3500, xpR: 1200, goldR: 500, drops: [{ item: "Dragon Scale", pct: 30 }, { item: "Dragon Fang", pct: 20 }, { item: "Mana Crystal", pct: 50 }], boss: true },
];

const GATHER_NODES = {
  mining: [
    { name: "Copper Rock", emoji: "🪨", lvl: 1, time: 3000, xp: 5, item: "Copper Ore" },
    { name: "Tin Rock", emoji: "🪨", lvl: 5, time: 3500, xp: 8, item: "Tin Ore" },
    { name: "Iron Rock", emoji: "⛰️", lvl: 15, time: 5000, xp: 15, item: "Iron Ore" },
    { name: "Gold Rock", emoji: "🌟", lvl: 30, time: 8000, xp: 30, item: "Gold Ore" },
    { name: "Mithril Rock", emoji: "💎", lvl: 50, time: 12000, xp: 60, item: "Mithril Ore" },
  ],
  woodcutting: [
    { name: "Oak Tree", emoji: "🌳", lvl: 1, time: 2500, xp: 5, item: "Oak Log" },
    { name: "Willow Tree", emoji: "🌲", lvl: 10, time: 3500, xp: 10, item: "Willow Log" },
    { name: "Maple Tree", emoji: "🍁", lvl: 25, time: 5000, xp: 20, item: "Maple Log" },
    { name: "Yew Tree", emoji: "🌴", lvl: 40, time: 8000, xp: 40, item: "Yew Log" },
    { name: "Elder Tree", emoji: "🎄", lvl: 60, time: 12000, xp: 80, item: "Elder Log" },
  ],
  fishing: [
    { name: "Shrimp Spot", emoji: "🦐", lvl: 1, time: 3000, xp: 4, item: "Raw Shrimp" },
    { name: "Trout Spot", emoji: "🐟", lvl: 10, time: 4000, xp: 10, item: "Raw Trout" },
    { name: "Salmon Spot", emoji: "🐠", lvl: 25, time: 5500, xp: 20, item: "Raw Salmon" },
    { name: "Swordfish Spot", emoji: "🗡️", lvl: 45, time: 8000, xp: 45, item: "Raw Swordfish" },
    { name: "Shark Spot", emoji: "🦈", lvl: 65, time: 12000, xp: 90, item: "Raw Shark" },
  ],
};

const RECIPES = {
  smithing: [
    { name: "Bronze Dagger", emoji: "🗡️", lvl: 1, time: 4000, xp: 12, desc: "ATK +3", mats: [{ n: "Copper Ore", need: 2 }, { n: "Tin Ore", need: 1 }] },
    { name: "Bronze Pickaxe", emoji: "⛏️", lvl: 3, time: 4500, xp: 15, desc: "+5% speed/XP", mats: [{ n: "Copper Ore", need: 3 }, { n: "Tin Ore", need: 2 }, { n: "Oak Log", need: 1 }] },
    { name: "Copper Amulet", emoji: "📿", lvl: 5, time: 4000, xp: 18, desc: "+5% XP all skills", mats: [{ n: "Copper Ore", need: 4 }, { n: "Slime Gel", need: 2 }] },
    { name: "Bronze Shield", emoji: "🛡️", lvl: 5, time: 5000, xp: 20, desc: "DEF +3", mats: [{ n: "Copper Ore", need: 3 }, { n: "Tin Ore", need: 2 }] },
    { name: "Iron Sword", emoji: "⚔️", lvl: 15, time: 6000, xp: 35, desc: "ATK +6, DEF +1", mats: [{ n: "Iron Ore", need: 3 }, { n: "Oak Log", need: 1 }] },
    { name: "Iron Pickaxe", emoji: "⛏️", lvl: 18, time: 6500, xp: 40, desc: "+10% speed, +8% XP", mats: [{ n: "Iron Ore", need: 4 }, { n: "Oak Log", need: 2 }] },
    { name: "Iron Armor", emoji: "🦺", lvl: 20, time: 8000, xp: 50, desc: "DEF +8, +3% XP", mats: [{ n: "Iron Ore", need: 5 }, { n: "Oak Log", need: 2 }] },
    { name: "Silver Amulet", emoji: "📿", lvl: 22, time: 7000, xp: 55, desc: "+10% XP all skills", mats: [{ n: "Iron Ore", need: 3 }, { n: "Gold Ore", need: 1 }, { n: "Mana Crystal", need: 1 }] },
    { name: "Steel Axe", emoji: "🪓", lvl: 30, time: 10000, xp: 80, desc: "ATK +10, DEF +2", mats: [{ n: "Iron Ore", need: 4 }, { n: "Gold Ore", need: 1 }, { n: "Maple Log", need: 2 }] },
    { name: "Steel Pickaxe", emoji: "⛏️", lvl: 32, time: 10000, xp: 90, desc: "+18% speed, +12% XP", mats: [{ n: "Iron Ore", need: 5 }, { n: "Gold Ore", need: 2 }, { n: "Maple Log", need: 2 }] },
    { name: "Gold Ring", emoji: "💍", lvl: 35, time: 8000, xp: 70, desc: "ATK +4, DEF +4, +5% XP", mats: [{ n: "Gold Ore", need: 3 }] },
    { name: "Gold Amulet", emoji: "📿", lvl: 38, time: 10000, xp: 100, desc: "+18% XP all skills", mats: [{ n: "Gold Ore", need: 4 }, { n: "Mana Crystal", need: 2 }] },
    { name: "Mithril Blade", emoji: "🔱", lvl: 50, time: 15000, xp: 150, desc: "ATK +20, DEF +5", mats: [{ n: "Mithril Ore", need: 5 }, { n: "Yew Log", need: 3 }] },
    { name: "Mithril Pickaxe", emoji: "⛏️", lvl: 52, time: 16000, xp: 170, desc: "+28% speed, +20% XP", mats: [{ n: "Mithril Ore", need: 6 }, { n: "Yew Log", need: 3 }, { n: "Mana Crystal", need: 2 }] },
    { name: "Mithril Amulet", emoji: "📿", lvl: 55, time: 16000, xp: 180, desc: "+25% XP all skills", mats: [{ n: "Mithril Ore", need: 4 }, { n: "Mana Crystal", need: 3 }, { n: "Shadow Dust", need: 2 }] },
    { name: "Dragon Plate", emoji: "🛡️", lvl: 60, time: 20000, xp: 250, desc: "DEF +25, +8% XP", mats: [{ n: "Dragon Scale", need: 3 }, { n: "Mithril Ore", need: 3 }] },
    { name: "Dragon Pickaxe", emoji: "⛏️", lvl: 65, time: 22000, xp: 350, desc: "+40% speed, +30% XP", mats: [{ n: "Dragon Fang", need: 1 }, { n: "Dragon Scale", need: 2 }, { n: "Mithril Ore", need: 4 }, { n: "Elder Log", need: 2 }] },
    { name: "Dragon Amulet", emoji: "📿", lvl: 68, time: 24000, xp: 380, desc: "+35% XP all skills", mats: [{ n: "Dragon Fang", need: 2 }, { n: "Dragon Scale", need: 1 }, { n: "Mana Crystal", need: 4 }] },
    { name: "Dragon Blade", emoji: "⚔️", lvl: 70, time: 25000, xp: 400, desc: "ATK +30, DEF +5", mats: [{ n: "Dragon Fang", need: 2 }, { n: "Dragon Scale", need: 2 }, { n: "Mithril Ore", need: 5 }] },
  ],
  cooking: [
    { name: "Cooked Shrimp", emoji: "🍤", lvl: 1, time: 2000, xp: 8, desc: "Heals 5 HP", mats: [{ n: "Raw Shrimp", need: 1 }] },
    { name: "Cooked Trout", emoji: "🐟", lvl: 10, time: 3000, xp: 18, desc: "Heals 12 HP", mats: [{ n: "Raw Trout", need: 1 }] },
    { name: "Goblin Stew", emoji: "🍲", lvl: 15, time: 5000, xp: 35, desc: "Heals 25 HP", mats: [{ n: "Raw Trout", need: 1 }, { n: "Herb", need: 2 }] },
    { name: "Cooked Salmon", emoji: "🍣", lvl: 25, time: 4000, xp: 30, desc: "Heals 20 HP", mats: [{ n: "Raw Salmon", need: 1 }] },
    { name: "Cooked Swordfish", emoji: "🍽️", lvl: 45, time: 6000, xp: 55, desc: "Heals 40 HP", mats: [{ n: "Raw Swordfish", need: 1 }] },
    { name: "Dragon Feast", emoji: "🥩", lvl: 65, time: 12000, xp: 120, desc: "Heals 80 HP", mats: [{ n: "Raw Shark", need: 2 }, { n: "Dragon Fang", need: 1 }, { n: "Herb", need: 3 }] },
  ],
  alchemy: [
    { name: "Minor HP Potion", emoji: "🧪", lvl: 1, time: 3000, xp: 10, desc: "Restores 15 HP", mats: [{ n: "Slime Gel", need: 2 }, { n: "Herb", need: 1 }] },
    { name: "Antidote", emoji: "💊", lvl: 8, time: 3500, xp: 14, desc: "Cures poison", mats: [{ n: "Herb", need: 2 }, { n: "Rat Tail", need: 1 }] },
    { name: "HP Potion", emoji: "❤️‍🩹", lvl: 15, time: 5000, xp: 25, desc: "Restores 35 HP", mats: [{ n: "Slime Gel", need: 3 }, { n: "Herb", need: 2 }, { n: "Bone", need: 1 }] },
    { name: "ATK Elixir", emoji: "⚗️", lvl: 20, time: 6000, xp: 40, desc: "+5 ATK for 60s", mats: [{ n: "Beast Fang", need: 2 }, { n: "Slime Gel", need: 2 }, { n: "Herb", need: 2 }] },
    { name: "DEF Elixir", emoji: "🛡️", lvl: 25, time: 6000, xp: 40, desc: "+5 DEF for 60s", mats: [{ n: "Thick Hide", need: 2 }, { n: "Bone", need: 2 }, { n: "Herb", need: 2 }] },
    { name: "Mana Potion", emoji: "💙", lvl: 30, time: 6000, xp: 45, desc: "Restores 30 MP", mats: [{ n: "Mana Crystal", need: 1 }, { n: "Herb", need: 2 }] },
    { name: "Greater HP Potion", emoji: "❤️", lvl: 40, time: 8000, xp: 65, desc: "Restores 70 HP", mats: [{ n: "Mana Crystal", need: 1 }, { n: "Slime Gel", need: 4 }, { n: "Herb", need: 3 }] },
    { name: "Shadow Elixir", emoji: "🌑", lvl: 50, time: 10000, xp: 100, desc: "+10 ATK/DEF 60s", mats: [{ n: "Shadow Dust", need: 3 }, { n: "Mana Crystal", need: 2 }] },
    { name: "Dragon Elixir", emoji: "🐉", lvl: 65, time: 15000, xp: 200, desc: "+20 ATK/DEF 90s", mats: [{ n: "Dragon Scale", need: 1 }, { n: "Mana Crystal", need: 3 }, { n: "Shadow Dust", need: 2 }] },
  ],
};

// ─── ITEM DATABASE ───
const ITEMS = {
  // ── Materials ──
  "Copper Ore":     { emoji: "🪨", category: "material", desc: "Common copper ore", sell: 2 },
  "Tin Ore":        { emoji: "🪨", category: "material", desc: "Tin used for bronze", sell: 3 },
  "Iron Ore":       { emoji: "⛰️", category: "material", desc: "Strong iron ore", sell: 8 },
  "Gold Ore":       { emoji: "🌟", category: "material", desc: "Precious gold ore", sell: 20 },
  "Mithril Ore":    { emoji: "💎", category: "material", desc: "Rare mythical ore", sell: 50 },
  "Oak Log":        { emoji: "🌳", category: "material", desc: "Standard oak wood", sell: 2 },
  "Willow Log":     { emoji: "🌲", category: "material", desc: "Flexible willow wood", sell: 5 },
  "Maple Log":      { emoji: "🍁", category: "material", desc: "Hard maple wood", sell: 12 },
  "Yew Log":        { emoji: "🌴", category: "material", desc: "Dense yew wood", sell: 25 },
  "Elder Log":      { emoji: "🎄", category: "material", desc: "Ancient elder wood", sell: 55 },
  "Raw Shrimp":     { emoji: "🦐", category: "material", desc: "Freshly caught shrimp", sell: 1 },
  "Raw Trout":      { emoji: "🐟", category: "material", desc: "River trout", sell: 5 },
  "Raw Salmon":     { emoji: "🐠", category: "material", desc: "Wild salmon", sell: 12 },
  "Raw Swordfish":  { emoji: "🗡️", category: "material", desc: "Powerful swordfish", sell: 30 },
  "Raw Shark":      { emoji: "🦈", category: "material", desc: "Dangerous shark meat", sell: 60 },
  "Slime Gel":      { emoji: "🟢", category: "material", desc: "Goo from slimes", sell: 1 },
  "Rat Tail":       { emoji: "🐀", category: "material", desc: "Tail from rats", sell: 2 },
  "Goblin Ear":     { emoji: "👺", category: "material", desc: "Severed goblin ear", sell: 5 },
  "Herb":           { emoji: "🌿", category: "material", desc: "Useful herb for potions", sell: 3 },
  "Bone":           { emoji: "🦴", category: "material", desc: "Skeleton remains", sell: 4 },
  "Shadow Dust":    { emoji: "🌑", category: "material", desc: "Magical dark dust", sell: 15 },
  "Wolf Pelt":      { emoji: "🐺", category: "material", desc: "Warm wolf fur", sell: 10 },
  "Beast Fang":     { emoji: "🦷", category: "material", desc: "Sharp beast tooth", sell: 12 },
  "Orc Tooth":      { emoji: "👹", category: "material", desc: "Tough orc tusk", sell: 18 },
  "Thick Hide":     { emoji: "🟤", category: "material", desc: "Thick animal hide", sell: 15 },
  "Mana Crystal":   { emoji: "💜", category: "material", desc: "Crystallized mana", sell: 35 },
  "Dragon Scale":   { emoji: "🐉", category: "material", desc: "Legendary dragon scale", sell: 150 },
  "Dragon Fang":    { emoji: "🔥", category: "material", desc: "Fang of a dragon", sell: 200 },
  // ── Equipment ──
  "Bronze Dagger":  { emoji: "🗡️", category: "equipment", slot: "weapon", atk: 3,  def: 0,  rarity: "common",    desc: "Basic bronze blade", sell: 15 },
  "Bronze Shield":  { emoji: "🛡️", category: "equipment", slot: "shield", atk: 0,  def: 3,  rarity: "common",    desc: "Simple bronze shield", sell: 20 },
  "Iron Sword":     { emoji: "⚔️", category: "equipment", slot: "weapon", atk: 6,  def: 1,  rarity: "uncommon",  desc: "Sturdy iron sword", sell: 60 },
  "Iron Armor":     { emoji: "🦺", category: "equipment", slot: "armor",  atk: 0,  def: 8,  xpPct: 3,  rarity: "uncommon",  desc: "Solid iron plate (+3% XP)", sell: 75 },
  "Steel Axe":      { emoji: "🪓", category: "equipment", slot: "weapon", atk: 10, def: 2,  rarity: "rare",      desc: "Heavy steel axe", sell: 200 },
  "Gold Ring":      { emoji: "💍", category: "equipment", slot: "ring",   atk: 4,  def: 4,  xpPct: 5, rarity: "rare",      desc: "Lucky golden ring (+5% XP)", sell: 250 },
  "Mithril Blade":  { emoji: "🔱", category: "equipment", slot: "weapon", atk: 20, def: 5,  rarity: "epic",      desc: "Legendary mithril edge", sell: 500 },
  "Dragon Plate":   { emoji: "🛡️", category: "equipment", slot: "armor",  atk: 0,  def: 25, xpPct: 8, rarity: "legendary", desc: "Dragonscale armor (+8% XP)", sell: 1500 },
  "Dragon Blade":   { emoji: "⚔️", category: "equipment", slot: "weapon", atk: 30, def: 5,  rarity: "legendary", desc: "Ultimate dragon sword", sell: 2500 },
  // ── Tools (equip for gathering/crafting bonuses) ──
  "Bronze Pickaxe":  { emoji: "⛏️", category: "equipment", slot: "tool", atk: 0, def: 0, speedPct: 5,  xpPct: 5,  rarity: "common",    desc: "+5% speed, +5% XP", sell: 20 },
  "Iron Pickaxe":    { emoji: "⛏️", category: "equipment", slot: "tool", atk: 0, def: 0, speedPct: 10, xpPct: 8,  rarity: "uncommon",  desc: "+10% speed, +8% XP", sell: 70 },
  "Steel Pickaxe":   { emoji: "⛏️", category: "equipment", slot: "tool", atk: 0, def: 0, speedPct: 18, xpPct: 12, rarity: "rare",      desc: "+18% speed, +12% XP", sell: 220 },
  "Mithril Pickaxe": { emoji: "⛏️", category: "equipment", slot: "tool", atk: 0, def: 0, speedPct: 28, xpPct: 20, rarity: "epic",      desc: "+28% speed, +20% XP", sell: 550 },
  "Dragon Pickaxe":  { emoji: "⛏️", category: "equipment", slot: "tool", atk: 0, def: 0, speedPct: 40, xpPct: 30, rarity: "legendary", desc: "+40% speed, +30% XP", sell: 1800 },
  // ── Amulets (global XP multiplier) ──
  "Copper Amulet":   { emoji: "📿", category: "equipment", slot: "amulet", atk: 0, def: 0, xpPct: 5,  rarity: "common",    desc: "+5% XP to all skills", sell: 25 },
  "Silver Amulet":   { emoji: "📿", category: "equipment", slot: "amulet", atk: 1, def: 1, xpPct: 10, rarity: "uncommon",  desc: "+10% XP to all skills", sell: 100 },
  "Gold Amulet":     { emoji: "📿", category: "equipment", slot: "amulet", atk: 2, def: 2, xpPct: 18, rarity: "rare",      desc: "+18% XP to all skills", sell: 300 },
  "Mithril Amulet":  { emoji: "📿", category: "equipment", slot: "amulet", atk: 3, def: 3, xpPct: 25, rarity: "epic",      desc: "+25% XP to all skills", sell: 600 },
  "Dragon Amulet":   { emoji: "📿", category: "equipment", slot: "amulet", atk: 5, def: 5, xpPct: 35, rarity: "legendary", desc: "+35% XP to all skills", sell: 2000 },
  // ── Consumables ──
  "Cooked Shrimp":     { emoji: "🍤", category: "consumable", heal: 5,  desc: "Heals 5 HP", sell: 3 },
  "Cooked Trout":      { emoji: "🐟", category: "consumable", heal: 12, desc: "Heals 12 HP", sell: 10 },
  "Cooked Salmon":     { emoji: "🍣", category: "consumable", heal: 20, desc: "Heals 20 HP", sell: 25 },
  "Cooked Swordfish":  { emoji: "🍽️", category: "consumable", heal: 40, desc: "Heals 40 HP", sell: 60 },
  "Goblin Stew":       { emoji: "🍲", category: "consumable", heal: 25, desc: "Heals 25 HP", sell: 15 },
  "Dragon Feast":      { emoji: "🥩", category: "consumable", heal: 80, desc: "Heals 80 HP", sell: 200 },
  "Minor HP Potion":   { emoji: "🧪", category: "consumable", heal: 15, desc: "Restores 15 HP", sell: 5 },
  "HP Potion":         { emoji: "❤️‍🩹", category: "consumable", heal: 35, desc: "Restores 35 HP", sell: 8 },
  "Greater HP Potion": { emoji: "❤️", category: "consumable", heal: 70, desc: "Restores 70 HP", sell: 25 },
  "Mana Potion":       { emoji: "💙", category: "consumable", healMp: 30, desc: "Restores 30 MP", sell: 20 },
  "ATK Elixir":        { emoji: "⚗️", category: "consumable", buffAtk: 5, duration: 60, desc: "+5 ATK for 60s", sell: 40 },
  "DEF Elixir":        { emoji: "🛡️", category: "consumable", buffDef: 5, duration: 60, desc: "+5 DEF for 60s", sell: 40 },
  "Shadow Elixir":     { emoji: "🌑", category: "consumable", buffAtk: 10, buffDef: 10, duration: 60, desc: "+10 ATK/DEF 60s", sell: 80 },
  "Dragon Elixir":     { emoji: "🐉", category: "consumable", buffAtk: 20, buffDef: 20, duration: 90, desc: "+20 ATK/DEF 90s", sell: 250 },
  "Antidote":          { emoji: "💊", category: "consumable", desc: "Cures poison", sell: 10 },
};

const SLOT_ICONS = { weapon: "⚔️", shield: "🛡️", armor: "🦺", helm: "🪖", ring: "💍", tool: "⛏️", amulet: "📿", boots: "👢" };

// ═══ PET SYSTEM ═══
const PETS = {
  "Rocky":       { emoji: "🪨", skill: "mining",      xpPct: 8,  speedPct: 5,  rarity: "common",    desc: "A loyal rock golem. +8% Mining XP, +5% Mining speed", source: "Mine 30 ores quest" },
  "Timber":      { emoji: "🌿", skill: "woodcutting",  xpPct: 8,  speedPct: 5,  rarity: "common",    desc: "A spritely tree spirit. +8% Woodcutting XP, +5% Woodcutting speed", source: "Chop 30 logs quest" },
  "Bubbles":     { emoji: "🐟", skill: "fishing",      xpPct: 8,  speedPct: 5,  rarity: "common",    desc: "A shimmering fish companion. +8% Fishing XP, +5% Fishing speed", source: "Catch 25 fish quest" },
  "Ember":       { emoji: "🔥", skill: "combat",       xpPct: 10, speedPct: 0,  rarity: "uncommon",  desc: "A fierce fire sprite. +10% Combat XP", source: "Kill 25 monsters quest" },
  "Sizzle":      { emoji: "🍖", skill: "cooking",      xpPct: 8,  speedPct: 5,  rarity: "common",    desc: "A tiny chef imp. +8% Cooking XP, +5% Cooking speed", source: "Cook 20 dishes quest" },
  "Clink":       { emoji: "🔧", skill: "smithing",     xpPct: 8,  speedPct: 5,  rarity: "common",    desc: "A mechanical helper. +8% Smithing XP, +5% Smithing speed", source: "Smith 12 items quest" },
  "Mystic":      { emoji: "✨", skill: "alchemy",      xpPct: 8,  speedPct: 5,  rarity: "common",    desc: "A glowing arcane wisp. +8% Alchemy XP, +5% Alchemy speed", source: "Brew 12 potions quest" },
  "Shadow":      { emoji: "🐈‍⬛", skill: "combat",     xpPct: 5,  speedPct: 0,  rarity: "rare",      desc: "A stealthy shadow cat. +5% Combat XP, +3 ATK", atkBonus: 3, source: "Premium: Slay 50 monsters" },
  "Phoenix":     { emoji: "🦅", skill: "all",          xpPct: 5,  speedPct: 3,  rarity: "epic",      desc: "A radiant phoenix. +5% XP & +3% speed to ALL skills", source: "Premium: Gather 80 resources" },
  "Dragon Whelp":{ emoji: "🐲", skill: "all",          xpPct: 8,  speedPct: 5,  rarity: "legendary", desc: "A baby dragon. +8% XP & +5% speed to ALL skills, +5 ATK, +5 DEF", atkBonus: 5, defBonus: 5, source: "Premium: Amass 2000 gold" },
};
const PET_IDS = Object.keys(PETS);
const RARITY_COLORS = { common: T.textDim, uncommon: T.success, rare: T.accent, epic: T.purple, legendary: T.gold };



const fmt = n => (n >= 1e6 ? (n/1e6).toFixed(1)+"M" : n >= 1e3 ? (n/1e3).toFixed(1)+"K" : String(n));

// ═══ COMPONENTS ═══

function ProgressBar({ value, max, color, height = 6, showLabel, animate }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  return (
    <div style={{ width: "100%" }}>
      {showLabel && (
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4, fontSize: 11, fontWeight: 600, color: T.textSec }}>
          <span>XP</span>
          <span>{fmt(value)} / {fmt(max)}</span>
        </div>
      )}
      <div style={{ width: "100%", height, background: T.bar, borderRadius: 99, overflow: "hidden" }}>
        <div style={{
          height: "100%", borderRadius: 99,
          width: `${pct}%`,
          background: `linear-gradient(90deg, ${color}, ${color}dd)`,
          transition: animate ? "width 0.15s linear" : "width 0.4s cubic-bezier(.4,0,.2,1)",
        }} />
      </div>
    </div>
  );
}

function Badge({ children, color }) {
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", fontSize: 10, fontWeight: 700,
      padding: "2px 7px", borderRadius: 4,
      background: color + "18", color,
      letterSpacing: 0.2,
    }}>{children}</span>
  );
}

function Btn({ children, color = T.accent, disabled, small, onClick }) {
  return (
    <button disabled={disabled} onClick={onClick} style={{
      fontFamily: FONT, fontSize: small ? 11 : 12, fontWeight: 700,
      padding: small ? "5px 10px" : "7px 14px", borderRadius: T.rs,
      background: disabled ? T.bar : color, border: "none",
      color: disabled ? T.textDim : "#fff",
      cursor: disabled ? "not-allowed" : "pointer",
      opacity: disabled ? 0.45 : 1,
      transition: "all 0.15s",
    }}>{children}</button>
  );
}

function Card({ children, style, onClick, glowColor }) {
  return (
    <div onClick={onClick} style={{
      background: T.card, borderRadius: T.r,
      border: `1px solid ${glowColor || T.cardBorder}`,
      padding: 14,
      cursor: onClick ? "pointer" : "default",
      transition: "border-color 0.2s, box-shadow 0.2s",
      ...(glowColor ? { boxShadow: `0 0 16px ${glowColor}18` } : {}),
      ...style,
    }}>{children}</div>
  );
}

function SidebarItem({ icon, label, active, badge, color, onClick, indent }) {
  return (
    <div onClick={onClick} style={{
      display: "flex", alignItems: "center", gap: 10,
      padding: indent ? "7px 12px 7px 40px" : "9px 14px",
      borderRadius: T.rs, cursor: "pointer",
      background: active ? T.sidebarActive : "transparent",
      borderLeft: active ? `3px solid ${color || T.accent}` : "3px solid transparent",
      color: active ? T.white : T.textSec,
      fontSize: indent ? 12.5 : 13,
      fontWeight: active ? 600 : 400,
      transition: "all 0.12s",
      marginBottom: 1,
    }}>
      <span style={{ fontSize: indent ? 15 : 17, width: 22, textAlign: "center", flexShrink: 0 }}>{icon}</span>
      <span style={{ flex: 1 }}>{label}</span>
      {badge != null && <Badge color={color || T.accent}>{badge}</Badge>}
    </div>
  );
}

function SectionLabel({ children }) {
  return (
    <div style={{
      fontSize: 10, fontWeight: 700, color: T.textDim,
      textTransform: "uppercase", letterSpacing: 1.2,
      padding: "14px 14px 5px",
    }}>{children}</div>
  );
}

function PageTitle({ icon, title, subtitle }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <h2 style={{ fontSize: 20, fontWeight: 800, margin: 0, color: T.white }}>{icon} {title}</h2>
      {subtitle && <p style={{ fontSize: 13, color: T.textSec, margin: "4px 0 0" }}>{subtitle}</p>}
    </div>
  );
}

function StatRow({ label, value, color }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0" }}>
      <span style={{ color: T.textSec, fontSize: 13 }}>{label}</span>
      <span style={{ color: color || T.white, fontSize: 13, fontWeight: 700 }}>{value}</span>
    </div>
  );
}

function MaterialTag({ name, have, need }) {
  const ok = have >= need;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 4,
      fontSize: 11, fontWeight: 600,
      padding: "3px 8px", borderRadius: 4,
      background: ok ? T.successMuted : T.dangerMuted,
      color: ok ? T.success : T.danger,
      border: `1px solid ${ok ? T.success : T.danger}22`,
    }}>
      {name} <span style={{ fontWeight: 800 }}>{have}/{need}</span>
    </span>
  );
}

// ═══ DEFAULT SAVE STATE ═══
const DEFAULT_SAVE = () => ({
  skills: Object.fromEntries(SKILL_IDS.map(id => [id, { level: 1, xp: 0 }])),
  inventory: {
    "Copper Ore": 12, "Tin Ore": 5, "Oak Log": 20, "Raw Shrimp": 8,
    "Slime Gel": 6, "Herb": 3, "Rat Tail": 4, "Bone": 2,
    "Bronze Dagger": 1, "Cooked Shrimp": 4, "Minor HP Potion": 2,
  },
  equipped: { weapon: null, shield: null, armor: null, helm: null, ring: null, tool: null, amulet: null, boots: null },
  pets: [],          // owned pet names
  activePets: [],    // currently active pet names (limited by petSlots)
  petSlots: 1,       // max active pets (1 free, buy more in store)
  isPremium: false,  // premium membership
  storePurchases: {}, // track what's been bought
  player: { hp: 60, maxHp: 60, mp: 25, maxMp: 25 },
  gold: 0,
  stats: { gathered: 0, totalXpEarned: 0 },
  combatStats: { kills: 0, totalDamage: 0, deaths: 0 },
  craftStats: { crafted: 0 },
});

// ═══ AUTH SCREEN (Firebase Auth) ═══
function AuthScreen({ onLogin }) {
  const [tab, setTab] = useState("login"); // login | signup
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
    if (!email.trim()) return setError("Please enter an email address");
    if (!password || password.length < 6) return setError("Password must be at least 6 characters");
    if (password !== confirmPw) return setError("Passwords do not match");
    setLoading(true);
    try {
      const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
      await updateProfile(cred.user, { displayName: displayName.trim() });
      // Save initial game data
      const save = DEFAULT_SAVE();
      const uid = cred.user.uid;
      const username = uid;
      await window.storage.set(`save:${username}`, JSON.stringify(save));
      onLogin({ username, displayName: displayName.trim(), email: email.trim(), uid, isGuest: false }, save);
    } catch (e) {
      const msg = e.code === "auth/email-already-in-use" ? "An account with this email already exists"
        : e.code === "auth/invalid-email" ? "Invalid email address"
        : e.code === "auth/weak-password" ? "Password is too weak"
        : "Failed to create account";
      setError(msg);
      setLoading(false);
    }
  };

  const handleLogin = async () => {
    setError("");
    if (!email.trim() || !password) return setError("Enter email and password");
    setLoading(true);
    try {
      const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
      const uid = cred.user.uid;
      const username = uid;
      let save;
      try {
        const sr = await window.storage.get(`save:${username}`);
        save = JSON.parse(sr.value);
      } catch { save = DEFAULT_SAVE(); }
      onLogin({
        username,
        displayName: cred.user.displayName || email.split("@")[0],
        email: cred.user.email,
        uid,
        isGuest: false,
      }, save);
    } catch (e) {
      const msg = e.code === "auth/user-not-found" ? "No account with this email"
        : e.code === "auth/wrong-password" || e.code === "auth/invalid-credential" ? "Incorrect password"
        : e.code === "auth/invalid-email" ? "Invalid email address"
        : "Login failed";
      setError(msg);
      setLoading(false);
    }
  };

  const inputStyle = {
    width: "100%", padding: "10px 12px", borderRadius: 6,
    border: `1px solid ${T.divider}`, background: T.bgDeep,
    color: T.white, fontFamily: FONT, fontSize: 13, outline: "none",
    boxSizing: "border-box",
  };

  const labelStyle = { fontSize: 11, fontWeight: 700, color: T.textDim, textTransform: "uppercase", letterSpacing: 0.5, display: "block", marginBottom: 5 };

  const tabBtn = (id, label, icon) => (
    <div onClick={() => { setTab(id); clearForm(); }} style={{
      flex: 1, textAlign: "center", padding: "10px 0",
      cursor: "pointer", fontSize: 12, fontWeight: 600,
      color: tab === id ? T.accent : T.textSec,
      borderBottom: `2px solid ${tab === id ? T.accent : "transparent"}`,
      transition: "all 0.15s",
    }}>{icon} {label}</div>
  );

  const submitOnEnter = (fn) => (e) => { if (e.key === "Enter") fn(); };

  const Btn = ({ color, onClick, disabled, children }) => (
    <button onClick={onClick} disabled={disabled} style={{
      width: "100%", padding: "11px 0", borderRadius: 8, border: "none",
      background: disabled ? T.bgDeep : `${color}22`, color: disabled ? T.textDim : color,
      fontWeight: 700, fontSize: 14, cursor: disabled ? "default" : "pointer",
      fontFamily: FONT, transition: "all 0.15s", letterSpacing: 0.3,
    }}>{children}</button>
  );

  return (
    <div style={{
      height: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
      background: T.bg, fontFamily: FONT, color: T.text,
    }}>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet" />
      <div style={{
        width: 400, maxWidth: "92vw", background: T.card, borderRadius: T.r, border: `1px solid ${T.cardBorder}`,
        overflow: "hidden",
      }}>
        {/* Header */}
        <div style={{ padding: "28px 24px 20px", textAlign: "center", borderBottom: `1px solid ${T.divider}` }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>⚔️</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: T.white, letterSpacing: -0.5 }}>Idle Realms</div>
          <div style={{ fontSize: 12, color: T.textSec, marginTop: 4 }}>Multiplayer Idle RPG</div>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", borderBottom: `1px solid ${T.divider}` }}>
          {tabBtn("login", "Log In", "🔑")}
          {tabBtn("signup", "Sign Up", "✨")}
        </div>

        {/* Forms */}
        <div style={{ padding: "20px 24px 24px" }}>
          {tab === "login" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div>
                <label style={labelStyle}>Email</label>
                <input style={inputStyle} placeholder="your@email.com" value={email} onChange={e => setEmail(e.target.value)} onKeyDown={submitOnEnter(handleLogin)} />
              </div>
              <div>
                <label style={labelStyle}>Password</label>
                <input style={inputStyle} type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} onKeyDown={submitOnEnter(handleLogin)} />
              </div>
              {error && <div style={{ fontSize: 12, color: T.danger, padding: "8px 10px", background: T.dangerMuted, borderRadius: 6 }}>{error}</div>}
              <Btn color={T.accent} onClick={handleLogin} disabled={loading}>
                {loading ? "Logging in..." : "🔑 Log In"}
              </Btn>
            </div>
          )}

          {tab === "signup" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div>
                <label style={labelStyle}>Display Name</label>
                <input style={inputStyle} placeholder="Your character name" value={displayName} onChange={e => setDisplayName(e.target.value)} />
              </div>
              <div>
                <label style={labelStyle}>Email</label>
                <input style={inputStyle} placeholder="your@email.com" value={email} onChange={e => setEmail(e.target.value)} />
              </div>
              <div>
                <label style={labelStyle}>Password</label>
                <input style={inputStyle} type="password" placeholder="At least 6 characters" value={password} onChange={e => setPassword(e.target.value)} />
              </div>
              <div>
                <label style={labelStyle}>Confirm Password</label>
                <input style={inputStyle} type="password" placeholder="••••••••" value={confirmPw} onChange={e => setConfirmPw(e.target.value)} onKeyDown={submitOnEnter(handleSignup)} />
              </div>
              {error && <div style={{ fontSize: 12, color: T.danger, padding: "8px 10px", background: T.dangerMuted, borderRadius: 6 }}>{error}</div>}
              <Btn color={T.teal} onClick={handleSignup} disabled={loading}>
                {loading ? "Creating..." : "✨ Create Account"}
              </Btn>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ═══ MAIN APP (wrapper with Firebase auth) ═══
export default function IdleRealmsUI() {
  const [account, setAccount] = useState(null);
  const [initialSave, setInitialSave] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);

  // Listen for Firebase auth state
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const username = user.uid;
        let save;
        try {
          const sr = await window.storage.get(`save:${username}`);
          save = JSON.parse(sr.value);
        } catch { save = DEFAULT_SAVE(); }
        setAccount({
          username,
          displayName: user.displayName || user.email?.split("@")[0] || "Adventurer",
          email: user.email,
          uid: user.uid,
          isGuest: false,
        });
        setInitialSave(save);
      } else {
        setAccount(null);
        setInitialSave(null);
      }
      setAuthChecked(true);
    });
    return () => unsub();
  }, []);

  const handleLogin = useCallback(async (acct, save) => {
    setAccount(acct);
    setInitialSave(save);
  }, []);

  const handleLogout = useCallback(async () => {
    await signOut(auth);
    setAccount(null);
    setInitialSave(null);
  }, []);


  if (!authChecked) {
    return (
      <div style={{ height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: T.bg, fontFamily: FONT, color: T.textDim }}>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet" />
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>⚔️</div>
          <div style={{ fontSize: 13 }}>Loading...</div>
        </div>
      </div>
    );
  }

  if (!account) return <AuthScreen onLogin={handleLogin} />;

  return <GameUI key={account.username} account={account} initialSave={initialSave} onLogout={handleLogout} />;
}

// ═══ GAME UI ═══
function GameUI({ account, initialSave, onLogout }) {
  const [page, setPage] = useState("skills");
  const [mobileNav, setMobileNav] = useState(false);
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768);

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const sv = initialSave || DEFAULT_SAVE();

  // ─── LIVE SKILL STATE ───
  const [skills, setSkills] = useState(() => sv.skills);
  const [log, setLog] = useState([]);

  // ─── INVENTORY & EQUIPMENT STATE ───
  const [inventory, setInventory] = useState(() => sv.inventory);
  const [equipped, setEquipped] = useState(() => sv.equipped);
  const [pets, setPets] = useState(() => sv.pets || []);
  const [activePets, setActivePets] = useState(() => sv.activePets || (sv.activePet ? [sv.activePet] : []));
  const [petSlots, setPetSlots] = useState(() => sv.petSlots || 1);
  const [storePurchases, setStorePurchases] = useState(() => sv.storePurchases || {});
  const [player, setPlayer] = useState(() => sv.player);
  const [bankFilter, setBankFilter] = useState("all");
  const [bankSearch, setBankSearch] = useState("");

  const addLog = useCallback(m => setLog(p => [...p.slice(-60), { m, t: Date.now() }]), []);

  // ─── INVENTORY HELPERS ───
  const addItem = useCallback((name, qty = 1) => {
    setInventory(p => ({ ...p, [name]: (p[name] || 0) + qty }));
  }, []);

  const removeItem = useCallback((name, qty = 1) => {
    setInventory(p => {
      const n = { ...p };
      n[name] = (n[name] || 0) - qty;
      if (n[name] <= 0) delete n[name];
      return n;
    });
  }, []);

  const equipItem = useCallback((name) => {
    const item = ITEMS[name];
    if (!item || item.category !== "equipment") return;
    // Unequip current
    if (equipped[item.slot]) addItem(equipped[item.slot]);
    setEquipped(p => ({ ...p, [item.slot]: name }));
    removeItem(name);
    addLog(`Equipped ${item.emoji} ${name}`);
  }, [equipped, addItem, removeItem, addLog]);

  const unequipItem = useCallback((slot) => {
    if (!equipped[slot]) return;
    addItem(equipped[slot]);
    addLog(`Unequipped ${ITEMS[equipped[slot]]?.emoji} ${equipped[slot]}`);
    setEquipped(p => ({ ...p, [slot]: null }));
  }, [equipped, addItem, addLog]);

  const useConsumable = useCallback((name) => {
    const item = ITEMS[name];
    if (!item || item.category !== "consumable" || !(inventory[name] > 0)) return;
    removeItem(name);
    if (item.heal) {
      setPlayer(p => ({ ...p, hp: Math.min(p.maxHp, p.hp + item.heal) }));
      addLog(`Used ${item.emoji} ${name}: +${item.heal} HP`);
    }
    if (item.healMp) {
      setPlayer(p => ({ ...p, mp: Math.min(p.maxMp, p.mp + item.healMp) }));
      addLog(`Used ${item.emoji} ${name}: +${item.healMp} MP`);
    }
    if (item.buffAtk || item.buffDef) {
      addLog(`✨ ${item.emoji} ${name} activated!`);
    }
  }, [inventory, removeItem, addLog]);

  const addXp = useCallback((skillId, amount) => {
    setSkills(prev => {
      const s = { ...prev[skillId] };
      s.xp += amount;
      let leveled = false;
      while (s.xp >= xpForLevel(s.level)) {
        s.xp -= xpForLevel(s.level);
        s.level++;
        leveled = true;
      }
      if (leveled) {
        addLog(`🎉 ${SKILLS_CONFIG[skillId].name} leveled up to ${s.level}!`);
      }
      return { ...prev, [skillId]: s };
    });
  }, [addLog]);

  // ─── DERIVED ───
  const totalLevel = SKILL_IDS.reduce((a, id) => a + skills[id].level, 0);
  const combatLvl = skills.combat.level;
  const skillFor = (id) => {
    const cfg = SKILLS_CONFIG[id];
    const st = skills[id];
    return { ...cfg, id, level: st.level, xp: st.xp, xpMax: xpForLevel(st.level) };
  };
  const equipAtk = Object.values(equipped).reduce((a, n) => a + (n && ITEMS[n] ? (ITEMS[n].atk || 0) : 0), 0);
  const equipDef = Object.values(equipped).reduce((a, n) => a + (n && ITEMS[n] ? (ITEMS[n].def || 0) : 0), 0);
  const equipSpeedPct = Object.values(equipped).reduce((a, n) => a + (n && ITEMS[n] ? (ITEMS[n].speedPct || 0) : 0), 0) + (storePurchases.speed_mastery ? 5 : 0);
  const equipXpPct = Object.values(equipped).reduce((a, n) => a + (n && ITEMS[n] ? (ITEMS[n].xpPct || 0) : 0), 0) + (storePurchases.xp_mastery ? 5 : 0);

  // Pet bonuses — sum across all active pets
  const getPetXpPct = useCallback((skill) => {
    return activePets.reduce((sum, pName) => {
      const p = PETS[pName];
      if (!p) return sum;
      if (p.skill === "all" || p.skill === skill) return sum + p.xpPct;
      return sum;
    }, 0);
  }, [activePets]);
  const getPetSpeedPct = useCallback((skill) => {
    return activePets.reduce((sum, pName) => {
      const p = PETS[pName];
      if (!p) return sum;
      if (p.skill === "all" || p.skill === skill) return sum + p.speedPct;
      return sum;
    }, 0);
  }, [activePets]);
  const petAtk = activePets.reduce((sum, pName) => sum + (PETS[pName]?.atkBonus || 0), 0);
  const petDef = activePets.reduce((sum, pName) => sum + (PETS[pName]?.defBonus || 0), 0);

  const unlockPet = useCallback((petName) => {
    if (!PETS[petName] || pets.includes(petName)) return;
    setPets(prev => [...prev, petName]);
    addLog(`🐾 New pet unlocked: ${PETS[petName].emoji} ${petName}!`);
    if (activePets.length < petSlots) setActivePets(prev => [...prev, petName]);
  }, [pets, activePets, petSlots, addLog]);

  const playerAtk = combatLvl * 2 + equipAtk + petAtk + (storePurchases.combat_mastery ? 5 : 0);
  const playerDef = Math.floor(combatLvl * 0.8) + equipDef + petDef + (storePurchases.combat_mastery ? 3 : 0);
  const totalItems = Object.values(inventory).reduce((a, q) => a + q, 0);
  const uniqueItems = Object.keys(inventory).length;
  const nav = (p) => { setPage(p); setMobileNav(false); };

  const getInvByCategory = (cat) =>
    Object.entries(inventory)
      .filter(([name]) => ITEMS[name]?.category === cat)
      .sort((a, b) => a[0].localeCompare(b[0]));

  const getFilteredInv = () => {
    let entries = Object.entries(inventory);
    if (bankFilter !== "all") entries = entries.filter(([name]) => ITEMS[name]?.category === bankFilter);
    if (bankSearch) entries = entries.filter(([name]) => name.toLowerCase().includes(bankSearch.toLowerCase()));
    return entries.sort((a, b) => a[0].localeCompare(b[0]));
  };

  // ─── GOLD STATE ───
  const [gold, setGold] = useState(() => sv.gold || 0);
  const addGold = useCallback((n) => setGold(g => g + n), []);

  // ─── COMBAT STATE ───
  const [activeCombat, setActiveCombat] = useState(null);
  const [combatState, setCombatState] = useState(null);
  const [combatStats, setCombatStats] = useState(() => sv.combatStats || { kills: 0, totalDamage: 0, deaths: 0 });
  const combatRef = useRef(null);

  const stopCombat = useCallback(() => {
    if (combatRef.current) { clearInterval(combatRef.current); combatRef.current = null; }
    setActiveCombat(null);
    setCombatState(null);
  }, []);

  // ─── GATHERING STATE ───
  const [activeGather, setActiveGather] = useState(null);
  const [gatherProgress, setGatherProgress] = useState(0);
  const [stats, setStats] = useState(() => sv.stats || { gathered: 0, totalXpEarned: 0 });
  const gatherRef = useRef(null);

  const stopGathering = useCallback(() => {
    if (gatherRef.current) { clearInterval(gatherRef.current); gatherRef.current = null; }
    setActiveGather(null);
    setGatherProgress(0);
  }, []);

  const startGathering = useCallback((skillId, node) => {
    stopGathering();
    stopCombat();
    setActiveGather({ skillId, node });
    setGatherProgress(0);
    addLog(`${SKILLS_CONFIG[skillId].icon} Started ${node.name}...`);
  }, [stopGathering, stopCombat, addLog]);

  const startCombat = useCallback((monster) => {
    stopCombat();
    stopGathering();
    setActiveCombat(monster);
    setCombatState({ monsterHp: monster.hp, monsterMaxHp: monster.hp, pElapsed: 0, mElapsed: 0 });
    addLog(`⚔️ Engaging ${monster.emoji} ${monster.name}!`);
  }, [stopCombat, stopGathering, addLog]);

  // Quest progress tracker (defined early so tick effects can use it)
  const [questProgress, setQuestProgress] = useState({});
  const trackQuest = useCallback((questId, amount = 1) => {
    setQuestProgress(prev => ({ ...prev, [questId]: (prev[questId] || 0) + amount }));
  }, []);

  // Gathering tick
  useEffect(() => {
    if (!activeGather) return;
    const { skillId, node } = activeGather;
    const step = 100;
    let elapsed = 0;
    const speedMult = 1 + (equipSpeedPct + getPetSpeedPct(skillId)) / 100;
    const effectiveTime = Math.max(500, Math.round(node.time / speedMult));
    const xpMult = 1 + (equipXpPct + getPetXpPct(skillId)) / 100;
    const effectiveXp = Math.round(node.xp * xpMult);

    gatherRef.current = setInterval(() => {
      elapsed += step;
      const pct = (elapsed / effectiveTime) * 100;
      setGatherProgress(pct);

      if (elapsed >= effectiveTime) {
        elapsed = 0;
        setGatherProgress(0);
        addItem(node.item);
        addXp(skillId, effectiveXp);
        setStats(s => ({ ...s, gathered: s.gathered + 1, totalXpEarned: s.totalXpEarned + effectiveXp }));
        addLog(`📦 +1 ${ITEMS[node.item]?.emoji || ""} ${node.item}  (+${effectiveXp} ${SKILLS_CONFIG[skillId].name} XP)`);
        // Quest tracking
        if (skillId === "mining") trackQuest("mine");
        else if (skillId === "woodcutting") trackQuest("chop");
        else if (skillId === "fishing") trackQuest("fish");
        trackQuest("pm_gather");
      }
    }, step);

    return () => { clearInterval(gatherRef.current); gatherRef.current = null; };
  }, [activeGather, addItem, addXp, addLog, equipSpeedPct, equipXpPct, trackQuest]);

  // Combat tick
  useEffect(() => {
    if (!activeCombat || !combatState) return;
    const step = 100;
    const m = activeCombat;
    const pSpeed = 2000; // player attacks every 2s

    combatRef.current = setInterval(() => {
      setCombatState(prev => {
        if (!prev) return prev;
        let { monsterHp, monsterMaxHp, pElapsed, mElapsed } = prev;
        pElapsed += step;
        mElapsed += step;
        let pHit = 0, mHit = 0;

        // Player attacks
        if (pElapsed >= pSpeed) {
          pElapsed = 0;
          const rawDmg = Math.max(1, playerAtk - m.def + Math.floor(Math.random() * 3) - 1);
          monsterHp -= rawDmg;
          pHit = rawDmg;
          setCombatStats(s => ({ ...s, totalDamage: s.totalDamage + rawDmg }));
        }

        // Monster attacks
        if (mElapsed >= m.speed) {
          mElapsed = 0;
          const rawDmg = Math.max(1, m.atk - playerDef + Math.floor(Math.random() * 3) - 1);
          mHit = rawDmg;
          setPlayer(p => {
            const newHp = p.hp - rawDmg;
            if (newHp <= 0) {
              // Player died
              addLog(`💀 You were killed by ${m.emoji} ${m.name}!`);
              setCombatStats(s => ({ ...s, deaths: s.deaths + 1 }));
              stopCombat();
              return { ...p, hp: Math.floor(p.maxHp * 0.5) }; // respawn at 50% HP
            }
            return { ...p, hp: newHp };
          });
        }

        // Monster dies
        if (monsterHp <= 0) {
          // Rewards (apply XP bonus)
          const xpMult = 1 + (equipXpPct + getPetXpPct("combat")) / 100;
          const effectiveXp = Math.round(m.xpR * xpMult);
          const goldMult = storePurchases.gold_rush ? 1.15 : 1;
          const effectiveGold = Math.round(m.goldR * goldMult);
          addXp("combat", effectiveXp);
          addGold(effectiveGold);
          addLog(`✅ Killed ${m.emoji} ${m.name}! +${effectiveXp} XP +${effectiveGold}g`);
          setCombatStats(s => ({ ...s, kills: s.kills + 1 }));
          trackQuest("kill"); trackQuest("pm_kill");
          trackQuest("earn", effectiveGold); trackQuest("pm_wealth", effectiveGold);

          // Drop rolls (Lucky Drops: +10% drop rate)
          const dropBonus = storePurchases.lucky_drops ? 10 : 0;
          for (const drop of m.drops) {
            if (Math.random() * 100 < (drop.pct + dropBonus)) {
              addItem(drop.item);
              addLog(`🎁 Loot: ${ITEMS[drop.item]?.emoji || ""} ${drop.item}!`);
            }
          }

          // Respawn monster
          return { monsterHp: monsterMaxHp, monsterMaxHp, pElapsed: 0, mElapsed: 0 };
        }

        return { monsterHp, monsterMaxHp, pElapsed, mElapsed };
      });
    }, step);

    return () => { clearInterval(combatRef.current); combatRef.current = null; };
  }, [activeCombat, combatState?.monsterMaxHp, playerAtk, playerDef, addXp, addGold, addItem, addLog, stopCombat, equipXpPct, trackQuest]);

  // ─── CRAFTING STATE ───
  const [activeCraft, setActiveCraft] = useState(null); // { skillId, recipe, remaining }
  const [craftProgress, setCraftProgress] = useState(0);
  const [craftStats, setCraftStats] = useState(() => sv.craftStats || { crafted: 0 });
  const craftRef = useRef(null);

  const stopCrafting = useCallback(() => {
    if (craftRef.current) { clearInterval(craftRef.current); craftRef.current = null; }
    setActiveCraft(null);
    setCraftProgress(0);
  }, []);

  const canCraftRecipe = useCallback((recipe) => {
    return recipe.mats.every(m => (inventory[m.n] || 0) >= m.need);
  }, [inventory]);

  const maxCraftable = useCallback((recipe) => {
    return Math.min(...recipe.mats.map(m => Math.floor((inventory[m.n] || 0) / m.need)));
  }, [inventory]);

  const startCrafting = useCallback((skillId, recipe, qty = 1) => {
    if (!canCraftRecipe(recipe)) return;
    stopCrafting();
    stopCombat();
    stopGathering();
    // Consume materials for first craft
    for (const m of recipe.mats) removeItem(m.n, m.need);
    setActiveCraft({ skillId, recipe, remaining: qty - 1 });
    setCraftProgress(0);
    addLog(`🔨 Crafting ${recipe.emoji} ${recipe.name}${qty > 1 ? ` (×${qty})` : ""}...`);
  }, [canCraftRecipe, stopCrafting, stopCombat, stopGathering, removeItem, addLog]);

  // Crafting tick
  useEffect(() => {
    if (!activeCraft) return;
    const { skillId, recipe, remaining } = activeCraft;
    const step = 100;
    let elapsed = 0;
    const speedMult = 1 + (equipSpeedPct + getPetSpeedPct(skillId)) / 100;
    const effectiveTime = Math.max(500, Math.round(recipe.time / speedMult));
    const xpMult = 1 + (equipXpPct + getPetXpPct(skillId)) / 100;
    const effectiveXp = Math.round(recipe.xp * xpMult);

    craftRef.current = setInterval(() => {
      elapsed += step;
      setCraftProgress((elapsed / effectiveTime) * 100);

      if (elapsed >= effectiveTime) {
        elapsed = 0;
        setCraftProgress(0);
        // Give crafted item + xp
        addItem(recipe.name);
        addXp(skillId, effectiveXp);
        setCraftStats(s => ({ ...s, crafted: s.crafted + 1 }));
        addLog(`✅ Crafted ${recipe.emoji} ${recipe.name}! (+${effectiveXp} ${SKILLS_CONFIG[skillId].name} XP)`);
        // Quest tracking
        if (skillId === "cooking") trackQuest("cook");
        else if (skillId === "smithing") trackQuest("smith");
        else if (skillId === "alchemy") trackQuest("brew");
        trackQuest("pm_craft");

        // Continue queue or stop
        if (remaining > 0) {
          // Check if we can still craft
          const canStill = recipe.mats.every(m => (inventory[m.n] || 0) >= m.need);
          if (canStill) {
            for (const m of recipe.mats) removeItem(m.n, m.need);
            setActiveCraft(prev => prev ? { ...prev, remaining: prev.remaining - 1 } : null);
          } else {
            addLog(`⚠️ Ran out of materials for ${recipe.name}`);
            stopCrafting();
          }
        } else {
          stopCrafting();
        }
      }
    }, step);

    return () => { clearInterval(craftRef.current); craftRef.current = null; };
  }, [activeCraft, addItem, addXp, addLog, inventory, removeItem, stopCrafting, equipSpeedPct, equipXpPct, trackQuest]);

  // ─── PARTY COMBAT STATE ───
  const [combatMode, setCombatMode] = useState("solo"); // solo | party
  const [party, setParty] = useState(null); // { id, leader, monster, members, status, monsterHp, monsterMaxHp, combatLog }
  const [partyList, setPartyList] = useState([]);
  const [partyLoading, setPartyLoading] = useState(false);
  const [partyView, setPartyView] = useState("browse"); // browse | create | active
  const partyCombatRef = useRef(null);

  const fetchPartyList = useCallback(async () => {
    setPartyLoading(true);
    try {
      const result = await window.storage.list("party:", true);
      if (result?.keys) {
        const parties = [];
        for (const key of result.keys) {
          try { const raw = await window.storage.get(key, true); if (raw) parties.push(JSON.parse(raw.value)); } catch {}
        }
        setPartyList(parties.filter(p => p.status === "waiting" || p.members?.some(m => m.username === account.username)));
      }
    } catch {}
    setPartyLoading(false);
  }, [account.username]);

  const fetchMyParty = useCallback(async () => {
    try {
      const raw = await window.storage.get(`player-party:${account.username}`);
      if (raw) {
        const pRaw = await window.storage.get(`party:${raw.value}`, true);
        if (pRaw) { const p = JSON.parse(pRaw.value); setParty(p); if (p.status !== "waiting") setPartyView("active"); return p; }
      }
      setParty(null);
    } catch { setParty(null); }
    return null;
  }, [account.username]);

  const createParty = useCallback(async (monsterIdx) => {
    const m = MONSTERS[monsterIdx];
    const partyId = `${account.username}-${Date.now()}`;
    const me = { username: account.username, displayName: account.displayName || account.username, atk: playerAtk, def: playerDef, hp: player.hp, maxHp: player.maxHp };
    const p = { id: partyId, leader: account.username, monster: monsterIdx, monsterName: m.name, monsterEmoji: m.emoji, monsterLvl: m.lvl, members: [me], status: "waiting", created: Date.now() };
    try {
      await window.storage.set(`party:${partyId}`, JSON.stringify(p), true);
      await window.storage.set(`player-party:${account.username}`, partyId);
      setParty(p); setPartyView("active");
      addLog(`🛡️ Created party to fight ${m.emoji} ${m.name}`);
    } catch {}
  }, [account, playerAtk, playerDef, player, addLog]);

  const joinParty = useCallback(async (partyId) => {
    setPartyLoading(true);
    try {
      const raw = await window.storage.get(`party:${partyId}`, true);
      if (!raw) { setPartyLoading(false); return; }
      const p = JSON.parse(raw.value);
      if (p.members.length >= 5 || p.status !== "waiting") { setPartyLoading(false); return; }
      if (p.members.find(m => m.username === account.username)) { setParty(p); setPartyView("active"); setPartyLoading(false); return; }
      const me = { username: account.username, displayName: account.displayName || account.username, atk: playerAtk, def: playerDef, hp: player.hp, maxHp: player.maxHp };
      p.members.push(me);
      await window.storage.set(`party:${partyId}`, JSON.stringify(p), true);
      await window.storage.set(`player-party:${account.username}`, partyId);
      setParty(p); setPartyView("active");
      addLog(`🛡️ Joined party vs ${p.monsterEmoji} ${p.monsterName}`);
    } catch {}
    setPartyLoading(false);
  }, [account, playerAtk, playerDef, player, addLog]);

  const leaveParty = useCallback(async () => {
    if (!party) return;
    try {
      const raw = await window.storage.get(`party:${party.id}`, true);
      if (raw) {
        const p = JSON.parse(raw.value);
        p.members = p.members.filter(m => m.username !== account.username);
        if (p.members.length === 0) await window.storage.delete(`party:${party.id}`, true);
        else { if (p.leader === account.username) p.leader = p.members[0].username; await window.storage.set(`party:${party.id}`, JSON.stringify(p), true); }
      }
      await window.storage.delete(`player-party:${account.username}`);
    } catch {}
    setParty(null); setPartyView("browse");
    if (partyCombatRef.current) { clearInterval(partyCombatRef.current); partyCombatRef.current = null; }
    addLog("🚪 Left party");
  }, [party, account, addLog]);

  const startPartyFight = useCallback(async () => {
    if (!party || party.leader !== account.username) return;
    stopGathering(); stopCombat(); stopCrafting();
    const m = MONSTERS[party.monster];
    const scaledHp = Math.round(m.hp * (1 + (party.members.length - 1) * 0.6));
    const p = { ...party, status: "fighting", monsterHp: scaledHp, monsterMaxHp: scaledHp, combatLog: [], startedAt: Date.now() };
    try {
      await window.storage.set(`party:${party.id}`, JSON.stringify(p), true);
      setParty(p); setPartyView("active");
      addLog(`⚔️ Party fight vs ${m.emoji} ${m.name} (${scaledHp} HP)!`);
    } catch {}
  }, [party, account, addLog, stopGathering, stopCombat, stopCrafting]);

  // Party combat tick — leader runs simulation
  useEffect(() => {
    if (!party || party.status !== "fighting" || party.leader !== account.username) return;
    const m = MONSTERS[party.monster];
    let mHp = party.monsterHp;
    const mMaxHp = party.monsterMaxHp;
    let cLog = [...(party.combatLog || [])];
    let myHp = player.hp;
    const step = 600;

    partyCombatRef.current = setInterval(async () => {
      let totalDmg = 0;
      for (const mem of party.members) {
        totalDmg += Math.max(1, mem.atk - m.def + Math.floor(Math.random() * 4));
      }
      mHp -= totalDmg;
      cLog.push({ t: Date.now(), text: `⚔️ Party deals ${totalDmg} dmg (${party.members.length} attackers)` });

      const avgDef = Math.floor(party.members.reduce((a, m2) => a + m2.def, 0) / party.members.length);
      const mDmg = Math.max(1, Math.floor(m.atk / Math.sqrt(party.members.length)) - avgDef + Math.floor(Math.random() * 3));
      myHp -= mDmg;
      cLog.push({ t: Date.now(), text: `${m.emoji} ${m.name} strikes for ${mDmg}` });
      if (cLog.length > 20) cLog = cLog.slice(-20);

      if (mHp <= 0) {
        // Victory!
        const n = party.members.length;
        const xpMult = 1 + (equipXpPct + getPetXpPct("combat")) / 100;
        const sharedXp = Math.round((m.xpR * 0.7 / n) * xpMult);
        const sharedGold = Math.round(m.goldR * 0.8 / n);
        addXp("combat", sharedXp); addGold(sharedGold);
        addLog(`🎉 Party defeated ${m.emoji} ${m.name}! +${sharedXp} XP +${sharedGold}g (split ${n}-way)`);
        for (const drop of m.drops) { if (Math.random() * 100 < drop.pct) { addItem(drop.item); addLog(`🎁 Party loot: ${ITEMS[drop.item]?.emoji||""} ${drop.item}!`); } }
        cLog.push({ t: Date.now(), text: `🎉 VICTORY! XP & gold split ${n}-way` });
        const up = { ...party, status: "victory", monsterHp: 0, combatLog: cLog };
        try { await window.storage.set(`party:${party.id}`, JSON.stringify(up), true); } catch {}
        setParty(up);
        clearInterval(partyCombatRef.current); partyCombatRef.current = null;
        return;
      }
      if (myHp <= 0) {
        addLog(`💀 Party wiped by ${m.emoji} ${m.name}!`);
        setPlayer(p => ({ ...p, hp: Math.floor(p.maxHp * 0.5) }));
        cLog.push({ t: Date.now(), text: `💀 DEFEAT! Party wiped.` });
        const up = { ...party, status: "defeated", monsterHp: mHp, combatLog: cLog };
        try { await window.storage.set(`party:${party.id}`, JSON.stringify(up), true); } catch {}
        setParty(up);
        clearInterval(partyCombatRef.current); partyCombatRef.current = null;
        return;
      }
      setPlayer(p => ({ ...p, hp: Math.max(1, myHp) }));
      const up = { ...party, monsterHp: mHp, combatLog: cLog };
      try { await window.storage.set(`party:${party.id}`, JSON.stringify(up), true); } catch {}
      setParty(up);
    }, step);

    return () => { if (partyCombatRef.current) { clearInterval(partyCombatRef.current); partyCombatRef.current = null; } };
  }, [party?.id, party?.status, party?.leader, party?.members?.length, account.username]); // eslint-disable-line

  // Non-leader: poll party state during fight
  useEffect(() => {
    if (!party || party.status !== "fighting" || party.leader === account.username) return;
    const poll = setInterval(async () => {
      const p = await fetchMyParty();
      if (p && p.status === "victory") {
        const m = MONSTERS[p.monster]; const n = p.members.length;
        const xpMult = 1 + (equipXpPct + getPetXpPct("combat")) / 100;
        addXp("combat", Math.round((m.xpR * 0.7 / n) * xpMult));
        addGold(Math.round(m.goldR * 0.8 / n));
        addLog(`🎉 Party defeated ${m.emoji} ${m.name}!`);
        for (const drop of m.drops) { if (Math.random() * 100 < drop.pct) { addItem(drop.item); } }
        clearInterval(poll);
      }
      if (p && p.status === "defeated") { addLog(`💀 Party wiped`); clearInterval(poll); }
    }, 2000);
    return () => clearInterval(poll);
  }, [party?.id, party?.status, party?.leader, account.username]); // eslint-disable-line

  // Fetch party on combat page open
  useEffect(() => { if (page === "combat" && combatMode === "party") { fetchMyParty(); fetchPartyList(); } }, [page, combatMode, fetchMyParty, fetchPartyList]);

  // ─── QUEST SYSTEM ───
  const [isPremium, setIsPremium] = useState(() => sv.isPremium || false);
  const [questsClaimed, setQuestsClaimed] = useState({}); // { "quest-id": true }
  const [questDay, setQuestDay] = useState(""); // "YYYY-MM-DD" — resets quests when day changes

  // Generate daily quests deterministically from date seed
  const getDayKey = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`; };

  const QUEST_TEMPLATES = {
    free: [
      { id: "mine", skill: "mining", icon: "⛏️", verb: "Mine", targets: [8, 12, 20, 30], unit: "ores", rewardGold: [30, 50, 80, 120], rewardXp: [20, 35, 55, 80] },
      { id: "chop", skill: "woodcutting", icon: "🪓", verb: "Chop", targets: [8, 12, 20, 30], unit: "logs", rewardGold: [30, 50, 80, 120], rewardXp: [20, 35, 55, 80] },
      { id: "fish", skill: "fishing", icon: "🎣", verb: "Catch", targets: [8, 12, 18, 25], unit: "fish", rewardGold: [30, 50, 80, 120], rewardXp: [20, 35, 55, 80] },
      { id: "kill", skill: "combat", icon: "⚔️", verb: "Kill", targets: [5, 10, 15, 25], unit: "monsters", rewardGold: [50, 80, 140, 200], rewardXp: [30, 50, 80, 130] },
      { id: "cook", skill: "cooking", icon: "🍳", verb: "Cook", targets: [5, 8, 12, 20], unit: "dishes", rewardGold: [25, 45, 70, 100], rewardXp: [15, 30, 50, 75] },
      { id: "smith", skill: "smithing", icon: "🔨", verb: "Smith", targets: [3, 5, 8, 12], unit: "items", rewardGold: [40, 60, 100, 150], rewardXp: [25, 40, 65, 100] },
      { id: "brew", skill: "alchemy", icon: "🧪", verb: "Brew", targets: [3, 5, 8, 12], unit: "potions", rewardGold: [40, 60, 100, 150], rewardXp: [25, 40, 65, 100] },
      { id: "earn", skill: null, icon: "💰", verb: "Earn", targets: [50, 100, 200, 500], unit: "gold", rewardGold: [0, 0, 0, 0], rewardXp: [40, 70, 120, 200] },
    ],
    premium: [
      { id: "pm_kill", skill: "combat", icon: "💎", verb: "Slay", targets: [10, 20, 30, 50], unit: "monsters", rewardGold: [200, 400, 600, 1000], rewardXp: [100, 200, 350, 500], rewardItem: "Greater HP Potion" },
      { id: "pm_gather", skill: null, icon: "💎", verb: "Gather", targets: [20, 35, 50, 80], unit: "resources", rewardGold: [150, 300, 500, 800], rewardXp: [80, 150, 250, 400], rewardItem: "Mana Potion" },
      { id: "pm_craft", skill: null, icon: "💎", verb: "Craft", targets: [8, 15, 20, 30], unit: "items", rewardGold: [200, 350, 550, 900], rewardXp: [100, 180, 280, 450], rewardItem: "ATK Elixir" },
      { id: "pm_wealth", skill: null, icon: "💎", verb: "Amass", targets: [200, 500, 1000, 2000], unit: "gold", rewardGold: [0, 0, 0, 0], rewardXp: [150, 300, 500, 800], rewardItem: "Shadow Elixir" },
    ],
  };

  const generateDailyQuests = useCallback((dayKey) => {
    // Seed from day string
    let seed = 0; for (let i = 0; i < dayKey.length; i++) seed = seed * 31 + dayKey.charCodeAt(i);
    const pick = (arr) => arr[Math.abs(seed = seed * 16807 + 7) % arr.length];
    const pickIdx = (len) => Math.abs(seed = seed * 16807 + 7) % len;

    const free = QUEST_TEMPLATES.free.map(t => {
      const diff = pickIdx(t.targets.length);
      return { ...t, target: t.targets[diff], gold: t.rewardGold[diff], xp: t.rewardXp[diff], diff };
    });
    const premium = QUEST_TEMPLATES.premium.map(t => {
      const diff = pickIdx(t.targets.length);
      return { ...t, target: t.targets[diff], gold: t.rewardGold[diff], xp: t.rewardXp[diff], diff };
    });
    return { free, premium };
  }, []);

  const [dailyQuests, setDailyQuests] = useState(() => generateDailyQuests(getDayKey()));

  // Reset quests on new day
  useEffect(() => {
    const today = getDayKey();
    if (questDay !== today) {
      setQuestDay(today);
      setQuestProgress({});
      setQuestsClaimed({});
      setDailyQuests(generateDailyQuests(today));
    }
    // Check every 30s for day change
    const iv = setInterval(() => {
      const now = getDayKey();
      if (now !== today) { setQuestDay(now); setQuestProgress({}); setQuestsClaimed({}); setDailyQuests(generateDailyQuests(now)); }
    }, 30000);
    return () => clearInterval(iv);
  }, [questDay, generateDailyQuests]);

  // Load quest state from save
  useEffect(() => {
    (async () => {
      try {
        const raw = await window.storage.get(`quests:${account.username}`);
        if (raw) {
          const q = JSON.parse(raw.value);
          if (q.day === getDayKey()) { setQuestProgress(q.progress || {}); setQuestsClaimed(q.claimed || {}); }
          if (q.premium) setIsPremium(true);
        }
      } catch {}
    })();
  }, [account.username]);

  // Save quest state
  useEffect(() => {
    const t = setTimeout(async () => {
      try { await window.storage.set(`quests:${account.username}`, JSON.stringify({ day: getDayKey(), progress: questProgress, claimed: questsClaimed, premium: isPremium })); } catch {}
    }, 2000);
    return () => clearTimeout(t);
  }, [questProgress, questsClaimed, isPremium, account.username]);

  // Quest progress trackers — called from game actions (trackQuest defined earlier)

  // Pet rewards mapped to quest difficulty (only highest difficulty gives pet)
  const QUEST_PET_REWARDS = {
    mine: { diff: 3, pet: "Rocky" },
    chop: { diff: 3, pet: "Timber" },
    fish: { diff: 3, pet: "Bubbles" },
    kill: { diff: 3, pet: "Ember" },
    cook: { diff: 3, pet: "Sizzle" },
    smith: { diff: 3, pet: "Clink" },
    brew: { diff: 3, pet: "Mystic" },
    pm_kill: { diff: 3, pet: "Shadow" },
    pm_gather: { diff: 3, pet: "Phoenix" },
    pm_wealth: { diff: 3, pet: "Dragon Whelp" },
  };

  const claimQuest = useCallback((quest) => {
    if (questsClaimed[quest.id]) return;
    if ((questProgress[quest.id] || 0) < quest.target) return;
    setQuestsClaimed(prev => ({ ...prev, [quest.id]: true }));
    const questGold = quest.gold > 0 ? Math.round(quest.gold * (storePurchases.gold_rush ? 1.15 : 1)) : 0;
    if (questGold > 0) addGold(questGold);
    if (quest.xp > 0 && quest.skill) addXp(quest.skill, quest.xp);
    else if (quest.xp > 0) addXp("combat", quest.xp);
    if (quest.rewardItem) addItem(quest.rewardItem);
    // Pet reward — highest difficulty quests have a chance to drop a pet
    const petInfo = QUEST_PET_REWARDS[quest.id];
    if (petInfo && quest.diff >= petInfo.diff && !pets.includes(petInfo.pet)) {
      const roll = Math.random();
      const chance = quest.id.startsWith("pm_") ? 0.25 : 0.15; // 25% premium, 15% free
      if (roll < chance) {
        unlockPet(petInfo.pet);
      }
    }
    addLog(`📋 Quest complete: ${quest.icon} ${quest.verb} ${quest.target} ${quest.unit}! ${quest.gold > 0 ? `+${quest.gold}g ` : ""}${quest.xp > 0 ? `+${quest.xp} XP ` : ""}${quest.rewardItem ? `+${ITEMS[quest.rewardItem]?.emoji} ${quest.rewardItem}` : ""}`);
  }, [questProgress, questsClaimed, addGold, addXp, addItem, addLog, pets, unlockPet]);

  const questsDone = [...(dailyQuests.free || []), ...(isPremium ? (dailyQuests.premium || []) : [])].filter(q => questsClaimed[q.id]).length;
  const questsTotal = (dailyQuests.free?.length || 0) + (isPremium ? (dailyQuests.premium?.length || 0) : 0);
  const questsRemaining = questsTotal - questsDone;

  // ─── MARKETPLACE ───
  const [marketTab, setMarketTab] = useState("sell"); // sell | buy | myListings
  const [marketListings, setMarketListings] = useState([]); // combined listings: { item, priceEach, totalQty, sellers: [{user,displayName,qty}] }
  const [marketLoading, setMarketLoading] = useState(false);
  const [sellQty, setSellQty] = useState({});
  const [listingPrice, setListingPrice] = useState({});
  const [listingQty, setListingQty] = useState({});
  const [buyQty, setBuyQty] = useState({});
  const [marketSearch, setMarketSearch] = useState("");

  const sellToShop = useCallback((itemName, qty) => {
    const owned = inventory[itemName] || 0;
    const actual = Math.min(qty, owned);
    if (actual <= 0) return;
    const price = ITEMS[itemName]?.sell || 1;
    const total = price * actual;
    removeItem(itemName, actual);
    addGold(total);
    addLog(`🏪 Sold ${actual}x ${ITEMS[itemName]?.emoji || ""} ${itemName} for ${total}g`);
  }, [inventory, removeItem, addGold, addLog]);

  const sellAllJunk = useCallback(() => {
    let totalGold = 0, totalItems = 0;
    Object.entries(inventory).forEach(([name, qty]) => {
      if (qty <= 0) return;
      const info = ITEMS[name];
      if (!info || info.category !== "material") return;
      const price = info.sell || 1;
      totalGold += price * qty;
      totalItems += qty;
      removeItem(name, qty);
    });
    if (totalItems > 0) {
      addGold(totalGold);
      addLog(`🏪 Bulk sold ${totalItems} materials for ${totalGold}g`);
    }
  }, [inventory, removeItem, addGold, addLog]);

  // Storage key for combined listing: market:ItemName:priceEach (no spaces allowed in keys)
  const marketKey = (item, priceEach) => `market:${item.replace(/\s+/g, "_")}:${priceEach}`;

  const fetchMarketListings = useCallback(async () => {
    setMarketLoading(true);
    try {
      const keys = await window.storage.list("market:", true);
      if (keys?.keys) {
        const listings = [];
        for (const k of keys.keys.slice(0, 200)) {
          try {
            const raw = await window.storage.get(k, true);
            if (raw) {
              const l = JSON.parse(raw.value);
              if (l.totalQty > 0 && l.item && l.priceEach) listings.push({ ...l, _key: k });
            }
          } catch {}
        }
        listings.sort((a, b) => a.item.localeCompare(b.item) || a.priceEach - b.priceEach);
        setMarketListings(listings);
      }
    } catch {}
    setMarketLoading(false);
  }, []);

  const listOnMarket = useCallback(async (itemName, qty, priceEach) => {
    const owned = inventory[itemName] || 0;
    if (qty <= 0 || qty > owned || priceEach <= 0) return;
    removeItem(itemName, qty);
    const key = marketKey(itemName, priceEach);
    try {
      // Read existing combined listing at this price point
      let listing = { item: itemName, priceEach, totalQty: 0, sellers: [] };
      try {
        const raw = await window.storage.get(key, true);
        if (raw) listing = JSON.parse(raw.value);
      } catch {}
      // Merge into existing seller entry or add new one
      const existing = listing.sellers.find(s => s.user === account.username);
      if (existing) { existing.qty += qty; }
      else { listing.sellers.push({ user: account.username, displayName: account.displayName || account.username, qty }); }
      listing.totalQty = listing.sellers.reduce((s, e) => s + e.qty, 0);
      await window.storage.set(key, JSON.stringify(listing), true);
      addLog(`📦 Listed ${qty}x ${ITEMS[itemName]?.emoji || ""} ${itemName} at ${priceEach}g each`);
      fetchMarketListings();
    } catch (e) { console.error("Market list error:", e); addItem(itemName, qty); }
  }, [inventory, removeItem, addItem, account, addLog, fetchMarketListings]);

  const buyFromMarket = useCallback(async (listing, wantQty) => {
    const qty = Math.min(wantQty || listing.totalQty, listing.totalQty);
    const cost = qty * listing.priceEach;
    if (gold < cost) { addLog("❌ Not enough gold!"); return; }
    const otherQty = listing.sellers.filter(s => s.user !== account.username).reduce((s, e) => s + e.qty, 0);
    if (otherQty === 0) { addLog("❌ Can't buy your own listing!"); return; }
    const actualBuyQty = Math.min(qty, otherQty);
    const actualCost = actualBuyQty * listing.priceEach;
    try {
      let remaining = actualBuyQty;
      const updatedSellers = [];
      for (const s of listing.sellers) {
        if (remaining <= 0) { updatedSellers.push(s); continue; }
        if (s.user === account.username) { updatedSellers.push(s); continue; }
        const take = Math.min(remaining, s.qty);
        remaining -= take;
        try {
          const wRaw = await window.storage.get(`wallet:${s.user}`, true);
          const w = wRaw ? JSON.parse(wRaw.value) : { pending: 0 };
          w.pending = (w.pending || 0) + take * listing.priceEach;
          await window.storage.set(`wallet:${s.user}`, JSON.stringify(w), true);
        } catch {}
        if (s.qty - take > 0) updatedSellers.push({ ...s, qty: s.qty - take });
      }
      const newTotal = updatedSellers.reduce((s, e) => s + e.qty, 0);
      if (newTotal > 0) {
        await window.storage.set(listing._key, JSON.stringify({ item: listing.item, priceEach: listing.priceEach, totalQty: newTotal, sellers: updatedSellers }), true);
      } else {
        await window.storage.delete(listing._key, true);
      }
      addGold(-actualCost);
      addItem(listing.item, actualBuyQty);
      addLog(`🛒 Bought ${actualBuyQty}x ${ITEMS[listing.item]?.emoji || ""} ${listing.item} for ${actualCost}g`);
      fetchMarketListings();
    } catch { addLog("❌ Purchase failed, try again"); fetchMarketListings(); }
  }, [gold, account, addGold, addItem, addLog, fetchMarketListings]);

  const cancelMyListings = useCallback(async (listing) => {
    const mySeller = listing.sellers.find(s => s.user === account.username);
    if (!mySeller || mySeller.qty <= 0) return;
    try {
      const updatedSellers = listing.sellers.filter(s => s.user !== account.username);
      const newTotal = updatedSellers.reduce((s, e) => s + e.qty, 0);
      if (newTotal > 0) {
        await window.storage.set(listing._key, JSON.stringify({ item: listing.item, priceEach: listing.priceEach, totalQty: newTotal, sellers: updatedSellers }), true);
      } else {
        await window.storage.delete(listing._key, true);
      }
      addItem(listing.item, mySeller.qty);
      addLog(`↩️ Cancelled: ${mySeller.qty}x ${ITEMS[listing.item]?.emoji || ""} ${listing.item} at ${listing.priceEach}g each`);
      fetchMarketListings();
    } catch {}
  }, [account, addItem, addLog, fetchMarketListings]);

  // Collect pending wallet gold
  useEffect(() => {
    if (!account.username) return;
    const checkWallet = async () => {
      try {
        const raw = await window.storage.get(`wallet:${account.username}`, true);
        if (raw) {
          const w = JSON.parse(raw.value);
          if (w.pending > 0) {
            addGold(w.pending);
            addLog(`💰 Collected ${w.pending}g from marketplace sales!`);
            await window.storage.set(`wallet:${account.username}`, JSON.stringify({ pending: 0 }), true);
          }
        }
      } catch {}
    };
    checkWallet();
    const iv = setInterval(checkWallet, 15000);
    return () => clearInterval(iv);
  }, [account.username, addGold, addLog]);

  // Fetch listings when market page opens
  useEffect(() => { if (page === "market") fetchMarketListings(); }, [page, fetchMarketListings]);

  // ─── AUTO-SAVE ───
  const [lastSaved, setLastSaved] = useState(null);
  const saveTimer = useRef(null);

  useEffect(() => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      const save = { skills, inventory, equipped, pets, activePets, petSlots, isPremium, storePurchases, player, gold, stats, combatStats, craftStats };
      try {
        await window.storage.set(`save:${account.username}`, JSON.stringify(save));
        setLastSaved(new Date());
      } catch {}
      // Publish leaderboard data (shared)
      try {
        const lb = {
          displayName: account.displayName || account.username,
          totalLevel,
          skills: Object.fromEntries(SKILL_IDS.map(id => [id, skills[id].level])),
          kills: combatStats.kills,
          gold,
          clan: myClan ? { name: myClan.displayName || myClan.name, tag: myClan.tag } : null,
          updated: Date.now(),
        };
        await window.storage.set(`lb:${account.username}`, JSON.stringify(lb), true);
      } catch {}
    }, 2000); // debounce 2s
    return () => clearTimeout(saveTimer.current);
  }, [skills, inventory, equipped, player, gold, stats, combatStats, craftStats, account.username]);

  // ─── LEADERBOARD STATE ───
  const [lbData, setLbData] = useState([]);
  const [lbTab, setLbTab] = useState("totalLevel");
  const [lbLoading, setLbLoading] = useState(false);

  const fetchLeaderboard = useCallback(async () => {
    setLbLoading(true);
    try {
      const result = await window.storage.list("lb:", true);
      if (result && result.keys) {
        const entries = [];
        for (const key of result.keys) {
          try {
            const raw = await window.storage.get(key, true);
            if (raw) entries.push(JSON.parse(raw.value));
          } catch {}
        }
        setLbData(entries);
      }
    } catch {}
    setLbLoading(false);
  }, []);

  useEffect(() => {
    if (page === "leaderboard") fetchLeaderboard();
  }, [page, fetchLeaderboard]);

  // ─── CLAN STATE ───
  const [myClan, setMyClan] = useState(null); // { name, tag, desc, creator, created }
  const [clanMembers, setClanMembers] = useState([]);
  const [clanList, setClanList] = useState([]);
  const [clanLoading, setClanLoading] = useState(false);
  const [clanTab, setClanTab] = useState("info"); // info | members | browse | create
  const [clanForm, setClanForm] = useState({ name: "", tag: "", desc: "" });
  const [clanError, setClanError] = useState("");

  const fetchMyClan = useCallback(async () => {
    try {
      const raw = await window.storage.get(`player-clan:${account.username}`);
      if (raw) {
        const clanName = raw.value;
        const clanRaw = await window.storage.get(`clan:${clanName}`, true);
        if (clanRaw) {
          setMyClan(JSON.parse(clanRaw.value));
          try {
            const memRaw = await window.storage.get(`clan-members:${clanName}`, true);
            if (memRaw) setClanMembers(JSON.parse(memRaw.value));
          } catch { setClanMembers([]); }
        }
      } else { setMyClan(null); setClanMembers([]); }
    } catch { setMyClan(null); }
  }, [account.username]);

  const fetchClanList = useCallback(async () => {
    setClanLoading(true);
    try {
      const result = await window.storage.list("clan:", true);
      if (result && result.keys) {
        const clans = [];
        for (const key of result.keys) {
          if (key.includes("clan-members:")) continue;
          try {
            const raw = await window.storage.get(key, true);
            if (raw) {
              const clan = JSON.parse(raw.value);
              // fetch member count
              try {
                const memRaw = await window.storage.get(`clan-members:${clan.name}`, true);
                clan.memberCount = memRaw ? JSON.parse(memRaw.value).length : 0;
              } catch { clan.memberCount = 0; }
              clans.push(clan);
            }
          } catch {}
        }
        setClanList(clans);
      }
    } catch {}
    setClanLoading(false);
  }, []);

  const createClan = useCallback(async () => {
    setClanError("");
    const { name, tag, desc } = clanForm;
    if (!name.trim() || name.length < 3) return setClanError("Clan name must be 3+ characters");
    if (!tag.trim() || tag.length < 2 || tag.length > 5) return setClanError("Tag must be 2-5 characters");
    if (/[\s\/\\"']/.test(name)) return setClanError("Name cannot contain spaces or special characters");
    if (gold < 500) return setClanError("Need 500 gold to create a clan");
    setClanLoading(true);
    try {
      const existing = await window.storage.get(`clan:${name.toLowerCase()}`, true).catch(() => null);
      if (existing) { setClanError("Clan name already taken"); setClanLoading(false); return; }
      const clan = { name: name.toLowerCase(), displayName: name, tag: tag.toUpperCase(), desc, creator: account.username, created: Date.now() };
      const members = [{ username: account.username, displayName: account.displayName || account.username, role: "leader", joined: Date.now() }];
      await window.storage.set(`clan:${name.toLowerCase()}`, JSON.stringify(clan), true);
      await window.storage.set(`clan-members:${name.toLowerCase()}`, JSON.stringify(members), true);
      await window.storage.set(`player-clan:${account.username}`, name.toLowerCase());
      setGold(g => g - 500);
      addLog(`🏰 Created clan [${tag.toUpperCase()}] ${name}!`);
      setMyClan(clan);
      setClanMembers(members);
      setClanTab("info");
      setClanForm({ name: "", tag: "", desc: "" });
    } catch { setClanError("Failed to create clan"); }
    setClanLoading(false);
  }, [clanForm, gold, account, addLog]);

  const joinClan = useCallback(async (clanName) => {
    setClanLoading(true);
    try {
      let members = [];
      try {
        const memRaw = await window.storage.get(`clan-members:${clanName}`, true);
        if (memRaw) members = JSON.parse(memRaw.value);
      } catch {}
      if (members.find(m => m.username === account.username)) { setClanLoading(false); return; }
      members.push({ username: account.username, displayName: account.displayName || account.username, role: "member", joined: Date.now() });
      await window.storage.set(`clan-members:${clanName}`, JSON.stringify(members), true);
      await window.storage.set(`player-clan:${account.username}`, clanName);
      addLog(`🏰 Joined clan ${clanName}!`);
      await fetchMyClan();
      setClanTab("info");
    } catch {}
    setClanLoading(false);
  }, [account, addLog, fetchMyClan]);

  const leaveClan = useCallback(async () => {
    if (!myClan) return;
    setClanLoading(true);
    try {
      let members = [];
      try {
        const memRaw = await window.storage.get(`clan-members:${myClan.name}`, true);
        if (memRaw) members = JSON.parse(memRaw.value);
      } catch {}
      members = members.filter(m => m.username !== account.username);
      if (members.length === 0) {
        // Delete clan if empty
        await window.storage.delete(`clan:${myClan.name}`, true);
        await window.storage.delete(`clan-members:${myClan.name}`, true);
      } else {
        // If leader left, promote first member
        if (myClan.creator === account.username && members.length > 0) members[0].role = "leader";
        await window.storage.set(`clan-members:${myClan.name}`, JSON.stringify(members), true);
      }
      await window.storage.delete(`player-clan:${account.username}`);
      addLog(`🚪 Left clan ${myClan.displayName || myClan.name}`);
      setMyClan(null);
      setClanMembers([]);
      setClanTab("browse");
    } catch {}
    setClanLoading(false);
  }, [myClan, account, addLog]);

  const isLeader = myClan && myClan.creator === account.username;

  const kickMember = useCallback(async (username) => {
    if (!myClan || !isLeader || username === account.username) return;
    setClanLoading(true);
    try {
      let members = [...clanMembers];
      members = members.filter(m => m.username !== username);
      await window.storage.set(`clan-members:${myClan.name}`, JSON.stringify(members), true);
      try { await window.storage.delete(`player-clan:${username}`); } catch {}
      setClanMembers(members);
      addLog(`🏰 Kicked ${username} from clan`);
    } catch {}
    setClanLoading(false);
  }, [myClan, isLeader, account.username, clanMembers, addLog]);

  const promoteMember = useCallback(async (username, newRole) => {
    if (!myClan || !isLeader || username === account.username) return;
    setClanLoading(true);
    try {
      const members = clanMembers.map(m => m.username === username ? { ...m, role: newRole } : m);
      await window.storage.set(`clan-members:${myClan.name}`, JSON.stringify(members), true);
      setClanMembers(members);
      addLog(`🏰 ${username} ${newRole === "officer" ? "promoted to Officer" : "demoted to Member"}`);
    } catch {}
    setClanLoading(false);
  }, [myClan, isLeader, account.username, clanMembers, addLog]);

  const transferLeader = useCallback(async (username) => {
    if (!myClan || !isLeader || username === account.username) return;
    setClanLoading(true);
    try {
      const members = clanMembers.map(m => {
        if (m.username === username) return { ...m, role: "leader" };
        if (m.username === account.username) return { ...m, role: "officer" };
        return m;
      });
      const updatedClan = { ...myClan, creator: username };
      await window.storage.set(`clan:${myClan.name}`, JSON.stringify(updatedClan), true);
      await window.storage.set(`clan-members:${myClan.name}`, JSON.stringify(members), true);
      setMyClan(updatedClan);
      setClanMembers(members);
      addLog(`🏰 Transferred leadership to ${username}`);
    } catch {}
    setClanLoading(false);
  }, [myClan, isLeader, account.username, clanMembers, addLog]);

  const disbandClan = useCallback(async () => {
    if (!myClan || !isLeader) return;
    setClanLoading(true);
    try {
      // Remove all members' player-clan references
      for (const m of clanMembers) {
        try { await window.storage.delete(`player-clan:${m.username}`); } catch {}
      }
      await window.storage.delete(`clan:${myClan.name}`, true);
      await window.storage.delete(`clan-members:${myClan.name}`, true);
      addLog(`🏰 Disbanded clan [${myClan.tag}] ${myClan.displayName || myClan.name}`);
      setMyClan(null);
      setClanMembers([]);
      setClanTab("browse");
    } catch {}
    setClanLoading(false);
  }, [myClan, isLeader, clanMembers, addLog]);

  // ─── CHECK STRIPE PURCHASES ───
  const checkStripePurchases = useCallback(async () => {
    const functionsUrl = import.meta.env.VITE_FUNCTIONS_URL;
    if (!functionsUrl) return;
    try {
      const res = await fetch(`${functionsUrl}/checkPurchases`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: account.username }),
      });
      const data = await res.json();
      if (data.purchases) {
        const p = data.purchases;
        if (p.premium && !isPremium) { setIsPremium(true); addLog("⭐ Premium restored from purchase"); }
        if (p.petslot2 && petSlots < 2) { setPetSlots(s => Math.max(s, 2)); addLog("🐾 Pet Slot #2 restored"); }
        if (p.petslot3 && petSlots < 3) { setPetSlots(s => Math.max(s, 3)); addLog("🐾 Pet Slot #3 restored"); }
        if (p.starter_bundle && !storePurchases.starter_bundle) {
          addItem("Iron Ore", 15); addItem("Gold Ore", 8); addItem("Mana Crystal", 5);
          addItem("HP Potion", 3); addItem("Iron Sword", 1); addItem("Copper Amulet", 1);
          setStorePurchases(prev => ({ ...prev, starter_bundle: true }));
          addLog("🎒 Starting Bundle granted!");
        }
        if (p.xp_mastery) setStorePurchases(prev => ({ ...prev, xp_mastery: true }));
        if (p.speed_mastery) setStorePurchases(prev => ({ ...prev, speed_mastery: true }));
        if (p.combat_mastery) setStorePurchases(prev => ({ ...prev, combat_mastery: true }));
        if (p.lucky_drops) setStorePurchases(prev => ({ ...prev, lucky_drops: true }));
        if (p.gold_rush) setStorePurchases(prev => ({ ...prev, gold_rush: true }));
        // Revoke subscriptions that were cancelled
        if (p.xp_mastery === false && storePurchases.xp_mastery) setStorePurchases(prev => ({ ...prev, xp_mastery: false }));
        if (p.speed_mastery === false && storePurchases.speed_mastery) setStorePurchases(prev => ({ ...prev, speed_mastery: false }));
        if (p.lucky_drops === false && storePurchases.lucky_drops) setStorePurchases(prev => ({ ...prev, lucky_drops: false }));
      }
    } catch {}
  }, [account.username, isPremium, petSlots, storePurchases, addItem, addLog]);

  // Check purchases on mount and after Stripe redirect
  useEffect(() => {
    checkStripePurchases();
    const params = new URLSearchParams(window.location.search);
    if (params.get("purchase") === "success") {
      addLog("✅ Payment successful! Your purchase is being processed...");
      setTimeout(checkStripePurchases, 3000); // Re-check after webhook processes
      window.history.replaceState({}, "", window.location.pathname);
    } else if (params.get("purchase") === "cancelled") {
      addLog("❌ Purchase cancelled");
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []); // eslint-disable-line

  // Fetch clan on mount and page open
  useEffect(() => { fetchMyClan(); }, [fetchMyClan]);
  useEffect(() => {
    if (page === "clan") {
      fetchMyClan();
      fetchLeaderboard();
      if (!myClan) { fetchClanList(); if (clanTab === "info" || clanTab === "members") setClanTab("browse"); }
    }
  }, [page, fetchMyClan, fetchClanList, fetchLeaderboard, myClan, clanTab]);

  // ─── CHAT STATE ───
  const [chatChannel, setChatChannel] = useState("global"); // global | clan | system
  const [chatMessages, setChatMessages] = useState({ global: [], clan: [], system: [] });
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [unreadChat, setUnreadChat] = useState(0);
  const chatPollRef = useRef(null);
  const lastReadRef = useRef(Date.now());
  const chatEndRef = useRef(null);

  const fetchChat = useCallback(async (silent = false) => {
    if (!silent) setChatLoading(true);
    try {
      // Global
      let globalMsgs = [];
      try {
        const raw = await window.storage.get("chat:global", true);
        if (raw) globalMsgs = JSON.parse(raw.value);
      } catch {}

      // Clan
      let clanMsgs = [];
      if (myClan) {
        try {
          const raw = await window.storage.get(`chat:clan:${myClan.name}`, true);
          if (raw) clanMsgs = JSON.parse(raw.value);
        } catch {}
      }

      // System
      let sysMsgs = [];
      try {
        const raw = await window.storage.get("chat:system", true);
        if (raw) sysMsgs = JSON.parse(raw.value);
      } catch {}

      setChatMessages({ global: globalMsgs, clan: clanMsgs, system: sysMsgs });

      // Unread count (messages since last read)
      if (page !== "chat") {
        const allNew = [...globalMsgs, ...clanMsgs].filter(m => m.t > lastReadRef.current);
        setUnreadChat(allNew.length);
      }
    } catch {}
    if (!silent) setChatLoading(false);
  }, [myClan, page]);

  const sendChat = useCallback(async (channel) => {
    const text = chatInput.trim();
    if (!text || text.length > 200) return;
    setChatInput("");
    const msg = {
      user: account.displayName || account.username,
      clan: myClan ? myClan.tag : null,
      text,
      t: Date.now(),
    };
    try {
      const key = channel === "clan" && myClan ? `chat:clan:${myClan.name}` : "chat:global";
      let msgs = [];
      try {
        const raw = await window.storage.get(key, true);
        if (raw) msgs = JSON.parse(raw.value);
      } catch {}
      msgs.push(msg);
      if (msgs.length > 50) msgs = msgs.slice(-50);
      await window.storage.set(key, JSON.stringify(msgs), true);
      await fetchChat(true);
    } catch {}
  }, [chatInput, account, myClan, fetchChat]);

  // Publish system messages on notable events
  const publishSystemMsg = useCallback(async (text) => {
    try {
      let msgs = [];
      try {
        const raw = await window.storage.get("chat:system", true);
        if (raw) msgs = JSON.parse(raw.value);
      } catch {}
      msgs.push({ user: "⚔️ System", text, t: Date.now() });
      if (msgs.length > 30) msgs = msgs.slice(-30);
      await window.storage.set("chat:system", JSON.stringify(msgs), true);
    } catch {}
  }, []);

  // Auto-poll chat every 5s
  useEffect(() => {
    fetchChat(true);
    chatPollRef.current = setInterval(() => fetchChat(true), 5000);
    return () => clearInterval(chatPollRef.current);
  }, [fetchChat]);

  // Mark as read when on chat page
  useEffect(() => {
    if (page === "chat") {
      lastReadRef.current = Date.now();
      setUnreadChat(0);
    }
  }, [page, chatMessages]);

  // Scroll to bottom on new messages
  useEffect(() => {
    if (page === "chat" && chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [chatMessages, chatChannel, page]);

  return (
    <div style={{ display: "flex", height: "100vh", fontFamily: FONT, color: T.text, background: T.bg, overflow: "hidden", fontSize: 13 }}>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet" />

      {/* ═══ MOBILE OVERLAY ═══ */}
      {isMobile && mobileNav && (
        <div onClick={() => setMobileNav(false)} style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 998,
        }} />
      )}

      {/* ═══ SIDEBAR ═══ */}
      <aside style={{
        width: 230, minWidth: 230, background: T.sidebar,
        borderRight: `1px solid ${T.sidebarBorder}`,
        display: "flex", flexDirection: "column",
        flexShrink: 0,
        ...(isMobile ? {
          position: "fixed", top: 0, left: 0, bottom: 0, zIndex: 999,
          transform: mobileNav ? "translateX(0)" : "translateX(-100%)",
          transition: "transform 0.25s ease",
        } : {}),
      }}>
        {/* Brand */}
        <div style={{ padding: "22px 18px 16px", borderBottom: `1px solid ${T.sidebarBorder}` }}>
          <div style={{ fontSize: 17, fontWeight: 900, color: T.white, letterSpacing: -0.3 }}>
            <span style={{ marginRight: 6 }}>⚔️</span>Idle Realms
          </div>
          <div style={{ fontSize: 11, color: T.textDim, marginTop: 5, fontWeight: 500 }}>Idle MMO RPG</div>
        </div>

        {/* Player summary */}
        <div style={{ padding: "14px 18px", borderBottom: `1px solid ${T.sidebarBorder}` }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
            <span style={{ fontSize: 12, color: T.textSec }}>Total Level</span>
            <span style={{ fontSize: 12, color: T.white, fontWeight: 800 }}>{totalLevel}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ fontSize: 12, color: T.gold }}>💰 Gold</span>
            <span style={{ fontSize: 12, color: T.gold, fontWeight: 800 }}>{fmt(gold)}</span>
          </div>
          {activePets.length > 0 && (
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
              <span style={{ fontSize: 12, color: T.purple }}>🐾 Pets</span>
              <span style={{ fontSize: 12, color: T.purple, fontWeight: 800 }}>{activePets.map(n => PETS[n]?.emoji).join(" ")} ({activePets.length}/{petSlots})</span>
            </div>
          )}
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, overflowY: "auto", padding: "6px 8px", display: "flex", flexDirection: "column" }}>
          <SectionLabel>General</SectionLabel>
          <SidebarItem icon="📊" label="Skills" active={page==="skills"} onClick={() => nav("skills")} color={T.accent} />
          <SidebarItem icon="📋" label="Quests" active={page==="quests"} onClick={() => nav("quests")} color={T.orange} badge={questsRemaining > 0 ? `${questsRemaining}` : "✓"} />
          <SidebarItem icon="🎒" label="Inventory" active={page==="bank"} onClick={() => nav("bank")} color={T.warning} badge={uniqueItems || undefined} />
          <SidebarItem icon="🐾" label="Pets" active={page==="pets"} onClick={() => nav("pets")} color={T.purple} badge={pets.length > 0 ? `${pets.length}` : undefined} />
          <SidebarItem icon="🏪" label="Store" active={page==="store"} onClick={() => nav("store")} color={T.gold} badge={!isPremium ? "NEW" : undefined} />
          <SidebarItem icon="📈" label="Market" active={page==="market"} onClick={() => nav("market")} color={T.teal} />

          <SectionLabel>Combat</SectionLabel>
          <SidebarItem icon="⚔️" label="Combat" active={page==="combat"} onClick={() => nav("combat")} color={T.danger} badge={`${skills.combat.level}`} />

          <SectionLabel>Non-Combat</SectionLabel>
          <SidebarItem icon="⛏️" label="Mining" active={page==="mining"} onClick={() => nav("mining")} color={SKILLS_CONFIG.mining.color} badge={`${skills.mining.level}`} indent />
          <SidebarItem icon="🪓" label="Woodcutting" active={page==="woodcutting"} onClick={() => nav("woodcutting")} color={SKILLS_CONFIG.woodcutting.color} badge={`${skills.woodcutting.level}`} indent />
          <SidebarItem icon="🎣" label="Fishing" active={page==="fishing"} onClick={() => nav("fishing")} color={SKILLS_CONFIG.fishing.color} badge={`${skills.fishing.level}`} indent />

          <SectionLabel>Artisan</SectionLabel>
          <SidebarItem icon="🔨" label="Smithing" active={page==="smithing"} onClick={() => nav("smithing")} color={SKILLS_CONFIG.smithing.color} badge={`${skills.smithing.level}`} indent />
          <SidebarItem icon="🍳" label="Cooking" active={page==="cooking"} onClick={() => nav("cooking")} color={SKILLS_CONFIG.cooking.color} badge={`${skills.cooking.level}`} indent />
          <SidebarItem icon="🧪" label="Alchemy" active={page==="alchemy"} onClick={() => nav("alchemy")} color={SKILLS_CONFIG.alchemy.color} badge={`${skills.alchemy.level}`} indent />

          <div style={{ flex: 1 }} />
          <div style={{ borderTop: `1px solid ${T.sidebarBorder}`, margin: "8px 0", padding: "8px 0 0" }}>
            <SidebarItem icon="💬" label="Chat" active={page==="chat"} onClick={() => nav("chat")} color={T.teal} badge={unreadChat > 0 ? `${unreadChat}` : undefined} />
            <SidebarItem icon="🏰" label={myClan ? `[${myClan.tag}] Clan` : "Clans"} active={page==="clan"} onClick={() => nav("clan")} color={T.purple} badge={myClan ? undefined : "Join"} />
            <SidebarItem icon="🏆" label="Leaderboard" active={page==="leaderboard"} onClick={() => nav("leaderboard")} color={T.gold} />
            <SidebarItem icon="📜" label="Activity Log" active={page==="log"} onClick={() => nav("log")} color={T.textDim} />
          </div>
        </nav>

        {/* Account section */}
        <div style={{ padding: "10px 14px", borderTop: `1px solid ${T.sidebarBorder}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
            <div style={{
              width: 28, height: 28, borderRadius: 99,
              background: account.isGuest ? T.bar : T.accent + "25",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 13,
            }}>
              {account.isGuest ? "👤" : "⚔️"}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: T.white, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {account.isGuest ? "Guest" : account.displayName}
              </div>
              <div style={{ fontSize: 9, color: T.textDim, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {account.email ? account.email : lastSaved ? `Saved ${lastSaved.toLocaleTimeString()}` : "Not saved yet"}
              </div>
            </div>
            <div onClick={onLogout} title="Logout" style={{
              width: 24, height: 24, borderRadius: 4,
              background: T.dangerMuted, display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer", fontSize: 11,
            }}>🚪</div>
          </div>
        </div>
      </aside>

      {/* ═══ MAIN PANEL ═══ */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", minWidth: 0 }}>

        {/* ─── HEADER BAR ─── */}
        <header style={{
          height: 52, flexShrink: 0,
          background: T.header, borderBottom: `1px solid ${T.headerBorder}`,
          padding: isMobile ? "0 12px" : "0 24px", display: "flex", alignItems: "center", gap: isMobile ? 10 : 20,
        }}>
          {/* Mobile hamburger */}
          {isMobile && (
            <div onClick={() => setMobileNav(true)} style={{
              width: 36, height: 36, borderRadius: 8, background: T.accent + "15",
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer", fontSize: 18, flexShrink: 0,
            }}>☰</div>
          )}
          {/* HP */}
          <div style={{ width: isMobile ? 100 : 160 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, fontWeight: 700, color: T.danger, marginBottom: 3 }}>
              <span>❤️ HP</span><span>{player.hp} / {player.maxHp}</span>
            </div>
            <div style={{ height: 5, background: T.dangerMuted, borderRadius: 99, overflow: "hidden" }}>
              <div style={{ width: `${(player.hp / player.maxHp) * 100}%`, height: "100%", background: T.danger, borderRadius: 99, transition: "width 0.3s" }} />
            </div>
          </div>
          {/* MP */}
          <div style={{ width: isMobile ? 80 : 130 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, fontWeight: 700, color: T.info, marginBottom: 3 }}>
              <span>💧 MP</span><span>{player.mp} / {player.maxMp}</span>
            </div>
            <div style={{ height: 5, background: T.infoMuted, borderRadius: 99, overflow: "hidden" }}>
              <div style={{ width: `${(player.mp / player.maxMp) * 100}%`, height: "100%", background: T.info, borderRadius: 99, transition: "width 0.3s" }} />
            </div>
          </div>

          <div style={{ flex: 1 }} />

          {/* Buff pill */}
          {!isMobile && <Badge color={T.purple}>✨ ATK Elixir 45s</Badge>}

          {/* Combat stats */}
          <div style={{ display: "flex", gap: isMobile ? 8 : 14, fontSize: 12, fontWeight: 600 }}>
            <span style={{ color: T.textSec }}>ATK <span style={{ color: T.danger }}>{playerAtk}</span></span>
            <span style={{ color: T.textSec }}>DEF <span style={{ color: T.info }}>{playerDef}</span></span>
          </div>
        </header>

        {/* ─── ACTIVITY BAR ─── */}
        {(activeGather || activeCombat || activeCraft) && (() => {
          if (activeCombat && combatState) {
            const m = activeCombat;
            const hpPct = (combatState.monsterHp / combatState.monsterMaxHp) * 100;
            return (
              <div style={{
                height: 56, flexShrink: 0, padding: isMobile ? "0 12px" : "0 24px",
                background: `${T.danger}06`,
                borderBottom: `1px solid ${T.danger}25`,
                display: "flex", alignItems: "center", gap: isMobile ? 8 : 14,
              }}>
                <span style={{ fontSize: 22 }}>{m.emoji}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: T.danger }}>⚔️ Combat</span>
                    <span style={{ fontSize: 11, color: T.textSec }}>—</span>
                    <span style={{ fontSize: 12, fontWeight: 600, color: T.white }}>{m.name}</span>
                    <span style={{ fontSize: 10, color: T.textDim }}>Lv {m.lvl}</span>
                  </div>
                  <ProgressBar value={combatState.monsterHp} max={combatState.monsterMaxHp} color={T.danger} height={5} animate />
                </div>
                <div style={{ textAlign: "right", marginRight: 8 }}>
                  <div style={{ fontSize: 10, color: T.textDim }}>Monster HP</div>
                  <div style={{ fontSize: 13, fontWeight: 800, color: T.danger }}>{combatState.monsterHp}/{combatState.monsterMaxHp}</div>
                </div>
                <Btn color={T.danger} small onClick={stopCombat}>Flee</Btn>
              </div>
            );
          }
          if (activeCraft) {
            const { skillId, recipe, remaining } = activeCraft;
            const cfg = SKILLS_CONFIG[skillId];
            return (
              <div style={{
                height: 52, flexShrink: 0, padding: isMobile ? "0 12px" : "0 24px",
                background: `${cfg.color}06`,
                borderBottom: `1px solid ${cfg.color}25`,
                display: "flex", alignItems: "center", gap: 14,
              }}>
                <span style={{ fontSize: 20 }}>{cfg.icon}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: cfg.color }}>{cfg.name}</span>
                    <span style={{ fontSize: 11, color: T.textSec }}>—</span>
                    <span style={{ fontSize: 12, fontWeight: 600, color: T.text }}>{recipe.emoji} {recipe.name}</span>
                    {remaining > 0 && <span style={{ fontSize: 10, color: T.textDim }}>({remaining + 1} left)</span>}
                  </div>
                  <ProgressBar value={craftProgress} max={100} color={cfg.color} height={5} animate />
                </div>
                <div style={{ textAlign: "right", marginRight: 8 }}>
                  <div style={{ fontSize: 10, color: T.textDim }}>In Bank</div>
                  <div style={{ fontSize: 14, fontWeight: 800, color: T.white }}>{inventory[recipe.name] || 0}</div>
                </div>
                <Btn color={T.danger} small onClick={stopCrafting}>Stop</Btn>
              </div>
            );
          }
          if (activeGather) {
          const { skillId, node } = activeGather;
          const cfg = SKILLS_CONFIG[skillId];
          return (
            <div style={{
              height: 52, flexShrink: 0, padding: isMobile ? "0 12px" : "0 24px",
              background: `${cfg.color}06`,
              borderBottom: `1px solid ${cfg.color}25`,
              display: "flex", alignItems: "center", gap: 14,
            }}>
              <span style={{ fontSize: 20 }}>{cfg.icon}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: cfg.color }}>{cfg.name}</span>
                  <span style={{ fontSize: 11, color: T.textSec }}>—</span>
                  <span style={{ fontSize: 12, fontWeight: 600, color: T.text }}>{node.emoji} {node.name}</span>
                  <span style={{ fontSize: 10, color: T.textDim }}>({(node.time/1000).toFixed(1)}s)</span>
                </div>
                <ProgressBar value={gatherProgress} max={100} color={cfg.color} height={5} animate />
              </div>
              <div style={{ textAlign: "right", marginRight: 8 }}>
                <div style={{ fontSize: 10, color: T.textDim }}>In Bank</div>
                <div style={{ fontSize: 14, fontWeight: 800, color: T.white }}>{inventory[node.item] || 0}</div>
              </div>
              <Btn color={T.danger} small onClick={stopGathering}>Stop</Btn>
            </div>
          );
          }
          return null;
        })()}

        {/* ─── PAGE CONTENT ─── */}
        <div style={{ flex: 1, overflowY: "auto", padding: isMobile ? 12 : 24 }}>

          {/* ════ SKILLS PAGE ════ */}
          {page === "skills" && (() => {
            const groups = [
              { label: "Combat", ids: SKILL_IDS.filter(id => SKILLS_CONFIG[id].type === "combat") },
              { label: "Gathering", ids: SKILL_IDS.filter(id => SKILLS_CONFIG[id].type === "gathering") },
              { label: "Artisan", ids: SKILL_IDS.filter(id => SKILLS_CONFIG[id].type === "artisan") },
            ];
            return (
              <div>
                <PageTitle icon="📊" title="Skills Overview" subtitle={`Total Level: ${totalLevel}  •  Combat Level: ${combatLvl}`} />

                {/* Compact total level bar */}
                <Card style={{ marginBottom: 20, padding: "14px 16px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 22 }}>🏆</span>
                      <div>
                        <div style={{ fontSize: 11, color: T.textDim, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>Total Level</div>
                        <div style={{ fontSize: 22, fontWeight: 900, color: T.white, lineHeight: 1 }}>{totalLevel}</div>
                      </div>
                    </div>
                    <div style={{ height: 36, width: 1, background: T.divider }} />
                    <div style={{ flex: 1, display: "flex", gap: 16, flexWrap: "wrap" }}>
                      {SKILL_IDS.map(id => {
                        const cfg = SKILLS_CONFIG[id];
                        const lvl = skills[id].level;
                        return (
                          <div key={id} onClick={() => nav(id === "magic" ? "skills" : id)} style={{ display: "flex", alignItems: "center", gap: 5, cursor: "pointer" }}>
                            <span style={{ fontSize: 14 }}>{cfg.icon}</span>
                            <span style={{ fontSize: 12, fontWeight: 700, color: cfg.color }}>{lvl}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </Card>

                {/* Skill groups */}
                {groups.map(group => (
                  <div key={group.label} style={{ marginBottom: 20 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: T.textDim, textTransform: "uppercase", letterSpacing: 1.2, marginBottom: 10 }}>{group.label} Skills</div>
                    <div style={{ display: "grid", gridTemplateColumns: `repeat(auto-fill, minmax(${isMobile ? "100%" : "280px"}, 1fr))`, gap: 10 }}>
                      {group.ids.map(id => {
                        const sk = skillFor(id);
                        const pct = sk.xpMax > 0 ? Math.min((sk.xp / sk.xpMax) * 100, 100) : 0;
                        return (
                          <Card key={id} onClick={() => nav(id === "magic" ? "skills" : id)} style={{ cursor: "pointer", position: "relative", overflow: "hidden" }}>
                            {/* Subtle background level indicator */}
                            <div style={{
                              position: "absolute", right: -10, top: -10,
                              fontSize: 72, fontWeight: 900, color: sk.color,
                              opacity: 0.04, lineHeight: 1, pointerEvents: "none",
                            }}>{sk.level}</div>

                            <div style={{ position: "relative" }}>
                              {/* Top row: icon, name, level badge */}
                              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
                                <div style={{
                                  width: 40, height: 40, borderRadius: T.rs,
                                  background: sk.bg,
                                  display: "flex", alignItems: "center", justifyContent: "center",
                                  fontSize: 20,
                                }}>{sk.icon}</div>
                                <div style={{ flex: 1 }}>
                                  <div style={{ fontSize: 14, fontWeight: 700, color: T.white }}>{sk.name}</div>
                                  <div style={{ fontSize: 11, color: T.textDim, marginTop: 2 }}>{sk.desc}</div>
                                </div>
                                {/* Level badge */}
                                <div style={{
                                  display: "flex", flexDirection: "column", alignItems: "center",
                                  background: sk.bg,
                                  borderRadius: T.rs, padding: "6px 10px",
                                  minWidth: 44,
                                }}>
                                  <div style={{ fontSize: 9, fontWeight: 700, color: sk.color, textTransform: "uppercase", letterSpacing: 0.5, lineHeight: 1 }}>Level</div>
                                  <div style={{ fontSize: 18, fontWeight: 900, color: sk.color, lineHeight: 1.2 }}>{sk.level}</div>
                                </div>
                              </div>

                              {/* XP progress bar */}
                              <div style={{ marginTop: 4 }}>
                                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                                  <span style={{ fontSize: 10, fontWeight: 600, color: T.textDim }}>XP</span>
                                  <span style={{ fontSize: 10, fontWeight: 600, color: T.textSec }}>{fmt(sk.xp)} / {fmt(sk.xpMax)} ({Math.floor(pct)}%)</span>
                                </div>
                                <div style={{ width: "100%", height: 8, background: T.bar, borderRadius: 99, overflow: "hidden" }}>
                                  <div style={{
                                    height: "100%", borderRadius: 99,
                                    width: `${pct}%`,
                                    background: `linear-gradient(90deg, ${sk.color}bb, ${sk.color})`,
                                    transition: "width 0.4s cubic-bezier(.4,0,.2,1)",
                                    boxShadow: `0 0 8px ${sk.color}40`,
                                  }} />
                                </div>
                                <div style={{ fontSize: 10, color: T.textDim, marginTop: 4, textAlign: "right" }}>
                                  {fmt(sk.xpMax - sk.xp)} XP to level {sk.level + 1}
                                </div>
                              </div>
                            </div>
                          </Card>
                        );
                      })}
                    </div>
                  </div>
                ))}

                {/* Test buttons - add XP to see leveling */}
                <Card style={{ marginTop: 8 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: T.white, marginBottom: 10 }}>🧪 Test — Add XP</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {SKILL_IDS.map(id => {
                      const cfg = SKILLS_CONFIG[id];
                      return (
                        <Btn key={id} small color={cfg.color} onClick={() => addXp(id, 15 + Math.floor(Math.random() * 20))}>
                          {cfg.icon} +XP
                        </Btn>
                      );
                    })}
                  </div>
                  <div style={{ fontSize: 11, color: T.textDim, marginTop: 8 }}>Click to add random XP to each skill. Watch the bars fill and levels go up!</div>
                </Card>

                {/* Stats summary */}
                <Card style={{ marginTop: 12 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: T.white, marginBottom: 8 }}>📈 Statistics</div>
                  <div style={{ display: "grid", gridTemplateColumns: `repeat(auto-fill, minmax(${isMobile ? "140px" : "180px"}, 1fr))`, gap: 0 }}>
                    <StatRow label="Monsters Killed" value={String(combatStats.kills)} color={T.danger} />
                    <StatRow label="Items Gathered" value={String(stats.gathered)} color={T.success} />
                    <StatRow label="Items Crafted" value={String(craftStats.crafted)} color={T.warning} />
                    <StatRow label="Gold Earned" value={fmt(gold)} color={T.gold} />
                  </div>
                </Card>
              </div>
            );
          })()}

          {/* ════ QUESTS PAGE ════ */}
          {page === "quests" && (() => {
            const [qTab, setQTab] = [isPremium ? "all" : "free", (v) => {}]; // simplified — use state below
            const renderQuest = (q, isPrem) => {
              const progress = questProgress[q.id] || 0;
              const pct = Math.min(100, (progress / q.target) * 100);
              const done = progress >= q.target;
              const claimed = !!questsClaimed[q.id];
              const locked = isPrem && !isPremium;
              const diffLabels = ["Easy", "Medium", "Hard", "Elite"];
              const diffColors = [T.success, T.warning, T.orange, T.danger];
              return (
                <Card key={q.id} style={{ opacity: locked ? 0.5 : 1, position: "relative" }}>
                  {locked && (
                    <div style={{ position: "absolute", inset: 0, borderRadius: T.r, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 2, flexDirection: "column", gap: 6 }}>
                      <span style={{ fontSize: 24 }}>🔒</span>
                      <span style={{ fontSize: 11, fontWeight: 700, color: T.gold }}>Premium Required</span>
                    </div>
                  )}
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                    <div style={{ width: 40, height: 40, borderRadius: T.rs, background: isPrem ? T.gold + "15" : (claimed ? T.success + "15" : T.bgDeep), display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, border: `1px solid ${isPrem ? T.gold + "30" : claimed ? T.success + "30" : T.divider}` }}>
                      {claimed ? "✅" : q.icon}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <span style={{ fontSize: 13, fontWeight: 700, color: claimed ? T.success : T.white }}>{q.verb} {q.target} {q.unit}</span>
                        <Badge color={diffColors[q.diff]}>{diffLabels[q.diff]}</Badge>
                        {isPrem && <Badge color={T.gold}>💎 Premium</Badge>}
                      </div>
                      <div style={{ fontSize: 11, color: T.textDim, marginTop: 2 }}>
                        {q.skill ? SKILLS_CONFIG[q.skill]?.name : "Any skill"} • {q.gold > 0 && <span style={{ color: T.gold }}>+{q.gold}g </span>}{q.xp > 0 && <span style={{ color: T.success }}>+{q.xp} XP </span>}{q.rewardItem && <span style={{ color: T.info }}>+{ITEMS[q.rewardItem]?.emoji} {q.rewardItem}</span>}
                      </div>
                    </div>
                    {done && !claimed && !locked && (
                      <Btn color={T.success} small onClick={() => claimQuest(q)}>Claim!</Btn>
                    )}
                    {claimed && <span style={{ fontSize: 10, fontWeight: 700, color: T.success }}>CLAIMED</span>}
                  </div>
                  {/* Progress bar */}
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ width: "100%", height: 6, background: T.bar, borderRadius: 99, overflow: "hidden" }}>
                        <div style={{ width: `${pct}%`, height: "100%", borderRadius: 99, background: claimed ? T.success : done ? T.gold : isPrem ? T.gold : T.accent, transition: "width 0.3s" }} />
                      </div>
                    </div>
                    <span style={{ fontSize: 11, fontWeight: 700, color: done ? T.success : T.textSec, minWidth: 50, textAlign: "right" }}>{Math.min(progress, q.target)}/{q.target}</span>
                  </div>
                </Card>
              );
            };

            return (
              <div>
                <PageTitle icon="📋" title="Daily Quests" subtitle={`${questsDone}/${questsTotal} complete • Resets at midnight`} />

                {/* Premium banner */}
                <Card style={{ marginBottom: 16, padding: "12px 16px", background: isPremium ? T.gold + "08" : T.bgDeep, border: `1px solid ${isPremium ? T.gold + "30" : T.divider}` }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: isPremium ? T.gold : T.white }}>
                        {isPremium ? "💎 Premium Active" : "💎 Upgrade to Premium"}
                      </div>
                      <div style={{ fontSize: 11, color: T.textDim, marginTop: 2 }}>
                        {isPremium ? "You have access to 4 bonus premium quests with better rewards!" : "Unlock 4 bonus daily quests with 2-3× rewards + item drops!"}
                      </div>
                    </div>
                    <Btn color={T.gold} small onClick={() => setIsPremium(p => !p)}>
                      {isPremium ? "Active ✓" : "Unlock 💎"}
                    </Btn>
                  </div>
                </Card>

                {/* Free quests */}
                <div style={{ fontSize: 12, fontWeight: 700, color: T.white, marginBottom: 8 }}>📋 Daily Quests ({dailyQuests.free?.filter(q => questsClaimed[q.id]).length}/{dailyQuests.free?.length})</div>
                <div style={{ display: "grid", gridTemplateColumns: `repeat(auto-fill, minmax(${isMobile ? "100%" : "340px"}, 1fr))`, gap: 10, marginBottom: 20 }}>
                  {dailyQuests.free?.map(q => renderQuest(q, false))}
                </div>

                {/* Premium quests */}
                <div style={{ fontSize: 12, fontWeight: 700, color: T.gold, marginBottom: 8 }}>💎 Premium Quests ({isPremium ? `${dailyQuests.premium?.filter(q => questsClaimed[q.id]).length}/${dailyQuests.premium?.length}` : "Locked"})</div>
                <div style={{ display: "grid", gridTemplateColumns: `repeat(auto-fill, minmax(${isMobile ? "100%" : "340px"}, 1fr))`, gap: 10 }}>
                  {dailyQuests.premium?.map(q => renderQuest(q, true))}
                </div>
              </div>
            );
          })()}

          {/* ════ COMBAT PAGE ════ */}
          {page === "combat" && (() => {
            const sk = skillFor("combat");
            const isInCombat = !!activeCombat && !!combatState;
            return (
              <div>
                <PageTitle icon="⚔️" title="Combat" subtitle={`Level ${combatLvl}  •  ATK ${playerAtk}  •  DEF ${playerDef}`} />

                {/* Solo / Party toggle */}
                <div style={{ display: "flex", gap: 4, marginBottom: 16, background: T.bgDeep, borderRadius: T.r, padding: 3, width: "fit-content" }}>
                  {[{ id: "solo", label: "⚔️ Solo", color: T.danger }, { id: "party", label: "🛡️ Party (1-5)", color: T.pink }].map(m => (
                    <div key={m.id} onClick={() => { setCombatMode(m.id); if (m.id === "party") { fetchMyParty(); fetchPartyList(); } }} style={{
                      padding: "7px 16px", borderRadius: T.rs,
                      background: combatMode === m.id ? m.color + "20" : "transparent",
                      color: combatMode === m.id ? m.color : T.textDim,
                      fontSize: 12, fontWeight: 700, cursor: "pointer", transition: "all 0.12s",
                      border: `1px solid ${combatMode === m.id ? m.color + "40" : "transparent"}`,
                    }}>{m.label}</div>
                  ))}
                </div>

                {/* Combat XP bar */}
                <div style={{ maxWidth: 400, marginBottom: 20 }}>
                  <ProgressBar value={sk.xp} max={sk.xpMax} color={sk.color} showLabel />
                  <div style={{ fontSize: 10, color: T.textDim, marginTop: 4, textAlign: "right" }}>
                    {fmt(sk.xpMax - sk.xp)} XP to level {sk.level + 1}
                  </div>
                </div>

                {/* ═══ SOLO MODE ═══ */}
                {combatMode === "solo" && (<>
                {/* ── Active Fight Panel ── */}
                {isInCombat && (() => {
                  const m = activeCombat;
                  const cs = combatState;
                  const playerHpPct = (player.hp / player.maxHp) * 100;
                  const monsterHpPct = (cs.monsterHp / cs.monsterMaxHp) * 100;
                  const pAtkPct = (cs.pElapsed / 2000) * 100;
                  const mAtkPct = (cs.mElapsed / m.speed) * 100;
                  return (
                    <Card glowColor={T.danger} style={{ marginBottom: 20, padding: 20 }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 30, flexWrap: "wrap" }}>
                        {/* Player side */}
                        <div style={{ flex: "1 1 200px", maxWidth: 260 }}>
                          <div style={{ textAlign: "center", marginBottom: 10 }}>
                            <span style={{ fontSize: 36 }}>🧑‍⚔️</span>
                            <div style={{ fontSize: 13, fontWeight: 700, color: T.white, marginTop: 4 }}>You</div>
                            <div style={{ fontSize: 11, color: T.textSec }}>ATK {playerAtk} • DEF {playerDef}</div>
                          </div>
                          {/* Player HP */}
                          <div style={{ marginBottom: 8 }}>
                            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, fontWeight: 700, color: T.danger, marginBottom: 3 }}>
                              <span>HP</span><span>{player.hp}/{player.maxHp}</span>
                            </div>
                            <div style={{ height: 8, background: T.bar, borderRadius: 99, overflow: "hidden" }}>
                              <div style={{ width: `${playerHpPct}%`, height: "100%", background: player.hp < player.maxHp * 0.3 ? "#ef4444" : T.danger, borderRadius: 99, transition: "width 0.15s" }} />
                            </div>
                          </div>
                          {/* Player atk timer */}
                          <div>
                            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: T.textDim, marginBottom: 2 }}>
                              <span>Attack</span><span>2.0s</span>
                            </div>
                            <div style={{ height: 4, background: T.bar, borderRadius: 99, overflow: "hidden" }}>
                              <div style={{ width: `${pAtkPct}%`, height: "100%", background: T.warning, borderRadius: 99, transition: "width 0.1s linear" }} />
                            </div>
                          </div>
                        </div>

                        {/* VS */}
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                          <div style={{ fontSize: 28, fontWeight: 900, color: T.danger }}>⚔️</div>
                          <div style={{ fontSize: 10, fontWeight: 700, color: T.textDim }}>VS</div>
                        </div>

                        {/* Monster side */}
                        <div style={{ flex: "1 1 200px", maxWidth: 260 }}>
                          <div style={{ textAlign: "center", marginBottom: 10 }}>
                            <span style={{ fontSize: 36 }}>{m.emoji}</span>
                            <div style={{ fontSize: 13, fontWeight: 700, color: T.white, marginTop: 4 }}>{m.name}</div>
                            <div style={{ fontSize: 11, color: T.textSec }}>ATK {m.atk} • DEF {m.def}</div>
                          </div>
                          {/* Monster HP */}
                          <div style={{ marginBottom: 8 }}>
                            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, fontWeight: 700, color: T.danger, marginBottom: 3 }}>
                              <span>HP</span><span>{cs.monsterHp}/{cs.monsterMaxHp}</span>
                            </div>
                            <div style={{ height: 8, background: T.bar, borderRadius: 99, overflow: "hidden" }}>
                              <div style={{ width: `${monsterHpPct}%`, height: "100%", background: T.danger, borderRadius: 99, transition: "width 0.15s" }} />
                            </div>
                          </div>
                          {/* Monster atk timer */}
                          <div>
                            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: T.textDim, marginBottom: 2 }}>
                              <span>Attack</span><span>{(m.speed/1000).toFixed(1)}s</span>
                            </div>
                            <div style={{ height: 4, background: T.bar, borderRadius: 99, overflow: "hidden" }}>
                              <div style={{ width: `${mAtkPct}%`, height: "100%", background: T.purple, borderRadius: 99, transition: "width 0.1s linear" }} />
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Combat stats bar */}
                      <div style={{ display: "flex", justifyContent: "center", gap: 20, marginTop: 16, fontSize: 11, color: T.textSec }}>
                        <span>Kills: <span style={{ color: T.white, fontWeight: 700 }}>{combatStats.kills}</span></span>
                        <span>Deaths: <span style={{ color: T.danger, fontWeight: 700 }}>{combatStats.deaths}</span></span>
                        <span>Damage: <span style={{ color: T.orange, fontWeight: 700 }}>{fmt(combatStats.totalDamage)}</span></span>
                        <span>Gold: <span style={{ color: T.gold, fontWeight: 700 }}>{fmt(gold)}</span></span>
                      </div>

                      {/* Drops info */}
                      <div style={{ textAlign: "center", marginTop: 12, fontSize: 11, color: T.textDim }}>
                        Drops: {m.drops.map(d => `${ITEMS[d.item]?.emoji || ""} ${d.item} (${d.pct}%)`).join("  •  ")}
                      </div>

                      {/* Flee */}
                      <div style={{ textAlign: "center", marginTop: 14 }}>
                        <Btn color={T.danger} small onClick={stopCombat}>🏃 Flee</Btn>
                      </div>
                    </Card>
                  );
                })()}

                {/* ── Monster Selection ── */}
                <div style={{ fontSize: 13, fontWeight: 700, color: T.white, marginBottom: 10 }}>
                  {isInCombat ? "Switch Target" : "Select a Monster"}
                </div>
                <div style={{ display: "grid", gridTemplateColumns: `repeat(auto-fill, minmax(${isMobile ? "100%" : "300px"}, 1fr))`, gap: 10 }}>
                  {MONSTERS.map((m, i) => {
                    const locked = combatLvl < m.lvl;
                    const isActive = activeCombat?.name === m.name;
                    const canWin = playerAtk > m.def;
                    return (
                      <Card key={i}
                        glowColor={isActive ? T.danger : undefined}
                        onClick={locked ? undefined : () => startCombat(m)}
                        style={{
                          opacity: locked ? 0.3 : 1,
                          cursor: locked ? "default" : "pointer",
                          background: isActive ? `${T.danger}0a` : T.card,
                        }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
                          <div style={{
                            width: 44, height: 44, borderRadius: T.r,
                            background: isActive ? `${T.danger}20` : T.dangerMuted,
                            display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22,
                            border: isActive ? `1px solid ${T.danger}30` : "none",
                          }}>{m.emoji}</div>
                          <div style={{ flex: 1 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                              <span style={{ fontSize: 14, fontWeight: 700, color: isActive ? T.danger : T.white }}>{m.name}</span>
                              <Badge color={locked ? T.danger : T.textDim}>Lv {m.lvl}</Badge>
                              {locked && <span style={{ fontSize: 10, color: T.danger }}>🔒</span>}
                              {isActive && <Badge color={T.danger}>Fighting</Badge>}
                            </div>
                            <div style={{ display: "flex", gap: 10, fontSize: 11, color: T.textSec, marginTop: 3 }}>
                              <span>❤️ {m.hp}</span>
                              <span>⚔️ {m.atk}</span>
                              <span>🛡️ {m.def}</span>
                              <span>⏱ {(m.speed/1000).toFixed(1)}s</span>
                            </div>
                          </div>
                          {/* Threat indicator */}
                          {!locked && (
                            <div style={{ textAlign: "right" }}>
                              <div style={{ fontSize: 10, color: T.textDim, fontWeight: 600 }}>THREAT</div>
                              <div style={{
                                fontSize: 11, fontWeight: 700,
                                color: !canWin ? T.danger : m.atk > playerDef * 2 ? T.orange : m.atk > playerDef ? T.warning : T.success,
                              }}>
                                {!canWin ? "Immune" : m.atk > playerDef * 2 ? "High" : m.atk > playerDef ? "Medium" : "Low"}
                              </div>
                            </div>
                          )}
                        </div>
                        <div style={{ display: "flex", gap: 10, fontSize: 11, color: T.textSec, marginBottom: 4 }}>
                          <span style={{ color: T.success }}>+{m.xpR} XP</span>
                          <span style={{ color: T.gold }}>+{m.goldR} Gold</span>
                        </div>
                        <div style={{ fontSize: 10.5, color: T.textDim }}>
                          Drops: {m.drops.map(d => `${ITEMS[d.item]?.emoji || ""} ${d.item} (${d.pct}%)`).join(", ")}
                        </div>
                      </Card>
                    );
                  })}
                </div>
                </>)}

                {/* ═══ PARTY MODE ═══ */}
                {combatMode === "party" && (() => {
                  const isDone = party && (party.status === "victory" || party.status === "defeated");
                  const isFighting = party?.status === "fighting";
                  const isWaiting = party?.status === "waiting";
                  const isLeader = party?.leader === account.username;

                  return (<div>
                    <Card style={{ marginBottom: 14, padding: "10px 14px", background: T.pink + "08", border: `1px solid ${T.pink}20` }}>
                      <div style={{ fontSize: 12, color: T.textSec, lineHeight: 1.6 }}>
                        <span style={{ fontWeight: 700, color: T.pink }}>Party Rules:</span>{" "}
                        Up to <b style={{ color: T.white }}>5 players</b>.
                        XP = <span style={{ color: T.warning, fontWeight: 700 }}>70%</span> base ÷ members.
                        Gold = <span style={{ color: T.gold, fontWeight: 700 }}>80%</span> base ÷ members.
                        Boss HP scales with size. Everyone rolls own drops.
                      </div>
                    </Card>

                    {(!party || isDone) && (
                      <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
                        {[{ id: "browse", label: "🔍 Browse" }, { id: "create", label: "✨ Create Party" }].map(t => (
                          <div key={t.id} onClick={() => { setPartyView(t.id); if (t.id === "browse") fetchPartyList(); }} style={{ padding: "6px 12px", borderRadius: T.rs, background: partyView === t.id ? T.pink + "20" : T.bgDeep, border: `1px solid ${partyView === t.id ? T.pink + "40" : T.divider}`, color: partyView === t.id ? T.pink : T.textSec, fontSize: 11, fontWeight: 600, cursor: "pointer" }}>{t.label}</div>
                        ))}
                      </div>
                    )}

                    {/* Browse */}
                    {(!party || isDone) && partyView === "browse" && (
                      <div>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
                          <span style={{ fontSize: 12, color: T.textSec }}>{partyList.filter(p => p.status === "waiting").length} open</span>
                          <Btn color={T.accent} small onClick={fetchPartyList} disabled={partyLoading}>🔄</Btn>
                        </div>
                        {partyList.filter(p => p.status === "waiting").length === 0 ? (
                          <Card style={{ textAlign: "center", padding: "32px 0" }}>
                            <div style={{ fontSize: 24, marginBottom: 6 }}>🛡️</div>
                            <div style={{ fontSize: 12, color: T.textDim }}>No open parties. Create one!</div>
                          </Card>
                        ) : (
                          <div style={{ display: "grid", gridTemplateColumns: `repeat(auto-fill, minmax(${isMobile ? "100%" : "300px"}, 1fr))`, gap: 10 }}>
                            {partyList.filter(p => p.status === "waiting").map((p, i) => (
                              <Card key={i}>
                                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                                  <div style={{ fontSize: 26 }}>{p.monsterEmoji}</div>
                                  <div style={{ flex: 1 }}>
                                    <div style={{ fontSize: 13, fontWeight: 700, color: T.white }}>{p.monsterName} {MONSTERS[p.monster]?.boss && <Badge color={T.pink}>BOSS</Badge>} <span style={{ color: T.textDim, fontWeight: 500 }}>Lv {p.monsterLvl}</span></div>
                                    <div style={{ fontSize: 11, color: T.textDim }}>Leader: {p.leader}</div>
                                  </div>
                                  <Badge color={T.pink}>{p.members?.length || 1}/5</Badge>
                                </div>
                                <div style={{ display: "flex", gap: 4, marginBottom: 8, flexWrap: "wrap" }}>
                                  {p.members?.map((mm, mi) => <span key={mi} style={{ fontSize: 10, padding: "2px 6px", borderRadius: 4, background: T.bgDeep, color: T.textSec }}>{mm.displayName}</span>)}
                                </div>
                                <Btn color={T.pink} small onClick={() => joinParty(p.id)} disabled={partyLoading || p.members?.length >= 5}>Join Party</Btn>
                              </Card>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Create */}
                    {(!party || isDone) && partyView === "create" && (
                      <div style={{ display: "grid", gridTemplateColumns: `repeat(auto-fill, minmax(${isMobile ? "100%" : "280px"}, 1fr))`, gap: 10 }}>
                        {MONSTERS.map((m, i) => {
                          const locked = combatLvl < m.lvl;
                          return (
                            <Card key={i} onClick={locked ? undefined : () => createParty(i)} style={{ cursor: locked ? "default" : "pointer", opacity: locked ? 0.3 : 1 }}>
                              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                <div style={{ fontSize: 24 }}>{m.emoji}</div>
                                <div style={{ flex: 1 }}>
                                  <div style={{ fontSize: 13, fontWeight: 700, color: T.white }}>{m.name} {m.boss && <Badge color={T.pink}>BOSS</Badge>}</div>
                                  <div style={{ fontSize: 11, color: T.textDim }}>Lv {m.lvl} • {m.hp} HP • {m.xpR} XP • {m.goldR}g</div>
                                </div>
                                {!locked && <Btn color={T.pink} small>Create</Btn>}
                              </div>
                            </Card>
                          );
                        })}
                      </div>
                    )}

                    {/* Active party */}
                    {party && (isWaiting || isFighting || isDone) && (partyView === "active" || isFighting) && (() => {
                      const m = MONSTERS[party.monster];
                      return (
                        <Card glowColor={isFighting ? T.pink : isDone ? (party.status === "victory" ? T.success : T.danger) : undefined} style={{ padding: 20 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
                            <div style={{ fontSize: 36 }}>{m.emoji}</div>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontSize: 16, fontWeight: 800, color: T.white }}>{m.name} {m.boss && <Badge color={T.pink}>BOSS</Badge>}</div>
                              <div style={{ fontSize: 12, color: T.textDim }}>Lv {m.lvl} • {party.members?.length || 1}/5 members</div>
                            </div>
                            <Badge color={isFighting ? T.danger : isDone ? (party.status === "victory" ? T.success : T.danger) : T.warning}>
                              {isWaiting ? "⏳ Waiting" : isFighting ? "⚔️ Fighting" : party.status === "victory" ? "🎉 Victory!" : "💀 Defeat"}
                            </Badge>
                          </div>
                          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 14 }}>
                            {party.members?.map((mem, mi) => (
                              <div key={mi} style={{ padding: "5px 10px", borderRadius: T.rs, background: mem.username === account.username ? T.accent + "15" : T.bgDeep, border: `1px solid ${mem.username === account.username ? T.accent + "30" : T.divider}`, fontSize: 11 }}>
                                <div style={{ fontWeight: 700, color: mem.username === party.leader ? T.gold : T.white }}>
                                  {mem.username === party.leader && "👑 "}{mem.displayName}
                                  {mem.username === account.username && <span style={{ color: T.accent }}> (you)</span>}
                                </div>
                                <div style={{ color: T.textDim, fontSize: 10 }}>ATK {mem.atk} DEF {mem.def}</div>
                              </div>
                            ))}
                            {isWaiting && party.members?.length < 5 && <div style={{ padding: "5px 10px", borderRadius: T.rs, border: `1px dashed ${T.divider}`, fontSize: 11, color: T.textDim, display: "flex", alignItems: "center" }}>Waiting...</div>}
                          </div>
                          {(isFighting || isDone) && party.monsterMaxHp && (
                            <div style={{ marginBottom: 14 }}>
                              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: T.textDim, marginBottom: 4 }}><span>{m.emoji} {m.name}</span><span>{Math.max(0, party.monsterHp || 0)}/{party.monsterMaxHp} HP</span></div>
                              <ProgressBar value={Math.max(0, party.monsterHp || 0)} max={party.monsterMaxHp} color={T.danger} height={10} />
                            </div>
                          )}
                          {isFighting && (
                            <div style={{ marginBottom: 14 }}>
                              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: T.textDim, marginBottom: 4 }}><span>🧑‍⚔️ Your HP</span><span>{player.hp}/{player.maxHp}</span></div>
                              <ProgressBar value={player.hp} max={player.maxHp} color={T.success} height={6} />
                            </div>
                          )}
                          {isWaiting && (
                            <div style={{ display: "flex", gap: 16, fontSize: 11, color: T.textSec, marginBottom: 14, padding: "8px 0", borderTop: `1px solid ${T.divider}`, borderBottom: `1px solid ${T.divider}` }}>
                              <span>Scaled HP: <b style={{ color: T.white }}>{Math.round(m.hp * (1 + (party.members.length - 1) * 0.6))}</b></span>
                              <span>XP each: <b style={{ color: T.success }}>~{Math.round(m.xpR * 0.7 / party.members.length)}</b></span>
                              <span>Gold each: <b style={{ color: T.gold }}>~{Math.round(m.goldR * 0.8 / party.members.length)}</b></span>
                            </div>
                          )}
                          {party.combatLog?.length > 0 && (
                            <div style={{ maxHeight: 150, overflowY: "auto", marginBottom: 14, padding: 8, background: T.bgDeep, borderRadius: T.rs, border: `1px solid ${T.divider}` }}>
                              {party.combatLog.map((entry, i) => (
                                <div key={i} style={{ fontSize: 11, color: entry.text.includes("VICTORY") ? T.success : entry.text.includes("DEFEAT") ? T.danger : T.textSec, padding: "2px 0" }}>{entry.text}</div>
                              ))}
                            </div>
                          )}
                          <div style={{ display: "flex", gap: 8 }}>
                            {isWaiting && isLeader && <Btn color={T.danger} onClick={startPartyFight}>⚔️ Start Fight!</Btn>}
                            {isWaiting && !isLeader && <span style={{ fontSize: 12, color: T.textDim, padding: "8px 0" }}>Waiting for leader...</span>}
                            {isWaiting && <Btn color={T.textDim} small onClick={leaveParty}>Leave</Btn>}
                            {isDone && <Btn color={T.pink} onClick={async () => { await leaveParty(); setPartyView("create"); }}>🛡️ New Party</Btn>}
                            {isFighting && isLeader && <Btn color={T.danger} small onClick={leaveParty}>🏃 Flee</Btn>}
                          </div>
                        </Card>
                      );
                    })()}
                  </div>);
                })()}

              </div>
            );
          })()}

          {/* ════ GATHERING PAGES ════ */}
          {["mining", "woodcutting", "fishing"].includes(page) && (() => {
            const sk = skillFor(page);
            const nodes = GATHER_NODES[page] || [];
            const isActiveSkill = activeGather?.skillId === page;
            return (
              <div>
                <PageTitle icon={sk.icon} title={sk.name} subtitle={`Level ${sk.level}`} />

                {/* Skill XP bar */}
                <div style={{ maxWidth: 400, marginBottom: 20 }}>
                  <ProgressBar value={sk.xp} max={sk.xpMax} color={sk.color} showLabel />
                  <div style={{ fontSize: 10, color: T.textDim, marginTop: 4, textAlign: "right" }}>
                    {fmt(sk.xpMax - sk.xp)} XP to level {sk.level + 1}
                  </div>
                </div>

                {/* Gathering stats row */}
                {isActiveSkill && (() => {
                  const totalSpeedPct = equipSpeedPct + getPetSpeedPct(activeGather.skillId);
                  const totalXpPct = equipXpPct + getPetXpPct(activeGather.skillId);
                  const speedMult = 1 + totalSpeedPct / 100;
                  const effTime = Math.max(500, Math.round(activeGather.node.time / speedMult));
                  const xpMult = 1 + totalXpPct / 100;
                  const effXp = Math.round(activeGather.node.xp * xpMult);
                  return (
                    <Card style={{ marginBottom: 14, padding: "10px 14px" }}>
                      <div style={{ display: "flex", gap: 20, fontSize: 12, flexWrap: "wrap" }}>
                        <div><span style={{ color: T.textDim }}>Gathering: </span><span style={{ color: sk.color, fontWeight: 700 }}>{activeGather.node.emoji} {activeGather.node.name}</span></div>
                        <div><span style={{ color: T.textDim }}>Rate: </span><span style={{ color: T.white, fontWeight: 700 }}>{(3600000 / effTime).toFixed(0)}/hr</span></div>
                        <div><span style={{ color: T.textDim }}>XP/hr: </span><span style={{ color: T.success, fontWeight: 700 }}>{fmt(Math.floor(effXp * 3600000 / effTime))}</span></div>
                        {totalSpeedPct > 0 && <div><span style={{ color: T.teal, fontWeight: 700 }}>⚡+{totalSpeedPct}%</span></div>}
                        {totalXpPct > 0 && <div><span style={{ color: T.gold, fontWeight: 700 }}>✨+{totalXpPct}%</span></div>}
                        {activePets.length > 0 && getPetSpeedPct(activeGather.skillId) > 0 && <div><span style={{ color: T.purple, fontWeight: 700 }}>🐾 {activePets.map(n => PETS[n]?.emoji).join("")}</span></div>}
                      </div>
                    </Card>
                  );
                })()}

                {/* Node grid */}
                <div style={{ display: "grid", gridTemplateColumns: `repeat(auto-fill, minmax(${isMobile ? "100%" : "300px"}, 1fr))`, gap: 10 }}>
                  {nodes.map((node, ni) => {
                    const locked = sk.level < node.lvl;
                    const isActive = isActiveSkill && activeGather.node.name === node.name;
                    const bankQty = inventory[node.item] || 0;
                    return (
                      <Card key={ni}
                        glowColor={isActive ? sk.color : undefined}
                        onClick={locked ? undefined : () => startGathering(page, node)}
                        style={{
                          opacity: locked ? 0.3 : 1,
                          cursor: locked ? "default" : "pointer",
                          background: isActive ? `${sk.color}0a` : T.card,
                        }}>

                        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                          {/* Node icon */}
                          <div style={{
                            width: 44, height: 44, borderRadius: T.rs,
                            background: isActive ? `${sk.color}20` : sk.bg,
                            display: "flex", alignItems: "center", justifyContent: "center",
                            fontSize: 22, border: isActive ? `1px solid ${sk.color}30` : "none",
                            transition: "all 0.2s",
                          }}>{node.emoji}</div>

                          {/* Node info */}
                          <div style={{ flex: 1 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                              <span style={{ fontSize: 14, fontWeight: 700, color: isActive ? sk.color : T.white }}>{node.name}</span>
                              <Badge color={locked ? T.danger : T.textDim}>Lv {node.lvl}</Badge>
                              {locked && <span style={{ fontSize: 10, color: T.danger }}>🔒</span>}
                              {isActive && <Badge color={sk.color}>Active</Badge>}
                            </div>
                            <div style={{ fontSize: 11.5, color: T.textSec, marginTop: 3, display: "flex", gap: 8 }}>
                              <span>{ITEMS[node.item]?.emoji} {node.item}</span>
                              <span style={{ color: T.textDim }}>•</span>
                              <span>⏱ {(node.time / 1000).toFixed(1)}s</span>
                              <span style={{ color: T.textDim }}>•</span>
                              <span style={{ color: T.success }}>+{node.xp} XP</span>
                            </div>
                          </div>

                          {/* Bank count */}
                          <div style={{ textAlign: "right", minWidth: 50 }}>
                            <div style={{ fontSize: 10, color: T.textDim, fontWeight: 600 }}>IN BANK</div>
                            <div style={{ fontSize: 16, fontWeight: 800, color: isActive ? sk.color : T.white }}>{bankQty}</div>
                          </div>
                        </div>

                        {/* Active progress bar */}
                        {isActive && (
                          <div style={{ marginTop: 10 }}>
                            <ProgressBar value={gatherProgress} max={100} color={sk.color} height={5} animate />
                          </div>
                        )}
                      </Card>
                    );
                  })}
                </div>
              </div>
            );
          })()}

          {/* ════ CRAFTING PAGES ════ */}
          {["smithing", "cooking", "alchemy"].includes(page) && (() => {
            const sk = skillFor(page);
            const recipes = RECIPES[page] || [];
            const isActiveSkill = activeCraft?.skillId === page;
            return (
              <div>
                <PageTitle icon={sk.icon} title={sk.name} subtitle={`Level ${sk.level}`} />

                {/* Skill XP bar */}
                <div style={{ maxWidth: 400, marginBottom: 20 }}>
                  <ProgressBar value={sk.xp} max={sk.xpMax} color={sk.color} showLabel />
                  <div style={{ fontSize: 10, color: T.textDim, marginTop: 4, textAlign: "right" }}>
                    {fmt(sk.xpMax - sk.xp)} XP to level {sk.level + 1}
                  </div>
                </div>

                {/* Active craft info */}
                {isActiveSkill && activeCraft && (() => {
                  const totalSpeedPct = equipSpeedPct + getPetSpeedPct(activeCraft.skillId);
                  const totalXpPct = equipXpPct + getPetXpPct(activeCraft.skillId);
                  const speedMult = 1 + totalSpeedPct / 100;
                  const effTime = Math.max(500, Math.round(activeCraft.recipe.time / speedMult));
                  const xpMult = 1 + totalXpPct / 100;
                  const effXp = Math.round(activeCraft.recipe.xp * xpMult);
                  return (
                    <Card style={{ marginBottom: 14, padding: "10px 14px" }}>
                      <div style={{ display: "flex", gap: 20, fontSize: 12, alignItems: "center", flexWrap: "wrap" }}>
                        <div><span style={{ color: T.textDim }}>Crafting: </span><span style={{ color: sk.color, fontWeight: 700 }}>{activeCraft.recipe.emoji} {activeCraft.recipe.name}</span></div>
                        {activeCraft.remaining > 0 && <div><span style={{ color: T.textDim }}>Queue: </span><span style={{ color: T.white, fontWeight: 700 }}>{activeCraft.remaining} remaining</span></div>}
                        <div><span style={{ color: T.textDim }}>XP/hr: </span><span style={{ color: T.success, fontWeight: 700 }}>{fmt(Math.floor(effXp * 3600000 / effTime))}</span></div>
                        {totalSpeedPct > 0 && <div><span style={{ color: T.teal, fontWeight: 700 }}>⚡+{totalSpeedPct}%</span></div>}
                        {totalXpPct > 0 && <div><span style={{ color: T.gold, fontWeight: 700 }}>✨+{totalXpPct}%</span></div>}
                        {activePets.length > 0 && getPetXpPct(activeCraft.skillId) > 0 && <div><span style={{ color: T.purple, fontWeight: 700 }}>🐾 {activePets.map(n => PETS[n]?.emoji).join("")}</span></div>}
                        <div style={{ marginLeft: "auto" }}><Btn color={T.danger} small onClick={stopCrafting}>Stop</Btn></div>
                      </div>
                    </Card>
                  );
                })()}

                {/* Recipe grid */}
                <div style={{ display: "grid", gridTemplateColumns: `repeat(auto-fill, minmax(${isMobile ? "100%" : "340px"}, 1fr))`, gap: 10 }}>
                  {recipes.map((r, ri) => {
                    const locked = sk.level < r.lvl;
                    const canCraft1 = !locked && canCraftRecipe(r);
                    const maxQty = maxCraftable(r);
                    const isActive = isActiveSkill && activeCraft?.recipe.name === r.name;
                    const bankQty = inventory[r.name] || 0;
                    return (
                      <Card key={ri}
                        glowColor={isActive ? sk.color : undefined}
                        style={{
                          opacity: locked ? 0.3 : 1,
                          background: isActive ? `${sk.color}0a` : T.card,
                        }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
                          <div style={{
                            width: 44, height: 44, borderRadius: T.rs,
                            background: isActive ? `${sk.color}20` : sk.bg,
                            display: "flex", alignItems: "center", justifyContent: "center",
                            fontSize: 21, border: isActive ? `1px solid ${sk.color}30` : "none",
                          }}>{r.emoji}</div>
                          <div style={{ flex: 1 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                              <span style={{ fontSize: 13, fontWeight: 700, color: isActive ? sk.color : T.white }}>{r.name}</span>
                              <Badge color={locked ? T.danger : T.textDim}>Lv {r.lvl}</Badge>
                              {locked && <span style={{ fontSize: 10, color: T.danger }}>🔒</span>}
                              {isActive && <Badge color={sk.color}>Crafting</Badge>}
                            </div>
                            <div style={{ fontSize: 12, color: T.gold, marginTop: 2, fontWeight: 600 }}>{r.desc}</div>
                          </div>
                          <div style={{ textAlign: "right" }}>
                            <div style={{ fontSize: 10, color: T.textDim, fontWeight: 600 }}>IN BANK</div>
                            <div style={{ fontSize: 15, fontWeight: 800, color: isActive ? sk.color : T.white }}>{bankQty}</div>
                          </div>
                        </div>

                        {/* Materials - live from inventory */}
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginBottom: 10 }}>
                          {r.mats.map((m, mi) => (
                            <MaterialTag key={mi} name={m.n} have={inventory[m.n] || 0} need={m.need} />
                          ))}
                        </div>

                        {/* Meta */}
                        <div style={{ display: "flex", gap: 12, fontSize: 11.5, color: T.textSec, marginBottom: 12 }}>
                          <span>⏱️ {(r.time / 1000).toFixed(1)}s</span>
                          <span style={{ color: T.success }}>+{r.xp} XP</span>
                          {maxQty > 0 && <span style={{ color: T.textDim }}>Can make: <span style={{ color: T.white, fontWeight: 700 }}>{maxQty}</span></span>}
                        </div>

                        {/* Active progress bar */}
                        {isActive && (
                          <div style={{ marginBottom: 10 }}>
                            <ProgressBar value={craftProgress} max={100} color={sk.color} height={5} animate />
                          </div>
                        )}

                        {/* Buttons */}
                        {!locked && (
                          <div style={{ display: "flex", gap: 6 }}>
                            <Btn color={sk.color} small disabled={!canCraft1} onClick={() => startCrafting(page, r, 1)}>Craft ×1</Btn>
                            <Btn color={sk.color} small disabled={maxQty < 5} onClick={() => startCrafting(page, r, 5)}>Craft ×5</Btn>
                            <Btn color={sk.color} small disabled={maxQty < 1} onClick={() => startCrafting(page, r, maxQty)}>All ({maxQty})</Btn>
                          </div>
                        )}
                      </Card>
                    );
                  })}
                </div>
              </div>
            );
          })()}

          {/* ════ INVENTORY ════ */}
          {page === "bank" && (() => {
            const filteredItems = getFilteredInv();
            const filters = [
              { id: "all", label: "All", icon: "📦", count: uniqueItems },
              { id: "equipment", label: "Gear", icon: "⚔️", count: getInvByCategory("equipment").length },
              { id: "material", label: "Materials", icon: "🪨", count: getInvByCategory("material").length },
              { id: "consumable", label: "Potions", icon: "🧪", count: getInvByCategory("consumable").length },
            ];
            const totalValue = Object.entries(inventory).reduce((a, [n, q]) => a + (ITEMS[n]?.sell || 0) * q, 0);
            const eqSlots = ["weapon", "shield", "armor", "helm", "ring", "tool", "amulet", "boots"];

            return (
              <div style={{ display: "flex", flexDirection: isMobile ? "column" : "row", gap: 14 }}>
                {/* ── LEFT: Main Inventory ── */}
                <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 12 }}>
                  {/* Header */}
                  <div style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    padding: "12px 16px", borderRadius: 12,
                    background: `linear-gradient(135deg, ${T.card}, ${T.bgDeep})`,
                    border: `1px solid ${T.cardBorder}`,
                  }}>
                    <div>
                      <div style={{ fontSize: 16, fontWeight: 800, color: T.white }}>🎒 Inventory</div>
                      <div style={{ fontSize: 10, color: T.textDim, marginTop: 1 }}>{uniqueItems} items  •  {totalItems} total</div>
                    </div>
                    <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
                      <div style={{ textAlign: "center" }}>
                        <div style={{ fontSize: 14, fontWeight: 800, color: T.gold }}>{fmt(gold)}</div>
                        <div style={{ fontSize: 8, color: T.textDim, textTransform: "uppercase", letterSpacing: 0.5 }}>Gold</div>
                      </div>
                      <div style={{ width: 1, height: 24, background: T.cardBorder }} />
                      <div style={{ textAlign: "center" }}>
                        <div style={{ fontSize: 14, fontWeight: 800, color: T.success }}>{fmt(totalValue)}</div>
                        <div style={{ fontSize: 8, color: T.textDim, textTransform: "uppercase", letterSpacing: 0.5 }}>Value</div>
                      </div>
                    </div>
                  </div>

                  {/* Quick Use Consumables */}
                  {getInvByCategory("consumable").length > 0 && (
                    <div style={{
                      borderRadius: 10, overflow: "hidden",
                      border: `1px solid ${T.cardBorder}`, background: T.card,
                    }}>
                      <div style={{
                        padding: "6px 14px",
                        background: `linear-gradient(90deg, ${T.teal}12, transparent)`,
                        borderBottom: `1px solid ${T.cardBorder}`,
                      }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: T.white }}>⚡ Quick Use</span>
                      </div>
                      <div style={{ padding: 8, display: "flex", flexWrap: "wrap", gap: 5 }}>
                        {getInvByCategory("consumable").map(([name, qty]) => {
                          const item = ITEMS[name];
                          return (
                            <div key={name} onClick={() => useConsumable(name)} style={{
                              display: "flex", alignItems: "center", gap: 5,
                              padding: "4px 8px", borderRadius: 6,
                              background: T.teal + "10", border: `1px solid ${T.teal}18`,
                              cursor: "pointer", transition: "all 0.12s",
                            }}>
                              <span style={{ fontSize: 13 }}>{item.emoji}</span>
                              <span style={{ fontSize: 10, fontWeight: 600, color: T.teal }}>{name}</span>
                              <span style={{ fontSize: 9, fontWeight: 800, color: T.white, background: T.teal + "25", padding: "0 5px", borderRadius: 3 }}>×{qty}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Search + Category Tabs */}
                  <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                    <div style={{
                      display: "flex", alignItems: "center", gap: 5,
                      background: T.card, borderRadius: 8, border: `1px solid ${T.cardBorder}`,
                      padding: "6px 10px", flex: "1 1 160px", minWidth: 120,
                    }}>
                      <span style={{ fontSize: 12, color: T.textDim }}>🔍</span>
                      <input
                        type="text" placeholder="Search..."
                        value={bankSearch} onChange={e => setBankSearch(e.target.value)}
                        style={{ background: "none", border: "none", outline: "none", color: T.text, fontFamily: FONT, fontSize: 11, width: "100%" }}
                      />
                      {bankSearch && <span onClick={() => setBankSearch("")} style={{ cursor: "pointer", fontSize: 10, color: T.textDim }}>✕</span>}
                    </div>
                    {filters.map(f => (
                      <div key={f.id} onClick={() => setBankFilter(f.id)} style={{
                        padding: "5px 10px", borderRadius: 7,
                        background: bankFilter === f.id ? T.accent + "18" : T.card,
                        border: `1px solid ${bankFilter === f.id ? T.accent + "40" : T.cardBorder}`,
                        color: bankFilter === f.id ? T.accent : T.textSec,
                        fontSize: 10, fontWeight: 600, cursor: "pointer",
                        display: "flex", alignItems: "center", gap: 3,
                      }}>
                        <span>{f.icon}</span>
                        <span>{f.label}</span>
                        <span style={{
                          fontSize: 9, fontWeight: 800,
                          color: bankFilter === f.id ? T.accent : T.textDim,
                          background: bankFilter === f.id ? T.accent + "15" : T.bar,
                          padding: "0 4px", borderRadius: 3,
                        }}>{f.count}</span>
                      </div>
                    ))}
                  </div>

                  {/* Item Grid */}
                  <div style={{
                    borderRadius: 10, overflow: "hidden",
                    border: `1px solid ${T.cardBorder}`, background: T.card, flex: 1,
                  }}>
                    {filteredItems.length === 0 ? (
                      <div style={{ textAlign: "center", padding: "40px 0", color: T.textDim }}>
                        <div style={{ fontSize: 30, marginBottom: 8, opacity: 0.4 }}>📦</div>
                        <div style={{ fontSize: 12, fontWeight: 600 }}>{bankSearch ? "No items match" : "Empty"}</div>
                      </div>
                    ) : (
                      <div style={{ padding: 8, display: "grid", gridTemplateColumns: `repeat(auto-fill, minmax(${isMobile ? "140px" : "200px"}, 1fr))`, gap: 5 }}>
                        {filteredItems.map(([name, qty]) => {
                          const item = ITEMS[name];
                          if (!item) return null;
                          const isEq = item.category === "equipment";
                          const isCon = item.category === "consumable";
                          const rc = isEq ? (RARITY_COLORS[item.rarity] || T.text) : isCon ? T.teal : T.textSoft;
                          const isWorn = isEq && Object.values(equipped).includes(name);

                          return (
                            <div key={name}
                              onClick={isEq ? () => equipItem(name) : isCon ? () => useConsumable(name) : undefined}
                              style={{
                                padding: "7px 9px", borderRadius: 8,
                                background: isWorn ? `${rc}12` : isEq ? `${rc}05` : T.bgDeep,
                                border: `1px solid ${isWorn ? rc + "40" : isEq ? rc + "18" : T.divider}`,
                                display: "flex", alignItems: "center", gap: 8,
                                cursor: (isEq || isCon) ? "pointer" : "default",
                                transition: "all 0.12s", position: "relative",
                              }}>
                              {isWorn && (
                                <div style={{
                                  position: "absolute", top: 2, right: 5,
                                  fontSize: 7, fontWeight: 800, color: T.success,
                                  background: T.successMuted, padding: "1px 4px", borderRadius: 3,
                                  textTransform: "uppercase", letterSpacing: 0.4,
                                }}>Worn</div>
                              )}
                              <div style={{
                                width: 32, height: 32, borderRadius: 6, flexShrink: 0,
                                background: isEq ? `${rc}12` : isCon ? T.tealMuted : T.card,
                                display: "flex", alignItems: "center", justifyContent: "center",
                                fontSize: 15, border: `1px solid ${isEq ? rc + "18" : "transparent"}`,
                              }}>
                                {item.emoji}
                              </div>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{
                                  fontSize: 11, fontWeight: 600, color: isEq ? rc : T.text,
                                  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                                }}>{name}</div>
                                <div style={{ fontSize: 9, color: T.textDim, marginTop: 1, display: "flex", gap: 3, flexWrap: "wrap" }}>
                                  {isEq && (
                                    <>
                                      {item.atk > 0 && <span style={{ color: T.danger }}>+{item.atk}ATK</span>}
                                      {item.def > 0 && <span style={{ color: T.accent }}>+{item.def}DEF</span>}
                                      {item.xpPct > 0 && <span style={{ color: T.gold }}>+{item.xpPct}%XP</span>}
                                      {item.speedPct > 0 && <span style={{ color: T.teal }}>+{item.speedPct}%SPD</span>}
                                    </>
                                  )}
                                  {isCon && <span style={{ color: T.teal }}>{item.desc}</span>}
                                  {!isEq && !isCon && <span>{item.sell > 0 ? `${item.sell}g` : item.desc}</span>}
                                </div>
                              </div>
                              <div style={{ textAlign: "right", flexShrink: 0 }}>
                                <div style={{ fontSize: 13, fontWeight: 800, color: T.white }}>{qty}</div>
                                {(isEq || isCon) && (
                                  <div style={{ fontSize: 7, fontWeight: 700, marginTop: 1, color: isEq ? rc : T.teal, textTransform: "uppercase" }}>
                                    {isEq ? "Equip" : "Use"}
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Test Tools */}
                  <div style={{
                    borderRadius: 10, overflow: "hidden",
                    border: `1px solid ${T.cardBorder}`, background: T.card,
                  }}>
                    <div style={{
                      padding: "6px 14px",
                      background: `linear-gradient(90deg, ${T.warning}12, transparent)`,
                      borderBottom: `1px solid ${T.cardBorder}`,
                    }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: T.white }}>🧪 Test Tools</span>
                    </div>
                    <div style={{ padding: 10, display: "flex", flexDirection: "column", gap: 10 }}>
                      <div>
                        <div style={{ fontSize: 10, fontWeight: 600, color: T.textSec, marginBottom: 4 }}>Add Items</div>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                          {[
                            ["Iron Ore", 5, T.warning], ["Gold Ore", 2, T.gold], ["Raw Trout", 3, T.info],
                            ["Beast Fang", 2, T.orange], ["Mana Crystal", 1, T.purple],
                            ["Iron Sword", 1, T.info], ["Gold Ring", 1, T.info],
                            ["HP Potion", 2, T.teal], ["ATK Elixir", 1, T.teal],
                            ["Dragon Scale", 1, T.orange],
                            ["Bronze Pickaxe", 1, T.success], ["Iron Pickaxe", 1, T.success],
                            ["Copper Amulet", 1, T.purple], ["Silver Amulet", 1, T.purple],
                          ].map(([name, qty, color]) => (
                            <Btn key={name} small color={color} onClick={() => { addItem(name, qty); addLog(`📦 Added ${qty}× ${ITEMS[name]?.emoji} ${name}`); }}>
                              {ITEMS[name]?.emoji} +{qty}
                            </Btn>
                          ))}
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: 10, fontWeight: 600, color: T.textSec, marginBottom: 4 }}>Gold: <span style={{ color: T.gold }}>{gold.toLocaleString()}</span></div>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                          {[1000, 5000, 10000, 50000].map(amt => (
                            <Btn key={amt} small color={T.gold} onClick={() => { setGold(g => g + amt); addLog(`💰 +${amt.toLocaleString()}g`); }}>
                              💰 +{amt >= 1000 ? `${amt/1000}k` : amt}
                            </Btn>
                          ))}
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: 10, fontWeight: 600, color: T.textSec, marginBottom: 4 }}>Pets: <span style={{ color: T.purple }}>{pets.length}/{PET_IDS.length}</span></div>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                          {PET_IDS.map(name => (
                            <Btn key={name} small color={pets.includes(name) ? T.textDim : RARITY_COLORS[PETS[name].rarity]} disabled={pets.includes(name)} onClick={() => unlockPet(name)}>
                              {PETS[name].emoji} {name}
                            </Btn>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* ── RIGHT: Equipment Panel (vertical) ── */}
                <div style={{
                  width: isMobile ? "100%" : 200, flexShrink: 0,
                  borderRadius: 12, overflow: "hidden",
                  border: `1px solid ${T.cardBorder}`, background: T.card,
                  alignSelf: "flex-start",
                  ...(isMobile ? {} : { position: "sticky", top: 14 }),
                }}>
                  {/* Equipment header */}
                  <div style={{
                    padding: "10px 14px",
                    background: `linear-gradient(180deg, ${T.danger}12, transparent)`,
                    borderBottom: `1px solid ${T.cardBorder}`,
                    textAlign: "center",
                  }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: T.white }}>⚔️ Equipment</div>
                    <div style={{ display: "flex", gap: 8, justifyContent: "center", marginTop: 6, fontSize: 10 }}>
                      <span style={{ color: T.danger, fontWeight: 700 }}>⚔ {equipAtk + petAtk}</span>
                      <span style={{ color: T.accent, fontWeight: 700 }}>🛡 {equipDef + petDef}</span>
                      {(equipSpeedPct + getPetSpeedPct("all")) > 0 && <span style={{ color: T.teal, fontWeight: 700 }}>⚡{equipSpeedPct + getPetSpeedPct("all")}%</span>}
                    </div>
                    {(equipXpPct + getPetXpPct("all")) > 0 && (
                      <div style={{ fontSize: 10, color: T.gold, fontWeight: 700, marginTop: 2 }}>✨ +{equipXpPct + getPetXpPct("all")}% XP</div>
                    )}
                  </div>

                  {/* Equipment slots vertical */}
                  <div style={{ padding: 8, display: "flex", flexDirection: "column", gap: 6 }}>
                    {eqSlots.map(slot => {
                      const eqName = equipped[slot];
                      const item = eqName ? ITEMS[eqName] : null;
                      const rc = item ? (RARITY_COLORS[item.rarity] || T.text) : T.textDim;
                      return (
                        <div key={slot}
                          onClick={eqName ? () => unequipItem(slot) : undefined}
                          style={{
                            padding: "6px 8px", borderRadius: 8,
                            background: item ? `${rc}08` : T.bgDeep,
                            border: `1px solid ${item ? rc + "25" : T.divider}`,
                            display: "flex", alignItems: "center", gap: 8,
                            cursor: eqName ? "pointer" : "default",
                            transition: "all 0.15s",
                          }}>
                          <div style={{
                            width: 30, height: 30, borderRadius: 6, flexShrink: 0,
                            background: item ? `${rc}15` : T.card,
                            display: "flex", alignItems: "center", justifyContent: "center",
                            fontSize: 14, border: `1px solid ${item ? rc + "20" : T.divider}`,
                          }}>
                            {item ? item.emoji : (SLOT_ICONS[slot] || "➖")}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 8, color: T.textDim, textTransform: "uppercase", fontWeight: 700, letterSpacing: 0.4 }}>{slot}</div>
                            {item ? (
                              <div style={{ fontSize: 10, fontWeight: 700, color: rc, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{eqName}</div>
                            ) : (
                              <div style={{ fontSize: 10, color: T.textDim }}>Empty</div>
                            )}
                          </div>
                          {eqName && <span style={{ fontSize: 8, color: T.textDim, background: T.bar, padding: "1px 4px", borderRadius: 3 }}>✕</span>}
                        </div>
                      );
                    })}
                  </div>

                  {/* Active pets in equipment panel */}
                  {activePets.length > 0 && (
                    <div style={{ padding: "6px 8px", borderTop: `1px solid ${T.cardBorder}` }}>
                      <div style={{ fontSize: 9, color: T.textDim, textTransform: "uppercase", fontWeight: 700, letterSpacing: 0.4, marginBottom: 4, textAlign: "center" }}>Companions</div>
                      {activePets.map(pName => {
                        const p = PETS[pName];
                        return (
                          <div key={pName} style={{
                            padding: "4px 8px", borderRadius: 6,
                            background: T.purpleMuted, border: `1px solid ${T.purple}20`,
                            display: "flex", alignItems: "center", gap: 6, marginBottom: 4,
                          }}>
                            <span style={{ fontSize: 16 }}>{p.emoji}</span>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: 10, fontWeight: 700, color: RARITY_COLORS[p.rarity], overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{pName}</div>
                              <div style={{ fontSize: 8, color: T.textDim }}>
                                {p.xpPct > 0 && <span style={{ color: T.gold }}>+{p.xpPct}%XP </span>}
                                {p.speedPct > 0 && <span style={{ color: T.teal }}>+{p.speedPct}%SPD</span>}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            );
          })()}

          {/* ════ PETS ════ */}
          {page === "pets" && (() => {
            return (
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                {/* Active Pets Banner */}
                <Card style={{ background: activePets.length > 0 ? `linear-gradient(135deg, ${T.card}, ${T.purpleMuted})` : T.card }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: T.white }}>🐾 Active Companions</div>
                    <span style={{ fontSize: 11, color: T.purple, background: T.purpleMuted, padding: "2px 8px", borderRadius: 6, fontWeight: 700 }}>
                      {activePets.length}/{petSlots} slots
                    </span>
                  </div>
                  {activePets.length > 0 ? (
                    <div style={{ display: "grid", gridTemplateColumns: `repeat(${Math.min(petSlots, 3)}, 1fr)`, gap: 10 }}>
                      {Array.from({ length: petSlots }).map((_, i) => {
                        const pName = activePets[i];
                        const p = pName ? PETS[pName] : null;
                        return (
                          <div key={i} style={{
                            padding: 10, borderRadius: 10,
                            background: p ? `${RARITY_COLORS[p.rarity]}08` : T.bgDeep,
                            border: `1px dashed ${p ? RARITY_COLORS[p.rarity] + "40" : T.divider}`,
                            textAlign: "center",
                          }}>
                            {p ? (
                              <>
                                <div style={{ fontSize: 32, marginBottom: 4 }}>{p.emoji}</div>
                                <div style={{ fontWeight: 700, color: RARITY_COLORS[p.rarity], fontSize: 12 }}>{pName}</div>
                                <div style={{ display: "flex", gap: 4, justifyContent: "center", marginTop: 4, flexWrap: "wrap", fontSize: 10 }}>
                                  {p.xpPct > 0 && <span style={{ color: T.gold }}>+{p.xpPct}%XP</span>}
                                  {p.speedPct > 0 && <span style={{ color: T.teal }}>+{p.speedPct}%SPD</span>}
                                  {p.atkBonus && <span style={{ color: T.danger }}>+{p.atkBonus}ATK</span>}
                                  {p.defBonus && <span style={{ color: T.accent }}>+{p.defBonus}DEF</span>}
                                </div>
                                <Btn color={T.danger} small style={{ marginTop: 6 }} onClick={() => {
                                  setActivePets(prev => prev.filter(n => n !== pName));
                                  addLog(`🐾 ${p.emoji} ${pName} dismissed`);
                                }}>Dismiss</Btn>
                              </>
                            ) : (
                              <div style={{ padding: "14px 0" }}>
                                <div style={{ fontSize: 22, opacity: 0.3, marginBottom: 4 }}>➕</div>
                                <div style={{ fontSize: 10, color: T.textDim }}>Empty Slot</div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div style={{ fontSize: 13, color: T.textDim, textAlign: "center", padding: "16px 0" }}>
                      No pets active. {pets.length > 0 ? "Select one below!" : "Complete hard quests to unlock pets!"}
                    </div>
                  )}
                </Card>

                {/* Pet Collection */}
                <Card>
                  <div style={{ fontSize: 14, fontWeight: 700, color: T.white, marginBottom: 14 }}>📚 Pet Collection ({pets.length}/{PET_IDS.length})</div>
                  <div style={{ display: "grid", gridTemplateColumns: `repeat(auto-fill, minmax(${isMobile ? "100%" : "280px"}, 1fr))`, gap: 10 }}>
                    {PET_IDS.map(name => {
                      const p = PETS[name];
                      const owned = pets.includes(name);
                      const isActive = activePets.includes(name);
                      const canSummon = owned && !isActive && activePets.length < petSlots;
                      return (
                        <div key={name} style={{
                          background: isActive ? T.purpleMuted : owned ? T.bgDeep : T.bg,
                          border: `1px solid ${isActive ? T.purple : owned ? T.cardBorder : T.bar}`,
                          borderRadius: 10, padding: 12,
                          opacity: owned ? 1 : 0.5,
                          transition: "all 0.2s",
                        }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                            <span style={{ fontSize: 28 }}>{owned ? p.emoji : "❓"}</span>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontWeight: 700, color: owned ? RARITY_COLORS[p.rarity] : T.textDim, fontSize: 13 }}>
                                {owned ? name : "???"}
                                {isActive && <span style={{ marginLeft: 6, fontSize: 10, color: T.purple, background: T.purpleMuted, padding: "1px 6px", borderRadius: 8 }}>ACTIVE</span>}
                              </div>
                              <div style={{ fontSize: 10, color: T.textDim, textTransform: "capitalize" }}>{p.rarity}</div>
                            </div>
                          </div>
                          {owned ? (
                            <>
                              <div style={{ fontSize: 11, color: T.textSoft, marginBottom: 6 }}>{p.desc}</div>
                              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", fontSize: 11, marginBottom: 8 }}>
                                {p.xpPct > 0 && <span style={{ color: T.gold, background: T.gold + "15", padding: "1px 6px", borderRadius: 6 }}>+{p.xpPct}% XP</span>}
                                {p.speedPct > 0 && <span style={{ color: T.teal, background: T.tealMuted, padding: "1px 6px", borderRadius: 6 }}>+{p.speedPct}% Speed</span>}
                                {p.atkBonus && <span style={{ color: T.danger, background: T.dangerMuted, padding: "1px 6px", borderRadius: 6 }}>+{p.atkBonus} ATK</span>}
                                {p.defBonus && <span style={{ color: T.accent, background: T.accent + "15", padding: "1px 6px", borderRadius: 6 }}>+{p.defBonus} DEF</span>}
                              </div>
                              <div style={{ display: "flex", gap: 6 }}>
                                {canSummon && <Btn color={T.purple} small onClick={() => { setActivePets(prev => [...prev, name]); addLog(`🐾 ${p.emoji} ${name} is now active!`); }}>Summon</Btn>}
                                {isActive && <Btn color={T.danger} small onClick={() => { setActivePets(prev => prev.filter(n => n !== name)); addLog(`🐾 ${p.emoji} ${name} dismissed`); }}>Dismiss</Btn>}
                                {owned && !isActive && activePets.length >= petSlots && <span style={{ fontSize: 10, color: T.warning }}>All slots full — dismiss one or buy more in the Store!</span>}
                              </div>
                            </>
                          ) : (
                            <div style={{ fontSize: 11, color: T.textDim }}>🔒 {p.source}</div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </Card>

                {/* How to get pets */}
                <Card>
                  <div style={{ fontSize: 14, fontWeight: 700, color: T.white, marginBottom: 8 }}>💡 How to Get Pets</div>
                  <div style={{ fontSize: 12, color: T.textSoft, lineHeight: 1.8 }}>
                    Pets are rare rewards from completing the <b style={{ color: T.warning }}>hardest difficulty</b> daily quests.
                    Free quests have a <b style={{ color: T.success }}>15%</b> chance and Premium quests have a <b style={{ color: T.purple }}>25%</b> chance
                    to drop a pet when you claim the reward. You start with <b style={{ color: T.white }}>1 pet slot</b> — buy more
                    in the <span style={{ color: T.gold, cursor: "pointer", fontWeight: 700 }} onClick={() => nav("store")}>🏪 Store</span> to equip multiple pets at once!
                  </div>
                </Card>
              </div>
            );
          })()}

          {/* ════ STORE ════ */}
          {page === "store" && (() => {
            // Stripe Price IDs
            const STRIPE_PRICES = {
              premium: "price_1T4urmQZjXMzndTI7OtuMCq0",
              petslot2: "price_1T4usJQZjXMzndTIJlB2kgGW",
              petslot3: "price_1T4usiQZjXMzndTIsTSBJAyY",
              starter_bundle: "price_1T4uu3QZjXMzndTIzpJvbVP2",
              xp_mastery: "price_1T4vWXQZjXMzndTIk10BD1GE",
              speed_mastery: "price_1T4vXYQZjXMzndTIrNkQ4loy",
              combat_mastery: "price_1T4vYTQZjXMzndTIzVrdFB2u",
              lucky_drops: "price_1T4vZ2QZjXMzndTIwANSmmrO",
              gold_rush: "price_1T4vZVQZjXMzndTINZQRz1V0",
            };

            const handleStripeBuy = async (storeId) => {
              try {
                const functionsUrl = import.meta.env.VITE_FUNCTIONS_URL;
                if (!functionsUrl) { addLog("❌ Store not configured yet"); return; }
                const res = await fetch(`${functionsUrl}/createCheckoutSession`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    priceId: STRIPE_PRICES[storeId],
                    userId: account.username,
                    username: account.displayName || account.username,
                  }),
                });
                const data = await res.json();
                if (data.url) window.location.href = data.url;
                else addLog(`❌ ${data.error || "Failed to start checkout"}`);
              } catch (err) {
                addLog("❌ Failed to connect to payment server");
              }
            };

            const STORE_ITEMS = [
              {
                id: "premium", name: "⭐ Premium Membership", realPrice: "$19.99",
                desc: "Unlock 4 premium daily quests with better rewards, rare pet drops, and exclusive items.",
                bought: isPremium,
                perks: ["4 extra premium quests daily", "Higher pet drop rates (25%)", "Exclusive reward items", "Premium quest badge"],
              },
              {
                id: "petslot2", name: "🐾 Pet Slot #2", realPrice: "$9.99",
                desc: "Equip a second pet simultaneously. Stack bonuses from two pets at once!",
                bought: petSlots >= 2, requires: null,
                perks: ["Equip 2 pets at once", "Stack XP & speed bonuses", "Stack ATK & DEF bonuses"],
              },
              {
                id: "petslot3", name: "🐾 Pet Slot #3", realPrice: "$9.99",
                desc: "Equip a third pet! Maximum pet power with three companions at your side.",
                bought: petSlots >= 3, requires: "petslot2",
                perks: ["Equip 3 pets at once", "Triple stack all pet bonuses", "Ultimate companion setup"],
              },
              {
                id: "starter_bundle", name: "🎒 Starting Bundle", realPrice: "$9.99",
                desc: "A generous bundle of resources, gear, and potions to kickstart your adventure.",
                bought: !!storePurchases.starter_bundle,
                perks: ["15× Iron Ore", "8× Gold Ore", "5× Mana Crystal", "3× HP Potion", "1× Iron Sword", "1× Copper Amulet"],
              },
              {
                id: "xp_mastery", name: "✨ XP Mastery", realPrice: "$9.99/mo", sub: true,
                desc: "Gain +5% bonus XP on all skills. Stacks with equipment and pets.",
                bought: !!storePurchases.xp_mastery,
                perks: ["+5% XP to all skills", "Stacks with gear & pets", "Monthly subscription"],
              },
              {
                id: "speed_mastery", name: "⚡ Speed Mastery", realPrice: "$9.99/mo", sub: true,
                desc: "Gain +5% gathering and crafting speed. Stacks with equipment and pets.",
                bought: !!storePurchases.speed_mastery,
                perks: ["+5% gathering speed", "+5% crafting speed", "Monthly subscription"],
              },
              {
                id: "combat_mastery", name: "⚔️ Combat Mastery", realPrice: "$9.99",
                desc: "Permanently gain +5 ATK and +3 DEF. Become a stronger warrior.",
                bought: !!storePurchases.combat_mastery,
                perks: ["+5 ATK permanently", "+3 DEF permanently", "Stacks with gear & pets"],
              },
              {
                id: "lucky_drops", name: "🍀 Lucky Drops", realPrice: "$9.99/mo", sub: true,
                desc: "Increase monster drop rates by +10%. More loot from every kill!",
                bought: !!storePurchases.lucky_drops, requires: "premium",
                perks: ["+10% drop rate on all monsters", "More crafting materials", "Monthly subscription"],
              },
              {
                id: "gold_rush", name: "💰 Gold Rush", realPrice: "$9.99",
                desc: "Permanently earn +15% more gold from combat and quest rewards.",
                bought: !!storePurchases.gold_rush,
                perks: ["+15% gold from combat", "+15% gold from quests", "Passive income boost"],
              },
            ];

            return (
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                {/* Store Header */}
                <div style={{
                  padding: "18px 22px", borderRadius: 12,
                  background: `linear-gradient(135deg, ${T.gold}15, ${T.purple}15)`,
                  border: `1px solid ${T.gold}25`,
                }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div>
                      <div style={{ fontSize: 20, fontWeight: 800, color: T.white }}>🏪 Store</div>
                      <div style={{ fontSize: 12, color: T.textSoft, marginTop: 2 }}>Support the game with premium upgrades</div>
                    </div>
                  </div>
                </div>

                {/* Upgrades Grid */}
                <Card>
                  <div style={{ fontSize: 14, fontWeight: 700, color: T.gold, marginBottom: 14 }}>⬆️ Permanent Upgrades</div>
                  <div style={{ display: "grid", gridTemplateColumns: `repeat(auto-fill, minmax(${isMobile ? "100%" : "300px"}, 1fr))`, gap: 12 }}>
                    {STORE_ITEMS.map(item => {
                      const locked = item.requires && !storePurchases[item.requires] && !(item.requires === "petslot2" && petSlots >= 2) && !isPremium;

                      return (
                        <div key={item.id} style={{
                          padding: 16, borderRadius: 12,
                          background: item.bought ? `${T.success}08` : locked ? T.bgDeep : T.bgDeep,
                          border: `1px solid ${item.bought ? T.success + "30" : locked ? T.divider : T.cardBorder}`,
                          opacity: locked ? 0.5 : 1,
                        }}>
                          {/* Header */}
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                            <div style={{ fontSize: 14, fontWeight: 700, color: item.bought ? T.success : T.white }}>{item.name}</div>
                            {item.bought ? (
                              <span style={{ fontSize: 10, fontWeight: 800, color: T.success, background: T.successMuted, padding: "2px 8px", borderRadius: 6 }}>OWNED</span>
                            ) : item.sub ? (
                              <span style={{ fontSize: 10, fontWeight: 700, color: T.purple, background: T.purpleMuted, padding: "2px 8px", borderRadius: 6 }}>SUBSCRIPTION</span>
                            ) : null}
                          </div>

                          <div style={{ fontSize: 11, color: T.textSoft, marginBottom: 10 }}>{item.desc}</div>

                          {/* Perks */}
                          <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 12 }}>
                            {item.perks.map((perk, i) => (
                              <span key={i} style={{
                                fontSize: 10, padding: "2px 8px", borderRadius: 6,
                                background: item.bought ? T.success + "10" : T.accent + "10",
                                color: item.bought ? T.success : T.accent,
                              }}>✓ {perk}</span>
                            ))}
                          </div>

                          {/* Buy Button */}
                          {!item.bought && !locked && (
                            <div style={{ display: "flex", gap: 8 }}>
                              <Btn color={T.purple} onClick={() => handleStripeBuy(item.id)} style={{ flex: 1 }}>
                                💳 {item.realPrice}
                              </Btn>
                            </div>
                          )}
                          {locked && <div style={{ fontSize: 10, color: T.warning }}>🔒 Requires: {STORE_ITEMS.find(s => s.id === item.requires)?.name}</div>}
                        </div>
                      );
                    })}
                  </div>
                </Card>
              </div>
            );
          })()}

          {/* ════ MARKETPLACE ════ */}
          {page === "market" && (() => {
            const tabs = [
              { id: "sell", label: "🏪 Quick Sell", color: T.accent },
              { id: "buy", label: "🛒 Player Market", color: T.teal },
              { id: "myListings", label: "📦 My Listings", color: T.orange },
            ];
            const sellableItems = Object.entries(inventory).filter(([n, q]) => q > 0 && ITEMS[n]);
            // My listings: listings where I have stock
            const myListings = marketListings.filter(l => l.sellers?.some(s => s.user === account.username && s.qty > 0));
            // Buyable: listings that have stock from others
            const buyableListings = marketListings.filter(l => {
              const otherQty = (l.sellers || []).filter(s => s.user !== account.username).reduce((s, e) => s + e.qty, 0);
              return otherQty > 0;
            });

            return (
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                {/* Tab bar */}
                <div style={{ display: "flex", gap: 6 }}>
                  {tabs.map(t => (
                    <button key={t.id} onClick={() => setMarketTab(t.id)} style={{
                      flex: 1, padding: "10px 0", background: marketTab === t.id ? t.color + "22" : T.surface, border: `1px solid ${marketTab === t.id ? t.color : T.border}`,
                      borderRadius: 8, color: marketTab === t.id ? t.color : T.textDim, fontWeight: 600, cursor: "pointer", fontSize: 13, transition: "all .15s",
                    }}>{t.label}{t.id === "myListings" && myListings.length > 0 ? ` (${myListings.length})` : ""}</button>
                  ))}
                </div>

                {/* ── Quick Sell Tab ── */}
                {marketTab === "sell" && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    <Card>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                        <div style={{ fontSize: 15, fontWeight: 700, color: T.text }}>💰 Sell to Shop</div>
                        <button onClick={sellAllJunk} style={{
                          padding: "6px 14px", background: T.orange + "22", border: `1px solid ${T.orange}44`, borderRadius: 6,
                          color: T.orange, fontWeight: 600, cursor: "pointer", fontSize: 12,
                        }}>Sell All Materials</button>
                      </div>
                      <div style={{ fontSize: 12, color: T.textDim, marginBottom: 12 }}>Instantly sell items for gold at NPC prices.</div>
                      {sellableItems.length === 0 && <div style={{ color: T.textDim, textAlign: "center", padding: 20 }}>No items to sell</div>}
                      <div style={{ display: "grid", gridTemplateColumns: `repeat(auto-fill, minmax(${isMobile ? "100%" : "280px"}, 1fr))`, gap: 8 }}>
                        {sellableItems.map(([name, qty]) => {
                          const info = ITEMS[name];
                          const price = info?.sell || 1;
                          const sq = sellQty[name] || 1;
                          return (
                            <div key={name} style={{
                              display: "flex", alignItems: "center", gap: 10, padding: "8px 12px",
                              background: T.bg, borderRadius: 8, border: `1px solid ${T.border}`,
                            }}>
                              <span style={{ fontSize: 22 }}>{info?.emoji || "📦"}</span>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontSize: 13, fontWeight: 600, color: T.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{name}</div>
                                <div style={{ fontSize: 11, color: T.textDim }}>Own: {qty} · {price}g each</div>
                              </div>
                              <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                                <button onClick={() => setSellQty(p => ({ ...p, [name]: Math.max(1, (p[name] || 1) - 1) }))} style={{
                                  width: 24, height: 24, background: T.surface, border: `1px solid ${T.border}`, borderRadius: 4, color: T.text, cursor: "pointer", fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center",
                                }}>-</button>
                                <input type="number" value={sq} min={1} max={qty} onChange={e => setSellQty(p => ({ ...p, [name]: Math.max(1, Math.min(qty, parseInt(e.target.value) || 1)) }))} style={{
                                  width: 40, textAlign: "center", background: T.surface, border: `1px solid ${T.border}`, borderRadius: 4, color: T.text, fontSize: 12, padding: "2px 0",
                                }} />
                                <button onClick={() => setSellQty(p => ({ ...p, [name]: Math.min(qty, (p[name] || 1) + 1) }))} style={{
                                  width: 24, height: 24, background: T.surface, border: `1px solid ${T.border}`, borderRadius: 4, color: T.text, cursor: "pointer", fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center",
                                }}>+</button>
                                <button onClick={() => setSellQty(p => ({ ...p, [name]: qty }))} style={{
                                  padding: "2px 6px", background: T.surface, border: `1px solid ${T.border}`, borderRadius: 4, color: T.textDim, cursor: "pointer", fontSize: 10,
                                }}>All</button>
                              </div>
                              <button onClick={() => { sellToShop(name, sq); setSellQty(p => ({ ...p, [name]: 1 })); }} style={{
                                padding: "6px 12px", background: T.accent + "22", border: `1px solid ${T.accent}44`, borderRadius: 6,
                                color: T.accent, fontWeight: 600, cursor: "pointer", fontSize: 12, whiteSpace: "nowrap",
                              }}>{price * sq}g</button>
                            </div>
                          );
                        })}
                      </div>
                    </Card>
                  </div>
                )}

                {/* ── Player Market Tab (combined order book) ── */}
                {marketTab === "buy" && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    <Card>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                        <div style={{ fontSize: 15, fontWeight: 700, color: T.text }}>🛒 Player Marketplace</div>
                        <button onClick={fetchMarketListings} style={{
                          padding: "6px 14px", background: T.surface, border: `1px solid ${T.border}`, borderRadius: 6,
                          color: T.textDim, cursor: "pointer", fontSize: 12,
                        }}>{marketLoading ? "Loading..." : "🔄 Refresh"}</button>
                      </div>
                      <div style={{ fontSize: 12, color: T.textDim, marginBottom: 12 }}>
                        Items from all sellers are combined at each price point. Your gold: <span style={{ color: T.warning, fontWeight: 600 }}>{gold.toLocaleString()}g</span>
                      </div>
                      <div style={{ position: "relative", marginBottom: 12 }}>
                        <input type="text" value={marketSearch} onChange={e => setMarketSearch(e.target.value)} placeholder="🔍 Search items..." style={{
                          width: "100%", padding: "8px 12px", paddingRight: marketSearch ? 32 : 12, background: T.bg, border: `1px solid ${T.border}`, borderRadius: 8, color: T.text, fontSize: 13, outline: "none", boxSizing: "border-box",
                        }} />
                        {marketSearch && <button onClick={() => setMarketSearch("")} style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: T.textDim, cursor: "pointer", fontSize: 16, padding: 0, lineHeight: 1 }}>✕</button>}
                      </div>
                      {(() => {
                        const q = marketSearch.toLowerCase().trim();
                        const filtered = q ? buyableListings.filter(l => l.item.toLowerCase().includes(q) || (ITEMS[l.item]?.category || "").includes(q)) : buyableListings;
                        return (<>
                      {filtered.length === 0 && <div style={{ color: T.textDim, textAlign: "center", padding: 30 }}>{marketSearch ? "No items match your search" : "No items available on the market"}</div>}
                      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        {filtered.map(l => {
                          const info = ITEMS[l.item];
                          const otherQty = (l.sellers || []).filter(s => s.user !== account.username).reduce((s, e) => s + e.qty, 0);
                          const sellerCount = (l.sellers || []).filter(s => s.user !== account.username).length;
                          const bq = buyQty[l._key] || 1;
                          const cost = bq * l.priceEach;
                          const canAfford = gold >= cost;
                          return (
                            <div key={l._key} style={{
                              display: "flex", alignItems: "center", gap: 12, padding: "10px 14px",
                              background: T.bg, borderRadius: 8, border: `1px solid ${T.border}`,
                            }}>
                              <span style={{ fontSize: 26 }}>{info?.emoji || "📦"}</span>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontSize: 14, fontWeight: 700, color: T.text }}>{l.item}</div>
                                <div style={{ fontSize: 12, color: T.textDim }}>
                                  <span style={{ color: T.warning, fontWeight: 600 }}>{l.priceEach}g</span> each · <span style={{ color: T.accent }}>{otherQty} available</span> · {sellerCount} seller{sellerCount !== 1 ? "s" : ""}
                                </div>
                              </div>
                              <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                                <button onClick={() => setBuyQty(p => ({ ...p, [l._key]: Math.max(1, (p[l._key] || 1) - 1) }))} style={{
                                  width: 24, height: 24, background: T.surface, border: `1px solid ${T.border}`, borderRadius: 4, color: T.text, cursor: "pointer", fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center",
                                }}>-</button>
                                <input type="number" value={bq} min={1} max={otherQty} onChange={e => setBuyQty(p => ({ ...p, [l._key]: Math.max(1, Math.min(otherQty, parseInt(e.target.value) || 1)) }))} style={{
                                  width: 40, textAlign: "center", background: T.surface, border: `1px solid ${T.border}`, borderRadius: 4, color: T.text, fontSize: 12, padding: "2px 0",
                                }} />
                                <button onClick={() => setBuyQty(p => ({ ...p, [l._key]: Math.min(otherQty, (p[l._key] || 1) + 1) }))} style={{
                                  width: 24, height: 24, background: T.surface, border: `1px solid ${T.border}`, borderRadius: 4, color: T.text, cursor: "pointer", fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center",
                                }}>+</button>
                              </div>
                              <button onClick={() => buyFromMarket(l, bq)} disabled={!canAfford} style={{
                                padding: "8px 14px", background: canAfford ? T.accent + "22" : T.surface, border: `1px solid ${canAfford ? T.accent + "44" : T.border}`,
                                borderRadius: 6, color: canAfford ? T.accent : T.textDim, fontWeight: 600, cursor: canAfford ? "pointer" : "not-allowed", fontSize: 12, whiteSpace: "nowrap",
                              }}>Buy {bq} · {cost}g</button>
                            </div>
                          );
                        })}
                      </div>
                      </>); })()}
                    </Card>

                    {/* List your own items */}
                    <Card>
                      <div style={{ fontSize: 15, fontWeight: 700, color: T.text, marginBottom: 12 }}>📦 List Items for Sale</div>
                      <div style={{ fontSize: 12, color: T.textDim, marginBottom: 12 }}>Set a price per item. Your listing merges with others at the same price point.</div>
                      {sellableItems.length === 0 && <div style={{ color: T.textDim, textAlign: "center", padding: 20 }}>No items to list</div>}
                      <div style={{ display: "grid", gridTemplateColumns: `repeat(auto-fill, minmax(${isMobile ? "100%" : "300px"}, 1fr))`, gap: 8 }}>
                        {sellableItems.map(([name, qty]) => {
                          const info = ITEMS[name];
                          const lq = listingQty[name] || 1;
                          const lp = listingPrice[name] || (info?.sell || 1) * 2;
                          return (
                            <div key={name} style={{
                              display: "flex", alignItems: "center", gap: 8, padding: "8px 12px",
                              background: T.bg, borderRadius: 8, border: `1px solid ${T.border}`, flexWrap: "wrap",
                            }}>
                              <span style={{ fontSize: 20 }}>{info?.emoji || "📦"}</span>
                              <div style={{ flex: "1 1 100px", minWidth: 80 }}>
                                <div style={{ fontSize: 13, fontWeight: 600, color: T.text }}>{name}</div>
                                <div style={{ fontSize: 11, color: T.textDim }}>Own: {qty} · NPC: {info?.sell || 1}g</div>
                              </div>
                              <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11 }}>
                                <span style={{ color: T.textDim }}>Qty:</span>
                                <input type="number" value={lq} min={1} max={qty} onChange={e => setListingQty(p => ({ ...p, [name]: Math.max(1, Math.min(qty, parseInt(e.target.value) || 1)) }))} style={{
                                  width: 40, textAlign: "center", background: T.surface, border: `1px solid ${T.border}`, borderRadius: 4, color: T.text, fontSize: 12, padding: "2px 0",
                                }} />
                                <span style={{ color: T.textDim, marginLeft: 4 }}>Each:</span>
                                <input type="number" value={lp} min={1} onChange={e => setListingPrice(p => ({ ...p, [name]: Math.max(1, parseInt(e.target.value) || 1) }))} style={{
                                  width: 55, textAlign: "center", background: T.surface, border: `1px solid ${T.border}`, borderRadius: 4, color: T.warning, fontSize: 12, padding: "2px 0",
                                }} />
                                <span style={{ color: T.warning }}>g</span>
                              </div>
                              <button onClick={() => { listOnMarket(name, lq, lp); setListingQty(p => ({ ...p, [name]: 1 })); }} style={{
                                padding: "6px 12px", background: T.teal + "22", border: `1px solid ${T.teal}44`, borderRadius: 6,
                                color: T.teal, fontWeight: 600, cursor: "pointer", fontSize: 12,
                              }}>List</button>
                            </div>
                          );
                        })}
                      </div>
                    </Card>
                  </div>
                )}

                {/* ── My Listings Tab ── */}
                {marketTab === "myListings" && (
                  <Card>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                      <div style={{ fontSize: 15, fontWeight: 700, color: T.text }}>📦 My Active Listings</div>
                      <button onClick={fetchMarketListings} style={{
                        padding: "6px 14px", background: T.surface, border: `1px solid ${T.border}`, borderRadius: 6,
                        color: T.textDim, cursor: "pointer", fontSize: 12,
                      }}>{marketLoading ? "Loading..." : "🔄 Refresh"}</button>
                    </div>
                    <div style={{ fontSize: 12, color: T.textDim, marginBottom: 12 }}>Your items listed on the market. Cancelling returns items to your bank.</div>
                    {myListings.length === 0 && <div style={{ color: T.textDim, textAlign: "center", padding: 30 }}>You have no active listings</div>}
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {myListings.map(l => {
                        const info = ITEMS[l.item];
                        const mySeller = l.sellers?.find(s => s.user === account.username);
                        const myQty = mySeller?.qty || 0;
                        return (
                          <div key={l._key} style={{
                            display: "flex", alignItems: "center", gap: 10, padding: "10px 14px",
                            background: T.bg, borderRadius: 8, border: `1px solid ${T.border}`,
                          }}>
                            <span style={{ fontSize: 24 }}>{info?.emoji || "📦"}</span>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontSize: 14, fontWeight: 600, color: T.text }}>{myQty}x {l.item}</div>
                              <div style={{ fontSize: 12, color: T.textDim }}>
                                Price: <span style={{ color: T.warning, fontWeight: 600 }}>{l.priceEach}g each</span> · Total pool: {l.totalQty} ({l.sellers?.length || 0} seller{(l.sellers?.length || 0) !== 1 ? "s" : ""})
                              </div>
                            </div>
                            <button onClick={() => cancelMyListings(l)} style={{
                              padding: "6px 14px", background: T.danger + "22", border: `1px solid ${T.danger}44`, borderRadius: 6,
                              color: T.danger, fontWeight: 600, cursor: "pointer", fontSize: 12,
                            }}>Cancel ({myQty})</button>
                          </div>
                        );
                      })}
                    </div>
                  </Card>
                )}
              </div>
            );
          })()}

          {/* ════ CHAT ════ */}
          {page === "chat" && (() => {
            const channels = [
              { id: "global", label: "Global", icon: "🌍", color: T.accent },
              ...(myClan ? [{ id: "clan", label: `[${myClan.tag}] Clan`, icon: "🏰", color: T.purple }] : []),
              { id: "system", label: "System", icon: "📢", color: T.warning },
            ];
            const msgs = chatMessages[chatChannel] || [];
            const isSystem = chatChannel === "system";
            const myName = account.displayName || account.username;

            const fmtTime = (t) => {
              const d = new Date(t);
              const now = new Date();
              const diffMs = now - d;
              if (diffMs < 60000) return "just now";
              if (diffMs < 3600000) return `${Math.floor(diffMs / 60000)}m ago`;
              if (d.toDateString() === now.toDateString()) return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
              return d.toLocaleDateString([], { month: "short", day: "numeric" }) + " " + d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
            };

            return (
              <div style={{ display: "flex", flexDirection: "column", height: "100%", marginTop: -24, marginLeft: -24, marginRight: -24, marginBottom: -24, padding: 0 }}>
                {/* Header */}
                <div style={{ padding: "16px 20px 12px", borderBottom: `1px solid ${T.divider}` }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 20 }}>💬</span>
                      <span style={{ fontSize: 16, fontWeight: 800, color: T.white }}>Chat</span>
                      <span style={{ fontSize: 11, color: T.textDim }}>{msgs.length} messages</span>
                    </div>
                    <Btn color={T.accent} small onClick={() => fetchChat()} disabled={chatLoading}>
                      {chatLoading ? "..." : "🔄"}
                    </Btn>
                  </div>
                  {/* Channel tabs */}
                  <div style={{ display: "flex", gap: 6 }}>
                    {channels.map(c => (
                      <div key={c.id} onClick={() => setChatChannel(c.id)} style={{
                        padding: "6px 12px", borderRadius: T.rs,
                        background: chatChannel === c.id ? c.color + "20" : T.bgDeep,
                        border: `1px solid ${chatChannel === c.id ? c.color + "50" : T.divider}`,
                        color: chatChannel === c.id ? c.color : T.textSec,
                        fontSize: 11, fontWeight: 600, cursor: "pointer",
                        display: "flex", alignItems: "center", gap: 4,
                        transition: "all 0.12s",
                      }}>
                        <span style={{ fontSize: 12 }}>{c.icon}</span> {c.label}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Messages */}
                <div style={{ flex: 1, overflowY: "auto", padding: "12px 20px" }}>
                  {msgs.length === 0 ? (
                    <div style={{ textAlign: "center", padding: "60px 0", color: T.textDim }}>
                      <div style={{ fontSize: 32, marginBottom: 8 }}>{isSystem ? "📢" : "💬"}</div>
                      <div style={{ fontSize: 13 }}>
                        {isSystem ? "System announcements will appear here." : "No messages yet. Say hello!"}
                      </div>
                    </div>
                  ) : (
                    msgs.map((m, i) => {
                      const isMe = m.user === myName;
                      const isSys = m.user === "⚔️ System";
                      const prevMsg = msgs[i - 1];
                      const showDateSep = !prevMsg || new Date(m.t).toDateString() !== new Date(prevMsg.t).toDateString();
                      const sameUser = prevMsg && prevMsg.user === m.user && (m.t - prevMsg.t) < 120000;

                      return (
                        <div key={i}>
                          {/* Date separator */}
                          {showDateSep && (
                            <div style={{ textAlign: "center", margin: "16px 0 12px", position: "relative" }}>
                              <div style={{ position: "absolute", top: "50%", left: 0, right: 0, height: 1, background: T.divider }} />
                              <span style={{
                                position: "relative", background: T.bg, padding: "0 12px",
                                fontSize: 10, color: T.textDim, fontWeight: 600,
                              }}>{new Date(m.t).toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" })}</span>
                            </div>
                          )}

                          {/* System message */}
                          {isSys ? (
                            <div style={{
                              padding: "6px 12px", margin: "4px 0", borderRadius: T.rs,
                              background: T.warningMuted, border: `1px solid ${T.warning}15`,
                              fontSize: 12, color: T.warning, fontWeight: 500,
                              display: "flex", alignItems: "center", gap: 8,
                            }}>
                              <span style={{ fontSize: 13 }}>📢</span>
                              <span style={{ flex: 1 }}>{m.text}</span>
                              <span style={{ fontSize: 9, color: T.textDim, flexShrink: 0 }}>{fmtTime(m.t)}</span>
                            </div>
                          ) : (
                            /* User message */
                            <div style={{ marginTop: sameUser ? 2 : 10, display: "flex", gap: 8, flexDirection: isMe ? "row-reverse" : "row" }}>
                              {/* Avatar */}
                              {!sameUser && (
                                <div style={{
                                  width: 28, height: 28, borderRadius: 99, flexShrink: 0,
                                  background: isMe ? T.accent + "20" : T.bar,
                                  display: "flex", alignItems: "center", justifyContent: "center",
                                  fontSize: 11, fontWeight: 700, color: isMe ? T.accent : T.textSec,
                                  marginTop: 2,
                                }}>{(m.user || "?")[0].toUpperCase()}</div>
                              )}
                              {sameUser && <div style={{ width: 28, flexShrink: 0 }} />}
                              <div style={{ maxWidth: "75%", minWidth: 0 }}>
                                {/* Name + time */}
                                {!sameUser && (
                                  <div style={{
                                    display: "flex", alignItems: "center", gap: 6, marginBottom: 3,
                                    flexDirection: isMe ? "row-reverse" : "row",
                                  }}>
                                    {m.clan && <span style={{ fontSize: 9, fontWeight: 800, color: T.purple }}>[{m.clan}]</span>}
                                    <span style={{ fontSize: 11, fontWeight: 700, color: isMe ? T.accent : T.white }}>{m.user}</span>
                                    <span style={{ fontSize: 9, color: T.textDim }}>{fmtTime(m.t)}</span>
                                  </div>
                                )}
                                {/* Bubble */}
                                <div style={{
                                  padding: "8px 12px", borderRadius: 12,
                                  borderTopLeftRadius: isMe ? 12 : (sameUser ? 12 : 4),
                                  borderTopRightRadius: isMe ? (sameUser ? 12 : 4) : 12,
                                  background: isMe ? T.accent + "18" : T.card,
                                  border: `1px solid ${isMe ? T.accent + "25" : T.divider}`,
                                  fontSize: 12.5, color: T.text, lineHeight: 1.45,
                                  wordBreak: "break-word",
                                }}>{m.text}</div>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                  <div ref={chatEndRef} />
                </div>

                {/* Input bar */}
                {!isSystem && (
                  <div style={{
                    padding: "10px 20px 14px", borderTop: `1px solid ${T.divider}`,
                    display: "flex", gap: 8, alignItems: "center",
                    background: T.bgDeep,
                  }}>
                    <input
                      type="text" value={chatInput}
                      onChange={e => setChatInput(e.target.value.slice(0, 200))}
                      onKeyDown={e => { if (e.key === "Enter" && chatInput.trim()) sendChat(chatChannel); }}
                      placeholder={chatChannel === "clan" ? `Message [${myClan?.tag}] clan...` : "Type a message..."}
                      style={{
                        flex: 1, padding: "10px 14px", borderRadius: 20,
                        border: `1px solid ${T.divider}`, background: T.card,
                        color: T.white, fontFamily: FONT, fontSize: 13, outline: "none",
                      }}
                    />
                    <div style={{ fontSize: 9, color: T.textDim, width: 35, textAlign: "right" }}>{chatInput.length}/200</div>
                    <div onClick={() => { if (chatInput.trim()) sendChat(chatChannel); }} style={{
                      width: 36, height: 36, borderRadius: 99,
                      background: chatInput.trim() ? T.accent : T.bar,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      cursor: chatInput.trim() ? "pointer" : "default",
                      transition: "all 0.15s", fontSize: 15,
                    }}>➤</div>
                  </div>
                )}
              </div>
            );
          })()}

          {/* ════ CLAN ════ */}
          {page === "clan" && (() => {
            const inputStyle = {
              width: "100%", padding: "9px 11px", borderRadius: 6,
              border: `1px solid ${T.divider}`, background: T.bgDeep,
              color: T.white, fontFamily: FONT, fontSize: 12, outline: "none", boxSizing: "border-box",
            };
            const labelStyle = { fontSize: 10, fontWeight: 700, color: T.textDim, textTransform: "uppercase", letterSpacing: 0.5, display: "block", marginBottom: 4 };

            // ── Has a clan ──
            if (myClan) {
              const combinedLevel = clanMembers.reduce((acc, m) => {
                const lb = lbData.find(e => e.displayName === m.displayName);
                return acc + (lb?.totalLevel || 0);
              }, 0);
              const combinedKills = clanMembers.reduce((acc, m) => {
                const lb = lbData.find(e => e.displayName === m.displayName);
                return acc + (lb?.kills || 0);
              }, 0);

              const tabs = [
                { id: "info", label: "Info", icon: "🏰" },
                { id: "members", label: `Members (${clanMembers.length})`, icon: "👥" },
              ];

              return (
                <div>
                  <PageTitle icon="🏰" title={`[${myClan.tag}] ${myClan.displayName || myClan.name}`} subtitle={myClan.desc || "No description"} />

                  {/* Tabs */}
                  <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
                    {tabs.map(t => (
                      <div key={t.id} onClick={() => setClanTab(t.id)} style={{
                        padding: "7px 14px", borderRadius: T.rs,
                        background: clanTab === t.id ? T.purple + "20" : T.bgDeep,
                        border: `1px solid ${clanTab === t.id ? T.purple + "50" : T.divider}`,
                        color: clanTab === t.id ? T.purple : T.textSec,
                        fontSize: 12, fontWeight: 600, cursor: "pointer",
                      }}>{t.icon} {t.label}</div>
                    ))}
                  </div>

                  {/* Info tab */}
                  {clanTab === "info" && (
                    <div>
                      <div style={{ display: "grid", gridTemplateColumns: `repeat(auto-fill, minmax(${isMobile ? "140px" : "160px"}, 1fr))`, gap: 10, marginBottom: 16 }}>
                        <Card style={{ textAlign: "center", padding: 16 }}>
                          <div style={{ fontSize: 22, marginBottom: 4 }}>👥</div>
                          <div style={{ fontSize: 20, fontWeight: 900, color: T.white }}>{clanMembers.length}</div>
                          <div style={{ fontSize: 10, color: T.textDim, fontWeight: 600 }}>MEMBERS</div>
                        </Card>
                        <Card style={{ textAlign: "center", padding: 16 }}>
                          <div style={{ fontSize: 22, marginBottom: 4 }}>🏆</div>
                          <div style={{ fontSize: 20, fontWeight: 900, color: T.gold }}>{fmt(combinedLevel)}</div>
                          <div style={{ fontSize: 10, color: T.textDim, fontWeight: 600 }}>TOTAL LEVELS</div>
                        </Card>
                        <Card style={{ textAlign: "center", padding: 16 }}>
                          <div style={{ fontSize: 22, marginBottom: 4 }}>💀</div>
                          <div style={{ fontSize: 20, fontWeight: 900, color: T.danger }}>{fmt(combinedKills)}</div>
                          <div style={{ fontSize: 10, color: T.textDim, fontWeight: 600 }}>TOTAL KILLS</div>
                        </Card>
                        <Card style={{ textAlign: "center", padding: 16 }}>
                          <div style={{ fontSize: 22, marginBottom: 4 }}>📅</div>
                          <div style={{ fontSize: 13, fontWeight: 700, color: T.white }}>{new Date(myClan.created).toLocaleDateString()}</div>
                          <div style={{ fontSize: 10, color: T.textDim, fontWeight: 600 }}>FOUNDED</div>
                        </Card>
                      </div>

                      <Card>
                        <div style={{ fontSize: 13, fontWeight: 700, color: T.white, marginBottom: 8 }}>Clan Details</div>
                        <StatRow label="Name" value={myClan.displayName || myClan.name} />
                        <StatRow label="Tag" value={`[${myClan.tag}]`} color={T.purple} />
                        <StatRow label="Leader" value={myClan.creator} />
                        <StatRow label="Your Role" value={isLeader ? "👑 Leader" : (clanMembers.find(m => m.username === account.username)?.role === "officer" ? "⭐ Officer" : "Member")} color={isLeader ? T.gold : T.textSec} />
                        <div style={{ marginTop: 14, display: "flex", gap: 8, flexWrap: "wrap" }}>
                          <Btn color={T.danger} small onClick={leaveClan} disabled={clanLoading}>🚪 Leave Clan</Btn>
                          {isLeader && (
                            <Btn color={T.danger} small onClick={() => {
                              if (confirm(`Are you sure you want to DISBAND [${myClan.tag}] ${myClan.displayName}? This cannot be undone!`)) disbandClan();
                            }} disabled={clanLoading}>💀 Disband Clan</Btn>
                          )}
                        </div>
                      </Card>
                    </div>
                  )}

                  {/* Members tab */}
                  {clanTab === "members" && (
                    <Card>
                      <div style={{
                        display: "grid", gridTemplateColumns: isLeader ? "40px 1fr 90px 80px 120px" : "40px 1fr 80px 80px",
                        padding: "8px 12px", borderBottom: `1px solid ${T.divider}`,
                        fontSize: 10, fontWeight: 700, color: T.textDim, textTransform: "uppercase", letterSpacing: 0.5,
                      }}>
                        <span>#</span><span>Player</span><span style={{ textAlign: "right" }}>Role</span><span style={{ textAlign: "right" }}>Joined</span>
                        {isLeader && <span style={{ textAlign: "right" }}>Actions</span>}
                      </div>
                      {clanMembers.map((m, i) => {
                        const isMe = m.username === account.username;
                        const lb = lbData.find(e => e.displayName === m.displayName);
                        const roleColor = m.role === "leader" ? T.gold : m.role === "officer" ? T.orange : T.textDim;
                        const roleLabel = m.role === "leader" ? "👑 Leader" : m.role === "officer" ? "⭐ Officer" : "Member";
                        return (
                          <div key={i} style={{
                            display: "grid", gridTemplateColumns: isLeader ? "40px 1fr 90px 80px 120px" : "40px 1fr 80px 80px",
                            padding: "10px 12px", alignItems: "center",
                            borderBottom: i < clanMembers.length - 1 ? `1px solid ${T.divider}` : "none",
                            background: isMe ? T.accent + "08" : "transparent",
                          }}>
                            <span style={{ fontSize: 12, fontWeight: 700, color: T.textDim }}>{i + 1}</span>
                            <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                              <div style={{
                                width: 26, height: 26, borderRadius: 99, flexShrink: 0,
                                background: roleColor + "20",
                                display: "flex", alignItems: "center", justifyContent: "center",
                                fontSize: 11, fontWeight: 700, color: roleColor,
                              }}>{(m.displayName || "?")[0].toUpperCase()}</div>
                              <div style={{ minWidth: 0 }}>
                                <div style={{ fontSize: 12, fontWeight: 600, color: isMe ? T.accent : T.white, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                  {m.displayName}{isMe && <span style={{ fontSize: 9, color: T.accent, marginLeft: 4 }}>(you)</span>}
                                </div>
                                <div style={{ fontSize: 10, color: T.textDim }}>Lv {lb?.totalLevel || "?"}</div>
                              </div>
                            </div>
                            <div style={{ textAlign: "right" }}>
                              <Badge color={roleColor}>{roleLabel}</Badge>
                            </div>
                            <div style={{ textAlign: "right", fontSize: 10, color: T.textDim }}>
                              {new Date(m.joined).toLocaleDateString()}
                            </div>
                            {isLeader && (
                              <div style={{ display: "flex", gap: 4, justifyContent: "flex-end" }}>
                                {!isMe && m.role === "member" && (
                                  <span onClick={() => promoteMember(m.username, "officer")} style={{
                                    fontSize: 9, padding: "2px 6px", borderRadius: 4, cursor: "pointer",
                                    background: T.orange + "15", color: T.orange, fontWeight: 700,
                                  }}>⬆ Promote</span>
                                )}
                                {!isMe && m.role === "officer" && (
                                  <>
                                    <span onClick={() => promoteMember(m.username, "member")} style={{
                                      fontSize: 9, padding: "2px 6px", borderRadius: 4, cursor: "pointer",
                                      background: T.textDim + "15", color: T.textDim, fontWeight: 700,
                                    }}>⬇ Demote</span>
                                    <span onClick={() => {
                                      if (confirm(`Transfer leadership to ${m.displayName}? You will become Officer.`)) transferLeader(m.username);
                                    }} style={{
                                      fontSize: 9, padding: "2px 6px", borderRadius: 4, cursor: "pointer",
                                      background: T.gold + "15", color: T.gold, fontWeight: 700,
                                    }}>👑 Lead</span>
                                  </>
                                )}
                                {!isMe && m.role !== "leader" && (
                                  <span onClick={() => {
                                    if (confirm(`Kick ${m.displayName} from the clan?`)) kickMember(m.username);
                                  }} style={{
                                    fontSize: 9, padding: "2px 6px", borderRadius: 4, cursor: "pointer",
                                    background: T.danger + "15", color: T.danger, fontWeight: 700,
                                  }}>✕ Kick</span>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </Card>
                  )}
                </div>
              );
            }

            // ── No clan: browse/create ──
            const noClanTabs = [
              { id: "browse", label: "Browse Clans", icon: "🔍" },
              { id: "create", label: "Create Clan", icon: "✨" },
            ];

            return (
              <div>
                <PageTitle icon="🏰" title="Clans" subtitle="Join a clan or create your own" />

                <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
                  {noClanTabs.map(t => (
                    <div key={t.id} onClick={() => { setClanTab(t.id); setClanError(""); if (t.id === "browse") fetchClanList(); }} style={{
                      padding: "7px 14px", borderRadius: T.rs,
                      background: clanTab === t.id ? T.purple + "20" : T.bgDeep,
                      border: `1px solid ${clanTab === t.id ? T.purple + "50" : T.divider}`,
                      color: clanTab === t.id ? T.purple : T.textSec,
                      fontSize: 12, fontWeight: 600, cursor: "pointer",
                    }}>{t.icon} {t.label}</div>
                  ))}
                </div>

                {/* Browse */}
                {clanTab === "browse" && (
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                      <div style={{ fontSize: 12, color: T.textSec }}>{clanList.length} clan{clanList.length !== 1 ? "s" : ""} found</div>
                      <Btn color={T.accent} small onClick={fetchClanList} disabled={clanLoading}>🔄 Refresh</Btn>
                    </div>
                    {clanList.length === 0 ? (
                      <Card style={{ textAlign: "center", padding: "40px 0" }}>
                        <div style={{ fontSize: 28, marginBottom: 8 }}>🏰</div>
                        <div style={{ fontSize: 13, color: T.textDim }}>{clanLoading ? "Loading clans..." : "No clans yet. Be the first to create one!"}</div>
                      </Card>
                    ) : (
                      <div style={{ display: "grid", gridTemplateColumns: `repeat(auto-fill, minmax(${isMobile ? "100%" : "280px"}, 1fr))`, gap: 10 }}>
                        {clanList.map((c, i) => (
                          <Card key={i}>
                            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                              <div style={{
                                width: 40, height: 40, borderRadius: T.rs,
                                background: T.purple + "15", display: "flex", alignItems: "center", justifyContent: "center",
                                fontSize: 14, fontWeight: 900, color: T.purple, border: `1px solid ${T.purple}25`,
                              }}>{c.tag}</div>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontSize: 13, fontWeight: 700, color: T.white }}>{c.displayName || c.name}</div>
                                <div style={{ fontSize: 11, color: T.textDim }}>{c.desc || "No description"}</div>
                              </div>
                            </div>
                            <div style={{ display: "flex", gap: 12, fontSize: 11, color: T.textSec, marginBottom: 10 }}>
                              <span>👥 {c.memberCount} member{c.memberCount !== 1 ? "s" : ""}</span>
                              <span>📅 {new Date(c.created).toLocaleDateString()}</span>
                            </div>
                            <Btn color={T.purple} small onClick={() => joinClan(c.name)} disabled={clanLoading}>Join Clan</Btn>
                          </Card>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Create */}
                {clanTab === "create" && (
                  <Card style={{ maxWidth: 400 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: T.white, marginBottom: 4 }}>Create a New Clan</div>
                    <div style={{ fontSize: 11, color: T.textDim, marginBottom: 16 }}>Costs <span style={{ color: T.gold, fontWeight: 700 }}>500 gold</span> (you have {fmt(gold)})</div>

                    <div style={{ marginBottom: 12 }}>
                      <label style={labelStyle}>Clan Name</label>
                      <input type="text" value={clanForm.name} onChange={e => setClanForm(f => ({ ...f, name: e.target.value }))}
                        placeholder="e.g. DragonSlayers" style={inputStyle} />
                    </div>
                    <div style={{ marginBottom: 12 }}>
                      <label style={labelStyle}>Tag (2-5 chars)</label>
                      <input type="text" value={clanForm.tag} onChange={e => setClanForm(f => ({ ...f, tag: e.target.value.slice(0, 5) }))}
                        placeholder="e.g. DS" style={inputStyle} maxLength={5} />
                      {clanForm.tag && (
                        <div style={{ fontSize: 11, color: T.purple, marginTop: 4 }}>
                          Preview: <span style={{ fontWeight: 800 }}>[{clanForm.tag.toUpperCase()}]</span> {clanForm.name || "YourClan"}
                        </div>
                      )}
                    </div>
                    <div style={{ marginBottom: 16 }}>
                      <label style={labelStyle}>Description (optional)</label>
                      <input type="text" value={clanForm.desc} onChange={e => setClanForm(f => ({ ...f, desc: e.target.value }))}
                        placeholder="What's your clan about?" style={inputStyle} />
                    </div>
                    {clanError && <div style={{ fontSize: 12, color: T.danger, marginBottom: 12, padding: "8px 10px", background: T.dangerMuted, borderRadius: 6 }}>{clanError}</div>}
                    <Btn color={T.purple} onClick={createClan} disabled={clanLoading || gold < 500}>
                      {clanLoading ? "Creating..." : "🏰 Create Clan (500g)"}
                    </Btn>
                  </Card>
                )}
              </div>
            );
          })()}

          {/* ════ LEADERBOARD ════ */}
          {page === "leaderboard" && (() => {
            const lbTabs = [
              { id: "totalLevel", label: "Total Level", icon: "🏆" },
              { id: "kills", label: "Kills", icon: "💀" },
              { id: "gold", label: "Gold", icon: "💰" },
              ...SKILL_IDS.map(id => ({ id, label: SKILLS_CONFIG[id].name, icon: SKILLS_CONFIG[id].icon })),
            ];

            const sorted = [...lbData].sort((a, b) => {
              if (lbTab === "totalLevel") return b.totalLevel - a.totalLevel;
              if (lbTab === "kills") return (b.kills || 0) - (a.kills || 0);
              if (lbTab === "gold") return (b.gold || 0) - (a.gold || 0);
              return (b.skills?.[lbTab] || 1) - (a.skills?.[lbTab] || 1);
            });

            const getValue = (entry) => {
              if (lbTab === "totalLevel") return entry.totalLevel;
              if (lbTab === "kills") return entry.kills || 0;
              if (lbTab === "gold") return entry.gold || 0;
              return entry.skills?.[lbTab] || 1;
            };

            const medalColors = ["#FFD700", "#C0C0C0", "#CD7F32"];
            const medalEmoji = ["🥇", "🥈", "🥉"];
            const activeTabObj = lbTabs.find(t => t.id === lbTab);

            return (
              <div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
                  <PageTitle icon="🏆" title="Leaderboard" subtitle={`${lbData.length} player${lbData.length !== 1 ? "s" : ""}`} />
                  <Btn color={T.accent} small onClick={fetchLeaderboard} disabled={lbLoading}>
                    {lbLoading ? "Loading..." : "🔄 Refresh"}
                  </Btn>
                </div>

                {/* Category tabs */}
                <Card style={{ marginBottom: 14, padding: "10px 12px" }}>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {lbTabs.map(t => (
                      <div key={t.id} onClick={() => setLbTab(t.id)} style={{
                        padding: "5px 10px", borderRadius: T.rs,
                        background: lbTab === t.id ? T.gold + "20" : T.bgDeep,
                        border: `1px solid ${lbTab === t.id ? T.gold + "50" : T.divider}`,
                        color: lbTab === t.id ? T.gold : T.textSec,
                        fontSize: 11, fontWeight: 600, cursor: "pointer",
                        transition: "all 0.12s",
                        display: "flex", alignItems: "center", gap: 4,
                      }}>
                        <span style={{ fontSize: 12 }}>{t.icon}</span>
                        {t.label}
                      </div>
                    ))}
                  </div>
                </Card>

                {/* Table */}
                <Card>
                  {/* Header */}
                  <div style={{
                    display: "grid", gridTemplateColumns: "40px 1fr 100px",
                    padding: "8px 12px", borderBottom: `1px solid ${T.divider}`,
                    fontSize: 10, fontWeight: 700, color: T.textDim, textTransform: "uppercase", letterSpacing: 0.5,
                  }}>
                    <span>#</span>
                    <span>Player</span>
                    <span style={{ textAlign: "right" }}>{activeTabObj?.label || "Value"}</span>
                  </div>

                  {sorted.length === 0 ? (
                    <div style={{ textAlign: "center", padding: "40px 0", color: T.textDim }}>
                      <div style={{ fontSize: 28, marginBottom: 8 }}>🏆</div>
                      <div style={{ fontSize: 13 }}>{lbLoading ? "Loading leaderboard..." : "No players yet. Be the first!"}</div>
                    </div>
                  ) : (
                    sorted.map((entry, i) => {
                      const isMe = entry.displayName === (account.displayName || account.username);
                      const val = getValue(entry);
                      const rank = i + 1;
                      return (
                        <div key={i} style={{
                          display: "grid", gridTemplateColumns: "40px 1fr 100px",
                          padding: "10px 12px", alignItems: "center",
                          borderBottom: i < sorted.length - 1 ? `1px solid ${T.divider}` : "none",
                          background: isMe ? T.accent + "08" : rank <= 3 ? `${medalColors[i]}08` : "transparent",
                          transition: "background 0.15s",
                        }}>
                          {/* Rank */}
                          <div style={{ display: "flex", alignItems: "center" }}>
                            {rank <= 3 ? (
                              <span style={{ fontSize: 16 }}>{medalEmoji[i]}</span>
                            ) : (
                              <span style={{ fontSize: 13, fontWeight: 700, color: T.textDim }}>{rank}</span>
                            )}
                          </div>
                          {/* Player */}
                          <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                            <div style={{
                              width: 28, height: 28, borderRadius: 99, flexShrink: 0,
                              background: isMe ? T.accent + "20" : T.bar,
                              display: "flex", alignItems: "center", justifyContent: "center",
                              fontSize: 12, fontWeight: 700,
                              color: isMe ? T.accent : T.textSec,
                              border: isMe ? `1px solid ${T.accent}40` : "none",
                            }}>
                              {(entry.displayName || "?")[0].toUpperCase()}
                            </div>
                            <div style={{ minWidth: 0 }}>
                              <div style={{
                                fontSize: 12, fontWeight: isMe ? 700 : 600,
                                color: isMe ? T.accent : T.white,
                                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                              }}>
                                {entry.clan && <span style={{ fontSize: 9, fontWeight: 800, color: T.purple, marginRight: 4 }}>[{entry.clan.tag}]</span>}
                                {entry.displayName || "Unknown"}
                                {isMe && <span style={{ fontSize: 9, color: T.accent, marginLeft: 6 }}>(you)</span>}
                              </div>
                              <div style={{ fontSize: 10, color: T.textDim }}>
                                Total Lv {entry.totalLevel}
                                {lbTab !== "kills" && <span> · {entry.kills || 0} kills</span>}
                              </div>
                            </div>
                          </div>
                          {/* Value */}
                          <div style={{ textAlign: "right" }}>
                            <span style={{
                              fontSize: 15, fontWeight: 800,
                              color: rank === 1 ? T.gold : rank <= 3 ? T.white : isMe ? T.accent : T.text,
                            }}>
                              {fmt(val)}
                            </span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </Card>
              </div>
            );
          })()}

          {/* ════ LOG ════ */}
          {page === "log" && (
            <div>
              <PageTitle icon="📜" title="Activity Log" />
              <Card>
                {log.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "40px 0", color: T.textDim, fontSize: 13 }}>No activity yet — equip items or use consumables to see log entries.</div>
                ) : (
                  [...log].reverse().map((entry, i) => (
                    <div key={i} style={{
                      fontSize: 12.5, padding: "8px 0",
                      borderBottom: i < log.length - 1 ? `1px solid ${T.divider}` : "none",
                      color: i === 0 ? T.text : T.textSec,
                      opacity: Math.max(0.4, 1 - i * 0.04),
                    }}>{entry.m}</div>
                  ))
                )}
              </Card>
            </div>
          )}
        </div>
      </div>

      <style>{`
        * { box-sizing: border-box; margin: 0; }
        body { margin: 0; background: ${T.bg}; overflow: hidden; }
        ::-webkit-scrollbar { width: 7px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: ${T.bar}; border-radius: 4px; }
        ::-webkit-scrollbar-thumb:hover { background: ${T.textDim}; }
        button:hover:not(:disabled) { filter: brightness(1.12); }
        button:active:not(:disabled) { transform: scale(0.97); }
      `}</style>
    </div>
  );
}
