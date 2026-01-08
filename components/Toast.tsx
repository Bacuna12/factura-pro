
import React, { useEffect, useState } from 'react';
import { NotificationType } from '../types';

interface ToastProps {
  message: string;
  type: NotificationType;
  onClose: () => void;
}

const Toast: React.FC<ToastProps> = ({ message, type, onClose }) => {
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    const duration = 3500;
    const interval = 10;
    const step = (interval / duration) * 100;

    const timer = setInterval(() => {
      setProgress((prev) => Math.max(0, prev - step));
    }, interval);

    const closeTimer = setTimeout(onClose, duration);

    return () => {
      clearInterval(timer);
      clearTimeout(closeTimer);
    };
  }, [onClose]);

  const styles = {
    success: 'bg-emerald-600/95 border-emerald-400/30 text-white',
    error: 'bg-rose-600/95 border-rose-400/30 text-white',
    info: 'bg-blue-600/95 border-blue-400/30 text-white'
  };

  const icons = {
    success: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
      </svg>
    ),
    error: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
    ),
    info: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    )
  };

  return (
    <div className={`fixed bottom-24 md:bottom-10 right-4 md:right-10 z-[100000] flex flex-col overflow-hidden min-w-[280px] max-w-sm rounded-[24px] shadow-2xl animate-toastIn backdrop-blur-xl border ${styles[type]}`}>
      <div className="flex items-center gap-4 px-6 py-5">
        <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center shrink-0 shadow-inner">
          {icons[type]}
        </div>
        <div className="flex-1">
          <p className="font-black text-[10px] uppercase tracking-widest leading-none mb-1 opacity-70">
            Sistema de Datos
          </p>
          <p className="font-bold text-xs leading-snug">
            {message}
          </p>
        </div>
        <button onClick={onClose} className="p-2 -mr-2 text-white/40 hover:text-white transition-colors">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      
      {/* Barra de progreso */}
      <div className="h-1 bg-white/10 w-full mt-auto">
        <div 
          className="h-full bg-white/40 transition-all duration-100 ease-linear"
          style={{ width: `${progress}%` }}
        />
      </div>

      <style>{`
        @keyframes toastIn {
          from { transform: translateX(50px) scale(0.9); opacity: 0; }
          to { transform: translateX(0) scale(1); opacity: 1; }
        }
        .animate-toastIn {
          animation: toastIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}</style>
    </div>
  );
};

export default Toast;
