'use strict';
require('dotenv').config({ path: './config/.env' });

const fs = require('fs');
const path = require('path');
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
  sendSMS,
  buildSMSMessage
} = require('./utils/helper');

const CHECK_INTERVAL = 1 * 60 * 60 * 1000; // 1 hour

// SQL Server Config
const dbConfig = {
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  server: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT, 10) || 55770,
  database: process.env.DB_NAME,
  options: { encrypt: false, trustServerCertificate: true }
};

//Logger
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


// Database Queries

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
  const result = await pool.request().query('SELECT * FROM Disks');
  return result.recordset;
}


// Update Status Helpers
async function updateStatus(table, id, status) {
  const pool = await sql.connect(dbConfig);
  await pool.request()
    .input('status', sql.VarChar, status)
    .input('last_checked', sql.DateTime, new Date())
    .input('id', sql.Int, id)
    .query(`
      UPDATE ${table}
      SET Status = @status,
          LastChecked = @last_checked
      WHERE Id = @id
    `);
}

async function updateDiskStatus(id, status) {
  const pool = await sql.connect(dbConfig);
  await pool.request()
    .input("status", sql.VarChar, status)
    .input("last_checked", sql.DateTime, new Date())
    .input("id", sql.Int, id)
    .query(`
      UPDATE Disks
      SET Status = @status,
          LastChecked = @last_checked
      WHERE Id = @id
    `);
}

// Append Alert JSON

function appendAlertHistory(alertObj) {
  const filePath = path.join(__dirname, 'alert-history.json');
  let data = [];
  if (fs.existsSync(filePath)) {
    try { data = JSON.parse(fs.readFileSync(filePath, 'utf8')); } catch (_) { data = []; }
  }
  data.push(alertObj);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}


// Checks

async function checkService(service) {
  try {
    const response = await axios.get(service.Url, { timeout: 10000 });
    if (response.status >= 200 && response.status < 300) {
      logger.info(`System is UP: ${service.Name} (${service.Url}) - Status ${response.status}`);
      await updateStatus('Services', service.Id, 'UP');
    } else {
      throw new Error(`Bad status code: ${response.status}`);
    }

    if (service.Url.startsWith('https://')) await checkSSL(service);

  } catch (err) {
    const message = `System DOWN: ${service.Name} (${service.Url}) - ${err.message}`;
    logger.error(message);

    await updateStatus('Services', service.Id, 'DOWN');

    const alertObj = buildServiceAlertObject(service, err.message);
    alertObj.type = 'service';
    alertObj.status = 'DOWN';
    logAlertToFile(alertObj);
    appendAlertHistory(alertObj);

    const emailMsg = buildAlertMessage(service.Name, service.Url, err.message);
    try { await sendEmail(service.Email, emailMsg.subject, emailMsg.body); } catch (_) { }
    const smsMsg = buildSMSMessage(service.Name, err.message);
    try { await sendSMS(service.SmsNumber, smsMsg); } catch (_) { }

  }
}

async function checkDatabase(db) {
  try {
    const pool = await sql.connect({
      user: db.Username,
      password: db.Password,
      server: db.Host,
      database: db.DbName,
      port: db.Port || 1433,
      options: { encrypt: false, trustServerCertificate: true }
    });
    await pool.request().query('SELECT 1');
    logger.info(`Database is reachable: ${db.DbName} (${db.Host})`);
    await updateStatus('Dbs', db.Id, 'UP');
  } catch (err) {
    const message = `Database DOWN: ${db.DbName} (${db.Host}) - ${err.message}`;
    logger.error(message);

    await updateStatus('Dbs', db.Id, 'DOWN');

    const alertObj = buildDatabaseAlertObject(db, err.message);
    alertObj.type = 'db';
    alertObj.status = 'DOWN';
    logAlertToFile(alertObj);
    appendAlertHistory(alertObj);

    const emailMsg = buildAlertMessage(db.DbName, db.Host, err.message);
    try { await sendEmail(db.Email, emailMsg.subject, emailMsg.body); } catch (_) { }
    try { await sendSMS(db.SmsNumber, message); } catch (_) { }
  }
}

async function checkDisk(disk) {
  try {
    let status = 'ok';
    let message = '';

    if (disk.UsagePercent > 95) {
      status = 'critical';
      message = `Disk ${disk.Drive} usage critical: ${disk.UsagePercent}%`;
    } else if (disk.UsagePercent > 90) {
      status = 'warning';
      message = `Disk ${disk.Drive} usage high: ${disk.UsagePercent}%`;
    }

    if (message) {
      logger.error(`Disk ALERT: ${disk.Host} (${disk.Drive}) - ${message}`);

      const alertObj = buildDiskAlertObject(disk, message);
      // Add type and status so API can count it
      alertObj.type = 'disk';
      alertObj.status = 'DOWN';

      logAlertToFile(alertObj);
      appendAlertHistory(alertObj);

      const emailMsg = buildAlertMessage(`${disk.Host}-${disk.Drive}`, disk.Host, message);
      try { await sendEmail(disk.Email, emailMsg.subject, emailMsg.body); } catch (_) { }
      try { await sendSMS(disk.SmsNumber, message); } catch (_) { }
    } else {
      logger.info(`Disk OK: ${disk.Host} (${disk.Drive}) - Usage ${disk.UsagePercent}%`);
    }

    await updateDiskStatus(disk.Id, status);

  } catch (err) {
    logger.error(`Disk check failed: ${disk.Host} (${disk.Drive}) - ${err.message}`);
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
          appendAlertHistory(alertObj);

          logger[daysLeft < 0 ? 'error' : 'warn'](`System SSL: ${service.Name} (${service.Url}) - ${msg}`);

          const emailMsg = buildAlertMessage(service.Name, service.Url, msg);
          try { sendEmail(service.Email, emailMsg.subject, emailMsg.body); } catch (_) { }
          try { sendSMS(service.SmsNumber, `[SSL ALERT] ${service.Name} - ${msg}`); } catch (_) { }
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

// Send Email
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

// Main Runner
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

runChecks();
setInterval(runChecks, CHECK_INTERVAL);
