'use strict';
require('dotenv').config({ path: './config/.env' });

const axios = require('axios');
const winston = require('winston');
const nodemailer = require('nodemailer');
const mysql = require('mysql2/promise');

const { buildAlertMessage, logAlertToFile, sendSMS } = require('./utils/helper'); 
const CHECK_INTERVAL = 1 * 60 * 60 * 1000; // 1 hour

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

// -------------------- DB Pool --------------------
const db = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME
});

// -------------------- Email Transport --------------------
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: Number(process.env.EMAIL_PORT),
  secure: process.env.EMAIL_SECURE === 'true',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// -------------------- Check System Status --------------------
async function checkSystemStatus() {
  try {
    const [services] = await db.query('SELECT * FROM services');

    for (const service of services) {
      try {
        const response = await axios.get(service.url, { timeout: 10000 });

        if (response.status >= 200 && response.status < 400) {
          logger.info(`System is UP: ${service.name} (${service.url}) - Status ${response.status}`);
          await db.query(
            'UPDATE services SET status = ?, last_checked = NOW() WHERE id = ?',
            ['up', service.id]
          );
        } else {
          logger.warn(`System reachable but returned error: ${service.name} - Status ${response.status}`);
          await db.query(
            'UPDATE services SET status = ?, last_checked = NOW() WHERE id = ?',
            ['error', service.id]
          );
        }

      } catch (error) {
        logger.error(`System DOWN: ${service.name} (${service.url}) - ${error.message}`);
        await db.query(
          'UPDATE services SET status = ?, last_checked = NOW() WHERE id = ?',
          ['down', service.id]
        );

        // Send alerts
        sendDowntimeAlert(service, error.message);
      }
    }
  } catch (err) {
    logger.error(`Failed to fetch services: ${err.message}`);
  }
}

// -------------------- Send Downtime Alerts --------------------
function sendDowntimeAlert(service, errorMessage) {
  const { subject, body } = buildAlertMessage(service.name, service.url, errorMessage);

  // Send Email
  const mailOptions = {
    from: `"System Monitor" <${process.env.EMAIL_USER}>`,
    to: service.email,
    subject,
    text: body
  };

  transporter.sendMail(mailOptions)
    .then(() => {
      logger.info(`Email alert sent for ${service.name} to ${service.email}`);
      logAlertToFile(service, 'DOWN', errorMessage);
    })
    .catch(err => {
      logger.error(`Failed to send email alert for ${service.name}: ${err.message}`);
    });

  // Send SMS 
  if (service.phone) {
    const smsMessage = `ALERT: ${service.name} is DOWN. Issue: ${errorMessage}`;
    sendSMS([service.phone], smsMessage) // sendSMS expects an array
      .then(response => {
        if (response && response.responseCode === "000") {
          logger.info(`SMS alert sent for ${service.name} to ${service.phone}`);
        } else {
          logger.warn(`SMS not delivered for ${service.name}: ${JSON.stringify(response)}`);
        }
      })
      .catch(err => {
        logger.error(`Failed to send SMS alert for ${service.name}: ${err.message}`);
      });
  }
}

// -------------------- Start Monitoring --------------------
checkSystemStatus();
setInterval(checkSystemStatus, CHECK_INTERVAL);
