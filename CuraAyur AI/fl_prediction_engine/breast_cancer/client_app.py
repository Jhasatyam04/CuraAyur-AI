"""
client_app.py — Flower ClientApp for Breast Cancer FL.

Each simulated hospital runs this client locally. The client receives the
global model, trains on its local data shard, evaluates, and returns
updated parameters plus metrics to the server for aggregation.
"""

import warnings

from flwr.app import ArrayRecord, Context, Message, MetricRecord, RecordDict
from flwr.clientapp import ClientApp
from sklearn.metrics import log_loss

from task import (
    UNIQUE_LABELS,
    create_model,
    get_model_params,
    load_data,
    set_model_params,
)

app = ClientApp()


@app.train()
def train(msg: Message, context: Context):
    """Train the global model on local hospital data.

    Receives the current global model parameters, fits on the local
    data shard for a few epochs, and returns updated parameters along
    with training metrics (logloss, accuracy, sample count).
    """
    model = create_model()
    ndarrays = msg.content["arrays"].to_numpy_ndarrays()
    set_model_params(model, ndarrays)

    partition_id = context.node_config["partition-id"]
    num_partitions = context.node_config["num-partitions"]
    X_train, y_train, _, _ = load_data(partition_id, num_partitions)

    with warnings.catch_warnings():
        warnings.simplefilter("ignore")
        model.fit(X_train, y_train)

    y_train_proba = model.predict_proba(X_train)
    train_logloss = log_loss(y_train, y_train_proba, labels=UNIQUE_LABELS)
    train_accuracy = model.score(X_train, y_train)

    ndarrays = get_model_params(model)
    model_record = ArrayRecord(ndarrays)
    metrics = MetricRecord({
        "num-examples": len(X_train),
        "train_logloss": train_logloss,
        "train_accuracy": train_accuracy,
    })
    content = RecordDict({"arrays": model_record, "metrics": metrics})
    return Message(content=content, reply_to=msg)


@app.evaluate()
def evaluate(msg: Message, context: Context):
    """Evaluate the global model on local hospital data.

    Receives the current global model parameters, evaluates on the
    local test shard, and returns evaluation metrics (logloss, accuracy,
    sample count) without returning model updates.
    """
    model = create_model()
    ndarrays = msg.content["arrays"].to_numpy_ndarrays()
    set_model_params(model, ndarrays)

    partition_id = context.node_config["partition-id"]
    num_partitions = context.node_config["num-partitions"]
    _, _, X_test, y_test = load_data(partition_id, num_partitions)

    y_test_proba = model.predict_proba(X_test)
    accuracy = model.score(X_test, y_test)
    loss = log_loss(y_test, y_test_proba, labels=UNIQUE_LABELS)

    metrics = MetricRecord({
        "num-examples": len(X_test),
        "test_logloss": loss,
        "accuracy": accuracy,
    })
    content = RecordDict({"metrics": metrics})
    return Message(content=content, reply_to=msg)
