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
  bg: "#0f1117", bgDeep: "#0a0c10", sidebar: "#12141c", sidebarBorder: "#1e2030",
  sidebarActive: "#1a1d2e", sidebarHover: "#161928", card: "#171a24", cardBorder: "#222538",
  header: "#12141c", headerBorder: "#1e2030",
  accent: "#6366f1", accentMuted: "#6366f120",
  success: "#22c55e", successMuted: "#22c55e18",
  danger: "#ef4444", dangerMuted: "#ef444418",
  warning: "#eab308", warningMuted: "#eab30818",
  info: "#06b6d4", infoMuted: "#06b6d418",
  purple: "#a855f7", purpleMuted: "#a855f718",
  orange: "#f97316", orangeMuted: "#f9731618",
  teal: "#14b8a6", tealMuted: "#14b8a618",
  pink: "#ec4899", pinkMuted: "#ec489918",
  text: "#e1e4ea", textSec: "#8890a6", textDim: "#505670", textSoft: "#9096a8",
  white: "#f0f2f8", gold: "#fbbf24", bar: "#1e2030", divider: "#1e2030",
  r: 10, rs: 6,
  // Rarity colors
  rarCommon: "#9ca3af", rarUncommon: "#22c55e", rarRare: "#3b82f6",
  rarEpic: "#a855f7", rarLegendary: "#f59e0b", rarMythic: "#ef4444", rarGod: "#ff2d55",
};

const FONT = `"Inter", "Segoe UI", system-ui, -apple-system, sans-serif`;

// ═══════════════════════════════════════════════
// STAGE SYSTEM (Blade Idle-style)
// ═══════════════════════════════════════════════
// Stages are organized as chapters with 50 stages each.
// Each stage has a set number of monsters to clear.
// Boss stages appear every 10th stage.
// ═══════════════════════════════════════════════

const CHAPTERS = [
  { id: 1, name: "Sunlit Meadow", emoji: "🌾", color: "#8bc34a", bgGrad: "linear-gradient(135deg, #1a2e0a, #0f1117)" },
  { id: 2, name: "Darkstone Caves", emoji: "🕳️", color: "#78909c", bgGrad: "linear-gradient(135deg, #1a1e24, #0f1117)" },
  { id: 3, name: "Rotwood Swamp", emoji: "🌿", color: "#689f38", bgGrad: "linear-gradient(135deg, #0e1f0e, #0f1117)" },
  { id: 4, name: "Shattered Ruins", emoji: "🏛️", color: "#8d6e63", bgGrad: "linear-gradient(135deg, #1f1810, #0f1117)" },
  { id: 5, name: "Emberpeak Volcano", emoji: "🌋", color: "#ff5722", bgGrad: "linear-gradient(135deg, #2a0f08, #0f1117)" },
  { id: 6, name: "The Hollow Abyss", emoji: "🕳️", color: "#7c4dff", bgGrad: "linear-gradient(135deg, #1a0f2a, #0f1117)" },
  { id: 7, name: "Titan's Domain", emoji: "⚡", color: "#ffd600", bgGrad: "linear-gradient(135deg, #2a2400, #0f1117)" },
  { id: 8, name: "Celestial Rift", emoji: "✨", color: "#e040fb", bgGrad: "linear-gradient(135deg, #2a0a2a, #0f1117)" },
];

const STAGE_MONSTERS_PER_CHAPTER = [
  // Chapter 1 monsters
  [
    { name: "Slime", emoji: "🟢" }, { name: "Rat", emoji: "🐀" }, { name: "Goblin", emoji: "👺" },
    { name: "Skeleton", emoji: "💀" }, { name: "Wild Boar", emoji: "🐗" },
  ],
  // Chapter 2 monsters
  [
    { name: "Wolf", emoji: "🐺" }, { name: "Cave Spider", emoji: "🕷️" }, { name: "Orc", emoji: "👹" },
    { name: "Stone Troll", emoji: "🪨" }, { name: "Dark Bat", emoji: "🦇" },
  ],
  // Chapter 3 monsters
  [
    { name: "Bog Lurker", emoji: "🐸" }, { name: "Venomfang", emoji: "🐍" }, { name: "Dark Mage", emoji: "🧙" },
    { name: "Plague Bearer", emoji: "🤢" }, { name: "Swamp Thing", emoji: "🌿" },
  ],
  // Chapter 4 monsters
  [
    { name: "Haunted Armor", emoji: "🛡️" }, { name: "Wraith", emoji: "👻" }, { name: "Golem", emoji: "🗿" },
    { name: "Dragon", emoji: "🐉" }, { name: "Death Knight", emoji: "⚔️" },
  ],
  // Chapter 5 monsters
  [
    { name: "Magma Imp", emoji: "😈" }, { name: "Flame Serpent", emoji: "🔥" }, { name: "Obsidian Brute", emoji: "⬛" },
    { name: "Ember Drake", emoji: "🐉" }, { name: "Lava Golem", emoji: "🌋" },
  ],
  // Chapter 6 monsters
  [
    { name: "Shadow Stalker", emoji: "🌑" }, { name: "Abyssal Watcher", emoji: "👁️" }, { name: "Doom Crawler", emoji: "🦂" },
    { name: "Soul Reaver", emoji: "💀" }, { name: "Void Spawn", emoji: "🕳️" },
  ],
  // Chapter 7 monsters
  [
    { name: "Storm Giant", emoji: "⛈️" }, { name: "Ancient Wyrm", emoji: "🐲" }, { name: "Celestial Knight", emoji: "🌟" },
    { name: "Titan Colossus", emoji: "🗿" }, { name: "Thunder Beast", emoji: "⚡" },
  ],
  // Chapter 8 monsters
  [
    { name: "Void Walker", emoji: "🌀" }, { name: "Star Devourer", emoji: "⭐" }, { name: "Cosmic Horror", emoji: "👾" },
    { name: "Rift Guardian", emoji: "🔮" }, { name: "Eternal Flame", emoji: "🔥" },
  ],
];

const BOSS_NAMES = [
  ["Meadow Golem 🗿", "Forest Guardian 🌲", "Goblin King 👺", "Undead General 💀", "Ancient Treant 🌳"],
  ["Cave Wyrm 🐛", "Crystal Basilisk 💎", "Orc Warlord 👹", "Shadow Drake 🐉", "Troll King 🪨"],
  ["Swamp Hydra 🐲", "Poison Queen 🐍", "Witch Doctor 🧙", "Plague Lord 🤢", "Bog Titan 🌿"],
  ["Elder Lich ☠️", "Ruin Colossus 🗿", "Phantom King 👻", "Dragon Lord 🐉", "Death Emperor ⚔️"],
  ["Inferno King 👑", "Magma Titan 🌋", "Phoenix Lord 🔥", "Obsidian Emperor ⬛", "Fire God 😈"],
  ["Void Leviathan 🐙", "Abyss Lord 🕳️", "Shadow Emperor 🌑", "Soul Tyrant 💀", "Doom Sovereign 🦂"],
  ["God of the Spire ⚡", "Storm Emperor ⛈️", "Wyrm God 🐲", "Celestial Lord 🌟", "Titan God 🗿"],
  ["Rift Overlord 🌀", "Star Eater ⭐", "Cosmic Emperor 👾", "Void God 🔮", "Eternal Sovereign 🔥"],
];

// Get monster stats for a given stage
function getStageMonster(stageNum) {
  const chapter = Math.floor((stageNum - 1) / 50);
  const stageInChapter = ((stageNum - 1) % 50) + 1;
  const isBoss = stageInChapter % 10 === 0;
  const bossIdx = Math.floor(stageInChapter / 10) - 1;
  const chapterData = CHAPTERS[Math.min(chapter, CHAPTERS.length - 1)];
  const monsters = STAGE_MONSTERS_PER_CHAPTER[Math.min(chapter, STAGE_MONSTERS_PER_CHAPTER.length - 1)];
  const bosses = BOSS_NAMES[Math.min(chapter, BOSS_NAMES.length - 1)];

  // Base scaling — exponential growth
  const baseHp = Math.floor(20 * Math.pow(1.08, stageNum - 1));
  const baseAtk = Math.floor(3 * Math.pow(1.06, stageNum - 1));
  const baseDef = Math.floor(1 * Math.pow(1.05, stageNum - 1));
  const baseGold = Math.floor(5 * Math.pow(1.04, stageNum - 1));
  const baseXp = Math.floor(10 * Math.pow(1.05, stageNum - 1));

  if (isBoss) {
    const bossName = bosses[Math.min(bossIdx, bosses.length - 1)];
    return {
      name: bossName.replace(/ [^\s]+$/, ''),
      emoji: bossName.match(/[^\w\s]+$/)?.[0] || "👑",
      hp: Math.floor(baseHp * 3),
      atk: Math.floor(baseAtk * 1.5),
      def: Math.floor(baseDef * 1.5),
      gold: Math.floor(baseGold * 5),
      xp: Math.floor(baseXp * 5),
      isBoss: true,
      monstersToKill: 1,
    };
  }

  // Normal stage: 5-8 monsters
  const monsterIdx = (stageInChapter - 1) % monsters.length;
  const m = monsters[monsterIdx];
  return {
    name: m.name,
    emoji: m.emoji,
    hp: baseHp,
    atk: baseAtk,
    def: baseDef,
    gold: baseGold,
    xp: baseXp,
    isBoss: false,
    monstersToKill: 5 + Math.floor(stageInChapter / 15),
  };
}

