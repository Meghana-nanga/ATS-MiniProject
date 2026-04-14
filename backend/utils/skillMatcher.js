/**
 * skillMatcher.js
 * Production-ready skill matching logic for ATS system.
 * Place this file at: backend/utils/skillMatcher.js
 */

// ── Skill normalization aliases ───────────────────────────────────────────────
// Maps variations to a canonical form before comparison
const SKILL_ALIASES = {
    "node":            "nodejs",
    "node.js":         "nodejs",
    "react.js":        "react",
    "reactjs":         "react",
    "vue.js":          "vue",
    "vuejs":           "vue",
    "next.js":         "nextjs",
    "express.js":      "express",
    "expressjs":       "express",
    "mongo":           "mongodb",
    "postgres":        "postgresql",
    "pg":              "postgresql",
    "sklearn":         "scikit-learn",
    "scikit learn":    "scikit-learn",
    "ml":              "machine learning",
    "dl":              "deep learning",
    "nlp":             "nlp",
    "k8s":             "kubernetes",
    "gha":             "github actions",
    "ci/cd":           "cicd",
    "ci cd":           "cicd",
    "js":              "javascript",
    "ts":              "typescript",
    "py":              "python",
    "tf":              "tensorflow",
    "pt":              "pytorch",
  };
  
  // ── Role → Required Skills Map ────────────────────────────────────────────────
  const ROLE_SKILLS = {
    "ai engineer":        ["python","tensorflow","pytorch","keras","scikit-learn","numpy","pandas","machine learning","deep learning","nlp","transformers"],
    "ml engineer":        ["python","tensorflow","pytorch","keras","scikit-learn","numpy","pandas","machine learning","deep learning","nlp"],
    "machine learning":   ["python","tensorflow","pytorch","keras","scikit-learn","numpy","pandas","machine learning","deep learning"],
    "data scientist":     ["python","pandas","numpy","scikit-learn","machine learning","sql","tensorflow","matplotlib","statistics"],
    "data analyst":       ["sql","python","pandas","analytics","mysql","postgresql","tableau","excel","statistics","power bi"],
    "data engineer":      ["python","sql","spark","hadoop","airflow","kafka","aws","docker","postgresql","mongodb"],
    "frontend engineer":  ["react","javascript","typescript","html","css","webpack","redux","nextjs","tailwind","git"],
    "frontend developer": ["react","javascript","typescript","html","css","webpack","redux","nextjs","git"],
    "backend engineer":   ["nodejs","express","python","sql","mongodb","postgresql","rest","api","docker","git"],
    "backend developer":  ["nodejs","express","python","sql","mongodb","postgresql","rest","api","docker","git"],
    "full stack":         ["react","nodejs","javascript","html","css","mongodb","sql","git","rest","api","docker"],
    "fullstack":          ["react","nodejs","javascript","html","css","mongodb","sql","git","rest","api","docker"],
    "mern":               ["react","nodejs","express","mongodb","javascript","html","css","git","rest","api"],
    "devops engineer":    ["docker","kubernetes","aws","linux","terraform","ansible","jenkins","cicd","bash","git"],
    "cloud engineer":     ["aws","gcp","azure","docker","kubernetes","terraform","linux","cicd","git"],
    "software engineer":  ["python","javascript","git","sql","rest","api","linux","nodejs","docker","testing"],
    "java developer":     ["java","spring","sql","git","rest","docker","junit","maven","hibernate"],
    "python developer":   ["python","django","flask","sql","git","rest","docker","pandas","pytest"],
    "mobile developer":   ["react native","flutter","swift","kotlin","android","ios","git","firebase"],
    "android developer":  ["kotlin","android","java","git","firebase","rest","jetpack","gradle"],
    "ios developer":      ["swift","ios","xcode","git","rest","firebase","objective-c"],
    "ui ux":              ["figma","css","html","javascript","react","tailwind","sass","adobe xd","sketch"],
    "product manager":    ["agile","scrum","jira","analytics","communication","leadership","kanban","roadmapping"],
    "qa engineer":        ["selenium","jest","cypress","testing","tdd","python","javascript","git","postman"],
    "cybersecurity":      ["linux","networking","python","bash","firewalls","encryption","penetration testing","git"],
    "blockchain":         ["solidity","ethereum","web3","javascript","nodejs","smart contracts","git"],
  };
  
  /**
   * Normalize a skill string:
   * - lowercase
   * - trim
   * - resolve aliases
   */
  function normalizeSkill(skill) {
    const s = skill.toLowerCase().trim();
    return SKILL_ALIASES[s] || s;
  }
  
  /**
   * Get required skills for a job role.
   * Tries to match job title first, then falls back to extracting
   * tech keywords directly from the job description text.
   */
  function getRequiredSkills(jobTitle, jobDescription) {
    const norm = (jobTitle || "").toLowerCase().trim();
  
    // Try exact role match
    for (const [role, skills] of Object.entries(ROLE_SKILLS)) {
      if (norm.includes(role)) {
        return [...new Set(skills.map(normalizeSkill))];
      }
    }
  
    // Try partial word match
    const words = norm.split(/\s+/);
    for (const [role, skills] of Object.entries(ROLE_SKILLS)) {
      if (words.some(w => w.length > 3 && role.includes(w))) {
        return [...new Set(skills.map(normalizeSkill))];
      }
    }
  
    // Fallback: extract known tech keywords from JD text
    const allKnownSkills = [...new Set(Object.values(ROLE_SKILLS).flat())];
    const jdNorm = (jobDescription || "").toLowerCase();
    const extracted = allKnownSkills.filter(skill => {
      const escaped = skill.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      return new RegExp(`(^|[\\s,;/()])${escaped}([\\s,;/()]|$)`, "i").test(jdNorm);
    });
  
    return [...new Set(extracted.map(normalizeSkill))];
  }
  
  /**
   * Main skill matching function.
   *
   * @param {string[]} resumeSkills  - Skills extracted from resume
   * @param {string}   jobTitle      - Job title (e.g. "AI Engineer")
   * @param {string}   jobDescription - Full job description text
   *
   * @returns {{
   *   matchedSkills: string[],
   *   missingSkills: string[],
   *   skillScore: number
   * }}
   */
  function matchSkills(resumeSkills, jobTitle, jobDescription) {
    // Normalize all resume skills
    const normalizedResume = [
      ...new Set((resumeSkills || []).map(normalizeSkill))
    ];
  
    // Get required skills for the role
    const requiredSkills = getRequiredSkills(jobTitle, jobDescription);
  
    // If no required skills found, score based on resume richness
    if (requiredSkills.length === 0) {
      return {
        matchedSkills: normalizedResume,
        missingSkills: [],
        skillScore: Math.min(normalizedResume.length * 8, 60),
      };
    }
  
    // Compare — both sides normalized
    const matchedSkills = requiredSkills.filter(s =>
      normalizedResume.includes(normalizeSkill(s))
    );
  
    const missingSkills = requiredSkills.filter(s =>
      !normalizedResume.includes(normalizeSkill(s))
    );
  
    // skillScore MUST be consistent:
    // if missingSkills is empty → skillScore = 100
    // otherwise → (matched / total) * 100
    const skillScore = missingSkills.length === 0
      ? 100
      : Math.round((matchedSkills.length / requiredSkills.length) * 100);
  
    return {
      matchedSkills,
      missingSkills,
      skillScore,
    };
  }
  
  module.exports = { matchSkills, getRequiredSkills, normalizeSkill, ROLE_SKILLS };