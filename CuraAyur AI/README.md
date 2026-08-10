<div align="center">

```
+::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::+
:                                                                          :
:     _____                 ___                  ___    ____               :
:    / ___/   ___________  /   | __  ____  _______/   |  /  _/             :
:   / /   / / / / ___/ __ \/ /| |/ / / / / / / ___/ /| |  / /              :
:  / /___/ /_/ / /  / /_/ / ___ / /_/ / /_/ / /  / ___ |_/ /               :
:  \____/\__,_/_/   \__,_/_/  |_\__, /\__,_/_/  /_/  |_/___/               :
:                              /____/                                      :
:                                                                          :
│                                                                          │
│                          CuraAyur AI by Kumar                            │
└──────────────────────────────────────────────────────────────────────────┘
```

# CuraAyur AI

**Full-Stack · Federated Learning · Generative AI · Multi-Disciplinary**

</div>

***

## What is CuraAyur AI?

CuraAyur AI is an advanced, full-stack predictive healthcare platform written in TypeScript and Python. It is designed for medical professionals, researchers, and patients who need a highly accurate, portable intelligence system that predicts disease risks (Cardiovascular, Diabetes, Breast Cancer) and synthesizes multi-disciplinary treatment pathways.

Unlike traditional symptom checkers — which are **static, rule-based lookup tables** — CuraAyur AI is an **active predictive engine**: it evaluates live patient telemetry against trained Federated Learning models and utilizes the Google Gemini LLM to generate dynamic lifestyle, dietary, and alternative medicine (Ayurvedic/Homeopathic) recommendations instantly.

***

## Key Features

- **Multi-disciplinary synthesis** — dynamically bridges Allopathic diagnostics with Ayurvedic and Homeopathic therapeutic recommendations.
- **Federated Learning integration** — highly accurate predictive models for Cardiovascular Disease, Diabetes, and Breast Cancer using Scikit-Learn `joblib` binaries.
- **GenAI recommendation engine** — native integration with the Google Gemini API to produce context-aware lifestyle and habit modifications on the fly.
- **Clinical Validation Index (CVI)** — a dedicated interface for clinical professionals to review, authenticate, and validate AI outcomes against traditional medical standards.
- **Unified microservices architecture** — seamless inter-process communication between a Node.js Auth/GenAI gateway and an isolated Python FastAPI ML engine.
- **Containerized deployment** — single-command `docker run` provisioning for AWS EC2 or ECS deployment.

***

## Installation

### Requirements

| Requirement | Version |
|---|---|
| Node.js | ≥ 18 |
| Python | ≥ 3.10 |
| Docker | Optional (for containerization) |

### Build from source

```bash
# 1. Clone the repository
git clone https://github.com/Jhasatyam04/CuraAyur-AI.git
cd CuraAyur-AI

# 2. Install Node.js backend/frontend dependencies
cd "CuraAyur AI"
npm install

# 3. Setup the SQLite Database
npx prisma migrate dev --name init

# 4. Install Python ML engine dependencies
cd ../fl_prediction_engine
pip install -r requirements.txt
```

### Configure Environment

Create a `.env` file in the `CuraAyur AI/CuraAyur AI` directory:

```env
PORT=3000
JWT_SECRET=your_secure_jwt_secret
GEMINI_API_KEY=your_google_gemini_key
DATABASE_URL="file:./dev.db"
```

***

## Usage

```bash
# Start the unified Node + Python environment
npm run dev
```

The system orchestrator will automatically bind the UI/API to `http://localhost:3000` and spawn the Python ML Microservice silently on port `8000`.

### Docker Deployment (AWS/EC2)

```bash
# Build the unified container
docker build -t curaayur .

# Run detached with environment variables
docker run -d -p 3000:3000 -e GEMINI_API_KEY="YOUR_KEY" -e JWT_SECRET="YOUR_SECRET" curaayur
```

***

## Output Structure

Predictions and recommendations are routed dynamically through the `PredictionController`.

Example GenAI + ML JSON payload returned to the frontend:

