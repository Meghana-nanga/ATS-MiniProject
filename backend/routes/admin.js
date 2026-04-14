const express = require("express");
const router  = express.Router();
const { protect, adminOnly } = require("../middleware/auth");
const {
  getAllCandidates, getCandidate, updateCandidateStatus,
  removeCandidate, flagForSuperAdmin, flagAndRemove, restoreCandidate,
  addCandidate, getRankings, getAnalytics, resendShortlistEmail, exportCSV
} = require("../controllers/adminController");

router.use(protect, adminOnly);
router.get ("/candidates",                       getAllCandidates);
router.post("/candidates",                       addCandidate);
router.get ("/candidates/export",                exportCSV);
router.get ("/candidates/rankings",              getRankings);
router.get ("/candidates/:id",                   getCandidate);
router.put ("/candidates/:id/status",            updateCandidateStatus);
router.put ("/candidates/:id/remove",            removeCandidate);
router.put ("/candidates/:id/flag-superadmin",   flagForSuperAdmin);
router.put ("/candidates/:id/flag",              flagAndRemove);
router.put ("/candidates/:id/restore",           restoreCandidate);
router.post("/candidates/:id/resend-email",      resendShortlistEmail);
router.get ("/rankings",                         getRankings);
router.get ("/analytics",                        getAnalytics);
router.put("/flag/:id", flagForSuperAdmin);
router.put("/status/:id", updateCandidateStatus);
router.post("/resend-email/:id", protect, adminOnly, resendShortlistEmail);
router.get(
  "/export-csv",
  exportCSV
);
module.exports = router;