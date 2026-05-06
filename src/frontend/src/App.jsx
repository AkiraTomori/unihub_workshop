import { useEffect, useState } from "react";
import { Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import AppHeader from "./components/AppHeader";
import AuthPanel from "./components/AuthPanel";
import AdminPage from "./pages/AdminPage";
import StudentPage from "./pages/StudentPage";
import { api } from "./services/api";

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
  const [sessionMessage, setSessionMessage] = useState("Please sign in.");
  const [isSubmittingLogin, setIsSubmittingLogin] = useState(false);
  const [reloadFlag, setReloadFlag] = useState(0);
  const [workshopPage, setWorkshopPage] = useState(1);
  const [workshopPageSize] = useState(10);
  const [workshopPagination, setWorkshopPagination] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!token) return;
    let mounted = true;
    async function loadWorkshops() {
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
          const registrations = await api.getMyRegistrations(token);
          if (!mounted) return;
          setMyRegistrations(registrations);
        } else {
          setMyRegistrations([]);
        }
      } catch (error) {
        if (!mounted) return;
        setSessionMessage(error.message);
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
      setIsSubmittingLogin(true);
      const auth = await api.login(email, password);
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
      setIsSubmittingLogin(false);
    }
  }

  function handleLogout() {
    setToken("");
    setAuthUser(null);
    setWorkshops([]);
    setSessionMessage("Please sign in.");
    navigate("/login");
  }

  const role = authUser?.role || "";
  const roleLabelMap = { STUDENT: "Student", ADMIN: "Admin", CHECKER: "Checker" };
  const roleLabel = roleLabelMap[role] || "";

  const showAuthPanel = !token || location.pathname === "/login";
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
      <AppHeader role={role} roleLabel={roleLabel} fullName={authUser?.fullName} onLogout={token ? handleLogout : null} />
      {showAuthPanel ? (
        <AuthPanel
          sessionMessage={sessionMessage}
          onLogin={handleLogin}
          loading={isSubmittingLogin}
          isAuthenticated={Boolean(token)}
        />
      ) : null}
      <Routes>
        <Route path="/login" element={token ? <Navigate to="/" replace /> : null} />
        <Route
          path="/student/workshops"
          element={protectedGuard(
            "STUDENT",
            <StudentPage
              workshops={workshops}
              token={token}
              myRegistrations={myRegistrations}
              pagination={workshopPagination}
              onPageChange={goToWorkshopPage}
              onWorkshopsChanged={reloadWorkshops}
            />
          )}
        />
        <Route
          path="/admin/workshops"
          element={protectedGuard("ADMIN", <AdminPage workshops={workshops} token={token} onWorkshopsChanged={reloadWorkshops} />)}
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
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </main>
  );
}
