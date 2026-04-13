const express = require("express");
const router  = express.Router();
const { protect, admin } = require("../middleware/auth");
const { getAnalytics }   = require("../controllers/adminController");

router.get("/", protect, admin, getAnalytics);
module.exports = router;