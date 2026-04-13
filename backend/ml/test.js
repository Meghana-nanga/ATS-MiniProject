require("dotenv").config({ path: require("path").join(__dirname, "../.env") });
const { analyzeResume, detectJobCategory } = require("./atsEngine");

async function test() {
  const fullStackResume = `
    John Doe | john@email.com | github.com/johndoe
    Full Stack Developer

    EXPERIENCE
    Full Stack Developer - TechCorp (2021-Present)
    - Built React + Node.js applications serving 50,000 users
    - Developed REST APIs using Express and MongoDB
    - Implemented CI/CD using GitHub Actions
    - Used HTML, CSS, JavaScript, TypeScript daily

    SKILLS
    React, TypeScript, JavaScript, HTML, CSS, Node.js, Express,
    MongoDB, PostgreSQL, REST APIs, Git, Agile, SQL

    EDUCATION
    B.Tech Computer Science - JNTU 2019 | CGPA 8.2

    PROJECTS
    E-commerce platform using MERN stack serving 10,000 users
    Reduced page load time by 40% through optimization
  `;

  const devopsJD = `
    DevOps Engineer
    We need a DevOps Engineer with experience in:
    - Docker and Kubernetes (K8s) container orchestration
    - AWS cloud services (EC2, ECS, Lambda, S3)
    - Terraform for infrastructure as code
    - Jenkins or GitHub Actions for CI/CD pipelines
    - Linux system administration and Bash scripting
    - Prometheus and Grafana for monitoring
    - Nginx load balancing and networking
    Requirements: 3+ years DevOps experience, strong Linux skills
  `;

  const frontendJD = `
    Senior Frontend Engineer
    We are looking for a Senior Frontend Engineer with:
    - React and TypeScript expertise (4+ years)
    - Strong CSS/HTML/JavaScript fundamentals
    - Experience with Redux or Zustand state management
    - REST APIs and GraphQL integration
    - Testing with Jest and Cypress
    - Agile/Scrum experience
  `;

  console.log("=".repeat(60));
  console.log("TEST 1: Full Stack Resume vs DevOps JD");
  console.log("Expected: LOW score (40-55 range)");
  console.log("=".repeat(60));
  const result1 = await analyzeResume(fullStackResume, devopsJD, "DevOps Engineer");
  console.log("Detected job categories:", result1.jobCategories);
  console.log("ATS Score:", result1.atsScore, "(should be 30-55)");
  console.log("Keyword Score:", result1.breakdown.keywordScore);
  console.log("Skills Score:", result1.breakdown.skillsScore);
  console.log("Matched Skills:", result1.matchedSkills);
  console.log("Missing Skills:", result1.missingSkills.slice(0,5));
  console.log("Recommendations:", result1.recommendations);

  console.log("\n" + "=".repeat(60));
  console.log("TEST 2: Full Stack Resume vs Frontend JD");
  console.log("Expected: HIGH score (75-90 range)");
  console.log("=".repeat(60));
  const result2 = await analyzeResume(fullStackResume, frontendJD, "Senior Frontend Engineer");
  console.log("Detected job categories:", result2.jobCategories);
  console.log("ATS Score:", result2.atsScore, "(should be 70-90)");
  console.log("Keyword Score:", result2.breakdown.keywordScore);
  console.log("Skills Score:", result2.breakdown.skillsScore);
  console.log("Matched Skills:", result2.matchedSkills);
  console.log("Missing Skills:", result2.missingSkills);

  console.log("\n✅ Test complete. Scores make sense:", 
    result1.atsScore < result2.atsScore ? "YES ✅" : "NO ❌ — needs tuning"
  );
}

test().catch(console.error);