function getChapterForStage(stageNum) {
  const chapterIdx = Math.min(Math.floor((stageNum - 1) / 50), CHAPTERS.length - 1);
  return CHAPTERS[chapterIdx];
}

function getStageLabel(stageNum) {
  const ch = Math.floor((stageNum - 1) / 50) + 1;
  const st = ((stageNum - 1) % 50) + 1;
  return `${ch}-${st}`;
}

// ─── GROWTH STAT COSTS ───
// Gold cost to level up ATK/HP/DEF (Blade Idle style)
function growthCost(statLevel) {
  return Math.floor(10 * Math.pow(1.12, statLevel - 1));
}

// ─── EQUIPMENT RARITY ───
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
  { id: "weapon", name: "Weapon", emoji: "⚔️", statPrimary: "atk" },
  { id: "armor", name: "Armor", emoji: "🛡️", statPrimary: "def" },
  { id: "helm", name: "Helm", emoji: "⛑️", statPrimary: "hp" },
  { id: "gloves", name: "Gloves", emoji: "🧤", statPrimary: "atk" },
  { id: "boots", name: "Boots", emoji: "👢", statPrimary: "def" },
  { id: "ring", name: "Ring", emoji: "💍", statPrimary: "critRate" },
  { id: "amulet", name: "Amulet", emoji: "📿", statPrimary: "critDmg" },
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
  // Roll rarity
  const roll = Math.random() * 100;
  let cumulative = 0;
  let rarityIdx = 0;
  for (let i = 0; i < RARITIES.length; i++) {
    cumulative += RARITIES[i].weight;
    if (roll < cumulative) { rarityIdx = i; break; }
  }
  const rarity = RARITIES[rarityIdx];
  const typeData = EQUIP_TYPES.find(t => t.id === type);
  const name = EQUIP_NAMES[type][rarityIdx];
  const baseMult = [1, 2.5, 6, 15, 40, 100, 300][rarityIdx];

  const stats = {};
  if (typeData.statPrimary === "atk") stats.atk = Math.floor(5 * baseMult * (0.9 + Math.random() * 0.2));
  if (typeData.statPrimary === "def") stats.def = Math.floor(4 * baseMult * (0.9 + Math.random() * 0.2));
  if (typeData.statPrimary === "hp") stats.hp = Math.floor(20 * baseMult * (0.9 + Math.random() * 0.2));
  if (typeData.statPrimary === "critRate") stats.critRate = Math.min(80, Math.floor(2 + rarityIdx * 3 + Math.random() * 3));
  if (typeData.statPrimary === "critDmg") stats.critDmg = Math.floor(10 + rarityIdx * 15 + Math.random() * 10);

  // Secondary stat chance
  if (Math.random() < 0.3 + rarityIdx * 0.1) {
    const secondaries = ["atk", "def", "hp"].filter(s => s !== typeData.statPrimary);
    const sec = secondaries[Math.floor(Math.random() * secondaries.length)];
    const secMult = sec === "hp" ? 10 : 2;
    stats[sec] = (stats[sec] || 0) + Math.floor(secMult * baseMult * 0.3 * (0.8 + Math.random() * 0.4));
  }

  return {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    type, name, rarity: rarity.id, rarityIdx, level: 0, stats,
    emoji: typeData.emoji,
  };
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

// ─── SKILLS (Active combat skills — Blade Idle style) ───
const COMBAT_SKILLS = [
  { id: "slash", name: "Power Slash", emoji: "⚔️", dmgMult: 2.0, cooldown: 5000, desc: "A mighty slash dealing 200% ATK damage", unlockStage: 1, color: T.danger },
  { id: "whirlwind", name: "Whirlwind", emoji: "🌪️", dmgMult: 1.5, cooldown: 4000, desc: "Spin attack for 150% ATK damage", unlockStage: 10, color: T.info },
  { id: "fireball", name: "Fireball", emoji: "🔥", dmgMult: 3.0, cooldown: 8000, desc: "Hurl a fireball for 300% ATK damage", unlockStage: 30, color: T.orange },
  { id: "thunderbolt", name: "Thunderbolt", emoji: "⚡", dmgMult: 4.0, cooldown: 12000, desc: "Call lightning for 400% ATK damage", unlockStage: 60, color: T.warning },
  { id: "voidstrike", name: "Void Strike", emoji: "🕳️", dmgMult: 6.0, cooldown: 18000, desc: "Channel void energy for 600% ATK damage", unlockStage: 100, color: T.purple },
  { id: "judgment", name: "Divine Judgment", emoji: "✨", dmgMult: 10.0, cooldown: 30000, desc: "Summon divine wrath for 1000% ATK damage", unlockStage: 200, color: T.gold },
];

// ═══════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════

const fmt = (n) => {
  if (n >= 1e12) return (n / 1e12).toFixed(1) + "T";
  if (n >= 1e9) return (n / 1e9).toFixed(1) + "B";
  if (n >= 1e6) return (n / 1e6).toFixed(1) + "M";
  if (n >= 1e3) return (n / 1e3).toFixed(1) + "K";
  return String(Math.floor(n));
};

const rarityColor = (r) => RARITIES.find(x => x.id === r)?.color || T.textDim;

// ═══════════════════════════════════════════════
// UI COMPONENTS
// ═══════════════════════════════════════════════

function Card({ children, style, glowColor, onClick }) {
  return (
    <div onClick={onClick} style={{
      background: T.card, borderRadius: T.r, padding: 16,
      border: `1px solid ${glowColor ? glowColor + "40" : T.cardBorder}`,
      boxShadow: glowColor ? `0 0 20px ${glowColor}15, inset 0 0 20px ${glowColor}08` : undefined,
      cursor: onClick ? "pointer" : undefined,
      transition: "all 0.15s", ...style,
    }}>{children}</div>
  );
}

function Btn({ children, onClick, color = T.accent, small, disabled, style: sx }) {
  return (
    <div onClick={disabled ? undefined : onClick} style={{
      display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6,
      padding: small ? "6px 14px" : "10px 20px",
      borderRadius: T.rs, fontWeight: 700, fontSize: small ? 11 : 13,
      background: disabled ? T.bar : `${color}20`,
      color: disabled ? T.textDim : color,
      border: `1px solid ${disabled ? T.divider : color + "35"}`,
      cursor: disabled ? "not-allowed" : "pointer",
      transition: "all 0.12s", userSelect: "none",
      ...sx,
    }}>{children}</div>
  );
}

function Badge({ children, color = T.accent }) {
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", padding: "2px 8px",
      borderRadius: 99, fontSize: 10, fontWeight: 700,
      background: `${color}18`, color, border: `1px solid ${color}25`,
    }}>{children}</span>
  );
}

function ProgressBar({ value, max, color = T.accent, height = 8, showLabel, labelLeft, labelRight, bg }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div>
      {(showLabel || labelLeft || labelRight) && (
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, fontWeight: 700, color, marginBottom: 3 }}>
          <span>{labelLeft || ""}</span>
          <span>{labelRight || (showLabel ? `${fmt(value)} / ${fmt(max)}` : "")}</span>
        </div>
      )}
      <div style={{ height, background: bg || T.bar, borderRadius: 99, overflow: "hidden" }}>
        <div style={{ width: `${pct}%`, height: "100%", background: color, borderRadius: 99, transition: "width 0.2s" }} />
      </div>
    </div>
  );
}

function SidebarItem({ icon, label, active, onClick, color, badge }) {
  return (
    <div onClick={onClick} style={{
      display: "flex", alignItems: "center", gap: 10, padding: "9px 14px",
      borderRadius: T.rs, cursor: "pointer",
      background: active ? T.sidebarActive : "transparent",
      borderLeft: active ? `3px solid ${color || T.accent}` : "3px solid transparent",
      transition: "all 0.1s",
    }}>
      <span style={{ fontSize: 16, width: 22, textAlign: "center" }}>{icon}</span>
      <span style={{ fontSize: 12, fontWeight: active ? 700 : 500, color: active ? T.white : T.textSec, flex: 1 }}>{label}</span>
      {badge && <Badge color={color}>{badge}</Badge>}
    </div>
  );
}

function StatRow({ label, value, color }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", borderBottom: `1px solid ${T.divider}`, fontSize: 12 }}>
      <span style={{ color: T.textSec }}>{label}</span>
      <span style={{ color: color || T.white, fontWeight: 700 }}>{value}</span>
    </div>
  );
}

