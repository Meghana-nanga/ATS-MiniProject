const pdfParse = require("pdf-parse");
const mammoth  = require("mammoth");
const fs       = require("fs");
const path     = require("path");

async function extractText(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  try {
    if (ext === ".pdf") {
      const data = await pdfParse(fs.readFileSync(filePath));
      return data.text || "";
    }
    if (ext === ".docx" || ext === ".doc") {
      const result = await mammoth.extractRawText({ path: filePath });
      return result.value || "";
    }
    return fs.readFileSync(filePath, "utf-8");
  } catch (err) {
    console.error("Text extraction error:", err.message);
    return "";
  }
}

module.exports = { extractText };
