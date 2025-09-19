const moment = require('moment');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid'); // <-- import uuid

// -------------------- Timestamp --------------------
function formatTimestamp() {
  return moment().format('YYYY-MM-DD HH:mm:ss');
}

// -------------------- Alert Message --------------------
function buildAlertMessage(serviceName, url, errorMessage) {
  const timestamp = formatTimestamp();

  return {
    subject: ` ${serviceName} Downtime Alert – ${timestamp}`,
    body: `Dear Client,

We have detected that '${serviceName.toUpperCase()}' is currently unreachable and not responding as expected.

Details:
- URL: ${url}
- Issue Detected: ${errorMessage}
- Time: ${timestamp}

Please investigate the issue as soon as possible to restore normal operations.

Best regards,  
System Monitoring Service.`
  };
}

// -------------------- Log Alert --------------------
function logAlertToFile(service, status, message) {
  const filePath = path.join(__dirname, '../logs/alert-history.json');

  const entry = {
    id: Date.now(),
    service_id: service.id,
    name: service.name,
    url: service.url,
    status,
    message,
    timestamp: formatTimestamp()
  };

  const history = (() => {
    try {
      return fs.existsSync(filePath)
        ? JSON.parse(fs.readFileSync(filePath, 'utf8'))
        : [];
    } catch {
      return [];
    }
  })();

  history.push(entry);
  fs.writeFileSync(filePath, JSON.stringify(history, null, 2));
}

// -------------------- Calculate Active Time --------------------
function calculateActiveTime(service, history) {
  const serviceHistory = history.filter(h => h.service_id === service.id);

  if (serviceHistory.length === 0) return "N/A";

  serviceHistory.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

  let lastDown = null;
  for (let i = serviceHistory.length - 1; i >= 0; i--) {
    if (serviceHistory[i].status.toLowerCase() === "down") {
      lastDown = new Date(serviceHistory[i].timestamp);
      break;
    }
  }

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

// -------------------- Send Bulk SMS --------------------
async function sendSMS(recipients, messageText, priority = "Low", messageType = "Normal") {
  const url = "http://172.17.40.39:22000/SMSServiceAPIV2/api/SMSService/sendBulkSMS";

  const payload = {
    recipient: Array.isArray(recipients) ? recipients : [recipients],
    MessageText: messageText,
    UniqueID: uuidv4(),
    Priority: priority,
    MessageType: messageType,
    UserID: process.env.SMS_USER,
    PassWD: process.env.SMS_PASS
  };

  try {
    const response = await axios.post(url, payload);
    return response.data; // Contains responseCode, ExternalReference, etc.
  } catch (err) {
    console.error("SMS send failed:", err.message);
    throw err;
  }
}

module.exports = {
  formatTimestamp,
  buildAlertMessage,
  logAlertToFile,
  calculateActiveTime,
  sendSMS
};
