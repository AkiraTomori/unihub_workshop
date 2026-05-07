import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, Spinner } from "../../components/ui";
import { api } from "../../services/api";

function toInputDateTime(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (number) => String(number).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export default function AdminWorkshopCreatePage({ token, onToast, onWorkshopsChanged }) {
  const navigate = useNavigate();
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

    async function loadRooms() {
      try {
        setLoadingRooms(true);
        const list = await api.getRooms(token);
        if (!mounted) return;
        setRooms(list);
        if (list.length > 0) {
          setForm((prev) => ({ ...prev, room_id: prev.room_id || list[0].id }));
        }
      } catch (err) {
        if (!mounted) return;
        setError(err.message || "Không tải được danh sách phòng.");
      } finally {
        if (mounted) setLoadingRooms(false);
      }
    }

    loadRooms();
    return () => {
      mounted = false;
    };
  }, [token]);

  async function handleSubmit(event) {
    event.preventDefault();
    try {
      setSaving(true);
      setError("");
      await api.createWorkshop(token, {
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
      onToast?.("Workshop created.", "success");
      navigate("/admin/workshops");
    } catch (err) {
      const message = err.message || "Failed to create workshop.";
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
            <h2 className="text-2xl font-bold text-blue-950">Create Workshop</h2>
            <p className="text-sm text-blue-800">Fill in all workshop details except images.</p>
          </div>
        </div>

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
              placeholder="Optional"
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
            placeholder="Workshop overview"
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
                Creating...
              </>
            ) : (
              "Create Workshop"
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
    </Card>
  );
}
