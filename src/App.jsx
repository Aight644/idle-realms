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
  bg: "#021218",
  panel: "#031926",
  card: "#042233",
  border: "#0a3a50",
  text: "#a8d8ea",
  ts: "#5a9fb5",
  td: "#2d6a80",
  acc: "#00d4ff",
  accD: "#0097b8",
  ok: "#00ffb3",
  okD: "#00c285",
  bad: "#ff006e",
  badD: "#cc0055",
  warn: "#ffb700",
  gold: "#ffd60a",
  purp: "#7b61ff",
  white: "#e0f7ff",
  glow: "#00d4ff",
};

const GLOW_STYLE = "0 0 8px #00d4ff55, 0 0 20px #00d4ff22";
const GLOW_OK = "0 0 8px #00ffb355";
const GLOW_BAD = "0 0 8px #ff006e55";

function xpFor(lv){return Math.floor(50*Math.pow(1.1,lv-1))}
function fmt(n){if(n>=1e9)return(n/1e9).toFixed(1)+"B";if(n>=1e6)return(n/1e6).toFixed(1)+"M";if(n>=1e3)return(n/1e3).toFixed(1)+"K";return String(Math.floor(n))}

// === ITEMS (Deep Ocean themed) ===
const ITEMS={
  kelp:{n:"Kelp",i:"🌿",s:1},
  soft_coral:{n:"Soft Coral",i:"🪸",s:1},
  glowfish:{n:"Glowfish",i:"🐟",s:1},
  salt_crystals:{n:"Salt Crystals",i:"🔷",s:1},
  shell_fragments:{n:"Shell Fragments",i:"🐚",s:1},
  thermal_ore:{n:"Thermal Ore",i:"🔶",s:1},
  abyss_crystal:{n:"Abyss Crystal",i:"💎",s:1},
  ocean_fiber:{n:"Ocean Fiber",i:"🧵",s:1},
  sea_mushrooms:{n:"Sea Mushrooms",i:"🍄",s:1},
  trench_stone:{n:"Trench Stone",i:"🪨",s:1},

  coral_blocks:{n:"Coral Blocks",i:"🟦",s:1},
  reinforced_alloy:{n:"Reinforced Alloy",i:"⚙️",s:1},
  biofuel:{n:"Biofuel",i:"🟩",s:1},
  pressure_glass:{n:"Pressure Glass",i:"🔮",s:1},
  enzyme_compound:{n:"Enzyme Compound",i:"🧪",s:1},
  luminescent_gel:{n:"Luminescent Gel",i:"✨",s:1},
  drone_processor:{n:"Drone Processor",i:"📡",s:1},
  pressure_reactor:{n:"Pressure Reactor",i:"⚡",s:1},

  // Tools
  coral_cutter:{n:"Coral Cutter",i:"🔪",s:1},
  deep_drill:{n:"Deep Drill",i:"🔩",s:1},
  artifact_scanner:{n:"Artifact Scanner",i:"📟",s:1},

  // Weapons
  basic_harpoon:{n:"Basic Harpoon",i:"🗡️",eq:"weapon",st:{atk:8}},
  pulse_harpoon:{n:"Pulse Harpoon",i:"⚡",eq:"weapon",st:{atk:14,rng:4}},
  shock_harpoon:{n:"Shock Harpoon",i:"🌩️",eq:"weapon",st:{atk:18,rng:6}},
  thermal_lance:{n:"Thermal Lance",i:"🔥",eq:"weapon",st:{atk:26,mag:8}},

  // Armor
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

  // Food / Consumables
  healing_serum:{n:"Healing Serum",i:"💉",s:1,food:1,heal:20},
  kelp_broth:{n:"Kelp Broth",i:"🍵",s:1,food:1,heal:45},
  pressure_tonic:{n:"Pressure Tonic",i:"⚗️",s:1,food:1,heal:90},
  bio_stim:{n:"Bio Stim",i:"💊",s:1,food:1,heal:65},

  // Drinks
  bioluminescent_drink:{n:"Bioluminescent Brew",i:"🫧",s:1,drink:1},
  deep_extract:{n:"Deep Extract",i:"🧬",s:1,drink:1},
  void_elixir:{n:"Void Elixir",i:"🌌",s:1,drink:1},
};

// === SKILLS (Deep Ocean themed) ===
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
];

// === COMBAT SKILLS ===
const CSUBS=[
  {id:"pressure_resistance",name:"Pressure Resistance",icon:"💠",color:"#00d4ff"},
  {id:"harpoon_mastery",name:"Harpoon Mastery",icon:"🗡️",color:"#ff6b9d"},
  {id:"combat_systems",name:"Combat Systems",icon:"⚔️",color:"#f87171"},
  {id:"drone_combat",name:"Drone Combat",icon:"🤖",color:"#fb923c"},
  {id:"depth_shielding",name:"Depth Shielding",icon:"🛡️",color:"#60a5ff"},
  {id:"sonic_weapons",name:"Sonic Weapons",icon:"🔊",color:"#4ade80"},
  {id:"leviathan_lore",name:"Leviathan Lore",icon:"🐉",color:"#c084fc"},
];

// === ZONES ===
const ZONES=[
  {id:"z1",name:"Sunlit Reef",icon:"🪸",lv:1,mobs:[
    {n:"Coral Crab",hp:20,atk:2,def:1,xp:8,g:3},
    {n:"Reef Eel",hp:35,atk:4,def:2,xp:15,g:6}],
    boss:{n:"Reef Hunter",hp:120,atk:8,def:5,xp:60,g:30}},
  {id:"z2",name:"Coral Forest",icon:"🌊",lv:10,mobs:[
    {n:"Glass Jellyfish",hp:70,atk:9,def:5,xp:28,g:12},
    {n:"Shadow Octopus",hp:100,atk:13,def:8,xp:42,g:20}],
    boss:{n:"Predator Squid",hp:350,atk:22,def:14,xp:160,g:90}},
  {id:"z3",name:"Midnight Depths",icon:"🌑",lv:25,mobs:[
    {n:"Bone Fish",hp:150,atk:20,def:14,xp:60,g:30},
    {n:"Electric Ray",hp:240,atk:28,def:18,xp:90,g:45}],
    boss:{n:"Deep Angler",hp:700,atk:42,def:30,xp:320,g:170}},
  {id:"z4",name:"Hydrothermal Vents",icon:"🔥",lv:40,mobs:[
    {n:"Pressure Worm",hp:300,atk:36,def:24,xp:120,g:60},
    {n:"Abyss Crawler",hp:480,atk:48,def:36,xp:180,g:95}],
    boss:{n:"Thermal Leviathan",hp:1400,atk:72,def:48,xp:580,g:340}},
  {id:"z5",name:"Black Trench",icon:"🕳️",lv:60,mobs:[
    {n:"Void Eel",hp:480,atk:60,def:42,xp:240,g:120},
    {n:"Trench Serpent",hp:840,atk:84,def:60,xp:420,g:210}],
    boss:{n:"Abyss Kraken",hp:3000,atk:120,def:84,xp:1200,g:720}},
];

