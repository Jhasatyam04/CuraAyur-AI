const path = require("path");
const dotenv = require("dotenv");

dotenv.config({ path: path.join(__dirname, "..", ".env") });

const nodeEnv = process.env.NODE_ENV || "development";
const fallbackJwtSecret = "demo_only_change_this_jwt_secret_please_1234567890";
const jwtSecret = process.env.JWT_SECRET && process.env.JWT_SECRET.length >= 32
  ? process.env.JWT_SECRET
  : fallbackJwtSecret;
const corsOrigin = process.env.CORS_ORIGIN || "http://localhost:5000,http://127.0.0.1:5000";
const databaseUrl = process.env.DATABASE_URL || "";
const googleClientId = process.env.GOOGLE_CLIENT_ID || "";
const demoLoginEnabled = process.env.DEMO_LOGIN_ENABLED === "true";
const demoLoginEmail = (process.env.DEMO_LOGIN_EMAIL || "demo@curaayur.ai").trim().toLowerCase();
const demoLoginPassword = process.env.DEMO_LOGIN_PASSWORD || "";
const demoLoginName = (process.env.DEMO_LOGIN_NAME || "Demo User").trim();

if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  // eslint-disable-next-line no-console
  console.warn("JWT_SECRET is missing/short. Using fallback secret; set a strong JWT_SECRET in environment.");
}

const corsOrigins = corsOrigin.split(",").map((value) => value.trim()).filter(Boolean);

module.exports = {
  port: Number(process.env.PORT) || 5000,
  nodeEnv,
  jwtSecret,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "12h",
  corsOrigins,
  corsOrigin,
  databaseUrl,
  googleClientId,
  demoLoginEnabled,
  demoLoginEmail,
  demoLoginPassword,
  demoLoginName,
  databaseSsl: process.env.DATABASE_SSL === "true",
  cookieSecure: process.env.COOKIE_SECURE === "true" || nodeEnv === "production",
  dataFilePath: path.join(__dirname, "..", "data", "store.json"),
};
