
import React, { useState, useRef, useEffect } from 'react';
import { AppSettings, BackupData, PdfTemplate, User, UserRole } from '../types';
import { database } from '../services/databaseService';
import ConfirmModal from './ConfirmModal';

interface SettingsProps {
  settings: AppSettings;
  onUpdateSettings: (settings: AppSettings) => void;
  onImportData: (data: BackupData) => void;
  allData: {
    documents: any[];
    expenses: any[];
    clients: any[];
    products: any[];
    settings: AppSettings;
  };
}

const Settings: React.FC<SettingsProps> = ({ settings, onUpdateSettings, onImportData, allData }) => {
  const [formData, setFormData] = useState<AppSettings>({
    ...settings,
    pdfTemplate: settings.pdfTemplate || PdfTemplate.PROFESSIONAL
  });
  const [dbStats, setDbStats] = useState(database.getStats());
  const [users, setUsers] = useState<User[]>(() => JSON.parse(localStorage.getItem('facturapro_users') || '[]'));
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [userForm, setUserForm] = useState<User>({
    id: '', username: '', password: '', name: '', role: UserRole.SELLER
  });
  const [userToDelete, setUserToDelete] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const importInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setDbStats(database.getStats());
  }, [allData]);

  const templates = [
    { id: PdfTemplate.PROFESSIONAL, name: 'Profesional', desc: 'Sólido y corporativo', icon: '🏛️' },
    { id: PdfTemplate.MINIMALIST, name: 'Minimalista', desc: 'Limpio y moderno', icon: '🍃' },
    { id: PdfTemplate.MODERN_DARK, name: 'Premium Dark', desc: 'Elegante y lujoso', icon: '💎' },
    { id: PdfTemplate.COMPACT_TICKET, name: 'Ticket POS', desc: 'Compacto para recibos', icon: '🎫' },
  ];

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData({ ...formData, logo: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const removeLogo = () => {
    setFormData({ ...formData, logo: undefined });
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleOpenUserModal = (u?: User) => {
    if (u) {
      setUserForm({ ...u });
    } else {
      setUserForm({
        id: Math.random().toString(36).substr(2, 9),
        username: '',
        password: '',
        name: '',
        role: UserRole.SELLER
      });
    }
    setIsUserModalOpen(true);
  };

  const handleSaveUser = (e: React.FormEvent) => {
    e.preventDefault();
    const exists = users.find(u => u.id === userForm.id);
    let newUsers;
    if (exists) {
      newUsers = users.map(u => u.id === userForm.id ? userForm : u);
    } else {
      newUsers = [userForm, ...users];
    }
    setUsers(newUsers);
    localStorage.setItem('facturapro_users', JSON.stringify(newUsers));
    setIsUserModalOpen(false);
  };

  const handleDeleteUser = () => {
    if (userToDelete) {
      const newUsers = users.filter(u => u.id !== userToDelete);
      setUsers(newUsers);
      localStorage.setItem('facturapro_users', JSON.stringify(newUsers));
      setUserToDelete(null);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateSettings(formData);
    alert('Configuración actualizada correctamente');
  };

  return (
    <div className="space-y-8 animate-fadeIn pb-24 max-w-5xl mx-auto">
      <ConfirmModal 
        isOpen={!!userToDelete}
        title="Eliminar Usuario"
        message="¿Estás seguro de que deseas eliminar este acceso? El usuario ya no podrá iniciar sesión."
        onConfirm={handleDeleteUser}
        onCancel={() => setUserToDelete(null)}
      />

      <header className="flex justify-between items-end">
        <div>
          <h2 className="text-4xl font-black text-slate-900 tracking-tight">AJUSTES</h2>
          <p className="text-slate-500 font-medium">Configuración de marca y sistema</p>
        </div>
        <div className="text-right">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Base de Datos</p>
          <p className="text-sm font-black text-slate-900">{dbStats.totalRecords} Registros</p>
        </div>
      </header>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* PERFIL CORPORATIVO */}
        <div className="bg-white rounded-[40px] shadow-sm border border-slate-100 p-8 md:p-10 space-y-10">
          <div className="flex items-center gap-4 border-b border-slate-50 pb-6">
            <span className="text-3xl">🏢</span>
            <h3 className="text-2xl font-black text-slate-800 tracking-tighter">Perfil de Empresa</h3>
          </div>

          <div className="flex flex-col md:flex-row gap-10 items-start">
            <div className="w-full md:w-48 space-y-4">
               <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Logo de Marca</p>
               <div className="relative aspect-square w-full bg-slate-50 rounded-[32px] border-2 border-dashed border-slate-200 flex items-center justify-center overflow-hidden group">
                  {formData.logo ? (
                    <img src={formData.logo} className="w-full h-full object-contain p-4" alt="Logo" />
                  ) : (
                    <span className="text-4xl opacity-20">🖼️</span>
                  )}
                  <input type="file" ref={fileInputRef} onChange={handleLogoUpload} className="hidden" accept="image/*" />
                  <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <button type="button" onClick={() => fileInputRef.current?.click()} className="p-2 bg-white rounded-full text-slate-900 shadow-xl">✏️</button>
                    {formData.logo && <button type="button" onClick={removeLogo} className="p-2 bg-rose-500 rounded-full text-white shadow-xl">✕</button>}
                  </div>
               </div>
            </div>

            <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
              <div className="space-y-2 md:col-span-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Nombre Comercial</label>
                <input required type="text" value={formData.companyName} onChange={e => setFormData({...formData, companyName: e.target.value})} className="w-full p-4 bg-slate-50 border-none rounded-2xl font-bold outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">NIT / Identificación</label>
                <input required type="text" value={formData.companyId} onChange={e => setFormData({...formData, companyId: e.target.value})} className="w-full p-4 bg-slate-50 border-none rounded-2xl font-bold outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Impuesto por Defecto (%)</label>
                <input required type="number" value={formData.defaultTaxRate} onChange={e => setFormData({...formData, defaultTaxRate: parseFloat(e.target.value)})} className="w-full p-4 bg-slate-50 border-none rounded-2xl font-bold outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="space-y-2 md:col-span-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Dirección Principal</label>
                <input required type="text" value={formData.companyAddress} onChange={e => setFormData({...formData, companyAddress: e.target.value})} className="w-full p-4 bg-slate-50 border-none rounded-2xl font-bold outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>
          </div>
        </div>

        {/* GESTIÓN DE USUARIOS */}
        <div className="bg-white rounded-[40px] shadow-sm border border-slate-100 p-8 md:p-10 space-y-6">
          <div className="flex justify-between items-center border-b border-slate-50 pb-6">
            <div className="flex items-center gap-4">
              <span className="text-3xl">👥</span>
              <h3 className="text-2xl font-black text-slate-800 tracking-tighter">Control de Accesos</h3>
            </div>
            <button 
              type="button" 
              onClick={() => handleOpenUserModal()}
              className="px-4 py-2 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-blue-100"
            >
              + Nuevo Usuario
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {users.map(u => (
              <div key={u.id} className="p-5 rounded-3xl bg-slate-50 border border-slate-100 flex justify-between items-center group">
                <div>
                  <p className="font-black text-slate-900 leading-none">{u.name}</p>
                  <p className="text-[10px] text-slate-400 font-bold uppercase mt-1 tracking-wider">{u.username}</p>
                  <span className={`inline-block mt-2 px-2 py-0.5 rounded-lg text-[8px] font-black uppercase ${
                    u.role === UserRole.ADMIN ? 'bg-violet-100 text-violet-600' : 'bg-blue-100 text-blue-600'
                  }`}>
                    {u.role}
                  </span>
                </div>
                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                   <button type="button" onClick={() => handleOpenUserModal(u)} className="p-2 text-slate-400 hover:text-blue-600 transition-colors">✏️</button>
                   <button type="button" onClick={() => setUserToDelete(u.id)} className="p-2 text-slate-400 hover:text-rose-600 transition-colors">🗑️</button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* PLANTILLAS PDF */}
        <div className="bg-white rounded-[40px] shadow-sm border border-slate-100 p-8 md:p-10 space-y-6">
          <div className="flex items-center gap-4 border-b border-slate-50 pb-6">
            <span className="text-3xl">📄</span>
            <h3 className="text-2xl font-black text-slate-800 tracking-tighter">Estilo de Documentos</h3>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {templates.map(tmp => (
              <button
                key={tmp.id}
                type="button"
                onClick={() => setFormData({...formData, pdfTemplate: tmp.id})}
                className={`p-6 rounded-[32px] border-2 text-left transition-all relative overflow-hidden group active:scale-95 ${
                  formData.pdfTemplate === tmp.id 
                  ? 'border-blue-600 bg-blue-50' 
                  : 'border-slate-50 bg-slate-50/50 hover:bg-slate-100 hover:border-slate-200'
                }`}
              >
                <div className="text-3xl mb-4">{tmp.icon}</div>
                <h4 className={`font-black text-sm mb-1 ${formData.pdfTemplate === tmp.id ? 'text-blue-900' : 'text-slate-800'}`}>{tmp.name}</h4>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{tmp.desc}</p>
                {formData.pdfTemplate === tmp.id && (
                  <div className="absolute top-4 right-4 text-blue-600 text-xl font-black">✓</div>
                )}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-4 items-center">
          <button type="submit" className="flex-1 py-6 bg-slate-900 text-white rounded-[32px] font-black shadow-xl shadow-slate-200 active:scale-[0.98] transition-all uppercase tracking-widest text-sm">
            Guardar Todo los Ajustes
          </button>
          
          <div className="flex gap-2">
            <button type="button" onClick={() => database.clearDatabase()} className="p-6 bg-rose-50 text-rose-600 rounded-[32px] font-black border border-rose-100 hover:bg-rose-100 transition-colors" title="Limpiar Base de Datos">🗑️</button>
            <button type="button" onClick={() => importInputRef.current?.click()} className="p-6 bg-blue-50 text-blue-600 rounded-[32px] font-black border border-blue-100 hover:bg-blue-100 transition-colors" title="Importar Backup">📥</button>
            <input type="file" ref={importInputRef} onChange={e => {
               const file = e.target.files?.[0];
               if (file) {
                 const reader = new FileReader();
                 reader.onload = (ev) => onImportData(JSON.parse(ev.target?.result as string));
                 reader.readAsText(file);
               }
            }} className="hidden" accept=".json" />
          </div>
        </div>
      </form>

      {/* MODAL DE USUARIO */}
      {isUserModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xl z-[99999] flex items-center justify-center p-4">
          <div className="bg-white rounded-[40px] w-full max-w-md overflow-hidden shadow-2xl animate-slideUp">
             <div className="bg-slate-900 p-8 text-white relative">
                <h3 className="text-2xl font-black">{users.find(u => u.id === userForm.id) ? 'Editar Acceso' : 'Nuevo Usuario'}</h3>
                <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mt-1">Definir credenciales y permisos</p>
                <button onClick={() => setIsUserModalOpen(false)} className="absolute top-6 right-6 text-white/50 hover:text-white text-2xl transition-all">✕</button>
             </div>
             
             <form onSubmit={handleSaveUser} className="p-8 space-y-5">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Nombre Completo</label>
                  <input required value={userForm.name} onChange={e => setUserForm({...userForm, name: e.target.value})} className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold outline-none focus:ring-2 focus:ring-blue-500" placeholder="Ej. Ana García" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Email / Usuario</label>
                  <input required type="email" value={userForm.username} onChange={e => setUserForm({...userForm, username: e.target.value})} className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold outline-none focus:ring-2 focus:ring-blue-500" placeholder="ana@empresa.com" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Contraseña</label>
                  <input required type="password" value={userForm.password} onChange={e => setUserForm({...userForm, password: e.target.value})} className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold outline-none focus:ring-2 focus:ring-blue-500" placeholder="••••••••" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Rol de Acceso</label>
                  <select 
                    value={userForm.role}
                    onChange={e => setUserForm({...userForm, role: e.target.value as UserRole})}
                    className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value={UserRole.SELLER}>Vendedor (Solo Operación)</option>
                    <option value={UserRole.ADMIN}>Administrador (Control Total)</option>
                  </select>
                </div>
                <button type="submit" className="w-full py-5 bg-slate-900 text-white rounded-3xl font-black shadow-xl shadow-slate-100 uppercase tracking-widest text-xs active:scale-95 transition-all">
                  Guardar Usuario
                </button>
             </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Settings;
