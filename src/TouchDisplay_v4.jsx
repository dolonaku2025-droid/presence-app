import { useState, useEffect, useCallback, useRef } from "react";

/* ═══════════════════ PERSISTENT DATABASE (localStorage) ═══════════════════ */
const DB_KEY = "presenceDB_v2";

function loadDB() {
  try {
    const raw = localStorage.getItem(DB_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return null;
}

function saveDB(db) {
  try { localStorage.setItem(DB_KEY, JSON.stringify(db)); } catch {}
}

const COMPANY_PHONE = "01 23 45 67 89"; // fallback only

const COMPANIES = [
  { id:"c1", name:"StageUp",     color:"#00C8CC", dark:"#00E5E8" },
  { id:"c2", name:"LiveFX",      color:"#6366F1", dark:"#818CF8" },
  { id:"c3", name:"MusicPlus",   color:"#F59E0B", dark:"#FCD34D" },
  { id:"c4", name:"LesAtelierM", color:"#22C55E", dark:"#4ADE80" },
  { id:"c5", name:"RCube",       color:"#A855F7", dark:"#C084FC" },
];

const INITIAL_DB = {
  employees: [
    {
      id:"admin1",
      firstName:"Admin",
      lastName:"Principal",
      email:"admin@company.com",
      phone: COMPANY_PHONE,
      companyId:"c1",
      status:"present",
      isAdmin:true,
      pin:"0000",
      photo: null,
      createdAt: Date.now(),
    },
  ],
  visitors: [],
  attendanceLogs: [],
};

function getDB() {
  const db = loadDB();
  return db || INITIAL_DB;
}

/* ═══════════════════ THEME ═══════════════════ */
const T = {
  bg:      d=> d?"#06090F":"#F0F4FA",
  surface: d=> d?"#0D1420":"#FFFFFF",
  surface2:d=> d?"#141E2E":"#F6F9FD",
  border:  d=> d?"rgba(255,255,255,0.08)":"#DDE4EF",
  border2: d=> d?"rgba(255,255,255,0.15)":"#BCC8DC",
  text:    d=> d?"#E8F0FE":"#0A1628",
  text2:   d=> d?"#8FAAC8":"#4A6080",
  text3:   d=> d?"#3D5470":"#9EB3CC",
  accent:  "#3B6FE8",
  accentHover: "#2A5FD4",
  danger:  "#E84B3B",
  success: "#22C873",
};

/* ─── Réunion added as third status ─── */
const STATUS_CFG = {
  present: { label:"Présent",  color:"#22C873", darkColor:"#4ADE90", bg:"#DCFCE7", darkBg:"#14532D33", text:"#166534", darkText:"#86EFAC" },
  absent:  { label:"Absent",   color:"#E84B3B", darkColor:"#F87171", bg:"#FEE2E2", darkBg:"#4C0D0D33", text:"#991B1B", darkText:"#FCA5A5" },
  reunion: { label:"Réunion",  color:"#F59E0B", darkColor:"#FCD34D", bg:"#FEF3C7", darkBg:"#78350F33", text:"#92400E", darkText:"#FDE68A" },
};

/* Status cycle: absent → present → reunion → absent */
const STATUS_CYCLE = { absent:"present", present:"reunion", reunion:"absent" };

function gi(f,l){ return ((f?.[0]||"")+(l?.[0]||"")).toUpperCase()||"??" }

/* ═══════════════════ PHOTO CAPTURE MODAL ═══════════════════ */
function PhotoModal({ dark, onCapture, onClose }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const fileRef = useRef(null);
  const [mode, setMode] = useState("choose"); // choose | camera | preview
  const [preview, setPreview] = useState(null);
  const [camErr, setCamErr] = useState("");

  const startCamera = async () => {
    setCamErr("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode:"user" } });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
      setMode("camera");
    } catch(e) {
      setCamErr("Caméra inaccessible : " + e.message);
    }
  };

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach(t=>t.stop());
    streamRef.current = null;
  };

  const capture = () => {
    const v = videoRef.current;
    const c = canvasRef.current;
    if (!v || !c) return;
    c.width = v.videoWidth;
    c.height = v.videoHeight;
    c.getContext("2d").drawImage(v, 0, 0);
    const dataUrl = c.toDataURL("image/jpeg", 0.85);
    setPreview(dataUrl);
    stopCamera();
    setMode("preview");
  };

  const handleFile = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = ev => { setPreview(ev.target.result); setMode("preview"); };
    reader.readAsDataURL(f);
  };

  const confirm = () => { onCapture(preview); onClose(); };
  const retake = () => { setPreview(null); setMode("choose"); };

  useEffect(() => () => stopCamera(), []);

  const btnPrim = { padding:"10px 20px", borderRadius:9, border:"none", background:"linear-gradient(135deg,#3B6FE8,#6366F1)", color:"#fff", fontSize:11, fontWeight:700, cursor:"pointer", fontFamily:"'Space Mono',monospace", letterSpacing:"0.04em" };
  const btnSec = { padding:"10px 20px", borderRadius:9, border:`1.5px solid ${T.border2(dark)}`, background:"transparent", color:T.text2(dark), fontSize:11, fontWeight:700, cursor:"pointer", fontFamily:"'Space Mono',monospace" };

  return (
    <div style={{ position:"fixed", inset:0, zIndex:1000, background:"rgba(0,0,0,0.82)", backdropFilter:"blur(10px)", display:"flex", alignItems:"center", justifyContent:"center" }}>
      <div style={{ background:T.surface(dark), borderRadius:22, padding:32, width:"min(92vw,420px)", border:`1.5px solid ${T.border2(dark)}`, boxShadow:"0 24px 80px rgba(0,0,0,0.55)", animation:"popIn 0.2s cubic-bezier(0.34,1.56,0.64,1)" }}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:24 }}>
          <div style={{ fontSize:16, fontWeight:800, color:T.text(dark), fontFamily:"'Space Grotesk',sans-serif" }}>📸 Ajouter une Photo</div>
          <button onClick={onClose} style={{ width:32, height:32, borderRadius:8, border:`1.5px solid ${T.border(dark)}`, background:"transparent", cursor:"pointer", color:T.text2(dark), fontSize:14 }}>✕</button>
        </div>

        {mode === "choose" && (
          <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
            {camErr && <div style={{ fontSize:11, color:T.danger, padding:"8px 12px", background:T.danger+"18", borderRadius:8, fontFamily:"'Space Mono',monospace" }}>{camErr}</div>}
            <button onClick={startCamera} style={{ ...btnPrim, width:"100%", padding:14 }}>📷 PRENDRE UNE PHOTO</button>
            <button onClick={()=>fileRef.current?.click()} style={{ ...btnSec, width:"100%", padding:14 }}>🖼 CHOISIR UN FICHIER</button>
            <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} style={{ display:"none" }}/>
          </div>
        )}

        {mode === "camera" && (
          <div style={{ display:"flex", flexDirection:"column", gap:16, alignItems:"center" }}>
            <div style={{ borderRadius:14, overflow:"hidden", width:"100%", background:"#000", aspectRatio:"4/3", position:"relative" }}>
              <video ref={videoRef} autoPlay playsInline muted style={{ width:"100%", height:"100%", objectFit:"cover", transform:"scaleX(-1)" }}/>
            </div>
            <canvas ref={canvasRef} style={{ display:"none" }}/>
            <div style={{ display:"flex", gap:10 }}>
              <button onClick={capture} style={{ ...btnPrim, padding:"11px 28px" }}>⚡ CAPTURER</button>
              <button onClick={()=>{ stopCamera(); setMode("choose"); }} style={{ ...btnSec }}>Annuler</button>
            </div>
          </div>
        )}

        {mode === "preview" && (
          <div style={{ display:"flex", flexDirection:"column", gap:16, alignItems:"center" }}>
            <canvas ref={canvasRef} style={{ display:"none" }}/>
            <div style={{ borderRadius:14, overflow:"hidden", width:180, height:180, border:`2px solid ${T.border2(dark)}` }}>
              <img src={preview} alt="preview" style={{ width:"100%", height:"100%", objectFit:"cover" }}/>
            </div>
            <div style={{ display:"flex", gap:10 }}>
              <button onClick={confirm} style={{ ...btnPrim, padding:"11px 24px" }}>✓ UTILISER</button>
              <button onClick={retake} style={{ ...btnSec }}>↺ Reprendre</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════ VISITOR MODAL ═══════════════════ */
function VisitorModal({ dark, onClose, onSubmit }) {
  const [form, setForm] = useState({ firstName:"", lastName:"", email:"", phone:"", reason:"reunion", photo:null });
  const [err, setErr] = useState("");
  const [showPhoto, setShowPhoto] = useState(false);
  const [success, setSuccess] = useState(false);

  const inp = {
    padding:"10px 13px", border:`1.5px solid ${T.border2(dark)}`,
    borderRadius:10, fontSize:12, fontFamily:"'Space Grotesk',sans-serif",
    background:T.surface2(dark), color:T.text(dark), outline:"none", width:"100%",
  };

  const handleSubmit = () => {
    setErr("");
    if (!form.firstName.trim() || !form.lastName.trim()) return setErr("Prénom et nom requis.");
    if (!form.email.includes("@")) return setErr("Email invalide.");
    const visitor = {
      id: "v" + Date.now(),
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      email: form.email.trim().toLowerCase(),
      phone: form.phone.trim() || null,
      reason: form.reason,
      photo: form.photo,
      status: "present",
      isVisitor: true,
      arrivedAt: Date.now(),
    };
    onSubmit(visitor);
    setSuccess(true);
  };

  if (success) return (
    <div style={{ position:"fixed", inset:0, zIndex:1000, background:"rgba(0,0,0,0.82)", backdropFilter:"blur(10px)", display:"flex", alignItems:"center", justifyContent:"center" }}>
      <div style={{ background:T.surface(dark), borderRadius:22, padding:"44px 40px", width:"min(92vw,400px)", textAlign:"center", border:`1.5px solid ${T.border2(dark)}`, animation:"popIn 0.2s cubic-bezier(0.34,1.56,0.64,1)" }}>
        <div style={{ fontSize:48, marginBottom:16 }}>✅</div>
        <div style={{ fontSize:20, fontWeight:800, color:T.text(dark), marginBottom:8, fontFamily:"'Space Grotesk',sans-serif" }}>Bienvenue !</div>
        <div style={{ fontSize:12, color:T.text2(dark), marginBottom:24, fontFamily:"'Space Mono',monospace" }}>Votre visite a été enregistrée.</div>
        <button onClick={onClose} style={{ padding:"12px 28px", borderRadius:10, border:"none", background:"linear-gradient(135deg,#3B6FE8,#6366F1)", color:"#fff", fontSize:12, fontWeight:700, cursor:"pointer", fontFamily:"'Space Mono',monospace" }}>FERMER</button>
      </div>
    </div>
  );

  return (
    <div style={{ position:"fixed", inset:0, zIndex:1000, background:"rgba(0,0,0,0.82)", backdropFilter:"blur(10px)", display:"flex", alignItems:"center", justifyContent:"center", overflowY:"auto", padding:"20px 0" }}>
      {showPhoto && <PhotoModal dark={dark} onCapture={p=>{ setForm({...form,photo:p}); setShowPhoto(false); }} onClose={()=>setShowPhoto(false)}/>}
      <div style={{ background:T.surface(dark), borderRadius:22, padding:32, width:"min(92vw,460px)", border:`1.5px solid ${T.border2(dark)}`, boxShadow:"0 24px 80px rgba(0,0,0,0.55)", animation:"popIn 0.2s cubic-bezier(0.34,1.56,0.64,1)" }}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:24 }}>
          <div>
            <div style={{ fontSize:18, fontWeight:800, color:T.text(dark), fontFamily:"'Space Grotesk',sans-serif" }}>🌐 Formulaire Visiteur</div>
            <div style={{ fontSize:9, color:T.text2(dark), fontFamily:"'Space Mono',monospace", letterSpacing:"0.06em", marginTop:2 }}>ACCÈS PUBLIC</div>
          </div>
          <button onClick={onClose} style={{ width:32, height:32, borderRadius:8, border:`1.5px solid ${T.border(dark)}`, background:"transparent", cursor:"pointer", color:T.text2(dark), fontSize:14 }}>✕</button>
        </div>

        <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
          {/* Photo */}
          <div style={{ display:"flex", alignItems:"center", gap:14 }}>
            <div style={{ width:60, height:60, borderRadius:14, overflow:"hidden", border:`2px solid ${T.border2(dark)}`, background:T.surface2(dark), display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
              {form.photo ? <img src={form.photo} alt="" style={{ width:"100%", height:"100%", objectFit:"cover" }}/> : <span style={{ fontSize:24 }}>👤</span>}
            </div>
            <button onClick={()=>setShowPhoto(true)} style={{ padding:"8px 16px", borderRadius:9, border:`1.5px solid ${T.border2(dark)}`, background:"transparent", color:T.text2(dark), fontSize:10, fontWeight:700, cursor:"pointer", fontFamily:"'Space Mono',monospace" }}>
              📸 {form.photo ? "CHANGER" : "AJOUTER"} PHOTO
            </button>
          </div>

          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
            {[["Prénom *","firstName","text"],["Nom *","lastName","text"]].map(([l,k,t])=>(
              <div key={k}>
                <label style={{ fontSize:9, fontWeight:700, color:T.text2(dark), fontFamily:"'Space Mono',monospace", letterSpacing:"0.06em", display:"block", marginBottom:4 }}>{l.toUpperCase()}</label>
                <input style={inp} type={t} placeholder={l.replace(" *","")} value={form[k]} onChange={e=>setForm({...form,[k]:e.target.value})}/>
              </div>
            ))}
          </div>

          <div>
            <label style={{ fontSize:9, fontWeight:700, color:T.text2(dark), fontFamily:"'Space Mono',monospace", letterSpacing:"0.06em", display:"block", marginBottom:4 }}>EMAIL *</label>
            <input style={inp} type="email" placeholder="votre@email.com" value={form.email} onChange={e=>setForm({...form,email:e.target.value})}/>
          </div>

          <div>
            <label style={{ fontSize:9, fontWeight:700, color:T.text2(dark), fontFamily:"'Space Mono',monospace", letterSpacing:"0.06em", display:"block", marginBottom:4 }}>☎️ TÉLÉPHONE (optionnel)</label>
            <input style={inp} type="tel" placeholder="06 00 00 00 00" value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})}/>
          </div>

          <div>
            <label style={{ fontSize:9, fontWeight:700, color:T.text2(dark), fontFamily:"'Space Mono',monospace", letterSpacing:"0.06em", display:"block", marginBottom:4 }}>MOTIF DE VISITE</label>
            <select style={inp} value={form.reason} onChange={e=>setForm({...form,reason:e.target.value})}>
              <option value="reunion">🤝 Réunion</option>
              <option value="visite">👋 Visite</option>
              <option value="prestation">🛠 Prestation</option>
            </select>
          </div>

          {err && <div style={{ fontSize:11, color:T.danger, fontFamily:"'Space Mono',monospace", padding:"9px 13px", background:T.danger+"18", borderRadius:8, border:`1px solid ${T.danger}33` }}>{err}</div>}

          <button onClick={handleSubmit} style={{ marginTop:4, width:"100%", padding:"13px", borderRadius:10, border:"none", background:"linear-gradient(135deg,#3B6FE8,#6366F1)", color:"#fff", fontSize:12, fontWeight:700, cursor:"pointer", fontFamily:"'Space Mono',monospace", letterSpacing:"0.05em", boxShadow:"0 4px 16px #3B6FE844" }}>
            ENREGISTRER LA VISITE →
          </button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════ LIVE CLOCK ═══════════════════ */
function LiveClock({ dark }) {
  const [now, setNow] = useState(new Date());
  useEffect(()=>{ const t=setInterval(()=>setNow(new Date()),1000); return()=>clearInterval(t); },[]);
  return (
    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"6px 0 8px"}}>
      <span style={{fontSize:11,color:T.text3(dark),textTransform:"capitalize",fontFamily:"'Space Mono',monospace"}}>
        {now.toLocaleDateString("fr-FR",{weekday:"long",year:"numeric",month:"long",day:"numeric"})}
      </span>
      <span style={{fontSize:20,fontWeight:700,letterSpacing:"0.12em",fontFamily:"'Space Mono',monospace",color:T.text(dark)}}>
        {now.toLocaleTimeString("fr-FR",{hour:"2-digit",minute:"2-digit",second:"2-digit"})}
      </span>
    </div>
  );
}

