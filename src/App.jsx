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

const FONT = "'Segoe UI', system-ui, sans-serif";
const C = {bg:"#1b1d23",panel:"#22252d",card:"#2a2d36",border:"#383c47",text:"#d4d4d8",ts:"#9ca3af",td:"#6b7280",acc:"#60a5fa",accD:"#3b82f6",ok:"#4ade80",okD:"#22c55e",bad:"#f87171",badD:"#ef4444",warn:"#fbbf24",gold:"#eab308",purp:"#a78bfa",white:"#f4f4f5"};
function xpFor(lv){return Math.floor(50*Math.pow(1.1,lv-1))}
function fmt(n){if(n>=1e9)return(n/1e9).toFixed(1)+"B";if(n>=1e6)return(n/1e6).toFixed(1)+"M";if(n>=1e3)return(n/1e3).toFixed(1)+"K";return String(Math.floor(n))}

const ITEMS={
  milk:{n:"Milk",i:"🥛",s:1},wheat:{n:"Wheat",i:"🌾",s:1},sugar:{n:"Sugar",i:"🍬",s:1},berry:{n:"Berry",i:"🫐",s:1},herb:{n:"Herb",i:"🌿",s:1},
  pine_log:{n:"Pine Log",i:"🪵",s:1},oak_log:{n:"Oak Log",i:"🪵",s:1},maple_log:{n:"Maple Log",i:"🪵",s:1},yew_log:{n:"Yew Log",i:"🪵",s:1},essence:{n:"Essence",i:"💎",s:1},
  brush:{n:"Brush",i:"🖌️",s:1},shears:{n:"Shears",i:"✂️",s:1},hatchet:{n:"Hatchet",i:"🪓",s:1},
  cheese_sword:{n:"Cheese Sword",i:"🗡️",eq:"weapon",st:{atk:8}},cheese_helm:{n:"Cheese Helm",i:"🪖",eq:"head",st:{def:5,hp:10}},cheese_plate:{n:"Cheese Plate",i:"🛡️",eq:"body",st:{def:12,hp:20}},
  wood_ring:{n:"Wooden Ring",i:"💍",eq:"ring",st:{atk:2}},wood_neck:{n:"Wooden Necklace",i:"📿",eq:"neck",st:{def:3,hp:5}},
  oak_bow:{n:"Oak Bow",i:"🏹",eq:"weapon",st:{atk:10,rng:5}},maple_shield:{n:"Maple Shield",i:"🛡️",eq:"shield",st:{def:15,hp:15}},
  cloth_gloves:{n:"Cloth Gloves",i:"🧤",eq:"hands",st:{atk:2,def:1}},cloth_boots:{n:"Cloth Boots",i:"👢",eq:"feet",st:{def:4}},silk_robe:{n:"Silk Robe",i:"👘",eq:"body",st:{def:6,mag:8,hp:10}},
  bread:{n:"Bread",i:"🍞",s:1,food:1,heal:15},berry_cake:{n:"Berry Cake",i:"🎂",s:1,food:1,heal:40},herb_pie:{n:"Herb Pie",i:"🥧",s:1,food:1,heal:80},health_pot:{n:"Health Potion",i:"❤️‍🩹",s:1,food:1,heal:60},
  gourmet_tea:{n:"Gourmet Tea",i:"🍵",s:1,drink:1},coffee:{n:"Coffee",i:"☕",s:1,drink:1},wisdom_tea:{n:"Wisdom Tea",i:"🍵",s:1,drink:1},
};

