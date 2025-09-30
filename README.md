SYSTEM MONITOR

BACKEND SUMMARY
This system monitor is designed to monitor critical IT resources (services, databases, and disks) and raise alerts when issues occur. It automatically checks uptime, SSL validity, database connectivity, and memory usage, then logs alerts and notifies administrators via Email and SMS.

Features
•	Service Monitoring: The system monitors websites, APIs, and microservices. Periodic health checks for registered services (via HTTPS and HTTP), including SSL certificate expiry validation.
•	Database Monitoring: Connectivity and availability checks for SQL Server databases.
•	Disk Monitoring: Disk usage checks for defined servers and drives.
•	Alert Management: Alerts stored in JSON (alert-history.json), logged in monitor.log, and sent via Email (SMTP/Gmail) and Bulk SMS API.
•	SMS Alerts: Bulk SMS integration using internal SMS API with unique message IDs for tracking.
•	Scheduling: Monitoring runs every 1 hour
Technologies Used

•	Node.js (runtime)
•	MSSQL (mssql package) for database monitoring
•	Axios for HTTP requests & SMS API integration
•	Nodemailer for email alerts
•	Winston for logging
•	Moment.js for timestamps
•	UUID for unique alert/message IDs

FRONTEND SUMMARY

The frontend of the Monitoring Dashboard is built using React and Tailwind CSS, providing responsive and interactive interface for monitoring servers, databases, disks, and services. It features a sidebar navigation for easy access to Dashboard, Services, Databases, and Disks pages, highlighting the active section. Key functionalities include KPI cards displaying total counts and status summaries, searchable and filterable tables for detailed metrics, and charts (PieCharts and LineCharts via Recharts) to visualize status distributions and historical trends. The frontend fetches data from the backend APIs using Axios, with auto-refresh every 30 seconds, and formats dates according to the Nairobi time zone. Planned improvements include usage progress bars, threshold-based highlights, real-time alerts, and exportable reports. Overall, the frontend delivers a functional, visually intuitive, and extendable monitoring dashboard ready for further enhancements.

To run: Backend: node monitor.js, node server.js
	    Frontend: npm start
