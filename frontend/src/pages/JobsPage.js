/* eslint-disable */
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { jobsAPI, resumeAPI } from "../utils/api";

function scColor(s){ return s>=80?"#059669":s>=60?"#1B5EEA":s>=40?"#D97706":"#DC2626"; }
function initials(n=""){ return n.split(" ").map(w=>w[0]).join("").toUpperCase().slice(0,2); }

function JobCard({ job, onApply, myApplications }) {
  const applied = myApplications.some(a => a.job?._id === job._id || a.job === job._id);
  const daysLeft = job.deadline ? Math.ceil((new Date(job.deadline) - new Date()) / (1000*60*60*24)) : null;

  return (
    <div className="card" style={{transition:".2s",cursor:"default"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:14,flexWrap:"wrap",gap:8}}>
        <div>
          <div style={{fontFamily:"Fraunces,serif",fontSize:17,fontWeight:700,marginBottom:6}}>{job.title}</div>
          <div style={{display:"flex",gap:7,flexWrap:"wrap"}}>
            <span className="tag tag-indigo">{job.department}</span>
            <span className="tag tag-gray">📍 {job.location}</span>
            <span className="tag tag-gray">⏱ {job.type}</span>
            <span className="tag tag-green">💰 {job.salary}</span>
          </div>
        </div>
        <div style={{textAlign:"right",flexShrink:0}}>
          {daysLeft!==null&&(
            <div style={{fontSize:12,color:daysLeft<7?"var(--red)":"var(--muted)",fontWeight:600,marginBottom:4}}>
              {daysLeft>0?`${daysLeft} days left`:"Deadline passed"}
            </div>
          )}
          <div style={{fontSize:12,color:"var(--muted)"}}>{job.applicants||0} applicant{job.applicants!==1?"s":""}</div>
        </div>
      </div>

      <p style={{fontSize:13.5,color:"var(--muted)",lineHeight:1.65,marginBottom:14}}>
        {job.description.slice(0,180)}{job.description.length>180?"...":""}
      </p>

      {job.skills?.length>0&&(
        <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:16}}>
          {job.skills.slice(0,6).map(s=><span key={s} className="tag tag-blue" style={{fontSize:11.5}}>{s}</span>)}
          {job.skills.length>6&&<span className="tag tag-gray" style={{fontSize:11.5}}>+{job.skills.length-6} more</span>}
        </div>
      )}

      <div style={{display:"flex",gap:10,justifyContent:"flex-end",borderTop:"1px solid var(--border)",paddingTop:14}}>
        <button className="btn btn-outline btn-sm" onClick={()=>onApply(job,"details")}>View Details</button>
        {applied
          ? <button className="btn btn-success btn-sm" disabled>✓ Applied</button>
          : <button className="btn btn-primary btn-sm" onClick={()=>onApply(job,"apply")}>Apply Now →</button>
        }
      </div>
    </div>
  );
}

