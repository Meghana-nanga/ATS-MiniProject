const express = require("express");
const router = express.Router();
const { protect, admin } = require("../middleware/auth");
const Alert = require("../models/Alert");
const adminController = require("../controllers/adminController");

// All admin routes require login + admin/superadmin role
router.use(protect, admin);

// ── ALERTS ──────────────────────────────────────────────────────────────────
// GET /api/admin/alerts  — HR sees fraud_flag + superadmin_decision alerts
router.get("/alerts", async (req, res) => {
  try {
    const alerts = await Alert.find({
      type: { $in: ["fraud_flag", "superadmin_decision"] },
    })
      .populate("targetUser", "name email status fraudReason lastAtsScore fraudScore")
      .populate("createdBy", "name email")
      .sort({ createdAt: -1 });

    res.json({ success: true, alerts });
  } catch (err) {
    console.error("Admin alerts error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// PATCH /api/admin/alerts/:id/read
router.patch("/alerts/:id/read", async (req, res) => {
  try {
    const alert = await Alert.findByIdAndUpdate(
      req.params.id,
      { isRead: true },
      { new: true }
    );
    res.json({ success: true, alert });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── CANDIDATES ──────────────────────────────────────────────────────────────
router.get("/candidates",               adminController.getAllCandidates);
router.get("/candidates/rankings",      adminController.getRankings);
router.get("/candidates/export",        adminController.exportCSV);
router.post("/candidates",              adminController.addCandidate);
router.get("/candidates/:id",           adminController.getCandidate);
router.put("/candidates/:id/status",    adminController.updateCandidateStatus);
router.post("/candidates/:id/flag",     adminController.flagForSuperAdmin);
router.post("/candidates/:id/remove",   adminController.flagAndRemove);
router.post("/candidates/:id/restore",  adminController.restoreCandidate);
router.delete("/candidates/:id",        adminController.removeCandidate);
router.post("/candidates/:id/resend-email", adminController.resendShortlistEmail);

// ── ANALYTICS ───────────────────────────────────────────────────────────────
router.get("/analytics", adminController.getAnalytics);

module.exports = router;