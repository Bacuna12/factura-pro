
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Document, 
  DocumentType, 
  DocumentStatus, 
  Client, 
  LineItem,
  AppSettings,
  Product
} from '../types';
import { suggestInvoiceNotes } from '../services/geminiService';
import { exportToPDF } from '../services/pdfService';
import ConfirmModal from './ConfirmModal';

interface DocumentEditorProps {
  type: DocumentType;
  clients: Client[];
  products: Product[];
  onSave: (doc: Document) => void;
  onUpdateClients: (clients: Client[]) => void;
  onUpdateProducts: (products: Product[]) => void;
  settings: AppSettings;
  initialData?: Document;
  onDelete?: (id: string) => void;
}

const DocumentEditor: React.FC<DocumentEditorProps> = ({ 
  type, clients, products, onSave, onUpdateClients, onUpdateProducts, settings, initialData, onDelete
}) => {
  const navigate = useNavigate();
  const isCollection = type === DocumentType.ACCOUNT_COLLECTION;
  const [isSaving, setIsSaving] = useState(false);
  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);
  
  const [doc, setDoc] = useState<Document>(initialData || {
    id: Math.random().toString(36).substr(2, 9),
    type,
    number: `${type === DocumentType.INVOICE ? 'FAC' : isCollection ? 'CC' : 'PRE'}-${Math.floor(Math.random() * 90000 + 10000)}`,
    date: new Date().toISOString().split('T')[0],
    dueDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    clientId: clients[0]?.id || '',
    items: [{ id: Math.random().toString(36).substr(2, 9), description: '', quantity: 1, unitPrice: 0 }],
    status: DocumentStatus.DRAFT,
    notes: isCollection ? `Certifico que NO soy responsable de IVA. Favor consignar a la cuenta [Tipo] número [Número] del banco [Nombre].` : '',
    taxRate: isCollection ? 0 : settings.defaultTaxRate,
    withholdingRate: 0,
    logo: settings.logo,
    paymentMethod: 'Efectivo',
    signature: ''
  });

  const [aiLoading, setAiLoading] = useState<boolean>(false);
  const [isSignatureModalOpen, setIsSignatureModalOpen] = useState(false);
  const [isProductPickerOpen, setIsProductPickerOpen] = useState(false);
  const [productSearchTerm, setProductSearchTerm] = useState('');
  
  const [clientSearchTerm, setClientSearchTerm] = useState('');
  const [isClientResultsOpen, setIsClientResultsOpen] = useState(false);
  const clientSearchRef = useRef<HTMLDivElement>(null);
  const signatureCanvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (clientSearchRef.current && !clientSearchRef.current.contains(event.target as Node)) {
        setIsClientResultsOpen(false);
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

  const filteredProducts = useMemo(() => {
    if (!productSearchTerm) return products.slice(0, 10);
    return products.filter(p => 
      p.description.toLowerCase().includes(productSearchTerm.toLowerCase()) || 
      (p.sku && p.sku.toLowerCase().includes(productSearchTerm.toLowerCase()))
    );
  }, [products, productSearchTerm]);

  const selectedClient = useMemo(() => clients.find(c => c.id === doc.clientId), [clients, doc.clientId]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: settings.currency,
      minimumFractionDigits: 0
    }).format(amount);
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

  const handleAddProductFromCatalog = (p: Product) => {
    const newItem: LineItem = {
      id: Math.random().toString(36).substr(2, 9),
      description: p.description,
      quantity: 1,
      unitPrice: p.salePrice
    };
    
    // Si el primer item está vacío, reemplazarlo
    if (doc.items.length === 1 && doc.items[0].description === '' && doc.items[0].unitPrice === 0) {
      setDoc({ ...doc, items: [newItem] });
    } else {
      setDoc({ ...doc, items: [...doc.items, newItem] });
    }
    setIsProductPickerOpen(false);
    setProductSearchTerm('');
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
    const newItems = doc.items.map(item => {
      if (item.id === id) {
        return { ...item, [field]: value };
      }
      return item;
    });
    setDoc({ ...doc, items: newItems });
  };

  // --- LÓGICA DE FIRMA ---
  const startDrawing = (e: any) => {
    const canvas = signatureCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.beginPath();
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX || e.touches[0].clientX) - rect.left;
    const y = (e.clientY || e.touches[0].clientY) - rect.top;
    ctx.moveTo(x, y);
    (canvas as any).isDrawing = true;
  };

  const draw = (e: any) => {
    const canvas = signatureCanvasRef.current;
    if (!canvas || !(canvas as any).isDrawing) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX || e.touches[0].clientX) - rect.left;
    const y = (e.clientY || e.touches[0].clientY) - rect.top;
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

  const subtotal = doc.items.reduce((acc, item) => acc + (item.quantity * item.unitPrice), 0);
  const tax = subtotal * (doc.taxRate / 100);
  const grossTotal = subtotal + tax;
  const withholding = grossTotal * ((doc.withholdingRate || 0) / 100);
  const netTotal = grossTotal - withholding;

  const handleSuggestNotes = async () => {
    setAiLoading(true);
    const notes = await suggestInvoiceNotes(doc.type, netTotal, settings.currency);
    setDoc({ ...doc, notes: isCollection ? `${doc.notes}\n\n${notes}` : notes });
    setAiLoading(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!doc.clientId) {
      alert("Por favor selecciona un cliente.");
      return;
    }
    setIsSaving(true);
    const client = clients.find(c => c.id === doc.clientId);
    exportToPDF(doc, client, settings);
    onSave(doc);
    setTimeout(() => {
      navigate(-1);
    }, 300);
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

      <form onSubmit={handleSubmit} className="space-y-6 animate-fadeIn pb-10">
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
                  <label className="block text-xs font-black text-gray-500 dark:text-slate-400 uppercase mb-2 ml-2">Método de Pago</label>
                  <select value={doc.paymentMethod} onChange={(e) => setDoc({ ...doc, paymentMethod: e.target.value })} className="w-full p-4 bg-gray-50 dark:bg-slate-800 text-slate-900 dark:text-white border border-gray-100 dark:border-slate-700 rounded-2xl font-bold outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="Efectivo">Efectivo</option>
                    <option value="Transferencia">Transferencia</option>
                    <option value="Nequi">Nequi</option>
                    <option value="Daviplata">Daviplata</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 p-8 rounded-[32px] shadow-sm border border-gray-100 dark:border-slate-800 space-y-6">
              <div className="flex justify-between items-center">
                <p className="text-[10px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-widest">Conceptos Cobrados</p>
                <div className="flex gap-2">
                  <button type="button" onClick={() => setIsProductPickerOpen(true)} className="text-[10px] font-black px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 hover:bg-emerald-100 transition-colors">📦 Catálogo</button>
                  <button type="button" onClick={handleAddItem} className={`text-[10px] font-black px-3 py-1.5 rounded-xl transition-colors ${isCollection ? 'text-violet-600 bg-violet-50 dark:bg-violet-900/30 hover:bg-violet-100' : 'text-blue-600 bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100'}`}>+ Manual</button>
                </div>
              </div>
              
              <div className="space-y-4">
                {doc.items.map((item) => (
                  <div key={item.id} className="p-4 border border-gray-50 dark:border-slate-800 rounded-2xl bg-gray-50/30 dark:bg-slate-800/20 flex flex-col md:flex-row gap-4 items-end">
                    <div className="flex-1 w-full">
                      <label className="text-[9px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-widest">Descripción</label>
                      <input type="text" required value={item.description} onChange={(e) => updateItem(item.id, 'description', e.target.value)} className="w-full p-3 bg-white dark:bg-slate-800 text-slate-900 dark:text-white border border-gray-100 dark:border-slate-700 rounded-xl font-bold text-sm outline-none" />
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
                  <p className="text-[10px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-widest">Notas</p>
                  <button type="button" onClick={handleSuggestNotes} className={`text-[10px] font-black ${isCollection ? 'text-violet-600 dark:text-violet-400' : 'text-blue-600 dark:text-blue-400'}`}>🪄 {aiLoading ? '...' : 'IA'}</button>
                </div>
                <textarea value={doc.notes} onChange={(e) => setDoc({ ...doc, notes: e.target.value })} className="w-full p-4 bg-gray-50 dark:bg-slate-800 text-slate-900 dark:text-white border border-gray-100 dark:border-slate-700 rounded-2xl text-sm font-medium outline-none min-h-[100px]" />
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
              </div>
              <div className="mt-10 space-y-3">
                <button type="submit" disabled={isSaving} className="w-full py-5 bg-white text-gray-900 rounded-[24px] font-black shadow-lg hover:bg-gray-50 transition-all active:scale-95 uppercase tracking-widest text-xs">{isSaving ? 'Guardando...' : `Guardar y Exportar`}</button>
                {initialData && <button type="button" onClick={() => setIsConfirmDeleteOpen(true)} className="w-full py-4 bg-rose-500/20 text-rose-300 border border-rose-500/30 rounded-[24px] font-black hover:bg-rose-500/40 transition-all uppercase tracking-widest text-[10px]">Eliminar</button>}
              </div>
            </div>
          </div>
        </div>
      </form>

      {/* MODAL BUSCADOR DE PRODUCTOS */}
      {isProductPickerOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[99999] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-950 rounded-[40px] w-full max-w-lg overflow-hidden animate-slideUp">
            <div className="bg-slate-900 p-6 text-white flex justify-between items-center">
              <div>
                <h3 className="text-xl font-black uppercase tracking-tighter">Catálogo de Productos</h3>
                <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Selecciona un ítem para añadir</p>
              </div>
              <button onClick={() => setIsProductPickerOpen(false)} className="text-white/50 hover:text-white text-2xl">✕</button>
            </div>
            <div className="p-6 space-y-6">
              <div className="relative">
                <input 
                  type="text" 
                  autoFocus
                  placeholder="Buscar producto por nombre o SKU..." 
                  value={productSearchTerm} 
                  onChange={e => setProductSearchTerm(e.target.value)} 
                  className="w-full p-4 pl-12 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white border border-slate-100 dark:border-slate-800 rounded-2xl font-bold outline-none" 
                />
                <span className="absolute left-4 top-1/2 -translate-y-1/2 opacity-30">🔍</span>
              </div>
              <div className="max-h-[300px] overflow-y-auto space-y-2 scrollbar-hide">
                {filteredProducts.map(p => (
                  <button 
                    key={p.id} 
                    type="button" 
                    onClick={() => handleAddProductFromCatalog(p)} 
                    className="w-full p-4 flex items-center justify-between bg-slate-50 dark:bg-slate-900 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-2xl transition-all group"
                  >
                    <div className="text-left">
                      <p className="font-bold text-slate-900 dark:text-white group-hover:text-blue-600">{p.description}</p>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">SKU: {p.sku || 'N/A'} • Stock: {p.stock || 0}</p>
                    </div>
                    <p className="font-black text-blue-600">{formatCurrency(p.salePrice)}</p>
                  </button>
                ))}
                {filteredProducts.length === 0 && (
                  <div className="py-10 text-center opacity-30">
                    <p className="font-bold">No se encontraron productos</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE FIRMA */}
      {isSignatureModalOpen && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-xl z-[99999] flex items-center justify-center p-4">
          <div className="bg-white rounded-[40px] w-full max-w-lg overflow-hidden animate-slideUp">
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
