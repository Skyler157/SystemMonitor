import React, { useEffect, useState } from 'react';
import { fetchAlerts } from '../services/api';

export default function Alerts() {
  const [alerts, setAlerts] = useState([]);

  useEffect(() => {
    async function load() {
      const a = await fetchAlerts(500);
      setAlerts(a || []);
    }
    load();
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-4">Alerts & Log History</h1>

      <div className="bg-gray-800 rounded-lg p-4">
        <div className="overflow-auto max-h-[60vh]">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-gray-400">
                <th className="py-2 px-3">Time</th>
                <th className="py-2 px-3">Source</th>
                <th className="py-2 px-3">Status</th>
                <th className="py-2 px-3">Message</th>
              </tr>
            </thead>
            <tbody>
              {alerts.map(a => (
                <tr key={a.id} className="border-t border-gray-700">
                  <td className="py-2 px-3 text-gray-300">{a.timestamp}</td>
                  <td className="py-2 px-3">{a.name || a.url || '—'}</td>
                  <td className="py-2 px-3">
                    <span className={`px-2 py-1 rounded text-sm ${a.status === 'DOWN' ? 'bg-red-900 text-red-300' : a.status === 'WARNING' ? 'bg-yellow-900 text-yellow-300' : 'bg-gray-800 text-gray-300'}`}>
                      {a.status}
                    </span>
                  </td>
                  <td className="py-2 px-3 text-gray-300">{a.message}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {alerts.length === 0 && <div className="text-gray-400 p-6">No alerts recorded yet.</div>}
        </div>
      </div>
    </div>
  );
}
