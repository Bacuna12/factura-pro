
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
import { generateProfessionalDescription, suggestInvoiceNotes, generateDraftItems } from '../services/geminiService';

interface DocumentEditorProps {
  type: DocumentType;
  clients: Client[];
  products: Product[];
  onSave: (doc: Document) => void;
  onUpdateClients: (clients: Client[]) => void;
  onUpdateProducts: (products: Product[]) => void;
  settings: AppSettings;
  initialData?: Document;
}

const DocumentEditor: React.FC<DocumentEditorProps> = ({ 
  type, clients, products, onSave, onUpdateClients, onUpdateProducts, settings, initialData 
}) => {
  const navigate = useNavigate();
  const isCollection = type === DocumentType.ACCOUNT_COLLECTION;
  
  const [doc, setDoc] = useState<Document>(initialData || {
    id: Math.random().toString(36).substr(2, 9),
    type,
    number: `${type === DocumentType.INVOICE ? 'FAC' : isCollection ? 'CC' : 'PRE'}-${Math.floor(Math.random() * 10000)}`,
    date: new Date().toISOString().split('T')[0],
    dueDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    clientId: clients[0]?.id || '',
    items: [{ id: '1', description: '', quantity: 1, unitPrice: 0 }],
    status: DocumentStatus.DRAFT,
    notes: isCollection ? `Certifico que NO soy responsable de IVA. Favor consignar a la cuenta [Tipo] número [Número] del banco [Nombre].` : '',
    taxRate: isCollection ? 0 : settings.defaultTaxRate,
    withholdingRate: 0,
    logo: settings.logo
  });

  const [aiLoading, setAiLoading] = useState<string | null>(null);
  const [isQuickClientOpen, setIsQuickClientOpen] = useState(false);
  const [isQuickProductOpen, setIsQuickProductOpen] = useState(false);
  const [quickClient, setQuickClient] = useState<Client>({
    id: '', name: '', email: '', taxId: '', address: '', city: '', municipality: '', zipCode: ''
  });
  const [quickProduct, setQuickProduct] = useState<Product>({
    id: '', description: '', unitPrice: 0, category: 'General', sku: ''
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
          const matchedProduct = products.find(p => p.description.toLowerCase() === value.toLowerCase());
          if (matchedProduct) updatedItem.unitPrice = matchedProduct.unitPrice;
        }
        return updatedItem;
      }
      return item;
    });
    setDoc({ ...doc, items: newItems });
  };

  const handleQuickClientSave = (e: React.FormEvent) => {
    e.preventDefault();
    const newId = Math.random().toString(36).substr(2, 9);
    const newClient = { ...quickClient, id: newId };
    onUpdateClients([newClient, ...clients]);
    setDoc({ ...doc, clientId: newId });
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
          return { ...item, description: newProduct.description, unitPrice: newProduct.unitPrice };
        }
        return item;
      });
      setDoc({ ...doc, items: newItems });
    }
    setIsQuickProductOpen(false);
    setIsProductSelectorOpen(false);
    setQuickProduct({ id: '', description: '', unitPrice: 0, category: 'General', sku: '' });
  };

  const handleSelectProductFromCatalog = (product: Product) => {
    if (!activeItemSelectorId) return;
    const newItems = doc.items.map(item => {
      if (item.id === activeItemSelectorId) {
        return { ...item, description: product.description, unitPrice: product.unitPrice };
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
    setAiLoading('notes');
    const notes = await suggestInvoiceNotes(doc.type, netTotal, settings.currency);
    setDoc({ ...doc, notes: isCollection ? `${doc.notes}\n\n${notes}` : notes });
    setAiLoading(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(doc);
    // Redirección explícita basada en el tipo del documento actual
    if (type === DocumentType.INVOICE) navigate('/invoices');
    else if (type === DocumentType.ACCOUNT_COLLECTION) navigate('/collections');
    else navigate('/quotes');
  };

  return (
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
                <label className="block text-xs font-black text-gray-500 uppercase mb-2">Fecha de Vencimiento</label>
                <input type="date" value={doc.dueDate} onChange={(e) => setDoc({ ...doc, dueDate: e.target.value })} className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl font-bold outline-none" required />
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
                      <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Descripción</label>
                      <button type="button" onClick={() => openCatalogFor(item.id)} className={`text-[9px] font-bold underline ${isCollection ? 'text-violet-600' : 'text-indigo-600'}`}>Catálogo / Nuevo</button>
                    </div>
                    <input 
                      type="text"
                      value={item.description}
                      onChange={(e) => updateItem(item.id, 'description', e.target.value)}
                      className="w-full p-3 bg-white border border-gray-100 rounded-xl font-bold text-sm outline-none"
                      placeholder="Nombre del servicio..."
                    />
                  </div>
                  <div className="w-full md:w-24">
                    <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Cant.</label>
                    <input type="number" value={item.quantity} onChange={(e) => updateItem(item.id, 'quantity', parseFloat(e.target.value))} className="w-full p-3 bg-white border border-gray-100 rounded-xl font-bold text-sm outline-none text-center" />
                  </div>
                  <div className="w-full md:w-32">
                    <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">P. Unitario</label>
                    <input type="number" value={item.unitPrice} onChange={(e) => updateItem(item.id, 'unitPrice', parseFloat(e.target.value))} className="w-full p-3 bg-white border border-gray-100 rounded-xl font-bold text-sm outline-none text-right" />
                  </div>
                  <button type="button" onClick={() => handleRemoveItem(item.id)} className="p-3 text-rose-500 hover:bg-rose-50 rounded-xl transition-colors">🗑️</button>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white p-8 rounded-[32px] shadow-sm border border-gray-100 space-y-4">
             <div className="flex justify-between items-center">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Observaciones y Notas Legales</p>
              <button type="button" onClick={handleSuggestNotes} className={`text-[10px] font-black ${isCollection ? 'text-violet-600' : 'text-blue-600'}`}>🪄 Asistente IA</button>
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
                <div className="flex items-center gap-2">
                  <label className="text-[9px] font-black uppercase text-white/40">Ajustar % Retención:</label>
                  <input type="number" value={doc.withholdingRate} onChange={e => setDoc({...doc, withholdingRate: parseFloat(e.target.value)})} className="bg-white/10 border-none rounded-lg w-12 text-[10px] p-1 text-center font-bold" />
                </div>
              </div>

              <div className="pt-6 border-t border-white/10 space-y-1">
                <div className="flex justify-between items-baseline">
                  <span className="text-[10px] font-black uppercase tracking-widest text-white/50">Total Neto a Cobrar</span>
                  <span className="text-3xl font-black">{formatCurrency(netTotal)}</span>
                </div>
              </div>
            </div>

            <button type="submit" className="w-full mt-10 py-5 bg-white text-gray-900 rounded-[24px] font-black shadow-lg hover:bg-gray-50 transition-all active:scale-95 uppercase tracking-widest text-xs">
              Guardar {type}
            </button>
          </div>
        </div>
      </div>

      {isProductSelectorOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-[150] flex items-center justify-center p-4">
          <div className="bg-white rounded-[32px] w-full max-w-md overflow-hidden animate-slideUp">
            <div className={`p-6 border-b border-gray-50 flex justify-between items-center text-white ${isCollection ? 'bg-violet-600' : 'bg-indigo-600'}`}>
              <h3 className="font-black text-xl">Mi Catálogo</h3>
              <button onClick={() => setIsProductSelectorOpen(false)} className="text-2xl">✕</button>
            </div>
            <div className="p-4 bg-gray-50 border-b border-gray-100">
               <button 
                type="button" 
                onClick={() => { setIsQuickProductOpen(true); }}
                className={`w-full p-4 bg-white border border-dashed text-sm font-black rounded-2xl hover:bg-gray-50 transition-all mb-4 ${
                  isCollection ? 'border-violet-200 text-violet-600' : 'border-indigo-200 text-indigo-600'
                }`}
              >
                ✨ Crear Nuevo Producto Rápido
              </button>
              <input 
                type="text" 
                placeholder="Buscar en catálogo..."
                value={productSearchTerm}
                onChange={(e) => setProductSearchTerm(e.target.value)}
                className="w-full p-4 rounded-2xl border border-gray-100 outline-none font-bold text-sm"
              />
            </div>
            <div className="p-4 max-h-80 overflow-y-auto space-y-2">
              {products.filter(p => p.description.toLowerCase().includes(productSearchTerm.toLowerCase())).map(p => (
                <button 
                  key={p.id} 
                  type="button" 
                  onClick={() => handleSelectProductFromCatalog(p)}
                  className={`w-full p-4 text-left rounded-2xl border border-gray-100 transition-colors flex justify-between items-center group ${
                    isCollection ? 'hover:bg-violet-50' : 'hover:bg-indigo-50'
                  }`}
                >
                  <span className={`font-bold transition-colors ${isCollection ? 'group-hover:text-violet-700' : 'group-hover:text-indigo-700'}`}>{p.description}</span>
                  <span className={`font-black ${isCollection ? 'text-violet-600' : 'text-blue-600'}`}>{formatCurrency(p.unitPrice)}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {isQuickClientOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-[200] flex items-center justify-center p-4">
          <div className="bg-white rounded-[40px] w-full max-w-lg overflow-hidden shadow-2xl animate-fadeIn">
            <div className={`p-8 text-white flex justify-between items-center ${isCollection ? 'bg-violet-600' : 'bg-blue-600'}`}>
              <div>
                <h3 className="text-2xl font-black">Nuevo Cliente</h3>
                <p className="text-white/80 text-sm">Registro express</p>
              </div>
              <button onClick={() => setIsQuickClientOpen(false)} className="text-2xl">✕</button>
            </div>
            <form onSubmit={handleQuickClientSave} className="p-8 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="text-[10px] font-black uppercase text-gray-400">Nombre / Empresa</label>
                  <input required value={quickClient.name} onChange={e => setQuickClient({...quickClient, name: e.target.value})} className="w-full p-4 bg-gray-50 rounded-2xl border-none outline-none font-bold" />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase text-gray-400">Identificación (NIT/CC)</label>
                  <input required value={quickClient.taxId} onChange={e => setQuickClient({...quickClient, taxId: e.target.value})} className="w-full p-4 bg-gray-50 rounded-2xl border-none outline-none font-bold" />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase text-gray-400">Email</label>
                  <input type="email" required value={quickClient.email} onChange={e => setQuickClient({...quickClient, email: e.target.value})} className="w-full p-4 bg-gray-50 rounded-2xl border-none outline-none font-bold" />
                </div>
              </div>
              <button type="submit" className={`w-full py-5 text-white rounded-[24px] font-black shadow-xl mt-4 ${isCollection ? 'bg-violet-600 shadow-violet-100' : 'bg-blue-600 shadow-blue-100'}`}>Guardar y Seleccionar</button>
            </form>
          </div>
        </div>
      )}

      {isQuickProductOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[250] flex items-center justify-center p-4">
          <div className="bg-white rounded-[40px] w-full max-w-md overflow-hidden shadow-2xl">
            <div className={`p-8 text-white flex justify-between items-center ${isCollection ? 'bg-violet-600' : 'bg-indigo-600'}`}>
              <h3 className="text-2xl font-black">Nuevo Producto</h3>
              <button onClick={() => setIsQuickProductOpen(false)} className="text-2xl">✕</button>
            </div>
            <form onSubmit={handleQuickProductSave} className="p-8 space-y-4">
              <div>
                <label className="text-[10px] font-black uppercase text-gray-400">Nombre del Producto/Servicio</label>
                <input required value={quickProduct.description} onChange={e => setQuickProduct({...quickProduct, description: e.target.value})} className="w-full p-4 bg-gray-50 rounded-2xl border-none outline-none font-bold" />
              </div>
              <div>
                <label className="text-[10px] font-black uppercase text-gray-400">Precio Unitario</label>
                <input type="number" required value={quickProduct.unitPrice} onChange={e => setQuickProduct({...quickProduct, unitPrice: parseFloat(e.target.value)})} className={`w-full p-4 bg-gray-50 rounded-2xl border-none outline-none font-black text-xl ${isCollection ? 'text-violet-600' : 'text-indigo-600'}`} />
              </div>
              <button type="submit" className={`w-full py-5 text-white rounded-[24px] font-black shadow-xl mt-4 ${isCollection ? 'bg-violet-600 shadow-violet-100' : 'bg-indigo-600 shadow-indigo-100'}`}>Crear y Añadir</button>
            </form>
          </div>
        </div>
      )}
    </form>
  );
};

export default DocumentEditor;
