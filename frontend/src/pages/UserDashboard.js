/* eslint-disable */
import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { resumeAPI, authAPI, userAPI } from "../utils/api";

function initials(n=""){ return n.split(" ").map(w=>w[0]).join("").toUpperCase().slice(0,2); }
function scColor(s){ return s>=80?"#059669":s>=60?"#1B5EEA":s>=40?"#D97706":"#DC2626"; }

const ROLE_SKILLS = {
  "ai engineer":          ["python","tensorflow","pytorch","keras","scikit-learn","numpy","pandas","machine learning","deep learning","nlp"],
  "ml engineer":          ["python","tensorflow","pytorch","keras","scikit-learn","numpy","pandas","machine learning","deep learning","nlp"],
  "machine learning":     ["python","tensorflow","pytorch","keras","scikit-learn","numpy","pandas","machine learning","deep learning"],
  "data scientist":       ["python","pandas","numpy","scikit-learn","machine learning","sql","tensorflow","statistics","matplotlib"],
  "data analyst":         ["sql","python","pandas","excel","tableau","analytics","statistics","mysql","postgresql","power bi"],
  "frontend engineer":    ["react","javascript","typescript","html","css","webpack","redux","nextjs","tailwind","git"],
  "frontend developer":   ["react","javascript","typescript","html","css","webpack","redux","nextjs","tailwind","git"],
  "backend engineer":     ["nodejs","express","python","sql","mongodb","postgresql","rest","api","docker","git"],
  "backend developer":    ["nodejs","express","python","sql","mongodb","postgresql","rest","api","docker","git"],
  "full stack":           ["react","nodejs","javascript","html","css","mongodb","sql","git","rest","api","docker"],
  "fullstack":            ["react","nodejs","javascript","html","css","mongodb","sql","git","rest","api","docker"],
  "devops engineer":      ["docker","kubernetes","aws","linux","terraform","ansible","jenkins","cicd","bash","git"],
  "cloud engineer":       ["aws","gcp","azure","docker","kubernetes","terraform","linux","cicd","git"],
  "software engineer":    ["python","javascript","git","sql","rest","api","linux","nodejs","docker","testing"],
  "java developer":       ["java","spring","sql","git","rest","docker","junit","maven","hibernate"],
  "python developer":     ["python","django","flask","sql","git","rest","docker","pandas","pytest"],
  "mobile developer":     ["react native","flutter","swift","kotlin","android","ios","git","firebase"],
  "android developer":    ["kotlin","android","java","git","firebase","rest","jetpack"],
  "ios developer":        ["swift","ios","xcode","git","rest","firebase","objective-c"],
  "ui ux":                ["figma","css","html","javascript","react","tailwind","sass","adobe xd"],
  "product manager":      ["agile","scrum","jira","analytics","communication","leadership","kanban","roadmapping"],
  "qa engineer":          ["selenium","jest","cypress","testing","tdd","python","javascript","git","postman"],
  "cybersecurity":        ["linux","networking","python","bash","firewalls","encryption","penetration testing","git"],
  "blockchain":           ["solidity","ethereum","web3","javascript","nodejs","smart contracts","git"],
};

function getRequiredSkills(title, jdText) {
  const norm = (title || "").toLowerCase();
  // Try exact role match first
  for (const [role, skills] of Object.entries(ROLE_SKILLS)) {
    if (norm.includes(role)) return skills;
  }
  // Try partial word match
  const words = norm.split(/\s+/);
  for (const [role, skills] of Object.entries(ROLE_SKILLS)) {
    if (words.some(w => w.length > 3 && role.includes(w))) return skills;
  }
  // Fallback: extract tech words from JD text
  const techWords = ["python","javascript","java","react","nodejs","sql","docker","aws","git",
    "typescript","mongodb","postgresql","redis","kubernetes","tensorflow","pytorch","flutter",
    "swift","kotlin","angular","vue","django","flask","spring","express","graphql","rest"];
  const jdNorm = (jdText || "").toLowerCase();
  return techWords.filter(t => jdNorm.includes(t));
}



function ScoreRing({ score }) {
  const r=52, c=2*Math.PI*r, offset=score ? c-(c*score/100) : c;
  return (
    <div style={{position:"relative",width:130,height:130}}>
      <svg width="130" height="130" viewBox="0 0 130 130">
        <circle cx="65" cy="65" r={r} fill="none" stroke="#E2E1DA" strokeWidth="11"/>
        <circle cx="65" cy="65" r={r} fill="none" stroke={scColor(score||0)} strokeWidth="11"
          strokeLinecap="round" strokeDasharray={c} strokeDashoffset={offset}
          style={{transform:"rotate(-90deg)",transformOrigin:"65px 65px",transition:"stroke-dashoffset 1s ease"}}/>
      </svg>
      <div style={{position:"absolute",top:"50%",left:"50%",transform:"translate(-50%,-50%)",textAlign:"center"}}>
        <div style={{fontFamily:"Fraunces,serif",fontSize:30,fontWeight:700,color:scColor(score||0),lineHeight:1}}>{score||"--"}</div>
        <div style={{fontSize:10,color:"#94A3B8",fontWeight:700,letterSpacing:".8px",marginTop:3}}>ATS SCORE</div>
      </div>
    </div>
  );
}

