const Job         = require("../models/Job");
const Resume      = require("../models/Resume");
const Application = require("../models/Application");
const { extractSkillsFromText, detectJobCategory } = require("../ml/atsEngine");

// Match resume skills against all active job postings
exports.matchJobs = async (req, res) => {
  try {
    const { resumeId } = req.query;
    if (!resumeId) return res.status(400).json({ success:false, message:"resumeId required" });

    const resume = await Resume.findOne({ _id:resumeId, user:req.user._id });
    if (!resume) return res.status(404).json({ success:false, message:"Resume not found" });

    if (!resume.extractedText || resume.extractedText.trim().length < 50)
      return res.status(400).json({ success:false, message:"Resume has no extractable text. Please re-upload." });

    // Get all active jobs
    const jobs = await Job.find({ isActive:true });
    if (jobs.length === 0)
      return res.json({ success:true, matches:[], totalJobs:0, resumeSkills:[] });

    // Extract skills from resume once
    const resumeSkills = extractSkills(resume.extractedText).found;

    // Get user's existing applications
    const myApps = await Application.find({ user:req.user._id }).select("job");
    const appliedJobIds = new Set(myApps.map(a => a.job.toString()));

    // Score each job
    const matches = jobs.map(job => {
      const jdText = (job.description || "") + " " + (job.requirements || "") + " " + (job.skills || []).join(" ");

      // Skills required by this job
      const jobSkills   = extractSkillsFromText(jdText);
      const explicitSkills = job.skills || [];

      // All required skills (from taxonomy + explicit)
      const allRequired = [...new Set([...jobSkills, ...explicitSkills.map(s => s.toLowerCase())])];

      // How many resume skills match
      const matched  = allRequired.filter(s => resumeSkills.includes(s));
      const missing  = allRequired.filter(s => !resumeSkills.includes(s));

      // Match percentage
      const matchPct = allRequired.length > 0
        ? Math.round((matched.length / allRequired.length) * 100)
        : 0;

      // Detect job category
      const jobCats = detectJobCategory(job.title, jdText);

      // Category overlap — how well does resume's skill set align with this job family
      const resumeCats = new Set();
      resumeSkills.forEach(skill => {
        const { SKILL_INDEX } = require("../ml/atsEngine");
      });

      // Days until deadline
      const daysLeft = job.deadline
        ? Math.ceil((new Date(job.deadline) - new Date()) / (1000*60*60*24))
        : null;

      return {
        job: {
          _id:        job._id,
          title:      job.title,
          department: job.department,
          location:   job.location,
          type:       job.type,
          salary:     job.salary,
          experience: job.experience,
          skills:     explicitSkills,
          deadline:   job.deadline,
          applicants: job.applicants || 0,
          isActive:   job.isActive,
        },
        matchScore:      matchPct,
        matchedSkills:   matched,
        missingSkills:   missing,
        totalRequired:   allRequired.length,
        alreadyApplied:  appliedJobIds.has(job._id.toString()),
        daysLeft,
        jobCategories:   jobCats,
      };
    });

    // Sort by match score descending
    matches.sort((a, b) => b.matchScore - a.matchScore);

    // Categorize
    const excellent = matches.filter(m => m.matchScore >= 70);
    const good      = matches.filter(m => m.matchScore >= 40 && m.matchScore < 70);
    const low       = matches.filter(m => m.matchScore < 40);

    res.json({
      success: true,
      resumeSkills,
      totalJobs:     jobs.length,
      totalMatched:  excellent.length,
      matches,
      summary: {
        excellent: excellent.length,
        good:      good.length,
        low:       low.length,
      },
    });
  } catch (err) {
    res.status(500).json({ success:false, message:err.message });
  }
};