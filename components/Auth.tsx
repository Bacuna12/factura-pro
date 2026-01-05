
import React, { useState, useEffect } from 'react';
import { User, AppSettings } from '../types';
import { generateWelcomeEmail, generateRecoveryEmail } from '../services/geminiService';

interface AuthProps {
  onLogin: (user: User, settings?: AppSettings) => void;
}

const Auth: React.FC<AuthProps> = ({ onLogin }) => {
  const [mode, setMode] = useState<'LOGIN' | 'REGISTER' | 'RECOVERY'>('LOGIN');
  const [error, setError] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [registrationSuccess, setRegistrationSuccess] = useState<{user: User, settings?: AppSettings, emailPreview: string, title: string} | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    name: '',
    companyName: '',
    companyId: '',
    companyAddress: '',
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

  const validateEmail = (email: string) => {
    return String(email)
      .toLowerCase()
      .match(
        /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
      );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const users = JSON.parse(localStorage.getItem('facturapro_users') || '[]');

    if (mode === 'REGISTER') {
      if (!validateEmail(formData.username)) {
        setError('Ingresa un correo electrónico válido');
        return;
      }
      if (!formData.username || !formData.password || !formData.companyName) {
        setError('Completa los campos obligatorios');
        return;
      }

      setIsProcessing(true);
      const newUser: User = {
        id: Math.random().toString(36).substr(2, 9),
        username: formData.username,
        password: formData.password,
        name: formData.name || formData.username.split('@')[0]
      };
      const newSettings: AppSettings = {
        companyName: formData.companyName,
        companyId: formData.companyId,
        companyAddress: formData.companyAddress,
        currency: 'COP',
        defaultTaxRate: 19
      };

      const emailBody = await generateWelcomeEmail(newUser.name, newSettings.companyName);
      localStorage.setItem('facturapro_users', JSON.stringify([...users, newUser]));
      
      setIsProcessing(false);
      setRegistrationSuccess({ user: newUser, settings: newSettings, emailPreview: emailBody, title: '¡Registro Exitoso!' });

    } else if (mode === 'RECOVERY') {
      if (!validateEmail(formData.username)) {
        setError('Ingresa el correo vinculado a tu cuenta');
        return;
      }

      setIsProcessing(true);
      const foundUser = users.find((u: User) => u.username.toLowerCase() === formData.username.toLowerCase());
      
      if (foundUser) {
        const recoveryBody = await generateRecoveryEmail(foundUser.name, foundUser.password || 'N/A');
        setIsProcessing(false);
        setRegistrationSuccess({ 
          user: foundUser, 
          emailPreview: recoveryBody, 
          title: 'Correo de Recuperación Enviado' 
        });
      } else {
        setIsProcessing(false);
        setError('No encontramos ninguna cuenta con ese correo');
      }

    } else {
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
        setError('Correo o contraseña incorrectos');
      }
    }
  };

  if (registrationSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6 animate-fadeIn">
        <div className="w-full max-w-xl bg-white p-8 md:p-12 rounded-[48px] shadow-2xl border border-slate-100 text-center">
          <div className="w-24 h-24 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-4xl mx-auto mb-8 animate-bounce">
            {mode === 'RECOVERY' ? '🔑' : '📩'}
          </div>
          <h2 className="text-3xl font-black text-slate-900 mb-4 tracking-tighter">{registrationSuccess.title}</h2>
          <p className="text-slate-500 font-medium mb-8">
            Revisa la bandeja de entrada de <br/>
            <span className="text-blue-600 font-bold">{registrationSuccess.user.username}</span>
          </p>

          <div className="bg-slate-50 p-6 rounded-3xl text-left border border-slate-100 mb-8 max-h-64 overflow-y-auto shadow-inner">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Vista previa del mensaje:</p>
            <div className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap font-medium">
              {registrationSuccess.emailPreview}
            </div>
          </div>

          <button 
            onClick={() => {
              if (mode === 'RECOVERY') {
                setRegistrationSuccess(null);
                setMode('LOGIN');
              } else {
                onLogin(registrationSuccess.user, registrationSuccess.settings);
              }
            }}
            className="w-full py-5 bg-blue-600 text-white font-black rounded-3xl shadow-xl shadow-blue-200 hover:bg-blue-700 transition-all active:scale-95"
          >
            {mode === 'RECOVERY' ? 'Volver al Inicio de Sesión' : 'Entrar al Panel de Control'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6 relative overflow-hidden">
      {/* Blobs decorativos */}
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
            {mode === 'REGISTER' ? 'Crear mi cuenta' : mode === 'RECOVERY' ? 'Recuperar acceso' : 'Bienvenido de nuevo'}
          </h2>
          <p className="text-slate-400 font-medium text-sm mb-8">
            {mode === 'REGISTER' ? 'Regístrate con tu correo corporativo' : mode === 'RECOVERY' ? 'Te enviaremos tus credenciales al correo' : 'Ingresa tus credenciales para continuar'}
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
                  type="email" 
                  required
                  placeholder="Correo electrónico"
                  value={formData.username}
                  onChange={e => setFormData({...formData, username: e.target.value})}
                  className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 font-bold transition-all text-sm group-hover:bg-slate-100"
                />
              </div>
              
              {mode !== 'RECOVERY' && (
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
              )}

              {mode === 'LOGIN' && (
                <div className="flex justify-between items-center px-2">
                  <label className="flex items-center space-x-2 cursor-pointer group">
                    <input 
                      type="checkbox" 
                      checked={rememberMe}
                      onChange={() => setRememberMe(!rememberMe)}
                      className="sr-only"
                    />
                    <div className={`w-5 h-5 rounded-lg border-2 transition-all flex items-center justify-center ${rememberMe ? 'bg-blue-600 border-blue-600' : 'bg-white border-slate-200 group-hover:border-blue-400'}`}>
                      {rememberMe && <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M5 13l4 4L19 7" /></svg>}
                    </div>
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest group-hover:text-slate-600">Recordar</span>
                  </label>
                  <button 
                    type="button"
                    onClick={() => setMode('RECOVERY')}
                    className="text-[10px] font-black text-blue-600 uppercase tracking-widest hover:text-blue-700 transition-colors"
                  >
                    ¿Olvidaste tu contraseña?
                  </button>
                </div>
              )}

              {mode === 'REGISTER' && (
                <div className="pt-4 space-y-4 animate-fadeIn">
                  <div className="h-px bg-slate-100 w-full mb-6"></div>
                  <input 
                    type="text" required placeholder="Tu nombre completo"
                    value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})}
                    className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 font-bold transition-all text-sm"
                  />
                  <input 
                    type="text" required placeholder="Nombre de la Empresa"
                    value={formData.companyName} onChange={e => setFormData({...formData, companyName: e.target.value})}
                    className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 font-bold transition-all text-sm"
                  />
                </div>
              )}
            </div>

            <button 
              type="submit"
              disabled={isProcessing}
              className="w-full py-5 bg-blue-600 text-white font-black rounded-3xl shadow-xl shadow-blue-200 hover:bg-blue-700 transition-all active:scale-[0.98] mt-6 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
            >
              {isProcessing ? (
                <>
                  <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                  <span>Procesando...</span>
                </>
              ) : (
                <span>{mode === 'REGISTER' ? 'Comenzar ahora' : mode === 'RECOVERY' ? 'Recuperar mi contraseña' : 'Iniciar Sesión'}</span>
              )}
            </button>
          </form>

          <div className="mt-8 text-center flex flex-col space-y-3">
            {mode !== 'LOGIN' && (
              <button 
                onClick={() => setMode('LOGIN')}
                className="text-sm font-bold text-slate-400 hover:text-blue-600 transition-colors"
              >
                Volver al inicio de sesión
              </button>
            )}
            {mode === 'LOGIN' && (
              <button 
                onClick={() => setMode('REGISTER')}
                className="text-sm font-bold text-slate-400 hover:text-blue-600 transition-colors"
              >
                ¿Nuevo aquí? Registra tu empresa
              </button>
            )}
          </div>
        </div>
        
        <p className="text-center mt-10 text-[10px] text-slate-300 font-black uppercase tracking-[0.3em]">
          Secure Business Engine v2.5
        </p>
      </div>
    </div>
  );
};

export default Auth;
