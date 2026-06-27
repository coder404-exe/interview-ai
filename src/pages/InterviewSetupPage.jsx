import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { dbService } from '../services/dbService';
import { storageService } from '../services/storageService';
import toast from 'react-hot-toast';

const ROLES = [
  { id: 'Software Engineer',  icon: '💻', desc: 'DSA · System Design · Architecture', color: '#3b82f6' },
  { id: 'Product Manager',    icon: '📦', desc: 'Roadmap · Metrics · Stakeholders', color: '#06b6d4' },
  { id: 'Data Scientist',     icon: '📊', desc: 'ML · Statistics · Data Pipelines', color: '#10b981' },
  { id: 'HR Manager',         icon: '👥', desc: 'People Ops · Conflict · Talent', color: '#f59e0b' },
  { id: 'Marketing Manager',  icon: '📣', desc: 'Campaigns · Brand · Growth', color: '#f97316' },
  { id: 'Custom',             icon: '✏️', desc: 'Enter your own role below', color: '#8b9cc8' },
];
const DURATIONS = [5, 10, 15, 20];

export default function InterviewSetupPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [role, setRole] = useState('');
  const [customRole, setCustomRole] = useState('');
  const [duration, setDuration] = useState(10);
  const [resumeFile, setResumeFile] = useState(null);
  const [loading, setLoading] = useState(false);

  const effectiveRole = role === 'Custom' ? customRole.trim() : role;
  const selectedRole = ROLES.find(r => r.id === role);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.type !== 'application/pdf') {
      toast.error('Only PDF files are supported.');
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      const base64Data = event.target.result.split(',')[1];
      setResumeFile({
        name: file.name,
        type: file.type,
        data: base64Data
      });
    };
    reader.readAsDataURL(file);
  };

  const handleStart = async () => {
    if (!effectiveRole) { toast.error('Please select or enter a role first.'); return; }
    setLoading(true);
    try {
      const session = {
        id: crypto.randomUUID(),
        userId: user.id,
        role: effectiveRole,
        duration,
        questionCount: 0,
        questions: [],
        resumeFile: resumeFile || null,
        conversational: true,
        conversationHistory: [],
        responses: [],
        speechMetrics: [],
        emotionFrames: [],
        status: 'active',
        createdAt: new Date().toISOString(),
      };
      try {
        await dbService.saveSession(session);
      } catch {
        storageService.saveSession(session);
      }
      toast.success('Session ready! AI will adapt questions in real-time 🤖');
      navigate(`/interview/${session.id}`);
    } catch (err) {
      toast.error('Failed to start: ' + err.message);
    } finally { setLoading(false); }
  };

  return (
    <div className="page" style={{ minHeight: '100vh', background: 'transparent' }}>
      <div style={{ position: 'fixed', inset: 0, backgroundImage: 'linear-gradient(rgba(24,144,255,0.04) 1px,transparent 1px),linear-gradient(90deg,rgba(24,144,255,0.04) 1px,transparent 1px)', backgroundSize: '50px 50px', pointerEvents: 'none', zIndex: 0 }} />

      <nav className="navbar" style={{ position: 'relative', zIndex: 10 }}>
        <Link to="/" className="navbar-brand"><span className="navbar-brand-icon" style={{ background: '#1890ff', width: 32, height: 32, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, marginRight: 8, padding: 0 }}>🧠</span>InterviewAI</Link>
        <Link to="/dashboard" className="btn btn-ghost btn-sm">← Dashboard</Link>
      </nav>

      <div className="container-md" style={{ padding: '48px 24px 80px', position: 'relative', zIndex: 1 }}>
        <div className="fade-up" style={{ textAlign: 'center', marginBottom: 48, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <h1 style={{ fontSize: 34, fontWeight: 800, letterSpacing: '-0.5px', marginBottom: 10, marginTop: 10, fontFamily: 'Sora,sans-serif' }}>Set Up Your Interview</h1>
          <p style={{ color: 'var(--text-2)', fontSize: 15 }}>Choose your role. The AI will conduct a real adaptive conversation — no pre-set questions.</p>
        </div>

        {/* Step 1: Role */}
        <section className="fade-up" style={{ marginBottom: 36, animationDelay: '.05s' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
            <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--grad)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 800, color: '#fff' }}>1</div>
            <h2 style={{ fontSize: 17, fontWeight: 700 }}>Select Your Target Role</h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(190px,1fr))', gap: 12 }}>
            {ROLES.map(r => (
              <div key={r.id} onClick={() => setRole(r.id)}
                style={{
                  padding: '20px 16px', borderRadius: 'var(--r-xl)', cursor: 'pointer', transition: 'var(--ease)',
                  background: role === r.id ? `${r.color}15` : 'var(--bg-card)',
                  border: `2px solid ${role === r.id ? r.color : 'var(--border)'}`,
                  boxShadow: role === r.id ? `0 0 24px ${r.color}25` : 'none',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, textAlign: 'center',
                  transform: role === r.id ? 'translateY(-2px)' : '',
                }}>
                <div style={{ width: 48, height: 48, borderRadius: 'var(--r-md)', background: role === r.id ? `${r.color}25` : 'rgba(255,255,255,0.04)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}>
                  {r.icon}
                </div>
                <div style={{ fontWeight: 600, fontSize: 14, color: role === r.id ? r.color : 'var(--text)' }}>{r.id}</div>
                <div style={{ fontSize: 11, color: 'var(--text-3)' }}>{r.desc}</div>
                {role === r.id && <div style={{ fontSize: 10, fontWeight: 700, color: r.color, textTransform: 'uppercase', letterSpacing: '.5px' }}>✓ Selected</div>}
              </div>
            ))}
          </div>
          {role === 'Custom' && (
            <input className="form-input fade-up" style={{ marginTop: 12 }}
              placeholder="e.g. Frontend Engineer, UX Designer, DevOps…"
              value={customRole} onChange={e => setCustomRole(e.target.value)} autoFocus />
          )}
        </section>

        {/* Step 2: Duration */}
        <section className="fade-up" style={{ marginBottom: 32, animationDelay: '.1s' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--grad)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 800, color: '#fff' }}>2</div>
            <h2 style={{ fontSize: 17, fontWeight: 700 }}>Session Duration</h2>
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {DURATIONS.map(d => (
              <button key={d} onClick={() => setDuration(d)}
                className={`btn ${duration === d ? 'btn-primary' : 'btn-secondary'}`}
                style={{ minWidth: 90 }}>
                ⏱ {d} min
              </button>
            ))}
          </div>
        </section>

        {/* Step 3: Resume (optional) */}
        <section className="fade-up" style={{ marginBottom: 36, animationDelay: '.15s' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--grad)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 800, color: '#fff' }}>3</div>
            <h2 style={{ fontSize: 17, fontWeight: 700 }}>Upload Your Resume <span style={{ fontWeight: 400, color: 'var(--text-3)', fontSize: 13 }}>(optional PDF)</span></h2>
          </div>
          <div style={{
            border: '2px dashed var(--border)',
            borderRadius: 'var(--r-lg)',
            padding: '30px',
            textAlign: 'center',
            background: 'var(--bg-card)'
          }}>
            <input 
              type="file" 
              accept=".pdf" 
              onChange={handleFileChange}
              style={{ display: 'none' }}
              id="resume-upload"
            />
            <label htmlFor="resume-upload" className="btn btn-secondary" style={{ cursor: 'pointer', marginBottom: 12 }}>
              📄 Choose PDF File
            </label>
            <p style={{ fontSize: 13, color: 'var(--text-3)' }}>
              {resumeFile ? `Selected: ${resumeFile.name}` : "No file chosen. Uploading your resume allows the AI to ask personalized questions."}
            </p>
          </div>
        </section>

        {/* Summary */}
        {effectiveRole && (
          <div className="fade-up" style={{
            marginBottom: 24, padding: '20px 24px', borderRadius: 'var(--r-xl)',
            background: selectedRole ? `${selectedRole.color}0d` : 'var(--bg-card)',
            border: `1px solid ${selectedRole ? selectedRole.color + '30' : 'var(--border)'}`,
            display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap',
          }}>
            <div style={{ fontSize: 32 }}>{selectedRole?.icon || '🎯'}</div>
            <div style={{ flex: 1, display: 'flex', gap: 32, flexWrap: 'wrap' }}>
              {[
                { l: 'Role', v: effectiveRole },
                { l: 'Duration', v: `${duration} min` },
                { l: 'Mode', v: '🤖 Adaptive AI' },
                { l: 'Resume', v: resumeFile ? '✅ Provided' : '⚪ Not provided' },
              ].map(s => (
                <div key={s.l}>
                  <div style={{ fontSize: 11, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 2 }}>{s.l}</div>
                  <div style={{ fontWeight: 700, fontSize: 15 }}>{s.v}</div>
                </div>
              ))}
            </div>
            <span className="badge badge-success">Ready</span>
          </div>
        )}

        <button id="start-interview" className="btn btn-primary btn-lg"
          onClick={handleStart} disabled={loading || !effectiveRole}
          style={{ width: '100%', fontSize: 17, boxShadow: effectiveRole ? '0 8px 32px rgba(29,78,216,0.5)' : 'none' }}>
          {loading
            ? <><span className="spinner spinner-sm" /> Starting Session…</>
            : '🚀 Start Adaptive Interview'}
        </button>
        <p style={{ textAlign: 'center', marginTop: 14, fontSize: 12, color: 'var(--text-3)' }}>
          The AI interviewer will adapt every question based on your answers in real-time.
        </p>
      </div>
    </div>
  );
}