const SKILLS=[
  {id:"milking",name:"Milking",icon:"🥛",color:"#f0f0f0",cat:"gather",acts:[
    {id:"m1",name:"Cow",lv:1,xp:10,t:3,out:[{id:"milk",q:1}]},{id:"m2",name:"Yak",lv:10,xp:25,t:4,out:[{id:"milk",q:2}]},{id:"m3",name:"Buffalo",lv:25,xp:55,t:5,out:[{id:"milk",q:3}]},{id:"m4",name:"Dragon",lv:50,xp:120,t:6,out:[{id:"milk",q:5}]}]},
  {id:"foraging",name:"Foraging",icon:"🍄",color:"#86efac",cat:"gather",acts:[
    {id:"f1",name:"Wheat Field",lv:1,xp:10,t:3,out:[{id:"wheat",q:1}]},{id:"f2",name:"Sugar Cane",lv:10,xp:25,t:4,out:[{id:"sugar",q:1}]},{id:"f3",name:"Berry Bush",lv:25,xp:55,t:5,out:[{id:"berry",q:1}]},{id:"f4",name:"Herb Garden",lv:50,xp:120,t:6,out:[{id:"herb",q:2}]}]},
  {id:"woodcutting",name:"Woodcutting",icon:"🪓",color:"#a3e635",cat:"gather",acts:[
    {id:"w1",name:"Pine Tree",lv:1,xp:10,t:3,out:[{id:"pine_log",q:1}]},{id:"w2",name:"Oak Tree",lv:10,xp:25,t:4,out:[{id:"oak_log",q:1}]},{id:"w3",name:"Maple Tree",lv:25,xp:55,t:5,out:[{id:"maple_log",q:1}]},{id:"w4",name:"Yew Tree",lv:50,xp:120,t:6,out:[{id:"yew_log",q:1}]}]},
  {id:"cheesesmithing",name:"Cheesesmithing",icon:"🧀",color:"#fde047",cat:"prod",acts:[
    {id:"cs1",name:"Brush",lv:1,xp:15,t:4,inp:[{id:"milk",q:5}],out:[{id:"brush",q:1}]},{id:"cs2",name:"Shears",lv:1,xp:15,t:4,inp:[{id:"milk",q:5}],out:[{id:"shears",q:1}]},{id:"cs3",name:"Hatchet",lv:1,xp:15,t:4,inp:[{id:"milk",q:5}],out:[{id:"hatchet",q:1}]},
    {id:"cs4",name:"Cheese Sword",lv:10,xp:40,t:5,inp:[{id:"milk",q:15}],out:[{id:"cheese_sword",q:1}]},{id:"cs5",name:"Cheese Helm",lv:15,xp:50,t:5,inp:[{id:"milk",q:20}],out:[{id:"cheese_helm",q:1}]},{id:"cs6",name:"Cheese Plate",lv:20,xp:65,t:6,inp:[{id:"milk",q:30}],out:[{id:"cheese_plate",q:1}]}]},
  {id:"crafting",name:"Crafting",icon:"🔧",color:"#fb923c",cat:"prod",acts:[
    {id:"cr1",name:"Wooden Ring",lv:1,xp:15,t:4,inp:[{id:"pine_log",q:5}],out:[{id:"wood_ring",q:1}]},{id:"cr2",name:"Wooden Necklace",lv:10,xp:35,t:5,inp:[{id:"oak_log",q:8}],out:[{id:"wood_neck",q:1}]},
    {id:"cr3",name:"Oak Bow",lv:15,xp:45,t:5,inp:[{id:"oak_log",q:12}],out:[{id:"oak_bow",q:1}]},{id:"cr4",name:"Maple Shield",lv:25,xp:70,t:6,inp:[{id:"maple_log",q:15}],out:[{id:"maple_shield",q:1}]}]},
  {id:"tailoring",name:"Tailoring",icon:"🧵",color:"#c084fc",cat:"prod",acts:[
    {id:"tl1",name:"Cloth Gloves",lv:1,xp:15,t:4,inp:[{id:"wheat",q:5}],out:[{id:"cloth_gloves",q:1}]},{id:"tl2",name:"Cloth Boots",lv:10,xp:35,t:5,inp:[{id:"wheat",q:10}],out:[{id:"cloth_boots",q:1}]},
    {id:"tl3",name:"Silk Robe",lv:20,xp:55,t:5,inp:[{id:"wheat",q:15},{id:"berry",q:3}],out:[{id:"silk_robe",q:1}]}]},
  {id:"cooking",name:"Cooking",icon:"🍳",color:"#f97316",cat:"prod",acts:[
    {id:"ck1",name:"Bread",lv:1,xp:15,t:3,inp:[{id:"wheat",q:2}],out:[{id:"bread",q:1}]},{id:"ck2",name:"Berry Cake",lv:15,xp:40,t:5,inp:[{id:"wheat",q:3},{id:"berry",q:2},{id:"sugar",q:1}],out:[{id:"berry_cake",q:1}]},
    {id:"ck3",name:"Herb Pie",lv:30,xp:75,t:6,inp:[{id:"wheat",q:4},{id:"herb",q:3}],out:[{id:"herb_pie",q:1}]}]},
  {id:"brewing",name:"Brewing",icon:"🍺",color:"#a78bfa",cat:"prod",acts:[
    {id:"br1",name:"Gourmet Tea",lv:1,xp:15,t:4,inp:[{id:"herb",q:2}],out:[{id:"gourmet_tea",q:1}]},{id:"br2",name:"Coffee",lv:15,xp:40,t:5,inp:[{id:"berry",q:3},{id:"sugar",q:2}],out:[{id:"coffee",q:1}]},
    {id:"br3",name:"Wisdom Tea",lv:25,xp:60,t:6,inp:[{id:"herb",q:5}],out:[{id:"wisdom_tea",q:1}]}]},
  {id:"alchemy",name:"Alchemy",icon:"⚗️",color:"#e879f9",cat:"prod",acts:[
    {id:"al1",name:"Transmute Essence",lv:1,xp:20,t:5,inp:[{id:"milk",q:10}],out:[{id:"essence",q:1}]},{id:"al2",name:"Health Potion",lv:15,xp:45,t:6,inp:[{id:"essence",q:2},{id:"herb",q:3}],out:[{id:"health_pot",q:1}]}]},
];

const CSUBS=[
  {id:"stamina",name:"Stamina",icon:"❤️",color:"#ef4444"},{id:"intelligence",name:"Intelligence",icon:"🧠",color:"#818cf8"},
  {id:"attack",name:"Attack",icon:"⚔️",color:"#f87171"},{id:"power",name:"Power",icon:"💪",color:"#fb923c"},
  {id:"defense",name:"Defense",icon:"🛡️",color:"#60a5fa"},{id:"ranged",name:"Ranged",icon:"🏹",color:"#4ade80"},{id:"magic",name:"Magic",icon:"🔮",color:"#c084fc"},
];

