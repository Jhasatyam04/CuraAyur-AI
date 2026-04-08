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
  const cholesterolInput = document.getElementById("cholesterol");
  const bpInput = document.getElementById("bp");
  const glucoseInput = document.getElementById("glucose");

  const bmiValue = document.getElementById("bmi-value");
  const bmiCategory = document.getElementById("bmi-category");

  const sexButtons = document.querySelectorAll(".sex-pill");
  const uploadZone = document.getElementById("upload-zone");
  const fileInput = document.getElementById("ecg-file");
  const filePreview = document.getElementById("file-preview");
  const fileName = document.getElementById("file-name");

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
    !cholesterolInput ||
    !bpInput ||
    !glucoseInput ||
    !bmiValue ||
    !bmiCategory ||
    !uploadZone ||
    !fileInput ||
    !filePreview ||
    !fileName ||
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
    const response = await fetch(`${API_BASE}/predictions/cardio`, {
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

  const updateFilePreview = (file) => {
    if (!file) {
      filePreview.classList.remove("visible");
      fileName.textContent = "No file selected";
      uploadZone.classList.remove("selected");
      return;
    }

    fileName.textContent = file.name;
    filePreview.classList.add("visible");
    uploadZone.classList.add("selected");
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

  fileInput.addEventListener("change", () => {
    const selected = fileInput.files && fileInput.files[0] ? fileInput.files[0] : null;
    updateFilePreview(selected);
  });

  ["dragenter", "dragover"].forEach((eventName) => {
    uploadZone.addEventListener(eventName, (event) => {
      event.preventDefault();
      uploadZone.classList.add("dragover");
    });
  });

  ["dragleave", "drop"].forEach((eventName) => {
    uploadZone.addEventListener(eventName, (event) => {
      event.preventDefault();
      uploadZone.classList.remove("dragover");
    });
  });

  uploadZone.addEventListener("drop", (event) => {
    const file = event.dataTransfer && event.dataTransfer.files ? event.dataTransfer.files[0] : null;
    if (file) {
      const transfer = new DataTransfer();
      transfer.items.add(file);
      fileInput.files = transfer.files;
      updateFilePreview(file);
    }
  });

  const getRiskBand = (score) => {
    if (score < 35) {
      return {
        band: "low",
        label: "Low Risk",
        confidence: 81,
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
      };
    }

    if (score < 65) {
      return {
        band: "moderate",
        label: "Moderate Risk",
        confidence: 86,
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
      };
    }

    return {
      band: "high",
      label: "High Risk",
      confidence: 91,
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
    };
  };

  const buildFactors = ({ age, cholesterol, bp, glucose, bmi, sex }) => {
    const factors = [];

    if (age >= 55) factors.push("Age 55+");
    if (cholesterol >= 240) factors.push("High Cholesterol");
    if (bp >= 140) factors.push("Elevated BP");
    if (glucose >= 126) factors.push("High Glucose");
    if (bmi >= 30) factors.push("BMI Obesity Range");
    if (sex === "male") factors.push("Male Risk Pattern");

    return factors.length ? factors : ["No major high-risk marker"];
  };

  const computeRiskScore = ({ age, cholesterol, bp, glucose, bmi, sex }) => {
    let score = 0;

    score += clamp((age - 20) * 0.75, 0, 35);
    score += clamp((cholesterol - 160) * 0.08, 0, 20);
    score += clamp((bp - 110) * 0.2, 0, 20);
    score += clamp((glucose - 85) * 0.18, 0, 18);
    score += clamp((bmi - 22) * 1.2, 0, 15);
    if (sex === "male") score += 5;

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
    const required = [ageInput, weightInput, heightInput, cholesterolInput, bpInput, glucoseInput];
    return required.every((input) => input.value && Number(input.value) > 0);
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
    const cholesterol = Number(cholesterolInput.value);
    const bp = Number(bpInput.value);
    const glucose = Number(glucoseInput.value);
    const sex = getSelectedSex();

    const bmi = weight / Math.pow(height / 100, 2);

    let riskScoreValue;
    let bandData;
    let factors;

    try {
      const apiResult = await requestPrediction({
        age,
        cholesterol,
        bp,
        glucose,
        bmi,
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

      riskScoreValue = computeRiskScore({ age, cholesterol, bp, glucose, bmi, sex });
      bandData = getRiskBand(riskScoreValue);
      factors = buildFactors({ age, cholesterol, bp, glucose, bmi, sex });
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
