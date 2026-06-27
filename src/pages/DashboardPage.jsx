import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { dbService } from '../services/dbService';
import { storageService } from '../services/storageService';
import { AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer, BarChart, Bar } from 'recharts';

const ROLE_ICONS = {
  'Software Engineer': '💻', 'Product Manager': '📦', 'Data Scientist': '📊',
  'HR Manager': '👥', 'Marketing Manager': '📣',
};

function StatCard({ label, value, sub }) {
  return (
    <div style={{ padding: '24px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--r-md)', display: 'flex', flexDirection: 'column', gap: 8, flex: 1, minWidth: 200, boxShadow: 'var(--shadow-sm)' }}>
      <div style={{ fontSize: 14, color: 'var(--text-2)' }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--text)' }}>{value}</div>
      <div style={{ fontSize: 13, color: 'var(--text-3)' }}>{sub}</div>
    </div>
  );
}

export function Sidebar({ currentPath }) {
  const { logout } = useAuth();
  const navigate = useNavigate();
  return (
    <aside style={{ width: 250, background: 'rgba(0, 21, 41, 0.85)', backdropFilter: 'blur(10px)', color: '#fff', display: 'flex', flexDirection: 'column', flexShrink: 0, height: '100vh', position: 'sticky', top: 0 }}>
      <div style={{ padding: '20px 24px', fontSize: 20, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ width: 32, height: 32, background: '#1890ff', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>🧠</span> InterviewAI
      </div>
      <div style={{ flex: 1, padding: '20px 0', display: 'flex', flexDirection: 'column' }}>
        <Link to="/dashboard" style={{ padding: '12px 24px', background: currentPath === '/dashboard' ? '#1890ff' : 'transparent', color: currentPath === '/dashboard' ? '#fff' : '#a6adb4', fontSize: 14, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 12 }}>
          <span>📊</span> Dashboard
        </Link>
        <Link to="/setup" style={{ padding: '12px 24px', background: currentPath === '/setup' ? '#1890ff' : 'transparent', color: currentPath === '/setup' ? '#fff' : '#a6adb4', fontSize: 14, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 12 }}>
          <span>🚀</span> New Interview
        </Link>
      </div>
      <div style={{ padding: '20px 24px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        <button onClick={() => { logout(); navigate('/'); }} style={{ background: 'transparent', border: 'none', color: '#a6adb4', fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12, padding: 0 }}>
          <span>🚪</span> Sign Out
        </button>
      </div>
    </aside>
  );
}

export function Header() {
  const { user } = useAuth();
  const initials = user?.name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0,2) || 'U';
  return (
    <header style={{ height: 64, background: 'rgba(255, 255, 255, 0.7)', backdropFilter: 'blur(10px)', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', padding: '0 24px', position: 'sticky', top: 0, zIndex: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        {user?.avatar
          ? <img src={user.avatar} alt="avatar" style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover' }} />
          : <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--grad)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: '#fff' }}>{initials}</div>
        }
        <span style={{ fontSize: 14, color: 'var(--text-2)' }}>Hi, <strong style={{ color: 'var(--text)' }}>{user?.name?.split(' ')[0]}</strong></span>
      </div>
    </header>
  );
}

const Tooltip_ = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 'var(--r-md)', padding: '10px 14px', fontSize: 13, boxShadow: 'var(--shadow-sm)' }}>
      <div style={{ color: 'var(--text-2)', marginBottom: 4 }}>{label}</div>
      <div style={{ fontWeight: 700, color: '#1890ff' }}>Score: {payload[0].value}</div>
    </div>
  );
};

