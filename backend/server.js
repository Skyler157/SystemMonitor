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

// ==================== Services API ====================
app.get('/api/services', async (req, res) => {
  try {
    const [services] = await db.query('SELECT * FROM services');
    res.json(services);
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
    res.json(services[0]);
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
