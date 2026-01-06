
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
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: settings.currency,
      minimumFractionDigits: 0
    }).format(amount);
  };

  const filteredDocs = useMemo(() => {
    return documents
      .filter(d => d.type === type)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .filter(doc => {
        const name = getClientName(doc.clientId).toLowerCase();
        const num = doc.number.toLowerCase();
        const matchesSearch = name.includes(searchTerm.toLowerCase()) || num.includes(searchTerm.toLowerCase());
        const matchesStatus = statusFilter === 'ALL' || doc.status === statusFilter;
        return matchesSearch && matchesStatus;
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
    if (totalPaid >= docTotal - 1) newStatus = DocumentStatus.PAID;
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
          <h2 className="text-3xl font-black text-gray-900 tracking-tight">{type}S</h2>
          <p className="text-gray-500 font-medium">Historial y gestión de cobros</p>
        </div>
        <button onClick={() => navigate(`${getRouteBase(type)}/new`)} className={`w-full sm:w-auto px-6 py-4 text-white rounded-2xl font-bold shadow-lg transition-all flex items-center justify-center space-x-2 active:scale-95 ${isCollection ? 'bg-violet-600 shadow-violet-100' : 'bg-blue-600 shadow-blue-100'}`}>
          <span className="text-xl font-black">+</span>
          <span className="uppercase tracking-widest text-xs">Crear {type}</span>
        </button>
      </div>

      <div className="bg-white p-5 rounded-[32px] shadow-sm border border-gray-100">
        <input type="text" placeholder="Buscar documento o cliente..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-6 pr-4 py-3 bg-gray-50 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 font-bold text-sm" />
      </div>

      <div className="grid grid-cols-1 gap-4 md:hidden">
        {filteredDocs.map(doc => {
          const total = calculateTotal(doc);
          const paid = calculatePaid(doc);
          const balance = total - paid;
          const isPaid = balance < 1;
          return (
            <div key={doc.id} className="bg-white p-8 rounded-[40px] border border-gray-100 shadow-sm space-y-4">
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-black text-lg text-gray-900">#{doc.number}</p>
                  <p className="text-[10px] text-gray-400 font-bold uppercase">{doc.date}</p>
                </div>
                <StatusBadge status={doc.status} />
              </div>
              <div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Cliente</p>
                <p className="font-bold text-gray-800 truncate">{getClientName(doc.clientId)}</p>
              </div>
              <div className="flex justify-between items-end pt-4 border-t border-gray-50">
                <div className="flex-1">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Total</p>
                  <p className="text-xl font-black text-gray-900">{formatCurrency(total)}</p>
                  {!isPaid && <p className="text-[10px] font-black text-emerald-600">Saldo: {formatCurrency(balance)}</p>}
                </div>
                <div className="flex gap-2">
                  {!isPaid && (doc.type === DocumentType.INVOICE || doc.type === DocumentType.ACCOUNT_COLLECTION) && (
                    <button onClick={() => handleOpenPayment(doc)} className="w-14 h-14 bg-emerald-600 text-white rounded-2xl shadow-lg">💸</button>
                  )}
                  <button onClick={() => handleExportPDF(doc)} className="w-14 h-14 bg-slate-100 text-slate-600 rounded-2xl">📥</button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 pt-2">
                <button onClick={() => navigate(`${getRouteBase(doc.type)}/edit/${doc.id}`)} className="py-4 bg-blue-50 text-blue-600 rounded-2xl font-black text-[10px] uppercase">Editar</button>
                {isAdmin && (
                  <button onClick={() => setDocToDelete(doc.id)} className="py-4 bg-rose-50 text-rose-600 rounded-2xl font-black text-[10px] uppercase">Borrar</button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="hidden md:block bg-white rounded-[40px] shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b">
              <tr>
                <th className="px-8 py-5">Ref / Fecha</th>
                <th className="px-8 py-5">Cliente</th>
                <th className="px-8 py-5">Estado</th>
                <th className="px-8 py-5">Total</th>
                <th className="px-8 py-5 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredDocs.map(doc => {
                 const total = calculateTotal(doc);
                 const paid = calculatePaid(doc);
                 const balance = total - paid;
                 const isPaid = balance < 1;
                 return (
                  <tr key={doc.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-8 py-5"><p className="font-bold text-gray-900">#{doc.number}</p><p className="text-[10px] text-gray-400">{doc.date}</p></td>
                    <td className="px-8 py-5"><p className="text-gray-900 font-bold">{getClientName(doc.clientId)}</p></td>
                    <td className="px-8 py-5"><StatusBadge status={doc.status} /></td>
                    <td className="px-8 py-5"><p className="font-black text-gray-900">{formatCurrency(total)}</p></td>
                    <td className="px-8 py-5 text-right">
                      <div className="flex justify-end space-x-2">
                        {!isPaid && (doc.type === DocumentType.INVOICE || doc.type === DocumentType.ACCOUNT_COLLECTION) && (
                          <button onClick={() => handleOpenPayment(doc)} className="p-2.5 text-emerald-600 hover:bg-emerald-50 rounded-xl">💸</button>
                        )}
                        <button onClick={() => handleOpenWhatsAppModal(doc)} className="p-2.5 text-emerald-500 hover:bg-emerald-50 rounded-xl">💬</button>
                        <button onClick={() => handleExportPDF(doc)} className="p-2.5 text-indigo-600 hover:bg-indigo-50 rounded-xl">📥</button>
                        <button onClick={() => navigate(`${getRouteBase(doc.type)}/edit/${doc.id}`)} className="p-2.5 text-blue-600 hover:bg-blue-50 rounded-xl">✏️</button>
                        {isAdmin && <button onClick={() => setDocToDelete(doc.id)} className="p-2.5 text-rose-600 hover:bg-rose-50 rounded-xl">🗑️</button>}
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
          <div className="bg-white rounded-[40px] w-full max-w-sm overflow-hidden shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="bg-emerald-600 p-8 text-white text-center">
              <h3 className="text-xl font-black">Enviar WhatsApp</h3>
            </div>
            <form onSubmit={handleConfirmWhatsApp} className="p-8 space-y-6">
              <input type="tel" required value={whatsappPhone} onChange={e => setWhatsappPhone(e.target.value)} className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl font-black" placeholder="Ej: 573001234567" />
              <button type="submit" className="w-full py-5 bg-emerald-600 text-white rounded-3xl font-black uppercase tracking-widest text-xs">Enviar</button>
            </form>
          </div>
        </div>
      )}

      {isPaymentModalOpen && activeDocForPayment && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 z-[99999]" onClick={() => setIsPaymentModalOpen(false)}>
          <div className="bg-white rounded-[40px] w-full max-w-sm overflow-hidden shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="bg-emerald-600 p-8 text-white">
              <h3 className="text-2xl font-black">Registrar Cobro</h3>
            </div>
            <form onSubmit={handleRegisterPayment} className="p-8 space-y-6">
              <input type="number" required step="any" value={paymentAmountStr} onChange={e => setPaymentAmountStr(e.target.value)} className="w-full p-5 bg-gray-50 rounded-2xl font-black text-3xl text-emerald-600 outline-none" />
              <button type="submit" className="w-full py-5 bg-emerald-600 text-white rounded-3xl font-black uppercase tracking-widest text-xs">Guardar Pago</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default DocumentList;
