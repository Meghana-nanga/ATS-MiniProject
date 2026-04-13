const express = require("express");
const router  = express.Router();
const {
  getProfile,
  updateProfile,
  applyToHR,
  runAtsAnalysis,
  runVideoAnalysis,
} = require("../controllers/userController");
const { protect } = require("../middleware/auth");

router.use(protect);

router.get ("/profile",    getProfile);
router.put ("/profile",    updateProfile);
router.post("/apply",      applyToHR);        // KEY: triggers appearance in HR dashboard
router.post("/ats",        runAtsAnalysis);
router.post("/video",      runVideoAnalysis);

module.exports = router;