function PageTitle({ icon, title, subtitle }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{ fontSize: 20, fontWeight: 900, color: T.white }}>{icon} {title}</div>
      {subtitle && <div style={{ fontSize: 12, color: T.textSec, marginTop: 2 }}>{subtitle}</div>}
    </div>
  );
}

// ═══════════════════════════════════════════════
// DEFAULT SAVE STATE (Blade Idle style)
// ═══════════════════════════════════════════════

const DEFAULT_SAVE = () => ({
  // Stage progression
  currentStage: 1,
  highestStage: 1,
  // Growth stats (leveled with gold — core Blade Idle mechanic)
  growth: { atk: 1, hp: 1, def: 1 },
  // Player derived from growth
  player: { hp: 100, maxHp: 100 },
  // Equipment (array of equipment objects)
  equipment: [],
  equipped: { weapon: null, armor: null, helm: null, gloves: null, boots: null, ring: null, amulet: null },
  // Pets
  pets: [], activePets: [], petSlots: 1,
  // Currency
  gold: 100, diamonds: 50,
  // Combat skills unlocked & equipped
  unlockedSkills: ["slash"],
  equippedSkills: ["slash", null, null],
  // Stats & tracking
  combatStats: { kills: 0, totalDamage: 0, deaths: 0, highestHit: 0, bossesKilled: 0, totalGoldEarned: 0, totalXpEarned: 0 },
  stats: { timePlayed: 0, loginStreak: 0, lastLoginDay: null, summons: 0, merges: 0 },
  // Premium
  isPremium: false, storePurchases: {},
  // Settings
  autoProgress: true, // auto advance to next stage after clearing
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
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
    } catch (e) {
      setError(e.code === "auth/invalid-credential" ? "Invalid email or password" : e.message);
    }
    setLoading(false);
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: T.bg, fontFamily: FONT }}>
      <div style={{ width: "100%", maxWidth: 400, padding: 24 }}>
        <div style={{ textAlign: "center", marginBottom: 30 }}>
          <div style={{ fontSize: 48, marginBottom: 8 }}>⚔️</div>
          <div style={{ fontSize: 28, fontWeight: 900, color: T.white, letterSpacing: -1 }}>Blade Realms</div>
          <div style={{ fontSize: 13, color: T.textSec, marginTop: 4 }}>Idle Adventure RPG</div>
        </div>
        <Card>
          <div style={{ display: "flex", gap: 8, marginBottom: 18 }}>
            {["login", "signup"].map(t => (
              <div key={t} onClick={() => { setTab(t); clearForm(); }} style={{
                flex: 1, padding: "8px 0", textAlign: "center", borderRadius: T.rs,
                background: tab === t ? T.accent + "20" : "transparent",
                color: tab === t ? T.accent : T.textDim, fontWeight: 700, fontSize: 13, cursor: "pointer",
                border: `1px solid ${tab === t ? T.accent + "30" : "transparent"}`,
              }}>{t === "login" ? "Sign In" : "Create Account"}</div>
            ))}
          </div>

          {error && <div style={{ padding: "8px 12px", borderRadius: T.rs, background: T.dangerMuted, color: T.danger, fontSize: 12, fontWeight: 600, marginBottom: 12, border: `1px solid ${T.danger}25` }}>{error}</div>}

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {tab === "signup" && (
              <input value={displayName} onChange={e => setDisplayName(e.target.value)} placeholder="Display Name"
                style={{ padding: "10px 14px", borderRadius: T.rs, background: T.bgDeep, border: `1px solid ${T.divider}`, color: T.white, fontSize: 13, outline: "none" }} />
            )}
            <input value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" type="email"
              style={{ padding: "10px 14px", borderRadius: T.rs, background: T.bgDeep, border: `1px solid ${T.divider}`, color: T.white, fontSize: 13, outline: "none" }} />
            <input value={password} onChange={e => setPassword(e.target.value)} placeholder="Password" type="password"
              style={{ padding: "10px 14px", borderRadius: T.rs, background: T.bgDeep, border: `1px solid ${T.divider}`, color: T.white, fontSize: 13, outline: "none" }}
              onKeyDown={e => e.key === "Enter" && (tab === "login" ? handleLogin() : null)} />
            {tab === "signup" && (
              <input value={confirmPw} onChange={e => setConfirmPw(e.target.value)} placeholder="Confirm Password" type="password"
                style={{ padding: "10px 14px", borderRadius: T.rs, background: T.bgDeep, border: `1px solid ${T.divider}`, color: T.white, fontSize: 13, outline: "none" }} />
            )}
            <Btn onClick={tab === "login" ? handleLogin : handleSignup} disabled={loading}
              style={{ width: "100%", padding: "12px 0", fontSize: 14, marginTop: 4 }}>
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
        try {
          const sr = await window.storage.get(`save:${user.uid}`);
          save = JSON.parse(sr.value);
        } catch { save = DEFAULT_SAVE(); }
        setAccount({
          username: user.uid,
          displayName: user.displayName || user.email?.split("@")[0] || "Adventurer",
          email: user.email, uid: user.uid, isGuest: false,
        });
        setInitialSave(save);
        setKicked(false);
      } else {
        setAccount(null);
        setInitialSave(null);
      }
      setAuthChecked(true);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!account) return;
    const unsub = onSnapshot(doc(db, "sessions", account.uid), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        if (data.sessionId && data.sessionId !== SESSION_ID) {
          setKicked(true);
          setAccount(null);
        }
      }
    });
    return () => unsub();
  }, [account]);

  const handleLogin = (acc, save) => { setAccount(acc); setInitialSave(save); };
  const handleLogout = async () => { await signOut(auth); setAccount(null); setInitialSave(null); };

  if (!authChecked) return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: T.bg, fontFamily: FONT }}>
      <div style={{ color: T.textSec, fontSize: 14 }}>Loading...</div>
    </div>
  );

  if (kicked) return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: T.bg, fontFamily: FONT }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>🔒</div>
        <div style={{ fontSize: 18, fontWeight: 800, color: T.white, marginBottom: 8 }}>Session Ended</div>
        <div style={{ fontSize: 13, color: T.textSec, marginBottom: 20 }}>Logged in from another device.</div>
        <Btn onClick={() => setKicked(false)}>Back to Login</Btn>
      </div>
    </div>
  );

  if (!account) return <AuthScreen onLogin={handleLogin} />;
  return <GameUI key={account.username} account={account} initialSave={initialSave} onLogout={handleLogout} />;
}

// ═══════════════════════════════════════════════
// GAME UI — THE CORE GAME LOOP
// ═══════════════════════════════════════════════

