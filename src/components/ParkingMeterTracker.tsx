import React, { useState, useEffect } from 'react';
import { AlertCircle, MapPin, RefreshCcw, Plus, Minus } from 'lucide-react';
import bounceLogo from '../assets/BOUNCE logo wht.png';

export default function ParkingMeterTracker() {
  const [parkedLocation, setParkedLocation] = useState(false);
  const [targetTime, setTargetTime] = useState<number | null>(null);
  const [minutesLeft, setMinutesLeft] = useState(0); 
  const [walkingTime, setWalkingTime] = useState(8);
  const [isAlarmActive, setIsAlarmActive] = useState(false);

  // 1. Request Notification Permission when the session starts
  const startSession = () => {
    if ("Notification" in window) {
      Notification.requestPermission();
    }
    
    const initialMins = 15;
    setParkedLocation(true);
    setMinutesLeft(initialMins);
    setTargetTime(Date.now() + initialMins * 60000);
    setIsAlarmActive(false);
  };

  // Logic to adjust time while active
  const adjustTime = (amount: number) => {
    setMinutesLeft(prev => {
      const newMins = Math.max(0, prev + amount);
      if (parkedLocation) {
        setTargetTime(Date.now() + newMins * 60000);
      }
      return newMins;
    });
  };

  // HEARTBEAT: Syncs time even if the phone screen goes dark
  useEffect(() => {
    let interval: number | undefined;

    if (parkedLocation && targetTime) {
      interval = window.setInterval(() => {
        const now = Date.now();
        const difference = targetTime - now;
        const remaining = Math.max(0, Math.ceil(difference / 60000));
        
        setMinutesLeft(remaining);

        if (remaining <= 0) {
          clearInterval(interval);
        }
      }, 1000);
    }

    return () => clearInterval(interval);
  }, [parkedLocation, targetTime]);

  // ALARM, VIBRATION & POP-UP LOGIC
  useEffect(() => {
    if (parkedLocation) {
      // Trigger when we hit the exact walking time
      if (minutesLeft === walkingTime) {
        // TRIGGER SYSTEM POP-UP
        if ("Notification" in window && Notification.permission === "granted") {
          new Notification("BOUNCE", {
            body: `Time to walk back! You have ${minutesLeft}m left.`,
            icon: '/notification-icon.png', 
            badge: '/notification-icon.png',
            silent: false,
            requireInteraction: true 
          });
        }
        
        // Haptic Heartbeat
        if ("vibrate" in navigator) {
          navigator.vibrate([500, 200, 500]);
        }
        setIsAlarmActive(true);
      } 
      // Keep alarm active if we are below walking time
      else if (minutesLeft < walkingTime) {
        setIsAlarmActive(true);
      } 
      else {
        setIsAlarmActive(false);
      }
    }
  }, [minutesLeft, parkedLocation, walkingTime]);

  return (
    <div className={`min-h-screen flex flex-col items-center justify-center p-6 transition-all duration-500 
      ${isAlarmActive ? 'bg-red-900 animate-pulse text-white' : 'bg-zinc-950 text-white'}`}>
      
      <div className="mb-12">
        <img src={bounceLogo} alt="BOUNCE Logo" className="h-20 w-auto object-contain opacity-100" />
      </div>

      {!parkedLocation ? (
        <div className="flex flex-col items-center gap-6">
          <button 
            onClick={startSession} 
            className="group relative flex flex-col items-center justify-center gap-4 aspect-square h-56 rounded-full border-2 border-zinc-700 hover:border-blue-500 transition-all duration-500"
          >
            <div className="absolute inset-0 bg-blue-500/10 rounded-full blur-xl group-hover:bg-blue-500/20 transition-all" />
            <MapPin size={48} className="text-zinc-400 group-hover:text-blue-500 transition-colors" />
            <span className="font-bold uppercase tracking-widest text-[11px] text-zinc-200 group-hover:text-blue-300 w-2/3 text-center">
              Set Meter Location
            </span>
          </button>
        </div>
      ) : (
        <div className="w-full max-w-sm flex flex-col items-center space-y-12">
          
          <div className="relative flex flex-col items-center w-full">
            <p className="text-[10px] uppercase tracking-[0.4em] mb-2 text-white/60 font-bold">Meter Time</p>
            
            <div className={`text-[10rem] font-black leading-none tabular-nums tracking-tighter text-white transition-all duration-500 ${isAlarmActive ? 'scale-110' : 'scale-100'}`}>
              {minutesLeft}<span className="text-3xl text-white/40 ml-1">m</span>
            </div>

            <div className="flex gap-4 mt-8">
              <button 
                onClick={() => adjustTime(-15)} 
                className="flex items-center gap-2 px-10 py-4 rounded-2xl bg-zinc-900 border border-zinc-800 active:scale-95 transition-all hover:bg-zinc-800"
              >
                <Minus size={16} className="text-white/40" />
                <span className="text-sm font-black">15m</span>
              </button>

              <button 
                onClick={() => adjustTime(15)} 
                className="flex items-center gap-2 px-10 py-4 rounded-2xl bg-zinc-900 border border-zinc-800 active:scale-95 transition-all hover:bg-zinc-800"
              >
                <Plus size={16} className="text-white/40" />
                <span className="text-sm font-black">15m</span>
              </button>
            </div>

            {isAlarmActive && (
              <div className="absolute -top-10 text-white drop-shadow-lg">
                <AlertCircle size={40} />
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-12 w-full border-t border-white/10 pt-10">
            <div className="text-center border-r border-white/10">
              <p className="text-[9px] uppercase tracking-widest mb-1 text-white/50 font-bold">Walk Back</p>
              <p className="text-3xl font-black text-white">{walkingTime}m</p>
            </div>
            <div className="text-center">
              <p className="text-[9px] uppercase tracking-widest mb-1 text-white/50 font-bold">Safe Window</p>
              <p className={`text-3xl font-black ${isAlarmActive ? 'text-white' : 'text-blue-400'}`}>
                {Math.max(0, minutesLeft - walkingTime)}m
              </p>
            </div>
          </div>

          <div className="h-10 flex items-center justify-center text-center">
            {isAlarmActive ? (
              <p className="text-white font-black uppercase text-sm tracking-[0.2em]">Move Car Now</p>
            ) : (
              <p className="text-blue-400 font-bold uppercase text-[11px] tracking-[0.2em]">Safe Zone</p>
            )}
          </div>
          
          <button 
            onClick={() => {setParkedLocation(false); setTargetTime(null); setIsAlarmActive(false);}} 
            className="flex items-center gap-3 px-8 py-4 rounded-full bg-black/20 hover:bg-black/40 transition-all border border-white/10"
          >
            <RefreshCcw size={14} className="text-white/40" />
            <span className="text-[10px] uppercase tracking-[0.2em] text-white/40 font-bold">Reset Session</span>
          </button>
        </div>
      )}
    </div>
  );
}