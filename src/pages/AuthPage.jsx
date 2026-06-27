import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

export default function AuthPage() {
  // --- Refs for DOM manipulation & Animation State ---
  const isLookingAway = useRef(false);
  const isScanning = useRef(false);
  const mouse = useRef({ x: 0, y: 0 });
  
  // DOM Element Refs
  const monstersRef = useRef([]);
  const pupilsRef = useRef([]);
  const emailInputRef = useRef(null);
  const passwordInputRef = useRef(null);
  
  // Auth state
  const [mode, setMode] = useState('login'); // login, register, forgot, reset
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const { login, register, loginWithGoogle, resetPassword, updatePassword, usingSupabase } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Check if coming from a password reset email
    const hash = window.location.hash;
    if (hash && hash.includes('type=recovery')) {
      setMode('reset');
    }
  }, []);

  const setFormValue = k => e => { setForm(f => ({ ...f, [k]: e.target.value })); };

  // --- Helper to collect refs ---
  monstersRef.current = [];
  pupilsRef.current = [];

  const addToMonstersRef = (el) => { if (el && !monstersRef.current.includes(el)) monstersRef.current.push(el); };
  const addToPupilsRef = (el) => { if (el && !pupilsRef.current.includes(el)) pupilsRef.current.push(el); };

  // --- 1. Event Listeners (Mouse & Blink) ---
  useEffect(() => {
    const handleMouseMove = (e) => {
      mouse.current = { x: e.clientX, y: e.clientY };
    };
    window.addEventListener('mousemove', handleMouseMove);

    let blinkTimeout;
    const triggerBlink = () => {
      if (isLookingAway.current) {
        blinkTimeout = setTimeout(triggerBlink, 2000); 
        return;
      }

      const monsters = monstersRef.current;
      const targetIndex = Math.floor(Math.random() * (monsters.length + 1));

      if (targetIndex === monsters.length) {
        monsters.forEach(m => m?.classList.add('blink'));
        setTimeout(() => monsters.forEach(m => m?.classList.remove('blink')), 200);
      } else if (monsters[targetIndex]) {
        monsters[targetIndex].classList.add('blink');
        setTimeout(() => monsters[targetIndex].classList.remove('blink'), 200);
      }

      blinkTimeout = setTimeout(triggerBlink, Math.random() * 4000 + 2000);
    };

    const initialDelay = setTimeout(triggerBlink, 3000);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      clearTimeout(blinkTimeout);
      clearTimeout(initialDelay);
    };
  }, []);

  // --- 2. Animation Loop ---
  useEffect(() => {
    let animationFrameId;

    const animate = () => {
      if (isLookingAway.current) {
        animationFrameId = requestAnimationFrame(animate);
        return;
      }

      const centerX = window.innerWidth / 2;
      const centerY = window.innerHeight / 2;
      const percentX = (mouse.current.x - centerX) / centerX;
      const percentY = (mouse.current.y - centerY) / centerY;

      monstersRef.current.forEach((monster, index) => {
        if (!monster) return;
        const speed = 10 - (index * 3);
        const moveX = percentX * speed;
        const moveY = percentY * speed;
        const rotate = percentX * 2;

        monster.style.transform = `translate(${moveX}px, ${moveY}px) rotate(${rotate}deg)`;
      });

      if (isScanning.current) {
        const val = form.email.length;
        const maxChars = 35;
        const percent = Math.min(val / maxChars, 1);
        const eyeOffset = (percent * 16) - 8;

        pupilsRef.current.forEach(pupil => {
          if(pupil) pupil.style.transform = `translate(${eyeOffset}px, 2px)`;
        });

      } else {
        pupilsRef.current.forEach(pupil => {
          if (!pupil) return;
          const rect = pupil.getBoundingClientRect();
          const pupilX = rect.left + rect.width / 2;
          const pupilY = rect.top + rect.height / 2;

          const angle = Math.atan2(mouse.current.y - pupilY, mouse.current.x - pupilX);
          const moveDistance = 6;
          const xMove = Math.cos(angle) * moveDistance;
          const yMove = Math.sin(angle) * moveDistance;

          pupil.style.transform = `translate(${xMove}px, ${yMove}px)`;
        });
      }

      animationFrameId = requestAnimationFrame(animate);
    };

    animate();
    return () => cancelAnimationFrame(animationFrameId);
  }, [form.email]); 

  // --- 3. Interaction Handlers ---
  const handleEmailFocus = () => { isScanning.current = true; };
  const handleEmailBlur = () => { isScanning.current = false; };

  const handlePasswordFocus = () => {
    if (!showPassword) {
      isLookingAway.current = true;
      pupilsRef.current.forEach(p => { if(p) p.style.transform = 'translate(-8px, -12px)'; });
      monstersRef.current.forEach(m => { if(m) m.style.transform = 'translate(-10px, 5px) rotate(-8deg)'; });
    }
  };

  const handlePasswordBlur = () => {
    isLookingAway.current = false;
  };

  const togglePasswordVisibility = (e) => {
    e.preventDefault();
    const becomingVisible = !showPassword;
    setShowPassword(becomingVisible);

    if (becomingVisible) {
      isLookingAway.current = false;
    } else if (document.activeElement === passwordInputRef.current) {
      isLookingAway.current = true;
      pupilsRef.current.forEach(p => { if(p) p.style.transform = 'translate(-8px, -12px)'; });
      monstersRef.current.forEach(m => { if(m) m.style.transform = 'translate(-10px, 5px) rotate(-8deg)'; });
    }
  };

  const handleAction = async () => {
    // Reset animations
    monstersRef.current.forEach(m => {
      if (!m) return;
      m.classList.remove('happy', 'confused');
      void m.offsetWidth; // Trigger reflow for animation restart
    });

    setLoading(true);
    try {
      if (mode === 'login') {
        if (!form.email || !form.password) throw new Error('Please fill in all fields.');
        await login(form.email, form.password);
        monstersRef.current.forEach(m => { if(m) m.classList.add('happy'); });
        toast.success('Welcome back! 👋');
        navigate('/dashboard');
      } else if (mode === 'register') {
        if (!form.name || !form.email || !form.password) throw new Error('Please fill in all fields.');
        if (form.password.length < 6) throw new Error('Password must be at least 6 characters.');
        await register(form.name, form.email, form.password);
        monstersRef.current.forEach(m => { if(m) m.classList.add('happy'); });
        toast.success('Account created! 🎉');
        navigate('/dashboard');
      } else if (mode === 'forgot') {
        if (!form.email) throw new Error('Please enter your email.');
        await resetPassword(form.email);
        toast.success('Reset link sent! Please check your email.');
        setMode('login');
      } else if (mode === 'reset') {
        if (form.password.length < 6) throw new Error('Password must be at least 6 characters.');
        await updatePassword(form.password);
        toast.success('Password updated successfully! Please log in.');
        setMode('login');
        window.location.hash = ''; // Clear hash
      }
    } catch (err) {
      monstersRef.current.forEach(m => { if(m) m.classList.add('confused'); });
      let errorMsg = err.message || 'An error occurred.';
      if (errorMsg.toLowerCase().includes('rate limit') || errorMsg.toLowerCase().includes('limit exceeded')) {
        errorMsg = 'Too many attempts. Supabase free tier limits email signups (approx 3/hr). Please use Google Sign-In or try again later.';
      }
      toast.error(errorMsg, { duration: 5000 });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setGoogleLoading(true);
    try {
      await loginWithGoogle();
    } catch (err) {
      toast.error('Google sign-in failed: ' + err.message);
      setGoogleLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <style>{`
        .auth-container { min-height: 100vh; background: transparent; display: flex; flex-direction: column; overflow: hidden; font-family: 'Inter', sans-serif; }
        @media (min-width: 768px) { .auth-container { flex-direction: row; } }
        
        .auth-visual { width: 100%; background: transparent; display: flex; justify-content: center; align-items: center; position: relative; overflow: hidden; height: 16rem; }
        @media (min-width: 768px) { .auth-visual { width: 50%; height: auto; } }

        .monster-wrapper { position: relative; width: 320px; height: 320px; transition: transform 0.1s ease-out; }
        @media (min-width: 768px) { .monster-wrapper { width: 400px; height: 400px; } }

        .monster { position: absolute; border-top-left-radius: 40px; border-top-right-radius: 40px; box-shadow: var(--shadow-lg); }
        .monster-1 { width: 6rem; height: 12rem; background: #6c5ce7; bottom: 2.5rem; left: 5rem; z-index: 10; }
        @media (min-width: 768px) { .monster-1 { width: 8rem; height: 14rem; left: 6rem; } }
        
        .monster-2 { width: 5rem; height: 8rem; background: #fdcb6e; bottom: 2.5rem; right: 2.5rem; border-top-left-radius: 50px; border-top-right-radius: 50px; z-index: 20; }
        @media (min-width: 768px) { .monster-2 { width: 7rem; height: 10rem; right: 3rem; } }

        .monster-3 { width: 9rem; height: 6rem; background: #e17055; bottom: 2.5rem; left: 2rem; border-top-left-radius: 60px; border-top-right-radius: 60px; z-index: 30; }
        @media (min-width: 768px) { .monster-3 { width: 11rem; height: 8rem; left: 2.5rem; } }

        .eyeball { background: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; overflow: hidden; position: absolute; box-shadow: var(--shadow-sm); }
        .pupil { background: var(--text); border-radius: 50%; transition: transform 0.1s; }
        .eyelid { position: absolute; top: -100%; left: 0; width: 100%; height: 100%; transition: all 0.15s; z-index: 20; }

        @keyframes jump { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-30px); } }
        @keyframes shake { 0%, 100% { transform: translateX(0); } 25% { transform: translateX(-8px) rotate(-3deg); } 75% { transform: translateX(8px) rotate(3deg); } }
        .monster.happy { animation: jump 0.5s ease; }
        .monster.confused { animation: shake 0.3s ease 2; }
        .monster.blink .eyelid { top: 0 !important; }

        .auth-form-section { width: 100%; background: rgba(255, 255, 255, 0.6); backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px); display: flex; flex-direction: column; justify-content: center; padding: 3rem 2rem; z-index: 40; }
        @media (min-width: 768px) { 
          .auth-form-section { width: 50%; padding: 5rem; border-top-left-radius: 40px; border-bottom-left-radius: 40px; box-shadow: -10px 0 25px rgba(0,0,0,0.05); margin-left: -2.5rem; } 
        }
        
        .auth-form-inner { max-width: 28rem; width: 100%; margin: 0 auto; }
        .auth-input { width: 100%; padding: 0.75rem 1rem; border-radius: var(--r-md); border: 1px solid var(--border); outline: none; transition: var(--ease); background: var(--bg-input); color: var(--text); margin-top: 0.25rem; font-family: inherit;}
        .auth-input:focus { border-color: var(--yellow); box-shadow: 0 0 0 3px var(--yellow-dim); }
        .auth-btn { width: 100%; padding: 1rem; background: var(--yellow); color: white; border-radius: var(--r-md); font-weight: bold; cursor: pointer; transition: var(--ease); border: none; font-size: 1rem; margin-top: 0.5rem; box-shadow: 0 4px 10px var(--yellow-dim); }
        .auth-btn:hover { background: var(--yellow-bright); transform: translateY(-2px); box-shadow: 0 6px 16px var(--yellow-glow); }
        .auth-btn:active { transform: translateY(0); }
        .auth-btn:disabled { opacity: 0.7; cursor: not-allowed; transform: none; box-shadow: none; }
        .auth-label { font-size: 0.875rem; font-weight: 600; color: var(--text-2); margin-left: 0.25rem; display: block; }
      `}</style>

      {/* Visual Section */}
      <div className="auth-visual">
        <div className="monster-wrapper">
          {/* Purple Monster (Back) */}
          <div className="monster monster-1" ref={addToMonstersRef}>
            <div style={{ position: 'absolute', width: '1.25rem', height: '2.5rem', background: '#5849be', top: '-0.5rem', left: '0.75rem', borderRadius: '9999px', transform: 'rotate(-12deg)' }}></div>
            <div style={{ position: 'absolute', width: '1.25rem', height: '2.5rem', background: '#5849be', top: '-0.5rem', right: '0.75rem', borderRadius: '9999px', transform: 'rotate(12deg)' }}></div>
            
            <div className="eyeball" style={{ top: '3rem', left: '1.25rem', width: '2.25rem', height: '2.25rem' }}>
               <div className="pupil" style={{ width: '1rem', height: '1rem' }} ref={addToPupilsRef}></div>
               <div className="eyelid" style={{ background: '#6c5ce7' }}></div>
            </div>
            <div className="eyeball" style={{ top: '3rem', right: '1.25rem', width: '2.25rem', height: '2.25rem' }}>
               <div className="pupil" style={{ width: '1rem', height: '1rem' }} ref={addToPupilsRef}></div>
               <div className="eyelid" style={{ background: '#6c5ce7' }}></div>
            </div>
            <div style={{ position: 'absolute', bottom: '5rem', left: '50%', transform: 'translateX(-50%)', width: '1.5rem', height: '0.5rem', background: '#4a3fb3', borderRadius: '9999px' }}></div>
          </div>

          {/* Yellow Monster (Side) */}
          <div className="monster monster-2" ref={addToMonstersRef}>
            <div style={{ position: 'absolute', top: '-0.75rem', left: '50%', transform: 'translateX(-50%)', borderLeft: '12px solid transparent', borderRight: '12px solid transparent', borderBottom: '18px solid #fdcb6e' }}></div>
            <div className="eyeball" style={{ top: '2.5rem', right: '1.5rem', width: '1.75rem', height: '1.75rem' }}>
              <div className="pupil" style={{ width: '0.75rem', height: '0.75rem' }} ref={addToPupilsRef}></div>
              <div className="eyelid" style={{ background: '#fdcb6e' }}></div>
            </div>
            <div style={{ position: 'absolute', bottom: '3rem', right: '2rem', width: '1rem', height: '0.25rem', background: '#e1b12c', borderRadius: '9999px' }}></div>
          </div>

          {/* Orange Monster (Front) */}
          <div className="monster monster-3" ref={addToMonstersRef}>
            <div style={{ position: 'absolute', top: '-1rem', left: '2.5rem', width: '1rem', height: '2rem', background: 'white', borderTopLeftRadius: '9999px', borderTopRightRadius: '9999px', transform: 'rotate(-12deg)' }}></div>
            <div style={{ position: 'absolute', top: '-1rem', right: '2.5rem', width: '1rem', height: '2rem', background: 'white', borderTopLeftRadius: '9999px', borderTopRightRadius: '9999px', transform: 'rotate(12deg)' }}></div>
            
            <div className="eyeball" style={{ top: '2rem', left: '2rem', width: '2.5rem', height: '2.5rem' }}>
               <div className="pupil" style={{ width: '1.25rem', height: '1.25rem' }} ref={addToPupilsRef}></div>
               <div className="eyelid" style={{ background: '#e17055' }}></div>
            </div>
            <div className="eyeball" style={{ top: '2rem', right: '2rem', width: '2.5rem', height: '2.5rem' }}>
               <div className="pupil" style={{ width: '1.25rem', height: '1.25rem' }} ref={addToPupilsRef}></div>
               <div className="eyelid" style={{ background: '#e17055' }}></div>
            </div>
            <div style={{ position: 'absolute', bottom: '1.5rem', left: '50%', transform: 'translateX(-50%)', width: '2rem', height: '1rem', background: '#c0392b', borderBottomLeftRadius: '9999px', borderBottomRightRadius: '9999px' }}></div>
          </div>
        </div>
      </div>

      {/* Form Section */}
      <div className="auth-form-section">
        <div className="auth-form-inner">
          <header style={{ marginBottom: '2.5rem' }}>
            <Link to="/" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginBottom: '1.5rem', textDecoration: 'none' }}>
              <span style={{ width: '30px', height: '30px', background: 'var(--yellow)', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '14px' }}>🧠</span>
              <span style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text)', fontFamily: "'Sora', sans-serif", letterSpacing: '-0.3px' }}>InterviewAI</span>
            </Link>
            <h1 style={{ fontSize: '1.875rem', fontWeight: '800', color: 'var(--text)', marginBottom: '0.5rem', fontFamily: "'Sora', sans-serif" }}>
              {mode === 'login' && 'Welcome back!'}
              {mode === 'register' && 'Join the club!'}
              {mode === 'forgot' && 'Forgot Password'}
              {mode === 'reset' && 'Set New Password'}
            </h1>
            <p style={{ color: 'var(--text-2)' }}>
              {mode === 'login' && 'The gang missed you. Sign in to continue.'}
              {mode === 'register' && 'Sign up to start your interview journey.'}
              {mode === 'forgot' && 'Enter your email to receive a reset link.'}
              {mode === 'reset' && 'Enter your new password below.'}
            </p>
          </header>

          <form style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }} onSubmit={(e) => { e.preventDefault(); handleAction(); }}>
            {mode === 'register' && (
              <div>
                <label className="auth-label">Full Name</label>
                <input type="text" value={form.name} onChange={setFormValue('name')} className="auth-input" placeholder="Jane Doe" required />
              </div>
            )}
            
            {mode !== 'reset' && (
              <div>
                <label className="auth-label">Email Address</label>
                <input 
                  type="email" 
                  ref={emailInputRef}
                  value={form.email}
                  onChange={setFormValue('email')}
                  onFocus={handleEmailFocus}
                  onBlur={handleEmailBlur}
                  className="auth-input"
                  placeholder="monsters@example.com"
                  required
                />
              </div>
            )}

            {(mode === 'login' || mode === 'register' || mode === 'reset') && (
              <div>
                <label className="auth-label">{mode === 'reset' ? 'New Password' : 'Password'}</label>
                <div style={{ position: 'relative' }}>
                  <input 
                    type={showPassword ? 'text' : 'password'}
                    ref={passwordInputRef}
                    value={form.password}
                    onChange={setFormValue('password')}
                    onFocus={handlePasswordFocus}
                    onBlur={handlePasswordBlur}
                    className="auth-input"
                    placeholder="••••••••"
                    required
                  />
                  <button type="button" onClick={togglePasswordVisibility} style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', fontSize: '1rem' }}>
                    {showPassword ? '🙈' : '👁️'}
                  </button>
                </div>
              </div>
            )}

            {mode === 'login' && (
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '-0.5rem' }}>
                <button type="button" onClick={() => { setMode('forgot'); setForm({name:'', email:'', password:''}); }} style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--yellow)', background: 'none', border: 'none', cursor: 'pointer' }}>
                  Forgot Password?
                </button>
              </div>
            )}

            <button type="submit" className="auth-btn" disabled={loading}>
              {loading ? 'Processing...' : (
                mode === 'login' ? 'Log In' :
                mode === 'register' ? 'Sign Up' :
                mode === 'forgot' ? 'Send Reset Link' : 'Set Password'
              )}
            </button>

            {(mode === 'login' || mode === 'register') && usingSupabase && (
              <>
                <div style={{ position: 'relative', margin: '1rem 0' }}>
                  <div style={{ borderTop: '1px solid #e2e8f0' }}></div>
                  <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', background: 'var(--bg-card)', padding: '0 0.5rem', fontSize: '0.75rem', color: 'var(--text-3)', textTransform: 'uppercase' }}>Or continue with</div>
                </div>

                <button type="button" onClick={handleGoogle} disabled={googleLoading} style={{ width: '100%', padding: '0.75rem', border: '1px solid var(--border)', borderRadius: 'var(--r-md)', background: 'var(--bg-input)', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.75rem', fontWeight: 600, color: 'var(--text)', transition: 'var(--ease)' }}>
                  {googleLoading ? 'Redirecting...' : (
                    <>
                      <img src="https://www.svgrepo.com/show/475656/google-color.svg" style={{ width: '1.25rem', height: '1.25rem' }} alt="Google" />
                      <span>Google</span>
                    </>
                  )}
                </button>
              </>
            )}
          </form>

          <p style={{ marginTop: '2rem', textAlign: 'center', fontSize: '0.875rem', color: 'var(--text-2)' }}>
            {mode === 'login' ? "Don't have an account? " : (mode === 'register' ? "Already have an account? " : "Back to ")}
            <button type="button" onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setForm({name:'', email:'', password:''}); }} style={{ color: 'var(--yellow)', fontWeight: 'bold', background: 'none', border: 'none', cursor: 'pointer' }}>
              {mode === 'login' ? 'Sign up' : 'Log In'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
