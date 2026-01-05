
import React, { useState } from 'react';
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
import { generateProfessionalDescription, suggestInvoiceNotes, generateDraftItems } from '../services/geminiService';

interface DocumentEditorProps {
  type: DocumentType;
  clients: Client[];
  products: Product[];
  onSave: (doc: Document) => void;
  settings: AppSettings;
  initialData?: Document;
}

const DocumentEditor: React.FC<DocumentEditorProps> = ({ type, clients, products, onSave, settings, initialData }) => {
  const navigate = useNavigate();
  
  const [doc, setDoc] = useState<Document>(initialData || {
    id: Math.random().toString(36).substr(2, 9),
    type,
    number: `${type === DocumentType.INVOICE ? 'FAC' : 'PRE'}-${Math.floor(Math.random() * 10000)}`,
    date: new Date().toISOString().split('T')[0],
    dueDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    clientId: clients[0]?.id || '',
    items: [{ id: '1', description: '', quantity: 1, unitPrice: 0 }],
    status: DocumentStatus.DRAFT,
    notes: '',
    taxRate: settings.defaultTaxRate,
    logo: settings.logo
  });

  const [aiLoading, setAiLoading] = useState<string | null>(null);
  const [draftPrompt, setDraftPrompt] = useState('');
  
  // Estados para el selector de productos
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
        // Autocompletar precio si coincide exactamente con un producto
        if (field === 'description') {
          const matchedProduct = products.find(p => p.description.toLowerCase() === value.toLowerCase());
          if (matchedProduct) {
            updatedItem.unitPrice = matchedProduct.unitPrice;
          }
        }
        return updatedItem;
      }
      return item;
    });
    setDoc({ ...doc, items: newItems });
  };

  const handleSelectProductFromCatalog = (product: Product) => {
    if (!activeItemSelectorId) return;
    
    const newItems = doc.items.map(item => {
      if (item.id === activeItemSelectorId) {
        return {
          ...item,
          description: product.description,
          unitPrice: product.unitPrice
        };
      }
      return item;
    });
    
    setDoc({ ...doc, items: newItems });
    setIsProductSelectorOpen(false);
    setActiveItemSelectorId(null);
    setProductSearchTerm('');
  };

  const openCatalogFor = (itemId: string) => {
    setActiveItemSelectorId(itemId);
    setIsProductSelectorOpen(true);
  };

  const handleImproveDescription = async (itemId: string, text: string) => {
    if (!text) return;
    setAiLoading(itemId);
    const improved = await generateProfessionalDescription(text);
    updateItem(itemId, 'description', improved);
    setAiLoading(null);
  };

  const handleDraftContent = async () => {
    if (!draftPrompt) return;
    setAiLoading('drafting');
    const items = await generateDraftItems(draftPrompt);
    if (items && items.length > 0) {
      const newItems: LineItem[] = items.map(item => ({
        id: Math.random().toString(36).substr(2, 9),
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice
      }));
      if (doc.items.length === 1 && !doc.items[0].description) {
        setDoc({ ...doc, items: newItems });
      } else {
        setDoc({ ...doc, items: [...doc.items, ...newItems] });
      }
      setDraftPrompt('');
    }
    setAiLoading(null);
  };

  const subtotal = doc.items.reduce((acc, item) => acc + (item.quantity * item.unitPrice), 0);
  const tax = subtotal * (doc.taxRate / 100);
  const total = subtotal + tax;

  const handleSuggestNotes = async () => {
    setAiLoading('notes');
    const notes = await suggestInvoiceNotes(doc.type, total, settings.currency);
    setDoc({ ...doc, notes });
    setAiLoading(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(doc);
    navigate(type === DocumentType.INVOICE ? '/invoices' : '/quotes');
  };

  const filteredProducts = products.filter(p => 
    p.description.toLowerCase().includes(productSearchTerm.toLowerCase())
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-6 animate-fadeIn pb-10">
      <datalist id="products-list">
        {products.map(p => (
          <option key={p.id} value={p.description} />
        ))}
      </datalist>

      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-3xl font-black text-gray-900 tracking-tight">
            {initialData ? 'Editar' : 'Crear'} {type === DocumentType.INVOICE ? 'Factura' : 'Presupuesto'}
          </h2>
          <p className="text-gray-500 font-medium">#{doc.number}</p>
        </div>
        <button 
          type="button" 
          onClick={() => navigate(-1)}
          className="w-12 h-12 flex items-center justify-center bg-gray-100 text-gray-500 rounded-2xl hover:bg-gray-200 transition-colors"
        >
          ✕
        </button>
      </div>

      {!initialData && (
        <div className="bg-gradient-to-br from-blue-600 to-indigo-700 p-8 rounded-[32px] text-white shadow-xl shadow-blue-200 relative overflow-hidden group">
          <div className="relative z-10">
            <div className="flex items-center space-x-3 mb-2">
              <span className="text-2xl">✨</span>
              <h3 className="font-bold text-xl">Borrador con IA</h3>
            </div>
            <p className="text-blue-100 mb-6 text-sm">Describe tu trabajo y la IA creará los ítems por ti.</p>
            <div className="flex gap-2">
              <input 
                type="text"
                value={draftPrompt}
                onChange={(e) => setDraftPrompt(e.target.value)}
                placeholder="Ej: Mantenimiento de aire acondicionado..."
                className="flex-1 p-4 rounded-2xl border-none bg-white/20 backdrop-blur-md text-white placeholder-blue-200 outline-none focus:bg-white/30 transition-all text-sm"
              />
              <button 
                type="button"
                onClick={handleDraftContent}
                disabled={aiLoading === 'drafting' || !draftPrompt}
                className="px-6 bg-white text-blue-600 font-black rounded-2xl hover:bg-blue-50 transition-all shadow-lg active:scale-95 disabled:opacity-50"
              >
                {aiLoading === 'drafting' ? '...' : 'Generar'}
              </button>
            </div>
          </div>
          <div className="absolute -right-4 -bottom-4 opacity-10 text-9xl">⚡</div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-white p-8 rounded-[32px] shadow-sm border border-gray-100">
        <div className="space-y-6">
          <div>
            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Cliente</label>
            <select 
              value={doc.clientId}
              onChange={(e) => setDoc({ ...doc, clientId: e.target.value })}
              className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl font-bold outline-none focus:ring-2 focus:ring-blue-500 appearance-none"
              required
            >
              <option value="">Selecciona un cliente</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Número</label>
              <input type="text" value={doc.number} onChange={(e) => setDoc({ ...doc, number: e.target.value })} className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl font-bold outline-none" required />
            </div>
            <div>
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Estado</label>
              <select value={doc.status} onChange={(e) => setDoc({ ...doc, status: e.target.value as DocumentStatus })} className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl font-bold outline-none">
                {Object.values(DocumentStatus).map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
        </div>
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Fecha</label>
              <input type="date" value={doc.date} onChange={(e) => setDoc({ ...doc, date: e.target.value })} className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl font-bold outline-none" required />
            </div>
            <div>
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Vencimiento</label>
              <input type="date" value={doc.dueDate} onChange={(e) => setDoc({ ...doc, dueDate: e.target.value })} className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl font-bold outline-none" required />
            </div>
          </div>
          <div>
            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Impuesto (%)</label>
            <input type="number" value={doc.taxRate} onChange={(e) => setDoc({ ...doc, taxRate: parseFloat(e.target.value) })} className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl font-bold outline-none" required />
          </div>
        </div>
      </div>

      <div className="bg-white p-8 rounded-[32px] shadow-sm border border-gray-100">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-black text-gray-900 tracking-tight">Líneas de Detalle</h3>
        </div>
        <div className="space-y-4">
          {doc.items.map((item) => (
            <div key={item.id} className="p-6 border border-gray-100 rounded-3xl bg-gray-50/50 space-y-4 relative group">
              <div className="flex flex-col lg:flex-row gap-4">
                <div className="flex-1">
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Descripción</label>
                    <div className="flex space-x-3">
                      <button 
                        type="button" 
                        onClick={() => openCatalogFor(item.id)}
                        className="text-[10px] font-black text-indigo-600 hover:text-indigo-800 flex items-center space-x-1 bg-indigo-50 px-2 py-1 rounded-lg"
                      >
                        <span>📦 Ver Catálogo</span>
                      </button>
                      <button 
                        type="button" 
                        onClick={() => handleImproveDescription(item.id, item.description)} 
                        disabled={aiLoading === item.id || !item.description} 
                        className="text-[10px] font-black text-blue-600 hover:text-blue-800 disabled:opacity-30 flex items-center space-x-1 bg-blue-50 px-2 py-1 rounded-lg"
                      >
                        <span>✨ Mejora IA</span>
                      </button>
                    </div>
                  </div>
                  <input 
                    list="products-list"
                    value={item.description}
                    onChange={(e) => updateItem(item.id, 'description', e.target.value)}
                    className="w-full p-4 bg-white border border-gray-100 rounded-2xl font-bold outline-none shadow-sm text-sm"
                    placeholder="Escribe el nombre del servicio o producto..."
                  />
                </div>
                <div className="flex flex-row gap-4">
                  <div className="w-24">
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 text-center">Cant.</label>
                    <input type="number" value={item.quantity} onChange={(e) => updateItem(item.id, 'quantity', parseFloat(e.target.value))} className="w-full p-4 bg-white border border-gray-100 rounded-2xl font-bold outline-none shadow-sm text-center" />
                  </div>
                  <div className="w-32">
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 text-center">Precio Unit.</label>
                    <input type="number" value={item.unitPrice} onChange={(e) => updateItem(item.id, 'unitPrice', parseFloat(e.target.value))} className="w-full p-4 bg-white border border-gray-100 rounded-2xl font-bold outline-none shadow-sm text-center" />
                  </div>
                  <div className="flex items-end">
                    <button 
                      type="button" 
                      onClick={() => handleRemoveItem(item.id)} 
                      className="w-12 h-12 flex items-center justify-center bg-rose-50 text-rose-600 rounded-2xl hover:bg-rose-100 transition-colors"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
        <button type="button" onClick={handleAddItem} className="mt-6 p-5 border-2 border-dashed border-gray-200 rounded-3xl w-full text-gray-400 font-bold hover:border-blue-400 hover:text-blue-600 transition-all active:scale-[0.99]">
          + Añadir nuevo concepto
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-2 bg-white p-8 rounded-[32px] shadow-sm border border-gray-100">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-black text-gray-900 tracking-tight">Notas y Condiciones</h3>
            <button type="button" onClick={handleSuggestNotes} disabled={aiLoading === 'notes'} className="text-[10px] font-black text-blue-600 bg-blue-50 px-3 py-1.5 rounded-xl hover:bg-blue-100">
              {aiLoading === 'notes' ? 'Redactando...' : '🪄 Redactar con IA'}
            </button>
          </div>
          <textarea value={doc.notes} onChange={(e) => setDoc({ ...doc, notes: e.target.value })} className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none font-medium text-sm" rows={6} placeholder="Instrucciones de pago, agradecimientos..." />
        </div>
        <div className="bg-slate-900 text-white p-8 rounded-[32px] shadow-2xl shadow-gray-400 flex flex-col justify-between">
          <div className="space-y-4">
            <h3 className="text-lg font-black border-b border-white/10 pb-4">Resumen</h3>
            <div className="flex justify-between text-slate-400 font-medium"><span>Subtotal</span><span>{formatCurrency(subtotal)}</span></div>
            <div className="flex justify-between text-slate-400 font-medium"><span>Impuestos ({doc.taxRate}%)</span><span>{formatCurrency(tax)}</span></div>
            <div className="flex justify-between text-2xl font-black text-blue-400 pt-6 border-t border-white/10"><span>TOTAL</span><span>{formatCurrency(total)}</span></div>
          </div>
          <button type="submit" className="w-full mt-8 py-5 bg-blue-600 hover:bg-blue-500 text-white rounded-[24px] font-black transition-all shadow-lg shadow-blue-900/40 active:scale-95">
            Guardar {type === DocumentType.INVOICE ? 'Factura' : 'Presupuesto'}
          </button>
        </div>
      </div>

      {/* MODAL: Selector de Catálogo de Productos */}
      {isProductSelectorOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-[110] flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white rounded-t-[40px] sm:rounded-[40px] shadow-2xl w-full max-w-lg overflow-hidden animate-slideUp">
            <div className="bg-indigo-600 p-8 text-white">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-black">Mi Catálogo</h3>
                <button onClick={() => setIsProductSelectorOpen(false)} className="text-white/60 hover:text-white text-3xl">✕</button>
              </div>
              <div className="relative">
                <input 
                  type="text" 
                  value={productSearchTerm}
                  onChange={(e) => setProductSearchTerm(e.target.value)}
                  placeholder="Buscar por nombre..."
                  className="w-full p-4 bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl outline-none text-white placeholder-white/50 font-bold"
                  autoFocus
                />
                <span className="absolute right-4 top-4">🔍</span>
              </div>
            </div>
            
            <div className="p-4 max-h-[60vh] overflow-y-auto">
              <div className="grid grid-cols-1 gap-3">
                {filteredProducts.map(p => (
                  <button 
                    key={p.id}
                    type="button"
                    onClick={() => handleSelectProductFromCatalog(p)}
                    className="flex justify-between items-center p-5 bg-gray-50 hover:bg-indigo-50 border border-gray-100 hover:border-indigo-100 rounded-3xl transition-all group text-left"
                  >
                    <div className="flex-1 mr-4">
                      <p className="font-black text-gray-900 group-hover:text-indigo-700 transition-colors">{p.description}</p>
                      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">Precio sugerido</p>
                    </div>
                    <div className="text-right">
                      <p className="font-black text-indigo-600">{formatCurrency(p.unitPrice)}</p>
                      <span className="text-[10px] font-black text-indigo-400 group-hover:bg-indigo-600 group-hover:text-white px-2 py-1 rounded-lg transition-all uppercase">Seleccionar</span>
                    </div>
                  </button>
                ))}
                
                {filteredProducts.length === 0 && (
                  <div className="py-20 text-center">
                    <p className="text-gray-400 font-bold">No se encontraron productos en el catálogo</p>
                  </div>
                )}
              </div>
            </div>
            <div className="p-8 bg-gray-50 text-center">
              <p className="text-xs text-gray-400 font-medium">Los productos se guardan automáticamente cuando creas una factura con un concepto nuevo.</p>
            </div>
          </div>
        </div>
      )}
    </form>
  );
};

export default DocumentEditor;