function GameUI({ account, initialSave, onLogout }) {
  const [page, setPage] = useState("battle");
  const [mobileNav, setMobileNav] = useState(false);
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768);

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const sv = initialSave || DEFAULT_SAVE();

  // ─── CORE STATE ───
  const [currentStage, setCurrentStage] = useState(() => sv.currentStage || 1);
  const [highestStage, setHighestStage] = useState(() => sv.highestStage || 1);
  const [growth, setGrowth] = useState(() => sv.growth || { atk: 1, hp: 1, def: 1 });
  const [gold, setGold] = useState(() => sv.gold || 100);
  const [diamonds, setDiamonds] = useState(() => sv.diamonds || 50);
  const [combatStats, setCombatStats] = useState(() => sv.combatStats || DEFAULT_SAVE().combatStats);
  const [stats, setStats] = useState(() => sv.stats || DEFAULT_SAVE().stats);
  const [autoProgress, setAutoProgress] = useState(() => sv.autoProgress !== false);

  // Equipment state
  const [equipment, setEquipment] = useState(() => sv.equipment || []);
  const [equipped, setEquipped] = useState(() => sv.equipped || DEFAULT_SAVE().equipped);

  // Pets
  const [pets, setPets] = useState(() => sv.pets || []);
  const [activePets, setActivePets] = useState(() => sv.activePets || []);
  const [petSlots] = useState(() => sv.petSlots || 1);

  // Skills
  const [unlockedSkills, setUnlockedSkills] = useState(() => sv.unlockedSkills || ["slash"]);
  const [equippedSkills, setEquippedSkills] = useState(() => sv.equippedSkills || ["slash", null, null]);

  // Combat live state
  const [battleState, setBattleState] = useState(null); // { monsterHp, monsterMaxHp, killCount, targetKills, stageGold, stageXp, monster }
  const [playerHp, setPlayerHp] = useState(() => 100);
  const [isBattling, setIsBattling] = useState(false);
  const [skillCooldowns, setSkillCooldowns] = useState({});
  const [log, setLog] = useState([]);
  const [showSummonResult, setShowSummonResult] = useState(null);

  const battleRef = useRef(null);
  const logRef = useRef(null);

  const addLog = useCallback((msg) => {
    setLog(prev => [...prev.slice(-50), { msg, t: Date.now() }]);
  }, []);

  const addGold = useCallback((n) => {
    setGold(g => g + n);
    if (n > 0) setCombatStats(s => ({ ...s, totalGoldEarned: (s.totalGoldEarned || 0) + n }));
  }, []);

  // ─── DERIVED STATS ───
  const baseAtk = growth.atk * 3;
  const baseHp = 80 + growth.hp * 20;
  const baseDef = growth.def * 2;

  // Equipment bonuses
  const equipBonus = useMemo(() => {
    const b = { atk: 0, def: 0, hp: 0, critRate: 0, critDmg: 0 };
    Object.values(equipped).forEach(eqId => {
      if (!eqId) return;
      const eq = equipment.find(e => e.id === eqId);
      if (!eq) return;
      Object.entries(eq.stats).forEach(([k, v]) => { b[k] = (b[k] || 0) + v; });
    });
    return b;
  }, [equipped, equipment]);

  // Pet bonuses
  const petBonus = useMemo(() => {
    const b = { atkPct: 0, defPct: 0, hpPct: 0, goldPct: 0, xpPct: 0, critRate: 0, critDmg: 0 };
    activePets.forEach(pName => {
      const pDef = PET_DEFS.find(p => p.name === pName);
      if (!pDef) return;
      Object.entries(pDef.bonus).forEach(([k, v]) => { b[k] = (b[k] || 0) + v; });
    });
    return b;
  }, [activePets]);

  const totalAtk = Math.floor((baseAtk + equipBonus.atk) * (1 + (petBonus.atkPct || 0) / 100));
  const totalDef = Math.floor((baseDef + equipBonus.def) * (1 + (petBonus.defPct || 0) / 100));
  const totalMaxHp = Math.floor((baseHp + equipBonus.hp) * (1 + (petBonus.hpPct || 0) / 100));
  const critRate = Math.min(80, (equipBonus.critRate || 0) + (petBonus.critRate || 0));
  const critDmg = 150 + (equipBonus.critDmg || 0) + (petBonus.critDmg || 0);
  const goldMult = 1 + (petBonus.goldPct || 0) / 100;

  const maxHpRef = useRef(totalMaxHp);
  useEffect(() => { maxHpRef.current = totalMaxHp; }, [totalMaxHp]);

  // ─── SAVE SYSTEM ───
  const saveTimer = useRef(null);
  const buildSave = useCallback(() => ({
    currentStage, highestStage, growth, gold, diamonds, combatStats, stats,
    autoProgress, equipment, equipped, pets, activePets, petSlots,
    unlockedSkills, equippedSkills,
    player: { hp: playerHp, maxHp: totalMaxHp },
    isPremium: false, storePurchases: {},
  }), [currentStage, highestStage, growth, gold, diamonds, combatStats, stats, autoProgress, equipment, equipped, pets, activePets, petSlots, unlockedSkills, equippedSkills, playerHp, totalMaxHp]);

  useEffect(() => {
    saveTimer.current = setInterval(async () => {
      try {
        await window.storage.set(`save:${account.uid}`, JSON.stringify(buildSave()));
      } catch (e) { console.error("Save failed:", e); }
    }, 15000);
    return () => clearInterval(saveTimer.current);
  }, [account.uid, buildSave]);

  // Save on unmount
  useEffect(() => {
    return () => {
      try { window.storage.set(`save:${account.uid}`, JSON.stringify(buildSave())); } catch {}
    };
  }, [account.uid, buildSave]);

  // ─── TIME PLAYED TRACKER ───
  useEffect(() => {
    const timer = setInterval(() => {
      setStats(s => ({ ...s, timePlayed: (s.timePlayed || 0) + 1 }));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // ─── GROWTH STAT UPGRADE ───
  const upgradeGrowth = useCallback((stat) => {
    const cost = growthCost(growth[stat]);
    if (gold < cost) return;
    setGold(g => g - cost);
    setGrowth(g => ({ ...g, [stat]: g[stat] + 1 }));
  }, [growth, gold]);

  const upgradeGrowthMax = useCallback((stat) => {
    let remaining = gold;
    let level = growth[stat];
    let spent = 0;
    while (remaining >= growthCost(level)) {
      const cost = growthCost(level);
      remaining -= cost;
      spent += cost;
      level++;
    }
    if (level > growth[stat]) {
      setGold(g => g - spent);
      setGrowth(g => ({ ...g, [stat]: level }));
    }
  }, [growth, gold]);

  // ─── BATTLE SYSTEM ───
  const startBattle = useCallback((stage) => {
    const monster = getStageMonster(stage);
    setPlayerHp(totalMaxHp);
    setBattleState({
      monsterHp: monster.hp,
      monsterMaxHp: monster.hp,
      killCount: 0,
      targetKills: monster.monstersToKill,
      stageGold: 0,
      stageXp: 0,
      monster,
      stageNum: stage,
    });
    setIsBattling(true);
    setSkillCooldowns({});
  }, [totalMaxHp]);

  const stopBattle = useCallback(() => {
    if (battleRef.current) { clearInterval(battleRef.current); battleRef.current = null; }
    setIsBattling(false);
    setBattleState(null);
  }, []);

  // Auto-start battle when stage changes
  useEffect(() => {
    if (!isBattling && currentStage <= highestStage) {
      startBattle(currentStage);
    }
  }, [currentStage]);

  // Start battle on mount
  useEffect(() => {
    startBattle(currentStage);
    return () => { if (battleRef.current) clearInterval(battleRef.current); };
  }, []);

  // Core battle loop
  useEffect(() => {
    if (!isBattling || !battleState) return;

    const step = 100; // ms
    const attackSpeed = 1500; // player attacks every 1.5s base
    let pElapsed = 0;
    let mElapsed = 0;
    const mSpeed = 2000;

    battleRef.current = setInterval(() => {
      setBattleState(prev => {
        if (!prev) return prev;
        let { monsterHp, monsterMaxHp, killCount, targetKills, stageGold, stageXp, monster, stageNum } = prev;
        pElapsed += step;
        mElapsed += step;

        // Player attacks
        if (pElapsed >= attackSpeed) {
          pElapsed = 0;
          let dmg = Math.max(1, totalAtk - monster.def + Math.floor(Math.random() * 4));
          // Crit check
          const isCrit = Math.random() * 100 < critRate;
          if (isCrit) dmg = Math.floor(dmg * critDmg / 100);
          monsterHp -= dmg;
          setCombatStats(s => ({
            ...s,
            totalDamage: s.totalDamage + dmg,
            highestHit: Math.max(s.highestHit || 0, dmg),
          }));
        }

        // Monster attacks
        if (mElapsed >= mSpeed) {
          mElapsed = 0;
          const mDmg = Math.max(1, monster.atk - totalDef + Math.floor(Math.random() * 3));
          setPlayerHp(hp => {
            const newHp = hp - mDmg;
            if (newHp <= 0) {
              // Player dies — retreat to current stage, heal up
              addLog(`💀 Defeated at stage ${getStageLabel(stageNum)}!`);
              setCombatStats(s => ({ ...s, deaths: s.deaths + 1 }));
              // Don't progress, just respawn
              setTimeout(() => {
                setPlayerHp(maxHpRef.current);
                startBattle(stageNum);
              }, 500);
              return maxHpRef.current;
            }
            return newHp;
          });
        }

        // Monster dies
        if (monsterHp <= 0) {
          const effGold = Math.floor(monster.gold * goldMult);
          stageGold += effGold;
          stageXp += monster.xp;
          killCount++;
          addGold(effGold);
          setCombatStats(s => ({ ...s, kills: s.kills + 1, bossesKilled: s.bossesKilled + (monster.isBoss ? 1 : 0) }));

          // Stage cleared?
          if (killCount >= targetKills) {
            addLog(`✅ Stage ${getStageLabel(stageNum)} cleared! +${fmt(stageGold)}g`);
            // Advance
            const nextStage = stageNum + 1;
            if (stageNum >= highestStage) {
              setHighestStage(nextStage);
            }

            // Check skill unlocks
            COMBAT_SKILLS.forEach(sk => {
              if (sk.unlockStage === nextStage && !unlockedSkills.includes(sk.id)) {
                setUnlockedSkills(prev => [...prev, sk.id]);
                addLog(`🎉 New skill unlocked: ${sk.emoji} ${sk.name}!`);
              }
            });

            if (autoProgress) {
              setCurrentStage(nextStage);
              // New monster for next stage
              const nextMonster = getStageMonster(nextStage);
              return {
                monsterHp: nextMonster.hp, monsterMaxHp: nextMonster.hp,
                killCount: 0, targetKills: nextMonster.monstersToKill,
                stageGold: 0, stageXp: 0, monster: nextMonster, stageNum: nextStage,
              };
            } else {
              setIsBattling(false);
              return null;
            }
          }

          // Spawn next monster in same stage
          monsterHp = monsterMaxHp;
        }

        return { ...prev, monsterHp, killCount, stageGold, stageXp };
      });
    }, step);

    return () => { if (battleRef.current) clearInterval(battleRef.current); };
  }, [isBattling, battleState?.stageNum, totalAtk, totalDef, critRate, critDmg, goldMult, autoProgress]);

  // ─── SKILL USAGE ───
  const useSkill = useCallback((skillId) => {
    const sk = COMBAT_SKILLS.find(s => s.id === skillId);
    if (!sk || !battleState || skillCooldowns[skillId]) return;
    const dmg = Math.floor(totalAtk * sk.dmgMult);
    setBattleState(prev => {
      if (!prev) return prev;
      const newHp = prev.monsterHp - dmg;
      setCombatStats(s => ({ ...s, totalDamage: s.totalDamage + dmg, highestHit: Math.max(s.highestHit || 0, dmg) }));
      addLog(`${sk.emoji} ${sk.name}! ${fmt(dmg)} damage!`);
      return { ...prev, monsterHp: newHp };
    });
    setSkillCooldowns(prev => ({ ...prev, [skillId]: true }));
    setTimeout(() => setSkillCooldowns(prev => ({ ...prev, [skillId]: false })), sk.cooldown);
  }, [battleState, totalAtk, skillCooldowns]);

  // ─── EQUIPMENT SUMMONING ───
  const summonEquipment = useCallback((count = 1) => {
    const cost = count === 1 ? 100 : 900; // 10x summon = 900 diamonds
    if (diamonds < cost) return;
    setDiamonds(d => d - cost);
    const results = [];
    const types = EQUIP_TYPES.map(t => t.id);
    for (let i = 0; i < (count === 1 ? 1 : 10); i++) {
      const type = types[Math.floor(Math.random() * types.length)];
      const eq = generateEquipment(type);
      results.push(eq);
    }
    setEquipment(prev => [...prev, ...results]);
    setStats(s => ({ ...s, summons: (s.summons || 0) + results.length }));
    setShowSummonResult(results);
    addLog(`✨ Summoned ${results.length} equipment!`);
  }, [diamonds, addLog]);

  // ─── EQUIP / UNEQUIP ───
  const equipItem = useCallback((eqId) => {
    const item = equipment.find(e => e.id === eqId);
    if (!item) return;
    setEquipped(prev => ({ ...prev, [item.type]: eqId }));
  }, [equipment]);

  const unequipItem = useCallback((slot) => {
    setEquipped(prev => ({ ...prev, [slot]: null }));
  }, []);

  // ─── MERGE EQUIPMENT ───
  // Merge 5 of the same rarity+type into 1 of next rarity
  const canMerge = useCallback((type, rarityId) => {
    const count = equipment.filter(e => e.type === type && e.rarity === rarityId && !Object.values(equipped).includes(e.id)).length;
    return count >= 5;
  }, [equipment, equipped]);

  const mergeEquipment = useCallback((type, rarityId) => {
    if (!canMerge(type, rarityId)) return;
    const candidates = equipment.filter(e => e.type === type && e.rarity === rarityId && !Object.values(equipped).includes(e.id));
    const toRemove = candidates.slice(0, 5).map(e => e.id);
    const currentRarityIdx = RARITIES.findIndex(r => r.id === rarityId);
    if (currentRarityIdx >= RARITIES.length - 1) return; // Can't merge God tier

    // Generate new item of next rarity
    const nextRarity = RARITIES[currentRarityIdx + 1];
    const typeData = EQUIP_TYPES.find(t => t.id === type);
    const baseMult = [1, 2.5, 6, 15, 40, 100, 300][currentRarityIdx + 1];
    const newStats = {};
    if (typeData.statPrimary === "atk") newStats.atk = Math.floor(5 * baseMult * (0.9 + Math.random() * 0.2));
    if (typeData.statPrimary === "def") newStats.def = Math.floor(4 * baseMult * (0.9 + Math.random() * 0.2));
    if (typeData.statPrimary === "hp") newStats.hp = Math.floor(20 * baseMult * (0.9 + Math.random() * 0.2));
    if (typeData.statPrimary === "critRate") newStats.critRate = Math.min(80, Math.floor(2 + (currentRarityIdx + 1) * 3 + Math.random() * 3));
    if (typeData.statPrimary === "critDmg") newStats.critDmg = Math.floor(10 + (currentRarityIdx + 1) * 15 + Math.random() * 10);

    const newItem = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      type, name: EQUIP_NAMES[type][currentRarityIdx + 1],
      rarity: nextRarity.id, rarityIdx: currentRarityIdx + 1,
      level: 0, stats: newStats, emoji: typeData.emoji,
    };

    setEquipment(prev => [...prev.filter(e => !toRemove.includes(e.id)), newItem]);
    setStats(s => ({ ...s, merges: (s.merges || 0) + 1 }));
    addLog(`🔨 Merged 5x ${RARITIES[currentRarityIdx].name} ${type} → ${nextRarity.name}!`);
  }, [equipment, equipped, canMerge, addLog]);

  // ─── NAVIGATION ───
  const nav = (p) => { setPage(p); setMobileNav(false); };

  // ─── RENDERING ───
  const chapter = getChapterForStage(currentStage);
  const stageLabel = getStageLabel(currentStage);
  const highestLabel = getStageLabel(highestStage);

  // Time played string
  const timeMins = Math.floor((stats.timePlayed || 0) / 60);
  const timeHrs = Math.floor(timeMins / 60);
  const timeStr = timeHrs > 0 ? `${timeHrs}h ${timeMins % 60}m` : `${timeMins}m`;

  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden", fontFamily: FONT, background: T.bg, color: T.text }}>

      {/* ═══ SIDEBAR ═══ */}
      {(!isMobile || mobileNav) && (
        <div style={{
          width: isMobile ? "100%" : 220, flexShrink: 0, background: T.sidebar,
          borderRight: `1px solid ${T.sidebarBorder}`, display: "flex", flexDirection: "column",
          position: isMobile ? "fixed" : "relative", zIndex: 100, height: "100%",
          overflowY: "auto",
        }}>
          {/* Logo */}
          <div style={{ padding: "18px 16px 14px", borderBottom: `1px solid ${T.sidebarBorder}` }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 22 }}>⚔️</span>
              <div>
                <div style={{ fontSize: 15, fontWeight: 900, color: T.white, letterSpacing: -0.5 }}>Blade Realms</div>
                <div style={{ fontSize: 10, color: T.textDim }}>{account.displayName}</div>
              </div>
            </div>
          </div>

          <div style={{ padding: "10px 8px", flex: 1 }}>
            <div style={{ fontSize: 9, fontWeight: 700, color: T.textDim, padding: "8px 14px 4px", letterSpacing: 1, textTransform: "uppercase" }}>Main</div>
            <SidebarItem icon="⚔️" label="Battle" active={page === "battle"} onClick={() => nav("battle")} color={T.danger} badge={stageLabel} />
            <SidebarItem icon="📊" label="Growth" active={page === "growth"} onClick={() => nav("growth")} color={T.success} />
            <SidebarItem icon="🎒" label="Equipment" active={page === "equipment"} onClick={() => nav("equipment")} color={T.warning} badge={`${equipment.length}`} />
            <SidebarItem icon="✨" label="Summon" active={page === "summon"} onClick={() => nav("summon")} color={T.purple} badge={`💎${fmt(diamonds)}`} />
            <SidebarItem icon="🐾" label="Pets" active={page === "pets"} onClick={() => nav("pets")} color={T.pink} />
            <SidebarItem icon="🏆" label="Stats" active={page === "stats"} onClick={() => nav("stats")} color={T.info} />

            <div style={{ fontSize: 9, fontWeight: 700, color: T.textDim, padding: "12px 14px 4px", letterSpacing: 1, textTransform: "uppercase" }}>Account</div>
            <SidebarItem icon="⚙️" label="Settings" active={page === "settings"} onClick={() => nav("settings")} color={T.textSec} />
            <SidebarItem icon="🚪" label="Logout" onClick={onLogout} color={T.danger} />
          </div>

          {/* Gold/Diamond display */}
          <div style={{ padding: "12px 16px", borderTop: `1px solid ${T.sidebarBorder}` }}>
            <div style={{ display: "flex", gap: 12, fontSize: 12, fontWeight: 700 }}>
              <span style={{ color: T.gold }}>💰 {fmt(gold)}</span>
              <span style={{ color: T.purple }}>💎 {fmt(diamonds)}</span>
            </div>
          </div>
        </div>
      )}

      {/* ═══ MAIN AREA ═══ */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>

        {/* HEADER BAR */}
        <header style={{
          height: 52, flexShrink: 0, display: "flex", alignItems: "center", gap: 12,
          padding: isMobile ? "0 12px" : "0 24px",
          background: T.header, borderBottom: `1px solid ${T.headerBorder}`,
        }}>
          {isMobile && (
            <div onClick={() => setMobileNav(!mobileNav)} style={{ fontSize: 20, cursor: "pointer", padding: "4px 8px" }}>☰</div>
          )}
          {/* Stage indicator */}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 14 }}>{chapter.emoji}</span>
            <div>
              <div style={{ fontSize: 12, fontWeight: 800, color: chapter.color }}>{chapter.name}</div>
              <div style={{ fontSize: 10, color: T.textDim }}>Stage {stageLabel} • Best: {highestLabel}</div>
            </div>
          </div>

          <div style={{ flex: 1 }} />

          {/* Player stats in header */}
          <div style={{ display: "flex", gap: isMobile ? 8 : 16, fontSize: 11, fontWeight: 700 }}>
            <span style={{ color: T.danger }}>⚔️ {fmt(totalAtk)}</span>
            <span style={{ color: T.info }}>🛡️ {fmt(totalDef)}</span>
            <span style={{ color: T.success }}>❤️ {fmt(totalMaxHp)}</span>
          </div>
        </header>

        {/* HP BAR (always visible) */}
        <div style={{ padding: "0 " + (isMobile ? "12px" : "24px"), paddingTop: 6, paddingBottom: 6, background: T.bgDeep }}>
          <ProgressBar value={playerHp} max={totalMaxHp} color={playerHp < totalMaxHp * 0.3 ? T.danger : T.success} height={6}
            labelLeft="HP" labelRight={`${fmt(playerHp)} / ${fmt(totalMaxHp)}`} />
        </div>

        {/* CONTENT */}
        <div style={{ flex: 1, overflow: "auto", padding: isMobile ? 12 : 24 }}>

          {/* ═══════════════ BATTLE PAGE ═══════════════ */}
          {page === "battle" && (() => {
            const monster = battleState?.monster || getStageMonster(currentStage);
            const monsterHpPct = battleState ? (battleState.monsterHp / battleState.monsterMaxHp) * 100 : 100;
            const killPct = battleState ? (battleState.killCount / battleState.targetKills) * 100 : 0;

            return (
              <div>
                {/* Stage header */}
                <div style={{
                  padding: 20, borderRadius: T.r, marginBottom: 16,
                  background: chapter.bgGrad, border: `1px solid ${chapter.color}25`,
                }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
                    <div>
                      <div style={{ fontSize: 22, fontWeight: 900, color: T.white }}>
                        Stage {stageLabel}
                        {monster.isBoss && <Badge color={T.danger} style={{ marginLeft: 8 }}>BOSS</Badge>}
                      </div>
                      <div style={{ fontSize: 12, color: T.textSec, marginTop: 4 }}>{chapter.emoji} {chapter.name}</div>
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                      <Btn small color={autoProgress ? T.success : T.textDim} onClick={() => setAutoProgress(!autoProgress)}>
                        {autoProgress ? "▶ Auto" : "⏸ Manual"}
                      </Btn>
                      {currentStage > 1 && (
                        <Btn small color={T.textSec} onClick={() => { stopBattle(); setCurrentStage(Math.max(1, currentStage - 1)); }}>
                          ◀ Back
                        </Btn>
                      )}
                    </div>
                  </div>
                </div>

                {/* Battle arena */}
                <Card glowColor={monster.isBoss ? T.danger : chapter.color} style={{ marginBottom: 16, padding: 24 }}>
                  {/* Monster display */}
                  <div style={{ textAlign: "center", marginBottom: 20 }}>
                    <div style={{
                      width: 80, height: 80, borderRadius: "50%", margin: "0 auto 12px",
                      background: `${chapter.color}15`, border: `2px solid ${chapter.color}30`,
                      display: "flex", alignItems: "center", justifyContent: "center", fontSize: 40,
                      animation: isBattling ? "pulse 2s infinite" : undefined,
                    }}>
                      {monster.emoji}
                    </div>
                    <div style={{ fontSize: 16, fontWeight: 800, color: monster.isBoss ? T.danger : T.white }}>{monster.name}</div>
                    <div style={{ fontSize: 11, color: T.textSec, marginTop: 2 }}>
                      ATK {fmt(monster.atk)} • DEF {fmt(monster.def)}
                    </div>
                  </div>

                  {/* Monster HP bar */}
                  <div style={{ maxWidth: 400, margin: "0 auto", marginBottom: 12 }}>
                    <ProgressBar value={battleState?.monsterHp || monster.hp} max={monster.hp}
                      color={T.danger} height={10} showLabel />
                  </div>

                  {/* Kill progress */}
                  <div style={{ maxWidth: 400, margin: "0 auto", marginBottom: 16 }}>
                    <ProgressBar value={battleState?.killCount || 0} max={monster.monstersToKill}
                      color={chapter.color} height={6}
                      labelLeft="Progress"
                      labelRight={`${battleState?.killCount || 0} / ${monster.monstersToKill} kills`} />
                  </div>

                  {/* Rewards so far */}
                  <div style={{ display: "flex", justifyContent: "center", gap: 20, fontSize: 12, fontWeight: 700 }}>
                    <span style={{ color: T.gold }}>💰 +{fmt(battleState?.stageGold || 0)}</span>
                    <span style={{ color: T.textSec }}>⚔️ Kills: {fmt(combatStats.kills)}</span>
                  </div>
                </Card>

                {/* Skills bar */}
                <Card style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: T.white, marginBottom: 10 }}>⚡ Skills</div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {equippedSkills.filter(Boolean).map(skId => {
                      const sk = COMBAT_SKILLS.find(s => s.id === skId);
                      if (!sk) return null;
                      const onCooldown = skillCooldowns[sk.id];
                      return (
                        <div key={sk.id} onClick={() => useSkill(sk.id)} style={{
                          padding: "10px 18px", borderRadius: T.rs, cursor: onCooldown ? "not-allowed" : "pointer",
                          background: onCooldown ? T.bar : `${sk.color}15`,
                          border: `1px solid ${onCooldown ? T.divider : sk.color + "40"}`,
                          color: onCooldown ? T.textDim : sk.color,
                          fontWeight: 700, fontSize: 12, opacity: onCooldown ? 0.5 : 1,
                          transition: "all 0.1s",
                        }}>
                          {sk.emoji} {sk.name} {onCooldown && "⏳"}
                        </div>
                      );
                    })}
                    {equippedSkills.filter(Boolean).length === 0 && (
                      <div style={{ fontSize: 11, color: T.textDim }}>No skills equipped. Visit Growth page to manage skills.</div>
                    )}
                  </div>
                </Card>

                {/* Battle log */}
                <Card>
                  <div style={{ fontSize: 12, fontWeight: 700, color: T.white, marginBottom: 8 }}>📜 Battle Log</div>
                  <div ref={logRef} style={{ maxHeight: 150, overflow: "auto", fontSize: 11, color: T.textSec }}>
                    {log.slice(-20).map((l, i) => (
                      <div key={i} style={{ padding: "2px 0", borderBottom: `1px solid ${T.divider}` }}>{l.msg}</div>
                    ))}
                    {log.length === 0 && <div style={{ color: T.textDim }}>Battle started...</div>}
                  </div>
                </Card>
              </div>
            );
          })()}

          {/* ═══════════════ GROWTH PAGE ═══════════════ */}
          {page === "growth" && (
            <div>
              <PageTitle icon="📊" title="Growth Stats" subtitle="Spend gold to increase your base stats" />

              <div style={{ display: "grid", gridTemplateColumns: `repeat(auto-fill, minmax(${isMobile ? "100%" : "280px"}, 1fr))`, gap: 12, marginBottom: 24 }}>
                {[
                  { stat: "atk", label: "Attack", icon: "⚔️", color: T.danger, desc: `+3 ATK per level`, value: `${baseAtk} ATK` },
                  { stat: "hp", label: "Health", icon: "❤️", color: T.success, desc: `+20 Max HP per level`, value: `${baseHp} HP` },
                  { stat: "def", label: "Defense", icon: "🛡️", color: T.info, desc: `+2 DEF per level`, value: `${baseDef} DEF` },
                ].map(g => {
                  const cost = growthCost(growth[g.stat]);
                  const canAfford = gold >= cost;
                  return (
                    <Card key={g.stat} style={{ padding: 20 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
                        <div style={{
                          width: 48, height: 48, borderRadius: T.r,
                          background: `${g.color}15`, border: `1px solid ${g.color}30`,
                          display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24,
                        }}>{g.icon}</div>
                        <div>
                          <div style={{ fontSize: 15, fontWeight: 800, color: T.white }}>{g.label}</div>
                          <div style={{ fontSize: 11, color: T.textSec }}>Level {growth[g.stat]} • {g.value}</div>
                        </div>
                      </div>
                      <div style={{ fontSize: 11, color: T.textDim, marginBottom: 10 }}>{g.desc}</div>
                      <div style={{ display: "flex", gap: 8 }}>
                        <Btn small color={canAfford ? g.color : T.textDim} disabled={!canAfford} onClick={() => upgradeGrowth(g.stat)}>
                          +1 (💰{fmt(cost)})
                        </Btn>
                        <Btn small color={canAfford ? g.color : T.textDim} disabled={!canAfford} onClick={() => upgradeGrowthMax(g.stat)}>
                          MAX
                        </Btn>
                      </div>
                    </Card>
                  );
                })}
              </div>

              {/* Total Power */}
              <Card style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 14, fontWeight: 800, color: T.white, marginBottom: 12 }}>⚡ Total Power</div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 10 }}>
                  {[
                    { label: "Total ATK", value: fmt(totalAtk), color: T.danger },
                    { label: "Total DEF", value: fmt(totalDef), color: T.info },
                    { label: "Total HP", value: fmt(totalMaxHp), color: T.success },
                    { label: "Crit Rate", value: `${critRate}%`, color: T.orange },
                    { label: "Crit Damage", value: `${critDmg}%`, color: T.warning },
                    { label: "Gold Bonus", value: `+${Math.floor((goldMult - 1) * 100)}%`, color: T.gold },
                  ].map((s, i) => (
                    <div key={i} style={{ textAlign: "center", padding: 12, borderRadius: T.rs, background: T.bgDeep }}>
                      <div style={{ fontSize: 16, fontWeight: 900, color: s.color }}>{s.value}</div>
                      <div style={{ fontSize: 9, color: T.textDim, fontWeight: 700, marginTop: 2 }}>{s.label}</div>
                    </div>
                  ))}
                </div>
              </Card>

              {/* Skills management */}
              <Card>
                <div style={{ fontSize: 14, fontWeight: 800, color: T.white, marginBottom: 12 }}>⚡ Combat Skills</div>
                <div style={{ display: "grid", gridTemplateColumns: `repeat(auto-fill, minmax(${isMobile ? "100%" : "250px"}, 1fr))`, gap: 10 }}>
                  {COMBAT_SKILLS.map(sk => {
                    const unlocked = unlockedSkills.includes(sk.id);
                    const isEquipped = equippedSkills.includes(sk.id);
                    return (
                      <div key={sk.id} style={{
                        padding: 14, borderRadius: T.rs,
                        background: unlocked ? `${sk.color}08` : T.bgDeep,
                        border: `1px solid ${unlocked ? sk.color + "25" : T.divider}`,
                        opacity: unlocked ? 1 : 0.4,
                      }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                          <span style={{ fontSize: 18 }}>{sk.emoji}</span>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 12, fontWeight: 700, color: unlocked ? sk.color : T.textDim }}>{sk.name}</div>
                            <div style={{ fontSize: 10, color: T.textDim }}>{sk.dmgMult * 100}% DMG • {sk.cooldown / 1000}s CD</div>
                          </div>
                          {unlocked ? (
                            <Btn small color={isEquipped ? T.danger : T.success}
                              onClick={() => {
                                if (isEquipped) {
                                  setEquippedSkills(prev => prev.map(s => s === sk.id ? null : s));
                                } else {
                                  setEquippedSkills(prev => {
                                    const idx = prev.indexOf(null);
                                    if (idx >= 0) { const n = [...prev]; n[idx] = sk.id; return n; }
                                    return prev;
                                  });
                                }
                              }}>
                              {isEquipped ? "Remove" : "Equip"}
                            </Btn>
                          ) : (
                            <Badge color={T.textDim}>Stage {sk.unlockStage}</Badge>
                          )}
                        </div>
                        <div style={{ fontSize: 10, color: T.textSec }}>{sk.desc}</div>
                      </div>
                    );
                  })}
                </div>
              </Card>
            </div>
          )}

          {/* ═══════════════ EQUIPMENT PAGE ═══════════════ */}
          {page === "equipment" && (
            <div>
              <PageTitle icon="🎒" title="Equipment" subtitle={`${equipment.length} items owned`} />

              {/* Equipped slots */}
              <Card style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: T.white, marginBottom: 12 }}>Equipped Gear</div>
                <div style={{ display: "grid", gridTemplateColumns: `repeat(auto-fill, minmax(${isMobile ? "100%" : "200px"}, 1fr))`, gap: 8 }}>
                  {EQUIP_TYPES.map(slot => {
                    const eqId = equipped[slot.id];
                    const eq = eqId ? equipment.find(e => e.id === eqId) : null;
                    return (
                      <div key={slot.id} style={{
                        padding: 12, borderRadius: T.rs,
                        background: eq ? `${rarityColor(eq.rarity)}08` : T.bgDeep,
                        border: `1px solid ${eq ? rarityColor(eq.rarity) + "30" : T.divider}`,
                        cursor: eq ? "pointer" : "default",
                      }} onClick={() => eq && unequipItem(slot.id)}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: T.textDim, marginBottom: 4, textTransform: "uppercase" }}>{slot.name}</div>
                        {eq ? (
                          <div>
                            <div style={{ fontSize: 12, fontWeight: 700, color: rarityColor(eq.rarity) }}>
                              {eq.emoji} {eq.name}
                            </div>
                            <div style={{ fontSize: 10, color: T.textSec, marginTop: 2 }}>
                              {Object.entries(eq.stats).map(([k, v]) => `${k.toUpperCase()} +${v}`).join(" • ")}
                            </div>
                          </div>
                        ) : (
                          <div style={{ fontSize: 11, color: T.textDim }}>{slot.emoji} Empty</div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </Card>

              {/* Inventory — grouped by type */}
              {EQUIP_TYPES.map(type => {
                const items = equipment.filter(e => e.type === type.id && !Object.values(equipped).includes(e.id));
                if (items.length === 0) return null;

                // Group by rarity for merge info
                const byRarity = {};
                items.forEach(e => { byRarity[e.rarity] = (byRarity[e.rarity] || 0) + 1; });

                return (
                  <Card key={type.id} style={{ marginBottom: 12 }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: T.white }}>{type.emoji} {type.name}s ({items.length})</div>
                      {/* Merge buttons */}
                      <div style={{ display: "flex", gap: 4 }}>
                        {RARITIES.slice(0, -1).map(r => {
                          const count = byRarity[r.id] || 0;
                          if (count < 5) return null;
                          return (
                            <Btn key={r.id} small color={r.color} onClick={() => mergeEquipment(type.id, r.id)}>
                              Merge {r.name} ({count}/5)
                            </Btn>
                          );
                        })}
                      </div>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: `repeat(auto-fill, minmax(${isMobile ? "100%" : "220px"}, 1fr))`, gap: 6 }}>
                      {items.sort((a, b) => b.rarityIdx - a.rarityIdx).map(eq => (
                        <div key={eq.id} onClick={() => equipItem(eq.id)} style={{
                          padding: 10, borderRadius: T.rs, cursor: "pointer",
                          background: `${rarityColor(eq.rarity)}06`,
                          border: `1px solid ${rarityColor(eq.rarity)}20`,
                          transition: "all 0.1s",
                        }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <span style={{ fontSize: 16 }}>{eq.emoji}</span>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontSize: 11, fontWeight: 700, color: rarityColor(eq.rarity) }}>{eq.name}</div>
                              <div style={{ fontSize: 9, color: T.textSec }}>
                                {Object.entries(eq.stats).map(([k, v]) => `${k.toUpperCase()} +${v}`).join(" • ")}
                              </div>
                            </div>
                            <Badge color={rarityColor(eq.rarity)}>{RARITIES.find(r => r.id === eq.rarity)?.name?.[0]}</Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </Card>
                );
              })}

              {equipment.filter(e => !Object.values(equipped).includes(e.id)).length === 0 && (
                <Card style={{ textAlign: "center", padding: 40 }}>
                  <div style={{ fontSize: 32, marginBottom: 8 }}>🎒</div>
                  <div style={{ fontSize: 14, color: T.textSec }}>No equipment yet. Visit the Summon page to get gear!</div>
                </Card>
              )}
            </div>
          )}

          {/* ═══════════════ SUMMON PAGE ═══════════════ */}
          {page === "summon" && (
            <div>
              <PageTitle icon="✨" title="Summon Equipment" subtitle="Spend diamonds to summon powerful gear" />

              <Card style={{ marginBottom: 16, padding: 24, textAlign: "center" }}>
                <div style={{ fontSize: 48, marginBottom: 12 }}>✨</div>
                <div style={{ fontSize: 14, color: T.textSec, marginBottom: 20 }}>
                  Each summon gives you a random piece of equipment with a chance at rare and legendary gear!
                </div>

                {/* Rarity rates */}
                <div style={{ display: "flex", gap: 6, justifyContent: "center", flexWrap: "wrap", marginBottom: 20 }}>
                  {RARITIES.map(r => (
                    <Badge key={r.id} color={r.color}>{r.name} {r.weight}%</Badge>
                  ))}
                </div>

                <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
                  <Btn color={T.purple} disabled={diamonds < 100} onClick={() => summonEquipment(1)}>
                    Summon x1 (💎100)
                  </Btn>
                  <Btn color={T.gold} disabled={diamonds < 900} onClick={() => summonEquipment(10)}>
                    Summon x10 (💎900)
                  </Btn>
                </div>

                <div style={{ fontSize: 11, color: T.textDim, marginTop: 10 }}>
                  Diamonds: 💎 {fmt(diamonds)} • Total Summons: {stats.summons || 0}
                </div>
              </Card>

              {/* Summon results overlay */}
              {showSummonResult && (
                <Card glowColor={T.purple} style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 14, fontWeight: 800, color: T.white, marginBottom: 12, textAlign: "center" }}>
                    🎉 Summon Results!
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: `repeat(auto-fill, minmax(${isMobile ? "130px" : "180px"}, 1fr))`, gap: 8 }}>
                    {showSummonResult.map((eq, i) => (
                      <div key={i} style={{
                        padding: 12, borderRadius: T.rs, textAlign: "center",
                        background: `${rarityColor(eq.rarity)}10`,
                        border: `1px solid ${rarityColor(eq.rarity)}30`,
                      }}>
                        <div style={{ fontSize: 24, marginBottom: 4 }}>{eq.emoji}</div>
                        <div style={{ fontSize: 11, fontWeight: 700, color: rarityColor(eq.rarity) }}>{eq.name}</div>
                        <div style={{ fontSize: 9, color: T.textSec }}>
                          {RARITIES.find(r => r.id === eq.rarity)?.name}
                        </div>
                        <div style={{ fontSize: 9, color: T.textDim, marginTop: 2 }}>
                          {Object.entries(eq.stats).map(([k, v]) => `+${v} ${k}`).join(", ")}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div style={{ textAlign: "center", marginTop: 12 }}>
                    <Btn small onClick={() => setShowSummonResult(null)}>Close</Btn>
                  </div>
                </Card>
              )}

              {/* Merge instructions */}
              <Card>
                <div style={{ fontSize: 13, fontWeight: 700, color: T.white, marginBottom: 8 }}>🔨 Merge System</div>
                <div style={{ fontSize: 12, color: T.textSec }}>
                  Combine 5 equipment of the same type and rarity to create 1 equipment of the next rarity tier.
                  Go to the Equipment page to merge your gear!
                </div>
              </Card>
            </div>
          )}

          {/* ═══════════════ PETS PAGE ═══════════════ */}
          {page === "pets" && (
            <div>
              <PageTitle icon="🐾" title="Pets" subtitle="Companions that boost your stats" />

              {/* Active pets */}
              <Card style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: T.white, marginBottom: 10 }}>
                  Active Pets ({activePets.length}/{petSlots})
                </div>
                {activePets.length === 0 ? (
                  <div style={{ fontSize: 11, color: T.textDim }}>No pets active. Equip a pet for stat bonuses!</div>
                ) : (
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {activePets.map(pName => {
                      const pDef = PET_DEFS.find(p => p.name === pName);
                      if (!pDef) return null;
                      return (
                        <div key={pName} style={{
                          padding: 12, borderRadius: T.rs,
                          background: `${rarityColor(pDef.rarity)}10`,
                          border: `1px solid ${rarityColor(pDef.rarity)}30`,
                          display: "flex", alignItems: "center", gap: 8,
                        }}>
                          <span style={{ fontSize: 20 }}>{pDef.emoji}</span>
                          <div>
                            <div style={{ fontSize: 12, fontWeight: 700, color: rarityColor(pDef.rarity) }}>{pDef.name}</div>
                            <div style={{ fontSize: 9, color: T.textSec }}>
                              {Object.entries(pDef.bonus).map(([k, v]) => `+${v}% ${k}`).join(", ")}
                            </div>
                          </div>
                          <Btn small color={T.danger} onClick={() => setActivePets(prev => prev.filter(p => p !== pName))}>×</Btn>
                        </div>
                      );
                    })}
                  </div>
                )}
              </Card>

              {/* All pets */}
              <Card>
                <div style={{ fontSize: 13, fontWeight: 700, color: T.white, marginBottom: 10 }}>All Pets</div>
                {pets.length === 0 ? (
                  <div style={{ fontSize: 12, color: T.textDim, textAlign: "center", padding: 30 }}>
                    <div style={{ fontSize: 32, marginBottom: 8 }}>🐾</div>
                    No pets collected yet. Pets can be obtained from boss stages and special events!
                  </div>
                ) : (
                  <div style={{ display: "grid", gridTemplateColumns: `repeat(auto-fill, minmax(${isMobile ? "100%" : "240px"}, 1fr))`, gap: 8 }}>
                    {pets.map(pName => {
                      const pDef = PET_DEFS.find(p => p.name === pName);
                      if (!pDef) return null;
                      const isActive = activePets.includes(pName);
                      return (
                        <div key={pName} onClick={() => {
                          if (isActive) {
                            setActivePets(prev => prev.filter(p => p !== pName));
                          } else if (activePets.length < petSlots) {
                            setActivePets(prev => [...prev, pName]);
                          }
                        }} style={{
                          padding: 14, borderRadius: T.rs, cursor: "pointer",
                          background: isActive ? `${rarityColor(pDef.rarity)}10` : T.bgDeep,
                          border: `1px solid ${isActive ? rarityColor(pDef.rarity) + "40" : T.divider}`,
                        }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            <span style={{ fontSize: 24 }}>{pDef.emoji}</span>
                            <div>
                              <div style={{ fontSize: 12, fontWeight: 700, color: rarityColor(pDef.rarity) }}>{pDef.name}</div>
                              <div style={{ fontSize: 10, color: T.textSec }}>
                                {Object.entries(pDef.bonus).map(([k, v]) => `+${v}% ${k}`).join(", ")}
                              </div>
                            </div>
                            {isActive && <Badge color={T.success}>Active</Badge>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </Card>
            </div>
          )}

          {/* ═══════════════ STATS PAGE ═══════════════ */}
          {page === "stats" && (
            <div>
              <PageTitle icon="🏆" title="Statistics" subtitle="Your adventure at a glance" />

              <div style={{ display: "grid", gridTemplateColumns: `repeat(auto-fill, minmax(${isMobile ? "140px" : "160px"}, 1fr))`, gap: 10, marginBottom: 16 }}>
                {[
                  { icon: "⏱️", value: timeStr, label: "TIME PLAYED", color: T.info },
                  { icon: "📍", value: stageLabel, label: "CURRENT STAGE", color: chapter.color },
                  { icon: "🏔️", value: highestLabel, label: "HIGHEST STAGE", color: T.gold },
                  { icon: "💰", value: fmt(gold), label: "GOLD", color: T.gold },
                  { icon: "💎", value: fmt(diamonds), label: "DIAMONDS", color: T.purple },
                  { icon: "⚔️", value: fmt(combatStats.kills), label: "MONSTERS SLAIN", color: T.danger },
                ].map((s, i) => (
                  <Card key={i} style={{ textAlign: "center", padding: 16 }}>
                    <div style={{ fontSize: 22, marginBottom: 4 }}>{s.icon}</div>
                    <div style={{ fontSize: 18, fontWeight: 900, color: s.color }}>{s.value}</div>
                    <div style={{ fontSize: 9, color: T.textDim, fontWeight: 700, letterSpacing: 0.5 }}>{s.label}</div>
                  </Card>
                ))}
              </div>

              <Card style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: T.white, marginBottom: 10 }}>⚔️ Combat</div>
                <StatRow label="Monsters Killed" value={fmt(combatStats.kills)} color={T.danger} />
                <StatRow label="Bosses Killed" value={String(combatStats.bossesKilled || 0)} color={T.orange} />
                <StatRow label="Deaths" value={String(combatStats.deaths)} color={T.danger} />
                <StatRow label="Total Damage" value={fmt(combatStats.totalDamage)} color={T.orange} />
                <StatRow label="Highest Hit" value={fmt(combatStats.highestHit || 0)} color={T.gold} />
                <StatRow label="Total Gold Earned" value={fmt(combatStats.totalGoldEarned || 0)} color={T.gold} />
              </Card>

              <Card>
                <div style={{ fontSize: 13, fontWeight: 700, color: T.white, marginBottom: 10 }}>📈 Growth</div>
                <StatRow label="ATK Level" value={String(growth.atk)} color={T.danger} />
                <StatRow label="HP Level" value={String(growth.hp)} color={T.success} />
                <StatRow label="DEF Level" value={String(growth.def)} color={T.info} />
                <StatRow label="Equipment Owned" value={String(equipment.length)} color={T.warning} />
                <StatRow label="Total Summons" value={String(stats.summons || 0)} color={T.purple} />
                <StatRow label="Total Merges" value={String(stats.merges || 0)} color={T.purple} />
              </Card>
            </div>
          )}

          {/* ═══════════════ SETTINGS PAGE ═══════════════ */}
          {page === "settings" && (
            <div>
              <PageTitle icon="⚙️" title="Settings" subtitle="Game preferences" />
              <Card>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 0" }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: T.white }}>Auto Progress</div>
                    <div style={{ fontSize: 11, color: T.textSec }}>Automatically advance to the next stage after clearing</div>
                  </div>
                  <Btn small color={autoProgress ? T.success : T.textDim} onClick={() => setAutoProgress(!autoProgress)}>
                    {autoProgress ? "ON" : "OFF"}
                  </Btn>
                </div>
              </Card>
            </div>
          )}

        </div>
      </div>

      {/* CSS animation for pulse */}
      <style>{`
        @keyframes pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.05); }
        }
      `}</style>
    </div>
  );
}
