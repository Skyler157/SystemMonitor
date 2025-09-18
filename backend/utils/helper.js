const moment = require('moment');
const fs = require('fs');
const path = require('path');


function formatTimestamp() {
    return moment().format('YYYY-MM-DD HH:mm:ss');
}


function buildAlertMessage(serviceName, url, errorMessage) {
    const timestamp = formatTimestamp();

    return {
        subject: ` ${serviceName} Downtime Alert – ${timestamp}`,
        body:

`Dear Client,

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


module.exports = {
    formatTimestamp,
    buildAlertMessage,
    logAlertToFile
};
