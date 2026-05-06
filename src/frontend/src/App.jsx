import { useEffect, useState } from "react";
import { Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import AppHeader from "./components/AppHeader";
import AuthPanel from "./components/AuthPanel";
import { FullScreenLoader } from "./components/ui";
import AdminPage from "./pages/AdminPage";
import NotFoundPage from "./pages/NotFoundPage";
import StudentPage from "./pages/StudentPage";
import { api } from "./services/api";
import { initialWorkshops } from "./data/workshops";

function mapWorkshop(record) {
  return {
    id: record.id,
    title: record.title,
    speaker: record.speaker,
    room: record.room,
    date: record.date_text,
    seatsLeft: record.seats_left,
    totalSeats: record.total_seats,
    fee: record.fee,
    status: record.status,
    summaryStatus: record.summary_status,
    summary: record.summary
  };
}

export default function App() {
  const [authUser, setAuthUser] = useState(null);
  const [token, setToken] = useState("");
  const [workshops, setWorkshops] = useState([]);
  const [myRegistrations, setMyRegistrations] = useState([]);
  const [myNotifications, setMyNotifications] = useState([]);
  const [sessionMessage, setSessionMessage] = useState("Please sign in.");
  const [isSubmittingAuth, setIsSubmittingAuth] = useState(false);
  const [reloadFlag, setReloadFlag] = useState(0);
  const [workshopPage, setWorkshopPage] = useState(1);
  const [workshopPageSize] = useState(10);
  const [workshopPagination, setWorkshopPagination] = useState(null);
  const [isHydratingSession, setIsHydratingSession] = useState(true);
  const [isLoadingBackendData, setIsLoadingBackendData] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const role = authUser?.role || "";

  useEffect(() => {
    let mounted = true;

    async function hydrateSession() {
      try {
        const refreshedToken = await api.refreshToken();
        if (!refreshedToken) return;
        const user = await api.getProfile(refreshedToken);
        if (!mounted || !user) return;
        setToken(refreshedToken);
        setAuthUser(user);
        setSessionMessage(`Signed in as ${user.fullName} (${user.role})`);
      } catch {
        // No existing authenticated session in cookie.
      } finally {
        if (mounted) setIsHydratingSession(false);
      }
    }

    hydrateSession();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!token) return;
    let mounted = true;
    async function loadWorkshops() {
      if (mounted) setIsLoadingBackendData(true);
      try {
        const workshopResult = await api.getWorkshops(token, { page: workshopPage, pageSize: workshopPageSize });
        if (!mounted) return;
        const items = Array.isArray(workshopResult) ? workshopResult : workshopResult.data;
        setWorkshops((items || []).map(mapWorkshop));
        if (!Array.isArray(workshopResult) && workshopResult.pagination) {
          setWorkshopPagination(workshopResult.pagination);
        } else {
          setWorkshopPagination(null);
        }
        if (role === "STUDENT") {
          const [registrations, notifications] = await Promise.all([
            api.getMyRegistrations(token),
            api.getMyNotifications(token)
          ]);
          if (!mounted) return;
          setMyRegistrations(Array.isArray(registrations) ? registrations : registrations?.data || []);
          setMyNotifications(Array.isArray(notifications) ? notifications : notifications?.data || []);
        } else {
          setMyRegistrations([]);
          setMyNotifications([]);
        }
      } catch (error) {
        if (!mounted) return;
        setWorkshops(initialWorkshops);
        setSessionMessage(error.message || "Could not load workshop data.");
      } finally {
        if (mounted) setIsLoadingBackendData(false);
      }
    }
    loadWorkshops();
    return () => {
      mounted = false;
    };
  }, [token, reloadFlag, workshopPage, workshopPageSize]);

  function reloadWorkshops() {
    setReloadFlag((v) => v + 1);
  }

  function goToWorkshopPage(page) {
    setWorkshopPage(page);
  }

  async function handleLogin(email, password) {
    try {
      setIsSubmittingAuth(true);
      const auth = await api.login(email, password);
      if (!auth?.token || !auth?.user) {
        throw new Error("Invalid login response from server");
      }
      setToken(auth.token);
      setAuthUser(auth.user);
      setSessionMessage(`Signed in as ${auth.user.fullName} (${auth.user.role})`);
      if (auth.user.role === "ADMIN") navigate("/admin/workshops");
      else if (auth.user.role === "CHECKER") {
        setSessionMessage("Checker role is mobile-only. Please use the mobile app for check-in operations.");
        navigate("/mobile-only");
      }
      else navigate("/student/workshops");
    } catch (error) {
      setSessionMessage(error.message);
    } finally {
      setIsSubmittingAuth(false);
    }
  }

  async function handleRegister({ fullName, studentCode, email, password }) {
    try {
      setIsSubmittingAuth(true);
      await api.register({ fullName, studentCode, email, password });
      const auth = await api.login(email, password);
      if (!auth?.token || !auth?.user) {
        throw new Error("Registration succeeded but auto login failed");
      }
      setToken(auth.token);
      setAuthUser(auth.user);
      setSessionMessage(`Welcome ${auth.user.fullName}! Your account is ready.`);
      navigate("/student/workshops");
    } catch (error) {
      setSessionMessage(error.message || "Registration failed");
    } finally {
      setIsSubmittingAuth(false);
    }
  }

  async function handleLogout() {
    try {
      if (token) await api.logout(token);
    } catch {
      // Continue local logout even if API call fails.
    } finally {
      setToken("");
      setAuthUser(null);
      setWorkshops([]);
      setMyRegistrations([]);
      setMyNotifications([]);
      setSessionMessage("Please sign in.");
      navigate("/login");
    }
  }

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
