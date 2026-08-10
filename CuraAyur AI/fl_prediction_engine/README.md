# Diabetes FL Prediction Engine

Federated Learning model for early diabetes prediction using the Pima Indians Diabetes Dataset. Trains a LogisticRegression across 3 simulated hospital clients using Flower, serves predictions via FastAPI.

## Project Structure

```
fl_prediction_engine/
├── task.py              # Data loading, preprocessing, 3-client partitioning, model helpers
├── client_app.py        # Flower ClientApp (1 local epoch per round)
├── server_app.py        # Flower ServerApp (FedAvg with round logging)
├── baseline.py          # Non-federated baseline for comparison
├── run_fl.py            # Local FL simulation + baseline comparison
├── pyproject.toml       # Flower simulation config
├── requirements.txt     # Python dependencies
├── serving/
│   └── main.py          # FastAPI app (/predict, /model/status, /model/rounds, /health)
├── models/              # Saved model + scaler (joblib)
├── data/                # Auto-downloaded Pima dataset (cached)
└── training_history.json  # Per-round accuracy/loss logs
```

## Quick Start

### 1. Install Dependencies

```bash
pip install -r requirements.txt
```

### 2. Run FL Simulation + Baseline Comparison

```bash
python run_fl.py
```

This trains a plain LogisticRegression on the full dataset (baseline) and a federated model across 3 simulated hospitals, then prints a side-by-side comparison.

Output:
```
BASELINE: Non-Federated LogisticRegression (full data)
  Accuracy : 0.7734
  Loss     : 0.4641

FL SIMULATION: 10 rounds, 3 hospitals
  Round  1: accuracy=0.7532, loss=0.5210
  ...
  Round 10: accuracy=0.7727, loss=0.4734

COMPARISON: Baseline vs Federated Learning
  Metric         Baseline         FL
  Accuracy         0.7734     0.7747
  Loss             0.4641     0.4645
```

### 3. Run with Flower Infrastructure (optional)

```bash
flwr run . --stream
```

Uses the Flower Simulation Engine with 3 supernodes and 10 rounds (configured in `pyproject.toml`).

Override settings:
```bash
flwr run . --run-config "num-server-rounds=20" --stream
```

### 4. Start FastAPI Server

```bash
uvicorn serving.main:app --host 0.0.0.0 --port 8000 --reload
```

### API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/predict` | `{fastingGlucose, bp, bmi, age}` → `{probability, modelVersion}` |
| `GET` | `/model/status` | `{currentRound, totalRounds, lastAccuracy, lastTrainedAt}` |
| `GET` | `/model/rounds` | `[{round, accuracy, loss, numClients, timestamp}]` |
| `GET` | `/health` | `{status: "ok"}` |

Test:
```bash
curl -X POST http://localhost:8000/predict \
  -H "Content-Type: application/json" \
  -d '{"fastingGlucose": 148, "bp": 85, "bmi": 33.6, "age": 50}'
```

## Dataset

Pima Indians Diabetes Dataset (OpenML ID 37):
- 768 samples, 8 features
- Features: Pregnancies, Glucose, BloodPressure, SkinThickness, Insulin, BMI, DiabetesPedigreeFunction, Age
- Target: Outcome (0 = No Diabetes, 1 = Diabetes)
- 0-values in Glucose/BP/SkinThickness/Insulin/BMI are median-imputed
- StandardScaler applied to all features

## How It Works

1. **Data Partitioning**: Dataset is split into 3 shards (simulating Hospital 1/2/3). IID mode uses random shuffle; non-IID mode sorts by age then chunks.

2. **Federated Training**: Each hospital trains a LogisticRegression for 1 local epoch per round. The server aggregates using FedAvg (weighted average of model parameters).

3. **Serving**: The final global model + scaler are saved to disk. FastAPI loads them and serves predictions. The `/predict` endpoint accepts 4 fields from the diabetes form and fills defaults for the other 4 Pima features.

4. **Fallback**: The frontend tries the FastAPI endpoint first. If unavailable, it falls back to a local risk computation formula.
