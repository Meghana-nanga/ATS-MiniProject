require("dotenv").config({ path: require("path").join(__dirname, "../.env") });
const mongoose    = require("mongoose");
const User        = require("../models/User");
const Resume      = require("../models/Resume");
const Analysis    = require("../models/Analysis");
const Job         = require("../models/Job");
const Application = require("../models/Application");

const RESUME_TEXTS = {
  "Frontend Engineer": `Priya Sharma | priya@demo.com | linkedin.com/in/priyasharma | github.com/priyasharma\nSenior Frontend Engineer\n\nSUMMARY\nExperienced frontend engineer with 5 years building scalable React applications.\n\nEXPERIENCE\nSenior Frontend Engineer - TechCorp India (2021-Present)\n- React + TypeScript dashboard serving 200,000 users\n- Reduced load time 40%\n- Mentored 4 junior developers\n\nFrontend Developer - StartupXYZ (2019-2021)\n- React, Redux, REST APIs, GraphQL\n\nSKILLS\nReact, TypeScript, JavaScript, HTML, CSS, Redux, Node.js, REST APIs, GraphQL, Git, Agile, Webpack, Figma\n\nEDUCATION\nB.Tech Computer Science - JNTU Hyderabad, 2019 | CGPA: 8.4`,
  "Backend Engineer":  `Ravi Reddy | ravi@demo.com | github.com/ravireddy\nBackend Software Engineer\n\nSUMMARY\nBackend engineer 4 years Node.js Python microservices.\n\nEXPERIENCE\nBackend Engineer - DataSystems Ltd (2020-Present)\n- RESTful APIs 1M+ requests per day\n- GraphQL reducing API calls 35%\n- Docker Kubernetes AWS\n\nSKILLS\nNode.js, Python, Express, GraphQL, REST APIs, MongoDB, PostgreSQL, Docker, Kubernetes, AWS, Redis, CI/CD, Agile\n\nEDUCATION\nB.E. Information Technology - Anna University, 2019 | 82%`,
  "Data Scientist":    `Neha Patel | neha@demo.com | linkedin.com/in/nehapatel\nData Scientist\n\nSUMMARY\nData scientist 3 years ML NLP predictive analytics.\n\nEXPERIENCE\nData Scientist - Analytics Corp (2021-Present)\n- ML models 92% accuracy churn prediction\n- NLP pipeline 50000 documents daily\n\nSKILLS\nPython, TensorFlow, PyTorch, scikit-learn, pandas, NumPy, machine learning, deep learning, NLP, SQL, AWS, Agile\n\nEDUCATION\nM.Tech Data Science - IIT Hyderabad, 2020 | CGPA: 9.1`,
  "DevOps Engineer":   `Sita Verma | sita@demo.com | github.com/sitaverma\nDevOps Engineer\n\nEXPERIENCE\nSenior DevOps - CloudTech (2021-Present)\n- Kubernetes clusters 500k daily users AWS\n- CI/CD pipelines deployment time 70% faster\n- Terraform infrastructure as code\n\nSKILLS\nAWS, Kubernetes, Docker, Terraform, Jenkins, GitHub Actions, CI/CD, Linux, Bash, Nginx, Ansible, Agile\n\nEDUCATION\nB.E. Computer Science - Pune University, 2019 | 78%`,
  "Product Manager":   `Kiran Das | kiran@demo.com | linkedin.com/in/kirandas\nProduct Manager\n\nEXPERIENCE\nSenior PM - ProductCo (2021-Present)\n- B2B SaaS roadmap $5M ARR\n- User retention 28% increase\n- Cross-functional team 15 members\n\nSKILLS\nProduct roadmap, Agile, Scrum, user research, data analysis, Jira, Confluence, communication, leadership, SQL\n\nEDUCATION\nMBA - IIM Bangalore, 2019`,
};

const FRAUD_RESUME = `CEO Founder World-class Expert Top 1% globally\nSUMMARY\nCertified genius. World-class developer. Best in class. Renowned expert worldwide.\nWorked at Google Microsoft Apple Amazon Facebook simultaneously.\nInvented React Python Kubernetes and Docker.\n\nEXPERIENCE\nCTO Google 2010 to Present\nVP Engineering Microsoft 2010 to Present\nHead of AI Apple 2010 to Present\n\nEDUCATION\nPhD Harvard MIT Stanford Oxford Cambridge`;

