
import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Document, DocumentType, DocumentStatus, AppSettings, Expense, Client, Payment, User, UserRole, Product } from '../types';
import { exportToPDF } from '../services/pdfService';
import ConfirmModal from './ConfirmModal';

interface DashboardProps {
  user: User;
  documents: Document[];
  expenses: Expense[];
  clientsCount: number;
  settings: AppSettings;
  onDeleteDoc: (id: string) => void;
  onUpdateDoc: (doc: Document) => void;
  clients: Client[];
  products: Product[];
}

const Dashboard: React.FC<DashboardProps> = ({ user, documents, expenses, clientsCount, settings, onDeleteDoc, onUpdateDoc, clients, products }) => {
  const navigate = useNavigate();
  const [docToDelete, setDocToDelete] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const isAdmin = user.role === UserRole.ADMIN;
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  const isFromCurrentMonth = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  };

  const revenueDocs = documents.filter(d => isFromCurrentMonth(d.date) && (d.type === DocumentType.INVOICE || d.type === DocumentType.ACCOUNT_COLLECTION));
  
  const totalInvoiced = revenueDocs.reduce((acc, doc) => {
    const paid = (doc.payments || []).reduce((pAcc, p) => pAcc + p.amount, 0);
    return acc + paid;
  }, 0);

  const totalExpenses = expenses.filter(e => isFromCurrentMonth(e.date)).reduce((acc, e) => acc + e.amount, 0);
  const pendingAmount = revenueDocs.reduce((acc, doc) => {
    const total = doc.items.reduce((iAcc, i) => iAcc + (i.quantity * i.unitPrice), 0);
    const paid = (doc.payments || []).reduce((pAcc, p) => pAcc + p.amount, 0);
    return acc + (total - paid);
  }, 0);

  const formatCurrency = (amount: number) => {
    try {
      return new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: settings.currency || 'COP',
        minimumFractionDigits: 0
      }).format(amount);
    } catch (e) {
      return (settings.currency || '$') + ' ' + amount.toLocaleString('es-CO');
    }
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      <ConfirmModal 
        isOpen={!!docToDelete}
        title="Eliminar Documento"
        message="¿Estás seguro de que deseas borrar este registro?"
        onConfirm={() => { if (docToDelete) onDeleteDoc(docToDelete); setDocToDelete(null); }}
        onCancel={() => setDocToDelete(null)}
      />

      <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
             <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight uppercase leading-none">Panel de Control</h2>
             <div className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest flex items-center gap-2 ${isOnline ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700 animate-pulse'}`}>
                <div className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-emerald-500' : 'bg-rose-500'}`}></div>
                {isOnline ? 'Sincronizado' : 'Modo Offline'}
             </div>
          </div>
          <p className="text-slate-500 dark:text-slate-400 font-medium">Gestionando {settings.companyName}</p>
        </div>
        <div className="flex items-center gap-3 bg-white dark:bg-slate-900 p-2 pr-6 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800">
          <div className="w-10 h-10 rounded-2xl bg-blue-600 flex items-center justify-center text-white text-xl font-bold shadow-lg">{user.name.charAt(0)}</div>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Usuario Pro</p>
            <p className="text-xs font-bold text-slate-900 dark:text-white">{user.name}</p>
          </div>
        </div>
      </header>

      {isAdmin && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 animate-slideIn">
          <StatCard title="Cobrado (Mes)" value={formatCurrency(totalInvoiced)} icon="💰" color="bg-emerald-500" />
          <StatCard title="Gastos (Mes)" value={formatCurrency(totalExpenses)} icon="💸" color="bg-rose-500" />
          <StatCard title="Pendiente" value={formatCurrency(pendingAmount)} icon="⏳" color="bg-amber-500" />
          <StatCard title="Utilidad" value={formatCurrency(totalInvoiced - totalExpenses)} icon="📈" color="bg-blue-500" />
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <QuickAction color="bg-blue-600" icon="🧾" title="Nueva Factura" subtitle="Venta de productos" onClick={() => navigate('/invoices/new')} />
        <QuickAction color="bg-violet-600" icon="📝" title="Cta. Cobro" subtitle="Servicios profesionales" onClick={() => navigate('/collections/new')} />
        <QuickAction color="bg-emerald-500" icon="🛒" title="Modo POS" subtitle="Venta rápida" onClick={() => navigate('/pos')} />
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-[40px] shadow-sm border border-gray-100 dark:border-slate-800 overflow-hidden">
        <div className="p-8 border-b dark:border-slate-800 flex justify-between items-center">
          <h3 className="font-black text-slate-900 dark:text-white uppercase tracking-tighter">Actividad Reciente</h3>
          <button onClick={() => navigate('/search')} className="text-blue-600 text-[10px] font-black uppercase tracking-widest">Ver todo el historial</button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50 dark:bg-slate-800/50 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b dark:border-slate-800">
              <tr>
                <th className="px-8 py-4">Ref</th>
                <th className="px-8 py-4">Cliente</th>
                <th className="px-8 py-4">Total</th>
                <th className="px-8 py-4 text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-slate-800">
              {documents.slice(0, 5).map(doc => {
                const total = doc.items.reduce((acc, i) => acc + (i.quantity * i.unitPrice), 0);
                return (
                  <tr key={doc.id} className="hover:bg-gray-50/50 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="px-8 py-5 font-bold text-gray-900 dark:text-slate-100">#{doc.number}</td>
                    <td className="px-8 py-5 font-medium text-slate-600 dark:text-slate-400">{clients.find(c => c.id === doc.clientId)?.name || 'General'}</td>
                    <td className="px-8 py-5 font-black text-slate-900 dark:text-white">{formatCurrency(total)}</td>
                    <td className="px-8 py-5 text-right">
                      <button onClick={() => exportToPDF(doc, clients.find(c => c.id === doc.clientId), settings)} className="p-2 text-indigo-600">📥</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const StatCard = ({ title, value, icon, color }: any) => (
  <div className="bg-white dark:bg-slate-900 p-8 rounded-[40px] shadow-sm border border-slate-100 dark:border-slate-800 transition-all hover:scale-[1.03]">
    <div className={`w-12 h-12 rounded-2xl ${color} text-white flex items-center justify-center mb-6 shadow-lg`}>{icon}</div>
    <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-1">{title}</p>
    <p className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">{value}</p>
  </div>
);

const QuickAction = ({ color, icon, title, subtitle, onClick }: any) => (
  <button onClick={onClick} className={`${color} p-8 rounded-[40px] text-white text-left shadow-2xl hover:scale-[1.02] active:scale-95 transition-all flex flex-col group`}>
    <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center text-3xl mb-6 group-hover:rotate-12 transition-transform">{icon}</div>
    <h3 className="text-xl font-black uppercase tracking-tight">{title}</h3>
    <p className="text-[10px] font-bold opacity-60 uppercase mt-1">{subtitle}</p>
  </button>
);

export default Dashboard;
