

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
import { CheckCircleIcon, ExclamationCircleIcon, XCircleIcon } from "@heroicons/react/24/solid";


export default function Dashboard() {


  const [services, setServices] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

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


  if (loading)
    return (
      <div className="flex justify-center items-center h-screen bg-gray-50">
        <div className="flex flex-col items-center">
          <svg className="animate-spin h-8 w-8 text-indigo-500 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path>
          </svg>
          <p className="text-gray-500 text-lg">Loading dashboard...</p>
        </div>
      </div>
    );


  // Prepare chart data
  const chartData = history.map((h) => ({
    timestamp: new Date(h.timestamp).toLocaleString(),
    [h.name]: h.status === "up" ? 1 : h.status === "error" ? 0.5 : 0,
  }));

  // Service status summary
  const total = services.length;
  const upCount = services.filter((s) => s.status === "up").length;
  const errorCount = services.filter((s) => s.status === "error").length;
  const downCount = services.filter((s) => s.status === "down").length;

  // Custom dot for service color (matches line color)
  const renderCustomDot = (props, color) => {
    const { cx, cy } = props;
    return <circle cx={cx} cy={cy} r={5} fill={color} stroke="#fff" strokeWidth={1.5} />;
  };

  // Assign a color to each service for the chart
  const chartColors = [
    "#6366f1", // indigo
    "#22c55e", // green
    "#f59e42", // orange
    "#ef4444", // red
    "#0ea5e9", // sky
    "#a21caf", // purple
    "#eab308", // yellow
    "#14b8a6", // teal
    "#f43f5e", // pink
    "#64748b", // slate
  ];

  return (
    <div className="p-6 space-y-10 bg-gradient-to-br from-indigo-50 to-white min-h-screen">
      <h1 className="text-4xl font-extrabold text-gray-800 mb-2 tracking-tight text-center">
        Monitoring Dashboard
      </h1>

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
            <span className="text-xl font-bold text-orange-500">{errorCount}</span>
          </div>
          <span className="text-gray-500 mt-1">Down / Error</span>
        </div>
      </div>

      {/* Current Services */}
      <div>
        <h2 className="text-2xl font-semibold mb-4 text-gray-700">Current Services</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {services.map((service, idx) => {
            let statusIcon = null;
            if (service.status === "up") statusIcon = <CheckCircleIcon className="h-5 w-5 text-green-500 mr-1" />;
            else if (service.status === "error") statusIcon = <ExclamationCircleIcon className="h-5 w-5 text-orange-400 mr-1" />;
            else statusIcon = <XCircleIcon className="h-5 w-5 text-red-500 mr-1" />;
            return (
              <div
                key={service.id}
                className="bg-white p-5 rounded-2xl shadow-md border border-gray-100 flex flex-col justify-between transition-transform hover:scale-[1.025] hover:shadow-lg group"
              >
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    {statusIcon}
                    <h3 className="text-lg font-semibold text-gray-800 group-hover:text-indigo-600 transition-colors">{service.name}</h3>
                  </div>
                  <p className="text-sm text-gray-500 truncate">{service.url}</p>
                </div>
                <div className="mt-4 flex items-center justify-between">
                  <span
                    className={`px-3 py-1 rounded-full text-sm font-medium shadow-sm ${service.status === "up"
                        ? "bg-green-100 text-green-800"
                        : service.status === "error"
                          ? "bg-orange-100 text-orange-800"
                          : "bg-red-100 text-red-800"
                      }`}
                  >
                    {service.status.toUpperCase()}
                  </span>
                  <span className="text-gray-400 text-xs text-right ml-2">
                    {new Date(service.last_checked).toLocaleString()}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Status History Chart */}
      <div className="bg-white p-6 rounded-2xl shadow-md border border-gray-100">
        <h2 className="text-2xl font-semibold mb-4 text-gray-700">Status History</h2>
        <ResponsiveContainer width="100%" height={400}>
          <LineChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="timestamp" tick={{ fontSize: 12 }} minTickGap={30} />
            <YAxis domain={[0, 1]} tick={{ fontSize: 12 }} ticks={[0, 0.5, 1]} tickFormatter={(v) => (v === 1 ? "Up" : v === 0.5 ? "Error" : "Down")} />
            <Tooltip formatter={(v) => (v === 1 ? "Up" : v === 0.5 ? "Error" : "Down")} />
            <Legend wrapperStyle={{ fontSize: 14 }} />
            {services.map((s, idx) => (
              <Line
                key={s.id}
                type="monotone"
                dataKey={s.name}
                stroke={chartColors[idx % chartColors.length]}
                strokeWidth={2.5}
                dot={(props) => renderCustomDot(props, chartColors[idx % chartColors.length])}
                activeDot={{ r: 7 }}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
