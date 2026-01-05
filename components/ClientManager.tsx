
import React, { useState } from 'react';
import { Client } from '../types';
import ConfirmModal from './ConfirmModal';

interface ClientManagerProps {
  clients: Client[];
  onUpdateClients: (clients: Client[]) => void;
}

const ClientManager: React.FC<ClientManagerProps> = ({ clients, onUpdateClients }) => {
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [clientToDelete, setClientToDelete] = useState<string | null>(null);

  const openEditModal = (client: Client) => {
    setEditingClient({ ...client });
    setIsModalOpen(true);
  };

  const openAddModal = () => {
    setEditingClient({
      id: Math.random().toString(36).substr(2, 9),
      name: '',
      email: '',
      taxId: '',
      address: '',
      city: '',
      municipality: '',
      zipCode: ''
    });
    setIsModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingClient) return;

    const exists = clients.find(c => c.id === editingClient.id);
    let newClients;
    if (exists) {
      newClients = clients.map(c => c.id === editingClient.id ? editingClient : c);
    } else {
      newClients = [editingClient, ...clients];
    }

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
        message="¿Estás seguro de que deseas eliminar a este cliente? Se borrarán sus datos de contacto de la base de datos."
        onConfirm={confirmDelete}
        onCancel={() => setClientToDelete(null)}
      />

      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-black text-gray-900 tracking-tight">Gestión de Clientes</h2>
          <p className="text-gray-500 font-medium">Administra tu base de datos comercial</p>
        </div>
        <button 
          onClick={openAddModal}
          className="px-6 py-3 bg-blue-600 text-white rounded-2xl font-bold shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all flex items-center space-x-2 active:scale-95"
        >
          <span>+</span>
          <span>Nuevo Cliente</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {clients.map(client => (
          <div key={client.id} className="bg-white p-6 rounded-[32px] shadow-sm border border-gray-100 hover:border-blue-200 hover:shadow-xl hover:shadow-blue-500/5 transition-all group relative">
            <div className="flex items-start justify-between mb-4">
              <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center font-black text-2xl uppercase shadow-inner">
                {client.name.charAt(0)}
              </div>
              <div className="flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button 
                  onClick={() => openEditModal(client)}
                  className="p-2.5 text-blue-600 hover:bg-blue-50 rounded-xl transition-colors"
                  title="Editar"
                >
                  ✏️
                </button>
                <button 
                  onClick={() => setClientToDelete(client.id)}
                  className="p-2.5 text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
                  title="Eliminar"
                >
                  🗑️
                </button>
              </div>
            </div>
            
            <h3 className="font-black text-xl text-gray-900 truncate mb-1">{client.name}</h3>
            <p className="text-xs font-bold text-blue-600 truncate mb-4">{client.email}</p>
            
            <div className="space-y-3 pt-4 border-t border-gray-50">
              <div className="flex items-center text-[10px] font-black uppercase tracking-widest text-gray-400">
                <span className="w-20">NIT/ID:</span>
                <span className="text-gray-900">{client.taxId}</span>
              </div>
              <div className="flex items-start text-[10px] font-black uppercase tracking-widest text-gray-400">
                <span className="w-20">Ubicación:</span>
                <span className="text-gray-900 flex-1 leading-relaxed">
                  {client.city}, {client.municipality}<br/>
                  CP: {client.zipCode}
                </span>
              </div>
              <div className="flex items-start text-[10px] font-black uppercase tracking-widest text-gray-400">
                <span className="w-20">Dirección:</span>
                <span className="text-gray-900 flex-1 truncate">{client.address}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {clients.length === 0 && (
        <div className="py-24 text-center bg-white rounded-[40px] border border-gray-100 border-dashed">
          <div className="text-6xl mb-4">👥</div>
          <h3 className="text-xl font-black text-gray-800">Directorio Vacío</h3>
          <p className="text-gray-400 max-w-xs mx-auto font-medium">Comienza registrando tus clientes para emitir facturas más rápido.</p>
        </div>
      )}

      {isModalOpen && editingClient && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-[120] flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white rounded-t-[40px] sm:rounded-[40px] shadow-2xl w-full max-w-xl overflow-hidden animate-slideUp">
            <div className="bg-blue-600 p-8 text-white relative">
              <h3 className="text-2xl font-black">{clients.find(c => c.id === editingClient.id) ? 'Editar Cliente' : 'Nuevo Registro'}</h3>
              <p className="text-blue-100 font-medium">Información detallada para facturación</p>
              <button onClick={() => setIsModalOpen(false)} className="absolute top-8 right-8 text-white/60 hover:text-white text-2xl">✕</button>
            </div>
            
            <form onSubmit={handleSave} className="p-8 space-y-6 max-h-[70vh] overflow-y-auto">
              <div className="space-y-4">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Identificación General</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-xs font-black text-gray-500 uppercase mb-2">Nombre o Razón Social</label>
                    <input 
                      type="text" required
                      value={editingClient.name}
                      onChange={e => setEditingClient({...editingClient, name: e.target.value})}
                      className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 font-bold"
                      placeholder="Ej. Inversiones Globales S.A.S"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-black text-gray-500 uppercase mb-2">Email de Envío</label>
                    <input 
                      type="email" required
                      value={editingClient.email}
                      onChange={e => setEditingClient({...editingClient, email: e.target.value})}
                      className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 font-bold"
                      placeholder="email@cliente.com"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-black text-gray-500 uppercase mb-2">NIT / RUT / CC</label>
                    <input 
                      type="text" required
                      value={editingClient.taxId}
                      onChange={e => setEditingClient({...editingClient, taxId: e.target.value})}
                      className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 font-bold"
                      placeholder="900.000.000-1"
                    />
                  </div>
                </div>

                <div className="h-px bg-gray-100 my-6"></div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Ubicación y Despacho</p>
                
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-black text-gray-500 uppercase mb-2">Ciudad</label>
                    <input 
                      type="text" required
                      value={editingClient.city}
                      onChange={e => setEditingClient({...editingClient, city: e.target.value})}
                      className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 font-bold"
                      placeholder="Bogotá"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-black text-gray-500 uppercase mb-2">Municipio</label>
                    <input 
                      type="text" required
                      value={editingClient.municipality}
                      onChange={e => setEditingClient({...editingClient, municipality: e.target.value})}
                      className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 font-bold"
                      placeholder="Cundinamarca"
                    />
                  </div>
                  <div className="col-span-2 md:col-span-1">
                    <label className="block text-xs font-black text-gray-500 uppercase mb-2">Cód. Postal</label>
                    <input 
                      type="text" required
                      value={editingClient.zipCode}
                      onChange={e => setEditingClient({...editingClient, zipCode: e.target.value})}
                      className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 font-bold"
                      placeholder="110111"
                    />
                  </div>
                  <div className="col-span-2 md:col-span-3">
                    <label className="block text-xs font-black text-gray-500 uppercase mb-2">Dirección Completa</label>
                    <textarea 
                      required
                      value={editingClient.address}
                      onChange={e => setEditingClient({...editingClient, address: e.target.value})}
                      className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 font-bold"
                      rows={2}
                      placeholder="Calle 100 #15-20, Edificio Pro, Oficina 302"
                    />
                  </div>
                </div>
              </div>

              <div className="flex space-x-3 pt-6">
                <button 
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-4 text-gray-400 font-black hover:bg-gray-50 rounded-2xl transition-colors uppercase tracking-widest text-[10px]"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  className="flex-1 py-4 bg-blue-600 text-white font-black rounded-2xl shadow-xl shadow-blue-100 hover:bg-blue-700 transition-all active:scale-95 uppercase tracking-widest text-[10px]"
                >
                  Guardar Cliente
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
