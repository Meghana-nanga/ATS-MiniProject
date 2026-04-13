const mongoose = require("mongoose");
const bcrypt   = require("bcryptjs");

const UserSchema = new mongoose.Schema({
  name:     { type: String,  required: true, trim: true },
  email:    { type: String,  required: true, unique: true, lowercase: true, trim: true },
  password: { type: String,  required: true, minlength: 6, select: false },
  role:     { type: String,  default: "user", enum: ["user","admin","superadmin"] },
  status:   { type: String,  default: "New",
              enum: ["New","Active","Shortlisted","Rejected","Flagged","Banned","Under Review"] },
  isActive: { type: Boolean, default: true },

  // Profile
  phone:         { type: String, default: "" },
  location:      { type: String, default: "" },
  targetRole:    { type: String, default: "" },
  department:    { type: String, default: "" },
  notes:         { type: String, default: "" },
  interviewDate: { type: Date,   default: null },
  lastLogin:     { type: Date,   default: null },
  createdBy:     { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },

  // ATS
  lastAtsScore:  { type: Number, default: 0 },
  totalAnalyses: { type: Number, default: 0 },

  // HR visibility — user only appears in HR dashboard after applying
  appliedToHR:   { type: Boolean, default: false },
  appliedAt:     { type: Date,    default: null },

  // Fraud
  isFraudFlagged: { type: Boolean, default: false },
  fraudReason:    { type: String,  default: null },
  fraudScore:     { type: Number,  default: 0 },
  fraudFlaggedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  fraudFlaggedAt: { type: Date,    default: null },
  isFraudSuspected: { type: Boolean, default: false },

}, { timestamps: true });

// Hash password before save
UserSchema.pre("save", async function(next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// Compare password
UserSchema.methods.comparePassword = async function(candidate) {
  return bcrypt.compare(candidate, this.password);
};

// Safe public output — strips password (used by superAdminController)
UserSchema.methods.toPublic = function() {
  const obj = this.toObject();
  delete obj.password;
  return obj;
};

module.exports = mongoose.model("User", UserSchema);