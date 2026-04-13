/**
 * videoAnalysisService.js — Calibrated video/audio analysis
 * Fixes: was giving high scores always; now uses realistic thresholds
 */

// ── CONFIDENCE WORD LISTS ─────────────────────────────────────────────────────
const FILLER_WORDS     = ["um","uh","like","you know","basically","literally","kind of","sort of","i mean","right","okay so","so yeah","well","actually"];
const CONFIDENCE_WORDS = ["experience","achieved","led","developed","built","designed","implemented","managed","delivered","improved","increased","reduced","created","launched","mentored","collaborated","solved","optimized"];
const WEAK_PHRASES     = ["i think maybe","i'm not sure","i guess","probably","might","i don't know","hopefully","try to","i'll try","sort of thing"];
const STRONG_PHRASES   = ["i successfully","i achieved","i led","i built","i delivered","my approach","my solution","i implemented","i increased","i reduced","i improved","i created","i launched","my experience with"];

// ── COUNT OCCURRENCES ─────────────────────────────────────────────────────────
function countOccurrences(text, list) {
  const t = text.toLowerCase();
  return list.reduce((acc, phrase) => {
    const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const matches = (t.match(new RegExp(escaped, "g")) || []).length;
    return acc + matches;
  }, 0);
}

// ── ANALYZE TRANSCRIPT ────────────────────────────────────────────────────────
function analyzeTranscript(transcript) {
  if (!transcript || transcript.trim().length < 20) {
    return { score: 0, error: "Transcript too short or empty" };
  }

  const words       = transcript.trim().split(/\s+/).filter(Boolean);
  const wordCount   = words.length;
  const sentences   = transcript.split(/[.!?]+/).filter(s => s.trim().length > 3);
  const sentCount   = sentences.length;
  const avgWordsSent= sentCount > 0 ? wordCount / sentCount : 0;

  const fillerCount    = countOccurrences(transcript, FILLER_WORDS);
  const confCount      = countOccurrences(transcript, CONFIDENCE_WORDS);
  const weakCount      = countOccurrences(transcript, WEAK_PHRASES);
  const strongCount    = countOccurrences(transcript, STRONG_PHRASES);

  // Filler rate per 100 words
  const fillerRate = wordCount > 0 ? (fillerCount / wordCount) * 100 : 0;

  // ── FLUENCY (25 pts) ──────────────────────────────────────────────────────
  // Penalize heavily for high filler rate
  let fluency = 25;
  if (fillerRate > 15)      fluency = 5;
  else if (fillerRate > 10) fluency = 10;
  else if (fillerRate > 7)  fluency = 15;
  else if (fillerRate > 4)  fluency = 20;
  // Penalize very short or very long sentences
  if (avgWordsSent < 5 || avgWordsSent > 35) fluency = Math.max(5, fluency - 5);

  // ── CONFIDENCE (25 pts) ───────────────────────────────────────────────────
  let confidence = 10; // start low — must earn it
  confidence += Math.min(10, confCount * 2);
  confidence += Math.min(8,  strongCount * 3);
  confidence -= Math.min(8,  weakCount * 2);
  confidence  = Math.max(2, Math.min(25, confidence));

  // ── CONTENT QUALITY (25 pts) ──────────────────────────────────────────────
  let content = 5; // start low
  // Reward for word count (shows depth of answer)
  if (wordCount > 300) content += 8;
  else if (wordCount > 150) content += 5;
  else if (wordCount > 80)  content += 2;
  // Reward for sentence variety
  if (sentCount > 8)  content += 5;
  else if (sentCount > 4) content += 2;
  // Reward for specific examples/achievements
  const hasNumbers = /\d+/.test(transcript);
  if (hasNumbers) content += 5;
  content += Math.min(5, confCount);
  content  = Math.min(25, content);

  // ── CLARITY (25 pts) ─────────────────────────────────────────────────────
  let clarity = 10;
  // Penalize incoherence (very short sentences mixed with fillers)
  if (fillerRate < 3 && avgWordsSent > 8 && avgWordsSent < 25) clarity = 25;
  else if (fillerRate < 6 && avgWordsSent > 6)  clarity = 20;
  else if (fillerRate < 10) clarity = 15;
  else clarity = Math.max(3, 10 - Math.floor(fillerRate));

  const rawScore  = fluency + confidence + content + clarity;
  // Hard cap at 92 — nobody gets 100 on video analysis
  const totalScore = Math.min(92, rawScore);

  const grade = totalScore >= 80 ? "Excellent"
    : totalScore >= 65 ? "Good"
    : totalScore >= 50 ? "Average"
    : "Needs Improvement";

  // ── FEEDBACK ─────────────────────────────────────────────────────────────
  const feedback = [];
  const strengths = [];

  if (fillerRate > 7)
    feedback.push(`High filler word usage (${Math.round(fillerRate)}% of speech) — practice reducing "um", "uh", "like"`);
  else
    strengths.push("Good control of filler words — speech sounds clean");

  if (confCount > 3 || strongCount > 1)
    strengths.push("Used confident, action-oriented language effectively");
  else
    feedback.push("Use stronger action verbs: 'I led', 'I built', 'I achieved'");

  if (weakCount > 2)
    feedback.push(`Reduce uncertain phrases like "I think maybe", "I'm not sure" — they undermine confidence`);

  if (wordCount < 80)
    feedback.push("Answer was too brief — give more detail and examples");
  else if (wordCount > 100)
    strengths.push("Good answer length — showed depth");

  if (hasNumbers)
    strengths.push("Used specific numbers and metrics — very effective");
  else
    feedback.push("Add specific numbers or metrics to strengthen answers (e.g. 'increased by 30%')");

  if (avgWordsSent > 30)
    feedback.push("Break long sentences into shorter, clearer ones");

  return {
    score: totalScore,
    grade,
    breakdown: {
      fluency,     // /25
      confidence,  // /25
      contentQuality: content, // /25
      clarity,     // /25
    },
    metrics: {
      wordCount,
      sentenceCount: sentCount,
      avgWordsPerSentence: Math.round(avgWordsSent * 10) / 10,
      fillerWordCount: fillerCount,
      fillerRate: Math.round(fillerRate * 10) / 10,
      confidenceWordCount: confCount,
      strongPhraseCount: strongCount,
      weakPhraseCount: weakCount,
      hasQuantifiedExamples: hasNumbers,
    },
    feedback: feedback.slice(0, 4),
    strengths: strengths.slice(0, 3),
    detectedFillers: FILLER_WORDS.filter(f => transcript.toLowerCase().includes(f)).slice(0, 6),
  };
}

