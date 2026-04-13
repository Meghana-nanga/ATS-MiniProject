/**
 * seed.js — Idempotent seed (safe to run multiple times)
 * Run: npm run seed
 * It SKIPS accounts that already exist — no duplicates ever.
 */
require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt   = require("bcryptjs");

const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/hireiq";

async function seed() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("✅ Connected to MongoDB");

    // Inline schema to avoid circular require issues
    const UserSchema = new mongoose.Schema({
      name:           { type: String,  required: true },
      email:          { type: String,  required: true, unique: true, lowercase: true },
      password:       { type: String,  required: true },
      role:           { type: String,  default: "user", enum: ["user","admin","superadmin"] },
      status:         { type: String,  default: "New" },
      isActive:       { type: Boolean, default: true },
      isFraudFlagged: { type: Boolean, default: false },
      fraudReason:    { type: String,  default: null },
      fraudScore:     { type: Number,  default: 0 },
      lastAtsScore:   { type: Number,  default: 0 },
      totalAnalyses:  { type: Number,  default: 0 },
      targetRole:     { type: String,  default: "" },
      phone:          { type: String,  default: "" },
      location:       { type: String,  default: "" },
      notes:          { type: String,  default: "" },
      appliedToHR:    { type: Boolean, default: false },
      interviewDate:  { type: Date,    default: null },
      lastLogin:      { type: Date,    default: null },
      fraudFlaggedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
      fraudFlaggedAt: { type: Date,    default: null },
    }, { timestamps: true });

    const User = mongoose.models.User || mongoose.model("User", UserSchema);

    const accounts = [
      { name: "Super Admin", email: "superadmin@hireiq.com", password: "SuperAdmin@123", role: "superadmin", status: "Active" },
      { name: "HR Admin",    email: "admin@hireiq.com",      password: "Admin@123",      role: "admin",      status: "Active" },
      { name: "Test User",   email: "user@hireiq.com",       password: "User@123",       role: "user",       status: "Active" },
    ];

    for (const acc of accounts) {
      const exists = await User.findOne({ email: acc.email });
      if (exists) {
        console.log(`⏭  Skipped (already exists): ${acc.email}`);
        continue;
      }
      const hashed = await bcrypt.hash(acc.password, 12);
      await User.create({ ...acc, password: hashed });
      console.log(`✅ Created: ${acc.email} [${acc.role}]`);
    }

    console.log("\n🎉 Seed complete:");
    console.log("   superadmin@hireiq.com / SuperAdmin@123");
    console.log("   admin@hireiq.com      / Admin@123");
    console.log("   user@hireiq.com       / User@123\n");

  } catch (err) {
    console.error("❌ Seed failed:", err.message);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

seed();