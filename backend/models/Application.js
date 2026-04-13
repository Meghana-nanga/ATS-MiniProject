const mongoose = require("mongoose");

const ApplicationSchema = new mongoose.Schema({
  user:          { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  job:           { type: mongoose.Schema.Types.ObjectId, ref: "Job", required: true },
  resume:        { type: mongoose.Schema.Types.ObjectId, ref: "Resume" },

  // Snapshot of data at time of application
  applicantName:    { type: String, required: true },
  applicantEmail:   { type: String, required: true },
  applicantPhone:   { type: String, default: "" },
  applicantLocation:{ type: String, default: "" },
  linkedIn:         { type: String, default: "" },
  github:           { type: String, default: "" },
  coverLetter:      { type: String, default: "" },
  resumeText:       { type: String, default: "" },

  // ATS results at time of application
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

  // Fraud
  fraudScore:       { type: Number, default: 0 },
  isFraudSuspected: { type: Boolean, default: false },
  fraudFlags:       [{ type: { type: String }, description: String, severity: String }],
  fraudAnalysis:    { type: String, default: "" },

  // Admin workflow
  status: {
    type: String,
    enum: ["Applied","Under Review","Shortlisted","Interview Scheduled","Rejected","Hired"],
    default: "Applied"
  },
  adminNotes:       { type: String, default: "" },
  interviewDate:    { type: Date, default: null },
  rejectionReason:  { type: String, default: "" },
  reviewedBy:       { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  reviewedAt:       { type: Date, default: null },
}, { timestamps: true });

// Prevent duplicate applications
ApplicationSchema.index({ user: 1, job: 1 }, { unique: true });

module.exports = mongoose.model("Application", ApplicationSchema);