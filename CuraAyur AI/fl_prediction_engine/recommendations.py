"""
recommendations.py — Rule-based clinical recommendation engine for diabetes.

Generates risk-adaptive lifestyle suggestions, clinical recommendations,
and medicine suggestions across three systems of medicine:
  - Allopathy (Modern Medicine)
  - Homeopathy
  - Ayurveda

All recommendations are based on published clinical guidelines
(ADA, WHO, AYUSH) and adapt to individual patient parameters.
"""


def generate_recommendations(risk_score, patient_data):
    """Generate all recommendations based on risk score and patient values.

    Args:
        risk_score: Integer risk percentage (0-100).
        patient_data: Dict with keys: age, glucose, hba1c, bp, bmi,
                      familyHistory, activity, sex.

    Returns:
        Dict with 'lifestyle', 'clinical', 'medicines' keys.
    """
    risk_level = _classify_risk(risk_score)

    lifestyle = _build_lifestyle(risk_level, patient_data)
    clinical = _build_clinical(risk_level, patient_data)
    medicines = _build_medicines(risk_level, patient_data)

    return {
        "riskLevel": risk_level,
        "lifestyle": lifestyle,
        "clinical": clinical,
        "medicines": medicines,
    }


def _classify_risk(score):
    if score < 35:
        return "low"
    if score < 65:
        return "moderate"
    return "high"


# ---------------------------------------------------------------------------
# Lifestyle Recommendations
# ---------------------------------------------------------------------------

def _build_lifestyle(risk, p):
    tips = []

    if p["bmi"] >= 30:
        tips.append({
            "text": "Target gradual weight reduction of 5-7% over 6 months through portion control and balanced meals.",
            "priority": "high",
        })
    elif p["bmi"] >= 25:
        tips.append({
            "text": "Maintain current weight with mindful eating; focus on nutrient-dense foods over calorie restriction.",
            "priority": "medium",
        })
    else:
        tips.append({
            "text": "Maintain healthy BMI with consistent meal timing and adequate protein intake.",
            "priority": "low",
        })

    if p["glucose"] >= 126:
        tips.append({
            "text": "Adopt a strict low-glycemic diet. Replace refined carbohydrates with whole grains, legumes, and vegetables.",
            "priority": "high",
        })
    elif p["glucose"] >= 100:
        tips.append({
            "text": "Follow a moderate glycemic diet. Limit sugary beverages and processed snacks; prefer complex carbohydrates.",
            "priority": "medium",
        })
    else:
        tips.append({
            "text": "Continue balanced meals with controlled portions of carbohydrates and adequate fibre intake.",
            "priority": "low",
        })

    if p["activity"] == "low":
        tips.append({
            "text": "Gradually increase activity to at least 150 minutes of moderate-intensity exercise per week (e.g. brisk walking, cycling).",
            "priority": "high",
        })
    elif p["activity"] == "moderate":
        tips.append({
            "text": "Add 2 days of resistance training per week alongside your current activity routine.",
            "priority": "medium",
        })
    else:
        tips.append({
            "text": "Maintain current exercise regimen. Consider yoga or stretching for stress management.",
            "priority": "low",
        })

    if p["bp"] >= 140:
        tips.append({
            "text": "Reduce dietary sodium to under 2300 mg/day. Avoid pickled, canned, and processed foods.",
            "priority": "high",
        })

    if p["age"] >= 45:
        tips.append({
            "text": "Schedule annual comprehensive metabolic screening including lipid profile and kidney function tests.",
            "priority": "medium",
        })

    if p["familyHistory"] == "yes":
        tips.append({
            "text": "Given family history, maintain strict dietary discipline and monitor fasting glucose every 3 months.",
            "priority": "medium",
        })

    tips.append({
        "text": "Prioritize 7-8 hours of quality sleep nightly and practice stress reduction techniques (meditation, deep breathing).",
        "priority": "low",
    })

    return tips


# ---------------------------------------------------------------------------
# Clinical Recommendations
# ---------------------------------------------------------------------------

