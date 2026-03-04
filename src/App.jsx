import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { auth, db } from './firebase.js';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';

const FONT = "'Orbitron', 'Segoe UI', system-ui, sans-serif";
const FONT_BODY = "'Inter', system-ui, sans-serif";

const C = {
  bg: "#021218", panel: "#031926", card: "#042233", border: "#0a3a50",
  text: "#a8d8ea", ts: "#5a9fb5", td: "#2d6a80",
  acc: "#00d4ff", accD: "#0097b8",
  ok: "#00ffb3", okD: "#00c285",
  bad: "#ff006e", badD: "#cc0055",
  warn: "#ffb700", gold: "#ffd60a",
  purp: "#7b61ff", white: "#e0f7ff",
};
const GLOW_STYLE = "0 0 8px #00d4ff55, 0 0 20px #00d4ff22";
const GLOW_OK = "0 0 8px #00ffb355";
const GLOW_BAD = "0 0 8px #ff006e55";

const MAX_SKILL_LV = 120;
// XP needed to advance from level lv → lv+1
// Early levels are fast, late levels (80-120) are a real grind
function xpFor(lv){
  if(lv<1)return 50;
  if(lv>=MAX_SKILL_LV)return Infinity; // capped
  if(lv<=50) return Math.floor(50*Math.pow(1.12,lv-1));
  if(lv<=80) return Math.floor(50*Math.pow(1.12,49)*Math.pow(1.18,lv-50));
  return Math.floor(50*Math.pow(1.12,49)*Math.pow(1.18,30)*Math.pow(1.25,lv-80));
}
function fmt(n){if(n>=1e9)return(n/1e9).toFixed(1)+"B";if(n>=1e6)return(n/1e6).toFixed(1)+"M";if(n>=1e3)return(n/1e3).toFixed(1)+"K";return String(Math.floor(n))}

// ===================== RESEARCH TREE =====================
const RESEARCH_TREE = {
  agriculture: [
    {id:"ag1",name:"Kelp Growth I",    icon:"🌿",tier:1,cost:50,  prereqs:[],      desc:"Kelp yield +25%",          effect:{kelp_yield:0.25}},
    {id:"ag2",name:"Ocean Fertilizers",icon:"💧",tier:2,cost:120, prereqs:["ag1"], desc:"All gather yield +15%",     effect:{gather_yield:0.15}},
    {id:"ag3",name:"Kelp Growth II",   icon:"🌾",tier:3,cost:250, prereqs:["ag2"], desc:"Kelp yield +50% total",     effect:{kelp_yield:0.25}},
    {id:"ag4",name:"Advanced Hydroponics",icon:"🏭",tier:4,cost:500,prereqs:["ag3"],desc:"Gather speed +20%",        effect:{gather_speed:0.20}},
  ],
  energy: [
    {id:"en1",name:"Biofuel Efficiency",icon:"🟩",tier:1,cost:60, prereqs:[],      desc:"Energy regen +20%",         effect:{energy_regen:0.20}},
    {id:"en2",name:"Pressure Reactors", icon:"⚡",tier:2,cost:140,prereqs:["en1"], desc:"Max energy +50",            effect:{max_energy:50}},
    {id:"en3",name:"Thermal Energy",    icon:"🔥",tier:3,cost:300,prereqs:["en2"], desc:"Energy regen +40% total",   effect:{energy_regen:0.20}},
    {id:"en4",name:"Zero-Point Core",   icon:"🌀",tier:4,cost:600,prereqs:["en3"], desc:"Max energy +100 total",     effect:{max_energy:50}},
  ],
  combat: [
    {id:"cb1",name:"Harpoon Upgrades",  icon:"🗡️",tier:1,cost:80, prereqs:[],      desc:"ATK +10%",                  effect:{atk_pct:0.10}},
    {id:"cb2",name:"Drone Combat Sys.", icon:"🤖",tier:2,cost:180,prereqs:["cb1"], desc:"Combat XP +25%",            effect:{combat_xp:0.25}},
    {id:"cb3",name:"Sonic Weapons",     icon:"🔊",tier:3,cost:350,prereqs:["cb2"], desc:"ATK +20% total",            effect:{atk_pct:0.10}},
    {id:"cb4",name:"Leviathan Protocol",icon:"🐉",tier:4,cost:700,prereqs:["cb3"], desc:"Boss drop rate +50%",       effect:{boss_drop:0.50}},
  ],
  civilization: [
    {id:"cv1",name:"Advanced Structures",icon:"🏗️",tier:1,cost:100,prereqs:[],     desc:"Production speed +15%",    effect:{prod_speed:0.15}},
    {id:"cv2",name:"Trade Networks",    icon:"🔄",tier:2,cost:220,prereqs:["cv1"], desc:"Credits from kills +25%",  effect:{gold_pct:0.25}},
    {id:"cv3",name:"Colony Logistics",  icon:"📦",tier:3,cost:400,prereqs:["cv2"], desc:"Prod speed +30% total",    effect:{prod_speed:0.15}},
    {id:"cv4",name:"Deep Governance",   icon:"🏛️",tier:4,cost:800,prereqs:["cv3"], desc:"All XP gains +20%",        effect:{xp_pct:0.20}},
  ],
  ancient: [
    {id:"an1",name:"Alien Materials",   icon:"🪨",tier:1,cost:150,prereqs:[],      desc:"Rare item chance +10%",    effect:{rare_chance:0.10}},
    {id:"an2",name:"Ancient Weapons",   icon:"⚔️",tier:2,cost:320,prereqs:["an1"], desc:"ATK & DEF +15%",           effect:{atk_pct:0.075,def_pct:0.075}},
    {id:"an3",name:"Relic Reactivation",icon:"🔮",tier:3,cost:650,prereqs:["an2"], desc:"Abyss Crystal yield ×2",   effect:{crystal_yield:1.0}},
    {id:"an4",name:"Void Synthesis",    icon:"🌌",tier:4,cost:1200,prereqs:["an3"],desc:"All stats +10%, XP +10%",  effect:{atk_pct:0.05,def_pct:0.05,xp_pct:0.10}},
  ],
};
const ALL_RESEARCH = Object.values(RESEARCH_TREE).flat();
const BRANCH_META = {
  agriculture:{label:"Agriculture",   color:"#00ffb3"},
  energy:      {label:"Energy",        color:"#ffb700"},
  combat:      {label:"Combat",        color:"#ff006e"},
  civilization:{label:"Civilization",  color:"#00d4ff"},
  ancient:     {label:"Ancient Tech",  color:"#7b61ff"},
};

// ===================== STRUCTURES =====================
const STRUCTURES = [
  {
    id: "kelp_farm",
    name: "Kelp Farm",
    icon: "🌿",
    color: "#00ffb3",
    desc: "Automated kelp cultivation. Passively generates kelp every 8s.",
    category: "production",
    cost: { gold: 200, kelp: 50, coral_blocks: 10 },
    maxLevel: 5,
    levelCost: (lv) => ({ gold: Math.floor(150 * Math.pow(2, lv)), coral_blocks: lv * 5, biofuel: lv * 3 }),
    passive: { item: "kelp", baseQty: 1, interval: 8000, qtyPerLevel: 1 },
    bonus: { gather_yield: 0.05 }, // per level
    desc2: (lv) => `+${lv} kelp / 8s · Gather yield +${lv*5}%`,
  },
  {
    id: "coral_refinery",
    name: "Coral Refinery",
    icon: "🪸",
    color: "#ff6b9d",
    desc: "Refines coral into usable blocks automatically.",
    category: "production",
    cost: { gold: 350, soft_coral: 80, trench_stone: 20 },
    maxLevel: 5,
    levelCost: (lv) => ({ gold: Math.floor(250 * Math.pow(2, lv)), soft_coral: lv * 20, reinforced_alloy: lv * 2 }),
    passive: { item: "coral_blocks", baseQty: 1, interval: 12000, qtyPerLevel: 1 },
    bonus: { prod_speed: 0.04 },
    desc2: (lv) => `+${lv} coral blocks / 12s · Prod speed +${lv*4}%`,
  },
  {
    id: "biofuel_reactor",
    name: "Biofuel Reactor",
    icon: "⚡",
    color: "#ffb700",
    desc: "Converts biomass into energy. Boosts energy regen.",
    category: "energy",
    cost: { gold: 500, biofuel: 30, pressure_glass: 5 },
    maxLevel: 5,
    levelCost: (lv) => ({ gold: Math.floor(400 * Math.pow(2, lv)), biofuel: lv * 10, enzyme_compound: lv * 2 }),
    passive: null,
    bonus: { energy_regen: 0.10 },
    desc2: (lv) => `Energy regen +${lv*10}% · Max energy +${lv*20}`,
    bonusExtra: { max_energy: 20 },
  },
  {
    id: "drone_factory",
    name: "Drone Factory",
    icon: "🤖",
    color: "#00d4ff",
    desc: "Manufactures drone processors. Boosts combat effectiveness.",
    category: "combat",
    cost: { gold: 800, reinforced_alloy: 15, drone_processor: 3 },
    maxLevel: 5,
    levelCost: (lv) => ({ gold: Math.floor(600 * Math.pow(2, lv)), reinforced_alloy: lv * 8, pressure_glass: lv * 3 }),
    passive: { item: "drone_processor", baseQty: 1, interval: 30000, qtyPerLevel: 0 },
    bonus: { combat_xp: 0.08, atk_pct: 0.03 },
    desc2: (lv) => `+1 drone processor / 30s · Combat XP +${lv*8}% · ATK +${lv*3}%`,
  },
  {
    id: "research_lab",
    name: "Research Lab",
    icon: "🔬",
    color: "#7b61ff",
    desc: "Advanced research facility. Accelerates RP generation.",
    category: "research",
    cost: { gold: 600, abyss_crystal: 5, drone_processor: 2 },
    maxLevel: 5,
    levelCost: (lv) => ({ gold: Math.floor(450 * Math.pow(2, lv)), abyss_crystal: lv * 2, luminescent_gel: lv * 3 }),
    passive: null,
    bonus: { rp_gen: 1 }, // +rp per tick per level
    desc2: (lv) => `+${lv} RP / 10s · XP gains +${lv*5}%`,
    bonusExtra: { xp_pct: 0.05 },
  },
  {
    id: "pressure_reactor",
    name: "Pressure Reactor",
    icon: "🔵",
    color: "#c084fc",
    desc: "Harnesses deep pressure for power. Reduces pressure buildup.",
    category: "energy",
    cost: { gold: 1000, pressure_glass: 10, pressure_reactor: 2 },
    maxLevel: 5,
    levelCost: (lv) => ({ gold: Math.floor(750 * Math.pow(2, lv)), pressure_glass: lv * 5, thermal_ore: lv * 10 }),
    passive: null,
    bonus: { pressure_resist: 0.15 }, // reduces pressure gain rate
    desc2: (lv) => `Pressure build-up -${lv*15}% · Max energy +${lv*30}`,
    bonusExtra: { max_energy: 30 },
  },
  {
    id: "artifact_archive",
    name: "Artifact Archive",
    icon: "🏛️",
    color: "#ffd60a",
    desc: "Stores and analyzes artifacts. Boosts rare item chances.",
    category: "research",
    cost: { gold: 750, trench_stone: 30, abyss_crystal: 3 },
    maxLevel: 5,
    levelCost: (lv) => ({ gold: Math.floor(550 * Math.pow(2, lv)), trench_stone: lv * 15, abyss_crystal: lv * 1 }),
    passive: null,
    bonus: { rare_chance: 0.04, crystal_yield: 0.20 },
    desc2: (lv) => `Rare item chance +${lv*4}% · Crystal yield +${(lv*0.2).toFixed(1)}×`,
  },
  {
    id: "defense_platform",
    name: "Defense Platform",
    icon: "🛡️",
    color: "#ff006e",
    desc: "Automated defense turrets. Boosts combat stats significantly.",
    category: "combat",
    cost: { gold: 1200, reinforced_alloy: 25, pressure_reactor: 3, shell_shield: 1 },
    maxLevel: 5,
    levelCost: (lv) => ({ gold: Math.floor(900 * Math.pow(2, lv)), reinforced_alloy: lv * 12, drone_processor: lv * 2 }),
    passive: null,
    bonus: { atk_pct: 0.06, def_pct: 0.06 },
    desc2: (lv) => `ATK +${lv*6}% · DEF +${lv*6}%`,
  },
];

const STRUCT_CATEGORIES = {
  production: { label: "Production", color: "#00ffb3" },
  energy:     { label: "Energy",     color: "#ffb700" },
  combat:     { label: "Combat",     color: "#ff006e" },
  research:   { label: "Research",   color: "#7b61ff" },
};

// ===================== DRONES =====================
const DRONE_TYPES = [
  {
    id: "harvest_drone",
    name: "Harvest Drone",
    icon: "🌾",
    color: "#00ffb3",
    desc: "Automatically harvests kelp and coral every 15s.",
    unlockItem: "drone_processor",
    deployCost: { drone_processor: 2, coral_blocks: 8 },
    maxDeployed: 5,
    action: "gather",
    outputs: [{ id: "kelp", q: 2 }, { id: "soft_coral", q: 1 }],
    interval: 15000,
    xpSkill: "kelp_farming",
    xpAmt: 5,
  },
  {
    id: "mining_drone",
    name: "Mining Drone",
    icon: "⛏️",
    color: "#7b61ff",
    desc: "Mines ores and stone from the deep automatically.",
    unlockItem: "drone_processor",
    deployCost: { drone_processor: 2, reinforced_alloy: 5 },
    maxDeployed: 5,
    action: "gather",
    outputs: [{ id: "trench_stone", q: 2 }, { id: "thermal_ore", q: 1 }],
    interval: 18000,
    xpSkill: "deep_mining",
    xpAmt: 6,
  },
  {
    id: "fishing_drone",
    name: "Fishing Drone",
    icon: "🐟",
    color: "#00d4ff",
    desc: "Autonomously fishes for glowfish and sea creatures.",
    unlockItem: "drone_processor",
    deployCost: { drone_processor: 2, ocean_fiber: 10 },
    maxDeployed: 5,
    action: "gather",
    outputs: [{ id: "glowfish", q: 2 }, { id: "shell_fragments", q: 1 }],
    interval: 14000,
    xpSkill: "bioluminescent_fishing",
    xpAmt: 5,
  },
  {
    id: "combat_drone",
    name: "Combat Drone",
    icon: "🤖",
    color: "#ff006e",
    desc: "Patrols and fights enemies, earning credits and XP.",
    unlockItem: "drone_processor",
    deployCost: { drone_processor: 3, pressure_glass: 3 },
    maxDeployed: 3,
    action: "combat",
    outputs: [{ id: null, q: 0 }], // earns gold instead
    interval: 20000,
    goldPerKill: 8,
    xpSkill: "harpoon_mastery",
    xpAmt: 12,
  },
  {
    id: "explorer_drone",
    name: "Explorer Drone",
    icon: "🔭",
    color: "#ffd60a",
    desc: "Explores the ocean, occasionally finding rare materials.",
    unlockItem: "drone_processor",
    deployCost: { drone_processor: 3, abyss_crystal: 1 },
    maxDeployed: 3,
    action: "explore",
    outputs: [{ id: "abyss_crystal", q: 1, chance: 0.2 }, { id: "thermal_ore", q: 2, chance: 0.5 }, { id: "trench_stone", q: 3, chance: 0.8 }],
    interval: 25000,
    xpSkill: "artifact_research",
    xpAmt: 8,
  },
];

// ===================== PRESTIGE =====================
// Ascension requires total skill level sum >= threshold
const ASCENSION_THRESHOLDS = [100, 250, 500, 900, 1500]; // cumulative skill levels per ascension

const PRESTIGE_UPGRADES = [
  {
    id: "pressure_mastery",
    name: "Pressure Mastery",
    icon: "💠",
    color: "#00d4ff",
    desc: "Reduces pressure build-up permanently across all ascensions.",
    maxLevel: 10,
    costPerLevel: 1, // Ancient Data Cores
    effect: (lv) => ({ pressure_resist: lv * 0.08 }), // 8% per level
    effectDesc: (lv) => `Pressure build-up -${lv*8}%`,
  },
  {
    id: "drone_mastery",
    name: "Drone Efficiency",
    icon: "🤖",
    color: "#ff006e",
    desc: "Increases all drone output and reduces cycle time.",
    maxLevel: 10,
    costPerLevel: 1,
    effect: (lv) => ({ drone_efficiency: lv * 0.10 }),
    effectDesc: (lv) => `Drone yield +${lv*10}%`,
  },
  {
    id: "yield_mastery",
    name: "Resource Yield",
    icon: "🌿",
    color: "#00ffb3",
    desc: "Permanently boosts all resource gathering yields.",
    maxLevel: 10,
    costPerLevel: 2,
    effect: (lv) => ({ gather_yield: lv * 0.08, kelp_yield: lv * 0.05 }),
    effectDesc: (lv) => `Gather yield +${lv*8}%, Kelp +${lv*5}%`,
  },
  {
    id: "xp_mastery",
    name: "XP Multiplier",
    icon: "⭐",
    color: "#ffd60a",
    desc: "Multiplies all XP gains permanently.",
    maxLevel: 10,
    costPerLevel: 2,
    effect: (lv) => ({ xp_pct: lv * 0.10 }),
    effectDesc: (lv) => `All XP +${lv*10}%`,
  },
  {
    id: "combat_mastery",
    name: "Combat Legacy",
    icon: "⚔️",
    color: "#ff6b35",
    desc: "Permanent boost to ATK, DEF and combat XP.",
    maxLevel: 10,
    costPerLevel: 2,
    effect: (lv) => ({ atk_pct: lv * 0.05, def_pct: lv * 0.05, combat_xp: lv * 0.08 }),
    effectDesc: (lv) => `ATK/DEF +${lv*5}%, Combat XP +${lv*8}%`,
  },
  {
    id: "research_mastery",
    name: "Deep Knowledge",
    icon: "🔬",
    color: "#7b61ff",
    desc: "Accelerates RP generation and production speed permanently.",
    maxLevel: 10,
    costPerLevel: 3,
    effect: (lv) => ({ rp_gen: lv * 2, prod_speed: lv * 0.06 }),
    effectDesc: (lv) => `+${lv*2} RP/tick, Prod speed +${lv*6}%`,
  },
];

// ===================== RANDOM DISCOVERIES =====================
const DISCOVERIES = [
  { id:"ancient_wreck",   name:"Ancient Submarine Wreck",  icon:"🚢", rarity:0.04,
    desc:"You found an ancient submarine! Salvaging yields rare materials and ancient blueprints.",
    rewards:[{type:"item",id:"drone_processor",q:2},{type:"item",id:"reinforced_alloy",q:5},{type:"xp",mult:3},
             {type:"blueprint",pool:["bp_void_kelp","bp_leviathan_scale","bp_deep_scan","bp_supply_mastery"]}] },
  { id:"lost_facility",   name:"Lost Research Facility",   icon:"🏚️", rarity:0.03,
    desc:"A hidden research lab! You recover valuable data, components, and research blueprints.",
    rewards:[{type:"item",id:"abyss_crystal",q:2},{type:"item",id:"pressure_reactor",q:1},{type:"rp",amt:50},
             {type:"blueprint",pool:["bp_void_crystal","bp_ancient_brew","bp_atlas_complete"]}] },
  { id:"hidden_trench",   name:"Hidden Trench Cave",        icon:"🕳️", rarity:0.05,
    desc:"A concealed trench filled with rare minerals!",
    rewards:[{type:"item",id:"thermal_ore",q:8},{type:"item",id:"trench_stone",q:10},{type:"xp",mult:2}] },
  { id:"alien_bloom",     name:"Alien Coral Bloom",         icon:"🌸", rarity:0.06,
    desc:"A rare bioluminescent bloom! Harvesting yields bonus materials.",
    rewards:[{type:"item",id:"soft_coral",q:12},{type:"item",id:"luminescent_gel",q:3},{type:"xp",mult:2}] },
  { id:"signal_beacon",   name:"Deep Signal Beacon",        icon:"📡", rarity:0.02,
    desc:"An alien signal beacon — analyzing it grants rare knowledge and legendary blueprints.",
    rewards:[{type:"rp",amt:120},{type:"item",id:"artifact_scanner",q:1},{type:"xp",mult:4},
             {type:"blueprint",pool:["bp_thermal_forge","bp_void_reactor"]}] },
  { id:"crystal_vein",    name:"Crystal Vein Exposed",      icon:"💎", rarity:0.035,
    desc:"A massive abyss crystal vein is exposed! Also contains ancient construction schematics.",
    rewards:[{type:"item",id:"abyss_crystal",q:4},{type:"item",id:"salt_crystals",q:6},
             {type:"blueprint",pool:["bp_ancient_armor"]}] },
  { id:"thermal_pocket",  name:"Thermal Vent Pocket",       icon:"🔥", rarity:0.045,
    desc:"A superheated pocket bursts open, revealing thermal ore.",
    rewards:[{type:"item",id:"thermal_ore",q:6},{type:"item",id:"enzyme_compound",q:2},{type:"xp",mult:2}] },
];

// ===================== BLUEPRINTS =====================
// Hidden skill actions unlocked via discoveries or rare item use.
// Each blueprint adds an extra act to an existing skill once unlocked.
const BLUEPRINTS = [
  {
    id:"bp_void_kelp", skillId:"kelp_farming", icon:"🌀", rarity:"rare",
    name:"Void Kelp Cultivation",
    desc:"Ancient technique for cultivating void-infused kelp. Massive yield.",
    act:{id:"kf5",name:"Void Kelp Grove",lv:80,xp:300,t:8,out:[{id:"kelp",q:12},{id:"void_essence",q:1}]},
    source:"Ancient Submarine Wreck",
  },
  {
    id:"bp_leviathan_scale", skillId:"coral_harvesting", icon:"🐉", rarity:"rare",
    name:"Leviathan Scale Harvest",
    desc:"Carefully extract scales from leviathan remains — potent crafting material.",
    act:{id:"ch5",name:"Leviathan Scale Harvest",lv:90,xp:350,t:10,inp:[{id:"leviathan_bone",q:1}],out:[{id:"reinforced_alloy",q:5},{id:"alien_bio_tissue",q:1}]},
    source:"Ancient Submarine Wreck",
  },
  {
    id:"bp_void_crystal", skillId:"crystal_diving", icon:"💎", rarity:"epic",
    name:"Void Crystal Resonance",
    desc:"Resonate with void crystals to yield pure essence.",
    act:{id:"cd5",name:"Void Crystal Resonance",lv:95,xp:400,t:12,inp:[{id:"abyss_crystal",q:3}],out:[{id:"void_essence",q:2},{id:"abyss_crystal",q:5}]},
    source:"Lost Research Facility",
  },
  {
    id:"bp_ancient_brew", skillId:"bio_synthesis", icon:"🧬", rarity:"epic",
    name:"Ancient Healing Formula",
    desc:"A powerful healing formula recovered from a lost research facility.",
    act:{id:"bs5",name:"Ancient Healing Formula",lv:70,xp:250,t:10,inp:[{id:"alien_bio_tissue",q:1},{id:"void_pearl",q:1}],out:[{id:"pressure_tonic",q:3},{id:"bio_stim",q:2}]},
    source:"Lost Research Facility",
  },
  {
    id:"bp_thermal_forge", skillId:"relic_forging", icon:"🌋", rarity:"legendary",
    name:"Thermal Core Mastery",
    desc:"Master thermal core forging — double output from thermal processes.",
    act:{id:"rf9",name:"Thermal Core Mastery",lv:85,xp:450,t:14,inp:[{id:"thermal_ore",q:20},{id:"void_essence",q:1}],out:[{id:"thermal_core",q:3}]},
    source:"Deep Signal Beacon",
  },
  {
    id:"bp_void_reactor", skillId:"energy_systems", icon:"⚡", rarity:"legendary",
    name:"Void Reactor Blueprint",
    desc:"Harness void energy to produce massive amounts of pressure reactors.",
    act:{id:"es5",name:"Void Reactor Synthesis",lv:100,xp:500,t:16,inp:[{id:"void_essence",q:2},{id:"thermal_core",q:1},{id:"abyss_crystal",q:5}],out:[{id:"pressure_reactor",q:5},{id:"drone_processor",q:3}]},
    source:"Deep Signal Beacon",
  },
  {
    id:"bp_ancient_armor", skillId:"relic_forging", icon:"👑", rarity:"legendary",
    name:"Ancient Emperor Armor",
    desc:"Blueprints for the ancient emperor's armor — the pinnacle of defense.",
    act:{id:"rf10",name:"Emperor Armor",lv:110,xp:600,t:18,inp:[{id:"ancient_processor",q:3},{id:"void_essence",q:3},{id:"leviathan_bone",q:8},{id:"alien_bio_tissue",q:4}],out:[{id:"leviathan_armor",q:1},{id:"ancient_helm",q:1}]},
    source:"Crystal Vein Exposed",
  },
  {
    id:"bp_deep_scan", skillId:"scanning", icon:"📡", rarity:"rare",
    name:"Deep Void Scanner",
    desc:"Scan deep void pockets for rare essence deposits.",
    act:{id:"sc5",name:"Void Pocket Scan",lv:75,xp:300,t:12,inp:[{id:"resonance_crystal",q:3},{id:"void_pearl",q:1}],out:[{id:"void_essence",q:1},{id:"ancient_data_chip",q:1}],util:{type:"rare",val:0.15},desc:"Scan void pockets. +15% rare drops."},
    source:"Ancient Submarine Wreck",
  },
  {
    id:"bp_supply_mastery", skillId:"logistics", icon:"📦", rarity:"rare",
    name:"Void Supply Network",
    desc:"Build a void-powered supply network — extreme logistics efficiency.",
    act:{id:"lg5",name:"Void Supply Network",lv:80,xp:350,t:14,inp:[{id:"void_essence",q:1},{id:"ancient_data_chip",q:2}],out:[{id:"supply_crate",q:8}],util:{type:"gold",val:500},desc:"Void supply network. +500 credits per run."},
    source:"Ancient Submarine Wreck",
  },
  {
    id:"bp_atlas_complete", skillId:"ocean_cartography", icon:"🗺️", rarity:"epic",
    name:"Void Realm Atlas",
    desc:"Chart the void realms beyond the known ocean — yields impossible resources.",
    act:{id:"oc5",name:"Void Realm Atlas",lv:100,xp:500,t:18,inp:[{id:"void_map",q:3},{id:"void_essence",q:2}],out:[{id:"void_map",q:5},{id:"ancient_relic",q:2}],util:{type:"yield",val:0.40},desc:"Void realm atlas. +40% all yields permanently."},
    source:"Lost Research Facility",
  },
];

const BP_RARITY_COLOR = {rare:"#00d4ff", epic:"#c084fc", legendary:"#ffd60a"};

// ===================== TUTORIAL =====================
const TUTORIAL_STEPS = [
  {
    title:"Welcome to Deep Ocean Civilization",
    icon:"🌊",
    body:"You're the commander of a deep-sea exploration probe. Your mission: build a thriving underwater civilization from scratch. Let's walk through the basics.",
    highlight:null,
  },
  {
    title:"Gathering Resources",
    icon:"🌿",
    body:"Start by clicking a Gathering skill in the left nav — try Kelp Cultivation. Select an operation and press START to begin auto-gathering. Resources appear in your inventory.",
    highlight:"gather",
  },
  {
    title:"Crafting Items",
    icon:"🔧",
    body:"Production skills turn raw materials into useful items. Click a Production skill, check you have the required materials (shown under each operation), then START crafting.",
    highlight:"prod",
  },
  {
    title:"Research Points",
    icon:"🔬",
    body:"Research Points (RP) trickle in over time. Open Research Tree to spend them on permanent upgrades — faster gathering, better combat, stronger structures.",
    highlight:"research",
  },
  {
    title:"Building Structures",
    icon:"🏗️",
    body:"Structures generate resources passively — even when you're offline! Open Structures and build a Kelp Farm first. Upgrade it over time for greater yields.",
    highlight:"structures",
  },
  {
    title:"Combat Zones",
    icon:"⚔️",
    body:"Click Combat Zones in the nav to enter battle. Defeat enemies to earn Credits and XP for your combat skills. Every 10th kill is a Boss — bosses drop rare materials!",
    highlight:"combat",
  },
  {
    title:"Drone Fleet",
    icon:"🤖",
    body:"Drones automate your work — they gather, mine, fish, and fight 24/7. Deploy drones from the Drone Fleet page. They even work while you're offline!",
    highlight:"drones",
  },
  {
    title:"Discoveries & Blueprints",
    icon:"🔭",
    body:"While gathering you'll occasionally find Random Discoveries — ancient wrecks, lost labs, crystal veins. Some discoveries unlock secret Blueprints: powerful hidden operations!",
    highlight:null,
  },
  {
    title:"Ascension",
    icon:"✨",
    body:"Once your total skill level is high enough, you can Ascend. This resets resources but grants permanent Ancient Data Cores used to buy powerful upgrades that carry over forever.",
    highlight:"prestige",
  },
  {
    title:"You're Ready!",
    icon:"🚀",
    body:"That's everything! Gather → Craft → Research → Build → Fight → Automate → Ascend. The ocean is yours to conquer. Good luck, Commander!",
    highlight:null,
  },
];

// ===================== MARKETPLACE =====================
// Uses Firebase shared storage — orders visible to all players
// ===================== ACHIEVEMENTS =====================
const ACHIEVEMENTS = [
  // Gathering
  {id:"first_kelp",    cat:"gather", icon:"🌿", name:"First Harvest",       desc:"Gather your first kelp",                  check:(s)=>s.totalGathered>=1,         reward:{rp:10}},
  {id:"kelp100",       cat:"gather", icon:"🌿", name:"Kelp Farmer",         desc:"Gather 100 kelp",                         check:(s)=>s.kelp>=100,                 reward:{rp:25}},
  {id:"crystal10",     cat:"gather", icon:"💎", name:"Crystal Hunter",      desc:"Gather 10 abyss crystals",                check:(s)=>s.abyss_crystal>=10,         reward:{rp:50}},
  {id:"crystal100",    cat:"gather", icon:"💎", name:"Crystal Baron",       desc:"Gather 100 abyss crystals",               check:(s)=>s.abyss_crystal>=100,        reward:{rp:150}},
  {id:"discovery1",    cat:"gather", icon:"🔍", name:"Explorer",            desc:"Find your first discovery",               check:(s)=>s.discoveries>=1,            reward:{rp:30,gold:50}},
  {id:"discovery10",   cat:"gather", icon:"🔭", name:"Deep Explorer",       desc:"Find 10 discoveries",                     check:(s)=>s.discoveries>=10,           reward:{rp:100,gold:200}},
  // Combat
  {id:"first_kill",    cat:"combat", icon:"⚔️", name:"First Blood",         desc:"Defeat your first enemy",                 check:(s)=>s.kills>=1,                  reward:{rp:10}},
  {id:"kills50",       cat:"combat", icon:"⚔️", name:"Warrior",             desc:"Defeat 50 enemies",                       check:(s)=>s.kills>=50,                 reward:{rp:40,gold:100}},
  {id:"kills500",      cat:"combat", icon:"🗡️", name:"Veteran",             desc:"Defeat 500 enemies",                      check:(s)=>s.kills>=500,                reward:{rp:150,gold:500}},
  {id:"boss1",         cat:"combat", icon:"👑", name:"Boss Slayer",         desc:"Defeat your first boss",                  check:(s)=>s.bossKills>=1,              reward:{rp:60,gold:150}},
  {id:"boss10",        cat:"combat", icon:"🐉", name:"Leviathan Hunter",    desc:"Defeat 10 bosses",                        check:(s)=>s.bossKills>=10,             reward:{rp:200,gold:600}},
  {id:"gold1000",      cat:"combat", icon:"◈",  name:"Treasure Hunter",    desc:"Earn 1,000 credits",                      check:(s)=>s.totalGold>=1000,           reward:{rp:30}},
  {id:"gold100k",      cat:"combat", icon:"💰", name:"Credit Baron",        desc:"Earn 100,000 credits",                    check:(s)=>s.totalGold>=100000,         reward:{rp:200}},
  // Production
  {id:"craft10",       cat:"prod",   icon:"🔧", name:"Craftsman",           desc:"Complete 10 production actions",          check:(s)=>s.crafts>=10,                reward:{rp:20}},
  {id:"craft100",      cat:"prod",   icon:"⚙️", name:"Engineer",            desc:"Complete 100 production actions",         check:(s)=>s.crafts>=100,               reward:{rp:80,gold:200}},
  {id:"equip_full",    cat:"prod",   icon:"🛡️", name:"Fully Armed",         desc:"Fill all 8 equipment slots",              check:(s)=>s.equippedSlots>=8,          reward:{rp:100,gold:300}},
  // Research & Structures
  {id:"research5",     cat:"tech",   icon:"🔬", name:"Researcher",          desc:"Unlock 5 research nodes",                 check:(s)=>s.researched>=5,             reward:{rp:50}},
  {id:"research_all",  cat:"tech",   icon:"🧬", name:"Master Scientist",    desc:"Unlock all 20 research nodes",            check:(s)=>s.researched>=20,            reward:{rp:500,gold:1000}},
  {id:"build1",        cat:"tech",   icon:"🏗️", name:"Builder",             desc:"Build your first structure",              check:(s)=>s.structures>=1,             reward:{rp:40,gold:100}},
  {id:"build_all",     cat:"tech",   icon:"🏛️", name:"Architect",           desc:"Build all 8 structures",                  check:(s)=>s.structures>=8,             reward:{rp:300,gold:800}},
  // Drones
  {id:"drone1",        cat:"drone",  icon:"🤖", name:"Drone Operator",      desc:"Deploy your first drone",                 check:(s)=>s.dronesDeployed>=1,         reward:{rp:30}},
  {id:"drone10",       cat:"drone",  icon:"🚀", name:"Fleet Commander",     desc:"Have 10 drones deployed at once",         check:(s)=>s.dronesConcurrent>=10,      reward:{rp:150,gold:400}},
  // Ascension
  {id:"ascend1",       cat:"prestige",icon:"✨", name:"Ascended",            desc:"Complete your first ascension",           check:(s)=>s.ascensions>=1,             reward:{rp:200}},
  {id:"ascend3",       cat:"prestige",icon:"🌌", name:"Transcendent",        desc:"Ascend 3 times",                          check:(s)=>s.ascensions>=3,             reward:{rp:500,dataCores:1}},
  // Skill milestones
  {id:"skill50",       cat:"skill",  icon:"⭐", name:"Seasoned Diver",      desc:"Reach level 50 in any skill",             check:(s)=>s.maxSkillLv>=50,            reward:{rp:100,gold:250}},
  {id:"skill100",      cat:"skill",  icon:"🌟", name:"Master of the Deep",  desc:"Reach level 100 in any skill",            check:(s)=>s.maxSkillLv>=100,           reward:{rp:400,gold:1000,dataCores:1}},
  {id:"total500",      cat:"skill",  icon:"💫", name:"Legend",              desc:"Reach 500 total skill levels",            check:(s)=>s.totalSkillLv>=500,         reward:{rp:600,dataCores:2}},
];

const ACHIEVEMENT_CATS = {
  gather:  {label:"Gathering",  color:"#00ffb3"},
  combat:  {label:"Combat",     color:"#ff006e"},
  prod:    {label:"Production", color:"#ffd60a"},
  tech:    {label:"Technology", color:"#00d4ff"},
  drone:   {label:"Drones",     color:"#7b61ff"},
  prestige:{label:"Prestige",   color:"#ff9500"},
  skill:   {label:"Skills",     color:"#c084fc"},
};