const candidates = [
  { name:"Priya Sharma",  email:"priya@demo.com",  targetRole:"Frontend Engineer", lastAtsScore:94, status:"Shortlisted", totalAnalyses:3 },
  { name:"Arjun Kumar",   email:"arjun@demo.com",  targetRole:"Frontend Engineer", lastAtsScore:87, status:"Active",      totalAnalyses:2 },
  { name:"Neha Patel",    email:"neha@demo.com",   targetRole:"Data Scientist",     lastAtsScore:85, status:"Shortlisted", totalAnalyses:4 },
  { name:"Ravi Reddy",    email:"ravi@demo.com",   targetRole:"Backend Engineer",   lastAtsScore:79, status:"Active",      totalAnalyses:1 },
  { name:"Sita Verma",    email:"sita@demo.com",   targetRole:"DevOps Engineer",    lastAtsScore:76, status:"Active",      totalAnalyses:2 },
  { name:"Kiran Das",     email:"kiran@demo.com",  targetRole:"Product Manager",    lastAtsScore:71, status:"Active",      totalAnalyses:1 },
  { name:"Aditi Singh",   email:"aditi@demo.com",  targetRole:"Backend Engineer",   lastAtsScore:65, status:"New",         totalAnalyses:1 },
  { name:"Mohit Jain",    email:"mohit@demo.com",  targetRole:"Data Scientist",     lastAtsScore:58, status:"New",         totalAnalyses:1 },
  { name:"Kavya Rao",     email:"kavya@demo.com",  targetRole:"Frontend Engineer",  lastAtsScore:42, status:"Active",      totalAnalyses:1 },
  { name:"Suresh Nair",   email:"suresh@demo.com", targetRole:"Backend Engineer",   lastAtsScore:28, status:"Flagged",     totalAnalyses:1, isFraudFlagged:true, fraudScore:65, fraudReason:"Duplicate content and inflated titles" },
];

// ATS-only users (just checking scores, never applied)
const atsOnlyUsers = [
  { name:"Raj Mehta",   email:"raj@demo.com",   targetRole:"Full Stack Engineer", lastAtsScore:72, totalAnalyses:5 },
  { name:"Ananya Roy",  email:"ananya@demo.com", targetRole:"UI/UX Designer",     lastAtsScore:81, totalAnalyses:3 },
  { name:"Vikram Shah", email:"vikram@demo.com", targetRole:"Data Scientist",     lastAtsScore:55, totalAnalyses:2 },
];

const sampleJobs = [
  { title:"Senior Frontend Engineer", department:"Engineering", location:"Hyderabad, India", type:"Full-time", description:"Build scalable React applications for our growing platform. Collaborate with designers and mentor junior developers.", requirements:"4+ years React. TypeScript required. REST APIs and GraphQL experience.", skills:["React","TypeScript","JavaScript","GraphQL","REST APIs","CSS","Git","Agile"], experience:"4+ years", salary:"18-28 LPA", deadline:new Date(Date.now()+30*24*60*60*1000) },
  { title:"Backend Engineer", department:"Engineering", location:"Bangalore, India", type:"Full-time", description:"Build high-performance APIs and microservices handling millions of requests.", requirements:"3+ years Node.js or Python. MongoDB/PostgreSQL. Docker preferred.", skills:["Node.js","Python","MongoDB","PostgreSQL","Docker","REST APIs","AWS","Microservices"], experience:"3+ years", salary:"15-24 LPA", deadline:new Date(Date.now()+25*24*60*60*1000) },
  { title:"Data Scientist", department:"AI/ML", location:"Remote", type:"Full-time", description:"Build ML models powering recommendations and fraud detection.", requirements:"Python required. TensorFlow or PyTorch. NLP experience a plus.", skills:["Python","TensorFlow","scikit-learn","pandas","machine learning","NLP","SQL","AWS"], experience:"2+ years", salary:"20-32 LPA", deadline:new Date(Date.now()+20*24*60*60*1000) },
  { title:"DevOps Engineer", department:"Infrastructure", location:"Hyderabad, India", type:"Full-time", description:"Manage and scale cloud infrastructure on AWS.", requirements:"AWS Kubernetes Terraform hands-on. Strong Linux skills.", skills:["AWS","Kubernetes","Docker","Terraform","CI/CD","Linux","Jenkins","Ansible"], experience:"3+ years", salary:"16-26 LPA", deadline:new Date(Date.now()+15*24*60*60*1000) },
  { title:"Product Manager", department:"Product", location:"Bangalore, India", type:"Full-time", description:"Drive product roadmap for B2B SaaS platform. Work with engineering and customers.", requirements:"3+ years PM experience. Agile Scrum. MBA preferred.", skills:["product roadmap","Agile","Scrum","user research","data analysis","Jira","communication","leadership"], experience:"3+ years", salary:"22-35 LPA", deadline:new Date(Date.now()+28*24*60*60*1000) },
];

