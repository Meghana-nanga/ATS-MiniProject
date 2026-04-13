const multer  = require("multer");
const path    = require("path");
const { v4: uuidv4 } = require("uuid");

// Use memory storage — file never touches disk permanently
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, "../uploads")),
  filename:    (req, file, cb) => cb(null, "resume_" + uuidv4() + path.extname(file.originalname)),
});

const fileFilter = (req, file, cb) => {
  const allowed = [".pdf", ".doc", ".docx"];
  if (allowed.includes(path.extname(file.originalname).toLowerCase())) cb(null, true);
  else cb(new Error("Only PDF and Word documents allowed"), false);
};

module.exports = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 },
});