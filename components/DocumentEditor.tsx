
import React, { useState, useEffect } from 'react';
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
import BarcodeScanner from './BarcodeScanner';
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
  type, clients, products, onSave, onUpdateClients, onUpdateProducts, settings, initialData 
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
    paymentMethod: 'Efectivo'
  });

  const [aiLoading, setAiLoading] = useState<boolean>(false);
  const [isQuickClientOpen, setIsQuickClientOpen] = useState(false);
  const [isQuickProductOpen, setIsQuickProductOpen] = useState(false);
  
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [scannerTarget, setScannerTarget] = useState<'ITEM' | 'QUICK_PRODUCT'>('ITEM');
  const [activeScannerItemId, setActiveScannerItemId] = useState<string | null>(null);

  const [quickClient, setQuickClient] = useState<Client>({
    id: '', name: '', email: '', taxId: '', address: '', city: '', municipality: '', zipCode: ''
  });
  const [quickProduct, setQuickProduct] = useState<Product>({
    id: '', description: '', purchasePrice: 0, salePrice: 0, category: 'General', sku: '', barcode: '', stock: 0
  });

  const [isProductSelectorOpen, setIsProductSelectorOpen] = useState(false);
  const [activeItemSelectorId, setActiveItemSelectorId] = useState<string | null>(null);
  const [productSearchTerm, setProductSearchTerm] = useState('');

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
        const updatedItem = { ...item, [field]: value };
        if (field === 'description') {
          const lowerValue = value.toLowerCase().trim();
          const matchedProduct = products.find(p => 
            p.description.toLowerCase().trim() === lowerValue || 
            (p.barcode && p.barcode.toLowerCase() === lowerValue)
          );
          if (matchedProduct) {
            updatedItem.unitPrice = matchedProduct.salePrice;
            updatedItem.image = matchedProduct.image;
          }
        }
        return updatedItem;
      }
      return item;
    });
    setDoc({ ...doc, items: newItems });
  };

  const handleScanResult = (code: string) => {
    if (scannerTarget === 'ITEM' && activeScannerItemId) {
      const matched = products.find(p => p.barcode === code);
      if (matched) {
        const newItems = doc.items.map(it => it.id === activeScannerItemId ? { 
          ...it, 
          description: matched.description, 
          unitPrice: matched.salePrice,
          image: matched.image
        } : it);
        setDoc({ ...doc, items: newItems });
      } else {
        updateItem(activeScannerItemId, 'description', code);
      }
    } else if (scannerTarget === 'QUICK_PRODUCT') {
      setQuickProduct({ ...quickProduct, barcode: code });
    }
    setIsScannerOpen(false);
  };

  const startScanning = (target: 'ITEM' | 'QUICK_PRODUCT', itemId?: string) => {
    setScannerTarget(target);
    setActiveScannerItemId(itemId || null);
    setIsScannerOpen(true);
  };

  const handleQuickClientSave = (e: React.FormEvent) => {
    e.preventDefault();
    const newId = Math.random().toString(36).substr(2, 9);
    const newClient = { ...quickClient, id: newId };
    onUpdateClients([newClient, ...clients]);
    setDoc(prev => ({ ...prev, clientId: newId }));
    setIsQuickClientOpen(false);
    setQuickClient({ id: '', name: '', email: '', taxId: '', address: '', city: '', municipality: '', zipCode: '' });
  };

  const handleQuickProductSave = (e: React.FormEvent) => {
    e.preventDefault();
    const newId = Math.random().toString(36).substr(2, 9);
    const newProduct = { ...quickProduct, id: newId, sku: `PROD-${Math.floor(1000 + Math.random() * 9000)}` };
    onUpdateProducts([newProduct, ...products]);
    if (activeItemSelectorId) {
      const newItems = doc.items.map(item => {
        if (item.id === activeItemSelectorId) {
          return { ...item, description: newProduct.description, unitPrice: newProduct.salePrice, image: newProduct.image };
        }
        return item;
      });
      setDoc({ ...doc, items: newItems });
    }
    setIsQuickProductOpen(false);
    setIsProductSelectorOpen(false);
    setQuickProduct({ id: '', description: '', purchasePrice: 0, salePrice: 0, category: 'General', sku: '', barcode: '', stock: 0 });
  };

  const handleSelectProductFromCatalog = (product: Product) => {
    if (!activeItemSelectorId) return;
    const newItems = doc.items.map(item => {
      if (item.id === activeItemSelectorId) {
        return { ...item, description: product.description, unitPrice: product.salePrice, image: product.image };
      }
      return item;
    });
    setDoc({ ...doc, items: newItems });
    setIsProductSelectorOpen(false);
  };

  const openCatalogFor = (itemId: string) => {
    setActiveItemSelectorId(itemId);
    setIsProductSelectorOpen(true);
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
    try {
      exportToPDF(doc, client, settings);
    } catch (pdfErr) {
      console.error("Auto PDF error:", pdfErr);
    }

    onSave(doc);
    
    setTimeout(() => {
      if (type === DocumentType.INVOICE) navigate('/invoices');
      else if (type === DocumentType.ACCOUNT_COLLECTION) navigate('/collections');
      else navigate('/quotes');
    }, 300);
  };

  const handleDelete = () => {
    alert("Para eliminar esta factura, por favor utiliza el botón de papelera en el historial de facturas.");
    navigate(-1);
  };

  return (
    <>
      {isScannerOpen && <BarcodeScanner onScan={handleScanResult} onClose={() => setIsScannerOpen(false)} />}
      
      <ConfirmModal 
        isOpen={isConfirmDeleteOpen}
        title="Eliminar Documento"
        message="¿Estás seguro de que deseas borrar este registro definitivamente?"
        onConfirm={handleDelete}
        onCancel={() => setIsConfirmDeleteOpen(false)}
      />

      <form onSubmit={handleSubmit} className="space-y-6 animate-fadeIn pb-10">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-3xl font-black text-gray-900 tracking-tight">
              {initialData ? 'Editar' : 'Crear'} {type}
            </h2>
            <p className={`text-sm font-bold ${isCollection ? 'text-violet-600' : 'text-blue-600'}`}>
              Documento No. {doc.number}
            </p>
          </div>
          <button type="button" onClick={() => navigate(-1)} className="w-12 h-12 flex items-center justify-center bg-white border border-gray-100 text-gray-400 rounded-2xl hover:bg-gray-50 transition-colors shadow-sm">✕</button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white p-8 rounded-[32px] shadow-sm border border-gray-100 space-y-6">
              <div className="flex justify-between items-center">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Información Principal</p>
                <button 
                  type="button" 
                  onClick={() => setIsQuickClientOpen(true)}
                  className={`text-[10px] font-black px-3 py-1.5 rounded-xl transition-colors ${
                    isCollection ? 'text-violet-600 bg-violet-50 hover:bg-violet-100' : 'text-blue-600 bg-blue-50 hover:bg-blue-100'
                  }`}
                >
                  + Crear Cliente Rápido
                </button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                  <label className="block text-xs font-black text-gray-500 uppercase mb-2">Cliente Receptor</label>
                  <select 
                    value={doc.clientId}
                    onChange={(e) => setDoc({ ...doc, clientId: e.target.value })}
                    className={`w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl font-bold outline-none focus:ring-2 ${isCollection ? 'focus:ring-violet-500' : 'focus:ring-blue-500'}`}
                    required
                  >
                    <option value="">Selecciona un cliente</option>
                    {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-black text-gray-500 uppercase mb-2">Fecha de Emisión</label>
                  <input type="date" value={doc.date} onChange={(e) => setDoc({ ...doc, date: e.target.value })} className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl font-bold outline-none" required />
                </div>
                <div>
                  <label className="block text-xs font-black text-gray-500 uppercase mb-2">Método de Pago</label>
                  <select 
                    value={doc.paymentMethod}
                    onChange={(e) => setDoc({ ...doc, paymentMethod: e.target.value })}
                    className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl font-bold outline-none"
                  >
                    <option value="Efectivo">Efectivo</option>
                    <option value="Transferencia">Transferencia Bancaria</option>
                    <option value="Tarjeta">Tarjeta de Crédito/Débito</option>
                    <option value="Nequi">Nequi</option>
                    <option value="Daviplata">Daviplata</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="bg-white p-8 rounded-[32px] shadow-sm border border-gray-100 space-y-6">
              <div className="flex justify-between items-center">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Conceptos Cobrados</p>
                <button 
                  type="button" 
                  onClick={handleAddItem} 
                  className={`text-[10px] font-black px-3 py-1.5 rounded-xl transition-colors ${
                    isCollection ? 'text-violet-600 bg-violet-50 hover:bg-violet-100' : 'text-blue-600 bg-blue-50 hover:bg-blue-100'
                  }`}
                >
                  + Añadir Ítem
                </button>
              </div>
              
              <div className="space-y-4">
                {doc.items.map((item) => (
                  <div key={item.id} className="p-4 border border-gray-50 rounded-2xl bg-gray-50/30 flex flex-col md:flex-row gap-4 items-end">
                    <div className="flex-1 w-full">
                      <div className="flex justify-between mb-1">
                        <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Descripción / Código</label>
                        <button type="button" onClick={() => openCatalogFor(item.id)} className={`text-[9px] font-bold underline ${isCollection ? 'text-violet-600' : 'text-indigo-600'}`}>Catálogo / Nuevo</button>
                      </div>
                      <div className="flex gap-2">
                        {item.image && (
                          <div className="w-12 h-12 rounded-lg bg-white border border-gray-100 flex-shrink-0 overflow-hidden">
                            <img src={item.image} alt="" className="w-full h-full object-cover" />
                          </div>
                        )}
                        <input 
                          type="text"
                          required
                          value={item.description}
                          onChange={(e) => updateItem(item.id, 'description', e.target.value)}
                          className="flex-1 p-3 bg-white border border-gray-100 rounded-xl font-bold text-sm outline-none"
                          placeholder="Nombre o escanea..."
                        />
                        <button 
                          type="button" 
                          onClick={() => startScanning('ITEM', item.id)}
                          className="w-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center text-lg hover:bg-blue-100"
                        >
                          📷
                        </button>
                      </div>
                    </div>
                    <div className="w-full md:w-24">
                      <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Cant.</label>
                      <input type="number" step="any" min="0.01" required value={item.quantity} onChange={(e) => updateItem(item.id, 'quantity', parseFloat(e.target.value))} className="w-full p-3 bg-white border border-gray-100 rounded-xl font-bold text-sm outline-none text-center" />
                    </div>
                    <div className="w-full md:w-32">
                      <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">P. Unitario</label>
                      <input type="number" step="any" required value={item.unitPrice} onChange={(e) => updateItem(item.id, 'unitPrice', parseFloat(e.target.value))} className="w-full p-3 bg-white border border-gray-100 rounded-xl font-bold text-sm outline-none text-right" />
                    </div>
                    <button type="button" onClick={() => handleRemoveItem(item.id)} className="p-3 text-rose-500 hover:bg-rose-50 rounded-xl transition-colors">🗑️</button>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white p-8 rounded-[32px] shadow-sm border border-gray-100 space-y-4">
               <div className="flex justify-between items-center">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Observaciones y Notas Legales</p>
                <button type="button" onClick={handleSuggestNotes} className={`text-[10px] font-black ${isCollection ? 'text-violet-600' : 'text-blue-600'}`}>🪄 {aiLoading ? 'Generando...' : 'Asistente IA'}</button>
              </div>
              <textarea 
                value={doc.notes}
                onChange={(e) => setDoc({ ...doc, notes: e.target.value })}
                className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-medium outline-none min-h-[120px]"
                placeholder="Escribe notas adicionales o instrucciones de pago..."
              />
            </div>
          </div>

          <div className="space-y-6">
            <div className={`p-8 rounded-[40px] shadow-xl text-white sticky top-10 transition-colors ${isCollection ? 'bg-violet-600 shadow-violet-200' : 'bg-slate-900 shadow-slate-200'}`}>
              <h3 className="text-xl font-black mb-8 border-b border-white/10 pb-4">Resumen Financiero</h3>
              
              <div className="space-y-4">
                <div className="flex justify-between text-white/60 font-bold text-sm">
                  <span>Bruto (Sin imp)</span>
                  <span>{formatCurrency(subtotal)}</span>
                </div>
                
                {!isCollection && (
                  <div className="space-y-3">
                    <div className="flex justify-between text-white/60 font-bold text-sm">
                      <span>IVA ({doc.taxRate}%)</span>
                      <span>{formatCurrency(tax)}</span>
                    </div>
                  </div>
                )}

                <div className="space-y-3 border-t border-white/10 pt-4">
                  <div className="flex justify-between text-white/60 font-bold text-sm">
                    <span>Retención ({doc.withholdingRate}%)</span>
                    <span className="text-rose-300">-{formatCurrency(withholding)}</span>
                  </div>
                </div>

                <div className="pt-6 border-t border-white/10 space-y-1">
                  <div className="flex justify-between items-baseline">
                    <span className="text-[10px] font-black uppercase tracking-widest text-white/50">Total a Pagar</span>
                    <span className="text-xl font-black">{formatCurrency(netTotal)}</span>
                  </div>
                </div>
              </div>

              <div className="mt-10 space-y-3">
                <button 
                  type="submit" 
                  disabled={isSaving}
                  className={`w-full py-5 bg-white text-gray-900 rounded-[24px] font-black shadow-lg hover:bg-gray-50 transition-all active:scale-95 uppercase tracking-widest text-xs flex items-center justify-center ${isSaving ? 'opacity-70' : ''}`}
                >
                  {isSaving ? 'Guardando...' : `Guardar ${type}`}
                </button>

                {initialData && (
                  <button 
                    type="button" 
                    onClick={() => setIsConfirmDeleteOpen(true)}
                    className="w-full py-4 bg-rose-500/20 text-rose-300 border border-rose-500/30 rounded-[24px] font-black hover:bg-rose-500/40 transition-all uppercase tracking-widest text-[10px]"
                  >
                    Eliminar Documento
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </form>
      {/* ... (resto de modales omitido para brevedad ya que no cambia) */}
    </>
  );
};

export default DocumentEditor;
