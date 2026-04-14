const mongoose = require("mongoose");

const AlertSchema = new mongoose.Schema({
  type: {
    type: String,
    required: true   // fraud_flag, ban, review
  },

  title: {
    type: String,
    required: true
  },

  message: {
    type: String,
    required: true
  },

  severity: {
    type: String,
    enum: ["low", "medium", "high", "critical"],
    default: "medium"
  },

  targetUser: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  },

  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  },

  isRead: {
    type: Boolean,
    default: false
  },

  readAt: {
    type: Date,
    default: null
  }

}, { timestamps: true });

module.exports = mongoose.model("Alert", AlertSchema);