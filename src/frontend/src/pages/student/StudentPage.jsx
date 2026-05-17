import { useState } from "react";
import { Link } from "react-router-dom";
import { Bell, CalendarDays, CheckCircle2, ChevronLeft, ChevronRight, CircleDollarSign, CreditCard, ExternalLink, QrCode, UserRound, Users } from "lucide-react";
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
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [selectedDateKey, setSelectedDateKey] = useState("");
  const [selected, setSelected] = useState(null);
  const [notice, setNotice] = useState("No recent notifications");
  const [submittingWorkshopId, setSubmittingWorkshopId] = useState("");
  const [confirmingWorkshop, setConfirmingWorkshop] = useState(null);
  const [paymentContext, setPaymentContext] = useState(null);
  const [processingPayment, setProcessingPayment] = useState(false);
  const registeredWorkshopIds = new Set(myRegistrations.map((item) => item.workshop_id));
  const registrationByWorkshopId = new Map(myRegistrations.map((item) => [item.workshop_id, item]));
  const sortedWorkshops = [...workshops].sort((a, b) => a.date.localeCompare(b.date));
  const confirmedRegistrations = myRegistrations.filter((item) => item.status === "CONFIRMED");

  function toDateKey(dateValue) {
    const date = new Date(dateValue);
    if (Number.isNaN(date.getTime())) return "";
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  const registrationsByDate = confirmedRegistrations.reduce((acc, item) => {
    const key = toDateKey(item.workshop_date);
    if (!key) return acc;
    if (!acc.has(key)) acc.set(key, []);
    acc.get(key).push(item);
    return acc;
  }, new Map());

  const monthLabel = calendarMonth.toLocaleString(undefined, { month: "long", year: "numeric" });
  const daysInMonth = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 0).getDate();
  const firstWeekDay = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), 1).getDay();
  const monthCells = Array.from({ length: firstWeekDay + daysInMonth }, (_, index) => {
    if (index < firstWeekDay) return null;
    return index - firstWeekDay + 1;
  });

  const selectedDayRegistrations = selectedDateKey ? (registrationsByDate.get(selectedDateKey) || []) : [];

  function changeMonth(offset) {
    setCalendarMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + offset, 1));
    setSelectedDateKey("");
  }

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
          idempotencyKey: crypto.randomUUID(),
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

  function openPendingPayment(workshop) {
    const existingRegistration = registrationByWorkshopId.get(workshop.id);
    if (!existingRegistration || existingRegistration.status !== "PENDING_PAYMENT") return;

    setPaymentContext({
      registrationId: existingRegistration.id,
      workshop,
      idempotencyKey: crypto.randomUUID(),
      paymentStatus: "PENDING_PAYMENT",
      message: "Registration reserved. Please complete payment to receive QR."
    });
    setNotice(`Continue payment for ${workshop.title}.`);
    onToast?.(`Continue payment for ${workshop.title}.`, "info");
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/55 px-3 py-3 sm:px-4">
          <div className="w-full max-w-[calc(100vw-1.5rem)] max-h-[calc(100vh-1.5rem)] overflow-y-auto rounded-xl border border-blue-100 bg-white p-4 shadow-2xl sm:max-w-lg sm:p-5">
            <h3 className="mb-2 text-base font-semibold text-blue-950 sm:text-lg">Confirm Registration</h3>
            <p className="text-sm text-blue-900 sm:text-base">
              Are you sure you want to register for <span className="font-semibold">{confirmingWorkshop.title}</span>?
            </p>
            <p className="mt-1 text-xs text-blue-700">
              {confirmingWorkshop.date} • {confirmingWorkshop.room} •{" "}
              {confirmingWorkshop.fee === 0 ? "Free" : `${confirmingWorkshop.fee.toLocaleString()} VND`}
            </p>
            <div className="mt-4 grid gap-2 sm:flex sm:justify-end">
              <button
                type="button"
                onClick={() => setConfirmingWorkshop(null)}
                className="w-full rounded-lg border border-blue-300 px-3 py-2 text-sm font-medium text-blue-900 sm:w-auto"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmRegister}
                className="w-full rounded-lg bg-blue-900 px-3 py-2 text-sm font-medium text-white sm:w-auto"
              >
                Yes, Register
              </button>
            </div>
          </div>
        </div>
      ) : null}
      {paymentContext ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/55 px-3 py-3 sm:px-4">
          <div className="w-full max-w-[calc(100vw-1.5rem)] max-h-[calc(100vh-1.5rem)] overflow-y-auto rounded-xl border border-blue-100 bg-white p-4 shadow-2xl sm:max-w-lg sm:p-5">
            <h3 className="mb-2 text-base font-semibold text-blue-950 sm:text-lg">Complete Payment</h3>
            <p className="text-sm text-blue-900 sm:text-base">
              Workshop: <span className="font-semibold">{paymentContext.workshop.title}</span>
            </p>
            <p className="mt-1 text-xs text-blue-700">
              Fee: {paymentContext.workshop.fee === 0 ? "Free" : `${paymentContext.workshop.fee.toLocaleString()} VND`}
            </p>
            <p className="mt-2 text-sm text-blue-800 sm:text-base">
              Status: <span className="font-semibold">{paymentContext.paymentStatus}</span>
            </p>
            <p className="mt-1 text-xs text-blue-700">{paymentContext.message}</p>
            <div className="mt-4 grid gap-2 sm:flex sm:flex-wrap">
              <button
                type="button"
                onClick={() => processPayment("success")}
                disabled={processingPayment}
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-blue-900 px-3 py-2 text-sm font-medium text-white disabled:bg-blue-400 sm:w-auto"
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
                className="w-full rounded-lg border border-amber-300 px-3 py-2 text-sm font-medium text-amber-800 disabled:opacity-40 sm:w-auto"
              >
                Simulate Timeout
              </button>
              <button
                type="button"
                onClick={() => processPayment("5xx")}
                disabled={processingPayment}
                className="w-full rounded-lg border border-rose-300 px-3 py-2 text-sm font-medium text-rose-800 disabled:opacity-40 sm:w-auto"
              >
                Simulate 5xx
              </button>
              {!processingPayment ? (
                <button
                  type="button"
                  onClick={() => setPaymentContext(null)}
                  className="w-full rounded-lg border border-blue-300 px-3 py-2 text-sm font-medium text-blue-900 sm:w-auto"
                >
                  Close
                </button>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
      <div className="relative grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card>
            <div className="flex items-center justify-between gap-4">
              {/* Tiêu đề - flex-1 để nó chiếm không gian còn lại và có thể xuống dòng nếu title quá dài */}
              <div className="flex-1 min-w-0">
                <h3 className="flex items-center gap-2 text-lg font-bold text-blue-950 truncate">
                  <CalendarDays size={20} className="text-blue-600 flex-shrink-0" />
                  <span className="truncate">Student Shortcuts</span>
                </h3>
                <p className="text-sm text-blue-800 hidden md:block truncate">
                  Jump to your history and payments.
                </p>
              </div>

              {/* Nhóm nút - flex-shrink-0 để đảm bảo không bị bóp méo, flex-wrap để xử lý khi màn hình trung bình */}
              <div className="flex items-center gap-2 flex-shrink-0">
                <Link 
                  to="/student/registrations" 
                  className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-white px-3 py-2 text-sm font-semibold text-blue-900 hover:bg-blue-50 transition-colors whitespace-nowrap shadow-sm"
                >
                  <CheckCircle2 size={16} className="text-emerald-600" />
                  <span className="hidden sm:inline">Registrations</span>
                  <span className="sm:hidden">Regs</span>
                </Link>

                <Link 
                  to="/student/payments" 
                  className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-white px-3 py-2 text-sm font-semibold text-blue-900 hover:bg-blue-50 transition-colors whitespace-nowrap shadow-sm"
                >
                  <CreditCard size={16} className="text-blue-600" />
                  <span className="hidden sm:inline">Payments</span>
                  <span className="sm:hidden">Pay</span>
                </Link>

                <Link 
                  to="/student/checkins" 
                  className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-white px-3 py-2 text-sm font-semibold text-blue-900 hover:bg-blue-50 transition-colors whitespace-nowrap shadow-sm"
                >
                  <QrCode size={16} className="text-indigo-600" />
                  <span className="hidden sm:inline">Check-ins</span>
                  <span className="sm:hidden">Tickets</span>
                </Link>
              </div>
            </div>
          </Card>

          <Card>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="inline-flex items-center gap-2 text-lg font-semibold"><CalendarDays size={18} /> Workshop Catalog</h3>
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
                        <span className="inline-flex items-center gap-1"><UserRound size={13} /> {w.speaker}</span> • {w.room} • {w.date}
                      </p>
                      <p className="mt-1 text-sm">
                        <span className="inline-flex items-center gap-1"><Users size={13} /> Seats:</span>{" "}
                        <span className="font-semibold">{w.seatsLeft}/{w.totalSeats}</span>
                      </p>
                    </div>
                    <div className="flex min-w-[220px] flex-col justify-end text-right md:min-h-[140px]">
                      <p className="mb-2 inline-flex items-center justify-end gap-1 text-sm font-semibold">
                        <CircleDollarSign size={14} />
                        {w.fee === 0 ? "Free" : `${w.fee.toLocaleString()} VND`}
                      </p>
                      <div className="mt-auto flex items-center justify-end gap-2">
                        <Link to={`/student/workshops/${w.id}`} className="rounded-lg border border-blue-300 px-3 py-2 text-sm font-medium text-blue-900 hover:bg-blue-50">
                          <span className="inline-flex items-center gap-1"><ExternalLink size={14} /> Details</span>
                        </Link>
                        <button
                          onClick={() => {
                            const existingRegistration = registrationByWorkshopId.get(w.id);
                            if (existingRegistration?.status === "PENDING_PAYMENT") {
                              openPendingPayment(w);
                              return;
                            }
                            requestRegisterConfirmation(w);
                          }}
                          className="inline-flex items-center gap-2 rounded-lg bg-blue-900 px-3 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:bg-blue-300"
                          disabled={w.seatsLeft <= 0 || (registeredWorkshopIds.has(w.id) && registrationByWorkshopId.get(w.id)?.status !== "PENDING_PAYMENT") || submittingWorkshopId === w.id}
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
                            ? "Continue Payment"
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

        </div>

        <div className="space-y-4">
          <Card>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="inline-flex items-center gap-2 text-lg font-semibold">
                <CalendarDays size={18} />
                Registration Calendar
              </h3>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => changeMonth(-1)}
                  className="rounded border border-blue-300 p-1 text-blue-900 hover:bg-blue-50"
                  aria-label="Previous month"
                >
                  <ChevronLeft size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => changeMonth(1)}
                  className="rounded border border-blue-300 p-1 text-blue-900 hover:bg-blue-50"
                  aria-label="Next month"
                >
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
            <p className="mb-2 text-sm font-medium text-blue-900">{monthLabel}</p>
            <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-semibold text-blue-700">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                <span key={day}>{day}</span>
              ))}
            </div>
            <div className="mt-1 grid grid-cols-7 gap-1">
              {monthCells.map((day, idx) => {
                if (!day) return <span key={`empty-${idx}`} className="h-8" />;
                const dateKey = toDateKey(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), day));
                const hasRegistration = registrationsByDate.has(dateKey);
                const isSelected = selectedDateKey === dateKey;
                return (
                  <button
                    key={dateKey}
                    type="button"
                    onClick={() => setSelectedDateKey(dateKey)}
                    className={`relative h-8 rounded text-xs font-medium transition ${
                      isSelected
                        ? "bg-blue-900 text-white"
                        : hasRegistration
                        ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-200"
                        : "bg-blue-50 text-blue-900 hover:bg-blue-100"
                    }`}
                  >
                    {day}
                    {hasRegistration && !isSelected ? (
                      <span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-emerald-600" />
                    ) : null}
                  </button>
                );
              })}
            </div>

            <div className="mt-3 border-t border-blue-100 pt-3">
              {!selectedDateKey ? (
                <p className="text-xs text-blue-700">Pick a highlighted day to see confirmed workshops.</p>
              ) : selectedDayRegistrations.length === 0 ? (
                <p className="text-xs text-blue-700">No confirmed workshops on {selectedDateKey}.</p>
              ) : (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-blue-900">Registered workshops on {selectedDateKey}</p>
                  {selectedDayRegistrations.map((reg) => (
                    <div key={reg.id} className="rounded-lg border border-blue-200 bg-blue-50/50 px-2 py-1.5">
                      <p className="text-xs font-semibold text-blue-900">{reg.workshop_title || reg.workshop_id}</p>
                      <p className="text-[11px] text-blue-700">{new Date(reg.workshop_date).toLocaleString()}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Card>

          <Card>
            <div className="mb-2 flex items-center justify-between gap-3">
              <h3 className="inline-flex items-center gap-2 text-lg font-semibold"><Bell size={18} /> Notifications</h3>
              <Link
                to="/student/notifications"
                className="inline-flex items-center rounded-lg border border-blue-300 bg-white px-3 py-1.5 text-sm font-medium text-blue-900 hover:bg-blue-50"
              >
                <span className="inline-flex items-center gap-1"><ExternalLink size={14} /> View All</span>
              </Link>
            </div>
            <p className="text-sm text-blue-900">{notice}</p>
            <p className="mt-2 text-xs text-blue-700">Asynchronous delivery via outbox worker (Email + in-app delivery records).</p>
            <div className="mt-3 max-h-48 space-y-2 overflow-auto">
              {(notifications || []).length === 0 ? (
                <p className="text-xs text-blue-700">No delivered notifications yet.</p>
              ) : (
                notifications.map((item) => (
                  <div key={item.id} className="rounded-lg border border-blue-200 bg-blue-50/40 px-3 py-2">
                    <p className="text-sm font-semibold text-blue-900">{item.title}</p>
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
