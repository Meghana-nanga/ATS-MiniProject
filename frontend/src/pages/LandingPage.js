/* eslint-disable */
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function LandingPage() {
  const nav = useNavigate();
  const { user } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  const goTo = () => nav(user ? (user.role === "admin" ? "/admin" : "/dashboard") : "/register");

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const scrollTo = (id) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior:"smooth", block:"start" });
    setMenuOpen(false);
  };

  return (
    <div>
      {/* ── NAV ── */}
      <nav className="nav" style={{boxShadow:scrolled?"var(--sh-sm)":"none"}}>
        <div className="nav-logo" onClick={()=>window.scrollTo({top:0,behavior:"smooth"})} style={{cursor:"pointer"}}>
          <div className="nav-logo-dot"></div>HireIQ
        </div>
        <div className="nav-links nav-links-desktop">
          <button className="nav-link" onClick={()=>scrollTo("about")}>About</button>
          <button className="nav-link" onClick={()=>scrollTo("features")}>Features</button>
          <button className="nav-link" onClick={()=>scrollTo("how-it-works")}>How it works</button>
          <button className="nav-link" onClick={()=>scrollTo("contact")}>Contact</button>
        </div>
        <div className="nav-actions">
          <button className="btn btn-ghost" onClick={()=>nav("/login")}>Log in</button>
          <button className="btn btn-primary" onClick={goTo}>Get started free →</button>
          <button className="hamburger" onClick={()=>setMenuOpen(!menuOpen)}>☰</button>
        </div>
      </nav>

      {/* ── MOBILE MENU ── */}
      {menuOpen && (
        <div className="mobile-menu">
          <button className="nav-link" onClick={()=>scrollTo("about")}>About</button>
          <button className="nav-link" onClick={()=>scrollTo("features")}>Features</button>
          <button className="nav-link" onClick={()=>scrollTo("how-it-works")}>How it works</button>
          <button className="nav-link" onClick={()=>scrollTo("contact")}>Contact</button>
          <div style={{borderTop:"1px solid var(--border)",paddingTop:12,marginTop:4,display:"flex",flexDirection:"column",gap:8}}>
            <button className="btn btn-outline" style={{justifyContent:"center"}} onClick={()=>{nav("/login");setMenuOpen(false);}}>Log in</button>
            <button className="btn btn-primary" style={{justifyContent:"center"}} onClick={()=>{goTo();setMenuOpen(false);}}>Get started free →</button>
          </div>
        </div>
      )}

      {/* ── HERO ── */}
      <div className="hero" id="hero">
        <div className="hero-layout">
          <div>
            <div className="hero-badge"><span className="badge-dot"></span>AI-Powered Fraud Detection Included</div>
            <h1 className="hero-title">Resumes that rank.<br/>Hires that <span className="accent">last.</span></h1>
            <p className="hero-sub">ATS scoring, skill gap analysis, cover letter AI, and fraud detection — unified in one platform built for serious hiring teams.</p>
            <div className="hero-cta">
              <button className="btn btn-primary btn-lg" onClick={goTo}>Start for free</button>
              <button className="btn btn-outline btn-lg" onClick={()=>scrollTo("how-it-works")}>See how it works →</button>
            </div>
            <div className="hero-stats">
              <div className="stat-item"><div className="stat-num">98%</div><div className="stat-lbl">ATS accuracy</div></div>
              <div className="stat-div"></div>
              <div className="stat-item"><div className="stat-num">3.2x</div><div className="stat-lbl">Faster screening</div></div>
              <div className="stat-div"></div>
              <div className="stat-item"><div className="stat-num">40K+</div><div className="stat-lbl">Resumes analyzed</div></div>
              <div className="stat-div"></div>
              <div className="stat-item"><div className="stat-num">94%</div><div className="stat-lbl">Fraud detection</div></div>
            </div>
          </div>
          <div className="hero-visual">
            <div className="visual-header">
              <span className="visual-title">Live Resume Analysis</span>
              <span className="tag tag-green">✓ Verified</span>
            </div>
            <div style={{textAlign:"center",marginBottom:20}}>
              <div style={{position:"relative",width:120,height:120,margin:"0 auto 14px"}}>
                <svg width="120" height="120" viewBox="0 0 120 120">
                  <circle cx="60" cy="60" r="50" fill="none" stroke="#E2E1DA" strokeWidth="10"/>
                  <circle cx="60" cy="60" r="50" fill="none" stroke="#1B5EEA" strokeWidth="10"
                    strokeLinecap="round" strokeDasharray="314.2" strokeDashoffset="62.8"
                    style={{transform:"rotate(-90deg)",transformOrigin:"60px 60px"}}/>
                </svg>
                <div style={{position:"absolute",top:"50%",left:"50%",transform:"translate(-50%,-50%)",textAlign:"center"}}>
                  <div style={{fontFamily:"Fraunces,serif",fontSize:28,fontWeight:700,color:"#1B5EEA",lineHeight:1}}>80</div>
                  <div style={{fontSize:10,color:"#94A3B8",fontWeight:700,letterSpacing:".8px",marginTop:2}}>ATS SCORE</div>
                </div>
              </div>
            </div>
            {[["Keywords","88%","#059669"],["Formatting","76%","#1B5EEA"],["Experience","70%","#D97706"],["Education","90%","#059669"]].map(([l,v,c])=>(
              <div className="skill-row" key={l}>
                <span className="skill-name" style={{fontSize:12}}>{l}</span>
                <div className="skill-bar"><div className="skill-fill" style={{width:v,background:c}}></div></div>
                <span className="skill-pct" style={{color:c}}>{v}</span>
              </div>
            ))}
            <div style={{marginTop:14,display:"flex",flexWrap:"wrap",gap:6}}>
              <span className="tag tag-green">✓ React</span>
              <span className="tag tag-green">✓ TypeScript</span>
              <span className="tag tag-red">✗ GraphQL</span>
              <span className="tag tag-red">✗ Docker</span>
            </div>
            <div style={{marginTop:12,background:"#ECFDF5",border:"1px solid #6EE7B7",borderRadius:10,padding:"10px 14px",display:"flex",alignItems:"center",gap:8}}>
              <span style={{fontSize:18}}>🛡️</span>
              <div>
                <div style={{fontSize:12.5,fontWeight:700,color:"#059669"}}>Fraud Check: Passed</div>
                <div style={{fontSize:11.5,color:"#059669"}}>Resume appears authentic</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── ABOUT ── */}
      <div id="about" style={{background:"#fff",borderTop:"1px solid var(--border)",padding:"80px 40px"}}>
        <div style={{maxWidth:1160,margin:"0 auto"}}>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:64,alignItems:"center"}}>
            <div>
              <div className="section-eyebrow">About HireIQ</div>
              <h2 className="section-title">Built for the modern hiring era</h2>
              <p style={{fontSize:16,color:"var(--muted)",lineHeight:1.8,marginBottom:20}}>
                HireIQ was built to solve a real problem — recruiters spending hours manually screening resumes while top candidates get filtered out by flawed ATS systems.
              </p>
              <p style={{fontSize:16,color:"var(--muted)",lineHeight:1.8,marginBottom:28}}>
                We combine machine learning, NLP, and fraud detection into a single platform that helps both candidates optimize their resumes and hiring teams find the best talent faster.
              </p>
              <div style={{display:"flex",gap:32,flexWrap:"wrap"}}>
                {[["10+","Industries served"],["40K+","Resumes analyzed"],["94%","Fraud detection rate"],["3.2x","Faster hiring"]].map(([n,l])=>(
                  <div key={l}>
                    <div style={{fontFamily:"Fraunces,serif",fontSize:28,fontWeight:700,color:"var(--blue)"}}>{n}</div>
                    <div style={{fontSize:13,color:"var(--muted)",fontWeight:500}}>{l}</div>
                  </div>
                ))}
              </div>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
              {[
                ["🎯","Precision Scoring","Every resume is scored against a 5-factor weighted model tailored to the job."],
                ["🛡️","Fraud Detection","ML-powered checks flag suspicious resumes before they reach your team."],
                ["⚡","Instant Results","Get full ATS analysis in seconds, not hours."],
                ["📈","Data Insights","Admin dashboards give you full visibility into your candidate pipeline."],
              ].map(([icon,title,desc])=>(
                <div key={title} style={{background:"var(--bg)",borderRadius:"var(--r16)",padding:20,border:"1px solid var(--border)"}}>
                  <div style={{fontSize:24,marginBottom:10}}>{icon}</div>
                  <div style={{fontWeight:700,fontSize:14,marginBottom:6}}>{title}</div>
                  <div style={{fontSize:13,color:"var(--muted)",lineHeight:1.6}}>{desc}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── FEATURES ── */}
      <div id="features" style={{padding:"80px 40px",background:"var(--bg)"}}>
        <div style={{maxWidth:1160,margin:"0 auto"}}>
          <div className="section-eyebrow">Platform Features</div>
          <h2 className="section-title">Everything you need to hire right</h2>
          <p className="section-sub">No more switching between tools. One platform, complete hiring intelligence.</p>
          <div className="feat-grid">
            {[
              ["📊","#EBF2FF","ATS Score Analysis","Real-time keyword and experience matching against any job description with a weighted 5-factor scoring model."],
              ["🎯","#ECFDF5","Skill Gap Detection","Pinpoint missing competencies and get personalized course recommendations to close gaps fast."],
              ["✉️","#FFFBEB","Cover Letter AI","Generate tailored, human-sounding cover letters in four different tones — professional, enthusiastic, concise, creative."],
              ["🎥","#EBF2FF","Video Resume Screening","AI-powered analysis of tone, confidence and relevance from candidate video submissions."],
              ["🛡️","#FEF2F2","Fake Resume Detection","Advanced ML flags fabricated credentials, inflated titles, duplicate content, and inconsistent date timelines."],
              ["📈","#EEF2FF","Admin Analytics","Real-time candidate rankings, score distributions, pie charts, bar graphs, and filter-based drill-downs for HR teams."],
            ].map(([icon,bg,title,desc])=>(
              <div className="feat-card" key={title}>
                <div className="feat-icon" style={{background:bg}}>{icon}</div>
                <h3>{title}</h3><p>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── HOW IT WORKS ── */}
      <div id="how-it-works" className="how">
        <div className="how-inner">
          <div className="section-eyebrow">Process</div>
          <h2 className="section-title">From upload to offer in minutes</h2>
          <p className="section-sub">A simple 4-step process that takes the guesswork out of resume optimization.</p>
          <div className="steps-grid">
            {[
              ["Upload Resume","Drop your PDF or DOCX file and paste the target job description you are applying for."],
              ["Get ATS Score","Our ML engine performs instant keyword, formatting, experience and education analysis with full breakdown."],
              ["Close Skill Gaps","See exactly what is missing and get curated learning recommendations for each gap."],
              ["Apply Confidently","Generate a personalized cover letter and submit a verified, optimized application."],
            ].map(([title,desc],i)=>(
              <div className="step-card" key={title}>
                <div className="step-num">{i+1}</div>
                {i < 3 && <div className="step-line"></div>}
                <h4>{title}</h4><p>{desc}</p>
              </div>
            ))}
          </div>

          <div style={{marginTop:64,background:"#fff",borderRadius:"var(--r24)",border:"1px solid var(--border)",padding:40}}>
            <div style={{textAlign:"center",marginBottom:40}}>
              <div className="section-eyebrow">For Hiring Teams</div>
              <h2 className="section-title" style={{marginBottom:10}}>Admin dashboard included</h2>
              <p style={{color:"var(--muted)",fontSize:16}}>Every HireIQ account comes with a full admin panel for your HR team.</p>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))",gap:24}}>
              {[
                ["🏆","Candidate Rankings","Automatically ranked leaderboard sorted by ATS score with medal badges."],
                ["👥","User Management","Add, remove, flag, restore candidates. Full control over your pipeline."],
                ["📊","Score Analytics","Pie chart distribution, monthly registration bars, and score range filters."],
                ["🚫","Fraud Removal","One-click flag and ban for fraud-detected candidates with reason logging."],
              ].map(([icon,title,desc])=>(
                <div key={title} style={{textAlign:"center",padding:20,background:"var(--bg)",borderRadius:"var(--r16)",border:"1px solid var(--border)"}}>
                  <div style={{fontSize:32,marginBottom:12}}>{icon}</div>
                  <div style={{fontWeight:700,fontSize:14,marginBottom:8}}>{title}</div>
                  <div style={{fontSize:13,color:"var(--muted)",lineHeight:1.6}}>{desc}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── PRICING / CTA ── */}
      <div style={{background:"#fff",padding:"80px 40px",borderTop:"1px solid var(--border)"}}>
        <div style={{maxWidth:800,margin:"0 auto",textAlign:"center"}}>
          <div className="section-eyebrow">Get Started Today</div>
          <h2 className="section-title">Free to use. Powerful by default.</h2>
          <p style={{fontSize:17,color:"var(--muted)",lineHeight:1.7,marginBottom:40}}>
            No credit card required. Create your account and start optimizing your resume in under 2 minutes.
          </p>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))",gap:20,marginBottom:40}}>
            {[
              ["✅","Free ATS Analysis","Upload unlimited resumes and get instant scoring"],
              ["✅","Skill Gap Report","See exactly what is missing for any role"],
              ["✅","Cover Letter AI","Generate personalized letters in seconds"],
              ["✅","Fraud Detection","Know if your resume has any red flags"],
            ].map(([icon,title,desc])=>(
              <div key={title} style={{padding:20,background:"var(--bg)",borderRadius:"var(--r16)",border:"1px solid var(--border)",textAlign:"left"}}>
                <div style={{fontSize:18,marginBottom:8}}>{icon}</div>
                <div style={{fontWeight:700,fontSize:14,marginBottom:4}}>{title}</div>
                <div style={{fontSize:13,color:"var(--muted)"}}>{desc}</div>
              </div>
            ))}
          </div>
          <div style={{display:"flex",gap:12,justifyContent:"center",flexWrap:"wrap"}}>
            <button className="btn btn-primary btn-lg" onClick={goTo}>Create free account →</button>
            <button className="btn btn-outline btn-lg" onClick={()=>nav("/login")}>Sign in</button>
          </div>
        </div>
      </div>

      {/* ── CONTACT ── */}
      <div id="contact" style={{background:"var(--bg)",borderTop:"1px solid var(--border)",padding:"80px 40px"}}>
        <div style={{maxWidth:1160,margin:"0 auto"}}>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:64,alignItems:"start"}}>
            <div>
              <div className="section-eyebrow">Contact Us</div>
              <h2 className="section-title">Get in touch</h2>
              <p style={{fontSize:16,color:"var(--muted)",lineHeight:1.8,marginBottom:32}}>
                Have questions about HireIQ? Our team is here to help. Reach out and we will get back to you within 24 hours.
              </p>
              <div style={{display:"flex",flexDirection:"column",gap:20}}>
                {[["📧","Email","hello@hireiq.com"],["💼","LinkedIn","linkedin.com/company/hireiq"],["🐦","Twitter","@hireiq"],["📍","Location","Hyderabad, Telangana, India"]].map(([icon,label,value])=>(
                  <div key={label} style={{display:"flex",alignItems:"center",gap:14}}>
                    <div style={{width:44,height:44,background:"var(--blue-lt)",borderRadius:"var(--r10)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,flexShrink:0}}>{icon}</div>
                    <div>
                      <div style={{fontSize:12,color:"var(--muted)",fontWeight:600,textTransform:"uppercase",letterSpacing:".5px"}}>{label}</div>
                      <div style={{fontSize:14,fontWeight:600}}>{value}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="card">
              <div className="card-hd"><span className="card-title">Send us a message</span></div>
              <div className="form-group">
                <label className="form-label">Your Name</label>
                <input className="form-input" placeholder="Arjun Kumar"/>
              </div>
              <div className="form-group">
                <label className="form-label">Email Address</label>
                <input className="form-input" type="email" placeholder="you@example.com"/>
              </div>
              <div className="form-group">
                <label className="form-label">Subject</label>
                <select className="form-select">
                  <option>General Inquiry</option>
                  <option>Technical Support</option>
                  <option>Partnership</option>
                  <option>Billing</option>
                  <option>Other</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Message</label>
                <textarea className="form-textarea" rows={5} placeholder="Tell us how we can help..."/>
              </div>
              <button className="btn btn-primary" style={{width:"100%",padding:12}}
                onClick={()=>alert("Message sent! We will get back to you within 24 hours.")}>
                Send Message →
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── FOOTER ── */}
      <footer className="footer">
        <div className="footer-inner">
          <div className="footer-grid">
            <div>
              <div className="footer-logo">
                <div style={{width:9,height:9,borderRadius:"50%",background:"var(--blue)"}}></div>HireIQ
              </div>
              <p className="footer-desc">AI-powered resume screening and hiring intelligence platform trusted by modern recruitment teams worldwide.</p>
              <div style={{display:"flex",gap:12,marginTop:20}}>
                {["🐦","💼","📸","🐙"].map((icon,i)=>(
                  <div key={i} style={{width:36,height:36,borderRadius:"var(--r8)",background:"rgba(255,255,255,.08)",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",fontSize:16,transition:".15s"}}
                    onMouseEnter={e=>e.target.style.background="rgba(255,255,255,.15)"}
                    onMouseLeave={e=>e.target.style.background="rgba(255,255,255,.08)"}
                  >{icon}</div>
                ))}
              </div>
            </div>
            <div className="footer-col">
              <div className="footer-col-title">Product</div>
              <a onClick={()=>scrollTo("features")}>ATS Analysis</a>
              <a onClick={()=>scrollTo("features")}>Skill Gap</a>
              <a onClick={()=>scrollTo("features")}>Cover Letter AI</a>
              <a onClick={()=>scrollTo("features")}>Fraud Detection</a>
            </div>
            <div className="footer-col">
              <div className="footer-col-title">Company</div>
              <a onClick={()=>scrollTo("about")}>About Us</a>
              <a onClick={()=>scrollTo("how-it-works")}>How It Works</a>
              <a onClick={()=>scrollTo("contact")}>Contact</a>
              <a onClick={()=>nav("/register")}>Get Started</a>
            </div>
            <div className="footer-col">
              <div className="footer-col-title">Legal</div>
              <a onClick={()=>alert("Privacy Policy — Coming soon")}>Privacy Policy</a>
              <a onClick={()=>alert("Terms of Service — Coming soon")}>Terms of Service</a>
              <a onClick={()=>alert("Security Policy — Coming soon")}>Security</a>
              <a onClick={()=>scrollTo("contact")}>Support</a>
            </div>
          </div>
          <div className="footer-bottom">
            <p>© 2025 HireIQ Inc. All rights reserved. Built in Hyderabad 🇮🇳</p>
            <div className="footer-tags">
              <span className="footer-tag">SOC 2</span>
              <span className="footer-tag">GDPR</span>
              <span className="footer-tag">ISO 27001</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}