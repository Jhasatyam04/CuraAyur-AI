document.addEventListener("DOMContentLoaded", () => {
  const getApiBaseUrl = () => {
    return "/api";
  };

  const API_BASE = getApiBaseUrl();

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

  const fetchBreastPrediction = async (patientData) => {
    const authData = JSON.parse(localStorage.getItem("curaayurAuth") || "{}");
    if (!authData.token) {
      throw new Error("Please log in first to use the prediction service.");
    }
    const response = await fetch(`${API_BASE}/predict/breast-cancer`, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "Authorization": `Bearer ${authData.token}`
      },
      body: JSON.stringify(patientData),
    });
    
    if (response.status === 401) {
      window.location.href = "login.html";
      throw new Error("Session expired. Please log in again.");
    }
    
    if (!response.ok) throw new Error("Prediction service unavailable");
    const result = await response.json();
    return result.data;
  };

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

        allopathy: [
          { name: "Routine Screening", dose: "Annual/Biennial", use: "Mammography based on age guidelines" }
        ],
        homeopathy: [
          { name: "Phytolacca Decandra 30 CH", dose: "Occasional use", use: "General breast tissue health support" }
        ],
        ayurveda: [
          { name: "Ashwagandha (Withania somnifera)", dose: "500mg daily", use: "General wellness and immunity support" }
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

        allopathy: [
          { name: "Selective Estrogen Receptor Modulators (e.g., Tamoxifen)", dose: "If prescribed for high risk prevention", use: "Risk reduction in specific genetic profiles" }
        ],
        homeopathy: [
          { name: "Conium Maculatum 30 CH", dose: "Under guidance", use: "For fibrocystic breast changes and tenderness" },
          { name: "Calcarea Fluorica 6X", dose: "4 tablets twice daily", use: "Tissue salt to support healthy glandular tissue" }
        ],
        ayurveda: [
          { name: "Kanchanar Guggulu", dose: "2 tablets twice daily", use: "Traditionally used to manage glandular swellings" },
          { name: "Shatavari (Asparagus racemosus)", dose: "3g with warm milk", use: "Hormonal balance and female reproductive support" }
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

        allopathy: [
          { name: "Targeted Therapy / Hormonal Therapy", dose: "As prescribed by Oncologist", use: "Medical management of identified risk/disease" },
          { name: "Surgical / Radiation Consultation", dose: "N/A", use: "Prophylactic or therapeutic intervention" }
        ],
        homeopathy: [
          { name: "Asterias Rubens 200 CH", dose: "Under expert supervision only", use: "Palliative support for breast ailments" },
          { name: "Scirrhinum 200 CH", dose: "Rarely used, expert only", use: "Constitutional support" }
        ],
        ayurveda: [
          { name: "Guduchi (Tinospora cordifolia)", dose: "Immunomodulator dose", use: "To support immune function during conventional treatments" },
          { name: "Haridra Khand", dose: "As prescribed", use: "Anti-inflammatory and antioxidant support" }
        ],
    };;
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

  

  const animateRiskScore = (element, targetValue) => {
    let current = 0;
    element.classList.add("ai-generating-text");
    const interval = setInterval(() => {
      current += Math.ceil((targetValue - current) * 0.1);
      if (current >= targetValue) {
        current = targetValue;
        clearInterval(interval);
        setTimeout(() => element.classList.remove("ai-generating-text"), 400);
      }
      element.textContent = `${current}%`;
    }, 40);
  };

  const renderMeds = (elementId, meds) => {
    const el = document.getElementById(elementId);
    if (!el) return;
    el.innerHTML = "";
    el.classList.add("ai-processing");
    setTimeout(() => {
      el.classList.remove("ai-processing");
      meds.forEach((med, idx) => {
        setTimeout(() => {
          const div = document.createElement("div");
          div.className = "med-item ai-streaming-item";
          div.innerHTML = `
            <div class="med-item-name">${med.name}</div>
            <div class="med-item-dose">${med.dose}</div>
            <div class="med-item-use">${med.use}</div>
          `;
          el.appendChild(div);
        }, idx * 600);
      });
    }, 1500);
  };

  const renderList = (listElement, items) => {
    listElement.innerHTML = "<div class='ai-generating-text' style='font-size: 0.9rem; padding: 0.5rem;'>Synthesizing...</div>";
    setTimeout(() => {
      listElement.innerHTML = "";
      items.forEach((item, idx) => {
        setTimeout(() => {
          const li = document.createElement("li");
          li.textContent = item;
          li.className = "ai-streaming-item";
          listElement.appendChild(li);
        }, idx * 400);
      });
    }, 1200);
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

    try {
      const data = await fetchBreastPrediction({
        radiusMean, textureMean, perimeterMean, areaMean,
        smoothnessMean, concavityMean, concavePointsMean,
        age, familyHistory, menopause
      });
      riskScoreValue = data.riskScore || computeRiskScore({
        age, familyHistory, menopause, radiusMean, textureMean, perimeterMean, areaMean, smoothnessMean, concavityMean, concavePointsMean,
      });
      
      // If we got GenAI recommendations, inject them into our band data
      if (data.recommendation) {
         window.genAiData = data.recommendation;
      }
    } catch (err) {
      notify(err.message, { type: 'error' });
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
    }

    const bandData = getRiskBand(riskScoreValue);
    
    // Override with GenAI data if available
    if (window.genAiData) {
      bandData.habits = window.genAiData.lifestyle || bandData.habits;
      bandData.clinical = window.genAiData.clinical || bandData.clinical;
      
      const formatMeds = (medList) => (medList || []).map(m => typeof m === 'object' ? m : { name: m, dose: "As prescribed", use: "" });
      
      bandData.allopathy = formatMeds(window.genAiData.medicines?.allopathic);
      bandData.ayurveda = formatMeds(window.genAiData.medicines?.ayurvedic);
      bandData.homeopathy = formatMeds(window.genAiData.medicines?.homeopathic);
    }
    
    const factors = buildFactors({
      age,
      radiusMean,
      perimeterMean,
      areaMean,
      concavityMean,
      concavePointsMean,
      familyHistory,
      menopause,
    });

    animateRiskScore(riskScore, riskScoreValue);
    confidenceText.textContent = `Confidence: ${bandData.confidence || 95}%`;
    riskBadge.textContent = window.genAiData ? window.genAiData.riskLevel : bandData.label;
    riskBadge.classList.remove("low", "moderate", "high");
    riskBadge.classList.add((window.genAiData ? window.genAiData.riskLevel.toLowerCase() : bandData.band) || "moderate");

    const semiCircleLength = 251.4;
    const offset = semiCircleLength * (1 - riskScoreValue / 100);
    gaugeValue.style.strokeDashoffset = String(offset);

    renderFactors(factors);
    renderList(habitList, bandData.habits);
    renderList(clinicalList, bandData.clinical);

    renderMeds("med-allopathy", bandData.allopathy || []);
    renderMeds("med-homeopathy", bandData.homeopathy || []);
    renderMeds("med-ayurveda", bandData.ayurveda || []);
        

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

  // Clinical Authentication (CVI)
  const authBtn = document.getElementById('auth-btn');
  if (authBtn) {
    authBtn.addEventListener('click', () => {
      const score = document.getElementById('cvi-score').value;
      
      if (!score) {
        window.showNotification("Please enter a CVI score.", "error");
        return;
      }
      
      if (score < 0 || score > 100) {
        window.showNotification("CVI score must be between 0 and 100.", "error");
        return;
      }
      
      // Simulate saving to backend
      setTimeout(() => {
        document.getElementById('auth-success-msg').style.display = 'flex';
        authBtn.textContent = 'Authenticated ✓';
        authBtn.disabled = true;
        authBtn.style.background = 'var(--accent-color)';
        authBtn.style.color = '#fff';
      }, 500);
    });
  }
});
