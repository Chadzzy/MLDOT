import { useState, useCallback, useRef } from 'react';

export function useSimulatedSession() {
  const [sessionState, setSessionState] = useState('idle'); // idle, waiting, connected, active
  const [roomCode] = useState(() => String(Math.floor(1000 + Math.random() * 9000)));
  const [timer, setTimer] = useState(0);
  const timerRef = useRef(null);

  const startSession = useCallback(() => {
    setSessionState('waiting');
    setTimeout(() => {
      setSessionState('connected');
      setTimeout(() => {
        setSessionState('active');
        timerRef.current = setInterval(() => setTimer(t => t + 1), 1000);
      }, 800);
    }, 2000);
  }, []);

  const joinSession = useCallback(() => {
    setSessionState('connected');
    setTimeout(() => {
      setSessionState('active');
      timerRef.current = setInterval(() => setTimer(t => t + 1), 1000);
    }, 800);
  }, []);

  const endSession = useCallback(() => {
    clearInterval(timerRef.current);
    setSessionState('idle');
    setTimer(0);
  }, []);

  const formatTimer = () => {
    const mins = Math.floor(timer / 60);
    const secs = timer % 60;
    return `${mins}:${String(secs).padStart(2, '0')}`;
  };

  return { sessionState, roomCode, timer: formatTimer(), startSession, joinSession, endSession };
}
