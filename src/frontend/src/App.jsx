import { Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import AppHeader from "./components/AppHeader";
import AuthPanel from "./components/AuthPanel";
import { FullScreenLoader } from "./components/ui";
import AdminPage from "./pages/AdminPage";
import NotFoundPage from "./pages/NotFoundPage";
import StudentPage from "./pages/StudentPage";
import { useAuthSession } from "./features/auth/useAuthSession";
import { useWorkshopData } from "./features/workshops/useWorkshopData";

export default function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const {
    authUser,
    token,
    role,
    sessionMessage,
    setSessionMessage,
    isSubmittingAuth,
    isHydratingSession,
    handleLogin,
    handleRegister,
    handleLogout
  } = useAuthSession(navigate);
  const {
    workshops,
    myRegistrations,
    myNotifications,
    workshopPagination,
    isLoadingBackendData,
    reloadWorkshops,
    goToWorkshopPage
  } = useWorkshopData({ token, role, setSessionMessage });

  const roleLabelMap = { STUDENT: "Student", ADMIN: "Admin", CHECKER: "Checker" };
  const roleLabel = roleLabelMap[role] || "";

  const showAuthPanel = !isHydratingSession && location.pathname === "/login";
  const showGlobalLoader = isHydratingSession || isSubmittingAuth || isLoadingBackendData;
  const loaderLabel = isHydratingSession
    ? "Restoring session..."
    : isSubmittingAuth
    ? "Authenticating..."
    : "Loading data...";
  const protectedGuard = (allowedRole, element) => {
    if (!token) return <Navigate to="/login" replace />;
    if (role !== allowedRole) {
      if (role === "ADMIN") return <Navigate to="/admin/workshops" replace />;
      if (role === "CHECKER") return <Navigate to="/mobile-only" replace />;
      return <Navigate to="/student/workshops" replace />;
    }
    return element;
  };

  return (
    <main className="mx-auto min-h-screen max-w-7xl p-4">
      <FullScreenLoader show={showGlobalLoader} label={loaderLabel} />
      <AppHeader role={role} roleLabel={roleLabel} fullName={authUser?.fullName} onLogout={token ? handleLogout : null} />
      {showAuthPanel ? (
        <AuthPanel
          sessionMessage={sessionMessage}
          onLogin={handleLogin}
          onRegister={handleRegister}
          loading={isSubmittingAuth}
          isAuthenticated={Boolean(token)}
        />
      ) : null}
      <Routes>
        <Route path="/login" element={isHydratingSession ? null : token ? <Navigate to="/" replace /> : null} />
        <Route
          path="/student/workshops"
          element={protectedGuard(
            "STUDENT",
            <StudentPage
              workshops={workshops}
              token={token}
              myRegistrations={myRegistrations}
              notifications={myNotifications}
              pagination={workshopPagination}
              onPageChange={goToWorkshopPage}
              onWorkshopsChanged={reloadWorkshops}
              loading={isLoadingBackendData}
            />
          )}
        />
        <Route
          path="/admin/workshops"
          element={protectedGuard(
            "ADMIN",
            <AdminPage
              workshops={workshops}
              token={token}
              onWorkshopsChanged={reloadWorkshops}
              loading={isLoadingBackendData}
            />
          )}
        />
        <Route
          path="/mobile-only"
          element={
            !token ? (
              <Navigate to="/login" replace />
            ) : role === "CHECKER" ? (
              <div className="rounded-xl border border-blue-200 bg-white/95 p-6 text-blue-900 shadow-sm">
                <h2 className="text-xl font-bold">Checker is Mobile Only</h2>
                <p className="mt-2 text-sm text-blue-800">
                  The checker feature is intentionally not available on the website. Please sign in on the mobile app to scan QR and sync offline check-ins.
                </p>
              </div>
            ) : (
              <Navigate to="/" replace />
            )
          }
        />
        <Route
          path="/"
          element={
            !token ? (
              <Navigate to="/login" replace />
            ) : role === "ADMIN" ? (
              <Navigate to="/admin/workshops" replace />
            ) : role === "CHECKER" ? (
              <Navigate to="/mobile-only" replace />
            ) : (
              <Navigate to="/student/workshops" replace />
            )
          }
        />
        <Route path="*" element={<NotFoundPage isAuthenticated={Boolean(token)} role={role} />} />
      </Routes>
    </main>
  );
}
