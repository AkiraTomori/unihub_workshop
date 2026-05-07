import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Badge, Card, Spinner } from "../../components/ui";
import { api } from "../../services/api";

export default function AdminDeletedWorkshopsPage({ token, onToast, onWorkshopsChanged }) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [restoringId, setRestoringId] = useState("");
  const [workshops, setWorkshops] = useState([]);
  const [error, setError] = useState("");

  async function loadDeletedWorkshops() {
    try {
      setLoading(true);
      const rows = await api.getDeletedWorkshops(token);
      setWorkshops(rows || []);
      setError("");
    } catch (err) {
      setError(err.message || "Could not load deleted workshops.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDeletedWorkshops();
  }, [token]);

  async function handleRestore(workshopId) {
    try {
      setRestoringId(workshopId);
      await api.restoreWorkshop(token, workshopId);
      onWorkshopsChanged?.();
      onToast?.("Workshop restored.", "success");
      await loadDeletedWorkshops();
    } catch (err) {
      const message = err.message || "Restore failed.";
      setError(message);
      onToast?.(message, "error");
    } finally {
      setRestoringId("");
    }
  }

  return (
    <Card className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-blue-950">Deleted Workshops</h2>
          <p className="text-sm text-blue-800">Recover workshops that were cancelled and soft-deleted.</p>
        </div>
        <button
          type="button"
          onClick={() => navigate("/admin/workshops")}
          className="rounded-lg border border-blue-300 px-3 py-2 text-sm font-medium text-blue-900"
        >
          Back to List
        </button>
      </div>

      {error ? <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</div> : null}

      {loading ? (
        <div className="inline-flex items-center gap-2 text-blue-900">
          <Spinner />
          Loading deleted workshops...
        </div>
      ) : workshops.length === 0 ? (
        <div className="rounded-lg border border-blue-200 bg-blue-50/40 p-3 text-sm text-blue-800">
          No deleted workshops found.
        </div>
      ) : (
        <div className="space-y-2">
          {workshops.map((workshop) => (
            <div key={workshop.id} className="flex flex-wrap items-center justify-between rounded-lg border border-blue-100 bg-blue-50/30 p-3">
              <div>
                <p className="font-semibold text-blue-950">{workshop.title}</p>
                <p className="text-sm text-blue-800">
                  {workshop.speaker || "TBD"} • {workshop.room} • {workshop.date}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge tone="red">DELETED</Badge>
                <button
                  type="button"
                  onClick={() => handleRestore(workshop.id)}
                  disabled={restoringId === workshop.id}
                  className="inline-flex items-center gap-2 rounded-lg bg-blue-900 px-3 py-2 text-sm font-medium text-white disabled:bg-blue-400"
                >
                  {restoringId === workshop.id ? (
                    <>
                      <Spinner />
                      Restoring...
                    </>
                  ) : (
                    "Restore"
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
