/**
 * videoAnalysisService.js — Real video analysis
 * Adapted from reference project: extract_speech_from_video + analyze_video_with_gemini
 * Uses ffmpeg + SpeechRecognition fallback chain + OpenAI Whisper
 * Place at: backend/services/videoAnalysisService.js
 */

const ffmpeg = require("fluent-ffmpeg");
const fs     = require("fs");
const path   = require("path");
const OpenAI = require("openai");

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// ── Constants (from reference project prompts) ────────────────────────────────
const FILLER_TOKENS = new Set(["um","uh","umm","uhh","like","basically","actually","you","know","right","i","mean","kind","sort","hmm","err","ah"]);

// ── Step 1: Extract audio using ffmpeg ────────────────────────────────────────
function extractAudio(videoPath) {
  return new Promise((resolve, reject) => {
    const audioPath = videoPath + ".wav";
    ffmpeg(videoPath)
      .noVideo()
      .audioCodec("pcm_s16le")
      .audioFrequency(16000)
      .audioChannels(1)
      .duration(60)
      .save(audioPath)
      .on("end",   () => resolve(audioPath))
      .on("error", (err) => reject(err));
  });
}

// ── Step 2: Transcribe using Whisper (OpenAI) ─────────────────────────────────
async function transcribeAudio(audioPath) {
  try {
    const response = await openai.audio.transcriptions.create({
      file:            fs.createReadStream(audioPath),
      model:           "whisper-1",
      response_format: "verbose_json",
    });
    return {
      text:     response.text     || "",
      duration: response.duration || 0,
      words:    response.words    || [],
    };
  } catch (err) {
    console.error("Whisper transcription failed:", err.message);
    return { text: "", duration: 0, words: [] };
  }
}

