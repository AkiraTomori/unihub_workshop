import { useEffect, useState } from "react";
import { Badge, Card, Spinner } from "../../components/ui";
import { api } from "../../services/api";
import { DollarSign, TrendingDown, AlertCircle } from "lucide-react";

function formatCurrency(amount) {
  return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(Number(amount || 0));
}

function formatDate(value) {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "-" : date.toLocaleString();
}

function getReasonBadge(reason) {
  const reasonMap = {
    'Workshop canceled by admin': 'red',
    'Student requested refund': 'orange',
    'Payment failed': 'red',
    'Duplicate transaction': 'orange',
  };
  return reasonMap[reason] || 'slate';
}

export default function AdminRefundsPage({ token, onToast }) {
  const [refunds, setRefunds] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({});
  const [filterReason, setFilterReason] = useState("");
  const pageSize = 20;

  async function loadRefunds() {
    try {
      setLoading(true);
      setError("");
      const result = await api.getAdminRefunds(token, page, pageSize, filterReason);
      setRefunds(result.data || []);
      setPagination(result.pagination || {});
    } catch (err) {
      const msg = err?.message || "Failed to load refunds";
      setError(msg);
      onToast?.(msg, "error");
    } finally {
      setLoading(false);
    }
  }

  async function loadStats() {
    try {
      const data = await api.getAdminRefundStats(token);
      setStats(data);
    } catch (err) {
      console.error("Failed to load stats:", err);
    }
  }

  useEffect(() => {
    loadRefunds();
  }, [token, page, filterReason]);

  useEffect(() => {
    loadStats();
  }, [token]);

  const handlePageChange = (newPage) => {
    if (newPage > 0 && newPage <= (pagination.totalPages || 1)) {
      setPage(newPage);
    }
  };

  return (
    <div className="space-y-4">
      {/* Stats Cards */}
      {stats && (
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-red-50 p-2">
                <DollarSign className="h-6 w-6 text-red-600" />
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500">Total Refunded</p>
                <p className="text-xl font-bold text-slate-900">{formatCurrency(stats.total_amount)}</p>
              </div>
            </div>
          </Card>

          <Card>
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-orange-50 p-2">
                <TrendingDown className="h-6 w-6 text-orange-600" />
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500">Total Refunds</p>
                <p className="text-xl font-bold text-slate-900">{stats.total_count}</p>
              </div>
            </div>
          </Card>

          <Card>
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-blue-50 p-2">
                <AlertCircle className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500">Refund Reasons</p>
                <p className="text-xl font-bold text-slate-900">{stats.by_reason.length}</p>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Main Card */}
      <Card>
        <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <h2 className="text-xl font-bold text-blue-950">Refund Management</h2>
            <p className="text-sm text-blue-800">View and manage all refunded payments.</p>
          </div>
          {loading ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-700">
              <Spinner className="h-3 w-3 border-blue-300 border-t-blue-700" />
              Loading...
            </span>
          ) : null}
        </div>

        {/* Filter */}
        <div className="mb-4 flex gap-2">
          <input
            type="text"
            placeholder="Filter by reason..."
            value={filterReason}
            onChange={(e) => {
              setFilterReason(e.target.value);
              setPage(1);
            }}
            className="flex-1 rounded-lg border border-blue-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder-slate-500 transition hover:border-blue-300 focus:border-blue-500 focus:outline-none"
          />
        </div>

        {error ? (
          <div className="mb-4 flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
            <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0" />
            <div>{error}</div>
          </div>
        ) : null}

        {!loading && !error && refunds.length === 0 ? (
          <div className="rounded-lg border border-blue-200 bg-blue-50/40 p-4 text-sm text-blue-800">
            <p className="font-medium">No refunds found</p>
            <p className="mt-1 text-xs">Refunded payments will appear here.</p>
          </div>
        ) : null}

        {/* Refunds List */}
        <div className="space-y-3">
          {refunds.map((refund) => (
            <div
              key={refund.payment_id}
              className="rounded-xl border border-emerald-100 bg-emerald-50/30 p-4 transition hover:bg-emerald-50"
            >
              <div className="grid gap-3 md:grid-cols-5">
                {/* Workshop & User */}
                <div className="md:col-span-2">
                  <p className="font-semibold text-emerald-950">{refund.workshop_title}</p>
                  <p className="text-xs text-emerald-700 mt-1">{refund.user_full_name}</p>
                  <p className="text-xs text-emerald-600">{refund.user_email}</p>
                </div>

                {/* Amount */}
                <div>
                  <p className="text-xs font-medium text-emerald-600">Amount</p>
                  <p className="font-bold text-emerald-950">{formatCurrency(refund.amount)}</p>
                </div>

                {/* Reason */}
                <div>
                  <p className="text-xs font-medium text-emerald-600">Reason</p>
                  <Badge tone={getReasonBadge(refund.refund_reason)} className="mt-1">
                    {refund.refund_reason}
                  </Badge>
                </div>

                {/* Date */}
                <div>
                  <p className="text-xs font-medium text-emerald-600">Processed</p>
                  <p className="text-xs text-emerald-900">{formatDate(refund.refund_processed_at)}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Pagination */}
        {pagination.totalPages > 1 ? (
          <div className="mt-4 flex items-center justify-between gap-2 border-t border-blue-200 pt-4">
            <button
              type="button"
              onClick={() => handlePageChange(page - 1)}
              disabled={!pagination.hasPrevPage}
              className="rounded-lg border border-blue-200 bg-white px-3 py-2 text-sm font-medium text-blue-900 transition hover:bg-blue-50 disabled:opacity-50"
            >
              ← Previous
            </button>

            <span className="text-sm text-slate-600">
              Page {pagination.page} of {pagination.totalPages} ({pagination.total} total)
            </span>

            <button
              type="button"
              onClick={() => handlePageChange(page + 1)}
              disabled={!pagination.hasNextPage}
              className="rounded-lg border border-blue-200 bg-white px-3 py-2 text-sm font-medium text-blue-900 transition hover:bg-blue-50 disabled:opacity-50"
            >
              Next →
            </button>
          </div>
        ) : null}
      </Card>

      {/* Refund Reasons Breakdown */}
      {stats && stats.by_reason.length > 0 ? (
        <Card>
          <h3 className="mb-3 font-semibold text-slate-900">Refund Breakdown by Reason</h3>
          <div className="space-y-2">
            {stats.by_reason.map((item) => (
              <div key={item.reason} className="flex items-center justify-between rounded-lg bg-slate-50 p-3">
                <div>
                  <p className="text-sm font-medium text-slate-900">{item.reason}</p>
                  <p className="text-xs text-slate-600">{item.count} refund(s)</p>
                </div>
                <p className="font-semibold text-slate-900">{formatCurrency(item.amount)}</p>
              </div>
            ))}
          </div>
        </Card>
      ) : null}
    </div>
  );
}
