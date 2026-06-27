import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { dbService } from '../services/dbService';
import { storageService } from '../services/storageService';
import { generateFeedback, getNextInterviewQuestion } from '../services/geminiService';
import { useMediaRecorder } from '../hooks/useMediaRecorder';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';
import { useFaceDetection } from '../hooks/useFaceDetection';
import { analyzeTranscript, aggregateSpeechMetrics } from '../utils/speechAnalyzer';
import { aggregateEmotions, aggregateSessionEmotions } from '../utils/emotionAggregator';
import toast from 'react-hot-toast';
import Editor from '@monaco-editor/react';
import { motion, AnimatePresence } from 'framer-motion';

// ── Typing Text Effect ───────────────────────────────────────────────────────
function TypingText({ text }) {
  const [displayed, setDisplayed] = useState('');
  useEffect(() => {
    setDisplayed('');
    let i = 0;
    const interval = setInterval(() => {
      setDisplayed(text.slice(0, i + 1));
      i++;
      if (i >= text.length) clearInterval(interval);
    }, 15);
    return () => clearInterval(interval);
  }, [text]);
  return <span>{displayed}</span>;
}

// ── Sound wave visualizer ────────────────────────────────────────────────────
function SoundWave({ active }) {
  if (!active) return <div style={{ height: 28 }} />;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 3, height: 28 }}>
      {[1,1.6,0.8,1.4,1,1.8,0.9,1.5].map((h, i) => (
        <div key={i} className="wave-bar" style={{
          height: `${h * 14}px`,
          animationDelay: `${i * 0.08}s`,
          opacity: 0.9,
          background: 'var(--blue)'
        }} />
      ))}
    </div>
  );
}

function PageCenter({ children }) {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, background: 'var(--bg)' }}>
      {children}
    </div>
  );
}

function buildFallbackReport(role, responses, speechMetrics, emotionData) {
  const wordCount = responses.reduce((a, r) => a + r.split(/\s+/).filter(Boolean).length, 0);
  const baseScore = Math.min(100, Math.max(30, 60 + Math.round(wordCount / 10) - speechMetrics.fillerCount * 2));
  return {
    overallScore: baseScore,
    confidenceScore: emotionData.interviewContext?.confidence || 65,
    communicationScore: speechMetrics.fluencyScore || 70,
    fluencyScore: speechMetrics.fluencyScore || 70,
    technicalScore: baseScore - 5,
    strengths: ['Completed all questions', 'Maintained composure', 'Provided structured answers'],
    weaknesses: [
      speechMetrics.fillerCount > 5 ? 'High usage of filler words' : 'Could elaborate more',
      speechMetrics.avgWpm < 100 ? 'Speaking pace was slow' : 'Could be more concise',
    ],
    suggestions: [
      'Review the STAR method for behavioral questions',
      'Practice in front of a mirror to improve non-verbal cues',
    ],
    questionFeedback: responses.map((r, i) => ({
      question: `Question ${i + 1}`,
      score: r.split(/\s+/).length > 20 ? 70 : 50,
      feedback: r.split(/\s+/).length > 20 ? 'Good detail provided.' : 'Try to elaborate more with examples.',
    })),
    summary: `You completed a ${role} mock interview with ${responses.length} questions. Focus on reducing filler words and using more specific examples.`,
  };
}

