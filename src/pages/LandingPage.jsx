import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const FEATURES = [
  { icon: '🤖', title: 'AI Question Generation', desc: 'Role-specific questions crafted by Google Gemini, tailored to your exact target position.', color: '#6366f1' },
  { icon: '🎙️', title: 'Real-Time Transcription', desc: 'Answers transcribed live using the browser Web Speech API — zero cost, full privacy.', color: '#a855f7' },
  { icon: '😊', title: 'Emotion Detection', desc: 'Face-api.js analyses confidence, nervousness and engagement frame-by-frame.', color: '#22d3ee' },
  { icon: '📊', title: 'Detailed Reports', desc: 'Scores for confidence, fluency and communication with AI-generated improvement tips.', color: '#10b981' },
  { icon: '🎥', title: 'Session Recording', desc: 'Full session captured in-browser so you can replay and self-critique anytime.', color: '#f59e0b' },
  { icon: '📈', title: 'Progress Tracking', desc: 'Dashboard charts show how your performance evolves across every session.', color: '#ef4444' },
];

const STEPS = [
  { n: '01', title: 'Create Account', desc: 'Sign up free in seconds. No credit card required.' },
  { n: '02', title: 'Choose Role & Duration', desc: 'Pick your target role and how many questions you want.' },
  { n: '03', title: 'Start Interview', desc: 'AI generates questions. Answer naturally on camera.' },
  { n: '04', title: 'Get Your Report', desc: 'Receive scores, emotion data and AI coaching feedback.' },
];

const ROLES = ['Software Engineer', 'Product Manager', 'Data Scientist', 'HR Manager', 'Marketing Manager', 'Custom Role'];

// Custom hook for numbers counting up
function useCounter(target, duration = 1500) {
  const [val, setVal] = useState(0);
  const [hasStarted, setHasStarted] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setHasStarted(true);
        observer.disconnect();
      }
    }, { threshold: 0.1 });
    
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!hasStarted) return;
    const step = target / (duration / 16);
    const id = setInterval(() => {
      setVal(v => { const next = v + step; if (next >= target) { clearInterval(id); return target; } return next; });
    }, 16);
    return () => clearInterval(id);
  }, [target, duration, hasStarted]);

  return { val: Math.round(val), ref };
}

