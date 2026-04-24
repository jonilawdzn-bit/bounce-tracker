import { useState, useEffect, useRef, useCallback } from 'react';
import { Plus, Minus, Navigation, Clock, AlertTriangle, MapPin } from 'lucide-react';

const WALK_SPEED_MPS = 1.4;
const TEST_WALK_BUFFER_SECONDS = 120;

function getDistanceMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function postToSW(msg: object) {
  if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
    navigator.serviceWorker.controller.postMessage(msg);
  }
}

const ParkingMeterTracker = () => {
  const [timeLeft, setTimeLeft] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [duration, setDuration] = useState(15);
  const [pinnedCoords, setPinnedCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [showExitWarning, setShowExitWarning] = useState(false);
  const [hasEnded, setHasEnded] = useState(false);
  const [showFindCar, setShowFindCar] = useState(false);
  const [walkBackSeconds, setWalkBackSeconds] = useState(TEST_WALK_BUFFER_SECONDS);

  const endTimeRef = useRef<number | null>(null);
  const watchIdRef = useRef<number | null>(null);
  const lastPinnedRef = useRef<{ lat: number; lng: number } | null>(null);
  const hasEndedRef = useRef(false);
  const wakeLockRef = useRef<any>(null);

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(console.error);
    }
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  const requestWakeLock = async () => {
    if ('wakeLock' in navigator) {
      try {
        wakeLockRef.current = await (navigator as any).wakeLock.request('screen');
      } catch (err) {
        console.warn('WakeLock failed:', err);
      }
    }
  };

  const releaseWakeLock = () => {
    if (wakeLockRef.current) {
      wakeLockRef.current.release();
      wakeLockRef.current = null;
    }
  };

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && isActive) {
        requestWakeLock();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [isActive]);

  useEffect(() => {
    if (!isActive) return;
    const tick = () => {
      if (endTimeRef.current === null) return;
      const remaining = Math.max(0, Math.round((endTimeRef.current - Date.now()) / 1000));
      setTimeLeft(remaining);
      if ((remaining <= walkBackSeconds || remaining <= 300) && remaining > 0) {
        if (remaining === 300) { if ("vibrate" in navigator) navigator.vibrate([200, 100, 200]); }
        setShowFindCar(true);
      }
      if (remaining === 0 && !hasEndedRef.current) {
        hasEndedRef.current = true;
        setIsActive(false);
        setHasEnded(true);
        setShowFindCar(true);
        releaseWakeLock();
        if ('vibrate' in navigator) navigator.vibrate([300, 100, 300, 100, 300]);
      }
    };
    tick();
    const interval = window.setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [isActive, walkBackSeconds]);

  useEffect(() => {
    if (isActive) window.history.pushState({ meter: true }, '');
    const handlePopState = () => {
      if (isActive) {
        setShowExitWarning(true);
        window.history.pushState({ meter: true }, '');
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [isActive]);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isActive) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isActive]);

  const startWatchingPosition = useCallback((pinned: { lat: number; lng: number }) => {
    if (!('geolocation' in navigator)) return;
    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const dist = getDistanceMeters(pinned.lat, pinned.lng, pos.coords.latitude, pos.coords.longitude);
        const rawSeconds = Math.ceil(dist / WALK_SPEED_MPS);
        setWalkBackSeconds(Math.max(rawSeconds, TEST_WALK_BUFFER_SECONDS));
      },
      (err) => console.warn('GPS watch error:', err),
      { enableHighAccuracy: true }
    );
  }, []);

  const stopWatchingPosition = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!isActive) stopWatchingPosition();
  }, [isActive, stopWatchingPosition]);

  const startTimer = () => {
    const durationSeconds = duration * 60;
    const endMs = Date.now() + durationSeconds * 1000;
    endTimeRef.current = endMs;
    hasEndedRef.current = false;
    setTimeLeft(durationSeconds);
    setIsActive(true);
    setHasEnded(false);
    setShowFindCar(false);
    setWalkBackSeconds(TEST_WALK_BUFFER_SECONDS);
    if (lastPinnedRef.current) setPinnedCoords(lastPinnedRef.current);
    requestWakeLock();
    postToSW({ type: 'SCHEDULE_NOTIFICATION', payload: { endMs } });
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (p) => {
          const pinned = { lat: p.coords.latitude, lng: p.coords.longitude };
          setPinnedCoords(pinned);
          lastPinnedRef.current = pinned;
          startWatchingPosition(pinned);
        },
        (e) => console.error('GPS error:', e),
        { enableHighAccuracy: true }
      );
    }
  };

  const cancelTimer = () => {
    setIsActive(false);
    setShowExitWarning(false);
    setTimeLeft(0);
    setShowFindCar(false);
    endTimeRef.current = null;
    hasEndedRef.current = false;
    releaseWakeLock();
    stopWatchingPosition();
    postToSW({ type: 'CANCEL_NOTIFICATIONS' });
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleFindCar = () => {
    if (pinnedCoords) {
      window.open(`https://www.google.com/maps/search/?api=1&query=${pinnedCoords.lat},${pinnedCoords.lng}`, '_blank');
    }
  };

  const isUrgent = timeLeft < 300 && isActive;

  return (
    <div className="relative flex flex-col items-center justify-center min-h-screen bg-[#0f172a] p-6 text-white overflow-hidden">

      {/* EXIT WARNING OVERLAY */}
      {showExitWarning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-950/90 backdrop-blur-md">
          <div className="w-full max-w-xs bg-slate-900 border-2 border-red-500/50 rounded-[2.5rem] p-8 text-center shadow-[0_0_40px_rgba(239,68,68,0.2)]">
            <div className="bg-red-500/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-red-500">
              <AlertTriangle size={32} />
            </div>
            <h2 className="text-2xl font-black mb-2 uppercase tracking-tight">Stop Meter?</h2>
            <p className="text-slate-400 text-sm mb-8 leading-relaxed">Closing the session will lose your pinned location.</p>
            <div className="space-y-3">
              <button onClick={cancelTimer} className="w-full py-4 bg-red-600 hover:bg-red-500 text-white rounded-2xl font-black uppercase tracking-widest transition-colors">
                End Session
              </button>
              <button onClick={() => setShowExitWarning(false)} className="w-full py-4 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-2xl font-bold transition-colors">
                Keep Running
              </button>
            </div>
          </div>
        </div>
      )}

      {/* LOGO + SUBHEAD */}
      <img src="/bounce-logo-wht.png" alt="Bounce" className="h-[50px] mb-2" />
      <p className="text-slate-400 text-xs tracking-[0.3em] font-bold mb-8">Parking Meter Timer</p>

      {/* MAIN CARD */}
      <div className="w-full max-w-sm bg-slate-800 rounded-[2.5rem] p-8 shadow-2xl border border-slate-700">

        {/* DISPLAY */}
        <div className="py-8 mb-8 text-center overflow-hidden">
          <div
            className={`text-6xl font-digital tracking-widest leading-none ${isUrgent ? 'text-red-500 animate-pulse' : hasEnded ? 'text-red-500' : 'text-emerald-400'}`}
            style={{ textShadow: '0 0 12px currentColor' }}
          >
            {formatTime(timeLeft)}
          </div>
          <div className="flex items-center justify-center gap-2 mt-6 text-slate-500 uppercase text-[10px] font-bold tracking-[0.4em]">
            <Clock size={12} className={isActive ? 'animate-spin-slow' : ''} />
            <span>{isActive ? 'Tracking Active' : hasEnded ? 'Time Expired' : 'Ready to Pin'}</span>
          </div>
        </div>

        {!isActive ? (
          <div className="space-y-6">
            {hasEnded && pinnedCoords && (
              <button onClick={handleFindCar} className="w-full py-5 bg-blue-600 hover:bg-blue-500 rounded-2xl font-black text-xl shadow-lg flex items-center justify-center gap-3">
                <MapPin size={24} />
                FIND MY CAR
              </button>
            )}
            <div className="flex items-center justify-between bg-slate-900/50 rounded-2xl p-4 border border-slate-700/50">
              <button onClick={() => setDuration(Math.max(1, duration - 5))} className="p-2 text-slate-400 hover:text-white"><Minus size={24} /></button>
              <div className="text-center leading-none">
                <span className="text-4xl font-bold">{duration}</span>
                <p className="text-[10px] text-slate-500 uppercase mt-1 font-bold">Min</p>
              </div>
              <button onClick={() => setDuration(duration + 5)} className="p-2 text-slate-400 hover:text-white"><Plus size={24} /></button>
            </div>
            <button onClick={startTimer} className="w-full py-5 bg-emerald-600 hover:bg-emerald-500 rounded-2xl font-black text-xl shadow-lg transition-transform active:scale-95">
              {hasEnded ? 'RESTART METER' : 'START METER'}
            </button>
          </div>
        ) : (
          <div className="space-y-4 text-center">
            {showFindCar && pinnedCoords && (
              <button onClick={handleFindCar} className="w-full py-5 bg-blue-600 hover:bg-blue-500 rounded-2xl font-black text-xl shadow-lg flex items-center justify-center gap-3">
                <MapPin size={24} />
                {hasEnded ? 'FIND MY CAR' : 'TIME TO HEAD BACK'}
              </button>
            )}
            <button onClick={() => setShowExitWarning(true)} className="w-full py-5 bg-slate-900 text-red-500 border border-red-900/20 rounded-2xl font-black text-xl hover:bg-red-950/20 transition-all">
              CANCEL
            </button>
            {pinnedCoords && (
              <div className="flex items-center justify-center gap-3 bg-slate-900/40 p-4 rounded-xl border border-slate-700/30">
                <Navigation size={16} className="text-emerald-500 fill-emerald-500/10" />
                <div className="text-left">
                  <p className="text-[10px] text-slate-500 uppercase font-bold leading-none">Location Pinned</p>
                  <p className="text-xs text-slate-300 font-mono mt-1">{pinnedCoords.lat.toFixed(4)}, {pinnedCoords.lng.toFixed(4)}</p>
                </div>
              </div>
            )}
            <div className="text-[10px] text-slate-600 uppercase tracking-widest">
              Walk-back buffer: {Math.ceil(walkBackSeconds / 60)} min
            </div>
          </div>
        )}
      </div>

      {/* FOOTER NOTE */}
      <p className="mt-8 text-center text-white text-[10px] tracking-widest leading-relaxed max-w-xs">
        For optimal use, keep app open and screen active while meter is running
      </p>
    </div>
  );
};

export default ParkingMeterTracker;
