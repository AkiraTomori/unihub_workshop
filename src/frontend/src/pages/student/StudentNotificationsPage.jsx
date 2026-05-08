import { useEffect, useMemo, useState } from "react";
import QRCode from "react-qr-code";
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

function extractQrCode(message) {
  if (!message) return "";
  const match = String(message).match(/QR Code:\s*(.+)/i);
  return match?.[1]?.trim() || "";
}

export default function StudentNotificationsPage({ token, onToast }) {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [readBusyId, setReadBusyId] = useState("");
  const [selectedNotification, setSelectedNotification] = useState(null);

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

  function openDetails(notification) {
    setSelectedNotification(notification);
  }

  function closeDetails() {
    setSelectedNotification(null);
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
                role="button"
                tabIndex={0}
                onClick={() => openDetails(notification)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    openDetails(notification);
                  }
                }}
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
                    <span className="rounded-lg bg-white px-3 py-2 text-sm font-medium text-blue-900 shadow-sm">View details</span>
                    {isUnread ? (
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          markAsRead(notification.id);
                        }}
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

      {selectedNotification ? (
        (() => {
          const qrCodeValue = extractQrCode(selectedNotification.message);

          return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm">
          <div className="max-h-[85vh] w-full max-w-3xl overflow-hidden rounded-2xl border border-blue-100 bg-white shadow-2xl shadow-slate-900/30">
            <div className="flex items-start justify-between gap-4 border-b border-blue-100 bg-blue-50 px-5 py-4">
              <div className="space-y-2">
                <h3 className="text-xl font-bold text-blue-950">Notification Details</h3>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone={getChannelTone(selectedNotification.channel)}>{selectedNotification.channel}</Badge>
                  <Badge tone={selectedNotification.read_at ? "green" : "yellow"}>
                    {selectedNotification.read_at ? "Read" : "Unread"}
                  </Badge>
                </div>
              </div>
              <button
                type="button"
                onClick={closeDetails}
                className="rounded-lg px-3 py-2 text-sm font-semibold text-blue-900 hover:bg-white"
              >
              </button>
            </div>

            <div className="max-h-[calc(85vh-84px)] overflow-y-auto p-5">
              <div className="space-y-4">
                <div>
                  <p className="text-sm font-semibold text-blue-700">Subject</p>
                  <p className="text-lg font-bold text-blue-950">{selectedNotification.title}</p>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-4 text-sm text-blue-900">
                    <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">Recipient</p>
                    <p className="break-all">{selectedNotification.recipient || "-"}</p>
                  </div>
                  <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-4 text-sm text-blue-900">
                    <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">Template</p>
                    <p>{selectedNotification.template || "-"}</p>
                  </div>
                  <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-4 text-sm text-blue-900">
                    <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">Sent</p>
                    <p>{formatDate(selectedNotification.created_at)}</p>
                  </div>
                  <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-4 text-sm text-blue-900">
                    <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">Read at</p>
                    <p>{formatDate(selectedNotification.read_at)}</p>
                  </div>
                </div>

                <div className="rounded-2xl border border-indigo-200 bg-indigo-50/50 p-4">
                  <p className="mb-2 text-sm font-semibold text-blue-700">Email content</p>
                  <pre className="whitespace-pre-wrap break-words text-sm leading-6 text-blue-950">{selectedNotification.message}</pre>
                </div>

                {qrCodeValue ? (
                  <div className="rounded-2xl border border-blue-200 bg-blue-50/60 p-4">
                    <p className="mb-2 text-sm font-semibold text-blue-700">QR Ticket</p>
                    <div className="flex flex-col items-center gap-3 rounded-xl bg-white p-4 shadow-sm">
                      <QRCode value={qrCodeValue} size={180} level="H" includeMargin={true} />
                      <p className="break-all text-center font-mono text-xs text-blue-800">{qrCodeValue}</p>
                    </div>
                  </div>
                ) : null}

                <div className="flex flex-wrap items-center gap-2">
                  {selectedNotification.read_at ? null : (
                    <button
                      type="button"
                      onClick={() => markAsRead(selectedNotification.id)}
                      disabled={readBusyId === selectedNotification.id}
                      className="rounded-lg bg-blue-900 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {readBusyId === selectedNotification.id ? "Saving..." : "Mark as read"}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={closeDetails}
                    className="rounded-lg border border-blue-200 bg-white px-4 py-2 text-sm font-medium text-blue-900"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
          );
        })()
      ) : null}
    </div>
  );
}