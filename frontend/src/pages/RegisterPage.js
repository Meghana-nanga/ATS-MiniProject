import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function RegisterPage() {
  const [form, setForm]       = useState({ name:"", email:"", password:"", targetRole:"" });
  const [error, setError]     = useState("");
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const nav = useNavigate();

  const handle = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const submit = async e => {
    e.preventDefault();
    if (form.password.length < 6) return setError("Password must be at least 6 characters");
    setError(""); setLoading(true);
    try { await register(form); nav("/dashboard"); }
    catch (err) { setError(err.response?.data?.message || "Registration failed."); }
    finally { setLoading(false); }
  };

  return (
    <div className="auth-page">
      <div className="auth-card fade-in">
        <div className="auth-logo">
          <div style={{width:9,height:9,borderRadius:"50%",background:"var(--blue)"}}></div>
          HireIQ
        </div>
        <h2 className="auth-title">Create your account</h2>
        <p className="auth-sub">Start optimizing your resume for free</p>
        {error && <div className="auth-error">{error}</div>}
        <form onSubmit={submit}>
          <div className="form-group">
            <label className="form-label">Full name</label>
            <input className="form-input" name="name" placeholder="Arjun Kumar" value={form.name} onChange={handle} required/>
          </div>
          <div className="form-group">
            <label className="form-label">Email address</label>
            <input className="form-input" name="email" type="email" placeholder="you@example.com" value={form.email} onChange={handle} required/>
          </div>
          <div className="form-group">
            <label className="form-label">Password</label>
            <input className="form-input" name="password" type="password" placeholder="Min 6 characters" value={form.password} onChange={handle} required/>
          </div>
          <div className="form-group">
            <label className="form-label">Target role (optional)</label>
            <select className="form-select" name="targetRole" value={form.targetRole} onChange={handle}>
              <option value="">Select a role...</option>
              <option>Frontend Engineer</option>
              <option>Backend Engineer</option>
              <option>Full Stack Engineer</option>
              <option>Data Scientist</option>
              <option>DevOps Engineer</option>
              <option>Product Manager</option>
              <option>UI/UX Designer</option>
            </select>
          </div>
          <button className="btn btn-primary" style={{width:"100%",padding:"12px",fontSize:15,marginTop:4}} disabled={loading}>
            {loading ? "Creating account..." : "Create account →"}
          </button>
        </form>
        <div className="auth-footer">
          Already have an account? <Link to="/login" style={{color:"var(--blue)",fontWeight:600}}>Sign in</Link>
        </div>
      </div>
    </div>
  );
}