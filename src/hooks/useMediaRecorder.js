import { useRef, useState, useCallback } from 'react';

export function useMediaRecorder() {
  const mediaRecorderRef = useRef(null);
  const streamRef = useRef(null);
  const chunksRef = useRef([]);
  const [isRecording, setIsRecording] = useState(false);
  const [blobUrl, setBlobUrl] = useState(null);
  const [error, setError] = useState(null);

  const startRecording = useCallback(async (videoRef) => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      streamRef.current = stream;
      if (videoRef?.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.muted = true;
        videoRef.current.play().catch(() => {});
      }

      chunksRef.current = [];
      const recorder = new MediaRecorder(stream, { mimeType: getSupportedMime() });
      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType });
        setBlobUrl(URL.createObjectURL(blob));
      };
      recorder.start(200);
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
    } catch (err) {
      setError(err.message || 'Could not access camera/microphone.');
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
    }
    setIsRecording(false);
  }, []);

  const getStream = useCallback(() => streamRef.current, []);

  return { isRecording, blobUrl, error, startRecording, stopRecording, getStream };
}

function getSupportedMime() {
  const types = ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm', 'video/mp4'];
  return types.find(t => MediaRecorder.isTypeSupported(t)) || '';
}
