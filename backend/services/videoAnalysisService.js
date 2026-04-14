const ffmpeg = require("fluent-ffmpeg");
const fs = require("fs");
const OpenAI = require("openai");

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// 🔹 Extract audio from video
function extractAudio(videoPath) {
  return new Promise((resolve, reject) => {
    const outputPath = videoPath + ".mp3";

    ffmpeg(videoPath)
      .noVideo()
      .audioCodec("libmp3lame")
      .save(outputPath)
      .on("end", () => resolve(outputPath))
      .on("error", reject);
  });
}

// 🔹 Convert speech to text (REAL)
async function speechToText(audioPath) {
  const response = await openai.audio.transcriptions.create({
    file: fs.createReadStream(audioPath),
    model: "gpt-4o-transcribe"
  });

  return response.text;
}

// 🔹 Compare resume vs transcript
function compareText(resumeText, transcript) {
  const resumeWords = new Set(resumeText.toLowerCase().split(/\W+/));
  const videoWords = new Set(transcript.toLowerCase().split(/\W+/));

  let match = 0;

  resumeWords.forEach(word => {
    if (videoWords.has(word)) match++;
  });

  const score = Math.round((match / resumeWords.size) * 100);

  return {
    score,
    confidence:
      score > 60 ? "High" :
      score > 30 ? "Medium" : "Low"
  };
}

// 🔹 MAIN FUNCTION
async function analyzeVideo(videoPath, resumeText) {
  let transcript = "";

  try {
    const audioPath = await extractAudio(videoPath);

    transcript = await speechToText(audioPath);

    fs.unlinkSync(audioPath); // cleanup

  } catch (err) {
    console.error("Video processing failed:", err.message);
    return { score: 0, confidence: "Low", transcript: "" };
  }

  const result = compareText(resumeText, transcript);

  return {
    ...result,
    transcript
  };
}

module.exports = { analyzeVideo };