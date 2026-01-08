
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Document, 
  DocumentType, 
  DocumentStatus, 
  Client, 
  LineItem,
  AppSettings,
  Product,
  Payment,
  User
} from '../types';
import { suggestInvoiceNotes } from '../services/geminiService';
import { exportToPDF } from '../services/pdfService';
import ConfirmModal from './ConfirmModal';

interface DocumentEditorProps {
  user: User;
  type: DocumentType;
  clients: Client[];
  products: Product[];
  onSave: (doc: Document) => void;
  onUpdateClients: (client: Client) => void;
  onUpdateProducts: (product: Product) => void;
  settings: AppSettings;
  initialData?: Document;
  onDelete?: (id: string) => void;
  hasActiveCashSession: boolean;
}

const DocumentEditor: React.FC<DocumentEditorProps> = ({ 
  user, type, clients, products, onSave, onUpdateClients, onUpdateProducts, settings, initialData, onDelete, hasActiveCashSession
}) => {
  const navigate = useNavigate();
  const isCollection = type === DocumentType.ACCOUNT_COLLECTION;
  const isQuote = type === DocumentType.QUOTE;
  const isInvoice = type === DocumentType.INVOICE;
  
  const [isSaving, setIsSaving] = useState(false);
  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  
  const [doc, setDoc] = useState<Document>(initialData || {
    id: Math.random().toString(36).substr(2, 9),
    tenantId: settings.tenantId,
    type,
    number: `${type === DocumentType.INVOICE ? 'FAC' : isCollection ? 'CC' : 'PRE'}-${Math.floor(Math.random() * 90000 + 10000)}`,
    date: new Date().toISOString().split('T')[0],
    dueDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    clientId: clients[0]?.id || '',
    items: [{ id: Math.random().toString(36).substr(2, 9), description: '', quantity: 1, unitPrice: 0 }],
    status: DocumentStatus.DRAFT,
    notes: isCollection ? `EN MI CALIDAD DE TRABAJADOR INDEPENDIENTE DECLARO QUE ME ACOJO AL BENEFICIO, ESTABLECIDO EN EL ART.13 DE LA LEY 1527 DE ABRIL 27 DE 2012.` : '',
    taxRate: isCollection ? 0 : settings.defaultTaxRate,
    withholdingRate: 0,
    logo: settings.logo,
    paymentMethod: 'Efectivo',
    signature: '',
    payments: [],
    isPOS: false, 
    createdByName: user.name,
    createdAt: new Date().toISOString(),
    bankName: settings.bankName || '',
    accountType: settings.accountType || 'Ahorros',
    accountNumber: settings.accountNumber || '',
    bankCity: settings.bankCity || ''
  });

  const [aiLoading, setAiLoading] = useState<boolean>(false);
  const [isSignatureModalOpen, setIsSignatureModalOpen] = useState(false);
  
  const [checkoutPaymentMethod, setCheckoutPaymentMethod] = useState('Efectivo');
  const [cashReceived, setCashReceived] = useState<string>('');

  const [activeItemSearchId, setActiveItemSearchId] = useState<string | null>(null);
  const [itemSearchTerm, setItemSearchTerm] = useState('');
  
  const [clientSearchTerm, setClientSearchTerm] = useState('');
  const [isClientResultsOpen, setIsClientResultsOpen] = useState(false);
  const clientSearchRef = useRef<HTMLDivElement>(null);
  const itemSearchRef = useRef<HTMLDivElement>(null);
  const signatureCanvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (clientSearchRef.current && !clientSearchRef.current.contains(event.target as Node)) {
        setIsClientResultsOpen(false);
      }
      if (itemSearchRef.current && !itemSearchRef.current.contains(event.target as Node)) {
        setActiveItemSearchId(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredClients = useMemo(() => {
    if (!clientSearchTerm) return clients.slice(0, 5);
    return clients.filter(c => 
      c.name.toLowerCase().includes(clientSearchTerm.toLowerCase()) || 
      c.taxId.includes(clientSearchTerm)
    );
  }, [clients, clientSearchTerm]);

  const itemSuggestions = useMemo(() => {
    if (!itemSearchTerm || itemSearchTerm.length < 2) return [];
    const term = itemSearchTerm.toLowerCase().trim();
    return products.filter(p => 
      p.description.toLowerCase().includes(term) || 
      (p.sku || '').toLowerCase().includes(term) ||
      (p.barcode || '').toLowerCase().includes(term)
    ).slice(0, 6);
  }, [products, itemSearchTerm]);

  const selectedClient = useMemo(() => clients.find(c => c.id === doc.clientId), [clients, doc.clientId]);

  const subtotal = doc.items.reduce((acc, item) => acc + (item.quantity * item.unitPrice), 0);
  const tax = subtotal * (doc.taxRate / 100);
  const grossTotal = subtotal + tax;
  const withholding = grossTotal * ((doc.withholdingRate || 0) / 100);
  const netTotal = grossTotal - withholding;

  const change = useMemo(() => {
    const received = parseFloat(cashReceived);
    if (isNaN(received) || received <= netTotal) return 0;
    return received - netTotal;
  }, [cashReceived, netTotal]);

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

  const handleAddItem = () => {
    const newItem: LineItem = {
      id: Math.random().toString(36).substr(2, 9),
      description: '',
      quantity: 1,
      unitPrice: 0
    };
    setDoc({ ...doc, items: [...doc.items, newItem] });
  };

  const handleSelectProduct = (itemId: string, p: Product) => {
    const newItems = doc.items.map(item => {
      if (item.id === itemId) {
        return { 
          ...item, 
          description: p.description, 
          unitPrice: p.salePrice,
          image: p.image 
        };
      }
      return item;
    });
    setDoc({ ...doc, items: newItems });
    setActiveItemSearchId(null);
    setItemSearchTerm('');
  };

  const handleRemoveItem = (id: string) => {
    if (doc.items.length === 1) {
      setDoc({ 
        ...doc, 
        items: [{ id: Math.random().toString(36).substr(2, 9), description: '', quantity: 1, unitPrice: 0 }] 
      });
      return;
    }
    setDoc({ ...doc, items: doc.items.filter(item => item.id !== id) });
  };

  const updateItem = (id: string, field: keyof LineItem, value: any) => {
    if (field === 'description') {
      setActiveItemSearchId(id);
      setItemSearchTerm(value);
    }
    const newItems = doc.items.map(item => {
      if (item.id === id) {
        return { ...item, [field]: value };
      }
      return item;
    });
    setDoc({ ...doc, items: newItems });
  };

  const startDrawing = (e: any) => {
    const canvas = signatureCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.beginPath();
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX || (e.touches && e.touches[0].clientX)) - rect.left;
    const y = (e.clientY || (e.touches && e.touches[0].clientY)) - rect.top;
    ctx.moveTo(x, y);
    (canvas as any).isDrawing = true;
  };

  const draw = (e: any) => {
    const canvas = signatureCanvasRef.current;
    if (!canvas || !(canvas as any).isDrawing) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX || (e.touches && e.touches[0].clientX)) - rect.left;
    const y = (e.clientY || (e.touches && e.touches[0].clientY)) - rect.top;
    ctx.lineTo(x, y);
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 2;
    ctx.stroke();
  };

  const stopDrawing = () => {
    const canvas = signatureCanvasRef.current;
    if (canvas) (canvas as any).isDrawing = false;
  };

  const clearSignature = () => {
    const canvas = signatureCanvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      ctx?.clearRect(0, 0, canvas.width, canvas.height);
    }
  };

  const saveSignature = () => {
    const canvas = signatureCanvasRef.current;
    if (canvas) {
      const data = canvas.toDataURL('image/png');
      setDoc({ ...doc, signature: data });
      setIsSignatureModalOpen(false);
    }
  };

  const handleSuggestNotes = async () => {
    setAiLoading(true);
    const notes = await suggestInvoiceNotes(doc.type, netTotal, settings.currency);
    setDoc({ ...doc, notes: isCollection ? `${doc.notes}\n\n${notes}` : notes });
    setAiLoading(false);
  };

  const handleOpenCheckout = () => {
    if (!doc.clientId) {
      alert("Por favor selecciona un cliente.");
      return;
    }

    if (!isQuote && !hasActiveCashSession) {
      alert("⚠️ No puedes emitir documentos de cobro si la caja está cerrada. Por favor abre un turno primero.");
      navigate('/cash');
      return;
    }

    if (isQuote) {
      finalSaveAndEmit(doc);
    } else {
      setCashReceived(netTotal.toString());
      setCheckoutPaymentMethod(doc.paymentMethod || 'Efectivo');
      setIsCheckoutOpen(true);
    }
  };

  const finalSaveAndEmit = (updatedDoc: Document) => {
    setIsSaving(true);
    const client = clients.find(c => c.id === updatedDoc.clientId);
    exportToPDF(updatedDoc, client, settings);
    onSave(updatedDoc);
    setTimeout(() => {
      navigate(-1);
    }, 300);
  };

  const handleConfirmPayment = (e: React.FormEvent) => {
    e.preventDefault();
    const isCredit = checkoutPaymentMethod === 'Crédito';
    const receivedAmount = parseFloat(cashReceived);
    
    const newPayment: Payment[] = isCredit ? [] : [{
      id: Math.random().toString(36).substr(2, 9),
      date: new Date().toISOString().split('T')[0],
      amount: netTotal,
      method: checkoutPaymentMethod,
      received: isNaN(receivedAmount) ? netTotal : receivedAmount,
      change: (isNaN(receivedAmount) || receivedAmount < netTotal) ? 0 : receivedAmount - netTotal
    }];

    const updatedPayments = isCredit ? [] : [...(doc.payments || []), ...newPayment];
    
    let newStatus = DocumentStatus.PAID;
    if (isCredit) newStatus = DocumentStatus.PARTIAL;

    const updatedDoc: Document = { 
      ...doc, 
      payments: updatedPayments, 
      status: newStatus, 
      paymentMethod: checkoutPaymentMethod
    };

    setIsCheckoutOpen(false);
    finalSaveAndEmit(updatedDoc);
  };

  return (
    <>
      <ConfirmModal 
        isOpen={isConfirmDeleteOpen}
        title="Eliminar Documento"
        message="¿Estás seguro de que deseas borrar este registro definitivamente?"
        onConfirm={() => onDelete && onDelete(initialData!.id)}
        onCancel={() => setIsConfirmDeleteOpen(false)}
      />

      {isCheckoutOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xl z-[99999] flex items-center justify-center p-4">
          <div className="bg-white rounded-[40px] w-full max-sm:max-w-[340px] max-w-sm overflow-hidden shadow-2xl animate-slideUp flex flex-col max-h-[90vh]">
            <div className="bg-blue-600 p-8 pb-10 text-white relative text-center shrink-0">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-80 mb-1">Total a Cobrar</p>
              <h3 className="text-4xl font-black tracking-tight">{formatCurrency(netTotal)}</h3>
              <button onClick={() => setIsCheckoutOpen(false)} className="absolute top-6 right-8 text-white/50 hover:text-white text-2xl transition-all">✕</button>
            </div>
            
            <div className="p-8 space-y-8 bg-white dark:bg-slate-950 overflow-y-auto flex-1 custom-scrollbar">
              <div className="space-y-4">
                <label className="text-[10px] font-black text-slate-900 dark:text-slate-400 uppercase tracking-widest ml-1">Método de Pago</label>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    {id: 'Efectivo', icon: '💵', type: 'emoji'},
                    {id: 'Transferencia', icon: '📱', type: 'emoji'},
                    {id: 'Nequi', icon: '#da0081', type: 'nequi'},
                    {id: 'Crédito', icon: '🕒', type: 'emoji'}
                  ].map(method => (
                    <button 
                      key={method.id} 
                      onClick={() => { setCheckoutPaymentMethod(method.id); setCashReceived(''); }} 
                      className={`flex flex-col items-center justify-center gap-3 p-5 rounded-[32px] border-2 transition-all h-32 ${checkoutPaymentMethod === method.id ? (method.id === 'Crédito' ? 'border-amber-500 bg-amber-50/50' : 'border-blue-600 bg-blue-50/50 shadow-inner') : 'border-slate-50 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm'}`}
                    >
                      {method.type === 'nequi' ? (
                        <div className="h-10 w-10 flex items-center justify-center rounded-full shadow-lg" style={{ backgroundColor: method.icon }}>
                          <span className="text-white font-black text-xl italic">N</span>
                        </div>
                      ) : (
                        <span className="text-3xl">{method.icon}</span>
                      )}
                      <span className={`font-black text-[9px] uppercase tracking-widest ${checkoutPaymentMethod === method.id ? (method.id === 'Crédito' ? 'text-amber-600' : 'text-blue-600') : 'text-slate-900 dark:text-slate-400'}`}>{method.id}</span>
                    </button>
                  ))}
                </div>
              </div>

              {checkoutPaymentMethod === 'Efectivo' && (
                <div className="space-y-4 animate-fadeIn">
                  <div className="p-5 bg-slate-50 dark:bg-slate-900 rounded-[28px] border-2 border-blue-600/20 focus-within:border-blue-600 transition-colors">
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-2">Dinero Recibido</label>
                    <input 
                      type="number" 
                      autoFocus
                      placeholder="0"
                      value={cashReceived}
                      onChange={e => setCashReceived(e.target.value)}
                      className="w-full bg-transparent text-slate-900 dark:text-white font-black text-3xl outline-none"
                    />
                  </div>
                  {parseFloat(cashReceived) > netTotal && (
                    <div className="flex justify-between items-center px-4 animate-slideIn">
                      <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Cambio / Vuelto:</p>
                      <p className="text-2xl font-black text-emerald-600">{formatCurrency(change)}</p>
                    </div>
                  )}
                </div>
              )}

              {checkoutPaymentMethod === 'Crédito' && (
                <div className="space-y-4 animate-fadeIn">
                  <div className="p-5 bg-amber-50 dark:bg-amber-900/10 rounded-[28px] border-2 border-amber-600/20 focus-within:border-amber-600 transition-colors">
                    <label className="block text-[10px] font-black text-amber-600 uppercase tracking-widest ml-1 mb-2">Fecha Límite de Pago</label>
                    <input 
                      type="date" 
                      value={doc.dueDate}
                      onChange={e => setDoc({...doc, dueDate: e.target.value})}
                      className="w-full bg-transparent text-slate-900 dark:text-white font-black text-xl outline-none"
                    />
                  </div>
                  <p className="text-[9px] font-bold text-amber-700 dark:text-amber-400 px-4">
                    * Establece la fecha en la que el cliente debe saldar esta factura.
                  </p>
                </div>
              )}
            </div>

            <div className="p-8 pt-4 bg-white dark:bg-slate-950 border-t dark:border-slate-800 shrink-0">
              <button 
                onClick={handleConfirmPayment} 
                className="w-full py-5 bg-[#0f172a] text-white rounded-[32px] font-black uppercase tracking-widest text-xs flex items-center justify-center gap-3 active:scale-95 transition-all shadow-2xl hover:bg-black"
              >
                ✓ COMPLETAR OPERACIÓN
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-6 animate-fadeIn pb-10">
        {!isQuote && !hasActiveCashSession && (
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 p-4 rounded-3xl flex items-center gap-4 mb-2 animate-pulse">
            <span className="text-2xl">⚠️</span>
            <p className="text-xs font-bold text-amber-700 dark:text-amber-400">
              <span className="font-black">ATENCIÓN:</span> La caja está cerrada. Debes abrir un turno para emitir documentos con cobro.
            </p>
          </div>
        )}

        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight">
              {initialData ? 'Editar' : 'Crear'} {type}
            </h2>
            <p className={`text-sm font-bold ${isCollection ? 'text-violet-600 dark:text-violet-400' : 'text-blue-600 dark:text-blue-400'}`}>
              Documento No. {doc.number}
            </p>
          </div>
          <button type="button" onClick={() => navigate(-1)} className="w-12 h-12 flex items-center justify-center bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 text-gray-400 rounded-2xl hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors shadow-sm">✕</button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white dark:bg-slate-900 p-8 rounded-[32px] shadow-sm border border-gray-100 dark:border-slate-800 space-y-6">
              <div className="flex justify-between items-center">
                <p className="text-[10px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-widest">Información Principal</p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2 relative" ref={clientSearchRef}>
                  <label className="block text-xs font-black text-gray-500 dark:text-slate-400 uppercase mb-2 ml-2">Cliente Receptor</label>
                  <div className="relative group">
                    <input 
                      type="text"
                      placeholder={selectedClient ? selectedClient.name : "Busca por nombre o identificación..."}
                      value={clientSearchTerm}
                      onFocus={() => setIsClientResultsOpen(true)}
                      onChange={(e) => { setClientSearchTerm(e.target.value); setIsClientResultsOpen(true); }}
                      className={`w-full p-4 pl-12 bg-gray-50 dark:bg-slate-800 text-slate-900 dark:text-white border border-gray-100 dark:border-slate-700 rounded-2xl font-bold outline-none focus:ring-2 transition-all ${isCollection ? 'focus:ring-violet-500' : 'focus:ring-blue-500'}`}
                    />
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xl opacity-30">🔍</span>
                  </div>

                  {isClientResultsOpen && (
                    <div className="absolute z-[100] top-full left-0 right-0 mt-2 bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-[24px] shadow-2xl overflow-hidden animate-fadeIn">
                      <div className="max-h-60 overflow-y-auto scrollbar-hide">
                        {filteredClients.map(c => (
                          <button key={c.id} type="button" onClick={() => { setDoc({ ...doc, clientId: c.id }); setClientSearchTerm(''); setIsClientResultsOpen(false); }} className={`w-full p-4 text-left hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors flex items-center justify-between group ${doc.clientId === c.id ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}>
                            <div>
                              <p className="font-bold text-slate-900 dark:text-white group-hover:text-blue-600 transition-colors">{c.name}</p>
                              <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">{c.taxId}</p>
                            </div>
                            {doc.clientId === c.id && <span className="text-blue-600">✓</span>}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-black text-gray-500 dark:text-slate-400 uppercase mb-2 ml-2">Fecha de Emisión</label>
                  <input type="date" value={doc.date} onChange={(e) => setDoc({ ...doc, date: e.target.value })} className="w-full p-4 bg-gray-50 dark:bg-slate-800 text-slate-900 dark:text-white border border-gray-100 dark:border-slate-700 rounded-2xl font-bold outline-none" required />
                </div>
                <div>
                  <label className="block text-xs font-black text-gray-500 dark:text-slate-400 uppercase mb-2 ml-2">Fecha Vencimiento</label>
                  <input type="date" value={doc.dueDate} onChange={(e) => setDoc({ ...doc, dueDate: e.target.value })} className="w-full p-4 bg-gray-50 dark:bg-slate-800 text-slate-900 dark:text-white border border-gray-100 dark:border-slate-700 rounded-2xl font-bold outline-none" required />
                </div>
              </div>
            </div>

            {/* SECCIÓN BANCARIA PARA CUENTA DE COBRO */}
            {isCollection && (
              <div className="bg-white dark:bg-slate-900 p-8 rounded-[32px] shadow-sm border border-violet-100 dark:border-violet-900/30 space-y-6 animate-fadeIn">
                <div className="flex items-center gap-3">
                  <span className="text-xl">🏦</span>
                  <p className="text-[10px] font-black text-violet-600 dark:text-violet-400 uppercase tracking-widest">Información Bancaria para Pago</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                   <div>
                    <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1 ml-2">Banco</label>
                    <input type="text" value={doc.bankName} onChange={e => setDoc({...doc, bankName: e.target.value})} className="w-full p-3 bg-gray-50 dark:bg-slate-800 text-slate-900 dark:text-white border border-gray-100 dark:border-slate-700 rounded-xl font-bold text-xs" placeholder="Ej: BANCOLOMBIA" />
                  </div>
                  <div>
                    <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1 ml-2">Tipo de Cuenta</label>
                    <select value={doc.accountType} onChange={e => setDoc({...doc, accountType: e.target.value})} className="w-full p-3 bg-gray-50 dark:bg-slate-800 text-slate-900 dark:text-white border border-gray-100 dark:border-slate-700 rounded-xl font-bold text-xs">
                      <option value="Ahorros">Ahorros</option>
                      <option value="Corriente">Corriente</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1 ml-2">Número de Cuenta</label>
                    <input type="text" value={doc.accountNumber} onChange={e => setDoc({...doc, accountNumber: e.target.value})} className="w-full p-3 bg-gray-50 dark:bg-slate-800 text-slate-900 dark:text-white border border-gray-100 dark:border-slate-700 rounded-xl font-bold text-xs" placeholder="Ej: 226-000000-01" />
                  </div>
                  <div>
                    <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1 ml-2">Ciudad Origen</label>
                    <input type="text" value={doc.bankCity} onChange={e => setDoc({...doc, bankCity: e.target.value})} className="w-full p-3 bg-gray-50 dark:bg-slate-800 text-slate-900 dark:text-white border border-gray-100 dark:border-slate-700 rounded-xl font-bold text-xs" placeholder="Ej: Medellín" />
                  </div>
                </div>
              </div>
            )}

            <div className="bg-white dark:bg-slate-900 p-8 rounded-[32px] shadow-sm border border-gray-100 dark:border-slate-800 space-y-6">
              <div className="flex justify-between items-center">
                <p className="text-[10px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-widest">Conceptos Cobrados</p>
                <div className="flex gap-2">
                  <button type="button" onClick={handleAddItem} className={`text-[10px] font-black px-4 py-2 rounded-xl transition-colors ${isCollection ? 'text-violet-600 bg-violet-50 dark:bg-violet-900/30 hover:bg-violet-100' : 'text-blue-600 bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100'}`}>+ Añadir Item</button>
                </div>
              </div>
              
              <div className="space-y-4">
                {doc.items.map((item) => (
                  <div key={item.id} className="p-4 border border-gray-50 dark:border-slate-800 rounded-2xl bg-gray-50/30 dark:bg-slate-800/20 flex flex-col md:flex-row gap-4 items-end relative">
                    <div className="flex-1 w-full relative">
                      <label className="text-[9px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-widest">Descripción / Búsqueda</label>
                      <div className="relative group">
                        <input 
                          type="text" 
                          required 
                          value={item.description} 
                          onChange={(e) => updateItem(item.id, 'description', e.target.value)} 
                          onFocus={() => {
                            if (item.description.length >= 2) setActiveItemSearchId(item.id);
                            setItemSearchTerm(item.description);
                          }}
                          className="w-full p-3 bg-white dark:bg-slate-800 text-slate-900 dark:text-white border border-gray-100 dark:border-slate-700 rounded-xl font-bold text-sm outline-none focus:ring-2 focus:ring-blue-500/20" 
                          placeholder="Escribe para cargar productos..."
                        />
                        {activeItemSearchId === item.id && itemSuggestions.length > 0 && (
                          <div ref={itemSearchRef} className="absolute z-[110] top-full left-0 right-0 mt-1 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden animate-fadeIn max-w-md">
                            <div className="bg-slate-50 dark:bg-slate-800 px-4 py-2 border-b dark:border-slate-700">
                               <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Sugerencias del Catálogo</p>
                            </div>
                            {itemSuggestions.map(p => (
                              <button 
                                key={p.id} 
                                type="button" 
                                onClick={() => handleSelectProduct(item.id, p)}
                                className="w-full p-3 flex items-center gap-3 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors text-left group"
                              >
                                <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex-shrink-0 overflow-hidden flex items-center justify-center">
                                  {p.image ? <img src={p.image} className="w-full h-full object-cover" /> : <span className="text-xs">📦</span>}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="font-bold text-slate-800 dark:text-slate-100 text-xs truncate group-hover:text-blue-600 transition-colors">{p.description}</p>
                                  <div className="flex items-center gap-2">
                                    <p className="text-[8px] font-black text-slate-400 uppercase">{p.sku || 'S/SKU'}</p>
                                    <p className="text-[8px] font-black text-emerald-500 uppercase">Stock: {p.stock || 0}</p>
                                  </div>
                                </div>
                                <p className="font-black text-blue-600 dark:text-blue-400 text-xs">{formatCurrency(p.salePrice)}</p>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="w-full md:w-24">
                      <label className="block text-[9px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-widest mb-1">Cant.</label>
                      <input type="number" step="any" required value={item.quantity} onChange={(e) => updateItem(item.id, 'quantity', parseFloat(e.target.value))} className="w-full p-3 bg-white dark:bg-slate-800 text-slate-900 dark:text-white border border-gray-100 dark:border-slate-700 rounded-xl font-bold text-sm outline-none text-center" />
                    </div>
                    <div className="w-full md:w-32">
                      <label className="block text-[9px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-widest mb-1">Precio Unit.</label>
                      <input type="number" step="any" required value={item.unitPrice} onChange={(e) => updateItem(item.id, 'unitPrice', parseFloat(e.target.value))} className="w-full p-3 bg-white dark:bg-slate-800 text-slate-900 dark:text-white border border-gray-100 dark:border-slate-700 rounded-xl font-bold text-sm outline-none text-right" />
                    </div>
                    <button type="button" onClick={() => handleRemoveItem(item.id)} className="p-3 text-rose-500 hover:bg-rose-50 rounded-xl">🗑️</button>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white dark:bg-slate-900 p-8 rounded-[32px] shadow-sm border border-gray-100 dark:border-slate-800 space-y-4">
                 <div className="flex justify-between items-center">
                  <p className="text-[10px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-widest">Notas Adicionales</p>
                  <button type="button" onClick={handleSuggestNotes} className={`text-[10px] font-black ${isCollection ? 'text-violet-600 dark:text-violet-400' : 'text-blue-600 dark:text-blue-400'}`}>🪄 {aiLoading ? '...' : 'IA'}</button>
                </div>
                <textarea value={doc.notes} onChange={(e) => setDoc({ ...doc, notes: e.target.value })} className="w-full p-4 bg-gray-50 dark:bg-slate-900 text-slate-900 dark:text-white border border-gray-100 dark:border-slate-700 rounded-2xl text-sm font-medium outline-none min-h-[100px]" placeholder="Observaciones generales..." />
              </div>

              <div className="bg-white dark:bg-slate-900 p-8 rounded-[32px] shadow-sm border border-gray-100 dark:border-slate-800 flex flex-col items-center justify-center space-y-4">
                <p className="text-[10px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-widest">Firma Digital</p>
                {doc.signature ? (
                  <div className="relative group">
                    <img src={doc.signature} className="h-20 object-contain border border-slate-100 rounded-xl p-2 bg-slate-50" alt="Firma" />
                    <button type="button" onClick={() => setIsSignatureModalOpen(true)} className="absolute inset-0 bg-black/40 text-white opacity-0 group-hover:opacity-100 flex items-center justify-center rounded-xl transition-opacity text-[10px] font-black">REPETIR</button>
                  </div>
                ) : (
                  <button type="button" onClick={() => setIsSignatureModalOpen(true)} className="w-full py-6 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl text-slate-400 hover:text-blue-500 hover:border-blue-500 transition-all flex flex-col items-center">
                    <span className="text-2xl mb-1">✍️</span>
                    <span className="text-[10px] font-black uppercase">Firmar Documento</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className={`p-8 rounded-[40px] shadow-xl text-white sticky top-10 transition-colors ${isCollection ? 'bg-violet-600 shadow-violet-200' : 'bg-slate-900 shadow-slate-200'}`}>
              <h3 className="text-xl font-black mb-8 border-b border-white/10 pb-4">Resumen</h3>
              <div className="space-y-4">
                <div className="flex justify-between text-white/60 font-bold text-sm"><span>Subtotal</span><span>{formatCurrency(subtotal)}</span></div>
                {!isCollection && <div className="flex justify-between text-white/60 font-bold text-sm"><span>IVA ({doc.taxRate}%)</span><span>{formatCurrency(tax)}</span></div>}
                <div className="pt-6 border-t border-white/10 flex justify-between items-baseline">
                  <span className="text-[10px] font-black uppercase tracking-widest text-white/50">Total</span>
                  <span className="text-2xl font-black">{formatCurrency(netTotal)}</span>
                </div>
                <div className="pt-4 border-t border-white/10 space-y-2">
                   <p className="text-[8px] font-black uppercase tracking-widest text-white/40">Vendedor</p>
                   <p className="text-xs font-bold truncate">{doc.createdByName}</p>
                </div>
              </div>
              <div className="mt-10 space-y-3">
                <button 
                  type="button" 
                  onClick={handleOpenCheckout}
                  disabled={isSaving || (!isQuote && !hasActiveCashSession)} 
                  className={`w-full py-5 rounded-[24px] font-black shadow-lg transition-all active:scale-95 uppercase tracking-widest text-xs ${
                    (!isQuote && !hasActiveCashSession) 
                    ? 'bg-slate-600 text-slate-400 cursor-not-allowed opacity-50' 
                    : 'bg-white text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  {isSaving ? 'Procesando...' : (!isQuote && !hasActiveCashSession) ? 'CAJA CERRADA' : isQuote ? 'Guardar y Exportar' : 'Procesar Pago y Emitir'}
                </button>
                {initialData && <button type="button" onClick={() => setIsConfirmDeleteOpen(true)} className="w-full py-4 bg-rose-500/20 text-rose-300 border border-rose-500/30 rounded-[24px] font-black hover:bg-rose-500/40 transition-all uppercase tracking-widest text-[10px]">Eliminar</button>}
              </div>
            </div>
          </div>
        </div>
      </div>

      {isSignatureModalOpen && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-xl z-[99999] flex items-center justify-center p-4">
          <div className="bg-white rounded-[40px] w-full max-lg:max-w-lg overflow-hidden animate-slideUp">
            <div className="bg-slate-900 p-6 text-white text-center">
              <h3 className="text-xl font-black tracking-tight uppercase">Firma del Cliente / Vendedor</h3>
              <p className="text-slate-400 text-[10px] font-black uppercase mt-1 tracking-widest">Dibuja tu firma en el recuadro</p>
            </div>
            <div className="p-8 space-y-6">
              <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-3xl overflow-hidden cursor-crosshair relative aspect-[16/9]">
                <canvas 
                  ref={signatureCanvasRef} 
                  width={600} 
                  height={300}
                  className="w-full h-full touch-none"
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                  onTouchStart={startDrawing}
                  onTouchMove={draw}
                  onTouchEnd={stopDrawing}
                />
              </div>
              <div className="flex gap-3">
                <button type="button" onClick={clearSignature} className="flex-1 py-4 bg-slate-100 text-slate-500 rounded-2xl font-black text-xs uppercase tracking-widest">Borrar</button>
                <button type="button" onClick={saveSignature} className="flex-[2] py-4 bg-blue-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl">Guardar Firma</button>
              </div>
              <button type="button" onClick={() => setIsSignatureModalOpen(false)} className="w-full text-center text-slate-400 text-[10px] font-black uppercase tracking-widest">Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default DocumentEditor;
