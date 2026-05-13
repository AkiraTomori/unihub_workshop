import { useEffect, useState } from "react";
import PaymentDetailModal from "../../components/PaymentDetailModal";
import { Badge, Card, Spinner } from "../../components/ui";
import { api } from "../../services/api";
import StudentRefundsPage from "./StudentRefundsPage";
import { CreditCard, RotateCcw } from "lucide-react";

function getStatusTone(status) {
  const map = {
    PENDING: "yellow",
    SUCCESS: "green",
    FAILED: "red",
    REFUNDED: "blue"
  };

  return map[status] || "slate";
}

function formatCurrency(amount) {
  return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(Number(amount || 0));
}

function formatDate(value) {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "-" : date.toLocaleString();
}

export default function StudentPaymentsPage({ token, onToast }) {
  const [tab, setTab] = useState("payments");
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedPaymentId, setSelectedPaymentId] = useState(null);

  useEffect(() => {
    let mounted = true;

    async function loadPayments() {
      try {
        setLoading(true);
        setError("");
        const rows = await api.getMyPayments(token);
        if (!mounted) return;
        setPayments(rows);
      } catch (err) {
        if (!mounted) return;
        const msg = err?.message || "Failed to load payments";
        setError(msg);
        onToast?.(msg, "error");
      } finally {
        if (mounted) setLoading(false);
      }
    }

    if (tab === "payments") {
      loadPayments();
    }
    return () => {
      mounted = false;
    };
  }, [token, onToast, tab]);

  return (
    <div className="space-y-4">
      {/* Tab Navigation */}
      <div className="flex gap-2 border-b border-blue-200">
        <button
          type="button"
          onClick={() => setTab("payments")}
          className={`flex items-center gap-2 border-b-2 px-4 py-3 font-medium transition ${
            tab === "payments"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-blue-700 hover:text-blue-600"
          }`}
        >
          <CreditCard className="h-5 w-5" />
          Payments
        </button>
        <button
          type="button"
          onClick={() => setTab("refunds")}
          className={`flex items-center gap-2 border-b-2 px-4 py-3 font-medium transition ${
            tab === "refunds"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-blue-700 hover:text-blue-600"
          }`}
        >
          <RotateCcw className="h-5 w-5" />
          Refunds
        </button>
      </div>

      {/* Payments Tab */}
      {tab === "payments" ? (
        <Card>
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold text-blue-950">My Payments</h2>
              <p className="text-sm text-blue-800">View your payment history and open any payment for full details.</p>
            </div>
            {loading ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-700">
                <Spinner className="h-3 w-3 border-blue-300 border-t-blue-700" />
                Loading...
              </span>
            ) : null}
          </div>

          {error ? (
            <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</div>
          ) : null}

          {!loading && !error && payments.length === 0 ? (
            <div className="rounded-lg border border-blue-200 bg-blue-50/40 p-3 text-sm text-blue-800">
              No payment history yet.
            </div>
          ) : null}

          <div className="space-y-3">
            {payments.map((payment) => (
              <button
                key={payment.payment_id}
                type="button"
                onClick={() => setSelectedPaymentId(payment.payment_id)}
                className="w-full rounded-xl border border-blue-100 bg-blue-50/30 p-4 text-left transition hover:bg-blue-50"
              >
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div className="min-w-0 space-y-1">
                    <p className="font-semibold text-blue-950">{payment.workshop_title || "Workshop"}</p>
                    <p className="text-sm text-blue-800">
                      {payment.provider || "VNPay"}
                    </p>
                    <p className="text-xs text-blue-700">{formatDate(payment.created_at)}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 md:justify-end">
                    <span className="text-sm font-semibold text-blue-950">{formatCurrency(payment.amount)}</span>
                    <Badge tone={getStatusTone(payment.status)}>{payment.status}</Badge>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </Card>
      ) : null}

      {/* Refunds Tab */}
      {tab === "refunds" ? <StudentRefundsPage token={token} onToast={onToast} /> : null}

      {selectedPaymentId ? (
        <PaymentDetailModal
          paymentId={selectedPaymentId}
          token={token}
          onClose={() => setSelectedPaymentId(null)}
          onToast={onToast}
        />
      ) : null}
    </div>
  );
}