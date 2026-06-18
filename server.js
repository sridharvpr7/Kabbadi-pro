// =============================================
//  KABADDI TOURNAMENT - Backend Server
//  Node.js + Express + MySQL
// =============================================

require("dotenv").config();

const express = require("express");
const mysql   = require("mysql2/promise");
const cors    = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

// ── MySQL Connection Pool ──
const pool = mysql.createPool({
    host:               process.env.MYSQL_HOST     || "localhost",
    port:               process.env.MYSQL_PORT     || 3306,
    user:               process.env.MYSQL_USER     || "root",
    password:           process.env.MYSQL_PASSWORD || "",
    database:           process.env.MYSQL_DATABASE || "kabaddi",
    waitForConnections: true,
    connectionLimit:    10,
    ssl: process.env.MYSQL_SSL === "true" ? { rejectUnauthorized: false } : undefined
});

// ── Create Tables on Startup ──
async function initDB() {
    await pool.query(`
        CREATE TABLE IF NOT EXISTS settings (
            \`key\`   VARCHAR(255) PRIMARY KEY,
            \`value\` TEXT
        )
    `);

    await pool.query(`
        CREATE TABLE IF NOT EXISTS teams (
            id      INT AUTO_INCREMENT PRIMARY KEY,
            name    VARCHAR(255) UNIQUE NOT NULL,
            players JSON DEFAULT ('[]')
        )
    `);

    await pool.query(`
        CREATE TABLE IF NOT EXISTS fixtures (
            id              INT AUTO_INCREMENT PRIMARY KEY,
            round           VARCHAR(255),
            team1           VARCHAR(255),
            team2           VARCHAR(255),
            score1          VARCHAR(50)  DEFAULT '',
            score2          VARCHAR(50)  DEFAULT '',
            status          VARCHAR(50)  DEFAULT 'Upcoming',
            knockout        TINYINT(1)   DEFAULT 0,
            team1_players   JSON         DEFAULT ('[]'),
            team2_players   JSON         DEFAULT ('[]'),
            secret_password VARCHAR(255) DEFAULT ''
        )
    `);

    console.log("✅ Database tables ready");
}

initDB().catch(err => {
    console.error("❌ DB init failed:", err.message);
});

// ── Test connection ──
pool.query("SELECT 1").then(() => console.log("✅ MySQL Connected!")).catch(err => console.error("❌ MySQL Connection Error:", err.message));

// ======================
//  SETTINGS ROUTES
// ======================

app.get("/api/settings", async (req, res) => {
    try {
        const [rows] = await pool.query("SELECT * FROM settings");
        const settings = {};
        rows.forEach(row => (settings[row.key] = row.value));
        res.json(settings);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post("/api/settings", async (req, res) => {
    try {
        const { key, value } = req.body;
        await pool.query(
            "INSERT INTO settings (`key`, `value`) VALUES (?, ?) ON DUPLICATE KEY UPDATE `value` = VALUES(`value`)",
            [key, value]
        );
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete("/api/settings/:key", async (req, res) => {
    try {
        await pool.query("DELETE FROM settings WHERE `key` = ?", [req.params.key]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ======================
//  TEAMS ROUTES
// ======================

app.get("/api/teams", async (req, res) => {
    try {
        const [rows] = await pool.query("SELECT * FROM teams ORDER BY id");
        res.json(rows.map(r => ({
            id:      r.id,
            name:    r.name,
            players: r.players ?? []
        })));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post("/api/teams", async (req, res) => {
    try {
        const { name, players } = req.body;
        const [result] = await pool.query(
            "INSERT INTO teams (name, players) VALUES (?, ?)",
            [name, JSON.stringify(players || [])]
        );
        res.json({ id: result.insertId, name, players: players || [] });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put("/api/teams/:id", async (req, res) => {
    try {
        const { players } = req.body;
        await pool.query(
            "UPDATE teams SET players = ? WHERE id = ?",
            [JSON.stringify(players), req.params.id]
        );
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete("/api/teams/:id", async (req, res) => {
    try {
        await pool.query("DELETE FROM teams WHERE id = ?", [req.params.id]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ======================
//  FIXTURES ROUTES
// ======================

function mapFixture(r) {
    return {
        id:             r.id,
        round:          r.round,
        team1:          r.team1,
        team2:          r.team2,
        score1:         r.score1,
        score2:         r.score2,
        status:         r.status,
        knockout:       !!r.knockout,
        team1Players:   r.team1_players   ?? [],
        team2Players:   r.team2_players   ?? [],
        secretPassword: r.secret_password ?? ""
    };
}

app.get("/api/fixtures", async (req, res) => {
    try {
        const [rows] = await pool.query("SELECT * FROM fixtures ORDER BY id");
        res.json(rows.map(mapFixture));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post("/api/fixtures/replace", async (req, res) => {
    try {
        const { fixtures } = req.body;
        await pool.query("DELETE FROM fixtures");

        for (const f of fixtures) {
            await pool.query(
                `INSERT INTO fixtures
                 (round, team1, team2, score1, score2, status, knockout,
                  team1_players, team2_players, secret_password)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    f.round,
                    f.team1,
                    f.team2,
                    f.score1         || "",
                    f.score2         || "",
                    f.status         || "Upcoming",
                    f.knockout       ? 1 : 0,
                    JSON.stringify(f.team1Players || []),
                    JSON.stringify(f.team2Players || []),
                    f.secretPassword || ""
                ]
            );
        }

        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put("/api/fixtures/:id", async (req, res) => {
    try {
        const f = req.body;
        await pool.query(
            `UPDATE fixtures SET
                score1          = ?,
                score2          = ?,
                status          = ?,
                team1_players   = ?,
                team2_players   = ?,
                secret_password = ?
             WHERE id = ?`,
            [
                f.score1         || "",
                f.score2         || "",
                f.status,
                JSON.stringify(f.team1Players || []),
                JSON.stringify(f.team2Players || []),
                f.secretPassword || "",
                req.params.id
            ]
        );
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete("/api/fixtures", async (req, res) => {
    try {
        await pool.query("DELETE FROM fixtures");
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ======================
//  RESET ALL DATA
// ======================
app.delete("/api/reset", async (req, res) => {
    try {
        await pool.query("DELETE FROM fixtures");
        await pool.query("DELETE FROM teams");
        await pool.query("DELETE FROM settings");
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ── Start Server ──
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));