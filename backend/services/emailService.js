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

module.exports = { sendShortlistEmail };