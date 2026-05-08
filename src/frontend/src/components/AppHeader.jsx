import { NavLink } from "react-router-dom";
import { LogOut, ShieldCheck, UserRound } from "lucide-react";

export default function AppHeader({ role, roleLabel, fullName, onLogout }) {
  const links = [];
  if (role === "STUDENT") links.push({ to: "/student/workshops", label: "Student Actions" });
  if (role === "STUDENT") links.push({ to: "/student/notifications", label: "My Notifications" });
  if (role === "STUDENT") links.push({ to: "/student/registrations", label: "My Registrations" });
  if (role === "STUDENT") links.push({ to: "/student/payments", label: "My Payments" });
  if (role === "STUDENT") links.push({ to: "/student/checkins", label: "My Check-ins" });
  if (role === "ADMIN") links.push({ to: "/admin/workshops", label: "Admin Actions" });
  if (role === "ADMIN") links.push({ to: "/admin/notifications", label: "Notifications", end: true });
  if (role === "ADMIN") links.push({ to: "/admin/notifications/failed", label: "Failed Mail", end: true });

  return (
    <header className="mb-6 flex flex-col gap-3 rounded-xl bg-gradient-to-r from-blue-900 via-indigo-900 to-blue-800 p-4 text-white md:flex-row md:items-center md:justify-between">
      <div>
        <h1 className="text-2xl font-bold">UniHub Workshop UI</h1>
        <p className="text-sm text-blue-100">University workshop platform</p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            end={link.end}
            className={({ isActive }) =>
              `rounded-lg px-3 py-1 text-sm font-medium ${isActive ? "bg-white text-blue-900" : "bg-blue-700/70 text-white"}`
            }
          >
            {link.label}
          </NavLink>
        ))}
        <span className="inline-flex items-center gap-1 text-sm text-blue-100">
          <UserRound size={14} />
          {fullName || "Guest"}
        </span>
        <span className="inline-flex items-center gap-1 rounded-lg bg-blue-700/70 px-3 py-1 text-sm font-medium">
          <ShieldCheck size={14} />
          {roleLabel || "Not signed in"}
        </span>
        {onLogout ? (
          <button
            onClick={onLogout}
            className="inline-flex items-center gap-1 rounded-lg bg-white px-3 py-1 text-sm font-medium text-blue-900"
          >
            <LogOut size={14} />
            Logout
          </button>
        ) : null}
      </div>
    </header>
  );
}
