"""
HireIQ ML Training Script
Dataset: Kaggle Resume Dataset (snehaanbhawal/resume-dataset)
This script:
1. Loads Resume.csv from Kaggle
2. Extracts skills and keywords per category
3. Trains TF-IDF vectorizer for ATS scoring
4. Trains fraud detection classifier
5. Saves models as .pkl files for the Flask API
"""

import pandas as pd
import numpy as np
import re
import json
import joblib
import os
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.preprocessing import LabelEncoder
from sklearn.metrics import classification_report, accuracy_score
import nltk
from nltk.corpus import stopwords
from nltk.tokenize import word_tokenize
from nltk.stem import PorterStemmer

# Download NLTK data
nltk.download("stopwords", quiet=True)
nltk.download("punkt",     quiet=True)
nltk.download("punkt_tab", quiet=True)

STOP_WORDS = set(stopwords.words("english"))
stemmer    = PorterStemmer()

BASE_DIR = os.path.dirname(os.path.dirname(__file__))

DATA_DIR = os.path.join(BASE_DIR, "data")
MODELS_DIR = os.path.join(BASE_DIR, "models")
os.makedirs(MODELS_DIR, exist_ok=True)

# ── Text cleaning ──────────────────────────────────────────────────────────────
def clean_text(text):
    if not isinstance(text, str):
        return ""
    text = text.lower()
    text = re.sub(r"http\S+|www\S+", " ", text)        # remove URLs
    text = re.sub(r"\S+@\S+", " ", text)               # remove emails
    text = re.sub(r"[^a-z0-9\s\+\#\.]", " ", text)    # keep alphanumeric
    text = re.sub(r"\s+", " ", text).strip()
    return text

def extract_features(text):
    """Extract numeric features from resume text"""
    features = {}
    features["length"]        = len(text)
    features["word_count"]    = len(text.split())
    features["line_count"]    = text.count("\n")
    features["has_email"]     = int(bool(re.search(r"\S+@\S+\.\S+", text)))
    features["has_phone"]     = int(bool(re.search(r"\+?\d[\d\s\-()]{8,}\d", text)))
    features["has_linkedin"]  = int("linkedin" in text.lower())
    features["has_github"]    = int("github" in text.lower())
    features["date_count"]    = len(re.findall(r"\b(20\d{2}|19\d{2})\b", text))
    features["num_sections"]  = sum(1 for s in ["experience","education","skills","projects","certifications","summary"] if s in text.lower())
    features["action_verbs"]  = sum(1 for v in ["built","led","designed","developed","implemented","launched","managed","created","improved","reduced","increased","optimized","deployed","automated","mentored"] if re.search(r"\b"+v+r"\b", text.lower()))
    features["quantified"]    = len(re.findall(r"\d+\s*(%|x|users|customers|million|billion|k\+)", text.lower()))
    features["superlatives"]  = sum(1 for s in ["world-class","top 1%","certified genius","best in class","renowned","guaranteed","ninja","rockstar","guru"] if s in text.lower())
    features["duplicate_ratio"] = _duplicate_ratio(text)
    return features

def _duplicate_ratio(text):
    lines = [l.strip() for l in text.split("\n") if len(l.strip()) > 20]
    if len(lines) < 5:
        return 0.0
    unique = len(set(l.lower() for l in lines))
    return round(1 - (unique / len(lines)), 2)

# ── Load and process Kaggle Resume Dataset ─────────────────────────────────────
def load_resume_data():
    path = os.path.join(DATA_DIR, "Resume.csv")
    if not os.path.exists(path):
        print(f"❌ Resume.csv not found at {path}")
        print("Download from: https://www.kaggle.com/datasets/snehaanbhawal/resume-dataset")
        return None
    df = pd.read_csv(path)
    print(f"✅ Loaded {len(df)} resumes from Kaggle dataset")
    print(f"   Columns: {list(df.columns)}")
    print(f"   Categories: {df['Category'].nunique() if 'Category' in df.columns else 'N/A'}")
    return df

