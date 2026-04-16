const express = require("express");
const router = express.Router();
const { adminAuth } = require("../middleware/auth");
const Alert = require("../models/Alert");

router.get("/alerts", adminAuth, async (req, res) => {
  try {
    const alerts = await Alert.find({
      type: { $in: ["fraud_flag", "superadmin_decision"] },
    })
      .populate("targetUser", "name email status fraudReason")
      .populate("createdBy", "name email")
      .sort({ createdAt: -1 });

    res.json({ success: true, alerts });
  } catch (err) {
    console.error("Admin alerts error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// PATCH /api/admin/alerts/:id/read
router.patch("/alerts/:id/read", adminAuth, async (req, res) => {
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