
const express = require("express");
const router = express.Router();
const { protect, superadmin } = require("../middleware/auth");
const User = require("../models/User");
const Alert = require("../models/Alert");
const superAdminController = require("../controllers/superAdminController");

// All superAdmin routes require login + superadmin role
router.use(protect, superadmin);

// GET /api/superadmin/alerts
// Super Admin sees fraud_flag alerts escalated by HR
router.get("/alerts", async (req, res) => {
  try {
    const alerts = await Alert.find({ type: "fraud_flag" })
      .populate("targetUser", "name email status fraudReason lastAtsScore fraudScore")
      .populate("createdBy", "name email")
      .sort({ createdAt: -1 });

    res.json({ success: true, alerts });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PATCH /api/superadmin/alerts/:id/read
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

// POST /api/superadmin/decide/:userId
// Ban or clear a flagged user — creates superadmin_decision alert for HR
router.post("/decide/:userId", async (req, res) => {
  try {
    const { action, reason } = req.body;

    const user = await User.findById(req.params.userId);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    if (action === "ban") {
      user.status = "Banned";
      user.isActive = false;
      user.isFraudFlagged = true;
    } else if (action === "clear") {
      user.status = "Active";
      user.isActive = true;
      user.isFraudFlagged = false;
      user.fraudReason = null;
    }

    user.superAdminDecision = action;
    user.superAdminDecidedAt = new Date();
    await user.save();

    // Create superadmin_decision alert so HR sees it in their dashboard
    await Alert.create({
      type: "superadmin_decision",
      title:
        action === "ban"
          ? `🚫 BANNED: ${user.name}`
          : `✅ CLEARED: ${user.name}`,
      message: reason || "Decision made by Super Admin",
      severity: action === "ban" ? "high" : "medium",
      targetUser: user._id,
      createdBy: req.user._id,
    });

    res.json({ success: true, user });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/superadmin/users
router.get("/users", superAdminController.getAllUsers);

// GET /api/superadmin/analytics
router.get("/analytics", superAdminController.getPlatformAnalytics);

// POST /api/superadmin/users/:id/ban
router.post("/users/:id/ban", superAdminController.banUser);

// POST /api/superadmin/users/:id/restore
router.post("/users/:id/restore", superAdminController.restoreUser);

module.exports = router;