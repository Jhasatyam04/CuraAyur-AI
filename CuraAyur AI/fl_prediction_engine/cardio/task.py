"""
task.py — Data loading, preprocessing, partitioning, and model helpers
for the Federated Cardiovascular Disease Prediction model.

Dataset: UCI Cardiovascular Disease Dataset (70,000 patients)
Features: age (years), gender, height (cm), weight (kg), ap_hi (systolic BP),
          ap_lo (diastolic BP), cholesterol, gluc, smoke, alco, active
Target:   cardio (0 = No Disease, 1 = Disease)
"""

import json
from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.linear_model import LogisticRegression
from sklearn.preprocessing import StandardScaler

DATA_DIR = Path(__file__).parent / "data"
DATA_DIR.mkdir(exist_ok=True)

FEATURE_NAMES = [
    "age", "gender", "height", "weight",
    "ap_hi", "ap_lo", "cholesterol", "gluc",
    "smoke", "alco", "active",
]
UNIQUE_LABELS = [0, 1]

# API field -> Cardio feature index mapping (from the Cardio web form)
# Cardio order: [age, gender, height, weight, ap_hi, ap_lo, cholesterol, gluc, smoke, alco, active]
API_FIELD_MAP = {
    "age": 0,          # age (years)
    "sex": 1,          # gender — male -> 2, female -> 1
    "height": 2,       # height (cm)
    "weight": 3,       # weight (kg)
    "bp": 4,           # ap_hi — systolic blood pressure
    "cholesterol": 6,  # cholesterol — category from mg/dl
    "glucose": 7,      # gluc — category from mg/dl
}
DEFAULT_VALUES = {
    5: 0.0,    # ap_lo — diastolic BP (not collected by form)
    8: 0.0,    # smoke — assume non-smoker
    9: 0.0,    # alco  — assume non-drinker
    10: 1.0,   # active — assume physically active
}


# ---------------------------------------------------------------------------
# 1. Data Loading & Preprocessing
# ---------------------------------------------------------------------------

def load_cardio_data() -> pd.DataFrame:
    """Load the UCI Cardiovascular dataset (downloads + caches if needed).

    Flower's runtime copies task.py to an isolated directory, so the cached
    CSV is downloaded on first use inside that runtime and cached to disk.
    """
    cache_path = DATA_DIR / "cardio.csv"
    if not cache_path.exists():
        _download_cardio(cache_path)

    df = pd.read_csv(cache_path)
    df["age"] = (df["age"] / 365.25).round(0)  # days -> years
    return df


def _download_cardio(cache_path: Path) -> None:
    """Download the UCI Cardiovascular dataset from its GitHub mirror."""
    import io
    import urllib.request

    url = "https://github.com/caravanuden/cardio/raw/refs/heads/master/cardio_train.csv"
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    raw = urllib.request.urlopen(req, timeout=90).read()
    df = pd.read_csv(io.BytesIO(raw), sep=";")
    df.to_csv(cache_path, index=False)


def clean_outliers(df: pd.DataFrame) -> pd.DataFrame:
    """Drop physiologically implausible records (standard cardio pre-processing)."""
    df = df.copy()
    df = df[df["height"] >= 120]
    df = df[df["height"] <= 220]
    df = df[(df["weight"] >= 30) & (df["weight"] <= 200)]
    df = df[df["ap_hi"] > df["ap_lo"]]
    df = df[(df["ap_hi"] >= 90) & (df["ap_hi"] <= 220)]
    df = df[(df["ap_lo"] >= 60) & (df["ap_lo"] <= 140)]
    df = df[df["gender"].isin([1, 2])]
    return df.reset_index(drop=True)


def preprocess(df: pd.DataFrame):
    """
    Full preprocessing pipeline:
      1. Clean implausible records
      2. Separate features / target
      3. StandardScaler fit-transform
    Returns: X_scaled, y, scaler, feature_names
    """
    df = clean_outliers(df)

    feature_cols = FEATURE_NAMES
    X = df[feature_cols].values.astype(np.float64)
    y = df["cardio"].values.astype(np.int64)

    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)

    return X_scaled, y, scaler, feature_cols


# ---------------------------------------------------------------------------
# 2. Flower-compatible Data Loading
# ---------------------------------------------------------------------------

_cached_data = None


def load_data(partition_id: int, num_partitions: int):
    """
    Load and partition Cardio data for a given client.
    Returns: X_train, y_train, X_test, y_test
    """
    global _cached_data
    if _cached_data is None:
        df = load_cardio_data()
        X, y, scaler, _ = preprocess(df)

        rng = np.random.RandomState(42)
        indices = rng.permutation(len(X))
        chunks = np.array_split(indices, num_partitions)

        shards = []
        for chunk in chunks:
            shards.append((X[chunk], y[chunk]))
        _cached_data = {"shards": shards, "scaler": scaler}

    shard_X, shard_y = _cached_data["shards"][partition_id]

    n = len(shard_X)
    split = int(0.8 * n)
    X_train, X_test = shard_X[:split], shard_X[split:]
    y_train, y_test = shard_y[:split], shard_y[split:]

    return X_train, y_train, X_test, y_test


