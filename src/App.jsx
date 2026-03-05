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
const FONT_BODY = FONT;

const SKILL_IMAGES={
  kelp_farming: "/images/skills/kelp_farming.png",
};


// Cross-platform tap: instant on touch, normal onClick on mouse
const tap=(fn)=>({
  onPointerDown:(e)=>{if(e.pointerType==="touch"){e.preventDefault();fn(e);}},
  onClick:(e)=>{if(e.pointerType!=="touch"&&e.detail>0)fn(e);},
});

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
  if(lv>=MAX_SKILL_LV)return Infinity;
  return Math.max(50,Math.floor(50*Math.pow(1.09,lv-1)));
}
function fmt(n){if(n>=1e9)return(n/1e9).toFixed(1)+"B";if(n>=1e6)return(n/1e6).toFixed(1)+"M";if(n>=1e3)return(n/1e3).toFixed(1)+"K";return String(Math.floor(n))}

// ===================== RESEARCH TREE =====================
const RESEARCH_TREE = {
  agriculture: [
    {id:"ag1",name:"Kelp Growth I",    icon:"🌿",tier:1,cost:50,  prereqs:[],      desc:"Kelp yield +25%",          effect:{cultiv_yield:0.25}},
    {id:"ag2",name:"Ocean Fertilizers",icon:"💧",tier:2,cost:120, prereqs:["ag1"], desc:"All gather yield +15%",     effect:{gather_yield:0.15}},
    {id:"ag3",name:"Kelp Growth II",   icon:"🌾",tier:3,cost:250, prereqs:["ag2"], desc:"Kelp yield +50% total",     effect:{cultiv_yield:0.25}},
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
    {id:"cb2",name:"Drone Combat Sys.", icon:"🤖",tier:2,cost:180,prereqs:["cb1"], desc:"Combat XP +25%",effect:{combat_xp:0.25}},
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
    cost: { gold: 350, kelp: 80, trench_stone: 20 },
    maxLevel: 5,
    levelCost: (lv) => ({ gold: Math.floor(250 * Math.pow(2, lv)), kelp: lv * 20, reinforced_alloy: lv * 2 }),
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
    outputs: [{ id: "kelp", q: 2 }, { id: "sea_mushrooms", q: 1 }],
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
    outputs: [{ id: "glowfish", q: 2 }, { id: "ocean_fiber", q: 1 }],
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
    xpSkill: "fabrication",
    xpAmt: 8,
  },
];

// ===================== BLUEPRINT DROPS =====================
// Rare blueprint drops while gathering — no item/XP bonuses, just blueprint unlocks
const BP_DROPS = [
  { id:"drop_wreck",   pool:["bp_void_kelp","bp_leviathan_scale"] },
  { id:"drop_lab",     pool:["bp_void_crystal","bp_ancient_brew"] },
  { id:"drop_beacon",  rarity:0.002, pool:["bp_thermal_forge","bp_void_reactor"] },
  { id:"drop_vein",    rarity:0.003, pool:["bp_ancient_armor"] },
];



