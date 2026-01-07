import { Router } from "express";
import { query, withTransaction } from "../db";

const router = Router();

// Get all settings
router.get("/settings", async (req, res, next) => {
    try {
        const rows = await query("SELECT * FROM system_settings");
        res.json(rows);
    } catch (err) {
        next(err);
    }
});

// Update single setting
router.put("/settings/:key", async (req, res, next) => {
    try {
        const { key } = req.params;
        const { value } = req.body;

        // Check if exists
        const existing = await query("SELECT id FROM system_settings WHERE setting_key = $1", [key]);

        let result;
        if (existing.length > 0) {
            result = await query(
                "UPDATE system_settings SET setting_value = $1, updated_at = now() WHERE setting_key = $2 RETURNING *",
                [value, key]
            );
        } else {
            result = await query(
                "INSERT INTO system_settings (setting_key, setting_value) VALUES ($1, $2) RETURNING *",
                [key, value]
            );
        }

        res.json(result[0]);
    } catch (err) {
        next(err);
    }
});

// Batch update
router.post("/settings/batch", async (req, res, next) => {
    try {
        const { updates } = req.body; // Expects array of { key, value }

        if (!Array.isArray(updates)) {
            // @ts-ignore
            return res.status(400).json({ error: "Invalid updates format" });
        }

        const results = await withTransaction(async (client) => {
            const updated = [];
            for (const { key, value } of updates) {
                const existing = await client.query("SELECT id FROM system_settings WHERE setting_key = $1", [key]);

                if (existing.rows.length > 0) {
                    const res = await client.query(
                        "UPDATE system_settings SET setting_value = $1, updated_at = now() WHERE setting_key = $2 RETURNING *",
                        [value, key]
                    );
                    updated.push(res.rows[0]);
                } else {
                    const res = await client.query(
                        "INSERT INTO system_settings (setting_key, setting_value) VALUES ($1, $2) RETURNING *",
                        [key, value]
                    );
                    updated.push(res.rows[0]);
                }
            }
            return updated;
        });

        res.json(results);
    } catch (err) {
        next(err);
    }
});

export default router;
