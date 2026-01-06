
import React from 'react';
import { NavLink } from 'react-router-dom';
import { User, UserRole } from '../types';

interface LayoutProps {
  children: React.ReactNode;
  user: User;
  onLogout: () => void;
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
}

const Layout: React.FC<LayoutProps> = ({ children, user, onLogout, isDarkMode, onToggleDarkMode }) => {
  const navItems = [
    { path: '/', label: 'Panel', icon: '📊', roles: [UserRole.ADMIN, UserRole.SELLER] },
    { path: '/pos', label: 'Caja / POS', icon: '🛒', roles: [UserRole.ADMIN, UserRole.SELLER] },
    { path: '/invoices', label: 'Facturas', icon: '🧾', roles: [UserRole.ADMIN, UserRole.SELLER] },
    { path: '/collections', label: 'Cuentas Cobro', icon: '📝', roles: [UserRole.ADMIN, UserRole.SELLER] },
    { path: '/quotes', label: 'Presupuestos', icon: '📄', roles: [UserRole.ADMIN, UserRole.SELLER] },
    { path: '/expenses', label: 'Gastos', icon: '💸', roles: [UserRole.ADMIN] },
    { path: '/products', label: 'Catálogo', icon: '📦', roles: [UserRole.ADMIN, UserRole.SELLER] },
    { path: '/clients', label: 'Clientes', icon: '👥', roles: [UserRole.ADMIN, UserRole.SELLER] },
    { path: '/settings', label: 'Ajustes', icon: '⚙️', roles: [UserRole.ADMIN] },
  ];

  const filteredItems = navItems.filter(item => item.roles.includes(user.role));

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-[#F8FAFC] dark:bg-slate-950 transition-colors duration-300">
      {/* Sidebar Desktop */}
      <aside className="hidden md:flex flex-col w-72 bg-slate-900 dark:bg-black text-white min-h-screen p-8 no-print sticky top-0 border-r border-white/5">
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
        
        <nav className="flex-1 space-y-1.5 overflow-y-auto scrollbar-hide">
          {filteredItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center space-x-4 p-4 rounded-2xl transition-all duration-200 group ${
                  isActive 
                    ? 'bg-blue-600 text-white shadow-xl shadow-blue-600/20' 
                    : 'text-slate-400 hover:bg-slate-800 dark:hover:bg-slate-900 hover:text-white'
                }`
              }
            >
              <span className="text-xl group-hover:scale-110 transition-transform">{item.icon}</span>
              <span className="font-bold tracking-tight">{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="mt-auto pt-6 border-t border-slate-800 space-y-4">
          <button 
            onClick={onToggleDarkMode}
            className="w-full p-4 flex items-center justify-between bg-slate-800 dark:bg-slate-900 rounded-2xl transition-all hover:bg-slate-700"
          >
            <span className="font-bold text-xs uppercase tracking-widest text-slate-300">Tema {isDarkMode ? 'Oscuro' : 'Claro'}</span>
            <span className="text-xl">{isDarkMode ? '🌙' : '☀️'}</span>
          </button>

          <div className="bg-slate-800/50 p-4 rounded-2xl text-center">
            <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-1">{user.role}</p>
            <p className="text-sm text-slate-200 font-bold truncate">{user.name}</p>
          </div>
          <button 
            onClick={onLogout}
            className="w-full p-4 flex items-center justify-center space-x-3 text-rose-400 font-black text-[10px] uppercase tracking-widest hover:bg-rose-500/10 rounded-2xl transition-all"
          >
            <span>🚪</span>
            <span>Cerrar Sesión</span>
          </button>
        </div>
      </aside>

      {/* Mobile Top Header */}
      <header className="md:hidden bg-white dark:bg-slate-900 text-gray-900 dark:text-white p-5 flex justify-between items-center shadow-sm z-50 sticky top-0 no-print border-b border-gray-100 dark:border-slate-800">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-blue-600 text-white rounded-xl flex items-center justify-center font-black text-sm">FP</div>
          <div>
            <h1 className="text-lg font-black tracking-tighter text-slate-900 dark:text-white leading-none">FacturaPro</h1>
            <p className="text-[8px] text-blue-500 font-bold tracking-tight uppercase">{user.role}</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <button onClick={onToggleDarkMode} className="text-xl">{isDarkMode ? '🌙' : '☀️'}</button>
          <button onClick={onLogout} className="text-xl">🚪</button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 p-4 md:p-10 lg:p-14 overflow-hidden">
        <div className="max-w-7xl mx-auto pb-32 md:pb-10">
          {children}
        </div>
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-6 left-5 right-5 bg-slate-900/95 dark:bg-black/95 backdrop-blur-xl text-white rounded-[32px] flex justify-around items-center p-3 no-print shadow-2xl z-[100] border border-white/10 overflow-x-auto scrollbar-hide">
        {filteredItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center flex-shrink-0 w-12 h-12 rounded-2xl transition-all ${
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