function StatCounter({ value, label, suffix = '' }) {
  const { val: n, ref } = useCounter(value);
  return (
    <div ref={ref} className="reveal-on-scroll" style={{ textAlign: 'center' }}>
      <div style={{ fontSize: 'clamp(32px,5vw,52px)', fontWeight: 800, background: 'linear-gradient(135deg,#1890ff,#13c2c2)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
        {n}{suffix}
      </div>
      <div style={{ fontSize: 14, color: 'var(--text-2)', marginTop: 4 }}>{label}</div>
    </div>
  );
}

export default function LandingPage() {
  const { user } = useAuth();
  const [scrollY, setScrollY] = useState(0);

  // Scroll listener for parallax
  useEffect(() => {
    const handleScroll = () => {
      requestAnimationFrame(() => setScrollY(window.scrollY));
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Intersection Observer for scroll reveals
  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-revealed');
        }
      });
    }, { threshold: 0.1, rootMargin: "0px 0px -50px 0px" });

    document.querySelectorAll('.reveal-on-scroll').forEach(el => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', overflowX: 'hidden' }}>
      <style>{`
        .reveal-on-scroll { 
          opacity: 0; 
          transform: translateY(40px); 
          transition: opacity 0.8s cubic-bezier(0.16, 1, 0.3, 1), transform 0.8s cubic-bezier(0.16, 1, 0.3, 1); 
        }
        .reveal-on-scroll.is-revealed { 
          opacity: 1; 
          transform: translateY(0); 
        }
        .parallax-bg {
          position: absolute;
          top: 0; left: 0; width: 100%; height: 130%;
          background-image: url(/hero_bg.png);
          background-size: cover;
          background-position: center;
          opacity: 0.15; /* keep it subtle to maintain professional light mode */
          z-index: 0;
          pointer-events: none;
        }
      `}</style>

      {/* ── Navbar ── */}
      <nav className="navbar" style={{ transition: 'all 0.3s', background: scrollY > 50 ? 'rgba(255,255,255,0.95)' : 'transparent', borderBottom: scrollY > 50 ? '1px solid var(--border)' : '1px solid transparent' }}>
        <Link to="/" className="navbar-brand">
          <span className="navbar-brand-icon">🧠</span>
          InterviewAI
        </Link>
        <div className="navbar-links">
          {user ? (
            <Link to="/dashboard" className="btn btn-primary btn-sm">Dashboard →</Link>
          ) : (
            <>
              <Link to="/auth" className="nav-link">Sign In</Link>
              <Link to="/auth" className="btn btn-primary btn-sm">Get Started Free</Link>
            </>
          )}
        </div>
      </nav>

      {/* ── Hero ── */}
      <section style={{ position: 'relative', minHeight: '100vh', display: 'flex', alignItems: 'center', overflow: 'hidden', marginTop: '-65px' }}>
        
        {/* 3D Parallax Background Layer */}
        <div 
          className="parallax-bg" 
          style={{ transform: `translateY(${scrollY * 0.4}px)` }} 
        />
        
        {/* Soft overlay gradient */}
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, transparent 0%, var(--bg) 100%)', zIndex: 0, pointerEvents: 'none' }} />

        {/* Floating Abstract Elements with Parallax */}
        <div style={{ position: 'absolute', width: 600, height: 600, borderRadius: '50%', background: 'radial-gradient(circle, rgba(24,144,255,0.15) 0%, transparent 70%)', top: '-100px', right: '-100px', transform: `translateY(${scrollY * -0.2}px)`, pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', width: 400, height: 400, borderRadius: '50%', background: 'radial-gradient(circle, rgba(19,194,194,0.12) 0%, transparent 70%)', bottom: '10%', left: '-80px', transform: `translateY(${scrollY * -0.4}px)`, pointerEvents: 'none' }} />

        <div className="container" style={{ position: 'relative', zIndex: 1, textAlign: 'center', padding: '80px 24px' }}>
          
          <h1 className="reveal-on-scroll" style={{ fontSize: 'clamp(44px,8vw,88px)', fontWeight: 900, lineHeight: 1.05, letterSpacing: '-2px', marginBottom: 28, transitionDelay: '0.1s' }}>
            Ace Every Interview<br />
            <span style={{ background: 'linear-gradient(135deg,#1890ff 0%,#13c2c2 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', display: 'inline-block', transform: `translateY(${scrollY * 0.1}px)` }}>
              With AI-Powered
            </span><br />
            Mock Practice
          </h1>

          <p className="reveal-on-scroll" style={{ fontSize: 'clamp(16px,2vw,20px)', color: 'var(--text-2)', maxWidth: 600, margin: '0 auto 44px', lineHeight: 1.75, transitionDelay: '0.2s' }}>
            Practice real interview scenarios with AI-generated questions, live emotion analysis,
            speech metrics and personalised AI feedback — all in your browser.
          </p>

          <div className="reveal-on-scroll" style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap', transitionDelay: '0.3s' }}>
            <Link to={user ? '/setup' : '/auth'} className="btn btn-primary btn-lg" style={{ padding: '16px 36px', fontSize: 17, borderRadius: 'var(--r-xl)', boxShadow: '0 8px 30px rgba(24,144,255,0.3)' }}>
              🚀 Start Mock Interview
            </Link>
            <a href="#how" className="btn btn-secondary btn-lg" style={{ padding: '16px 36px', fontSize: 17, borderRadius: 'var(--r-xl)', background: 'rgba(255,255,255,0.5)', backdropFilter: 'blur(10px)' }}>
              See How It Works
            </a>
          </div>

          {/* Role chips */}
          <div className="reveal-on-scroll" style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap', marginTop: 52, transitionDelay: '0.4s' }}>
            {ROLES.map(r => (
              <span key={r} style={{ padding: '6px 16px', borderRadius: 'var(--r-full)', background: 'rgba(255,255,255,0.6)', border: '1px solid var(--border)', fontSize: 12, color: 'var(--text-2)', backdropFilter: 'blur(5px)' }}>{r}</span>
            ))}
          </div>
        </div>
      </section>

      {/* ── Stats bar ── */}
      <section style={{ borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)', padding: '48px 24px', background: 'rgba(24,144,255,0.03)', position: 'relative', zIndex: 10 }}>
        <div className="container">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: 32 }}>
            <StatCounter value={10} suffix="+" label="Interview Roles" />
            <StatCounter value={100} suffix="%" label="Free & Private" />
            <StatCounter value={6} label="Analysis Metrics" />
            <StatCounter value={0} suffix=" Setup" label="Servers Required" />
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section style={{ padding: '100px 24px', position: 'relative', zIndex: 10 }}>
        <div className="container">
          <div className="reveal-on-scroll" style={{ textAlign: 'center', marginBottom: 64 }}>
            <span className="badge badge-primary" style={{ marginBottom: 16 }}>Features</span>
            <h2 style={{ fontSize: 'clamp(28px,4vw,44px)', fontWeight: 800, marginBottom: 14 }}>Everything You Need to Succeed</h2>
            <p style={{ color: 'var(--text-2)', fontSize: 16, maxWidth: 520, margin: '0 auto' }}>A complete AI-powered interview preparation platform — no sign-ups, no paywalls, no uploads.</p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(300px,1fr))', gap: 20 }}>
            {FEATURES.map((f, i) => (
              <div key={f.title} className="reveal-on-scroll" style={{
                transitionDelay: `${i * 0.1}s`, padding: 28, borderRadius: 'var(--r-xl)',
                background: 'var(--bg-card)', border: '1px solid var(--border)',
                position: 'relative', overflow: 'hidden', transition: 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
                cursor: 'default',
                transform: `translateY(${scrollY * 0.02}px)` // Very subtle parallax on features
              }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-6px)'; e.currentTarget.style.borderColor = f.color + '55'; e.currentTarget.style.boxShadow = `0 20px 60px ${f.color}22`; }}
              onMouseLeave={e => { e.currentTarget.style.transform = `translateY(${scrollY * 0.02}px)`; e.currentTarget.style.borderColor = ''; e.currentTarget.style.boxShadow = ''; }}
              >
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, transparent, ${f.color}, transparent)`, opacity: 0.6 }} />
                <div style={{ width: 50, height: 50, borderRadius: 'var(--r-md)', background: f.color + '20', border: `1px solid ${f.color}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, marginBottom: 18 }}>{f.icon}</div>
                <h3 style={{ fontSize: 17, fontWeight: 700, marginBottom: 10, color: 'var(--text)' }}>{f.title}</h3>
                <p style={{ fontSize: 14, color: 'var(--text-2)', lineHeight: 1.75 }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section id="how" style={{ padding: '100px 24px', background: 'var(--bg-2)', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', backgroundImage: 'url(/hero_bg.png)', backgroundSize: 'cover', opacity: 0.05, transform: `translateY(${scrollY * -0.2}px)` }} />
        
        <div className="container" style={{ position: 'relative', zIndex: 1 }}>
          <div className="reveal-on-scroll" style={{ textAlign: 'center', marginBottom: 64 }}>
            <span className="badge badge-primary" style={{ marginBottom: 16 }}>Process</span>
            <h2 style={{ fontSize: 'clamp(28px,4vw,44px)', fontWeight: 800 }}>Ready in 4 Simple Steps</h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 24, position: 'relative' }}>
            {STEPS.map((s, i) => (
              <div key={s.n} className="reveal-on-scroll" style={{ textAlign: 'center', padding: '32px 20px', borderRadius: 'var(--r-xl)', background: 'var(--bg-card)', border: '1px solid var(--border)', position: 'relative', transitionDelay: `${i * 0.15}s` }}>
                <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'linear-gradient(135deg,#1890ff,#13c2c2)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', fontSize: 16, fontWeight: 800, color: '#fff', boxShadow: '0 8px 24px rgba(24,144,255,0.3)' }}>{s.n}</div>
                <h3 style={{ fontSize: 17, fontWeight: 700, marginBottom: 10 }}>{s.title}</h3>
                <p style={{ fontSize: 14, color: 'var(--text-2)', lineHeight: 1.7 }}>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section style={{ padding: '100px 24px', position: 'relative', overflow: 'hidden' }}>
        <div className="container" style={{ textAlign: 'center', position: 'relative', zIndex: 1 }}>
          <div className="reveal-on-scroll" style={{ maxWidth: 660, margin: '0 auto', padding: '60px 48px', borderRadius: 'var(--r-xl)', background: 'linear-gradient(135deg, rgba(24,144,255,0.08) 0%, rgba(19,194,194,0.08) 100%)', border: '1px solid rgba(24,144,255,0.2)', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(24,144,255,0.06) 1px,transparent 1px),linear-gradient(90deg,rgba(24,144,255,0.06) 1px,transparent 1px)', backgroundSize: '30px 30px', transform: `translateY(${scrollY * 0.1}px)` }} />
            <div style={{ position: 'relative', zIndex: 1 }}>
              <div style={{ fontSize: 48, marginBottom: 20 }}>🎯</div>
              <h2 style={{ fontSize: 'clamp(24px,4vw,38px)', fontWeight: 800, marginBottom: 16 }}>Ready to Land Your Dream Job?</h2>
              <p style={{ color: 'var(--text-2)', fontSize: 16, marginBottom: 36, lineHeight: 1.7 }}>
                Join thousands of candidates who've improved their interview confidence using InterviewAI. It's free, private and takes 2 minutes to start.
              </p>
              <Link to={user ? '/setup' : '/auth'} className="btn btn-primary btn-lg" style={{ padding: '16px 40px', fontSize: 17, borderRadius: 'var(--r-xl)', boxShadow: '0 8px 30px rgba(24,144,255,0.3)' }}>
                {user ? '🚀 Start New Interview' : '🚀 Create Free Account'}
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer style={{ borderTop: '1px solid var(--border)', padding: '24px', textAlign: 'center', color: 'var(--text-3)', fontSize: 13, background: 'var(--bg-card)' }}>
        InterviewAI — Built with React, Vite &amp; Google Gemini · All data stored locally in your browser
      </footer>
    </div>
  );
}
