const natural   = require("natural");
const tokenizer = new natural.WordTokenizer();

const SKILL_TAXONOMY = {
  frontend:  ["react","vue","angular","javascript","typescript","html","css","sass","webpack","nextjs","redux","tailwind","figma","jquery","bootstrap"],
  backend:   ["node","nodejs","express","graphql","rest","restful","microservices","api","fastapi","django","flask","spring","laravel","rails","nestjs"],
  database:  ["mongodb","postgresql","mysql","redis","elasticsearch","firebase","sql","nosql","mongoose","prisma","cassandra","dynamodb","oracle"],
  devops:    ["docker","kubernetes","aws","gcp","azure","terraform","ansible","jenkins","github actions","cicd","linux","nginx","helm","prometheus","grafana"],
  ml:        ["python","tensorflow","pytorch","scikit-learn","pandas","numpy","machine learning","deep learning","nlp","keras","bert","transformers","opencv"],
  mobile:    ["react native","flutter","swift","kotlin","android","ios","expo","xamarin"],
  testing:   ["jest","cypress","playwright","selenium","mocha","junit","testing","tdd","bdd"],
  soft:      ["leadership","communication","teamwork","agile","scrum","kanban","problem solving","collaboration","mentoring","analytical","critical thinking"],
  tools:     ["git","github","gitlab","jira","confluence","figma","postman","vscode","linux","bash","shell"],
};

const ALL_SKILLS = Object.values(SKILL_TAXONOMY).flat();

// Words that look like keywords but mean nothing for matching
const STOPWORDS = new Set([
  "the","and","for","with","are","will","have","been","must","should",
  "you","our","your","that","this","from","not","but","can","all",
  "their","they","into","more","also","any","who","has","its","was",
  "were","would","could","need","required","preferred","strong","good",
  "excellent","experience","knowledge","understanding","work","working",
  "team","role","position","job","company","looking","candidate","ideal",
  "minimum","years","year","plus","highly","motivated","passionate","dynamic",
  "fast","environment","growth","opportunity","ability","skills",
]);

