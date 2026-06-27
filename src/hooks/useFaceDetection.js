import { useRef, useState, useCallback, useEffect } from 'react';
import * as faceapi from 'face-api.js';

const MODEL_URL = 'https://cdn.jsdelivr.net/gh/justadudewhohacks/face-api.js@master/weights';

export function useFaceDetection() {
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [frames, setFrames] = useState([]);
  const intervalRef = useRef(null);
  const isRunningRef = useRef(false);

  useEffect(() => {
    async function loadModels() {
      try {
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
          faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL),
        ]);
        setModelsLoaded(true);
      } catch {
        // Silently fail — emotion detection becomes optional
        setModelsLoaded(false);
      }
    }
    loadModels();
    return () => stopDetection();
  }, []);

  const startDetection = useCallback((videoRef) => {
    if (!modelsLoaded || !videoRef?.current) return;
    isRunningRef.current = true;
    setFrames([]);

    intervalRef.current = setInterval(async () => {
      if (!isRunningRef.current || !videoRef?.current) return;
      try {
        const detection = await faceapi
          .detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions())
          .withFaceExpressions();
        if (detection?.expressions) {
          setFrames(prev => [...prev, { ...detection.expressions, ts: Date.now() }]);
        }
      } catch { /* ignore frame errors */ }
    }, 2000);
  }, [modelsLoaded]);

  const stopDetection = useCallback(() => {
    isRunningRef.current = false;
    if (intervalRef.current) clearInterval(intervalRef.current);
  }, []);

  const getFrames = useCallback(() => frames, [frames]);

  return { modelsLoaded, frames, startDetection, stopDetection, getFrames };
}
