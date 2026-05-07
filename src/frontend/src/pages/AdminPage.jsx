import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Badge, Card, Spinner } from "../components/ui";
import { api } from "../services/api";
import WorkshopFilter from "../components/WorkshopFilter";
import DocumentManager from "../components/DocumentManager";

export default function AdminPage({ workshops, token, onWorkshopsChanged, loading, loadError, hasLoaded, onToast }) {
  const navigate = useNavigate();
  const [analytics, setAnalytics] = useState({ activeCount: 0, seatsLeft: 0, aiCompleted: 0 });
  const [csvLog, setCsvLog] = useState({ ran_at: "-", processed_rows: 0, invalid_rows: 0, upsert_conflicts: 0 });
  const [cancellingWorkshopId, setCancellingWorkshopId] = useState("");
  const [selectedStatuses, setSelectedStatuses] = useState(["DRAFT", "PUBLISHED"]);

  useEffect(() => {
    let mounted = true;
    async function loadAdminData() {
      try {
        const [analyticData, csvData] = await Promise.all([api.getAnalytics(token), api.getCsvLatest(token)]);
        if (!mounted) return;
        setAnalytics(analyticData);
        setCsvLog(csvData);
      } catch {
        if (!mounted) return;
      }
    }
    loadAdminData();
    return () => {
      mounted = false;
    };
  }, [token, workshops]);

  async function cancelWorkshop(id) {
    try {
      setCancellingWorkshopId(id);
      await api.cancelWorkshop(token, id);
      onWorkshopsChanged();
      onToast?.("Workshop cancelled.", "info");
    } catch (error) {
      onToast?.(error.message || "Failed to cancel workshop", "error");
    } finally {
      setCancellingWorkshopId("");
    }
  }

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <div className="space-y-4 lg:col-span-2">
        <WorkshopFilter selectedStatuses={selectedStatuses} onStatusChange={setSelectedStatuses} />

        <Card>
          <div className="mb-3 flex items-center justify-between gap-3">
            <h3 className="text-lg font-semibold">Workshop Management</h3>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => navigate("/admin/workshops/create")}
                className="rounded-lg bg-blue-900 px-3 py-2 text-sm font-medium text-white hover:bg-blue-800"
              >
                Create Workshop
              </button>
              <button
                type="button"
                onClick={() => navigate("/admin/workshops/deleted")}
                className="rounded-lg border border-blue-300 px-3 py-2 text-sm font-medium text-blue-900 hover:bg-blue-50"
              >
                Deleted Workshops
              </button>
            </div>
            {loading ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-700">
                <Spinner className="h-3 w-3 border-blue-300 border-t-blue-700" />
                Loading...
              </span>
            ) : null}
          </div>

          <div className="space-y-2">
            {loading && !hasLoaded ? (
              <div className="space-y-2">
                {Array.from({ length: 3 }).map((_, idx) => (
                  <div key={`admin-skeleton-${idx}`} className="animate-pulse rounded-lg border border-blue-100 bg-blue-50/30 p-3">
                    <div className="mb-2 h-4 w-2/3 rounded bg-blue-200/70" />
                    <div className="h-3 w-1/2 rounded bg-blue-100/90" />
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
            {!loading && !loadError && workshops.length === 0 ? (
              <div className="rounded-lg border border-blue-200 bg-blue-50/40 p-3 text-sm text-blue-800">
                No workshops found. Create one to get started.
              </div>
            ) : null}
            {!loading && !loadError && workshops.filter(w => selectedStatuses.includes(w.status)).length === 0 && selectedStatuses.length > 0 ? (
              <div className="rounded-lg border border-blue-200 bg-blue-50/40 p-3 text-sm text-blue-800">
                No workshops match the selected filters.
              </div>
            ) : null}
            {workshops.filter(w => selectedStatuses.includes(w.status)).map((w) => {
              const statusTone =
                w.status === "DRAFT" ? "yellow" : w.status === "PUBLISHED" ? "green" : "red";

              return (
                <div
                  key={w.id}
                  className="flex flex-col gap-3 rounded-lg border border-blue-100 bg-blue-50/30 p-3 md:flex-row md:items-center md:justify-between"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-blue-950">{w.title}</p>
                    <p className="text-sm text-blue-800">
                      {w.room} • {w.date}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 md:justify-end">
                    <Badge tone={statusTone}>{w.status}</Badge>
                    <button
                      type="button"
                      onClick={() => navigate(`/admin/workshops/${w.id}/edit`)}
                      className="inline-flex items-center gap-2 rounded-lg border border-blue-300 px-3 py-1 text-xs font-semibold text-blue-900 hover:bg-blue-50"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => cancelWorkshop(w.id)}
                      disabled={cancellingWorkshopId === w.id}
                      className="inline-flex items-center gap-2 rounded-lg border border-blue-300 px-3 py-1 text-xs font-semibold text-blue-900 hover:bg-blue-50 disabled:opacity-50"
                    >
                      {cancellingWorkshopId === w.id ? (
                        <>
                          <Spinner className="h-3 w-3 border-blue-300 border-t-blue-700" />
                          Cancelling...
                        </>
                      ) : (
                        "Cancel"
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      <div className="space-y-4">
        <Card>
          <h3 className="mb-2 text-lg font-semibold">Admin Analytics</h3>
          <div className="space-y-2 text-sm">
            <p>Active workshops: <span className="font-semibold">{analytics.activeCount}</span></p>
            <p>Total seats left: <span className="font-semibold">{analytics.seatsLeft}</span></p>
            <p>AI completed docs: <span className="font-semibold">{analytics.aiCompleted}</span></p>
          </div>
        </Card>

        <Card>
          <h3 className="mb-2 text-lg font-semibold">Nightly CSV Sync Monitor</h3>
          <p className="text-sm">Last run: {new Date(csvLog.ran_at).toLocaleString()}</p>
          <p className="text-sm">Processed: {csvLog.processed_rows} rows</p>
          <p className="text-sm">Invalid rows isolated: {csvLog.invalid_rows}</p>
          <p className="text-sm">Upsert conflicts handled: {csvLog.upsert_conflicts}</p>
          <Badge tone="green">Job Completed</Badge>
        </Card>
        <DocumentManager token={token} workshops={workshops} onToast={onToast} />
      </div>
    </div>
  );
}
