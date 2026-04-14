const express   = require("express");
const mongoose  = require("mongoose");
const cors      = require("cors");
const helmet    = require("helmet");
const morgan    = require("morgan");
const rateLimit = require("express-rate-limit");
const path      = require("path");
require("dotenv").config();

const app = express();

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
app.use("/api/interview", require("./routes/interview"));

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
  const bcrypt = require("bcryptjs");

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

    const exists =
      await User.findOne({ email: acc.email });

    if (!exists) {

      const hashed =
        await bcrypt.hash(acc.password, 12);

      await User.create({
        ...acc,
        password: hashed
      });

      console.log("✅ Seeded:", acc.email);

    }

  }

  const PORT =
    process.env.PORT || 5000;

  app.listen(PORT, () =>

    console.log(
      "🚀 Server running on http://localhost:" + PORT
    )

  );

})

.catch(err => {

  console.error(
    "❌ MongoDB connection failed:",
    err.message
  );

  process.exit(1);

});