# ── Train TF-IDF + Category Classifier ────────────────────────────────────────
def train_category_classifier(df):
    print("\n📊 Training resume category classifier...")

    # Use Resume_str or Resume column
    text_col = "Resume_str" if "Resume_str" in df.columns else "Resume"
    cat_col  = "Category"

    df = df[[text_col, cat_col]].dropna()
    df["clean"] = df[text_col].apply(clean_text)

    # Encode categories
    le = LabelEncoder()
    df["label"] = le.fit_transform(df[cat_col])

    print(f"   Categories found: {list(le.classes_)}")

    # TF-IDF
    tfidf = TfidfVectorizer(
        max_features   = 5000,
        ngram_range    = (1, 2),
        stop_words     = "english",
        min_df         = 2,
        max_df         = 0.95,
        sublinear_tf   = True,
    )
    X = tfidf.fit_transform(df["clean"])
    y = df["label"]

    # Train/test split
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)

    # Train classifier
    clf = LogisticRegression(
    max_iter=1000,
    C=1.0,
    solver="lbfgs"
)
    clf.fit(X_train, y_train)

    # Evaluate
    y_pred  = clf.predict(X_test)
    acc     = accuracy_score(y_test, y_pred)
    print(f"   ✅ Category classifier accuracy: {acc:.2%}")

    # Save models
    joblib.dump(tfidf, os.path.join(MODELS_DIR, "tfidf_vectorizer.pkl"))
    joblib.dump(clf,   os.path.join(MODELS_DIR, "category_classifier.pkl"))
    joblib.dump(le,    os.path.join(MODELS_DIR, "label_encoder.pkl"))
    print("   ✅ Saved: tfidf_vectorizer.pkl, category_classifier.pkl, label_encoder.pkl")

    # Save category → skills mapping from dataset
    category_skills = {}
    for cat in le.classes_:
        cat_resumes = df[df[cat_col] == cat][text_col].tolist()
        all_text    = " ".join(cat_resumes[:50])  # sample
        # Extract most common tech terms
        words       = re.findall(r"\b[a-z][a-z0-9\+\#\.]{2,}\b", all_text.lower())
        word_freq   = {}
        for w in words:
            if w not in STOP_WORDS and len(w) > 3:
                word_freq[w] = word_freq.get(w, 0) + 1
        top_skills = sorted(word_freq, key=word_freq.get, reverse=True)[:40]
        category_skills[cat] = top_skills

    with open(os.path.join(MODELS_DIR, "category_skills.json"), "w") as f:
        json.dump(category_skills, f, indent=2)
    print("   ✅ Saved: category_skills.json")

    return tfidf, clf, le, category_skills

# ── Train ATS Scorer ───────────────────────────────────────────────────────────
def train_ats_scorer(df):
    print("\n📊 Training ATS score model...")

    text_col = "Resume_str" if "Resume_str" in df.columns else "Resume"
    df       = df[[text_col]].dropna()

    # Generate synthetic ATS labels based on features
    # (Real ATS scores from HR systems are not publicly available)
    records = []
    for _, row in df.iterrows():
        text     = str(row[text_col])
        features = extract_features(text)

        # Score formula based on resume quality indicators
        score = 30
        score += min(features["num_sections"] * 10, 30)
        score += min(features["action_verbs"]  * 3,  15)
        score += min(features["quantified"]    * 4,  12)
        score += min(features["date_count"]    * 2,   8)
        score += features["has_email"]   * 3
        score += features["has_linkedin"] * 3
        score += features["has_github"]   * 2
        if features["length"] > 1500: score += 5
        if features["length"] > 3000: score += 3
        score  = min(max(score, 10), 100)

        records.append({**features, "ats_score": score})

    df_feat = pd.DataFrame(records)
    feature_cols = [c for c in df_feat.columns if c != "ats_score"]

    X = df_feat[feature_cols].fillna(0)
    y = df_feat["ats_score"]

    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

    # Gradient Boosting for ATS scoring
    gb = GradientBoostingClassifier(n_estimators=100, max_depth=4, learning_rate=0.1, random_state=42)

    # Convert to bins for classification
    def score_to_bin(s):
        if s >= 80: return 3   # Excellent
        if s >= 60: return 2   # Good
        if s >= 40: return 1   # Average
        return 0               # Low

    y_train_bin = y_train.apply(score_to_bin)
    y_test_bin  = y_test.apply(score_to_bin)

    gb.fit(X_train, y_train_bin)
    acc = accuracy_score(y_test_bin, gb.predict(X_test))
    print(f"   ✅ ATS score classifier accuracy: {acc:.2%}")

    joblib.dump(gb,           os.path.join(MODELS_DIR, "ats_scorer.pkl"))
    joblib.dump(feature_cols, os.path.join(MODELS_DIR, "ats_features.pkl"))
    print("   ✅ Saved: ats_scorer.pkl, ats_features.pkl")

    return gb, feature_cols

