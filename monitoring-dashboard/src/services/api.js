import axios from "axios";

const api = axios.create({
  baseURL: "http://localhost:5000",
});


export const fetchServices = () => api.get("/api/services"); 
export const fetchDatabases = () => api.get("/api/dbs");
export const fetchDisks = () => api.get("/api/disks");
export const fetchAlerts = () => api.get("/api/alerts");
export const fetchSummary = () => api.get("/api/summary");
export const fetchLogs = () => api.get("/api/logs");

export const fetchDowntimeBreakdown = () => api.get("/api/downtime-breakdown");
export const fetchIncidentTrends = () => api.get("/api/incidents-trends");