const ZONES=[
  {id:"z1",name:"Smelly Planet",icon:"🪰",lv:1,mobs:[{n:"Fly",hp:20,atk:2,def:1,xp:8,g:3},{n:"Horsefly",hp:35,atk:4,def:2,xp:15,g:6}],boss:{n:"Giant Fly",hp:100,atk:8,def:5,xp:60,g:30}},
  {id:"z2",name:"Swamp Planet",icon:"🐸",lv:10,mobs:[{n:"Toad",hp:60,atk:8,def:5,xp:25,g:10},{n:"Croc",hp:90,atk:12,def:8,xp:40,g:18}],boss:{n:"Swamp King",hp:300,atk:20,def:12,xp:150,g:80}},
  {id:"z3",name:"Desert Planet",icon:"🏜️",lv:25,mobs:[{n:"Scorpion",hp:120,atk:18,def:12,xp:55,g:25},{n:"Sand Worm",hp:200,atk:25,def:15,xp:80,g:40}],boss:{n:"Pharaoh",hp:600,atk:35,def:25,xp:300,g:150}},
  {id:"z4",name:"Ice Planet",icon:"❄️",lv:40,mobs:[{n:"Frost Wolf",hp:250,atk:30,def:20,xp:100,g:50},{n:"Ice Golem",hp:400,atk:40,def:30,xp:150,g:80}],boss:{n:"Frost Dragon",hp:1200,atk:60,def:40,xp:500,g:300}},
  {id:"z5",name:"Infernal Planet",icon:"🔥",lv:60,mobs:[{n:"Imp",hp:400,atk:50,def:35,xp:200,g:100},{n:"Demon",hp:700,atk:70,def:50,xp:350,g:180}],boss:{n:"Overlord",hp:2500,atk:100,def:70,xp:1000,g:600}},
];

