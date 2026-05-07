import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Card, Spinner } from "../../components/ui";
import { api } from "../../services/api";

function toInputDateTime(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (number) => String(number).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export default function AdminWorkshopEditPage({ token, onToast, onWorkshopsChanged }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadingRooms, setLoadingRooms] = useState(false);
  const [rooms, setRooms] = useState([]);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    title: "",
    description: "",
    speaker: "",
    room_id: "",
    start_time: "",
    end_time: "",
    totalSeats: 60,
    fee: 0,
    status: "DRAFT"
  });
  const availableRooms = rooms.filter((room) => Number(room.base_capacity || 0) >= Number(form.totalSeats || 0));
  const canSubmit = Boolean(form.title.trim()) && Boolean(form.room_id) && availableRooms.length > 0;

  useEffect(() => {
    let mounted = true;

    async function loadData() {
      try {
        setLoading(true);
        const [detail, roomList] = await Promise.all([api.getAdminWorkshopById(token, id), api.getRooms(token)]);
        if (!mounted) return;
        setRooms(roomList);
        setForm({
          title: detail?.title || "",
          description: detail?.description || "",
          speaker: detail?.speaker || "",
          room_id: detail?.room_id || roomList?.[0]?.id || "",
          start_time: toInputDateTime(detail?.start_time),
          end_time: toInputDateTime(detail?.end_time),
          totalSeats: Number(detail?.totalSeats || 60),
          fee: Number(detail?.fee || 0),
          status: detail?.status || "DRAFT"
        });
      } catch (err) {
        if (!mounted) return;
        setError(err.message || "Could not load workshop details.");
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadData();
    return () => {
      mounted = false;
    };
  }, [token, id]);

  useEffect(() => {
    if (loadingRooms || rooms.length === 0) return;
    if (availableRooms.length === 0) {
      setForm((prev) => (prev.room_id ? { ...prev, room_id: "" } : prev));
      return;
    }
    const isSelectedValid = availableRooms.some((room) => room.id === form.room_id);
    if (!isSelectedValid) {
      setForm((prev) => ({ ...prev, room_id: availableRooms[0].id }));
    }
  }, [availableRooms, loadingRooms, rooms.length, form.room_id]);

  async function handleSubmit(event) {
    event.preventDefault();
    try {
      setSaving(true);
      setError("");
      await api.updateWorkshop(token, id, {
        title: form.title,
        description: form.description,
        speaker: form.speaker,
        room_id: form.room_id,
        start_time: form.start_time || undefined,
        end_time: form.end_time || undefined,
        totalSeats: Number(form.totalSeats || 0),
        fee: Number(form.fee || 0),
        status: form.status
      });
      onWorkshopsChanged?.();
      onToast?.("Workshop updated.", "success");
      navigate("/admin/workshops");
    } catch (err) {
      const message = err.message || "Update failed.";
      setError(message);
      onToast?.(message, "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-blue-950">Edit Workshop</h2>
          <p className="text-sm text-blue-800">Update all workshop details except images.</p>
        </div>
      </div>

      {loading ? (
        <div className="inline-flex items-center gap-2 text-blue-900">
          <Spinner />
          Loading workshop detail...
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {error ? <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</div> : null}

          <div className="grid gap-3 md:grid-cols-2">
            <label className="block text-sm text-blue-900">
              Title
              <input
                className="mt-1 w-full rounded-lg border border-blue-200 px-3 py-2"
                value={form.title}
                onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
                required
              />
            </label>
            <label className="block text-sm text-blue-900">
              Speaker
              <input
                className="mt-1 w-full rounded-lg border border-blue-200 px-3 py-2"
                value={form.speaker}
                onChange={(e) => setForm((prev) => ({ ...prev, speaker: e.target.value }))}
              />
            </label>
          </div>

          <label className="block text-sm text-blue-900">
            Description
            <textarea
              className="mt-1 w-full rounded-lg border border-blue-200 px-3 py-2"
              rows={4}
              value={form.description}
              onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
            />
          </label>

          <div className="grid gap-3 md:grid-cols-3">
            <label className="block text-sm text-blue-900">
              Room
              <select
                className="mt-1 w-full rounded-lg border border-blue-200 px-3 py-2"
                value={form.room_id}
                onChange={(e) => setForm((prev) => ({ ...prev, room_id: e.target.value }))}
                disabled={loadingRooms || availableRooms.length === 0}
                required
              >
                {availableRooms.map((room) => (
                  <option key={room.id} value={room.id}>
                    {room.name} ({room.base_capacity} seats)
                  </option>
                ))}
              </select>
              {!loadingRooms && rooms.length > 0 && availableRooms.length === 0 ? (
                <p className="mt-1 text-xs text-rose-700">
                  Room capacity must be greater than or equal to workshop seats.
                </p>
              ) : null}
            </label>
            <label className="block text-sm text-blue-900">
              Start Time
              <input
                type="datetime-local"
                className="mt-1 w-full rounded-lg border border-blue-200 px-3 py-2"
                value={form.start_time}
                onChange={(e) => setForm((prev) => ({ ...prev, start_time: e.target.value }))}
              />
            </label>
            <label className="block text-sm text-blue-900">
              End Time
              <input
                type="datetime-local"
                className="mt-1 w-full rounded-lg border border-blue-200 px-3 py-2"
                value={form.end_time}
                onChange={(e) => setForm((prev) => ({ ...prev, end_time: e.target.value }))}
              />
            </label>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <label className="block text-sm text-blue-900">
              Total Seats
              <input
                type="number"
                min={1}
                className="mt-1 w-full rounded-lg border border-blue-200 px-3 py-2"
                value={form.totalSeats}
                onChange={(e) => setForm((prev) => ({ ...prev, totalSeats: e.target.value }))}
                required
              />
            </label>
            <label className="block text-sm text-blue-900">
              Fee (VND)
              <input
                type="number"
                min={0}
                className="mt-1 w-full rounded-lg border border-blue-200 px-3 py-2"
                value={form.fee}
                onChange={(e) => setForm((prev) => ({ ...prev, fee: e.target.value }))}
              />
            </label>
            <label className="block text-sm text-blue-900">
              Status
              <select
                className="mt-1 w-full rounded-lg border border-blue-200 px-3 py-2"
                value={form.status}
                onChange={(e) => setForm((prev) => ({ ...prev, status: e.target.value }))}
              >
                <option value="DRAFT">DRAFT</option>
                <option value="PUBLISHED">PUBLISHED</option>
                <option value="CANCELLED">CANCELLED</option>
              </select>
            </label>
          </div>

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={saving || !canSubmit}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-900 px-4 py-2 text-sm font-medium text-white disabled:bg-blue-400"
            >
              {saving ? (
                <>
                  <Spinner />
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </button>
            <button
              type="button"
              onClick={() => navigate("/admin/workshops")}
              className="rounded-lg border border-blue-300 px-4 py-2 text-sm font-medium text-blue-900"
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </Card>
  );
}
