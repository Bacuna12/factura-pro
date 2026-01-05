
import React, { useState } from 'react';
import { User, AppSettings } from '../types';

interface AuthProps {
  onLogin: (user: User, settings?: AppSettings) => void;
}

const Auth: React.FC<AuthProps> = ({ onLogin }) => {
  const [isRegistering, setIsRegistering] = useState(false);
  const [error, setError] = useState('');
  
  // Form states
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    name: '',
    companyName: '',
    companyId: '',
    companyAddress: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (isRegistering) {
      // Logic for registration
      if (!formData.username || !formData.password || !formData.companyName) {
        setError('Por favor completa los campos obligatorios');
        return;
      }

      const newUser: User = {
        id: Math.random().toString(36).substr(2, 9),
        username: formData.username,
        password: formData.password,
        name: formData.name || formData.username
      };

      const newSettings: AppSettings = {
        companyName: formData.companyName,
        companyId: formData.companyId,
        companyAddress: formData.companyAddress,
        currency: 'COP',
        defaultTaxRate: 19
      };

      // Save user to "database" (localStorage)
      const existingUsers = JSON.parse(localStorage.getItem('facturapro_users') || '[]');
      localStorage.setItem('facturapro_users', JSON.stringify([...existingUsers, newUser]));
      
      onLogin(newUser, newSettings);
    } else {
      // Logic for login
      const users = JSON.parse(localStorage.getItem('facturapro_users') || '[]');
      const foundUser = users.find((u: User) => u.username === formData.username && u.password === formData.password);
      
      if (foundUser) {
        onLogin(foundUser);
      } else {
        setError('Usuario o contraseña incorrectos');
      }
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6 relative overflow-hidden">
      {/* Decorative blobs */}
      <div className="absolute top-0 left-0 w-96 h-96 bg-blue-100 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob"></div>
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-indigo-100 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-2000"></div>

      <div className="w-full max-w-md z-10">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-[24px] shadow-xl shadow-blue-200 text-white text-3xl font-black mb-4">
            FP
          </div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tighter">FacturaPro</h1>
          <p className="text-blue-600 font-bold text-sm tracking-wide">by tecnocamaras</p>
        </div>

        <div className="bg-white p-8 rounded-[40px] shadow-2xl shadow-slate-200/60 border border-slate-100">
          <h2 className="text-2xl font-black text-slate-800 mb-2">
            {isRegistering ? 'Crear mi cuenta' : 'Bienvenido de nuevo'}
          </h2>
          <p className="text-slate-400 font-medium text-sm mb-8">
            {isRegistering ? 'Configura tu empresa para empezar' : 'Ingresa tus credenciales para continuar'}
          </p>

          {error && (
            <div className="mb-6 p-4 bg-rose-50 border border-rose-100 text-rose-600 rounded-2xl text-xs font-bold flex items-center space-x-2">
              <span>⚠️</span>
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-4">
              <div className="relative group">
                <input 
                  type="text" 
                  required
                  placeholder="Usuario"
                  value={formData.username}
                  onChange={e => setFormData({...formData, username: e.target.value})}
                  className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 font-bold transition-all text-sm group-hover:bg-slate-100"
                />
              </div>
              
              <div className="relative group">
                <input 
                  type="password" 
                  required
                  placeholder="Contraseña"
                  value={formData.password}
                  onChange={e => setFormData({...formData, password: e.target.value})}
                  className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 font-bold transition-all text-sm group-hover:bg-slate-100"
                />
              </div>

              {isRegistering && (
                <div className="pt-4 space-y-4 animate-fadeIn">
                  <div className="h-px bg-slate-100 w-full mb-6"></div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Datos de la Empresa</p>
                  
                  <input 
                    type="text" 
                    required
                    placeholder="Nombre de la Empresa"
                    value={formData.companyName}
                    onChange={e => setFormData({...formData, companyName: e.target.value})}
                    className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 font-bold transition-all text-sm"
                  />
                  
                  <input 
                    type="text" 
                    placeholder="NIT / ID Fiscal"
                    value={formData.companyId}
                    onChange={e => setFormData({...formData, companyId: e.target.value})}
                    className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 font-bold transition-all text-sm"
                  />
                  
                  <input 
                    type="text" 
                    placeholder="Dirección Comercial"
                    value={formData.companyAddress}
                    onChange={e => setFormData({...formData, companyAddress: e.target.value})}
                    className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 font-bold transition-all text-sm"
                  />
                </div>
              )}
            </div>

            <button 
              type="submit"
              className="w-full py-5 bg-blue-600 text-white font-black rounded-3xl shadow-xl shadow-blue-200 hover:bg-blue-700 transition-all active:scale-[0.98] mt-6"
            >
              {isRegistering ? 'Comenzar ahora' : 'Iniciar Sesión'}
            </button>
          </form>

          <div className="mt-8 text-center">
            <button 
              onClick={() => setIsRegistering(!isRegistering)}
              className="text-sm font-bold text-slate-400 hover:text-blue-600 transition-colors"
            >
              {isRegistering ? '¿Ya tienes cuenta? Ingresa aquí' : '¿Nuevo aquí? Registra tu empresa'}
            </button>
          </div>
        </div>
        
        <p className="text-center mt-10 text-[10px] text-slate-300 font-black uppercase tracking-[0.3em]">
          Secure Business Engine v2.0
        </p>
      </div>
    </div>
  );
};

export default Auth;
