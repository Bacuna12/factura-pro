
import React, { useState } from 'react';
import { User, UserRole } from '../types';
import { supabase, getSupabaseConfigError, isSupabaseConfigured } from '../services/supabaseClient';

interface AuthProps {
  onLogin: (user: User) => void;
}

const Auth: React.FC<AuthProps> = ({ onLogin }) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');
  const [showFixGuide, setShowFixGuide] = useState<'NONE' | 'EMAIL_DISABLED' | 'CONFIRMATION_PENDING'>('NONE');
  const [formData, setFormData] = useState({ email: '', password: '' });

  const configError = getSupabaseConfigError();
  const isConfigured = isSupabaseConfigured();

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isConfigured) {
      setError(`⚠️ Configuración pendiente: ${configError}`);
      return;
    }

    setIsProcessing(true);
    setError('');
    setShowFixGuide('NONE');

    try {
      // PROCESO DE INICIO DE SESIÓN ÚNICAMENTE
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: formData.email.trim(),
        password: formData.password,
      });

      if (signInError) throw signInError;

      if (data.user) {
        // Mapeo del usuario autenticado
        const user: User = {
          id: data.user.id,
          tenantId: data.user.user_metadata?.tenantId || data.user.id, 
          username: data.user.email || '',
          name: data.user.user_metadata?.full_name || 'Usuario Autorizado',
          role: data.user.user_metadata?.role || UserRole.ADMIN
        };
        onLogin(user);
      }
    } catch (err: any) {
      console.error("Auth Error:", err);
      let msg = err.message || 'Error de conexión';
      
      if (msg.includes('Email logins are disabled')) {
        msg = '🚫 ERROR: El proveedor de Email está desactivado en Supabase.';
        setShowFixGuide('EMAIL_DISABLED');
      } else if (msg.includes('Email not confirmed')) {
        msg = '⚠️ Email no confirmado. Debes desactivar la confirmación en Supabase Auth Settings.';
        setShowFixGuide('CONFIRMATION_PENDING');
      } else if (msg.includes('Invalid login credentials')) {
        msg = '❌ Acceso denegado. Usuario no encontrado o contraseña incorrecta. Asegúrate de que el usuario haya sido creado en el panel de Supabase.';
      }
      
      setError(msg);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 p-4 md:p-6 relative overflow-hidden">
      {/* Elementos decorativos de fondo */}
      <div className="absolute top-0 -left-20 w-72 h-72 bg-blue-600/20 rounded-full blur-3xl animate-blob"></div>
      <div className="absolute bottom-0 -right-20 w-72 h-72 bg-emerald-600/10 rounded-full blur-3xl animate-blob animation-delay-2000"></div>

      <div className="w-full max-w-md bg-white dark:bg-slate-950 rounded-[40px] md:rounded-[48px] shadow-2xl p-6 md:p-10 space-y-8 animate-fadeIn border border-white/10 relative z-10">
        <div className="text-center">
          <div className="w-16 h-16 md:w-20 md:h-20 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-[24px] md:rounded-[28px] text-white text-3xl md:text-4xl font-black flex items-center justify-center mx-auto mb-4 md:mb-6 shadow-2xl shadow-blue-500/20">FP</div>
          <h1 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white tracking-tighter">
            FacturaPro <span className="text-blue-600">Cloud</span>
          </h1>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">
            Gestión Profesional con Sincronización
          </p>
        </div>

        {error && (
          <div className="space-y-4">
            <div className="p-5 bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 text-[11px] font-bold rounded-3xl border border-rose-200 dark:border-rose-800/50 text-left leading-relaxed">
              {error}
            </div>
            
            {showFixGuide !== 'NONE' && (
              <div className="p-5 bg-blue-50 dark:bg-blue-900/30 rounded-3xl border border-blue-100 dark:border-blue-800 space-y-3">
                <p className="text-[10px] font-black text-blue-700 dark:text-blue-300 uppercase tracking-widest">¿Cómo solucionarlo?</p>
                <ol className="text-[10px] font-bold text-blue-800 dark:text-blue-400 space-y-2 list-decimal ml-4 text-left">
                  <li>Ve a tu panel de <b>Supabase</b>.</li>
                  <li>Entra en <b>Authentication</b> -> <b>Providers</b>.</li>
                  <li>En la sección <b>Email</b>:
                    <ul className="mt-1 list-disc ml-4">
                      <li>Activa <b>"Enable Email provider"</b>.</li>
                      <li>Desactiva <b>"Confirm Email"</b>.</li>
                    </ul>
                  </li>
                  <li>Guarda y vuelve a intentar aquí.</li>
                </ol>
              </div>
            )}
          </div>
        )}

        <form onSubmit={handleAuth} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Email</label>
            <input 
              type="email" required 
              value={formData.email}
              onChange={e => setFormData({...formData, email: e.target.value})}
              className="w-full p-4 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl font-bold outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white transition-all" 
              placeholder="admin@ejemplo.com"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Contraseña</label>
            <input 
              type="password" required 
              value={formData.password}
              onChange={e => setFormData({...formData, password: e.target.value})}
              className="w-full p-4 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl font-bold outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white transition-all" 
              placeholder="••••••••"
            />
          </div>
          <button 
            type="submit" 
            disabled={isProcessing}
            className="w-full py-5 bg-blue-600 hover:bg-blue-700 text-white rounded-[28px] font-black shadow-xl transition-all text-xs uppercase tracking-widest active:scale-95 disabled:opacity-50"
          >
            {isProcessing ? 'Verificando...' : 'Entrar al Sistema'}
          </button>
        </form>

        <div className="text-center space-y-4 pt-4">
          <p className="text-[10px] font-bold text-slate-400">
            Si no tienes acceso, contacta con tu administrador.
          </p>
          <div className="opacity-30">
             <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">V4.8 • Secure Admin Access</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Auth;
