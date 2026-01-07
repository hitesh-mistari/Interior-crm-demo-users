import express from "express";
import { query } from "../db";

const router = express.Router();

// Helper: Convert DB snake_case → JS camelCase
// Helper: Convert DB snake_case → JS camelCase
export function mapUser(row: any) {
  let permissions = row.permissions;
  if (typeof permissions === 'string') {
    try { permissions = JSON.parse(permissions); } catch (e) { }
  }
  return {
    id: row.id,
    username: row.username,
    fullName: row.full_name,
    password: row.password,
    photoUrl: row.photo_url,
    role: row.role,
    phone: row.phone,
    isActive: row.is_active,
    roleMode: row.role_mode,
    permissions: permissions
  };
}

// ==========================
// GET ALL USERS
// ==========================
router.get("/users", async (req, res) => {
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  try {
    const rows = await query(
      `SELECT id, username, full_name, password, photo_url, role, phone, is_active, role_mode, permissions 
       FROM users
       ORDER BY id DESC`
    );

    const mappedUsers = rows.map(mapUser);

    res.json(mappedUsers);
  } catch (err) {
    console.error("GET users error:", err);
    res.status(500).json({ error: "Failed to get users" });
  }
});

// ==========================
// GET SINGLE USER
// ==========================
router.get("/users/:id", async (req, res) => {
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  try {
    const id = req.params.id;

    const rows = await query(
      `SELECT id, username, full_name, password, photo_url, role, phone, is_active, role_mode, permissions 
       FROM users 
       WHERE id = $1`,
      [id]
    );

    if (rows.length === 0)
      return res.status(404).json({ error: "User not found" });

    res.json(mapUser(rows[0]));
  } catch (err) {
    console.error("GET user error:", err);
    res.status(500).json({ error: "Failed to get user" });
  }
});

// ==========================
// CREATE USER
// ==========================
router.post("/users", async (req, res) => {
  try {
    const { username, fullName, password, photoUrl, role, phone, roleMode, permissions } = req.body;

    if (!username || !password)
      return res.status(400).json({ error: "username and password required" });

    const finalName = fullName || username;

    const exist = await query(
      `SELECT id FROM users WHERE username = $1`,
      [username]
    );
    if (exist.length > 0)
      return res.status(409).json({ error: "Username already exists" });

    const result = await query(
      `INSERT INTO users (username, full_name, password, photo_url, role, phone, role_mode, permissions)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id, username, full_name, photo_url, role, phone, is_active, role_mode, permissions`,
      [username, finalName, password, photoUrl || null, role, phone || null, roleMode || 'default', permissions ? JSON.stringify(permissions) : null]
    );

    res.status(201).json(mapUser(result[0]));
  } catch (err) {
    console.error("CREATE user error:", err);
    res.status(500).json({ error: "Failed to create user" });
  }
});

// ==========================
// UPDATE USER
// ==========================
router.put("/users/:id", async (req, res) => {
  try {
    const id = req.params.id;

    const {
      username,
      fullName,
      password,
      photoUrl,
      role,
      phone,
      isActive,
      roleMode,
      permissions
    } = req.body;



    // If password is present → update it
    let result;

    if (password) {
      result = await query(
        `UPDATE users
         SET username = COALESCE($1, username),
             full_name = COALESCE($2, full_name),
             password = COALESCE($3, password),
             photo_url = COALESCE($4, photo_url),
             role = COALESCE($5, role),
             phone = COALESCE($6, phone),
             is_active = COALESCE($7, is_active),
             role_mode = COALESCE($8, role_mode),
             permissions = CASE WHEN $9::text IS NOT NULL THEN $9::jsonb ELSE permissions END
         WHERE id = $10
         RETURNING id, username, full_name, password, photo_url, role, phone, is_active, role_mode, permissions`,
        [username, fullName, password, photoUrl, role, phone, isActive, roleMode, permissions ? JSON.stringify(permissions) : null, id]
      );
    } else {
      result = await query(
        `UPDATE users
         SET username = COALESCE($1, username),
             full_name = COALESCE($2, full_name),
             photo_url = COALESCE($3, photo_url),
             role = COALESCE($4, role),
             phone = COALESCE($5, phone),
             is_active = COALESCE($6, is_active),
             role_mode = COALESCE($7, role_mode),
             permissions = CASE WHEN $8::text IS NOT NULL THEN $8::jsonb ELSE permissions END
         WHERE id = $9
         RETURNING id, username, full_name, password, photo_url, role, phone, is_active, role_mode, permissions`,
        [username, fullName, photoUrl, role, phone, isActive, roleMode, permissions ? JSON.stringify(permissions) : null, id]
      );
    }



    if (result.length === 0)
      return res.status(404).json({ error: "User not found" });

    const updatedUser = mapUser(result[0]);

    res.json(updatedUser);
  } catch (err) {
    console.error("UPDATE user error:", err);
    res.status(500).json({ error: "Failed to update user" });
  }
});

// ==========================
// DELETE USER (PERMANENT)
// ==========================
router.delete("/users/:id", async (req, res) => {
  const id = req.params.id;

  try {
    // Check if user exists
    const rows = await query(
      `SELECT * FROM users WHERE id = $1`,
      [id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    // Permanently delete the user from the database
    await query(
      `DELETE FROM users WHERE id = $1`,
      [id]
    );

    res.json({ ok: true, message: "User deleted successfully" });
  } catch (err) {
    console.error("DELETE user error:", err);
    res.status(500).json({ error: "Failed to delete user" });
  }
});

export default router;
