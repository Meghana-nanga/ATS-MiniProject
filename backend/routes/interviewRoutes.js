const express = require("express");
const router  = express.Router();
const { protect, adminOnly } = require("../middleware/auth");
const {
  scheduleInterview, getInterviews, getCandidateInterviews,
  updateInterview, recordOutcome, getMyInterviews,
} = require("../controllers/interviewController");

// User: see their own interviews
router.get("/my", protect, getMyInterviews);

// Admin only routes
router.use(protect, adminOnly);
router.post("/",                        scheduleInterview);
router.get("/",                         getInterviews);
router.get("/candidate/:candidateId",   getCandidateInterviews);
router.put("/:id",                      updateInterview);
router.post("/:id/outcome",             recordOutcome);

module.exports = router;