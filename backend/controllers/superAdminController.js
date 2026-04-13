const User        = require("../models/User");
const Resume      = require("../models/Resume");
const Analysis    = require("../models/Analysis");
const Job         = require("../models/Job");
const Application = require("../models/Application");

// ── ALL USERS (including non-applicants) ──
exports.getAllUsers = async (req, res) => {
  try {
    const { role, status, search, isFraud, page=1, limit=30 } = req.query;
    const filter = {};
    if (role && role !== "all")   filter.role   = role;
    if (status && status !== "all") filter.status = status;
    if (isFraud === "true")       filter.isFraudFlagged = true;
    if (search) filter.$or = [
      { name:  new RegExp(search,"i") },
      { email: new RegExp(search,"i") },
    ];
    const total = await User.countDocuments(filter);
    const users = await User.find(filter)
      .sort("-createdAt")
      .skip((page-1)*Number(limit))
      .limit(Number(limit))
      .lean();
    res.json({ success:true, users, total });
  } catch (err) { res.status(500).json({ success:false, message:err.message }); }
};

// ── FULL PLATFORM ANALYTICS ──
exports.getPlatformAnalytics = async (req, res) => {
  try {
    const [
      totalUsers, totalAdmins, totalSuperAdmins,
      totalResumes, totalJobs, totalApplications,
      fraudUsers, bannedUsers, activeUsers,
      avgScore, scoreRanges, monthly, appStats,
    ] = await Promise.all([
      User.countDocuments({ role:"user" }),
      User.countDocuments({ role:"admin" }),
      User.countDocuments({ role:"superadmin" }),
      Resume.countDocuments(),
      Job.countDocuments(),
      Application.countDocuments(),
      User.countDocuments({ isFraudFlagged:true }),
      User.countDocuments({ isActive:false }),
      User.countDocuments({ role:"user", isActive:true }),
      User.aggregate([{ $match:{ role:"user", lastAtsScore:{ $gt:0 } } }, { $group:{ _id:null, avg:{ $avg:"$lastAtsScore" } } }]),
      User.aggregate([
        { $match:{ role:"user" } },
        { $bucket:{ groupBy:"$lastAtsScore", boundaries:[0,40,60,80,101], default:"Other", output:{ count:{ $sum:1 } } } }
      ]),
      User.aggregate([
        { $match:{ role:"user" } },
        { $group:{ _id:{ month:{ $month:"$createdAt" }, year:{ $year:"$createdAt" } }, count:{ $sum:1 } } },
        { $sort:{ "_id.year":1, "_id.month":1 } }
      ]),
      Application.aggregate([
        { $group:{ _id:"$status", count:{ $sum:1 } } }
      ]),
    ]);

    res.json({ success:true, analytics:{
      users:{ total:totalUsers, admins:totalAdmins, superAdmins:totalSuperAdmins, active:activeUsers, fraud:fraudUsers, banned:bannedUsers },
      resumes:{ total:totalResumes },
      jobs:{ total:totalJobs },
      applications:{ total:totalApplications, byStatus:appStats },
      avgScore: avgScore[0] ? Math.round(avgScore[0].avg) : 0,
      scoreRanges, monthly,
    }});
  } catch (err) { res.status(500).json({ success:false, message:err.message }); }
};

// ── BAN USER (Super Admin only) ──
exports.banUser = async (req, res) => {
  try {
    const { reason } = req.body;
    if (req.params.id === req.user._id.toString())
      return res.status(400).json({ success:false, message:"Cannot ban yourself" });
    const user = await User.findByIdAndUpdate(req.params.id, {
      isActive:      false,
      status:        "Banned",
      notes:         `Banned by superadmin: ${reason||"No reason given"}`,
    }, { new:true });
    if (!user) return res.status(404).json({ success:false, message:"User not found" });
    res.json({ success:true, message:"User banned", user:user.toPublic() });
  } catch (err) { res.status(500).json({ success:false, message:err.message }); }
};

