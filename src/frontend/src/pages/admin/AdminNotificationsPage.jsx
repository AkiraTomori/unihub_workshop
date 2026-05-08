import { useEffect, useMemo, useState } from "react";
import { Badge, Card, Spinner } from "../../components/ui";
import { api } from "../../services/api";

const STATUS_OPTIONS = ["ALL", "PENDING", "SENT"];

function formatDate(value) {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "-" : date.toLocaleString();
}

function getStatusTone(status) {
  const map = {
    PENDING: "yellow",
    SENT: "green",
    FAILED: "red"
  };

  return map[status] || "slate";
}

function getChannelTone(channel) {
  const map = {
    EMAIL: "blue",
    IN_APP: "green",
    PUSH: "yellow"
  };

  return map[channel] || "slate";
}

export default function AdminNotificationsPage({ token, onToast }) {
  const [status, setStatus] = useState("ALL");
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [expandedIds, setExpandedIds] = useState([]);

  useEffect(() => {
    let mounted = true;

    async function loadNotifications() {
      try {
        setLoading(true);
        setError("");
        const rows = await api.getAdminNotifications(token, status);
        if (!mounted) return;
        setNotifications(rows);
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
  }, [token, onToast, status]);

  const statusCounts = useMemo(() => {
    return notifications.filter((item) => item.status !== "FAILED").reduce(
      (acc, item) => {
        acc[item.status] = (acc[item.status] || 0) + 1;
        return acc;
      },
      { PENDING: 0, SENT: 0 }
    );
  }, [notifications]);

  const visibleNotifications = useMemo(() => {
    return notifications.filter((item) => item.status !== "FAILED");
  }, [notifications]);

  function toggleExpanded(notificationId) {
    setExpandedIds((current) =>
      current.includes(notificationId)
        ? current.filter((id) => id !== notificationId)
        : [...current, notificationId]
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <h2 className="text-xl font-bold text-blue-950">Notification Management</h2>
            <p className="text-sm text-blue-800">View sent and pending notification emails, expanded by row.</p>
          </div>
          {loading ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-700">
              <Spinner className="h-3 w-3 border-blue-300 border-t-blue-700" />
              Loading...
            </span>
          ) : null}
        </div>

        <div className="mb-4 flex flex-wrap items-center gap-2">
          {STATUS_OPTIONS.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setStatus(option)}
              className={`rounded-full px-3 py-1 text-sm font-semibold transition ${status === option ? "bg-blue-900 text-white" : "bg-blue-50 text-blue-800 hover:bg-blue-100"}`}
            >
              {option}
            </button>
          ))}
        </div>

        <div className="mb-4 grid gap-2 md:grid-cols-2">
          <Badge tone="yellow">Pending {statusCounts.PENDING || 0}</Badge>
          <Badge tone="green">Sent {statusCounts.SENT || 0}</Badge>
        </div>

        {error ? (
          <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</div>
        ) : null}

        {!loading && !error && visibleNotifications.length === 0 ? (
          <div className="rounded-lg border border-blue-200 bg-blue-50/40 p-3 text-sm text-blue-800">
            No notifications found for the selected status.
          </div>
        ) : null}

        <div className="space-y-3">
          {visibleNotifications.map((notification) => (
            <div key={notification.id} className="overflow-hidden rounded-2xl border border-blue-100 bg-blue-50/30">
              <button
                type="button"
                onClick={() => toggleExpanded(notification.id)}
                className="flex w-full items-center justify-between gap-3 px-4 py-4 text-left transition hover:bg-blue-100/50"
                aria-expanded={expandedIds.includes(notification.id)}
              >
                <div className="min-w-0">
                  <p className="truncate text-lg font-bold text-blue-950">{notification.title}</p>
                </div>
                <span
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-blue-200 bg-white text-blue-900 transition-transform ${expandedIds.includes(notification.id) ? "rotate-90" : "rotate-0"}`}
                  aria-hidden="true"
                >
                  ›
                </span>
              </button>

              {expandedIds.includes(notification.id) ? (
                <div className="border-t border-blue-100 px-4 py-4">
                  <div className="flex flex-wrap items-center gap-2 pb-4">
                    <Badge tone={getChannelTone(notification.channel)}>{notification.channel}</Badge>
                    <Badge tone={getStatusTone(notification.status)}>{notification.status}</Badge>
                  </div>

                  <div className="grid gap-2 text-sm text-blue-900 md:grid-cols-2">
                    <p><span className="font-semibold">User:</span> {notification.user_full_name || "-"} {notification.user_email ? `(${notification.user_email})` : ""}</p>
                    <p><span className="font-semibold">Recipient:</span> {notification.recipient || "-"}</p>
                    <p><span className="font-semibold">Template:</span> {notification.template || "-"}</p>
                    <p><span className="font-semibold">Sent:</span> {formatDate(notification.created_at)}</p>
                    <p><span className="font-semibold">Read at:</span> {formatDate(notification.read_at)}</p>
                    <p><span className="font-semibold">Student code:</span> {notification.user_student_code || "-"}</p>
                  </div>

                  <div className="mt-4 rounded-2xl border border-indigo-200 bg-white/90 p-4">
                    <p className="mb-2 text-sm font-semibold text-blue-700">Message</p>
                    <pre className="whitespace-pre-wrap break-words text-sm leading-6 text-blue-950">{notification.message}</pre>
                  </div>
                </div>
              ) : null}
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}