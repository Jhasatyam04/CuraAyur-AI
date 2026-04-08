const express = require("express");
const { requireAuth } = require("../middleware/auth");
const { savePrediction, getPredictionsByUser } = require("../store");
const {
  cardioEngine,
  diabetesEngine,
  breastCancerEngine,
} = require("../services/riskEngine");

const router = express.Router();

const modelMap = {
  cardio: cardioEngine,
  diabetes: diabetesEngine,
  breast_cancer: breastCancerEngine,
};

const recommendationMap = {
  cardio: {
    low: {
      habits: [
        "Maintain regular cardio activity at least 150 minutes per week",
        "Keep sodium intake controlled and hydration adequate",
        "Continue a high-fiber and low-trans-fat diet",
        "Track blood pressure monthly for trend monitoring",
      ],
      clinical: [
        "Annual lipid and glucose profile check",
        "Routine physician follow-up every 6-12 months",
        "Preventive ECG only if symptoms occur",
      ],
    },
    moderate: {
      habits: [
        "Adopt a Mediterranean-style heart-safe meal plan",
        "Reduce saturated fat and processed sugar intake",
        "Complete 30-40 minutes brisk walk at least 5 days/week",
        "Maintain sleep hygiene and stress reduction routine",
      ],
      clinical: [
        "Schedule physician review within 4-8 weeks",
        "Repeat BP and fasting glucose trend check",
        "Discuss preventive pharmacologic options if needed",
      ],
    },
    high: {
      habits: [
        "Begin immediate low-sodium, low-cholesterol meal protocol",
        "Avoid smoking and alcohol until clinical review",
        "Limit high-intensity exertion pending cardiology advice",
        "Monitor BP and pulse daily and record values",
      ],
      clinical: [
        "Consult cardiologist as early as possible",
        "Perform stress test and detailed ECG interpretation",
        "Request lipid, HbA1c, and renal risk panel",
        "Discuss urgent risk management and follow-up plan",
      ],
    },
  },
  diabetes: {
    low: {
      habits: [
        "Maintain balanced meals with low refined sugar",
        "Continue at least 150 minutes of weekly activity",
        "Track body weight and waist trend monthly",
        "Prioritize consistent sleep and stress reduction",
      ],
      clinical: [
        "Repeat fasting glucose in 6-12 months",
        "Annual HbA1c screening recommended",
        "Routine preventive physician review",
      ],
    },
    moderate: {
      habits: [
        "Adopt portion-controlled, low glycemic meal pattern",
        "Increase activity to 30 minutes/day most days",
        "Reduce sugary drinks and late-night eating",
        "Target gradual weight reduction if overweight",
      ],
      clinical: [
        "Repeat fasting glucose and HbA1c within 3 months",
        "Assess BP and lipid profile with physician",
        "Consider structured prediabetes management plan",
      ],
    },
    high: {
      habits: [
        "Start strict carbohydrate quality control",
        "Avoid high-sugar and ultra-processed foods",
        "Daily brisk walk and post-meal activity routine",
        "Monitor fasting glucose regularly",
      ],
      clinical: [
        "Consult endocrinologist or physician promptly",
        "Confirm with repeat HbA1c and fasting panel",
        "Evaluate for diabetes medication eligibility",
        "Create structured follow-up schedule",
      ],
    },
  },
  breast_cancer: {
    low: {
      habits: [
        "Continue routine self-breast awareness monthly",
        "Maintain healthy body weight and activity routine",
        "Limit alcohol intake and avoid smoking",
        "Follow age-appropriate screening schedule",
      ],
      clinical: [
        "Routine annual clinical breast exam",
        "Follow standard screening mammography timeline",
        "Repeat diagnostics only if symptoms emerge",
      ],
    },
    moderate: {
      habits: [
        "Increase physical activity and dietary fiber intake",
        "Reduce processed foods and excess alcohol",
        "Track any breast changes and report promptly",
        "Maintain structured preventive follow-up",
      ],
      clinical: [
        "Schedule specialist review within upcoming weeks",
        "Consider targeted imaging and repeat assessment",
        "Discuss individualized screening interval",
      ],
    },
    high: {
      habits: [
        "Prioritize immediate specialist follow-up",
        "Maintain strict adherence to medical recommendations",
        "Avoid delaying further diagnostic work-up",
        "Ensure family support and follow-up tracking",
      ],
      clinical: [
        "Urgent breast oncology consultation advised",
        "Proceed with confirmatory imaging/biopsy plan",
        "Review pathology and treatment options promptly",
        "Establish multidisciplinary follow-up schedule",
      ],
    },
  },
};

router.use(requireAuth);

router.post("/:model", async (req, res) => {
  const model = req.params.model;
  const engine = modelMap[model];

  if (!engine) {
    return res.status(404).json({ message: "Model not found" });
  }

  try {
    const result = engine(req.body || {});
    const recommendations = recommendationMap[model][result.band];

    const response = {
      model,
      riskScore: result.riskScore,
      band: result.band,
      label: result.label,
      confidence: result.confidence,
      factors: result.factors,
      habits: recommendations.habits,
      clinical: recommendations.clinical,
      generatedAt: new Date().toISOString(),
    };

    await savePrediction({
      userId: req.user.id,
      model,
      input: req.body || {},
      output: response,
    });

    return res.json(response);
  } catch {
    return res.status(400).json({ message: "Invalid prediction payload" });
  }
});

router.get("/history/me", async (req, res) => {
  const history = await getPredictionsByUser(req.user.id);
  return res.json({ count: history.length, items: history });
});

module.exports = router;
