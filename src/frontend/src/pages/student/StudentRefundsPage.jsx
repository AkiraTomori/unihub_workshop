import { useEffect, useState } from "react";
import { Badge, Card, Spinner } from "../../components/ui";
import { api } from "../../services/api";
import { RefreshCw, AlertCircle } from "lucide-react";

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

export default function StudentRefundsPage({ token, onToast }) {
  const [refunds, setRefunds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  async function loadRefunds() {
    try {
      setLoading(true);
      setError("");
      const rows = await api.getMyRefunds(token);
      setRefunds(rows);
    } catch (err) {
      const msg = err?.message || "Failed to load refunds";
      setError(msg);
      onToast?.(msg, "error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadRefunds();
  }, [token]);

  async function handleRefresh() {
    setRefreshing(true);
    try {
      await loadRefunds();
      onToast?.("Refund history refreshed", "success");
    } catch (err) {
      onToast?.(err?.message || "Refresh failed", "error");
    } finally {
      setRefreshing(false);
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <div className="mb-4 flex flex-col items-start justify-between gap-3 md:flex-row md:items-center">
          <div>
            <h2 className="text-xl font-bold text-blue-950">Refund History</h2>
            <p className="text-sm text-blue-800">Track your refunded payments.</p>
          </div>
          <div className="flex items-center gap-2">
            {loading ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                <Spinner className="h-3 w-3 border-blue-300 border-t-blue-700" />
                Loading...
              </span>
            ) : (
              <button
                type="button"
                onClick={handleRefresh}
                disabled={refreshing}
                className="inline-flex items-center gap-2 rounded-lg bg-blue-50 px-3 py-2 text-sm font-medium text-blue-700 transition hover:bg-blue-100 disabled:opacity-50"
              >
                <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                {refreshing ? 'Refreshing...' : 'Refresh'}
              </button>
            )}
          </div>
        </div>

        {error ? (
          <div className="mb-4 flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
            <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0" />
            <div>{error}</div>
          </div>
        ) : null}

        {!loading && !error && refunds.length === 0 ? (
          <div className="rounded-lg border border-blue-200 bg-blue-50/40 p-4 text-sm text-blue-800">
            <p className="font-medium">No refunds yet</p>
            <p className="mt-1 text-xs">When a workshop is canceled or a refund is issued, it will appear here.</p>
          </div>
        ) : null}

        <div className="space-y-3">
          {refunds.map((refund) => (
            <div
              key={refund.payment_id}
              className="rounded-xl border border-emerald-100 bg-emerald-50/30 p-4 transition hover:bg-emerald-50"
            >
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div className="min-w-0 space-y-1">
                  <p className="font-semibold text-emerald-950">{refund.workshop_title || "Workshop"}</p>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs text-emerald-700">
                      Refunded on {formatDate(refund.refund_processed_at)}
                    </span>
                    {refund.refund_reason ? (
                      <Badge tone={getReasonBadge(refund.refund_reason)} className="text-xs">
                        {refund.refund_reason}
                      </Badge>
                    ) : null}
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2 md:justify-end">
                  <span className="text-sm font-semibold text-emerald-950">
                    {formatCurrency(refund.amount)}
                  </span>
                  <Badge tone="green">REFUNDED</Badge>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Info card */}
      {refunds.length > 0 ? (
        <Card className="border-blue-100 bg-blue-50/30">
          <div className="space-y-2 text-sm text-blue-800">
            <p className="font-medium">About Refunds</p>
            <ul className="list-inside space-y-1 text-xs">
              <li>• Refunds are issued when a workshop is canceled by the organizer</li>
              <li>• Refund processing typically takes 3-5 business days</li>
              <li>• The amount will be credited back to your original payment method</li>
              <li>• Questions? Contact our support team</li>
            </ul>
          </div>
        </Card>
      ) : null}
    </div>
  );
}
