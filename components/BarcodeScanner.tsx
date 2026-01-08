
import React, { useEffect, useRef, useState } from 'react';

interface BarcodeScannerProps {
  onScan: (code: string) => void;
  onClose: () => void;
}

const BarcodeScanner: React.FC<BarcodeScannerProps> = ({ onScan, onClose }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);

  useEffect(() => {
    let stream: MediaStream | null = null;

    const startCamera = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { 
            facingMode: 'environment', 
            width: { ideal: 1280 }, 
            height: { ideal: 720 } 
          }
        });
        
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          setIsScanning(true);
        }

        // Detección nativa optimizada para Android/Chrome
        if ('BarcodeDetector' in window) {
          const barcodeDetector = new (window as any).BarcodeDetector({
            formats: ['ean_13', 'ean_8', 'code_128', 'code_39', 'qr_code', 'upc_a']
          });

          const detect = async () => {
            if (videoRef.current && videoRef.current.readyState === 4 && isScanning) {
              try {
                const barcodes = await barcodeDetector.detect(videoRef.current);
                if (barcodes.length > 0) {
                  // Feedback táctil (Vibración de éxito tipo APK)
                  if ('vibrate' in navigator) {
                    navigator.vibrate(100);
                  }
                  onScan(barcodes[0].rawValue);
                  // No cerramos inmediatamente por si el usuario quiere escanear varios
                }
              } catch (e) {
                console.error("Detection error:", e);
              }
            }
            if (isScanning) requestAnimationFrame(detect);
          };
          detect();
        } else {
          setError("Escaneo nativo no soportado en este navegador. Usa Chrome en Android.");
        }
      } catch (err) {
        setError("Permiso de cámara denegado. Ve a los ajustes de tu Android y permite el acceso a la cámara para esta app.");
      }
    };

    startCamera();

    return () => {
      setIsScanning(false);
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [onScan, isScanning]);

  return (
    <div className="fixed inset-0 bg-black/90 z-[1000] flex flex-col items-center justify-center p-6 animate-fadeIn backdrop-blur-md">
      <div className="relative w-full max-w-sm aspect-[3/4] bg-slate-900 rounded-[48px] overflow-hidden shadow-2xl border-4 border-white/10">
        <video 
          ref={videoRef} 
          autoPlay 
          playsInline 
          className="w-full h-full object-cover"
        />
        
        {/* Interfaz de escaneo visual */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className="w-64 h-48 border-2 border-blue-500 rounded-[32px] relative shadow-[0_0_50px_rgba(37,99,235,0.2)]">
            <div className="absolute inset-0 bg-blue-500/5 animate-pulse rounded-[32px]"></div>
            
            {/* Esquinas del visor */}
            <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-blue-500 rounded-tl-xl"></div>
            <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-blue-500 rounded-tr-xl"></div>
            <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-blue-500 rounded-bl-xl"></div>
            <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-blue-500 rounded-br-xl"></div>

            {/* Línea láser animada */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[90%] h-[2px] bg-blue-400 shadow-[0_0_20px_rgba(96,165,250,1)] animate-scannerLoop"></div>
          </div>
          <p className="mt-10 text-white font-black text-[10px] uppercase tracking-[0.3em] bg-blue-600/80 px-6 py-2.5 rounded-full backdrop-blur-sm border border-white/20">
            Escaneando código...
          </p>
        </div>

        {error && (
          <div className="absolute inset-0 bg-rose-600/95 flex flex-col items-center justify-center text-white p-10 text-center animate-fadeIn">
            <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mb-4 text-3xl">⚠️</div>
            <p className="font-bold text-sm leading-relaxed">{error}</p>
            <button onClick={onClose} className="mt-8 px-8 py-3 bg-white text-rose-600 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg active:scale-95 transition-all">Entendido</button>
          </div>
        )}
      </div>

      <button 
        onClick={onClose}
        className="mt-12 w-16 h-16 bg-white text-slate-900 rounded-full flex items-center justify-center text-2xl shadow-2xl active:scale-90 transition-all border-4 border-white/20"
      >
        ✕
      </button>

      <style>{`
        @keyframes scannerLoop {
          0% { top: 5%; opacity: 0.5; }
          50% { top: 95%; opacity: 1; }
          100% { top: 5%; opacity: 0.5; }
        }
        .animate-scannerLoop {
          animation: scannerLoop 2.5s infinite ease-in-out;
        }
      `}</style>
    </div>
  );
};

export default BarcodeScanner;
