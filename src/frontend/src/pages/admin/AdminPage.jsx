import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Badge, Card, Spinner } from "../../components/ui";
import { api } from "../../services/api";
import WorkshopFilter from "../../components/WorkshopFilter";
import DocumentManager from "../../components/DocumentManager";
import AdminCheckinStats from "../../components/AdminCheckinStats";
import AdminCsvSyncManager from "../../components/AdminCsvSyncManager";
import AdminNotificationReplay from "../../components/AdminNotificationReplay";

export default function AdminPage({ workshops, token, onWorkshopsChanged, loading, loadError, hasLoaded, onToast }) {
  const navigate = useNavigate();
  const [analytics, setAnalytics] = useState({ activeCount: 0, seatsLeft: 0, aiCompleted: 0 });
  const [csvLog, setCsvLog] = useState({ ran_at: "-", processed_rows: 0, invalid_rows: 0, upsert_conflicts: 0 });
  const [cancellingWorkshopId, setCancellingWorkshopId] = useState("");
  const [selectedStatuses, setSelectedStatuses] = useState(["DRAFT", "PUBLISHED"]);
  const [activeTab, setActiveTab] = useState("workshops");

  const tabs = [
    { id: "workshops", label: "Workshops", icon: "📅" },
    { id: "documents", label: "Documents", icon: "📄" },
    { id: "analytics", label: "Analytics", icon: "📊" },
    { id: "csv-sync", label: "CSV Sync", icon: "📥" },
    { id: "deleted", label: "Deleted", icon: "🗑️" }
  ];

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
    <div className="space-y-4">
      {/* Tab Navigation */}
      <div className="flex gap-1 border-b border-blue-200 flex-wrap">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 text-sm font-medium transition-all whitespace-nowrap ${
              activeTab === tab.id
                ? "border-b-2 border-blue-900 text-blue-900"
                : "text-blue-600 hover:text-blue-900"
            }`}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* Workshops Tab */}
      {activeTab === "workshops" && (
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <WorkshopFilter selectedStatuses={selectedStatuses} onStatusChange={setSelectedStatuses} />

        <Card>
          <div className="mb-3 flex items-center justify-between gap-3">
            <h3 className="text-lg font-semibold">Workshop Management</h3>
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
                      onClick={() => navigate(`/admin/workshops/${w.id}/participants`)}
                      className="inline-flex items-center gap-2 rounded-lg border border-blue-300 px-3 py-1 text-xs font-semibold text-blue-900 hover:bg-blue-50"
                    >
                      Participants
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
            <h3 className="mb-3 text-lg font-semibold">Navigation</h3>
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => navigate("/admin/workshops/create")}
                className="w-full rounded-lg bg-blue-900 px-3 py-2 text-sm font-medium text-white hover:bg-blue-800 transition-all"
              >
                + Create Workshop
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("documents")}
                className="w-full rounded-lg border border-blue-300 px-3 py-2 text-sm font-medium text-blue-900 hover:bg-blue-50 transition-all"
              >
                📄 Manage Documents
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("analytics")}
                className="w-full rounded-lg border border-blue-300 px-3 py-2 text-sm font-medium text-blue-900 hover:bg-blue-50 transition-all"
              >
                📊 View Analytics
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("deleted")}
                className="w-full rounded-lg border border-blue-300 px-3 py-2 text-sm font-medium text-blue-900 hover:bg-blue-50 transition-all"
              >
                🗑️ View Deleted
              </button>
            </div>
          </Card>
        </div>
      </div>
      )}

      {/* Documents Tab */}
      {activeTab === "documents" && (
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <h3 className="mb-3 text-lg font-semibold">Document Management</h3>
            <p className="text-sm text-blue-700 mb-4">Upload PDF documents for workshops and manage AI summaries below.</p>
          </Card>
        </div>
        <div className="space-y-4">
          <DocumentManager token={token} workshops={workshops} onToast={onToast} />
        </div>
      </div>
      )}

      {/* Analytics Tab */}
      {activeTab === "analytics" && (
      <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <h3 className="mb-3 text-lg font-semibold">Admin Analytics</h3>
          <div className="space-y-3">
            <div className="rounded-lg bg-blue-50 p-3">
              <p className="text-blue-600 text-xs mb-1 font-medium">Active Workshops</p>
              <p className="text-3xl font-bold text-blue-900">{analytics.activeCount}</p>
            </div>
            <div className="rounded-lg bg-green-50 p-3">
              <p className="text-green-600 text-xs mb-1 font-medium">Total Seats Available</p>
              <p className="text-3xl font-bold text-green-900">{analytics.seatsLeft}</p>
            </div>
            <div className="rounded-lg bg-purple-50 p-3">
              <p className="text-purple-600 text-xs mb-1 font-medium">AI Documents Completed</p>
              <p className="text-3xl font-bold text-purple-900">{analytics.aiCompleted}</p>
            </div>
          </div>
        </Card>

        <Card>
          <h3 className="mb-3 text-lg font-semibold">CSV Sync Monitor</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-blue-700">Last run:</span>
              <span className="font-semibold">{new Date(csvLog.ran_at).toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-blue-700">Processed rows:</span>
              <span className="font-semibold">{csvLog.processed_rows}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-blue-700">Invalid rows:</span>
              <span className="font-semibold">{csvLog.invalid_rows}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-blue-700">Conflicts handled:</span>
              <span className="font-semibold">{csvLog.upsert_conflicts}</span>
            </div>
            <div className="pt-2 border-t border-blue-200">
              <Badge tone="green">Job Completed</Badge>
            </div>
          </div>
        </Card>
      </div>
      <Card>
        <AdminCheckinStats token={token} onToast={onToast} />
      </Card>
      <Card>
        <AdminNotificationReplay token={token} onToast={onToast} />
      </Card>
      </div>
      )}

      {/* Deleted Workshops Tab */}
      {activeTab === "deleted" && (
      <Card>
        <h3 className="mb-3 text-lg font-semibold">Deleted Workshops</h3>
        <p className="text-sm text-blue-700 mb-4">Manage deleted workshops and restore them if needed. View full details on the dedicated page.</p>
        <button
          type="button"
          onClick={() => navigate("/admin/workshops/deleted")}
          className="rounded-lg bg-blue-900 px-4 py-2 text-sm font-medium text-white hover:bg-blue-800"
        >
          Go to Deleted Workshops Page →
        </button>
      </Card>
      )}

      {/* CSV Sync Tab */}
      {activeTab === "csv-sync" && (
      <AdminCsvSyncManager token={token} onToast={onToast} />
      )}
    </div>
  );
}
