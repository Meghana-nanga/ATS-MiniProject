/**
 * userController.js
 * KEY ROUTES:
 *  POST /api/user/apply       — marks appliedToHR=true, user appears in HR dashboard
 *  POST /api/user/ats         — run ATS analysis on resume text
 *  POST /api/user/video       — run video analysis on transcript
 *  GET  /api/user/profile     — get own profile
 *  PUT  /api/user/profile     — update own profile
 */
const User    = require("../models/User");
const Resume  = require("../models/Resume");
const { analyzeResume }  = require("../ml/atsEngine");       // same engine as resumeController
const { analyzeVideo }   = require("../services/videoAnalysisService");

// ── GET PROFILE ───────────────────────────────────────────────────────────────
exports.getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).lean();
    if (!user) return res.status(404).json({ success: false, message: "Not found" });
    const { password, ...safe } = user;
    res.json({ success: true, user: safe });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── UPDATE PROFILE ────────────────────────────────────────────────────────────
exports.updateProfile = async (req, res) => {
  try {
    const allowed = ["name","phone","location","targetRole"];
    const updates = {};
    for (const k of allowed) if (req.body[k] !== undefined) updates[k] = req.body[k];
    const user = await User.findByIdAndUpdate(req.user._id, updates, { new: true }).lean();
    const { password, ...safe } = user;
    res.json({ success: true, user: safe });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── APPLY TO HR (KEY FIX) ─────────────────────────────────────────────────────
// Call this when user submits their application from the User Dashboard.
// Only after this will the user appear in the HR/Admin dashboard.
exports.applyToHR = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ success: false, message: "Not found" });

    if (user.appliedToHR) {
      return res.json({ success: true, message: "Already applied", alreadyApplied: true });
    }

    await User.findByIdAndUpdate(req.user._id, {
      appliedToHR: true,
      appliedAt:   new Date(),
      status:      user.status === "New" ? "Active" : user.status,
    });

    res.json({ success: true, message: "Application submitted to HR successfully" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── RUN ATS ANALYSIS ──────────────────────────────────────────────────────────
exports.runAtsAnalysis = async (req, res) => {
  try {
    const { resumeText, jobDescription, jobTitle } = req.body;
    if (!resumeText || resumeText.trim().length < 50) {
      return res.status(400).json({ success: false, message: "Resume text is too short. Paste the full resume text." });
    }

    const result = await analyzeResume(resumeText, jobDescription || "", jobTitle || "");

    if (!result || result.atsScore === undefined) {
      return res.status(400).json({ success: false, message: "Analysis failed. Please try again." });
    }

    // Save score to user profile — same field admin sees
    await User.findByIdAndUpdate(req.user._id, {
      lastAtsScore:  result.atsScore,
      $inc: { totalAnalyses: 1 },
      ...(result.fraud?.isFraudSuspected ? { isFraudFlagged: true } : {}),
    });

    res.json({ success: true, analysis: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── GET MY APPLICATION STATUS ─────────────────────────────────────────────────
exports.getApplicationStatus = async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .select("name email status appliedToHR appliedAt interviewDate notes targetRole lastAtsScore")
      .lean();
    if (!user) return res.status(404).json({ success: false, message: "Not found" });
    res.json({
      success: true,
      application: {
        appliedToHR:   user.appliedToHR || false,
        appliedAt:     user.appliedAt   || null,
        status:        user.status      || "New",
        interviewDate: user.interviewDate || null,
        notes:         user.notes      || "",
        targetRole:    user.targetRole  || "",
        atsScore:      user.lastAtsScore || 0,
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── RUN VIDEO ANALYSIS ────────────────────────────────────────────────────────
exports.runVideoAnalysis = async (req, res) => {
  try {
    const { transcript, videoMetrics } = req.body;
    if (!transcript || transcript.trim().length < 20) {
      return res.status(400).json({ success: false, message: "Transcript is too short. Please provide the video transcript." });
    }

    const result = analyzeVideo({ transcript, videoMetrics: videoMetrics || {} });

    res.json({ success: true, analysis: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};