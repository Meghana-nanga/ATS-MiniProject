const express = require("express");
const router  = express.Router();
const { protect, superadmin } = require("../middleware/auth");
const {
  getAllUsers, getPlatformAnalytics,
  banUser, flagAndBan, restoreUser,
  createAdmin, getAdmins, removeAdmin,
  getAllApplications, getUserDetail, getFraudReport,
} = require("../controllers/superAdminController");

router.use(protect, superadmin);

router.get("/users",                 getAllUsers);
router.get("/users/:id",             getUserDetail);
router.put("/users/:id/ban",         banUser);
router.put("/users/:id/flag-ban",    flagAndBan);
router.put("/users/:id/restore",     restoreUser);

router.get("/admins",                getAdmins);
router.post("/admins",               createAdmin);
router.delete("/admins/:id",         removeAdmin);

router.get("/applications",          getAllApplications);
router.get("/analytics",             getPlatformAnalytics);
router.get("/fraud-report",          getFraudReport);

module.exports = router;