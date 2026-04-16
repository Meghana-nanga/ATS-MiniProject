const express     = require("express");
const router      = express.Router();
const { protect } = require("../middleware/auth");
const upload      = require("../middleware/upload");       // PDF/DOC only
const videoUpload = require("../middleware/videoUpload");  // Video files
const {
  uploadResume,
  analyzeResume,
  analyzeVideo,   // ✅ FIXED
  getMyResumes,
  getResumeText,
  generateCoverLetter,
  deleteResume,
} = require("../controllers/resumeController");

router.use(protect);

// Resume upload (PDF/DOC)
router.post("/upload",        upload.single("resume"),            uploadResume);

// Resume analyze (no file needed — uses resumeId)
router.post("/analyze",       analyzeResume);

// Cover letter
router.post("/cover-letter",  generateCoverLetter);

// Resumes list
router.get("/my",             getMyResumes);
router.get("/",               getMyResumes);

// Resume text
router.get("/:id/text",       getResumeText);

// Video resume analyze — uses videoUpload middleware (100MB, mp4/mov/webm/avi)
//router.post("/video-analyze", videoUpload.single("video"), analyzeVideoResume);
router.post("/video-analyze", videoUpload.single("video"), analyzeVideo);

// Delete resume
router.delete("/:id",         deleteResume);

module.exports = router;