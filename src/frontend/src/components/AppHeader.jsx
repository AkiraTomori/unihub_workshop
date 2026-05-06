import { NavLink } from "react-router-dom";

export default function AppHeader({ role, roleLabel, fullName, onLogout }) {
  const links = [];
  if (role === "STUDENT") links.push({ to: "/student/workshops", label: "Student Actions" });
  if (role === "ADMIN") links.push({ to: "/admin/workshops", label: "Admin Actions" });

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
            className={({ isActive }) =>
              `rounded-lg px-3 py-1 text-sm font-medium ${isActive ? "bg-white text-blue-900" : "bg-blue-700/70 text-white"}`
            }
          >
            {link.label}
          </NavLink>
        ))}
        <span className="text-sm text-blue-100">{fullName || "Guest"}</span>
        <span className="rounded-lg bg-blue-700/70 px-3 py-1 text-sm font-medium">{roleLabel || "Not signed in"}</span>
        {onLogout ? (
          <button onClick={onLogout} className="rounded-lg bg-white px-3 py-1 text-sm font-medium text-blue-900">
            Logout
          </button>
        ) : null}
      </div>
    </header>
  );
}
