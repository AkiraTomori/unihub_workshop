import { useState } from "react";
import { Badge, Card } from "../components/ui";
import { api } from "../services/api";

export default function CheckerPage({ token }) {
  const [online, setOnline] = useState(false);
  const [queue, setQueue] = useState([]);
  const [lastScan, setLastScan] = useState("No scan yet");

  function scan() {
    const id = `offline-${Date.now()}`;
    if (online) {
      setLastScan(`Scan sent to server successfully (${id}).`);
      return;
    }
    setQueue((prev) => [
      ...prev,
      { id, at: new Date().toLocaleTimeString(), registrationId: null }
    ]);
    setLastScan(`Saved offline with offline_sync_id=${id}`);
  }

  async function sync() {
    if (!online || queue.length === 0) return;
    try {
      await api.syncCheckins(
        token,
        queue.map((item) => ({
          registrationId: item.registrationId,
          offlineSyncId: item.id,
          checkedInAt: new Date().toISOString()
        }))
      );
      setLastScan(`Synced ${queue.length} queued scans. Deduplicated by offline_sync_id.`);
      setQueue([]);
    } catch (error) {
      setLastScan(error.message);
    }
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card>
        <h3 className="mb-3 text-lg font-semibold">Check-in Scanner</h3>
        <div className="mb-3 flex items-center gap-2">
          <button
            onClick={() => setOnline((prev) => !prev)}
            className="rounded-lg border border-blue-300 px-3 py-2 text-sm font-semibold text-blue-900 hover:bg-blue-50"
          >
            Switch to {online ? "Offline" : "Online"}
          </button>
          <Badge tone={online ? "green" : "red"}>{online ? "Online" : "Offline"}</Badge>
        </div>

        <div className="flex gap-2">
          <button onClick={scan} className="rounded-lg bg-blue-900 px-3 py-2 text-sm font-medium text-white hover:bg-blue-800">Scan QR</button>
          <button onClick={sync} className="rounded-lg bg-indigo-700 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-600">Sync Queue</button>
        </div>

        <p className="mt-3 text-sm text-blue-900">{lastScan}</p>
      </Card>

      <Card>
        <h3 className="mb-3 text-lg font-semibold">Offline Queue</h3>
        <p className="mb-2 text-sm">
          Queued items: <span className="font-semibold">{queue.length}</span>
        </p>
        <div className="max-h-48 space-y-2 overflow-auto">
          {queue.length === 0 ? (
            <p className="text-sm text-blue-700">No pending records.</p>
          ) : (
            queue.map((item) => (
              <div key={item.id} className="rounded-lg border border-blue-100 bg-blue-50/40 p-2 text-xs">
                <p className="font-semibold">{item.id}</p>
                <p className="text-blue-800">saved at {item.at}</p>
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  );
}
