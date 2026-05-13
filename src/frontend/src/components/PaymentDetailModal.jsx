import React, { useState, useEffect } from 'react';
import { Badge, Spinner } from './ui';
import { api } from '../services/api';

export default function PaymentDetailModal({ paymentId, token, onClose, onToast }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadDetail();
  }, [paymentId, token]);

  const loadDetail = async () => {
    try {
      setLoading(true);
      setError('');
      const detail = await api.getPaymentDetail(token, paymentId);
      setData(detail);
    } catch (err) {
      const msg = err?.message || 'Failed to load payment detail';
      setError(msg);
      onToast?.(msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    const map = {
      PENDING: 'yellow',
      SUCCESS: 'green',
      FAILED: 'red',
      REFUNDED: 'blue',
    };
    return map[status] || 'gray';
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[80vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-blue-50 border-b border-blue-200 p-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-blue-950">Payment Detail</h2>
          <button
            onClick={onClose}
            className="text-2xl text-gray-500 hover:text-gray-700"
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <Spinner />
              <span className="ml-2 text-blue-900">Loading...</span>
            </div>
          ) : error ? (
            <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-lg">
              {error}
            </div>
          ) : data ? (
            <>
              {/* Payment Info */}
              <div className="space-y-3">
                <h3 className="font-semibold text-blue-950">Payment Information</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="bg-blue-50 p-3 rounded-lg">
                    <p className="text-xs text-blue-600 font-medium">Payment ID</p>
                    <p className="font-mono text-sm text-blue-900">{data.payment_id}</p>
                  </div>
                  <div className="bg-blue-50 p-3 rounded-lg">
                    <p className="text-xs text-blue-600 font-medium">Status</p>
                    <p className="flex items-center gap-2">
                      <Badge tone={getStatusColor(data.status)}>{data.status}</Badge>
                    </p>
                  </div>
                  <div className="bg-blue-50 p-3 rounded-lg">
                    <p className="text-xs text-blue-600 font-medium">Amount</p>
                    <p className="text-2xl font-bold text-blue-900">
                      {new Intl.NumberFormat('vi-VN', {
                        style: 'currency',
                        currency: 'VND'
                      }).format(data.amount || 0)}
                    </p>
                  </div>
                  <div className="bg-blue-50 p-3 rounded-lg">
                    <p className="text-xs text-blue-600 font-medium">Provider</p>
                    <p className="text-sm font-semibold text-blue-900">{data.provider}</p>
                  </div>
                </div>
              </div>

              {/* Transaction Details */}
              <div className="space-y-3 border-t border-blue-200 pt-4">
                <h3 className="font-semibold text-blue-950">Transaction Details</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  {data.transaction_id && (
                    <div className="bg-green-50 p-3 rounded-lg">
                      <p className="text-xs text-green-600 font-medium">Transaction ID</p>
                      <p className="font-mono text-sm text-green-900">{data.transaction_id}</p>
                    </div>
                  )}
                  <div className="bg-green-50 p-3 rounded-lg">
                    <p className="text-xs text-green-600 font-medium">Idempotency Key</p>
                    <p className="font-mono text-xs text-green-900 break-all">{data.idempotency_key}</p>
                  </div>
                  <div className="bg-green-50 p-3 rounded-lg">
                    <p className="text-xs text-green-600 font-medium">Registration ID</p>
                    <p className="font-mono text-sm text-green-900">{data.registration_id}</p>
                  </div>
                </div>
              </div>

              {/* Refund Details (if refunded) */}
              {data.status === 'REFUNDED' && (
                <div className="space-y-3 border-t border-emerald-200 bg-emerald-50/40 -mx-4 -mb-4 px-4 py-4">
                  <h3 className="font-semibold text-emerald-950">Refund Information</h3>
                  <div className="grid md:grid-cols-2 gap-4">
                    {data.refund_reason && (
                      <div className="bg-emerald-50 p-3 rounded-lg">
                        <p className="text-xs text-emerald-600 font-medium">Refund Reason</p>
                        <p className="text-sm text-emerald-900">{data.refund_reason}</p>
                      </div>
                    )}
                    {data.refund_processed_at && (
                      <div className="bg-emerald-50 p-3 rounded-lg">
                        <p className="text-xs text-emerald-600 font-medium">Refund Processed</p>
                        <p className="text-sm text-emerald-900">
                          {new Date(data.refund_processed_at).toLocaleString()}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Status Legend */}
              <div className="space-y-3 border-t border-blue-200 pt-4">
                <h3 className="font-semibold text-blue-950 text-sm">Payment Status Legend</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded bg-yellow-400"></div>
                    <span>PENDING</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded bg-green-400"></div>
                    <span>SUCCESS</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded bg-red-400"></div>
                    <span>FAILED</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded bg-blue-400"></div>
                    <span>REFUNDED</span>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="text-center text-gray-500 py-8">No data</div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 p-4 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-blue-300 text-blue-900 font-medium hover:bg-blue-50"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