// ── FRAME / VISUAL ANALYSIS (without actual CV model) ────────────────────────
// In production replace with real computer vision. This gives realistic scores
// based on passed-in metadata (eye contact time, face detection, etc.)
function analyzeVideoFrames({
  faceDetectedPercent = 0,   // 0–100: % of frames face was detected
  eyeContactPercent   = 0,   // 0–100: % of time maintaining eye contact
  lightingScore       = 0,   // 0–10: quality of lighting
  backgroundScore     = 0,   // 0–10: clean background
  stabilityScore      = 0,   // 0–10: camera stability
} = {}) {
  let score = 0;

  // Face detection (20 pts)
  score += Math.round((faceDetectedPercent / 100) * 20);
  // Eye contact (25 pts)
  score += Math.round((eyeContactPercent / 100) * 25);
  // Lighting (20 pts)
  score += Math.round((lightingScore / 10) * 20);
  // Background (15 pts)
  score += Math.round((backgroundScore / 10) * 15);
  // Stability (20 pts)
  score += Math.round((stabilityScore / 10) * 20);

  return {
    score:   Math.min(90, score),
    metrics: { faceDetectedPercent, eyeContactPercent, lightingScore, backgroundScore, stabilityScore },
  };
}

// ── COMBINED ANALYSIS ─────────────────────────────────────────────────────────
function analyzeVideo({ transcript = "", videoMetrics = {} } = {}) {
  const transcriptResult = analyzeTranscript(transcript);
  const videoResult      = analyzeVideoFrames(videoMetrics);

  // If no video metrics provided, use only transcript
  const hasVideoMetrics = Object.keys(videoMetrics).length > 0;
  const finalScore = hasVideoMetrics
    ? Math.round(transcriptResult.score * 0.6 + videoResult.score * 0.4)
    : transcriptResult.score;

  return {
    overallScore: Math.min(92, finalScore),
    transcript:   transcriptResult,
    video:        hasVideoMetrics ? videoResult : null,
    recommendation:
      finalScore >= 80 ? "Strong candidate — recommend advancing"
      : finalScore >= 65 ? "Good candidate — worth interviewing"
      : finalScore >= 50 ? "Average — review resume and schedule screening"
      : "Weak performance — consider other candidates",
  };
}

module.exports = { analyzeVideo, analyzeTranscript, analyzeVideoFrames };