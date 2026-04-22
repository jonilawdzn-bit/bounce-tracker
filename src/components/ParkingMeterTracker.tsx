import { useState, useEffect } from 'react';
import { Timer, MapPin, AlertCircle, CheckCircle2 } from 'lucide-react';

const ParkingMeterTracker = () => {
  const [timeLeft, setTimeLeft] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [duration, setDuration] = useState(30);
  const [walkingTime] = useState(5); // Removed 'setWalkingTime' to fix TS error

  useEffect(() => {
    let interval: number | undefined;
    if (isActive && timeLeft > 0) {
      interval = window.setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (timeLeft === 0) {
      setIsActive(false);
      if (interval) clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [isActive, timeLeft]);

  const startTimer = () => {
    setTimeLeft(duration * 60);
    setIsActive(true);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-900 text-white p-6 font-sans">
      <div className="w-full max-w-md bg-slate-800 rounded-3xl shadow-2xl p-8 border border-slate-700">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold tracking-tight">Bounce Tracker</h1>
          <div className="bg-blue-500/20 p-2 rounded-xl">
            <Timer className="text-blue-400" size={24} />
          </div>
        </div>

        <div className="relative flex flex-col items-center justify-center my-12">
          <div className="text-6xl font-mono font-black mb-2 tabular-nums">
            {formatTime(timeLeft)}
          </div>
          <div className="text-slate-400 uppercase tracking-widest text-sm font-semibold">
            Remaining
          </div>
        </div>

        {!isActive ? (
          <div className="space-y-6">
            <div>
              <label className="block text-slate-400 mb-2 text-sm font-medium">Set Duration (Minutes)</label>
              <input
                type="range"
                min="1"
                max="120"
                value={duration}
                onChange={(e) => setDuration(parseInt(e.target.value))}
                className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
              />
              <div className="flex justify-between mt-2 text-xl font-bold">
                <span>{duration} min</span>
              </div>
            </div>
            
            <button
              onClick={startTimer}
              className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 rounded-2xl transition-all transform active:scale-95 shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2"
            >
              Start Session
            </button>
          </div>
        ) : (
          <div className="space-y-4">
             <div className={`p-4 rounded-2xl flex items-center gap-4 border ${
              timeLeft < (walkingTime * 60) ? 'bg-red-500/10 border-red-500/50' : 'bg-green-500/10 border-green-500/50'
            }`}>
              {timeLeft < (walkingTime * 60) ? (
                <>
                  <AlertCircle className="text-red-400" />
                  <div>
                    <p className="font-bold text-red-400">Time to Bounce!</p>
                    <p className="text-xs text-red-300/80">You need {walkingTime} mins to walk back.</p>
                  </div>
                </>
              ) : (
                <>
                  <CheckCircle2 className="text-green-400" />
                  <div>
                    <p className="font-bold text-green-400">You're Good</p>
                    <p className="text-xs text-green-300/80">Plenty of time to wander.</p>
                  </div>
                </>
              )}
            </div>

            <button
              onClick={() => setIsActive(false)}
              className="w-full bg-slate-700 hover:bg-slate-600 text-white font-bold py-4 rounded-2xl transition-all"
            >
              Cancel
            </button>
          </div>
        )}

        <div className="mt-8 pt-8 border-t border-slate-700 flex items-center gap-3 text-slate-400">
          <MapPin size={18} />
          <p className="text-sm">Active at Main St. Meter #402</p>
        </div>
      </div>
    </div>
  );
};

export default ParkingMeterTracker;