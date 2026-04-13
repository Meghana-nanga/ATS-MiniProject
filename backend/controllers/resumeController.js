const Resume   = require("../models/Resume");
const User     = require("../models/User");
const Analysis = require("../models/Analysis");
const { extractText }         = require("../services/extractText");
const { analyzeResume }       = require("../ml/atsEngine");
const { generateCoverLetter } = require("../services/coverLetterService");
const fs   = require("fs");
const path = require("path");

// Delete file from disk safely
function deleteFile(filePath) {
  try {
    if (filePath && fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log("🗑️  Deleted file:", path.basename(filePath));
    }
  } catch (err) {
    console.warn("Could not delete file:", err.message);
  }
}

exports.uploadResume = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: "No file uploaded" });

    // Extract text from file
    const text = await extractText(req.file.path);

    // Delete file from disk immediately after extraction — save space
    deleteFile(req.file.path);

    // Store only the text in MongoDB, not the file
    const resume = await Resume.create({
      user:          req.user._id,
      filename:      req.file.filename,
      originalName:  req.file.originalname,
      filePath:      "text_only",          // no longer stored on disk
      fileSize:      req.file.size,
      mimeType:      req.file.mimetype,
      extractedText: text,
      analysisStatus:"pending",
    });

    res.status(201).json({ success: true, resume });
  } catch (err) {
    // Clean up file if something went wrong
    if (req.file) deleteFile(req.file.path);
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.analyzeResume = async (req, res) => {
  try {
    const { resumeId, jobDescription, jobTitle } = req.body;
    if (!resumeId) return res.status(400).json({ success: false, message: "resumeId required" });

    const resume = await Resume.findOne({ _id: resumeId, user: req.user._id });
    if (!resume) return res.status(404).json({ success: false, message: "Resume not found" });

    resume.analysisStatus = "analyzing";
    await resume.save();

    const t0     = Date.now();
    const result = await analyzeResume(resume.extractedText, jobDescription, jobTitle);

    Object.assign(resume, {
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
      jobDescription,
      jobTitle,
      analysisStatus:  "complete",
      analyzedAt:      new Date(),
    });
    await resume.save();

    const fraudUpdate = result.fraud.isFraudSuspected
      ? { status: "Flagged", isFraudFlagged: true, fraudReason: result.fraud.analysis }
      : {};

    await User.findByIdAndUpdate(req.user._id, {
      lastAtsScore:    result.atsScore,
      fraudScore:      result.fraud.fraudScore,
      isFraudFlagged:  result.fraud.isFraudSuspected,
      $inc:            { totalAnalyses: 1 },
      ...fraudUpdate,
    });

    await Analysis.create({
      user:           req.user._id,
      resume:         resume._id,
      type:           "ats",
      result,
      score:          result.atsScore,
      jobTitle,
      jobDescription,
      duration:       Date.now() - t0,
    });

    res.json({ success: true, result, resume });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getMyResumes = async (req, res) => {
  try {
    const resumes = await Resume.find({ user: req.user._id })
      .sort("-createdAt")
      .select("-extractedText"); // don't send full text to frontend
    res.json({ success: true, resumes });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.generateCoverLetter = async (req, res) => {
  try {
    const { name, company, role, tone, skills, achievements, resumeId } = req.body;
    const letter = generateCoverLetter({ name, company, role, tone, skills, achievements });
    if (resumeId) await Resume.findOneAndUpdate({ _id: resumeId, user: req.user._id }, { coverLetter: letter });
    await Analysis.create({ user: req.user._id, type: "cover_letter", result: { letter } });
    res.json({ success: true, coverLetter: letter });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.deleteResume = async (req, res) => {
  try {
    const resume = await Resume.findOne({ _id: req.params.id, user: req.user._id });
    if (!resume) return res.status(404).json({ success: false, message: "Not found" });
    // File already deleted after upload, just remove DB record
    await resume.deleteOne();
    res.json({ success: true, message: "Resume deleted" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};