const KEYS = {
  USERS: 'aim_users',
  CURRENT_USER: 'aim_current_user',
  SESSIONS: 'aim_sessions',
  REPORTS: 'aim_reports',
};

function get(key) {
  try { return JSON.parse(localStorage.getItem(key)); } catch { return null; }
}
function set(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

export const storageService = {
  // ── Users ──────────────────────────────────────────────────
  getUsers: () => get(KEYS.USERS) || [],
  getUserByEmail: (email) => (get(KEYS.USERS) || []).find(u => u.email === email) || null,

  saveUser: (user) => {
    const users = get(KEYS.USERS) || [];
    users.push(user);
    set(KEYS.USERS, users);
  },

  // ── Current session user ───────────────────────────────────
  getUser: () => get(KEYS.CURRENT_USER),
  setCurrentUser: (user) => set(KEYS.CURRENT_USER, user),
  clearCurrentUser: () => localStorage.removeItem(KEYS.CURRENT_USER),

  // ── Interview Sessions ─────────────────────────────────────
  getSessions: (userId) =>
    (get(KEYS.SESSIONS) || []).filter(s => s.userId === userId),

  getSession: (id) =>
    (get(KEYS.SESSIONS) || []).find(s => s.id === id) || null,

  saveSession: (session) => {
    const sessions = get(KEYS.SESSIONS) || [];
    const idx = sessions.findIndex(s => s.id === session.id);
    if (idx >= 0) sessions[idx] = session;
    else sessions.push(session);
    set(KEYS.SESSIONS, sessions);
  },

  // ── Reports ────────────────────────────────────────────────
  getReports: (userId) =>
    (get(KEYS.REPORTS) || []).filter(r => r.userId === userId),

  getReport: (sessionId) =>
    (get(KEYS.REPORTS) || []).find(r => r.sessionId === sessionId) || null,

  saveReport: (report) => {
    const reports = get(KEYS.REPORTS) || [];
    const idx = reports.findIndex(r => r.sessionId === report.sessionId);
    if (idx >= 0) reports[idx] = report;
    else reports.push(report);
    set(KEYS.REPORTS, reports);
  },
};
