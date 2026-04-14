/**
 * atsEngine.js — Strict ATS scoring
 * Adapted from reference project ML service prompts and fallback logic.
 * Place at: backend/ml/atsEngine.js
 */

const { matchSkills } = require("../utils/skillMatcher");

// ── Stop words — excluded from keyword matching ───────────────────────────────
const STOP_WORDS = new Set([
  "the","a","an","and","or","but","in","on","at","to","for","of","with","by",
  "from","is","are","was","were","be","been","being","have","has","had","do",
  "does","did","will","would","could","should","may","might","must","can","it",
  "its","this","that","these","those","we","our","you","your","i","my","me",
  "he","she","they","their","them","us","as","if","so","than","then","when",
  "where","which","who","what","how","all","any","both","each","few","more",
  "most","other","some","such","no","not","only","own","same","too","very",
  "looking","seeking","join","work","working","based","well","able","using",
  "strong","good","great","excellent","plus","also","via","per","etc","new",
  "get","use","make","build","help","want","need","like","experience",
]);

// ── Tokenizer (filters stop words) ───────────────────────────────────────────
const tokenize = (text = "") =>
  String(text || "")
    .toLowerCase()
    .replace(/[^a-z0-9+\-#.\s]/g, " ")
    .split(/\s+/)
    .filter(w => w && w.length > 2 && !STOP_WORDS.has(w));

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
  // Only use meaningful JD tokens (no stop words, min length 3)
  const jdTokens     = tokenize(jobDescription + " " + jobTitle);
  const resumeTokens = new Set(tokenize(resumeText));
  // Deduplicate JD tokens
  const uniqueJd = Array.from(new Set(jdTokens)).filter(t => t.length >= 3);
  if (!uniqueJd.length) return { score: 0, matched: [], missing: [] };
  const matched = uniqueJd.filter(t => resumeTokens.has(t));
  const missing = uniqueJd.filter(t => !resumeTokens.has(t)).slice(0, 15);
  // Cap score at 95 — perfect match is rare and some JD words are irrelevant
  return {
    score:   Math.min(Math.round((matched.length / uniqueJd.length) * 100), 95),
    matched: matched.slice(0, 15),
    missing,
  };
}

function scoreFormatting(text) {
  // Start from 0, earn points for each positive signal
  let score = 0;
  const norm = text.toLowerCase();

  // Core sections (5 pts each, max 35)
  const sections = ["experience","education","skills","projects","summary","certifications","achievements","work history"];
  const found = sections.filter(s => norm.includes(s));
  score += Math.min(found.length * 7, 35);

  // Contact info
  if (/@[a-z0-9.]+\.[a-z]{2,}/i.test(text))  score += 10; // email
  if (/\+?\d[\d\s\-()]{7,}\d/.test(text))     score += 8;  // phone
  if (/linkedin\.com/i.test(text))             score += 7;  // linkedin
  if (/github\.com/i.test(text))               score += 5;  // github

  // Content length (resume should be 400-2000 words)
  const wordCount = text.trim().split(/\s+/).length;
  if (wordCount >= 150)  score += 5;
  if (wordCount >= 300)  score += 5;
  if (wordCount >= 500)  score += 5;
  if (wordCount > 1500)  score -= 5; // too long

  // Dates in resume
  if (/\b(20\d{2}|19\d{2})\b/.test(text)) score += 5;

  // Bullet points / action verbs (structured content)
  const bulletLines = text.split("\n").filter(l => /^[\s]*[-•*]\s/.test(l));
  if (bulletLines.length >= 3)  score += 5;
  if (bulletLines.length >= 8)  score += 5;

  return Math.min(Math.round(score), 100);
}

function scoreExperience(text) {
  let score = 20; // base
  const norm = text.toLowerCase();

  // Years mentioned (each year = 2 pts, max 20)
  const yearMatches = (text.match(/\b(20\d{2}|19\d{2})\b/g) || []);
  const uniqueYears = new Set(yearMatches.map(Number));
  score += Math.min(uniqueYears.size * 3, 18);

  // Seniority level
  if (/\b(senior|lead|principal|staff|architect|head|vp|director|chief)\b/i.test(text)) score += 15;
  else if (/\b(engineer|developer|analyst|manager|consultant)\b/i.test(text))            score += 8;
  else if (/\b(junior|intern|fresher|entry|trainee)\b/i.test(text))                      score += 2;

  // Quantified achievements (most important)
  const quantified = text.match(/\d+\s*(%|percent|users|customers|requests|ms|million|billion|\$|₹|lpa|x\s|times)/gi) || [];
  score += Math.min(quantified.length * 8, 30);

  // Action verbs
  const verbs = ["built","developed","designed","implemented","architected","led","managed",
    "improved","reduced","increased","launched","deployed","optimized","created","delivered",
    "automated","integrated","scaled","migrated","refactored"];
  const verbCount = verbs.filter(v => norm.includes(v)).length;
  score += Math.min(verbCount * 2, 14);

  return Math.min(Math.round(score), 100);
}

function scoreEducation(text) {
  let score = 20; // base
  const norm = text.toLowerCase();

  // Degree level
  if (/\b(phd|ph\.d|doctorate)\b/i.test(text))                                          score += 40;
  else if (/\b(master|m\.tech|m\.e\.|mba|m\.sc|ms\b)\b/i.test(text))                   score += 30;
  else if (/\b(bachelor|b\.tech|b\.e\.|b\.sc|b\.s\b|degree|undergraduate)\b/i.test(text)) score += 22;
  else if (/\b(diploma|associate)\b/i.test(text))                                        score += 12;

  // Relevant field
  if (/\b(computer science|information technology|software engineering|data science|mathematics|statistics|electronics|electrical)\b/i.test(text)) score += 18;

  // Prestigious institutions
  if (/\b(iit|iim|nit|bits|iiit)\b/i.test(text)) score += 12;

  // GPA/grades
  if (/cgpa|gpa|percentage|distinction|first class|first division/i.test(text)) score += 8;

  return Math.min(Math.round(score), 100);
}

// ── Fraud detection (from reference project baseline_fraud_features logic) ────
function detectFraud(text) {
  const flags = [];
  const norm  = text.toLowerCase();
  const currentYear = new Date().getFullYear();

  // Future years (clear fraud signal)
  const years = (text.match(/\b(19\d{2}|20\d{2})\b/g) || []).map(Number);
  const futureYears = years.filter(y => y > currentYear + 1);
  if (futureYears.length > 0)
    flags.push({ type: "future_dates", severity: "high", evidence: `Future years detected: ${futureYears.join(", ")}` });

  // Inflated titles with minimal content — only flag if resume is VERY thin
  ["certified genius","top 1% worldwide","world-class expert","best in class globally","world famous developer"].forEach(t => {
    if (norm.includes(t))
      flags.push({ type: "inflated_title", severity: "medium", evidence: `Suspicious self-claim: "${t}"` });
  });

  // Suspicious claims — only very obvious fakes
  ["certified genius","fake credentials","lorem ipsum","sample resume","test resume","placeholder name"].forEach(kw => {
    if (norm.includes(kw))
      flags.push({ type: "suspicious_language", severity: "high", evidence: `Suspicious content: "${kw}"` });
  });

  // Thin resume — must be extremely short to flag
  if (text.trim().length < 150)
    flags.push({ type: "insufficient_content", severity: "medium", evidence: "Resume has very little content" });

  // Duplicate content — only flag severe duplication
  const lines = text.split("\n").filter(l => l.trim().length > 30);
  const unique = new Set(lines.map(l => l.trim().toLowerCase()));
  if (lines.length > 15 && unique.size / lines.length < 0.4)
    flags.push({ type: "duplicate_content", severity: "medium", evidence: "High proportion of duplicate content" });

  // Date overlaps — only flag if 3+ overlapping periods (people often work 2 jobs)
  const datePattern = /(\d{4})\s*[-–to]+\s*(\d{4}|present|current)/gi;
  const periods = [];
  let m;
  while ((m = datePattern.exec(text)) !== null) {
    const start = parseInt(m[1]);
    const end = m[2].match(/present|current/i) ? currentYear : parseInt(m[2]);
    if (start <= end && start >= 1980) periods.push({ start, end });
  }
  let overlapCount = 0;
  for (let i = 0; i < periods.length; i++) {
    for (let j = i + 1; j < periods.length; j++) {
      const overlap = Math.min(periods[i].end, periods[j].end) - Math.max(periods[i].start, periods[j].start);
      if (overlap > 2) overlapCount++;
    }
  }
  // Only flag if 3+ overlapping pairs (strongly suspicious)
  if (overlapCount >= 3)
    flags.push({ type: "date_overlap", severity: "medium", evidence: `${overlapCount} suspicious employment date overlap(s) detected` });

  const fraudScore = Math.min(
    flags.reduce((acc, f) => acc + (f.severity === "high" ? 40 : f.severity === "medium" ? 20 : 10), 0),
    100
  );

  return {
    isFraudSuspected: fraudScore >= 60,   // raised from 30 → 60
    fraudScore,
    flags,
    analysis: fraudScore >= 60 ? "HIGH RISK: Strong fraud indicators. Manual verification required."
      : fraudScore >= 40 ? "MODERATE RISK: Suspicious patterns. Verify key credentials."
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

  // Weighted ATS score — rebalanced for fairness
  // Keywords: 30% | Skills: 25% | Experience: 25% | Formatting: 12% | Education: 8%
  let atsScore = Math.round(
    keywordScore    * 0.30 +
    skillsScore     * 0.25 +
    experienceScore * 0.25 +
    formattingScore * 0.12 +
    educationScore  * 0.08
  );

  // Strict caps
  const isFresher    = /fresher|intern|no experience|entry.?level|just graduated/i.test(resumeText);
  const hasQuantified = /\d+\s*(%|percent|users|customers|revenue|million|billion)/i.test(resumeText);
  if (isFresher && !hasQuantified) atsScore = Math.min(atsScore, 48);

  // Realistic ATS range: 15 (empty) to 88 (exceptional)
  // Scores above 88 would require a near-perfect resume which is very rare
  atsScore = Math.max(15, Math.min(88, atsScore));

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