
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
    let intervalId: number | null = null;

    const startCamera = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }
        });
        
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          setIsScanning(true);
        }

        // Usar BarcodeDetector si está disponible (Nativo en Android Chrome)
        if ('BarcodeDetector' in window) {
          const barcodeDetector = new (window as any).BarcodeDetector({
            formats: ['ean_13', 'ean_8', 'code_128', 'code_39', 'qr_code', 'upc_a']
          });

          const detect = async () => {
            if (videoRef.current && videoRef.current.readyState === 4) {
              try {
                const barcodes = await barcodeDetector.detect(videoRef.current);
                if (barcodes.length > 0) {
                  onScan(barcodes[0].rawValue);
                  stopCamera();
                }
              } catch (e) {
                console.error("Detection error:", e);
              }
            }
            if (isScanning) requestAnimationFrame(detect);
          };
          detect();
        } else {
          setError("Tu navegador no soporta escaneo nativo. Intenta usar Chrome en Android.");
        }
      } catch (err) {
        setError("No se pudo acceder a la cámara. Asegúrate de dar los permisos.");
      }
    };

    const stopCamera = () => {
      setIsScanning(false);
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      if (intervalId) clearInterval(intervalId);
    };

    startCamera();

    return () => stopCamera();
  }, [onScan]);

  return (
    <div className="fixed inset-0 bg-black z-[300] flex flex-col items-center justify-center p-6 animate-fadeIn">
      <div className="relative w-full max-w-sm aspect-[3/4] bg-gray-900 rounded-[40px] overflow-hidden shadow-2xl border-4 border-white/10">
        <video 
          ref={videoRef} 
          autoPlay 
          playsInline 
          className="w-full h-full object-cover"
        />
        
        {/* Visor de escaneo */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className="w-64 h-40 border-2 border-blue-500 rounded-3xl relative">
            <div className="absolute inset-0 bg-blue-500/10 animate-pulse rounded-3xl"></div>
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[2px] bg-blue-400 shadow-[0_0_15px_rgba(96,165,250,0.8)] animate-scannerLoop"></div>
          </div>
          <p className="mt-8 text-white font-black text-xs uppercase tracking-[0.2em] bg-black/40 px-4 py-2 rounded-full backdrop-blur-md">
            Enfoca el código de barras
          </p>
        </div>

        {error && (
          <div className="absolute inset-0 bg-rose-600/90 flex flex-col items-center justify-center text-white p-10 text-center">
            <span className="text-4xl mb-4">⚠️</span>
            <p className="font-bold">{error}</p>
            <button onClick={onClose} className="mt-6 px-6 py-2 bg-white text-rose-600 rounded-xl font-black text-xs uppercase">Cerrar</button>
          </div>
        )}
      </div>

      <button 
        onClick={onClose}
        className="mt-10 w-16 h-16 bg-white/10 backdrop-blur-xl border border-white/20 text-white rounded-full flex items-center justify-center text-2xl hover:bg-white/20 transition-all"
      >
        ✕
      </button>

      <style>{`
        @keyframes scannerLoop {
          0% { top: 0; }
          50% { top: 100%; }
          100% { top: 0; }
        }
        .animate-scannerLoop {
          animation: scannerLoop 2s infinite ease-in-out;
        }
      `}</style>
    </div>
  );
};

export default BarcodeScanner;
