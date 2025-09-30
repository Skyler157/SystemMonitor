import { useEffect, useState } from "react";
import Card from "../components/Card";
import {
  fetchSummary,
  fetchAlerts,
  fetchDowntimeBreakdown,
  fetchIncidentTrends
} from "../services/api";
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  LineChart, Line, XAxis, YAxis, CartesianGrid
} from "recharts";

const Dashboard = () => {
  const [summary, setSummary] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [downtime, setDowntime] = useState([]);
  const [trends, setTrends] = useState([]);

  useEffect(() => {
    const load = async () => {
      try {
        const [s, a, d, t] = await Promise.all([
          fetchSummary(),
          fetchAlerts(),
          fetchDowntimeBreakdown(),
          fetchIncidentTrends()
        ]);

        console.log("Summary API:", s?.data);
        console.log("Alerts API:", a?.data);
        console.log("Downtime API:", d?.data);
        console.log("Trends API:", t?.data);

        // --- Summary ---
        setSummary(s?.data || { uptimePercent: 100, activeAlerts: 0, downServices: 0, lastRun: null });

        // --- Alerts ---
        setAlerts(Array.isArray(a?.data) ? a.data.slice(0, 5) : []);

        // --- Downtime
        const downtimeRaw = d?.data?.data || d?.data || {};
        console.log("Raw downtime:", downtimeRaw);

        const downtimeData = [
          { name: "Services", value: Number(downtimeRaw.services ?? 0) },
          { name: "Databases", value: Number(downtimeRaw.dbs ?? 0) },
          { name: "Disks", value: Number(downtimeRaw.disks ?? 0) }
        ];
        setDowntime(downtimeData);


        // --- Trends ---
        const trendsRaw = t?.data?.data || t?.data || [];
        console.log("Raw trends array:", trendsRaw);

        const trendsData = trendsRaw.map(item => ({
          date: item.date || item.timestamp || "N/A",
          count: Number(item.count ?? item.incidents ?? 0)
        }));
        console.log("Processed trends data:", trendsData);
        setTrends(trendsData);

      } catch (err) {
        console.error("Dashboard load error:", err);
      }
    };

    load();
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, []);

  if (!summary) return <p className="p-6">Loading...</p>;

  const COLORS = ["#ef4444", "#3b82f6", "#22c55e"]; // Red, Blue, Green

  return (
    <div className="p-6 space-y-6">
      <h2 className="text-2xl font-bold">System 360° View</h2>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card title="Uptime" value={`${summary.uptimePercent}%`} />
        <Card title="Active Alerts" value={summary.activeAlerts} />
        <Card title="Down Services" value={summary.downServices} />
        <Card title="Last Run" value={summary.lastRun || "N/A"} />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        {/* Downtime Breakdown */}
        <div className="bg-white p-4 rounded-lg shadow w-full h-64">
          <h3 className="font-semibold mb-2">Downtime Breakdown</h3>

          {(() => {
            const hasDowntime = downtime.some(d => d.value > 0);

            if (!hasDowntime) {
              return <p className="text-gray-500 text-center mt-10">No downtime data available 🎉</p>;
            }

            return (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={downtime.filter(d => d.value > 0)} // <-- remove zero-value slices
                    dataKey="value"
                    nameKey="name"
                    outerRadius={80}
                    label
                  >
                    {downtime
                      .filter(d => d.value > 0)
                      .map((entry, index) => (
                        <Cell key={index} fill={COLORS[index % COLORS.length]} />
                      ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>

            );
          })()}
        </div>


        {/* Incidents Over Time */}
        <div className="bg-white p-4 rounded-lg shadow w-full h-64">
          <h3 className="font-semibold mb-2">Incidents Over Time</h3>
          {trends.length === 0 || trends.every(t => t.count === 0) ? (
            <p className="text-gray-500 text-center mt-10">No incident data available 🎉</p>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trends}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="count" stroke="#3b82f6" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

      </div>

      {/* Alerts */}
      <div className="bg-white p-4 rounded-lg shadow">
        <h3 className="font-semibold mb-2">Latest Alerts</h3>
        <ul className="text-sm space-y-1">
          {alerts.length === 0 ? (
            <li className="text-gray-500">No recent alerts 🎉</li>
          ) : (
            alerts.map((a, idx) => (
              <li key={idx}>
                {a.status === "DOWN" ? "🛑" : "⚠️"}{" "}
                {typeof a.message === "object" ? JSON.stringify(a.message) : a.message}
                ({a.timestamp})
              </li>
            ))
          )}
        </ul>
      </div>
    </div>
  );
};

export default Dashboard;
