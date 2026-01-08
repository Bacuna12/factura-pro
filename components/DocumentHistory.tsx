
import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Document, DocumentType, DocumentStatus, Client, AppSettings, Payment, UserRole } from '../types';
import { exportToPDF, shareViaWhatsApp } from '../services/pdfService';
import ConfirmModal from './ConfirmModal';

interface DocumentHistoryProps {
  user: any;
  documents: Document[];
  clients: Client[];
  settings: AppSettings;
  onDelete: (id: string) => void;
  onUpdateDocument: (doc: Document) => void;
}

const DocumentHistory: React.FC<DocumentHistoryProps> = ({ 
  user, documents, clients, settings, onDelete, onUpdateDocument 
}) => {
  const navigate = useNavigate();
  const [filterType, setFilterType] = useState<'ALL' | DocumentType | 'POS_ONLY' | 'STANDARD_ONLY'>('ALL');
  const [filterStatus, setFilterStatus] = useState<'ALL' | DocumentStatus>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [docToDelete, setDocToDelete] = useState<string | null>(null);

  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [activeDocForPayment, setActiveDocForPayment] = useState<Document | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<string>('0');
  const [paymentMethod, setPaymentMethod] = useState('Efectivo');

  const isAdmin = user.role === UserRole.ADMIN;

  const getClient = (id: string) => clients.find(c => c.id === id);
  
  const calculateTotal = (doc: Document) => {
    const subtotal = doc.items.reduce((acc, item) => acc + (item.quantity * item.unitPrice), 0);
    const tax = subtotal * (doc.taxRate / 100);
    const gross = subtotal + tax;
    const withholding = gross * ((doc.withholdingRate || 0) / 100);
    return gross - withholding;
  };

  const calculatePaid = (doc: Document) => {
    return (doc.payments || []).reduce((acc, p) => acc + p.amount, 0);
  };

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

  const filteredDocs = useMemo(() => {
    return [...documents]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime() || b.number.localeCompare(a.number))
      .filter(doc => {
        let matchesType = true;
        if (filterType === 'POS_ONLY') {
          matchesType = !!doc.isPOS && doc.type === DocumentType.INVOICE;
        } else if (filterType === 'STANDARD_ONLY') {
          matchesType = !doc.isPOS && doc.type === DocumentType.INVOICE;
        } else if (filterType !== 'ALL') {
          matchesType = doc.type === filterType;
        }

        const matchesStatus = filterStatus === 'ALL' || doc.status === filterStatus;
        
        const clientName = getClient(doc.clientId)?.name.toLowerCase() || '';
        const sellerName = (doc.createdByName || '').toLowerCase();
        const searchLower = searchTerm.toLowerCase();

        const matchesSearch = 
          doc.number.toLowerCase().includes(searchLower) || 
          clientName.includes(searchLower) ||
          sellerName.includes(searchLower);

        return matchesType && matchesStatus && matchesSearch;
      });
  }, [documents, filterType, filterStatus, searchTerm, clients]);

  const handleExportPDF = (doc: Document) => {
    const client = getClient(doc.clientId);
    exportToPDF(doc, client, settings);
  };

  const handleOpenPayment = (doc: Document) => {
    const total = calculateTotal(doc);
    const paid = calculatePaid(doc);
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
    if (totalPaid >= docTotal - 1 || paymentMethod === 'Crédito') newStatus = DocumentStatus.PAID;
    else if (totalPaid > 0) newStatus = DocumentStatus.PARTIAL;

    onUpdateDocument({ ...activeDocForPayment, payments: updatedPayments, status: newStatus, paymentMethod });
    setIsPaymentModalOpen(false);
    setActiveDocForPayment(null);
  };

  const getRouteBase = (docType: DocumentType) => {
    if (docType === DocumentType.INVOICE) return '/invoices';
    if (docType === DocumentType.ACCOUNT_COLLECTION) return '/collections';
    return '/quotes';
  };

  return (
    <div className="space-y-8 animate-fadeIn pb-10">
      <ConfirmModal 
        isOpen={!!docToDelete}
        title="Eliminar Documento"
        message="¿Estás seguro de que deseas eliminar este registro permanentemente?"
        onConfirm={() => {
          if (docToDelete) onDelete(docToDelete);
          setDocToDelete(null);
        }}
        onCancel={() => setDocToDelete(null)}
      />

      {isPaymentModalOpen && activeDocForPayment && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-xl flex items-center justify-center p-4 z-[99999]" onClick={() => setIsPaymentModalOpen(false)}>
          <div className="bg-white dark:bg-slate-900 rounded-[40px] w-full max-sm:max-w-sm overflow-hidden shadow-2xl animate-slideUp" onClick={e => e.stopPropagation()}>
            <div className="bg-blue-600 p-8 text-white">
              <h3 className="text-2xl font-black uppercase tracking-tighter">Registrar Cobro</h3>
              <p className="text-blue-100 text-xs font-bold uppercase tracking-widest">Doc. No. {activeDocForPayment.number}</p>
            </div>
            <form onSubmit={handleRegisterPayment} className="p-8 space-y-6">
              <div className="bg-blue-50 dark:bg-blue-900/20 p-5 rounded-3xl text-center border border-blue-100 dark:border-blue-800">
                 <p className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase mb-1 tracking-widest">Saldo Pendiente</p>
                 <p className="text-2xl font-black text-blue-900 dark:text-blue-100">{formatCurrency(calculateTotal(activeDocForPayment) - calculatePaid(activeDocForPayment))}</p>
              </div>
              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Monto a Abonar</label>
                <input type="number" required step="any" value={paymentAmount} onChange={e => setPaymentAmount(e.target.value)} className="w-full p-4 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white rounded-2xl border-2 border-slate-200 dark:border-slate-700 focus:border-blue-500 font-black text-2xl outline-none transition-all shadow-sm" />
              </div>
              <button type="submit" className="w-full py-5 bg-blue-600 text-white rounded-3xl font-black shadow-xl uppercase tracking-widest text-xs">Confirmar Pago</button>
            </form>
          </div>
        </div>
      )}

      <header>
        <h2 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight uppercase">Buscador Central</h2>
        <p className="text-gray-500 dark:text-slate-400 font-medium">Historial completo de ventas y propuestas.</p>
      </header>

      <div className="bg-white dark:bg-slate-900 p-6 rounded-[32px] shadow-sm border border-gray-100 dark:border-slate-800 flex flex-col gap-6">
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xl opacity-30">🔍</span>
          <input 
            type="text"
            placeholder="No. Documento, Cliente o Vendedor..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-14 pr-4 py-4 bg-white dark:bg-slate-950 text-slate-900 dark:text-white rounded-[24px] border-2 border-slate-100 dark:border-slate-800 outline-none focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/5 font-bold text-lg transition-all shadow-sm"
          />
        </div>

        <div className="flex flex-wrap gap-3">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 ml-2">Tipo de Operación</label>
            <select 
              value={filterType} 
              onChange={e => setFilterType(e.target.value as any)}
              className="w-full px-4 py-3 bg-white dark:bg-slate-950 text-slate-900 dark:text-white rounded-2xl font-black text-[11px] uppercase outline-none focus:ring-2 focus:ring-blue-500 border-2 border-slate-100 dark:border-slate-800 transition-all cursor-pointer shadow-sm"
            >
              <option value="ALL">Todos los documentos</option>
              <option value="POS_ONLY">🛒 Solo Facturas POS</option>
              <option value="STANDARD_ONLY">🧾 Solo Facturas Estándar</option>
              <option value={DocumentType.ACCOUNT_COLLECTION}>📝 Cuentas de Cobro</option>
              <option value={DocumentType.QUOTE}>📄 Presupuestos</option>
            </select>
          </div>
          
          <div className="flex-1 min-w-[150px]">
            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 ml-2">Estado</label>
            <select 
              value={filterStatus} 
              onChange={e => setFilterStatus(e.target.value as any)}
              className="w-full px-4 py-3 bg-white dark:bg-slate-950 text-slate-900 dark:text-white rounded-2xl font-black text-[11px] uppercase outline-none focus:ring-2 focus:ring-blue-500 border-2 border-slate-100 dark:border-slate-800 transition-all cursor-pointer shadow-sm"
            >
              <option value="ALL">Cualquier Estado</option>
              {Object.values(DocumentStatus).map(s => (
                <option key={s} value={s}>{s.toUpperCase()}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-[40px] shadow-sm border border-gray-100 dark:border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50 dark:bg-slate-800/50 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b dark:border-slate-800">
              <tr>
                <th className="px-8 py-5">Referencia / Hora</th>
                <th className="px-8 py-5">Cliente / Vendedor</th>
                <th className="px-8 py-5">Identificador Tipo</th>
                <th className="px-8 py-5">Total</th>
                <th className="px-8 py-5 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-slate-800">
              {filteredDocs.map(doc => {
                const total = calculateTotal(doc);
                const paid = calculatePaid(doc);
                const isPaid = (total - paid) < 1;
                const isPOS = !!doc.isPOS && doc.type === DocumentType.INVOICE;
                const isStandardInvoice = !doc.isPOS && doc.type === DocumentType.INVOICE;
                
                return (
                  <tr key={doc.id} className="hover:bg-gray-50/50 dark:hover:bg-slate-800/30 transition-colors group">
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl ${isPOS ? 'bg-emerald-100 text-emerald-600' : 'bg-blue-100 text-blue-600'}`}>
                          {isPOS ? '🛒' : isStandardInvoice ? '🧾' : doc.type === DocumentType.QUOTE ? '📄' : '📝'}
                        </div>
                        <div>
                          <p className="font-black text-gray-900 dark:text-white">#{doc.number}</p>
                          <p className="text-[10px] text-gray-400 font-bold">{doc.date}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      <p className="text-sm font-bold text-gray-700 dark:text-slate-200">{getClient(doc.clientId)?.name || 'Consumidor Final'}</p>
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">Vendedor: {doc.createdByName || 'FacturaPro'}</p>
                    </td>
                    <td className="px-8 py-5">
                      <span className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase ${
                        isPOS ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 
                        isStandardInvoice ? 'bg-blue-50 text-blue-600 border border-blue-100' : 
                        doc.type === DocumentType.ACCOUNT_COLLECTION ? 'bg-violet-50 text-violet-600 border border-violet-100' : 
                        'bg-slate-100 text-slate-600 border border-slate-200'
                      }`}>
                        {isPOS ? 'FACTURA POS' : isStandardInvoice ? 'FACTURA' : doc.type}
                      </span>
                    </td>
                    <td className="px-8 py-5 font-black text-gray-900 dark:text-white">
                      <p>{formatCurrency(total)}</p>
                      <span className={`text-[8px] font-black uppercase ${
                        doc.status === DocumentStatus.PAID ? 'text-emerald-500' : 'text-amber-500'
                      }`}>
                        {doc.status}
                      </span>
                    </td>
                    <td className="px-8 py-5 text-right">
                      <div className="flex justify-end space-x-1">
                        {!isPaid && (doc.type !== DocumentType.QUOTE) && (
                          <button onClick={() => handleOpenPayment(doc)} className="p-2.5 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-xl" title="Registrar Cobro">💸</button>
                        )}
                        <button onClick={() => handleExportPDF(doc)} className="p-2.5 text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-xl" title="Exportar PDF">📥</button>
                        <button onClick={() => navigate(`${getRouteBase(doc.type)}/edit/${doc.id}`)} className="p-2.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-xl" title="Editar">✏️</button>
                        {isAdmin && <button onClick={() => setDocToDelete(doc.id)} className="p-2.5 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-xl" title="Borrar">🗑️</button>}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredDocs.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-20 text-center">
                    <p className="text-gray-400 font-bold uppercase tracking-widest text-xs">No se encontraron documentos con estos filtros</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default DocumentHistory;
