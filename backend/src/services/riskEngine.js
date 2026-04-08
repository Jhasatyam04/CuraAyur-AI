const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const cardioEngine = (input) => {
  const age = Number(input.age);
  const cholesterol = Number(input.cholesterol);
  const bp = Number(input.bp);
  const glucose = Number(input.glucose);
  const bmi = Number(input.bmi);
  const sex = input.sex === "female" ? "female" : "male";

  let score = 0;
  score += clamp((age - 20) * 0.75, 0, 35);
  score += clamp((cholesterol - 160) * 0.08, 0, 20);
  score += clamp((bp - 110) * 0.2, 0, 20);
  score += clamp((glucose - 85) * 0.18, 0, 18);
  score += clamp((bmi - 22) * 1.2, 0, 15);
  if (sex === "male") score += 5;

  const riskScore = Math.round(clamp(score, 6, 97));
  const factors = [];
  if (age >= 55) factors.push("Age 55+");
  if (cholesterol >= 240) factors.push("High Cholesterol");
  if (bp >= 140) factors.push("Elevated BP");
  if (glucose >= 126) factors.push("High Glucose");
  if (bmi >= 30) factors.push("BMI Obesity Range");
  if (sex === "male") factors.push("Male Risk Pattern");

  const band = riskScore < 35 ? "low" : riskScore < 65 ? "moderate" : "high";
  const label = band === "low" ? "Low Risk" : band === "moderate" ? "Moderate Risk" : "High Risk";
  const confidence = band === "low" ? 81 : band === "moderate" ? 86 : 91;

  return { riskScore, band, label, confidence, factors: factors.length ? factors : ["No major high-risk marker"] };
};

const diabetesEngine = (input) => {
  const age = Number(input.age);
  const glucose = Number(input.glucose);
  const hba1c = Number(input.hba1c);
  const bp = Number(input.bp);
  const bmi = Number(input.bmi);
  const familyHistory = input.familyHistory === "yes" ? "yes" : "no";
  const activity = ["low", "moderate", "high"].includes(input.activity) ? input.activity : "moderate";
  const sex = input.sex === "female" ? "female" : "male";

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

  const riskScore = Math.round(clamp(score, 6, 97));
  const factors = [];
  if (age >= 45) factors.push("Age 45+");
  if (glucose >= 126) factors.push("High Fasting Glucose");
  if (hba1c >= 6.5) factors.push("HbA1c in Diabetic Range");
  if (bp >= 140) factors.push("Elevated Blood Pressure");
  if (bmi >= 30) factors.push("BMI Obesity Range");
  if (familyHistory === "yes") factors.push("Family History");
  if (activity === "low") factors.push("Low Physical Activity");
  if (sex === "male") factors.push("Male Risk Pattern");

  const band = riskScore < 35 ? "low" : riskScore < 65 ? "moderate" : "high";
  const label = band === "low" ? "Low Risk" : band === "moderate" ? "Moderate Risk" : "High Risk";
  const confidence = band === "low" ? 82 : band === "moderate" ? 87 : 92;

  return { riskScore, band, label, confidence, factors: factors.length ? factors : ["No major high-risk marker"] };
};

const breastCancerEngine = (input) => {
  const age = Number(input.age);
  const familyHistory = input.familyHistory === "yes" ? "yes" : "no";
  const menopause = input.menopause === "post" ? "post" : "pre";
  const radiusMean = Number(input.radiusMean);
  const textureMean = Number(input.textureMean);
  const perimeterMean = Number(input.perimeterMean);
  const areaMean = Number(input.areaMean);
  const smoothnessMean = Number(input.smoothnessMean);
  const concavityMean = Number(input.concavityMean);
  const concavePointsMean = Number(input.concavePointsMean);

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

  const riskScore = Math.round(clamp(score, 6, 97));
  const factors = [];
  if (age >= 50) factors.push("Age 50+");
  if (radiusMean >= 15.5) factors.push("High Radius Mean");
  if (perimeterMean >= 100) factors.push("High Perimeter Mean");
  if (areaMean >= 800) factors.push("Large Area Mean");
  if (concavityMean >= 0.12) factors.push("High Concavity");
  if (concavePointsMean >= 0.06) factors.push("High Concave Points");
  if (familyHistory === "yes") factors.push("Family History");
  if (menopause === "post") factors.push("Post-menopausal Context");

  const band = riskScore < 35 ? "low" : riskScore < 65 ? "moderate" : "high";
  const label = band === "low" ? "Low Risk" : band === "moderate" ? "Moderate Risk" : "High Risk";
  const confidence = band === "low" ? 84 : band === "moderate" ? 88 : 93;

  return { riskScore, band, label, confidence, factors: factors.length ? factors : ["No major high-risk marker"] };
};

module.exports = {
  cardioEngine,
  diabetesEngine,
  breastCancerEngine,
};