// ── FLAG + BAN FRAUD USER (Super Admin only) ──
exports.flagAndBan = async (req, res) => {
  try {
    const { reason } = req.body;
    const user = await User.findByIdAndUpdate(req.params.id, {
      isActive:       false,
      status:         "Banned",
      isFraudFlagged: true,
      fraudReason:    reason || "Fraud detected and confirmed by Super Admin",
      notes:          `Fraud ban by superadmin: ${reason||"N/A"}`,
    }, { new:true });
    if (!user) return res.status(404).json({ success:false, message:"User not found" });

    // Also reject all their pending applications
    await Application.updateMany(
      { user: req.params.id, status:{ $in:["Applied","Under Review","Shortlisted"] } },
      { status:"Rejected", rejectionReason:"Account banned for fraud" }
    );

    res.json({ success:true, message:"User flagged and banned, applications rejected", user:user.toPublic() });
  } catch (err) { res.status(500).json({ success:false, message:err.message }); }
};

// ── RESTORE USER (Super Admin only) ──
exports.restoreUser = async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(req.params.id, {
      isActive:       true,
      status:         "Active",
      isFraudFlagged: false,
      fraudReason:    null,
      notes:          `Restored by superadmin on ${new Date().toLocaleDateString()}`,
    }, { new:true });
    if (!user) return res.status(404).json({ success:false, message:"User not found" });
    res.json({ success:true, message:"User restored", user:user.toPublic() });
  } catch (err) { res.status(500).json({ success:false, message:err.message }); }
};

// ── MANAGE ADMIN ACCOUNTS ──
exports.createAdmin = async (req, res) => {
  try {
    const { name, email, password, department, role="admin" } = req.body;
    if (!["admin","superadmin"].includes(role))
      return res.status(400).json({ success:false, message:"Invalid role" });
    if (await User.findOne({ email }))
      return res.status(400).json({ success:false, message:"Email already exists" });
    const admin = await User.create({
      name, email, password: password||"Admin@123",
      role, department, status:"Active", isActive:true,
      createdBy: req.user._id,
    });
    res.status(201).json({ success:true, user:admin.toPublic() });
  } catch (err) { res.status(500).json({ success:false, message:err.message }); }
};

exports.getAdmins = async (req, res) => {
  try {
    const admins = await User.find({ role:{ $in:["admin","superadmin"] } }).sort("-createdAt").lean();
    res.json({ success:true, admins });
  } catch (err) { res.status(500).json({ success:false, message:err.message }); }
};

exports.removeAdmin = async (req, res) => {
  try {
    if (req.params.id === req.user._id.toString())
      return res.status(400).json({ success:false, message:"Cannot remove yourself" });
    await User.findByIdAndUpdate(req.params.id, { isActive:false, status:"Banned" });
    res.json({ success:true, message:"Admin removed" });
  } catch (err) { res.status(500).json({ success:false, message:err.message }); }
};

// ── ALL APPLICATIONS (super admin sees everything) ──
exports.getAllApplications = async (req, res) => {
  try {
    const { status, jobId, search, minScore, maxScore, page=1, limit=25 } = req.query;
    const filter = {};
    if (status && status !== "all") filter.status = status;
    if (jobId)  filter.job = jobId;
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
      .populate("job","title department location")
      .populate("user","name email role status isFraudFlagged")
      .sort("-atsScore")
      .skip((page-1)*Number(limit))
      .limit(Number(limit));
    res.json({ success:true, applications:apps, total });
  } catch (err) { res.status(500).json({ success:false, message:err.message }); }
};

// ── GET SINGLE USER WITH FULL DETAILS ──
exports.getUserDetail = async (req, res) => {
  try {
    const user    = await User.findById(req.params.id).lean();
    if (!user) return res.status(404).json({ success:false, message:"User not found" });
    const resumes = await Resume.find({ user:req.params.id }).sort("-createdAt").select("-extractedText");
    const apps    = await Application.find({ user:req.params.id }).populate("job","title");
    res.json({ success:true, user, resumes, applications:apps });
  } catch (err) { res.status(500).json({ success:false, message:err.message }); }
};

// ── FRAUD REPORT (flagged users pending super admin action) ──
exports.getFraudReport = async (req, res) => {
  try {
    const flagged = await User.find({ isFraudFlagged:true }).sort("-fraudScore").lean();
    const withResumes = await Promise.all(flagged.map(async u => {
      const resume = await Resume.findOne({ user:u._id, isFraudSuspected:true }).select("-extractedText");
      return { ...u, latestFraudResume:resume };
    }));
    res.json({ success:true, flagged:withResumes, total:withResumes.length });
  } catch (err) { res.status(500).json({ success:false, message:err.message }); }
};