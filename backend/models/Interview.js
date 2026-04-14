const mongoose = require("mongoose");

const InterviewSchema = new mongoose.Schema({
  candidate:    { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  scheduledBy:  { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  jobTitle:     { type: String, default: "" },
  date:         { type: Date, required: true },
  mode:         { type: String, enum: ["In-Person","Video Call","Phone"], default: "Video Call" },
  location:     { type: String, default: "" },  // room / meet link
  round:        { type: String, enum: ["HR Round","Technical Round","Managerial Round","Final Round"], default: "HR Round" },
  notes:        { type: String, default: "" },
  status:       { type: String, enum: ["Scheduled","Completed","Cancelled","Rescheduled"], default: "Scheduled" },
  outcome:      { type: String, enum: ["Pending","Hired","Rejected","Next Round"], default: "Pending" },
  offerDetails: { type: String, default: "" },  // salary / joining date for hire email
}, { timestamps: true });

module.exports = mongoose.model("Interview", InterviewSchema);