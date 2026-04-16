const express = require("express");
const router = express.Router();
const { superAdminAuth } = require("../middleware/auth");
const User = require("../models/User");
const Alert = require("../models/Alert");

// POST /api/super-admin/decide/:userId
router.post("/decide/:userId", superAdminAuth, async (req, res) => {
  try {
    const { userId } = req.params;
    const { action, reason, alertId } = req.body;

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    // 1. Apply decision
    if (action === "ban") {
      user.isActive = false;
      user.status = "Banned";
      user.isFraudFlagged = true;
    } else {
      user.isActive = true;
      user.isFraudFlagged = false;
      if (user.status === "Flagged" || user.status === "Banned") {
        user.status = "Active";
      }
    }

    await user.save();

    // 2. Close original alert
    if (alertId) {
      await Alert.findByIdAndUpdate(alertId, {
        isRead: true,
        resolvedAt: new Date(),
      });
    }

    // 3. Create decision alert for HR
    await Alert.create({
      type: "superadmin_decision",
      title:
        action === "ban"
          ? `🚫 Super Admin Banned: ${user.name}`
          : `✅ Super Admin Cleared: ${user.name}`,
      message:
        reason ||
        (action === "ban"
          ? "Super Admin has reviewed and banned this user."
          : "Super Admin has reviewed and cleared this user."),
      targetUser: user._id,
      isRead: false,
      createdAt: new Date(),
    });

    res.json({ success: true, action, user });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;