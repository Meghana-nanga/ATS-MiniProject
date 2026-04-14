const multer = require("multer");
const path   = require("path");
const { v4: uuidv4 } = require("uuid");

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, "../uploads")),
  filename:    (req, file, cb) => cb(null, "video_" + uuidv4() + path.extname(file.originalname)),
});

const fileFilter = (req, file, cb) => {
  const allowedMimes = ["video/mp4","video/quicktime","video/webm","video/avi","video/x-msvideo","video/mov"];
  const allowedExts  = [".mp4",".mov",".webm",".avi"];
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowedMimes.includes(file.mimetype) || allowedExts.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error("Only MP4, MOV, WebM, or AVI video files are allowed"), false);
  }
};

module.exports = multer({
  storage,
  fileFilter,
  limits: { fileSize: 100 * 1024 * 1024 }, // 100 MB
});