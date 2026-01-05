
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
      address: ''
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
          <h2 className="text-3xl font-bold text-gray-800">Gestión de Clientes</h2>
          <p className="text-gray-500">Administra la base de datos de tus clientes</p>
        </div>
        <button 
          onClick={openAddModal}
          className="px-5 py-2.5 bg-blue-600 text-white rounded-xl font-bold shadow-md hover:bg-blue-700 transition-all flex items-center space-x-2"
        >
          <span>+</span>
          <span>Nuevo Cliente</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {clients.map(client => (
          <div key={client.id} className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 hover:border-blue-200 transition-all group relative">
            <div className="flex items-start justify-between mb-3">
              <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center font-bold text-xl uppercase">
                {client.name.charAt(0)}
              </div>
              <div className="flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button 
                  onClick={() => openEditModal(client)}
                  className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                  title="Editar"
                >
                  ✏️
                </button>
                <button 
                  onClick={() => setClientToDelete(client.id)}
                  className="p-2 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                  title="Eliminar"
                >
                  🗑️
                </button>
              </div>
            </div>
            <h3 className="font-bold text-lg text-gray-800 truncate">{client.name}</h3>
            <p className="text-sm text-gray-500 mb-2 truncate">{client.email}</p>
            <div className="mt-4 pt-4 border-t border-gray-50 space-y-2">
              <div className="flex items-center text-xs text-gray-400 font-mono">
                <span className="w-16 uppercase">NIT/CC:</span>
                <span className="text-gray-700">{client.taxId}</span>
              </div>
              <div className="flex items-start text-xs text-gray-400">
                <span className="w-16 uppercase">DIR:</span>
                <span className="text-gray-700 flex-1 truncate">{client.address}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {isModalOpen && editingClient && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-slideUp">
            <div className="bg-blue-600 p-6 text-white">
              <h3 className="text-xl font-bold">{clients.find(c => c.id === editingClient.id) ? 'Editar Cliente' : 'Nuevo Cliente'}</h3>
              <p className="text-blue-100 text-sm">Completa los datos del cliente</p>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Nombre o Razón Social</label>
                <input 
                  type="text" 
                  required
                  value={editingClient.name}
                  onChange={e => setEditingClient({...editingClient, name: e.target.value})}
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Ej. Acme SAS"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Email de Facturación</label>
                <input 
                  type="email" 
                  required
                  value={editingClient.email}
                  onChange={e => setEditingClient({...editingClient, email: e.target.value})}
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="email@ejemplo.com"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">NIT / CC</label>
                <input 
                  type="text" 
                  required
                  value={editingClient.taxId}
                  onChange={e => setEditingClient({...editingClient, taxId: e.target.value})}
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="900.000.000-1"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Dirección Física</label>
                <textarea 
                  required
                  value={editingClient.address}
                  onChange={e => setEditingClient({...editingClient, address: e.target.value})}
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                  rows={2}
                  placeholder="Calle, Ciudad, Departamento"
                />
              </div>
              <div className="flex space-x-3 pt-4">
                <button 
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-3 text-gray-500 font-bold hover:bg-gray-50 rounded-xl transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  className="flex-1 py-3 bg-blue-600 text-white font-bold rounded-xl shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all"
                >
                  Guardar
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
