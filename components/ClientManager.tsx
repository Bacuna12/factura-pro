
import React, { useState, useRef } from 'react';
import { Client, User } from '../types';
import { extractClientDataFromId } from '../services/geminiService';
import ConfirmModal from './ConfirmModal';

interface ClientManagerProps {
  user: User;
  clients: Client[];
  onUpdateClients: (clients: Client[]) => void;
}

const ClientManager: React.FC<ClientManagerProps> = ({ user, clients, onUpdateClients }) => {
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [clientToDelete, setClientToDelete] = useState<string | null>(null);
  
  // Estados de Cámara
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const openEditModal = (client: Client) => {
    setEditingClient({ ...client });
    setIsModalOpen(true);
  };

  const openAddModal = () => {
    setEditingClient({
      id: Math.random().toString(36).substr(2, 9),
      name: '', email: '', phone: '', taxId: '', address: '', city: '', municipality: '', zipCode: ''
    });
    setIsModalOpen(true);
  };

  const startCamera = async () => {
    try {
      setIsCameraOpen(true);
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      alert("No se pudo acceder a la cámara. Revisa los permisos.");
      setIsCameraOpen(false);
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
      tracks.forEach(track => track.stop());
    }
    setIsCameraOpen(false);
  };

  const captureAndScan = async () => {
    if (!videoRef.current || !canvasRef.current || !editingClient) return;
    
    setIsScanning(true);
    const context = canvasRef.current.getContext('2d');
    if (!context) return;

    canvasRef.current.width = videoRef.current.videoWidth;
    canvasRef.current.height = videoRef.current.videoHeight;
    context.drawImage(videoRef.current, 0, 0);

    const base64 = canvasRef.current.toDataURL('image/jpeg', 0.8).split(',')[1];
    
    stopCamera();

    const data = await extractClientDataFromId(base64);
    
    if (data.name) {
      setEditingClient({
        ...editingClient,
        name: data.name || editingClient.name,
        taxId: data.taxId || editingClient.taxId,
        address: data.address || editingClient.address,
        city: data.city || editingClient.city
      });
    } else {
      alert("No se pudieron leer datos claros. Intenta de nuevo con mejor iluminación.");
    }
    setIsScanning(false);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingClient) return;
    const exists = clients.find(c => c.id === editingClient.id);
    let newClients = exists 
      ? clients.map(c => c.id === editingClient.id ? editingClient : c)
      : [editingClient, ...clients];
    onUpdateClients(newClients);
    setIsModalOpen(false);
    setEditingClient(null);
  };

  const confirmDelete = () => {
    if (clientToDelete) {
      onUpdateClients(clients.filter(c => c.id !== clientToDelete));
      setClientToDelete(null);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      <ConfirmModal 
        isOpen={!!clientToDelete}
        title="Eliminar Cliente"
        message="¿Estás seguro?"
        onConfirm={confirmDelete}
        onCancel={() => setClientToDelete(null)}
      />

      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight">Clientes</h2>
          <p className="text-gray-500 dark:text-slate-400 font-medium">Gestiona tu base de datos comercial</p>
        </div>
        <button onClick={openAddModal} className="px-6 py-3 bg-blue-600 text-white rounded-2xl font-bold shadow-lg shadow-blue-200 dark:shadow-none hover:bg-blue-700 transition-all flex items-center space-x-2 active:scale-95">
          <span>+</span>
          <span className="text-xs uppercase tracking-widest">Nuevo Cliente</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {clients.map(client => (
          <div key={client.id} className="bg-white dark:bg-slate-900 p-6 rounded-[32px] shadow-sm border border-gray-100 dark:border-slate-800 hover:border-blue-200 dark:hover:border-blue-500 transition-all group relative">
            <div className="flex items-start justify-between mb-4">
              <div className="w-14 h-14 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-2xl flex items-center justify-center font-black text-2xl uppercase">
                {client.name.charAt(0)}
              </div>
              <div className="flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => openEditModal(client)} className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/50 rounded-xl">✏️</button>
                <button onClick={() => setClientToDelete(client.id)} className="p-2 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/50 rounded-xl">🗑️</button>
              </div>
            </div>
            <h3 className="font-black text-xl text-gray-900 dark:text-white truncate mb-1">{client.name}</h3>
            <p className="text-xs font-bold text-blue-600 dark:text-blue-400 truncate mb-1">{client.email || 'Sin correo'}</p>
            <p className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 tracking-widest">{client.phone || 'Sin teléfono'}</p>
            <div className="pt-4 border-t border-gray-50 dark:border-slate-800 mt-4 space-y-1">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">NIT/ID: <span className="text-gray-900 dark:text-white">{client.taxId}</span></p>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest truncate">Dir: <span className="text-gray-900 dark:text-white">{client.address}</span></p>
            </div>
          </div>
        ))}
      </div>

      {isModalOpen && editingClient && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xl z-[120] flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-950 rounded-t-[40px] sm:rounded-[40px] shadow-2xl w-full max-w-xl overflow-hidden animate-slideUp my-auto">
            
            <div className="bg-blue-600 p-8 text-white flex justify-between items-start">
              <div>
                <h3 className="text-2xl font-black">{clients.find(c => c.id === editingClient.id) ? 'Editar Cliente' : 'Nuevo Cliente'}</h3>
                <p className="text-blue-100 font-medium text-xs">Información comercial detallada</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-white/60 hover:text-white text-2xl">✕</button>
            </div>

            <form onSubmit={handleSave} className="p-8 space-y-6">
              
              {!isCameraOpen ? (
                <button 
                  type="button" 
                  onClick={startCamera}
                  className="w-full p-4 bg-emerald-50 dark:bg-emerald-900/20 border-2 border-dashed border-emerald-200 dark:border-emerald-800 rounded-3xl flex items-center justify-center gap-3 text-emerald-600 dark:text-emerald-400 font-black text-xs uppercase tracking-widest hover:bg-emerald-100 transition-all"
                >
                  <span className="text-2xl">📸</span>
                  <span>Escanear Cédula / ID con IA</span>
                </button>
              ) : (
                <div className="relative rounded-[32px] overflow-hidden bg-black aspect-video shadow-2xl">
                  <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
                  <div className="absolute inset-0 border-2 border-white/30 border-dashed m-6 rounded-xl pointer-events-none flex items-center justify-center">
                    <p className="text-[8px] font-black text-white/50 uppercase tracking-[0.3em] bg-black/20 p-2 rounded-full">Encuadra el documento aquí</p>
                  </div>
                  <div className="absolute bottom-4 inset-x-4 flex gap-2">
                    <button type="button" onClick={captureAndScan} disabled={isScanning} className="flex-1 py-4 bg-emerald-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg">
                      {isScanning ? 'Procesando...' : 'Tomar Foto y Extraer'}
                    </button>
                    <button type="button" onClick={stopCamera} className="px-6 py-4 bg-white/10 backdrop-blur-md text-white rounded-2xl font-black text-[10px] uppercase tracking-widest">Cancelar</button>
                  </div>
                </div>
              )}

              <canvas ref={canvasRef} className="hidden" />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-[10px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-widest mb-1 ml-2">Nombre / Razón Social</label>
                  <input required value={editingClient.name} onChange={e => setEditingClient({...editingClient, name: e.target.value})} className="w-full p-4 bg-gray-50 dark:bg-slate-900 dark:text-white border border-gray-100 dark:border-slate-800 rounded-2xl font-bold outline-none focus:ring-2 focus:ring-blue-500" placeholder="Nombre completo" />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-widest mb-1 ml-2">NIT / Identificación</label>
                  <input required value={editingClient.taxId} onChange={e => setEditingClient({...editingClient, taxId: e.target.value})} className="w-full p-4 bg-gray-50 dark:bg-slate-900 dark:text-white border border-gray-100 dark:border-slate-800 rounded-2xl font-bold outline-none focus:ring-2 focus:ring-blue-500" placeholder="Ej. 123456789" />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-widest mb-1 ml-2">Email</label>
                  <input type="email" value={editingClient.email} onChange={e => setEditingClient({...editingClient, email: e.target.value})} className="w-full p-4 bg-gray-50 dark:bg-slate-900 dark:text-white border border-gray-100 dark:border-slate-800 rounded-2xl font-bold outline-none focus:ring-2 focus:ring-blue-500" placeholder="correo@ejemplo.com" />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-widest mb-1 ml-2">Teléfono</label>
                  <input type="tel" value={editingClient.phone} onChange={e => setEditingClient({...editingClient, phone: e.target.value})} className="w-full p-4 bg-gray-50 dark:bg-slate-900 dark:text-white border border-gray-100 dark:border-slate-800 rounded-2xl font-bold outline-none focus:ring-2 focus:ring-blue-500" placeholder="57300..." />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-[10px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-widest mb-1 ml-2">Dirección</label>
                  <input value={editingClient.address} onChange={e => setEditingClient({...editingClient, address: e.target.value})} className="w-full p-4 bg-gray-50 dark:bg-slate-900 dark:text-white border border-gray-100 dark:border-slate-800 rounded-2xl font-bold outline-none focus:ring-2 focus:ring-blue-500" placeholder="Calle / Carrera #..." />
                </div>
              </div>

              <button type="submit" className="w-full py-5 bg-blue-600 text-white rounded-3xl font-black shadow-xl uppercase tracking-widest text-xs active:scale-95 transition-all">Guardar Cliente</button>
            </form>
          </div>
        </div>
      )}

      <style>{`
        @keyframes slideUp { from { opacity: 0; transform: translateY(50px); } to { opacity: 1; transform: translateY(0); } }
        .animate-slideUp { animation: slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
      `}</style>
    </div>
  );
};

export default ClientManager;
