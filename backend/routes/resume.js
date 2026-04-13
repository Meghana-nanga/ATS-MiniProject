const express = require("express");
const router  = express.Router();
const { protect } = require("../middleware/auth");
const upload  = require("../middleware/upload");
const {
  uploadResume,
  analyzeResume,
  getMyResumes,
  generateCoverLetter,
  deleteResume,
} = require("../controllers/resumeController");

router.use(protect);
router.post("/upload",       upload.single("resume"), uploadResume);
router.post("/analyze",      analyzeResume);
router.get("/",              getMyResumes);
router.post("/cover-letter", generateCoverLetter);
router.delete("/:id",        deleteResume);

module.exports = router;