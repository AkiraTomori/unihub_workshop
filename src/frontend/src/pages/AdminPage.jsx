import { useEffect, useState } from "react";
import { Badge, Card } from "../components/ui";
import { api } from "../services/api";

export default function AdminPage({ workshops, token, onWorkshopsChanged }) {
  const [title, setTitle] = useState("");
  const [uploadStatus, setUploadStatus] = useState("No upload yet");
  const [analytics, setAnalytics] = useState({ activeCount: 0, seatsLeft: 0, aiCompleted: 0 });
  const [csvLog, setCsvLog] = useState({ ran_at: "-", processed_rows: 0, invalid_rows: 0, upsert_conflicts: 0 });

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
        setUploadStatus("Could not load admin analytics yet.");
      }
    }
    loadAdminData();
    return () => {
      mounted = false;
    };
  }, [token, workshops]);

  async function addWorkshop() {
    if (!title.trim()) return;
    try {
      await api.createWorkshop(token, { title, speaker: "TBD", room: "TBD", date: "TBD", totalSeats: 60, fee: 0 });
      setTitle("");
      onWorkshopsChanged();
    } catch (error) {
      setUploadStatus(error.message);
    }
  }

  async function cancelWorkshop(id) {
    try {
      await api.cancelWorkshop(token, id);
      onWorkshopsChanged();
    } catch (error) {
      setUploadStatus(error.message);
    }
  }

  async function uploadSummary(workshopId) {
    try {
      await api.uploadDocument(token, { workshopId, fileName: "workshop.pdf" });
      setUploadStatus("PDF accepted. Status moved to PENDING and queued for async worker.");
      onWorkshopsChanged();
    } catch (error) {
      setUploadStatus(error.message);
    }
  }

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <div className="space-y-4 lg:col-span-2">
        <Card>
          <h3 className="mb-3 text-lg font-semibold">Workshop Management</h3>
          <div className="mb-3 flex gap-2">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="New workshop title"
              className="w-full rounded-lg border border-blue-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            />
            <button onClick={addWorkshop} className="rounded-lg bg-blue-900 px-3 py-2 text-sm font-medium text-white hover:bg-blue-800">Create</button>
          </div>

          <div className="space-y-2">
            {workshops.map((w) => (
              <div key={w.id} className="flex flex-wrap items-center justify-between rounded-lg border border-blue-100 bg-blue-50/30 p-3">
                <div>
                  <p className="font-semibold text-blue-950">{w.title}</p>
                  <p className="text-sm text-blue-800">
                    {w.id} • {w.room} • {w.date}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge tone={w.status === "CANCELLED" ? "red" : "green"}>{w.status}</Badge>
                  <button
                    onClick={() => cancelWorkshop(w.id)}
                    className="rounded-lg border border-blue-300 px-3 py-1 text-xs font-semibold text-blue-900 hover:bg-blue-50"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <h3 className="mb-3 text-lg font-semibold">AI Summary Upload</h3>
          <div className="flex flex-wrap items-center gap-2">
            <input type="file" accept="application/pdf" className="block text-sm" />
            <button
              onClick={() => workshops[0] && uploadSummary(workshops[0].id)}
              className="rounded-lg bg-blue-900 px-3 py-2 text-sm font-medium text-white hover:bg-blue-800"
            >
              Upload PDF
            </button>
          </div>
          <p className="mt-3 text-sm text-blue-900">{uploadStatus}</p>

          <div className="mt-3 flex flex-wrap gap-2">
            <Badge tone="yellow">PENDING</Badge>
            <Badge tone="blue">PROCESSING</Badge>
            <Badge tone="green">COMPLETED</Badge>
            <Badge tone="red">FAILED</Badge>
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
      </div>
    </div>
  );
}
