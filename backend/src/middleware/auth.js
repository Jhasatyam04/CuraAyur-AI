const { verifyAuthToken } = require("../utils/jwt");
const { findUserById } = require("../store");
const { demoLoginEnabled } = require("../config");

const requireAuth = async (req, res, next) => {
  const authHeader = req.headers.authorization || "";
  const [scheme, token] = authHeader.split(" ");
  const cookieToken = req.cookies ? req.cookies.curaayur_token : null;
  const authToken = token || cookieToken;

  if (!authToken && scheme !== "Bearer") {
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {
    const payload = verifyAuthToken(authToken);

    if (demoLoginEnabled && payload.demo === true) {
      req.user = {
        id: payload.sub,
        name: payload.name || "Demo User",
        email: payload.email,
      };

      return next();
    }

    const user = await findUserById(payload.sub);

    if (!user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    req.user = {
      id: user.id,
      name: user.name,
      email: user.email,
    };

    return next();
  } catch {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};

module.exports = { requireAuth };
