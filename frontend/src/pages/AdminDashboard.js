/* eslint-disable */
import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { adminAPI } from "../utils/api";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";

function initials(n=""){ return n.split(" ").map(w=>w[0]).join("").toUpperCase().slice(0,2); }
function scColor(s){ return s>=80?"#059669":s>=60?"#1B5EEA":s>=40?"#D97706":"#DC2626"; }
const AVC=["av-blue","av-green","av-indigo","av-amber","av-red","av-purple"];
const MONTHS=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function RankBadge({i}){
  if(i===0) return <div style={{width:32,height:32,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18}}>🥇</div>;
  if(i===1) return <div style={{width:32,height:32,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18}}>🥈</div>;
  if(i===2) return <div style={{width:32,height:32,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18}}>🥉</div>;
  return <div style={{width:32,height:32,borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700,fontSize:12,background:"var(--bg)",color:"var(--muted)"}}>{i+1}</div>;
}

function StatusTag({s}){
  const m={Shortlisted:"tag-green",Active:"tag-blue",New:"tag-amber",Flagged:"tag-red",Banned:"tag-red",Rejected:"tag-gray","Under Review":"tag-amber",Pending:"tag-amber"};
  return <span className={"tag "+(m[s]||"tag-gray")}>{s}</span>;
}

function FraudDetailModal({ candidate, onClose, onFlagSuperAdmin, onFlagBan }) {
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);

  const handleFlag = async (ban=false) => {
    setLoading(true);
    try {
      if (ban) await onFlagBan(candidate._id, reason);
      else     await onFlagSuperAdmin(candidate._id, reason);
      onClose();
    } finally { setLoading(false); }
  };

  return (
    <div className="modal-overlay" onClick={e=>{ if(e.target===e.currentTarget) onClose(); }}>
      <div className="modal-box" style={{maxWidth:500}}>
        <div className="modal-hd">
          <span className="modal-title">⚠️ Fraud Alert — {candidate.name}</span>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>✕</button>
        </div>
        <div style={{background:"var(--red-lt)",border:"1px solid var(--red-mid)",borderRadius:"var(--r10)",padding:16,marginBottom:20}}>
          <div style={{fontWeight:700,fontSize:13,color:"var(--red)",marginBottom:8}}>Fraud Detection Report</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:12}}>
            <div style={{textAlign:"center",background:"rgba(0,0,0,.04)",borderRadius:"var(--r8)",padding:12}}>
              <div style={{fontFamily:"Fraunces,serif",fontSize:28,fontWeight:700,color:"var(--red)"}}>{candidate.fraudScore||0}</div>
              <div style={{fontSize:11,color:"var(--muted)",fontWeight:600}}>FRAUD SCORE /100</div>
            </div>
            <div style={{textAlign:"center",background:"rgba(0,0,0,.04)",borderRadius:"var(--r8)",padding:12}}>
              <div style={{fontFamily:"Fraunces,serif",fontSize:28,fontWeight:700,color:scColor(candidate.lastAtsScore||0)}}>{candidate.lastAtsScore||0}</div>
              <div style={{fontSize:11,color:"var(--muted)",fontWeight:600}}>ATS SCORE /100</div>
            </div>
          </div>
          {candidate.fraudReason && (
            <div style={{fontSize:13,color:"var(--red)",fontStyle:"italic",lineHeight:1.6}}>{candidate.fraudReason}</div>
          )}
        </div>
        <div style={{fontSize:13.5,color:"var(--muted)",lineHeight:1.7,marginBottom:20}}>
          As <strong>HR Admin</strong>, you can:
          <ul style={{marginTop:8,paddingLeft:20,display:"flex",flexDirection:"column",gap:6}}>
            <li><strong>Flag for Super Admin review</strong> — Super Admin will be notified and can decide to ban or clear this candidate.</li>
            <li><strong>Remove immediately</strong> — Bans the candidate from the platform right now.</li>
          </ul>
        </div>
        <div className="form-group">
          <label className="form-label">Reason / Evidence (will be sent to Super Admin)</label>
          <textarea className="form-textarea" rows={3}
            placeholder="Describe what makes this resume suspicious..."
            value={reason} onChange={e=>setReason(e.target.value)}/>
        </div>
        <div style={{display:"flex",gap:10,justifyContent:"flex-end",borderTop:"1px solid var(--border)",paddingTop:16}}>
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-outline" style={{color:"var(--amber)",borderColor:"var(--amber)"}}
            disabled={loading} onClick={()=>handleFlag(false)}>
            🔔 Escalate to Super Admin
          </button>
          <button className="btn btn-danger" disabled={loading} onClick={()=>handleFlag(true)}>
            🚫 Remove Now
          </button>
        </div>
      </div>
    </div>
  );
}

