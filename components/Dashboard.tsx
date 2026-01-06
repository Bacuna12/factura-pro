
import React, { useState, useMemo } from 'react';
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
  
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [activeDocForPayment, setActiveDocForPayment] = useState<Document | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<string>('0');
  const [paymentMethod, setPaymentMethod] = useState('Efectivo');

  const isAdmin = user.role === UserRole.ADMIN;

  const lowStockProducts = useMemo(() => {
    return products.filter(p => (p.stock || 0) < 5).slice(0, 5);
  }, [products]);

  const calculateTotal = (doc: Document) => {
    const subtotal = doc.items.reduce((acc, item) => acc + (item.quantity * item.unitPrice), 0);
    const tax = subtotal * (doc.taxRate / 100);
    const gross = subtotal + tax;
    const withholding = gross * ((doc.withholdingRate || 0) / 100);
    return gross - withholding;
  };

  const calculatePaidAmount = (doc: Document) => {
    return (doc.payments || []).reduce((acc, p) => acc + p.amount, 0);
  };

  const revenueDocs = documents.filter(d => d.type === DocumentType.INVOICE || d.type === DocumentType.ACCOUNT_COLLECTION);
  const totalInvoiced = revenueDocs.reduce((acc, i) => acc + calculatePaidAmount(i), 0);
  const totalExpenses = expenses.reduce((acc, e) => acc + e.amount, 0);
  const netProfit = totalInvoiced - totalExpenses;

  const pendingAmount = revenueDocs
    .filter(i => i.status !== DocumentStatus.PAID && i.status !== DocumentStatus.REJECTED)
    .reduce((acc, i) => acc + (calculateTotal(i) - calculatePaidAmount(i)), 0);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: settings.currency,
      minimumFractionDigits: 0
    }).format(amount);
  };

  const handleExportPDF = (doc: Document) => {
    const client = clients.find(c => c.id === doc.clientId);
    exportToPDF(doc, client, settings);
  };

  const handleOpenPayment = (doc: Document) => {
    const total = calculateTotal(doc);
    const paid = calculatePaidAmount(doc);
    const remaining = Math.max(0, total - paid);
    setActiveDocForPayment(doc);
    setPaymentAmount(remaining.toFixed(0));
    setPaymentMethod(doc.paymentMethod || 'Efectivo');
    setTimeout(() => setIsPaymentModalOpen(true), 50);
  };

  const handleRegisterPayment = (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = parseFloat(paymentAmount);
    if (!activeDocForPayment || isNaN(amountNum) || amountNum <= 0) return;
    const newPayment: Payment = {
      id: Math.random().toString(36).substr(2, 9),
      date: new Date().toISOString().split('T')[0],
      amount: amountNum,
      method: paymentMethod
    };
    const updatedPayments = [...(activeDocForPayment.payments || []), newPayment];
    const totalPaid = updatedPayments.reduce((acc, p) => acc + p.amount, 0);
    const docTotal = calculateTotal(activeDocForPayment);
    let newStatus = activeDocForPayment.status;
    if (totalPaid >= docTotal - 1) newStatus = DocumentStatus.PAID;
    else if (totalPaid > 0) newStatus = DocumentStatus.PARTIAL;
    onUpdateDoc({ ...activeDocForPayment, payments: updatedPayments, status: newStatus, paymentMethod });
    setIsPaymentModalOpen(false);
    setActiveDocForPayment(null);
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      <ConfirmModal 
        isOpen={!!docToDelete}
        title="Eliminar Documento"
        message="¿Estás seguro?"
        onConfirm={() => { if (docToDelete) onDeleteDoc(docToDelete); setDocToDelete(null); }}
        onCancel={() => setDocToDelete(null)}
      />

      {isPaymentModalOpen && activeDocForPayment && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-xl flex items-center justify-center p-4 z-[99999]" onClick={() => setIsPaymentModalOpen(false)}>
          <div className="bg-white dark:bg-slate-900 rounded-[40px] w-full max-w-sm overflow-hidden shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="bg-emerald-600 p-8 text-white">
              <h3 className="text-2xl font-black">Cobrar Documento</h3>
              <p className="text-emerald-100 text-xs">#{activeDocForPayment.number}</p>
            </div>
            <form onSubmit={handleRegisterPayment} className="p-8 space-y-6">
              <div className="bg-emerald-50 dark:bg-emerald-900/20 p-4 rounded-2xl text-center">
                 <p className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase mb-1">Saldo</p>
                 <p className="text-2xl font-black text-emerald-900 dark:text-emerald-100">{formatCurrency(calculateTotal(activeDocForPayment) - calculatePaidAmount(activeDocForPayment))}</p>
              </div>
              <input type="number" required step="any" value={paymentAmount} onChange={e => setPaymentAmount(e.target.value)} className="w-full p-4 bg-gray-50 dark:bg-slate-800 dark:text-white rounded-2xl border-2 border-transparent focus:border-emerald-500 font-black text-2xl text-emerald-600 outline-none" />
              <select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)} className="w-full p-4 bg-gray-50 dark:bg-slate-800 dark:text-white rounded-2xl font-bold outline-none">
                <option value="Efectivo">Efectivo</option>
                <option value="Transferencia">Transferencia</option>
                <option value="Nequi">Nequi</option>
                <option value="Daviplata">Daviplata</option>
              </select>
              <button type="submit" className="w-full py-5 bg-emerald-600 text-white rounded-3xl font-black shadow-lg active:scale-95 transition-all">Confirmar Pago</button>
            </form>
          </div>
        </div>
      )}

      <header>
        <h2 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight">¡Hola, {user.name.split(' ')[0]}!</h2>
        <p className="text-gray-500 dark:text-slate-400 font-medium">{isAdmin ? 'Resumen financiero actual' : 'Panel de operaciones rápidas'}</p>
      </header>

      {isAdmin && lowStockProducts.length > 0 && (
        <div className="bg-rose-50 dark:bg-rose-900/10 border border-rose-100 dark:border-rose-800/50 p-6 rounded-[32px] animate-pulse flex flex-col md:flex-row items-center justify-between gap-4">
           <div className="flex items-center gap-4">
              <span className="text-3xl">⚠️</span>
              <div>
                <h4 className="font-black text-rose-700 dark:text-rose-400 text-sm uppercase tracking-widest">Alerta de Inventario Crítico</h4>
                <p className="text-rose-600/70 dark:text-rose-500/70 text-xs font-bold">Tienes {lowStockProducts.length} productos por agotarse.</p>
              </div>
           </div>
           <div className="flex gap-2">
              {lowStockProducts.map(p => (
                <div key={p.id} className="w-8 h-8 rounded-lg bg-rose-200 dark:bg-rose-800 flex items-center justify-center text-[10px] font-black" title={p.description}>{p.stock}</div>
              ))}
              <button onClick={() => navigate('/products')} className="ml-2 px-4 py-2 bg-rose-600 text-white rounded-xl text-[10px] font-black uppercase">Ver Todos</button>
           </div>
        </div>
      )}

      {isAdmin ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard title="Ingresos" value={formatCurrency(totalInvoiced)} icon="💰" color="bg-emerald-500" />
          <StatCard title="Gastos" value={formatCurrency(totalExpenses)} icon="💸" color="bg-rose-500" />
          <StatCard title="Utilidad" value={formatCurrency(netProfit)} icon="📈" color="bg-blue-500" />
          <StatCard title="Pendiente" value={formatCurrency(pendingAmount)} icon="⏳" color="bg-amber-500" />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <button onClick={() => navigate('/pos')} className="bg-blue-600 p-8 rounded-[40px] text-white text-left shadow-xl hover:scale-[1.02] transition-all">
            <span className="text-4xl block mb-4">🛒</span>
            <p className="text-[10px] font-black uppercase tracking-widest opacity-60">Abrir Caja</p>
            <h3 className="text-2xl font-black">Punto de Venta</h3>
          </button>
          <button onClick={() => navigate('/invoices/new')} className="bg-slate-900 p-8 rounded-[40px] text-white text-left shadow-xl hover:scale-[1.02] transition-all border border-white/5">
            <span className="text-4xl block mb-4">🧾</span>
            <p className="text-[10px] font-black uppercase tracking-widest opacity-60">Nueva Venta</p>
            <h3 className="text-2xl font-black">Facturar</h3>
          </button>
        </div>
      )}

      <div className="bg-white dark:bg-slate-900 rounded-[40px] shadow-sm border border-gray-100 dark:border-slate-800 overflow-hidden">
        <div className="p-8 border-b border-gray-50 dark:border-slate-800 flex justify-between items-center">
          <h3 className="font-black text-slate-900 dark:text-white uppercase tracking-tighter">Ventas Recientes</h3>
          <button onClick={() => navigate('/invoices')} className="text-blue-600 dark:text-blue-400 text-xs font-black uppercase tracking-widest">Ver Historial</button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50 dark:bg-slate-800/50 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b dark:border-slate-800">
              <tr>
                <th className="px-8 py-4">Ref</th>
                <th className="px-8 py-4">Total</th>
                <th className="px-8 py-4 text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-slate-800">
              {documents.slice(0, 5).map(doc => {
                const total = calculateTotal(doc);
                const paid = calculatePaidAmount(doc);
                const isPaid = (total - paid) < 1;
                return (
                  <tr key={doc.id} className="hover:bg-gray-50/50 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="px-8 py-5 font-bold text-gray-900 dark:text-slate-100">#{doc.number}</td>
                    <td className="px-8 py-5 font-black text-gray-900 dark:text-slate-100">{formatCurrency(total)}</td>
                    <td className="px-8 py-5 text-right">
                      <div className="flex justify-end space-x-2">
                        {!isPaid && (doc.type === DocumentType.INVOICE || doc.type === DocumentType.ACCOUNT_COLLECTION) && (
                          <button onClick={() => handleOpenPayment(doc)} className="p-2 text-emerald-600 dark:text-emerald-400">💸</button>
                        )}
                        <button onClick={() => handleExportPDF(doc)} className="p-2 text-indigo-600 dark:text-indigo-400">📥</button>
                      </div>
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

const StatCard: React.FC<{ title: string; value: string; icon: string; color: string }> = ({ title, value, icon, color }) => (
  <div className="bg-white dark:bg-slate-900 p-8 rounded-[40px] shadow-sm border border-gray-100 dark:border-slate-800">
    <div className={`w-12 h-12 rounded-2xl ${color} text-white flex items-center justify-center mb-6 shadow-lg`}>{icon}</div>
    <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mb-1">{title}</p>
    <p className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">{value}</p>
  </div>
);

export default Dashboard;
