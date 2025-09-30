import { useEffect, useState, useMemo } from "react";
import {
  fetchServices,
  fetchSummary,
  fetchIncidentTrends,
} from "../services/api";
import Card from "../components/Card";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

// Helper to format dates
const formatDate = (dateString) => {
  if (!dateString) return "—";
  try {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat("en-KE", {
      dateStyle: "short",
      timeStyle: "medium",
      timeZone: "Africa/Nairobi",
    }).format(date);
  } catch {
    return dateString;
  }
};

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"];

const Services = () => {
  const [summary, setSummary] = useState(null);
  const [services, setServices] = useState([]);
  const [trends, setTrends] = useState([]);

  // New states for search + filters
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");

  useEffect(() => {
    const load = async () => {
      try {
        const [s, svc, t] = await Promise.all([
          fetchSummary(),
          fetchServices(),
          fetchIncidentTrends("services"),
        ]);

        setSummary(s?.data || null);
        setServices(Array.isArray(svc?.data) ? svc.data : []);

        const trendsRaw = t?.data?.data || [];
        const trendsData = trendsRaw.map((item) => ({
          date: item.date,
          count: Number(item.count ?? 0),
        }));
        setTrends(trendsData);
      } catch (err) {
        console.error("Services load error:", err);
      }
    };

    load();
    const interval = setInterval(load, 30000); // refresh every 30s
    return () => clearInterval(interval);
  }, []);

  // Filtered + searched services
  const filteredServices = useMemo(() => {
    return services.filter((s) => {
      const matchesSearch =
        s.Name?.toLowerCase().includes(search.toLowerCase()) ||
        s.Url?.toLowerCase().includes(search.toLowerCase());

      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "up" && s.Status?.toLowerCase() === "up") ||
        (statusFilter === "down" && s.Status?.toLowerCase() === "down");

      const matchesType =
        typeFilter === "all" || s.Type?.toLowerCase() === typeFilter.toLowerCase();


      return matchesSearch && matchesStatus && matchesType;
    });
  }, [services, search, statusFilter, typeFilter]);

  // Service Type Breakdown data for PieChart
  const serviceTypeData = useMemo(() => {
    const counts = {};
    services.forEach((s) => {
      const type = s.Type || "Unknown";
      counts[type] = (counts[type] || 0) + 1;
    });
    return Object.keys(counts).map((type) => ({
      name: type,
      value: counts[type],
    }));
  }, [services]);

  if (!summary) return <p className="p-6">Loading services...</p>;

  return (
    <div className="p-6 space-y-6">
      <h2 className="text-2xl font-bold">Services Overview</h2>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card title="Total Services" value={summary.totalServices} />
        <Card
          title="Services Up"
          value={summary.totalServices - summary.downServices}
        />
        <Card title="Services Down" value={summary.downServices} />
        <Card title="Uptime" value={`${summary.uptimePercent}%`} />
        <Card title="Active Alerts" value={summary.activeAlerts} />
      </div>

      {/* Filters + Search */}
      <div className="bg-white p-4 rounded-lg shadow space-y-3">
        <h3 className="font-semibold">Filters</h3>
        <div className="flex flex-col md:flex-row gap-3">
          <input
            type="text"
            placeholder="Search by name or URL..."
            className="border rounded px-3 py-2 flex-1"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select
            className="border rounded px-3 py-2"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">All Statuses</option>
            <option value="up">Up</option>
            <option value="down">Down</option>
          </select>
          <select
            className="border rounded px-3 py-2"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
          >
            <option value="all">All Types</option>
            <option value="api">API</option>
            <option value="website">Website</option>
            <option value="microservice">Microservice</option>
          </select>
        </div>
      </div>

      {/* Services Table */}
      <div className="bg-white p-4 rounded-lg shadow">
        <h3 className="font-semibold mb-2">All Services</h3>
        <div className="overflow-x-auto">
          <table className="table-auto w-full text-sm">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-4 py-2 text-left">Name</th>
                <th className="px-4 py-2 text-left">URL</th>
                <th className="px-4 py-2 text-left">Type</th>
                <th className="px-4 py-2 text-left">Status</th>
                <th className="px-4 py-2 text-left">Last Checked</th>
              </tr>
            </thead>
            <tbody>
              {filteredServices.length === 0 ? (
                <tr>
                  <td colSpan="6" className="text-center text-gray-500 py-4">
                    No services found
                  </td>
                </tr>
              ) : (
                filteredServices.map((s) => (
                  <tr key={s.Id} className="border-t">
                    <td className="px-4 py-2">{s.Name || "Unnamed"}</td>
                    <td className="px-4 py-2">{s.Url}</td>
                    <td className="px-4 py-2">{s.Type}</td>
                    <td className="px-4 py-2">
                      {s.Status?.toUpperCase() === "UP" ? (
                        <span className="px-2 py-1 text-xs rounded bg-green-100 text-green-800">
                          UP
                        </span>
                      ) : (
                        <span className="px-2 py-1 text-xs rounded bg-red-100 text-red-800">
                          DOWN
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2">
                      {s.lastAlert?.timestamp
                        ? formatDate(s.lastAlert.timestamp)
                        : "—"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Service Type Breakdown */}
      <div className="bg-white p-4 rounded-lg shadow w-full h-96">
        <h3 className="font-semibold mb-2">Service Type Breakdown</h3>
        {serviceTypeData.length === 0 ? (
          <p className="text-gray-500 text-center mt-10">
            No service type data
          </p>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={serviceTypeData}
                cx="50%"
                cy="50%"
                labelLine={false}
                outerRadius={100}
                dataKey="value"
                label={({ name, percent }) =>
                  `${name} ${(percent * 100).toFixed(0)}%`
                }
              >
                {serviceTypeData.map((_, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={COLORS[index % COLORS.length]}
                  />
                ))}
              </Pie>
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Downtime History */}
      <div className="bg-white p-4 rounded-lg shadow w-full h-72">
        <h3 className="font-semibold mb-2">Service Downtime History</h3>
        {trends.length === 0 ? (
          <p className="text-gray-500 text-center mt-10">No downtime history</p>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={trends}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Line
                type="monotone"
                dataKey="count"
                stroke="#ef4444"
                strokeWidth={2}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
};

export default Services;
