document.addEventListener("DOMContentLoaded", () => {
  const getApiBaseUrl = () => {
    return "/api";
  };
  
  const notify = (message, options = {}) => {
    if (window.CuraAyurNotify && typeof window.CuraAyurNotify.show === "function") {
      window.CuraAyurNotify.show(message, options);
      return;
    }
    window.console.warn(message);
  };

  const API_BASE = getApiBaseUrl();

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
    !ageInput || !weightInput || !heightInput || !glucoseInput ||
    !hba1cInput || !bpInput || !familyHistoryInput || !activityInput ||
    !bmiValue || !bmiCategory || !analyzeBtn || !softWarning ||
    !resultSection || !gaugeValue || !riskScore || !riskBadge ||
    !confidenceText || !factorTags || !habitList || !clinicalList
  ) return;

  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

  const getRiskBand = (score) => {
    if (score < 35) return {
      band: "low", label: "Low Risk", confidence: 82,
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

        allopathy: [
          { name: "No specific medication required", dose: "N/A", use: "Maintain healthy diet and active lifestyle" }
        ],
        homeopathy: [
          { name: "Syzygium Jambolanum Q", dose: "10 drops twice daily", use: "General tonic to support healthy sugar metabolism" }
        ],
        ayurveda: [
          { name: "Karela (Bitter Gourd) Extract", dose: "1 capsule daily", use: "Supports healthy blood glucose levels naturally" }
        ],
      };
    if (score < 65) return {
      band: "moderate", label: "Moderate Risk", confidence: 87,
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

        allopathy: [
          { name: "Metformin (preventive dose)", dose: "500mg daily", use: "Improve insulin sensitivity in pre-diabetes" }
        ],
        homeopathy: [
          { name: "Phosphoricum Acidum 30 CH", dose: "5 pills twice daily", use: "To manage weakness and support metabolism" },
          { name: "Uranium Nitricum 3X", dose: "2 tablets thrice daily", use: "Traditionally used for managing blood sugar spikes" }
        ],
        ayurveda: [
          { name: "Meshashringi (Gymnema Sylvestre)", dose: "250mg twice daily", use: "Helps reduce sugar cravings and supports pancreas" },
          { name: "Amalaki & Turmeric (Nisha Amalaki)", dose: "3g empty stomach", use: "Classic formulation for diabetes management" }
        ],
      };
    return {
      band: "high", label: "High Risk", confidence: 92,
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

        allopathy: [
          { name: "Metformin / Sulfonylureas", dose: "As prescribed", use: "Primary glycemic control" },
          { name: "Insulin Therapy", dose: "If indicated by endocrinologist", use: "Direct blood sugar regulation" }
        ],
        homeopathy: [
          { name: "Natrum Sulphuricum 6X", dose: "4 tablets thrice daily", use: "Tissue salt for metabolic balance" },
          { name: "Cephalandra Indica Q", dose: "15 drops in water", use: "Supportive care for elevated glucose levels" }
        ],
        ayurveda: [
          { name: "Vasant Kusumakar Ras", dose: "As prescribed", use: "Potent formulation for advanced diabetes and neuropathy" },
          { name: "Chandraprabha Vati", dose: "2 tablets twice daily", use: "Supports urinary tract and glycemic control" }
        ],
    };;
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

  const computeRiskScoreLocal = ({ age, glucose, hba1c, bp, bmi, familyHistory, activity, sex }) => {
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

  const fetchDiabetesPrediction = async (patientData) => {
    const authData = JSON.parse(localStorage.getItem("curaayurAuth") || "{}");
    if (!authData.token) {
      throw new Error("Please log in first to use the prediction service.");
    }
    const response = await fetch(`${API_BASE}/predict/diabetes`, {
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

  const getSelectedSex = () => {
    const active = document.querySelector(".sex-pill.active");
    return active ? active.dataset.sex : "male";
  };

  const validateRequired = () => {
    const required = [ageInput, weightInput, heightInput, glucoseInput, hba1cInput, bpInput, familyHistoryInput, activityInput];
    return required.every((input) => input.value && String(input.value).trim() !== "");
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
    bmiValue.textContent = `BMI: ${bmi.toFixed(1)}`;
    if (bmi < 18.5) { bmiCategory.textContent = "Underweight"; bmiCategory.style.color = "var(--bmi-under)"; }
    else if (bmi < 25) { bmiCategory.textContent = "Normal"; bmiCategory.style.color = "var(--bmi-normal)"; }
    else if (bmi < 30) { bmiCategory.textContent = "Overweight"; bmiCategory.style.color = "var(--bmi-over)"; }
    else { bmiCategory.textContent = "Obese"; bmiCategory.style.color = "var(--bmi-obese)"; }
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

  const renderResults = (riskScoreValue, inputs) => {
    const { age, glucose, hba1c, bp, bmi, familyHistory, activity, sex } = inputs;
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
    
    const factors = buildFactors({ age, glucose, hba1c, bp, bmi, familyHistory, activity, sex });

    animateRiskScore(riskScore, riskScoreValue);
    confidenceText.textContent = `Confidence: ${bandData.confidence || 95}%`;
    riskBadge.textContent = window.genAiData ? window.genAiData.riskLevel : bandData.label;
    riskBadge.classList.remove("low", "moderate", "high");
    riskBadge.classList.add((window.genAiData ? window.genAiData.riskLevel.toLowerCase() : bandData.band) || "moderate");

    const semiCircleLength = 251.4;
    gaugeValue.style.strokeDashoffset = String(semiCircleLength * (1 - riskScoreValue / 100));

    renderFactors(factors);
    renderList(habitList, bandData.habits);
    renderList(clinicalList, bandData.clinical);

    renderMeds("med-allopathy", bandData.allopathy || []);
    renderMeds("med-homeopathy", bandData.homeopathy || []);
    renderMeds("med-ayurveda", bandData.ayurveda || []);
        

    resultSection.classList.add("visible");
    resultSection.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const renderRecommendations = (recs) => {
    const lifestyleContainer = document.getElementById("lifestyle-recs");
    const clinicalContainer = document.getElementById("clinical-recs");
    if (!lifestyleContainer || !clinicalContainer) return;

    lifestyleContainer.innerHTML = "";
    recs.lifestyle.forEach((item) => {
      const div = document.createElement("div");
      div.className = "rec-item";
      div.innerHTML = `<span class="rec-badge ${item.priority}">${item.priority}</span><p>${item.text}</p>`;
      lifestyleContainer.appendChild(div);
    });

    clinicalContainer.innerHTML = "";
    recs.clinical.forEach((item) => {
      const div = document.createElement("div");
      div.className = "rec-item";
      div.innerHTML = `<span class="rec-badge ${item.urgency}">${item.urgency}</span><p>${item.text}</p>`;
      clinicalContainer.appendChild(div);
    });


  };

  analyzeBtn.addEventListener("click", async () => {
    if (!validateRequired()) { softWarning.classList.add("show"); return; }
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

    const inputs = { age, glucose, hba1c, bp, bmi, familyHistory, activity, sex };

    let predictionSource = "";
    let riskScoreValue = 0;

    try {
      const data = await fetchDiabetesPrediction({
        fastingGlucose: glucose, bp, bmi, age, hba1c, familyHistory, activity, sex,
      });
      riskScoreValue = data.riskScore || computeRiskScoreLocal(inputs);
      
      // If we got GenAI recommendations, inject them into our band data
      if (data.recommendation) {
         window.genAiData = data.recommendation;
      }
    } catch (err) {
      notify(err.message, { type: 'error' });
      riskScoreValue = computeRiskScoreLocal(inputs);
    }

    renderResults(riskScoreValue, inputs);


  });

  const revealElements = document.querySelectorAll(".reveal");
  const revealObserver = new IntersectionObserver(
    (entries) => entries.forEach((entry) => {
      if (entry.isIntersecting) { entry.target.classList.add("in"); revealObserver.unobserve(entry.target); }
    }),
    { threshold: 0.15 }
  );
  revealElements.forEach((element) => revealObserver.observe(element));
  updateBMI();

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
