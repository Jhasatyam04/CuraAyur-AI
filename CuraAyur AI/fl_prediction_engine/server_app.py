"""
server_app.py — Flower ServerApp for Diabetes FL.

Runs FedAvg aggregation for N rounds across simulated hospital clients,
logs per-round metrics to training_history.json, and persists the final
global model + scaler to the models/ directory.
"""

import joblib
from pathlib import Path

from flwr.app import ArrayRecord, Context
from flwr.serverapp import Grid, ServerApp
from flwr.serverapp.strategy import FedAvg

from task import (
    create_model,
    get_model_params,
    log_round,
    set_model_params,
    get_scaler,
)

app = ServerApp()


def make_evaluate_metrics_fn():
    """Return an evaluate_metrics_aggregation_fn that logs each round."""

    _round_counter = [0]

    def aggregate_fn(eval_results, config=None):
        """Aggregate evaluation metrics from all participating clients.

        Args:
            eval_results: List of RecordDict objects from each client.
            config: Optional configuration string (unused).

        Returns:
            Aggregated metrics dictionary with weighted averages.
        """
        _round_counter[0] += 1
        total_examples = 0
        weighted_loss = 0.0
        weighted_acc = 0.0

        for record in eval_results:
            for _key, metric_entry in record.metric_records.items():
                num_examples = metric_entry.get("num-examples", 1)
                total_examples += num_examples
                weighted_loss += metric_entry.get("test_logloss", 0.0) * num_examples
                weighted_acc += metric_entry.get("accuracy", 0.0) * num_examples

        avg_loss = weighted_loss / max(total_examples, 1)
        avg_acc = weighted_acc / max(total_examples, 1)

        log_round(
            round_num=_round_counter[0],
            accuracy=avg_acc,
            loss=avg_loss,
            num_clients=len(eval_results),
        )
        print(
            f"  [LOG] Round {_round_counter[0]}: "
            f"accuracy={avg_acc:.4f}, loss={avg_loss:.4f}"
        )

        return {
            "accuracy": avg_acc,
            "test_logloss": avg_loss,
            "num-examples": total_examples,
        }

    return aggregate_fn


@app.main()
def main(grid: Grid, context: Context) -> None:
    """Main entry point — run FedAvg for N rounds.

    Reads configuration from pyproject.toml, trains a global LogisticRegression
    model using federated averaging, and saves the result to disk.
    """
    num_rounds: int = context.run_config["num-server-rounds"]
    min_clients: int = context.run_config["min-available-clients"]
    models_dir: str = context.run_config.get("models-dir", "models")

    model = create_model()
    arrays = ArrayRecord(get_model_params(model))

    strategy = FedAvg(
        fraction_train=1.0,
        fraction_evaluate=1.0,
        min_train_nodes=min_clients,
        min_evaluate_nodes=min_clients,
        evaluate_metrics_aggr_fn=make_evaluate_metrics_fn(),
    )

    result = strategy.start(
        grid=grid,
        initial_arrays=arrays,
        num_rounds=num_rounds,
    )

    ndarrays = result.arrays.to_numpy_ndarrays()
    set_model_params(model, ndarrays)

    output_path = Path(models_dir)
    output_path.mkdir(parents=True, exist_ok=True)

    joblib.dump(model, output_path / "diabetes_fl_model.joblib")
    joblib.dump(get_scaler(), output_path / "diabetes_scaler.joblib")

    print(f"\n[SAVED] Model -> {output_path / 'diabetes_fl_model.joblib'}")
    print(f"[SAVED] Scaler -> {output_path / 'diabetes_scaler.joblib'}")
