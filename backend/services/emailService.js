const nodemailer = require("nodemailer");

// Cached transporter so we don't create a new Ethereal account every call
let _transporter = null;

async function getTransporter() {
  if (_transporter) return _transporter;

  const hasRealCreds =
    process.env.EMAIL_USER &&
    process.env.EMAIL_USER !== "your_gmail@gmail.com" &&
    process.env.EMAIL_PASS;

  if (hasRealCreds) {
    _transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });
    console.log("📧 Email: using Gmail →", process.env.EMAIL_USER);
  } else {
    // Ethereal: free dev SMTP — shows a preview URL in the console
    const testAccount = await nodemailer.createTestAccount();
    _transporter = nodemailer.createTransport({
      host:   "smtp.ethereal.email",
      port:   587,
      secure: false,
      auth: { user: testAccount.user, pass: testAccount.pass },
    });
    console.log("\n📧 Email: using Ethereal dev account:", testAccount.user);
    console.log("   (No real emails sent — you'll get a preview URL per email)\n");
  }

  return _transporter;
}

async function sendShortlistEmail({
  candidateName,
  candidateEmail,
  jobTitle,
  hrName,
  companyName,
  interviewDetails,
  notes,
}) {
  if (!candidateEmail) {
    console.error("❌ sendShortlistEmail: no candidateEmail provided");
    return { success: false, error: "No candidate email address" };
  }

  const subject = `🎉 You've been Shortlisted for ${jobTitle} at ${companyName || "HireIQ"}`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1.0"/>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#F4F3EF;color:#0C0D10}
.wrap{max-width:600px;margin:32px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.08)}
.hd{background:linear-gradient(135deg,#1B5EEA,#1347C4);padding:40px 48px;text-align:center}
.logo{font-size:28px;font-weight:700;color:#fff;letter-spacing:-.5px}
.badge{display:inline-block;background:rgba(255,255,255,.15);color:#fff;font-size:13px;font-weight:600;padding:8px 20px;border-radius:999px;margin-top:16px;border:1px solid rgba(255,255,255,.3)}
.body{padding:48px}
.greeting{font-size:22px;font-weight:700;margin-bottom:12px}
.intro{font-size:15px;color:#64748B;line-height:1.7;margin-bottom:28px}
.hl{background:#EBF2FF;border:1px solid #BFCFFD;border-radius:12px;padding:24px 28px;margin-bottom:28px}
.hl-label{font-size:11px;font-weight:700;color:#1347C4;text-transform:uppercase;letter-spacing:1px;margin-bottom:6px}
.hl-value{font-size:20px;font-weight:700;color:#1B5EEA}
.sec-title{font-size:12px;font-weight:700;color:#94A3B8;text-transform:uppercase;letter-spacing:1px;margin:28px 0 14px}
.step{display:flex;align-items:flex-start;gap:12px;padding:12px 0;border-bottom:1px solid #F0EFE9}
.step:last-child{border-bottom:none}
.ico{font-size:16px;flex-shrink:0;width:24px}
.lbl{font-size:12px;color:#94A3B8;font-weight:600;margin-bottom:3px}
.val{font-size:14px;color:#0C0D10;font-weight:500}
.note{background:#FFFBEB;border:1px solid #FDE68A;border-radius:12px;padding:18px 22px;margin:20px 0}
.btn{display:inline-block;background:#1B5EEA;color:#fff;text-decoration:none;font-size:15px;font-weight:600;padding:14px 36px;border-radius:999px}
.ft{background:#F8F7F3;border-top:1px solid #E2E1DA;padding:28px 48px;text-align:center;font-size:12.5px;color:#94A3B8;line-height:1.7}
</style>
</head>
<body>
<div class="wrap">
  <div class="hd">
    <div class="logo">HireIQ</div>
    <div class="badge">🎉 Congratulations — You're Shortlisted!</div>
  </div>
  <div class="body">
    <div class="greeting">Congratulations, ${candidateName}!</div>
    <p class="intro">Your application stood out and our hiring team is excited to move forward with you for the position below.</p>
    <div class="hl">
      <div class="hl-label">Position</div>
      <div class="hl-value">${jobTitle}</div>
      ${companyName ? `<div style="font-size:14px;color:#4F46E5;margin-top:4px;font-weight:500">at ${companyName}</div>` : ""}
    </div>
    <div class="sec-title">What happens next</div>
    <div class="step"><div class="ico">📧</div><div><div class="lbl">Step 1</div><div class="val">HR will reach out within 2 business days to confirm your availability.</div></div></div>
    <div class="step"><div class="ico">📅</div><div><div class="lbl">Step 2</div><div class="val">An interview will be scheduled at a convenient time for you.</div></div></div>
    <div class="step"><div class="ico">✅</div><div><div class="lbl">Step 3</div><div class="val">Come prepared to discuss your experience, skills, and contributions.</div></div></div>
    ${interviewDetails ? `
    <div class="sec-title">Interview Details</div>
    <div class="step"><div class="ico">🗓️</div><div><div class="lbl">Scheduled for</div><div class="val">${interviewDetails}</div></div></div>
    ` : ""}
    ${notes ? `
    <div class="note">
      <div style="font-size:11px;font-weight:700;color:#92400E;margin-bottom:6px;text-transform:uppercase;letter-spacing:1px">Note from HR</div>
      <div style="font-size:13.5px;color:#374151;line-height:1.65">${notes}</div>
    </div>` : ""}
    <div style="text-align:center;margin:36px 0">
      <a href="${process.env.FRONTEND_URL || "http://localhost:3000"}/dashboard" class="btn">View Your Dashboard →</a>
    </div>
    <p style="font-size:13.5px;color:#64748B;line-height:1.7">If you have any questions, reply to this email and our HR team will assist you.</p>
    <p style="font-size:13.5px;color:#64748B;line-height:1.7;margin-top:16px">
      Warm regards,<br>
      <strong style="color:#0C0D10">${hrName || "The HireIQ Team"}</strong><br>
      ${companyName || "HireIQ Hiring Team"}
    </p>
  </div>
  <div class="ft">HireIQ — Talent Intelligence Platform<br>This email was sent because you applied through HireIQ.</div>
</div>
</body></html>`;

  const text = `Congratulations, ${candidateName}!\n\nYou have been shortlisted for: ${jobTitle}${companyName ? ` at ${companyName}` : ""}\n\nNext steps:\n1. HR will reach out within 2 business days\n2. Interview will be scheduled\n3. Come prepared to discuss your experience\n\n${interviewDetails ? `Interview: ${interviewDetails}\n` : ""}${notes ? `Note from HR: ${notes}\n` : ""}\nBest regards,\n${hrName || "The HireIQ Team"}`;

  try {
    const transporter = await getTransporter();
    const from = process.env.EMAIL_USER && process.env.EMAIL_USER !== "your_gmail@gmail.com"
      ? `"HireIQ Hiring" <${process.env.EMAIL_USER}>`
      : '"HireIQ Hiring" <noreply@hireiq.com>';

    const info = await transporter.sendMail({ from, to: candidateEmail, subject, text, html });

    const previewUrl = nodemailer.getTestMessageUrl(info);
    if (previewUrl) {
      console.log("\n📧 ✅ Email preview (Ethereal):");
      console.log("   👉", previewUrl, "\n");
    } else {
      console.log("📧 ✅ Email sent to:", candidateEmail, "| ID:", info.messageId);
    }

    return { success: true, messageId: info.messageId, previewUrl: previewUrl || null };
  } catch (err) {
    console.error("❌ Email failed:", err.message);
    return { success: false, error: err.message };
  }
}


// ── Interview Scheduled Email ─────────────────────────────────────────────────
async function sendInterviewEmail({ candidateName, candidateEmail, jobTitle, hrName, date, mode, location, round, notes, isReschedule, isNextRound }) {
  if (!candidateEmail) return { success:false, error:"No email" };
  const dateStr = date ? new Date(date).toLocaleString("en-IN", { dateStyle:"full", timeStyle:"short" }) : "To be confirmed";
  const subject = isReschedule
    ? `📅 Interview Rescheduled — ${jobTitle} at HireIQ`
    : isNextRound
    ? `🎉 You've Advanced to the Next Round — ${jobTitle}`
    : `📅 Interview Scheduled — ${round} for ${jobTitle}`;

  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"/>
<style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#F4F3EF;color:#0C0D10}.wrap{max-width:600px;margin:32px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.08)}.hd{background:linear-gradient(135deg,#0891B2,#0C4A6E);padding:40px 48px;text-align:center}.logo{font-size:28px;font-weight:700;color:#fff}.badge{display:inline-block;background:rgba(255,255,255,.15);color:#fff;font-size:13px;font-weight:600;padding:8px 20px;border-radius:999px;margin-top:16px}.body{padding:48px}.detail-row{display:flex;gap:14px;padding:12px 0;border-bottom:1px solid #F0EFE9}.ico{font-size:18px;width:28px;flex-shrink:0}.lbl{font-size:11px;color:#94A3B8;font-weight:700;text-transform:uppercase;letter-spacing:.8px;margin-bottom:3px}.val{font-size:14px;font-weight:600;color:#0C0D10}.note{background:#EFF4FF;border:1px solid #BFCFFD;border-radius:12px;padding:18px 22px;margin:20px 0}.btn{display:inline-block;background:#0891B2;color:#fff;text-decoration:none;font-size:15px;font-weight:600;padding:14px 36px;border-radius:999px}.ft{background:#F8F7F3;border-top:1px solid #E2E1DA;padding:24px 48px;text-align:center;font-size:12px;color:#94A3B8}</style></head>
<body><div class="wrap">
  <div class="hd"><div class="logo">HireIQ</div><div class="badge">📅 ${isReschedule?"Interview Rescheduled":isNextRound?"Advanced to Next Round":"Interview Scheduled"}</div></div>
  <div class="body">
    <h2 style="font-size:22px;font-weight:700;margin-bottom:10px">${isNextRound?"Congratulations, "+candidateName+"! 🎉":"Hi "+candidateName+","}</h2>
    <p style="font-size:15px;color:#64748B;line-height:1.7;margin-bottom:28px">${isNextRound?"You have successfully cleared the previous round and have been selected for the next stage of the hiring process.":isReschedule?"Your interview has been rescheduled. Please note the updated details below.":"Your interview has been scheduled. Please find the details below and be prepared."}</p>
    <div style="background:#F0FDFA;border:1px solid #99F6E4;border-radius:12px;padding:24px 28px;margin-bottom:24px">
      <div style="font-size:11px;font-weight:700;color:#0F766E;text-transform:uppercase;letter-spacing:1px;margin-bottom:6px">Position</div>
      <div style="font-size:20px;font-weight:700;color:#0C4A6E">${jobTitle}</div>
      <div style="font-size:14px;color:#0891B2;margin-top:4px;font-weight:500">${round}</div>
    </div>
    ${!isNextRound ? `
    <div class="detail-row"><div class="ico">🗓️</div><div><div class="lbl">Date & Time</div><div class="val">${dateStr}</div></div></div>
    <div class="detail-row"><div class="ico">${mode==="Video Call"?"💻":mode==="Phone"?"📞":"🏢"}</div><div><div class="lbl">Mode</div><div class="val">${mode}</div></div></div>
    ${location ? `<div class="detail-row"><div class="ico">📍</div><div><div class="lbl">Location / Link</div><div class="val">${location}</div></div></div>` : ""}
    ` : ""}
    ${notes ? `<div class="note"><div style="font-size:11px;font-weight:700;color:#1347C4;margin-bottom:6px;text-transform:uppercase">Note from HR</div><p style="font-size:13.5px;color:#374151;line-height:1.65">${notes}</p></div>` : ""}
    <div style="background:#FFFBEB;border:1px solid #FDE68A;border-radius:12px;padding:18px 22px;margin:20px 0">
      <div style="font-size:11px;font-weight:700;color:#92400E;margin-bottom:8px;text-transform:uppercase">Preparation Tips</div>
      <ul style="font-size:13.5px;color:#374151;line-height:1.8;padding-left:18px">
        <li>Research the company and role thoroughly</li>
        <li>Prepare 2–3 examples of past projects and achievements</li>
        <li>Test your audio/video setup 15 minutes before the call</li>
        <li>Keep your resume and notes handy</li>
      </ul>
    </div>
    <div style="text-align:center;margin:32px 0"><a href="${process.env.FRONTEND_URL||"http://localhost:3000"}/dashboard" class="btn">View Dashboard →</a></div>
    <p style="font-size:13.5px;color:#64748B;line-height:1.7">Best of luck!<br><strong style="color:#0C0D10">${hrName||"The HireIQ Team"}</strong></p>
  </div>
  <div class="ft">HireIQ — Talent Intelligence Platform</div>
</div></body></html>`;

  try {
    const transporter = await getTransporter();
    const from = process.env.EMAIL_USER && process.env.EMAIL_USER !== "your_gmail@gmail.com"
      ? `"HireIQ Hiring" <${process.env.EMAIL_USER}>` : '"HireIQ Hiring" <noreply@hireiq.com>';
    const info = await transporter.sendMail({ from, to: candidateEmail, subject, html, text: `Hi ${candidateName},\n\nInterview scheduled.\nPosition: ${jobTitle}\nRound: ${round}\nDate: ${dateStr}\nMode: ${mode}\n${location?"Location: "+location+"\n":""}\n${notes?"Note: "+notes+"\n":""}\nBest,\n${hrName}` });
    const previewUrl = nodemailer.getTestMessageUrl(info);
    if (previewUrl) console.log("📧 Interview email preview:", previewUrl);
    return { success:true, previewUrl: previewUrl||null };
  } catch(err) {
    console.error("❌ Interview email failed:", err.message);
    return { success:false, error: err.message };
  }
}

// ── Hire Offer Email ──────────────────────────────────────────────────────────
async function sendHireEmail({ candidateName, candidateEmail, jobTitle, hrName, offerDetails, notes }) {
  if (!candidateEmail) return { success:false, error:"No email" };
  const subject = `🎊 Offer Letter — Congratulations ${candidateName}! You're Hired for ${jobTitle}`;
  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"/>
<style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#F4F3EF}.wrap{max-width:600px;margin:32px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.08)}.hd{background:linear-gradient(135deg,#059669,#065F46);padding:48px;text-align:center}.logo{font-size:28px;font-weight:700;color:#fff}.badge{display:inline-block;background:rgba(255,255,255,.2);color:#fff;font-size:14px;font-weight:700;padding:10px 24px;border-radius:999px;margin-top:16px;border:1px solid rgba(255,255,255,.3)}.body{padding:48px}.confetti{font-size:48px;text-align:center;margin-bottom:20px}.title{font-size:26px;font-weight:800;text-align:center;margin-bottom:12px;color:#065F46}.subtitle{font-size:15px;color:#64748B;text-align:center;line-height:1.7;margin-bottom:32px}.offer-box{background:linear-gradient(135deg,#ECFDF5,#D1FAE5);border:2px solid #6EE7B7;border-radius:16px;padding:28px;margin-bottom:24px}.offer-title{font-size:12px;font-weight:700;color:#059669;text-transform:uppercase;letter-spacing:1px;margin-bottom:12px}.offer-role{font-size:24px;font-weight:800;color:#065F46;margin-bottom:8px}.detail{font-size:14px;color:#374151;line-height:1.8}.note{background:#F0FDF4;border:1px solid #86EFAC;border-radius:12px;padding:18px 22px;margin:20px 0}.btn{display:inline-block;background:#059669;color:#fff;text-decoration:none;font-size:15px;font-weight:700;padding:16px 40px;border-radius:999px}.ft{background:#F8F7F3;border-top:1px solid #E2E1DA;padding:24px 48px;text-align:center;font-size:12px;color:#94A3B8}</style></head>
<body><div class="wrap">
  <div class="hd"><div class="logo">HireIQ</div><div class="badge">🎊 Official Offer Letter</div></div>
  <div class="body">
    <div class="confetti">🎉</div>
    <div class="title">Congratulations, ${candidateName}!</div>
    <div class="subtitle">We are thrilled to offer you a position at our company. Your skills, dedication, and interview performance truly impressed our team.</div>
    <div class="offer-box">
      <div class="offer-title">Your Offer</div>
      <div class="offer-role">${jobTitle}</div>
      ${offerDetails ? `<div class="detail">${offerDetails.replace(/\n/g,"<br>")}</div>` : ""}
    </div>
    <div style="background:#F0FDF4;border:1px solid #86EFAC;border-radius:12px;padding:22px;margin-bottom:20px">
      <div style="font-size:12px;font-weight:700;color:#059669;text-transform:uppercase;letter-spacing:1px;margin-bottom:12px">Next Steps</div>
      <div style="display:flex;flex-direction:column;gap:8px">
        ${["Reply to confirm acceptance of this offer","HR will share your onboarding documents within 2 business days","Carry original documents on your joining date","Reach out for any queries — we're happy to help"].map((s,i)=>`<div style="display:flex;gap:10px;font-size:14px;color:#374151"><span style="font-weight:700;color:#059669">${i+1}.</span>${s}</div>`).join("")}
      </div>
    </div>
    ${notes ? `<div class="note"><div style="font-size:11px;font-weight:700;color:#059669;margin-bottom:6px;text-transform:uppercase">Additional Note</div><p style="font-size:13.5px;color:#374151;line-height:1.65">${notes}</p></div>` : ""}
    <div style="text-align:center;margin:32px 0"><a href="${process.env.FRONTEND_URL||"http://localhost:3000"}/dashboard" class="btn">🎊 Accept & View Dashboard</a></div>
    <p style="font-size:13.5px;color:#64748B;line-height:1.7;text-align:center">Welcome to the team!<br><strong style="color:#0C0D10">${hrName||"The HireIQ Team"}</strong></p>
  </div>
  <div class="ft">HireIQ — Talent Intelligence Platform · This is an official offer communication.</div>
</div></body></html>`;

  try {
    const transporter = await getTransporter();
    const from = process.env.EMAIL_USER && process.env.EMAIL_USER !== "your_gmail@gmail.com"
      ? `"HireIQ Hiring" <${process.env.EMAIL_USER}>` : '"HireIQ Hiring" <noreply@hireiq.com>';
    const info = await transporter.sendMail({ from, to: candidateEmail, subject, html, text: `Congratulations ${candidateName}!\n\nYou have been selected for ${jobTitle}.\n\n${offerDetails||""}\n\n${notes||""}\n\nBest,\n${hrName}` });
    const previewUrl = nodemailer.getTestMessageUrl(info);
    if (previewUrl) console.log("📧 Hire email preview:", previewUrl);
    return { success:true, previewUrl: previewUrl||null };
  } catch(err) {
    console.error("❌ Hire email failed:", err.message);
    return { success:false, error: err.message };
  }
}

// ── Rejection Email ───────────────────────────────────────────────────────────
async function sendRejectionEmail({ candidateName, candidateEmail, jobTitle, hrName, notes }) {
  if (!candidateEmail) return { success:false, error:"No email" };
  const subject = `Your Application Update — ${jobTitle} at HireIQ`;
  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"/>
<style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#F4F3EF}.wrap{max-width:600px;margin:32px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.08)}.hd{background:linear-gradient(135deg,#475569,#1E293B);padding:40px 48px;text-align:center}.logo{font-size:28px;font-weight:700;color:#fff}.badge{display:inline-block;background:rgba(255,255,255,.15);color:#fff;font-size:13px;font-weight:600;padding:8px 20px;border-radius:999px;margin-top:16px}.body{padding:48px}.ft{background:#F8F7F3;border-top:1px solid #E2E1DA;padding:24px 48px;text-align:center;font-size:12px;color:#94A3B8}</style></head>
<body><div class="wrap">
  <div class="hd"><div class="logo">HireIQ</div><div class="badge">Application Update</div></div>
  <div class="body">
    <h2 style="font-size:22px;font-weight:700;margin-bottom:12px">Dear ${candidateName},</h2>
    <p style="font-size:15px;color:#64748B;line-height:1.75;margin-bottom:20px">Thank you for taking the time to interview for the <strong>${jobTitle}</strong> position. We truly appreciate your interest and the effort you put into the process.</p>
    <p style="font-size:15px;color:#64748B;line-height:1.75;margin-bottom:20px">After careful consideration, we have decided to move forward with another candidate whose experience more closely aligns with our current needs. This was a difficult decision, as we had many strong applicants.</p>
    ${notes ? `<div style="background:#F8F7F3;border:1px solid #E2E1DA;border-radius:12px;padding:18px 22px;margin:20px 0"><div style="font-size:11px;font-weight:700;color:#64748B;margin-bottom:6px;text-transform:uppercase">Feedback</div><p style="font-size:13.5px;color:#374151;line-height:1.65">${notes}</p></div>` : ""}
    <div style="background:#EFF4FF;border:1px solid #BFCFFD;border-radius:12px;padding:22px;margin:24px 0">
      <div style="font-size:12px;font-weight:700;color:#1347C4;text-transform:uppercase;letter-spacing:1px;margin-bottom:10px">Keep Going — Tips for Your Next Application</div>
      <ul style="font-size:14px;color:#374151;line-height:1.9;padding-left:18px">
        <li>Keep your resume and ATS score updated on HireIQ</li>
        <li>Continue building skills in areas aligned with your target role</li>
        <li>Apply to other open positions — your profile remains active</li>
      </ul>
    </div>
    <p style="font-size:15px;color:#64748B;line-height:1.75;margin-bottom:8px">We wish you the very best in your career journey and encourage you to apply for future openings that match your profile.</p>
    <p style="font-size:13.5px;color:#64748B;line-height:1.7;margin-top:24px">Warm regards,<br><strong style="color:#0C0D10">${hrName||"The HireIQ Team"}</strong></p>
  </div>
  <div class="ft">HireIQ — Talent Intelligence Platform</div>
</div></body></html>`;

  try {
    const transporter = await getTransporter();
    const from = process.env.EMAIL_USER && process.env.EMAIL_USER !== "your_gmail@gmail.com"
      ? `"HireIQ Hiring" <${process.env.EMAIL_USER}>` : '"HireIQ Hiring" <noreply@hireiq.com>';
    const info = await transporter.sendMail({ from, to: candidateEmail, subject, html, text: `Dear ${candidateName},\n\nThank you for interviewing for ${jobTitle}. After careful consideration, we have decided to move forward with another candidate.\n\n${notes||""}\n\nBest wishes,\n${hrName}` });
    const previewUrl = nodemailer.getTestMessageUrl(info);
    if (previewUrl) console.log("📧 Rejection email preview:", previewUrl);
    return { success:true, previewUrl: previewUrl||null };
  } catch(err) {
    console.error("❌ Rejection email failed:", err.message);
    return { success:false, error: err.message };
  }
}

module.exports = { sendShortlistEmail, sendInterviewEmail, sendHireEmail, sendRejectionEmail };