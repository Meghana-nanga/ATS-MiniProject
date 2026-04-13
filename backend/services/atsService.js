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
  function analyzeResume(resumeText, jobDescription) {
    if (!resumeText || resumeText.trim().length < 50) {
      return { error: "Resume text is too short or empty" };
    }
  
    const resumeWords   = extractWords(resumeText);
    const jdWords       = extractWords(jobDescription || "");
    const resumeSkills  = extractSkillsFromText(resumeText);
    const jdSkills      = extractSkillsFromText(jobDescription || "");
    const sections      = detectSections(resumeText);
    const achievements  = countQuantifiedAchievements(resumeText);
  
    // ── 1. KEYWORD MATCH (30 pts) ─────────────────────────────────────────────
    let keywordScore = 0;
    const matchedKeywords   = [];
    const missingKeywords   = [];
  
    if (jdWords.length === 0) {
      // No JD: score based on resume content richness
      keywordScore = Math.min(30, Math.floor(resumeWords.length / 10));
    } else {
      // Unique important JD words (not stop words, not too common)
      const uniqueJdWords = [...new Set(jdWords)];
      const resumeWordSet = new Set(extractWords(resumeText));
  
      for (const word of uniqueJdWords) {
        if (resumeWordSet.has(word)) {
          matchedKeywords.push(word);
        } else {
          missingKeywords.push(word);
        }
      }
      const matchRatio = uniqueJdWords.length > 0
        ? matchedKeywords.length / uniqueJdWords.length
        : 0;
      keywordScore = Math.round(matchRatio * 30);
    }
  
    // ── 2. SKILL MATCH (35 pts) ───────────────────────────────────────────────
    let skillScore = 0;
    const matchedSkills = [];
    const missingSkills = [];
    const skillGaps     = [];
  
    if (jdSkills.length === 0) {
      // No JD: score based on resume skills count
      skillScore = Math.min(35, resumeSkills.length * 4);
      matchedSkills.push(...resumeSkills);
    } else {
      for (const skill of jdSkills) {
        if (resumeSkills.includes(skill)) {
          matchedSkills.push(skill);
        } else {
          missingSkills.push(skill);
          skillGaps.push({
            skill,
            importance: "Required",
            suggestion: `Add ${skill} or related experience to your resume`,
          });
        }
      }
      // Bonus for extra skills on resume beyond JD
      const extraSkills = resumeSkills.filter(s => !jdSkills.includes(s));
      const matchRatio  = jdSkills.length > 0 ? matchedSkills.length / jdSkills.length : 0;
      skillScore = Math.round(matchRatio * 30) + Math.min(5, extraSkills.length);
      skillScore = Math.min(35, skillScore);
    }
  
    // ── 3. SECTION COMPLETENESS (20 pts) ─────────────────────────────────────
    const sectionPoints = {
      hasContact:      3,
      hasObjective:    2,
      hasExperience:   5,
      hasEducation:    4,
      hasSkills:       4,
      hasProjects:     2,
      hasCertifications: 2,
    };
    let sectionScore = 0;
    const missingSections = [];
    for (const [key, pts] of Object.entries(sectionPoints)) {
      if (sections[key]) sectionScore += pts;
      else missingSections.push(key.replace("has", "").replace(/([A-Z])/g, " $1").trim());
    }
    sectionScore = Math.min(20, sectionScore);
  
    // ── 4. QUANTIFICATION & EXPERIENCE (15 pts) ──────────────────────────────
    let experienceScore = 0;
    experienceScore += Math.min(8, achievements * 2);     // up to 8 pts for achievements
    experienceScore += resumeText.length > 1000 ? 4 : 2; // detail bonus
    experienceScore += resumeSkills.length > 5  ? 3 : 1; // skill breadth
    experienceScore = Math.min(15, experienceScore);
  
    // ── TOTAL SCORE ───────────────────────────────────────────────────────────
    const rawScore = keywordScore + skillScore + sectionScore + experienceScore;
    // Calibration: prevent score inflation — max of 95 not 100 unless excellent
    const totalScore = Math.min(95, rawScore);
  
    // ── RECOMMENDATIONS ───────────────────────────────────────────────────────
    const recommendations = [];
    if (missingSkills.length > 0)
      recommendations.push(`Add these key skills: ${missingSkills.slice(0,5).join(", ")}`);
    if (!sections.hasObjective)
      recommendations.push("Add a professional summary/objective at the top");
    if (!sections.hasProjects)
      recommendations.push("Add a Projects section to showcase your work");
    if (!sections.hasCertifications)
      recommendations.push("Add certifications to strengthen credibility");
    if (achievements < 3)
      recommendations.push("Quantify more achievements with numbers and percentages");
    if (missingKeywords.length > 0)
      recommendations.push(`Include these keywords from the job description: ${missingKeywords.slice(0,5).join(", ")}`);
    if (!sections.hasContact)
      recommendations.push("Add contact information (email, phone, LinkedIn)");
  
    // ── STRENGTHS ─────────────────────────────────────────────────────────────
    const strengths = [];
    if (matchedSkills.length > 0)
      strengths.push(`Strong skill match: ${matchedSkills.slice(0,4).join(", ")}`);
    if (sections.hasExperience)
      strengths.push("Work experience section is present");
    if (sections.hasEducation)
      strengths.push("Education section is present");
    if (achievements >= 3)
      strengths.push(`${achievements} quantified achievements found`);
    if (resumeSkills.length > 6)
      strengths.push(`Diverse skill set: ${resumeSkills.length} skills detected`);
  
    // ── SCORE GRADE ───────────────────────────────────────────────────────────
    const grade = totalScore >= 80 ? "Excellent"
      : totalScore >= 65 ? "Good"
      : totalScore >= 50 ? "Average"
      : "Needs Improvement";
  
    return {
      score:          totalScore,
      grade,
      breakdown: {
        keywordMatch:   keywordScore,   // /30
        skillMatch:     skillScore,     // /35
        sectionScore:   sectionScore,   // /20
        experienceScore,                // /15
      },
      matchedKeywords: [...new Set(matchedKeywords)].slice(0, 20),
      missingKeywords: [...new Set(missingKeywords)].slice(0, 15),
      matchedSkills,
      missingSkills,
      skillGaps,
      sections,
      recommendations: recommendations.slice(0, 6),
      strengths:       strengths.slice(0, 4),
      missingSections,
      resumeWordCount: resumeWords.length,
      detectedSkillsCount: resumeSkills.length,
      quantifiedAchievements: achievements,
    };
  }
  
  module.exports = { analyzeResume, extractSkillsFromText };