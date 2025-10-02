const moment = require('moment');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const axios = require('axios');

const ALERT_HISTORY_FILE = path.join(__dirname, '../logs/alert-history.json');

// Time Formatter
function formatTimestamp() {
  return moment().format('YYYY-MM-DD HH:mm:ss');
}

// Email Alert Builder 
function buildAlertMessage(serviceName, url, errorMessage) {
  const timestamp = formatTimestamp();
  return {
    subject: `${serviceName} Downtime Alert – ${timestamp}`,
    body: `Dear Client,

We have detected that '${serviceName.toUpperCase()}' is currently unreachable or not responding as expected.

Details:
- URL: ${url}
- Issue Detected: ${errorMessage}
- Time: ${timestamp}

Please investigate the issue as soon as possible to restore normal operations.

Best regards,  
System Monitoring Service.`
  };
}

function buildSMSMessage(serviceName, errorMessage) {
  const timestamp = moment().format('YYYY-MM-DD HH:mm:ss');
  return `${serviceName.toUpperCase()} Downtime Alert!

Issue: ${errorMessage}
Time: ${timestamp}

Please investigate as soon as possible. - System Monitoring Service`;
}

// Build Alert Objects for JSON 
function buildServiceAlertObject(service, errorMessage) {
  return {
    id: Date.now(),
    service_id: service.Id || null,
    url: service.Url,
    status: 'DOWN',
    message: errorMessage,
    timestamp: formatTimestamp()
  };
}

function buildDatabaseAlertObject(db, errorMessage) {
  return {
    id: Date.now(),
    service_id: db.Id || null,
    name: db.DbName,
    url: db.Host,
    status: 'DOWN',
    message: errorMessage,
    timestamp: formatTimestamp()
  };
}

function buildDiskAlertObject(disk, errorMessage) {
  return {
    id: Date.now(),
    service_id: disk.Id || null,
    name: `${disk.Host}-${disk.Drive}`,
    url: disk.Host,
    status: 'WARNING',
    message: errorMessage,
    timestamp: formatTimestamp()
  };
}

// Log Alert to JSON
function logAlertToFile(alertObject) {
  const history = (() => {
    try {
      return fs.existsSync(ALERT_HISTORY_FILE)
        ? JSON.parse(fs.readFileSync(ALERT_HISTORY_FILE, 'utf8'))
        : [];
    } catch {
      return [];
    }
  })();

  history.push(alertObject);
  fs.writeFileSync(ALERT_HISTORY_FILE, JSON.stringify(history, null, 2));
}

//Send SMS
async function sendSMS(msisdn, messageText, priority = "Low", messageType = "Normal") {
  const url = "http://172.17.40.39:22000/SMSServiceAPIV2/api/SMSService/sendSMS";

  const recipient = Array.isArray(msisdn) ? msisdn[0] : msisdn;

  const payload = {
    Msisdn: recipient,
    MessageText: messageText,
    UniqueID: uuidv4(),
    Priority: priority,
    MessageType: messageType,
    UserID: process.env.SMS_USER || "CSUSER",
    PassWD: process.env.SMS_PASS || "Craftsilicon@2103"
  };

  try {
    const response = await axios.post(url, payload, {
      headers: { "Content-Type": "application/json" }
    });
    console.log(`[SMS] Sent to ${recipient}:`, response.data);
    return response.data;
  } catch (err) {
    console.error(`[SMS] Failed to send to ${recipient}:`, err.message);
    if (err.response) console.error("Server response:", err.response.data);
    throw err;
  }
}



// Exports 
module.exports = {
  formatTimestamp,
  buildAlertMessage,
  buildSMSMessage,
  buildServiceAlertObject,
  buildDatabaseAlertObject,
  buildDiskAlertObject,
  logAlertToFile,
  sendSMS
};
