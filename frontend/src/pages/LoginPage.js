/* eslint-disable */
import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function LoginPage() {
  const [form, setForm]       = useState({ email:"", password:"" });
  const [error, setError]     = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const nav = useNavigate();

  const handle = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const submit = async e => {
    e.preventDefault();
    setError(""); setLoading(true);
    try {
      const user = await login(form.email, form.password);
      nav(user.role === "superadmin" ? "/superadmin" : user.role === "admin" ? "/admin" : "/dashboard");
    } catch (err) {
      setError(err.response?.data?.message || "Invalid email or password. Please try again.");
    } finally { setLoading(false); }
  };

  return (
    <div className="auth-page">
      <div className="auth-card fade-in">
        <div className="auth-logo">
          <div style={{width:9,height:9,borderRadius:"50%",background:"var(--blue)"}}></div>
          HireIQ
        </div>
        <h2 className="auth-title">Welcome back</h2>
        <p className="auth-sub">Sign in to your account to continue</p>
        {error && <div className="auth-error">{error}</div>}
        <form onSubmit={submit}>
          <div className="form-group">
            <label className="form-label">Email address</label>
            <input className="form-input" name="email" type="email"
              placeholder="you@example.com" value={form.email} onChange={handle} required/>
          </div>
          <div className="form-group">
            <label className="form-label">Password</label>
            <input className="form-input" name="password" type="password"
              placeholder="Your password" value={form.password} onChange={handle} required/>
          </div>
          <button className="btn btn-primary"
            style={{width:"100%",padding:"12px",fontSize:15,marginTop:4}} disabled={loading}>
            {loading ? "Signing in..." : "Sign in →"}
          </button>
        </form>
        <div style={{textAlign:"center",marginTop:16}}>
          <span style={{fontSize:13,color:"var(--muted)"}}>Forgot your password? </span>
          <button className="btn btn-ghost btn-sm" onClick={()=>nav("/forgot-password")}
            style={{fontSize:13,color:"var(--blue)",padding:"0 4px"}}>
            Reset it here
          </button>
        </div>
        <div className="auth-footer">
          No account? <Link to="/register" style={{color:"var(--blue)",fontWeight:600}}>Sign up free</Link>
        </div>
      </div>
    </div>
  );
}