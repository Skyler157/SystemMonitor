import { useEffect, useState, useMemo } from "react";
import { fetchDisks } from "../services/api";
import Card from "../components/Card";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  Tooltip,
} from "recharts";

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"];

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

const Disks = () => {
  const [disks, setDisks] = useState([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // --- Fetch disks from API
  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetchDisks();
        setDisks(res?.data || []);
      } catch (err) {
        console.error("Disks load error:", err);
      }
    };
    load();
    const interval = setInterval(load, 30000); // refresh every 30s
    return () => clearInterval(interval);
  }, []);

  // --- Filtered disks based on search & status
  const filteredDisks = useMemo(() => {
    return disks.filter((d) => {
      const matchesSearch =
        d.Host.toLowerCase().includes(search.toLowerCase()) ||
        d.Drive.toLowerCase().includes(search.toLowerCase());

      const matchesStatus =
        statusFilter === "all" ||
        d.Status.toLowerCase() === statusFilter.toLowerCase();

      return matchesSearch && matchesStatus;
    });
  }, [disks, search, statusFilter]);

  // --- Disk status breakdown for PieChart
  const statusData = useMemo(() => {
    const counts = {};
    disks.forEach((d) => {
      const status = d.Status || "unknown";
      counts[status] = (counts[status] || 0) + 1;
    });
    return Object.keys(counts).map((key) => ({
      name: key,
      value: counts[key],
    }));
  }, [disks]);

  

  return (
    <div className="p-6 space-y-6">
      <h2 className="text-2xl font-bold">Disk Overview</h2>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card title="Total Disks" value={disks.length} />
        <Card title="Disks OK" value={disks.filter(d => d.Status === "ok").length} />
        <Card title="Disks Warning" value={disks.filter(d => d.Status === "warning").length} />
        <Card title="Disks Critical" value={disks.filter(d => d.Status === "critical").length} />
      </div>

      {/* Search + Filter */}
      <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
        <input
          type="text"
          placeholder="Search by server or mount..."
          className="border px-3 py-2 rounded w-full md:w-1/3"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          className="border px-3 py-2 rounded"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="all">All Statuses</option>
          <option value="ok">OK</option>
          <option value="warning">Warning</option>
          <option value="critical">Critical</option>
        </select>
      </div>

      {/* Disks Table */}
      <div className="bg-white p-4 rounded-lg shadow overflow-x-auto">
        <h3 className="font-semibold mb-2">All Disks</h3>
        <table className="table-auto w-full text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="px-4 py-2 text-left">Server</th>
              <th className="px-4 py-2 text-left">Mount</th>
              <th className="px-4 py-2 text-left">Total (GB)</th>
              <th className="px-4 py-2 text-left">Used (GB)</th>
              <th className="px-4 py-2 text-left">Free (GB)</th>
              <th className="px-4 py-2 text-left">Usage %</th>
              <th className="px-4 py-2 text-left">Status</th>
              <th className="px-4 py-2 text-left">Last Checked</th>
            </tr>
          </thead>
          <tbody>
            {filteredDisks.length === 0 ? (
              <tr>
                <td colSpan="8" className="text-center text-gray-500 py-4">
                  No disks found
                </td>
              </tr>
            ) : (
              filteredDisks.map((d) => (
                <tr key={d.Id} className="border-t">
                  <td className="px-4 py-2">{d.Host}</td>
                  <td className="px-4 py-2">{d.Drive}</td>
                  <td className="px-4 py-2">{d.TotalSpaceGB}</td>
                  <td className="px-4 py-2">{d.UsedSpaceGB}</td>
                  <td className="px-4 py-2">{d.FreeSpaceGB}</td>
                  {/* Usage progress bar */}
                  <td className="px-4 py-2 w-32">
                    <div className="w-full bg-gray-200 rounded-full h-4 relative">
                      <div
                        className={`h-4 rounded-full ${
                          d.UsagePercent > 90
                            ? "bg-red-600"
                            : d.UsagePercent > 80
                            ? "bg-amber-500"
                            : "bg-green-500"
                        }`}
                        style={{ width: `${d.UsagePercent}%` }}
                      />
                    </div>
                    <span className="text-xs">{d.UsagePercent}%</span>
                  </td>
                  {/* Status */}
                  <td className="px-4 py-2">
                    <span
                      className={`px-2 py-1 text-xs rounded ${
                        d.Status === "ok"
                          ? "bg-green-100 text-green-800"
                          : d.Status === "warning"
                          ? "bg-amber-100 text-amber-800"
                          : "bg-red-100 text-red-800"
                      }`}
                    >
                      {d.Status.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-4 py-2">{formatDate(d.LastChecked)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Disk Status PieChart */}
      <div className="bg-white p-4 rounded-lg shadow w-full h-80">
        <h3 className="font-semibold mb-2">Disk Status Breakdown</h3>
        {statusData.length === 0 ? (
          <p className="text-gray-500 text-center mt-10">No data</p>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={statusData}
                cx="50%"
                cy="50%"
                outerRadius={100}
                dataKey="value"
                label={({ name, percent }) =>
                  `${name} ${(percent * 100).toFixed(0)}%`
                }
              >
                {statusData.map((_, index) => (
                  <Cell key={index} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Legend />
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
};

export default Disks;
