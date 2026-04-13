const jwt  = require("jsonwebtoken");
const User = require("../models/User");

exports.protect = async (req, res, next) => {
  try {
    const header = req.headers.authorization;
    if (!header || !header.startsWith("Bearer "))
      return res.status(401).json({ success: false, message: "No token — please log in" });
    const token   = header.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user    = await User.findById(decoded.id).select("-password");
    if (!user)        return res.status(401).json({ success: false, message: "User not found" });
    if (!user.isActive) return res.status(403).json({ success: false, message: "Account is disabled" });
    req.user = user;
    next();
  } catch {
    res.status(401).json({ success: false, message: "Invalid or expired token" });
  }
};

// HR Admin OR Super Admin
exports.admin = (req, res, next) => {
  if (req.user?.role === "admin" || req.user?.role === "superadmin") return next();
  res.status(403).json({ success: false, message: "Admin access required" });
};

// Super Admin only
exports.superadmin = (req, res, next) => {
  if (req.user?.role === "superadmin") return next();
  res.status(403).json({ success: false, message: "Super Admin access required" });
};