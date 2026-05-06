import { useState } from "react";
import QRCode from "react-qr-code";
import { Badge, Card } from "../components/ui";
import { api } from "../services/api";

export default function StudentPage({ workshops, token, myRegistrations, pagination, onPageChange, onWorkshopsChanged }) {
  const [selected, setSelected] = useState(null);
  const [notice, setNotice] = useState("No recent notifications");
  const [submittingWorkshopId, setSubmittingWorkshopId] = useState("");
  const registeredWorkshopIds = new Set(myRegistrations.map((item) => item.workshop_id));
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
      if (workshop.fee > 0) {
        const key = `${registration.id}-${Date.now()}`;
        await api.checkoutPayment(token, registration.id, key);
      }
      setSelected({ ...workshop, qrCode: registration.qr_code });
      setNotice(`Registration completed for ${workshop.title}. QR ticket generated and email queued.`);
      onWorkshopsChanged();
    } catch (error) {
      setNotice(error.message);
    } finally {
      setSubmittingWorkshopId("");
    }
  }

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <div className="space-y-4 lg:col-span-2">
        <Card>
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-lg font-semibold">Workshop Catalog</h3>
            <Badge tone="blue">Real-time seats UI</Badge>
          </div>
          <div className="space-y-3">
            {sortedWorkshops.map((w) => (
              <div key={w.id} className="rounded-lg border border-blue-100 bg-blue-50/30 p-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-blue-950">{w.title}</p>
                    <p className="text-sm text-blue-800">
                      {w.speaker} • {w.room} • {w.date}
                    </p>
                    <div className="mt-2">
                      {w.summaryStatus === "COMPLETED" ? (
                        <p className="text-xs text-blue-900">AI summary: {w.summary || "Summary available."}</p>
                      ) : (
                        <p className="text-xs text-blue-700">AI summary status: {w.summaryStatus}</p>
                      )}
                    </div>
                    <p className="mt-1 text-sm">
                      Seats: <span className="font-semibold">{w.seatsLeft}/{w.totalSeats}</span>
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="mb-2 text-sm font-semibold">{w.fee === 0 ? "Free" : `${w.fee.toLocaleString()} VND`}</p>
                    <button
                      onClick={() => register(w)}
                      className="rounded-lg bg-blue-900 px-3 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:bg-blue-300"
                      disabled={w.seatsLeft <= 0 || registeredWorkshopIds.has(w.id) || submittingWorkshopId === w.id}
                    >
                      {submittingWorkshopId === w.id
                        ? "Registering..."
                        : w.seatsLeft <= 0
                        ? "Sold Out"
                        : registeredWorkshopIds.has(w.id)
                        ? "Registered"
                        : "Register"}
                    </button>
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
          <h3 className="mb-2 text-lg font-semibold">Your QR Tickets (Present at Door)</h3>
          {selected ? <p className="mb-2 text-xs text-blue-700">Latest registration: {selected.title}</p> : null}
          {myRegistrations.length === 0 ? (
            <p className="text-sm text-blue-800">Register a workshop to receive your QR tickets.</p>
          ) : (
            <div className="max-h-72 space-y-2 overflow-auto">
              {myRegistrations.map((ticket) => (
                <div key={ticket.id} className="rounded-lg border border-blue-200 bg-blue-50/50 p-2">
                  <p className="text-sm font-semibold text-blue-950">{ticket.workshop_title || ticket.workshop_id}</p>
                  <p className="text-xs text-blue-800">{ticket.workshop_date || "Schedule pending"}</p>
                  <div className="mt-1 grid place-items-center rounded border border-dashed border-blue-200 bg-white p-2">
                    <QRCode value={ticket.qr_code} size={72} />
                    <span className="mt-1 text-[10px] text-blue-700">Signed QR</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card>
          <h3 className="mb-2 text-lg font-semibold">Notifications</h3>
          <p className="text-sm text-blue-900">{notice}</p>
          <p className="mt-2 text-xs text-blue-700">Asynchronous channel simulation: In-app + Email, extendable to Telegram.</p>
        </Card>
      </div>
    </div>
  );
}
