"""
serving/main.py — FastAPI app for diabetes, cardio, and breast cancer FL model serving.

Endpoints:
  POST /predict                 — diabetes  {fastingGlucose, bp, bmi, age} -> {probability, modelVersion}
  POST /predict-and-recommend   — diabetes  full prediction + recommendations
  POST /predict/cardio          — cardio    {age, sex, height, weight, cholesterol, bp, glucose} -> risk
  POST /predict/breast-cancer   — breast    {7 cell-nucleus mean measurements} -> risk
  GET  /model/status            — diabetes  {currentRound, totalRounds, lastAccuracy, lastTrainedAt}
  GET  /model/rounds            — diabetes  [{round, accuracy, loss, numClients, timestamp}]
  GET  /model/cardio/status     — cardio    training status
  GET  /model/cardio/rounds     — cardio    training rounds
  GET  /model/breast/status     — breast    training status
  GET  /model/breast/rounds     — breast    training rounds
  GET  /health                  — {status: "ok"}
"""

import json
from pathlib import Path

import joblib
import numpy as np
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from recommendations import generate_recommendations

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------
BASE_DIR = Path(__file__).resolve().parent.parent
MODELS_DIR = BASE_DIR / "models"
HISTORY_PATH = BASE_DIR / "training_history.json"
MODEL_VERSION = "1.0.0"

# Pima feature indices for the 4 API fields
# Pima order: [preg, plas, pres, skin, insu, mass, pedi, age]
API_FEATURE_INDICES = {
    "fastingGlucose": 1,  # plas
    "bp": 2,              # pres
    "bmi": 5,             # mass
    "age": 7,             # age
}

# ---------------------------------------------------------------------------
# Cardio module config
# ---------------------------------------------------------------------------
CARDIO_DIR = BASE_DIR / "cardio"
CARDIO_FEATURES = [
    "age", "gender", "height", "weight",
    "ap_hi", "ap_lo", "cholesterol", "gluc",
    "smoke", "alco", "active",
]
# API field -> Cardio feature index mapping (from the Cardio web form)
CARDIO_API_MAP = {
    "age": 0,          # age (years)
    "sex": 1,          # gender — male -> 2, female -> 1
    "height": 2,       # height (cm)
    "weight": 3,       # weight (kg)
    "bp": 4,           # ap_hi — systolic blood pressure
    "cholesterol": 6,  # cholesterol — category from mg/dl
    "glucose": 7,      # gluc — category from mg/dl
}
CARDIO_DEFAULTS = {
    5: 0.0,    # ap_lo — diastolic BP (not collected by form)
    8: 0.0,    # smoke — assume non-smoker
    9: 0.0,    # alco  — assume non-drinker
    10: 1.0,   # active — assume physically active
}

# ---------------------------------------------------------------------------
# Breast Cancer module config
# ---------------------------------------------------------------------------
BREAST_DIR = BASE_DIR / "breast_cancer"
BREAST_FEATURES = [
    "mean radius", "mean texture", "mean perimeter", "mean area",
    "mean smoothness", "mean compactness", "mean concavity",
    "mean concave points", "mean symmetry", "mean fractal dimension",
]
# API field -> Wisconsin feature index mapping (from the Breast Cancer form)
BREAST_API_MAP = {
    "radiusMean": 0,          # mean radius
    "textureMean": 1,         # mean texture
    "perimeterMean": 2,       # mean perimeter
    "areaMean": 3,            # mean area
    "smoothnessMean": 4,      # mean smoothness
    "concavityMean": 6,       # mean concavity
    "concavePointsMean": 7,   # mean concave points
}
BREAST_DEFAULTS = {
    5: 0.0,   # mean compactness — not collected by form
    8: 0.0,   # mean symmetry — not collected by form
    9: 0.0,   # mean fractal dimension — not collected by form
}

# ---------------------------------------------------------------------------
# Load model + scaler at startup
# ---------------------------------------------------------------------------
model = None
scaler = None

try:
    model = joblib.load(MODELS_DIR / "diabetes_fl_model.joblib")
    scaler = joblib.load(MODELS_DIR / "diabetes_scaler.joblib")
    print(f"[OK] Loaded model from {MODELS_DIR / 'diabetes_fl_model.joblib'}")