/* ═══════════════════ TOAST ═══════════════════ */
function Toast({ message, type, onDone }) {
  useEffect(()=>{ const t=setTimeout(onDone,2800); return()=>clearTimeout(t); },[onDone]);
  const c={success:T.success,info:T.accent,error:T.danger,warning:"#F59E0B"}[type]||T.accent;
  return (
    <div style={{
      position:"fixed",bottom:28,left:"50%",transform:"translateX(-50%)",
      background:"#0A1628",color:"#E8F0FE",
      padding:"10px 20px",borderRadius:10,fontSize:12,fontWeight:600,
      boxShadow:"0 8px 32px rgba(0,0,0,0.45)",
      display:"flex",alignItems:"center",gap:8,
      zIndex:9999,animation:"slideUp 0.22s ease-out",
      fontFamily:"'Space Mono',monospace",border:`1px solid ${c}55`,whiteSpace:"nowrap",
    }}>
      <span style={{width:7,height:7,borderRadius:"50%",background:c,flexShrink:0,boxShadow:`0 0 6px ${c}`}}/>
      {message}
    </div>
  );
}

/* ═══════════════════ STATUS PILL ═══════════════════ */
function StatusPill({ status, dark, xs }) {
  const cfg = STATUS_CFG[status]||STATUS_CFG.absent;
  const c   = dark?cfg.darkColor:cfg.color;
  const bg  = dark?cfg.darkBg:cfg.bg;
  const tx  = dark?cfg.darkText:cfg.text;
  return (
    <span style={{
      display:"inline-flex",alignItems:"center",gap:4,
      background:bg,color:tx,
      padding:xs?"2px 7px":"4px 9px",
      borderRadius:999,fontSize:xs?8:10,fontWeight:700,
      letterSpacing:"0.06em",border:`1px solid ${c}44`,
      fontFamily:"'Space Mono',monospace",userSelect:"none",whiteSpace:"nowrap",
    }}>
      <span style={{width:xs?4:5,height:xs?4:5,borderRadius:"50%",background:c,flexShrink:0,boxShadow:`0 0 4px ${c}`}}/>
      {cfg.label.toUpperCase()}
    </span>
  );
}

