import axios from "axios";

const BASE = process.env.REACT_APP_API_URL || "http://localhost:5000/api";

const api = axios.create({ baseURL: BASE });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("hireiq_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem("hireiq_token");
      localStorage.removeItem("hireiq_user");
      window.location.href = "/login";
    }
    return Promise.reject(err);
  }
);

// ── AUTH ─────────────────────────────────────────────────────
export const authAPI = {
  login:    (data) => api.post("/auth/login",    data),
  register: (data) => api.post("/auth/register", data),
  getMe: () => api.get("/auth/me"),


};

// ── USER ─────────────────────────────────────────────────────
export const userAPI = {
  getProfile:    ()     => api.get("/user/profile"),
  updateProfile: (data) => api.put("/user/profile", data),
  applyToHR:     ()     => api.post("/user/apply"),
  runAts:        (data) => api.post("/user/ats",   data),
  runVideo:      (data) => api.post("/user/video", data),
};

// ── RESUME ───────────────────────────────────────────────────
export const resumeAPI = {
  upload: (formData) =>
    api.post("/resume/upload", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    }),
  analyze:      (data) => api.post("/resume/analyze", data),
  getMyResumes: ()     => api.get("/resume/my"),
  getOne:       (id)   => api.get(`/resume/${id}`),
  getText:      (id)   => api.get(`/resume/${id}/text`),
  delete:       (id)   => api.delete(`/resume/${id}`),
  remove:       (id)   => api.delete(`/resume/${id}`),
  getAll:       ()     => api.get("/resume/my"),
  coverLetter:  (data) => api.post("/resume/cover-letter", data),
  analyzeVideo: (formData) => api.post("/resume/video-analyze", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  }),
  score:        (id, data) => api.post(`/resume/${id}/score`, data),
};

// ── JOBS ─────────────────────────────────────────────────────
export const jobsAPI = {
  getAll:         (params)     => api.get("/jobs",             { params }),
  getOne:         (id)         => api.get(`/jobs/${id}`),
  apply:          (id, data)   => api.post(`/jobs/${id}/apply`, data),
  withdraw:       (id)         => api.delete(`/jobs/${id}/apply`),
  myApplications: ()           => api.get("/jobs/my-applications"),
  // Admin job management
  create:         (data)       => api.post("/jobs",            data),
  update:         (id, data)   => api.put(`/jobs/${id}`,       data),
  remove:         (id)         => api.delete(`/jobs/${id}`),
  getApplicants:  (id)         => api.get(`/jobs/${id}/applicants`),
};

// ── ADMIN ────────────────────────────────────────────────────
export const adminAPI = {
  getCandidates:     (params)     => api.get("/admin/candidates",                { params }),
  getCandidate:      (id)         => api.get(`/admin/candidates/${id}`),
  addCandidate:      (data)       => api.post("/admin/candidates",               data),
  updateStatus:      (id, data)   => api.put(`/admin/candidates/${id}/status`,  data),
  flagForSuperAdmin: (id, data)   => api.post(`/admin/candidates/${id}/flag`,   data),
  flagRemove:        (id, data)   => api.post(`/admin/candidates/${id}/remove`, data),
  restore:           (id)         => api.post(`/admin/candidates/${id}/restore`),
  removeCandidate:   (id)         => api.delete(`/admin/candidates/${id}`),
  resendEmail:       (id)         => api.post(`/admin/candidates/${id}/resend-email`),
  getAnalytics:      ()           => api.get("/admin/analytics"),
  getRankings:       ()           => api.get("/admin/candidates/rankings"),

  exportCSV: () =>
    api.get("/admin/candidates/export", { responseType: "blob" }).then((res) => {
      const url  = window.URL.createObjectURL(
        new Blob([res.data], { type: "text/csv;charset=utf-8;" })
      );
      const link = document.createElement("a");
      link.href  = url;
      link.setAttribute("download", `candidates_${Date.now()}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    }),
};

// ── SUPER ADMIN ───────────────────────────────────────────────────────────────
export const superAdminAPI = {
  getUsers:        (params)   => api.get("/superadmin/users",           { params }),
  getUser:         (id)       => api.get(`/superadmin/users/${id}`),
  banUser:         (id, data) => api.put(`/superadmin/users/${id}/ban`,      data),
  flagAndBan:      (id, data) => api.put(`/superadmin/users/${id}/flag-ban`, data),
  restoreUser:     (id)       => api.put(`/superadmin/users/${id}/restore`),
  getAdmins:       ()         => api.get("/superadmin/admins"),
  createAdmin:     (data)     => api.post("/superadmin/admins",          data),
  removeAdmin:     (id)       => api.delete(`/superadmin/admins/${id}`),
  getApplications: (params)   => api.get("/superadmin/applications",    { params }),
  getAnalytics:    ()         => api.get("/superadmin/analytics"),
  getFraudReport:  ()         => api.get("/superadmin/fraud-report"),
  getAlerts:       ()         => api.get("/superadmin/alerts"),
  markAlertRead:   (id)       => api.put(`/superadmin/alerts/${id}/read`),
};

// ── INTERVIEW ─────────────────────────────────────────────────────────────────
export const interviewAPI = {
  schedule:            (data)       => api.post("/interview",               data),
  getAll:              (params)     => api.get("/interview",                 { params }),
  getForCandidate:     (id)         => api.get(`/interview/candidate/${id}`),
  update:              (id, data)   => api.put(`/interview/${id}`,           data),
  recordOutcome:       (id, data)   => api.post(`/interview/${id}/outcome`,  data),
  getMy:               ()           => api.get("/interview/my"),
};

export default api;