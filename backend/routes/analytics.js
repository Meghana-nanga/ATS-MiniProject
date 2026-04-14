const express = require("express");
const router = express.Router();

const { getAnalytics } = require("../controllers/adminController");

// GET analytics data
router.get("/", getAnalytics);

module.exports = router;