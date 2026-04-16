const Resume   = require("../models/Resume");
const User     = require("../models/User");
const Analysis = require("../models/Analysis");
const { extractText }         = require("../services/extractText");
const { analyzeResume }       = require("../ml/atsEngine");
const { generateCoverLetter } = require("../services/coverLetterService");
const fs   = require("fs");
const path = require("path");

function deleteFile(filePath) {
  try {
    if (filePath && fs.existsSync(filePath)) fs.unlinkSync(filePath);
  } catch (err) { console.warn("Could not delete file:", err.message); }
}

exports.uploadResume = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: "No file uploaded" });
    const text = await extractText(req.file.path);
    deleteFile(req.file.path);
    const resume = await Resume.create({
      user:          req.user._id,
      filename:      req.file.filename,
      originalName:  req.file.originalname,
      filePath:      "text_only",
      fileSize:      req.file.size,
      mimeType:      req.file.mimetype,
      extractedText: text,
      analysisStatus:"pending",
    });
    res.status(201).json({ success: true, resume });
  } catch (err) {
    if (req.file) deleteFile(req.file.path);
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.analyzeResume = async (req, res) => {
  try {
    const { resumeId, jobDescription, jobTitle, geminiResult, fraudOverride } = req.body;

    if (!resumeId) return res.status(400).json({ success: false, message: "resumeId required" });

    const resume = await Resume.findOne({ _id: resumeId, user: req.user._id });
    if (!resume) return res.status(404).json({ success: false, message: "Resume not found" });

    // ── Handle fraud escalation from client-side detection ────────────────
    if (fraudOverride && fraudOverride.isFraudSuspected) {
      const Alert = require("../models/Alert");
      const user  = await User.findById(req.user._id);

      await User.findByIdAndUpdate(req.user._id, {
        isFraudFlagged:   true,
        isFraudSuspected: true,
        status:           "Flagged",
        fraudScore:       fraudOverride.fraudScore,
        fraudAnalysis:    fraudOverride.analysis || "",
        fraudFlags:       fraudOverride.flags    || [],
        fraudReason:      fraudOverride.summary  || fraudOverride.analysis || "",
      });

      await Alert.create({
        type:       "fraud_flag",
        title:      `🚨 Fraud Detected — ${user?.name || "Unknown"}`,
        message:    `Resume flagged with fraud score ${fraudOverride.fraudScore}/100. ${fraudOverride.analysis || ""}`,
        severity:   fraudOverride.fraudScore >= 60 ? "high" : "medium",
        targetUser: req.user._id,
        createdBy:  req.user._id,
      });

      console.log("🚨 Fraud escalated for:", user?.name, "Score:", fraudOverride.fraudScore);
      return res.json({ success: true, fraudEscalated: true });
    }

    // ── Standard ATS analysis ─────────────────────────────────────────────
    if (!geminiResult) {
      const result = await analyzeResume(resume.extractedText, jobDescription, jobTitle);

      await Resume.findByIdAndUpdate(resumeId, {
        atsScore:        result.atsScore,
        keywordScore:    result.breakdown?.keywordScore    || 0,
        formattingScore: result.breakdown?.formattingScore || 0,
        experienceScore: result.breakdown?.experienceScore || 0,
        educationScore:  result.breakdown?.educationScore  || 0,
        skillsScore:     result.breakdown?.skillsScore     || 0,
        matchedKeywords: result.matchedKeywords || [],
        missingKeywords: result.missingKeywords || [],
        foundSkills:     result.foundSkills     || [],
        missingSkills:   result.missingSkills   || [],
        fraudScore:      result.fraud?.fraudScore       || 0,
        isFraudSuspected:result.fraud?.isFraudSuspected || false,
        fraudAnalysis:   result.fraud?.analysis         || "",
        jobDescription, jobTitle,
        analysisStatus: "complete",
        analyzedAt: new Date(),
      });

      await User.findByIdAndUpdate(req.user._id, {
        lastAtsScore: result.atsScore,
        $inc: { totalAnalyses: 1 },
      });

      await Analysis.create({
        user: req.user._id, resume: resume._id,
        type: "ats", result: { ats: result },
        score: result.atsScore, jobTitle, jobDescription,
      });

      return res.json({ success: true, result, resume });
    }

    // ── Gemini path ───────────────────────────────────────────────────────
    const atsScore = geminiResult.atsScore || 0;

    await Resume.findByIdAndUpdate(resumeId, {
      atsScore,
      keywordScore:     geminiResult.breakdown?.keywordScore    || 0,
      formattingScore:  geminiResult.breakdown?.formattingScore || 0,
      experienceScore:  geminiResult.breakdown?.experienceScore || 0,
      educationScore:   geminiResult.breakdown?.educationScore  || 0,
      skillsScore:      geminiResult.breakdown?.skillsScore     || 0,
      matchedKeywords:  geminiResult.matchedKeywords || [],
      missingKeywords:  geminiResult.missingKeywords || [],
      foundSkills:      geminiResult.foundSkills     || [],
      missingSkills:    geminiResult.missingSkills   || [],
      fraudScore:       geminiResult.fraud?.fraudScore       || 0,
      isFraudSuspected: geminiResult.fraud?.isFraudSuspected || false,
      fraudAnalysis:    geminiResult.fraud?.analysis         || "",
      jobDescription, jobTitle,
      analysisStatus: "complete",
      analyzedAt: new Date(),
    });

    await User.findByIdAndUpdate(req.user._id, {
      lastAtsScore: atsScore,
      $inc: { totalAnalyses: 1 },
    });

    await Analysis.create({
      user:   req.user._id,
      resume: resume._id,
      type:   "ats",
      result: { ats: geminiResult },
      score:  atsScore,
      jobTitle, jobDescription,
    });

    res.json({ success: true, result: geminiResult, resume });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getMyResumes = async (req, res) => {
  try {
    const resumes = await Resume.find({ user: req.user._id, isActive: true })
      .sort("-createdAt")
      .select("-extractedText");
    res.json({ success: true, resumes });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getResumeText = async (req, res) => {
  try {
    const resume = await Resume.findOne({ _id: req.params.id, user: req.user._id })
      .select("extractedText originalName");
    if (!resume) return res.status(404).json({ success: false, message: "Not found" });
    res.json({ success: true, extractedText: resume.extractedText, originalName: resume.originalName });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.deleteResume = async (req, res) => {
  try {
    const resume = await Resume.findOne({ _id: req.params.id, user: req.user._id });
    if (!resume) return res.status(404).json({ success: false, message: "Not found" });
    await Resume.findByIdAndUpdate(req.params.id, { isActive: false });
    res.json({ success: true, message: "Resume removed" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.generateCoverLetter = async (req, res) => {
  try {
    const { name, company, role, tone, skills, achievements, jobDescription } = req.body;
    if (!company || !role) return res.status(400).json({ success: false, message: "Company and role are required" });
    const letter = await generateCoverLetter({ name: name || req.user.name, company, role, tone, skills, achievements, jobDescription });
    const resumeId = req.body.resumeId;
    if (resumeId) await Resume.findOneAndUpdate({ _id: resumeId, user: req.user._id }, { coverLetter: letter });
    res.json({ success: true, coverLetter: letter });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.analyzeVideo = async (req, res) => {
  try {
    const { analyzeVideo } = require("../services/videoAnalysisService");
    if (!req.file) return res.status(400).json({ success: false, message: "No video file" });
    const resumeId = req.body.resumeId;
    let resumeText = "";
    if (resumeId) {
      const resume = await Resume.findOne({ _id: resumeId, user: req.user._id }).select("extractedText");
      if (resume) resumeText = resume.extractedText || "";
    }
    const result = await analyzeVideo(req.file.path, resumeText, req.body.jobDescription || "");
    deleteFile(req.file.path);
    res.json({ success: true, result });
  } catch (err) {
    if (req.file) deleteFile(req.file.path);
    res.status(500).json({ success: false, message: err.message });
  }
};