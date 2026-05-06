import { Link } from "react-router-dom";
import { Card } from "../components/ui";

export default function NotFoundPage({ isAuthenticated, role }) {
  const defaultPath = !isAuthenticated
    ? "/login"
    : role === "ADMIN"
    ? "/admin/workshops"
    : role === "CHECKER"
    ? "/mobile-only"
    : "/student/workshops";

  return (
    <Card className="mx-auto mt-8 max-w-xl text-center">
      <p className="text-sm font-semibold text-blue-700">404</p>
      <h2 className="mt-1 text-2xl font-bold text-blue-950">Page not found</h2>
      <p className="mt-2 text-sm text-blue-800">
        The page you are looking for does not exist or has been moved.
      </p>
      <div className="mt-5">
        <Link
          to={defaultPath}
          className="inline-flex items-center rounded-lg bg-blue-900 px-4 py-2 text-sm font-medium text-white hover:bg-blue-800"
        >
          Back to main page
        </Link>
      </div>
    </Card>
  );
}
