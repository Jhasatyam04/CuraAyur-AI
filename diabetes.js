document.addEventListener("DOMContentLoaded", () => {
  const getApiBaseUrl = () => {
    if (window.location.protocol === "file:") {
      return "http://localhost:5000/api";
    }

    const host = window.location.hostname;
    if (host === "localhost" || host === "127.0.0.1") {
      return "http://localhost:5000/api";
    }

    return `${window.location.origin}/api`;
  };

  const API_BASE = getApiBaseUrl();
  const allowLocalFallback = window.location.protocol === "file:" || window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
  const notify = (message, options = {}) => {
    if (window.CuraAyurNotify && typeof window.CuraAyurNotify.show === "function") {
      window.CuraAyurNotify.show(message, options);
      return;
    }

    window.console.warn(message);
  };

  const ageInput = document.getElementById("age");
  const weightInput = document.getElementById("weight");
  const heightInput = document.getElementById("height");
  const glucoseInput = document.getElementById("glucose");
  const hba1cInput = document.getElementById("hba1c");
  const bpInput = document.getElementById("bp");
  const familyHistoryInput = document.getElementById("family-history");
  const activityInput = document.getElementById("activity");

  const bmiValue = document.getElementById("bmi-value");
  const bmiCategory = document.getElementById("bmi-category");

  const sexButtons = document.querySelectorAll(".sex-pill");
  const analyzeBtn = document.getElementById("analyze-btn");
  const softWarning = document.getElementById("soft-warning");
  const resultSection = document.getElementById("result-section");

  const gaugeValue = document.getElementById("gauge-value");
  const riskScore = document.getElementById("risk-score");
  const riskBadge = document.getElementById("risk-badge");
  const confidenceText = document.getElementById("confidence-text");
  const factorTags = document.getElementById("factor-tags");
  const habitList = document.getElementById("habit-list");
  const clinicalList = document.getElementById("clinical-list");

  if (
    !ageInput ||
    !weightInput ||
    !heightInput ||
    !glucoseInput ||
    !hba1cInput ||
    !bpInput ||
    !familyHistoryInput ||
    !activityInput ||
    !bmiValue ||
    !bmiCategory ||
    !analyzeBtn ||
    !softWarning ||
    !resultSection ||
    !gaugeValue ||
    !riskScore ||
    !riskBadge ||
    !confidenceText ||
    !factorTags ||
    !habitList ||
    !clinicalList
  ) {
    return;
  }

  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

  const requestPrediction = async (payload) => {
    const response = await fetch(`${API_BASE}/predictions/diabetes`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify(payload),
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data.message || "Prediction request failed");
    }

    return data;
  };

  const updateBMI = () => {
    const weight = Number(weightInput.value);
    const heightCm = Number(heightInput.value);

    if (!weight || !heightCm) {
      bmiValue.textContent = "BMI: --";
      bmiCategory.textContent = "Awaiting input";
      bmiCategory.style.color = "var(--muted)";
      return;
    }

    const heightM = heightCm / 100;
    const bmi = weight / (heightM * heightM);
    const bmiRounded = bmi.toFixed(1);

    bmiValue.textContent = `BMI: ${bmiRounded}`;

    if (bmi < 18.5) {
      bmiCategory.textContent = "Underweight";
      bmiCategory.style.color = "var(--bmi-under)";
    } else if (bmi < 25) {
      bmiCategory.textContent = "Normal";
      bmiCategory.style.color = "var(--bmi-normal)";
    } else if (bmi < 30) {
      bmiCategory.textContent = "Overweight";
      bmiCategory.style.color = "var(--bmi-over)";
    } else {
      bmiCategory.textContent = "Obese";
      bmiCategory.style.color = "var(--bmi-obese)";
    }
  };

  const setSex = (target) => {
    sexButtons.forEach((button) => {
      const active = button === target;
      button.classList.toggle("active", active);
      button.setAttribute("aria-pressed", String(active));
    });
  };

  sexButtons.forEach((button) => {
    button.addEventListener("click", () => setSex(button));
  });

  [weightInput, heightInput].forEach((input) => {
    input.addEventListener("input", updateBMI);
  });

  const getRiskBand = (score) => {
    if (score < 35) {
      return {
        band: "low",
        label: "Low Risk",
        confidence: 82,
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
      };
    }

    if (score < 65) {
      return {
        band: "moderate",
        label: "Moderate Risk",
        confidence: 87,
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
      };
    }

    return {
      band: "high",
      label: "High Risk",
      confidence: 92,
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
    };
  };

  const buildFactors = ({ age, glucose, hba1c, bp, bmi, familyHistory, activity, sex }) => {
    const factors = [];

    if (age >= 45) factors.push("Age 45+");
    if (glucose >= 126) factors.push("High Fasting Glucose");
    if (hba1c >= 6.5) factors.push("HbA1c in Diabetic Range");
    if (bp >= 140) factors.push("Elevated Blood Pressure");
    if (bmi >= 30) factors.push("BMI Obesity Range");
    if (familyHistory === "yes") factors.push("Family History");
    if (activity === "low") factors.push("Low Physical Activity");
    if (sex === "male") factors.push("Male Risk Pattern");

    return factors.length ? factors : ["No major high-risk marker"];
  };

  const computeRiskScore = ({ age, glucose, hba1c, bp, bmi, familyHistory, activity, sex }) => {
    let score = 0;

    score += clamp((age - 20) * 0.6, 0, 25);
    score += clamp((glucose - 85) * 0.32, 0, 28);
    score += clamp((hba1c - 5.2) * 12, 0, 24);
    score += clamp((bp - 110) * 0.12, 0, 10);
    score += clamp((bmi - 22) * 1.2, 0, 15);

    if (familyHistory === "yes") score += 8;
    if (activity === "low") score += 7;
    if (activity === "moderate") score += 3;
    if (sex === "male") score += 3;

    return Math.round(clamp(score, 6, 97));
  };

  const renderList = (listElement, items) => {
    listElement.innerHTML = "";
    items.forEach((item) => {
      const li = document.createElement("li");
      li.textContent = item;
      listElement.appendChild(li);
    });
  };

  const renderFactors = (items) => {
    factorTags.innerHTML = "";
    items.forEach((item) => {
      const tag = document.createElement("span");
      tag.className = "factor-tag";
      tag.textContent = item;
      factorTags.appendChild(tag);
    });
  };

  const getSelectedSex = () => {
    const active = document.querySelector(".sex-pill.active");
    return active ? active.dataset.sex : "male";
  };

  const validateRequired = () => {
    const required = [
      ageInput,
      weightInput,
      heightInput,
      glucoseInput,
      hba1cInput,
      bpInput,
      familyHistoryInput,
      activityInput,
    ];

    return required.every((input) => input.value && String(input.value).trim() !== "");
  };

  analyzeBtn.addEventListener("click", async () => {
    const valid = validateRequired();

    if (!valid) {
      softWarning.classList.add("show");
      return;
    }

    softWarning.classList.remove("show");

    const age = Number(ageInput.value);
    const weight = Number(weightInput.value);
    const height = Number(heightInput.value);
    const glucose = Number(glucoseInput.value);
    const hba1c = Number(hba1cInput.value);
    const bp = Number(bpInput.value);
    const familyHistory = familyHistoryInput.value;
    const activity = activityInput.value;
    const sex = getSelectedSex();

    const bmi = weight / Math.pow(height / 100, 2);

    let riskScoreValue;
    let bandData;
    let factors;

    try {
      const apiResult = await requestPrediction({
        age,
        glucose,
        hba1c,
        bp,
        bmi,
        familyHistory,
        activity,
        sex,
      });

      riskScoreValue = Number(apiResult.riskScore);
      bandData = {
        band: apiResult.band,
        label: apiResult.label,
        confidence: apiResult.confidence,
        habits: Array.isArray(apiResult.habits) ? apiResult.habits : [],
        clinical: Array.isArray(apiResult.clinical) ? apiResult.clinical : [],
      };
      factors = Array.isArray(apiResult.factors) ? apiResult.factors : [];
    } catch {
      if (!allowLocalFallback) {
        notify("Prediction service is unavailable. Please try again after a moment.", { title: "Service Unavailable", type: "error" });
        return;
      }

      riskScoreValue = computeRiskScore({
        age,
        glucose,
        hba1c,
        bp,
        bmi,
        familyHistory,
        activity,
        sex,
      });

      bandData = getRiskBand(riskScoreValue);
      factors = buildFactors({ age, glucose, hba1c, bp, bmi, familyHistory, activity, sex });
    }

    riskScore.textContent = `${riskScoreValue}%`;
    confidenceText.textContent = `Confidence: ${bandData.confidence}%`;
    riskBadge.textContent = bandData.label;
    riskBadge.classList.remove("low", "moderate", "high");
    riskBadge.classList.add(bandData.band);

    const semiCircleLength = 251.4;
    const offset = semiCircleLength * (1 - riskScoreValue / 100);
    gaugeValue.style.strokeDashoffset = String(offset);

    renderFactors(factors);
    renderList(habitList, bandData.habits);
    renderList(clinicalList, bandData.clinical);

    resultSection.classList.add("visible");
    resultSection.scrollIntoView({ behavior: "smooth", block: "start" });
  });

  const revealElements = document.querySelectorAll(".reveal");
  const revealObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("in");
          revealObserver.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.15 }
  );

  revealElements.forEach((element) => revealObserver.observe(element));

  updateBMI();
});
