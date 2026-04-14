const Interview = require("../models/Interview");
const User      = require("../models/User");
const { sendInterviewEmail, sendHireEmail, sendRejectionEmail } = require("../services/emailService");

// ── Schedule Interview ────────────────────────────────────────────────────────
exports.scheduleInterview = async (req, res) => {
  try {
    const { candidateId, date, mode, location, round, notes, jobTitle } = req.body;
    if (!candidateId || !date) return res.status(400).json({ success:false, message:"candidateId and date are required" });

    const candidate = await User.findById(candidateId);
    if (!candidate) return res.status(404).json({ success:false, message:"Candidate not found" });

    const interview = await Interview.create({
      candidate: candidateId,
      scheduledBy: req.user._id,
      date: new Date(date),
      mode: mode || "Video Call",
      location: location || "",
      round: round || "HR Round",
      notes: notes || "",
      jobTitle: jobTitle || candidate.targetRole || "Open Position",
    });

    // Update candidate status to Shortlisted if not already
    if (!["Shortlisted","Under Review"].includes(candidate.status)) {
      await User.findByIdAndUpdate(candidateId, { status: "Shortlisted", interviewDate: new Date(date) });
    } else {
      await User.findByIdAndUpdate(candidateId, { interviewDate: new Date(date) });
    }

    // Send interview scheduled email
    await sendInterviewEmail({
      candidateName:  candidate.name,
      candidateEmail: candidate.email,
      jobTitle:       interview.jobTitle,
      hrName:         req.user.name || "HR Team",
      date:           new Date(date),
      mode:           interview.mode,
      location:       interview.location,
      round:          interview.round,
      notes:          interview.notes,
    });

    const populated = await interview.populate("candidate", "name email targetRole");
    res.status(201).json({ success:true, interview: populated });
  } catch (err) {
    res.status(500).json({ success:false, message: err.message });
  }
};

// ── Get All Interviews (for HR dashboard) ─────────────────────────────────────
exports.getInterviews = async (req, res) => {
  try {
    const { status, candidateId } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (candidateId) filter.candidate = candidateId;

    const interviews = await Interview.find(filter)
      .populate("candidate", "name email targetRole lastAtsScore status")
      .populate("scheduledBy", "name email")
      .sort("-date")
      .limit(100);

    res.json({ success:true, interviews });
  } catch (err) {
    res.status(500).json({ success:false, message: err.message });
  }
};

// ── Get Interviews for a specific candidate ────────────────────────────────────
exports.getCandidateInterviews = async (req, res) => {
  try {
    const interviews = await Interview.find({ candidate: req.params.candidateId })
      .populate("scheduledBy", "name email")
      .sort("-date");
    res.json({ success:true, interviews });
  } catch (err) {
    res.status(500).json({ success:false, message: err.message });
  }
};

// ── Update Interview (reschedule / cancel) ────────────────────────────────────
exports.updateInterview = async (req, res) => {
  try {
    const { date, mode, location, round, notes, status } = req.body;
    const interview = await Interview.findById(req.params.id).populate("candidate","name email targetRole");
    if (!interview) return res.status(404).json({ success:false, message:"Interview not found" });

    if (date)     interview.date     = new Date(date);
    if (mode)     interview.mode     = mode;
    if (location !== undefined) interview.location = location;
    if (round)    interview.round    = round;
    if (notes !== undefined) interview.notes = notes;
    if (status)   interview.status   = status;
    await interview.save();

    if (status === "Rescheduled" && date) {
      await User.findByIdAndUpdate(interview.candidate._id, { interviewDate: new Date(date) });
      await sendInterviewEmail({
        candidateName:  interview.candidate.name,
        candidateEmail: interview.candidate.email,
        jobTitle:       interview.jobTitle,
        hrName:         req.user.name || "HR Team",
        date:           new Date(date),
        mode:           interview.mode,
        location:       interview.location,
        round:          interview.round,
        notes:          "Your interview has been rescheduled. " + (interview.notes || ""),
        isReschedule:   true,
      });
    }

    res.json({ success:true, interview });
  } catch (err) {
    res.status(500).json({ success:false, message: err.message });
  }
};

// ── Record Outcome: Hire or Reject ────────────────────────────────────────────
exports.recordOutcome = async (req, res) => {
  try {
    const { outcome, offerDetails, notes } = req.body;
    if (!["Hired","Rejected","Next Round"].includes(outcome))
      return res.status(400).json({ success:false, message:"outcome must be Hired, Rejected, or Next Round" });

    const interview = await Interview.findById(req.params.id).populate("candidate","name email targetRole");
    if (!interview) return res.status(404).json({ success:false, message:"Interview not found" });

    interview.outcome      = outcome;
    interview.status       = "Completed";
    if (offerDetails) interview.offerDetails = offerDetails;
    if (notes)        interview.notes        = notes;
    await interview.save();

    const candidate = interview.candidate;
    const newStatus = outcome === "Hired" ? "Active" : outcome === "Rejected" ? "Rejected" : "Shortlisted";
    await User.findByIdAndUpdate(candidate._id, { status: newStatus });

    // Send appropriate email
    if (outcome === "Hired") {
      await sendHireEmail({
        candidateName:  candidate.name,
        candidateEmail: candidate.email,
        jobTitle:       interview.jobTitle,
        hrName:         req.user.name || "HR Team",
        offerDetails:   offerDetails || "",
        notes:          notes || "",
      });
    } else if (outcome === "Rejected") {
      await sendRejectionEmail({
        candidateName:  candidate.name,
        candidateEmail: candidate.email,
        jobTitle:       interview.jobTitle,
        hrName:         req.user.name || "HR Team",
        notes:          notes || "",
      });
    } else if (outcome === "Next Round") {
      // Next round: schedule treated as new interview nudge
      await sendInterviewEmail({
        candidateName:  candidate.name,
        candidateEmail: candidate.email,
        jobTitle:       interview.jobTitle,
        hrName:         req.user.name || "HR Team",
        date:           null,
        mode:           "TBD",
        location:       "",
        round:          "Next Round",
        notes:          "Congratulations — you've been selected for the next round! HR will confirm the schedule shortly. " + (notes || ""),
        isNextRound:    true,
      });
    }

    res.json({ success:true, interview, emailSent:true });
  } catch (err) {
    res.status(500).json({ success:false, message: err.message });
  }
};

// ── Get MY interviews (user-facing) ───────────────────────────────────────────
exports.getMyInterviews = async (req, res) => {
  try {
    const interviews = await Interview.find({ candidate: req.user._id })
      .populate("scheduledBy","name email")
      .sort("-date");
    res.json({ success:true, interviews });
  } catch (err) {
    res.status(500).json({ success:false, message: err.message });
  }
};