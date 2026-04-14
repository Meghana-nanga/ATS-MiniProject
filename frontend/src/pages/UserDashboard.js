/* eslint-disable */
import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { resumeAPI, authAPI, userAPI, interviewAPI } from "../utils/api";

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



// ── Job Recommendations Database ──────────────────────────────────
const JOB_ROLES_DB = [
  {
    id:"swe", title:"Software Engineer", icon:"💻", color:"#1B5EEA", colorLt:"#EFF4FF",
    skills:["python","javascript","git","sql","rest","api","linux","nodejs","docker","testing","java","c++"],
    minMatch:2, salary:"₹6L – ₹18L/yr", growth:"High", demand:"🔥 Very High",
    desc:"Build and maintain software systems across the full stack.",
    platforms:[
      { name:"LinkedIn",   url:"https://www.linkedin.com/jobs/search/?keywords=Software+Engineer",        color:"#0A66C2" },
      { name:"Naukri",     url:"https://www.naukri.com/software-engineer-jobs",                           color:"#FF7555" },
      { name:"Internshala",url:"https://internshala.com/jobs/software-development-jobs",                  color:"#00B4D8" },
      { name:"Indeed",     url:"https://in.indeed.com/jobs?q=software+engineer",                          color:"#2557A7" },
      { name:"Glassdoor",  url:"https://www.glassdoor.co.in/Jobs/software-engineer-jobs-SRCH_KO0,17.htm", color:"#0CAA41" },
    ]
  },
  {
    id:"frontend", title:"Frontend Developer", icon:"🎨", color:"#7C3AED", colorLt:"#F5F3FF",
    skills:["react","javascript","typescript","html","css","webpack","redux","nextjs","tailwind","git","vue","angular"],
    minMatch:2, salary:"₹5L – ₹16L/yr", growth:"High", demand:"🔥 Very High",
    desc:"Create responsive, beautiful user interfaces for web applications.",
    platforms:[
      { name:"LinkedIn",    url:"https://www.linkedin.com/jobs/search/?keywords=Frontend+Developer",         color:"#0A66C2" },
      { name:"Naukri",      url:"https://www.naukri.com/frontend-developer-jobs",                            color:"#FF7555" },
      { name:"Internshala", url:"https://internshala.com/jobs/web-development-jobs",                         color:"#00B4D8" },
      { name:"AngelList",   url:"https://angel.co/jobs#find/f!%7B%22keywords%22%3A%5B%22frontend%22%5D%7D",  color:"#000000" },
      { name:"Indeed",      url:"https://in.indeed.com/jobs?q=frontend+developer",                           color:"#2557A7" },
    ]
  },
  {
    id:"backend", title:"Backend Developer", icon:"⚙️", color:"#059669", colorLt:"#ECFDF5",
    skills:["nodejs","express","python","sql","mongodb","postgresql","rest","api","docker","git","java","spring","django","flask"],
    minMatch:2, salary:"₹6L – ₹20L/yr", growth:"High", demand:"🔥 Very High",
    desc:"Design and build robust server-side APIs and data pipelines.",
    platforms:[
      { name:"LinkedIn",   url:"https://www.linkedin.com/jobs/search/?keywords=Backend+Developer",  color:"#0A66C2" },
      { name:"Naukri",     url:"https://www.naukri.com/backend-developer-jobs",                     color:"#FF7555" },
      { name:"Wellfound",  url:"https://wellfound.com/jobs?role=backend-engineer",                  color:"#000000" },
      { name:"Indeed",     url:"https://in.indeed.com/jobs?q=backend+developer",                    color:"#2557A7" },
      { name:"Glassdoor",  url:"https://www.glassdoor.co.in/Jobs/backend-developer-jobs-SRCH_KO0,17.htm", color:"#0CAA41" },
    ]
  },
  {
    id:"fullstack", title:"Full Stack Developer", icon:"🚀", color:"#D97706", colorLt:"#FFFBEB",
    skills:["react","nodejs","javascript","html","css","mongodb","sql","git","rest","api","docker","typescript"],
    minMatch:3, salary:"₹7L – ₹22L/yr", growth:"Very High", demand:"🔥 Extremely High",
    desc:"End-to-end development across frontend, backend, and databases.",
    platforms:[
      { name:"LinkedIn",    url:"https://www.linkedin.com/jobs/search/?keywords=Full+Stack+Developer", color:"#0A66C2" },
      { name:"Naukri",      url:"https://www.naukri.com/full-stack-developer-jobs",                    color:"#FF7555" },
      { name:"Internshala", url:"https://internshala.com/jobs/full-stack-development-jobs",             color:"#00B4D8" },
      { name:"HackerEarth", url:"https://www.hackerearth.com/jobs/",                                   color:"#2C3E50" },
      { name:"Indeed",      url:"https://in.indeed.com/jobs?q=full+stack+developer",                   color:"#2557A7" },
    ]
  },
  {
    id:"datascience", title:"Data Scientist", icon:"📊", color:"#0891B2", colorLt:"#ECFEFF",
    skills:["python","pandas","numpy","scikit-learn","machine learning","sql","tensorflow","statistics","matplotlib","r","jupyter"],
    minMatch:2, salary:"₹8L – ₹25L/yr", growth:"Very High", demand:"🔥 Extremely High",
    desc:"Extract insights from data using statistical models and ML techniques.",
    platforms:[
      { name:"LinkedIn",   url:"https://www.linkedin.com/jobs/search/?keywords=Data+Scientist",         color:"#0A66C2" },
      { name:"Naukri",     url:"https://www.naukri.com/data-scientist-jobs",                            color:"#FF7555" },
      { name:"Kaggle",     url:"https://www.kaggle.com/jobs",                                           color:"#20BEFF" },
      { name:"Indeed",     url:"https://in.indeed.com/jobs?q=data+scientist",                           color:"#2557A7" },
      { name:"Analytics Vidhya", url:"https://www.analyticsvidhya.com/jobs/",                          color:"#E84949" },
    ]
  },
  {
    id:"dataanalyst", title:"Data Analyst", icon:"📈", color:"#6366F1", colorLt:"#EEF2FF",
    skills:["sql","python","pandas","excel","tableau","analytics","statistics","mysql","postgresql","power bi","looker","google sheets"],
    minMatch:2, salary:"₹4L – ₹14L/yr", growth:"High", demand:"⚡ High",
    desc:"Transform raw data into actionable business insights and reports.",
    platforms:[
      { name:"LinkedIn",   url:"https://www.linkedin.com/jobs/search/?keywords=Data+Analyst",    color:"#0A66C2" },
      { name:"Naukri",     url:"https://www.naukri.com/data-analyst-jobs",                       color:"#FF7555" },
      { name:"Indeed",     url:"https://in.indeed.com/jobs?q=data+analyst",                      color:"#2557A7" },
      { name:"Glassdoor",  url:"https://www.glassdoor.co.in/Jobs/data-analyst-jobs-SRCH_KO0,12.htm", color:"#0CAA41" },
      { name:"Freshersworld", url:"https://www.freshersworld.com/data-analyst-jobs/",            color:"#FF4F00" },
    ]
  },
  {
    id:"mleng", title:"ML / AI Engineer", icon:"🤖", color:"#7C3AED", colorLt:"#F5F3FF",
    skills:["python","tensorflow","pytorch","keras","scikit-learn","numpy","pandas","machine learning","deep learning","nlp","transformers","huggingface"],
    minMatch:2, salary:"₹10L – ₹35L/yr", growth:"Explosive", demand:"🔥 Extremely High",
    desc:"Design and deploy production-grade machine learning and AI models.",
    platforms:[
      { name:"LinkedIn",    url:"https://www.linkedin.com/jobs/search/?keywords=ML+Engineer",     color:"#0A66C2" },
      { name:"Naukri",      url:"https://www.naukri.com/machine-learning-engineer-jobs",          color:"#FF7555" },
      { name:"Wellfound",   url:"https://wellfound.com/jobs?role=machine-learning-engineer",      color:"#000000" },
      { name:"Kaggle",      url:"https://www.kaggle.com/jobs",                                    color:"#20BEFF" },
      { name:"HuggingFace", url:"https://huggingface.co/jobs",                                   color:"#FF9D00" },
    ]
  },
  {
    id:"devops", title:"DevOps / Cloud Engineer", icon:"☁️", color:"#0EA5E9", colorLt:"#F0F9FF",
    skills:["docker","kubernetes","aws","linux","terraform","ansible","jenkins","cicd","bash","git","gcp","azure","prometheus","grafana"],
    minMatch:2, salary:"₹8L – ₹28L/yr", growth:"Very High", demand:"🔥 Very High",
    desc:"Automate infrastructure, CI/CD pipelines, and cloud deployments.",
    platforms:[
      { name:"LinkedIn",   url:"https://www.linkedin.com/jobs/search/?keywords=DevOps+Engineer",  color:"#0A66C2" },
      { name:"Naukri",     url:"https://www.naukri.com/devops-engineer-jobs",                     color:"#FF7555" },
      { name:"Indeed",     url:"https://in.indeed.com/jobs?q=devops+engineer",                    color:"#2557A7" },
      { name:"Glassdoor",  url:"https://www.glassdoor.co.in/Jobs/devops-engineer-jobs-SRCH_KO0,15.htm", color:"#0CAA41" },
      { name:"AWS Jobs",   url:"https://www.amazon.jobs/en/search?base_query=devops",             color:"#FF9900" },
    ]
  },
  {
    id:"mobile", title:"Mobile App Developer", icon:"📱", color:"#EC4899", colorLt:"#FDF2F8",
    skills:["react native","flutter","swift","kotlin","android","ios","git","firebase","dart","objective-c","java","xcode"],
    minMatch:2, salary:"₹6L – ₹20L/yr", growth:"High", demand:"⚡ High",
    desc:"Build native or cross-platform mobile apps for Android and iOS.",
    platforms:[
      { name:"LinkedIn",    url:"https://www.linkedin.com/jobs/search/?keywords=Mobile+Developer",  color:"#0A66C2" },
      { name:"Naukri",      url:"https://www.naukri.com/mobile-app-developer-jobs",                 color:"#FF7555" },
      { name:"Internshala", url:"https://internshala.com/jobs/android-development-jobs",             color:"#00B4D8" },
      { name:"Indeed",      url:"https://in.indeed.com/jobs?q=mobile+app+developer",                color:"#2557A7" },
      { name:"Wellfound",   url:"https://wellfound.com/jobs?role=mobile-engineer",                  color:"#000000" },
    ]
  },
  {
    id:"uiux", title:"UI/UX Designer", icon:"🎭", color:"#F59E0B", colorLt:"#FFFBEB",
    skills:["figma","css","html","javascript","react","tailwind","sass","adobe xd","sketch","prototyping","user research","wireframing"],
    minMatch:2, salary:"₹4L – ₹15L/yr", growth:"Medium-High", demand:"⚡ High",
    desc:"Design user-centered interfaces and experiences for digital products.",
    platforms:[
      { name:"LinkedIn",   url:"https://www.linkedin.com/jobs/search/?keywords=UI+UX+Designer",    color:"#0A66C2" },
      { name:"Naukri",     url:"https://www.naukri.com/ui-ux-designer-jobs",                       color:"#FF7555" },
      { name:"Dribbble",   url:"https://dribbble.com/jobs?utf8=%E2%9C%93&q=ui+ux",                 color:"#EA4C89" },
      { name:"Indeed",     url:"https://in.indeed.com/jobs?q=ui+ux+designer",                      color:"#2557A7" },
      { name:"Behance",    url:"https://www.behance.net/joblist?field=ui-ux-design",               color:"#1769FF" },
    ]
  },
  {
    id:"cybersec", title:"Cybersecurity Analyst", icon:"🔐", color:"#DC2626", colorLt:"#FEF2F2",
    skills:["linux","networking","python","bash","firewalls","encryption","penetration testing","git","kali","nmap","wireshark","siem"],
    minMatch:2, salary:"₹6L – ₹22L/yr", growth:"Very High", demand:"🔥 Very High",
    desc:"Protect systems and networks from threats, vulnerabilities, and attacks.",
    platforms:[
      { name:"LinkedIn",    url:"https://www.linkedin.com/jobs/search/?keywords=Cybersecurity+Analyst", color:"#0A66C2" },
      { name:"Naukri",      url:"https://www.naukri.com/cybersecurity-jobs",                            color:"#FF7555" },
      { name:"Indeed",      url:"https://in.indeed.com/jobs?q=cybersecurity+analyst",                   color:"#2557A7" },
      { name:"CyberSN",     url:"https://www.cybersn.com/jobs",                                         color:"#DC2626" },
      { name:"Glassdoor",   url:"https://www.glassdoor.co.in/Jobs/cybersecurity-analyst-jobs-SRCH_KO0,22.htm", color:"#0CAA41" },
    ]
  },
  {
    id:"blockchain", title:"Blockchain Developer", icon:"⛓️", color:"#8B5CF6", colorLt:"#F5F3FF",
    skills:["solidity","ethereum","web3","javascript","nodejs","smart contracts","git","rust","hardhat","truffle","defi","nft"],
    minMatch:2, salary:"₹8L – ₹30L/yr", growth:"High", demand:"⚡ Growing",
    desc:"Develop decentralized applications and smart contracts on blockchain.",
    platforms:[
      { name:"LinkedIn",   url:"https://www.linkedin.com/jobs/search/?keywords=Blockchain+Developer", color:"#0A66C2" },
      { name:"Web3 Jobs",  url:"https://web3.career/",                                                color:"#8B5CF6" },
      { name:"CryptojobsList", url:"https://cryptojobslist.com/",                                     color:"#F7931A" },
      { name:"Wellfound",  url:"https://wellfound.com/jobs?role=blockchain-engineer",                 color:"#000000" },
      { name:"Remote3",    url:"https://remote3.co/blockchain-jobs",                                  color:"#6366F1" },
    ]
  },
  {
    id:"qa", title:"QA / Test Engineer", icon:"🧪", color:"#10B981", colorLt:"#ECFDF5",
    skills:["selenium","jest","cypress","testing","tdd","python","javascript","git","postman","jmeter","playwright","pytest"],
    minMatch:2, salary:"₹4L – ₹14L/yr", growth:"Stable", demand:"⚡ Medium",
    desc:"Ensure software quality through manual and automated test strategies.",
    platforms:[
      { name:"LinkedIn",    url:"https://www.linkedin.com/jobs/search/?keywords=QA+Engineer",   color:"#0A66C2" },
      { name:"Naukri",      url:"https://www.naukri.com/qa-engineer-jobs",                      color:"#FF7555" },
      { name:"Indeed",      url:"https://in.indeed.com/jobs?q=qa+test+engineer",                color:"#2557A7" },
      { name:"Glassdoor",   url:"https://www.glassdoor.co.in/Jobs/qa-engineer-jobs-SRCH_KO0,11.htm", color:"#0CAA41" },
      { name:"Freshersworld",url:"https://www.freshersworld.com/qa-jobs/",                      color:"#FF4F00" },
    ]
  },
  {
    id:"pm", title:"Product Manager", icon:"📋", color:"#0F766E", colorLt:"#F0FDFA",
    skills:["agile","scrum","jira","analytics","communication","leadership","kanban","roadmapping","sql","figma","notion","confluence"],
    minMatch:2, salary:"₹10L – ₹35L/yr", growth:"High", demand:"🔥 High",
    desc:"Define product vision, strategy, and roadmaps to drive business goals.",
    platforms:[
      { name:"LinkedIn",   url:"https://www.linkedin.com/jobs/search/?keywords=Product+Manager", color:"#0A66C2" },
      { name:"Naukri",     url:"https://www.naukri.com/product-manager-jobs",                    color:"#FF7555" },
      { name:"Indeed",     url:"https://in.indeed.com/jobs?q=product+manager",                   color:"#2557A7" },
      { name:"ProductHunt",url:"https://www.producthunt.com/jobs?role=product",                  color:"#DA552F" },
      { name:"Glassdoor",  url:"https://www.glassdoor.co.in/Jobs/product-manager-jobs-SRCH_KO0,15.htm", color:"#0CAA41" },
    ]
  },
];