export default function UserDashboard() {
  const { user, logout, updateUser } = useAuth();
  const nav = useNavigate();
  const [tab, setTab]             = useState("ats");
  const [resume, setResume]       = useState(null);
  const [result, setResult]       = useState(null);
  const [jd, setJd]               = useState("");
  const [jobTitle, setJobTitle]   = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver]   = useState(false);
  const [toast, setToast]         = useState("");
  const [toastType, setToastType] = useState("success");
  const [clForm, setClForm]       = useState({ name:user?.name||"", company:"", role:"", tone:"Professional", skills:"", achievements:"" });
  const [coverLetter, setCoverLetter] = useState("");
  const [clLoading, setClLoading]     = useState(false);
  const [resumes, setResumes]         = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [sidebarOpen, setSidebarOpen]       = useState(false);
  const [profileForm, setProfileForm]       = useState({
    name:user?.name||"", phone:user?.phone||"",
    location:user?.location||"", linkedIn:user?.linkedIn||"",
    github:user?.github||"", targetRole:user?.targetRole||""
  });
  const [profileSaving, setProfileSaving] = useState(false);
  const [applying, setApplying]           = useState(false);
  const [applied, setApplied]             = useState(user?.appliedToHR || false);
  const [videoFile, setVideoFile]         = useState(null);
  const [videoAnalyzing, setVideoAnalyzing] = useState(false);
  const [videoResult, setVideoResult]     = useState(null);
  const [videoPreview, setVideoPreview]   = useState(null);
  const fileRef  = useRef();
  const videoRef = useRef();

  const showToast = (msg, type="success") => {
    setToast(msg); setToastType(type);
    setTimeout(()=>setToast(""), 3500);
  };

  const loadHistory = async () => {
    setLoadingHistory(true);
    try { const { data } = await resumeAPI.getAll(); setResumes(data.resumes); }
    catch { showToast("Failed to load history","error"); }
    finally { setLoadingHistory(false); }
  };

  useEffect(() => { if(tab==="history") loadHistory(); }, [tab]);

  const handleFile = async file => {
    if (!file) return;
    if (![".pdf",".doc",".docx"].some(e=>file.name.toLowerCase().endsWith(e)))
      return showToast("Only PDF or Word files allowed","error");
    setUploading(true);
    try {
      const fd = new FormData(); fd.append("resume", file);
      const { data } = await resumeAPI.upload(fd);
      setResume(data.resume);
      showToast("Resume uploaded successfully");
    } catch (err) {
      showToast("Upload failed: "+(err.response?.data?.message||err.message),"error");
    } finally { setUploading(false); }
  };

  const analyze = async () => {
    if (!resume) return showToast("Please upload a resume first","error");
    if (!jd.trim()) return showToast("Please enter a job description","error");
    setAnalyzing(true); setResult(null);
    try {
      // Step 1: Get resume text from backend
      let resumeText = "";
      try {
        const { data: textData } = await resumeAPI.getText(resume._id);
        resumeText = textData.extractedText || "";
      } catch(e) { console.warn("Could not fetch resume text:", e.message); }

      // Step 2: Call backend analyze (which uses atsEngine with strict scoring)
      const { data } = await resumeAPI.analyze({
        resumeId: resume._id,
        jobDescription: jd,
        jobTitle,
        geminiResult: null   // tell backend to run its own analysis
      });

      // Backend returns extractedText + runs atsEngine internally
      // If backend returned result directly, use it
      let r = data.result;

      // If no result from backend, run local skill computation
      if (!r) {
        showToast("Analysis failed — please try again","error");
        setAnalyzing(false);
        return;
      }

      // Compute missing skills locally using ROLE_SKILLS for reliability
      const ALIASES = {"node":"nodejs","node.js":"nodejs","react.js":"react","reactjs":"react",
        "vue.js":"vue","next.js":"nextjs","express.js":"express","mongo":"mongodb",
        "postgres":"postgresql","sklearn":"scikit-learn","ml":"machine learning","k8s":"kubernetes"};
      const norm = s => { const x=(s||"").toLowerCase().trim(); return ALIASES[x]||x; };
      const aiFound = (Array.isArray(r.foundSkills) ? r.foundSkills : []).map(norm);
      const requiredSkills = getReqSkills(jobTitle, jd);
      const localMissing = requiredSkills.filter(s => !aiFound.includes(norm(s)));
      const localMatched = requiredSkills.filter(s => aiFound.includes(norm(s)));
      const localSkillsScore = requiredSkills.length === 0
        ? (r.breakdown?.skillsScore || 0)
        : localMissing.length === 0 ? 100
        : Math.round((localMatched.length / requiredSkills.length) * 100);

      const breakdown = { ...(r.breakdown || {}), skillsScore: localSkillsScore };

      setResult({
        atsScore:        r.atsScore        || 0,
        breakdown,
        matchedKeywords: Array.isArray(r.matchedKeywords) ? r.matchedKeywords : [],
        missingKeywords: Array.isArray(r.missingKeywords) ? r.missingKeywords : [],
        foundSkills:     aiFound,
        missingSkills:   localMissing,
        recommendations: Array.isArray(r.recommendations) ? r.recommendations : [],
        fraud:           r.fraud || { isFraudSuspected:false, fraudScore:0, flags:[], analysis:"" },
      });
      showToast("Analysis complete!");
    } catch (err) {
      showToast("Analysis failed: "+(err.response?.data?.message||err.message),"error");
    } finally { setAnalyzing(false); }
  };


  const analyzeVideo = async () => {
    if (!videoFile) return showToast("Please upload a video first","error");
    setVideoAnalyzing(true);
    try {
      const formData = new FormData();
      formData.append("video", videoFile);
      formData.append("jobDescription", jd || "");
      formData.append("resumeId", resume?._id || "");

      const { data } = await resumeAPI.analyzeVideo(formData);

      if (!data.success) throw new Error(data.message || "Video analysis failed");

      const v = data.result || data;
      setVideoResult({
        overallScore:  v.overallScore  || v.score || 0,
        confidence:    v.confidence    || v.confidence_score || 0,
        clarity:       v.clarity       || v.communication || 0,
        tone:          v.tone          || 0,
        relevance:     v.relevance     || v.technical_signal_score || 0,
        pace:          v.pace          || 70,
        eyeContact:    v.eyeContact    || 60,
        communication: v.communication || v.communication_score || 0,
        fillerWords:   v.fillerWords   || v.speech_quality?.filler_count || 0,
        hesitations:   v.hesitations   || 0,
        grade:         v.grade         || (v.overallScore>=85?"Excellent":v.overallScore>=70?"Good":v.overallScore>=50?"Average":"Poor"),
        verdict:       v.verdict       || "AVERAGE",
        sentiment:     v.sentiment     || "Neutral",
        wpm:           v.wpm           || 0,
        wordCount:     v.wordCount     || v.speech_quality?.word_count || 0,
        duration:      v.duration      || "0:00",
        fraudRisk:     v.fraudRisk     || "Low",
        strengths:     Array.isArray(v.strengths)    ? v.strengths    : [],
        improvements:  Array.isArray(v.improvements) ? v.improvements : (Array.isArray(v.improvement_tips) ? v.improvement_tips : []),
        keywords:      Array.isArray(v.keywords)     ? v.keywords     : [],
      });
      showToast("Video analysis complete!");
    } catch(err) {
      showToast("Video analysis failed: " + (err.response?.data?.message || err.message), "error");
    } finally {
      setVideoAnalyzing(false);
    }
  };


  const tabs = [
    { id:"ats",    icon:"📊", label:"ATS Score"     },
    { id:"skills", icon:"🎯", label:"Skill Gap"      },
    { id:"video",  icon:"🎥", label:"Video Analysis" },
    { id:"cover",  icon:"✉️", label:"Cover Letter"   },
    { id:"apply",  icon:"📤", label:"Apply to HR"    },
    { id:"history",icon:"📁", label:"My Resumes"     },
    { id:"profile",icon:"👤", label:"Profile"        },
  ];

  return (
    <div className="dash-layout">
      {sidebarOpen && <div className="sidebar-overlay" onClick={()=>setSidebarOpen(false)}></div>}

      <div className={"sidebar"+(sidebarOpen?" sidebar-open":"")}>
        <div className="sb-logo">
          <div className="sb-logo-inner"><div className="sb-logo-dot"></div>HireIQ</div>
          <button className="sidebar-close" onClick={()=>setSidebarOpen(false)}>✕</button>
        </div>
        <div className="sb-section">
          <span className="sb-sect-lbl">Analysis</span>
          {tabs.slice(0,5).map(t=>(
            <button key={t.id} className={"sb-item"+(tab===t.id?" active":"")} onClick={()=>{setTab(t.id);setSidebarOpen(false);}}>
              <span className="sb-icon">{t.icon}</span>{t.label}
            </button>
          ))}
        </div>
        <div className="sb-section" style={{marginTop:8}}>
          <span className="sb-sect-lbl">Account</span>
          {tabs.slice(5).map(t=>(
            <button key={t.id} className={"sb-item"+(tab===t.id?" active":"")} onClick={()=>{setTab(t.id);setSidebarOpen(false);}}>
              <span className="sb-icon">{t.icon}</span>{t.label}
            </button>
          ))}
          <button className="sb-item" onClick={()=>nav("/")}><span className="sb-icon">🏠</span>Home</button>
          <button className="sb-item" onClick={()=>{logout();nav("/");}}><span className="sb-icon">🚪</span>Sign out</button>
        </div>
      </div>

      <div className="dash-main">
        <div className="topbar">
          <button className="hamburger topbar-hamburger" onClick={()=>setSidebarOpen(true)}>☰</button>
          <div className="topbar-title">{tabs.find(t=>t.id===tab)?.label||"Dashboard"}</div>
          <div className="topbar-right">
            <div className="user-chip">
              <div className="avatar av-blue" style={{width:28,height:28,fontSize:11}}>{initials(user?.name)}</div>
              <span className="chip-name chip-name-hide">{user?.name?.split(" ")[0]}</span>
            </div>
          </div>
        </div>

        <div className="content fade-in">

          {/* ATS TAB */}
          {tab==="ats" && (
            <div className="two-col">
              <div style={{display:"flex",flexDirection:"column",gap:16}}>
                <div
                  className={"dropzone"+(dragOver?" dz-active":"")+(resume?" dz-ready":"")}
                  onClick={()=>fileRef.current.click()}
                  onDragOver={e=>{e.preventDefault();setDragOver(true)}}
                  onDragLeave={()=>setDragOver(false)}
                  onDrop={e=>{e.preventDefault();setDragOver(false);handleFile(e.dataTransfer.files[0])}}
                >
                  <input ref={fileRef} type="file" accept=".pdf,.doc,.docx" style={{display:"none"}} onChange={e=>handleFile(e.target.files[0])}/>
                  <div className="dz-icon">{uploading?"⏳":resume?"✅":"📄"}</div>
                  <div style={{fontWeight:700,fontSize:15,marginBottom:6}}>
                    {uploading?"Uploading...":resume?resume.originalName:"Drop your resume here"}
                  </div>
                  <div style={{fontSize:13,color:"var(--muted)"}}>
                    {resume?"Click to replace file":"PDF or DOCX · Max 10 MB"}
                  </div>
                </div>

                <div className="card">
                  <div className="card-hd"><span className="card-title">Job Description</span><span className="tag tag-gray">Required</span></div>
                  <div className="form-group">
                    <label className="form-label">Job Title</label>
                    <input className="form-input" placeholder="e.g. Senior Frontend Engineer" value={jobTitle} onChange={e=>setJobTitle(e.target.value)}/>
                  </div>
                  <div className="form-group" style={{marginBottom:14}}>
                    <label className="form-label">Paste Job Description</label>
                    <textarea className="form-textarea" rows={6} placeholder="Paste the full job description here..." value={jd} onChange={e=>setJd(e.target.value)}/>
                  </div>
                  <button className="btn btn-primary" style={{width:"100%",padding:11,fontSize:14.5}} onClick={analyze} disabled={analyzing}>
                    {analyzing?"⚡ Analyzing...":"⚡ Analyze Resume"}
                  </button>
                </div>

                {result && (
                  <div className="card fade-in">
                    <div className="card-hd">
                      <span className="card-title">Keyword Match</span>
                      <span className="tag tag-blue">
                        {result.matchedKeywords.length} matched · {result.missingKeywords.length} missing
                      </span>
                    </div>
                    {result.matchedKeywords.length > 0 && (
                      <div style={{marginBottom:12}}>
                        <div style={{fontSize:11.5,fontWeight:700,color:"var(--green)",letterSpacing:".5px",marginBottom:7}}>✓ FOUND IN YOUR RESUME</div>
                        <div style={{display:"flex",flexWrap:"wrap",gap:7}}>
                          {result.matchedKeywords.map((k,i)=>{
                            const word = typeof k==="object" ? k.keyword : k;
                            return <span key={i} className="tag tag-green">✓ {word}</span>;
                          })}
                        </div>
                      </div>
                    )}
                    {result.missingKeywords.length > 0 && (
                      <div style={{marginBottom:12}}>
                        <div style={{fontSize:11.5,fontWeight:700,color:"var(--red)",letterSpacing:".5px",marginBottom:7}}>✗ NOT FOUND IN YOUR RESUME</div>
                        <div style={{display:"flex",flexWrap:"wrap",gap:7}}>
                          {result.missingKeywords.map((k,i)=>{
                            const word = typeof k==="object" ? k.keyword : k;
                            return <span key={i} className="tag tag-red">✗ {word}</span>;
                          })}
                        </div>
                      </div>
                    )}
                    {result.recommendations.length>0&&(
                      <div style={{background:"var(--amber-lt)",border:"1px solid #FDE68A",borderRadius:"var(--r10)",padding:"12px 14px"}}>
                        <div style={{fontWeight:700,fontSize:12.5,color:"var(--amber)",marginBottom:8}}>💡 RECOMMENDATIONS</div>
                        {result.recommendations.map((r,i)=>(
                          <div key={i} style={{fontSize:13,marginBottom:5,display:"flex",gap:8}}>
                            <span style={{color:"var(--amber)"}}>→</span>{r}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div style={{display:"flex",flexDirection:"column",gap:14}}>
                <div className="card" style={{textAlign:"center"}}>
                  <div style={{display:"flex",justifyContent:"center",marginBottom:14}}>
                    <ScoreRing score={result?.atsScore}/>
                  </div>
                  <div style={{fontSize:13,color:"var(--muted)",fontWeight:500}}>
                    {result
                      ? result.atsScore>=80?"🟢 Excellent — strong ATS match"
                        : result.atsScore>=60?"🟡 Good — minor improvements needed"
                        : "🟠 Needs work — review keywords"
                      : "Upload resume to analyze"}
                  </div>
                </div>

                {result && (
                  <div className="card fade-in">
                    <div className="card-hd"><span className="card-title">Score Breakdown</span></div>
                    {[
                      ["Keywords",   result.breakdown.keywordScore   ||0],
                      ["Formatting", result.breakdown.formattingScore||0],
                      ["Experience", result.breakdown.experienceScore||0],
                      ["Education",  result.breakdown.educationScore ||0],
                      ["Skills",     result.breakdown.skillsScore    ||0],
                    ].map(([l,v])=>(
                      <div className="skill-row" key={l}>
                        <span className="skill-name" style={{fontSize:12.5}}>{l}</span>
                        <div className="skill-bar"><div className="skill-fill" style={{width:v+"%",background:scColor(v)}}></div></div>
                        <span className="skill-pct" style={{color:scColor(v)}}>{v}%</span>
                      </div>
                    ))}
                  </div>
                )}

                <div className="card">
                  <div className="card-hd"><span className="card-title">Fraud Detection</span></div>
                  {result ? (
                    <div style={{background:result.fraud.isFraudSuspected?"var(--red-lt)":"var(--green-lt)",border:`1px solid ${result.fraud.isFraudSuspected?"var(--red-mid)":"var(--green-mid)"}`,borderRadius:"var(--r10)",padding:14}}>
                      <div style={{fontSize:22,marginBottom:8}}>{result.fraud.isFraudSuspected?"⚠️":"✅"}</div>
                      <div style={{fontWeight:700,fontSize:13,color:result.fraud.isFraudSuspected?"var(--red)":"var(--green)"}}>
                        {result.fraud.isFraudSuspected?"Suspicious Patterns Found":"Resume Appears Authentic"}
                      </div>
                      <div style={{fontSize:12,marginTop:5,color:"var(--muted)"}}>Fraud score: {result.fraud.fraudScore}/100</div>
                      <div style={{fontSize:12,marginTop:6,fontStyle:"italic",color:"var(--muted)"}}>{result.fraud.analysis}</div>
                      {result.fraud.flags.map((f,i)=>(
                        <div key={i} style={{fontSize:12,marginTop:6,padding:"6px 10px",background:"rgba(0,0,0,.06)",borderRadius:"var(--r6)"}}>{f.description}</div>
                      ))}
                    </div>
                  ) : (
                    <div style={{textAlign:"center",padding:"20px 0",color:"var(--muted)",fontSize:13}}>🛡️ Run analysis to check</div>
                  )}
                </div>

                {result && (
                  <div className="card fade-in">
                    <div className="card-hd"><span className="card-title">Quick Actions</span></div>
                    <div style={{display:"flex",flexDirection:"column",gap:8}}>
                      <button className="btn btn-outline" style={{justifyContent:"flex-start",gap:10}} onClick={()=>setTab("skills")}>🎯 View Skill Gap Analysis</button>
                      <button className="btn btn-outline" style={{justifyContent:"flex-start",gap:10}} onClick={()=>setTab("video")}>🎥 Analyze Video Resume</button>
                      <button className="btn btn-outline" style={{justifyContent:"flex-start",gap:10}} onClick={()=>{setClForm(f=>({...f,role:jobTitle}));setTab("cover");}}>✉️ Generate Cover Letter</button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* SKILLS TAB */}
          {tab==="skills" && (
            <div style={{display:"flex",flexDirection:"column",gap:16}}>
              {result ? (() => {
                // Compute missing skills fresh on every render using ROLE_SKILLS map
                const ALIASES = {"node":"nodejs","node.js":"nodejs","react.js":"react","reactjs":"react",
                  "vue.js":"vue","next.js":"nextjs","express.js":"express","mongo":"mongodb",
                  "postgres":"postgresql","sklearn":"scikit-learn","scikit learn":"scikit-learn",
                  "ml":"machine learning","k8s":"kubernetes","js":"javascript","ts":"typescript"};
                const normSkill = s => { const x=(s||"").toLowerCase().trim(); return ALIASES[x]||x; };
                const requiredSkills = getReqSkills(jobTitle, jd);
                const foundNorm = (result.foundSkills||[]).map(normSkill);
                const computedMissing = requiredSkills.filter(s => !foundNorm.includes(normSkill(s)));
                const computedMatched = requiredSkills.filter(s => foundNorm.includes(normSkill(s)));
                const computedSkillScore = requiredSkills.length === 0
                  ? (result.breakdown?.skillsScore || 0)
                  : computedMissing.length === 0 ? 100
                  : Math.round((computedMatched.length / requiredSkills.length) * 100);

                return (
                  <>
                    <div className="grid-2">
                      <div className="card">
                        <div className="card-hd">
                          <span className="card-title">Your Skills</span>
                          <span className="tag tag-green">{(result.foundSkills||[]).length} detected</span>
                        </div>
                        <div style={{display:"flex",flexWrap:"wrap",gap:7}}>
                          {(result.foundSkills||[]).length > 0
                            ? (result.foundSkills||[]).map(s=><span key={s} className="tag tag-green">{s}</span>)
                            : <p style={{fontSize:13,color:"var(--muted)"}}>No skills detected. Ensure your resume lists standard skill names.</p>
                          }
                        </div>
                      </div>
                      <div className="card">
                        <div className="card-hd">
                          <span className="card-title">Missing Skills</span>
                          <span className="tag tag-red">{computedMissing.length} gaps</span>
                        </div>
                        <div style={{display:"flex",flexWrap:"wrap",gap:7}}>
                          {requiredSkills.length === 0 ? (
                            <p style={{fontSize:13,color:"var(--muted)"}}>
                              Enter a specific job title (e.g. "AI Engineer") to see skill gaps
                            </p>
                          ) : computedMissing.length > 0 ? (
                            computedMissing.map(s=><span key={s} className="tag tag-red">{s}</span>)
                          ) : (
                            <p style={{fontSize:13,color:"var(--green)",fontWeight:600}}>
                              🎉 You have all required skills for this role!
                            </p>
                          )}
                        </div>
                        {computedMissing.length > 0 && (
                          <div style={{marginTop:12,fontSize:13,color:"var(--muted)"}}>
                            Closing these gaps could raise your score by{" "}
                            <strong style={{color:"var(--green)"}}>+{Math.min(computedMissing.length*4,20)} pts</strong>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="card">
                      <div className="card-hd"><span className="card-title">Skill Match vs Job Description</span></div>
                      {[
                        ["Keywords",   result.breakdown?.keywordScore   ||0],
                        ["Formatting", result.breakdown?.formattingScore||0],
                        ["Experience", result.breakdown?.experienceScore||0],
                        ["Education",  result.breakdown?.educationScore ||0],
                        ["Skills",     computedSkillScore],
                      ].map(([l,v])=>(
                        <div className="skill-row" key={l}>
                          <span className="skill-name">{l}</span>
                          <div className="skill-bar"><div className="skill-fill" style={{width:v+"%",background:scColor(v)}}></div></div>
                          <span className="skill-pct" style={{color:scColor(v)}}>{v}%</span>
                        </div>
                      ))}
                    </div>

                    {computedMissing.length > 0 && (
                      <div className="card">
                        <div className="card-hd"><span className="card-title">📚 Recommended Courses to Close Gaps</span></div>
                        <div className="grid-2">
                          {computedMissing.slice(0,4).map(skill=>(
                            <div key={skill} style={{border:"1px solid var(--border)",borderRadius:"var(--r12)",padding:16}}>
                              <div style={{display:"flex",gap:10,alignItems:"center",marginBottom:8}}>
                                <div style={{width:36,height:36,borderRadius:"var(--r8)",background:"var(--blue-lt)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18}}>📚</div>
                                <div style={{fontWeight:700,fontSize:14,textTransform:"capitalize"}}>{skill}</div>
                              </div>
                              <div style={{fontSize:13,color:"var(--muted)",marginBottom:10}}>
                                Learn this skill to improve your match for {jobTitle || "this role"}
                              </div>
                              <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                                <a href={"https://www.coursera.org/search?query="+encodeURIComponent(skill)} target="_blank" rel="noreferrer" className="tag tag-blue" style={{textDecoration:"none"}}>Coursera</a>
                                <a href={"https://www.udemy.com/courses/search/?q="+encodeURIComponent(skill)} target="_blank" rel="noreferrer" className="tag tag-blue" style={{textDecoration:"none"}}>Udemy</a>
                                <a href={"https://www.youtube.com/results?search_query="+encodeURIComponent(skill+" tutorial")} target="_blank" rel="noreferrer" className="tag tag-blue" style={{textDecoration:"none"}}>YouTube</a>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="card" style={{background:"var(--blue-lt)",border:"1px solid var(--blue)"}}>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:12}}>
                        <div>
                          <div style={{fontWeight:700,fontSize:15,marginBottom:4}}>Ready to apply?</div>
                          <div style={{fontSize:13,color:"var(--muted)"}}>
                            Submit your application to appear in the HR dashboard
                          </div>
                        </div>
                        <button className="btn btn-primary" onClick={()=>setTab("apply")} style={{whiteSpace:"nowrap"}}>
                          📤 Apply to HR →
                        </button>
                      </div>
                    </div>
                  </>
                );
              })() : (
                <div className="card" style={{textAlign:"center",padding:"60px 24px"}}>
                  <div style={{fontSize:48,marginBottom:16}}>🎯</div>
                  <h3 style={{fontSize:17,marginBottom:8}}>No analysis yet</h3>
                  <p style={{color:"var(--muted)",fontSize:14,marginBottom:20}}>Run ATS analysis first to see skill gaps</p>
                  <button className="btn btn-primary" onClick={()=>setTab("ats")}>Go to ATS Analysis →</button>
                </div>
              )}
            </div>
          )}

          {tab==="video" && (
            <div style={{display:"flex",flexDirection:"column",gap:16}}>
              <div className="grid-2">
                <div style={{display:"flex",flexDirection:"column",gap:16}}>
                  <div
                    style={{border:`2px dashed ${videoFile?"var(--green)":"var(--border-md)"}`,borderRadius:"var(--r20)",padding:"36px 24px",textAlign:"center",background:videoFile?"var(--green-lt)":"var(--card2)",cursor:"pointer",transition:".2s"}}
                    onClick={()=>videoRef.current.click()}
                  >
                    <input ref={videoRef} type="file" accept="video/*" style={{display:"none"}} onChange={e=>handleVideoFile(e.target.files[0])}/>
                    <div style={{width:54,height:54,background:"#fff",border:"1px solid var(--border)",borderRadius:"var(--r12)",margin:"0 auto 14px",display:"flex",alignItems:"center",justifyContent:"center",fontSize:24,boxShadow:"var(--sh-sm)"}}>
                      {videoFile?"✅":"🎥"}
                    </div>
                    <div style={{fontWeight:700,fontSize:15,marginBottom:6}}>{videoFile?videoFile.name:"Upload your video resume"}</div>
                    <div style={{fontSize:13,color:"var(--muted)"}}>{videoFile?"Click to replace":"MP4, MOV, WebM · Max 100 MB"}</div>
                  </div>

                  {videoPreview && (
                    <div className="card" style={{padding:16}}>
                      <div className="card-hd" style={{marginBottom:10}}><span className="card-title">Preview</span></div>
                      <video src={videoPreview} controls style={{width:"100%",borderRadius:"var(--r12)",background:"#000",maxHeight:200}}/>
                    </div>
                  )}

                  <div className="card">
                    <div className="card-hd"><span className="card-title">What AI Analyzes</span></div>
                    <div style={{display:"flex",flexDirection:"column",gap:10,marginBottom:16}}>
                      {[
                        ["😊","Confidence & Body Language","Posture, gestures, eye contact"],
                        ["🗣️","Speech & Tone","Clarity, pace, filler words"],
                        ["🎯","Content Relevance","Keywords matched to target role"],
                        ["🛡️","Fraud Detection","Deepfake indicators checked"],
                      ].map(([icon,label,desc])=>(
                        <div key={label} style={{display:"flex",alignItems:"flex-start",gap:10,padding:"10px 12px",background:"var(--bg)",borderRadius:"var(--r8)"}}>
                          <span style={{fontSize:18,flexShrink:0}}>{icon}</span>
                          <div>
                            <div style={{fontWeight:600,fontSize:13}}>{label}</div>
                            <div style={{fontSize:12,color:"var(--muted)"}}>{desc}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                    <button className="btn btn-primary" style={{width:"100%",padding:11}} onClick={analyzeVideo} disabled={videoAnalyzing||!videoFile}>
                      {videoAnalyzing?"🔍 Analyzing video...":"🔍 Analyze Video Resume"}
                    </button>
                    {videoAnalyzing&&(
                      <div style={{marginTop:12,background:"var(--blue-lt)",borderRadius:"var(--r8)",padding:"12px 14px"}}>
                        <div style={{fontSize:12.5,fontWeight:600,color:"var(--blue)",marginBottom:4}}>AI is processing your video...</div>
                        <div style={{fontSize:12,color:"var(--muted)"}}>Analyzing confidence, tone, clarity and content</div>
                      </div>
                    )}
                  </div>
                </div>

                <div style={{display:"flex",flexDirection:"column",gap:14}}>
                  {videoResult ? (
                    <>
                      <div className="card" style={{textAlign:"center"}}>
                        <div style={{marginBottom:6,fontSize:13,fontWeight:600,color:"var(--muted)"}}>Overall Video Score</div>
                        <div style={{fontFamily:"Fraunces,serif",fontSize:56,fontWeight:700,color:scColor(videoResult.overallScore),lineHeight:1}}>{videoResult.overallScore}</div>
                        <div style={{fontSize:13,color:"var(--muted)",marginTop:6}}>
                          {videoResult.grade==="Excellent"?"🟢 Excellent":videoResult.grade==="Good"?"🟡 Good":videoResult.grade==="Average"?"🟠 Average":"🔴 Poor"} — {videoResult.grade}
                        </div>
                        <div style={{display:"flex",gap:8,justifyContent:"center",marginTop:12,flexWrap:"wrap"}}>
                          <span className="tag tag-blue">⏱ {videoResult.duration}</span>
                          <span className="tag tag-green">😊 {videoResult.sentiment}</span>
                          <span className={`tag ${videoResult.fraudRisk==="Low"?"tag-green":"tag-amber"}`}>🛡️ {videoResult.fraudRisk} Risk</span>
                        </div>
                      </div>

                      <div className="card fade-in">
                        <div className="card-hd"><span className="card-title">Detailed Metrics</span></div>
                        {[["Confidence",videoResult.confidence],["Speech Clarity",videoResult.clarity],["Tone & Energy",videoResult.tone],["Content Relevance",videoResult.relevance],["Speaking Pace",videoResult.pace],["Eye Contact",videoResult.eyeContact]].map(([l,v])=>(
                          <div className="skill-row" key={l}>
                            <span className="skill-name" style={{fontSize:12.5}}>{l}</span>
                            <div className="skill-bar"><div className="skill-fill" style={{width:v+"%",background:scColor(v)}}></div></div>
                            <span className="skill-pct" style={{color:scColor(v)}}>{v}%</span>
                          </div>
                        ))}
                      </div>

                      <div className="grid-2" style={{gap:12}}>
                        <div className="card fade-in">
                          <div className="card-hd"><span className="card-title">✅ Strengths</span></div>
                          {videoResult.strengths.map((s,i)=>(
                            <div key={i} style={{fontSize:13,padding:"6px 0",borderBottom:"1px solid var(--border)",display:"flex",gap:8}}>
                              <span style={{color:"var(--green)",flexShrink:0}}>✓</span>{s}
                            </div>
                          ))}
                        </div>
                        <div className="card fade-in">
                          <div className="card-hd"><span className="card-title">💡 Improve</span></div>
                          {videoResult.improvements.map((s,i)=>(
                            <div key={i} style={{fontSize:13,padding:"6px 0",borderBottom:"1px solid var(--border)",display:"flex",gap:8}}>
                              <span style={{color:"var(--amber)",flexShrink:0}}>→</span>{s}
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="card fade-in">
                        <div className="card-hd"><span className="card-title">Detected Keywords</span></div>
                        <div style={{display:"flex",flexWrap:"wrap",gap:7}}>
                          {videoResult.keywords.map(k=><span key={k} className="tag tag-blue">{k}</span>)}
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="card" style={{textAlign:"center",padding:"60px 24px",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center"}}>
                      <div style={{fontSize:52,marginBottom:16}}>🎥</div>
                      <h3 style={{fontSize:17,marginBottom:8}}>No video analyzed yet</h3>
                      <p style={{color:"var(--muted)",fontSize:14,maxWidth:240}}>Upload a video resume on the left and click Analyze to get AI-powered feedback</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* COVER LETTER TAB */}
          {tab==="cover" && (
            <div className="grid-2">
              <div className="card">
                <div className="card-hd"><span className="card-title">Cover Letter Generator</span></div>
                {[["name","Your Name","Arjun Kumar"],["company","Target Company","Stripe Inc."],["role","Job Title","Senior Frontend Engineer"],["skills","Key Skills (comma separated)","React, TypeScript, Node.js"],["achievements","Key Achievements (optional)","Led team of 5, cut load time 40%"]].map(([k,l,p])=>(
                  <div className="form-group" key={k}>
                    <label className="form-label">{l}</label>
                    <input className="form-input" placeholder={p} value={clForm[k]} onChange={e=>setClForm(f=>({...f,[k]:e.target.value}))}/>
                  </div>
                ))}
                <div className="form-group">
                  <label className="form-label">Tone</label>
                  <select className="form-select" value={clForm.tone} onChange={e=>setClForm(f=>({...f,tone:e.target.value}))}>
                    <option>Professional</option><option>Enthusiastic</option><option>Concise</option><option>Creative</option>
                  </select>
                </div>
                <button className="btn btn-primary" style={{width:"100%",padding:11}} onClick={genCL} disabled={clLoading}>
                  {clLoading?"✨ Generating...":"✨ Generate Cover Letter"}
                </button>
              </div>
              <div className="card" style={{display:"flex",flexDirection:"column"}}>
                <div className="card-hd">
                  <span className="card-title">Generated Letter</span>
                  <div style={{display:"flex",gap:8}}>
                    {coverLetter&&(
                      <>
                        <button className="btn btn-sm btn-outline" onClick={()=>{navigator.clipboard.writeText(coverLetter);showToast("Copied!");}}>Copy</button>
                        <button className="btn btn-sm btn-success" onClick={()=>{const b=document.createElement("a");b.href="data:text/plain;charset=utf-8,"+encodeURIComponent(coverLetter);b.download="cover_letter.txt";b.click();}}>Download</button>
                      </>
                    )}
                  </div>
                </div>
                <div className="cover-box" style={{flex:1,minHeight:300}}>
                  {coverLetter||"Fill in the details on the left and click Generate."}
                </div>
              </div>
            </div>
          )}

          {/* MY RESUMES TAB */}
          {tab==="history" && (
            <div>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
                <div>
                  <h2 style={{fontFamily:"Fraunces,serif",fontSize:22,fontWeight:700,marginBottom:4}}>My Resumes</h2>
                  <p style={{color:"var(--muted)",fontSize:14}}>{resumes.length} resume{resumes.length!==1?"s":""} uploaded</p>
                </div>
                <button className="btn btn-primary" onClick={()=>setTab("ats")}>+ Upload New</button>
              </div>
              {loadingHistory?(
                <div style={{textAlign:"center",padding:60}}><div className="spinner" style={{margin:"0 auto"}}></div></div>
              ):resumes.length===0?(
                <div className="card" style={{textAlign:"center",padding:"60px 24px"}}>
                  <div style={{fontSize:48,marginBottom:16}}>📁</div>
                  <h3 style={{fontSize:17,marginBottom:8}}>No resumes yet</h3>
                  <p style={{color:"var(--muted)",fontSize:14,marginBottom:20}}>Upload your first resume to get started</p>
                  <button className="btn btn-primary" onClick={()=>setTab("ats")}>Upload Resume →</button>
                </div>
              ):(
                <div style={{display:"flex",flexDirection:"column",gap:14}}>
                  {resumes.map(r=>(
                    <div key={r._id} className="card" style={{display:"flex",alignItems:"center",gap:16,flexWrap:"wrap"}}>
                      <div style={{width:44,height:44,background:"var(--blue-lt)",borderRadius:"var(--r10)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,flexShrink:0}}>📄</div>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{fontWeight:700,fontSize:14,marginBottom:3,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{r.originalName}</div>
                        <div style={{fontSize:12.5,color:"var(--muted)"}}>
                          Uploaded {new Date(r.createdAt).toLocaleDateString()} ·{" "}
                          {r.analysisStatus==="complete"?`ATS Score: ${r.atsScore}`:"Not analyzed yet"}
                          {r.jobTitle?` · ${r.jobTitle}`:""}
                        </div>
                      </div>
                      <div style={{display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}>
                        {r.analysisStatus==="complete"&&(
                          <div style={{textAlign:"center"}}>
                            <div style={{fontFamily:"Fraunces,serif",fontSize:22,fontWeight:700,color:scColor(r.atsScore)}}>{r.atsScore}</div>
                            <div style={{fontSize:10,color:"var(--muted)",fontWeight:600}}>ATS SCORE</div>
                          </div>
                        )}
                        <span className={`tag ${r.analysisStatus==="complete"?"tag-blue":"tag-gray"}`}>
                          {r.analysisStatus==="complete"?"Analyzed":"Pending"}
                        </span>
                        <button className="btn btn-sm btn-danger" onClick={()=>deleteResume(r._id)}>Delete</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* PROFILE TAB */}
          {tab==="apply" && (
            <div style={{display:"flex",flexDirection:"column",gap:16,maxWidth:600,margin:"0 auto"}}>
              <div className="card" style={{textAlign:"center",padding:"40px 32px"}}>
                <div style={{fontSize:56,marginBottom:16}}>{applied ? "✅" : "📤"}</div>
                <h2 style={{fontSize:22,fontWeight:700,marginBottom:8}}>
                  {applied ? "Application Submitted!" : "Apply to HR Dashboard"}
                </h2>
                <p style={{color:"var(--muted)",fontSize:14,marginBottom:24,lineHeight:1.6}}>
                  {applied
                    ? "Your profile is now visible to HR administrators. They can review your resume, ATS score, and shortlist you for interviews."
                    : "Submit your application to make your profile visible to HR. Make sure you have uploaded and analyzed your resume first."
                  }
                </p>
                {!applied && (
                  <div style={{background:"var(--bg)",borderRadius:"var(--r12)",padding:16,marginBottom:24,textAlign:"left"}}>
                    <div style={{fontWeight:600,fontSize:14,marginBottom:10}}>Before applying, ensure you have:</div>
                    {[
                      ["📄", "Uploaded your resume", !!resume],
                      ["📊", "Run ATS analysis", !!result],
                      ["👤", "Set your target role", !!(user?.name && user?.targetRole)],
                    ].map(([icon, label, done]) => (
                      <div key={label} style={{display:"flex",alignItems:"center",gap:10,padding:"6px 0",fontSize:13}}>
                        <span>{done ? "✅" : "⬜"}</span>
                        <span style={{color: done ? "var(--text)" : "var(--muted)"}}>{icon} {label}</span>
                      </div>
                    ))}
                  </div>
                )}
                {applied ? (
                  <div style={{display:"flex",flexDirection:"column",gap:10}}>
                    <div style={{background:"#ECFDF5",border:"1px solid #6EE7B7",borderRadius:"var(--r12)",padding:14,fontSize:13,color:"#065F46"}}>
                      🎉 Your application is under review. HR will contact you if shortlisted.
                    </div>
                    <button className="btn btn-outline" onClick={()=>setTab("ats")}>📊 View My ATS Score</button>
                  </div>
                ) : (
                  <button
                    className="btn btn-primary"
                    style={{width:"100%",padding:14,fontSize:15,justifyContent:"center"}}
                    disabled={applying || !result}
                    onClick={async () => {
                      setApplying(true);
                      try {
                        await userAPI.applyToHR();
                        setApplied(true);
                        showToast("Application submitted successfully!");
                      } catch(err) {
                        showToast("Failed: " + (err.response?.data?.message || err.message), "error");
                      } finally { setApplying(false); }
                    }}
                  >
                    {applying ? "Submitting..." : "📤 Submit Application to HR"}
                  </button>
                )}
              </div>
              {result && (
                <div className="card">
                  <div className="card-hd"><span className="card-title">Your Current ATS Score</span></div>
                  <div style={{display:"flex",alignItems:"center",gap:20,padding:"8px 0"}}>
                    <ScoreRing score={result.atsScore} />
                    <div>
                      <div style={{fontSize:14,color:"var(--muted)",marginBottom:4}}>Analyzed for</div>
                      <div style={{fontWeight:700,fontSize:15}}>{jobTitle || "General Role"}</div>
                      <div style={{fontSize:13,color:"var(--muted)",marginTop:8}}>A higher ATS score improves your shortlisting chances</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {tab==="profile" && (
            <div className="grid-2">
              <div className="card">
                <div className="card-hd"><span className="card-title">Personal Information</span></div>
                <div style={{display:"flex",alignItems:"center",gap:16,marginBottom:24,padding:"16px",background:"var(--bg)",borderRadius:"var(--r12)"}}>
                  <div className="avatar av-blue" style={{width:56,height:56,fontSize:20}}>{initials(user?.name)}</div>
                  <div>
                    <div style={{fontWeight:700,fontSize:16}}>{user?.name}</div>
                    <div style={{fontSize:13,color:"var(--muted)"}}>{user?.email}</div>
                    <span className="tag tag-blue" style={{marginTop:6,display:"inline-flex"}}>{user?.targetRole||"No role set"}</span>
                  </div>
                </div>
                {[["name","Full Name","text"],["phone","Phone Number","tel"],["location","Location","text"],["linkedIn","LinkedIn URL","url"],["github","GitHub URL","url"]].map(([k,l,t])=>(
                  <div className="form-group" key={k}>
                    <label className="form-label">{l}</label>
                    <input className="form-input" type={t} placeholder={l} value={profileForm[k]||""} onChange={e=>setProfileForm(f=>({...f,[k]:e.target.value}))}/>
                  </div>
                ))}
                <div className="form-group">
                  <label className="form-label">Target Role</label>
                  <select className="form-select" value={profileForm.targetRole||""} onChange={e=>setProfileForm(f=>({...f,targetRole:e.target.value}))}>
                    <option value="">Select a role...</option>
                    <option>Frontend Engineer</option><option>Backend Engineer</option>
                    <option>Full Stack Engineer</option><option>Data Scientist</option>
                    <option>DevOps Engineer</option><option>Product Manager</option><option>UI/UX Designer</option>
                  </select>
                </div>
                <button className="btn btn-primary" style={{width:"100%",padding:11}} onClick={saveProfile} disabled={profileSaving}>
                  {profileSaving?"Saving...":"Save Profile"}
                </button>
              </div>
              <div style={{display:"flex",flexDirection:"column",gap:16}}>
                <div className="card">
                  <div className="card-hd"><span className="card-title">Account Stats</span></div>
                  {[["📊","Total Analyses",user?.totalAnalyses||0],["🎯","Best ATS Score",user?.lastAtsScore||"N/A"],["✅","Status",user?.status||"Active"],["📅","Member Since",new Date(user?.createdAt||Date.now()).toLocaleDateString()]].map(([icon,l,v])=>(
                    <div key={l} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 0",borderBottom:"1px solid var(--border)"}}>
                      <span style={{fontSize:13,color:"var(--muted)"}}>{icon} {l}</span>
                      <span style={{fontSize:13,fontWeight:700}}>{String(v)}</span>
                    </div>
                  ))}
                </div>
                <div className="card">
                  <div className="card-hd"><span className="card-title">Danger Zone</span></div>
                  <button className="btn btn-danger" style={{width:"100%",justifyContent:"center"}} onClick={()=>{logout();nav("/");}}>🚪 Sign Out</button>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
      {toast&&<div className={`toast ${toastType==="error"?"toast-error":""}`}>{toast}</div>}
    </div>
  );
}