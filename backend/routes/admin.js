const express = require("express");
const router = express.Router();
const { adminAuth } = require("../middleware/auth");
const Alert = require("../models/Alert");

// GET /api/admin/alerts
router.get("/alerts", adminAuth, async (req, res) => {
  try {
    const alerts = await Alert.find({ type: "superadmin_decision" })
      .populate(
        "targetUser",
        "name email status lastAtsScore fraudScore fraudReason targetRole createdAt"
      )
      .populate("createdBy", "name email")
      .sort({ createdAt: -1 });

    res.json({ alerts });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PATCH /api/admin/alerts/:id/read
router.patch("/alerts/:id/read", adminAuth, async (req, res) => {
  try {
    await Alert.findByIdAndUpdate(req.params.id, { isRead: true });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;