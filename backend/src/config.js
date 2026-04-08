const path = require("path");
const dotenv = require("dotenv");

dotenv.config({ path: path.join(__dirname, "..", ".env") });

const nodeEnv = process.env.NODE_ENV || "development";
const jwtSecret = process.env.JWT_SECRET;
const corsOrigin = process.env.CORS_ORIGIN || "http://localhost:5000,http://127.0.0.1:5000";
const databaseUrl = process.env.DATABASE_URL || "";
const googleClientId = process.env.GOOGLE_CLIENT_ID || "";
const demoLoginEnabled = process.env.DEMO_LOGIN_ENABLED === "true";
const demoLoginEmail = (process.env.DEMO_LOGIN_EMAIL || "demo@curaayur.ai").trim().toLowerCase();
const demoLoginPassword = process.env.DEMO_LOGIN_PASSWORD || "";
const demoLoginName = (process.env.DEMO_LOGIN_NAME || "Demo User").trim();

if (!jwtSecret || jwtSecret.length < 32) {
  throw new Error("JWT_SECRET is required and must be at least 32 characters.");
}

const corsOrigins = corsOrigin.split(",").map((value) => value.trim()).filter(Boolean);

if (nodeEnv === "production" && corsOrigins.includes("*")) {
  throw new Error("CORS_ORIGIN cannot use wildcard in production.");
}

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