export default function JobsPage() {
  const { user } = useAuth();
  const nav = useNavigate();
  const [jobs, setJobs]               = useState([]);
  const [myApps, setMyApps]           = useState([]);
  const [resumes, setResumes]         = useState([]);
  const [loading, setLoading]         = useState(true);
  const [search, setSearch]           = useState("");
  const [typeFilter, setTypeFilter]   = useState("all");
  const [tab, setTab]                 = useState("browse");
  const [selectedJob, setSelectedJob] = useState(null);
  const [modalMode, setModalMode]     = useState(null);
  const [applying, setApplying]       = useState(false);
  const [toast, setToast]             = useState("");
  const [applyForm, setApplyForm]     = useState({
    resumeId:"", coverLetter:"", phone: user?.phone||"", location: user?.location||"", linkedIn: user?.linkedIn||"", github: user?.github||""
  });

  const showToast = msg => { setToast(msg); setTimeout(()=>setToast(""),3500); };

  const load = async () => {
    setLoading(true);
    try {
      const [jobsRes, appsRes, resumesRes] = await Promise.all([
        jobsAPI.getAll(), jobsAPI.myApplications(), resumeAPI.getAll()
      ]);
      setJobs(jobsRes.data.jobs);
      setMyApps(appsRes.data.applications);
      setResumes(resumesRes.data.resumes.filter(r=>r.analysisStatus==="complete"));
    } catch {}
    finally { setLoading(false); }
  };

  useEffect(()=>{ load(); },[]);

  const handleApply = (job, mode) => {
    setSelectedJob(job);
    setModalMode(mode);
  };

  const submitApplication = async () => {
    if (!applyForm.resumeId) return showToast("Please select a resume to apply with");
    setApplying(true);
    try {
      await jobsAPI.apply({ jobId: selectedJob._id, ...applyForm });
      showToast("🎉 Application submitted successfully!");
      setModalMode(null);
      setSelectedJob(null);
      load();
    } catch (err) {
      showToast(err.response?.data?.message || "Application failed");
    } finally { setApplying(false); }
  };

  const filtered = jobs.filter(j => {
    const matchSearch = !search || j.title.toLowerCase().includes(search.toLowerCase()) || j.description.toLowerCase().includes(search.toLowerCase());
    const matchType   = typeFilter==="all" || j.type===typeFilter;
    return matchSearch && matchType;
  });

  const appStatusColor = {
    "Applied":             "tag-blue",
    "Under Review":        "tag-amber",
    "Shortlisted":         "tag-green",
    "Interview Scheduled": "tag-indigo",
    "Rejected":            "tag-red",
    "Hired":               "tag-green",
  };

  return (
    <div style={{minHeight:"100vh",background:"var(--bg)"}}>
      {/* Topbar */}
      <div style={{background:"#fff",borderBottom:"1px solid var(--border)",padding:"0 32px",height:60,display:"flex",alignItems:"center",gap:16,position:"sticky",top:0,zIndex:50}}>
        <button className="btn btn-ghost btn-sm" onClick={()=>nav("/dashboard")} style={{padding:"6px 10px"}}>← Back</button>
        <div style={{fontFamily:"Fraunces,serif",fontSize:18,fontWeight:700}}>Job Openings</div>
        <div style={{marginLeft:"auto",display:"flex",gap:8}}>
          <button className={"btn btn-sm "+(tab==="browse"?"btn-primary":"btn-outline")} onClick={()=>setTab("browse")}>Browse Jobs ({jobs.length})</button>
          <button className={"btn btn-sm "+(tab==="applications"?"btn-primary":"btn-outline")} onClick={()=>setTab("applications")}>My Applications ({myApps.length})</button>
        </div>
      </div>

      <div style={{maxWidth:1100,margin:"0 auto",padding:"28px 24px"}}>

        {/* BROWSE */}
        {tab==="browse"&&(
          <>
            <div style={{display:"flex",gap:12,marginBottom:24,flexWrap:"wrap",alignItems:"center"}}>
              <div className="search-wrap" style={{flex:1,minWidth:200}}>
                <span className="search-icon">🔍</span>
                <input className="search-input" style={{width:"100%"}} placeholder="Search jobs by title or keyword..."
                  value={search} onChange={e=>setSearch(e.target.value)}/>
              </div>
              <div className="chip-row">
                {["all","Full-time","Part-time","Contract","Internship"].map(t=>(
                  <span key={t} className={"chip"+(typeFilter===t?" active":"")} onClick={()=>setTypeFilter(t)}>
                    {t==="all"?"All Types":t}
                  </span>
                ))}
              </div>
            </div>

            {loading ? (
              <div style={{textAlign:"center",padding:80}}><div className="spinner" style={{margin:"0 auto"}}></div></div>
            ) : filtered.length===0 ? (
              <div className="card" style={{textAlign:"center",padding:"60px 24px"}}>
                <div style={{fontSize:48,marginBottom:16}}>🔍</div>
                <h3 style={{fontFamily:"Plus Jakarta Sans,sans-serif",fontSize:17,marginBottom:8}}>No jobs found</h3>
                <p style={{color:"var(--muted)"}}>Try a different search or check back later.</p>
              </div>
            ) : (
              <div className="grid-2">
                {filtered.map(j=><JobCard key={j._id} job={j} onApply={handleApply} myApplications={myApps}/>)}
              </div>
            )}
          </>
        )}

        {/* MY APPLICATIONS */}
        {tab==="applications"&&(
          <>
            {myApps.length===0 ? (
              <div className="card" style={{textAlign:"center",padding:"60px 24px"}}>
                <div style={{fontSize:48,marginBottom:16}}>📋</div>
                <h3 style={{fontFamily:"Plus Jakarta Sans,sans-serif",fontSize:17,marginBottom:8}}>No applications yet</h3>
                <p style={{color:"var(--muted)",marginBottom:20}}>Browse jobs and apply to track your applications here.</p>
                <button className="btn btn-primary" onClick={()=>setTab("browse")}>Browse Jobs →</button>
              </div>
            ) : (
              <div style={{display:"flex",flexDirection:"column",gap:14}}>
                {myApps.map(a=>(
                  <div key={a._id} className="card">
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:12}}>
                      <div>
                        <div style={{fontFamily:"Fraunces,serif",fontSize:16,fontWeight:700,marginBottom:4}}>{a.job?.title||"Job"}</div>
                        <div style={{display:"flex",gap:7,flexWrap:"wrap",marginBottom:8}}>
                          <span className="tag tag-gray">📍 {a.job?.location||"N/A"}</span>
                          <span className="tag tag-gray">📅 Applied {new Date(a.createdAt).toLocaleDateString()}</span>
                          {a.atsScore>0&&<span className="tag" style={{background:scColor(a.atsScore)+"22",color:scColor(a.atsScore)}}>ATS: {a.atsScore}</span>}
                        </div>
                        <span className={`tag ${appStatusColor[a.status]||"tag-gray"}`}>{a.status}</span>
                        {a.interviewDate&&(
                          <div style={{marginTop:8,fontSize:13,color:"var(--blue)",fontWeight:600}}>
                            📅 Interview: {new Date(a.interviewDate).toLocaleDateString()}
                          </div>
                        )}
                        {a.status==="Rejected"&&a.rejectionReason&&(
                          <div style={{marginTop:8,fontSize:13,color:"var(--muted)",fontStyle:"italic"}}>
                            Reason: {a.rejectionReason}
                          </div>
                        )}
                      </div>
                      <div style={{textAlign:"right"}}>
                        {a.atsScore>0&&(
                          <div>
                            <div style={{fontFamily:"Fraunces,serif",fontSize:28,fontWeight:700,color:scColor(a.atsScore)}}>{a.atsScore}</div>
                            <div style={{fontSize:11,color:"var(--muted)",fontWeight:600}}>ATS MATCH</div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* JOB DETAILS / APPLY MODAL */}
      {selectedJob&&modalMode&&(
        <div className="modal-overlay" onClick={e=>{if(e.target===e.currentTarget){setSelectedJob(null);setModalMode(null);}}}>
          <div className="modal-box" style={{maxWidth:580,maxHeight:"88vh",overflowY:"auto"}}>
            <div className="modal-hd">
              <span className="modal-title">{modalMode==="apply"?"Apply — "+selectedJob.title:selectedJob.title}</span>
              <button className="btn btn-ghost btn-sm" onClick={()=>{setSelectedJob(null);setModalMode(null);}}>✕</button>
            </div>

            {modalMode==="details"&&(
              <>
                <div style={{display:"flex",gap:7,flexWrap:"wrap",marginBottom:16}}>
                  <span className="tag tag-indigo">{selectedJob.department}</span>
                  <span className="tag tag-gray">📍 {selectedJob.location}</span>
                  <span className="tag tag-gray">⏱ {selectedJob.type}</span>
                  <span className="tag tag-green">💰 {selectedJob.salary}</span>
                  <span className="tag tag-gray">👤 {selectedJob.experience} exp</span>
                </div>
                <div style={{fontSize:14,color:"var(--text)",lineHeight:1.75,marginBottom:16,whiteSpace:"pre-wrap"}}>{selectedJob.description}</div>
                {selectedJob.requirements&&(
                  <div style={{marginBottom:16}}>
                    <div style={{fontWeight:700,fontSize:13.5,marginBottom:8}}>Requirements</div>
                    <div style={{fontSize:13.5,color:"var(--muted)",lineHeight:1.7}}>{selectedJob.requirements}</div>
                  </div>
                )}
                {selectedJob.skills?.length>0&&(
                  <div style={{marginBottom:20}}>
                    <div style={{fontWeight:700,fontSize:13.5,marginBottom:8}}>Skills Required</div>
                    <div style={{display:"flex",flexWrap:"wrap",gap:7}}>
                      {selectedJob.skills.map(s=><span key={s} className="tag tag-blue">{s}</span>)}
                    </div>
                  </div>
                )}
                <div style={{display:"flex",gap:10,justifyContent:"flex-end",borderTop:"1px solid var(--border)",paddingTop:16}}>
                  <button className="btn btn-outline" onClick={()=>{setSelectedJob(null);setModalMode(null);}}>Close</button>
                  <button className="btn btn-primary" onClick={()=>setModalMode("apply")}>Apply Now →</button>
                </div>
              </>
            )}

            {modalMode==="apply"&&(
              <>
                <div style={{background:"var(--blue-lt)",border:"1px solid var(--blue-mid)",borderRadius:"var(--r10)",padding:"12px 16px",marginBottom:20,fontSize:13}}>
                  Your resume will be automatically analyzed against this job description for ATS compatibility.
                </div>

                <div className="form-group">
                  <label className="form-label">Select Resume to Apply With *</label>
                  {resumes.length===0?(
                    <div style={{padding:12,background:"var(--amber-lt)",border:"1px solid #FDE68A",borderRadius:"var(--r8)",fontSize:13,color:"var(--amber)"}}>
                      No analyzed resumes found. Go to <strong>ATS Score</strong> tab first, upload and analyze your resume, then come back to apply.
                    </div>
                  ):(
                    <select className="form-select" value={applyForm.resumeId} onChange={e=>setApplyForm(f=>({...f,resumeId:e.target.value}))}>
                      <option value="">Choose a resume...</option>
                      {resumes.map(r=>(
                        <option key={r._id} value={r._id}>
                          {r.originalName} — ATS Score: {r.atsScore}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                {[["phone","Phone Number","tel","+91 9876543210"],["location","Current Location","text","Hyderabad, India"],["linkedIn","LinkedIn URL","url","linkedin.com/in/yourname"],["github","GitHub URL","url","github.com/yourname"]].map(([k,l,t,p])=>(
                  <div className="form-group" key={k}>
                    <label className="form-label">{l}</label>
                    <input className="form-input" type={t} placeholder={p} value={applyForm[k]||""} onChange={e=>setApplyForm(f=>({...f,[k]:e.target.value}))}/>
                  </div>
                ))}

                <div className="form-group">
                  <label className="form-label">Cover Letter (optional)</label>
                  <textarea className="form-textarea" rows={5}
                    placeholder={`Dear Hiring Team at ...\n\nI am excited to apply for the ${selectedJob.title} position...`}
                    value={applyForm.coverLetter} onChange={e=>setApplyForm(f=>({...f,coverLetter:e.target.value}))}/>
                </div>

                <div style={{display:"flex",gap:10,justifyContent:"flex-end",borderTop:"1px solid var(--border)",paddingTop:16}}>
                  <button className="btn btn-outline" onClick={()=>setModalMode("details")}>← Back</button>
                  <button className="btn btn-primary" onClick={submitApplication} disabled={applying||!applyForm.resumeId}>
                    {applying?"Submitting...":"Submit Application →"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {toast&&<div className="toast">{toast}</div>}
    </div>
  );
}