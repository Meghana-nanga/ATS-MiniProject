const mongoose = require("mongoose");

const JobSchema = new mongoose.Schema({
  title:        { type: String, required: true, trim: true },
  department:   { type: String, default: "" },
  location:     { type: String, default: "Remote" },
  type:         { type: String, enum: ["Full-time","Part-time","Contract","Internship"], default: "Full-time" },
  description:  { type: String, required: true },
  requirements: { type: String, default: "" },
  skills:       [{ type: String }],
  experience:   { type: String, default: "Any" },
  salary:       { type: String, default: "Competitive" },
  isActive:     { type: Boolean, default: true },
  postedBy:     { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  deadline:     { type: Date, default: null },
  applicants:   { type: Number, default: 0 },
}, { timestamps: true });

module.exports = mongoose.model("Job", JobSchema);