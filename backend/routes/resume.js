const express = require("express");
const router  = express.Router();
const { protect } = require("../middleware/auth");
const upload  = require("../middleware/upload"); // already using multer
const {
  uploadResume,
  analyzeResume,
  analyzeVideoResume,
  getMyResumes,
  getResumeText,
  generateCoverLetter,
  deleteResume,
} = require("../controllers/resumeController");

router.use(protect);

// Resume upload (PDF/DOC)
router.post("/upload", upload.single("resume"), uploadResume);

// 🔥 FIXED: Accept VIDEO here
router.post("/analyze", upload.single("video"), analyzeResume);

// Routes
router.get("/my", getMyResumes);
router.get("/", getMyResumes);
router.post("/cover-letter", generateCoverLetter);
router.get("/:id/text", getResumeText);
router.post("/video-analyze", upload.single("video"), analyzeVideoResume);
router.delete("/:id", deleteResume);

module.exports = router;