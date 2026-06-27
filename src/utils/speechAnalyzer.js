const FILLER_WORDS = ['um', 'uh', 'like', 'you know', 'literally'];

export function analyzeTranscript(transcript, durationSeconds) {
  if (!transcript || !transcript.trim()) {
    return { wpm: 0, fillerCount: 0, fillerWords: [], pauseCount: 0, fluencyScore: 0, wordCount: 0 };
  }

  const words = transcript.trim().split(/\s+/);
  const wordCount = words.length;
  const durationMinutes = Math.max(durationSeconds / 60, 0.1);
  const wpm = Math.round(wordCount / durationMinutes);

  // Filler word detection
  const lowerText = transcript.toLowerCase();
  const foundFillers = [];
  let fillerCount = 0;
  FILLER_WORDS.forEach(filler => {
    const regex = new RegExp(`\\b${filler}\\b`, 'g');
    const matches = lowerText.match(regex);
    if (matches && matches.length > 0) {
      fillerCount += matches.length;
      foundFillers.push(filler);
    }
  });

  // Fluency: ratio of non-filler words to total, penalized by very slow wpm
  let fluencyScore = wordCount > 0
    ? Math.max(0, Math.round(((wordCount - fillerCount) / wordCount) * 100))
    : 0;
    
  // Only penalize if wpm is extremely slow (< 80)
  if (wpm > 0 && wpm < 80) {
    fluencyScore -= Math.round((80 - wpm) / 3); 
  }
  fluencyScore = Math.max(0, Math.min(100, fluencyScore));

  // Pause estimate from WPM
  const pauseCount = wpm < 80 ? 'high' : wpm < 120 ? 'moderate' : 'low';

  return { wpm, fillerCount, fillerWords: foundFillers, pauseCount, fluencyScore, wordCount };
}

export function aggregateSpeechMetrics(metricsArray) {
  if (!metricsArray.length) return { avgWpm: 0, fillerCount: 0, fillerWords: [], avgPauses: 0, fluencyScore: 0 };

  const totals = metricsArray.reduce((acc, m) => ({
    wpm: acc.wpm + (m.wpm || 0),
    fillerCount: acc.fillerCount + (m.fillerCount || 0),
    fluencyScore: acc.fluencyScore + (m.fluencyScore || 0),
  }), { wpm: 0, fillerCount: 0, fluencyScore: 0 });

  const allFillers = [...new Set(metricsArray.flatMap(m => m.fillerWords || []))];
  const n = metricsArray.length;

  return {
    avgWpm: Math.round(totals.wpm / n),
    fillerCount: totals.fillerCount,
    fillerWords: allFillers,
    avgPauses: Math.round(totals.fillerCount / n),
    fluencyScore: Math.round(totals.fluencyScore / n),
  };
}
