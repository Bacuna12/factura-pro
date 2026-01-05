
import React from 'react';
import { NavLink } from 'react-router-dom';
import { User } from '../types';

interface LayoutProps {
  children: React.ReactNode;
  user: User;
  onLogout: () => void;
}

const Layout: React.FC<LayoutProps> = ({ children, user, onLogout }) => {
  const navItems = [
    { path: '/', label: 'Panel', icon: '📊' },
    { path: '/invoices', label: 'Facturas', icon: '🧾' },
    { path: '/quotes', label: 'Presupuestos', icon: '📄' },
    { path: '/expenses', label: 'Gastos', icon: '💸' },
    { path: '/products', label: 'Catálogo', icon: '📦' },
    { path: '/clients', label: 'Clientes', icon: '👥' },
    { path: '/settings', label: 'Ajustes', icon: '⚙️' },
  ];

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-[#F8FAFC]">
      {/* Sidebar Desktop (Premium Look) */}
      <aside className="hidden md:flex flex-col w-72 bg-slate-900 text-white min-h-screen p-8 no-print sticky top-0">
        <div className="mb-12">
          <div className="flex items-center space-x-3 mb-2">
            <div className="w-10 h-10 bg-blue-600 rounded-2xl flex items-center justify-center font-black text-xl shadow-lg shadow-blue-500/20">FP</div>
            <div>
              <h1 className="text-2xl font-black text-white tracking-tighter leading-none">FacturaPro</h1>
              <p className="text-[10px] text-blue-400 font-bold tracking-wider mt-1">by tecnocamaras</p>
            </div>
          </div>
          <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.2em] ml-1 mt-4">Business Engine</p>
        </div>
        
        <nav className="flex-1 space-y-1.5">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center space-x-4 p-4 rounded-2xl transition-all duration-200 group ${
                  isActive 
                    ? 'bg-blue-600 text-white shadow-xl shadow-blue-600/20' 
                    : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                }`
              }
            >
              <span className="text-xl group-hover:scale-110 transition-transform">{item.icon}</span>
              <span className="font-bold tracking-tight">{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="mt-auto pt-6 border-t border-slate-800">
          <div className="bg-slate-800/50 p-4 rounded-2xl mb-4">
            <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-1">Usuario Activo</p>
            <p className="text-sm text-slate-200 font-bold truncate">{user.name}</p>
          </div>
          <button 
            onClick={onLogout}
            className="w-full p-4 rounded-2xl text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-all font-bold text-left flex items-center space-x-3"
          >
            <span>🚪</span>
            <span>Cerrar Sesión</span>
          </button>
        </div>
      </aside>

      {/* Mobile Top Header (Minimal) */}
      <header className="md:hidden bg-white text-gray-900 p-5 flex justify-between items-center shadow-sm z-50 sticky top-0 no-print">
        <div>
          <h1 className="text-xl font-black tracking-tighter text-blue-600 leading-none">FacturaPro</h1>
          <p className="text-[9px] text-gray-400 font-bold tracking-tight">by tecnocamaras</p>
        </div>
        <button 
          onClick={onLogout}
          className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center text-sm"
          title="Cerrar Sesión"
        >
          👋
        </button>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 p-5 md:p-10 lg:p-14 overflow-x-hidden">
        <div className="max-w-6xl mx-auto pb-24 md:pb-0">
          {children}
        </div>
      </main>

      {/* Mobile Bottom Navigation (APK style) */}
      <nav className="md:hidden fixed bottom-6 left-5 right-5 bg-slate-900/95 backdrop-blur-xl text-white rounded-[32px] flex justify-around items-center p-3 no-print shadow-2xl z-[100] border border-white/10">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center w-12 h-12 rounded-2xl transition-all ${
                isActive ? 'bg-blue-600 text-white scale-110' : 'text-slate-500'
              }`
            }
          >
            <span className="text-xl">{item.icon}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
};

export default Layout;
