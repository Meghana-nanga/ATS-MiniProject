const User   = require("../models/User");
const Resume = require("../models/Resume");
const { sendShortlistEmail } = require("../services/emailService");

// ─── GET ALL CANDIDATES ────────────────────────────────────────────────────────
// KEY FIX: HR admins only see users who have appliedToHR=true
// Super admins see ALL users
exports.getAllCandidates = async (req, res) => {
  try {
    const {
      status, minScore, maxScore, search,
      page = 1, limit = 50, sort = "-lastAtsScore"
    } = req.query;

    const filter = { role: "user" };

    // HR admin: only see candidates who applied
    // Super admin: see all
    if (req.user?.role === "admin") {
      filter.appliedToHR = true;
    }

    if (status && status !== "all") {
      if (status === "Flagged") filter.isFraudFlagged = true;
      else filter.status = status;
    }
    if (minScore || maxScore) {
      filter.lastAtsScore = {};
      if (minScore) filter.lastAtsScore.$gte = Number(minScore);
      if (maxScore) filter.lastAtsScore.$lte = Number(maxScore);
    }
    if (search) {
      filter.$or = [
        { name:  new RegExp(search, "i") },
        { email: new RegExp(search, "i") },
      ];
    }

    const total = await User.countDocuments(filter);
    const users = await User.find(filter)
      .sort(sort)
      .skip((page - 1) * Number(limit))
      .limit(Number(limit))
      .lean();

    res.json({ success: true, users, total });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── GET SINGLE CANDIDATE ─────────────────────────────────────────────────────
exports.getCandidate = async (req, res) => {
  try {
    const user    = await User.findById(req.params.id).lean();
    if (!user) return res.status(404).json({ success: false, message: "Not found" });
    const resumes = await Resume.find({ user: req.params.id }).sort("-createdAt").lean();
    res.json({ success: true, user, resumes });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── UPDATE STATUS (auto-sends shortlist email) ───────────────────────────────
exports.updateCandidateStatus = async (req, res) => {
  try {
    const { status, notes, interviewDate } = req.body;
    const prevUser = await User.findById(req.params.id);
    if (!prevUser) return res.status(404).json({ success: false, message: "Not found" });

    const updateFields = { status };
    if (notes         !== undefined) updateFields.notes         = notes;
    if (interviewDate !== undefined) updateFields.interviewDate = interviewDate;

    const user = await User.findByIdAndUpdate(req.params.id, updateFields, { new: true });

    let emailResult = null;
    // Only send if transitioning TO Shortlisted for the first time
    if (status === "Shortlisted" && prevUser.status !== "Shortlisted") {
      const interviewDetails = interviewDate
        ? new Date(interviewDate).toLocaleString("en-IN", { dateStyle: "full", timeStyle: "short" })
        : null;

      emailResult = await sendShortlistEmail({
        candidateName:  user.name,
        candidateEmail: user.email,
        jobTitle:       user.targetRole || "Open Position",
        hrName:         req.user?.name  || "HR Team",
        companyName:    process.env.COMPANY_NAME || "HireIQ",
        interviewDetails,
        notes: notes || null,
      });

      console.log("📧 Shortlist email result:", emailResult);
    }

    res.json({
      success:      true,
      user:         user.toObject(),
      emailSent:    emailResult?.success    || false,
      emailPreview: emailResult?.previewUrl || null,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── FLAG FOR SUPER ADMIN ─────────────────────────────────────────────────────
exports.flagForSuperAdmin = async (req, res) => {
  try {
    const { reason } = req.body;
    if (!reason || reason.trim() === "") {
      return res.status(400).json({ success: false, message: "A reason is required to flag a candidate" });
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      {
        isFraudFlagged: true,
        status:         "Flagged",
        fraudReason:    reason.trim(),
        fraudFlaggedBy: req.user?._id  || null,
        fraudFlaggedAt: new Date(),
      },
      { new: true }
    );

    if (!user) return res.status(404).json({ success: false, message: "Candidate not found" });

    res.json({
      success: true,
      message: "Candidate flagged for Super Admin review",
      user:    user.toObject(),
    });
  } catch (err) {
    console.error("flagForSuperAdmin error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── BAN + REMOVE ─────────────────────────────────────────────────────────────
exports.flagAndRemove = async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      {
        isActive:       false,
        status:         "Banned",
        isFraudFlagged: true,
        fraudReason:    req.body.reason || "Fraud — removed by admin",
        fraudFlaggedAt: new Date(),
      },
      { new: true }
    );
    if (!user) return res.status(404).json({ success: false, message: "Not found" });
    res.json({ success: true, message: "Candidate banned" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── RESTORE (Super Admin clears fraud flag) ──────────────────────────────────
exports.restoreCandidate = async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      {
        isActive:       true,
        status:         "Active",
        isFraudFlagged: false,
        fraudReason:    null,
        fraudFlaggedBy: null,
        fraudFlaggedAt: null,
      },
      { new: true }
    );
    if (!user) return res.status(404).json({ success: false, message: "Not found" });
    res.json({ success: true, user: user.toObject() });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── REMOVE CANDIDATE ────────────────────────────────────────────────────────
exports.removeCandidate = async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { isActive: false, status: "Banned", notes: req.body.reason || "Removed by admin" },
      { new: true }
    );
    if (!user) return res.status(404).json({ success: false, message: "Not found" });
    res.json({ success: true, message: "Candidate removed" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── ADD CANDIDATE MANUALLY ───────────────────────────────────────────────────
exports.addCandidate = async (req, res) => {
  try {
    const { name, email, targetRole, notes } = req.body;
    if (!name || !email)
      return res.status(400).json({ success: false, message: "Name and email required" });
    if (await User.findOne({ email }))
      return res.status(400).json({ success: false, message: "Email already exists" });
    const user = await User.create({
      name, email, password: "TempPass@123", targetRole, notes,
      status: "New", appliedToHR: true,
    });
    res.status(201).json({ success: true, user: user.toObject() });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── ANALYTICS ───────────────────────────────────────────────────────────────
exports.getAnalytics = async (req, res) => {
  try {
    // HR sees stats only for applied candidates; Super Admin sees all
    const baseFilter = req.user?.role === "admin"
      ? { role: "user", appliedToHR: true }
      : { role: "user" };

    const [total, active, flagged, shortlisted, avgArr, scoreRanges, monthly, fraudCandidates] =
      await Promise.all([
        User.countDocuments(baseFilter),
        User.countDocuments({ ...baseFilter, isActive: true }),
        User.countDocuments({ ...baseFilter, isFraudFlagged: true }),
        User.countDocuments({ ...baseFilter, status: "Shortlisted" }),
        User.aggregate([
          { $match: { ...baseFilter, lastAtsScore: { $gt: 0 } } },
          { $group: { _id: null, avg: { $avg: "$lastAtsScore" } } }
        ]),
        User.aggregate([
          { $match: baseFilter },
          { $bucket: {
              groupBy: "$lastAtsScore",
              boundaries: [0, 40, 60, 80, 101],
              default: "Other",
              output: { count: { $sum: 1 } }
          }}
        ]),
        User.aggregate([
          { $match: baseFilter },
          { $group: {
              _id: { month: { $month: "$createdAt" }, year: { $year: "$createdAt" } },
              count: { $sum: 1 }
          }},
          { $sort: { "_id.year": 1, "_id.month": 1 } }
        ]),
        // Fraud candidates — Super Admin uses this for Alerts tab
        User.find({ role: "user", isFraudFlagged: true })
          .select("name email fraudScore fraudReason lastAtsScore status createdAt isFraudFlagged fraudFlaggedAt fraudFlaggedBy")
          .lean()
      ]);

    res.json({
      success: true,
      analytics: {
        total, active, flagged, shortlisted,
        avgScore:    avgArr[0] ? Math.round(avgArr[0].avg) : 0,
        scoreRanges, monthly,
      },
      fraudCandidates,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── RANKINGS ────────────────────────────────────────────────────────────────
exports.getRankings = async (req, res) => {
  try {
    const users = await User.find({ role: "user", isActive: true, lastAtsScore: { $gt: 0 } })
      .sort("-lastAtsScore")
      .limit(Number(req.query.limit) || 50)
      .lean();
    res.json({ success: true, rankings: users });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── RESEND SHORTLIST EMAIL ───────────────────────────────────────────────────
exports.resendShortlistEmail = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: "Not found" });
    if (user.status !== "Shortlisted")
      return res.status(400).json({ success: false, message: "Candidate is not shortlisted" });

    const result = await sendShortlistEmail({
      candidateName:  user.name,
      candidateEmail: user.email,
      jobTitle:       user.targetRole || "Open Position",
      hrName:         req.user?.name  || "HR Team",
      companyName:    process.env.COMPANY_NAME || "HireIQ",
      notes:          user.notes || null,
    });

    res.json({
      success:    true,
      emailSent:  result.success,
      previewUrl: result.previewUrl || null,
      message:    result.success ? "Email sent!" : "Email failed: " + result.error,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── CSV EXPORT ───────────────────────────────────────────────────────────────
exports.exportCSV = async (req, res) => {
  try {
    const filter = req.user?.role === "admin"
      ? { role: "user", appliedToHR: true }
      : { role: "user" };

    const users = await User.find(filter).lean();

    // Proper CSV with quotes to handle commas in fields
    const escape = (v) => {
      if (v === null || v === undefined) return "";
      const s = String(v).replace(/"/g, '""');
      return s.includes(",") || s.includes('"') || s.includes("\n") ? `"${s}"` : s;
    };

    const headers = ["Name","Email","Role","ATS Score","Status","Fraud Flagged","Fraud Score","Location","Phone","Joined"];
    const rows = users.map(u => [
      escape(u.name),
      escape(u.email),
      escape(u.targetRole),
      escape(u.lastAtsScore),
      escape(u.status),
      escape(u.isFraudFlagged ? "Yes" : "No"),
      escape(u.fraudScore),
      escape(u.location),
      escape(u.phone),
      escape(u.createdAt ? new Date(u.createdAt).toLocaleDateString("en-IN") : ""),
    ].join(","));

    const csv = [headers.join(","), ...rows].join("\n");

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="candidates_${Date.now()}.csv"`);
    res.send("\uFEFF" + csv); // BOM for Excel UTF-8
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};