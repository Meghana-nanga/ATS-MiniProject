/* eslint-disable */
import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import LandingPage       from "./pages/LandingPage";
import LoginPage         from "./pages/LoginPage";
import RegisterPage      from "./pages/RegisterPage";
import UserDashboard     from "./pages/UserDashboard";
import AdminDashboard    from "./pages/AdminDashboard";
import SuperAdminDashboard from "./pages/SuperAdminDashboard";
import JobsPage          from "./pages/JobsPage";
import "./styles/global.css";

function PrivateRoute({ children, roles = [] }) {
  const { user, loading } = useAuth();
  if (loading) return (
    <div style={{height:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:"#F4F3EF"}}>
      <div className="spinner"></div>
    </div>
  );
  if (!user) return <Navigate to="/login" replace />;
  if (roles.length > 0 && !roles.includes(user.role))
    return <Navigate to={user.role==="superadmin"?"/superadmin":user.role==="admin"?"/admin":"/dashboard"} replace />;
  return children;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/"           element={<LandingPage />} />
          <Route path="/login"      element={<LoginPage />} />
          <Route path="/register"   element={<RegisterPage />} />
          <Route path="/dashboard"  element={<PrivateRoute roles={["user"]}><UserDashboard /></PrivateRoute>} />
          <Route path="/jobs"       element={<PrivateRoute roles={["user"]}><JobsPage /></PrivateRoute>} />
          <Route path="/admin"      element={<PrivateRoute roles={["admin"]}><AdminDashboard /></PrivateRoute>} />
          <Route path="/superadmin" element={<PrivateRoute roles={["superadmin"]}><SuperAdminDashboard /></PrivateRoute>} />
          <Route path="*"           element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}