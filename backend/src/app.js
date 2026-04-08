const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const path = require("path");
const cookieParser = require("cookie-parser");
const { nodeEnv, corsOrigins } = require("./config");
const authRoutes = require("./routes/authRoutes");
const predictionRoutes = require("./routes/predictionRoutes");

const frontendRoot = path.join(__dirname, "..", "..");

const createApp = () => {
  const app = express();

  app.use(helmet());
  app.use(
    cors({
      origin: (origin, callback) => {
        if (!origin) {
          callback(null, true);
          return;
        }

        if (corsOrigins.includes(origin)) {
          callback(null, true);
          return;
        }

        callback(new Error("CORS origin not allowed"));
      },
      credentials: true,
    })
  );
  app.use(express.json({ limit: "1mb" }));
  app.use(cookieParser());
  app.use(morgan(nodeEnv === "production" ? "combined" : "dev"));
  app.use(express.static(frontendRoot));

  app.get("/api/health", (_req, res) => {
    res.json({
      status: "ok",
      service: "curaayur-backend",
      timestamp: new Date().toISOString(),
    });
  });

  app.use("/api/auth", authRoutes);
  app.use("/api/predictions", predictionRoutes);

  app.get("/", (_req, res) => {
    res.sendFile(path.join(frontendRoot, "index.html"));
  });

  app.use((_req, res) => {
    res.status(404).json({ message: "Route not found" });
  });

  app.use((err, _req, res, _next) => {
    res.status(500).json({
      message: "Internal server error",
      detail: nodeEnv === "development" ? err.message : undefined,
    });
  });

  return app;
};

module.exports = {
  createApp,
  frontendRoot,
};
