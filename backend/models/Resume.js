const mongoose = require("mongoose");

const ResumeSchema = new mongoose.Schema({
  user:             { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  filename:         { type: String, required: true },
  originalName:     { type: String, required: true },
  filePath:         { type: String, required: true },
  fileSize:         { type: Number },
  mimeType:         { type: String },
  extractedText:    { type: String, default: "" },
  isActive:         { type: Boolean, default: true },
  atsScore:         { type: Number, default: 0 },
  keywordScore:     { type: Number, default: 0 },
  formattingScore:  { type: Number, default: 0 },
  experienceScore:  { type: Number, default: 0 },
  educationScore:   { type: Number, default: 0 },
  skillsScore:      { type: Number, default: 0 },
  matchedKeywords:  [{ keyword: String, found: Boolean, weight: Number }],
  missingKeywords:  [String],
  foundSkills:      [String],
  missingSkills:    [String],
  fraudScore:       { type: Number, default: 0 },
  isFraudSuspected: { type: Boolean, default: false },
  fraudFlags:       [{ type: { type: String }, description: String, severity: String }],
  fraudAnalysis:    { type: String, default: null },
  jobDescription:   { type: String, default: "" },
  jobTitle:         { type: String, default: "" },
  coverLetter:      { type: String, default: null },
  analysisStatus:   { type: String, enum: ["pending","analyzing","complete","failed"], default: "pending" },
  analyzedAt:       { type: Date, default: null },
}, { timestamps: true });

module.exports = mongoose.model("Resume", ResumeSchema);