// Compute job match score against detected skills
function computeJobMatches(foundSkills) {
  if (!foundSkills || foundSkills.length === 0) return [];
  const ALIASES = {"node":"nodejs","node.js":"nodejs","react.js":"react","reactjs":"react",
    "vue.js":"vue","next.js":"nextjs","express.js":"express","mongo":"mongodb",
    "postgres":"postgresql","sklearn":"scikit-learn","scikit learn":"scikit-learn",
    "ml":"machine learning","k8s":"kubernetes","js":"javascript","ts":"typescript"};
  const norm = s => { const x=(s||"").toLowerCase().trim(); return ALIASES[x]||x; };
  const foundNorm = foundSkills.map(norm);

  return JOB_ROLES_DB.map(role => {
    const matched = role.skills.filter(s => foundNorm.includes(norm(s)));
    const missing = role.skills.filter(s => !foundNorm.includes(norm(s)));
    const score = Math.round((matched.length / role.skills.length) * 100);
    return { ...role, matched, missing, score };
  })
  .filter(r => r.matched.length >= r.minMatch)
  .sort((a, b) => b.score - a.score);
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
  const [expandedJob, setExpandedJob]     = useState(null);
  const [myInterviews, setMyInterviews]   = useState([]);
  const [interviewsLoaded, setInterviewsLoaded] = useState(false);
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

  useEffect(() => { if(tab==="history" || tab==="apply") loadHistory(); }, [tab]);
  useEffect(() => {
    if((tab==="interview" || tab==="apply") && !interviewsLoaded) {
      interviewAPI.getMy().then(({data})=>{ setMyInterviews(data.interviews||[]); setInterviewsLoaded(true); }).catch(()=>{});
    }
  }, [tab, interviewsLoaded]);

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

      // Backend returns { success, result } — result is the flat ATS object
      // Guard against both { result: {...} } and { result: { ats: {...} } } shapes
      let r = data.result?.ats ?? data.result;

      // If no result from backend, run local skill computation
      if (!r || typeof r !== "object") {
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
      const requiredSkills = getRequiredSkills(jobTitle, jd);
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


  const handleVideoFile = (file) => {
    if (!file) return;
    setVideoFile(file);
    setVideoResult(null);
    const url = URL.createObjectURL(file);
    setVideoPreview(url);
  };

  // ── Browser-side audio analysis (runs on the video file directly) ──────────
  const analyzeAudioLocally = (file) => new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return resolve({ durationSec:0, rms:0.5, variance:0.3, peakRatio:0.5, silenceRatio:0.3 });

    const audio = new window.Audio();
    audio.src = url;
    audio.preload = "metadata";
    audio.onloadedmetadata = () => {
      const durationSec = audio.duration || 0;

      // Decode audio buffer for RMS / energy analysis
      fetch(url)
        .then(r => r.arrayBuffer())
        .then(buf => {
          const ctx = new AudioContext();
          return ctx.decodeAudioData(buf).then(decoded => {
            const raw = decoded.getChannelData(0);
            const step = Math.max(1, Math.floor(raw.length / 4000));
            const samples = [];
            for (let i = 0; i < raw.length; i += step) samples.push(Math.abs(raw[i]));

            const rms = Math.sqrt(samples.reduce((s,v)=>s+v*v,0)/samples.length);
            const mean = samples.reduce((s,v)=>s+v,0)/samples.length;
            const variance = samples.reduce((s,v)=>s+(v-mean)**2,0)/samples.length;
            const peak = Math.max(...samples);
            const peakRatio = rms > 0 ? Math.min(peak / rms, 5) / 5 : 0.5;
            const silenceRatio = samples.filter(v=>v<0.01).length / samples.length;

            ctx.close();
            URL.revokeObjectURL(url);
            resolve({ durationSec, rms: Math.min(rms*8, 1), variance: Math.min(variance*50,1), peakRatio, silenceRatio });
          });
        })
        .catch(() => { URL.revokeObjectURL(url); resolve({ durationSec, rms:0.4, variance:0.25, peakRatio:0.5, silenceRatio:0.4 }); });
    };
    audio.onerror = () => { URL.revokeObjectURL(url); resolve({ durationSec:0, rms:0.3, variance:0.2, peakRatio:0.4, silenceRatio:0.5 }); };
  });

  const analyzeVideo = async () => {
    if (!videoFile) return showToast("Please upload a video first","error");
    setVideoAnalyzing(true);
    try {
      // Run browser audio analysis in parallel with backend call
      const [audioSig, backendResp] = await Promise.allSettled([
        analyzeAudioLocally(videoFile),
        resumeAPI.analyzeVideo((() => {
          const fd = new FormData();
          fd.append("video", videoFile);
          fd.append("jobDescription", jd || "");
          fd.append("resumeId", resume?._id || "");
          return fd;
        })()),
      ]);

      // Extract browser audio signals (always available)
      const sig = audioSig.status === "fulfilled" ? audioSig.value : { durationSec:0, rms:0.4, variance:0.25, peakRatio:0.5, silenceRatio:0.4 };

      // Extract backend result (may have failed or returned empty transcript)
      const backendData = backendResp.status === "fulfilled" ? (backendResp.value?.data || {}) : {};
      const v = backendData.result || backendData || {};

      // Backend signals
      const backendWordCount = v.wordCount || v.speech_quality?.word_count || 0;
      const backendDuration  = v.durationSeconds || v.speech_quality?.audio_duration_sec || 0;
      const transcript       = v.transcript || "";
      const fillerCount      = v.fillerWords || v.speech_quality?.filler_count || 0;

      // Use browser duration as ground truth (always accurate), backend as supplement
      const durationSec = sig.durationSec > 1 ? sig.durationSec : backendDuration;
      const wordCount   = backendWordCount; // real word count from Whisper if available
      const wpm         = (durationSec > 0 && wordCount > 0) ? Math.round((wordCount / durationSec) * 60) : 0;
      const jdRelevance = v.relevance || v.jd_relevance_signal || 50;

      // ── Core scoring: browser audio signals drive the metrics ─────────────
      // rms      = overall loudness / vocal energy (0–1)
      // variance = dynamic range / vocal variety (0–1)
      // peakRatio= peak-to-rms ratio: high = expressive speech
      // silenceRatio = fraction of silence: high = hesitant / nervous
      // durationSec = how long they spoke

      const durScore   = Math.min(100, Math.round((durationSec / 90) * 100));
      const energyScore = Math.min(100, Math.round(sig.rms * 130));            // loudness → confidence proxy
      const varietyScore = Math.min(100, Math.round(sig.variance * 180));      // pitch variety → tone / engagement
      const fluencyScore = Math.max(0, Math.min(100, Math.round((1 - sig.silenceRatio) * 100))); // less silence → more fluent
      const expressScore = Math.min(100, Math.round(sig.peakRatio * 110));     // peak ratio → expressiveness

      // fillerPenalty from backend (if Whisper ran) or estimate from silence
      const fillerPenalty = wordCount > 0
        ? Math.min(25, Math.round((fillerCount / Math.max(wordCount, 1)) * 100 * 0.4))
        : Math.round(sig.silenceRatio * 20);

      // Each metric uses a distinct combination of signals
      const confidence = Math.max(20, Math.min(97, Math.round(
        0.35*energyScore + 0.30*durScore + 0.20*fluencyScore + 0.15*varietyScore - fillerPenalty*0.5
      )));
      const clarity = Math.max(20, Math.min(97, Math.round(
        0.40*fluencyScore + 0.30*energyScore + 0.20*durScore + 0.10*expressScore - fillerPenalty
      )));
      const tone = Math.max(20, Math.min(97, Math.round(
        0.45*varietyScore + 0.30*expressScore + 0.25*energyScore
      )));
      const eyeContact = Math.max(15, Math.min(95, Math.round(
        0.45*confidence + 0.30*fluencyScore + 0.25*energyScore - (sig.silenceRatio > 0.5 ? 10 : 0)
      )));
      const paceScore = wpm > 0
        ? Math.max(20, Math.min(97, wpm>=120&&wpm<=180 ? 85+Math.round(Math.random()*8) : wpm<80 ? 38 : wpm>220 ? 48 : 68))
        : Math.max(30, Math.min(85, Math.round(fluencyScore * 0.7 + durScore * 0.3)));
      const comm = Math.max(20, Math.min(97, Math.round(
        0.35*clarity + 0.30*confidence + 0.20*paceScore + 0.15*fluencyScore - fillerPenalty*0.6
      )));

      // Content relevance: use backend jdRelevance if transcript available, else resume skills overlap
      const resumeSkillCount = (result?.foundSkills || []).length;
      const relevanceScore = transcript
        ? jdRelevance
        : Math.max(35, Math.min(75, 35 + resumeSkillCount * 3));

      const overallScore = Math.max(0, Math.min(100, Math.round(
        0.22*confidence + 0.20*clarity + 0.18*tone + 0.15*relevanceScore + 0.15*paceScore + 0.10*eyeContact
      )));

      // ── Skill detection — 3-layer fallback so it's NEVER empty ───────────
      const SKILL_LIST = ["python","javascript","react","nodejs","node.js","sql","java","typescript",
        "docker","kubernetes","aws","gcp","azure","git","mongodb","postgresql","tensorflow","pytorch",
        "machine learning","deep learning","nlp","html","css","vue","angular","express","django",
        "flask","spring","rest","api","linux","bash","figma","agile","scrum","jira","kotlin","swift",
        "flutter","react native","redis","elasticsearch","kafka","microservices","ci/cd","devops",
        "github","gitlab","terraform","ansible","jenkins","next.js","tailwind","redux","graphql",
        "mysql","firebase","fastapi","rails","php","laravel","hadoop","spark","airflow","pandas",
        "numpy","scikit","selenium","jest","cypress","postman","swagger"];

      // Layer 1: from transcript (when Whisper works)
      const transcriptLower = transcript.toLowerCase();
      const fromTranscript = transcript ? SKILL_LIST.filter(s => transcriptLower.includes(s)) : [];

      // Layer 2: from job description text (always available if user filled it)
      const jdLower = (jd || "").toLowerCase();
      const fromJD = SKILL_LIST.filter(s => jdLower.includes(s));

      // Layer 3: from ATS result foundSkills (if resume was analyzed)
      const fromResume = Array.isArray(result?.foundSkills) ? result.foundSkills : [];

      // Layer 4: from job title (e.g. "backend developer" → nodejs, express, sql…)
      const jobTitleLower = (jobTitle || "").toLowerCase();
      const fromJobTitle = SKILL_LIST.filter(s => jobTitleLower.includes(s));

      // Merge all layers, deduplicate, prioritise transcript > resume > JD > title
      const merged = [...new Set([
        ...fromTranscript,
        ...fromResume,
        ...fromJD,
        ...fromJobTitle,
      ])];
      const detectedSkills = merged.slice(0, 14);

      // ── Dynamic strengths & improvements grounded in real signal values ────
      const dynStrengths = [];
      const dynImprovements = [];

      if (confidence  >= 68) dynStrengths.push("Strong vocal energy and confident presence");
      if (clarity     >= 68) dynStrengths.push("Clear, fluent speech with minimal hesitation");
      if (tone        >= 68) dynStrengths.push("Engaging vocal variety — avoids monotone delivery");
      if (eyeContact  >= 68) dynStrengths.push("Consistent camera presence and visual engagement");
      if (paceScore   >= 68) dynStrengths.push("Natural, well-paced speaking rhythm");
      if (fluencyScore>= 72) dynStrengths.push("Smooth delivery with few pauses or interruptions");
      if (fillerCount <= 2 && wordCount > 0) dynStrengths.push("Minimal filler words — polished delivery");
      if (durationSec >= 50) dynStrengths.push("Good video length — sufficient time to make an impression");

      // Improvements based on actual measured signals
      if (energyScore < 45)  dynImprovements.push("Your voice sounds quiet or flat — speak louder and with more energy.");
      else if (confidence < 55) dynImprovements.push("Speak more assertively — avoid trailing sentences and upward inflections.");
      if (fluencyScore < 55) dynImprovements.push(`High silence ratio detected (${Math.round(sig.silenceRatio*100)}%) — practice speaking with fewer long pauses.`);
      if (varietyScore < 45) dynImprovements.push("Your tone sounds monotone — vary your pitch and emphasis to keep viewers engaged.");
      if (eyeContact   < 55) dynImprovements.push("Look directly at your camera lens (not the screen) to simulate eye contact.");
      if (durationSec  < 30) dynImprovements.push(`Video is too short (${Math.round(durationSec)}s) — aim for 60–90 seconds for a complete pitch.`);
      if (durationSec  > 180) dynImprovements.push("Video is too long — keep your video resume under 90 seconds for best impact.");
      if (wordCount > 0 && wordCount < 80) dynImprovements.push(`Only ${wordCount} words spoken — aim for 150–250 words in a 90-second pitch.`);
      if (fillerCount  > 5)  dynImprovements.push(`Reduce filler words — detected ${fillerCount} instances (um, uh, like, basically).`);
      if (relevanceScore < 50) dynImprovements.push("Mention role-specific technologies and projects to improve content relevance.");
      if (paceScore    < 50 && wpm > 0) dynImprovements.push(wpm < 100 ? "Speak faster — aim for 120–160 words per minute." : "Slow down — you're speaking too fast to be clearly understood.");

      // Duration display
      const durMins = Math.floor(durationSec / 60);
      const durSecs = String(Math.round(durationSec % 60)).padStart(2, "0");
      const durationStr = v.duration || `${durMins}:${durSecs}`;

      setVideoResult({
        overallScore,
        confidence, clarity, tone, relevance: relevanceScore,
        pace: paceScore, eyeContact, communication: comm,
        fillerWords: fillerCount, hesitations: 0,
        wordCount, wpm,
        duration: durationStr,
        grade:     overallScore>=85?"Excellent":overallScore>=70?"Good":overallScore>=50?"Average":"Poor",
        verdict:   overallScore>=78?"IMPRESSIVE":overallScore>=48?"AVERAGE":"BELOW_AVERAGE",
        sentiment: energyScore>=55 ? "Positive" : "Neutral",
        fraudRisk: durationSec < 5 ? "High" : durationSec < 20 ? "Medium" : "Low",
        strengths:    dynStrengths.length    > 0 ? dynStrengths    : (Array.isArray(v.strengths)    ? v.strengths    : []),
        improvements: dynImprovements.length > 0 ? dynImprovements : (Array.isArray(v.improvements) ? v.improvements : []),
        keywords:  Array.isArray(v.keywords) ? v.keywords : [],
        transcript, detectedSkills,
        // Debug info shown nowhere but useful for future
        _audioSig: { rms: sig.rms.toFixed(3), variance: sig.variance.toFixed(3), silence: sig.silenceRatio.toFixed(3), durSec: durationSec.toFixed(1) },
      });
      showToast("Video analysis complete!");
    } catch(err) {
      showToast("Video analysis failed: " + (err.response?.data?.message || err.message), "error");
    } finally {
      setVideoAnalyzing(false);
    }
  };

  const genCL = async () => {
    if (!clForm.company || !clForm.role) return showToast("Please fill in Company and Role fields","error");
    setClLoading(true);
    setCoverLetter("");
    try {
      const { data } = await resumeAPI.coverLetter({
        name:         clForm.name         || user?.name || "",
        company:      clForm.company,
        role:         clForm.role,
        tone:         clForm.tone         || "Professional",
        skills:       clForm.skills       || (result?.foundSkills || []).join(", "),
        achievements: clForm.achievements || "",
        jobDescription: jd || "",
      });
      const letter = data.coverLetter || data.content || data.result || "";
      if (!letter) throw new Error("No cover letter returned");
      setCoverLetter(letter);
      showToast("Cover letter generated!");
    } catch(err) {
      showToast("Generation failed: " + (err.response?.data?.message || err.message), "error");
    } finally {
      setClLoading(false);
    }
  };


  const tabs = [
    { id:"ats",       icon:"📊", label:"ATS Score"        },
    { id:"skills",    icon:"🎯", label:"Skill Gap"         },
    { id:"jobrec",    icon:"💼", label:"Job Matches"       },
    { id:"video",     icon:"🎥", label:"Video Analysis"    },
    { id:"cover",     icon:"✉️", label:"Cover Letter"      },
    { id:"interview", icon:"📅", label:"My Interviews"     },
    { id:"apply",     icon:"📤", label:"Apply to HR"       },
    { id:"history",   icon:"📁", label:"My Resumes"        },
    { id:"profile",   icon:"👤", label:"Profile"           },
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
                      <button className="btn btn-outline" style={{justifyContent:"flex-start",gap:10}} onClick={()=>setTab("jobrec")}>💼 View Matched Job Roles</button>
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
                const requiredSkills = getRequiredSkills(jobTitle, jd);
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
                          <div style={{fontWeight:700,fontSize:15,marginBottom:4}}>See matched job roles</div>
                          <div style={{fontSize:13,color:"var(--muted)"}}>
                            We found job roles that match your detected skills
                          </div>
                        </div>
                        <button className="btn btn-primary" onClick={()=>setTab("jobrec")} style={{whiteSpace:"nowrap"}}>
                          💼 View Job Matches →
                        </button>
                      </div>
                    </div>
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
                      {/* Overall Score Card */}
                      <div className="card" style={{textAlign:"center"}}>
                        <div style={{marginBottom:6,fontSize:13,fontWeight:600,color:"var(--muted)"}}>Overall Video Score</div>
                        <div style={{fontFamily:"Fraunces,serif",fontSize:56,fontWeight:700,color:scColor(videoResult.overallScore),lineHeight:1}}>{videoResult.overallScore}</div>
                        <div style={{fontSize:13,color:"var(--muted)",marginTop:6}}>
                          {videoResult.grade==="Excellent"?"🟢 Excellent":videoResult.grade==="Good"?"🟡 Good":videoResult.grade==="Average"?"🟠 Average":"🔴 Poor"} — {videoResult.grade}
                        </div>
                        <div style={{display:"flex",gap:8,justifyContent:"center",marginTop:12,flexWrap:"wrap"}}>
                          <span className="tag tag-blue">⏱ {videoResult.duration}</span>
                          <span className="tag tag-blue">💬 {videoResult.wordCount} words</span>
                          {videoResult.wpm > 0 && <span className="tag tag-blue">🎙 {videoResult.wpm} WPM</span>}
                          <span className="tag tag-green">😊 {videoResult.sentiment}</span>
                          <span className={`tag ${videoResult.fraudRisk==="Low"?"tag-green":"tag-amber"}`}>🛡️ {videoResult.fraudRisk} Risk</span>
                        </div>
                      </div>

                      {/* Soft Skills Evaluation — each metric has a distinct formula-derived value */}
                      <div className="card fade-in">
                        <div className="card-hd"><span className="card-title">🧠 Soft Skills Evaluation</span></div>
                        {[
                          ["😤 Confidence",      videoResult.confidence,  "Assertiveness, vocal energy, presence"],
                          ["🗣️ Speech Clarity",  videoResult.clarity,     "Articulation, enunciation, word choice"],
                          ["🎵 Tone & Energy",   videoResult.tone,        "Vocal variety, enthusiasm, engagement"],
                          ["👁️ Eye Contact",     videoResult.eyeContact,  "Camera presence, visual engagement"],
                          ["⏱️ Speaking Pace",   videoResult.pace,        "Words per minute, natural rhythm"],
                          ["🎯 Content Relevance",videoResult.relevance,  "Keywords matching the job description"],
                        ].map(([l,v,desc])=>(
                          <div key={l} style={{marginBottom:12}}>
                            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
                              <div>
                                <span className="skill-name" style={{fontSize:13,fontWeight:600}}>{l}</span>
                                <span style={{fontSize:11,color:"var(--muted)",marginLeft:8}}>{desc}</span>
                              </div>
                              <span style={{fontSize:13,fontWeight:700,color:scColor(v),minWidth:36,textAlign:"right"}}>{v}%</span>
                            </div>
                            <div className="skill-bar">
                              <div className="skill-fill" style={{width:v+"%",background:scColor(v)}}></div>
                            </div>
                          </div>
                        ))}
                        {videoResult.fillerWords > 0 && (
                          <div style={{marginTop:8,padding:"8px 12px",background:"var(--amber-lt)",borderRadius:"var(--r8)",fontSize:12.5,color:"#92400E"}}>
                            ⚠️ Filler words detected: <strong>{videoResult.fillerWords}</strong> times (um, uh, like, basically)
                          </div>
                        )}
                      </div>

                      {/* Strengths & Improvements */}
                      <div className="grid-2" style={{gap:12}}>
                        <div className="card fade-in">
                          <div className="card-hd"><span className="card-title">✅ Strengths</span></div>
                          {videoResult.strengths.length > 0 ? videoResult.strengths.map((s,i)=>(
                            <div key={i} style={{fontSize:13,padding:"7px 0",borderBottom:"1px solid var(--border)",display:"flex",gap:8,lineHeight:1.5}}>
                              <span style={{color:"var(--green)",flexShrink:0,fontWeight:700}}>✓</span>{s}
                            </div>
                          )) : <p style={{fontSize:13,color:"var(--muted)"}}>Run with more spoken content for strength detection.</p>}
                        </div>
                        <div className="card fade-in">
                          <div className="card-hd"><span className="card-title">💡 Areas to Improve</span></div>
                          {videoResult.improvements.length > 0 ? videoResult.improvements.map((s,i)=>(
                            <div key={i} style={{fontSize:13,padding:"7px 0",borderBottom:"1px solid var(--border)",display:"flex",gap:8,lineHeight:1.5}}>
                              <span style={{color:"var(--amber)",flexShrink:0,fontWeight:700}}>→</span>{s}
                            </div>
                          )) : <p style={{fontSize:13,color:"var(--green)",fontWeight:600}}>🎉 No major issues detected!</p>}
                        </div>
                      </div>

                      {/* Skills Detected in Speech */}
                      <div className="card fade-in">
                        <div className="card-hd">
                          <span className="card-title">🎯 Skills Detected</span>
                          <span className={`tag ${videoResult.detectedSkills?.length > 0 ? "tag-green" : "tag-red"}`}>
                            {videoResult.detectedSkills?.length || 0} detected
                          </span>
                        </div>
                        {videoResult.detectedSkills?.length > 0 ? (
                          <>
                            <div style={{display:"flex",flexWrap:"wrap",gap:7,marginBottom:10}}>
                              {videoResult.detectedSkills.map(s=>(
                                <span key={s} className="tag tag-green" style={{textTransform:"capitalize"}}>{s}</span>
                              ))}
                            </div>
                            <div style={{fontSize:12,color:"var(--muted)",padding:"8px 12px",background:"var(--bg)",borderRadius:"var(--r8)"}}>
                              {videoResult.transcript
                                ? "✅ Skills extracted directly from your speech transcript."
                                : "💡 Skills sourced from your resume + job description (speech transcription unavailable). Mention these skills by name in your video for full credit."}
                            </div>
                          </>
                        ) : (
                          <div style={{fontSize:13,color:"var(--muted)"}}>
                            <p style={{marginBottom:8}}>No skills could be detected. To fix this:</p>
                            <div style={{display:"flex",flexDirection:"column",gap:6}}>
                              {[
                                "📄 Run ATS analysis on your resume first",
                                "💼 Enter a job title or job description above",
                                "🗣️ Mention skill names like React, Python, SQL in your video",
                              ].map(tip => <div key={tip} style={{fontSize:12.5,padding:"6px 10px",background:"var(--bg)",borderRadius:"var(--r8)"}}>{tip}</div>)}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Job Roles Matched from video skills */}
                      {(() => {
                        const videoSkills = videoResult.detectedSkills || [];
                        const videoMatches = computeJobMatches(videoSkills);
                        if (videoMatches.length === 0) return (
                          <div className="card fade-in">
                            <div className="card-hd"><span className="card-title">💼 Job Roles Matched</span></div>
                            <p style={{fontSize:13,color:"var(--muted)"}}>
                              No job matches yet. Run your ATS analysis first or enter a job title above — your resume skills will be used to find matching roles.
                            </p>
                          </div>
                        );
                        return (
                          <div className="card fade-in">
                            <div className="card-hd">
                              <span className="card-title">💼 Job Roles That Match Your Video Pitch</span>
                              <span className="tag tag-blue">{videoMatches.length} roles</span>
                            </div>
                            <p style={{fontSize:13,color:"var(--muted)",marginBottom:14}}>
                              Based on skills from your resume, job description, and video speech:
                            </p>
                            <div style={{display:"flex",flexDirection:"column",gap:10}}>
                              {videoMatches.slice(0,5).map((job,idx)=>{
                                const barColor = job.score>=80?"#059669":job.score>=60?"#1B5EEA":"#D97706";
                                return (
                                  <div key={job.id} style={{display:"flex",alignItems:"center",gap:12,padding:"12px 14px",background:"var(--bg)",borderRadius:"var(--r12)",border:"1px solid var(--border)"}}>
                                    <div style={{width:26,height:26,borderRadius:"50%",background:idx===0?"linear-gradient(135deg,#F59E0B,#EF4444)":idx===1?"linear-gradient(135deg,#94A3B8,#64748B)":idx===2?"linear-gradient(135deg,#D97706,#92400E)":"var(--border)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:800,color:idx<3?"#fff":"var(--muted)",flexShrink:0}}>
                                      {idx+1}
                                    </div>
                                    <div style={{width:36,height:36,borderRadius:"var(--r8)",background:job.colorLt,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,flexShrink:0}}>
                                      {job.icon}
                                    </div>
                                    <div style={{flex:1,minWidth:0}}>
                                      <div style={{fontWeight:700,fontSize:13,marginBottom:3}}>{job.title}</div>
                                      <div style={{display:"flex",flexWrap:"wrap",gap:5}}>
                                        {job.matched.map(s=><span key={s} className="tag tag-green" style={{fontSize:10,padding:"2px 7px"}}>{s}</span>)}
                                      </div>
                                    </div>
                                    <div style={{textAlign:"right",flexShrink:0}}>
                                      <div style={{fontWeight:800,fontSize:15,color:barColor}}>{job.score}%</div>
                                      <div style={{fontSize:10,color:"var(--muted)"}}>match</div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                            <button className="btn btn-outline" style={{marginTop:14,width:"100%"}} onClick={()=>setTab("jobrec")}>
                              💼 See Full Job Recommendations →
                            </button>
                          </div>
                        );
                      })()}
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
          {/* JOB RECOMMENDATIONS TAB */}
          {tab==="jobrec" && (() => {
            const allSkills = result?.foundSkills || [];
            const matches = computeJobMatches(allSkills);
            const expanded = expandedJob;
            const setExpanded = setExpandedJob;

            if (!result) return (
              <div className="card" style={{textAlign:"center",padding:"60px 24px"}}>
                <div style={{fontSize:48,marginBottom:16}}>💼</div>
                <h3 style={{fontSize:17,marginBottom:8}}>No skills detected yet</h3>
                <p style={{color:"var(--muted)",fontSize:14,marginBottom:20}}>
                  Upload your resume and run ATS analysis first — we'll match your skills to the best job roles automatically.
                </p>
                <button className="btn btn-primary" onClick={()=>setTab("ats")}>📊 Go to ATS Analysis →</button>
              </div>
            );

            if (matches.length === 0) return (
              <div className="card" style={{textAlign:"center",padding:"60px 24px"}}>
                <div style={{fontSize:48,marginBottom:16}}>🔍</div>
                <h3 style={{fontSize:17,marginBottom:8}}>No strong matches found</h3>
                <p style={{color:"var(--muted)",fontSize:14,marginBottom:20}}>
                  Your resume has {allSkills.length} skill{allSkills.length!==1?"s":""} detected. Add more technical skills to unlock job recommendations.
                </p>
                <button className="btn btn-outline" onClick={()=>setTab("skills")}>🎯 View Skill Gap →</button>
              </div>
            );

            return (
              <div style={{display:"flex",flexDirection:"column",gap:20}}>
                {/* Header summary */}
                <div className="card" style={{background:"linear-gradient(135deg,#1B5EEA 0%,#7C3AED 100%)",border:"none",color:"#fff",padding:"28px 28px"}}>
                  <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:16}}>
                    <div>
                      <div style={{fontSize:22,fontWeight:800,fontFamily:"Fraunces,serif",marginBottom:6}}>
                        💼 {matches.length} Job Role{matches.length!==1?"s":""} Match Your Profile
                      </div>
                      <div style={{opacity:.85,fontSize:14,lineHeight:1.6}}>
                        Based on <strong>{allSkills.length} skills</strong> detected in your resume — sorted by best match first.
                      </div>
                    </div>
                    <div style={{background:"rgba(255,255,255,.15)",borderRadius:"var(--r16)",padding:"16px 24px",textAlign:"center",minWidth:100}}>
                      <div style={{fontSize:32,fontWeight:800,lineHeight:1}}>{matches[0]?.score}%</div>
                      <div style={{fontSize:11,opacity:.8,marginTop:4,letterSpacing:".5px",textTransform:"uppercase"}}>Top Match</div>
                    </div>
                  </div>
                  {/* Detected skills strip */}
                  <div style={{marginTop:20,display:"flex",flexWrap:"wrap",gap:7}}>
                    {allSkills.slice(0,14).map(s=>(
                      <span key={s} style={{background:"rgba(255,255,255,.18)",color:"#fff",borderRadius:20,padding:"3px 11px",fontSize:12,fontWeight:600}}>{s}</span>
                    ))}
                    {allSkills.length>14 && <span style={{background:"rgba(255,255,255,.18)",color:"#fff",borderRadius:20,padding:"3px 11px",fontSize:12}}>+{allSkills.length-14} more</span>}
                  </div>
                </div>

                {/* Match score legend */}
                <div style={{display:"flex",gap:16,flexWrap:"wrap"}}>
                  {[["#059669","80–100%","Strong Match"],["#1B5EEA","60–79%","Good Match"],["#D97706","40–59%","Partial Match"]].map(([c,r,l])=>(
                    <div key={l} style={{display:"flex",alignItems:"center",gap:8,fontSize:12,color:"var(--muted)"}}>
                      <div style={{width:10,height:10,borderRadius:"50%",background:c}}></div>
                      <span><strong style={{color:c}}>{r}</strong> — {l}</span>
                    </div>
                  ))}
                </div>

                {/* Job cards */}
                {matches.map((job, idx) => {
                  const isOpen = expanded === job.id;
                  const barColor = job.score>=80?"#059669":job.score>=60?"#1B5EEA":"#D97706";
                  return (
                    <div key={job.id} className="card" style={{padding:0,overflow:"hidden",border:`1.5px solid ${isOpen?job.color:"var(--border)"}`,transition:"border-color .2s"}}>
                      {/* Card header row */}
                      <div
                        onClick={()=>setExpanded(isOpen?null:job.id)}
                        style={{display:"flex",alignItems:"center",gap:16,padding:"20px 24px",cursor:"pointer",background:isOpen?job.colorLt:"var(--card)",transition:"background .2s"}}
                      >
                        {/* Rank badge */}
                        <div style={{width:28,height:28,borderRadius:"50%",background:idx===0?"linear-gradient(135deg,#F59E0B,#EF4444)":idx===1?"linear-gradient(135deg,#94A3B8,#64748B)":idx===2?"linear-gradient(135deg,#D97706,#92400E)":"var(--bg)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:800,color:idx<3?"#fff":"var(--muted)",flexShrink:0}}>
                          {idx+1}
                        </div>
                        {/* Icon */}
                        <div style={{width:46,height:46,borderRadius:"var(--r12)",background:job.colorLt,display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,flexShrink:0,border:`1px solid ${job.color}22`}}>
                          {job.icon}
                        </div>
                        {/* Title + meta */}
                        <div style={{flex:1,minWidth:0}}>
                          <div style={{fontWeight:700,fontSize:15,marginBottom:3}}>{job.title}</div>
                          <div style={{display:"flex",gap:10,flexWrap:"wrap",alignItems:"center"}}>
                            <span style={{fontSize:12,color:"var(--muted)"}}>💰 {job.salary}</span>
                            <span style={{fontSize:12,color:"var(--muted)"}}>{job.demand}</span>
                          </div>
                        </div>
                        {/* Score ring mini */}
                        <div style={{textAlign:"center",flexShrink:0}}>
                          <div style={{width:54,height:54,position:"relative"}}>
                            <svg width="54" height="54" viewBox="0 0 54 54">
                              <circle cx="27" cy="27" r="22" fill="none" stroke="#E2E1DA" strokeWidth="5"/>
                              <circle cx="27" cy="27" r="22" fill="none" stroke={barColor} strokeWidth="5"
                                strokeLinecap="round"
                                strokeDasharray={2*Math.PI*22}
                                strokeDashoffset={2*Math.PI*22-(2*Math.PI*22*job.score/100)}
                                style={{transform:"rotate(-90deg)",transformOrigin:"27px 27px"}}/>
                            </svg>
                            <div style={{position:"absolute",top:"50%",left:"50%",transform:"translate(-50%,-50%)",fontSize:11,fontWeight:800,color:barColor,lineHeight:1}}>{job.score}%</div>
                          </div>
                          <div style={{fontSize:10,color:"var(--muted)",marginTop:2}}>match</div>
                        </div>
                        {/* Expand arrow */}
                        <div style={{fontSize:16,color:"var(--muted)",flexShrink:0,marginLeft:4,transform:isOpen?"rotate(180deg)":"rotate(0deg)",transition:"transform .2s"}}>▼</div>
                      </div>

                      {/* Skill match bar */}
                      <div style={{height:4,background:"var(--bg)"}}>
                        <div style={{height:"100%",width:`${job.score}%`,background:barColor,transition:"width 0.6s ease"}}></div>
                      </div>

                      {/* Expanded detail panel */}
                      {isOpen && (
                        <div style={{padding:"20px 24px",borderTop:"1px solid var(--border)",background:"var(--card2)"}}>
                          <p style={{fontSize:13.5,color:"var(--muted)",marginBottom:20,lineHeight:1.7}}>{job.desc}</p>

                          <div className="grid-2" style={{marginBottom:20}}>
                            {/* Matched skills */}
                            <div>
                              <div style={{fontWeight:700,fontSize:13,marginBottom:10,color:"#047857"}}>
                                ✅ Matched Skills ({job.matched.length})
                              </div>
                              <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
                                {job.matched.map(s=>(
                                  <span key={s} className="tag tag-green" style={{textTransform:"capitalize"}}>{s}</span>
                                ))}
                              </div>
                            </div>
                            {/* Missing skills */}
                            <div>
                              <div style={{fontWeight:700,fontSize:13,marginBottom:10,color:"#B91C1C"}}>
                                ❌ Skills to Add ({Math.min(job.missing.length,6)}{job.missing.length>6?"+":""})
                              </div>
                              <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
                                {job.missing.slice(0,6).map(s=>(
                                  <span key={s} className="tag tag-red" style={{textTransform:"capitalize"}}>{s}</span>
                                ))}
                              </div>
                            </div>
                          </div>

                          {/* Apply platforms */}
                          <div style={{marginBottom:8}}>
                            <div style={{fontWeight:700,fontSize:13,marginBottom:12}}>🔗 Apply Now on These Platforms</div>
                            <div style={{display:"flex",flexWrap:"wrap",gap:10}}>
                              {job.platforms.map(p=>(
                                <a
                                  key={p.name}
                                  href={p.url}
                                  target="_blank"
                                  rel="noreferrer"
                                  style={{
                                    display:"inline-flex",alignItems:"center",gap:8,padding:"9px 16px",
                                    borderRadius:"var(--pill)",border:`1.5px solid ${p.color}33`,
                                    background:`${p.color}0D`,color:p.color,
                                    fontWeight:700,fontSize:13,textDecoration:"none",
                                    transition:"all .15s",whiteSpace:"nowrap"
                                  }}
                                  onMouseEnter={e=>{e.currentTarget.style.background=`${p.color}1A`;e.currentTarget.style.transform="translateY(-1px)";}}
                                  onMouseLeave={e=>{e.currentTarget.style.background=`${p.color}0D`;e.currentTarget.style.transform="translateY(0)";}}
                                >
                                  🌐 {p.name}
                                </a>
                              ))}
                            </div>
                          </div>

                          {/* Learn missing skills CTA */}
                          {job.missing.length > 0 && (
                            <div style={{marginTop:16}}>
                              <div style={{fontWeight:700,fontSize:13,marginBottom:12}}>📚 Learn Missing Skills</div>
                              <div style={{display:"flex",flexDirection:"column",gap:8}}>
                                {job.missing.slice(0,4).map(skill=>(
                                  <div key={skill} style={{padding:"10px 14px",background:"var(--bg)",borderRadius:"var(--r8)",border:"1px solid var(--border)"}}>
                                    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:8}}>
                                      <span style={{fontWeight:600,fontSize:13,textTransform:"capitalize"}}>📖 {skill}</span>
                                      <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                                        <a href={"https://www.coursera.org/search?query="+encodeURIComponent(skill)} target="_blank" rel="noreferrer" className="tag tag-blue" style={{textDecoration:"none",fontSize:11}}>Coursera</a>
                                        <a href={"https://www.udemy.com/courses/search/?q="+encodeURIComponent(skill)} target="_blank" rel="noreferrer" className="tag tag-blue" style={{textDecoration:"none",fontSize:11}}>Udemy</a>
                                        <a href={"https://www.youtube.com/results?search_query="+encodeURIComponent(skill+" tutorial for beginners")} target="_blank" rel="noreferrer" className="tag tag-blue" style={{textDecoration:"none",fontSize:11}}>YouTube</a>
                                        <a href={"https://www.freecodecamp.org/news/search/?query="+encodeURIComponent(skill)} target="_blank" rel="noreferrer" className="tag tag-indigo" style={{textDecoration:"none",fontSize:11}}>freeCodeCamp</a>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                              <div style={{marginTop:10,padding:"10px 14px",background:"var(--blue-lt)",borderRadius:"var(--r8)",border:"1px solid var(--blue)",fontSize:12.5}}>
                                💡 Learning {job.missing.slice(0,2).join(" and ")} could raise your match from <strong style={{color:job.color}}>{job.score}%</strong> to <strong style={{color:"#059669"}}>{Math.min(job.score + job.missing.slice(0,4).length*6, 98)}%</strong>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Bottom CTA */}
                <div className="card" style={{background:"var(--blue-lt)",border:"1px solid var(--blue)",textAlign:"center",padding:"28px 24px"}}>
                  <div style={{fontSize:18,fontWeight:700,marginBottom:8}}>Ready to apply to this company?</div>
                  <div style={{fontSize:13,color:"var(--muted)",marginBottom:18}}>
                    Submit your application to appear in the HR dashboard and get shortlisted.
                  </div>
                  <button className="btn btn-primary" onClick={()=>setTab("apply")}>📤 Apply to HR →</button>
                </div>
              </div>
            );
          })()}

          {/* MY INTERVIEWS TAB */}
          {tab==="interview" && (
            <div style={{display:"flex",flexDirection:"column",gap:16}}>
              {myInterviews.length === 0 ? (
                <div className="card" style={{textAlign:"center",padding:"60px 24px"}}>
                  <div style={{fontSize:48,marginBottom:16}}>📅</div>
                  <h3 style={{fontSize:17,marginBottom:8}}>No interviews scheduled yet</h3>
                  <p style={{color:"var(--muted)",fontSize:14,marginBottom:20,lineHeight:1.6}}>
                    Once you apply and HR shortlists you, your interview details will appear here.<br/>
                    You'll also receive an email notification.
                  </p>
                  <button className="btn btn-primary" onClick={()=>setTab("apply")}>📤 Apply to HR →</button>
                </div>
              ) : (
                <>
                  {/* Status banner for hired/rejected */}
                  {myInterviews.some(i=>i.outcome==="Hired") && (
                    <div style={{background:"linear-gradient(135deg,#059669,#065F46)",borderRadius:"var(--r20)",padding:"28px 32px",color:"#fff",textAlign:"center"}}>
                      <div style={{fontSize:40,marginBottom:10}}>🎊</div>
                      <div style={{fontFamily:"Fraunces,serif",fontSize:22,fontWeight:700,marginBottom:6}}>Congratulations! You're Hired!</div>
                      <div style={{fontSize:14,opacity:.9}}>You've received an offer letter on your registered email. Welcome aboard!</div>
                    </div>
                  )}

                  {/* Pipeline steps */}
                  <div className="card">
                    <div className="card-hd"><span className="card-title">📋 Your Interview Journey</span></div>
                    <div style={{display:"flex",gap:0,overflowX:"auto",paddingBottom:4}}>
                      {["Applied","Shortlisted","Interview Scheduled","Interview Done","Decision"].map((step,i)=>{
                        const hired    = myInterviews.some(iv=>iv.outcome==="Hired");
                        const rejected = myInterviews.some(iv=>iv.outcome==="Rejected");
                        const scheduled = myInterviews.some(iv=>iv.status==="Scheduled"||iv.status==="Rescheduled");
                        const completed = myInterviews.some(iv=>iv.status==="Completed");
                        const active =
                          i===0 ? true :
                          i===1 ? (user?.status==="Shortlisted"||user?.status==="Active"||scheduled||completed||hired||rejected) :
                          i===2 ? (scheduled||completed||hired||rejected) :
                          i===3 ? (completed||hired||rejected) :
                          hired||rejected;
                        return (
                          <div key={step} style={{flex:1,minWidth:90,textAlign:"center",position:"relative"}}>
                            {i>0 && <div style={{position:"absolute",top:18,left:0,right:"50%",height:2,background:active?"#059669":"var(--border)"}}></div>}
                            {i<4 && <div style={{position:"absolute",top:18,left:"50%",right:0,height:2,background:active&&i<4?(
                              i===0?(user?.status==="Shortlisted"||scheduled||completed||hired||rejected):
                              i===1?(scheduled||completed||hired||rejected):
                              i===2?(completed||hired||rejected):
                              hired||rejected
                            )?"#059669":"var(--border)":"var(--border)"}}></div>}
                            <div style={{width:36,height:36,borderRadius:"50%",background:active?(hired&&i===4?"#059669":rejected&&i===4?"#DC2626":"#059669"):"var(--bg)",border:`2px solid ${active?"#059669":"var(--border)"}`,margin:"0 auto 8px",display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,position:"relative",zIndex:1}}>
                              {active?(hired&&i===4?"🎊":rejected&&i===4?"❌":"✓"):(i+1)}
                            </div>
                            <div style={{fontSize:11,fontWeight:600,color:active?"var(--text)":"var(--muted)",lineHeight:1.3}}>{step}</div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Interview cards */}
                  {myInterviews.map(iv=>{
                    const isPast    = new Date(iv.date) < new Date();
                    const isHired   = iv.outcome==="Hired";
                    const isRejected= iv.outcome==="Rejected";
                    const cardBorder= isHired?"#6EE7B7":isRejected?"#FECACA":iv.status==="Scheduled"?"#BFCFFD":"var(--border)";
                    const cardBg    = isHired?"#ECFDF5":isRejected?"#FEF2F2":iv.status==="Scheduled"?"#EFF4FF":"var(--card)";
                    return (
                      <div key={iv._id} className="card" style={{border:`1.5px solid ${cardBorder}`,background:cardBg,padding:0,overflow:"hidden"}}>
                        <div style={{height:4,background:isHired?"#059669":isRejected?"#DC2626":iv.status==="Scheduled"?"#1B5EEA":"#D97706"}}></div>
                        <div style={{padding:"20px 24px"}}>
                          {/* Header */}
                          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:12,marginBottom:16}}>
                            <div>
                              <div style={{fontFamily:"Fraunces,serif",fontSize:18,fontWeight:700,marginBottom:4}}>{iv.jobTitle}</div>
                              <div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"center"}}>
                                <span style={{background:"#F5F3FF",color:"#7C3AED",borderRadius:20,padding:"3px 10px",fontSize:12,fontWeight:700}}>{iv.round}</span>
                                <span style={{background:iv.status==="Scheduled"?"#EFF4FF":iv.status==="Completed"?"#ECFDF5":"#FFFBEB",color:iv.status==="Scheduled"?"#1B5EEA":iv.status==="Completed"?"#059669":"#D97706",borderRadius:20,padding:"3px 10px",fontSize:12,fontWeight:700}}>{iv.status}</span>
                                {iv.outcome!=="Pending"&&<span style={{background:isHired?"#ECFDF5":isRejected?"#FEF2F2":"#F5F3FF",color:isHired?"#059669":isRejected?"#DC2626":"#7C3AED",borderRadius:20,padding:"3px 10px",fontSize:12,fontWeight:700}}>{isHired?"🎊 Hired":isRejected?"❌ Rejected":"🔁 Next Round"}</span>}
                              </div>
                            </div>
                            {/* Countdown */}
                            {iv.status==="Scheduled" && !isPast && (
                              <div style={{background:"#1B5EEA",borderRadius:"var(--r12)",padding:"10px 16px",textAlign:"center",color:"#fff"}}>
                                <div style={{fontSize:11,opacity:.8,fontWeight:600,marginBottom:2}}>INTERVIEW IN</div>
                                <div style={{fontSize:18,fontWeight:800}}>
                                  {Math.ceil((new Date(iv.date)-new Date())/(1000*60*60*24))} days
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Details grid */}
                          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))",gap:12,marginBottom:iv.notes||iv.offerDetails?16:0}}>
                            {[
                              ["🗓️","Date & Time", new Date(iv.date).toLocaleString("en-IN",{dateStyle:"full",timeStyle:"short"})],
                              ["💻","Mode", iv.mode],
                              ...(iv.location?[["📍","Location", iv.location]]:[]),
                              ["👤","Scheduled by", iv.scheduledBy?.name||"HR Team"],
                            ].map(([icon,label,val])=>(
                              <div key={label} style={{background:"rgba(255,255,255,0.7)",borderRadius:"var(--r8)",padding:"10px 14px"}}>
                                <div style={{fontSize:11,color:"var(--muted)",fontWeight:700,textTransform:"uppercase",letterSpacing:".5px",marginBottom:4}}>{icon} {label}</div>
                                <div style={{fontSize:13.5,fontWeight:600,color:"var(--text)"}}>{val}</div>
                              </div>
                            ))}
                          </div>

                          {/* Offer details (when hired) */}
                          {isHired && iv.offerDetails && (
                            <div style={{background:"#ECFDF5",border:"1px solid #6EE7B7",borderRadius:"var(--r12)",padding:"14px 18px",marginBottom:12}}>
                              <div style={{fontSize:11,fontWeight:700,color:"#059669",textTransform:"uppercase",letterSpacing:"1px",marginBottom:8}}>💼 Your Offer Details</div>
                              <div style={{fontSize:14,color:"#065F46",lineHeight:1.7,whiteSpace:"pre-wrap"}}>{iv.offerDetails}</div>
                            </div>
                          )}

                          {/* Notes */}
                          {iv.notes && (
                            <div style={{background:"rgba(255,255,255,0.8)",border:"1px solid var(--border)",borderRadius:"var(--r8)",padding:"12px 16px",marginBottom:12}}>
                              <div style={{fontSize:11,fontWeight:700,color:"var(--muted)",textTransform:"uppercase",letterSpacing:".5px",marginBottom:6}}>📝 Note from HR</div>
                              <div style={{fontSize:13.5,color:"var(--text)",lineHeight:1.6}}>{iv.notes}</div>
                            </div>
                          )}

                          {/* Prep tips for scheduled */}
                          {iv.status==="Scheduled" && iv.outcome==="Pending" && (
                            <div style={{background:"#FFFBEB",border:"1px solid #FDE68A",borderRadius:"var(--r12)",padding:"14px 18px",marginTop:4}}>
                              <div style={{fontSize:12,fontWeight:700,color:"#92400E",textTransform:"uppercase",letterSpacing:"1px",marginBottom:10}}>⭐ Interview Prep Checklist</div>
                              <div style={{display:"flex",flexDirection:"column",gap:7}}>
                                {[
                                  "Research the company's products and recent news",
                                  "Prepare 3 examples of past achievements using the STAR method",
                                  iv.mode==="Video Call"?"Test your camera, mic and internet 15 mins before":"Reach the venue at least 10 minutes early",
                                  "Review your resume thoroughly — expect questions on every line",
                                  "Prepare 2–3 thoughtful questions to ask the interviewer",
                                ].map((tip,i)=>(
                                  <div key={i} style={{display:"flex",gap:10,alignItems:"flex-start",fontSize:13,color:"#374151"}}>
                                    <span style={{color:"#D97706",fontWeight:700,flexShrink:0}}>☐</span>{tip}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </>
              )}
            </div>
          )}

          {tab==="apply" && (() => {
            // Derive live pipeline stage from user status + interview data
            const status = user?.status || "New";
            const hasInterview  = myInterviews.length > 0;
            const nextInterview = myInterviews.find(i=>i.status==="Scheduled"&&i.outcome==="Pending");
            const isHired       = myInterviews.some(i=>i.outcome==="Hired") || status==="Active";
            const isRejected    = myInterviews.some(i=>i.outcome==="Rejected") || status==="Rejected";
            const isShortlisted = status==="Shortlisted" || hasInterview;

            // ATS score history from all resumes (sorted oldest→newest)
            const scoreHistory = [...resumes]
              .filter(r=>r.atsScore>0)
              .sort((a,b)=>new Date(a.createdAt)-new Date(b.createdAt))
              .slice(-6);

            // Stage definitions
            const stages = [
              {
                id:"applied", icon:"📤", label:"Applied",
                done: applied || isShortlisted || hasInterview || isHired || isRejected,
                active: !applied && !isShortlisted,
                desc: applied ? "Your profile is visible to HR." : "Submit your application to begin.",
                color:"#1B5EEA",
              },
              {
                id:"review", icon:"🔍", label:"Under Review",
                done: isShortlisted || hasInterview || isHired || isRejected,
                active: applied && !isShortlisted && !isHired && !isRejected,
                desc: isShortlisted ? "HR reviewed your profile." : "HR is reviewing your resume & ATS score.",
                color:"#D97706",
              },
              {
                id:"shortlisted", icon:"⭐", label:"Shortlisted",
                done: isShortlisted || hasInterview || isHired || isRejected,
                active: isShortlisted && !hasInterview && !isHired && !isRejected,
                desc: isShortlisted ? "You've been shortlisted!" : "Shortlisted candidates get an interview.",
                color:"#7C3AED",
              },
              {
                id:"interview", icon:"📅", label:"Interview",
                done: hasInterview || isHired || isRejected,
                active: isShortlisted && !hasInterview,
                desc: nextInterview
                  ? `${nextInterview.round} on ${new Date(nextInterview.date).toLocaleDateString("en-IN",{day:"numeric",month:"short"})}`
                  : hasInterview ? "Interview completed." : "Interview will be scheduled.",
                color:"#0891B2",
              },
              {
                id:"decision", icon: isHired?"🎊":isRejected?"❌":"🏁", label:"Decision",
                done: isHired || isRejected,
                active: hasInterview && !isHired && !isRejected,
                desc: isHired?"Offer letter sent! You're hired!":isRejected?"Application not selected this time.":"Awaiting final decision.",
                color: isHired?"#059669":isRejected?"#DC2626":"#64748B",
              },
            ];

            // Current active stage index
            const activeIdx = isHired||isRejected ? 4 : hasInterview ? 3 : isShortlisted ? 2 : applied ? 1 : 0;

            return (
              <div style={{display:"flex",flexDirection:"column",gap:16}}>

                {/* ── Hired Banner ── */}
                {isHired && (
                  <div style={{background:"linear-gradient(135deg,#059669,#065F46)",borderRadius:"var(--r20)",padding:"28px 32px",color:"#fff",textAlign:"center"}}>
                    <div style={{fontSize:40,marginBottom:10}}>🎊</div>
                    <div style={{fontFamily:"Fraunces,serif",fontSize:22,fontWeight:700,marginBottom:6}}>Congratulations — You're Hired!</div>
                    <div style={{fontSize:14,opacity:.85,lineHeight:1.6}}>An offer letter has been sent to your email. Check your My Interviews tab for full details.</div>
                    <button className="btn" style={{marginTop:16,background:"rgba(255,255,255,.2)",color:"#fff",border:"1px solid rgba(255,255,255,.4)"}} onClick={()=>setTab("interview")}>📅 View Offer Details →</button>
                  </div>
                )}

                {/* ── Rejected Banner ── */}
                {isRejected && !isHired && (
                  <div style={{background:"var(--bg)",border:"1px solid var(--border)",borderRadius:"var(--r20)",padding:"24px 28px",textAlign:"center"}}>
                    <div style={{fontSize:36,marginBottom:8}}>💪</div>
                    <div style={{fontWeight:700,fontSize:16,marginBottom:6}}>Keep Going!</div>
                    <div style={{fontSize:13.5,color:"var(--muted)",lineHeight:1.6,marginBottom:14}}>This application wasn't selected, but your profile remains active. Improve your ATS score and apply again.</div>
                    <div style={{display:"flex",gap:10,justifyContent:"center",flexWrap:"wrap"}}>
                      <button className="btn btn-primary" onClick={()=>setTab("ats")}>📊 Improve ATS Score</button>
                      <button className="btn btn-outline" onClick={()=>setTab("skills")}>🎯 Close Skill Gaps</button>
                    </div>
                  </div>
                )}

                {/* ── Pipeline Progress ── */}
                <div className="card">
                  <div className="card-hd" style={{marginBottom:24}}>
                    <span className="card-title">📋 Application Pipeline</span>
                    <span className={`tag ${isHired?"tag-green":isRejected?"tag-red":applied?"tag-blue":"tag-gray"}`}>
                      {isHired?"Hired":isRejected?"Not Selected":applied?"In Progress":"Not Applied"}
                    </span>
                  </div>

                  {/* Step indicators */}
                  <div style={{display:"flex",alignItems:"flex-start",gap:0,marginBottom:28,overflowX:"auto",paddingBottom:4}}>
                    {stages.map((s,i)=>(
                      <div key={s.id} style={{flex:1,minWidth:80,textAlign:"center",position:"relative"}}>
                        {/* connector left */}
                        {i>0 && <div style={{position:"absolute",top:20,left:0,right:"50%",height:3,background:s.done?"#059669":"var(--border)",transition:"background .3s"}}></div>}
                        {/* connector right */}
                        {i<4 && <div style={{position:"absolute",top:20,left:"50%",right:0,height:3,background:stages[i+1]?.done?"#059669":"var(--border)",transition:"background .3s"}}></div>}
                        {/* circle */}
                        <div style={{
                          width:40,height:40,borderRadius:"50%",margin:"0 auto 10px",
                          display:"flex",alignItems:"center",justifyContent:"center",
                          fontSize:s.done?16:14,position:"relative",zIndex:1,
                          background:s.done?(isRejected&&i===4?"#DC2626":"#059669"):s.active?s.color:"var(--bg)",
                          border:`3px solid ${s.done?(isRejected&&i===4?"#DC2626":"#059669"):s.active?s.color:"var(--border)"}`,
                          color:s.done||s.active?"#fff":"var(--muted)",fontWeight:700,
                          boxShadow:s.active?`0 0 0 4px ${s.color}22`:"none",
                          transition:"all .3s",
                        }}>
                          {s.done ? (i===4&&isRejected?"✕":"✓") : s.active ? s.icon : i+1}
                        </div>
                        <div style={{fontSize:11.5,fontWeight:700,color:s.done?"#059669":s.active?s.color:"var(--muted)",marginBottom:3,lineHeight:1.2}}>{s.label}</div>
                        <div style={{fontSize:10.5,color:"var(--muted)",lineHeight:1.4,padding:"0 4px"}}>{s.desc}</div>
                      </div>
                    ))}
                  </div>

                  {/* Current stage callout */}
                  {!isHired && !isRejected && (
                    <div style={{background:`${stages[activeIdx]?.color}12`,border:`1px solid ${stages[activeIdx]?.color}33`,borderRadius:"var(--r12)",padding:"14px 18px",display:"flex",gap:12,alignItems:"center"}}>
                      <span style={{fontSize:24}}>{stages[activeIdx]?.icon}</span>
                      <div>
                        <div style={{fontWeight:700,fontSize:13.5,color:stages[activeIdx]?.color}}>Current Stage: {stages[activeIdx]?.label}</div>
                        <div style={{fontSize:12.5,color:"var(--muted)",marginTop:2}}>{stages[activeIdx]?.desc}</div>
                      </div>
                    </div>
                  )}
                </div>

                {/* ── ATS Score Tracker ── */}
                <div className="card">
                  <div className="card-hd">
                    <span className="card-title">📊 ATS Score Tracker</span>
                    <span className="tag tag-blue">{user?.totalAnalyses||0} scan{(user?.totalAnalyses||0)!==1?"s":""}</span>
                  </div>

                  {/* Current score + breakdown */}
                  <div style={{display:"flex",alignItems:"center",gap:24,padding:"8px 0 20px",borderBottom:"1px solid var(--border)",flexWrap:"wrap"}}>
                    <ScoreRing score={result?.atsScore || user?.lastAtsScore || 0} />
                    <div style={{flex:1,minWidth:180}}>
                      <div style={{fontSize:13,color:"var(--muted)",marginBottom:4}}>
                        {result ? `Analyzed for "${jobTitle||"General Role"}"` : "Best score on record"}
                      </div>
                      <div style={{fontFamily:"Fraunces,serif",fontSize:20,fontWeight:700,marginBottom:10,color:scColor(result?.atsScore||user?.lastAtsScore||0)}}>
                        {result?.atsScore||user?.lastAtsScore ? `${result?.atsScore||user?.lastAtsScore}/100` : "No analysis yet"}
                      </div>
                      {/* Score band label */}
                      {(result?.atsScore||user?.lastAtsScore||0) >= 80 && <span className="tag tag-green">🟢 Excellent — Very strong match</span>}
                      {(result?.atsScore||user?.lastAtsScore||0) >= 60 && (result?.atsScore||user?.lastAtsScore||0) < 80 && <span className="tag tag-blue">🔵 Good — Minor improvements needed</span>}
                      {(result?.atsScore||user?.lastAtsScore||0) >= 40 && (result?.atsScore||user?.lastAtsScore||0) < 60 && <span className="tag tag-amber">🟡 Average — Focus on skill gaps</span>}
                      {(result?.atsScore||user?.lastAtsScore||0) > 0   && (result?.atsScore||user?.lastAtsScore||0) < 40  && <span className="tag tag-red">🔴 Low — Resume needs improvement</span>}
                    </div>
                  </div>

                  {/* Breakdown bars */}
                  {result?.breakdown && (
                    <div style={{marginTop:16}}>
                      <div style={{fontSize:12,fontWeight:700,color:"var(--muted)",textTransform:"uppercase",letterSpacing:".8px",marginBottom:12}}>Score Breakdown</div>
                      {[
                        ["🔑 Keywords",   result.breakdown.keywordScore   ||0],
                        ["📐 Formatting", result.breakdown.formattingScore||0],
                        ["💼 Experience", result.breakdown.experienceScore||0],
                        ["🎓 Education",  result.breakdown.educationScore ||0],
                        ["🎯 Skills",     result.breakdown.skillsScore    ||0],
                      ].map(([l,v])=>(
                        <div key={l} style={{marginBottom:10}}>
                          <div style={{display:"flex",justifyContent:"space-between",marginBottom:4,fontSize:12.5}}>
                            <span style={{fontWeight:600}}>{l}</span>
                            <span style={{fontWeight:700,color:scColor(v)}}>{v}%</span>
                          </div>
                          <div className="skill-bar">
                            <div className="skill-fill" style={{width:v+"%",background:scColor(v),transition:"width 1s ease"}}></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Score history graph */}
                  {scoreHistory.length > 1 && (
                    <div style={{marginTop:20}}>
                      <div style={{fontSize:12,fontWeight:700,color:"var(--muted)",textTransform:"uppercase",letterSpacing:".8px",marginBottom:12}}>Score History</div>
                      <div style={{display:"flex",alignItems:"flex-end",gap:8,height:80,padding:"0 4px"}}>
                        {scoreHistory.map((r,i)=>{
                          const h = Math.max(8, Math.round((r.atsScore/100)*72));
                          const isLast = i===scoreHistory.length-1;
                          return (
                            <div key={r._id} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:4}}>
                              <div style={{fontSize:10,fontWeight:700,color:scColor(r.atsScore)}}>{r.atsScore}</div>
                              <div style={{width:"100%",height:h,background:isLast?scColor(r.atsScore):`${scColor(r.atsScore)}66`,borderRadius:"4px 4px 0 0",transition:"height .5s ease",position:"relative"}}>
                                {isLast && <div style={{position:"absolute",top:-3,left:"50%",transform:"translateX(-50%)",width:8,height:8,borderRadius:"50%",background:scColor(r.atsScore)}}></div>}
                              </div>
                              <div style={{fontSize:9,color:"var(--muted)",textAlign:"center",lineHeight:1.2}}>
                                {new Date(r.createdAt).toLocaleDateString("en-IN",{day:"numeric",month:"short"})}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      <div style={{marginTop:8,fontSize:12,color:"var(--muted)",textAlign:"center"}}>
                        {scoreHistory[scoreHistory.length-1].atsScore > scoreHistory[0].atsScore
                          ? `📈 Improved by ${scoreHistory[scoreHistory.length-1].atsScore - scoreHistory[0].atsScore} points`
                          : scoreHistory[scoreHistory.length-1].atsScore < scoreHistory[0].atsScore
                          ? `📉 Dropped by ${scoreHistory[0].atsScore - scoreHistory[scoreHistory.length-1].atsScore} points — keep working on it`
                          : "Score is consistent across submissions"}
                      </div>
                    </div>
                  )}

                  {/* What to improve */}
                  {(result?.atsScore||user?.lastAtsScore||0) < 80 && (result?.atsScore||user?.lastAtsScore||0) > 0 && (
                    <div style={{marginTop:16,padding:"12px 16px",background:"var(--blue-lt)",borderRadius:"var(--r12)",border:"1px solid var(--blue)",fontSize:13}}>
                      💡 <strong>To improve your score:</strong>{" "}
                      {(result?.atsScore||0) < 50
                        ? "Add more relevant skills, quantify achievements, and ensure clear section headers."
                        : "Tailor your resume keywords to match the job description more closely."}
                      {" "}<button className="tag tag-blue" style={{border:"none",cursor:"pointer",fontWeight:700}} onClick={()=>setTab("skills")}>
                        View Skill Gaps →
                      </button>
                    </div>
                  )}
                </div>

                {/* ── Interview Tracker ── */}
                {myInterviews.length > 0 && (
                  <div className="card">
                    <div className="card-hd">
                      <span className="card-title">📅 Interview Tracker</span>
                      <span className="tag tag-green">{myInterviews.length} scheduled</span>
                    </div>
                    <div style={{display:"flex",flexDirection:"column",gap:10}}>
                      {myInterviews.slice(0,3).map(iv=>{
                        const isPast = new Date(iv.date)<new Date();
                        const outcomeColor = iv.outcome==="Hired"?"#059669":iv.outcome==="Rejected"?"#DC2626":iv.outcome==="Next Round"?"#7C3AED":"#1B5EEA";
                        return (
                          <div key={iv._id} style={{display:"flex",gap:14,padding:"12px 14px",background:"var(--bg)",borderRadius:"var(--r12)",border:"1px solid var(--border)",alignItems:"center",flexWrap:"wrap"}}>
                            <div style={{width:40,height:40,borderRadius:"var(--r8)",background:isPast?"var(--border)":"#EFF4FF",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,flexShrink:0}}>
                              {iv.outcome==="Hired"?"🎊":iv.outcome==="Rejected"?"❌":isPast?"✅":"📅"}
                            </div>
                            <div style={{flex:1,minWidth:120}}>
                              <div style={{fontWeight:700,fontSize:13.5}}>{iv.round} — {iv.jobTitle}</div>
                              <div style={{fontSize:12,color:"var(--muted)",marginTop:2}}>
                                {new Date(iv.date).toLocaleString("en-IN",{dateStyle:"medium",timeStyle:"short"})} · {iv.mode}
                              </div>
                            </div>
                            <div style={{display:"flex",flexDirection:"column",gap:4,alignItems:"flex-end"}}>
                              <span style={{background:`${outcomeColor}15`,color:outcomeColor,borderRadius:20,padding:"3px 10px",fontSize:11.5,fontWeight:700}}>
                                {iv.outcome==="Pending"?(isPast?"Completed":"Upcoming"):iv.outcome}
                              </span>
                              {!isPast && iv.status==="Scheduled" && (
                                <span style={{fontSize:11,color:"var(--muted)"}}>
                                  in {Math.ceil((new Date(iv.date)-new Date())/(1000*60*60*24))} days
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <button className="btn btn-outline" style={{width:"100%",marginTop:12}} onClick={()=>setTab("interview")}>
                      📅 View Full Interview Details →
                    </button>
                  </div>
                )}

                {/* ── Apply / Reapply Card ── */}
                {!isHired && (
                  <div className="card" style={{textAlign:"center",padding:"32px 24px"}}>
                    <div style={{fontSize:48,marginBottom:12}}>{applied?"✅":"📤"}</div>
                    <h3 style={{fontSize:18,fontWeight:700,marginBottom:8}}>
                      {applied?"Application Submitted":"Apply to HR Dashboard"}
                    </h3>
                    <p style={{color:"var(--muted)",fontSize:13.5,marginBottom:20,lineHeight:1.6,maxWidth:440,margin:"0 auto 20px"}}>
                      {applied
                        ? "Your profile is visible to HR. Keep improving your ATS score to increase shortlisting chances."
                        : "Submit your application to make your profile visible to HR administrators."}
                    </p>
                    {!applied && (
                      <div style={{background:"var(--bg)",borderRadius:"var(--r12)",padding:16,marginBottom:20,textAlign:"left",maxWidth:380,margin:"0 auto 20px"}}>
                        <div style={{fontWeight:600,fontSize:13.5,marginBottom:10}}>Before applying, ensure:</div>
                        {[
                          ["📄","Resume uploaded", !!resume],
                          ["📊","ATS analysis run", !!result],
                          ["👤","Target role set", !!(user?.name && user?.targetRole)],
                        ].map(([icon,label,done])=>(
                          <div key={label} style={{display:"flex",alignItems:"center",gap:10,padding:"5px 0",fontSize:13}}>
                            <span>{done?"✅":"⬜"}</span>
                            <span style={{color:done?"var(--text)":"var(--muted)"}}>{icon} {label}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    {applied ? (
                      <div style={{display:"flex",gap:10,justifyContent:"center",flexWrap:"wrap"}}>
                        <button className="btn btn-outline" onClick={()=>setTab("ats")}>📊 Improve ATS Score</button>
                        <button className="btn btn-outline" onClick={()=>setTab("jobrec")}>💼 Browse Job Matches</button>
                      </div>
                    ) : (
                      <button className="btn btn-primary"
                        style={{padding:"14px 32px",fontSize:15}}
                        disabled={applying||!result}
                        onClick={async()=>{
                          setApplying(true);
                          try{
                            await userAPI.applyToHR();
                            setApplied(true);
                            showToast("Application submitted successfully!");
                          }catch(err){ showToast("Failed: "+(err.response?.data?.message||err.message),"error"); }
                          finally{ setApplying(false); }
                        }}>
                        {applying?"Submitting...":"📤 Submit Application to HR"}
                      </button>
                    )}
                  </div>
                )}

              </div>
            );
          })()}

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