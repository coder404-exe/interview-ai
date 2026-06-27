const EMOTION_LABELS = ['happy', 'sad', 'angry', 'fearful', 'disgusted', 'surprised', 'neutral'];

export function aggregateEmotions(frames) {
  if (!frames || frames.length === 0) {
    return { dominant: 'neutral', scores: {}, confidence: 0, interviewContext: {} };
  }

  const totals = {};
  EMOTION_LABELS.forEach(e => (totals[e] = 0));

  frames.forEach(frame => {
    EMOTION_LABELS.forEach(e => {
      totals[e] += frame[e] || 0;
    });
  });

  const n = frames.length;
  const scores = {};
  EMOTION_LABELS.forEach(e => (scores[e] = Math.round((totals[e] / n) * 100)));

  const dominant = Object.keys(scores).reduce((a, b) => scores[a] > scores[b] ? a : b, 'neutral');
  const confidence = scores[dominant];

  // Map to interview context
  const interviewContext = {
    nervousness: Math.round(((scores.fearful || 0) + (scores.sad || 0)) / 2),
    confidence: Math.round(((scores.happy || 0) + (scores.neutral || 0)) / 2),
    engagement: scores.surprised || 0,
    discomfort: Math.round(((scores.angry || 0) + (scores.disgusted || 0)) / 2),
  };

  return { dominant, scores, confidence, interviewContext };
}

export function aggregateSessionEmotions(emotionResults) {
  if (!emotionResults || emotionResults.length === 0) {
    return { dominant: 'neutral', scores: {}, confidence: 0, interviewContext: {} };
  }
  
  const totals = {};
  EMOTION_LABELS.forEach(e => (totals[e] = 0));
  
  emotionResults.forEach(res => {
    if (res.scores) {
      EMOTION_LABELS.forEach(e => {
        totals[e] += res.scores[e] || 0;
      });
    }
  });

  const n = emotionResults.length;
  const scores = {};
  EMOTION_LABELS.forEach(e => (scores[e] = Math.round(totals[e] / n)));

  const dominant = Object.keys(scores).reduce((a, b) => scores[a] > scores[b] ? a : b, 'neutral');
  const confidence = scores[dominant];

  const interviewContext = {
    nervousness: Math.round(((scores.fearful || 0) + (scores.sad || 0)) / 2),
    confidence: Math.round(((scores.happy || 0) + (scores.neutral || 0)) / 2),
    engagement: scores.surprised || 0,
    discomfort: Math.round(((scores.angry || 0) + (scores.disgusted || 0)) / 2),
  };

  return { dominant, scores, confidence, interviewContext };
}

export function getEmotionColor(emotion) {
  const map = {
    happy: '#10b981',
    neutral: '#6366f1',
    surprised: '#f59e0b',
    fearful: '#ef4444',
    sad: '#64748b',
    angry: '#dc2626',
    disgusted: '#7c3aed',
  };
  return map[emotion] || '#6366f1';
}