def _build_clinical(risk, p):
    items = []

    if risk == "high":
        items.append({
            "text": "Consult an endocrinologist or diabetologist within 1-2 weeks for comprehensive evaluation.",
            "urgency": "urgent",
        })
        items.append({
            "text": "Confirm diagnosis with repeat HbA1c and fasting glucose test within 2 weeks.",
            "urgency": "urgent",
        })
        items.append({
            "text": "Request fasting lipid profile, kidney function (creatinine, eGFR), and urine albumin test.",
            "urgency": "important",
        })
        if p["bp"] >= 140:
            items.append({
                "text": "Blood pressure management is critical — discuss antihypertensive medication with your physician.",
                "urgency": "urgent",
            })
        items.append({
            "text": "Schedule ophthalmology referral for diabetic retinopathy screening within 1 month.",
            "urgency": "important",
        })
    elif risk == "moderate":
        items.append({
            "text": "Repeat fasting glucose and HbA1c within 3 months to track progression.",
            "urgency": "important",
        })
        items.append({
            "text": "Consult physician for a structured prediabetes management plan with dietary and activity goals.",
            "urgency": "important",
        })
        items.append({
            "text": "Get a basic metabolic panel (lipid profile, fasting glucose, HbA1c) done at a diagnostic lab.",
            "urgency": "routine",
        })
        if p["bp"] >= 130:
            items.append({
                "text": "Monitor blood pressure at home weekly and share readings with your physician.",
                "urgency": "important",
            })
    else:
        items.append({
            "text": "Routine screening: repeat fasting glucose and HbA1c in 6-12 months.",
            "urgency": "routine",
        })
        items.append({
            "text": "Annual comprehensive health check-up with lipid profile and metabolic panel.",
            "urgency": "routine",
        })
        items.append({
            "text": "Continue current healthy lifestyle with periodic self-monitoring.",
            "urgency": "routine",
        })

    return items


# ---------------------------------------------------------------------------
# Medicine Recommendations — Three Systems
# ---------------------------------------------------------------------------

def _build_medicines(risk, p):
    allopathy = _allopathy_medicines(risk, p)
    homeopathy = _homeopathy_medicines(risk, p)
    ayurveda = _ayurveda_medicines(risk, p)

    return {
        "allopathy": {
            "system": "Allopathy (Modern Medicine)",
            "disclaimer": "Prescription-only. Must be taken under qualified physician guidance.",
            "medicines": allopathy,
        },
        "homeopathy": {
            "system": "Homeopathy",
            "disclaimer": "Consult a registered homeopath for constitutional remedy selection.",
            "medicines": homeopathy,
        },
        "ayurveda": {
            "system": "Ayurveda",
            "disclaimer": "Use under guidance of a qualified Ayurvedic practitioner.",
            "medicines": ayurveda,
        },
    }


def _allopathy_medicines(risk, p):
    meds = []

    if risk == "high":
        meds.append({
            "name": "Metformin",
            "dosage": "500-1000 mg twice daily",
            "category": "Biguanide",
            "use": "First-line oral medication to lower blood glucose by reducing hepatic glucose production.",
            "icon": "tablet",
        })
        if p["glucose"] >= 180 or p["hba1c"] >= 8.0:
            meds.append({
                "name": "Glimepiride",
                "dosage": "1-2 mg once daily",
                "category": "Sulfonylurea",
                "use": "Stimulates insulin secretion from pancreatic beta cells for additional glucose control.",
                "icon": "tablet",
            })
        if p["bp"] >= 140:
            meds.append({
                "name": "Lisinopril",
                "dosage": "10-20 mg once daily",
                "category": "ACE Inhibitor",
                "use": "Controls blood pressure and provides kidney protection in diabetic patients.",
                "icon": "tablet",
            })
        meds.append({
            "name": "Atorvastatin",
            "dosage": "10-20 mg once daily",
            "category": "Statin",
            "use": "Lipid-lowering agent to reduce cardiovascular risk associated with diabetes.",
            "icon": "capsule",
        })
    elif risk == "moderate":
        meds.append({
            "name": "Metformin",
            "dosage": "500 mg once or twice daily",
            "category": "Biguanide",
            "use": "First-line therapy for prediabetes or early Type 2 diabetes to improve insulin sensitivity.",
            "icon": "tablet",
        })
        meds.append({
            "name": "Voglibose",
            "dosage": "0.2 mg before each main meal",
            "category": "Alpha-glucosidase Inhibitor",
            "use": "Slows carbohydrate digestion to reduce post-meal glucose spikes.",
            "icon": "tablet",
        })
    else:
        meds.append({
            "name": "No prescription required",
            "dosage": "Lifestyle management only",
            "category": "Preventive",
            "use": "Current risk level is manageable through diet, exercise, and regular monitoring.",
            "icon": "shield",
        })

    return meds


