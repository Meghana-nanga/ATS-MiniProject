const express   = require("express");
const mongoose  = require("mongoose");
const cors      = require("cors");
const helmet    = require("helmet");
const morgan    = require("morgan");
const rateLimit = require("express-rate-limit");
const path      = require("path");
require("dotenv").config();

const app = express();
const superAdminRoutes = require("./routes/superAdminRoutes");
const adminRoutes = require("./routes/adminRoutes");


// ── Middleware ─────────────────────────

app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:3000",
  credentials: true
}));

app.use(morgan("dev"));

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

app.use(
  "/uploads",
  express.static(path.join(__dirname, "uploads"))
);

// Rate limiter
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200
});

app.use("/api/", limiter);

// ── Routes ─────────────────────────

app.use("/api/user", require("./routes/userRoutes"));
app.use("/api/auth", require("./routes/auth"));
app.use("/api/resume", require("./routes/resume"));
app.use("/api/admin", require("./routes/admin"));
app.use("/api/analytics", require("./routes/analytics"));
app.use("/api/superadmin", require("./routes/superAdmin"));
app.use("/api/jobs",      require("./routes/jobs"));
app.use("/api/super-admin", superAdminRoutes);
app.use("/api/admin", adminRoutes);

// Health check

app.get("/api/health", (req, res) =>
  res.json({
    status: "ok",
    time: new Date()
  })
);

// 404 handler

app.use((req, res) =>
  res.status(404).json({
    success: false,
    message: "Route not found: " + req.originalUrl
  })
);

// Error handler

app.use((err, req, res, next) => {

  console.error("❌ Error:", err.message);

  res.status(err.status || 500).json({
    success: false,
    message: err.message || "Server Error"
  });

});

// ── MongoDB Connect + Auto Seed ─────────────────────────

mongoose.connect(process.env.MONGO_URI)

.then(async () => {

  console.log("✅ MongoDB connected");

  const User = require("./models/User");

  const accounts = [
    {
      name: "Super Admin",
      email: "superadmin@hireiq.com",
      password: "SuperAdmin@123",
      role: "superadmin",
      status: "Active"
    },
    {
      name: "HR Admin",
      email: "admin@hireiq.com",
      password: "Admin@123",
      role: "admin",
      status: "Active"
    }
  ];

  for (const acc of accounts) {
    const exists = await User.findOne({ email: acc.email });

    if (!exists) {
      // Let the pre('save') hook handle hashing — do NOT hash manually here
      await User.create(acc);
      console.log("✅ Seeded:", acc.email);
    } else {
      // Fix existing accounts that may have been double-hashed
      // Re-save with plain password so the pre('save') hook hashes it correctly
      exists.password = acc.password;
      await exists.save();
    }
  }

  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () =>
    console.log("🚀 Server running on http://localhost:" + PORT)
  );

})

.catch(err => {

  console.error(
    "❌ MongoDB connection failed:",
    err.message
  );

  process.exit(1);

});