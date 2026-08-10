"""
task.py — Data loading, preprocessing, partitioning, and model helpers
for the Rule-Based Federated Model for Early Diabetes Prediction.

Dataset: Pima Indians Diabetes Dataset (OpenML ID 37)
Features: Pregnancies, Glucose, BloodPressure, SkinThickness, Insulin,
          BMI, DiabetesPedigreeFunction, Age
Target:   Outcome (0 = No Diabetes, 1 = Diabetes)
"""

import json
from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.datasets import fetch_openml
from sklearn.linear_model import LogisticRegression
from sklearn.preprocessing import StandardScaler

DATA_DIR = Path(__file__).parent / "data"
DATA_DIR.mkdir(exist_ok=True)

ZERO_COLS = ["plas", "pres", "skin", "insu", "mass"]

FEATURE_NAMES = ["preg", "plas", "pres", "skin", "insu", "mass", "pedi", "age"]
UNIQUE_LABELS = [0, 1]

# API field -> Pima feature index mapping (Option A: 4 fields from form)
API_FIELD_MAP = {
    "fastingGlucose": 1,  # plas
    "bp": 2,              # pres
    "bmi": 5,             # mass
    "age": 7,             # age
}
DEFAULT_VALUES = {
    0: 0.0,   # preg — default 0
    3: 0.0,   # skin — default 0 (will be median-imputed by scaler)
    4: 0.0,   # insu — default 0
    6: 0.0,   # pedi — default 0
}


# ---------------------------------------------------------------------------
# 1. Data Loading & Preprocessing
# ---------------------------------------------------------------------------

def load_pima_data() -> pd.DataFrame:
    """Download Pima Indians Diabetes Dataset from OpenML and return as DataFrame."""
    cache_path = DATA_DIR / "pima.csv"
    if cache_path.exists():
        return pd.read_csv(cache_path)

    pima = fetch_openml(data_id=37, as_frame=True, parser="auto")
    df = pima.frame.copy()

    # Ensure target is binary 0/1
    if df["class"].dtype.name == "category" or df["class"].dtype == object:
        df["class"] = df["class"].map({"tested_negative": 0, "tested_positive": 1})
    df["class"] = df["class"].astype(int)
    df.rename(columns={"class": "Outcome"}, inplace=True)

    df.to_csv(cache_path, index=False)
    return df


def median_impute(df: pd.DataFrame) -> pd.DataFrame:
    """Replace 0-values in clinical columns with column median."""
    df = df.copy()
    rename_map = {
        "Glucose": "plas", "BloodPressure": "pres",
        "SkinThickness": "skin", "Insulin": "insu", "BMI": "mass",
    }
    df.rename(columns=rename_map, inplace=True, errors="ignore")
    for col in ZERO_COLS:
        if col in df.columns:
            median_val = df.loc[df[col] > 0, col].median()
            df.loc[df[col] == 0, col] = median_val
    return df


def preprocess(df: pd.DataFrame):
    """
    Full preprocessing pipeline:
      1. Median-impute zero-values
      2. Separate features / target
      3. StandardScaler fit-transform
    Returns: X_scaled, y, scaler, feature_names
    """
    df = median_impute(df)

    feature_cols = [c for c in df.columns if c != "Outcome"]
    X = df[feature_cols].values.astype(np.float64)
    y = df["Outcome"].values.astype(np.int64)

    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)

    return X_scaled, y, scaler, feature_cols


# ---------------------------------------------------------------------------
# 2. Flower-compatible Data Loading
# ---------------------------------------------------------------------------

_cached_data = None


def load_data(partition_id: int, num_partitions: int):
    """
    Load and partition Pima data for a given client.
    Returns: X_train, y_train, X_test, y_test
    """
    global _cached_data
    if _cached_data is None:
        df = load_pima_data()
        X, y, scaler, _ = preprocess(df)

        # Shuffle indices
        rng = np.random.RandomState(42)
        indices = rng.permutation(len(X))
        chunks = np.array_split(indices, num_partitions)

        shards = []
        for chunk in chunks:
            shards.append((X[chunk], y[chunk]))
        _cached_data = {"shards": shards, "scaler": scaler}

    shard_X, shard_y = _cached_data["shards"][partition_id]

    # 80/20 train/test split within the shard
    n = len(shard_X)
    split = int(0.8 * n)
    X_train, X_test = shard_X[:split], shard_X[split:]
    y_train, y_test = shard_y[:split], shard_y[split:]

    return X_train, y_train, X_test, y_test


def get_scaler() -> StandardScaler:
    """Return the fitted scaler (for saving to disk)."""
    global _cached_data
    if _cached_data is None:
        df = load_pima_data()
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
        age_col = 7
        sorted_idx = np.argsort(X[:, age_col])
        indices = sorted_idx

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
    n_classes = 2
    n_features = len(FEATURE_NAMES)
    model.classes_ = np.array([0, 1])
    model.coef_ = np.zeros((1, n_features))
    model.intercept_ = np.zeros((1,))


def create_model() -> LogisticRegression:
    """Create a fresh LogisticRegression with warm_start for FL."""
    model = LogisticRegression(
        warm_start=True,
        max_iter=1,
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
# 5. Training History Persistence
# ---------------------------------------------------------------------------

# Uses Path.cwd() instead of Path(__file__).parent because Flower's runtime
# environment copies task.py to an isolated directory; CWD always points to
# the workspace root where training_history.json should persist.
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
