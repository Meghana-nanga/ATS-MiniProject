const Job         = require("../models/Job");
const Application = require("../models/Application");
const Resume      = require("../models/Resume");
const { analyzeResume } = require("../ml/atsEngine");

// ── PUBLIC: Get all active jobs ──
exports.getJobs = async (req, res) => {
  try {
    const { search, type, location } = req.query;
    const filter = { isActive: true };
    if (search)   filter.$or = [{ title: new RegExp(search,"i") }, { description: new RegExp(search,"i") }];
    if (type)     filter.type = type;
    if (location) filter.location = new RegExp(location,"i");
    const jobs = await Job.find(filter).sort("-createdAt");
    res.json({ success: true, jobs });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

// ── PUBLIC: Get single job ──
exports.getJob = async (req, res) => {
  try {
    const job = await Job.findById(req.params.id);
    if (!job) return res.status(404).json({ success: false, message: "Job not found" });
    res.json({ success: true, job });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

// ── USER: Apply for a job ──
exports.applyJob = async (req, res) => {
  try {
    const { jobId, resumeId, coverLetter, phone, location, linkedIn, github } = req.body;

    const job = await Job.findById(jobId);
    if (!job || !job.isActive) return res.status(404).json({ success: false, message: "Job not found or closed" });

    // Check duplicate application
    const exists = await Application.findOne({ user: req.user._id, job: jobId });
    if (exists) return res.status(400).json({ success: false, message: "You have already applied for this job" });

    // Get resume data if provided
    let resumeData = {};
    if (resumeId) {
      const resume = await Resume.findOne({ _id: resumeId, user: req.user._id });
      if (resume) {
        // Run fresh ATS analysis against this specific job
        const result = await analyzeResume(resume.extractedText, job.description + " " + job.requirements, job.title);
        resumeData = {
          resume:          resume._id,
          resumeText:      resume.extractedText,
          atsScore:        result.atsScore,
          keywordScore:    result.breakdown.keywordScore,
          formattingScore: result.breakdown.formattingScore,
          experienceScore: result.breakdown.experienceScore,
          educationScore:  result.breakdown.educationScore,
          skillsScore:     result.breakdown.skillsScore,
          matchedKeywords: result.matchedKeywords,
          missingKeywords: result.missingKeywords,
          foundSkills:     result.foundSkills,
          missingSkills:   result.missingSkills,
          fraudScore:      result.fraud.fraudScore,
          isFraudSuspected:result.fraud.isFraudSuspected,
          fraudFlags:      result.fraud.flags,
          fraudAnalysis:   result.fraud.analysis,
        };
      }
    }

    const application = await Application.create({
      user:             req.user._id,
      job:              jobId,
      applicantName:    req.user.name,
      applicantEmail:   req.user.email,
      applicantPhone:   phone || req.user.phone || "",
      applicantLocation:location || req.user.location || "",
      linkedIn:         linkedIn || req.user.linkedIn || "",
      github:           github || req.user.github || "",
      coverLetter:      coverLetter || "",
      ...resumeData,
    });

    // Increment applicant count on job
    await Job.findByIdAndUpdate(jobId, { $inc: { applicants: 1 } });

    res.status(201).json({ success: true, application, message: "Application submitted successfully!" });
  } catch (err) {
    if (err.code === 11000) return res.status(400).json({ success: false, message: "You have already applied for this job" });
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── USER: Get my applications ──
exports.getMyApplications = async (req, res) => {
  try {
    const applications = await Application.find({ user: req.user._id })
      .populate("job", "title department location type")
      .sort("-createdAt");
    res.json({ success: true, applications });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

// ── ADMIN: Get all applications (with filters) ──
exports.getAllApplications = async (req, res) => {
  try {
    const { jobId, status, minScore, maxScore, search, page=1, limit=20 } = req.query;
    const filter = {};
    if (jobId)  filter.job    = jobId;
    if (status && status !== "all") filter.status = status;
    if (minScore || maxScore) {
      filter.atsScore = {};
      if (minScore) filter.atsScore.$gte = Number(minScore);
      if (maxScore) filter.atsScore.$lte = Number(maxScore);
    }
    if (search) filter.$or = [
      { applicantName:  new RegExp(search,"i") },
      { applicantEmail: new RegExp(search,"i") },
    ];

    const total = await Application.countDocuments(filter);
    const apps  = await Application.find(filter)
      .populate("job", "title department location")
      .sort("-atsScore")
      .skip((page-1)*limit)
      .limit(Number(limit));

    res.json({ success: true, applications: apps, total, page: Number(page), pages: Math.ceil(total/limit) });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

// ── ADMIN: Update application status ──
exports.updateApplicationStatus = async (req, res) => {
  try {
    const { status, adminNotes, interviewDate, rejectionReason } = req.body;
    const app = await Application.findByIdAndUpdate(req.params.id, {
      status,
      ...(adminNotes      ? { adminNotes }      : {}),
      ...(interviewDate   ? { interviewDate }   : {}),
      ...(rejectionReason ? { rejectionReason } : {}),
      reviewedBy: req.user._id,
      reviewedAt: new Date(),
    }, { new: true }).populate("job","title");
    if (!app) return res.status(404).json({ success: false, message: "Application not found" });
    res.json({ success: true, application: app });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

// ── ADMIN: CRUD for job postings ──
exports.createJob = async (req, res) => {
  try {
    const job = await Job.create({ ...req.body, postedBy: req.user._id });
    res.status(201).json({ success: true, job });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

exports.updateJob = async (req, res) => {
  try {
    const job = await Job.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!job) return res.status(404).json({ success: false, message: "Job not found" });
    res.json({ success: true, job });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

exports.deleteJob = async (req, res) => {
  try {
    await Job.findByIdAndUpdate(req.params.id, { isActive: false });
    res.json({ success: true, message: "Job closed" });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

exports.getAdminJobs = async (req, res) => {
  try {
    const jobs = await Job.find({}).sort("-createdAt").populate("postedBy","name");
    const jobsWithCounts = await Promise.all(jobs.map(async j => {
      const count = await Application.countDocuments({ job: j._id });
      return { ...j.toObject(), applicationCount: count };
    }));
    res.json({ success: true, jobs: jobsWithCounts });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};