// --- imports (unchanged) ---
import { useEffect, useState } from "react";
import axios from "axios";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import {
  CheckCircleIcon,
  ExclamationCircleIcon,
  XCircleIcon,
} from "@heroicons/react/24/solid";

export default function Dashboard() {
  const [services, setServices] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    let intervalId;

    async function fetchData() {
      try {
        const [servicesRes, historyRes] = await Promise.all([
          axios.get("http://localhost:5000/api/services"),
          axios.get("http://localhost:5000/api/alert-history"),
        ]);

        setServices(servicesRes.data);
        setHistory(historyRes.data);
      } catch (err) {
        console.error("Failed to fetch data", err);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
    intervalId = setInterval(fetchData, 30000);
    return () => clearInterval(intervalId);
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen bg-gray-50">
        <div className="flex flex-col items-center">
          <svg
            className="animate-spin h-8 w-8 text-indigo-500 mb-4"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            ></circle>
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8v8z"
            ></path>
          </svg>
          <p className="text-gray-500 text-lg">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  // ⏱️ Helper to format durations
  const formatDuration = (ms) => {
    const sec = Math.floor(ms / 1000);
    const min = Math.floor(sec / 60);
    const hrs = Math.floor(min / 60);
    const days = Math.floor(hrs / 24);
    if (days > 0) return `${days}d ${hrs % 24}h`;
    if (hrs > 0) return `${hrs}h ${min % 60}m`;
    if (min > 0) return `${min}m ${sec % 60}s`;
    return `${sec}s`;
  };

  // ⏱️ Compute active time since last downtime
  const computeActiveTime = (service) => {
    if (service.status !== "up") return "0"; // currently not active

    const serviceHistory = history
      .filter((h) => h.service_id === service.id)
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    // find most recent downtime/error
    const lastDown = serviceHistory.find(
      (h) => h.status === "down" || h.status === "error"
    );

    const now = new Date();
    const since = lastDown ? new Date(lastDown.timestamp) : new Date(service.created_at || service.last_checked);
    return formatDuration(now - since);
  };

  // Chart data
  const chartData = history.map((h) => ({
    timestamp: new Date(h.timestamp).toLocaleString(),
    [h.name]: h.status === "up" ? 1 : h.status === "error" ? 0.5 : 0,
  }));

  // Service status summary
  const total = services.length;
  const upCount = services.filter((s) => s.status === "up").length;
  const errorCount = services.filter((s) => s.status === "error").length;
  const downCount = services.filter((s) => s.status === "down").length;



  // ✅ Apply search + filter
  const filteredServices = services.filter((s) => {
    const matchesSearch =
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.url.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus =
      statusFilter === "all" ? true : s.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="p-6 space-y-10 bg-gradient-to-br from-indigo-50 to-white min-h-screen">
      <h1 className="text-4xl font-extrabold text-gray-800 mb-2 tracking-tight text-center">
        Monitoring Dashboard
      </h1>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-2">
        <div className="bg-white rounded-xl shadow flex flex-col items-center py-6 border border-gray-100">
          <span className="text-2xl font-bold text-indigo-600">{total}</span>
          <span className="text-gray-500 mt-1">Total Services</span>
        </div>
        <div className="bg-white rounded-xl shadow flex flex-col items-center py-6 border border-gray-100">
          <div className="flex items-center gap-2">
            <CheckCircleIcon className="h-6 w-6 text-green-500" />
            <span className="text-xl font-bold text-green-600">{upCount}</span>
          </div>
          <span className="text-gray-500 mt-1">Up</span>
        </div>
        <div className="bg-white rounded-xl shadow flex flex-col items-center py-6 border border-gray-100">
          <div className="flex items-center gap-2">
            <XCircleIcon className="h-6 w-6 text-red-500" />
            <span className="text-xl font-bold text-red-600">{downCount}</span>
            <ExclamationCircleIcon className="h-6 w-6 text-orange-400 ml-2" />
            <span className="text-xl font-bold text-orange-500">
              {errorCount}
            </span>
          </div>
          <span className="text-gray-500 mt-1">Down / Error</span>
        </div>
      </div>

      {/* Current Services Table */}
      <div>
        <h2 className="text-2xl font-semibold mb-4 text-gray-700">
          Current Services
        </h2>

        {/* Search + Filter Controls */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
          <input
            type="text"
            placeholder="Search by name or URL..."
            className="px-4 py-2 border rounded-lg shadow-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none w-full md:w-1/3"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <select
            className="px-4 py-2 border rounded-lg shadow-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none w-full md:w-40"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">All Statuses</option>
            <option value="up">Up</option>
            <option value="down">Down</option>
            <option value="error">Error</option>
          </select>
        </div>

        {/* Filtered Services Table */}
        <div className="overflow-x-auto bg-white rounded-2xl shadow-md border border-gray-100">
          <table className="min-w-full text-sm text-left text-gray-600">
            <thead className="bg-gray-100 text-gray-700 text-sm uppercase">
              <tr>
                <th className="px-6 py-3">Service</th>
                <th className="px-6 py-3">URL</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3">Active Time</th>
                <th className="px-6 py-3">Last Checked</th>
              </tr>
            </thead>
            <tbody>
              {filteredServices.map((service) => {
                let statusIcon = null;
                if (service.status === "up")
                  statusIcon = (
                    <CheckCircleIcon className="h-5 w-5 text-green-500 mr-1" />
                  );
                else if (service.status === "error")
                  statusIcon = (
                    <ExclamationCircleIcon className="h-5 w-5 text-orange-400 mr-1" />
                  );
                else
                  statusIcon = (
                    <XCircleIcon className="h-5 w-5 text-red-500 mr-1" />
                  );

                return (
                  <tr
                    key={service.id}
                    className="border-b last:border-none hover:bg-gray-50"
                  >
                    <td className="px-6 py-4 font-medium text-gray-900 flex items-center">
                      {statusIcon}
                      {service.name}
                    </td>
                    <td className="px-6 py-4">{service.url}</td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-medium shadow-sm ${service.status === "up"
                          ? "bg-green-100 text-green-800"
                          : service.status === "error"
                            ? "bg-orange-100 text-orange-800"
                            : "bg-red-100 text-red-800"
                          }`}
                      >
                        {service.status.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {service.active_time ?? computeActiveTime(service)}
                    </td>
                    <td className="px-6 py-4 text-xs text-gray-500">
                      {new Date(service.last_checked).toLocaleString()}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Status History Timeline */}
      <div className="bg-white shadow-md rounded-lg p-4">
        <h2 className="text-xl font-bold mb-4">Status History</h2>

        {/* Time markers: 0h = left, 24h = right */}
        <div className="flex justify-between text-xs text-gray-500 mb-2 px-1">
          {[0, 6, 12, 18, 24].map((h) => (
            <span key={h}>{h}h</span>
          ))}
        </div>

        <div className="overflow-x-auto">
          <div className="min-w-[600px] space-y-6">
            {services.map((service) => {
              const rangeStart = new Date(Date.now() - 48 * 60 * 60 * 1000); // 48h window
              const rangeEnd = new Date();
              const totalDuration = rangeEnd - rangeStart;

              const serviceHistory = history
                .filter(
                  (h) =>
                    h.service_id === service.id &&
                    new Date(h.timestamp) >= rangeStart
                )
                .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp)); // ascending

              if (serviceHistory.length === 0) {
                return (
                  <div key={service.id} className="mb-4">
                    <h3 className="font-semibold mb-2">{service.name}</h3>
                    <div className="h-6 bg-gray-100 rounded border border-gray-200 flex items-center justify-center text-xs text-gray-400">
                      No data
                    </div>
                  </div>
                );
              }

              return (
                <div key={service.id}>
                  <h3 className="font-semibold mb-2">{service.name}</h3>
                  <div className="relative h-6 bg-gray-100 rounded overflow-hidden border border-gray-200">
                    {serviceHistory.map((entry, i) => {
                      const entryTime = new Date(entry.timestamp);
                      const next = serviceHistory[i + 1];

                      // Clip segment to the range window
                      const segmentStart = entryTime < rangeStart ? rangeStart : entryTime;
                      const segmentEndTime = next ? new Date(next.timestamp) : rangeEnd;
                      const segmentEnd = segmentEndTime > rangeEnd ? rangeEnd : segmentEndTime;

                      const startPercent = ((segmentStart - rangeStart) / totalDuration) * 100;
                      const widthPercent = ((segmentEnd - segmentStart) / totalDuration) * 100;

                      // Color by status
                      const statusColor =
                        entry.status.toLowerCase() === "up"
                          ? "bg-green-500"
                          : entry.status.toLowerCase() === "down"
                            ? "bg-red-500"
                            : "bg-orange-400";

                      return (
                        <div
                          key={i}
                          className={`absolute top-0 h-full ${statusColor}`}
                          style={{
                            left: `${startPercent}%`,
                            width: `${Math.max(widthPercent, 0.5)}%`,
                            minWidth: "2px",
                          }}
                          title={`${entry.status.toUpperCase()} - ${entryTime.toLocaleTimeString()} (for ${Math.round(
                            (segmentEnd - segmentStart) / 60000
                          )} mins)`}
                        />
                      );
                    })}
                  </div>



                  {/* Incidents summary */}
                  <div className="mt-1 flex flex-wrap gap-2">
                    {(() => {
                      const nonUp = serviceHistory.filter((h) => h.status !== "up");
                      const latest = nonUp[nonUp.length - 1];
                      return latest ? (
                        <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-600">
                          {latest.status.toUpperCase()} @{" "}
                          {new Date(latest.timestamp).toLocaleTimeString()}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">No incidents</span>
                      );
                    })()}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>



    </div>
  );
}
