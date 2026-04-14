const jwt  = require("jsonwebtoken");
const User = require("../models/User");

const sign = (id) => require("jsonwebtoken").sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRE });

exports.register = async (req, res) => {
  try {
    const { name, email, password, targetRole } = req.body;
    if (!name || !email || !password) return res.status(400).json({ success: false, message: "Name, email and password required" });
    if (await User.findOne({ email })) return res.status(400).json({ success: false, message: "Email already registered" });
    const user = await User.create({ name, email, password, targetRole, status: "New" });
    res.status(201).json({ success: true, token: sign(user._id), user: user.toPublic() });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ success: false, message: "Email and password required" });
    const user = await User.findOne({ email }).select("+password");
    if (!user || !(await user.comparePassword(password))) return res.status(401).json({ success: false, message: "Invalid email or password" });
    if (!user.isActive) return res.status(403).json({ success: false, message: "Account suspended. Contact admin." });
    user.lastLogin = new Date();
    await user.save({ validateBeforeSave: false });
    res.json({ success: true, token: sign(user._id), user: user.toPublic() });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

exports.getMe = async (req, res) => res.json({ success: true, user: req.user.toPublic() });

exports.updateProfile = async (req, res) => {
  try {
    const fields = ["name","phone","location","linkedIn","github","jobTitle","targetRole"];
    const upd = {};
    fields.forEach(f => { if (req.body[f] !== undefined) upd[f] = req.body[f]; });
    const user = await User.findByIdAndUpdate(req.user._id, upd, { new: true, runValidators: true });
    res.json({ success: true, user: user.toPublic() });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};
