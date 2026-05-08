import { useEffect, useState } from "react";
import { Badge, Card, Spinner } from "../../components/ui";
import { api } from "../../services/api";

function formatDate(value) {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "-" : date.toLocaleString();
}

function getStatusTone(status) {
  const map = {
    CONFIRMED: "green",
    PENDING_PAYMENT: "yellow",
    CANCELLED: "red"
  };

  return map[status] || "slate";
}

export default function StudentCheckinsPage({ token, onToast }) {
  const [checkins, setCheckins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;

    async function loadCheckins() {
      try {
        setLoading(true);
        setError("");
        const rows = await api.getMyCheckins(token);
        if (!mounted) return;
        setCheckins(rows);
      } catch (err) {
        if (!mounted) return;
        const msg = err?.message || "Failed to load check-ins";
        setError(msg);
        onToast?.(msg, "error");
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadCheckins();
    return () => {
      mounted = false;
    };
  }, [token, onToast]);

  return (
    <Card>
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-blue-950">My Check-ins</h2>
          <p className="text-sm text-blue-800">A private history of your scan records and where they were checked in.</p>
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

      {!loading && !error && checkins.length === 0 ? (
        <div className="rounded-lg border border-blue-200 bg-blue-50/40 p-3 text-sm text-blue-800">
          No check-in records yet.
        </div>
      ) : null}

      <div className="space-y-3">
        {checkins.map((checkin) => (
          <div key={checkin.checkin_id} className="rounded-xl border border-blue-100 bg-blue-50/30 p-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div className="space-y-1">
                <p className="font-semibold text-blue-950">{checkin.workshop_title || "Workshop"}</p>
                <p className="text-sm text-blue-800">Registration {checkin.registration_id}</p>
                <p className="text-xs text-blue-700">Scanned at {formatDate(checkin.scanned_at)}</p>
              </div>
              <div className="flex flex-wrap items-center gap-2 md:justify-end">
                <Badge tone={getStatusTone(checkin.registration_status)}>{checkin.registration_status}</Badge>
                <span className="rounded-full bg-white px-2 py-1 text-xs text-blue-800">
                  {checkin.device_id}
                </span>
              </div>
            </div>

            <div className="mt-3 grid gap-2 text-xs text-blue-800 md:grid-cols-3">
              <div className="rounded-lg bg-white/80 p-2">
                <p className="font-medium text-blue-900">Workshop time</p>
                <p>{formatDate(checkin.workshop_start_time)}</p>
              </div>
              <div className="rounded-lg bg-white/80 p-2">
                <p className="font-medium text-blue-900">Offline sync ID</p>
                <p className="break-all">{checkin.offline_sync_id || "-"}</p>
              </div>
              <div className="rounded-lg bg-white/80 p-2">
                <p className="font-medium text-blue-900">Check-in ID</p>
                <p className="break-all">{checkin.checkin_id}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}