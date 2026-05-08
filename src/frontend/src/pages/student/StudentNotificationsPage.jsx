import { useEffect, useMemo, useState } from "react";
import { Badge, Card, Spinner } from "../../components/ui";
import { api } from "../../services/api";

function formatDate(value) {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "-" : date.toLocaleString();
}

function getChannelTone(channel) {
  const map = {
    EMAIL: "blue",
    IN_APP: "green",
    PUSH: "yellow"
  };

  return map[channel] || "slate";
}

export default function StudentNotificationsPage({ token, onToast }) {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [readBusyId, setReadBusyId] = useState("");

  useEffect(() => {
    let mounted = true;

    async function loadNotifications() {
      try {
        setLoading(true);
        setError("");
        const rows = await api.getMyNotifications(token);
        if (!mounted) return;
        setNotifications(Array.isArray(rows) ? rows : []);
      } catch (err) {
        if (!mounted) return;
        const msg = err?.message || "Failed to load notifications";
        setError(msg);
        onToast?.(msg, "error");
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadNotifications();
    return () => {
      mounted = false;
    };
  }, [token, onToast]);

  const unreadCount = useMemo(
    () => notifications.filter((notification) => !notification.read_at).length,
    [notifications]
  );

  async function markAsRead(notificationId) {
    try {
      setReadBusyId(notificationId);
      await api.markNotificationAsRead(token, notificationId);
      setNotifications((current) =>
        current.map((notification) =>
          notification.id === notificationId
            ? { ...notification, read_at: new Date().toISOString(), is_read: true }
            : notification
        )
      );
      onToast?.("Notification marked as read", "success");
    } catch (err) {
      const msg = err?.message || "Failed to mark notification as read";
      onToast?.(msg, "error");
    } finally {
      setReadBusyId("");
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <div className="mb-3 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <h2 className="text-xl font-bold text-blue-950">My Notifications</h2>
            <p className="text-sm text-blue-800">Keep track of confirmation emails, QR ticket notices, and delivery status.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {loading ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-700">
                <Spinner className="h-3 w-3 border-blue-300 border-t-blue-700" />
                Loading...
              </span>
            ) : null}
            <Badge tone={unreadCount > 0 ? "yellow" : "green"}>Unread {unreadCount}</Badge>
          </div>
        </div>

        {error ? (
          <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</div>
        ) : null}

        {!loading && !error && notifications.length === 0 ? (
          <div className="rounded-lg border border-blue-200 bg-blue-50/40 p-3 text-sm text-blue-800">
            No notifications yet.
          </div>
        ) : null}

        <div className="space-y-3">
          {notifications.map((notification) => {
            const isUnread = !notification.read_at;

            return (
              <div
                key={notification.id}
                className={`rounded-xl border p-4 transition ${isUnread ? "border-indigo-200 bg-indigo-50/40" : "border-blue-100 bg-blue-50/20"}`}
              >
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-blue-950">{notification.title}</p>
                      <Badge tone={getChannelTone(notification.channel)}>{notification.channel}</Badge>
                      <Badge tone={isUnread ? "yellow" : "green"}>{isUnread ? "Unread" : "Read"}</Badge>
                    </div>
                    <p className="text-sm text-blue-800 whitespace-pre-line">{notification.message}</p>
                    <p className="text-xs text-blue-700">Sent {formatDate(notification.created_at)}</p>
                    {notification.read_at ? (
                      <p className="text-xs text-blue-700">Read {formatDate(notification.read_at)}</p>
                    ) : null}
                  </div>
                  <div className="flex items-center gap-2">
                    {isUnread ? (
                      <button
                        type="button"
                        onClick={() => markAsRead(notification.id)}
                        disabled={readBusyId === notification.id}
                        className="rounded-lg bg-blue-900 px-3 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {readBusyId === notification.id ? "Saving..." : "Mark as read"}
                      </button>
                    ) : null}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}