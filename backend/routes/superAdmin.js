const express = require("express");
const router = express.Router();
const { superAdminAuth } = require("../middleware/auth");
const User = require("../models/User");
const Alert = require("../models/Alert");
const express = require("express");
const superAdminAuth = require("../middleware/superAdminAuth");


router.get("/alerts", superAdminAuth, async (req, res) => {
  try {
    const alerts = await Alert.find({ type: "fraud_flag" })
      .populate("targetUser", "name email status fraudReason")
      .populate("createdBy", "name email")
      .sort({ createdAt: -1 });

    res.json({ success: true, alerts });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});
// POST /api/super-admin/decide/:userId
router.post("/decide/:userId", superAdminAuth, async (req, res) => {
  try {
    const { action, reason } = req.body;

    const user = await User.findById(req.params.userId);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    if (action === "ban") {
      user.status = "Banned";
    } else if (action === "clear") {
      user.status = "Active";
      user.isFraudFlagged = false;
    }

    // ✅ THIS WAS MISSING
    user.superAdminDecision = action;
    user.superAdminDecidedAt = new Date();

    await user.save();

    // ✅ Create decision alert
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

router.patch("/alerts/:id/read", superAdminAuth, async (req, res) => {
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

module.exports = router;