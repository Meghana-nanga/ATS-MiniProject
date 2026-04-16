/**
 * atsEngine.js — Strict ATS scoring + Accurate Fraud Detection
 */

const { matchSkills } = require("../utils/skillMatcher");

// ── Tokenizer ─────────────────────────────────────────────────────────────────
const tokenize = (text = "") =>
  String(text || "")
    .toLowerCase()
    .replace(/[^a-z0-9+\-#.\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w && w.length > 2);

// ── Local skill extractor ─────────────────────────────────────────────────────
const SKILL_TAXONOMY = {
  frontend:  ["react","vue","angular","javascript","typescript","html","css","sass","webpack","nextjs","redux","tailwind"],
  backend:   ["node","nodejs","express","graphql","rest","restful","api","fastapi","django","flask","spring","laravel"],
  database:  ["mongodb","postgresql","mysql","redis","elasticsearch","firebase","sql","nosql","mongoose","prisma"],
  devops:    ["docker","kubernetes","aws","gcp","azure","terraform","ansible","jenkins","cicd","linux","nginx"],
  ml:        ["python","tensorflow","pytorch","scikit-learn","pandas","numpy","machine learning","deep learning","nlp","keras","bert","transformers"],
  mobile:    ["react native","flutter","swift","kotlin","android","ios"],
  testing:   ["jest","cypress","playwright","selenium","testing","tdd","bdd"],
  soft:      ["leadership","communication","teamwork","agile","scrum","kanban","analytical"],
  tools:     ["git","github","gitlab","jira","postman","linux","bash","shell"],
};
const ALL_SKILLS = Object.values(SKILL_TAXONOMY).flat();

function extractSkills(text) {
  const norm = text.toLowerCase().replace(/[^a-z0-9\s\+\#\.\/\-]/g, " ");
  return ALL_SKILLS.filter(skill => {
    const escaped = skill.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return new RegExp(`(^|[\\s,;/(])(${escaped})([\\s,;/)]|$)`, "i").test(norm);
  }).filter((v, i, a) => a.indexOf(v) === i);
}

// ── Scoring functions ─────────────────────────────────────────────────────────
function scoreKeywords(resumeText, jobDescription, jobTitle) {
  // Expand short JDs with role-inferred keywords so score isn't 0% for "backend" or "full stack"
  const ROLE_KEYWORDS = {
    "backend":      ["api","rest","database","server","nodejs","python","sql","authentication","microservices","docker"],
    "frontend":     ["react","javascript","html","css","ui","responsive","typescript","component","webpack","dom"],
    "full stack":   ["react","nodejs","api","database","javascript","html","css","rest","mongodb","sql"],
    "fullstack":    ["react","nodejs","api","database","javascript","html","css","rest","mongodb","sql"],
    "devops":       ["docker","kubernetes","ci","cd","linux","aws","pipeline","deployment","monitoring","terraform"],
    "data science": ["python","machine learning","pandas","numpy","sql","tensorflow","model","analysis","statistics"],
    "ml engineer":  ["python","tensorflow","pytorch","model","training","neural","nlp","deep learning","scikit"],
    "android":      ["kotlin","java","android","sdk","gradle","jetpack","mobile","firebase","api"],
    "ios":          ["swift","xcode","ios","objective","cocoa","firebase","mobile","api","uikit"],
    "cloud":        ["aws","azure","gcp","cloud","docker","kubernetes","serverless","lambda","s3","ec2"],
  };

  const titleNorm = (jobTitle||"").toLowerCase();
  let extraKeywords = [];
  for (const [role, kws] of Object.entries(ROLE_KEYWORDS)) {
    if (titleNorm.includes(role) || (jobDescription||"").toLowerCase().includes(role)) {
      extraKeywords = extraKeywords.concat(kws);
    }
  }

  const jdTokens    = tokenize((jobDescription||"") + " " + (jobTitle||"") + " " + extraKeywords.join(" "));
  const resumeTokens = new Set(tokenize(resumeText));
  const uniqueJd    = Array.from(new Set(jdTokens)).filter(t => t.length > 2);
  if (!uniqueJd.length) return { score: 0, matched: [], missing: [] };
  const matched = uniqueJd.filter(t => resumeTokens.has(t));
  const missing = uniqueJd.filter(t => !resumeTokens.has(t)).slice(0, 15);
  return {
    score: Math.round((matched.length / uniqueJd.length) * 100),
    matched: matched.slice(0, 15),
    missing,
  };
}

function scoreFormatting(text) {
  let score = 40;
  const sections = ["experience","education","skills","projects","summary","certifications","achievements","work history"];
  const found = sections.filter(s => text.toLowerCase().includes(s));
  score += found.length * 8;
  if (text.length > 300)  score += 5;
  if (text.length > 800)  score += 5;
  if (text.length > 1500) score += 5;
  if (/@[a-z0-9.]+\.[a-z]{2,}/i.test(text))    score += 5;
  if (/\+?\d[\d\s\-()]{7,}\d/.test(text))       score += 3;
  if (/linkedin\.com/i.test(text))               score += 4;
  if (/github\.com/i.test(text))                 score += 3;
  if (/\b(20\d{2}|19\d{2})\b/.test(text))       score += 5;
  return Math.min(Math.round(score), 100);
}

function scoreExperience(text) {
  let score = 30;
  const years = (text.match(/\b(20\d{2}|19\d{2})\b/g) || []).length;
  score += Math.min(years * 5, 25);
  if (/\b(senior|lead|principal|staff|architect|head|vp|director|chief)\b/i.test(text)) score += 12;
  else if (/\b(junior|intern|fresher|entry|trainee)\b/i.test(text))                    score += 2;
  else if (/\b(engineer|developer|analyst|manager)\b/i.test(text))                     score += 8;
  const quantified = text.match(/\d+\s*(%|percent|users|customers|requests|ms|million|billion|\$|₹|lpa)/gi) || [];
  score += Math.min(quantified.length * 6, 20);
  const verbs = ["built","developed","designed","implemented","architected","led","managed","improved","reduced","increased","launched","deployed","optimized"];
  score += Math.min(verbs.filter(v => text.toLowerCase().includes(v)).length * 2, 12);
  return Math.min(Math.round(score), 100);
}

function scoreEducation(text) {
  let score = 35;
  const norm = text.toLowerCase();
  if (["phd","ph.d","doctorate","master","m.tech","m.e.","mba","bachelor","b.tech","b.e.","b.sc","degree","diploma"].some(d => norm.includes(d))) score += 30;
  if (["computer science","information technology","software","engineering","mathematics","statistics","data science"].some(f => norm.includes(f))) score += 20;
  if (/\b(iit|iim|nit|bits|iiit)\b/i.test(text)) score += 10;
  if (/cgpa|gpa|percentage|distinction|first class/i.test(text)) score += 5;
  return Math.min(Math.round(score), 100);
}

// ── Realistic Fraud Detection — Edge Case Engine ──────────────────────────────
function detectFraud(text) {
  const flags   = [];
  const norm    = text.toLowerCase();
  const lines   = text.split("\n").map(l => l.trim()).filter(l => l.length > 0);
  const currentYear = new Date().getFullYear();

  // ─── HELPER: extract all date ranges ────────────────────────────────────
  // Handles: "2015 – 2020", "2015-2020", "2015 to 2020", "2015 Present", "2015 2020"
  // Excludes: phone numbers (8765 4321), roll numbers, random 4-digit pairs
  const dateRangeRx = /\b((?:19|20)\d{2})\s*(?:[-–—to]+\s*)?((?:19|20)\d{2}|present|current|till date|ongoing|now)\b/gi;
  const periods = [];
  let m;
  while ((m = dateRangeRx.exec(text)) !== null) {
    const start = parseInt(m[1]);
    const end   = /present|current|till|ongoing|now/i.test(m[2]) ? currentYear : parseInt(m[2]);
    // Only valid career years: start must be 19xx or 20xx, end >= start, not future
    if (
      start >= 1990 && start <= currentYear &&
      end >= start && end <= currentYear + 1 &&
      !periods.some(p => p.start === start && p.end === end)
    ) {
      periods.push({ start, end, raw: m[0].trim() });
    }
  }

  const allYears = (text.match(/\b((?:19|20)\d{2})\b/g) || []).map(Number)
    .filter(y => y >= 1985 && y <= currentYear + 1);
  const uniqueYears = [...new Set(allYears)].sort((a, b) => a - b);

  // Graduation year: look for degree keywords near a year (handles flat PDF text)
  const gradMatch = text.match(/\b(?:b\.?tech|b\.?e\.?|b\.?sc|bachelor|graduation|passed out|class of|batch)\b[^.]{0,120}?\b((?:19|20)\d{2})\b/i)
    || text.match(/\b((?:19|20)\d{2})\b[^.]{0,60}?\b(?:b\.?tech|b\.?e\.?|bachelor)\b/i);
  const gradYear  = gradMatch
    ? parseInt((gradMatch[1] || gradMatch[0]).match(/\b((?:19|20)\d{2})\b/)[0])
    : null;

  // ═══════════════════════════════════════════════════════════════════════════
  // 1. SUBTLE DATE MANIPULATION — most common real fraud technique
  // ═══════════════════════════════════════════════════════════════════════════

  // 1a. Employment gap padding: start year earlier than realistic
  if (gradYear) {
    const jobsBeforeGrad = periods.filter(p => p.start < gradYear - 1 && p.end >= gradYear - 1);
    if (jobsBeforeGrad.length > 0)
      flags.push({
        type: "pre_graduation_employment",
        severity: "high",
        detail: `Job period(s) starting before graduation year (${gradYear}): ${jobsBeforeGrad.map(p=>p.raw).join(", ")}. Candidate claims full-time employment before completing their degree — verify carefully.`,
      });

    // 1b. Career span vs graduation mismatch
    if (uniqueYears.length >= 2) {
      const earliestJobYear = Math.min(...periods.map(p => p.start));
      const impliedExp      = currentYear - earliestJobYear;
      const maxPossibleExp  = currentYear - gradYear;
      if (impliedExp > maxPossibleExp + 2 && impliedExp > 5)
        flags.push({
          type: "career_span_mismatch",
          severity: "high",
          detail: `Resume implies ${impliedExp} years of work experience (jobs from ${earliestJobYear}) but graduation was in ${gradYear}, allowing only ~${maxPossibleExp} years. The earliest job dates appear backdated.`,
        });
    }
  }

  // 1c. Overlapping full-time employment periods (> 6 months overlap)
  const overlapPairs = [];
  for (let i = 0; i < periods.length; i++) {
    for (let j = i + 1; j < periods.length; j++) {
      const overlapYears = Math.min(periods[i].end, periods[j].end) - Math.max(periods[i].start, periods[j].start);
      if (overlapYears >= 1) // at least 1 full year overlap
        overlapPairs.push({
          a: `${periods[i].start}–${periods[i].end}`,
          b: `${periods[j].start}–${periods[j].end}`,
          years: overlapYears,
        });
    }
  }
  if (overlapPairs.length > 0) {
    const worst = overlapPairs.sort((a,b)=>b.years-a.years)[0];
    flags.push({
      type: "date_overlap",
      severity: overlapPairs.length >= 2 ? "high" : "medium",
      detail: `${overlapPairs.length} overlapping employment period(s) detected. Longest overlap: ${worst.a} and ${worst.b} (${worst.years} year${worst.years>1?"s":""}). Two simultaneous full-time roles is a strong fraud signal.`,
    });
  }

  // 1d. Exact same start AND end year used in multiple unrelated jobs
  //     (copy-paste mistake — real sign of fabricated entries)
  const periodStrings = periods.map(p => `${p.start}-${p.end}`);
  const dupePeriods   = periodStrings.filter((p, i) => periodStrings.indexOf(p) !== i);
  if (dupePeriods.length > 0)
    flags.push({
      type: "duplicate_date_ranges",
      severity: "medium",
      detail: `Identical date ranges used for multiple job entries (${[...new Set(dupePeriods)].join(", ")}). This is a common mistake when fabricating work history entries.`,
    });

  // 1e. Suspiciously clean year-boundary dates (every job starts Jan, ends Dec)
  //     Real careers rarely align perfectly to calendar years across 4+ roles
  if (periods.length >= 4) {
    // All periods happen to be exactly N years with no partial years
    const allExact = periods.every(p => (p.end - p.start) === Math.round(p.end - p.start));
    const totalPeriods = periods.length;
    if (allExact && totalPeriods >= 4)
      flags.push({
        type: "suspiciously_round_tenure",
        severity: "low",
        detail: `All ${totalPeriods} job tenures appear as exact whole-year periods with no partial years (e.g. 2018–2020, 2020–2022). Real careers rarely align this cleanly — dates may have been rounded or fabricated.`,
      });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 2. COPY-PASTE FROM JOB DESCRIPTIONS — subtle but detectable
  // ═══════════════════════════════════════════════════════════════════════════

  // 2a. Bullet points that are verbatim JD-language, not first-person achievements
  const jdPhrases = [
    "responsible for", "duties include", "worked on various", "assisted in",
    "part of the team", "helped the team", "involved in", "exposure to",
    "knowledge of", "familiar with", "understanding of", "awareness of",
    "supported the development", "participated in", "contributed to the team",
  ];
  const jdHits = jdPhrases.filter(p => norm.includes(p));
  if (jdHits.length >= 3)
    flags.push({
      type: "passive_jd_language",
      severity: "medium",
      detail: `${jdHits.length} vague, passive phrases found: "${jdHits.slice(0,3).join('", "')}". Strong resumes use active ownership language. This pattern often indicates copy-pasted job descriptions or inflated involvement.`,
    });

  // 2b. Exact same bullet point repeated across jobs (copy-paste between roles)
  const bullets = lines.filter(l => /^[-•*]/.test(l) || /^\d+\./.test(l))
    .map(l => l.replace(/^[-•*\d.]\s*/, "").toLowerCase().trim())
    .filter(l => l.length > 20);
  const bulletSet  = new Map();
  bullets.forEach(b => bulletSet.set(b, (bulletSet.get(b)||0)+1));
  const dupeBullets = [...bulletSet.entries()].filter(([,c])=>c>1);
  if (dupeBullets.length >= 2)
    flags.push({
      type: "recycled_bullet_points",
      severity: "medium",
      detail: `${dupeBullets.length} bullet point(s) appear identically across multiple job entries. This strongly suggests copy-pasting the same description under different companies.`,
    });

  // ═══════════════════════════════════════════════════════════════════════════
  // 3. SKILL vs EXPERIENCE MISMATCH — knows tools that didn't exist yet
  // ═══════════════════════════════════════════════════════════════════════════

  // Technologies that were released/became mainstream after specific years
  const techReleaseDates = {
    "kubernetes":   2014, "docker":       2013, "nextjs":    2016,
    "flutter":      2018, "pytorch":      2016, "fastapi":   2018,
    "react native": 2015, "tensorflow":   2015, "tailwind":  2019,
    "graphql":      2015, "rust":         2015, "kotlin":    2016,
  };

  if (gradYear && periods.length > 0) {
    const earliestClaim = Math.min(...periods.map(p=>p.start));
    Object.entries(techReleaseDates).forEach(([tech, releaseYear]) => {
      if (norm.includes(tech) && earliestClaim < releaseYear - 1) {
        // They claim to have used this tech before it existed
        const jobsWithTech = lines.filter(l =>
          l.toLowerCase().includes(tech) && /\b(20\d{2}|19\d{2})\b/.test(l)
        );
        if (jobsWithTech.length > 0)
          flags.push({
            type: "anachronistic_skill",
            severity: "medium",
            detail: `"${tech}" is listed in experience sections dating to ${earliestClaim}, but ${tech} was not publicly available until ${releaseYear}. This suggests backdated experience entries.`,
          });
      }
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 4. ACHIEVEMENT CREDIBILITY — realistic number checks
  // ═══════════════════════════════════════════════════════════════════════════

  // 4a. Impossibly large user/revenue numbers for the claimed company size
  const bigNumbers = (text.match(/\b(\d[\d,]*)\s*(million|billion|users|customers|downloads|requests per|rpm|rps)\b/gi) || []);
  const parsedBig  = bigNumbers.map(n => {
    const num = parseFloat(n.replace(/,/g, ""));
    const isBillion = /billion/i.test(n);
    return isBillion ? num * 1000 : num;
  }).filter(n => !isNaN(n));
  if (parsedBig.some(n => n > 500)) // more than 500 million users claimed
    flags.push({
      type: "implausible_scale",
      severity: "medium",
      detail: `Claimed user/revenue scale (${bigNumbers.slice(0,2).join(", ")}) appears implausible for the roles described. Very few companies globally reach this scale — verify the actual project scope.`,
    });

  // 4b. Multiple 100% improvement claims (statistically near-impossible)
  const perfectPct = (text.match(/\b(100\s*%|doubled|tripled)\b/gi) || []);
  if (perfectPct.length >= 2)
    flags.push({
      type: "repeated_perfect_metrics",
      severity: "medium",
      detail: `"100%" or "doubled/tripled" improvement claimed ${perfectPct.length} times across different projects. Multiple separate 100% gains are statistically improbable — metrics may be exaggerated.`,
    });

  // 4c. Claimed response times / performance improvements that defy physics
  const perfClaims = (text.match(/\b(latency|response time|load time)\s*(reduced|improved|decreased|cut)\s*(by\s*)?(9[5-9]|100)\s*%/gi) || []);
  if (perfClaims.length > 0)
    flags.push({
      type: "extreme_performance_claim",
      severity: "medium",
      detail: `Claims of 95–100% latency/performance improvement: "${perfClaims[0]}". Such gains are extremely rare — a 50–70% improvement is considered excellent. Verify with technical references.`,
    });

  // ═══════════════════════════════════════════════════════════════════════════
  // 5. STRUCTURAL INCONSISTENCIES — things real resumes don't have
  // ═══════════════════════════════════════════════════════════════════════════

  // 5a. Company names that don't match the seniority claimed
  //     e.g. "Intern" at a company while also claiming CTO elsewhere same year
  const ctoClaims    = norm.match(/\b(cto|chief technology|vp of engineering|head of engineering|director of engineering)\b/gi) || [];
  const internClaims = norm.match(/\b(intern|trainee|fresher|junior developer|associate engineer)\b/gi) || [];
  if (ctoClaims.length > 0 && internClaims.length > 0)
    flags.push({
      type: "contradictory_seniority",
      severity: "high",
      detail: `Resume contains both senior leadership titles (${ctoClaims[0]}) and junior/intern roles (${internClaims[0]}). While career progression is normal, simultaneous contradictory seniority levels suggest fabricated entries.`,
    });

  // 5b. Total career duration check: sum of all tenures vs years since graduation
  if (periods.length >= 2 && gradYear) {
    const totalTenureYears = periods.reduce((sum, p) => sum + (p.end - p.start), 0);
    const careerSpan       = currentYear - gradYear;
    // Allow 20% overlap for legitimate part-time/consulting roles
    if (totalTenureYears > careerSpan * 1.3 && totalTenureYears > careerSpan + 3)
      flags.push({
        type: "total_tenure_exceeds_career",
        severity: "high",
        detail: `Sum of all job tenures (${totalTenureYears} years) exceeds total possible career span since graduation (${careerSpan} years since ${gradYear}). This mathematically requires either overlapping roles or backdated start dates.`,
      });
  }

  // 5c. Missing contact info (phone or email)
  const hasEmail = /@[a-z0-9.]+\.[a-z]{2,}/i.test(text);
  const hasPhone = /(\+91|0)?[\s\-]?[6-9]\d{9}|\+?[\d\s\-()]{10,}/i.test(text);
  if (!hasEmail || !hasPhone)
    flags.push({
      type: "incomplete_contact",
      severity: "low",
      detail: `${!hasEmail ? "Email address" : "Phone number"} missing from resume. While not definitive, fraudulent resumes sometimes omit contact details to avoid easy verification.`,
    });

  // 5d. Projects with no dates, tech stack, or measurable outcomes
  //     (vague project descriptions are a padding technique)
  const projectSection = text.match(/project[s]?[\s\S]{0,2000}/i)?.[0] || "";
  if (projectSection.length > 100) {
    const projectLines = projectSection.split("\n").filter(l => l.trim().length > 10);
    const vagueProjects = projectLines.filter(l =>
      /\b(project|built|developed|created)\b/i.test(l) &&
      !/\b(20\d{2}|19\d{2}|github|users|requests|reduced|improved|increased|\d+)\b/i.test(l)
    );
    if (vagueProjects.length >= 3)
      flags.push({
        type: "vague_projects",
        severity: "low",
        detail: `${vagueProjects.length} project description(s) lack dates, measurable outcomes, or technical specifics. Generic descriptions like "built a web application" without context are a common resume padding technique.`,
      });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 6. EDUCATION ANOMALIES
  // ═══════════════════════════════════════════════════════════════════════════

  // 6a. Multiple degrees overlapping in time
  const degreeYears = [];
  const degreeRx = /(b\.?tech|b\.?e\.?|m\.?tech|mba|m\.?sc|phd|bachelor|master|degree)\b[\s\S]{0,100}?\b(20\d{2}|19\d{2})\b/gi;
  while ((m = degreeRx.exec(text)) !== null)
    degreeYears.push(parseInt(m[0].match(/\b(20\d{2}|19\d{2})\b/)[0]));

  if (degreeYears.length >= 2) {
    const sortedDeg = degreeYears.sort((a,b)=>a-b);
    for (let i = 1; i < sortedDeg.length; i++) {
      if (sortedDeg[i] - sortedDeg[i-1] < 2)
        flags.push({
          type: "degree_timeline_anomaly",
          severity: "medium",
          detail: `Multiple degrees completed within ${sortedDeg[i]-sortedDeg[i-1]} year(s) of each other (${sortedDeg[i-1]} and ${sortedDeg[i]}). Full-time degree programs typically take 3–4 years — verify enrollment.`,
        });
    }
  }

  // 6b. Claimed a tier-1 institution but no details (CGPA, year, branch)
  const tier1 = /\b(iit|iim|nit|bits|iiit|iisc)\b/i.test(text);
  if (tier1) {
    const hasCgpa   = /\b(cgpa|gpa|percentage|%)\b/i.test(text);
    const hasBranch = /\b(computer science|electronics|electrical|mechanical|civil|cse|ece|it)\b/i.test(text);
    if (!hasCgpa && !hasBranch)
      flags.push({
        type: "unverifiable_elite_institution",
        severity: "medium",
        detail: "Claims attendance at IIT/IIM/NIT/BITS but provides no branch, CGPA, or batch year — details that every genuine graduate would know. Tier-1 institution claims without supporting details warrant verification.",
      });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SCORE & SUMMARY
  // ═══════════════════════════════════════════════════════════════════════════
  const fraudScore = Math.min(
    flags.reduce((acc, f) =>
      acc + (f.severity === "high" ? 35 : f.severity === "medium" ? 18 : 8), 0),
    100
  );

  const summary = flags.length === 0
    ? "No suspicious patterns detected. Resume appears authentic based on automated checks."
    : flags.map((f, i) => `${i + 1}. [${f.severity.toUpperCase()}] ${f.detail}`).join("\n");

  return {
    isFraudSuspected: fraudScore >= 25,
    fraudScore,
    flags,
    analysis: fraudScore >= 60
      ? "HIGH RISK: Multiple strong fraud indicators detected. Do not proceed without manual verification of employment and education."
      : fraudScore >= 25
      ? "MODERATE RISK: Suspicious patterns found. Cross-check dates, LinkedIn profile, and contact references before shortlisting."
      : "LOW RISK: No major anomalies detected. Standard verification recommended.",
    summary,
  };
}


async function analyzeResume(resumeText, jobDescription, jobTitle = "") {
  if (!resumeText || resumeText.trim().length < 50) {
    return {
      atsScore: 0,
      breakdown: { keywordScore: 0, formattingScore: 0, experienceScore: 0, educationScore: 0, skillsScore: 0 },
      matchedKeywords: [], missingKeywords: [], foundSkills: [], missingSkills: [],
      recommendations: ["Resume text could not be extracted. Please upload a valid PDF or DOCX."],
      fraud: { isFraudSuspected: false, fraudScore: 0, flags: [], analysis: "Unable to analyze.", summary: "" },
      analyzedAt: new Date(),
    };
  }

  const { score: keywordScore, matched, missing: missingKeywords } = scoreKeywords(resumeText, jobDescription, jobTitle);
  const formattingScore = scoreFormatting(resumeText);
  const experienceScore = scoreExperience(resumeText);
  const educationScore  = scoreEducation(resumeText);
  const resumeSkills    = extractSkills(resumeText);
  const { matchedSkills, missingSkills, skillScore: skillsScore } = matchSkills(resumeSkills, jobTitle, jobDescription);

  let atsScore = Math.round(
    keywordScore    * 0.35 +
    formattingScore * 0.15 +
    experienceScore * 0.25 +
    educationScore  * 0.15 +
    skillsScore     * 0.10
  );

  const isFresher = /fresher|intern|no experience|entry.?level|just graduated/i.test(resumeText);
  const hasQuantified = /\d+\s*(%|percent|users|customers|revenue|million|billion)/i.test(resumeText);
  if (isFresher && !hasQuantified) atsScore = Math.min(atsScore, 45);
  atsScore = Math.max(20, Math.min(90, atsScore));

  const fraud = detectFraud(resumeText);

  const recommendations = [];
  if (keywordScore    < 55) recommendations.push("Add more keywords from the job description to your resume");
  if (formattingScore < 55) recommendations.push("Add clear section headers: Experience, Skills, Education, Projects");
  if (experienceScore < 55) recommendations.push("Quantify achievements — use numbers like %, users, revenue, or time saved");
  if (missingSkills.length > 0) recommendations.push(`Learn or highlight: ${missingSkills.slice(0, 3).join(", ")}`);
  recommendations.push("Align resume keywords with job description responsibilities");
  recommendations.push("Add 2-3 measurable achievements for each role/project");

  return {
    atsScore,
    breakdown: { keywordScore, formattingScore, experienceScore, educationScore, skillsScore },
    matchedKeywords: matched.map(k => ({ keyword: k, found: true })),
    missingKeywords,
    foundSkills:  resumeSkills,
    missingSkills,
    matchedSkills,
    recommendations: recommendations.slice(0, 5),
    fraud,
    analyzedAt: new Date(),
  };
}

module.exports = { analyzeResume, detectFraud, extractSkills, ALL_SKILLS };