export default function InterviewRoomPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [session, setSession] = useState(null);
  const [step, setStep] = useState('loading');
  const [qIndex, setQIndex] = useState(0);
  const [responses, setResponses] = useState([]);
  const [speechMetrics, setSpeechMetrics] = useState([]);
  const [emotionsByQ, setEmotionsByQ] = useState([]);
  const [timeLeft, setTimeLeft] = useState(0);
  const [qStartTime, setQStartTime] = useState(null);
  const [currentFrames, setCurrentFrames] = useState([]);
  
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [hasSpoken, setHasSpoken] = useState(false);
  
  const [isAnswering, setIsAnswering] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isFetchingQuestion, setIsFetchingQuestion] = useState(false);
  const [conversationHistory, setConversationHistory] = useState([]);

  const [activeTab, setActiveTab] = useState('conversation');
  const [code, setCode] = useState('// Write your solution here\nfunction solution() {\n  \n}');
  const [codeLang, setCodeLang] = useState('javascript');
  const [codeOutput, setCodeOutput] = useState('');
  const [isCodeRunning, setIsCodeRunning] = useState(false);

  const videoRef = useRef(null);
  const timerRef = useRef(null);
  const synthRef = useRef(null);
  const [elevenLabsAudio, setElevenLabsAudio] = useState(null);

  const { isRecording, error: recError, startRecording, stopRecording, getStream } = useMediaRecorder();
  const { transcript, isListening, supported: speechSupported, startListening, stopListening, resetTranscript } = useSpeechRecognition();
  const { modelsLoaded, startDetection, stopDetection, frames } = useFaceDetection();

  // Load session from DB
  useEffect(() => {
    (async () => {
      try {
        const s = await dbService.getSession(id).catch(() => storageService.getSession(id));
        if (!s || s.userId !== user?.id) { navigate('/dashboard'); return; }
        
        setSession(s);
        setTimeLeft(s.timeLeft !== undefined ? s.timeLeft : s.duration * 60);
        
        if (s.questions && s.questions.length > 0) {
           setConversationHistory(s.conversationHistory || []);
           setResponses(s.responses || []);
           setSpeechMetrics(s.speechMetrics || []);
           setEmotionsByQ(s.emotionFrames || []);
           
           if ((s.responses || []).length === s.questions.length) {
             setQIndex(s.questions.length); 
           } else {
             setQIndex(s.questions.length - 1);
           }
        }
        
        setStep('permission');
      } catch {
        navigate('/dashboard');
      }
    })();
  }, [id, user, navigate]);

  useEffect(() => { setCurrentFrames([...frames]); }, [frames]);

  // Constantly attach camera stream if step is active or ready
  useEffect(() => {
    const stream = getStream();
    if (videoRef.current && stream && step !== 'processing') {
      if (videoRef.current.srcObject !== stream) {
        videoRef.current.srcObject = stream;
        videoRef.current.muted = true;
        videoRef.current.play().catch(() => {});
      }
    }
  }, [step, getStream]);

  // Reset states when question changes
  useEffect(() => {
    setIsAnswering(false);
    setIsSpeaking(false);
    setHasSpoken(false);
    if (synthRef.current) window.speechSynthesis.cancel();
    if (elevenLabsAudio) {
      elevenLabsAudio.pause();
      elevenLabsAudio.currentTime = 0;
    }
  }, [qIndex]);

  // Timer logic
  useEffect(() => {
    if (step !== 'active' || isPaused) return;
    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) { clearInterval(timerRef.current); handleEnd(); return 0; }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [step, isPaused]);

  // Autosave periodically
  useEffect(() => {
    if (step !== 'active' || isPaused || !session) return;
    const intv = setInterval(() => {
      const updated = { ...session, timeLeft };
      setSession(updated);
      dbService.saveSession(updated).catch(() => storageService.saveSession(updated));
    }, 10000);
    return () => clearInterval(intv);
  }, [step, isPaused, session, timeLeft]);

  const fmt = s => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  const handleGrantPermission = async () => {
    await startRecording(videoRef);
    if (recError) { toast.error(recError); return; }
    setStep('ready');
  };

  const saveSessionState = async (updates) => {
    const updated = { ...session, ...updates, timeLeft };
    setSession(updated);
    try { await dbService.saveSession(updated); } catch { storageService.saveSession(updated); }
  };

  const fetchAIQuestion = async (historyContext) => {
    setIsFetchingQuestion(true);
    try {
      const { question, shouldEnd } = await getNextInterviewQuestion({
        role: session.role,
        duration: session.duration,
        resumeFile: session.resumeFile,
        conversationHistory: historyContext
      });
      return { question, shouldEnd };
    } catch (e) {
      toast.error('AI connection poor: Using fallback question.');
      return { question: 'Please tell me more about your experience and background.', shouldEnd: false };
    } finally {
      setIsFetchingQuestion(false);
    }
  };

  const beginInterview = async () => {
    setStep('active');
    startDetection(videoRef);
    
    if (session.questions.length > 0 && qIndex === session.questions.length) {
      const { question, shouldEnd } = await fetchAIQuestion(conversationHistory);
      if (shouldEnd) { handleEnd(null); return; }
      const newQs = [...session.questions, question];
      const newHistory = [...conversationHistory, { role: 'model', text: question }];
      
      setConversationHistory(newHistory);
      await saveSessionState({ questions: newQs, conversationHistory: newHistory });
      toast.success('Resumed interview! 🤖');
      return;
    }
    
    if (session.questions.length === 0) {
      const { question } = await fetchAIQuestion([]);
      const newQs = [question];
      const newHistory = [{ role: 'model', text: question }];
      
      setConversationHistory(newHistory);
      await saveSessionState({ questions: newQs, conversationHistory: newHistory });
      toast.success('Interview started! 🤖');
    }
  };

  const speakQuestion = useCallback(async () => {
    if (!session || !session.questions[qIndex]) return;
    if (isSpeaking) {
      window.speechSynthesis.cancel();
      if (elevenLabsAudio) { elevenLabsAudio.pause(); elevenLabsAudio.currentTime = 0; }
      setIsSpeaking(false);
      return;
    }
    
    const q = session.questions[qIndex];
    const key = localStorage.getItem('ELEVENLABS_API_KEY');
    
    if (key) {
      try {
        setIsSpeaking(true); setHasSpoken(true);
        const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/21m00Tcm4TlvDq8ikWAM`, {
          method: 'POST',
          headers: { 'xi-api-key': key, 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            text: q, 
            model_id: "eleven_multilingual_v2",
            voice_settings: {
              stability: 0.4,
              similarity_boost: 0.85,
              style: 0.0,
              use_speaker_boost: true
            }
          })
        });
        const blob = await response.blob();
        const audio = new Audio(URL.createObjectURL(blob));
        setElevenLabsAudio(audio);
        audio.onended = () => setIsSpeaking(false);
        audio.play();
        return;
      } catch(e) {
        console.error('ElevenLabs failed, falling back', e);
      }
    }

    // Fallback to Native TTS
    window.speechSynthesis.cancel();
    const utt = new SpeechSynthesisUtterance(q);
    utt.rate = 0.95;
    utt.pitch = 1.0;
    
    const voices = window.speechSynthesis.getVoices();
    // Prioritize natural sounding, premium, or online voices
    let preferred = voices.find(v => v.lang.startsWith('en') && (v.name.includes('Natural') || v.name.includes('Online') || v.name.includes('Premium') || v.name.includes('Google')));
    if (!preferred) {
      preferred = voices.find(v => v.lang.startsWith('en') && (v.name.includes('Zira') || v.name.includes('Samantha')));
    }
    if (!preferred) {
      preferred = voices.find(v => v.lang.startsWith('en'));
    }
    if (preferred) utt.voice = preferred;
    
    utt.onstart = () => { setIsSpeaking(true); setHasSpoken(true); };
    utt.onend = () => { setIsSpeaking(false); };
    utt.onerror = () => { setIsSpeaking(false); };
    
    synthRef.current = utt;
    window.speechSynthesis.speak(utt);
  }, [session, qIndex, isSpeaking, elevenLabsAudio]);

  const startAnswer = useCallback(() => {
    setIsAnswering(true);
    setQStartTime(Date.now());
    if (speechSupported) startListening();
  }, [speechSupported, startListening]);

  const runCode = async () => {
    setIsCodeRunning(true);
    setCodeOutput('Running...');
    try {
      const langMap = {
        javascript: { language: 'javascript', version: '18.15.0' },
        python: { language: 'python', version: '3.10.0' },
        cpp: { language: 'c++', version: '10.2.0' },
        java: { language: 'java', version: '15.0.2' },
        go: { language: 'go', version: '1.16.2' },
      };
      const req = { language: langMap[codeLang].language, version: langMap[codeLang].version, files: [{ content: code }] };
      const res = await fetch('https://emkc.org/api/v2/piston/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(req)
      });
      const data = await res.json();
      if (data.run && data.run.output) {
        setCodeOutput(data.run.output);
      } else if (data.compile && data.compile.output) {
        setCodeOutput(data.compile.output);
      } else {
        setCodeOutput('No output returned.');
      }
    } catch (err) {
      setCodeOutput('Error executing code: ' + err.message);
    } finally {
      setIsCodeRunning(false);
    }
  };

  const captureCurrentAnswer = useCallback(() => {
    const text = stopListening() || transcript;
    const elapsed = (Date.now() - (qStartTime || Date.now())) / 1000;
    const metrics = analyzeTranscript(text, elapsed);
    const emotion = aggregateEmotions(currentFrames);
    return { text, metrics, emotion, code, codeOutput };
  }, [transcript, qStartTime, currentFrames, stopListening, code, codeOutput]);

  const handleNextQuestion = async () => {
    const ans = captureCurrentAnswer();
    
    const newResponses = [...responses, ans.text || '(no answer)'];
    const newMetrics = [...speechMetrics, ans.metrics];
    const newEmotions = [...emotionsByQ, ans.emotion];
    
    setResponses(newResponses);
    setSpeechMetrics(newMetrics);
    setEmotionsByQ(newEmotions);
    
    stopDetection();
    resetTranscript();
    setCurrentFrames([]);
    setIsAnswering(false);
    setCode('// Write your solution here\nfunction solution() {\n  \n}');
    setCodeOutput('');
    
    const newHistory = [...conversationHistory, { role: 'user', text: (ans.text || '(no answer)') + (ans.code ? `\n\nCode written:\n${ans.code}` : '') + (ans.codeOutput ? `\n\nExecution Output:\n${ans.codeOutput}` : '') }];
    setConversationHistory(newHistory);
    
    await saveSessionState({ 
      responses: newResponses, 
      speechMetrics: newMetrics, 
      emotionFrames: newEmotions, 
      conversationHistory: newHistory 
    });
    
    const { question, shouldEnd } = await fetchAIQuestion(newHistory);
    
    if (shouldEnd) {
      handleEnd(null, { finalResponses: newResponses, finalMetrics: newMetrics, finalEmotions: newEmotions });
      return;
    }
    
    const newQs = [...session.questions, question];
    const nextHistory = [...newHistory, { role: 'model', text: question }];
    
    setConversationHistory(nextHistory);
    await saveSessionState({ questions: newQs, conversationHistory: nextHistory });
    
    setQIndex(qIndex + 1);
    startDetection(videoRef);
  };

  const handleEnd = async (capturedAns = null, existingData = null) => {
    clearInterval(timerRef.current);
    window.speechSynthesis.cancel();
    if (elevenLabsAudio) { elevenLabsAudio.pause(); elevenLabsAudio.currentTime = 0; }
    stopRecording();
    stopDetection();
    try { stopListening(); } catch {}
    setStep('processing');

    let finalResponses = existingData ? existingData.finalResponses : [...responses];
    let finalMetrics = existingData ? existingData.finalMetrics : [...speechMetrics];
    let finalEmotions = existingData ? existingData.finalEmotions : [...emotionsByQ];

    if (capturedAns && capturedAns.text !== undefined) {
      finalResponses.push(capturedAns.text || '(no answer)');
      finalMetrics.push(capturedAns.metrics);
      finalEmotions.push(capturedAns.emotion);
    } else if (isAnswering && !existingData) {
      const ans = captureCurrentAnswer();
      finalResponses.push(ans.text || '(no answer)');
      finalMetrics.push(ans.metrics);
      finalEmotions.push(ans.emotion);
    }

    const updatedSession = { ...session, status: 'completed', responses: finalResponses, questions: session.questions, emotionFrames: finalEmotions, speechMetrics: finalMetrics, timeLeft: 0 };
    setSession(updatedSession);
    try { await dbService.saveSession(updatedSession); } catch { storageService.saveSession(updatedSession); }

    setTimeout(async () => {
      try {
        const aggMetrics = aggregateSpeechMetrics(finalMetrics);
        const aggEmotion = aggregateSessionEmotions(finalEmotions);
        let feedback;
        try {
          feedback = await generateFeedback({
            role: session.role,
            questions: session.questions, 
            responses: finalResponses,
            speechMetrics: aggMetrics,
            emotionSummary: aggEmotion.interviewContext,
          });
        } catch {
          feedback = buildFallbackReport(session.role, finalResponses, aggMetrics, aggEmotion);
          toast('AI feedback unavailable — generated analysis from metrics', { icon: '📊' });
        }
        
        const report = {
          sessionId: session.id, userId: user.id, ...feedback,
          speechMetrics: aggMetrics, emotionData: aggEmotion,
          transcript: finalResponses, createdAt: new Date().toISOString(),
        };
        try { await dbService.saveReport(report); } catch { storageService.saveReport(report); }
        
        navigate(`/report/${session.id}`);
      } catch (err) {
        toast.error('Error saving report: ' + err.message);
        navigate('/dashboard');
      }
    }, 200);
  };

  const togglePause = () => {
    setIsPaused(prev => !prev);
    if (!isPaused) {
      if (synthRef.current) window.speechSynthesis.pause();
      if (elevenLabsAudio) elevenLabsAudio.pause();
      if (isAnswering) stopListening();
    } else {
      if (synthRef.current) window.speechSynthesis.resume();
      if (elevenLabsAudio) elevenLabsAudio.play();
      if (isAnswering && speechSupported) startListening();
    }
  };

  if (step === 'loading') return <PageCenter><span className="spinner spinner-lg" /></PageCenter>;

  if (step === 'permission') return (
    <PageCenter>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass" style={{ maxWidth: 440, width: '100%', padding: '44px 40px', textAlign: 'center' }}>
        <div style={{ fontSize: 60, marginBottom: 16 }}>📷</div>
        <h2 style={{ fontSize: 22, fontWeight: 700, margin: '20px 0 10px', fontFamily: 'Sora,sans-serif' }}>Camera & Mic Access</h2>
        <p style={{ color: 'var(--text-2)', fontSize: 14, lineHeight: 1.7, marginBottom: 28 }}>
          We need your camera and microphone for live analysis. All recording stays securely in your browser.
        </p>
        <button className="btn btn-primary btn-lg" style={{ width: '100%' }} onClick={handleGrantPermission}>
          Allow Access & Continue →
        </button>
        <Link to="/setup" className="btn btn-ghost" style={{ marginTop: 10, width: '100%' }}>← Back to Setup</Link>
      </motion.div>
    </PageCenter>
  );

  if (step === 'ready') return (
    <PageCenter>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass" style={{ maxWidth: 520, width: '100%', padding: '32px', textAlign: 'center' }}>
        <div style={{ marginBottom: 20 }}>
          <video ref={videoRef} className="video-feed" style={{ height: 200, width: '100%', objectFit: 'cover' }} autoPlay muted playsInline />
        </div>
        <div style={{ fontSize: 48, marginBottom: 10 }}>🚀</div>
        <h2 style={{ fontSize: 22, fontWeight: 700, margin: '16px 0 8px', fontFamily: 'Sora,sans-serif' }}>
          {session?.questions?.length > 0 ? 'Resume Interview' : 'Ready to Begin'}
        </h2>
        <p style={{ color: 'var(--text-2)', fontSize: 14, marginBottom: 8 }}>
          <strong style={{ color: 'var(--text)' }}>{session?.role}</strong> · AI Adaptive Mode · {fmt(timeLeft)} left
        </p>
        {!speechSupported && (
          <div className="alert alert-warning" style={{ marginBottom: 16, textAlign: 'left' }}>
            ⚠️ Speech recognition not supported. Answers won't be transcribed.
          </div>
        )}
        <button id="begin-interview" className="btn btn-primary btn-lg" style={{ width: '100%', marginTop: 8 }} onClick={beginInterview} disabled={isFetchingQuestion}>
          {isFetchingQuestion ? 'Initializing AI...' : (session?.questions?.length > 0 ? '▶ Resume Session' : '🚀 Begin Interview')}
        </button>
      </motion.div>
    </PageCenter>
  );

  if (step === 'processing') return (
    <PageCenter>
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 72, marginBottom: 20 }}>🧠</div>
        <h2 style={{ fontSize: 20, fontWeight: 700, margin: '20px 0 8px' }}>Generating Your Report</h2>
        <p style={{ color: 'var(--text-2)', fontSize: 14 }}>Analysing your answers with AI…</p>
        <span className="spinner spinner-lg" style={{ margin: '16px auto 0', display: 'block' }} />
      </motion.div>
    </PageCenter>
  );

  if (step !== 'active') return null;

  const q = session.questions[qIndex];
  const pct = 100 - (timeLeft / (session.duration * 60) * 100);
  const urgent = timeLeft < 60;
  
  const liveEmotionObj = aggregateEmotions(currentFrames);
  const liveEmotionTone = liveEmotionObj?.dominant ? liveEmotionObj.dominant.charAt(0).toUpperCase() + liveEmotionObj.dominant.slice(1) : 'Calm';

  const isTechRole = /software|engineer|developer|programmer|coder|data|frontend|backend|fullstack/i.test(session?.role || '');

  return (
    <div className="page" style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: 'transparent' }}>
      {/* Top bar */}
      <div style={{ background: 'var(--bg-card)', borderBottom: '1px solid var(--border)', padding: '12px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <div className="navbar-brand">
          <span className="navbar-brand-icon" style={{ background: '#1890ff', width: 32, height: 32, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, marginRight: 8, padding: 0 }}>🧠</span>InterviewAI
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          {isPaused && <div className="badge badge-warning">PAUSED</div>}
          {isAnswering && !isPaused && <div className="rec-badge"><div className="rec-dot" />REC</div>}
          <div style={{ fontSize: 22, fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: urgent ? 'var(--red)' : 'var(--text)', minWidth: 70, textAlign: 'center' }}>
            {fmt(timeLeft)}
          </div>
          <button className="btn btn-secondary btn-sm" onClick={togglePause}>
            {isPaused ? '▶ Resume' : '⏸ Pause'}
          </button>
          <button className="btn btn-danger btn-sm" onClick={() => handleEnd()}>End Interview</button>
        </div>
      </div>

      <div className="progress" style={{ borderRadius: 0, height: 2, background: 'var(--border)' }}>
        <div className="progress-fill" style={{ width: `${pct}%`, transition: 'width 1s linear', background: urgent ? 'var(--red)' : 'var(--blue)' }} />
      </div>

      {/* Main grid */}
      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 340px', gap: 0, overflow: 'hidden' }}>

        {/* Left: AI Interaction */}
        <div style={{ padding: '32px 40px', display: 'flex', flexDirection: 'column', gap: 24, overflowY: 'auto', position: 'relative' }}>
          
          {isPaused && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)', zIndex: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
               <h2 style={{ color: '#fff', fontSize: 24, fontWeight: 700 }}>Interview Paused</h2>
            </motion.div>
          )}

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 13, color: 'var(--text-2)' }}>Question {qIndex + 1}</span>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              {session.questions.map((_, i) => (
                <div key={i} style={{ width: 8, height: 8, borderRadius: '50%', background: i < qIndex ? 'var(--green)' : i === qIndex ? 'var(--blue)' : 'var(--border)', transition: 'all 0.3s' }} />
              ))}
              {isFetchingQuestion && <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--blue)', animation: 'pulse 1s infinite' }} />}
            </div>
          </div>

          <motion.div layout className="glass" style={{ padding: 32, borderRadius: 'var(--r-xl)', border: '1px solid var(--border)', background: 'var(--bg-card)' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 24 }}>
              <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 70, height: 70, borderRadius: '50%', background: 'var(--blue)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36, color: '#fff' }}>🤖</div>
                <SoundWave active={isSpeaking || isFetchingQuestion} />
              </div>

              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--blue)', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 8 }}>
                  Interviewer · {session.role}
                </div>
                <div style={{ fontSize: 20, lineHeight: 1.5, color: 'var(--text)', fontWeight: 500, minHeight: 60 }}>
                  {isFetchingQuestion ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--text-2)', fontStyle: 'italic' }}>
                      <span className="spinner spinner-sm" /> Preparing next question...
                    </div>
                  ) : (
                    <TypingText text={q || ''} />
                  )}
                </div>

                <div style={{ display: 'flex', gap: 12, marginTop: 24, flexWrap: 'wrap' }}>
                  <button
                    onClick={speakQuestion}
                    className={isSpeaking ? 'btn btn-secondary btn-sm' : 'btn btn-ghost btn-sm'}
                    disabled={isFetchingQuestion || isPaused}
                  >
                    {isSpeaking ? '⏹ Stop Speaking' : '🔊 Hear Question'}
                  </button>

                  {!isAnswering ? (
                    <button
                      onClick={startAnswer}
                      className="btn btn-primary btn-sm"
                      disabled={isFetchingQuestion || isPaused}
                      style={{ padding: '0 20px' }}
                    >
                      🎙️ Start Answering
                    </button>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(239,68,68,0.1)', padding: '6px 16px', borderRadius: 20 }}>
                      <div className="rec-dot" style={{ background: 'var(--red)' }} />
                      <span style={{ fontSize: 13, color: 'var(--red)', fontWeight: 600 }}>Recording Answer…</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </motion.div>

          <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <button 
                className={`btn btn-sm ${activeTab === 'conversation' ? 'btn-primary' : 'btn-ghost'}`} 
                onClick={() => setActiveTab('conversation')}
              >
                📝 Transcript
              </button>
              {isTechRole && (
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <button 
                    className={`btn btn-sm ${activeTab === 'code' ? 'btn-primary' : 'btn-ghost'}`} 
                    onClick={() => setActiveTab('code')}
                  >
                    💻 Code Editor
                  </button>
                  {activeTab === 'code' && (
                    <select 
                      className="form-input" 
                      style={{ padding: '4px 8px', fontSize: 13, height: 'auto', background: 'var(--bg-card)', border: '1px solid var(--border)' }}
                      value={codeLang}
                      onChange={(e) => setCodeLang(e.target.value)}
                    >
                      <option value="javascript">JavaScript</option>
                      <option value="python">Python</option>
                      <option value="cpp">C++</option>
                      <option value="java">Java</option>
                      <option value="go">Go</option>
                    </select>
                  )}
                </div>
              )}
            </div>
            
            <AnimatePresence mode="wait">
              {activeTab === 'conversation' ? (
                <motion.div key="chat" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="glass-flat" style={{ padding: 20, flex: 1, fontSize: 15, lineHeight: 1.6, color: transcript ? 'var(--text)' : 'var(--text-3)' }}>
                  {transcript || (
                    isAnswering
                      ? (speechSupported ? 'Speak clearly into your microphone…' : 'Speech recognition not available.')
                      : 'Your answer transcript will appear here once you start answering.'
                  )}
                </motion.div>
              ) : (
                <motion.div key="code" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} style={{ flex: 1, display: 'flex', flexDirection: 'column', borderRadius: 8, overflow: 'hidden', border: '1px solid var(--border)', minHeight: 400 }}>
                  <div style={{ flex: 1 }}>
                    <Editor 
                      height="100%" 
                      language={codeLang} 
                      theme="vs-dark" 
                      value={code} 
                      onChange={setCode}
                      options={{ minimap: { enabled: false }, fontSize: 14 }}
                    />
                  </div>
                  <div style={{ background: '#1e1e1e', borderTop: '1px solid #333', display: 'flex', flexDirection: 'column', height: 160 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 16px', background: '#252526' }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: '#aaa', textTransform: 'uppercase' }}>Console Output</span>
                      <button onClick={runCode} disabled={isCodeRunning} style={{ background: '#1890ff', color: 'white', border: 'none', padding: '4px 12px', borderRadius: 4, fontSize: 12, fontWeight: 600, cursor: isCodeRunning ? 'not-allowed' : 'pointer', opacity: isCodeRunning ? 0.7 : 1 }}>
                        {isCodeRunning ? 'Running...' : '▶ Run Code'}
                      </button>
                    </div>
                    <div style={{ flex: 1, padding: 12, overflowY: 'auto', fontFamily: 'monospace', fontSize: 13, color: '#d4d4d4', whiteSpace: 'pre-wrap' }}>
                      {codeOutput || 'Click "Run Code" to see the output here...'}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div>
            <button 
              className="btn btn-primary btn-lg" 
              style={{ width: '100%' }} 
              onClick={handleNextQuestion} 
              disabled={isFetchingQuestion || isPaused || !isAnswering}
            >
              {!isAnswering ? '🎙️ Click "Start Answering" to enable' : 'Submit Answer & Continue →'}
            </button>
          </div>
        </div>

        {/* Right: Live Camera & Tracking */}
        <div style={{ borderLeft: '1px solid var(--border)', padding: 24, display: 'flex', flexDirection: 'column', gap: 20, background: 'rgba(0,0,0,.15)' }}>
          
          <div style={{ borderRadius: 'var(--r-lg)', overflow: 'hidden', border: '1px solid var(--border)', background: '#000' }}>
             <video ref={videoRef} className="video-feed" autoPlay muted playsInline style={{ height: 'auto', width: '100%', display: 'block' }} />
          </div>

          <div className="glass-flat" style={{ padding: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.5px', color: 'var(--text-2)', marginBottom: 12 }}>
              Real-time Analysis
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13 }}>
                <span style={{ color: 'var(--text-2)' }}>Pacing</span>
                <span style={{ fontWeight: 600 }}>{transcript.split(/\s+/).filter(Boolean).length} words</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13 }}>
                <span style={{ color: 'var(--text-2)' }}>Detected Tone</span>
                <span className="badge badge-primary">{liveEmotionTone}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13 }}>
                <span style={{ color: 'var(--text-2)' }}>Camera</span>
                <span className={`badge ${modelsLoaded ? 'badge-success' : 'badge-warning'}`}>{modelsLoaded ? 'Active' : 'Waking Up'}</span>
              </div>
            </div>
          </div>

          <div className="glass-flat" style={{ padding: 16, flex: 1 }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.5px', color: 'var(--text-2)', marginBottom: 12 }}>
              Tips for Success
            </div>
            <ul style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.8, paddingLeft: 16, margin: 0 }}>
              <li>Use the <strong>STAR</strong> method.</li>
              <li>Keep answers concise (1-2 mins).</li>
              <li>Maintain eye contact.</li>
              {isTechRole && <li>Use the Code Editor for technical questions.</li>}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
