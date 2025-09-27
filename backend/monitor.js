'use strict';
require('dotenv').config({ path: './config/.env' });

const axios = require('axios');
const winston = require('winston');
const nodemailer = require('nodemailer');
const sql = require('mssql');
const tls = require('tls');

const {
  buildAlertMessage,
  buildServiceAlertObject,
  buildDatabaseAlertObject,
  buildDiskAlertObject,
  logAlertToFile,
  sendSMS
} = require('./utils/helper');

const CHECK_INTERVAL = 1 * 60 * 60 * 1000; // 1 hour

// =====================
// SQL Server Config
// =====================
const dbConfig = {
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  server: process.env.DB_HOST,
  database: process.env.DB_NAME,
  options: { encrypt: false, trustServerCertificate: true }
};

// -------------------- Logger --------------------
const logger = winston.createLogger({
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.printf(
      info => `[${info.timestamp}] ${info.level.toUpperCase()}: ${info.message}`
    )
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: './logs/monitor.log' })
  ]
});


// =====================
// Database Queries
// =====================
async function getServices() {
  const pool = await sql.connect(dbConfig);
  const result = await pool.request().query('SELECT * FROM Services');
  return result.recordset;
}

async function getDatabases() {
  const pool = await sql.connect(dbConfig);
  const result = await pool.request().query('SELECT * FROM Dbs');
  return result.recordset;
}

async function getDisks() {
  const pool = await sql.connect(dbConfig);
  const result = await pool.request().query('SELECT * FROM Disk');
  return result.recordset;
}

// =====================
// Checks
// =====================
async function checkService(service) {
  try {
    const response = await axios.get(service.Url, { timeout: 10000 });
    if (response.status >= 200 && response.status < 300) {
      logger.info(`System is UP: ${service.Name} (${service.Url}) - Status ${response.status}`);
    } else {
      throw new Error(`Bad status code: ${response.status}`);
    }

    if (service.Url.startsWith('https://')) await checkSSL(service);

  } catch (err) {
    const message = `System DOWN: ${service.Name} (${service.Url}) - ${err.message}`;
    logger.error(message);

    // JSON alert
    const alertObj = buildServiceAlertObject(service, err.message);
    logAlertToFile(alertObj);

    // Email & SMS
    const emailMsg = buildAlertMessage(service.Name, service.Url, err.message);
    try { await sendEmail(service.Email, emailMsg.subject, emailMsg.body); } catch (_) {}
    try { await sendSMS(service.Phone, `${message}`); } catch (_) {}
  }
}

async function checkSSL(service) {
  return new Promise(resolve => {
    try {
      const host = new URL(service.Url).hostname;
      const socket = tls.connect(443, host, { servername: host }, () => {
        const cert = socket.getPeerCertificate();
        socket.end();

        if (!cert || !cert.valid_to) return resolve();

        const expiry = new Date(cert.valid_to);
        const now = new Date();
        const daysLeft = Math.ceil((expiry - now) / (1000 * 60 * 60 * 24));

        if (daysLeft < 0 || daysLeft <= 7) {
          const msg = daysLeft < 0
            ? `SSL certificate expired ${-daysLeft} days ago`
            : `SSL certificate expiring in ${daysLeft} days`;

          const alertObj = buildServiceAlertObject(service, msg);
          logAlertToFile(alertObj);

          logger[daysLeft < 0 ? 'error' : 'warn'](`System SSL: ${service.Name} (${service.Url}) - ${msg}`);

          const emailMsg = buildAlertMessage(service.Name, service.Url, msg);
          try { sendEmail(service.Email, emailMsg.subject, emailMsg.body); } catch (_) {}
          try { sendSMS(service.Phone, `[SSL ALERT] ${service.Name} - ${msg}`); } catch (_) {}
        } else {
          logger.info(`System SSL valid: ${service.Name} (${service.Url}) - ${daysLeft} days left`);
        }
        resolve();
      });

      socket.on('error', err => {
        logger.error(`SSL check failed for ${service.Name}: ${err.message}`);
        resolve();
      });

    } catch (err) {
      logger.error(`SSL check exception for ${service.Name}: ${err.message}`);
      resolve();
    }
  });
}

async function checkDatabase(db) {
  try {
    const pool = await sql.connect({
      user: db.Username,
      password: db.Password,
      server: db.Host,
      database: db.DbName,
      options: { encrypt: false, trustServerCertificate: true }
    });
    await pool.request().query('SELECT 1');
    logger.info(`Database is reachable: ${db.DbName} (${db.Host})`);
  } catch (err) {
    const message = `Database DOWN: ${db.DbName} (${db.Host}) - ${err.message}`;
    logger.error(message);

    const alertObj = buildDatabaseAlertObject(db, err.message);
    logAlertToFile(alertObj);

    const emailMsg = buildAlertMessage(db.DbName, db.Host, err.message);
    try { await sendEmail(db.Email, emailMsg.subject, emailMsg.body); } catch (_) {}
    try { await sendSMS(db.Phone, message); } catch (_) {}
  }
}

async function checkDisk(disk) {
  try {
    if (disk.UsagePercent > 90) throw new Error(`Disk ${disk.Drive} usage high: ${disk.UsagePercent}%`);
    logger.info(`Disk OK: ${disk.Host} (${disk.Drive}) - Usage ${disk.UsagePercent}%`);
  } catch (err) {
    const message = `Disk ALERT: ${disk.Host} (${disk.Drive}) - ${err.message}`;
    logger.error(message);

    const alertObj = buildDiskAlertObject(disk, err.message);
    logAlertToFile(alertObj);

    const emailMsg = buildAlertMessage(`${disk.Host}-${disk.Drive}`, disk.Host, err.message);
    try { await sendEmail(disk.Email, emailMsg.subject, emailMsg.body); } catch (_) {}
    try { await sendSMS(disk.Phone, message); } catch (_) {}
  }
}

// =====================
// Send Email
// =====================
async function sendEmail(to, subject, body) {
  if (!to) return;
  try {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
    });
    await transporter.sendMail({ from: process.env.EMAIL_USER, to, subject, text: body });
    logger.info(`Alert email sent to ${to}`);
  } catch (err) {
    logger.error(`Email failed: ${err.message}`);
  }
}

// =====================
// Main Runner
// =====================
async function runChecks() {
  try {
    logger.info('--- Running monitoring checks ---');

    const services = await getServices();
    logger.info(`Fetched ${services.length} services`);

    const databases = await getDatabases();
    logger.info(`Fetched ${databases.length} databases`);

    const disks = await getDisks();
    logger.info(`Fetched ${disks.length} disks`);

    for (const svc of services) await checkService(svc);
    for (const db of databases) await checkDatabase(db);
    for (const disk of disks) await checkDisk(disk);

    logger.info('--- Checks complete ---');
  } catch (err) {
    logger.error(`Monitoring run failed: ${err.message}`);
  }
}

// Run immediately + on schedule
runChecks();
setInterval(runChecks, CHECK_INTERVAL);
