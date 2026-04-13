const OPENERS = {
  Professional: (r,c) => `I am writing to express my strong interest in the ${r} position at ${c}. With a proven track record in software engineering, I am confident I can add immediate value to your team.`,
  Enthusiastic: (r,c) => `When I discovered the ${r} opening at ${c}, I knew immediately this was the role I had been building toward. Your culture of innovation and engineering excellence is exactly where I thrive.`,
  Concise:      (r,c) => `I am applying for the ${r} role at ${c}. My background and technical skills make me a strong fit.`,
  Creative:     (r,c) => `Great engineering is equal parts craft and curiosity. The ${r} opportunity at ${c} sits perfectly at that intersection — and that is where I do my best work.`,
};
const CLOSERS = {
  Professional: (n)   => `I would welcome the opportunity to discuss how my experience aligns with your goals.\n\nSincerely,\n${n}`,
  Enthusiastic: (n,c) => `I am genuinely excited about the possibility of joining ${c} and would love to connect.\n\nWith enthusiasm,\n${n}`,
  Concise:      (n)   => `Happy to chat at your convenience.\n\nBest,\n${n}`,
  Creative:     (n)   => `Let us build something great together.\n\nCreatively,\n${n}`,
};

function generateCoverLetter({ name, company, role, tone="Professional", skills=[], achievements="" }) {
  const t  = OPENERS[tone] ? tone : "Professional";
  const sl = Array.isArray(skills) ? skills.join(", ") : skills;
  const dt = new Date().toLocaleDateString("en-US",{ year:"numeric", month:"long", day:"numeric" });
  return `${dt}\n\nDear Hiring Team at ${company},\n\n${OPENERS[t](role,company)}\n\nOver the past several years I have specialized in ${sl||"software engineering"}, consistently delivering high-quality results in collaborative environments. ${achievements ? "Key highlights: "+achievements+"." : "I have built production systems serving thousands of users and contributed to technical architecture and team processes."}\n\n${sl ? `My core competencies — ${sl} — directly match the requirements you outlined. I write clean, maintainable code and communicate clearly across technical and non-technical stakeholders.` : "I bring strong technical fundamentals and a product-minded engineering approach."}\n\nWhat draws me to ${company} is your commitment to building products that genuinely matter. I am eager to contribute to a team that values both technical rigor and creative problem-solving.\n\n${CLOSERS[t](name,company)}`;
}

module.exports = { generateCoverLetter };
