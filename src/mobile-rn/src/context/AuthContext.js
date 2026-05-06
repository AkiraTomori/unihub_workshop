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
        setToken(session.token);
        setUser(session.user);
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
      async logout() {
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
