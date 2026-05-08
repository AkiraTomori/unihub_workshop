import React, { useState, useEffect } from 'react';
import QRCode from 'react-qr-code';
import { Badge, Spinner } from './ui';
import { api } from '../services/api';

export default function RegistrationDetailModal({ registrationId, token, onClose, onToast }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadDetail();
  }, [registrationId, token]);

  const loadDetail = async () => {
    try {
      setLoading(true);
      setError('');
      const detail = await api.getRegistrationDetail(token, registrationId);
      setData(detail);
    } catch (err) {
      const msg = err?.message || 'Failed to load registration detail';
      setError(msg);
      onToast?.(msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    const map = {
      PENDING_PAYMENT: 'yellow',
      CONFIRMED: 'green',
      CANCELLED: 'red',
    };
    return map[status] || 'gray';
  };

  const getPaymentStatusColor = (status) => {
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
          <h2 className="text-xl font-bold text-blue-950">Registration Detail</h2>
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
              {/* Registration Info */}
              <div className="space-y-3">
                <h3 className="font-semibold text-blue-950">Registration Information</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="bg-blue-50 p-3 rounded-lg">
                    <p className="text-xs text-blue-600 font-medium">Registration ID</p>
                    <p className="font-mono text-sm text-blue-900">{data.registration_id}</p>
                  </div>
                  <div className="bg-blue-50 p-3 rounded-lg">
                    <p className="text-xs text-blue-600 font-medium">Status</p>
                    <p className="flex items-center gap-2">
                      <Badge tone={getStatusColor(data.status)}>{data.status}</Badge>
                    </p>
                  </div>
                  <div className="bg-blue-50 p-3 rounded-lg md:col-span-2">
                    <p className="text-xs text-blue-600 font-medium mb-2">QR Code</p>
                    {data.qr_code ? (
                      <div className="flex flex-col items-center gap-2">
                        <QRCode value={data.qr_code} size={150} level="H" includeMargin={true} />
                        <p className="font-mono text-xs text-blue-700 break-all text-center">{data.qr_code}</p>
                      </div>
                    ) : (
                      <p className="text-sm text-blue-700 italic">QR code not available</p>
                    )}
                  </div>
                  <div className="bg-blue-50 p-3 rounded-lg">
                    <p className="text-xs text-blue-600 font-medium">Expires At</p>
                    <p className="text-sm text-blue-900">
                      {data.expires_at ? new Date(data.expires_at).toLocaleString() : 'No expiry'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Workshop Info */}
              <div className="space-y-3 border-t border-blue-200 pt-4">
                <h3 className="font-semibold text-blue-950">Workshop Information</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="bg-green-50 p-3 rounded-lg">
                    <p className="text-xs text-green-600 font-medium">Workshop Title</p>
                    <p className="text-sm text-green-900">{data.workshop?.title}</p>
                  </div>
                  <div className="bg-green-50 p-3 rounded-lg">
                    <p className="text-xs text-green-600 font-medium">Workshop ID</p>
                    <p className="font-mono text-sm text-green-900">{data.workshop?.id}</p>
                  </div>
                  <div className="bg-green-50 p-3 rounded-lg md:col-span-2">
                    <p className="text-xs text-green-600 font-medium">Start Time</p>
                    <p className="text-sm text-green-900">
                      {new Date(data.workshop?.start_time).toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>

              {/* Payment Info */}
              {data.payment && (
                <div className="space-y-3 border-t border-blue-200 pt-4">
                  <h3 className="font-semibold text-blue-950">Payment Information</h3>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="bg-purple-50 p-3 rounded-lg">
                      <p className="text-xs text-purple-600 font-medium">Amount</p>
                      <p className="text-lg font-bold text-purple-900">
                        {new Intl.NumberFormat('vi-VN', {
                          style: 'currency',
                          currency: 'VND'
                        }).format(data.payment.amount)}
                      </p>
                    </div>
                    <div className="bg-purple-50 p-3 rounded-lg">
                      <p className="text-xs text-purple-600 font-medium">Status</p>
                      <p className="flex items-center gap-2">
                        <Badge tone={getPaymentStatusColor(data.payment.status)}>
                          {data.payment.status}
                        </Badge>
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Check-ins */}
              {data.checkins && data.checkins.length > 0 && (
                <div className="space-y-3 border-t border-blue-200 pt-4">
                  <h3 className="font-semibold text-blue-950">Check-ins ({data.checkins.length})</h3>
                  <div className="space-y-2">
                    {data.checkins.map((checkin, idx) => (
                      <div key={idx} className="bg-orange-50 p-3 rounded-lg">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-xs text-orange-600 font-medium">Check-in #{idx + 1}</p>
                            <p className="text-sm text-orange-900">
                              Device: {checkin.device_id}
                            </p>
                          </div>
                          <p className="text-xs text-orange-700">
                            {new Date(checkin.scanned_at).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
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
