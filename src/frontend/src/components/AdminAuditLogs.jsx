import React, { useEffect, useState } from 'react';
import { Badge, Card, Spinner } from './ui';
import { api } from '../services/api';

function actionTone(action) {
  const map = {
    CREATE_WORKSHOP: 'green',
    UPDATE_WORKSHOP: 'blue',
    CANCEL_WORKSHOP: 'red',
    RESTORE_WORKSHOP: 'green',
    UPLOAD_DOCUMENT: 'blue',
    START_DOCUMENT_SUMMARY: 'yellow',
    UPLOAD_CSV_SYNC_FILE: 'blue',
    TRIGGER_CSV_SYNC: 'yellow',
  };
  return map[action] || 'gray';
}

function safeJson(value) {
  if (!value) return null;
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

export default function AdminAuditLogs({ token, onToast }) {
  const [logs, setLogs] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  useEffect(() => {
    loadLogs();
  }, [token, page]);

  const loadLogs = async () => {
    try {
      setLoading(true);
      const result = await api.getAuditLogs(token, page, 20);
      setLogs(result?.data || []);
      setPagination(result?.pagination || null);
    } catch (err) {
      onToast?.(err?.message || 'Failed to load audit logs', 'error');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (value) => {
    if (!value) return '-';
    return new Date(value).toLocaleString('vi-VN');
  };

  return (
    <Card className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-blue-950">Audit Logs</h3>
          <p className="text-sm text-blue-700">Track sensitive admin actions for transparency and dispute handling.</p>
        </div>
        {loading ? (
          <span className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-700">
            <Spinner className="h-3 w-3 border-blue-300 border-t-blue-700" />
            Loading...
          </span>
        ) : null}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8 text-blue-900">
          <Spinner />
          <span className="ml-2">Loading audit trail...</span>
        </div>
      ) : logs.length === 0 ? (
        <div className="rounded-lg border border-blue-200 bg-blue-50/40 p-3 text-sm text-blue-800">
          No audit logs yet.
        </div>
      ) : (
        <div className="space-y-3">
          {logs.map((log) => (
            <div key={log.id} className="rounded-lg border border-blue-100 bg-blue-50/30 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-blue-950">
                    {log.action} <span className="text-blue-700">·</span> {log.entity_type}
                  </p>
                  <p className="text-xs text-blue-700 mt-1">
                    Actor: {log.actor_name || 'System'} {log.actor_email ? `(${log.actor_email})` : ''}
                  </p>
                </div>
                <Badge tone={actionTone(log.action)}>{log.action}</Badge>
              </div>

              <div className="mt-3 grid gap-3 md:grid-cols-3 text-sm">
                <div>
                  <p className="text-blue-700 text-xs">Entity ID</p>
                  <p className="font-mono text-xs text-blue-950 break-all">{log.entity_id}</p>
                </div>
                <div>
                  <p className="text-blue-700 text-xs">Created At</p>
                  <p className="text-blue-950">{formatDate(log.created_at)}</p>
                </div>
                <div>
                  <p className="text-blue-700 text-xs">Entity Type</p>
                  <p className="text-blue-950">{log.entity_type}</p>
                </div>
              </div>

              <div className="mt-3 grid gap-3 md:grid-cols-2">
                <details className="rounded border border-blue-100 bg-white p-3">
                  <summary className="cursor-pointer text-sm font-medium text-blue-900">Old Payload</summary>
                  <pre className="mt-2 overflow-auto text-xs text-blue-800 whitespace-pre-wrap">
                    {JSON.stringify(safeJson(log.old_payload), null, 2) || 'null'}
                  </pre>
                </details>
                <details className="rounded border border-blue-100 bg-white p-3">
                  <summary className="cursor-pointer text-sm font-medium text-blue-900">New Payload</summary>
                  <pre className="mt-2 overflow-auto text-xs text-blue-800 whitespace-pre-wrap">
                    {JSON.stringify(safeJson(log.new_payload), null, 2) || 'null'}
                  </pre>
                </details>
              </div>
            </div>
          ))}
        </div>
      )}

      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between gap-2 border-t border-blue-100 pt-3">
          <p className="text-xs text-blue-700">
            Page {pagination.page} of {pagination.totalPages}
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page === 1}
              className="rounded border border-blue-300 px-2 py-1 text-xs text-blue-900 disabled:opacity-50"
            >
              ← Previous
            </button>
            <button
              type="button"
              onClick={() => setPage(page + 1)}
              disabled={page >= pagination.totalPages}
              className="rounded border border-blue-300 px-2 py-1 text-xs text-blue-900 disabled:opacity-50"
            >
              Next →
            </button>
          </div>
        </div>
      )}
    </Card>
  );
}