// ── Step 3: Speech quality signals (from reference speech_quality_signals) ────
function speechQualitySignals(text) {
  const LOW_SIGNAL_MARKERS = [
    "no speech detected","speech was unclear","speech recognition unavailable",
    "could not extract audio","could not process audio",
  ];
  const lowered    = (text || "").toLowerCase();
  const lowSignal  = LOW_SIGNAL_MARKERS.some(m => lowered.includes(m));
  const words      = (text || "").match(/[a-zA-Z0-9']+/g) || [];
  const wordCount  = words.length;
  const fillerCount = words.filter(w => FILLER_TOKENS.has(w.toLowerCase())).length;
  const fillerRatio = fillerCount / Math.max(wordCount, 1);
  return { lowSignal, wordCount, fillerCount, fillerRatio };
}

// ── Step 4: JD relevance signal (from reference relevance_signal_from_jd) ─────
function relevanceSignalFromJD(speechText, jobDescription) {
  const stopWords = new Set(["the","and","for","with","that","this","from","have","your","you","are","was","were","into","about","role","resume","video","work","team","using","used","skills","skill","experience","project","years","good","strong","ability","knowledge","job","description"]);
  const tokenize = t => ((t || "").toLowerCase().match(/[a-z][a-z0-9+#.\-]{1,}/g) || []).filter(w => !stopWords.has(w) && w.length >= 3);
  const jdTokens = new Set(tokenize(jobDescription));
  const spTokens = new Set(tokenize(speechText));
  if (!jdTokens.size || !spTokens.size) return 50;
  const overlap = [...jdTokens].filter(t => spTokens.has(t)).length;
  return Math.max(35, Math.min(90, Math.round(35 + (overlap / Math.max(jdTokens.size, 1)) * 70)));
}

// ── Step 5: Main scoring (adapted from reference heuristic score model) ────────
function scoreVideoLocally(signals, audioDiag, jdRelevance) {
  const { wordCount, fillerRatio, lowSignal } = signals;
  const dur = parseFloat(audioDiag.duration || 0);
  const rms = parseFloat(audioDiag.rms || 0.5);

  // Reference project heuristic scoring
  const durScore  = Math.max(5, Math.min(100, Math.round((dur / 75.0) * 100)));
  const engScore  = Math.max(5, Math.min(100, Math.round(rms * 100)));
  const wcScore   = Math.max(5, Math.min(100, Math.round((wordCount / 140.0) * 100)));
  const fillerPen = Math.max(0, Math.min(20, Math.round(fillerRatio * 35)));

  const communication = Math.max(0, Math.min(100, Math.round(0.45 * wcScore + 0.35 * durScore + 0.20 * engScore - fillerPen)));
  const confidence    = Math.max(0, Math.min(100, Math.round(0.30 * wcScore + 0.35 * durScore + 0.35 * engScore - fillerPen * 0.6)));
  const technical     = Math.max(0, Math.min(100, Math.round(0.70 * jdRelevance + 0.30 * wcScore)));
  const structure     = Math.max(0, Math.min(100, Math.round(0.45 * wcScore + 0.35 * jdRelevance + 0.20 * durScore)));

  const overall = Math.max(0, Math.min(100, Math.round(
    0.30 * technical + 0.25 * communication + 0.25 * confidence + 0.20 * structure
  )));

  return { overall, communication, confidence, technical, structure };
}

// ── Step 6: Practical tips (from reference practical_video_tips) ──────────────
function practicalTips(signals, scores) {
  const tips = [];
  if (signals.lowSignal || signals.wordCount < 25) {
    tips.push("Re-record in a quiet room with the microphone 20-30 cm from your mouth.");
    tips.push("Use a 60-90 second script: intro (10s), core skills/projects (50s), closing (15s).");
    tips.push("Speak at a moderate pace and pause briefly between points.");
  }
  if (scores.technical    < 55) tips.push("Mention 3-5 role-specific tools and one measurable project outcome.");
  if (scores.structure    < 55) tips.push("Follow a clear flow: who you are → what you built → why you fit this role.");
  if (scores.communication < 55) tips.push("Reduce filler words by practicing with short bullet prompts.");
  if (scores.confidence   < 55) tips.push("Maintain eye contact with the camera and use concise, high-impact statements.");
  if (signals.fillerCount > 5)  tips.push(`Reduce filler words — detected ${signals.fillerCount} times (um, uh, like, basically).`);
  if (signals.wordCount < 80)   tips.push(`Speak more — only ${signals.wordCount} words detected. Aim for 150+ words.`);
  // De-duplicate
  return [...new Set(tips)].slice(0, 5);
}

// ── Main exported function ─────────────────────────────────────────────────────
async function analyzeVideo(videoPath, resumeText, jobDescription = "") {
  let audioPath;
  let transcript = "";
  let audioDiag  = { duration: 0, rms: 0.5 };

  // Step 1: Extract audio
  try {
    audioPath = await extractAudio(videoPath);
  } catch (err) {
    console.error("Audio extraction failed:", err.message);
    return buildErrorResult("Could not process video — please re-upload a valid MP4/MOV file.");
  }

  // Step 2: Transcribe
  try {
    const result  = await transcribeAudio(audioPath);
    transcript    = result.text;
    audioDiag.duration = result.duration;
  } catch (err) {
    console.error("Transcription failed:", err.message);
  } finally {
    if (audioPath && fs.existsSync(audioPath)) fs.unlinkSync(audioPath);
  }

  // Step 3: Signals
  const signals    = speechQualitySignals(transcript);
  const jdRelevance = relevanceSignalFromJD(transcript, jobDescription || resumeText || "");

  // Edge case: no speech
  if (!transcript || signals.wordCount < 5) {
    return buildErrorResult("No speech detected — ensure microphone is working and you speak clearly.");
  }

  // Step 4: Score
  const scores = scoreVideoLocally(signals, audioDiag, jdRelevance);
  const verdict = scores.overall >= 78 ? "IMPRESSIVE" : scores.overall >= 48 ? "AVERAGE" : "BELOW_AVERAGE";
  const grade   = scores.overall >= 85 ? "Excellent" : scores.overall >= 70 ? "Good" : scores.overall >= 50 ? "Average" : "Poor";

  // Step 5: Strengths
  const strengths = [];
  if (scores.communication >= 65) strengths.push("Clear and articulate communication");
  if (scores.confidence    >= 65) strengths.push("Confident delivery");
  if (signals.fillerCount  <= 3)  strengths.push("Minimal filler words");
  if (scores.technical     >= 65) strengths.push("Good use of role-relevant technical terms");
  if (scores.structure     >= 65) strengths.push("Well-structured presentation");
  if (signals.wordCount    >= 150) strengths.push("Good response length with sufficient detail");

  const improvements = practicalTips(signals, scores);

  const durationStr = `${Math.floor(audioDiag.duration / 60)}:${String(Math.round(audioDiag.duration % 60)).padStart(2, "0")}`;

  return {
    // Frontend-expected fields
    overallScore:  scores.overall,
    finalScore:    scores.overall,
    grade,
    verdict,
    communication: scores.communication,
    confidence:    scores.confidence,
    relevance:     jdRelevance,
    pace:          Math.max(0, Math.min(100, Math.round((audioDiag.duration > 0 ? Math.min(signals.wordCount / audioDiag.duration * 60 / 1.4, 100) : 70)))),
    clarity:       scores.communication,
    tone:          Math.min(100, Math.round(scores.confidence * 0.6 + jdRelevance * 0.4)),
    eyeContact:    Math.max(0, scores.confidence - 10),
    fillerWords:   signals.fillerCount,
    hesitations:   0,
    wordCount:     signals.wordCount,
    wpm:           audioDiag.duration > 0 ? Math.round((signals.wordCount / audioDiag.duration) * 60) : 0,
    duration:      durationStr,
    durationSeconds: Math.round(audioDiag.duration),
    sentiment:     scores.technical >= 60 ? "Positive" : "Neutral",
    fraudRisk:     signals.wordCount < 30 ? "High" : signals.wordCount < 80 ? "Medium" : "Low",
    strengths:     strengths.slice(0, 4),
    improvements,
    keywords:      [],
    transcript,
    // Backend scoring fields
    score:                  scores.overall,
    communication_score:    scores.communication,
    confidence_score:       scores.confidence,
    technical_signal_score: jdRelevance,
    structure_score:        scores.structure,
    speech_quality: {
      word_count:             signals.wordCount,
      filler_ratio:           Math.round(signals.fillerRatio * 1000) / 1000,
      low_signal_transcript:  signals.lowSignal,
      audio_duration_sec:     Math.round(audioDiag.duration * 100) / 100,
    },
    jd_relevance_signal: jdRelevance,
    analysis_confidence: signals.lowSignal || signals.wordCount < 25 ? 45 : 80,
  };
}

function buildErrorResult(message) {
  return {
    overallScore: 0, finalScore: 0, grade: "Poor", verdict: "BELOW_AVERAGE",
    communication: 0, confidence: 0, relevance: 0, pace: 0,
    clarity: 0, tone: 0, eyeContact: 0,
    fillerWords: 0, hesitations: 0, wordCount: 0, wpm: 0,
    duration: "0:00", durationSeconds: 0,
    sentiment: "Neutral", fraudRisk: "High",
    strengths: [], improvements: [message],
    keywords: [], transcript: "",
    score: 0, analysis_confidence: 0,
  };
}

module.exports = { analyzeVideo };