def get_scaler() -> StandardScaler:
    """Return the fitted scaler (for saving to disk)."""
    global _cached_data
    if _cached_data is None:
        df = load_cardio_data()
        _, _, scaler, _ = preprocess(df)
        _cached_data = {"shards": [], "scaler": scaler}
    return _cached_data["scaler"]


# ---------------------------------------------------------------------------
# 3. Data Partitioning — 3 Hospital Shards (standalone use)
# ---------------------------------------------------------------------------

def partition_data(
    X: np.ndarray,
    y: np.ndarray,
    num_clients: int = 3,
    iid: bool = True,
    seed: int = 42,
) -> list[dict]:
    """
    Split training data into `num_clients` shards.
    iid=True  → random shuffle split (IID)
    iid=False → sort by age then chunk (mild non-IID)
    """
    rng = np.random.RandomState(seed)
    n = len(X)

    if iid:
        indices = rng.permutation(n)
    else:
        age_col = 0
        indices = np.argsort(X[:, age_col])

    shards = []
    chunks = np.array_split(indices, num_clients)
    for i, chunk in enumerate(chunks):
        shards.append({
            "client_id": f"hospital_{i + 1}",
            "X": X[chunk],
            "y": y[chunk],
            "n_samples": len(chunk),
        })
    return shards


# ---------------------------------------------------------------------------
# 4. Model Helpers — LogisticRegression parameter exchange
# ---------------------------------------------------------------------------

def set_initial_params(model: LogisticRegression):
    """Set initial parameters as zeros so model is ready before first fit."""
    n_features = len(FEATURE_NAMES)
    model.classes_ = np.array([0, 1])
    model.coef_ = np.zeros((1, n_features))
    model.intercept_ = np.zeros((1,))


def create_model() -> LogisticRegression:
    """Create a fresh LogisticRegression with warm_start for FL."""
    model = LogisticRegression(
        warm_start=True,
        max_iter=5,
        solver="lbfgs",
        C=1.0,
        random_state=42,
    )
    set_initial_params(model)
    return model


def get_model_params(model: LogisticRegression) -> list[np.ndarray]:
    """Extract coef_ and intercept_ as list of numpy arrays (for ArrayRecord)."""
    params = [model.coef_]
    if model.fit_intercept:
        params.append(model.intercept_)
    return params


def set_model_params(model: LogisticRegression, params: list[np.ndarray]):
    """Set coef_ and intercept_ from a list of numpy arrays."""
    model.coef_ = params[0]
    if model.fit_intercept and len(params) > 1:
        model.intercept_ = params[1]
    return model


def evaluate(model: LogisticRegression, X: np.ndarray, y: np.ndarray) -> dict:
    """Return accuracy and loss for a fitted model."""
    from sklearn.metrics import accuracy_score, log_loss
    y_pred = model.predict(X)
    y_proba = model.predict_proba(X)
    acc = accuracy_score(y, y_pred)
    loss = float(log_loss(y, y_proba, labels=UNIQUE_LABELS))
    return {"accuracy": float(acc), "loss": loss}


# ---------------------------------------------------------------------------
# 5. Domain Helpers — UI field conversions
# ---------------------------------------------------------------------------

def cholesterol_to_category(mgdl: float) -> int:
    """Map total cholesterol (mg/dl) to the cardio dataset category (1-3)."""
    if mgdl >= 240:
        return 3   # well above normal
    if mgdl >= 200:
        return 2   # above normal
    return 1       # normal


def glucose_to_category(mgdl: float) -> int:
    """Map fasting glucose (mg/dl) to the cardio dataset category (1-3)."""
    if mgdl >= 126:
        return 3   # well above normal
    if mgdl >= 100:
        return 2   # above normal
    return 1       # normal


def sex_to_gender(sex: str) -> int:
    """Map UI sex ('male'/'female') to the cardio dataset gender (2=male, 1=female)."""
    return 2 if sex == "male" else 1


# ---------------------------------------------------------------------------
# 6. Training History Persistence
# ---------------------------------------------------------------------------

# Uses Path.cwd() instead of Path(__file__).parent because Flower's runtime
# environment copies task.py to an isolated directory; CWD always points to
# the engine directory where training_history.json should persist.
HISTORY_PATH = Path.cwd() / "training_history.json"


def log_round(
    round_num: int,
    accuracy: float,
    loss: float,
    num_clients: int,
) -> None:
    """Append a round record to training_history.json."""
    from datetime import datetime, timezone

    history = []
    if HISTORY_PATH.exists():
        with open(HISTORY_PATH, "r") as f:
            history = json.load(f)

    history.append({
        "round": round_num,
        "accuracy": round(accuracy, 4),
        "loss": round(loss, 4),
        "numClients": num_clients,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    })

    with open(HISTORY_PATH, "w") as f:
        json.dump(history, f, indent=2)


def load_history() -> list[dict]:
    """Load full training history."""
    if HISTORY_PATH.exists():
        with open(HISTORY_PATH, "r") as f:
            return json.load(f)
    return []