def _homeopathy_medicines(risk, p):
    meds = []

    if risk == "high":
        meds.append({
            "name": "Syzygium Jambolanum",
            "dosage": "30C potency, 3 pellets twice daily",
            "category": "Nosode",
            "use": "Classical remedy for elevated blood sugar with frequent urination and thirst.",
            "icon": "globule",
        })
        meds.append({
            "name": "Uranium Nitricum",
            "dosage": "6C potency, 3 pellets three times daily",
            "category": "Mineral",
            "use": "Indicated for diabetes with progressive weight loss and sugar in urine.",
            "icon": "globule",
        })
        meds.append({
            "name": "Lacticum Acidum",
            "dosage": "30C potency, 2 pellets morning and evening",
            "category": "Acid",
            "use": "For diabetes with debility, gastric disturbances, and excessive thirst.",
            "icon": "globule",
        })
    elif risk == "moderate":
        meds.append({
            "name": "Syzygium Jambolanum",
            "dosage": "200C potency, once weekly",
            "category": "Nosode",
            "use": "Addresses glycosuria and helps regulate blood sugar levels naturally.",
            "icon": "globule",
        })
        meds.append({
            "name": "Cephalandra Indica",
            "dosage": "Q (mother tincture), 10 drops in water before meals",
            "category": "Tincture",
            "use": "Traditional homeopathic remedy for managing blood sugar in early-stage diabetes.",
            "icon": "drop",
        })
    else:
        meds.append({
            "name": "Album Arsenicum",
            "dosage": "30C potency, 2 pellets once daily",
            "category": "Mineral",
            "use": "Constitutional remedy for preventing diabetic tendency with general weakness.",
            "icon": "globule",
        })
        meds.append({
            "name": "Cephalandra Indica",
            "dosage": "Q (mother tincture), 5 drops twice weekly",
            "category": "Tincture",
            "use": "Prophylactic support for patients with family history of diabetes.",
            "icon": "drop",
        })

    return meds


def _ayurveda_medicines(risk, p):
    meds = []

    if risk == "high":
        meds.append({
            "name": "Vijaysar (Pterocarpus Marsupium)",
            "dosage": "500 mg capsule twice daily with warm water",
            "category": "Herb",
            "use": "Rejuvenates pancreatic beta cells and helps regenerate insulin-producing tissue.",
            "icon": "leaf",
        })
        meds.append({
            "name": "Gurmar (Gymnema Sylvestre)",
            "dosage": "400 mg extract twice daily before meals",
            "category": "Herb",
            "use": "Called 'sugar destroyer' — reduces sugar absorption and curbs sugar cravings.",
            "icon": "leaf",
        })
        meds.append({
            "name": "Bitter Melon (Momordica Charantia)",
            "dosage": "Juice 20 ml daily on empty stomach",
            "category": "Herb",
            "use": "Contains charantin and polypeptide-P that mimic insulin and lower blood glucose.",
            "icon": "leaf",
        })
        meds.append({
            "name": "Dashamoola Kwath",
            "dosage": "20 ml decoction twice daily",
            "category": "Classical Formulation",
            "use": "Anti-inflammatory Ayurvedic decoction that supports metabolic balance.",
            "icon": "pot",
        })
    elif risk == "moderate":
        meds.append({
            "name": "Gurmar (Gymnema Sylvestre)",
            "dosage": "200 mg extract twice daily",
            "category": "Herb",
            "use": "Supports healthy blood sugar by inhibiting intestinal glucose absorption.",
            "icon": "leaf",
        })
        meds.append({
            "name": "Vijaysar (Pterocarpus Marsupium)",
            "dosage": "500 mg capsule once daily",
            "category": "Herb",
            "use": "Traditional Madhumeha (diabetes) herb that supports pancreatic health.",
            "icon": "leaf",
        })
        meds.append({
            "name": "Triphala Churna",
            "dosage": "3 g with warm water before bed",
            "category": "Classical Formulation",
            "use": "Detoxification blend that improves digestion and supports metabolic detox.",
            "icon": "pot",
        })
    else:
        meds.append({
            "name": "Amalaki (Emblica Officinalis)",
            "dosage": "500 mg powder with honey, morning",
            "category": "Herb",
            "use": "Rich in Vitamin C; strengthens immunity and supports pancreatic function.",
            "icon": "leaf",
        })
        meds.append({
            "name": "Methi Seeds (Trigonella Foenum)",
            "dosage": "1 tsp soaked seeds in water, morning",
            "category": "Herb",
            "use": "Contains galactomannan fibre that slows sugar absorption and improves satiety.",
            "icon": "seed",
        })

    return meds
