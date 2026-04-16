/* eslint-disable */
import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { adminAPI, superAdminAPI } from "../utils/api";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";

function initials(n=""){ return n.split(" ").map(w=>w[0]).join("").toUpperCase().slice(0,2); }
function scColor(s){ return s>=80?"#059669":s>=60?"#1B5EEA":s>=40?"#D97706":"#DC2626"; }
const AVC=["av-blue","av-green","av-indigo","av-amber","av-red","av-purple"];
const MONTHS=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function StatusTag({s}){
  const m={Shortlisted:"tag-green",Active:"tag-blue",New:"tag-amber",Flagged:"tag-red",Banned:"tag-red",Rejected:"tag-gray","Under Review":"tag-amber",Pending:"tag-amber"};
  return <span className={"tag "+(m[s]||"tag-gray")}>{s||"—"}</span>;
}

export default function SuperAdminDashboard() {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  const [tab, setTab]                   = useState("alerts");
  const [candidates, setCandidates]     = useState([]);
  const [alerts, setAlerts]             = useState([]);
  const [unreadCount, setUnreadCount]   = useState(0);
  const [analytics, setAnalytics]       = useState(null);
  const [loading, setLoading]           = useState(false);
  const [alertsLoading, setAlertsLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch]             = useState("");
  const [toast, setToast]               = useState("");
  const [toastType, setToastType]       = useState("success");
  const [sidebarOpen, setSidebarOpen]   = useState(false);
  const [confirmModal, setConfirmModal] = useState(null);
  const [detailModal, setDetailModal]   = useState(null);
  const [decisionNote, setDecisionNote] = useState("");

  const showToast = (msg, type="success") => {
    setToast(msg); setToastType(type);
    setTimeout(()=>setToast(""), 3500);
  };

  // ── Load fraud_flag alerts sent by HR ─────────────────────────────────────
  const loadAlerts = useCallback(async () => {
    setAlertsLoading(true);
    try {
      const res = await superAdminAPI.getAlerts();
      const all = res.data.alerts || [];
      // Super Admin sees only fraud_flag alerts (escalated by HR)
      const fraudAlerts = all.filter(a => a.type === "fraud_flag");
      setAlerts(fraudAlerts);
      setUnreadCount(fraudAlerts.filter(a => !a.isRead).length);
    } catch(err) {
      showToast("Failed to load alerts", "error");
    } finally { setAlertsLoading(false); }
  }, []);

  const loadCandidates = useCallback(async () => {
    setLoading(true);
    try {
      const [candRes, analyticsRes] = await Promise.all([
        adminAPI.getCandidates({ limit: 200 }),
        superAdminAPI.getAnalytics(),
      ]);
      setCandidates(candRes.data.users || []);
      if (analyticsRes.data.analytics) setAnalytics(analyticsRes.data.analytics);
    } catch(err) {
      showToast("Failed to load candidates", "error");
    } finally { setLoading(false); }
  }, []);

  useEffect(() => {
    loadAlerts();
    loadCandidates();
    // Poll every 30s for new HR escalations
    const interval = setInterval(loadAlerts, 30000);
    return () => clearInterval(interval);
  }, [loadAlerts, loadCandidates]);

  const filtered = candidates.filter(c => {
    const matchStatus = statusFilter === "all" || c.status === statusFilter || (statusFilter === "Flagged" && c.isFraudFlagged);
    const matchSearch = !search || c.name?.toLowerCase().includes(search.toLowerCase()) || c.email?.toLowerCase().includes(search.toLowerCase());
    return matchStatus && matchSearch;
  });

  const flaggedCandidates = candidates.filter(c => c.isFraudFlagged || c.status === "Flagged");

  // ── Mark alert as read ────────────────────────────────────────────────────
  const markRead = async (alertId) => {
    try { await superAdminAPI.markAlertRead(alertId); } catch {}
    setAlerts(prev => prev.map(a => a._id === alertId ? {...a, isRead: true} : a));
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  // ── Super Admin decision: ban or clear — notifies HR via superadmin_decision alert ──
  const handleDecide = async (action) => {
    if (!confirmModal) return;
    const { alertItem } = confirmModal;
    const userId = alertItem?.targetUser?._id;
    if (!userId) { showToast("Cannot find user", "error"); return; }
    try {
      // This API call should:
      // 1. Ban/restore the user
      // 2. Create an Alert { type: "superadmin_decision", targetUser: userId, title, message } for HR
      await superAdminAPI.decideOnFlag(userId, {
        action,
        reason: decisionNote,
        alertId: alertItem._id,  // original fraud_flag alert to close
      });
      // Mark the source fraud_flag alert as read/resolved
      if (alertItem._id) await superAdminAPI.markAlertRead(alertItem._id);

      showToast(
        action === "ban"
          ? "🚫 User banned — HR has been notified and must take final action"
          : "✅ Flag cleared — HR has been notified and will shortlist or reject"
      );
      setConfirmModal(null);
      setDecisionNote("");
      loadAlerts();
      loadCandidates();
    } catch(err) {
      showToast("Action failed: " + (err.response?.data?.message || err.message), "error");
    }
  };

  // ── Direct ban/restore from Candidates tab ────────────────────────────────
  const handleDirectBan = async (id) => {
    try {
      await superAdminAPI.banUser(id, { reason: "Banned by Super Admin" });
      showToast("🚫 User banned");
      loadCandidates();
    } catch { showToast("Action failed","error"); }
  };

  const handleRestore = async (id) => {
    try {
      await superAdminAPI.restoreUser(id);
      showToast("✅ User restored");
      loadCandidates();
    } catch { showToast("Action failed","error"); }
  };

  const pieData = analytics ? [
    {name:"Active",      value:analytics.users?.active||0,  color:"#059669"},
    {name:"Fraud Flagged",value:analytics.users?.fraud||0,  color:"#DC2626"},
    {name:"Banned",      value:analytics.users?.banned||0,  color:"#9CA3AF"},
    {name:"Admins",      value:analytics.users?.admins||0,  color:"#1B5EEA"},
  ].filter(p=>p.value>0) : [];
  const barData = analytics?.monthly?.map(m=>({name:MONTHS[m._id.month-1],count:m.count}))||[];

  const tabs = [
    { id:"alerts",     icon:"🚨", label:"Fraud Alerts",   badge: unreadCount },
    { id:"candidates", icon:"👥", label:"All Candidates" },
    { id:"analytics",  icon:"📈", label:"Analytics" },
  ];

  return (
    <div className="dash-layout">
      {sidebarOpen && <div className="sidebar-overlay" onClick={()=>setSidebarOpen(false)}></div>}

      <div className={"sidebar"+(sidebarOpen?" sidebar-open":"")}>
        <div className="sb-logo">
          <div className="sb-logo-inner">
            <div className="sb-logo-dot" style={{background:"var(--red)"}}></div>HireIQ
          </div>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <span className="admin-badge" style={{background:"#FEF2F2",color:"#B91C1C",border:"1px solid #FECACA"}}>Super Admin</span>
            <button className="sidebar-close" onClick={()=>setSidebarOpen(false)}>✕</button>
          </div>
        </div>

        <div className="sb-section">
          <span className="sb-sect-lbl">Dashboard</span>
          {tabs.map(t=>(
            <button key={t.id} className={"sb-item"+(tab===t.id?" active":"")}
              onClick={()=>{setTab(t.id);setSidebarOpen(false);}}>
              <span className="sb-icon">{t.icon}</span>{t.label}
              {t.badge>0 && <span className="sb-badge" style={{background:"var(--red)"}}>{t.badge}</span>}
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
            <strong style={{color:"var(--text)"}}>Super Admin</strong> — review HR fraud flags, ban or clear candidates. Your decision is sent back to HR who makes the final shortlist/reject call.
          </div>
        </div>
      </div>

      <div className="dash-main">
        <div className="topbar">
          <button className="hamburger topbar-hamburger" onClick={()=>setSidebarOpen(true)}>☰</button>
          <div className="topbar-title">{tabs.find(t=>t.id===tab)?.label||"Dashboard"}</div>
          <div className="topbar-right">
            {tab==="candidates" && (
              <div className="search-wrap">
                <span className="search-icon">🔍</span>
                <input className="search-input" placeholder="Search..." value={search}
                  onChange={e=>setSearch(e.target.value)}/>
              </div>
            )}
            <div className="user-chip">
              <div className="avatar" style={{width:28,height:28,fontSize:11,background:"#B91C1C",color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",borderRadius:"50%",fontWeight:700}}>
                {initials(user?.name)}
              </div>
              <span className="chip-name chip-name-hide">SA</span>
            </div>
          </div>
        </div>

        <div className="content fade-in">

          {/* ── FRAUD ALERTS ── */}
          {tab==="alerts" && (
            <div>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20,flexWrap:"wrap",gap:12}}>
                <div>
                  <h2 style={{fontFamily:"Fraunces,serif",fontSize:22,fontWeight:700,marginBottom:4}}>Fraud Alerts from HR</h2>
                  <p style={{fontSize:14,color:"var(--muted)"}}>
                    Review flags sent by HR admins. Your decision (ban/clear) is sent back to HR who makes the final hiring call.
                  </p>
                </div>
                <button className="btn btn-outline btn-sm" onClick={()=>{loadAlerts();showToast("Refreshed");}}>↺ Refresh</button>
              </div>

              {/* Flow explanation banner */}
              <div style={{
                background:"#FFFBEB", border:"1px solid #FDE68A", borderRadius:"var(--r12)",
                padding:"12px 16px", marginBottom:20, fontSize:13, color:"#92400E", lineHeight:1.7
              }}>
                <strong>Workflow:</strong> HR flags a suspect resume → You review and decide →
                Your decision is sent back to HR → <strong>HR makes the final shortlist/reject decision.</strong>
              </div>

              {alertsLoading ? (
                <div style={{textAlign:"center",padding:60}}><div className="spinner" style={{margin:"0 auto"}}></div></div>
              ) : alerts.length === 0 ? (
                <div className="card" style={{textAlign:"center",padding:"60px 24px"}}>
                  <div style={{fontSize:48,marginBottom:16}}>✅</div>
                  <h3 style={{fontSize:18,marginBottom:8,fontFamily:"Fraunces,serif"}}>No Fraud Alerts</h3>
                  <p style={{color:"var(--muted)",fontSize:14}}>No candidates have been flagged by HR admins yet.</p>
                </div>
              ) : (
                <div style={{display:"flex",flexDirection:"column",gap:14}}>
                  {alerts.map((alert,i)=>{
                    const c = alert.targetUser || {};
                    const isUnread = !alert.isRead;
                    return (
                      <div key={alert._id||i}
                        style={{
                          background: isUnread ? "#FEF2F2" : "#fff",
                          border:`1px solid ${isUnread ? "#FECACA" : "var(--border)"}`,
                          borderRadius:"var(--r16)", padding:"20px 24px", transition:"background .3s"
                        }}>
                        <div style={{display:"flex",alignItems:"flex-start",gap:16,flexWrap:"wrap"}}>
                          <div style={{fontSize:28,flexShrink:0}}>{isUnread?"🚨":"📋"}</div>
                          <div style={{flex:1,minWidth:200}}>
                            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:8,marginBottom:8,flexWrap:"wrap"}}>
                              <div>
                                <div style={{fontWeight:700,fontSize:16,color:"#B91C1C"}}>{c.name||"Unknown User"}</div>
                                <div style={{fontSize:13,color:"#64748B",marginTop:2}}>{c.email||""}</div>
                                <div style={{fontSize:11,color:"#94A3B8",marginTop:3}}>
                                  Flagged by HR on {new Date(alert.createdAt).toLocaleString()}
                                  {alert.createdBy?.name && ` · ${alert.createdBy.name}`}
                                </div>
                              </div>
                              <StatusTag s={c.status}/>
                            </div>

                            {/* Scores */}
                            {(c.fraudScore || c.lastAtsScore) && (
                              <div style={{display:"flex",gap:10,marginBottom:12}}>
                                {c.fraudScore != null && (
                                  <div style={{background:"#FEF2F2",borderRadius:"var(--r8)",padding:"8px 12px",textAlign:"center",minWidth:80}}>
                                    <div style={{fontFamily:"Fraunces,serif",fontSize:22,fontWeight:700,color:"#B91C1C"}}>{c.fraudScore}</div>
                                    <div style={{fontSize:10,color:"#9CA3AF",fontWeight:600}}>FRAUD /100</div>
                                  </div>
                                )}
                                {c.lastAtsScore != null && (
                                  <div style={{background:"#F0F9FF",borderRadius:"var(--r8)",padding:"8px 12px",textAlign:"center",minWidth:80}}>
                                    <div style={{fontFamily:"Fraunces,serif",fontSize:22,fontWeight:700,color:scColor(c.lastAtsScore)}}>{c.lastAtsScore}</div>
                                    <div style={{fontSize:10,color:"#9CA3AF",fontWeight:600}}>ATS /100</div>
                                  </div>
                                )}
                              </div>
                            )}

                            {/* HR's report */}
                            <div style={{background:"#fff",border:"1px solid #FECACA",borderRadius:"var(--r8)",padding:"12px 14px",marginBottom:14}}>
                              <div style={{fontSize:11,fontWeight:700,color:"#B91C1C",textTransform:"uppercase",letterSpacing:1,marginBottom:5}}>HR Admin's Report</div>
                              <div style={{fontSize:13.5,color:"#374151",lineHeight:1.65}}>{alert.message}</div>
                            </div>

                            {/* Decision buttons */}
                            <div style={{borderTop:"1px solid #FECACA",paddingTop:14,display:"flex",gap:10,flexWrap:"wrap",alignItems:"center"}}>
                              <span style={{fontSize:12,color:"#92400E",fontWeight:600}}>Your decision (sent to HR):</span>
                              <button className="btn btn-sm btn-danger"
                                onClick={()=>{if(isUnread)markRead(alert._id);setDecisionNote("");setConfirmModal({alertItem:alert,action:"ban"});}}>
                                🚫 Ban User
                              </button>
                              <button className="btn btn-sm btn-success"
                                onClick={()=>{if(isUnread)markRead(alert._id);setDecisionNote("");setConfirmModal({alertItem:alert,action:"clear"});}}>
                                ✅ Clear — Not Fraud
                              </button>
                              <button className="btn btn-sm btn-outline"
                                onClick={()=>{setDetailModal(c);if(isUnread)markRead(alert._id);}}>
                                👁 View Details
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ── ALL CANDIDATES ── */}
          {tab==="candidates" && (
            <>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14,flexWrap:"wrap",gap:10}}>
                <div className="chip-row">
                  {["all","New","Active","Shortlisted","Rejected","Flagged","Banned"].map(key=>(
                    <span key={key} className={"chip"+(statusFilter===key?" active":"")}
                      onClick={()=>setStatusFilter(key)}>
                      {key==="all"?"All":key}
                      {key==="Flagged"&&flaggedCandidates.length>0&&(
                        <span style={{marginLeft:5,background:"var(--red)",color:"#fff",fontSize:10,padding:"1px 5px",borderRadius:999}}>{flaggedCandidates.length}</span>
                      )}
                    </span>
                  ))}
                </div>
              </div>

              <div className="tbl-wrap">
                <div className="tbl-hd">
                  <span className="tbl-title">All Candidates ({filtered.length})</span>
                  <span style={{fontSize:12,color:"var(--muted)"}}>Super Admin — full control</span>
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
                        <tr><td colSpan={7} style={{textAlign:"center",padding:40}}><div className="spinner" style={{margin:"0 auto"}}></div></td></tr>
                      ):filtered.length===0?(
                        <tr><td colSpan={7} style={{textAlign:"center",padding:40,color:"var(--muted)"}}>No candidates found</td></tr>
                      ):filtered.map((c,i)=>(
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
                          <td style={{fontSize:12,color:"var(--muted)"}}>{new Date(c.createdAt).toLocaleDateString()}</td>
                          <td>
                            <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
                              <button className="btn btn-sm btn-ghost" onClick={()=>setDetailModal(c)}>👁</button>
                              {c.isActive!==false ? (
                                <button className="btn btn-sm btn-danger" onClick={()=>handleDirectBan(c._id)}>🚫 Ban</button>
                              ):(
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
            analytics?(
              <>
                <div className="metrics-grid">
                  {[
                    ["Total Users", analytics.users?.total||0, "Registered",""],
                    ["Active",      analytics.users?.active||0,"Active now","mc-up"],
                    ["Avg ATS",     analytics.avgScore||0,     "Platform avg",""],
                    ["Fraud Flagged",analytics.users?.fraud||0,"By HR","mc-dn"],
                  ].map(([l,v,s,cls])=>(
                    <div className="mc" key={l}><div className="mc-label">{l}</div>
                      <div className="mc-value" style={{color:cls==="mc-dn"&&v>0?"var(--red)":undefined}}>{v}</div>
                      <div className={"mc-sub "+cls}>{s}</div></div>
                  ))}
                </div>
                <div className="grid-2">
                  <div className="card">
                    <div className="card-hd"><span className="card-title">User Breakdown</span></div>
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
                          <Tooltip/><Bar dataKey="count" fill="#B91C1C" radius={[4,4,0,0]}/>
                        </BarChart>
                      </ResponsiveContainer>
                    ):<div style={{textAlign:"center",padding:40,color:"var(--muted)"}}>No data yet</div>}
                  </div>
                </div>
              </>
            ):<div style={{textAlign:"center",padding:60}}><div className="spinner" style={{margin:"0 auto"}}></div></div>
          )}

        </div>
      </div>

      {/* ── DECISION CONFIRM MODAL ── */}
      {confirmModal && (
        <div className="modal-overlay" onClick={e=>{if(e.target===e.currentTarget){setConfirmModal(null);setDecisionNote("");}}}>
          <div className="modal-box" style={{maxWidth:460}}>
            <div className="modal-hd">
              <span className="modal-title">
                {confirmModal.action==="ban"?"🚫 Confirm Ban":"✅ Confirm Clear"}
              </span>
              <button className="btn btn-ghost btn-sm" onClick={()=>{setConfirmModal(null);setDecisionNote("");}}>✕</button>
            </div>

            <div style={{fontSize:14,color:"var(--muted)",lineHeight:1.7,marginBottom:16}}>
              {confirmModal.action==="ban"
                ? <>You are about to <strong style={{color:"#B91C1C"}}>permanently ban</strong> <strong>{confirmModal.alertItem?.targetUser?.name}</strong>. <br/>HR will be notified and must make the final status decision.</>
                : <>You are clearing the fraud flag for <strong>{confirmModal.alertItem?.targetUser?.name}</strong>. <br/>They will be restored to <strong style={{color:"#059669"}}>Active</strong> and HR will decide whether to shortlist or reject.</>
              }
            </div>

            {/* Flow reminder */}
            <div style={{
              background:"#FFFBEB",border:"1px solid #FDE68A",borderRadius:"var(--r8)",
              padding:"10px 14px",fontSize:12.5,color:"#92400E",marginBottom:16,lineHeight:1.6
            }}>
              ⚡ Your decision will be sent as an alert to HR. <strong>HR will then shortlist or reject the candidate.</strong>
            </div>

            <div style={{marginBottom:16}}>
              <label style={{fontSize:13,fontWeight:600,display:"block",marginBottom:6}}>Decision note (sent to HR):</label>
              <textarea
                style={{width:"100%",padding:"8px 10px",borderRadius:"var(--r8)",border:"1px solid var(--border)",fontSize:13,resize:"vertical",minHeight:72,boxSizing:"border-box"}}
                placeholder={confirmModal.action==="ban"
                  ?"e.g. Verified duplicate resume and fabricated experience..."
                  :"e.g. Reviewed profile — legitimate candidate, credentials verified..."}
                value={decisionNote}
                onChange={e=>setDecisionNote(e.target.value)}
              />
            </div>

            <div style={{display:"flex",gap:10,justifyContent:"flex-end"}}>
              <button className="btn btn-ghost" onClick={()=>{setConfirmModal(null);setDecisionNote("");}}>Cancel</button>
              {confirmModal.action==="ban"?(
                <button className="btn btn-danger" onClick={()=>handleDecide("ban")}>🚫 Ban & Notify HR</button>
              ):(
                <button className="btn btn-success" onClick={()=>handleDecide("clear")}>✅ Clear & Notify HR</button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Detail modal ── */}
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

      {toast && (
        <div className={`toast${toastType==="error"?" toast-error":""}`}>{toast}</div>
      )}
    </div>
  );
}