# ── Train Fraud Detector ───────────────────────────────────────────────────────
def train_fraud_detector(df):
    print("\n📊 Training fraud detector...")

    text_col = "Resume_str" if "Resume_str" in df.columns else "Resume"
    df       = df[[text_col]].dropna().copy()

    # Generate synthetic fraud labels
    # Real resumes → label 0, synthetic fraud resumes → label 1
    fraud_patterns = [
        "certified genius world-class top 1% renowned expert",
        "ceo founder cto coo simultaneously google microsoft apple",
        "phd harvard mit stanford oxford cambridge invented python javascript",
        "guaranteed best in class top performer 100% success flawless",
        "worked at google amazon facebook microsoft apple simultaneously 2010 present",
    ]

    texts  = list(df[text_col].fillna("").str[:1500])
    labels = [0] * len(texts)

    # Add synthetic fraud examples
    for pattern in fraud_patterns:
        for _ in range(max(1, len(texts) // (len(fraud_patterns) * 5))):
            texts.append(pattern + " " + " ".join(np.random.choice(texts[:10]).split()[:20]))
            labels.append(1)

    # Feature extraction
    features_list = [extract_features(t) for t in texts]
    df_feat  = pd.DataFrame(features_list).fillna(0)

    X = df_feat
    y = np.array(labels)

    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)

    rf = RandomForestClassifier(n_estimators=200, max_depth=8, random_state=42, class_weight="balanced")
    rf.fit(X_train, y_train)

    acc = accuracy_score(y_test, rf.predict(X_test))
    print(f"   ✅ Fraud detector accuracy: {acc:.2%}")
    print(classification_report(y_test, rf.predict(X_test), target_names=["Authentic","Fraud"]))

    joblib.dump(rf, os.path.join(MODELS_DIR, "fraud_detector.pkl"))
    print("   ✅ Saved: fraud_detector.pkl")

    return rf

# ── Build skill taxonomy from dataset ─────────────────────────────────────────
def build_skill_taxonomy(category_skills):
    print("\n📊 Building skill taxonomy from dataset...")

    # Merge dataset skills with our curated list
    taxonomy = {
        "frontend":   ["react","vue","angular","javascript","typescript","html","css","sass","webpack","nextjs","redux","tailwind","figma","jest","cypress"],
        "backend":    ["node","nodejs","express","python","django","flask","fastapi","java","spring","graphql","rest","microservices","grpc","kafka","rabbitmq"],
        "database":   ["mongodb","postgresql","mysql","redis","elasticsearch","firebase","sql","nosql","mongoose","prisma","dynamodb","cassandra"],
        "devops":     ["docker","kubernetes","aws","gcp","azure","terraform","jenkins","github actions","cicd","linux","nginx","ansible","prometheus","grafana"],
        "ml_ai":      ["python","tensorflow","pytorch","scikit-learn","pandas","numpy","machine learning","deep learning","nlp","computer vision","transformers","bert","llm"],
        "mobile":     ["react native","flutter","swift","kotlin","android","ios","expo","dart"],
        "testing":    ["jest","cypress","playwright","selenium","pytest","junit","tdd","bdd","postman"],
        "soft_skills":["agile","scrum","leadership","communication","teamwork","problem solving","mentoring","jira"],
    }

    # Enrich with dataset-derived skills
    for cat, skills in category_skills.items():
        cat_lower = cat.lower().replace(" ", "_")
        # Map kaggle categories to our taxonomy
        if any(k in cat_lower for k in ["java","python","data","ml","devops","web","react","angular","frontend","backend"]):
            for skill in skills[:20]:
                # Add to closest matching taxonomy category
                if any(k in skill for k in ["react","vue","angular","html","css","javascript"]):
                    taxonomy["frontend"].append(skill)
                elif any(k in skill for k in ["node","django","flask","spring","express"]):
                    taxonomy["backend"].append(skill)
                elif any(k in skill for k in ["docker","kubernetes","aws","terraform"]):
                    taxonomy["devops"].append(skill)
                elif any(k in skill for k in ["pandas","tensorflow","sklearn","pytorch","ml"]):
                    taxonomy["ml_ai"].append(skill)

    # Deduplicate
    for cat in taxonomy:
        taxonomy[cat] = list(dict.fromkeys(taxonomy[cat]))

    with open(os.path.join(MODELS_DIR, "skill_taxonomy.json"), "w") as f:
        json.dump(taxonomy, f, indent=2)
    print("   ✅ Saved: skill_taxonomy.json")

    return taxonomy

# ── Main ───────────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    print("🚀 HireIQ ML Training Pipeline")
    print("=" * 50)

    df = load_resume_data()
    if df is None:
        print("\n⚠️  Cannot train without dataset.")
        print("Place Resume.csv in backend/ml/data/ and run again.")
        exit(1)

    tfidf, clf, le, cat_skills = train_category_classifier(df)
    gb, feat_cols              = train_ats_scorer(df)
    rf                         = train_fraud_detector(df)
    taxonomy                   = build_skill_taxonomy(cat_skills)

    print("\n" + "=" * 50)
    print("✅ All models trained and saved to backend/ml/models/")
    print("\nModels saved:")
    for f in os.listdir(MODELS_DIR):
        size = os.path.getsize(os.path.join(MODELS_DIR, f))
        print(f"   📦 {f} ({size//1024} KB)")

    print("\n🎯 Next: Start the Flask ML server")
    print("   python backend/ml/scripts/ml_server.py")