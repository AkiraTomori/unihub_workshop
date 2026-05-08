import AdminNotificationReplay from "../../components/AdminNotificationReplay";

export default function AdminFailedNotificationsPage({ token, onToast }) {
  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-blue-100 bg-white/95 p-4 shadow-sm">
        <h2 className="text-xl font-bold text-blue-950">Failed Mail Resend</h2>
        <p className="mt-1 text-sm text-blue-800">Review failed emails here and resend the selected messages.</p>
      </div>

      <AdminNotificationReplay token={token} onToast={onToast} />
    </div>
  );
}