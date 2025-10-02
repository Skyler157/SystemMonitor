require('dotenv').config({ path: './config/.env' });
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const sql = require('mssql');

const app = express();
app.use(cors());
app.use(express.json());

const LOG_FILE = path.join(__dirname, 'logs', 'monitor.log');
const ALERT_FILE = path.join(__dirname, 'logs', 'alert-history.json');

const dbConfig = {
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    server: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT, 10) || 1433,
    database: process.env.DB_NAME,
    options: { encrypt: false, trustServerCertificate: true }
};

// Helper: read alerts file
function readAlerts() {
    try {
        if (!fs.existsSync(ALERT_FILE)) return [];
        const raw = fs.readFileSync(ALERT_FILE, 'utf8');
        return JSON.parse(raw);
    } catch (err) {
        console.error('readAlerts error', err);
        return [];
    }
}

// Helper: parse log lines from monitor.log
function parseLogLines(raw) {
    const lines = raw.trim().split(/\r?\n/).filter(Boolean);
    const parsed = lines.map(line => {
        const m = line.match(/^\[(.+?)\]\s+(\w+):\s+(.*)$/);
        if (m) {
            return { timestamp: m[1], level: m[2], message: m[3] };
        }
        return { raw: line };
    });
    return parsed;
}

// --- EXISTING ROUTES ---

// GET /api/alerts?limit=50
app.get('/api/alerts', (req, res) => {
    const limit = parseInt(req.query.limit || '100', 10);
    const alerts = readAlerts().slice(-limit).reverse();
    res.json(alerts);
});

// GET /api/logs?lines=200
app.get('/api/logs', (req, res) => {
    const lines = parseInt(req.query.lines || '200', 10);
    try {
        if (!fs.existsSync(LOG_FILE)) return res.json([]);
        const raw = fs.readFileSync(LOG_FILE, 'utf8');
        const parsed = parseLogLines(raw);
        res.json(parsed.slice(-lines).reverse());
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/services
app.get('/api/services', async (req, res) => {
    try {
        const pool = await sql.connect(dbConfig);
        const result = await pool.request().query('SELECT * FROM Services');
        const services = result.recordset || [];
        const alerts = readAlerts();

        const enriched = services.map(s => {
            const latest = [...alerts].reverse().find(a =>
                (a.service_id && String(a.service_id) === String(s.Id)) ||
                (a.url && s.Url && String(a.url) === String(s.Url))
            );
            const status = latest && latest.status === 'DOWN' ? 'DOWN' : 'UP';
            return { ...s, status, lastAlert: latest || null };
        });

        res.json(enriched);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/summary
app.get('/api/summary', async (req, res) => {
  try {
    const pool = await sql.connect(dbConfig);
    const result = await pool.request().query('SELECT * FROM Services');
    const services = result.recordset || [];

    const total = services.length;
    const down = services.filter(s => s.Status === 'DOWN').length;
    const uptimePercent = total === 0 ? 100 : Math.round(((total - down) / total) * 10000) / 100;

    res.json({
      totalServices: total,
      downServices: down,
      uptimePercent,
      activeAlerts: down, // or count from alerts if you want
      lastRun: new Date().toISOString()
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});



// GET /api/dbs
app.get('/api/dbs', async (req, res) => {
    try {
        const pool = await sql.connect(dbConfig);
        const result = await pool.request().query('SELECT * FROM Dbs');
        res.json(result.recordset || []);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/disks
app.get('/api/disks', async (req, res) => {
    try {
        const pool = await sql.connect(dbConfig);
        const result = await pool.request().query('SELECT * FROM Disks');
        res.json(result.recordset || []);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/downtime-breakdown
app.get('/api/downtime-breakdown', async (req, res) => {
    try {
        const alerts = readAlerts();

        // Count unique services down
        const services = new Set(
            alerts
                .filter(a => a.type === 'service' && a.status === 'DOWN')
                .map(a => a.service_id) // or 'Id' depending on your object
        ).size;

        // Count unique databases down
        const dbs = new Set(
            alerts
                .filter(a => a.type === 'db' && a.status === 'DOWN')
                .map(a => a.service_id)
        ).size;

        // Count unique disks down
        const disks = new Set(
            alerts
                .filter(a => a.type === 'disk' && a.status === 'DOWN')
                .map(a => a.service_id)
        ).size;

        res.json({ data: { services, dbs, disks } });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});



// GET /api/incidents-trends?type=
app.get('/api/incidents-trends', (req, res) => {
  try {
    const alerts = readAlerts();
    const type = req.query.type; // service | db | disk | all

    // filter by type if provided
    let filtered = alerts;
    if (type && type !== 'all') {
      filtered = alerts.filter(a => a.type === type);
    }

    // group alerts by date
    const counts = {};
    filtered.forEach(a => {
      const d = new Date(a.timestamp);
      if (!isNaN(d)) {
        const key = d.toISOString().split("T")[0]; 
        counts[key] = (counts[key] || 0) + 1;
      }
    });

    const trends = Object.entries(counts).map(([date, count]) => ({
      date,
      count
    }));

    res.json({ data: trends });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});




const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Monitoring API listening on ${PORT}`));
