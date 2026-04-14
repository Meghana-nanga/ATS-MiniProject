const mongoose = require("mongoose");

const AnalysisSchema = new mongoose.Schema({
  user:           { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  resume:         { type: mongoose.Schema.Types.ObjectId, ref: "Resume" },
  type:           { type: String, required: true },
  result:         { type: mongoose.Schema.Types.Mixed },
  score:          { type: Number },
  jobTitle:       { type: String },
  jobDescription: { type: String },
  duration:       { type: Number },
}, { timestamps: true });

module.exports = mongoose.model("Analysis", AnalysisSchema);