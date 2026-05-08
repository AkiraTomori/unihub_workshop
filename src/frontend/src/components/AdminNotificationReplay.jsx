import React, { useState, useEffect } from 'react';
import { Spinner, Badge } from './ui';
import { api } from '../services/api';

export default function AdminNotificationReplay({ token, onToast }) {
  const [notifications, setNotifications] = useState([]);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [loading, setLoading] = useState(false);
  const [replaying, setReplaying] = useState(false);
  const [lastResult, setLastResult] = useState(null);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (expanded) loadFailedNotifications();
  }, [expanded, token]);

  const loadFailedNotifications = async () => {
    try {
      setLoading(true);
      const data = await api.getFailedNotifications(token);
      setNotifications(data || []);
      setSelectedIds(new Set());
      setLastResult(null);
    } catch (err) {
      onToast?.(err?.message || 'Failed to load failed notifications', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectAll = () => {
    if (selectedIds.size === notifications.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(notifications.map(n => n.id)));
    }
  };

  const handleToggleNotification = (id) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const handleReplay = async () => {
    if (selectedIds.size === 0) {
      onToast?.('Please select at least one notification', 'error');
      return;
    }
    try {
      setReplaying(true);
      const result = await api.replayNotifications(token, Array.from(selectedIds));
      setLastResult(result);
      setSelectedIds(new Set());
      onToast?.(`Replayed ${result.replayed} notification(s)`, result.replayed > 0 ? 'success' : 'info');
      await loadFailedNotifications();
    } catch (err) {
      onToast?.(err?.message || 'Failed to replay', 'error');
    } finally {
      setReplaying(false);
    }
  };

  const formatDate = (date) => new Date(date).toLocaleString('vi-VN');
  const getChannelColor = (ch) => ({ EMAIL: 'blue', SMS: 'green', PUSH: 'purple', IN_APP: 'orange' }[ch] || 'gray');

  return (
    <div className="border border-blue-200 bg-white rounded-lg p-4 space-y-3">
      <div className="flex justify-between items-center">
        <h3 className="font-semibold text-lg text-blue-950">Notification Management</h3>
        <button onClick={() => setExpanded(!expanded)} className="text-sm text-blue-600 font-medium hover:text-blue-800">
          {expanded ? 'Hide' : 'Show'} List
        </button>
      </div>
      <p className="text-sm text-blue-700">Select messages to resend:</p>
      {!expanded ? (
        <div className="text-sm bg-blue-50 p-2 text-blue-600 rounded">
          {notifications.length === 0 ? 'No failed messages' : `${notifications.length} failed • ${selectedIds.size} selected`}
        </div>
      ) : (
        <div className="space-y-3">
          {loading && <div className="flex gap-2 py-6 justify-center"><Spinner /><span className="text-blue-900">Loading...</span></div>}
          {!loading && notifications.length === 0 && <div className="text-sm bg-green-50 border border-green-200 text-green-800 p-3 rounded">✓ No failed notifications</div>}
          {!loading && notifications.length > 0 && (
            <>
              <div className="border border-blue-200 bg-blue-50/50 p-3 rounded-lg">
                <label className="flex gap-3 cursor-pointer items-center">
                  <input type="checkbox" checked={selectedIds.size === notifications.length} onChange={handleSelectAll} className="w-5 h-5 rounded border-blue-300" />
                  <span className="font-medium text-blue-950">Select All ({selectedIds.size}/{notifications.length})</span>
                </label>
              </div>
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {notifications.map(n => (
                  <div key={n.id} className="border border-blue-100 p-3 rounded-lg hover:bg-blue-50/30">
                    <label className="flex gap-3 cursor-pointer items-start">
                      <input type="checkbox" checked={selectedIds.has(n.id)} onChange={() => handleToggleNotification(n.id)} className="w-5 h-5 rounded border-blue-300 mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-blue-950 truncate">{n.subject}</p>
                        <p className="text-xs text-blue-700 mt-1 line-clamp-2">{n.content}</p>
                        <div className="flex gap-2 mt-2 flex-wrap">
                          <Badge tone={getChannelColor(n.channel)}>{n.channel}</Badge>
                          <span className="text-xs text-blue-600">{n.recipient}</span>
                          <span className="text-xs text-blue-500">{formatDate(n.created_at)}</span>
                        </div>
                      </div>
                    </label>
                  </div>
                ))}
              </div>
              <button onClick={handleReplay} disabled={replaying || selectedIds.size === 0} className="w-full px-4 py-2 bg-blue-900 text-white rounded-lg font-medium hover:bg-blue-800 disabled:bg-gray-400 flex gap-2 justify-center items-center">
                {replaying ? <><Spinner className="w-4 h-4 border-white border-t-blue-900" />Replaying...</> : `🔄 Replay Selected (${selectedIds.size})`}
              </button>
            </>
          )}
          {lastResult && (
            <div className="bg-blue-50 border border-blue-200 p-3 rounded-lg">
              <p className="text-sm font-medium text-blue-950 mb-2">✓ Result</p>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div><span className="text-blue-700">Replayed:</span><p className="text-lg font-bold text-blue-900">{lastResult.replayed}</p></div>
                <div><span className="text-blue-700">Failed:</span><p className="text-lg font-bold text-blue-900">{lastResult.failed}</p></div>
              </div>
              {lastResult.replayed > 0 && <p className="text-xs text-blue-600 mt-2">✓ {lastResult.replayed} marked as PENDING for retry</p>}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
