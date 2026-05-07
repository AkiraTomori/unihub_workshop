import { useEffect, useState } from "react";
import { api } from "../../services/api";

export function useAuthSession(navigate) {
  const [authUser, setAuthUser] = useState(null);
  const [token, setToken] = useState("");
  const [sessionMessage, setSessionMessage] = useState("Please sign in.");
  const [isSubmittingAuth, setIsSubmittingAuth] = useState(false);
  const [isHydratingSession, setIsHydratingSession] = useState(true);

  const role = authUser?.role || "";

  function persistToken(nextToken) {
    try {
      if (nextToken) localStorage.setItem("unihub.auth.token", nextToken);
      else localStorage.removeItem("unihub.auth.token");
    } catch {
      // Ignore storage failures.
    }
  }

  useEffect(() => {
    let mounted = true;

    async function hydrateSession() {
      try {
        const refreshedToken = await api.refreshToken();
        if (!refreshedToken) return;
        const user = await api.getProfile(refreshedToken);
        if (!mounted || !user) return;
        setToken(refreshedToken);
        persistToken(refreshedToken);
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

  async function handleLogin(email, password) {
    try {
      setIsSubmittingAuth(true);
      const auth = await api.login(email, password);
      if (!auth?.token || !auth?.user) {
        throw new Error("Invalid login response from server");
      }
      setToken(auth.token);
      persistToken(auth.token);
      setAuthUser(auth.user);
      setSessionMessage(`Signed in as ${auth.user.fullName} (${auth.user.role})`);
      if (auth.user.role === "ADMIN") navigate("/admin/workshops");
      else if (auth.user.role === "CHECKER") {
        setSessionMessage("Checker role is mobile-only. Please use the mobile app for check-in operations.");
        navigate("/mobile-only");
      } else navigate("/student/workshops");
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
      persistToken(auth.token);
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
      persistToken("");
      setAuthUser(null);
      setSessionMessage("Please sign in.");
      navigate("/login");
    }
  }

  return {
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
  };
}
