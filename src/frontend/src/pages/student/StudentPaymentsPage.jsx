import { useCallback, useEffect, useState } from "react";
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

function isPayable(payment) {
  return payment.status === "PENDING" || payment.registration_status === "PENDING_PAYMENT";
}

export default function StudentPaymentsPage({ token, onToast }) {
  const [tab, setTab] = useState("payments");
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedPaymentId, setSelectedPaymentId] = useState(null);
  const [processingPaymentId, setProcessingPaymentId] = useState("");

  const loadPayments = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const rows = await api.getMyPayments(token);
      setPayments(rows);
    } catch (err) {
      const msg = err?.message || "Failed to load payments";
      setError(msg);
      onToast?.(msg, "error");
    } finally {
      setLoading(false);
    }
  }, [token, onToast]);

  useEffect(() => {
    if (tab === "payments") {
      loadPayments();
    }
  }, [tab, loadPayments]);

  async function handlePay(payment) {
    if (!isPayable(payment)) return;

    try {
      setProcessingPaymentId(payment.payment_id);
      const idempotencyKey = payment.idempotency_key || crypto.randomUUID();
      const result = await api.checkoutPayment(token, payment.registration_id, idempotencyKey);

      if (result.status === "CONFIRMED") {
        onToast?.("Payment completed. Registration confirmed.", "success");
        await loadPayments();
        return;
      }

      onToast?.(result.message || "Payment is still pending. Please try again.", "info");
      await loadPayments();
    } catch (err) {
      onToast?.(err?.message || "Payment failed", "error");
    } finally {
      setProcessingPaymentId("");
    }
  }

  return (
    <div className="space-y-4">
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

      {tab === "payments" ? (
        <Card>
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold text-blue-950">My Payments</h2>
              <p className="text-sm text-blue-800">View your payment history and complete any pending checkout.</p>
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
            {payments.map((payment) => {
              const payable = isPayable(payment);
              const isProcessing = processingPaymentId === payment.payment_id;

              return (
                <div
                  key={payment.payment_id}
                  className="rounded-xl border border-blue-100 bg-blue-50/30 transition hover:bg-blue-50"
                >
                  <button
                    type="button"
                    onClick={() => setSelectedPaymentId(payment.payment_id)}
                    className="w-full p-4 text-left"
                  >
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div className="min-w-0 space-y-1">
                        <p className="font-semibold text-blue-950">{payment.workshop_title || "Workshop"}</p>
                        <p className="text-sm text-blue-800">{payment.provider || "VNPay"}</p>
                        <p className="text-xs text-blue-700">{formatDate(payment.created_at)}</p>
                        {payment.registration_status === "PENDING_PAYMENT" ? (
                          <p className="text-xs font-medium text-amber-700">Registration awaiting payment</p>
                        ) : null}
                      </div>
                      <div className="flex flex-wrap items-center gap-2 md:justify-end">
                        <span className="text-sm font-semibold text-blue-950">{formatCurrency(payment.amount)}</span>
                        <Badge tone={getStatusTone(payment.status)}>{payment.status}</Badge>
                      </div>
                    </div>
                  </button>

                  {payable ? (
                    <div className="border-t border-blue-100 px-4 pb-4">
                      <button
                        type="button"
                        onClick={() => handlePay(payment)}
                        disabled={isProcessing}
                        className="inline-flex items-center gap-2 rounded-lg bg-blue-900 px-3 py-2 text-sm font-medium text-white transition hover:bg-blue-800 disabled:bg-blue-400"
                      >
                        {isProcessing ? (
                          <>
                            <Spinner className="h-4 w-4 border-white/30 border-t-white" />
                            Processing...
                          </>
                        ) : (
                          "Pay Now"
                        )}
                      </button>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </Card>
      ) : null}

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