export default function DashboardPage() {
  const { user } = useAuth();
  const [sessions, setSessions] = useState([]);
  const [reports, setReports] = useState([]);
  const [loadingData, setLoadingData] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const [s, r] = await Promise.all([
          dbService.getSessions(user.id).catch(() => storageService.getSessions(user.id)),
          dbService.getReports(user.id).catch(() => storageService.getReports(user.id)),
        ]);
        setSessions(s.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
        setReports(r);
      } finally {
        setLoadingData(false);
      }
    })();
  }, [user]);

  const completed = sessions.filter(s => s.status === 'completed');
  const getReport = id => reports.find(r => r.sessionId === id);
  const scores = completed.map(s => getReport(s.id)?.overallScore || 0).filter(Boolean);
  const avgScore = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null;
  const bestScore = scores.length ? Math.max(...scores) : null;

  const chartData = completed.slice(-10).reverse().map(s => ({
    name: new Date(s.createdAt).toLocaleDateString('en', { month: 'short', day: 'numeric' }),
    score: getReport(s.id)?.overallScore || 0,
  }));

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'transparent' }}>
      <Sidebar currentPath="/dashboard" />
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <Header />
        <div style={{ padding: '24px', flex: 1, overflowY: 'auto' }}>
          
          {/* Stats Row */}
          <div style={{ display: 'flex', gap: 24, marginBottom: 24, flexWrap: 'wrap' }}>
            <StatCard label="Total Interviews" value={sessions.length || '0'} sub="Sessions initiated" />
            <StatCard label="Average Score" value={avgScore ?? '—'} sub={avgScore ? 'out of 100' : 'No data yet'} />
            <StatCard label="Best Score" value={bestScore ?? '—'} sub="Personal best" />
            <StatCard label="Roles Practiced" value={[...new Set(sessions.map(s => s.role))].length || '0'} sub="Different roles" />
          </div>

          {/* Chart Row */}
          {chartData.length > 0 && (
            <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 'var(--r-md)', padding: '24px', marginBottom: 24, boxShadow: 'var(--shadow-sm)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
                <h3 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text)' }}>Score Trend</h3>
              </div>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e8e8e8" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'var(--text-3)' }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'var(--text-3)' }} domain={[0, 100]} />
                  <Tooltip content={<Tooltip_ />} cursor={{ fill: '#f0f2f5' }} />
                  <Bar dataKey="score" fill="#1890ff" radius={[4, 4, 0, 0]} maxBarSize={40} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Table Row */}
          <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 'var(--r-md)', boxShadow: 'var(--shadow-sm)', overflow: 'hidden' }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)' }}>
              <h3 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text)' }}>Interview History</h3>
            </div>
            {loadingData ? (
              <div style={{ padding: '40px', textAlign: 'center' }}><span className="spinner" style={{ margin: '0 auto', borderColor: '#1890ff', borderRightColor: 'transparent' }} /></div>
            ) : sessions.length === 0 ? (
              <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-2)' }}>No interviews yet.</div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 14 }}>
                <thead>
                  <tr style={{ background: '#fafafa', borderBottom: '1px solid var(--border)' }}>
                    <th style={{ padding: '16px 24px', fontWeight: 500, color: 'var(--text-2)' }}>Role</th>
                    <th style={{ padding: '16px 24px', fontWeight: 500, color: 'var(--text-2)' }}>Date</th>
                    <th style={{ padding: '16px 24px', fontWeight: 500, color: 'var(--text-2)' }}>Status</th>
                    <th style={{ padding: '16px 24px', fontWeight: 500, color: 'var(--text-2)' }}>Score</th>
                    <th style={{ padding: '16px 24px', fontWeight: 500, color: 'var(--text-2)', textAlign: 'right' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {sessions.map(s => {
                    const report = getReport(s.id);
                    return (
                      <tr key={s.id} style={{ borderBottom: '1px solid var(--border)', cursor: 'pointer', transition: 'background .2s' }} onMouseEnter={e => e.currentTarget.style.background = '#fafafa'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'} onClick={() => report && navigate(`/report/${s.id}`)}>
                        <td style={{ padding: '16px 24px', fontWeight: 500, color: 'var(--text)' }}>{ROLE_ICONS[s.role] || '🎯'} {s.role}</td>
                        <td style={{ padding: '16px 24px', color: 'var(--text-2)' }}>{new Date(s.createdAt).toLocaleDateString()}</td>
                        <td style={{ padding: '16px 24px' }}>
                          {s.status === 'completed' ? <span style={{ padding: '4px 8px', background: '#e6f4ea', color: '#1e8e3e', borderRadius: 4, fontSize: 12, fontWeight: 500 }}>Completed</span> : <span style={{ padding: '4px 8px', background: '#fef7e0', color: '#b06000', borderRadius: 4, fontSize: 12, fontWeight: 500 }}>In Progress</span>}
                        </td>
                        <td style={{ padding: '16px 24px', fontWeight: 600, color: 'var(--text)' }}>{report?.overallScore || '—'}</td>
                        <td style={{ padding: '16px 24px', textAlign: 'right' }}>
                          {report && <Link to={`/report/${s.id}`} style={{ color: '#1890ff', fontSize: 13, fontWeight: 500 }}>View Report</Link>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