```json
{
  "prediction": "High Risk",
  "probability": 87.5,
  "recommendations": {
    "food": [
      "Increase intake of leafy greens and high-fiber legumes.",
      "Reduce sodium to < 1500mg daily."
    ],
    "lifestyle": [
      "Engage in 150 minutes of moderate aerobic activity weekly.",
      "Practice mindfulness to reduce cortisol."
    ],
    "medicine": [
      "Consult physician for ACE inhibitors or Beta-blockers."
    ],
    "ayurveda": [
      "Incorporate Arjuna bark tea to support cardiac function."
    ]
  }
}
```

***

## Project Structure

```
CuraAyur-AI/
├── Dockerfile                  ← Multi-stage deployment build
├── README.md
├── fl_prediction_engine/       ← Python Microservice (ML)
│   ├── serving/
│   │   └── main.py             ← FastAPI endpoints
│   ├── models/                 ← Compiled .joblib weights & scalers
│   └── data/                   
└── CuraAyur AI/                ← Node.js Gateway & UI
    ├── src/
    │   ├── controllers/        ← Express Route Controllers
    │   ├── services/           
    │   │   ├── authService.ts  ← JWT & Crypto
    │   │   ├── mlService.ts    ← REST client to Python engine
    │   │   └── genAiService.ts ← Gemini LLM orchestrator
    │   └── server.ts           ← Entrypoint & Spawner
    ├── prisma/                 ← SQLite Schema & Migrations
    └── *.html / *.js           ← Vanilla Frontend Client
```

### Module Boundaries (Minimal Coupling)

Each layer is strictly decoupled to ensure the AI logic does not interfere with client telemetry or authentication.

| Module | Responsibility | Protocol |
|---|---|---|
| **Vanilla UI** | Client state, JWT injection, DOM rendering | HTTP/JSON |
| **Node API** | Authentication, Route guarding, LLM synthesis | REST |
| **ML Engine** | Feature scaling, Risk calculation, Probability output | REST (Internal) |
| **Prisma** | Session persistence and User schemas | SQLite |

***

## CuraAyur AI vs WebMD / Symptom Checkers

CuraAyur AI and traditional symptom checkers serve **fundamentally different purposes**. The table below clarifies the architectural distinction.

| Dimension | CuraAyur AI | WebMD / Standard Checkers |
|---|---|---|
| **Primary purpose** | Predictive Risk Engine | Reactive Symptom Lookup |
| **Intelligence** | Machine Learning (FL) + GenAI | Static Decision Trees |
| **Clinical Validation** | ✅ CVI (Clinical Validation Index) | ❌ None (Disclaimer only) |
| **Medical Paradigms** | Allopathy + Ayurveda + Homeopathy | Allopathy only |
| **Architecture** | Microservices (Node + Python) | Monolithic Web Server |
| **Data Flow** | Telemetry → ML Risk → LLM Context | Keyword Search → Database |
| **Target Audience** | Clinicians, Researchers, Patients | General Public |

### When to use which

- **CuraAyur AI** — when you have structured patient telemetry (e.g., BMI, Glucose levels, Blood Pressure) and need a highly-accurate statistical probability of disease onset paired with contextual, multi-disciplinary treatments.
- **Standard Checkers** — when you have a minor, unquantified symptom (e.g., "headache") and want to read general encyclopedic information.

***

## Security Note

CuraAyur AI processes sensitive health metrics. While the `dev.db` SQLite database is suitable for local development and academic environments, production deployments must ensure:
1. Environment variables (`JWT_SECRET`, `GEMINI_API_KEY`) are injected securely via AWS Secrets Manager or ECS Task Definitions.
2. The Node.js application is placed behind a Reverse Proxy (Nginx/ALB) with SSL/TLS termination.

***

## License

```
CuraAyur AI — Full-Stack Predictive Healthcare Platform
Copyright (C) 2026  Kumar

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU General Public License for more details.
```

***

<div align="center">
Built by Kumar · Final Year Project · 2026
</div>
