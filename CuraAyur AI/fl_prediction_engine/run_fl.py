"""
run_fl.py — Run FL simulation + baseline comparison.
Usage: python run_fl.py
"""

import warnings
from pathlib import Path

import joblib
import numpy as np
from sklearn.linear_model import LogisticRegression

from task import (
    create_model,
    evaluate,
    get_model_params,
    load_data,
    load_pima_data,
    log_round,
    preprocess,
    set_model_params,
)


def run_baseline():
    """Train non-federated baseline on full dataset."""
    print("=" * 55)
    print("  BASELINE: Non-Federated LogisticRegression (full data)")
    print("=" * 55)

    df = load_pima_data()
    X, y, scaler, _ = preprocess(df)

    with warnings.catch_warnings():
        warnings.simplefilter("ignore")
        model = LogisticRegression(max_iter=1000, solver="lbfgs", C=1.0, random_state=42)
        model.fit(X, y)

    metrics = evaluate(model, X, y)
    print(f"  Accuracy : {metrics['accuracy']:.4f}")
    print(f"  Loss     : {metrics['loss']:.4f}")

    Path("models").mkdir(exist_ok=True)
    joblib.dump(model, "models/diabetes_baseline_model.joblib")
    joblib.dump(scaler, "models/diabetes_baseline_scaler.joblib")
    return metrics


def run_local_fl(num_rounds: int = 10, num_clients: int = 3):
    """
    Simulate FL locally (without Flower's infrastructure) for quick comparison.
    This is a simplified version for demonstration.
    """
    print("=" * 55)
    print(f"  FL SIMULATION: {num_rounds} rounds, {num_clients} hospitals")
    print("=" * 55)

    df = load_pima_data()
    X, y, scaler, _ = preprocess(df)

    # Partition data
    rng = np.random.RandomState(42)
    indices = rng.permutation(len(X))
    shards_X = []
    shards_y = []
    chunks = np.array_split(indices, num_clients)
    for chunk in chunks:
        shards_X.append(X[chunk])
        shards_y.append(y[chunk])

    # Initialize global model
    global_model = create_model()

    for round_num in range(1, num_rounds + 1):
        # Each client trains locally
        local_params = []
        local_sizes = []

        for i in range(num_clients):
            local_model = create_model()
            set_model_params(local_model, get_model_params(global_model))

            with warnings.catch_warnings():
                warnings.simplefilter("ignore")
                local_model.fit(shards_X[i], shards_y[i])

            local_params.append(get_model_params(local_model))
            local_sizes.append(len(shards_X[i]))

        # FedAvg aggregation (weighted average)
        total_size = sum(local_sizes)
        avg_coef = np.zeros_like(local_params[0][0])
        avg_intercept = np.zeros_like(local_params[0][1])

        for params, size in zip(local_params, local_sizes):
            weight = size / total_size
            avg_coef += weight * params[0]
            avg_intercept += weight * params[1]

        set_model_params(global_model, [avg_coef, avg_intercept])

        # Evaluate on full test set (use last 20% of all data)
        split = int(0.8 * len(X))
        X_test = X[split:]
        y_test = y[split:]
        metrics = evaluate(global_model, X_test, y_test)

        log_round(round_num, metrics["accuracy"], metrics["loss"], num_clients)
        print(f"  Round {round_num:2d}: accuracy={metrics['accuracy']:.4f}, loss={metrics['loss']:.4f}")

    # Save final FL model
    Path("models").mkdir(exist_ok=True)
    joblib.dump(global_model, "models/diabetes_fl_model.joblib")
    joblib.dump(scaler, "models/diabetes_scaler.joblib")

    return evaluate(global_model, X, y)


if __name__ == "__main__":
    print("\n[1/2] Training baseline...")
    baseline_metrics = run_baseline()

    print("\n[2/2] Running FL simulation...")
    fl_metrics = run_local_fl(num_rounds=10, num_clients=3)

    print("\n" + "=" * 55)
    print("  COMPARISON: Baseline vs Federated Learning")
    print("=" * 55)
    print(f"  {'Metric':<12} {'Baseline':>10} {'FL':>10}")
    print(f"  {'-'*12} {'-'*10} {'-'*10}")
    print(f"  {'Accuracy':<12} {baseline_metrics['accuracy']:>10.4f} {fl_metrics['accuracy']:>10.4f}")
    print(f"  {'Loss':<12} {baseline_metrics['loss']:>10.4f} {fl_metrics['loss']:>10.4f}")
    print("=" * 55)
    print("\nModels saved to models/")
    print("Training history saved to training_history.json")
