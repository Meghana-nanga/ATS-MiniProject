const express = require("express");
const router  = express.Router();
const { protect } = require("../middleware/auth");
const { matchJobs } = require("../controllers/matchController");

router.get("/", protect, matchJobs);

module.exports = router;