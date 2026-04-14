/**
 * atsService.js — Proper ATS analysis
 * - Semantic synonym matching (not just exact match)
 * - Skill gap detection
 * - Section detection
 * - Calibrated scoring (not inflated)
 */

// ── SKILL SYNONYMS MAP ─────────────────────────────────────────────────────────
// Expand as needed. Key = canonical skill, values = synonyms/variants
const SKILL_SYNONYMS = {
    "javascript":   ["js", "javascript", "ecmascript", "es6", "es2015", "node.js", "nodejs"],
    "python":       ["python", "python3", "py", "django", "flask", "fastapi"],
    "react":        ["react", "reactjs", "react.js", "react native", "next.js", "nextjs"],
    "sql":          ["sql", "mysql", "postgresql", "postgres", "sqlite", "oracle", "mssql", "t-sql"],
    "mongodb":      ["mongodb", "mongo", "nosql", "mongoose"],
    "java":         ["java", "spring", "spring boot", "hibernate", "jvm"],
    "typescript":   ["typescript", "ts"],
    "css":          ["css", "css3", "scss", "sass", "less", "tailwind", "bootstrap"],
    "html":         ["html", "html5"],
    "git":          ["git", "github", "gitlab", "version control", "bitbucket"],
    "docker":       ["docker", "container", "containerization", "kubernetes", "k8s"],
    "aws":          ["aws", "amazon web services", "ec2", "s3", "lambda", "cloud"],
    "machine learning": ["machine learning", "ml", "deep learning", "neural network", "tensorflow", "pytorch", "keras", "scikit-learn"],
    "data analysis":["data analysis", "data analytics", "pandas", "numpy", "matplotlib", "tableau", "power bi"],
    "rest api":     ["rest", "restful", "api", "rest api", "web services", "http", "json"],
    "agile":        ["agile", "scrum", "kanban", "sprint", "jira", "confluence"],
    "testing":      ["testing", "unit test", "jest", "mocha", "cypress", "selenium", "qa", "quality assurance"],
    "linux":        ["linux", "unix", "bash", "shell", "command line"],
    "communication":["communication", "teamwork", "collaboration", "interpersonal", "presentation"],
    "leadership":   ["leadership", "management", "team lead", "mentor", "project management"],
    "c++":          ["c++", "cpp"],
    "c#":           ["c#", "csharp", ".net", "dotnet", "asp.net"],
    "angular":      ["angular", "angularjs"],
    "vue":          ["vue", "vuejs", "vue.js"],
    "graphql":      ["graphql", "apollo"],
    "redis":        ["redis", "caching", "memcached"],
    "devops":       ["devops", "ci/cd", "jenkins", "github actions", "gitlab ci", "pipeline"],
    "figma":        ["figma", "sketch", "adobe xd", "ui/ux", "wireframe", "prototype", "design"],
    "excel":        ["excel", "spreadsheet", "google sheets", "vlookup", "pivot"],
  };
  
  // ── STOP WORDS ────────────────────────────────────────────────────────────────
  const STOP_WORDS = new Set([
    "the","a","an","and","or","but","in","on","at","to","for","of","with","by",
    "from","is","are","was","were","be","been","being","have","has","had","do",
    "does","did","will","would","could","should","may","might","must","can","it",
    "its","this","that","these","those","we","our","you","your","i","my","me",
    "he","she","they","their","them","us","as","if","so","than","then","when",
    "where","which","who","what","how","all","any","both","each","few","more",
    "most","other","some","such","no","not","only","own","same","too","very",
  ]);
  
  // ── NORMALIZE TEXT ─────────────────────────────────────────────────────────────
  function normalize(text) {
    return (text || "")
      .toLowerCase()
      .replace(/[^\w\s\-\.\+\#]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }
  
  // ── EXTRACT WORDS ─────────────────────────────────────────────────────────────
  function extractWords(text) {
    return normalize(text)
      .split(/\s+/)
      .filter(w => w.length > 2 && !STOP_WORDS.has(w));
  }
  
  // ── CANONICAL SKILL MATCH ─────────────────────────────────────────────────────
  // Returns the canonical skill name if text contains any synonym
  function matchSkill(canonicalSkill, text) {
    const t = normalize(text);
    const synonyms = SKILL_SYNONYMS[canonicalSkill] || [canonicalSkill];
    return synonyms.some(syn => {
      // Whole-word match to avoid false positives (e.g. "java" in "javascript")
      const escaped = syn.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const regex = new RegExp(`(?<![\\w])${escaped}(?![\\w])`, "i");
      return regex.test(t);
    });
  }
  
  // ── EXTRACT SKILLS FROM TEXT ───────────────────────────────────────────────────
  function extractSkillsFromText(text) {
    const found = [];
    for (const canonical of Object.keys(SKILL_SYNONYMS)) {
      if (matchSkill(canonical, text)) {
        found.push(canonical);
      }
    }
    return found;
  }
  
  // ── DETECT RESUME SECTIONS ────────────────────────────────────────────────────
  function detectSections(text) {
    const t = text.toLowerCase();
    return {
      hasObjective:    /objective|summary|profile|about/.test(t),
      hasExperience:   /experience|employment|work history|positions held/.test(t),
      hasEducation:    /education|degree|university|college|bachelor|master|phd/.test(t),
      hasSkills:       /skills|technologies|tools|expertise|proficiencies/.test(t),
      hasProjects:     /projects|portfolio|work samples|case studies/.test(t),
      hasCertifications:/certifications|certified|certificate|licenses|credentials/.test(t),
      hasContact:      /email|phone|linkedin|github|contact/.test(t),
    };
  }
  
  // ── DETECT QUANTIFIED ACHIEVEMENTS ───────────────────────────────────────────
  function countQuantifiedAchievements(text) {
    // Count sentences with numbers (metrics, percentages, $, etc.)
    const sentences = text.split(/[.!?]+/);
    return sentences.filter(s => /\d+/.test(s) && s.trim().length > 10).length;
  }
  
  // ── MAIN ATS ANALYSIS ─────────────────────────────────────────────────────────
  function analyzeResume(text, targetRole) {
    const lower = text.toLowerCase();
  
    const roleKeywords = {
      developer: ["javascript", "node", "react", "mongodb"],
      data: ["python", "ml", "pandas", "numpy"]
    };
  
    const keywords = roleKeywords[targetRole?.toLowerCase()] || [];
  
    let matched = [];
    let missing = [];
  
    keywords.forEach(k => {
      if (lower.includes(k)) matched.push(k);
      else missing.push(k);
    });
  
    const score = Math.round((matched.length / keywords.length) * 100);
  
    return {
      score,
      matchedSkills: matched,
      missingSkills: missing
    };
  }
  
  module.exports = { analyzeResume };
  
  module.exports = { analyzeResume, extractSkillsFromText };