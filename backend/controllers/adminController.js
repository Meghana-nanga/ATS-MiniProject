const Alert = require("../models/Alert");
const User   = require("../models/User");
const Resume = require("../models/Resume");
const { sendShortlistEmail } = require("../services/emailService");

function csvEscape(val) {

  if (val === null || val === undefined)
    return "";

  const str =
    String(val).replace(/"/g, '""');

  return /[",\n\r]/.test(str)
    ? `"${str}"`
    : str;

}

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
      .sort("-finalScore")
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
    await Alert.create({

      type: "fraud_flag",
    
      title: `Fraud Flag: ${user.name}`,
    
      message:
        reason ||
        "HR admin flagged this user for review.",
    
      severity: "high",
    
      targetUser: user._id,
    
      createdBy: req.user._id
    
    });

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
    const User = require("../models/User");

    const [total, active, flagged, avgScoreRes, monthly, scoreRanges] = await Promise.all([
      User.countDocuments({ role: "user" }),
      User.countDocuments({ role: "user", isActive: true }),
      User.countDocuments({ role: "user", isFraudFlagged: true }),
      User.aggregate([
        { $match: { role: "user", lastAtsScore: { $gt: 0 } } },
        { $group: { _id: null, avg: { $avg: "$lastAtsScore" } } }
      ]),
      User.aggregate([
        { $match: { role: "user" } },
        { $group: { _id: { month: { $month: "$createdAt" }, year: { $year: "$createdAt" } }, count: { $sum: 1 } } },
        { $sort: { "_id.year": 1, "_id.month": 1 } },
        { $limit: 12 }
      ]),
      User.aggregate([
        { $match: { role: "user", lastAtsScore: { $gt: 0 } } },
        { $bucket: {
            groupBy: "$lastAtsScore",
            boundaries: [0, 40, 60, 80, 101],
            default: "other",
            output: { count: { $sum: 1 } }
        }}
      ])
    ]);

    // Map bucket boundaries to the _id values the frontend expects (0,40,60,80)
    const rangeMapped = [
      { _id: 0,  count: scoreRanges.find(r => r._id === 0)?.count  || 0 },
      { _id: 40, count: scoreRanges.find(r => r._id === 40)?.count || 0 },
      { _id: 60, count: scoreRanges.find(r => r._id === 60)?.count || 0 },
      { _id: 80, count: scoreRanges.find(r => r._id === 80)?.count || 0 },
    ];

    res.json({
      success: true,
      analytics: {
        total,
        active,
        flagged,
        avgScore: Math.round(avgScoreRes[0]?.avg || 0),
        monthly,
        scoreRanges: rangeMapped,
      }
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Failed to load analytics"
    });
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

    const User =
      require("../models/User");

    const filter = {
      role: "user"
    };

    if (req.user?.role === "admin") {
      filter.appliedToHR = true;
    }

    const users = await User.find(filter)
      .sort("-lastAtsScore")
      .lean();

    const headers = [

      "Name",
      "Email",
      "Status",
      "ATS Score",
      "Target Role",
      "Phone",
      "Location",
      "Total Analyses",
      "Applied To HR",
      "Fraud Flagged",
      "Fraud Score",
      "Fraud Reason",
      "Interview Date",
      "Notes",
      "Joined"

    ];

    const rows = users.map(u => [

      csvEscape(u.name),

      csvEscape(u.email),

      csvEscape(u.status),

      csvEscape(u.lastAtsScore),

      csvEscape(u.targetRole),

      csvEscape(u.phone),

      csvEscape(u.location),

      csvEscape(u.totalAnalyses),

      csvEscape(
        u.appliedToHR ? "Yes" : "No"
      ),

      csvEscape(
        u.isFraudFlagged ? "Yes" : "No"
      ),

      csvEscape(u.fraudScore),

      csvEscape(u.fraudReason),

      csvEscape(
        u.interviewDate
          ? new Date(
              u.interviewDate
            ).toLocaleDateString("en-IN")
          : ""
      ),

      csvEscape(u.notes),

      csvEscape(
        new Date(
          u.createdAt
        ).toLocaleDateString("en-IN")
      )

    ].join(","));

    const csv =
      [headers.join(","), ...rows]
      .join("\r\n");

    const filename =
      `candidates_${new Date()
        .toISOString()
        .slice(0,10)}.csv`;

    res.setHeader(
      "Content-Type",
      "text/csv; charset=utf-8"
    );

    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${filename}"`
    );

    res.send("\uFEFF" + csv);

  }

  catch (err) {

    res.status(500).json({
      success: false,
      message: err.message
    });

  }

};
// GET all alerts
exports.getAlerts = async (req, res) => {
  try {

    const alerts = await Alert.find()
      .populate("targetUser", "name email status lastAtsScore")
      .populate("createdBy", "name email")
      .sort("-createdAt")
      .limit(100);

    const unreadCount = await Alert.countDocuments({
      isRead: false
    });

    res.json({
      success: true,
      alerts,
      unreadCount
    });

  } catch (err) {

    res.status(500).json({
      success: false,
      message: err.message
    });

  }
};


// MARK alert as read
exports.markAlertRead = async (req, res) => {

  try {

    await Alert.findByIdAndUpdate(
      req.params.id,
      {
        isRead: true,
        readAt: new Date()
      }
    );

    res.json({ success: true });

  } catch (err) {

    res.status(500).json({
      success: false,
      message: err.message
    });

  }

};