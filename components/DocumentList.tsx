
import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Document, DocumentType, DocumentStatus, Client, AppSettings, Product, Payment } from '../types';
import { exportToPDF } from '../services/pdfService';
import ConfirmModal from './ConfirmModal';

interface DocumentListProps {
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
  
  // Estados para Registro de Pago
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [activeDocForPayment, setActiveDocForPayment] = useState<Document | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState('Efectivo');
  const [paymentNote, setPaymentNote] = useState('');

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

  const handleOpenPayment = (e: React.MouseEvent, doc: Document) => {
    e.preventDefault();
    e.stopPropagation();
    const total = calculateTotal(doc);
    const paid = calculatePaid(doc);
    const remaining = total - paid;
    
    setActiveDocForPayment(doc);
    setPaymentAmount(remaining > 0 ? remaining : 0);
    setPaymentMethod(doc.paymentMethod || 'Efectivo');
    setPaymentNote('');
    setIsPaymentModalOpen(true);
  };

  const handleRegisterPayment = () => {
    const amount = Number(paymentAmount);
    if (!activeDocForPayment || isNaN(amount) || amount < 0) {
      alert("Por favor ingresa un monto válido.");
      return;
    }

    const newPayment: Payment = {
      id: Math.random().toString(36).substr(2, 9),
      date: new Date().toISOString().split('T')[0],
      amount: amount,
      method: paymentMethod,
      note: paymentNote
    };

    const updatedPayments = [...(activeDocForPayment.payments || []), newPayment];
    const totalPaid = updatedPayments.reduce((acc, p) => acc + p.amount, 0);
    const docTotal = calculateTotal(activeDocForPayment);

    let newStatus = activeDocForPayment.status;
    if (totalPaid >= docTotal - 1) { 
      newStatus = DocumentStatus.PAID;
    } else if (totalPaid > 0) {
      newStatus = DocumentStatus.PARTIAL;
    }

    const updatedDoc: Document = {
      ...activeDocForPayment,
      payments: updatedPayments,
      status: newStatus,
      paymentMethod: paymentMethod
    };

    onUpdateDocument(updatedDoc);
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
    <div className="space-y-6 animate-fadeIn pb-20 md:pb-10">
      <ConfirmModal 
        isOpen={!!docToDelete}
        title={`Eliminar ${type}`}
        message="¿Estás seguro de que deseas eliminar este registro? Los productos se devolverán automáticamente al stock del catálogo."
        onConfirm={() => {
          if (docToDelete) onDelete(docToDelete);
          setDocToDelete(null);
        }}
        onCancel={() => setDocToDelete(null)}
      />

      {/* Modal de Registro de Pago (Reforzado) */}
      {isPaymentModalOpen && activeDocForPayment && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
          <div className="bg-white rounded-[32px] w-full max-w-sm overflow-hidden animate-slideUp shadow-2xl">
            <div className="bg-emerald-600 p-8 text-white relative">
              <h3 className="text-2xl font-black tracking-tight">Cobrar Documento</h3>
              <p className="text-emerald-100 text-xs font-bold uppercase tracking-widest mt-1">Doc: {activeDocForPayment.number}</p>
              <button onClick={() => setIsPaymentModalOpen(false)} className="absolute top-6 right-6 text-white/60 hover:text-white text-xl">✕</button>
            </div>
            <div className="p-8 space-y-6">
              <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-100">
                 <p className="text-[10px] font-black text-emerald-600 uppercase mb-1">Saldo Pendiente</p>
                 <p className="text-2xl font-black text-emerald-900">{formatCurrency(calculateTotal(activeDocForPayment) - calculatePaid(activeDocForPayment))}</p>
              </div>

              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Monto del Pago</label>
                <input 
                  type="number" 
                  autoFocus
                  value={paymentAmount} 
                  onChange={e => setPaymentAmount(Number(e.target.value))}
                  className="w-full p-4 bg-gray-50 rounded-2xl border-none outline-none font-black text-2xl text-emerald-600 focus:ring-2 focus:ring-emerald-500 transition-all"
                  placeholder="0"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Método de Pago</label>
                <select 
                  value={paymentMethod} 
                  onChange={e => setPaymentMethod(e.target.value)}
                  className="w-full p-4 bg-gray-50 rounded-2xl font-bold outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="Efectivo">Efectivo</option>
                  <option value="Transferencia">Transferencia Bancaria</option>
                  <option value="Nequi">Nequi</option>
                  <option value="Daviplata">Daviplata</option>
                  <option value="Tarjeta">Tarjeta Débito/Crédito</option>
                </select>
              </div>

              {activeDocForPayment.payments && activeDocForPayment.payments.length > 0 && (
                <div className="pt-2">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Historial de Abonos</p>
                  <div className="max-h-24 overflow-y-auto space-y-1">
                    {activeDocForPayment.payments.map((p, i) => (
                      <div key={i} className="flex justify-between text-[10px] font-bold text-gray-500 bg-gray-50 p-2 rounded-lg">
                        <span>{p.date} - {p.method}</span>
                        <span className="text-emerald-600">{formatCurrency(p.amount)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex flex-col gap-2 pt-2">
                <button 
                  onClick={handleRegisterPayment} 
                  className="w-full py-5 bg-emerald-600 text-white rounded-2xl font-black shadow-lg shadow-emerald-200 active:scale-95 transition-all uppercase tracking-widest text-xs"
                >
                  Confirmar Cobro
                </button>
                <button 
                  onClick={() => setIsPaymentModalOpen(false)} 
                  className="w-full py-4 font-bold text-gray-400 hover:text-gray-600 transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-black text-gray-900 tracking-tight">{type}S</h2>
          <p className="text-gray-500 font-medium">Historial y gestión de cobros</p>
        </div>
        <button 
          onClick={() => navigate(`${getRouteBase(type)}/new`)}
          className={`w-full sm:w-auto px-6 py-4 text-white rounded-2xl font-bold shadow-lg transition-all flex items-center justify-center space-x-2 active:scale-95 ${
            isCollection ? 'bg-violet-600 shadow-violet-100 hover:bg-violet-700' : 'bg-blue-600 shadow-blue-100 hover:bg-blue-700'
          }`}
        >
          <span className="text-xl font-black">+</span>
          <span className="uppercase tracking-widest text-xs">Crear {type}</span>
        </button>
      </div>

      <div className="bg-white p-5 rounded-[32px] shadow-sm border border-gray-100 flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
          <input 
            type="text"
            placeholder="Buscar por número o cliente..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-gray-50 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 font-bold text-sm"
          />
        </div>
      </div>

      {/* VISTA MÓVIL (CARDS) */}
      <div className="grid grid-cols-1 gap-4 md:hidden">
        {filteredDocs.map(doc => {
          const total = calculateTotal(doc);
          const paid = calculatePaid(doc);
          const balance = total - paid;
          return (
            <div key={doc.id} className="bg-white p-5 rounded-[28px] border border-gray-100 shadow-sm space-y-4">
              <div className="flex justify-between items-start">
                <div>
                  <p className={`font-black text-lg ${isCollection ? 'text-violet-700' : 'text-gray-900'}`}>#{doc.number}</p>
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{doc.date}</p>
                </div>
                <StatusBadge status={doc.status} />
              </div>
              
              <div className="space-y-1">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Cliente</p>
                <p className="font-bold text-gray-800">{getClientName(doc.clientId)}</p>
                <p className="text-[9px] font-bold text-gray-400">Vence: {doc.dueDate}</p>
              </div>

              <div className="flex justify-between items-end pt-4 border-t border-gray-50">
                <div className="flex-1">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Total</p>
                  <p className="text-xl font-black text-gray-900">{formatCurrency(total)}</p>
                  {balance > 0 && <p className="text-[9px] font-black text-orange-600 uppercase">Saldo: {formatCurrency(balance)}</p>}
                </div>
                <div className="flex space-x-2">
                  <button onClick={(e) => handleOpenPayment(e, doc)} className="w-10 h-10 flex items-center justify-center bg-emerald-50 text-emerald-600 rounded-xl hover:bg-emerald-100 transition-colors shadow-sm" title="Registrar Pago">💸</button>
                  <button onClick={() => handleExportPDF(doc)} className="w-10 h-10 flex items-center justify-center bg-indigo-50 text-indigo-600 rounded-xl hover:bg-indigo-100 transition-colors shadow-sm">📥</button>
                  <button onClick={() => navigate(`${getRouteBase(doc.type)}/edit/${doc.id}`)} className="w-10 h-10 flex items-center justify-center bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-100 transition-colors shadow-sm">✏️</button>
                  <button onClick={() => setDocToDelete(doc.id)} className="w-10 h-10 flex items-center justify-center bg-rose-50 text-rose-600 rounded-xl hover:bg-rose-100 transition-colors shadow-sm">🗑️</button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* VISTA ESCRITORIO (TABLA) */}
      <div className="hidden md:block bg-white rounded-[32px] shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b">
              <tr>
                <th className="px-6 py-4">Documento</th>
                <th className="px-6 py-4">Cliente / Fecha</th>
                <th className="px-6 py-4">Estado</th>
                <th className="px-6 py-4">Total / Saldo</th>
                <th className="px-6 py-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredDocs.map(doc => {
                 const total = calculateTotal(doc);
                 const paid = calculatePaid(doc);
                 const balance = total - paid;
                 return (
                <tr key={doc.id} className="hover:bg-gray-50/50 transition-colors group">
                  <td className={`px-6 py-4 font-bold ${isCollection ? 'text-violet-700' : 'text-gray-900'}`}>#{doc.number}</td>
                  <td className="px-6 py-4">
                    <p className="text-gray-900 font-bold">{getClientName(doc.clientId)}</p>
                    <p className="text-[10px] text-gray-400 font-bold">{doc.date}</p>
                  </td>
                  <td className="px-6 py-4">
                    <StatusBadge status={doc.status} />
                  </td>
                  <td className="px-6 py-4">
                    <p className="font-black text-gray-900">{formatCurrency(total)}</p>
                    {balance > 0 && <p className="text-[9px] font-black text-orange-600 uppercase tracking-tighter">Saldo: {formatCurrency(balance)}</p>}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end space-x-2">
                      <button onClick={(e) => handleOpenPayment(e, doc)} className="p-2.5 text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all" title="Cobrar / Registrar Pago">💸</button>
                      <button onClick={() => handleExportPDF(doc)} className="p-2.5 text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all" title="PDF">📥</button>
                      <button onClick={() => navigate(`${getRouteBase(doc.type)}/edit/${doc.id}`)} className="p-2.5 text-blue-600 hover:bg-blue-50 rounded-xl transition-all" title="Editar">✏️</button>
                      <button onClick={() => setDocToDelete(doc.id)} className="p-2.5 text-rose-600 hover:bg-rose-100 bg-rose-50/50 rounded-xl transition-all" title="Eliminar">🗑️</button>
                    </div>
                  </td>
                </tr>
              )})}
            </tbody>
          </table>
        </div>
      </div>

      {filteredDocs.length === 0 && (
        <div className="py-20 text-center bg-white rounded-[32px] border border-gray-100">
          <p className="text-gray-400 font-medium">No se encontraron registros registrados.</p>
        </div>
      )}
    </div>
  );
};

export default DocumentList;
