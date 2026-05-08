import React, { useEffect, useState } from 'react';
import { Card, Spinner, Badge } from './ui';
import { api } from '../services/api';

export default function AdminCsvSyncManager({ token, onToast }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);

  useEffect(() => {
    loadLogs();
  }, [token, page]);

  const loadLogs = async () => {
    try {
      setLoading(true);
      const result = await api.getCsvSyncLogs(token, page);
      setLogs(result.logs || []);
      setPagination(result.pagination);
    } catch (err) {
      onToast?.(err?.message || 'Failed to load CSV sync logs', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async () => {
    try {
      setSyncing(true);
      const result = await api.triggerCsvSync(token);
      onToast?.(result.message || 'CSV sync triggered', 'success');
      await loadLogs();
    } catch (err) {
      onToast?.(err?.message || 'Failed to trigger CSV sync', 'error');
    } finally {
      setSyncing(false);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      onToast?.('Please choose a CSV file first', 'error');
      return;
    }

    try {
      setUploading(true);
      const result = await api.uploadCsvSyncFile(token, selectedFile);
      onToast?.(`CSV uploaded: ${result.fileName}`, 'success');
      setSelectedFile(null);
      await loadLogs();
    } catch (err) {
      onToast?.(err?.message || 'Failed to upload CSV file', 'error');
    } finally {
      setUploading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'SUCCESS':
        return 'green';
      case 'PROCESSING':
        return 'blue';
      case 'FAILED':
        return 'red';
      default:
        return 'gray';
    }
  };

  const formatDate = (date) => {
    if (!date) return '-';
    return new Date(date).toLocaleString('vi-VN');
  };

  const errorCount = (log) => {
    const total = Number(log.total_rows || 0);
    const success = Number(log.success_rows || 0);
    return Math.max(0, total - success);
  };

  const parseErrorDetails = (log) => {
    if (!log || !log.error_details) return [];
    try {
      return typeof log.error_details === 'string'
        ? JSON.parse(log.error_details)
        : log.error_details;
    } catch (e) {
      return [];
    }
  };

  return (
    <Card className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-blue-950">CSV Data Synchronization</h2>
          <p className="text-sm text-blue-800">Upload a CSV file once, then trigger manual sync now or let the worker process it later.</p>
        </div>
      </div>

      <div className="rounded-lg border border-blue-100 bg-blue-50/40 p-4 space-y-3">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <p className="text-sm font-semibold text-blue-950">Upload CSV file</p>
            <p className="text-xs text-blue-700">The uploaded file is saved as the latest sync file on the backend.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="file"
              accept=".csv,text/csv"
              onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
              className="block max-w-full text-sm text-blue-900 file:mr-4 file:rounded-lg file:border-0 file:bg-blue-900 file:px-3 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-blue-800"
            />
            <button
              type="button"
              onClick={handleUpload}
              disabled={uploading}
              className="inline-flex items-center gap-2 rounded-lg border border-blue-300 px-4 py-2 text-sm font-medium text-blue-900 disabled:opacity-50"
            >
              {uploading ? (
                <>
                  <Spinner />
                  Uploading...
                </>
              ) : (
                'Upload CSV'
              )}
            </button>
            <button
              type="button"
              onClick={handleSync}
              disabled={syncing}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-900 px-4 py-2 text-sm font-medium text-white disabled:bg-blue-400"
            >
              {syncing ? (
                <>
                  <Spinner />
                  Syncing...
                </>
              ) : (
                '▶ Trigger Manual Sync'
              )}
            </button>
          </div>
        </div>

        <p className="text-xs text-blue-700">
          Selected file: {selectedFile ? selectedFile.name : 'No file chosen yet'}
        </p>
      </div>

      {loading ? (
        <div className="inline-flex items-center gap-2 text-blue-900">
          <Spinner />
          Loading sync logs...
        </div>
      ) : logs.length === 0 ? (
        <div className="rounded-lg border border-blue-200 bg-blue-50/40 p-3 text-sm text-blue-800">
          No CSV sync logs found. Click "Trigger Manual Sync" to start an import.
        </div>
      ) : (
        <div className="space-y-3">
          {logs.map((log) => (
            <div
              key={log.id}
              className="flex flex-col gap-3 rounded-lg border border-blue-100 bg-blue-50/30 p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <p className="font-semibold text-blue-950">{log.file_name}</p>
                  <p className="text-xs text-blue-700 mt-1">
                    Imported at {formatDate(log.created_at)}
                  </p>
                </div>
                <Badge tone={getStatusColor(log.status)}>
                  {log.status}
                </Badge>
              </div>

              <div className="grid grid-cols-3 gap-3 text-sm">
                <div>
                  <p className="text-blue-700">Total Rows</p>
                  <p className="font-semibold text-blue-950">{log.total_rows}</p>
                </div>
                <div>
                  <p className="text-blue-700">Success</p>
                  <p className="font-semibold text-green-700">{log.success_rows}</p>
                </div>
                <div>
                  <p className="text-blue-700">Errors</p>
                  <p className="font-semibold text-red-700">{errorCount(log)}</p>
                </div>
              </div>

              {parseErrorDetails(log).length > 0 && (
                <details className="text-xs">
                  <summary className="cursor-pointer font-medium text-red-700">
                    {parseErrorDetails(log).length} error(s) - Click to view
                  </summary>
                  <div className="mt-2 max-h-40 overflow-auto rounded bg-red-50 p-2 font-mono text-red-700">
                    {parseErrorDetails(log).map((err, idx) => (
                      <div key={idx} className="mb-2 pb-2 border-b border-red-200">
                        <p>
                          {err?.row
                            ? `Row ${err.row}: ${err.student_code || 'N/A'}`
                            : `Record: ${err?.student_code || 'N/A'}`}
                        </p>
                        <p className="text-red-600">
                          {Array.isArray(err?.errors)
                            ? err.errors.join(', ')
                            : (err?.error || 'Unknown error')}
                        </p>
                      </div>
                    ))}
                  </div>
                </details>
              )}

              <p className="text-xs text-blue-600">
                {log.status === 'PROCESSING'
                  ? 'In progress...'
                  : `Updated at ${formatDate(log.updated_at || log.created_at)}`}
              </p>
            </div>
          ))}
        </div>
      )}

      {pagination && pagination.pages > 1 && (
        <div className="flex items-center justify-between gap-2 border-t border-blue-100 pt-3">
          <p className="text-xs text-blue-700">
            Page {pagination.page} of {pagination.pages}
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
              disabled={page >= pagination.pages}
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