except Exception as e:
    print(f"[WARN] Could not load model: {e}")

cardio_model = None
cardio_scaler = None

try:
    cardio_model = joblib.load(CARDIO_DIR / "models" / "cardio_fl_model.joblib")
    cardio_scaler = joblib.load(CARDIO_DIR / "models" / "cardio_scaler.joblib")
    print(f"[OK] Loaded model from {CARDIO_DIR / 'models' / 'cardio_fl_model.joblib'}")
except Exception as e:
    print(f"[WARN] Could not load cardio model: {e}")

breast_model = None
breast_scaler = None

try:
    breast_model = joblib.load(BREAST_DIR / "models" / "breast_fl_model.joblib")
    breast_scaler = joblib.load(BREAST_DIR / "models" / "breast_scaler.joblib")
    print(f"[OK] Loaded model from {BREAST_DIR / 'models' / 'breast_fl_model.joblib'}")
except Exception as e:
    print(f"[WARN] Could not load breast model: {e}")

# ---------------------------------------------------------------------------
# FastAPI app
# ---------------------------------------------------------------------------
app = FastAPI(
    title="CuraAyur FL Prediction API",
    description="Federated Learning model serving for diabetes, cardiovascular, and breast cancer risk prediction",
    version=MODEL_VERSION,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# Request / Response models
# ---------------------------------------------------------------------------

class PatientInput(BaseModel):
    fastingGlucose: float = Field(..., description="Fasting glucose in mg/dl")
    bp: float = Field(..., description="Blood pressure (systolic) in mmHg")
    bmi: float = Field(..., description="Body Mass Index")
    age: float = Field(..., description="Age in years")
    hba1c: float = Field(5.5, description="HbA1c percentage")
    familyHistory: str = Field("no", description="yes or no")
    activity: str = Field("moderate", description="low, moderate, or high")
    sex: str = Field("male", description="male or female")


class PredictResponse(BaseModel):
    probability: float
    modelVersion: str


class RecommendResponse(BaseModel):
    probability: float
    riskScore: int
    riskLevel: str
    modelVersion: str
    lifestyle: list
    clinical: list
    medicines: dict


class ModelStatus(BaseModel):
    currentRound: int
    totalRounds: int
    lastAccuracy: float
    lastTrainedAt: str


class RoundRecord(BaseModel):
    round: int
    accuracy: float
    loss: float
    numClients: int
    timestamp: str


class CardioInput(BaseModel):
    age: float = Field(..., description="Age in years")
    sex: str = Field("male", description="male or female")
    height: float = Field(..., description="Height in cm")
    weight: float = Field(..., description="Weight in kg")
    cholesterol: float = Field(..., description="Total cholesterol in mg/dl")
    bp: float = Field(..., description="Systolic blood pressure in mmHg")
    glucose: float = Field(..., description="Fasting glucose in mg/dl")


class BreastInput(BaseModel):
    radiusMean: float = Field(..., description="Mean radius")
    textureMean: float = Field(..., description="Mean texture")
    perimeterMean: float = Field(..., description="Mean perimeter")
    areaMean: float = Field(..., description="Mean area")
    smoothnessMean: float = Field(..., description="Mean smoothness")
    concavityMean: float = Field(..., description="Mean concavity")
    concavePointsMean: float = Field(..., description="Mean concave points")


class RiskResponse(BaseModel):
    probability: float
    riskScore: int
    riskLevel: str
    modelVersion: str
    source: str


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def build_feature_vector(req: PatientInput) -> np.ndarray:
    """Convert patient input to 8-feature Pima vector and apply StandardScaler."""
    features = np.zeros((1, 8), dtype=np.float64)
    features[0, API_FEATURE_INDICES["fastingGlucose"]] = req.fastingGlucose
    features[0, API_FEATURE_INDICES["bp"]] = req.bp
    features[0, API_FEATURE_INDICES["bmi"]] = req.bmi
    features[0, API_FEATURE_INDICES["age"]] = req.age
    return scaler.transform(features)


def compute_risk_score(probability):
    """Convert model probability (0-1) to a patient-friendly risk score (1-99)."""
    score = int(round(probability * 100))
    return max(1, min(99, score))


def load_history_data() -> list[dict]:
    if HISTORY_PATH.exists():
        with open(HISTORY_PATH, "r") as f:
            return json.load(f)
    return []


def load_module_history(path: Path) -> list[dict]:
    if path.exists():
        with open(path, "r") as f:
            return json.load(f)
    return []


def cardio_to_category(mgdl: float, metric: str) -> int:
    """Map mg/dl to the cardio dataset category (1-3) for cholesterol / glucose."""
    if metric == "cholesterol":
        return 3 if mgdl >= 240 else (2 if mgdl >= 200 else 1)
    return 3 if mgdl >= 126 else (2 if mgdl >= 100 else 1)


def sex_to_gender(sex: str) -> int:
    """Map UI sex ('male'/'female') to cardio dataset gender (2=male, 1=female)."""
    return 2 if sex == "male" else 1


def build_cardio_vector(req: CardioInput) -> np.ndarray:
    """Convert the cardio web form into the 11-feature vector and apply the scaler."""
    vec = np.zeros((1, len(CARDIO_FEATURES)), dtype=np.float64)
    vec[0, CARDIO_API_MAP["age"]] = req.age
    vec[0, CARDIO_API_MAP["sex"]] = sex_to_gender(req.sex)
    vec[0, CARDIO_API_MAP["height"]] = req.height
    vec[0, CARDIO_API_MAP["weight"]] = req.weight
    vec[0, CARDIO_API_MAP["cholesterol"]] = cardio_to_category(req.cholesterol, "cholesterol")
    vec[0, CARDIO_API_MAP["bp"]] = req.bp
    vec[0, CARDIO_API_MAP["glucose"]] = cardio_to_category(req.glucose, "glucose")
    for idx, val in CARDIO_DEFAULTS.items():
        vec[0, idx] = val
    return cardio_scaler.transform(vec)


def build_breast_vector(req: BreastInput) -> np.ndarray:
    """Convert the breast cancer form measurements into the 10-feature vector."""
    vec = np.zeros((1, len(BREAST_FEATURES)), dtype=np.float64)
    for field, idx in BREAST_API_MAP.items():
        vec[0, idx] = getattr(req, field)
    for idx, val in BREAST_DEFAULTS.items():
        vec[0, idx] = val
    return breast_scaler.transform(vec)


def risk_level_for(score: int) -> str:
    """Map risk score to level using the same thresholds as the web UI."""
    if score < 35:
        return "low"
    if score < 65:
        return "moderate"
    return "high"


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/predict", response_model=PredictResponse)
def predict(req: PatientInput):
    if model is None:
        raise HTTPException(status_code=503, detail="Model not loaded. Run FL training first.")

    X = build_feature_vector(req)
    prob_class1 = model.predict_proba(X)[0][1]

    return PredictResponse(
        probability=round(float(prob_class1), 4),
        modelVersion=MODEL_VERSION,
    )


@app.post("/predict-and-recommend", response_model=RecommendResponse)
def predict_and_recommend(req: PatientInput):
    """Run FL prediction and generate adaptive recommendations in a single call."""
    if model is None:
        raise HTTPException(status_code=503, detail="Model not loaded. Run FL training first.")

    X = build_feature_vector(req)
    prob_class1 = model.predict_proba(X)[0][1]
    risk_score = compute_risk_score(prob_class1)

    patient_data = {
        "age": req.age,
        "glucose": req.fastingGlucose,
        "hba1c": req.hba1c,
        "bp": req.bp,
        "bmi": req.bmi,
        "familyHistory": req.familyHistory,
        "activity": req.activity,
        "sex": req.sex,
    }

    recs = generate_recommendations(risk_score, patient_data)

    return RecommendResponse(
        probability=round(float(prob_class1), 4),
        riskScore=risk_score,
        riskLevel=recs["riskLevel"],
        modelVersion=MODEL_VERSION,
        lifestyle=recs["lifestyle"],
        clinical=recs["clinical"],
        medicines=recs["medicines"],
    )


@app.get("/model/status", response_model=ModelStatus)
def model_status():
    history = load_history_data()
    if not history:
        return ModelStatus(
            currentRound=0,
            totalRounds=0,
            lastAccuracy=0.0,
            lastTrainedAt="",
        )
    last = history[-1]
    return ModelStatus(
        currentRound=last["round"],
        totalRounds=last["round"],
        lastAccuracy=last["accuracy"],
        lastTrainedAt=last["timestamp"],
    )


@app.get("/model/rounds", response_model=list[RoundRecord])
def model_rounds():
    history = load_history_data()
    return [
        RoundRecord(
            round=r["round"],
            accuracy=r["accuracy"],
            loss=r["loss"],
            numClients=r["numClients"],
            timestamp=r["timestamp"],
        )
        for r in history
    ]


@app.post("/predict/cardio", response_model=RiskResponse)
def predict_cardio(req: CardioInput):
    """Cardio CVD risk: probability = P(has cardiovascular disease)."""
    if cardio_model is None or cardio_scaler is None:
        raise HTTPException(status_code=503, detail="Cardio model not loaded. Run FL training first.")

    X = build_cardio_vector(req)
    prob_disease = cardio_model.predict_proba(X)[0][1]
    risk_score = compute_risk_score(prob_disease)

    return RiskResponse(
        probability=round(float(prob_disease), 4),
        riskScore=risk_score,
        riskLevel=risk_level_for(risk_score),
        modelVersion=MODEL_VERSION,
        source="fl",
    )


@app.post("/predict/breast-cancer", response_model=RiskResponse)
def predict_breast(req: BreastInput):
    """Breast cancer risk: probability = P(malignant) (class 0 in sklearn encoding)."""
    if breast_model is None or breast_scaler is None:
        raise HTTPException(status_code=503, detail="Breast model not loaded. Run FL training first.")

    X = build_breast_vector(req)
    prob_malignant = breast_model.predict_proba(X)[0][0]
    risk_score = compute_risk_score(prob_malignant)

    return RiskResponse(
        probability=round(float(prob_malignant), 4),
        riskScore=risk_score,
        riskLevel=risk_level_for(risk_score),
        modelVersion=MODEL_VERSION,
        source="fl",
    )


@app.get("/model/cardio/status", response_model=ModelStatus)
def cardio_model_status():
    history = load_module_history(CARDIO_DIR / "training_history.json")
    if not history:
        return ModelStatus(currentRound=0, totalRounds=0, lastAccuracy=0.0, lastTrainedAt="")
    last = history[-1]
    return ModelStatus(
        currentRound=last["round"],
        totalRounds=last["round"],
        lastAccuracy=last["accuracy"],
        lastTrainedAt=last["timestamp"],
    )


@app.get("/model/cardio/rounds", response_model=list[RoundRecord])
def cardio_model_rounds():
    return [
        RoundRecord(
            round=r["round"],
            accuracy=r["accuracy"],
            loss=r["loss"],
            numClients=r["numClients"],
            timestamp=r["timestamp"],
        )
        for r in load_module_history(CARDIO_DIR / "training_history.json")
    ]


@app.get("/model/breast/status", response_model=ModelStatus)
def breast_model_status():
    history = load_module_history(BREAST_DIR / "training_history.json")
    if not history:
        return ModelStatus(currentRound=0, totalRounds=0, lastAccuracy=0.0, lastTrainedAt="")
    last = history[-1]
    return ModelStatus(
        currentRound=last["round"],
        totalRounds=last["round"],
        lastAccuracy=last["accuracy"],
        lastTrainedAt=last["timestamp"],
    )


@app.get("/model/breast/rounds", response_model=list[RoundRecord])
def breast_model_rounds():
    return [
        RoundRecord(
            round=r["round"],
            accuracy=r["accuracy"],
            loss=r["loss"],
            numClients=r["numClients"],
            timestamp=r["timestamp"],
        )
        for r in load_module_history(BREAST_DIR / "training_history.json")
    ]


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
