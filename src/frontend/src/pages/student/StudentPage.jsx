import { useState } from "react";
import { Link } from "react-router-dom";
import { Badge, Card, Spinner } from "../../components/ui";
import { api } from "../../services/api";

export default function StudentPage({
  workshops,
  token,
  myRegistrations,
  notifications,
  pagination,
  onPageChange,
  onWorkshopsChanged,
  loading,
  loadError,
  hasLoaded,
  onToast
}) {
  const [selected, setSelected] = useState(null);
  const [notice, setNotice] = useState("No recent notifications");
  const [submittingWorkshopId, setSubmittingWorkshopId] = useState("");
  const [confirmingWorkshop, setConfirmingWorkshop] = useState(null);
  const [paymentContext, setPaymentContext] = useState(null);
  const [processingPayment, setProcessingPayment] = useState(false);
  const registeredWorkshopIds = new Set(myRegistrations.map((item) => item.workshop_id));
  const registrationByWorkshopId = new Map(myRegistrations.map((item) => [item.workshop_id, item]));
  const sortedWorkshops = [...workshops].sort((a, b) => a.date.localeCompare(b.date));

  async function register(workshop) {
    if (registeredWorkshopIds.has(workshop.id)) {
      setNotice("You already registered for this workshop.");
      return;
    }
    if (workshop.seatsLeft <= 0) {
      setNotice(`Workshop ${workshop.id} is sold out.`);
      return;
    }
    try {
      setSubmittingWorkshopId(workshop.id);
      const registration = await api.registerWorkshop(token, workshop.id);
      if (registration.requires_payment) {
        setPaymentContext({
          registrationId: registration.id,
          workshop,
          idempotencyKey: `${registration.id}-${Date.now()}`,
          paymentStatus: "PENDING_PAYMENT",
          message: "Registration reserved. Please complete payment to receive QR."
        });
        setNotice(`Seat reserved for ${workshop.title}. Complete payment to confirm registration.`);
        onToast?.(`Seat reserved for ${workshop.title}.`, "info");
      } else {
        setSelected({ ...workshop, qrCode: registration.qr_code });
        setNotice(`Registration completed for ${workshop.title}. QR ticket generated and email queued.`);
        onToast?.(`Registered for ${workshop.title}.`, "success");
      }
      onWorkshopsChanged();
    } catch (error) {
      setNotice(error.message);
      onToast?.(error.message || "Registration failed", "error");
    } finally {
      setSubmittingWorkshopId("");
    }
  }

  function requestRegisterConfirmation(workshop) {
    setConfirmingWorkshop(workshop);
  }

  async function confirmRegister() {
    if (!confirmingWorkshop) return;
    const workshop = confirmingWorkshop;
    setConfirmingWorkshop(null);
    await register(workshop);
  }

  async function processPayment(simulateResult) {
    if (!paymentContext) return;
    try {
      setProcessingPayment(true);
      const result = await api.checkoutPayment(
        token,
        paymentContext.registrationId,
        paymentContext.idempotencyKey,
        simulateResult
      );
      if (result.status === "CONFIRMED") {
        setSelected({ ...paymentContext.workshop, qrCode: result.qrCode });
        setNotice(`Payment success. QR issued for ${paymentContext.workshop.title}.`);
        setPaymentContext(null);
        onToast?.("Payment completed. Registration confirmed.", "success");
      } else {
        setPaymentContext((prev) =>
          prev
            ? {
                ...prev,
                paymentStatus: result.status,
                message: result.message || "Payment is still pending. Please retry."
              }
            : prev
        );
        setNotice(result.message || "Payment pending. Try again later.");
        onToast?.(result.message || "Payment pending. Try again later.", "info");
      }
      onWorkshopsChanged();
    } catch (error) {
      setNotice(error.message);
      onToast?.(error.message || "Payment failed", "error");
    } finally {
      setProcessingPayment(false);
    }
  }

  return (
    <div className="space-y-4">
      {confirmingWorkshop ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/55 px-4">
          <div className="w-full max-w-md rounded-xl border border-blue-100 bg-white p-5 shadow-2xl">
            <h3 className="mb-2 text-lg font-semibold text-blue-950">Confirm Registration</h3>
            <p className="text-sm text-blue-900">
              Are you sure you want to register for <span className="font-semibold">{confirmingWorkshop.title}</span>?
            </p>
            <p className="mt-1 text-xs text-blue-700">
              {confirmingWorkshop.date} • {confirmingWorkshop.room} •{" "}
              {confirmingWorkshop.fee === 0 ? "Free" : `${confirmingWorkshop.fee.toLocaleString()} VND`}
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmingWorkshop(null)}
                className="rounded-lg border border-blue-300 px-3 py-2 text-sm font-medium text-blue-900"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmRegister}
                className="rounded-lg bg-blue-900 px-3 py-2 text-sm font-medium text-white"
              >
                Yes, Register
              </button>
            </div>
          </div>
        </div>
      ) : null}
      {paymentContext ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/55 px-4">
          <div className="w-full max-w-md rounded-xl border border-blue-100 bg-white p-5 shadow-2xl">
            <h3 className="mb-2 text-lg font-semibold text-blue-950">Complete Payment</h3>
            <p className="text-sm text-blue-900">
              Workshop: <span className="font-semibold">{paymentContext.workshop.title}</span>
            </p>
            <p className="mt-1 text-xs text-blue-700">
              Fee: {paymentContext.workshop.fee === 0 ? "Free" : `${paymentContext.workshop.fee.toLocaleString()} VND`}
            </p>
            <p className="mt-2 text-sm text-blue-800">
              Status: <span className="font-semibold">{paymentContext.paymentStatus}</span>
            </p>
            <p className="mt-1 text-xs text-blue-700">{paymentContext.message}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => processPayment("success")}
                disabled={processingPayment}
                className="inline-flex items-center gap-2 rounded-lg bg-blue-900 px-3 py-2 text-sm font-medium text-white disabled:bg-blue-400"
              >
                {processingPayment ? (
                  <>
                    <Spinner />
                    Processing...
                  </>
                ) : (
                  "Pay Now"
                )}
              </button>
              <button
                type="button"
                onClick={() => processPayment("timeout")}
                disabled={processingPayment}
                className="rounded-lg border border-amber-300 px-3 py-2 text-sm font-medium text-amber-800 disabled:opacity-40"
              >
                Simulate Timeout
              </button>
              <button
                type="button"
                onClick={() => setPaymentContext(null)}
                disabled={processingPayment}
                className="rounded-lg border border-blue-300 px-3 py-2 text-sm font-medium text-blue-900 disabled:opacity-40"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      ) : null}
      <div className="relative grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card>
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <h3 className="text-lg font-semibold">Student Shortcuts</h3>
                <p className="text-sm text-blue-800">Jump to your payments, check-ins, and registration history.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Link to="/student/registrations" className="rounded-lg border border-blue-300 px-3 py-2 text-sm font-medium text-blue-900 hover:bg-blue-50">
                  My Registrations
                </Link>
                <Link to="/student/payments" className="rounded-lg border border-blue-300 px-3 py-2 text-sm font-medium text-blue-900 hover:bg-blue-50">
                  My Payments
                </Link>
                <Link to="/student/checkins" className="rounded-lg border border-blue-300 px-3 py-2 text-sm font-medium text-blue-900 hover:bg-blue-50">
                  My Check-ins
                </Link>
              </div>
            </div>
          </Card>

          <Card>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-lg font-semibold">Workshop Catalog</h3>
              <div className="flex items-center gap-2">
                {loading ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-700">
                    <Spinner className="h-3 w-3 border-blue-300 border-t-blue-700" />
                    Loading...
                  </span>
                ) : null}
                <Badge tone="blue">Real-time seats UI</Badge>
              </div>
            </div>
            <div className="space-y-3">
              {loading && !hasLoaded ? (
                <div className="space-y-3">
                  {Array.from({ length: 3 }).map((_, idx) => (
                    <div key={`skeleton-${idx}`} className="animate-pulse rounded-lg border border-blue-100 bg-blue-50/30 p-3">
                      <div className="mb-2 h-4 w-2/3 rounded bg-blue-200/70" />
                      <div className="mb-2 h-3 w-1/2 rounded bg-blue-100/90" />
                      <div className="h-3 w-1/3 rounded bg-blue-100/90" />
                    </div>
                  ))}
                </div>
              ) : null}
              {!loading && loadError ? (
                <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
                  <p className="font-medium">Could not load workshops.</p>
                  <p className="mt-1">{loadError}</p>
                  <button
                    type="button"
                    onClick={onWorkshopsChanged}
                    className="mt-2 rounded border border-rose-300 px-2 py-1 text-xs font-semibold"
                  >
                    Retry
                  </button>
                </div>
              ) : null}
              {!loading && !loadError && sortedWorkshops.length === 0 ? (
                <div className="rounded-lg border border-blue-200 bg-blue-50/40 p-3 text-sm text-blue-800">
                  No workshops available right now. Check back later.
                </div>
              ) : null}
              {sortedWorkshops.map((w) => (
                <div key={w.id} className="rounded-lg border border-blue-100 bg-blue-50/30 p-3 md:min-h-[176px]">
                  <div className="flex flex-col gap-3 md:grid md:grid-cols-[minmax(0,1fr)_auto] md:items-stretch md:gap-4">
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-blue-950">{w.title}</p>
                      <p className="text-sm text-blue-800">
                        {w.speaker} • {w.room} • {w.date}
                      </p>
                      <p className="mt-1 text-sm">
                        Seats: <span className="font-semibold">{w.seatsLeft}/{w.totalSeats}</span>
                      </p>
                    </div>
                    <div className="flex min-w-[220px] flex-col justify-end text-right md:min-h-[140px]">
                      <p className="mb-2 text-sm font-semibold">{w.fee === 0 ? "Free" : `${w.fee.toLocaleString()} VND`}</p>
                      <div className="mt-auto flex items-center justify-end gap-2">
                        <Link to={`/student/workshops/${w.id}`} className="rounded-lg border border-blue-300 px-3 py-2 text-sm font-medium text-blue-900 hover:bg-blue-50">
                          Details
                        </Link>
                        <button
                          onClick={() => requestRegisterConfirmation(w)}
                          className="inline-flex items-center gap-2 rounded-lg bg-blue-900 px-3 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:bg-blue-300"
                          disabled={w.seatsLeft <= 0 || registeredWorkshopIds.has(w.id) || submittingWorkshopId === w.id}
                        >
                          {submittingWorkshopId === w.id
                            ? (
                              <>
                                <Spinner />
                                Registering...
                              </>
                            )
                            : w.seatsLeft <= 0
                            ? "Sold Out"
                            : registrationByWorkshopId.get(w.id)?.status === "PENDING_PAYMENT"
                            ? "Pending Payment"
                            : registeredWorkshopIds.has(w.id)
                            ? "Registered"
                            : "Register"}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              {pagination ? (
                <div className="flex items-center justify-between rounded-lg border border-blue-100 bg-white p-2 text-sm">
                  <span className="text-blue-800">
                    Page {pagination.page} / {pagination.totalPages} • Total {pagination.total}
                  </span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => onPageChange(pagination.page - 1)}
                      disabled={!pagination.hasPrevPage}
                      className="rounded border border-blue-300 px-2 py-1 text-blue-900 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Prev
                    </button>
                    <button
                      type="button"
                      onClick={() => onPageChange(pagination.page + 1)}
                      disabled={!pagination.hasNextPage}
                      className="rounded border border-blue-300 px-2 py-1 text-blue-900 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Next
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          </Card>

          <Card>
            <h3 className="mb-2 text-lg font-semibold">Payment Resilience States</h3>
            <div className="grid gap-2 md:grid-cols-3">
              <Badge tone="green">Circuit: Closed</Badge>
              <Badge tone="red">Circuit: Open</Badge>
              <Badge tone="yellow">Circuit: Half-Open</Badge>
            </div>
            <p className="mt-3 text-sm text-blue-800">UI includes pending payment state, retry action with idempotency key, and completed confirmation state.</p>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <div className="mb-2 flex items-center justify-between gap-3">
              <h3 className="text-lg font-semibold">Notifications</h3>
              <Link to="/student/notifications" className="text-sm font-medium text-blue-900 underline underline-offset-2">
                View all
              </Link>
            </div>
            <p className="text-sm text-blue-900">{notice}</p>
            <p className="mt-2 text-xs text-blue-700">Asynchronous delivery via outbox worker (Email + in-app delivery records).</p>
            <div className="mt-3 max-h-48 space-y-2 overflow-auto">
              {(notifications || []).length === 0 ? (
                <p className="text-xs text-blue-700">No delivered notifications yet.</p>
              ) : (
                notifications.map((item) => (
                  <div key={item.id} className="rounded border border-blue-200 bg-blue-50/40 p-2">
                    <p className="text-xs font-semibold text-blue-900">{item.title} ({item.channel})</p>
                    <p className="text-xs text-blue-800">{item.message}</p>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}