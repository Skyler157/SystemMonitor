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

const formatDateTime = (ts) => {
  if (!ts) return "N/A";
  const date = new Date(ts);
  return date.toLocaleString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  });
};

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
          fetchIncidentTrends("all"),
        ]);

        console.log("Summary API:", s?.data);
        console.log("Alerts API:", a?.data);
        console.log("Downtime API:", d?.data);
        console.log("Trends API:", t?.data);

        // Summary
        setSummary(s?.data || { uptimePercent: 100, activeAlerts: 0, downServices: 0, lastRun: null });

        // Alerts 
        setAlerts(Array.isArray(a?.data) ? a.data.slice(0, 5) : []);

        // Downtime
        const downtimeRaw = d?.data?.data || d?.data || {};
        console.log("Raw downtime:", downtimeRaw);

        const downtimeData = [
          { name: "Services", value: Number(downtimeRaw.services ?? 0) },
          { name: "Databases", value: Number(downtimeRaw.dbs ?? 0) },
          { name: "Disks", value: Number(downtimeRaw.disks ?? 0) }
        ];
        setDowntime(downtimeData);


        //Trends 
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
      <h2 className="text-2xl font-bold">System OverView</h2>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card title="Uptime" value={`${summary.uptimePercent}%`} />
        <Card title="Active Alerts" value={summary.activeAlerts} />
        <Card title="Down Services" value={summary.downServices} />
        <Card title="Last Run" value={formatDateTime(summary.lastRun)} />

      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        {/* Downtime Breakdown */}
        <div className="bg-white p-4 rounded-lg shadow w-full h-64">
          <h3 className="font-semibold mb-2">Downtime Breakdown</h3>

          {(() => {
            const hasDowntime = downtime.some(d => d.value > 0);

            if (!hasDowntime) {
              return <p className="text-gray-500 text-center mt-10">No downtime data available</p>;
            }

            return (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={downtime.filter(d => d.value > 0)}
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
            <p className="text-gray-500 text-center mt-10">No incident data available</p>
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
        <h3 className="font-semibold mb-4">Latest Alerts</h3>

        {alerts.length === 0 ? (
          <p className="text-gray-500 text-center">No recent alerts</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left border-collapse">
              <thead>
                <tr className="bg-gray-100 text-gray-600 uppercase text-xs">
                  <th className="p-2">Status</th>
                  <th className="p-2">Type</th>
                  <th className="p-2">Message</th>
                  <th className="p-2">Time</th>
                </tr>
              </thead>
              <tbody>
                {alerts.map((a, idx) => (
                  <tr key={idx} className="border-t">
                    <td className="p-2">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${a.status === "DOWN"
                          ? "bg-red-100 text-red-700"
                          : "bg-yellow-100 text-yellow-700"
                          }`}
                      >
                        {a.status}
                      </span>
                    </td>
                    <td className="p-2 text-gray-700">
                      {a.type || "—"}
                    </td>
                    <td className="p-2">
                      {typeof a.message === "object"
                        ? JSON.stringify(a.message)
                        : a.message}
                    </td>
                    <td className="p-2 text-gray-500">
                      ({a.timestamp})
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
};

export default Dashboard;
