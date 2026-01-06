
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

  const handleOpenPayment = (doc: Document) => {
    const total = calculateTotal(doc);
    const paid = calculatePaidAmount(doc);
    const remaining = Math.max(0, total - paid);
    
    setActiveDocForPayment(doc);
    setPaymentAmount(remaining.toFixed(0));
    setPaymentMethod(doc.paymentMethod || 'Efectivo');
    
    setTimeout(() => {
        setIsPaymentModalOpen(true);
    }, 50);
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
    <div className="space-y-8">
      <ConfirmModal 
        isOpen={!!docToDelete}
        title="Eliminar Documento"
        message="¿Estás seguro?"
        onConfirm={() => {
          if (docToDelete) onDeleteDoc(docToDelete);
          setDocToDelete(null);
        }}
        onCancel={() => setDocToDelete(null)}
      />

      {isPaymentModalOpen && activeDocForPayment && (
        <div 
          className="fixed inset-0 bg-black/90 backdrop-blur-xl flex items-center justify-center p-4"
          style={{ zIndex: 2147483647, position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}
          onClick={() => setIsPaymentModalOpen(false)}
        >
          <div 
            className="bg-white rounded-[40px] w-full max-w-sm overflow-hidden shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="bg-emerald-600 p-8 text-white">
              <h3 className="text-2xl font-black">Cobrar Documento</h3>
              <p className="text-emerald-100 text-xs">#{activeDocForPayment.number}</p>
            </div>
            <form onSubmit={handleRegisterPayment} className="p-8 space-y-6">
              <div className="bg-emerald-50 p-4 rounded-2xl text-center">
                 <p className="text-[10px] font-black text-emerald-600 uppercase mb-1">Saldo</p>
                 <p className="text-2xl font-black text-emerald-900">{formatCurrency(calculateTotal(activeDocForPayment) - calculatePaidAmount(activeDocForPayment))}</p>
              </div>
              <input 
                type="number" 
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
              <button type="submit" className="w-full py-5 bg-emerald-600 text-white rounded-3xl font-black shadow-lg active:scale-95 transition-all">Confirmar Pago</button>
            </form>
          </div>
        </div>
      )}

      <header>
        <h2 className="text-3xl font-black text-gray-900 tracking-tight">Panel de Control</h2>
        <p className="text-gray-500 font-medium">Resumen financiero actual</p>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Ingresos" value={formatCurrency(totalInvoiced)} icon="💰" color="bg-emerald-500" />
        <StatCard title="Gastos" value={formatCurrency(totalExpenses)} icon="💸" color="bg-rose-500" />
        <StatCard title="Utilidad" value={formatCurrency(netProfit)} icon="📈" color="bg-blue-500" />
        <StatCard title="Pendiente" value={formatCurrency(pendingAmount)} icon="⏳" color="bg-amber-500" />
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-50 flex justify-between items-center">
          <h3 className="font-bold text-gray-800">Facturación Reciente</h3>
          <button onClick={() => navigate('/invoices')} className="text-blue-600 text-xs font-black uppercase">Ver Todas</button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b">
              <tr>
                <th className="px-6 py-4">Ref</th>
                <th className="px-6 py-4">Total</th>
                <th className="px-6 py-4 text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {documents.slice(0, 5).map(doc => {
                const total = calculateTotal(doc);
                const paid = calculatePaidAmount(doc);
                const isPaid = (total - paid) < 1;
                
                return (
                <tr key={doc.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-6 py-4 font-bold text-gray-900">#{doc.number}</td>
                  <td className="px-6 py-4 font-black text-gray-900">{formatCurrency(total)}</td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end space-x-1">
                       {!isPaid && (doc.type === DocumentType.INVOICE || doc.type === DocumentType.ACCOUNT_COLLECTION) && (
                          <button onClick={() => handleOpenPayment(doc)} className="p-2 text-emerald-600 active:scale-90">💸</button>
                       )}
                       <button onClick={() => handleExportPDF(doc)} className="p-2 text-indigo-600">📥</button>
                    </div>
                  </td>
                </tr>
              )})}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const StatCard: React.FC<{ title: string; value: string; icon: string; color: string }> = ({ title, value, icon, color }) => (
  <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
    <div className={`w-10 h-10 rounded-xl ${color} text-white flex items-center justify-center mb-4 shadow-lg`}>{icon}</div>
    <p className="text-[10px] text-gray-400 font-black uppercase mb-1">{title}</p>
    <p className="text-xl font-black text-gray-900">{value}</p>
  </div>
);

export default Dashboard;