function HRFinalDecisionModal({ alert, onClose, onShortlist, onReject }) {
  const [loading, setLoading] = useState(false);
  const isBanned = alert.title?.toLowerCase().includes("banned") || alert.message?.toLowerCase().includes("banned");
  const candidate = alert.targetUser || {};

  const handleDecision = async (action) => {
    setLoading(true);
    try {
      if (action === "shortlist") await onShortlist(candidate._id);
      else await onReject(candidate._id);
      onClose();
    } finally { setLoading(false); }
  };

  return (
    <div className="modal-overlay" onClick={e=>{ if(e.target===e.currentTarget) onClose(); }}>
      <div className="modal-box" style={{maxWidth:500}}>
        <div className="modal-hd">
          <span className="modal-title">📋 Super Admin Decision Received</span>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>✕</button>
        </div>
        <div style={{
          background: isBanned ? "#FEF2F2" : "#F0FDF4",
          border: `1px solid ${isBanned ? "#FECACA" : "#BBF7D0"}`,
          borderRadius:"var(--r10)", padding:16, marginBottom:20
        }}>
          <div style={{fontWeight:700, fontSize:13, color: isBanned ? "#B91C1C" : "#059669", marginBottom:6}}>
            {isBanned ? "🚫 Super Admin has BANNED this user" : "✅ Super Admin has CLEARED this user"}
          </div>
          <div style={{fontSize:13, color:"var(--text)", lineHeight:1.6}}>
            <strong>Candidate:</strong> {candidate.name || "Unknown"}<br/>
            <strong>Super Admin note:</strong> {alert.message || "No note provided."}
          </div>
        </div>
        {!isBanned && (
          <div style={{fontSize:13.5, color:"var(--muted)", lineHeight:1.7, marginBottom:20}}>
            Super Admin has <strong>cleared</strong> this candidate. As HR, you now make the <strong>final hiring decision</strong>:
          </div>
        )}
        {isBanned && (
          <div style={{fontSize:13.5, color:"var(--muted)", lineHeight:1.7, marginBottom:20}}>
            Super Admin has <strong>banned</strong> this candidate. You may dismiss or record a final status.
          </div>
        )}
        <div style={{display:"flex",gap:10,justifyContent:"flex-end",borderTop:"1px solid var(--border)",paddingTop:16}}>
          <button className="btn btn-ghost" onClick={onClose}>Dismiss</button>
          {!isBanned && (
            <>
              <button className="btn btn-danger" disabled={loading} onClick={()=>handleDecision("reject")}>✗ Reject</button>
              <button className="btn btn-success" disabled={loading} onClick={()=>handleDecision("shortlist")}>✓ Shortlist</button>
            </>
          )}
          {isBanned && (
            <button className="btn btn-outline" style={{color:"var(--red)",borderColor:"var(--red)"}} onClick={onClose}>Acknowledged</button>
          )}
        </div>
      </div>
    </div>
  );
}

const alertColors = {
  fraud:   { bg:"#FFF5F5", border:"#FECACA", icon:"🚨", color:"#B91C1C" },
  success: { bg:"#F0FDF4", border:"#BBF7D0", icon:"✅", color:"#059669" },
  info:    { bg:"#EFF6FF", border:"#BFDBFE", icon:"ℹ️", color:"#1D4ED8" },
  sa_ban:  { bg:"#FFF5F5", border:"#FECACA", icon:"🚫", color:"#B91C1C" },
  sa_clear:{ bg:"#F0FDF4", border:"#BBF7D0", icon:"✅", color:"#059669" },
};

// ── Deep-safe getter: tries every known backend key variation ──
function extractAnalytics(res) {
  // res is the raw axios response object
  // Try res.data, res.data.data, res.data.analytics — all known shapes
  const candidates = [
    res?.data?.data,
    res?.data?.analytics,
    res?.data,
    res,
  ].filter(Boolean);

  for (const d of candidates) {
    // Skip if it looks like a wrapper with no real fields
    const total =
      d.total       ?? d.totalUsers    ?? d.userCount    ??
      d.users?.total ?? d.users?.count  ?? null;

    if (total !== null && total !== undefined) {
      const active =
        d.active      ?? d.activeUsers   ?? d.activeCount  ??
        d.users?.active ?? 0;

      const avgScore = Math.round(
        d.avgScore    ?? d.averageScore  ?? d.avg          ??
        d.atsAvg      ?? d.averageAts    ?? d.users?.avgScore ?? 0
      );

      const flagged =
        d.flagged     ?? d.fraudCount    ?? d.flaggedCount ??
        d.fraud       ?? d.users?.flagged ?? d.users?.fraud ?? 0;

      const highScore =
        d.highScore   ?? d.high          ?? d.highScorers  ??
        d.scoreGroups?.high ?? 0;

      const midScore =
        d.midScore    ?? d.mid           ?? d.midScorers   ??
        d.scoreGroups?.mid  ?? 0;

      const lowScore =
        d.lowScore    ?? d.low           ?? d.lowScorers   ??
        d.scoreGroups?.low  ?? 0;

      const monthly =
        Array.isArray(d.monthly)              ? d.monthly :
        Array.isArray(d.monthlyRegistrations) ? d.monthlyRegistrations :
        Array.isArray(d.registrations)        ? d.registrations :
        [];

      return { total, active, avgScore, flagged, highScore, midScore, lowScore, monthly };
    }
  }

  // Nothing matched — return zeros so UI doesn't break
  return { total:0, active:0, avgScore:0, flagged:0, highScore:0, midScore:0, lowScore:0, monthly:[] };
}

