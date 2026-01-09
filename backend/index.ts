import express from "express";
import cors from "cors";
import jwt from "jsonwebtoken";
import cookieParser from "cookie-parser";
import { query } from "./db";
import { fileURLToPath } from "url";
import path from "path";

// Only load dotenv in local development (NOT in Coolify / Docker)
if (process.env.NODE_ENV !== "production") {
  await import("dotenv/config");
}

// Import ALL backend routers
import bankAccounts from "./api/bankAccounts";
import expenses from "./api/expenses";
import leads from "./api/leads";
import leadFollowUps from "./api/leadFollowUps";
import leadInteractions from "./api/leadInteractions";
import materials from "./api/materials";
import notifications from "./api/notifications";
import payments from "./api/payments";
import products from "./api/products";
import projects from "./api/projects";
import quotations from "./api/quotations";
import supplierPayments from "./api/supplierPayments";
import suppliers from "./api/suppliers";
import tasks from "./api/tasks";
import users, { mapUser } from "./api/users";
import uploads from "./api/uploads";
import teams from "./api/teams";
import teamWork from "./api/teamWork";
import teamPayments from "./api/teamPayments";
import settings from "./api/settings";
import analytics from "./api/analytics";

import { errorHandler, notFoundHandler } from "./middleware/errorHandler";

// =============================
// DB Connectivity Check
// =============================
(async () => {
  try {
    const result = await query("SELECT current_database()");
    console.log("BACKEND CONNECTED TO DB =", result[0].current_database);
    console.log("✓ Database connection successful");
  } catch (err: any) {
    console.warn(
      "WARNING: Database not reachable on startup:",
      err?.code || err?.message || err
    );
    console.warn("The server will start but database operations will fail.");
  }
})();

const app = express();
const port = Number(process.env.PORT || 3000);
const JWT_SECRET = process.env.JWT_SECRET || "dev-secret";
const REFRESH_SECRET = process.env.REFRESH_SECRET || "super-secret-refresh-key";

// =============================
// ESM __dirname Fix
// =============================
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// =============================
// Static Uploads
// =============================
app.use(
  "/uploads",
  (req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Methods", "GET");
    res.header("Access-Control-Allow-Headers", "Content-Type");
    next();
  },
  express.static(path.join(__dirname, "./uploads"))
);

// =============================
// CORS
// =============================
const corsOptions = {
  origin: [
    "http://localhost:5173",
    "http://localhost:5174",
    "http://localhost:5175",
    "http://localhost:5176",
    "http://localhost:6173",
    "http://localhost:4173",
    "http://69.28.88.246",
    "https://artistic-engineers.vercel.app",
    "https://7dc136738acd.ngrok-free.app",
    process.env.APP_ORIGIN || "https://artistics-engineers.vercel.app",
  ],
  credentials: true,
};

app.use(cors(corsOptions));
app.use(cookieParser());
app.use(express.json());

// =============================
// Routes
// =============================
app.use("/api", bankAccounts);
app.use("/api", expenses);
app.use("/api", leads);
app.use("/api", leadFollowUps);
app.use("/api", leadInteractions);
app.use("/api", materials);
app.use("/api", notifications);
app.use("/api", payments);
app.use("/api", products);
app.use("/api", projects);
app.use("/api", quotations);
app.use("/api", supplierPayments);
app.use("/api", suppliers);
app.use("/api", tasks);
app.use("/api", users);
app.use("/api", uploads);
app.use("/api", teamWork);
app.use("/api", teamPayments);
app.use("/api", teams);
app.use("/api", settings);
app.use("/api", analytics);

// =============================
// Auth
// =============================
app.post("/auth/login", async (req, res) => {
  const { username, password } = req.body;

  try {
    const result = await query(
      "SELECT * FROM users WHERE username = $1 AND is_active = TRUE",
      [username]
    );

    if (result.length === 0 || password !== result[0].password) {
      return res.status(401).json({ error: "Invalid username or password" });
    }

    const user = result[0];

    const refreshToken = jwt.sign({ id: user.id }, REFRESH_SECRET, {
      expiresIn: "1825d",
    });

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 5 * 365 * 24 * 60 * 60 * 1000,
    });

    res.json({
      success: true,
      token: refreshToken,
      user: mapUser(user),
    });
  } catch (err) {
    console.error("LOGIN ERROR:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// =============================
// Health
// =============================
app.get("/api/health", (_req, res) => {
  res.json({ ok: true, status: "Backend + DB alive" });
});

// =============================
// Errors
// =============================
app.use(notFoundHandler);
app.use(errorHandler);

// =============================
// Start
// =============================
app.listen(port, () => {
  console.log(`🚀 Backend running at http://localhost:${port}`);
  console.log(`NODE_ENV = ${process.env.NODE_ENV}`);
  console.log(`DATABASE_URL present = ${process.env.DATABASE_URL ? "YES" : "NO"}`);
});
