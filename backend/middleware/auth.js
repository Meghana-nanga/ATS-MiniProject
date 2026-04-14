const jwt  = require("jsonwebtoken");
const User = require("../models/User");

// protect middleware
const protect = async (req, res, next) => {
  try {
    const header = req.headers.authorization;
    if (!header || !header.startsWith("Bearer "))
      return res.status(401).json({ success: false, message: "No token — please log in" });

    const token   = header.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user    = await User.findById(decoded.id).select("-password");

    if (!user) return res.status(401).json({ success: false, message: "User not found" });
    if (!user.isActive) return res.status(403).json({ success: false, message: "Account is disabled" });

    req.user = user;
    next();
  } catch {
    res.status(401).json({ success: false, message: "Invalid or expired token" });
  }
};

const admin = (req, res, next) => {
  if (req.user?.role === "admin" || req.user?.role === "superadmin") return next();
  res.status(403).json({ success: false, message: "Admin access required" });
};

const superadmin = (req, res, next) => {
  if (req.user?.role === "superadmin") return next();
  res.status(403).json({ success: false, message: "Super Admin access required" });
};

const adminOnly = (req, res, next) => {
  if (req.user.role !== "admin" && req.user.role !== "superadmin") {
    return res.status(403).json({
      success: false,
      message: "Admin access required"
    });
  }
  next();
};

module.exports = { protect, admin, superadmin, adminOnly };