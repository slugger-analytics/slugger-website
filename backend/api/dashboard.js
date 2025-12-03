// routes/dashboard.js

import { Router } from "express";
import pool from "../db.js";

const router = Router();

// Optionally: get counts for each section
const widgetCountQuery = "SELECT COUNT(*) AS count FROM widgets";
const teamCountQuery = "SELECT COUNT(*) AS count FROM teams";
const userCountQuery = "SELECT COUNT(*) AS count FROM users";
const categoryCountQuery = "SELECT COUNT(*) AS count FROM categories";

router.get("/", async (req, res) => {
  try {
    // You can run these in parallel if you want actual counts
    const [widgetsRes, teamsRes, usersRes, categoriesRes] = await Promise.all([
      pool.query(widgetCountQuery),
      pool.query(teamCountQuery),
      pool.query(userCountQuery),
      pool.query(categoryCountQuery),
    ]);

    const widgetsCount = Number(widgetsRes.rows[0]?.count || 0);
    const teamsCount = Number(teamsRes.rows[0]?.count || 0);
    const usersCount = Number(usersRes.rows[0]?.count || 0);
    const categoriesCount = Number(categoriesRes.rows[0]?.count || 0);

    res.status(200).json({
      success: true,
      message: "Dashboard data retrieved successfully",
      data: [
        {
          key: "widgets",
          label: "Widgets",
          count: widgetsCount,
          path: "/widget-page", // <-- this is the link your FE uses
        },
        {
          key: "teams",
          label: "Teams",
          count: teamsCount,
          path: "/teams",
          // or whatever your route is
        },
        {
          key: "users",
          label: "Users",
          count: usersCount,
          path: "/users",
        },
        {
          key: "categories",
          label: "Categories",
          count: categoriesCount,
          path: "/categories",
        },
        {
          key: "analytics",
          label: "Analytics",
          // if you don't have a real count, you can omit it
          path: "/analytics",
        },
      ],
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: `Internal error: ${error.message}`,
    });
  }
});

export default router;