// ===================== BLUEPRINTS =====================
// Hidden skill actions unlocked rarely while gathering.
// Each blueprint adds an extra act to an existing skill once unlocked.
const BLUEPRINTS = [
  {
    id:"bp_void_kelp", skillId:"kelp_farming", icon:"🌀", rarity:"rare",
    name:"Void Kelp Cultivation",
    desc:"Ancient technique for cultivating void-infused kelp. Massive yield.",
    act:{id:"bp_kf5",name:"Void Kelp Grove",lv:80,xp:170,t:24,out:[{id:"kelp",q:12},{id:"void_essence",q:1}]},
    source:"Ancient Submarine Wreck",
  },
  {
    id:"bp_leviathan_scale", skillId:"bioluminescent_fishing", icon:"🐉", rarity:"rare",
    name:"Leviathan Scale Harvest",
    desc:"Carefully extract scales from leviathan remains — potent crafting material.",
    act:{id:"bp_ch5",name:"Leviathan Scale Harvest",lv:90,xp:88,t:11,inp:[{id:"leviathan_bone",q:1}],out:[{id:"reinforced_alloy",q:5},{id:"alien_bio_tissue",q:1}]},
    source:"Ancient Submarine Wreck",
  },
  {
    id:"bp_void_crystal", skillId:"crystal_diving", icon:"💎", rarity:"epic",
    name:"Void Crystal Resonance",
    desc:"Resonate with void crystals to yield pure essence.",
    act:{id:"bp_cd5",name:"Void Crystal Resonance",lv:95,xp:196,t:24,inp:[{id:"abyss_crystal",q:3}],out:[{id:"void_essence",q:2},{id:"abyss_crystal",q:5}]},
    source:"Lost Research Facility",
  },
  {
    id:"bp_ancient_brew", skillId:"bio_lab", icon:"🧬", rarity:"epic",
    name:"Ancient Healing Formula",
    desc:"A powerful healing formula recovered from a lost research facility.",
    act:{id:"bp_bs5",name:"Ancient Healing Formula",lv:70,xp:133,t:26,inp:[{id:"alien_bio_tissue",q:1},{id:"void_pearl",q:1}],out:[{id:"pressure_tonic",q:3},{id:"bio_stim",q:1}]},
    source:"Lost Research Facility",
  },
  {
    id:"bp_thermal_forge", skillId:"relic_forging", icon:"🌋", rarity:"legendary",
    name:"Thermal Core Mastery",
    desc:"Master thermal core forging — double output from thermal processes.",
    act:{id:"bp_rf9",name:"Thermal Core Mastery",lv:85,xp:208,t:60,inp:[{id:"thermal_ore",q:20},{id:"void_essence",q:1}],out:[{id:"thermal_core",q:1}]},
    source:"Deep Signal Beacon",
  },
  {
    id:"bp_void_reactor", skillId:"fabrication", icon:"⚡", rarity:"legendary",
    name:"Void Reactor Blueprint",
    desc:"Harness void energy to produce massive amounts of pressure reactors.",
    act:{id:"bp_es5",name:"Void Reactor Synthesis",lv:100,xp:200,t:60,inp:[{id:"void_essence",q:2},{id:"thermal_core",q:1},{id:"abyss_crystal",q:5}],out:[{id:"pressure_reactor",q:5},{id:"drone_processor",q:1}]},
    source:"Deep Signal Beacon",
  },
  {
    id:"bp_ancient_armor", skillId:"gear_crafting", icon:"👑", rarity:"legendary",
    name:"Ancient Emperor Armor",
    desc:"Blueprints for the ancient emperor's armor — the pinnacle of defense.",
    act:{id:"bp_rf10",gearCat:"combat",name:"Emperor Armor",lv:110,xp:450,t:60,inp:[{id:"ancient_processor",q:3},{id:"void_essence",q:3},{id:"leviathan_bone",q:8},{id:"alien_bio_tissue",q:4}],out:[{id:"leviathan_warplate",q:1},{id:"abyss_crown",q:1}]},
    source:"Crystal Vein Exposed",
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
    body:"While gathering you'll occasionally unlock rare Blueprints — powerful hidden operations that permanently expand what a skill can do. They're rare, so keep gathering!",
    highlight:null,
  },
  {
    title:"You're Ready!",
    icon:"🚀",
    body:"That's everything! Gather → Craft → Research → Build → Fight → Automate. The ocean is yours to conquer. Good luck, Commander!",
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
  {id:"first_bp",     cat:"gather", icon:"📘", name:"Blueprint Found",       desc:"Unlock your first blueprint",             check:(s)=>s.blueprintsFound>=1,        reward:{rp:50,gold:100}},
  {id:"bp5",          cat:"gather", icon:"📚", name:"Scholar",              desc:"Unlock 5 blueprints",                     check:(s)=>s.blueprintsFound>=5,        reward:{rp:200,gold:500}},
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
  // Skill milestones
  {id:"skill50",       cat:"skill",  icon:"⭐", name:"Seasoned Diver",      desc:"Reach level 50 in any skill",             check:(s)=>s.maxSkillLv>=50,            reward:{rp:100,gold:250}},
  {id:"skill100",      cat:"skill",  icon:"🌟", name:"Master of the Deep",  desc:"Reach level 100 in any skill",            check:(s)=>s.maxSkillLv>=100,           reward:{rp:400,gold:1000}},
  {id:"total500",      cat:"skill",  icon:"💫", name:"Legend",              desc:"Reach 500 total skill levels",            check:(s)=>s.totalSkillLv>=500,         reward:{rp:600,gold:2000}},
];

const ACHIEVEMENT_CATS = {
  gather:  {label:"Gathering",  color:"#00ffb3"},
  combat:  {label:"Combat",     color:"#ff006e"},
  prod:    {label:"Production", color:"#ffd60a"},
  tech:    {label:"Technology", color:"#00d4ff"},
  drone:   {label:"Drones",     color:"#7b61ff"},
  skill:   {label:"Skills",     color:"#c084fc"},
};

// ===================== ITEMS =====================
const ITEMS={
  kelp:{n:"Kelp",i:"🌿",s:1,v:4}, soft_coral:{n:"Soft Coral",i:"🪸",s:1,v:12},
  glowfish:{n:"Glowfish",i:"🐟",s:1,v:8}, salt_crystals:{n:"Salt Crystals",i:"🔷",s:1,v:28},
  shell_fragments:{n:"Shell Fragments",i:"🐚",s:1,v:14}, thermal_ore:{n:"Thermal Ore",i:"🔶",s:1,v:55},
  abyss_crystal:{n:"Abyss Crystal",i:"💎",s:1,v:12}, ocean_fiber:{n:"Ocean Fiber",i:"🧵",s:1,v:65},
  sea_fiber:{n:"Sea Fiber",i:"🪢",s:1,v:4},
  stone_powder:{n:"Stone Powder",i:"🟤",s:1,v:3},
  shell_dust:{n:"Shell Dust",i:"🌫️",s:1,v:8},
  fiber_cord:{n:"Fiber Cord",i:"🧶",s:1,v:12},
  scale_weave:{n:"Scale Weave",i:"🪡",s:1,v:18},
  void_thread:{n:"Void Thread",i:"🪡",s:1,v:55},
  scale_plate:{n:"Scale Plate",i:"🦎",s:1,v:22},
  treated_kelp:{n:"Treated Kelp",i:"🌿",s:1,v:28},
  cured_fiber:{n:"Cured Fiber",i:"🪢",s:1,v:45},
  prismatic_weave:{n:"Prismatic Weave",i:"🌈",s:1,v:85},
  void_silk:{n:"Void Silk",i:"🕸️",s:1,v:140},
  crystal_shard:{n:"Crystal Shard",i:"🔷",s:1,v:8},
  quartz_powder:{n:"Quartz Powder",i:"⬜",s:1,v:14},
  refined_salt:{n:"Refined Salt",i:"🧂",s:1,v:22},
  tempered_fiber:{n:"Tempered Fiber",i:"🪢",s:1,v:70},
  armored_weave:{n:"Armored Weave",i:"🛡️",s:1,v:95},
  refined_silt:{n:"Refined Silt",i:"🟫",s:1,v:28},
  ore_flakes:{n:"Ore Flakes",i:"🟠",s:1,v:35},
  void_dust:{n:"Void Dust",i:"🌌",s:1,v:90},
  sea_mushrooms:{n:"Sea Mushrooms",i:"🍄",s:1,v:22}, trench_stone:{n:"Trench Stone",i:"🪨",s:1,v:5},
  coral_bricks:{n:"Coral Bricks",i:"🧱",s:1,v:18},
  coral_blocks:{n:"Coral Blocks",i:"🟦",s:1,v:10}, reinforced_alloy:{n:"Reinforced Alloy",i:"⚙️",s:1,v:45},
  biofuel:{n:"Biofuel",i:"🟩",s:1,v:18}, pressure_glass:{n:"Pressure Glass",i:"🔮",s:1,v:40},
  enzyme_compound:{n:"Enzyme Compound",i:"🧪",s:1,v:55}, luminescent_gel:{n:"Luminescent Gel",i:"✨",s:1,v:42},
  circuit_board:{n:"Circuit Board",i:"🔲",s:1,v:75},
  crystal_capacitor:{n:"Crystal Capacitor",i:"🔷",s:1,v:55},
  drone_processor:{n:"Drone Processor",i:"📡",s:1,v:90},
  thermal_steel:{n:"Thermal Steel",i:"⚙️",s:1,v:65},
  pressure_conduit:{n:"Pressure Conduit",i:"🔌",s:1,v:95},
  pressure_reactor:{n:"Pressure Reactor",i:"⚡",s:1,v:110},
  coral_cutter:{n:"Coral Cutter",i:"🔪",s:1,v:28}, deep_drill:{n:"Deep Drill",i:"🔩",s:1,v:38},
  artifact_scanner:{n:"Artifact Scanner",i:"📟",s:1,v:70},
  tide_sap:{n:"Tide Sap",i:"🟢",s:1,v:45},
  kelp_spores:{n:"Kelp Spores",i:"🌱",s:1,v:80},
  void_kelp:{n:"Void Kelp",i:"🌑",s:1,v:180},
  phosphor_scales:{n:"Phosphor Scales",i:"🐡",s:1,v:20},
  deepsea_roe:{n:"Deepsea Roe",i:"🟡",s:1,v:35},
  void_fin:{n:"Void Fin",i:"🌊",s:1,v:120},
  magma_shard:{n:"Magma Shard",i:"🔴",s:1,v:100},
  obsidian_ore:{n:"Obsidian Ore",i:"⬜",s:1,v:200},
  silt_crystal:{n:"Silt Crystal",i:"🔹",s:1,v:45},
  raw_quartz:{n:"Raw Quartz",i:"🔲",s:1,v:22},
  ether_dust:{n:"Ether Dust",i:"💫",s:1,v:90},
  deep_moss:{n:"Deep Moss",i:"🌾",s:1,v:12},
  sediment_core:{n:"Sediment Core",i:"🗜️",s:1,v:30},
  ancient_fragment:{n:"Ancient Fragment",i:"🧩",s:1,v:65},
  abyss_silt:{n:"Abyss Silt",i:"🔘",s:1,v:110},
  tide_mallet:{n:"Tide Mallet",i:"🔨",eq:"weapon",set:"tidebreaker",st:{atk:10,def:3}},
  tide_helm:{n:"Tide Helm",i:"🪸",eq:"head",set:"tidebreaker",st:{def:8,hp:14}},
  tide_plate:{n:"Tide Plate",i:"🦺",eq:"body",set:"tidebreaker",st:{def:15,hp:28}},
  tide_gauntlets:{n:"Tide Gauntlets",i:"🦾",eq:"hands",set:"tidebreaker",st:{atk:4,def:3}},
  tide_sabatons:{n:"Tide Sabatons",i:"🥾",eq:"feet",set:"tidebreaker",st:{def:4,hp:8}},
  tide_shield:{n:"Tide Shield",i:"🛡️",eq:"shield",set:"tidebreaker",st:{def:10,hp:18}},
  reef_mallet:{n:"Reef Mallet",i:"⚔️",eq:"weapon",set:"tidebreaker",st:{atk:22,def:6}},
  reef_warhelm:{n:"Reef Warhelm",i:"🪸",eq:"head",set:"tidebreaker",st:{def:18,hp:32}},
  reef_warplate:{n:"Reef Warplate",i:"🦺",eq:"body",set:"tidebreaker",st:{def:32,hp:60}},
  reef_warfists:{n:"Reef Warfists",i:"🦾",eq:"hands",set:"tidebreaker",st:{atk:8,def:7}},
  reef_warboots:{n:"Reef Warboots",i:"🥾",eq:"feet",set:"tidebreaker",st:{def:10,hp:18}},
  reef_bulwark:{n:"Reef Bulwark",i:"🛡️",eq:"shield",set:"tidebreaker",st:{def:24,hp:38}},
  abyssal_mallet:{n:"Abyssal Mallet",i:"⚔️",eq:"weapon",set:"tidebreaker",st:{atk:40,def:10}},
  abyssal_warhelm:{n:"Abyssal Warhelm",i:"⛑️",eq:"head",set:"tidebreaker",st:{def:32,hp:58}},
  abyssal_warplate:{n:"Abyssal Warplate",i:"🦺",eq:"body",set:"tidebreaker",st:{def:58,hp:105}},
  abyssal_warfists:{n:"Abyssal Warfists",i:"🦾",eq:"hands",set:"tidebreaker",st:{atk:15,def:12}},
  abyssal_warboots:{n:"Abyssal Warboots",i:"🥾",eq:"feet",set:"tidebreaker",st:{def:18,hp:30}},
  abyssal_bulwark:{n:"Abyssal Bulwark",i:"🛡️",eq:"shield",set:"tidebreaker",st:{def:46,hp:68}},
  leviathan_mallet:{n:"Leviathan Mallet",i:"⚔️",eq:"weapon",set:"tidebreaker",st:{atk:65,def:16}},
  leviathan_warhelm:{n:"Leviathan Warhelm",i:"👑",eq:"head",set:"tidebreaker",st:{def:52,hp:95}},
  leviathan_warplate:{n:"Leviathan Warplate",i:"🦺",eq:"body",set:"tidebreaker",st:{def:90,hp:175}},
  leviathan_warfists:{n:"Leviathan Warfists",i:"🦾",eq:"hands",set:"tidebreaker",st:{atk:24,def:20}},
  leviathan_warboots:{n:"Leviathan Warboots",i:"🥾",eq:"feet",set:"tidebreaker",st:{def:28,hp:50}},
  leviathan_bulwark:{n:"Leviathan Bulwark",i:"🛡️",eq:"shield",set:"tidebreaker",st:{def:74,hp:115}},
  sting_bolt:{n:"Sting Bolt",i:"🎯",eq:"weapon",set:"deepstriker",st:{atk:8,rng:8}},
  strike_cowl:{n:"Strike Cowl",i:"🎣",eq:"head",set:"deepstriker",st:{rng:5,hp:10}},
  strike_vest:{n:"Strike Vest",i:"🧥",eq:"body",set:"deepstriker",st:{rng:10,hp:20}},
  strike_wraps:{n:"Strike Wraps",i:"🧤",eq:"hands",set:"deepstriker",st:{rng:6,atk:2}},
  strike_fins:{n:"Strike Fins",i:"🩴",eq:"feet",set:"deepstriker",st:{rng:4,hp:6}},
  reef_crossbow:{n:"Reef Crossbow",i:"🏹",eq:"weapon",set:"deepstriker",st:{atk:18,rng:18}},
  reef_hood:{n:"Reef Hood",i:"🎣",eq:"head",set:"deepstriker",st:{rng:11,hp:22}},
  reef_leathers:{n:"Reef Leathers",i:"🧥",eq:"body",set:"deepstriker",st:{rng:20,hp:42}},
  reef_bracers:{n:"Reef Bracers",i:"🧤",eq:"hands",set:"deepstriker",st:{rng:13,atk:4}},
  reef_striders:{n:"Reef Striders",i:"🩴",eq:"feet",set:"deepstriker",st:{rng:8,hp:14}},
  void_bow:{n:"Void Bow",i:"🏹",eq:"weapon",set:"deepstriker",st:{atk:32,rng:30}},
  void_cowl:{n:"Void Cowl",i:"🎣",eq:"head",set:"deepstriker",st:{rng:20,hp:38}},
  void_leathers:{n:"Void Leathers",i:"🧥",eq:"body",set:"deepstriker",st:{rng:36,hp:68}},
  void_bracers:{n:"Void Bracers",i:"🧤",eq:"hands",set:"deepstriker",st:{rng:22,atk:7}},
  void_striders:{n:"Void Striders",i:"🩴",eq:"feet",set:"deepstriker",st:{rng:14,hp:26}},
  abyss_bow:{n:"Abyss Bow",i:"🏹",eq:"weapon",set:"deepstriker",st:{atk:50,rng:48}},
  abyss_cowl:{n:"Abyss Cowl",i:"🎣",eq:"head",set:"deepstriker",st:{rng:32,hp:62}},
  abyss_leathers:{n:"Abyss Leathers",i:"🧥",eq:"body",set:"deepstriker",st:{rng:58,hp:112}},
  abyss_bracers:{n:"Abyss Bracers",i:"🧤",eq:"hands",set:"deepstriker",st:{rng:34,atk:11}},
  abyss_striders:{n:"Abyss Striders",i:"🩴",eq:"feet",set:"deepstriker",st:{rng:22,hp:42}},
  crystal_wand:{n:"Crystal Wand",i:"🪄",eq:"weapon",set:"voidcaller",st:{mag:12,atk:3}},
  crystal_circlet:{n:"Crystal Circlet",i:"💎",eq:"head",set:"voidcaller",st:{mag:8,hp:10}},
  crystal_robe:{n:"Crystal Robe",i:"🔮",eq:"body",set:"voidcaller",st:{mag:15,hp:20}},
  crystal_focus:{n:"Crystal Focus",i:"🔹",eq:"hands",set:"voidcaller",st:{mag:6,atk:2}},
  crystal_sandals:{n:"Crystal Sandals",i:"💠",eq:"feet",set:"voidcaller",st:{mag:4,hp:6}},
  ether_staff:{n:"Ether Staff",i:"🪄",eq:"weapon",set:"voidcaller",st:{mag:26,atk:6}},
  ether_crown:{n:"Ether Crown",i:"💎",eq:"head",set:"voidcaller",st:{mag:18,hp:22}},
  ether_robes:{n:"Ether Robes",i:"🔮",eq:"body",set:"voidcaller",st:{mag:34,hp:40}},
  ether_gloves:{n:"Ether Gloves",i:"🔹",eq:"hands",set:"voidcaller",st:{mag:14,atk:4}},
  ether_slippers:{n:"Ether Slippers",i:"💠",eq:"feet",set:"voidcaller",st:{mag:10,hp:14}},
  void_staff:{n:"Void Staff",i:"🪄",eq:"weapon",set:"voidcaller",st:{mag:44,atk:10}},
  void_crown:{n:"Void Crown",i:"👑",eq:"head",set:"voidcaller",st:{mag:32,hp:38}},
  void_robes:{n:"Void Robes",i:"🔮",eq:"body",set:"voidcaller",st:{mag:60,hp:68}},
  void_focus:{n:"Void Focus",i:"🔹",eq:"hands",set:"voidcaller",st:{mag:26,atk:7}},
  void_sandals:{n:"Void Sandals",i:"💠",eq:"feet",set:"voidcaller",st:{mag:18,hp:26}},
  abyss_scepter:{n:"Abyss Scepter",i:"🪄",eq:"weapon",set:"voidcaller",st:{mag:70,atk:16}},
  abyss_crown:{n:"Abyss Crown",i:"👑",eq:"head",set:"voidcaller",st:{mag:52,hp:62}},
  abyss_robes:{n:"Abyss Robes",i:"🔮",eq:"body",set:"voidcaller",st:{mag:98,hp:110}},
  abyss_focus:{n:"Abyss Focus",i:"🔹",eq:"hands",set:"voidcaller",st:{mag:40,atk:11}},
  abyss_sandals:{n:"Abyss Sandals",i:"💠",eq:"feet",set:"voidcaller",st:{mag:28,hp:44}},
  healing_serum:{n:"Healing Serum",i:"💉",s:1,v:20,food:1,heal:20},
  kelp_broth:{n:"Kelp Broth",i:"🍵",s:1,v:45,food:1,heal:45},
  pressure_tonic:{n:"Pressure Tonic",i:"⚗️",s:1,v:70,food:1,heal:90},
  bio_stim_mk2:{n:"Bio Stim Mk2",i:"💉",s:1,v:120},
  bio_stim:{n:"Bio Stim",i:"💊",s:1,v:85,food:1,heal:65},
  bioluminescent_drink:{n:"Bioluminescent Brew",i:"🫧",s:1,v:25,drink:1},
  deep_extract:{n:"Deep Extract",i:"🧬",s:1,v:50,drink:1},
  void_elixir:{n:"Void Elixir",i:"🌌",s:1,v:120,drink:1},
  leviathan_bone:{n:"Leviathan Bone",i:"🦴",s:1,v:300,rare:1},
  ancient_relic:{n:"Ancient Relic Fragment",i:"🗿",s:1,v:220,rare:1},
  void_pearl:{n:"Void Pearl",i:"🔵",s:1,v:160,rare:1},
  alien_bio_tissue:{n:"Alien Bio Tissue",i:"🧫",s:1,v:220,rare:1},
  thermal_plating:{n:"Thermal Plating",i:"🔩",s:1,v:80},
  thermal_core:{n:"Thermal Core",i:"🌋",s:1,v:150,rare:1},
  black_coral:{n:"Black Coral",i:"🖤",s:1,v:200,rare:1},
  ancient_processor:{n:"Ancient Processor",i:"🔲",s:1,v:240,rare:1},
  void_essence:{n:"Void Essence",i:"🌀",s:1,v:280,rare:1},
  nav_beacon:{n:"Navigation Beacon",i:"📍",s:1,v:30},
  scan_report:{n:"Scan Report",i:"📋",s:1,v:35},
  relic_shard:{n:"Relic Shard",i:"🧩",s:1,v:50},
  ocean_chart:{n:"Ocean Chart",i:"🗺️",s:1,v:45},
  supply_crate:{n:"Supply Crate",i:"📦",s:1,v:150,food:1,heal:150},
  resonance_crystal:{n:"Resonance Crystal",i:"🔮",s:1,v:70},
  ancient_data_chip:{n:"Ancient Data Chip",i:"💾",s:1,v:180},
  void_map:{n:"Void Map",i:"🌌",s:1,v:100},
  kelp_rake:{n:"Kelp Rake",i:"🌿",eq:"tool",st:{gather_yield:0.05,gather_speed:0.03}},
  tide_harvester:{n:"Tide Harvester",i:"🌊",eq:"tool",st:{gather_yield:0.10,gather_speed:0.06}},
  spore_collector:{n:"Spore Collector",i:"🌱",eq:"tool",st:{gather_yield:0.18,gather_speed:0.10,cultiv_yield:0.10}},
  void_tendril:{n:"Void Tendril",i:"🌑",eq:"tool",st:{gather_yield:0.28,gather_speed:0.15,cultiv_yield:0.20}},
  reef_pick:{n:"Reef Pick",i:"⛏️",eq:"tool",st:{gather_speed:0.06,gather_yield:0.03}},
  brine_drill:{n:"Brine Drill",i:"🔩",eq:"tool",st:{gather_speed:0.12,gather_yield:0.06}},
  magma_borer:{n:"Magma Borer",i:"🔥",eq:"tool",st:{gather_speed:0.20,gather_yield:0.10}},
  obsidian_crusher:{n:"Obsidian Crusher",i:"⬛",eq:"tool",st:{gather_speed:0.30,gather_yield:0.15}},
  glow_rod:{n:"Glow Rod",i:"🎣",eq:"tool",st:{gather_yield:0.05,rare_chance:0.02}},
  phosphor_net:{n:"Phosphor Net",i:"🕸️",eq:"tool",st:{gather_yield:0.10,rare_chance:0.04}},
  void_lure:{n:"Void Lure",i:"🦑",eq:"tool",st:{gather_yield:0.18,rare_chance:0.07}},
  abyss_trawl:{n:"Abyss Trawl",i:"🌀",eq:"tool",st:{gather_yield:0.28,rare_chance:0.12}},
  quartz_chisel:{n:"Quartz Chisel",i:"🔮",eq:"tool",st:{crystal_yield:0.10,gather_speed:0.04}},
  silt_probe:{n:"Silt Probe",i:"🔹",eq:"tool",st:{crystal_yield:0.20,gather_speed:0.08}},
  ether_lens:{n:"Ether Lens",i:"💫",eq:"tool",st:{crystal_yield:0.35,gather_speed:0.13}},
  void_resonator:{n:"Void Resonator",i:"🟣",eq:"tool",st:{crystal_yield:0.55,gather_speed:0.18}},
  sediment_brush:{n:"Sediment Brush",i:"🗺️",eq:"tool",st:{rare_chance:0.03,gather_yield:0.04}},
  ruin_scanner:{n:"Ruin Scanner",i:"📡",eq:"tool",st:{rare_chance:0.06,gather_yield:0.08}},
  fragment_extractor:{n:"Fragment Extractor",i:"🧩",eq:"tool",st:{rare_chance:0.10,gather_yield:0.13}},
  ancient_probe:{n:"Ancient Probe",i:"🏺",eq:"tool",st:{rare_chance:0.16,gather_yield:0.20}},
  kelp_hood:{n:"Kelp Hood",i:"🍃",eq:"head",set:"kelp",st:{rare_chance:0.04}},
  kelp_suit:{n:"Kelp Suit",i:"🌿",eq:"body",set:"kelp",st:{cultiv_yield:0.10,xp_bonus:0.08}},
  kelp_gloves:{n:"Kelp Gloves",i:"🧤",eq:"hands",set:"kelp",st:{gather_speed:0.06}},
  kelp_boots:{n:"Kelp Boots",i:"👟",eq:"feet",set:"kelp",st:{cultiv_yield:0.08}},
  ore_helm:{n:"Ore Helm",i:"⛑️",eq:"head",set:"ore",st:{rare_chance:0.05}},
  ore_vest:{n:"Ore Vest",i:"🪨",eq:"body",set:"ore",st:{mining_yield:0.10,xp_bonus:0.08}},
  ore_gauntlets:{n:"Ore Gauntlets",i:"🦾",eq:"hands",set:"ore",st:{gather_speed:0.08}},
  ore_treads:{n:"Ore Treads",i:"🥾",eq:"feet",set:"ore",st:{mining_yield:0.08}},
  scale_mask:{n:"Scale Mask",i:"🐡",eq:"head",set:"scale",st:{rare_chance:0.05}},
  scale_suit:{n:"Scale Suit",i:"🦈",eq:"body",set:"scale",st:{fishing_yield:0.10,xp_bonus:0.08}},
  scale_fins:{n:"Scale Fins",i:"🫧",eq:"hands",set:"scale",st:{gather_speed:0.07}},
  scale_boots:{n:"Scale Boots",i:"🐚",eq:"feet",set:"scale",st:{fishing_yield:0.08}},
  crystal_visor:{n:"Crystal Visor",i:"💎",eq:"head",set:"crystal",st:{rare_chance:0.06}},
  crystal_suit:{n:"Crystal Suit",i:"🔮",eq:"body",set:"crystal",st:{crystal_yield:0.14,xp_bonus:0.10}},
  crystal_gloves:{n:"Crystal Gloves",i:"🔹",eq:"hands",set:"crystal",st:{gather_speed:0.08}},
  crystal_fins:{n:"Crystal Fins",i:"💠",eq:"feet",set:"crystal",st:{crystal_yield:0.10}},
  explorer_helm:{n:"Explorer Helm",i:"🪖",eq:"head",set:"explorer",st:{rare_chance:0.08}},
  explorer_suit:{n:"Explorer Suit",i:"🗺️",eq:"body",set:"explorer",st:{trench_yield:0.12,xp_bonus:0.10}},
  explorer_gloves:{n:"Explorer Gloves",i:"🧩",eq:"hands",set:"explorer",st:{gather_speed:0.09}},
  explorer_boots:{n:"Explorer Boots",i:"👢",eq:"feet",set:"explorer",st:{trench_yield:0.10}},
  leviathan_steel:{n:"Leviathan Steel",i:"⚙️",s:1,v:160},
  void_resin:{n:"Void Resin",i:"🧪",s:1,v:160},
  reinforced_alloy_mk2:{n:"Refined Alloy Mk2",i:"⚙️",s:1,v:145},
};

// ===================== SKILLS =====================
const SKILLS=[
  {id:"kelp_farming",name:"Cultivation",icon:"🌿",color:"#00c285",cat:"gather",acts:[
    {id:"kf1",name:"Reef Kelp Bed",lv:1,xp:14,t:10, out:[{id:"kelp",q:1}]},
    {id:"kf2",name:"Coral Fronds",lv:20, xp:24,t:12, out:[{id:"soft_coral",q:1}]},
    {id:"kf3",name:"Mushroom Patch",lv:40, xp:45,t:15, out:[{id:"sea_mushrooms",q:1}]},
    {id:"kf4",name:"Tidal Sap Harvest",lv:60, xp:85,t:18, out:[{id:"tide_sap",q:1}]},
    {id:"kf5",name:"Spore Bed",lv:85, xp:170,t:24, out:[{id:"kelp_spores",q:1}]},
    {id:"kf6",name:"Void Kelp Abyss",lv:110,xp:310,t:30, out:[{id:"void_kelp",q:1}]}]},
  {id:"deep_mining",name:"Deep Sea Mining",icon:"⛏️",color:"#7b61ff",cat:"gather",acts:[
    {id:"dm1",name:"Reef Sandstone",lv:1,xp:14,t:10, out:[{id:"trench_stone",q:1}]},
    {id:"dm2",name:"Shell Bed",lv:20, xp:24,t:12, out:[{id:"shell_fragments",q:1}]},
    {id:"dm3",name:"Salt Crystal Vein",lv:40, xp:45,t:15, out:[{id:"salt_crystals",q:1}]},
    {id:"dm4",name:"Thermal Ore Seam",lv:60, xp:85,t:18, out:[{id:"thermal_ore",q:1}]},
    {id:"dm5",name:"Magma Shard Seam",lv:85, xp:170,t:24, out:[{id:"magma_shard",q:1}]},
    {id:"dm6",name:"Obsidian Depths",lv:110,xp:310,t:30, out:[{id:"obsidian_ore",q:1}]}]},
  {id:"bioluminescent_fishing",name:"Abyss Fishing",icon:"🎣",color:"#00d4ff",cat:"gather",acts:[
    {id:"bf1",name:"Reef Pool Fishing",lv:1,xp:14,t:10, out:[{id:"glowfish",q:1}]},
    {id:"bf2",name:"Scale Harvest",lv:20, xp:24,t:12, out:[{id:"phosphor_scales",q:1}]},
    {id:"bf3",name:"Roe Collection",lv:40, xp:45,t:15, out:[{id:"deepsea_roe",q:1}]},
    {id:"bf4",name:"Fiber Net Trawl",lv:60, xp:85,t:18, out:[{id:"ocean_fiber",q:1}]},
    {id:"bf5",name:"Void Fin Hunt",lv:85, xp:170,t:24, out:[{id:"void_fin",q:1}]},
    {id:"bf6",name:"Abyss Trawling",lv:110,xp:310,t:30, out:[{id:"alien_bio_tissue",q:1}]}]},
  {id:"crystal_diving",name:"Crystal Diving",icon:"💎",color:"#a78bfa",cat:"gather",acts:[
    {id:"cd1",name:"Shallows Crystals",lv:1,xp:16,t:10, out:[{id:"abyss_crystal",q:1}]},
    {id:"cd2",name:"Quartz Shelf",lv:20, xp:28,t:12, out:[{id:"raw_quartz",q:1}]},
    {id:"cd3",name:"Silt Crystal Cave",lv:40, xp:52,t:15, out:[{id:"silt_crystal",q:1}]},
    {id:"cd4",name:"Ether Dust Pocket",lv:60, xp:98,t:18, out:[{id:"ether_dust",q:1}]},
    {id:"cd5",name:"Void Pearl Dive",lv:85, xp:196,t:24, out:[{id:"void_pearl",q:1}]},
    {id:"cd6",name:"Void Crystal Core",lv:110,xp:356,t:30, out:[{id:"void_essence",q:1}]}]},
  {id:"trench_exploration",name:"Trench Exploration",icon:"🗺️",color:"#38bdf8",cat:"gather",acts:[
    {id:"te1",name:"Shallow Survey",lv:1,xp:14,t:10, out:[{id:"sea_fiber",q:1}]},
    {id:"te2",name:"Deep Moss Bed",lv:20, xp:24,t:12, out:[{id:"deep_moss",q:1}]},
    {id:"te3",name:"Sediment Core",lv:40, xp:45,t:15, out:[{id:"sediment_core",q:1}]},
    {id:"te4",name:"Ancient Ruin Dig",lv:60, xp:85,t:18, out:[{id:"ancient_fragment",q:1}]},
    {id:"te5",name:"Abyss Silt Trench",lv:85, xp:170,t:24, out:[{id:"abyss_silt",q:1}]},
    {id:"te6",name:"Lost Relic Vault",lv:110,xp:310,t:30, out:[{id:"ancient_relic",q:1}]}]},
  {id:"exploration",name:"Exploration",icon:"🧭",color:"#38bdf8",cat:"gather",acts:[
    {id:"ex1",name:"Survey Submarine Wreck", lv:1,  xp:30, t:60,  out:[{id:"kelp",q:1}],           dropId:"drop_wreck",  desc:"Search the ancient wreck for hidden blueprints."},
    {id:"ex2",name:"Probe Research Facility",lv:25, xp:55, t:90,  inp:[{id:"nav_beacon",q:1}],      out:[{id:"soft_coral",q:1}], dropId:"drop_lab",    desc:"Infiltrate the lost facility. May uncover rare blueprints."},
    {id:"ex3",name:"Follow Deep Signal",     lv:50, xp:90, t:120, inp:[{id:"resonance_crystal",q:2}],out:[{id:"abyss_crystal",q:1}], dropId:"drop_beacon", desc:"Track the beacon. Legendary blueprints await."},
    {id:"ex4",name:"Excavate Crystal Vein",  lv:75, xp:140,t:150, inp:[{id:"abyss_crystal",q:3},{id:"void_essence",q:1}], out:[{id:"void_essence",q:1}], dropId:"drop_vein", desc:"Mine the exposed vein. The rarest blueprints hide here."}]},
  {id:"fabrication",name:"Fabrication",icon:"🔧",color:"#ffd60a",cat:"prod",acts:[
    {id:"fb1",name:"Grind Stone",        lv:1, xp:14, t:10,inp:[{id:"trench_stone",q:3}],                                     out:[{id:"stone_powder",q:1}]},
    {id:"fb2",name:"Crush Shells",       lv:10,xp:18, t:10,inp:[{id:"shell_fragments",q:3}],                                out:[{id:"shell_dust",q:1}]},
    {id:"fb3",name:"Smelt Ore Flakes",   lv:20,xp:40, t:13,inp:[{id:"thermal_ore",q:2}],                                    out:[{id:"ore_flakes",q:1}]},
    {id:"fb4",name:"Forge Alloy",        lv:30,xp:55, t:16,inp:[{id:"shell_dust",q:3},{id:"stone_powder",q:4}],             out:[{id:"reinforced_alloy",q:1}]},
    {id:"fb5",name:"Press Coral Bricks", lv:40,xp:65, t:17,inp:[{id:"soft_coral",q:5},{id:"stone_powder",q:3}],             out:[{id:"coral_bricks",q:1}]},
    {id:"fb6",name:"Smelt Pressure Glass",lv:50,xp:78,t:19,inp:[{id:"ore_flakes",q:4},{id:"salt_crystals",q:2}],            out:[{id:"pressure_glass",q:1}]},
    {id:"fb7",name:"Cast Thermal Plating",lv:65,xp:120,t:25,inp:[{id:"thermal_ore",q:6},{id:"reinforced_alloy",q:4}],       out:[{id:"thermal_plating",q:1}]},
    {id:"fb8",name:"Forge Leviathan Steel",lv:80,xp:155,t:29,inp:[{id:"thermal_plating",q:2},{id:"pressure_glass",q:4}],   out:[{id:"leviathan_steel",q:1}]},
    {id:"tb_m1a",name:"Tide Mallet",       lv:1, xp:28, t:12,inp:[{id:"trench_stone",q:8},{id:"sea_fiber",q:4}],out:[{id:"tide_mallet",q:1}]},
    {id:"tb_m1b",name:"Tide Helm",         lv:1, xp:20, t:11,inp:[{id:"trench_stone",q:6},{id:"shell_fragments",q:4}],out:[{id:"tide_helm",q:1}]},
    {id:"tb_m1c",name:"Tide Plate",        lv:5, xp:38, t:14,inp:[{id:"coral_blocks",q:8},{id:"shell_fragments",q:6}],out:[{id:"tide_plate",q:1}]},
    {id:"tb_m1d",name:"Tide Gauntlets",    lv:5, xp:24, t:12,inp:[{id:"trench_stone",q:5},{id:"shell_fragments",q:4}],out:[{id:"tide_gauntlets",q:1}]},
    {id:"tb_m1e",name:"Tide Sabatons",     lv:5, xp:22, t:11,inp:[{id:"trench_stone",q:5},{id:"coral_blocks",q:3}],out:[{id:"tide_sabatons",q:1}]},
    {id:"tb_m1f",name:"Tide Shield",       lv:5, xp:30, t:13,inp:[{id:"coral_blocks",q:10},{id:"shell_fragments",q:6}],out:[{id:"tide_shield",q:1}]},
    {id:"tb_m2a",name:"Reef Mallet",       lv:25,xp:70, t:18,inp:[{id:"reinforced_alloy",q:6},{id:"shell_dust",q:8}],out:[{id:"reef_mallet",q:1}]},
    {id:"tb_m2b",name:"Reef Warhelm",      lv:25,xp:52, t:16,inp:[{id:"reinforced_alloy",q:4},{id:"coral_blocks",q:8}],out:[{id:"reef_warhelm",q:1}]},
    {id:"tb_m2c",name:"Reef Warplate",     lv:30,xp:90, t:21,inp:[{id:"reinforced_alloy",q:8},{id:"coral_blocks",q:12},{id:"shell_dust",q:6}],out:[{id:"reef_warplate",q:1}]},
    {id:"tb_m2d",name:"Reef Warfists",     lv:30,xp:58, t:16,inp:[{id:"reinforced_alloy",q:4},{id:"shell_dust",q:5}],out:[{id:"reef_warfists",q:1}]},
    {id:"tb_m2e",name:"Reef Warboots",     lv:30,xp:52, t:15,inp:[{id:"reinforced_alloy",q:3},{id:"coral_blocks",q:5}],out:[{id:"reef_warboots",q:1}]},
    {id:"tb_m2f",name:"Reef Bulwark",      lv:30,xp:75, t:19,inp:[{id:"reinforced_alloy",q:6},{id:"coral_blocks",q:10}],out:[{id:"reef_bulwark",q:1}]},
    {id:"tb_m3a",name:"Abyssal Mallet",    lv:55,xp:140,t:26,inp:[{id:"pressure_glass",q:6},{id:"ore_flakes",q:10},{id:"reinforced_alloy",q:8}],out:[{id:"abyssal_mallet",q:1}]},
    {id:"tb_m3b",name:"Abyssal Warhelm",   lv:55,xp:100,t:22,inp:[{id:"pressure_glass",q:4},{id:"reinforced_alloy",q:6}],out:[{id:"abyssal_warhelm",q:1}]},
    {id:"tb_m3c",name:"Abyssal Warplate",  lv:60,xp:175,t:29,inp:[{id:"pressure_glass",q:8},{id:"ore_flakes",q:12},{id:"reinforced_alloy",q:12}],out:[{id:"abyssal_warplate",q:1}]},
    {id:"tb_m3d",name:"Abyssal Warfists",  lv:60,xp:115,t:23,inp:[{id:"pressure_glass",q:4},{id:"ore_flakes",q:6}],out:[{id:"abyssal_warfists",q:1}]},
    {id:"tb_m3e",name:"Abyssal Warboots",  lv:60,xp:105,t:22,inp:[{id:"pressure_glass",q:3},{id:"reinforced_alloy",q:5}],out:[{id:"abyssal_warboots",q:1}]},
    {id:"tb_m3f",name:"Abyssal Bulwark",   lv:60,xp:148,t:27,inp:[{id:"pressure_glass",q:6},{id:"reinforced_alloy",q:10}],out:[{id:"abyssal_bulwark",q:1}]},
    {id:"tb_m4a",name:"Leviathan Mallet",  lv:85,xp:215,t:30,inp:[{id:"thermal_core",q:2},{id:"ore_flakes",q:15},{id:"pressure_glass",q:8}],out:[{id:"leviathan_mallet",q:1}]},
    {id:"tb_m4b",name:"Leviathan Warhelm", lv:85,xp:165,t:27,inp:[{id:"thermal_core",q:1},{id:"pressure_glass",q:6},{id:"reinforced_alloy",q:8}],out:[{id:"leviathan_warhelm",q:1}]},
    {id:"tb_m4c",name:"Leviathan Warplate",lv:85,xp:270,t:33,inp:[{id:"thermal_core",q:3},{id:"ore_flakes",q:18},{id:"pressure_glass",q:10}],out:[{id:"leviathan_warplate",q:1}]},
    {id:"tb_m4d",name:"Leviathan Warfists",lv:85,xp:175,t:28,inp:[{id:"thermal_core",q:1},{id:"ore_flakes",q:8},{id:"reinforced_alloy",q:6}],out:[{id:"leviathan_warfists",q:1}]},
    {id:"tb_m4e",name:"Leviathan Warboots",lv:85,xp:160,t:27,inp:[{id:"thermal_core",q:1},{id:"pressure_glass",q:4},{id:"ore_flakes",q:6}],out:[{id:"leviathan_warboots",q:1}]},
    {id:"tb_m4f",name:"Leviathan Bulwark", lv:85,xp:225,t:31,inp:[{id:"thermal_core",q:2},{id:"pressure_glass",q:8},{id:"reinforced_alloy",q:12}],out:[{id:"leviathan_bulwark",q:1}]}]},
  {id:"bio_lab",name:"Bio Lab",icon:"🧪",color:"#00ffb3",cat:"prod",acts:[
    {id:"br1",name:"Biofuel",lv:1, xp:10, t:11,inp:[{id:"kelp",q:5}],out:[{id:"biofuel",q:1}]},
    {id:"bs1",name:"Healing Serum",lv:1, xp:24, t:13,inp:[{id:"sea_mushrooms",q:3}],out:[{id:"healing_serum",q:1}]},
    {id:"br2",name:"Enzyme Compound",lv:10,xp:10, t:11,inp:[{id:"glowfish",q:3}],out:[{id:"enzyme_compound",q:1}]},
    {id:"bs2",name:"Kelp Broth",lv:10,xp:14, t:11,inp:[{id:"kelp",q:4},{id:"enzyme_compound",q:1}],out:[{id:"kelp_broth",q:1}]},
    {id:"br3",name:"Luminescent Gel",lv:20,xp:27, t:13,inp:[{id:"glowfish",q:4},{id:"sea_mushrooms",q:2}],out:[{id:"luminescent_gel",q:1}]},
    {id:"oa3",name:"Deep Extract",lv:20,xp:72, t:18,inp:[{id:"sea_mushrooms",q:5},{id:"glowfish",q:3}],out:[{id:"deep_extract",q:1}]},
    {id:"bs3",name:"Pressure Tonic",lv:25,xp:54, t:16,inp:[{id:"enzyme_compound",q:2},{id:"abyss_crystal",q:1}],out:[{id:"pressure_tonic",q:1}]},
    {id:"bs4",name:"Bio Stim",lv:30,xp:55, t:16,inp:[{id:"luminescent_gel",q:2},{id:"sea_mushrooms",q:3}],out:[{id:"bio_stim",q:1}]},
    {id:"dc4",name:"Bioluminescent Brew",lv:35,xp:75, t:19,inp:[{id:"luminescent_gel",q:2},{id:"glowfish",q:4}],out:[{id:"bioluminescent_drink",q:1}]},
    {id:"oa2",name:"Void Elixir",lv:40,xp:100,t:22,inp:[{id:"abyss_crystal",q:2},{id:"enzyme_compound",q:2}],out:[{id:"void_elixir",q:1}]},
    {id:"oa4",name:"Bio Stim Mk2",lv:50,xp:95, t:21,inp:[{id:"luminescent_gel",q:3},{id:"pressure_tonic",q:1}],out:[{id:"bio_stim_mk2",q:1}]}]},
  {id:"relic_forging",name:"Relic Forging",icon:"⚗️",color:"#e11d48",cat:"prod",acts:[
    {id:"vc_g1a",name:"Crystal Wand",lv:1, xp:28, t:12,inp:[{id:"abyss_crystal",q:6},{id:"raw_quartz",q:4}],out:[{id:"crystal_wand",q:1}]},
    {id:"vc_g1b",name:"Crystal Circlet",lv:1, xp:20, t:11,inp:[{id:"abyss_crystal",q:4},{id:"raw_quartz",q:3}],out:[{id:"crystal_circlet",q:1}]},
    {id:"vc_g1c",name:"Crystal Robe",lv:5, xp:38, t:14,inp:[{id:"abyss_crystal",q:8},{id:"raw_quartz",q:5},{id:"sea_fiber",q:4}],out:[{id:"crystal_robe",q:1}]},
    {id:"vc_g1d",name:"Crystal Focus",lv:5, xp:24, t:12,inp:[{id:"abyss_crystal",q:4},{id:"raw_quartz",q:3}],out:[{id:"crystal_focus",q:1}]},
    {id:"vc_g1e",name:"Crystal Sandals",lv:5, xp:22, t:11,inp:[{id:"abyss_crystal",q:4},{id:"sea_fiber",q:3}],out:[{id:"crystal_sandals",q:1}]},
    {id:"vc_g2a",name:"Ether Staff",lv:25,xp:72, t:18,inp:[{id:"silt_crystal",q:6},{id:"crystal_shard",q:8},{id:"raw_quartz",q:6}],out:[{id:"ether_staff",q:1}]},
    {id:"vc_g2b",name:"Ether Crown",lv:25,xp:52, t:16,inp:[{id:"silt_crystal",q:4},{id:"abyss_crystal",q:6}],out:[{id:"ether_crown",q:1}]},
    {id:"vc_g2c",name:"Ether Robes",lv:30,xp:92, t:21,inp:[{id:"silt_crystal",q:8},{id:"crystal_shard",q:10},{id:"raw_quartz",q:8}],out:[{id:"ether_robes",q:1}]},
    {id:"vc_g2d",name:"Ether Gloves",lv:30,xp:58, t:16,inp:[{id:"silt_crystal",q:4},{id:"crystal_shard",q:5}],out:[{id:"ether_gloves",q:1}]},
    {id:"vc_g2e",name:"Ether Slippers",lv:30,xp:52, t:15,inp:[{id:"silt_crystal",q:3},{id:"abyss_crystal",q:4}],out:[{id:"ether_slippers",q:1}]},
    {id:"vc_g3a",name:"Void Staff",lv:55,xp:145,t:26,inp:[{id:"ether_dust",q:8},{id:"void_dust",q:6},{id:"silt_crystal",q:8}],out:[{id:"void_staff",q:1}]},
    {id:"vc_g3b",name:"Void Crown",lv:55,xp:105,t:22,inp:[{id:"ether_dust",q:5},{id:"silt_crystal",q:6}],out:[{id:"void_crown",q:1}]},
    {id:"vc_g3c",name:"Void Robes",lv:60,xp:180,t:29,inp:[{id:"ether_dust",q:10},{id:"void_dust",q:8},{id:"silt_crystal",q:10}],out:[{id:"void_robes",q:1}]},
    {id:"vc_g3d",name:"Void Focus",lv:60,xp:118,t:23,inp:[{id:"ether_dust",q:5},{id:"void_dust",q:4}],out:[{id:"void_focus",q:1}]},
    {id:"vc_g3e",name:"Void Sandals",lv:60,xp:108,t:22,inp:[{id:"ether_dust",q:4},{id:"silt_crystal",q:5}],out:[{id:"void_sandals",q:1}]},
    {id:"vc_g4a",name:"Abyss Scepter",lv:85,xp:220,t:30,inp:[{id:"void_pearl",q:3},{id:"void_dust",q:10},{id:"ether_dust",q:8}],out:[{id:"abyss_scepter",q:1}]},
    {id:"vc_g4b",name:"Abyss Crown",lv:85,xp:168,t:27,inp:[{id:"void_pearl",q:2},{id:"ether_dust",q:6},{id:"silt_crystal",q:6}],out:[{id:"abyss_crown",q:1}]},
    {id:"vc_g4c",name:"Abyss Robes",lv:85,xp:275,t:33,inp:[{id:"void_pearl",q:3},{id:"void_dust",q:12},{id:"ether_dust",q:10}],out:[{id:"abyss_robes",q:1}]},
    {id:"vc_g4d",name:"Abyss Focus",lv:85,xp:178,t:28,inp:[{id:"void_pearl",q:2},{id:"void_dust",q:6}],out:[{id:"abyss_focus",q:1}]},
    {id:"vc_g4e",name:"Abyss Sandals",lv:85,xp:165,t:27,inp:[{id:"void_pearl",q:1},{id:"ether_dust",q:5},{id:"silt_crystal",q:5}],out:[{id:"abyss_sandals",q:1}]},
    {id:"rl1",name:"Split Crystals",lv:1, xp:16, t:10,inp:[{id:"abyss_crystal",q:2}],out:[{id:"crystal_shard",q:1}]},
    {id:"rl2",name:"Grind Quartz",lv:10,xp:24, t:12,inp:[{id:"raw_quartz",q:3}],out:[{id:"quartz_powder",q:1}]},
    {id:"rl3",name:"Refine Silt",lv:20,xp:45, t:15,inp:[{id:"silt_crystal",q:2}],out:[{id:"refined_silt",q:1}]},
    {id:"rl4",name:"Extract Ether",lv:25,xp:65, t:17,inp:[{id:"ether_dust",q:2}],out:[{id:"void_dust",q:1}]},
    {id:"rf1",name:"Void Pearl Extract",lv:30,xp:72,t:19,inp:[{id:"void_dust",q:2},{id:"luminescent_gel",q:3}],out:[{id:"void_pearl",q:1}]},
    {id:"rf2",name:"Black Coral Harvest",lv:45,xp:149,t:28,inp:[{id:"coral_blocks",q:15},{id:"thermal_ore",q:5}],out:[{id:"black_coral",q:1}]},
    {id:"rf3",name:"Thermal Core Forge",lv:55,xp:350,t:35,inp:[{id:"ore_flakes",q:10},{id:"pressure_glass",q:5},{id:"refined_silt",q:3}],out:[{id:"thermal_core",q:1}]},
    {id:"rf4",name:"Void Resin Extract",lv:65,xp:299,t:35,inp:[{id:"black_coral",q:4},{id:"void_pearl",q:2},{id:"luminescent_gel",q:6}],out:[{id:"void_resin",q:1}]}]},
  {id:"gear_crafting",name:"Gear Crafting",icon:"🛠️",color:"#f59e0b",cat:"prod",acts:[
        {id:"gc_r1",name:"Cure Scales",        lv:1, xp:12,t:8, inp:[{id:"phosphor_scales",q:4}],                                    out:[{id:"scale_weave",q:1}]},
    {id:"gc_r2",name:"Press Scale Plate",   lv:5, xp:18,t:10,inp:[{id:"scale_weave",q:2},{id:"shell_fragments",q:3}],             out:[{id:"scale_plate",q:1}]},
    {id:"gc_r3",name:"Treat Kelp Fiber",    lv:15,xp:24,t:12,inp:[{id:"kelp",q:6},{id:"sea_fiber",q:4}],                          out:[{id:"treated_kelp",q:1}]},
    {id:"gc_r4",name:"Cure Ocean Fiber",    lv:25,xp:32,t:13,inp:[{id:"ocean_fiber",q:4},{id:"treated_kelp",q:2}],                 out:[{id:"cured_fiber",q:1}]},
    {id:"gc_r5",name:"Weave Armored Plate",  lv:35,xp:45,t:15,inp:[{id:"phosphor_scales",q:6},{id:"scale_weave",q:2}],             out:[{id:"armored_weave",q:1}]},
    {id:"gc_r6",name:"Temper Fiber",         lv:45,xp:58,t:17,inp:[{id:"ocean_fiber",q:6},{id:"cured_fiber",q:2}],                  out:[{id:"tempered_fiber",q:1}]},
    {id:"gc_r7",name:"Spin Void Thread",    lv:55,xp:75,t:20,inp:[{id:"void_fin",q:3},{id:"cured_fiber",q:4}],                     out:[{id:"void_thread",q:1}]},
    {id:"gc_r8",name:"Weave Prismatic",     lv:70,xp:110,t:25,inp:[{id:"void_fin",q:4},{id:"void_essence",q:2},{id:"cured_fiber",q:6}],out:[{id:"prismatic_weave",q:1}]},
    {id:"gc_r9",name:"Spin Void Silk",      lv:85,xp:155,t:30,inp:[{id:"void_essence",q:3},{id:"prismatic_weave",q:2}],            out:[{id:"void_silk",q:1}]},
    {id:"ds_r1a",gearCat:"combat",name:"Sting Bolt",lv:1, xp:24, t:12,inp:[{id:"sea_fiber",q:4},{id:"shell_fragments",q:3}],out:[{id:"sting_bolt",q:1}]},
    {id:"ds_r1b",gearCat:"combat",name:"Strike Cowl",lv:1, xp:18, t:11,inp:[{id:"sea_fiber",q:5}],out:[{id:"strike_cowl",q:1}]},
    {id:"ds_r1c",gearCat:"combat",name:"Strike Vest",lv:5, xp:35, t:14,inp:[{id:"sea_fiber",q:8},{id:"ocean_fiber",q:3}],out:[{id:"strike_vest",q:1}]},
    {id:"ds_r1d",gearCat:"combat",name:"Strike Wraps",lv:5, xp:22, t:12,inp:[{id:"sea_fiber",q:4},{id:"kelp",q:4}],out:[{id:"strike_wraps",q:1}]},
    {id:"ds_r1e",gearCat:"combat",name:"Strike Fins",lv:5, xp:20, t:11,inp:[{id:"sea_fiber",q:4},{id:"ocean_fiber",q:2}],out:[{id:"strike_fins",q:1}]},
    {id:"ds_r2a",gearCat:"combat",name:"Reef Crossbow",lv:25,xp:65, t:17,inp:[{id:"ocean_fiber",q:8},{id:"phosphor_scales",q:5},{id:"fiber_cord",q:3}],out:[{id:"reef_crossbow",q:1}]},
    {id:"ds_r2b",gearCat:"combat",name:"Reef Hood",lv:25,xp:48, t:15,inp:[{id:"phosphor_scales",q:6},{id:"ocean_fiber",q:4}],out:[{id:"reef_hood",q:1}]},
    {id:"ds_r2c",gearCat:"combat",name:"Reef Leathers",lv:30,xp:85, t:20,inp:[{id:"ocean_fiber",q:8},{id:"phosphor_scales",q:10},{id:"fiber_cord",q:4}],out:[{id:"reef_leathers",q:1}]},
    {id:"ds_r2d",gearCat:"combat",name:"Reef Bracers",lv:30,xp:55, t:16,inp:[{id:"phosphor_scales",q:6},{id:"ocean_fiber",q:5}],out:[{id:"reef_bracers",q:1}]},
    {id:"ds_r2e",gearCat:"combat",name:"Reef Striders",lv:30,xp:50, t:15,inp:[{id:"phosphor_scales",q:5},{id:"ocean_fiber",q:4}],out:[{id:"reef_striders",q:1}]},
    {id:"ds_r3a",gearCat:"combat",name:"Void Bow",lv:55,xp:130,t:25,inp:[{id:"void_fin",q:5},{id:"deepsea_roe",q:8},{id:"fiber_cord",q:6}],out:[{id:"void_bow",q:1}]},
    {id:"ds_r3b",gearCat:"combat",name:"Void Cowl",lv:55,xp:95, t:21,inp:[{id:"void_fin",q:4},{id:"ocean_fiber",q:8}],out:[{id:"void_cowl",q:1}]},
    {id:"ds_r3c",gearCat:"combat",name:"Void Leathers",lv:60,xp:160,t:28,inp:[{id:"void_fin",q:6},{id:"deepsea_roe",q:10},{id:"phosphor_scales",q:8}],out:[{id:"void_leathers",q:1}]},
    {id:"ds_r3d",gearCat:"combat",name:"Void Bracers",lv:60,xp:110,t:23,inp:[{id:"void_fin",q:4},{id:"deepsea_roe",q:6}],out:[{id:"void_bracers",q:1}]},
    {id:"ds_r3e",gearCat:"combat",name:"Void Striders",lv:60,xp:100,t:22,inp:[{id:"void_fin",q:3},{id:"ocean_fiber",q:6}],out:[{id:"void_striders",q:1}]},
    {id:"ds_r4a",gearCat:"combat",name:"Abyss Bow",lv:85,xp:210,t:30,inp:[{id:"alien_bio_tissue",q:4},{id:"void_fin",q:8},{id:"void_essence",q:1}],out:[{id:"abyss_bow",q:1}]},
    {id:"ds_r4b",gearCat:"combat",name:"Abyss Cowl",lv:85,xp:160,t:27,inp:[{id:"alien_bio_tissue",q:3},{id:"void_fin",q:5}],out:[{id:"abyss_cowl",q:1}]},
    {id:"ds_r4c",gearCat:"combat",name:"Abyss Leathers",lv:85,xp:260,t:33,inp:[{id:"alien_bio_tissue",q:5},{id:"void_fin",q:10},{id:"deepsea_roe",q:8}],out:[{id:"abyss_leathers",q:1}]},
    {id:"ds_r4d",gearCat:"combat",name:"Abyss Bracers",lv:85,xp:175,t:28,inp:[{id:"alien_bio_tissue",q:3},{id:"void_fin",q:4}],out:[{id:"abyss_bracers",q:1}]},
    {id:"ds_r4e",gearCat:"combat",name:"Abyss Striders",lv:85,xp:165,t:27,inp:[{id:"alien_bio_tissue",q:2},{id:"void_fin",q:4}],out:[{id:"abyss_striders",q:1}]},
    {id:"cg1",gearCat:"cultivation",name:"Kelp Rake",lv:5, xp:28,t:12, inp:[{id:"kelp",q:10},{id:"ocean_fiber",q:5}],out:[{id:"kelp_rake",q:1}]},
    {id:"cg2",gearCat:"cultivation",name:"Tide Harvester",lv:25,xp:55,t:15, inp:[{id:"soft_coral",q:8},{id:"tide_sap",q:4},{id:"ocean_fiber",q:8}],out:[{id:"tide_harvester",q:1}]},
    {id:"cg3",gearCat:"cultivation",name:"Spore Collector",lv:55,xp:110,t:22, inp:[{id:"kelp_spores",q:6},{id:"tide_sap",q:8},{id:"void_pearl",q:1}],out:[{id:"spore_collector",q:1}]},
    {id:"cg4",gearCat:"cultivation",name:"Void Tendril",lv:85,xp:210,t:30,inp:[{id:"void_kelp",q:4},{id:"kelp_spores",q:10},{id:"void_essence",q:1}],out:[{id:"void_tendril",q:1}]},
    {id:"cg5",gearCat:"cultivation",name:"Kelp Hood",lv:55,xp:100,t:20, inp:[{id:"kelp",q:20},{id:"soft_coral",q:8},{id:"ocean_fiber",q:10}],out:[{id:"kelp_hood",q:1}]},
    {id:"cg6",gearCat:"cultivation",name:"Kelp Suit",lv:80,xp:180,t:28, inp:[{id:"tide_sap",q:6},{id:"soft_coral",q:15},{id:"kelp",q:25},{id:"ocean_fiber",q:12}], out:[{id:"kelp_suit",q:1}]},
    {id:"cg7",gearCat:"cultivation",name:"Kelp Gloves",lv:15,xp:28,t:12, inp:[{id:"kelp",q:10},{id:"ocean_fiber",q:6}],out:[{id:"kelp_gloves",q:1}]},
    {id:"cg8",gearCat:"cultivation",name:"Kelp Boots",lv:35,xp:55,t:15, inp:[{id:"kelp",q:12},{id:"sea_mushrooms",q:6},{id:"ocean_fiber",q:5}],out:[{id:"kelp_boots",q:1}]},
    {id:"mg1",gearCat:"mining",name:"Reef Pick",lv:5, xp:28,t:12, inp:[{id:"trench_stone",q:12},{id:"shell_fragments",q:6}],out:[{id:"reef_pick",q:1}]},
    {id:"mg2",gearCat:"mining",name:"Brine Drill",lv:25,xp:55,t:15, inp:[{id:"salt_crystals",q:8},{id:"shell_fragments",q:10},{id:"reinforced_alloy",q:3}], out:[{id:"brine_drill",q:1}]},
    {id:"mg3",gearCat:"mining",name:"Magma Borer",lv:55,xp:110,t:22, inp:[{id:"magma_shard",q:5},{id:"thermal_ore",q:10},{id:"reinforced_alloy",q:6}],out:[{id:"magma_borer",q:1}]},
    {id:"mg4",gearCat:"mining",name:"Obsidian Crusher",lv:85,xp:210,t:30,inp:[{id:"obsidian_ore",q:4},{id:"magma_shard",q:8},{id:"thermal_core",q:2}],out:[{id:"obsidian_crusher",q:1}]},
    {id:"mg5",gearCat:"mining",name:"Ore Helm",lv:55,xp:100,t:20, inp:[{id:"trench_stone",q:25},{id:"shell_fragments",q:10},{id:"salt_crystals",q:6}], out:[{id:"ore_helm",q:1}]},
    {id:"mg6",gearCat:"mining",name:"Ore Vest",lv:80,xp:180,t:28, inp:[{id:"shell_fragments",q:20},{id:"salt_crystals",q:12},{id:"thermal_ore",q:8},{id:"reinforced_alloy",q:6}], out:[{id:"ore_vest",q:1}]},
    {id:"mg7",gearCat:"mining",name:"Ore Gauntlets",lv:15,xp:28,t:12, inp:[{id:"trench_stone",q:15},{id:"shell_fragments",q:8}],out:[{id:"ore_gauntlets",q:1}]},
    {id:"mg8",gearCat:"mining",name:"Ore Treads",lv:35,xp:55,t:15, inp:[{id:"trench_stone",q:18},{id:"shell_fragments",q:8},{id:"salt_crystals",q:5}], out:[{id:"ore_treads",q:1}]},
    {id:"fg1",gearCat:"fishing",name:"Glow Rod",lv:5, xp:28,t:12, inp:[{id:"glowfish",q:8},{id:"ocean_fiber",q:6}],out:[{id:"glow_rod",q:1}]},
    {id:"fg2",gearCat:"fishing",name:"Phosphor Net",lv:25,xp:55,t:15, inp:[{id:"phosphor_scales",q:8},{id:"deepsea_roe",q:4},{id:"ocean_fiber",q:10}], out:[{id:"phosphor_net",q:1}]},
    {id:"fg3",gearCat:"fishing",name:"Void Lure",lv:55,xp:110,t:22, inp:[{id:"void_fin",q:4},{id:"deepsea_roe",q:8},{id:"void_pearl",q:1}],out:[{id:"void_lure",q:1}]},
    {id:"fg4",gearCat:"fishing",name:"Abyss Trawl",lv:85,xp:210,t:30,inp:[{id:"alien_bio_tissue",q:3},{id:"void_fin",q:6},{id:"void_essence",q:1}], out:[{id:"abyss_trawl",q:1}]},
    {id:"fg5",gearCat:"fishing",name:"Scale Mask",lv:55,xp:100,t:20, inp:[{id:"phosphor_scales",q:14},{id:"glowfish",q:10},{id:"deepsea_roe",q:5}], out:[{id:"scale_mask",q:1}]},
    {id:"fg6",gearCat:"fishing",name:"Scale Suit",lv:80,xp:180,t:28, inp:[{id:"phosphor_scales",q:20},{id:"deepsea_roe",q:12},{id:"ocean_fiber",q:15},{id:"glowfish",q:8}], out:[{id:"scale_suit",q:1}]},
    {id:"fg7",gearCat:"fishing",name:"Scale Fins",lv:15,xp:28,t:12, inp:[{id:"glowfish",q:12},{id:"ocean_fiber",q:8}],out:[{id:"scale_fins",q:1}]},
    {id:"fg8",gearCat:"fishing",name:"Scale Boots",lv:35,xp:55,t:15, inp:[{id:"phosphor_scales",q:12},{id:"glowfish",q:8},{id:"ocean_fiber",q:8}], out:[{id:"scale_boots",q:1}]},
    {id:"xg1",gearCat:"crystal",name:"Quartz Chisel",lv:10,xp:28,t:12, inp:[{id:"abyss_crystal",q:4},{id:"raw_quartz",q:6}],out:[{id:"quartz_chisel",q:1}]},
    {id:"xg2",gearCat:"crystal",name:"Silt Probe",lv:30,xp:55,t:15, inp:[{id:"raw_quartz",q:8},{id:"silt_crystal",q:5},{id:"abyss_crystal",q:3}], out:[{id:"silt_probe",q:1}]},
    {id:"xg3",gearCat:"crystal",name:"Ether Lens",lv:60,xp:110,t:22, inp:[{id:"silt_crystal",q:6},{id:"ether_dust",q:6},{id:"void_pearl",q:2}],out:[{id:"ether_lens",q:1}]},
    {id:"xg4",gearCat:"crystal",name:"Void Resonator",lv:90,xp:210,t:30,inp:[{id:"void_pearl",q:3},{id:"ether_dust",q:10},{id:"void_essence",q:2}],out:[{id:"void_resonator",q:1}]},
    {id:"xg5",gearCat:"crystal",name:"Crystal Visor",lv:65,xp:100,t:20, inp:[{id:"abyss_crystal",q:8},{id:"raw_quartz",q:10},{id:"silt_crystal",q:4}], out:[{id:"crystal_visor",q:1}]},
    {id:"xg6",gearCat:"crystal",name:"Crystal Suit",lv:90,xp:180,t:28, inp:[{id:"silt_crystal",q:12},{id:"ether_dust",q:6},{id:"abyss_crystal",q:12},{id:"raw_quartz",q:10}], out:[{id:"crystal_suit",q:1}]},
    {id:"xg7",gearCat:"crystal",name:"Crystal Gloves",lv:25,xp:28,t:12, inp:[{id:"abyss_crystal",q:6},{id:"raw_quartz",q:6}],out:[{id:"crystal_gloves",q:1}]},
    {id:"xg8",gearCat:"crystal",name:"Crystal Fins",lv:45,xp:55,t:15, inp:[{id:"raw_quartz",q:8},{id:"abyss_crystal",q:6},{id:"silt_crystal",q:3}], out:[{id:"crystal_fins",q:1}]},
    {id:"tg1",gearCat:"trench",name:"Sediment Brush",lv:10,xp:28,t:12, inp:[{id:"sea_fiber",q:12},{id:"deep_moss",q:6}],out:[{id:"sediment_brush",q:1}]},
    {id:"tg2",gearCat:"trench",name:"Ruin Scanner",lv:30,xp:55,t:15, inp:[{id:"sediment_core",q:5},{id:"deep_moss",q:8},{id:"trench_stone",q:10}], out:[{id:"ruin_scanner",q:1}]},
    {id:"tg3",gearCat:"trench",name:"Fragment Extractor",lv:60,xp:110,t:22, inp:[{id:"ancient_fragment",q:4},{id:"sediment_core",q:8},{id:"abyss_crystal",q:2}], out:[{id:"fragment_extractor",q:1}]},
    {id:"tg4",gearCat:"trench",name:"Ancient Probe",lv:90,xp:210,t:30,inp:[{id:"abyss_silt",q:5},{id:"ancient_fragment",q:8},{id:"void_essence",q:1}], out:[{id:"ancient_probe",q:1}]},
    {id:"tg5",gearCat:"trench",name:"Explorer Helm",lv:65,xp:100,t:20, inp:[{id:"deep_moss",q:14},{id:"ocean_fiber",q:10},{id:"sediment_core",q:5}], out:[{id:"explorer_helm",q:1}]},
    {id:"tg6",gearCat:"trench",name:"Explorer Suit",lv:90,xp:180,t:28, inp:[{id:"sediment_core",q:12},{id:"ancient_fragment",q:6},{id:"deep_moss",q:15},{id:"ocean_fiber",q:15}], out:[{id:"explorer_suit",q:1}]},
    {id:"tg7",gearCat:"trench",name:"Explorer Gloves",lv:25,xp:28,t:12, inp:[{id:"deep_moss",q:10},{id:"ocean_fiber",q:8}],out:[{id:"explorer_gloves",q:1}]},
    {id:"tg8",gearCat:"trench",name:"Explorer Boots",lv:45,xp:55,t:15, inp:[{id:"ocean_fiber",q:12},{id:"deep_moss",q:8},{id:"sediment_core",q:3}],out:[{id:"explorer_boots",q:1}]}]},
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

// Set bonuses: pieces = items in set, bonuses at 2pc and 4pc
// NPC shop base buy prices (what the NPC pays you per item)
const NPC_CATS=[
  {id:"all",  label:"All",        icon:"🏷️"},
  {id:"mat",  label:"Materials",  icon:"🪨"},
  {id:"rare", label:"Rare",       icon:"✨"},
  {id:"food", label:"Consumables",icon:"💊"},
  {id:"eq",   label:"Equipment",  icon:"🗡️"},
];

const SET_BONUSES={
  kelp:{
    name:"Kelp Cultivator",color:"#00c285",
    pieces:["kelp_gloves","kelp_boots","kelp_hood","kelp_suit"],
    bonuses:{
      2:{label:"Cultivator's Flow",stats:{gather_speed:0.10,cultiv_yield:0.08},desc:"Faster hands, richer harvest across all cultivation"},
      4:{label:"Verdant Mastery",stats:{cultiv_yield:0.20,rare_chance:0.05,xp_bonus:0.10},desc:"Every cultivation action yields more of everything"},
    },
  },
  ore:{
    name:"Deep Ore Miner",color:"#7b61ff",
    pieces:["ore_gauntlets","ore_treads","ore_helm","ore_vest"],
    bonuses:{
      2:{label:"Iron Will",stats:{gather_speed:0.10,mining_yield:0.08},desc:"Faster strikes, more ore from every vein"},
      4:{label:"Vein Sense",stats:{mining_yield:0.20,rare_chance:0.06,xp_bonus:0.10},desc:"Every mining action extracts more from the deep rock"},
    },
  },
  scale:{
    name:"Abyss Fisher",color:"#00d4ff",
    pieces:["scale_fins","scale_boots","scale_mask","scale_suit"],
    bonuses:{
      2:{label:"Current Rider",stats:{gather_speed:0.10,fishing_yield:0.08},desc:"Flow with the current, pull more from every cast"},
      4:{label:"Deep Angler",stats:{fishing_yield:0.20,rare_chance:0.08,xp_bonus:0.10},desc:"Every fishing action draws more from the abyss"},
    },
  },
  crystal:{
    name:"Crystal Diver",color:"#a78bfa",
    pieces:["crystal_gloves","crystal_fins","crystal_visor","crystal_suit"],
    bonuses:{
      2:{label:"Resonance",stats:{gather_speed:0.08,crystal_yield:0.12},desc:"In tune with the crystals — all dives yield more"},
      4:{label:"Void Attunement",stats:{crystal_yield:0.25,rare_chance:0.10,xp_bonus:0.12},desc:"Every crystal action echoes through the void"},
    },
  },
  explorer:{
    name:"Trench Explorer",color:"#38bdf8",
    pieces:["explorer_gloves","explorer_boots","explorer_helm","explorer_suit"],
    bonuses:{
      2:{label:"Pathfinder",stats:{gather_speed:0.08,trench_yield:0.10},desc:"Every trench expedition uncovers more"},
      4:{label:"Ancient Bond",stats:{trench_yield:0.22,rare_chance:0.12,xp_bonus:0.12},desc:"The ancient trench yields all its secrets to you"},
    },
  },

  tidebreaker:{label:"Tidebreaker",pieces:["tide_plate","reef_warplate","abyssal_warplate","leviathan_warplate","tide_shield","reef_bulwark","abyssal_bulwark","leviathan_bulwark"],bonuses:[{count:2,desc:"+10% DEF",st:{def_pct:0.10}},{count:4,desc:"+20% DEF, +15% HP",st:{def_pct:0.20,hp_pct:0.15}},{count:6,desc:"+35% DEF, +25% HP, ATK+10",st:{def_pct:0.35,hp_pct:0.25,atk:10}}]},
  deepstriker:{label:"Deepstriker",pieces:["strike_vest","reef_leathers","void_leathers","abyss_leathers"],bonuses:[{count:2,desc:"+10% RNG",st:{rng_pct:0.10}},{count:4,desc:"+20% RNG, +15% ATK",st:{rng_pct:0.20,atk_pct:0.15}}]},
  voidcaller:{label:"Voidcaller",pieces:["crystal_robe","ether_robes","void_robes","abyss_robes"],bonuses:[{count:2,desc:"+10% MAG",st:{mag_pct:0.10}},{count:4,desc:"+25% MAG, +10% ATK",st:{mag_pct:0.25,atk_pct:0.10}}]},};

const STAT_LABELS={
  cultiv_yield:"Cultivation Yield",mining_yield:"Mining Yield",fishing_yield:"Fishing Yield",crystal_yield:"Crystal Yield",trench_yield:"Trench Yield",xp_bonus:"XP Bonus",
  gather_speed:"Gather Speed",gather_yield:"Gather Yield",rare_chance:"Rare Chance",
  def:"Defence",hp:"HP",atk:"Attack",mag:"Magic",rng:"Range",
};
const fmtStat=(k,v)=>{
  const pctKeys=new Set(["gather_speed","gather_yield","rare_chance","cultiv_yield","crystal_yield","atk_pct","def_pct"]);
  return (STAT_LABELS[k]||k)+": +"+(pctKeys.has(k)?Math.round(v*100)+"%":v);
};

const ESLOTS=[
  {id:"head",n:"Head",i:"⛑️"},{id:"body",n:"Body",i:"🔵"},{id:"hands",n:"Hands",i:"🧤"},{id:"feet",n:"Feet",i:"👢"},
  {id:"weapon",n:"Weapon",i:"🗡️"},{id:"shield",n:"Shield",i:"🛡️"},{id:"neck",n:"Neck",i:"📿"},{id:"ring",n:"Ring",i:"💍"},
  {id:"tool",n:"Tool",i:"🔧"},
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
// RAF-driven progress bar — reads ref directly, no React re-renders
function ProgBar({progRef,height=7,radius=4,bg,color,glow}){
  const domRef=useRef(null);
  useEffect(()=>{
    let id;
    const loop=()=>{
      if(domRef.current)domRef.current.style.width=(progRef.current*100)+"%";
      id=requestAnimationFrame(loop);
    };
    id=requestAnimationFrame(loop);
    return()=>cancelAnimationFrame(id);
  },[progRef]);
  return(
    <div style={{height,borderRadius:radius,background:bg||"rgba(255,255,255,0.08)",overflow:"hidden"}}>
      <div ref={domRef} style={{width:"0%",height:"100%",borderRadius:radius,
        background:color||"linear-gradient(90deg,#7b61ff,#00d4ff)",
        boxShadow:glow||"none",transition:"none"}}/>
    </div>
  );
}

// Standalone ActRow — must be outside GameUI to prevent React remount-on-render
function ActRow({act,skColor,inv,curAct,startAct,skId,s,tipProps,C,FONT,FONT_BODY,ITEMS,BLUEPRINTS,BP_DROPS,BP_RARITY_COLOR,GLOW_OK,GLOW_STYLE,skImg}){
  if(!act||!act.name)return null;
  const tp=tipProps||(()=>({}));
  const locked=s.lv<act.lv&&!s.mastered;
  const canDo=!locked&&(!act.inp||act.inp.every(i=>(inv[i.id]||0)>=i.q));
  const isAct=curAct&&curAct.act===act.id&&curAct.sk===skId;
  const isBp=!!act._blueprint;
  const bpMeta=isBp?BLUEPRINTS.find(b=>b.id===act._blueprint):null;
  const bpColor=bpMeta?BP_RARITY_COLOR[bpMeta.rarity]:"#ffd60a";
  return(
    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"12px 16px",borderRadius:8,
      background:skImg?"linear-gradient(90deg,rgba(5,15,25,0.6),rgba(5,15,25,0.4)), url("+skImg+")"
        :isAct?"linear-gradient(90deg,"+C.ok+"18,"+C.card+")":isBp?"linear-gradient(135deg,"+bpColor+"10,"+C.card+")":C.card,
      backgroundSize:skImg?"cover":undefined,backgroundPosition:skImg?"center":undefined,
      border:"2px solid "+(isAct?C.ok+"60":isBp?bpColor+"50":C.border),
      marginBottom:8,opacity:locked?0.32:1,transition:"all 0.15s",
      boxShadow:isBp?"0 0 10px "+bpColor+"18":"none"}}>
      <div style={{flex:1,minWidth:0}}>
        <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:3}}>
          <div style={{fontSize:13,fontWeight:700,color:isAct?C.ok:isBp?bpColor:C.white,fontFamily:FONT,letterSpacing:0.8}}>{act.name}</div>
          <div style={{fontSize:9,color:C.td,fontFamily:FONT}}>Lv {act.lv} · +{act.xp} XP · {act.t}s</div>
          {isBp&&<div style={{fontSize:9,padding:"2px 6px",borderRadius:5,background:bpColor+"25",border:"1px solid "+bpColor+"60",color:bpColor,fontWeight:700}}>📘 BP</div>}
        </div>
        <div style={{fontSize:11,color:C.ts,fontFamily:FONT_BODY,display:"flex",alignItems:"center",gap:3,flexWrap:"wrap"}}>
          {act.inp&&<>{act.inp.map(i=>{const it=ITEMS[i.id];const has=(inv[i.id]||0)>=i.q;return(
            <span key={i.id} {...tp(i.id)} style={{color:has?C.ts:"#f87171",marginRight:2,cursor:"help"}}>{it?.i||""}{i.q} {it?.n||i.id}</span>
          );})}<span style={{color:C.td,margin:"0 2px"}}>→</span></>}
          {act.out&&act.out.map(i=>{const it=ITEMS[i.id];const isGear=it?.eq&&it.eq!=="tool";return(
            <span key={i.id} {...tp(i.id)} style={{color:isGear?skColor:C.ts,fontWeight:isGear?700:400,borderBottom:isGear?"1px dashed "+skColor+"50":"none",cursor:"help"}}>
              {it?.i||""} {it?.n||i.id}{i.q>1?" ×"+i.q:""}
            </span>
          );})}
        </div>
        {act.dropId&&(()=>{
          const drop=(BP_DROPS||[]).find(d=>d.id===act.dropId);
          const poolBps=(drop?.pool||[]).map(id=>BLUEPRINTS.find(b=>b.id===id)).filter(Boolean);
          return poolBps.length>0?(
            <div style={{marginTop:6,display:"flex",flexWrap:"wrap",gap:4}}>
              {poolBps.map(bp=>{
                const col=BP_RARITY_COLOR[bp.rarity]||"#ffd60a";
                return(
                  <div key={bp.id} style={{display:"flex",alignItems:"center",gap:4,padding:"2px 7px",borderRadius:6,
                    background:col+"15",border:"1px solid "+col+"40"}}>
                    <span style={{fontSize:11}}>{bp.icon}</span>
                    <span style={{fontSize:9,fontWeight:700,color:col,fontFamily:FONT}}>{bp.name}</span>
                    <span style={{fontSize:8,color:col+"99",fontFamily:FONT,letterSpacing:0.5}}>{(bp.rarity||"").toUpperCase()}</span>
                  </div>
                );
              })}
            </div>
          ):null;
        })()}
        {locked&&<div style={{fontSize:10,color:C.bad,marginTop:2,fontFamily:FONT_BODY}}>🔒 Requires Level {act.lv}</div>}
      </div>
      {!locked&&<div onClick={()=>{if(canDo)startAct(skId,act.id)}} style={{padding:"9px 20px",borderRadius:8,marginLeft:12,flexShrink:0,
        background:isAct?"linear-gradient(90deg,"+C.okD+","+C.ok+")":canDo?"linear-gradient(90deg,"+C.accD+","+C.acc+")":C.card,
        color:C.bg,fontSize:11,fontWeight:700,cursor:canDo?"pointer":"default",opacity:canDo?1:0.35,letterSpacing:0.8,fontFamily:FONT,
        boxShadow:isAct?GLOW_OK:canDo?GLOW_STYLE:"none"}}>{isAct?"ACTIVE":"START"}</div>}
    </div>
  );
}

