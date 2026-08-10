"""
task.py — Data loading, preprocessing, partitioning, and model helpers
for the Federated Breast Cancer Prediction model.

Dataset: Breast Cancer Wisconsin (Diagnostic) — 569 samples
Features: 10 cell-nucleus mean measurements
Target:   diagnosis (0 = Malignant, 1 = Benign)  [sklearn load_breast_cancer encoding]
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
    "mean radius",
    "mean texture",
    "mean perimeter",
    "mean area",
    "mean smoothness",
    "mean compactness",
    "mean concavity",
    "mean concave points",
    "mean symmetry",
    "mean fractal dimension",
]
UNIQUE_LABELS = [0, 1]

# API field -> Wisconsin feature index mapping (from the Breast Cancer form)
# Feature order: [radius, texture, perimeter, area, smoothness, compactness,
#                 concavity, concave points, symmetry, fractal dimension]
API_FIELD_MAP = {
    "radiusMean": 0,          # mean radius
    "textureMean": 1,         # mean texture
    "perimeterMean": 2,       # mean perimeter
    "areaMean": 3,            # mean area
    "smoothnessMean": 4,      # mean smoothness
    "concavityMean": 6,       # mean concavity
    "concavePointsMean": 7,   # mean concave points
}
DEFAULT_VALUES = {
    5: 0.0,   # mean compactness — not collected by form
    8: 0.0,   # mean symmetry — not collected by form
    9: 0.0,   # mean fractal dimension — not collected by form
}


# ---------------------------------------------------------------------------
# 1. Data Loading & Preprocessing
# ---------------------------------------------------------------------------

def load_breast_data() -> pd.DataFrame:
    """Load the Breast Cancer Wisconsin dataset (rebuilds cache if needed).

    Flower's runtime copies task.py to an isolated directory, so the cached
    CSV is rebuilt from sklearn on first use inside that runtime.
    """
    cache_path = DATA_DIR / "breast_cancer.csv"
    if not cache_path.exists():
        from sklearn.datasets import load_breast_cancer

        data = load_breast_cancer()
        frame = pd.DataFrame(data.data, columns=data.feature_names)
        frame["target"] = data.target
        frame.to_csv(cache_path, index=False)

    return pd.read_csv(cache_path)


def preprocess(df: pd.DataFrame):
    """
    Full preprocessing pipeline:
      1. Select the 10 mean-feature columns
      2. Separate features / target
      3. StandardScaler fit-transform
    Returns: X_scaled, y, scaler, feature_names
    """
    df = df.copy()

    feature_cols = FEATURE_NAMES
    X = df[feature_cols].values.astype(np.float64)
    y = df["target"].values.astype(np.int64)

    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)

    return X_scaled, y, scaler, feature_cols


# ---------------------------------------------------------------------------
# 2. Flower-compatible Data Loading
# ---------------------------------------------------------------------------

_cached_data = None


def load_data(partition_id: int, num_partitions: int):
    """
    Load and partition Breast Cancer data for a given client.
    Returns: X_train, y_train, X_test, y_test
    """
    global _cached_data
    if _cached_data is None:
        df = load_breast_data()
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
        df = load_breast_data()
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
    Split training data into `num_clients` shards (IID by default).
    """
    rng = np.random.RandomState(seed)
    n = len(X)

    if iid:
        indices = rng.permutation(n)
    else:
        radius_col = 0
        indices = np.argsort(X[:, radius_col])

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
# 5. Training History Persistence
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
