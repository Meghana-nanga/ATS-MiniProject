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
    const { resumeId, jobDescription, jobTitle, geminiResult } = req.body;

    if (!resumeId) return res.status(400).json({ success: false, message: "resumeId required" });

    const resume = await Resume.findOne({ _id: resumeId, user: req.user._id });
    if (!resume) return res.status(404).json({ success: false, message: "Resume not found" });

    // Run atsEngine analysis (strict scoring, no external AI needed)
    if (!geminiResult) {
      const { analyzeResume: runAts } = require("../ml/atsEngine");
      const result = await runAts(resume.extractedText, jobDescription, jobTitle);
      
      // Save to DB
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
        ...(result.fraud?.isFraudSuspected ? { isFraudFlagged: true, status: "Flagged" } : {}),
      });

      await Analysis.create({
        user: req.user._id, resume: resume._id,
        type: "ats", result: { ats: result },
        score: result.atsScore, jobTitle, jobDescription,
      });

      return res.json({ success: true, result, resume });
    }

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
      jobDescription,
      jobTitle,
      analysisStatus: "complete",
      analyzedAt: new Date(),
    });

    await User.findByIdAndUpdate(req.user._id, {
      lastAtsScore: atsScore,
      $inc: { totalAnalyses: 1 },
      ...(geminiResult.fraud?.isFraudSuspected ? { isFraudFlagged: true, status: "Flagged" } : {}),
    });

    await Analysis.create({
      user:   req.user._id,
      resume: resume._id,
      type:   "ats",
      result: { ats: geminiResult },
      score:  atsScore,
      jobTitle,
      jobDescription,
    });

    res.json({ success: true, result: geminiResult, resume });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
};


exports.analyzeVideoResume = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: "No video uploaded" });
    const { jobDescription, resumeId } = req.body;
    const { analyzeVideo } = require("../services/videoAnalysisService");

    // Get resume text if resumeId provided
    let resumeText = "";
    if (resumeId) {
      const resume = await Resume.findOne({ _id: resumeId, user: req.user._id }).select("extractedText");
      if (resume) resumeText = resume.extractedText || "";
    }

    const result = await analyzeVideo(req.file.path, resumeText, jobDescription || "");

    // Cleanup uploaded video
    const fs = require("fs");
    if (req.file.path && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);

    // Update user video score
    await User.findByIdAndUpdate(req.user._id, {
      videoScore: result.overallScore || result.score || 0,
    });

    res.json({ success: true, result });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getResumeText = async (req, res) => {
  try {
    const resume = await Resume.findOne({ _id: req.params.id, user: req.user._id })
      .select("extractedText originalName");
    if (!resume) return res.status(404).json({ success: false, message: "Resume not found" });
    res.json({ success: true, extractedText: resume.extractedText, originalName: resume.originalName });
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