/* ═══════════════════ NUMPAD PIN ENTRY ═══════════════════ */
function PinPad({ onConfirm, onCancel, dark, title, subtitle }) {
  const [digits, setDigits] = useState([]);
  const [shake, setShake] = useState(false);

  const press = (d) => {
    if (digits.length >= 4) return;
    const next = [...digits, d];
    setDigits(next);
    if (next.length === 4) {
      setTimeout(() => {
        const ok = onConfirm(next.join(""));
        if (!ok) {
          setShake(true);
          setTimeout(() => { setShake(false); setDigits([]); }, 500);
        }
      }, 150);
    }
  };

  const del = () => setDigits(d => d.slice(0,-1));

  const btnStyle = (bg, col) => ({
    width: 68, height: 68, borderRadius: 16,
    border: `1.5px solid ${T.border2(dark)}`,
    background: bg || T.surface2(dark),
    color: col || T.text(dark),
    fontSize: 20, fontWeight: 700,
    cursor: "pointer", fontFamily: "'Space Mono',monospace",
    display:"flex",alignItems:"center",justifyContent:"center",
    transition:"all 0.12s",
    boxShadow: dark?"0 2px 8px #00000066":"0 2px 8px rgba(10,22,40,0.08)",
    userSelect:"none",
  });

  return (
    <div style={{
      position:"fixed",inset:0,zIndex:500,
      background:"rgba(0,0,0,0.75)",backdropFilter:"blur(8px)",
      display:"flex",alignItems:"center",justifyContent:"center",
    }}>
      <div style={{
        background:T.surface(dark),borderRadius:24,
        padding:"36px 40px 32px",
        boxShadow:"0 24px 80px rgba(0,0,0,0.5)",
        border:`1.5px solid ${T.border2(dark)}`,
        display:"flex",flexDirection:"column",alignItems:"center",gap:24,
        animation:"popIn 0.2s cubic-bezier(0.34,1.56,0.64,1)",
        minWidth:300,
      }}>
        <div style={{textAlign:"center"}}>
          <div style={{fontSize:28,marginBottom:6}}>🔐</div>
          <div style={{fontSize:17,fontWeight:800,color:T.text(dark),fontFamily:"'Space Grotesk',sans-serif",letterSpacing:"-0.02em"}}>{title||"Entrer le PIN"}</div>
          {subtitle&&<div style={{fontSize:11,color:T.text2(dark),marginTop:4,fontFamily:"'Space Mono',monospace"}}>{subtitle}</div>}
        </div>

        <div style={{display:"flex",gap:14,animation:shake?"shake 0.4s ease":"none"}}>
          {[0,1,2,3].map(i=>(
            <div key={i} style={{
              width:16,height:16,borderRadius:"50%",
              background:i<digits.length?T.accent:T.border2(dark),
              border:`2px solid ${i<digits.length?T.accent:T.border2(dark)}`,
              transition:"all 0.15s",
              boxShadow:i<digits.length?`0 0 8px ${T.accent}66`:"none",
            }}/>
          ))}
        </div>

        <div style={{display:"grid",gridTemplateColumns:"repeat(3,68px)",gap:10}}>
          {[1,2,3,4,5,6,7,8,9].map(n=>(
            <button key={n} style={btnStyle()} onClick={()=>press(String(n))}
              onMouseDown={e=>e.currentTarget.style.transform="scale(0.93)"}
              onMouseUp={e=>e.currentTarget.style.transform="scale(1)"}
            >{n}</button>
          ))}
          <button style={btnStyle(T.danger+"22","#E84B3B")} onClick={del}>⌫</button>
          <button style={btnStyle()} onClick={()=>press("0")}>0</button>
          <button style={btnStyle("transparent",T.text2(dark))} onClick={onCancel}>✕</button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════ SIGN IN SCREEN ═══════════════════ */
function SignInScreen({ dark, onSignIn, onGoCreate, employees, onVisitor }) {
  const [emailInput, setEmailInput] = useState("");
  const [passInput,  setPassInput]  = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = () => {
    setErr("");
    setLoading(true);
    setTimeout(() => {
      const emp = employees.find(e=>e.email.toLowerCase()===emailInput.trim().toLowerCase());
      if (!emp) { setErr("Email introuvable."); setLoading(false); return; }
      if (emp.password && emp.password !== passInput) { setErr("Mot de passe incorrect."); setLoading(false); return; }
      if (!emp.password && passInput !== "") { setErr("Mot de passe incorrect."); setLoading(false); return; }
      onSignIn(emp);
      setLoading(false);
    }, 400);
  };

  const inp = {
    padding:"11px 14px",border:`1.5px solid ${T.border2(dark)}`,
    borderRadius:10,fontSize:13,fontFamily:"'Space Grotesk',sans-serif",
    background:T.surface2(dark),color:T.text(dark),outline:"none",width:"100%",transition:"border 0.15s",
  };

  return (
    <div style={{
      minHeight:"100vh",background:T.bg(dark),
      display:"flex",alignItems:"center",justifyContent:"center",
      fontFamily:"'Space Grotesk',sans-serif",
      backgroundImage:dark
        ?"radial-gradient(ellipse at 30% 20%, #1a2f5533 0%, transparent 60%), radial-gradient(ellipse at 70% 80%, #3B6FE822 0%, transparent 60%)"
        :"radial-gradient(ellipse at 30% 20%, #dce8ff 0%, transparent 60%), radial-gradient(ellipse at 70% 80%, #e8f4ff 0%, transparent 60%)",
    }}>
      <div style={{
        background:T.surface(dark),borderRadius:22,
        padding:"44px 40px",width:"100%",maxWidth:400,
        boxShadow:dark?"0 24px 80px rgba(0,0,0,0.6)":"0 8px 48px rgba(10,22,40,0.12)",
        border:`1.5px solid ${T.border(dark)}`,animation:"fadeUp 0.3s ease-out",
      }}>
        <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:28}}>
          <div style={{width:42,height:42,borderRadius:12,background:"linear-gradient(135deg,#3B6FE8,#6366F1)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,boxShadow:"0 4px 16px #3B6FE866"}}>
            <span style={{color:"#fff",fontSize:18,fontWeight:900}}>◈</span>
          </div>
          <div>
            <div style={{fontSize:18,fontWeight:800,color:T.text(dark),letterSpacing:"-0.02em"}}>Tableau de Présence</div>
            <div style={{fontSize:10,color:T.text2(dark),fontFamily:"'Space Mono',monospace",letterSpacing:"0.06em",marginTop:1}}>CONNEXION</div>
          </div>
        </div>

        <div style={{display:"flex",flexDirection:"column",gap:12}}>
          <div>
            <label style={{fontSize:10,fontWeight:700,color:T.text2(dark),fontFamily:"'Space Mono',monospace",letterSpacing:"0.06em",display:"block",marginBottom:5}}>EMAIL</label>
            <input style={inp} type="email" placeholder="votre@email.com" value={emailInput}
              onChange={e=>setEmailInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&handleSubmit()}/>
          </div>
          <div>
            <label style={{fontSize:10,fontWeight:700,color:T.text2(dark),fontFamily:"'Space Mono',monospace",letterSpacing:"0.06em",display:"block",marginBottom:5}}>MOT DE PASSE</label>
            <input style={inp} type="password" placeholder="••••••••" value={passInput}
              onChange={e=>setPassInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&handleSubmit()}/>
          </div>

          {err&&<div style={{fontSize:11,color:T.danger,fontFamily:"'Space Mono',monospace",padding:"8px 12px",background:T.danger+"18",borderRadius:8,border:`1px solid ${T.danger}33`}}>{err}</div>}

          <button onClick={handleSubmit} disabled={loading} style={{
            marginTop:4,padding:"13px",borderRadius:10,border:"none",
            background:loading?T.text3(dark):"linear-gradient(135deg,#3B6FE8,#6366F1)",
            color:"#fff",fontSize:13,fontWeight:700,cursor:loading?"not-allowed":"pointer",
            fontFamily:"'Space Mono',monospace",letterSpacing:"0.05em",
            boxShadow:loading?"none":"0 4px 16px #3B6FE844",transition:"all 0.15s",
          }}>{loading?"CONNEXION...":"SE CONNECTER"}</button>

          {/* Visitor button */}
          <button onClick={onVisitor} style={{
            padding:"12px",borderRadius:10,
            border:`1.5px solid #3B6FE844`,background:"#3B6FE810",
            color:T.accent,fontSize:12,fontWeight:700,cursor:"pointer",
            fontFamily:"'Space Mono',monospace",letterSpacing:"0.04em",
          }}>🌐 ACCÈS VISITEUR</button>

          <div style={{textAlign:"center",paddingTop:8,borderTop:`1px solid ${T.border(dark)}`,marginTop:4}}>
            <span style={{fontSize:11,color:T.text2(dark),fontFamily:"'Space Mono',monospace"}}>Pas encore de compte ? </span>
            <button onClick={onGoCreate} style={{background:"none",border:"none",cursor:"pointer",color:T.accent,fontSize:11,fontWeight:700,fontFamily:"'Space Mono',monospace",textDecoration:"underline"}}>Créer un compte</button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════ CREATE ACCOUNT SCREEN ═══════════════════ */
function CreateAccountScreen({ dark, companies, onCreated, onBack, adminMode, existingEmails }) {
  const [form, setForm] = useState({
    firstName:"",lastName:"",email:"",password:"",password2:"",
    phone:"",companyId:companies[0]?.id||"",pin:"",pin2:"",photo:null,
  });
  const [err, setErr] = useState("");
  const [success, setSuccess] = useState(false);
  const [showPhoto, setShowPhoto] = useState(false);

  const inp = {
    padding:"10px 13px",border:`1.5px solid ${T.border2(dark)}`,
    borderRadius:10,fontSize:12,fontFamily:"'Space Grotesk',sans-serif",
    background:T.surface2(dark),color:T.text(dark),outline:"none",width:"100%",
  };

  const handleCreate = () => {
    setErr("");
    if (!form.firstName.trim()||!form.lastName.trim()) return setErr("Prénom et nom requis.");
    if (!form.email.includes("@")) return setErr("Email invalide.");
    if (existingEmails.includes(form.email.trim().toLowerCase())) return setErr("Email déjà utilisé.");
    if (!form.password||form.password.length<4) return setErr("Mot de passe : 4 caractères minimum.");
    if (form.password!==form.password2) return setErr("Mots de passe différents.");
    if (!/^\d{4}$/.test(form.pin)) return setErr("PIN : 4 chiffres exactement.");
    if (form.pin!==form.pin2) return setErr("PINs différents.");

    const newEmp = {
      id:"e"+Date.now(),
      firstName:form.firstName.trim(),lastName:form.lastName.trim(),
      email:form.email.trim().toLowerCase(),password:form.password,
      phone:form.phone.trim()||COMPANY_PHONE,
      companyId:form.companyId,status:"absent",isAdmin:false,
      pin:form.pin,photo:form.photo||null,createdAt:Date.now(),
    };
    onCreated(newEmp);
    setSuccess(true);
  };

  if (success) return (
    <div style={{minHeight:"100vh",background:T.bg(dark),display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'Space Grotesk',sans-serif"}}>
      <div style={{background:T.surface(dark),borderRadius:22,padding:"44px 40px",maxWidth:380,width:"100%",textAlign:"center",boxShadow:dark?"0 24px 80px rgba(0,0,0,0.6)":"0 8px 48px rgba(10,22,40,0.12)",border:`1.5px solid ${T.border(dark)}`,animation:"fadeUp 0.3s ease-out"}}>
        <div style={{fontSize:48,marginBottom:16}}>✅</div>
        <div style={{fontSize:20,fontWeight:800,color:T.text(dark),marginBottom:8}}>Compte créé !</div>
        <div style={{fontSize:12,color:T.text2(dark),marginBottom:24,lineHeight:1.6}}>Votre compte a bien été créé. Vous pouvez maintenant vous connecter.</div>
        <button onClick={onBack} style={{padding:"12px 28px",borderRadius:10,border:"none",background:"linear-gradient(135deg,#3B6FE8,#6366F1)",color:"#fff",fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"'Space Mono',monospace",letterSpacing:"0.05em"}}>SE CONNECTER →</button>
      </div>
    </div>
  );

  return (
    <div style={{minHeight:"100vh",background:T.bg(dark),display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'Space Grotesk',sans-serif",padding:"24px 16px",backgroundImage:dark?"radial-gradient(ellipse at 30% 20%, #1a2f5533 0%, transparent 60%)":"radial-gradient(ellipse at 30% 20%, #dce8ff 0%, transparent 60%)"}}>
      {showPhoto && <PhotoModal dark={dark} onCapture={p=>{ setForm({...form,photo:p}); setShowPhoto(false); }} onClose={()=>setShowPhoto(false)}/>}
      <div style={{background:T.surface(dark),borderRadius:22,padding:"36px 36px 32px",width:"100%",maxWidth:460,boxShadow:dark?"0 24px 80px rgba(0,0,0,0.6)":"0 8px 48px rgba(10,22,40,0.12)",border:`1.5px solid ${T.border(dark)}`,animation:"fadeUp 0.3s ease-out"}}>
        <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:24}}>
          <button onClick={onBack} style={{width:32,height:32,borderRadius:8,border:`1.5px solid ${T.border(dark)}`,background:"transparent",cursor:"pointer",color:T.text2(dark),fontSize:14,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>←</button>
          <div>
            <div style={{fontSize:17,fontWeight:800,color:T.text(dark),letterSpacing:"-0.02em"}}>{adminMode?"Ajouter un employé":"Créer un compte"}</div>
            <div style={{fontSize:10,color:T.text2(dark),fontFamily:"'Space Mono',monospace",letterSpacing:"0.05em",marginTop:1}}>NOUVEAU COMPTE</div>
          </div>
        </div>

        {/* Photo picker */}
        <div style={{display:"flex",alignItems:"center",gap:14,marginBottom:14,padding:"10px 14px",background:T.surface2(dark),borderRadius:12,border:`1px solid ${T.border(dark)}`}}>
          <div style={{width:52,height:52,borderRadius:12,overflow:"hidden",border:`2px solid ${T.border2(dark)}`,background:T.surface(dark),display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
            {form.photo ? <img src={form.photo} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}}/> : <span style={{fontSize:22}}>👤</span>}
          </div>
          <div>
            <div style={{fontSize:10,fontWeight:700,color:T.text2(dark),fontFamily:"'Space Mono',monospace",marginBottom:4}}>PHOTO (optionnelle)</div>
            <button onClick={()=>setShowPhoto(true)} style={{padding:"6px 13px",borderRadius:7,border:`1.5px solid ${T.border2(dark)}`,background:"transparent",color:T.text2(dark),fontSize:9,fontWeight:700,cursor:"pointer",fontFamily:"'Space Mono',monospace"}}>
              📸 {form.photo ? "CHANGER" : "AJOUTER"} PHOTO
            </button>
          </div>
        </div>

        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
          {[["Prénom *","firstName","text"],["Nom *","lastName","text"],["Email *","email","email"]].map(([l,k,t])=>(
            <div key={k} style={{gridColumn:k==="email"?"1/-1":"auto"}}>
              <label style={{fontSize:9,fontWeight:700,color:T.text2(dark),fontFamily:"'Space Mono',monospace",letterSpacing:"0.06em",display:"block",marginBottom:4}}>{l.toUpperCase()}</label>
              <input style={inp} type={t} placeholder={l.replace(" *","")} value={form[k]} onChange={e=>setForm({...form,[k]:e.target.value})}/>
            </div>
          ))}

          <div style={{gridColumn:"1/-1"}}>
            <label style={{fontSize:9,fontWeight:700,color:T.text2(dark),fontFamily:"'Space Mono',monospace",letterSpacing:"0.06em",display:"block",marginBottom:4}}>☎️ TÉLÉPHONE (optionnel)</label>
            <input style={inp} type="tel" placeholder="06 00 00 00 00" value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})}/>
          </div>

          <div style={{gridColumn:"1/-1"}}>
            <label style={{fontSize:9,fontWeight:700,color:T.text2(dark),fontFamily:"'Space Mono',monospace",letterSpacing:"0.06em",display:"block",marginBottom:4}}>SOCIÉTÉ</label>
            <select style={inp} value={form.companyId} onChange={e=>setForm({...form,companyId:e.target.value})}>
              {companies.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          {[["Mot de passe *","password","password"],["Confirmer mot de passe *","password2","password"]].map(([l,k,t])=>(
            <div key={k}>
              <label style={{fontSize:9,fontWeight:700,color:T.text2(dark),fontFamily:"'Space Mono',monospace",letterSpacing:"0.06em",display:"block",marginBottom:4}}>{l.toUpperCase()}</label>
              <input style={inp} type={t} placeholder="••••••••" value={form[k]} onChange={e=>setForm({...form,[k]:e.target.value})}/>
            </div>
          ))}

          <div>
            <label style={{fontSize:9,fontWeight:700,color:T.text2(dark),fontFamily:"'Space Mono',monospace",letterSpacing:"0.06em",display:"block",marginBottom:4}}>🔑 PIN 4 CHIFFRES *</label>
            <input style={inp} type="password" placeholder="••••" maxLength={4} value={form.pin} onChange={e=>setForm({...form,pin:e.target.value.replace(/\D/g,"")})}/>
          </div>
          <div>
            <label style={{fontSize:9,fontWeight:700,color:T.text2(dark),fontFamily:"'Space Mono',monospace",letterSpacing:"0.06em",display:"block",marginBottom:4}}>CONFIRMER PIN *</label>
            <input style={inp} type="password" placeholder="••••" maxLength={4} value={form.pin2} onChange={e=>setForm({...form,pin2:e.target.value.replace(/\D/g,"")})}/>
          </div>
        </div>

        {err&&<div style={{fontSize:11,color:T.danger,fontFamily:"'Space Mono',monospace",marginTop:12,padding:"9px 13px",background:T.danger+"18",borderRadius:8,border:`1px solid ${T.danger}33`}}>{err}</div>}

        <button onClick={handleCreate} style={{marginTop:16,width:"100%",padding:"13px",borderRadius:10,border:"none",background:"linear-gradient(135deg,#3B6FE8,#6366F1)",color:"#fff",fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"'Space Mono',monospace",letterSpacing:"0.05em",boxShadow:"0 4px 16px #3B6FE844"}}>CRÉER LE COMPTE →</button>
      </div>
    </div>
  );
}

/* ═══════════════════ STATS BAR ═══════════════════ */
function StatsBar({ employees, dark }) {
  const p = employees.filter(e=>e.status==="present").length;
  const a = employees.filter(e=>e.status==="absent").length;
  const r = employees.filter(e=>e.status==="reunion").length;
  const items = [
    {label:"Présents",  val:p, color:"#22C873", dk:"#4ADE90"},
    {label:"Absents",   val:a, color:"#E84B3B", dk:"#F87171"},
    {label:"Réunion",   val:r, color:"#F59E0B", dk:"#FCD34D"},
    {label:"Total",     val:employees.length, color:"#3B6FE8", dk:"#60A5FA"},
  ];
  return (
    <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:9,marginBottom:14}}>
      {items.map(it=>{
        const c=dark?it.dk:it.color;
        return (
          <div key={it.label} style={{background:dark?`${it.color}12`:`${it.color}0F`,borderRadius:12,padding:"10px 8px",textAlign:"center",border:`1px solid ${c}30`}}>
            <div style={{fontSize:22,fontWeight:900,color:c,fontFamily:"'Space Grotesk',sans-serif",lineHeight:1}}>{it.val}</div>
            <div style={{fontSize:8,fontWeight:700,color:c,marginTop:2,letterSpacing:"0.08em",fontFamily:"'Space Mono',monospace"}}>{it.label.toUpperCase()}</div>
          </div>
        );
      })}
    </div>
  );
}

/* ═══════════════════ EMPLOYEE CARD (touch) ═══════════════════ */
function EmployeeCard({ employee, company, onCardClick, dark, compact }) {
  const [pressing, setPressing] = useState(false);
  const handlePress = () => {
    setPressing(true);
    setTimeout(()=>setPressing(false),260);
    onCardClick(employee);
  };
  const cfg   = STATUS_CFG[employee.status]||STATUS_CFG.absent;
  const c     = dark?cfg.darkColor:cfg.color;
  const coC   = dark?company.dark:company.color;
  const inits = gi(employee.firstName, employee.lastName);

  return (
    <div onClick={handlePress} style={{
      position:"relative",overflow:"hidden",
      background:T.surface(dark),
      borderRadius:compact?13:18,
      border:`1.5px solid ${pressing?c+"88":T.border(dark)}`,
      boxShadow:pressing?`0 0 0 3px ${c}22`:dark?"0 2px 12px #00000060":"0 1px 8px rgba(10,22,40,0.08)",
      display:"flex",flexDirection:"column",alignItems:"stretch",
      cursor:"pointer",
      transform:pressing?"scale(0.95)":"scale(1)",
      transition:"all 0.16s cubic-bezier(0.34,1.56,0.64,1)",
      userSelect:"none",
    }}>
      <div style={{height:compact?3:5,background:coC,borderRadius:`${compact?11:16}px ${compact?11:16}px 0 0`}}/>
      <div style={{
        position:"relative",width:"100%",
        paddingBottom:compact?"78%":"95%",
        background:`linear-gradient(150deg,${coC}12,${coC}40)`,
        overflow:"hidden",
      }}>
        <div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center"}}>
          {employee.photo ? (
            <img src={employee.photo} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}}/>
          ) : (
            <span style={{
              fontSize:compact?"clamp(20px,2.8vw,32px)":"clamp(28px,4.5vw,52px)",
              fontWeight:900,color:coC,
              fontFamily:"'Space Grotesk',sans-serif",letterSpacing:"-0.02em",lineHeight:1,
              textShadow:`0 2px 14px ${coC}55`,
            }}>{inits}</span>
          )}
        </div>
        <div style={{
          position:"absolute",top:compact?5:8,right:compact?5:8,zIndex:2,
          background:dark?"rgba(6,9,15,0.88)":"rgba(255,255,255,0.94)",
          padding:compact?"3px 6px":"4px 9px",borderRadius:999,
          border:`1px solid ${c}44`,
          display:"flex",alignItems:"center",gap:3,
          backdropFilter:"blur(4px)",
        }}>
          <span style={{width:compact?4:5,height:compact?4:5,borderRadius:"50%",background:c,boxShadow:`0 0 5px ${c}`}}/>
          <span style={{fontSize:compact?7:8,fontWeight:700,color:dark?cfg.darkText:cfg.text,fontFamily:"'Space Mono',monospace",letterSpacing:"0.06em"}}>
            {cfg.label.toUpperCase()}
          </span>
        </div>
        <div style={{position:"absolute",bottom:0,left:0,right:0,height:compact?3:4,background:coC,opacity:0.7}}/>
      </div>
      <div style={{padding:compact?"6px 8px 8px":"10px 12px 12px",display:"flex",flexDirection:"column",gap:compact?2:4}}>
        <div style={{fontSize:compact?10:13,fontWeight:800,color:T.text(dark),lineHeight:1.2,fontFamily:"'Space Grotesk',sans-serif",letterSpacing:"-0.01em",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>
          {employee.firstName} {employee.lastName}
          {employee.isVisitor && <span style={{fontSize:7,marginLeft:4,color:"#3B6FE8",fontFamily:"'Space Mono',monospace",background:"#3B6FE818",padding:"1px 5px",borderRadius:999}}>VISITEUR</span>}
        </div>
        <div style={{display:"flex",alignItems:"center",gap:4}}>
          <span style={{width:compact?5:6,height:compact?5:6,borderRadius:"50%",background:coC,flexShrink:0}}/>
          <span style={{fontSize:compact?8:9,fontWeight:700,color:coC,fontFamily:"'Space Mono',monospace",letterSpacing:"0.05em",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{company.name.toUpperCase()}</span>
        </div>
        {!compact&&employee.phone&&(
          <div style={{fontSize:9,color:T.text3(dark),fontFamily:"'Space Mono',monospace"}}>📞 {employee.phone}</div>
        )}
      </div>
      <div style={{position:"absolute",bottom:0,left:0,right:0,background:dark?"rgba(59,111,232,0.12)":"rgba(59,111,232,0.07)",padding:"3px",textAlign:"center",fontSize:7,color:T.accent,fontFamily:"'Space Mono',monospace",letterSpacing:"0.06em",opacity:0.7}}>TOUCHER + PIN</div>
    </div>
  );
}

/* ═══════════════════ ADMIN PANEL ═══════════════════ */
function AdminPanel({ employees, visitors, companies, dark, onUpdate, onDelete, onClose, onCreateAccount, attendanceLogs }) {
  const [tab, setTab] = useState("employees"); // employees | visitors | logs
  const [editId, setEditId] = useState(null);
  const [editD,  setEditD]  = useState({});
  const [delId,  setDelId]  = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [showPhotoFor, setShowPhotoFor] = useState(null); // empId

  const inp = {
    padding:"6px 10px",border:`1.5px solid ${T.border2(dark)}`,
    borderRadius:7,fontSize:11,fontFamily:"'Space Grotesk',sans-serif",
    background:T.surface2(dark),color:T.text(dark),outline:"none",
  };
  const col  = {fontSize:9,fontWeight:700,color:T.text3(dark),letterSpacing:"0.08em",fontFamily:"'Space Mono',monospace",padding:"7px 9px",textAlign:"left",background:T.surface2(dark)};
  const cell = {padding:"8px 9px",verticalAlign:"middle",borderBottom:`1px solid ${T.border(dark)}`,fontSize:11,color:T.text(dark),fontFamily:"'Space Grotesk',sans-serif"};

  if (showCreate) return (
    <CreateAccountScreen
      dark={dark} companies={companies} adminMode
      existingEmails={employees.map(e=>e.email.toLowerCase())}
      onCreated={(newEmp)=>{ onCreateAccount(newEmp); setShowCreate(false); }}
      onBack={()=>setShowCreate(false)}
    />
  );

  return (
    <div style={{
      position:"fixed",inset:0,zIndex:200,
      background:"rgba(0,0,0,0.65)",backdropFilter:"blur(7px)",
      display:"flex",alignItems:"flex-start",justifyContent:"flex-end",
    }} onClick={e=>{if(e.target===e.currentTarget)onClose();}}>

      {showPhotoFor && (
        <PhotoModal dark={dark}
          onCapture={p=>{ onUpdate(showPhotoFor,{photo:p}); setShowPhotoFor(null); }}
          onClose={()=>setShowPhotoFor(null)}
        />
      )}

      <div style={{
        width:"min(100vw,640px)",height:"100vh",
        background:T.surface(dark),
        boxShadow:"-12px 0 60px rgba(0,0,0,0.4)",
        display:"flex",flexDirection:"column",overflow:"hidden",
        borderLeft:`1px solid ${T.border(dark)}`,
      }}>
        {/* Header */}
        <div style={{padding:"18px 20px 12px",borderBottom:`1.5px solid ${T.border(dark)}`,flexShrink:0}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12}}>
            <div>
              <div style={{fontSize:17,fontWeight:800,color:T.text(dark),fontFamily:"'Space Grotesk',sans-serif"}}>⚙ Administration</div>
              <div style={{fontSize:9,color:T.text3(dark),fontFamily:"'Space Mono',monospace",marginTop:2}}>{employees.length} EMPLOYÉS · {visitors.length} VISITEURS</div>
            </div>
            <div style={{display:"flex",gap:7}}>
              <button onClick={()=>setShowCreate(true)} style={{padding:"7px 13px",borderRadius:8,border:"none",background:"linear-gradient(135deg,#3B6FE8,#6366F1)",color:"#fff",fontSize:10,fontWeight:700,cursor:"pointer",fontFamily:"'Space Mono',monospace",letterSpacing:"0.04em"}}>+ AJOUTER</button>
              <button onClick={onClose} style={{width:34,height:34,borderRadius:8,border:`1.5px solid ${T.border(dark)}`,background:"transparent",cursor:"pointer",fontSize:14,color:T.text2(dark)}}>✕</button>
            </div>
          </div>
          <div style={{display:"flex",gap:6}}>
            {[["employees","👥 EMPLOYÉS"],["visitors","🌐 VISITEURS"],["logs","📋 LOGS"]].map(([k,l])=>(
              <button key={k} onClick={()=>setTab(k)} style={{
                padding:"5px 12px",borderRadius:7,border:`1.5px solid ${tab===k?T.accent:T.border(dark)}`,
                background:tab===k?T.accent:"transparent",color:tab===k?"#fff":T.text2(dark),
                fontSize:9,fontWeight:700,cursor:"pointer",fontFamily:"'Space Mono',monospace",letterSpacing:"0.04em",transition:"all 0.15s",
              }}>{l}</button>
            ))}
          </div>
        </div>

        {/* EMPLOYEES TAB */}
        {tab==="employees"&&(
          <div style={{flex:1,overflowY:"auto"}}>
            <table style={{width:"100%",borderCollapse:"collapse"}}>
              <thead style={{position:"sticky",top:0,zIndex:1}}>
                <tr>{["Photo","Employé","Société","Statut","Tél","PIN","Actions"].map(h=><th key={h} style={col}>{h.toUpperCase()}</th>)}</tr>
              </thead>
              <tbody>
                {employees.map(emp=>{
                  const co=companies.find(c=>c.id===emp.companyId);
                  const coC=dark?co?.dark:co?.color;
                  const isE=editId===emp.id;
                  return (
                    <tr key={emp.id} style={{background:isE?(dark?"#1E3A5F22":"#EFF6FF"):"transparent"}}>
                      <td style={cell}>
                        <div style={{width:32,height:32,borderRadius:8,overflow:"hidden",background:`${coC}22`,border:`1.5px solid ${coC}`,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:800,color:coC,flexShrink:0}} onClick={()=>setShowPhotoFor(emp.id)} title="Cliquer pour changer la photo">
                          {emp.photo ? <img src={emp.photo} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}}/> : gi(emp.firstName,emp.lastName)}
                        </div>
                      </td>
                      <td style={cell}>
                        <div>
                          <div style={{fontWeight:700,color:T.text(dark),fontSize:12}}>{emp.firstName} {emp.lastName}</div>
                          <div style={{fontSize:9,color:T.text3(dark),fontFamily:"'Space Mono',monospace"}}>{emp.isAdmin?"👑 ADMIN":emp.email}</div>
                        </div>
                      </td>
                      <td style={cell}>
                        {isE?(
                          <select value={editD.companyId} onChange={e=>setEditD({...editD,companyId:e.target.value})} style={{...inp,padding:"3px 6px"}}>
                            {companies.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
                          </select>
                        ):(
                          <span style={{fontSize:8,fontWeight:700,color:coC,background:`${coC}18`,padding:"2px 7px",borderRadius:999,fontFamily:"'Space Mono',monospace"}}>{co?.name}</span>
                        )}
                      </td>
                      <td style={cell}>
                        {isE?(
                          <select value={editD.status} onChange={e=>setEditD({...editD,status:e.target.value})} style={{...inp,padding:"3px 6px"}}>
                            {["present","absent","reunion"].map(s=><option key={s} value={s}>{STATUS_CFG[s].label}</option>)}
                          </select>
                        ):(
                          <StatusPill status={emp.status} dark={dark} xs/>
                        )}
                      </td>
                      <td style={{...cell,fontFamily:"'Space Mono',monospace",fontSize:10}}>
                        {isE?(
                          <input style={{...inp,width:110,padding:"3px 6px"}} type="tel" placeholder="06..." value={editD.phone||""} onChange={e=>setEditD({...editD,phone:e.target.value})}/>
                        ):(
                          <span style={{color:T.text2(dark)}}>{emp.phone||"—"}</span>
                        )}
                      </td>
                      <td style={{...cell,fontFamily:"'Space Mono',monospace",fontSize:12}}>
                        {isE?(
                          <input style={{...inp,width:70,padding:"3px 6px"}} maxLength={4} value={editD.pin||""} onChange={e=>setEditD({...editD,pin:e.target.value.replace(/\D/g,"")})}/>
                        ):(
                          <span style={{letterSpacing:"0.1em",color:T.text3(dark)}}>{"•".repeat(4)}</span>
                        )}
                      </td>
                      <td style={{...cell,whiteSpace:"nowrap"}}>
                        {isE?(
                          <div style={{display:"flex",gap:4}}>
                            <button onClick={()=>{onUpdate(editId,editD);setEditId(null);}} style={{padding:"3px 9px",borderRadius:5,border:"none",background:"#22C873",color:"#fff",fontSize:9,fontWeight:700,cursor:"pointer"}}>✓</button>
                            <button onClick={()=>setEditId(null)} style={{padding:"3px 9px",borderRadius:5,border:`1px solid ${T.border(dark)}`,background:"transparent",fontSize:9,cursor:"pointer",color:T.text2(dark)}}>✕</button>
                          </div>
                        ):(
                          <div style={{display:"flex",gap:4}}>
                            <button onClick={()=>{setEditId(emp.id);setEditD({companyId:emp.companyId,isAdmin:emp.isAdmin,status:emp.status,pin:emp.pin||"",phone:emp.phone||""});}} style={{padding:"3px 9px",borderRadius:5,border:`1px solid ${T.border(dark)}`,background:"transparent",fontSize:9,cursor:"pointer",color:T.text2(dark)}}>✎</button>
                            <button onClick={()=>setDelId(emp.id)} style={{padding:"3px 9px",borderRadius:5,border:"1px solid #E84B3B33",background:"transparent",fontSize:9,cursor:"pointer",color:"#E84B3B"}}>✕</button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* VISITORS TAB */}
        {tab==="visitors"&&(
          <div style={{flex:1,overflowY:"auto",padding:16}}>
            {visitors.length===0?(
              <div style={{textAlign:"center",padding:"48px 0",color:T.text3(dark),fontSize:11,fontFamily:"'Space Mono',monospace"}}>AUCUN VISITEUR</div>
            ):(
              visitors.map((v,i)=>(
                <div key={v.id||i} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 14px",borderRadius:12,marginBottom:8,background:T.surface2(dark),border:`1px solid ${T.border(dark)}`}}>
                  <div style={{width:40,height:40,borderRadius:10,overflow:"hidden",background:"#3B6FE822",border:"1.5px solid #3B6FE844",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:800,color:"#3B6FE8",flexShrink:0}}>
                    {v.photo ? <img src={v.photo} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}}/> : gi(v.firstName,v.lastName)}
                  </div>
                  <div style={{flex:1}}>
                    <div style={{fontWeight:700,color:T.text(dark),fontSize:13,fontFamily:"'Space Grotesk',sans-serif"}}>{v.firstName} {v.lastName}</div>
                    <div style={{fontSize:9,color:T.text3(dark),fontFamily:"'Space Mono',monospace",marginTop:2}}>
                      {v.email} {v.phone?`· ${v.phone}`:""} · {v.reason?.toUpperCase()}
                    </div>
                  </div>
                  <div style={{textAlign:"right"}}>
                    <StatusPill status={v.status||"present"} dark={dark} xs/>
                    <div style={{fontSize:8,color:T.text3(dark),fontFamily:"'Space Mono',monospace",marginTop:3}}>
                      {v.arrivedAt ? new Date(v.arrivedAt).toLocaleString("fr-FR",{hour:"2-digit",minute:"2-digit",day:"2-digit",month:"2-digit"}) : ""}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* LOGS TAB */}
        {tab==="logs"&&(
          <div style={{flex:1,overflowY:"auto",padding:16}}>
            {attendanceLogs.length===0?(
              <div style={{textAlign:"center",padding:"48px 0",color:T.text3(dark),fontSize:11,fontFamily:"'Space Mono',monospace"}}>AUCUN LOG</div>
            ):(
              [...attendanceLogs].reverse().map((log,i)=>(
                <div key={i} style={{display:"flex",alignItems:"center",gap:10,padding:"9px 12px",borderRadius:10,marginBottom:6,background:T.surface2(dark),border:`1px solid ${T.border(dark)}`}}>
                  <StatusPill status={log.newStatus} dark={dark} xs/>
                  <div style={{flex:1}}>
                    <div style={{fontSize:12,fontWeight:700,color:T.text(dark),fontFamily:"'Space Grotesk',sans-serif"}}>{log.name}</div>
                    <div style={{fontSize:9,color:T.text3(dark),fontFamily:"'Space Mono',monospace",marginTop:1}}>
                      {log.oldStatus?.toUpperCase()} → {log.newStatus?.toUpperCase()}
                    </div>
                  </div>
                  <div style={{fontSize:9,color:T.text3(dark),fontFamily:"'Space Mono',monospace",textAlign:"right"}}>
                    {new Date(log.timestamp).toLocaleString("fr-FR",{hour:"2-digit",minute:"2-digit",day:"2-digit",month:"2-digit"})}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {delId&&(
          <div style={{position:"absolute",inset:0,background:"rgba(0,0,0,0.6)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:10}}>
            <div style={{background:T.surface(dark),borderRadius:16,padding:24,width:260,textAlign:"center",border:`1px solid ${T.border(dark)}`}}>
              <div style={{fontSize:14,fontWeight:700,color:T.text(dark),marginBottom:6,fontFamily:"'Space Grotesk',sans-serif"}}>Supprimer cet employé ?</div>
              <div style={{fontSize:11,color:T.text3(dark),marginBottom:18,fontFamily:"'Space Mono',monospace"}}>Action irréversible.</div>
              <div style={{display:"flex",gap:9,justifyContent:"center"}}>
                <button onClick={()=>{onDelete(delId);setDelId(null);}} style={{padding:"7px 18px",borderRadius:8,border:"none",background:"#E84B3B",color:"#fff",fontWeight:700,cursor:"pointer",fontSize:11,fontFamily:"'Space Grotesk',sans-serif"}}>Supprimer</button>
                <button onClick={()=>setDelId(null)} style={{padding:"7px 18px",borderRadius:8,border:`1px solid ${T.border(dark)}`,background:"transparent",fontWeight:700,cursor:"pointer",fontSize:11,color:T.text2(dark),fontFamily:"'Space Grotesk',sans-serif"}}>Annuler</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════ MAIN APP ═══════════════════ */
export default function App() {
  const [db, setDb_] = useState(()=>getDB());
  const [currentUser, setCurrentUser] = useState(null);
  const [screen, setScreen] = useState("signin"); // signin | create | dashboard
  const [dark, setDark] = useState(false);
  const [compact, setCompact] = useState(true);
  const [companyFilter, setCompanyFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showAdmin, setShowAdmin] = useState(false);
  const [adminPinPad, setAdminPinPad] = useState(false);
  const [pinTarget, setPinTarget] = useState(null);
  const [toast, setToast] = useState(null);
  const [showVisitorModal, setShowVisitorModal] = useState(false);

  const setDb = useCallback((updater) => {
    setDb_(prev => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      saveDB(next);
      return next;
    });
  }, []);

  const showToast = useCallback((msg,type="success")=>setToast({message:msg,type,key:Date.now()}),[]);

  const employees = db.employees;
  const visitors  = db.visitors||[];
  const attendanceLogs = db.attendanceLogs||[];

  const handleSignIn = (emp) => { setCurrentUser(emp); setScreen("dashboard"); showToast(`Bonjour ${emp.firstName} !`, "success"); };
  const handleSignOut = () => { setCurrentUser(null); setScreen("signin"); setShowAdmin(false); showToast("Déconnecté.", "info"); };
  const handleCreateAccount = (newEmp) => { setDb(prev=>({...prev, employees:[...prev.employees, newEmp]})); showToast(`Compte créé pour ${newEmp.firstName}`, "success"); };

  const handleUpdate = (id, data) => {
    setDb(prev=>({...prev, employees: prev.employees.map(e=>e.id===id?{...e,...data}:e)}));
    showToast("Mis à jour","info");
  };
  const handleDelete = (id) => { setDb(prev=>({...prev, employees:prev.employees.filter(e=>e.id!==id)})); showToast("Supprimé","error"); };

  /* Card click → PIN → cycle status: absent→present→reunion→absent */
  const handleCardClick = (emp) => setPinTarget(emp);
  const handlePinConfirm = (enteredPin) => {
    if (!pinTarget) return false;
    if (enteredPin !== (pinTarget.pin||"0000")) return false;
    const newStatus = STATUS_CYCLE[pinTarget.status] || "present";
    const log = { empId:pinTarget.id, name:`${pinTarget.firstName} ${pinTarget.lastName}`, oldStatus:pinTarget.status, newStatus, timestamp:Date.now() };
    setDb(prev=>({
      ...prev,
      employees: prev.employees.map(e=>e.id===pinTarget.id?{...e,status:newStatus}:e),
      attendanceLogs: [...(prev.attendanceLogs||[]), log],
    }));
    const cfg = STATUS_CFG[newStatus];
    const typeMap = { present:"success", absent:"error", reunion:"warning" };
    showToast(`${pinTarget.firstName} → ${cfg.label}`, typeMap[newStatus]);
    setPinTarget(null);
    return true;
  };

  const handleAdminPinConfirm = (enteredPin) => {
    const admin = employees.find(e=>e.isAdmin);
    if (!admin || enteredPin !== (admin.pin||"0000")) return false;
    setAdminPinPad(false); setShowAdmin(true);
    return true;
  };

  /* Visitor submit */
  const handleVisitorSubmit = (visitor) => {
    setDb(prev=>({...prev, visitors:[...(prev.visitors||[]), visitor]}));
    showToast(`Visite enregistrée — ${visitor.firstName}`, "success");
  };

  let filtered = employees;
  if (companyFilter!=="all") filtered=filtered.filter(e=>e.companyId===companyFilter);
  if (statusFilter!=="all")  filtered=filtered.filter(e=>e.status===statusFilter);

  const STATUS_FILTERS=[
    {key:"all",label:"Tous"},
    {key:"present",label:"Présents"},
    {key:"absent",label:"Absents"},
    {key:"reunion",label:"Réunion"},
  ];
  const tCol=T.text(dark);
  const t2Col=T.text2(dark);
  const t3Col=T.text3(dark);
  const bCol=T.border(dark);

  /* ─── SCREENS ─── */
  if (screen==="signin") return (
    <>
      <GlobalStyles dark={dark}/>
      {showVisitorModal && <VisitorModal dark={dark} onClose={()=>setShowVisitorModal(false)} onSubmit={handleVisitorSubmit}/>}
      <SignInScreen dark={dark} employees={employees} onSignIn={handleSignIn} onGoCreate={()=>setScreen("create")} onVisitor={()=>setShowVisitorModal(true)}/>
      {toast&&<Toast key={toast.key} message={toast.message} type={toast.type} onDone={()=>setToast(null)}/>}
    </>
  );

  if (screen==="create") return (
    <>
      <GlobalStyles dark={dark}/>
      <CreateAccountScreen
        dark={dark} companies={COMPANIES}
        existingEmails={employees.map(e=>e.email.toLowerCase())}
        onCreated={(newEmp)=>{ handleCreateAccount(newEmp); setScreen("signin"); }}
        onBack={()=>setScreen("signin")}
      />
      {toast&&<Toast key={toast.key} message={toast.message} type={toast.type} onDone={()=>setToast(null)}/>}
    </>
  );

  /* ─── DASHBOARD ─── */
  return (
    <>
      <GlobalStyles dark={dark}/>
      <div style={{minHeight:"100vh",background:T.bg(dark),fontFamily:"'Space Grotesk',sans-serif",transition:"background 0.3s"}}>

        {/* HEADER */}
        <div style={{background:T.surface(dark),borderBottom:`1.5px solid ${bCol}`,position:"sticky",top:0,zIndex:50}}>
          <div style={{padding:"0 16px"}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",paddingTop:10,paddingBottom:2}}>
              <div style={{display:"flex",alignItems:"center",gap:10}}>
                <div style={{width:32,height:32,borderRadius:9,background:"linear-gradient(135deg,#3B6FE8,#6366F1)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,boxShadow:"0 2px 10px #3B6FE855"}}>
                  <span style={{color:"#fff",fontSize:15,fontWeight:900}}>◈</span>
                </div>
                <div>
                  <div style={{fontSize:15,fontWeight:800,color:tCol,lineHeight:1,letterSpacing:"-0.02em"}}>Tableau de Présence</div>
                  <div style={{fontSize:9,color:t3Col,marginTop:1,fontFamily:"'Space Mono',monospace",letterSpacing:"0.05em"}}>
                    {employees.filter(e=>e.status==="present").length} PRÉSENTS · {employees.filter(e=>e.status==="reunion").length} EN RÉUNION · {employees.filter(e=>e.status==="absent").length} ABSENTS
                  </div>
                </div>
              </div>
              <div style={{display:"flex",alignItems:"center",gap:6}}>
                {currentUser&&(
                  <div style={{display:"flex",alignItems:"center",gap:7,padding:"5px 10px",borderRadius:8,background:T.surface2(dark),border:`1px solid ${bCol}`}}>
                    <div style={{width:22,height:22,borderRadius:"50%",overflow:"hidden",background:"linear-gradient(135deg,#3B6FE8,#6366F1)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:8,fontWeight:800,color:"#fff"}}>
                      {currentUser.photo ? <img src={currentUser.photo} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}}/> : gi(currentUser.firstName,currentUser.lastName)}
                    </div>
                    <span style={{fontSize:10,fontWeight:700,color:t2Col,fontFamily:"'Space Mono',monospace"}}>
                      {currentUser.firstName} {currentUser.isAdmin?"👑":""}
                    </span>
                  </div>
                )}
                {/* Visitor button in dashboard header */}
                <button onClick={()=>setShowVisitorModal(true)} style={{
                  padding:"5px 10px",borderRadius:7,
                  border:`1.5px solid #3B6FE844`,background:"#3B6FE810",
                  color:T.accent,fontSize:10,fontWeight:700,cursor:"pointer",
                  fontFamily:"'Space Mono',monospace",letterSpacing:"0.04em",whiteSpace:"nowrap",
                }}>🌐 VISITEUR</button>
                {[
                  {label:compact?"⊞":"⊟", act:()=>setCompact(v=>!v), on:compact, title:"Compact"},
                  {label:dark?"☀":"🌙",   act:()=>setDark(v=>!v),    on:false,   title:"Thème"},
                  ...(currentUser?.isAdmin?[{label:"⚙ ADMIN", act:()=>setAdminPinPad(true), on:false, title:"Admin", accent:true}]:[]),
                  {label:"DÉCONNEXION",   act:handleSignOut, on:false, title:"Sortir", danger:true},
                ].map((b,i)=>(
                  <button key={i} onClick={b.act} title={b.title} style={{
                    padding:"5px 10px",borderRadius:7,
                    border:`1.5px solid ${b.danger?"#E84B3B44":b.accent?"#3B6FE888":b.on?tCol:bCol}`,
                    background:b.danger?"#E84B3B18":b.accent?"#3B6FE818":b.on?tCol:"transparent",
                    color:b.on?T.surface(dark):b.danger?"#E84B3B":b.accent?T.accent:t2Col,
                    fontSize:10,fontWeight:700,cursor:"pointer",
                    fontFamily:"'Space Mono',monospace",letterSpacing:"0.04em",
                    whiteSpace:"nowrap",transition:"all 0.15s",
                  }}>{b.label}</button>
                ))}
              </div>
            </div>
            <LiveClock dark={dark}/>
          </div>
        </div>

        {/* MAIN */}
        <div style={{padding:"12px 16px 32px"}}>
          <StatsBar employees={employees} dark={dark}/>

          {/* Company filter */}
          <div style={{display:"flex",gap:5,marginBottom:8,flexWrap:"wrap",alignItems:"center"}}>
            <span style={{fontSize:8,fontWeight:700,color:t3Col,fontFamily:"'Space Mono',monospace",letterSpacing:"0.1em",marginRight:3}}>SOCIÉTÉ:</span>
            {[{id:"all",name:"Toutes",color:"#64748B",dark:"#94A3B8"},...COMPANIES].map(co=>{
              const on=companyFilter===co.id;
              const c=dark?(co.dark||co.color):co.color;
              return (
                <button key={co.id} onClick={()=>setCompanyFilter(co.id)} style={{
                  padding:"4px 11px",borderRadius:999,
                  border:`1.5px solid ${on?c:bCol}`,background:on?c:"transparent",
                  color:on?(dark?"#06090F":"#fff"):t2Col,
                  fontSize:9,fontWeight:700,cursor:"pointer",
                  letterSpacing:"0.05em",fontFamily:"'Space Mono',monospace",transition:"all 0.15s",
                  display:"flex",alignItems:"center",gap:4,
                }}>
                  {co.id!=="all"&&<span style={{width:5,height:5,borderRadius:"50%",background:on?(dark?"#06090F":"#fff"):c,flexShrink:0}}/>}
                  {co.name.toUpperCase()}
                </button>
              );
            })}
          </div>

          {/* Status filter — now includes Réunion */}
          <div style={{display:"flex",gap:5,marginBottom:14,flexWrap:"wrap",alignItems:"center"}}>
            <span style={{fontSize:8,fontWeight:700,color:t3Col,fontFamily:"'Space Mono',monospace",letterSpacing:"0.1em",marginRight:3}}>STATUT:</span>
            {STATUS_FILTERS.map(f=>{
              const on=statusFilter===f.key;
              const cfg=STATUS_CFG[f.key];
              const c=cfg?(dark?cfg.darkColor:cfg.color):(dark?"#E8F0FE":"#0A1628");
              return (
                <button key={f.key} onClick={()=>setStatusFilter(f.key)} style={{
                  padding:"4px 11px",borderRadius:999,
                  border:`1.5px solid ${on?c:bCol}`,background:on?c:"transparent",
                  color:on?(dark?"#06090F":"#fff"):t2Col,
                  fontSize:9,fontWeight:700,cursor:"pointer",
                  letterSpacing:"0.05em",fontFamily:"'Space Mono',monospace",transition:"all 0.15s",
                }}>{f.label.toUpperCase()}</button>
              );
            })}
            <span style={{fontSize:8,color:t3Col,fontFamily:"'Space Mono',monospace",marginLeft:3}}>
              {filtered.length} RÉSULTAT{filtered.length!==1?"S":""}
            </span>
          </div>

          {/* Grid */}
          <div style={{
            display:"grid",
            gridTemplateColumns:compact?"repeat(auto-fill,minmax(120px,1fr))":"repeat(auto-fill,minmax(180px,1fr))",
            gap:compact?8:12,
          }}>
            {filtered.map((emp,idx)=>{
              const co=COMPANIES.find(c=>c.id===emp.companyId)||COMPANIES[0];
              return (
                <div key={emp.id} className="ec" style={{animationDelay:`${Math.min(idx*0.025,0.5)}s`}}>
                  <EmployeeCard employee={emp} company={co} onCardClick={handleCardClick} dark={dark} compact={compact}/>
                </div>
              );
            })}
          </div>
          {filtered.length===0&&(
            <div style={{textAlign:"center",padding:"60px 0",color:t3Col,fontSize:11,fontFamily:"'Space Mono',monospace",letterSpacing:"0.08em"}}>
              AUCUN EMPLOYÉ TROUVÉ
            </div>
          )}

          <div style={{textAlign:"center",marginTop:22,fontSize:8,color:t3Col,fontFamily:"'Space Mono',monospace",letterSpacing:"0.1em"}}>
            ◎ TOUCHER UNE CARTE ET ENTRER LE PIN POUR CHANGER LE STATUT · CYCLE: ABSENT → PRÉSENT → RÉUNION → ABSENT
          </div>
        </div>
      </div>

      {/* PIN pad for card touch */}
      {pinTarget&&(
        <PinPad
          dark={dark}
          title={`${pinTarget.firstName} ${pinTarget.lastName}`}
          subtitle={`STATUT: ${STATUS_CFG[pinTarget.status]?.label?.toUpperCase()} → ${STATUS_CFG[STATUS_CYCLE[pinTarget.status]]?.label?.toUpperCase()}`}
          onConfirm={handlePinConfirm}
          onCancel={()=>setPinTarget(null)}
        />
      )}

      {adminPinPad&&!showAdmin&&(
        <PinPad
          dark={dark} title="Accès Admin" subtitle="ENTRER LE PIN ADMINISTRATEUR"
          onConfirm={handleAdminPinConfirm} onCancel={()=>setAdminPinPad(false)}
        />
      )}

      {showAdmin&&(
        <AdminPanel
          employees={employees}
          visitors={visitors}
          companies={COMPANIES}
          dark={dark}
          onUpdate={handleUpdate}
          onDelete={handleDelete}
          onClose={()=>setShowAdmin(false)}
          onCreateAccount={(newEmp)=>{ handleCreateAccount(newEmp); }}
          attendanceLogs={attendanceLogs}
        />
      )}

      {showVisitorModal&&(
        <VisitorModal dark={dark} onClose={()=>setShowVisitorModal(false)} onSubmit={handleVisitorSubmit}/>
      )}

      {toast&&<Toast key={toast.key} message={toast.message} type={toast.type} onDone={()=>setToast(null)}/>}
    </>
  );
}

/* ═══════════════════ GLOBAL STYLES ═══════════════════ */
function GlobalStyles({ dark }) {
  return (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700;800&family=Space+Mono:wght@400;700&display=swap');
      *{box-sizing:border-box;margin:0;padding:0;}
      select option{background:${dark?"#0D1420":"#fff"};color:${dark?"#E8F0FE":"#0A1628"};}
      ::-webkit-scrollbar{width:4px;}
      ::-webkit-scrollbar-track{background:transparent;}
      ::-webkit-scrollbar-thumb{background:#88888833;border-radius:99px;}
      @keyframes slideUp{from{opacity:0;transform:translateX(-50%) translateY(14px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}
      @keyframes fadeIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
      @keyframes fadeUp{from{opacity:0;transform:translateY(18px)}to{opacity:1;transform:translateY(0)}}
      @keyframes popIn{from{opacity:0;transform:scale(0.88)}to{opacity:1;transform:scale(1)}}
      @keyframes shake{0%,100%{transform:translateX(0)}20%,60%{transform:translateX(-8px)}40%,80%{transform:translateX(8px)}}
      .ec{animation:fadeIn 0.22s ease-out both;}
      input,select,button{font-family:inherit;}
    `}</style>
  );
}
