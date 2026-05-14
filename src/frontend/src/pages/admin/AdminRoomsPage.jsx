import { useEffect, useState } from "react";
import { Card, Spinner, ConfirmDialog } from "../../components/ui";
import { api } from "../../services/api";
import { Edit2, Plus, Save, X, Trash2, RotateCcw } from "lucide-react";

export default function AdminRoomsPage({ token, onToast }) {
  const [rooms, setRooms] = useState([]);
  const [deletedRooms, setDeletedRooms] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showDeletedRooms, setShowDeletedRooms] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [roomIdToDelete, setRoomIdToDelete] = useState(null);

  // Form state for creating new room
  const [newRoom, setNewRoom] = useState({
    name: "",
    base_capacity: ""
  });

  // Form state for editing room
  const [editForm, setEditForm] = useState({
    name: "",
    base_capacity: ""
  });

  const [submitting, setSubmitting] = useState(false);

  // Load rooms on mount
  useEffect(() => {
    loadRooms();
  }, []);

  async function loadRooms() {
    try {
      setLoading(true);
      const result = await api.getRooms(token);
      setRooms(Array.isArray(result) ? result : []);
    } catch (error) {
      onToast?.(error.message || "Failed to load rooms", "error");
    } finally {
      setLoading(false);
    }
  }

  async function loadDeletedRooms() {
    try {
      const result = await api.getDeletedRooms(token);
      setDeletedRooms(Array.isArray(result) ? result : []);
    } catch (error) {
      onToast?.(error.message || "Failed to load deleted rooms", "error");
    }
  }

  async function handleCreateRoom(e) {
    e.preventDefault();
    if (!newRoom.name.trim()) {
      onToast?.("Room name is required", "error");
      return;
    }
    if (!newRoom.base_capacity || Number(newRoom.base_capacity) <= 0) {
      onToast?.("Capacity must be greater than 0", "error");
      return;
    }

    try {
      setSubmitting(true);
      const createdRoom = await api.createRoom(token, {
        name: newRoom.name.trim(),
        base_capacity: Number(newRoom.base_capacity)
      });
      setRooms([...rooms, createdRoom]);
      setNewRoom({ name: "", base_capacity: "" });
      setShowCreateForm(false);
      onToast?.("Room created successfully", "success");
    } catch (error) {
      onToast?.(error.message || "Failed to create room", "error");
    } finally {
      setSubmitting(false);
    }
  }

  function startEdit(room) {
    setEditing(room.id);
    setEditForm({
      name: room.name,
      base_capacity: room.base_capacity
    });
  }

  async function handleSaveEdit() {
    if (!editForm.name.trim()) {
      onToast?.("Room name is required", "error");
      return;
    }
    if (!editForm.base_capacity || Number(editForm.base_capacity) <= 0) {
      onToast?.("Capacity must be greater than 0", "error");
      return;
    }

    try {
      setSubmitting(true);
      const updatedRoom = await api.updateRoom(token, editing, {
        name: editForm.name.trim(),
        base_capacity: Number(editForm.base_capacity)
      });
      setRooms(rooms.map(r => r.id === editing ? updatedRoom : r));
      setEditing(null);
      setEditForm({ name: "", base_capacity: "" });
      onToast?.("Room updated successfully", "success");
    } catch (error) {
      onToast?.(error.message || "Failed to update room", "error");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDeleteRoom(roomId) {
    try {
      setSubmitting(true);
      const workshops = await api.getRoomWorkshops(token, roomId);
      const publishedWorkshops = workshops.filter(w => w.status === 'PUBLISHED');
      
      if (publishedWorkshops.length > 0) {
        onToast?.("Cannot delete room with published workshops", "error");
        return;
      }
      
      setRoomIdToDelete(roomId);
      setShowDeleteConfirm(true);
    } catch (error) {
      onToast?.(error.message || "Failed to check room workshops", "error");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleConfirmDelete() {
    if (!roomIdToDelete) return;

    try {
      setSubmitting(true);
      await api.deleteRoom(token, roomIdToDelete);
      setRooms(rooms.filter(r => r.id !== roomIdToDelete));
      setShowDeleteConfirm(false);
      setRoomIdToDelete(null);
      onToast?.("Room deleted successfully", "success");
    } catch (error) {
      onToast?.(error.message || "Failed to delete room", "error");
    } finally {
      setSubmitting(false);
    }
  }

  function handleCancelDelete() {
    setShowDeleteConfirm(false);
    setRoomIdToDelete(null);
  }

  async function handleRestoreRoom(roomId) {
    try {
      setSubmitting(true);
      const restoredRoom = await api.restoreRoom(token, roomId);
      setDeletedRooms(deletedRooms.filter(r => r.id !== roomId));
      setRooms([...rooms, restoredRoom]);
      onToast?.("Room restored successfully", "success");
    } catch (error) {
      onToast?.(error.message || "Failed to restore room", "error");
    } finally {
      setSubmitting(false);
    }
  }

  function cancelEdit() {
    setEditing(null);
    setEditForm({ name: "", base_capacity: "" });
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Card>
          <div className="flex items-center justify-center py-12">
            <span className="inline-flex items-center gap-2">
              <Spinner className="h-5 w-5" />
              Loading rooms...
            </span>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-blue-950">Manage Rooms</h2>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                setShowDeletedRooms(!showDeletedRooms);
                if (!showDeletedRooms) loadDeletedRooms();
              }}
              className="inline-flex items-center gap-1.5 rounded-lg bg-slate-600 px-3 py-2 text-sm font-medium text-white hover:bg-slate-700"
            >
              <Trash2 size={16} />
              Deleted ({deletedRooms.length})
            </button>
            <button
              type="button"
              onClick={() => setShowCreateForm(!showCreateForm)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-blue-900 px-3 py-2 text-sm font-medium text-white hover:bg-blue-800"
            >
              <Plus size={16} />
              Add Room
            </button>
          </div>
        </div>

        {/* Create Room Form */}
        {showCreateForm && (
          <form onSubmit={handleCreateRoom} className="mb-6 rounded-lg border border-blue-200 bg-blue-50/40 p-4">
            <h3 className="mb-3 font-semibold text-blue-950">Create New Room</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-blue-900">Room Name</label>
                <input
                  type="text"
                  value={newRoom.name}
                  onChange={(e) => setNewRoom({ ...newRoom, name: e.target.value })}
                  placeholder="e.g., Meeting Room A"
                  className="mt-1 w-full rounded-lg border border-blue-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-blue-900">Capacity</label>
                <input
                  type="number"
                  value={newRoom.base_capacity}
                  onChange={(e) => setNewRoom({ ...newRoom, base_capacity: e.target.value })}
                  placeholder="e.g., 50"
                  min="1"
                  className="mt-1 w-full rounded-lg border border-blue-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 rounded-lg bg-blue-900 px-3 py-2 text-sm font-medium text-white hover:bg-blue-800 disabled:bg-blue-400"
                >
                  {submitting ? "Creating..." : "Create Room"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateForm(false);
                    setNewRoom({ name: "", base_capacity: "" });
                  }}
                  className="flex-1 rounded-lg border border-blue-300 px-3 py-2 text-sm font-medium text-blue-900 hover:bg-blue-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          </form>
        )}

        {/* Rooms List */}
        {!showDeletedRooms ? (
          <>
            {rooms.length === 0 ? (
              <div className="rounded-lg border border-blue-200 bg-blue-50/40 p-4 text-center text-sm text-blue-800">
                No rooms created yet. Click "Add Room" to create one.
              </div>
            ) : (
              <div className="space-y-3">
                {rooms.map((room) => (
                  <div key={room.id} className="rounded-lg border border-blue-200 bg-white p-4">
                    {editing === room.id ? (
                      // Edit Mode
                      <div className="space-y-3">
                        <div>
                          <label className="block text-sm font-medium text-blue-900">Room Name</label>
                          <input
                            type="text"
                            value={editForm.name}
                            onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                            className="mt-1 w-full rounded-lg border border-blue-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-blue-900">Capacity</label>
                          <input
                            type="number"
                            value={editForm.base_capacity}
                            onChange={(e) => setEditForm({ ...editForm, base_capacity: e.target.value })}
                            min="1"
                            className="mt-1 w-full rounded-lg border border-blue-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                          />
                        </div>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={handleSaveEdit}
                            disabled={submitting}
                            className="flex items-center gap-1 rounded-lg bg-blue-900 px-3 py-2 text-sm font-medium text-white hover:bg-blue-800 disabled:bg-blue-400"
                          >
                            <Save size={14} />
                            Save
                          </button>
                          <button
                            type="button"
                            onClick={cancelEdit}
                            className="flex items-center gap-1 rounded-lg border border-blue-300 px-3 py-2 text-sm font-medium text-blue-900 hover:bg-blue-50"
                          >
                            <X size={14} />
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      // View Mode
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-semibold text-blue-950">{room.name}</h3>
                          <p className="mt-1 text-sm text-blue-700">Capacity: {room.base_capacity} seats</p>
                        </div>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => startEdit(room)}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-blue-300 px-3 py-2 text-sm font-medium text-blue-900 hover:bg-blue-50"
                          >
                            <Edit2 size={14} />
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteRoom(room.id)}
                            disabled={submitting}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-red-300 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
                          >
                            <Trash2 size={14} />
                            Delete
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        ) : (
          // Deleted Rooms Section
          <>
            <h3 className="mb-3 font-semibold text-slate-950">Deleted Rooms</h3>
            {deletedRooms.length === 0 ? (
              <div className="rounded-lg border border-slate-200 bg-slate-50/40 p-4 text-center text-sm text-slate-800">
                No deleted rooms.
              </div>
            ) : (
              <div className="space-y-3">
                {deletedRooms.map((room) => (
                  <div key={room.id} className="rounded-lg border border-slate-200 bg-white p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold text-slate-950">{room.name}</h3>
                        <p className="mt-1 text-sm text-slate-700">Capacity: {room.base_capacity} seats</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRestoreRoom(room.id)}
                        disabled={submitting}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-green-300 px-3 py-2 text-sm font-medium text-green-700 hover:bg-green-50 disabled:opacity-50"
                      >
                        <RotateCcw size={14} />
                        Restore
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </Card>
      <ConfirmDialog
        isOpen={showDeleteConfirm}
        title="Delete Room"
        message="Are you sure you want to delete this room?"
        onConfirm={handleConfirmDelete}
        onCancel={handleCancelDelete}
        isLoading={submitting}
      />
    </div>
  );
}
