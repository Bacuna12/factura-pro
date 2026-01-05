
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Document, DocumentType, DocumentStatus, AppSettings, Expense } from '../types';

interface DashboardProps {
  documents: Document[];
  expenses: Expense[];
  clientsCount: number;
  settings: AppSettings;
}

const Dashboard: React.FC<DashboardProps> = ({ documents, expenses, clientsCount, settings }) => {
  const navigate = useNavigate();

  const calculateTotal = (doc: Document) => {
    const subtotal = doc.items.reduce((acc, item) => acc + (item.quantity * item.unitPrice), 0);
    return subtotal + (subtotal * (doc.taxRate / 100));
  };

  const calculatePaidAmount = (doc: Document) => {
    return (doc.payments || []).reduce((acc, p) => acc + p.amount, 0);
  };

  const invoices = documents.filter(d => d.type === DocumentType.INVOICE);
  const totalInvoiced = invoices.reduce((acc, i) => acc + calculatePaidAmount(i), 0);
  const totalExpenses = expenses.reduce((acc, e) => acc + e.amount, 0);
  const netProfit = totalInvoiced - totalExpenses;

  const pendingAmount = invoices
    .filter(i => i.status !== DocumentStatus.PAID && i.status !== DocumentStatus.REJECTED)
    .reduce((acc, i) => acc + (calculateTotal(i) - calculatePaidAmount(i)), 0);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: settings.currency,
      minimumFractionDigits: 0
    }).format(amount);
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      <header className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-black text-gray-900 tracking-tight">Panel de Control</h2>
          <p className="text-gray-500 font-medium">Balance general de tu negocio</p>
        </div>
        <div className="hidden sm:block">
          <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-bold uppercase tracking-widest">
            {settings.companyName}
          </span>
        </div>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title="Ingresos Reales" 
          value={formatCurrency(totalInvoiced)} 
          icon="💰" 
          color="bg-emerald-500"
          trend="Pagos recibidos"
        />
        <StatCard 
          title="Gastos Totales" 
          value={formatCurrency(totalExpenses)} 
          icon="💸" 
          color="bg-rose-500"
          trend="Egresos registrados"
        />
        <StatCard 
          title="Utilidad Neta" 
          value={formatCurrency(netProfit)} 
          icon="📈" 
          color={netProfit >= 0 ? "bg-blue-500" : "bg-orange-500"}
          trend="Beneficio real"
        />
        <StatCard 
          title="Por Cobrar" 
          value={formatCurrency(pendingAmount)} 
          icon="⏳" 
          color="bg-amber-500"
          trend="Cartera pendiente"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-6 border-b border-gray-50 flex justify-between items-center">
            <h3 className="text-lg font-bold text-gray-800">Actividad Reciente</h3>
            <button 
              onClick={() => navigate('/invoices')}
              className="text-blue-600 text-sm font-bold hover:underline"
            >
              Ver todo
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="text-[10px] uppercase text-gray-400 bg-gray-50 font-black tracking-widest">
                <tr>
                  <th className="px-6 py-4">Documento</th>
                  <th className="px-6 py-4">Estado</th>
                  <th className="px-6 py-4">Total</th>
                  <th className="px-6 py-4 text-right">Fecha</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {documents.slice(0, 6).map(doc => (
                  <tr key={doc.id} className="hover:bg-gray-50/50 transition-colors cursor-pointer" onClick={() => navigate(doc.type === DocumentType.INVOICE ? `/invoices/edit/${doc.id}` : `/quotes/edit/${doc.id}`)}>
                    <td className="px-6 py-4">
                      <p className="font-bold text-gray-800">#{doc.number}</p>
                      <p className="text-xs text-gray-400 capitalize">{doc.type.toLowerCase()}</p>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase ${
                        doc.status === DocumentStatus.PAID || doc.status === DocumentStatus.ACCEPTED 
                          ? 'bg-emerald-100 text-emerald-700' 
                          : doc.status === DocumentStatus.REJECTED 
                          ? 'bg-rose-100 text-rose-700'
                          : doc.status === DocumentStatus.PARTIAL
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-amber-100 text-amber-700'
                      }`}>
                        {doc.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-black text-gray-900">
                      {formatCurrency(calculateTotal(doc))}
                    </td>
                    <td className="px-6 py-4 text-right text-gray-400 text-xs font-medium">
                      {doc.date}
                    </td>
                  </tr>
                ))}
                {documents.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-20 text-center">
                      <div className="text-4xl mb-4">📉</div>
                      <p className="text-gray-400 italic font-medium">Aún no hay actividad registrada</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-3xl p-6 text-white shadow-xl relative overflow-hidden">
            <div className="relative z-10">
              <h4 className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-1">Margen de Ganancia</h4>
              <p className="text-3xl font-black mb-4">
                {totalInvoiced > 0 ? Math.round((netProfit / totalInvoiced) * 100) : 0}%
              </p>
              <div className="flex items-center space-x-2 text-blue-400 text-sm font-bold">
                <span>⚡</span>
                <span>Eficiencia operativa</span>
              </div>
            </div>
            <div className="absolute -right-4 -bottom-4 opacity-10 text-8xl">💎</div>
          </div>
          
          <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm">
            <h4 className="text-gray-800 font-bold mb-4">Resumen de Gastos</h4>
            <div className="space-y-4">
              {expenses.slice(0, 4).map(e => (
                <div key={e.id} className="flex justify-between items-center">
                  <div>
                    <p className="text-xs font-bold text-gray-800 truncate max-w-[120px]">{e.description}</p>
                    <p className="text-[10px] text-gray-400">{e.category}</p>
                  </div>
                  <p className="text-sm font-black text-rose-600">-{formatCurrency(e.amount)}</p>
                </div>
              ))}
              {expenses.length === 0 && <p className="text-xs text-gray-400 italic">No hay gastos recientes</p>}
              {expenses.length > 4 && (
                <button onClick={() => navigate('/expenses')} className="text-xs text-blue-600 font-bold hover:underline w-full text-center pt-2">Ver todos los gastos</button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const StatCard: React.FC<{ title: string; value: string; icon: string; color: string; trend: string }> = ({ title, value, icon, color, trend }) => (
  <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 hover:shadow-md transition-all group">
    <div className="flex justify-between items-start mb-4">
      <div className={`w-12 h-12 rounded-2xl ${color} text-white flex items-center justify-center text-xl shadow-lg shadow-gray-200 group-hover:scale-110 transition-transform`}>
        {icon}
      </div>
    </div>
    <p className="text-xs text-gray-400 font-black uppercase tracking-widest mb-1">{title}</p>
    <p className="text-2xl font-black text-gray-900 mb-2 truncate">{value}</p>
    <p className="text-[10px] text-gray-400 font-bold">{trend}</p>
  </div>
);

export default Dashboard;
