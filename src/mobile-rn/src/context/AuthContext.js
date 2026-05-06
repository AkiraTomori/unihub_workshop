import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { api, loadJson, removeKey, saveJson, storageKeys } from "../api/client";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState("");
  const [user, setUser] = useState(null);
  const [hydrating, setHydrating] = useState(true);

  useEffect(() => {
    (async () => {
      const session = await loadJson(storageKeys.authSession);
      if (session?.token) {
        try {
          const profile = await api.getProfile(session.token);
          const next = { token: session.token, user: profile };
          setToken(next.token);
          setUser(next.user);
          await saveJson(storageKeys.authSession, next);
        } catch {
          await removeKey(storageKeys.authSession);
        }
      }
      setHydrating(false);
    })();
  }, []);

  const value = useMemo(
    () => ({
      token,
      user,
      hydrating,
      async login(email, password) {
        const result = await api.login(email, password);
        const next = { token: result.token, user: result.user };
        setToken(next.token);
        setUser(next.user);
        await saveJson(storageKeys.authSession, next);
        return result;
      },
      async register({ email, password, fullName, studentCode }) {
        return api.register({ email, password, fullName, studentCode });
      },
      async logout() {
        try {
          if (token) await api.logout(token);
        } catch {
          // Keep local logout even if server logout fails
        }
        setToken("");
        setUser(null);
        await removeKey(storageKeys.authSession);
      }
    }),
    [token, user, hydrating]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
