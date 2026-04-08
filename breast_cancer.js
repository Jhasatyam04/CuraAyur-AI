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
  const familyHistoryInput = document.getElementById("family-history");
  const menopauseInput = document.getElementById("menopause");

  const radiusMeanInput = document.getElementById("radius-mean");
  const textureMeanInput = document.getElementById("texture-mean");
  const perimeterMeanInput = document.getElementById("perimeter-mean");
  const areaMeanInput = document.getElementById("area-mean");
  const smoothnessMeanInput = document.getElementById("smoothness-mean");
  const concavityMeanInput = document.getElementById("concavity-mean");
  const concavePointsMeanInput = document.getElementById("concave-points-mean");

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
    !familyHistoryInput ||
    !menopauseInput ||
    !radiusMeanInput ||
    !textureMeanInput ||
    !perimeterMeanInput ||
    !areaMeanInput ||
    !smoothnessMeanInput ||
    !concavityMeanInput ||
    !concavePointsMeanInput ||
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
    const response = await fetch(`${API_BASE}/predictions/breast_cancer`, {
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

  const getRiskBand = (score) => {
    if (score < 35) {
      return {
        band: "low",
        label: "Low Risk",
        confidence: 84,
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
      };
    }

    if (score < 65) {
      return {
        band: "moderate",
        label: "Moderate Risk",
        confidence: 88,
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
      };
    }

    return {
      band: "high",
      label: "High Risk",
      confidence: 93,
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
    };
  };

  const buildFactors = ({ age, radiusMean, perimeterMean, areaMean, concavityMean, concavePointsMean, familyHistory, menopause }) => {
    const factors = [];

    if (age >= 50) factors.push("Age 50+");
    if (radiusMean >= 15.5) factors.push("High Radius Mean");
    if (perimeterMean >= 100) factors.push("High Perimeter Mean");
    if (areaMean >= 800) factors.push("Large Area Mean");
    if (concavityMean >= 0.12) factors.push("High Concavity");
    if (concavePointsMean >= 0.06) factors.push("High Concave Points");
    if (familyHistory === "yes") factors.push("Family History");
    if (menopause === "post") factors.push("Post-menopausal Context");

    return factors.length ? factors : ["No major high-risk marker"];
  };

  const computeRiskScore = ({ age, familyHistory, menopause, radiusMean, textureMean, perimeterMean, areaMean, smoothnessMean, concavityMean, concavePointsMean }) => {
    let score = 0;

    score += clamp((age - 20) * 0.35, 0, 18);
    score += clamp((radiusMean - 10) * 2.2, 0, 20);
    score += clamp((textureMean - 10) * 0.8, 0, 10);
    score += clamp((perimeterMean - 60) * 0.35, 0, 16);
    score += clamp((areaMean - 300) * 0.018, 0, 14);
    score += clamp((smoothnessMean - 0.08) * 120, 0, 10);
    score += clamp((concavityMean - 0.03) * 120, 0, 15);
    score += clamp((concavePointsMean - 0.02) * 220, 0, 16);

    if (familyHistory === "yes") score += 8;
    if (menopause === "post") score += 5;

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

  const validateRequired = () => {
    const required = [
      ageInput,
      familyHistoryInput,
      menopauseInput,
      radiusMeanInput,
      textureMeanInput,
      perimeterMeanInput,
      areaMeanInput,
      smoothnessMeanInput,
      concavityMeanInput,
      concavePointsMeanInput,
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
    const familyHistory = familyHistoryInput.value;
    const menopause = menopauseInput.value;

    const radiusMean = Number(radiusMeanInput.value);
    const textureMean = Number(textureMeanInput.value);
    const perimeterMean = Number(perimeterMeanInput.value);
    const areaMean = Number(areaMeanInput.value);
    const smoothnessMean = Number(smoothnessMeanInput.value);
    const concavityMean = Number(concavityMeanInput.value);
    const concavePointsMean = Number(concavePointsMeanInput.value);

    let riskScoreValue;
    let bandData;
    let factors;

    try {
      const apiResult = await requestPrediction({
        age,
        familyHistory,
        menopause,
        radiusMean,
        textureMean,
        perimeterMean,
        areaMean,
        smoothnessMean,
        concavityMean,
        concavePointsMean,
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
        familyHistory,
        menopause,
        radiusMean,
        textureMean,
        perimeterMean,
        areaMean,
        smoothnessMean,
        concavityMean,
        concavePointsMean,
      });

      bandData = getRiskBand(riskScoreValue);
      factors = buildFactors({
        age,
        radiusMean,
        perimeterMean,
        areaMean,
        concavityMean,
        concavePointsMean,
        familyHistory,
        menopause,
      });
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
});
