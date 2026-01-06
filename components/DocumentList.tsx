
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
  const [paymentAmountStr, setPaymentAmountStr] = useState<string>('0');
  const [paymentMethod, setPaymentMethod] = useState('Efectivo');

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

  const handleOpenPayment = (e: React.MouseEvent | React.TouchEvent, doc: Document) => {
    // Evitamos propagación pero permitimos el comportamiento táctil nativo
    if (e.stopPropagation) e.stopPropagation();
    
    const total = calculateTotal(doc);
    const paid = calculatePaid(doc);
    const remaining = Math.max(0, total - paid);
    
    setActiveDocForPayment(doc);
    setPaymentAmountStr(remaining.toFixed(0));
    setPaymentMethod(doc.paymentMethod || 'Efectivo');
    setIsPaymentModalOpen(true);
  };

  const handleRegisterPayment = (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = parseFloat(paymentAmountStr);
    
    if (!activeDocForPayment || isNaN(amountNum) || amountNum <= 0) {
      alert("Por favor, ingresa un monto válido.");
      return;
    }

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
    // Umbral de 1 unidad para cubrir redondeos
    if (totalPaid >= docTotal - 1) { 
      newStatus = DocumentStatus.PAID;
    } else {
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
    // Usamos alert para confirmar en APK que el flujo terminó
    setTimeout(() => alert("¡Pago registrado con éxito!"), 100);
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
    <div className="relative space-y-6 animate-fadeIn pb-24 md:pb-10">
      <ConfirmModal 
        isOpen={!!docToDelete}
        title={`Eliminar ${type}`}
        message="¿Estás seguro de que deseas eliminar este registro? Los productos se devolverán automáticamente al inventario."
        onConfirm={() => {
          if (docToDelete) onDelete(docToDelete);
          setDocToDelete(null);
        }}
        onCancel={() => setDocToDelete(null)}
      />

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-black text-gray-900 tracking-tight">{type}S</h2>
          <p className="text-gray-500 font-medium">Gestión de cartera y cobros</p>
        </div>
        <button 
          onClick={() => navigate(`${getRouteBase(type)}/new`)}
          className={`w-full sm:w-auto px-6 py-4 text-white rounded-2xl font-bold shadow-lg transition-all flex items-center justify-center space-x-2 active:scale-95 ${
            isCollection ? 'bg-violet-600 shadow-violet-100' : 'bg-blue-600 shadow-blue-100'
          }`}
        >
          <span className="text-xl font-black">+</span>
          <span className="uppercase tracking-widest text-xs">Crear {type}</span>
        </button>
      </div>

      <div className="bg-white p-5 rounded-[32px] shadow-sm border border-gray-100">
        <div className="relative w-full">
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

      {/* VISTA MÓVIL (TARJETAS) */}
      <div className="grid grid-cols-1 gap-4 md:hidden">
        {filteredDocs.map(doc => {
          const total = calculateTotal(doc);
          const paid = calculatePaid(doc);
          const balance = total - paid;
          // Si el balance es menor a 1, lo consideramos pagado para evitar botones innecesarios
          const isPaid = balance < 1;
          
          return (
            <div key={doc.id} className="bg-white p-6 rounded-[32px] border border-gray-100 shadow-sm space-y-4">
              <div className="flex justify-between items-start">
                <div>
                  <p className={`font-black text-lg ${isCollection ? 'text-violet-700' : 'text-gray-900'}`}>#{doc.number}</p>
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{doc.date}</p>
                </div>
                <StatusBadge status={doc.status} />
              </div>
              
              <div className="space-y-1">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Cliente</p>
                <p className="font-bold text-gray-800 truncate">{getClientName(doc.clientId)}</p>
              </div>

              <div className="flex justify-between items-end pt-4 border-t border-gray-50">
                <div className="flex-1">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Total</p>
                  <p className="text-xl font-black text-gray-900">{formatCurrency(total)}</p>
                  {!isPaid && <p className="text-[10px] font-black text-emerald-600 uppercase">Faltan: {formatCurrency(balance)}</p>}
                </div>
                <div className="flex gap-2">
                  {!isPaid && (doc.type === DocumentType.INVOICE || doc.type === DocumentType.ACCOUNT_COLLECTION) && (
                    <button 
                      type="button"
                      onClick={(e) => handleOpenPayment(e, doc)} 
                      className="w-16 h-16 flex items-center justify-center bg-emerald-600 text-white rounded-2xl shadow-xl shadow-emerald-200 active:bg-emerald-700 active:scale-95 transition-all z-10 pointer-events-auto"
                    >
                      <span className="text-2xl pointer-events-none">💸</span>
                    </button>
                  )}
                  <button onClick={() => handleExportPDF(doc)} className="w-12 h-12 flex items-center justify-center bg-slate-100 text-slate-600 rounded-2xl active:bg-slate-200">📥</button>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-2 pt-2">
                <button onClick={() => navigate(`${getRouteBase(doc.type)}/edit/${doc.id}`)} className="py-3 bg-blue-50 text-blue-600 rounded-2xl font-black text-[10px] uppercase tracking-widest active:bg-blue-100">Editar</button>
                <button onClick={() => setDocToDelete(doc.id)} className="py-3 bg-rose-50 text-rose-600 rounded-2xl font-black text-[10px] uppercase tracking-widest active:bg-rose-100">Borrar</button>
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
                 const isPaid = balance < 1;

                 return (
                <tr key={doc.id} className="hover:bg-gray-50/50 transition-colors group">
                  <td className={`px-6 py-4 font-bold ${isCollection ? 'text-violet-700' : 'text-gray-900'}`}>#{doc.number}</td>
                  <td className="px-6 py-4">
                    <p className="text-gray-900 font-bold">{getClientName(doc.clientId)}</p>
                    <p className="text-[10px] text-gray-400 font-bold">{doc.date}</p>
                  </td>
                  <td className="px-6 py-4"><StatusBadge status={doc.status} /></td>
                  <td className="px-6 py-4">
                    <p className="font-black text-gray-900">{formatCurrency(total)}</p>
                    {!isPaid && <p className="text-[9px] font-black text-emerald-600 uppercase">Saldo: {formatCurrency(balance)}</p>}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end space-x-2">
                      {!isPaid && (doc.type === DocumentType.INVOICE || doc.type === DocumentType.ACCOUNT_COLLECTION) && (
                        <button onClick={(e) => handleOpenPayment(e, doc)} className="p-2.5 text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all" title="Cobrar">💸</button>
                      )}
                      <button onClick={() => handleExportPDF(doc)} className="p-2.5 text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all">📥</button>
                      <button onClick={() => navigate(`${getRouteBase(doc.type)}/edit/${doc.id}`)} className="p-2.5 text-blue-600 hover:bg-blue-50 rounded-xl transition-all">✏️</button>
                      <button onClick={() => setDocToDelete(doc.id)} className="p-2.5 text-rose-600 hover:bg-rose-50 rounded-xl transition-all">🗑️</button>
                    </div>
                  </td>
                </tr>
              )})}
            </tbody>
          </table>
        </div>
      </div>

      {filteredDocs.length === 0 && (
        <div className="py-24 text-center bg-white rounded-[40px] border border-gray-100 border-dashed mx-4">
          <p className="text-gray-400 font-bold">No se encontraron documentos registrados.</p>
        </div>
      )}

      {/* MODAL DE PAGO UNIVERSAL (Z-INDEX EXTREMO Y POSICIONAMIENTO FIJO) */}
      {isPaymentModalOpen && activeDocForPayment && (
        <div 
          className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4" 
          style={{ zIndex: 999999, position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}
          onClick={() => setIsPaymentModalOpen(false)}
        >
          <div 
            className="bg-white rounded-[40px] w-full max-w-sm overflow-hidden animate-slideUp shadow-2xl" 
            onClick={e => e.stopPropagation()}
          >
            <div className="bg-emerald-600 p-8 text-white relative">
              <h3 className="text-2xl font-black tracking-tight">Cobrar Ahora</h3>
              <p className="text-emerald-100 text-[10px] font-black uppercase tracking-widest mt-1">Doc No. {activeDocForPayment.number}</p>
              <button 
                type="button"
                onClick={() => setIsPaymentModalOpen(false)} 
                className="absolute top-6 right-6 text-white/60 hover:text-white text-2xl p-2 active:scale-90"
              >
                ✕
              </button>
            </div>
            
            <form onSubmit={handleRegisterPayment} className="p-8 space-y-6">
              <div className="bg-emerald-50 p-6 rounded-3xl border border-emerald-100 text-center">
                 <p className="text-[10px] font-black text-emerald-600 uppercase mb-1">Monto Pendiente</p>
                 <p className="text-3xl font-black text-emerald-900">
                    {formatCurrency(calculateTotal(activeDocForPayment) - calculatePaid(activeDocForPayment))}
                 </p>
              </div>

              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Cantidad a Recibir</label>
                <input 
                  type="number" 
                  autoFocus
                  required
                  step="any"
                  value={paymentAmountStr} 
                  onChange={e => setPaymentAmountStr(e.target.value)}
                  className="w-full p-5 bg-gray-50 border-2 border-transparent focus:border-emerald-500 rounded-2xl font-black text-3xl text-emerald-600 outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Medio de Pago</label>
                <select 
                  value={paymentMethod} 
                  onChange={e => setPaymentMethod(e.target.value)}
                  className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl font-bold outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="Efectivo">Efectivo</option>
                  <option value="Transferencia">Transferencia Bancaria</option>
                  <option value="Nequi">Nequi</option>
                  <option value="Daviplata">Daviplata</option>
                  <option value="Tarjeta">Tarjeta Débito/Crédito</option>
                </select>
              </div>

              <div className="flex flex-col gap-3 pt-2">
                <button 
                  type="submit"
                  className="w-full py-5 bg-emerald-600 text-white rounded-2xl font-black shadow-xl shadow-emerald-200 active:bg-emerald-700 active:scale-95 transition-all uppercase tracking-widest text-xs"
                >
                  Confirmar Recibo
                </button>
                <button 
                  type="button"
                  onClick={() => setIsPaymentModalOpen(false)} 
                  className="w-full py-2 font-bold text-gray-400 hover:text-gray-600 active:text-gray-800"
                >
                  Cerrar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default DocumentList;
