
import React, { useState, useRef } from 'react';
import { Client, User } from '../types';
import { extractClientDataFromId } from '../services/geminiService';
import ConfirmModal from './ConfirmModal';

interface ClientManagerProps {
  user: User;
  clients: Client[];
  onSaveClient: (client: Client) => void;
  onDeleteClient: (id: string) => void;
}

const ClientManager: React.FC<ClientManagerProps> = ({ user, clients, onSaveClient, onDeleteClient }) => {
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [clientToDelete, setClientToDelete] = useState<string | null>(null);
  
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
      tenantId: user.tenantId,
      name: '', 
      email: '', 
      phone: '', 
      taxIdType: 'Cédula',
      taxId: '', 
      address: '', 
      city: '', 
      municipality: '', 
      zipCode: ''
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
      alert("No se pudo acceder a la cámara.");
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
      const cleanTaxId = (data.taxId || '').replace(/\D/g, '');
      setEditingClient({
        ...editingClient,
        name: data.name || editingClient.name,
        taxId: cleanTaxId || editingClient.taxId,
        address: data.address || editingClient.address,
        city: data.city || editingClient.city
      });
    } else {
      alert("No se pudieron leer datos claros.");
    }
    setIsScanning(false);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingClient) return;
    onSaveClient(editingClient);
    setIsModalOpen(false);
    setEditingClient(null);
  };

  const confirmDelete = () => {
    if (clientToDelete) {
      onDeleteClient(clientToDelete);
      setClientToDelete(null);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      <ConfirmModal 
        isOpen={!!clientToDelete}
        title="Eliminar Cliente"
        message="¿Estás seguro de que deseas eliminar este cliente del sistema?"
        onConfirm={confirmDelete}
        onCancel={() => setClientToDelete(null)}
      />

      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight uppercase">Clientes</h2>
          <p className="text-gray-500 dark:text-slate-400 font-medium">Base de datos de compradores y prospectos</p>
        </div>
        <button onClick={openAddModal} className="px-6 py-4 bg-blue-600 text-white rounded-2xl font-black shadow-lg flex items-center space-x-2 active:scale-95 transition-all">
          <span className="text-xl">+</span>
          <span className="text-xs uppercase tracking-widest">Nuevo Cliente</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {clients.map(client => (
          <div key={client.id} className="bg-white dark:bg-slate-900 p-8 rounded-[40px] shadow-sm border border-gray-100 dark:border-slate-800 hover:border-blue-300 transition-all group relative">
            <div className="flex items-start justify-between mb-6">
              <div className="w-16 h-16 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-2xl flex items-center justify-center font-black text-2xl uppercase">
                {client.name.charAt(0)}
              </div>
              <div className="flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => openEditModal(client)} className="p-3 bg-blue-50 text-blue-600 dark:bg-blue-900/30 rounded-xl">✏️</button>
                <button onClick={() => setClientToDelete(client.id)} className="p-3 bg-rose-50 text-rose-600 rounded-xl">🗑️</button>
              </div>
            </div>
            <h3 className="font-black text-xl text-gray-900 dark:text-white truncate mb-1">{client.name}</h3>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">
              {client.taxIdType}: <span className="text-slate-900 dark:text-slate-100">{client.taxId}</span>
            </p>
            
            <div className="space-y-3 pt-4 border-t border-gray-50 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <span className="text-sm opacity-50">📱</span>
                <p className="text-xs font-bold text-gray-600 dark:text-slate-400">{client.phone || 'Sin teléfono'}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm opacity-50">📧</span>
                <p className="text-xs font-bold text-gray-600 dark:text-slate-400 truncate">{client.email || 'Sin correo'}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm opacity-50">📍</span>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-tight truncate">
                  {client.address}, {client.city}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {isModalOpen && editingClient && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xl z-[120] flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-950 rounded-t-[40px] sm:rounded-[48px] shadow-2xl w-full max-w-2xl overflow-hidden animate-slideUp my-auto border border-white/10">
            <div className="bg-blue-600 p-8 text-white flex justify-between items-center">
              <div>
                <h3 className="text-3xl font-black">{clients.find(c => c.id === editingClient.id) ? 'Perfil de Cliente' : 'Nuevo Registro'}</h3>
                <p className="text-blue-100 text-[10px] font-bold uppercase tracking-widest mt-1">Completa los datos de facturación</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center text-2xl hover:bg-white/30 transition-all">✕</button>
            </div>

            <form onSubmit={handleSave} className="p-8 space-y-8 bg-white dark:bg-slate-950 max-h-[75vh] overflow-y-auto scrollbar-hide">
              {/* ACCIÓN IA */}
              {!isCameraOpen ? (
                <button 
                  type="button" 
                  onClick={startCamera}
                  className="w-full p-6 bg-emerald-50 dark:bg-emerald-900/10 border-2 border-dashed border-emerald-200 dark:border-emerald-800 rounded-[32px] flex items-center justify-center gap-4 text-emerald-600 dark:text-emerald-400 font-black text-xs uppercase tracking-widest transition-all hover:bg-emerald-100"
                >
                  <span className="text-3xl">📸</span>
                  <div className="text-left">
                    <p>Escanear Cédula con IA</p>
                    <p className="text-[8px] opacity-60">Extraer datos automáticamente</p>
                  </div>
                </button>
              ) : (
                <div className="relative rounded-[40px] overflow-hidden bg-black aspect-video shadow-2xl border-4 border-emerald-500/20">
                  <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
                  <div className="absolute bottom-6 inset-x-6 flex gap-3">
                    <button type="button" onClick={captureAndScan} disabled={isScanning} className="flex-1 py-4 bg-emerald-600 text-white rounded-2xl font-black text-[10px] uppercase shadow-xl">
                      {isScanning ? 'Procesando...' : 'Capturar Documento'}
                    </button>
                    <button type="button" onClick={stopCamera} className="px-8 py-4 bg-white/10 backdrop-blur-md text-white rounded-2xl font-black text-[10px] uppercase">Cancelar</button>
                  </div>
                </div>
              )}

              {/* DATOS BÁSICOS */}
              <div className="space-y-6">
                <div className="flex items-center gap-3 border-b border-gray-50 dark:border-slate-800 pb-2">
                   <span className="text-xl">👤</span>
                   <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Información Personal</h4>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="md:col-span-2">
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-4">Nombre Completo / Razón Social</label>
                    <input required value={editingClient.name} onChange={e => setEditingClient({...editingClient, name: e.target.value})} className="w-full p-4 bg-gray-50 dark:bg-slate-900 text-slate-900 dark:text-white border-2 border-transparent focus:border-blue-500 rounded-2xl font-bold outline-none transition-all" placeholder="Ej: Juan Pérez o Empresa S.A.S" />
                  </div>
                  
                  <div className="space-y-2">
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-4">Tipo de ID</label>
                    <div className="flex p-1 bg-gray-50 dark:bg-slate-900 rounded-2xl border-2 border-transparent">
                       <button type="button" onClick={() => setEditingClient({...editingClient, taxIdType: 'Cédula'})} className={`flex-1 py-3 rounded-xl font-black text-[10px] uppercase transition-all ${editingClient.taxIdType === 'Cédula' ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-400 hover:text-gray-600'}`}>Cédula</button>
                       <button type="button" onClick={() => setEditingClient({...editingClient, taxIdType: 'NIT'})} className={`flex-1 py-3 rounded-xl font-black text-[10px] uppercase transition-all ${editingClient.taxIdType === 'NIT' ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-400 hover:text-gray-600'}`}>NIT</button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-4">Número de ID</label>
                    <input required value={editingClient.taxId} onChange={e => setEditingClient({...editingClient, taxId: e.target.value})} className="w-full p-4 bg-gray-50 dark:bg-slate-900 text-slate-900 dark:text-white border-2 border-transparent focus:border-blue-500 rounded-2xl font-black text-lg outline-none transition-all" placeholder="Sin puntos ni guiones" />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-4">Teléfono Móvil</label>
                    <input type="tel" value={editingClient.phone} onChange={e => setEditingClient({...editingClient, phone: e.target.value})} className="w-full p-4 bg-gray-50 dark:bg-slate-900 text-slate-900 dark:text-white border-2 border-transparent focus:border-blue-500 rounded-2xl font-bold outline-none" placeholder="300 000 0000" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-4">Correo Electrónico</label>
                    <input type="email" value={editingClient.email} onChange={e => setEditingClient({...editingClient, email: e.target.value})} className="w-full p-4 bg-gray-50 dark:bg-slate-900 text-slate-900 dark:text-white border-2 border-transparent focus:border-blue-500 rounded-2xl font-bold outline-none" placeholder="cliente@correo.com" />
                  </div>
                </div>
              </div>

              {/* UBICACIÓN */}
              <div className="space-y-6">
                <div className="flex items-center gap-3 border-b border-gray-50 dark:border-slate-800 pb-2">
                   <span className="text-xl">📍</span>
                   <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Ubicación y Despacho</h4>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="md:col-span-2">
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-4">Dirección Física</label>
                    <input value={editingClient.address} onChange={e => setEditingClient({...editingClient, address: e.target.value})} className="w-full p-4 bg-gray-50 dark:bg-slate-900 text-slate-900 dark:text-white border-2 border-transparent focus:border-blue-500 rounded-2xl font-bold outline-none" placeholder="Calle, Carrera, Apto, Barrio..." />
                  </div>
                  
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-4">Ciudad</label>
                    <input value={editingClient.city} onChange={e => setEditingClient({...editingClient, city: e.target.value})} className="w-full p-4 bg-gray-50 dark:bg-slate-900 text-slate-900 dark:text-white border-2 border-transparent focus:border-blue-500 rounded-2xl font-bold outline-none" placeholder="Ej: Medellín" />
                  </div>
                  
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-4">Municipio / Depto</label>
                    <input value={editingClient.municipality} onChange={e => setEditingClient({...editingClient, municipality: e.target.value})} className="w-full p-4 bg-gray-50 dark:bg-slate-900 text-slate-900 dark:text-white border-2 border-transparent focus:border-blue-500 rounded-2xl font-bold outline-none" placeholder="Ej: Antioquia" />
                  </div>
                  
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-4">Código Postal</label>
                    <input value={editingClient.zipCode} onChange={e => setEditingClient({...editingClient, zipCode: e.target.value})} className="w-full p-4 bg-gray-50 dark:bg-slate-900 text-slate-900 dark:text-white border-2 border-transparent focus:border-blue-500 rounded-2xl font-bold outline-none" placeholder="000000" />
                  </div>
                </div>
              </div>

              <div className="pt-4">
                <button type="submit" className="w-full py-6 bg-blue-600 text-white rounded-[32px] font-black uppercase tracking-widest text-xs shadow-2xl shadow-blue-500/30 active:scale-95 transition-all">
                  ✓ GUARDAR CLIENTE EN NUBE
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClientManager;
