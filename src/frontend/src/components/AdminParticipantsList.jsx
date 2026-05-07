import React, { useState, useEffect } from 'react';
import { api } from '../services/api';

function statusBadgeColor(status) {
  const map = {
    PENDING_PAYMENT: 'bg-yellow-100 text-yellow-900',
    CONFIRMED: 'bg-green-100 text-green-900',
    CANCELLED: 'bg-red-100 text-red-900',
  };
  return map[status] || 'bg-gray-100 text-gray-900';
}

export default function AdminParticipantsList({ workshopId, token, onToast }) {
  const [participants, setParticipants] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState('');

  useEffect(() => {
    loadParticipants();
  }, [workshopId, token]);

  const loadParticipants = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await api.getWorkshopRegistrations(token, workshopId);
      setParticipants(data);
    } catch (err) {
      const msg = err?.message || 'Failed to load participants';
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

  if (!participants) {
    return <div className="text-center text-gray-500 py-8">No data</div>;
  }

  const regs = participants.registrations || [];

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Participants ({regs.length})</h3>
        <button
          onClick={() => loadParticipants()}
          className="px-3 py-1 bg-blue-900 text-white rounded-lg text-sm hover:bg-blue-800"
        >
          Refresh
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-100 border-b">
            <tr>
              <th className="px-4 py-2 text-left">Name</th>
              <th className="px-4 py-2 text-left">Email</th>
              <th className="px-4 py-2 text-left">Student Code</th>
              <th className="px-4 py-2 text-left">Status</th>
              <th className="px-4 py-2 text-left">Registered</th>
            </tr>
          </thead>
          <tbody>
            {regs.map((p) => (
              <tr key={p.id} className="border-b hover:bg-gray-50">
                <td className="px-4 py-2">{p.fullName || 'N/A'}</td>
                <td className="px-4 py-2 text-blue-600">{p.email}</td>
                <td className="px-4 py-2">{p.studentCode || '-'}</td>
                <td className="px-4 py-2">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusBadgeColor(p.status)}`}>
                    {p.status}
                  </span>
                </td>
                <td className="px-4 py-2 text-gray-500 text-xs">
                  {new Date(p.registeredAt).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {regs.length === 0 && (
        <div className="text-center text-gray-500 py-8">No participants yet</div>
      )}
    </div>
  );
}