function GameUI({account,onLogout}){
  const[skills,setSkills]=useState({});
  const[inv,setInv]=useState({});
  const[eq,setEq]=useState({});
  const[gold,setGold]=useState(0);
  const[enh,setEnh]=useState({});
  const[enhSel,setEnhSel]=useState(null);
  const[curAct,setCurAct]=useState(null);
  // actProg state replaced by actProgRef for perf
  const[pinnedSkill,setPinnedSkill]=useState(null);
  const[gatherCounts,setGatherCounts]=useState({});
  const[lastActMap,setLastActMap]=useState({});
  const[zoneId,setZoneId]=useState(null);
  const[cbt,setCbt]=useState(null);
  const[clog,setClog]=useState([]);
  const[food,setFood]=useState(null);
  const[page,setPage]=useState("skills");
  const[isMobile,setIsMobile]=useState(()=>window.innerWidth<768);
  const[mobileTab,setMobileTab]=useState("skills"); // skills|combat|bag|chat|more
  const[actSkill,setActSkill]=useState("kelp_farming");
  const[gearCat,setGearCat]=useState("combat");
  const[prodTab,setProdTab]=useState("material");
  const[tooltip,setTooltip]=useState(null);// {iid, x, y}
  const[npcCat,setNpcCat]=useState("all");
  const[npcLog,setNpcLog]=useState([]);
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
  // Discoveries
  // Blueprints log
  const[bpLog,setBpLog]=useState([]);
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
    dronesDeployed:0, dronesConcurrent:0, maxSkillLv:0,
    totalSkillLv:0, blueprintsFound:0,
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
    const b={cultiv_yield:0,gather_yield:0,gather_speed:0,energy_regen:0,max_energy:0,atk_pct:0,def_pct:0,combat_xp:0,boss_drop:0,prod_speed:0,gold_pct:0,xp_pct:0,rare_chance:0,crystal_yield:0,rp_gen:0,pressure_resist:0,drone_efficiency:0};
    ALL_RESEARCH.forEach(r=>{if(researched[r.id]&&r.effect)Object.entries(r.effect||{}).forEach(([k,v])=>{b[k]=(b[k]||0)+v})});
    // Structure bonuses (per level)
    STRUCTURES.forEach(st=>{const lv=structures[st.id]||0;if(lv>0){if(st.bonus)Object.entries(st.bonus).forEach(([k,v])=>{b[k]=(b[k]||0)+v*lv});if(st.bonusExtra)Object.entries(st.bonusExtra).forEach(([k,v])=>{b[k]=(b[k]||0)+v*lv})}});
    // Equipment gather bonuses (tools + armor with gather stats)
    const gatherKeys=new Set(["gather_yield","gather_speed","cultiv_yield","mining_yield","fishing_yield","crystal_yield","trench_yield","rare_chance","xp_bonus"]);
    ESLOTS.forEach(slot=>{const iid=eq[slot.id];if(iid){const it=ITEMS[iid];if(it?.st)Object.entries(it.st||{}).forEach(([k,v])=>{if(gatherKeys.has(k))b[k]=(b[k]||0)+v})}});
    // Set bonuses
    Object.values(SET_BONUSES).forEach(set=>{
      const count=set.pieces.filter(pid=>Object.values(eq).includes(pid)).length;
      [2,4].forEach(threshold=>{if(count>=threshold&&set.bonuses[threshold])Object.entries(set.bonuses[threshold].stats).forEach(([k,v])=>{b[k]=(b[k]||0)+v})});
    });
    return b;
  },[researched,structures,skills]);

  const maxEnergy=useMemo(()=>100+(bonuses.max_energy||0),[bonuses]);

  const pStats=useMemo(()=>{
    let s={hp:50,atk:1,def:0,mag:0,rng:0};
    s.hp+=sl("pressure_resistance").lv*2;s.atk+=sl("harpoon_mastery").lv+sl("combat_systems").lv;
    s.def+=sl("depth_shielding").lv;s.rng+=sl("sonic_weapons").lv;s.mag+=sl("leviathan_lore").lv;
    ESLOTS.forEach(slot=>{const iid=eq[slot.id];if(iid){const it=ITEMS[iid];if(it&&it.st)Object.entries(it.st||{}).forEach(([k,v])=>{const e=enh[iid]||0;s[k]=(s[k]||0)+Math.floor(v*(1+e*0.08))})}});
    if(bonuses.atk_pct)s.atk=Math.floor(s.atk*(1+bonuses.atk_pct));
    if(bonuses.def_pct)s.def=Math.floor(s.def*(1+bonuses.def_pct));
    return s;
  },[eq,sl,enh,bonuses]);

  // Load
  useEffect(()=>{(async()=>{try{
    // Try localStorage first (most up-to-date — written on every change)
    let d=null;
    try{
      const ls=localStorage.getItem("idle_save_"+account.uid);
      if(ls)d=JSON.parse(ls);
    }catch{}
    // Fall back to Firestore if no local save
    if(!d){
      const snap=await getDoc(doc(db,"doc_saves",account.uid));
      if(snap.exists())d=snap.data();
    }
    if(d){
      if(d.skills)setSkills(d.skills);if(d.inv){const cleanInv={};Object.entries(d.inv).forEach(([k,v])=>{if(ITEMS[k])cleanInv[k]=v;});setInv(cleanInv);}if(d.eq){const cleanEq={};Object.entries(d.eq).forEach(([slot,iid])=>{if(ITEMS[iid])cleanEq[slot]=iid;});setEq(cleanEq);}if(d.gold)setGold(d.gold);if(d.enh){const cleanEnh={};Object.entries(d.enh).forEach(([k,v])=>{if(ITEMS[k])cleanEnh[k]=v;});setEnh(cleanEnh);}if(d.researchPts)setResearchPts(d.researchPts);if(d.researched)setResearched(d.researched);if(d.structures)setStructures(d.structures);if(d.drones)setDrones(d.drones);
      if(d.achievements)setAchievements(d.achievements);if(d.lifeStats)setLifeStats(p=>({...p,...d.lifeStats}));
      if(d.blueprints)setBlueprints(d.blueprints);
      if(d.bpLog)setBpLog(d.bpLog);
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
          const rpGained=Math.floor((away/10000));
          if(rpGained>0){gains.rp=rpGained;setResearchPts(p=>p+rpGained)}
          const hasGains=Object.keys(gains.items).length>0||gains.rp>0||gains.gold>0;
          if(hasGains)setOfflineGains({away,gains});
        }
      }
      // Show tutorial for new players (no prior save)
    }else{setShowTutorial(true)}
    dataLoaded.current=true;
    }catch(e){console.error(e)}})()},[account.uid]);

  // Load social on mount
  useEffect(()=>{loadFriends();loadClan();},[account.uid]);
  // Scroll chat to bottom when messages change
  useEffect(()=>{chatEndRef.current?.scrollIntoView({behavior:"smooth"})},[chatMessages,dmMessages,clanChat]);
  const saveRef=useRef(null);
  const dataLoaded=useRef(false); // don't save until load completes

  // Debounced autosave — only after data is loaded
  useEffect(()=>{
    if(!account?.uid||!dataLoaded.current)return;
    // Write to localStorage immediately — synchronous, survives any refresh
    const save={
      skills,inv,eq,gold,enh,researchPts,researched,
      structures,drones,achievements,lifeStats,
      blueprints,bpLog:bpLog.slice(-50),ts:Date.now(),
    };
    try{localStorage.setItem("idle_save_"+account.uid,JSON.stringify(save));}catch{}
    // Debounce Firestore write to 5s
    if(saveRef.current)clearTimeout(saveRef.current);
    saveRef.current=setTimeout(async()=>{
      try{await setDoc(doc(db,"doc_saves",account.uid),save);}
      catch(e){console.error("cloud save:",e)}
    },5000);
  },[skills,inv,eq,gold,enh,researchPts,researched,structures,drones,achievements,lifeStats,blueprints,bpLog]);

  // Save on tab close
  useEffect(()=>{
    const handler=()=>{
      if(!account?.uid||!dataLoaded.current)return;
      const save={skills,inv,eq,gold,enh,researchPts,researched,structures,drones,achievements,lifeStats,blueprints,bpLog:bpLog.slice(-50),ts:Date.now()};
      try{localStorage.setItem("idle_save_"+account.uid,JSON.stringify(save));}catch{}
    };
    window.addEventListener("beforeunload",handler);
    return()=>window.removeEventListener("beforeunload",handler);
  },[account?.uid,skills,inv,eq,gold,enh,researchPts,researched,structures,drones,achievements,lifeStats,blueprints,bpLog]);

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

  // Action tick — RAF drives progress bar, logic interval fires on completion only
  const actProgRef=useRef(0);
  useEffect(()=>{
    if(!curAct)return;
    const sk=SKILLS.find(s=>s.id===curAct.sk);if(!sk)return;
    const act=sk.acts.find(a=>a.id===curAct.act);if(!act)return;
    const speedMult=sk.cat==="gather"?(1+(bonuses.gather_speed||0)):(1+(bonuses.prod_speed||0));
    const dur=(act.t*1000)/speedMult;
    let start=Date.now();
    let rafId;
    const rafLoop=()=>{actProgRef.current=Math.min(1,(Date.now()-start)/dur);rafId=requestAnimationFrame(rafLoop);};
    rafId=requestAnimationFrame(rafLoop);
    const tick=setInterval(()=>{
      if((Date.now()-start)<dur)return;
      const ci=invRef.current;
      if(act.inp&&!act.inp.every(i=>(ci[i.id]||0)>=i.q)){setCurAct(null);actProgRef.current=0;return}
      if(act.inp)act.inp.forEach(i=>remIt(i.id,i.q));
      gainXp(sk.id,Math.floor(act.xp*(1+(sk.cat==="gather"?(bonuses.xp_bonus||0):0))));
      if(act.out)act.out.forEach(i=>{
        let qty=i.q;
        if(sk.cat==="gather"){
          qty=Math.floor(qty*(1+(bonuses.gather_yield||0)));
          const skillYieldKey={kelp_farming:"cultiv_yield",deep_sea_mining:"mining_yield",abyss_fishing:"fishing_yield",crystal_diving:"crystal_yield",trench_exploration:"trench_yield"}[sk.id];
          if(skillYieldKey&&bonuses[skillYieldKey])qty=Math.floor(qty*(1+(bonuses[skillYieldKey]||0)));
        }
        if(Math.random()<(bonuses.rare_chance||0))qty+=1;
        addIt(i.id,qty);
        if(sk.cat==="gather")setLifeStats(p=>({...p,totalGathered:(p.totalGathered||0)+qty,[i.id]:(p[i.id]||0)+qty}));
      });
      if(sk.cat==="gather")setGatherCounts(p=>({...p,[act.id]:(p[act.id]||0)+1}));
      if(sk.cat==="prod")setLifeStats(p=>({...p,crafts:(p.crafts||0)+1}));
      // Blueprint drops — exploration only
      if(sk.id==="exploration"&&act.dropId){
        const drop=BP_DROPS.find(d=>d.id===act.dropId);
        if(drop){
          const avail=drop.pool.filter(id=>!blueprints.includes(id));
          if(avail.length>0&&Math.random()<0.40){
            const chosen=avail[Math.floor(Math.random()*avail.length)];
            setBlueprints(p=>[...p,chosen]);
            setLifeStats(p=>({...p,blueprintsFound:(p.blueprintsFound||0)+1}));
            const bp=BLUEPRINTS.find(b=>b.id===chosen);
            if(bp){setBpLog(p=>[...p.slice(-20),"📘 Blueprint found: "+bp.name]);setNewAch({id:"_bp",name:"Blueprint Found!",desc:bp.name,icon:"📘",reward:{}});setTimeout(()=>setNewAch(n=>n?.id==="_bp"?null:n),4000);}
          }
        }
      }

      start=Date.now();actProgRef.current=0;
    },250);
    return()=>{clearInterval(tick);cancelAnimationFrame(rafId);};
  },[curAct,gainXp,addIt,remIt,bonuses,blueprints]);


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

  const startAct=useCallback((skId,actId)=>{setZoneId(null);setCbt(null);setCurAct({sk:skId,act:actId});actProgRef.current=0;setActSkill(skId);setLastActMap(p=>({...p,[skId]:actId}));},[]);
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

  // Total skill level
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
        kills:lifeStats.kills||0,
        uid:account.uid,
        ts:Date.now(),
      });
      const q=query(collection(db,"leaderboard"),orderBy("totalSkillLv","desc"),limit(20));
      const snap=await getDocs(q);
      setLeaderboard(snap.docs.map((d,i)=>({rank:i+1,id:d.id,...d.data()})));
    }catch(e){console.error("Leaderboard:",e)}
    setLbLoading(false);
  },[account,totalSkillLevel,lifeStats.kills]);

  const maxSkillLevel=useMemo(()=>{
    const allSkillIds=[...SKILLS.map(s=>s.id),...CSUBS.map(c=>c.id),"enhancing"];
    return allSkillIds.reduce((mx,sid)=>Math.max(mx,sl(sid).lv),0);
  },[sl]);
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
    maxSkillLv:maxSkillLevel,
    totalSkillLv:totalSkillLevel,
  }),[lifeStats,eq,researched,structures,drones,maxSkillLevel,totalSkillLevel]);

  // Check achievements whenever snapshot changes
  useEffect(()=>{
    ACHIEVEMENTS.forEach(ach=>{
      if(achievements[ach.id])return;
      if(ach.check(achSnapshot)){
        setAchievements(p=>({...p,[ach.id]:true}));
        // Apply reward
        if(ach.reward.rp)setResearchPts(p=>p+ach.reward.rp);
        if(ach.reward.gold)setGold(g=>g+ach.reward.gold);
        setNewAch(ach);
        setTimeout(()=>setNewAch(null),4000);
      }
    });
  },[achSnapshot]); // eslint-disable-line

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
      <div {...tipProps(id)} style={{position:"relative",width:44,height:44,borderRadius:6,background:rareColor?rareColor+"18":C.bg,border:"1px solid "+(rareColor?rareColor+"60":C.border),display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",overflow:"hidden",flexShrink:0}}>
        <span style={{fontSize:18,lineHeight:1}}>{it.i||"📦"}</span>
        <span style={{fontSize:8,color:rareColor||C.ts,fontWeight:700,fontFamily:FONT,lineHeight:1,marginTop:1}}>{qty>=1000?Math.floor(qty/1000)+"k":qty}</span>
        {rareColor&&<div style={{position:"absolute",top:0,left:0,right:0,height:2,background:rareColor,opacity:0.7,borderRadius:"6px 6px 0 0"}}/>}
      </div>
    );
  };

  // Tooltip helpers
  const showTip=(e,iid)=>{const r=e.currentTarget.getBoundingClientRect();setTooltip({iid,x:r.left+r.width/2,y:r.top});};
  const hideTip=()=>setTooltip(null);
  // tipProps(iid) — spread onto any element to get hover tooltip
  const tipProps=(iid)=>iid&&ITEMS[iid]?{onMouseEnter:e=>showTip(e,iid),onMouseLeave:hideTip,style:{cursor:"help"}}:{};

  // Render item tooltip content
  const renderTooltip=()=>{
    if(!tooltip)return null;
    const it=ITEMS[tooltip.iid];if(!it)return null;
    const setEntry=it.set?Object.entries(SET_BONUSES).find(([,s])=>s.pieces.includes(tooltip.iid)):null;
    const setData=setEntry?setEntry[1]:null;
    const equippedCount=setData?setData.pieces.filter(pid=>Object.values(eq).includes(pid)).length:0;
    const npcPrice=it.v||null;
    const inInv=inv[tooltip.iid]||0;
    const itemType=it.eq?"Equipment":it.rare?"Rare Material":it.food?"Consumable":it.s?"Material":"Item";
    return(
      <div onMouseLeave={hideTip} style={{position:"fixed",left:Math.min(tooltip.x,window.innerWidth-220),top:Math.max(8,tooltip.y-8),transform:"translate(-50%,-100%)",
        background:"#0d1b2a",border:"1px solid "+(setData?setData.color+"80":it.rare?C.gold+"80":C.acc+"60"),borderRadius:10,padding:"12px 14px",
        zIndex:9999,minWidth:200,maxWidth:220,boxShadow:"0 8px 32px #000a",pointerEvents:"none"}}>
        {/* Item name + type */}
        <div style={{display:"flex",alignItems:"center",gap:7,marginBottom:6}}>
          <span style={{fontSize:22,filter:it.rare?"drop-shadow(0 0 6px "+C.gold+")":"none"}}>{it.i}</span>
          <div>
            <div style={{fontSize:13,fontWeight:700,color:setData?setData.color:it.rare?C.gold:C.white,fontFamily:FONT,letterSpacing:0.5}}>{it.n}</div>
            <div style={{fontSize:9,color:C.td,fontFamily:FONT,letterSpacing:1}}>{(itemType||"").toUpperCase()}{it.eq?" · "+(it.eq||"").toUpperCase():""}</div>
          </div>
        </div>
        {/* Inventory count */}
        {inInv>0&&<div style={{fontSize:10,color:C.ts,fontFamily:FONT_BODY,marginBottom:6}}>In inventory: <span style={{color:C.text,fontWeight:700}}>×{fmt(inInv)}</span></div>}
        {/* NPC sell price */}
        {npcPrice&&(
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"4px 8px",borderRadius:6,background:"#1a2a1a",border:"1px solid #2a4a2a",marginBottom:it.st?8:0}}>
            <span style={{fontSize:10,color:"#6ee7b7",fontFamily:FONT_BODY}}>🏪 NPC buys for</span>
            <span style={{fontSize:11,fontWeight:700,color:C.gold,fontFamily:FONT}}>◈ {npcPrice} each</span>
          </div>
        )}
        {/* Stats */}
        {it.st&&Object.keys(it.st).length>0&&(
          <div style={{marginBottom:setData?8:0}}>
            <div style={{fontSize:9,color:C.td,fontFamily:FONT,letterSpacing:1,marginBottom:4}}>STATS</div>
            {Object.entries(it.st||{}).map(([k,v])=>(
              <div key={k} style={{display:"flex",justifyContent:"space-between",fontSize:11,fontFamily:FONT_BODY,marginBottom:2}}>
                <span style={{color:C.ts}}>{STAT_LABELS[k]||k}</span>
                <span style={{color:C.ok,fontWeight:700}}>+{["gather_speed","gather_yield","rare_chance","cultiv_yield","mining_yield","fishing_yield","crystal_yield","trench_yield","xp_bonus"].includes(k)?Math.round(v*100)+"%":v}</span>
              </div>
            ))}
          </div>
        )}
        {/* Set bonus */}
        {setData&&(
          <div style={{borderTop:"1px solid "+setData.color+"30",paddingTop:8,marginTop:4}}>
            <div style={{fontSize:9,color:setData.color,fontFamily:FONT,letterSpacing:1,marginBottom:6}}>{(setData?.name||"").toUpperCase()} SET</div>
            {[2,4].map(n=>{
              const bonus=setData.bonuses[n];if(!bonus)return null;
              const active=equippedCount>=n;
              return(
                <div key={n} style={{marginBottom:6,opacity:active?1:0.45}}>
                  <div style={{display:"flex",alignItems:"center",gap:5,marginBottom:3}}>
                    <span style={{fontSize:9,fontWeight:700,padding:"1px 6px",borderRadius:8,background:active?setData.color+"30":"#ffffff10",color:active?setData.color:C.td,fontFamily:FONT}}>{n}pc</span>
                    <span style={{fontSize:10,fontWeight:700,color:active?setData.color:C.td,fontFamily:FONT_BODY}}>{bonus.label}</span>
                    {active&&<span style={{fontSize:9,color:C.ok}}>✓</span>}
                  </div>
                  {Object.entries(bonus.stats||{}).map(([k,v])=>(
                    <div key={k} style={{display:"flex",justifyContent:"space-between",fontSize:10,fontFamily:FONT_BODY,paddingLeft:8}}>
                      <span style={{color:C.ts}}>{STAT_LABELS[k]||k}</span>
                      <span style={{color:active?C.ok:C.td,fontWeight:700}}>+{["gather_speed","gather_yield","rare_chance","cultiv_yield","crystal_yield"].includes(k)?Math.round(v*100)+"%":v}</span>
                    </div>
                  ))}
                </div>
              );
            })}
            <div style={{fontSize:9,color:C.td,fontFamily:FONT_BODY,marginTop:4}}>{equippedCount}/{setData.pieces.length} pieces equipped</div>
          </div>
        )}
      </div>
    );
  };

  return(
    <div style={{width:"100%",height:"100vh",display:"flex",flexDirection:"column",fontFamily:FONT,background:C.bg,color:C.text,overflow:"hidden"}}>
      {renderTooltip()}

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
                  if(step.highlight)setPage(step.highlight==="gather"||step.highlight==="prod"?"skills":step.highlight);
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
              {newAch.reward.rp&&`+${newAch.reward.rp} RP `}{newAch.reward.gold&&`+${newAch.reward.gold} cr `}
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
                {Object.entries(offlineGains?.gains?.items||{}).map(([id,qty])=>(
                  <div key={id} style={{display:"flex",alignItems:"center",gap:8,fontSize:11,fontFamily:FONT_BODY}}>
                    <span {...tipProps(id)}>{ITEMS[id]?ITEMS[id].i:"📦"}</span>
                    <span style={{color:C.ok,fontWeight:700}}>+{fmt(qty)}</span>
                    <span {...tipProps(id)} style={{color:C.ts}}>{ITEMS[id]?ITEMS[id].n:id}</span>
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

      {/* ===== MOBILE UI ===== */}
      {isMobile&&(()=>{
        // Mobile page mapping: mobileTab drives what page content shows
        const mobileNavItems=[
          {id:"skills",   icon:"⚒️",  label:"Skills"},
          {id:"combat",   icon:"⚔️",  label:"Combat"},
          {id:"bag",      icon:"🎒",  label:"Bag"},
          {id:"chat",     icon:"💬",  label:"Chat"},
          {id:"more",     icon:"☰",   label:"More"},
        ];
        const mobilePageMap={skills:"skills",combat:"combat",bag:null,chat:null,more:null};

        // Sync mobileTab → page for content tabs
        const handleMobileTab=(id)=>{
          setMobileTab(id);
          if(id==="skills")setPage("skills");
          else if(id==="combat")setPage("combat");
        };

        return(
          <div style={{position:"fixed",inset:0,display:"flex",flexDirection:"column",background:C.bg,zIndex:500,fontFamily:FONT}}>

            {/* ── MOBILE TOP BAR ── */}
            <div style={{flexShrink:0,height:52,background:C.panel,borderBottom:"1px solid "+C.border,display:"flex",alignItems:"center",padding:"0 12px",gap:10}}>
              <div style={{fontSize:13,fontWeight:900,color:C.acc,letterSpacing:2,flexShrink:0}}>🌊 DOC</div>
              <div style={{flex:1,display:"flex",gap:10,alignItems:"center",overflow:"hidden"}}>
                <div style={{display:"flex",alignItems:"center",gap:4,flexShrink:0}}>
                  <span style={{fontSize:11,color:C.gold,fontWeight:700}}>◈</span>
                  <span style={{fontSize:12,color:C.gold,fontWeight:700,fontFamily:FONT}}>{fmt(gold)}</span>
                </div>
                <div style={{display:"flex",alignItems:"center",gap:4,flexShrink:0}}>
                  <span style={{fontSize:11,color:C.warn}}>⚡</span>
                  <div style={{width:50,height:5,borderRadius:3,background:C.bg,border:"1px solid "+C.border,overflow:"hidden"}}>
                    <div style={{width:(energy/maxEnergy)*100+"%",height:"100%",background:C.warn,borderRadius:3}}/>
                  </div>
                  <span style={{fontSize:11,color:C.warn,fontFamily:FONT_BODY}}>{Math.floor(energy)}</span>
                </div>
                <div style={{display:"flex",alignItems:"center",gap:4,flexShrink:0}}>
                  <span style={{fontSize:11,color:C.purp}}>🔵</span>
                  <span style={{fontSize:11,color:C.purp,fontFamily:FONT_BODY}}>{Math.floor(pressure)}%</span>
                </div>
                {curAct&&(()=>{const sk=SKILLS.find(s=>s.id===curAct.sk);return(
                  <div style={{flex:1,minWidth:0,display:"flex",alignItems:"center",gap:6,background:C.card,borderRadius:6,padding:"4px 8px",border:"1px solid "+C.border}}>
                    <span style={{fontSize:12,flexShrink:0}}>{sk?.icon}</span>
                    <div style={{flex:1,height:4,borderRadius:2,background:C.bg,overflow:"hidden"}}>
                      {actProgRef&&<ProgBar progRef={actProgRef} height="100%" radius={0} color={"linear-gradient(90deg,"+C.accD+","+C.acc+")"}/>}
                    </div>
                    <span onClick={()=>{setCurAct(null);setActProg(0)}} style={{fontSize:11,color:C.bad,fontWeight:700,cursor:"pointer",flexShrink:0}}>■</span>
                  </div>
                );})()}
              </div>
              <div onClick={()=>setPage("stats")} style={{width:32,height:32,borderRadius:8,background:C.card,border:"1px solid "+C.border,display:"flex",alignItems:"center",justifyContent:"center",fontSize:15,cursor:"pointer",flexShrink:0}}>👤</div>
            </div>

            {/* ── MOBILE CONTENT ── */}
            <div style={{flex:1,overflow:"hidden",position:"relative"}}>

              {/* Skills tab */}
              {mobileTab==="skills"&&(
                <div style={{height:"100%",overflowY:"auto",padding:"12px"}}>
                  <div style={{display:"flex",flexDirection:"column",gap:4}}>
                    {(()=>{
                      const gSkills=SKILLS.filter(sk=>sk.cat==="gather");
                      const oSkills=SKILLS.filter(sk=>sk.cat!=="gather");
                      const sorted=[
                        ...gSkills.filter(sk=>sk.id===pinnedSkill),
                        ...gSkills.filter(sk=>sk.id!==pinnedSkill&&curAct?.sk===sk.id),
                        ...gSkills.filter(sk=>sk.id!==pinnedSkill&&curAct?.sk!==sk.id),
                        ...oSkills,
                      ];
                      return sorted.map(sk=>{
                        const s=sl(sk.id);
                        const pct=s.need>0?(s.xp/s.need)*100:0;
                        const running=curAct?.sk===sk.id;
                        const isActive=actSkill===sk.id;
                        const isPinned=pinnedSkill===sk.id;
                        const isGather=sk.cat==="gather";
                        return(
                          <div key={sk.id}>
                            <div {...tap(()=>setActSkill(isActive?null:sk.id))} style={{display:"flex",alignItems:"center",gap:10,padding:"12px 14px",borderRadius:isActive?"8px 8px 0 0":8,background:isActive?"linear-gradient(90deg,"+sk.color+"25,"+C.card+")":C.card,border:"1px solid "+(isActive?sk.color+"60":isPinned?sk.color+"40":C.border),cursor:"pointer",borderBottom:isActive?"none":"1px solid "+(isPinned?sk.color+"40":C.border),userSelect:"none",WebkitUserSelect:"none"}}>
                              <span style={{fontSize:18,flexShrink:0,filter:running?"drop-shadow(0 0 5px "+sk.color+")":s.mastered?"drop-shadow(0 0 5px "+C.gold+")":"none"}}>{sk.icon}</span>
                              <div style={{flex:1,minWidth:0}}>
                                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
                                  <div style={{display:"flex",alignItems:"center",gap:5}}>
                                    <span style={{fontSize:13,color:isActive?sk.color:C.text,fontWeight:600,fontFamily:FONT_BODY}}>{sk.name}</span>
                                    {isPinned&&<span style={{fontSize:9,color:sk.color,pointerEvents:"none"}}>📌</span>}
                                  </div>
                                  <span style={{fontSize:11,color:s.mastered?C.gold:C.ts,fontWeight:700,fontFamily:FONT,pointerEvents:"none"}}>
                                    {s.mastered?"★ MAX":"Lv "+s.lv+" · "+s.xp+"/"+s.need}
                                  </span>
                                </div>
                                <div style={{height:3,borderRadius:2,background:C.bg,overflow:"hidden"}}>
                                  <div style={{width:pct+"%",height:"100%",background:s.mastered?C.gold:running?C.ok:sk.color,borderRadius:2,transition:"width 0.3s"}}/>
                                </div>
                              </div>
                              <span style={{fontSize:12,color:isActive?sk.color:C.td,flexShrink:0,marginLeft:4,pointerEvents:"none"}}>{isActive?"▾":"▸"}</span>
                              {running&&<span style={{fontSize:11,color:C.ok,fontWeight:700,flexShrink:0,pointerEvents:"none"}}>▶</span>}
                            </div>
                            {isActive&&(
                              <div style={{background:C.bg,border:"1px solid "+sk.color+"40",borderTop:"none",borderRadius:"0 0 8px 8px",padding:"8px",display:"flex",flexDirection:"column",gap:6,marginBottom:4}}>
                                {isGather&&(
                                  <div {...tap(e=>{e.stopPropagation?.();setPinnedSkill(p=>p===sk.id?null:sk.id);})} style={{padding:"5px 10px",borderRadius:6,background:isPinned?sk.color+"25":C.card,border:"1px solid "+(isPinned?sk.color:C.border),fontSize:10,fontWeight:700,color:isPinned?sk.color:C.td,fontFamily:FONT,letterSpacing:1,textAlign:"center",cursor:"pointer",userSelect:"none",marginBottom:2}}>
                                    {isPinned?"📌 PINNED — TAP TO UNPIN":"📌 PIN TO TOP"}
                                  </div>
                                )}
                                {/* Category pills for gear_crafting */}
                                {sk.id==="gear_crafting"&&(
                                  <div style={{display:"flex",gap:5,flexWrap:"wrap",marginBottom:4}}>
                                    {[
                                      {id:"combat",label:"⚔️"},{id:"cultivation",label:"🌿"},
                                      {id:"mining",label:"⛏️"},{id:"fishing",label:"🎣"},
                                      {id:"crystal",label:"💎"},{id:"trench",label:"🗺️"},
                                    ].map(cat=>(
                                      <div key={cat.id} {...tap(()=>setGearCat(cat.id))} style={{padding:"4px 9px",borderRadius:12,fontSize:11,fontWeight:700,fontFamily:FONT,
                                        background:gearCat===cat.id?sk.color+"30":C.card,
                                        border:"1px solid "+(gearCat===cat.id?sk.color:C.border),
                                        color:gearCat===cat.id?sk.color:C.td,cursor:"pointer",userSelect:"none"}}>
                                        {cat.label}
                                      </div>
                                    ))}
                                  </div>
                                )}
                                {/* For fab/relic: show section headers inline */}
                                {(sk.id==="fabrication"||sk.id==="relic_forging")&&(
                                  <div style={{display:"flex",gap:5,flexWrap:"wrap",marginBottom:4}}>
                                    {[{id:"mat",label:"🔩 Refining"},{id:"gear",label:"⚔️ Gear Set"}].map(cat=>(
                                      <div key={cat.id} {...tap(()=>setGearCat(cat.id==="mat"?"_mat":"_gear"))} style={{padding:"4px 9px",borderRadius:12,fontSize:11,fontWeight:700,fontFamily:FONT,
                                        background:(gearCat===(cat.id==="mat"?"_mat":"_gear")||(!["_mat","_gear"].includes(gearCat)&&cat.id==="mat"))?sk.color+"30":C.card,
                                        border:"1px solid "+sk.color+"40",color:sk.color,cursor:"pointer",userSelect:"none"}}>
                                        {cat.label}
                                      </div>
                                    ))}
                                  </div>
                                )}
                                {sk.acts.filter(act=>{
                                  if(sk.id==="gear_crafting")return!!act.gearCat?act.gearCat===gearCat:true;
                                  if(sk.id==="fabrication"||sk.id==="relic_forging"){
                                    const isGear=act.id.startsWith("tb_")||act.id.startsWith("vc_");
                                    if(gearCat==="_mat")return!isGear;
                                    if(gearCat==="_gear")return isGear;
                                    return!isGear; // default: show refining
                                  }
                                  return true;
                                }).map(act=>{
                                  const canDo=s.lv>=act.lv;
                                  const isAct=curAct?.sk===sk.id&&curAct?.act===act.id;
                                  const isLast=lastActMap[sk.id]===act.id&&!isAct&&!running;
                                  const count=gatherCounts[act.id]||0;
                                  return(
                                    <div key={act.id} style={{padding:"10px 12px",borderRadius:7,background:isAct?"linear-gradient(135deg,"+C.acc+"20,"+C.card+")":isLast?sk.color+"10":C.card,border:"1px solid "+(isAct?C.acc+"70":isLast?sk.color+"50":canDo?C.border:C.border+"30"),opacity:canDo?1:0.5,display:"flex",justifyContent:"space-between",alignItems:"center",gap:10}}>
                                      <div style={{flex:1,minWidth:0}}>
                                        <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:2}}>
                                          <span style={{fontSize:13,color:isAct?C.acc:canDo?C.text:C.td,fontWeight:700,fontFamily:FONT_BODY}}>{act.name}</span>
                                          {isLast&&<span style={{fontSize:9,color:sk.color,fontWeight:700,fontFamily:FONT,letterSpacing:1}}>LAST</span>}
                                        </div>
                                        {canDo?(
                                          <div style={{fontSize:11,color:C.ts,fontFamily:FONT_BODY,display:"flex",alignItems:"center",gap:4,flexWrap:"wrap"}}>
                                            <span>+{act.xp} XP · {act.t}s · </span>
                                            {act.out.map(o=>{const it=ITEMS[o.id];const hasStats=it?.st&&Object.keys(it.st).length>0;return(
                                              <span key={o.id} {...tipProps(o.id)}
                                                style={{color:hasStats?sk.color:C.ts,fontWeight:hasStats?700:400,borderBottom:hasStats?"1px dashed "+sk.color+"60":"none"}}>
                                                {it?.i||"📦"} {it?.n||o.id}
                                              </span>
                                            );})}
                                            {count>0&&<span style={{color:sk.color,fontWeight:700}}>· ×{count}</span>}
                                          </div>
                                        ):(
                                          <div style={{fontSize:11,color:C.td,fontFamily:FONT_BODY,display:"flex",alignItems:"center",gap:4,flexWrap:"wrap"}}>
                                            <span>🔒 Lv {act.lv} · </span>
                                            {act.out.map(o=>{const it=ITEMS[o.id];const hasStats=it?.st&&Object.keys(it.st).length>0;return(
                                              <span key={o.id} {...tipProps(o.id)}
                                                style={{color:hasStats?"#ffffff40":C.td,borderBottom:hasStats?"1px dashed #ffffff20":"none"}}>
                                                {it?.i||"📦"} {it?.n||o.id}
                                              </span>
                                            );})}
                                          </div>
                                        )}
                                      </div>
                                      {canDo&&(
                                        <div {...tap(e=>{e.stopPropagation?.();isAct?(setCurAct(null),setActProg(0)):startAct(sk.id,act.id);})} style={{padding:"9px 18px",borderRadius:7,background:isAct?"linear-gradient(90deg,"+C.bad+"cc,"+C.bad+")":"linear-gradient(90deg,"+C.accD+","+C.acc+")",color:C.bg,fontSize:12,fontWeight:700,cursor:"pointer",flexShrink:0,fontFamily:FONT,whiteSpace:"nowrap",userSelect:"none",WebkitUserSelect:"none"}}>
                                          {isAct?"STOP":"START"}
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      });
                    })()}
                  </div>
                </div>
              )}

              {/* Combat tab */}
              {mobileTab==="combat"&&(
                <div style={{height:"100%",display:"flex",flexDirection:"column",overflow:"hidden"}}>
                  {/* Active combat HUD */}
                  {cbt&&(()=>{
                    const mob=cbt.mob;
                    const isBoss2=mob.isBoss2;const isBoss=cbt.boss&&!isBoss2;const isElite=mob.elite;
                    const mobColor=isBoss2?C.gold:isBoss?C.bad:isElite?C.purp:C.ts;
                    return(
                      <div style={{flexShrink:0,padding:"10px 14px",background:C.panel,borderBottom:"2px solid "+(isBoss2?C.gold:isBoss?C.bad:isElite?C.purp:C.border)}}>
                        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                          <span style={{fontSize:16,color:mobColor,fontWeight:700}}>{mob.i||"⚔️"} {mob.n}</span>
                          <div style={{display:"flex",gap:8,alignItems:"center"}}>
                            <span style={{fontSize:12,color:C.ts}}>⚔ {cbt?.kills||0}</span>
                            <div onClick={stopZone} style={{padding:"5px 14px",borderRadius:6,background:C.bad+"22",border:"1px solid "+C.bad+"60",color:C.bad,fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:FONT}}>RETREAT</div>
                          </div>
                        </div>
                        <div style={{display:"flex",gap:8}}>
                          <div style={{flex:1}}>
                            <div style={{display:"flex",justifyContent:"space-between",fontSize:11,color:C.td,marginBottom:3}}><span>You</span><span>{Math.floor(cbt.php)}/{cbt.mxhp}</span></div>
                            <div style={{height:7,borderRadius:4,background:C.bg,overflow:"hidden"}}><div style={{width:(cbt.php/cbt.mxhp)*100+"%",height:"100%",background:C.ok,borderRadius:4,transition:"width 0.2s"}}/></div>
                          </div>
                          <div style={{flex:1}}>
                            <div style={{display:"flex",justifyContent:"space-between",fontSize:11,color:C.td,marginBottom:3}}><span>{mob.n}</span><span>{Math.floor(cbt.mhp)}/{mob.hp}</span></div>
                            <div style={{height:7,borderRadius:4,background:C.bg,overflow:"hidden"}}><div style={{width:Math.max(0,(cbt.mhp/mob.hp)*100)+"%",height:"100%",background:C.bad,borderRadius:4,transition:"width 0.2s"}}/></div>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                  {/* Combat log or zone list */}
                  {zoneId?(
                    <div style={{flex:1,overflowY:"auto",padding:"10px 14px",display:"flex",flexDirection:"column",gap:3}}>
                      {clog.slice().reverse().map((l,i)=>(
                        <div key={i} style={{fontSize:12,color:i===0?C.white:C.td,fontFamily:FONT_BODY,opacity:1-i*0.08,padding:"2px 0"}}>{l}</div>
                      ))}
                    </div>
                  ):(
                    <div style={{flex:1,overflowY:"auto",padding:"12px",display:"flex",flexDirection:"column",gap:8}}>
                      {ZONES.map(zone=>{
                        const locked=combatLv<zone.lv;
                        return(
                          <div key={zone.id} style={{padding:"14px",borderRadius:10,background:C.card,border:"1px solid "+C.border,opacity:locked?0.45:1}}>
                            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
                              <span style={{fontSize:16,fontWeight:700,color:locked?C.td:C.white,fontFamily:FONT}}>{zone.icon} {zone.name}</span>
                              {locked
                                ?<span style={{fontSize:12,color:C.td,fontFamily:FONT_BODY}}>🔒 Lv {zone.lv}</span>
                                :<div onClick={()=>startZone(zone.id)} style={{padding:"8px 18px",borderRadius:8,background:"linear-gradient(90deg,"+C.accD+","+C.acc+")",color:C.bg,fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:FONT}}>DIVE IN</div>
                              }
                            </div>
                            <div style={{fontSize:12,color:C.td,fontFamily:FONT_BODY,marginBottom:6}}>Depth Rank {zone.lv}+ · {zone.mobs.length} mobs · {(zone.elites||[]).length} elites</div>
                            <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>
                              {zone.mobs.map((m,i)=><span key={i} style={{fontSize:18}}>{m.i}</span>)}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Bag tab */}
              {mobileTab==="bag"&&(
                <div style={{height:"100%",overflowY:"auto",padding:"12px"}}>
                  {/* Tabs inside bag */}
                  <div style={{display:"flex",marginBottom:12,borderRadius:8,overflow:"hidden",border:"1px solid "+C.border}}>
                    {["inventory","equipment","stats"].map(t=>(
                      <div key={t} onClick={()=>setRightTab(t)} style={{flex:1,padding:"8px",textAlign:"center",fontSize:12,fontWeight:700,fontFamily:FONT_BODY,background:rightTab===t?C.acc:C.card,color:rightTab===t?C.bg:C.td,cursor:"pointer",textTransform:"capitalize"}}>
                        {t==="inventory"?"Inventory":t==="equipment"?"Equipment":"Stats"}
                      </div>
                    ))}
                  </div>
                  {/* Currency row */}
                  {rightTab==="inventory"&&(
                    <div>
                      <div style={{display:"flex",gap:8,marginBottom:12}}>
                        {[{icon:"◈",label:"Credits",val:gold,c:C.gold},{icon:"🔬",label:"RP",val:researchPts,c:C.acc},{icon:"⚡",label:"Energy",val:Math.floor(energy),c:C.warn}].map(s=>(
                          <div key={s.label} style={{flex:1,padding:"8px",borderRadius:8,background:C.card,border:"1px solid "+C.border,textAlign:"center"}}>
                            <div style={{fontSize:18,marginBottom:2}}>{s.icon}</div>
                            <div style={{fontSize:12,color:s.c,fontWeight:700,fontFamily:FONT}}>{s.val>=1e6?(s.val/1e6).toFixed(1)+"M":s.val>=1000?Math.floor(s.val/1000)+"k":Math.floor(s.val)}</div>
                            <div style={{fontSize:10,color:C.td,fontFamily:FONT_BODY}}>{s.label}</div>
                          </div>
                        ))}
                      </div>
                      <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
                        {Object.entries(inv).filter(([id,qty])=>qty>0&&ITEMS[id]).map(([id,qty])=>{
                          const it=ITEMS[id];
                          const rareColor=it.rarity==="rare"?C.gold:it.rarity==="uncommon"?C.purp:null;
                          return(
                            <div key={id} {...tipProps(id)} style={{position:"relative",width:58,height:58,borderRadius:8,background:rareColor?rareColor+"18":C.card,border:"1px solid "+(rareColor?rareColor+"50":C.border),display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:1}}>
                              <span style={{fontSize:24,lineHeight:1}}>{it.i||"📦"}</span>
                              <span style={{fontSize:11,color:rareColor||C.ts,fontWeight:700,fontFamily:FONT}}>{qty>=1000?Math.floor(qty/1000)+"k":qty}</span>
                              {rareColor&&<div style={{position:"absolute",top:0,left:0,right:0,height:2,background:rareColor,borderRadius:"8px 8px 0 0"}}/>}
                            </div>
                          );
                        })}
                        {Object.keys(inv).filter(id=>inv[id]>0).length===0&&<div style={{fontSize:13,color:C.td,fontFamily:FONT_BODY,padding:"20px 0",width:"100%",textAlign:"center"}}>Cargo hold empty</div>}
                      </div>
                    </div>
                  )}
                  {rightTab==="equipment"&&(
                    <div style={{display:"flex",flexDirection:"column",gap:6}}>
                      {ESLOTS.map(slot=>{
                        const iid=eq[slot.id];const it=iid?ITEMS[iid]:null;const el=iid?(enh[iid]||0):0;
                        const setData=it?.set?Object.values(SET_BONUSES).find(s=>s.pieces.includes(iid)):null;
                        return(
                          <div key={slot.id} onMouseEnter={iid?e=>showTip(e,iid):null} onMouseLeave={hideTip}
                            style={{display:"flex",alignItems:"center",gap:10,padding:"12px 14px",borderRadius:8,background:it?"linear-gradient(90deg,"+(setData?setData.color:C.acc)+"10,"+C.card+")":C.card,border:"1px solid "+(setData?setData.color+"50":it?C.acc+"40":C.border),cursor:it?"pointer":"default"}}>
                            <div style={{width:44,height:44,borderRadius:8,background:C.bg,border:"1px solid "+(setData?setData.color+"40":C.border),display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,flexShrink:0}}>{it?it.i:slot.i}</div>
                            <div style={{flex:1}}>
                              <div style={{fontSize:12,color:C.td,fontFamily:FONT_BODY}}>{slot.n}</div>
                              <div style={{fontSize:13,color:setData?setData.color:it?C.white:C.td,fontWeight:600,fontFamily:FONT_BODY}}>{it?(it.n+(el>0?" +"+el:"")):"— empty —"}</div>
                              {it?.st&&<div style={{fontSize:10,color:C.ts,fontFamily:FONT_BODY,marginTop:2}}>{Object.entries(it.st||{}).map(([k,v])=>fmtStat(k,v)).join(" · ")}</div>}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  {rightTab==="stats"&&(
                    <div style={{display:"flex",flexDirection:"column",gap:6}}>
                      {[{l:"Hull HP",v:pStats.hp,c:C.ok,i:"❤️"},{l:"Attack",v:pStats.atk,c:C.bad,i:"⚔️"},{l:"Defense",v:pStats.def,c:C.acc,i:"🛡️"},{l:"Sonic",v:pStats.rng,c:C.okD,i:"🔊"},{l:"Leviathan",v:pStats.mag,c:C.purp,i:"🌀"}].map(s=>(
                        <div key={s.l} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"12px 14px",borderRadius:8,background:C.card,border:"1px solid "+C.border}}>
                          <span style={{fontSize:14,color:C.ts,fontFamily:FONT_BODY}}>{s.i} {s.l}</span>
                          <span style={{fontSize:16,color:s.c,fontWeight:700,fontFamily:FONT}}>{s.v}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Chat tab */}
              {mobileTab==="chat"&&(
                <div style={{height:"100%",display:"flex",flexDirection:"column"}}>
                  <div style={{display:"flex",borderBottom:"1px solid "+C.border,background:C.panel}}>
                    {[{id:"global",label:"General"},{id:"clan",label:"Guild"},{id:"dm",label:"Whisper"}].map(t=>(
                      <div key={t.id} onClick={()=>setChatTab(t.id)} style={{flex:1,padding:"10px 0",textAlign:"center",fontSize:13,fontWeight:700,fontFamily:FONT_BODY,color:chatTab===t.id?C.white:C.td,borderBottom:chatTab===t.id?"3px solid "+C.acc:"3px solid transparent",cursor:"pointer"}}>
                        {t.label}
                      </div>
                    ))}
                  </div>
                  <div style={{flex:1,overflowY:"auto",padding:"8px 14px",display:"flex",flexDirection:"column",gap:3}}>
                    {(chatTab==="global"?chatMessages:chatTab==="clan"?clanChat:dmMessages).map((m,i)=>{
                      const mine=m.uid===account.uid;
                      const name=mine?"You":(chatTab==="dm"?dmTarget?.name:m.name)||"?";
                      const color=chatTab==="clan"?C.gold:mine?C.acc:C.ts;
                      return(
                        <div key={m.id||i} style={{display:"flex",gap:6,alignItems:"baseline"}}>
                          <span style={{fontSize:11,color:C.td,flexShrink:0}}>{new Date(m.ts||Date.now()).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"})}</span>
                          <span style={{fontSize:13,color:color,fontWeight:700,flexShrink:0}}>{name}:</span>
                          <span style={{fontSize:13,color:C.white,fontFamily:FONT_BODY,wordBreak:"break-word"}}>{m.text}</span>
                        </div>
                      );
                    })}
                    {chatTab==="clan"&&!clan&&<div style={{fontSize:13,color:C.td,fontFamily:FONT_BODY,padding:"20px 0",textAlign:"center"}}>Not in a guild yet.</div>}
                    {chatTab==="dm"&&!dmTarget&&<div style={{fontSize:13,color:C.td,fontFamily:FONT_BODY,padding:"20px 0",textAlign:"center"}}>No DM open.</div>}
                    <div ref={chatEndRef}/>
                  </div>
                  <div style={{flexShrink:0,display:"flex",gap:8,padding:"10px 12px",borderTop:"1px solid "+C.border,background:C.panel}}>
                    <input
                      value={chatTab==="global"?chatInput:chatTab==="clan"?clanChatInput:dmInput}
                      onChange={e=>{if(chatTab==="global")setChatInput(e.target.value);else if(chatTab==="clan")setClanChatInput(e.target.value);else setDmInput(e.target.value);}}
                      onKeyDown={e=>{if(e.key!=="Enter")return;if(chatTab==="global")sendChat();else if(chatTab==="clan")sendClanChat();else sendDm();}}
                      placeholder="Message..."
                      style={{flex:1,padding:"10px 14px",borderRadius:8,background:C.card,border:"1px solid "+C.border,color:C.white,fontSize:14,fontFamily:FONT_BODY,outline:"none"}}
                    />
                    <div onClick={()=>{if(chatTab==="global")sendChat();else if(chatTab==="clan")sendClanChat();else sendDm();}} style={{padding:"10px 18px",borderRadius:8,background:C.acc,color:C.bg,fontSize:14,fontWeight:700,cursor:"pointer",fontFamily:FONT_BODY,flexShrink:0}}>Send</div>
                  </div>
                </div>
              )}

              {/* More tab — nav drawer */}
              {mobileTab==="more"&&(
                <div style={{height:"100%",overflowY:"auto",padding:"8px 0"}}>
                  {/* Player card */}
                  <div style={{margin:"0 12px 12px",padding:"14px",borderRadius:10,background:C.card,border:"1px solid "+C.border,display:"flex",alignItems:"center",gap:12}}>
                    <div style={{width:44,height:44,borderRadius:10,background:"linear-gradient(135deg,"+C.acc+","+C.accD+")",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,flexShrink:0}}>🌊</div>
                    <div>
                      <div style={{fontSize:15,fontWeight:700,color:C.white,fontFamily:FONT_BODY}}>{account.displayName}</div>
                      <div style={{fontSize:12,color:C.ts,fontFamily:FONT_BODY}}>Combat Rank {combatLv}</div>
                    </div>
                  </div>
                  {/* Nav pages list */}
                  {[
                    {id:"research",icon:"🔬",label:"Research Tree"},
                    {id:"structures",icon:"🏗️",label:"Structures"},
                    {id:"drones",icon:"🤖",label:"Drone Fleet"},
                    {id:"market",icon:"🏪",label:"Marketplace"},
                    {id:"achievements",icon:"🏆",label:"Achievements",badge:null},
                    {id:"blueprints",icon:"📘",label:"Blueprints",badge:blueprints.length>0?blueprints.length:null},
                    {id:"social",icon:"💬",label:"Social",badge:friendReqs.length>0?friendReqs.length:null},
                    {id:"stats",icon:"📊",label:"Stats & Profile"},
                  ].map(n=>(
                    <div key={n.id} onClick={()=>{setPage(n.id);setMobileTab("_page")}} style={{display:"flex",alignItems:"center",gap:12,padding:"14px 16px",borderBottom:"1px solid "+C.border+"60",cursor:"pointer",background:"transparent",active:{background:C.card}}}>
                      <span style={{fontSize:20,width:28,textAlign:"center",flexShrink:0}}>{n.icon}</span>
                      <span style={{fontSize:14,color:C.text,fontFamily:FONT_BODY,flex:1}}>{n.label}</span>
                      {n.badge!=null&&<span style={{fontSize:11,color:C.white,fontWeight:700,background:C.bad,padding:"2px 8px",borderRadius:10,flexShrink:0}}>{n.badge}</span>}
                      <span style={{fontSize:14,color:C.td}}>›</span>
                    </div>
                  ))}
                  <div onClick={()=>setShowLogoutConfirm(true)} style={{display:"flex",alignItems:"center",gap:12,padding:"14px 16px",cursor:"pointer",marginTop:8}}>
                    <span style={{fontSize:20,width:28,textAlign:"center"}}>🚪</span>
                    <span style={{fontSize:14,color:C.bad,fontFamily:FONT_BODY}}>Logout</span>
                  </div>
                </div>
              )}

              {/* Full page view (from More nav) */}
              {mobileTab==="_page"&&(
                <div style={{height:"100%",display:"flex",flexDirection:"column"}}>
                  <div style={{flexShrink:0,display:"flex",alignItems:"center",gap:10,padding:"10px 14px",borderBottom:"1px solid "+C.border,background:C.panel}}>
                    <div onClick={()=>setMobileTab("more")} style={{fontSize:14,color:C.acc,cursor:"pointer",fontWeight:700,padding:"4px 0"}}>‹ Back</div>
                  </div>
                  <div style={{flex:1,overflowY:"auto"}}>
                    {/* reuse desktop center page content inline — the page state drives it */}
                    <div style={{padding:"4px"}}>
                      {/* This renders the current page — same JSX as desktop center */}
                    </div>
                  </div>
                </div>
              )}

            </div>{/* end mobile content */}

            {/* ── MOBILE BOTTOM NAV ── */}
            <div style={{flexShrink:0,height:60,background:C.panel,borderTop:"1px solid "+C.border,display:"flex",alignItems:"stretch",touchAction:"none"}}>
              {mobileNavItems.map(n=>{
                const active=mobileTab===n.id||(n.id==="more"&&mobileTab==="_page");
                return(
                  <div key={n.id} {...tap(()=>handleMobileTab(n.id))} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:3,cursor:"pointer",background:active?"linear-gradient(180deg,"+C.acc+"15,transparent)":"transparent",borderTop:active?"2px solid "+C.acc:"2px solid transparent",userSelect:"none",WebkitUserSelect:"none"}}>
                    <span style={{fontSize:20,filter:active?"drop-shadow(0 0 5px "+C.acc+")":"none",pointerEvents:"none"}}>{n.icon}</span>
                    <span style={{fontSize:10,color:active?C.acc:C.td,fontWeight:active?700:400,fontFamily:FONT_BODY,letterSpacing:0.5,pointerEvents:"none"}}>{n.label}</span>
                  </div>
                );
              })}
            </div>

          </div>
        );
      })()}

      {/* ===== DESKTOP UI (hidden on mobile) ===== */}
      {!isMobile&&<>

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
              {[{id:"combat",i:"⚔️"},{id:"research",i:"🔬"},{id:"structures",i:"🏗️"},{id:"drones",i:"🤖"},{id:"market",i:"🏪"},{id:"npc_shop",i:"🐙"},{id:"achievements",i:"🏆"},{id:"blueprints",i:"📘"},{id:"equipment",i:"🗡️"},{id:"inventory",i:"🎒"},{id:"social",i:"💬"}].map(n=>(
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
                <NavItem id="market"       icon="🏪" label="Marketplace"/>
                <NavItem id="npc_shop"     icon="🐙" label="NPC Shop"/>
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
              <div style={{height:7,borderRadius:4,background:C.bg,overflow:"hidden"}}>{actProgRef&&<ProgBar progRef={actProgRef} height="100%" radius={4} color={"linear-gradient(90deg,"+C.acc+","+C.ok+")"} glow={GLOW_STYLE}/>}</div>
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
                      <div style={{fontSize:20,fontWeight:700,color:C.white,letterSpacing:2}}>{(skData?.name||"").toUpperCase()}</div>
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
                {/* Skill act renderer — MWI-style slot tabs for prod gear skills */}
                {(()=>{
                  const isGearProdSkill=["fabrication","relic_forging","gear_crafting"].includes(skData.id);

                  // Pass all needed context as props to standalone ActRow
                  const arProps={skColor:skData.color,inv,curAct,startAct,skId:skData.id,s,tipProps,C,FONT,FONT_BODY,ITEMS,BLUEPRINTS,BP_DROPS,BP_RARITY_COLOR,GLOW_OK,GLOW_STYLE,skImg:SKILL_IMAGES[skData.id]};
                  const AR=({act})=><ActRow key={skData.id+"-"+act.id} act={act} {...arProps}/>;

                  // Gathering / Bio Lab / Exploration — flat list, no tabs
                  if(!isGearProdSkill) return <>{allActs.map(act=><AR key={skData.id+"-"+act.id} act={act}/>)}</>;


                  // Gear production skills — MWI-style slot tabs
                  // Determine tabs based on what acts exist for this skill
                  const getActSlot=(act)=>{
                    const outId=act.out&&act.out[0]?.id;
                    if(!outId)return"material";
                    const it=ITEMS[outId];
                    if(!it||!it.eq)return"material";
                    return it.eq; // weapon / head / body / hands / feet / shield / tool / ring / neck
                  };

                  // For gear_crafting: acts already have gearCat; use gearCat filter first
                  const filteredActs=skData.id==="gear_crafting"
                    ?allActs.filter(a=>!a.gearCat||a.gearCat===gearCat)
                    :allActs;

                  // Build tab list dynamically from acts present
                  const slotMeta={
                    material:{label:"Material",icon:"🔧"},
                    weapon:  {label:"Weapon",  icon:"⚔️"},
                    head:    {label:"Head",    icon:"⛑️"},
                    body:    {label:"Body",    icon:"🔵"},
                    hands:   {label:"Hands",   icon:"🧤"},
                    feet:    {label:"Feet",    icon:"👢"},
                    shield:  {label:"Shield",  icon:"🛡️"},
                    tool:    {label:"Tool",    icon:"🛠️"},
                    ring:    {label:"Ring",    icon:"💍"},
                    neck:    {label:"Neck",    icon:"📿"},
                  };
                  const slotOrder=["material","weapon","head","body","hands","feet","shield","tool","ring","neck"];
                  const presentSlots=[...new Set(filteredActs.map(getActSlot))].sort((a,b)=>slotOrder.indexOf(a)-slotOrder.indexOf(b));

                  // For gear_crafting show set-type tabs above slot tabs
                  const gcSets=[
                    {id:"combat",label:"⚔️ Combat"},{id:"cultivation",label:"🌿 Cultivation"},
                    {id:"mining",label:"⛏️ Mining"},{id:"fishing",label:"🎣 Fishing"},
                    {id:"crystal",label:"💎 Crystal"},{id:"trench",label:"🗺️ Trench"},
                  ];

                  // Active slot tab — reset to "material" when switching skills
                  const activeSlot=presentSlots.includes(prodTab)?prodTab:presentSlots[0]||"material";
                  const tabActs=filteredActs.filter(a=>getActSlot(a)===activeSlot);

                  // Tier grouping for gear tabs
                  const tiers=[
                    {label:"T1",min:1, max:24, color:"#94a3b8"},
                    {label:"T2",min:25,max:54, color:"#60a5fa"},
                    {label:"T3",min:55,max:84, color:"#a78bfa"},
                    {label:"T4",min:85,max:120,color:"#fbbf24"},
                  ];
                  const isMaterialTab=activeSlot==="material";

                  return(<>
                    {/* Gear Crafting: set-type row above slot tabs */}
                    {skData.id==="gear_crafting"&&(
                      <div style={{display:"flex",gap:5,flexWrap:"wrap",marginBottom:10}}>
                        {gcSets.map(gs=>(
                          <div key={gs.id} onClick={()=>setGearCat(gs.id)} style={{padding:"4px 12px",borderRadius:12,cursor:"pointer",fontSize:11,fontWeight:700,fontFamily:FONT,
                            background:gearCat===gs.id?skData.color+"30":C.card,
                            border:"1px solid "+(gearCat===gs.id?skData.color:C.border),
                            color:gearCat===gs.id?skData.color:C.td,transition:"all 0.12s"}}>
                            {gs.label}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* MWI-style slot tab bar */}
                    <div style={{display:"flex",gap:0,marginBottom:20,borderBottom:"2px solid "+C.border,overflowX:"auto"}}>
                      {presentSlots.map(slot=>{
                        const meta=slotMeta[slot]||{label:slot,icon:"📦"};
                        const active=activeSlot===slot;
                        return(
                          <div key={slot} onClick={()=>setProdTab(slot)} style={{padding:"9px 16px",cursor:"pointer",fontFamily:FONT,fontSize:11,fontWeight:700,
                            whiteSpace:"nowrap",userSelect:"none",position:"relative",transition:"all 0.12s",
                            color:active?skData.color:C.td,
                            background:active?skData.color+"12":"transparent",
                            borderBottom:active?"2px solid "+skData.color:"2px solid transparent",
                            marginBottom:"-2px"}}>
                            {meta.icon} {meta.label}
                          </div>
                        );
                      })}
                    </div>

                    {/* Tab content */}
                    {isMaterialTab?(
                      // Material tab — flat list (refining chain)
                      tabActs.map(act=><AR key={skData.id+"-"+act.id} act={act}/>)
                    ):(
                      // Gear tabs — grouped by tier
                      tiers.map(tier=>{
                        const ta=tabActs.filter(a=>a.lv>=tier.min&&a.lv<=tier.max);
                        if(!ta.length)return null;
                        return(
                          <div key={tier.label} style={{marginBottom:20}}>
                            <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:8}}>
                              <span style={{fontSize:9,fontWeight:700,color:tier.color,padding:"2px 8px",borderRadius:4,background:tier.color+"20",border:"1px solid "+tier.color+"40",letterSpacing:2}}>{tier.label}</span>
                              <span style={{fontSize:9,color:C.td,fontFamily:FONT}}>Lv {tier.min}–{tier.max}</span>
                            </div>
                            {ta.map(act=><AR key={skData.id+"-"+act.id} act={act}/>)}
                          </div>
                        );
                      })
                    )}
                  </>);
                })()}
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
                              <div style={{fontSize:10,fontWeight:700,color:C.td,fontFamily:FONT}}>??? BLUEPRINT ({(bp.rarity||"").toUpperCase()})</div>
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
                            <div style={{fontSize:12,fontWeight:700,color:lv>0?col:C.white,fontFamily:FONT,letterSpacing:1}}>{(st?.name||"").toUpperCase()}</div>
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
                                <span key={k} {...tipProps(k)} style={{padding:"2px 8px",borderRadius:4,background:have?C.ok+"15":C.bad+"15",border:"1px solid "+(have?C.ok+"35":C.bad+"35"),fontSize:10,color:have?C.ok:C.bad,fontFamily:FONT_BODY}}>{ITEMS[k]?ITEMS[k].i:k} {cost[k]}<span style={{opacity:0.6}}> / {inv[k]||0}</span></span>
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
                            <div style={{fontSize:12,fontWeight:700,color:deployed>0?col:C.white,fontFamily:FONT,letterSpacing:1}}>{(dt?.name||"").toUpperCase()}</div>
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
                              <span key={o.id} {...tipProps(o.id)} style={{fontSize:10,color:C.text,fontFamily:FONT_BODY}}>
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
                              <span key={k} {...tipProps(k)} style={{padding:"2px 8px",borderRadius:4,background:have?C.ok+"15":C.bad+"15",border:"1px solid "+(have?C.ok+"35":C.bad+"35"),fontSize:10,color:have?C.ok:C.bad,fontFamily:FONT_BODY}}>{ITEMS[k]?ITEMS[k].i:k} {cost[k]}<span style={{opacity:0.6}}> / {inv[k]||0}</span></span>
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
                            <span {...tipProps(order.itemId)} style={{fontSize:20}}>{it?it.i:"📦"}</span>
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
                              <div key={id} {...tipProps(id)} onClick={()=>setSellItem(id)} style={{padding:"8px 10px",borderRadius:6,background:sellItem===id?C.acc+"20":C.bg,border:"1px solid "+(sellItem===id?C.acc+"60":C.border),cursor:"pointer",transition:"all 0.15s"}}>
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
                            <span {...tipProps(order.itemId)} style={{fontSize:20}}>{it?it.i:"📦"}</span>
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

            {/* ===== NPC SHOP PAGE ===== */}
            {page==="npc_shop"&&(()=>{
              // Only items in inventory that have a base value (v) set
              const shopItems=Object.entries(inv)
                .filter(([id,qty])=>qty>0&&ITEMS[id]?.v)
                .sort((a,b)=>(ITEMS[b[0]].v||0)-(ITEMS[a[0]].v||0));

              const npcCatFilter=(id)=>{
                const it=ITEMS[id];
                if(npcCat==="all")return true;
                if(npcCat==="mat")return it.s&&!it.rare&&!it.food&&!it.eq;
                if(npcCat==="rare")return !!it.rare;
                if(npcCat==="food")return !!it.food;
                if(npcCat==="eq")return !!it.eq;
                return true;
              };
              const visible=shopItems.filter(([id])=>npcCatFilter(id));
              const totalVal=visible.reduce((s,[id,qty])=>s+ITEMS[id].v*qty,0);

              const doSell=(id,qty)=>{
                const it=ITEMS[id]; if(!it?.v||qty<=0)return;
                remIt(id,qty);
                setGold(g=>g+it.v*qty);
                setNpcLog(l=>[{id,qty,earn:it.v*qty},...l.slice(0,19)]);
              };
              const doSellAll=()=>{
                let total=0;
                visible.forEach(([id,qty])=>{const it=ITEMS[id];if(it?.v){remIt(id,qty);total+=it.v*qty;}});
                setGold(g=>g+total);
                setNpcLog(l=>[{id:"_all",qty:visible.length,earn:total},...l.slice(0,19)]);
              };

              return(
              <div style={{maxWidth:760}}>
                {/* Header */}
                <div style={{display:"flex",alignItems:"baseline",gap:12,marginBottom:16}}>
                  <div style={{fontSize:20,fontWeight:700,color:C.white,letterSpacing:2}}>🐙 NPC SHOP</div>
                  <div style={{fontSize:11,color:C.ts,fontFamily:FONT_BODY}}>Fixed base prices — sell your items back to the game</div>
                  <div style={{marginLeft:"auto",fontSize:14,fontWeight:700,color:C.gold,fontFamily:FONT}}>◈ {fmt(gold)}</div>
                </div>

                {/* Category tabs */}
                <div style={{display:"flex",gap:5,marginBottom:12}}>
                  {NPC_CATS.map(cat=>(
                    <div key={cat.id} onClick={()=>setNpcCat(cat.id)} style={{padding:"5px 14px",borderRadius:6,cursor:"pointer",fontSize:10,fontWeight:700,fontFamily:FONT,letterSpacing:1,
                      background:npcCat===cat.id?C.acc+"30":C.card,
                      color:npcCat===cat.id?C.acc:C.td,
                      border:"1px solid "+(npcCat===cat.id?C.acc+"80":C.border)}}>
                      {cat.icon} {cat.label}
                    </div>
                  ))}
                </div>

                {/* Sell-all bar */}
                {visible.length>0&&(
                  <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"8px 14px",borderRadius:8,background:C.card,border:"1px solid "+C.border,marginBottom:12}}>
                    <span style={{fontSize:11,color:C.ts,fontFamily:FONT_BODY}}>
                      {visible.length} items · <span style={{color:C.gold,fontWeight:700}}>◈ {fmt(totalVal)}</span> total
                    </span>
                    <div onClick={doSellAll} style={{padding:"5px 16px",borderRadius:6,background:"linear-gradient(90deg,"+C.warn+"cc,"+C.gold+")",color:"#000",fontSize:10,fontWeight:700,cursor:"pointer",letterSpacing:1,fontFamily:FONT}}>
                      SELL ALL
                    </div>
                  </div>
                )}

                {/* Item rows — MWI style: icon · name · qty · value · sell button */}
                {visible.length===0?(
                  <div style={{padding:"48px 0",textAlign:"center",color:C.td,fontFamily:FONT_BODY,fontSize:12}}>
                    <div style={{fontSize:36,marginBottom:10}}>🐙</div>
                    Nothing to sell. Get out there and gather!
                  </div>
                ):(
                  <div style={{display:"flex",flexDirection:"column",gap:2}}>
                    {/* Column header */}
                    <div style={{display:"grid",gridTemplateColumns:"36px 1fr 80px 80px 90px 90px",gap:8,padding:"4px 10px",fontSize:9,color:C.td,fontFamily:FONT,letterSpacing:1,marginBottom:2}}>
                      <span/>
                      <span>ITEM</span>
                      <span style={{textAlign:"right"}}>OWNED</span>
                      <span style={{textAlign:"right"}}>VALUE EA.</span>
                      <span style={{textAlign:"right"}}>TOTAL</span>
                      <span/>
                    </div>
                    {visible.map(([id,qty])=>{
                      const it=ITEMS[id];
                      return(
                        <div key={id} style={{display:"grid",gridTemplateColumns:"36px 1fr 80px 80px 90px 90px",gap:8,alignItems:"center",
                          padding:"8px 10px",borderRadius:6,background:C.card,border:"1px solid "+C.border,
                          borderLeft:"3px solid "+(it.rare?C.gold:it.food?C.ok:it.eq?C.acc:C.border)}}>
                          {/* Icon */}
                          <span {...tipProps(id)} style={{fontSize:20,textAlign:"center",filter:it.rare?"drop-shadow(0 0 5px "+C.gold+")":"none"}}>{it.i}</span>
                          {/* Name */}
                          <div style={{fontWeight:700,fontSize:12,color:it.rare?C.gold:C.white,fontFamily:FONT,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{it.n}</div>
                          {/* Owned qty */}
                          <div style={{textAlign:"right",fontSize:12,color:C.text,fontFamily:FONT}}>×{fmt(qty)}</div>
                          {/* Value each */}
                          <div style={{textAlign:"right",fontSize:12,color:C.gold,fontFamily:FONT,fontWeight:700}}>◈{it.v}</div>
                          {/* Total */}
                          <div style={{textAlign:"right",fontSize:11,color:C.ts,fontFamily:FONT_BODY}}>◈{fmt(it.v*qty)}</div>
                          {/* Sell button */}
                          <div onClick={()=>doSell(id,qty)} style={{padding:"5px 0",borderRadius:5,background:"linear-gradient(90deg,"+C.accD+","+C.acc+")",color:C.bg,
                            fontSize:10,fontWeight:700,textAlign:"center",cursor:"pointer",letterSpacing:1,fontFamily:FONT}}>
                            SELL ALL
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Recent sales */}
                {npcLog.length>0&&(
                  <div style={{marginTop:20,paddingTop:16,borderTop:"1px solid "+C.border}}>
                    <div style={{fontSize:9,fontWeight:700,color:C.td,letterSpacing:2,marginBottom:8}}>RECENT SALES</div>
                    {npcLog.map((l,i)=>(
                      <div key={i} style={{display:"flex",justifyContent:"space-between",fontSize:11,color:C.ts,fontFamily:FONT_BODY,padding:"3px 0",opacity:1-i*0.04}}>
                        <span>{l.id==="_all"?"Sold "+l.qty+" item types":(ITEMS[l.id]?.i||"")+" "+(ITEMS[l.id]?.n||l.id)+" ×"+l.qty}</span>
                        <span style={{color:C.gold,fontWeight:700}}>+◈{fmt(l.earn)}</span>
                      </div>
                    ))}
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
                              {ach.reward.rp&&<span style={{fontSize:9,color:C.acc,padding:"1px 7px",borderRadius:4,background:C.acc+"12",border:"1px solid "+C.acc+"25"}}>+{ach.reward.rp} RP</span>}
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
              const cats=["gather","prod"];
              const catLabels={gather:"Gathering",prod:"Production"};
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
                      🧭 Blueprints are found exclusively through Exploration. Run exploration operations in the Skills tab to discover hidden recipes that permanently unlock powerful new actions.
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
                                    <div style={{fontSize:8,padding:"1px 6px",borderRadius:6,background:col+"20",border:"1px solid "+col+"50",color:col,fontWeight:700,letterSpacing:1}}>{(bp.rarity||"").toUpperCase()}</div>
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
                                        VIEW IN {(sk?.name||"SKILL").toUpperCase()} →
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
                  <div style={{fontSize:11,fontWeight:700,color:"#38bdf8",letterSpacing:2,marginBottom:6}}>HOW TO FIND BLUEPRINTS</div>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6}}>
                    {[
                      {act:"🚢 Survey Submarine Wreck", lv:"Lv 1",  bps:"Void Kelp, Leviathan Scale"},
                      {act:"🏚️ Probe Research Facility",lv:"Lv 25", bps:"Void Crystal, Ancient Brew"},
                      {act:"📡 Follow Deep Signal",     lv:"Lv 50", bps:"Thermal Forge, Void Reactor"},
                      {act:"💎 Excavate Crystal Vein",  lv:"Lv 75", bps:"Ancient Emperor Armor"},
                    ].map(row=>(
                      <div key={row.act} style={{fontSize:9,fontFamily:FONT_BODY}}>
                        <div style={{color:C.gold,fontWeight:700,marginBottom:2}}>{row.act} <span style={{color:C.td,fontWeight:400}}>({row.lv})</span></div>
                        <div style={{color:C.ts}}>{row.bps}</div>
                      </div>
                    ))}
                  </div>
                  <div onClick={()=>setPage("skills")} style={{marginTop:10,padding:"5px 12px",borderRadius:6,background:"#38bdf820",border:"1px solid #38bdf850",color:"#38bdf8",fontSize:9,fontWeight:700,cursor:"pointer",display:"inline-block",fontFamily:FONT,letterSpacing:1}}>
                    GO TO EXPLORATION →
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
                              <div style={{fontSize:9,color:C.ts,fontFamily:FONT_BODY}}>Lv {f.totalSkillLv||"?"}</div>
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
                          <div style={{fontSize:9,color:C.ts,fontFamily:FONT_BODY}}>⚔ {entry.kills||0} kills</div>
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
                        <span style={{fontSize:10,color:C.acc,fontWeight:700,padding:"2px 8px",borderRadius:8,background:C.acc+"18",border:"1px solid "+C.acc+"40"}}>⭐ Skill Lv {totalSkillLevel}</span>
                        <span style={{fontSize:10,color:C.gold,fontWeight:700,padding:"2px 8px",borderRadius:8,background:C.gold+"18",border:"1px solid "+C.gold+"40"}}>🏆 {Object.keys(achievements).length} Achievements</span>
                      </div>
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
                    {label:"Blueprints",value:fmt(blueprints.length),icon:"📘",color:C.acc},
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
                      <div key={id} {...tipProps(id)} onClick={()=>setFood(id)} style={{padding:"8px 16px",borderRadius:8,background:food===id?C.ok+"20":C.bg,border:"2px solid "+(food===id?C.ok:C.border),cursor:"pointer",fontSize:13,color:C.text,fontFamily:FONT_BODY,boxShadow:food===id?GLOW_OK:"none",display:"flex",alignItems:"center",gap:6}}>
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
                            {zone.icon} {(zone?.name||"").toUpperCase()}
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
                {/* Active set bonuses summary */}
                {(()=>{const active=Object.values(SET_BONUSES).filter(s=>s.pieces.filter(p=>Object.values(eq).includes(p)).length>=2);
                  if(!active.length)return null;
                  return(<div style={{marginBottom:14,display:"flex",flexWrap:"wrap",gap:6}}>
                    {active.map(s=>{const n=s.pieces.filter(p=>Object.values(eq).includes(p)).length;const b=s.bonuses[n>=4?4:2];return(
                      <div key={s.name} style={{padding:"4px 10px",borderRadius:16,background:s.color+"20",border:"1px solid "+s.color+"60",fontSize:10,color:s.color,fontFamily:FONT,fontWeight:700}}>
                        {n>=4?"★":"◑"} {s.name} {n}pc — {b.label}
                      </div>);})}</div>);})()}
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                  {ESLOTS.map(slot=>{const iid=eq[slot.id];const it=iid?ITEMS[iid]:null;const el=iid?(enh[iid]||0):0;
                    const setData=it?.set?Object.values(SET_BONUSES).find(s=>s.pieces.includes(iid)):null;
                    return(
                    <div key={slot.id} onMouseEnter={iid?e=>showTip(e,iid):null} onMouseLeave={hideTip}
                      style={{padding:"12px 14px",borderRadius:8,background:C.card,border:"1px solid "+(setData?setData.color+"50":it?C.acc+"40":C.border),boxShadow:it?GLOW_STYLE:"none",cursor:it?"pointer":"default",transition:"border-color 0.15s"}}>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
                        <span style={{fontSize:10,color:C.ts,fontFamily:FONT_BODY}}>{slot.i} {slot.n}</span>
                        {it&&<span onClick={()=>unequipIt(slot.id)} style={{fontSize:9,color:C.bad,cursor:"pointer",fontFamily:FONT,letterSpacing:1}}>REMOVE</span>}
                      </div>
                      {it?(
                        <div>
                          <div style={{fontSize:12,fontWeight:700,color:setData?setData.color:C.white,fontFamily:FONT}}>{it.i} {it.n}{el>0?" +"+el:""}</div>
                          {it.st&&<div style={{fontSize:10,color:C.ts,marginTop:4,fontFamily:FONT_BODY,lineHeight:1.6}}>
                            {Object.entries(it.st||{}).map(([k,v])=><span key={k} style={{display:"block"}}>{fmtStat(k,Math.floor(typeof v==="number"&&v<1?v:(v*(1+el*0.08))))}</span>)}
                          </div>}
                          {setData&&<div style={{fontSize:9,color:setData.color,marginTop:4,fontFamily:FONT,letterSpacing:0.5}}>◈ {setData.name}</div>}
                        </div>
                      ):(<div style={{fontSize:11,color:C.td,fontFamily:FONT_BODY}}>— Empty Slot —</div>)}
                    </div>
                  );})}
                </div>
              </div>
            )}

            {/* ENHANCING PAGE */}
            {page==="enhancing"&&(()=>{
              const enhSlots=ESLOTS.map(slot=>({slot,iid:eq[slot.id]})).filter(x=>x.iid);
              const selSlot=enhSlots.find(x=>x.slot.id===(enhSel||enhSlots[0]?.slot.id));
              const selIid=selSlot?.iid;
              const selIt=selIid?ITEMS[selIid]:null;
              const selCl=selIid?(enh[selIid]||0):0;
              const selCost=Math.floor(50*Math.pow(1.5,selCl));
              const selRate=Math.max(20,Math.floor((0.8-selCl*0.05)*100));
              const canUpgrade=selIid&&gold>=selCost&&selCl<20;
              return(
              <div style={{maxWidth:600}}>
                {/* Header */}
                <div style={{marginBottom:16}}>
                  <div style={{fontSize:14,fontWeight:700,color:C.warn,letterSpacing:2,marginBottom:4}}>⚡ UPGRADE LAB</div>
                  <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:6}}>
                    <div style={{fontSize:11,color:C.ts,fontFamily:FONT_BODY}}>Lab Lv {sl("enhancing").lv}</div>
                    <div style={{flex:1,height:5,borderRadius:3,background:C.card,overflow:"hidden"}}>
                      <div style={{width:(sl("enhancing").xp/(sl("enhancing").need||1))*100+"%",height:"100%",borderRadius:3,background:C.warn,transition:"width 0.3s"}}/>
                    </div>
                    <div style={{fontSize:10,color:C.warn,fontFamily:FONT,fontWeight:700}}>{fmt(sl("enhancing").xp)}/{fmt(sl("enhancing").need)}</div>
                  </div>
                  <div style={{fontSize:10,color:"#f87171",fontFamily:FONT_BODY}}>⚠ Failed upgrades reset to +0. Higher levels have lower success rates.</div>
                </div>

                {enhSlots.length===0?(
                  <div style={{padding:40,textAlign:"center",background:C.card,borderRadius:12,border:"1px dashed "+C.border}}>
                    <div style={{fontSize:28,marginBottom:8}}>🗡️</div>
                    <div style={{fontSize:12,color:C.td,fontFamily:FONT_BODY}}>No equipment found. Equip gear in the Equipment tab first.</div>
                  </div>
                ):(
                  <div style={{display:"flex",gap:16}}>
                    {/* Left — slot picker */}
                    <div style={{width:160,flexShrink:0}}>
                      <div style={{fontSize:9,fontWeight:700,color:C.td,letterSpacing:2,marginBottom:8}}>EQUIPPED GEAR</div>
                      {enhSlots.map(({slot,iid})=>{
                        const it=ITEMS[iid];const cl=enh[iid]||0;
                        const isSel=(enhSel||enhSlots[0]?.slot.id)===slot.id;
                        const col=cl>=15?"#ffd60a":cl>=10?"#c084fc":cl>=5?C.ok:C.border;
                        return(
                          <div key={slot.id} onClick={()=>setEnhSel(slot.id)}
                            style={{padding:"10px 12px",borderRadius:8,background:isSel?"linear-gradient(135deg,"+C.warn+"18,"+C.card+")":C.card,
                            border:"2px solid "+(isSel?C.warn:col+"60"),marginBottom:6,cursor:"pointer",transition:"all 0.15s"}}>
                            <div style={{fontSize:18,marginBottom:2}}>{it.i}</div>
                            <div style={{fontSize:10,fontWeight:700,color:isSel?C.warn:C.white,fontFamily:FONT,lineHeight:1.2}}>{it.n}</div>
                            <div style={{fontSize:9,color:col,fontFamily:FONT,fontWeight:700,marginTop:2}}>+{cl}{cl>=20?" MAX":""}</div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Right — upgrade panel */}
                    {selIt&&(
                      <div style={{flex:1}}>
                        {/* Item card */}
                        <div style={{padding:"16px 20px",borderRadius:12,background:"linear-gradient(135deg,"+C.warn+"12,"+C.card+")",
                          border:"2px solid "+C.warn+"50",marginBottom:12,boxShadow:"0 0 20px "+C.warn+"15"}}>
                          <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:12}}>
                            <div style={{fontSize:36,filter:"drop-shadow(0 0 10px "+C.warn+")"}}>{selIt.i}</div>
                            <div>
                              <div style={{fontSize:14,fontWeight:700,color:C.warn,fontFamily:FONT}}>{selIt.n}</div>
                              <div style={{fontSize:11,color:C.ts,fontFamily:FONT_BODY}}>{selSlot?.slot.label}</div>
                            </div>
                            <div style={{marginLeft:"auto",textAlign:"center"}}>
                              <div style={{fontSize:28,fontWeight:700,color:selCl>=15?"#ffd60a":selCl>=10?"#c084fc":selCl>=5?C.ok:C.white,fontFamily:FONT,lineHeight:1}}>+{selCl}</div>
                              <div style={{fontSize:9,color:C.td,fontFamily:FONT_BODY}}>{selCl>=20?"MAX LEVEL":"Enhancement"}</div>
                            </div>
                          </div>

                          {/* Enhancement level bar */}
                          <div style={{marginBottom:12}}>
                            <div style={{display:"flex",gap:3}}>
                              {Array.from({length:20},(_,i)=>{
                                const filled=i<selCl;
                                const col=i>=14?"#ffd60a":i>=9?"#c084fc":i>=4?C.ok:C.acc;
                                return <div key={i} style={{flex:1,height:6,borderRadius:2,background:filled?col:C.bg,boxShadow:filled?"0 0 4px "+col+"80":"none",transition:"all 0.2s"}}/>;
                              })}
                            </div>
                            <div style={{display:"flex",justifyContent:"space-between",fontSize:8,color:C.td,fontFamily:FONT,marginTop:3}}>
                              <span>+0</span><span style={{color:C.ok}}>+5</span><span style={{color:"#c084fc"}}>+10</span><span style={{color:"#ffd60a"}}>+15</span><span>+20</span>
                            </div>
                          </div>

                          {/* Stats */}
                          {selIt.st&&(
                            <div style={{display:"flex",flexWrap:"wrap",gap:4,marginBottom:8}}>
                              {Object.entries(selIt.st||{}).map(([k,v])=>{
                                const base=v;const boosted=typeof v==="number"?Math.floor(v*(1+selCl*0.08)):v;
                                return(
                                  <div key={k} style={{padding:"3px 8px",borderRadius:5,background:C.bg,border:"1px solid "+C.border,fontSize:9,fontFamily:FONT_BODY}}>
                                    <span style={{color:C.ts}}>{STAT_LABELS[k]||k}: </span>
                                    <span style={{color:C.ok,fontWeight:700}}>{typeof base==="number"&&base<1?"+"+Math.round(boosted*100)+"%":"+"+boosted}</span>
                                    {selCl>0&&typeof base==="number"&&<span style={{color:C.gold,fontSize:8}}> (base {base<1?"+"+Math.round(base*100)+"%":"+"+base})</span>}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>

                        {/* Upgrade info + button */}
                        <div style={{padding:"14px 16px",borderRadius:10,background:C.card,border:"1px solid "+C.border,marginBottom:12}}>
                          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:12}}>
                            <div style={{textAlign:"center"}}>
                              <div style={{fontSize:9,color:C.td,fontFamily:FONT,letterSpacing:1,marginBottom:3}}>COST</div>
                              <div style={{fontSize:14,fontWeight:700,color:gold>=selCost?C.gold:"#f87171",fontFamily:FONT}}>◈{fmt(selCost)}</div>
                            </div>
                            <div style={{textAlign:"center"}}>
                              <div style={{fontSize:9,color:C.td,fontFamily:FONT,letterSpacing:1,marginBottom:3}}>SUCCESS</div>
                              <div style={{fontSize:14,fontWeight:700,color:selRate>=60?C.ok:selRate>=40?C.warn:"#f87171",fontFamily:FONT}}>{selRate}%</div>
                            </div>
                            <div style={{textAlign:"center"}}>
                              <div style={{fontSize:9,color:C.td,fontFamily:FONT,letterSpacing:1,marginBottom:3}}>NEXT</div>
                              <div style={{fontSize:14,fontWeight:700,color:C.white,fontFamily:FONT}}>{selCl>=20?"—":"+"+(selCl+1)}</div>
                            </div>
                          </div>
                          <div onClick={()=>{if(canUpgrade)doEnh(selSlot.slot.id)}}
                            style={{width:"100%",padding:"12px 0",borderRadius:8,textAlign:"center",fontFamily:FONT,fontSize:12,fontWeight:700,letterSpacing:1,
                            background:canUpgrade?"linear-gradient(90deg,"+C.warn+"cc,"+C.gold+")":C.bg,
                            color:canUpgrade?C.bg:C.td,cursor:canUpgrade?"pointer":"default",
                            opacity:selCl>=20?0.4:1,
                            boxShadow:canUpgrade?"0 0 16px "+C.gold+"55":"none",
                            border:"1px solid "+(canUpgrade?C.gold+"80":C.border),transition:"all 0.15s"}}>
                            {selCl>=20?"MAX LEVEL REACHED":canUpgrade?"⚡ UPGRADE TO +"+(selCl+1):"NOT ENOUGH ◈"}
                          </div>
                        </div>

                        {/* Upgrade log */}
                        {clog.filter(l=>l.includes("upgraded")||l.includes("reset")).length>0&&(
                          <div style={{padding:"10px 14px",borderRadius:8,background:C.card,border:"1px solid "+C.border}}>
                            <div style={{fontSize:9,color:C.td,letterSpacing:2,fontFamily:FONT,marginBottom:6}}>UPGRADE LOG</div>
                            {clog.filter(l=>l.includes("upgraded")||l.includes("reset")||l.includes("💥")||l.includes("✨")).slice(-5).reverse().map((l,i)=>(
                              <div key={i} style={{fontSize:10,fontFamily:FONT_BODY,color:l.includes("💥")?"#f87171":C.ok,marginBottom:2}}>{l}</div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );})()}

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
                        <div key={id} {...tipProps(id)} style={{padding:"10px 12px",borderRadius:8,background:"linear-gradient(135deg,"+C.gold+"18,"+C.card+")",border:"2px solid "+C.gold+"50",boxShadow:"0 0 10px "+C.gold+"25",textAlign:"center"}}>
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
                      {Object.entries(inv).filter(([id])=>ITEMS[id]&&ITEMS[id].eq).map(([id,qty])=>{const it=ITEMS[id];
                        const setData=it.set?Object.values(SET_BONUSES).find(s=>s.pieces.includes(id)):null;
                        return(
                        <div key={id} onMouseEnter={e=>showTip(e,id)} onMouseLeave={hideTip}
                          style={{padding:"10px 12px",borderRadius:6,background:C.card,border:"1px solid "+(setData?setData.color+"50":C.acc+"30"),boxShadow:GLOW_STYLE,position:"relative",cursor:"pointer"}}>
                          <div style={{fontSize:12,fontWeight:700,color:setData?setData.color:C.white,fontFamily:FONT}}>{it.i} {it.n}</div>
                          <div style={{fontSize:9,color:C.ts,fontFamily:FONT_BODY,marginTop:2}}>×{qty}</div>
                          {it.st&&<div style={{fontSize:9,color:C.td,marginTop:2,fontFamily:FONT_BODY,lineHeight:1.5}}>{Object.entries(it.st||{}).map(([k,v])=><span key={k} style={{display:"block"}}>{fmtStat(k,v)}</span>)}</div>}
                          {setData&&<div style={{fontSize:8,color:setData.color,marginTop:3,fontFamily:FONT,letterSpacing:0.5}}>◈ {setData.name}</div>}
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
                        <div key={id} {...tipProps(id)} style={{padding:"10px 12px",borderRadius:6,background:C.card,border:"1px solid "+C.ok+"30"}}>
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
                      <div key={id} {...tipProps(id)} style={{padding:"8px 12px",borderRadius:6,background:C.card,border:"1px solid "+C.border,display:"flex",alignItems:"center",gap:8}}>
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
                              <div key={id} {...tipProps(id)} style={{position:"relative",width:52,height:52,borderRadius:6,background:rareColor?rareColor+"18":C.card,border:"1px solid "+(rareColor?rareColor+"50":C.border),display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:1,flexShrink:0,overflow:"hidden"}}>
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
                    <div key={slot.id} {...(iid?tipProps(iid):{})} onClick={()=>it&&setPage("equipment")} style={{display:"flex",alignItems:"center",gap:10,padding:"7px 8px",borderRadius:8,background:it?"linear-gradient(90deg,"+C.acc+"10,"+C.card+")":C.card,border:"1px solid "+(it?C.acc+"40":C.border),marginBottom:6,cursor:it?"pointer":"default"}}>
                      <div style={{width:40,height:40,borderRadius:6,background:C.bg,border:"1px solid "+C.border,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,flexShrink:0}}>
                        {it?it.i:slot.i}
                      </div>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{fontSize:11,color:C.td,fontFamily:FONT_BODY,marginBottom:2}}>{slot.n}</div>
                        {it
                          ?<div style={{fontSize:12,color:C.white,fontWeight:600,fontFamily:FONT_BODY}}>{it.n}{el>0&&<span style={{color:C.gold}}> +{el}</span>}</div>
                          :<div style={{fontSize:12,color:C.td,fontFamily:FONT_BODY}}>— empty —</div>
                        }
                        {it?.st&&<div style={{fontSize:10,color:C.ts,fontFamily:FONT_BODY}}>{Object.entries(it.st||{}).map(([k,v])=>(k||"").toUpperCase()+":+"+(typeof v==="number"?Math.floor(v*(1+el*0.08)):v)).join(" ")}</div>}
                      </div>
                    </div>
                  );
                })}
                {bpLog.length>0&&(
                  <div style={{marginTop:12}}>
                    <div style={{fontSize:11,fontWeight:700,color:C.gold,letterSpacing:1,marginBottom:6,textTransform:"uppercase"}}>Recent Blueprints</div>
                    {bpLog.slice(-5).reverse().map((l,i)=>(
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
                            {actProgRef&&<ProgBar progRef={actProgRef} height="100%" radius={2} color={"linear-gradient(90deg,"+C.accD+","+C.acc+")"}/>}
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

      </>}{/* end desktop UI */}

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
