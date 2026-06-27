import { supabase, supabaseReady } from '../lib/supabase';
import { storageService } from './storageService';

// ── Sessions ───────────────────────────────────────────────────────────────
export const dbService = {

  async getSessions(userId) {
    if (supabaseReady) {
      const { data, error } = await supabase
        .from('interview_sessions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []).map(normalizeSession);
    }
    return storageService.getSessions(userId);
  },

  async getSession(id) {
    if (supabaseReady) {
      const { data, error } = await supabase
        .from('interview_sessions')
        .select('*')
        .eq('id', id)
        .single();
      if (error) throw error;
      return normalizeSession(data);
    }
    return storageService.getSession(id);
  },

  async saveSession(session) {
    if (supabaseReady) {
      const row = denormalizeSession(session);
      const { data, error } = await supabase
        .from('interview_sessions')
        .upsert(row, { onConflict: 'id' })
        .select()
        .single();
      if (error) throw error;
      return normalizeSession(data);
    }
    storageService.saveSession(session);
    return session;
  },

  // ── Reports ──────────────────────────────────────────────────────────────
  async getReports(userId) {
    if (supabaseReady) {
      const { data, error } = await supabase
        .from('reports')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []).map(normalizeReport);
    }
    return storageService.getReports(userId);
  },

  async getReport(sessionId) {
    if (supabaseReady) {
      const { data, error } = await supabase
        .from('reports')
        .select('*')
        .eq('session_id', sessionId)
        .maybeSingle();
      if (error) throw error;
      return data ? normalizeReport(data) : null;
    }
    return storageService.getReport(sessionId);
  },

  async saveReport(report) {
    if (supabaseReady) {
      const row = denormalizeReport(report);
      const { data, error } = await supabase
        .from('reports')
        .upsert(row, { onConflict: 'session_id' })
        .select()
        .single();
      if (error) throw error;
      return normalizeReport(data);
    }
    storageService.saveReport(report);
    return report;
  },
};

// ── Normalizers (snake_case DB → camelCase App) ────────────────────────────
function normalizeSession(s) {
  if (!s) return null;
  return {
    id: s.id,
    userId: s.user_id,
    role: s.role,
    duration: s.duration,
    questionCount: s.question_count,
    questions: s.questions || [],
    responses: s.responses || [],
    speechMetrics: s.speech_metrics || [],
    emotionFrames: s.emotion_frames || [],
    status: s.status,
    createdAt: s.created_at,
  };
}

function denormalizeSession(s) {
  return {
    id: s.id,
    user_id: s.userId,
    role: s.role,
    duration: s.duration,
    question_count: s.questionCount,
    questions: s.questions || [],
    responses: s.responses || [],
    speech_metrics: s.speechMetrics || [],
    emotion_frames: s.emotionFrames || [],
    status: s.status,
    updated_at: new Date().toISOString(),
  };
}

function normalizeReport(r) {
  if (!r) return null;
  return {
    sessionId: r.session_id,
    userId: r.user_id,
    overallScore: r.overall_score,
    confidenceScore: r.confidence_score,
    communicationScore: r.communication_score,
    fluencyScore: r.fluency_score,
    technicalScore: r.technical_score,
    strengths: r.strengths || [],
    weaknesses: r.weaknesses || [],
    suggestions: r.suggestions || [],
    questionFeedback: r.question_feedback || [],
    summary: r.summary,
    speechMetrics: r.speech_metrics,
    emotionData: r.emotion_data,
    transcript: r.transcript || [],
    createdAt: r.created_at,
  };
}

function denormalizeReport(r) {
  return {
    session_id: r.sessionId,
    user_id: r.userId,
    overall_score: r.overallScore,
    confidence_score: r.confidenceScore,
    communication_score: r.communicationScore,
    fluency_score: r.fluencyScore,
    technical_score: r.technicalScore,
    strengths: r.strengths || [],
    weaknesses: r.weaknesses || [],
    suggestions: r.suggestions || [],
    question_feedback: r.questionFeedback || [],
    summary: r.summary,
    speech_metrics: r.speechMetrics,
    emotion_data: r.emotionData,
    transcript: r.transcript || [],
  };
}
