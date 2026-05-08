import { useState } from "react";
import RegistrationDetailModal from "../../components/RegistrationDetailModal";
import { Badge, Card, Spinner } from "../../components/ui";

function getStatusTone(status) {
  const map = {
    CONFIRMED: "green",
    PENDING_PAYMENT: "yellow",
    CANCELLED: "red"
  };

  return map[status] || "slate";
}

function formatDate(value) {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "-" : date.toLocaleString();
}

export default function StudentRegistrationsPage({ token, registrations = [], onToast }) {
  const [loading] = useState(false);
  const [error] = useState("");
  const [selectedRegistrationId, setSelectedRegistrationId] = useState(null);

  return (
    <div className="space-y-4">
      <Card>
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-blue-950">My Registrations</h2>
            <p className="text-sm text-blue-800">View your workshop registrations, then open one to see payment and check-in details.</p>
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

        {!loading && !error && registrations.length === 0 ? (
          <div className="rounded-lg border border-blue-200 bg-blue-50/40 p-3 text-sm text-blue-800">
            No registrations yet.
          </div>
        ) : null}

        <div className="space-y-3">
          {registrations.map((registration) => (
            <button
              key={registration.id}
              type="button"
              onClick={() => setSelectedRegistrationId(registration.id)}
              className="w-full rounded-xl border border-blue-100 bg-blue-50/30 p-4 text-left transition hover:bg-blue-50"
            >
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div className="min-w-0 space-y-1">
                  <p className="font-semibold text-blue-950">{registration.workshop_title}</p>
                  <p className="text-sm text-blue-800">{formatDate(registration.workshop_date)}</p>
                  {/* <p className="text-xs text-blue-700">Registration ID: {registration.id}</p> */}
                </div>
                <div className="flex flex-wrap items-center gap-2 md:justify-end">
                  <Badge tone={getStatusTone(registration.status)}>{registration.status}</Badge>
                  <span className="rounded-full bg-white px-2 py-1 text-xs text-blue-800">Open details</span>
                </div>
              </div>
            </button>
          ))}
        </div>
      </Card>

      {selectedRegistrationId ? (
        <RegistrationDetailModal
          registrationId={selectedRegistrationId}
          token={token}
          onClose={() => setSelectedRegistrationId(null)}
          onToast={onToast}
        />
      ) : null}
    </div>
  );
}