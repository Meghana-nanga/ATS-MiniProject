"""
HireIQ ML API Server
Flask server that exposes ML model predictions via REST API
Node.js backend calls this server for ATS scoring and fraud detection
"""

import os
import re
import json
import joblib
import numpy as np
from flask import Flask, request, jsonify
from flask_cors import CORS
import nltk
from nltk.corpus import stopwords

nltk.download("stopwords", quiet=True)
nltk.download("punkt",     quiet=True)

app        = Flask(__name__)
CORS(app)

MODELS_DIR = os.path.join(os.path.dirname(__file__), "..", "models")
STOP_WORDS = set(stopwords.words("english"))

# ── Load models on startup ─────────────────────────────────────────────────────
models = {}

def load_models():
    global models
    try:
        models["tfidf"]    = joblib.load(os.path.join(MODELS_DIR, "tfidf_vectorizer.pkl"))
        models["category"] = joblib.load(os.path.join(MODELS_DIR, "category_classifier.pkl"))
        models["labels"]   = joblib.load(os.path.join(MODELS_DIR, "label_encoder.pkl"))
        models["ats"]      = joblib.load(os.path.join(MODELS_DIR, "ats_scorer.pkl"))
        models["ats_feat"] = joblib.load(os.path.join(MODELS_DIR, "ats_features.pkl"))
        models["fraud"]    = joblib.load(os.path.join(MODELS_DIR, "fraud_detector.pkl"))

        with open(os.path.join(MODELS_DIR, "skill_taxonomy.json")) as f:
            models["taxonomy"] = json.load(f)
        with open(os.path.join(MODELS_DIR, "category_skills.json")) as f:
            models["cat_skills"] = json.load(f)

        print("✅ All ML models loaded")
    except FileNotFoundError as e:
        print(f"⚠️  Model not found: {e}")
        print("Run: python backend/ml/scripts/train_model.py first")

# ── Feature extraction ─────────────────────────────────────────────────────────
def clean_text(text):
    text = text.lower()
    text = re.sub(r"http\S+|www\S+", " ", text)
    text = re.sub(r"\S+@\S+",        " ", text)
    text = re.sub(r"[^a-z0-9\s\+\#\.]", " ", text)
    text = re.sub(r"\s+", " ", text).strip()
    return text

def extract_features(text):
    f = {}
    f["length"]       = len(text)
    f["word_count"]   = len(text.split())
    f["line_count"]   = text.count("\n")
    f["has_email"]    = int(bool(re.search(r"\S+@\S+\.\S+", text)))
    f["has_phone"]    = int(bool(re.search(r"\+?\d[\d\s\-()]{8,}\d", text)))
    f["has_linkedin"] = int("linkedin" in text.lower())
    f["has_github"]   = int("github"   in text.lower())
    f["date_count"]   = len(re.findall(r"\b(20\d{2}|19\d{2})\b", text))
    f["num_sections"] = sum(1 for s in ["experience","education","skills","projects","certifications","summary"] if s in text.lower())
    f["action_verbs"] = sum(1 for v in ["built","led","designed","developed","implemented","launched","managed","created","improved","reduced","increased","optimized","deployed","automated","mentored"] if re.search(r"\b"+v+r"\b", text.lower()))
    f["quantified"]   = len(re.findall(r"\d+\s*(%|x|users|customers|million|billion|k\+)", text.lower()))
    f["superlatives"] = sum(1 for s in ["world-class","top 1%","certified genius","best in class","renowned","guaranteed","ninja","rockstar","guru"] if s in text.lower())

    lines  = [l.strip() for l in text.split("\n") if len(l.strip()) > 20]
    unique = len(set(l.lower() for l in lines))
    f["duplicate_ratio"] = round(1 - (unique / len(lines)), 2) if len(lines) > 0 else 0.0

    return f

def match_skills(text, jd=""):
    norm  = text.lower()
    jd_norm = jd.lower()
    taxonomy = models.get("taxonomy", {})

    found   = []
    missing = []

    all_skills = []
    for skills in taxonomy.values():
        all_skills.extend(skills)
    all_skills = list(set(all_skills))

    for skill in all_skills:
        escaped = re.escape(skill)
        in_resume = bool(re.search(r"\b" + escaped + r"\b", norm))
        in_jd     = bool(re.search(r"\b" + escaped + r"\b", jd_norm)) if jd else True
        if in_resume:
            found.append(skill)
        elif in_jd and jd:
            missing.append(skill)

    return found, missing

# ── Routes ─────────────────────────────────────────────────────────────────────
@app.route("/health")
def health():
    return jsonify({
        "status":        "ok",
        "models_loaded": len(models) > 0,
        "models":        list(models.keys()),
    })

