
import React, { useState } from 'react';
import { User, UserRole } from '../types';
import { supabase } from '../services/supabaseClient';
import ConfirmModal from './ConfirmModal';

interface UserManagerProps {
  currentUser: User;
  users: User[];
  onUpdateUsers: (user: User) => void; // Cambiado a singular para mayor claridad
  onDeleteUser: (userId: string) => void;
}

const UserManager: React.FC<UserManagerProps> = ({ currentUser, users, onUpdateUsers, onDeleteUser }) => {
  const [editingUser, setEditingUser] = useState<(User & { password?: string }) | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [userToDelete, setUserToDelete] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const isEditing = editingUser ? users.some(u => u.id === editingUser.id) : false;

  const openAddModal = () => {
    setErrorMessage(null);
    setSuccessMessage(null);
    setEditingUser({
      id: '', 
      tenantId: currentUser.tenantId,
      username: '',
      name: '',
      role: UserRole.SELLER,
      password: '' 
    });
    setIsModalOpen(true);
  };

  const openEditModal = (user: User) => {
    setErrorMessage(null);
    setSuccessMessage(null);
    setEditingUser({
      ...user,
      password: '' 
    });
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    
    setIsProcessing(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      let finalUserToSave: User;

      if (editingUser.password && editingUser.password.length > 0) {
        if (editingUser.password.length < 6) {
          throw new Error("La contraseña debe tener al menos 6 caracteres.");
        }
        if (editingUser.id === currentUser.id) {
          const { error: pwdError } = await supabase.auth.updateUser({
            password: editingUser.password
          });
          if (pwdError) throw pwdError;
        }
      }

      if (!isEditing) {
        if (!editingUser.password) throw new Error("La contraseña es obligatoria para nuevos vendedores.");

        const { data, error: authError } = await supabase.auth.signUp({
          email: editingUser.username.trim(),
          password: editingUser.password,
          options: {
            data: {
              full_name: editingUser.name,
              role: editingUser.role,
              tenantId: currentUser.tenantId
            }
          }
        });

        if (authError) throw authError;
        if (!data.user) throw new Error("No se pudo crear el usuario en el sistema de autenticación.");

        finalUserToSave = {
          id: data.user.id,
          tenantId: currentUser.tenantId,
          username: editingUser.username.trim(),
          name: editingUser.name,
          role: editingUser.role
        };
        
        // CRÍTICO: Pasar solo el nuevo objeto, no el array completo.
        onUpdateUsers(finalUserToSave);
        setSuccessMessage("¡Vendedor registrado exitosamente en la nube!");
      } else {
        finalUserToSave = {
          id: editingUser.id,
          tenantId: currentUser.tenantId,
          username: editingUser.username.trim(),
          name: editingUser.name,
          role: editingUser.role
        };
        
        onUpdateUsers(finalUserToSave);
        setSuccessMessage("Perfil actualizado correctamente.");
      }

      setTimeout(() => {
        setIsModalOpen(false);
        setEditingUser(null);
        setSuccessMessage(null);
      }, 1500);

    } catch (err: any) {
      setErrorMessage(err.message || "Error al conectar con Supabase");
    } finally {
      setIsProcessing(false);
    }
  };

  const confirmDelete = () => {
    if (userToDelete) {
      onDeleteUser(userToDelete);
      setUserToDelete(null);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-24">
      <ConfirmModal 
        isOpen={!!userToDelete}
        title="Eliminar Acceso"
        message="El usuario perderá el acceso a los datos de tu empresa inmediatamente."
        onConfirm={confirmDelete}
        onCancel={() => setUserToDelete(null)}
      />

      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight uppercase">Equipo Cloud</h2>
          <p className="text-gray-500 dark:text-slate-400 font-medium">Gestión de vendedores sincronizados</p>
        </div>
        <button onClick={openAddModal} className="px-6 py-4 bg-indigo-600 text-white rounded-2xl font-black shadow-xl hover:bg-indigo-700 transition-all active:scale-95 flex items-center gap-2">
          <span>+</span>
          <span className="text-[10px] uppercase tracking-widest">Registrar Vendedor</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {users.map(u => (
          <div key={u.id} className="bg-white dark:bg-slate-900 p-6 rounded-[40px] shadow-sm border border-gray-100 dark:border-slate-800 hover:border-indigo-400 transition-all group relative overflow-hidden">
            <div className="flex items-start justify-between mb-4 relative z-10">
              <div className={`w-16 h-16 rounded-2xl flex items-center justify-center font-black text-3xl uppercase ${u.role === UserRole.ADMIN ? 'bg-indigo-100 text-indigo-600' : 'bg-emerald-100 text-emerald-600'}`}>
                {u.name.charAt(0)}
              </div>
              <div className="flex space-x-1 opacity-0 group-hover:opacity-100 transition-all">
                <button onClick={() => openEditModal(u)} className="p-3 bg-blue-50 text-blue-600 dark:bg-blue-900/30 rounded-xl">✏️</button>
                {u.id !== currentUser.id && (
                  <button onClick={() => setUserToDelete(u.id)} className="p-3 bg-rose-50 text-rose-600 dark:bg-rose-900/30 rounded-xl">🗑️</button>
                )}
              </div>
            </div>
            
            <div className="relative z-10">
              <h3 className="font-black text-xl text-gray-900 dark:text-white truncate mb-1">
                {u.name} {u.id === currentUser.id && <span className="text-[10px] text-indigo-500 font-black">(TÚ)</span>}
              </h3>
              <p className="text-xs font-bold text-slate-400 dark:text-slate-500 truncate mb-4">{u.username}</p>
              
              <div className="flex items-center gap-2">
                <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${u.role === UserRole.ADMIN ? 'bg-indigo-600 text-white' : 'bg-emerald-500 text-white'}`}>
                  {u.role}
                </span>
                <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">● ID: {u.id.slice(0,5)}...</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {isModalOpen && editingUser && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xl z-[120] flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-950 rounded-t-[40px] sm:rounded-[48px] shadow-2xl w-full max-w-lg overflow-hidden animate-slideUp my-auto border border-white/5">
            <div className="bg-indigo-600 p-10 text-white">
              <h3 className="text-3xl font-black">{isEditing ? 'Perfil Vendedor' : 'Nuevo Registro'}</h3>
              <p className="text-indigo-100 font-medium text-xs mt-1 uppercase tracking-widest opacity-70">
                Se sincronizará con la base de datos central
              </p>
            </div>

            <form onSubmit={handleSave} className="p-10 space-y-6 bg-white dark:bg-slate-950">
              {errorMessage && <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl text-rose-600 text-[10px] font-bold">⚠️ {errorMessage}</div>}
              {successMessage && <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-2xl text-emerald-600 text-[10px] font-bold">✓ {successMessage}</div>}

              <div className="grid grid-cols-1 gap-5">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Nombre Completo</label>
                  <input required value={editingUser.name} onChange={e => setEditingUser({...editingUser, name: e.target.value})} className="w-full p-4 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white border border-slate-100 dark:border-slate-800 rounded-[20px] font-bold outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
                
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Correo Electrónico</label>
                  <input required type="email" disabled={isEditing} value={editingUser.username} onChange={e => setEditingUser({...editingUser, username: e.target.value})} className={`w-full p-4 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white border border-slate-100 dark:border-slate-800 rounded-[20px] font-bold outline-none focus:ring-2 focus:ring-indigo-500 ${isEditing ? 'opacity-50' : ''}`} />
                </div>

                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Contraseña de Acceso</label>
                  <input required={!isEditing} type="password" value={editingUser.password} onChange={e => setEditingUser({...editingUser, password: e.target.value})} className="w-full p-4 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white border border-slate-100 dark:border-slate-800 rounded-[20px] font-bold outline-none focus:ring-2 focus:ring-indigo-500" placeholder={isEditing ? "En blanco para no cambiar" : "Mínimo 6 caracteres"} />
                </div>

                {editingUser.id !== currentUser.id && (
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Tipo de Permisos</label>
                    <div className="grid grid-cols-2 gap-3 mt-1">
                      <button type="button" onClick={() => setEditingUser({...editingUser, role: UserRole.ADMIN})} className={`py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest border-2 ${editingUser.role === UserRole.ADMIN ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-slate-50 dark:bg-slate-900 border-transparent text-slate-400'}`}>👑 Admin</button>
                      <button type="button" onClick={() => setEditingUser({...editingUser, role: UserRole.SELLER})} className={`py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest border-2 ${editingUser.role === UserRole.SELLER ? 'bg-emerald-500 text-white border-emerald-500' : 'bg-slate-50 dark:bg-slate-900 border-transparent text-slate-400'}`}>💼 Vendedor</button>
                    </div>
                  </div>
                )}
              </div>

              <button type="submit" disabled={isProcessing} className="w-full py-5 bg-indigo-600 text-white rounded-[24px] font-black shadow-2xl uppercase tracking-widest text-xs active:scale-95 transition-all">
                {isProcessing ? 'Sincronizando...' : isEditing ? 'Guardar Cambios' : 'Confirmar Registro'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManager;