async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("✅ Connected to MongoDB");

  await Promise.all([
    User.deleteMany({}),
    Resume.deleteMany({}),
    Analysis.deleteMany({}),
    Job.deleteMany({}),
    Application.deleteMany({}),
  ]);
  console.log("🧹 Cleared all data");

  // ── SUPER ADMIN ──
  const superAdmin = await User.create({
    name:"Super Admin", email:"superadmin@hireiq.com",
    password:"SuperAdmin@123", role:"superadmin",
    status:"Active", isActive:true,
  });
  console.log("✅ Super Admin created: superadmin@hireiq.com / SuperAdmin@123");

  // ── HR ADMIN ──
  const hrAdmin = await User.create({
    name:"HR Manager", email:"admin@hireiq.com",
    password:"Admin@123", role:"admin",
    department:"Human Resources", status:"Active", isActive:true,
    createdBy: superAdmin._id,
  });
  console.log("✅ HR Admin created: admin@hireiq.com / Admin@123");

  // ── JOBS ──
  const createdJobs = [];
  for (const j of sampleJobs) {
    const job = await Job.create({ ...j, postedBy:hrAdmin._id });
    createdJobs.push(job);
  }
  console.log(`✅ Created ${createdJobs.length} job postings`);

  // ── ATS-ONLY USERS (never apply, only visible to superadmin) ──
  for (const u of atsOnlyUsers) {
    const user = await User.create({
      ...u, password:"Demo@1234", role:"user",
      status:"Active", isActive:true,
      phone:"+91 98765" + Math.floor(10000+Math.random()*90000),
      location:["Hyderabad","Bangalore","Chennai"][Math.floor(Math.random()*3)] + ", India",
      lastLogin: new Date(Date.now()-Math.random()*5*24*60*60*1000),
    });
    const resumeText = RESUME_TEXTS[u.targetRole] || RESUME_TEXTS["Frontend Engineer"];
    await Resume.create({
      user:user._id, filename:`resume_${user._id}.pdf`,
      originalName:`${u.name.replace(" ","_")}_Resume.pdf`,
      filePath:"text_only", fileSize:200000, mimeType:"application/pdf",
      extractedText:resumeText, atsScore:u.lastAtsScore,
      keywordScore:Math.round(u.lastAtsScore*0.95),
      formattingScore:Math.round(u.lastAtsScore*0.88),
      experienceScore:Math.round(u.lastAtsScore*0.92),
      educationScore:Math.round(u.lastAtsScore*0.94),
      skillsScore:Math.round(u.lastAtsScore*0.85),
      matchedKeywords:[{keyword:"React",found:true,weight:2}],
      missingKeywords:["GraphQL","Docker"],
      foundSkills:["react","typescript","javascript"],
      missingSkills:["graphql","docker"],
      fraudScore:5, isFraudSuspected:false, fraudFlags:[], fraudAnalysis:"LOW RISK",
      jobTitle:u.targetRole, jobDescription:u.targetRole+" role",
      analysisStatus:"complete", analyzedAt:new Date(),
    });
    console.log(`✅ ATS-only user: ${u.name} (no applications)`);
  }

  // ── APPLICANT USERS ──
  for (const c of candidates) {
    const user = await User.create({
      ...c, password:"Demo@1234", role:"user",
      isActive:c.status !== "Banned",
      phone:"+91 98765"+Math.floor(10000+Math.random()*90000),
      location:["Hyderabad","Bangalore","Chennai","Pune","Mumbai"][Math.floor(Math.random()*5)]+", India",
      linkedIn:"linkedin.com/in/"+c.name.toLowerCase().replace(" ",""),
      github:"github.com/"+c.name.toLowerCase().replace(" ",""),
      lastLogin:new Date(Date.now()-Math.random()*7*24*60*60*1000),
    });

    const resumeText = c.isFraudFlagged ? FRAUD_RESUME : (RESUME_TEXTS[c.targetRole]||RESUME_TEXTS["Frontend Engineer"]);

    const resume = await Resume.create({
      user:user._id, filename:`resume_${user._id}.pdf`,
      originalName:`${c.name.replace(" ","_")}_Resume.pdf`,
      filePath:"text_only", fileSize:Math.floor(150000+Math.random()*350000),
      mimeType:"application/pdf", extractedText:resumeText,
      atsScore:c.lastAtsScore,
      keywordScore:Math.round(c.lastAtsScore*0.95),
      formattingScore:Math.round(c.lastAtsScore*0.88),
      experienceScore:Math.round(c.lastAtsScore*0.92),
      educationScore:Math.round(c.lastAtsScore*0.94),
      skillsScore:Math.round(c.lastAtsScore*0.85),
      matchedKeywords:[{keyword:"React",found:true,weight:2},{keyword:"TypeScript",found:true,weight:2}],
      missingKeywords:["GraphQL","Docker"],
      foundSkills:["react","typescript","javascript","node"],
      missingSkills:["graphql","docker"],
      fraudScore:c.fraudScore||5,
      isFraudSuspected:c.isFraudFlagged||false,
      fraudFlags:c.isFraudFlagged?[{type:"inflated_title",description:"Senior title minimal content",severity:"medium"}]:[],
      fraudAnalysis:c.isFraudFlagged?"HIGH RISK: Multiple fraud indicators.":"LOW RISK: Appears authentic.",
      jobTitle:c.targetRole, jobDescription:`${c.targetRole} position`,
      analysisStatus:"complete", analyzedAt:new Date(),
    });

    const matchingJob = createdJobs.find(j=>j.title.toLowerCase().includes(c.targetRole.toLowerCase().split(" ")[0]))||createdJobs[0];
    const appStatus = c.status==="Shortlisted"?"Shortlisted":c.status==="Flagged"?"Rejected":c.status==="New"?"Applied":["Applied","Under Review","Shortlisted"][Math.floor(Math.random()*3)];

    await Application.create({
      user:user._id, job:matchingJob._id, resume:resume._id,
      applicantName:user.name, applicantEmail:user.email,
      applicantPhone:user.phone, applicantLocation:user.location,
      linkedIn:user.linkedIn, github:user.github,
      coverLetter:`Dear Hiring Team,\n\nI am excited to apply for the ${matchingJob.title} position. With my background in ${c.targetRole}, I believe I am a strong fit.\n\nBest regards,\n${user.name}`,
      resumeText, atsScore:c.lastAtsScore,
      keywordScore:Math.round(c.lastAtsScore*0.95),
      formattingScore:Math.round(c.lastAtsScore*0.88),
      experienceScore:Math.round(c.lastAtsScore*0.92),
      educationScore:Math.round(c.lastAtsScore*0.94),
      skillsScore:Math.round(c.lastAtsScore*0.85),
      fraudScore:c.fraudScore||5,
      isFraudSuspected:c.isFraudFlagged||false,
      fraudFlags:c.isFraudFlagged?[{type:"fraud",description:"Multiple fraud indicators",severity:"high"}]:[],
      fraudAnalysis:c.isFraudFlagged?"HIGH RISK":"LOW RISK",
      status:appStatus,
      adminNotes:appStatus==="Shortlisted"?"Strong candidate - schedule interview":"",
    });

    await Job.findByIdAndUpdate(matchingJob._id, { $inc:{ applicants:1 } });
    console.log(`✅ ${c.name} — ATS:${c.lastAtsScore} — Applied: ${matchingJob.title} — App status: ${appStatus}`);
  }

  console.log("\n🎉 Seed complete!");
  console.log(`   Total Users:        ${await User.countDocuments()}`);
  console.log(`   Regular Users:      ${await User.countDocuments({role:"user"})}`);
  console.log(`   ATS-only (no apps): ${atsOnlyUsers.length}`);
  console.log(`   Applicants:         ${candidates.length}`);
  console.log(`   Resumes:            ${await Resume.countDocuments()}`);
  console.log(`   Jobs:               ${await Job.countDocuments()}`);
  console.log(`   Applications:       ${await Application.countDocuments()}`);
  console.log("\n📋 Login Credentials:");
  console.log("   🔴 Super Admin: superadmin@hireiq.com  / SuperAdmin@123");
  console.log("   🟡 HR Admin:    admin@hireiq.com       / Admin@123");
  console.log("   🟢 User:        arjun@demo.com         / Demo@1234");

  await mongoose.disconnect();
  process.exit(0);
}

seed().catch(err=>{ console.error("❌", err.message); process.exit(1); });