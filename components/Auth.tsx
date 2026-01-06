
import React, { useState, useEffect } from 'react';
import { User, AppSettings, UserRole } from '../types';

interface AuthProps {
  onLogin: (user: User, settings?: AppSettings) => void;
}

const Auth: React.FC<AuthProps> = ({ onLogin }) => {
  const [mode, setMode] = useState<'LOGIN' | 'RECOVERY'>('LOGIN');
  const [error, setError] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const [formData, setFormData] = useState({
    username: '', 
    password: '',
  });

  useEffect(() => {
    const remembered = localStorage.getItem('facturapro_remembered');
    if (remembered) {
      try {
        const { username, password } = JSON.parse(remembered);
        setFormData(prev => ({ ...prev, username, password }));
        setRememberMe(true);
      } catch (e) {
        console.error("Error loading remembered data");
      }
    }
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsProcessing(true);
    
    // Pequeño delay para feedback visual
    setTimeout(() => {
      const users = JSON.parse(localStorage.getItem('facturapro_users') || '[]');
      const foundUser = users.find((u: User) => u.username === formData.username && u.password === formData.password);
      
      if (foundUser) {
        if (rememberMe) {
          localStorage.setItem('facturapro_remembered', JSON.stringify({
            username: formData.username,
            password: formData.password
          }));
        } else {
          localStorage.removeItem('facturapro_remembered');
        }
        onLogin(foundUser);
      } else {
        setError('Credenciales incorrectas o usuario no registrado');
        setIsProcessing(false);
      }
    }, 600);
  };

  const handleRecovery = (e: React.FormEvent) => {
    e.preventDefault();
    setError('Funcionalidad de recuperación temporalmente deshabilitada. Contacta al administrador.');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-6 relative overflow-hidden transition-colors duration-500">
      
      {/* Elementos decorativos de fondo */}
      <div className="absolute top-0 left-0 w-96 h-96 bg-blue-100 dark:bg-blue-900/20 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob"></div>
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-indigo-100 dark:bg-indigo-900/20 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-2000"></div>

      <div className="w-full max-w-md z-10">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-[24px] shadow-xl text-white text-3xl font-black mb-4">FP</div>
          <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter">FacturaPro</h1>
        </div>

        <div className="bg-white dark:bg-slate-900 p-8 rounded-[40px] shadow-2xl border border-slate-100 dark:border-slate-800">
          <h2 className="text-2xl font-black text-slate-800 dark:text-white mb-2">
            {mode === 'RECOVERY' ? 'Recuperar acceso' : 'Bienvenido'}
          </h2>
          <p className="text-slate-400 dark:text-slate-500 font-medium text-sm mb-8">
            {mode === 'RECOVERY' ? 'Ingresa tu correo para recuperar tus datos' : 'Ingresa tus credenciales para continuar'}
          </p>

          {error && <div className="mb-6 p-4 bg-rose-50 dark:bg-rose-900/20 border border-rose-100 dark:border-rose-800 text-rose-600 dark:text-rose-400 rounded-2xl text-xs font-bold">{error}</div>}

          <form onSubmit={mode === 'RECOVERY' ? handleRecovery : handleLogin} className="space-y-5">
            <div className="space-y-4">
              <input 
                type="text" 
                required
                placeholder="Email o Usuario"
                value={formData.username}
                onChange={e => setFormData({...formData, username: e.target.value})}
                className="w-full p-4 bg-slate-50 dark:bg-slate-800 dark:text-white border border-slate-100 dark:border-slate-700 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 font-bold transition-all text-sm"
              />
              
              {mode === 'LOGIN' && (
                <div className="space-y-4 animate-fadeIn">
                  <input 
                    type="password" required placeholder="Contraseña"
                    value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})}
                    className="w-full p-4 bg-slate-50 dark:bg-slate-800 dark:text-white border border-slate-100 dark:border-slate-700 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 font-bold transition-all text-sm"
                  />
                  
                  <div className="flex items-center justify-between px-1">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={rememberMe} 
                        onChange={e => setRememberMe(e.target.checked)}
                        className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-[10px] font-black uppercase text-slate-400">Recordarme</span>
                    </label>
                    <button 
                      type="button" 
                      onClick={() => setMode('RECOVERY')}
                      className="text-[10px] font-black uppercase text-blue-600 dark:text-blue-400"
                    >
                      Olvidé mi clave
                    </button>
                  </div>
                </div>
              )}
            </div>

            <button 
              type="submit" 
              disabled={isProcessing} 
              className="w-full py-5 bg-blue-600 text-white font-black rounded-3xl shadow-xl shadow-blue-200 dark:shadow-none hover:bg-blue-700 transition-all active:scale-[0.98] mt-4 flex items-center justify-center uppercase tracking-widest text-xs"
            >
              {isProcessing ? <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span> : <span>{mode === 'RECOVERY' ? 'Recuperar' : 'Entrar'}</span>}
            </button>
            
            {mode === 'RECOVERY' && (
              <button 
                type="button" 
                onClick={() => setMode('LOGIN')} 
                className="w-full text-sm font-bold text-slate-400 dark:text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
              >
                Volver al inicio de sesión
              </button>
            )}
          </form>

          <div className="mt-10 pt-6 border-t border-slate-50 dark:border-slate-800 text-center">
             <p className="text-[10px] font-black text-slate-300 dark:text-slate-600 uppercase tracking-[0.2em]">Acceso Restringido • Solo Usuarios Autorizados</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Auth;
