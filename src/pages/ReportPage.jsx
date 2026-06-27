import { useEffect, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { storageService } from '../services/storageService';
import { RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer } from 'recharts';
import { getEmotionColor } from '../utils/emotionAggregator';
import { Sidebar, Header } from './DashboardPage';

function ScoreCircle({ score, size = 100, label, color = '#6366f1' }) {
  const r = (size / 2) - 8, c = 2 * Math.PI * r;
  const fill = ((score || 0) / 100) * c;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="var(--border)" strokeWidth="7" />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth="7"
          strokeDasharray={`${fill} ${c}`} strokeLinecap="round"
          style={{ transform: 'rotate(-90deg)', transformOrigin: '50% 50%', transition: 'stroke-dasharray 1s ease' }} />
        <text x={size/2} y={size/2 + 6} textAnchor="middle" fill="var(--text)" fontSize={size === 100 ? 20 : 14} fontWeight="700">{score ?? '—'}</text>
      </svg>
      {label && <span style={{ fontSize: 12, color: 'var(--text-2)', textAlign: 'center', fontWeight: 500 }}>{label}</span>}
    </div>
  );
}

function ScoreBar({ label, score, color }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <span style={{ width: 160, fontSize: 13, color: 'var(--text-2)', flexShrink: 0 }}>{label}</span>
      <div className="progress" style={{ flex: 1 }}>
        <div className="progress-fill" style={{ width: `${score}%`, background: color || 'var(--grad)' }} />
      </div>
      <span style={{ width: 36, fontSize: 13, fontWeight: 700, textAlign: 'right', color: 'var(--text)' }}>{score}</span>
    </div>
  );
}