// ===================== ITEMS =====================
const ITEMS={
  kelp:{n:"Kelp",i:"🌿",s:1}, soft_coral:{n:"Soft Coral",i:"🪸",s:1},
  glowfish:{n:"Glowfish",i:"🐟",s:1}, salt_crystals:{n:"Salt Crystals",i:"🔷",s:1},
  shell_fragments:{n:"Shell Fragments",i:"🐚",s:1}, thermal_ore:{n:"Thermal Ore",i:"🔶",s:1},
  abyss_crystal:{n:"Abyss Crystal",i:"💎",s:1}, ocean_fiber:{n:"Ocean Fiber",i:"🧵",s:1},
  sea_mushrooms:{n:"Sea Mushrooms",i:"🍄",s:1}, trench_stone:{n:"Trench Stone",i:"🪨",s:1},
  coral_blocks:{n:"Coral Blocks",i:"🟦",s:1}, reinforced_alloy:{n:"Reinforced Alloy",i:"⚙️",s:1},
  biofuel:{n:"Biofuel",i:"🟩",s:1}, pressure_glass:{n:"Pressure Glass",i:"🔮",s:1},
  enzyme_compound:{n:"Enzyme Compound",i:"🧪",s:1}, luminescent_gel:{n:"Luminescent Gel",i:"✨",s:1},
  drone_processor:{n:"Drone Processor",i:"📡",s:1}, pressure_reactor:{n:"Pressure Reactor",i:"⚡",s:1},
  coral_cutter:{n:"Coral Cutter",i:"🔪",s:1}, deep_drill:{n:"Deep Drill",i:"🔩",s:1},
  artifact_scanner:{n:"Artifact Scanner",i:"📟",s:1}, barnacles:{n:"Barnacles",i:"🦪",s:1},
  basic_harpoon:{n:"Basic Harpoon",i:"🗡️",eq:"weapon",st:{atk:8}},
  pulse_harpoon:{n:"Pulse Harpoon",i:"⚡",eq:"weapon",st:{atk:14,rng:4}},
  shock_harpoon:{n:"Shock Harpoon",i:"🌩️",eq:"weapon",st:{atk:18,rng:6}},
  thermal_lance:{n:"Thermal Lance",i:"🔥",eq:"weapon",st:{atk:26,mag:8}},
  coral_suit:{n:"Coral Suit",i:"🪸",eq:"body",st:{def:10,hp:20}},
  pressure_suit:{n:"Pressure Suit",i:"🔵",eq:"body",st:{def:18,hp:35}},
  abyss_armor:{n:"Abyss Armor",i:"🟣",eq:"body",st:{def:28,hp:50}},
  coral_helm:{n:"Coral Helm",i:"⛑️",eq:"head",st:{def:6,hp:12}},
  pressure_helm:{n:"Pressure Helm",i:"🪖",eq:"head",st:{def:12,hp:20}},
  depth_gloves:{n:"Depth Gloves",i:"🧤",eq:"hands",st:{atk:3,def:2}},
  pressure_boots:{n:"Pressure Boots",i:"👢",eq:"feet",st:{def:5}},
  shell_shield:{n:"Shell Shield",i:"🛡️",eq:"shield",st:{def:14,hp:18}},
  void_ring:{n:"Void Ring",i:"💍",eq:"ring",st:{atk:4,mag:4}},
  depth_pendant:{n:"Depth Pendant",i:"📿",eq:"neck",st:{def:5,hp:10}},
  healing_serum:{n:"Healing Serum",i:"💉",s:1,food:1,heal:20},
  kelp_broth:{n:"Kelp Broth",i:"🍵",s:1,food:1,heal:45},
  pressure_tonic:{n:"Pressure Tonic",i:"⚗️",s:1,food:1,heal:90},
  bio_stim:{n:"Bio Stim",i:"💊",s:1,food:1,heal:65},
  bioluminescent_drink:{n:"Bioluminescent Brew",i:"🫧",s:1,drink:1},
  deep_extract:{n:"Deep Extract",i:"🧬",s:1,drink:1},
  void_elixir:{n:"Void Elixir",i:"🌌",s:1,drink:1},
  // ── Rare materials ──
  leviathan_bone:{n:"Leviathan Bone",i:"🦴",s:1,rare:1},
  ancient_relic:{n:"Ancient Relic Fragment",i:"🗿",s:1,rare:1},
  void_pearl:{n:"Void Pearl",i:"🔵",s:1,rare:1},
  alien_bio_tissue:{n:"Alien Bio Tissue",i:"🧫",s:1,rare:1},
  thermal_core:{n:"Thermal Core",i:"🌋",s:1,rare:1},
  black_coral:{n:"Black Coral",i:"🖤",s:1,rare:1},
  ancient_processor:{n:"Ancient Processor",i:"🔲",s:1,rare:1},
  void_essence:{n:"Void Essence",i:"🌀",s:1,rare:1},
  // ── Utility crafted items ──
  nav_beacon:{n:"Navigation Beacon",i:"📍",s:1},
  scan_report:{n:"Scan Report",i:"📋",s:1},
  relic_shard:{n:"Relic Shard",i:"🧩",s:1},
  ocean_chart:{n:"Ocean Chart",i:"🗺️",s:1},
  supply_crate:{n:"Supply Crate",i:"📦",s:1,food:1,heal:150},
  resonance_crystal:{n:"Resonance Crystal",i:"🔮",s:1},
  ancient_data_chip:{n:"Ancient Data Chip",i:"💾",s:1},
  void_map:{n:"Void Map",i:"🌌",s:1},
  // ── Endgame equipment ──
  leviathan_spear:{n:"Leviathan Spear",i:"🔱",eq:"weapon",st:{atk:42,rng:12,mag:10}},
  leviathan_armor:{n:"Leviathan Armor",i:"🟠",eq:"body",st:{def:45,hp:100}},
  ancient_helm:{n:"Ancient Helm",i:"👑",eq:"head",st:{def:22,hp:40,mag:6}},
  void_gauntlets:{n:"Void Gauntlets",i:"🖐️",eq:"hands",st:{atk:12,def:8}},
  leviathan_ring:{n:"Leviathan Ring",i:"🔘",eq:"ring",st:{atk:10,mag:10,hp:20}},
  void_amulet:{n:"Void Amulet",i:"🌑",eq:"neck",st:{def:12,hp:25,mag:12}},
};

// ===================== SKILLS =====================
const SKILLS=[
  {id:"kelp_farming",name:"Kelp Cultivation",icon:"🌿",color:"#00c285",cat:"gather",acts:[
    {id:"kf1",name:"Reef Kelp Bed",lv:1,xp:10,t:3,out:[{id:"kelp",q:1}]},
    {id:"kf2",name:"Deep Kelp Grove",lv:10,xp:25,t:4,out:[{id:"kelp",q:2}]},
    {id:"kf3",name:"Thermal Kelp Farm",lv:25,xp:55,t:5,out:[{id:"kelp",q:3},{id:"sea_mushrooms",q:1}]},
    {id:"kf4",name:"Abyss Kelp Cluster",lv:50,xp:120,t:6,out:[{id:"kelp",q:5},{id:"sea_mushrooms",q:2}]}]},
  {id:"coral_harvesting",name:"Coral Harvesting",icon:"🪸",color:"#ff6b9d",cat:"gather",acts:[
    {id:"ch1",name:"Reef Coral",lv:1,xp:10,t:3,out:[{id:"soft_coral",q:1}]},
    {id:"ch2",name:"Deep Coral Formation",lv:10,xp:25,t:4,out:[{id:"soft_coral",q:2}]},
    {id:"ch3",name:"Black Coral",lv:25,xp:55,t:5,out:[{id:"soft_coral",q:2},{id:"shell_fragments",q:1}]},
    {id:"ch4",name:"Ancient Coral",lv:50,xp:120,t:6,out:[{id:"soft_coral",q:4},{id:"abyss_crystal",q:1}]}]},
  {id:"deep_mining",name:"Deep Mining",icon:"⛏️",color:"#7b61ff",cat:"gather",acts:[
    {id:"dm1",name:"Reef Sandstone",lv:1,xp:10,t:3,out:[{id:"trench_stone",q:1}]},
    {id:"dm2",name:"Midnight Shelf",lv:10,xp:25,t:4,out:[{id:"thermal_ore",q:1}]},
    {id:"dm3",name:"Abyssal Veins",lv:25,xp:55,t:5,out:[{id:"thermal_ore",q:2},{id:"salt_crystals",q:1}]},
    {id:"dm4",name:"Trench Core Drill",lv:50,xp:120,t:6,out:[{id:"abyss_crystal",q:1},{id:"thermal_ore",q:2}]}]},
  {id:"bioluminescent_fishing",name:"Bioluminescent Fishing",icon:"🎣",color:"#00d4ff",cat:"gather",acts:[
    {id:"bf1",name:"Reef Pool Fishing",lv:1,xp:10,t:3,out:[{id:"glowfish",q:1}]},
    {id:"bf2",name:"Twilight Fishing",lv:10,xp:25,t:4,out:[{id:"glowfish",q:2}]},
    {id:"bf3",name:"Midnight Angling",lv:25,xp:55,t:5,out:[{id:"glowfish",q:2},{id:"ocean_fiber",q:1}]},
    {id:"bf4",name:"Abyss Trawling",lv:50,xp:120,t:6,out:[{id:"glowfish",q:4},{id:"shell_fragments",q:2}]}]},
  {id:"coral_engineering",name:"Coral Engineering",icon:"🔧",color:"#ffd60a",cat:"prod",acts:[
    {id:"ce1",name:"Coral Blocks",lv:1,xp:15,t:4,inp:[{id:"soft_coral",q:3}],out:[{id:"coral_blocks",q:1}]},
    {id:"ce2",name:"Reinforced Alloy",lv:10,xp:35,t:5,inp:[{id:"shell_fragments",q:5}],out:[{id:"reinforced_alloy",q:1}]},
    {id:"ce3",name:"Pressure Glass",lv:20,xp:55,t:6,inp:[{id:"salt_crystals",q:4},{id:"thermal_ore",q:2}],out:[{id:"pressure_glass",q:1}]},
    {id:"ce4",name:"Coral Helm",lv:5,xp:40,t:5,inp:[{id:"coral_blocks",q:8},{id:"shell_fragments",q:5}],out:[{id:"coral_helm",q:1}]},
    {id:"ce5",name:"Shell Shield",lv:12,xp:55,t:6,inp:[{id:"coral_blocks",q:12},{id:"reinforced_alloy",q:3}],out:[{id:"shell_shield",q:1}]},
    {id:"ce6",name:"Coral Suit",lv:15,xp:70,t:6,inp:[{id:"coral_blocks",q:15},{id:"reinforced_alloy",q:5}],out:[{id:"coral_suit",q:1}]}]},
  {id:"bio_refining",name:"Bio Refining",icon:"🧪",color:"#00ffb3",cat:"prod",acts:[
    {id:"br1",name:"Biofuel",lv:1,xp:15,t:4,inp:[{id:"kelp",q:5}],out:[{id:"biofuel",q:1}]},
    {id:"br2",name:"Enzyme Compound",lv:10,xp:35,t:5,inp:[{id:"glowfish",q:3}],out:[{id:"enzyme_compound",q:1}]},
    {id:"br3",name:"Luminescent Gel",lv:20,xp:55,t:6,inp:[{id:"glowfish",q:4},{id:"sea_mushrooms",q:2}],out:[{id:"luminescent_gel",q:1}]}]},
  {id:"pressure_engineering",name:"Pressure Engineering",icon:"⚡",color:"#ff6b35",cat:"prod",acts:[
    {id:"pe1",name:"Basic Harpoon",lv:1,xp:20,t:4,inp:[{id:"trench_stone",q:5},{id:"ocean_fiber",q:3}],out:[{id:"basic_harpoon",q:1}]},
    {id:"pe2",name:"Pressure Helm",lv:10,xp:45,t:5,inp:[{id:"pressure_glass",q:2},{id:"reinforced_alloy",q:4}],out:[{id:"pressure_helm",q:1}]},
    {id:"pe3",name:"Pressure Suit",lv:20,xp:70,t:6,inp:[{id:"pressure_glass",q:3},{id:"reinforced_alloy",q:8}],out:[{id:"pressure_suit",q:1}]},
    {id:"pe4",name:"Pulse Harpoon",lv:15,xp:55,t:5,inp:[{id:"pressure_glass",q:2},{id:"enzyme_compound",q:2}],out:[{id:"pulse_harpoon",q:1}]},
    {id:"pe5",name:"Depth Gloves",lv:5,xp:25,t:4,inp:[{id:"ocean_fiber",q:6}],out:[{id:"depth_gloves",q:1}]},
    {id:"pe6",name:"Pressure Boots",lv:8,xp:30,t:4,inp:[{id:"ocean_fiber",q:8},{id:"coral_blocks",q:2}],out:[{id:"pressure_boots",q:1}]}]},
  {id:"bio_synthesis",name:"Bio Synthesis",icon:"🧬",color:"#c084fc",cat:"prod",acts:[
    {id:"bs1",name:"Healing Serum",lv:1,xp:15,t:3,inp:[{id:"sea_mushrooms",q:3}],out:[{id:"healing_serum",q:1}]},
    {id:"bs2",name:"Kelp Broth",lv:10,xp:35,t:5,inp:[{id:"kelp",q:4},{id:"enzyme_compound",q:1}],out:[{id:"kelp_broth",q:1}]},
    {id:"bs3",name:"Pressure Tonic",lv:25,xp:70,t:6,inp:[{id:"enzyme_compound",q:2},{id:"abyss_crystal",q:1}],out:[{id:"pressure_tonic",q:1}]},
    {id:"bs4",name:"Bio Stim",lv:15,xp:45,t:6,inp:[{id:"luminescent_gel",q:2},{id:"sea_mushrooms",q:3}],out:[{id:"bio_stim",q:1}]}]},
  {id:"artifact_research",name:"Artifact Research",icon:"🔬",color:"#ff9500",cat:"prod",acts:[
    {id:"ar1",name:"Process Ore Sample",lv:1,xp:20,t:5,inp:[{id:"trench_stone",q:8}],out:[{id:"drone_processor",q:1}]},
    {id:"ar2",name:"Crystal Refinement",lv:15,xp:45,t:6,inp:[{id:"abyss_crystal",q:2}],out:[{id:"pressure_reactor",q:1}]}]},
  // --- New gathering skills ---
  {id:"shell_scavenging",name:"Shell Scavenging",icon:"🐚",color:"#e8c87a",cat:"gather",acts:[
    {id:"ss1",name:"Reef Shallows",lv:1,xp:10,t:3,out:[{id:"shell_fragments",q:2}]},
    {id:"ss2",name:"Tidal Shelf",lv:10,xp:26,t:4,out:[{id:"shell_fragments",q:3},{id:"barnacles",q:1}]},
    {id:"ss3",name:"Deep Shell Bed",lv:25,xp:58,t:5,out:[{id:"shell_fragments",q:5},{id:"barnacles",q:2}]},
    {id:"ss4",name:"Void Shell Mound",lv:50,xp:125,t:6,out:[{id:"shell_fragments",q:8},{id:"reinforced_alloy",q:1}]}]},
  {id:"thermal_vent_extraction",name:"Thermal Vent Extraction",icon:"♨️",color:"#ff7043",cat:"gather",acts:[
    {id:"tv1",name:"Warm Fissure",lv:5,xp:15,t:4,out:[{id:"thermal_ore",q:2}]},
    {id:"tv2",name:"Active Vent",lv:20,xp:40,t:5,out:[{id:"thermal_ore",q:3},{id:"salt_crystals",q:2}]},
    {id:"tv3",name:"Superheated Plume",lv:40,xp:80,t:6,out:[{id:"thermal_ore",q:5},{id:"enzyme_compound",q:1}]},
    {id:"tv4",name:"Magma Seep",lv:65,xp:160,t:7,out:[{id:"thermal_ore",q:8},{id:"abyss_crystal",q:1}]}]},
  {id:"crystal_diving",name:"Crystal Diving",icon:"💎",color:"#a78bfa",cat:"gather",acts:[
    {id:"cd1",name:"Shallows Crystals",lv:15,xp:30,t:5,out:[{id:"abyss_crystal",q:1}]},
    {id:"cd2",name:"Midnight Crystal Bed",lv:30,xp:65,t:6,out:[{id:"abyss_crystal",q:2},{id:"salt_crystals",q:3}]},
    {id:"cd3",name:"Abyssal Crystal Cave",lv:50,xp:120,t:7,out:[{id:"abyss_crystal",q:3},{id:"pressure_glass",q:1}]},
    {id:"cd4",name:"Void Crystal Core",lv:75,xp:240,t:8,out:[{id:"abyss_crystal",q:5},{id:"luminescent_gel",q:2}]}]},
  {id:"trench_exploration",name:"Trench Exploration",icon:"🗺️",color:"#38bdf8",cat:"gather",acts:[
    {id:"te1",name:"Shallow Survey",lv:1,xp:12,t:4,out:[{id:"ocean_fiber",q:2},{id:"sea_mushrooms",q:1}]},
    {id:"te2",name:"Twilight Mapping",lv:15,xp:35,t:5,out:[{id:"ocean_fiber",q:3},{id:"trench_stone",q:2}]},
    {id:"te3",name:"Deep Trench Survey",lv:35,xp:75,t:6,out:[{id:"trench_stone",q:4},{id:"thermal_ore",q:2}]},
    {id:"te4",name:"Ancient Ruins Dig",lv:60,xp:150,t:7,out:[{id:"abyss_crystal",q:2},{id:"drone_processor",q:1}]}]},
  // --- New production skills ---
  {id:"submersible_fabrication",name:"Submersible Fabrication",icon:"🚢",color:"#06b6d4",cat:"prod",acts:[
    {id:"sf1",name:"Basic Frame",lv:1,xp:25,t:5,inp:[{id:"coral_blocks",q:10},{id:"ocean_fiber",q:5}],out:[{id:"void_ring",q:1}]},
    {id:"sf2",name:"Shock Harpoon",lv:20,xp:60,t:6,inp:[{id:"pressure_glass",q:4},{id:"enzyme_compound",q:3}],out:[{id:"shock_harpoon",q:1}]},
    {id:"sf3",name:"Thermal Lance",lv:40,xp:100,t:7,inp:[{id:"thermal_ore",q:8},{id:"abyss_crystal",q:2}],out:[{id:"thermal_lance",q:1}]},
    {id:"sf4",name:"Abyss Armor",lv:55,xp:150,t:8,inp:[{id:"reinforced_alloy",q:15},{id:"pressure_glass",q:6},{id:"abyss_crystal",q:3}],out:[{id:"abyss_armor",q:1}]}]},
  {id:"drone_construction",name:"Drone Construction",icon:"🤖",color:"#f472b6",cat:"prod",acts:[
    {id:"dc1",name:"Basic Processor",lv:1,xp:20,t:4,inp:[{id:"trench_stone",q:5},{id:"thermal_ore",q:3}],out:[{id:"drone_processor",q:2}]},
    {id:"dc2",name:"Pressure Reactor",lv:15,xp:50,t:6,inp:[{id:"pressure_glass",q:3},{id:"enzyme_compound",q:2}],out:[{id:"pressure_reactor",q:2}]},
    {id:"dc3",name:"Depth Pendant",lv:10,xp:35,t:5,inp:[{id:"abyss_crystal",q:1},{id:"ocean_fiber",q:4}],out:[{id:"depth_pendant",q:1}]},
    {id:"dc4",name:"Bioluminescent Brew",lv:25,xp:70,t:6,inp:[{id:"luminescent_gel",q:2},{id:"glowfish",q:4}],out:[{id:"bioluminescent_drink",q:2}]}]},
  {id:"ocean_architecture",name:"Ocean Architecture",icon:"🏗️",color:"#34d399",cat:"prod",acts:[
    {id:"oa1",name:"Thermal Steel",lv:10,xp:30,t:5,inp:[{id:"thermal_ore",q:4},{id:"salt_crystals",q:3}],out:[{id:"reinforced_alloy",q:2}]},
    {id:"oa2",name:"Void Elixir",lv:30,xp:75,t:6,inp:[{id:"abyss_crystal",q:2},{id:"enzyme_compound",q:2}],out:[{id:"void_elixir",q:1}]},
    {id:"oa3",name:"Deep Extract",lv:20,xp:50,t:5,inp:[{id:"sea_mushrooms",q:5},{id:"glowfish",q:3}],out:[{id:"deep_extract",q:2}]},
    {id:"oa4",name:"Bio Stim Mk2",lv:45,xp:110,t:7,inp:[{id:"luminescent_gel",q:3},{id:"pressure_tonic",q:1}],out:[{id:"bio_stim",q:3}]}]},
  {id:"energy_systems",name:"Energy Systems",icon:"⚡",color:"#facc15",cat:"prod",acts:[
    {id:"es1",name:"Biofuel Refined",lv:5,xp:18,t:4,inp:[{id:"kelp",q:8},{id:"sea_mushrooms",q:2}],out:[{id:"biofuel",q:3}]},
    {id:"es2",name:"Pressure Conduit",lv:20,xp:55,t:6,inp:[{id:"pressure_glass",q:2},{id:"reinforced_alloy",q:3}],out:[{id:"pressure_reactor",q:1},{id:"drone_processor",q:1}]},
    {id:"es3",name:"Kelp Broth Premium",lv:15,xp:42,t:5,inp:[{id:"kelp",q:6},{id:"enzyme_compound",q:2}],out:[{id:"kelp_broth",q:2}]},
    {id:"es4",name:"Pressure Tonic Mk2",lv:40,xp:95,t:7,inp:[{id:"abyss_crystal",q:1},{id:"enzyme_compound",q:3},{id:"luminescent_gel",q:2}],out:[{id:"pressure_tonic",q:2}]}]},
  // ── Utility Skills ──
  {id:"navigation",name:"Navigation",icon:"🧭",color:"#38bdf8",cat:"utility",acts:[
    {id:"nv1",name:"Chart Reef Currents",lv:1,xp:20,t:6,out:[{id:"nav_beacon",q:1}],util:{type:"speed",val:0.05},desc:"Map reef currents. +5% gather speed this session."},
    {id:"nv2",name:"Map Twilight Lanes",lv:15,xp:50,t:8,inp:[{id:"nav_beacon",q:1}],out:[{id:"ocean_chart",q:1}],util:{type:"speed",val:0.10},desc:"Chart twilight lanes. +10% gather speed."},
    {id:"nv3",name:"Deep Trench Routes",lv:35,xp:100,t:10,inp:[{id:"ocean_chart",q:1}],out:[{id:"void_map",q:1}],util:{type:"speed",val:0.15},desc:"Map deep trench routes. +15% gather speed."},
    {id:"nv4",name:"Void Cartography",lv:60,xp:200,t:12,inp:[{id:"void_map",q:1},{id:"abyss_crystal",q:2}],out:[{id:"void_map",q:2}],util:{type:"speed",val:0.20},desc:"Chart void passages. +20% gather speed permanently."}]},
  {id:"scanning",name:"Scanning",icon:"📡",color:"#22d3ee",cat:"utility",acts:[
    {id:"sc1",name:"Bio Scan",lv:1,xp:20,t:5,out:[{id:"scan_report",q:1}],util:{type:"rare",val:0.03},desc:"Scan for lifeforms. +3% discovery chance."},
    {id:"sc2",name:"Deep Resonance Scan",lv:20,xp:55,t:7,inp:[{id:"scan_report",q:1}],out:[{id:"resonance_crystal",q:1}],util:{type:"rare",val:0.05},desc:"Detect rare nodes. +5% rare drop chance."},
    {id:"sc3",name:"Void Signal Trace",lv:40,xp:110,t:9,inp:[{id:"resonance_crystal",q:1},{id:"drone_processor",q:1}],out:[{id:"resonance_crystal",q:2}],util:{type:"rare",val:0.08},desc:"Trace void signals. +8% rare drops."},
    {id:"sc4",name:"Ancient Frequency Lock",lv:65,xp:220,t:12,inp:[{id:"resonance_crystal",q:2},{id:"ancient_processor",q:1}],out:[{id:"ancient_data_chip",q:1}],util:{type:"rare",val:0.12},desc:"Lock ancient frequencies. +12% rare drops."}]},
  {id:"archaeology",name:"Archaeology",icon:"🏺",color:"#fb923c",cat:"utility",acts:[
    {id:"ac1",name:"Surface Excavation",lv:1,xp:25,t:6,out:[{id:"relic_shard",q:1}],util:{type:"rp",val:5},desc:"Excavate reef surface. Gain RP and relics."},
    {id:"ac2",name:"Ancient Wreck Dive",lv:20,xp:65,t:8,inp:[{id:"relic_shard",q:2}],out:[{id:"ancient_relic",q:1}],util:{type:"rp",val:15},desc:"Dive ancient wrecks. Recover artifact fragments."},
    {id:"ac3",name:"Relic Reconstruction",lv:40,xp:130,t:10,inp:[{id:"ancient_relic",q:2},{id:"abyss_crystal",q:1}],out:[{id:"ancient_processor",q:1}],util:{type:"rp",val:30},desc:"Reconstruct ancient tech. +30 RP per action."},
    {id:"ac4",name:"Ancient Core Extraction",lv:70,xp:260,t:14,inp:[{id:"ancient_processor",q:1},{id:"thermal_core",q:1}],out:[{id:"ancient_data_chip",q:2}],util:{type:"rp",val:80},desc:"Extract ancient cores. Massive RP gain."}]},
  {id:"ocean_cartography",name:"Ocean Cartography",icon:"🗺️",color:"#a78bfa",cat:"utility",acts:[
    {id:"oc1",name:"Reef Survey",lv:1,xp:22,t:5,out:[{id:"ocean_chart",q:1}],util:{type:"yield",val:0.05},desc:"Survey reef zones. +5% resource yield."},
    {id:"oc2",name:"Abyss Mapping",lv:25,xp:65,t:8,inp:[{id:"ocean_chart",q:1}],out:[{id:"ocean_chart",q:2}],util:{type:"yield",val:0.10},desc:"Map abyssal regions. +10% resource yield."},
    {id:"oc3",name:"Void Region Chart",lv:50,xp:130,t:11,inp:[{id:"ocean_chart",q:2},{id:"void_pearl",q:1}],out:[{id:"void_map",q:1}],util:{type:"yield",val:0.15},desc:"Chart void regions. +15% resource yield."},
    {id:"oc4",name:"Complete Ocean Atlas",lv:80,xp:280,t:15,inp:[{id:"void_map",q:2},{id:"ancient_relic",q:1}],out:[{id:"void_map",q:3}],util:{type:"yield",val:0.25},desc:"Complete the ocean atlas. +25% all yield."}]},
  {id:"logistics",name:"Logistics",icon:"📦",color:"#34d399",cat:"utility",acts:[
    {id:"lg1",name:"Supply Cache",lv:1,xp:18,t:4,inp:[{id:"kelp",q:5},{id:"sea_mushrooms",q:3}],out:[{id:"supply_crate",q:1}],util:{type:"gold",val:10},desc:"Pack supply cache. Creates healing crates."},
    {id:"lg2",name:"Trade Bundle",lv:15,xp:45,t:6,inp:[{id:"soft_coral",q:8},{id:"shell_fragments",q:8}],out:[{id:"supply_crate",q:2}],util:{type:"gold",val:25},desc:"Bundle for trade. +25 bonus credits."},
    {id:"lg3",name:"Efficiency Protocol",lv:35,xp:90,t:8,inp:[{id:"drone_processor",q:1},{id:"supply_crate",q:1}],out:[{id:"supply_crate",q:3}],util:{type:"gold",val:50},desc:"Optimize logistics. +50 bonus credits per action."},
    {id:"lg4",name:"Deep Supply Network",lv:60,xp:180,t:12,inp:[{id:"ancient_data_chip",q:1},{id:"supply_crate",q:2}],out:[{id:"supply_crate",q:5}],util:{type:"gold",val:120},desc:"Build deep supply network. Major credit bonus."}]},
  // ── Endgame / Rare Crafting ──
  {id:"relic_forging",name:"Relic Forging",icon:"⚗️",color:"#e11d48",cat:"prod",acts:[
    {id:"rf1",name:"Void Pearl Extract",lv:30,xp:80,t:8,inp:[{id:"abyss_crystal",q:3},{id:"luminescent_gel",q:4}],out:[{id:"void_pearl",q:1}]},
    {id:"rf2",name:"Black Coral Harvest",lv:45,xp:120,t:9,inp:[{id:"soft_coral",q:20},{id:"thermal_ore",q:5}],out:[{id:"black_coral",q:1}]},
    {id:"rf3",name:"Thermal Core Forge",lv:55,xp:160,t:10,inp:[{id:"thermal_ore",q:15},{id:"pressure_glass",q:5},{id:"abyss_crystal",q:2}],out:[{id:"thermal_core",q:1}]},
    {id:"rf4",name:"Alien Tissue Culture",lv:65,xp:200,t:12,inp:[{id:"enzyme_compound",q:8},{id:"luminescent_gel",q:6},{id:"void_pearl",q:1}],out:[{id:"alien_bio_tissue",q:1}]},
    {id:"rf5",name:"Leviathan Spear",lv:70,xp:280,t:14,inp:[{id:"leviathan_bone",q:3},{id:"thermal_core",q:2},{id:"ancient_processor",q:1}],out:[{id:"leviathan_spear",q:1}]},
    {id:"rf6",name:"Leviathan Armor",lv:75,xp:300,t:15,inp:[{id:"leviathan_bone",q:5},{id:"alien_bio_tissue",q:2},{id:"black_coral",q:3}],out:[{id:"leviathan_armor",q:1}]},
    {id:"rf7",name:"Ancient Helm",lv:60,xp:220,t:12,inp:[{id:"ancient_relic",q:3},{id:"void_pearl",q:2},{id:"reinforced_alloy",q:10}],out:[{id:"ancient_helm",q:1}]},
    {id:"rf8",name:"Void Amulet",lv:50,xp:180,t:11,inp:[{id:"void_pearl",q:2},{id:"abyss_crystal",q:4},{id:"black_coral",q:2}],out:[{id:"void_amulet",q:1}]}]},
];

// ===================== COMBAT SKILLS =====================
const CSUBS=[
  {id:"pressure_resistance",name:"Pressure Resistance",icon:"💠",color:"#00d4ff"},
  {id:"harpoon_mastery",name:"Harpoon Mastery",icon:"🗡️",color:"#ff6b9d"},
  {id:"combat_systems",name:"Combat Systems",icon:"⚔️",color:"#f87171"},
  {id:"drone_combat",name:"Drone Combat",icon:"🤖",color:"#fb923c"},
  {id:"depth_shielding",name:"Depth Shielding",icon:"🛡️",color:"#60a5ff"},
  {id:"sonic_weapons",name:"Sonic Weapons",icon:"🔊",color:"#4ade80"},
  {id:"leviathan_lore",name:"Leviathan Lore",icon:"🐉",color:"#c084fc"},
];

// ===================== ZONES =====================
// Each zone has: mobs[] (regular), elites[] (rare spawn ~15%), boss (every 10 kills), boss2 (every 25 kills)
const ZONES=[
  {id:"z1",name:"Sunlit Reef",icon:"🪸",lv:1,
    mobs:[
      {n:"Coral Crab",      hp:20,  atk:2,  def:1,  xp:8,   g:3,  i:"🦀"},
      {n:"Reef Eel",        hp:35,  atk:4,  def:2,  xp:15,  g:6,  i:"🐍"},
      {n:"Striped Jelly",   hp:25,  atk:3,  def:1,  xp:10,  g:4,  i:"🪼"},
      {n:"Sand Puffer",     hp:30,  atk:5,  def:3,  xp:12,  g:5,  i:"🐡"},
      {n:"Sea Spider",      hp:18,  atk:3,  def:2,  xp:9,   g:3,  i:"🕷️"},
      {n:"Coral Shrimp",    hp:15,  atk:2,  def:1,  xp:7,   g:2,  i:"🦐"},
    ],
    elites:[
      {n:"Alpha Reef Crab", hp:80,  atk:7,  def:5,  xp:40,  g:20, i:"🦀", elite:true},
      {n:"Sting Pike",      hp:65,  atk:9,  def:4,  xp:35,  g:18, i:"🐟", elite:true},
      {n:"Reef Colossus",   hp:95,  atk:10, def:6,  xp:48,  g:24, i:"🦈", elite:true},
    ],
    boss: {n:"Reef Hunter",       hp:120, atk:8,  def:5,  xp:60,  g:30,  i:"🦈"},
    boss2:{n:"Giant Reef Mantis",  hp:200, atk:12, def:8,  xp:100, g:60,  i:"🦂"},
  },
  {id:"z2",name:"Coral Forest",icon:"🌊",lv:10,
    mobs:[
      {n:"Glass Jellyfish",  hp:70,  atk:9,  def:5,  xp:28,  g:12, i:"🪼"},
      {n:"Shadow Octopus",   hp:100, atk:13, def:8,  xp:42,  g:20, i:"🐙"},
      {n:"Mini Manta",       hp:85,  atk:11, def:6,  xp:34,  g:16, i:"🐟"},
      {n:"Reef Hunter",      hp:90,  atk:12, def:7,  xp:38,  g:18, i:"🦈"},
      {n:"Thorn Urchin",     hp:60,  atk:8,  def:10, xp:25,  g:11, i:"🌵"},
      {n:"Banded Sea Snake", hp:75,  atk:14, def:4,  xp:32,  g:15, i:"🐍"},
    ],
    elites:[
      {n:"Coral Forest Drake",hp:220, atk:20, def:14, xp:110, g:55, i:"🐉", elite:true},
      {n:"Phantom Jellyfish", hp:180, atk:18, def:10, xp:90,  g:45, i:"🪼", elite:true},
      {n:"Elder Octopus",     hp:200, atk:19, def:12, xp:100, g:50, i:"🐙", elite:true},
    ],
    boss: {n:"Predator Squid",     hp:350, atk:22, def:14, xp:160, g:90,  i:"🦑"},
    boss2:{n:"Elder Coral Drake",   hp:550, atk:30, def:20, xp:260, g:150, i:"🐉"},
  },
  {id:"z3",name:"Twilight Shelf",icon:"🌆",lv:18,
    mobs:[
      {n:"Dusk Shark",       hp:120, atk:17, def:11, xp:48,  g:22, i:"🦈"},
      {n:"Lantern Ray",      hp:180, atk:22, def:14, xp:70,  g:35, i:"🐟"},
      {n:"Twilight Eel",     hp:140, atk:19, def:12, xp:55,  g:27, i:"🐍"},
      {n:"Dusk Cuttlefish",  hp:160, atk:20, def:13, xp:62,  g:30, i:"🦑"},
      {n:"Bone Crab",        hp:200, atk:16, def:18, xp:65,  g:32, i:"🦀"},
      {n:"Needle Shark",     hp:130, atk:24, def:10, xp:58,  g:28, i:"🦈"},
    ],
    elites:[
      {n:"Twilight Leviathan",hp:450, atk:32, def:22, xp:220, g:110,i:"🐋", elite:true},
      {n:"Barbed Manta",      hp:380, atk:28, def:18, xp:185, g:92, i:"🐟", elite:true},
    ],
    boss: {n:"Phantom Whale",      hp:550, atk:34, def:20, xp:240, g:130, i:"🐋"},
    boss2:{n:"Crimson Barracuda",   hp:780, atk:44, def:28, xp:380, g:200, i:"🐠"},
  },
  {id:"z4",name:"Midnight Depths",icon:"🌑",lv:25,
    mobs:[
      {n:"Bone Fish",        hp:150, atk:20, def:14, xp:60,  g:30, i:"🐟"},
      {n:"Electric Ray",     hp:240, atk:28, def:18, xp:90,  g:45, i:"⚡"},
      {n:"Hunter Eel",       hp:190, atk:25, def:15, xp:72,  g:36, i:"🐍"},
      {n:"Iron Shell Crab",  hp:280, atk:22, def:24, xp:95,  g:48, i:"🦀"},
      {n:"Ghost Jelly",      hp:170, atk:30, def:10, xp:78,  g:39, i:"🪼"},
      {n:"Deep Stalker",     hp:210, atk:26, def:17, xp:82,  g:42, i:"🦑"},
    ],
    elites:[
      {n:"Midnight Horror",   hp:580, atk:42, def:28, xp:290, g:145,i:"👁️", elite:true},
      {n:"Abyssal Ray Lord",  hp:520, atk:38, def:30, xp:260, g:130,i:"⚡", elite:true},
    ],
    boss: {n:"Deep Angler",        hp:700, atk:42, def:30, xp:320, g:170, i:"🎣"},
    boss2:{n:"Midnight Colossus",   hp:1000,atk:55, def:40, xp:500, g:270, i:"💀"},
  },
  {id:"z5",name:"Abyssal Plain",icon:"🫧",lv:35,
    mobs:[
      {n:"Pressure Crab",    hp:260, atk:32, def:22, xp:105, g:52, i:"🦀"},
      {n:"Void Serpent",     hp:380, atk:44, def:30, xp:155, g:80, i:"🐍"},
      {n:"Abyssal Manta",    hp:320, atk:38, def:26, xp:128, g:64, i:"🐟"},
      {n:"Dark Angler",      hp:290, atk:42, def:20, xp:118, g:59, i:"🎣"},
      {n:"Shadow Cuttlefish",hp:350, atk:36, def:28, xp:140, g:70, i:"🦑"},
      {n:"Deep Horror",      hp:410, atk:46, def:32, xp:165, g:84, i:"👁️"},
    ],
    elites:[
      {n:"Void Titan",        hp:900, atk:62, def:44, xp:450, g:225,i:"🌀", elite:true},
      {n:"Abyss Hydra",       hp:820, atk:58, def:40, xp:410, g:205,i:"🐉", elite:true},
      {n:"Deep Leviathan",    hp:870, atk:60, def:42, xp:435, g:218,i:"🐋", elite:true},
    ],
    boss: {n:"Abyssal Titan",      hp:1100,atk:62, def:44, xp:460, g:260, i:"💀"},
    boss2:{n:"Void Whale",          hp:1600,atk:78, def:56, xp:720, g:400, i:"🐋"},
  },
  {id:"z6",name:"Hydrothermal Vents",icon:"🔥",lv:40,
    mobs:[
      {n:"Pressure Worm",    hp:300, atk:36, def:24, xp:120, g:60, i:"🪱"},
      {n:"Abyss Crawler",    hp:480, atk:48, def:36, xp:180, g:95, i:"🦂"},
      {n:"Thermal Eel",      hp:360, atk:44, def:28, xp:142, g:72, i:"🐍"},
      {n:"Magma Crab",       hp:550, atk:40, def:42, xp:195, g:98, i:"🦀"},
      {n:"Vent Serpent",     hp:420, atk:50, def:32, xp:165, g:84, i:"🐍"},
      {n:"Lava Jelly",       hp:380, atk:52, def:22, xp:155, g:78, i:"🪼"},
    ],
    elites:[
      {n:"Hydrothermal Drake",hp:1100,atk:72, def:50, xp:550, g:275,i:"🐉", elite:true},
      {n:"Magma Colossus",    hp:1000,atk:68, def:54, xp:500, g:250,i:"🌋", elite:true},
      {n:"Vent Overlord",     hp:950, atk:65, def:52, xp:475, g:238,i:"🦂", elite:true},
    ],
    boss: {n:"Thermal Leviathan",  hp:1400,atk:72, def:48, xp:580, g:340, i:"🌋"},
    boss2:{n:"Hydrothermal Titan",  hp:2000,atk:90, def:62, xp:900, g:520, i:"🔥"},
  },
  {id:"z7",name:"Frozen Trench",icon:"🧊",lv:50,
    mobs:[
      {n:"Ice Stalker",      hp:420, atk:54, def:38, xp:170, g:88, i:"❄️"},
      {n:"Cryo Leviathan",   hp:650, atk:72, def:52, xp:260, g:135,i:"🐋"},
      {n:"Frost Eel",        hp:500, atk:62, def:44, xp:200, g:102,i:"🐍"},
      {n:"Ice Titan Crab",   hp:720, atk:58, def:58, xp:270, g:138,i:"🦀"},
      {n:"Crystal Shark",    hp:560, atk:68, def:46, xp:225, g:115,i:"🦈"},
      {n:"Frozen Horror",    hp:610, atk:70, def:50, xp:245, g:125,i:"👁️"},
    ],
    elites:[
      {n:"Glacier Titan",     hp:1500,atk:95, def:70, xp:750, g:375,i:"🧊", elite:true},
      {n:"Blizzard Drake",    hp:1400,atk:90, def:66, xp:700, g:350,i:"🐉", elite:true},
    ],
    boss: {n:"Glacier Kraken",     hp:2200,atk:100,def:70, xp:860, g:500, i:"🦑"},
    boss2:{n:"Frost Ancient",       hp:3000,atk:120,def:88, xp:1200,g:720, i:"❄️"},
  },
  {id:"z8",name:"Black Trench",icon:"🕳️",lv:60,
    mobs:[
      {n:"Void Eel",         hp:480, atk:60, def:42, xp:240, g:120,i:"🌀"},
      {n:"Trench Serpent",   hp:840, atk:84, def:60, xp:420, g:210,i:"🐍"},
      {n:"Night Kraken",     hp:700, atk:76, def:54, xp:350, g:175,i:"🦑"},
      {n:"Black Hydra",      hp:920, atk:88, def:64, xp:460, g:230,i:"🐉"},
      {n:"Abyss Emperor",    hp:780, atk:80, def:58, xp:390, g:195,i:"👑"},
      {n:"Trench Devourer",  hp:860, atk:86, def:62, xp:430, g:215,i:"💀"},
    ],
    elites:[
      {n:"Void Overlord",     hp:2000,atk:115,def:82, xp:1000,g:500,i:"🌀", elite:true},
      {n:"Black Ancient",     hp:1800,atk:108,def:78, xp:900, g:450,i:"🕳️", elite:true},
      {n:"Trench Emperor",    hp:1900,atk:112,def:80, xp:950, g:475,i:"👑", elite:true},
    ],
    boss: {n:"Abyss Kraken",       hp:3000,atk:120,def:84, xp:1200,g:720, i:"🦑"},
    boss2:{n:"Void Colossus",       hp:4500,atk:145,def:102,xp:1800,g:1100,i:"🌀"},
  },
  {id:"z9",name:"Ancient Ruins",icon:"🏛️",lv:80,
    mobs:[
      {n:"Relic Guardian",   hp:720, atk:90, def:66, xp:360, g:185,i:"🗿"},
      {n:"Void Sentinel",    hp:1100,atk:120,def:88, xp:560, g:285,i:"⚔️"},
      {n:"Ancient Construct",hp:950, atk:110,def:80, xp:475, g:240,i:"🤖"},
      {n:"Ruin Stalker",     hp:850, atk:105,def:74, xp:425, g:215,i:"👁️"},
      {n:"Corruption Shade", hp:980, atk:115,def:78, xp:490, g:248,i:"🌑"},
      {n:"Void Golem",       hp:1200,atk:108,def:96, xp:600, g:305,i:"🗿"},
    ],
    elites:[
      {n:"Ancient Horror",    hp:2800,atk:155,def:115,xp:1400,g:700,i:"👁️", elite:true},
      {n:"Ruins Titan",       hp:3200,atk:165,def:125,xp:1600,g:800,i:"🏛️", elite:true},
      {n:"Void Emperor",      hp:3000,atk:160,def:120,xp:1500,g:750,i:"👑", elite:true},
    ],
    boss: {n:"Leviathan Prime",    hp:6000,atk:180,def:130,xp:2400,g:1500,i:"🐉"},
    boss2:{n:"Ancient Colossus",    hp:9000,atk:220,def:160,xp:3600,g:2400,i:"🏛️"},
  },
];

