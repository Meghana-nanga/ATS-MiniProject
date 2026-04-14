/* eslint-disable */
import React, { createContext, useContext, useState, useEffect } from "react";
import { authAPI } from "../utils/api";

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [user,    setUser]    = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token  = localStorage.getItem("hireiq_token");
    const stored = localStorage.getItem("hireiq_user");
    if (token && stored) {
      try { setUser(JSON.parse(stored)); } catch {}
      authAPI.getMe()
        .then(({ data }) => {
          setUser(data.user);
          localStorage.setItem("hireiq_user", JSON.stringify(data.user));
        })
        .catch(() => {
          localStorage.removeItem("hireiq_token");
          localStorage.removeItem("hireiq_user");
          setUser(null);
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (email, password) => {
    const { data } = await authAPI.login({ email, password });
    localStorage.setItem("hireiq_token", data.token);
    localStorage.setItem("hireiq_user",  JSON.stringify(data.user));
    setUser(data.user);
    return data.user;
  };

  const register = async form => {
    const { data } = await authAPI.register(form);
    localStorage.setItem("hireiq_token", data.token);
    localStorage.setItem("hireiq_user",  JSON.stringify(data.user));
    setUser(data.user);
    return data.user;
  };

  const logout = () => {
    localStorage.removeItem("hireiq_token");
    localStorage.removeItem("hireiq_user");
    setUser(null);
  };

  const refreshUser = async () => {
    try {
      const { data } = await authAPI.getMe();
      setUser(data.user);
      localStorage.setItem("hireiq_user", JSON.stringify(data.user));
      return data.user;
    } catch {}
  };

  const updateUser = updated => {
    const merged = { ...user, ...updated };
    localStorage.setItem("hireiq_user", JSON.stringify(merged));
    setUser(merged);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, updateUser, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}