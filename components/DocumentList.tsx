
import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Document, DocumentType, DocumentStatus, Client, AppSettings, Product, Payment, User, UserRole } from '../types';
import { exportToPDF, shareViaWhatsApp } from '../services/pdfService';
import ConfirmModal from './ConfirmModal';

interface DocumentListProps {
  user: User;
  type: DocumentType;
  documents: Document[];
  clients: Client[];
  products: Product[];
  settings: AppSettings;
  onDelete: (id: string) => void;
  onUpdateDocument: (doc: Document) => void;
  onUpdateProducts: (products: Product[]) => void;
}

const DocumentList: React.FC<DocumentListProps> = ({ 
  user,
  type, 
  documents, 
  clients, 
  settings, 
  onDelete,
  onUpdateDocument
}) => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | DocumentStatus>('ALL');
  const [docToDelete, setDocToDelete] = useState<string | null>(null);
  
  const isAdmin = user.role === UserRole.ADMIN;

  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [activeDocForPayment, setActiveDocForPayment] = useState<Document | null>(null);
  const [paymentAmountStr, setPaymentAmountStr] = useState<string>('0');
  const [paymentMethod, setPaymentMethod] = useState('Efectivo');

  const [isWhatsAppModalOpen, setIsWhatsAppModalOpen] = useState(false);
  const [activeDocForWhatsApp, setActiveDocForWhatsApp] = useState<Document | null>(null);
  const [whatsappPhone, setWhatsappPhone] = useState('');

  const isCollection = type === DocumentType.ACCOUNT_COLLECTION;

  const getClient = (id: string) => clients.find(c => c.id === id);
  const getClientName = (id: string) => getClient(id)?.name || 'Cliente desconocido';

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

  const formatTime = (isoString?: string) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    return date.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
  };

  const filteredDocs = useMemo(() => {
    const searchLower = searchTerm.toLowerCase();
    return documents
      .filter(d => d.type === type)
      .sort((a, b) => new Date(b.createdAt || b.date).getTime() - new Date(a.createdAt || a.date).getTime())
      .filter(doc => {
        const clientName = getClientName(doc.clientId).toLowerCase();
        const docNumber = doc.number.toLowerCase();
        const docStatus = doc.status.toLowerCase();
        const sellerName = (doc.createdByName || '').toLowerCase();
        
        const matchesSearch = 
          clientName.includes(searchLower) || 
          docNumber.includes(searchLower) || 
          docStatus.includes(searchLower) ||
          sellerName.includes(searchLower);
          
        const matchesStatusDropdown = statusFilter === 'ALL' || doc.status === statusFilter;
        
        return matchesSearch && matchesStatusDropdown;
      });
  }, [documents, type, searchTerm, statusFilter, clients]);

  const handleExportPDF = (doc: Document) => {
    const client = getClient(doc.clientId);
    exportToPDF(doc, client, settings);
  };

  const handleOpenWhatsAppModal = (doc: Document) => {
    const client = getClient(doc.clientId);
    setActiveDocForWhatsApp(doc);
    setWhatsappPhone(client?.phone || '');
    setIsWhatsAppModalOpen(true);
  };

  const handleConfirmWhatsApp = (e: React.FormEvent) => {
    e.preventDefault();
    if (activeDocForWhatsApp) {
      const client = getClient(activeDocForWhatsApp.clientId);
      shareViaWhatsApp(activeDocForWhatsApp, client, settings, whatsappPhone);
      setIsWhatsAppModalOpen(false);
      setActiveDocForWhatsApp(null);
    }
  };

  const handleOpenPayment = (doc: Document) => {
    const total = calculateTotal(doc);
    const paid = calculatePaid(doc);
    const remaining = Math.max(0, total - paid);
    setActiveDocForPayment(doc);
    setPaymentAmountStr(remaining.toFixed(0));
    setPaymentMethod(doc.paymentMethod || 'Efectivo');
    setTimeout(() => setIsPaymentModalOpen(true), 50);
  };

  const handleRegisterPayment = (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = parseFloat(paymentAmountStr);
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

  const StatusBadge = ({ status }: { status: DocumentStatus }) => (
    <span className={`px-2 py-1 rounded-lg text-[10px] font-black uppercase ${
      status === DocumentStatus.PAID || status === DocumentStatus.ACCEPTED 
        ? 'bg-emerald-100 text-emerald-700' 
        : status === DocumentStatus.REJECTED 
        ? 'bg-rose-100 text-rose-700'
        : status === DocumentStatus.PARTIAL
        ? 'bg-blue-100 text-blue-700'
        : 'bg-amber-100 text-amber-700'
    }`}>
      {status}
    </span>
  );

  return (
    <div className="relative space-y-6 pb-24 md:pb-10">
      <ConfirmModal 
        isOpen={!!docToDelete}
        title={`Eliminar ${type}`}
        message="¿Estás seguro de que deseas eliminar este registro?"
        onConfirm={() => {
          if (docToDelete) onDelete(docToDelete);
          setDocToDelete(null);
        }}
        onCancel={() => setDocToDelete(null)}
      />

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight uppercase">{type}S</h2>
          <p className="text-gray-500 dark:text-slate-400 font-medium">Gestión de operaciones históricas</p>
        </div>
        <button onClick={() => navigate(`${getRouteBase(type)}/new`)} className={`w-full sm:w-auto px-6 py-4 text-white rounded-2xl font-bold shadow-lg transition-all flex items-center justify-center space-x-2 active:scale-95 ${isCollection ? 'bg-violet-600 shadow-violet-100' : 'bg-blue-600 shadow-blue-100'}`}>
          <span className="text-xl font-black">+</span>
          <span className="uppercase tracking-widest text-xs">Crear {type}</span>
        </button>
      </div>

      <div className="bg-white dark:bg-slate-900 p-5 rounded-[32px] shadow-sm border border-gray-100 dark:border-slate-800 flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <input 
            type="text" 
            placeholder="Buscar por número, cliente o vendedor..." 
            value={searchTerm} 
            onChange={e => setSearchTerm(e.target.value)} 
            className="w-full pl-6 pr-4 py-3 bg-white dark:bg-slate-950 text-slate-900 dark:text-white rounded-2xl border-2 border-slate-100 dark:border-slate-800 outline-none focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/5 font-bold text-sm transition-all" 
          />
        </div>
        <div className="flex gap-2">
          <select 
            value={statusFilter} 
            onChange={e => setStatusFilter(e.target.value as any)}
            className="px-4 py-3 bg-white dark:bg-slate-950 text-slate-900 dark:text-white rounded-2xl font-black text-[10px] uppercase outline-none focus:ring-2 focus:ring-blue-500 border-2 border-slate-100 dark:border-slate-800 transition-all cursor-pointer shadow-sm"
          >
            <option value="ALL">Todos los Estados</option>
            {Object.values(DocumentStatus).map(status => (
              <option key={status} value={status}>{status}</option>
            ))}
          </select>
        </div>
      </div>

      {/* VISTA MOBILE */}
      <div className="grid grid-cols-1 gap-4 md:hidden">
        {filteredDocs.map(doc => {
          const total = calculateTotal(doc);
          const paid = calculatePaid(doc);
          const balance = total - paid;
          const isPaid = balance < 1;
          const isPOSBadge = !!doc.isPOS && doc.type === DocumentType.INVOICE;
          
          return (
            <div key={doc.id} className="bg-white dark:bg-slate-900 p-8 rounded-[40px] border border-gray-100 dark:border-slate-800 shadow-sm space-y-4">
              <div className="flex justify-between items-start">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-black text-lg text-gray-900 dark:text-white">#{doc.number}</p>
                    <span className={`px-2 py-0.5 rounded-lg text-[8px] font-black uppercase ${isPOSBadge ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'}`}>
                      {isPOSBadge ? 'POS' : 'ESTÁNDAR'}
                    </span>
                  </div>
                  <p className="text-[10px] text-gray-400 font-bold uppercase">{doc.date} • {formatTime(doc.createdAt)}</p>
                </div>
                <StatusBadge status={doc.status} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Cliente</p>
                  <p className="font-bold text-gray-800 dark:text-slate-200 truncate">{getClientName(doc.clientId)}</p>
                </div>
                <div>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Vendedor</p>
                  <p className="font-bold text-gray-800 dark:text-slate-200 truncate">{doc.createdByName || 'N/A'}</p>
                </div>
              </div>
              <div className="flex justify-between items-end pt-4 border-t border-gray-50 dark:border-slate-800">
                <div className="flex-1">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Total</p>
                  <p className="text-xl font-black text-gray-900 dark:text-white">{formatCurrency(total)}</p>
                  {!isPaid && (doc.type !== DocumentType.QUOTE) && <p className="text-[10px] font-black text-emerald-600">Saldo: {formatCurrency(balance)}</p>}
                </div>
                <div className="flex gap-2">
                  {!isPaid && (doc.type === DocumentType.INVOICE || doc.type === DocumentType.ACCOUNT_COLLECTION) && (
                    <button onClick={() => handleOpenPayment(doc)} className="w-14 h-14 bg-emerald-600 text-white rounded-2xl shadow-lg">💸</button>
                  )}
                  <button onClick={() => handleExportPDF(doc)} className="w-14 h-14 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-2xl">📥</button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 pt-2">
                <button onClick={() => navigate(`${getRouteBase(doc.type)}/edit/${doc.id}`)} className="py-4 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-2xl font-black text-[10px] uppercase">Editar</button>
                {isAdmin && (
                  <button onClick={() => setDocToDelete(doc.id)} className="py-4 bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 rounded-2xl font-black text-[10px] uppercase">Borrar</button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* VISTA DESKTOP */}
      <div className="hidden md:block bg-white dark:bg-slate-900 rounded-[40px] shadow-sm border border-gray-100 dark:border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50 dark:bg-slate-800 text-[10px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-widest border-b dark:border-slate-700">
              <tr>
                <th className="px-8 py-5">Ref / Hora</th>
                <th className="px-8 py-5">Cliente</th>
                <th className="px-8 py-5">Identificador Tipo</th>
                <th className="px-8 py-5">Total / Estado</th>
                <th className="px-8 py-5 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-slate-800">
              {filteredDocs.map(doc => {
                 const total = calculateTotal(doc);
                 const paid = calculatePaid(doc);
                 const balance = total - paid;
                 const isPaid = balance < 1;
                 const isPOSRow = !!doc.isPOS && doc.type === DocumentType.INVOICE;
                 
                 return (
                  <tr key={doc.id} className="hover:bg-gray-50/50 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="px-8 py-5">
                       <p className="font-bold text-gray-900 dark:text-white">#{doc.number}</p>
                       <p className="text-[10px] text-gray-400">{doc.date} • {formatTime(doc.createdAt)}</p>
                    </td>
                    <td className="px-8 py-5">
                       <p className="text-gray-900 dark:text-slate-200 font-bold">{getClientName(doc.clientId)}</p>
                    </td>
                    <td className="px-8 py-5">
                       <div className="space-y-1">
                          <span className={`px-2 py-0.5 rounded-lg text-[8px] font-black uppercase ${isPOSRow ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'}`}>
                            {isPOSRow ? 'FACTURA POS' : doc.type}
                          </span>
                          <div className="flex items-center gap-2">
                             <div className="w-4 h-4 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-[7px] font-black uppercase text-slate-500">{doc.createdByName?.charAt(0)}</div>
                             <p className="text-[9px] font-bold text-slate-500 dark:text-slate-500">{doc.createdByName || 'N/A'}</p>
                          </div>
                       </div>
                    </td>
                    <td className="px-8 py-5">
                       <p className="font-black text-gray-900 dark:text-white">{formatCurrency(total)}</p>
                       <StatusBadge status={doc.status} />
                    </td>
                    <td className="px-8 py-5 text-right">
                      <div className="flex justify-end space-x-2">
                        {!isPaid && (doc.type === DocumentType.INVOICE || doc.type === DocumentType.ACCOUNT_COLLECTION) && (
                          <button onClick={() => handleOpenPayment(doc)} className="p-2.5 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-xl">💸</button>
                        )}
                        <button onClick={() => handleOpenWhatsAppModal(doc)} className="p-2.5 text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-xl">💬</button>
                        <button onClick={() => handleExportPDF(doc)} className="p-2.5 text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-xl">📥</button>
                        <button onClick={() => navigate(`${getRouteBase(doc.type)}/edit/${doc.id}`)} className="p-2.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-xl">✏️</button>
                        {isAdmin && <button onClick={() => setDocToDelete(doc.id)} className="p-2.5 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-xl">🗑️</button>}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {isWhatsAppModalOpen && activeDocForWhatsApp && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xl flex items-center justify-center p-4 z-[99999]" onClick={() => setIsWhatsAppModalOpen(false)}>
          <div className="bg-white dark:bg-slate-900 rounded-[40px] w-full max-sm:max-w-sm overflow-hidden shadow-2xl animate-slideUp" onClick={e => e.stopPropagation()}>
            <div className="bg-emerald-600 p-8 text-white text-center">
              <h3 className="text-xl font-black">Enviar por WhatsApp</h3>
            </div>
            <form onSubmit={handleConfirmWhatsApp} className="p-8 space-y-6">
              <input type="tel" required value={whatsappPhone} onChange={e => setWhatsappPhone(e.target.value)} className="w-full p-4 bg-gray-50 dark:bg-slate-800 border border-gray-100 dark:border-slate-800 rounded-2xl font-black text-slate-900 dark:text-white" placeholder="Ej: 573001234567" />
              <button type="submit" className="w-full py-5 bg-emerald-600 text-white rounded-3xl font-black uppercase tracking-widest text-xs">Enviar Documento</button>
            </form>
          </div>
        </div>
      )}

      {isPaymentModalOpen && activeDocForPayment && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 z-[99999]" onClick={() => setIsPaymentModalOpen(false)}>
          <div className="bg-white dark:bg-slate-900 rounded-[40px] w-full max-sm:max-w-sm overflow-hidden shadow-2xl animate-slideUp flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
            <div className="bg-blue-600 p-8 text-white shrink-0">
              <h3 className="text-2xl font-black uppercase tracking-tighter">Registrar Pago</h3>
              <p className="text-blue-100 text-xs font-bold tracking-widest uppercase">#{activeDocForPayment.number}</p>
            </div>
            
            <form onSubmit={handleRegisterPayment} className="flex flex-col flex-1 overflow-hidden">
              <div className="p-8 space-y-6 overflow-y-auto flex-1">
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Seleccionar Método</label>
                  <div className="grid grid-cols-2 gap-2">
                    {['Efectivo', 'Nequi', 'Tarjeta', 'Crédito', 'Transferencia'].map(m => (
                      <button 
                        key={m} 
                        type="button" 
                        onClick={() => setPaymentMethod(m)} 
                        className={`py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all border-2 ${paymentMethod === m ? 'bg-blue-600 text-white border-blue-600 shadow-lg' : 'bg-slate-50 dark:bg-slate-800 text-slate-500 border-transparent hover:border-blue-200'}`}
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Monto</label>
                  <input type="number" required step="any" value={paymentAmountStr} onChange={e => setPaymentAmountStr(e.target.value)} className="w-full p-5 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white rounded-2xl border-2 border-slate-200 dark:border-slate-700 font-black text-3xl text-blue-600 outline-none" />
                </div>
              </div>
              
              <div className="p-8 pt-0 shrink-0">
                <button type="submit" className="w-full py-5 bg-blue-600 text-white rounded-3xl font-black uppercase tracking-widest text-xs shadow-xl active:scale-95 transition-all">Confirmar Cobro</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default DocumentList;
