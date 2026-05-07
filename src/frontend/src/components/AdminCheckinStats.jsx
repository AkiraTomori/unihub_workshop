import React, { useState, useEffect } from 'react';
import { api } from '../services/api';

export default function AdminCheckinStats({ token, onToast }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadStats();
  }, [token]);

  const loadStats = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await api.getCheckinStats(token);
      setStats(data);
    } catch (err) {
      const msg = err?.message || 'Failed to load check-in statistics';
      setError(msg);
      onToast?.(msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center items-center py-8">Loading...</div>;
  }

  if (error) {
    return <div className="text-center text-red-600 py-8">Error: {error}</div>;
  }

  if (!stats) {
    return <div className="text-center text-gray-500 py-8">No data</div>;
  }

  const StatBox = ({ label, value }) => (
    <div className="rounded-lg bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 p-4">
      <p className="text-sm text-blue-700">{label}</p>
      <p className="text-2xl font-bold text-blue-900">{value}</p>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Check-in Statistics</h3>
        <button
          onClick={() => loadStats()}
          className="px-3 py-1 bg-blue-900 text-white rounded-lg text-sm hover:bg-blue-800"
        >
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <StatBox label="Total Check-ins" value={stats.totalCheckins} />
        <StatBox label="Unique Registrations" value={stats.uniqueRegistrations} />
        <StatBox label="Duplicate Scans" value={stats.duplicateScans} />
      </div>
    </div>
  );
}