export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  const [tab, setTab]               = useState("rankings");
  const [candidates, setCandidates] = useState([]);
  const [rankings, setRankings]     = useState([]);
  const [analytics, setAnalytics]   = useState(null);
  const [analyticsError, setAnalyticsError] = useState(false);
  const [fraudCandidates, setFraudCandidates] = useState([]);
  const [loading, setLoading]       = useState(false);
  const [search, setSearch]         = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [minScore, setMinScore]     = useState(0);
  const [maxScore, setMaxScore]     = useState(100);
  const [toast, setToast]           = useState("");
  const [toastType, setToastType]   = useState("success");
  const [modal, setModal]           = useState(null);
  const [addForm, setAddForm]       = useState({name:"",email:"",targetRole:"",notes:""});
  const [fraudModal, setFraudModal]       = useState(null);
  const [hrFinalModal, setHrFinalModal]   = useState(null);
  const [sidebarOpen, setSidebarOpen]     = useState(false);
  const [alerts, setAlerts]               = useState([]);
  const [unreadCount, setUnreadCount]     = useState(0);
  const [saDecisions, setSaDecisions]     = useState([]);
  const [detailModal, setDetailModal]     = useState(null);

  const showToast = (msg, type="success") => {
    setToast(msg); setToastType(type);
    setTimeout(()=>setToast(""), 3500);
  };

  const loadSADecisions = useCallback(async () => {
    try {
      const res = await adminAPI.getAlerts();
      const decisions = (res.data.alerts || []).filter(a => a.type === "superadmin_decision");
      setSaDecisions(decisions);
      return decisions;
    } catch { return []; }
  }, []);

  const loadCandidates = useCallback(async()=>{
    setLoading(true);
    try{
      const{data}=await adminAPI.getCandidates({status:statusFilter,search,minScore,maxScore,limit:50});
      setCandidates(data.users);
    }catch{ showToast("Failed to load candidates","error"); }
    finally{ setLoading(false); }
  },[statusFilter,search,minScore,maxScore]);

  const loadAnalytics = useCallback(async () => {
    setAnalyticsError(false);
    setAnalytics(null);

    try {
      const res = await adminAPI.getAnalytics();

      // Log the raw response so you can inspect it in DevTools if needed
      console.log("📊 Raw analytics response:", JSON.stringify(res?.data, null, 2));

      const normalised = extractAnalytics(res);

      console.log("📊 Normalised analytics:", normalised);

      setAnalytics(normalised);

      // Also extract fraudCandidates if present anywhere in the response
      const d = res?.data?.data || res?.data || {};
      if (Array.isArray(d.fraudCandidates)) {
        setFraudCandidates(d.fraudCandidates);
      }

    } catch (err) {
      console.error("❌ Analytics load failed:", err);
      setAnalyticsError(true);
      setAnalytics(null);
      showToast("Failed to load analytics", "error");
    }
  }, []);

  const buildAlerts = useCallback((rankList, fraudList, saDecisionList=[]) => {
    const list = [];

    (saDecisionList || []).forEach(a => {
      const isBan = a.title?.toLowerCase().includes("banned") || a.message?.toLowerCase().includes("banned");
      list.push({
        id:        "sa_"+a._id,
        type:      isBan ? "sa_ban" : "sa_clear",
        title:     a.title || (isBan ? "🚫 Super Admin: User Banned" : "✅ Super Admin: User Cleared"),
        message:   a.message || "",
        time:      new Date(a.createdAt).toLocaleString(),
        read:      a.isRead || false,
        dbAlertId: a._id,
        targetUser: a.targetUser || null,
        requiresHRAction: !isBan,
        isBan,
        rawAlert:  a,
      });
    });

    fraudList.forEach(u => {
      list.push({
        id:        "fraud_"+u._id,
        type:      "fraud",
        candidate: u,
        title:     `Fraud Detected — ${u.name}`,
        message:   `Resume flagged with fraud score ${u.fraudScore||"?"}/100. ${u.fraudReason||"Suspicious patterns detected."}`,
        time:      "Pending review",
        read:      false,
        actions:   ["view_fraud","flag_superadmin"],
      });
    });

    const high = rankList.filter(u => u.lastAtsScore >= 85 && u.status !== "Shortlisted" && u.status !== "Rejected");
    if (high.length > 0) {
      list.push({
        id: "high_scorers", type:"success",
        title:`${high.length} High Scorer${high.length!==1?"s":""} Ready to Shortlist`,
        message:`${high.slice(0,3).map(u=>u.name).join(", ")}${high.length>3?"...":""} scored 85+ on ATS and are awaiting review.`,
        time:"Today", read:false, actions:["go_rankings"],
      });
    }

    const newC = rankList.filter(u => u.status === "New");
    if (newC.length > 0) {
      list.push({
        id:"new_candidates", type:"info",
        title:`${newC.length} New Candidate${newC.length!==1?"s":""} Awaiting Review`,
        message:`These candidates have registered and submitted resumes but haven't been reviewed yet.`,
        time:"Today", read:false, actions:["go_candidates"],
      });
    }

    const shortlisted = rankList.filter(u => u.status === "Shortlisted");
    if (shortlisted.length > 0) {
      list.push({
        id:"shortlisted_info", type:"success",
        title:`${shortlisted.length} Candidate${shortlisted.length!==1?"s":""} Shortlisted`,
        message:`Shortlist emails have been sent automatically. You can resend from the Candidates tab if needed.`,
        time:"Today", read:true, actions:["go_candidates"],
      });
    }

    if (list.length === 0) {
      list.push({ id:"all_clear", type:"success", title:"All Clear", message:"No urgent alerts. Platform is running smoothly.", time:"Now", read:true, actions:[] });
    }

    setAlerts(list);
    setUnreadCount(list.filter(a => !a.read).length);
  }, []);

  const rankingsRef = React.useRef(rankings);
  const fraudRef    = React.useRef(fraudCandidates);
  useEffect(() => { rankingsRef.current = rankings; }, [rankings]);
  useEffect(() => { fraudRef.current = fraudCandidates; }, [fraudCandidates]);

  useEffect(() => {
    const init = async () => {
      await loadRankings();
      await loadAnalytics();
      const decisions = await loadSADecisions();
      buildAlerts(rankingsRef.current, fraudRef.current, decisions);
    };
    init();
    const interval = setInterval(async () => {
      const decisions = await loadSADecisions();
      buildAlerts(rankingsRef.current, fraudRef.current, decisions);
    }, 30000);
    return () => clearInterval(interval);
  }, [loadSADecisions, loadAnalytics, buildAlerts]);

  useEffect(()=>{ if(tab==="candidates") loadCandidates(); },[tab,loadCandidates]);
  useEffect(() => { if (tab === "analytics") loadAnalytics(); }, [tab, loadAnalytics]);

  useEffect(() => {
    buildAlerts(rankings, fraudCandidates, saDecisions);
  }, [rankings, fraudCandidates, saDecisions, buildAlerts]);

  const loadRankings = async()=>{
    try{ const{data}=await adminAPI.getRankings(); setRankings(data.rankings); }
    catch{ showToast("Failed to load rankings","error"); }
  };

  const handleStatusChange = async(id, status, extra={}) => {
    try{
      const res = await adminAPI.updateStatus(id, { status, ...extra });
      const msg = status==="Shortlisted"
        ? `✅ Shortlisted! ${res.data.emailSent?"Email sent to candidate.":"(Email in dev mode — check console)"}`
        : "✅ Status updated";
      showToast(msg);
      loadCandidates(); loadRankings();
    }catch{ showToast("Update failed","error"); }
  };

  const handleFlagSuperAdmin = async (id, reason) => {
    try {
      await adminAPI.flagForSuperAdmin(id, { reason });
      showToast("🔔 Escalated to Super Admin");
      await loadCandidates();
      await loadRankings();
      await loadAnalytics();
      const decisions = await loadSADecisions();
      buildAlerts(rankingsRef.current, fraudRef.current, decisions);
    } catch {
      showToast("Action failed", "error");
    }
  };

  const handleFlagBan = async (id, reason) => {
    try {
      await adminAPI.flagRemove(id, { reason });
      showToast("🚫 Candidate removed");
      await loadCandidates();
      await loadRankings();
      await loadAnalytics();
      const decisions = await loadSADecisions();
      buildAlerts(rankingsRef.current, fraudRef.current, decisions);
    } catch {
      showToast("Action failed", "error");
    }
  };

  const handleRestore = async id=>{
    try{ await adminAPI.restore(id); showToast("✅ Candidate restored"); loadCandidates(); loadRankings(); }
    catch{ showToast("Restore failed","error"); }
  };

  const handleResendEmail = async id=>{
    try{
      const{data}=await adminAPI.resendEmail(id);
      showToast(data.emailSent?"📧 Email resent!":"Email failed — check server logs","info");
    }catch{ showToast("Resend failed","error"); }
  };

  const handleAdd = async()=>{
    if(!addForm.name||!addForm.email) return showToast("Name and email required","error");
    try{
      await adminAPI.add(addForm);
      showToast("✅ Candidate added"); setModal(null);
      setAddForm({name:"",email:"",targetRole:"",notes:""});
      loadCandidates();
    }catch(err){ showToast(err.response?.data?.message||"Failed","error"); }
  };

  const markSAAlertRead = async (dbAlertId) => {
    try { await adminAPI.markAlertRead(dbAlertId); } catch {}
    setSaDecisions(prev => prev.map(a => a._id === dbAlertId ? {...a, isRead:true} : a));
  };

  const markRead = id =>{ setAlerts(p=>p.map(a=>a.id===id?{...a,read:true}:a)); setUnreadCount(p=>Math.max(0,p-1)); };
  const dismissAlert = id =>{ setAlerts(p=>p.filter(a=>a.id!==id)); setUnreadCount(p=>Math.max(0,p-1)); };

  const exportCSV = ()=>{
    const rows=[["Name","Email","Role","ATS Score","Status","Fraud","Joined"],
      ...candidates.map(c=>[c.name,c.email,c.targetRole||"N/A",c.lastAtsScore||0,c.status,c.isFraudFlagged?"Yes":"No",new Date(c.createdAt).toLocaleDateString()])];
    const csv=rows.map(r=>r.map(v=>`"${v}"`).join(",")).join("\n");
    const b=document.createElement("a"); b.href="data:text/csv;charset=utf-8,"+encodeURIComponent(csv);
    b.download="candidates.csv"; b.click();
  };

  const pieData = analytics ? [
    {name:"High (80+)",  value: analytics.highScore, color:"#059669"},
    {name:"Mid (60-79)", value: analytics.midScore,  color:"#1B5EEA"},
    {name:"Low (<60)",   value: analytics.lowScore,  color:"#D97706"},
    {name:"Fraud",       value: analytics.flagged,   color:"#DC2626"},
  ].filter(p => p.value > 0) : [];

  const barData = analytics?.monthly?.map(m=>({
    name:  MONTHS[((m._id?.month ?? m.month ?? m._id ?? 1) - 1 + 12) % 12],
    count: m.count ?? m.total ?? m.value ?? 0,
  })) || [];

  const filteredCandidates = candidates.filter(c=>{
    const ms = statusFilter==="all" || c.status===statusFilter || (statusFilter==="Flagged"&&c.isFraudFlagged);
    const mq = !search || c.name?.toLowerCase().includes(search.toLowerCase()) || c.email?.toLowerCase().includes(search.toLowerCase());
    const msc = (c.lastAtsScore||0)>=minScore && (c.lastAtsScore||0)<=maxScore;
    return ms&&mq&&msc;
  });

  const tabs = [
    { id:"rankings",   icon:"🏆", label:"Rankings" },
    { id:"candidates", icon:"👥", label:"Candidates" },
    { id:"analytics",  icon:"📊", label:"Analytics" },
    { id:"alerts",     icon:"🔔", label:"Alerts", badge:unreadCount },
  ];

  return (
    <div className="dash-layout">
      {sidebarOpen && <div className="sidebar-overlay" onClick={()=>setSidebarOpen(false)}></div>}

      <div className={"sidebar"+(sidebarOpen?" sidebar-open":"")}>
        <div className="sb-logo">
          <div className="sb-logo-inner">
            <div className="sb-logo-dot"></div>HireIQ
          </div>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <span className="admin-badge">HR Admin</span>
            <button className="sidebar-close" onClick={()=>setSidebarOpen(false)}>✕</button>
          </div>
        </div>

        <div className="sb-section">
          <span className="sb-sect-lbl">Dashboard</span>
          {tabs.map(t=>(
            <button key={t.id} className={"sb-item"+(tab===t.id?" active":"")}
              onClick={()=>{setTab(t.id);setSidebarOpen(false);}}>
              <span className="sb-icon">{t.icon}</span>{t.label}
              {t.badge>0 && <span className="sb-badge">{t.badge}</span>}
            </button>
          ))}
        </div>

        <div className="sb-section" style={{marginTop:8}}>
          <span className="sb-sect-lbl">System</span>
          <button className="sb-item" onClick={()=>nav("/")}><span className="sb-icon">🏠</span>Home</button>
          <button className="sb-item" onClick={()=>{logout();nav("/");}}><span className="sb-icon">🚪</span>Sign out</button>
        </div>

        <div style={{padding:"14px 16px",marginTop:"auto",borderTop:"1px solid var(--border)"}}>
          <div style={{fontSize:11.5,color:"var(--muted)",lineHeight:1.6}}>
            <strong style={{color:"var(--text)"}}>HR Admin</strong> — flag suspicious resumes to Super Admin, then make final shortlist/reject decisions.
          </div>
        </div>
      </div>

      <div className="dash-main">
        <div className="topbar">
          <button className="hamburger topbar-hamburger" onClick={()=>setSidebarOpen(true)}>☰</button>
          <div className="topbar-title">{tabs.find(t=>t.id===tab)?.label||"Dashboard"}</div>
          <div className="topbar-right">
            {(tab==="candidates"||tab==="rankings") && (
              <div className="search-wrap">
                <span className="search-icon">🔍</span>
                <input className="search-input" placeholder="Search candidates..." value={search}
                  onChange={e=>setSearch(e.target.value)}/>
              </div>
            )}
            <div className="user-chip">
              <div className="avatar" style={{width:28,height:28,fontSize:11,display:"flex",alignItems:"center",justifyContent:"center",borderRadius:"50%",fontWeight:700}}>
                {initials(user?.name)}
              </div>
              <span className="chip-name chip-name-hide">{user?.name?.split(" ")[0]||"HR"}</span>
            </div>
          </div>
        </div>

        <div className="content fade-in">

          {/* ── RANKINGS ── */}
          {tab==="rankings" && (
            <>
              <div className="metrics-grid" style={{marginBottom:20}}>
                {[["Total",rankings.length,"Candidates",""],
                  ["Shortlisted",rankings.filter(u=>u.status==="Shortlisted").length,"Ready","mc-up"],
                  ["High Scorers",rankings.filter(u=>u.lastAtsScore>=80).length,"Score 80+","mc-up"],
                  ["Fraud Flagged",fraudCandidates.length,"Under Review","mc-dn"],
                ].map(([l,v,s,cls])=>(
                  <div className="mc" key={l}><div className="mc-label">{l}</div>
                    <div className="mc-value" style={{color:cls==="mc-dn"&&v>0?"var(--red)":undefined}}>{v}</div>
                    <div className={"mc-sub "+cls}>{s}</div></div>
                ))}
              </div>
              <div className="tbl-wrap">
                <div className="tbl-hd">
                  <span className="tbl-title">Candidate Rankings</span>
                  <button className="btn btn-sm btn-outline" onClick={()=>loadRankings()}>↺ Refresh</button>
                </div>
                <div style={{overflowX:"auto"}}>
                  <table>
                    <thead>
                      <tr><th>#</th><th>Candidate</th><th>Role</th><th>ATS Score</th><th>Status</th><th>Actions</th></tr>
                    </thead>
                    <tbody>
                      {rankings.length===0?(
                        <tr><td colSpan={6} style={{textAlign:"center",padding:40,color:"var(--muted)"}}>No rankings yet</td></tr>
                      ):rankings.map((c,i)=>(
                        <tr key={c._id}>
                          <td><RankBadge i={i}/></td>
                          <td>
                            <div style={{display:"flex",alignItems:"center",gap:10}}>
                              <div className={"avatar "+AVC[i%6]} style={{width:30,height:30,fontSize:11}}>{initials(c.name)}</div>
                              <div>
                                <div style={{fontWeight:600}}>{c.name}</div>
                                <div style={{fontSize:12,color:"var(--muted)"}}>{c.email}</div>
                              </div>
                            </div>
                          </td>
                          <td style={{fontSize:13,color:"var(--muted)"}}>{c.targetRole||"—"}</td>
                          <td>
                            <span style={{fontWeight:700,fontSize:15,color:scColor(c.lastAtsScore||0)}}>{c.lastAtsScore||"—"}</span>
                            <span style={{fontSize:11,color:"var(--muted)"}}>/100</span>
                          </td>
                          <td><StatusTag s={c.status}/></td>
                          <td>
                            <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
                              {c.isActive && c.status!=="Shortlisted" && (
                                <button className="btn btn-sm btn-success" onClick={()=>handleStatusChange(c._id,"Shortlisted")}>✓ Shortlist</button>
                              )}
                              {c.isActive && c.status!=="Rejected" && (
                                <button className="btn btn-sm btn-danger" onClick={()=>handleStatusChange(c._id,"Rejected")}>✗ Reject</button>
                              )}
                              {c.isFraudFlagged && c.isActive && (
                                <button className="btn btn-sm" style={{background:"var(--amber-lt)",color:"var(--amber)",border:"1px solid #FDE68A"}}
                                  onClick={()=>setFraudModal(c)}>⚠️ Fraud</button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

          {/* ── CANDIDATES ── */}
          {tab==="candidates" && (
            <>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14,flexWrap:"wrap",gap:10}}>
                <div className="chip-row">
                  {["all","New","Active","Shortlisted","Rejected","Flagged"].map(key=>(
                    <span key={key} className={"chip"+(statusFilter===key?" active":"")} onClick={()=>setStatusFilter(key)}>
                      {key==="all"?"All":key}
                    </span>
                  ))}
                </div>
                <div style={{display:"flex",gap:8}}>
                  <button className="btn btn-sm btn-outline" onClick={exportCSV}>⬇ Export CSV</button>
                  <button className="btn btn-sm btn-primary" onClick={()=>setModal("add")}>+ Add</button>
                </div>
              </div>

              <div className="tbl-wrap">
                <div className="tbl-hd">
                  <span className="tbl-title">Candidates ({filteredCandidates.length})</span>
                </div>
                <div style={{overflowX:"auto"}}>
                  <table>
                    <thead>
                      <tr><th>Candidate</th><th>Role</th><th>ATS</th><th>Status</th><th>Fraud</th><th>Joined</th><th>Actions</th></tr>
                    </thead>
                    <tbody>
                      {loading?(
                        <tr><td colSpan={7} style={{textAlign:"center",padding:40}}><div className="spinner" style={{margin:"0 auto"}}></div></td></tr>
                      ):filteredCandidates.length===0?(
                        <tr><td colSpan={7} style={{textAlign:"center",padding:40,color:"var(--muted)"}}>No candidates found</td></tr>
                      ):filteredCandidates.map((c,i)=>(
                        <tr key={c._id}>
                          <td>
                            <div style={{display:"flex",alignItems:"center",gap:10}}>
                              <div className={"avatar "+AVC[i%6]} style={{width:30,height:30,fontSize:11}}>{initials(c.name)}</div>
                              <div>
                                <div style={{fontWeight:600}}>{c.name}</div>
                                <div style={{fontSize:12,color:"var(--muted)"}}>{c.email}</div>
                              </div>
                            </div>
                          </td>
                          <td style={{fontSize:13,color:"var(--muted)"}}>{c.targetRole||"—"}</td>
                          <td><span style={{fontWeight:700,color:scColor(c.lastAtsScore||0)}}>{c.lastAtsScore||"—"}</span></td>
                          <td><StatusTag s={c.status}/></td>
                          <td>
                            {c.isFraudFlagged
                              ?<span className="tag tag-red">⚠️ Flagged</span>
                              :<span className="tag tag-green">✓ Clear</span>}
                          </td>
                          <td style={{fontSize:12,color:"var(--muted)"}}>{new Date(c.createdAt||Date.now()).toLocaleDateString()}</td>
                          <td>
                            <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
                              <button className="btn btn-sm btn-ghost" onClick={()=>setDetailModal(c)}>👁</button>
                              {c.isActive && c.status!=="Shortlisted" && (
                                <button className="btn btn-sm btn-success" onClick={()=>handleStatusChange(c._id,"Shortlisted")}>✓ Shortlist</button>
                              )}
                              {c.status==="Shortlisted" && (
                                <button className="btn btn-sm btn-outline" style={{fontSize:11}} onClick={()=>handleResendEmail(c._id)}>📧 Resend</button>
                              )}
                              {c.isActive && c.status!=="Rejected" && (
                                <button className="btn btn-sm btn-danger" onClick={()=>handleStatusChange(c._id,"Rejected")}>✗ Reject</button>
                              )}
                              <select className="form-select" style={{padding:"4px 7px",fontSize:11.5,width:"auto",minWidth:100}}
                                value={c.status} onChange={e=>handleStatusChange(c._id,e.target.value)}>
                                {["New","Active","Shortlisted","Rejected","Flagged","Under Review"].map(s=><option key={s}>{s}</option>)}
                              </select>
                              {c.isActive && c.isFraudFlagged && (
                                <button className="btn btn-sm" style={{background:"var(--amber-lt)",color:"var(--amber)",borderColor:"#FDE68A"}}
                                  onClick={()=>setFraudModal(c)}>⚠️ Fraud</button>
                              )}
                              {!c.isActive && (
                                <button className="btn btn-sm btn-success" onClick={()=>handleRestore(c._id)}>♻️ Restore</button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

          {/* ── ANALYTICS ── */}
          {tab==="analytics" && (
            analyticsError ? (
              <div style={{textAlign:"center",padding:60}}>
                <div style={{fontSize:40,marginBottom:12}}>⚠️</div>
                <p style={{color:"var(--muted)",marginBottom:16}}>Failed to load analytics.</p>
                <button className="btn btn-primary" onClick={loadAnalytics}>↺ Retry</button>
              </div>
            ) : !analytics ? (
              <div style={{textAlign:"center",padding:60}}><div className="spinner" style={{margin:"0 auto"}}></div></div>
            ) : (
              <>
                <div className="metrics-grid">
                  {[
                    ["Total Users",   analytics.total,    "Registered", ""],
                    ["Active",        analytics.active,   "Active now",  "mc-up"],
                    ["Avg ATS",       analytics.avgScore, "Platform avg",""],
                    ["Fraud Flagged", analytics.flagged,  "By HR",       "mc-dn"],
                  ].map(([l,v,s,cls])=>(
                    <div className="mc" key={l}><div className="mc-label">{l}</div>
                      <div className="mc-value" style={{color:cls==="mc-dn"&&v>0?"var(--red)":undefined}}>{v}</div>
                      <div className={"mc-sub "+cls}>{s}</div></div>
                  ))}
                </div>
                <div className="grid-2">
                  <div className="card">
                    <div className="card-hd"><span className="card-title">ATS Score Distribution</span></div>
                    {pieData.length > 0 ? (
                      <div style={{display:"flex",alignItems:"center",gap:20,flexWrap:"wrap"}}>
                        <ResponsiveContainer width={180} height={180}>
                          <PieChart><Pie data={pieData} cx={85} cy={85} innerRadius={48} outerRadius={78} dataKey="value" paddingAngle={3}>
                            {pieData.map((e,i)=><Cell key={i} fill={e.color}/>)}</Pie><Tooltip/></PieChart>
                        </ResponsiveContainer>
                        <div style={{display:"flex",flexDirection:"column",gap:10}}>
                          {pieData.map(p=>(
                            <div key={p.name} style={{display:"flex",alignItems:"center",gap:8,fontSize:13}}>
                              <div style={{width:10,height:10,borderRadius:"50%",background:p.color,flexShrink:0}}></div>
                              {p.name} — <strong>{p.value}</strong>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div style={{textAlign:"center",padding:40,color:"var(--muted)"}}>No score data yet</div>
                    )}
                  </div>
                  <div className="card">
                    <div className="card-hd"><span className="card-title">Monthly Registrations</span></div>
                    {barData.length>0?(
                      <ResponsiveContainer width="100%" height={180}>
                        <BarChart data={barData} margin={{top:0,right:0,left:-20,bottom:0}}>
                          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)"/>
                          <XAxis dataKey="name" tick={{fontSize:11,fill:"var(--muted)"}}/>
                          <YAxis tick={{fontSize:11,fill:"var(--muted)"}}/>
                          <Tooltip/><Bar dataKey="count" fill="var(--blue)" radius={[4,4,0,0]}/>
                        </BarChart>
                      </ResponsiveContainer>
                    ):<div style={{textAlign:"center",padding:40,color:"var(--muted)"}}>No registration data yet</div>}
                  </div>
                </div>

                {/* ── Debug panel: only visible in development ── */}
                {process.env.NODE_ENV === "development" && (
                  <details style={{marginTop:20,fontSize:12,color:"var(--muted)"}}>
                    <summary style={{cursor:"pointer",fontWeight:600}}>🛠 Raw Analytics Debug</summary>
                    <pre style={{background:"var(--bg)",padding:12,borderRadius:8,overflow:"auto",marginTop:8}}>
                      {JSON.stringify(analytics, null, 2)}
                    </pre>
                  </details>
                )}
              </>
            )
          )}

          {/* ── ALERTS ── */}
          {tab==="alerts" && (
            <div>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20,flexWrap:"wrap",gap:12}}>
                <div>
                  <h2 style={{fontFamily:"Fraunces,serif",fontSize:22,fontWeight:700,marginBottom:4}}>Alerts & Notifications</h2>
                  <p style={{fontSize:14,color:"var(--muted)"}}>{unreadCount} unread · {alerts.length} total</p>
                </div>
                <div style={{display:"flex",gap:8}}>
                  {unreadCount>0&&(
                    <button className="btn btn-outline btn-sm"
                      onClick={()=>{setAlerts(p=>p.map(a=>({...a,read:true})));setUnreadCount(0);}}>
                      Mark all read
                    </button>
                  )}
                  <button className="btn btn-outline btn-sm"
                    onClick={()=>{loadRankings();loadAnalytics();loadSADecisions();showToast("Refreshed");}}>
                    ↺ Refresh
                  </button>
                </div>
              </div>

              {alerts.length===0?(
                <div className="card" style={{textAlign:"center",padding:"60px 24px"}}>
                  <div style={{fontSize:48,marginBottom:16}}>🔔</div>
                  <h3 style={{fontSize:17,marginBottom:8}}>No alerts</h3>
                  <p style={{color:"var(--muted)",fontSize:14}}>Platform running smoothly.</p>
                </div>
              ):(
                <div style={{display:"flex",flexDirection:"column",gap:12}}>
                  {alerts.map(alert=>{
                    const ac = alertColors[alert.type] || alertColors.info;
                    return (
                      <div key={alert.id} style={{
                        background:ac.bg, border:`1px solid ${ac.border}`,
                        borderRadius:"var(--r16)", padding:"18px 20px",
                        display:"flex", alignItems:"flex-start", gap:14,
                        opacity:alert.read?0.8:1, transition:".2s", position:"relative"
                      }}>
                        {!alert.read&&<div style={{position:"absolute",top:14,right:14,width:8,height:8,borderRadius:"50%",background:"var(--red)"}}></div>}
                        <div style={{fontSize:24,flexShrink:0,marginTop:2}}>{ac.icon}</div>
                        <div style={{flex:1}}>
                          <div style={{display:"flex",justifyContent:"space-between",gap:8,flexWrap:"wrap",marginBottom:4}}>
                            <div style={{fontWeight:700,fontSize:14.5,color:ac.color}}>{alert.title}</div>
                            <span style={{fontSize:12,color:"var(--muted)",flexShrink:0}}>{alert.time}</span>
                          </div>
                          <div style={{fontSize:13.5,color:"var(--text)",marginBottom:14,lineHeight:1.6}}>{alert.message}</div>
                          <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                            {alert.type==="fraud" && alert.candidate && (
                              <>
                                <button className="btn btn-sm"
                                  style={{background:"var(--amber-lt)",color:"var(--amber)",border:"1px solid #FDE68A"}}
                                  onClick={()=>{ markRead(alert.id); setFraudModal(alert.candidate); }}>
                                  🔔 Escalate to Super Admin
                                </button>
                                <button className="btn btn-sm btn-outline"
                                  onClick={()=>{ markRead(alert.id); setTab("candidates"); setStatusFilter("Flagged"); }}>
                                  View Candidate
                                </button>
                              </>
                            )}
                            {(alert.type==="sa_ban" || alert.type==="sa_clear") && (
                              <>
                                <button className="btn btn-sm btn-primary" style={{fontWeight:700}}
                                  onClick={()=>{
                                    markRead(alert.id);
                                    if (alert.dbAlertId) markSAAlertRead(alert.dbAlertId);
                                    setHrFinalModal(alert);
                                  }}>
                                  📋 Take Final Decision
                                </button>
                                {!alert.read && (
                                  <span style={{fontSize:12,color:"#B91C1C",fontWeight:600,alignSelf:"center"}}>← Action required</span>
                                )}
                              </>
                            )}
                            {alert.actions?.includes("go_rankings") && (
                              <button className="btn btn-sm btn-success"
                                onClick={()=>{ markRead(alert.id); setTab("rankings"); }}>
                                View Rankings →
                              </button>
                            )}
                            {alert.actions?.includes("go_candidates") && (
                              <button className="btn btn-sm btn-outline"
                                onClick={()=>{ markRead(alert.id); setTab("candidates"); }}>
                                Review Candidates →
                              </button>
                            )}
                            {!alert.read && (
                              <button className="btn btn-sm btn-ghost" onClick={()=>markRead(alert.id)}>Mark read</button>
                            )}
                            {alert.type!=="sa_ban" && alert.type!=="sa_clear" && (
                              <button className="btn btn-sm btn-ghost" onClick={()=>dismissAlert(alert.id)}>Dismiss</button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {alerts.length > 0 && (
                <div className="card" style={{marginTop:20}}>
                  <div className="card-hd"><span className="card-title">Quick Stats</span></div>
                  <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(130px,1fr))",gap:14}}>
                    {[
                      ["📊","Total",rankings.length],
                      ["⚠️","Fraud Flagged",fraudCandidates.length],
                      ["✅","Shortlisted",rankings.filter(u=>u.status==="Shortlisted").length],
                      ["🏆","High Scorers",rankings.filter(u=>u.lastAtsScore>=80).length],
                    ].map(([icon,l,v])=>(
                      <div key={l} style={{background:"var(--bg)",borderRadius:"var(--r10)",padding:"14px 16px",textAlign:"center"}}>
                        <div style={{fontSize:24,marginBottom:6}}>{icon}</div>
                        <div style={{fontFamily:"Fraunces,serif",fontSize:26,fontWeight:700,lineHeight:1}}>{v}</div>
                        <div style={{fontSize:12,color:"var(--muted)",marginTop:4}}>{l}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

        </div>
      </div>

      {fraudModal && (
        <FraudDetailModal
          candidate={fraudModal}
          onClose={()=>setFraudModal(null)}
          onFlagSuperAdmin={handleFlagSuperAdmin}
          onFlagBan={handleFlagBan}
        />
      )}

      {hrFinalModal && (
        <HRFinalDecisionModal
          alert={hrFinalModal}
          onClose={()=>setHrFinalModal(null)}
          onShortlist={(id)=>handleStatusChange(id,"Shortlisted")}
          onReject={(id)=>handleStatusChange(id,"Rejected")}
        />
      )}

      {modal==="add" && (
        <div className="modal-overlay" onClick={e=>{if(e.target===e.currentTarget)setModal(null)}}>
          <div className="modal-box">
            <div className="modal-hd">
              <span className="modal-title">Add New Candidate</span>
              <button className="btn btn-ghost btn-sm" onClick={()=>setModal(null)}>✕</button>
            </div>
            {[["name","Full Name","text","Priya Sharma"],["email","Email Address","email","priya@example.com"],["targetRole","Role Applied","text","Frontend Engineer"],["notes","Notes","text","Referred by HR"]].map(([k,l,t,p])=>(
              <div className="form-group" key={k}>
                <label className="form-label">{l}</label>
                <input className="form-input" type={t} placeholder={p}
                  value={addForm[k]} onChange={e=>setAddForm(f=>({...f,[k]:e.target.value}))}/>
              </div>
            ))}
            <div style={{display:"flex",gap:10,justifyContent:"flex-end",marginTop:20}}>
              <button className="btn btn-ghost" onClick={()=>setModal(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleAdd}>Add Candidate</button>
            </div>
          </div>
        </div>
      )}

      {detailModal && (
        <div className="modal-overlay" onClick={e=>{if(e.target===e.currentTarget)setDetailModal(null);}}>
          <div className="modal-box" style={{maxWidth:480}}>
            <div className="modal-hd">
              <span className="modal-title">👁 Candidate Details</span>
              <button className="btn btn-ghost btn-sm" onClick={()=>setDetailModal(null)}>✕</button>
            </div>
            {[["Name",detailModal.name],["Email",detailModal.email],["Role",detailModal.targetRole||"—"],["Status",detailModal.status],["ATS Score",(detailModal.lastAtsScore||0)+"/100"],["Fraud Score",(detailModal.fraudScore||0)+"/100"],["Fraud Reason",detailModal.fraudReason||"None"],["Joined",new Date(detailModal.createdAt||Date.now()).toLocaleString()]].map(([l,v])=>(
              <div key={l} style={{display:"flex",gap:12,padding:"10px 0",borderBottom:"1px solid var(--border)",fontSize:13.5}}>
                <span style={{fontWeight:600,color:"var(--muted)",minWidth:110}}>{l}</span>
                <span style={{color:"var(--text)"}}>{v}</span>
              </div>
            ))}
            <div style={{display:"flex",gap:10,justifyContent:"flex-end",marginTop:20}}>
              <button className="btn btn-ghost" onClick={()=>setDetailModal(null)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {toast&&(
        <div className={`toast${toastType==="error"?" toast-error":""}`}>{toast}</div>
      )}
    </div>
  );
}