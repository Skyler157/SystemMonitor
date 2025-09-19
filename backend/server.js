'use strict';
require('dotenv').config({ path: './config/.env' });

const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// MySQL pool
const db = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

// ==================== Helper ====================
function calculateActiveTime(service, history) {
  const serviceHistory = history.filter(h => h.service_id === service.id);

  if (serviceHistory.length === 0) return "N/A";

  // Sort by timestamp
  serviceHistory.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

  // Find last downtime
  let lastDown = null;
  for (let i = serviceHistory.length - 1; i >= 0; i--) {
    if (serviceHistory[i].status.toLowerCase() === "down") {
      lastDown = new Date(serviceHistory[i].timestamp);
      break;
    }
  }

  // If never down, start from first log
  const startTime = lastDown || new Date(serviceHistory[0].timestamp);
  const endTime =
    service.status.toLowerCase() === "up"
      ? new Date()
      : new Date(service.last_checked);

  const diffMs = endTime - startTime;
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

  return `${days}d ${hours}h ${minutes}m`;
}

// ==================== Services API ====================
app.get('/api/services', async (req, res) => {
  try {
    const [services] = await db.query('SELECT * FROM services');

    // Load alert history
    const historyPath = path.join(__dirname, 'logs/alert-history.json');
    const history = fs.existsSync(historyPath)
      ? JSON.parse(fs.readFileSync(historyPath, 'utf8'))
      : [];

    // Append active_time
    const servicesWithActive = services.map(s => ({
      ...s,
      active_time: calculateActiveTime(s, history),
    }));

    res.json(servicesWithActive);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch services' });
  }
});

app.get('/api/services/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const [services] = await db.query('SELECT * FROM services WHERE id = ?', [id]);
    if (services.length === 0) return res.status(404).json({ error: 'Service not found' });

    // Load alert history
    const historyPath = path.join(__dirname, 'logs/alert-history.json');
    const history = fs.existsSync(historyPath)
      ? JSON.parse(fs.readFileSync(historyPath, 'utf8'))
      : [];

    // Add active_time to single service
    const service = {
      ...services[0],
      active_time: calculateActiveTime(services[0], history),
    };

    res.json(service);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch service' });
  }
});

// ==================== Alert History API ====================
app.get('/api/alert-history', (req, res) => {
  const filePath = path.join(__dirname, 'logs/alert-history.json');
  try {
    if (!fs.existsSync(filePath)) return res.json([]);
    const data = fs.readFileSync(filePath, 'utf8');
    const history = JSON.parse(data);
    res.json(history);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch alert history' });
  }
});

// ==================== Start Server ====================
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