const ESLOTS=[
  {id:"head",n:"Head",i:"⛑️"},
  {id:"body",n:"Body",i:"🔵"},
  {id:"hands",n:"Hands",i:"🧤"},
  {id:"feet",n:"Feet",i:"👢"},
  {id:"weapon",n:"Weapon",i:"🗡️"},
  {id:"shield",n:"Shield",i:"🛡️"},
  {id:"neck",n:"Neck",i:"📿"},
  {id:"ring",n:"Ring",i:"💍"},
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
    try{
      const cred=await createUserWithEmailAndPassword(auth,email.trim(),password);
      await updateProfile(cred.user,{displayName:displayName.trim()});
      onLogin(cred.user);
    }catch(e){setError(e.code==="auth/email-already-in-use"?"Email already in use":e.message)}
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
  const inp={
    padding:"10px 14px",borderRadius:6,
    background:"#031926",border:"1px solid "+C.border,
    color:C.white,fontSize:13,outline:"none",width:"100%",
    boxSizing:"border-box",fontFamily:FONT_BODY,
  };
  return(
    <div style={{width:"100%",height:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:C.bg,fontFamily:FONT,overflow:"hidden",position:"relative"}}>
      {/* Animated background bubbles */}
      <div style={{position:"absolute",inset:0,overflow:"hidden",pointerEvents:"none"}}>
        {[...Array(12)].map((_,i)=>(
          <div key={i} style={{
            position:"absolute",
            width:Math.random()*60+10+"px",height:Math.random()*60+10+"px",
            borderRadius:"50%",
            background:"radial-gradient(circle, "+C.acc+"15 0%, transparent 70%)",
            left:Math.random()*100+"%",
            top:Math.random()*100+"%",
            animation:`float${i%3} ${6+i*1.2}s ease-in-out infinite`,
            animationDelay:i*0.7+"s",
          }}/>
        ))}
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
            {["login","signup"].map(t=>(
              <div key={t} onClick={()=>{setTab(t);clearForm()}} style={{
                flex:1,padding:"9px 0",textAlign:"center",borderRadius:6,
                background:tab===t?C.acc+"25":"transparent",
                color:tab===t?C.acc:C.td,fontWeight:700,fontSize:12,cursor:"pointer",
                border:"1px solid "+(tab===t?C.acc+"50":"transparent"),
                transition:"all 0.2s",letterSpacing:1,
              }}>{t==="login"?"SIGN IN":"CREATE ACCOUNT"}</div>
            ))}
          </div>
          {error&&<div style={{padding:"8px 12px",borderRadius:6,background:C.bad+"20",color:C.bad,fontSize:12,fontWeight:600,marginBottom:12,border:"1px solid "+C.bad+"40"}}>{error}</div>}
          <div style={{display:"flex",flexDirection:"column",gap:10}}>
            {tab==="signup"&&<input value={displayName} onChange={e=>setDisplayName(e.target.value)} placeholder="Commander Name" style={inp}/>}
            <input value={email} onChange={e=>setEmail(e.target.value)} placeholder="Email" type="email" style={inp}/>
            <input value={password} onChange={e=>setPassword(e.target.value)} placeholder="Password" type="password" style={inp} onKeyDown={e=>e.key==="Enter"&&(tab==="login"?handleLogin():null)}/>
            {tab==="signup"&&<input value={confirmPw} onChange={e=>setConfirmPw(e.target.value)} placeholder="Confirm Password" type="password" style={inp}/>}
            <div onClick={loading?undefined:(tab==="login"?handleLogin:handleSignup)} style={{
              padding:"13px 0",borderRadius:6,marginTop:4,
              background:loading?C.card:"linear-gradient(90deg, "+C.acc+"30, "+C.accD+"30)",
              color:loading?C.td:C.acc,
              border:"1px solid "+(loading?C.border:C.acc+"60"),
              fontWeight:700,fontSize:13,textAlign:"center",cursor:loading?"default":"pointer",
              letterSpacing:2,transition:"all 0.2s",
              boxShadow:loading?"none":GLOW_STYLE,
            }}>{loading?"CONNECTING...":(tab==="login"?"DIVE IN":"INITIALIZE")}</div>
          </div>
        </div>
      </div>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&family=Inter:wght@400;500;600&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: ${C.bg}; overflow: hidden; }
        @keyframes float0 { 0%,100%{transform:translateY(0) scale(1)} 50%{transform:translateY(-30px) scale(1.1)} }
        @keyframes float1 { 0%,100%{transform:translateY(0) scale(1)} 50%{transform:translateY(-50px) scale(0.9)} }
        @keyframes float2 { 0%,100%{transform:translateY(0) scale(1)} 50%{transform:translateY(-20px) scale(1.2)} }
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
  const invRef=useRef(inv);
  invRef.current=inv;

  const sl=useCallback((sid)=>{
    const xp=skills[sid]||0;let lv=1,tot=0;
    while(tot+xpFor(lv)<=xp){tot+=xpFor(lv);lv++}
    return{lv,xp:xp-tot,need:xpFor(lv)};
  },[skills]);

  const combatLv=useMemo(()=>CSUBS.reduce((s,c)=>s+sl(c.id).lv,0),[sl]);

  const pStats=useMemo(()=>{
    let s={hp:50,atk:1,def:0,mag:0,rng:0};
    s.hp+=sl("pressure_resistance").lv*2;
    s.atk+=sl("harpoon_mastery").lv+sl("combat_systems").lv;
    s.def+=sl("depth_shielding").lv;
    s.rng+=sl("sonic_weapons").lv;
    s.mag+=sl("leviathan_lore").lv;
    ESLOTS.forEach(slot=>{const iid=eq[slot.id];if(iid){const it=ITEMS[iid];if(it&&it.st)Object.entries(it.st).forEach(([k,v])=>{const e=enh[iid]||0;s[k]=(s[k]||0)+Math.floor(v*(1+e*0.08))})}});
    return s;
  },[eq,sl,enh]);

  useEffect(()=>{(async()=>{try{const snap=await getDoc(doc(db,"doc_saves",account.uid));if(snap.exists()){const d=snap.data();if(d.skills)setSkills(d.skills);if(d.inv)setInv(d.inv);if(d.eq)setEq(d.eq);if(d.gold)setGold(d.gold);if(d.enh)setEnh(d.enh)}}catch(e){console.error(e)}})()},[account.uid]);
  useEffect(()=>{const t=setInterval(()=>{setDoc(doc(db,"doc_saves",account.uid),{skills,inv,eq,gold,enh,ts:Date.now()},{merge:true}).catch(()=>{})},30000);return()=>clearInterval(t)},[skills,inv,eq,gold,enh,account.uid]);

  const gainXp=useCallback((sid,amt)=>setSkills(p=>({...p,[sid]:(p[sid]||0)+amt})),[]);
  const addIt=useCallback((iid,q)=>setInv(p=>({...p,[iid]:(p[iid]||0)+q})),[]);
  const remIt=useCallback((iid,q)=>setInv(p=>{const c=p[iid]||0;if(c<=q){const n={...p};delete n[iid];return n}return{...p,[iid]:c-q}}),[]);

  // Action tick
  useEffect(()=>{
    if(!curAct)return;
    const sk=SKILLS.find(s=>s.id===curAct.sk);if(!sk)return;
    const act=sk.acts.find(a=>a.id===curAct.act);if(!act)return;
    const dur=act.t*1000;let start=Date.now();
    const tick=setInterval(()=>{
      const p=Math.min(1,(Date.now()-start)/dur);setActProg(p);
      if(p>=1){
        const ci=invRef.current;
        if(act.inp&&!act.inp.every(i=>(ci[i.id]||0)>=i.q)){setCurAct(null);setActProg(0);return}
        if(act.inp)act.inp.forEach(i=>remIt(i.id,i.q));
        gainXp(sk.id,act.xp);
        if(act.out)act.out.forEach(i=>addIt(i.id,i.q));
        start=Date.now();setActProg(0);
      }
    },100);
    return()=>clearInterval(tick);
  },[curAct,gainXp,addIt,remIt]);

  // Combat tick
  useEffect(()=>{
    if(!zoneId||!cbt)return;
    const zone=ZONES.find(z=>z.id===zoneId);if(!zone)return;
    const tick=setInterval(()=>{
      const st=pStats;
      setCbt(prev=>{
        if(!prev)return null;
        let{mob,mhp,php,mxhp,kills,boss}=prev;
        const pd=Math.max(1,st.atk-Math.floor(mob.def*0.5)+Math.floor(Math.random()*3));
        mhp-=pd;
        if(mhp>0){
          const md=Math.max(1,mob.atk-Math.floor(st.def*0.5)+Math.floor(Math.random()*2));
          php-=md;
          const ci=invRef.current;
          if(php<mxhp*0.4&&food&&(ci[food]||0)>0){const f=ITEMS[food];if(f&&f.heal){php=Math.min(mxhp,php+f.heal);remIt(food,1)}}
          if(php<=0){setClog(p=>[...p.slice(-20),"☠️ Destroyed by "+mob.n+"!"]);return{...prev,php:mxhp,mhp:mob.hp,mob}}
        }
        if(mhp<=0){
          const nk=kills+1;const xpp=Math.floor(mob.xp/5);
          CSUBS.forEach(s=>gainXp(s.id,xpp));setGold(g=>g+mob.g);
          setClog(p=>[...p.slice(-20),"⚔️ Neutralized "+mob.n+"! +"+mob.xp+"xp +"+mob.g+"cr"]);
          const nb=(nk%10===9)&&zone.boss;
          const nm=nb?zone.boss:zone.mobs[Math.floor(Math.random()*zone.mobs.length)];
          return{mob:nm,mhp:nm.hp,php,mxhp,kills:nk,boss:nb};
        }
        return{...prev,mhp,php};
      });
    },1500);
    return()=>clearInterval(tick);
  },[zoneId,cbt,pStats,gainXp,food,remIt]);

  const startAct=useCallback((skId,actId)=>{setZoneId(null);setCbt(null);setCurAct({sk:skId,act:actId});setActProg(0);setActSkill(skId)},[]);
  const startZone=useCallback((zid)=>{const z=ZONES.find(x=>x.id===zid);if(!z)return;setCurAct(null);setZoneId(zid);const m=z.mobs[0];setCbt({mob:m,mhp:m.hp,php:pStats.hp,mxhp:pStats.hp,kills:0,boss:false});setClog(["📡 Entered "+z.name+"..."])},[pStats]);
  const stopZone=useCallback(()=>{setZoneId(null);setCbt(null)},[]);
  const equipIt=useCallback((iid)=>{const it=ITEMS[iid];if(!it||!it.eq||(inv[iid]||0)<=0)return;const cur=eq[it.eq];if(cur)addIt(cur,1);remIt(iid,1);setEq(p=>({...p,[it.eq]:iid}))},[inv,eq,addIt,remIt]);
  const unequipIt=useCallback((sid)=>{const iid=eq[sid];if(!iid)return;addIt(iid,1);setEq(p=>{const n={...p};delete n[sid];return n})},[eq,addIt]);
  const doEnh=useCallback((sid)=>{const iid=eq[sid];if(!iid)return;const cl=enh[iid]||0;if(cl>=20)return;const cost=Math.floor(50*Math.pow(1.5,cl));if(gold<cost)return;setGold(g=>g-cost);gainXp("enhancing",20+cl*5);const sr=Math.max(0.2,0.8-cl*0.05);if(Math.random()<sr){setEnh(p=>({...p,[iid]:cl+1}));setClog(p=>[...p.slice(-20),"✨ "+ITEMS[iid].n+" upgraded to +"+(cl+1)+"!"])}else{setEnh(p=>({...p,[iid]:0}));setClog(p=>[...p.slice(-20),"💥 Upgrade failed! "+ITEMS[iid].n+" reset to +0"])}},[eq,enh,gold,gainXp]);

  const skData=SKILLS.find(s=>s.id===actSkill);

  const SkillNav=({sk,running})=>{const s=sl(sk.id);const pct=s.need>0?(s.xp/s.need)*100:0;const act=actSkill===sk.id&&page==="skills";
    return(
      <div onClick={()=>{setActSkill(sk.id);setPage("skills")}} style={{
        display:"flex",alignItems:"center",gap:8,padding:"6px 12px",
        cursor:"pointer",
        background:act?"linear-gradient(90deg,"+C.acc+"15,transparent)":"transparent",
        borderLeft:act?"3px solid "+C.acc:"3px solid transparent",
        transition:"all 0.15s",
      }}>
        <span style={{fontSize:14,width:20,textAlign:"center",filter:running?"drop-shadow(0 0 4px "+sk.color+")":"none"}}>{sk.icon}</span>
        <div style={{flex:1,minWidth:0}}>
          <div style={{display:"flex",justifyContent:"space-between"}}>
            <span style={{fontSize:10,color:act?C.acc:C.text,fontWeight:act?700:500,fontFamily:FONT_BODY}}>{sk.name}</span>
            <span style={{fontSize:10,color:C.ts,fontWeight:700,fontFamily:FONT}}>{s.lv}</span>
          </div>
          <div style={{height:2,borderRadius:1,background:C.bg,overflow:"hidden",marginTop:2}}>
            <div style={{width:pct+"%",height:"100%",background:running?C.ok:sk.color,borderRadius:1,transition:"width 0.3s",boxShadow:running?"0 0 4px "+C.ok:"none"}}/>
          </div>
        </div>
      </div>
    );
  };

  const NavItem=({id,icon,label})=>{
    const act=page===id;
    return(
      <div onClick={()=>setPage(id)} style={{
        display:"flex",alignItems:"center",gap:8,padding:"6px 12px",cursor:"pointer",
        background:act?"linear-gradient(90deg,"+C.acc+"15,transparent)":"transparent",
        borderLeft:act?"3px solid "+C.acc:"3px solid transparent",
        transition:"all 0.15s",
      }}>
        <span style={{fontSize:14,width:20,textAlign:"center"}}>{icon}</span>
        <span style={{fontSize:11,color:act?C.acc:C.text,fontFamily:FONT_BODY,fontWeight:act?600:400}}>{label}</span>
      </div>
    );
  };

  return(
    <div style={{width:"100%",height:"100vh",display:"flex",fontFamily:FONT,background:C.bg,color:C.text,overflow:"hidden"}}>

      {/* LEFT NAV */}
      <div style={{width:210,flexShrink:0,display:"flex",flexDirection:"column",background:C.panel,borderRight:"1px solid "+C.border,overflowY:"auto"}}>
        {/* Player header */}
        <div style={{padding:"14px 12px",borderBottom:"1px solid "+C.border,background:"linear-gradient(180deg,#042233,#031926)"}}>
          <div style={{fontSize:12,fontWeight:700,color:C.white,letterSpacing:1}}>{account.displayName}</div>
          <div style={{fontSize:9,color:C.ts,marginTop:2,fontFamily:FONT_BODY}}>Depth Rank {combatLv}</div>
          <div style={{fontSize:11,color:C.gold,fontWeight:700,marginTop:6,fontFamily:FONT}}>◈ {fmt(gold)} Credits</div>
        </div>

        {/* Gathering */}
        <div style={{padding:"4px 0",borderBottom:"1px solid "+C.border}}>
          <div style={{padding:"5px 12px 3px",fontSize:8,fontWeight:700,color:C.td,textTransform:"uppercase",letterSpacing:2,fontFamily:FONT}}>Gathering</div>
          {SKILLS.filter(s=>s.cat==="gather").map(sk=><SkillNav key={sk.id} sk={sk} running={curAct&&curAct.sk===sk.id}/>)}
        </div>

        {/* Production */}
        <div style={{padding:"4px 0",borderBottom:"1px solid "+C.border}}>
          <div style={{padding:"5px 12px 3px",fontSize:8,fontWeight:700,color:C.td,textTransform:"uppercase",letterSpacing:2,fontFamily:FONT}}>Production</div>
          {SKILLS.filter(s=>s.cat==="prod").map(sk=><SkillNav key={sk.id} sk={sk} running={curAct&&curAct.sk===sk.id}/>)}
        </div>

        {/* Upgrading */}
        <div style={{padding:"4px 0",borderBottom:"1px solid "+C.border}}>
          <div style={{padding:"5px 12px 3px",fontSize:8,fontWeight:700,color:C.td,textTransform:"uppercase",letterSpacing:2,fontFamily:FONT}}>Upgrading</div>
          <div onClick={()=>setPage("enhancing")} style={{
            display:"flex",alignItems:"center",gap:8,padding:"6px 12px",cursor:"pointer",
            background:page==="enhancing"?"linear-gradient(90deg,"+C.acc+"15,transparent)":"transparent",
            borderLeft:page==="enhancing"?"3px solid "+C.acc:"3px solid transparent",
          }}>
            <span style={{fontSize:14,width:20,textAlign:"center"}}>⚡</span>
            <div style={{flex:1}}>
              <div style={{display:"flex",justifyContent:"space-between"}}>
                <span style={{fontSize:10,color:page==="enhancing"?C.acc:C.text,fontFamily:FONT_BODY}}>Upgrading</span>
                <span style={{fontSize:10,color:C.ts,fontWeight:700}}>{sl("enhancing").lv}</span>
              </div>
              <div style={{height:2,borderRadius:1,background:C.bg,overflow:"hidden",marginTop:2}}>
                <div style={{width:(sl("enhancing").xp/sl("enhancing").need)*100+"%",height:"100%",background:C.warn,borderRadius:1}}/>
              </div>
            </div>
          </div>
        </div>

        {/* Combat */}
        <div style={{padding:"4px 0",borderBottom:"1px solid "+C.border}}>
          <div style={{padding:"5px 12px 3px",fontSize:8,fontWeight:700,color:C.td,textTransform:"uppercase",letterSpacing:2,fontFamily:FONT}}>Combat</div>
          <div onClick={()=>setPage("combat")} style={{
            display:"flex",alignItems:"center",gap:8,padding:"6px 12px",cursor:"pointer",
            background:page==="combat"?"linear-gradient(90deg,"+C.bad+"15,transparent)":"transparent",
            borderLeft:page==="combat"?"3px solid "+C.bad:"3px solid transparent",
          }}>
            <span style={{fontSize:14,width:20,textAlign:"center"}}>⚔️</span>
            <span style={{fontSize:11,color:page==="combat"?C.bad:C.text,fontFamily:FONT_BODY}}>Combat Zones</span>
          </div>
          {CSUBS.map(cs=>{const s=sl(cs.id);return(
            <div key={cs.id} style={{display:"flex",alignItems:"center",gap:6,padding:"2px 12px 2px 28px"}}>
              <span style={{fontSize:9}}>{cs.icon}</span>
              <div style={{flex:1}}>
                <div style={{display:"flex",justifyContent:"space-between"}}>
                  <span style={{fontSize:8,color:C.td,fontFamily:FONT_BODY}}>{cs.name}</span>
                  <span style={{fontSize:8,color:C.ts,fontWeight:700}}>{s.lv}</span>
                </div>
                <div style={{height:2,borderRadius:1,background:C.bg,overflow:"hidden"}}>
                  <div style={{width:(s.xp/s.need)*100+"%",height:"100%",background:cs.color,borderRadius:1}}/>
                </div>
              </div>
            </div>
          )})}
        </div>

        <div style={{padding:"4px 0",borderBottom:"1px solid "+C.border}}>
          <NavItem id="equipment" icon="🗡️" label="Equipment"/>
          <NavItem id="inventory" icon="🎒" label="Inventory"/>
        </div>
        <div style={{flex:1}}/>
        <div onClick={onLogout} style={{padding:"10px 12px",borderTop:"1px solid "+C.border,fontSize:10,color:C.td,cursor:"pointer",fontFamily:FONT_BODY,letterSpacing:1}}>
          ◉ LOGOUT
        </div>
      </div>

      {/* CENTER */}
      <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}}>

        {/* Action bar */}
        {curAct&&(()=>{const sk=SKILLS.find(s=>s.id===curAct.sk);const act=sk?sk.acts.find(a=>a.id===curAct.act):null;return(
          <div style={{flexShrink:0,padding:"8px 16px",background:C.panel,borderBottom:"1px solid "+C.border}}>
            <div style={{display:"flex",justifyContent:"space-between",fontSize:10,color:C.ts,marginBottom:4,fontFamily:FONT_BODY}}>
              <span>{sk?sk.icon:""} {sk?sk.name:""} — {act?act.name:""}</span>
              <span onClick={()=>{setCurAct(null);setActProg(0)}} style={{color:C.bad,cursor:"pointer",fontWeight:700,letterSpacing:1}}>■ STOP</span>
            </div>
            <div style={{height:6,borderRadius:3,background:C.bg,overflow:"hidden"}}>
              <div style={{width:actProg*100+"%",height:"100%",borderRadius:3,background:"linear-gradient(90deg,"+C.acc+","+C.ok+")",transition:"width 0.1s linear",boxShadow:GLOW_STYLE}}/>
            </div>
          </div>
        );})()}

        {/* Combat bar */}
        {cbt&&(
          <div style={{flexShrink:0,padding:"8px 16px",background:C.panel,borderBottom:"1px solid "+C.border}}>
            <div style={{display:"flex",justifyContent:"space-between",fontSize:10,color:C.ts,marginBottom:4,fontFamily:FONT_BODY}}>
              <span>⚔️ {cbt.mob.n}{cbt.boss?" 👑":""} — Kill #{cbt.kills+1}</span>
              <span onClick={stopZone} style={{color:C.bad,cursor:"pointer",fontWeight:700,letterSpacing:1}}>◄ RETREAT</span>
            </div>
            <div style={{display:"flex",gap:8}}>
              <div style={{flex:1}}>
                <div style={{fontSize:9,color:C.td,marginBottom:2,fontFamily:FONT_BODY}}>You: {cbt.php}/{cbt.mxhp}</div>
                <div style={{height:5,borderRadius:3,background:C.bg,overflow:"hidden"}}>
                  <div style={{width:(cbt.php/cbt.mxhp)*100+"%",height:"100%",background:C.ok,borderRadius:3,transition:"width 0.2s",boxShadow:GLOW_OK}}/>
                </div>
              </div>
              <div style={{flex:1}}>
                <div style={{fontSize:9,color:C.td,marginBottom:2,fontFamily:FONT_BODY}}>{cbt.mob.n}: {Math.max(0,cbt.mhp)}/{cbt.mob.hp}</div>
                <div style={{height:5,borderRadius:3,background:C.bg,overflow:"hidden"}}>
                  <div style={{width:Math.max(0,(cbt.mhp/cbt.mob.hp)*100)+"%",height:"100%",background:C.bad,borderRadius:3,transition:"width 0.2s",boxShadow:GLOW_BAD}}/>
                </div>
              </div>
            </div>
          </div>
        )}

        <div style={{flex:1,overflow:"auto",padding:20}}>

          {/* SKILL PAGE */}
          {page==="skills"&&skData&&(()=>{const s=sl(skData.id);const pct=s.need>0?(s.xp/s.need)*100:0;return(
            <div style={{maxWidth:700}}>
              <div style={{display:"flex",alignItems:"center",gap:14,marginBottom:16}}>
                <span style={{fontSize:36,filter:"drop-shadow(0 0 10px "+skData.color+")"}}>{skData.icon}</span>
                <div>
                  <div style={{fontSize:16,fontWeight:700,color:C.white,letterSpacing:2}}>{skData.name.toUpperCase()}</div>
                  <div style={{fontSize:11,color:C.ts,marginTop:2,fontFamily:FONT_BODY}}>Level {s.lv} — {fmt(s.xp)} / {fmt(s.need)} XP</div>
                </div>
              </div>
              <div style={{height:8,borderRadius:4,background:C.card,overflow:"hidden",marginBottom:20,border:"1px solid "+C.border}}>
                <div style={{width:pct+"%",height:"100%",borderRadius:4,background:"linear-gradient(90deg,"+skData.color+","+skData.color+"aa)",transition:"width 0.3s",boxShadow:"0 0 8px "+skData.color}}/>
              </div>
              <div style={{fontSize:10,fontWeight:700,color:C.td,marginBottom:10,letterSpacing:2}}>AVAILABLE OPERATIONS</div>
              {skData.acts.map(act=>{const locked=s.lv<act.lv;const canDo=!locked&&(!act.inp||act.inp.every(i=>(inv[i.id]||0)>=i.q));const isAct=curAct&&curAct.act===act.id;return(
                <div key={act.id} style={{
                  display:"flex",alignItems:"center",justifyContent:"space-between",
                  padding:"12px 16px",borderRadius:8,
                  background:isAct?"linear-gradient(90deg,"+C.ok+"12,"+C.card+")":C.card,
                  border:"1px solid "+(isAct?C.ok+"50":C.border),
                  marginBottom:8,opacity:locked?0.35:1,
                  transition:"all 0.2s",
                }}>
                  <div>
                    <div style={{fontSize:12,fontWeight:700,color:isAct?C.ok:C.white,fontFamily:FONT,letterSpacing:1}}>{act.name.toUpperCase()}</div>
                    <div style={{fontSize:10,color:C.ts,marginTop:3,fontFamily:FONT_BODY}}>
                      +{act.xp} XP · {act.t}s
                      {act.inp?" · Needs: "+act.inp.map(i=>(ITEMS[i.id]?ITEMS[i.id].i:"")+i.q).join(" "):""}
                      {act.out?" → "+act.out.map(i=>(ITEMS[i.id]?ITEMS[i.id].i:"")+" "+(ITEMS[i.id]?ITEMS[i.id].n:"")).join(", "):""}
                    </div>
                    {locked&&<div style={{fontSize:9,color:C.bad,marginTop:2,fontFamily:FONT_BODY}}>Requires Level {act.lv}</div>}
                  </div>
                  {!locked&&(
                    <div onClick={()=>{if(canDo)startAct(skData.id,act.id)}} style={{
                      padding:"7px 18px",borderRadius:6,
                      background:isAct?"linear-gradient(90deg,"+C.okD+","+C.ok+")":canDo?"linear-gradient(90deg,"+C.accD+","+C.acc+")":C.card,
                      color:C.bg,fontSize:10,fontWeight:700,cursor:canDo?"pointer":"default",
                      opacity:canDo?1:0.35,letterSpacing:1,fontFamily:FONT,
                      boxShadow:isAct?GLOW_OK:canDo?GLOW_STYLE:"none",
                    }}>{isAct?"ACTIVE":"START"}</div>
                  )}
                </div>
              );})}
            </div>
          );})()}

          {/* COMBAT PAGE */}
          {page==="combat"&&(
            <div style={{maxWidth:700}}>
              <div style={{fontSize:14,fontWeight:700,color:C.white,marginBottom:4,letterSpacing:2}}>COMBAT ZONES</div>
              <div style={{fontSize:11,color:C.ts,marginBottom:16,fontFamily:FONT_BODY}}>
                HP: {pStats.hp} · ATK: {pStats.atk} · DEF: {pStats.def} · Depth Rank: {combatLv}
              </div>
              <div style={{marginBottom:16,padding:"12px 16px",borderRadius:8,background:C.card,border:"1px solid "+C.border}}>
                <div style={{fontSize:9,fontWeight:700,color:C.ts,marginBottom:8,letterSpacing:2}}>EMERGENCY RATIONS (auto-consume below 40% hull integrity)</div>
                <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                  {Object.entries(inv).filter(e=>ITEMS[e[0]]&&ITEMS[e[0]].food).map(e=>{const id=e[0],qty=e[1];return(
                    <div key={id} onClick={()=>setFood(id)} style={{
                      padding:"5px 12px",borderRadius:4,
                      background:food===id?C.ok+"20":C.bg,
                      border:"1px solid "+(food===id?C.ok+"60":C.border),
                      cursor:"pointer",fontSize:11,color:C.text,fontFamily:FONT_BODY,
                      boxShadow:food===id?GLOW_OK:"none",
                    }}>{ITEMS[id].i} {ITEMS[id].n} x{qty}{food===id?" ✓":""}</div>
                  )})}
                  {!Object.entries(inv).some(e=>ITEMS[e[0]]&&ITEMS[e[0]].food)&&<span style={{fontSize:11,color:C.td,fontFamily:FONT_BODY}}>No rations. Synthesize some first.</span>}
                </div>
              </div>
              <div style={{fontSize:9,fontWeight:700,color:C.td,marginBottom:10,letterSpacing:2}}>OCEAN ZONES</div>
              {ZONES.map(zone=>{const locked=combatLv<zone.lv;const isAct=zoneId===zone.id;return(
                <div key={zone.id} style={{
                  display:"flex",alignItems:"center",justifyContent:"space-between",
                  padding:"12px 16px",borderRadius:8,
                  background:isAct?"linear-gradient(90deg,"+C.bad+"15,"+C.card+")":C.card,
                  border:"1px solid "+(isAct?C.bad+"50":C.border),
                  marginBottom:8,opacity:locked?0.35:1,
                }}>
                  <div>
                    <div style={{fontSize:13,fontWeight:700,color:isAct?C.bad:C.white,fontFamily:FONT,letterSpacing:1}}>{zone.icon} {zone.name.toUpperCase()}</div>
                    <div style={{fontSize:10,color:C.ts,marginTop:2,fontFamily:FONT_BODY}}>
                      Depth Rank {zone.lv}+ · {zone.mobs.map(m=>m.n).join(", ")}
                      {zone.boss?" · Boss: "+zone.boss.n:""}
                    </div>
                  </div>
                  {!locked&&(
                    <div onClick={()=>{if(isAct)stopZone();else startZone(zone.id)}} style={{
                      padding:"7px 18px",borderRadius:6,
                      background:isAct?"linear-gradient(90deg,"+C.badD+","+C.bad+")":"linear-gradient(90deg,"+C.accD+","+C.acc+")",
                      color:C.bg,fontSize:10,fontWeight:700,cursor:"pointer",letterSpacing:1,fontFamily:FONT,
                      boxShadow:isAct?GLOW_BAD:GLOW_STYLE,
                    }}>{isAct?"RETREAT":"DIVE IN"}</div>
                  )}
                  {locked&&<span style={{fontSize:10,color:C.bad,fontFamily:FONT}}>LV {zone.lv}</span>}
                </div>
              );})}
              {clog.length>0&&(
                <div style={{marginTop:16,padding:"12px 16px",borderRadius:8,background:C.card,border:"1px solid "+C.border,maxHeight:160,overflow:"auto"}}>
                  <div style={{fontSize:9,fontWeight:700,color:C.ts,marginBottom:6,letterSpacing:2}}>COMBAT LOG</div>
                  {clog.slice(-10).reverse().map((l,i)=>(
                    <div key={i} style={{fontSize:10,color:C.ts,padding:"2px 0",borderBottom:"1px solid "+C.bg,opacity:1-i*0.08,fontFamily:FONT_BODY}}>{l}</div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* EQUIPMENT PAGE */}
          {page==="equipment"&&(
            <div style={{maxWidth:700}}>
              <div style={{fontSize:14,fontWeight:700,color:C.white,marginBottom:16,letterSpacing:2}}>EQUIPMENT LOADOUT</div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                {ESLOTS.map(slot=>{const iid=eq[slot.id];const it=iid?ITEMS[iid]:null;const el=iid?(enh[iid]||0):0;return(
                  <div key={slot.id} style={{
                    padding:"12px 14px",borderRadius:8,
                    background:C.card,border:"1px solid "+(it?C.acc+"40":C.border),
                    boxShadow:it?GLOW_STYLE:"none",
                  }}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
                      <span style={{fontSize:10,color:C.ts,fontFamily:FONT_BODY}}>{slot.i} {slot.n}</span>
                      {it&&<span onClick={()=>unequipIt(slot.id)} style={{fontSize:9,color:C.bad,cursor:"pointer",fontFamily:FONT,letterSpacing:1}}>REMOVE</span>}
                    </div>
                    {it?(
                      <div>
                        <div style={{fontSize:12,fontWeight:700,color:C.white,fontFamily:FONT}}>{it.i} {it.n}{el>0?" +"+el:""}</div>
                        {it.st&&<div style={{fontSize:10,color:C.ts,marginTop:3,fontFamily:FONT_BODY}}>{Object.entries(it.st).map(e=>e[0].toUpperCase()+": +"+Math.floor(e[1]*(1+el*0.08))).join(" · ")}</div>}
                      </div>
                    ):(
                      <div style={{fontSize:11,color:C.td,fontFamily:FONT_BODY}}>— Empty Slot —</div>
                    )}
                  </div>
                );})}
              </div>
            </div>
          )}

          {/* ENHANCING PAGE */}
          {page==="enhancing"&&(
            <div style={{maxWidth:700}}>
              <div style={{fontSize:14,fontWeight:700,color:C.white,marginBottom:4,letterSpacing:2}}>EQUIPMENT UPGRADE LAB</div>
              <div style={{fontSize:11,color:C.ts,marginBottom:4,fontFamily:FONT_BODY}}>Level {sl("enhancing").lv} — {fmt(sl("enhancing").xp)} / {fmt(sl("enhancing").need)} XP</div>
              <div style={{height:6,borderRadius:3,background:C.card,overflow:"hidden",marginBottom:16}}>
                <div style={{width:(sl("enhancing").xp/sl("enhancing").need)*100+"%",height:"100%",borderRadius:3,background:C.warn,boxShadow:"0 0 6px "+C.warn}}/>
              </div>
              <div style={{fontSize:10,color:C.ts,marginBottom:16,fontFamily:FONT_BODY}}>Upgrade equipment stats. Failed attempts reset to +0!</div>
              {ESLOTS.map(slot=>{const iid=eq[slot.id];if(!iid)return null;const it=ITEMS[iid];const cl=enh[iid]||0;const cost=Math.floor(50*Math.pow(1.5,cl));const rate=Math.max(20,Math.floor((0.8-cl*0.05)*100));return(
                <div key={slot.id} style={{
                  display:"flex",alignItems:"center",justifyContent:"space-between",
                  padding:"12px 16px",borderRadius:8,background:C.card,border:"1px solid "+C.border,marginBottom:8,
                }}>
                  <div>
                    <div style={{fontSize:12,fontWeight:700,color:C.white,fontFamily:FONT}}>{it.i} {it.n} +{cl}</div>
                    <div style={{fontSize:10,color:C.ts,marginTop:2,fontFamily:FONT_BODY}}>Success: {rate}% · Cost: ◈{fmt(cost)} Credits</div>
                  </div>
                  <div onClick={()=>doEnh(slot.id)} style={{
                    padding:"7px 18px",borderRadius:6,
                    background:gold>=cost&&cl<20?"linear-gradient(90deg,"+C.warn+"cc,"+C.gold+")":C.card,
                    color:gold>=cost&&cl<20?C.bg:C.td,
                    fontSize:10,fontWeight:700,cursor:gold>=cost&&cl<20?"pointer":"default",
                    opacity:gold>=cost&&cl<20?1:0.4,letterSpacing:1,fontFamily:FONT,
                    boxShadow:gold>=cost&&cl<20?"0 0 8px "+C.gold+"55":"none",
                  }}>UPGRADE</div>
                </div>
              );}).filter(Boolean)}
              {!Object.values(eq).some(Boolean)&&<div style={{fontSize:12,color:C.td,padding:20,textAlign:"center",fontFamily:FONT_BODY}}>Equip items first to upgrade them</div>}
            </div>
          )}

          {/* INVENTORY PAGE */}
          {page==="inventory"&&(
            <div style={{maxWidth:700}}>
              <div style={{fontSize:14,fontWeight:700,color:C.white,marginBottom:16,letterSpacing:2}}>CARGO HOLD</div>
              {Object.entries(inv).length===0&&<div style={{fontSize:12,color:C.td,fontFamily:FONT_BODY}}>Cargo hold is empty. Begin gathering operations!</div>}
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8}}>
                {Object.entries(inv).map(e=>{const id=e[0],qty=e[1];const it=ITEMS[id];if(!it)return null;return(
                  <div key={id} style={{
                    padding:"10px 12px",borderRadius:6,
                    background:C.card,border:"1px solid "+(it.eq?C.acc+"30":C.border),
                    boxShadow:it.eq?GLOW_STYLE:"none",
                  }}>
                    <div style={{fontSize:12,fontWeight:700,color:C.white,fontFamily:FONT}}>{it.i} {it.n}</div>
                    <div style={{fontSize:10,color:C.ts,fontFamily:FONT_BODY}}>×{qty}</div>
                    {it.st&&<div style={{fontSize:9,color:C.td,marginTop:2,fontFamily:FONT_BODY}}>{Object.entries(it.st).map(s=>s[0]+"+"+s[1]).join(" ")}</div>}
                    {it.food&&<div style={{fontSize:9,color:C.ok,fontFamily:FONT_BODY}}>Restores {it.heal} HP</div>}
                    {it.eq&&<div onClick={()=>equipIt(id)} style={{
                      marginTop:6,padding:"4px 8px",borderRadius:4,
                      background:"linear-gradient(90deg,"+C.accD+","+C.acc+")",
                      color:C.bg,fontSize:9,fontWeight:700,cursor:"pointer",
                      textAlign:"center",letterSpacing:1,fontFamily:FONT,
                    }}>EQUIP</div>}
                  </div>
                );})}
              </div>
            </div>
          )}

        </div>
      </div>

      {/* RIGHT PANEL */}
      <div style={{width:220,flexShrink:0,display:"flex",flexDirection:"column",background:C.panel,borderLeft:"1px solid "+C.border,overflow:"auto",padding:10,gap:10}}>

        {/* Equipped */}
        <div style={{padding:10,borderRadius:8,background:C.card,border:"1px solid "+C.border}}>
          <div style={{fontSize:8,fontWeight:700,color:C.acc,marginBottom:8,letterSpacing:2}}>LOADOUT</div>
          {ESLOTS.map(slot=>{const iid=eq[slot.id];const it=iid?ITEMS[iid]:null;const el=iid?(enh[iid]||0):0;return(
            <div key={slot.id} style={{display:"flex",justifyContent:"space-between",padding:"3px 0",fontSize:10}}>
              <span style={{color:C.td,fontFamily:FONT_BODY}}>{slot.i} {slot.n}</span>
              <span style={{color:it?C.text:C.td,fontWeight:it?600:400,fontFamily:FONT_BODY}}>{it?it.n+(el>0?" +"+el:""):"—"}</span>
            </div>
          );})}
        </div>

        {/* Stats */}
        <div style={{padding:10,borderRadius:8,background:C.card,border:"1px solid "+C.border}}>
          <div style={{fontSize:8,fontWeight:700,color:C.acc,marginBottom:8,letterSpacing:2}}>SYSTEMS</div>
          {[
            {l:"Hull HP",v:pStats.hp,c:C.ok},
            {l:"Attack",v:pStats.atk,c:C.bad},
            {l:"Defense",v:pStats.def,c:C.acc},
            {l:"Sonic",v:pStats.rng,c:C.okD},
            {l:"Leviathan",v:pStats.mag,c:C.purp},
          ].map(s=>(
            <div key={s.l} style={{display:"flex",justifyContent:"space-between",padding:"2px 0",fontSize:10}}>
              <span style={{color:C.ts,fontFamily:FONT_BODY}}>{s.l}</span>
              <span style={{color:s.c,fontWeight:700,fontFamily:FONT}}>{s.v}</span>
            </div>
          ))}
        </div>

        {/* Resources */}
        <div style={{padding:10,borderRadius:8,background:C.card,border:"1px solid "+C.border}}>
          <div style={{fontSize:8,fontWeight:700,color:C.acc,marginBottom:8,letterSpacing:2}}>RESOURCES</div>
          {Object.entries(inv).filter(e=>ITEMS[e[0]]&&ITEMS[e[0]].s).map(e=>{const id=e[0],qty=e[1];return(
            <div key={id} style={{display:"flex",justifyContent:"space-between",padding:"2px 0",fontSize:10}}>
              <span style={{color:C.ts,fontFamily:FONT_BODY}}>{ITEMS[id].i} {ITEMS[id].n}</span>
              <span style={{color:C.text,fontWeight:700,fontFamily:FONT}}>{fmt(qty)}</span>
            </div>
          )})}
          {!Object.entries(inv).some(e=>ITEMS[e[0]]&&ITEMS[e[0]].s)&&<div style={{fontSize:10,color:C.td,fontFamily:FONT_BODY}}>—</div>}
        </div>

      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&family=Inter:wght@400;500;600&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: ${C.bg}; overflow: hidden; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: ${C.border}; border-radius: 3px; }
        ::selection { background: ${C.acc}40; }
      `}</style>
    </div>
  );
}

export default function App(){
  const[user,setUser]=useState(null);
  const[loading,setLoading]=useState(true);
  useEffect(()=>{const unsub=onAuthStateChanged(auth,(u)=>{setUser(u);setLoading(false)});return unsub},[]);
  if(loading)return(
    <div style={{width:"100%",height:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:C.bg,color:C.acc,fontFamily:FONT,letterSpacing:4,fontSize:13}}>
      INITIALIZING...
    </div>
  );
  if(!user)return <AuthScreen onLogin={setUser}/>;
  return <GameUI account={user} onLogout={()=>signOut(auth)}/>;
}
