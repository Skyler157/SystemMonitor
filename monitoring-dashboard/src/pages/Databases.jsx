import { useEffect, useState } from "react";
import {
    fetchDatabases,
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

// Date formatter (Nairobi timezone)
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

const COLORS = ["#3b82f6", "#22c55e", "#f59e0b", "#ef4444"]; // blue, green, amber, red

const Databases = () => {
    const [summary, setSummary] = useState(null);
    const [databases, setDatabases] = useState([]);
    const [filtered, setFiltered] = useState([]);
    const [dbTrends, setDbTrends] = useState([]);
    const [search, setSearch] = useState("");
    const [filter, setFilter] = useState("ALL");


    useEffect(() => {
        const load = async () => {
            try {
                const [s, dbs, t] = await Promise.all([
                    fetchSummary(),
                    fetchDatabases(),
                    -       fetchIncidentTrends(),
                    +       fetchIncidentTrends("db"),
                ]);

                setSummary(s?.data || null);
                setDatabases(Array.isArray(dbs?.data) ? dbs.data : []);
                setFiltered(Array.isArray(dbs?.data) ? dbs.data : []);

                const trendsRaw = t?.data?.data || [];
                const trendsData = trendsRaw.map((item) => ({
                    date: item.date,
                    count: Number(item.count ?? 0),
                }));
                setDbTrends(trendsData);

            } catch (err) {
                console.error("Databases load error:", err);
            }
        };

        load();
        const interval = setInterval(load, 30000);
        return () => clearInterval(interval);
    }, []);


    // --- Handle search/filter
    useEffect(() => {
        let data = [...databases];

        if (search.trim() !== "") {
            data = data.filter((d) =>
                [d.Name, d.Type, d.DbName].some((field) =>
                    field?.toLowerCase().includes(search.toLowerCase())
                )
            );
        }

        if (filter !== "ALL") {
            if (filter === "UP" || filter === "DOWN") {
                data = data.filter((d) => d.Status === filter);
            } else {
                data = data.filter(
                    (d) => d.Type?.toLowerCase() === filter.toLowerCase()
                );
            }
        }

        setFiltered(data);
    }, [search, filter, databases]);

    if (!summary) return <p className="p-6">Loading databases...</p>;

    // --- Database Type Breakdown
    const typeCounts = databases.reduce((acc, db) => {
        const type = db.Type || "Unknown";
        acc[type] = (acc[type] || 0) + 1;
        return acc;
    }, {});
    const typeData = Object.entries(typeCounts).map(([name, value]) => ({
        name,
        value,
    }));

    // --- Active Alerts = DBs that are DOWN
    const activeAlerts = databases.filter((d) => d.Status === "DOWN").length;



    return (
        <div className="p-6 space-y-6">
            <h2 className="text-2xl font-bold">Databases Overview</h2>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card title="Total DBs" value={databases.length} />
                <Card
                    title="DBs Up"
                    value={databases.filter((d) => d.Status === "UP").length}
                />
                <Card
                    title="DBs Down"
                    value={databases.filter((d) => d.Status === "DOWN").length}
                />
                <Card title="Active Alerts" value={activeAlerts} />
            </div>

            {/* Search + Filters */}
            <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
                <input
                    type="text"
                    placeholder="Search by name, type, or DB..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="border px-3 py-2 rounded w-full md:w-1/3"
                />
                <select
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                    className="border px-3 py-2 rounded"
                >
                    <option value="ALL">All</option>
                    <option value="UP">Only Up</option>
                    <option value="DOWN">Only Down</option>
                    <option value="mysql">MySQL</option>
                    <option value="postgres">Postgres</option>
                    <option value="mssql">MSSQL</option>
                </select>
            </div>

            {/* Databases Table */}
            <div className="bg-white p-4 rounded-lg shadow overflow-x-auto">
                <h3 className="font-semibold mb-2">All Databases</h3>
                <table className="table-auto w-full text-sm">
                    <thead className="bg-gray-100">
                        <tr>
                            <th className="px-4 py-2 text-left">Name</th>
                            <th className="px-4 py-2 text-left">Type</th>
                            <th className="px-4 py-2 text-left">DB</th>
                            <th className="px-4 py-2 text-left">Status</th>
                            <th className="px-4 py-2 text-left">Last Checked</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filtered.length === 0 ? (
                            <tr>
                                <td colSpan="5" className="text-center text-gray-500 py-4">
                                    No databases found
                                </td>
                            </tr>
                        ) : (
                            filtered.map((d, idx) => (
                                <tr key={idx} className="border-t">
                                    <td className="px-4 py-2">{d.Name}</td>
                                    <td className="px-4 py-2">{d.Type}</td>
                                    <td className="px-4 py-2">{d.DbName}</td>
                                    <td className="px-4 py-2">
                                        {d.Status === "UP" ? (
                                            <span className="px-2 py-1 text-xs rounded bg-green-100 text-green-800">
                                                UP
                                            </span>
                                        ) : (
                                            <span className="px-2 py-1 text-xs rounded bg-red-100 text-red-800">
                                                DOWN
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-4 py-2">{formatDate(d.LastChecked)}</td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Database Type Breakdown */}
            <div className="bg-white p-4 rounded-lg shadow w-full h-80">
                <h3 className="font-semibold mb-2">Database Type Breakdown</h3>
                {typeData.length === 0 ? (
                    <p className="text-gray-500 text-center mt-10">
                        No database type data
                    </p>
                ) : (
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={typeData}
                                cx="50%"
                                cy="50%"
                                labelLine={false}
                                outerRadius={100}
                                dataKey="value"
                                label={({ name, percent }) =>
                                    `${name} ${(percent * 100).toFixed(0)}%`
                                }
                            >
                                {typeData.map((_, index) => (
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

            {/* DB Downtime Trends */}
            <div className="bg-white p-4 rounded-lg shadow w-full h-72">
                <h3 className="font-semibold mb-2">Database Downtime History</h3>
                {dbTrends.some((t) => t.count > 0) ? (
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={dbTrends}>
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
                ) : (
                    <div className="text-center text-gray-500 py-10">
                        No database downtime recorded
                    </div>
                )}
            </div>




        </div>
    );
};

export default Databases;
