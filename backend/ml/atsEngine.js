/**
 * atsEngine.js — Strict ATS scoring
 * Adapted from reference project ML service prompts and fallback logic.
 * Place at: backend/ml/atsEngine.js
 */

const { matchSkills } = require("../utils/skillMatcher");

// ── Tokenizer (same as reference fallback logic) ──────────────────────────────
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
  const jdTokens    = tokenize(jobDescription + " " + jobTitle);
  const resumeTokens = new Set(tokenize(resumeText));
  const uniqueJd    = Array.from(new Set(jdTokens));
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

// ── Fraud detection (from reference project baseline_fraud_features logic) ────
function detectFraud(text) {
  const flags = [];
  const norm  = text.toLowerCase();
  const currentYear = new Date().getFullYear();

  // Future years
  const years = (text.match(/\b(19\d{2}|20\d{2})\b/g) || []).map(Number);
  const futureYears = years.filter(y => y > currentYear);
  if (futureYears.length > 0)
    flags.push({ type: "future_dates", severity: "high", evidence: `Future years detected: ${futureYears.join(", ")}` });

  // Inflated titles with minimal content
  ["ceo","founder","vp of","director of","chief technology","principal engineer"].forEach(t => {
    if (norm.includes(t) && text.length < 800)
      flags.push({ type: "inflated_title", severity: "medium", evidence: `"${t}" found with minimal resume content` });
  });

  // Suspicious claims
  ["certified genius","top 1%","world-class","best in class","world famous"].forEach(kw => {
    if (norm.includes(kw))
      flags.push({ type: "suspicious_language", severity: "high", evidence: `Suspicious claim: "${kw}"` });
  });

  // Thin resume
  if (text.trim().length < 250)
    flags.push({ type: "insufficient_content", severity: "medium", evidence: "Resume has very little content" });

  // Duplicate content
  const lines = text.split("\n").filter(l => l.trim().length > 20);
  const unique = new Set(lines.map(l => l.trim().toLowerCase()));
  if (lines.length > 10 && unique.size / lines.length < 0.65)
    flags.push({ type: "duplicate_content", severity: "medium", evidence: "High proportion of duplicate content" });

  // Date overlaps (from reference baseline_fraud_features)
  const datePattern = /(\d{4})\s*[-–to]+\s*(\d{4}|present|current)/gi;
  const periods = [];
  let m;
  while ((m = datePattern.exec(text)) !== null) {
    const start = parseInt(m[1]);
    const end = m[2].match(/present|current/i) ? currentYear : parseInt(m[2]);
    if (start <= end) periods.push({ start, end });
  }
  let overlapCount = 0;
  for (let i = 0; i < periods.length; i++) {
    for (let j = i + 1; j < periods.length; j++) {
      const overlap = Math.min(periods[i].end, periods[j].end) - Math.max(periods[i].start, periods[j].start);
      if (overlap > 1) { overlapCount++; break; }
    }
    if (overlapCount) break;
  }
  if (overlapCount >= 1)
    flags.push({ type: "date_overlap", severity: overlapCount >= 3 ? "high" : "medium", evidence: `${overlapCount} employment date overlap(s) detected` });

  const fraudScore = Math.min(
    flags.reduce((acc, f) => acc + (f.severity === "high" ? 35 : f.severity === "medium" ? 20 : 10), 0),
    100
  );

  return {
    isFraudSuspected: fraudScore >= 30,
    fraudScore,
    flags,
    analysis: fraudScore >= 60 ? "HIGH RISK: Strong fraud indicators. Manual verification required."
      : fraudScore >= 30 ? "MODERATE RISK: Suspicious patterns. Verify key credentials."
      : "LOW RISK: Resume appears authentic.",
  };
}

// ── Main export ───────────────────────────────────────────────────────────────
async function analyzeResume(resumeText, jobDescription, jobTitle = "") {
  if (!resumeText || resumeText.trim().length < 50) {
    return {
      atsScore: 0,
      breakdown: { keywordScore: 0, formattingScore: 0, experienceScore: 0, educationScore: 0, skillsScore: 0 },
      matchedKeywords: [], missingKeywords: [], foundSkills: [], missingSkills: [],
      recommendations: ["Resume text could not be extracted. Please upload a valid PDF or DOCX."],
      fraud: { isFraudSuspected: false, fraudScore: 0, flags: [], analysis: "Unable to analyze." },
      analyzedAt: new Date(),
    };
  }

  const { score: keywordScore, matched, missing: missingKeywords } = scoreKeywords(resumeText, jobDescription, jobTitle);
  const formattingScore = scoreFormatting(resumeText);
  const experienceScore = scoreExperience(resumeText);
  const educationScore  = scoreEducation(resumeText);

  // Skill gap using unified skillMatcher
  const resumeSkills = extractSkills(resumeText);
  const { matchedSkills, missingSkills, skillScore: skillsScore } = matchSkills(resumeSkills, jobTitle, jobDescription);

  // Weighted ATS score (reference project: strict, no inflation)
  let atsScore = Math.round(
    keywordScore    * 0.35 +
    formattingScore * 0.15 +
    experienceScore * 0.25 +
    educationScore  * 0.15 +
    skillsScore     * 0.10
  );

  // Strict caps (from reference project STRICT SCORING RULES)
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