@app.route("/analyze", methods=["POST"])
def analyze():
    data = request.json or {}
    resume_text = data.get("resumeText", "")
    jd_text     = data.get("jobDescription", "")
    job_title   = data.get("jobTitle", "")

    if not resume_text:
        return jsonify({"error": "resumeText is required"}), 400

    result = {}

    # 1. Predict resume category
    if "tfidf" in models and "category" in models:
        try:
            vec    = models["tfidf"].transform([clean_text(resume_text)])
            cat_id = models["category"].predict(vec)[0]
            probs  = models["category"].predict_proba(vec)[0]
            result["predictedCategory"] = models["labels"].inverse_transform([cat_id])[0]
            result["categoryConfidence"] = round(float(max(probs)) * 100, 1)
        except Exception as e:
            result["predictedCategory"] = "Unknown"

    # 2. ATS scoring
    features = extract_features(resume_text)
    if "ats" in models and "ats_feat" in models:
        try:
            feat_arr = np.array([[features.get(f, 0) for f in models["ats_feat"]]])
            bin_pred = models["ats"].predict(feat_arr)[0]
            bin_prob = models["ats"].predict_proba(feat_arr)[0]
            # bin: 0=Low, 1=Average, 2=Good, 3=Excellent
            base_scores = {0: 25, 1: 52, 2: 72, 3: 89}
            base = base_scores.get(bin_pred, 50)
            # Adjust by confidence
            conf = float(max(bin_prob))
            ats_score = int(base * 0.7 + conf * 30)
        except:
            # Fallback scoring
            ats_score = _fallback_ats_score(features)
    else:
        ats_score = _fallback_ats_score(features)

    # 3. Keyword matching vs JD
    if jd_text:
        jd_words   = set(w for w in re.findall(r"\b[a-z][a-z0-9\+\#\.]{2,}\b", jd_text.lower()) if w not in STOP_WORDS)
        res_words  = set(w for w in re.findall(r"\b[a-z][a-z0-9\+\#\.]{2,}\b", resume_text.lower()) if w not in STOP_WORDS)
        matched    = jd_words & res_words
        keyword_score = int((len(matched) / max(len(jd_words), 1)) * 100)
        matched_kw  = [{"keyword": w, "found": True,  "weight": 2 if len(w) > 4 else 1} for w in list(matched)[:20]]
        missing_kw  = list(jd_words - res_words)[:15]
    else:
        keyword_score = 60
        matched_kw    = []
        missing_kw    = []

    # 4. Skill matching
    found_skills, missing_skills = match_skills(resume_text, jd_text)

    # 5. Sub-scores
    formatting_score = _score_formatting(features)
    experience_score = _score_experience(resume_text)
    education_score  = _score_education(resume_text)
    skills_score     = int((len(found_skills) / max(len(found_skills) + len(missing_skills), 1)) * 100) if (found_skills or missing_skills) else 60

    # 6. Final ATS (weighted)
    final_ats = int(
        keyword_score    * 0.30 +
        formatting_score * 0.15 +
        experience_score * 0.25 +
        education_score  * 0.15 +
        skills_score     * 0.10 +
        ats_score        * 0.05
    )
    final_ats = max(10, min(final_ats, 100))

    # 7. Fraud detection
    if "fraud" in models and "ats_feat" in models:
        try:
            feat_arr   = np.array([[features.get(f, 0) for f in models["ats_feat"]]])
            fraud_pred = models["fraud"].predict(feat_arr)[0]
            fraud_prob = models["fraud"].predict_proba(feat_arr)[0]
            fraud_score_pct = int(fraud_prob[1] * 100)
        except:
            fraud_score_pct, fraud_pred = _rule_based_fraud(resume_text, features)
    else:
        fraud_score_pct, fraud_pred = _rule_based_fraud(resume_text, features)

    fraud_flags    = _get_fraud_flags(resume_text, features)
    is_fraud       = fraud_score_pct >= 30 or len([f for f in fraud_flags if f["severity"] == "high"]) > 0

    # 8. Recommendations
    recs = []
    if keyword_score    < 60: recs.append("Add more job-specific keywords from the description")
    if formatting_score < 60: recs.append("Add clear sections: Experience, Skills, Education, Projects")
    if experience_score < 60: recs.append("Quantify achievements with numbers (%, users, revenue)")
    if missing_skills:        recs.append("Learn missing skills: " + ", ".join(missing_skills[:4]))
    if education_score  < 60: recs.append("Include education with degree, institution, and year")
    if not features["has_linkedin"]: recs.append("Add your LinkedIn profile URL")
    if not features["has_github"]:   recs.append("Add your GitHub profile URL")

    return jsonify({
        "atsScore": final_ats,
        "breakdown": {
            "keywordScore":    keyword_score,
            "formattingScore": formatting_score,
            "experienceScore": experience_score,
            "educationScore":  education_score,
            "skillsScore":     skills_score,
        },
        "matchedKeywords":   matched_kw,
        "missingKeywords":   missing_kw,
        "foundSkills":       found_skills[:30],
        "missingSkills":     missing_skills[:20],
        "recommendations":   recs,
        "predictedCategory": result.get("predictedCategory", "Unknown"),
        "fraud": {
            "isFraudSuspected": bool(is_fraud),
            "fraudScore":       fraud_score_pct,
            "flags":            fraud_flags,
            "analysis":         (
                "HIGH RISK: Multiple strong fraud indicators. Manual review required." if fraud_score_pct >= 60
                else "MODERATE RISK: Suspicious patterns found. Verify credentials."   if fraud_score_pct >= 30
                else "LOW RISK: Resume appears authentic."
            ),
        },
    })

