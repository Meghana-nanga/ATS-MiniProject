const express = require("express");
const router  = express.Router();
const {
  getAllCandidates,
  getCandidate,
  updateCandidateStatus,
  flagForSuperAdmin,
  flagAndRemove,
  restoreCandidate,
  removeCandidate,
  addCandidate,
  getAnalytics,
  getRankings,
  resendShortlistEmail,
  exportCSV,
} = require("../controllers/adminController");
const { protect, admin, superadmin } = require("../middleware/auth");

// All routes require login
router.use(protect);

// ── CANDIDATES ────────────────────────────────────────────────────────────────
router.get  ("/candidates",          admin,      getAllCandidates);
router.get  ("/candidates/export",   admin,      exportCSV);
router.get  ("/candidates/rankings", admin,      getRankings);
router.get  ("/candidates/:id",      admin,      getCandidate);
router.post ("/candidates",          admin,      addCandidate);
router.put  ("/candidates/:id/status",  admin,   updateCandidateStatus);
router.post ("/candidates/:id/flag",    admin,   flagForSuperAdmin);       // HR → Super Admin
router.post ("/candidates/:id/remove",  admin,   flagAndRemove);           // HR → Ban
router.post ("/candidates/:id/restore", superadmin, restoreCandidate);    // Super Admin only
router.delete("/candidates/:id",        admin,   removeCandidate);
router.post ("/candidates/:id/resend-email", admin, resendShortlistEmail);

// ── ANALYTICS ─────────────────────────────────────────────────────────────────
router.get("/analytics", admin, getAnalytics);

module.exports = router;