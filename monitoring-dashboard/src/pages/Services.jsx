import Card from "../components/Card";
import StatusBadge from "../components/StatusBadge";
import ChartPlaceholder from "../components/ChartPlaceholder";

const Services = () => {
  const services = [
    { name: "Google", url: "https://google.com", status: "UP", latency: "120ms" },
    { name: "GitHub", url: "https://github.com", status: "DOWN", latency: "N/A" },
    { name: "Internal API", url: "http://api.local", status: "UP", latency: "250ms" },
  ];

  return (
    <div className="p-6 space-y-6">
      <h2 className="text-2xl font-bold">Services</h2>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card title="Total Services" value={services.length} />
        <Card title="Up" value={services.filter(s => s.status === "UP").length} />
        <Card title="Down" value={services.filter(s => s.status === "DOWN").length} />
        <Card title="Avg Latency" value="180ms" />
      </div>

      {/* Table */}
      <div className="bg-white p-4 rounded-lg shadow">
        <table className="w-full text-sm">
          <thead className="bg-gray-100 text-left">
            <tr>
              <th className="p-2">Service</th>
              <th className="p-2">URL</th>
              <th className="p-2">Status</th>
              <th className="p-2">Latency</th>
            </tr>
          </thead>
          <tbody>
            {services.map((s, i) => (
              <tr key={i} className="border-t">
                <td className="p-2">{s.name}</td>
                <td className="p-2">{s.url}</td>
                <td className="p-2"><StatusBadge status={s.status} /></td>
                <td className="p-2">{s.latency}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Charts */}
      <ChartPlaceholder title="Downtime History" />
    </div>
  );
};

export default Services;
