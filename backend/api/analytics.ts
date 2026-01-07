import express from "express";
import { query } from "../db";

const router = express.Router();

router.get("/analytics/financial-summary", async (req, res) => {
    try {
        // Generate dates for the last 6 months (inclusive of current month)
        // We strive for strict consistency with the dashboard logic:
        // Revenue = Total Payments Received (payments table)
        // Expense = Total Expenses (expenses table + team_work_entries table)

        // We use a CTE to generate the last 6 months
        // Then LEFT JOIN the aggregations

        const sql = `
      WITH months AS (
        SELECT to_char(d, 'Mon') as month_label,
               date_trunc('month', d) as month_start,
               date_trunc('month', d) + interval '1 month' - interval '1 second' as month_end,
               extract(month from d) as month_num
        FROM generate_series(
          date_trunc('month', CURRENT_DATE) - interval '5 months',
          date_trunc('month', CURRENT_DATE),
          '1 month'::interval
        ) d
      ),
      monthly_revenue AS (
        SELECT 
          date_trunc('month', payment_date) as month_start,
          SUM(amount) as total_revenue
        FROM payments
        WHERE deleted = FALSE
        GROUP BY 1
      ),
      monthly_expenses AS (
        SELECT 
          date_trunc('month', expense_date) as month_start,
          SUM(amount) as total_expense
        FROM expenses
        WHERE deleted = FALSE
        GROUP BY 1
      ),
      monthly_team_work AS (
        SELECT 
          date_trunc('month', work_date) as month_start,
          SUM(amount) as total_work_amount
        FROM team_work_entries
        WHERE deleted = FALSE
        GROUP BY 1
      )
      SELECT 
        m.month_label as month,
        COALESCE(r.total_revenue, 0) as revenue,
        COALESCE(e.total_expense, 0) + COALESCE(t.total_work_amount, 0) as expense
      FROM months m
      LEFT JOIN monthly_revenue r ON r.month_start = m.month_start
      LEFT JOIN monthly_expenses e ON e.month_start = m.month_start
      LEFT JOIN monthly_team_work t ON t.month_start = m.month_start
      ORDER BY m.month_start ASC;
    `;

        const rows = await query(sql);

        // Format for frontend
        const data = rows.map((row: any) => ({
            month: row.month,
            revenue: Number(row.revenue),
            expense: Number(row.expense)
        }));

        res.json(data);

    } catch (err: any) {
        console.error("GET /analytics/financial-summary error:", err);
        res.status(500).json({ error: "Failed to fetch financial summary" });
    }
});

export default router;