function normalize(text) {
  return text.toLowerCase()
    .replace(/[^a-z0-9\s\+\#\.\/\-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// Extract skills actually present in a text
function extractSkills(text) {
  const norm = normalize(text);
  const found = [];
  ALL_SKILLS.forEach(skill => {
    // Use word-boundary style matching: skill must appear as a standalone word/phrase
    const escaped = skill.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const pattern = new RegExp(`(^|[\\s,;/\\(\\)])(${escaped})([\\s,;/\\(\\)]|$)`, "i");
    if (pattern.test(norm)) {
      found.push(skill);
    }
  });
  return [...new Set(found)];
}

// Extract meaningful keywords from JD (only technical/skill terms, not generic words)
function extractKeywordsFromJD(jd) {
  if (!jd) return [];
  const norm = normalize(jd);

  // First get skills from taxonomy that appear in JD
  const skillsInJD = extractSkills(jd);

  // Then get other technical tokens (non-stopword, reasonable length)
  const tokens = tokenizer.tokenize(norm)
    .filter(t => t.length > 3 && t.length < 25 && !STOPWORDS.has(t));

  // Combine: skills first (higher priority), then other unique tokens
  const combined = [...new Set([...skillsInJD, ...tokens])];

  // Filter out pure stopwords from combined list
  return combined.filter(k => !STOPWORDS.has(k)).slice(0, 30);
}

// Score keyword match — resume vs JD keywords
function scoreKeywords(resumeText, jdKeywords) {
  if (!jdKeywords.length) return { keywords: [], score: 50 };
  const norm = normalize(resumeText);

  const results = jdKeywords.map(kw => {
    const escaped = kw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    // For short skills use word boundary, for longer phrases use contains
    const pattern = kw.length <= 4
      ? new RegExp(`(^|[\\s,;/\\(\\)])(${escaped})([\\s,;/\\(\\)]|$)`, "i")
      : new RegExp(escaped, "i");
    const found  = pattern.test(norm);
    // Skills from taxonomy get double weight
    const weight = ALL_SKILLS.includes(kw.toLowerCase()) ? 2 : 1;
    return { keyword: kw, found, weight };
  });

  const totalWeight   = results.reduce((s, r) => s + r.weight, 0);
  const matchedWeight = results.filter(r => r.found).reduce((s, r) => s + r.weight, 0);
  const score = totalWeight > 0 ? Math.round((matchedWeight / totalWeight) * 100) : 0;

  return { keywords: results, score: Math.min(score, 100) };
}

// Score formatting / structure quality
function scoreFormatting(text) {
  let score = 40;
  const norm = text.toLowerCase();

  const sectionKeywords = [
    "experience","education","skills","summary","objective",
    "projects","certifications","achievements","work history","profile"
  ];
  const foundSections = sectionKeywords.filter(s => norm.includes(s));
  score += foundSections.length * 6;  // max +60

  // Length scoring
  if (text.length > 300)  score += 5;
  if (text.length > 800)  score += 5;
  if (text.length > 1500) score += 5;

  // Contact info present
  if (/@[a-z0-9.]+\.[a-z]{2,}/i.test(text)) score += 5;  // email
  if (/\+?\d[\d\s\-()]{7,}\d/.test(text))    score += 3;  // phone
  if (/linkedin\.com/i.test(text))            score += 4;
  if (/github\.com/i.test(text))              score += 3;

  // Dates present (suggests real experience timeline)
  if (/\b(20\d{2}|19\d{2})\b/.test(text)) score += 5;

  return Math.min(Math.round(score), 100);
}

// Score experience quality
function scoreExperience(text) {
  let score = 30;

  // Count year mentions as proxy for experience duration
  const years = (text.match(/\b(20\d{2}|19\d{2})\b/g) || []).length;
  score += Math.min(years * 5, 25);

  // Role seniority
  if (/\b(senior|lead|principal|staff|architect|head|vp|director|chief)\b/i.test(text)) score += 12;
  else if (/\b(junior|intern|fresher|entry|trainee)\b/i.test(text)) score += 2;
  else if (/\b(mid|middle|engineer|developer|analyst|manager)\b/i.test(text)) score += 8;

  // Quantified achievements (key ATS signal)
  const quantified = text.match(/\d+\s*(%|percent|users|customers|requests|ms|seconds|minutes|million|billion|\$|₹|lpa|lakh)/gi) || [];
  score += Math.min(quantified.length * 6, 20);

  // Action verbs
  const actionVerbs = ["built","developed","designed","implemented","architected","led","managed","improved","reduced","increased","launched","deployed","migrated","optimized","scaled","automated"];
  const verbCount = actionVerbs.filter(v => text.toLowerCase().includes(v)).length;
  score += Math.min(verbCount * 2, 12);

  return Math.min(Math.round(score), 100);
}

// Score education
function scoreEducation(text) {
  let score = 35;
  const norm = text.toLowerCase();

  const degrees = ["phd","ph.d","doctorate","master","m.tech","m.e.","m.sc","mba","bachelor","b.tech","b.e.","b.sc","degree","diploma"];
  const hasDegree = degrees.some(d => norm.includes(d));
  if (hasDegree) score += 30;

  const relevantFields = ["computer science","information technology","software","engineering","mathematics","statistics","data science","electronics","electrical"];
  if (relevantFields.some(f => norm.includes(f))) score += 20;

  // Top institution bonus
  if (/\b(iit|iim|nit|bits|iiit)\b/i.test(text)) score += 10;

  // GPA/grades
  if (/cgpa|gpa|percentage|distinction|first class/i.test(text)) score += 5;

  return Math.min(Math.round(score), 100);
}

// Fraud detection
function detectFraud(text) {
  const flags = [];
  const norm  = normalize(text);

  // Inflated titles with minimal content
  const inflatedTitles = ["ceo","founder","vp of","director of","head of","chief technology","principal engineer","staff engineer"];
  inflatedTitles.forEach(title => {
    if (norm.includes(title) && text.length < 800)
      flags.push({ type:"inflated_title", description:`Senior title "${title}" found with very minimal resume content`, severity:"medium" });
  });

  // Suspicious superlatives
  const suspicious = ["certified genius","top 1%","world-class","best in class","renowned expert","guaranteed","world famous"];
  suspicious.forEach(kw => {
    if (norm.includes(kw))
      flags.push({ type:"suspicious_language", description:`Suspicious self-claim: "${kw}"`, severity:"high" });
  });

  // Multiple concurrent senior roles (impossible)
  const seniorRoles = ["ceo","cto","coo","vp of","director of","head of"];
  const foundSenior = seniorRoles.filter(r => norm.includes(r));
  if (foundSenior.length >= 2 && text.length < 1500) {
    flags.push({ type:"multiple_senior_titles", description:`Claims ${foundSenior.length} senior-level positions simultaneously in a short resume`, severity:"high" });
  }

  // Very thin resume
  if (text.trim().length < 250)
    flags.push({ type:"insufficient_content", description:"Resume has very little content — possibly a placeholder", severity:"medium" });

  // Duplicate/copy-paste content
  const lines = text.split("\n").filter(l => l.trim().length > 20);
  const uniqueLines = new Set(lines.map(l => l.trim().toLowerCase()));
  if (lines.length > 10 && uniqueLines.size / lines.length < 0.65)
    flags.push({ type:"duplicate_content", description:"High proportion of duplicate content — possible template misuse or copy-paste fraud", severity:"medium" });

  // Employment date overlaps
  const datePattern = /(\d{4})\s*[-–to]+\s*(\d{4}|present|current)/gi;
  const periods = [];
  let m;
  while ((m = datePattern.exec(text)) !== null) {
    const start = parseInt(m[1]);
    const end   = m[2].toLowerCase().match(/present|current/) ? 2025 : parseInt(m[2]);
    periods.push({ start, end });
  }
  for (let i = 0; i < periods.length; i++) {
    for (let j = i + 1; j < periods.length; j++) {
      const overlap = Math.min(periods[i].end, periods[j].end) - Math.max(periods[i].start, periods[j].start);
      if (overlap > 1) {
        flags.push({ type:"date_overlap", description:`Employment date overlap of ${overlap} year(s) detected`, severity:"medium" });
        break;
      }
    }
    if (flags.some(f => f.type === "date_overlap")) break;
  }

  const fraudScore = Math.min(
    flags.reduce((acc, f) => acc + (f.severity === "high" ? 35 : f.severity === "medium" ? 20 : 10), 0),
    100
  );

  return {
    isFraudSuspected: fraudScore >= 30,
    fraudScore,
    flags,
    analysis: fraudScore >= 60
      ? "HIGH RISK: Strong fraud indicators detected. Manual verification strongly recommended."
      : fraudScore >= 30
      ? "MODERATE RISK: Suspicious patterns found. Recommend verifying key credentials."
      : "LOW RISK: Resume appears authentic.",
  };
}

async function analyzeResume(resumeText, jobDescription, jobTitle = "") {
  if (!resumeText || resumeText.trim().length < 50) {
    return {
      atsScore: 0,
      breakdown: { keywordScore:0, formattingScore:0, experienceScore:0, educationScore:0, skillsScore:0 },
      matchedKeywords: [], missingKeywords: [], foundSkills: [], missingSkills: [],
      recommendations: ["Resume text could not be extracted. Please upload a valid PDF or DOCX."],
      fraud: { isFraudSuspected:false, fraudScore:0, flags:[], analysis:"Unable to analyze." },
      analyzedAt: new Date(),
    };
  }

  // Extract keywords from JD
  const jdKeywords = extractKeywordsFromJD(jobDescription);

  // Score keyword match
  const { keywords, score: keywordScore } = scoreKeywords(resumeText, jdKeywords);

  // Score other dimensions
  const formattingScore = scoreFormatting(resumeText);
  const experienceScore = scoreExperience(resumeText);
  const educationScore  = scoreEducation(resumeText);

  // Skill gap analysis
  const resumeSkills  = extractSkills(resumeText);
  const jdSkills      = extractSkills(jobDescription || "");
  const matchedSkills = jdSkills.filter(s => resumeSkills.includes(s));
  const missingSkills = jdSkills.filter(s => !resumeSkills.includes(s));

  const skillsScore = jdSkills.length > 0
    ? Math.round((matchedSkills.length / jdSkills.length) * 100)
    : Math.min(resumeSkills.length * 8, 60);  // penalty if JD has no recognizable skills

  // Weighted ATS score
  const atsScore = Math.min(
    Math.round(
      keywordScore    * 0.35 +
      formattingScore * 0.15 +
      experienceScore * 0.25 +
      educationScore  * 0.15 +
      skillsScore     * 0.10
    ),
    100
  );

  // Fraud detection
  const fraud = detectFraud(resumeText);

  // Recommendations
  const recommendations = [];
  if (keywordScore    < 55) recommendations.push("Add more keywords from the job description that appear in your resume");
  if (formattingScore < 55) recommendations.push("Add clear section headers: Experience, Skills, Education, Projects");
  if (experienceScore < 55) recommendations.push("Quantify achievements — use numbers like %, users, revenue, or time saved");
  if (missingSkills.length > 0) recommendations.push(`Learn or highlight these skills required by the job: ${missingSkills.slice(0, 3).join(", ")}`);
  if (educationScore  < 45) recommendations.push("Add your education section with degree, institution, and graduation year");

  return {
    atsScore,
    breakdown: { keywordScore, formattingScore, experienceScore, educationScore, skillsScore },
    matchedKeywords: keywords.filter(k => k.found),
    missingKeywords: keywords.filter(k => !k.found).map(k => k.keyword),
    foundSkills:  resumeSkills,
    missingSkills,
    recommendations,
    fraud,
    analyzedAt: new Date(),
  };
}

module.exports = { analyzeResume, detectFraud, extractSkills, ALL_SKILLS };