def _fallback_ats_score(f):
    s  = 30
    s += min(f["num_sections"] * 8,  40)
    s += min(f["action_verbs"] * 3,  15)
    s += min(f["quantified"]   * 4,  12)
    s += f["has_email"]   * 3
    s += f["has_linkedin"] * 3
    s += f["has_github"]   * 2
    if f["length"] > 1500: s += 5
    return min(max(s, 10), 100)

def _score_formatting(f):
    s  = 35
    s += min(f["num_sections"] * 8,  40)
    s += f["has_email"]   * 5
    s += f["has_phone"]   * 3
    s += f["has_linkedin"] * 4
    s += f["has_github"]   * 3
    if f["length"] > 800:  s += 5
    if f["length"] > 1500: s += 5
    return min(s, 100)

def _score_experience(text):
    s  = 20
    m  = re.search(r"(\d+)\+?\s*years?\s*(of\s*)?(experience|exp)", text, re.I)
    if m: s += min(int(m.group(1)) * 5, 30)
    dr = re.findall(r"\b(20\d{2}|19\d{2})\s*[-–to]+\s*(20\d{2}|present|\d{4})", text, re.I)
    s += min(len(dr) * 8, 24)
    for v in ["built","led","developed","launched","improved","reduced","optimized","deployed"]:
        if re.search(r"\b" + v + r"\b", text, re.I): s += 2
    q = re.findall(r"\d+\s*(%|x|users|customers|million|billion)", text, re.I)
    s += min(len(q) * 3, 9)
    return min(s, 100)

def _score_education(text):
    s  = 35
    for d in ["bachelor","master","phd","b.tech","m.tech","mba","bsc","msc","b.e","m.e","degree","diploma"]:
        if re.search(r"\b" + re.escape(d) + r"\b", text, re.I): s += 30; break
    for f in ["computer science","information technology","software engineering","data science","mathematics","electronics"]:
        if f in text.lower(): s += 20; break
    for g in ["cgpa","gpa","percentage","first class","distinction","honours"]:
        if g in text.lower(): s += 10; break
    return min(s, 100)

def _rule_based_fraud(text, features):
    score = 0
    t     = text.lower()
    if features["superlatives"] >= 2: score += 35
    if features["duplicate_ratio"] > 0.5: score += 25
    if re.search(r"simultaneously.{0,50}(google|amazon|microsoft|apple|facebook)", t): score += 40
    if features["length"] < 300: score += 20
    return min(score, 100), score >= 30

def _get_fraud_flags(text, features):
    flags = []
    t     = text.lower()

    if features["superlatives"] >= 1:
        flags.append({"type":"suspicious_language","description":"Suspicious superlatives detected in resume","severity":"high"})
    if features["duplicate_ratio"] > 0.5:
        flags.append({"type":"duplicate_content","description":f"High duplicate content ({int(features['duplicate_ratio']*100)}%) — possible template fraud","severity":"medium"})
    if re.search(r"simultaneously.{0,80}(google|amazon|microsoft|apple|facebook|linkedin)", t):
        flags.append({"type":"impossible_claim","description":"Claims simultaneous employment at multiple top companies","severity":"high"})
    if features["length"] < 300:
        flags.append({"type":"thin_content","description":"Very short resume — possible placeholder or incomplete","severity":"medium"})
    for title in ["ceo","founder","cto","vp of engineering","head of engineering"]:
        if re.search(r"\b" + title + r"\b", t) and features["length"] < 800:
            flags.append({"type":"inflated_title","description":f"Senior title '{title}' with minimal supporting content","severity":"medium"})
            break

    return flags

if __name__ == "__main__":
    load_models()
    port = int(os.environ.get("ML_PORT", 8000))
    print(f"🚀 ML Server running on http://localhost:{port}")
    app.run(host="0.0.0.0", port=port, debug=False)