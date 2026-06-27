import { useRef, useState, useCallback, useEffect } from 'react';

export function useSpeechRecognition() {
  const recognitionRef = useRef(null);
  const [transcript, setTranscript] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [supported, setSupported] = useState(true);
  const finalTranscriptRef = useRef('');
  const isListeningRef = useRef(false);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) { setSupported(false); return; }

    const rec = new SpeechRecognition();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = 'en-US';

    rec.onresult = (event) => {
      let interim = '';
      let final = finalTranscriptRef.current;
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) final += event.results[i][0].transcript + ' ';
        else interim += event.results[i][0].transcript;
      }
      finalTranscriptRef.current = final;
      setTranscript(final + interim);
    };

    rec.onerror = (event) => {
      if (event.error === 'no-speech' || event.error === 'network') return;
      setIsListening(false);
      isListeningRef.current = false;
    };
    rec.onend = () => { 
      if (isListeningRef.current) { 
        setTimeout(() => {
          try { rec.start(); } catch { } 
        }, 50);
      } else {
        setIsListening(false);
      }
    };
    recognitionRef.current = rec;
  }, []);

  const startListening = useCallback(() => {
    if (!recognitionRef.current) return;
    finalTranscriptRef.current = '';
    setTranscript('');
    try { 
      recognitionRef.current.start(); 
      setIsListening(true); 
      isListeningRef.current = true;
    } catch { }
  }, []);

  const stopListening = useCallback(() => {
    if (!recognitionRef.current) return;
    isListeningRef.current = false;
    try { recognitionRef.current.stop(); } catch { }
    setIsListening(false);
    return finalTranscriptRef.current.trim();
  }, []);

  const resetTranscript = useCallback(() => {
    finalTranscriptRef.current = '';
    setTranscript('');
  }, []);

  return { transcript, isListening, supported, startListening, stopListening, resetTranscript };
}
