import { useCallback, useEffect, useState } from "react";
import { Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import AppHeader from "./components/AppHeader";
import AuthPanel from "./components/AuthPanel";
import { FullScreenLoader, ToastContainer } from "./components/ui";
import AdminPage from "./pages/admin/AdminPage";
import AdminWorkshopCreatePage from "./pages/admin/AdminWorkshopCreatePage";
import AdminWorkshopEditPage from "./pages/admin/AdminWorkshopEditPage";
import AdminWorkshopParticipantsPage from "./pages/admin/AdminWorkshopParticipantsPage";
import AdminDeletedWorkshopsPage from "./pages/admin/AdminDeletedWorkshopsPage";
import AdminNotificationsPage from "./pages/admin/AdminNotificationsPage";
import AdminFailedNotificationsPage from "./pages/admin/AdminFailedNotificationsPage";
import AdminRoomsPage from "./pages/admin/AdminRoomsPage";
import NotFoundPage from "./pages/NotFoundPage";
import StudentPage from "./pages/student/StudentPage";
import StudentNotificationsPage from "./pages/student/StudentNotificationsPage";
import StudentPaymentsPage from "./pages/student/StudentPaymentsPage";
import StudentCheckinsPage from "./pages/student/StudentCheckinsPage";
import StudentRegistrationsPage from "./pages/student/StudentRegistrationsPage";
import WorkshopDetailPage from "./pages/WorkshopDetailPage";
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
    authErrorType,
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
    workshopError,
    hasLoadedWorkshops,
    reloadWorkshops,
    goToWorkshopPage
  } = useWorkshopData({ token, role, setSessionMessage });
  const [toasts, setToasts] = useState([]);

  const pushToast = useCallback((message, type = "info") => {
    const id = `${Date.now()}-${Math.random()}`;
    setToasts((prev) => [...prev, { id, message, type }]);
    return id;
  }, []);

  const dismissToast = useCallback((id) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  useEffect(() => {
    if (!toasts.length) return undefined;
    const latest = toasts[toasts.length - 1];
    const timer = setTimeout(() => dismissToast(latest.id), 2800);
    return () => clearTimeout(timer);
  }, [toasts, dismissToast]);

  const roleLabelMap = { STUDENT: "Student", ADMIN: "Admin", CHECKER: "Checker" };
  const roleLabel = roleLabelMap[role] || "";

  const showAuthPanel = !isHydratingSession && location.pathname === "/login";
  const showGlobalLoader = isHydratingSession || isSubmittingAuth;
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
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
      <AppHeader role={role} roleLabel={roleLabel} fullName={authUser?.fullName} onLogout={token ? handleLogout : null} />
      {showAuthPanel ? (
        <AuthPanel
          onLogin={handleLogin}
          onRegister={handleRegister}
          loading={isSubmittingAuth}
          isAuthenticated={Boolean(token)}
          authErrorType={authErrorType}
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
              loadError={workshopError}
              hasLoaded={hasLoadedWorkshops}
              onToast={pushToast}
            />
          )}
        />
        <Route
          path="/student/workshops/:workshopId"
          element={protectedGuard(
            "STUDENT",
            <WorkshopDetailPage
              token={token}
              myRegistrations={myRegistrations}
              onWorkshopsChanged={reloadWorkshops}
              onToast={pushToast}
            />
          )}
        />
        <Route
          path="/student/registrations"
          element={protectedGuard(
            "STUDENT",
            <StudentRegistrationsPage token={token} registrations={myRegistrations} onToast={pushToast} />
          )}
        />
        <Route
          path="/student/notifications"
          element={protectedGuard(
            "STUDENT",
            <StudentNotificationsPage token={token} onToast={pushToast} />
          )}
        />
        <Route
          path="/student/payments"
          element={protectedGuard(
            "STUDENT",
            <StudentPaymentsPage token={token} onToast={pushToast} />
          )}
        />
        <Route
          path="/student/checkins"
          element={protectedGuard(
            "STUDENT",
            <StudentCheckinsPage token={token} onToast={pushToast} />
          )}
        />
        <Route
          path="/admin/workshops"
          element={protectedGuard(
            "ADMIN",
            <AdminPage
              workshops={workshops}
              token={token}
              pagination={workshopPagination}
              onPageChange={goToWorkshopPage}
              onWorkshopsChanged={reloadWorkshops}
              loading={isLoadingBackendData}
              loadError={workshopError}
              hasLoaded={hasLoadedWorkshops}
              onToast={pushToast}
            />
          )}
        />
        <Route
          path="/admin/workshops/create"
          element={protectedGuard(
            "ADMIN",
            <AdminWorkshopCreatePage token={token} onToast={pushToast} onWorkshopsChanged={reloadWorkshops} />
          )}
        />
        <Route
          path="/admin/workshops/deleted"
          element={protectedGuard(
            "ADMIN",
            <AdminDeletedWorkshopsPage token={token} onToast={pushToast} onWorkshopsChanged={reloadWorkshops} />
          )}
        />
        <Route
          path="/admin/workshops/:id/edit"
          element={protectedGuard(
            "ADMIN",
            <AdminWorkshopEditPage token={token} onToast={pushToast} onWorkshopsChanged={reloadWorkshops} />
          )}
        />
        <Route
          path="/admin/workshops/:workshopId/participants"
          element={protectedGuard(
            "ADMIN",
            <AdminWorkshopParticipantsPage token={token} onToast={pushToast} />
          )}
        />
        <Route
          path="/admin/notifications"
          element={protectedGuard(
            "ADMIN",
            <AdminNotificationsPage token={token} onToast={pushToast} />
          )}
        />
        <Route
          path="/admin/notifications/failed"
          element={protectedGuard(
            "ADMIN",
            <AdminFailedNotificationsPage token={token} onToast={pushToast} />
          )}
        />
        <Route
          path="/admin/rooms"
          element={protectedGuard(
            "ADMIN",
            <AdminRoomsPage token={token} onToast={pushToast} />
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
