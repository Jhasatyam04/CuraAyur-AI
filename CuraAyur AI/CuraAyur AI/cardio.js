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

  const fetchCardioPrediction = async (patientData) => {
    const authData = JSON.parse(localStorage.getItem("curaayurAuth") || "{}");
    if (!authData.token) {
      throw new Error("Please log in first to use the prediction service.");
    }
    const response = await fetch(`${API_BASE}/predict/cardio`, {
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
    return result.data; // Return the inner data object
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

        allopathy: [
          { name: "No specific medication required", dose: "N/A", use: "Maintain healthy lifestyle" }
        ],
        homeopathy: [
          { name: "Crataegus Oxyacantha Q", dose: "10 drops twice daily", use: "Heart tonic for general wellbeing" }
        ],
        ayurveda: [
          { name: "Arjuna (Terminalia arjuna)", dose: "500mg daily", use: "Supports healthy heart function and circulation" }
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

        allopathy: [
          { name: "Low-dose Statins (e.g., Atorvastatin)", dose: "10mg at bedtime", use: "To manage borderline cholesterol levels" },
          { name: "Aspirin", dose: "81mg daily", use: "Preventive measure if recommended by physician" }
        ],
        homeopathy: [
          { name: "Aurum Metallicum 30 CH", dose: "5 pills twice daily", use: "Helps regulate mild blood pressure fluctuations" },
          { name: "Rauwolfia Serpentina Q", dose: "10 drops thrice daily", use: "Traditionally used for hypertension" }
        ],
        ayurveda: [
          { name: "Arjunaarishta", dose: "15ml with equal water", use: "Helps manage blood pressure and cardiac health" },
          { name: "Pushkarmool", dose: "250mg twice daily", use: "Used to manage lipid profiles" }
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

        allopathy: [
          { name: "High-intensity Statins", dose: "As prescribed", use: "Aggressive cholesterol lowering" },
          { name: "Beta Blockers / ACE Inhibitors", dose: "As prescribed", use: "Strict blood pressure control" }
        ],
        homeopathy: [
          { name: "Lachesis 200 CH", dose: "Weekly dose", use: "Consult homeopath for complementary support" },
          { name: "Cactus Grandiflorus Q", dose: "15 drops SOS", use: "Used for acute chest constriction" }
        ],
        ayurveda: [
          { name: "Hridya Mahakashaya", dose: "As prescribed", use: "Comprehensive Ayurvedic heart support formulation" },
          { name: "Sarpagandha Ghan Vati", dose: "1-2 tablets", use: "Potent natural antihypertensive" }
        ],
    };;
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

    try {
      const data = await fetchCardioPrediction({ age, sex, height, weight, cholesterol, bp, glucose });
      riskScoreValue = data.riskScore || computeRiskScore({ age, cholesterol, bp, glucose, bmi, sex });
      
      // If we got GenAI recommendations, inject them into our band data
      if (data.recommendation) {
         window.genAiData = data.recommendation;
      }
    } catch (err) {
      notify(err.message, { type: 'error' });
      riskScoreValue = computeRiskScore({ age, cholesterol, bp, glucose, bmi, sex });
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
    
    const factors = buildFactors({ age, cholesterol, bp, glucose, bmi, sex });

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
