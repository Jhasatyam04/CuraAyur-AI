const express = require("express");
const bcrypt = require("bcryptjs");
const ms = require("ms");
const { randomUUID } = require("crypto");
const { createUser, findUserByEmail } = require("../store");
const { signAuthToken } = require("../utils/jwt");
const { requireAuth } = require("../middleware/auth");
const {
  jwtExpiresIn,
  cookieSecure,
  googleClientId,
  demoLoginEnabled,
  demoLoginEmail,
  demoLoginPassword,
  demoLoginName,
} = require("../config");

const router = express.Router();

const sanitizeUser = (user) => ({
  id: user.id,
  name: user.name,
  email: user.email,
});

const getCookieMaxAge = () => {
  const parsed = ms(jwtExpiresIn);
  return typeof parsed === "number" ? parsed : 12 * 60 * 60 * 1000;
};

const attachAuthCookie = (res, token) => {
  res.cookie("curaayur_token", token, {
    httpOnly: true,
    secure: cookieSecure,
    sameSite: "lax",
    maxAge: getCookieMaxAge(),
    path: "/",
  });
};

const createRandomPasswordHash = async () => {
  return bcrypt.hash(randomUUID(), 10);
};

const normalizeGoogleTokenInfo = (payload) => {
  const audience = payload.aud || payload.audience || payload.issued_to || "";
  const authorizedParty = payload.azp || "";

  return {
    audience,
    authorizedParty,
    email: payload.email,
    emailVerified: payload.email_verified === true || payload.email_verified === "true" || payload.verified_email === true || payload.verified_email === "true",
  };
};

const verifyGoogleAccessToken = async (accessToken) => {
  const tokenInfoResponse = await fetch(`https://oauth2.googleapis.com/tokeninfo?access_token=${encodeURIComponent(accessToken)}`);
  if (!tokenInfoResponse.ok) {
    throw new Error("Google token validation failed");
  }

  const tokenInfoRaw = await tokenInfoResponse.json();
  const tokenInfo = normalizeGoogleTokenInfo(tokenInfoRaw);
  const audienceMatches = tokenInfo.audience === googleClientId || tokenInfo.authorizedParty === googleClientId;

  if (!audienceMatches) {
    throw new Error("Google token audience mismatch");
  }

  if (!tokenInfo.email || !tokenInfo.emailVerified) {
    throw new Error("Google account email is not verified");
  }

  const profileResponse = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!profileResponse.ok) {
    throw new Error("Unable to fetch Google profile");
  }

  const profile = await profileResponse.json();
  if (!profile.email) {
    throw new Error("Google profile missing email");
  }

  return {
    name: profile.name || String(profile.email).split("@")[0],
    email: String(profile.email).toLowerCase(),
  };
};

router.get("/google/config", (_req, res) => {
  if (!googleClientId) {
    return res.json({ enabled: false });
  }

  return res.json({
    enabled: true,
    clientId: googleClientId,
  });
});

router.post("/signup", async (req, res) => {
  const { name, email, password } = req.body || {};

  if (!name || !email || !password) {
    return res.status(400).json({ message: "name, email, and password are required" });
  }

  const existing = await findUserByEmail(String(email));
  if (existing) {
    return res.status(409).json({ message: "An account with this email already exists" });
  }

  const passwordHash = await bcrypt.hash(String(password), 10);
  const user = await createUser({
    name: String(name).trim(),
    email: String(email).trim().toLowerCase(),
    passwordHash,
  });

  const token = signAuthToken({ sub: user.id, email: user.email });
  attachAuthCookie(res, token);

  return res.status(201).json({
    message: "Account created successfully",
    user: sanitizeUser(user),
    expiresInSec: 12 * 60 * 60,
  });
});

router.post("/login", async (req, res) => {
  const { email, password } = req.body || {};

  if (!email || !password) {
    return res.status(400).json({ message: "email and password are required" });
  }

  const normalizedEmail = String(email).trim().toLowerCase();
  const rawPassword = String(password);

  if (demoLoginEnabled && demoLoginPassword && normalizedEmail === demoLoginEmail && rawPassword === demoLoginPassword) {
    const token = signAuthToken({
      sub: "demo-user",
      email: demoLoginEmail,
      name: demoLoginName,
      demo: true,
    });

    attachAuthCookie(res, token);

    return res.json({
      message: "Login successful",
      user: {
        id: "demo-user",
        name: demoLoginName,
        email: demoLoginEmail,
      },
      expiresInSec: 12 * 60 * 60,
    });
  }

  const user = await findUserByEmail(normalizedEmail);
  if (!user) {
    return res.status(401).json({ message: "Invalid credentials" });
  }

  const isValid = await bcrypt.compare(rawPassword, user.passwordHash);
  if (!isValid) {
    return res.status(401).json({ message: "Invalid credentials" });
  }

  const token = signAuthToken({ sub: user.id, email: user.email });
  attachAuthCookie(res, token);

  return res.json({
    message: "Login successful",
    user: sanitizeUser(user),
    expiresInSec: 12 * 60 * 60,
  });
});

router.post("/google", async (req, res) => {
  const { accessToken } = req.body || {};

  if (!googleClientId) {
    return res.status(503).json({ message: "Google login is not configured yet" });
  }

  if (!accessToken) {
    return res.status(400).json({ message: "Google access token is required" });
  }

  try {
    const profile = await verifyGoogleAccessToken(String(accessToken));

    let user = await findUserByEmail(profile.email);
    if (!user) {
      user = await createUser({
        name: String(profile.name).trim(),
        email: profile.email,
        passwordHash: await createRandomPasswordHash(),
      });
    }

    const token = signAuthToken({ sub: user.id, email: user.email });
    attachAuthCookie(res, token);

    return res.json({
      message: "Google login successful",
      user: sanitizeUser(user),
      expiresInSec: 12 * 60 * 60,
    });
  } catch {
    return res.status(401).json({ message: "Google authentication failed" });
  }
});

router.post("/logout", (_req, res) => {
  res.clearCookie("curaayur_token", {
    httpOnly: true,
    secure: cookieSecure,
    sameSite: "lax",
    path: "/",
  });

  return res.json({ message: "Logged out" });
});

router.get("/me", requireAuth, (req, res) => {
  return res.json({ user: req.user });
});

module.exports = router;
