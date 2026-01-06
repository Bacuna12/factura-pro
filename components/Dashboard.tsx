
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Document, DocumentType, DocumentStatus, AppSettings, Expense, Client, Payment } from '../types';
import { exportToPDF } from '../services/pdfService';
import ConfirmModal from './ConfirmModal';

interface DashboardProps {
  documents: Document[];
  expenses: Expense[];
  clientsCount: number;
  settings: AppSettings;
  onDeleteDoc: (id: string) => void;
  onUpdateDoc: (doc: Document) => void;
  clients: Client[];
}

const Dashboard: React.FC<DashboardProps> = ({ documents, expenses, clientsCount, settings, onDeleteDoc, onUpdateDoc, clients }) => {
  const navigate = useNavigate();
  const [docToDelete, setDocToDelete] = useState<string | null>(null);
  
  // Estados para Registro de Pago
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [activeDocForPayment, setActiveDocForPayment] = useState<Document | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<string>('0');
  const [paymentMethod, setPaymentMethod] = useState('Efectivo');

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

  const handleOpenPayment = (e: React.MouseEvent | React.TouchEvent, doc: Document) => {
    if (e.stopPropagation) e.stopPropagation();
    const total = calculateTotal(doc);
    const paid = calculatePaidAmount(doc);
    const remaining = Math.max(0, total - paid);
    
    setActiveDocForPayment(doc);
    setPaymentAmount(remaining.toFixed(0));
    setPaymentMethod(doc.paymentMethod || 'Efectivo');
    setIsPaymentModalOpen(true);
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
    setTimeout(() => alert("¡Pago registrado correctamente!"), 100);
  };

  const getRouteBase = (docType: DocumentType) => {
    if (docType === DocumentType.INVOICE) return '/invoices';
    if (docType === DocumentType.ACCOUNT_COLLECTION) return '/collections';
    return '/quotes';
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      <ConfirmModal 
        isOpen={!!docToDelete}
        title="Eliminar Documento"
        message="¿Estás seguro de que deseas eliminar este registro?"
        onConfirm={() => {
          if (docToDelete) onDeleteDoc(docToDelete);
          setDocToDelete(null);
        }}
        onCancel={() => setDocToDelete(null)}
      />

      {isPaymentModalOpen && activeDocForPayment && (
        <div 
          className="fixed inset-0 bg-black/90 backdrop-blur-xl z-[99999] flex items-center justify-center p-4"
          style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}
          onClick={() => setIsPaymentModalOpen(false)}
        >
          <div 
            className="bg-white rounded-[40px] w-full max-w-sm overflow-hidden animate-slideUp shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="bg-emerald-600 p-8 text-white">
              <h3 className="text-2xl font-black">Cobrar Documento</h3>
              <p className="text-emerald-100 text-xs">#{activeDocForPayment.number}</p>
            </div>
            <form onSubmit={handleRegisterPayment} className="p-8 space-y-6">
              <div className="bg-emerald-50 p-4 rounded-2xl">
                 <p className="text-[10px] font-black text-emerald-600 uppercase mb-1">Saldo</p>
                 <p className="text-2xl font-black text-emerald-900">{formatCurrency(calculateTotal(activeDocForPayment) - calculatePaidAmount(activeDocForPayment))}</p>
              </div>
              <input 
                type="number" 
                autoFocus
                required
                step="any"
                value={paymentAmount} 
                onChange={e => setPaymentAmount(e.target.value)}
                className="w-full p-4 bg-gray-50 rounded-2xl border-2 border-transparent focus:border-emerald-500 font-black text-2xl text-emerald-600 outline-none"
              />
              <select 
                value={paymentMethod} 
                onChange={e => setPaymentMethod(e.target.value)}
                className="w-full p-4 bg-gray-50 rounded-2xl font-bold outline-none"
              >
                <option value="Efectivo">Efectivo</option>
                <option value="Transferencia">Transferencia</option>
                <option value="Nequi">Nequi</option>
                <option value="Daviplata">Daviplata</option>
              </select>
              <button type="submit" className="w-full py-5 bg-emerald-600 text-white rounded-2xl font-black shadow-lg active:bg-emerald-700">Confirmar Pago</button>
              <button type="button" onClick={() => setIsPaymentModalOpen(false)} className="w-full py-2 text-gray-400 font-bold">Cancelar</button>
            </form>
          </div>
        </div>
      )}

      <header className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-black text-gray-900 tracking-tight">Panel de Control</h2>
          <p className="text-gray-500 font-medium">Balance general de tu negocio</p>
        </div>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Ingresos Reales" value={formatCurrency(totalInvoiced)} icon="💰" color="bg-emerald-500" trend="Pagos recibidos" />
        <StatCard title="Gastos Totales" value={formatCurrency(totalExpenses)} icon="💸" color="bg-rose-500" trend="Egresos registrados" />
        <StatCard title="Utilidad Neta" value={formatCurrency(netProfit)} icon="📈" color={netProfit >= 0 ? "bg-blue-500" : "bg-orange-500"} trend="Beneficio real" />
        <StatCard title="Por Cobrar" value={formatCurrency(pendingAmount)} icon="⏳" color="bg-amber-500" trend="Cartera pendiente" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-6 border-b border-gray-50 flex justify-between items-center">
            <h3 className="text-lg font-bold text-gray-800">Actividad Reciente</h3>
            <button onClick={() => navigate('/invoices')} className="text-blue-600 text-sm font-bold hover:underline">Ver todo</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="text-[10px] uppercase text-gray-400 bg-gray-50 font-black tracking-widest">
                <tr>
                  <th className="px-6 py-4">Documento</th>
                  <th className="px-6 py-4">Estado</th>
                  <th className="px-6 py-4">Total</th>
                  <th className="px-6 py-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {documents.slice(0, 8).map(doc => {
                  const total = calculateTotal(doc);
                  const paid = calculatePaidAmount(doc);
                  const isPaid = (total - paid) < 1;
                  
                  return (
                  <tr key={doc.id} className="hover:bg-gray-50/50 transition-colors group">
                    <td className="px-6 py-4 cursor-pointer" onClick={() => navigate(`${getRouteBase(doc.type)}/edit/${doc.id}`)}>
                      <p className="font-bold text-gray-800 group-hover:text-blue-600 transition-colors">#{doc.number}</p>
                      <p className="text-[9px] text-gray-400 font-black uppercase tracking-widest">{doc.type}</p>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase ${
                        doc.status === DocumentStatus.PAID || doc.status === DocumentStatus.ACCEPTED 
                          ? 'bg-emerald-100 text-emerald-700' : doc.status === DocumentStatus.REJECTED 
                          ? 'bg-rose-100 text-rose-700' : doc.status === DocumentStatus.PARTIAL
                          ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'
                      }`}>
                        {doc.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-black text-gray-900">{formatCurrency(total)}</td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end space-x-1">
                         {!isPaid && (doc.type === DocumentType.INVOICE || doc.type === DocumentType.ACCOUNT_COLLECTION) && (
                            <button onClick={(e) => handleOpenPayment(e, doc)} className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg active:scale-90 transition-all">💸</button>
                         )}
                         <button onClick={() => handleExportPDF(doc)} className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg">📥</button>
                         <button onClick={() => navigate(`${getRouteBase(doc.type)}/edit/${doc.id}`)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg">✏️</button>
                         <button onClick={() => setDocToDelete(doc.id)} className="p-2 text-rose-600 hover:bg-rose-50 rounded-lg">🗑️</button>
                      </div>
                    </td>
                  </tr>
                )})}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

const StatCard: React.FC<{ title: string; value: string; icon: string; color: string; trend: string }> = ({ title, value, icon, color, trend }) => (
  <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 hover:shadow-md transition-all group">
    <div className="flex justify-between items-start mb-4">
      <div className={`w-12 h-12 rounded-2xl ${color} text-white flex items-center justify-center text-xl shadow-lg shadow-gray-200 group-hover:scale-110 transition-transform`}>{icon}</div>
    </div>
    <p className="text-xs text-gray-400 font-black uppercase tracking-widest mb-1">{title}</p>
    <p className="text-2xl font-black text-gray-900 mb-2 truncate">{value}</p>
    <p className="text-[10px] text-gray-400 font-bold">{trend}</p>
  </div>
);

export default Dashboard;