const ESLOTS=[
  {id:"head",n:"Head",i:"⛑️"},{id:"body",n:"Body",i:"🔵"},{id:"hands",n:"Hands",i:"🧤"},{id:"feet",n:"Feet",i:"👢"},
  {id:"weapon",n:"Weapon",i:"🗡️"},{id:"shield",n:"Shield",i:"🛡️"},{id:"neck",n:"Neck",i:"📿"},{id:"ring",n:"Ring",i:"💍"},
];

// ===================== AUTH SCREEN =====================
function AuthScreen({onLogin}){
  const[tab,setTab]=useState("login");
  const[displayName,setDisplayName]=useState("");
  const[email,setEmail]=useState("");
  const[password,setPassword]=useState("");
  const[confirmPw,setConfirmPw]=useState("");
  const[error,setError]=useState("");
  const[loading,setLoading]=useState(false);
  const clearForm=()=>{setDisplayName("");setEmail("");setPassword("");setConfirmPw("");setError("")};
  const handleSignup=async()=>{
    setError("");
    if(!displayName.trim()||displayName.length<3)return setError("Display name must be at least 3 characters");
    if(!email.trim())return setError("Please enter an email");
    if(!password||password.length<6)return setError("Password must be at least 6 characters");
    if(password!==confirmPw)return setError("Passwords do not match");
    setLoading(true);
    try{const cred=await createUserWithEmailAndPassword(auth,email.trim(),password);await updateProfile(cred.user,{displayName:displayName.trim()});onLogin(cred.user);}
    catch(e){setError(e.code==="auth/email-already-in-use"?"Email already in use":e.message)}
    setLoading(false);
  };
  const handleLogin=async()=>{
    setError("");
    if(!email.trim()||!password)return setError("Enter email and password");
    setLoading(true);
    try{await signInWithEmailAndPassword(auth,email.trim(),password)}
    catch(e){setError(e.code==="auth/invalid-credential"?"Invalid email or password":e.message)}
    setLoading(false);
  };
  const inp={padding:"10px 14px",borderRadius:6,background:"#031926",border:"1px solid "+C.border,color:C.white,fontSize:13,outline:"none",width:"100%",boxSizing:"border-box",fontFamily:FONT_BODY};
  return(
    <div style={{width:"100%",height:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:C.bg,fontFamily:FONT,overflow:"hidden",position:"relative"}}>
      <div style={{position:"absolute",inset:0,overflow:"hidden",pointerEvents:"none"}}>
        {[...Array(12)].map((_,i)=>(<div key={i} style={{position:"absolute",width:Math.random()*60+10+"px",height:Math.random()*60+10+"px",borderRadius:"50%",background:"radial-gradient(circle, "+C.acc+"15 0%, transparent 70%)",left:Math.random()*100+"%",top:Math.random()*100+"%",animation:`float${i%3} ${6+i*1.2}s ease-in-out infinite`,animationDelay:i*0.7+"s"}}/>))}
      </div>
      <div style={{width:"100%",maxWidth:400,padding:24,position:"relative",zIndex:1}}>
        <div style={{textAlign:"center",marginBottom:28}}>
          <div style={{fontSize:52,marginBottom:10,filter:"drop-shadow(0 0 16px #00d4ff)"}}>🌊</div>
          <div style={{fontSize:22,fontWeight:700,color:C.white,marginBottom:4,letterSpacing:2,textShadow:GLOW_STYLE}}>DEEP OCEAN</div>
          <div style={{fontSize:13,fontWeight:700,color:C.acc,letterSpacing:4,marginBottom:4}}>CIVILIZATION</div>
          <div style={{fontSize:11,color:C.ts,letterSpacing:1}}>Multiplayer Idle RPG</div>
        </div>
        <div style={{padding:24,borderRadius:12,background:"#031926",border:"1px solid "+C.border,boxShadow:GLOW_STYLE}}>
          <div style={{display:"flex",gap:8,marginBottom:18}}>
            {["login","signup"].map(t=>(<div key={t} onClick={()=>{setTab(t);clearForm()}} style={{flex:1,padding:"9px 0",textAlign:"center",borderRadius:6,background:tab===t?C.acc+"25":"transparent",color:tab===t?C.acc:C.td,fontWeight:700,fontSize:12,cursor:"pointer",border:"1px solid "+(tab===t?C.acc+"50":"transparent"),transition:"all 0.2s",letterSpacing:1}}>{t==="login"?"SIGN IN":"CREATE ACCOUNT"}</div>))}
          </div>
          {error&&<div style={{padding:"8px 12px",borderRadius:6,background:C.bad+"20",color:C.bad,fontSize:12,fontWeight:600,marginBottom:12,border:"1px solid "+C.bad+"40"}}>{error}</div>}
          <div style={{display:"flex",flexDirection:"column",gap:10}}>
            {tab==="signup"&&<input value={displayName} onChange={e=>setDisplayName(e.target.value)} placeholder="Commander Name" style={inp}/>}
            <input value={email} onChange={e=>setEmail(e.target.value)} placeholder="Email" type="email" style={inp}/>
            <input value={password} onChange={e=>setPassword(e.target.value)} placeholder="Password" type="password" style={inp} onKeyDown={e=>e.key==="Enter"&&(tab==="login"?handleLogin():null)}/>
            {tab==="signup"&&<input value={confirmPw} onChange={e=>setConfirmPw(e.target.value)} placeholder="Confirm Password" type="password" style={inp}/>}
            <div onClick={loading?undefined:(tab==="login"?handleLogin:handleSignup)} style={{padding:"13px 0",borderRadius:6,marginTop:4,background:loading?C.card:"linear-gradient(90deg,"+C.acc+"30,"+C.accD+"30)",color:loading?C.td:C.acc,border:"1px solid "+(loading?C.border:C.acc+"60"),fontWeight:700,fontSize:13,textAlign:"center",cursor:loading?"default":"pointer",letterSpacing:2,transition:"all 0.2s",boxShadow:loading?"none":GLOW_STYLE}}>{loading?"CONNECTING...":(tab==="login"?"DIVE IN":"INITIALIZE")}</div>
          </div>
        </div>
      </div>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&family=Inter:wght@400;500;600&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}body{background:${C.bg};overflow:hidden}
        @keyframes float0{0%,100%{transform:translateY(0) scale(1)}50%{transform:translateY(-30px) scale(1.1)}}
        @keyframes float1{0%,100%{transform:translateY(0) scale(1)}50%{transform:translateY(-50px) scale(0.9)}}
        @keyframes float2{0%,100%{transform:translateY(0) scale(1)}50%{transform:translateY(-20px) scale(1.2)}}
      `}</style>
    </div>
  );
}

// ===================== GAME UI =====================
function GameUI({account,onLogout}){
  const[skills,setSkills]=useState({});
  const[inv,setInv]=useState({});
  const[eq,setEq]=useState({});
  const[gold,setGold]=useState(0);
  const[enh,setEnh]=useState({});
  const[curAct,setCurAct]=useState(null);
  const[actProg,setActProg]=useState(0);
  const[zoneId,setZoneId]=useState(null);
  const[cbt,setCbt]=useState(null);
  const[clog,setClog]=useState([]);
  const[food,setFood]=useState(null);
  const[page,setPage]=useState("skills");
  const[actSkill,setActSkill]=useState("kelp_farming");
  // Top bar
  const[energy,setEnergy]=useState(100);
  const[pressure,setPressure]=useState(0);
  const[researchPts,setResearchPts]=useState(0);
  // Research
  const[researched,setResearched]=useState({});
  const[researchBranch,setResearchBranch]=useState("agriculture");
  // Structures
  const[structures,setStructures]=useState({});
  const[structCat,setStructCat]=useState("production");
  // Drones
  const[drones,setDrones]=useState({}); // {droneTypeId: count deployed}
  const[droneLogs,setDroneLogs]=useState([]);
  // Prestige
  const[ascensionLevel,setAscensionLevel]=useState(0);
  const[dataCores,setDataCores]=useState(0);
  const[prestigeUpgrades,setPrestigeUpgrades]=useState({}); // {upgradeId: level}
  const[showAscendConfirm,setShowAscendConfirm]=useState(false);
  // Discoveries
  const[activeDiscovery,setActiveDiscovery]=useState(null); // {disc, rewards collected}
  const[discoveryLog,setDiscoveryLog]=useState([]);
  // Blueprints — set of unlocked blueprint IDs
  const[blueprints,setBlueprints]=useState([]);
  // Marketplace
  const[marketOrders,setMarketOrders]=useState([]); // loaded from Firebase shared
  const[myListings,setMyListings]=useState([]); // player's own listings
  const[marketTab,setMarketTab]=useState("browse"); // browse | sell
  const[sellItem,setSellItem]=useState("");
  const[sellQty,setSellQty]=useState(1);
  const[sellPrice,setSellPrice]=useState(10);
  const[marketLoading,setMarketLoading]=useState(false);
  // Offline gains modal
  const[offlineGains,setOfflineGains]=useState(null);
  // Achievements & lifetime stats
  const[achievements,setAchievements]=useState({});  // {achievementId: true}
  const[achCat,setAchCat]=useState("gather");
  const[newAch,setNewAch]=useState(null); // toast notification
  const[lifeStats,setLifeStats]=useState({
    totalGathered:0, kelp:0, abyss_crystal:0, kills:0, bossKills:0,
    totalGold:0, crafts:0, equippedSlots:0, researched:0, structures:0,
    dronesDeployed:0, dronesConcurrent:0, ascensions:0, maxSkillLv:0,
    totalSkillLv:0, discoveries:0,
  });
  // QoL / UI state
  const[navCollapsed,setNavCollapsed]=useState(false);
  const[navSearch,setNavSearch]=useState("");
  const[showTutorial,setShowTutorial]=useState(false);
  const[tutorialStep,setTutorialStep]=useState(0);
  const[tutorialDone,setTutorialDone]=useState(false);
  const[showSettings,setShowSettings]=useState(false);
  const[leaderboard,setLeaderboard]=useState([]);
  const[lbLoading,setLbLoading]=useState(false);
  const[showLogoutConfirm,setShowLogoutConfirm]=useState(false);
  const[chatOpen,setChatOpen]=useState(true);
  const[rightTab,setRightTab]=useState("inventory");
  const[invFilter,setInvFilter]=useState("");
  // ── Social ──
  const chatEndRef=useRef(null);
  const[chatMessages,setChatMessages]=useState([]);  // global chat
  const[chatInput,setChatInput]=useState("");
  const[chatTab,setChatTab]=useState("global");      // global | clan | dm
  const[dmTarget,setDmTarget]=useState(null);        // {uid, name}
  const[dmMessages,setDmMessages]=useState([]);
  const[dmInput,setDmInput]=useState("");
  const[friends,setFriends]=useState([]);            // [{uid,name,online,skills}]
  const[friendReqs,setFriendReqs]=useState([]);      // incoming requests [{uid,name}]
  const[addFriendInput,setAddFriendInput]=useState("");
  const[addFriendErr,setAddFriendErr]=useState("");
  const[clan,setClan]=useState(null);                // current clan doc or null
  const[clanMembers,setClanMembers]=useState([]);
  const[clanChat,setClanChat]=useState([]);
  const[clanChatInput,setClanChatInput]=useState("");
  const[clanSearch,setClanSearch]=useState([]);
  const[clanSearchInput,setClanSearchInput]=useState("");
  const[createClanName,setCreateClanName]=useState("");
  const[createClanTag,setCreateClanTag]=useState("");
  const[socialTab,setSocialTab]=useState("chat");    // chat | friends | clan
  const[unreadGlobal,setUnreadGlobal]=useState(0);
  const[unreadDm,setUnreadDm]=useState(0);
  const invRef=useRef(inv);
  invRef.current=inv;

  const sl=useCallback((sid)=>{
    const xp=skills[sid]||0;
    let lv=1,tot=0;
    while(lv<MAX_SKILL_LV&&tot+xpFor(lv)<=xp){tot+=xpFor(lv);lv++}
    const mastered=lv>=MAX_SKILL_LV;
    return{lv,xp:mastered?0:xp-tot,need:mastered?0:xpFor(lv),mastered};
  },[skills]);

  // Returns a skill's acts merged with any unlocked blueprint acts
  const getSkillActs=useCallback((skillId,baseActs)=>{
    const bpActs=BLUEPRINTS
      .filter(bp=>bp.skillId===skillId&&blueprints.includes(bp.id))
      .map(bp=>({...bp.act,_blueprint:bp.id}));
    return [...baseActs,...bpActs];
  },[blueprints]);
  const combatLv=useMemo(()=>CSUBS.reduce((s,c)=>s+sl(c.id).lv,0),[sl]);

  // Aggregate research bonuses
  const bonuses=useMemo(()=>{
    const b={kelp_yield:0,gather_yield:0,gather_speed:0,energy_regen:0,max_energy:0,atk_pct:0,def_pct:0,combat_xp:0,boss_drop:0,prod_speed:0,gold_pct:0,xp_pct:0,rare_chance:0,crystal_yield:0,rp_gen:0,pressure_resist:0,drone_efficiency:0};
    ALL_RESEARCH.forEach(r=>{if(researched[r.id]&&r.effect)Object.entries(r.effect).forEach(([k,v])=>{b[k]=(b[k]||0)+v})});
    // Structure bonuses (per level)
    STRUCTURES.forEach(st=>{const lv=structures[st.id]||0;if(lv>0){if(st.bonus)Object.entries(st.bonus).forEach(([k,v])=>{b[k]=(b[k]||0)+v*lv});if(st.bonusExtra)Object.entries(st.bonusExtra).forEach(([k,v])=>{b[k]=(b[k]||0)+v*lv})}});
    // Prestige upgrades (permanent, survive resets)
    PRESTIGE_UPGRADES.forEach(pu=>{const lv=prestigeUpgrades[pu.id]||0;if(lv>0){const eff=pu.effect(lv);Object.entries(eff).forEach(([k,v])=>{b[k]=(b[k]||0)+v})}});
    // Utility skill passive bonuses (scale with skill level)
    const utilMap={navigation:"gather_speed",scanning:"rare_chance",ocean_cartography:"gather_yield"};
    Object.entries(utilMap).forEach(([sid,bk])=>{
      const lv=Math.floor(((skills[sid]||0)/100));// level from raw xp via sl() would cause circular dep, use raw estimate
      if(lv>0)b[bk]=(b[bk]||0)+lv*0.02;
    });
    return b;
  },[researched,structures,prestigeUpgrades,skills]);

  const maxEnergy=useMemo(()=>100+(bonuses.max_energy||0),[bonuses]);

  const pStats=useMemo(()=>{
    let s={hp:50,atk:1,def:0,mag:0,rng:0};
    s.hp+=sl("pressure_resistance").lv*2;s.atk+=sl("harpoon_mastery").lv+sl("combat_systems").lv;
    s.def+=sl("depth_shielding").lv;s.rng+=sl("sonic_weapons").lv;s.mag+=sl("leviathan_lore").lv;
    ESLOTS.forEach(slot=>{const iid=eq[slot.id];if(iid){const it=ITEMS[iid];if(it&&it.st)Object.entries(it.st).forEach(([k,v])=>{const e=enh[iid]||0;s[k]=(s[k]||0)+Math.floor(v*(1+e*0.08))})}});
    if(bonuses.atk_pct)s.atk=Math.floor(s.atk*(1+bonuses.atk_pct));
    if(bonuses.def_pct)s.def=Math.floor(s.def*(1+bonuses.def_pct));
    return s;
  },[eq,sl,enh,bonuses]);

  // Load
  useEffect(()=>{(async()=>{try{const snap=await getDoc(doc(db,"doc_saves",account.uid));if(snap.exists()){const d=snap.data();if(d.skills)setSkills(d.skills);if(d.inv)setInv(d.inv);if(d.eq)setEq(d.eq);if(d.gold)setGold(d.gold);if(d.enh)setEnh(d.enh);if(d.researchPts)setResearchPts(d.researchPts);if(d.researched)setResearched(d.researched);if(d.structures)setStructures(d.structures);if(d.drones)setDrones(d.drones);if(d.ascensionLevel)setAscensionLevel(d.ascensionLevel);if(d.dataCores)setDataCores(d.dataCores);if(d.prestigeUpgrades)setPrestigeUpgrades(d.prestigeUpgrades);
      if(d.achievements)setAchievements(d.achievements);if(d.lifeStats)setLifeStats(p=>({...p,...d.lifeStats}));
      if(d.blueprints)setBlueprints(d.blueprints);
      if(d.tutorialDone)setTutorialDone(true);
      // Offline progress — up to 8 hours
      if(d.ts){
        const away=Math.min(Date.now()-d.ts, 8*60*60*1000); // cap at 8h
        if(away>60000){ // only if away > 1 min
          const gains={items:{},rp:0,gold:0};
          const savedDrones=d.drones||{};
          const savedStructures=d.structures||{};
          // Drone passive gains
          DRONE_TYPES.forEach(dt=>{
            const count=savedDrones[dt.id]||0;if(!count)return;
            const cycles=Math.floor(away/dt.interval);if(!cycles)return;
            if(dt.action==="gather"||dt.action==="explore"){
              dt.outputs.forEach(out=>{
                if(!out.id)return;
                const roll=out.chance!==undefined?(Math.random()<out.chance*cycles):true;
                if(!roll)return;
                const qty=Math.floor(out.q*count*cycles);
                if(qty>0){gains.items[out.id]=(gains.items[out.id]||0)+qty;setInv(p=>({...p,[out.id]:(p[out.id]||0)+qty}))}
              });
            }
            if(dt.action==="combat"){const g=Math.floor(dt.goldPerKill*count*cycles);gains.gold+=g;setGold(gv=>gv+g)}
          });
          // Structure passive gains
          STRUCTURES.forEach(st=>{
            if(!st.passive)return;
            const lv=savedStructures[st.id]||0;if(!lv)return;
            const qty=(st.passive.baseQty+st.passive.qtyPerLevel*(lv-1))*Math.floor(away/st.passive.interval);
            if(qty>0){gains.items[st.passive.item]=(gains.items[st.passive.item]||0)+qty;setInv(p=>({...p,[st.passive.item]:(p[st.passive.item]||0)+qty}))}
          });
          // RP trickle
          const rpGained=Math.floor((away/10000)*(1+(d.prestigeUpgrades?.research_mastery||0)*2));
          if(rpGained>0){gains.rp=rpGained;setResearchPts(p=>p+rpGained)}
          const hasGains=Object.keys(gains.items).length>0||gains.rp>0||gains.gold>0;
          if(hasGains)setOfflineGains({away,gains});
        }
      }
      // Show tutorial for new players (no prior save)
    }else{setShowTutorial(true)}
    }catch(e){console.error(e)}})()},[account.uid]);

  // Load social on mount
  useEffect(()=>{loadFriends();loadClan();},[account.uid]);
  // Scroll chat to bottom when messages change
  useEffect(()=>{chatEndRef.current?.scrollIntoView({behavior:"smooth"})},[chatMessages,dmMessages,clanChat]);
  // Save
  useEffect(()=>{const t=setInterval(()=>{setDoc(doc(db,"doc_saves",account.uid),{skills,inv,eq,gold,enh,researchPts,researched,structures,drones,ascensionLevel,dataCores,prestigeUpgrades,achievements,lifeStats,blueprints,tutorialDone,ts:Date.now()},{merge:true}).catch(()=>{})},30000);return()=>clearInterval(t)},[skills,inv,eq,gold,enh,researchPts,researched,structures,drones,ascensionLevel,dataCores,prestigeUpgrades,achievements,lifeStats,blueprints,tutorialDone,account.uid]);

  // Energy regen
  useEffect(()=>{const t=setInterval(()=>{setEnergy(e=>Math.min(maxEnergy,e+1*(1+(bonuses.energy_regen||0))))},1000);return()=>clearInterval(t)},[maxEnergy,bonuses.energy_regen]);

  // Pressure — rises in combat, falls when idle
  useEffect(()=>{
    const t=setInterval(()=>{
      if(zoneId){const idx=ZONES.findIndex(z=>z.id===zoneId);const resist=bonuses.pressure_resist||0;setPressure(p=>Math.min(100,p+(idx+1)*0.5*(1-resist)))}
      else setPressure(p=>Math.max(0,p-1));
    },500);
    return()=>clearInterval(t);
  },[zoneId,bonuses.pressure_resist]);

  // Research points trickle
  useEffect(()=>{
    const t=setInterval(()=>{
      const prodLevels=SKILLS.filter(s=>s.cat==="prod").reduce((sum,sk)=>sum+sl(sk.id).lv,0);
      const labBonus=bonuses.rp_gen||0;
      setResearchPts(p=>p+1+Math.floor(prodLevels/10)+Math.floor(labBonus));
    },10000);
    return()=>clearInterval(t);
  },[sl,bonuses.rp_gen]);

  // Structure passive production
  useEffect(()=>{
    const timers=[];
    STRUCTURES.forEach(st=>{
      if(!st.passive)return;
      const lv=structures[st.id]||0;
      if(lv<=0)return;
      const qty=st.passive.baseQty+st.passive.qtyPerLevel*(lv-1);
      const t=setInterval(()=>{
        setInv(p=>({...p,[st.passive.item]:(p[st.passive.item]||0)+qty}));
      },st.passive.interval);
      timers.push(t);
    });
    return()=>timers.forEach(t=>clearInterval(t));
  },[structures]);

  // Total XP required to reach MAX_SKILL_LV — computed once
  const MAX_SKILL_XP=useMemo(()=>{let tot=0;for(let lv=1;lv<MAX_SKILL_LV;lv++)tot+=xpFor(lv);return tot;},[]);
  const gainXp=useCallback((sid,amt)=>setSkills(p=>{
    const cur=p[sid]||0;
    if(cur>=MAX_SKILL_XP)return p; // already mastered
    return{...p,[sid]:Math.min(MAX_SKILL_XP,cur+Math.floor(amt*(1+(bonuses.xp_pct||0))))};
  }),[bonuses.xp_pct,MAX_SKILL_XP]);
  const addIt=useCallback((iid,q)=>setInv(p=>({...p,[iid]:(p[iid]||0)+q})),[]);
  const remIt=useCallback((iid,q)=>setInv(p=>{const c=p[iid]||0;if(c<=q){const n={...p};delete n[iid];return n}return{...p,[iid]:c-q}}),[]);

  // Action tick
  useEffect(()=>{
    if(!curAct)return;
    const sk=SKILLS.find(s=>s.id===curAct.sk);if(!sk)return;
    const act=sk.acts.find(a=>a.id===curAct.act);if(!act)return;
    const speedMult=sk.cat==="gather"?(1+(bonuses.gather_speed||0)):(1+(bonuses.prod_speed||0));
    const dur=(act.t*1000)/speedMult;
    let start=Date.now();
    const tick=setInterval(()=>{
      const p=Math.min(1,(Date.now()-start)/dur);setActProg(p);
      if(p>=1){
        const ci=invRef.current;
        if(act.inp&&!act.inp.every(i=>(ci[i.id]||0)>=i.q)){setCurAct(null);setActProg(0);return}
        if(act.inp)act.inp.forEach(i=>remIt(i.id,i.q));
        gainXp(sk.id,act.xp);
        if(act.out)act.out.forEach(i=>{
          let qty=i.q;
          if(sk.cat==="gather"){qty=Math.floor(qty*(1+(bonuses.gather_yield||0)));if(i.id==="kelp")qty=Math.floor(qty*(1+(bonuses.kelp_yield||0)));if(i.id==="abyss_crystal")qty=Math.floor(qty*(1+(bonuses.crystal_yield||0)))}
          if(Math.random()<(bonuses.rare_chance||0))qty+=1;
          addIt(i.id,qty);
          // Track lifetime gathered items
          if(sk.cat==="gather")setLifeStats(p=>({...p,totalGathered:(p.totalGathered||0)+qty,[i.id]:(p[i.id]||0)+qty}));
        });
        if(sk.cat==="prod")setLifeStats(p=>({...p,crafts:(p.crafts||0)+1}));
        // Utility skill bonus effects
        if(sk.cat==="utility"&&act.util){
          const u=act.util;
          if(u.type==="gold")setGold(g=>g+u.val);
          if(u.type==="rp")setResearchPts(p=>p+u.val);
        }
        // Random discovery chance (gather only, ~8% base + rare_chance bonus)
        if(sk.cat==="gather"&&!activeDiscovery){
          const baseChance=0.08+(bonuses.rare_chance||0)*0.5;
          if(Math.random()<baseChance){
            const pool=DISCOVERIES.filter(d=>Math.random()<d.rarity*20);
            if(pool.length>0){
              const disc=pool[Math.floor(Math.random()*pool.length)];
              setActiveDiscovery(disc);
              setLifeStats(p=>({...p,discoveries:(p.discoveries||0)+1}));
            }
          }
        }
        start=Date.now();setActProg(0);
      }
    },100);
    return()=>clearInterval(tick);
  },[curAct,gainXp,addIt,remIt,bonuses,activeDiscovery]);

  // Combat tick
  useEffect(()=>{
    if(!zoneId||!cbt)return;
    const zone=ZONES.find(z=>z.id===zoneId);if(!zone)return;
    const tick=setInterval(()=>{
      const st=pStats;
      setCbt(prev=>{
        if(!prev)return null;
        let{mob,mhp,php,mxhp,kills,boss}=prev;
        const pd=Math.max(1,st.atk-Math.floor(mob.def*0.5)+Math.floor(Math.random()*3));mhp-=pd;
        if(mhp>0){
          const md=Math.max(1,mob.atk-Math.floor(st.def*0.5)+Math.floor(Math.random()*2));php-=md;
          const ci=invRef.current;
          if(php<mxhp*0.4&&food&&(ci[food]||0)>0){const f=ITEMS[food];if(f&&f.heal){php=Math.min(mxhp,php+f.heal);remIt(food,1)}}
          if(php<=0){setClog(p=>[...p.slice(-20),"☠️ Destroyed by "+mob.n+"!"]);return{...prev,php:mxhp,mhp:mob.hp,mob}}
        }
        if(mhp<=0){
          const nk=kills+1;const xpp=Math.floor(mob.xp/5*(1+(bonuses.combat_xp||0)));
          CSUBS.forEach(s=>gainXp(s.id,xpp));
          const goldGain=Math.floor(mob.g*(1+(bonuses.gold_pct||0)));
          setGold(g=>g+goldGain);setResearchPts(p=>p+Math.floor(mob.xp/20));
          // Track lifetime stats
          setLifeStats(p=>({...p,kills:(p.kills||0)+1,totalGold:(p.totalGold||0)+goldGain}));
          // Zone index for rare drop scaling
          const zIdx=ZONES.findIndex(z=>z.id===zoneId);
          const nb=(nk%10===9)&&zone.boss;
          let logMsg="⚔️ "+(mob.i||"")+" "+mob.n+" neutralized! +"+mob.xp+"xp +"+goldGain+"cr"+(mob.elite?" 💠":"")+(mob.isBoss2?" ⚜️":"");
          // Regular mob rare drops (deep zones only)
          if(zIdx>=3){
            const rareBase=0.04*(zIdx-2)+(bonuses.rare_chance||0);
            const mobRares=[
              {id:"leviathan_bone",ch:rareBase*0.3,z:5},
              {id:"void_pearl",ch:rareBase*0.25,z:4},
              {id:"black_coral",ch:rareBase*0.4,z:3},
              {id:"alien_bio_tissue",ch:rareBase*0.15,z:6},
            ].filter(r=>zIdx>=r.z);
            const rd=[];
            mobRares.forEach(r=>{if(Math.random()<r.ch){setInv(p=>({...p,[r.id]:(p[r.id]||0)+1}));rd.push(ITEMS[r.id].i)}});
            if(rd.length)logMsg+=" ✨"+rd.join("");
          }
          if(boss){
            const dropChance=0.4+(bonuses.boss_drop||0);
            const bossDrops=[
              {id:"abyss_crystal",    q:2, ch:dropChance},
              {id:"drone_processor",  q:1, ch:dropChance*0.5},
              {id:"pressure_reactor", q:1, ch:dropChance*0.3},
              {id:"reinforced_alloy", q:3, ch:dropChance*0.8},
              {id:"leviathan_bone",   q:1, ch:dropChance*0.35},
              {id:"ancient_relic",    q:1, ch:dropChance*0.25},
              {id:"thermal_core",     q:1, ch:dropChance*0.20},
              {id:"void_pearl",       q:1, ch:dropChance*0.20},
              {id:"alien_bio_tissue", q:1, ch:dropChance*0.15*(zIdx/4)},
              {id:"ancient_processor",q:1, ch:dropChance*0.10*(zIdx/6)},
            ];
            const dropped=[];
            bossDrops.forEach(d=>{if(d.ch>0&&Math.random()<d.ch){setInv(p=>({...p,[d.id]:(p[d.id]||0)+d.q}));dropped.push((ITEMS[d.id]?ITEMS[d.id].i:"")+"×"+d.q)}});
            if(dropped.length)logMsg+=" 🎁 "+dropped.join(" ");
            setLifeStats(p=>({...p,bossKills:(p.bossKills||0)+1}));
          }
          setClog(p=>[...p.slice(-20),logMsg]);
          // Pick next mob: boss2 every 25 kills, regular boss every 10, elite 15%, else random mob
          const pickMob=(zone,nk)=>{
            if(nk%25===0)return zone.boss2?{...zone.boss2,isBoss2:true}:zone.boss;
            if(nk%10===0)return zone.boss;
            if(zone.elites&&zone.elites.length&&Math.random()<0.15)return zone.elites[Math.floor(Math.random()*zone.elites.length)];
            return zone.mobs[Math.floor(Math.random()*zone.mobs.length)];
          };
          const nm=pickMob(zone,nk);
          const isBossSpawn=(nk%10===0);
          return{mob:nm,mhp:nm.hp,php,mxhp,kills:nk,boss:isBossSpawn};
        }
        return{...prev,mhp,php};
      });
    },1500);
    return()=>clearInterval(tick);
  },[zoneId,cbt,pStats,gainXp,food,remIt,bonuses]);

  const startAct=useCallback((skId,actId)=>{setZoneId(null);setCbt(null);setCurAct({sk:skId,act:actId});setActProg(0);setActSkill(skId)},[]);
  const startZone=useCallback((zid)=>{const z=ZONES.find(x=>x.id===zid);if(!z)return;setCurAct(null);setZoneId(zid);const m=z.mobs[0];setCbt({mob:m,mhp:m.hp,php:pStats.hp,mxhp:pStats.hp,kills:0,boss:false});setClog(["📡 Entered "+z.name+"...","⚠️ "+z.mobs.length+" mob types · "+(z.elites||[]).length+" elites · 2 bosses"])},[pStats]);
  const stopZone=useCallback(()=>{setZoneId(null);setCbt(null)},[]);
  const equipIt=useCallback((iid)=>{const it=ITEMS[iid];if(!it||!it.eq||(inv[iid]||0)<=0)return;const cur=eq[it.eq];if(cur)addIt(cur,1);remIt(iid,1);setEq(p=>({...p,[it.eq]:iid}))},[inv,eq,addIt,remIt]);
  const unequipIt=useCallback((sid)=>{const iid=eq[sid];if(!iid)return;addIt(iid,1);setEq(p=>{const n={...p};delete n[sid];return n})},[eq,addIt]);
  const doEnh=useCallback((sid)=>{const iid=eq[sid];if(!iid)return;const cl=enh[iid]||0;if(cl>=20)return;const cost=Math.floor(50*Math.pow(1.5,cl));if(gold<cost)return;setGold(g=>g-cost);gainXp("enhancing",20+cl*5);const sr=Math.max(0.2,0.8-cl*0.05);if(Math.random()<sr){setEnh(p=>({...p,[iid]:cl+1}));setClog(p=>[...p.slice(-20),"✨ "+ITEMS[iid].n+" upgraded to +"+(cl+1)+"!"])}else{setEnh(p=>({...p,[iid]:0}));setClog(p=>[...p.slice(-20),"💥 Upgrade failed! "+ITEMS[iid].n+" reset to +0"])}},[eq,enh,gold,gainXp]);

  const doResearch=useCallback((node)=>{
    if(researched[node.id]||researchPts<node.cost)return;
    if(!node.prereqs.every(pid=>researched[pid]))return;
    setResearchPts(p=>p-node.cost);setResearched(p=>({...p,[node.id]:true}));
  },[researched,researchPts]);

  const doBuild=useCallback((st)=>{
    const lv=structures[st.id]||0;
    if(lv>=st.maxLevel)return;
    const cost=lv===0?st.cost:st.levelCost(lv);
    // Check gold
    if((cost.gold||0)>gold)return;
    // Check items
    const itemKeys=Object.keys(cost).filter(k=>k!=="gold");
    if(!itemKeys.every(k=>(invRef.current[k]||0)>=cost[k]))return;
    // Deduct
    if(cost.gold)setGold(g=>g-cost.gold);
    itemKeys.forEach(k=>remIt(k,cost[k]));
    setStructures(p=>({...p,[st.id]:(p[st.id]||0)+1}));
  },[structures,gold,remIt]);

  // Collect discovery rewards
  const collectDiscovery=useCallback(()=>{
    if(!activeDiscovery)return;
    const disc=activeDiscovery;
    let bpUnlocked=null;
    disc.rewards.forEach(r=>{
      if(r.type==="item")addIt(r.id,r.q);
      if(r.type==="xp")SKILLS.filter(s=>s.cat==="gather").forEach(sk=>gainXp(sk.id,20*r.mult));
      if(r.type==="rp")setResearchPts(p=>p+r.amt);
      if(r.type==="blueprint"){
        // Pick one blueprint from the pool that isn't already unlocked
        const avail=r.pool.filter(id=>!blueprints.includes(id));
        if(avail.length>0){
          const chosen=avail[Math.floor(Math.random()*avail.length)];
          setBlueprints(p=>[...p,chosen]);
          bpUnlocked=chosen;
        }
      }
    });
    const bpMeta=bpUnlocked?BLUEPRINTS.find(b=>b.id===bpUnlocked):null;
    const logItems=disc.rewards.filter(r=>r.type==="item").map(r=>(ITEMS[r.id]?ITEMS[r.id].i:"")+r.q+" "+r.id).join(", ");
    const logBp=bpMeta?" 📘 Blueprint: "+bpMeta.name:"";
    setDiscoveryLog(p=>[...p.slice(-20),"🔍 "+disc.name+" — "+logItems+logBp]);
    setActiveDiscovery(null);
  },[activeDiscovery,addIt,gainXp,blueprints]);

  // Marketplace — load shared orders from Firebase
  const loadMarket=useCallback(async()=>{
    setMarketLoading(true);
    try{
      const {collection,getDocs,query,orderBy,limit}=await import("firebase/firestore");
      const q=query(collection(db,"marketplace"),orderBy("ts","desc"),limit(50));
      const snap=await getDocs(q);
      const orders=snap.docs.map(d=>({id:d.id,...d.data()}));
      setMarketOrders(orders.filter(o=>o.seller!==account.uid));
      setMyListings(orders.filter(o=>o.seller===account.uid));
    }catch(e){console.error("Market load:",e)}
    setMarketLoading(false);
  },[account.uid]);

  const listItem=useCallback(async()=>{
    if(!sellItem||(inv[sellItem]||0)<sellQty||sellQty<1||sellPrice<1)return;
    try{
      const {collection,addDoc}=await import("firebase/firestore");
      await addDoc(collection(db,"marketplace"),{
        seller:account.uid,sellerName:account.displayName,
        itemId:sellItem,qty:sellQty,price:sellPrice,
        ts:Date.now()
      });
      remIt(sellItem,sellQty);
      setSellItem("");setSellQty(1);setSellPrice(10);
      await loadMarket();
    }catch(e){console.error("List item:",e)}
  },[sellItem,sellQty,sellPrice,inv,account,remIt,loadMarket]);

  const buyItem=useCallback(async(order)=>{
    if(gold<order.price)return;
    try{
      const {doc:fdoc,deleteDoc,updateDoc,increment}=await import("firebase/firestore");
      await deleteDoc(fdoc(db,"marketplace",order.id));
      setGold(g=>g-order.price);
      addIt(order.itemId,order.qty);
      // Credit seller (best-effort)
      await updateDoc(fdoc(db,"doc_saves",order.seller),{gold:increment(order.price)}).catch(()=>{});
      await loadMarket();
    }catch(e){console.error("Buy item:",e)}
  },[gold,addIt,loadMarket]);

  const cancelListing=useCallback(async(order)=>{
    try{
      const {doc:fdoc,deleteDoc}=await import("firebase/firestore");
      await deleteDoc(fdoc(db,"marketplace",order.id));
      addIt(order.itemId,order.qty);
      await loadMarket();
    }catch(e){console.error("Cancel listing:",e)}
  },[addIt,loadMarket]);

  // Total skill level for ascension threshold
  const totalSkillLevel=useMemo(()=>{
    const allSkillIds=[...SKILLS.map(s=>s.id),...CSUBS.map(c=>c.id),"enhancing"];
    return allSkillIds.reduce((sum,sid)=>sum+sl(sid).lv,0);
  },[sl]);

  // Leaderboard loader
  const loadLeaderboard=useCallback(async()=>{
    setLbLoading(true);
    try{
      // Write our own score first
      const {collection,getDocs,query,orderBy,limit,setDoc:fsetDoc,doc:fdoc}=await import("firebase/firestore");
      await fsetDoc(fdoc(db,"leaderboard",account.uid),{
        name:account.displayName||"Anonymous",
        totalSkillLv:totalSkillLevel,
        ascensions:ascensionLevel,
        kills:lifeStats.kills||0,
        uid:account.uid,
        ts:Date.now(),
      });
      const q=query(collection(db,"leaderboard"),orderBy("totalSkillLv","desc"),limit(20));
      const snap=await getDocs(q);
      setLeaderboard(snap.docs.map((d,i)=>({rank:i+1,id:d.id,...d.data()})));
    }catch(e){console.error("Leaderboard:",e)}
    setLbLoading(false);
  },[account,totalSkillLevel,ascensionLevel,lifeStats.kills]);

  const maxSkillLevel=useMemo(()=>{
    const allSkillIds=[...SKILLS.map(s=>s.id),...CSUBS.map(c=>c.id),"enhancing"];
    return allSkillIds.reduce((mx,sid)=>Math.max(mx,sl(sid).lv),0);
  },[sl]);

  // ─── SOCIAL: Global Chat ───────────────────────────────
  useEffect(()=>{
    let unsub;
    (async()=>{
      try{
        const {collection,query,orderBy,limit,onSnapshot}=await import("firebase/firestore");
        const q=query(collection(db,"global_chat"),orderBy("ts","desc"),limit(60));
        unsub=onSnapshot(q,snap=>{
          const msgs=snap.docs.map(d=>({id:d.id,...d.data()})).reverse();
          setChatMessages(msgs);
        });
      }catch(e){console.error("Chat sub:",e)}
    })();
    return()=>{if(unsub)unsub()};
  },[]);

  const sendChat=useCallback(async()=>{
    const txt=chatInput.trim();if(!txt)return;
    setChatInput("");
    try{
      const {collection,addDoc}=await import("firebase/firestore");
      await addDoc(collection(db,"global_chat"),{
        uid:account.uid,name:account.displayName||"Anon",
        text:txt,ts:Date.now(),
      });
    }catch(e){console.error("sendChat:",e)}
  },[chatInput,account]);

  // ─── SOCIAL: Direct Messages ──────────────────────────
  const loadDm=useCallback(async(target)=>{
    setDmTarget(target);setDmMessages([]);
    try{
      const {collection,query,where,orderBy,getDocs}=await import("firebase/firestore");
      const dmId=[account.uid,target.uid].sort().join("_");
      const q=query(collection(db,"dm_"+dmId),orderBy("ts","asc"));
      const snap=await getDocs(q);
      setDmMessages(snap.docs.map(d=>({id:d.id,...d.data()})));
      setChatTab("dm");
    }catch(e){console.error("loadDm:",e)}
  },[account.uid]);

  const sendDm=useCallback(async()=>{
    const txt=dmInput.trim();if(!txt||!dmTarget)return;
    setDmInput("");
    try{
      const {collection,addDoc}=await import("firebase/firestore");
      const dmId=[account.uid,dmTarget.uid].sort().join("_");
      const msg={uid:account.uid,name:account.displayName||"Anon",text:txt,ts:Date.now()};
      await addDoc(collection(db,"dm_"+dmId),msg);
      setDmMessages(p=>[...p,msg]);
    }catch(e){console.error("sendDm:",e)}
  },[dmInput,dmTarget,account]);

  // ─── SOCIAL: Friends ──────────────────────────────────
  const loadFriends=useCallback(async()=>{
    try{
      const {doc:fdoc,getDoc:fget,collection,getDocs,query,where}=await import("firebase/firestore");
      // Load incoming requests
      const reqSnap=await fget(fdoc(db,"friend_requests",account.uid));
      const reqs=reqSnap.exists()?(reqSnap.data().requests||[]):[];
      setFriendReqs(reqs);
      // Load friends list
      const frSnap=await fget(fdoc(db,"friends",account.uid));
      const frIds=frSnap.exists()?(frSnap.data().friends||[]):[];
      const frProfiles=await Promise.all(frIds.map(async uid=>{
        try{
          const p=await fget(fdoc(db,"leaderboard",uid));
          return p.exists()?{uid,...p.data()}:{uid,name:uid};
        }catch{return{uid,name:uid}}
      }));
      setFriends(frProfiles);
    }catch(e){console.error("loadFriends:",e)}
  },[account.uid]);

  const sendFriendReq=useCallback(async()=>{
    const target=addFriendInput.trim();if(!target){setAddFriendErr("Enter a commander name");return}
    setAddFriendErr("");
    try{
      const {collection,getDocs,query,where,doc:fdoc,setDoc,getDoc:fget,arrayUnion}=await import("firebase/firestore");
      // Find user by displayName in leaderboard
      const snap=await getDocs(query(collection(db,"leaderboard"),where("name","==",target)));
      if(snap.empty){setAddFriendErr("Commander not found");return}
      const targetDoc=snap.docs[0];const targetUid=targetDoc.id;
      if(targetUid===account.uid){setAddFriendErr("Can't add yourself");return}
      // Write request to their doc
      const reqRef=fdoc(db,"friend_requests",targetUid);
      const existing=await fget(reqRef);
      const reqs=existing.exists()?(existing.data().requests||[]):[];
      if(reqs.find(r=>r.uid===account.uid)){setAddFriendErr("Request already sent");return}
      await setDoc(reqRef,{requests:[...reqs,{uid:account.uid,name:account.displayName||"Anon"}]},{merge:true});
      setAddFriendInput("");setAddFriendErr("Request sent! ✓");
    }catch(e){console.error("sendFriendReq:",e);setAddFriendErr("Error: "+e.message)}
  },[addFriendInput,account]);

  const acceptFriend=useCallback(async(req)=>{
    try{
      const {doc:fdoc,setDoc,getDoc:fget,arrayUnion}=await import("firebase/firestore");
      // Add each other to friends lists
      const myRef=fdoc(db,"friends",account.uid);
      const theirRef=fdoc(db,"friends",req.uid);
      const myDoc=await fget(myRef);const theirDoc=await fget(theirRef);
      const myFriends=myDoc.exists()?(myDoc.data().friends||[]):[];
      const theirFriends=theirDoc.exists()?(theirDoc.data().friends||[]):[];
      if(!myFriends.includes(req.uid))await setDoc(myRef,{friends:[...myFriends,req.uid]},{merge:true});
      if(!theirFriends.includes(account.uid))await setDoc(theirRef,{friends:[...theirFriends,account.uid]},{merge:true});
      // Remove from requests
      const reqRef=fdoc(db,"friend_requests",account.uid);
      const reqDoc=await fget(reqRef);
      const reqs=(reqDoc.data()?.requests||[]).filter(r=>r.uid!==req.uid);
      await setDoc(reqRef,{requests:reqs},{merge:true});
      await loadFriends();
    }catch(e){console.error("acceptFriend:",e)}
  },[account.uid,loadFriends]);

  const declineFriend=useCallback(async(req)=>{
    try{
      const {doc:fdoc,setDoc,getDoc:fget}=await import("firebase/firestore");
      const reqRef=fdoc(db,"friend_requests",account.uid);
      const reqDoc=await fget(reqRef);
      const reqs=(reqDoc.data()?.requests||[]).filter(r=>r.uid!==req.uid);
      await setDoc(reqRef,{requests:reqs},{merge:true});
      setFriendReqs(p=>p.filter(r=>r.uid!==req.uid));
    }catch(e){console.error("declineFriend:",e)}
  },[account.uid]);

  const removeFriend=useCallback(async(uid)=>{
    try{
      const {doc:fdoc,setDoc,getDoc:fget}=await import("firebase/firestore");
      const myRef=fdoc(db,"friends",account.uid);
      const myDoc=await fget(myRef);
      const updated=(myDoc.data()?.friends||[]).filter(id=>id!==uid);
      await setDoc(myRef,{friends:updated},{merge:true});
      setFriends(p=>p.filter(f=>f.uid!==uid));
    }catch(e){console.error("removeFriend:",e)}
  },[account.uid]);

  // ─── SOCIAL: Clans ────────────────────────────────────
  const loadClan=useCallback(async()=>{
    try{
      const {doc:fdoc,getDoc:fget,collection,getDocs,query,where,orderBy}=await import("firebase/firestore");
      // Check if player is in a clan
      const memberRef=fdoc(db,"clan_members",account.uid);
      const memberDoc=await fget(memberRef);
      if(!memberDoc.exists()||!memberDoc.data().clanId){setClan(null);return}
      const clanId=memberDoc.data().clanId;
      const clanDoc=await fget(fdoc(db,"clans",clanId));
      if(!clanDoc.exists()){setClan(null);return}
      setClan({id:clanId,...clanDoc.data()});
      // Load members
      const snap=await getDocs(query(collection(db,"clan_members"),where("clanId","==",clanId)));
      const members=await Promise.all(snap.docs.map(async d=>{
        const lb=await fget(fdoc(db,"leaderboard",d.id));
        return{uid:d.id,role:d.data().role,...(lb.exists()?lb.data():{name:d.id})};
      }));
      setClanMembers(members.sort((a,b)=>(b.totalSkillLv||0)-(a.totalSkillLv||0)));
      // Load clan chat
      const chatSnap=await getDocs(query(collection(db,"clan_chat_"+clanId),orderBy("ts","desc")));
      setClanChat(chatSnap.docs.map(d=>({id:d.id,...d.data()})).reverse().slice(-60));
    }catch(e){console.error("loadClan:",e)}
  },[account.uid]);

  const createClan=useCallback(async()=>{
    const name=createClanName.trim();const tag=createClanTag.trim().toUpperCase().slice(0,4);
    if(!name||!tag)return;
    try{
      const {doc:fdoc,setDoc,collection,addDoc,getDocs,query,where}=await import("firebase/firestore");
      // Check name/tag uniqueness
      const existing=await getDocs(query(collection(db,"clans"),where("tag","==",tag)));
      if(!existing.empty){alert("Tag already taken");return}
      const clanRef=fdoc(db,"clans",name.toLowerCase().replace(/\s+/g,"_"));
      await setDoc(clanRef,{name,tag,leader:account.uid,leaderName:account.displayName||"Anon",memberCount:1,ts:Date.now(),totalSkillLv:totalSkillLevel});
      await setDoc(fdoc(db,"clan_members",account.uid),{clanId:clanRef.id,role:"leader",joinedTs:Date.now()});
      setCreateClanName("");setCreateClanTag("");
      await loadClan();
    }catch(e){console.error("createClan:",e);alert("Error: "+e.message)}
  },[createClanName,createClanTag,account,totalSkillLevel,loadClan]);

  const searchClans=useCallback(async()=>{
    if(!clanSearchInput.trim())return;
    try{
      const {collection,getDocs,query,orderBy,limit}=await import("firebase/firestore");
      const snap=await getDocs(query(collection(db,"clans"),orderBy("totalSkillLv","desc"),limit(20)));
      const results=snap.docs.map(d=>({id:d.id,...d.data()}));
      const q=clanSearchInput.toLowerCase();
      setClanSearch(results.filter(c=>c.name.toLowerCase().includes(q)||c.tag.toLowerCase().includes(q)));
    }catch(e){console.error("searchClans:",e)}
  },[clanSearchInput]);

  const joinClan=useCallback(async(clanId)=>{
    try{
      const {doc:fdoc,setDoc,getDoc:fget,increment,updateDoc}=await import("firebase/firestore");
      await setDoc(fdoc(db,"clan_members",account.uid),{clanId,role:"member",joinedTs:Date.now()});
      const clanRef=fdoc(db,"clans",clanId);
      const clanDoc=await fget(clanRef);
      await updateDoc(clanRef,{memberCount:(clanDoc.data()?.memberCount||0)+1});
      await loadClan();
    }catch(e){console.error("joinClan:",e)}
  },[account.uid,loadClan]);

  const leaveClan=useCallback(async()=>{
    if(!clan)return;
    try{
      const {doc:fdoc,setDoc,getDoc:fget,updateDoc}=await import("firebase/firestore");
      await setDoc(fdoc(db,"clan_members",account.uid),{clanId:null,role:null},{merge:true});
      const clanRef=fdoc(db,"clans",clan.id);
      const clanDoc=await fget(clanRef);
      await updateDoc(clanRef,{memberCount:Math.max(0,(clanDoc.data()?.memberCount||1)-1)});
      setClan(null);setClanMembers([]);setClanChat([]);
    }catch(e){console.error("leaveClan:",e)}
  },[clan,account.uid]);

  const sendClanChat=useCallback(async()=>{
    const txt=clanChatInput.trim();if(!txt||!clan)return;
    setClanChatInput("");
    try{
      const {collection,addDoc}=await import("firebase/firestore");
      const msg={uid:account.uid,name:account.displayName||"Anon",text:txt,ts:Date.now()};
      await addDoc(collection(db,"clan_chat_"+clan.id),msg);
      setClanChat(p=>[...p.slice(-59),msg]);
    }catch(e){console.error("sendClanChat:",e)}
  },[clanChatInput,clan,account]);

  // Build current achievement check snapshot
  const achSnapshot=useMemo(()=>({
    ...lifeStats,
    equippedSlots:Object.values(eq).filter(Boolean).length,
    researched:Object.values(researched).filter(Boolean).length,
    structures:Object.values(structures).filter(v=>v>0).length,
    dronesConcurrent:Object.values(drones).reduce((s,v)=>s+(v||0),0),
    ascensions:ascensionLevel,
    maxSkillLv:maxSkillLevel,
    totalSkillLv:totalSkillLevel,
  }),[lifeStats,eq,researched,structures,drones,ascensionLevel,maxSkillLevel,totalSkillLevel]);

  // Check achievements whenever snapshot changes
  useEffect(()=>{
    ACHIEVEMENTS.forEach(ach=>{
      if(achievements[ach.id])return;
      if(ach.check(achSnapshot)){
        setAchievements(p=>({...p,[ach.id]:true}));
        // Apply reward
        if(ach.reward.rp)setResearchPts(p=>p+ach.reward.rp);
        if(ach.reward.gold)setGold(g=>g+ach.reward.gold);
        if(ach.reward.dataCores)setDataCores(c=>c+ach.reward.dataCores);
        setNewAch(ach);
        setTimeout(()=>setNewAch(null),4000);
      }
    });
  },[achSnapshot]); // eslint-disable-line

  const nextThreshold=ASCENSION_THRESHOLDS[ascensionLevel]||null;
  const canAscend=nextThreshold!==null&&totalSkillLevel>=nextThreshold;
  const coresOnAscend=ascensionLevel+1; // earn 1 core per ascension, scaling

  const doAscend=useCallback(()=>{
    if(!canAscend)return;
    const earned=coresOnAscend;
    // Reset: resources, structures, equipment, gold, drones, research, action
    setInv({});setEq({});setGold(0);setEnh({});
    setStructures({});setDrones({});
    setResearched({});setResearchPts(0);
    setCurAct(null);setActProg(0);setZoneId(null);setCbt(null);
    // Keep: skills (XP halved), prestige upgrades, ascension level
    setSkills(p=>{const n={};Object.entries(p).forEach(([k,v])=>{n[k]=Math.floor(v*0.5)});return n});
    setAscensionLevel(a=>a+1);
    setDataCores(c=>c+earned);
    setShowAscendConfirm(false);
  },[canAscend,coresOnAscend]);

  const doBuyPrestige=useCallback((pu)=>{
    const lv=prestigeUpgrades[pu.id]||0;
    if(lv>=pu.maxLevel)return;
    const cost=pu.costPerLevel*(lv+1);
    if(dataCores<cost)return;
    setDataCores(c=>c-cost);
    setPrestigeUpgrades(p=>({...p,[pu.id]:(p[pu.id]||0)+1}));
  },[prestigeUpgrades,dataCores]);

  // Deploy a drone
  const deployDrone=useCallback((dt)=>{
    const deployed=drones[dt.id]||0;
    if(deployed>=dt.maxDeployed)return;
    const cost=dt.deployCost;
    const gold_cost=cost.gold||0;
    if(gold_cost>gold)return;
    const itemKeys=Object.keys(cost).filter(k=>k!=="gold");
    if(!itemKeys.every(k=>(invRef.current[k]||0)>=cost[k]))return;
    if(gold_cost)setGold(g=>g-gold_cost);
    itemKeys.forEach(k=>remIt(k,cost[k]));
    setDrones(p=>({...p,[dt.id]:(p[dt.id]||0)+1}));
    setLifeStats(p=>({...p,dronesDeployed:(p.dronesDeployed||0)+1}));
    setDroneLogs(p=>[...p.slice(-30),"🚀 "+dt.name+" deployed! ("+((drones[dt.id]||0)+1)+"/"+dt.maxDeployed+")"]);
  },[drones,gold,remIt]);

  const recallDrone=useCallback((dt)=>{
    if((drones[dt.id]||0)<=0)return;
    setDrones(p=>({...p,[dt.id]:Math.max(0,(p[dt.id]||0)-1)}));
    setDroneLogs(p=>[...p.slice(-30),"◄ "+dt.name+" recalled."]);
  },[drones]);

  // Drone tick — each drone type runs at its interval, qty = deployed count
  useEffect(()=>{
    const timers=[];
    DRONE_TYPES.forEach(dt=>{
      const count=drones[dt.id]||0;
      if(count<=0)return;
      const t=setInterval(()=>{
        if(dt.action==="gather"||dt.action==="explore"){
          const yieldMult=(1+(bonuses.gather_yield||0))*(1+(bonuses.drone_efficiency||0));
          dt.outputs.forEach(out=>{
            if(!out.id)return;
            const roll=out.chance!==undefined?Math.random()<out.chance:true;
            if(!roll)return;
            const qty=Math.floor(out.q*count*yieldMult);
            if(qty>0)setInv(p=>({...p,[out.id]:(p[out.id]||0)+qty}));
          });
          gainXp(dt.xpSkill,Math.floor(dt.xpAmt*count*(1+(bonuses.xp_pct||0))));
          if(dt.action==="explore"&&Math.random()<0.08*count){
            setDroneLogs(p=>[...p.slice(-30),"🔭 Explorer found something unusual..."]);
          }
        }
        if(dt.action==="combat"){
          const goldEarned=Math.floor(dt.goldPerKill*count*(1+(bonuses.gold_pct||0))*(1+(bonuses.drone_efficiency||0)));
          setGold(g=>g+goldEarned);
          gainXp(dt.xpSkill,Math.floor(dt.xpAmt*count*(1+(bonuses.combat_xp||0))));
          setResearchPts(p=>p+count);
          setDroneLogs(p=>[...p.slice(-30),"⚔️ Combat drones earned ◈"+goldEarned]);
        }
      },dt.interval);
      timers.push(t);
    });
    return()=>timers.forEach(t=>clearInterval(t));
  },[drones,bonuses,gainXp]);

  const skData=SKILLS.find(s=>s.id===actSkill);

  const activeBonusList=useMemo(()=>{
    const lines=[];
    if(bonuses.atk_pct>0)lines.push("ATK +"+(bonuses.atk_pct*100).toFixed(0)+"%");
    if(bonuses.def_pct>0)lines.push("DEF +"+(bonuses.def_pct*100).toFixed(0)+"%");
    if(bonuses.xp_pct>0)lines.push("XP +"+(bonuses.xp_pct*100).toFixed(0)+"%");
    if(bonuses.gather_yield>0)lines.push("Yield +"+(bonuses.gather_yield*100).toFixed(0)+"%");
    if(bonuses.gather_speed>0)lines.push("Speed +"+(bonuses.gather_speed*100).toFixed(0)+"%");
    if(bonuses.prod_speed>0)lines.push("Prod +"+(bonuses.prod_speed*100).toFixed(0)+"%");
    if(bonuses.gold_pct>0)lines.push("Credits +"+(bonuses.gold_pct*100).toFixed(0)+"%");
    if(bonuses.combat_xp>0)lines.push("CbtXP +"+(bonuses.combat_xp*100).toFixed(0)+"%");
    if(bonuses.energy_regen>0)lines.push("ERegenx"+(1+bonuses.energy_regen).toFixed(1));
    if(bonuses.max_energy>0)lines.push("MaxE +"+bonuses.max_energy);
    if(bonuses.rare_chance>0)lines.push("Rare +"+(bonuses.rare_chance*100).toFixed(0)+"%");
    if(bonuses.crystal_yield>0)lines.push("Crystal ×"+(1+bonuses.crystal_yield).toFixed(1));
    if(bonuses.rp_gen>0)lines.push("RP +"+Math.floor(bonuses.rp_gen)+"/tick");
    if(bonuses.pressure_resist>0)lines.push("PressBuild -"+(bonuses.pressure_resist*100).toFixed(0)+"%");
    if(bonuses.drone_efficiency>0)lines.push("DroneYield +"+(bonuses.drone_efficiency*100).toFixed(0)+"%");
    return lines;
  },[bonuses]);

  // MWI-style skill row: name left, "XX.XX% LV" right, colored XP bar below
  const SkillNav=({sk,running})=>{
    const s=sl(sk.id);
    const pct=s.mastered?100:s.need>0?(s.xp/s.need)*100:0;
    const act=actSkill===sk.id&&page==="skills";
    return(
      <div onClick={()=>{setActSkill(sk.id);setPage("skills")}} style={{display:"flex",alignItems:"center",gap:6,padding:"4px 8px 4px 6px",cursor:"pointer",background:act?"linear-gradient(90deg,"+sk.color+"22,transparent)":"transparent",borderLeft:"3px solid "+(act?sk.color:"transparent"),transition:"all 0.15s"}}>
        <span style={{fontSize:15,width:20,textAlign:"center",flexShrink:0,filter:running?"drop-shadow(0 0 5px "+sk.color+")":s.mastered?"drop-shadow(0 0 5px "+C.gold+")":"none"}}>{sk.icon}</span>
        <div style={{flex:1,minWidth:0}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",marginBottom:2}}>
            <span style={{fontSize:12,color:act?sk.color:s.mastered?C.gold:C.text,fontWeight:600,fontFamily:FONT_BODY,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{sk.name}</span>
            <span style={{fontSize:11,color:s.mastered?C.gold:C.ts,fontWeight:700,fontFamily:FONT,flexShrink:0,marginLeft:4}}>{s.mastered?"★":(pct.toFixed(2)+"% "+s.lv)}</span>
          </div>
          <div style={{height:3,borderRadius:2,background:C.bg,overflow:"hidden"}}>
            <div style={{width:pct+"%",height:"100%",background:s.mastered?C.gold:running?C.ok:sk.color,borderRadius:2,transition:"width 0.3s"}}/>
          </div>
        </div>
      </div>
    );
  };

  // MWI-style combat sub-skill row (same height as SkillNav)
  const CSubNav=({cs})=>{
    const s=sl(cs.id);
    const pct=s.need>0?(s.xp/s.need)*100:0;
    return(
      <div style={{display:"flex",alignItems:"center",gap:6,padding:"4px 8px 4px 22px",cursor:"default"}}>
        <span style={{fontSize:14,width:18,textAlign:"center",flexShrink:0}}>{cs.icon}</span>
        <div style={{flex:1,minWidth:0}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",marginBottom:2}}>
            <span style={{fontSize:12,color:C.ts,fontFamily:FONT_BODY,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{cs.name}</span>
            <span style={{fontSize:11,color:C.ts,fontWeight:700,fontFamily:FONT,flexShrink:0,marginLeft:4}}>{pct.toFixed(2)+"% "+s.lv}</span>
          </div>
          <div style={{height:3,borderRadius:2,background:C.bg,overflow:"hidden"}}>
            <div style={{width:pct+"%",height:"100%",background:cs.color,borderRadius:2,transition:"width 0.3s"}}/>
          </div>
        </div>
      </div>
    );
  };

  // Plain nav item (non-skill pages)
  const NavItem=({id,icon,label,badge})=>{const act=page===id;return(
    <div onClick={()=>setPage(id)} style={{display:"flex",alignItems:"center",gap:6,padding:"6px 8px 6px 9px",cursor:"pointer",background:act?"linear-gradient(90deg,"+C.acc+"22,transparent)":"transparent",borderLeft:"3px solid "+(act?C.acc:"transparent"),transition:"all 0.15s"}}>
      <span style={{fontSize:15,width:20,textAlign:"center",flexShrink:0}}>{icon}</span>
      <span style={{fontSize:12,color:act?C.acc:C.text,fontFamily:FONT_BODY,fontWeight:act?700:400,flex:1}}>{label}</span>
      {badge!=null&&<span style={{fontSize:10,color:C.white,fontWeight:700,fontFamily:FONT,background:C.bad,padding:"1px 6px",borderRadius:8,flexShrink:0}}>{badge}</span>}
    </div>
  );};
  const ItemCell=({id,qty})=>{
    const it=ITEMS[id];if(!it||!qty)return null;
    const rareColor=it.rarity==="rare"?C.gold:it.rarity==="uncommon"?C.purp:null;
    return(
      <div title={it.n+" ×"+fmt(qty)} style={{position:"relative",width:44,height:44,borderRadius:6,background:rareColor?rareColor+"18":C.bg,border:"1px solid "+(rareColor?rareColor+"60":C.border),display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",cursor:"default",overflow:"hidden",flexShrink:0}}>
        <span style={{fontSize:18,lineHeight:1}}>{it.i||"📦"}</span>
        <span style={{fontSize:8,color:rareColor||C.ts,fontWeight:700,fontFamily:FONT,lineHeight:1,marginTop:1}}>{qty>=1000?Math.floor(qty/1000)+"k":qty}</span>
        {rareColor&&<div style={{position:"absolute",top:0,left:0,right:0,height:2,background:rareColor,opacity:0.7,borderRadius:"6px 6px 0 0"}}/>}
      </div>
    );
  };

  return(
    <div style={{width:"100%",height:"100vh",display:"flex",flexDirection:"column",fontFamily:FONT,background:C.bg,color:C.text,overflow:"hidden"}}>

      {/* ===== TUTORIAL MODAL ===== */}
      {showTutorial&&(()=>{
        const step=TUTORIAL_STEPS[tutorialStep];
        const isLast=tutorialStep===TUTORIAL_STEPS.length-1;
        return(
          <div style={{position:"fixed",inset:0,zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",background:"#00000090",backdropFilter:"blur(4px)"}}>
            <div style={{maxWidth:480,width:"90%",padding:"28px 28px 24px",borderRadius:16,background:"linear-gradient(135deg,"+C.panel+","+C.card+")",border:"2px solid "+C.acc+"50",boxShadow:"0 0 50px "+C.acc+"30",animation:"slideIn 0.3s ease-out"}}>
              {/* Step counter */}
              <div style={{display:"flex",gap:4,marginBottom:16,justifyContent:"center"}}>
                {TUTORIAL_STEPS.map((_,i)=>(
                  <div key={i} style={{width:i===tutorialStep?20:6,height:6,borderRadius:3,background:i<=tutorialStep?C.acc:C.border,transition:"all 0.2s"}}/>
                ))}
              </div>
              <div style={{textAlign:"center",marginBottom:20}}>
                <div style={{fontSize:40,marginBottom:10,filter:"drop-shadow(0 0 12px "+C.acc+")"}}>{step.icon}</div>
                <div style={{fontSize:20,fontWeight:700,color:C.white,letterSpacing:2,marginBottom:10,fontFamily:FONT}}>{step.title}</div>
                <div style={{fontSize:12,color:C.ts,fontFamily:FONT_BODY,lineHeight:1.7}}>{step.body}</div>
              </div>
              <div style={{display:"flex",gap:10}}>
                {tutorialStep>0&&<div onClick={()=>setTutorialStep(p=>p-1)} style={{flex:1,padding:"10px 0",borderRadius:8,background:C.card,border:"1px solid "+C.border,color:C.ts,fontSize:11,fontWeight:700,cursor:"pointer",textAlign:"center",letterSpacing:1,fontFamily:FONT}}>← BACK</div>}
                <div onClick={()=>{
                  if(isLast){setShowTutorial(false);setTutorialDone(true);setTutorialStep(0)}
                  else setTutorialStep(p=>p+1);
                  if(step.highlight)setPage(step.highlight==="gather"||step.highlight==="prod"||step.highlight==="utility"?"skills":step.highlight);
                }} style={{flex:2,padding:"10px 0",borderRadius:8,background:"linear-gradient(90deg,"+C.accD+","+C.acc+")",color:C.bg,fontSize:11,fontWeight:700,cursor:"pointer",textAlign:"center",letterSpacing:1,fontFamily:FONT,boxShadow:GLOW_STYLE}}>
                  {isLast?"✓ START PLAYING":"NEXT →"}
                </div>
                <div onClick={()=>{setShowTutorial(false);setTutorialDone(true)}} style={{flex:1,padding:"10px 0",borderRadius:8,background:C.card,border:"1px solid "+C.border,color:C.td,fontSize:10,cursor:"pointer",textAlign:"center",fontFamily:FONT}}>SKIP</div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ===== SETTINGS MODAL ===== */}
      {showSettings&&(
        <div style={{position:"fixed",inset:0,zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",background:"#00000088",backdropFilter:"blur(4px)"}}>
          <div style={{maxWidth:420,width:"90%",padding:"24px",borderRadius:16,background:"linear-gradient(135deg,"+C.panel+","+C.card+")",border:"2px solid "+C.border,animation:"slideIn 0.25s ease-out"}}>
            <div style={{fontSize:13,fontWeight:700,color:C.white,letterSpacing:2,marginBottom:16,fontFamily:FONT}}>⚙️ SETTINGS</div>
            {/* Account info */}
            <div style={{padding:"12px",borderRadius:8,background:C.bg,border:"1px solid "+C.border,marginBottom:12}}>
              <div style={{fontSize:9,color:C.td,letterSpacing:2,marginBottom:8}}>ACCOUNT</div>
              <div style={{fontSize:11,color:C.text,fontFamily:FONT_BODY,marginBottom:4}}>👤 {account.displayName||"Anonymous"}</div>
              <div style={{fontSize:11,color:C.ts,fontFamily:FONT_BODY}}>📧 {account.email}</div>
            </div>
            {/* Game info */}
            <div style={{padding:"12px",borderRadius:8,background:C.bg,border:"1px solid "+C.border,marginBottom:12}}>
              <div style={{fontSize:9,color:C.td,letterSpacing:2,marginBottom:8}}>PROGRESS</div>
              {[
                ["Total Skill Level",totalSkillLevel],
                ["Ascension Level",ascensionLevel],
                ["Data Cores",dataCores],
                ["Blueprints Unlocked",blueprints.length+"/"+BLUEPRINTS.length],
                ["Achievements",Object.keys(achievements).length+"/"+ACHIEVEMENTS.length],
              ].map(([l,v])=>(
                <div key={l} style={{display:"flex",justifyContent:"space-between",padding:"3px 0",fontSize:10,fontFamily:FONT_BODY}}>
                  <span style={{color:C.ts}}>{l}</span>
                  <span style={{color:C.acc,fontWeight:700}}>{v}</span>
                </div>
              ))}
            </div>
            {/* Tutorial replay */}
            <div onClick={()=>{setShowSettings(false);setTutorialStep(0);setShowTutorial(true)}} style={{padding:"10px",borderRadius:8,background:C.card,border:"1px solid "+C.border,color:C.acc,fontSize:11,fontWeight:700,cursor:"pointer",textAlign:"center",letterSpacing:1,fontFamily:FONT,marginBottom:8}}>
              ❓ REPLAY TUTORIAL
            </div>
            {/* Logout */}
            <div onClick={()=>{setShowSettings(false);setShowLogoutConfirm(true)}} style={{padding:"10px",borderRadius:8,background:C.bad+"15",border:"1px solid "+C.bad+"40",color:C.bad,fontSize:11,fontWeight:700,cursor:"pointer",textAlign:"center",letterSpacing:1,fontFamily:FONT,marginBottom:12}}>
              ◉ LOGOUT
            </div>
            <div onClick={()=>setShowSettings(false)} style={{padding:"10px",borderRadius:8,background:C.card,border:"1px solid "+C.border,color:C.ts,fontSize:11,cursor:"pointer",textAlign:"center",fontFamily:FONT}}>
              CLOSE
            </div>
          </div>
        </div>
      )}

      {/* ===== LOGOUT CONFIRM ===== */}
      {showLogoutConfirm&&(
        <div style={{position:"fixed",inset:0,zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",background:"#00000088",backdropFilter:"blur(4px)"}}>
          <div style={{maxWidth:340,width:"90%",padding:"24px",borderRadius:16,background:"linear-gradient(135deg,"+C.panel+","+C.card+")",border:"2px solid "+C.bad+"40",animation:"slideIn 0.25s ease-out",textAlign:"center"}}>
            <div style={{fontSize:28,marginBottom:10}}>🚪</div>
            <div style={{fontSize:13,fontWeight:700,color:C.white,letterSpacing:2,marginBottom:8,fontFamily:FONT}}>LOGOUT?</div>
            <div style={{fontSize:11,color:C.ts,fontFamily:FONT_BODY,marginBottom:20,lineHeight:1.5}}>Your progress is saved automatically every 30 seconds. Any unsaved gains from the last 30s may be lost.</div>
            <div style={{display:"flex",gap:10}}>
              <div onClick={()=>setShowLogoutConfirm(false)} style={{flex:1,padding:"10px 0",borderRadius:8,background:C.card,border:"1px solid "+C.border,color:C.ts,fontSize:11,fontWeight:700,cursor:"pointer",textAlign:"center",fontFamily:FONT}}>CANCEL</div>
              <div onClick={()=>{setShowLogoutConfirm(false);onLogout()}} style={{flex:1,padding:"10px 0",borderRadius:8,background:C.bad+"20",border:"2px solid "+C.bad+"60",color:C.bad,fontSize:11,fontWeight:700,cursor:"pointer",textAlign:"center",fontFamily:FONT}}>LOGOUT</div>
            </div>
          </div>
        </div>
      )}

      {/* ===== ACHIEVEMENT TOAST ===== */}
      {newAch&&(
        <div style={{position:"fixed",bottom:24,right:24,zIndex:997,maxWidth:320,padding:"14px 18px",borderRadius:12,background:"linear-gradient(135deg,"+C.panel+","+C.card+")",border:"2px solid "+C.gold+"70",boxShadow:"0 0 30px "+C.gold+"40",animation:"slideIn 0.3s ease-out",display:"flex",alignItems:"center",gap:12}}>
          <span style={{fontSize:28,filter:"drop-shadow(0 0 8px "+C.gold+")",flexShrink:0}}>{newAch.icon}</span>
          <div>
            <div style={{fontSize:11,fontWeight:700,color:C.gold,letterSpacing:2,marginBottom:2}}>ACHIEVEMENT UNLOCKED</div>
            <div style={{fontSize:12,fontWeight:700,color:C.white,fontFamily:FONT,marginBottom:2}}>{newAch.name}</div>
            <div style={{fontSize:10,color:C.ts,fontFamily:FONT_BODY}}>{newAch.desc}</div>
            <div style={{fontSize:9,color:C.ok,marginTop:4,fontFamily:FONT_BODY}}>
              {newAch.reward.rp&&`+${newAch.reward.rp} RP `}{newAch.reward.gold&&`+${newAch.reward.gold} cr `}{newAch.reward.dataCores&&`+${newAch.reward.dataCores} Core`}
            </div>
          </div>
        </div>
      )}

      {/* ===== OFFLINE GAINS MODAL ===== */}
      {offlineGains&&(
        <div style={{position:"fixed",inset:0,zIndex:998,display:"flex",alignItems:"center",justifyContent:"center",background:"#00000088",backdropFilter:"blur(4px)"}}>
          <div style={{maxWidth:420,width:"90%",padding:"28px 24px",borderRadius:16,background:"linear-gradient(135deg,"+C.panel+","+C.card+")",border:"2px solid "+C.acc+"60",boxShadow:"0 0 40px "+C.acc+"30",animation:"slideIn 0.3s ease-out"}}>
            <div style={{textAlign:"center",marginBottom:16}}>
              <div style={{fontSize:40,marginBottom:8}}>🌊</div>
              <div style={{fontSize:14,fontWeight:700,color:C.acc,letterSpacing:2,marginBottom:4,fontFamily:FONT}}>WELCOME BACK</div>
              <div style={{fontSize:11,color:C.ts,fontFamily:FONT_BODY}}>
                Away for {offlineGains.away>=3600000?(offlineGains.away/3600000).toFixed(1)+"h":(offlineGains.away/60000).toFixed(0)+"m"} · Your drones kept working!
              </div>
            </div>
            <div style={{padding:"12px 16px",borderRadius:8,background:C.acc+"10",border:"1px solid "+C.acc+"30",marginBottom:16}}>
              <div style={{fontSize:9,fontWeight:700,color:C.acc,marginBottom:8,letterSpacing:2}}>OFFLINE GAINS</div>
              <div style={{display:"flex",flexDirection:"column",gap:4}}>
                {Object.entries(offlineGains.gains.items).map(([id,qty])=>(
                  <div key={id} style={{display:"flex",alignItems:"center",gap:8,fontSize:11,fontFamily:FONT_BODY}}>
                    <span>{ITEMS[id]?ITEMS[id].i:"📦"}</span>
                    <span style={{color:C.ok,fontWeight:700}}>+{fmt(qty)}</span>
                    <span style={{color:C.ts}}>{ITEMS[id]?ITEMS[id].n:id}</span>
                  </div>
                ))}
                {offlineGains.gains.gold>0&&<div style={{display:"flex",alignItems:"center",gap:8,fontSize:11,fontFamily:FONT_BODY}}><span>◈</span><span style={{color:C.gold,fontWeight:700}}>+{fmt(offlineGains.gains.gold)}</span><span style={{color:C.ts}}>Credits</span></div>}
                {offlineGains.gains.rp>0&&<div style={{display:"flex",alignItems:"center",gap:8,fontSize:11,fontFamily:FONT_BODY}}><span>🔬</span><span style={{color:C.purp,fontWeight:700}}>+{fmt(offlineGains.gains.rp)}</span><span style={{color:C.ts}}>Research Points</span></div>}
              </div>
            </div>
            <div onClick={()=>setOfflineGains(null)} style={{padding:"11px 0",borderRadius:8,background:"linear-gradient(90deg,"+C.accD+","+C.acc+")",color:C.bg,fontSize:12,fontWeight:700,textAlign:"center",cursor:"pointer",letterSpacing:2,fontFamily:FONT,boxShadow:GLOW_STYLE}}>
              CONTINUE DIVE
            </div>
          </div>
        </div>
      )}


      {activeDiscovery&&(
        <div style={{position:"fixed",inset:0,zIndex:999,display:"flex",alignItems:"center",justifyContent:"center",background:"#00000088",backdropFilter:"blur(4px)"}}>
          <div style={{maxWidth:400,width:"90%",padding:"28px 24px",borderRadius:16,background:"linear-gradient(135deg,"+C.panel+","+C.card+")",border:"2px solid "+C.gold+"60",boxShadow:"0 0 40px "+C.gold+"40, 0 0 80px "+C.gold+"15",animation:"slideIn 0.3s ease-out"}}>
            <div style={{textAlign:"center",marginBottom:16}}>
              <div style={{fontSize:52,marginBottom:8,filter:"drop-shadow(0 0 16px "+C.gold+")",animation:"pulse 1.5s infinite"}}>{activeDiscovery.icon}</div>
              <div style={{fontSize:14,fontWeight:700,color:C.gold,letterSpacing:2,marginBottom:6,fontFamily:FONT}}>DISCOVERY!</div>
              <div style={{fontSize:13,fontWeight:700,color:C.white,letterSpacing:1,marginBottom:8,fontFamily:FONT}}>{activeDiscovery.name}</div>
              <div style={{fontSize:11,color:C.ts,fontFamily:FONT_BODY,lineHeight:1.5}}>{activeDiscovery.desc}</div>
            </div>
            <div style={{padding:"12px 16px",borderRadius:8,background:C.gold+"12",border:"1px solid "+C.gold+"30",marginBottom:16}}>
              <div style={{fontSize:9,fontWeight:700,color:C.gold,marginBottom:8,letterSpacing:2}}>REWARDS</div>
              <div style={{display:"flex",flexDirection:"column",gap:4}}>
                {activeDiscovery.rewards.map((r,i)=>(
                  <div key={i} style={{display:"flex",alignItems:"center",gap:8,fontSize:11,color:C.text,fontFamily:FONT_BODY}}>
                    {r.type==="item"&&<><span>{ITEMS[r.id]?ITEMS[r.id].i:"📦"}</span><span style={{color:C.ok,fontWeight:700}}>+{r.q}</span><span>{ITEMS[r.id]?ITEMS[r.id].n:r.id}</span></>}
                    {r.type==="xp"&&<><span>⭐</span><span style={{color:C.warn,fontWeight:700}}>Gather XP ×{r.mult} boost</span></>}
                    {r.type==="rp"&&<><span>🔬</span><span style={{color:C.acc,fontWeight:700}}>+{r.amt} Research Points</span></>}
                  </div>
                ))}
              </div>
            </div>
            <div onClick={collectDiscovery} style={{padding:"12px 0",borderRadius:8,background:"linear-gradient(90deg,"+C.gold+"cc,"+C.warn+")",color:C.bg,fontSize:12,fontWeight:700,textAlign:"center",cursor:"pointer",letterSpacing:2,fontFamily:FONT,boxShadow:"0 0 16px "+C.gold+"60"}}>
              ✦ COLLECT REWARDS
            </div>
          </div>
        </div>
      )}

      {/* ===== TOP BAR ===== */}
      <div style={{flexShrink:0,height:46,background:C.panel,borderBottom:"1px solid "+C.border,display:"flex",alignItems:"center",padding:"0 14px",gap:16}}>
        <div style={{fontSize:10,fontWeight:700,color:C.acc,letterSpacing:3,whiteSpace:"nowrap",flexShrink:0}}>🌊 DOC</div>

        {/* Energy bar */}
        <div style={{display:"flex",alignItems:"center",gap:6,flexShrink:0}}>
          <span style={{fontSize:9,color:C.warn,fontWeight:700,letterSpacing:1}}>⚡ ENERGY</span>
          <div style={{width:90,height:7,borderRadius:3,background:C.bg,border:"1px solid "+C.border,overflow:"hidden"}}>
            <div style={{width:(energy/maxEnergy)*100+"%",height:"100%",borderRadius:3,background:"linear-gradient(90deg,#c07800,"+C.warn+")",boxShadow:"0 0 5px "+C.warn+"80",transition:"width 0.5s"}}/>
          </div>
          <span style={{fontSize:9,color:C.warn,fontFamily:FONT_BODY,whiteSpace:"nowrap"}}>{Math.floor(energy)}/{maxEnergy}</span>
        </div>

        {/* Pressure bar */}
        <div style={{display:"flex",alignItems:"center",gap:6,flexShrink:0}}>
          <span style={{fontSize:9,color:C.purp,fontWeight:700,letterSpacing:1}}>🔵 PRESSURE</span>
          <div style={{width:90,height:7,borderRadius:3,background:C.bg,border:"1px solid "+C.border,overflow:"hidden"}}>
            <div style={{width:pressure+"%",height:"100%",borderRadius:3,background:"linear-gradient(90deg,"+C.purp+","+C.bad+")",boxShadow:"0 0 5px "+C.purp+"80",transition:"width 0.5s"}}/>
          </div>
          <span style={{fontSize:9,color:C.purp,fontFamily:FONT_BODY,whiteSpace:"nowrap"}}>{Math.floor(pressure)}%</span>
        </div>

        {/* Research Points */}
        <div style={{display:"flex",alignItems:"center",gap:5,flexShrink:0}}>
          <span style={{fontSize:9,color:C.acc,fontWeight:700,letterSpacing:1}}>🔬 RP</span>
          <span style={{fontSize:12,color:C.white,fontWeight:700,fontFamily:FONT,textShadow:GLOW_STYLE}}>{fmt(researchPts)}</span>
        </div>

        {/* Active bonus pills */}
        <div style={{display:"flex",gap:4,flexWrap:"nowrap",overflow:"hidden",flex:1}}>
          {activeBonusList.slice(0,6).map(b=>(
            <span key={b} style={{padding:"2px 6px",borderRadius:8,background:C.ok+"18",border:"1px solid "+C.ok+"35",fontSize:8,color:C.ok,fontFamily:FONT_BODY,whiteSpace:"nowrap",flexShrink:0}}>{b}</span>
          ))}
        </div>

        {/* Credits */}
        <div style={{fontSize:11,color:C.gold,fontWeight:700,letterSpacing:1,whiteSpace:"nowrap",flexShrink:0}}>◈ {fmt(gold)}</div>
        {/* Ascension indicator */}
        {ascensionLevel>0&&<div style={{fontSize:9,color:C.purp,fontWeight:700,letterSpacing:1,whiteSpace:"nowrap",flexShrink:0,padding:"2px 8px",borderRadius:8,background:C.purp+"18",border:"1px solid "+C.purp+"40"}}>✦ ASC {ascensionLevel}</div>}
        {canAscend&&<div onClick={()=>{setPage("prestige");setShowAscendConfirm(true)}} style={{fontSize:9,fontWeight:700,letterSpacing:1,whiteSpace:"nowrap",flexShrink:0,padding:"2px 8px",borderRadius:8,background:C.gold+"25",border:"1px solid "+C.gold+"60",color:C.gold,cursor:"pointer",animation:"pulse 1.5s infinite"}}>⬆ ASCEND</div>}
        {/* QoL icon buttons */}
        <div style={{display:"flex",gap:6,marginLeft:"auto",flexShrink:0}}>
          <div onClick={()=>{setPage("leaderboard");loadLeaderboard()}} title="Leaderboard" style={{width:28,height:28,borderRadius:6,background:C.card,border:"1px solid "+C.border,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",fontSize:14}}>🏅</div>
          <div onClick={()=>setShowTutorial(true)} title="Tutorial" style={{width:28,height:28,borderRadius:6,background:C.card,border:"1px solid "+C.border,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",fontSize:14}}>❓</div>
          <div onClick={()=>setShowSettings(true)} title="Settings" style={{width:28,height:28,borderRadius:6,background:C.card,border:"1px solid "+C.border,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",fontSize:14}}>⚙️</div>
        </div>
      </div>

      {/* ===== BODY ===== */}
      <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}}>

        {/* ── Middle row: nav + center + right panel ── */}
        <div style={{flex:1,display:"flex",overflow:"hidden"}}>

        {/* LEFT NAV */}
        <div style={{width:navCollapsed?52:210,flexShrink:0,display:"flex",flexDirection:"column",background:C.panel,borderRight:"1px solid "+C.border,overflowY:"auto",transition:"width 0.2s ease"}}>
          {/* Nav header: player info + collapse toggle */}
          <div style={{padding:"10px 10px 8px",borderBottom:"1px solid "+C.border,background:"linear-gradient(180deg,#042233,#031926)",display:"flex",alignItems:"center",gap:6}}>
            {!navCollapsed&&<div style={{flex:1,minWidth:0}}>
              <div style={{fontSize:11,fontWeight:700,color:C.white,letterSpacing:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{account.displayName}</div>
              <div style={{fontSize:9,color:C.ts,marginTop:1,fontFamily:FONT_BODY}}>Rank {combatLv}</div>
            </div>}
            <div onClick={()=>setNavCollapsed(p=>!p)} title={navCollapsed?"Expand nav":"Collapse nav"} style={{width:28,height:28,borderRadius:6,background:C.card,border:"1px solid "+C.border,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",fontSize:12,flexShrink:0,color:C.ts}}>
              {navCollapsed?"▶":"◀"}
            </div>
          </div>

          {/* Search box (only when expanded) */}
          {!navCollapsed&&(
            <div style={{padding:"6px 8px",borderBottom:"1px solid "+C.border}}>
              <input
                value={navSearch} onChange={e=>setNavSearch(e.target.value)}
                placeholder="🔍 Search skills..."
                style={{width:"100%",padding:"5px 8px",borderRadius:6,background:C.card,border:"1px solid "+C.border,color:C.text,fontSize:10,fontFamily:FONT_BODY,outline:"none",boxSizing:"border-box"}}
              />
            </div>
          )}

          {navCollapsed?(
            /* Collapsed: show only icons */
            <div style={{display:"flex",flexDirection:"column",gap:2,padding:"6px 4px"}}>
              {SKILLS.map(sk=>{const s=sl(sk.id);const running=curAct&&curAct.sk===sk.id;return(
                <div key={sk.id} onClick={()=>{setActSkill(sk.id);setPage("skills");}} title={sk.name+" (Lv "+s.lv+")"} style={{width:36,height:36,borderRadius:6,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",background:actSkill===sk.id&&page==="skills"?C.acc+"25":C.card,border:"1px solid "+(actSkill===sk.id&&page==="skills"?C.acc+"60":C.border),fontSize:16,filter:running?"drop-shadow(0 0 4px "+sk.color+")":s.mastered?"drop-shadow(0 0 4px "+C.gold+")":"none"}}>
                  {sk.icon}
                </div>
              );})}
              {/* Page nav icons */}
              {[{id:"combat",i:"⚔️"},{id:"research",i:"🔬"},{id:"structures",i:"🏗️"},{id:"drones",i:"🤖"},{id:"prestige",i:"✨"},{id:"market",i:"🏪"},{id:"achievements",i:"🏆"},{id:"blueprints",i:"📘"},{id:"equipment",i:"🗡️"},{id:"inventory",i:"🎒"},{id:"social",i:"💬"}].map(n=>(
                <div key={n.id} onClick={()=>setPage(n.id)} title={n.id} style={{width:36,height:36,borderRadius:6,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",background:page===n.id?C.acc+"25":C.card,border:"1px solid "+(page===n.id?C.acc+"60":C.border),fontSize:16}}>
                  {n.i}
                </div>
              ))}
            </div>
          ):(
            /* Expanded: full skill nav with search filter */
            <>
              {(()=>{
                const q=navSearch.toLowerCase();
                const filtered=sk=>!q||sk.name.toLowerCase().includes(q)||sk.cat.includes(q);
                const cats=[
                  {key:"gather",  label:"Gathering",  color:C.td},
                  {key:"prod",    label:"Production",  color:C.td},
                  {key:"utility", label:"Utility",     color:"#38bdf8"},
                ];
                return cats.map(cat=>{
                  const skills=SKILLS.filter(s=>s.cat===cat.key&&filtered(s));
                  if(!skills.length&&q)return null;
                  return(
                    <div key={cat.key} style={{borderBottom:"1px solid "+C.border}}>
                      {!q&&<div style={{padding:"5px 10px 2px",fontSize:9,fontWeight:700,color:cat.color,textTransform:"uppercase",letterSpacing:2}}>{cat.label}</div>}
                      {skills.map(sk=><SkillNav key={sk.id} sk={sk} running={curAct&&curAct.sk===sk.id}/>)}
                    </div>
                  );
                });
              })()}

              {/* Upgrading — same row style as SkillNav */}
              {(!navSearch||"upgrading".includes(navSearch.toLowerCase()))&&(
                <div style={{borderBottom:"1px solid "+C.border}}>
                  {!navSearch&&<div style={{padding:"5px 10px 2px",fontSize:9,fontWeight:700,color:C.td,textTransform:"uppercase",letterSpacing:2}}>Upgrading</div>}
                  <div onClick={()=>setPage("enhancing")} style={{display:"flex",alignItems:"center",gap:6,padding:"4px 8px 4px 6px",cursor:"pointer",background:page==="enhancing"?"linear-gradient(90deg,"+C.warn+"22,transparent)":"transparent",borderLeft:"3px solid "+(page==="enhancing"?C.warn:"transparent")}}>
                    <span style={{fontSize:15,width:20,textAlign:"center",flexShrink:0}}>⚡</span>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",marginBottom:2}}>
                        <span style={{fontSize:12,color:page==="enhancing"?C.warn:C.text,fontFamily:FONT_BODY,fontWeight:page==="enhancing"?700:400}}>Upgrading</span>
                        <span style={{fontSize:11,color:C.ts,fontWeight:700,fontFamily:FONT,flexShrink:0,marginLeft:4}}>{((sl("enhancing").xp/(sl("enhancing").need||1))*100).toFixed(2)+"% "+sl("enhancing").lv}</span>
                      </div>
                      <div style={{height:3,borderRadius:2,background:C.bg,overflow:"hidden"}}><div style={{width:(sl("enhancing").xp/(sl("enhancing").need||1))*100+"%",height:"100%",background:C.warn,borderRadius:2}}/></div>
                    </div>
                  </div>
                </div>
              )}

              {/* Combat — header + sub-skills all same height as SkillNav */}
              <div style={{borderBottom:"1px solid "+C.border}}>
                <div style={{padding:"5px 10px 2px",fontSize:9,fontWeight:700,color:C.td,textTransform:"uppercase",letterSpacing:2}}>Combat</div>
                <div onClick={()=>setPage("combat")} style={{display:"flex",alignItems:"center",gap:6,padding:"4px 8px 4px 6px",cursor:"pointer",background:page==="combat"?"linear-gradient(90deg,"+C.bad+"22,transparent)":"transparent",borderLeft:"3px solid "+(page==="combat"?C.bad:"transparent")}}>
                  <span style={{fontSize:15,width:20,textAlign:"center",flexShrink:0}}>⚔️</span>
                  <span style={{fontSize:12,color:page==="combat"?C.bad:C.text,fontFamily:FONT_BODY,fontWeight:page==="combat"?700:400,flex:1}}>Combat Zones</span>
                  <span style={{fontSize:11,color:C.ts,fontWeight:700,fontFamily:FONT,flexShrink:0}}>Lv {combatLv}</span>
                </div>
                {CSUBS.map(cs=><CSubNav key={cs.id} cs={cs}/>)}
              </div>

              {/* Other pages */}
              <div style={{borderBottom:"1px solid "+C.border}}>
                <NavItem id="research"     icon="🔬" label="Research Tree"/>
                <NavItem id="structures"   icon="🏗️" label="Structures"/>
                <NavItem id="drones"       icon="🤖" label="Drone Fleet"/>
                <NavItem id="prestige"     icon="✨" label={canAscend?"ASCEND NOW!":"Ascension"} badge={canAscend?"!":null}/>
                <NavItem id="market"       icon="🏪" label="Marketplace"/>
                <NavItem id="achievements" icon="🏆" label="Achievements"/>
                <NavItem id="blueprints"   icon="📘" label="Blueprints"   badge={blueprints.length>0?blueprints.length:null}/>
                <NavItem id="stats"        icon="📊" label="Stats & Profile"/>
                <NavItem id="social"       icon="💬" label="Social"        badge={friendReqs.length>0?friendReqs.length:null}/>
                <NavItem id="equipment"    icon="🗡️" label="Equipment"/>
                <NavItem id="inventory"    icon="🎒" label="Inventory"/>
              </div>
          <div style={{flex:1}}/>
          <div onClick={()=>setShowLogoutConfirm(true)} style={{padding:"10px 12px",borderTop:"1px solid "+C.border,fontSize:10,color:C.td,cursor:"pointer",fontFamily:FONT_BODY,letterSpacing:1,display:"flex",alignItems:"center",gap:6}}>◉ LOGOUT</div>
            </>
          )}
        </div>

        {/* CENTER */}
        <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}}>
          {/* Action progress bar */}
          {curAct&&(()=>{const sk=SKILLS.find(s=>s.id===curAct.sk);const act=sk?sk.acts.find(a=>a.id===curAct.act):null;return(
            <div style={{flexShrink:0,padding:"10px 20px",background:C.panel,borderBottom:"1px solid "+C.border}}>
              <div style={{display:"flex",justifyContent:"space-between",fontSize:13,color:C.ts,marginBottom:6,fontFamily:FONT_BODY}}>
                <span>{sk?sk.icon:""} {sk?sk.name:""} — {act?act.name:""}</span>
                <span onClick={()=>{setCurAct(null);setActProg(0)}} style={{color:C.bad,cursor:"pointer",fontWeight:700,letterSpacing:1}}>■ STOP</span>
              </div>
              <div style={{height:7,borderRadius:4,background:C.bg,overflow:"hidden"}}><div style={{width:actProg*100+"%",height:"100%",borderRadius:4,background:"linear-gradient(90deg,"+C.acc+","+C.ok+")",transition:"width 0.1s linear",boxShadow:GLOW_STYLE}}/></div>
            </div>
          );})()}
          {/* Combat bar */}
          {cbt&&(()=>{
            const mob=cbt.mob;
            const isElite=mob.elite;
            const isBoss2=mob.isBoss2;
            const isBoss=cbt.boss&&!isBoss2;
            const mobColor=isBoss2?C.gold:isBoss?C.bad:isElite?C.purp:C.ts;
            const label=isBoss2?"⚜️ TITAN BOSS":isBoss?"👑 BOSS":isElite?"💠 ELITE":"";
            return(
            <div style={{flexShrink:0,padding:"10px 20px",background:C.panel,borderBottom:"2px solid "+(isBoss2?C.gold:isBoss?C.bad:isElite?C.purp:C.border),boxShadow:isBoss2?"0 0 12px "+C.gold+"40":isBoss?"0 0 8px "+C.bad+"30":"none"}}>
              <div style={{display:"flex",justifyContent:"space-between",fontSize:13,color:C.ts,marginBottom:6,fontFamily:FONT_BODY,alignItems:"center"}}>
                <span style={{display:"flex",alignItems:"center",gap:8}}>
                  <span style={{fontSize:24}}>{mob.i||"👾"}</span>
                  <span style={{color:mobColor,fontWeight:700,fontSize:15}}>{mob.n}</span>
                  {label&&<span style={{fontSize:10,padding:"2px 8px",borderRadius:6,background:mobColor+"25",border:"1px solid "+mobColor+"60",color:mobColor,fontWeight:700,letterSpacing:1}}>{label}</span>}
                  <span style={{fontSize:12,color:C.td}}>— Kill #{cbt.kills+1}</span>
                </span>
                <span onClick={stopZone} style={{color:C.bad,cursor:"pointer",fontWeight:700,letterSpacing:1,fontSize:12}}>◄ RETREAT</span>
              </div>
              <div style={{display:"flex",gap:12}}>
                <div style={{flex:1}}><div style={{fontSize:11,color:C.td,marginBottom:3,fontFamily:FONT_BODY}}>You: {cbt.php}/{cbt.mxhp}</div><div style={{height:7,borderRadius:4,background:C.bg,overflow:"hidden"}}><div style={{width:(cbt.php/cbt.mxhp)*100+"%",height:"100%",background:C.ok,borderRadius:4,transition:"width 0.2s",boxShadow:GLOW_OK}}/></div></div>
                <div style={{flex:1}}><div style={{fontSize:11,color:C.td,marginBottom:3,fontFamily:FONT_BODY}}>{mob.n}: {Math.max(0,cbt.mhp)}/{mob.hp}</div><div style={{height:7,borderRadius:4,background:C.bg,overflow:"hidden"}}><div style={{width:Math.max(0,(cbt.mhp/mob.hp)*100)+"%",height:"100%",background:isBoss2?C.gold:isBoss?C.bad:isElite?C.purp:C.warn,borderRadius:4,transition:"width 0.2s",boxShadow:isBoss2?"0 0 6px "+C.gold:isBoss?GLOW_BAD:"none"}}/></div></div>
              </div>
            </div>
            );
          })()}

          <div style={{flex:1,overflow:"auto",padding:"24px 28px"}}>

            {/* SKILLS PAGE */}
            {page==="skills"&&skData&&(()=>{const s=sl(skData.id);const pct=s.mastered?100:s.need>0?(s.xp/s.need)*100:0;
              const allActs=getSkillActs(skData.id,skData.acts);
              const unlockedBps=BLUEPRINTS.filter(bp=>bp.skillId===skData.id&&blueprints.includes(bp.id));
              const availBps=BLUEPRINTS.filter(bp=>bp.skillId===skData.id&&!blueprints.includes(bp.id));
              return(
              <div style={{}}>
                <div style={{display:"flex",alignItems:"center",gap:14,marginBottom:16}}>
                  <span style={{fontSize:36,filter:"drop-shadow(0 0 10px "+skData.color+")"}}>{skData.icon}</span>
                  <div style={{flex:1}}>
                    <div style={{display:"flex",alignItems:"center",gap:10}}>
                      <div style={{fontSize:20,fontWeight:700,color:C.white,letterSpacing:2}}>{skData.name.toUpperCase()}</div>
                      {s.mastered&&<div style={{fontSize:9,fontWeight:700,padding:"3px 10px",borderRadius:10,background:"linear-gradient(90deg,"+C.gold+","+C.warn+")",color:C.bg,letterSpacing:2}}>★ MASTERED</div>}
                    </div>
                    <div style={{fontSize:11,color:C.ts,marginTop:2,fontFamily:FONT_BODY}}>
                      {s.mastered
                        ? `Level ${MAX_SKILL_LV} — Maximum level reached!`
                        : `Level ${s.lv} / ${MAX_SKILL_LV} — ${fmt(s.xp)} / ${fmt(s.need)} XP`}
                    </div>
                  </div>
                </div>
                {/* XP bar — gold when mastered */}
                <div style={{height:8,borderRadius:4,background:C.card,overflow:"hidden",marginBottom:s.mastered?8:20,border:"1px solid "+C.border}}>
                  <div style={{width:pct+"%",height:"100%",borderRadius:4,
                    background:s.mastered
                      ?"linear-gradient(90deg,"+C.gold+","+C.warn+")"
                      :"linear-gradient(90deg,"+skData.color+","+skData.color+"aa)",
                    transition:"width 0.3s",
                    boxShadow:"0 0 8px "+(s.mastered?C.gold:skData.color)}}/>
                </div>
                {s.mastered&&<div style={{fontSize:10,color:C.gold,fontFamily:FONT_BODY,marginBottom:20,textAlign:"center",letterSpacing:1}}>★ This skill is fully mastered. All operations are available.</div>}
                <div style={{fontSize:11,fontWeight:700,color:C.td,marginBottom:12,letterSpacing:2}}>AVAILABLE OPERATIONS</div>
                {allActs.map(act=>{
                  const locked=s.lv<act.lv&&!s.mastered;
                  const canDo=!locked&&(!act.inp||act.inp.every(i=>(inv[i.id]||0)>=i.q));
                  const isAct=curAct&&curAct.act===act.id;
                  const isBp=!!act._blueprint;
                  const bpMeta=isBp?BLUEPRINTS.find(b=>b.id===act._blueprint):null;
                  const bpColor=bpMeta?BP_RARITY_COLOR[bpMeta.rarity]:C.gold;
                  return(
                  <div key={act.id} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"14px 18px",borderRadius:10,
                    background:isAct?"linear-gradient(90deg,"+C.ok+"12,"+C.card+")":isBp?"linear-gradient(135deg,"+bpColor+"10,"+C.card+")":C.card,
                    border:"2px solid "+(isAct?C.ok+"50":isBp?bpColor+"50":C.border),
                    marginBottom:10,opacity:locked?0.35:1,transition:"all 0.2s",
                    boxShadow:isBp?"0 0 12px "+bpColor+"20":"none"}}>
                    <div style={{flex:1}}>
                      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4}}>
                        <div style={{fontSize:14,fontWeight:700,color:isAct?C.ok:isBp?bpColor:C.white,fontFamily:FONT,letterSpacing:1}}>{act.name.toUpperCase()}</div>
                        {isBp&&<div style={{fontSize:9,padding:"2px 7px",borderRadius:6,background:bpColor+"25",border:"1px solid "+bpColor+"60",color:bpColor,fontWeight:700,letterSpacing:1}}>📘 BLUEPRINT</div>}
                      </div>
                      <div style={{fontSize:12,color:C.ts,fontFamily:FONT_BODY}}>+{act.xp} XP · {act.t}s{act.inp?" · Needs: "+act.inp.map(i=>(ITEMS[i.id]?ITEMS[i.id].i:"")+i.q).join(" "):""}  {act.out?" → "+act.out.map(i=>(ITEMS[i.id]?ITEMS[i.id].i:"")+" "+(ITEMS[i.id]?ITEMS[i.id].n:"")).join(", "):""}</div>
                      {act.util&&<div style={{fontSize:11,color:"#38bdf8",marginTop:3,fontFamily:FONT_BODY}}>{act.desc||"Utility effect active"}</div>}
                      {act.out&&act.out.some(o=>ITEMS[o.id]&&ITEMS[o.id].rare)&&<div style={{fontSize:11,color:C.gold,marginTop:2,fontFamily:FONT_BODY}}>✨ Produces rare material</div>}
                      {locked&&<div style={{fontSize:11,color:C.bad,marginTop:2,fontFamily:FONT_BODY}}>Requires Level {act.lv}</div>}
                    </div>
                    {!locked&&<div onClick={()=>{if(canDo)startAct(skData.id,act.id)}} style={{padding:"10px 22px",borderRadius:8,marginLeft:14,flexShrink:0,
                      background:isAct?"linear-gradient(90deg,"+C.okD+","+C.ok+")":canDo?"linear-gradient(90deg,"+C.accD+","+C.acc+")":C.card,
                      color:C.bg,fontSize:12,fontWeight:700,cursor:canDo?"pointer":"default",opacity:canDo?1:0.35,letterSpacing:1,fontFamily:FONT,
                      boxShadow:isAct?GLOW_OK:canDo?GLOW_STYLE:"none"}}>{isAct?"ACTIVE":"START"}</div>}
                  </div>
                );})}
                {/* Blueprint teaser — locked blueprints for this skill */}
                {availBps.length>0&&(
                  <div style={{marginTop:20}}>
                    <div style={{fontSize:11,fontWeight:700,color:C.td,letterSpacing:2,marginBottom:8}}>🔒 LOCKED BLUEPRINTS ({availBps.length})</div>
                    {availBps.map(bp=>{
                      const col=BP_RARITY_COLOR[bp.rarity];
                      return(
                        <div key={bp.id} style={{padding:"10px 14px",borderRadius:8,background:C.card,border:"1px dashed "+col+"40",marginBottom:6,opacity:0.5}}>
                          <div style={{display:"flex",alignItems:"center",gap:8}}>
                            <span style={{fontSize:18,filter:"grayscale(1)"}}>{bp.icon}</span>
                            <div>
                              <div style={{fontSize:10,fontWeight:700,color:C.td,fontFamily:FONT}}>??? BLUEPRINT ({bp.rarity.toUpperCase()})</div>
                              <div style={{fontSize:9,color:C.td,fontFamily:FONT_BODY}}>Found via: {bp.source}</div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );})()}

            {/* ===== RESEARCH PAGE ===== */}
            {page==="research"&&(
              <div style={{}}>
                <div style={{display:"flex",alignItems:"baseline",gap:16,marginBottom:6}}>
                  <div style={{fontSize:20,fontWeight:700,color:C.white,letterSpacing:2}}>RESEARCH TREE</div>
                  <div style={{fontSize:11,color:C.acc,fontFamily:FONT_BODY}}>🔬 {fmt(researchPts)} RP available</div>
                </div>
                <div style={{fontSize:10,color:C.ts,marginBottom:14,fontFamily:FONT_BODY}}>RP trickles every 10s from production levels. Bonus RP from kills.</div>

                {/* Branch selector */}
                <div style={{display:"flex",gap:6,marginBottom:18,flexWrap:"wrap"}}>
                  {Object.entries(BRANCH_META).map(([branch,meta])=>{
                    const done=RESEARCH_TREE[branch].filter(r=>researched[r.id]).length;
                    const total=RESEARCH_TREE[branch].length;
                    const active=researchBranch===branch;
                    return(
                      <div key={branch} onClick={()=>setResearchBranch(branch)} style={{padding:"6px 14px",borderRadius:6,cursor:"pointer",background:active?meta.color+"25":C.card,border:"2px solid "+(active?meta.color+"90":C.border),color:active?meta.color:C.ts,fontSize:10,fontWeight:700,letterSpacing:1,fontFamily:FONT,transition:"all 0.15s"}}>
                        {meta.label} <span style={{opacity:0.65,fontFamily:FONT_BODY,fontWeight:400,fontSize:9}}>({done}/{total})</span>
                      </div>
                    );
                  })}
                </div>

                {/* Tier nodes in a horizontal chain */}
                <div style={{display:"flex",alignItems:"stretch",gap:0,overflowX:"auto",paddingBottom:8}}>
                  {RESEARCH_TREE[researchBranch].map((node,idx)=>{
                    const col=BRANCH_META[researchBranch].color;
                    const done=researched[node.id];
                    const prereqsMet=node.prereqs.every(pid=>researched[pid]);
                    const canAfford=researchPts>=node.cost;
                    const canUnlock=!done&&prereqsMet&&canAfford;
                    return(
                      <div key={node.id} style={{display:"flex",alignItems:"center",flexShrink:0}}>
                        {idx>0&&(
                          <div style={{display:"flex",alignItems:"center",width:28,flexShrink:0}}>
                            <div style={{width:"100%",height:2,background:prereqsMet?col+"70":C.border}}/>
                            <div style={{fontSize:9,color:prereqsMet?col:C.td,marginLeft:-4}}>▶</div>
                          </div>
                        )}
                        <div style={{width:168,padding:"14px 13px",borderRadius:10,background:done?"linear-gradient(135deg,"+col+"22,"+C.card+")":C.card,border:"2px solid "+(done?col:prereqsMet?col+"50":C.border),boxShadow:done?"0 0 14px "+col+"40":"none",opacity:!prereqsMet&&!done?0.5:1,transition:"all 0.2s",flexShrink:0}}>
                          <div style={{fontSize:24,marginBottom:6,filter:done?"drop-shadow(0 0 6px "+col+")":"none"}}>{node.icon}</div>
                          <div style={{fontSize:11,fontWeight:700,color:done?col:C.white,fontFamily:FONT,letterSpacing:1,marginBottom:4,lineHeight:1.3}}>{node.name}</div>
                          <div style={{fontSize:10,color:C.ts,fontFamily:FONT_BODY,marginBottom:10,lineHeight:1.4,minHeight:32}}>{node.desc}</div>
                          {done
                            ? <div style={{fontSize:9,color:col,fontWeight:700,letterSpacing:1,fontFamily:FONT}}>✓ RESEARCHED</div>
                            : <div>
                                <div style={{fontSize:9,fontFamily:FONT_BODY,marginBottom:6,color:canAfford?C.warn:C.bad}}>🔬 {node.cost} RP{!prereqsMet?" · unlock prev":""}</div>
                                <div onClick={()=>doResearch(node)} style={{padding:"5px 0",borderRadius:5,background:canUnlock?"linear-gradient(90deg,"+col+"cc,"+col+")":C.bg,color:canUnlock?C.bg:C.td,fontSize:9,fontWeight:700,textAlign:"center",cursor:canUnlock?"pointer":"default",letterSpacing:1,fontFamily:FONT,border:"1px solid "+(canUnlock?col:C.border),boxShadow:canUnlock?"0 0 8px "+col+"55":"none",transition:"all 0.15s"}}>
                                  {canUnlock?"RESEARCH":prereqsMet?"NEED MORE RP":"LOCKED"}
                                </div>
                              </div>
                          }
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Active bonuses panel */}
                {activeBonusList.length>0&&(
                  <div style={{marginTop:20,padding:"14px 16px",borderRadius:8,background:C.card,border:"1px solid "+C.ok+"35"}}>
                    <div style={{fontSize:9,fontWeight:700,color:C.ok,marginBottom:8,letterSpacing:2}}>ACTIVE RESEARCH BONUSES</div>
                    <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                      {activeBonusList.map(b=>(<span key={b} style={{padding:"3px 10px",borderRadius:10,background:C.ok+"18",border:"1px solid "+C.ok+"40",fontSize:10,color:C.ok,fontFamily:FONT_BODY}}>{b}</span>))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ===== STRUCTURES PAGE ===== */}
            {page==="structures"&&(()=>{
              const totalBuilt=STRUCTURES.reduce((s,st)=>s+(structures[st.id]>0?1:0),0);
              return(
              <div style={{}}>
                <div style={{display:"flex",alignItems:"baseline",gap:16,marginBottom:6}}>
                  <div style={{fontSize:20,fontWeight:700,color:C.white,letterSpacing:2}}>STRUCTURES</div>
                  <div style={{fontSize:11,color:C.ts,fontFamily:FONT_BODY}}>{totalBuilt}/{STRUCTURES.length} built · ◈ {fmt(gold)} credits</div>
                </div>
                <div style={{fontSize:10,color:C.ts,marginBottom:14,fontFamily:FONT_BODY}}>Build structures to passively generate resources and unlock powerful bonuses. Each structure can be upgraded up to level 5.</div>

                {/* Category tabs */}
                <div style={{display:"flex",gap:6,marginBottom:18,flexWrap:"wrap"}}>
                  {Object.entries(STRUCT_CATEGORIES).map(([cat,meta])=>{
                    const built=STRUCTURES.filter(s=>s.category===cat&&(structures[s.id]||0)>0).length;
                    const total=STRUCTURES.filter(s=>s.category===cat).length;
                    const active=structCat===cat;
                    return(
                      <div key={cat} onClick={()=>setStructCat(cat)} style={{padding:"6px 14px",borderRadius:6,cursor:"pointer",background:active?meta.color+"25":C.card,border:"2px solid "+(active?meta.color+"90":C.border),color:active?meta.color:C.ts,fontSize:10,fontWeight:700,letterSpacing:1,fontFamily:FONT,transition:"all 0.15s"}}>
                        {meta.label} <span style={{opacity:0.65,fontFamily:FONT_BODY,fontWeight:400,fontSize:9}}>({built}/{total})</span>
                      </div>
                    );
                  })}
                </div>

                {/* Structure cards */}
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
                  {STRUCTURES.filter(st=>st.category===structCat).map(st=>{
                    const lv=structures[st.id]||0;
                    const maxed=lv>=st.maxLevel;
                    const cost=lv===0?st.cost:st.levelCost(lv);
                    const canAfford=(cost.gold||0)<=gold;
                    const itemKeys=Object.keys(cost).filter(k=>k!=="gold");
                    const hasItems=itemKeys.every(k=>(inv[k]||0)>=cost[k]);
                    const canBuild=canAfford&&hasItems&&!maxed;
                    const col=st.color;
                    return(
                      <div key={st.id} style={{padding:"16px",borderRadius:10,background:lv>0?"linear-gradient(135deg,"+col+"18,"+C.card+")":C.card,border:"2px solid "+(lv>0?col+"60":C.border),boxShadow:lv>0?"0 0 16px "+col+"30":"none",transition:"all 0.2s"}}>
                        {/* Header */}
                        <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:10}}>
                          <span style={{fontSize:28,filter:lv>0?"drop-shadow(0 0 8px "+col+")":"none"}}>{st.icon}</span>
                          <div style={{flex:1}}>
                            <div style={{fontSize:12,fontWeight:700,color:lv>0?col:C.white,fontFamily:FONT,letterSpacing:1}}>{st.name.toUpperCase()}</div>
                            <div style={{fontSize:10,color:C.ts,fontFamily:FONT_BODY,marginTop:1}}>{st.desc}</div>
                          </div>
                          {lv>0&&(
                            <div style={{padding:"3px 10px",borderRadius:12,background:col+"25",border:"1px solid "+col+"50",fontSize:11,fontWeight:700,color:col,fontFamily:FONT,flexShrink:0}}>
                              Lv {lv}
                            </div>
                          )}
                        </div>

                        {/* Level progress dots */}
                        <div style={{display:"flex",gap:4,marginBottom:10}}>
                          {[...Array(st.maxLevel)].map((_,i)=>(
                            <div key={i} style={{flex:1,height:4,borderRadius:2,background:i<lv?col:C.bg,border:"1px solid "+(i<lv?col:C.border),boxShadow:i<lv?"0 0 4px "+col+"80":"none",transition:"all 0.3s"}}/>
                          ))}
                        </div>

                        {/* Effects */}
                        {lv>0&&(
                          <div style={{padding:"6px 10px",borderRadius:6,background:col+"12",border:"1px solid "+col+"25",marginBottom:10}}>
                            <div style={{fontSize:9,fontWeight:700,color:col,marginBottom:3,letterSpacing:1}}>ACTIVE EFFECTS</div>
                            <div style={{fontSize:10,color:C.text,fontFamily:FONT_BODY}}>{st.desc2(lv)}</div>
                          </div>
                        )}

                        {/* Cost breakdown */}
                        {!maxed&&(
                          <div style={{marginBottom:10}}>
                            <div style={{fontSize:9,color:C.td,marginBottom:5,letterSpacing:1,fontWeight:700}}>{lv===0?"BUILD COST:":"UPGRADE TO LV "+(lv+1)+":"}</div>
                            <div style={{display:"flex",flexWrap:"wrap",gap:4}}>
                              {cost.gold>0&&(
                                <span style={{padding:"2px 8px",borderRadius:4,background:gold>=cost.gold?C.gold+"20":C.bad+"20",border:"1px solid "+(gold>=cost.gold?C.gold+"40":C.bad+"40"),fontSize:10,color:gold>=cost.gold?C.gold:C.bad,fontFamily:FONT_BODY}}>◈ {fmt(cost.gold)}</span>
                              )}
                              {itemKeys.map(k=>{const have=(inv[k]||0)>=cost[k];return(
                                <span key={k} style={{padding:"2px 8px",borderRadius:4,background:have?C.ok+"15":C.bad+"15",border:"1px solid "+(have?C.ok+"35":C.bad+"35"),fontSize:10,color:have?C.ok:C.bad,fontFamily:FONT_BODY}}>{ITEMS[k]?ITEMS[k].i:k} {cost[k]}<span style={{opacity:0.6}}> / {inv[k]||0}</span></span>
                              );})}
                            </div>
                          </div>
                        )}

                        {/* Action button */}
                        {maxed?(
                          <div style={{padding:"7px 0",borderRadius:6,background:col+"20",border:"1px solid "+col+"40",color:col,fontSize:10,fontWeight:700,textAlign:"center",letterSpacing:1,fontFamily:FONT}}>✦ MAX LEVEL</div>
                        ):(
                          <div onClick={()=>canBuild&&doBuild(st)} style={{padding:"7px 0",borderRadius:6,background:canBuild?"linear-gradient(90deg,"+col+"cc,"+col+")":C.bg,color:canBuild?C.bg:C.td,fontSize:10,fontWeight:700,textAlign:"center",cursor:canBuild?"pointer":"default",letterSpacing:1,fontFamily:FONT,border:"1px solid "+(canBuild?col:C.border),boxShadow:canBuild?"0 0 10px "+col+"55":"none",transition:"all 0.15s"}}>
                            {canBuild?(lv===0?"BUILD":"UPGRADE"):(canAfford?"MISSING MATERIALS":"INSUFFICIENT CREDITS")}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Global structure bonuses summary */}
                {Object.values(structures).some(v=>v>0)&&(
                  <div style={{marginTop:20,padding:"14px 16px",borderRadius:8,background:C.card,border:"1px solid "+C.acc+"35"}}>
                    <div style={{fontSize:9,fontWeight:700,color:C.acc,marginBottom:8,letterSpacing:2}}>ACTIVE STRUCTURE BONUSES</div>
                    <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                      {STRUCTURES.filter(st=>(structures[st.id]||0)>0).map(st=>{
                        const lv=structures[st.id];
                        return(<span key={st.id} style={{padding:"3px 10px",borderRadius:10,background:st.color+"18",border:"1px solid "+st.color+"40",fontSize:10,color:st.color,fontFamily:FONT_BODY}}>{st.icon} {st.name} Lv{lv}</span>);
                      })}
                    </div>
                  </div>
                )}
              </div>
            );})()}

            {/* ===== DRONES PAGE ===== */}
            {page==="drones"&&(()=>{
              const totalDeployed=DRONE_TYPES.reduce((s,dt)=>s+(drones[dt.id]||0),0);
              return(
              <div style={{}}>
                <div style={{display:"flex",alignItems:"baseline",gap:16,marginBottom:6}}>
                  <div style={{fontSize:20,fontWeight:700,color:C.white,letterSpacing:2}}>DRONE FLEET</div>
                  <div style={{fontSize:11,color:C.ts,fontFamily:FONT_BODY}}>{totalDeployed} active drones · ◈ {fmt(gold)} credits</div>
                </div>
                <div style={{fontSize:10,color:C.ts,marginBottom:14,fontFamily:FONT_BODY}}>
                  Deploy drones to automate gathering, mining, fishing, and combat. Each drone runs passively in the background regardless of your active page.
                  Craft <strong style={{color:C.acc}}>Drone Processors</strong> via Artifact Research to unlock deployments.
                </div>

                {/* Fleet overview bar */}
                {totalDeployed>0&&(
                  <div style={{marginBottom:16,padding:"10px 14px",borderRadius:8,background:C.card,border:"1px solid "+C.acc+"40",display:"flex",gap:12,flexWrap:"wrap"}}>
                    <div style={{fontSize:11,fontWeight:700,color:C.acc,letterSpacing:2,width:"100%",marginBottom:4}}>ACTIVE FLEET</div>
                    {DRONE_TYPES.filter(dt=>(drones[dt.id]||0)>0).map(dt=>(
                      <div key={dt.id} style={{display:"flex",alignItems:"center",gap:6,padding:"4px 10px",borderRadius:6,background:dt.color+"18",border:"1px solid "+dt.color+"40"}}>
                        <span style={{fontSize:14,filter:"drop-shadow(0 0 4px "+dt.color+")"}}>{dt.icon}</span>
                        <span style={{fontSize:11,color:dt.color,fontWeight:700,fontFamily:FONT}}>{drones[dt.id]}</span>
                        <span style={{fontSize:9,color:C.ts,fontFamily:FONT_BODY}}>{dt.name}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Drone cards */}
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:16}}>
                  {DRONE_TYPES.map(dt=>{
                    const deployed=drones[dt.id]||0;
                    const maxed=deployed>=dt.maxDeployed;
                    const cost=dt.deployCost;
                    const itemKeys=Object.keys(cost).filter(k=>k!=="gold");
                    const hasItems=itemKeys.every(k=>(inv[k]||0)>=cost[k]);
                    const goldOk=(cost.gold||0)<=gold;
                    const canDeploy=hasItems&&goldOk&&!maxed;
                    const canRecall=deployed>0;
                    const col=dt.color;
                    // Compute what this drone produces per minute
                    const cyclesPerMin=60000/dt.interval;
                    return(
                      <div key={dt.id} style={{padding:"16px",borderRadius:10,background:deployed>0?"linear-gradient(135deg,"+col+"18,"+C.card+")":C.card,border:"2px solid "+(deployed>0?col+"60":C.border),boxShadow:deployed>0?"0 0 16px "+col+"30":"none",transition:"all 0.2s"}}>
                        {/* Header */}
                        <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:10}}>
                          <span style={{fontSize:28,filter:deployed>0?"drop-shadow(0 0 8px "+col+")":"none",animation:deployed>0?"pulse 2s infinite":"none"}}>{dt.icon}</span>
                          <div style={{flex:1}}>
                            <div style={{fontSize:12,fontWeight:700,color:deployed>0?col:C.white,fontFamily:FONT,letterSpacing:1}}>{dt.name.toUpperCase()}</div>
                            <div style={{fontSize:10,color:C.ts,fontFamily:FONT_BODY,marginTop:1}}>{dt.desc}</div>
                          </div>
                          {/* Deployed counter */}
                          <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:2,flexShrink:0}}>
                            {[...Array(dt.maxDeployed)].map((_,i)=>(
                              <div key={i} style={{width:8,height:8,borderRadius:"50%",background:i<deployed?col:C.bg,border:"1px solid "+(i<deployed?col:C.border),boxShadow:i<deployed?"0 0 4px "+col:"none",transition:"all 0.3s"}}/>
                            ))}
                            <div style={{fontSize:8,color:deployed>0?col:C.td,fontFamily:FONT_BODY,marginTop:2}}>{deployed}/{dt.maxDeployed}</div>
                          </div>
                        </div>

                        {/* Output preview */}
                        <div style={{padding:"6px 10px",borderRadius:6,background:C.bg,border:"1px solid "+C.border,marginBottom:10}}>
                          <div style={{fontSize:8,color:C.td,fontWeight:700,letterSpacing:1,marginBottom:4}}>OUTPUT / CYCLE ({(dt.interval/1000).toFixed(0)}s)</div>
                          <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                            {dt.action==="combat"&&(
                              <span style={{fontSize:10,color:C.gold,fontFamily:FONT_BODY}}>◈ {Math.floor(dt.goldPerKill*(1+(bonuses.gold_pct||0)))} · +{Math.floor(dt.xpAmt*(1+(bonuses.combat_xp||0)))} XP</span>
                            )}
                            {(dt.action==="gather"||dt.action==="explore")&&dt.outputs.filter(o=>o.id).map(o=>(
                              <span key={o.id} style={{fontSize:10,color:C.text,fontFamily:FONT_BODY}}>
                                {ITEMS[o.id]?ITEMS[o.id].i:""} {o.chance!==undefined?"~"+(o.chance*100).toFixed(0)+"%":""} {o.q}×
                              </span>
                            ))}
                            <span style={{fontSize:10,color:C.ts,fontFamily:FONT_BODY}}>+{dt.xpAmt} XP</span>
                            {deployed>0&&<span style={{fontSize:10,color:col,fontFamily:FONT_BODY}}>×{deployed} drones</span>}
                          </div>
                        </div>

                        {/* Deploy cost */}
                        <div style={{marginBottom:10}}>
                          <div style={{fontSize:9,color:C.td,marginBottom:4,letterSpacing:1,fontWeight:700}}>DEPLOY COST (per unit):</div>
                          <div style={{display:"flex",flexWrap:"wrap",gap:4}}>
                            {(cost.gold||0)>0&&(
                              <span style={{padding:"2px 8px",borderRadius:4,background:goldOk?C.gold+"20":C.bad+"20",border:"1px solid "+(goldOk?C.gold+"40":C.bad+"40"),fontSize:10,color:goldOk?C.gold:C.bad,fontFamily:FONT_BODY}}>◈ {fmt(cost.gold)}</span>
                            )}
                            {itemKeys.map(k=>{const have=(inv[k]||0)>=cost[k];return(
                              <span key={k} style={{padding:"2px 8px",borderRadius:4,background:have?C.ok+"15":C.bad+"15",border:"1px solid "+(have?C.ok+"35":C.bad+"35"),fontSize:10,color:have?C.ok:C.bad,fontFamily:FONT_BODY}}>{ITEMS[k]?ITEMS[k].i:k} {cost[k]}<span style={{opacity:0.6}}> / {inv[k]||0}</span></span>
                            );})}
                          </div>
                        </div>

                        {/* Action buttons */}
                        <div style={{display:"flex",gap:6}}>
                          <div onClick={()=>canDeploy&&deployDrone(dt)} style={{flex:1,padding:"7px 0",borderRadius:6,background:canDeploy?"linear-gradient(90deg,"+col+"cc,"+col+")":C.bg,color:canDeploy?C.bg:C.td,fontSize:10,fontWeight:700,textAlign:"center",cursor:canDeploy?"pointer":"default",letterSpacing:1,fontFamily:FONT,border:"1px solid "+(canDeploy?col:C.border),boxShadow:canDeploy?"0 0 10px "+col+"55":"none",transition:"all 0.15s"}}>
                            {maxed?"MAX DEPLOYED":canDeploy?"DEPLOY":"INSUFFICIENT"}
                          </div>
                          {canRecall&&(
                            <div onClick={()=>recallDrone(dt)} style={{padding:"7px 12px",borderRadius:6,background:C.bad+"20",border:"1px solid "+C.bad+"50",color:C.bad,fontSize:10,fontWeight:700,cursor:"pointer",letterSpacing:1,fontFamily:FONT,transition:"all 0.15s"}}>◄</div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Drone activity log */}
                {droneLogs.length>0&&(
                  <div style={{padding:"12px 16px",borderRadius:8,background:C.card,border:"1px solid "+C.border,maxHeight:160,overflow:"auto"}}>
                    <div style={{fontSize:9,fontWeight:700,color:C.ts,marginBottom:6,letterSpacing:2}}>DRONE LOG</div>
                    {droneLogs.slice(-12).reverse().map((l,i)=>(
                      <div key={i} style={{fontSize:10,color:C.ts,padding:"2px 0",borderBottom:"1px solid "+C.bg,opacity:1-i*0.07,fontFamily:FONT_BODY}}>{l}</div>
                    ))}
                  </div>
                )}
              </div>
            );})()}

            {/* ===== PRESTIGE / ASCENSION PAGE ===== */}
            {page==="prestige"&&(()=>{
              const nextThr=ASCENSION_THRESHOLDS[ascensionLevel]||null;
              const prevThr=ascensionLevel>0?ASCENSION_THRESHOLDS[ascensionLevel-1]:0;
              const progress=nextThr?Math.min(1,(totalSkillLevel-prevThr)/Math.max(1,nextThr-prevThr)):1;
              return(
              <div style={{maxWidth:760}}>
                {/* Header */}
                <div style={{display:"flex",alignItems:"center",gap:16,marginBottom:20,padding:"18px 20px",borderRadius:12,background:"linear-gradient(135deg,"+C.purp+"18,"+C.card+")",border:"2px solid "+C.purp+"50",boxShadow:"0 0 20px "+C.purp+"30"}}>
                  <div style={{fontSize:48,filter:"drop-shadow(0 0 12px "+C.purp+")"}}>🌊</div>
                  <div style={{flex:1}}>
                    <div style={{fontSize:16,fontWeight:700,color:C.white,letterSpacing:3,marginBottom:4}}>ASCENSION PROTOCOL</div>
                    <div style={{fontSize:11,color:C.ts,fontFamily:FONT_BODY,marginBottom:8}}>
                      Ascension {ascensionLevel} · Total Skill Level: <span style={{color:C.acc,fontWeight:700}}>{totalSkillLevel}</span>
                    </div>
                    {nextThr?(
                      <>
                        <div style={{fontSize:10,color:C.td,fontFamily:FONT_BODY,marginBottom:6}}>
                          Next Ascension at level <span style={{color:canAscend?C.gold:C.warn,fontWeight:700}}>{nextThr}</span>
                          {canAscend&&<span style={{color:C.gold,fontWeight:700,marginLeft:8}}>✦ READY!</span>}
                        </div>
                        <div style={{height:6,borderRadius:3,background:C.bg,overflow:"hidden",border:"1px solid "+C.border}}>
                          <div style={{width:progress*100+"%",height:"100%",borderRadius:3,background:canAscend?"linear-gradient(90deg,"+C.gold+","+C.warn+")":"linear-gradient(90deg,"+C.purp+","+C.acc+")",transition:"width 0.5s",boxShadow:canAscend?"0 0 8px "+C.gold:"0 0 6px "+C.purp}}/>
                        </div>
                      </>
                    ):(
                      <div style={{fontSize:11,color:C.gold,fontWeight:700,fontFamily:FONT}}>✦ MAX ASCENSION REACHED</div>
                    )}
                  </div>
                  <div style={{textAlign:"center",flexShrink:0}}>
                    <div style={{fontSize:32,filter:"drop-shadow(0 0 8px "+C.gold+")"}}>{dataCores}</div>
                    <div style={{fontSize:9,color:C.gold,fontWeight:700,letterSpacing:2}}>DATA CORES</div>
                  </div>
                </div>

                {/* Ascend button */}
                {canAscend&&(
                  <div style={{marginBottom:20}}>
                    {!showAscendConfirm?(
                      <div onClick={()=>setShowAscendConfirm(true)} style={{padding:"14px 0",borderRadius:10,background:"linear-gradient(90deg,"+C.purp+"cc,"+C.gold+")",color:C.bg,fontSize:14,fontWeight:700,textAlign:"center",cursor:"pointer",letterSpacing:3,fontFamily:FONT,boxShadow:"0 0 24px "+C.gold+"60",animation:"pulse 1.5s infinite"}}>
                        ⬆ INITIATE ASCENSION ⬆
                      </div>
                    ):(
                      <div style={{padding:"16px 20px",borderRadius:10,background:C.bad+"15",border:"2px solid "+C.bad+"60",boxShadow:"0 0 20px "+C.bad+"30"}}>
                        <div style={{fontSize:13,fontWeight:700,color:C.bad,letterSpacing:2,marginBottom:10,textAlign:"center"}}>⚠ CONFIRM ASCENSION</div>
                        <div style={{fontSize:11,color:C.ts,fontFamily:FONT_BODY,marginBottom:6}}>This will permanently reset:</div>
                        <div style={{fontSize:11,color:C.bad,fontFamily:FONT_BODY,marginBottom:6,paddingLeft:8}}>
                          • All inventory & equipment<br/>
                          • All structures & drones<br/>
                          • All crafted items & gold<br/>
                          • Research tree progress<br/>
                          • Skill XP (halved, levels preserved)
                        </div>
                        <div style={{fontSize:11,color:C.ok,fontFamily:FONT_BODY,marginBottom:12,paddingLeft:8}}>
                          ✓ You will earn <strong style={{color:C.gold}}>{coresOnAscend} Ancient Data Core{coresOnAscend>1?"s":""}</strong><br/>
                          ✓ Prestige upgrades are permanent<br/>
                          ✓ Ascension level permanently increases
                        </div>
                        <div style={{display:"flex",gap:10}}>
                          <div onClick={doAscend} style={{flex:1,padding:"10px 0",borderRadius:6,background:"linear-gradient(90deg,"+C.bad+"cc,"+C.bad+")",color:C.white,fontSize:11,fontWeight:700,textAlign:"center",cursor:"pointer",letterSpacing:2,fontFamily:FONT}}>CONFIRM ASCEND</div>
                          <div onClick={()=>setShowAscendConfirm(false)} style={{flex:1,padding:"10px 0",borderRadius:6,background:C.card,border:"1px solid "+C.border,color:C.ts,fontSize:11,fontWeight:700,textAlign:"center",cursor:"pointer",letterSpacing:2,fontFamily:FONT}}>CANCEL</div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* What Ascension does */}
                <div style={{marginBottom:20,padding:"12px 16px",borderRadius:8,background:C.card,border:"1px solid "+C.border}}>
                  <div style={{fontSize:11,fontWeight:700,color:C.acc,letterSpacing:2,marginBottom:8}}>ASCENSION REWARDS</div>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6}}>
                    {ASCENSION_THRESHOLDS.map((thr,i)=>{
                      const done=ascensionLevel>i;const current=ascensionLevel===i;
                      return(
                        <div key={i} style={{padding:"8px 10px",borderRadius:6,background:done?"linear-gradient(90deg,"+C.purp+"20,"+C.card+")":current?C.gold+"12":C.bg,border:"1px solid "+(done?C.purp+"50":current?C.gold+"50":C.border),opacity:done||current?1:0.5}}>
                          <div style={{display:"flex",justifyContent:"space-between",marginBottom:3}}>
                            <span style={{fontSize:10,color:done?C.purp:current?C.gold:C.ts,fontWeight:700,fontFamily:FONT}}>Ascension {i+1}</span>
                            <span style={{fontSize:9,color:C.td,fontFamily:FONT_BODY}}>{done?"✓ Done":current?"← Current":"Lv "+thr}</span>
                          </div>
                          <div style={{fontSize:9,color:C.ts,fontFamily:FONT_BODY}}>+{i+1} Data Core{i>0?"s":""} · Skill XP preserved</div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Prestige upgrade shop */}
                <div style={{fontSize:12,fontWeight:700,color:C.white,letterSpacing:2,marginBottom:4}}>PERMANENT UPGRADES</div>
                <div style={{fontSize:10,color:C.ts,marginBottom:14,fontFamily:FONT_BODY}}>
                  Spend Ancient Data Cores on permanent bonuses. These survive all ascensions.
                  <span style={{color:C.gold,fontWeight:700}}> {dataCores} cores available.</span>
                </div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                  {PRESTIGE_UPGRADES.map(pu=>{
                    const lv=prestigeUpgrades[pu.id]||0;
                    const maxed=lv>=pu.maxLevel;
                    const nextCost=maxed?0:pu.costPerLevel*(lv+1);
                    const canBuy=!maxed&&dataCores>=nextCost;
                    const col=pu.color;
                    return(
                      <div key={pu.id} style={{padding:"14px",borderRadius:10,background:lv>0?"linear-gradient(135deg,"+col+"15,"+C.card+")":C.card,border:"2px solid "+(lv>0?col+"50":C.border),boxShadow:lv>0?"0 0 12px "+col+"25":"none"}}>
                        <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
                          <span style={{fontSize:22,filter:lv>0?"drop-shadow(0 0 6px "+col+")":"none"}}>{pu.icon}</span>
                          <div style={{flex:1}}>
                            <div style={{fontSize:11,fontWeight:700,color:lv>0?col:C.white,fontFamily:FONT,letterSpacing:1}}>{pu.name}</div>
                            <div style={{fontSize:9,color:C.ts,fontFamily:FONT_BODY,marginTop:1}}>{pu.desc}</div>
                          </div>
                          <div style={{fontSize:10,fontWeight:700,color:lv>0?col:C.td,fontFamily:FONT}}>{lv}/{pu.maxLevel}</div>
                        </div>
                        {/* Level progress bar */}
                        <div style={{display:"flex",gap:2,marginBottom:8}}>
                          {[...Array(pu.maxLevel)].map((_,i)=>(
                            <div key={i} style={{flex:1,height:3,borderRadius:2,background:i<lv?col:C.bg,border:"1px solid "+(i<lv?col:C.border),transition:"all 0.3s"}}/>
                          ))}
                        </div>
                        {lv>0&&(
                          <div style={{padding:"4px 8px",borderRadius:4,background:col+"12",border:"1px solid "+col+"25",marginBottom:8}}>
                            <div style={{fontSize:9,color:col,fontFamily:FONT_BODY}}>{pu.effectDesc(lv)}</div>
                          </div>
                        )}
                        {maxed?(
                          <div style={{padding:"6px 0",borderRadius:5,background:col+"20",border:"1px solid "+col+"40",color:col,fontSize:9,fontWeight:700,textAlign:"center",letterSpacing:1,fontFamily:FONT}}>✦ MAXED</div>
                        ):(
                          <div onClick={()=>canBuy&&doBuyPrestige(pu)} style={{padding:"6px 0",borderRadius:5,background:canBuy?"linear-gradient(90deg,"+col+"cc,"+col+")":C.bg,color:canBuy?C.bg:C.td,fontSize:9,fontWeight:700,textAlign:"center",cursor:canBuy?"pointer":"default",letterSpacing:1,fontFamily:FONT,border:"1px solid "+(canBuy?col:C.border),boxShadow:canBuy?"0 0 8px "+col+"55":"none",transition:"all 0.15s"}}>
                            {canBuy?"UPGRADE ("+nextCost+" core"+(nextCost>1?"s":"")+")":" NEED "+nextCost+" CORE"+(nextCost>1?"S":"")}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );})()}

            {/* ===== MARKETPLACE PAGE ===== */}
            {page==="market"&&(()=>{
              // Load market on page open
              const tradableItems=Object.entries(inv).filter(([id])=>ITEMS[id]&&ITEMS[id].s);
              return(
              <div style={{maxWidth:760}}>
                <div style={{display:"flex",alignItems:"baseline",gap:16,marginBottom:6}}>
                  <div style={{fontSize:20,fontWeight:700,color:C.white,letterSpacing:2}}>MARKETPLACE</div>
                  <div style={{fontSize:11,color:C.ts,fontFamily:FONT_BODY}}>Player-to-player trading · ◈ {fmt(gold)} credits</div>
                  <div onClick={loadMarket} style={{marginLeft:"auto",padding:"4px 12px",borderRadius:6,background:C.card,border:"1px solid "+C.border,fontSize:9,color:C.acc,cursor:"pointer",fontWeight:700,letterSpacing:1,fontFamily:FONT}}>{marketLoading?"LOADING...":"↻ REFRESH"}</div>
                </div>
                <div style={{fontSize:10,color:C.ts,marginBottom:14,fontFamily:FONT_BODY}}>
                  Buy resources from other players or list your own for sale. Transactions are live across all players.
                </div>

                {/* Tabs */}
                <div style={{display:"flex",gap:6,marginBottom:16}}>
                  {[["browse","🛒 Browse Listings"],["sell","📦 List Item"],["mine","📋 My Listings"]].map(([t,l])=>(
                    <div key={t} onClick={()=>{setMarketTab(t);if(t==="browse"||t==="mine")loadMarket()}} style={{padding:"6px 16px",borderRadius:6,cursor:"pointer",background:marketTab===t?C.acc+"25":C.card,border:"2px solid "+(marketTab===t?C.acc+"80":C.border),color:marketTab===t?C.acc:C.ts,fontSize:10,fontWeight:700,letterSpacing:1,fontFamily:FONT,transition:"all 0.15s"}}>{l}</div>
                  ))}
                </div>

                {/* BROWSE tab */}
                {marketTab==="browse"&&(
                  <div>
                    {marketLoading&&<div style={{color:C.ts,fontFamily:FONT_BODY,fontSize:11,padding:20,textAlign:"center"}}>Loading market orders...</div>}
                    {!marketLoading&&marketOrders.length===0&&(
                      <div style={{padding:"24px",borderRadius:8,background:C.card,border:"1px solid "+C.border,textAlign:"center"}}>
                        <div style={{fontSize:24,marginBottom:8}}>🏪</div>
                        <div style={{fontSize:12,color:C.td,fontFamily:FONT_BODY}}>No listings yet. Be the first to sell something!</div>
                        <div style={{fontSize:10,color:C.ts,marginTop:6,fontFamily:FONT_BODY}}>Click Refresh to check for new listings.</div>
                      </div>
                    )}
                    <div style={{display:"flex",flexDirection:"column",gap:8}}>
                      {marketOrders.map(order=>{
                        const it=ITEMS[order.itemId];
                        const canBuy=gold>=order.price;
                        return(
                          <div key={order.id} style={{display:"flex",alignItems:"center",gap:12,padding:"12px 16px",borderRadius:8,background:C.card,border:"1px solid "+(canBuy?C.border:C.bad+"30")}}>
                            <span style={{fontSize:20}}>{it?it.i:"📦"}</span>
                            <div style={{flex:1}}>
                              <div style={{fontSize:12,fontWeight:700,color:C.white,fontFamily:FONT}}>{it?it.n:order.itemId} <span style={{color:C.ts,fontWeight:400,fontSize:10}}>×{order.qty}</span></div>
                              <div style={{fontSize:10,color:C.td,fontFamily:FONT_BODY}}>from <span style={{color:C.acc}}>{order.sellerName||"Unknown"}</span></div>
                            </div>
                            <div style={{textAlign:"right",flexShrink:0}}>
                              <div style={{fontSize:13,fontWeight:700,color:C.gold,fontFamily:FONT}}>◈ {fmt(order.price)}</div>
                              <div style={{fontSize:9,color:C.ts,fontFamily:FONT_BODY}}>per {order.qty}</div>
                            </div>
                            <div onClick={()=>canBuy&&buyItem(order)} style={{padding:"7px 16px",borderRadius:6,background:canBuy?"linear-gradient(90deg,"+C.accD+","+C.acc+")":C.card,color:canBuy?C.bg:C.td,fontSize:10,fontWeight:700,cursor:canBuy?"pointer":"default",letterSpacing:1,fontFamily:FONT,border:"1px solid "+(canBuy?C.acc:C.border),boxShadow:canBuy?GLOW_STYLE:"none",flexShrink:0}}>
                              {canBuy?"BUY":"NO CREDITS"}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* SELL tab */}
                {marketTab==="sell"&&(
                  <div style={{maxWidth:500}}>
                    <div style={{padding:"18px 20px",borderRadius:10,background:C.card,border:"1px solid "+C.border}}>
                      <div style={{fontSize:10,fontWeight:700,color:C.acc,letterSpacing:2,marginBottom:14}}>CREATE LISTING</div>

                      <div style={{marginBottom:12}}>
                        <div style={{fontSize:9,color:C.td,marginBottom:6,letterSpacing:1}}>SELECT ITEM</div>
                        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:6,maxHeight:200,overflow:"auto"}}>
                          {tradableItems.map(([id,qty])=>{
                            const it=ITEMS[id];
                            return(
                              <div key={id} onClick={()=>setSellItem(id)} style={{padding:"8px 10px",borderRadius:6,background:sellItem===id?C.acc+"20":C.bg,border:"1px solid "+(sellItem===id?C.acc+"60":C.border),cursor:"pointer",transition:"all 0.15s"}}>
                                <div style={{fontSize:14}}>{it?it.i:"📦"}</div>
                                <div style={{fontSize:9,color:sellItem===id?C.acc:C.ts,fontFamily:FONT_BODY,marginTop:2}}>{it?it.n:id}</div>
                                <div style={{fontSize:9,color:C.td,fontFamily:FONT_BODY}}>×{qty}</div>
                              </div>
                            );
                          })}
                          {tradableItems.length===0&&<div style={{gridColumn:"1/-1",fontSize:11,color:C.td,fontFamily:FONT_BODY,padding:8}}>No tradable resources. Gather some first!</div>}
                        </div>
                      </div>

                      {sellItem&&(
                        <>
                          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:14}}>
                            <div>
                              <div style={{fontSize:9,color:C.td,marginBottom:4,letterSpacing:1}}>QUANTITY (have: {inv[sellItem]||0})</div>
                              <input type="number" min="1" max={inv[sellItem]||1} value={sellQty}
                                onChange={e=>setSellQty(Math.max(1,Math.min(inv[sellItem]||1,parseInt(e.target.value)||1)))}
                                style={{width:"100%",padding:"8px 10px",borderRadius:6,background:C.bg,border:"1px solid "+C.border,color:C.white,fontSize:12,fontFamily:FONT_BODY,outline:"none"}}/>
                            </div>
                            <div>
                              <div style={{fontSize:9,color:C.td,marginBottom:4,letterSpacing:1}}>PRICE (◈ credits)</div>
                              <input type="number" min="1" value={sellPrice}
                                onChange={e=>setSellPrice(Math.max(1,parseInt(e.target.value)||1))}
                                style={{width:"100%",padding:"8px 10px",borderRadius:6,background:C.bg,border:"1px solid "+C.border,color:C.white,fontSize:12,fontFamily:FONT_BODY,outline:"none"}}/>
                            </div>
                          </div>
                          <div style={{padding:"10px 14px",borderRadius:6,background:C.acc+"12",border:"1px solid "+C.acc+"30",marginBottom:14}}>
                            <div style={{fontSize:10,color:C.ts,fontFamily:FONT_BODY}}>
                              Listing: <span style={{color:C.white,fontWeight:700}}>{ITEMS[sellItem]?ITEMS[sellItem].n:sellItem} ×{sellQty}</span>
                              {" "}for <span style={{color:C.gold,fontWeight:700}}>◈ {sellPrice}</span>
                            </div>
                          </div>
                          <div onClick={listItem} style={{padding:"10px 0",borderRadius:6,background:"linear-gradient(90deg,"+C.accD+","+C.acc+")",color:C.bg,fontSize:11,fontWeight:700,textAlign:"center",cursor:"pointer",letterSpacing:2,fontFamily:FONT,boxShadow:GLOW_STYLE}}>
                            LIST FOR SALE
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                )}

                {/* MY LISTINGS tab */}
                {marketTab==="mine"&&(
                  <div>
                    {myListings.length===0&&(
                      <div style={{padding:"24px",borderRadius:8,background:C.card,border:"1px solid "+C.border,textAlign:"center"}}>
                        <div style={{fontSize:12,color:C.td,fontFamily:FONT_BODY}}>You have no active listings.</div>
                      </div>
                    )}
                    <div style={{display:"flex",flexDirection:"column",gap:8}}>
                      {myListings.map(order=>{
                        const it=ITEMS[order.itemId];
                        return(
                          <div key={order.id} style={{display:"flex",alignItems:"center",gap:12,padding:"12px 16px",borderRadius:8,background:C.card,border:"1px solid "+C.acc+"30"}}>
                            <span style={{fontSize:20}}>{it?it.i:"📦"}</span>
                            <div style={{flex:1}}>
                              <div style={{fontSize:12,fontWeight:700,color:C.white,fontFamily:FONT}}>{it?it.n:order.itemId} <span style={{color:C.ts,fontWeight:400,fontSize:10}}>×{order.qty}</span></div>
                              <div style={{fontSize:10,color:C.gold,fontFamily:FONT_BODY}}>◈ {fmt(order.price)} · Listed</div>
                            </div>
                            <div onClick={()=>cancelListing(order)} style={{padding:"6px 14px",borderRadius:6,background:C.bad+"20",border:"1px solid "+C.bad+"50",color:C.bad,fontSize:9,fontWeight:700,cursor:"pointer",letterSpacing:1,fontFamily:FONT}}>
                              CANCEL
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );})()}

            {/* ===== ACHIEVEMENTS PAGE ===== */}
            {page==="achievements"&&(()=>{
              const unlocked=ACHIEVEMENTS.filter(a=>achievements[a.id]).length;
              const cats=Object.keys(ACHIEVEMENT_CATS);
              const filteredAchs=ACHIEVEMENTS.filter(a=>a.cat===achCat);
              return(
              <div style={{}}>
                {/* Header */}
                <div style={{display:"flex",alignItems:"center",gap:16,marginBottom:16}}>
                  <div>
                    <div style={{fontSize:20,fontWeight:700,color:C.white,letterSpacing:2}}>ACHIEVEMENTS</div>
                    <div style={{fontSize:11,color:C.ts,fontFamily:FONT_BODY,marginTop:2}}>
                      <span style={{color:C.gold,fontWeight:700}}>{unlocked}</span> / {ACHIEVEMENTS.length} unlocked
                    </div>
                  </div>
                  {/* Overall progress bar */}
                  <div style={{flex:1,height:8,borderRadius:4,background:C.bg,overflow:"hidden",border:"1px solid "+C.border}}>
                    <div style={{width:(unlocked/ACHIEVEMENTS.length*100)+"%",height:"100%",background:"linear-gradient(90deg,"+C.gold+","+C.warn+")",borderRadius:4,transition:"width 0.5s",boxShadow:"0 0 6px "+C.gold}}/>
                  </div>
                  <div style={{fontSize:12,fontWeight:700,color:C.gold,fontFamily:FONT,flexShrink:0}}>{Math.round(unlocked/ACHIEVEMENTS.length*100)}%</div>
                </div>

                {/* Category tabs */}
                <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:16}}>
                  {cats.map(cat=>{
                    const meta=ACHIEVEMENT_CATS[cat];
                    const catTotal=ACHIEVEMENTS.filter(a=>a.cat===cat).length;
                    const catDone=ACHIEVEMENTS.filter(a=>a.cat===cat&&achievements[a.id]).length;
                    const active=achCat===cat;
                    return(
                      <div key={cat} onClick={()=>setAchCat(cat)} style={{padding:"5px 12px",borderRadius:6,cursor:"pointer",background:active?meta.color+"25":C.card,border:"2px solid "+(active?meta.color+"80":C.border),transition:"all 0.15s"}}>
                        <div style={{fontSize:9,fontWeight:700,color:active?meta.color:C.ts,letterSpacing:1}}>{meta.label}</div>
                        <div style={{fontSize:9,color:active?meta.color:C.td,fontFamily:FONT_BODY}}>{catDone}/{catTotal}</div>
                      </div>
                    );
                  })}
                </div>

                {/* Achievement cards */}
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                  {filteredAchs.map(ach=>{
                    const done=!!achievements[ach.id];
                    const meta=ACHIEVEMENT_CATS[ach.cat];
                    return(
                      <div key={ach.id} style={{padding:"14px 16px",borderRadius:10,background:done?"linear-gradient(135deg,"+meta.color+"15,"+C.card+")":C.card,border:"2px solid "+(done?meta.color+"50":C.border),opacity:done?1:0.6,transition:"all 0.2s",boxShadow:done?"0 0 12px "+meta.color+"25":"none"}}>
                        <div style={{display:"flex",alignItems:"flex-start",gap:10}}>
                          <span style={{fontSize:24,filter:done?"drop-shadow(0 0 6px "+meta.color+")":"grayscale(1)",flexShrink:0}}>{ach.icon}</span>
                          <div style={{flex:1}}>
                            <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:3}}>
                              <div style={{fontSize:11,fontWeight:700,color:done?meta.color:C.td,fontFamily:FONT,letterSpacing:0.5}}>{ach.name}</div>
                              {done&&<div style={{fontSize:8,color:meta.color,fontWeight:700,padding:"1px 6px",borderRadius:8,background:meta.color+"20",border:"1px solid "+meta.color+"40"}}>✓</div>}
                            </div>
                            <div style={{fontSize:10,color:C.ts,fontFamily:FONT_BODY,lineHeight:1.4,marginBottom:6}}>{ach.desc}</div>
                            <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>
                              {ach.reward.rp&&<span style={{fontSize:9,color:C.acc,padding:"1px 7px",borderRadius:4,background:C.acc+"12",border:"1px solid "+C.acc+"25"}}>🔬 +{ach.reward.rp} RP</span>}
                              {ach.reward.gold&&<span style={{fontSize:9,color:C.gold,padding:"1px 7px",borderRadius:4,background:C.gold+"12",border:"1px solid "+C.gold+"25"}}>◈ +{ach.reward.gold}</span>}
                              {ach.reward.dataCores&&<span style={{fontSize:9,color:C.purp,padding:"1px 7px",borderRadius:4,background:C.purp+"12",border:"1px solid "+C.purp+"25"}}>✦ +{ach.reward.dataCores} Core</span>}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );})()}

            {/* ===== BLUEPRINTS PAGE ===== */}
            {page==="blueprints"&&(()=>{
              const totalBps=BLUEPRINTS.length;
              const unlockedBps=blueprints.length;
              const cats=["gather","prod","utility"];
              const catLabels={gather:"Gathering",prod:"Production",utility:"Utility"};
              return(
              <div style={{}}>
                {/* Header */}
                <div style={{display:"flex",alignItems:"center",gap:16,marginBottom:6}}>
                  <div>
                    <div style={{fontSize:20,fontWeight:700,color:C.white,letterSpacing:2}}>BLUEPRINTS</div>
                    <div style={{fontSize:11,color:C.ts,fontFamily:FONT_BODY,marginTop:2}}>
                      Hidden recipes discovered through exploration
                    </div>
                  </div>
                  <div style={{flex:1,height:8,borderRadius:4,background:C.bg,border:"1px solid "+C.border,overflow:"hidden"}}>
                    <div style={{width:(unlockedBps/totalBps*100)+"%",height:"100%",background:"linear-gradient(90deg,#38bdf8,"+C.purp+")",borderRadius:4,transition:"width 0.5s"}}/>
                  </div>
                  <div style={{fontSize:12,fontWeight:700,color:"#38bdf8",fontFamily:FONT,flexShrink:0}}>{unlockedBps}/{totalBps}</div>
                </div>

                {/* How to unlock info box */}
                {unlockedBps===0&&(
                  <div style={{padding:"14px 16px",borderRadius:10,background:C.card,border:"1px dashed "+C.border,marginBottom:16,marginTop:12}}>
                    <div style={{fontSize:11,color:C.ts,fontFamily:FONT_BODY,lineHeight:1.6}}>
                      📘 Blueprints are hidden recipes unlocked through <span style={{color:C.acc}}>Random Discoveries</span> while gathering. Each discovery type contains a pool of possible blueprints — once unlocked, the new operation appears permanently in that skill's action list.
                    </div>
                  </div>
                )}

                {/* Blueprints by skill category */}
                {cats.map(cat=>{
                  const catBps=BLUEPRINTS.filter(bp=>{
                    const sk=SKILLS.find(s=>s.id===bp.skillId);
                    return sk&&sk.cat===cat;
                  });
                  if(!catBps.length)return null;
                  return(
                    <div key={cat} style={{marginBottom:20}}>
                      <div style={{fontSize:11,fontWeight:700,color:C.td,letterSpacing:2,marginBottom:10,marginTop:12}}>{catLabels[cat]||cat} BLUEPRINTS</div>
                      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                        {catBps.map(bp=>{
                          const unlocked=blueprints.includes(bp.id);
                          const col=BP_RARITY_COLOR[bp.rarity];
                          const sk=SKILLS.find(s=>s.id===bp.skillId);
                          return(
                            <div key={bp.id} style={{padding:"14px 16px",borderRadius:10,
                              background:unlocked?"linear-gradient(135deg,"+col+"12,"+C.card+")":C.card,
                              border:"2px solid "+(unlocked?col+"60":"#ffffff15"),
                              opacity:unlocked?1:0.55,
                              boxShadow:unlocked?"0 0 14px "+col+"20":"none",
                              transition:"all 0.2s"}}>
                              <div style={{display:"flex",alignItems:"flex-start",gap:10}}>
                                <span style={{fontSize:26,filter:unlocked?"drop-shadow(0 0 8px "+col+")":"grayscale(1)",flexShrink:0}}>{unlocked?bp.icon:"❓"}</span>
                                <div style={{flex:1}}>
                                  <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:4}}>
                                    <div style={{fontSize:11,fontWeight:700,color:unlocked?col:C.td,fontFamily:FONT,letterSpacing:0.5}}>
                                      {unlocked?bp.name:"??? Blueprint"}
                                    </div>
                                    <div style={{fontSize:8,padding:"1px 6px",borderRadius:6,background:col+"20",border:"1px solid "+col+"50",color:col,fontWeight:700,letterSpacing:1}}>{bp.rarity.toUpperCase()}</div>
                                  </div>
                                  {unlocked?(
                                    <>
                                      <div style={{fontSize:10,color:C.ts,fontFamily:FONT_BODY,lineHeight:1.4,marginBottom:6}}>{bp.desc}</div>
                                      <div style={{fontSize:9,color:sk?sk.color:C.acc,fontFamily:FONT_BODY}}>
                                        {sk?.icon} {sk?.name} · Lv {bp.act.lv} · {bp.act.t}s
                                      </div>
                                      {bp.act.out&&<div style={{fontSize:9,color:C.gold,marginTop:3,fontFamily:FONT_BODY}}>
                                        → {bp.act.out.map(o=>(ITEMS[o.id]?.i||"")+" "+(ITEMS[o.id]?.n||o.id)+" ×"+o.q).join(", ")}
                                      </div>}
                                      <div onClick={()=>{setActSkill(bp.skillId);setPage("skills")}} style={{marginTop:8,padding:"4px 10px",borderRadius:6,background:col+"20",border:"1px solid "+col+"50",color:col,fontSize:9,fontWeight:700,cursor:"pointer",display:"inline-block",fontFamily:FONT,letterSpacing:1}}>
                                        VIEW IN {sk?.name?.toUpperCase()||"SKILL"} →
                                      </div>
                                    </>
                                  ):(
                                    <>
                                      <div style={{fontSize:10,color:C.td,fontFamily:FONT_BODY,marginBottom:4}}>???</div>
                                      <div style={{fontSize:9,color:C.td,fontFamily:FONT_BODY}}>Found via: {bp.source}</div>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}

                {/* Discovery reminder */}
                <div style={{padding:"12px 16px",borderRadius:8,background:C.card,border:"1px solid "+C.border,marginTop:8}}>
                  <div style={{fontSize:11,fontWeight:700,color:C.acc,letterSpacing:2,marginBottom:6}}>HOW TO UNLOCK</div>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6}}>
                    {[
                      {disc:"🚢 Ancient Submarine Wreck",bps:"Void Kelp, Leviathan Scale, Deep Scan, Supply Mastery"},
                      {disc:"🏚️ Lost Research Facility",  bps:"Void Crystal, Ancient Brew, Atlas Complete"},
                      {disc:"📡 Deep Signal Beacon",      bps:"Thermal Forge, Void Reactor (Legendary!)"},
                      {disc:"💎 Crystal Vein Exposed",    bps:"Ancient Emperor Armor (Legendary!)"},
                    ].map(row=>(
                      <div key={row.disc} style={{fontSize:9,fontFamily:FONT_BODY}}>
                        <div style={{color:C.gold,fontWeight:700,marginBottom:2}}>{row.disc}</div>
                        <div style={{color:C.ts}}>{row.bps}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );})()}

            {/* ===== SOCIAL PAGE ===== */}
            {page==="social"&&(()=>{
              // Tab bar
              const tabs=[
                {id:"chat",  label:"💬 Global",  badge:null},
                {id:"clan",  label:"⚔️ Clan",    badge:clan?clan.tag:null},
                {id:"friends",label:"👥 Friends", badge:friendReqs.length>0?friendReqs.length:null},
                {id:"dm",    label:"✉️ DM",       badge:dmTarget?dmTarget.name:null},
              ];
              // Chat message bubble (plain function, no hooks)
              const ChatMsg=({m,mine})=>(
                <div style={{display:"flex",gap:8,padding:"5px 0",alignItems:"flex-start",flexDirection:mine?"row-reverse":"row"}}>
                  <div style={{width:26,height:26,borderRadius:13,background:mine?"linear-gradient(135deg,"+C.acc+","+C.purp+")":"linear-gradient(135deg,"+C.td+","+C.border+")",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700,color:C.bg,flexShrink:0}}>
                    {(m.name||"?")[0].toUpperCase()}
                  </div>
                  <div style={{maxWidth:"72%"}}>
                    <div style={{fontSize:9,color:mine?C.acc:C.ts,fontFamily:FONT_BODY,marginBottom:2,textAlign:mine?"right":"left"}}>{mine?"You":m.name}</div>
                    <div style={{padding:"7px 11px",borderRadius:mine?"12px 3px 12px 12px":"3px 12px 12px 12px",background:mine?"linear-gradient(135deg,"+C.acc+"30,"+C.acc+"15)":"linear-gradient(135deg,"+C.card+","+C.bg+")",border:"1px solid "+(mine?C.acc+"40":C.border),fontSize:11,color:C.white,fontFamily:FONT_BODY,lineHeight:1.5,wordBreak:"break-word"}}>
                      {m.text}
                    </div>
                    <div style={{fontSize:8,color:C.td,marginTop:2,textAlign:mine?"right":"left",fontFamily:FONT_BODY}}>{new Date(m.ts).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"})}</div>
                  </div>
                </div>
              );

              return(
              <div style={{display:"flex",flexDirection:"column",minHeight:0,flex:1}}>
                {/* Tabs */}
                <div style={{display:"flex",gap:4,marginBottom:12,flexShrink:0}}>
                  {tabs.map(t=>(
                    <div key={t.id} onClick={()=>setSocialTab(t.id)} style={{padding:"7px 14px",borderRadius:8,background:socialTab===t.id?"linear-gradient(90deg,"+C.accD+","+C.acc+")":C.card,border:"1px solid "+(socialTab===t.id?C.acc+"60":C.border),color:socialTab===t.id?C.bg:C.ts,fontSize:10,fontWeight:700,cursor:"pointer",letterSpacing:1,fontFamily:FONT,display:"flex",alignItems:"center",gap:6}}>
                      {t.label}
                      {t.badge&&<span style={{padding:"1px 6px",borderRadius:8,background:C.bad,color:"#fff",fontSize:9,fontWeight:700}}>{t.badge}</span>}
                    </div>
                  ))}
                </div>

                {/* ── GLOBAL CHAT ── */}
                {socialTab==="chat"&&(
                  <div style={{display:"flex",flexDirection:"column",flex:1,minHeight:0}}>
                    <div style={{flex:1,overflowY:"auto",padding:"8px 0",display:"flex",flexDirection:"column",gap:2}}>
                      {chatMessages.map(m=><ChatMsg key={m.id||m.ts} m={m} mine={m.uid===account.uid}/>)}
                      <div ref={chatEndRef}/>
                    </div>
                    <div style={{display:"flex",gap:8,paddingTop:10,flexShrink:0}}>
                      <input value={chatInput} onChange={e=>setChatInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&sendChat()} placeholder="Send a message to all players..." style={{flex:1,padding:"9px 12px",borderRadius:8,background:C.card,border:"1px solid "+C.border,color:C.white,fontSize:11,fontFamily:FONT_BODY,outline:"none"}}/>
                      <div onClick={sendChat} style={{padding:"9px 20px",borderRadius:8,background:"linear-gradient(90deg,"+C.accD+","+C.acc+")",color:C.bg,fontSize:11,fontWeight:700,cursor:"pointer",letterSpacing:1,fontFamily:FONT,flexShrink:0}}>SEND</div>
                    </div>
                  </div>
                )}

                {/* ── FRIENDS ── */}
                {socialTab==="friends"&&(
                  <div style={{flex:1,overflowY:"auto",display:"flex",flexDirection:"column",gap:12}}>
                    {/* Add friend */}
                    <div style={{padding:"14px",borderRadius:10,background:C.card,border:"1px solid "+C.border}}>
                      <div style={{fontSize:11,fontWeight:700,color:C.acc,letterSpacing:2,marginBottom:8}}>ADD COMMANDER</div>
                      <div style={{display:"flex",gap:8}}>
                        <input value={addFriendInput} onChange={e=>setAddFriendInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&sendFriendReq()} placeholder="Commander name..." style={{flex:1,padding:"8px 12px",borderRadius:8,background:C.bg,border:"1px solid "+C.border,color:C.white,fontSize:11,fontFamily:FONT_BODY,outline:"none"}}/>
                        <div onClick={sendFriendReq} style={{padding:"8px 16px",borderRadius:8,background:"linear-gradient(90deg,"+C.accD+","+C.acc+")",color:C.bg,fontSize:10,fontWeight:700,cursor:"pointer",letterSpacing:1,fontFamily:FONT,flexShrink:0}}>ADD</div>
                      </div>
                      {addFriendErr&&<div style={{fontSize:10,color:addFriendErr.includes("✓")?C.ok:C.bad,marginTop:6,fontFamily:FONT_BODY}}>{addFriendErr}</div>}
                    </div>
                    {/* Incoming requests */}
                    {friendReqs.length>0&&(
                      <div style={{padding:"14px",borderRadius:10,background:C.card,border:"1px solid "+C.warn+"40"}}>
                        <div style={{fontSize:9,fontWeight:700,color:C.warn,letterSpacing:2,marginBottom:8}}>INCOMING REQUESTS ({friendReqs.length})</div>
                        {friendReqs.map(req=>(
                          <div key={req.uid} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"8px 0",borderBottom:"1px solid "+C.border}}>
                            <div style={{display:"flex",alignItems:"center",gap:10}}>
                              <div style={{width:32,height:32,borderRadius:16,background:"linear-gradient(135deg,"+C.warn+","+C.gold+")",display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,fontWeight:700,color:C.bg}}>{(req.name||"?")[0].toUpperCase()}</div>
                              <span style={{fontSize:12,color:C.white,fontFamily:FONT_BODY}}>{req.name}</span>
                            </div>
                            <div style={{display:"flex",gap:6}}>
                              <div onClick={()=>acceptFriend(req)} style={{padding:"5px 12px",borderRadius:6,background:C.ok+"20",border:"1px solid "+C.ok+"50",color:C.ok,fontSize:10,fontWeight:700,cursor:"pointer",fontFamily:FONT}}>✓ ACCEPT</div>
                              <div onClick={()=>declineFriend(req)} style={{padding:"5px 10px",borderRadius:6,background:C.bad+"15",border:"1px solid "+C.bad+"40",color:C.bad,fontSize:10,fontWeight:700,cursor:"pointer",fontFamily:FONT}}>✗</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    {/* Friends list */}
                    <div style={{padding:"14px",borderRadius:10,background:C.card,border:"1px solid "+C.border}}>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                        <div style={{fontSize:11,fontWeight:700,color:C.acc,letterSpacing:2}}>FRIENDS ({friends.length})</div>
                        <div onClick={loadFriends} style={{fontSize:9,color:C.ts,cursor:"pointer",fontFamily:FONT}}>↻ Refresh</div>
                      </div>
                      {friends.length===0&&<div style={{fontSize:11,color:C.td,fontFamily:FONT_BODY}}>No friends yet — add a commander above!</div>}
                      {friends.map(f=>(
                        <div key={f.uid} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"10px 0",borderBottom:"1px solid "+C.border}}>
                          <div style={{display:"flex",alignItems:"center",gap:10}}>
                            <div style={{width:34,height:34,borderRadius:17,background:"linear-gradient(135deg,"+C.acc+","+C.purp+")",display:"flex",alignItems:"center",justifyContent:"center",fontSize:15,fontWeight:700,color:C.bg}}>{(f.name||"?")[0].toUpperCase()}</div>
                            <div>
                              <div style={{fontSize:12,fontWeight:700,color:C.white,fontFamily:FONT_BODY}}>{f.name}</div>
                              <div style={{fontSize:9,color:C.ts,fontFamily:FONT_BODY}}>Lv {f.totalSkillLv||"?"} · {f.ascensions>0?"✦ ASC "+f.ascensions:""}</div>
                            </div>
                          </div>
                          <div style={{display:"flex",gap:6}}>
                            <div onClick={()=>loadDm(f)} style={{padding:"5px 12px",borderRadius:6,background:C.acc+"20",border:"1px solid "+C.acc+"40",color:C.acc,fontSize:9,fontWeight:700,cursor:"pointer",fontFamily:FONT}}>✉ DM</div>
                            <div onClick={()=>removeFriend(f.uid)} style={{padding:"5px 10px",borderRadius:6,background:C.bad+"10",border:"1px solid "+C.bad+"30",color:C.bad,fontSize:9,cursor:"pointer",fontFamily:FONT}}>✗</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* ── DIRECT MESSAGES ── */}
                {socialTab==="dm"&&(
                  <div style={{display:"flex",flexDirection:"column",flex:1,minHeight:0}}>
                    {!dmTarget?(
                      <div style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",color:C.td,fontFamily:FONT_BODY,fontSize:12,flexDirection:"column",gap:8}}>
                        <span style={{fontSize:32}}>✉️</span>
                        <span>Click DM on a friend to start a conversation</span>
                      </div>
                    ):(
                      <>
                        <div style={{display:"flex",alignItems:"center",gap:10,padding:"8px 0 12px",borderBottom:"1px solid "+C.border,flexShrink:0}}>
                          <div style={{width:32,height:32,borderRadius:16,background:"linear-gradient(135deg,"+C.acc+","+C.purp+")",display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,fontWeight:700,color:C.bg}}>{(dmTarget.name||"?")[0].toUpperCase()}</div>
                          <div style={{fontSize:12,fontWeight:700,color:C.white,fontFamily:FONT_BODY}}>{dmTarget.name}</div>
                          <div onClick={()=>{setDmTarget(null);setDmMessages([])}} style={{marginLeft:"auto",fontSize:11,color:C.td,cursor:"pointer",fontFamily:FONT}}>✕ Close</div>
                        </div>
                        <div style={{flex:1,overflowY:"auto",padding:"8px 0",display:"flex",flexDirection:"column",gap:2}}>
                          {dmMessages.map((m,i)=><ChatMsg key={i} m={m} mine={m.uid===account.uid}/>)}
                          <div ref={chatEndRef}/>
                        </div>
                        <div style={{display:"flex",gap:8,paddingTop:10,flexShrink:0}}>
                          <input value={dmInput} onChange={e=>setDmInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&sendDm()} placeholder={"Message "+dmTarget.name+"..."} style={{flex:1,padding:"9px 12px",borderRadius:8,background:C.card,border:"1px solid "+C.border,color:C.white,fontSize:11,fontFamily:FONT_BODY,outline:"none"}}/>
                          <div onClick={sendDm} style={{padding:"9px 20px",borderRadius:8,background:"linear-gradient(90deg,"+C.accD+","+C.acc+")",color:C.bg,fontSize:11,fontWeight:700,cursor:"pointer",letterSpacing:1,fontFamily:FONT,flexShrink:0}}>SEND</div>
                        </div>
                      </>
                    )}
                  </div>
                )}

                {/* ── CLAN ── */}
                {socialTab==="clan"&&(
                  <div style={{flex:1,overflowY:"auto",display:"flex",flexDirection:"column",gap:12}}>
                    {!clan?(
                      /* No clan — join or create */
                      <>
                        {/* Create clan */}
                        <div style={{padding:"16px",borderRadius:10,background:C.card,border:"1px solid "+C.border}}>
                          <div style={{fontSize:11,fontWeight:700,color:C.acc,letterSpacing:2,marginBottom:10}}>FOUND A CLAN</div>
                          <div style={{display:"flex",gap:8,marginBottom:8}}>
                            <input value={createClanName} onChange={e=>setCreateClanName(e.target.value)} placeholder="Clan name..." style={{flex:2,padding:"8px 12px",borderRadius:8,background:C.bg,border:"1px solid "+C.border,color:C.white,fontSize:11,fontFamily:FONT_BODY,outline:"none"}}/>
                            <input value={createClanTag} onChange={e=>setCreateClanTag(e.target.value)} placeholder="TAG" maxLength={4} style={{flex:0,width:72,padding:"8px 12px",borderRadius:8,background:C.bg,border:"1px solid "+C.border,color:C.gold,fontSize:11,fontFamily:FONT,outline:"none",textTransform:"uppercase",textAlign:"center"}}/>
                          </div>
                          <div onClick={createClan} style={{padding:"10px",borderRadius:8,background:"linear-gradient(90deg,"+C.accD+","+C.acc+")",color:C.bg,fontSize:11,fontWeight:700,cursor:"pointer",textAlign:"center",letterSpacing:1,fontFamily:FONT}}>⚔️ FOUND CLAN</div>
                        </div>
                        {/* Search clans */}
                        <div style={{padding:"16px",borderRadius:10,background:C.card,border:"1px solid "+C.border}}>
                          <div style={{fontSize:11,fontWeight:700,color:C.acc,letterSpacing:2,marginBottom:10}}>FIND A CLAN</div>
                          <div style={{display:"flex",gap:8,marginBottom:10}}>
                            <input value={clanSearchInput} onChange={e=>setClanSearchInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&searchClans()} placeholder="Search by name or tag..." style={{flex:1,padding:"8px 12px",borderRadius:8,background:C.bg,border:"1px solid "+C.border,color:C.white,fontSize:11,fontFamily:FONT_BODY,outline:"none"}}/>
                            <div onClick={searchClans} style={{padding:"8px 14px",borderRadius:8,background:C.card,border:"1px solid "+C.border,color:C.acc,fontSize:10,fontWeight:700,cursor:"pointer",fontFamily:FONT,flexShrink:0}}>🔍</div>
                          </div>
                          {clanSearch.map(c=>(
                            <div key={c.id} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"10px 0",borderBottom:"1px solid "+C.border}}>
                              <div>
                                <div style={{display:"flex",alignItems:"center",gap:8}}>
                                  <span style={{fontSize:11,fontWeight:700,padding:"2px 8px",borderRadius:6,background:C.gold+"20",border:"1px solid "+C.gold+"50",color:C.gold,fontFamily:FONT}}>[{c.tag}]</span>
                                  <span style={{fontSize:12,fontWeight:700,color:C.white,fontFamily:FONT_BODY}}>{c.name}</span>
                                </div>
                                <div style={{fontSize:9,color:C.ts,fontFamily:FONT_BODY,marginTop:2}}>Leader: {c.leaderName} · {c.memberCount||1} members · {(c.totalSkillLv||0).toLocaleString()} total lv</div>
                              </div>
                              <div onClick={()=>joinClan(c.id)} style={{padding:"6px 14px",borderRadius:8,background:"linear-gradient(90deg,"+C.okD+","+C.ok+")",color:C.bg,fontSize:10,fontWeight:700,cursor:"pointer",letterSpacing:1,fontFamily:FONT,flexShrink:0}}>JOIN</div>
                            </div>
                          ))}
                          {clanSearch.length===0&&clanSearchInput&&<div style={{fontSize:11,color:C.td,fontFamily:FONT_BODY}}>No clans found</div>}
                        </div>
                      </>
                    ):(
                      /* In a clan */
                      <>
                        {/* Clan header */}
                        <div style={{padding:"16px",borderRadius:10,background:"linear-gradient(135deg,"+C.gold+"15,"+C.card+")",border:"2px solid "+C.gold+"40"}}>
                          <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:10}}>
                            <div style={{fontSize:28,fontWeight:900,padding:"6px 14px",borderRadius:8,background:C.gold+"20",border:"2px solid "+C.gold+"50",color:C.gold,fontFamily:FONT,letterSpacing:2}}>[{clan.tag}]</div>
                            <div>
                              <div style={{fontSize:15,fontWeight:700,color:C.white,fontFamily:FONT,letterSpacing:1}}>{clan.name}</div>
                              <div style={{fontSize:10,color:C.ts,fontFamily:FONT_BODY}}>Leader: {clan.leaderName} · {clan.memberCount||clanMembers.length} members</div>
                            </div>
                            <div onClick={leaveClan} style={{marginLeft:"auto",padding:"6px 12px",borderRadius:6,background:C.bad+"15",border:"1px solid "+C.bad+"30",color:C.bad,fontSize:9,fontWeight:700,cursor:"pointer",fontFamily:FONT,flexShrink:0}}>LEAVE</div>
                          </div>
                          {/* Members */}
                          <div style={{fontSize:11,fontWeight:700,color:C.td,letterSpacing:2,marginBottom:6}}>MEMBERS</div>
                          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:4}}>
                            {clanMembers.map(m=>(
                              <div key={m.uid} style={{display:"flex",alignItems:"center",gap:8,padding:"6px 8px",borderRadius:6,background:C.bg,border:"1px solid "+(m.role==="leader"?C.gold+"50":C.border)}}>
                                <div style={{width:24,height:24,borderRadius:12,background:m.role==="leader"?"linear-gradient(135deg,"+C.gold+","+C.warn+")":"linear-gradient(135deg,"+C.td+","+C.border+")",display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:700,color:C.bg,flexShrink:0}}>{(m.name||"?")[0].toUpperCase()}</div>
                                <div style={{minWidth:0}}>
                                  <div style={{fontSize:10,color:m.role==="leader"?C.gold:C.white,fontWeight:700,fontFamily:FONT_BODY,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{m.name}{m.role==="leader"?" 👑":""}</div>
                                  <div style={{fontSize:8,color:C.ts,fontFamily:FONT_BODY}}>Lv {m.totalSkillLv||"?"}</div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                        {/* Clan chat */}
                        <div style={{display:"flex",flexDirection:"column",flex:1,minHeight:200,padding:"14px",borderRadius:10,background:C.card,border:"1px solid "+C.border}}>
                          <div style={{fontSize:11,fontWeight:700,color:C.acc,letterSpacing:2,marginBottom:8,flexShrink:0}}>CLAN CHAT</div>
                          <div style={{flex:1,overflowY:"auto",display:"flex",flexDirection:"column",gap:2,marginBottom:10}}>
                            {clanChat.map((m,i)=><ChatMsg key={i} m={m} mine={m.uid===account.uid}/>)}
                            <div ref={chatEndRef}/>
                          </div>
                          <div style={{display:"flex",gap:8,flexShrink:0}}>
                            <input value={clanChatInput} onChange={e=>setClanChatInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&sendClanChat()} placeholder="Message your clan..." style={{flex:1,padding:"9px 12px",borderRadius:8,background:C.bg,border:"1px solid "+C.border,color:C.white,fontSize:11,fontFamily:FONT_BODY,outline:"none"}}/>
                            <div onClick={sendClanChat} style={{padding:"9px 16px",borderRadius:8,background:"linear-gradient(90deg,"+C.accD+","+C.acc+")",color:C.bg,fontSize:11,fontWeight:700,cursor:"pointer",letterSpacing:1,fontFamily:FONT,flexShrink:0}}>SEND</div>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            );})()}

            {/* ===== LEADERBOARD PAGE ===== */}
            {page==="leaderboard"&&(
              <div style={{}}>
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16}}>
                  <div>
                    <div style={{fontSize:20,fontWeight:700,color:C.white,letterSpacing:2}}>🏅 LEADERBOARD</div>
                    <div style={{fontSize:11,color:C.ts,fontFamily:FONT_BODY,marginTop:2}}>Top commanders by total skill level</div>
                  </div>
                  <div onClick={loadLeaderboard} style={{padding:"8px 16px",borderRadius:8,background:C.card,border:"1px solid "+C.border,color:C.acc,fontSize:10,fontWeight:700,cursor:"pointer",letterSpacing:1,fontFamily:FONT}}>
                    {lbLoading?"LOADING...":"↻ REFRESH"}
                  </div>
                </div>

                {leaderboard.length===0&&!lbLoading&&(
                  <div style={{padding:"40px 20px",textAlign:"center",color:C.td,fontFamily:FONT_BODY,fontSize:12}}>
                    No data yet. Click REFRESH to load the leaderboard.
                  </div>
                )}

                {lbLoading&&(
                  <div style={{padding:"40px 20px",textAlign:"center",color:C.acc,fontFamily:FONT,fontSize:11,letterSpacing:2}}>
                    SCANNING COMMANDERS...
                  </div>
                )}

                {!lbLoading&&leaderboard.map((entry,i)=>{
                  const isMe=entry.id===account.uid;
                  const medal=i===0?"🥇":i===1?"🥈":i===2?"🥉":null;
                  const rankColor=i===0?C.gold:i===1?"#c0c0c0":i===2?"#cd7f32":C.ts;
                  return(
                    <div key={entry.id} style={{
                      display:"flex",alignItems:"center",gap:14,padding:"14px 16px",borderRadius:10,marginBottom:6,
                      background:isMe?"linear-gradient(90deg,"+C.acc+"18,"+C.card+")":C.card,
                      border:"2px solid "+(isMe?C.acc+"50":i<3?rankColor+"40":C.border),
                      boxShadow:isMe?GLOW_STYLE:i<3?"0 0 10px "+rankColor+"20":"none",
                      transition:"all 0.2s",
                    }}>
                      <div style={{width:32,textAlign:"center",flexShrink:0}}>
                        {medal?<span style={{fontSize:20}}>{medal}</span>:<span style={{fontSize:13,fontWeight:700,color:rankColor,fontFamily:FONT}}>#{entry.rank}</span>}
                      </div>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{display:"flex",alignItems:"center",gap:8}}>
                          <span style={{fontSize:12,fontWeight:700,color:isMe?C.acc:C.white,fontFamily:FONT,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{entry.name}</span>
                          {isMe&&<span style={{fontSize:8,padding:"1px 6px",borderRadius:6,background:C.acc+"25",border:"1px solid "+C.acc+"50",color:C.acc,fontWeight:700,letterSpacing:1}}>YOU</span>}
                          {entry.ascensions>0&&<span style={{fontSize:8,padding:"1px 6px",borderRadius:6,background:C.purp+"25",border:"1px solid "+C.purp+"40",color:C.purp,fontWeight:700}}>✦ ASC {entry.ascensions}</span>}
                        </div>
                        <div style={{fontSize:10,color:C.ts,fontFamily:FONT_BODY,marginTop:2}}>
                          {(entry.kills||0).toLocaleString()} kills
                        </div>
                      </div>
                      <div style={{textAlign:"right",flexShrink:0}}>
                        <div style={{fontSize:14,fontWeight:700,color:rankColor,fontFamily:FONT}}>{(entry.totalSkillLv||0).toLocaleString()}</div>
                        <div style={{fontSize:9,color:C.td,fontFamily:FONT_BODY}}>total skill lv</div>
                      </div>
                    </div>
                  );
                })}

                {/* Player's own rank if not in top 20 */}
                {!lbLoading&&leaderboard.length>0&&!leaderboard.find(e=>e.id===account.uid)&&(
                  <div style={{marginTop:8,padding:"14px 16px",borderRadius:10,background:"linear-gradient(90deg,"+C.acc+"10,"+C.card+")",border:"2px solid "+C.acc+"30"}}>
                    <div style={{fontSize:10,color:C.ts,fontFamily:FONT_BODY,marginBottom:4}}>YOUR RANK</div>
                    <div style={{display:"flex",alignItems:"center",gap:12}}>
                      <span style={{fontSize:12,fontWeight:700,color:C.acc,fontFamily:FONT}}>{account.displayName}</span>
                      <span style={{fontSize:14,fontWeight:700,color:C.white,fontFamily:FONT,marginLeft:"auto"}}>{totalSkillLevel.toLocaleString()} total lv</span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ===== STATS PAGE ===== */}
            {page==="stats"&&(()=>{
              const allSkillIds=[...SKILLS.map(s=>s.id),...CSUBS.map(c=>c.id),"enhancing"];
              const topSkills=[...allSkillIds].map(id=>({id,lv:sl(id).lv,name:SKILLS.find(s=>s.id===id)?.name||CSUBS.find(c=>c.id===id)?.name||"Enhancing"})).sort((a,b)=>b.lv-a.lv).slice(0,6);
              const totalDrones=Object.values(drones).reduce((s,v)=>s+(v||0),0);
              const totalStructures=Object.values(structures).filter(v=>v>0).length;
              return(
              <div style={{maxWidth:760}}>
                <div style={{fontSize:20,fontWeight:700,color:C.white,letterSpacing:2,marginBottom:16}}>STATS & PROFILE</div>

                {/* Player card */}
                <div style={{padding:"18px 20px",borderRadius:12,background:"linear-gradient(135deg,"+C.acc+"12,"+C.card+")",border:"2px solid "+C.acc+"40",marginBottom:16,boxShadow:"0 0 16px "+C.acc+"20"}}>
                  <div style={{display:"flex",alignItems:"center",gap:16}}>
                    <div style={{fontSize:48,filter:"drop-shadow(0 0 12px "+C.acc+")"}}>🌊</div>
                    <div style={{flex:1}}>
                      <div style={{fontSize:16,fontWeight:700,color:C.white,fontFamily:FONT,letterSpacing:2}}>{account.displayName||"Deep Diver"}</div>
                      <div style={{fontSize:11,color:C.ts,fontFamily:FONT_BODY,marginTop:2}}>{account.email}</div>
                      <div style={{display:"flex",gap:8,marginTop:6,flexWrap:"wrap"}}>
                        {ascensionLevel>0&&<span style={{fontSize:10,color:C.purp,fontWeight:700,padding:"2px 8px",borderRadius:8,background:C.purp+"18",border:"1px solid "+C.purp+"40"}}>✦ Ascension {ascensionLevel}</span>}
                        <span style={{fontSize:10,color:C.acc,fontWeight:700,padding:"2px 8px",borderRadius:8,background:C.acc+"18",border:"1px solid "+C.acc+"40"}}>⭐ Skill Lv {totalSkillLevel}</span>
                        <span style={{fontSize:10,color:C.gold,fontWeight:700,padding:"2px 8px",borderRadius:8,background:C.gold+"18",border:"1px solid "+C.gold+"40"}}>🏆 {Object.keys(achievements).length} Achievements</span>
                      </div>
                    </div>
                    <div style={{textAlign:"center",flexShrink:0}}>
                      <div style={{fontSize:28,fontWeight:700,color:C.gold,fontFamily:FONT}}>{dataCores}</div>
                      <div style={{fontSize:9,color:C.gold,letterSpacing:2}}>DATA CORES</div>
                    </div>
                  </div>
                </div>

                {/* Stats grid */}
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,marginBottom:16}}>
                  {[
                    {label:"Total Gathered",value:fmt(lifeStats.totalGathered||0),icon:"🌿",color:C.ok},
                    {label:"Enemies Slain",value:fmt(lifeStats.kills||0),icon:"⚔️",color:C.bad},
                    {label:"Bosses Killed",value:fmt(lifeStats.bossKills||0),icon:"👑",color:C.warn},
                    {label:"Credits Earned",value:"◈"+fmt(lifeStats.totalGold||0),icon:"💰",color:C.gold},
                    {label:"Items Crafted",value:fmt(lifeStats.crafts||0),icon:"🔧",color:C.purp},
                    {label:"Discoveries",value:fmt(lifeStats.discoveries||0),icon:"🔭",color:C.acc},
                    {label:"Active Drones",value:totalDrones,icon:"🤖",color:"#ff006e"},
                    {label:"Structures Built",value:totalStructures+"/8",icon:"🏗️",color:"#00ffb3"},
                    {label:"Research Pts",value:fmt(researchPts),icon:"🔬",color:"#7b61ff"},
                  ].map(s=>(
                    <div key={s.label} style={{padding:"12px",borderRadius:8,background:C.card,border:"1px solid "+s.color+"30",textAlign:"center"}}>
                      <div style={{fontSize:20,marginBottom:4}}>{s.icon}</div>
                      <div style={{fontSize:13,fontWeight:700,color:s.color,fontFamily:FONT}}>{s.value}</div>
                      <div style={{fontSize:9,color:C.td,fontFamily:FONT_BODY,marginTop:2}}>{s.label}</div>
                    </div>
                  ))}
                </div>

                {/* Top skills */}
                <div style={{padding:"14px 16px",borderRadius:10,background:C.card,border:"1px solid "+C.border,marginBottom:16}}>
                  <div style={{fontSize:11,fontWeight:700,color:C.acc,letterSpacing:2,marginBottom:12}}>TOP SKILLS</div>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                    {topSkills.map(sk=>{
                      const meta=SKILLS.find(s=>s.id===sk.id)||CSUBS.find(c=>c.id===sk.id)||{icon:"⭐",color:C.acc};
                      const pct=Math.min(100,(sl(sk.id).xp/(sl(sk.id).need||1))*100);
                      return(
                        <div key={sk.id} style={{display:"flex",alignItems:"center",gap:8}}>
                          <span style={{fontSize:16,flexShrink:0}}>{meta.icon}</span>
                          <div style={{flex:1}}>
                            <div style={{display:"flex",justifyContent:"space-between",marginBottom:3}}>
                              <span style={{fontSize:10,color:C.text,fontFamily:FONT_BODY}}>{sk.name}</span>
                              <span style={{fontSize:10,color:meta.color||C.acc,fontWeight:700,fontFamily:FONT}}>Lv {sk.lv}</span>
                            </div>
                            <div style={{height:3,borderRadius:2,background:C.bg}}>
                              <div style={{width:pct+"%",height:"100%",borderRadius:2,background:meta.color||C.acc}}/>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Active bonuses summary */}
                {activeBonusList.length>0&&(
                  <div style={{padding:"14px 16px",borderRadius:10,background:C.card,border:"1px solid "+C.border}}>
                    <div style={{fontSize:11,fontWeight:700,color:C.ok,letterSpacing:2,marginBottom:10}}>ALL ACTIVE BONUSES</div>
                    <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
                      {activeBonusList.map(b=>(
                        <span key={b} style={{padding:"3px 10px",borderRadius:10,background:C.ok+"18",border:"1px solid "+C.ok+"40",fontSize:9,color:C.ok,fontFamily:FONT_BODY}}>{b}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );})()}

            {/* COMBAT PAGE */}
            {page==="combat"&&(
              <div>
                {/* Header */}
                <div style={{marginBottom:20}}>
                  <div style={{fontSize:22,fontWeight:700,color:C.white,letterSpacing:2,marginBottom:6}}>⚔️ COMBAT ZONES</div>
                  <div style={{display:"flex",gap:16,flexWrap:"wrap"}}>
                    {[
                      {l:"Hull HP", v:pStats.hp, c:C.ok},
                      {l:"Attack",  v:pStats.atk, c:C.bad},
                      {l:"Defense", v:pStats.def, c:C.acc},
                      {l:"Depth Rank", v:combatLv, c:C.gold},
                    ].map(s=>(
                      <div key={s.l} style={{padding:"8px 16px",borderRadius:8,background:C.card,border:"1px solid "+C.border}}>
                        <div style={{fontSize:10,color:C.td,letterSpacing:1,marginBottom:2,fontFamily:FONT_BODY}}>{s.l}</div>
                        <div style={{fontSize:18,fontWeight:700,color:s.c,fontFamily:FONT}}>{s.v}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Emergency rations */}
                <div style={{marginBottom:20,padding:"16px 20px",borderRadius:10,background:C.card,border:"1px solid "+C.border}}>
                  <div style={{fontSize:11,fontWeight:700,color:C.ts,marginBottom:10,letterSpacing:2}}>🍖 EMERGENCY RATIONS — auto-use below 40% HP</div>
                  <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                    {Object.entries(inv).filter(e=>ITEMS[e[0]]&&ITEMS[e[0]].food).map(e=>{const id=e[0],qty=e[1];return(
                      <div key={id} onClick={()=>setFood(id)} style={{padding:"8px 16px",borderRadius:8,background:food===id?C.ok+"20":C.bg,border:"2px solid "+(food===id?C.ok:C.border),cursor:"pointer",fontSize:13,color:C.text,fontFamily:FONT_BODY,boxShadow:food===id?GLOW_OK:"none",display:"flex",alignItems:"center",gap:6}}>
                        <span style={{fontSize:18}}>{ITEMS[id].i}</span>
                        <span>{ITEMS[id].n}</span>
                        <span style={{color:C.td}}>×{qty}</span>
                        {food===id&&<span style={{color:C.ok,fontWeight:700}}>✓</span>}
                      </div>
                    )})}
                    {!Object.entries(inv).some(e=>ITEMS[e[0]]&&ITEMS[e[0]].food)&&(
                      <span style={{fontSize:13,color:C.td,fontFamily:FONT_BODY}}>No rations — synthesize food first.</span>
                    )}
                  </div>
                </div>

                {/* Zone list */}
                <div style={{fontSize:11,fontWeight:700,color:C.td,marginBottom:12,letterSpacing:2}}>OCEAN ZONES</div>
                {ZONES.map(zone=>{
                  const lk=combatLv<zone.lv;
                  const isAct=zoneId===zone.id;
                  return(
                    <div key={zone.id} style={{padding:"18px 20px",borderRadius:12,background:isAct?"linear-gradient(120deg,"+C.bad+"18,"+C.card+")":C.card,border:"2px solid "+(isAct?C.bad+"80":lk?C.border+"60":C.border),marginBottom:12,opacity:lk?0.4:1,transition:"border-color 0.2s"}}>
                      {/* Zone header */}
                      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
                        <div>
                          <div style={{fontSize:18,fontWeight:700,color:isAct?C.bad:C.white,fontFamily:FONT,letterSpacing:1,marginBottom:3}}>
                            {zone.icon} {zone.name.toUpperCase()}
                          </div>
                          <div style={{fontSize:12,color:C.ts,fontFamily:FONT_BODY}}>
                            Depth Rank {zone.lv}+ · {zone.mobs.length} mobs · {(zone.elites||[]).length} elites · 2 bosses
                          </div>
                        </div>
                        {!lk&&(
                          <div onClick={()=>isAct?stopZone():startZone(zone.id)} style={{padding:"10px 24px",borderRadius:8,background:isAct?"linear-gradient(90deg,"+C.badD+","+C.bad+")":"linear-gradient(90deg,"+C.accD+","+C.acc+")",color:C.bg,fontSize:13,fontWeight:700,cursor:"pointer",letterSpacing:1,fontFamily:FONT,boxShadow:isAct?GLOW_BAD:GLOW_STYLE,flexShrink:0,whiteSpace:"nowrap"}}>
                            {isAct?"◄ RETREAT":"DIVE IN ►"}
                          </div>
                        )}
                        {lk&&<span style={{fontSize:13,color:C.bad,fontFamily:FONT,flexShrink:0,padding:"6px 14px",borderRadius:8,background:C.bad+"15",border:"1px solid "+C.bad+"40"}}>🔒 LV {zone.lv}</span>}
                      </div>
                      {/* Creature icons */}
                      <div style={{display:"flex",gap:6,flexWrap:"wrap",alignItems:"center",marginBottom:6}}>
                        {zone.mobs.map((m,i)=>(
                          <span key={i} title={m.n+" — HP:"+m.hp+" ATK:"+m.atk} style={{fontSize:22,cursor:"default",filter:"drop-shadow(0 0 3px #00d4ff22)"}}>{m.i||"👾"}</span>
                        ))}
                        <span style={{fontSize:11,color:C.td,margin:"0 4px"}}>·</span>
                        {(zone.elites||[]).map((m,i)=>(
                          <span key={i} title={"💠 ELITE: "+m.n+" HP:"+m.hp} style={{fontSize:22,cursor:"default",filter:"drop-shadow(0 0 6px "+C.purp+")"}}>{m.i||"⚡"}</span>
                        ))}
                        <span style={{fontSize:11,color:C.td,margin:"0 4px"}}>· bosses:</span>
                        <span title={"👑 "+zone.boss.n} style={{fontSize:22,filter:"drop-shadow(0 0 6px "+C.bad+")"}}>{zone.boss.i||"💀"}</span>
                        <span title={"⚜️ "+zone.boss2.n} style={{fontSize:22,filter:"drop-shadow(0 0 8px "+C.gold+")"}}>{zone.boss2.i||"👑"}</span>
                      </div>
                      <div style={{fontSize:11,color:C.td,fontFamily:FONT_BODY}}>
                        {zone.mobs.map(m=>m.n).slice(0,5).join(" · ")}{zone.mobs.length>5?" · …":""}
                      </div>
                    </div>
                  );
                })}

                {/* Combat log */}
                {clog.length>0&&(
                  <div style={{marginTop:8,padding:"16px 20px",borderRadius:10,background:C.card,border:"1px solid "+C.border}}>
                    <div style={{fontSize:11,fontWeight:700,color:C.ts,marginBottom:10,letterSpacing:2}}>COMBAT LOG</div>
                    {clog.slice(-12).reverse().map((l,i)=>(
                      <div key={i} style={{fontSize:12,color:C.ts,padding:"3px 0",borderBottom:"1px solid "+C.bg,opacity:1-i*0.07,fontFamily:FONT_BODY}}>{l}</div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* EQUIPMENT PAGE */}
            {page==="equipment"&&(
              <div style={{}}>
                <div style={{fontSize:14,fontWeight:700,color:C.white,marginBottom:16,letterSpacing:2}}>EQUIPMENT LOADOUT</div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                  {ESLOTS.map(slot=>{const iid=eq[slot.id];const it=iid?ITEMS[iid]:null;const el=iid?(enh[iid]||0):0;return(
                    <div key={slot.id} style={{padding:"12px 14px",borderRadius:8,background:C.card,border:"1px solid "+(it?C.acc+"40":C.border),boxShadow:it?GLOW_STYLE:"none"}}>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}><span style={{fontSize:10,color:C.ts,fontFamily:FONT_BODY}}>{slot.i} {slot.n}</span>{it&&<span onClick={()=>unequipIt(slot.id)} style={{fontSize:9,color:C.bad,cursor:"pointer",fontFamily:FONT,letterSpacing:1}}>REMOVE</span>}</div>
                      {it?(<div><div style={{fontSize:12,fontWeight:700,color:C.white,fontFamily:FONT}}>{it.i} {it.n}{el>0?" +"+el:""}</div>{it.st&&<div style={{fontSize:10,color:C.ts,marginTop:3,fontFamily:FONT_BODY}}>{Object.entries(it.st).map(e=>e[0].toUpperCase()+": +"+Math.floor(e[1]*(1+el*0.08))).join(" · ")}</div>}</div>):(<div style={{fontSize:11,color:C.td,fontFamily:FONT_BODY}}>— Empty Slot —</div>)}
                    </div>
                  );})}
                </div>
              </div>
            )}

            {/* ENHANCING PAGE */}
            {page==="enhancing"&&(
              <div style={{}}>
                <div style={{fontSize:14,fontWeight:700,color:C.white,marginBottom:4,letterSpacing:2}}>EQUIPMENT UPGRADE LAB</div>
                <div style={{fontSize:11,color:C.ts,marginBottom:4,fontFamily:FONT_BODY}}>Level {sl("enhancing").lv} — {fmt(sl("enhancing").xp)} / {fmt(sl("enhancing").need)} XP</div>
                <div style={{height:6,borderRadius:3,background:C.card,overflow:"hidden",marginBottom:16}}><div style={{width:(sl("enhancing").xp/sl("enhancing").need)*100+"%",height:"100%",borderRadius:3,background:C.warn,boxShadow:"0 0 6px "+C.warn}}/></div>
                <div style={{fontSize:10,color:C.ts,marginBottom:16,fontFamily:FONT_BODY}}>Upgrade equipment stats. Failed attempts reset to +0!</div>
                {ESLOTS.map(slot=>{const iid=eq[slot.id];if(!iid)return null;const it=ITEMS[iid];const cl=enh[iid]||0;const cost=Math.floor(50*Math.pow(1.5,cl));const rate=Math.max(20,Math.floor((0.8-cl*0.05)*100));return(
                  <div key={slot.id} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"12px 16px",borderRadius:8,background:C.card,border:"1px solid "+C.border,marginBottom:8}}>
                    <div><div style={{fontSize:12,fontWeight:700,color:C.white,fontFamily:FONT}}>{it.i} {it.n} +{cl}</div><div style={{fontSize:10,color:C.ts,marginTop:2,fontFamily:FONT_BODY}}>Success: {rate}% · Cost: ◈{fmt(cost)}</div></div>
                    <div onClick={()=>doEnh(slot.id)} style={{padding:"7px 18px",borderRadius:6,background:gold>=cost&&cl<20?"linear-gradient(90deg,"+C.warn+"cc,"+C.gold+")":C.card,color:gold>=cost&&cl<20?C.bg:C.td,fontSize:10,fontWeight:700,cursor:gold>=cost&&cl<20?"pointer":"default",opacity:gold>=cost&&cl<20?1:0.4,letterSpacing:1,fontFamily:FONT,boxShadow:gold>=cost&&cl<20?"0 0 8px "+C.gold+"55":"none"}}>UPGRADE</div>
                  </div>
                );}).filter(Boolean)}
                {!Object.values(eq).some(Boolean)&&<div style={{fontSize:12,color:C.td,padding:20,textAlign:"center",fontFamily:FONT_BODY}}>Equip items first to upgrade them</div>}
              </div>
            )}

            {/* INVENTORY PAGE */}
            {page==="inventory"&&(
              <div style={{maxWidth:760}}>
                <div style={{fontSize:14,fontWeight:700,color:C.white,marginBottom:16,letterSpacing:2}}>CARGO HOLD</div>
                {Object.entries(inv).length===0&&<div style={{fontSize:12,color:C.td,fontFamily:FONT_BODY}}>Cargo hold is empty. Begin gathering operations!</div>}

                {/* Rare items section */}
                {Object.entries(inv).some(([id])=>ITEMS[id]&&ITEMS[id].rare)&&(
                  <div style={{marginBottom:16}}>
                    <div style={{fontSize:11,fontWeight:700,color:C.gold,letterSpacing:2,marginBottom:8}}>✨ RARE MATERIALS</div>
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:6}}>
                      {Object.entries(inv).filter(([id])=>ITEMS[id]&&ITEMS[id].rare).map(([id,qty])=>{const it=ITEMS[id];return(
                        <div key={id} style={{padding:"10px 12px",borderRadius:8,background:"linear-gradient(135deg,"+C.gold+"18,"+C.card+")",border:"2px solid "+C.gold+"50",boxShadow:"0 0 10px "+C.gold+"25",textAlign:"center"}}>
                          <div style={{fontSize:20,marginBottom:4,filter:"drop-shadow(0 0 6px "+C.gold+")"}}>{it.i}</div>
                          <div style={{fontSize:9,fontWeight:700,color:C.gold,fontFamily:FONT,letterSpacing:0.5}}>{it.n}</div>
                          <div style={{fontSize:11,color:C.text,fontWeight:700,fontFamily:FONT,marginTop:2}}>×{qty}</div>
                        </div>
                      );})}
                    </div>
                  </div>
                )}

                {/* Equipment section */}
                {Object.entries(inv).some(([id])=>ITEMS[id]&&ITEMS[id].eq)&&(
                  <div style={{marginBottom:16}}>
                    <div style={{fontSize:11,fontWeight:700,color:C.acc,letterSpacing:2,marginBottom:8}}>🗡️ EQUIPMENT</div>
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:6}}>
                      {Object.entries(inv).filter(([id])=>ITEMS[id]&&ITEMS[id].eq).map(([id,qty])=>{const it=ITEMS[id];return(
                        <div key={id} style={{padding:"10px 12px",borderRadius:6,background:C.card,border:"1px solid "+C.acc+"30",boxShadow:GLOW_STYLE}}>
                          <div style={{fontSize:12,fontWeight:700,color:C.white,fontFamily:FONT}}>{it.i} {it.n}</div>
                          <div style={{fontSize:9,color:C.ts,fontFamily:FONT_BODY,marginTop:2}}>×{qty}</div>
                          {it.st&&<div style={{fontSize:9,color:C.td,marginTop:2,fontFamily:FONT_BODY}}>{Object.entries(it.st).map(([k,v])=>k+"+"+v).join(" ")}</div>}
                          <div onClick={()=>equipIt(id)} style={{marginTop:6,padding:"4px 0",borderRadius:4,background:"linear-gradient(90deg,"+C.accD+","+C.acc+")",color:C.bg,fontSize:9,fontWeight:700,cursor:"pointer",textAlign:"center",letterSpacing:1,fontFamily:FONT}}>EQUIP</div>
                        </div>
                      );})}
                    </div>
                  </div>
                )}

                {/* Consumables */}
                {Object.entries(inv).some(([id])=>ITEMS[id]&&ITEMS[id].food)&&(
                  <div style={{marginBottom:16}}>
                    <div style={{fontSize:11,fontWeight:700,color:C.ok,letterSpacing:2,marginBottom:8}}>💉 CONSUMABLES</div>
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:6}}>
                      {Object.entries(inv).filter(([id])=>ITEMS[id]&&ITEMS[id].food).map(([id,qty])=>{const it=ITEMS[id];return(
                        <div key={id} style={{padding:"10px 12px",borderRadius:6,background:C.card,border:"1px solid "+C.ok+"30"}}>
                          <div style={{fontSize:12,fontWeight:700,color:C.white,fontFamily:FONT}}>{it.i} {it.n}</div>
                          <div style={{fontSize:9,color:C.ok,fontFamily:FONT_BODY,marginTop:2}}>×{qty} · Heals {it.heal} HP</div>
                        </div>
                      );})}
                    </div>
                  </div>
                )}

                {/* Materials */}
                <div>
                  <div style={{fontSize:11,fontWeight:700,color:C.ts,letterSpacing:2,marginBottom:8}}>🪨 MATERIALS</div>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:6}}>
                    {Object.entries(inv).filter(([id,qty])=>ITEMS[id]&&ITEMS[id].s&&!ITEMS[id].rare&&!ITEMS[id].eq&&!ITEMS[id].food&&qty>0).map(([id,qty])=>{const it=ITEMS[id];return(
                      <div key={id} style={{padding:"8px 12px",borderRadius:6,background:C.card,border:"1px solid "+C.border,display:"flex",alignItems:"center",gap:8}}>
                        <span style={{fontSize:14}}>{it.i}</span>
                        <div style={{flex:1}}>
                          <div style={{fontSize:10,color:C.text,fontFamily:FONT_BODY}}>{it.n}</div>
                          <div style={{fontSize:10,fontWeight:700,color:C.acc,fontFamily:FONT}}>×{fmt(qty)}</div>
                        </div>
                      </div>
                    );})}
                  </div>
                </div>
              </div>
            )}

          </div>
        </div>

        {/* RIGHT PANEL — MWI style: tabs + filter + icon grid */}
        <div style={{width:300,flexShrink:0,display:"flex",flexDirection:"column",background:C.panel,borderLeft:"1px solid "+C.border,overflow:"hidden"}}>

          {/* Tab bar — Inventory | Equipment | Stats | Loadout */}
          <div style={{display:"flex",flexShrink:0,background:C.bg,borderBottom:"1px solid "+C.border}}>
            {[
              {id:"inventory", label:"Inventory"},
              {id:"equipment", label:"Equipment"},
              {id:"stats",     label:"Stats"},
              {id:"loadout",   label:"Loadout"},
            ].map(t=>(
              <div key={t.id} onClick={()=>setRightTab(t.id)} style={{flex:1,padding:"10px 4px",textAlign:"center",fontSize:13,fontWeight:700,fontFamily:FONT_BODY,color:rightTab===t.id?C.white:C.td,background:rightTab===t.id?"linear-gradient(180deg,"+C.panel+","+C.card+")":C.bg,borderBottom:rightTab===t.id?"3px solid "+C.acc:"3px solid transparent",cursor:"pointer",transition:"all 0.15s",whiteSpace:"nowrap"}}>
                {t.label}
              </div>
            ))}
          </div>

          {/* Filter row — only on inventory */}
          {rightTab==="inventory"&&(
            <div style={{padding:"6px 8px",borderBottom:"1px solid "+C.border,flexShrink:0,background:C.bg}}>
              <input
                value={invFilter} onChange={e=>setInvFilter(e.target.value)}
                placeholder="Item Filter"
                style={{width:"100%",padding:"5px 10px",borderRadius:4,background:C.card,border:"1px solid "+C.border,color:C.white,fontSize:12,fontFamily:FONT_BODY,outline:"none",boxSizing:"border-box"}}
              />
            </div>
          )}

          {/* Scrollable content */}
          <div style={{flex:1,overflowY:"auto",padding:"8px"}}>

            {/* ── INVENTORY TAB ── */}
            {rightTab==="inventory"&&(()=>{
              const q=invFilter.toLowerCase();
              const allItems=Object.entries(inv).filter(([id,qty])=>qty>0&&ITEMS[id]&&(!q||ITEMS[id].n.toLowerCase().includes(q)));
              const cats=[
                {label:"Currencies",  items:allItems.filter(([id])=>ITEMS[id].type==="currency"||id==="gold")},
                {label:"Equipment",   items:allItems.filter(([id])=>ITEMS[id].eq)},
                {label:"Food",        items:allItems.filter(([id])=>ITEMS[id].food)},
                {label:"Rare Mats",   items:allItems.filter(([id])=>ITEMS[id].rarity==="rare"||ITEMS[id].rarity==="uncommon")},
                {label:"Resources",   items:allItems.filter(([id])=>{const it=ITEMS[id];return it.s&&!it.eq&&!it.food&&!it.rarity&&it.type!=="currency"&&id!=="gold";})},
              ];
              // Add gold manually to currencies
              const goldEntry=[["gold",gold]];
              return(
                <div>
                  {/* Always show gold + research at top */}
                  <div style={{marginBottom:8}}>
                    <div style={{fontSize:11,fontWeight:700,color:C.td,letterSpacing:1,marginBottom:5,textTransform:"uppercase"}}>Currencies</div>
                    <div style={{display:"flex",flexWrap:"wrap",gap:3}}>
                      {[
                        {id:"◈",  icon:"◈",  n:"Credits",  qty:gold,   c:C.gold},
                        {id:"🔬", icon:"🔬", n:"Research",  qty:researchPts, c:C.acc},
                        {id:"⚡", icon:"⚡", n:"Energy",    qty:energy, c:C.ok},
                      ].map(s=>(
                        <div key={s.id} title={s.n+" ×"+fmt(s.qty)} style={{width:52,height:52,borderRadius:6,background:C.card,border:"1px solid "+C.border,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:1}}>
                          <span style={{fontSize:20}}>{s.icon}</span>
                          <span style={{fontSize:10,color:s.c,fontWeight:700,fontFamily:FONT}}>{s.qty>=1e6?(s.qty/1e6).toFixed(1)+"M":s.qty>=1000?Math.floor(s.qty/1000)+"k":Math.floor(s.qty)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  {cats.map(cat=>{
                    if(!cat.items.length)return null;
                    return(
                      <div key={cat.label} style={{marginBottom:10}}>
                        <div style={{fontSize:11,fontWeight:700,color:C.td,letterSpacing:1,marginBottom:5,textTransform:"uppercase"}}>{cat.label}</div>
                        <div style={{display:"flex",flexWrap:"wrap",gap:3}}>
                          {cat.items.map(([id,qty])=>{
                            const it=ITEMS[id];
                            const rareColor=it.rarity==="rare"?C.gold:it.rarity==="uncommon"?C.purp:null;
                            return(
                              <div key={id} title={it.n+" ×"+fmt(qty)} style={{position:"relative",width:52,height:52,borderRadius:6,background:rareColor?rareColor+"18":C.card,border:"1px solid "+(rareColor?rareColor+"50":C.border),display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:1,flexShrink:0,overflow:"hidden"}}>
                                <span style={{fontSize:22,lineHeight:1}}>{it.i||"📦"}</span>
                                <span style={{fontSize:10,color:rareColor||C.ts,fontWeight:700,fontFamily:FONT}}>{qty>=1e6?(qty/1e6).toFixed(1)+"M":qty>=1000?Math.floor(qty/1000)+"k":qty}</span>
                                {rareColor&&<div style={{position:"absolute",top:0,left:0,right:0,height:2,background:rareColor}}/>}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                  {allItems.length===0&&<div style={{fontSize:12,color:C.td,fontFamily:FONT_BODY,padding:"16px 0",textAlign:"center"}}>Cargo hold empty</div>}
                </div>
              );
            })()}

            {/* ── EQUIPMENT TAB ── */}
            {rightTab==="equipment"&&(
              <div>
                <div style={{fontSize:11,fontWeight:700,color:C.td,letterSpacing:1,marginBottom:8,textTransform:"uppercase"}}>Equipped</div>
                {ESLOTS.map(slot=>{
                  const iid=eq[slot.id];const it=iid?ITEMS[iid]:null;const el=iid?(enh[iid]||0):0;
                  return(
                    <div key={slot.id} onClick={()=>it&&setPage("equipment")} style={{display:"flex",alignItems:"center",gap:10,padding:"7px 8px",borderRadius:8,background:it?"linear-gradient(90deg,"+C.acc+"10,"+C.card+")":C.card,border:"1px solid "+(it?C.acc+"40":C.border),marginBottom:6,cursor:it?"pointer":"default"}}>
                      <div style={{width:40,height:40,borderRadius:6,background:C.bg,border:"1px solid "+C.border,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,flexShrink:0}}>
                        {it?it.i:slot.i}
                      </div>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{fontSize:11,color:C.td,fontFamily:FONT_BODY,marginBottom:2}}>{slot.n}</div>
                        {it
                          ?<div style={{fontSize:12,color:C.white,fontWeight:600,fontFamily:FONT_BODY}}>{it.n}{el>0&&<span style={{color:C.gold}}> +{el}</span>}</div>
                          :<div style={{fontSize:12,color:C.td,fontFamily:FONT_BODY}}>— empty —</div>
                        }
                        {it?.st&&<div style={{fontSize:10,color:C.ts,fontFamily:FONT_BODY}}>{Object.entries(it.st).map(([k,v])=>k.toUpperCase()+":+"+Math.floor(v*(1+el*0.08))).join(" ")}</div>}
                      </div>
                    </div>
                  );
                })}
                {discoveryLog.length>0&&(
                  <div style={{marginTop:12}}>
                    <div style={{fontSize:11,fontWeight:700,color:C.gold,letterSpacing:1,marginBottom:6,textTransform:"uppercase"}}>Recent Finds</div>
                    {discoveryLog.slice(-5).reverse().map((l,i)=>(
                      <div key={i} style={{fontSize:12,color:C.ts,padding:"3px 0",borderBottom:"1px solid "+C.bg,opacity:1-i*0.15,fontFamily:FONT_BODY}}>{l}</div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ── STATS TAB ── */}
            {rightTab==="stats"&&(
              <div>
                <div style={{fontSize:11,fontWeight:700,color:C.td,letterSpacing:1,marginBottom:8,textTransform:"uppercase"}}>Combat Systems</div>
                {[
                  {l:"Hull HP",    v:pStats.hp,  c:C.ok,   i:"❤️"},
                  {l:"Attack",     v:pStats.atk, c:C.bad,  i:"⚔️"},
                  {l:"Defense",    v:pStats.def, c:C.acc,  i:"🛡️"},
                  {l:"Sonic",      v:pStats.rng, c:C.okD,  i:"🔊"},
                  {l:"Leviathan",  v:pStats.mag, c:C.purp, i:"🌀"},
                ].map(s=>(
                  <div key={s.l} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"6px 8px",borderRadius:6,background:C.card,border:"1px solid "+C.border,marginBottom:4}}>
                    <span style={{fontSize:12,color:C.ts,fontFamily:FONT_BODY}}>{s.i} {s.l}</span>
                    <span style={{fontSize:13,color:s.c,fontWeight:700,fontFamily:FONT}}>{s.v}</span>
                  </div>
                ))}
                {Object.values(drones).some(Boolean)&&(
                  <div style={{marginTop:12}}>
                    <div style={{fontSize:11,fontWeight:700,color:C.td,letterSpacing:1,marginBottom:6,textTransform:"uppercase"}}>Drones Active</div>
                    {DRONE_TYPES.filter(dt=>drones[dt.id]>0).map(dt=>(
                      <div key={dt.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"5px 8px",borderRadius:6,background:C.card,marginBottom:3}}>
                        <span style={{fontSize:12,color:C.ts,fontFamily:FONT_BODY}}>{dt.icon} {dt.name}</span>
                        <span style={{fontSize:12,color:C.acc,fontWeight:700,fontFamily:FONT}}>×{drones[dt.id]}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ── LOADOUT TAB ── */}
            {rightTab==="loadout"&&(
              <div>
                {/* Active task */}
                <div style={{marginBottom:12,padding:"10px",borderRadius:8,background:C.card,border:"1px solid "+C.border}}>
                  <div style={{fontSize:11,fontWeight:700,color:C.acc,letterSpacing:1,marginBottom:6,textTransform:"uppercase"}}>Active</div>
                  {(()=>{
                    if(curAct){
                      const sk=SKILLS.find(s=>s.id===curAct.sk);
                      const act=sk?.acts.find(a=>a.id===curAct.act);
                      return(
                        <div>
                          <div style={{display:"flex",justifyContent:"space-between",marginBottom:5}}>
                            <span style={{fontSize:12,color:C.white,fontFamily:FONT_BODY,fontWeight:600}}>{sk?.icon} {sk?.name} — {act?.name}</span>
                          </div>
                          <div style={{height:4,borderRadius:2,background:C.bg,overflow:"hidden"}}>
                            <div style={{width:actProg*100+"%",height:"100%",background:"linear-gradient(90deg,"+C.accD+","+C.acc+")",borderRadius:2,transition:"width 0.1s linear"}}/>
                          </div>
                        </div>
                      );
                    }
                    if(zoneId&&cbt?.mob){
                      const zone=ZONES.find(z=>z.id===zoneId);
                      const mob=cbt.mob;
                      return(
                        <div>
                          <div style={{display:"flex",justifyContent:"space-between",marginBottom:5}}>
                            <span style={{fontSize:12,color:C.bad,fontFamily:FONT_BODY,fontWeight:600}}>{mob.i} {mob.n}</span>
                            <span style={{fontSize:12,color:C.ts}}>{zone?.name}</span>
                          </div>
                          <div style={{display:"flex",gap:6}}>
                            <div style={{flex:1}}>
                              <div style={{fontSize:11,color:C.td,marginBottom:2}}>You</div>
                              <div style={{height:4,borderRadius:2,background:C.bg,overflow:"hidden"}}><div style={{width:(cbt.php/cbt.mxhp)*100+"%",height:"100%",background:C.ok,borderRadius:2}}/></div>
                            </div>
                            <div style={{flex:1}}>
                              <div style={{fontSize:11,color:C.td,marginBottom:2}}>{mob.n}</div>
                              <div style={{height:4,borderRadius:2,background:C.bg,overflow:"hidden"}}><div style={{width:Math.max(0,(cbt.mhp/mob.hp)*100)+"%",height:"100%",background:C.bad,borderRadius:2}}/></div>
                            </div>
                          </div>
                        </div>
                      );
                    }
                    return <div style={{fontSize:12,color:C.td,fontFamily:FONT_BODY}}>— idle —</div>;
                  })()}
                </div>
                {/* Equipment slots compact list */}
                <div style={{fontSize:11,fontWeight:700,color:C.td,letterSpacing:1,marginBottom:6,textTransform:"uppercase"}}>Loadout</div>
                {ESLOTS.map(slot=>{
                  const iid=eq[slot.id];const it=iid?ITEMS[iid]:null;const el=iid?(enh[iid]||0):0;
                  return(
                    <div key={slot.id} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"4px 0",borderBottom:"1px solid "+C.bg}}>
                      <span style={{fontSize:12,color:C.td,fontFamily:FONT_BODY,flexShrink:0,width:76}}>{slot.i} {slot.n}</span>
                      <span style={{fontSize:12,color:it?C.white:C.td,fontWeight:it?600:400,fontFamily:FONT_BODY,textAlign:"right",minWidth:0,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                        {it?(it.i+" "+it.n+(el>0?" +"+el:"")):"—"}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}

          </div>
        </div>

        </div>{/* end middle row */}

        {/* ===== BOTTOM CHAT BAR ===== */}
        {(()=>{
          const CHAT_TABS=[{id:"global",label:"General"},{id:"clan",label:"Guild"},{id:"dm",label:"Whisper"}];
          const CHAT_H=chatOpen?200:36;
          return(
          <div style={{flexShrink:0,height:CHAT_H,display:"flex",flexDirection:"column",background:C.panel,borderTop:"1px solid "+C.border,transition:"height 0.2s ease",overflow:"hidden"}}>
            {/* Tab bar */}
            <div style={{display:"flex",alignItems:"center",height:36,flexShrink:0,background:C.bg,paddingLeft:navCollapsed?52:210,paddingRight:8}}>
              {CHAT_TABS.map(t=>(
                <div key={t.id} onClick={()=>{setChatTab(t.id);if(!chatOpen)setChatOpen(true);}} style={{padding:"0 16px",fontSize:12,fontWeight:600,fontFamily:FONT_BODY,color:chatTab===t.id?C.white:C.td,borderBottom:chatTab===t.id?"2px solid "+C.acc:"2px solid transparent",cursor:"pointer",height:36,display:"flex",alignItems:"center",transition:"color 0.15s",background:"transparent"}}>
                  {t.label}
                  {t.id==="clan"&&clan&&<span style={{marginLeft:5,fontSize:10,color:C.gold}}>[{clan.tag}]</span>}
                  {t.id==="dm"&&dmTarget&&<span style={{marginLeft:5,fontSize:11,color:C.ts}}>→ {dmTarget.name}</span>}
                </div>
              ))}
              <div style={{marginLeft:"auto",fontSize:12,color:C.td,cursor:"pointer",padding:"0 10px",fontFamily:FONT_BODY,userSelect:"none",height:36,display:"flex",alignItems:"center"}} onClick={()=>setChatOpen(p=>!p)}>
                {chatOpen?"▼":"▲"}
              </div>
            </div>
            {/* Messages + input */}
            {chatOpen&&(
              <div style={{flex:1,display:"flex",minHeight:0,paddingLeft:navCollapsed?52:210}}>
                <div style={{flex:1,overflowY:"auto",padding:"4px 14px",display:"flex",flexDirection:"column",gap:2}}>
                  {(chatTab==="global"?chatMessages:chatTab==="clan"?clanChat:dmMessages).map((m,i)=>{
                    const mine=m.uid===account.uid;
                    const name=mine?"You":(chatTab==="dm"?dmTarget?.name:m.name)||"?";
                    const color=chatTab==="clan"?C.gold:mine?C.acc:C.ts;
                    return(
                      <div key={m.id||i} style={{display:"flex",gap:6,alignItems:"baseline"}}>
                        <span style={{fontSize:11,color:C.td,flexShrink:0,fontFamily:FONT_BODY}}>{new Date(m.ts||Date.now()).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"})}</span>
                        <span style={{fontSize:12,color:color,fontWeight:700,flexShrink:0,fontFamily:FONT_BODY}}>{name}:</span>
                        <span style={{fontSize:12,color:C.white,fontFamily:FONT_BODY,lineHeight:1.4,wordBreak:"break-word"}}>{m.text}</span>
                      </div>
                    );
                  })}
                  {chatTab==="clan"&&!clan&&<div style={{fontSize:12,color:C.td,fontFamily:FONT_BODY,padding:"8px 0"}}>Not in a clan — join one from Social.</div>}
                  {chatTab==="dm"&&!dmTarget&&<div style={{fontSize:12,color:C.td,fontFamily:FONT_BODY,padding:"8px 0"}}>No DM open — click DM on a friend in Social.</div>}
                  <div ref={chatEndRef}/>
                </div>
                {/* Input */}
                <div style={{flexShrink:0,width:260,padding:"8px 10px",borderLeft:"1px solid "+C.border,display:"flex",gap:6,alignItems:"center"}}>
                  <input
                    value={chatTab==="global"?chatInput:chatTab==="clan"?clanChatInput:dmInput}
                    onChange={e=>{if(chatTab==="global")setChatInput(e.target.value);else if(chatTab==="clan")setClanChatInput(e.target.value);else setDmInput(e.target.value);}}
                    onKeyDown={e=>{if(e.key!=="Enter")return;if(chatTab==="global")sendChat();else if(chatTab==="clan")sendClanChat();else sendDm();}}
                    placeholder="Enter message..."
                    style={{flex:1,padding:"6px 10px",borderRadius:4,background:C.bg,border:"1px solid "+C.border,color:C.white,fontSize:12,fontFamily:FONT_BODY,outline:"none"}}
                  />
                  <div onClick={()=>{if(chatTab==="global")sendChat();else if(chatTab==="clan")sendClanChat();else sendDm();}} style={{padding:"6px 14px",borderRadius:4,background:C.acc,color:C.bg,fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:FONT_BODY,flexShrink:0}}>
                    Send
                  </div>
                </div>
              </div>
            )}
          </div>
          );
        })()}

      </div>{/* end BODY column */}

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&family=Inter:wght@400;500;600&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}body{background:${C.bg};overflow:hidden}
        ::-webkit-scrollbar{width:4px}::-webkit-scrollbar-track{background:transparent}
        ::-webkit-scrollbar-thumb{background:${C.border};border-radius:3px}
        ::-webkit-scrollbar-thumb:hover{background:${C.td}}
        ::selection{background:${C.acc}40}
        input::placeholder{color:${C.td}}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.6}}
        @keyframes slideIn{from{transform:scale(0.85);opacity:0}to{transform:scale(1);opacity:1}}
        @keyframes floatUp{0%{transform:translateY(0) scale(1);opacity:0.7}100%{transform:translateY(-100vh) scale(0.4);opacity:0}}
        @keyframes glow{0%,100%{box-shadow:0 0 6px ${C.acc}40}50%{box-shadow:0 0 18px ${C.acc}80}}
        @keyframes shimmer{0%{background-position:200% center}100%{background-position:-200% center}}
        .particle{position:fixed;bottom:-20px;border-radius:50%;pointer-events:none;animation:floatUp linear infinite}
      `}</style>

      {/* Bioluminescent particles */}
      {[...Array(14)].map((_,i)=>{
        const size=4+Math.random()*8|0;
        const left=Math.random()*100;
        const dur=8+Math.random()*12;
        const delay=Math.random()*15;
        const colors=[C.acc,C.ok,"#7b61ff","#00ffb3","#38bdf8"];
        const col=colors[i%colors.length];
        return(
          <div key={i} className="particle" style={{
            width:size,height:size,left:left+"%",
            background:col,boxShadow:"0 0 "+(size*2)+"px "+col,
            animationDuration:dur+"s",animationDelay:delay+"s",
            opacity:0.5+Math.random()*0.3,
          }}/>
        );
      })}
    </div>
  );
}

export default function App(){
  const[user,setUser]=useState(null);
  const[loading,setLoading]=useState(true);
  useEffect(()=>{const unsub=onAuthStateChanged(auth,(u)=>{setUser(u);setLoading(false)});return unsub},[]);
  if(loading)return(<div style={{width:"100%",height:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:C.bg,color:C.acc,fontFamily:FONT,letterSpacing:4,fontSize:13}}>INITIALIZING...</div>);
  if(!user)return <AuthScreen onLogin={setUser}/>;
  return <GameUI account={user} onLogout={()=>signOut(auth)}/>;
}