const ESLOTS=[{id:"head",n:"Head",i:"🪖"},{id:"body",n:"Body",i:"👕"},{id:"hands",n:"Hands",i:"🧤"},{id:"feet",n:"Feet",i:"👢"},{id:"weapon",n:"Weapon",i:"⚔️"},{id:"shield",n:"Shield",i:"🛡️"},{id:"neck",n:"Neck",i:"📿"},{id:"ring",n:"Ring",i:"💍"}];

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
  const inp={padding:"10px 14px",borderRadius:6,background:C.bg,border:"1px solid "+C.border,color:C.white,fontSize:13,outline:"none",width:"100%",boxSizing:"border-box"};
  return(<div style={{width:"100%",height:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:C.bg,fontFamily:FONT}}>
    <div style={{width:"100%",maxWidth:380,padding:24}}>
      <div style={{textAlign:"center",marginBottom:24}}>
        <div style={{fontSize:48,marginBottom:8}}>🥛</div>
        <div style={{fontSize:24,fontWeight:700,color:C.white,marginBottom:4}}>Milky Way Idle</div>
        <div style={{fontSize:13,color:C.ts}}>A multiplayer idle RPG</div>
      </div>
      <div style={{padding:20,borderRadius:12,background:C.panel,border:"1px solid "+C.border}}>
        <div style={{display:"flex",gap:8,marginBottom:16}}>
          {["login","signup"].map(t=>(
            <div key={t} onClick={()=>{setTab(t);clearForm()}} style={{flex:1,padding:"8px 0",textAlign:"center",borderRadius:6,background:tab===t?C.acc+"20":"transparent",color:tab===t?C.acc:C.td,fontWeight:700,fontSize:13,cursor:"pointer",border:"1px solid "+(tab===t?C.acc+"30":"transparent")}}>{t==="login"?"Sign In":"Create Account"}</div>
          ))}
        </div>
        {error&&<div style={{padding:"8px 12px",borderRadius:6,background:C.bad+"15",color:C.bad,fontSize:12,fontWeight:600,marginBottom:12,border:"1px solid "+C.bad+"25"}}>{error}</div>}
        <div style={{display:"flex",flexDirection:"column",gap:10}}>
          {tab==="signup"&&<input value={displayName} onChange={e=>setDisplayName(e.target.value)} placeholder="Display Name" style={inp}/>}
          <input value={email} onChange={e=>setEmail(e.target.value)} placeholder="Email" type="email" style={inp}/>
          <input value={password} onChange={e=>setPassword(e.target.value)} placeholder="Password" type="password" style={inp} onKeyDown={e=>e.key==="Enter"&&(tab==="login"?handleLogin():null)}/>
          {tab==="signup"&&<input value={confirmPw} onChange={e=>setConfirmPw(e.target.value)} placeholder="Confirm Password" type="password" style={inp}/>}
          <div onClick={loading?undefined:(tab==="login"?handleLogin:handleSignup)} style={{padding:"12px 0",borderRadius:6,background:loading?C.card:C.acc+"20",color:loading?C.td:C.acc,border:"1px solid "+(loading?C.border:C.acc+"35"),fontWeight:700,fontSize:14,textAlign:"center",cursor:loading?"default":"pointer"}}>{loading?"Loading...":tab==="login"?"Sign In":"Create Account"}</div>
        </div>
      </div>
    </div>
  </div>);
}

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
  const[actSkill,setActSkill]=useState("milking");
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
    s.hp+=sl("stamina").lv*2;s.atk+=sl("attack").lv+sl("power").lv;s.def+=sl("defense").lv;s.rng+=sl("ranged").lv;s.mag+=sl("magic").lv;
    ESLOTS.forEach(slot=>{const iid=eq[slot.id];if(iid){const it=ITEMS[iid];if(it&&it.st)Object.entries(it.st).forEach(([k,v])=>{const e=enh[iid]||0;s[k]=(s[k]||0)+Math.floor(v*(1+e*0.08))})}});
    return s;
  },[eq,sl,enh]);

  useEffect(()=>{(async()=>{try{const snap=await getDoc(doc(db,"mwi_saves",account.uid));if(snap.exists()){const d=snap.data();if(d.skills)setSkills(d.skills);if(d.inv)setInv(d.inv);if(d.eq)setEq(d.eq);if(d.gold)setGold(d.gold);if(d.enh)setEnh(d.enh)}}catch(e){console.error(e)}})()},[account.uid]);
  useEffect(()=>{const t=setInterval(()=>{setDoc(doc(db,"mwi_saves",account.uid),{skills,inv,eq,gold,enh,ts:Date.now()},{merge:true}).catch(()=>{})},30000);return()=>clearInterval(t)},[skills,inv,eq,gold,enh,account.uid]);

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
          if(php<=0){setClog(p=>[...p.slice(-20),"☠️ Died to "+mob.n+"!"]);return{...prev,php:mxhp,mhp:mob.hp,mob}}
        }
        if(mhp<=0){
          const nk=kills+1;const xpp=Math.floor(mob.xp/5);
          CSUBS.forEach(s=>gainXp(s.id,xpp));setGold(g=>g+mob.g);
          setClog(p=>[...p.slice(-20),"⚔️ Killed "+mob.n+"! +"+mob.xp+"xp +"+mob.g+"g"]);
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
  const startZone=useCallback((zid)=>{const z=ZONES.find(x=>x.id===zid);if(!z)return;setCurAct(null);setZoneId(zid);const m=z.mobs[0];setCbt({mob:m,mhp:m.hp,php:pStats.hp,mxhp:pStats.hp,kills:0,boss:false});setClog(["Entered "+z.name+"..."])},[pStats]);
  const stopZone=useCallback(()=>{setZoneId(null);setCbt(null)},[]);
  const equipIt=useCallback((iid)=>{const it=ITEMS[iid];if(!it||!it.eq||(inv[iid]||0)<=0)return;const cur=eq[it.eq];if(cur)addIt(cur,1);remIt(iid,1);setEq(p=>({...p,[it.eq]:iid}))},[inv,eq,addIt,remIt]);
  const unequipIt=useCallback((sid)=>{const iid=eq[sid];if(!iid)return;addIt(iid,1);setEq(p=>{const n={...p};delete n[sid];return n})},[eq,addIt]);
  const doEnh=useCallback((sid)=>{const iid=eq[sid];if(!iid)return;const cl=enh[iid]||0;if(cl>=20)return;const cost=Math.floor(50*Math.pow(1.5,cl));if(gold<cost)return;setGold(g=>g-cost);gainXp("enhancing",20+cl*5);const sr=Math.max(0.2,0.8-cl*0.05);if(Math.random()<sr){setEnh(p=>({...p,[iid]:cl+1}));setClog(p=>[...p.slice(-20),"✨ "+ITEMS[iid].n+" enhanced to +"+(cl+1)+"!"])}else{setEnh(p=>({...p,[iid]:0}));setClog(p=>[...p.slice(-20),"💥 Enhancement failed! "+ITEMS[iid].n+" reset to +0"])}},[eq,enh,gold,gainXp]);

  const skData=SKILLS.find(s=>s.id===actSkill);

  const SkillNav=({sk,running})=>{const s=sl(sk.id);const pct=s.need>0?(s.xp/s.need)*100:0;const act=actSkill===sk.id&&page==="skills";
    return(<div onClick={()=>{setActSkill(sk.id);setPage("skills")}} style={{display:"flex",alignItems:"center",gap:8,padding:"5px 12px",cursor:"pointer",background:act?C.acc+"10":"transparent",borderLeft:act?"3px solid "+C.acc:"3px solid transparent"}}>
      <span style={{fontSize:15,width:20,textAlign:"center"}}>{sk.icon}</span>
      <div style={{flex:1,minWidth:0}}>
        <div style={{display:"flex",justifyContent:"space-between"}}><span style={{fontSize:11,color:act?C.acc:C.text,fontWeight:act?700:500}}>{sk.name}</span><span style={{fontSize:10,color:C.ts,fontWeight:700}}>{s.lv}</span></div>
        <div style={{height:3,borderRadius:2,background:C.bg,overflow:"hidden",marginTop:2}}><div style={{width:pct+"%",height:"100%",background:running?C.ok:sk.color,borderRadius:2,transition:"width 0.3s"}}/></div>
      </div>
    </div>);
  };

  return(
    <div style={{width:"100%",height:"100vh",display:"flex",fontFamily:FONT,background:C.bg,color:C.text,overflow:"hidden"}}>
      {/* LEFT NAV */}
      <div style={{width:200,flexShrink:0,display:"flex",flexDirection:"column",background:C.panel,borderRight:"1px solid "+C.border,overflowY:"auto"}}>
        <div style={{padding:"14px 12px",borderBottom:"1px solid "+C.border}}>
          <div style={{fontSize:13,fontWeight:700,color:C.white}}>{account.displayName}</div>
          <div style={{fontSize:10,color:C.ts}}>Combat Lv {combatLv}</div>
          <div style={{fontSize:11,color:C.gold,fontWeight:700,marginTop:4}}>🪙 {fmt(gold)}</div>
        </div>
        <div style={{padding:"4px 0",borderBottom:"1px solid "+C.border}}>
          <div style={{padding:"3px 12px",fontSize:9,fontWeight:700,color:C.td,textTransform:"uppercase",letterSpacing:1}}>Gathering</div>
          {SKILLS.filter(s=>s.cat==="gather").map(sk=><SkillNav key={sk.id} sk={sk} running={curAct&&curAct.sk===sk.id}/>)}
        </div>
        <div style={{padding:"4px 0",borderBottom:"1px solid "+C.border}}>
          <div style={{padding:"3px 12px",fontSize:9,fontWeight:700,color:C.td,textTransform:"uppercase",letterSpacing:1}}>Production</div>
          {SKILLS.filter(s=>s.cat==="prod").map(sk=><SkillNav key={sk.id} sk={sk} running={curAct&&curAct.sk===sk.id}/>)}
        </div>
        <div style={{padding:"4px 0",borderBottom:"1px solid "+C.border}}>
          <div style={{padding:"3px 12px",fontSize:9,fontWeight:700,color:C.td,textTransform:"uppercase",letterSpacing:1}}>Enhancing</div>
          <div onClick={()=>setPage("enhancing")} style={{display:"flex",alignItems:"center",gap:8,padding:"5px 12px",cursor:"pointer",background:page==="enhancing"?C.acc+"10":"transparent",borderLeft:page==="enhancing"?"3px solid "+C.acc:"3px solid transparent"}}>
            <span style={{fontSize:15,width:20,textAlign:"center"}}>✨</span>
            <div style={{flex:1}}><div style={{display:"flex",justifyContent:"space-between"}}><span style={{fontSize:11,color:page==="enhancing"?C.acc:C.text}}>Enhancing</span><span style={{fontSize:10,color:C.ts,fontWeight:700}}>{sl("enhancing").lv}</span></div>
            <div style={{height:3,borderRadius:2,background:C.bg,overflow:"hidden",marginTop:2}}><div style={{width:(sl("enhancing").xp/sl("enhancing").need)*100+"%",height:"100%",background:C.warn,borderRadius:2}}/></div></div>
          </div>
        </div>
        <div style={{padding:"4px 0",borderBottom:"1px solid "+C.border}}>
          <div style={{padding:"3px 12px",fontSize:9,fontWeight:700,color:C.td,textTransform:"uppercase",letterSpacing:1}}>Combat</div>
          <div onClick={()=>setPage("combat")} style={{display:"flex",alignItems:"center",gap:8,padding:"5px 12px",cursor:"pointer",background:page==="combat"?C.acc+"10":"transparent",borderLeft:page==="combat"?"3px solid "+C.acc:"3px solid transparent"}}>
            <span style={{fontSize:15,width:20,textAlign:"center"}}>⚔️</span><span style={{fontSize:11,color:page==="combat"?C.acc:C.text}}>Combat</span>
          </div>
          {CSUBS.map(cs=>{const s=sl(cs.id);return(
            <div key={cs.id} style={{display:"flex",alignItems:"center",gap:6,padding:"2px 12px 2px 24px"}}>
              <span style={{fontSize:10}}>{cs.icon}</span>
              <div style={{flex:1}}><div style={{display:"flex",justifyContent:"space-between"}}><span style={{fontSize:9,color:C.td}}>{cs.name}</span><span style={{fontSize:9,color:C.ts,fontWeight:700}}>{s.lv}</span></div>
              <div style={{height:2,borderRadius:1,background:C.bg,overflow:"hidden"}}><div style={{width:(s.xp/s.need)*100+"%",height:"100%",background:cs.color,borderRadius:1}}/></div></div>
            </div>)})}
        </div>
        <div style={{padding:"4px 0"}}>
          {[{id:"equipment",i:"🗡️",l:"Equipment"},{id:"inventory",i:"🎒",l:"Inventory"}].map(n=>(
            <div key={n.id} onClick={()=>setPage(n.id)} style={{display:"flex",alignItems:"center",gap:8,padding:"5px 12px",cursor:"pointer",background:page===n.id?C.acc+"10":"transparent",borderLeft:page===n.id?"3px solid "+C.acc:"3px solid transparent"}}>
              <span style={{fontSize:15,width:20,textAlign:"center"}}>{n.i}</span><span style={{fontSize:11,color:page===n.id?C.acc:C.text}}>{n.l}</span>
            </div>))}
        </div>
        <div style={{flex:1}}/>
        <div onClick={onLogout} style={{padding:"10px 12px",borderTop:"1px solid "+C.border,fontSize:11,color:C.td,cursor:"pointer"}}>⚙️ Logout</div>
      </div>

      {/* CENTER */}
      <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}}>
        {curAct&&(()=>{const sk=SKILLS.find(s=>s.id===curAct.sk);const act=sk?sk.acts.find(a=>a.id===curAct.act):null;return(
          <div style={{flexShrink:0,padding:"8px 16px",background:C.panel,borderBottom:"1px solid "+C.border}}>
            <div style={{display:"flex",justifyContent:"space-between",fontSize:11,color:C.ts,marginBottom:4}}>
              <span>{sk?sk.icon:""} {sk?sk.name:""} — {act?act.name:""}</span>
              <span onClick={()=>{setCurAct(null);setActProg(0)}} style={{color:C.bad,cursor:"pointer",fontWeight:700}}>Stop</span>
            </div>
            <div style={{height:8,borderRadius:4,background:C.bg,overflow:"hidden"}}><div style={{width:actProg*100+"%",height:"100%",borderRadius:4,background:"linear-gradient(90deg,"+C.acc+","+C.accD+")",transition:"width 0.1s linear"}}/></div>
          </div>);})()}
        {cbt&&(
          <div style={{flexShrink:0,padding:"8px 16px",background:C.panel,borderBottom:"1px solid "+C.border}}>
            <div style={{display:"flex",justifyContent:"space-between",fontSize:11,color:C.ts,marginBottom:4}}>
              <span>⚔️ {cbt.mob.n}{cbt.boss?" 👑":""} — Kill #{cbt.kills+1}</span>
              <span onClick={stopZone} style={{color:C.bad,cursor:"pointer",fontWeight:700}}>Retreat</span>
            </div>
            <div style={{display:"flex",gap:8}}>
              <div style={{flex:1}}><div style={{fontSize:9,color:C.td,marginBottom:2}}>You: {cbt.php}/{cbt.mxhp}</div><div style={{height:6,borderRadius:3,background:C.bg,overflow:"hidden"}}><div style={{width:(cbt.php/cbt.mxhp)*100+"%",height:"100%",background:C.ok,borderRadius:3,transition:"width 0.2s"}}/></div></div>
              <div style={{flex:1}}><div style={{fontSize:9,color:C.td,marginBottom:2}}>{cbt.mob.n}: {Math.max(0,cbt.mhp)}/{cbt.mob.hp}</div><div style={{height:6,borderRadius:3,background:C.bg,overflow:"hidden"}}><div style={{width:Math.max(0,(cbt.mhp/cbt.mob.hp)*100)+"%",height:"100%",background:C.bad,borderRadius:3,transition:"width 0.2s"}}/></div></div>
            </div>
          </div>)}
        <div style={{flex:1,overflow:"auto",padding:16}}>

          {/* SKILL PAGE */}
          {page==="skills"&&skData&&(()=>{const s=sl(skData.id);const pct=s.need>0?(s.xp/s.need)*100:0;return(
            <div style={{maxWidth:700}}>
              <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:16}}>
                <span style={{fontSize:32}}>{skData.icon}</span>
                <div><div style={{fontSize:18,fontWeight:700,color:C.white}}>{skData.name}</div><div style={{fontSize:12,color:C.ts}}>Level {s.lv} — {fmt(s.xp)} / {fmt(s.need)} XP</div></div>
              </div>
              <div style={{height:10,borderRadius:5,background:C.card,overflow:"hidden",marginBottom:20}}><div style={{width:pct+"%",height:"100%",borderRadius:5,background:skData.color,transition:"width 0.3s"}}/></div>
              <div style={{fontSize:13,fontWeight:700,color:C.ts,marginBottom:8}}>Actions</div>
              {skData.acts.map(act=>{const locked=s.lv<act.lv;const canDo=!locked&&(!act.inp||act.inp.every(i=>(inv[i.id]||0)>=i.q));const isAct=curAct&&curAct.act===act.id;return(
                <div key={act.id} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"10px 14px",borderRadius:8,background:isAct?C.ok+"10":C.card,border:"1px solid "+(isAct?C.ok+"40":C.border),marginBottom:6,opacity:locked?0.4:1}}>
                  <div>
                    <div style={{fontSize:13,fontWeight:600,color:isAct?C.ok:C.white}}>{act.name}</div>
                    <div style={{fontSize:10,color:C.ts,marginTop:2}}>
                      +{act.xp} XP • {act.t}s
                      {act.inp?" • Needs: "+act.inp.map(function(i){return (ITEMS[i.id]?ITEMS[i.id].i:"")+i.q}).join(" "):""}
                      {act.out?" → "+act.out.map(function(i){return (ITEMS[i.id]?ITEMS[i.id].i:"")+" "+(ITEMS[i.id]?ITEMS[i.id].n:"")}).join(", "):""}
                    </div>
                    {locked&&<div style={{fontSize:9,color:C.bad,marginTop:2}}>Requires level {act.lv}</div>}
                  </div>
                  {!locked&&<div onClick={function(){if(canDo)startAct(skData.id,act.id)}} style={{padding:"6px 16px",borderRadius:6,background:isAct?C.okD:canDo?C.acc:C.card,color:C.white,fontSize:11,fontWeight:700,cursor:canDo?"pointer":"default",opacity:canDo?1:0.4}}>{isAct?"Active":"Start"}</div>}
                </div>);})}
            </div>);})()}

          {/* COMBAT PAGE */}
          {page==="combat"&&(
            <div style={{maxWidth:700}}>
              <div style={{fontSize:18,fontWeight:700,color:C.white,marginBottom:4}}>⚔️ Combat</div>
              <div style={{fontSize:12,color:C.ts,marginBottom:16}}>HP: {pStats.hp} • ATK: {pStats.atk} • DEF: {pStats.def} • Combat Lv: {combatLv}</div>
              <div style={{marginBottom:16,padding:"10px 14px",borderRadius:8,background:C.card,border:"1px solid "+C.border}}>
                <div style={{fontSize:11,fontWeight:700,color:C.ts,marginBottom:6}}>Food Slot (auto-eat below 40% HP)</div>
                <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>
                  {Object.entries(inv).filter(function(e){return ITEMS[e[0]]&&ITEMS[e[0]].food}).map(function(e){var id=e[0],qty=e[1];return(
                    <div key={id} onClick={function(){setFood(id)}} style={{padding:"4px 10px",borderRadius:4,background:food===id?C.ok+"20":C.bg,border:"1px solid "+(food===id?C.ok+"40":C.border),cursor:"pointer",fontSize:11,color:C.text}}>{ITEMS[id].i} {ITEMS[id].n} x{qty}{food===id?" ✓":""}</div>
                  )})}
                  {!Object.entries(inv).some(function(e){return ITEMS[e[0]]&&ITEMS[e[0]].food})&&<span style={{fontSize:11,color:C.td}}>No food. Cook some first!</span>}
                </div>
              </div>
              <div style={{fontSize:13,fontWeight:700,color:C.ts,marginBottom:8}}>Zones</div>
              {ZONES.map(function(zone){var locked=combatLv<zone.lv;var isAct=zoneId===zone.id;return(
                <div key={zone.id} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"10px 14px",borderRadius:8,background:isAct?C.bad+"10":C.card,border:"1px solid "+(isAct?C.bad+"40":C.border),marginBottom:6,opacity:locked?0.4:1}}>
                  <div>
                    <div style={{fontSize:14,fontWeight:600,color:isAct?C.bad:C.white}}>{zone.icon} {zone.name}</div>
                    <div style={{fontSize:10,color:C.ts}}>Combat Lv {zone.lv}+ • {zone.mobs.map(function(m){return m.n}).join(", ")}{zone.boss?" • Boss: "+zone.boss.n:""}</div>
                  </div>
                  {!locked&&<div onClick={function(){if(isAct)stopZone();else startZone(zone.id)}} style={{padding:"6px 16px",borderRadius:6,background:isAct?C.badD:C.acc,color:C.white,fontSize:11,fontWeight:700,cursor:"pointer"}}>{isAct?"Retreat":"Fight"}</div>}
                  {locked&&<span style={{fontSize:10,color:C.bad}}>Lv {zone.lv}</span>}
                </div>);})}
              {clog.length>0&&(
                <div style={{marginTop:16,padding:"10px 14px",borderRadius:8,background:C.card,border:"1px solid "+C.border,maxHeight:160,overflow:"auto"}}>
                  <div style={{fontSize:11,fontWeight:700,color:C.ts,marginBottom:4}}>Combat Log</div>
                  {clog.slice(-10).reverse().map(function(l,i){return <div key={i} style={{fontSize:10,color:C.ts,padding:"2px 0",borderBottom:"1px solid "+C.bg,opacity:1-i*0.08}}>{l}</div>})}
                </div>)}
            </div>)}

          {/* EQUIPMENT PAGE */}
          {page==="equipment"&&(
            <div style={{maxWidth:700}}>
              <div style={{fontSize:18,fontWeight:700,color:C.white,marginBottom:16}}>🗡️ Equipment</div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                {ESLOTS.map(function(slot){var iid=eq[slot.id];var it=iid?ITEMS[iid]:null;var el=iid?(enh[iid]||0):0;return(
                  <div key={slot.id} style={{padding:"10px 14px",borderRadius:8,background:C.card,border:"1px solid "+(it?C.acc+"30":C.border)}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
                      <span style={{fontSize:11,color:C.ts}}>{slot.i} {slot.n}</span>
                      {it&&<span onClick={function(){unequipIt(slot.id)}} style={{fontSize:9,color:C.bad,cursor:"pointer"}}>Unequip</span>}
                    </div>
                    {it?(<div>
                      <div style={{fontSize:13,fontWeight:600,color:C.white}}>{it.i} {it.n}{el>0?" +"+el:""}</div>
                      {it.st&&<div style={{fontSize:10,color:C.ts,marginTop:2}}>{Object.entries(it.st).map(function(e){return e[0].toUpperCase()+": +"+Math.floor(e[1]*(1+el*0.08))}).join(" • ")}</div>}
                    </div>):(<div style={{fontSize:12,color:C.td}}>Empty</div>)}
                  </div>);})}
              </div>
            </div>)}

          {/* ENHANCING PAGE */}
          {page==="enhancing"&&(
            <div style={{maxWidth:700}}>
              <div style={{fontSize:18,fontWeight:700,color:C.white,marginBottom:4}}>✨ Enhancing</div>
              <div style={{fontSize:12,color:C.ts,marginBottom:4}}>Level {sl("enhancing").lv} — {fmt(sl("enhancing").xp)} / {fmt(sl("enhancing").need)} XP</div>
              <div style={{height:8,borderRadius:4,background:C.card,overflow:"hidden",marginBottom:16}}><div style={{width:(sl("enhancing").xp/sl("enhancing").need)*100+"%",height:"100%",borderRadius:4,background:C.warn}}/></div>
              <div style={{fontSize:12,color:C.ts,marginBottom:16}}>Improve equipment stats. Failed attempts reset to +0!</div>
              {ESLOTS.map(function(slot){var iid=eq[slot.id];if(!iid)return null;var it=ITEMS[iid];var cl=enh[iid]||0;var cost=Math.floor(50*Math.pow(1.5,cl));var rate=Math.max(20,Math.floor((0.8-cl*0.05)*100));return(
                <div key={slot.id} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"10px 14px",borderRadius:8,background:C.card,border:"1px solid "+C.border,marginBottom:6}}>
                  <div>
                    <div style={{fontSize:13,fontWeight:600,color:C.white}}>{it.i} {it.n} +{cl}</div>
                    <div style={{fontSize:10,color:C.ts}}>Success: {rate}% • Cost: 🪙{fmt(cost)}</div>
                  </div>
                  <div onClick={function(){doEnh(slot.id)}} style={{padding:"6px 16px",borderRadius:6,background:gold>=cost&&cl<20?C.warn:C.card,color:C.white,fontSize:11,fontWeight:700,cursor:gold>=cost&&cl<20?"pointer":"default",opacity:gold>=cost&&cl<20?1:0.4}}>Enhance</div>
                </div>);}).filter(Boolean)}
              {!Object.values(eq).some(Boolean)&&<div style={{fontSize:12,color:C.td,padding:20,textAlign:"center"}}>Equip items first to enhance them</div>}
            </div>)}

          {/* INVENTORY PAGE */}
          {page==="inventory"&&(
            <div style={{maxWidth:700}}>
              <div style={{fontSize:18,fontWeight:700,color:C.white,marginBottom:16}}>🎒 Inventory</div>
              {Object.entries(inv).length===0&&<div style={{fontSize:12,color:C.td}}>Inventory is empty. Start gathering!</div>}
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:6}}>
                {Object.entries(inv).map(function(e){var id=e[0],qty=e[1];var it=ITEMS[id];if(!it)return null;return(
                  <div key={id} style={{padding:"8px 10px",borderRadius:6,background:C.card,border:"1px solid "+C.border}}>
                    <div style={{fontSize:12,fontWeight:600,color:C.white}}>{it.i} {it.n}</div>
                    <div style={{fontSize:10,color:C.ts}}>x{qty}</div>
                    {it.st&&<div style={{fontSize:9,color:C.td,marginTop:2}}>{Object.entries(it.st).map(function(s){return s[0]+"+"+s[1]}).join(" ")}</div>}
                    {it.food&&<div style={{fontSize:9,color:C.ok}}>Heals {it.heal} HP</div>}
                    {it.eq&&<div onClick={function(){equipIt(id)}} style={{marginTop:4,padding:"3px 8px",borderRadius:4,background:C.acc,color:C.white,fontSize:9,fontWeight:700,cursor:"pointer",textAlign:"center"}}>Equip</div>}
                  </div>);})}
              </div>
            </div>)}

        </div>
      </div>

      {/* RIGHT PANEL */}
      <div style={{width:240,flexShrink:0,display:"flex",flexDirection:"column",background:C.panel,borderLeft:"1px solid "+C.border,overflow:"auto",padding:10}}>
        <div style={{marginBottom:10,padding:8,borderRadius:6,background:C.card,border:"1px solid "+C.border}}>
          <div style={{fontSize:10,fontWeight:700,color:C.acc,marginBottom:6}}>EQUIPPED</div>
          {ESLOTS.map(function(slot){var iid=eq[slot.id];var it=iid?ITEMS[iid]:null;var el=iid?(enh[iid]||0):0;return(
            <div key={slot.id} style={{display:"flex",justifyContent:"space-between",padding:"2px 0",fontSize:10}}>
              <span style={{color:C.td}}>{slot.i} {slot.n}</span>
              <span style={{color:it?C.text:C.td,fontWeight:it?600:400}}>{it?it.n+(el>0?" +"+el:""):"—"}</span>
            </div>);})}
        </div>
        <div style={{marginBottom:10,padding:8,borderRadius:6,background:C.card,border:"1px solid "+C.border}}>
          <div style={{fontSize:10,fontWeight:700,color:C.acc,marginBottom:6}}>STATS</div>
          {[{l:"HP",v:pStats.hp,c:C.ok},{l:"ATK",v:pStats.atk,c:C.bad},{l:"DEF",v:pStats.def,c:C.acc},{l:"Ranged",v:pStats.rng,c:C.okD},{l:"Magic",v:pStats.mag,c:C.purp}].map(function(s){return(
            <div key={s.l} style={{display:"flex",justifyContent:"space-between",padding:"2px 0",fontSize:10}}>
              <span style={{color:C.ts}}>{s.l}</span><span style={{color:s.c,fontWeight:700}}>{s.v}</span>
            </div>);})}
        </div>
        <div style={{padding:8,borderRadius:6,background:C.card,border:"1px solid "+C.border}}>
          <div style={{fontSize:10,fontWeight:700,color:C.acc,marginBottom:6}}>RESOURCES</div>
          {Object.entries(inv).filter(function(e){return ITEMS[e[0]]&&ITEMS[e[0]].s}).map(function(e){var id=e[0],qty=e[1];return(
            <div key={id} style={{display:"flex",justifyContent:"space-between",padding:"2px 0",fontSize:10}}>
              <span style={{color:C.ts}}>{ITEMS[id].i} {ITEMS[id].n}</span><span style={{color:C.text,fontWeight:700}}>{fmt(qty)}</span>
            </div>);})}
          {!Object.entries(inv).some(function(e){return ITEMS[e[0]]&&ITEMS[e[0]].s})&&<div style={{fontSize:10,color:C.td}}>Empty</div>}
        </div>
      </div>

      <style dangerouslySetInnerHTML={{__html:"\n* { box-sizing: border-box; margin: 0; padding: 0; }\nbody { background: "+C.bg+"; overflow: hidden; }\n::-webkit-scrollbar { width: 5px; }\n::-webkit-scrollbar-track { background: transparent; }\n::-webkit-scrollbar-thumb { background: "+C.border+"; border-radius: 3px; }\n::selection { background: "+C.acc+"40; }\n"}}/>
    </div>
  );
}

export default function App(){
  const[user,setUser]=useState(null);
  const[loading,setLoading]=useState(true);
  useEffect(()=>{const unsub=onAuthStateChanged(auth,(u)=>{setUser(u);setLoading(false)});return unsub},[]);
  if(loading)return <div style={{width:"100%",height:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:C.bg,color:C.text,fontFamily:FONT}}>Loading...</div>;
  if(!user)return <AuthScreen onLogin={setUser}/>;
  return <GameUI account={user} onLogout={()=>signOut(auth)}/>;
}
