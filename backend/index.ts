import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import jwt from "jsonwebtoken";
import cookieParser from "cookie-parser";
import { query } from "./db";
// ⭐ MUST BE AT TOP (ESM path fixes)
// duplicate import removed
import { fileURLToPath } from "url";

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

import trashLogs from "./api/trashLogs";
import users, { mapUser } from "./api/users";
import uploads from "./api/uploads";
import teams from "./api/teams";
import teamWork from "./api/teamWork";
import teamPayments from "./api/teamPayments";
import settings from "./api/settings";
import analytics from "./api/analytics";

import path from "path";
import { errorHandler, notFoundHandler } from './middleware/errorHandler';


dotenv.config();

// DB connectivity check - no schema creation
(async () => {
  try {
    const result = await query("SELECT current_database()");
    console.log("BACKEND CONNECTED TO DB =", result[0].current_database);
    console.log("✓ Database connection successful");
    console.log("NOTE: Run database migrations separately using SQL scripts");
  } catch (err: any) {
    console.warn("WARNING: Database not reachable on startup:", err?.code || err?.message || err);
    console.warn("The server will start but database operations will fail.");
  }
})();

const app = express();
const port = Number(process.env.PORT || 3000);
const JWT_SECRET = process.env.JWT_SECRET || "dev-secret";

// ⭐ Compute __dirname (ESM)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ⭐ Serve image uploads correctly with CORS headers
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

const corsOptions = {
  origin: [
    "http://localhost:5173",
    "http://localhost:5174",
    "http://localhost:5175",
    "http://localhost:5176",
    "http://localhost:6173",
    "http://localhost:4173",
    "http://69.28.88.246/api",
    "https://artistic-engineers.vercel.app",
    "https://7dc136738acd.ngrok-free.app",
    process.env.APP_ORIGIN || "https://artistics-engineers.vercel.app",
  ],
  credentials: true,
};

app.use(cors(corsOptions));
app.use(cookieParser());
app.use(express.json());

// Register routes under /api
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

app.use("/api", trashLogs);
app.use("/api", users);
app.use("/api", uploads);
app.use("/api", teamWork);
app.use("/api", teamPayments);
app.use("/api", teams);
app.use("/api", settings);
app.use("/api", analytics);



const REFRESH_SECRET = process.env.REFRESH_SECRET || "super-secret-refresh-key";

// LOGIN API - Permanent Session
app.post("/auth/login", async (req, res) => {
  const { username, password } = req.body;


  try {
    const result = await query(
      "SELECT * FROM users WHERE username = $1 AND is_active = TRUE",
      [username]
    );

    if (result.length === 0) {

      return res.status(401).json({ error: "Invalid username or password" });
    }

    const user = result[0];


    if (password !== user.password) {

      return res.status(401).json({ error: "Invalid username or password" });
    }



    // Create Refresh Token (5 Years)
    const refreshToken = jwt.sign(
      { id: user.id },
      REFRESH_SECRET,
      { expiresIn: "1825d" } // ~5 years
    );

    // Store in HttpOnly Cookie
    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax", // Lax is better for localhost dev across ports
      maxAge: 5 * 365 * 24 * 60 * 60 * 1000 // 5 years
    });

    // Use mapUser() to ensure permissions are properly parsed from JSON
    const mappedUser = mapUser(user);


    res.json({
      success: true,
      token: refreshToken, // Return token so frontend can store in localStorage
      user: mappedUser,
    });
  } catch (err) {
    console.error("LOGIN ERROR:", err);
    res.status(500).json({ error: err instanceof Error ? err.message : "Server error" });
  }
});

// CHECK SESSION
// TEMP DEBUG ROUTE
app.get("/debug/schema", async (req, res) => {
  try {
    const result = await query(
      `SELECT column_name, data_type, udt_name 
       FROM information_schema.columns 
       WHERE table_name = 'expenses' AND column_name = 'receipt_images'`
    );
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/auth/session", async (req, res) => {
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");

  // Strategy: Try Cookie first, if fails (or missing), try Header.
  // This handles the case where a STALE cookie exists but the frontend has a FRESH token in localStorage.

  const cookieToken = req.cookies.refreshToken;
  let headerToken: string | null = null;

  if (req.headers.authorization) {
    const parts = req.headers.authorization.split(' ');
    if (parts.length === 2 && parts[0] === 'Bearer') {
      headerToken = parts[1];
    }
  }

  // Helper to verify a token and get user
  const verifyAndGetUser = async (t: string) => {
    try {
      const decoded = jwt.verify(t, REFRESH_SECRET) as any;
      const result = await query("SELECT id, username, full_name, photo_url, role, role_mode, permissions FROM users WHERE id = $1 AND is_active = TRUE", [decoded.id]);
      if (result.length > 0) {
        return { user: mapUser(result[0]), token: t };
      }
    } catch { }
    return null;
  };

  // 1. Try Cookie
  if (cookieToken) {
    const valid = await verifyAndGetUser(cookieToken);
    if (valid) return res.json({ active: true, user: valid.user, token: valid.token });
  }

  // 2. Try Header (Fallback if cookie missing or invalid)
  if (headerToken) {
    const valid = await verifyAndGetUser(headerToken);
    if (valid) return res.json({ active: true, user: valid.user, token: valid.token });
  }

  return res.json({ active: false });
});

app.post("/auth/refresh", async (req, res) => {
  const token = req.cookies.refreshToken;
  if (!token) return res.status(401).json({ error: "No refresh token" });

  try {
    const decoded = jwt.verify(token, REFRESH_SECRET) as any;
    // Issue a new access token (in our case, we reuse the refresh token logic or issue a new one)
    // Since App uses the same token for both, we can just return the same one or a new signed one.
    // For simplicity and to match login structure, let's just return the existing valid token found in cookie
    // or re-sign if we want rotation. Here we just return the token so frontend can grab it.

    // Check if user still exists/active
    const result = await query("SELECT id FROM users WHERE id = $1 AND is_active = TRUE", [decoded.id]);
    if (result.length === 0) return res.status(401).json({ error: "User inactive" });

    // We can just return the cookie token as the access token
    res.json({ success: true, token: token });
  } catch (err) {
    res.status(401).json({ error: "Invalid refresh token" });
  }
});

// LOGOUT
app.post("/auth/logout", (req, res) => {
  res.clearCookie("refreshToken");
  res.json({ success: true });
});

// Health Check
app.get("/api/health", (_req, res) => {
  res.json({ ok: true, message: "Backend connected to database" });
});

// ========================================
// ERROR HANDLING MIDDLEWARE (Must be last)
// ========================================

// 404 handler for unmatched routes
app.use(notFoundHandler);

// Global error handler
app.use(errorHandler);

// Start Server
app.listen(port, () => {
  console.log(`Backend running at http://localhost:${port}`);
});
