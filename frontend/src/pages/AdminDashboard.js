/* eslint-disable */
import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { adminAPI, interviewAPI } from "../utils/api";
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

// Fraud detail modal for alerting superadmin
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
            placeholder="Describe what makes this resume suspicious — e.g. duplicate content, impossible titles, fabricated credentials..."
            value={reason} onChange={e=>setReason(e.target.value)}/>
        </div>

        <div style={{display:"flex",gap:10,justifyContent:"flex-end",borderTop:"1px solid var(--border)",paddingTop:16}}>
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-outline" style={{color:"var(--amber)",borderColor:"var(--amber)"}}
            disabled={loading} onClick={()=>handleFlag(false)}>
            🔔 Flag for Super Admin
          </button>
          <button className="btn btn-danger" disabled={loading} onClick={()=>handleFlag(true)}>
            🚫 Remove Now
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  const [tab, setTab]               = useState("rankings");
  const [candidates, setCandidates] = useState([]);
  const [rankings, setRankings]     = useState([]);
  const [analytics, setAnalytics]   = useState(null);
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
  const [confirmModal, setConfirmModal]   = useState(null);
  const [fraudModal, setFraudModal]       = useState(null);
  const [sidebarOpen, setSidebarOpen]     = useState(false);
  const [alerts, setAlerts]               = useState([]);
  const [unreadCount, setUnreadCount]     = useState(0);

  // Interview scheduling state
  const [interviews, setInterviews]           = useState([]);
  const [interviewLoading, setInterviewLoading] = useState(false);
  const [scheduleModal, setScheduleModal]     = useState(null); // candidate object
  const [outcomeModal, setOutcomeModal]       = useState(null); // interview object
  const [rescheduleModal, setRescheduleModal] = useState(null); // interview object
  const [scheduleForm, setScheduleForm]       = useState({
    date:"", time:"", mode:"Video Call", location:"", round:"HR Round", notes:"", jobTitle:""
  });
  const [outcomeForm, setOutcomeForm]         = useState({ outcome:"Hired", offerDetails:"", notes:"" });
  const [rescheduleForm, setRescheduleForm]   = useState({ date:"", time:"", mode:"Video Call", location:"", notes:"" });
  const [interviewSaving, setInterviewSaving] = useState(false);

  const showToast = (msg, type="success") => {
    setToast(msg); setToastType(type);
    setTimeout(()=>setToast(""), 3500);
  };

  const loadCandidates = useCallback(async()=>{
    setLoading(true);
    try{
      const{data}=await adminAPI.getCandidates({status:statusFilter,search,minScore,maxScore,limit:50});
      setCandidates(data.users);
    }catch{ showToast("Failed to load candidates","error"); }
    finally{ setLoading(false); }
  },[statusFilter,search,minScore,maxScore]);

  const loadRankings = async()=>{
    try{ const{data}=await adminAPI.getRankings(); setRankings(data.rankings); }
    catch{ showToast("Failed to load rankings","error"); }
  };

  const loadAnalytics = async()=>{
    try{
      const{data}=await adminAPI.getAnalytics();
      setAnalytics(data.analytics);
      if(data.fraudCandidates) setFraudCandidates(data.fraudCandidates);
    }catch{ showToast("Failed to load analytics","error"); }
  };

  // Build alerts from real DB data
  const buildAlerts = useCallback((rankList, fraudList) => {
    const list = [];

    // Fraud alerts — each flagged candidate gets its own alert
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

    // High scorers ready to shortlist
    const high = rankList.filter(u => u.lastAtsScore >= 85 && u.status !== "Shortlisted" && u.status !== "Rejected");
    if (high.length > 0) {
      list.push({
        id:      "high_scorers",
        type:    "success",
        title:   `${high.length} High Scorer${high.length!==1?"s":""} Ready to Shortlist`,
        message: `${high.join?high.slice(0,3).map(u=>u.name).join(", ")+"...":"Candidates"} scored 85+ on ATS and are awaiting review.`,
        time:    "Today",
        read:    false,
        actions: ["go_rankings"],
      });
    }

    // New unreviewed
    const newC = rankList.filter(u => u.status === "New");
    if (newC.length > 0) {
      list.push({
        id:      "new_candidates",
        type:    "info",
        title:   `${newC.length} New Candidate${newC.length!==1?"s":""} Awaiting Review`,
        message: `These candidates have registered and submitted resumes but haven't been reviewed yet.`,
        time:    "Today",
        read:    false,
        actions: ["go_candidates"],
      });
    }

    // Shortlisted — email status
    const shortlisted = rankList.filter(u => u.status === "Shortlisted");
    if (shortlisted.length > 0) {
      list.push({
        id:      "shortlisted_info",
        type:    "success",
        title:   `${shortlisted.length} Candidate${shortlisted.length!==1?"s":""} Shortlisted`,
        message: `Shortlist emails have been sent automatically. You can resend from the Candidates tab if needed.`,
        time:    "Today",
        read:    true,
        actions: ["go_candidates"],
      });
    }

    if (list.length === 0) {
      list.push({ id:"all_clear", type:"success", title:"All Clear", message:"No urgent alerts. Platform is running smoothly.", time:"Now", read:true, actions:[] });
    }

    setAlerts(list);
    setUnreadCount(list.filter(a => !a.read).length);
  }, []);

  useEffect(()=>{ loadRankings(); loadAnalytics(); },[]);
  useEffect(()=>{ if(tab==="candidates") loadCandidates(); },[tab,loadCandidates]);
  useEffect(()=>{ if(tab==="interviews") loadInterviews(); },[tab]);
  useEffect(()=>{ if(rankings.length>0||fraudCandidates.length>0) buildAlerts(rankings, fraudCandidates); },[rankings,fraudCandidates,buildAlerts]);

  const loadInterviews = async () => {
    setInterviewLoading(true);
    try {
      const { data } = await interviewAPI.getAll();
      setInterviews(data.interviews || []);
    } catch(e) { showToast("Could not load interviews","error"); }
    finally { setInterviewLoading(false); }
  };

  const handleScheduleInterview = async () => {
    if (!scheduleForm.date || !scheduleForm.time) return showToast("Date and time are required","error");
    setInterviewSaving(true);
    try {
      const dateTime = new Date(`${scheduleForm.date}T${scheduleForm.time}`).toISOString();
      await interviewAPI.schedule({
        candidateId: scheduleModal._id,
        date:        dateTime,
        mode:        scheduleForm.mode,
        location:    scheduleForm.location,
        round:       scheduleForm.round,
        notes:       scheduleForm.notes,
        jobTitle:    scheduleForm.jobTitle || scheduleModal.targetRole || "Open Position",
      });
      showToast("✅ Interview scheduled & email sent!");
      setScheduleModal(null);
      setScheduleForm({ date:"", time:"", mode:"Video Call", location:"", round:"HR Round", notes:"", jobTitle:"" });
      loadInterviews(); loadCandidates();
    } catch(e) { showToast(e.response?.data?.message || "Failed to schedule","error"); }
    finally { setInterviewSaving(false); }
  };

  const handleRecordOutcome = async () => {
    setInterviewSaving(true);
    try {
      await interviewAPI.recordOutcome(outcomeModal._id, {
        outcome:      outcomeForm.outcome,
        offerDetails: outcomeForm.offerDetails,
        notes:        outcomeForm.notes,
      });
      const msg = outcomeForm.outcome === "Hired"
        ? "🎊 Offer letter sent to candidate!"
        : outcomeForm.outcome === "Rejected"
        ? "Rejection email sent to candidate."
        : "✅ Next round email sent!";
      showToast(msg);
      setOutcomeModal(null);
      setOutcomeForm({ outcome:"Hired", offerDetails:"", notes:"" });
      loadInterviews(); loadCandidates();
    } catch(e) { showToast(e.response?.data?.message || "Failed","error"); }
    finally { setInterviewSaving(false); }
  };

  const handleReschedule = async () => {
    if (!rescheduleForm.date || !rescheduleForm.time) return showToast("Date and time required","error");
    setInterviewSaving(true);
    try {
      const dateTime = new Date(`${rescheduleForm.date}T${rescheduleForm.time}`).toISOString();
      await interviewAPI.update(rescheduleModal._id, {
        date:     dateTime,
        mode:     rescheduleForm.mode,
        location: rescheduleForm.location,
        notes:    rescheduleForm.notes,
        status:   "Rescheduled",
      });
      showToast("📅 Rescheduled & email sent!");
      setRescheduleModal(null);
      loadInterviews();
    } catch(e) { showToast("Failed to reschedule","error"); }
    finally { setInterviewSaving(false); }
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

  const handleFlagSuperAdmin = async(id, reason) => {
    try{
      await adminAPI.flagForSuperAdmin(id, { reason });
      showToast("🔔 Flagged for Super Admin review");
      loadCandidates(); loadRankings(); loadAnalytics();
    }catch{ showToast("Action failed","error"); }
  };

  const handleFlagBan = async(id, reason) => {
    try{
      await adminAPI.flagRemove(id, { reason });
      showToast("🚫 Candidate removed");
      loadCandidates(); loadRankings(); loadAnalytics();
    }catch{ showToast("Action failed","error"); }
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

  const markRead = id =>{ setAlerts(p=>p.map(a=>a.id===id?{...a,read:true}:a)); setUnreadCount(p=>Math.max(0,p-1)); };
  const dismissAlert = id =>{ setAlerts(p=>p.filter(a=>a.id!==id)); setUnreadCount(p=>Math.max(0,p-1)); };

  const exportCSV = ()=>{
    const rows=[["Name","Email","Role","ATS Score","Status","Fraud","Joined"],
      ...candidates.map(c=>[c.name,c.email,c.targetRole||"N/A",c.lastAtsScore||0,c.status,c.isFraudFlagged?"Yes":"No",new Date(c.createdAt).toLocaleDateString()])];
    const csv=rows.map(r=>r.map(v=>`"${v}"`).join(",")).join("\n");
    const b=document.createElement("a"); b.href="data:text/csv;charset=utf-8,"+encodeURIComponent(csv);
    b.download="candidates_"+new Date().toISOString().split("T")[0]+".csv"; b.click();
    showToast("CSV exported!");
  };

  const pieData = analytics?[
    {name:"Excellent 80+", value:analytics.scoreRanges.find(r=>r._id===80)?.count||0, color:"#059669"},
    {name:"Good 60-79",    value:analytics.scoreRanges.find(r=>r._id===60)?.count||0, color:"#1B5EEA"},
    {name:"Average 40-59", value:analytics.scoreRanges.find(r=>r._id===40)?.count||0, color:"#D97706"},
    {name:"Low 0-39",      value:analytics.scoreRanges.find(r=>r._id===0)?.count||0,  color:"#DC2626"},
  ]:[];
  const barData=analytics?.monthly?.map(m=>({name:MONTHS[m._id.month-1],count:m.count}))||[];

  const alertColors = {
    fraud:   {bg:"#FEF2F2",border:"#FECACA",icon:"🚨",color:"#B91C1C"},
    success: {bg:"#ECFDF5",border:"#6EE7B7",icon:"✅",color:"#047857"},
    info:    {bg:"#EBF2FF",border:"#BFCFFD",icon:"ℹ️",color:"#1347C4"},
    warning: {bg:"#FFFBEB",border:"#FDE68A",icon:"⚠️",color:"#B45309"},
  };

  const tabs=[
    {id:"rankings",   icon:"🏆", label:"Rankings"},
    {id:"candidates", icon:"👥", label:"Candidates"},
    {id:"interviews", icon:"📅", label:"Interviews"},
    {id:"analytics",  icon:"📈", label:"Analytics"},
    {id:"alerts",     icon:"🔔", label:"Alerts", badge:unreadCount},
  ];

  return (
    <div className="dash-layout">
      {sidebarOpen&&<div className="sidebar-overlay" onClick={()=>setSidebarOpen(false)}></div>}

      <div className={"sidebar"+(sidebarOpen?" sidebar-open":"")}>
        <div className="sb-logo">
          <div className="sb-logo-inner"><div className="sb-logo-dot" style={{background:"var(--indigo)"}}></div>HireIQ</div>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <span className="admin-badge">HR Admin</span>
            <button className="sidebar-close" onClick={()=>setSidebarOpen(false)}>✕</button>
          </div>
        </div>
        <div className="sb-section">
          <span className="sb-sect-lbl">Dashboard</span>
          {tabs.map(t=>(
            <button key={t.id} className={"sb-item"+(tab===t.id?" active":"")} onClick={()=>{setTab(t.id);setSidebarOpen(false);}}>
              <span className="sb-icon">{t.icon}</span>{t.label}
              {t.badge>0&&<span className="sb-badge">{t.badge}</span>}
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
            <strong style={{color:"var(--text)"}}>HR Admin</strong> — you can shortlist,
            reject, and flag candidates. To ban accounts or review fraud, contact{" "}
            <strong style={{color:"var(--indigo)"}}>Super Admin</strong>.
          </div>
        </div>
      </div>

      <div className="dash-main">
        <div className="topbar">
          <button className="hamburger topbar-hamburger" onClick={()=>setSidebarOpen(true)}>☰</button>
          <div className="topbar-title">{tabs.find(t=>t.id===tab)?.label||"Dashboard"}</div>
          <div className="topbar-right">
            {tab==="candidates"&&(
              <div className="search-wrap">
                <span className="search-icon">🔍</span>
                <input className="search-input" placeholder="Search candidates..." value={search}
                  onChange={e=>setSearch(e.target.value)} onKeyDown={e=>e.key==="Enter"&&loadCandidates()}/>
              </div>
            )}
            <div className="user-chip">
              <div className="avatar av-indigo" style={{width:28,height:28,fontSize:11}}>{initials(user?.name)}</div>
              <span className="chip-name chip-name-hide">Admin</span>
            </div>
          </div>
        </div>

        <div className="content fade-in">

          {/* ── RANKINGS — full candidate details, no actions ── */}
          {tab==="rankings"&&(
            <>
              <div className="metrics-grid">
                {[
                  ["Total Candidates",rankings.length,"From database",""],
                  ["Avg ATS Score",rankings.length?Math.round(rankings.reduce((a,u)=>a+u.lastAtsScore,0)/rankings.length):0,"Across ranked",""],
                  ["Shortlisted",rankings.filter(u=>u.status==="Shortlisted").length,"Ready for interview","mc-up"],
                  ["Fraud Flagged",rankings.filter(u=>u.isFraudFlagged).length,"Pending review","mc-dn"],
                ].map(([l,v,s,cls])=>(
                  <div className="mc" key={l}><div className="mc-label">{l}</div>
                    <div className="mc-value" style={{color:cls==="mc-dn"&&v>0?"var(--red)":undefined}}>{v}</div>
                    <div className={"mc-sub "+cls}>{s}</div></div>
                ))}
              </div>
              <div className="tbl-wrap">
                <div className="tbl-hd">
                  <span className="tbl-title">Candidate Leaderboard</span>
                  <button className="btn btn-sm btn-outline" onClick={()=>setModal("add")}>+ Add Candidate</button>
                </div>
                <div style={{overflowX:"auto"}}>
                  <table>
                    <thead>
                      <tr>
                        <th>Rank</th><th>Name</th><th>Email</th><th>Phone</th>
                        <th>Location</th><th>Target Role</th><th>ATS Score</th>
                        <th>Analyses</th><th>Status</th><th>Fraud</th>
                        <th>Joined</th><th>Last Login</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rankings.map((c,i)=>(
                        <tr key={c._id}>
                          <td><RankBadge i={i}/></td>
                          <td>
                            <div style={{display:"flex",alignItems:"center",gap:10}}>
                              <div className={"avatar "+AVC[i%6]} style={{width:30,height:30,fontSize:11}}>{initials(c.name)}</div>
                              <span style={{fontWeight:600,whiteSpace:"nowrap"}}>{c.name}</span>
                            </div>
                          </td>
                          <td style={{fontSize:12.5,color:"var(--muted)"}}>{c.email}</td>
                          <td style={{fontSize:12.5,color:"var(--muted)"}}>{c.phone||"—"}</td>
                          <td style={{fontSize:12.5,color:"var(--muted)",whiteSpace:"nowrap"}}>{c.location||"—"}</td>
                          <td><span className="tag tag-indigo" style={{fontSize:11.5,whiteSpace:"nowrap"}}>{c.targetRole||"—"}</span></td>
                          <td>
                            <div style={{display:"flex",alignItems:"center",gap:8}}>
                              <div style={{width:46,height:5,background:"var(--border)",borderRadius:"var(--pill)",overflow:"hidden"}}>
                                <div style={{width:c.lastAtsScore+"%",height:"100%",background:scColor(c.lastAtsScore),borderRadius:"var(--pill)"}}></div>
                              </div>
                              <span style={{fontWeight:700,color:scColor(c.lastAtsScore),fontSize:13.5}}>{c.lastAtsScore}</span>
                            </div>
                          </td>
                          <td style={{textAlign:"center",fontSize:13}}>{c.totalAnalyses||0}</td>
                          <td><StatusTag s={c.status}/></td>
                          <td>
                            {c.isFraudFlagged
                              ?<span className="tag tag-red">⚠️ Flagged</span>
                              :<span className="tag tag-green">✓ Clear</span>}
                          </td>
                          <td style={{fontSize:12,color:"var(--muted)",whiteSpace:"nowrap"}}>{new Date(c.createdAt).toLocaleDateString()}</td>
                          <td style={{fontSize:12,color:"var(--muted)",whiteSpace:"nowrap"}}>{c.lastLogin?new Date(c.lastLogin).toLocaleDateString():"Never"}</td>
                        </tr>
                      ))}
                      {rankings.length===0&&(
                        <tr><td colSpan={12} style={{textAlign:"center",padding:48,color:"var(--muted)"}}>
                          No ranked candidates yet. Have users upload and analyze their resumes.
                        </td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

          {/* ── CANDIDATES — status filter bar + actions ── */}
          {tab==="candidates"&&(
            <>
              {/* Status filter navbar */}
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16,flexWrap:"wrap",gap:12}}>
                <div className="chip-row">
                  {[
                    {key:"all",      label:"All"},
                    {key:"New",      label:"New"},
                    {key:"Active",   label:"Active"},
                    {key:"Shortlisted",label:"Shortlisted"},
                    {key:"Rejected", label:"Rejected"},
                    {key:"Flagged",  label:"Flagged"},
                    {key:"Banned",   label:"Removed"},
                  ].map(({key,label})=>(
                    <span key={key} className={"chip"+(statusFilter===key?" active":"")}
                      onClick={()=>setStatusFilter(key)}>
                      {label}
                      {key==="Flagged"&&fraudCandidates.length>0&&(
                        <span style={{marginLeft:5,background:"var(--red)",color:"#fff",fontSize:10,padding:"1px 5px",borderRadius:999}}>{fraudCandidates.length}</span>
                      )}
                    </span>
                  ))}
                </div>
                <div style={{display:"flex",gap:8}}>
                  <button className="btn btn-sm btn-outline" onClick={exportCSV}>⬇ CSV</button>
                  <button className="btn btn-primary btn-sm" onClick={()=>setModal("add")}>+ Add</button>
                </div>
              </div>

              {/* Score filter */}
              <div style={{background:"#fff",border:"1px solid var(--border)",borderRadius:"var(--r12)",padding:"14px 18px",marginBottom:16}}>
                <div style={{fontSize:12,fontWeight:700,color:"var(--muted)",marginBottom:10,textTransform:"uppercase",letterSpacing:".8px"}}>Filter by ATS Score</div>
                <div style={{display:"flex",alignItems:"center",gap:12,flexWrap:"wrap"}}>
                  <span style={{fontSize:13,minWidth:70}}>Min: <strong>{minScore}</strong></span>
                  <input type="range" min={0} max={100} step={1} value={minScore}
                    onChange={e=>setMinScore(Number(e.target.value))} style={{flex:1,accentColor:"var(--blue)",minWidth:80}}/>
                  <span style={{fontSize:13,minWidth:70}}>Max: <strong>{maxScore}</strong></span>
                  <input type="range" min={0} max={100} step={1} value={maxScore}
                    onChange={e=>setMaxScore(Number(e.target.value))} style={{flex:1,accentColor:"var(--blue)",minWidth:80}}/>
                  <button className="btn btn-sm btn-primary" onClick={loadCandidates}>Apply</button>
                </div>
              </div>

              <div className="tbl-wrap">
                <div className="tbl-hd">
                  <span className="tbl-title">Candidates ({candidates.length})</span>
                  <span style={{fontSize:13,color:"var(--muted)"}}>Shortlisting sends automatic email to candidate</span>
                </div>
                <div style={{overflowX:"auto"}}>
                  <table>
                    <thead>
                      <tr>
                        <th>Candidate</th><th>Role</th><th>ATS Score</th>
                        <th>Status</th><th>Fraud</th><th>Joined</th><th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {loading?(
                        <tr><td colSpan={7} style={{textAlign:"center",padding:40}}>
                          <div className="spinner" style={{margin:"0 auto"}}></div>
                        </td></tr>
                      ):candidates.length===0?(
                        <tr><td colSpan={7} style={{textAlign:"center",padding:40,color:"var(--muted)"}}>
                          No candidates found matching filters
                        </td></tr>
                      ):candidates.map((c,i)=>(
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
                          <td>
                            <span style={{fontWeight:700,color:scColor(c.lastAtsScore||0)}}>
                              {c.lastAtsScore||"—"}
                            </span>
                          </td>
                          <td><StatusTag s={c.status}/></td>
                          <td>
                            {c.isFraudFlagged
                              ?<span className="tag tag-red">⚠️ Flagged</span>
                              :<span className="tag tag-green">✓ Clear</span>}
                          </td>
                          <td style={{fontSize:12.5,color:"var(--muted)"}}>{new Date(c.createdAt).toLocaleDateString()}</td>
                          <td>
                            <div style={{display:"flex",gap:5,flexWrap:"wrap",alignItems:"center"}}>
                              {/* Schedule Interview */}
                              {c.isActive && (c.status==="Shortlisted"||c.status==="Under Review") && (
                                <button className="btn btn-sm"
                                  style={{background:"#EFF4FF",color:"#1347C4",border:"1px solid #BFCFFD"}}
                                  onClick={()=>{ setScheduleModal(c); setScheduleForm(f=>({...f,jobTitle:c.targetRole||""})); }}>
                                  📅 Schedule
                                </button>
                              )}
                              {/* Shortlist */}
                              {c.isActive && c.status!=="Shortlisted" && (
                                <button className="btn btn-sm btn-success"
                                  onClick={()=>handleStatusChange(c._id,"Shortlisted")}>
                                  ✓ Shortlist
                                </button>
                              )}
                              {/* Resend email if shortlisted */}
                              {c.status==="Shortlisted" && (
                                <button className="btn btn-sm btn-outline"
                                  style={{fontSize:11}} onClick={()=>handleResendEmail(c._id)}>
                                  📧 Resend
                                </button>
                              )}
                              {/* Reject */}
                              {c.isActive && c.status!=="Rejected" && (
                                <button className="btn btn-sm btn-danger"
                                  onClick={()=>handleStatusChange(c._id,"Rejected")}>
                                  ✗ Reject
                                </button>
                              )}
                              {/* Status dropdown */}
                              <select className="form-select"
                                style={{padding:"4px 7px",fontSize:11.5,width:"auto",minWidth:100}}
                                value={c.status}
                                onChange={e=>handleStatusChange(c._id,e.target.value)}>
                                {["New","Active","Shortlisted","Rejected","Flagged","Under Review"].map(s=><option key={s}>{s}</option>)}
                              </select>
                              {/* Fraud action */}
                              {c.isActive && c.isFraudFlagged && (
                                <button className="btn btn-sm btn-danger"
                                  style={{background:"var(--amber-lt)",color:"var(--amber)",borderColor:"#FDE68A"}}
                                  onClick={()=>setFraudModal(c)}>
                                  ⚠️ Fraud
                                </button>
                              )}
                              {/* Restore */}
                              {!c.isActive && (
                                <button className="btn btn-sm btn-success" onClick={()=>handleRestore(c._id)}>
                                  ♻️ Restore
                                </button>
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
          {tab==="analytics"&&(
            analytics?(
              <>
                <div className="metrics-grid">
                  {[["Total",analytics.total,"Registered",""],["Active",analytics.active,"Active now","mc-up"],["Avg ATS",analytics.avgScore,"Platform avg",""],["Fraud",analytics.flagged,"Flagged","mc-dn"]].map(([l,v,s,cls])=>(
                    <div className="mc" key={l}><div className="mc-label">{l}</div>
                      <div className="mc-value" style={{color:cls==="mc-dn"&&v>0?"var(--red)":undefined}}>{v}</div>
                      <div className={"mc-sub "+cls}>{s}</div></div>
                  ))}
                </div>
                <div className="grid-2" style={{marginBottom:18}}>
                  <div className="card">
                    <div className="card-hd"><span className="card-title">ATS Score Distribution</span></div>
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
                  </div>
                  <div className="card">
                    <div className="card-hd"><span className="card-title">Monthly Registrations</span></div>
                    {barData.length>0?(
                      <ResponsiveContainer width="100%" height={180}>
                        <BarChart data={barData} margin={{top:0,right:0,left:-20,bottom:0}}>
                          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)"/>
                          <XAxis dataKey="name" tick={{fontSize:11,fill:"var(--muted)"}}/>
                          <YAxis tick={{fontSize:11,fill:"var(--muted)"}}/>
                          <Tooltip/>
                          <Bar dataKey="count" fill="var(--blue)" radius={[4,4,0,0]}/>
                        </BarChart>
                      </ResponsiveContainer>
                    ):<div style={{textAlign:"center",padding:40,color:"var(--muted)"}}>No data yet</div>}
                  </div>
                </div>
                <div className="card">
                  <div className="card-hd"><span className="card-title">Pipeline Summary</span></div>
                  <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(120px,1fr))",gap:12}}>
                    {[["New",rankings.filter(u=>u.status==="New").length,"#94A3B8"],
                      ["Active",rankings.filter(u=>u.status==="Active").length,"#1B5EEA"],
                      ["Shortlisted",rankings.filter(u=>u.status==="Shortlisted").length,"#059669"],
                      ["Rejected",rankings.filter(u=>u.status==="Rejected").length,"#DC2626"],
                      ["Flagged",rankings.filter(u=>u.isFraudFlagged).length,"#D97706"]].map(([l,v,c])=>(
                      <div key={l} style={{textAlign:"center",padding:16,background:"var(--bg)",borderRadius:"var(--r12)",border:"1px solid var(--border)"}}>
                        <div style={{fontFamily:"Fraunces,serif",fontSize:28,fontWeight:700,color:c}}>{v}</div>
                        <div style={{fontSize:12,color:"var(--muted)",fontWeight:600,marginTop:4}}>{l}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            ):<div style={{textAlign:"center",padding:60}}><div className="spinner" style={{margin:"0 auto"}}></div></div>
          )}

          {/* ── ALERTS — real data, fraud escalation to superadmin ── */}
          {tab==="interviews"&&(
            <div>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20,flexWrap:"wrap",gap:12}}>
                <div>
                  <h2 style={{fontFamily:"Fraunces,serif",fontSize:22,fontWeight:700,marginBottom:4}}>Interview Pipeline</h2>
                  <p style={{fontSize:14,color:"var(--muted)"}}>{interviews.length} total · {interviews.filter(i=>i.status==="Scheduled").length} upcoming · {interviews.filter(i=>i.outcome==="Hired").length} hired</p>
                </div>
                <button className="btn btn-outline btn-sm" onClick={loadInterviews}>↺ Refresh</button>
              </div>

              {/* Pipeline summary */}
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))",gap:12,marginBottom:20}}>
                {[
                  ["📅","Scheduled",  interviews.filter(i=>i.status==="Scheduled").length,  "#1B5EEA","#EFF4FF","#BFCFFD"],
                  ["✅","Completed",  interviews.filter(i=>i.status==="Completed").length,   "#059669","#ECFDF5","#6EE7B7"],
                  ["🎊","Hired",      interviews.filter(i=>i.outcome==="Hired").length,      "#7C3AED","#F5F3FF","#C4B5FD"],
                  ["❌","Rejected",   interviews.filter(i=>i.outcome==="Rejected").length,   "#DC2626","#FEF2F2","#FECACA"],
                  ["🔁","Rescheduled",interviews.filter(i=>i.status==="Rescheduled").length, "#D97706","#FFFBEB","#FDE68A"],
                ].map(([icon,label,count,color,bg,border])=>(
                  <div key={label} style={{background:bg,border:`1px solid ${border}`,borderRadius:"var(--r16)",padding:"16px 18px",textAlign:"center"}}>
                    <div style={{fontSize:22,marginBottom:4}}>{icon}</div>
                    <div style={{fontFamily:"Fraunces,serif",fontSize:26,fontWeight:700,color,lineHeight:1}}>{count}</div>
                    <div style={{fontSize:12,color,fontWeight:600,marginTop:4}}>{label}</div>
                  </div>
                ))}
              </div>

              {interviewLoading ? (
                <div style={{textAlign:"center",padding:"60px 24px"}}><div className="spinner"></div></div>
              ) : interviews.length === 0 ? (
                <div className="card" style={{textAlign:"center",padding:"60px 24px"}}>
                  <div style={{fontSize:48,marginBottom:16}}>📅</div>
                  <h3 style={{fontSize:17,marginBottom:8}}>No interviews scheduled yet</h3>
                  <p style={{color:"var(--muted)",fontSize:14,marginBottom:20}}>Shortlist a candidate and click "📅 Schedule" to get started.</p>
                  <button className="btn btn-outline" onClick={()=>setTab("candidates")}>Go to Candidates →</button>
                </div>
              ) : (
                <div style={{display:"flex",flexDirection:"column",gap:12}}>
                  {interviews.map(iv=>{
                    const c = iv.candidate || {};
                    const isPast = new Date(iv.date) < new Date();
                    const statusColor = iv.status==="Scheduled"?"#1B5EEA":iv.status==="Completed"?"#059669":iv.status==="Rescheduled"?"#D97706":"#DC2626";
                    const outcomeColor = iv.outcome==="Hired"?"#059669":iv.outcome==="Rejected"?"#DC2626":iv.outcome==="Next Round"?"#7C3AED":"#94A3B8";
                    return (
                      <div key={iv._id} className="card" style={{padding:0,overflow:"hidden",border:`1.5px solid ${iv.outcome==="Hired"?"#6EE7B7":iv.outcome==="Rejected"?"#FECACA":"var(--border)"}`}}>
                        {/* Top bar */}
                        <div style={{height:4,background:iv.outcome==="Hired"?"#059669":iv.outcome==="Rejected"?"#DC2626":iv.status==="Scheduled"?"#1B5EEA":"#D97706"}}></div>
                        <div style={{padding:"18px 24px",display:"flex",alignItems:"center",gap:16,flexWrap:"wrap"}}>
                          {/* Avatar */}
                          <div className={`avatar ${AVC[0]}`} style={{width:42,height:42,fontSize:14,flexShrink:0}}>{initials(c.name||"?")}</div>
                          {/* Candidate info */}
                          <div style={{flex:1,minWidth:160}}>
                            <div style={{fontWeight:700,fontSize:15}}>{c.name||"Unknown"}</div>
                            <div style={{fontSize:12,color:"var(--muted)"}}>{c.email}</div>
                            <div style={{fontSize:12,color:"var(--muted)",marginTop:2}}>
                              {iv.jobTitle} · <span style={{fontWeight:600,color:"#7C3AED"}}>{iv.round}</span>
                            </div>
                          </div>
                          {/* Date/time */}
                          <div style={{textAlign:"center",minWidth:110}}>
                            <div style={{fontSize:13,fontWeight:700,color:isPast&&iv.status==="Scheduled"?"#DC2626":"var(--text)"}}>
                              {new Date(iv.date).toLocaleDateString("en-IN",{day:"numeric",month:"short",year:"numeric"})}
                            </div>
                            <div style={{fontSize:12,color:"var(--muted)"}}>
                              {new Date(iv.date).toLocaleTimeString("en-IN",{hour:"2-digit",minute:"2-digit"})}
                            </div>
                            <div style={{fontSize:11,color:"var(--muted)",marginTop:2}}>
                              {iv.mode==="Video Call"?"💻":iv.mode==="Phone"?"📞":"🏢"} {iv.mode}
                            </div>
                          </div>
                          {/* Status + outcome */}
                          <div style={{display:"flex",flexDirection:"column",gap:5,alignItems:"flex-end"}}>
                            <span style={{background:`${statusColor}18`,color:statusColor,borderRadius:20,padding:"3px 10px",fontSize:12,fontWeight:700}}>{iv.status}</span>
                            {iv.outcome!=="Pending" && (
                              <span style={{background:`${outcomeColor}18`,color:outcomeColor,borderRadius:20,padding:"3px 10px",fontSize:12,fontWeight:700}}>{iv.outcome==="Hired"?"🎊 "+iv.outcome:iv.outcome==="Rejected"?"❌ "+iv.outcome:"🔁 "+iv.outcome}</span>
                            )}
                          </div>
                          {/* Actions */}
                          <div style={{display:"flex",gap:6,flexWrap:"wrap",justifyContent:"flex-end"}}>
                            {iv.status==="Scheduled" && iv.outcome==="Pending" && (
                              <>
                                <button className="btn btn-sm btn-success" onClick={()=>{setOutcomeModal(iv);setOutcomeForm({outcome:"Hired",offerDetails:"",notes:""});}}>
                                  Record Outcome
                                </button>
                                <button className="btn btn-sm btn-outline" onClick={()=>{setRescheduleModal(iv);setRescheduleForm({date:"",time:"",mode:iv.mode,location:iv.location||"",notes:""});}}>
                                  📅 Reschedule
                                </button>
                              </>
                            )}
                            {iv.outcome==="Next Round" && (
                              <button className="btn btn-sm" style={{background:"#F5F3FF",color:"#7C3AED",border:"1px solid #C4B5FD"}}
                                onClick={()=>{ setScheduleModal(iv.candidate); setScheduleForm(f=>({...f,jobTitle:iv.jobTitle,round:"Technical Round"})); }}>
                                📅 Schedule Next
                              </button>
                            )}
                          </div>
                        </div>
                        {/* Notes strip */}
                        {(iv.notes||iv.location) && (
                          <div style={{padding:"8px 24px 12px",borderTop:"1px solid var(--border)",display:"flex",gap:16,fontSize:12.5,color:"var(--muted)",flexWrap:"wrap"}}>
                            {iv.location && <span>📍 {iv.location}</span>}
                            {iv.notes    && <span>📝 {iv.notes}</span>}
                            {iv.offerDetails && <span style={{color:"#059669",fontWeight:600}}>💼 {iv.offerDetails}</span>}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {tab==="alerts"&&(
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
                    onClick={()=>{loadRankings();loadAnalytics();showToast("Refreshed");}}>
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
                      <div key={alert.id} style={{background:ac.bg,border:`1px solid ${ac.border}`,borderRadius:"var(--r16)",padding:"18px 20px",display:"flex",alignItems:"flex-start",gap:14,opacity:alert.read?.8:1,transition:".2s",position:"relative"}}>
                        {!alert.read&&<div style={{position:"absolute",top:14,right:14,width:8,height:8,borderRadius:"50%",background:"var(--red)"}}></div>}
                        <div style={{fontSize:24,flexShrink:0,marginTop:2}}>{ac.icon}</div>
                        <div style={{flex:1}}>
                          <div style={{display:"flex",justifyContent:"space-between",gap:8,flexWrap:"wrap",marginBottom:4}}>
                            <div style={{fontWeight:700,fontSize:14.5,color:ac.color}}>{alert.title}</div>
                            <span style={{fontSize:12,color:"var(--muted)",flexShrink:0}}>{alert.time}</span>
                          </div>
                          <div style={{fontSize:13.5,color:"var(--text)",marginBottom:14,lineHeight:1.6}}>{alert.message}</div>

                          {/* Alert-specific actions */}
                          <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                            {alert.type==="fraud" && alert.candidate && (
                              <>
                                <button className="btn btn-sm"
                                  style={{background:"var(--amber-lt)",color:"var(--amber)",border:"1px solid #FDE68A"}}
                                  onClick={()=>{ markRead(alert.id); setFraudModal(alert.candidate); setTab("candidates"); }}>
                                  🔔 Flag for Super Admin
                                </button>
                                <button className="btn btn-sm btn-outline"
                                  onClick={()=>{ markRead(alert.id); setTab("candidates"); setStatusFilter("Flagged"); }}>
                                  View in Candidates
                                </button>
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
                            <button className="btn btn-sm btn-ghost" onClick={()=>dismissAlert(alert.id)}>Dismiss</button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Quick stats */}
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

      {/* Fraud detail modal */}
      {fraudModal && (
        <FraudDetailModal
          candidate={fraudModal}
          onClose={()=>setFraudModal(null)}
          onFlagSuperAdmin={handleFlagSuperAdmin}
          onFlagBan={handleFlagBan}
        />
      )}

      {/* Add candidate modal */}
      {modal==="add"&&(
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

      {/* ── Schedule Interview Modal ── */}
      {scheduleModal && (
        <div className="modal-overlay" onClick={e=>{if(e.target===e.currentTarget)setScheduleModal(null)}}>
          <div className="modal-box" style={{maxWidth:520}}>
            <div className="modal-hd">
              <span className="modal-title">📅 Schedule Interview — {scheduleModal.name}</span>
              <button className="btn btn-ghost btn-sm" onClick={()=>setScheduleModal(null)}>✕</button>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:4}}>
              <div className="form-group">
                <label className="form-label">Date *</label>
                <input className="form-input" type="date" min={new Date().toISOString().split("T")[0]}
                  value={scheduleForm.date} onChange={e=>setScheduleForm(f=>({...f,date:e.target.value}))}/>
              </div>
              <div className="form-group">
                <label className="form-label">Time *</label>
                <input className="form-input" type="time"
                  value={scheduleForm.time} onChange={e=>setScheduleForm(f=>({...f,time:e.target.value}))}/>
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Job Title</label>
              <input className="form-input" placeholder="e.g. Backend Developer"
                value={scheduleForm.jobTitle} onChange={e=>setScheduleForm(f=>({...f,jobTitle:e.target.value}))}/>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
              <div className="form-group">
                <label className="form-label">Round</label>
                <select className="form-select" value={scheduleForm.round} onChange={e=>setScheduleForm(f=>({...f,round:e.target.value}))}>
                  {["HR Round","Technical Round","Managerial Round","Final Round"].map(r=><option key={r}>{r}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Mode</label>
                <select className="form-select" value={scheduleForm.mode} onChange={e=>setScheduleForm(f=>({...f,mode:e.target.value}))}>
                  {["Video Call","In-Person","Phone"].map(m=><option key={m}>{m}</option>)}
                </select>
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">{scheduleForm.mode==="Video Call"?"Meet Link / Platform":"Location / Room"}</label>
              <input className="form-input" placeholder={scheduleForm.mode==="Video Call"?"https://meet.google.com/...":"Conference Room B"}
                value={scheduleForm.location} onChange={e=>setScheduleForm(f=>({...f,location:e.target.value}))}/>
            </div>
            <div className="form-group">
              <label className="form-label">Notes for Candidate</label>
              <textarea className="form-input" rows={2} placeholder="Any instructions or prep tips..."
                value={scheduleForm.notes} onChange={e=>setScheduleForm(f=>({...f,notes:e.target.value}))}/>
            </div>
            <div style={{background:"#EFF4FF",borderRadius:"var(--r8)",padding:"10px 14px",fontSize:13,color:"#1347C4",marginBottom:16}}>
              📧 An interview confirmation email will be sent automatically to <strong>{scheduleModal.email}</strong>
            </div>
            <div style={{display:"flex",gap:10,justifyContent:"flex-end"}}>
              <button className="btn btn-ghost" onClick={()=>setScheduleModal(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleScheduleInterview} disabled={interviewSaving}>
                {interviewSaving?"Scheduling...":"📅 Schedule & Send Email"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Record Outcome Modal ── */}
      {outcomeModal && (
        <div className="modal-overlay" onClick={e=>{if(e.target===e.currentTarget)setOutcomeModal(null)}}>
          <div className="modal-box" style={{maxWidth:500}}>
            <div className="modal-hd">
              <span className="modal-title">Record Interview Outcome</span>
              <button className="btn btn-ghost btn-sm" onClick={()=>setOutcomeModal(null)}>✕</button>
            </div>
            <div style={{background:"var(--bg)",borderRadius:"var(--r8)",padding:"12px 16px",marginBottom:16,fontSize:13}}>
              <strong>{outcomeModal.candidate?.name}</strong> · {outcomeModal.round} · {outcomeModal.jobTitle}
            </div>
            <div className="form-group">
              <label className="form-label">Outcome *</label>
              <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
                {[["Hired","🎊","#059669","#ECFDF5","#6EE7B7"],["Rejected","❌","#DC2626","#FEF2F2","#FECACA"],["Next Round","🔁","#7C3AED","#F5F3FF","#C4B5FD"]].map(([val,icon,color,bg,border])=>(
                  <button key={val}
                    onClick={()=>setOutcomeForm(f=>({...f,outcome:val}))}
                    style={{flex:1,padding:"14px 10px",borderRadius:"var(--r12)",border:`2px solid ${outcomeForm.outcome===val?color:border}`,background:outcomeForm.outcome===val?bg:"var(--card)",color,fontWeight:700,fontSize:14,cursor:"pointer",transition:".15s"}}>
                    {icon} {val}
                  </button>
                ))}
              </div>
            </div>
            {outcomeForm.outcome==="Hired" && (
              <div className="form-group">
                <label className="form-label">Offer Details (salary, joining date, etc.)</label>
                <textarea className="form-input" rows={3} placeholder={"e.g.\nRole: Backend Developer\nSalary: ₹8 LPA\nJoining Date: 1st June 2026\nLocation: Hyderabad (Hybrid)"}
                  value={outcomeForm.offerDetails} onChange={e=>setOutcomeForm(f=>({...f,offerDetails:e.target.value}))}/>
              </div>
            )}
            <div className="form-group">
              <label className="form-label">{outcomeForm.outcome==="Rejected"?"Feedback for Candidate":"Additional Note"}</label>
              <textarea className="form-input" rows={2} placeholder={outcomeForm.outcome==="Rejected"?"Constructive feedback to include in the rejection email...":"Any notes..."}
                value={outcomeForm.notes} onChange={e=>setOutcomeForm(f=>({...f,notes:e.target.value}))}/>
            </div>
            <div style={{background:outcomeForm.outcome==="Hired"?"#ECFDF5":outcomeForm.outcome==="Rejected"?"#FEF2F2":"#F5F3FF",borderRadius:"var(--r8)",padding:"10px 14px",fontSize:13,color:outcomeForm.outcome==="Hired"?"#065F46":outcomeForm.outcome==="Rejected"?"#991B1B":"#4C1D95",marginBottom:16}}>
              📧 {outcomeForm.outcome==="Hired"?"An offer letter will be emailed to the candidate.":outcomeForm.outcome==="Rejected"?"A professional rejection email will be sent.":"A 'next round' notification email will be sent."}
            </div>
            <div style={{display:"flex",gap:10,justifyContent:"flex-end"}}>
              <button className="btn btn-ghost" onClick={()=>setOutcomeModal(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleRecordOutcome} disabled={interviewSaving}>
                {interviewSaving?"Saving...":outcomeForm.outcome==="Hired"?"🎊 Confirm & Send Offer":outcomeForm.outcome==="Rejected"?"❌ Confirm & Send Rejection":"🔁 Confirm & Advance"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Reschedule Modal ── */}
      {rescheduleModal && (
        <div className="modal-overlay" onClick={e=>{if(e.target===e.currentTarget)setRescheduleModal(null)}}>
          <div className="modal-box" style={{maxWidth:460}}>
            <div className="modal-hd">
              <span className="modal-title">📅 Reschedule Interview</span>
              <button className="btn btn-ghost btn-sm" onClick={()=>setRescheduleModal(null)}>✕</button>
            </div>
            <div style={{background:"var(--bg)",borderRadius:"var(--r8)",padding:"10px 14px",marginBottom:14,fontSize:13}}>
              <strong>{rescheduleModal.candidate?.name}</strong> · {rescheduleModal.round}
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
              <div className="form-group">
                <label className="form-label">New Date *</label>
                <input className="form-input" type="date" min={new Date().toISOString().split("T")[0]}
                  value={rescheduleForm.date} onChange={e=>setRescheduleForm(f=>({...f,date:e.target.value}))}/>
              </div>
              <div className="form-group">
                <label className="form-label">New Time *</label>
                <input className="form-input" type="time"
                  value={rescheduleForm.time} onChange={e=>setRescheduleForm(f=>({...f,time:e.target.value}))}/>
              </div>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
              <div className="form-group">
                <label className="form-label">Mode</label>
                <select className="form-select" value={rescheduleForm.mode} onChange={e=>setRescheduleForm(f=>({...f,mode:e.target.value}))}>
                  {["Video Call","In-Person","Phone"].map(m=><option key={m}>{m}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Location / Link</label>
                <input className="form-input" placeholder="Meet link or room"
                  value={rescheduleForm.location} onChange={e=>setRescheduleForm(f=>({...f,location:e.target.value}))}/>
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Reason / Note</label>
              <textarea className="form-input" rows={2} placeholder="Reason for rescheduling (optional)..."
                value={rescheduleForm.notes} onChange={e=>setRescheduleForm(f=>({...f,notes:e.target.value}))}/>
            </div>
            <div style={{background:"#EFF4FF",borderRadius:"var(--r8)",padding:"10px 14px",fontSize:13,color:"#1347C4",marginBottom:16}}>
              📧 A reschedule notification email will be sent to the candidate.
            </div>
            <div style={{display:"flex",gap:10,justifyContent:"flex-end"}}>
              <button className="btn btn-ghost" onClick={()=>setRescheduleModal(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleReschedule} disabled={interviewSaving}>
                {interviewSaving?"Saving...":"📅 Reschedule & Notify"}
              </button>
            </div>
          </div>
        </div>
      )}

      {toast&&(
        <div className={`toast ${toastType==="error"?"toast-error":toastType==="info"?"":""}`}>
          {toast}
        </div>
      )}
    </div>
  );
}