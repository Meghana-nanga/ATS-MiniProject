const express = require("express");
const router  = express.Router();
const { protect } = require("../middleware/auth");
const {
  getJobs,
  getJob,
  applyJob,
  getMyApplications,
} = require("../controllers/jobController");

router.get("/",                protect, getJobs);
router.get("/my/applications", protect, getMyApplications);
router.get("/:id",             protect, getJob);
router.post("/apply",          protect, applyJob);

module.exports = router;