export default function ReportPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [report, setReport] = useState(null);
  const [session, setSession] = useState(null);
  const [tab, setTab] = useState('overview');

  useEffect(() => {
    const s = storageService.getSession(id);
    const r = storageService.getReport(id);
    if (!s || !r || s.userId !== user?.id) { navigate('/dashboard'); return; }
    setSession(s);
    setReport(r);
  }, [id, user, navigate]);

  if (!report || !session) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <span className="spinner spinner-lg" />
    </div>
  );

  const radarData = [
    { subject: 'Confidence',     A: report.confidenceScore    || 0 },
    { subject: 'Fluency',        A: report.fluencyScore       || 0 },
    { subject: 'Communication',  A: report.communicationScore || 0 },
    { subject: 'Technical',      A: report.technicalScore     || 0 },
    { subject: 'Overall',        A: report.overallScore       || 0 },
  ];

  const qFeedback = report.questionFeedback || [];
  const emotionScores = report.emotionData?.scores || {};

  function scoreColor(s) {
    if (s >= 80) return 'var(--green)';
    if (s >= 60) return 'var(--orange)';
    return 'var(--red)';
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'transparent' }}>
      <Sidebar currentPath="/dashboard" />
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <Header />
        
        <div style={{ padding: '32px 40px', flex: 1, overflowY: 'auto' }}>
          {/* Header */}
          <div style={{ marginBottom: 32 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <span className="badge badge-success">✅ Completed</span>
              <span className="badge badge-neutral">{session.role}</span>
              <span className="badge badge-neutral">{session.questions?.length} questions</span>
            </div>
            <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 8 }}>Interview Report</h1>
            <p style={{ color: 'var(--text-2)', fontSize: 14 }}>
              {new Date(report.createdAt).toLocaleDateString('en', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>

          {/* Overall hero score */}
          <div className="glass" style={{ padding: '36px 32px', marginBottom: 24, display: 'flex', alignItems: 'center', gap: 40, flexWrap: 'wrap', background: '#fff', boxShadow: 'var(--shadow-sm)' }}>
            <ScoreCircle score={report.overallScore} size={130} color={scoreColor(report.overallScore)} />
            <div style={{ flex: 1, minWidth: 200 }}>
              <div style={{ fontSize: 13, color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 8 }}>Overall Score</div>
              <div style={{ fontSize: 42, fontWeight: 800, color: scoreColor(report.overallScore), marginBottom: 12 }}>{report.overallScore}<span style={{ fontSize: 18, color: 'var(--text-2)' }}>/100</span></div>
              <p style={{ fontSize: 14, color: 'var(--text-2)', lineHeight: 1.7 }}>{report.summary}</p>
            </div>
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
              {[
                { l: 'Confidence',    v: report.confidenceScore,    c: '#1890ff' },
                { l: 'Fluency',       v: report.fluencyScore,       c: '#722ed1' },
                { l: 'Communication', v: report.communicationScore, c: '#13c2c2' },
                { l: 'Technical',     v: report.technicalScore,     c: '#52c41a' },
              ].map(s => <ScoreCircle key={s.l} score={s.v} size={80} label={s.l} color={s.c} />)}
            </div>
          </div>

          {/* Tabs */}
          <div className="tabs" style={{ marginBottom: 28 }}>
            {['overview', 'questions', 'speech', 'emotions'].map(t => (
              <button key={t} className={`tab ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>
                {{ overview: '📊 Overview', questions: '❓ Questions', speech: '🎙️ Speech', emotions: '😊 Emotions' }[t]}
              </button>
            ))}
          </div>

          {/* Overview tab */}
          {tab === 'overview' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }} className="fade-in">
              <div className="grid-2" style={{ gap: 20 }}>
                {/* Radar */}
                <div className="glass-flat" style={{ padding: 24, background: '#fff' }}>
                  <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 20 }}>Skill Breakdown</h3>
                  <ResponsiveContainer width="100%" height={250}>
                    <RadarChart data={radarData}>
                      <PolarGrid stroke="var(--border)" />
                      <PolarAngleAxis dataKey="subject" tick={{ fill: 'var(--text-2)', fontSize: 12 }} />
                      <Radar dataKey="A" stroke="#1890ff" fill="#1890ff" fillOpacity={0.2} />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>

                {/* Strengths & Weaknesses */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div className="glass-flat" style={{ padding: 20, background: '#fff' }}>
                    <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 14, color: 'var(--green)' }}>✅ Strengths</h3>
                    <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {(report.strengths || []).map((s, i) => (
                        <li key={i} style={{ fontSize: 14, color: 'var(--text-2)', display: 'flex', gap: 8 }}>
                          <span style={{ color: 'var(--green)', flexShrink: 0 }}>●</span> {s}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="glass-flat" style={{ padding: 20, background: '#fff' }}>
                    <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 14, color: 'var(--red)' }}>⚠️ Areas to Improve</h3>
                    <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {(report.weaknesses || []).map((w, i) => (
                        <li key={i} style={{ fontSize: 14, color: 'var(--text-2)', display: 'flex', gap: 8 }}>
                          <span style={{ color: 'var(--orange)', flexShrink: 0 }}>●</span> {w}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>

              {/* Suggestions */}
              <div className="glass-flat" style={{ padding: 24, background: '#fff' }}>
                <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>💡 AI Improvement Suggestions</h3>
                <div className="grid-3" style={{ gap: 12 }}>
                  {(report.suggestions || []).map((s, i) => (
                    <div key={i} style={{ padding: '14px 16px', background: '#f0f5ff', borderRadius: 'var(--r-md)', border: '1px solid #adc6ff', fontSize: 13, color: 'var(--text-2)', lineHeight: 1.6 }}>
                      <span style={{ fontWeight: 700, color: '#1890ff', marginRight: 6 }}>{i + 1}.</span>{s}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Questions tab */}
          {tab === 'questions' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }} className="fade-in">
              {qFeedback.map((qf, i) => (
                <div key={i} className="glass-flat" style={{ padding: 24, background: '#fff' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, marginBottom: 12 }}>
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.5px', color: '#1890ff', marginBottom: 4 }}>Question {i + 1}</div>
                      <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)' }}>{session.questions?.[i] || qf.question}</div>
                    </div>
                    <div style={{ flexShrink: 0 }}><ScoreCircle score={qf.score} size={60} color={scoreColor(qf.score)} /></div>
                  </div>
                  {report.transcript?.[i] && (
                    <div className="transcript-box" style={{ marginBottom: 12 }}>
                      <div style={{ fontSize: 11, color: '#1890ff', fontWeight: 600, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '.5px' }}>Your answer</div>
                      {report.transcript[i]}
                    </div>
                  )}
                  <div style={{ padding: '10px 14px', background: '#f6ffed', borderRadius: 'var(--r-md)', border: '1px solid #b7eb8f', fontSize: 13, color: 'var(--text-2)' }}>
                    <span style={{ fontWeight: 600, color: 'var(--green)' }}>AI Feedback: </span>{qf.feedback}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Speech tab */}
          {tab === 'speech' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }} className="fade-in">
              <div className="grid-4" style={{ gap: 16 }}>
                {[
                  { label: 'Avg WPM', value: report.speechMetrics?.avgWpm || '—', icon: '⚡', sub: 'Words per minute' },
                  { label: 'Filler Words', value: report.speechMetrics?.fillerCount || 0, icon: '🗣️', sub: report.speechMetrics?.fillerWords?.join(', ') || 'None detected' },
                  { label: 'Fluency Score', value: `${report.speechMetrics?.fluencyScore || 0}%`, icon: '🎯', sub: 'Non-filler ratio' },
                  { label: 'Avg Pauses', value: report.speechMetrics?.avgPauses || '—', icon: '⏸️', sub: 'Per answer' },
                ].map(s => (
                  <div key={s.label} className="stat-card" style={{ background: '#fff' }}>
                    <div style={{ fontSize: 22 }}>{s.icon}</div>
                    <div className="stat-label">{s.label}</div>
                    <div className="stat-value">{s.value}</div>
                    <div className="stat-sub">{s.sub}</div>
                  </div>
                ))}
              </div>

              <div className="glass-flat" style={{ padding: 24, background: '#fff' }}>
                <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 20 }}>Score Breakdown</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <ScoreBar label="Confidence" score={report.confidenceScore || 0} color="#1890ff" />
                  <ScoreBar label="Communication" score={report.communicationScore || 0} color="#722ed1" />
                  <ScoreBar label="Fluency" score={report.fluencyScore || 0} color="#13c2c2" />
                  <ScoreBar label="Technical" score={report.technicalScore || 0} color="#52c41a" />
                </div>
              </div>
            </div>
          )}

          {/* Emotions tab */}
          {tab === 'emotions' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }} className="fade-in">
              <div className="grid-2" style={{ gap: 20 }}>
                <div className="glass-flat" style={{ padding: 24, background: '#fff' }}>
                  <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 20 }}>Emotion Distribution</h3>
                  {Object.keys(emotionScores).length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {Object.entries(emotionScores).sort((a, b) => b[1] - a[1]).map(([emo, pct]) => (
                        <div key={emo} className="emotion-bar-row">
                          <span className="emotion-bar-label">{emo}</span>
                          <div className="emotion-bar-track">
                            <div className="emotion-bar-fill" style={{ width: `${pct}%`, background: getEmotionColor(emo) }} />
                          </div>
                          <span className="emotion-bar-pct">{pct}%</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ color: 'var(--text-2)', fontSize: 14 }}>No emotion data collected. Ensure face-api.js models are loaded and your face is visible during the interview.</div>
                  )}
                </div>

                <div className="glass-flat" style={{ padding: 24, background: '#fff' }}>
                  <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 20 }}>Interview Context</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    {Object.entries(report.emotionData?.interviewContext || {}).map(([key, val]) => (
                      <div key={key}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                          <span style={{ fontSize: 13, color: 'var(--text-2)', textTransform: 'capitalize' }}>{key}</span>
                          <span style={{ fontSize: 13, fontWeight: 700 }}>{val}%</span>
                        </div>
                        <div className="progress">
                          <div className="progress-fill" style={{ width: `${val}%`, background: '#1890ff' }} />
                        </div>
                      </div>
                    ))}
                  </div>
                  {report.emotionData?.dominant && (
                    <div style={{ marginTop: 20, padding: '12px 16px', background: '#f0f2f5', borderRadius: 'var(--r-md)' }}>
                      <span style={{ fontSize: 13, color: 'var(--text-2)' }}>Dominant emotion: </span>
                      <span style={{ fontWeight: 700, color: getEmotionColor(report.emotionData.dominant), textTransform: 'capitalize' }}>{report.emotionData.dominant}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
